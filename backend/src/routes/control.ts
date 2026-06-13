import express from 'express';
import { nanoid } from 'nanoid';
import {
  WORKFLOW_STEPS,
  type AgentCompletionInput,
  type AgentDecisionInput,
  type AgentFailureInput,
  type AgentRequest,
  type ControlReference,
  type ControlReviewItem,
  type ControlReviewKind,
  type DecisionLog,
  type FileRef,
  type HumanReviewAction,
  type HumanReviewActionType,
  type OutputEntity,
  createAgentRequestsFromDraft,
  createRequestDraft,
  findAgentRequestDependency,
  findReadyAgentRequest,
  getFileRefKindForRequest,
  getOutputTypeForRequest,
  getRequiredControlReviewKind,
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

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateAgentDecision(input: AgentDecisionInput | undefined): string[] {
  if (!input) {
    return ['重要判断には判断ログが必要です'];
  }

  const errors: string[] = [];
  if (!hasText(input.decision)) {
    errors.push('判断内容が必要です');
  }

  if (!hasText(input.reason)) {
    errors.push('判断理由が必要です');
  }

  if (!hasText(input.proposedNextState)) {
    errors.push('次に進めたい状態が必要です');
  }

  if (input.requiresHumanReview !== true) {
    errors.push('重要判断では人間確認要求が必要です');
  }

  if (!hasText(input.humanQuestion)) {
    errors.push('人間に求める判断内容が必要です');
  }

  return errors;
}

function reviewTitle(kind: ControlReviewKind): string {
  if (kind === 'candidate_generation') {
    return '候補生成後の確認';
  }

  return '動画生成前の確認';
}

function reviewSummary(kind: ControlReviewKind, agentRequest: AgentRequest): string {
  if (kind === 'candidate_generation') {
    return `${agentRequest.label} の結果を確認して、映像確認へ進めるか判断します`;
  }

  return `${agentRequest.label} の結果を確認して、動画生成へ進めるか判断します`;
}

function createArtifactReferences(fileRef: FileRef | undefined, output: OutputEntity | undefined): ControlReference[] {
  const references: ControlReference[] = [];
  if (fileRef) {
    references.push({
      refId: fileRef.id,
      kind: 'file_ref',
      meaning: 'AIエージェントが返した成果物参照'
    });
  }

  if (output) {
    references.push({
      refId: output.id,
      kind: 'output',
      meaning: '工程完了で保存された成果物'
    });
  }

  return references;
}

function createControlReview(
  agentRequest: AgentRequest,
  kind: ControlReviewKind,
  decisionInput: AgentDecisionInput,
  fileRef: FileRef | undefined,
  output: OutputEntity | undefined
): {
  decisionLog: DecisionLog;
  reviewItem: ControlReviewItem;
} {
  const createdAt = nowIso();
  const artifactRefs = createArtifactReferences(fileRef, output);
  const decisionLog: DecisionLog = {
    id: createId('decision'),
    requestDraftId: agentRequest.requestDraftId,
    agentRequestId: agentRequest.id,
    stepType: agentRequest.type,
    actor: 'agent',
    decisionType: decisionInput.decisionType,
    decision: decisionInput.decision.trim(),
    reason: decisionInput.reason.trim(),
    evidenceRefs: [...(decisionInput.evidenceRefs ?? []), ...artifactRefs],
    inputRefs: [
      {
        refId: agentRequest.requestDraftId,
        kind: 'request_draft',
        meaning: '人間が承認してAIエージェントへ渡した依頼'
      },
      {
        refId: agentRequest.id,
        kind: 'agent_request',
        meaning: `${agentRequest.label} のAI作業`
      }
    ],
    artifactRefs,
    proposedNextState: decisionInput.proposedNextState.trim(),
    requiresHumanReview: true,
    humanQuestion: decisionInput.humanQuestion?.trim() ?? null,
    ruleIds: decisionInput.ruleIds ?? [],
    createdAt
  };
  const reviewItem: ControlReviewItem = {
    id: createId('review'),
    requestDraftId: agentRequest.requestDraftId,
    agentRequestId: agentRequest.id,
    kind,
    status: 'review_required',
    title: reviewTitle(kind),
    summary: reviewSummary(kind, agentRequest),
    reason: decisionLog.reason,
    evidenceRefs: decisionLog.evidenceRefs,
    proposedNextState: decisionLog.proposedNextState,
    humanQuestion: decisionLog.humanQuestion ?? '次の工程へ進めてよいか確認してください',
    decisionLogId: decisionLog.id,
    createdAt,
    updatedAt: createdAt
  };

  return { decisionLog, reviewItem };
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

function reviewActionLabel(action: HumanReviewActionType): string {
  if (action === 'approve') {
    return '承認';
  }

  if (action === 'reject') {
    return '却下';
  }

  return '修正依頼';
}

async function applyHumanReviewAction(
  reviewItemId: string,
  action: HumanReviewActionType,
  reasonInput: unknown
): Promise<
  | { status: 'ok'; reviewItem: ControlReviewItem; humanReviewAction: HumanReviewAction; state: Awaited<ReturnType<typeof loadState>> }
  | { status: 'error'; statusCode: number; error: string; state?: Awaited<ReturnType<typeof loadState>> }
> {
  const state = await loadState();
  const reviewItem = state.controlReviewItems.find((item) => item.id === reviewItemId);

  if (!reviewItem) {
    return { status: 'error', statusCode: 404, error: '人間確認項目が見つかりません' };
  }

  if (reviewItem.status !== 'review_required') {
    return { status: 'error', statusCode: 409, error: 'この確認項目はすでに処理済みです', state };
  }

  const reason = hasText(reasonInput) ? reasonInput.trim() : '';
  if (action !== 'approve' && !reason) {
    return { status: 'error', statusCode: 400, error: `${reviewActionLabel(action)}には理由が必要です`, state };
  }

  const createdAt = nowIso();
  const humanReviewAction: HumanReviewAction = {
    id: createId('human_review'),
    reviewItemId: reviewItem.id,
    requestDraftId: reviewItem.requestDraftId,
    action,
    reason: reason || `${reviewActionLabel(action)}として記録`,
    createdAt
  };

  reviewItem.status =
    action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested';
  reviewItem.resolvedAt = createdAt;
  reviewItem.resolvedByActionId = humanReviewAction.id;
  reviewItem.updatedAt = createdAt;
  state.humanReviewActions.push(humanReviewAction);
  await saveState(state);

  return { status: 'ok', reviewItem, humanReviewAction, state };
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

  const reviewKind = getRequiredControlReviewKind(state, agentRequest);
  if (reviewKind) {
    const errors = validateAgentDecision(input.decision);
    if (errors.length > 0) {
      response.status(400).json({ errors });
      return;
    }
  }

  const { fileRef, output } = completeAgentRequest(agentRequest, input);
  if (fileRef) {
    state.fileRefs.push(fileRef);
  }

  if (output) {
    state.outputs.push(output);
  }

  if (reviewKind && input.decision) {
    const { decisionLog, reviewItem } = createControlReview(
      agentRequest,
      reviewKind,
      input.decision,
      fileRef,
      output
    );
    state.decisionLogs.push(decisionLog);
    state.controlReviewItems.push(reviewItem);
  }

  await saveState(state);
  response.json({ request: agentRequest, fileRef, output, state });
});

router.post('/control-reviews/:id/approve', async (request, response) => {
  const result = await applyHumanReviewAction(request.params.id, 'approve', request.body?.reason);
  if (result.status === 'error') {
    response.status(result.statusCode).json({ error: result.error, state: result.state });
    return;
  }

  startDryRunRunner();
  response.json(result);
});

router.post('/control-reviews/:id/reject', async (request, response) => {
  const result = await applyHumanReviewAction(request.params.id, 'reject', request.body?.reason);
  if (result.status === 'error') {
    response.status(result.statusCode).json({ error: result.error, state: result.state });
    return;
  }

  response.json(result);
});

router.post('/control-reviews/:id/request-changes', async (request, response) => {
  const result = await applyHumanReviewAction(request.params.id, 'request_changes', request.body?.reason);
  if (result.status === 'error') {
    response.status(result.statusCode).json({ error: result.error, state: result.state });
    return;
  }

  response.json(result);
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
