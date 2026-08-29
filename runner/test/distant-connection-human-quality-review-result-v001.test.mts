import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionHumanQualityReviewResultErrorV001,
  assertDistantConnectionHumanQualityReviewResultV001,
  buildDistantConnectionHumanQualityReviewResultV001,
  serializeDistantConnectionHumanQualityReviewResultV001,
  validateDistantConnectionHumanQualityReviewResultAgainstSourcesV001
} from '../src/distant-connection-human-quality-review-result-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json';
const videoPrototypeResultPath =
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json';
const artifactPath =
  'evals/clip_composition/outputs/work-distant-connection-human-quality-review-result-ymUsGrT6EaA-v001/human-quality-review-result-v001.json';
const v004ArtifactPath =
  'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v004/human-review-result-v004.json';
const candidateSha = '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8';
const videoPrototypeSha = '8137a990774f78974008e8bbe8555f8618ce4933a968dd3295c22b017db2b527';
const v004ArtifactSha = 'f636ba9f33385f9e09643af514d1da4b3381c78bf5b24a29f1deeda0640af2ee';

const reviews = [
  {
    candidateId: 'candidate-horror-claim-to-speed-up',
    connectionValidity: 'pass' as const,
    payoffStrength: 'fail' as const,
    visualSuitability: 'not-primary-cause' as const,
    intervalizationEvaluation: 'pass' as const,
    finalDecision: 'fail' as const,
    humanReason:
      '接続関係自体はある。ただし後半の恐怖場面・反応が弱く、「今年一怖い」という前振りに対する回収強度が不足している。意味接続と具体的回収の存在だけでは採用価値を保証できない。'
  },
  {
    candidateId: 'candidate-doctor-disappearance-to-ogre-mother',
    connectionValidity: 'pass' as const,
    payoffStrength: 'story-level-pass' as const,
    visualSuitability: 'fail' as const,
    intervalizationEvaluation: 'pass' as const,
    finalDecision: 'fail' as const,
    humanReason:
      '物語上の意味接続はある。ただし前後とも文字情報中心で、映像としての変化・反応・魅力が弱い。意味的には成立していてもショート動画として弱い。'
  }
];

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
    expectedVideoPrototypeResultSha256: videoPrototypeSha,
    reviewedAt: '2026-08-29',
    reviewer: 'kawafmm',
    candidateReviews: reviews
  };
}

test('今回2候補のv004評価を一般3軸・区間化・最終採否として保存する', async () => {
  const input = await sourceInput();
  const result = buildDistantConnectionHumanQualityReviewResultV001(input);
  assert.equal(result.sourceVideoId, 'ymUsGrT6EaA');
  assert.equal(result.candidateCount, 2);
  assert.deepEqual(result.candidateReviews, reviews);
  assert.equal(result.sourceBindings.candidateResponse.fileSha256, candidateSha);
  assert.equal(result.sourceBindings.videoPrototypeResult.fileSha256, videoPrototypeSha);
  assert.match(result.responsibilityPrinciple, /実動画を確認した人間/u);
  validateDistantConnectionHumanQualityReviewResultAgainstSourcesV001(result, input);
});

test('既存v004を変更せず3軸・最終採否・人間理由を同じ意味で再現する', async () => {
  const [result, v004Bytes] = await Promise.all([
    sourceInput().then(buildDistantConnectionHumanQualityReviewResultV001),
    readFile(path.join(workspaceRoot, v004ArtifactPath))
  ]);
  assert.equal(sha256(v004Bytes), v004ArtifactSha);
  const v004 = JSON.parse(v004Bytes.toString('utf8'));
  assert.deepEqual(result.candidateReviews.map((review) => ({
    candidateId: review.candidateId,
    connectionValidity: review.connectionValidity,
    payoffStrength: review.payoffStrength,
    visualSuitability: review.visualSuitability,
    finalDecision: review.finalDecision,
    reason: review.humanReason
  })), v004.candidateReviews);
});

test('3軸・区間化評価・最終採否は独立した合法値として保存できる', async () => {
  const input = await sourceInput();
  const result = buildDistantConnectionHumanQualityReviewResultV001({
    ...input,
    candidateReviews: [
      {
        ...reviews[0],
        connectionValidity: 'fail',
        payoffStrength: 'pass',
        visualSuitability: 'pass',
        intervalizationEvaluation: 'fail',
        finalDecision: 'pass'
      },
      reviews[1]
    ]
  });
  assert.deepEqual(result.candidateReviews[0], {
    ...reviews[0],
    connectionValidity: 'fail',
    payoffStrength: 'pass',
    visualSuitability: 'pass',
    intervalizationEvaluation: 'fail',
    finalDecision: 'pass'
  });
});

test('同一入力から同一formal byteを生成する', async () => {
  const input = await sourceInput();
  const first = serializeDistantConnectionHumanQualityReviewResultV001(
    buildDistantConnectionHumanQualityReviewResultV001(input)
  );
  const second = serializeDistantConnectionHumanQualityReviewResultV001(
    buildDistantConnectionHumanQualityReviewResultV001(input)
  );
  assert.deepEqual(first, second);
});

test('2正本のSHA不一致をそれぞれ拒否する', async () => {
  const input = await sourceInput();
  for (const key of [
    'expectedCandidateResponseSha256',
    'expectedVideoPrototypeResultSha256'
  ] as const) {
    assert.throws(() => buildDistantConnectionHumanQualityReviewResultV001({
      ...input,
      [key]: '0'.repeat(64)
    }), DistantConnectionHumanQualityReviewResultErrorV001);
  }
});

test('未知・欠落・重複・順序不一致candidateを拒否する', async () => {
  const input = await sourceInput();
  for (const candidateReviews of [
    reviews.slice(0, 1),
    [reviews[0], reviews[0]],
    [reviews[1], reviews[0]],
    [{...reviews[0], candidateId: 'unknown-candidate'}, reviews[1]]
  ]) {
    assert.throws(() => buildDistantConnectionHumanQualityReviewResultV001({
      ...input,
      candidateReviews
    }), DistantConnectionHumanQualityReviewResultErrorV001);
  }
});

test('sourceVideoId差と試作動画内の候補順序差を拒否する', async () => {
  const input = await sourceInput();
  for (const mutate of [
    (value: any) => { value.sourceVideoId = 'different-video'; },
    (value: any) => { value.candidates.reverse(); }
  ]) {
    const videoResult = JSON.parse(input.videoPrototypeResultBytes.toString('utf8'));
    mutate(videoResult);
    const bytes = Buffer.from(`${JSON.stringify(videoResult)}\n`);
    assert.throws(() => buildDistantConnectionHumanQualityReviewResultV001({
      ...input,
      videoPrototypeResultBytes: bytes,
      expectedVideoPrototypeResultSha256: sha256(bytes)
    }), DistantConnectionHumanQualityReviewResultErrorV001);
  }
});

test('余分fieldと不正enumを拒否する', async () => {
  const result = buildDistantConnectionHumanQualityReviewResultV001(await sourceInput());
  assert.throws(() => assertDistantConnectionHumanQualityReviewResultV001({
    ...result,
    extra: true
  }), DistantConnectionHumanQualityReviewResultErrorV001);
  assert.throws(() => assertDistantConnectionHumanQualityReviewResultV001({
    ...result,
    candidateReviews: [
      {...result.candidateReviews[0], payoffStrength: 'unknown'},
      result.candidateReviews[1]
    ]
  }), DistantConnectionHumanQualityReviewResultErrorV001);
});

test('保存済み一般成果物は2正本と人間入力からの再生成byteに一致する', async () => {
  const [input, savedBytes] = await Promise.all([
    sourceInput(),
    readFile(path.join(workspaceRoot, artifactPath))
  ]);
  const rebuilt = serializeDistantConnectionHumanQualityReviewResultV001(
    buildDistantConnectionHumanQualityReviewResultV001(input)
  );
  assert.deepEqual(savedBytes, rebuilt);
  assertDistantConnectionHumanQualityReviewResultV001(JSON.parse(savedBytes.toString('utf8')));
  assert.equal(sha256(savedBytes), sha256(rebuilt));
});
