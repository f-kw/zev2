import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionHumanReviewResultErrorV003,
  assertDistantConnectionHumanReviewResultV003,
  buildDistantConnectionHumanReviewResultV003,
  serializeDistantConnectionHumanReviewResultV003,
  validateDistantConnectionHumanReviewResultAgainstSourcesV003
} from '../src/distant-connection-human-review-result-v003.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-short-form-viability-ymUsGrT6EaA-v001/candidate-response-v001.json';
const videoPrototypeResultPath =
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-short-form-viability-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json';
const comparisonHumanReviewResultV002Path =
  'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v002/human-review-result-v002.json';
const artifactPath =
  'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v003/human-review-result-v003.json';
const candidateSha = 'a73fef9ac2c1d12b46b49b0d0dab9eb6f0293aa34b89425296717fc1334b8d49';
const videoPrototypeSha = '7bc9c46b3dce4d1cef650cdb1ff4a3e358f7295bbc54bf6c282045482dadc992';
const comparisonV002Sha = 'fac03dc688f28e64831a7b8241cec560313cf7da3aacc585b30bf8efab270a92';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function sourceInput() {
  const [candidateResponseBytes, videoPrototypeResultBytes,
    comparisonHumanReviewResultV002Bytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, videoPrototypeResultPath)),
    readFile(path.join(workspaceRoot, comparisonHumanReviewResultV002Path))
  ]);
  return {
    candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: candidateSha,
    videoPrototypeResultPath,
    videoPrototypeResultBytes,
    expectedVideoPrototypeResultSha256: videoPrototypeSha,
    comparisonHumanReviewResultV002Path,
    comparisonHumanReviewResultV002Bytes,
    expectedComparisonHumanReviewResultV002Sha256: comparisonV002Sha
  };
}

test('短尺3候補の不採用評価を候補・動画・既存合格例へSHA束縛する', async () => {
  const input = await sourceInput();
  const result = buildDistantConnectionHumanReviewResultV003(input);
  assert.deepEqual(result.candidateReviews.map((review) => ({
    candidateId: review.candidateId,
    candidateSelection: review.candidateSelection,
    primaryCause: review.primaryCause
  })), [
    {candidateId: 'distant-connection-001', candidateSelection: 'fail', primaryCause: 'candidate-selection'},
    {candidateId: 'distant-connection-002', candidateSelection: 'fail', primaryCause: 'candidate-selection'},
    {candidateId: 'distant-connection-003', candidateSelection: 'fail', primaryCause: 'candidate-selection'}
  ]);
  assert.equal(result.sourceBindings.candidateResponse.fileSha256, candidateSha);
  assert.equal(result.sourceBindings.videoPrototypeResult.fileSha256, videoPrototypeSha);
  assert.equal(
    result.sourceBindings.comparisonHumanReviewResultV002.fileSha256,
    comparisonV002Sha
  );
  assert.match(result.selectionPrinciple, /単なる話題一致ではなく/u);
  assert.match(result.comparisonDistinction, /camera-fear-escalation/u);
  validateDistantConnectionHumanReviewResultAgainstSourcesV003(result, input);
});

test('同一の3正本から同一byteを生成する', async () => {
  const input = await sourceInput();
  const first = serializeDistantConnectionHumanReviewResultV003(
    buildDistantConnectionHumanReviewResultV003(input)
  );
  const second = serializeDistantConnectionHumanReviewResultV003(
    buildDistantConnectionHumanReviewResultV003(input)
  );
  assert.deepEqual(first, second);
});

test('3正本のSHA不一致をそれぞれ拒否する', async () => {
  const input = await sourceInput();
  for (const key of [
    'expectedCandidateResponseSha256',
    'expectedVideoPrototypeResultSha256',
    'expectedComparisonHumanReviewResultV002Sha256'
  ] as const) {
    assert.throws(() => buildDistantConnectionHumanReviewResultV003({
      ...input,
      [key]: '0'.repeat(64)
    }), DistantConnectionHumanReviewResultErrorV003);
  }
});

test('評価改変・余分field・未知候補をfail-closedで拒否する', async () => {
  const result = buildDistantConnectionHumanReviewResultV003(await sourceInput());
  assert.throws(() => assertDistantConnectionHumanReviewResultV003({
    ...result,
    candidateReviews: [
      {...result.candidateReviews[0], candidateSelection: 'pass'},
      ...result.candidateReviews.slice(1)
    ]
  }), DistantConnectionHumanReviewResultErrorV003);
  assert.throws(() => assertDistantConnectionHumanReviewResultV003({
    ...result,
    candidateReviews: [
      {...result.candidateReviews[0], candidateId: 'unknown'},
      ...result.candidateReviews.slice(1)
    ]
  }), DistantConnectionHumanReviewResultErrorV003);
  assert.throws(() => assertDistantConnectionHumanReviewResultV003({
    ...result,
    extra: true
  }), DistantConnectionHumanReviewResultErrorV003);
});

test('保存済みv003は3正本からの決定的再生成byteと一致する', async () => {
  const [input, savedBytes] = await Promise.all([
    sourceInput(),
    readFile(path.join(workspaceRoot, artifactPath))
  ]);
  const rebuilt = serializeDistantConnectionHumanReviewResultV003(
    buildDistantConnectionHumanReviewResultV003(input)
  );
  assert.deepEqual(savedBytes, rebuilt);
  assertDistantConnectionHumanReviewResultV003(JSON.parse(savedBytes.toString('utf8')));
  assert.match(sha256(savedBytes), /^[0-9a-f]{64}$/u);
});
