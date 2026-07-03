import type {
  AgentOperationLog,
  AgentOperationLogEventType,
  AgentRequest,
  Zev2State
} from '@zev2/shared';
import { compactActivityText, createId, nowIso } from './support.js';

export function appendAgentOperationLog(
  state: Zev2State,
  input: Omit<AgentOperationLog, 'id' | 'detail' | 'createdAt'> & {
    detail: unknown;
    createdAt?: string;
  }
): AgentOperationLog {
  const log: AgentOperationLog = {
    ...input,
    id: createId('agent_log'),
    detail: compactActivityText(input.detail, 'AI操作の状態を記録しました'),
    createdAt: input.createdAt ?? nowIso()
  };
  state.agentOperationLogs.push(log);
  return log;
}

export function appendAgentRequestOperationLog(
  state: Zev2State,
  request: AgentRequest,
  eventType: AgentOperationLogEventType,
  detail: unknown,
  input: Omit<AgentOperationLog, 'id' | 'eventType' | 'requestDraftId' | 'agentRequestId' | 'stepType' | 'detail' | 'createdAt'> & {
    createdAt?: string;
  }
): AgentOperationLog {
  return appendAgentOperationLog(state, {
    ...input,
    eventType,
    requestDraftId: request.requestDraftId,
    agentRequestId: request.id,
    stepType: request.type,
    detail
  });
}
