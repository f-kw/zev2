/** Compare every logical finite-state candidate before/after a scoped QC
 * execution change. File locations and runtime measurements are not identity. */
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';

const [beforePath, afterPath, outputPath] = process.argv.slice(2);
assert([beforePath, afterPath, outputPath].every(value => path.isAbsolute(value ?? '')));
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const load = async file => {
  const bytes = await readFile(file); return {path: file, bytes: bytes.length,
    fileSha256: createHash('sha256').update(bytes).digest('hex'), result: JSON.parse(bytes)};
};
const before = await load(beforePath), after = await load(afterPath);
const describe = sample => ({instructionId: sample.instructionId, frame: sample.frame, mediaFrame: sample.mediaFrame,
  expectedState: sample.expectedState, expectedOverlaySha256: sample.expectedOverlaySha256,
  crop: sample.crop, completedRgbSha256: sample.completedRgbSha256, visible: sample.visible,
  expectedClassId: sample.expectedClassId, omittedClassId: sample.omittedClassId,
  references: sample.references.map(reference => ({id: reference.id, kind: reference.kind,
    layers: reference.layers, rgbSha256: reference.rgbSha256, classId: reference.classId})),
  classes: sample.classes.map(row => ({id: row.id, rgbSha256: row.rgbSha256,
    referenceIds: row.referenceIds, absoluteRgbDifference: row.absoluteRgbDifference}))});
const b = before.result, a = after.result;
assert.equal(b.status, 'passed'); assert.equal(a.status, 'passed');
assert.deepEqual(a.range, b.range); assert.equal(a.expectedFrameCount, b.expectedFrameCount);
assert.equal(a.viewSha256, b.viewSha256); assert.equal(a.projectionSha256, b.projectionSha256);
assert.deepEqual(a.fourSavedSha256, b.fourSavedSha256);
assert.equal(a.finalQc.status, b.finalQc.status); assert.deepEqual(a.finalQc.checks, b.finalQc.checks);
assert.deepEqual(a.finalQc.violations, b.finalQc.violations);
assert.equal(a.completedFrameQc.status, b.completedFrameQc.status);
assert.deepEqual(a.completedFrameQc.violations, b.completedFrameQc.violations);
const oldSamples = b.completedFrameQc.evidence.finiteState.samples.map(describe);
const newSamples = a.completedFrameQc.evidence.finiteState.samples.map(describe);
assert.equal(newSamples.length, oldSamples.length);
for (const [index, sample] of oldSamples.entries()) assert.deepEqual(newSamples[index], sample,
  'finite candidate/state/RGB/distance/verdict changed at sample ' + index);
const record = row => ({path: row.path, bytes: row.bytes, fileSha256: row.fileSha256,
  drawingRulesSha256: row.result.drawingRulesRef.canonicalSha256, candidateVideo: row.result.candidateVideo,
  timings: row.result.timings, qcPerformance: row.result.completedFrameQc.performance,
  nativeAssets: row.result.nativeAssets, finalAudioClock: row.result.finalAudioClock});
const result = {schemaVersion: 'presentation-editing-preview-qc-comparison-v001', status: 'passed',
  checkedAt: new Date().toISOString(), range: a.range, expectedFrameCount: a.expectedFrameCount,
  preserved: {savedChoices: true, projectedClock: true, finalChecksAndViolations: true,
    sampleFrames: true, expectedStates: true, allLogicalCandidates: true,
    referenceRgb: true, completedRgb: true, equivalenceClasses: true, absoluteRgbDistances: true},
  samples: oldSamples.length, logicalReferences: oldSamples.reduce((sum, row) => sum + row.references.length, 0),
  normalizedSamplesSha256: hash(newSamples),
  completeMediaBytesEqual: a.candidateVideo.fileSha256 === b.candidateVideo.fileSha256
    && a.candidateVideo.bytes === b.candidateVideo.bytes,
  before: record(before), after: record(after),
  limitation: '全論理候補・各照合画素・距離・判定の比較。実ブラウザー操作、人間の見心地、全編の再検証ではない。'};
await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
process.stdout.write(JSON.stringify({status: result.status, outputPath, samples: result.samples,
  logicalReferences: result.logicalReferences, completeMediaBytesEqual: result.completeMediaBytesEqual}) + '\n');
