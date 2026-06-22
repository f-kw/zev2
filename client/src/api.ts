import axios from 'axios';
import type {
  AgentCompletionInput,
  AgentFailureInput,
  AgentRequest,
  HumanReviewActionType,
  RequestDraft,
  RequestDraftInput,
  Zev2State,
  WorkflowStep
} from '@zev2/shared';

const api = axios.create({
  baseURL: '/api'
});

export async function fetchWorkflow(): Promise<{ steps: WorkflowStep[] }> {
  const response = await api.get('/workflow');
  return response.data;
}

export async function fetchState(): Promise<Zev2State> {
  const response = await api.get('/state');
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

export async function claimAgentRequest(id: string): Promise<Zev2State> {
  const response = await api.post(`/agent-requests/${id}/claim`);
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

export async function submitHumanReviewAction(
  id: string,
  action: HumanReviewActionType,
  reason: string,
  selectedOptionId?: string,
  scope?: 'edit_plan' | 'theme_reselect'
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
  scope: 'edit_plan' | 'theme_selection'
): Promise<Zev2State> {
  const response = await api.post(`/request-drafts/${id}/request-generated-video-changes`, {
    reason,
    scope
  });
  return response.data.state;
}

export async function retryAgentRequest(id: string): Promise<Zev2State> {
  const response = await api.post(`/agent-requests/${id}/retry`);
  return response.data.state;
}

export async function fetchArtifactText(uri: string, cacheKey?: string): Promise<string> {
  const requestUri = cacheKey
    ? `${uri}${uri.includes('?') ? '&' : '?'}ref=${encodeURIComponent(cacheKey)}`
    : uri;
  const response = await axios.get(requestUri, { responseType: 'text' });
  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
}
