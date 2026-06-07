import axios from 'axios';
import type {
  AgentCompletionInput,
  AgentFailureInput,
  AgentRequest,
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
