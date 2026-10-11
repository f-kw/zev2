import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RuntimeConfig, Zev2State } from '@zev2/shared';
import { resolveRuntimeDir } from '../config/runtime-dir.js';
import { workspaceRoot } from '../config/runtime-config.js';
import { loadDigestUiEditRequests } from '../store/digest-ui-edit-requests.js';
import { readUiReviewMaterials } from './ui-review.js';

type Obj = Record<string, any>;
type Binding = { path: string; fileSha256: string };
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2) + '\n');

/** One current chain, two small immutable JSON files. No new ledger, producer registration or execution grant. */
async function reconstruct(state: Zev2State, draftId: string, config: RuntimeConfig) {
  assert(/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(draftId), '構成データの依頼IDが不正です');
  const { materials: m, digestQualification: q } = await readUiReviewMaterials(state, draftId, config);
  const c = m.digestComposition;
  assert(q && m.digestPreparation?.status === 'verified' && c?.status === 'revision_requested', '現在の追加要求chainと元資料を照合できません');
  const requests = (await loadDigestUiEditRequests()).filter(r => r.requestDraftId === draftId);
  assert(requests.length, '保存した人間の追加要求がありません');
  assert.deepEqual(requests.map(r => r.id), c.editRequestIds, '保存した人間の追加要求chainが変更されています');
  for (const r of requests) {
    assert.equal(r.draftIdentity, m.draftIdentity, '追加要求の依頼が一致しません');
    assert.deepEqual(r.basis, c.basis, '追加要求の元資料が一致しません');
  }
  assert.deepEqual(requests[0]!.beforeCandidateIds, c.currentCandidateIds, '追加前の全体構成が一致しません');
  assert.deepEqual(requests.at(-1)!.requestedCandidateIds, c.requestedCandidateIds, '追加後の全体構成が一致しません');
  // Reuse the existing closed candidate resolver; never promote a human choice through an AI-selection token.
  const root = workspaceRoot();
  const selection = await import(pathToFileURL(path.join(root, 'evals/clip_composition/candidate_selection_validation_v001.mts')).href);
  const parents = selection.resolveSelectionCandidatesV001({ candidateSet: q.candidates, transcript: q.transcript, utterances: q.utterances,
    plan: { request: { sourceId: q.candidates.sourceId, sourceVideo: q.candidates.sourceVideoBinding,
      transcript: q.candidates.transcriptBinding, utterances: q.candidates.utteranceBinding } } }) as Obj[];
  assert.deepEqual(parents.filter(p => c.requestedCandidateIds.includes(p.candidateId)).map(p => p.candidateId), c.requestedCandidateIds,
    '全体構成の候補所属・元順が一致しません');
  const original = new Map<string, Obj>([...q.selection.adoptedCandidates, ...q.selection.rejectedCandidates].map((p: Obj) => [p.candidateId, p]));
  const snapshot = { schemaVersion: 'ui-digest-human-request-snapshot-v001', requestDraftId: draftId, draftIdentity: m.draftIdentity,
    confirmationFingerprint: m.fingerprint, sourceBasis: c.basis, requests };
  const requestHash = sha(bytes(snapshot));
  const file = (kind: 'snapshot' | 'composition') => `artifacts/${draftId}/ui-composition-${requestHash}--${kind}.json`;
  const snapshotBinding = { path: file('snapshot'), fileSha256: requestHash };
  const composition = { schemaVersion: 'ui-digest-human-composition-data-v001', status: 'composition-data-only',
    requestDraftId: draftId, draftIdentity: m.draftIdentity, requestHash, snapshotBinding,
    representedEditRequestIds: requests.map(r => r.id), beforeCandidateIds: c.currentCandidateIds, requestedCandidateIds: c.requestedCandidateIds,
    originalAiSelectionBinding: c.basis.selectionAdoptionBinding,
    scenes: parents.filter(p => c.requestedCandidateIds.includes(p.candidateId)).map(p => {
      const previous = original.get(p.candidateId);assert(previous?.judgment, '元AI採否の来歴がありません');
      const addition = requests.find(r => r.candidateId === p.candidateId);
      assert(addition || c.currentCandidateIds.includes(p.candidateId), '全体構成の人間要求・原採用がありません');
      return { candidateId: p.candidateId, title: p.title, sourceId: p.sourceId,
        inclusion: addition ? { kind: 'human-addition', editRequestId: addition.id } : { kind: 'original-ai-adoption' },
        originalAiJudgment: previous.judgment,
        candidateContext: { includedUtteranceIds: p.includedUtteranceIds, sourceSegmentIds: p.sourceSegmentIds, sourceInterval: p.sourceInterval } };
    }),
    admission: { sourceRanges: 'candidate-context-only', retention: 'not-prepared', captionPreparation: 'not-prepared',
      executionPermission: 'not-approved', humanQuality: 'pending' } };
  const compositionBinding = { path: file('composition'), fileSha256: sha(bytes(composition)) };
  const runtime = await realpath(resolveRuntimeDir()), directory = path.join(runtime, 'artifacts', draftId);
  assert.equal(await realpath(directory), directory, '構成データの既存出力先が変更されています');
  const stable = await import(pathToFileURL(path.join(root, 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs')).href);
  const read = (binding: Binding) => stable.readPresentationMeaningWorkspaceFileStableV001({ workspaceRoot: runtime, relativePath: binding.path }) as Promise<Buffer>;
  return { m, snapshot, composition, snapshotBinding, compositionBinding, requestHash, runtime, read };
}
function result(r: Awaited<ReturnType<typeof reconstruct>>) {
  return { status: 'composition-data-only' as const, requestDraftId: r.m.requestDraftId, requestHash: r.requestHash,
    snapshotBinding: r.snapshotBinding, compositionBinding: r.compositionBinding,
    representedEditRequestIds: r.composition.representedEditRequestIds, composition: r.composition };
}

/** Called only in the existing human-authenticated operation queue. Does not change state, requests or UI preparation. */
export async function saveDigestUiCompositionData(state: Zev2State, draftId: string, config: RuntimeConfig, input: unknown) {
  const b = input as Obj;
  assert(b && typeof b === 'object' && !Array.isArray(b) && Object.keys(b).length === 2
    && ['draftIdentity', 'fingerprint'].every(k => Object.hasOwn(b, k)), '構成データ確認の項目が一致しません');
  const r = await reconstruct(state, draftId, config);
  assert.equal(b.draftIdentity, r.m.draftIdentity, '表示した依頼が変更されています');
  assert.equal(b.fingerprint, r.m.fingerprint, '表示した追加要求chainが変更されています');
  const outputs = [[r.snapshotBinding, r.snapshot], [r.compositionBinding, r.composition]] as const;
  const missing: Array<{ binding: Binding; data: Buffer }> = [];
  // Check both existing files before any write; an altered or symlinked partial never authorizes repair/overwrite.
  for (const [binding, value] of outputs) {
    const absolute = path.join(r.runtime, binding.path), data = bytes(value);
    let info;
    try { info = await lstat(absolute); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    if (info) {
      assert(info.isFile() && !info.isSymbolicLink() && await realpath(absolute) === absolute, '構成データ参照が不正です');
      assert.deepEqual(await r.read(binding), data, '保存構成データが改変されています');
    } else missing.push({ binding, data });
  }
  for (const { binding, data } of missing) await writeFile(path.join(r.runtime, binding.path), data, { flag: 'wx' });
  for (const [binding, value] of outputs) assert.deepEqual(await r.read(binding), bytes(value), '保存構成データの再読が一致しません');
  return result(r);
}

/** New-process readback reconstructs the same current chain and candidate graph. No writes or provider calls. */
export async function readDigestUiCompositionData(state: Zev2State, draftId: string, config: RuntimeConfig, requestHash: string) {
  assert(/^[0-9a-f]{64}$/u.test(requestHash), '構成データの要求hashが不正です');
  const r = await reconstruct(state, draftId, config);
  assert.equal(requestHash, r.requestHash, '構成データの要求chain・元資料が変更されています');
  for (const [binding, value] of [[r.snapshotBinding, r.snapshot], [r.compositionBinding, r.composition]] as const)
    assert.deepEqual(await r.read(binding), bytes(value), '保存構成データの再読が一致しません');
  return result(r);
}
