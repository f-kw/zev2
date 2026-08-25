import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const root =
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-ymUsGrT6EaA-v001';
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('初回実配信の旧動画試作計画と結果は履歴としてbyte不変に保つ', async () => {
  const [planBytes, resultBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, root, 'video-prototype-plan-v001.json')),
    readFile(path.join(workspaceRoot, root, 'video-prototype-result-v001.json'))
  ]);
  assert.equal(hash(planBytes), '5f72049c6e0b804d1362f3c361e3d8b771291f3c8281dd563c81986e5c45fead');
  assert.equal(hash(resultBytes), 'e112f11674394848731a5b8927203d676024e28f5831b2317521e7f734f3fe51');
  const result = JSON.parse(resultBytes.toString('utf8'));
  assert.equal(result.candidateCount, 2);
  assert.equal(result.qc.status, 'passed');
  assert.deepEqual(result.candidates.map((candidate: {candidateId: string}) => candidate.candidateId), [
    'candidate-000001',
    'candidate-000002'
  ]);
});
