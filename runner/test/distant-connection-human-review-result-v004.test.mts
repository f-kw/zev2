import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionHumanReviewResultErrorV004,
  assertDistantConnectionHumanReviewResultV004,
  buildDistantConnectionHumanReviewResultV004,
  serializeDistantConnectionHumanReviewResultV004,
  validateDistantConnectionHumanReviewResultAgainstSourcesV004
} from '../src/distant-connection-human-review-result-v004.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json';
const videoPrototypeResultPath =
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json';
const artifactPath =
  'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v004/human-review-result-v004.json';
const candidateSha = '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8';
const videoPrototypeSha = '8137a990774f78974008e8bbe8555f8618ce4933a968dd3295c22b017db2b527';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function sourceInput() {
  const [candidateResponseBytes, videoPrototypeResultBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, videoPrototypeResultPath))
  ]);
  return {
    candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: candidateSha,
    videoPrototypeResultPath,
    videoPrototypeResultBytes,
    expectedVideoPrototypeResultSha256: videoPrototypeSha
  };
}

test('今回2候補の3品質軸と最終不採用を候補・試作動画へSHA束縛する', async () => {
  const input = await sourceInput();
  const result = buildDistantConnectionHumanReviewResultV004(input);
  assert.deepEqual(result.candidateReviews, [
    {
      candidateId: 'candidate-horror-claim-to-speed-up',
      connectionValidity: 'pass',
      payoffStrength: 'fail',
      visualSuitability: 'not-primary-cause',
      finalDecision: 'fail',
      reason:
        '接続関係自体はある。ただし後半の恐怖場面・反応が弱く、「今年一怖い」という前振りに対する回収強度が不足している。意味接続と具体的回収の存在だけでは採用価値を保証できない。'
    },
    {
      candidateId: 'candidate-doctor-disappearance-to-ogre-mother',
      connectionValidity: 'pass',
      payoffStrength: 'story-level-pass',
      visualSuitability: 'fail',
      finalDecision: 'fail',
      reason:
        '物語上の意味接続はある。ただし前後とも文字情報中心で、映像としての変化・反応・魅力が弱い。意味的には成立していてもショート動画として弱い。'
    }
  ]);
  assert.equal(result.sourceBindings.candidateResponse.fileSha256, candidateSha);
  assert.equal(result.sourceBindings.videoPrototypeResult.fileSha256, videoPrototypeSha);
  assert.match(result.responsibilityPrinciple, /Lunaは映像適性の正式所有者ではなく/u);
  validateDistantConnectionHumanReviewResultAgainstSourcesV004(result, input);
});

test('同一の2正本から同一byteを生成する', async () => {
  const input = await sourceInput();
  const first = serializeDistantConnectionHumanReviewResultV004(
    buildDistantConnectionHumanReviewResultV004(input)
  );
  const second = serializeDistantConnectionHumanReviewResultV004(
    buildDistantConnectionHumanReviewResultV004(input)
  );
  assert.deepEqual(first, second);
});

test('2正本のSHA不一致をそれぞれ拒否する', async () => {
  const input = await sourceInput();
  for (const key of [
    'expectedCandidateResponseSha256',
    'expectedVideoPrototypeResultSha256'
  ] as const) {
    assert.throws(() => buildDistantConnectionHumanReviewResultV004({
      ...input,
      [key]: '0'.repeat(64)
    }), DistantConnectionHumanReviewResultErrorV004);
  }
});

test('3軸・最終採否・余分field・未知候補の改変をfail-closedで拒否する', async () => {
  const result = buildDistantConnectionHumanReviewResultV004(await sourceInput());
  for (const mutation of [
    {candidateReviews: [
      {...result.candidateReviews[0], connectionValidity: 'fail'},
      result.candidateReviews[1]
    ]},
    {candidateReviews: [
      {...result.candidateReviews[0], payoffStrength: 'story-level-pass'},
      result.candidateReviews[1]
    ]},
    {candidateReviews: [
      result.candidateReviews[0],
      {...result.candidateReviews[1], visualSuitability: 'pass'}
    ]},
    {candidateReviews: [
      {...result.candidateReviews[0], finalDecision: 'pass'},
      result.candidateReviews[1]
    ]},
    {candidateReviews: [
      {...result.candidateReviews[0], candidateId: 'unknown'},
      result.candidateReviews[1]
    ]},
    {extra: true}
  ]) {
    assert.throws(() => assertDistantConnectionHumanReviewResultV004({
      ...result,
      ...mutation
    }), DistantConnectionHumanReviewResultErrorV004);
  }
});

test('候補動画QCまたは正式候補bindingが不正なら拒否する', async () => {
  const input = await sourceInput();
  const videoResult = JSON.parse(input.videoPrototypeResultBytes.toString('utf8'));
  videoResult.candidates[0].qc.status = 'failed';
  assert.throws(() => buildDistantConnectionHumanReviewResultV004({
    ...input,
    videoPrototypeResultBytes: Buffer.from(`${JSON.stringify(videoResult)}\n`),
    expectedVideoPrototypeResultSha256: sha256(
      Buffer.from(`${JSON.stringify(videoResult)}\n`)
    )
  }), DistantConnectionHumanReviewResultErrorV004);

  const bindingResult = JSON.parse(input.videoPrototypeResultBytes.toString('utf8'));
  bindingResult.sourceBindings.candidateResponse.fileSha256 = '0'.repeat(64);
  assert.throws(() => buildDistantConnectionHumanReviewResultV004({
    ...input,
    videoPrototypeResultBytes: Buffer.from(`${JSON.stringify(bindingResult)}\n`),
    expectedVideoPrototypeResultSha256: sha256(
      Buffer.from(`${JSON.stringify(bindingResult)}\n`)
    )
  }), DistantConnectionHumanReviewResultErrorV004);
});

test('保存済みv004は2正本からの決定的再生成byteと一致する', async () => {
  const [input, savedBytes] = await Promise.all([
    sourceInput(),
    readFile(path.join(workspaceRoot, artifactPath))
  ]);
  const rebuilt = serializeDistantConnectionHumanReviewResultV004(
    buildDistantConnectionHumanReviewResultV004(input)
  );
  assert.deepEqual(savedBytes, rebuilt);
  assertDistantConnectionHumanReviewResultV004(JSON.parse(savedBytes.toString('utf8')));
  assert.equal(sha256(savedBytes), sha256(rebuilt));
});
