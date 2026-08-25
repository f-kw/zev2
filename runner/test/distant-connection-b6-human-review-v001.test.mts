import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const reviewPagePath =
  'evals/clip_composition/outputs/work-distant-connection-b6-human-review-v001/review.html';
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/candidate-response-v001.json';
const b6RunManifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/b6-run-manifest-v001.json';
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('小型入力の旧B6確認ページと正式候補は履歴としてbyte不変に保つ', async () => {
  const [pageBytes, candidateBytes, manifestBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, reviewPagePath)),
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, b6RunManifestPath))
  ]);
  assert.equal(hash(pageBytes), 'e606f0353d12d945003b80f0c1b93b303f09241f53960255fc271a3a3ebfb346');
  assert.equal(hash(candidateBytes), 'bab6f3a37d74ae99829b09258a41cf45c12b5dc5a18a651ae4ed49d8ba7196fe');
  assert.equal(hash(manifestBytes), '94ccf404edb86e286955778375684782612feea65e1ddd0a5ba4eaab2dfaec40');
  const page = pageBytes.toString('utf8');
  assert.ok(page.includes('candidate-000001'));
  assert.ok(page.includes('candidate-000002'));
  assert.equal((page.match(/<article class="candidate"/gu) ?? []).length, 2);
});
