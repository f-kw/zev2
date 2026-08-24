import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionHumanReviewResultErrorV001,
  assertDistantConnectionHumanReviewResultV001,
  buildDistantConnectionHumanReviewResultV001,
  serializeDistantConnectionHumanReviewResultV001,
  validateDistantConnectionHumanReviewResultAgainstSourcesV001
} from '../src/distant-connection-human-review-result-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json';
const sourcePackagePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-direction-clarified-ymUsGrT6EaA-v001/source-package-v001.json';
const videoPrototypeResultPath =
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-ymUsGrT6EaA-v001/video-prototype-result-v001.json';
const artifactPath =
  'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v001/human-review-result-v001.json';
const candidateSha = '3fa51bcf8c7fd604b316c94cd7a522adf81793a095c0bd3ebbc74b375fdb9c1e';
const videoResultSha = 'e112f11674394848731a5b8927203d676024e28f5831b2317521e7f734f3fe51';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function sourceInput() {
  const [candidateResponseBytes, sourcePackageBytes, videoPrototypeResultBytes] =
    await Promise.all([
      readFile(path.join(workspaceRoot, candidateResponsePath)),
      readFile(path.join(workspaceRoot, sourcePackagePath)),
      readFile(path.join(workspaceRoot, videoPrototypeResultPath))
    ]);
  return {
    candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: candidateSha,
    sourcePackagePath,
    sourcePackageBytes,
    videoPrototypeResultPath,
    videoPrototypeResultBytes,
    expectedVideoPrototypeResultSha256: videoResultSha
  };
}

test('正式候補2件の人間評価を候補と動画試作へSHA束縛する', async () => {
  const input = await sourceInput();
  const result = buildDistantConnectionHumanReviewResultV001(input);
  assert.deepEqual(result.candidateReviews.map((review) => ({
    candidateId: review.candidateId,
    judgment: review.judgment
  })), [
    {candidateId: 'candidate-000001', judgment: 'connection-valid-increment-weak'},
    {candidateId: 'candidate-000002', judgment: 'connection-valid-increment-weak'}
  ]);
  assert.equal(result.sourceBindings.candidateResponse.fileSha256, candidateSha);
  assert.equal(result.sourceBindings.videoPrototypeResult.fileSha256, videoResultSha);
  assert.match(result.candidateReviews[0].reason, /強い回収・意味・面白さの増分が不足/u);
  assert.match(result.exceptionPrinciple, /一般説明そのものは除外しない/u);
  validateDistantConnectionHumanReviewResultAgainstSourcesV001(result, input);
});

test('同一の正式候補と動画試作から同一byteを生成する', async () => {
  const input = await sourceInput();
  const first = serializeDistantConnectionHumanReviewResultV001(
    buildDistantConnectionHumanReviewResultV001(input)
  );
  const second = serializeDistantConnectionHumanReviewResultV001(
    buildDistantConnectionHumanReviewResultV001(input)
  );
  assert.deepEqual(first, second);
});

test('候補または動画試作のSHA不一致を拒否する', async () => {
  const input = await sourceInput();
  assert.throws(() => buildDistantConnectionHumanReviewResultV001({
    ...input,
    expectedCandidateResponseSha256: '0'.repeat(64)
  }), DistantConnectionHumanReviewResultErrorV001);
  assert.throws(() => buildDistantConnectionHumanReviewResultV001({
    ...input,
    expectedVideoPrototypeResultSha256: '0'.repeat(64)
  }), DistantConnectionHumanReviewResultErrorV001);
});

test('候補の欠落・重複・未知IDと余分なfieldをfail-closedで拒否する', async () => {
  const input = await sourceInput();
  const result = buildDistantConnectionHumanReviewResultV001(input);
  assert.throws(() => assertDistantConnectionHumanReviewResultV001({
    ...result,
    candidateReviews: [result.candidateReviews[0]]
  }), DistantConnectionHumanReviewResultErrorV001);
  assert.throws(() => assertDistantConnectionHumanReviewResultV001({
    ...result,
    candidateReviews: [result.candidateReviews[0], result.candidateReviews[0]]
  }), DistantConnectionHumanReviewResultErrorV001);
  assert.throws(() => assertDistantConnectionHumanReviewResultV001({
    ...result,
    candidateReviews: [
      result.candidateReviews[0],
      {...result.candidateReviews[1], candidateId: 'candidate-999999'}
    ]
  }), DistantConnectionHumanReviewResultErrorV001);
  assert.throws(() => assertDistantConnectionHumanReviewResultV001({
    ...result,
    extra: true
  }), DistantConnectionHumanReviewResultErrorV001);
});

test('保存済み成果物は現物からの決定的再生成byteと一致する', async () => {
  const [input, savedBytes] = await Promise.all([
    sourceInput(),
    readFile(path.join(workspaceRoot, artifactPath))
  ]);
  const rebuilt = serializeDistantConnectionHumanReviewResultV001(
    buildDistantConnectionHumanReviewResultV001(input)
  );
  assert.deepEqual(savedBytes, rebuilt);
  assertDistantConnectionHumanReviewResultV001(JSON.parse(savedBytes.toString('utf8')));
  assert.match(sha256(savedBytes), /^[0-9a-f]{64}$/u);
});
