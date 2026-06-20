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
    label: 'テーマ候補作成',
    outputKind: 'theme_json',
    requiresHumanApproval: false
  },
  {
    type: 'build_clip_composition',
    label: '複数箇所構成',
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
    requiresHumanApproval: true
  }
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];
export type AgentRequestType = WorkflowStep['type'];
export type FileRefKind = WorkflowStep['outputKind'];

export type RequestDraftStatus = 'draft' | 'approved' | 'rejected';
export type AgentRequestStatus = 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'superseded';
export type FileRefAccess = 'internal' | 'external';
export type ControlReviewKind = 'theme_selection' | 'render_readiness';
export type ControlReviewStatus = 'review_required' | 'approved' | 'rejected' | 'changes_requested';
export type HumanReviewActionType = 'approve' | 'reject' | 'request_changes';
export type DecisionLogActor = 'agent' | 'runner' | 'backend' | 'system' | 'user';
export type DecisionLogType =
  | 'theme_selection'
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
  preset: string;
}

export interface HumanControlPolicy {
  humanApprovalRequiredBeforeRender: true;
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
  prepare_video: '対象動画をAI処理用の入力として登録した結果',
  run_stt: 'ZEVサンプル書き起こしをテーマ候補作成用の材料として保存した結果',
  propose_clip_themes: '文字起こしから切り抜きたい内容を選ぶためのテーマ候補を作った結果',
  build_clip_composition: '選ばれたテーマに関係する複数発話箇所を集めて構成案を作った結果',
  create_edit_plan: '複数箇所の構成案と動画参照をもとに演出案を作る工程の仮実装結果',
  apply_adjustment: '修正内容を複数箇所の演出案へ反映する工程の仮実装結果',
  render_video: '承認済み編集案から動画を生成する工程の仮実装結果'
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
  if (!request.dependsOnAgentRequestId) {
    return undefined;
  }

  return state.agentRequests.find((item) => item.id === request.dependsOnAgentRequestId);
}

export function isAgentRequestReady(state: Zev2State, request: AgentRequest): boolean {
  if (!['queued', 'waiting'].includes(request.status)) {
    return false;
  }

  const dependency = findAgentRequestDependency(state, request);
  return (!dependency || dependency.status === 'succeeded') && !findBlockingControlReview(state, request);
}

export function findReadyAgentRequest(state: Zev2State): AgentRequest | undefined {
  return state.agentRequests.find((request) => isAgentRequestReady(state, request));
}

export function hasHumanReviewRequired(state: Zev2State): boolean {
  return state.controlReviewItems.some((item) => item.status === 'review_required');
}

export function findBlockingControlReview(
  state: Zev2State,
  request: AgentRequest
): ControlReviewItem | undefined {
  const latestControlReview = (kind: ControlReviewKind) =>
    state.controlReviewItems
      .filter((item) => item.requestDraftId === request.requestDraftId && item.kind === kind)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  const themeReview = latestControlReview('theme_selection');
  const requestStepIndex = WORKFLOW_STEPS.findIndex((step) => step.type === request.type);
  const themeStepIndex = WORKFLOW_STEPS.findIndex((step) => step.type === 'propose_clip_themes');

  if (themeReview && themeReview.status !== 'approved' && requestStepIndex > themeStepIndex) {
    return themeReview;
  }

  if (request.type !== 'render_video') {
    return undefined;
  }

  const renderReview = latestControlReview('render_readiness');
  return renderReview?.status === 'approved' ? undefined : renderReview;
}

export function getRequiredControlReviewKind(
  request: AgentRequest
): ControlReviewKind | undefined {
  if (request.type === 'propose_clip_themes') {
    return 'theme_selection';
  }

  return request.type === 'apply_adjustment' ? 'render_readiness' : undefined;
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
    errors.push('テーマ数を選んでください');
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
      preset: input.preset.trim()
    },
    policy: {
      humanApprovalRequiredBeforeRender: true
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
  const requestedSteps = WORKFLOW_STEPS.filter((step) => step.type !== 'render_video');

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
