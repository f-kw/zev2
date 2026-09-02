import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {access, mkdir, readFile, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  buildDistantConnectionCandidateReviewResultV002,
  decodeDistantConnectionCandidateReviewJobV002,
  decodeDistantConnectionCandidateReviewSourceProjectionV001,
  serializeDistantConnectionCandidateReviewResultV002,
  validateDistantConnectionCandidateReviewJobAgainstProjectionV002,
  validateDistantConnectionCandidateReviewSourceProjectionAgainstSourcesV001,
  writeDistantConnectionCandidateReviewResultV002,
  type BuildCandidateReviewResultArtifactInputV002,
  type DistantConnectionCandidateReviewJobV002,
  type DistantConnectionCandidateReviewResultV002
} from './distant-connection-candidate-review-v002.js';
import {
  runDistantConnectionCandidateReviewProcessV001,
  type DistantConnectionCandidateReviewProcessObservationV001,
  type DistantConnectionCandidateReviewProcessRequestV001,
  type RunDistantConnectionCandidateReviewProcessV001
} from './materialize-distant-connection-candidate-review-v001.js';

export const DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V002 =
  'evals/clip_composition/outputs/work-distant-connection-candidate-review-v002';

const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

export type MaterializeDistantConnectionCandidateReviewInputV002 = {
  workspaceRoot: string;
  reviewJobPath: string;
  expectedReviewJobSha256: string;
  resultId: string;
  generatedAt: string;
  resultOutputPath: string;
  ffprobeExecutable?: string;
  runProcess?: RunDistantConnectionCandidateReviewProcessV001;
};

export type CandidateReviewMaterializedMediaV002 = {
  candidateId: string;
  secondOnly: {
    path: string;
    fileSha256: string;
    durationMs: number;
  };
  firstThenSecond: {
    path: string;
    fileSha256: string;
    durationMs: number;
  };
};

export type MaterializeDistantConnectionCandidateReviewSuccessV002 = {
  status: 'succeeded';
  resultOutputPath: string;
  materializedMedia: CandidateReviewMaterializedMediaV002[];
  processObservations: DistantConnectionCandidateReviewProcessObservationV001[];
  result: DistantConnectionCandidateReviewResultV002;
  resultBytes: Buffer;
  candidateReviewResultPublished: true;
};

export type MaterializeDistantConnectionCandidateReviewFailureStageV002 =
  | 'input-validation'
  | 'job-read'
  | 'job-validation'
  | 'projection-verification'
  | 'output-preflight'
  | 'source-verification'
  | 'ffmpeg'
  | 'ffprobe'
  | 'media-inspection'
  | 'result-build'
  | 'result-publication';

export type MaterializeDistantConnectionCandidateReviewFailureV002 = {
  status: 'failed';
  failureStage: MaterializeDistantConnectionCandidateReviewFailureStageV002;
  message: string;
  processObservations: DistantConnectionCandidateReviewProcessObservationV001[];
  candidateReviewResultPublished: false;
};

export type MaterializeDistantConnectionCandidateReviewOutcomeV002 =
  | MaterializeDistantConnectionCandidateReviewSuccessV002
  | MaterializeDistantConnectionCandidateReviewFailureV002;

type ProbeDocument = {
  format?: {duration?: unknown};
  streams?: Array<{codec_type?: unknown}>;
};

type MediaInspection = {
  durationMs: number;
  videoStreamCount: number;
  audioStreamCount: number;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function failed(
  failureStage: MaterializeDistantConnectionCandidateReviewFailureStageV002,
  error: unknown,
  processObservations: DistantConnectionCandidateReviewProcessObservationV001[]
): MaterializeDistantConnectionCandidateReviewFailureV002 {
  return {
    status: 'failed',
    failureStage,
    message: messageOf(error),
    processObservations: structuredClone(processObservations),
    candidateReviewResultPublished: false
  };
}

function assertWorkspacePath(value: string, label: string): void {
  if (!WORKSPACE_PATH.test(value)) throw new Error(`${label}は安全なworkspace相対pathではありません`);
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string, label: string): string {
  assertWorkspacePath(relativePath, label);
  const absoluteRoot = path.resolve(workspaceRoot);
  const absolute = path.resolve(absoluteRoot, relativePath);
  const fromRoot = path.relative(absoluteRoot, absolute);
  if (fromRoot === '' || fromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(fromRoot)) {
    throw new Error(`${label}がworkspace内のfileを指していません`);
  }
  return absolute;
}

function assertDedicatedOutputPath(workspaceRoot: string, relativePath: string, label: string): string {
  const absolute = resolveWorkspacePath(workspaceRoot, relativePath, label);
  const absoluteOutputRoot = path.resolve(
    workspaceRoot,
    DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V002
  );
  const fromOutputRoot = path.relative(absoluteOutputRoot, absolute);
  if (fromOutputRoot === ''
    || fromOutputRoot.startsWith(`..${path.sep}`)
    || path.isAbsolute(fromOutputRoot)) {
    throw new Error(`${label}はcandidate review v002専用root配下である必要があります`);
  }
  return absolute;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function unlinkOwnedFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

function parseMediaInspection(stdout: string): MediaInspection {
  let document: ProbeDocument;
  try {
    document = JSON.parse(stdout) as ProbeDocument;
  } catch {
    throw new Error('ffprobe出力がJSONとして読めません');
  }
  const durationMs = Math.round(Number(document.format?.duration) * 1_000);
  const streams = Array.isArray(document.streams) ? document.streams : [];
  const videoStreamCount = streams.filter((stream) => stream.codec_type === 'video').length;
  const audioStreamCount = streams.filter((stream) => stream.codec_type === 'audio').length;
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
    throw new Error('review MP4のdurationを正の整数ミリ秒として観測できません');
  }
  if (videoStreamCount !== 1 || audioStreamCount !== 1) {
    throw new Error('review MP4が映像track 1本・音声track 1本ではありません');
  }
  return {durationMs, videoStreamCount, audioStreamCount};
}

function processFailureMessage(
  observation: DistantConnectionCandidateReviewProcessObservationV001,
  candidateId: string,
  reviewStage: string
): string {
  if (observation.launchError) return `${candidateId} ${reviewStage}: ${observation.launchError}`;
  const suffix = observation.stderr.trim();
  return suffix.length > 0
    ? `${candidateId} ${reviewStage}がexit ${String(observation.exitCode)}で失敗しました: ${suffix}`
    : `${candidateId} ${reviewStage}がexit ${String(observation.exitCode)}で失敗しました`;
}

async function runStage(
  workspaceRoot: string,
  candidateId: string,
  stage: DistantConnectionCandidateReviewJobV002['candidates'][number]['reviewStages']['secondOnly'],
  ffprobeExecutable: string,
  runProcess: RunDistantConnectionCandidateReviewProcessV001,
  observations: DistantConnectionCandidateReviewProcessObservationV001[],
  setFailureStage: (
    stage: Extract<MaterializeDistantConnectionCandidateReviewFailureStageV002, 'ffmpeg' | 'ffprobe'>
  ) => void
): Promise<{sha256: string; inspection: MediaInspection}> {
  setFailureStage('ffmpeg');
  const ffmpegRequest: DistantConnectionCandidateReviewProcessRequestV001 = {
    stage: 'ffmpeg',
    command: stage.ffmpeg.executable,
    args: [...stage.ffmpeg.args],
    cwd: workspaceRoot
  };
  const ffmpegObservation = await runProcess(ffmpegRequest);
  observations.push(ffmpegObservation);
  if (ffmpegObservation.exitCode !== 0 || ffmpegObservation.launchError !== null) {
    throw new Error(processFailureMessage(ffmpegObservation, candidateId, stage.stage));
  }
  const absoluteOutputPath = resolveWorkspacePath(workspaceRoot, stage.output.path, 'review MP4 path');
  if (!await pathExists(absoluteOutputPath)) {
    throw new Error(`${candidateId} ${stage.stage}のffmpeg成功後にreview MP4が存在しません`);
  }

  setFailureStage('ffprobe');
  const ffprobeObservation = await runProcess({
    stage: 'ffprobe',
    command: ffprobeExecutable,
    args: [
      '-v', 'error',
      '-show_entries', 'format=duration:stream=index,codec_type',
      '-of', 'json',
      stage.output.path
    ],
    cwd: workspaceRoot
  });
  observations.push(ffprobeObservation);
  if (ffprobeObservation.exitCode !== 0 || ffprobeObservation.launchError !== null) {
    throw new Error(processFailureMessage(ffprobeObservation, candidateId, `${stage.stage} ffprobe`));
  }
  return {
    sha256: await sha256File(absoluteOutputPath),
    inspection: parseMediaInspection(ffprobeObservation.stdout)
  };
}

export async function materializeDistantConnectionCandidateReviewV002(
  input: MaterializeDistantConnectionCandidateReviewInputV002
): Promise<MaterializeDistantConnectionCandidateReviewOutcomeV002> {
  const observations: DistantConnectionCandidateReviewProcessObservationV001[] = [];
  const runProcess = input.runProcess ?? runDistantConnectionCandidateReviewProcessV001;
  let stage: MaterializeDistantConnectionCandidateReviewFailureStageV002 = 'input-validation';
  const ownedAbsentOutputs: string[] = [];
  let absoluteResultOutputPath: string | null = null;
  let resultWasAbsentAtPreflight = false;

  try {
    if (!SHA256.test(input.expectedReviewJobSha256)) {
      throw new Error('review jobの指定SHA-256が不正です');
    }
    if (input.ffprobeExecutable !== undefined && input.ffprobeExecutable.trim().length === 0) {
      throw new Error('ffprobe executableが空です');
    }
    const absoluteWorkspaceRoot = path.resolve(input.workspaceRoot);
    const absoluteReviewJobPath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      input.reviewJobPath,
      'review job path'
    );
    absoluteResultOutputPath = assertDedicatedOutputPath(
      absoluteWorkspaceRoot,
      input.resultOutputPath,
      'candidate review result出力path'
    );
    if (path.extname(input.resultOutputPath).toLowerCase() !== '.json') {
      throw new Error('candidate review result出力はJSONである必要があります');
    }

    stage = 'job-read';
    const reviewJobBytes = await readFile(absoluteReviewJobPath);
    const reviewJobSha256 = createHash('sha256').update(reviewJobBytes).digest('hex');
    if (reviewJobSha256 !== input.expectedReviewJobSha256) {
      throw new Error('review jobのSHA-256が指定値と一致しません');
    }

    stage = 'job-validation';
    const reviewJob = decodeDistantConnectionCandidateReviewJobV002(reviewJobBytes);

    stage = 'projection-verification';
    const absoluteProjectionPath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      reviewJob.sourceProjectionBinding.path,
      'source projection path'
    );
    const projectionBytes = await readFile(absoluteProjectionPath);
    if (createHash('sha256').update(projectionBytes).digest('hex')
      !== reviewJob.sourceProjectionBinding.fileSha256) {
      throw new Error('source projectionのSHA-256がreview job bindingと一致しません');
    }
    const projection = decodeDistantConnectionCandidateReviewSourceProjectionV001(projectionBytes);
    validateDistantConnectionCandidateReviewJobAgainstProjectionV002(reviewJob, {
      jobId: reviewJob.jobId,
      sourceProjectionPath: reviewJob.sourceProjectionBinding.path,
      sourceProjectionBytes: projectionBytes,
      expectedSourceProjectionSha256: reviewJob.sourceProjectionBinding.fileSha256,
      sourceVideoPath: reviewJob.sourceVideoBinding.path,
      observedSourceVideoSha256: reviewJob.sourceVideoBinding.fileSha256,
      expectedSourceVideoSha256: reviewJob.sourceVideoBinding.fileSha256,
      candidateOutputs: reviewJob.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        secondOnlyOutputPath: candidate.reviewStages.secondOnly.output.path,
        firstThenSecondOutputPath: candidate.reviewStages.firstThenSecond.output.path
      }))
    });
    if (projection.candidates.length !== reviewJob.candidates.length) {
      throw new Error('review jobがsource projection候補を完全被覆していません');
    }

    stage = 'output-preflight';
    const outputAbsolutePaths = reviewJob.candidates.flatMap((candidate) => [
      assertDedicatedOutputPath(
        absoluteWorkspaceRoot,
        candidate.reviewStages.secondOnly.output.path,
        `${candidate.candidateId} second-only出力path`
      ),
      assertDedicatedOutputPath(
        absoluteWorkspaceRoot,
        candidate.reviewStages.firstThenSecond.output.path,
        `${candidate.candidateId} first-then-second出力path`
      )
    ]);
    if (new Set(outputAbsolutePaths).size !== outputAbsolutePaths.length
      || outputAbsolutePaths.includes(absoluteResultOutputPath)) {
      throw new Error('review MP4またはresultの出力pathが重複しています');
    }
    for (const outputPath of outputAbsolutePaths) {
      if (await pathExists(outputPath)) throw new Error('review MP4出力が既に存在するため上書きしません');
      ownedAbsentOutputs.push(outputPath);
    }
    if (await pathExists(absoluteResultOutputPath)) {
      throw new Error('candidate review result出力が既に存在するため上書きしません');
    }
    resultWasAbsentAtPreflight = true;
    await Promise.all(outputAbsolutePaths.map((outputPath) => mkdir(path.dirname(outputPath), {
      recursive: true
    })));

    stage = 'source-verification';
    const candidateResponsePath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      projection.sourceBindings.candidateResponse.path,
      'projection candidate response path'
    );
    const commonUtterancePath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      projection.sourceBindings.commonUtterance.path,
      'projection common utterance path'
    );
    const sourcePackagePath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      projection.sourceBindings.sourcePackage.path,
      'projection source package path'
    );
    const sourceReusePath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      projection.sourceBindings.sourceReuse.path,
      'projection source reuse path'
    );
    const indexedModelInputPath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      projection.sourceBindings.indexedModelInput.path,
      'projection indexed model input path'
    );
    const rawResponsePath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      projection.sourceBindings.rawResponse.path,
      'projection raw response path'
    );
    const sourceVideoPath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      projection.sourceBindings.sourceVideo.path,
      'projection source video path'
    );
    const [
      candidateResponseBytes,
      commonUtteranceBytes,
      sourcePackageBytes,
      sourceReuseBytes,
      indexedModelInputBytes,
      rawResponseBytes,
      observedSourceVideoSha256
    ] = await Promise.all([
      readFile(candidateResponsePath),
      readFile(commonUtterancePath),
      readFile(sourcePackagePath),
      readFile(sourceReusePath),
      readFile(indexedModelInputPath),
      readFile(rawResponsePath),
      sha256File(sourceVideoPath)
    ]);
    validateDistantConnectionCandidateReviewSourceProjectionAgainstSourcesV001(
      projection,
      {
        projectionId: projection.projectionId,
        candidateResponsePath: projection.sourceBindings.candidateResponse.path,
        candidateResponseBytes,
        expectedCandidateResponseSha256:
          projection.sourceBindings.candidateResponse.fileSha256,
        commonUtterancePath: projection.sourceBindings.commonUtterance.path,
        commonUtteranceBytes,
        expectedCommonUtteranceSha256: projection.sourceBindings.commonUtterance.fileSha256,
        sourcePackagePath: projection.sourceBindings.sourcePackage.path,
        sourcePackageBytes,
        expectedSourcePackageSha256: projection.sourceBindings.sourcePackage.fileSha256,
        sourceReusePath: projection.sourceBindings.sourceReuse.path,
        sourceReuseBytes,
        expectedSourceReuseSha256: projection.sourceBindings.sourceReuse.fileSha256,
        indexedModelInputPath: projection.sourceBindings.indexedModelInput.path,
        indexedModelInputBytes,
        expectedIndexedModelInputSha256:
          projection.sourceBindings.indexedModelInput.fileSha256,
        rawResponsePath: projection.sourceBindings.rawResponse.path,
        rawResponseBytes,
        expectedRawResponseSha256: projection.sourceBindings.rawResponse.fileSha256,
        sourceVideoPath: projection.sourceBindings.sourceVideo.path,
        observedSourceVideoSha256,
        expectedSourceVideoSha256: projection.sourceBindings.sourceVideo.fileSha256
      }
    );

    const candidateArtifacts: BuildCandidateReviewResultArtifactInputV002[] = [];
    const materializedMedia: CandidateReviewMaterializedMediaV002[] = [];
    for (const candidate of reviewJob.candidates) {
      stage = 'ffmpeg';
      const secondOnly = await runStage(
        absoluteWorkspaceRoot,
        candidate.candidateId,
        candidate.reviewStages.secondOnly,
        input.ffprobeExecutable ?? 'ffprobe',
        runProcess,
        observations,
        (nextStage) => { stage = nextStage; }
      );
      stage = 'ffprobe';
      const firstThenSecond = await runStage(
        absoluteWorkspaceRoot,
        candidate.candidateId,
        candidate.reviewStages.firstThenSecond,
        input.ffprobeExecutable ?? 'ffprobe',
        runProcess,
        observations,
        (nextStage) => { stage = nextStage; }
      );
      stage = 'media-inspection';
      candidateArtifacts.push({
        candidateId: candidate.candidateId,
        secondOnly: {
          videoPath: candidate.reviewStages.secondOnly.output.path,
          observedVideoSha256: secondOnly.sha256,
          expectedVideoSha256: secondOnly.sha256,
          observedDurationMs: secondOnly.inspection.durationMs,
          observedVideoPresent: secondOnly.inspection.videoStreamCount === 1,
          observedAudioPresent: secondOnly.inspection.audioStreamCount === 1
        },
        firstThenSecond: {
          videoPath: candidate.reviewStages.firstThenSecond.output.path,
          observedVideoSha256: firstThenSecond.sha256,
          expectedVideoSha256: firstThenSecond.sha256,
          observedDurationMs: firstThenSecond.inspection.durationMs,
          observedVideoPresent: firstThenSecond.inspection.videoStreamCount === 1,
          observedAudioPresent: firstThenSecond.inspection.audioStreamCount === 1
        }
      });
      materializedMedia.push({
        candidateId: candidate.candidateId,
        secondOnly: {
          path: candidate.reviewStages.secondOnly.output.path,
          fileSha256: secondOnly.sha256,
          durationMs: secondOnly.inspection.durationMs
        },
        firstThenSecond: {
          path: candidate.reviewStages.firstThenSecond.output.path,
          fileSha256: firstThenSecond.sha256,
          durationMs: firstThenSecond.inspection.durationMs
        }
      });
    }

    stage = 'result-build';
    const result = buildDistantConnectionCandidateReviewResultV002({
      resultId: input.resultId,
      generatedAt: input.generatedAt,
      sourceProjectionPath: reviewJob.sourceProjectionBinding.path,
      sourceProjectionBytes: projectionBytes,
      expectedSourceProjectionSha256: reviewJob.sourceProjectionBinding.fileSha256,
      reviewJobPath: input.reviewJobPath,
      reviewJobBytes,
      expectedReviewJobSha256: reviewJobSha256,
      candidateArtifacts
    });
    const resultBytes = serializeDistantConnectionCandidateReviewResultV002(result);

    stage = 'result-publication';
    await writeDistantConnectionCandidateReviewResultV002({
      workspaceRoot: absoluteWorkspaceRoot,
      outputPath: input.resultOutputPath,
      result
    });

    return {
      status: 'succeeded',
      resultOutputPath: input.resultOutputPath,
      materializedMedia,
      processObservations: observations,
      result,
      resultBytes,
      candidateReviewResultPublished: true
    };
  } catch (error) {
    const cleanupFailures: string[] = [];
    for (const outputPath of ownedAbsentOutputs) {
      try {
        await unlinkOwnedFile(outputPath);
      } catch (cleanupError) {
        cleanupFailures.push(`失敗review MP4の除去: ${messageOf(cleanupError)}`);
      }
    }
    if (resultWasAbsentAtPreflight && absoluteResultOutputPath !== null) {
      try {
        await unlinkOwnedFile(absoluteResultOutputPath);
      } catch (cleanupError) {
        cleanupFailures.push(`失敗candidate review resultの除去: ${messageOf(cleanupError)}`);
      }
    }
    const message = cleanupFailures.length === 0
      ? error
      : `${messageOf(error)} / ${cleanupFailures.join(' / ')}`;
    return failed(stage, message, observations);
  }
}

async function runCli(): Promise<void> {
  const [workspaceRoot, reviewJobPath, expectedReviewJobSha256, resultId, generatedAt,
    resultOutputPath, ffprobeExecutable] = process.argv.slice(2);
  if (!workspaceRoot || !reviewJobPath || !expectedReviewJobSha256 || !resultId
    || !generatedAt || !resultOutputPath || process.argv.slice(2).length > 7) {
    process.stderr.write(
      'usage: materialize-distant-connection-candidate-review-v002 '
      + '<workspaceRoot> <reviewJobPath> <expectedReviewJobSha256> '
      + '<resultId> <generatedAt> <resultOutputPath> [ffprobeExecutable]\n'
    );
    process.exitCode = 2;
    return;
  }
  const outcome = await materializeDistantConnectionCandidateReviewV002({
    workspaceRoot,
    reviewJobPath,
    expectedReviewJobSha256,
    resultId,
    generatedAt,
    resultOutputPath,
    ...(ffprobeExecutable ? {ffprobeExecutable} : {})
  });
  const summary = outcome.status === 'succeeded'
    ? {
        status: outcome.status,
        resultOutputPath: outcome.resultOutputPath,
        materializedMedia: outcome.materializedMedia,
        processObservations: outcome.processObservations,
        candidateReviewResultPublished: outcome.candidateReviewResultPublished
      }
    : outcome;
  const destination = outcome.status === 'succeeded' ? process.stdout : process.stderr;
  destination.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = outcome.status === 'succeeded' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli();
}
