import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { UiDigestCompositionBasis, UiDigestEditRequest, UiReviewMaterials } from '@zev2/shared';
import { appendDigestUiEditRequest, loadDigestUiEditRequests } from '../store/digest-ui-edit-requests.js';

const same = (a: unknown, b: unknown) => assert.deepEqual(a, b, '保存した編集要求と現在の構成が一致しません');
const candidateOrder = (model: UiReviewMaterials, ids: string[]) => model.candidates.filter(c => ids.includes(c.id)).map(c => c.id);
function context(model: UiReviewMaterials, id: string) {
  const c = model.candidates.find(v => v.id === id);assert(c?.ranges.length, '保存候補の元区間がありません');
  const start = Math.min(...c.ranges.map(r => r.startMs)), end = Math.max(...c.ranges.map(r => r.endMs));
  assert(Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start, '保存候補の元時計が不正です');
  return { start, end };
}
function assertAddition(model: UiReviewMaterials, before: string[], id: string) {
  assert(model.candidates.some(c => c.id === id), '選んだ場面が現在の保存候補にありません');
  const proposed = context(model, id);
  assert(before.every(other => { const prior = context(model, other);return proposed.end <= prior.start || prior.end <= proposed.start; }),
    'この場面は現在の構成と元区間が重複しています。対象を明示した構成見直しが必要です');
}
export async function populateDigestRequestedComposition(model: UiReviewMaterials, basis: UiDigestCompositionBasis,
  currentCandidateIds: string[], currentDurationMs: number) {
  same(candidateOrder(model, currentCandidateIds), currentCandidateIds);
  const all = (await loadDigestUiEditRequests()).filter(r => r.requestDraftId === model.requestDraftId);
  const matching = all.filter(r => r.draftIdentity === model.draftIdentity && r.basis.identity === basis.identity);
  let requested = [...currentCandidateIds];
  for (const r of matching) {
    same(r.basis, basis);same(r.beforeCandidateIds, requested);assertAddition(model, requested, r.candidateId);
    requested = candidateOrder(model, [...requested, r.candidateId]);same(r.requestedCandidateIds, requested);
  }
  const changedSource = all.some(r => r.draftIdentity !== model.draftIdentity || r.basis.identity !== basis.identity);
  const added = requested.filter(id => !currentCandidateIds.includes(id));
  const addedContextDurationMs = added.reduce((sum, id) => { const c = context(model, id);return sum + c.end - c.start; }, 0);
  model.digestComposition = { basis, status: changedSource ? 'source_changed' : matching.length ? 'revision_requested' : 'current',
    currentCandidateIds, requestedCandidateIds: requested, addedCandidateIds: added, currentDurationMs,
    addedContextDurationMs, contextTotalUpperBoundMs: currentDurationMs + addedContextDurationMs, editRequestIds: all.map(r => r.id) };
  if (model.digestComposition.status !== 'current') {
    model.creationChecks!.inputValidation = 'failed';
    model.blockers.push(changedSource ? '保存した編集要求の元資料が変わっています。新しい正式計画との対応確認が必要です。'
      : '場面追加の編集要求を保存しました。変更後の正式な新版準備・再照合は未接続です。旧準備では作成前確認へ進めません。');
  }
}
/** Saves a human request only. No approve/review/claim/provider/prepare/manufacture call. */
export async function saveDigestSceneAddition(model: UiReviewMaterials, input: unknown) {
  const b = input as Record<string, unknown>;
  assert(b && typeof b === 'object' && !Array.isArray(b) && Object.keys(b).length === 3
    && ['draftIdentity','fingerprint','candidateId'].every(k => Object.hasOwn(b, k)), '場面追加の入力項目が一致しません');
  assert(typeof b.candidateId === 'string' && b.candidateId && typeof b.fingerprint === 'string'
    && b.draftIdentity === model.draftIdentity, '表示した依頼が変更されています');
  const composition = model.digestComposition;
  assert(model.digestPreparation?.status === 'verified' && composition && composition.status !== 'source_changed', '現在の構成と保存候補を照合できません');
  const prior = (await loadDigestUiEditRequests()).find(r => r.requestDraftId === model.requestDraftId
    && r.draftIdentity === model.draftIdentity && r.basis.identity === composition.basis.identity && r.candidateId === b.candidateId);
  // An identical retried save returns its existing record, after the formal readers have requalified the same base.
  if (prior && prior.confirmationFingerprint === b.fingerprint) return { changed: false, editRequest: prior };
  assert(b.fingerprint === model.fingerprint, '表示した構成・候補・編集要求が変更されています。再読み込みしてください');
  if (composition.requestedCandidateIds.includes(b.candidateId)) return { changed: false, editRequest: prior };
  assertAddition(model, composition.requestedCandidateIds, b.candidateId);
  const editRequest: UiDigestEditRequest = { id: `digest-edit-${randomUUID()}`, requestDraftId: model.requestDraftId,
    draftIdentity: model.draftIdentity, basis: composition.basis, confirmationFingerprint: b.fingerprint, candidateId: b.candidateId,
    beforeCandidateIds: composition.requestedCandidateIds, requestedCandidateIds: candidateOrder(model, [...composition.requestedCandidateIds, b.candidateId]),
    createdAt: new Date().toISOString() };
  await appendDigestUiEditRequest(editRequest);return { changed: true, editRequest };
}
