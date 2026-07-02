import type { DecisionLogActor, RequestDraftStatus } from './index.js';

export type RequestDraftActivityEventKind =
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

export type RequestDraftActivitySummaryStatus =
  | 'draft'
  | 'rejected'
  | 'failed'
  | 'review_required'
  | 'running'
  | 'waiting'
  | 'cancelled'
  | 'completed'
  | 'approved';

export interface RequestDraftActivityEvent {
  id: string;
  kind: RequestDraftActivityEventKind;
  occurredAt: string;
  actor: DecisionLogActor;
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
}

export interface RequestDraftActivitySummary {
  status: RequestDraftActivitySummaryStatus;
  title: string;
  detail: string;
  nextAction: string;
  requestDraftId: string;
  agentRequestId?: string;
  reviewItemId?: string;
  outputVideoUri?: string;
}

export interface RequestDraftActivitySearchResult extends RequestDraftActivityEvent {
  draftPurpose: string;
  draftStatus: RequestDraftStatus;
}
