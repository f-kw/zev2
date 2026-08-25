import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const root =
  'evals/clip_composition/outputs/work-distant-connection-human-review-ymUsGrT6EaA-v001';
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json';
const semanticPath =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('初回実配信の旧確認ページ・manifest・入力正本は履歴としてbyte不変に保つ', async () => {
  const [pageBytes, manifestBytes, candidateBytes, semanticBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, root, 'review.html')),
    readFile(path.join(workspaceRoot, root, 'review-manifest-v001.json')),
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, semanticPath))
  ]);
  assert.equal(hash(pageBytes), '0de9ef036b328468dd9337e4dbe51d67fa8350584176214527760b6c86c43111');
  assert.equal(hash(manifestBytes), '29995da1253dadce9de39359b0e66efabfc72274f9ebd553cfe4f073630090bb');
  assert.equal(hash(candidateBytes), '3fa51bcf8c7fd604b316c94cd7a522adf81793a095c0bd3ebbc74b375fdb9c1e');
  assert.equal(hash(semanticBytes), 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.candidateCount, 2);
  assert.equal(manifest.validation.decision, 'passed');
});
