import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveRuntimeDir } from '../config/runtime-dir.js';
import {
  ALL_WORKFLOW_STEPS,
  isProductionType,
  createInitialState,
  recordValue,
  type AgentOperationLogEventType,
  type AgentRequestStatus,
  type ControlReviewKind,
  type ControlReviewStatus,
  type FinalReviewActionType,
  type FileRefKind,
  type HumanReviewActionType,
  type Zev2State
} from '@zev2/shared';

const runtimeDir = resolveRuntimeDir();

const statePath = path.join(runtimeDir, 'state.json');

let stateOperationQueue: Promise<unknown> = Promise.resolve();

// state.jsonは全量read-modify-writeのため、並行リクエスト間で更新が消えないよう直列化する
export function runExclusiveStateOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = stateOperationQueue.then(operation, operation);
  stateOperationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function createEmptyState(): Zev2State {
  return createInitialState();
}

const currentWorkflowTypes = new Set(ALL_WORKFLOW_STEPS.map((step) => step.type));
const currentFileRefKinds = new Set(ALL_WORKFLOW_STEPS.map((step) => step.outputKind));
const currentAgentRequestStatuses = new Set<AgentRequestStatus>([
  'queued',
  'running',
  'waiting',
  'succeeded',
  'failed',
  'cancelled',
  'superseded'
]);
const currentControlReviewKinds = new Set<ControlReviewKind>([
  'theme_selection',
  'material_confirmation',
  'render_readiness'
]);
const currentControlReviewStatuses = new Set<ControlReviewStatus>([
  'review_required',
  'approved',
  'rejected',
  'changes_requested'
]);
const currentHumanReviewActions = new Set<HumanReviewActionType>(['approve', 'reject', 'request_changes']);
const currentFinalReviewActions = new Set<FinalReviewActionType>(['publish_ready', 'final_complete']);
const currentAgentOperationLogEvents = new Set<AgentOperationLogEventType>([
  'draft_created',
  'draft_approved',
  'draft_rejected',
  'agent_request_created',
  'agent_request_next_returned',
  'agent_request_claimed',
  'agent_request_completed',
  'agent_request_failed',
  'agent_request_claim_recovered'
]);

function isCurrentRequestDraft(value: unknown): boolean {
  const draft = recordValue(value);
  const settings = recordValue(draft.settings);
  const policy = recordValue(draft.policy);
  const steps = Array.isArray(draft.steps) ? draft.steps : [];

  return (
    typeof draft.id === 'string' &&
    isProductionType(draft.productionType) &&
    typeof draft.purpose === 'string' &&
    typeof settings.durationLabel === 'string' &&
    typeof settings.themeCountLabel === 'string' &&
    typeof settings.geminiModelName === 'string' &&
    typeof settings.preset === 'string' &&
    typeof policy.humanApprovalRequiredBeforeRender === 'boolean' &&
    steps.every((step) => currentWorkflowTypes.has(recordValue(step).type as never))
  );
}

function isCurrentAgentRequest(value: unknown): boolean {
  const request = recordValue(value);

  return (
    typeof request.id === 'string' &&
    typeof request.requestDraftId === 'string' &&
    isProductionType(recordValue(request.input).productionType) &&
    currentWorkflowTypes.has(request.type as never) &&
    currentAgentRequestStatuses.has(request.status as AgentRequestStatus)
  );
}

function isCurrentFileRef(value: unknown): boolean {
  const fileRef = recordValue(value);
  return typeof fileRef.id === 'string' && currentFileRefKinds.has(fileRef.kind as FileRefKind);
}

function isCurrentControlReview(value: unknown): boolean {
  const review = recordValue(value);
  return (
    typeof review.id === 'string' &&
    currentControlReviewKinds.has(review.kind as ControlReviewKind) &&
    currentControlReviewStatuses.has(review.status as ControlReviewStatus)
  );
}

function isCurrentHumanReviewAction(value: unknown): boolean {
  const action = recordValue(value);
  return (
    typeof action.id === 'string' &&
    currentHumanReviewActions.has(action.action as HumanReviewActionType)
  );
}

function isCurrentFinalReviewAction(value: unknown): boolean {
  const action = recordValue(value);
  return (
    typeof action.id === 'string' &&
    typeof action.requestDraftId === 'string' &&
    typeof action.outputVideoUri === 'string' &&
    typeof action.createdAt === 'string' &&
    currentFinalReviewActions.has(action.action as FinalReviewActionType)
  );
}

function isCurrentAgentOperationLog(value: unknown): boolean {
  const log = recordValue(value);
  return (
    typeof log.id === 'string' &&
    typeof log.requestDraftId === 'string' &&
    typeof log.detail === 'string' &&
    typeof log.createdAt === 'string' &&
    currentAgentOperationLogEvents.has(log.eventType as AgentOperationLogEventType)
  );
}

function withCurrentStateShape(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const state = value as Partial<Zev2State>;
  return {
    ...state,
    agentOperationLogs: Array.isArray(state.agentOperationLogs) ? state.agentOperationLogs : [],
    finalReviewActions: Array.isArray(state.finalReviewActions) ? state.finalReviewActions : [],
    webGeminiReviews: Array.isArray(state.webGeminiReviews) ? state.webGeminiReviews : []
  };
}

function isCurrentWebGeminiReviewState(value: unknown): boolean {
  const entry = recordValue(value);
  return typeof entry.draftId === 'string' && typeof entry.updatedAt === 'string';
}

function isZev2State(value: unknown): value is Zev2State {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = withCurrentStateShape(value) as Partial<Record<keyof Zev2State, unknown>>;
  return (
    Array.isArray(state.requestDrafts) &&
    Array.isArray(state.agentRequests) &&
    Array.isArray(state.fileRefs) &&
    Array.isArray(state.outputs) &&
    Array.isArray(state.agentOperationLogs) &&
    Array.isArray(state.decisionLogs) &&
    Array.isArray(state.controlReviewItems) &&
    Array.isArray(state.humanReviewActions) &&
    Array.isArray(state.finalReviewActions) &&
    Array.isArray(state.webGeminiReviews) &&
    state.requestDrafts.every(isCurrentRequestDraft) &&
    state.agentRequests.every(isCurrentAgentRequest) &&
    state.fileRefs.every(isCurrentFileRef) &&
    state.outputs.every(v=>{const o=recordValue(v);return typeof o.id==='string' && typeof o.fileRefId==='string' && ['Video','Transcript','ThemeCandidates','ClipComposition','EditPlan','Patch','OutputVideo','DigestPlan','DigestExecutionInput'].includes(String(o.type));}) &&
    state.agentOperationLogs.every(isCurrentAgentOperationLog) &&
    state.controlReviewItems.every(isCurrentControlReview) &&
    state.humanReviewActions.every(isCurrentHumanReviewAction) &&
    state.finalReviewActions.every(isCurrentFinalReviewAction) &&
    state.webGeminiReviews.every(isCurrentWebGeminiReviewState)
  );
}

/** 旧状態の参照は無改変で行う。作用するcallerはloadStateを使う。 */
export async function readStateSnapshot(): Promise<unknown> {
  return JSON.parse(await readFile(statePath, 'utf8')) as unknown;
}
export async function loadState(): Promise<Zev2State> {
  if (!existsSync(statePath)) {const state = createEmptyState(); await saveState(state); return state;}
  const state = withCurrentStateShape(await readStateSnapshot());
  if (!isZev2State(state)) throw new Error('STATE_MIGRATION_REQUIRED: 現行の明示制作系統を持たない状態への作用を拒否します');
  return state;
}

export async function saveState(state: Zev2State): Promise<void> {
  if (!isZev2State(state)) throw new Error('STATE_MIGRATION_REQUIRED: 保存型が不正な状態を更新できません');
  if (existsSync(statePath) && !isZev2State(withCurrentStateShape(await readStateSnapshot())))
    throw new Error('STATE_MIGRATION_REQUIRED: 旧状態の移行は未承認です');
  await mkdir(runtimeDir, { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(state, null, 2));
  await rename(temporaryPath, statePath);
}
