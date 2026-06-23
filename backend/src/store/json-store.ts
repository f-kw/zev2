import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  WORKFLOW_STEPS,
  createInitialState,
  recordValue,
  type AgentRequestStatus,
  type ControlReviewKind,
  type ControlReviewStatus,
  type FileRefKind,
  type HumanReviewActionType,
  type Zev2State
} from '@zev2/shared';

const runtimeDir = process.env.ZEV2_RUNTIME_DIR
  ? path.resolve(process.env.ZEV2_RUNTIME_DIR)
  : path.resolve(process.cwd(), '../runtime');

const statePath = path.join(runtimeDir, 'state.json');

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
  'superseded'
]);
const currentControlReviewKinds = new Set<ControlReviewKind>(['theme_selection', 'render_readiness']);
const currentControlReviewStatuses = new Set<ControlReviewStatus>([
  'review_required',
  'approved',
  'rejected',
  'changes_requested'
]);
const currentHumanReviewActions = new Set<HumanReviewActionType>(['approve', 'reject', 'request_changes']);

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

function isZev2State(value: unknown): value is Zev2State {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<Record<keyof Zev2State, unknown>>;
  return (
    Array.isArray(state.requestDrafts) &&
    Array.isArray(state.agentRequests) &&
    Array.isArray(state.fileRefs) &&
    Array.isArray(state.outputs) &&
    Array.isArray(state.decisionLogs) &&
    Array.isArray(state.controlReviewItems) &&
    Array.isArray(state.humanReviewActions) &&
    state.requestDrafts.every(isCurrentRequestDraft) &&
    state.agentRequests.every(isCurrentAgentRequest) &&
    state.fileRefs.every(isCurrentFileRef) &&
    state.controlReviewItems.every(isCurrentControlReview) &&
    state.humanReviewActions.every(isCurrentHumanReviewAction)
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
    const state = JSON.parse(raw) as unknown;
    if (isZev2State(state)) {
      return state;
    }

    const brokenStatePath = `${statePath}.broken-${Date.now()}`;
    await rename(statePath, brokenStatePath);
    const initialState = createEmptyState();
    await saveState(initialState);
    return initialState;
  } catch {
    const brokenStatePath = `${statePath}.broken-${Date.now()}`;
    await rename(statePath, brokenStatePath);
    const initialState = createEmptyState();
    await saveState(initialState);
    return initialState;
  }
}

export async function saveState(state: Zev2State): Promise<void> {
  await mkdir(runtimeDir, { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(state, null, 2));
  await rename(temporaryPath, statePath);
}
