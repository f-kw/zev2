import { findById, isStatusIn, lastMatching } from './common.js';

export * from './common.js';

export const WORKFLOW_STEPS = [
  {
    type: 'prepare_video',
    label: '動画取り込み',
    outputKind: 'source_video',
    requiresHumanApproval: false
  },
  {
    type: 'run_stt',
    label: 'STT',
    outputKind: 'transcript_json',
    requiresHumanApproval: false
  },
  {
    type: 'propose_clip_themes',
    label: 'テーマ作成',
    outputKind: 'theme_json',
    requiresHumanApproval: false
  },
  {
    type: 'build_clip_composition',
    label: '切り口作成',
    outputKind: 'composition_json',
    requiresHumanApproval: false
  },
  {
    type: 'create_edit_plan',
    label: '演出作成',
    outputKind: 'edit_plan_json',
    requiresHumanApproval: false
  },
  {
    type: 'apply_adjustment',
    label: '微調整',
    outputKind: 'patch_json',
    requiresHumanApproval: false
  },
  {
    type: 'render_video',
    label: '動画生成',
    outputKind: 'output_video',
    requiresHumanApproval: false
  }
] as const;

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

export const GEMINI_MODEL_OPTIONS = [
  {
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    purpose: '品質確認'
  },
  {
    value: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    purpose: '軽い確認'
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    purpose: '疎通確認'
  }
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];
export type AgentRequestType = WorkflowStep['type'];
export type FileRefKind = WorkflowStep['outputKind'];

export const ARTIFACT_FILE_NAME_BY_KIND = {
  source_video: 'source-video.json',
  transcript_json: 'transcript.json',
  theme_json: 'themes.json',
  composition_json: 'clip-composition.json',
  edit_plan_json: 'edit-plan.json',
  patch_json: 'adjustment-patch.json',
  output_video: 'output.mp4'
} as const satisfies Record<FileRefKind, string>;

export type SttRuntimeMode = 'fixed' | 'local';
export type ContentDiscoveryRuntimeMode = 'fixed' | 'transcript';
export type GeminiRuntimeMode = 'fixed' | 'gemini';
export type AdjustmentRuntimeMode = 'fixed';

export type RequestDraftStatus = 'draft' | 'approved' | 'rejected';
export type AgentRequestStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'superseded';
export type FileRefAccess = 'internal' | 'external';
export type ControlReviewKind = 'theme_selection' | 'material_confirmation' | 'render_readiness';
export type ControlReviewStatus = 'review_required' | 'approved' | 'rejected' | 'changes_requested';
export type HumanReviewActionType = 'approve' | 'reject' | 'request_changes';
export type DecisionLogActor = 'agent' | 'runner' | 'backend' | 'system' | 'user';
export type DecisionLogType =
  | 'theme_selection'
  | 'material_confirmation'
  | 'render_readiness';

export interface ControlReference {
  refId: string;
  kind: 'request_draft' | 'agent_request' | 'file_ref' | 'output' | 'time_range' | 'rule' | 'state';
  meaning: string;
}

export interface ControlReviewOption {
  id: string;
  title: string;
  summary: string;
  evidenceRefs: ControlReference[];
}

export interface RequestDraftInput {
  purpose: string;
  sourceUri: string;
  durationLabel: string;
  themeCountLabel: string;
  geminiModelName: string;
  preset: string;
}

export interface RuntimeConfig {
  stt: {
    mode: SttRuntimeMode;
    localServerUrl: string;
    language: string;
  };
  contentDiscovery: {
    mode: ContentDiscoveryRuntimeMode;
  };
  editPlan: {
    mode: GeminiRuntimeMode;
  };
  adjustment: {
    mode: AdjustmentRuntimeMode;
  };
  videoOutput: {
    encoder: string;
    extraArgs: string[];
  };
  source: {
    defaultUri: string;
    defaultPurpose: string;
  };
}

export interface HumanControlPolicy {
  humanApprovalRequiredBeforeRender: boolean;
}

export interface RequestDraft {
  id: string;
  status: RequestDraftStatus;
  purpose: string;
  source: {
    kind: 'video_source';
    uri: string;
  };
  settings: {
    durationLabel: string;
    themeCountLabel: string;
    geminiModelName: string;
    preset: string;
  };
  policy: HumanControlPolicy;
  steps: Array<{
    type: AgentRequestType;
    label: string;
    requiresHumanApproval: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRequest {
  id: string;
  requestDraftId: string;
  type: AgentRequestType;
  label: string;
  target: {
    sourceUri: string;
  };
  input: {
    purpose: string;
    settings: RequestDraft['settings'];
  };
  constraints: RequestDraft['settings'];
  policy: HumanControlPolicy;
  dependsOnAgentRequestId?: string;
  status: AgentRequestStatus;
  fileRefIds: string[];
  result?: {
    outputId?: string;
    outputType?: OutputEntity['type'];
    fileRefId?: string;
    meaning: string;
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileRef {
  id: string;
  kind: FileRefKind;
  uri: string;
  mimeType: string;
  access: FileRefAccess;
  ownerId: string;
  createdAt: string;
}

export interface AgentCompletionInput {
  meaning?: string;
  decision?: AgentDecisionInput;
  fileRef?: {
    uri: string;
    mimeType: string;
    access?: FileRefAccess;
  };
}

export interface AgentDecisionInput {
  decisionType: DecisionLogType;
  decision: string;
  reason: string;
  evidenceRefs?: ControlReference[];
  reviewOptions?: ControlReviewOption[];
  proposedNextState: string;
  requiresHumanReview: boolean;
  humanQuestion?: string | null;
  ruleIds?: string[];
}

export interface AgentFailureInput {
  message: string;
}

export type OutputEntity =
  | { id: string; type: 'Video'; meaning: string; fileRefId: string }
  | { id: string; type: 'Transcript'; meaning: string; fileRefId: string }
  | { id: string; type: 'ThemeCandidates'; meaning: string; fileRefId: string }
  | { id: string; type: 'ClipComposition'; meaning: string; fileRefId: string }
  | { id: string; type: 'EditPlan'; meaning: string; fileRefId: string }
  | { id: string; type: 'Patch'; meaning: string; fileRefId: string }
  | { id: string; type: 'OutputVideo'; meaning: string; fileRefId: string };

export type OutputEntityType = OutputEntity['type'];

export interface Zev2State {
  requestDrafts: RequestDraft[];
  agentRequests: AgentRequest[];
  fileRefs: FileRef[];
  outputs: OutputEntity[];
  decisionLogs: DecisionLog[];
  controlReviewItems: ControlReviewItem[];
  humanReviewActions: HumanReviewAction[];
}

export interface DecisionLog {
  id: string;
  requestDraftId: string;
  agentRequestId: string;
  stepType: AgentRequestType;
  actor: DecisionLogActor;
  decisionType: DecisionLogType;
  decision: string;
  reason: string;
  evidenceRefs: ControlReference[];
  inputRefs: ControlReference[];
  artifactRefs: ControlReference[];
  proposedNextState: string;
  requiresHumanReview: boolean;
  humanQuestion: string | null;
  ruleIds: string[];
  createdAt: string;
}

export interface ControlReviewItem {
  id: string;
  requestDraftId: string;
  agentRequestId: string;
  kind: ControlReviewKind;
  status: ControlReviewStatus;
  title: string;
  summary: string;
  reason: string;
  evidenceRefs: ControlReference[];
  options: ControlReviewOption[];
  proposedNextState: string;
  humanQuestion: string;
  decisionLogId: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedByActionId?: string;
}

export interface HumanReviewAction {
  id: string;
  reviewItemId: string;
  requestDraftId: string;
  action: HumanReviewActionType;
  reason: string;
  selectedOptionId?: string;
  createdAt: string;
}

const OUTPUT_TYPE_BY_REQUEST_TYPE = {
  prepare_video: 'Video',
  run_stt: 'Transcript',
  propose_clip_themes: 'ThemeCandidates',
  build_clip_composition: 'ClipComposition',
  create_edit_plan: 'EditPlan',
  apply_adjustment: 'Patch',
  render_video: 'OutputVideo'
} satisfies Record<AgentRequestType, OutputEntityType>;

const DRY_RUN_MEANING_BY_REQUEST_TYPE = {
  prepare_video: '対象動画を取得または参照し、AI処理用の入力として保存した結果',
  run_stt: '動画から音声を抽出し、ZEVローカルSTTで文字起こしした結果',
  propose_clip_themes: '文字起こしから切り抜きのテーマを整理した結果',
  build_clip_composition: '選ばれたテーマの切り口と編集元場面を整理した結果',
  create_edit_plan: '切り口と編集元場面をもとに演出案を作った結果',
  apply_adjustment: '修正指示を複数箇所の演出案へ反映した結果',
  render_video: '編集案から複数箇所を連結して動画を生成した結果'
} satisfies Record<AgentRequestType, string>;

export function createInitialState(): Zev2State {
  return {
    requestDrafts: [],
    agentRequests: [],
    fileRefs: [],
    outputs: [],
    decisionLogs: [],
    controlReviewItems: [],
    humanReviewActions: []
  };
}

export function getWorkflowStep(requestType: AgentRequestType): WorkflowStep {
  const step = WORKFLOW_STEPS.find((item) => item.type === requestType);
  if (!step) {
    throw new Error(`未知の作業種別です: ${requestType}`);
  }

  return step;
}

export function getFileRefKindForRequest(requestType: AgentRequestType): FileRefKind {
  return getWorkflowStep(requestType).outputKind;
}

export function getOutputTypeForRequest(requestType: AgentRequestType): OutputEntityType {
  return OUTPUT_TYPE_BY_REQUEST_TYPE[requestType];
}

export function getDryRunMeaningForRequest(requestType: AgentRequestType): string {
  return DRY_RUN_MEANING_BY_REQUEST_TYPE[requestType];
}

export function getMimeTypeForFileRefKind(kind: FileRefKind): string {
  if (kind === 'source_video') {
    return 'video/source';
  }

  if (kind === 'output_video') {
    return 'video/mp4';
  }

  return 'application/json';
}

export function findAgentRequestDependency(
  state: Zev2State,
  request: AgentRequest
): AgentRequest | undefined {
  return findById(state.agentRequests, request.dependsOnAgentRequestId);
}

export function isAgentRequestReady(state: Zev2State, request: AgentRequest): boolean {
  if (!isStatusIn(request.status, ['queued', 'waiting'])) {
    return false;
  }

  const dependency = findAgentRequestDependency(state, request);
  return (!dependency || dependency.status === 'succeeded') && !isBlockedByHumanReview(state, request);
}

export function findReadyAgentRequest(state: Zev2State): AgentRequest | undefined {
  return [...state.agentRequests]
    .filter((request) => isAgentRequestReady(state, request))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export function hasHumanReviewRequired(state: Zev2State): boolean {
  return state.controlReviewItems.some((item) => item.status === 'review_required');
}

export function findBlockingControlReview(
  state: Zev2State,
  request: AgentRequest
): ControlReviewItem | undefined {
  const requiredKind = requiredApprovedReviewKindBeforeRequest(request.type);
  if (!requiredKind) {
    return undefined;
  }

  const latestReview = lastMatching(
    state.controlReviewItems,
    (item) => item.requestDraftId === request.requestDraftId && item.kind === requiredKind
  );

  return latestReview?.status === 'approved' ? undefined : latestReview;
}

export function getRequiredControlReviewKind(
  request: AgentRequest
): ControlReviewKind | undefined {
  if (request.type === 'propose_clip_themes') {
    return 'theme_selection';
  }

  if (request.type === 'build_clip_composition') {
    return 'material_confirmation';
  }

  if (request.type === 'apply_adjustment') {
    return 'render_readiness';
  }

  return undefined;
}

function isBlockedByHumanReview(state: Zev2State, request: AgentRequest): boolean {
  const requiredKind = requiredApprovedReviewKindBeforeRequest(request.type);
  if (!requiredKind) {
    return false;
  }

  const latestReview = lastMatching(
    state.controlReviewItems,
    (item) => item.requestDraftId === request.requestDraftId && item.kind === requiredKind
  );

  return latestReview?.status !== 'approved';
}

function requiredApprovedReviewKindBeforeRequest(requestType: AgentRequestType): ControlReviewKind | undefined {
  if (requestType === 'build_clip_composition') {
    return 'theme_selection';
  }

  if (requestType === 'create_edit_plan') {
    return 'material_confirmation';
  }

  if (requestType === 'render_video') {
    return 'render_readiness';
  }

  return undefined;
}

export function validateRequestDraftInput(input: Partial<RequestDraftInput>): string[] {
  const errors: string[] = [];

  if (!input.purpose?.trim()) {
    errors.push('目的を入力してください');
  }

  if (!input.sourceUri?.trim()) {
    errors.push('動画ソースを入力してください');
  }

  if (!input.durationLabel?.trim()) {
    errors.push('尺を選んでください');
  }

  if (!input.themeCountLabel?.trim()) {
    errors.push('候補数を選んでください');
  }

  if (!input.geminiModelName?.trim()) {
    errors.push('Geminiモデルを選んでください');
  }

  if (!input.preset?.trim()) {
    errors.push('プリセットを選んでください');
  }

  return errors;
}

export function createRequestDraft(
  input: RequestDraftInput,
  now: string,
  createId: (prefix: string) => string
): RequestDraft {
  return {
    id: createId('draft'),
    status: 'draft',
    purpose: input.purpose.trim(),
    source: {
      kind: 'video_source',
      uri: input.sourceUri.trim()
    },
    settings: {
      durationLabel: input.durationLabel.trim(),
      themeCountLabel: input.themeCountLabel.trim(),
      geminiModelName: input.geminiModelName.trim(),
      preset: input.preset.trim()
    },
    policy: {
      humanApprovalRequiredBeforeRender: false
    },
    steps: WORKFLOW_STEPS.map((step) => ({
      type: step.type,
      label: step.label,
      requiresHumanApproval: step.requiresHumanApproval
    })),
    createdAt: now,
    updatedAt: now
  };
}

export function createAgentRequestsFromDraft(
  draft: RequestDraft,
  now: string,
  createId: (prefix: string) => string
): AgentRequest[] {
  const requestedSteps = WORKFLOW_STEPS;

  let previousAgentRequestId = '';

  return requestedSteps.map((step) => {
    const request: AgentRequest = {
      id: createId('agent'),
      requestDraftId: draft.id,
      type: step.type,
      label: step.label,
      target: {
        sourceUri: draft.source.uri
      },
      input: {
        purpose: draft.purpose,
        settings: draft.settings
      },
      constraints: draft.settings,
      policy: draft.policy,
      status: 'queued',
      fileRefIds: [],
      createdAt: now,
      updatedAt: now
    };

    if (previousAgentRequestId) {
      request.dependsOnAgentRequestId = previousAgentRequestId;
    }

    previousAgentRequestId = request.id;
    return request;
  });
}
