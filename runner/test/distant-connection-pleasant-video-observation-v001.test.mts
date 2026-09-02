import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001,
  DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESULT_SCHEMA_V001,
  DistantConnectionPleasantVideoObservationErrorV001,
  assertDistantConnectionPleasantVideoObservationPlanV001,
  assertDistantConnectionPleasantVideoObservationResultV001,
  buildDistantConnectionPleasantVideoObservationPageV001,
  buildDistantConnectionPleasantVideoObservationPlanFromFilesV001,
  buildDistantConnectionPleasantVideoObservationPlanV001,
  buildDistantConnectionPleasantVideoObservationResultV001,
  decodeDistantConnectionPleasantVideoObservationPlanV001,
  serializeDistantConnectionPleasantVideoObservationPlanV001,
  serializeDistantConnectionPleasantVideoObservationResultV001,
  validateDistantConnectionPleasantVideoObservationPlanAgainstSourcesV001,
  validateDistantConnectionPleasantVideoObservationResultAgainstPlanV001,
  type BuildDistantConnectionPleasantVideoObservationPlanInputV001,
  type PleasantVideoObservationVerdictV001
} from '../src/distant-connection-pleasant-video-observation-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-comparison-luna-b6-candidates-o8rZAhARXAc-v001/candidate-response-v001.json';
const candidateReviewResultPath =
  'evals/clip_composition/outputs/work-distant-connection-candidate-review-v002/o8rZAhARXAc-comparison-v001/candidate-review-result-v002.json';
const planPath =
  'evals/clip_composition/outputs/work-distant-connection-pleasant-video-observation-o8rZAhARXAc-v001/observation-plan-v001.json';
const pagePath =
  'evals/clip_composition/outputs/work-distant-connection-pleasant-video-observation-o8rZAhARXAc-v001/human-review.html';
const candidateResponseSha256 =
  '301919134213a54783540784c537553fc283874cf676f44064165975cec3f089';
const candidateReviewResultSha256 =
  '1ef46044e236dfd798f9b4591ffd6cebcb656536e1eb549c5f87c3f270d7ed59';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

let sourceInputPromise: Promise<BuildDistantConnectionPleasantVideoObservationPlanInputV001>
  | undefined;

function sourceInput(): Promise<BuildDistantConnectionPleasantVideoObservationPlanInputV001> {
  sourceInputPromise ??= (async () => {
    const [candidateResponseBytes, candidateReviewResultBytes] = await Promise.all([
      readFile(path.join(workspaceRoot, candidateResponsePath)),
      readFile(path.join(workspaceRoot, candidateReviewResultPath))
    ]);
    const reviewResult = JSON.parse(candidateReviewResultBytes.toString('utf8'));
    return {
      planId: 'pleasant-video-observation-o8rZAhARXAc-v001',
      candidateResponsePath,
      candidateResponseBytes,
      expectedCandidateResponseSha256: candidateResponseSha256,
      candidateReviewResultPath,
      candidateReviewResultBytes,
      expectedCandidateReviewResultSha256: candidateReviewResultSha256,
      reviewer: {kind: 'human', reviewerId: 'kawafmm'},
      observedMedia: reviewResult.candidates.map((candidate: any) => ({
        candidateId: candidate.candidateId,
        secondOnlySha256: candidate.reviewArtifacts.secondOnly.videoBinding.fileSha256,
        firstThenSecondSha256:
          candidate.reviewArtifacts.firstThenSecond.videoBinding.fileSha256
      }))
    };
  })();
  return sourceInputPromise;
}

function answersFor(
  plan: ReturnType<typeof buildDistantConnectionPleasantVideoObservationPlanV001>
) {
  const verdicts: PleasantVideoObservationVerdictV001[] = [
    'good', 'not-good', 'unsure', 'good', 'not-good', 'unsure', 'good'
  ];
  return plan.candidates.map((candidate, index) => ({
    candidateId: candidate.candidateId,
    verdict: verdicts[index]!
  }));
}

test('既存7候補・14本を同じ順序と現物SHAで三値観測planへ束縛する', async () => {
  const input = await sourceInput();
  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(input);
  assert.equal(plan.schemaVersion, DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001);
  assert.equal(plan.sourceVideoId, 'o8rZAhARXAc');
  assert.equal(plan.candidateCount, 7);
  assert.equal(plan.candidates.length, 7);
  assert.deepEqual(plan.allowedVerdicts, ['good', 'not-good', 'unsure']);
  assert.deepEqual(plan.evaluationOrder, ['second-only', 'first-then-second', 'verdict']);
  assert.equal(plan.sourceBindings.candidateResponse.fileSha256, candidateResponseSha256);
  assert.equal(
    plan.sourceBindings.candidateReviewResult.fileSha256,
    candidateReviewResultSha256
  );
  assert.equal(new Set(plan.candidates.flatMap((candidate) => [
    candidate.reviewMedia.secondOnly.path,
    candidate.reviewMedia.firstThenSecond.path
  ])).size, 14);
  validateDistantConnectionPleasantVideoObservationPlanAgainstSourcesV001(plan, input);
});

test('14本の現物byte SHAをstream検査して同じplanを再構築する', async () => {
  const input = await sourceInput();
  const fromFiles = await buildDistantConnectionPleasantVideoObservationPlanFromFilesV001({
    workspaceRoot,
    planId: input.planId,
    candidateResponsePath,
    expectedCandidateResponseSha256: candidateResponseSha256,
    candidateReviewResultPath,
    expectedCandidateReviewResultSha256: candidateReviewResultSha256,
    reviewer: input.reviewer
  });
  const inMemory = buildDistantConnectionPleasantVideoObservationPlanV001(input);
  assert.deepEqual(fromFiles, inMemory);
});

test('7件完全回答だけを三値観測resultとして受理し三値を独立保存する', async () => {
  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(await sourceInput());
  const planBytes = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  const input = {
    resultId: 'pleasant-video-observation-result-o8rZAhARXAc-v001',
    reviewPlanPath: planPath,
    reviewPlanBytes: planBytes,
    expectedReviewPlanSha256: sha256(planBytes),
    candidateVerdicts: answersFor(plan)
  };
  const result = buildDistantConnectionPleasantVideoObservationResultV001(input);
  assert.equal(result.schemaVersion, DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESULT_SCHEMA_V001);
  assert.deepEqual(
    result.candidateObservations.map((observation) => observation.verdict),
    ['good', 'not-good', 'unsure', 'good', 'not-good', 'unsure', 'good']
  );
  assert.equal(result.completionStatus, 'complete');
  assert.doesNotMatch(JSON.stringify(result), /reason|score|rank|selectionId/u);
  validateDistantConnectionPleasantVideoObservationResultAgainstPlanV001(result, input);
});

test('0〜6件の回答を正式resultとして拒否する', async () => {
  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(await sourceInput());
  const planBytes = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  for (let count = 0; count < 7; count += 1) {
    assert.throws(() => buildDistantConnectionPleasantVideoObservationResultV001({
      resultId: 'pleasant-video-observation-result-o8rZAhARXAc-v001',
      reviewPlanPath: planPath,
      reviewPlanBytes: planBytes,
      expectedReviewPlanSha256: sha256(planBytes),
      candidateVerdicts: answersFor(plan).slice(0, count)
    }), DistantConnectionPleasantVideoObservationErrorV001);
  }
});

test('未知・欠落・重複・順序変更candidateと不正な第四値を拒否する', async () => {
  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(await sourceInput());
  const planBytes = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  const common = {
    resultId: 'pleasant-video-observation-result-o8rZAhARXAc-v001',
    reviewPlanPath: planPath,
    reviewPlanBytes: planBytes,
    expectedReviewPlanSha256: sha256(planBytes)
  };
  const valid = answersFor(plan);
  for (const candidateVerdicts of [
    [...valid.slice(0, 6), {...valid[6]!, candidateId: 'candidate-' + '0'.repeat(64)}],
    valid.slice(0, 6),
    [valid[0]!, valid[0]!, ...valid.slice(2)],
    [valid[1]!, valid[0]!, ...valid.slice(2)],
    valid.map((answer, index) => index === 4 ? {...answer, verdict: 'excellent'} : answer),
    valid.map((answer, index) => index === 3 ? {...answer, reason: '余分な理由'} : answer)
  ]) {
    assert.throws(() => buildDistantConnectionPleasantVideoObservationResultV001({
      ...common,
      candidateVerdicts: candidateVerdicts as any
    }), DistantConnectionPleasantVideoObservationErrorV001);
  }
});

test('正しい構造でもcanonical formal byteでない正本入力を拒否する', async () => {
  const input = await sourceInput();
  const reviewResult = JSON.parse(input.candidateReviewResultBytes.toString('utf8'));
  const minifiedReviewResultBytes = Buffer.from(JSON.stringify(reviewResult), 'utf8');
  assert.throws(() => buildDistantConnectionPleasantVideoObservationPlanV001({
    ...input,
    candidateReviewResultBytes: minifiedReviewResultBytes,
    expectedCandidateReviewResultSha256: sha256(minifiedReviewResultBytes)
  }), DistantConnectionPleasantVideoObservationErrorV001);

  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(input);
  const minifiedPlanBytes = Buffer.from(JSON.stringify(plan), 'utf8');
  assert.throws(
    () => decodeDistantConnectionPleasantVideoObservationPlanV001(minifiedPlanBytes),
    DistantConnectionPleasantVideoObservationErrorV001
  );
});

test('候補・確認動画・planの各SHA差をfail-closedで拒否する', async () => {
  const input = await sourceInput();
  for (const key of [
    'expectedCandidateResponseSha256',
    'expectedCandidateReviewResultSha256'
  ] as const) {
    assert.throws(() => buildDistantConnectionPleasantVideoObservationPlanV001({
      ...input,
      [key]: '0'.repeat(64)
    }), DistantConnectionPleasantVideoObservationErrorV001);
  }
  assert.throws(() => buildDistantConnectionPleasantVideoObservationPlanV001({
    ...input,
    observedMedia: input.observedMedia.map((media, index) => index === 2
      ? {...media, secondOnlySha256: '0'.repeat(64)}
      : media)
  }), DistantConnectionPleasantVideoObservationErrorV001);

  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(input);
  const planBytes = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  assert.throws(() => buildDistantConnectionPleasantVideoObservationResultV001({
    resultId: 'pleasant-video-observation-result-o8rZAhARXAc-v001',
    reviewPlanPath: planPath,
    reviewPlanBytes: planBytes,
    expectedReviewPlanSha256: '0'.repeat(64),
    candidateVerdicts: answersFor(plan)
  }), DistantConnectionPleasantVideoObservationErrorV001);
});

test('動画ID差・候補順序差・正式発話差・余分fieldを拒否する', async () => {
  const input = await sourceInput();
  for (const mutate of [
    (value: any) => { value.sourceVideoId = 'different-video'; },
    (value: any) => {
      value.candidates.reverse();
      value.candidates.forEach((candidate: any, index: number) => {
        candidate.candidateOrdinal = index + 1;
      });
    },
    (value: any) => {
      value.candidates[0].reviewArtifacts.secondOnly.evaluatedParts[0]
        .selectedUtteranceIds = ['different-utterance'];
    },
    (value: any) => { value.extra = true; }
  ]) {
    const reviewResult = JSON.parse(input.candidateReviewResultBytes.toString('utf8'));
    mutate(reviewResult);
    const bytes = Buffer.from(`${JSON.stringify(reviewResult, null, 2)}\n`, 'utf8');
    assert.throws(() => buildDistantConnectionPleasantVideoObservationPlanV001({
      ...input,
      candidateReviewResultBytes: bytes,
      expectedCandidateReviewResultSha256: sha256(bytes)
    }), DistantConnectionPleasantVideoObservationErrorV001);
  }
});

test('plan/resultの余分fieldと動画段階の取り違えを拒否する', async () => {
  const input = await sourceInput();
  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(input);
  assert.throws(() => assertDistantConnectionPleasantVideoObservationPlanV001({
    ...plan,
    extra: true
  }), DistantConnectionPleasantVideoObservationErrorV001);
  const duplicatedMedia = structuredClone(plan);
  duplicatedMedia.candidates[1]!.reviewMedia.secondOnly =
    duplicatedMedia.candidates[0]!.reviewMedia.secondOnly;
  assert.throws(
    () => assertDistantConnectionPleasantVideoObservationPlanV001(duplicatedMedia),
    DistantConnectionPleasantVideoObservationErrorV001
  );
  const swapped = structuredClone(plan);
  swapped.candidates[0]!.reviewMedia = {
    secondOnly: plan.candidates[0]!.reviewMedia.firstThenSecond,
    firstThenSecond: plan.candidates[0]!.reviewMedia.secondOnly
  };
  assert.throws(() => validateDistantConnectionPleasantVideoObservationPlanAgainstSourcesV001(
    swapped,
    input
  ), DistantConnectionPleasantVideoObservationErrorV001);

  const planBytes = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  const resultInput = {
    resultId: 'pleasant-video-observation-result-o8rZAhARXAc-v001',
    reviewPlanPath: planPath,
    reviewPlanBytes: planBytes,
    expectedReviewPlanSha256: sha256(planBytes),
    candidateVerdicts: answersFor(plan)
  };
  const result = buildDistantConnectionPleasantVideoObservationResultV001(resultInput);
  assert.throws(() => assertDistantConnectionPleasantVideoObservationResultV001({
    ...result,
    extra: true
  }), DistantConnectionPleasantVideoObservationErrorV001);
});

test('同一入力からplan・result・ページの同一byteを生成する', async () => {
  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(await sourceInput());
  const planBytesA = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  const planBytesB = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  assert.deepEqual(planBytesA, planBytesB);
  const resultInput = {
    resultId: 'pleasant-video-observation-result-o8rZAhARXAc-v001',
    reviewPlanPath: planPath,
    reviewPlanBytes: planBytesA,
    expectedReviewPlanSha256: sha256(planBytesA),
    candidateVerdicts: answersFor(plan)
  };
  assert.deepEqual(
    serializeDistantConnectionPleasantVideoObservationResultV001(
      buildDistantConnectionPleasantVideoObservationResultV001(resultInput)
    ),
    serializeDistantConnectionPleasantVideoObservationResultV001(
      buildDistantConnectionPleasantVideoObservationResultV001(resultInput)
    )
  );
  const pageInput = {
    reviewPlanPath: planPath,
    reviewPlanBytes: planBytesA,
    expectedReviewPlanSha256: sha256(planBytesA),
    pageOutputPath: pagePath,
    resultId: resultInput.resultId
  };
  assert.deepEqual(
    buildDistantConnectionPleasantVideoObservationPageV001(pageInput),
    buildDistantConnectionPleasantVideoObservationPageV001(pageInput)
  );
});

test('3ボタンページは後半だけ→前半付きの順で7件を確認し理由入力を要求しない', async () => {
  const plan = buildDistantConnectionPleasantVideoObservationPlanV001(await sourceInput());
  const planBytes = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  const html = buildDistantConnectionPleasantVideoObservationPageV001({
    reviewPlanPath: planPath,
    reviewPlanBytes: planBytes,
    expectedReviewPlanSha256: sha256(planBytes),
    pageOutputPath: pagePath,
    resultId: 'pleasant-video-observation-result-o8rZAhARXAc-v001'
  }).toString('utf8');
  assert.equal((html.match(/<article class="candidate"/gu) ?? []).length, 7);
  assert.equal((html.match(/<video /gu) ?? []).length, 14);
  assert.equal((html.match(/data-verdict="good"/gu) ?? []).length, 7);
  assert.equal((html.match(/data-verdict="not-good"/gu) ?? []).length, 7);
  assert.equal((html.match(/data-verdict="unsure"/gu) ?? []).length, 7);
  assert.match(html, /0 \/ 7 件回答済み — まだ回答漏れがあります/u);
  assert.match(html, /7件すべてに答えると保存できます/u);
  assert.match(html, /data-first-then-second hidden/u);
  assert.doesNotMatch(html, /<textarea|addedUnderstanding|接続理由は.+?:/u);
  assert.doesNotMatch(html, /<button[^>]+class="[^"]*selected/u);
  assert.match(html, /良い／良くない／分からない/u);
});

test('既存14本・候補正本・候補確認結果のSHAは固定値から変わっていない', async () => {
  const input = await sourceInput();
  assert.equal(sha256(input.candidateResponseBytes), candidateResponseSha256);
  assert.equal(sha256(input.candidateReviewResultBytes), candidateReviewResultSha256);
  const rebuilt = await buildDistantConnectionPleasantVideoObservationPlanFromFilesV001({
    workspaceRoot,
    planId: input.planId,
    candidateResponsePath,
    expectedCandidateResponseSha256: candidateResponseSha256,
    candidateReviewResultPath,
    expectedCandidateReviewResultSha256: candidateReviewResultSha256,
    reviewer: input.reviewer
  });
  assert.deepEqual(
    rebuilt.candidates.map((candidate) => candidate.reviewMedia),
    buildDistantConnectionPleasantVideoObservationPlanV001(input)
      .candidates.map((candidate) => candidate.reviewMedia)
  );
});

test('保存済みplanと3ボタンページは正本入力からの再生成byteに一致する', async () => {
  const input = await sourceInput();
  const [savedPlanBytes, savedPageBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, planPath)),
    readFile(path.join(workspaceRoot, pagePath))
  ]);
  const plan = await buildDistantConnectionPleasantVideoObservationPlanFromFilesV001({
    workspaceRoot,
    planId: input.planId,
    candidateResponsePath,
    expectedCandidateResponseSha256: candidateResponseSha256,
    candidateReviewResultPath,
    expectedCandidateReviewResultSha256: candidateReviewResultSha256,
    reviewer: input.reviewer
  });
  const rebuiltPlanBytes = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  assert.deepEqual(savedPlanBytes, rebuiltPlanBytes);
  const rebuiltPageBytes = buildDistantConnectionPleasantVideoObservationPageV001({
    reviewPlanPath: planPath,
    reviewPlanBytes: rebuiltPlanBytes,
    expectedReviewPlanSha256: sha256(rebuiltPlanBytes),
    pageOutputPath: pagePath,
    resultId: 'pleasant-video-observation-result-o8rZAhARXAc-v001'
  });
  assert.deepEqual(savedPageBytes, rebuiltPageBytes);
});
