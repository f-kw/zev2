import assert from 'node:assert/strict';
import test from 'node:test';
import {createReadabilityCapacityControlV001, READABILITY_FULL_RUN_CAPACITY_V001 as approved}
  from './caption-readability-candidate-run.mjs';

function harness(availableBytes, options = {}) {
  const rows = [];
  const control = createReadabilityCapacityControlV001({capacity: {...approved},
    observeDisk: async () => ({availableBytes, observedAt: 'test-observation'}),
    record: async row => rows.push(row), ...options});
  return {control, rows};
}

test('7A starts native at the approved boundary and saves the checkpoint observation before interrupting below it', async () => {
  const checkpointRef = {path: '/candidate/before-native.json', fileSha256: 'a'.repeat(64)};
  const allowed = harness(28_680_038_400);
  await allowed.control.beforeStart({checkpointRef});
  assert.equal(allowed.rows[0].status, 'continue');
  assert.deepEqual(allowed.rows[0].checkpointRef, checkpointRef);
  const denied = harness(28_680_038_399);
  await assert.rejects(denied.control.beforeStart({checkpointRef}), error => {
    assert.equal(error.code, 'READABILITY_CAPACITY_INTERRUPTED');
    assert.equal(denied.rows.length, 1);
    assert.deepEqual(error.capacityObservation, denied.rows[0]);
    return true;
  });
});

test('native batch uses only the approved 10 GB floor, never an invented planned-bytes reserve', async () => {
  const allowed = harness(10_000_000_000);
  await allowed.control.beforeHeavyBatch({phase: 'native-reference-composite', plannedLogicalBytes: 100_000_000_000});
  assert.equal(allowed.rows[0].status, 'continue');
  const denied = harness(9_999_999_999);
  await assert.rejects(denied.control.beforeHeavyBatch({phase: 'native-reference-composite'}),
    {code: 'READABILITY_CAPACITY_INTERRUPTED'});
});

test('completed failed sample records retained evidence without deleting it, then applies the same floor', async () => {
  let observations = 0;
  const {control, rows} = harness(9_999_999_999, {observeRetained: async event => {
    observations++;
    assert.equal(event.referenceRetention.state, 'retained');
    return {files: 3, logicalBytes: 123, allocatedBytes: 512};
  }});
  await assert.rejects(control.afterSample({sampleIndex: 2, instructionId: 'caption-3', frame: 123,
    visible: false, referenceRetention: {state: 'retained', checkpoint: {path: '/proof'}}}),
  {code: 'READABILITY_CAPACITY_INTERRUPTED'});
  assert.equal(observations, 1);
  assert.equal(rows[0].retained.logicalBytes, 123);
  assert.equal(rows[0].referenceRetention.checkpoint.path, '/proof');
});

test('normal released sample is recorded without trying to read deliberately released images', async () => {
  const {control, rows} = harness(12_000_000_000, {observeRetained: async () => {throw Error('must not inspect released RGB');}});
  await control.afterSample({visible: true, sampleIndex: 0,
    referenceRetention: {state: 'released-verified-pass', checkpoint: {path: '/proof'}}});
  assert.equal(rows[0].retained, null);
  assert.equal(rows[0].status, 'continue');
});

test('approval changes, unreadable capacity, and observation-save failures never admit the next stage', async () => {
  assert.throws(() => createReadabilityCapacityControlV001({capacity: {...approved, nativeHardFloorBytes: 0}}));
  const invalid = harness(NaN);
  await assert.rejects(invalid.control.beforeStart({}), /invalid available capacity/);
  const writeFailure = harness(40_000_000_000, {record: async () => {throw Error('disk write failed');}});
  await assert.rejects(writeFailure.control.beforeHeavyBatch({}), /disk write failed/);
});
