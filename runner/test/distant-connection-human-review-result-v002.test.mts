import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionHumanReviewResultErrorV002,
  assertDistantConnectionHumanReviewResultV002,
  buildDistantConnectionHumanReviewResultV002,
  serializeDistantConnectionHumanReviewResultV002,
  validateDistantConnectionHumanReviewResultAgainstSourcesV002
} from '../src/distant-connection-human-review-result-v002.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json';
const originalVideoPrototypeResultPath =
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-quality-increment-ymUsGrT6EaA-v001/video-prototype-result-v001.json';
const intervalizationImprovementResultPath =
  'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json';
const artifactPath =
  'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v002/human-review-result-v002.json';
const candidateSha = '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d';
const originalVideoSha = '194e8749adbd28c78118caead50c278ea5d2d0949d9c2bfdc431c6646f1b740f';
const improvedVideoSha = 'b1a6c1e4233aaabf447ec5ab3ca7d14657bd5a1dfb09a18557c11752fdd85dfe';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function sourceInput() {
  const [candidateResponseBytes, originalVideoPrototypeResultBytes,
    intervalizationImprovementResultBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, originalVideoPrototypeResultPath)),
    readFile(path.join(workspaceRoot, intervalizationImprovementResultPath))
  ]);
  return {
    candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: candidateSha,
    originalVideoPrototypeResultPath,
    originalVideoPrototypeResultBytes,
    expectedOriginalVideoPrototypeResultSha256: originalVideoSha,
    intervalizationImprovementResultPath,
    intervalizationImprovementResultBytes,
    expectedIntervalizationImprovementResultSha256: improvedVideoSha
  };
}

test('候補選択と区間化を分離したkawafmm評価を3正本へSHA束縛する', async () => {
  const input = await sourceInput();
  const result = buildDistantConnectionHumanReviewResultV002(input);
  assert.deepEqual(result.candidateReviews.map((review) => ({
    candidateId: review.candidateId,
    candidateSelection: review.candidateSelection,
    originalIntervalization: review.originalIntervalization,
    improvedIntervalization: review.improvedIntervalization,
    shortFormViability: review.shortFormViability
  })), [
    {
      candidateId: 'camera-fear-escalation', candidateSelection: 'pass',
      originalIntervalization: 'fail', improvedIntervalization: 'pass',
      shortFormViability: 'pass'
    },
    {
      candidateId: 'medicine-effect-payoff', candidateSelection: 'fail',
      originalIntervalization: 'fail', improvedIntervalization: 'pass',
      shortFormViability: 'fail'
    }
  ]);
  assert.equal(result.sourceBindings.candidateResponse.fileSha256, candidateSha);
  assert.equal(result.sourceBindings.originalVideoPrototypeResult.fileSha256, originalVideoSha);
  assert.equal(result.sourceBindings.intervalizationImprovementResult.fileSha256, improvedVideoSha);
  assert.match(result.selectionPrinciple, /短尺動画として自然な長さ/u);
  validateDistantConnectionHumanReviewResultAgainstSourcesV002(result, input);
});

test('同一の3正本から同一byteを生成する', async () => {
  const input = await sourceInput();
  const first = serializeDistantConnectionHumanReviewResultV002(
    buildDistantConnectionHumanReviewResultV002(input)
  );
  const second = serializeDistantConnectionHumanReviewResultV002(
    buildDistantConnectionHumanReviewResultV002(input)
  );
  assert.deepEqual(first, second);
});

test('3正本のSHA不一致をそれぞれ拒否する', async () => {
  const input = await sourceInput();
  for (const key of [
    'expectedCandidateResponseSha256',
    'expectedOriginalVideoPrototypeResultSha256',
    'expectedIntervalizationImprovementResultSha256'
  ] as const) {
    assert.throws(() => buildDistantConnectionHumanReviewResultV002({
      ...input,
      [key]: '0'.repeat(64)
    }), DistantConnectionHumanReviewResultErrorV002);
  }
});

test('候補評価の改変・余分field・未知候補をfail-closedで拒否する', async () => {
  const result = buildDistantConnectionHumanReviewResultV002(await sourceInput());
  assert.throws(() => assertDistantConnectionHumanReviewResultV002({
    ...result,
    candidateReviews: [
      {...result.candidateReviews[0], candidateSelection: 'fail'},
      result.candidateReviews[1]
    ]
  }), DistantConnectionHumanReviewResultErrorV002);
  assert.throws(() => assertDistantConnectionHumanReviewResultV002({
    ...result,
    candidateReviews: [
      {...result.candidateReviews[0], candidateId: 'unknown'},
      result.candidateReviews[1]
    ]
  }), DistantConnectionHumanReviewResultErrorV002);
  assert.throws(() => assertDistantConnectionHumanReviewResultV002({
    ...result,
    extra: true
  }), DistantConnectionHumanReviewResultErrorV002);
});

test('保存済みv002は3正本からの決定的再生成byteと一致する', async () => {
  const [input, savedBytes] = await Promise.all([
    sourceInput(),
    readFile(path.join(workspaceRoot, artifactPath))
  ]);
  const rebuilt = serializeDistantConnectionHumanReviewResultV002(
    buildDistantConnectionHumanReviewResultV002(input)
  );
  assert.deepEqual(savedBytes, rebuilt);
  assertDistantConnectionHumanReviewResultV002(JSON.parse(savedBytes.toString('utf8')));
  assert.match(sha256(savedBytes), /^[0-9a-f]{64}$/u);
});
