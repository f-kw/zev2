import assert from 'node:assert/strict';
import type { RuntimeConfig, UiReviewMaterials, UiDigestRevisionView, Zev2State } from '@zev2/shared';
import { loadDigestUiPreparations, saveDigestUiPreparation, type DigestUiRevisionReference } from '../store/digest-ui-preparations.js';
import { readUiReviewMaterials } from './ui-review.js';
import { readDigestUiRevision } from './digest-ui-revision-preparation.js';

type Obj = Record<string, any>;
const ADMISSION = { captionDisplayAnswers: 'unanswered' as const, executionPermission: 'not-approved' as const, humanQuality: 'pending' as const };
function exact(value: unknown, keys: string[]): Obj {
  assert(value && typeof value === 'object' && !Array.isArray(value), '新版準備の参照が不足しています');
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), '新版準備参照の項目が一致しません');return value as Obj;
}

/** An explicit production-data caller registers only a reference in the existing UI preparation record. */
export async function registerDigestUiRevisionReference(state: Zev2State, draftId: string, config: RuntimeConfig, requestHash: string, value: unknown) {
  const b = exact(value, ['draftIdentity', 'fingerprint', 'outputRoot', 'manifestBinding']);
  const binding = exact(b.manifestBinding, ['path', 'fileSha256']);
  assert(typeof b.outputRoot === 'string' && typeof binding.path === 'string' && typeof binding.fileSha256 === 'string'
    && /^[0-9a-f]{64}$/u.test(binding.fileSha256), '新版準備参照の値が不正です');
  // Internal readUiReviewMaterials is baseline-only. The human display suffix never changes the preparation fingerprint.
  const { materials: m } = await readUiReviewMaterials(state, draftId, config);
  assert.equal(b.draftIdentity, m.draftIdentity, '新版準備参照の依頼が変更されています');
  assert.equal(b.fingerprint, m.fingerprint, '新版準備参照の編集要求が変更されています');
  const revision = await readDigestUiRevision(state, draftId, config, requestHash, b.outputRoot, binding.fileSha256);
  assert.deepEqual(revision.manifestBinding, binding, '新版準備のmanifest参照が一致しません');
  assert.deepEqual(revision.manifest.representedEditRequestIds, m.digestComposition?.editRequestIds, '新版準備と編集要求の対応が一致しません');
  const normal = (await loadDigestUiPreparations()).find(r => r.requestDraftId === draftId);
  assert(normal && normal.draftIdentity === m.draftIdentity, '現在の基準準備参照がありません');
  const humanRevision: DigestUiRevisionReference = { requestHash, outputRoot: b.outputRoot, manifestBinding: revision.manifestBinding };
  await saveDigestUiPreparation({ ...normal, humanRevision });
  return { status: 'reference-saved' as const, requestDraftId: draftId, requestHash, preparationHash: binding.fileSha256 };
}

/** Every human read requalifies the manifest and all outputs; no applied flag/receipt ledger or UI authority is stored. */
export async function populateDigestUiRevisionView(state: Zev2State, m: UiReviewMaterials, config: RuntimeConfig): Promise<void> {
  const ref = (await loadDigestUiPreparations()).find(r => r.requestDraftId === m.requestDraftId)?.humanRevision;
  if (!ref) return;
  const common = { requestDraftId: m.requestDraftId, draftIdentity: m.draftIdentity, fingerprint: m.fingerprint,
    requestHash: ref.requestHash, preparationHash: ref.manifestBinding.fileSha256, admission: ADMISSION };
  try {
    assert(m.digestPreparation?.status === 'verified' && m.digestComposition?.status === 'revision_requested', '現在の追加要求は未照合です');
    const revision = await readDigestUiRevision(state, m.requestDraftId, config, ref.requestHash, ref.outputRoot, ref.manifestBinding.fileSha256);
    assert.deepEqual(revision.manifestBinding, ref.manifestBinding, '新版準備参照が一致しません');
    assert.deepEqual(revision.manifest.representedEditRequestIds, m.digestComposition.editRequestIds, '編集要求の集合・順が変わっています');
    const retention = revision.outputs['revision-retention.json']!, edit = revision.outputs['revision-edit-plan.json']!,
      meaning = revision.outputs['meaning-input.json']!, clock = revision.outputs['revision-clock-resolution.json']!.resolution;
    assert.deepEqual(retention.scenes.map((s: Obj) => s.candidateId), m.digestComposition.requestedCandidateIds, '新版構成のsceneが変わっています');
    const appliedEdits = m.digestComposition.editRequestIds.map(id => {
      const scene = (retention.scenes as Obj[]).find(s => s.inclusion.kind === 'human-addition' && s.inclusion.editRequestId === id);
      const candidate = m.candidates.find(c => c.id === scene?.candidateId);
      assert(scene && candidate && candidate.title === scene.title, '追加要求と新版場面が対応していません');
      return { id, candidateId: candidate.id, title: candidate.title };
    });
    assert.equal(new Set(appliedEdits.map(a => a.candidateId)).size, m.digestComposition.addedCandidateIds.length, '追加sceneの対応が不足しています');
    assert(appliedEdits.every(a => m.digestComposition!.addedCandidateIds.includes(a.candidateId)), '別の追加sceneが混ざっています');
    const atoms = new Map<number, Obj>((meaning.atomOccurrences as Obj[]).map(a => [a.sourceSegmentId, a]));
    const segments: UiReviewMaterials['segments'] = (edit.segments as Obj[]).map(s => ({ startMs: s.sourceStartMs, endMs: s.sourceEndMs,
      speechIds: [...s.sourceSegmentIds], caption: s.sourceSegmentIds.map((id: number) => { const a = atoms.get(id);assert(a, '新版本文が不足しています');return a.text; }).join(''),
      displaySummary: '追加後の保持本文。字幕の表示判断と描画はまだです。' }));
    const durationMs = clock.mappings.at(-1)?.outputEndFrame * 1000 / 30;
    assert(Number.isFinite(durationMs) && durationMs > 0, '新版の予定尺が不足しています');
    // Presentation replaces only obsolete data-preparation messages; server blockers/gates stay untouched.
    const obsolete = new Set(['場面追加の編集要求を保存しました。変更後の正式な新版準備・再照合は未接続です。旧準備では作成前確認へ進めません。',
      ...appliedEdits.map(a => `追加場面「${a.title}」の保持判断は未回答です。要求を準備・保存しても判断処理は実行しません。`)]);
    const remainingChecks = [...m.blockers.filter(b => !obsolete.has(b)), '追加後の字幕の表示判断は未回答です。動画作成は始めません。'];
    const view: UiDigestRevisionView = { ...common, status: 'verified', message: '保存した追加要求を、現在の新版準備資料への反映として再照合しました。',
      representedEditRequestIds: [...m.digestComposition.editRequestIds], candidateIds: [...m.digestComposition.requestedCandidateIds],
      appliedEdits, segments, durationMs, remainingChecks };
    m.digestRevision = view;
  } catch {
    m.digestRevision = { ...common, status: 'rejected', message: '保存した新版資料は現在の依頼・構成に対応していません。反映済みとは扱えません。',
      representedEditRequestIds: [], candidateIds: [], appliedEdits: [], segments: [], remainingChecks: [...m.blockers] };
  }
}
