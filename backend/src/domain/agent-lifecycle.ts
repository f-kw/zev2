import {
  findAgentRequestDependency,
  findBlockingControlReview,
  trimText,
  type AgentClaimInput,
  type AgentRequest,
  type Zev2State
} from '@zev2/shared';
import { loadState, saveState } from '../store/json-store.js';
import { appendAgentRequestOperationLog } from './operation-log.js';
import { nowIso } from './support.js';

export function isValidIsoDateText(value: string): boolean {
  return Boolean(value) && Number.isFinite(Date.parse(value));
}

export function isClaimExpired(request: AgentRequest, observedAt: string): boolean {
  if (request.status !== 'running' || !request.claimExpiresAt) {
    return false;
  }

  return Date.parse(request.claimExpiresAt) <= Date.parse(observedAt);
}

export function isRunnableAfterClaimRecovery(state: Zev2State, request: AgentRequest): boolean {
  const dependency = findAgentRequestDependency(state, request);
  return (!dependency || dependency.status === 'succeeded') && !findBlockingControlReview(state, request);
}

export function clearClaimFields(request: AgentRequest): void {
  delete request.claimOwnerId;
  delete request.claimedAt;
  delete request.claimUpdatedAt;
  delete request.claimExpiresAt;
}

export function recoverExpiredClaims(state: Zev2State, observedAt: string): boolean {
  let changed = false;

  for (const request of state.agentRequests) {
    if (!isClaimExpired(request, observedAt)) {
      continue;
    }

    const previousOwner = request.claimOwnerId || '不明';
    const previousStatus = request.status;
    clearClaimFields(request);
    request.claimExpiredAt = observedAt;
    request.status = isRunnableAfterClaimRecovery(state, request) ? 'queued' : 'waiting';
    request.errorMessage = `取得期限が切れたため復旧しました。前回取得者: ${previousOwner}`;
    request.updatedAt = observedAt;
    appendAgentRequestOperationLog(
      state,
      request,
      'agent_request_claim_recovered',
      request.errorMessage,
      {
        actor: 'backend',
        fromStatus: previousStatus,
        toStatus: request.status,
        ownerId: previousOwner,
        errorMessage: request.errorMessage,
        createdAt: observedAt
      }
    );
    changed = true;
  }

  return changed;
}

export async function loadStateWithClaimRecovery(): Promise<Zev2State> {
  const state = await loadState();
  const observedAt = nowIso();
  if (recoverExpiredClaims(state, observedAt)) {
    await saveState(state);
  }

  return state;
}

export function readAgentClaimInput(value: unknown): AgentClaimInput {
  const body = value && typeof value === 'object' ? (value as Partial<AgentClaimInput>) : {};
  return {
    ownerId: trimText(body.ownerId),
    ...(trimText(body.expiresAt) ? { expiresAt: trimText(body.expiresAt) } : {})
  };
}

export function ensureClaimOwnerMatches(request: AgentRequest, ownerId: string): string | undefined {
  if (!ownerId) {
    return 'AIエージェント取得者が必要です';
  }

  if (request.claimOwnerId !== ownerId) {
    return '取得者が一致しないため、このAI操作は完了または失敗として記録できません';
  }

  return undefined;
}
