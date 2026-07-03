import {
  findById,
  hasText,
  WORKFLOW_STEPS,
  type AgentDecisionInput,
  type AgentRequest,
  type ControlReference,
  type ControlReviewItem,
  type ControlReviewKind,
  type DecisionLog,
  type FileRef,
  type HumanReviewAction,
  type HumanReviewActionType,
  type OutputEntity,
  type Zev2State
} from '@zev2/shared';
import { loadState, saveState } from '../store/json-store.js';
import { appendAgentRequestOperationLog } from './operation-log.js';
import { createId, nowIso, reviewActionLabel } from './support.js';
import {
  fileRefForAgentRequest,
  latestControlReview,
  latestSucceededAgentRequest,
  outputForAgentRequest,
  workflowStepIndex
} from './state-selectors.js';
import {
  appendCopiedRestartToState,
  createAgentRequestAfter,
  createCopiedEditRestart,
  markReplaceableRequestsAsReplaced,
  type CopiedEditRestart
} from './restart.js';

export type ReviewChangeScope =
  | 'edit_plan'
  | 'theme_reselect'
  | 'theme_options_regenerate'
  | 'material_reselect'
  | 'adjustment';

export const reviewChangeScopes: ReviewChangeScope[] = [
  'edit_plan',
  'theme_reselect',
  'theme_options_regenerate',
  'material_reselect',
  'adjustment'
];

export function createThemeReselectFromReview(
  state: Zev2State,
  reviewItem: ControlReviewItem,
  createdAt: string
): {
  decisionLog: DecisionLog;
  reviewItem: ControlReviewItem;
  requests: AgentRequest[];
} | { error: string } {
  if (reviewItem.kind !== 'render_readiness' && reviewItem.kind !== 'material_confirmation') {
    return { error: 'テーマを選び直せるのは編集元場面の確認または動画生成前確認からだけです' };
  }

  const sourceRequest = findById(state.agentRequests, reviewItem.agentRequestId);
  if (!sourceRequest) {
    return { error: 'テーマを選び直す前提になるAI工程が見つかりません' };
  }

  const themeRequest = latestSucceededAgentRequest(state.agentRequests, reviewItem.requestDraftId, 'propose_clip_themes');
  if (!themeRequest) {
    return { error: 'テーマを選び直すためのテーマがありません' };
  }

  const previousThemeReview = latestControlReview(state.controlReviewItems, reviewItem.requestDraftId, 'theme_selection');
  if (!previousThemeReview?.options.length) {
    return { error: '選び直せるテーマがありません' };
  }

  const fileRef = fileRefForAgentRequest(state, themeRequest);
  const output = outputForAgentRequest(state, themeRequest);
  const createdReview = createControlReview(
    themeRequest,
    'theme_selection',
    {
      decisionType: 'theme_selection',
      decision: '既存のテーマから選び直す',
      reason: '動画生成前確認でテーマから見直す判断になったため、既存のテーマをもう一度人間が選べるようにする',
      evidenceRefs: [],
      reviewOptions: previousThemeReview.options,
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'どのテーマで作り直すか選んでください',
      ruleIds: ['control-plane:theme-selection-required', 'zev-reference:theme-reselect']
    },
    fileRef,
    output
  );

  const startIndex = workflowStepIndex('build_clip_composition');
  let dependsOnAgentRequestId = themeRequest.id;
  const requests: AgentRequest[] = [];
  for (const step of WORKFLOW_STEPS.slice(startIndex)) {
    const request = createAgentRequestAfter(sourceRequest, step.type, dependsOnAgentRequestId, createdAt);
    requests.push(request);
    dependsOnAgentRequestId = request.id;
  }

  return { ...createdReview, requests };
}

export function validateAgentDecision(input: AgentDecisionInput | undefined): string[] {
  if (!input) {
    return ['重要判断には判断ログが必要です'];
  }

  const errors: string[] = [];
  if (!hasText(input.decision)) {
    errors.push('判断したことが必要です');
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
    errors.push('人間に求める判断が必要です');
  }

  return errors;
}

export const reviewTitleByKind: Record<ControlReviewKind, string> = {
  theme_selection: 'テーマ選択',
  material_confirmation: '切り口と編集元場面の確認',
  render_readiness: '動画生成前の確認'
};

export function reviewTitle(kind: ControlReviewKind): string {
  return reviewTitleByKind[kind];
}

export function reviewSummary(kind: ControlReviewKind, agentRequest: AgentRequest): string {
  if (kind === 'theme_selection') {
    return `${agentRequest.label} の結果を確認して、切り抜くテーマを選びます`;
  }

  if (kind === 'material_confirmation') {
    return 'テーマに対する切り口と編集元場面の組み合わせを確認します';
  }

  return `${agentRequest.label} の結果を確認して、動画生成へ進めるか判断します`;
}

export function createArtifactReferences(fileRef: FileRef | undefined, output: OutputEntity | undefined): ControlReference[] {
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

export function createControlReview(
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

export function reviewChangeScopeFromInput(input: unknown): ReviewChangeScope | { error: string } {
  if (input === undefined) {
    return 'edit_plan';
  }

  if (reviewChangeScopes.includes(input as ReviewChangeScope)) {
    return input as ReviewChangeScope;
  }

  return { error: '確認後に作り直す範囲が不正です' };
}

export function defaultHumanReviewReason(
  action: HumanReviewActionType,
  reviewItem: ControlReviewItem,
  changeScope: ReviewChangeScope
): string {
  if (action === 'approve') {
    return '確認済みとして進める';
  }

  if (action === 'reject') {
    return '';
  }

  if (reviewItem.kind === 'theme_selection' || changeScope === 'theme_options_regenerate') {
    return 'テーマを作り直す';
  }

  if (changeScope === 'theme_reselect') {
    return 'テーマを選び直す';
  }

  if (reviewItem.kind === 'material_confirmation') {
    return '同じテーマで切り口と編集元場面を探し直す';
  }

  if (changeScope === 'adjustment') {
    return '微調整から作り直す';
  }

  return '演出作成前から作り直す';
}

export async function applyHumanReviewAction(
  reviewItemId: string,
  action: HumanReviewActionType,
  reasonInput: unknown,
  selectedOptionInput?: unknown,
  changeScopeInput?: unknown
): Promise<
  | { status: 'ok'; reviewItem: ControlReviewItem; humanReviewAction: HumanReviewAction; state: Zev2State }
  | { status: 'error'; statusCode: number; error: string; state?: Zev2State }
> {
  const state = await loadState();
  const reviewItem = findById(state.controlReviewItems, reviewItemId);

  if (!reviewItem) {
    return { status: 'error', statusCode: 404, error: '人間確認項目が見つかりません' };
  }

  if (reviewItem.status !== 'review_required') {
    return { status: 'error', statusCode: 409, error: 'この確認項目はすでに処理済みです', state };
  }

  const hasExplicitReason = hasText(reasonInput);
  const changeScopeResult = action === 'request_changes' ? reviewChangeScopeFromInput(changeScopeInput) : 'edit_plan';
  if (typeof changeScopeResult !== 'string') {
    return { status: 'error', statusCode: 400, error: changeScopeResult.error, state };
  }
  const changeScope = changeScopeResult;
  const reason = hasExplicitReason
    ? reasonInput.trim()
    : defaultHumanReviewReason(action, reviewItem, changeScope);
  if (action === 'reject' && !reason) {
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
  let copiedRestart: CopiedEditRestart | undefined;

  if (action === 'request_changes') {
    if (changeScope === 'theme_options_regenerate' && reviewItem.kind !== 'theme_selection') {
      return {
        status: 'error',
        statusCode: 409,
        error: 'テーマを作り直せるのはテーマ選択画面からだけです',
        state
      };
    }

    if (reviewItem.kind === 'theme_selection') {
      const restart = await createCopiedEditRestart(
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
    } else if (reviewItem.kind === 'material_confirmation' && changeScope === 'theme_reselect') {
      const result = createThemeReselectFromReview(state, reviewItem, createdAt);
      if ('error' in result) {
        return { status: 'error', statusCode: 409, error: result.error, state };
      }

      replaceStartType = 'build_clip_composition';
      newAgentRequests = result.requests;
      extraDecisionLog = result.decisionLog;
      extraReviewItem = result.reviewItem;
    } else if (reviewItem.kind === 'material_confirmation') {
      const restart = await createCopiedEditRestart(
        state,
        reviewItem.requestDraftId,
        'build_clip_composition',
        reason,
        createdAt,
        changeScope === 'material_reselect' && hasExplicitReason ? reason : undefined
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
      const restart = await createCopiedEditRestart(
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
  for (const agentRequest of newAgentRequests) {
    appendAgentRequestOperationLog(
      state,
      agentRequest,
      'agent_request_created',
      `${agentRequest.label}を作り直し用のAIエージェント作業としてキューに追加した`,
      {
        actor: 'backend',
        toStatus: agentRequest.status,
        createdAt: agentRequest.createdAt
      }
    );
  }
  await saveState(state);

  return { status: 'ok', reviewItem, humanReviewAction, state };
}
