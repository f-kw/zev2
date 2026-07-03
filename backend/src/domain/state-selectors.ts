import {
  findById,
  lastMatching,
  latestByCreatedAt,
  WORKFLOW_STEPS,
  type AgentRequest,
  type ControlReviewItem,
  type ControlReviewKind,
  type FileRef,
  type FinalReviewAction,
  type FinalReviewActionType,
  type OutputEntity,
  type Zev2State
} from '@zev2/shared';

export function workflowStepIndex(type: AgentRequest['type']): number {
  const index = WORKFLOW_STEPS.findIndex((step) => step.type === type);
  if (index < 0) {
    throw new Error(`未知の工程です: ${type}`);
  }

  return index;
}

export function latestSucceededAgentRequest(
  stateAgentRequests: AgentRequest[],
  requestDraftId: string,
  type: AgentRequest['type']
): AgentRequest | undefined {
  return lastMatching(
    stateAgentRequests,
    (request) => request.requestDraftId === requestDraftId && request.type === type && request.status === 'succeeded'
  );
}

export function latestControlReview(
  stateControlReviews: ControlReviewItem[],
  requestDraftId: string,
  kind: ControlReviewKind
): ControlReviewItem | undefined {
  const reviews = stateControlReviews.filter((item) => item.requestDraftId === requestDraftId && item.kind === kind);
  return latestByCreatedAt(reviews);
}

export function fileRefForAgentRequest(state: Zev2State, request: AgentRequest): FileRef | undefined {
  if (!request.result?.fileRefId) {
    return undefined;
  }

  return findById(state.fileRefs, request.result.fileRefId);
}

export function outputForAgentRequest(state: Zev2State, request: AgentRequest): OutputEntity | undefined {
  if (!request.result?.outputId) {
    return undefined;
  }

  return findById(state.outputs, request.result.outputId);
}

export function latestOutputVideoFileRef(state: Zev2State, requestDraftId: string): FileRef | undefined {
  const renderRequest = latestSucceededAgentRequest(state.agentRequests, requestDraftId, 'render_video');
  return renderRequest ? fileRefForAgentRequest(state, renderRequest) : undefined;
}

export function currentAgentRequestsForDraft(state: Zev2State, requestDraftId: string): AgentRequest[] {
  return state.agentRequests
    .filter((request) => request.requestDraftId === requestDraftId && request.status !== 'superseded')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function latestOpenControlReview(state: Zev2State, requestDraftId: string): ControlReviewItem | undefined {
  return state.controlReviewItems
    .filter((item) => item.requestDraftId === requestDraftId && item.status === 'review_required')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export function latestFinalReviewActionForOutput(
  state: Zev2State,
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

export function hasFinalReviewActionForOutput(
  state: Zev2State,
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

export function finalCompletedOutputChangeError(
  state: Zev2State,
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
