import express from 'express';
import { nanoid } from 'nanoid';
import {
  WORKFLOW_STEPS,
  type AgentCompletionInput,
  type AgentFailureInput,
  type AgentRequest,
  type FileRef,
  type OutputEntity,
  createAgentRequestsFromDraft,
  createRequestDraft,
  findAgentRequestDependency,
  findReadyAgentRequest,
  getFileRefKindForRequest,
  getOutputTypeForRequest,
  validateRequestDraftInput,
  type RequestDraftInput
} from '@zev2/shared';
import { loadState, saveState } from '../store/json-store.js';
import { startDryRunRunner } from '../runner/auto-runner.js';

const router: express.Router = express.Router();

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

function selectAgentRequests(stateAgentRequests: AgentRequest[], ids: Set<string>): AgentRequest[] {
  return stateAgentRequests.filter((request) => ids.has(request.id));
}

function completeAgentRequest(request: AgentRequest, input: AgentCompletionInput): {
  fileRef?: FileRef;
  output?: OutputEntity;
} {
  const meaning = input.meaning?.trim() || 'AIエージェントがAPI経由で完了を報告した処理';

  request.status = 'succeeded';
  delete request.errorMessage;
  request.updatedAt = nowIso();
  request.result = { meaning };

  if (!input.fileRef) {
    return {};
  }

  const outputId = createId(request.type);
  const fileRef: FileRef = {
    id: createId('fileref'),
    kind: getFileRefKindForRequest(request.type),
    uri: input.fileRef.uri,
    mimeType: input.fileRef.mimeType,
    access: input.fileRef.access ?? 'internal',
    ownerId: outputId,
    createdAt: nowIso()
  };
  const output = {
    id: outputId,
    type: getOutputTypeForRequest(request.type),
    meaning,
    fileRefId: fileRef.id
  } satisfies OutputEntity;

  request.fileRefIds = [fileRef.id];
  request.result = {
    outputId: output.id,
    outputType: output.type,
    fileRefId: fileRef.id,
    meaning
  };

  return { fileRef, output };
}

router.get('/health', (_, response) => {
  response.json({ status: 'ok', service: 'zev2-backend' });
});

router.get('/workflow', (_, response) => {
  response.json({ steps: WORKFLOW_STEPS });
});

router.get('/state', async (_, response) => {
  const state = await loadState();
  response.json(state);
});

router.post('/request-drafts', async (request, response) => {
  const input = request.body as Partial<RequestDraftInput>;
  const errors = validateRequestDraftInput(input);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  const state = await loadState();
  const draft = createRequestDraft(input as RequestDraftInput, nowIso(), createId);
  state.requestDrafts.unshift(draft);
  await saveState(state);
  response.status(201).json({ draft, state });
});

router.post('/request-drafts/:id/approve', async (request, response) => {
  const state = await loadState();
  const draft = state.requestDrafts.find((item) => item.id === request.params.id);

  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません' });
    return;
  }

  if (draft.status !== 'draft') {
    response.status(409).json({ error: 'この下書きはすでに処理済みです' });
    return;
  }

  draft.status = 'approved';
  draft.updatedAt = nowIso();

  const agentRequests = createAgentRequestsFromDraft(draft, nowIso(), createId);
  const agentRequestIds = new Set(agentRequests.map((agentRequest) => agentRequest.id));
  state.agentRequests.push(...agentRequests);
  await saveState(state);

  startDryRunRunner();
  response.json({
    draft,
    agentRequests: selectAgentRequests(state.agentRequests, agentRequestIds),
    state
  });
});

router.get('/agent-requests/next', async (_, response) => {
  const state = await loadState();
  const agentRequest = findReadyAgentRequest(state);
  response.json({ request: agentRequest ?? null });
});

router.post('/agent-requests/:id/claim', async (request, response) => {
  const state = await loadState();
  const agentRequest = state.agentRequests.find((item) => item.id === request.params.id);

  if (!agentRequest) {
    response.status(404).json({ error: 'AI操作が見つかりません' });
    return;
  }

  if (!['queued', 'waiting'].includes(agentRequest.status)) {
    response.status(409).json({ error: 'このAI操作は取得できません', state });
    return;
  }

  const dependency = findAgentRequestDependency(state, agentRequest);
  if (dependency && dependency.status !== 'succeeded') {
    agentRequest.status = 'waiting';
    agentRequest.errorMessage = '前工程の完了待ちです';
    agentRequest.updatedAt = nowIso();
    await saveState(state);
    response.status(409).json({ error: agentRequest.errorMessage, state });
    return;
  }

  agentRequest.status = 'running';
  delete agentRequest.errorMessage;
  agentRequest.updatedAt = nowIso();
  await saveState(state);
  response.json({ request: agentRequest, state });
});

router.post('/agent-requests/:id/complete', async (request, response) => {
  const state = await loadState();
  const agentRequest = state.agentRequests.find((item) => item.id === request.params.id);

  if (!agentRequest) {
    response.status(404).json({ error: 'AI操作が見つかりません' });
    return;
  }

  if (agentRequest.status !== 'running') {
    response.status(409).json({ error: '取得中のAI操作だけ完了できます', state });
    return;
  }

  const input = request.body as AgentCompletionInput;
  if (input.fileRef && (!input.fileRef.uri?.trim() || !input.fileRef.mimeType?.trim())) {
    response.status(400).json({ error: '成果物参照にはURIとMIME typeが必要です' });
    return;
  }

  const { fileRef, output } = completeAgentRequest(agentRequest, input);
  if (fileRef) {
    state.fileRefs.push(fileRef);
  }

  if (output) {
    state.outputs.push(output);
  }

  await saveState(state);
  response.json({ request: agentRequest, fileRef, output, state });
});

router.post('/agent-requests/:id/fail', async (request, response) => {
  const state = await loadState();
  const agentRequest = state.agentRequests.find((item) => item.id === request.params.id);

  if (!agentRequest) {
    response.status(404).json({ error: 'AI操作が見つかりません' });
    return;
  }

  const input = request.body as Partial<AgentFailureInput>;
  if (!input.message?.trim()) {
    response.status(400).json({ error: '失敗理由が必要です' });
    return;
  }

  agentRequest.status = 'failed';
  agentRequest.errorMessage = input.message.trim();
  agentRequest.updatedAt = nowIso();
  await saveState(state);
  response.json({ request: agentRequest, state });
});

export default router;
