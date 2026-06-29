import axios from 'axios';
import {
  uriWithRef,
  type AgentCompletionInput,
  type AgentClaimInput,
  type AgentFailureInput,
  type AgentRequest,
  type HumanReviewActionType,
  type RequestDraft,
  type RequestDraftInput,
  type RuntimeConfig,
  type Zev2State,
  type WorkflowStep
} from '@zev2/shared';

const api = axios.create({
  baseURL: '/api'
});

export function formatApiError(error: unknown): string {
  const response = (error as {
    response?: {
      data?: {
        error?: string;
        errors?: string[];
      };
    };
  }).response;

  if (response?.data?.errors?.length) {
    return response.data.errors.join(' / ');
  }

  if (response?.data?.error) {
    return response.data.error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '処理の呼び出しに失敗しました';
}

export interface WebGeminiReviewArtifact {
  draftId: string;
  source: 'edge-web-gemini';
  status: 'ready';
  createdAt: string;
  outputVideoUri: string;
  promptText: string;
  reviewText: string;
  instructionText: string;
}

export interface WebGeminiReviewRunLog {
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
}

export interface RequestDraftActivityEvent {
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
  fileRefId?: string;
  outputId?: string;
}

export interface RequestDraftActivitySummary {
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
}

export async function fetchWorkflow(): Promise<{ steps: WorkflowStep[] }> {
  const response = await api.get('/workflow');
  return response.data;
}

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const response = await api.get('/runtime-config');
  return response.data;
}

export async function fetchState(): Promise<Zev2State> {
  const response = await api.get('/state');
  return response.data;
}

export async function fetchRequestDraftActivity(id: string): Promise<{
  requestDraftId: string;
  summary: RequestDraftActivitySummary;
  events: RequestDraftActivityEvent[];
}> {
  const response = await api.get(`/request-drafts/${id}/activity`);
  return response.data;
}

export async function createDraft(input: RequestDraftInput): Promise<{
  draft: RequestDraft;
  state: Zev2State;
}> {
  const response = await api.post('/request-drafts', input);
  return response.data;
}

export async function approveDraft(id: string): Promise<Zev2State> {
  const response = await api.post(`/request-drafts/${id}/approve`);
  return response.data.state;
}

export async function fetchNextAgentRequest(): Promise<AgentRequest | null> {
  const response = await api.get('/agent-requests/next');
  return response.data.request;
}

export async function claimAgentRequest(id: string, input: AgentClaimInput): Promise<Zev2State> {
  const response = await api.post(`/agent-requests/${id}/claim`, input);
  return response.data.state;
}

export async function completeAgentRequest(id: string, input: AgentCompletionInput): Promise<Zev2State> {
  const response = await api.post(`/agent-requests/${id}/complete`, input);
  return response.data.state;
}

export async function failAgentRequest(id: string, input: AgentFailureInput): Promise<Zev2State> {
  const response = await api.post(`/agent-requests/${id}/fail`, input);
  return response.data.state;
}

export async function resumeAgentWork(): Promise<Zev2State> {
  const response = await api.post('/agent-requests/resume');
  return response.data.state;
}

export async function cancelDraftAgentWork(id: string): Promise<{ draft: RequestDraft; state: Zev2State }> {
  const response = await api.post(`/request-drafts/${id}/cancel-agent-work`);
  return {
    draft: response.data.draft,
    state: response.data.state
  };
}

export async function submitHumanReviewAction(
  id: string,
  action: HumanReviewActionType,
  reason: string,
  selectedOptionId?: string,
  scope?: 'edit_plan' | 'theme_reselect' | 'theme_options_regenerate' | 'material_reselect' | 'adjustment'
): Promise<Zev2State> {
  const actionPath =
    action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'request-changes';
  const response = await api.post(`/control-reviews/${id}/${actionPath}`, {
    reason,
    ...(selectedOptionId ? { selectedOptionId } : {}),
    ...(scope ? { scope } : {})
  });
  return response.data.state;
}

export async function requestGeneratedVideoChanges(
  id: string,
  reason: string,
  scope: 'edit_plan' | 'theme_selection' | 'adjustment'
): Promise<{ draft: RequestDraft; state: Zev2State }> {
  const response = await api.post(`/request-drafts/${id}/request-generated-video-changes`, {
    reason,
    scope
  });
  return {
    draft: response.data.draft,
    state: response.data.state
  };
}

export async function fetchWebGeminiReview(id: string): Promise<{
  review: WebGeminiReviewArtifact | null;
  runLog: WebGeminiReviewRunLog | null;
  preparedPromptText: string;
  outputVideoUri: string;
}> {
  const response = await api.get(`/request-drafts/${id}/web-gemini-review`);
  return response.data;
}

export async function prepareWebGeminiReview(id: string): Promise<{
  runLog: WebGeminiReviewRunLog;
  promptText: string;
  outputVideoUri: string;
}> {
  const response = await api.post(`/request-drafts/${id}/web-gemini-review/prepare`);
  return response.data;
}

export async function applyWebGeminiReview(
  id: string,
  instructionText: string
): Promise<{ draft: RequestDraft; state: Zev2State }> {
  const response = await api.post(`/request-drafts/${id}/apply-web-gemini-review`, {
    instructionText
  });
  return {
    draft: response.data.draft,
    state: response.data.state
  };
}

export async function retryAgentRequest(id: string): Promise<{ draft: RequestDraft; state: Zev2State }> {
  const response = await api.post(`/agent-requests/${id}/retry`);
  return {
    draft: response.data.draft,
    state: response.data.state
  };
}

export async function fetchArtifactText(uri: string, cacheKey?: string): Promise<string> {
  const requestUri = uriWithRef(uri, cacheKey);
  const response = await axios.get(requestUri, { responseType: 'text' });
  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
}
