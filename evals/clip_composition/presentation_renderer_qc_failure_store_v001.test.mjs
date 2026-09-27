import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createPresentationRendererFailureAfterWorkV001,
  savePresentationRendererQcFailureV001} from './render_presentation_v002.mjs';
import {readPresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';

const temporary = async fn => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-qc-failure-store-'));
  try {await fn(directory);} finally {await rm(directory, {recursive: true});}
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('the production post-render rejection preserves failed observations on disk and emits a small CLI report', async () => temporary(async scratchDirectory => {
  const common = {inputManifest: {source: 'a'.repeat(1024 * 1024)}};
  const samples = [{instructionId: '000103', frame: 7801, visible: false,
    classes: [{id: 'expected', absoluteRgbDifference: 1345125}, {id: 'duplicate', absoluteRgbDifference: 1344947}]}];
  const nested = {status: 'failed', method: 'exact-replay-native-v1',
    violations: [{code: 'NATIVE_FRAME_QC_INVALID', instructionId: '000103', reason: 'expected class is not the unique nearest reference'}],
    inspections: Array.from({length: 2200}, (_, index) => ({instructionId: String(index), nativeFrameQc: {...common, samples}})),
    evidence: {finiteState: {...common, samples}}};
  const violations = [{code: 'COMPLETED_FRAME_QC_INVALID', relatedIds: ['000103'], details: {violations: nested.violations}}];
  const cleanupWarnings = [{code: 'RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY', path: scratchDirectory}];
  const result = await createPresentationRendererFailureAfterWorkV001({scratchDirectory,
    stage: 'post-render-qc', violations, nested, cleanupWarnings});
  assert.equal(result.exitCode, 1);
  assert.equal(result.failure.status, 'failed');
  assert.equal(result.failure.stage, 'post-render-qc');
  assert.deepEqual(result.failure.violations, violations);
  assert.deepEqual(result.failure.cleanupWarnings, cleanupWarnings);
  assert.ok(JSON.stringify(result.failure).length < 4096);
  assert.equal(result.failure.nested.violationCount, 1);
  assert.equal(result.failure.nested.inspectionCount, 2200);
  assert.equal(Object.hasOwn(result.failure.nested, 'inspections'), false);
  const reference = result.failure.nested.failureFile, bytes = await readFile(reference.path);
  assert.equal(hash(bytes), reference.fileSha256);
  const restored = await readPresentationQcEvidenceV001(reference.path, {expectedFileSha256: reference.fileSha256});
  assert.deepEqual(restored.violations, nested.violations);
  assert.equal(restored.status, 'failed');
  assert.deepEqual(restored.evidence.finiteState.samples, samples);
  assert.strictEqual(restored.inspections[0].nativeFrameQc.inputManifest, restored.evidence.finiteState.inputManifest);
  assert.strictEqual(restored.inspections[2199].nativeFrameQc.samples, restored.evidence.finiteState.samples);
}));

test('exception evidence is preserved separately and neither duplicate-save nor missing-directory errors restore the huge inline graph', async () => temporary(async scratchDirectory => {
  const evidence = {method: 'exact-replay-native-v1', phase: 'native-discriminator', reason: 'synthetic process failure',
    replay: {status: 'passed'}, finiteStateFailure: {inputManifest: {inputs: ['saved-input']}, processes: [{failed: true}]},
    wallClockMs: 42};
  const summary = await savePresentationRendererQcFailureV001({scratchDirectory, evidence, kind: 'completed-frame-qc'});
  assert.equal(summary.status, 'failed');
  assert.equal(summary.phase, evidence.phase);
  assert.equal(summary.reason, evidence.reason);
  assert.equal(Object.hasOwn(summary, 'finiteStateFailure'), false);
  assert.deepEqual(await readPresentationQcEvidenceV001(summary.failureFile.path,
    {expectedFileSha256: summary.failureFile.fileSha256}), evidence);
  const before = await readFile(summary.failureFile.path);
  const duplicate = await savePresentationRendererQcFailureV001({scratchDirectory, evidence: {...evidence, reason: 'different'},
    kind: 'completed-frame-qc'});
  assert.match(duplicate.failureRecordWriteError, /EEXIST/);
  assert.equal(duplicate.status, 'failed');
  assert.equal(Object.hasOwn(duplicate, 'failureFile'), false);
  assert.equal(Object.hasOwn(duplicate, 'finiteStateFailure'), false);
  assert.deepEqual(await readFile(summary.failureFile.path), before);
  const missing = await savePresentationRendererQcFailureV001({scratchDirectory: path.join(scratchDirectory, 'missing'), evidence});
  assert.match(missing.failureRecordWriteError, /ENOENT/);
  assert.equal(Object.hasOwn(missing, 'failureFile'), false);
  assert.ok(JSON.stringify(missing).length < 2048);
}));

test('a missing saved evidence file is rejected by the reader', async () => temporary(async directory => {
  await assert.rejects(readPresentationQcEvidenceV001(path.join(directory, 'missing.json')), {code: 'ENOENT'});
}));
