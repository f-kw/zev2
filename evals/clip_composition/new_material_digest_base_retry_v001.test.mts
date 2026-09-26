import test from 'node:test';
import assert from 'node:assert/strict';
import {receivedInstructionRecordId} from './run_new_material_digest_20260926_base_retry.mts';

const receipt = {schemaVersion: 'new-material-digest-received-instruction-v001',
  instruction: 'Codex2｜5. 新素材Digest生成', receivedInstructionSha256: 'a'.repeat(64)};

test('manufacturing references the received instruction without changing the saved receipt', () => {
  const original = structuredClone(receipt);
  assert.equal(receivedInstructionRecordId(receipt), `received-instruction-sha256-${'a'.repeat(64)}`);
  assert.deepEqual(receipt, original);
  assert.notEqual(receivedInstructionRecordId({...receipt, receivedInstructionSha256: 'b'.repeat(64)}), receivedInstructionRecordId(receipt));
});

test('missing or malformed instruction identity is rejected before manufacturing', () => {
  for (const value of [undefined, null, '', 'bad', 'a'.repeat(63)]) {
    assert.throws(() => receivedInstructionRecordId({...receipt, receivedInstructionSha256: value}));
  }
});

test('a receipt from a different instruction or schema is not substituted', () => {
  assert.throws(() => receivedInstructionRecordId({...receipt, instruction: 'other'}));
  assert.throws(() => receivedInstructionRecordId({...receipt, schemaVersion: 'other'}));
});
