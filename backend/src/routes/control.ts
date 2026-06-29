import express from 'express';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
  lastMatching,
  latestByCreatedAt,
  recordValue,
  validateRequestDraftInput,
  type RequestDraftInput
} from '@zev2/shared';
import { loadState, saveState } from '../store/json-store.js';
import { startDryRunRunner } from '../runner/auto-runner.js';
import { loadRuntimeConfig } from '../config/runtime-config.js';
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
type GeneratedVideoChangeScope = 'theme_selection' | 'edit_plan' | 'adjustment';
const reviewChangeScopes: ReviewChangeScope[] = [
  'edit_plan',
  'theme_reselect',
  'theme_options_regenerate',
  'material_reselect',
  'adjustment'
];
const generatedVideoChangeScopes: GeneratedVideoChangeScope[] = ['theme_selection', 'edit_plan', 'adjustment'];
const finalReviewActionTypes: FinalReviewActionType[] = ['publish_ready', 'final_complete'];
type LoadedState = Awaited<ReturnType<typeof loadState>>;
type WebGeminiReviewArtifact = {
  draftId: string;
  source: 'edge-web-gemini';
  status: 'ready';
  createdAt: string;
  outputVideoUri: string;
  promptText: string;
  reviewText: string;
  instructionText: string;
};
type WebGeminiReviewRunLog = {
  draftId: string;
  status: 'prepared' | 'blocked' | 'running' | 'saved' | 'failed' | 'applied';
  createdAt: string;
  outputVideoUri: string;
  outputVideoPath: string;
  promptPath: string;
  blockedReasons: string[];
  externalUploadRequired: boolean;
  nextAction?: string;
  reviewPath?: string;
  reviewCreatedAt?: string;
  appliedDraftId?: string;
  appliedAt?: string;
  externalReviewCommand?: string;
  edgeControl?: unknown;
  cdpControl?: unknown;
};
type CopiedEditRestart = {
  draft: RequestDraft;
  requests: AgentRequest[];
  queuedRequests: AgentRequest[];
  fileRefs: FileRef[];
  outputs: OutputEntity[];
  decisionLogs: DecisionLog[];
  controlReviewItems: ControlReviewItem[];
  humanReviewActions: HumanReviewAction[];
};
type ArtifactFileMetadata = {
  artifactFileName: string;
  byteSize: number;
  sha256: string;
};
type RequestDraftActivityEvent = {
  id: string;
  kind:
    | 'draft_created'
    | 'draft_status'
    | 'agent_request_created'
    | 'agent_request_status'
    | 'agent_operation_log'
    | 'agent_decision'
    | 'human_review_required'
    | 'human_review_action'
    | 'final_review_action'
    | 'web_gemini_review_status';
  occurredAt: string;
  actor: 'user' | 'agent' | 'runner' | 'backend' | 'system';
  title: string;
  detail: string;
  requestDraftId: string;
  agentRequestId?: string;
  reviewItemId?: string;
  decisionLogId?: string;
  humanReviewActionId?: string;
  finalReviewActionId?: string;
  fileRefId?: string;
  outputId?: string;
};
type RequestDraftActivitySearchResult = RequestDraftActivityEvent & {
  draftPurpose: string;
  draftStatus: RequestDraft['status'];
};
type RequestDraftActivitySummary = {
  status:
    | 'draft'
    | 'rejected'
    | 'failed'
    | 'review_required'
    | 'running'
    | 'waiting'
    | 'cancelled'
    | 'completed'
    | 'approved';
  title: string;
  detail: string;
  nextAction: string;
  requestDraftId: string;
  agentRequestId?: string;
  reviewItemId?: string;
  outputVideoUri?: string;
};

const runtimeDir = process.env.ZEV2_RUNTIME_DIR
  ? path.resolve(process.env.ZEV2_RUNTIME_DIR)
  : path.resolve(process.cwd(), '../runtime');
const artifactUrlPrefix = '/api/artifacts/';
const webGeminiReviewFileName = 'web-gemini-review.json';
const webGeminiReviewRunLogFileName = 'web-gemini-review-run.json';
const webGeminiReviewPromptFileName = 'web-gemini-review-prompt.md';

function nowIso(): string {
  return new Date().toISOString();
}

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

function createId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

function selectAgentRequests(stateAgentRequests: AgentRequest[], ids: Set<string>): AgentRequest[] {
  return stateAgentRequests.filter((request) => ids.has(request.id));
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function routeParamText(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function appendAgentOperationLog(
  state: LoadedState,
  input: Omit<AgentOperationLog, 'id' | 'detail' | 'createdAt'> & {
    detail: unknown;
    createdAt?: string;
  }
): AgentOperationLog {
  const log: AgentOperationLog = {
    ...input,
    id: createId('agent_log'),
    detail: compactActivityText(input.detail, 'AI操作の状態を記録しました'),
    createdAt: input.createdAt ?? nowIso()
  };
  state.agentOperationLogs.push(log);
  return log;
}

function appendAgentRequestOperationLog(
  state: LoadedState,
  request: AgentRequest,
  eventType: AgentOperationLogEventType,
  detail: unknown,
  input: Omit<AgentOperationLog, 'id' | 'eventType' | 'requestDraftId' | 'agentRequestId' | 'stepType' | 'detail' | 'createdAt'> & {
    createdAt?: string;
  }
): AgentOperationLog {
  return appendAgentOperationLog(state, {
    ...input,
    eventType,
    requestDraftId: request.requestDraftId,
    agentRequestId: request.id,
    stepType: request.type,
    detail
  });
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

function workflowStepIndex(type: AgentRequest['type']): number {
  const index = WORKFLOW_STEPS.findIndex((step) => step.type === type);
  if (index < 0) {
    throw new Error(`未知の工程です: ${type}`);
  }

  return index;
}

function artifactRoot(): string {
  return path.join(runtimeDir, 'artifacts');
}

function artifactPathByUrl(uri: string): string {
  if (!uri.startsWith(artifactUrlPrefix)) {
    throw new Error(`成果物URIを読めません: ${uri}`);
  }

  const relativePath = uri.slice(artifactUrlPrefix.length).split('/').map(decodeURIComponent).join(path.sep);
  const root = path.resolve(artifactRoot());
  const artifactPath = path.resolve(root, relativePath);
  if (!artifactPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`成果物URIの保存先が不正です: ${uri}`);
  }

  return artifactPath;
}

function artifactUrl(requestDraftId: string, fileName: string): string {
  return `${artifactUrlPrefix}${encodeURIComponent(requestDraftId)}/${encodeURIComponent(fileName)}`;
}

async function hashFileSha256(artifactPath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(artifactPath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

async function readArtifactFileMetadata(artifactPath: string): Promise<ArtifactFileMetadata> {
  const fileStatus = await stat(artifactPath);
  return {
    artifactFileName: path.basename(artifactPath),
    byteSize: fileStatus.size,
    sha256: await hashFileSha256(artifactPath)
  };
}

function normalizedMimeType(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
}

function isJsonMimeType(mimeType: string): boolean {
  const normalized = normalizedMimeType(mimeType);
  return normalized === 'application/json' || normalized.endsWith('+json');
}

function isVideoMimeType(mimeType: string): boolean {
  return normalizedMimeType(mimeType).startsWith('video/');
}

async function readJsonArtifactKind(artifactPath: string): Promise<string | undefined> {
  const raw = await readFile(artifactPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) {
    return undefined;
  }

  const kind = (parsed as { kind?: unknown }).kind;
  return typeof kind === 'string' ? kind : undefined;
}

async function isMp4File(artifactPath: string): Promise<boolean> {
  const handle = await open(artifactPath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return bytesRead >= 8 && header.subarray(4, 8).toString('ascii') === 'ftyp';
  } finally {
    await handle.close();
  }
}

async function validateMp4Artifact(artifactPath: string): Promise<string | undefined> {
  try {
    const isMp4 = await isMp4File(artifactPath);
    return isMp4 ? undefined : '動画成果物はMP4ファイルを指定してください';
  } catch {
    return '動画成果物を読めません';
  }
}

async function validateCompletionFileRef(
  agentRequest: AgentRequest,
  fileRef: AgentCompletionInput['fileRef']
): Promise<{ artifactPath: string; metadata: ArtifactFileMetadata } | { error: string }> {
  if (!fileRef) {
    return { error: 'AI操作の完了には成果物参照が必要です' };
  }

  const uri = fileRef.uri.trim();
  const mimeType = fileRef.mimeType.trim();
  const expectedKind = getFileRefKindForRequest(agentRequest.type);
  const validation = await validateArtifactFileRefForKind(agentRequest.requestDraftId, expectedKind, uri, mimeType);
  if ('error' in validation) {
    return validation;
  }

  try {
    return {
      artifactPath: validation.artifactPath,
      metadata: await readArtifactFileMetadata(validation.artifactPath)
    };
  } catch {
    return { error: '成果物参照のファイル情報を読めません' };
  }
}

async function validateArtifactFileRefForKind(
  requestDraftId: string,
  expectedKind: FileRef['kind'],
  uri: string,
  mimeType: string
): Promise<{ artifactPath: string } | { error: string }> {
  const normalizedUri = uri.trim();
  const normalizedMimeTypeValue = mimeType.trim();
  const expectedPrefix = `${artifactUrlPrefix}${encodeURIComponent(requestDraftId)}/`;
  if (!normalizedUri.startsWith(expectedPrefix)) {
    return { error: '成果物参照は対象の編集コピー配下に保存してください' };
  }

  let artifactPath = '';
  try {
    artifactPath = artifactPathByUrl(normalizedUri);
  } catch {
    return { error: '成果物参照のURIが不正です' };
  }

  try {
    await access(artifactPath);
  } catch {
    return { error: '成果物参照のファイルが見つかりません' };
  }

  if (expectedKind === 'output_video') {
    if (!isVideoMimeType(normalizedMimeTypeValue)) {
      return { error: '動画生成工程の成果物参照は動画ファイルを指定してください' };
    }

    const videoError = await validateMp4Artifact(artifactPath);
    return videoError ? { error: videoError } : { artifactPath };
  }

  if (expectedKind === 'source_video' && isVideoMimeType(normalizedMimeTypeValue)) {
    const videoError = await validateMp4Artifact(artifactPath);
    return videoError ? { error: videoError } : { artifactPath };
  }

  if (!isJsonMimeType(normalizedMimeTypeValue)) {
    return { error: 'このAI工程の成果物参照はJSONファイルを指定してください' };
  }

  try {
    const actualKind = await readJsonArtifactKind(artifactPath);
    if (actualKind !== expectedKind) {
      return { error: '成果物参照の種別がAI工程と一致していません' };
    }
  } catch {
    return { error: '成果物参照のJSONを読めません' };
  }

  return { artifactPath };
}

function restartArtifactFileName(sourceFileRef: FileRef, sourceArtifactPath: string): string {
  if (!isVideoMimeType(sourceFileRef.mimeType)) {
    return ARTIFACT_FILE_NAME_BY_KIND[sourceFileRef.kind];
  }

  const sourceFileName = path.basename(sourceArtifactPath);
  if (sourceFileName.toLowerCase().endsWith('.mp4')) {
    return sourceFileName;
  }

  return sourceFileRef.kind === 'source_video'
    ? 'source-video.mp4'
    : ARTIFACT_FILE_NAME_BY_KIND.output_video;
}

function unknownErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compactActivityText(value: unknown, fallback: string): string {
  const text = typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';
  const normalized = text || fallback;
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function webGeminiReviewPath(requestDraftId: string): string {
  return path.join(artifactRoot(), requestDraftId, webGeminiReviewFileName);
}

function webGeminiReviewRunLogPath(requestDraftId: string): string {
  return path.join(artifactRoot(), requestDraftId, webGeminiReviewRunLogFileName);
}

function webGeminiReviewPromptPath(requestDraftId: string): string {
  return path.join(artifactRoot(), requestDraftId, webGeminiReviewPromptFileName);
}

function isNotFoundError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}

function parseWebGeminiReviewArtifact(value: unknown): WebGeminiReviewArtifact | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const artifact = value as Partial<WebGeminiReviewArtifact>;
  if (
    artifact.source !== 'edge-web-gemini' ||
    artifact.status !== 'ready' ||
    !hasText(artifact.draftId) ||
    !hasText(artifact.createdAt) ||
    !hasText(artifact.outputVideoUri) ||
    !hasText(artifact.reviewText) ||
    !hasText(artifact.instructionText)
  ) {
    return undefined;
  }

  return {
    draftId: artifact.draftId.trim(),
    source: 'edge-web-gemini',
    status: 'ready',
    createdAt: artifact.createdAt.trim(),
    outputVideoUri: artifact.outputVideoUri.trim(),
    promptText: hasText(artifact.promptText) ? artifact.promptText.trim() : '',
    reviewText: artifact.reviewText.trim(),
    instructionText: artifact.instructionText.trim()
  };
}

function parseWebGeminiReviewRunLog(value: unknown): WebGeminiReviewRunLog | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const log = value as Partial<WebGeminiReviewRunLog>;
  const allowedStatuses: WebGeminiReviewRunLog['status'][] = [
    'prepared',
    'blocked',
    'running',
    'saved',
    'failed',
    'applied'
  ];
  if (
    !hasText(log.draftId) ||
    !hasText(log.createdAt) ||
    !hasText(log.outputVideoUri) ||
    !hasText(log.outputVideoPath) ||
    !hasText(log.promptPath) ||
    !allowedStatuses.includes(log.status as WebGeminiReviewRunLog['status'])
  ) {
    return undefined;
  }

  return {
    draftId: log.draftId.trim(),
    status: log.status as WebGeminiReviewRunLog['status'],
    createdAt: log.createdAt.trim(),
    outputVideoUri: log.outputVideoUri.trim(),
    outputVideoPath: log.outputVideoPath.trim(),
    promptPath: log.promptPath.trim(),
    blockedReasons: Array.isArray(log.blockedReasons)
      ? log.blockedReasons.filter(hasText).map((reason) => reason.trim())
      : [],
    externalUploadRequired: Boolean(log.externalUploadRequired),
    ...(hasText(log.nextAction) ? { nextAction: log.nextAction.trim() } : {}),
    ...(hasText(log.reviewPath) ? { reviewPath: log.reviewPath.trim() } : {}),
    ...(hasText(log.reviewCreatedAt) ? { reviewCreatedAt: log.reviewCreatedAt.trim() } : {}),
    ...(hasText(log.appliedDraftId) ? { appliedDraftId: log.appliedDraftId.trim() } : {}),
    ...(hasText(log.appliedAt) ? { appliedAt: log.appliedAt.trim() } : {}),
    ...(hasText(log.externalReviewCommand) ? { externalReviewCommand: log.externalReviewCommand.trim() } : {}),
    ...(log.edgeControl ? { edgeControl: log.edgeControl } : {}),
    ...(log.cdpControl ? { cdpControl: log.cdpControl } : {})
  };
}

async function readWebGeminiReviewArtifact(
  requestDraftId: string
): Promise<{ review: WebGeminiReviewArtifact | null } | { error: string }> {
  try {
    const raw = await readFile(webGeminiReviewPath(requestDraftId), 'utf8');
    const parsed = parseWebGeminiReviewArtifact(JSON.parse(raw));
    if (!parsed || parsed.draftId !== requestDraftId) {
      return { error: 'Web Geminiレビューの保存内容が壊れています' };
    }

    return { review: parsed };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { review: null };
    }

    return { error: `Web Geminiレビューを読めません: ${unknownErrorMessage(error)}` };
  }
}

async function readWebGeminiReviewRunLog(
  requestDraftId: string
): Promise<{ runLog: WebGeminiReviewRunLog | null } | { error: string }> {
  try {
    const raw = await readFile(webGeminiReviewRunLogPath(requestDraftId), 'utf8');
    const parsed = parseWebGeminiReviewRunLog(JSON.parse(raw));
    if (!parsed || parsed.draftId !== requestDraftId) {
      return { error: 'Web Geminiレビュー実行ログの保存内容が壊れています' };
    }

    return { runLog: parsed };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { runLog: null };
    }

    return { error: `Web Geminiレビュー実行ログを読めません: ${unknownErrorMessage(error)}` };
  }
}

async function readWebGeminiReviewPromptText(
  requestDraftId: string
): Promise<{ promptText: string } | { error: string }> {
  try {
    return { promptText: (await readFile(webGeminiReviewPromptPath(requestDraftId), 'utf8')).trim() };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { promptText: '' };
    }

    return { error: `Web Geminiレビュー依頼文を読めません: ${unknownErrorMessage(error)}` };
  }
}

async function writeWebGeminiReviewArtifact(artifact: WebGeminiReviewArtifact): Promise<void> {
  await mkdir(path.dirname(webGeminiReviewPath(artifact.draftId)), { recursive: true });
  await writeFile(webGeminiReviewPath(artifact.draftId), `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

async function removeWebGeminiReviewArtifact(requestDraftId: string): Promise<void> {
  await rm(webGeminiReviewPath(requestDraftId), { force: true });
}

async function writeWebGeminiReviewRunLog(runLog: WebGeminiReviewRunLog): Promise<void> {
  await mkdir(path.dirname(webGeminiReviewRunLogPath(runLog.draftId)), { recursive: true });
  await writeFile(webGeminiReviewRunLogPath(runLog.draftId), `${JSON.stringify(runLog, null, 2)}\n`, 'utf8');
}

function buildWebGeminiReviewPrompt(draft: RequestDraft): string {
  return buildWebGeminiReviewPromptText(draft.purpose);
}

function webGeminiReviewRestartReason(
  review: WebGeminiReviewArtifact,
  instructionText: string
): string {
  return [
    'Web Geminiの演出レビューを反映して、演出作成前から作り直す',
    `レビュー対象動画: ${review.outputVideoUri}`,
    `レビュー保存日時: ${review.createdAt}`,
    '',
    '演出作成へ渡す改善指示:',
    instructionText
  ].join('\n');
}

async function prepareWebGeminiReviewRun(
  draft: RequestDraft,
  outputVideo: FileRef,
  createdAt: string
): Promise<WebGeminiReviewRunLog> {
  const promptPath = webGeminiReviewPromptPath(draft.id);
  const promptText = buildWebGeminiReviewPrompt(draft);
  await mkdir(path.dirname(promptPath), { recursive: true });
  await writeFile(promptPath, `${promptText}\n`, 'utf8');

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
    nextAction: 'Web Geminiレビューを反映して、新しい編集コピーを作成しました。',
    reviewPath: webGeminiReviewPath(draft.id),
    reviewCreatedAt: review.createdAt,
    appliedDraftId,
    appliedAt: createdAt
  };
  await writeWebGeminiReviewRunLog(runLog);
  return runLog;
}

async function copyArtifactFileForRestart(
  sourceFileRef: FileRef,
  sourceRequest: AgentRequest,
  requestDraftId: string
): Promise<({ uri: string } & ArtifactFileMetadata) | { error: string }> {
  const expectedKind = getFileRefKindForRequest(sourceRequest.type);
  if (sourceFileRef.kind !== expectedKind) {
    return { error: `${sourceRequest.label}の成果物種別が工程と一致しないため、編集コピーに引き継げません` };
  }

  const validation = await validateArtifactFileRefForKind(
    sourceRequest.requestDraftId,
    expectedKind,
    sourceFileRef.uri,
    sourceFileRef.mimeType
  );
  if ('error' in validation) {
    return { error: `${sourceRequest.label}の成果物参照をコピー前に確認できません: ${validation.error}` };
  }

  const fileName = restartArtifactFileName(sourceFileRef, validation.artifactPath);
  const destinationDirectory = path.join(artifactRoot(), requestDraftId);
  const destinationPath = path.join(destinationDirectory, fileName);

  try {
    await mkdir(destinationDirectory, { recursive: true });
    await copyFile(validation.artifactPath, destinationPath);
  } catch (error) {
    return {
      error: `${sourceFileRef.kind}の成果物ファイルをコピーできません: ${unknownErrorMessage(error)}`
    };
  }

  try {
    return {
      uri: artifactUrl(requestDraftId, fileName),
      ...await readArtifactFileMetadata(destinationPath)
    };
  } catch (error) {
    return {
      error: `${sourceFileRef.kind}のコピー後ファイル情報を確認できません: ${unknownErrorMessage(error)}`
    };
  }
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

function latestOutputVideoFileRef(state: LoadedState, requestDraftId: string): FileRef | undefined {
  const renderRequest = latestSucceededAgentRequest(state.agentRequests, requestDraftId, 'render_video');
  return renderRequest ? fileRefForAgentRequest(state, renderRequest) : undefined;
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

function currentAgentRequestsForDraft(state: LoadedState, requestDraftId: string): AgentRequest[] {
  return state.agentRequests
    .filter((request) => request.requestDraftId === requestDraftId && request.status !== 'superseded')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function latestOpenControlReview(state: LoadedState, requestDraftId: string): ControlReviewItem | undefined {
  return state.controlReviewItems
    .filter((item) => item.requestDraftId === requestDraftId && item.status === 'review_required')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

function buildRequestDraftActivitySummary(
  state: LoadedState,
  draft: RequestDraft
): RequestDraftActivitySummary {
  if (draft.status === 'draft') {
    return {
      status: 'draft',
      title: '作成開始前',
      detail: '実行前下書きはまだ開始されていません',
      nextAction: '依頼内容を確認して動画作成を開始します',
      requestDraftId: draft.id
    };
  }

  if (draft.status === 'rejected') {
    return {
      status: 'rejected',
      title: '下書きを却下済み',
      detail: 'この下書きではAI作業を進めません',
      nextAction: '別の依頼を作成します',
      requestDraftId: draft.id
    };
  }

  const requests = currentAgentRequestsForDraft(state, draft.id);
  const failedRequest = requests.find((request) => request.status === 'failed');
  if (failedRequest) {
    return {
      status: 'failed',
      title: `${failedRequest.label}で停止`,
      detail: compactActivityText(failedRequest.errorMessage, '停止した工程を確認してください'),
      nextAction: '停止理由を確認して、再実行するか作り直します',
      requestDraftId: draft.id,
      agentRequestId: failedRequest.id
    };
  }

  const reviewItem = latestOpenControlReview(state, draft.id);
  if (reviewItem) {
    return {
      status: 'review_required',
      title: `${reviewItem.title}で確認が必要`,
      detail: compactActivityText(reviewItem.humanQuestion || reviewItem.summary, '人間の確認が必要です'),
      nextAction: '内容を確認して、承認または作り直しを選びます',
      requestDraftId: draft.id,
      agentRequestId: reviewItem.agentRequestId,
      reviewItemId: reviewItem.id
    };
  }

  const runningRequest = requests.find((request) => request.status === 'running');
  if (runningRequest) {
    return {
      status: 'running',
      title: `${runningRequest.label}を実行中`,
      detail: runningRequest.claimOwnerId
        ? `AIエージェントが工程を処理しています。取得者: ${runningRequest.claimOwnerId}`
        : 'AIエージェントが工程を処理しています',
      nextAction: '完了まで待つか、必要なら作業を中止します',
      requestDraftId: draft.id,
      agentRequestId: runningRequest.id
    };
  }

  const waitingRequest = requests.find((request) => request.status === 'queued' || request.status === 'waiting');
  if (waitingRequest) {
    return {
      status: 'waiting',
      title: `${waitingRequest.label}を待機中`,
      detail: waitingRequest.status === 'waiting'
        ? compactActivityText(waitingRequest.errorMessage, '前工程の完了を待っています')
        : compactActivityText(waitingRequest.errorMessage, 'AIエージェントの実行待ちです'),
      nextAction: '止まっている場合はAI作業を再開します',
      requestDraftId: draft.id,
      agentRequestId: waitingRequest.id
    };
  }

  const cancelledRequest = [...requests].reverse().find((request) => request.status === 'cancelled');
  if (cancelledRequest) {
    return {
      status: 'cancelled',
      title: `${cancelledRequest.label}で中止`,
      detail: compactActivityText(cancelledRequest.errorMessage, 'AI作業を中止しました'),
      nextAction: '再開する場合は、作り直しで新しい編集コピーを作ります',
      requestDraftId: draft.id,
      agentRequestId: cancelledRequest.id
    };
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (outputVideo) {
    return {
      status: 'completed',
      title: '動画生成完了',
      detail: '確認用動画を再生できます',
      nextAction: '動画を確認して、必要ならWeb Geminiレビューまたは作り直しを選びます',
      requestDraftId: draft.id,
      outputVideoUri: outputVideo.uri
    };
  }

  return {
    status: 'approved',
    title: 'AI作業を開始できます',
    detail: requests.length > 0 ? '工程キューは作成済みです' : '工程キューはまだ作成されていません',
    nextAction: 'AI作業を開始します',
    requestDraftId: draft.id
  };
}

function agentRequestStatusTitle(request: AgentRequest): string {
  if (request.status === 'queued') {
    return `${request.label}をキューに追加`;
  }

  if (request.status === 'waiting') {
    return `${request.label}は前工程待ち`;
  }

  if (request.status === 'running') {
    return `${request.label}を実行中`;
  }

  if (request.status === 'succeeded') {
    return `${request.label}が完了`;
  }

  if (request.status === 'failed') {
    return `${request.label}で停止`;
  }

  if (request.status === 'cancelled') {
    return `${request.label}を中止`;
  }

  return `${request.label}を作り直しで置換`;
}

function agentRequestStatusDetail(request: AgentRequest): string {
  if (request.status === 'failed') {
    return compactActivityText(request.errorMessage, '失敗理由を確認してください');
  }

  if (request.status === 'waiting') {
    return compactActivityText(request.errorMessage, '前工程の完了を待っています');
  }

  if (request.status === 'succeeded') {
    return compactActivityText(request.result?.meaning, 'AIエージェントが工程完了を報告しました');
  }

  if (request.status === 'cancelled') {
    return '人間の操作または作り直しにより中止しました';
  }

  if (request.status === 'superseded') {
    return '新しい編集コピーで作り直すため、この工程は使いません';
  }

  if (request.status === 'running') {
    return request.claimOwnerId
      ? `AIエージェントがこの工程を取得しました。取得者: ${request.claimOwnerId}`
      : 'AIエージェントがこの工程を取得しました';
  }

  return compactActivityText(request.errorMessage, 'AIエージェントが実行する工程として登録しました');
}

function agentOperationLogTitle(log: AgentOperationLog): string {
  if (log.eventType === 'draft_created') {
    return '実行前下書き保存を記録';
  }

  if (log.eventType === 'draft_approved') {
    return '依頼承認を記録';
  }

  if (log.eventType === 'draft_rejected') {
    return '依頼却下を記録';
  }

  if (log.eventType === 'agent_request_created') {
    return 'AI作業作成を記録';
  }

  if (log.eventType === 'agent_request_next_returned') {
    return '次のAI作業返却を記録';
  }

  if (log.eventType === 'agent_request_claimed') {
    return 'AI作業取得を記録';
  }

  if (log.eventType === 'agent_request_completed') {
    return 'AI作業完了を記録';
  }

  if (log.eventType === 'agent_request_failed') {
    return 'AI作業失敗を記録';
  }

  return 'AI作業復旧を記録';
}

function agentOperationLogDetail(log: AgentOperationLog): string {
  const parts = [log.detail];
  if (log.ownerId) {
    parts.push(`取得者: ${log.ownerId}`);
  }
  if (log.errorMessage) {
    parts.push(`理由: ${log.errorMessage}`);
  }
  if (log.fileRefId) {
    parts.push(`成果物参照: ${log.fileRefId}`);
  }

  return compactActivityText(parts.join(' / '), 'AI操作の監査イベントを記録しました');
}

function draftStatusTitle(status: RequestDraft['status']): string {
  if (status === 'approved') {
    return 'AIエージェントへ承認';
  }

  if (status === 'rejected') {
    return '実行前下書きを却下';
  }

  return '実行前下書きは未承認';
}

function humanReviewActionTitle(action: HumanReviewActionType): string {
  return `人間が${reviewActionLabel(action)}`;
}

function finalReviewActionTitle(action: FinalReviewActionType): string {
  if (action === 'publish_ready') {
    return '人間が投稿可能として確認';
  }

  return '人間が最終完了として確認';
}

function defaultFinalReviewReason(action: FinalReviewActionType): string {
  if (action === 'publish_ready') {
    return '完成動画を確認し、投稿可能な成果物として記録しました';
  }

  return '完成動画を確認し、この編集を最終完了として記録しました';
}

function latestFinalReviewActionForOutput(
  state: LoadedState,
  requestDraftId: string,
  outputVideo: FileRef | undefined
): FinalReviewAction | undefined {
  if (!outputVideo) {
    return undefined;
  }

  return latestByCreatedAt(state.finalReviewActions.filter(
    (action) => action.requestDraftId === requestDraftId && action.outputVideoUri === outputVideo.uri
  ));
}

function hasFinalReviewActionForOutput(
  state: LoadedState,
  requestDraftId: string,
  outputVideo: FileRef,
  actionType: FinalReviewActionType
): boolean {
  return state.finalReviewActions.some(
    (action) =>
      action.requestDraftId === requestDraftId &&
      action.outputVideoUri === outputVideo.uri &&
      action.action === actionType
  );
}

function finalCompletedOutputChangeError(
  state: LoadedState,
  requestDraftId: string,
  outputVideo: FileRef | undefined
): string | undefined {
  if (!outputVideo) {
    return undefined;
  }

  return hasFinalReviewActionForOutput(state, requestDraftId, outputVideo, 'final_complete')
    ? 'この完成動画は最終完了として記録済みです。変更する場合は新しい依頼として作成してください'
    : undefined;
}

function decisionTypeLabel(type: DecisionLogType): string {
  if (type === 'theme_selection') {
    return 'テーマ選択';
  }

  if (type === 'material_confirmation') {
    return '切り口と編集元場面';
  }

  return '動画生成前確認';
}

function proposedNextStateLabel(state: string): string {
  if (state === 'review_required') {
    return '人間確認待ち';
  }

  return state.trim() || '次の状態を確認してください';
}

function decisionActivityTitle(decision: DecisionLog): string {
  return `${decisionTypeLabel(decision.decisionType)}: ${decision.decision}`;
}

function decisionActivityDetail(decision: DecisionLog): string {
  const parts = [
    `理由: ${decision.reason}`,
    `次: ${proposedNextStateLabel(decision.proposedNextState)}`
  ];
  if (decision.humanQuestion) {
    parts.push(`確認: ${decision.humanQuestion}`);
  }
  if (decision.evidenceRefs.length > 0 || decision.artifactRefs.length > 0) {
    parts.push('根拠: 参照あり');
  }

  return compactActivityText(parts.join(' / '), 'AIエージェントが判断を記録しました');
}

function webGeminiReviewRunTitle(status: WebGeminiReviewRunLog['status']): string {
  if (status === 'prepared') {
    return 'Web Geminiレビュー準備が完了';
  }

  if (status === 'running') {
    return 'Web Geminiレビューを実行中';
  }

  if (status === 'saved') {
    return 'Web Geminiレビューを保存';
  }

  if (status === 'failed') {
    return 'Web Geminiレビュー実行に失敗';
  }

  if (status === 'blocked') {
    return 'Web Geminiレビュー実行を停止';
  }

  return 'Web Geminiレビューを再作成へ反映';
}

function webGeminiReviewRunDetail(runLog: WebGeminiReviewRunLog): string {
  if (runLog.status === 'failed' || runLog.status === 'blocked') {
    return compactActivityText(runLog.blockedReasons.join(' / ') || runLog.nextAction, '停止理由を確認してください');
  }

  if (runLog.status === 'saved') {
    return compactActivityText(runLog.nextAction, '外部レビュー結果を保存しました');
  }

  if (runLog.status === 'applied') {
    return compactActivityText(runLog.nextAction, 'レビューを反映して新しい編集コピーを作りました');
  }

  if (runLog.status === 'running') {
    return compactActivityText(runLog.nextAction, 'AIエージェントがEdgeで外部レビューを実行しています');
  }

  return compactActivityText(runLog.nextAction, 'レビュー対象動画と依頼文を確認済みです');
}

function webGeminiReviewOccurredAt(runLog: WebGeminiReviewRunLog): string {
  if (runLog.status === 'applied' && runLog.appliedAt) {
    return runLog.appliedAt;
  }

  if (runLog.status === 'saved' && runLog.reviewCreatedAt) {
    return runLog.reviewCreatedAt;
  }

  return runLog.createdAt;
}

function buildWebGeminiReviewActivity(
  draft: RequestDraft,
  runLog: WebGeminiReviewRunLog
): RequestDraftActivityEvent {
  return {
    id: `web-gemini-review:${draft.id}:${runLog.status}`,
    kind: 'web_gemini_review_status',
    occurredAt: webGeminiReviewOccurredAt(runLog),
    actor: runLog.status === 'prepared' ? 'backend' : 'agent',
    title: webGeminiReviewRunTitle(runLog.status),
    detail: webGeminiReviewRunDetail(runLog),
    requestDraftId: draft.id
  };
}

function buildWebGeminiReviewActivityError(
  draft: RequestDraft,
  error: string,
  title = 'Web Geminiレビュー実行ログを確認できません'
): RequestDraftActivityEvent {
  return {
    id: `web-gemini-review:${draft.id}:error`,
    kind: 'web_gemini_review_status',
    occurredAt: draft.updatedAt,
    actor: 'system',
    title,
    detail: compactActivityText(error, '実行ログの保存内容を確認してください'),
    requestDraftId: draft.id
  };
}

function buildWebGeminiReviewActivitySummary(
  baseSummary: RequestDraftActivitySummary,
  draft: RequestDraft,
  outputVideo: FileRef | undefined,
  reviewResult: { review: WebGeminiReviewArtifact | null } | { error: string },
  runLogResult: { runLog: WebGeminiReviewRunLog | null } | { error: string }
): RequestDraftActivitySummary {
  if (baseSummary.status !== 'completed') {
    return baseSummary;
  }

  const base = {
    requestDraftId: draft.id,
    ...(outputVideo ? { outputVideoUri: outputVideo.uri } : {})
  };

  if ('error' in reviewResult) {
    return {
      ...base,
      status: 'failed',
      title: 'Web Geminiレビュー本文を確認できません',
      detail: compactActivityText(reviewResult.error, 'レビュー本文の保存内容を確認してください'),
      nextAction: 'レビューを取り直すか、動画生成から作り直します'
    };
  }

  if ('error' in runLogResult) {
    return {
      ...base,
      status: 'failed',
      title: 'Web Geminiレビュー実行ログを確認できません',
      detail: compactActivityText(runLogResult.error, '実行ログの保存内容を確認してください'),
      nextAction: 'レビューを取り直すか、動画生成から作り直します'
    };
  }

  if (reviewResult.review) {
    const mismatch = ensureWebGeminiReviewMatchesOutputVideo(reviewResult.review, outputVideo);
    if (mismatch) {
      return {
        ...base,
        status: 'failed',
        title: 'Web Geminiレビュー本文を確認できません',
        detail: compactActivityText(mismatch.error, '現在の完成動画とレビュー本文の対応を確認してください'),
        nextAction: '現在の完成動画でレビューを取り直します'
      };
    }
  }

  if (runLogResult.runLog) {
    const mismatch = ensureWebGeminiRunLogMatchesOutputVideo(runLogResult.runLog, outputVideo);
    if (mismatch) {
      return {
        ...base,
        status: 'failed',
        title: 'Web Geminiレビュー実行ログを確認できません',
        detail: compactActivityText(mismatch.error, '現在の完成動画とレビュー実行ログの対応を確認してください'),
        nextAction: '現在の完成動画でレビューを取り直します'
      };
    }

    if (runLogResult.runLog.status === 'running') {
      return {
        ...base,
        status: 'running',
        title: 'Web Geminiレビューを実行中',
        detail: webGeminiReviewRunDetail(runLogResult.runLog),
        nextAction: 'レビュー取得が完了するまで待ちます'
      };
    }

    if (runLogResult.runLog.status === 'failed' || runLogResult.runLog.status === 'blocked') {
      return {
        ...base,
        status: 'failed',
        title: webGeminiReviewRunTitle(runLogResult.runLog.status),
        detail: webGeminiReviewRunDetail(runLogResult.runLog),
        nextAction: '停止理由を確認して、Web Geminiレビューを再実行します'
      };
    }

    if (runLogResult.runLog.status === 'prepared') {
      return {
        ...base,
        status: 'completed',
        title: 'Web Geminiレビュー準備済み',
        detail: webGeminiReviewRunDetail(runLogResult.runLog),
        nextAction: 'EdgeでWeb Geminiレビューを実行します'
      };
    }

    if (runLogResult.runLog.status === 'saved') {
      return {
        ...base,
        status: 'completed',
        title: 'Web Geminiレビュー保存済み',
        detail: webGeminiReviewRunDetail(runLogResult.runLog),
        nextAction: '改善指示を確認し、必要なら演出作成前から作り直します'
      };
    }

    return {
      ...base,
      status: 'completed',
      title: 'Web Geminiレビュー反映済み',
      detail: webGeminiReviewRunDetail(runLogResult.runLog),
      nextAction: '作成された編集コピーの演出作成を確認します'
    };
  }

  if (reviewResult.review) {
    return {
      ...base,
      status: 'failed',
      title: 'Web Geminiレビュー実行ログを確認できません',
      detail: 'Web Geminiレビュー本文はありますが、実行ログがありません',
      nextAction: 'レビューを取り直して、対象動画と実行結果をそろえます'
    };
  }

  return baseSummary;
}

function buildFinalReviewActivitySummary(
  baseSummary: RequestDraftActivitySummary,
  state: LoadedState,
  draft: RequestDraft,
  outputVideo: FileRef | undefined
): RequestDraftActivitySummary {
  if (!outputVideo) {
    return baseSummary;
  }

  const finalReviewAction = latestFinalReviewActionForOutput(state, draft.id, outputVideo);
  if (!finalReviewAction) {
    return baseSummary;
  }

  if (finalReviewAction.action === 'publish_ready') {
    return {
      status: 'completed',
      title: '投稿可能として確認済み',
      detail: compactActivityText(finalReviewAction.reason, '人間が完成動画を投稿可能として確認しました'),
      nextAction: '投稿処理または最終完了の判断を行います',
      requestDraftId: draft.id,
      outputVideoUri: outputVideo.uri
    };
  }

  return {
    status: 'completed',
    title: '最終完了',
    detail: compactActivityText(finalReviewAction.reason, '人間が完成動画を最終完了として確認しました'),
    nextAction: 'この完成動画を最終成果として扱います',
    requestDraftId: draft.id,
    outputVideoUri: outputVideo.uri
  };
}

function buildRequestDraftActivity(state: LoadedState, draft: RequestDraft): RequestDraftActivityEvent[] {
  const events: RequestDraftActivityEvent[] = [
    {
      id: `draft:${draft.id}:created`,
      kind: 'draft_created',
      occurredAt: draft.createdAt,
      actor: 'user',
      title: '実行前下書きを作成',
      detail: compactActivityText(draft.purpose, '依頼内容を保存しました'),
      requestDraftId: draft.id
    }
  ];

  if (draft.status !== 'draft') {
    events.push({
      id: `draft:${draft.id}:status:${draft.status}`,
      kind: 'draft_status',
      occurredAt: draft.updatedAt,
      actor: 'user',
      title: draftStatusTitle(draft.status),
      detail: '下書きの状態を更新しました',
      requestDraftId: draft.id
    });
  }

  for (const request of state.agentRequests.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `agent:${request.id}:created`,
      kind: 'agent_request_created',
      occurredAt: request.createdAt,
      actor: 'backend',
      title: `${request.label}をキューに追加`,
      detail: 'AIエージェントが実行する工程として登録しました',
      requestDraftId: draft.id,
      agentRequestId: request.id
    });

    if (request.updatedAt !== request.createdAt || request.status !== 'queued') {
      events.push({
        id: `agent:${request.id}:status:${request.status}`,
        kind: 'agent_request_status',
        occurredAt: request.updatedAt,
        actor: request.status === 'succeeded' || request.status === 'failed' ? 'agent' : 'backend',
        title: agentRequestStatusTitle(request),
        detail: agentRequestStatusDetail(request),
        requestDraftId: draft.id,
        agentRequestId: request.id,
        ...(request.result?.fileRefId ? { fileRefId: request.result.fileRefId } : {}),
        ...(request.result?.outputId ? { outputId: request.result.outputId } : {})
      });
    }
  }

  for (const log of state.agentOperationLogs.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `agent-operation:${log.id}`,
      kind: 'agent_operation_log',
      occurredAt: log.createdAt,
      actor: log.actor,
      title: agentOperationLogTitle(log),
      detail: agentOperationLogDetail(log),
      requestDraftId: draft.id,
      ...(log.agentRequestId ? { agentRequestId: log.agentRequestId } : {}),
      ...(log.fileRefId ? { fileRefId: log.fileRefId } : {}),
      ...(log.outputId ? { outputId: log.outputId } : {})
    });
  }

  for (const decision of state.decisionLogs.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `decision:${decision.id}`,
      kind: 'agent_decision',
      occurredAt: decision.createdAt,
      actor: decision.actor,
      title: decisionActivityTitle(decision),
      detail: decisionActivityDetail(decision),
      requestDraftId: draft.id,
      agentRequestId: decision.agentRequestId,
      decisionLogId: decision.id
    });
  }

  for (const review of state.controlReviewItems.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `review:${review.id}:required`,
      kind: 'human_review_required',
      occurredAt: review.createdAt,
      actor: 'agent',
      title: `${review.title}の確認待ち`,
      detail: compactActivityText(review.reason || review.summary, '人間の確認が必要です'),
      requestDraftId: draft.id,
      agentRequestId: review.agentRequestId,
      reviewItemId: review.id
    });
  }

  for (const action of state.humanReviewActions.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `human-review:${action.id}`,
      kind: 'human_review_action',
      occurredAt: action.createdAt,
      actor: 'user',
      title: humanReviewActionTitle(action.action),
      detail: compactActivityText(action.reason, '人間の判断を保存しました'),
      requestDraftId: draft.id,
      reviewItemId: action.reviewItemId,
      humanReviewActionId: action.id
    });
  }

  for (const action of state.finalReviewActions.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `final-review:${action.id}`,
      kind: 'final_review_action',
      occurredAt: action.createdAt,
      actor: 'user',
      title: finalReviewActionTitle(action.action),
      detail: compactActivityText(action.reason, '完成動画に対する人間の最終判断を保存しました'),
      requestDraftId: draft.id,
      finalReviewActionId: action.id
    });
  }

  return events.sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)
  ));
}

async function buildRequestDraftActivityWithExternalEvents(
  state: LoadedState,
  draft: RequestDraft
): Promise<RequestDraftActivityEvent[]> {
  const events = buildRequestDraftActivity(state, draft);
  const webGeminiReviewResult = await readWebGeminiReviewArtifact(draft.id);
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if ('error' in webGeminiReviewResult) {
    events.push(buildWebGeminiReviewActivityError(
      draft,
      webGeminiReviewResult.error,
      'Web Geminiレビュー本文を確認できません'
    ));
  } else if (webGeminiReviewResult.review) {
    const mismatch = ensureWebGeminiReviewMatchesOutputVideo(webGeminiReviewResult.review, outputVideo);
    if (mismatch) {
      events.push(buildWebGeminiReviewActivityError(
        draft,
        mismatch.error,
        'Web Geminiレビュー本文を確認できません'
      ));
    }
  }

  const webGeminiRunLogResult = await readWebGeminiReviewRunLog(draft.id);
  if ('error' in webGeminiRunLogResult) {
    events.push(buildWebGeminiReviewActivityError(draft, webGeminiRunLogResult.error));
  } else if (webGeminiRunLogResult.runLog) {
    const mismatch = ensureWebGeminiRunLogMatchesOutputVideo(webGeminiRunLogResult.runLog, outputVideo);
    events.push(
      mismatch
        ? buildWebGeminiReviewActivityError(draft, mismatch.error)
        : buildWebGeminiReviewActivity(draft, webGeminiRunLogResult.runLog)
    );
  } else if (!('error' in webGeminiReviewResult) && webGeminiReviewResult.review) {
    events.push(buildWebGeminiReviewActivityError(
      draft,
      'Web Geminiレビュー本文はありますが、実行ログがありません。レビューを取り直してください',
      'Web Geminiレビュー実行ログを確認できません'
    ));
  }

  return events.sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)
  ));
}

function activitySearchParam(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function activitySearchText(event: RequestDraftActivitySearchResult): string {
  return [
    event.id,
    event.kind,
    event.actor,
    event.title,
    event.detail,
    event.requestDraftId,
    event.agentRequestId ?? '',
    event.reviewItemId ?? '',
    event.decisionLogId ?? '',
    event.humanReviewActionId ?? '',
    event.finalReviewActionId ?? '',
    event.fileRefId ?? '',
    event.outputId ?? '',
    event.draftPurpose,
    event.draftStatus
  ].join('\n').toLowerCase();
}

function filterActivitySearchResults(
  results: RequestDraftActivitySearchResult[],
  input: { query: string; actor: string; kind: string; requestDraftId: string; limitText: string }
): RequestDraftActivitySearchResult[] {
  const query = input.query.toLowerCase();
  const filtered = results.filter((event) => {
    if (input.requestDraftId && event.requestDraftId !== input.requestDraftId) {
      return false;
    }

    if (input.actor && event.actor !== input.actor) {
      return false;
    }

    if (input.kind && event.kind !== input.kind) {
      return false;
    }

    return !query || activitySearchText(event).includes(query);
  });
  const sorted = filtered.sort((left, right) => (
    right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id)
  ));
  const limit = Number(input.limitText);
  return Number.isInteger(limit) && limit > 0 ? sorted.slice(0, limit) : sorted;
}

function ensureWebGeminiReviewMatchesOutputVideo(
  review: WebGeminiReviewArtifact | null,
  outputVideo: FileRef | undefined
): { error: string } | undefined {
  if (!review) {
    return undefined;
  }

  if (!outputVideo) {
    return { error: 'Web Geminiレビューがありますが、現在の完成動画がありません。動画生成後にレビューを取り直してください' };
  }

  if (review.outputVideoUri === outputVideo.uri) {
    return undefined;
  }

  return { error: 'Web Geminiレビューが現在の完成動画と一致しません。現在の動画でレビューを取り直してください' };
}

function ensureWebGeminiRunLogMatchesOutputVideo(
  runLog: WebGeminiReviewRunLog | null,
  outputVideo: FileRef | undefined
): { error: string } | undefined {
  if (!runLog) {
    return undefined;
  }

  if (!outputVideo) {
    return { error: 'Web Geminiレビュー実行ログがありますが、現在の完成動画がありません。動画生成後にレビューを取り直してください' };
  }

  if (runLog.outputVideoUri === outputVideo.uri) {
    return undefined;
  }

  return { error: 'Web Geminiレビュー実行ログが現在の完成動画と一致しません。現在の動画でレビューを取り直してください' };
}

function copyDraftForRestart(
  sourceDraft: RequestDraft,
  reason: string,
  createdAt: string,
  materialReselectInstruction?: string
): RequestDraft {
  const purposeLines = [sourceDraft.purpose];
  if (reason) {
    purposeLines.push(`やり直し理由: ${reason}`);
  }
  if (materialReselectInstruction) {
    purposeLines.push(`編集元場面の探し直し指示: ${materialReselectInstruction}`);
  }

  return {
    ...sourceDraft,
    id: createId('draft'),
    status: 'approved',
    purpose: purposeLines.join('\n'),
    source: { ...sourceDraft.source },
    settings: { ...sourceDraft.settings },
    policy: { ...sourceDraft.policy },
    steps: sourceDraft.steps.map((step) => ({ ...step })),
    createdAt,
    updatedAt: createdAt
  };
}

async function copySucceededAgentRequestForDraft(
  state: LoadedState,
  sourceRequest: AgentRequest,
  requestDraftId: string,
  dependsOnAgentRequestId: string | undefined,
  createdAt: string
): Promise<{ request: AgentRequest; fileRef?: FileRef; output?: OutputEntity } | { error: string }> {
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
  const copiedArtifact = await copyArtifactFileForRestart(sourceFileRef, sourceRequest, requestDraftId);
  if ('error' in copiedArtifact) {
    return copiedArtifact;
  }
  const fileRef: FileRef = {
    ...sourceFileRef,
    id: fileRefId,
    uri: copiedArtifact.uri,
    artifactFileName: copiedArtifact.artifactFileName,
    byteSize: copiedArtifact.byteSize,
    sha256: copiedArtifact.sha256,
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
  copiedFileRefIdsBySourceId: Map<string, string>,
  copiedOutputIdsBySourceId: Map<string, string>,
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
    const remapReferences = (references: ControlReference[] = []) => references.map((reference) => {
      if (reference.kind === 'request_draft') {
        return { ...reference, refId: requestDraftId };
      }

      if (reference.kind === 'agent_request') {
        return { ...reference, refId: copiedRequestIdsBySourceId.get(reference.refId) ?? reference.refId };
      }

      if (reference.kind === 'file_ref') {
        return { ...reference, refId: copiedFileRefIdsBySourceId.get(reference.refId) ?? reference.refId };
      }

      if (reference.kind === 'output') {
        return { ...reference, refId: copiedOutputIdsBySourceId.get(reference.refId) ?? reference.refId };
      }

      return { ...reference };
    });
    const copiedReviewOptions = sourceReview.options.map((option) => ({
      ...option,
      evidenceRefs: remapReferences(option.evidenceRefs)
    }));

    const copiedDecisionLog: DecisionLog = sourceDecisionLog
      ? {
          ...sourceDecisionLog,
          id: decisionLogId,
          requestDraftId,
          agentRequestId: copiedAgentRequestId,
          evidenceRefs: remapReferences(sourceDecisionLog.evidenceRefs),
          inputRefs: remapReferences(sourceDecisionLog.inputRefs),
          artifactRefs: remapReferences(sourceDecisionLog.artifactRefs),
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
          evidenceRefs: remapReferences(sourceReview.evidenceRefs),
          inputRefs: [],
          artifactRefs: remapReferences(sourceReview.evidenceRefs),
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
      evidenceRefs: remapReferences(sourceReview.evidenceRefs),
      options: copiedReviewOptions,
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

async function createCopiedEditRestart(
  state: LoadedState,
  requestDraftId: string,
  startType: AgentRequest['type'],
  reason: string,
  createdAt: string,
  materialReselectInstruction?: string
): Promise<CopiedEditRestart | { error: string }> {
  const sourceDraft = findById(state.requestDrafts, requestDraftId);
  if (!sourceDraft) {
    return { error: 'コピーする編集が見つかりません' };
  }

  const startIndex = workflowStepIndex(startType);
  const copiedDraft = copyDraftForRestart(sourceDraft, reason, createdAt, materialReselectInstruction);
  const requests: AgentRequest[] = [];
  const queuedRequests: AgentRequest[] = [];
  const fileRefs: FileRef[] = [];
  const outputs: OutputEntity[] = [];
  const copiedRequestIdsBySourceId = new Map<string, string>();
  const copiedFileRefIdsBySourceId = new Map<string, string>();
  const copiedOutputIdsBySourceId = new Map<string, string>();
  let dependsOnAgentRequestId: string | undefined;

  for (const step of WORKFLOW_STEPS.slice(0, startIndex)) {
    const sourceRequest = latestSucceededAgentRequest(state.agentRequests, requestDraftId, step.type);
    if (!sourceRequest) {
      return { error: `${step.label}が完了していないため、そこから後ろを作り直せません` };
    }

    const copied = await copySucceededAgentRequestForDraft(
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
      const sourceFileRefId = sourceRequest.result?.fileRefId;
      if (sourceFileRefId) {
        copiedFileRefIdsBySourceId.set(sourceFileRefId, copied.fileRef.id);
      }
    }
    if (copied.output) {
      outputs.push(copied.output);
      const sourceOutputId = sourceRequest.result?.outputId;
      if (sourceOutputId) {
        copiedOutputIdsBySourceId.set(sourceOutputId, copied.output.id);
      }
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
    copiedFileRefIdsBySourceId,
    copiedOutputIdsBySourceId,
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
  appendAgentOperationLog(state, {
    eventType: 'draft_created',
    requestDraftId: restart.draft.id,
    actor: 'backend',
    toStatus: restart.draft.status,
    detail: '作り直し用の編集コピーを作成した',
    createdAt: restart.draft.createdAt
  });
  appendAgentOperationLog(state, {
    eventType: 'draft_approved',
    requestDraftId: restart.draft.id,
    actor: 'backend',
    toStatus: restart.draft.status,
    detail: '編集コピーをAIエージェント用作業へ進める状態にした',
    createdAt: restart.draft.updatedAt
  });
  for (const agentRequest of restart.requests) {
    appendAgentRequestOperationLog(
      state,
      agentRequest,
      'agent_request_created',
      agentRequest.status === 'succeeded'
        ? `${agentRequest.label}を完了済み工程として編集コピーへ引き継いだ`
        : `${agentRequest.label}を作り直し用のAIエージェント作業としてキューに追加した`,
      {
        actor: 'backend',
        toStatus: agentRequest.status,
        ...(agentRequest.result?.fileRefId ? { fileRefId: agentRequest.result.fileRefId } : {}),
        ...(agentRequest.result?.outputId ? { outputId: agentRequest.result.outputId } : {}),
        createdAt: agentRequest.createdAt
      }
    );
  }
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

function generatedVideoChangeScopeFromInput(value: unknown): GeneratedVideoChangeScope | { error: string } {
  if (value === undefined) {
    return 'edit_plan';
  }

  if (generatedVideoChangeScopes.includes(value as GeneratedVideoChangeScope)) {
    return value as GeneratedVideoChangeScope;
  }

  return { error: '生成済み動画から作り直す範囲が不正です' };
}

async function createCopiedRestartFromFailedRequest(
  state: LoadedState,
  failedRequestId: string,
  createdAt: string
): Promise<CopiedEditRestart | { error: string }> {
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

function reviewTitle(kind: ControlReviewKind): string {
  if (kind === 'theme_selection') {
    return 'テーマ選択';
  }

  if (kind === 'material_confirmation') {
    return '切り口と編集元場面の確認';
  }

  return '動画生成前の確認';
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

function reviewActionLabel(action: HumanReviewActionType): string {
  if (action === 'approve') {
    return '承認';
  }

  if (action === 'reject') {
    return '却下';
  }

  return '修正依頼';
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

  const events = await buildRequestDraftActivityWithExternalEvents(state, draft);
  const webGeminiReviewResult = await readWebGeminiReviewArtifact(draft.id);
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  const webGeminiRunLogResult = await readWebGeminiReviewRunLog(draft.id);

  const baseSummary = buildRequestDraftActivitySummary(state, draft);
  const webGeminiSummary = buildWebGeminiReviewActivitySummary(
    baseSummary,
    draft,
    outputVideo,
    webGeminiReviewResult,
    webGeminiRunLogResult
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
    const events = await buildRequestDraftActivityWithExternalEvents(state, draft);
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
    const runLog = await prepareWebGeminiReviewRun(draft, outputVideo, nowIso());
    await removeWebGeminiReviewArtifact(draft.id);
    response.json({
      runLog,
      promptText: buildWebGeminiReviewPrompt(draft),
      outputVideoUri: outputVideo.uri
    });
  } catch (error) {
    response.status(500).json({
      error: `Web Geminiレビュー準備を保存できません: ${unknownErrorMessage(error)}`,
      state
    });
  }
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

  const reviewResult = await readWebGeminiReviewArtifact(draft.id);
  if ('error' in reviewResult) {
    response.status(409).json({ error: reviewResult.error, state });
    return;
  }
  const reviewMismatch = ensureWebGeminiReviewMatchesOutputVideo(reviewResult.review, outputVideo);
  if (reviewMismatch) {
    response.status(409).json({ error: reviewMismatch.error, state });
    return;
  }
  const runLogResult = await readWebGeminiReviewRunLog(draft.id);
  if ('error' in runLogResult) {
    response.status(409).json({ error: runLogResult.error, state });
    return;
  }
  const runLogMismatch = ensureWebGeminiRunLogMatchesOutputVideo(runLogResult.runLog, outputVideo);
  if (runLogMismatch) {
    response.status(409).json({ error: runLogMismatch.error, state });
    return;
  }
  let preparedPromptText = '';
  if (runLogResult.runLog) {
    const promptResult = await readWebGeminiReviewPromptText(draft.id);
    if ('error' in promptResult) {
      response.status(409).json({ error: promptResult.error, state });
      return;
    }
    preparedPromptText = promptResult.promptText;
  }

  response.json({
    review: reviewResult.review,
    runLog: runLogResult.runLog,
    preparedPromptText,
    outputVideoUri: outputVideo?.uri ?? ''
  });
});

router.post('/request-drafts/:id/web-gemini-review', async (request, response) => {
  const reviewText = hasText(request.body?.reviewText) ? request.body.reviewText.trim() : '';
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
    response.status(400).json({ error: errorMessage, runLog, state });
    return;
  }

  const currentRunLogResult = await readWebGeminiReviewRunLog(draft.id);
  if ('error' in currentRunLogResult) {
    response.status(409).json({ error: currentRunLogResult.error, state });
    return;
  }
  if (currentRunLogResult.runLog?.status === 'applied') {
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
  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'saved',
    createdAt: review.createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath: webGeminiReviewPromptPath(draft.id),
    blockedReasons: [],
    externalUploadRequired: false,
    nextAction: 'Web Geminiレビューを保存しました。必要なら改善指示を確認して演出作成前から作り直せます。',
    reviewPath: webGeminiReviewPath(draft.id),
    reviewCreatedAt: review.createdAt
  };
  await writeWebGeminiReviewRunLog(runLog);

  response.json({
    review,
    runLog
  });
});

router.post('/request-drafts/:id/apply-web-gemini-review', async (request, response) => {
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

  const reviewResult = await readWebGeminiReviewArtifact(draft.id);
  if ('error' in reviewResult) {
    response.status(409).json({ error: reviewResult.error, state });
    return;
  }
  if (!reviewResult.review) {
    response.status(409).json({ error: 'Web Geminiの演出レビューがまだ保存されていません', state });
    return;
  }
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
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
  const reviewMismatch = ensureWebGeminiReviewMatchesOutputVideo(reviewResult.review, outputVideo);
  if (reviewMismatch) {
    response.status(409).json({ error: reviewMismatch.error, state });
    return;
  }
  const runLogResult = await readWebGeminiReviewRunLog(draft.id);
  if ('error' in runLogResult) {
    response.status(409).json({ error: runLogResult.error, state });
    return;
  }
  const runLogMismatch = ensureWebGeminiRunLogMatchesOutputVideo(runLogResult.runLog, outputVideo);
  if (runLogMismatch) {
    response.status(409).json({ error: runLogMismatch.error, state });
    return;
  }
  if (runLogResult.runLog?.status === 'applied') {
    response.status(409).json({
      error: 'このWeb Geminiレビューはすでに反映済みです。もう一度反映する場合はレビューを取り直してください',
      state
    });
    return;
  }

  const instructionText = hasText(request.body?.instructionText)
    ? request.body.instructionText.trim()
    : reviewResult.review.instructionText;
  if (!instructionText) {
    response.status(400).json({ error: '演出作成へ渡す改善指示が空です', state });
    return;
  }

  const createdAt = nowIso();
  const reason = webGeminiReviewRestartReason(reviewResult.review, instructionText);
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
  const runLog = outputVideo
    ? await writeWebGeminiReviewAppliedRunLog(draft, outputVideo, reviewResult.review, restart.draft.id, createdAt)
    : undefined;
  await saveState(state);

  startDryRunRunner();

  response.json({
    draft: restart.draft,
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
