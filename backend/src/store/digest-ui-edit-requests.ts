import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import type { UiDigestEditRequest } from '@zev2/shared';
import { resolveRuntimeDir } from '../config/runtime-dir.js';

const schemaVersion = 'ui-digest-human-edit-requests-v001';
function storePath() { return path.join(resolveRuntimeDir(), 'ui-digest-edit-requests.json'); }
function exact(v: any, keys: string[]) {
  assert(v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === keys.length
    && keys.every(k => Object.hasOwn(v, k)), '保存した編集要求の項目が不正です');
}
function text(v: unknown) { assert(typeof v === 'string' && v.length, '保存した編集要求が不足しています'); }
function ids(v: unknown) { assert(Array.isArray(v) && v.every(x => typeof x === 'string' && x.length)
  && new Set(v).size === v.length, '保存した編集要求の候補が不正です'); }
function validate(r: UiDigestEditRequest) {
  exact(r, ['id','requestDraftId','draftIdentity','basis','confirmationFingerprint','candidateId','beforeCandidateIds','requestedCandidateIds','createdAt']);
  for (const v of [r.id,r.requestDraftId,r.draftIdentity,r.confirmationFingerprint,r.candidateId,r.createdAt]) text(v);
  ids(r.beforeCandidateIds);ids(r.requestedCandidateIds);
  assert(!r.beforeCandidateIds.includes(r.candidateId) && r.requestedCandidateIds.length === r.beforeCandidateIds.length + 1
    && r.requestedCandidateIds.includes(r.candidateId) && r.beforeCandidateIds.every(id => r.requestedCandidateIds.includes(id)), '保存した編集要求は一場面の追加ではありません');
  exact(r.basis, ['identity','candidateSetBinding','selectionAdoptionBinding','captionManifestBinding','producerBindings']);
  assert(/^[0-9a-f]{64}$/u.test(r.basis.identity), '保存した編集要求の版が不正です');
  for (const b of [r.basis.candidateSetBinding,r.basis.selectionAdoptionBinding,r.basis.captionManifestBinding]) {
    exact(b, ['path','fileSha256']);text(b.path);assert(/^[0-9a-f]{64}$/u.test(b.fileSha256), '保存した編集要求の参照が不正です');
  }
  assert(Array.isArray(r.basis.producerBindings) && r.basis.producerBindings.length === 2, '保存した編集要求の制作参照が不足しています');
  for (const b of r.basis.producerBindings) {
    exact(b, ['producerId','outputId','fileRefId','sha256']);text(b.producerId);text(b.outputId);text(b.fileRefId);
    assert(/^[0-9a-f]{64}$/u.test(b.sha256), '保存した編集要求の制作SHAが不正です');
  }
}
export async function loadDigestUiEditRequests(): Promise<UiDigestEditRequest[]> {
  let data;
  try { data = JSON.parse(await readFile(storePath(), 'utf8')); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];throw e; }
  exact(data, ['schemaVersion','requests']);assert(data.schemaVersion === schemaVersion && Array.isArray(data.requests), '編集要求の保存形式が不正です');
  data.requests.forEach(validate);
  assert(new Set(data.requests.map((r: UiDigestEditRequest) => r.id)).size === data.requests.length, '編集要求が重複しています');
  return data.requests;
}
/** Caller holds the existing state operation queue. Append only; never changes state/producer records. */
export async function appendDigestUiEditRequest(request: UiDigestEditRequest): Promise<void> {
  validate(request);
  const requests = await loadDigestUiEditRequests();assert(!requests.some(r => r.id === request.id), '編集要求が重複しています');
  const destination = storePath();await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination + '.tmp', JSON.stringify({ schemaVersion, requests: [...requests, request] }, null, 2) + '\n');
  await rename(destination + '.tmp', destination);
}
