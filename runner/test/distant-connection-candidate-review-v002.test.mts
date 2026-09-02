import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V002,
  DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002,
  DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001,
  DistantConnectionCandidateReviewErrorV002,
  assertDistantConnectionCandidateReviewJobV002,
  assertDistantConnectionCandidateReviewResultV002,
  assertDistantConnectionCandidateReviewSourceProjectionV001,
  buildDistantConnectionCandidateReviewJobV002,
  buildDistantConnectionCandidateReviewResultV002,
  buildDistantConnectionCandidateReviewSourceProjectionV001,
  decodeDistantConnectionCandidateReviewJobV002,
  decodeDistantConnectionCandidateReviewSourceProjectionV001,
  serializeDistantConnectionCandidateReviewJobV002,
  serializeDistantConnectionCandidateReviewResultV002,
  serializeDistantConnectionCandidateReviewSourceProjectionV001,
  validateDistantConnectionCandidateReviewJobAgainstProjectionV002,
  validateDistantConnectionCandidateReviewResultAgainstInputsV002,
  validateDistantConnectionCandidateReviewSourceProjectionAgainstSourcesV001,
  writeDistantConnectionCandidateReviewJobV002,
  type BuildCandidateReviewSourceProjectionInputV001,
  type BuildDistantConnectionCandidateReviewJobInputV002,
  type BuildDistantConnectionCandidateReviewResultInputV002,
  type DistantConnectionCandidateReviewSourceProjectionV001
} from '../src/distant-connection-candidate-review-v002.js';
import {
  DISTANT_CONNECTION_COMPARISON_B6_RAW_RESPONSE_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
  assertDistantConnectionComparisonCandidateResponseV001
} from '../src/distant-connection-comparison-luna-b6-result-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
  decodeDistantConnectionComparisonIndexedModelInputV001,
  resolveDistantConnectionComparisonIndexResponseV001,
  type DistantConnectionComparisonIndexResponseV001
} from '../src/distant-connection-comparison-luna-b5-local-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
  decodeDistantConnectionComparisonSourcePackageV001
} from '../src/distant-connection-comparison-source-package-v001.js';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

type NativeFixture = {
  input: BuildCandidateReviewSourceProjectionInputV001;
  expectedCandidateCount: number;
};

async function actualO8rFixture(): Promise<NativeFixture> {
  const inputRoot =
    'evals/clip_composition/outputs/work-distant-connection-comparison-input-o8rZAhARXAc-v001';
  const candidateRoot =
    'evals/clip_composition/outputs/'
    + 'work-distant-connection-comparison-luna-b6-candidates-o8rZAhARXAc-v001';
  const candidateResponsePath = `${candidateRoot}/candidate-response-v001.json`;
  const commonUtterancePath = `${inputRoot}/common-utterance-artifact-v001.json`;
  const sourcePackagePath = `${inputRoot}/source-package-v001.json`;
  const sourceReusePath = `${inputRoot}/source-video-transcript-reuse-artifact-v001.json`;
  const indexedModelInputPath = `${inputRoot}/indexed-model-input-v001.json`;
  const rawResponsePath = `${candidateRoot}/attempt-0001/raw-response-v001.json`;
  const [
    candidateResponseBytes,
    commonUtteranceBytes,
    sourcePackageBytes,
    sourceReuseBytes,
    indexedModelInputBytes,
    rawResponseBytes
  ] = await Promise.all([
    readFile(`${workspaceRoot}/${candidateResponsePath}`),
    readFile(`${workspaceRoot}/${commonUtterancePath}`),
    readFile(`${workspaceRoot}/${sourcePackagePath}`),
    readFile(`${workspaceRoot}/${sourceReusePath}`),
    readFile(`${workspaceRoot}/${indexedModelInputPath}`),
    readFile(`${workspaceRoot}/${rawResponsePath}`)
  ]);
  const sourceReuse = JSON.parse(sourceReuseBytes.toString('utf8'));
  return {
    expectedCandidateCount: 7,
    input: {
      projectionId: 'candidate-review-source-projection-o8r-v001',
      candidateResponsePath,
      candidateResponseBytes,
      expectedCandidateResponseSha256: sha256(candidateResponseBytes),
      commonUtterancePath,
      commonUtteranceBytes,
      expectedCommonUtteranceSha256: sha256(commonUtteranceBytes),
      sourcePackagePath,
      sourcePackageBytes,
      expectedSourcePackageSha256: sha256(sourcePackageBytes),
      sourceReusePath,
      sourceReuseBytes,
      expectedSourceReuseSha256: sha256(sourceReuseBytes),
      indexedModelInputPath,
      indexedModelInputBytes,
      expectedIndexedModelInputSha256: sha256(indexedModelInputBytes),
      rawResponsePath,
      rawResponseBytes,
      expectedRawResponseSha256: sha256(rawResponseBytes),
      sourceVideoPath: sourceReuse.sourceVideoBinding.path,
      observedSourceVideoSha256: sourceReuse.sourceVideoBinding.fileSha256,
      expectedSourceVideoSha256: sourceReuse.sourceVideoBinding.fileSha256
    }
  };
}

function providerRaw(indexResponse: DistantConnectionComparisonIndexResponseV001): Buffer {
  return jsonBytes({
    object: 'response',
    id: 'resp_ym_comparison_review_fixture',
    model: 'gpt-5.6-luna',
    status: 'completed',
    error: null,
    incomplete_details: null,
    output: [{
      type: 'message',
      status: 'completed',
      role: 'assistant',
      content: [{type: 'output_text', text: JSON.stringify(indexResponse)}]
    }]
  });
}

async function syntheticYmNativeFixture(): Promise<NativeFixture> {
  const inputRoot =
    'evals/clip_composition/outputs/work-distant-connection-comparison-input-ymUsGrT6EaA-v001';
  const commonUtterancePath = `${inputRoot}/common-utterance-artifact-v001.json`;
  const sourcePackagePath = `${inputRoot}/source-package-v001.json`;
  const sourceReusePath = `${inputRoot}/source-video-transcript-reuse-artifact-v001.json`;
  const indexedModelInputPath = `${inputRoot}/indexed-model-input-v001.json`;
  const rawResponsePath = 'outputs/review-fixture-ym/raw-response-v001.json';
  const candidateResponsePath = 'outputs/review-fixture-ym/candidate-response-v001.json';
  const [commonUtteranceBytes, sourcePackageBytes, sourceReuseBytes, indexedModelInputBytes] =
    await Promise.all([
      readFile(`${workspaceRoot}/${commonUtterancePath}`),
      readFile(`${workspaceRoot}/${sourcePackagePath}`),
      readFile(`${workspaceRoot}/${sourceReusePath}`),
      readFile(`${workspaceRoot}/${indexedModelInputPath}`)
    ]);
  const indexed = decodeDistantConnectionComparisonIndexedModelInputV001(indexedModelInputBytes);
  const anchor = indexed.anchors.find((row) => row.utteranceIndex < indexed.utteranceCount - 1);
  assert.ok(anchor);
  const indexResponse: DistantConnectionComparisonIndexResponseV001 = {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
    candidates: [{
      anchorIndex: anchor.anchorIndex,
      firstPartUtteranceIndexes: [anchor.utteranceIndex],
      secondPartUtteranceIndexes: [anchor.utteranceIndex + 1],
      addedUnderstanding: '比較用旧素材でも同じ正式参照方式を使うfixture。',
      direction: 'future'
    }]
  };
  const rawResponseBytes = providerRaw(indexResponse);
  const sourcePackage = decodeDistantConnectionComparisonSourcePackageV001(sourcePackageBytes);
  const resolved = resolveDistantConnectionComparisonIndexResponseV001(
    indexResponse,
    indexed,
    {sourcePackagePath, sourcePackageBytes}
  );
  const candidateResponse = {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
    sourceVideoId: sourcePackage.sourceVideoId,
    sourcePackageBinding: {
      path: sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
      fileSha256: sha256(sourcePackageBytes)
    },
    indexedModelInputBinding: {
      path: indexedModelInputPath,
      schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
      fileSha256: sha256(indexedModelInputBytes)
    },
    rawResponseBinding: {
      path: rawResponsePath,
      schemaVersion: DISTANT_CONNECTION_COMPARISON_B6_RAW_RESPONSE_SCHEMA_V001,
      fileSha256: sha256(rawResponseBytes)
    },
    candidates: resolved.map((candidate) => ({
      candidateId: candidate.candidateId,
      anchorId: candidate.anchorId,
      firstPartUtteranceIds: candidate.firstPartUtteranceIds,
      secondPartUtteranceIds: candidate.secondPartUtteranceIds,
      addedUnderstanding: candidate.addedUnderstanding,
      direction: candidate.direction
    }))
  };
  assertDistantConnectionComparisonCandidateResponseV001(
    candidateResponse,
    sourcePackagePath,
    sourcePackageBytes,
    indexedModelInputPath,
    indexedModelInputBytes,
    rawResponsePath,
    rawResponseBytes
  );
  const candidateResponseBytes = jsonBytes(candidateResponse);
  const sourceReuse = JSON.parse(sourceReuseBytes.toString('utf8'));
  return {
    expectedCandidateCount: 1,
    input: {
      projectionId: 'candidate-review-source-projection-ym-fixture-v001',
      candidateResponsePath,
      candidateResponseBytes,
      expectedCandidateResponseSha256: sha256(candidateResponseBytes),
      commonUtterancePath,
      commonUtteranceBytes,
      expectedCommonUtteranceSha256: sha256(commonUtteranceBytes),
      sourcePackagePath,
      sourcePackageBytes,
      expectedSourcePackageSha256: sha256(sourcePackageBytes),
      sourceReusePath,
      sourceReuseBytes,
      expectedSourceReuseSha256: sha256(sourceReuseBytes),
      indexedModelInputPath,
      indexedModelInputBytes,
      expectedIndexedModelInputSha256: sha256(indexedModelInputBytes),
      rawResponsePath,
      rawResponseBytes,
      expectedRawResponseSha256: sha256(rawResponseBytes),
      sourceVideoPath: sourceReuse.sourceVideoBinding.path,
      observedSourceVideoSha256: sourceReuse.sourceVideoBinding.fileSha256,
      expectedSourceVideoSha256: sourceReuse.sourceVideoBinding.fileSha256
    }
  };
}

function jobInput(
  projection: DistantConnectionCandidateReviewSourceProjectionV001,
  projectionBytes: Buffer
): BuildDistantConnectionCandidateReviewJobInputV002 {
  return {
    jobId: 'candidate-review-job-comparison-v002',
    sourceProjectionPath: 'outputs/review/source-projection-v001.json',
    sourceProjectionBytes: projectionBytes,
    expectedSourceProjectionSha256: sha256(projectionBytes),
    sourceVideoPath: projection.sourceBindings.sourceVideo.path,
    observedSourceVideoSha256: projection.sourceBindings.sourceVideo.fileSha256,
    expectedSourceVideoSha256: projection.sourceBindings.sourceVideo.fileSha256,
    candidateOutputs: projection.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      secondOnlyOutputPath: `evals/clip_composition/outputs/work-distant-connection-`
        + `candidate-review-v002/${candidate.candidateId}/second-only.mp4`,
      firstThenSecondOutputPath: `evals/clip_composition/outputs/work-distant-connection-`
        + `candidate-review-v002/${candidate.candidateId}/first-then-second.mp4`
    }))
  };
}

test('o8r実候補7件を正式native ID・ordinal・無丸め区間のまま共通projectionへ完全被覆する', async () => {
  const fixture = await actualO8rFixture();
  const projection = buildDistantConnectionCandidateReviewSourceProjectionV001(fixture.input);
  assert.equal(
    projection.schemaVersion,
    DISTANT_CONNECTION_CANDIDATE_REVIEW_SOURCE_PROJECTION_SCHEMA_V001
  );
  assert.equal(projection.sourceVideoId, 'o8rZAhARXAc');
  assert.equal(projection.candidates.length, fixture.expectedCandidateCount);
  assert.equal(projection.candidates[0]!.candidateId,
    'candidate-770d2f9e783b663421151e6b9ddcf091a2bb2d82a2ae269ffd261be35aa59520');
  assert.deepEqual(projection.candidates[0]!.firstPart.selectedUtteranceIds, [
    'common-utterance-000256', 'common-utterance-000257'
  ]);
  assert.deepEqual(projection.candidates[0]!.firstPart.selectedOrdinals, [256, 257]);
  assert.deepEqual(projection.candidates[0]!.firstPart.sourceInterval, {
    sourceStartMs: 2_623_306,
    sourceEndMs: 2_668_770
  });
  assert.doesNotThrow(() => assertDistantConnectionCandidateReviewSourceProjectionV001(projection));
  assert.doesNotThrow(() => validateDistantConnectionCandidateReviewSourceProjectionAgainstSourcesV001(
    projection,
    fixture.input
  ));
  const bytes = serializeDistantConnectionCandidateReviewSourceProjectionV001(projection);
  assert.deepEqual(decodeDistantConnectionCandidateReviewSourceProjectionV001(bytes), projection);
  assert.deepEqual(
    bytes,
    serializeDistantConnectionCandidateReviewSourceProjectionV001(
      buildDistantConnectionCandidateReviewSourceProjectionV001(fixture.input)
    )
  );
});

test('別sourceのym比較候補fixtureもo8rと同じforward-only契約で受理する', async () => {
  const fixture = await syntheticYmNativeFixture();
  const projection = buildDistantConnectionCandidateReviewSourceProjectionV001(fixture.input);
  assert.equal(projection.sourceVideoId, 'ymUsGrT6EaA');
  assert.equal(projection.candidates.length, fixture.expectedCandidateCount);
  assert.equal(projection.candidates[0]!.candidateOrdinal, 1);
  assert.deepEqual(projection.candidates[0]!.firstPart.selectedUtteranceIds.length, 1);
  assert.deepEqual(projection.candidates[0]!.secondPart.selectedUtteranceIds.length, 1);
});

test('source SHA差・未知ID・逆順・余分fieldをprojection入口でfail-closedする', async () => {
  const fixture = await actualO8rFixture();
  assert.throws(
    () => buildDistantConnectionCandidateReviewSourceProjectionV001({
      ...fixture.input,
      expectedCommonUtteranceSha256: '0'.repeat(64)
    }),
    DistantConnectionCandidateReviewErrorV002
  );

  const unknown = JSON.parse(Buffer.from(fixture.input.candidateResponseBytes).toString('utf8'));
  unknown.candidates[0].firstPartUtteranceIds[0] = 'common-utterance-999999';
  const unknownBytes = jsonBytes(unknown);
  assert.throws(
    () => buildDistantConnectionCandidateReviewSourceProjectionV001({
      ...fixture.input,
      candidateResponseBytes: unknownBytes,
      expectedCandidateResponseSha256: sha256(unknownBytes)
    }),
    /正式候補/u
  );

  const projection = buildDistantConnectionCandidateReviewSourceProjectionV001(fixture.input);
  const missing = structuredClone(projection);
  missing.candidates.pop();
  assert.throws(
    () => validateDistantConnectionCandidateReviewSourceProjectionAgainstSourcesV001(
      missing,
      fixture.input
    ),
    /決定的再構築/u
  );
  const duplicate = structuredClone(projection);
  const duplicateCandidate = structuredClone(duplicate.candidates[0]!);
  duplicateCandidate.candidateOrdinal = duplicate.candidates.length + 1;
  duplicate.candidates.push(duplicateCandidate);
  assert.throws(
    () => assertDistantConnectionCandidateReviewSourceProjectionV001(duplicate),
    /重複/u
  );
  const reversed = structuredClone(projection);
  reversed.candidates[0]!.firstPart = structuredClone(projection.candidates[0]!.secondPart);
  reversed.candidates[0]!.firstPart.part = 'first';
  assert.throws(() => assertDistantConnectionCandidateReviewSourceProjectionV001(reversed), /順序/u);
  const extra = {...structuredClone(projection), unexpected: true};
  assert.throws(() => assertDistantConnectionCandidateReviewSourceProjectionV001(extra), /root/u);
  const differentVideo = structuredClone(projection);
  differentVideo.sourceVideoId = 'different-video';
  assert.throws(
    () => validateDistantConnectionCandidateReviewSourceProjectionAgainstSourcesV001(
      differentVideo,
      fixture.input
    ),
    /決定的再構築/u
  );
  const changedInterval = structuredClone(projection);
  changedInterval.candidates[0]!.firstPart.sourceInterval.sourceStartMs += 1;
  assert.throws(
    () => validateDistantConnectionCandidateReviewSourceProjectionAgainstSourcesV001(
      changedInterval,
      fixture.input
    ),
    /決定的再構築/u
  );
});

test('全候補を後半のみ→前半から後半の固定pairへ投影しoutput取り違えを拒否する', async (t) => {
  const fixture = await actualO8rFixture();
  const projection = buildDistantConnectionCandidateReviewSourceProjectionV001(fixture.input);
  const projectionBytes = serializeDistantConnectionCandidateReviewSourceProjectionV001(projection);
  const input = jobInput(projection, projectionBytes);
  const job = buildDistantConnectionCandidateReviewJobV002(input);
  assert.equal(job.schemaVersion, DISTANT_CONNECTION_CANDIDATE_REVIEW_JOB_SCHEMA_V002);
  assert.equal(job.candidates.length, 7);
  assert.deepEqual(job.candidates[0]!.reviewStages.secondOnly.evaluatedParts.map((row) => row.part), [
    'second'
  ]);
  assert.deepEqual(
    job.candidates[0]!.reviewStages.firstThenSecond.evaluatedParts.map((row) => row.part),
    ['first', 'second']
  );
  assert.ok(job.candidates[0]!.reviewStages.secondOnly.ffmpeg.args.some(
    (argument) => argument.endsWith('concat=n=1:v=1:a=1[outv][outa]')
  ));
  assert.ok(job.candidates[0]!.reviewStages.firstThenSecond.ffmpeg.args.some(
    (argument) => argument.endsWith('concat=n=2:v=1:a=1[outv][outa]')
  ));
  assert.doesNotThrow(() => assertDistantConnectionCandidateReviewJobV002(job));
  assert.doesNotThrow(() => validateDistantConnectionCandidateReviewJobAgainstProjectionV002(
    job,
    input
  ));

  const swapped = structuredClone(input);
  [swapped.candidateOutputs[0], swapped.candidateOutputs[1]] = [
    swapped.candidateOutputs[1]!, swapped.candidateOutputs[0]!
  ];
  assert.throws(() => buildDistantConnectionCandidateReviewJobV002(swapped), /順/u);
  const duplicateOutput = structuredClone(input);
  duplicateOutput.candidateOutputs[1]!.secondOnlyOutputPath =
    duplicateOutput.candidateOutputs[0]!.secondOnlyOutputPath;
  assert.throws(() => buildDistantConnectionCandidateReviewJobV002(duplicateOutput), /重複/u);

  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'zev2-review-job-v002-'));
  t.after(async () => rm(temporaryRoot, {recursive: true, force: true}));
  const secondOnlyTamper = structuredClone(job);
  const secondOnlyFilterIndex = secondOnlyTamper.candidates[0]!.reviewStages.secondOnly.ffmpeg.args
    .findIndex((argument) => argument.includes('concat=n=1:'));
  assert.ok(secondOnlyFilterIndex >= 0);
  secondOnlyTamper.candidates[0]!.reviewStages.secondOnly.ffmpeg.args[secondOnlyFilterIndex] =
    secondOnlyTamper.candidates[0]!.reviewStages.secondOnly.ffmpeg.args[secondOnlyFilterIndex]!
      .replace('concat=n=1:', 'concat=n=2:');
  assert.throws(
    () => assertDistantConnectionCandidateReviewJobV002(secondOnlyTamper),
    /ffmpeg引数/u
  );
  assert.throws(
    () => decodeDistantConnectionCandidateReviewJobV002(jsonBytes(secondOnlyTamper)),
    /ffmpeg引数/u
  );
  await assert.rejects(
    writeDistantConnectionCandidateReviewJobV002({
      workspaceRoot: temporaryRoot,
      outputPath: 'output/second-only-tamper.json',
      job: secondOnlyTamper
    }),
    /ffmpeg引数/u
  );

  const combinedTamper = structuredClone(job);
  const combinedFilterIndex = combinedTamper.candidates[0]!.reviewStages.firstThenSecond.ffmpeg.args
    .findIndex((argument) => argument.includes('concat=n=2:'));
  assert.ok(combinedFilterIndex >= 0);
  combinedTamper.candidates[0]!.reviewStages.firstThenSecond.ffmpeg.args[combinedFilterIndex] =
    combinedTamper.candidates[0]!.reviewStages.firstThenSecond.ffmpeg.args[combinedFilterIndex]!
      .replace('concat=n=2:', 'concat=n=1:');
  assert.throws(
    () => assertDistantConnectionCandidateReviewJobV002(combinedTamper),
    /ffmpeg引数/u
  );
  assert.throws(
    () => decodeDistantConnectionCandidateReviewJobV002(jsonBytes(combinedTamper)),
    /ffmpeg引数/u
  );
  await assert.rejects(
    writeDistantConnectionCandidateReviewJobV002({
      workspaceRoot: temporaryRoot,
      outputPath: 'output/combined-tamper.json',
      job: combinedTamper
    }),
    /ffmpeg引数/u
  );
});

test('2種類の確認MP4を全候補同順でresultへ束縛しformal byteを決定再現する', async () => {
  const fixture = await syntheticYmNativeFixture();
  const projection = buildDistantConnectionCandidateReviewSourceProjectionV001(fixture.input);
  const projectionBytes = serializeDistantConnectionCandidateReviewSourceProjectionV001(projection);
  const reviewJobInput = jobInput(projection, projectionBytes);
  const job = buildDistantConnectionCandidateReviewJobV002(reviewJobInput);
  const jobBytes = serializeDistantConnectionCandidateReviewJobV002(job);
  const videoSha = sha256(Buffer.from('review-video'));
  const resultInput: BuildDistantConnectionCandidateReviewResultInputV002 = {
    resultId: 'candidate-review-result-comparison-v002',
    generatedAt: '2026-09-02T00:00:00.000Z',
    sourceProjectionPath: reviewJobInput.sourceProjectionPath,
    sourceProjectionBytes: projectionBytes,
    expectedSourceProjectionSha256: sha256(projectionBytes),
    reviewJobPath: 'outputs/review/candidate-review-job-v002.json',
    reviewJobBytes: jobBytes,
    expectedReviewJobSha256: sha256(jobBytes),
    candidateArtifacts: job.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      secondOnly: {
        videoPath: candidate.reviewStages.secondOnly.output.path,
        observedVideoSha256: videoSha,
        expectedVideoSha256: videoSha,
        observedDurationMs: 1_000,
        observedVideoPresent: true,
        observedAudioPresent: true
      },
      firstThenSecond: {
        videoPath: candidate.reviewStages.firstThenSecond.output.path,
        observedVideoSha256: videoSha,
        expectedVideoSha256: videoSha,
        observedDurationMs: 2_000,
        observedVideoPresent: true,
        observedAudioPresent: true
      }
    }))
  };
  const result = buildDistantConnectionCandidateReviewResultV002(resultInput);
  assert.equal(result.schemaVersion, DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002);
  assert.deepEqual(result.candidateResponseBinding, projection.sourceBindings.candidateResponse);
  assert.equal(result.candidates[0]!.reviewArtifacts.secondOnly.stage, 'second-only');
  assert.equal(result.candidates[0]!.reviewArtifacts.firstThenSecond.stage, 'first-then-second');
  assert.doesNotThrow(() => assertDistantConnectionCandidateReviewResultV002(result));
  assert.doesNotThrow(() => validateDistantConnectionCandidateReviewResultAgainstInputsV002(
    result,
    resultInput
  ));
  assert.deepEqual(
    serializeDistantConnectionCandidateReviewResultV002(result),
    serializeDistantConnectionCandidateReviewResultV002(
      buildDistantConnectionCandidateReviewResultV002(resultInput)
    )
  );

  const missing = structuredClone(resultInput);
  missing.candidateArtifacts = [];
  assert.throws(() => buildDistantConnectionCandidateReviewResultV002(missing), /完全被覆/u);
  const wrongSha = structuredClone(resultInput);
  wrongSha.candidateArtifacts[0]!.secondOnly.expectedVideoSha256 = '0'.repeat(64);
  assert.throws(() => buildDistantConnectionCandidateReviewResultV002(wrongSha), /SHA-256/u);
});
