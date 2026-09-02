import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {access, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test, {type TestContext} from 'node:test';

import {
  buildDistantConnectionCandidateReviewJobV002,
  buildDistantConnectionCandidateReviewSourceProjectionV001,
  serializeDistantConnectionCandidateReviewJobV002,
  serializeDistantConnectionCandidateReviewSourceProjectionV001,
  writeDistantConnectionCandidateReviewJobV002,
  writeDistantConnectionCandidateReviewSourceProjectionV001,
  type DistantConnectionCandidateReviewJobV002,
  type DistantConnectionCandidateReviewSourceProjectionV001
} from '../src/distant-connection-candidate-review-v002.js';
import {
  buildCommentVelocityMinuteSeriesArtifactFromBytesV001,
  serializeCommentVelocityMinuteSeriesArtifactV001
} from '../src/comment-velocity-minute-series-artifact-v001.js';
import {
  buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001,
  serializeDistantConnectionCommonUtteranceArtifactV001
} from '../src/distant-connection-common-utterance-artifact-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
  buildDistantConnectionComparisonIndexedModelInputV001,
  resolveDistantConnectionComparisonIndexResponseV001,
  serializeDistantConnectionComparisonIndexedModelInputV001,
  type DistantConnectionComparisonIndexResponseV001
} from '../src/distant-connection-comparison-luna-b5-local-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_B6_RAW_RESPONSE_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
  assertDistantConnectionComparisonCandidateResponseV001
} from '../src/distant-connection-comparison-luna-b6-result-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
  buildDistantConnectionComparisonSourcePackageFromBytesV001,
  serializeDistantConnectionComparisonSourcePackageV001
} from '../src/distant-connection-comparison-source-package-v001.js';
import {
  DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V002,
  materializeDistantConnectionCandidateReviewV002
} from '../src/materialize-distant-connection-candidate-review-v002.js';
import {
  buildSourceVideoTranscriptReuseArtifactFromBytesV001,
  serializeSourceVideoTranscriptReuseArtifactV001
} from '../src/source-video-transcript-reuse-artifact-v001.js';

type CommandResult = {exitCode: number | null; stdout: Buffer; stderr: Buffer};

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const child = spawn(command, args, {cwd, stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout.on('data', (chunk: Buffer) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(Buffer.from(chunk)));
    child.once('error', reject);
    child.once('close', (exitCode) => resolve({
      exitCode,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr)
    }));
  });
}

async function runSuccessfulCommand(command: string, args: string[], cwd: string): Promise<Buffer> {
  const result = await runCommand(command, args, cwd);
  assert.equal(result.exitCode, 0, result.stderr.toString('utf8'));
  return result.stdout;
}

async function createSyntheticSource(workspaceRoot: string, sourceVideoPath: string): Promise<void> {
  await mkdir(path.dirname(path.join(workspaceRoot, sourceVideoPath)), {recursive: true});
  await runSuccessfulCommand('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=red:s=64x64:r=30:d=1',
    '-f', 'lavfi', '-i', 'color=c=green:s=64x64:r=30:d=1',
    '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30:d=58',
    '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=30:d=1',
    '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30:d=29',
    '-f', 'lavfi', '-i', 'color=c=yellow:s=64x64:r=30:d=1',
    '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30:d=1',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=92',
    '-filter_complex',
    '[0:v:0][1:v:0][2:v:0][3:v:0][4:v:0][5:v:0][6:v:0]'
      + 'concat=n=7:v=1:a=0[v]',
    '-map', '[v]', '-map', '7:a:0',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart',
    sourceVideoPath
  ], workspaceRoot);
}

const jsonBytes = (value: unknown): Buffer => (
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8')
);

function replayLine(offsetMs: number): string {
  return JSON.stringify({
    replayChatItemAction: {
      videoOffsetTimeMsec: String(offsetMs),
      actions: [{
        addChatItemAction: {
          item: {
            liveChatTextMessageRenderer: {
              message: {runs: [{text: 'fixture'}]},
              authorName: {simpleText: 'fixture'}
            }
          }
        }
      }]
    }
  });
}

function rawChatForMinuteCounts(counts: number[], durationMs: number): Buffer {
  const lines: string[] = [];
  for (const [minuteIndex, count] of counts.entries()) {
    for (let index = 0; index < count; index += 1) {
      lines.push(replayLine(minuteIndex * 60_000 + 1_000 + index));
    }
  }
  lines.push(replayLine(durationMs));
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

function providerRaw(indexResponse: DistantConnectionComparisonIndexResponseV001): Buffer {
  return jsonBytes({
    object: 'response',
    id: 'resp_candidate_review_materializer_fixture',
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

async function createProjectionFixture(t: TestContext): Promise<{
  workspaceRoot: string;
  projection: DistantConnectionCandidateReviewSourceProjectionV001;
  projectionPath: string;
  projectionBytes: Buffer;
  sourceVideoPath: string;
}> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zev2-candidate-review-v002-'));
  t.after(async () => rm(workspaceRoot, {recursive: true, force: true}));
  const sourceVideoPath = 'inputs/source-video.mp4';
  await createSyntheticSource(workspaceRoot, sourceVideoPath);
  const sourceVideoBytes = await readFile(path.join(workspaceRoot, sourceVideoPath));
  const durationMs = 180_000;
  const sourceTranscriptPath = 'inputs/transcript.json';
  const sourceReusePath = 'inputs/source-reuse.json';
  const commonUtterancePath = 'inputs/common-utterance.json';
  const commentVelocityPath = 'inputs/comment-velocity.json';
  const sourcePackagePath = 'inputs/source-package.json';
  const indexedModelInputPath = 'inputs/indexed-input.json';
  const rawResponsePath = 'inputs/raw-response.json';
  const candidateResponsePath = 'inputs/candidate-response.json';
  const sourceTranscriptBytes = jsonBytes({
    kind: 'transcript_json',
    mode: 'zev-local-stt-chunked',
    sourceUri: '/workspace/inputs/source-video.mp4',
    notes: [],
    generatedAt: '2026-09-02T00:00:00.000Z',
    language: 'ja-JP',
    durationSec: durationMs / 1_000,
    segmentCount: 4,
    segments: [
      {id: 1, startMs: 0, endMs: 1_000, text: '赤い前半。'},
      {id: 2, startMs: 1_000, endMs: 2_000, text: '緑の前半。'},
      {id: 3, startMs: 60_000, endMs: 61_000, text: '青い後半。'},
      {id: 4, startMs: 90_000, endMs: 91_000, text: '黄色い後半。'}
    ],
    speechUnitGroups: [[1], [2], [3], [4]]
  });
  const sourceVideoSha256 = sha256(sourceVideoBytes);
  const sourceReuse = buildSourceVideoTranscriptReuseArtifactFromBytesV001({
    workspaceRoot,
    sourceVideoId: 'source-video',
    sourceVideoPath,
    sourceVideoBytes,
    measuredSourceVideoDurationMs: durationMs,
    approvedSourceVideoSha256: sourceVideoSha256,
    approvedSourceVideoDurationMs: durationMs,
    sourceTranscriptPath,
    sourceTranscriptBytes
  });
  const sourceReuseBytes = serializeSourceVideoTranscriptReuseArtifactV001(sourceReuse);
  const commonUtterance = buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath,
    sourceTranscriptBytes
  });
  const commonUtteranceBytes = serializeDistantConnectionCommonUtteranceArtifactV001(
    commonUtterance
  );
  const rawChatReplayBytes = rawChatForMinuteCounts([1, 4, 1], durationMs);
  const commentVelocity = buildCommentVelocityMinuteSeriesArtifactFromBytesV001({
    analysisId: 'source-video-comment-velocity-v001',
    sourceVideoId: 'source-video',
    sourceDurationMs: durationMs,
    rawChatReplayPath: 'inputs/source-video.live_chat.json',
    rawChatReplayBytes
  });
  const commentVelocityBytes = serializeCommentVelocityMinuteSeriesArtifactV001(commentVelocity);
  const sourcePackage = buildDistantConnectionComparisonSourcePackageFromBytesV001({
    workspaceRoot,
    sourceReusePath,
    sourceReuseBytes,
    commonUtterancePath,
    commonUtteranceBytes,
    commentVelocityPath,
    commentVelocityBytes,
    sourcePackagePath,
    sourceVideoBytes,
    sourceTranscriptBytes,
    rawChatReplayBytes
  });
  const sourcePackageBytes = serializeDistantConnectionComparisonSourcePackageV001(sourcePackage);
  const indexedModelInput = buildDistantConnectionComparisonIndexedModelInputV001({
    sourcePackagePath,
    sourcePackageBytes
  });
  const indexedModelInputBytes = serializeDistantConnectionComparisonIndexedModelInputV001(
    indexedModelInput
  );
  const indexResponse: DistantConnectionComparisonIndexResponseV001 = {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
    candidates: sourcePackage.anchors.map((anchor, anchorIndex) => ({
      anchorIndex,
      firstPartUtteranceIndexes: [anchorIndex],
      secondPartUtteranceIndexes: [sourcePackage.utterances.findIndex(
        (utterance) => utterance.utteranceId === anchor.utteranceId
      )],
      addedUnderstanding: anchorIndex === 0
        ? '赤い前半を付けると青い後半の変化を確認できる。'
        : '緑の前半を付けると黄色い後半の変化を確認できる。',
      direction: 'past'
    }))
  };
  const rawResponseBytes = providerRaw(indexResponse);
  const resolved = resolveDistantConnectionComparisonIndexResponseV001(
    indexResponse,
    indexedModelInput,
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
  await Promise.all([
    [sourceTranscriptPath, sourceTranscriptBytes],
    [sourceReusePath, sourceReuseBytes],
    [commonUtterancePath, commonUtteranceBytes],
    [commentVelocityPath, commentVelocityBytes],
    [sourcePackagePath, sourcePackageBytes],
    [indexedModelInputPath, indexedModelInputBytes],
    [rawResponsePath, rawResponseBytes],
    [candidateResponsePath, candidateResponseBytes]
  ].map(async ([relativePath, bytes]) => {
    const outputPath = path.join(workspaceRoot, relativePath as string);
    await mkdir(path.dirname(outputPath), {recursive: true});
    await writeFile(outputPath, bytes as Uint8Array, {flag: 'wx'});
  }));
  const projection = buildDistantConnectionCandidateReviewSourceProjectionV001({
    projectionId: 'synthetic-review-projection-v001',
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
    sourceVideoPath,
    observedSourceVideoSha256: sourceVideoSha256,
    expectedSourceVideoSha256: sourceVideoSha256
  });
  const projectionPath = `${DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V002}/fixture/`
    + 'source-projection-v001.json';
  const projectionBytes = jsonBytes(projection);
  await writeDistantConnectionCandidateReviewSourceProjectionV001({
    workspaceRoot,
    outputPath: projectionPath,
    projection
  });
  return {workspaceRoot, projection, projectionPath, projectionBytes, sourceVideoPath};
}

async function createJob(
  fixture: Awaited<ReturnType<typeof createProjectionFixture>>,
  caseId: string
): Promise<{
  job: DistantConnectionCandidateReviewJobV002;
  jobPath: string;
  jobBytes: Buffer;
  resultPath: string;
}> {
  const root = `${DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V002}/${caseId}`;
  const job = buildDistantConnectionCandidateReviewJobV002({
    jobId: `candidate-review-job-${caseId}`,
    sourceProjectionPath: fixture.projectionPath,
    sourceProjectionBytes: fixture.projectionBytes,
    expectedSourceProjectionSha256: sha256(fixture.projectionBytes),
    sourceVideoPath: fixture.sourceVideoPath,
    observedSourceVideoSha256: fixture.projection.sourceBindings.sourceVideo.fileSha256,
    expectedSourceVideoSha256: fixture.projection.sourceBindings.sourceVideo.fileSha256,
    candidateOutputs: fixture.projection.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      secondOnlyOutputPath: `${root}/${candidate.candidateId}/second-only.mp4`,
      firstThenSecondOutputPath: `${root}/${candidate.candidateId}/first-then-second.mp4`
    }))
  });
  const jobPath = `${root}/candidate-review-job-v002.json`;
  const jobBytes = serializeDistantConnectionCandidateReviewJobV002(job);
  await writeDistantConnectionCandidateReviewJobV002({
    workspaceRoot: fixture.workspaceRoot,
    outputPath: jobPath,
    job
  });
  return {
    job,
    jobPath,
    jobBytes,
    resultPath: `${root}/candidate-review-result-v002.json`
  };
}

async function extractPixel(
  workspaceRoot: string,
  videoPath: string,
  atSeconds: string,
  name: string
): Promise<[number, number, number]> {
  const outputPath = `pixels/${name}.rgb`;
  await mkdir(path.join(workspaceRoot, 'pixels'), {recursive: true});
  await runSuccessfulCommand('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', atSeconds, '-i', videoPath,
    '-frames:v', '1', '-vf', 'scale=1:1', '-pix_fmt', 'rgb24', '-f', 'rawvideo',
    outputPath
  ], workspaceRoot);
  const bytes = await readFile(path.join(workspaceRoot, outputPath));
  assert.equal(bytes.length, 3);
  return [bytes[0]!, bytes[1]!, bytes[2]!];
}

test('全候補を後半のみと前半→後半の2本ずつ生成しconcat n=1を実ffmpegで検証する', async (t) => {
  const fixture = await createProjectionFixture(t);
  const jobFixture = await createJob(fixture, 'success');
  const outcome = await materializeDistantConnectionCandidateReviewV002({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: sha256(jobFixture.jobBytes),
    resultId: 'candidate-review-result-success-v002',
    generatedAt: '2026-09-02T01:00:00.000Z',
    resultOutputPath: jobFixture.resultPath
  });
  assert.equal(outcome.status, 'succeeded');
  if (outcome.status !== 'succeeded') return;

  assert.equal(outcome.materializedMedia.length, 2);
  assert.equal(outcome.result.candidates.length, 2);
  assert.deepEqual(outcome.processObservations.map((row) => row.stage), [
    'ffmpeg', 'ffprobe', 'ffmpeg', 'ffprobe',
    'ffmpeg', 'ffprobe', 'ffmpeg', 'ffprobe'
  ]);
  for (const candidate of outcome.result.candidates) {
    assert.equal(candidate.reviewArtifacts.secondOnly.mediaInspection.videoPresent, true);
    assert.equal(candidate.reviewArtifacts.secondOnly.mediaInspection.audioPresent, true);
    assert.equal(candidate.reviewArtifacts.firstThenSecond.mediaInspection.videoPresent, true);
    assert.equal(candidate.reviewArtifacts.firstThenSecond.mediaInspection.audioPresent, true);
  }
  const first = outcome.materializedMedia[0]!;
  assert.ok(await exists(path.join(fixture.workspaceRoot, first.secondOnly.path)));
  assert.ok(await exists(path.join(fixture.workspaceRoot, first.firstThenSecond.path)));
  const secondOnlyPixel = await extractPixel(
    fixture.workspaceRoot,
    first.secondOnly.path,
    '0.250',
    'second-only'
  );
  const combinedFirstPixel = await extractPixel(
    fixture.workspaceRoot,
    first.firstThenSecond.path,
    '0.250',
    'combined-first'
  );
  const combinedSecondPixel = await extractPixel(
    fixture.workspaceRoot,
    first.firstThenSecond.path,
    '1.250',
    'combined-second'
  );
  assert.ok(secondOnlyPixel[2] > 200 && secondOnlyPixel[0] < 40, secondOnlyPixel.join(','));
  assert.ok(combinedFirstPixel[0] > 200 && combinedFirstPixel[2] < 40,
    combinedFirstPixel.join(','));
  assert.ok(combinedSecondPixel[2] > 200 && combinedSecondPixel[0] < 40,
    combinedSecondPixel.join(','));
  assert.ok(await exists(path.join(fixture.workspaceRoot, jobFixture.resultPath)));
});

test('既存出力を上書きせずprocess 0回で拒否する', async (t) => {
  const fixture = await createProjectionFixture(t);
  const jobFixture = await createJob(fixture, 'existing-output');
  const existingPath = jobFixture.job.candidates[0]!.reviewStages.secondOnly.output.path;
  await mkdir(path.dirname(path.join(fixture.workspaceRoot, existingPath)), {recursive: true});
  await writeFile(path.join(fixture.workspaceRoot, existingPath), 'existing');
  let callCount = 0;
  const outcome = await materializeDistantConnectionCandidateReviewV002({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: sha256(jobFixture.jobBytes),
    resultId: 'candidate-review-result-existing-v002',
    generatedAt: '2026-09-02T01:00:00.000Z',
    resultOutputPath: jobFixture.resultPath,
    runProcess: async (request) => {
      callCount += 1;
      return {...request, exitCode: 0, signal: null, stdout: '', stderr: '', launchError: null};
    }
  });
  assert.equal(outcome.status, 'failed');
  if (outcome.status !== 'failed') return;
  assert.equal(outcome.failureStage, 'output-preflight');
  assert.equal(callCount, 0);
  assert.equal(await readFile(path.join(fixture.workspaceRoot, existingPath), 'utf8'), 'existing');
});

test('元動画SHA差をprocess前に拒否する', async (t) => {
  const fixture = await createProjectionFixture(t);
  const jobFixture = await createJob(fixture, 'source-sha-mismatch');
  await writeFile(path.join(fixture.workspaceRoot, fixture.sourceVideoPath), 'changed');
  let callCount = 0;
  const outcome = await materializeDistantConnectionCandidateReviewV002({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: sha256(jobFixture.jobBytes),
    resultId: 'candidate-review-result-sha-v002',
    generatedAt: '2026-09-02T01:00:00.000Z',
    resultOutputPath: jobFixture.resultPath,
    runProcess: async (request) => {
      callCount += 1;
      return {...request, exitCode: 0, signal: null, stdout: '', stderr: '', launchError: null};
    }
  });
  assert.equal(outcome.status, 'failed');
  if (outcome.status !== 'failed') return;
  assert.equal(outcome.failureStage, 'source-verification');
  assert.equal(callCount, 0);
  assert.match(outcome.message, /元動画.*SHA-256/u);
});

test('candidate区間を改変したprojectionと再構築jobをprocess前に拒否する', async (t) => {
  const fixture = await createProjectionFixture(t);
  const changedProjection = structuredClone(fixture.projection);
  changedProjection.candidates[0]!.firstPart.sourceInterval.sourceStartMs += 1;
  const changedProjectionBytes = serializeDistantConnectionCandidateReviewSourceProjectionV001(
    changedProjection
  );
  await writeFile(
    path.join(fixture.workspaceRoot, fixture.projectionPath),
    changedProjectionBytes
  );
  const changedFixture = {
    ...fixture,
    projection: changedProjection,
    projectionBytes: changedProjectionBytes
  };
  const jobFixture = await createJob(changedFixture, 'projection-interval-tamper');
  let callCount = 0;
  const outcome = await materializeDistantConnectionCandidateReviewV002({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: sha256(jobFixture.jobBytes),
    resultId: 'candidate-review-result-interval-tamper-v002',
    generatedAt: '2026-09-02T01:00:00.000Z',
    resultOutputPath: jobFixture.resultPath,
    runProcess: async (request) => {
      callCount += 1;
      return {...request, exitCode: 0, signal: null, stdout: '', stderr: '', launchError: null};
    }
  });
  assert.equal(outcome.status, 'failed');
  if (outcome.status !== 'failed') return;
  assert.equal(outcome.failureStage, 'source-verification');
  assert.equal(callCount, 0);
  assert.match(outcome.message, /決定的再構築/u);
});

test('ffprobe失敗時に生成済みpartial MP4を全除去しresultを公開しない', async (t) => {
  const fixture = await createProjectionFixture(t);
  const jobFixture = await createJob(fixture, 'partial-cleanup');
  const outcome = await materializeDistantConnectionCandidateReviewV002({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: sha256(jobFixture.jobBytes),
    resultId: 'candidate-review-result-cleanup-v002',
    generatedAt: '2026-09-02T01:00:00.000Z',
    resultOutputPath: jobFixture.resultPath,
    ffprobeExecutable: 'false'
  });
  assert.equal(outcome.status, 'failed');
  if (outcome.status !== 'failed') return;
  assert.equal(outcome.failureStage, 'ffprobe');
  assert.match(outcome.message, /ffprobe/u);
  for (const candidate of jobFixture.job.candidates) {
    assert.equal(await exists(path.join(
      fixture.workspaceRoot,
      candidate.reviewStages.secondOnly.output.path
    )), false);
    assert.equal(await exists(path.join(
      fixture.workspaceRoot,
      candidate.reviewStages.firstThenSecond.output.path
    )), false);
  }
  assert.equal(await exists(path.join(fixture.workspaceRoot, jobFixture.resultPath)), false);
});
