import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, access} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {
  assertSpecificDigestFailedWorkDescriptorV001,
  readQualifiedApprovedDigestFailedWorkV001,
  assertQualifiedApprovedDigestRecoveryBaseV001,
} from './digest-approved-job-runner-v001.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_PATH = '/Users/kawafmm/Documents/Codex/2026-10-03/task-3/specific-failed-work-recovery-input-v001.json';
const FIXTURE_SHA = '84370d9611ed428f2bdcdf83321ea3c91c2e1f82edd56c96d420de0cb00eb349';
const FIXTURE_BYTES = 1010509;
const bytes = await readFile(FIXTURE_PATH);
assert.equal(createHash('sha256').update(bytes).digest('hex'), FIXTURE_SHA, 'ACTUAL_CAPTURED_FIXTURE_CHANGED');
assert.equal(bytes.length, FIXTURE_BYTES);
const captured: any = JSON.parse(bytes.toString());
const renderer = await import(pathToFileURL(path.join(ROOT, 'evals/clip_composition/render_presentation_v002.mjs')).href);
const required = /QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED/;

/** Pure structural fixture only. It creates no job grant, owner, storage capability or media. */
function fixture() {
  const descriptor = structuredClone(captured);
  const job: any = {
    planId: descriptor.planId,
    outputRoot: path.posix.dirname(descriptor.oldOutputRoot) + '/test-only-recovery-not-authorized',
    recoveryBinding: {path: 'runtime/artifacts/test-only/recovery.json', fileSha256: FIXTURE_SHA, sizeBytes: FIXTURE_BYTES},
    expected: {cues: 651, frames: 37619},
  };
  return {descriptor, job};
}

test('the actual captured descriptor has the expected shape without minting recovery authority', async () => {
  const f = fixture(), before = structuredClone(f);
  assert.equal(f.descriptor.primaryOverlays.length, 651);
  assert.equal(f.descriptor.primaryOverlays.reduce((n: number, r: any) => n + r.lineMaskBindings.length, 0), 1042);
  assert.equal(f.descriptor.jsonBindings.length, 24);
  assertSpecificDigestFailedWorkDescriptorV001(f.descriptor, f.job);
  assert.deepEqual(f, before, 'PURE_CHECK_MUST_NOT_MUTATE_INPUT');
  await assert.rejects(readQualifiedApprovedDigestFailedWorkV001(f), required);
  await assert.rejects(readQualifiedApprovedDigestFailedWorkV001(structuredClone(f)), required);
});

const mutations: Array<[string, (f: ReturnType<typeof fixture>) => void]> = [
  ['another current job plan', f => {f.job.planId = 'other-plan';}],
  ['another recorded old job', f => {f.descriptor.oldJobBinding.fileSha256 = 'a'.repeat(64);}],
  ['another recorded authorization', f => {f.descriptor.oldAuthorizationBinding.fileSha256 = 'b'.repeat(64);}],
  ['substituted saved video SHA', f => {f.descriptor.videoBinding.fileSha256 = 'c'.repeat(64);}],
  ['substituted saved video byte count', f => {f.descriptor.videoBinding.sizeBytes++;}],
  ['substituted descriptor SHA', f => {f.job.recoveryBinding.fileSha256 = 'd'.repeat(64);}],
  ['substituted descriptor byte count', f => {f.job.recoveryBinding.sizeBytes++;}],
  ['another old implementation', f => {f.descriptor.oldImplementationSha = 'e'.repeat(40);}],
  ['another recorded old output root', f => {f.descriptor.oldOutputRoot += '-other';}],
  ['another failure', f => {f.descriptor.failureCode = 'OTHER_FAILURE';}],
  ['missing primary PNG binding entry', f => {f.descriptor.primaryOverlays.pop();}],
  ['duplicate primary instruction ID', f => {f.descriptor.primaryOverlays[1].instructionId = f.descriptor.primaryOverlays[0].instructionId;}],
  ['missing line mask', f => {f.descriptor.primaryOverlays[0].lineMaskBindings.pop();}],
  ['JSON reference outside the old output root', f => {f.descriptor.jsonBindings[0].path = 'runtime/artifacts/other/reference.json';}],
  ['duplicate JSON reference', f => {f.descriptor.jsonBindings[1].path = f.descriptor.jsonBindings[0].path;}],
  ['JSON root traversal', f => {f.descriptor.jsonBindings[0].path = f.descriptor.oldOutputRoot + '/../outside.json';}],
  ['reuse of the failed output root', f => {f.job.outputRoot = f.descriptor.oldOutputRoot;}],
  ['a child of the failed output root', f => {f.job.outputRoot = f.descriptor.oldOutputRoot + '/recovery';}],
  ['an ancestor of the failed output root', f => {f.job.outputRoot = path.posix.dirname(f.descriptor.oldOutputRoot);}],
  ['an unrelated output parent', f => {f.job.outputRoot = 'runtime/artifacts/another-plan/recovery';}],
  ['a changed cue count', f => {f.job.expected.cues--;}],
  ['a changed frame count', f => {f.job.expected.frames--;}],
];
for (const [name, mutate] of mutations) {
  test('pure descriptor validation rejects ' + name, () => {
    const f = fixture(); mutate(f);
    assert.throws(() => assertSpecificDigestFailedWorkDescriptorV001(f.descriptor, f.job), {code: 'ERR_ASSERTION'});
  });
}

/** A JSON replica is deliberately not a clone of an actually minted private capability.
 * No positive production qualification, old file hash verification or media QC is claimed. */
function forgedContext(kind: 'caller' | 'clone' | 'frozen-clone') {
  const data = {
    scope: 'digest-approved-job-v001',
    approvedJob: {job: {planId: captured.planId, expected: {cues: 651, frames: 37619}}},
    outputRoot: path.posix.dirname(captured.oldOutputRoot) + '/test-only-recovery-not-authorized',
    storageRoot: '/Volumes/ZEV-Digest-20261003-01',
    generatedRoot: '/must-not-read-or-write-failed-work',
    recoveryBinding: {path: FIXTURE_PATH, fileSha256: FIXTURE_SHA, sizeBytes: FIXTURE_BYTES},
  };
  const context: any = kind === 'caller' ? data : structuredClone(data);
  const touches: string[] = [];
  for (const name of ['resolve', 'assertCurrent', 'readBound', 'readJson', 'publish', 'resourceCheck', 'compose']) {
    context[name] = () => {touches.push(name); throw new Error('UNQUALIFIED_CALLBACK_MUST_NOT_RUN: ' + name);};
  }
  if (kind === 'frozen-clone') Object.freeze(context);
  return {context, touches};
}

for (const kind of ['caller', 'clone', 'frozen-clone'] as const) {
  test('failed work reader rejects ' + kind + ' before origin callbacks or reads', async () => {
    const f = forgedContext(kind);
    await assert.rejects(readQualifiedApprovedDigestFailedWorkV001(f.context), required);
    assert.deepEqual(f.touches, []);
  });
  test('recovery base qualifier rejects ' + kind + ' before origin callbacks or reads', async () => {
    const f = forgedContext(kind);
    const poisonBase = new Proxy({}, {get: () => {f.touches.push('base-property'); throw Error('BASE_MUST_NOT_BE_READ');}});
    await assert.rejects(assertQualifiedApprovedDigestRecoveryBaseV001(f.context, poisonBase), required);
    assert.deepEqual(f.touches, []);
  });
  test('saved draw/QC entry rejects ' + kind + ' before reservation, old files or media tools', async () => {
    const f = forgedContext(kind);
    const destination = path.join('/tmp', 'zev-failed-work-no-write-' + randomUUID());
    const poison = new Proxy({}, {get: (_target, key) => {
      f.touches.push('renderer-input:' + String(key)); throw Error('RENDERER_INPUT_MUST_NOT_BE_READ');
    }});
    await assert.rejects(access(destination), {code: 'ENOENT'});
    await assert.rejects(renderer.resumeApprovedDigestFailedDrawAndQcV001({
      outputDirectory: destination, plan: poison, presetRegistry: poison,
      baseMediaPath: '/must-not-read-old-base.mp4', baseMediaInspection: poison,
      expectedFrameCount: 37619, overlayAdapter: poison, toolPaths: poison,
      processObserver: () => {f.touches.push('processObserver'); throw Error('NO_MEDIA_PROCESS_ALLOWED');},
      storageContext: f.context,
    }), required);
    assert.deepEqual(f.touches, [], 'PRIVATE_CONTEXT_CHECK_MUST_PRECEDE_CALLBACKS_AND_INPUT_READS');
    await assert.rejects(access(destination), {code: 'ENOENT'}, 'NO_OUTPUT_RESERVATION_MAY_BE_CREATED');
  });
}
