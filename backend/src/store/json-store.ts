import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveRuntimeDir } from '../config/runtime-dir.js';
import {
  WORKFLOW_STEPS,
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

const currentWorkflowTypes = new Set(WORKFLOW_STEPS.map((step) => step.type));
const currentFileRefKinds = new Set(WORKFLOW_STEPS.map((step) => step.outputKind));
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
    finalReviewActions: Array.isArray(state.finalReviewActions) ? state.finalReviewActions : []
  };
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
    state.requestDrafts.every(isCurrentRequestDraft) &&
    state.agentRequests.every(isCurrentAgentRequest) &&
    state.fileRefs.every(isCurrentFileRef) &&
    state.agentOperationLogs.every(isCurrentAgentOperationLog) &&
    state.controlReviewItems.every(isCurrentControlReview) &&
    state.humanReviewActions.every(isCurrentHumanReviewAction) &&
    state.finalReviewActions.every(isCurrentFinalReviewAction)
  );
}

export async function loadState(): Promise<Zev2State> {
  await mkdir(runtimeDir, { recursive: true });

  if (!existsSync(statePath)) {
    const initialState = createEmptyState();
    await saveState(initialState);
    return initialState;
  }

  const raw = await readFile(statePath, 'utf8');
  if (!raw.trim()) {
    const initialState = createEmptyState();
    await saveState(initialState);
    return initialState;
  }

  try {
    const state = withCurrentStateShape(JSON.parse(raw) as unknown);
    if (isZev2State(state)) {
      return state;
    }

    return quarantineBrokenState('state.jsonが現在のスキーマと一致しません');
  } catch {
    return quarantineBrokenState('state.jsonをJSONとして読めません');
  }
}

async function quarantineBrokenState(reason: string): Promise<Zev2State> {
  const brokenStatePath = `${statePath}.broken-${Date.now()}`;
  await rename(statePath, brokenStatePath);
  console.error(`${reason}。既存の状態を退避して空の状態から再開します: ${brokenStatePath}`);
  const initialState = createEmptyState();
  await saveState(initialState);
  return initialState;
}

export async function saveState(state: Zev2State): Promise<void> {
  await mkdir(runtimeDir, { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(state, null, 2));
  await rename(temporaryPath, statePath);
}
