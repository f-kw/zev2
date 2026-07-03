import express from 'express';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, open, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  ARTIFACT_FILE_NAME_BY_KIND,
  WORKFLOW_STEPS,
  type AgentOperationLog,
  type AgentOperationLogEventType,
  type AgentClaimInput,
  type AgentCompletionInput,
  type AgentDecisionInput,
  type AgentFailureInput,
  type AgentRequest,
  type ControlReference,
  type ControlReviewItem,
  type ControlReviewKind,
  type DecisionLog,
  type DecisionLogType,
  type FinalReviewAction,
  type FinalReviewActionType,
  type FileRef,
  type HumanReviewAction,
  type HumanReviewActionType,
  type OutputEntity,
  type RequestDraft,
  type RequestDraftActivityEvent,
  type RequestDraftActivitySearchResult,
  type RequestDraftActivitySummary,
  type WebGeminiReviewArtifact,
  type WebGeminiReviewRunLog,
  type WebGeminiReviewRunStatus,
  type WebGeminiReviewState,
  type WebGeminiRevisionBriefArtifact,
  WEB_GEMINI_REVIEW_RUN_STATUSES,
  buildWebGeminiExternalReviewCommand,
  buildWebGeminiReviewPromptText,
  createAgentRequestsFromDraft,
  createRequestDraft,
  findById,
  findAgentRequestDependency,
  findBlockingControlReview,
  findReadyAgentRequest,
  getFileRefKindForRequest,
  getOutputTypeForRequest,
  getRequiredControlReviewKind,
  hasText,
  isAgentRequestReady,
  isStatusIn,
  recordValue,
  trimText,
  unknownErrorMessage,
  validateRequestDraftInput,
  type RequestDraftInput
} from '@zev2/shared';
import { loadState, runExclusiveStateOperation, saveState } from '../store/json-store.js';
import { startDryRunRunner } from '../runner/auto-runner.js';
import { loadRuntimeConfig } from '../config/runtime-config.js';
import { resolveRuntimeDir } from '../config/runtime-dir.js';
import {
  artifactPathByUrl as resolveArtifactPathByUrl,
  artifactRoot as resolveArtifactRoot,
  artifactUrl,
  artifactUrlPrefix
} from '../artifacts/artifact-path.js';
import { compactActivityText, createId, nowIso, reviewActionLabel } from '../domain/support.js';
import { appendAgentOperationLog, appendAgentRequestOperationLog } from '../domain/operation-log.js';
import {
  currentAgentRequestsForDraft,
  fileRefForAgentRequest,
  finalCompletedOutputChangeError,
  hasFinalReviewActionForOutput,
  latestControlReview,
  latestFinalReviewActionForOutput,
  latestOpenControlReview,
  latestOutputVideoFileRef,
  latestSucceededAgentRequest,
  outputForAgentRequest,
  workflowStepIndex
} from '../domain/state-selectors.js';
import {
  activitySearchParam,
  buildFinalReviewActivitySummary,
  buildRequestDraftActivitySummary,
  buildRequestDraftActivityWithExternalEvents,
  buildWebGeminiReviewActivitySummary,
  defaultFinalReviewReason,
  filterActivitySearchResults
} from '../activity/build.js';
import {
  artifactPathByUrl,
  validateCompletionFileRef,
  validateArtifactFileRefForKind,
  type ArtifactFileMetadata
} from '../artifacts/validation.js';
import {
  appendCopiedRestartToState,
  createAgentRequestAfter,
  createCopiedEditRestart,
  createCopiedRestartFromFailedRequest,
  generatedVideoChangeScopeFromInput,
  markReplaceableRequestsAsReplaced,
  restartStartTypeForGeneratedVideoChange,
  type CopiedEditRestart
} from '../domain/restart.js';
import {
  ensureWebGeminiReviewMatchesOutputVideo,
  ensureWebGeminiRevisionBriefMatchesReview,
  ensureWebGeminiRunLogMatchesOutputVideo,
  removeWebGeminiReviewArtifact,
  removeWebGeminiRevisionBriefArtifact,
  webGeminiReviewPath,
  webGeminiReviewPromptPath,
  webGeminiRevisionBriefPath,
  writeWebGeminiReviewArtifact,
  writeWebGeminiReviewPromptText,
  writeWebGeminiReviewRunLog,
  writeWebGeminiRevisionBriefArtifact
} from '../web-gemini/artifacts.js';
import {
  buildWebGeminiRunStatusRunLog,
  parseWebGeminiReviewSavedFrom,
  parseWebGeminiRunStatusUpdateInput,
  webGeminiReviewSavedNextActionBySavedFrom
} from '../web-gemini/run-status.js';
import { upsertWebGeminiReviewState, webGeminiReviewStateForDraft } from '../web-gemini/state.js';
import { requireAgentApiToken } from '../security/agent-auth.js';
import {
  clearHumanSessionCookie,
  configuredHumanApiToken,
  createHumanSessionCookie,
  isHumanApiRequestAuthenticated,
  requireHumanApiToken,
  verifyHumanLoginToken
} from '../security/human-auth.js';

const router: express.Router = express.Router();
type ReviewChangeScope =
  | 'edit_plan'
  | 'theme_reselect'
  | 'theme_options_regenerate'
  | 'material_reselect'
  | 'adjustment';
const reviewChangeScopes: ReviewChangeScope[] = [
  'edit_plan',
  'theme_reselect',
  'theme_options_regenerate',
  'material_reselect',
  'adjustment'
];
const finalReviewActionTypes: FinalReviewActionType[] = ['publish_ready', 'final_complete'];
type LoadedState = Awaited<ReturnType<typeof loadState>>;
const runtimeDir = resolveRuntimeDir();

function isAgentExecutionApiRequest(request: express.Request): boolean {
  const path = request.path;
  if (request.method === 'GET' && path === '/agent-requests/next') {
    return true;
  }

  return request.method === 'POST' && /^\/agent-requests\/[^/]+\/(claim|complete|fail)$/.test(path);
}

function isPublicControlApiRequest(request: express.Request): boolean {
  if (request.method === 'GET' && request.path === '/health') {
    return true;
  }

  if (request.method === 'GET' && request.path === '/human-auth/status') {
    return true;
  }

  return request.method === 'POST' && (
    request.path === '/human-auth/login' ||
    request.path === '/human-auth/logout'
  );
}

router.get('/human-auth/status', (request, response) => {
  const required = Boolean(configuredHumanApiToken());
  response.json({
    required,
    authenticated: !required || isHumanApiRequestAuthenticated(request)
  });
});

router.post('/human-auth/login', (request, response) => {
  const required = Boolean(configuredHumanApiToken());
  if (!required) {
    response.json({ required, authenticated: true });
    return;
  }

  if (!verifyHumanLoginToken(request.body?.token)) {
    response.status(401).json({ error: '人間UIの認証が必要です' });
    return;
  }

  response.setHeader('Set-Cookie', createHumanSessionCookie());
  response.json({ required, authenticated: true });
});

router.post('/human-auth/logout', (_, response) => {
  const required = Boolean(configuredHumanApiToken());
  response.setHeader('Set-Cookie', clearHumanSessionCookie());
  response.json({ required, authenticated: !required });
});

router.use((request, response, next) => {
  if (isPublicControlApiRequest(request) || isAgentExecutionApiRequest(request)) {
    next();
    return;
  }

  requireHumanApiToken(request, response, next);
});

// 全ルートがstate.jsonを全量read-modify-writeするため、リクエスト単位で直列化して更新消失を防ぐ
router.use((_, response, next) => {
  void runExclusiveStateOperation(
    () =>
      new Promise<void>((resolve) => {
        response.once('finish', resolve);
        response.once('close', resolve);
        next();
      })
  );
});

function selectAgentRequests(stateAgentRequests: AgentRequest[], ids: Set<string>): AgentRequest[] {
  return stateAgentRequests.filter((request) => ids.has(request.id));
}

function routeParamText(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function isValidIsoDateText(value: string): boolean {
  return Boolean(value) && Number.isFinite(Date.parse(value));
}

function isClaimExpired(request: AgentRequest, observedAt: string): boolean {
  if (request.status !== 'running' || !request.claimExpiresAt) {
    return false;
  }

  return Date.parse(request.claimExpiresAt) <= Date.parse(observedAt);
}

function isRunnableAfterClaimRecovery(state: LoadedState, request: AgentRequest): boolean {
  const dependency = findAgentRequestDependency(state, request);
  return (!dependency || dependency.status === 'succeeded') && !findBlockingControlReview(state, request);
}

function clearClaimFields(request: AgentRequest): void {
  delete request.claimOwnerId;
  delete request.claimedAt;
  delete request.claimUpdatedAt;
  delete request.claimExpiresAt;
}

function recoverExpiredClaims(state: LoadedState, observedAt: string): boolean {
  let changed = false;

  for (const request of state.agentRequests) {
    if (!isClaimExpired(request, observedAt)) {
      continue;
    }

    const previousOwner = request.claimOwnerId || '不明';
    const previousStatus = request.status;
    clearClaimFields(request);
    request.claimExpiredAt = observedAt;
    request.status = isRunnableAfterClaimRecovery(state, request) ? 'queued' : 'waiting';
    request.errorMessage = `取得期限が切れたため復旧しました。前回取得者: ${previousOwner}`;
    request.updatedAt = observedAt;
    appendAgentRequestOperationLog(
      state,
      request,
      'agent_request_claim_recovered',
      request.errorMessage,
      {
        actor: 'backend',
        fromStatus: previousStatus,
        toStatus: request.status,
        ownerId: previousOwner,
        errorMessage: request.errorMessage,
        createdAt: observedAt
      }
    );
    changed = true;
  }

  return changed;
}

async function loadStateWithClaimRecovery(): Promise<LoadedState> {
  const state = await loadState();
  const observedAt = nowIso();
  if (recoverExpiredClaims(state, observedAt)) {
    await saveState(state);
  }

  return state;
}

function readAgentClaimInput(value: unknown): AgentClaimInput {
  const body = value && typeof value === 'object' ? (value as Partial<AgentClaimInput>) : {};
  return {
    ownerId: trimText(body.ownerId),
    ...(trimText(body.expiresAt) ? { expiresAt: trimText(body.expiresAt) } : {})
  };
}

function ensureClaimOwnerMatches(request: AgentRequest, ownerId: string): string | undefined {
  if (!ownerId) {
    return 'AIエージェント取得者が必要です';
  }

  if (request.claimOwnerId !== ownerId) {
    return '取得者が一致しないため、このAI操作は完了または失敗として記録できません';
  }

  return undefined;
}

function buildWebGeminiReviewPrompt(draft: RequestDraft): string {
  return buildWebGeminiReviewPromptText(draft.purpose);
}

function webGeminiReviewRestartReason(
  review: WebGeminiReviewArtifact,
  revisionBrief: WebGeminiRevisionBriefArtifact
): string {
  return [
    'Web Geminiの演出レビューを確認し、人間が確定した方針で演出作成前から作り直す',
    `レビュー対象動画: ${review.outputVideoUri}`,
    `レビュー保存日時: ${review.createdAt}`,
    `再生成方針の確定日時: ${revisionBrief.createdAt}`,
    '',
    '人間が確定した再生成方針:',
    revisionBrief.briefText
  ].join('\n');
}

async function prepareWebGeminiReviewRun(
  draft: RequestDraft,
  outputVideo: FileRef,
  createdAt: string
): Promise<WebGeminiReviewRunLog> {
  const promptPath = webGeminiReviewPromptPath(draft.id);
  await writeWebGeminiReviewPromptText(draft.id, buildWebGeminiReviewPrompt(draft));

  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'prepared',
    createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath,
    blockedReasons: [],
    externalUploadRequired: true,
    externalReviewCommand: buildWebGeminiExternalReviewCommand(draft.id),
    nextAction: 'レビュー対象動画と依頼文を確認しました。外部送信はまだ実行していません。'
  };
  await writeWebGeminiReviewRunLog(runLog);
  return runLog;
}

async function writeWebGeminiReviewSaveFailureRunLog(
  draft: RequestDraft,
  outputVideo: FileRef,
  errorMessage: string,
  createdAt: string
): Promise<WebGeminiReviewRunLog> {
  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'failed',
    createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath: webGeminiReviewPromptPath(draft.id),
    blockedReasons: [errorMessage],
    externalUploadRequired: false,
    nextAction: 'Web Geminiレビューの保存に失敗しました。レビュー本文を確認してから再実行してください。'
  };
  await writeWebGeminiReviewRunLog(runLog);
  return runLog;
}

async function writeWebGeminiReviewAppliedRunLog(
  draft: RequestDraft,
  outputVideo: FileRef,
  review: WebGeminiReviewArtifact,
  revisionBrief: WebGeminiRevisionBriefArtifact,
  appliedDraftId: string,
  createdAt: string
): Promise<WebGeminiReviewRunLog> {
  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'applied',
    createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath: webGeminiReviewPromptPath(draft.id),
    blockedReasons: [],
    externalUploadRequired: false,
    nextAction: 'Web Gemini再生成方針を反映して、新しい編集コピーを作成しました。',
    reviewPath: webGeminiReviewPath(draft.id),
    reviewCreatedAt: review.createdAt,
    revisionBriefPath: webGeminiRevisionBriefPath(draft.id),
    revisionBriefCreatedAt: revisionBrief.createdAt,
    appliedDraftId,
    appliedAt: createdAt
  };
  await writeWebGeminiReviewRunLog(runLog);
  return runLog;
}

async function validateWebGeminiOutputVideo(
  draft: RequestDraft,
  outputVideo: FileRef | undefined
): Promise<string | undefined> {
  if (!outputVideo) {
    return '生成済み動画がありません';
  }

  if (outputVideo.kind !== 'output_video') {
    return 'Web Geminiレビュー対象が完成動画ではありません';
  }

  const validation = await validateArtifactFileRefForKind(
    draft.id,
    'output_video',
    outputVideo.uri,
    outputVideo.mimeType
  );
  if ('error' in validation) {
    return `Web Geminiレビュー対象の完成動画を確認できません: ${validation.error}`;
  }

  return undefined;
}

function cancelActiveAgentRequests(
  stateAgentRequests: AgentRequest[],
  requestDraftId: string,
  updatedAt: string
): AgentRequest[] {
  const cancelledRequests: AgentRequest[] = [];

  for (const request of stateAgentRequests) {
    if (
      request.requestDraftId !== requestDraftId ||
      !isStatusIn(request.status, ['queued', 'waiting', 'running'])
    ) {
      continue;
    }

    request.status = 'cancelled';
    request.errorMessage = '人間がAI作業を中止しました';
    request.updatedAt = updatedAt;
    cancelledRequests.push(request);
  }

  return cancelledRequests;
}

function rejectOpenControlReviewsForCancel(
  state: LoadedState,
  requestDraftId: string,
  updatedAt: string
): ControlReviewItem[] {
  const rejectedReviews: ControlReviewItem[] = [];

  for (const reviewItem of state.controlReviewItems) {
    if (reviewItem.requestDraftId !== requestDraftId || reviewItem.status !== 'review_required') {
      continue;
    }

    const humanReviewAction: HumanReviewAction = {
      id: createId('human_review'),
      reviewItemId: reviewItem.id,
      requestDraftId,
      action: 'reject',
      reason: '人間がAI作業を中止したため、この確認待ちを閉じました',
      createdAt: updatedAt
    };

    reviewItem.status = 'rejected';
    reviewItem.resolvedAt = updatedAt;
    reviewItem.resolvedByActionId = humanReviewAction.id;
    reviewItem.updatedAt = updatedAt;
    state.humanReviewActions.push(humanReviewAction);
    rejectedReviews.push(reviewItem);
  }

  return rejectedReviews;
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

function validateAgentDecision(input: AgentDecisionInput | undefined): string[] {
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

const reviewTitleByKind: Record<ControlReviewKind, string> = {
  theme_selection: 'テーマ選択',
  material_confirmation: '切り口と編集元場面の確認',
  render_readiness: '動画生成前の確認'
};

function reviewTitle(kind: ControlReviewKind): string {
  return reviewTitleByKind[kind];
}

function reviewSummary(kind: ControlReviewKind, agentRequest: AgentRequest): string {
  if (kind === 'theme_selection') {
    return `${agentRequest.label} の結果を確認して、切り抜くテーマを選びます`;
  }

  if (kind === 'material_confirmation') {
    return 'テーマに対する切り口と編集元場面の組み合わせを確認します';
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

function completeAgentRequest(
  request: AgentRequest,
  input: AgentCompletionInput,
  metadata: ArtifactFileMetadata
): {
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
    artifactFileName: metadata.artifactFileName,
    byteSize: metadata.byteSize,
    sha256: metadata.sha256,
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

function reviewChangeScopeFromInput(input: unknown): ReviewChangeScope | { error: string } {
  if (input === undefined) {
    return 'edit_plan';
  }

  if (reviewChangeScopes.includes(input as ReviewChangeScope)) {
    return input as ReviewChangeScope;
  }

  return { error: '確認後に作り直す範囲が不正です' };
}

function defaultHumanReviewReason(
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
  const state = await loadStateWithClaimRecovery();
  response.json(state);
});

router.get('/request-drafts/:id/activity', async (request, response) => {
  const state = await loadStateWithClaimRecovery();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません' });
    return;
  }

  const events = buildRequestDraftActivityWithExternalEvents(state, draft);
  const outputVideo = latestOutputVideoFileRef(state, draft.id);

  const baseSummary = buildRequestDraftActivitySummary(state, draft);
  const webGeminiSummary = buildWebGeminiReviewActivitySummary(
    baseSummary,
    draft,
    outputVideo,
    webGeminiReviewStateForDraft(state, draft.id)
  );
  const summary = buildFinalReviewActivitySummary(webGeminiSummary, state, draft, outputVideo);

  response.json({
    requestDraftId: draft.id,
    summary,
    events
  });
});

router.get('/activity-search', async (request, response) => {
  const state = await loadStateWithClaimRecovery();
  const query = activitySearchParam(request.query.q);
  const actor = activitySearchParam(request.query.actor);
  const kind = activitySearchParam(request.query.kind);
  const requestDraftId = activitySearchParam(request.query.requestDraftId);
  const limitText = activitySearchParam(request.query.limit);
  const allResults: RequestDraftActivitySearchResult[] = [];
  for (const draft of state.requestDrafts) {
    const events = buildRequestDraftActivityWithExternalEvents(state, draft);
    allResults.push(...events.map((event) => ({
      ...event,
      draftPurpose: draft.purpose,
      draftStatus: draft.status
    })));
  }

  const results = filterActivitySearchResults(allResults, { query, actor, kind, requestDraftId, limitText });
  response.json({
    query: {
      q: query,
      actor,
      kind,
      requestDraftId,
      limit: limitText
    },
    totalCount: results.length,
    results
  });
});

router.post('/request-drafts/:id/final-review', async (request, response) => {
  const state = await loadStateWithClaimRecovery();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません' });
    return;
  }

  const input = recordValue(request.body);
  const action = input.action as FinalReviewActionType;
  if (!finalReviewActionTypes.includes(action)) {
    response.status(400).json({ error: '完成動画への判断が不明です' });
    return;
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '完成動画がまだありません' });
    return;
  }

  const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
  if (outputVideoError) {
    response.status(409).json({ error: outputVideoError, state });
    return;
  }

  if (hasFinalReviewActionForOutput(state, draft.id, outputVideo, 'final_complete')) {
    response.status(409).json({ error: 'この完成動画はすでに最終完了として記録済みです', state });
    return;
  }

  if (action === 'publish_ready' && hasFinalReviewActionForOutput(state, draft.id, outputVideo, 'publish_ready')) {
    response.status(409).json({ error: 'この完成動画はすでに投稿可能として記録済みです', state });
    return;
  }

  const createdAt = nowIso();
  const finalReviewAction: FinalReviewAction = {
    id: createId('final_review'),
    requestDraftId: draft.id,
    action,
    reason: trimText(input.reason) || defaultFinalReviewReason(action),
    outputVideoUri: outputVideo.uri,
    createdAt
  };

  draft.updatedAt = createdAt;
  state.finalReviewActions.push(finalReviewAction);
  await saveState(state);
  response.json({ finalReviewAction, state });
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
  appendAgentOperationLog(state, {
    eventType: 'draft_created',
    requestDraftId: draft.id,
    actor: 'user',
    toStatus: draft.status,
    detail: '実行前下書きを保存した',
    createdAt: draft.createdAt
  });
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
  appendAgentOperationLog(state, {
    eventType: 'draft_approved',
    requestDraftId: draft.id,
    actor: 'user',
    fromStatus: 'draft',
    toStatus: draft.status,
    detail: '人間が依頼を承認し、AIエージェント用作業を作れる状態にした',
    createdAt: draft.updatedAt
  });

  const agentRequests = createAgentRequestsFromDraft(draft, nowIso(), createId);
  const agentRequestIds = new Set(agentRequests.map((agentRequest) => agentRequest.id));
  state.agentRequests.push(...agentRequests);
  for (const agentRequest of agentRequests) {
    appendAgentRequestOperationLog(
      state,
      agentRequest,
      'agent_request_created',
      `${agentRequest.label}をAIエージェント用作業としてキューに追加した`,
      {
        actor: 'backend',
        toStatus: agentRequest.status,
        createdAt: agentRequest.createdAt
      }
    );
  }
  await saveState(state);

  startDryRunRunner();
  response.json({
    draft,
    agentRequests: selectAgentRequests(state.agentRequests, agentRequestIds),
    state
  });
});

router.post('/request-drafts/:id/reject', async (request, response) => {
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);

  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません' });
    return;
  }

  const reason = trimText(request.body?.reason);
  if (!reason) {
    response.status(400).json({ error: '下書きの却下には理由が必要です', state });
    return;
  }

  if (draft.status !== 'draft') {
    response.status(409).json({ error: 'この下書きはすでに処理済みです', state });
    return;
  }

  draft.status = 'rejected';
  draft.updatedAt = nowIso();
  appendAgentOperationLog(state, {
    eventType: 'draft_rejected',
    requestDraftId: draft.id,
    actor: 'user',
    fromStatus: 'draft',
    toStatus: draft.status,
    detail: '人間が実行前下書きを却下した',
    errorMessage: reason,
    createdAt: draft.updatedAt
  });
  await saveState(state);

  response.json({ draft, state });
});

router.get('/agent-requests/next', requireAgentApiToken, async (_, response) => {
  const state = await loadStateWithClaimRecovery();
  const agentRequest = findReadyAgentRequest(state);
  if (agentRequest) {
    appendAgentRequestOperationLog(
      state,
      agentRequest,
      'agent_request_next_returned',
      `${agentRequest.label}を次に実行できる作業として返した`,
      {
        actor: 'backend',
        toStatus: agentRequest.status
      }
    );
    await saveState(state);
  }
  response.json({ request: agentRequest ?? null });
});

router.post('/agent-requests/resume', async (_, response) => {
  const state = await loadStateWithClaimRecovery();
  const agentRequest = findReadyAgentRequest(state);

  if (!agentRequest) {
    response.status(409).json({ error: '再開できる待機中のAI作業がありません', state });
    return;
  }

  startDryRunRunner();
  response.json({ request: agentRequest, state });
});

router.post('/agent-requests/:id/claim', requireAgentApiToken, async (request, response) => {
  const state = await loadStateWithClaimRecovery();
  const agentRequest = findById(state.agentRequests, routeParamText(request.params.id));

  if (!agentRequest) {
    response.status(404).json({ error: 'AI操作が見つかりません' });
    return;
  }

  const input = readAgentClaimInput(request.body);
  if (!input.ownerId) {
    response.status(400).json({ error: 'AIエージェント取得者が必要です', state });
    return;
  }

  if (input.expiresAt && !isValidIsoDateText(input.expiresAt)) {
    response.status(400).json({ error: '取得期限はISO日時で指定してください', state });
    return;
  }

  if (!isStatusIn(agentRequest.status, ['queued', 'waiting'])) {
    response.status(409).json({ error: 'このAI操作は取得できません', state });
    return;
  }

  const previousStatus = agentRequest.status;
  const dependency = findAgentRequestDependency(state, agentRequest);
  if (dependency && dependency.status !== 'succeeded') {
    agentRequest.status = 'waiting';
    agentRequest.errorMessage = '前工程の完了待ちです';
    agentRequest.updatedAt = nowIso();
    await saveState(state);
    response.status(409).json({ error: agentRequest.errorMessage, state });
    return;
  }

  if (!isAgentRequestReady(state, agentRequest)) {
    agentRequest.status = 'waiting';
    agentRequest.errorMessage = '人間確認が承認されていないため、このAI作業は開始できません';
    agentRequest.updatedAt = nowIso();
    await saveState(state);
    response.status(409).json({ error: agentRequest.errorMessage, state });
    return;
  }

  agentRequest.status = 'running';
  delete agentRequest.errorMessage;
  delete agentRequest.claimExpiredAt;
  agentRequest.claimOwnerId = input.ownerId;
  agentRequest.claimedAt = nowIso();
  agentRequest.claimUpdatedAt = agentRequest.claimedAt;
  if (input.expiresAt) {
    agentRequest.claimExpiresAt = input.expiresAt;
  } else {
    delete agentRequest.claimExpiresAt;
  }
  agentRequest.updatedAt = agentRequest.claimedAt;
  appendAgentRequestOperationLog(
    state,
    agentRequest,
    'agent_request_claimed',
    `${agentRequest.label}をAIエージェントが取得した`,
    {
      actor: 'agent',
      fromStatus: previousStatus,
      toStatus: agentRequest.status,
      ownerId: agentRequest.claimOwnerId,
      createdAt: agentRequest.claimedAt
    }
  );
  await saveState(state);
  response.json({ request: agentRequest, state });
});

router.post('/agent-requests/:id/complete', requireAgentApiToken, async (request, response) => {
  const state = await loadStateWithClaimRecovery();
  const agentRequest = findById(state.agentRequests, routeParamText(request.params.id));

  if (!agentRequest) {
    response.status(404).json({ error: 'AI操作が見つかりません' });
    return;
  }

  if (isStatusIn(agentRequest.status, ['cancelled', 'superseded'])) {
    response.json({ request: agentRequest, state });
    return;
  }

  if (agentRequest.status !== 'running') {
    response.status(409).json({ error: '取得中のAI操作だけ完了できます', state });
    return;
  }

  const input = request.body && typeof request.body === 'object'
    ? (request.body as Partial<AgentCompletionInput>)
    : {};
  const ownerError = ensureClaimOwnerMatches(agentRequest, trimText(input.ownerId));
  if (ownerError) {
    response.status(409).json({ error: ownerError, state });
    return;
  }

  if (input.fileRef && (!input.fileRef.uri?.trim() || !input.fileRef.mimeType?.trim())) {
    response.status(400).json({ error: '成果物参照にはURIとMIME typeが必要です' });
    return;
  }
  if (!input.fileRef) {
    response.status(400).json({ error: 'AI操作の完了には成果物参照が必要です', state });
    return;
  }
  const completionInput = input as AgentCompletionInput;
  const fileRefValidation = await validateCompletionFileRef(agentRequest, completionInput.fileRef);
  if ('error' in fileRefValidation) {
    response.status(400).json({ error: fileRefValidation.error, state });
    return;
  }

  const reviewKind = getRequiredControlReviewKind(agentRequest);
  if (reviewKind) {
    const errors = validateAgentDecision(completionInput.decision);
    if (errors.length > 0) {
      response.status(400).json({ errors });
      return;
    }
  }

  agentRequest.claimUpdatedAt = nowIso();
  const { fileRef, output } = completeAgentRequest(agentRequest, completionInput, fileRefValidation.metadata);
  if (fileRef) {
    state.fileRefs.push(fileRef);
  }

  if (output) {
    state.outputs.push(output);
  }

  if (reviewKind && completionInput.decision) {
    const { decisionLog, reviewItem } = createControlReview(
      agentRequest,
      reviewKind,
      completionInput.decision,
      fileRef,
      output
    );
    state.decisionLogs.push(decisionLog);
    state.controlReviewItems.push(reviewItem);
  }

  appendAgentRequestOperationLog(
    state,
    agentRequest,
    'agent_request_completed',
    `${agentRequest.label}の成果物参照を保存し、工程を完了した`,
    {
      actor: 'agent',
      fromStatus: 'running',
      toStatus: agentRequest.status,
      ownerId: completionInput.ownerId,
      ...(fileRef ? { fileRefId: fileRef.id } : {}),
      ...(output ? { outputId: output.id } : {}),
      createdAt: agentRequest.updatedAt
    }
  );
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

router.post('/request-drafts/:id/cancel-agent-work', async (request, response) => {
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);

  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }

  const updatedAt = nowIso();
  const cancelledRequests = cancelActiveAgentRequests(state.agentRequests, draft.id, updatedAt);
  const rejectedControlReviews = rejectOpenControlReviewsForCancel(state, draft.id, updatedAt);
  await saveState(state);

  response.json({
    draft,
    cancelledAgentRequests: cancelledRequests,
    rejectedControlReviews,
    state
  });
});

router.post('/request-drafts/:id/web-gemini-review/prepare', async (request, response) => {
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビュー準備を作れません', state });
    return;
  }
  const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
  if (outputVideoError) {
    response.status(409).json({ error: outputVideoError, state });
    return;
  }
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }

  try {
    const createdAt = nowIso();
    const promptText = buildWebGeminiReviewPrompt(draft);
    const runLog = await prepareWebGeminiReviewRun(draft, outputVideo, createdAt);
    await removeWebGeminiReviewArtifact(draft.id);
    await removeWebGeminiRevisionBriefArtifact(draft.id);
    upsertWebGeminiReviewState(state, draft.id, {
      review: null,
      revisionBrief: null,
      runLog,
      promptText
    }, createdAt);
    await saveState(state);
    response.json({
      runLog,
      promptText,
      outputVideoUri: outputVideo.uri
    });
  } catch (error) {
    response.status(500).json({
      error: `Web Geminiレビュー準備を保存できません: ${unknownErrorMessage(error)}`,
      state
    });
  }
});

router.post('/request-drafts/:id/web-gemini-review/run-status', async (request, response) => {
  const update = parseWebGeminiRunStatusUpdateInput(request.body);
  if ('error' in update) {
    response.status(400).json({ error: update.error });
    return;
  }

  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビュー実行状態を更新できません', state });
    return;
  }
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }

  const entry = webGeminiReviewStateForDraft(state, draft.id);
  if (entry?.runLog?.status === 'applied') {
    response.status(409).json({
      error: 'このWeb Geminiレビューはすでに反映済みです。レビューを取り直す準備をしてから実行状態を更新してください',
      state
    });
    return;
  }
  if (entry?.review) {
    response.status(409).json({
      error: 'このWeb Geminiレビューは保存済みです。取り直す場合はレビュー準備を実行してから実行状態を更新してください',
      state
    });
    return;
  }

  const runLog = buildWebGeminiRunStatusRunLog({
    draftId: draft.id,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    update,
    createdAt: nowIso()
  });
  await writeWebGeminiReviewRunLog(runLog);
  upsertWebGeminiReviewState(state, draft.id, { runLog }, runLog.createdAt);
  await saveState(state);
  response.json({ runLog });
});

router.get('/request-drafts/:id/web-gemini-review', async (request, response) => {
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (outputVideo) {
    const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
    if (outputVideoError) {
      response.status(409).json({ error: outputVideoError, state });
      return;
    }
  }

  const entry = webGeminiReviewStateForDraft(state, draft.id);
  const review = entry?.review ?? null;
  const revisionBrief = entry?.revisionBrief ?? null;
  const runLog = entry?.runLog ?? null;
  const reviewMismatch = ensureWebGeminiReviewMatchesOutputVideo(review, outputVideo);
  if (reviewMismatch) {
    response.status(409).json({ error: reviewMismatch.error, state });
    return;
  }
  const revisionBriefMismatch = ensureWebGeminiRevisionBriefMatchesReview(revisionBrief, review, outputVideo);
  if (revisionBriefMismatch) {
    response.status(409).json({ error: revisionBriefMismatch.error, state });
    return;
  }
  const runLogMismatch = ensureWebGeminiRunLogMatchesOutputVideo(runLog, outputVideo);
  if (runLogMismatch) {
    response.status(409).json({ error: runLogMismatch.error, state });
    return;
  }

  response.json({
    review,
    revisionBrief,
    runLog,
    preparedPromptText: runLog ? entry?.promptText ?? '' : '',
    outputVideoUri: outputVideo?.uri ?? ''
  });
});

router.post('/request-drafts/:id/web-gemini-review', async (request, response) => {
  const reviewText = hasText(request.body?.reviewText) ? request.body.reviewText.trim() : '';
  const savedFrom = parseWebGeminiReviewSavedFrom(request.body?.savedFrom);
  if (typeof savedFrom !== 'string') {
    response.status(400).json({ error: savedFrom.error });
    return;
  }
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビューを保存できません', state });
    return;
  }
  const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
  if (outputVideoError) {
    response.status(409).json({ error: outputVideoError, state });
    return;
  }
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }

  if (!reviewText) {
    const errorMessage = 'Web Geminiの演出レビューが空です';
    const runLog = await writeWebGeminiReviewSaveFailureRunLog(draft, outputVideo, errorMessage, nowIso());
    upsertWebGeminiReviewState(state, draft.id, { runLog }, runLog.createdAt);
    await saveState(state);
    response.status(400).json({ error: errorMessage, runLog, state });
    return;
  }

  if (webGeminiReviewStateForDraft(state, draft.id)?.runLog?.status === 'applied') {
    response.status(409).json({
      error: 'このWeb Geminiレビューはすでに反映済みです。レビューを取り直す準備をしてから保存してください',
      state
    });
    return;
  }

  const instructionText = hasText(request.body?.instructionText)
    ? request.body.instructionText.trim()
    : reviewText;
  const promptText = hasText(request.body?.promptText) ? request.body.promptText.trim() : '';
  const review: WebGeminiReviewArtifact = {
    draftId: draft.id,
    source: 'edge-web-gemini',
    status: 'ready',
    createdAt: nowIso(),
    outputVideoUri: outputVideo.uri,
    promptText,
    reviewText,
    instructionText
  };

  await writeWebGeminiReviewArtifact(review);
  await removeWebGeminiRevisionBriefArtifact(draft.id);
  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'saved',
    createdAt: review.createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath: webGeminiReviewPromptPath(draft.id),
    blockedReasons: [],
    externalUploadRequired: savedFrom === 'edge',
    nextAction: webGeminiReviewSavedNextActionBySavedFrom[savedFrom],
    reviewPath: webGeminiReviewPath(draft.id),
    reviewCreatedAt: review.createdAt
  };
  await writeWebGeminiReviewRunLog(runLog);
  upsertWebGeminiReviewState(state, draft.id, {
    review,
    revisionBrief: null,
    runLog
  }, review.createdAt);
  await saveState(state);

  response.json({
    review,
    revisionBrief: null,
    runLog
  });
});

router.post('/request-drafts/:id/apply-web-gemini-review', async (request, response) => {
  const revisionBriefText = hasText(request.body?.revisionBriefText) ? request.body.revisionBriefText.trim() : '';
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }
  if (!latestSucceededAgentRequest(state.agentRequests, draft.id, 'render_video')) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビューから作り直せません', state });
    return;
  }

  const entry = webGeminiReviewStateForDraft(state, draft.id);
  const review = entry?.review ?? null;
  if (!review) {
    response.status(409).json({ error: 'Web Geminiの演出レビューがまだ保存されていません', state });
    return;
  }
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビューから作り直せません', state });
    return;
  }
  const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
  if (outputVideoError) {
    response.status(409).json({ error: outputVideoError, state });
    return;
  }
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }
  const reviewMismatch = ensureWebGeminiReviewMatchesOutputVideo(review, outputVideo);
  if (reviewMismatch) {
    response.status(409).json({ error: reviewMismatch.error, state });
    return;
  }
  const runLogMismatch = ensureWebGeminiRunLogMatchesOutputVideo(entry?.runLog ?? null, outputVideo);
  if (runLogMismatch) {
    response.status(409).json({ error: runLogMismatch.error, state });
    return;
  }
  if (entry?.runLog?.status === 'applied') {
    response.status(409).json({
      error: 'このWeb Geminiレビューはすでに反映済みです。もう一度反映する場合はレビューを取り直してください',
      state
    });
    return;
  }

  if (!revisionBriefText) {
    response.status(400).json({ error: '今回の再生成方針が空です', state });
    return;
  }

  const createdAt = nowIso();
  const revisionBrief: WebGeminiRevisionBriefArtifact = {
    draftId: draft.id,
    source: 'human-approved-web-gemini-review',
    status: 'ready',
    createdAt,
    outputVideoUri: outputVideo.uri,
    reviewCreatedAt: review.createdAt,
    briefText: revisionBriefText
  };
  const reason = webGeminiReviewRestartReason(review, revisionBrief);
  const restart = await createCopiedEditRestart(
    state,
    draft.id,
    restartStartTypeForGeneratedVideoChange('edit_plan'),
    reason,
    createdAt
  );
  if ('error' in restart) {
    response.status(409).json({ error: restart.error, state });
    return;
  }

  appendCopiedRestartToState(state, restart);
  await writeWebGeminiRevisionBriefArtifact(revisionBrief);
  const runLog = await writeWebGeminiReviewAppliedRunLog(
    draft,
    outputVideo,
    review,
    revisionBrief,
    restart.draft.id,
    createdAt
  );
  upsertWebGeminiReviewState(state, draft.id, { revisionBrief, runLog }, createdAt);
  await saveState(state);

  startDryRunRunner();

  response.json({
    draft: restart.draft,
    revisionBrief,
    runLog,
    state
  });
});

router.post('/request-drafts/:id/request-generated-video-changes', async (request, response) => {
  const reason = hasText(request.body?.reason) ? request.body.reason.trim() : '';
  if (!reason) {
    response.status(400).json({ error: '生成済み動画から直したい点を入力してください' });
    return;
  }
  const scope = generatedVideoChangeScopeFromInput(request.body?.scope);
  if (typeof scope !== 'string') {
    response.status(400).json({ error: scope.error });
    return;
  }

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
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }

  const createdAt = nowIso();
  const restart = await createCopiedEditRestart(
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
  const restart = await createCopiedRestartFromFailedRequest(state, request.params.id, createdAt);
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

router.post('/agent-requests/:id/fail', requireAgentApiToken, async (request, response) => {
  const state = await loadStateWithClaimRecovery();
  const agentRequest = findById(state.agentRequests, routeParamText(request.params.id));

  if (!agentRequest) {
    response.status(404).json({ error: 'AI操作が見つかりません' });
    return;
  }

  if (isStatusIn(agentRequest.status, ['cancelled', 'superseded'])) {
    response.json({ request: agentRequest, state });
    return;
  }

  const input = request.body && typeof request.body === 'object'
    ? (request.body as Partial<AgentFailureInput>)
    : {};
  if (!input.message?.trim()) {
    response.status(400).json({ error: '失敗理由が必要です' });
    return;
  }

  if (agentRequest.status !== 'running') {
    response.status(409).json({ error: '取得中のAI操作だけ失敗として記録できます', state });
    return;
  }

  const ownerError = ensureClaimOwnerMatches(agentRequest, trimText(input.ownerId));
  if (ownerError) {
    response.status(409).json({ error: ownerError, state });
    return;
  }

  agentRequest.status = 'failed';
  agentRequest.errorMessage = input.message.trim();
  agentRequest.claimUpdatedAt = nowIso();
  agentRequest.updatedAt = agentRequest.claimUpdatedAt;
  appendAgentRequestOperationLog(
    state,
    agentRequest,
    'agent_request_failed',
    `${agentRequest.label}が失敗として記録された`,
    {
      actor: 'agent',
      fromStatus: 'running',
      toStatus: agentRequest.status,
      ownerId: input.ownerId,
      errorMessage: agentRequest.errorMessage,
      createdAt: agentRequest.updatedAt
    }
  );
  await saveState(state);
  response.json({ request: agentRequest, state });
});

export default router;
