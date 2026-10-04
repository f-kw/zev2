/** Explicit one-job configuration. Authorization is independently supplied by the caller. */
import assert from 'node:assert/strict';
import {readFile, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';

export type Json = Record<string, any>;
export type DigestJobBindingV001 = {path: string; fileSha256: string; sizeBytes?: number; schemaVersion?: string; canonicalSha256?: string};
export const DIGEST_APPROVED_JOB_GUARD_V001 = Object.freeze({startBytes: 50_000_000_000,
  reserveBytes: 12_000_000_000, maximumRssBytes: 17_179_869_184, maximumPressure: 1,
  observationIntervalSeconds: 1, nextUnitPlusReserve: true, stopOwnProcessGroup: true, restartOnReconnect: false});
const H = /^[0-9a-f]{64}$/u, SHA1 = /^[0-9a-f]{40}$/u, ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const qualifiedJobs = new WeakSet<object>();
const exec = promisify(execFile);
export const digestJobSha256V001 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
export function digestJobRelativePathV001(value: unknown): string {
  assert(typeof value === 'string' && /^[A-Za-z0-9._\-/]+$/u.test(value)
    && !value.startsWith('/') && !value.split('/').some(p => ['', '.', '..'].includes(p)), 'APPROVED_JOB_PATH_INVALID');
  return value;
}
function exact(value: any, keys: string[], label: string) {
  assert(value && typeof value === 'object' && !Array.isArray(value), label);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), label);
}
function positive(value: unknown, label: string) {assert(Number.isSafeInteger(value) && Number(value) > 0, label);}
function absolute(value: unknown, label: string): asserts value is string {
  assert(typeof value === 'string' && path.isAbsolute(value) && path.normalize(value) === value
    && !value.includes('\0'), label);
}
export function validateDigestJobBindingV001(binding: any, absolutePath = false) {
  assert(binding && typeof binding === 'object' && !Array.isArray(binding) && H.test(binding.fileSha256), 'APPROVED_JOB_BINDING_INVALID');
  assert(Object.keys(binding).every(k => ['path','fileSha256','sizeBytes','schemaVersion','canonicalSha256'].includes(k)), 'APPROVED_JOB_BINDING_FIELDS');
  if (absolutePath) absolute(binding.path, 'APPROVED_JOB_ABSOLUTE_BINDING_REQUIRED'); else digestJobRelativePathV001(binding.path);
  if (binding.sizeBytes !== undefined) positive(binding.sizeBytes, 'APPROVED_JOB_BINDING_SIZE');
  if (binding.canonicalSha256 !== undefined) assert(H.test(binding.canonicalSha256));
  if (binding.schemaVersion !== undefined) assert(typeof binding.schemaVersion === 'string' && binding.schemaVersion.length > 0);
}

/** Pure validation never mints a storage/source capability or authorizes a process. */
export function validateDigestApprovedJobConfigurationV001(job: Json, authorization: Json,
  options: {workspaceRoot: string; jobBinding: DigestJobBindingV001; authorizationBinding: DigestJobBindingV001;
    trustedJobSha256: string; trustedAuthorizationSha256: string}) {
  const {workspaceRoot, jobBinding, authorizationBinding, trustedJobSha256, trustedAuthorizationSha256} = options;
  absolute(workspaceRoot, 'APPROVED_JOB_WORKSPACE_REQUIRED');
  validateDigestJobBindingV001(jobBinding, true); validateDigestJobBindingV001(authorizationBinding, true);
  positive(jobBinding.sizeBytes,'APPROVED_JOB_CONTROL_SIZE_REQUIRED');
  positive(authorizationBinding.sizeBytes,'APPROVED_JOB_CONTROL_SIZE_REQUIRED');
  assert(H.test(trustedJobSha256) && H.test(trustedAuthorizationSha256), 'INDEPENDENT_AUTHORIZATION_ANCHORS_REQUIRED');
  assert.equal(jobBinding.fileSha256, trustedJobSha256, 'APPROVED_JOB_ANCHOR_MISMATCH');
  assert.equal(authorizationBinding.fileSha256, trustedAuthorizationSha256, 'APPROVED_AUTHORIZATION_ANCHOR_MISMATCH');
  exact(job, ['schemaVersion','planId','outputRoot','inputs','storage','expected','implementation','guard','allocationBudget'], 'APPROVED_JOB_EXACT_FIELDS');
  assert.equal(job.schemaVersion, 'digest-approved-job-v001'); assert(ID.test(job.planId), 'APPROVED_JOB_PLAN_ID');
  const prefix = digestJobRelativePathV001(job.outputRoot);
  assert(prefix.startsWith('runtime/artifacts/') && prefix.split('/').length >= 4, 'APPROVED_JOB_OUTPUT_ROOT');
  exact(job.inputs, ['preparationParameters','preparationManifestBinding','candidateManifestBinding','typographySettingsBinding','rendererTemplateBinding'], 'APPROVED_JOB_INPUTS_REQUIRED');
  for (const k of ['preparationManifestBinding','candidateManifestBinding','typographySettingsBinding','rendererTemplateBinding']) validateDigestJobBindingV001(job.inputs[k]);
  assert(job.inputs.preparationParameters && typeof job.inputs.preparationParameters === 'object'
    && !Array.isArray(job.inputs.preparationParameters), 'APPROVED_JOB_PREPARATION_REQUIRED');
  exact(job.expected, ['frames','audioSamples','groups','atoms','cues'], 'APPROVED_JOB_EXPECTED_REQUIRED');
  for (const [k, v] of Object.entries(job.expected)) positive(v, 'APPROVED_JOB_EXPECTED_' + k);
  exact(job.allocationBudget, ['baseBuildBytes','rendererPreparationBytes'], 'APPROVED_JOB_ALLOCATION_BUDGET_REQUIRED');
  for (const v of Object.values(job.allocationBudget)) positive(v,'APPROVED_JOB_ALLOCATION_BUDGET_REQUIRED');
  assert.deepEqual(job.guard, DIGEST_APPROVED_JOB_GUARD_V001, 'APPROVED_JOB_SAFETY_BOUNDARY_CHANGED');
  exact(job.storage, ['guestRoot','guestVolumeUuid','hostRoot','hostVolumeUuid','imagePath','imageMaximumBytes','hostMetadataReserveBytes','internalRoot','guestDevice','hostDevice'], 'APPROVED_JOB_STORAGE_REQUIRED');
  const s = job.storage;
  for (const k of ['guestRoot','hostRoot','imagePath','internalRoot']) absolute(s[k], 'APPROVED_JOB_STORAGE_PATH');
  assert.equal(s.internalRoot, workspaceRoot, 'APPROVED_JOB_INTERNAL_ROOT_CHANGED');
  assert(s.guestRoot.startsWith('/Volumes/') && s.hostRoot.startsWith('/Volumes/')
    && s.guestRoot !== s.hostRoot && !s.guestRoot.startsWith(s.hostRoot + '/')
    && !s.hostRoot.startsWith(s.guestRoot + '/'), 'APPROVED_JOB_SEPARATE_VOLUMES_REQUIRED');
  assert(s.imagePath.startsWith(s.hostRoot + '/') && s.imagePath.endsWith('.sparsebundle'), 'APPROVED_JOB_BACKING_IMAGE_REQUIRED');
  for (const k of ['guestVolumeUuid','hostVolumeUuid']) assert(/^[0-9A-F]{8}-(?:[0-9A-F]{4}-){3}[0-9A-F]{12}$/u.test(s[k]), 'APPROVED_JOB_VOLUME_UUID');
  for (const k of ['guestDevice','hostDevice','imageMaximumBytes','hostMetadataReserveBytes']) positive(s[k], 'APPROVED_JOB_STORAGE_' + k);
  assert(s.guestDevice !== s.hostDevice && s.imageMaximumBytes > job.guard.startBytes, 'APPROVED_JOB_DISTINCT_DEVICE_AND_CAPACITY');
  exact(job.implementation, ['sha','bindings','nodeBinding'], 'APPROVED_JOB_IMPLEMENTATION_REQUIRED');
  validateDigestJobBindingV001(job.implementation.nodeBinding,true);
  assert.equal(path.basename(job.implementation.nodeBinding.path),'node','APPROVED_JOB_NODE_BINDING_REQUIRED');
  assert(SHA1.test(job.implementation.sha) && Array.isArray(job.implementation.bindings) && job.implementation.bindings.length > 0, 'APPROVED_JOB_IMPLEMENTATION_REQUIRED');
  for (const b of job.implementation.bindings) validateDigestJobBindingV001(b);
  assert.equal(new Set(job.implementation.bindings.map((b: Json) => b.path)).size, job.implementation.bindings.length, 'APPROVED_JOB_DUPLICATE_CODE_BINDING');
  for (const required of ['runner/src/digest-approved-job-v001.ts','runner/src/digest-approved-job-runner-v001.ts',
    'runner/src/digest-approved-inputs-v001.ts','runner/src/digest-formal-handoff-v001.ts',
    'evals/clip_composition/adopted_media_manufacturing_v001.mts','evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
    'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts','evals/clip_composition/render_presentation_v002.mjs',
    'tools/digest-quality/original-resolution-low-memory-composite.mjs','tools/digest-quality/original-resolution-full-supervisor-v002.py'])
    assert(job.implementation.bindings.some((b: Json) => b.path === required), 'APPROVED_JOB_MISSING_CODE_BINDING ' + required);
  exact(authorization, ['schemaVersion','recordId','userApproval','actions','jobBinding','planId','manifestBinding',
    'typographySettingsBinding','outputRoot','storage','guard','implementation','normalCandidates'], 'APPROVED_AUTHORIZATION_EXACT_FIELDS');
  assert.equal(authorization.schemaVersion, 'digest-approved-job-authorization-v001'); assert(ID.test(authorization.recordId));
  exact(authorization.userApproval, ['at','messageId','text','sourceThreadId'], 'APPROVED_USER_EVIDENCE_REQUIRED');
  const user = authorization.userApproval;
  assert(typeof user.at === 'string' && Number.isFinite(Date.parse(user.at)) && /(?:Z|\+00:00)$/u.test(user.at), 'APPROVED_USER_TIME_REQUIRED');
  for (const k of ['messageId','text','sourceThreadId']) assert(typeof user[k] === 'string' && user[k].trim().length > 0, 'APPROVED_USER_EVIDENCE_REQUIRED');
  assert.deepEqual(authorization.actions, ['manufacture-one-approved-plan']); assert.equal(authorization.normalCandidates, 1);
  assert.deepEqual(authorization.jobBinding, jobBinding, 'APPROVED_AUTHORIZATION_JOB_MISMATCH');
  for (const k of ['planId','outputRoot','storage','guard','implementation']) assert.deepEqual(authorization[k], job[k], 'APPROVED_AUTHORIZATION_' + k + '_MISMATCH');
  assert.deepEqual(authorization.manifestBinding, job.inputs.candidateManifestBinding, 'APPROVED_AUTHORIZATION_MANIFEST_MISMATCH');
  assert.deepEqual(authorization.typographySettingsBinding, job.inputs.typographySettingsBinding, 'APPROVED_AUTHORIZATION_SETTINGS_MISMATCH');
  return Object.freeze({status: 'validated-configuration', planId: job.planId, expected: structuredClone(job.expected)});
}

async function readBytes(binding: DigestJobBindingV001, root: string, absolutePath = false): Promise<Buffer> {
  validateDigestJobBindingV001(binding, absolutePath);
  const absolutePathValue = absolutePath ? binding.path : path.join(root, binding.path);
  assert(absolutePathValue.startsWith(root + '/'), 'APPROVED_JOB_REPOSITORY_BOUND_INPUT_REQUIRED');
  assert.equal(await realpath(absolutePathValue), absolutePathValue, 'APPROVED_JOB_SYMLINK_REFERENCE');
  const before = await lstat(absolutePathValue, {bigint: true}); assert(before.isFile() && !before.isSymbolicLink());
  const first = await readFile(absolutePathValue), second = await readFile(absolutePathValue);
  const after = await lstat(absolutePathValue, {bigint: true});
  assert(first.equals(second) && before.ino === after.ino && before.dev === after.dev && before.size === after.size
    && before.mtimeNs === after.mtimeNs && before.ctimeNs === after.ctimeNs, 'APPROVED_JOB_UNSTABLE_REFERENCE');
  assert.equal(digestJobSha256V001(first), binding.fileSha256, 'APPROVED_JOB_ACTUAL_HASH_CHANGED');
  if (binding.sizeBytes !== undefined) assert.equal(first.length, binding.sizeBytes);
  return first;
}
function freeze(value: any) {if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze); Object.freeze(value);}}
export async function readQualifiedDigestApprovedJobV001(externalOptions: Parameters<typeof validateDigestApprovedJobConfigurationV001>[2]) {
  // All future revalidation uses the same immutable anchors as the first read.
  const options=structuredClone(externalOptions); freeze(options);
  const root = await realpath(options.workspaceRoot); assert.equal(root, options.workspaceRoot);
  assert.equal(root, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), 'APPROVED_JOB_IMPLEMENTATION_WORKSPACE_REQUIRED');
  const [jobBytes, approvalBytes] = await Promise.all([readBytes(options.jobBinding, root, true), readBytes(options.authorizationBinding, root, true)]);
  const controlIdentities=await Promise.all([lstat(options.jobBinding.path,{bigint:true}),lstat(options.authorizationBinding.path,{bigint:true})]);
  const job: Json = JSON.parse(jobBytes.toString()), authorization: Json = JSON.parse(approvalBytes.toString());
  validateDigestApprovedJobConfigurationV001(job, authorization, options);
  const readBinding = async (binding: DigestJobBindingV001): Promise<Json> => {
    const bytes = await readBytes(binding, root), value = JSON.parse(bytes.toString());
    assert(value && typeof value === 'object' && !Array.isArray(value));
    if (binding.schemaVersion !== undefined) assert.equal(value.schemaVersion, binding.schemaVersion);
    if (binding.canonicalSha256 !== undefined) {
      const {canonicalSha} = await import(pathToFileURL(path.join(root,'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts')).href);
      assert.equal(canonicalSha(value), binding.canonicalSha256);
    }
    return value;
  };
  const assertCurrent = async () => {
    await Promise.all([readBytes(options.jobBinding, root, true), readBytes(options.authorizationBinding, root, true)]);
    for(const [index,binding] of [options.jobBinding,options.authorizationBinding].entries()) {
      const now=await lstat(binding.path,{bigint:true});
      for(const key of ['ino','dev','size','mtimeNs','ctimeNs'] as const) assert.equal(now[key],controlIdentities[index][key],'APPROVED_JOB_CONTROL_IDENTITY_CHANGED');
    }
    assert.equal((await exec('git', ['rev-parse','HEAD'], {cwd: root})).stdout.trim(), job.implementation.sha, 'APPROVED_JOB_IMPLEMENTATION_HEAD_CHANGED');
    for (const binding of job.implementation.bindings) await readBytes(binding, root);
  };
  freeze(job); freeze(authorization);
  const qualified = Object.freeze({job, authorization, jobBinding: Object.freeze({...options.jobBinding}),
    authorizationBinding: Object.freeze({...options.authorizationBinding}), workspaceRoot: root, readBinding, assertCurrent});
  qualifiedJobs.add(qualified); await assertCurrent(); return qualified;
}
export async function assertQualifiedDigestApprovedJobV001(qualified: unknown): Promise<void> {
  assert(qualified && typeof qualified === 'object' && qualifiedJobs.has(qualified), 'QUALIFIED_APPROVED_DIGEST_JOB_REQUIRED');
  await (qualified as Json).assertCurrent();
}
