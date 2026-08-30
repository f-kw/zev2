import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {access, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test, {type TestContext} from 'node:test';

import {
  buildDistantConnectionCandidateReviewJobV001,
  buildDistantConnectionCandidateReviewResultV001,
  serializeDistantConnectionCandidateReviewJobV001,
  serializeDistantConnectionCandidateReviewResultV001,
  writeDistantConnectionCandidateReviewJobV001,
  type DistantConnectionCandidateReviewJobV001
} from '../src/distant-connection-candidate-review-v001.js';
import {
  DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V001,
  materializeDistantConnectionCandidateReviewV001,
  type DistantConnectionCandidateReviewProcessObservationV001,
  type DistantConnectionCandidateReviewProcessRequestV001
} from '../src/materialize-distant-connection-candidate-review-v001.js';

type CommandResult = {exitCode: number | null; stdout: Buffer; stderr: Buffer};

type ReviewFixture = {
  workspaceRoot: string;
  candidateResponsePath: string;
  semanticUtterancePath: string;
  sourcePackagePath: string;
  sourceVideoPath: string;
  sourceVideoSha256: string;
  candidateResponseBytes: Buffer;
  semanticUtteranceBytes: Buffer;
  sourcePackageBytes: Buffer;
};

type ReviewJobFixture = {
  job: DistantConnectionCandidateReviewJobV001;
  jobPath: string;
  jobBytes: Buffer;
  jobSha256: string;
  videoPath: string;
  resultPath: string;
};

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

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
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1',
    '-f', 'lavfi', '-i', 'color=c=green:s=64x64:r=30:d=1',
    '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=48000:duration=1',
    '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=30:d=1',
    '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000:duration=1',
    '-filter_complex',
    '[0:v:0][1:a:0][2:v:0][3:a:0][4:v:0][5:a:0]concat=n=3:v=1:a=1[v][a]',
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart',
    sourceVideoPath
  ], workspaceRoot);
}

async function createFixture(t: TestContext): Promise<ReviewFixture> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zev2-candidate-review-materialize-'));
  t.after(async () => rm(workspaceRoot, {recursive: true, force: true}));
  const candidateResponsePath = 'inputs/candidate-response-v001.json';
  const semanticUtterancePath = 'inputs/semantic-utterance-artifact-v001.json';
  const sourcePackagePath = 'inputs/source-package-v001.json';
  const sourceVideoPath = 'fixtures/source-video.mp4';
  await createSyntheticSource(workspaceRoot, sourceVideoPath);
  const sourceVideoBytes = await readFile(path.join(workspaceRoot, sourceVideoPath));
  const sourceVideoSha256 = sha256(sourceVideoBytes);

  const utterances = [
    {
      utteranceId: 'semantic-utterance-000001', ordinal: 1, text: '赤い前半',
      sourceStartMs: 0, sourceEndMs: 1_000, sourceSegmentIds: [1]
    },
    {
      utteranceId: 'semantic-utterance-000002', ordinal: 2, text: '確認動画に含めない中央',
      sourceStartMs: 1_000, sourceEndMs: 2_000, sourceSegmentIds: [2]
    },
    {
      utteranceId: 'semantic-utterance-000003', ordinal: 3, text: '青い後半',
      sourceStartMs: 2_000, sourceEndMs: 3_000, sourceSegmentIds: [3]
    }
  ];
  const semanticUtterance = {
    schemaVersion: 'semantic-utterance-artifact-v001',
    sourceTranscriptBinding: {
      path: 'inputs/transcript.json',
      schemaVersion: 'transcript-json-v001',
      fileSha256: '1'.repeat(64)
    },
    sourceUri: sourceVideoPath,
    language: 'ja-JP',
    segmentCount: 3,
    utteranceCount: 3,
    utterances
  };
  const semanticUtteranceBytes = jsonBytes(semanticUtterance);
  const sourcePackage = {
    schemaVersion: 'distant-connection-luna-source-package-v001',
    sourceVideoId: 'source-video',
    semanticUtteranceBinding: {
      path: semanticUtterancePath,
      schemaVersion: 'semantic-utterance-artifact-v001',
      fileSha256: sha256(semanticUtteranceBytes)
    },
    commentVelocityAnchorBinding: {},
    plannedExecution: {},
    explorationTask: {},
    utteranceCount: 3,
    anchorCount: 0,
    utterances,
    anchors: [],
    responseContract: {sourcePackagePath}
  };
  const sourcePackageBytes = jsonBytes(sourcePackage);
  const candidateResponse = {
    schemaVersion: 'distant-connection-luna-response-v001',
    sourceVideoId: 'source-video',
    sourcePackageBinding: {
      path: sourcePackagePath,
      schemaVersion: 'distant-connection-luna-source-package-v001',
      fileSha256: sha256(sourcePackageBytes)
    },
    candidates: [{
      candidateId: 'candidate-red-to-blue',
      anchorId: 'comment-anchor-fixture',
      firstPartSemanticUtteranceIds: ['semantic-utterance-000001'],
      secondPartSemanticUtteranceIds: ['semantic-utterance-000003'],
      addedUnderstanding: '赤い前半から青い後半へ進んだことを確認するfixture',
      direction: 'future'
    }]
  };
  const candidateResponseBytes = jsonBytes(candidateResponse);

  await mkdir(path.join(workspaceRoot, 'inputs'), {recursive: true});
  await Promise.all([
    writeFile(path.join(workspaceRoot, candidateResponsePath), candidateResponseBytes, {flag: 'wx'}),
    writeFile(path.join(workspaceRoot, semanticUtterancePath), semanticUtteranceBytes, {flag: 'wx'}),
    writeFile(path.join(workspaceRoot, sourcePackagePath), sourcePackageBytes, {flag: 'wx'})
  ]);
  return {
    workspaceRoot,
    candidateResponsePath,
    semanticUtterancePath,
    sourcePackagePath,
    sourceVideoPath,
    sourceVideoSha256,
    candidateResponseBytes,
    semanticUtteranceBytes,
    sourcePackageBytes
  };
}

async function createReviewJob(
  fixture: ReviewFixture,
  caseId: string
): Promise<ReviewJobFixture> {
  const root = `${DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V001}/${caseId}`;
  const videoPath = `${root}/candidate-review.mp4`;
  const jobPath = `${root}/candidate-review-job-v001.json`;
  const resultPath = `${root}/candidate-review-result-v001.json`;
  const job = buildDistantConnectionCandidateReviewJobV001({
    jobId: `candidate-review-${caseId}`,
    candidateId: 'candidate-red-to-blue',
    candidateResponsePath: fixture.candidateResponsePath,
    candidateResponseBytes: fixture.candidateResponseBytes,
    expectedCandidateResponseSha256: sha256(fixture.candidateResponseBytes),
    semanticUtterancePath: fixture.semanticUtterancePath,
    semanticUtteranceBytes: fixture.semanticUtteranceBytes,
    expectedSemanticUtteranceSha256: sha256(fixture.semanticUtteranceBytes),
    sourcePackagePath: fixture.sourcePackagePath,
    sourcePackageBytes: fixture.sourcePackageBytes,
    expectedSourcePackageSha256: sha256(fixture.sourcePackageBytes),
    sourceVideoPath: fixture.sourceVideoPath,
    observedSourceVideoSha256: fixture.sourceVideoSha256,
    expectedSourceVideoSha256: fixture.sourceVideoSha256,
    outputPath: videoPath
  });
  const jobBytes = serializeDistantConnectionCandidateReviewJobV001(job);
  await writeDistantConnectionCandidateReviewJobV001({
    workspaceRoot: fixture.workspaceRoot,
    outputPath: jobPath,
    job
  });
  return {job, jobPath, jobBytes, jobSha256: sha256(jobBytes), videoPath, resultPath};
}

async function extractPixel(
  workspaceRoot: string,
  videoPath: string,
  atSeconds: string,
  outputName: string
): Promise<[number, number, number]> {
  const outputPath = `pixels/${outputName}.rgb`;
  await mkdir(path.join(workspaceRoot, 'pixels'), {recursive: true});
  await runSuccessfulCommand('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', atSeconds, '-i', videoPath,
    '-frames:v', '1', '-vf', 'scale=1:1', '-pix_fmt', 'rgb24', '-f', 'rawvideo',
    outputPath
  ], workspaceRoot);
  const bytes = await readFile(path.join(workspaceRoot, outputPath));
  assert.equal(bytes.length, 3);
  return [bytes[0], bytes[1], bytes[2]];
}

test('候補前半→後半を元映像・元音声付きMP4へ1回で生成し正式resultを決定的に保存する', async (t) => {
  const fixture = await createFixture(t);
  const jobFixture = await createReviewJob(fixture, 'success');
  const outcome = await materializeDistantConnectionCandidateReviewV001({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: jobFixture.jobSha256,
    resultId: 'candidate-review-result-success',
    generatedAt: '2026-08-30T12:00:00.000Z',
    resultOutputPath: jobFixture.resultPath
  });
  assert.equal(outcome.status, 'succeeded');
  if (outcome.status !== 'succeeded') return;

  assert.deepEqual(outcome.processObservations.map((row) => [row.stage, row.exitCode]), [
    ['ffmpeg', 0], ['ffprobe', 0]
  ]);
  assert.equal(outcome.processObservations[0].command, jobFixture.job.ffmpeg.executable);
  assert.deepEqual(outcome.processObservations[0].args, jobFixture.job.ffmpeg.args);
  assert.ok(outcome.processObservations.every((row) =>
    typeof row.stdout === 'string' && typeof row.stderr === 'string'));
  assert.equal(outcome.mediaInspection.videoStreamCount, 1);
  assert.equal(outcome.mediaInspection.audioStreamCount, 1);
  assert.equal(outcome.result.mediaInspection.videoPresent, true);
  assert.equal(outcome.result.mediaInspection.audioPresent, true);
  assert.deepEqual(outcome.result.statusFlags, {
    formalSelection: false,
    formalRenderer: false,
    completedShort: false,
    technicalQcCompleted: false
  });

  const expectedDurationMs = jobFixture.job.orderedParts.reduce(
    (total, part) => total + part.sourceInterval.sourceEndMs - part.sourceInterval.sourceStartMs,
    0
  );
  const oneVideoFrameMs = 1_000 / 30;
  const oneAacFrameMs = 1_024 / 48_000 * 1_000;
  assert.ok(
    Math.abs(outcome.mediaInspection.durationMs - expectedDurationMs)
      <= Math.ceil(oneVideoFrameMs + oneAacFrameMs),
    `expected approximately ${expectedDurationMs}ms, got ${outcome.mediaInspection.durationMs}ms`
  );

  const firstPixel = await extractPixel(fixture.workspaceRoot, jobFixture.videoPath, '0.250', 'first');
  const secondPixel = await extractPixel(fixture.workspaceRoot, jobFixture.videoPath, '1.250', 'second');
  assert.ok(firstPixel[0] > 200 && firstPixel[1] < 40 && firstPixel[2] < 40, firstPixel.join(','));
  assert.ok(secondPixel[2] > 200 && secondPixel[0] < 40 && secondPixel[1] < 40, secondPixel.join(','));

  const pcm = await runSuccessfulCommand('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', jobFixture.videoPath,
    '-map', '0:a:0', '-ac', '1', '-ar', '48000', '-f', 's16le', 'pipe:1'
  ], fixture.workspaceRoot);
  assert.ok(pcm.length > 0);
  const pcmSamples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  assert.ok(pcmSamples.some((sample) => sample !== 0));

  const rebuilt = buildDistantConnectionCandidateReviewResultV001({
    resultId: 'candidate-review-result-success',
    generatedAt: '2026-08-30T12:00:00.000Z',
    reviewJobPath: jobFixture.jobPath,
    reviewJobBytes: jobFixture.jobBytes,
    expectedReviewJobSha256: jobFixture.jobSha256,
    reviewVideoPath: jobFixture.videoPath,
    observedReviewVideoSha256: outcome.reviewVideoSha256,
    expectedReviewVideoSha256: outcome.reviewVideoSha256,
    observedDurationMs: outcome.mediaInspection.durationMs,
    observedVideoPresent: true,
    observedAudioPresent: true
  });
  assert.deepEqual(
    serializeDistantConnectionCandidateReviewResultV001(rebuilt),
    outcome.resultBytes
  );
  assert.deepEqual(
    await readFile(path.join(fixture.workspaceRoot, jobFixture.resultPath)),
    outcome.resultBytes
  );
});

test('既存review MP4を上書きせずprocessも正式resultも生成しない', async (t) => {
  const fixture = await createFixture(t);
  const jobFixture = await createReviewJob(fixture, 'existing-output');
  const existingBytes = Buffer.from('existing-review-video', 'utf8');
  await writeFile(path.join(fixture.workspaceRoot, jobFixture.videoPath), existingBytes, {flag: 'wx'});

  let processCallCount = 0;
  const outcome = await materializeDistantConnectionCandidateReviewV001({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: jobFixture.jobSha256,
    resultId: 'candidate-review-result-existing-output',
    generatedAt: '2026-08-30T12:00:00.000Z',
    resultOutputPath: jobFixture.resultPath,
    runProcess: async (request) => {
      processCallCount += 1;
      return successfulObservation(request);
    }
  });
  assert.equal(outcome.status, 'failed');
  if (outcome.status !== 'failed') return;
  assert.equal(outcome.failureStage, 'output-preflight');
  assert.equal(outcome.candidateReviewResultPublished, false);
  assert.equal(processCallCount, 0);
  assert.deepEqual(await readFile(path.join(fixture.workspaceRoot, jobFixture.videoPath)), existingBytes);
  assert.equal(await exists(path.join(fixture.workspaceRoot, jobFixture.resultPath)), false);
});

function successfulObservation(
  request: DistantConnectionCandidateReviewProcessRequestV001
): DistantConnectionCandidateReviewProcessObservationV001 {
  return {
    ...request,
    exitCode: 0,
    signal: null,
    stdout: '',
    stderr: '',
    launchError: null
  };
}

test('ffmpeg失敗はretryせずpartial MP4を除去して正式resultへ昇格しない', async (t) => {
  const fixture = await createFixture(t);
  const jobFixture = await createReviewJob(fixture, 'ffmpeg-failure');
  let processCallCount = 0;
  const outcome = await materializeDistantConnectionCandidateReviewV001({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: jobFixture.jobSha256,
    resultId: 'candidate-review-result-ffmpeg-failure',
    generatedAt: '2026-08-30T12:00:00.000Z',
    resultOutputPath: jobFixture.resultPath,
    runProcess: async (request) => {
      processCallCount += 1;
      assert.equal(request.stage, 'ffmpeg');
      await writeFile(path.join(fixture.workspaceRoot, jobFixture.videoPath), 'partial', {flag: 'wx'});
      return {
        ...request,
        exitCode: 1,
        signal: null,
        stdout: 'fixture ffmpeg stdout',
        stderr: 'fixture ffmpeg stderr',
        launchError: null
      };
    }
  });
  assert.equal(outcome.status, 'failed');
  if (outcome.status !== 'failed') return;
  assert.equal(outcome.failureStage, 'ffmpeg');
  assert.equal(outcome.candidateReviewResultPublished, false);
  assert.equal(processCallCount, 1);
  assert.equal(outcome.processObservations.length, 1);
  assert.equal(outcome.processObservations[0].exitCode, 1);
  assert.equal(outcome.processObservations[0].stdout, 'fixture ffmpeg stdout');
  assert.equal(outcome.processObservations[0].stderr, 'fixture ffmpeg stderr');
  assert.equal(await exists(path.join(fixture.workspaceRoot, jobFixture.videoPath)), false);
  assert.equal(await exists(path.join(fixture.workspaceRoot, jobFixture.resultPath)), false);
});

test('実行時の候補SHA差はsource検証で拒否してffmpegを起動しない', async (t) => {
  const fixture = await createFixture(t);
  const jobFixture = await createReviewJob(fixture, 'source-binding-failure');
  await writeFile(
    path.join(fixture.workspaceRoot, fixture.candidateResponsePath),
    Buffer.from('\n', 'utf8'),
    {flag: 'a'}
  );
  let processCallCount = 0;
  const outcome = await materializeDistantConnectionCandidateReviewV001({
    workspaceRoot: fixture.workspaceRoot,
    reviewJobPath: jobFixture.jobPath,
    expectedReviewJobSha256: jobFixture.jobSha256,
    resultId: 'candidate-review-result-source-binding-failure',
    generatedAt: '2026-08-30T12:00:00.000Z',
    resultOutputPath: jobFixture.resultPath,
    runProcess: async (request) => {
      processCallCount += 1;
      return successfulObservation(request);
    }
  });
  assert.equal(outcome.status, 'failed');
  if (outcome.status !== 'failed') return;
  assert.equal(outcome.failureStage, 'source-verification');
  assert.equal(outcome.candidateReviewResultPublished, false);
  assert.equal(outcome.processObservations.length, 0);
  assert.equal(processCallCount, 0);
  assert.equal(await exists(path.join(fixture.workspaceRoot, jobFixture.videoPath)), false);
  assert.equal(await exists(path.join(fixture.workspaceRoot, jobFixture.resultPath)), false);
});
