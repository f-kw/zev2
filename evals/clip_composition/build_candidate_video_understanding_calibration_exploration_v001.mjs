import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {constants as fsConstants, createReadStream} from 'node:fs';
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const GENERATOR_SCHEMA_VERSION =
  'candidate-video-understanding-calibration-exploration-generator-v001';
const BUILD_RECORD_SCHEMA_VERSION =
  'candidate-video-understanding-calibration-exploration-build-and-verification-v001';
const MAPPING_SCHEMA_VERSION = 'candidate-video-source-pts-mapping-v001';
const MEDIA_SCHEMA_VERSION = 'media-file-v001';
const EXPLORATION_MEDIA_SCHEMA_VERSION = 'candidate-video-exploration-media-v001';
const SOURCE_VIDEO_ID = 'ymUsGrT6EaA';
const SOURCE_VIDEO_RELATIVE_PATH =
  'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const SOURCE_VIDEO_SHA256 =
  '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const OUTPUT_ROOT_RELATIVE_PATH =
  'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001';
const STAGING_ROOT_RELATIVE_PATH = `${OUTPUT_ROOT_RELATIVE_PATH}.staging-v001`;
const EXPLORATION_VIDEO_FILE_NAME = 'exploration-video-v001.mp4';
const MAPPING_FILE_NAME = 'exploration-video-source-pts-mapping-v001.json';
const BUILD_RECORD_FILE_NAME = 'build-and-verification-v001.json';
const CONCAT_FILTER = '[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[outv][outa]';
const EXPECTED_TOTAL_SELECTION_DURATION_MS = 543_592;
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const MODULE_ABSOLUTE_PATH = fileURLToPath(import.meta.url);
const WORKSPACE_ROOT = path.resolve(path.dirname(MODULE_ABSOLUTE_PATH), '..', '..');
const GENERATOR_RELATIVE_PATH = toRepoPath(path.relative(WORKSPACE_ROOT, MODULE_ABSOLUTE_PATH));

const CALIBRATION_ITEMS = Object.freeze([
  Object.freeze({
    ordinal: 1,
    itemId: 'item-0001',
    candidateId: 'camera-fear-escalation',
    sourceIntervals: Object.freeze([
      Object.freeze({part: 'first', sourceStartMs: 628_078, sourceEndMs: 683_238}),
      Object.freeze({part: 'second', sourceStartMs: 1_377_898, sourceEndMs: 1_428_251}),
    ]),
  }),
  Object.freeze({
    ordinal: 2,
    itemId: 'item-0002',
    candidateId: 'medicine-effect-payoff',
    sourceIntervals: Object.freeze([
      Object.freeze({part: 'first', sourceStartMs: 1_644_392, sourceEndMs: 1_700_141}),
      Object.freeze({part: 'second', sourceStartMs: 4_363_406, sourceEndMs: 4_414_164}),
    ]),
  }),
  Object.freeze({
    ordinal: 3,
    itemId: 'item-0003',
    candidateId: 'candidate-doctor-disappearance-to-ogre-mother',
    sourceIntervals: Object.freeze([
      Object.freeze({part: 'first', sourceStartMs: 1_695_299, sourceEndMs: 1_750_321}),
      Object.freeze({part: 'second', sourceStartMs: 5_662_938, sourceEndMs: 5_714_097}),
    ]),
  }),
  Object.freeze({
    ordinal: 4,
    itemId: 'item-0004',
    candidateId: 'candidate-horror-claim-to-speed-up',
    sourceIntervals: Object.freeze([
      Object.freeze({part: 'first', sourceStartMs: 214_410, sourceEndMs: 264_995}),
      Object.freeze({part: 'second', sourceStartMs: 1_945_338, sourceEndMs: 2_015_211}),
    ]),
  }),
  Object.freeze({
    ordinal: 5,
    itemId: 'item-0005',
    candidateId: 'candidate-horror-game-to-screams-001',
    sourceIntervals: Object.freeze([
      Object.freeze({part: 'first', sourceStartMs: 214_410, sourceEndMs: 264_995}),
      Object.freeze({part: 'second', sourceStartMs: 6_099_087, sourceEndMs: 6_153_435}),
    ]),
  }),
]);

class ExplorationBuildError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExplorationBuildError';
  }
}

function fail(message) {
  throw new ExplorationBuildError(message);
}

function toRepoPath(value) {
  return value.split(path.sep).join('/');
}

function absolutePath(relativePath) {
  if (typeof relativePath !== 'string'
      || path.posix.isAbsolute(relativePath)
      || relativePath.includes('\\')
      || relativePath.split('/').some((part) => part === '' || part === '.' || part === '..')
      || path.posix.normalize(relativePath) !== relativePath) {
    fail(`unsafe workspace-relative path: ${String(relativePath)}`);
  }
  const resolved = path.resolve(WORKSPACE_ROOT, relativePath);
  const relative = path.relative(WORKSPACE_ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`path escapes workspace: ${relativePath}`);
  }
  return resolved;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return value;
}

function requireSafeInteger(value, label, {positive = false, nonNegative = false} = {}) {
  if (!Number.isSafeInteger(value)
      || (positive && value <= 0)
      || (nonNegative && value < 0)) {
    fail(`${label} must be a safe integer with the required sign`);
  }
  return value;
}

function requireString(value, label, {nonEmpty = false} = {}) {
  if (typeof value !== 'string' || (nonEmpty && value.length === 0)) {
    fail(`${label} must be a string${nonEmpty ? ' and must not be empty' : ''}`);
  }
  return value;
}

function assertExactKeys(value, expectedKeys, label) {
  const actual = Object.keys(requireRecord(value, label)).sort();
  const expected = [...expectedKeys].sort();
  assert.deepEqual(actual, expected, `${label} keys changed`);
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function sha256File(filePath) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('canonical JSON contains a non-finite number');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) fail('canonical JSON contains an unsupported value');
  return Object.fromEntries(Object.keys(value).sort().map((key) => {
    if (value[key] === undefined) fail('canonical JSON contains undefined');
    return [key, canonicalize(value[key])];
  }));
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(canonicalize(value))}\n`, 'utf8');
}

function canonicalSha256(value) {
  return sha256Bytes(canonicalBytes(value));
}

function parseCanonicalBytes(bytes, label) {
  let value;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    fail(`${label} is not JSON`);
  }
  if (!canonicalBytes(value).equals(Buffer.from(bytes))) {
    fail(`${label} is not canonical JSON bytes`);
  }
  return value;
}

function gcdBigInt(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function rationalBigInt(numerator, denominator = 1n) {
  if (denominator === 0n) fail('rational denominator must not be zero');
  let n = BigInt(numerator);
  let d = BigInt(denominator);
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = gcdBigInt(n, d);
  return {numerator: n / divisor, denominator: d / divisor};
}

function rationalNumber(numerator, denominator = 1) {
  const value = rationalBigInt(BigInt(numerator), BigInt(denominator));
  const n = Number(value.numerator);
  const d = Number(value.denominator);
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) {
    fail('rational cannot be represented as safe JSON integers');
  }
  return {numerator: n, denominator: d};
}

function compareRational(left, right) {
  const value = BigInt(left.numerator) * BigInt(right.denominator)
    - BigInt(right.numerator) * BigInt(left.denominator);
  return value < 0n ? -1 : value > 0n ? 1 : 0;
}

function maxRational(left, right) {
  return compareRational(left, right) >= 0 ? left : right;
}

function minRational(left, right) {
  return compareRational(left, right) <= 0 ? left : right;
}

function parseRationalText(value, label) {
  const match = /^(-?\d+)\/(\d+)$/u.exec(requireString(value, label, {nonEmpty: true}));
  if (!match) fail(`${label} must be an exact rational string`);
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  requireSafeInteger(numerator, `${label}.numerator`);
  requireSafeInteger(denominator, `${label}.denominator`, {positive: true});
  return rationalNumber(numerator, denominator);
}

function parseIntegerField(value, label, {positive = false, nonNegative = false} = {}) {
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^-?\d+$/u.test(value)
      ? Number(value)
      : Number.NaN;
  return requireSafeInteger(number, label, {positive, nonNegative});
}

function decimalSeconds(milliseconds) {
  requireSafeInteger(milliseconds, 'milliseconds', {nonNegative: true});
  return `${Math.floor(milliseconds / 1000)}.${String(milliseconds % 1000).padStart(3, '0')}`;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectedManifest() {
  return [
    {
      ordinal: 1,
      itemId: 'item-0001',
      candidateId: 'camera-fear-escalation',
      sourceIntervals: [
        {part: 'first', sourceStartMs: 628_078, sourceEndMs: 683_238},
        {part: 'second', sourceStartMs: 1_377_898, sourceEndMs: 1_428_251},
      ],
    },
    {
      ordinal: 2,
      itemId: 'item-0002',
      candidateId: 'medicine-effect-payoff',
      sourceIntervals: [
        {part: 'first', sourceStartMs: 1_644_392, sourceEndMs: 1_700_141},
        {part: 'second', sourceStartMs: 4_363_406, sourceEndMs: 4_414_164},
      ],
    },
    {
      ordinal: 3,
      itemId: 'item-0003',
      candidateId: 'candidate-doctor-disappearance-to-ogre-mother',
      sourceIntervals: [
        {part: 'first', sourceStartMs: 1_695_299, sourceEndMs: 1_750_321},
        {part: 'second', sourceStartMs: 5_662_938, sourceEndMs: 5_714_097},
      ],
    },
    {
      ordinal: 4,
      itemId: 'item-0004',
      candidateId: 'candidate-horror-claim-to-speed-up',
      sourceIntervals: [
        {part: 'first', sourceStartMs: 214_410, sourceEndMs: 264_995},
        {part: 'second', sourceStartMs: 1_945_338, sourceEndMs: 2_015_211},
      ],
    },
    {
      ordinal: 5,
      itemId: 'item-0005',
      candidateId: 'candidate-horror-game-to-screams-001',
      sourceIntervals: [
        {part: 'first', sourceStartMs: 214_410, sourceEndMs: 264_995},
        {part: 'second', sourceStartMs: 6_099_087, sourceEndMs: 6_153_435},
      ],
    },
  ];
}

function validateManifest(value) {
  if (!Array.isArray(value)) fail('calibration manifest must be an array');
  assert.deepEqual(cloneJson(value), expectedManifest(), 'fixed calibration manifest changed');
  const ids = new Set();
  let total = 0;
  for (const item of value) {
    if (ids.has(item.itemId)) fail('calibration item ID is duplicated');
    ids.add(item.itemId);
    for (const interval of item.sourceIntervals) {
      if (interval.sourceEndMs <= interval.sourceStartMs) fail('source interval is empty or reversed');
      total += interval.sourceEndMs - interval.sourceStartMs;
    }
  }
  if (total !== EXPECTED_TOTAL_SELECTION_DURATION_MS) {
    fail('fixed calibration selection total changed');
  }
}

function itemPaths(item, rootRelativePath = OUTPUT_ROOT_RELATIVE_PATH) {
  const itemRoot = `${rootRelativePath}/${item.itemId}`;
  return {
    itemRoot,
    video: `${itemRoot}/${EXPLORATION_VIDEO_FILE_NAME}`,
    mapping: `${itemRoot}/${MAPPING_FILE_NAME}`,
    record: `${itemRoot}/${BUILD_RECORD_FILE_NAME}`,
  };
}

function expectedFormalArtifactPaths() {
  return CALIBRATION_ITEMS.flatMap((item) => {
    const paths = itemPaths(item);
    return [paths.video, paths.mapping, paths.record];
  });
}

function validateApprovedPathSet() {
  validateManifest(CALIBRATION_ITEMS);
  const paths = [GENERATOR_RELATIVE_PATH, ...expectedFormalArtifactPaths()];
  if (paths.length !== 16 || new Set(paths).size !== 16) {
    fail('approved formal path inventory is not exactly 16 unique paths');
  }
  if (GENERATOR_RELATIVE_PATH
      !== 'evals/clip_composition/build_candidate_video_understanding_calibration_exploration_v001.mjs') {
    fail('generator is not running from its approved formal path');
  }
  assert.deepEqual(expectedFormalArtifactPaths(), [
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/exploration-video-v001.mp4',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/exploration-video-source-pts-mapping-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0001/build-and-verification-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/exploration-video-v001.mp4',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/exploration-video-source-pts-mapping-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0002/build-and-verification-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/exploration-video-v001.mp4',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/exploration-video-source-pts-mapping-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0003/build-and-verification-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/exploration-video-v001.mp4',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/exploration-video-source-pts-mapping-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0004/build-and-verification-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/exploration-video-v001.mp4',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/exploration-video-source-pts-mapping-v001.json',
    'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001/item-0005/build-and-verification-v001.json',
  ], 'formal artifact paths differ from the 15 approved literal paths');
  if (SOURCE_VIDEO_RELATIVE_PATH
      !== 'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4') {
    fail('source video path differs from the fixed source');
  }
}

async function pathExists(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function assertPathAbsent(filePath, label) {
  if (await pathExists(filePath)) fail(`${label} already exists; overwrite is forbidden`);
}

function processEvidence(result) {
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    stdoutByteLength: result.stdout.length,
    stdoutSha256: sha256Bytes(result.stdout),
    stderrByteLength: result.stderr.length,
    stderrSha256: sha256Bytes(result.stderr),
    elapsedMilliseconds: result.elapsedMilliseconds,
  };
}

async function runProcess(executable, args, {maxOutputBytes = 512 * 1024 * 1024} = {}) {
  const started = process.hrtime.bigint();
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: WORKSPACE_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutLength = 0;
    let stderrLength = 0;
    let overflow = false;
    const collect = (chunks, key) => (chunk) => {
      if (overflow) return;
      if (key === 'stdout') stdoutLength += chunk.length;
      else stderrLength += chunk.length;
      if (stdoutLength + stderrLength > maxOutputBytes) {
        overflow = true;
        child.kill('SIGKILL');
        return;
      }
      chunks.push(Buffer.from(chunk));
    };
    child.stdout.on('data', collect(stdoutChunks, 'stdout'));
    child.stderr.on('data', collect(stderrChunks, 'stderr'));
    child.on('error', reject);
    child.on('close', (exitCode, signal) => {
      const stdout = Buffer.concat(stdoutChunks);
      const stderr = Buffer.concat(stderrChunks);
      const elapsedMilliseconds = Number((process.hrtime.bigint() - started) / 1_000_000n);
      if (overflow) {
        reject(new ExplorationBuildError(`process output exceeded ${maxOutputBytes} bytes: ${executable}`));
        return;
      }
      if (exitCode !== 0) {
        const tail = stderr.toString('utf8').slice(-4000);
        reject(new ExplorationBuildError(
          `process failed (${String(exitCode)}, ${String(signal)}): ${executable}\n${tail}`
        ));
        return;
      }
      resolve({stdout, stderr, exitCode, signal, elapsedMilliseconds});
    });
  });
}

async function resolveTool(name) {
  const searchPaths = requireString(process.env.PATH ?? '', 'PATH').split(path.delimiter);
  let lookupPath = null;
  for (const directory of searchPaths) {
    if (!directory) continue;
    const candidate = path.join(directory, name);
    try {
      await access(candidate, fsConstants.X_OK);
      lookupPath = candidate;
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'EACCES') throw error;
    }
  }
  if (lookupPath === null) fail(`${name} was not found on PATH`);
  const realPath = await realpath(lookupPath);
  const [binarySha256, versionResult] = await Promise.all([
    sha256File(realPath),
    runProcess(realPath, ['-version']),
  ]);
  const versionOutput = versionResult.stdout.toString('utf8');
  const versionFirstLine = versionOutput.split(/\r?\n/u)[0];
  if (!versionFirstLine.startsWith(`${name} version `)) fail(`${name} version output is unexpected`);
  return {
    name,
    lookupPath,
    realPath,
    binarySha256,
    versionFirstLine,
    versionOutputSha256: sha256Bytes(versionResult.stdout),
    versionOutput,
  };
}

async function resolveToolchain() {
  const [ffmpeg, ffprobe] = await Promise.all([resolveTool('ffmpeg'), resolveTool('ffprobe')]);
  return {ffmpeg, ffprobe};
}

function generationArguments(item, outputRelativePath) {
  const inputs = item.sourceIntervals.flatMap((interval) => [
    '-ss', decimalSeconds(interval.sourceStartMs),
    '-to', decimalSeconds(interval.sourceEndMs),
    '-i', SOURCE_VIDEO_RELATIVE_PATH,
  ]);
  return [
    '-hide_banner', '-nostdin', '-n',
    ...inputs,
    '-filter_complex', CONCAT_FILTER,
    '-map', '[outv]', '-map', '[outa]',
    '-c:v', 'libx264', '-c:a', 'aac',
    '-movflags', '+faststart',
    outputRelativePath,
  ];
}

function validateGenerationArguments(item, outputRelativePath, args) {
  assert.deepEqual(args, generationArguments(item, outputRelativePath), 'FFmpeg arguments changed');
  const forbiddenTokens = new Set([
    '-r', '-vf', '-filter:v', '-fps_mode', '-vsync', '-copyts', '-c', '-codec', '-shortest',
  ]);
  for (const token of args) {
    if (forbiddenTokens.has(token)) fail(`forbidden generation argument: ${token}`);
    if (typeof token === 'string' && /(?:^|[,=])(?:fps|scale|crop|subtitles|setpts|asetpts)(?:$|[,=(])/u.test(token)) {
      fail(`forbidden generation transform: ${token}`);
    }
  }
  if (args.filter((token) => token === CONCAT_FILTER).length !== 1) {
    fail('generation must use exactly one approved concat filter');
  }
}

function normalizeToolBinding(tool) {
  return {
    name: tool.name,
    realPath: tool.realPath,
    binarySha256: tool.binarySha256,
    versionFirstLine: tool.versionFirstLine,
    versionOutputSha256: tool.versionOutputSha256,
  };
}

function stableMediaSummary(metadata, frames) {
  const video = metadata.video;
  const audio = metadata.audio;
  return {
    container: {
      formatName: metadata.container.formatName,
      durationSeconds: metadata.container.durationSeconds,
      sizeBytesReported: metadata.container.sizeBytesReported,
    },
    video: {
      streamIndex: video.streamIndex,
      codecName: video.codecName,
      profile: video.profile,
      pixelFormat: video.pixelFormat,
      width: video.width,
      height: video.height,
      rFrameRate: video.rFrameRate,
      averageFrameRate: video.averageFrameRate,
      timeBase: video.timeBase,
      startPts: video.startPts,
      durationPts: video.durationPts,
      declaredStreamDurationSeconds: rationalNumber(
        video.durationPts * video.timeBase.numerator,
        video.timeBase.denominator
      ),
      streamDeclaredEndPtsExclusive: video.startPts + video.durationPts,
      frameCount: frames.length,
      firstFramePts: frames[0].pts,
      lastFramePts: frames.at(-1).pts,
      lastFrameDurationPts: frames.at(-1).durationPts,
      actualFrameTimelineEndPtsExclusive: frames.at(-1).pts + frames.at(-1).durationPts,
      actualFrameTimelineDurationSeconds: rationalNumber(
        (frames.at(-1).pts + frames.at(-1).durationPts - frames[0].pts)
          * video.timeBase.numerator,
        video.timeBase.denominator
      ),
      streamEndMinusActualFrameEndPts:
        video.startPts + video.durationPts
        - frames.at(-1).pts - frames.at(-1).durationPts,
      frameTupleSha256: frameTupleSha256(frames),
    },
    audio: {
      present: true,
      streamIndex: audio.streamIndex,
      codecName: audio.codecName,
      profile: audio.profile,
      sampleRateHz: audio.sampleRateHz,
      channels: audio.channels,
      channelLayout: audio.channelLayout,
      timeBase: audio.timeBase,
      startPts: audio.startPts,
      durationPts: audio.durationPts,
      timelineDurationSeconds: rationalNumber(
        audio.durationPts * audio.timeBase.numerator,
        audio.timeBase.denominator
      ),
    },
    subtitleStreamCount: metadata.subtitleStreamCount,
  };
}

async function inspectMedia(relativePath, ffprobe) {
  const args = mediaProbeArguments(relativePath);
  const result = await runProcess(ffprobe.realPath, args);
  let root;
  try {
    root = JSON.parse(result.stdout.toString('utf8'));
  } catch {
    fail(`ffprobe metadata for ${relativePath} is not JSON`);
  }
  requireRecord(root, `${relativePath} ffprobe root`);
  if (!Array.isArray(root.streams)) fail(`${relativePath} ffprobe streams are missing`);
  const videoStreams = root.streams.filter((stream) => stream?.codec_type === 'video');
  const audioStreams = root.streams.filter((stream) => stream?.codec_type === 'audio');
  const subtitleStreams = root.streams.filter((stream) => stream?.codec_type === 'subtitle');
  if (videoStreams.length !== 1 || audioStreams.length !== 1) {
    fail(`${relativePath} must contain exactly one video and one audio stream`);
  }
  const video = requireRecord(videoStreams[0], `${relativePath} video stream`);
  const audio = requireRecord(audioStreams[0], `${relativePath} audio stream`);
  const format = requireRecord(root.format, `${relativePath} format`);
  const metadata = {
    container: {
      formatName: requireString(format.format_name, `${relativePath} format_name`, {nonEmpty: true}),
      durationSeconds: requireString(format.duration, `${relativePath} format.duration`, {nonEmpty: true}),
      sizeBytesReported: parseIntegerField(format.size, `${relativePath} format.size`, {positive: true}),
    },
    video: {
      streamIndex: parseIntegerField(video.index, `${relativePath} video.index`, {nonNegative: true}),
      codecName: requireString(video.codec_name, `${relativePath} video.codec_name`, {nonEmpty: true}),
      profile: requireString(video.profile ?? 'unknown', `${relativePath} video.profile`, {nonEmpty: true}),
      pixelFormat: requireString(video.pix_fmt, `${relativePath} video.pix_fmt`, {nonEmpty: true}),
      width: parseIntegerField(video.width, `${relativePath} video.width`, {positive: true}),
      height: parseIntegerField(video.height, `${relativePath} video.height`, {positive: true}),
      rFrameRate: parseRationalText(video.r_frame_rate, `${relativePath} video.r_frame_rate`),
      averageFrameRate: parseRationalText(video.avg_frame_rate, `${relativePath} video.avg_frame_rate`),
      timeBase: parseRationalText(video.time_base, `${relativePath} video.time_base`),
      startPts: parseIntegerField(video.start_pts, `${relativePath} video.start_pts`),
      durationPts: parseIntegerField(video.duration_ts, `${relativePath} video.duration_ts`, {positive: true}),
      reportedFrameCount: parseIntegerField(video.nb_frames, `${relativePath} video.nb_frames`, {positive: true}),
    },
    audio: {
      streamIndex: parseIntegerField(audio.index, `${relativePath} audio.index`, {nonNegative: true}),
      codecName: requireString(audio.codec_name, `${relativePath} audio.codec_name`, {nonEmpty: true}),
      profile: requireString(audio.profile ?? 'unknown', `${relativePath} audio.profile`, {nonEmpty: true}),
      sampleRateHz: parseIntegerField(audio.sample_rate, `${relativePath} audio.sample_rate`, {positive: true}),
      channels: parseIntegerField(audio.channels, `${relativePath} audio.channels`, {positive: true}),
      channelLayout: requireString(audio.channel_layout, `${relativePath} audio.channel_layout`, {nonEmpty: true}),
      timeBase: parseRationalText(audio.time_base, `${relativePath} audio.time_base`),
      startPts: parseIntegerField(audio.start_pts, `${relativePath} audio.start_pts`),
      durationPts: parseIntegerField(audio.duration_ts, `${relativePath} audio.duration_ts`, {positive: true}),
    },
    subtitleStreamCount: subtitleStreams.length,
  };
  return {metadata, command: {executable: ffprobe.realPath, arguments: args}, process: processEvidence(result)};
}

function mediaProbeArguments(relativePath) {
  return [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    relativePath,
  ];
}

function parseFrameCsv(bytes, label) {
  const text = bytes.toString('utf8').trim();
  if (text.length === 0) fail(`${label} contains no frames`);
  const frames = text.split(/\r?\n/u).filter(Boolean).map((line, index) => {
    const match = /^(-?\d+),(-?\d+),(\d+)(?:,.*)?$/u.exec(line);
    if (!match) fail(`${label} frame ${index} is not exact pts,best_effort_timestamp,duration CSV`);
    const pts = parseIntegerField(match[1], `${label}[${index}].pts`);
    const bestEffortTimestamp = parseIntegerField(match[2], `${label}[${index}].bestEffortTimestamp`);
    const durationPts = parseIntegerField(match[3], `${label}[${index}].duration`, {positive: true});
    if (pts !== bestEffortTimestamp) fail(`${label} frame ${index} raw PTS differs from best effort timestamp`);
    return {index, pts, durationPts};
  });
  return frames;
}

async function probeFrames(relativePath, ffprobe) {
  const args = frameProbeArguments(relativePath);
  const result = await runProcess(ffprobe.realPath, args);
  return {
    frames: parseFrameCsv(result.stdout, `${relativePath} frames`),
    command: {executable: ffprobe.realPath, arguments: args},
    process: processEvidence(result),
  };
}

function frameProbeArguments(relativePath) {
  return [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'frame=pts,best_effort_timestamp,duration',
    '-of', 'csv=p=0',
    relativePath,
  ];
}

function parsePacketCsv(bytes, label) {
  const text = bytes.toString('utf8').trim();
  if (text.length === 0) fail(`${label} contains no video packets`);
  const packets = text.split(/\r?\n/u).filter(Boolean).map((line, inputOrdinal) => {
    const match = /^(-?\d+),(\d+)(?:,.*)?$/u.exec(line);
    if (!match) fail(`${label} packet ${inputOrdinal} is not exact pts,duration CSV`);
    return {
      inputOrdinal,
      pts: parseIntegerField(match[1], `${label}[${inputOrdinal}].pts`),
      durationPts: parseIntegerField(
        match[2],
        `${label}[${inputOrdinal}].durationPts`,
        {positive: true}
      ),
    };
  });
  packets.sort((left, right) => left.pts - right.pts);
  return packets.map((packet, index) => ({
    index,
    pts: packet.pts,
    durationPts: packet.durationPts,
  }));
}

async function probeSourcePackets(relativePath, ffprobe) {
  const args = sourcePacketProbeArguments(relativePath);
  const result = await runProcess(ffprobe.realPath, args);
  return {
    frames: parsePacketCsv(result.stdout, `${relativePath} video packet PTS index`),
    command: {executable: ffprobe.realPath, arguments: args},
    process: processEvidence(result),
  };
}

function sourcePacketProbeArguments(relativePath) {
  return [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_packets',
    '-show_entries', 'packet=pts,duration',
    '-of', 'csv=p=0',
    relativePath,
  ];
}

function frameTupleSha256(frames) {
  const hash = createHash('sha256');
  for (const frame of frames) hash.update(`${frame.index}\t${frame.pts}\t${frame.durationPts}\n`);
  return hash.digest('hex');
}

function correspondenceTupleSha256(rows) {
  const hash = createHash('sha256');
  for (const row of rows) {
    hash.update([
      row.candidateFrameIndex,
      row.candidatePts,
      row.candidateDurationPts,
      row.sourceFrameIndex,
      row.sourcePts,
      row.sourceDurationPts,
    ].join('\t'));
    hash.update('\n');
  }
  return hash.digest('hex');
}

function inspectFrameSupport(frames, label, {allowDeclaredDurationOverlap = false} = {}) {
  if (!Array.isArray(frames) || frames.length === 0) fail(`${label} has no frames`);
  const gaps = [];
  const declaredDurationOverlaps = [];
  for (const [index, frame] of frames.entries()) {
    requireSafeInteger(frame.index, `${label}[${index}].index`, {nonNegative: true});
    requireSafeInteger(frame.pts, `${label}[${index}].pts`);
    requireSafeInteger(frame.durationPts, `${label}[${index}].durationPts`, {positive: true});
    if (frame.index !== index) fail(`${label} frame ordinals are not exact`);
    if (index === 0) continue;
    const previous = frames[index - 1];
    const previousEnd = previous.pts + previous.durationPts;
    requireSafeInteger(previousEnd, `${label}[${index - 1}] end`);
    if (frame.pts < previousEnd) {
      if (!allowDeclaredDurationOverlap) fail(`${label} frame support overlaps at frame ${index}`);
      declaredDurationOverlaps.push({
        previousFrameIndex: index - 1,
        nextFrameIndex: index,
        previousFramePts: previous.pts,
        previousFrameDeclaredDurationPts: previous.durationPts,
        nextFramePts: frame.pts,
        declaredOverlapStartPts: frame.pts,
        declaredOverlapEndPtsExclusive: previousEnd,
        declaredOverlapDurationPts: previousEnd - frame.pts,
      });
    }
    if (frame.pts > previousEnd) {
      gaps.push({
        previousFrameIndex: index - 1,
        nextFrameIndex: index,
        startPts: previousEnd,
        endPtsExclusive: frame.pts,
        durationPts: frame.pts - previousEnd,
      });
    }
  }
  return {gaps, declaredDurationOverlaps};
}

function assertSixtyFpsFrameDurations(frames, timeBase, label) {
  for (const [index, frame] of frames.entries()) {
    const left = BigInt(frame.durationPts) * BigInt(timeBase.numerator) * 60n;
    const right = BigInt(timeBase.denominator);
    if (left !== right) fail(`${label} frame ${index} duration is not exactly 1/60 second`);
  }
}

function assertOutputMediaContract(metadata, frames, label) {
  if (metadata.video.codecName !== 'h264'
      || metadata.video.width !== 1920
      || metadata.video.height !== 1080
      || metadata.video.rFrameRate.numerator !== 60
      || metadata.video.rFrameRate.denominator !== 1
      || metadata.audio.codecName !== 'aac'
      || metadata.audio.sampleRateHz !== 44_100
      || metadata.audio.channels !== 2
      || metadata.audio.channelLayout !== 'stereo'
      || metadata.subtitleStreamCount !== 0) {
    fail(`${label} media contract differs from approved H.264/AAC 1920x1080 60fps 44.1kHz stereo`);
  }
  if (metadata.video.reportedFrameCount !== frames.length) {
    fail(`${label} reported frame count differs from decoded frame count`);
  }
  if (metadata.video.startPts !== frames[0].pts) {
    fail(`${label} video start PTS differs from first actual frame PTS`);
  }
  inspectFrameSupport(frames, `${label} video`, {allowDeclaredDurationOverlap: true});
}

function assertSourceMetadataContract(metadata) {
  if (metadata.video.codecName !== 'h264'
      || metadata.video.width !== 1920
      || metadata.video.height !== 1080
      || metadata.video.rFrameRate.numerator !== 60
      || metadata.video.rFrameRate.denominator !== 1
      || metadata.video.timeBase.numerator !== 1
      || metadata.video.timeBase.denominator !== 90_000
      || metadata.audio.codecName !== 'aac'
      || metadata.audio.sampleRateHz !== 44_100
      || metadata.audio.channels !== 2
      || metadata.audio.channelLayout !== 'stereo'
      || metadata.subtitleStreamCount !== 0) {
    fail('source media no longer matches the approved source contract');
  }
}

function assertSourceMediaContract(metadata, frames) {
  assertSourceMetadataContract(metadata);
  if (metadata.video.reportedFrameCount !== frames.length) {
    fail('source reported frame count differs from actual frame count');
  }
  inspectFrameSupport(frames, 'source video');
  assertSixtyFpsFrameDurations(frames, metadata.video.timeBase, 'source video');
  const sourceTimelineEndPts = metadata.video.startPts + metadata.video.durationPts;
  for (const item of CALIBRATION_ITEMS) {
    for (const interval of item.sourceIntervals) {
      const endNumerator = BigInt(interval.sourceEndMs)
        * BigInt(metadata.video.timeBase.denominator);
      const timelineEndNumerator = BigInt(sourceTimelineEndPts) * 1000n
        * BigInt(metadata.video.timeBase.numerator);
      if (endNumerator >= timelineEndNumerator) fail(`${item.itemId} source interval is outside source media`);
    }
  }
}

function parseShowinfoFrames(stderr, label) {
  const text = stderr.toString('utf8');
  const frames = [...text.matchAll(
    /Parsed_showinfo[^\r\n]*?n:\s*(\d+)\s+pts:\s*(-?\d+)[^\r\n]*?duration:\s*(\d+)/gu
  )].map((match, index) => ({
    index: parseIntegerField(match[1], `${label}[${index}].index`, {nonNegative: true}),
    decodedPts: parseIntegerField(match[2], `${label}[${index}].decodedPts`),
    durationPts: parseIntegerField(match[3], `${label}[${index}].durationPts`, {positive: true}),
  }));
  if (frames.length === 0) fail(`${label} showinfo returned no video frames`);
  frames.forEach((frame, index) => {
    if (frame.index !== index) fail(`${label} decoder frame ordinal changed`);
  });
  return frames;
}

async function decodeSourceIntervalFrames(item, interval, sourceContext, ffmpeg) {
  const args = sourceDecodeArguments(interval);
  const result = await runProcess(ffmpeg.realPath, args);
  const decoded = parseShowinfoFrames(
    result.stderr,
    `${item.itemId}/${interval.part} source decode`
  );
  const sourceTimeBase = sourceContext.metadata.video.timeBase;
  const seekNumerator = BigInt(interval.sourceStartMs) * BigInt(sourceTimeBase.denominator);
  const seekDenominator = 1000n * BigInt(sourceTimeBase.numerator);
  if (seekNumerator % seekDenominator !== 0n) {
    fail(`${item.itemId}/${interval.part} seek start is not integral in source time base`);
  }
  const seekStartPtsBigInt = seekNumerator / seekDenominator;
  const seekStartPts = Number(seekStartPtsBigInt);
  requireSafeInteger(seekStartPts, `${item.itemId}/${interval.part} seek start PTS`);
  const selectionEndNumerator = BigInt(interval.sourceEndMs)
    * BigInt(sourceTimeBase.denominator);
  if (selectionEndNumerator % seekDenominator !== 0n) {
    fail(`${item.itemId}/${interval.part} seek end is not integral in source time base`);
  }
  const selectionEndPts = Number(selectionEndNumerator / seekDenominator);
  requireSafeInteger(selectionEndPts, `${item.itemId}/${interval.part} seek end PTS`);
  const frames = decoded.map((frame, index) => {
    const pts = frame.decodedPts;
    requireSafeInteger(pts, `${item.itemId}/${interval.part} absolute source PTS`);
    const actual = sourceContext.frameByPts.get(pts);
    if (!actual || actual.durationPts !== frame.durationPts) {
      fail(`${item.itemId}/${interval.part} decoded frame ${index} is not an exact source frame`);
    }
    return {
      index: actual.index,
      pts,
      durationPts: frame.durationPts,
      decoderIndex: index,
      relativePts: pts - seekStartPts,
    };
  });
  for (let index = 1; index < frames.length; index += 1) {
    if (frames[index].index !== frames[index - 1].index + 1) {
      fail(`${item.itemId}/${interval.part} source frame ordinals are not consecutive`);
    }
  }
  assertSixtyFpsFrameDurations(frames, sourceTimeBase, `${item.itemId}/${interval.part} source`);
  return {
    interval,
    frames,
    selectionStartPts: seekStartPts,
    selectionEndPts,
    decoderFrameTupleSha256: frameTupleSha256(frames.map((frame, index) => ({
      index,
      pts: frame.pts,
      durationPts: frame.durationPts,
    }))),
    relativeFrameTupleSha256: frameTupleSha256(frames.map((frame, index) => ({
      index,
      pts: frame.relativePts,
      durationPts: frame.durationPts,
    }))),
    command: {executable: ffmpeg.realPath, arguments: args},
    process: processEvidence(result),
  };
}

function sourceDecodeArguments(interval) {
  return [
    '-hide_banner', '-nostdin', '-loglevel', 'info',
    '-copyts',
    '-ss', decimalSeconds(interval.sourceStartMs),
    '-to', decimalSeconds(interval.sourceEndMs),
    '-i', SOURCE_VIDEO_RELATIVE_PATH,
    '-map', '0:v:0', '-an',
    '-vf', 'showinfo',
    '-f', 'null', '-',
  ];
}

function exactTimeBasesEqual(left, right) {
  return left.numerator === right.numerator && left.denominator === right.denominator;
}

function assertFrameTimesEqualAcrossBases(
  candidateValue,
  candidateTimeBase,
  sourceValue,
  sourceTimeBase,
  label
) {
  const candidateScaled = BigInt(candidateValue)
    * BigInt(candidateTimeBase.numerator)
    * BigInt(sourceTimeBase.denominator);
  const sourceScaled = BigInt(sourceValue)
    * BigInt(sourceTimeBase.numerator)
    * BigInt(candidateTimeBase.denominator);
  if (candidateScaled !== sourceScaled) fail(`${label} differs across exact time bases`);
}

function frameTimesEqualAcrossBases(candidateValue, candidateTimeBase, sourceValue, sourceTimeBase) {
  return BigInt(candidateValue)
      * BigInt(candidateTimeBase.numerator)
      * BigInt(sourceTimeBase.denominator)
    === BigInt(sourceValue)
      * BigInt(sourceTimeBase.numerator)
      * BigInt(candidateTimeBase.denominator);
}

function derivePiecewiseMapping(item, candidateFrames, candidateTimeBase, sourceParts, sourceTimeBase) {
  const expectedFrameCount = sourceParts.reduce((total, part) => total + part.frames.length, 0);
  if (candidateFrames.length !== expectedFrameCount) {
    fail(`${item.itemId} output frame count differs from both exact source decode lists`);
  }
  const candidateSupport = inspectFrameSupport(
    candidateFrames,
    `${item.itemId} candidate frames`,
    {allowDeclaredDurationOverlap: true}
  );
  const candidateGaps = candidateSupport.gaps;
  const candidateGapByNextFrame = new Map(
    candidateGaps.map((gap) => [gap.nextFrameIndex, gap])
  );
  const segments = [];
  const correspondenceRows = [];
  const rawDurationMismatches = [];
  let candidateOffset = 0;
  for (const [partIndex, sourcePart] of sourceParts.entries()) {
    const sourceFrames = sourcePart.frames;
    if (sourceFrames.length === 0) fail(`${item.itemId} part ${partIndex + 1} has no source frames`);
    const partCandidateFrames = candidateFrames.slice(
      candidateOffset,
      candidateOffset + sourceFrames.length
    );
    const candidateAnchor = partCandidateFrames[0];
    const sourceAnchor = sourceFrames[0];
    let runStart = 0;
    for (let localIndex = 0; localIndex < sourceFrames.length; localIndex += 1) {
      const candidateFrame = partCandidateFrames[localIndex];
      const sourceFrame = sourceFrames[localIndex];
      if (sourceFrame.decoderIndex !== localIndex) {
        fail(`${item.itemId} source decoder ordinal changed inside ${sourcePart.interval.part}`);
      }
      if (localIndex > 0 && sourceFrame.index !== sourceFrames[localIndex - 1].index + 1) {
        fail(`${item.itemId} source global frame order is not consecutive`);
      }
      assertFrameTimesEqualAcrossBases(
        candidateFrame.pts - candidateAnchor.pts,
        candidateTimeBase,
        sourceFrame.pts - sourceAnchor.pts,
        sourceTimeBase,
        `${item.itemId} frame ${candidateFrame.index} relative PTS`
      );
      if (!frameTimesEqualAcrossBases(
        candidateFrame.durationPts,
        candidateTimeBase,
        sourceFrame.durationPts,
        sourceTimeBase
      )) {
        const nextCandidateFrame = candidateFrames[candidateFrame.index + 1];
        if (!nextCandidateFrame
            || candidateFrame.pts + candidateFrame.durationPts <= nextCandidateFrame.pts) {
          fail(`${item.itemId} frame ${candidateFrame.index} raw duration differs without an exact declared-duration overlap`);
        }
        rawDurationMismatches.push({
          candidateFrameIndex: candidateFrame.index,
          candidatePts: candidateFrame.pts,
          candidateDeclaredDurationPts: candidateFrame.durationPts,
          nextCandidateFramePts: nextCandidateFrame.pts,
          sourceFrameIndex: sourceFrame.index,
          sourcePts: sourceFrame.pts,
          sourceDurationPts: sourceFrame.durationPts,
        });
      }
      correspondenceRows.push({
        candidateFrameIndex: candidateFrame.index,
        candidatePts: candidateFrame.pts,
        candidateDurationPts: candidateFrame.durationPts,
        sourceFrameIndex: sourceFrame.index,
        sourcePts: sourceFrame.pts,
        sourceDurationPts: sourceFrame.durationPts,
      });

      const globalIndex = candidateOffset + localIndex;
      const gapBefore = candidateGapByNextFrame.get(globalIndex);
      if (gapBefore && localIndex > 0) {
        const previousSource = sourceFrames[localIndex - 1];
        const candidateGapDuration = gapBefore.endPtsExclusive - gapBefore.startPts;
        const sourceGapDuration = sourceFrame.pts
          - (previousSource.pts + previousSource.durationPts);
        assertFrameTimesEqualAcrossBases(
          candidateGapDuration,
          candidateTimeBase,
          sourceGapDuration,
          sourceTimeBase,
          `${item.itemId} internal gap before frame ${globalIndex}`
        );
        appendMappingSegment(
          segments,
          item,
          sourcePart,
          partCandidateFrames,
          sourceFrames,
          candidateOffset,
          runStart,
          localIndex
        );
        runStart = localIndex;
      }
    }
    appendMappingSegment(
      segments,
      item,
      sourcePart,
      partCandidateFrames,
      sourceFrames,
      candidateOffset,
      runStart,
      sourceFrames.length
    );
    candidateOffset += sourceFrames.length;
  }
  const unmappedCandidatePts = candidateGaps.map((gap) => ({
    startPts: gap.startPts,
    endPtsExclusive: gap.endPtsExclusive,
    reason: 'no-candidate-frame',
  }));
  if (rawDurationMismatches.length !== candidateSupport.declaredDurationOverlaps.length
      || rawDurationMismatches.some((mismatch, index) => (
        mismatch.candidateFrameIndex
          !== candidateSupport.declaredDurationOverlaps[index].previousFrameIndex
      ))) {
    fail(`${item.itemId} declared-duration overlaps are not exactly explained by raw duration mismatches`);
  }
  const mapping = {
    candidateTimeBase,
    sourceTimeBase,
    candidateTimelineStartPts: candidateFrames[0].pts,
    candidateTimelineEndPtsExclusive:
      candidateFrames.at(-1).pts + candidateFrames.at(-1).durationPts,
    segments: segments.map((segment, index) => ({
      ...segment,
      segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
    })),
    unmappedCandidatePts,
  };
  validateMappingPayload(mapping, candidateFrames.length);
  return {
    mapping,
    candidateGaps,
    candidateDeclaredDurationOverlaps: candidateSupport.declaredDurationOverlaps,
    rawDurationMismatches,
    allFrameCorrespondenceSha256: correspondenceTupleSha256(correspondenceRows),
    mappedFrameCount: correspondenceRows.length,
  };
}

function appendMappingSegment(
  segments,
  item,
  sourcePart,
  candidateFrames,
  sourceFrames,
  candidateOffset,
  localStart,
  localEndExclusive
) {
  if (localEndExclusive <= localStart) fail(`${item.itemId} attempted to append an empty mapping segment`);
  const firstCandidate = candidateFrames[localStart];
  const lastCandidate = candidateFrames[localEndExclusive - 1];
  const firstSource = sourceFrames[localStart];
  const lastSource = sourceFrames[localEndExclusive - 1];
  segments.push({
    candidateFrameStartIndex: candidateOffset + localStart,
    candidateFrameEndIndexExclusive: candidateOffset + localEndExclusive,
    candidateStartPts: firstCandidate.pts,
    candidateEndPtsExclusive: lastCandidate.pts + lastCandidate.durationPts,
    sourceFrameStartIndex: firstSource.index,
    sourceFrameEndIndexExclusive: lastSource.index + 1,
    sourceStartPts: firstSource.pts,
    sourceEndPtsExclusive: lastSource.pts + lastSource.durationPts,
    sourceSelectionStartMs: sourcePart.interval.sourceStartMs,
    sourceSelectionEndMs: sourcePart.interval.sourceEndMs,
  });
}

function validateTimeBase(value, label) {
  assertExactKeys(value, ['numerator', 'denominator'], label);
  requireSafeInteger(value.numerator, `${label}.numerator`, {positive: true});
  requireSafeInteger(value.denominator, `${label}.denominator`, {positive: true});
  const reduced = rationalNumber(value.numerator, value.denominator);
  if (!exactTimeBasesEqual(value, reduced)) fail(`${label} is not reduced`);
}

function validateMappingPayload(mapping, expectedFrameCount) {
  assertExactKeys(mapping, [
    'candidateTimeBase',
    'sourceTimeBase',
    'candidateTimelineStartPts',
    'candidateTimelineEndPtsExclusive',
    'segments',
    'unmappedCandidatePts',
  ], 'mapping payload');
  validateTimeBase(mapping.candidateTimeBase, 'mapping candidate time base');
  validateTimeBase(mapping.sourceTimeBase, 'mapping source time base');
  requireSafeInteger(mapping.candidateTimelineStartPts, 'mapping timeline start');
  requireSafeInteger(mapping.candidateTimelineEndPtsExclusive, 'mapping timeline end', {positive: true});
  if (mapping.candidateTimelineEndPtsExclusive <= mapping.candidateTimelineStartPts) {
    fail('mapping candidate timeline is empty or reversed');
  }
  if (!Array.isArray(mapping.segments) || mapping.segments.length < 2) {
    fail('mapping must retain at least two source segments');
  }
  if (!Array.isArray(mapping.unmappedCandidatePts)) fail('mapping unmapped intervals must be an array');
  let expectedFrameIndex = 0;
  let previousSourceEnd = null;
  const segmentIds = new Set();
  for (const [index, segment] of mapping.segments.entries()) {
    assertExactKeys(segment, [
      'segmentId',
      'candidateFrameStartIndex',
      'candidateFrameEndIndexExclusive',
      'candidateStartPts',
      'candidateEndPtsExclusive',
      'sourceFrameStartIndex',
      'sourceFrameEndIndexExclusive',
      'sourceStartPts',
      'sourceEndPtsExclusive',
      'sourceSelectionStartMs',
      'sourceSelectionEndMs',
    ], `mapping segment ${index}`);
    requireString(segment.segmentId, `mapping segment ${index} ID`, {nonEmpty: true});
    if (segmentIds.has(segment.segmentId)) fail('mapping segment ID is duplicated');
    segmentIds.add(segment.segmentId);
    for (const key of [
      'candidateFrameStartIndex',
      'candidateFrameEndIndexExclusive',
      'candidateStartPts',
      'candidateEndPtsExclusive',
      'sourceFrameStartIndex',
      'sourceFrameEndIndexExclusive',
      'sourceStartPts',
      'sourceEndPtsExclusive',
      'sourceSelectionStartMs',
      'sourceSelectionEndMs',
    ]) requireSafeInteger(segment[key], `mapping segment ${index}.${key}`, {nonNegative: true});
    if (segment.candidateFrameStartIndex !== expectedFrameIndex
        || segment.candidateFrameEndIndexExclusive <= segment.candidateFrameStartIndex
        || segment.candidateEndPtsExclusive <= segment.candidateStartPts
        || segment.sourceFrameEndIndexExclusive <= segment.sourceFrameStartIndex
        || segment.sourceEndPtsExclusive <= segment.sourceStartPts
        || segment.sourceSelectionEndMs <= segment.sourceSelectionStartMs) {
      fail(`mapping segment ${index} has invalid frame, PTS, or selection bounds`);
    }
    if (segment.candidateFrameEndIndexExclusive - segment.candidateFrameStartIndex
        !== segment.sourceFrameEndIndexExclusive - segment.sourceFrameStartIndex) {
      fail(`mapping segment ${index} candidate/source frame counts differ`);
    }
    if (previousSourceEnd !== null && segment.sourceStartPts < previousSourceEnd) {
      fail(`mapping segment ${index} source PTS overlaps or goes backward`);
    }
    expectedFrameIndex = segment.candidateFrameEndIndexExclusive;
    previousSourceEnd = segment.sourceEndPtsExclusive;
  }
  if (expectedFrameIndex !== expectedFrameCount) fail('mapping does not cover every candidate frame');
  for (const [index, interval] of mapping.unmappedCandidatePts.entries()) {
    assertExactKeys(interval, ['startPts', 'endPtsExclusive', 'reason'], `unmapped interval ${index}`);
    requireSafeInteger(interval.startPts, `unmapped interval ${index}.startPts`);
    requireSafeInteger(interval.endPtsExclusive, `unmapped interval ${index}.endPtsExclusive`);
    if (interval.reason !== 'no-candidate-frame'
        || interval.endPtsExclusive <= interval.startPts) {
      fail(`unmapped interval ${index} is invalid`);
    }
  }
  const coverage = [
    ...mapping.segments.map((segment) => ({
      startPts: segment.candidateStartPts,
      endPtsExclusive: segment.candidateEndPtsExclusive,
      kind: 'mapped',
    })),
    ...mapping.unmappedCandidatePts.map((interval) => ({
      startPts: interval.startPts,
      endPtsExclusive: interval.endPtsExclusive,
      kind: 'unmapped',
    })),
  ].sort((left, right) => left.startPts - right.startPts);
  let nextPts = mapping.candidateTimelineStartPts;
  for (const interval of coverage) {
    if (interval.startPts !== nextPts || interval.endPtsExclusive <= interval.startPts) {
      fail('mapped and unmapped coverage has a gap or overlap');
    }
    nextPts = interval.endPtsExclusive;
  }
  if (nextPts !== mapping.candidateTimelineEndPtsExclusive) {
    fail('mapped and unmapped coverage does not reach the candidate timeline end');
  }
}

function projectCandidatePtsInterval(mapping, startPts, endPts) {
  const timelineStart = rationalBigInt(BigInt(mapping.candidateTimelineStartPts));
  const timelineEnd = rationalBigInt(BigInt(mapping.candidateTimelineEndPtsExclusive));
  const start = rationalBigInt(BigInt(startPts.numerator), BigInt(startPts.denominator));
  const end = rationalBigInt(BigInt(endPts.numerator), BigInt(endPts.denominator));
  if (compareRational(start, end) >= 0
      || compareRational(start, timelineStart) < 0
      || compareRational(end, timelineEnd) > 0) {
    fail('projection interval is empty, reversed, or outside the candidate timeline');
  }
  const sourceIntervals = [];
  const unmappedCandidateIntervals = [];
  for (const segment of mapping.segments) {
    const segmentStart = rationalBigInt(BigInt(segment.candidateStartPts));
    const segmentEnd = rationalBigInt(BigInt(segment.candidateEndPtsExclusive));
    const intersectionStart = maxRational(start, segmentStart);
    const intersectionEnd = minRational(end, segmentEnd);
    if (compareRational(intersectionStart, intersectionEnd) >= 0) continue;
    sourceIntervals.push({
      segmentId: segment.segmentId,
      candidateStartPts: rationalToNumbers(intersectionStart),
      candidateEndPtsExclusive: rationalToNumbers(intersectionEnd),
      sourceStartPts: rationalToNumbers(projectPoint(intersectionStart, segment)),
      sourceEndPtsExclusive: rationalToNumbers(projectPoint(intersectionEnd, segment)),
    });
  }
  for (const gap of mapping.unmappedCandidatePts) {
    const gapStart = rationalBigInt(BigInt(gap.startPts));
    const gapEnd = rationalBigInt(BigInt(gap.endPtsExclusive));
    const intersectionStart = maxRational(start, gapStart);
    const intersectionEnd = minRational(end, gapEnd);
    if (compareRational(intersectionStart, intersectionEnd) >= 0) continue;
    unmappedCandidateIntervals.push({
      startPts: rationalToNumbers(intersectionStart),
      endPtsExclusive: rationalToNumbers(intersectionEnd),
      reason: 'no-candidate-frame',
    });
  }
  return {sourceIntervals, unmappedCandidateIntervals};
}

function projectPoint(point, segment) {
  const candidateDuration = BigInt(segment.candidateEndPtsExclusive - segment.candidateStartPts);
  const sourceDuration = BigInt(segment.sourceEndPtsExclusive - segment.sourceStartPts);
  const offsetNumerator = point.numerator
    - BigInt(segment.candidateStartPts) * point.denominator;
  return rationalBigInt(
    BigInt(segment.sourceStartPts) * point.denominator * candidateDuration
      + offsetNumerator * sourceDuration,
    point.denominator * candidateDuration
  );
}

function rationalToNumbers(value) {
  const numerator = Number(value.numerator);
  const denominator = Number(value.denominator);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    fail('projected rational exceeds safe JSON integer range');
  }
  return {numerator, denominator};
}

function verifyRationalProjection(mapping) {
  const spliceFrameIndex = mapping.segments.findIndex((segment, index) => (
    index > 0
    && segment.sourceSelectionStartMs !== mapping.segments[index - 1].sourceSelectionStartMs
  ));
  if (spliceFrameIndex < 1) fail('mapping does not retain two source selections');
  const before = mapping.segments[spliceFrameIndex - 1];
  const after = mapping.segments[spliceFrameIndex];
  const crossing = projectCandidatePtsInterval(
    mapping,
    rationalNumber(before.candidateEndPtsExclusive - 1),
    rationalNumber(after.candidateStartPts + 1)
  );
  if (crossing.sourceIntervals.length !== 2
      || crossing.sourceIntervals[0].segmentId === crossing.sourceIntervals[1].segmentId) {
    fail('splice projection did not remain two source intervals');
  }
  const spliceGap = mapping.unmappedCandidatePts.find((gap) => (
    gap.startPts === before.candidateEndPtsExclusive
    && gap.endPtsExclusive === after.candidateStartPts
  ));
  if (after.candidateStartPts > before.candidateEndPtsExclusive) {
    if (!spliceGap || crossing.unmappedCandidateIntervals.length !== 1) {
      fail('splice gap was not preserved in crossing projection');
    }
    const gapOnly = projectCandidatePtsInterval(
      mapping,
      rationalNumber(spliceGap.startPts),
      rationalNumber(spliceGap.endPtsExclusive)
    );
    if (gapOnly.sourceIntervals.length !== 0
        || gapOnly.unmappedCandidateIntervals.length !== 1) {
      fail('gap-only projection invented a source interval');
    }
  } else if (crossing.unmappedCandidateIntervals.length !== 0) {
    fail('a contiguous splice unexpectedly produced an unmapped interval');
  }
  return true;
}

function summarizeSourcePart(part) {
  const first = part.frames[0];
  const last = part.frames.at(-1);
  return {
    part: part.interval.part,
    sourceSelectionStartMs: part.interval.sourceStartMs,
    sourceSelectionEndMs: part.interval.sourceEndMs,
    sourceSelectionStartPts: part.selectionStartPts,
    sourceSelectionEndPts: part.selectionEndPts,
    decoderFrameCount: part.frames.length,
    sourceFrameStartIndex: first.index,
    sourceFrameEndIndexExclusive: last.index + 1,
    sourceStartPts: first.pts,
    sourceEndPtsExclusive: last.pts + last.durationPts,
    firstFrameStartOffsetFromSelectionStartPts: first.pts - part.selectionStartPts,
    lastFrameStartOffsetFromSelectionEndPts: last.pts - part.selectionEndPts,
    lastFrameEndOffsetFromSelectionEndPts:
      last.pts + last.durationPts - part.selectionEndPts,
    relativeFirstPts: first.relativePts,
    relativeLastPts: last.relativePts,
    lastFrameDurationPts: last.durationPts,
    absoluteFrameTupleSha256: part.decoderFrameTupleSha256,
    relativeFrameTupleSha256: part.relativeFrameTupleSha256,
  };
}

function buildMappingArtifact({
  item,
  generatorSha256,
  sourceSha256,
  candidateSha256,
  candidateMedia,
  candidateFrames,
  sourceMedia,
  sourceParts,
  toolchain,
}) {
  const derived = derivePiecewiseMapping(
    item,
    candidateFrames,
    candidateMedia.video.timeBase,
    sourceParts,
    sourceMedia.video.timeBase
  );
  verifyRationalProjection(derived.mapping);
  const gaps = derived.candidateGaps.map((gap) => ({
    previousFrameIndex: gap.previousFrameIndex,
    nextFrameIndex: gap.nextFrameIndex,
    startPts: gap.startPts,
    endPtsExclusive: gap.endPtsExclusive,
    durationPts: gap.durationPts,
  }));
  const finalPaths = itemPaths(item);
  const artifact = {
    schemaVersion: MAPPING_SCHEMA_VERSION,
    artifactId: `${item.itemId}-exploration-video-source-pts-mapping-v001`,
    candidateId: item.candidateId,
    sourceVideoId: SOURCE_VIDEO_ID,
    evidenceBindings: {
      generatorImplementation: {
        path: GENERATOR_RELATIVE_PATH,
        schemaVersion: GENERATOR_SCHEMA_VERSION,
        fileSha256: generatorSha256,
      },
      candidateVideo: {
        path: finalPaths.video,
        schemaVersion: EXPLORATION_MEDIA_SCHEMA_VERSION,
        fileSha256: candidateSha256,
      },
      sourceVideo: {
        path: SOURCE_VIDEO_RELATIVE_PATH,
        schemaVersion: MEDIA_SCHEMA_VERSION,
        fileSha256: sourceSha256,
      },
    },
    derivation: {
      generationMethod: {
        method: 'two-input-accurate-seek-decode-single-concat-h264-aac-v001',
        fixedSourceIntervals: item.sourceIntervals.map((interval, index) => ({
          order: index + 1,
          part: interval.part,
          sourceStartMs: interval.sourceStartMs,
          sourceEndMs: interval.sourceEndMs,
        })),
        concatFilter: CONCAT_FILTER,
        videoEncoder: 'libx264',
        audioEncoder: 'aac',
        frameRateConversion: 'none',
        crop: 'none',
        subtitles: 'none',
        stylingOrEffects: 'none',
      },
      tools: {
        ffmpeg: normalizeToolBinding(toolchain.ffmpeg),
        ffprobe: normalizeToolBinding(toolchain.ffprobe),
      },
      candidateFrameEvidence: {
        timeBase: candidateMedia.video.timeBase,
        frameCount: candidateFrames.length,
        firstFramePts: candidateFrames[0].pts,
        lastFramePts: candidateFrames.at(-1).pts,
        lastFrameDurationPts: candidateFrames.at(-1).durationPts,
        frameTupleSha256: frameTupleSha256(candidateFrames),
        ptsDiscontinuities: gaps,
        decodedFrameDeclaredDurationOverlaps: derived.candidateDeclaredDurationOverlaps,
        rawDurationCorrespondenceMismatches: derived.rawDurationMismatches,
      },
      sourceFrameEvidence: {
        timeBase: sourceMedia.video.timeBase,
        sourceStreamFrameCount: sourceMedia.video.frameCount,
        sourceStreamFrameTupleSha256: sourceMedia.video.frameTupleSha256,
        parts: sourceParts.map(summarizeSourcePart),
      },
      closure: {
        decodedPartFrameCountSum: sourceParts.reduce(
          (total, part) => total + part.frames.length,
          0
        ),
        candidateFrameCount: candidateFrames.length,
        mappedFrameCount: derived.mappedFrameCount,
        mappedSegmentCount: derived.mapping.segments.length,
        unmappedIntervalCount: derived.mapping.unmappedCandidatePts.length,
        unmappedPtsDuration: derived.mapping.unmappedCandidatePts.reduce(
          (total, gap) => total + gap.endPtsExclusive - gap.startPts,
          0
        ),
        allFrameCorrespondenceSha256: derived.allFrameCorrespondenceSha256,
        allFrameStartPtsRationalCorrespondence: true,
        rawFrameDurationCorrespondence: {
          exactMatchCount: candidateFrames.length - derived.rawDurationMismatches.length,
          declaredDurationOverlapMismatchCount: derived.rawDurationMismatches.length,
          everyMismatchExplicitlyBoundToAdjacentPtsOverlap: true,
        },
        coverageScope: 'actual-video-frame-timeline-from-first-frame-pts-through-last-frame-end',
        fullVideoFrameTimelineMappedOrUnmappedCoverage: true,
        mappedOverlapCount: 0,
        rationalProjectionCheck: 'passed',
      },
    },
    mapping: derived.mapping,
  };
  validateMappingArtifact(artifact, {
    item,
    generatorSha256,
    sourceSha256,
    candidateSha256,
    candidateFrames,
  });
  return artifact;
}

function validateBinding(value, label) {
  assertExactKeys(value, ['path', 'schemaVersion', 'fileSha256'], label);
  requireString(value.path, `${label}.path`, {nonEmpty: true});
  requireString(value.schemaVersion, `${label}.schemaVersion`, {nonEmpty: true});
  if (!/^[a-f0-9]{64}$/u.test(requireString(value.fileSha256, `${label}.fileSha256`))) {
    fail(`${label}.fileSha256 is not SHA-256`);
  }
}

function validateMappingArtifact(artifact, expected) {
  assertExactKeys(artifact, [
    'schemaVersion',
    'artifactId',
    'candidateId',
    'sourceVideoId',
    'evidenceBindings',
    'derivation',
    'mapping',
  ], 'mapping artifact');
  if (artifact.schemaVersion !== MAPPING_SCHEMA_VERSION
      || artifact.artifactId !== `${expected.item.itemId}-exploration-video-source-pts-mapping-v001`
      || artifact.candidateId !== expected.item.candidateId
      || artifact.sourceVideoId !== SOURCE_VIDEO_ID) {
    fail(`${expected.item.itemId} mapping artifact identity changed`);
  }
  assertExactKeys(artifact.evidenceBindings, [
    'generatorImplementation', 'candidateVideo', 'sourceVideo',
  ], 'mapping evidence bindings');
  for (const [key, binding] of Object.entries(artifact.evidenceBindings)) {
    validateBinding(binding, `mapping evidence binding ${key}`);
  }
  const paths = itemPaths(expected.item);
  assert.deepEqual(artifact.evidenceBindings.generatorImplementation, {
    path: GENERATOR_RELATIVE_PATH,
    schemaVersion: GENERATOR_SCHEMA_VERSION,
    fileSha256: expected.generatorSha256,
  });
  assert.deepEqual(artifact.evidenceBindings.candidateVideo, {
    path: paths.video,
    schemaVersion: EXPLORATION_MEDIA_SCHEMA_VERSION,
    fileSha256: expected.candidateSha256,
  });
  assert.deepEqual(artifact.evidenceBindings.sourceVideo, {
    path: SOURCE_VIDEO_RELATIVE_PATH,
    schemaVersion: MEDIA_SCHEMA_VERSION,
    fileSha256: expected.sourceSha256,
  });
  assert.deepEqual(
    artifact.derivation.generationMethod.fixedSourceIntervals,
    expected.item.sourceIntervals.map((interval, index) => ({
      order: index + 1,
      part: interval.part,
      sourceStartMs: interval.sourceStartMs,
      sourceEndMs: interval.sourceEndMs,
    })),
    `${expected.item.itemId} fixed intervals changed in mapping artifact`
  );
  validateMappingPayload(artifact.mapping, expected.candidateFrames.length);
  if (artifact.mapping.candidateTimelineStartPts !== expected.candidateFrames[0].pts
      || artifact.mapping.candidateTimelineEndPtsExclusive
        !== expected.candidateFrames.at(-1).pts + expected.candidateFrames.at(-1).durationPts) {
    fail(`${expected.item.itemId} mapping timeline differs from actual frame PTS`);
  }
  if (artifact.derivation.closure.mappedFrameCount !== expected.candidateFrames.length
      || artifact.derivation.closure.allFrameStartPtsRationalCorrespondence !== true
      || artifact.derivation.closure.rawFrameDurationCorrespondence
        .everyMismatchExplicitlyBoundToAdjacentPtsOverlap !== true
      || artifact.derivation.closure.rawFrameDurationCorrespondence.exactMatchCount
        + artifact.derivation.closure.rawFrameDurationCorrespondence
          .declaredDurationOverlapMismatchCount !== expected.candidateFrames.length
      || artifact.derivation.closure.rawFrameDurationCorrespondence
        .declaredDurationOverlapMismatchCount
          !== artifact.derivation.candidateFrameEvidence.rawDurationCorrespondenceMismatches.length
      || artifact.derivation.closure.coverageScope
        !== 'actual-video-frame-timeline-from-first-frame-pts-through-last-frame-end'
      || artifact.derivation.closure.fullVideoFrameTimelineMappedOrUnmappedCoverage !== true
      || artifact.derivation.closure.mappedOverlapCount !== 0
      || artifact.derivation.closure.rationalProjectionCheck !== 'passed') {
    fail(`${expected.item.itemId} mapping closure is not complete`);
  }
}

function validateCandidateRoot(relativePath) {
  if (relativePath !== OUTPUT_ROOT_RELATIVE_PATH && relativePath !== STAGING_ROOT_RELATIVE_PATH) {
    fail('candidate media root is not the fixed formal or transient staging root');
  }
  absolutePath(relativePath);
  return relativePath;
}

async function buildSourceContext(toolchain) {
  const sourceAbsolutePath = absolutePath(SOURCE_VIDEO_RELATIVE_PATH);
  const [sourceSha256, sourceStat, mediaProbe, packetProbe] = await Promise.all([
    sha256File(sourceAbsolutePath),
    stat(sourceAbsolutePath),
    inspectMedia(SOURCE_VIDEO_RELATIVE_PATH, toolchain.ffprobe),
    probeSourcePackets(SOURCE_VIDEO_RELATIVE_PATH, toolchain.ffprobe),
  ]);
  assertFixedSourceSha(sourceSha256);
  if (sourceStat.size !== mediaProbe.metadata.container.sizeBytesReported) {
    fail('source file byte length differs from ffprobe format size');
  }
  assertSourceMediaContract(mediaProbe.metadata, packetProbe.frames);
  const frameByPts = new Map();
  for (const frame of packetProbe.frames) {
    if (frameByPts.has(frame.pts)) fail('source video packet PTS is duplicated');
    frameByPts.set(frame.pts, frame);
  }
  return {
    sha256: sourceSha256,
    byteLength: sourceStat.size,
    metadata: mediaProbe.metadata,
    frames: packetProbe.frames,
    frameByPts,
    mediaSummary: stableMediaSummary(mediaProbe.metadata, packetProbe.frames),
    commands: {
      mediaProbe: mediaProbe.command,
      packetPtsIndexProbe: packetProbe.command,
    },
    processes: {
      mediaProbe: mediaProbe.process,
      packetPtsIndexProbe: packetProbe.process,
    },
  };
}

function assertFixedSourceSha(value) {
  if (value !== SOURCE_VIDEO_SHA256) fail('source video SHA-256 differs from the fixed source');
}

async function deriveAllArtifacts(candidateRootRelativePath) {
  validateApprovedPathSet();
  validateCandidateRoot(candidateRootRelativePath);
  const toolchain = await resolveToolchain();
  const [generatorSha256, sourceContext] = await Promise.all([
    sha256File(MODULE_ABSOLUTE_PATH),
    buildSourceContext(toolchain),
  ]);

  const intervalCache = new Map();
  async function sourcePartFor(item, interval) {
    const key = `${interval.part}:${interval.sourceStartMs}:${interval.sourceEndMs}`;
    if (!intervalCache.has(key)) {
      intervalCache.set(key, await decodeSourceIntervalFrames(
        item,
        interval,
        sourceContext,
        toolchain.ffmpeg
      ));
    }
    const cached = intervalCache.get(key);
    return {...cached, interval};
  }

  const itemData = [];
  for (const item of CALIBRATION_ITEMS) {
    const paths = itemPaths(item, candidateRootRelativePath);
    const candidateAbsolutePath = absolutePath(paths.video);
    const [candidateSha256, candidateStat, mediaProbe, frameProbe, sourceParts] = await Promise.all([
      sha256File(candidateAbsolutePath),
      stat(candidateAbsolutePath),
      inspectMedia(paths.video, toolchain.ffprobe),
      probeFrames(paths.video, toolchain.ffprobe),
      Promise.all(item.sourceIntervals.map((interval) => sourcePartFor(item, interval))),
    ]);
    if (candidateStat.size !== mediaProbe.metadata.container.sizeBytesReported) {
      fail(`${item.itemId} file byte length differs from ffprobe format size`);
    }
    assertOutputMediaContract(mediaProbe.metadata, frameProbe.frames, item.itemId);
    const candidateMedia = stableMediaSummary(mediaProbe.metadata, frameProbe.frames);
    const artifact = buildMappingArtifact({
      item,
      generatorSha256,
      sourceSha256: sourceContext.sha256,
      candidateSha256,
      candidateMedia,
      candidateFrames: frameProbe.frames,
      sourceMedia: sourceContext.mediaSummary,
      sourceParts,
      toolchain,
    });
    itemData.push({
      item,
      paths,
      candidateSha256,
      candidateByteLength: candidateStat.size,
      candidateMedia,
      candidateFrames: frameProbe.frames,
      sourceParts,
      artifact,
      commands: {
        mediaProbe: mediaProbe.command,
        frameProbe: frameProbe.command,
        sourceDecode: sourceParts.map((part) => part.command),
      },
      processes: {
        mediaProbe: mediaProbe.process,
        frameProbe: frameProbe.process,
        sourceDecode: sourceParts.map((part) => part.process),
      },
    });
  }
  return {toolchain, generatorSha256, sourceContext, itemData};
}

function internalDerivationBundle(derived) {
  return {
    schemaVersion: 'candidate-video-understanding-calibration-exploration-independent-derivation-v001',
    artifacts: derived.itemData.map(({artifact}) => artifact),
  };
}

async function runIndependentDerivation(candidateRootRelativePath) {
  const args = [MODULE_ABSOLUTE_PATH, '--internal-derive-all', candidateRootRelativePath];
  const result = await runProcess(process.execPath, args, {maxOutputBytes: 32 * 1024 * 1024});
  const bundle = parseCanonicalBytes(result.stdout, 'independent derivation bundle');
  assertExactKeys(bundle, ['schemaVersion', 'artifacts'], 'independent derivation bundle');
  if (bundle.schemaVersion
      !== 'candidate-video-understanding-calibration-exploration-independent-derivation-v001'
      || !Array.isArray(bundle.artifacts)
      || bundle.artifacts.length !== CALIBRATION_ITEMS.length) {
    fail('independent derivation bundle is malformed');
  }
  return {bundle, command: {executable: process.execPath, arguments: args}, process: processEvidence(result)};
}

async function decodeEntireMedia(relativePath, ffmpeg) {
  const args = fullDecodeArguments(relativePath);
  const result = await runProcess(ffmpeg.realPath, args);
  return {
    command: {executable: ffmpeg.realPath, arguments: args},
    process: processEvidence(result),
  };
}

function fullDecodeArguments(relativePath) {
  return [
    '-hide_banner', '-nostdin', '-v', 'error', '-xerror',
    '-i', relativePath,
    '-map', '0:v:0', '-map', '0:a:0',
    '-f', 'null', '-',
  ];
}

function assertCleanDecodeEvidence(decodeCheck, label) {
  if (decodeCheck.process.exitCode !== 0
      || decodeCheck.process.signal !== null
      || decodeCheck.process.stdoutByteLength !== 0
      || decodeCheck.process.stderrByteLength !== 0) {
    fail(`${label} did not complete as a clean full video/audio decode`);
  }
}

function fullToolRecord(tool) {
  return {
    name: tool.name,
    lookupPath: tool.lookupPath,
    realPath: tool.realPath,
    binarySha256: tool.binarySha256,
    versionFirstLine: tool.versionFirstLine,
    versionOutputSha256: tool.versionOutputSha256,
    versionOutput: tool.versionOutput,
  };
}

function mappingSummary(artifact, mappingFileSha256) {
  const mapping = artifact.mapping;
  return {
    coverageScope: 'actual-video-frame-timeline-from-first-frame-pts-through-last-frame-end',
    candidateTimelineStartPts: mapping.candidateTimelineStartPts,
    candidateTimelineEndPtsExclusive: mapping.candidateTimelineEndPtsExclusive,
    segmentCount: mapping.segments.length,
    mappedFrameCount: mapping.segments.reduce(
      (total, segment) => total
        + segment.candidateFrameEndIndexExclusive
        - segment.candidateFrameStartIndex,
      0
    ),
    mappedCandidatePtsDuration: mapping.segments.reduce(
      (total, segment) => total + segment.candidateEndPtsExclusive - segment.candidateStartPts,
      0
    ),
    unmappedCandidatePtsCount: mapping.unmappedCandidatePts.length,
    unmappedCandidatePtsDuration: mapping.unmappedCandidatePts.reduce(
      (total, gap) => total + gap.endPtsExclusive - gap.startPts,
      0
    ),
    unmappedCandidatePts: mapping.unmappedCandidatePts,
    mappingArtifactSha256: mappingFileSha256,
  };
}

function fixedSourceIntervals(item) {
  return item.sourceIntervals.map((interval, index) => ({
    order: index + 1,
    part: interval.part,
    sourceStartMs: interval.sourceStartMs,
    sourceEndMs: interval.sourceEndMs,
  }));
}

function buildRecord({
  derived,
  itemData,
  generation,
  decodeCheck,
  mappingBytes,
  independentMappingBytes,
  independentDerivation,
}) {
  const item = itemData.item;
  const formalPaths = itemPaths(item);
  const generatorBinding = {
    path: GENERATOR_RELATIVE_PATH,
    schemaVersion: GENERATOR_SCHEMA_VERSION,
    fileSha256: derived.generatorSha256,
  };
  const sourceBinding = {
    path: SOURCE_VIDEO_RELATIVE_PATH,
    schemaVersion: MEDIA_SCHEMA_VERSION,
    fileSha256: derived.sourceContext.sha256,
    byteLength: derived.sourceContext.byteLength,
  };
  const videoBinding = {
    path: formalPaths.video,
    schemaVersion: EXPLORATION_MEDIA_SCHEMA_VERSION,
    fileSha256: itemData.candidateSha256,
    byteLength: itemData.candidateByteLength,
  };
  const mappingSha256 = sha256Bytes(mappingBytes);
  const mappingBinding = {
    path: formalPaths.mapping,
    schemaVersion: MAPPING_SCHEMA_VERSION,
    fileSha256: mappingSha256,
    byteLength: mappingBytes.length,
  };
  const checks = {
    sourceShaExact: true,
    sourceIntervalsExact: true,
    sourceIntervalOrderExact: true,
    explorationVideoCreated: true,
    videoStreamPresent: true,
    audioStreamPresent: true,
    frameCountObserved: true,
    durationObserved: true,
    candidatePtsMonotonic: true,
    sourceDecodeFramePtsCorrespondenceExact: true,
    mappingFullCoverage: true,
    mappedNoOverlap: true,
    unmappedExplicit: true,
    spliceBoundaryExact: true,
    rationalSourceProjectionExact: true,
    mappingRegenerationBytesIdentical: mappingBytes.equals(independentMappingBytes),
    outputWasNotOverwritten: true,
    fullVideoAndAudioDecodeSucceeded:
      decodeCheck.process.exitCode === 0
      && decodeCheck.process.signal === null
      && decodeCheck.process.stdoutByteLength === 0
      && decodeCheck.process.stderrByteLength === 0,
    noFpsCropSubtitleStyleOrEffectTransform: true,
    noProviderOrHumanEvaluationIo: true,
  };
  if (Object.values(checks).some((value) => value !== true)) {
    fail(`${item.itemId} cannot be sealed because a required check did not pass`);
  }
  const record = {
    schemaVersion: BUILD_RECORD_SCHEMA_VERSION,
    status: 'passed',
    recordId: `${item.itemId}-candidate-video-understanding-calibration-exploration-build-v001`,
    generatedAt: new Date().toISOString(),
    itemId: item.itemId,
    candidateId: item.candidateId,
    sourceVideoId: SOURCE_VIDEO_ID,
    purpose: 'calibration exploration media with exact source PTS mapping; provider transport is out of scope',
    bindings: {
      generatorImplementation: generatorBinding,
      sourceVideo: sourceBinding,
      explorationVideo: videoBinding,
      sourceMappingArtifact: mappingBinding,
    },
    fixedSourceIntervals: fixedSourceIntervals(item),
    sourceMedia: derived.sourceContext.mediaSummary,
    explorationMedia: itemData.candidateMedia,
    generation: {
      workingDirectory: WORKSPACE_ROOT,
      ffmpeg: generation.ffmpeg,
      exactArguments: generation.arguments,
      concatFilter: CONCAT_FILTER,
      process: generation.process,
    },
    mappingDerivation: {
      ffprobe: fullToolRecord(derived.toolchain.ffprobe),
      sourceMediaProbe: derived.sourceContext.commands.mediaProbe,
      sourcePacketPtsIndexProbe: derived.sourceContext.commands.packetPtsIndexProbe,
      explorationMediaProbe: itemData.commands.mediaProbe,
      explorationFrameProbe: itemData.commands.frameProbe,
      sourceDecodeFrameProbes: itemData.commands.sourceDecode,
      independentRegenerationCommand: independentDerivation.command,
    },
    mappingSummary: mappingSummary(itemData.artifact, mappingSha256),
    mappingRegenerationProof: {
      status: 'passed',
      storedFileSha256: mappingSha256,
      storedByteLength: mappingBytes.length,
      independentlyRegeneratedFileSha256: sha256Bytes(independentMappingBytes),
      independentlyRegeneratedByteLength: independentMappingBytes.length,
      byteIdentical: mappingBytes.equals(independentMappingBytes),
      independentProcess: independentDerivation.process,
    },
    technicalDecodeVerification: decodeCheck,
    checks,
    prohibitedOperationObservations: {
      geminiApiCommunications: 0,
      filesApiCommunications: 0,
      countTokensCommunications: 0,
      webGeminiCommunications: 0,
      lunaOrOpenAiCommunications: 0,
      humanReviewArtifactsRead: 0,
    },
  };
  validateBuildRecord(record, {
    itemData,
    derived,
    mappingBytes,
    independentMappingBytes,
    generation,
  });
  return record;
}

function validateBuildRecord(record, expected) {
  assertExactKeys(record, [
    'schemaVersion', 'status', 'recordId', 'generatedAt', 'itemId', 'candidateId',
    'sourceVideoId', 'purpose', 'bindings', 'fixedSourceIntervals', 'sourceMedia',
    'explorationMedia', 'generation', 'mappingDerivation', 'mappingSummary',
    'mappingRegenerationProof', 'technicalDecodeVerification', 'checks',
    'prohibitedOperationObservations',
  ], 'build-and-verification record');
  const item = expected.itemData.item;
  if (record.schemaVersion !== BUILD_RECORD_SCHEMA_VERSION
      || record.status !== 'passed'
      || record.recordId
        !== `${item.itemId}-candidate-video-understanding-calibration-exploration-build-v001`
      || record.itemId !== item.itemId
      || record.candidateId !== item.candidateId
      || record.sourceVideoId !== SOURCE_VIDEO_ID
      || Number.isNaN(Date.parse(record.generatedAt))) {
    fail(`${item.itemId} build record identity or status is invalid`);
  }
  if (record.purpose
      !== 'calibration exploration media with exact source PTS mapping; provider transport is out of scope') {
    fail(`${item.itemId} build record purpose changed`);
  }
  assertExactKeys(record.bindings, [
    'generatorImplementation', 'sourceVideo', 'explorationVideo', 'sourceMappingArtifact',
  ], `${item.itemId} bindings`);
  assertExactKeys(record.generation, [
    'workingDirectory', 'ffmpeg', 'exactArguments', 'concatFilter', 'process',
  ], `${item.itemId} generation`);
  assertExactKeys(record.mappingDerivation, [
    'ffprobe', 'sourceMediaProbe', 'sourcePacketPtsIndexProbe',
    'explorationMediaProbe', 'explorationFrameProbe', 'sourceDecodeFrameProbes',
    'independentRegenerationCommand',
  ], `${item.itemId} mapping derivation`);
  assertExactKeys(record.mappingRegenerationProof, [
    'status', 'storedFileSha256', 'storedByteLength',
    'independentlyRegeneratedFileSha256', 'independentlyRegeneratedByteLength',
    'byteIdentical', 'independentProcess',
  ], `${item.itemId} mapping regeneration proof`);
  assertExactKeys(record.technicalDecodeVerification, ['command', 'process'], `${item.itemId} decode`);
  validateProcessEvidence(record.generation.process, `${item.itemId} generation process`);
  validateProcessEvidence(
    record.mappingRegenerationProof.independentProcess,
    `${item.itemId} independent mapping process`
  );
  validateProcessEvidence(
    record.technicalDecodeVerification.process,
    `${item.itemId} full decode process`
  );
  assert.deepEqual(record.fixedSourceIntervals, fixedSourceIntervals(item));
  assert.deepEqual(record.sourceMedia, expected.derived.sourceContext.mediaSummary);
  assert.deepEqual(record.explorationMedia, expected.itemData.candidateMedia);
  const formalPaths = itemPaths(item);
  assert.deepEqual(record.bindings.generatorImplementation, {
    path: GENERATOR_RELATIVE_PATH,
    schemaVersion: GENERATOR_SCHEMA_VERSION,
    fileSha256: expected.derived.generatorSha256,
  });
  assert.deepEqual(record.bindings.sourceVideo, {
    path: SOURCE_VIDEO_RELATIVE_PATH,
    schemaVersion: MEDIA_SCHEMA_VERSION,
    fileSha256: expected.derived.sourceContext.sha256,
    byteLength: expected.derived.sourceContext.byteLength,
  });
  assert.deepEqual(record.bindings.explorationVideo, {
    path: formalPaths.video,
    schemaVersion: EXPLORATION_MEDIA_SCHEMA_VERSION,
    fileSha256: expected.itemData.candidateSha256,
    byteLength: expected.itemData.candidateByteLength,
  });
  assert.deepEqual(record.bindings.sourceMappingArtifact, {
    path: formalPaths.mapping,
    schemaVersion: MAPPING_SCHEMA_VERSION,
    fileSha256: sha256Bytes(expected.mappingBytes),
    byteLength: expected.mappingBytes.length,
  });
  assert.deepEqual(
    record.mappingSummary,
    mappingSummary(expected.itemData.artifact, sha256Bytes(expected.mappingBytes)),
    `${item.itemId} mapping summary differs from the current artifact`
  );
  if (record.generation.workingDirectory !== WORKSPACE_ROOT
      || canonicalSha256(record.generation.ffmpeg)
        !== canonicalSha256(expected.generation.ffmpeg)
      || canonicalSha256(record.generation.ffmpeg)
        !== canonicalSha256(fullToolRecord(expected.derived.toolchain.ffmpeg))
      || canonicalSha256(record.mappingDerivation.ffprobe)
        !== canonicalSha256(fullToolRecord(expected.derived.toolchain.ffprobe))
      || canonicalSha256(record.generation.exactArguments)
        !== canonicalSha256(expected.generation.arguments)
      || record.generation.concatFilter !== CONCAT_FILTER
      || record.generation.process.exitCode !== 0) {
    fail(`${item.itemId} build record toolchain or exact generation command differs`);
  }
  const stagingVideoPath = itemPaths(item, STAGING_ROOT_RELATIVE_PATH).video;
  assert.deepEqual(record.mappingDerivation.sourceMediaProbe, {
    executable: expected.derived.toolchain.ffprobe.realPath,
    arguments: mediaProbeArguments(SOURCE_VIDEO_RELATIVE_PATH),
  });
  assert.deepEqual(record.mappingDerivation.sourcePacketPtsIndexProbe, {
    executable: expected.derived.toolchain.ffprobe.realPath,
    arguments: sourcePacketProbeArguments(SOURCE_VIDEO_RELATIVE_PATH),
  });
  assert.deepEqual(record.mappingDerivation.explorationMediaProbe, {
    executable: expected.derived.toolchain.ffprobe.realPath,
    arguments: mediaProbeArguments(stagingVideoPath),
  });
  assert.deepEqual(record.mappingDerivation.explorationFrameProbe, {
    executable: expected.derived.toolchain.ffprobe.realPath,
    arguments: frameProbeArguments(stagingVideoPath),
  });
  assert.deepEqual(
    record.mappingDerivation.sourceDecodeFrameProbes,
    item.sourceIntervals.map((interval) => ({
      executable: expected.derived.toolchain.ffmpeg.realPath,
      arguments: sourceDecodeArguments(interval),
    }))
  );
  assert.deepEqual(record.mappingDerivation.independentRegenerationCommand, {
    executable: process.execPath,
    arguments: [MODULE_ABSOLUTE_PATH, '--internal-derive-all', STAGING_ROOT_RELATIVE_PATH],
  });
  validateGenerationArguments(
    item,
    itemPaths(item, STAGING_ROOT_RELATIVE_PATH).video,
    record.generation.exactArguments
  );
  if (record.mappingRegenerationProof.status !== 'passed'
      || record.mappingRegenerationProof.storedFileSha256 !== sha256Bytes(expected.mappingBytes)
      || record.mappingRegenerationProof.storedByteLength !== expected.mappingBytes.length
      || record.mappingRegenerationProof.independentlyRegeneratedFileSha256
        !== sha256Bytes(expected.independentMappingBytes)
      || record.mappingRegenerationProof.independentlyRegeneratedByteLength
        !== expected.independentMappingBytes.length
      || record.mappingRegenerationProof.byteIdentical !== true
      || !expected.mappingBytes.equals(expected.independentMappingBytes)) {
    fail(`${item.itemId} mapping regeneration proof is invalid`);
  }
  assert.deepEqual(record.technicalDecodeVerification.command, {
    executable: expected.derived.toolchain.ffmpeg.realPath,
    arguments: fullDecodeArguments(itemPaths(item, STAGING_ROOT_RELATIVE_PATH).video),
  });
  assertCleanDecodeEvidence(
    record.technicalDecodeVerification,
    `${item.itemId} stored full video/audio decode`
  );
  const expectedCheckKeys = [
    'sourceShaExact',
    'sourceIntervalsExact',
    'sourceIntervalOrderExact',
    'explorationVideoCreated',
    'videoStreamPresent',
    'audioStreamPresent',
    'frameCountObserved',
    'durationObserved',
    'candidatePtsMonotonic',
    'sourceDecodeFramePtsCorrespondenceExact',
    'mappingFullCoverage',
    'mappedNoOverlap',
    'unmappedExplicit',
    'spliceBoundaryExact',
    'rationalSourceProjectionExact',
    'mappingRegenerationBytesIdentical',
    'outputWasNotOverwritten',
    'fullVideoAndAudioDecodeSucceeded',
    'noFpsCropSubtitleStyleOrEffectTransform',
    'noProviderOrHumanEvaluationIo',
  ];
  assertExactKeys(record.checks, expectedCheckKeys, `${item.itemId} checks`);
  if (Object.values(record.checks).some((value) => value !== true)) {
    fail(`${item.itemId} build record contains a non-passing check`);
  }
  assert.deepEqual(record.prohibitedOperationObservations, {
    geminiApiCommunications: 0,
    filesApiCommunications: 0,
    countTokensCommunications: 0,
    webGeminiCommunications: 0,
    lunaOrOpenAiCommunications: 0,
    humanReviewArtifactsRead: 0,
  });
}

function validateProcessEvidence(value, label) {
  assertExactKeys(value, [
    'exitCode', 'signal', 'stdoutByteLength', 'stdoutSha256',
    'stderrByteLength', 'stderrSha256', 'elapsedMilliseconds',
  ], label);
  if (value.exitCode !== 0 || value.signal !== null) fail(`${label} did not exit cleanly`);
  requireSafeInteger(value.stdoutByteLength, `${label}.stdoutByteLength`, {nonNegative: true});
  requireSafeInteger(value.stderrByteLength, `${label}.stderrByteLength`, {nonNegative: true});
  requireSafeInteger(value.elapsedMilliseconds, `${label}.elapsedMilliseconds`, {nonNegative: true});
  for (const key of ['stdoutSha256', 'stderrSha256']) {
    if (!/^[a-f0-9]{64}$/u.test(requireString(value[key], `${label}.${key}`))) {
      fail(`${label}.${key} is not SHA-256`);
    }
  }
  if ((value.stdoutByteLength === 0 && value.stdoutSha256 !== EMPTY_SHA256)
      || (value.stderrByteLength === 0 && value.stderrSha256 !== EMPTY_SHA256)) {
    fail(`${label} empty output SHA-256 is inconsistent`);
  }
}

async function assertOutputDestinationsAbsent() {
  await assertPathAbsent(absolutePath(OUTPUT_ROOT_RELATIVE_PATH), 'formal output root');
  await assertPathAbsent(absolutePath(STAGING_ROOT_RELATIVE_PATH), 'transient staging root');
  for (const relativePath of expectedFormalArtifactPaths()) {
    await assertPathAbsent(absolutePath(relativePath), `formal output ${relativePath}`);
  }
}

async function runPreflight() {
  validateApprovedPathSet();
  await assertOutputDestinationsAbsent();
  const toolchain = await resolveToolchain();
  const sourceAbsolutePath = absolutePath(SOURCE_VIDEO_RELATIVE_PATH);
  const [sourceSha256, sourceStat, sourceProbe] = await Promise.all([
    sha256File(sourceAbsolutePath),
    stat(sourceAbsolutePath),
    inspectMedia(SOURCE_VIDEO_RELATIVE_PATH, toolchain.ffprobe),
  ]);
  assertFixedSourceSha(sourceSha256);
  assertSourceMetadataContract(sourceProbe.metadata);
  if (sourceStat.size !== sourceProbe.metadata.container.sizeBytesReported) {
    fail('source file byte length differs from ffprobe at preflight');
  }
  for (const item of CALIBRATION_ITEMS) {
    validateGenerationArguments(
      item,
      itemPaths(item, STAGING_ROOT_RELATIVE_PATH).video,
      generationArguments(item, itemPaths(item, STAGING_ROOT_RELATIVE_PATH).video)
    );
  }
  return {
    schemaVersion: 'candidate-video-understanding-calibration-exploration-preflight-v001',
    status: 'passed',
    approvedFormalPathCount: 16,
    generatedMediaCount: 5,
    fixedSourceSelectionTotalMilliseconds: EXPECTED_TOTAL_SELECTION_DURATION_MS,
    sourceVideo: {
      path: SOURCE_VIDEO_RELATIVE_PATH,
      fileSha256: sourceSha256,
      byteLength: sourceStat.size,
    },
    tools: {
      ffmpeg: normalizeToolBinding(toolchain.ffmpeg),
      ffprobe: normalizeToolBinding(toolchain.ffprobe),
    },
    outputCollisionCount: 0,
    providerCommunications: 0,
    humanEvaluationArtifactReads: 0,
  };
}

async function walkFiles(rootAbsolutePath) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, {withFileTypes: true});
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(entryPath);
      else if (entry.isFile()) files.push(toRepoPath(path.relative(rootAbsolutePath, entryPath)));
      else fail(`unexpected non-file entry in artifact root: ${entryPath}`);
    }
  }
  await visit(rootAbsolutePath);
  return files;
}

async function assertArtifactRootInventory(rootRelativePath) {
  const actual = await walkFiles(absolutePath(rootRelativePath));
  const expected = CALIBRATION_ITEMS.flatMap((item) => [
    `${item.itemId}/${BUILD_RECORD_FILE_NAME}`,
    `${item.itemId}/${EXPLORATION_VIDEO_FILE_NAME}`,
    `${item.itemId}/${MAPPING_FILE_NAME}`,
  ]).sort();
  assert.deepEqual(actual, expected, `${rootRelativePath} artifact inventory changed`);
}

async function readCanonicalFile(relativePath, label) {
  return parseCanonicalBytes(await readFile(absolutePath(relativePath)), label);
}

async function verifyStoredRoot(rootRelativePath, {emitProgress = false} = {}) {
  validateCandidateRoot(rootRelativePath);
  await assertArtifactRootInventory(rootRelativePath);
  const derived = await deriveAllArtifacts(rootRelativePath);
  const summaries = [];
  for (const itemData of derived.itemData) {
    if (emitProgress) process.stderr.write(`verify ${itemData.item.itemId}: mapping and full decode\n`);
    const rootPaths = itemPaths(itemData.item, rootRelativePath);
    const formalPaths = itemPaths(itemData.item);
    const [mappingRawBytes, record, decodeCheck] = await Promise.all([
      readFile(absolutePath(rootPaths.mapping)),
      readCanonicalFile(rootPaths.record, `${itemData.item.itemId} build record`),
      decodeEntireMedia(rootPaths.video, derived.toolchain.ffmpeg),
    ]);
    const storedMapping = parseCanonicalBytes(
      mappingRawBytes,
      `${itemData.item.itemId} mapping artifact`
    );
    const independentlyDerivedBytes = canonicalBytes(itemData.artifact);
    if (!mappingRawBytes.equals(independentlyDerivedBytes)
        || canonicalSha256(storedMapping) !== canonicalSha256(itemData.artifact)) {
      fail(`${itemData.item.itemId} stored mapping is not byte-identical to fresh derivation`);
    }
    validateMappingArtifact(storedMapping, {
      item: itemData.item,
      generatorSha256: derived.generatorSha256,
      sourceSha256: derived.sourceContext.sha256,
      candidateSha256: itemData.candidateSha256,
      candidateFrames: itemData.candidateFrames,
    });
    validateBuildRecord(record, {
      itemData,
      derived,
      mappingBytes: mappingRawBytes,
      independentMappingBytes: independentlyDerivedBytes,
      generation: {
        arguments: record.generation.exactArguments,
        process: record.generation.process,
        ffmpeg: record.generation.ffmpeg,
      },
    });
    assertCleanDecodeEvidence(decodeCheck, `${itemData.item.itemId} fresh full decode`);
    if (record.bindings.explorationVideo.path !== formalPaths.video
        || record.bindings.sourceMappingArtifact.path !== formalPaths.mapping) {
      fail(`${itemData.item.itemId} stored bindings are not formal paths`);
    }
    summaries.push({
      itemId: itemData.item.itemId,
      candidateId: itemData.item.candidateId,
      videoPath: formalPaths.video,
      videoSha256: itemData.candidateSha256,
      videoByteLength: itemData.candidateByteLength,
      containerDurationSeconds: itemData.candidateMedia.container.durationSeconds,
      videoTimelineDurationSeconds: itemData.candidateMedia.video.actualFrameTimelineDurationSeconds,
      videoFrameCount: itemData.candidateFrames.length,
      videoCodec: itemData.candidateMedia.video.codecName,
      audioCodec: itemData.candidateMedia.audio.codecName,
      videoTimeBase: itemData.candidateMedia.video.timeBase,
      audioTimeBase: itemData.candidateMedia.audio.timeBase,
      mappingPath: formalPaths.mapping,
      mappingSha256: sha256Bytes(mappingRawBytes),
      mappingSegmentCount: storedMapping.mapping.segments.length,
      unmappedCandidatePts: storedMapping.mapping.unmappedCandidatePts,
      status: 'passed',
    });
  }
  return {
    schemaVersion: 'candidate-video-understanding-calibration-exploration-verification-summary-v001',
    status: 'passed',
    formalPathCount: 16,
    mediaAndMappingItemsPassed: summaries.length,
    sourceVideoSha256: derived.sourceContext.sha256,
    generatorSha256: derived.generatorSha256,
    items: summaries,
    apiCommunications: 0,
    humanEvaluationArtifactReads: 0,
  };
}

async function materialize() {
  await selfTest();
  const preflight = await runPreflight();
  const stagingAbsolutePath = absolutePath(STAGING_ROOT_RELATIVE_PATH);
  const formalAbsolutePath = absolutePath(OUTPUT_ROOT_RELATIVE_PATH);
  let stagingCreatedByThisRun = false;
  let renamedToFormal = false;
  let published = false;
  try {
    await mkdir(stagingAbsolutePath, {recursive: false});
    stagingCreatedByThisRun = true;
    for (const item of CALIBRATION_ITEMS) {
      await mkdir(absolutePath(itemPaths(item, STAGING_ROOT_RELATIVE_PATH).itemRoot), {
        recursive: false,
      });
    }
    const toolchain = await resolveToolchain();
    const generationByItem = new Map();
    for (const item of CALIBRATION_ITEMS) {
      const outputPath = itemPaths(item, STAGING_ROOT_RELATIVE_PATH).video;
      const args = generationArguments(item, outputPath);
      validateGenerationArguments(item, outputPath, args);
      await assertPathAbsent(absolutePath(outputPath), `${item.itemId} staging video`);
      process.stderr.write(`generate ${item.itemId}: approved two-part concat\n`);
      const result = await runProcess(toolchain.ffmpeg.realPath, args);
      if (!(await pathExists(absolutePath(outputPath)))) {
        fail(`${item.itemId} FFmpeg exited successfully without creating its video`);
      }
      generationByItem.set(item.itemId, {
        executable: toolchain.ffmpeg.realPath,
        arguments: args,
        process: processEvidence(result),
        ffmpeg: fullToolRecord(toolchain.ffmpeg),
      });
    }

    process.stderr.write('derive mappings: first complete source/candidate evidence pass\n');
    const derived = await deriveAllArtifacts(STAGING_ROOT_RELATIVE_PATH);
    process.stderr.write('derive mappings: independent fresh-process regeneration pass\n');
    const independent = await runIndependentDerivation(STAGING_ROOT_RELATIVE_PATH);
    for (const [index, itemData] of derived.itemData.entries()) {
      const independentArtifact = independent.bundle.artifacts[index];
      if (independentArtifact?.artifactId !== itemData.artifact.artifactId) {
        fail(`${itemData.item.itemId} independent artifact order or identity changed`);
      }
      const mappingBytes = canonicalBytes(itemData.artifact);
      const independentMappingBytes = canonicalBytes(independentArtifact);
      if (!mappingBytes.equals(independentMappingBytes)) {
        fail(`${itemData.item.itemId} mapping regeneration bytes differ`);
      }
      await writeFile(
        absolutePath(itemData.paths.mapping),
        mappingBytes,
        {flag: 'wx'}
      );
    }

    for (const [index, itemData] of derived.itemData.entries()) {
      process.stderr.write(`seal ${itemData.item.itemId}: full video/audio decode and record\n`);
      const independentArtifact = independent.bundle.artifacts[index];
      const mappingBytes = canonicalBytes(itemData.artifact);
      const independentMappingBytes = canonicalBytes(independentArtifact);
      const decodeCheck = await decodeEntireMedia(itemData.paths.video, derived.toolchain.ffmpeg);
      assertCleanDecodeEvidence(decodeCheck, `${itemData.item.itemId} sealing decode`);
      const generation = generationByItem.get(itemData.item.itemId);
      if (!generation) fail(`${itemData.item.itemId} generation evidence is missing`);
      const record = buildRecord({
        derived,
        itemData,
        generation,
        decodeCheck,
        mappingBytes,
        independentMappingBytes,
        independentDerivation: independent,
      });
      await writeFile(
        absolutePath(itemData.paths.record),
        canonicalBytes(record),
        {flag: 'wx'}
      );
    }

    await assertArtifactRootInventory(STAGING_ROOT_RELATIVE_PATH);
    process.stderr.write('verify staging root completely before formal publication\n');
    await verifyStoredRoot(STAGING_ROOT_RELATIVE_PATH, {emitProgress: true});
    await assertPathAbsent(formalAbsolutePath, 'formal output root at publication');
    await rename(stagingAbsolutePath, formalAbsolutePath);
    renamedToFormal = true;
    process.stderr.write('published all five items atomically; running fresh read-only verification\n');
    let verification;
    try {
      verification = await verifyStoredRoot(OUTPUT_ROOT_RELATIVE_PATH, {emitProgress: true});
      published = true;
    } catch (error) {
      if (await pathExists(formalAbsolutePath) && !(await pathExists(stagingAbsolutePath))) {
        await rename(formalAbsolutePath, stagingAbsolutePath);
        renamedToFormal = false;
        process.stderr.write('post-publication verification failed; reverted this run to transient staging\n');
      }
      throw error;
    }
    return {preflight, verification};
  } finally {
    if (stagingCreatedByThisRun && !published && await pathExists(stagingAbsolutePath)) {
      await rm(stagingAbsolutePath, {recursive: true, force: false});
    }
    if (!published && renamedToFormal) {
      process.stderr.write('formal root is retained because safe rollback could not be proven\n');
    }
  }
}

function expectFailure(operation, expectedPattern) {
  let error = null;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }
  if (!(error instanceof Error) || !expectedPattern.test(error.message)) {
    fail(`negative self-test did not fail as expected: ${expectedPattern}`);
  }
}

async function expectFailureAsync(operation, expectedPattern) {
  let error = null;
  try {
    await operation();
  } catch (caught) {
    error = caught;
  }
  if (!(error instanceof Error) || !expectedPattern.test(error.message)) {
    fail(`async negative self-test did not fail as expected: ${expectedPattern}`);
  }
}

function syntheticPart(interval, frames) {
  return {
    interval,
    frames: frames.map((frame, decoderIndex) => ({...frame, decoderIndex, relativePts: frame.pts})),
  };
}

function syntheticMappingFixture() {
  const item = {
    itemId: 'synthetic-item',
    sourceIntervals: [
      {part: 'first', sourceStartMs: 1000, sourceEndMs: 1020},
      {part: 'second', sourceStartMs: 5000, sourceEndMs: 5020},
    ],
  };
  const candidateFrames = [
    {index: 0, pts: 0, durationPts: 10},
    {index: 1, pts: 10, durationPts: 10},
    {index: 2, pts: 30, durationPts: 10},
    {index: 3, pts: 40, durationPts: 10},
  ];
  const sourceParts = [
    syntheticPart(item.sourceIntervals[0], [
      {index: 100, pts: 100, durationPts: 10},
      {index: 101, pts: 110, durationPts: 10},
    ]),
    syntheticPart(item.sourceIntervals[1], [
      {index: 500, pts: 500, durationPts: 10},
      {index: 501, pts: 510, durationPts: 10},
    ]),
  ];
  return {
    item,
    candidateFrames,
    sourceParts,
    timeBase: {numerator: 1, denominator: 100},
  };
}

async function selfTest() {
  validateApprovedPathSet();
  assert.equal(
    canonicalBytes({b: 1, a: 2}).toString('utf8'),
    '{"a":2,"b":1}\n',
    'canonical JSON sorting changed'
  );
  const manifestOneMillisecondEarly = expectedManifest();
  manifestOneMillisecondEarly[0].sourceIntervals[0].sourceStartMs -= 1;
  expectFailure(() => validateManifest(manifestOneMillisecondEarly), /manifest changed/u);
  const manifestOneMillisecondLate = expectedManifest();
  manifestOneMillisecondLate[4].sourceIntervals[1].sourceEndMs += 1;
  expectFailure(() => validateManifest(manifestOneMillisecondLate), /manifest changed/u);
  const reordered = expectedManifest();
  reordered[0].sourceIntervals.reverse();
  expectFailure(() => validateManifest(reordered), /manifest changed/u);
  const missing = expectedManifest();
  missing.pop();
  expectFailure(() => validateManifest(missing), /manifest changed/u);
  expectFailure(() => assertFixedSourceSha('0'.repeat(64)), /source video SHA-256/u);

  const fixture = syntheticMappingFixture();
  const derived = derivePiecewiseMapping(
    fixture.item,
    fixture.candidateFrames,
    fixture.timeBase,
    fixture.sourceParts,
    fixture.timeBase
  );
  assert.deepEqual(derived.mapping.unmappedCandidatePts, [{
    startPts: 20,
    endPtsExclusive: 30,
    reason: 'no-candidate-frame',
  }]);
  assert.equal(derived.mapping.segments.length, 2);
  const crossing = projectCandidatePtsInterval(
    derived.mapping,
    rationalNumber(15),
    rationalNumber(35)
  );
  assert.equal(crossing.sourceIntervals.length, 2);
  assert.equal(crossing.unmappedCandidateIntervals.length, 1);
  const gapOnly = projectCandidatePtsInterval(
    derived.mapping,
    rationalNumber(20),
    rationalNumber(30)
  );
  assert.equal(gapOnly.sourceIntervals.length, 0);
  assert.equal(gapOnly.unmappedCandidateIntervals.length, 1);
  verifyRationalProjection(derived.mapping);
  expectFailure(
    () => projectCandidatePtsInterval(
      derived.mapping,
      rationalNumber(-1),
      rationalNumber(1)
    ),
    /outside/u
  );
  const declaredDurationOverlap = syntheticMappingFixture();
  declaredDurationOverlap.candidateFrames[0].durationPts = 20;
  const declaredDurationOverlapResult = derivePiecewiseMapping(
    declaredDurationOverlap.item,
    declaredDurationOverlap.candidateFrames,
    declaredDurationOverlap.timeBase,
    declaredDurationOverlap.sourceParts,
    declaredDurationOverlap.timeBase
  );
  assert.equal(declaredDurationOverlapResult.candidateDeclaredDurationOverlaps.length, 1);
  assert.equal(declaredDurationOverlapResult.rawDurationMismatches.length, 1);

  const countMismatch = syntheticMappingFixture();
  countMismatch.candidateFrames.pop();
  expectFailure(() => derivePiecewiseMapping(
    countMismatch.item,
    countMismatch.candidateFrames,
    countMismatch.timeBase,
    countMismatch.sourceParts,
    countMismatch.timeBase
  ), /frame count differs/u);

  const overlap = syntheticMappingFixture();
  overlap.candidateFrames[1].pts = 9;
  expectFailure(() => derivePiecewiseMapping(
    overlap.item,
    overlap.candidateFrames,
    overlap.timeBase,
    overlap.sourceParts,
    overlap.timeBase
  ), /relative PTS/u);

  const nonAffine = syntheticMappingFixture();
  nonAffine.sourceParts[0].frames.push({
    index: 102,
    pts: 121,
    durationPts: 10,
    decoderIndex: 2,
    relativePts: 121,
  });
  nonAffine.candidateFrames.splice(2, 0, {index: 2, pts: 20, durationPts: 10});
  nonAffine.candidateFrames.forEach((frame, index) => { frame.index = index; });
  expectFailure(() => derivePiecewiseMapping(
    nonAffine.item,
    nonAffine.candidateFrames,
    nonAffine.timeBase,
    nonAffine.sourceParts,
    nonAffine.timeBase
  ), /relative PTS differs/u);

  const internalGap = syntheticMappingFixture();
  internalGap.candidateFrames[1].pts = 15;
  internalGap.sourceParts[0].frames[1].pts = 115;
  const internalGapMapping = derivePiecewiseMapping(
    internalGap.item,
    internalGap.candidateFrames,
    internalGap.timeBase,
    internalGap.sourceParts,
    internalGap.timeBase
  ).mapping;
  assert.equal(internalGapMapping.unmappedCandidatePts.length, 2);
  assert.equal(internalGapMapping.segments.length, 3);

  const crossBaseItem = {
    itemId: 'cross-time-base-item',
    sourceIntervals: [
      {part: 'first', sourceStartMs: 1000, sourceEndMs: 1200},
      {part: 'second', sourceStartMs: 5000, sourceEndMs: 5200},
    ],
  };
  const crossBaseCandidateFrames = [
    {index: 0, pts: 50, durationPts: 10},
    {index: 1, pts: 60, durationPts: 10},
    {index: 2, pts: 80, durationPts: 10},
    {index: 3, pts: 90, durationPts: 10},
  ];
  const crossBaseSourceParts = [
    syntheticPart(crossBaseItem.sourceIntervals[0], [
      {index: 10, pts: 600, durationPts: 60},
      {index: 11, pts: 660, durationPts: 60},
    ]),
    syntheticPart(crossBaseItem.sourceIntervals[1], [
      {index: 50, pts: 3000, durationPts: 60},
      {index: 51, pts: 3060, durationPts: 60},
    ]),
  ];
  const crossBaseMapping = derivePiecewiseMapping(
    crossBaseItem,
    crossBaseCandidateFrames,
    {numerator: 1, denominator: 100},
    crossBaseSourceParts,
    {numerator: 1, denominator: 600}
  ).mapping;
  assert.equal(crossBaseMapping.candidateTimelineStartPts, 50);
  assert.equal(crossBaseMapping.candidateTimelineEndPtsExclusive, 100);
  verifyRationalProjection(crossBaseMapping);

  const unaccountedGap = cloneJson(derived.mapping);
  unaccountedGap.unmappedCandidatePts = [];
  expectFailure(
    () => validateMappingPayload(unaccountedGap, fixture.candidateFrames.length),
    /coverage/u
  );
  const gapAssignedToPrevious = cloneJson(derived.mapping);
  gapAssignedToPrevious.segments[0].candidateEndPtsExclusive = 30;
  expectFailure(
    () => validateMappingPayload(gapAssignedToPrevious, fixture.candidateFrames.length),
    /coverage/u
  );

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'zev-calibration-no-overwrite-'));
  try {
    const occupied = path.join(temporaryRoot, 'occupied');
    await writeFile(occupied, Buffer.from('evidence', 'utf8'), {flag: 'wx'});
    await expectFailureAsync(() => assertPathAbsent(occupied, 'self-test destination'), /overwrite/u);
  } finally {
    await rm(temporaryRoot, {recursive: true, force: false});
  }
  return {
    schemaVersion: 'candidate-video-understanding-calibration-exploration-self-test-v001',
    status: 'passed',
    positiveCases: 10,
    negativeCases: 12,
    apiCommunications: 0,
    repositoryArtifactWrites: 0,
  };
}

function usage() {
  return [
    'usage:',
    `  node ${GENERATOR_RELATIVE_PATH} --self-test`,
    `  node ${GENERATOR_RELATIVE_PATH} --preflight`,
    `  node ${GENERATOR_RELATIVE_PATH} --materialize`,
    `  node ${GENERATOR_RELATIVE_PATH} --verify`,
  ].join('\n');
}

async function main() {
  const [mode, argument, ...rest] = process.argv.slice(2);
  if (rest.length !== 0) fail(`unexpected arguments\n${usage()}`);
  if (mode === '--internal-derive-all') {
    if (!argument) fail('internal derivation root is missing');
    const derived = await deriveAllArtifacts(argument);
    process.stdout.write(canonicalBytes(internalDerivationBundle(derived)));
    return;
  }
  if (argument !== undefined) fail(`unexpected argument: ${argument}\n${usage()}`);
  if (mode === '--self-test') {
    process.stdout.write(canonicalBytes(await selfTest()));
    return;
  }
  if (mode === '--preflight') {
    process.stdout.write(canonicalBytes(await runPreflight()));
    return;
  }
  if (mode === '--materialize') {
    process.stdout.write(canonicalBytes(await materialize()));
    return;
  }
  if (mode === '--verify') {
    process.stdout.write(canonicalBytes(await verifyStoredRoot(
      OUTPUT_ROOT_RELATIVE_PATH,
      {emitProgress: true}
    )));
    return;
  }
  fail(`unknown or missing mode\n${usage()}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
