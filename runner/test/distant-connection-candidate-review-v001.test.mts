import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001,
  DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V001,
  DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V001,
  assertDistantConnectionCandidateHumanReviewResultV001,
  assertDistantConnectionCandidateReviewJobV001,
  assertDistantConnectionCandidateReviewResultV001,
  assertRejectedCandidateCannotEnterSelectionV001,
  buildDistantConnectionCandidateHumanReviewResultV001,
  buildDistantConnectionCandidateReviewJobV001,
  buildDistantConnectionCandidateReviewResultV001,
  serializeDistantConnectionCandidateHumanReviewResultV001,
  serializeDistantConnectionCandidateReviewJobV001,
  serializeDistantConnectionCandidateReviewResultV001,
  validateDistantConnectionCandidateHumanReviewResultAgainstSourcesV001,
  validateDistantConnectionCandidateReviewJobAgainstSourcesV001,
  validateDistantConnectionCandidateReviewResultAgainstJobV001,
  writeDistantConnectionCandidateHumanReviewResultV001,
  writeDistantConnectionCandidateReviewJobV001,
  writeDistantConnectionCandidateReviewResultV001,
  type BuildDistantConnectionCandidateHumanReviewResultInputV001,
  type BuildDistantConnectionCandidateReviewJobInputV001,
  type BuildDistantConnectionCandidateReviewResultInputV001
} from '../src/distant-connection-candidate-review-v001.js';

function formalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function fixture(): {
  jobInput: BuildDistantConnectionCandidateReviewJobInputV001;
  candidateResponse: Record<string, unknown>;
} {
  const utterances = [
    [1, 1_000, 1_500],
    [2, 1_600, 2_000],
    [3, 2_100, 2_400],
    [4, 5_000, 5_500],
    [5, 5_600, 5_900],
    [6, 6_000, 6_500]
  ].map(([ordinal, sourceStartMs, sourceEndMs]) => ({
    utteranceId: `semantic-utterance-${String(ordinal).padStart(6, '0')}`,
    ordinal,
    text: `発話${ordinal}`,
    sourceStartMs,
    sourceEndMs,
    sourceSegmentIds: [ordinal]
  }));
  const semantic = {
    schemaVersion: 'semantic-utterance-artifact-v001',
    sourceTranscriptBinding: {
      path: 'fixtures/transcript.json',
      schemaVersion: 'transcript-json-v001',
      fileSha256: '1'.repeat(64)
    },
    sourceUri: 'fixtures/source-video.mp4',
    language: 'ja',
    segmentCount: 6,
    utteranceCount: 6,
    utterances
  };
  const semanticUtteranceBytes = formalBytes(semantic);
  const semanticSha = sha256(semanticUtteranceBytes);
  const sourcePackage = {
    schemaVersion: 'distant-connection-luna-source-package-v001',
    sourceVideoId: 'source-video',
    semanticUtteranceBinding: {
      path: 'fixtures/semantic.json',
      schemaVersion: 'semantic-utterance-artifact-v001',
      fileSha256: semanticSha
    },
    commentVelocityAnchorBinding: {
      path: 'fixtures/anchors.json',
      schemaVersion: 'comment-velocity-anchor-artifact-v001',
      fileSha256: '2'.repeat(64)
    },
    plannedExecution: {},
    explorationTask: {},
    utteranceCount: 6,
    anchorCount: 1,
    utterances,
    anchors: [{anchorId: 'anchor-1', semanticUtteranceId: utterances[0].utteranceId}],
    responseContract: {sourcePackagePath: 'fixtures/source-package.json'}
  };
  const sourcePackageBytes = formalBytes(sourcePackage);
  const sourcePackageSha = sha256(sourcePackageBytes);
  const candidateResponse = {
    schemaVersion: 'distant-connection-luna-response-v001',
    sourceVideoId: 'source-video',
    sourcePackageBinding: {
      path: 'fixtures/source-package.json',
      schemaVersion: 'distant-connection-luna-source-package-v001',
      fileSha256: sourcePackageSha
    },
    candidates: [{
      candidateId: 'candidate-review-001',
      anchorId: 'anchor-1',
      firstPartSemanticUtteranceIds: [utterances[0].utteranceId, utterances[1].utteranceId],
      secondPartSemanticUtteranceIds: [utterances[3].utteranceId, utterances[5].utteranceId],
      addedUnderstanding: '前半を知ることで後半の出来事の意味が増える。',
      direction: 'future'
    }]
  };
  const candidateResponseBytes = formalBytes(candidateResponse);
  const sourceVideoBytes = Buffer.from('source-video-bytes', 'utf8');
  return {
    candidateResponse,
    jobInput: {
      jobId: 'candidate-review-job-001',
      candidateId: 'candidate-review-001',
      candidateResponsePath: 'fixtures/candidate-response.json',
      candidateResponseBytes,
      expectedCandidateResponseSha256: sha256(candidateResponseBytes),
      semanticUtterancePath: 'fixtures/semantic.json',
      semanticUtteranceBytes,
      expectedSemanticUtteranceSha256: semanticSha,
      sourcePackagePath: 'fixtures/source-package.json',
      sourcePackageBytes,
      expectedSourcePackageSha256: sourcePackageSha,
      sourceVideoPath: 'fixtures/source-video.mp4',
      observedSourceVideoSha256: sha256(sourceVideoBytes),
      expectedSourceVideoSha256: sha256(sourceVideoBytes),
      outputPath: 'outputs/candidate-review-001.mp4'
    }
  };
}

function buildResultFixture(): {
  fixtureValue: ReturnType<typeof fixture>;
  job: ReturnType<typeof buildDistantConnectionCandidateReviewJobV001>;
  resultInput: BuildDistantConnectionCandidateReviewResultInputV001;
} {
  const fixtureValue = fixture();
  const job = buildDistantConnectionCandidateReviewJobV001(fixtureValue.jobInput);
  const reviewJobBytes = serializeDistantConnectionCandidateReviewJobV001(job);
  const reviewVideoSha = sha256(Buffer.from('review-mp4-bytes', 'utf8'));
  return {
    fixtureValue,
    job,
    resultInput: {
      resultId: 'candidate-review-result-001',
      generatedAt: '2026-08-30T12:34:56.000Z',
      reviewJobPath: 'outputs/candidate-review-job-001.json',
      reviewJobBytes,
      expectedReviewJobSha256: sha256(reviewJobBytes),
      reviewVideoPath: job.output.path,
      observedReviewVideoSha256: reviewVideoSha,
      expectedReviewVideoSha256: reviewVideoSha,
      observedDurationMs: 4_900,
      observedVideoPresent: true,
      observedAudioPresent: true
    }
  };
}

function buildHumanFixture(verdict: 'rejected' | 'approved-for-interval-review' = 'rejected'): {
  result: ReturnType<typeof buildDistantConnectionCandidateReviewResultV001>;
  humanInput: BuildDistantConnectionCandidateHumanReviewResultInputV001;
} {
  const {fixtureValue, resultInput} = buildResultFixture();
  const result = buildDistantConnectionCandidateReviewResultV001(resultInput);
  const candidateReviewResultBytes = serializeDistantConnectionCandidateReviewResultV001(result);
  return {
    result,
    humanInput: {
      reviewId: `human-review-${verdict}`,
      reviewedAt: '2026-08-30T13:00:00.000Z',
      candidateResponsePath: fixtureValue.jobInput.candidateResponsePath,
      candidateResponseBytes: fixtureValue.jobInput.candidateResponseBytes,
      expectedCandidateResponseSha256: fixtureValue.jobInput.expectedCandidateResponseSha256,
      candidateReviewResultPath: 'outputs/candidate-review-result-001.json',
      candidateReviewResultBytes,
      expectedCandidateReviewResultSha256: sha256(candidateReviewResultBytes),
      verdict,
      primaryCause: 'candidate-selection',
      reason: verdict === 'rejected'
        ? '一般的なゲーム紹介と終了時の振り返りを結んだだけで、短尺内の回収や面白さの増分がない。'
        : '正式区間を人間が別途確認する価値がある。'
    }
  };
}

test('前半・後半を各1つの外包区間へ決定的に投影し、間の発話を明示する', () => {
  const {jobInput} = fixture();
  const job = buildDistantConnectionCandidateReviewJobV001(jobInput);

  assert.equal(job.schemaVersion, DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V001);
  assert.equal(job.artifactClassification, 'candidate-review-artifact');
  assert.deepEqual(job.orderedParts[0], {
    part: 'first',
    selectedSemanticUtteranceIds: [
      'semantic-utterance-000001', 'semantic-utterance-000002'
    ],
    enclosedSemanticUtteranceIds: [
      'semantic-utterance-000001', 'semantic-utterance-000002'
    ],
    firstOrdinal: 1,
    lastOrdinal: 2,
    sourceInterval: {sourceStartMs: 1_000, sourceEndMs: 2_000}
  });
  assert.deepEqual(job.orderedParts[1], {
    part: 'second',
    selectedSemanticUtteranceIds: [
      'semantic-utterance-000004', 'semantic-utterance-000006'
    ],
    enclosedSemanticUtteranceIds: [
      'semantic-utterance-000004',
      'semantic-utterance-000005',
      'semantic-utterance-000006'
    ],
    firstOrdinal: 4,
    lastOrdinal: 6,
    sourceInterval: {sourceStartMs: 5_000, sourceEndMs: 6_500}
  });
  assert.equal(job.ffmpeg.args.filter((argument) => argument === '-i').length, 2);
  assert.ok(job.ffmpeg.args.includes(
    '[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[outv][outa]'
  ));
  assert.deepEqual(job.statusFlags, {
    formalSelection: false,
    formalRenderer: false,
    completedShort: false,
    technicalQcCompleted: false
  });
  assert.doesNotThrow(() => assertDistantConnectionCandidateReviewJobV001(job));
  assert.doesNotThrow(() => validateDistantConnectionCandidateReviewJobAgainstSourcesV001(
    job,
    jobInput
  ));
  assert.deepEqual(
    serializeDistantConnectionCandidateReviewJobV001(job),
    serializeDistantConnectionCandidateReviewJobV001(
      buildDistantConnectionCandidateReviewJobV001(jobInput)
    )
  );
});

test('forward-only source package v002からも同じ候補review jobを生成できる', () => {
  const base = fixture();
  const v1 = JSON.parse(base.jobInput.sourcePackageBytes.toString('utf8')) as Record<string, unknown>;
  const v2 = {
    schemaVersion: 'distant-connection-luna-source-package-v002',
    sourceVideoId: v1.sourceVideoId,
    semanticUtteranceBinding: v1.semanticUtteranceBinding,
    commentVelocityAnchorBinding: v1.commentVelocityAnchorBinding,
    plannedExecution: v1.plannedExecution,
    explorationTask: v1.explorationTask,
    learningContext: {fixture: true},
    utteranceCount: v1.utteranceCount,
    anchorCount: v1.anchorCount,
    utterances: v1.utterances,
    anchors: v1.anchors,
    responseContract: {
      sourcePackagePath: base.jobInput.sourcePackagePath
    }
  };
  const sourcePackageBytes = formalBytes(v2);
  const candidateResponse = structuredClone(base.candidateResponse) as {
    sourcePackageBinding: {schemaVersion: string; fileSha256: string};
  };
  candidateResponse.sourcePackageBinding.schemaVersion = v2.schemaVersion;
  candidateResponse.sourcePackageBinding.fileSha256 = sha256(sourcePackageBytes);
  const candidateResponseBytes = formalBytes(candidateResponse);
  const job = buildDistantConnectionCandidateReviewJobV001({
    ...base.jobInput,
    sourcePackageBytes,
    expectedSourcePackageSha256: sha256(sourcePackageBytes),
    candidateResponseBytes,
    expectedCandidateResponseSha256: sha256(candidateResponseBytes)
  });
  assert.equal(
    job.sourceBindings.sourcePackage.schemaVersion,
    'distant-connection-luna-source-package-v002'
  );
  assertDistantConnectionCandidateReviewJobV001(job);
});

test('review MP4のSHA・再生可能性・実際の外包区間をresultへ固定する', () => {
  const {job, resultInput} = buildResultFixture();
  const result = buildDistantConnectionCandidateReviewResultV001(resultInput);

  assert.equal(result.schemaVersion, DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V001);
  assert.deepEqual(result.mediaInspection, {
    durationMs: 4_900,
    videoPresent: true,
    audioPresent: true
  });
  assert.deepEqual(result.evaluatedParts, job.orderedParts);
  assert.deepEqual(result.statusFlags, job.statusFlags);
  assert.doesNotThrow(() => assertDistantConnectionCandidateReviewResultV001(result));
  assert.doesNotThrow(() => validateDistantConnectionCandidateReviewResultAgainstJobV001(
    result,
    resultInput
  ));

  for (const patch of [
    {observedDurationMs: 0},
    {observedVideoPresent: false},
    {observedAudioPresent: false},
    {observedReviewVideoSha256: 'f'.repeat(64)}
  ]) {
    assert.throws(() => buildDistantConnectionCandidateReviewResultV001({
      ...resultInput,
      ...patch
    }));
  }
});

test('人間不採用と評価対象区間を正式保存しselection昇格を拒否する', () => {
  const {result, humanInput} = buildHumanFixture();
  const review = buildDistantConnectionCandidateHumanReviewResultV001(humanInput);

  assert.equal(
    review.schemaVersion,
    DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001
  );
  assert.deepEqual(review.reviewer, {kind: 'human', id: 'kawafmm'});
  assert.equal(review.verdict, 'rejected');
  assert.equal(review.selectionStatus, 'not-selected');
  assert.deepEqual(review.evaluatedIntervals, {
    firstPartSourceInterval: result.evaluatedParts[0].sourceInterval,
    secondPartSourceInterval: result.evaluatedParts[1].sourceInterval
  });
  assert.throws(
    () => assertRejectedCandidateCannotEnterSelectionV001(review, review.candidateId),
    /正式selection/u
  );
  assert.doesNotThrow(() => assertDistantConnectionCandidateHumanReviewResultV001(review));
  assert.doesNotThrow(() =>
    validateDistantConnectionCandidateHumanReviewResultAgainstSourcesV001(review, humanInput));
});

test('interval review候補もselection未確定のまま保持し、不採用guardだけを通過する', () => {
  const {humanInput} = buildHumanFixture('approved-for-interval-review');
  const review = buildDistantConnectionCandidateHumanReviewResultV001(humanInput);
  assert.equal(review.selectionStatus, 'not-selected');
  assert.doesNotThrow(() =>
    assertRejectedCandidateCannotEnterSelectionV001(review, review.candidateId));
});

test('未知発話・発話順序逆転・入力SHA差・余分fieldをfail-closedで拒否する', () => {
  const base = fixture();
  const unknownCandidate = structuredClone(base.candidateResponse) as {
    candidates: Array<{secondPartSemanticUtteranceIds: string[]}>;
  };
  unknownCandidate.candidates[0].secondPartSemanticUtteranceIds[1] =
    'semantic-utterance-999999';
  const unknownBytes = formalBytes(unknownCandidate);
  assert.throws(() => buildDistantConnectionCandidateReviewJobV001({
    ...base.jobInput,
    candidateResponseBytes: unknownBytes,
    expectedCandidateResponseSha256: sha256(unknownBytes)
  }), /未知/u);

  const reversedCandidate = structuredClone(base.candidateResponse) as {
    candidates: Array<{secondPartSemanticUtteranceIds: string[]}>;
  };
  reversedCandidate.candidates[0].secondPartSemanticUtteranceIds.reverse();
  const reversedBytes = formalBytes(reversedCandidate);
  assert.throws(() => buildDistantConnectionCandidateReviewJobV001({
    ...base.jobInput,
    candidateResponseBytes: reversedBytes,
    expectedCandidateResponseSha256: sha256(reversedBytes)
  }), /時系列順/u);

  assert.throws(() => buildDistantConnectionCandidateReviewJobV001({
    ...base.jobInput,
    expectedSourceVideoSha256: 'f'.repeat(64)
  }), /SHA-256/u);

  const job = buildDistantConnectionCandidateReviewJobV001(base.jobInput);
  assert.throws(() => assertDistantConnectionCandidateReviewJobV001({
    ...job,
    unexpected: true
  }));
});

test('構造上validでも元入力から異なるformal byteを拒否する', () => {
  const {jobInput} = fixture();
  const job = buildDistantConnectionCandidateReviewJobV001(jobInput);
  const changedJob = {...job, jobId: 'different-review-job'};
  assert.doesNotThrow(() => assertDistantConnectionCandidateReviewJobV001(changedJob));
  assert.throws(() => validateDistantConnectionCandidateReviewJobAgainstSourcesV001(
    changedJob,
    jobInput
  ), /決定的再生成byte/u);

  const {resultInput} = buildResultFixture();
  const result = buildDistantConnectionCandidateReviewResultV001(resultInput);
  const changedResult = {...result, resultId: 'different-review-result'};
  assert.doesNotThrow(() => assertDistantConnectionCandidateReviewResultV001(changedResult));
  assert.throws(() => validateDistantConnectionCandidateReviewResultAgainstJobV001(
    changedResult,
    resultInput
  ), /決定的再生成byte/u);

  const {humanInput} = buildHumanFixture();
  const human = buildDistantConnectionCandidateHumanReviewResultV001(humanInput);
  const changedHuman = {...human, reviewId: 'different-human-review'};
  assert.doesNotThrow(() => assertDistantConnectionCandidateHumanReviewResultV001(changedHuman));
  assert.throws(() =>
    validateDistantConnectionCandidateHumanReviewResultAgainstSourcesV001(
      changedHuman,
      humanInput
    ), /決定的再生成byte/u);
});

test('3成果物writerはworkspace相対pathへbyte同一で書き、既存出力を拒否する', async (context) => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'candidate-review-v001-'));
  context.after(async () => rm(workspaceRoot, {recursive: true, force: true}));

  const {job} = buildResultFixture();
  const {resultInput} = buildResultFixture();
  const result = buildDistantConnectionCandidateReviewResultV001(resultInput);
  const {humanInput} = buildHumanFixture();
  const human = buildDistantConnectionCandidateHumanReviewResultV001(humanInput);
  const writes = [
    {
      outputPath: 'artifacts/job.json',
      write: () => writeDistantConnectionCandidateReviewJobV001({
        workspaceRoot, outputPath: 'artifacts/job.json', job
      }),
      expected: serializeDistantConnectionCandidateReviewJobV001(job)
    },
    {
      outputPath: 'artifacts/result.json',
      write: () => writeDistantConnectionCandidateReviewResultV001({
        workspaceRoot, outputPath: 'artifacts/result.json', result
      }),
      expected: serializeDistantConnectionCandidateReviewResultV001(result)
    },
    {
      outputPath: 'artifacts/human.json',
      write: () => writeDistantConnectionCandidateHumanReviewResultV001({
        workspaceRoot, outputPath: 'artifacts/human.json', result: human
      }),
      expected: serializeDistantConnectionCandidateHumanReviewResultV001(human)
    }
  ];
  for (const item of writes) {
    await item.write();
    assert.deepEqual(await readFile(path.join(workspaceRoot, item.outputPath)), item.expected);
    await assert.rejects(item.write, (error: NodeJS.ErrnoException) => error.code === 'EEXIST');
  }
});
