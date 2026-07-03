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
  applyHumanReviewAction,
  createControlReview,
  validateAgentDecision
} from '../domain/control-review.js';
import webGeminiReviewRouter, { validateWebGeminiOutputVideo } from '../web-gemini/routes.js';
import {
  ensureClaimOwnerMatches,
  isValidIsoDateText,
  loadStateWithClaimRecovery,
  readAgentClaimInput
} from '../domain/agent-lifecycle.js';
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

router.use(webGeminiReviewRouter);

function selectAgentRequests(stateAgentRequests: AgentRequest[], ids: Set<string>): AgentRequest[] {
  return stateAgentRequests.filter((request) => ids.has(request.id));
}

function routeParamText(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
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
