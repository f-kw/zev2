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
  type RequestDraft,
  createAgentRequestsFromDraft,
  createRequestDraft,
  findById,
  findAgentRequestDependency,
  findReadyAgentRequest,
  getFileRefKindForRequest,
  getOutputTypeForRequest,
  getRequiredControlReviewKind,
  hasText,
  isStatusIn,
  lastMatching,
  latestByCreatedAt,
  validateRequestDraftInput,
  type RequestDraftInput
} from '@zev2/shared';
import { loadState, saveState } from '../store/json-store.js';
import { startDryRunRunner } from '../runner/auto-runner.js';
import { loadRuntimeConfig } from '../config/runtime-config.js';

const router: express.Router = express.Router();
type ReviewChangeScope = 'edit_plan' | 'theme_reselect' | 'adjustment';
type GeneratedVideoChangeScope = 'theme_selection' | 'edit_plan' | 'adjustment';
type LoadedState = Awaited<ReturnType<typeof loadState>>;

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

function createAgentRequestForDraftStep(
  draft: RequestDraft,
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
    requestDraftId: draft.id,
    type: step.type,
    label: step.label,
    target: {
      sourceUri: draft.source.uri
    },
    input: {
      purpose: draft.purpose,
      settings: { ...draft.settings }
    },
    constraints: { ...draft.settings },
    policy: { ...draft.policy },
    ...(dependsOnAgentRequestId ? { dependsOnAgentRequestId } : {}),
    status: 'queued',
    fileRefIds: [],
    createdAt,
    updatedAt: createdAt
  };
}

function latestSucceededAgentRequest(
  stateAgentRequests: AgentRequest[],
  requestDraftId: string,
  type: AgentRequest['type']
): AgentRequest | undefined {
  return lastMatching(
    stateAgentRequests,
    (request) => request.requestDraftId === requestDraftId && request.type === type && request.status === 'succeeded'
  );
}

function latestControlReview(
  stateControlReviews: ControlReviewItem[],
  requestDraftId: string,
  kind: ControlReviewKind
): ControlReviewItem | undefined {
  const reviews = stateControlReviews.filter((item) => item.requestDraftId === requestDraftId && item.kind === kind);
  return latestByCreatedAt(reviews);
}

function fileRefForAgentRequest(state: Awaited<ReturnType<typeof loadState>>, request: AgentRequest): FileRef | undefined {
  if (!request.result?.fileRefId) {
    return undefined;
  }

  return findById(state.fileRefs, request.result.fileRefId);
}

function outputForAgentRequest(state: Awaited<ReturnType<typeof loadState>>, request: AgentRequest): OutputEntity | undefined {
  if (!request.result?.outputId) {
    return undefined;
  }

  return findById(state.outputs, request.result.outputId);
}

function copyDraftForRestart(sourceDraft: RequestDraft, reason: string, createdAt: string): RequestDraft {
  const purpose = reason
    ? [sourceDraft.purpose, `やり直し内容: ${reason}`].join('\n')
    : sourceDraft.purpose;

  return {
    ...sourceDraft,
    id: createId('draft'),
    status: 'approved',
    purpose,
    source: { ...sourceDraft.source },
    settings: { ...sourceDraft.settings },
    policy: { ...sourceDraft.policy },
    steps: sourceDraft.steps.map((step) => ({ ...step })),
    createdAt,
    updatedAt: createdAt
  };
}

function copySucceededAgentRequestForDraft(
  state: LoadedState,
  sourceRequest: AgentRequest,
  requestDraftId: string,
  dependsOnAgentRequestId: string | undefined,
  createdAt: string
): { request: AgentRequest; fileRef?: FileRef; output?: OutputEntity } | { error: string } {
  if (sourceRequest.status !== 'succeeded') {
    return { error: `${sourceRequest.label}が完了していないため、編集コピーに引き継げません` };
  }

  const copiedRequest: AgentRequest = {
    ...sourceRequest,
    id: createId('agent'),
    requestDraftId,
    ...(dependsOnAgentRequestId ? { dependsOnAgentRequestId } : {}),
    status: 'succeeded',
    fileRefIds: [...sourceRequest.fileRefIds],
    ...(sourceRequest.result ? { result: { ...sourceRequest.result } } : {}),
    createdAt,
    updatedAt: createdAt
  };
  delete copiedRequest.errorMessage;
  if (!dependsOnAgentRequestId) {
    delete copiedRequest.dependsOnAgentRequestId;
  }

  if (!sourceRequest.result?.fileRefId && !sourceRequest.result?.outputId) {
    return { request: copiedRequest };
  }

  const sourceFileRef = fileRefForAgentRequest(state, sourceRequest);
  const sourceOutput = outputForAgentRequest(state, sourceRequest);
  if (!sourceFileRef || !sourceOutput || !sourceRequest.result) {
    return { error: `${sourceRequest.label}の成果物参照をコピーできません` };
  }

  const outputId = createId(sourceRequest.type);
  const fileRefId = createId('fileref');
  const fileRef: FileRef = {
    ...sourceFileRef,
    id: fileRefId,
    ownerId: outputId,
    createdAt
  };
  const output: OutputEntity = {
    ...sourceOutput,
    id: outputId,
    fileRefId
  };

  copiedRequest.fileRefIds = [fileRefId];
  copiedRequest.result = {
    ...sourceRequest.result,
    outputId,
    fileRefId
  };

  return { request: copiedRequest, fileRef, output };
}

function copyApprovedReviewsForCopiedRequests(
  state: LoadedState,
  requestDraftId: string,
  copiedRequestIdsBySourceId: Map<string, string>,
  createdAt: string
): {
  decisionLogs: DecisionLog[];
  controlReviewItems: ControlReviewItem[];
  humanReviewActions: HumanReviewAction[];
} {
  const decisionLogs: DecisionLog[] = [];
  const controlReviewItems: ControlReviewItem[] = [];
  const humanReviewActions: HumanReviewAction[] = [];

  for (const sourceReview of state.controlReviewItems) {
    if (sourceReview.status !== 'approved') {
      continue;
    }

    const copiedAgentRequestId = copiedRequestIdsBySourceId.get(sourceReview.agentRequestId);
    if (!copiedAgentRequestId) {
      continue;
    }

    const sourceAgentRequest = findById(state.agentRequests, sourceReview.agentRequestId);
    const sourceDecisionLog = findById(state.decisionLogs, sourceReview.decisionLogId);
    const sourceAction = findById(state.humanReviewActions, sourceReview.resolvedByActionId);
    const decisionLogId = createId('decision');
    const humanReviewActionId = createId('human_review');
    const controlReviewItemId = createId('review');

    const copiedDecisionLog: DecisionLog = sourceDecisionLog
      ? {
          ...sourceDecisionLog,
          id: decisionLogId,
          requestDraftId,
          agentRequestId: copiedAgentRequestId,
          createdAt
        }
      : {
          id: decisionLogId,
          requestDraftId,
          agentRequestId: copiedAgentRequestId,
          stepType: sourceAgentRequest?.type ?? 'propose_clip_themes',
          actor: 'backend',
          decisionType: sourceReview.kind,
          decision: `${sourceReview.title}を引き継ぐ`,
          reason: sourceReview.reason,
          evidenceRefs: [...sourceReview.evidenceRefs],
          inputRefs: [],
          artifactRefs: [...sourceReview.evidenceRefs],
          proposedNextState: sourceReview.proposedNextState,
          requiresHumanReview: true,
          humanQuestion: sourceReview.humanQuestion,
          ruleIds: ['control-plane:copied-human-review'],
          createdAt
        };

    const copiedAction: HumanReviewAction = {
      id: humanReviewActionId,
      reviewItemId: controlReviewItemId,
      requestDraftId,
      action: sourceAction?.action ?? 'approve',
      reason: sourceAction?.reason ?? `${sourceReview.title}を引き継ぐ`,
      ...(sourceAction?.selectedOptionId ? { selectedOptionId: sourceAction.selectedOptionId } : {}),
      createdAt
    };

    const copiedReview: ControlReviewItem = {
      ...sourceReview,
      id: controlReviewItemId,
      requestDraftId,
      agentRequestId: copiedAgentRequestId,
      status: 'approved',
      decisionLogId,
      resolvedAt: createdAt,
      resolvedByActionId: humanReviewActionId,
      createdAt,
      updatedAt: createdAt
    };

    decisionLogs.push(copiedDecisionLog);
    humanReviewActions.push(copiedAction);
    controlReviewItems.push(copiedReview);
  }

  return { decisionLogs, controlReviewItems, humanReviewActions };
}

function createCopiedEditRestart(
  state: LoadedState,
  requestDraftId: string,
  startType: AgentRequest['type'],
  reason: string,
  createdAt: string
): {
  draft: RequestDraft;
  requests: AgentRequest[];
  queuedRequests: AgentRequest[];
  fileRefs: FileRef[];
  outputs: OutputEntity[];
  decisionLogs: DecisionLog[];
  controlReviewItems: ControlReviewItem[];
  humanReviewActions: HumanReviewAction[];
} | { error: string } {
  const sourceDraft = findById(state.requestDrafts, requestDraftId);
  if (!sourceDraft) {
    return { error: 'コピーする編集が見つかりません' };
  }

  const startIndex = workflowStepIndex(startType);
  const copiedDraft = copyDraftForRestart(sourceDraft, reason, createdAt);
  const requests: AgentRequest[] = [];
  const queuedRequests: AgentRequest[] = [];
  const fileRefs: FileRef[] = [];
  const outputs: OutputEntity[] = [];
  const copiedRequestIdsBySourceId = new Map<string, string>();
  let dependsOnAgentRequestId: string | undefined;

  for (const step of WORKFLOW_STEPS.slice(0, startIndex)) {
    const sourceRequest = latestSucceededAgentRequest(state.agentRequests, requestDraftId, step.type);
    if (!sourceRequest) {
      return { error: `${step.label}が完了していないため、そこから後ろを作り直せません` };
    }

    const copied = copySucceededAgentRequestForDraft(
      state,
      sourceRequest,
      copiedDraft.id,
      dependsOnAgentRequestId,
      createdAt
    );
    if ('error' in copied) {
      return copied;
    }

    requests.push(copied.request);
    copiedRequestIdsBySourceId.set(sourceRequest.id, copied.request.id);
    if (copied.fileRef) {
      fileRefs.push(copied.fileRef);
    }
    if (copied.output) {
      outputs.push(copied.output);
    }
    dependsOnAgentRequestId = copied.request.id;
  }

  for (const step of WORKFLOW_STEPS.slice(startIndex)) {
    const request = createAgentRequestForDraftStep(copiedDraft, step.type, dependsOnAgentRequestId, createdAt);
    requests.push(request);
    queuedRequests.push(request);
    dependsOnAgentRequestId = request.id;
  }
  const copiedReviews = copyApprovedReviewsForCopiedRequests(
    state,
    copiedDraft.id,
    copiedRequestIdsBySourceId,
    createdAt
  );

  return {
    draft: copiedDraft,
    requests,
    queuedRequests,
    fileRefs,
    outputs,
    ...copiedReviews
  };
}

function appendCopiedRestartToState(
  state: LoadedState,
  restart: {
    draft: RequestDraft;
    requests: AgentRequest[];
    fileRefs: FileRef[];
    outputs: OutputEntity[];
    decisionLogs: DecisionLog[];
    controlReviewItems: ControlReviewItem[];
    humanReviewActions: HumanReviewAction[];
  }
) {
  state.requestDrafts.unshift(restart.draft);
  state.fileRefs.push(...restart.fileRefs);
  state.outputs.push(...restart.outputs);
  state.decisionLogs.push(...restart.decisionLogs);
  state.controlReviewItems.push(...restart.controlReviewItems);
  state.humanReviewActions.push(...restart.humanReviewActions);
  state.agentRequests.push(...restart.requests);
}

function restartStartTypeForGeneratedVideoChange(scope: GeneratedVideoChangeScope): AgentRequest['type'] {
  if (scope === 'theme_selection') {
    return 'build_clip_composition';
  }

  if (scope === 'adjustment') {
    return 'apply_adjustment';
  }

  return 'create_edit_plan';
}

function generatedVideoChangeScopeFromInput(value: unknown): GeneratedVideoChangeScope {
  if (value === 'theme_selection') {
    return 'theme_selection';
  }

  if (value === 'adjustment') {
    return 'adjustment';
  }

  return 'edit_plan';
}

function createCopiedRestartFromFailedRequest(
  state: LoadedState,
  failedRequestId: string,
  createdAt: string
): {
  draft: RequestDraft;
  requests: AgentRequest[];
  queuedRequests: AgentRequest[];
  fileRefs: FileRef[];
  outputs: OutputEntity[];
  decisionLogs: DecisionLog[];
  controlReviewItems: ControlReviewItem[];
  humanReviewActions: HumanReviewAction[];
} | { error: string } {
  const failedRequest = findById(state.agentRequests, failedRequestId);
  if (!failedRequest) {
    return { error: '再実行するAI工程が見つかりません' };
  }

  if (failedRequest.status !== 'failed') {
    return { error: '失敗したAI工程だけ再実行できます' };
  }

  return createCopiedEditRestart(
    state,
    failedRequest.requestDraftId,
    failedRequest.type,
    `${failedRequest.label}の失敗後に再実行する`,
    createdAt
  );
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
      isStatusIn(request.status, ['queued', 'waiting', 'running', 'succeeded', 'failed']);

    if (!shouldReplace) {
      continue;
    }

    request.status = 'superseded';
    request.errorMessage = '人間のやり直し指示により、この工程は古い編集案として現在対象から外しました';
    request.updatedAt = updatedAt;
  }
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
    return { error: '内容を選び直せるのは動画生成前確認からだけです' };
  }

  const sourceRequest = findById(state.agentRequests, reviewItem.agentRequestId);
  if (!sourceRequest) {
    return { error: '内容を選び直す前提になるAI工程が見つかりません' };
  }

  const themeRequest = latestSucceededAgentRequest(state.agentRequests, reviewItem.requestDraftId, 'propose_clip_themes');
  if (!themeRequest) {
    return { error: '内容を選び直すための内容候補がありません' };
  }

  const previousThemeReview = latestControlReview(state.controlReviewItems, reviewItem.requestDraftId, 'theme_selection');
  if (!previousThemeReview?.options.length) {
    return { error: '内容を選び直すための選択肢がありません' };
  }

  const fileRef = fileRefForAgentRequest(state, themeRequest);
  const output = outputForAgentRequest(state, themeRequest);
  const createdReview = createControlReview(
    themeRequest,
    'theme_selection',
    {
      decisionType: 'theme_selection',
      decision: '既存の内容候補から選び直す',
      reason: '動画生成前確認で内容から見直す判断になったため、既存の内容候補をもう一度人間が選べるようにする',
      evidenceRefs: [],
      reviewOptions: previousThemeReview.options,
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'どの内容で切り抜きを作り直すか選んでください',
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
    return '内容選択';
  }

  if (kind === 'material_confirmation') {
    return '使用素材確認';
  }

  return '動画生成前の確認';
}

function reviewSummary(kind: ControlReviewKind, agentRequest: AgentRequest): string {
  if (kind === 'theme_selection') {
    return `${agentRequest.label} の結果を確認して、面白そうな内容を選びます`;
  }

  if (kind === 'material_confirmation') {
    return `${agentRequest.label} の結果を確認して、この素材で演出作成へ進めるか判断します`;
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
  const reviewItem = findById(state.controlReviewItems, reviewItemId);

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
      return { status: 'error', statusCode: 400, error: '切り抜きたい内容を選んでください', state };
    }

    if (!reviewItem.options.some((option) => option.id === selectedOptionId)) {
      return { status: 'error', statusCode: 400, error: '選んだ内容が確認対象にありません', state };
    }
  }

  const createdAt = nowIso();
  let newAgentRequests: AgentRequest[] = [];
  let replaceStartType: AgentRequest['type'] | undefined;
  let extraDecisionLog: DecisionLog | undefined;
  let extraReviewItem: ControlReviewItem | undefined;
  let copiedRestart: Exclude<ReturnType<typeof createCopiedEditRestart>, { error: string }> | undefined;

  if (action === 'request_changes') {
    const changeScope: ReviewChangeScope =
      changeScopeInput === 'theme_reselect'
        ? 'theme_reselect'
        : changeScopeInput === 'adjustment'
          ? 'adjustment'
          : 'edit_plan';

    if (reviewItem.kind === 'theme_selection') {
      const restart = createCopiedEditRestart(
        state,
        reviewItem.requestDraftId,
        'propose_clip_themes',
        reason,
        createdAt
      );
      if ('error' in restart) {
        return { status: 'error', statusCode: 409, error: restart.error, state };
      }

      copiedRestart = restart;
    } else if (reviewItem.kind === 'material_confirmation') {
      const restart = createCopiedEditRestart(
        state,
        reviewItem.requestDraftId,
        'build_clip_composition',
        reason,
        createdAt
      );
      if ('error' in restart) {
        return { status: 'error', statusCode: 409, error: restart.error, state };
      }

      copiedRestart = restart;
    } else if (reviewItem.kind === 'render_readiness' && changeScope === 'theme_reselect') {
      const result = createThemeReselectFromReview(state, reviewItem, createdAt);
      if ('error' in result) {
        return { status: 'error', statusCode: 409, error: result.error, state };
      }

      replaceStartType = 'build_clip_composition';
      newAgentRequests = result.requests;
      extraDecisionLog = result.decisionLog;
      extraReviewItem = result.reviewItem;
    } else {
      const startType: AgentRequest['type'] =
        changeScope === 'adjustment' ? 'apply_adjustment' : 'create_edit_plan';
      const restart = createCopiedEditRestart(
        state,
        reviewItem.requestDraftId,
        startType,
        reason,
        createdAt
      );
      if ('error' in restart) {
        return { status: 'error', statusCode: 409, error: restart.error, state };
      }

      copiedRestart = restart;
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

  if (copiedRestart) {
    appendCopiedRestartToState(state, copiedRestart);
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

router.get('/runtime-config', async (_, response) => {
  try {
    response.json(await loadRuntimeConfig());
  } catch (error) {
    const message = error instanceof Error ? error.message : '設定ファイルを読めません';
    response.status(500).json({ error: message });
  }
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
  const draft = findById(state.requestDrafts, request.params.id);

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
  const agentRequest = findById(state.agentRequests, request.params.id);

  if (!agentRequest) {
    response.status(404).json({ error: 'AI操作が見つかりません' });
    return;
  }

  if (!isStatusIn(agentRequest.status, ['queued', 'waiting'])) {
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
  const agentRequest = findById(state.agentRequests, request.params.id);

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
  const scope = generatedVideoChangeScopeFromInput(request.body?.scope);

  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }
  if (!latestSucceededAgentRequest(state.agentRequests, draft.id, 'render_video')) {
    response.status(409).json({ error: '生成済み動画がないため、生成後の修正依頼を開始できません', state });
    return;
  }

  const createdAt = nowIso();
  const restart = createCopiedEditRestart(
    state,
    draft.id,
    restartStartTypeForGeneratedVideoChange(scope),
    reason,
    createdAt
  );
  if ('error' in restart) {
    response.status(409).json({ error: restart.error, state });
    return;
  }

  appendCopiedRestartToState(state, restart);
  await saveState(state);

  startDryRunRunner();
  response.json({
    draft: restart.draft,
    agentRequests: selectAgentRequests(state.agentRequests, new Set(restart.queuedRequests.map((item) => item.id))),
    state
  });
});

router.post('/agent-requests/:id/retry', async (request, response) => {
  const state = await loadState();
  const createdAt = nowIso();
  const restart = createCopiedRestartFromFailedRequest(state, request.params.id, createdAt);
  if ('error' in restart) {
    response.status(409).json({ error: restart.error, state });
    return;
  }

  appendCopiedRestartToState(state, restart);
  await saveState(state);

  startDryRunRunner();
  response.json({
    draft: restart.draft,
    agentRequests: selectAgentRequests(state.agentRequests, new Set(restart.queuedRequests.map((item) => item.id))),
    state
  });
});

router.post('/agent-requests/:id/fail', async (request, response) => {
  const state = await loadState();
  const agentRequest = findById(state.agentRequests, request.params.id);

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
