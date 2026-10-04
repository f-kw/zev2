/** Record-only completion of one hash-bound pending Digest result. This entry never renders media. */
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream, constants} from 'node:fs';
import {readFile, lstat, realpath, mkdir, open, chmod, link, unlink, rmdir, copyFile, statfs} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readQualifiedDigestApprovedJobV001, assertQualifiedDigestApprovedJobV001,
  validateDigestJobBindingV001, digestJobRelativePathV001, type Json, type DigestJobBindingV001} from './digest-approved-job-v001.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exec = promisify(execFile), contexts = new WeakMap<object, Json>();
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const loadShared = () => import(pathToFileURL(path.join(ROOT, 'evals/clip_composition/digest_representative_completion_v001.mjs')).href);
type JobOptions = Parameters<typeof readQualifiedDigestApprovedJobV001>[0];
export type DigestApprovedRecordFinalizeOptionsV001 = JobOptions & {
  pendingReceiptBinding: DigestJobBindingV001; trustedPendingReceiptSha256: string;
  registrationBinding?: DigestJobBindingV001; trustedRegistrationSha256?: string;
};
const H = /^[a-f0-9]{64}$/u;
function freeze(v: any) {if (v && typeof v === 'object') {Object.values(v).forEach(freeze); Object.freeze(v);} return v;}
function exact(v: any, keys: string[], label: string) {
  assert(v && typeof v === 'object' && !Array.isArray(v), label);
  assert.deepEqual(Object.keys(v).sort(), [...keys].sort(), label);
}
function canonical(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}
const same = (a: any, b: any, label: string) => assert.equal(canonical(a), canonical(b), label);
const formal = (v: any) => Buffer.from(JSON.stringify(v, null, 2) + '\n');
function byteBinding(b: any, absolute: boolean) {
  exact(b, ['path', 'fileSha256', 'sizeBytes'], 'RECORD_BYTE_BINDING_FIELDS');
  validateDigestJobBindingV001(b, absolute); assert(Number.isSafeInteger(b.sizeBytes) && b.sizeBytes > 0, 'RECORD_BINDING_SIZE_REQUIRED');
}
async function streamSha(file: string) {const h = createHash('sha256'); for await (const chunk of createReadStream(file)) h.update(chunk); return h.digest('hex');}
async function stable(file: string, logical = file) {
  assert(path.isAbsolute(file) && path.normalize(file) === file && !file.includes('\0'), 'RECORD_ABSOLUTE_PATH_REQUIRED');
  assert.equal(await realpath(file), file, 'RECORD_SYMLINK_REFERENCE');
  const before = await lstat(file, {bigint: true}); assert(before.isFile() && !before.isSymbolicLink() && before.size > 0n);
  const first = await streamSha(file), second = await streamSha(file), after = await lstat(file, {bigint: true});
  for (const key of ['ino', 'dev', 'size', 'mtimeNs', 'ctimeNs'] as const) assert.equal(before[key], after[key], 'RECORD_UNSTABLE_FILE');
  assert.equal(first, second, 'RECORD_UNSTABLE_BYTES');
  return {binding: {path: logical, fileSha256: first, sizeBytes: Number(after.size)}, identity: after};
}
async function bound(file: string, b: Json, readonly = false) {
  const observed = await stable(file, b.path);assert.equal(observed.binding.path,b.path);assert.equal(observed.binding.fileSha256,b.fileSha256,'RECORD_ACTUAL_BINDING_CHANGED');
  if(b.sizeBytes!==undefined)assert.equal(observed.binding.sizeBytes,b.sizeBytes,'RECORD_ACTUAL_BINDING_CHANGED');
  if (readonly) assert.equal(observed.identity.mode & 0o222n, 0n, 'RECORD_IMMUTABLE_FILE_REQUIRED');
  return observed;
}
async function jsonBound(file: string, b: Json, readonly = false) {
  await bound(file, b, readonly); const bytes = await readFile(file); assert.equal(sha(bytes), b.fileSha256, 'RECORD_JSON_BYTES_CHANGED');
  if(b.sizeBytes!==undefined)assert.equal(bytes.length,b.sizeBytes); const value = JSON.parse(bytes.toString());
  if (b.schemaVersion !== undefined) assert.equal(value.schemaVersion, b.schemaVersion);
  if (b.canonicalSha256 !== undefined) assert.equal(sha(canonical(value)), b.canonicalSha256);
  return value;
}
function generated(q: Json, logical: string) {
  const safe = digestJobRelativePathV001(logical); assert(safe.startsWith(q.job.outputRoot + '/'), 'RECORD_GENERATED_PREFIX_REQUIRED');
  return path.join(q.job.storage.guestRoot, safe);
}
async function directory(q: Json, absolute: string, create = false) {
  const root = path.join(q.job.storage.guestRoot, q.job.outputRoot);
  assert(absolute === root || absolute.startsWith(root + '/'), 'RECORD_DIRECTORY_OUTSIDE_JOB');
  assert.equal(await realpath(root), root); const base = await lstat(root); assert(base.isDirectory() && !base.isSymbolicLink());
  assert.equal(base.dev, q.job.storage.guestDevice, 'RECORD_GUEST_DEVICE_CHANGED');
  let current = root;
  for (const component of path.relative(root, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    if (create) {try {await mkdir(current, {mode: 0o755});} catch (error: any) {if (error.code !== 'EEXIST') throw error;}}
    const st = await lstat(current); assert(st.isDirectory() && !st.isSymbolicLink(), 'RECORD_DIRECTORY_INVALID');
    assert.equal(await realpath(current), current); assert.equal(st.dev, q.job.storage.guestDevice, 'RECORD_GUEST_DEVICE_CHANGED');
  }
}
async function disk(root: string) {
  return JSON.parse((await exec('/usr/bin/python3', ['-B', '-c',
    'import json,plistlib,subprocess,sys;print(json.dumps(plistlib.loads(subprocess.check_output(["/usr/sbin/diskutil","info","-plist",sys.argv[1]]))))', root])).stdout);
}
// Kept separate from the record lifecycle so read-only retrieval needs no process owner.
async function storageAndCode(q: Json, pins?: Json) {
  assert.equal(process.getuid?.() === 0, false, 'NONROOT_RECORD_FINALIZE_REQUIRED');
  await assertQualifiedDigestApprovedJobV001(q);
  assert.equal((await exec('git', ['status', '--porcelain=v1'], {cwd: ROOT})).stdout, '', 'RECORD_IMPLEMENTATION_DIRTY');
  assert.equal(process.execPath, q.job.implementation.nodeBinding.path, 'RECORD_NODE_PATH_CHANGED');
  assert.equal(await realpath(process.execPath), process.execPath); const node = await lstat(process.execPath, {bigint: true});
  assert(node.isFile() && !node.isSymbolicLink());
  if (pins) for (const key of ['ino', 'dev', 'size', 'mtimeNs', 'ctimeNs'] as const) assert.equal(node[key], pins.node[key], 'RECORD_NODE_IDENTITY_CHANGED');
  else await bound(process.execPath, {...q.job.implementation.nodeBinding, sizeBytes: q.job.implementation.nodeBinding.sizeBytes ?? Number(node.size)});
  const s = q.job.storage, [guest, host] = await Promise.all([disk(s.guestRoot), disk(s.hostRoot)]);
  for (const [info, root, uuid, device, fs] of [[guest, s.guestRoot, s.guestVolumeUuid, s.guestDevice, 'apfs'],
    [host, s.hostRoot, s.hostVolumeUuid, s.hostDevice, 'exfat']] as any[]) {
    assert.equal(info.VolumeUUID, uuid); assert.equal(info.MountPoint, root); assert.equal(info.FilesystemType, fs);
    assert.equal(await realpath(root), root); const st = await lstat(root); assert(st.isDirectory() && !st.isSymbolicLink());
    assert.equal(st.dev, device); assert(/^\/dev\/disk[0-9]+s[0-9]+$/u.test(info.DeviceNode)); assert.equal(info.WritableVolume, true);
  }
  assert.equal(guest.GlobalPermissionsEnabled, true); assert.equal(await realpath(s.imagePath), s.imagePath);
  const image = await lstat(s.imagePath, {bigint:true}); assert(image.isDirectory() && !image.isSymbolicLink()); assert.equal(Number(image.dev), s.hostDevice);
  if (pins) {assert.equal(image.ino,pins.image.ino,'RECORD_IMAGE_IDENTITY_CHANGED');assert.equal(image.dev,pins.image.dev,'RECORD_IMAGE_IDENTITY_CHANGED');}
  const imageInfoPath=s.imagePath+'/Info.plist', imageInfo=await stable(imageInfoPath);
  if(pins) same(imageInfo.binding,pins.imageInfo,'RECORD_IMAGE_INFO_CHANGED');
  const plist=JSON.parse((await exec('/usr/bin/python3',['-B','-c','import json,plistlib,sys;print(json.dumps(plistlib.load(open(sys.argv[1],"rb"))))',imageInfoPath])).stdout);
  assert.equal(plist['diskimage-bundle-type'],'com.apple.diskimage.sparsebundle');assert(Number.isSafeInteger(plist.size)&&plist.size>0&&plist.size<=s.imageMaximumBytes,'RECORD_IMAGE_CAPACITY_CHANGED');
  const mounts = JSON.parse((await exec('/usr/bin/python3', ['-B', '-c',
    'import json,plistlib,subprocess;print(json.dumps(plistlib.loads(subprocess.check_output(["/usr/bin/hdiutil","info","-plist"]))))'])).stdout);
  const matches = mounts.images.filter((v: Json) => v['image-path'] === s.imagePath); assert.equal(matches.length, 1);
  assert(matches[0]['system-entities'].some((v: Json) => v['dev-entry'] === guest.DeviceNode && v['mount-point'] === s.guestRoot));
  await directory(q, path.join(s.guestRoot, q.job.outputRoot));
  return {node,image,imageInfo:imageInfo.binding};
}
async function reserve(q: Json, bytes: number) {
  assert(Number.isSafeInteger(bytes) && bytes >= 0);
  for (const root of [q.job.storage.guestRoot, q.job.storage.internalRoot]) {
    const fs = await statfs(root); assert(fs.bavail * fs.bsize >= (root === q.job.storage.guestRoot ? bytes : 0) + q.job.guard.reserveBytes, 'RECORD_NEXT_UNIT_RESERVE');
  }
  const host=await statfs(q.job.storage.hostRoot);assert(host.bavail*host.bsize>=bytes+q.job.storage.hostMetadataReserveBytes+q.job.guard.reserveBytes,'RECORD_HOST_METADATA_RESERVE');
}
async function supervisor(q: Json, options: DigestApprovedRecordFinalizeOptionsV001) {
  assert.equal(process.env.ZEV_APPROVED_RECORD_FINALIZE_SUPERVISED, '1', 'RECORD_FINALIZE_SUPERVISOR_REQUIRED');
  assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'), 'RECORD_NODE_OPTIONS_FORBIDDEN');
  assert.equal(process.getuid?.() === 0, false, 'NONROOT_RECORD_FINALIZE_REQUIRED');
  process.kill(process.ppid, 0);
  const args = (await exec('/bin/ps', ['-p', String(process.ppid), '-o', 'args='])).stdout;
  for (const value of [ROOT + '/tools/digest-quality/original-resolution-full-supervisor-v002.py', '--finalize-job',
    q.jobBinding.path, q.authorizationBinding.path, options.trustedJobSha256, options.trustedAuthorizationSha256,
    generated(q, options.pendingReceiptBinding.path), options.trustedPendingReceiptSha256,
    options.registrationBinding!.path, options.trustedRegistrationSha256!]) assert(args.includes(value), 'RECORD_PARENT_COMMAND_MISMATCH');
}

/** Shared module recognizes only this privately minted record-only context. */
export async function assertQualifiedDigestRecordFinalizationContextV001(context: unknown): Promise<void> {
  assert(context && typeof context === 'object' && contexts.has(context), 'QUALIFIED_RECORD_FINALIZATION_CONTEXT_REQUIRED');
  await (context as Json).assertCurrent();
}
async function contextFor(pending: Json, lease: Json | null, options: DigestApprovedRecordFinalizeOptionsV001) {
  const shared = await loadShared(), q = pending.qualified; const node = await storageAndCode(q);
  const value: Json = {scope: 'digest-record-only-finalization-v001', approvedJob: q, pending,
    outputRoot: q.job.outputRoot, storageRoot: q.job.storage.guestRoot,
    generatedRoot: path.join(q.job.storage.guestRoot, q.job.outputRoot),
    resolve: (logical: string) => generated(q, logical),
    assertCurrent: async () => {
      await storageAndCode(q, node); await shared.assertApprovedDigestPendingVerificationV001(pending);
      if (lease) {await supervisor(q, options); await directory(q, lease.directory);
        const now = await lstat(lease.directory, {bigint: true});
        for (const key of ['ino', 'dev', 'mtimeNs', 'ctimeNs'] as const) assert.equal(now[key], lease.identity[key], 'RECORD_LEASE_IDENTITY_CHANGED');
        await bound(lease.file, lease.binding, true); const owner = await jsonBound(lease.file, lease.binding, true); same(owner, lease.owner, 'RECORD_LEASE_OWNER_CHANGED');
        assert.equal(owner.pid, process.pid); assert.equal(owner.parentPid, process.ppid); process.kill(owner.pid, 0);
      }
    },
    readJson: async (logical: string) => {await value.assertCurrent(); const actual = await stable(generated(q, logical), logical); return jsonBound(generated(q, logical), actual.binding, true);},
    readBound: async (b: Json) => {await value.assertCurrent(); return jsonBound(generated(q, b.path), b, true);},
  };
  Object.freeze(value); contexts.set(value, {pending, q, lease}); await value.assertCurrent(); return value;
}
function validateRegistration(registration: Json, pending: Json) {
  const q = pending.qualified;
  exact(registration, ['schemaVersion', 'approvedJobBinding', 'authorizationBinding', 'pendingReceiptBinding', 'record', 'evidence'], 'RECORD_REGISTRATION_FIELDS');
  assert.equal(registration.schemaVersion, 'digest-representative-registration-v001');
  same(registration.approvedJobBinding, q.jobBinding, 'RECORD_REGISTRATION_JOB_MISMATCH');
  same(registration.authorizationBinding, q.authorizationBinding, 'RECORD_REGISTRATION_AUTHORIZATION_MISMATCH');
  same(registration.pendingReceiptBinding, pending.pendingReceiptBinding, 'RECORD_REGISTRATION_PENDING_MISMATCH');
  exact(registration.record, ['destinationPath', 'sourceBinding'], 'RECORD_REGISTRATION_RECORD_FIELDS');
  assert.equal(registration.record.destinationPath, pending.policy.confirmationRecordPath);
  byteBinding(registration.record.sourceBinding, true); generated(q, registration.record.destinationPath);
  assert(Array.isArray(registration.evidence) && registration.evidence.length > 0, 'RECORD_REGISTRATION_EVIDENCE_REQUIRED');
  const protectedPaths=new Set<string>();
  const collect=(v:any)=>{if(v&&typeof v==='object'){if(typeof v.path==='string'&&H.test(v.fileSha256??'')){let logical=v.path;if(logical.startsWith(q.job.storage.guestRoot+'/'))logical=path.relative(q.job.storage.guestRoot,logical);if(logical.startsWith(q.job.outputRoot+'/'))protectedPaths.add(logical);}Object.values(v).forEach(collect);}};
  collect(pending.pendingReceipt);collect(pending.technicalEvidence);protectedPaths.add(pending.pendingReceiptBinding.path);
  const checkDestination=(logical:string)=>{generated(q,logical);for(const segment of ['.record-finalization-v001.lock','record-finalization-v001']){const prefix=q.job.outputRoot+'/'+segment;assert(logical!==prefix&&!logical.startsWith(prefix+'/'),'RECORD_RESERVED_DESTINATION');}assert(!protectedPaths.has(logical),'RECORD_PROTECTED_DESTINATION');};
  checkDestination(registration.record.destinationPath);
  const paths = new Set([registration.record.destinationPath]);
  for (const item of registration.evidence) {
    exact(item, ['destinationPath', 'sourceBinding'], 'RECORD_REGISTRATION_EVIDENCE_FIELDS');
    byteBinding(item.sourceBinding, true); checkDestination(item.destinationPath);
    assert(!paths.has(item.destinationPath), 'RECORD_REGISTRATION_DUPLICATE_PATH'); paths.add(item.destinationPath);
    assert(![q.job.outputRoot + '/result.json', q.job.outputRoot + '/record-finalization-v001/completed-receipt.json',
      q.job.outputRoot + '/record-finalization-v001/registration.json'].includes(item.destinationPath), 'RECORD_PROTECTED_DESTINATION');
  }
}
function evidenceMapping(registration: Json, record: Json) {
  assert(Array.isArray(record.representatives)&&record.representatives.length>0,'RECORD_REPRESENTATIVES_REQUIRED');
  const refs=new Map<string,Json>(), destinations=new Map<string,Json>(registration.evidence.map((item:Json)=>[item.destinationPath,item]));
  for(const item of record.representatives){const ref=item.evidenceBinding;byteBinding(ref,false);const prior=refs.get(ref.path);if(prior)same(prior,ref,'RECORD_EVIDENCE_REFERENCE_CONFLICT');refs.set(ref.path,ref);}
  assert.equal(destinations.size,refs.size,'RECORD_REGISTRATION_EVIDENCE_COVERAGE');
  for(const [logical,ref] of refs){const item=destinations.get(logical);assert(item,'RECORD_REGISTRATION_EVIDENCE_MISSING');assert.equal(ref.fileSha256,item.sourceBinding.fileSha256);assert.equal(ref.sizeBytes,item.sourceBinding.sizeBytes);}
}
async function validateRegisteredFiles(registration: Json,pending: Json) {
  const q=pending.qualified, record=await jsonBound(generated(q,registration.record.destinationPath),{...registration.record.sourceBinding,path:registration.record.destinationPath},true);
  evidenceMapping(registration,record);
  for(const item of registration.evidence)await bound(generated(q,item.destinationPath),{...item.sourceBinding,path:item.destinationPath},true);
}
async function readRegistration(options: DigestApprovedRecordFinalizeOptionsV001, pending: Json) {
  assert(options.registrationBinding && H.test(options.trustedRegistrationSha256 ?? ''), 'RECORD_REGISTRATION_ANCHOR_REQUIRED');
  byteBinding(options.registrationBinding, true); assert.equal(options.registrationBinding.fileSha256, options.trustedRegistrationSha256);
  const registration = await jsonBound(options.registrationBinding.path, options.registrationBinding); validateRegistration(registration, pending); return registration;
}
async function acquire(pending: Json, options: DigestApprovedRecordFinalizeOptionsV001) {
  const q = pending.qualified; await storageAndCode(q); await supervisor(q, options); await reserve(q, 0);
  const directoryPath = generated(q, q.job.outputRoot + '/.record-finalization-v001.lock');
  try {await mkdir(directoryPath, {mode: 0o700});} catch (error: any) {if (error.code === 'EEXIST') throw Error('RECORD_FINALIZATION_BUSY'); throw error;}
  const owner = {schemaVersion: 'digest-record-finalization-owner-v001', ownerId: randomUUID(), pid: process.pid, parentPid: process.ppid,
    createdAt: new Date().toISOString(), approvedJobBinding: q.jobBinding, authorizationBinding: q.authorizationBinding,
    pendingReceiptBinding: pending.pendingReceiptBinding, registrationBinding: options.registrationBinding};
  const file = directoryPath + '/owner.json', bytes = formal(owner);
  try {await writeExclusive(file, bytes); const observed = await stable(file);
    return {directory: directoryPath, identity: await lstat(directoryPath, {bigint: true}), file, binding: observed.binding, owner};
  } catch (error) {try {await unlink(file);} catch {} try {await rmdir(directoryPath);} catch {} throw error;}
}
async function release(lease: Json) {
  const now = await lstat(lease.directory, {bigint: true});
  for (const key of ['ino', 'dev'] as const) assert.equal(now[key], lease.identity[key], 'RECORD_LEASE_IDENTITY_CHANGED');
  await bound(lease.file, lease.binding, true); await unlink(lease.file); await rmdir(lease.directory);
}
async function writeExclusive(file: string, bytes: Buffer) {
  const handle = await open(file, 'wx', 0o600); try {await handle.writeFile(bytes); await handle.sync();} finally {await handle.close();}
  await chmod(file, 0o444);
}
async function publishBytes(context: Json, logical: string, bytes: Buffer, allowSame: boolean) {
  const q = context.approvedJob, target = generated(q, logical), expected = {path: logical, fileSha256: sha(bytes), sizeBytes: bytes.length};
  await context.assertCurrent(); await directory(q, path.dirname(target), true); await reserve(q, bytes.length);
  try {await bound(target, expected, true); assert(allowSame, 'RECORD_FINAL_RECEIPT_ALREADY_EXISTS'); return expected;} catch (error: any) {if (error.code !== 'ENOENT') throw error;}
  const temp = path.join(path.dirname(target), '.' + path.basename(target) + '.record-' + randomUUID() + '.staging');
  await writeExclusive(temp, bytes);
  try {await context.assertCurrent(); await bound(temp, {...expected, path: temp}, true); await link(temp, target); await bound(target, expected, true); return expected;}
  finally {await unlink(temp);}
}
async function publishSource(context: Json, item: Json) {
  const q = context.approvedJob, target = generated(q, item.destinationPath), source = item.sourceBinding;
  await bound(source.path, source); await context.assertCurrent(); await directory(q, path.dirname(target), true); await reserve(q, source.sizeBytes);
  const expected = {...source, path: item.destinationPath};
  try {await bound(target, expected, true); return expected;} catch (error: any) {if (error.code !== 'ENOENT') throw error;}
  const temp = path.join(path.dirname(target), '.' + path.basename(target) + '.record-' + randomUUID() + '.staging');
  try {await copyFile(source.path, temp, constants.COPYFILE_EXCL); await chmod(temp, 0o444); await bound(temp, {...source, path: temp}, true);
    await bound(source.path, source); await context.assertCurrent(); await link(temp, target); await bound(target, expected, true); return expected;}
  finally {try {await unlink(temp);} catch (error: any) {if (error.code !== 'ENOENT') throw error;}}
}
function normalResult(pending: Json, verification: Json, completedAt: string) {
  assert.equal(verification.status, 'passed-representative', 'RECORD_CONFIRMATION_NOT_PASSED');
  const prior = structuredClone(pending.pendingReceipt);
  return {...prior, status: 'completed', complete: true, verification, verificationMode: verification.mode,
    technicalQc: {wholeRules: verification.checks.wholeRules, media: verification.checks.media,
      audioPreservation: verification.checks.audioPreservation, fullVisibility: verification.checks.fullVisibility},
    result: {...prior.result, status: 'completed', complete: true, qc: verification.status, verification,
      verificationMode: verification.mode, counterfactualQcExecuted: false}, completedAt};
}
async function existing(pending: Json, context: Json, expectedRegistration?: Json) {
  const q = pending.qualified, logical = q.job.outputRoot + '/record-finalization-v001/completed-receipt.json', file = generated(q, logical);
  let actual; try {actual = await stable(file, logical);} catch (error: any) {if (error.code === 'ENOENT') return null; throw error;}
  const completed = await jsonBound(file, actual.binding, true);
  exact(completed, ['schemaVersion', 'status', 'approvedJobBinding', 'authorizationBinding', 'pendingReceiptBinding', 'sourceRegistrationBinding',
    'registrationBinding', 'implementationSha', 'completedAt', 'owner', 'result'], 'RECORD_COMPLETED_FIELDS');
  assert.equal(completed.schemaVersion, 'digest-approved-record-finalization-result-v001'); assert.equal(completed.status, 'completed');
  same(completed.approvedJobBinding, q.jobBinding, 'RECORD_COMPLETED_JOB_MISMATCH'); same(completed.authorizationBinding, q.authorizationBinding, 'RECORD_COMPLETED_AUTHORIZATION_MISMATCH');
  same(completed.pendingReceiptBinding, pending.pendingReceiptBinding, 'RECORD_COMPLETED_PENDING_MISMATCH'); assert.equal(completed.implementationSha, q.job.implementation.sha);
  assert(typeof completed.completedAt === 'string' && /(?:Z|\+00:00)$/u.test(completed.completedAt) && Number.isFinite(Date.parse(completed.completedAt)));
  byteBinding(completed.sourceRegistrationBinding, true); byteBinding(completed.registrationBinding, false);
  exact(completed.owner,['schemaVersion','ownerId','pid','parentPid','createdAt','approvedJobBinding','authorizationBinding','pendingReceiptBinding','registrationBinding'],'RECORD_COMPLETED_OWNER_FIELDS');
  assert.equal(completed.owner.schemaVersion,'digest-record-finalization-owner-v001');assert(/^[a-f0-9-]{36}$/u.test(completed.owner.ownerId));
  for(const pid of [completed.owner.pid,completed.owner.parentPid])assert(Number.isSafeInteger(pid)&&pid>0,'RECORD_COMPLETED_OWNER_PID');
  assert(Number.isFinite(Date.parse(completed.owner.createdAt))&&Date.parse(completed.owner.createdAt)<=Date.parse(completed.completedAt),'RECORD_COMPLETED_OWNER_TIME');
  same(completed.owner.approvedJobBinding,q.jobBinding,'RECORD_COMPLETED_OWNER_JOB');same(completed.owner.authorizationBinding,q.authorizationBinding,'RECORD_COMPLETED_OWNER_AUTH');
  same(completed.owner.pendingReceiptBinding,pending.pendingReceiptBinding,'RECORD_COMPLETED_OWNER_PENDING');same(completed.owner.registrationBinding,completed.sourceRegistrationBinding,'RECORD_COMPLETED_OWNER_REGISTRATION');
  assert.equal(completed.registrationBinding.path, q.job.outputRoot + '/record-finalization-v001/registration.json');
  assert.equal(completed.sourceRegistrationBinding.fileSha256, completed.registrationBinding.fileSha256); assert.equal(completed.sourceRegistrationBinding.sizeBytes, completed.registrationBinding.sizeBytes);
  if (expectedRegistration) {assert.equal(completed.sourceRegistrationBinding.fileSha256,expectedRegistration.fileSha256,'RECORD_COMPLETED_REGISTRATION_CONFLICT');assert.equal(completed.sourceRegistrationBinding.sizeBytes,expectedRegistration.sizeBytes,'RECORD_COMPLETED_REGISTRATION_CONFLICT');}
  const registration = await jsonBound(generated(q, completed.registrationBinding.path), completed.registrationBinding, true); validateRegistration(registration, pending);
  await validateRegisteredFiles(registration,pending);
  const shared = await loadShared(), verification = await shared.requalifyApprovedDigestRecordedRepresentativeV001({pending, recordContext: context});
  same(completed.result, normalResult(pending, verification, completed.completedAt), 'RECORD_COMPLETED_RESULT_CHANGED');
  await context.assertCurrent(); await bound(file, actual.binding, true);
  return freeze({...normalResult(pending, verification, completed.completedAt), completedReceiptBinding: actual.binding,
    pendingReceiptBinding: pending.pendingReceiptBinding, registrationBinding: completed.registrationBinding});
}
async function pendingFor(options: DigestApprovedRecordFinalizeOptionsV001, qualified?: Json) {
  byteBinding(options.pendingReceiptBinding, false); assert(H.test(options.trustedPendingReceiptSha256), 'RECORD_PENDING_ANCHOR_REQUIRED');
  assert.equal(options.pendingReceiptBinding.fileSha256, options.trustedPendingReceiptSha256, 'RECORD_PENDING_ANCHOR_MISMATCH');
  const q = qualified??await readQualifiedDigestApprovedJobV001(options);await assertQualifiedDigestApprovedJobV001(q); assert.equal(options.pendingReceiptBinding.path, q.job.outputRoot + '/result.json');
  assert(q.job.implementation.bindings.some((b:Json)=>b.path==='runner/src/digest-approved-record-finalize-v001.ts'),'RECORD_FINALIZER_IMPLEMENTATION_BINDING_REQUIRED');
  const shared = await loadShared(); return shared.readApprovedDigestPendingVerificationV001({qualified: q,
    pendingReceiptBinding: options.pendingReceiptBinding, trustedPendingReceiptSha256: options.trustedPendingReceiptSha256});
}
/** Read-only retrieval: no lock, owner, copy, manufacture worker, or render worker is created. */
export async function readApprovedDigestJobResultV001(externalOptions: DigestApprovedRecordFinalizeOptionsV001) {
  const options = freeze(structuredClone(externalOptions));
  byteBinding(options.pendingReceiptBinding,false);assert(H.test(options.trustedPendingReceiptSha256),'RECORD_PENDING_ANCHOR_REQUIRED');assert.equal(options.pendingReceiptBinding.fileSha256,options.trustedPendingReceiptSha256,'RECORD_PENDING_ANCHOR_MISMATCH');
  const q=await readQualifiedDigestApprovedJobV001(options);assert.equal(options.pendingReceiptBinding.path,q.job.outputRoot+'/result.json');
  assert(q.job.implementation.bindings.some((b:Json)=>b.path==='runner/src/digest-approved-record-finalize-v001.ts'),'RECORD_FINALIZER_IMPLEMENTATION_BINDING_REQUIRED');
  const pins=await storageAndCode(q), original=await jsonBound(generated(q,options.pendingReceiptBinding.path),options.pendingReceiptBinding,true);
  if(original.status==='completed'){
    assert(options.registrationBinding===undefined&&options.trustedRegistrationSha256===undefined,'RECORD_INITIAL_COMPLETION_HAS_NO_REGISTRATION');
    const shared=await loadShared(),completed=await shared.readApprovedDigestInitialCompletedReceiptV001({qualified:q,receiptBinding:options.pendingReceiptBinding,trustedReceiptSha256:options.trustedPendingReceiptSha256});
    await storageAndCode(q,pins);await bound(generated(q,options.pendingReceiptBinding.path),options.pendingReceiptBinding,true);return completed;
  }
  assert.equal(original.status,'confirmation-pending','RECORD_RESULT_STATUS_UNSUPPORTED');
  const pending=await pendingFor(options,q), context=await contextFor(pending,null,options);
  const anchored=options.registrationBinding!==undefined||options.trustedRegistrationSha256!==undefined;
  if(anchored){assert(options.registrationBinding&&H.test(options.trustedRegistrationSha256??''),'RECORD_REGISTRATION_ANCHOR_REQUIRED');byteBinding(options.registrationBinding,true);assert.equal(options.registrationBinding.fileSha256,options.trustedRegistrationSha256,'RECORD_REGISTRATION_ANCHOR_MISMATCH');}
  const completed=await existing(pending,context,anchored?options.registrationBinding:undefined);
  if(anchored)assert(completed,'RECORD_COMPLETED_ANCHOR_NOT_FOUND');
  return completed??pending.pendingReceipt;
}
/** One record registration under a fresh owner; the trusted pending media remains immutable. */
export async function finalizeApprovedDigestJobRecordV001(externalOptions: DigestApprovedRecordFinalizeOptionsV001) {
  const options = freeze(structuredClone(externalOptions)), pending = await pendingFor(options);
  assert(options.registrationBinding&&H.test(options.trustedRegistrationSha256??''),'RECORD_REGISTRATION_ANCHOR_REQUIRED');
  byteBinding(options.registrationBinding,true);assert.equal(options.registrationBinding.fileSha256,options.trustedRegistrationSha256,'RECORD_REGISTRATION_ANCHOR_MISMATCH');
  const lease = await acquire(pending, options);
  try {
    const context = await contextFor(pending, lease, options), prior = await existing(pending, context, options.registrationBinding); if (prior) return prior;
    const registration=await readRegistration(options,pending);
    const q = pending.qualified, record = await jsonBound(registration.record.sourceBinding.path, registration.record.sourceBinding);
    assert(Array.isArray(record.representatives));
    evidenceMapping(registration,record);
    for(const item of registration.evidence)await bound(item.sourceBinding.path,item.sourceBinding);
    for (const item of registration.evidence) await publishSource(context, item);
    await publishSource(context, registration.record);
    const shared = await loadShared(), verification = await shared.requalifyApprovedDigestRecordedRepresentativeV001({pending, recordContext: context});
    assert.equal(verification.status, 'passed-representative', 'RECORD_CONFIRMATION_NOT_PASSED');
    const registrationBytes = await readFile(options.registrationBinding!.path); assert.equal(sha(registrationBytes), options.trustedRegistrationSha256);
    const registrationBinding = await publishBytes(context, q.job.outputRoot + '/record-finalization-v001/registration.json', registrationBytes, true);
    const completedAt = new Date().toISOString(), completed = {schemaVersion: 'digest-approved-record-finalization-result-v001', status: 'completed',
      approvedJobBinding: q.jobBinding, authorizationBinding: q.authorizationBinding, pendingReceiptBinding: pending.pendingReceiptBinding,
      sourceRegistrationBinding: options.registrationBinding, registrationBinding, implementationSha: q.job.implementation.sha,
      completedAt, owner: lease.owner, result: normalResult(pending, verification, completedAt)};
    await context.assertCurrent(); const fresh = await shared.requalifyApprovedDigestRecordedRepresentativeV001({pending, recordContext: context});
    same(fresh, verification, 'RECORD_PRECOMMIT_PROOF_CHANGED');
    await publishBytes(context, q.job.outputRoot + '/record-finalization-v001/completed-receipt.json', formal(completed), false);
    return (await existing(pending, context, options.registrationBinding))!;
  } finally {await release(lease);}
}

function cliPairs(args: string[]) {
  assert(args.length % 2 === 0, 'RECORD_CLI_ARGUMENTS'); const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {assert(args[i].startsWith('--') && !Object.hasOwn(out, args[i]), 'RECORD_CLI_ARGUMENTS'); out[args[i]] = args[i + 1];}
  return out;
}
async function cli() {
  const mode = process.argv[2]; assert(['--get-job-result', '--finalize-job'].includes(mode), 'RECORD_CLI_MODE');
  const values = cliPairs(process.argv.slice(3)), keys = ['--job-file', '--authorization-file', '--job-sha256', '--authorization-sha256',
    '--pending-result-file', '--pending-result-file-sha256', '--pending-result-size-bytes', ...(mode === '--finalize-job'
      ? ['--registration-bundle-file', '--registration-bundle-sha256', '--registration-bundle-size-bytes'] : [])]; exact(values, keys, 'RECORD_CLI_ARGUMENTS');
  const control = async (file: string, hash: string) => {assert(path.isAbsolute(file)); const sizeBytes = Number((await lstat(file)).size); return {path: file, fileSha256: hash, sizeBytes};};
  const jobBinding = await control(values['--job-file'], values['--job-sha256']), authorizationBinding = await control(values['--authorization-file'], values['--authorization-sha256']);
  const q = await readQualifiedDigestApprovedJobV001({workspaceRoot: ROOT, jobBinding, authorizationBinding,
    trustedJobSha256: values['--job-sha256'], trustedAuthorizationSha256: values['--authorization-sha256']});
  assert.equal(values['--pending-result-file'], generated(q, q.job.outputRoot + '/result.json'));
  const options: DigestApprovedRecordFinalizeOptionsV001 = {workspaceRoot: ROOT, jobBinding, authorizationBinding,
    trustedJobSha256: values['--job-sha256'], trustedAuthorizationSha256: values['--authorization-sha256'],
    pendingReceiptBinding: {path: q.job.outputRoot + '/result.json', fileSha256: values['--pending-result-file-sha256'], sizeBytes: Number(values['--pending-result-size-bytes'])},
    trustedPendingReceiptSha256: values['--pending-result-file-sha256']};
  if (mode === '--finalize-job') {
    options.registrationBinding = {path: values['--registration-bundle-file'], fileSha256: values['--registration-bundle-sha256'], sizeBytes: Number(values['--registration-bundle-size-bytes'])};
    options.trustedRegistrationSha256 = values['--registration-bundle-sha256'];
  }
  const result = mode === '--finalize-job' ? await finalizeApprovedDigestJobRecordV001(options) : await readApprovedDigestJobResultV001(options);
  process.stdout.write(JSON.stringify({event: result.status, result,
    ...(result.completedReceiptBinding ? {completedReceiptBinding: result.completedReceiptBinding} : {})}) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void cli().catch(error => {process.stderr.write(String(error.stack ?? error) + '\n'); process.exitCode = 1;});
}
