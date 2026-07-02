import axios from 'axios';
import {
  uriWithRef,
  type AgentCompletionInput,
  type AgentClaimInput,
  type AgentFailureInput,
  type FinalReviewAction,
  type FinalReviewActionType,
  type AgentRequest,
  type HumanReviewActionType,
  type RequestDraft,
  type RequestDraftActivityEvent,
  type RequestDraftActivitySearchResult,
  type RequestDraftActivitySummary,
  type RequestDraftInput,
  type RuntimeConfig,
  type WebGeminiReviewArtifact,
  type WebGeminiReviewRunLog,
  type WebGeminiRevisionBriefArtifact,
  type Zev2State,
  type WorkflowStep
} from '@zev2/shared';

export type {
  RequestDraftActivityEvent,
  RequestDraftActivitySearchResult,
  RequestDraftActivitySummary,
  WebGeminiReviewArtifact,
  WebGeminiReviewRunLog,
  WebGeminiRevisionBriefArtifact
};

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
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

export interface HumanAuthStatus {
  required: boolean;
  authenticated: boolean;
}

export async function fetchHumanAuthStatus(): Promise<HumanAuthStatus> {
  const response = await api.get('/human-auth/status');
  return response.data;
}

export async function loginHumanUi(token: string): Promise<HumanAuthStatus> {
  const response = await api.post('/human-auth/login', { token });
  return response.data;
}

export async function logoutHumanUi(): Promise<HumanAuthStatus> {
  const response = await api.post('/human-auth/logout');
  return response.data;
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

export async function searchRequestDraftActivity(params: {
  q?: string;
  actor?: RequestDraftActivityEvent['actor'];
  kind?: RequestDraftActivityEvent['kind'];
  requestDraftId?: string;
  limit?: number;
}): Promise<{
  query: {
    q: string;
    actor: string;
    kind: string;
    requestDraftId: string;
    limit: string;
  };
  totalCount: number;
  results: RequestDraftActivitySearchResult[];
}> {
  const response = await api.get('/activity-search', { params });
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

export async function rejectDraft(id: string, reason: string): Promise<{
  draft: RequestDraft;
  state: Zev2State;
}> {
  const response = await api.post(`/request-drafts/${id}/reject`, { reason });
  return response.data;
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

export async function submitFinalReview(
  id: string,
  action: FinalReviewActionType,
  reason?: string
): Promise<{ finalReviewAction: FinalReviewAction; state: Zev2State }> {
  const response = await api.post(`/request-drafts/${id}/final-review`, {
    action,
    ...(reason ? { reason } : {})
  });
  return response.data;
}

export async function fetchWebGeminiReview(id: string): Promise<{
  review: WebGeminiReviewArtifact | null;
  revisionBrief: WebGeminiRevisionBriefArtifact | null;
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
  revisionBriefText: string
): Promise<{ draft: RequestDraft; revisionBrief: WebGeminiRevisionBriefArtifact; state: Zev2State }> {
  const response = await api.post(`/request-drafts/${id}/apply-web-gemini-review`, {
    revisionBriefText
  });
  return {
    draft: response.data.draft,
    revisionBrief: response.data.revisionBrief,
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
