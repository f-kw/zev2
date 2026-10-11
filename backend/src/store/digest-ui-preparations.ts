import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DigestByteBindingV001 } from '@zev2/shared';
import type { DigestCaptionPreparationParametersV001 } from '@zev2/agent-runner/digest-readonly';
import { resolveRuntimeDir } from '../config/runtime-dir.js';

// Consumer references only. This record grants no producer, approval or manufacturing authority.
export interface DigestUiPreparationRegistration {
  requestDraftId: string;
  draftIdentity: string;
  parameters: Omit<DigestCaptionPreparationParametersV001, 'workspaceRoot'>;
  manifestBinding: DigestByteBindingV001;
  registeredAt: string;
}
const schemaVersion = 'ui-digest-preparation-references-v001';
function storePath() { return path.join(resolveRuntimeDir(), 'ui-digest-preparations.json'); }
export async function loadDigestUiPreparations(): Promise<DigestUiPreparationRegistration[]> {
  let value;
  try { value = JSON.parse(await readFile(storePath(), 'utf8')); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
  if (value?.schemaVersion !== schemaVersion || !Array.isArray(value.registrations)
    || value.registrations.some((r: DigestUiPreparationRegistration) => !r || typeof r.requestDraftId !== 'string'
      || typeof r.draftIdentity !== 'string' || !r.parameters || !r.manifestBinding || typeof r.registeredAt !== 'string')
    || new Set(value.registrations.map((r: DigestUiPreparationRegistration) => r.requestDraftId)).size !== value.registrations.length) {
    throw new Error('Digest確認資料の登録簿が不正です');
  }
  return value.registrations;
}
/** Caller holds the existing state operation queue, after all reader qualifications. */
export async function saveDigestUiPreparation(registration: DigestUiPreparationRegistration): Promise<DigestUiPreparationRegistration> {
  const entries = await loadDigestUiPreparations(), prior = entries.find(r => r.requestDraftId === registration.requestDraftId);
  if (prior && JSON.stringify({ ...prior, registeredAt: '' }) === JSON.stringify({ ...registration, registeredAt: '' })) return prior;
  const registrations = [...entries.filter(r => r.requestDraftId !== registration.requestDraftId), registration];
  const destination = storePath(), temporary = destination + '.tmp';
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(temporary, JSON.stringify({ schemaVersion, registrations }, null, 2) + '\n');
  await rename(temporary, destination);
  return registration;
}
