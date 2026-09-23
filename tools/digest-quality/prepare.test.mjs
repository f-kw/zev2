import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {HRB001_IDENTITY, prepareQualityInput, verifyFileReference, validateSavedSourceBindings, secondsToObservationSample} from './prepare.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
async function temporary(t) {
  const path = await mkdtemp(join(tmpdir(), 'zev-q3-prepare-test-'));
  t.after(() => rm(path, {recursive: true, force: true}));
  return path;
}
test('referenced actual bytes, length and existence are required', async t => {
  const dir = await temporary(t), path = join(dir, 'source.json');
  await writeFile(path, '{"source":"one"}\n');
  const bytes = await readFile(path), reference = {path, fileSha256: hash(bytes), bytes: bytes.length};
  assert.equal(await verifyFileReference(reference), reference.fileSha256);
  await assert.rejects(verifyFileReference({...reference, bytes: bytes.length + 1}), /byte length differs/);
  await writeFile(path, '{"source":"two"}\n');
  await assert.rejects(verifyFileReference(reference), /reference bytes differ/);
  await assert.rejects(verifyFileReference({...reference, path: join(dir, 'missing.json')}), /ENOENT/);
});
test('another completed media identity is rejected before media processing, including same-length replacements', async t => {
  const dir = await temporary(t);
  for (const [name, count] of [['HRB002', 4879], ['same-length', 4867]]) {
    const path = join(dir, `${name}.json`);
    await writeFile(path, JSON.stringify({schemaVersion: 'hrb001-human-review-index-v001', video: {
      fileSha256: '1454ca54018edcfc16b7139336e60ae28e9f32bc617cb476d87b689cf5afcbb6', frameCount: count}}));
    await assert.rejects(prepareQualityInput({outputDir: join(dir, name), bindingsPath: path, ffprobePath: '/must-not-run'}), /selected media is not HRB001/);
  }
});
test('changed display plan or projection identity is refused before untrusted source reads', async t => {
  const dir = await temporary(t);
  const binding = {schemaVersion: 'hrb001-human-review-index-v001', video: {fileSha256: HRB001_IDENTITY.sha256, frameCount: HRB001_IDENTITY.frameCount},
    bindings: {projectionSha256: HRB001_IDENTITY.projectionSha256}, sourceRecords: {projectedPlan: {fileSha256: HRB001_IDENTITY.projectedPlanSha256}}};
  for (const field of ['projection', 'plan']) {
    const changed = structuredClone(binding);
    if (field === 'projection') changed.bindings.projectionSha256 = '0'.repeat(64);
    else changed.sourceRecords.projectedPlan.fileSha256 = '0'.repeat(64);
    const path = join(dir, `${field}.json`); await writeFile(path, JSON.stringify(changed));
    await assert.rejects(prepareQualityInput({outputDir: join(dir, field), bindingsPath: path, sourceBindingsPath: '/must-not-read'}), /saved (projection|display plan) identity/);
  }
});
test('source references and embedded bytes must bind to the saved projection, even when frame counts match', () => {
  const planBytes = '{"elements":[]}', timelineBytes = '{"segments":[]}';
  const source = {digestRef: {version: 'baseline', sha256: '1'.repeat(64)},
    planRef: {path: '/input/plan.json', fileSha256: hash(planBytes)},
    timelineRef: {path: '/input/timeline.json', fileSha256: hash(timelineBytes)},
    mediaRef: {path: '/input/media.mp4', fileSha256: '2'.repeat(64)}, planBytes, timelineBytes};
  const projection = {sourceClock: structuredClone(source)};
  assert.doesNotThrow(() => validateSavedSourceBindings(source, projection));
  const other = structuredClone(source); other.mediaRef.fileSha256 = '3'.repeat(64);
  assert.throws(() => validateSavedSourceBindings(other, projection), /mediaRef differs/);
  assert.throws(() => validateSavedSourceBindings({...source, planBytes: planBytes + '\n'}, projection), /embedded source bytes differ/);
  assert.throws(() => validateSavedSourceBindings({...source, timelineBytes: '{"segments":[1]}'}, projection), /embedded source bytes differ/);
});
test('ASR saved decimal seconds retain sub-sample precision without silently rounding', () => {
  assert.deepEqual(secondsToObservationSample(0.04, 16000), {numerator: 640, denominator: 1});
  const exact = secondsToObservationSample(43.120000000000005, 16000);
  assert.equal(BigInt(exact.numerator) * 1000000000000000n,
    43120000000000005n * 16000n * BigInt(exact.denominator));
  assert.notEqual(BigInt(exact.numerator), 689920n * BigInt(exact.denominator));
});
