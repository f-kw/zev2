import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {access, mkdir, readFile, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  assertDistantConnectionCandidateReviewJobV001,
  buildDistantConnectionCandidateReviewResultV001,
  serializeDistantConnectionCandidateReviewResultV001,
  writeDistantConnectionCandidateReviewResultV001,
  type DistantConnectionCandidateReviewResultV001
} from './distant-connection-candidate-review-v001.js';

export const DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V001 =
  'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001';

const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

export type DistantConnectionCandidateReviewProcessStageV001 = 'ffmpeg' | 'ffprobe';

export type DistantConnectionCandidateReviewProcessRequestV001 = {
  stage: DistantConnectionCandidateReviewProcessStageV001;
  command: string;
  args: string[];
  cwd: string;
};

export type DistantConnectionCandidateReviewProcessObservationV001 =
  DistantConnectionCandidateReviewProcessRequestV001 & {
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    stdout: string;
    stderr: string;
    launchError: string | null;
  };

export type RunDistantConnectionCandidateReviewProcessV001 = (
  request: DistantConnectionCandidateReviewProcessRequestV001
) => Promise<DistantConnectionCandidateReviewProcessObservationV001>;

export type DistantConnectionCandidateReviewMediaInspectionV001 = {
  durationMs: number;
  videoStreamCount: number;
  audioStreamCount: number;
};

export type MaterializeDistantConnectionCandidateReviewInputV001 = {
  workspaceRoot: string;
  reviewJobPath: string;
  expectedReviewJobSha256: string;
  resultId: string;
  generatedAt: string;
  resultOutputPath: string;
  ffprobeExecutable?: string;
  runProcess?: RunDistantConnectionCandidateReviewProcessV001;
};

export type MaterializeDistantConnectionCandidateReviewSuccessV001 = {
  status: 'succeeded';
  reviewVideoPath: string;
  resultOutputPath: string;
  reviewVideoSha256: string;
  mediaInspection: DistantConnectionCandidateReviewMediaInspectionV001;
  processObservations: DistantConnectionCandidateReviewProcessObservationV001[];
  result: DistantConnectionCandidateReviewResultV001;
  resultBytes: Buffer;
  candidateReviewResultPublished: true;
};

export type MaterializeDistantConnectionCandidateReviewFailureStageV001 =
  | 'input-validation'
  | 'job-read'
  | 'job-validation'
  | 'output-preflight'
  | 'source-verification'
  | 'ffmpeg'
  | 'ffprobe'
  | 'media-inspection'
  | 'result-build'
  | 'result-publication';

export type MaterializeDistantConnectionCandidateReviewFailureV001 = {
  status: 'failed';
  failureStage: MaterializeDistantConnectionCandidateReviewFailureStageV001;
  message: string;
  processObservations: DistantConnectionCandidateReviewProcessObservationV001[];
  candidateReviewResultPublished: false;
};

export type MaterializeDistantConnectionCandidateReviewOutcomeV001 =
  | MaterializeDistantConnectionCandidateReviewSuccessV001
  | MaterializeDistantConnectionCandidateReviewFailureV001;

type ProbeDocument = {
  format?: {duration?: unknown};
  streams?: Array<{codec_type?: unknown}>;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function failed(
  failureStage: MaterializeDistantConnectionCandidateReviewFailureStageV001,
  error: unknown,
  processObservations: DistantConnectionCandidateReviewProcessObservationV001[]
): MaterializeDistantConnectionCandidateReviewFailureV001 {
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
  const absoluteOutputRoot = path.resolve(workspaceRoot, DISTANT_CONNECTION_CANDIDATE_REVIEW_OUTPUT_ROOT_V001);
  const fromOutputRoot = path.relative(absoluteOutputRoot, absolute);
  if (fromOutputRoot === ''
    || fromOutputRoot.startsWith(`..${path.sep}`)
    || path.isAbsolute(fromOutputRoot)) {
    throw new Error(`${label}はcandidate review専用root配下である必要があります`);
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
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function runDistantConnectionCandidateReviewProcessV001(
  request: DistantConnectionCandidateReviewProcessRequestV001
): Promise<DistantConnectionCandidateReviewProcessObservationV001> {
  return new Promise((resolve) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    const finish = (
      exitCode: number | null,
      signal: NodeJS.Signals | null,
      launchError: string | null
    ) => {
      if (settled) return;
      settled = true;
      resolve({
        ...request,
        exitCode,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        launchError
      });
    };
    const child = spawn(request.command, request.args, {
      cwd: request.cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk: Buffer) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(Buffer.from(chunk)));
    child.once('error', (error) => finish(null, null, error.message));
    child.once('close', (exitCode, signal) => finish(exitCode, signal, null));
  });
}

function parseMediaInspection(stdout: string): DistantConnectionCandidateReviewMediaInspectionV001 {
  let document: ProbeDocument;
  try {
    document = JSON.parse(stdout) as ProbeDocument;
  } catch {
    throw new Error('ffprobe出力がJSONとして読めません');
  }
  const durationSeconds = Number(document.format?.duration);
  const durationMs = Math.round(durationSeconds * 1_000);
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
  observation: DistantConnectionCandidateReviewProcessObservationV001
): string {
  if (observation.launchError) return observation.launchError;
  const suffix = observation.stderr.trim();
  return suffix.length > 0
    ? `${observation.stage}がexit ${String(observation.exitCode)}で失敗しました: ${suffix}`
    : `${observation.stage}がexit ${String(observation.exitCode)}で失敗しました`;
}

export async function materializeDistantConnectionCandidateReviewV001(
  input: MaterializeDistantConnectionCandidateReviewInputV001
): Promise<MaterializeDistantConnectionCandidateReviewOutcomeV001> {
  const observations: DistantConnectionCandidateReviewProcessObservationV001[] = [];
  const runProcess = input.runProcess ?? runDistantConnectionCandidateReviewProcessV001;
  let stage: MaterializeDistantConnectionCandidateReviewFailureStageV001 = 'input-validation';
  let absoluteReviewVideoPath: string | null = null;
  let absoluteResultOutputPath: string | null = null;
  let reviewVideoWasAbsentAtPreflight = false;
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
    let reviewJob: unknown;
    try {
      reviewJob = JSON.parse(reviewJobBytes.toString('utf8'));
    } catch {
      throw new Error('review jobがJSONとして読めません');
    }

    stage = 'job-validation';
    assertDistantConnectionCandidateReviewJobV001(reviewJob);
    absoluteReviewVideoPath = assertDedicatedOutputPath(
      absoluteWorkspaceRoot,
      reviewJob.output.path,
      'review MP4出力path'
    );
    if (path.extname(reviewJob.output.path).toLowerCase() !== '.mp4') {
      throw new Error('review動画出力はMP4である必要があります');
    }
    if (absoluteReviewVideoPath === absoluteResultOutputPath) {
      throw new Error('review MP4とcandidate review resultの出力pathが同一です');
    }

    stage = 'output-preflight';
    if (await pathExists(absoluteReviewVideoPath)) {
      throw new Error('review MP4出力が既に存在するため上書きしません');
    }
    reviewVideoWasAbsentAtPreflight = true;
    if (await pathExists(absoluteResultOutputPath)) {
      throw new Error('candidate review result出力が既に存在するため上書きしません');
    }
    resultWasAbsentAtPreflight = true;
    await mkdir(path.dirname(absoluteReviewVideoPath), {recursive: true});

    stage = 'source-verification';
    for (const [binding, label] of [
      [reviewJob.sourceBindings.candidateResponse, '正式候補成果物'],
      [reviewJob.sourceBindings.semanticUtterance, '正式意味発話成果物'],
      [reviewJob.sourceBindings.sourcePackage, 'Luna source package']
    ] as const) {
      const absoluteBoundPath = resolveWorkspacePath(
        absoluteWorkspaceRoot,
        binding.path,
        `${label}path`
      );
      const actualBoundSha256 = await sha256File(absoluteBoundPath);
      if (actualBoundSha256 !== binding.fileSha256) {
        throw new Error(`${label}のSHA-256がreview job bindingと一致しません`);
      }
    }
    const absoluteSourceVideoPath = resolveWorkspacePath(
      absoluteWorkspaceRoot,
      reviewJob.sourceBindings.sourceVideo.path,
      '元動画path'
    );
    const actualSourceVideoSha256 = await sha256File(absoluteSourceVideoPath);
    if (actualSourceVideoSha256 !== reviewJob.sourceBindings.sourceVideo.fileSha256) {
      throw new Error('元動画のSHA-256がreview job bindingと一致しません');
    }

    stage = 'ffmpeg';
    const ffmpegObservation = await runProcess({
      stage: 'ffmpeg',
      command: reviewJob.ffmpeg.executable,
      args: [...reviewJob.ffmpeg.args],
      cwd: absoluteWorkspaceRoot
    });
    observations.push(ffmpegObservation);
    if (ffmpegObservation.exitCode !== 0 || ffmpegObservation.launchError !== null) {
      throw new Error(processFailureMessage(ffmpegObservation));
    }
    if (!await pathExists(absoluteReviewVideoPath)) {
      throw new Error('ffmpeg成功後にreview MP4が存在しません');
    }

    stage = 'ffprobe';
    const ffprobeObservation = await runProcess({
      stage: 'ffprobe',
      command: input.ffprobeExecutable ?? 'ffprobe',
      args: [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=index,codec_type',
        '-of', 'json',
        reviewJob.output.path
      ],
      cwd: absoluteWorkspaceRoot
    });
    observations.push(ffprobeObservation);
    if (ffprobeObservation.exitCode !== 0 || ffprobeObservation.launchError !== null) {
      throw new Error(processFailureMessage(ffprobeObservation));
    }

    stage = 'media-inspection';
    const mediaInspection = parseMediaInspection(ffprobeObservation.stdout);
    const reviewVideoSha256 = await sha256File(absoluteReviewVideoPath);

    stage = 'result-build';
    const result = buildDistantConnectionCandidateReviewResultV001({
      resultId: input.resultId,
      generatedAt: input.generatedAt,
      reviewJobPath: input.reviewJobPath,
      reviewJobBytes,
      expectedReviewJobSha256: reviewJobSha256,
      reviewVideoPath: reviewJob.output.path,
      observedReviewVideoSha256: reviewVideoSha256,
      expectedReviewVideoSha256: reviewVideoSha256,
      observedDurationMs: mediaInspection.durationMs,
      observedVideoPresent: mediaInspection.videoStreamCount === 1,
      observedAudioPresent: mediaInspection.audioStreamCount === 1
    });
    const resultBytes = serializeDistantConnectionCandidateReviewResultV001(result);

    stage = 'result-publication';
    await writeDistantConnectionCandidateReviewResultV001({
      workspaceRoot: absoluteWorkspaceRoot,
      outputPath: input.resultOutputPath,
      result
    });

    return {
      status: 'succeeded',
      reviewVideoPath: reviewJob.output.path,
      resultOutputPath: input.resultOutputPath,
      reviewVideoSha256,
      mediaInspection,
      processObservations: observations,
      result,
      resultBytes,
      candidateReviewResultPublished: true
    };
  } catch (error) {
    const cleanupFailures: string[] = [];
    if (reviewVideoWasAbsentAtPreflight && absoluteReviewVideoPath !== null) {
      try {
        await unlinkOwnedFile(absoluteReviewVideoPath);
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
      'usage: materialize-distant-connection-candidate-review-v001 '
      + '<workspaceRoot> <reviewJobPath> <expectedReviewJobSha256> '
      + '<resultId> <generatedAt> <resultOutputPath> [ffprobeExecutable]\n'
    );
    process.exitCode = 2;
    return;
  }
  const outcome = await materializeDistantConnectionCandidateReviewV001({
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
        reviewVideoPath: outcome.reviewVideoPath,
        resultOutputPath: outcome.resultOutputPath,
        reviewVideoSha256: outcome.reviewVideoSha256,
        mediaInspection: outcome.mediaInspection,
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
