import type { WebGeminiReviewState, Zev2State } from '@zev2/shared';

export function webGeminiReviewStateForDraft(
  state: Zev2State,
  draftId: string
): WebGeminiReviewState | undefined {
  return state.webGeminiReviews.find((entry) => entry.draftId === draftId);
}

export function upsertWebGeminiReviewState(
  state: Zev2State,
  draftId: string,
  patch: Partial<Omit<WebGeminiReviewState, 'draftId' | 'updatedAt'>>,
  updatedAt: string
): WebGeminiReviewState {
  const existing = webGeminiReviewStateForDraft(state, draftId);
  if (existing) {
    Object.assign(existing, patch);
    existing.updatedAt = updatedAt;
    return existing;
  }

  const created: WebGeminiReviewState = {
    draftId,
    review: null,
    revisionBrief: null,
    runLog: null,
    promptText: '',
    ...patch,
    updatedAt
  };
  state.webGeminiReviews.push(created);
  return created;
}
