import type { AgentRequest, ControlReviewItem, FileRef, RequestDraft, RuntimeConfig, Zev2State } from './index.js';

// Exact displayed values, compared again inside the existing server state transaction.
export function draftConfirmationIdentity(draft: RequestDraft): string { return JSON.stringify(draft); }
export function runtimeConfirmationIdentity(config: RuntimeConfig): string { return JSON.stringify(config); }
export interface DraftApprovalConfirmation { draftIdentity: string; runtimeIdentity: string }
export interface ReviewApprovalConfirmation { requestDraftId: string; reviewId: string; fingerprint: string }
export interface OutputApprovalConfirmation { fileRefId: string; sha256: string }
export interface AgentExecutionScope { requestDraftId: string; draftIdentity: string; runtimeIdentity: string }
export function executionScopeForDraft(draft: RequestDraft, runtimeIdentity: string): AgentExecutionScope {
  return {requestDraftId:draft.id,draftIdentity:draftConfirmationIdentity(draft),runtimeIdentity};
}
export function assertExecutionRuntime(scope: AgentExecutionScope, config: RuntimeConfig): void {
  if (scope.runtimeIdentity !== runtimeConfirmationIdentity(config)) throw new Error('表示した実行設定が変更されています。再確認してください');
}
export function assertAgentExecutionScope(state: Zev2State, input: unknown, request?: AgentRequest): AgentExecutionScope {
  const scope = input as Partial<AgentExecutionScope> | undefined;
  const draft = state.requestDrafts.find(d=>d.id===scope?.requestDraftId);
  if (!draft || draft.status !== 'approved' || scope?.draftIdentity !== draftConfirmationIdentity(draft)
    || typeof scope.runtimeIdentity !== 'string' || !scope.runtimeIdentity
    || (request && request.requestDraftId !== draft.id)) throw new Error('実行対象の依頼または期待版が一致しません');
  return {requestDraftId:draft.id,draftIdentity:scope.draftIdentity,runtimeIdentity:scope.runtimeIdentity};
}
export interface UiSpeechReference { id: number; text: string; startMs: number; endMs: number }
export interface UiSavedCandidate {
  id: string; title: string; summary: string; speeches: UiSpeechReference[];
  ranges: Array<{ startMs: number; endMs: number }>; preview?: FileRef;
  previewStatus?: { state: 'unknown' | 'not_created' | 'preparing' | 'ready' | 'failed' | 'cancelled'; requestId?: string };
}
// Human editing intent only. These references never authorize AI, fees or manufacturing.
export interface UiDigestCompositionBasis {
  identity: string;
  candidateSetBinding: { path: string; fileSha256: string };
  selectionAdoptionBinding: { path: string; fileSha256: string };
  captionManifestBinding: { path: string; fileSha256: string };
  producerBindings: UiReviewMaterials['bindings'];
}
export interface UiDigestSceneAdditionInput { draftIdentity: string; fingerprint: string; candidateId: string }
export interface UiDigestEditRequest {
  id: string; requestDraftId: string; draftIdentity: string; basis: UiDigestCompositionBasis;
  confirmationFingerprint: string; candidateId: string; beforeCandidateIds: string[];
  requestedCandidateIds: string[]; createdAt: string;
}
export interface UiDigestComposition {
  basis: UiDigestCompositionBasis;
  status: 'current' | 'revision_requested' | 'source_changed';
  currentCandidateIds: string[]; requestedCandidateIds: string[]; addedCandidateIds: string[];
  currentDurationMs: number; addedContextDurationMs: number; contextTotalUpperBoundMs: number;
  editRequestIds: string[];
}
export interface UiReviewMaterials {
  requestDraftId: string; draftIdentity: string; review?: ControlReviewItem; fingerprint: string;
  candidates: UiSavedCandidate[];
  recommendation?: { candidateId: string; reason: string; producerId: string; fileRefId: string; sha256: string };
  creationChecks?: {
    inputValidation: 'verified' | 'failed'; audioPreservation: 'unknown' | 'preserve-source-only'; sourceAudioReference: 'unknown' | 'registered';
    runtimeIdentity: string;
  };
  digestPreparation?: { status: 'not_registered' | 'verified' | 'rejected'; message: string };
  digestComposition?: UiDigestComposition;
  bindings: Array<{ producerId: string; outputId: string; fileRefId: string; sha256: string }>;
  segments: Array<{ startMs: number; endMs: number; caption: string; speechIds: number[]; displaySummary: string }>;
  blockers: string[];
}
