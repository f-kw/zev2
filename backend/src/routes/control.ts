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
type ReviewChangeScope = 'edit_plan' | 'theme_reselect';

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

function selectAgentRequests(stateAgentRequests: AgentRequest[], ids: Set<string>): AgentRequest[] {
  return stateAgentRequests.filter((request) => ids.has(request.id));
}

function workflowStepIndex(type: AgentRequest['type']): number {
  const index = WORKFLOW_STEPS.findIndex((step) => step.type === type);
  if (index < 0) {
    throw new Error(`未知の工程です: ${type}`);
  }

  return index;
}

function latestSucceededAgentRequest(
  stateAgentRequests: AgentRequest[],
  requestDraftId: string,
  type: AgentRequest['type']
): AgentRequest | undefined {
  return [...stateAgentRequests]
    .reverse()
    .find((request) => request.requestDraftId === requestDraftId && request.type === type && request.status === 'succeeded');
}

function latestControlReview(
  stateControlReviews: ControlReviewItem[],
  requestDraftId: string,
  kind: ControlReviewKind
): ControlReviewItem | undefined {
  return stateControlReviews
    .filter((item) => item.requestDraftId === requestDraftId && item.kind === kind)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

function fileRefForAgentRequest(state: Awaited<ReturnType<typeof loadState>>, request: AgentRequest): FileRef | undefined {
  if (!request.result?.fileRefId) {
    return undefined;
  }

  return state.fileRefs.find((fileRef) => fileRef.id === request.result?.fileRefId);
}

function outputForAgentRequest(state: Awaited<ReturnType<typeof loadState>>, request: AgentRequest): OutputEntity | undefined {
  if (!request.result?.outputId) {
    return undefined;
  }

  return state.outputs.find((output) => output.id === request.result?.outputId);
}

function createAgentRequestAfter(
  sourceRequest: AgentRequest,
  type: AgentRequest['type'],
  dependsOnAgentRequestId: string | undefined,
  createdAt: string
): AgentRequest {
  const step = WORKFLOW_STEPS.find((item) => item.type === type);
  if (!step) {
    throw new Error(`未知の工程です: ${type}`);
  }

  return {
    id: createId('agent'),
    requestDraftId: sourceRequest.requestDraftId,
    type: step.type,
    label: step.label,
    target: { ...sourceRequest.target },
    input: {
      purpose: sourceRequest.input.purpose,
      settings: { ...sourceRequest.input.settings }
    },
    constraints: { ...sourceRequest.constraints },
    policy: { ...sourceRequest.policy },
    ...(dependsOnAgentRequestId ? { dependsOnAgentRequestId } : {}),
    status: 'queued',
    fileRefIds: [],
    createdAt,
    updatedAt: createdAt
  };
}

function createRetryRequestsFromFailedRequest(
  stateAgentRequests: AgentRequest[],
  failedRequestId: string,
  createdAt: string
): { requests: AgentRequest[]; requestDraftId: string; startType: AgentRequest['type'] } | { error: string } {
  const failedRequest = stateAgentRequests.find((request) => request.id === failedRequestId);
  if (!failedRequest) {
    return { error: '再実行するAI工程が見つかりません' };
  }

  if (failedRequest.status !== 'failed') {
    return { error: '失敗したAI工程だけ再実行できます' };
  }

  const dependencyRequest = failedRequest.dependsOnAgentRequestId
    ? stateAgentRequests.find((request) => request.id === failedRequest.dependsOnAgentRequestId)
    : undefined;
  if (failedRequest.dependsOnAgentRequestId && dependencyRequest?.status !== 'succeeded') {
    return { error: '再実行に必要な前工程が完了していません' };
  }

  const startIndex = workflowStepIndex(failedRequest.type);
  const renderIndex = workflowStepIndex('render_video');
  const endIndex = failedRequest.type === 'render_video' ? renderIndex + 1 : renderIndex;
  let dependsOnAgentRequestId = failedRequest.dependsOnAgentRequestId;
  const requests: AgentRequest[] = [];

  for (const step of WORKFLOW_STEPS.slice(startIndex, endIndex)) {
    const request = createAgentRequestAfter(failedRequest, step.type, dependsOnAgentRequestId, createdAt);
    requests.push(request);
    dependsOnAgentRequestId = request.id;
  }

  return {
    requests,
    requestDraftId: failedRequest.requestDraftId,
    startType: failedRequest.type
  };
}

function markReplaceableRequestsAsReplaced(
  stateAgentRequests: AgentRequest[],
  requestDraftId: string,
  startType: AgentRequest['type'],
  updatedAt: string
) {
  const startIndex = workflowStepIndex(startType);
  const renderIndex = workflowStepIndex('render_video');

  for (const request of stateAgentRequests) {
    const requestIndex = workflowStepIndex(request.type);
    const shouldReplace =
      request.requestDraftId === requestDraftId &&
      requestIndex >= startIndex &&
      requestIndex <= renderIndex &&
      ['queued', 'waiting', 'running', 'failed'].includes(request.status);

    if (!shouldReplace) {
      continue;
    }

    request.status = 'superseded';
    request.errorMessage = '人間の修正依頼により、AIが作り直す対象になりました';
    request.updatedAt = updatedAt;
  }
}

function createRerunRequestsForReview(
  stateAgentRequests: AgentRequest[],
  reviewItem: ControlReviewItem,
  createdAt: string
): { requests: AgentRequest[] } | { error: string } {
  const sourceRequest = stateAgentRequests.find((request) => request.id === reviewItem.agentRequestId);
  if (!sourceRequest) {
    return { error: '作り直し対象のAI工程が見つかりません' };
  }

  const startType: AgentRequest['type'] =
    reviewItem.kind === 'theme_selection' ? 'propose_clip_themes' : 'build_clip_composition';
  const dependencyType: AgentRequest['type'] =
    reviewItem.kind === 'theme_selection' ? 'run_stt' : 'propose_clip_themes';
  const dependencyRequest = latestSucceededAgentRequest(
    stateAgentRequests,
    reviewItem.requestDraftId,
    dependencyType
  );

  if (!dependencyRequest) {
    return { error: '作り直しに必要な前工程が完了していません' };
  }

  const startIndex = workflowStepIndex(startType);
  const renderIndex = workflowStepIndex('render_video');
  let dependsOnAgentRequestId = dependencyRequest.id;
  const requests: AgentRequest[] = [];

  for (const step of WORKFLOW_STEPS.slice(startIndex, renderIndex)) {
    const request = createAgentRequestAfter(sourceRequest, step.type, dependsOnAgentRequestId, createdAt);
    requests.push(request);
    dependsOnAgentRequestId = request.id;
  }

  return { requests };
}

function createThemeReselectFromReview(
  state: Awaited<ReturnType<typeof loadState>>,
  reviewItem: ControlReviewItem,
  createdAt: string
): {
  decisionLog: DecisionLog;
  reviewItem: ControlReviewItem;
  requests: AgentRequest[];
} | { error: string } {
  if (reviewItem.kind !== 'render_readiness') {
    return { error: 'テーマを選び直せるのは動画生成前確認からだけです' };
  }

  const sourceRequest = state.agentRequests.find((request) => request.id === reviewItem.agentRequestId);
  if (!sourceRequest) {
    return { error: 'テーマを選び直す前提になるAI工程が見つかりません' };
  }

  const themeRequest = latestSucceededAgentRequest(state.agentRequests, reviewItem.requestDraftId, 'propose_clip_themes');
  if (!themeRequest) {
    return { error: 'テーマを選び直すためのテーマ候補がありません' };
  }

  const previousThemeReview = latestControlReview(state.controlReviewItems, reviewItem.requestDraftId, 'theme_selection');
  if (!previousThemeReview?.options.length) {
    return { error: 'テーマを選び直すための選択肢がありません' };
  }

  const fileRef = fileRefForAgentRequest(state, themeRequest);
  const output = outputForAgentRequest(state, themeRequest);
  const createdReview = createControlReview(
    themeRequest,
    'theme_selection',
    {
      decisionType: 'theme_selection',
      decision: '既存のテーマ候補から選び直す',
      reason: '動画生成前確認でテーマから見直す判断になったため、既存のテーマ候補をもう一度人間が選べるようにする',
      evidenceRefs: [],
      reviewOptions: previousThemeReview.options,
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'どのテーマで切り抜きを作り直すか選んでください',
      ruleIds: ['control-plane:theme-selection-required', 'zev-reference:theme-reselect']
    },
    fileRef,
    output
  );

  const startIndex = workflowStepIndex('build_clip_composition');
  const renderIndex = workflowStepIndex('render_video');
  let dependsOnAgentRequestId = themeRequest.id;
  const requests: AgentRequest[] = [];
  for (const step of WORKFLOW_STEPS.slice(startIndex, renderIndex)) {
    const request = createAgentRequestAfter(sourceRequest, step.type, dependsOnAgentRequestId, createdAt);
    requests.push(request);
    dependsOnAgentRequestId = request.id;
  }

  return { ...createdReview, requests };
}

function createThemeReselectFromGeneratedVideo(
  state: Awaited<ReturnType<typeof loadState>>,
  requestDraftId: string,
  createdAt: string
): {
  decisionLog: DecisionLog;
  reviewItem: ControlReviewItem;
  requests: AgentRequest[];
} | { error: string } {
  const sourceRequest = latestSucceededAgentRequest(state.agentRequests, requestDraftId, 'render_video');
  if (!sourceRequest) {
    return { error: '生成済み動画がないため、テーマ選択へ戻れません' };
  }

  const themeRequest = latestSucceededAgentRequest(state.agentRequests, requestDraftId, 'propose_clip_themes');
  if (!themeRequest) {
    return { error: 'テーマを選び直すためのテーマ候補がありません' };
  }

  const previousThemeReview = latestControlReview(state.controlReviewItems, requestDraftId, 'theme_selection');
  if (!previousThemeReview?.options.length) {
    return { error: 'テーマを選び直すための選択肢がありません' };
  }

  const fileRef = fileRefForAgentRequest(state, themeRequest);
  const output = outputForAgentRequest(state, themeRequest);
  const createdReview = createControlReview(
    themeRequest,
    'theme_selection',
    {
      decisionType: 'theme_selection',
      decision: '生成済み動画から既存テーマ候補の選択へ戻す',
      reason: '生成後レビューでテーマから見直す判断になったため、既存のテーマ候補をもう一度人間が選べるようにする',
      evidenceRefs: [],
      reviewOptions: previousThemeReview.options,
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'どのテーマで切り抜きを作り直すか選んでください',
      ruleIds: ['control-plane:theme-selection-required', 'zev-reference:generated-video-theme-reselect']
    },
    fileRef,
    output
  );

  const startIndex = workflowStepIndex('build_clip_composition');
  const renderIndex = workflowStepIndex('render_video');
  let dependsOnAgentRequestId = themeRequest.id;
  const requests: AgentRequest[] = [];
  for (const step of WORKFLOW_STEPS.slice(startIndex, renderIndex)) {
    const request = createAgentRequestAfter(sourceRequest, step.type, dependsOnAgentRequestId, createdAt);
    requests.push(request);
    dependsOnAgentRequestId = request.id;
  }

  return { ...createdReview, requests };
}

function createRenderRequestForReview(
  stateAgentRequests: AgentRequest[],
  reviewItem: ControlReviewItem,
  createdAt: string
): { request: AgentRequest } | { error: string } {
  const sourceRequest = stateAgentRequests.find((request) => request.id === reviewItem.agentRequestId);
  if (!sourceRequest) {
    return { error: '動画生成の前提になるAI工程が見つかりません' };
  }

  if (sourceRequest.type !== 'apply_adjustment') {
    return { error: '動画生成は生成前確認の承認後だけ作成できます' };
  }

  return {
    request: createAgentRequestAfter(sourceRequest, 'render_video', sourceRequest.id, createdAt)
  };
}

function createEditRerunRequestsFromGeneratedVideo(
  stateAgentRequests: AgentRequest[],
  requestDraftId: string,
  reason: string,
  createdAt: string
): { requests: AgentRequest[] } | { error: string } {
  const latestRenderRequest = latestSucceededAgentRequest(stateAgentRequests, requestDraftId, 'render_video');
  if (!latestRenderRequest) {
    return { error: '生成済み動画がないため、生成後の修正依頼を開始できません' };
  }

  const dependencyRequest = latestSucceededAgentRequest(stateAgentRequests, requestDraftId, 'propose_clip_themes');
  if (!dependencyRequest) {
    return { error: '編集案を作り直すためのテーマ選択がありません' };
  }

  const sourceRequest: AgentRequest = {
    ...latestRenderRequest,
    input: {
      ...latestRenderRequest.input,
      purpose: [
        latestRenderRequest.input.purpose,
        `生成後の修正依頼: ${reason}`
      ].join('\n')
    }
  };
  const startIndex = workflowStepIndex('build_clip_composition');
  const renderIndex = workflowStepIndex('render_video');
  let dependsOnAgentRequestId = dependencyRequest.id;
  const requests: AgentRequest[] = [];

  for (const step of WORKFLOW_STEPS.slice(startIndex, renderIndex)) {
    const request = createAgentRequestAfter(sourceRequest, step.type, dependsOnAgentRequestId, createdAt);
    requests.push(request);
    dependsOnAgentRequestId = request.id;
  }

  return { requests };
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
  if (kind === 'theme_selection') {
    return 'テーマ選択';
  }

  return '動画生成前の確認';
}

function reviewSummary(kind: ControlReviewKind, agentRequest: AgentRequest): string {
  if (kind === 'theme_selection') {
    return `${agentRequest.label} の結果を確認して、切り抜きたいテーマを選びます`;
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
    options: decisionInput.reviewOptions ?? [],
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
  reasonInput: unknown,
  selectedOptionInput?: unknown,
  changeScopeInput?: unknown
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

  const selectedOptionId = hasText(selectedOptionInput) ? selectedOptionInput.trim() : '';
  if (action === 'approve' && reviewItem.kind === 'theme_selection') {
    if (!selectedOptionId) {
      return { status: 'error', statusCode: 400, error: '切り抜きたいテーマを選んでください', state };
    }

    if (!reviewItem.options.some((option) => option.id === selectedOptionId)) {
      return { status: 'error', statusCode: 400, error: '選んだテーマが確認対象にありません', state };
    }
  }

  const createdAt = nowIso();
  let newAgentRequests: AgentRequest[] = [];
  let replaceStartType: AgentRequest['type'] | undefined;
  let extraDecisionLog: DecisionLog | undefined;
  let extraReviewItem: ControlReviewItem | undefined;

  if (action === 'approve' && reviewItem.kind === 'render_readiness') {
    const result = createRenderRequestForReview(state.agentRequests, reviewItem, createdAt);
    if ('error' in result) {
      return { status: 'error', statusCode: 409, error: result.error, state };
    }

    newAgentRequests = [result.request];
  }

  if (action === 'request_changes') {
    const changeScope: ReviewChangeScope =
      changeScopeInput === 'theme_reselect' ? 'theme_reselect' : 'edit_plan';

    if (reviewItem.kind === 'render_readiness' && changeScope === 'theme_reselect') {
      const result = createThemeReselectFromReview(state, reviewItem, createdAt);
      if ('error' in result) {
        return { status: 'error', statusCode: 409, error: result.error, state };
      }

      replaceStartType = 'build_clip_composition';
      newAgentRequests = result.requests;
      extraDecisionLog = result.decisionLog;
      extraReviewItem = result.reviewItem;
    } else {
      const result = createRerunRequestsForReview(state.agentRequests, reviewItem, createdAt);
      if ('error' in result) {
        return { status: 'error', statusCode: 409, error: result.error, state };
      }

      const firstRequest = result.requests[0];
      if (!firstRequest) {
        return { status: 'error', statusCode: 409, error: '作り直し対象のAI工程を作成できません', state };
      }

      replaceStartType = firstRequest.type;
      newAgentRequests = result.requests;
    }
  }

  const humanReviewAction: HumanReviewAction = {
    id: createId('human_review'),
    reviewItemId: reviewItem.id,
    requestDraftId: reviewItem.requestDraftId,
    action,
    reason: reason || `${reviewActionLabel(action)}として記録`,
    ...(selectedOptionId ? { selectedOptionId } : {}),
    createdAt
  };

  reviewItem.status =
    action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested';
  reviewItem.resolvedAt = createdAt;
  reviewItem.resolvedByActionId = humanReviewAction.id;
  reviewItem.updatedAt = createdAt;
  state.humanReviewActions.push(humanReviewAction);

  if (replaceStartType) {
    markReplaceableRequestsAsReplaced(state.agentRequests, reviewItem.requestDraftId, replaceStartType, createdAt);
  }

  if (extraDecisionLog && extraReviewItem) {
    state.decisionLogs.push(extraDecisionLog);
    state.controlReviewItems.push(extraReviewItem);
  }

  state.agentRequests.push(...newAgentRequests);
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

  const reviewKind = getRequiredControlReviewKind(agentRequest);
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
  const result = await applyHumanReviewAction(
    request.params.id,
    'approve',
    request.body?.reason,
    request.body?.selectedOptionId
  );
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
  const result = await applyHumanReviewAction(
    request.params.id,
    'request_changes',
    request.body?.reason,
    undefined,
    request.body?.scope
  );
  if (result.status === 'error') {
    response.status(result.statusCode).json({ error: result.error, state: result.state });
    return;
  }

  startDryRunRunner();
  response.json(result);
});

router.post('/request-drafts/:id/request-generated-video-changes', async (request, response) => {
  const reason = hasText(request.body?.reason) ? request.body.reason.trim() : '';
  if (!reason) {
    response.status(400).json({ error: '生成済み動画から直したい点を入力してください' });
    return;
  }
  const scope = request.body?.scope === 'theme_selection' ? 'theme_selection' : 'edit_plan';

  const state = await loadState();
  const draft = state.requestDrafts.find((item) => item.id === request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }

  const createdAt = nowIso();
  if (scope === 'theme_selection') {
    const result = createThemeReselectFromGeneratedVideo(state, draft.id, createdAt);
    if ('error' in result) {
      response.status(409).json({ error: result.error, state });
      return;
    }

    markReplaceableRequestsAsReplaced(
      state.agentRequests,
      draft.id,
      'build_clip_composition',
      createdAt
    );
    state.decisionLogs.push(result.decisionLog);
    state.controlReviewItems.push(result.reviewItem);
    state.agentRequests.push(...result.requests);
    await saveState(state);

    startDryRunRunner();
    response.json({
      agentRequests: selectAgentRequests(state.agentRequests, new Set(result.requests.map((item) => item.id))),
      state
    });
    return;
  }

  const result = createEditRerunRequestsFromGeneratedVideo(
    state.agentRequests,
    draft.id,
    reason,
    createdAt
  );
  if ('error' in result) {
    response.status(409).json({ error: result.error, state });
    return;
  }

  markReplaceableRequestsAsReplaced(
    state.agentRequests,
    draft.id,
    'build_clip_composition',
    createdAt
  );
  state.agentRequests.push(...result.requests);
  await saveState(state);

  startDryRunRunner();
  response.json({
    agentRequests: selectAgentRequests(state.agentRequests, new Set(result.requests.map((item) => item.id))),
    state
  });
});

router.post('/agent-requests/:id/retry', async (request, response) => {
  const state = await loadState();
  const createdAt = nowIso();
  const result = createRetryRequestsFromFailedRequest(state.agentRequests, request.params.id, createdAt);
  if ('error' in result) {
    response.status(409).json({ error: result.error, state });
    return;
  }

  markReplaceableRequestsAsReplaced(
    state.agentRequests,
    result.requestDraftId,
    result.startType,
    createdAt
  );
  state.agentRequests.push(...result.requests);
  await saveState(state);

  startDryRunRunner();
  response.json({
    agentRequests: selectAgentRequests(state.agentRequests, new Set(result.requests.map((item) => item.id))),
    state
  });
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
