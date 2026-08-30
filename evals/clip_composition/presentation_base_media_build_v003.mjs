#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {constants as fsConstants, createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rename,
  stat,
  truncate,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  decodedMediaEndMsWithVideoOffsetV001,
  frameBoundaryWithVideoOffsetV001,
  logicalSourceFrameCountV002,
  PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES,
  sourceEndFrameBoundaryWithVideoOffsetV001,
  validatePresentationBaseMediaTimelineV004,
  videoPresentationOffsetMsV001,
} from './presentation_base_media_timeline_v004.mjs';

export const PRESENTATION_BASE_MEDIA_BUILD_JOB_SCHEMA_VERSION =
  'presentation-base-media-build-job-v001';
export const PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION =
  'presentation-base-media-assembly-decision-v001';
export const PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION =
  'presentation-base-media-generation-manifest-v003';
export const PRESENTATION_BASE_MEDIA_VALIDATION_REPORT_SCHEMA_VERSION =
  'presentation-base-media-validation-report-v001';
export const PRESENTATION_BASE_MEDIA_BUILDER_VERSION = 'presentation-base-media-builder-v003';

export const PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE = Object.freeze({
  nodeVersion: 'v20.19.6',
  ffmpegVersion: 'ffmpeg version 8.0.1 Copyright (c) 2000-2025 the FFmpeg developers',
  ffprobeVersion: 'ffprobe version 8.0.1 Copyright (c) 2007-2025 the FFmpeg developers',
});

export const PRESENTATION_BASE_MEDIA_BUILD_VIOLATION_CODES = Object.freeze([
  'BASE_MEDIA_JOB_INVALID',
  'ASSEMBLY_DECISION_INVALID',
  'ASSEMBLY_DECISION_HASH_MISMATCH',
  'ASSEMBLY_DECISION_APPROVAL_INVALID',
  'ASSEMBLY_DECISION_UNRESOLVED_EDITS',
  'ASSEMBLY_DECISION_BASIS_MISMATCH',
  'BASE_MEDIA_SOURCE_BINDING_MISMATCH',
  'BASE_MEDIA_SEGMENT_INVALID',
  'BASE_MEDIA_SEGMENT_ORDER_INVALID',
  'BASE_MEDIA_SEGMENT_OUT_OF_SOURCE',
  'BASE_MEDIA_FRAME_MAPPING_UNREPRESENTABLE',
  'BASE_MEDIA_FORMAT_UNSUPPORTED',
  'BASE_MEDIA_VIDEO_SOURCE_CLOCK_INVALID',
  'BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID',
  'BASE_MEDIA_TOOL_PROFILE_MISMATCH',
  'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  'BASE_MEDIA_INPUT_PATH_UNSAFE',
  'BASE_MEDIA_OUTPUT_PATH_UNSAFE',
  'BASE_MEDIA_OUTPUT_LOCK_CONFLICT',
  'BASE_MEDIA_BUILD_FAILED',
  'BASE_MEDIA_VIDEO_QC_FAILED',
  'BASE_MEDIA_AUDIO_QC_FAILED',
  'BASE_MEDIA_TIMELINE_QC_FAILED',
  'BASE_MEDIA_HASH_GRAPH_INVALID',
  'BASE_MEDIA_ATOMIC_COMMIT_FAILED',
]);

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const INPUT_JSON_ROOT = MODULE_DIRECTORY;
const SOURCE_MEDIA_ROOTS = Object.freeze([
  path.join(MODULE_DIRECTORY, 'research/downloads'),
  path.join(MODULE_DIRECTORY, 'testdata'),
]);
const OUTPUT_ROOT = path.join(MODULE_DIRECTORY, 'outputs/presentation/base-media');
const FAILURE_ROOT = path.join(MODULE_DIRECTORY, 'outputs/presentation/base-media-failures');
const RENDERER_V001_PATH = path.join(MODULE_DIRECTORY, 'render_presentation_v001.mjs');
const PREVIEW_BUILDER_PATH = path.join(MODULE_DIRECTORY, 'build_presentation_initial_preset_review.mjs');
const CAPTION_CONTRACT_PATH = path.join(MODULE_DIRECTORY, 'presentation_caption_contract_v002.mjs');
const TIMELINE_V004_PATH = path.join(MODULE_DIRECTORY, 'presentation_base_media_timeline_v004.mjs');
const BUILDER_PATH = fileURLToPath(import.meta.url);

const EXPECTED_IMPLEMENTATION_HASHES = Object.freeze({
  [RENDERER_V001_PATH]: '13dc1c76ccdca415cb398ba1f3e0cb77e8cac5918f92c3647a273c4a6e4a281d',
  [PREVIEW_BUILDER_PATH]: '97cd4c4cfb2369103228c5156297b3b7a8ea2f14746f0ebd58927074f7ca2646',
  [CAPTION_CONTRACT_PATH]: 'a81d583d877e7e8a5410831f4a18bca18be08c92d28d6349d9a089fb9368086c',
});

const CODE_ORDER = new Map(PRESENTATION_BASE_MEDIA_BUILD_VIOLATION_CODES.map((code, index) => [code, index]));
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isInteger = (value) => Number.isInteger(value) && Number.isFinite(value);
const exactFields = (value, expected) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const fileSha256Streaming = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolve(hash.digest('hex')));
});
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));
const repoPath = (absolutePath) => path.relative(WORKSPACE_ROOT, absolutePath);
const pathIsWithin = (root, candidate) => {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === ''
    || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};
const resolveWorkspacePath = (value) => path.isAbsolute(value)
  ? path.resolve(value)
  : path.resolve(WORKSPACE_ROOT, value);

export const makePresentationBaseMediaViolationV001 = (
  code,
  pathValue,
  relatedIds = [],
  details = null,
) => {
  if (!PRESENTATION_BASE_MEDIA_BUILD_VIOLATION_CODES.includes(code)) {
    throw new TypeError(`unknown base-media violation code: ${code}`);
  }
  return {
    code,
    path: pathValue,
    relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
    details: details === undefined ? null : canonicalize(details),
  };
};

const sortViolations = (violations) => violations.sort((left, right) => {
  const byCode = (CODE_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER)
    - (CODE_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
  if (byCode !== 0) return byCode;
  return JSON.stringify(left).localeCompare(JSON.stringify(right), 'en');
});

class BaseMediaBuildError extends Error {
  constructor(code, pathValue, details = null, relatedIds = []) {
    super(`${code}: ${pathValue}`);
    this.name = 'BaseMediaBuildError';
    this.violation = makePresentationBaseMediaViolationV001(code, pathValue, relatedIds, details);
  }
}

const throwBuild = (code, pathValue, details = null, relatedIds = []) => {
  throw new BaseMediaBuildError(code, pathValue, details, relatedIds);
};

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {
    cwd: options.cwd ?? WORKSPACE_ROOT,
    env: {...process.env, TMPDIR: '/private/tmp'},
  });
  if (options.stdin) child.stdin.end(options.stdin);
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    const result = {code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)};
    if ((options.allowedExitCodes ?? [0]).includes(code)) resolve(result);
    else {
      const error = new Error(`${command} failed (${code ?? 'unknown'}): ${result.stderr.toString()}`);
      error.processResult = result;
      reject(error);
    }
  });
});

/** 長尺mediaのraw decodeをメモリへ溜めず、byte数とpayload hashだけを得る。 */
const runHashStdout = (command, args) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stderr = [];
  let byteCount = 0;
  const child = spawn(command, args, {
    cwd: WORKSPACE_ROOT,
    env: {...process.env, TMPDIR: '/private/tmp'},
  });
  child.stdout.on('data', (chunk) => {
    hash.update(chunk);
    byteCount += chunk.length;
  });
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) resolve({byteCount, payloadSha256: hash.digest('hex')});
    else reject(new Error(`${command} failed (${code ?? 'unknown'}): ${Buffer.concat(stderr).toString()}`));
  });
});

const writeJson = (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const readJsonBytes = async (filePath) => {
  const bytes = await readFile(filePath);
  return {bytes, value: JSON.parse(bytes.toString('utf8')), fileSha256: sha256Bytes(bytes)};
};

const firstLine = (buffer) => buffer.toString().split('\n')[0];

const resolveExecutableBinaryDiagnostic = async (command) => {
  const candidates = command.includes(path.sep)
    ? [path.resolve(command)]
    : (process.env.PATH ?? '')
      .split(path.delimiter)
      .filter(isNonEmptyString)
      .map((directory) => path.resolve(directory, command));
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      const resolvedPath = await realpath(candidate);
      const resolvedStat = await stat(resolvedPath);
      if (!resolvedStat.isFile()) continue;
      return {
        resolvedPath,
        fileSha256: await fileSha256Streaming(resolvedPath),
      };
    } catch (error) {
      if (['EACCES', 'ENOENT', 'ENOTDIR'].includes(error?.code)) continue;
      throw error;
    }
  }
  throw new Error(`executable not found on PATH: ${command}`);
};

export const inspectPresentationBaseMediaToolBinaryDiagnosticsV001 = async () => {
  const [node, ffmpeg, ffprobe] = await Promise.all([
    resolveExecutableBinaryDiagnostic(process.execPath),
    resolveExecutableBinaryDiagnostic('ffmpeg'),
    resolveExecutableBinaryDiagnostic('ffprobe'),
  ]);
  return {node, ffmpeg, ffprobe};
};

export const evaluatePresentationBaseMediaToolProfileV001 = (observed) => {
  const violations = [];
  for (const field of ['nodeVersion', 'ffmpegVersion', 'ffprobeVersion']) {
    if (observed?.[field] !== PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE[field]) {
      violations.push(makePresentationBaseMediaViolationV001(
        'BASE_MEDIA_TOOL_PROFILE_MISMATCH',
        `$.tools.${field}`,
        [],
        {expected: PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE[field], observed: observed?.[field] ?? null},
      ));
    }
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations: sortViolations(violations)};
};

export const inspectPresentationBaseMediaToolProfileV001 = async () => {
  const [ffmpeg, ffprobe] = await Promise.all([
    run('ffmpeg', ['-version']),
    run('ffprobe', ['-version']),
  ]);
  return {
    nodeVersion: process.version,
    ffmpegVersion: firstLine(ffmpeg.stdout),
    ffprobeVersion: firstLine(ffprobe.stdout),
  };
};

const checkExactObject = (value, fields, add, pathValue) => {
  if (!exactFields(value, fields)) add(pathValue);
};

export const validatePresentationBaseMediaBuildJobV001 = (input) => {
  const violations = [];
  const add = (pathValue, details = null) => violations.push(makePresentationBaseMediaViolationV001(
    'BASE_MEDIA_JOB_INVALID', pathValue, [], details,
  ));
  checkExactObject(input, ['schemaVersion', 'jobId', 'assemblyDecision', 'sourceArtifact', 'outputDirectory'], add, '$');
  if (!isObject(input)) return {status: 'failed', violations};
  if (input.schemaVersion !== PRESENTATION_BASE_MEDIA_BUILD_JOB_SCHEMA_VERSION) add('$.schemaVersion');
  if (!isNonEmptyString(input.jobId)) add('$.jobId');
  if (!exactFields(input.assemblyDecision, ['path', 'fileSha256'])
      || !isNonEmptyString(input.assemblyDecision?.path)
      || !SHA256_PATTERN.test(input.assemblyDecision?.fileSha256 ?? '')) add('$.assemblyDecision');
  if (!exactFields(
    input.sourceArtifact,
    ['sourceProvenance', 'sourceRef', 'sourceUri', 'path', 'fileSha256'],
  )) add('$.sourceArtifact');
  for (const field of ['sourceProvenance', 'sourceRef', 'sourceUri', 'path']) {
    if (!isNonEmptyString(input.sourceArtifact?.[field])) add(`$.sourceArtifact.${field}`);
  }
  if (!SHA256_PATTERN.test(input.sourceArtifact?.fileSha256 ?? '')) add('$.sourceArtifact.fileSha256');
  if (!isNonEmptyString(input.outputDirectory)) add('$.outputDirectory');
  return {status: violations.length === 0 ? 'passed' : 'failed', violations: sortViolations(violations)};
};

export const validatePresentationBaseMediaAssemblyDecisionV001 = (input) => {
  const violations = [];
  const add = (code, pathValue, details = null) => violations.push(
    makePresentationBaseMediaViolationV001(code, pathValue, [], details),
  );
  if (!exactFields(input, ['schemaVersion', 'decisionId', 'payload', 'approval'])) {
    add('ASSEMBLY_DECISION_INVALID', '$');
  }
  if (!isObject(input)) return {status: 'failed', violations};
  if (input.schemaVersion !== PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION) {
    add('ASSEMBLY_DECISION_INVALID', '$.schemaVersion');
  }
  if (!isNonEmptyString(input.decisionId)) add('ASSEMBLY_DECISION_INVALID', '$.decisionId');
  const payload = input.payload;
  if (!exactFields(payload, ['basisEditPlan', 'sourceArtifact', 'segments', 'unresolvedEdits'])) {
    add('ASSEMBLY_DECISION_INVALID', '$.payload');
  }
  if (!exactFields(payload?.basisEditPlan, ['kind', 'path', 'fileSha256'])
      || payload?.basisEditPlan?.kind !== 'edit_plan_json'
      || !isNonEmptyString(payload?.basisEditPlan?.path)
      || !SHA256_PATTERN.test(payload?.basisEditPlan?.fileSha256 ?? '')) {
    add('ASSEMBLY_DECISION_INVALID', '$.payload.basisEditPlan');
  }
  if (!exactFields(payload?.sourceArtifact, ['sourceProvenance', 'sourceRef', 'sourceUri', 'fileSha256'])) {
    add('ASSEMBLY_DECISION_INVALID', '$.payload.sourceArtifact');
  } else {
    for (const field of ['sourceProvenance', 'sourceRef', 'sourceUri']) {
      if (!isNonEmptyString(payload.sourceArtifact[field])) {
        add('ASSEMBLY_DECISION_INVALID', `$.payload.sourceArtifact.${field}`);
      }
    }
    if (!SHA256_PATTERN.test(payload.sourceArtifact.fileSha256 ?? '')) {
      add('ASSEMBLY_DECISION_INVALID', '$.payload.sourceArtifact.fileSha256');
    }
  }
  if (!Array.isArray(payload?.segments) || payload.segments.length === 0) {
    add('ASSEMBLY_DECISION_INVALID', '$.payload.segments');
  } else {
    payload.segments.forEach((segment, index) => {
      if (!exactFields(segment, ['sourceStartMs', 'sourceEndMs'])) {
        add('ASSEMBLY_DECISION_INVALID', `$.payload.segments[${index}]`);
      }
    });
  }
  if (!Array.isArray(payload?.unresolvedEdits)) {
    add('ASSEMBLY_DECISION_INVALID', '$.payload.unresolvedEdits');
  } else if (payload.unresolvedEdits.length > 0) {
    add('ASSEMBLY_DECISION_UNRESOLVED_EDITS', '$.payload.unresolvedEdits', {count: payload.unresolvedEdits.length});
  }
  const approval = input.approval;
  if (!exactFields(approval, ['status', 'approverType', 'recordId', 'recordedAt', 'targetPayloadSha256'])) {
    add('ASSEMBLY_DECISION_INVALID', '$.approval');
  } else {
    if (approval.status !== 'approved' || approval.approverType !== 'human'
        || !isNonEmptyString(approval.recordId)
        || !ISO_8601_PATTERN.test(approval.recordedAt ?? '')
        || !SHA256_PATTERN.test(approval.targetPayloadSha256 ?? '')) {
      add('ASSEMBLY_DECISION_APPROVAL_INVALID', '$.approval');
    } else if (isObject(payload) && approval.targetPayloadSha256 !== sha256Canonical(payload)) {
      add('ASSEMBLY_DECISION_APPROVAL_INVALID', '$.approval.targetPayloadSha256', {
        expected: sha256Canonical(payload),
        actual: approval.targetPayloadSha256,
      });
    }
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations: sortViolations(violations)};
};

const validateAudioObject = (audio, add, pathValue) => {
  if (exactFields(audio, ['present']) && audio?.present === false) return;
  if (!exactFields(audio, [
    'present', 'sampleRate', 'channels', 'channelLayout', 'channelOrder', 'canonicalPcmFormat',
    'insertedSilenceSpans', 'sourceGrid', 'encodeInput', 'encoded',
  ]) || audio.present !== true) {
    add(pathValue);
    return;
  }
  if (![44100, 48000].includes(audio.sampleRate) || ![1, 2].includes(audio.channels)) add(pathValue);
  if (!exactFields(audio.canonicalPcmFormat, ['sampleFormat', 'packing'])
      || audio.canonicalPcmFormat.sampleFormat !== 'f32le'
      || audio.canonicalPcmFormat.packing !== 'interleaved') add(`${pathValue}.canonicalPcmFormat`);
  for (const field of ['sourceGrid', 'encodeInput']) {
    const expectedFields = field === 'sourceGrid'
      ? ['sampleCount', 'byteCount', 'payloadSha256', 'decodedSampleCount', 'decodedTailPaddingSampleCount']
      : ['sampleCount', 'byteCount', 'payloadSha256'];
    if (!exactFields(audio[field], expectedFields)
        || !isInteger(audio[field]?.sampleCount) || audio[field].sampleCount < 0
        || !isInteger(audio[field]?.byteCount) || audio[field].byteCount < 0
        || !SHA256_PATTERN.test(audio[field]?.payloadSha256 ?? '')) add(`${pathValue}.${field}`);
  }
  if (!isInteger(audio.sourceGrid?.decodedSampleCount) || audio.sourceGrid.decodedSampleCount < 0
      || !isInteger(audio.sourceGrid?.decodedTailPaddingSampleCount)
      || audio.sourceGrid.decodedTailPaddingSampleCount < 0
      || audio.sourceGrid?.decodedSampleCount - audio.sourceGrid?.sampleCount
        !== audio.sourceGrid?.decodedTailPaddingSampleCount) {
    add(`${pathValue}.sourceGrid`);
  }
  if (!exactFields(audio.encoded, [
    'codec', 'bitRate', 'movieTimeScale', 'timeBase', 'startPts', 'durationTs',
    'containerDurationSamples', 'presentationDurationSamples', 'videoPresentationDurationSamples',
    'trailingVideoOnlySampleCount', 'tailPolicy',
    'rawDecodedSampleCount', 'effectiveDecodedSampleCount',
    'effectiveDecodedPayloadSha256', 'packetPayloadSha256', 'skipSamples', 'discardPadding', 'encoderDelay',
  ])) add(`${pathValue}.encoded`);
};

/** Renderer v002も使う、§6.3の厳密manifest検査。 */
export const validatePresentationBaseMediaGenerationManifestV003 = (input) => {
  const violations = [];
  const add = (pathValue, details = null) => violations.push(makePresentationBaseMediaViolationV001(
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID', pathValue, [], details,
  ));
  if (!exactFields(input, [
    'schemaVersion', 'buildId', 'job', 'source', 'assemblyDecision', 'basisEditPlan', 'segments',
    'audio', 'execution', 'tools', 'versions', 'git', 'implementationFiles', 'outputs', 'excludedLegacyFields',
  ])) add('$');
  if (!isObject(input)) return {status: 'failed', violations};
  if (input.schemaVersion !== PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION) add('$.schemaVersion');
  if (!isNonEmptyString(input.buildId)) add('$.buildId');
  if (!exactFields(input.job, ['jobId', 'schemaVersion', 'fileSha256'])
      || input.job?.schemaVersion !== PRESENTATION_BASE_MEDIA_BUILD_JOB_SCHEMA_VERSION
      || !isNonEmptyString(input.job?.jobId)
      || !SHA256_PATTERN.test(input.job?.fileSha256 ?? '')) add('$.job');
  if (!exactFields(input.source, [
    'sourceProvenance', 'sourceRef', 'sourceUri', 'path', 'fileSha256',
    'streamConfiguration', 'video', 'audio',
  ])) add('$.source');
  if (!exactFields(input.source?.streamConfiguration, [
    'videoCount', 'audioCount', 'videoStreamIndex', 'audioStreamIndex',
  ])
      || input.source?.streamConfiguration?.videoCount !== 1
      || ![0, 1].includes(input.source?.streamConfiguration?.audioCount)
      || !isInteger(input.source?.streamConfiguration?.videoStreamIndex)
      || input.source.streamConfiguration.videoStreamIndex < 0
      || (input.source.streamConfiguration.audioCount === 0
        ? input.source.streamConfiguration.audioStreamIndex !== null
        : !isInteger(input.source.streamConfiguration.audioStreamIndex)
          || input.source.streamConfiguration.audioStreamIndex < 0)) add('$.source.streamConfiguration');
  if (!exactFields(input.source?.video, [
    'width', 'height', 'frameRate', 'timeBase', 'decodedFrameCount',
    'firstPts', 'lastPts', 'ptsStep', 'containerStartTimeMs',
    'presentationOffsetMs', 'clockAuthority', 'rotation',
  ])) add('$.source.video');
  const videoClock = input.source?.video;
  if (!isObject(videoClock)
      || !['30/1', '60/1'].includes(videoClock.frameRate)
      || !isInteger(videoClock.decodedFrameCount) || videoClock.decodedFrameCount <= 0
      || !isInteger(videoClock.firstPts) || videoClock.firstPts < 0
      || !isInteger(videoClock.ptsStep) || videoClock.ptsStep <= 0
      || videoClock.lastPts !== videoClock.firstPts
        + (videoClock.decodedFrameCount - 1) * videoClock.ptsStep
      || videoClock.containerStartTimeMs !== 0
      || videoClock.presentationOffsetMs !== videoPresentationOffsetMsV001({
        firstPts: videoClock.firstPts,
        timeBase: videoClock.timeBase,
        containerStartTimeMs: videoClock.containerStartTimeMs,
      })
      || videoClock.clockAuthority !== 'container-zero-video-stream-offset-v001') {
    add('$.source.video');
  }
  if (!(exactFields(input.source?.audio, ['present']) && input.source?.audio?.present === false)
      && !exactFields(input.source?.audio, [
        'present', 'codec', 'sampleRate', 'channels', 'channelLayout', 'timeBase',
        'firstDecodedPts', 'lastDecodedPts', 'presentationClock',
      ])) add('$.source.audio');
  if (input.source?.audio?.present === true) {
    const clock = input.source.audio.presentationClock;
    if (!exactFields(clock, [
      'authority', 'endSample', 'streamEndSample', 'packetEndSample', 'skipSamples', 'discardPadding',
    ])
        || clock?.authority !== 'stream-and-packet-v001'
        || !isInteger(clock?.endSample) || clock.endSample <= 0
        || !isInteger(clock?.streamEndSample) || clock.streamEndSample !== clock.endSample
        || !isInteger(clock?.packetEndSample) || clock.packetEndSample !== clock.endSample
        || !isInteger(clock?.skipSamples) || clock.skipSamples < 0
        || !isInteger(clock?.discardPadding) || clock.discardPadding < 0) {
      add('$.source.audio.presentationClock');
    }
  }
  if (!exactFields(input.assemblyDecision, ['decisionId', 'fileSha256', 'payloadSha256', 'approvalRecordId'])) {
    add('$.assemblyDecision');
  }
  if (!exactFields(input.basisEditPlan, ['kind', 'path', 'fileSha256'])) add('$.basisEditPlan');
  if (!Array.isArray(input.segments) || input.segments.length === 0) add('$.segments');
  else input.segments.forEach((segment, index) => {
    if (!exactFields(segment, [
      'segmentId', 'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30',
      'outputStartFrame', 'outputEndFrame', 'audioSamples',
    ])) add(`$.segments[${index}]`);
  });
  validateAudioObject(input.audio, add, '$.audio');
  if (!exactFields(input.execution, ['commands', 'trustedSourceFiles'])) add('$.execution');
  const expectedStages = input.audio?.present === true
    ? ['video-build', 'audio-grid', 'audio-mux'] : ['video-build'];
  if (!Array.isArray(input.execution?.commands)
      || input.execution.commands.length !== expectedStages.length) {
    add('$.execution.commands');
  } else {
    input.execution.commands.forEach((command, index) => {
      if (!exactFields(command, ['stage', 'tool', 'arguments', 'filterGraph'])
          || command.stage !== expectedStages[index]
          || command.tool !== 'ffmpeg'
          || !Array.isArray(command.arguments)
          || command.arguments.length === 0
          || command.arguments.some((argument) => !isNonEmptyString(argument))
          || (command.stage === 'video-build'
            ? !isNonEmptyString(command.filterGraph)
            : command.filterGraph !== null)) add(`$.execution.commands[${index}]`);
    });
  }
  if (canonicalJson(input.execution?.trustedSourceFiles)
      !== canonicalJson(PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES)) {
    add('$.execution.trustedSourceFiles');
  }
  if (!exactFields(input.tools, ['expected', 'observed', 'binaryDiagnostics'])) add('$.tools');
  for (const side of ['expected', 'observed']) {
    if (!exactFields(input.tools?.[side], ['nodeVersion', 'ffmpegVersion', 'ffprobeVersion'])) {
      add(`$.tools.${side}`);
    }
  }
  if (!exactFields(input.tools?.binaryDiagnostics, ['node', 'ffmpeg', 'ffprobe'])) {
    add('$.tools.binaryDiagnostics');
  } else {
    for (const tool of ['node', 'ffmpeg', 'ffprobe']) {
      const diagnostic = input.tools.binaryDiagnostics[tool];
      if (!exactFields(diagnostic, ['resolvedPath', 'fileSha256'])
          || !path.isAbsolute(diagnostic?.resolvedPath ?? '')
          || !SHA256_PATTERN.test(diagnostic?.fileSha256 ?? '')) {
        add(`$.tools.binaryDiagnostics.${tool}`);
      }
    }
  }
  if (!exactFields(input.versions, ['generatorVersion', 'timelineCheckerVersion'])) add('$.versions');
  if (!exactFields(input.git, ['head', 'dirty']) || !COMMIT_PATTERN.test(input.git?.head ?? '')
      || typeof input.git?.dirty !== 'boolean') add('$.git');
  if (!Array.isArray(input.implementationFiles) || input.implementationFiles.length === 0
      || input.implementationFiles.some((item) => !exactFields(item, ['path', 'fileSha256'])
        || !isNonEmptyString(item.path) || !SHA256_PATTERN.test(item.fileSha256 ?? ''))) {
    add('$.implementationFiles');
  }
  if (!exactFields(input.outputs, ['baseMedia', 'timeline'])) add('$.outputs');
  if (!exactFields(input.outputs?.baseMedia, [
    'artifactId', 'path', 'fileSha256', 'frameRate', 'frameCount', 'audioPacketPayloadSha256',
  ])) add('$.outputs.baseMedia');
  if (!exactFields(input.outputs?.timeline, ['timelineId', 'schemaVersion', 'path', 'fileSha256'])) {
    add('$.outputs.timeline');
  }
  if (canonicalJson(input.excludedLegacyFields) !== canonicalJson(['screenLayout', 'telopPlan'])) {
    add('$.excludedLegacyFields');
  }
  return {
    status: violations.length === 0 ? 'passed' : 'failed',
    violations: sortViolations(violations),
    manifest: violations.length === 0 ? structuredClone(input) : null,
  };
};

export const validatePresentationBaseMediaValidationReportV001 = (input, {allowFailure = false} = {}) => {
  const violations = [];
  const add = (pathValue) => violations.push(makePresentationBaseMediaViolationV001(
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID', pathValue,
  ));
  if (!exactFields(input, ['schemaVersion', 'buildId', 'status', 'violations', 'inputs', 'outputs', 'checks'])) add('$report');
  if (!isObject(input)) return {status: 'failed', violations};
  if (input.schemaVersion !== PRESENTATION_BASE_MEDIA_VALIDATION_REPORT_SCHEMA_VERSION) add('$report.schemaVersion');
  if (allowFailure ? input.buildId !== null && !isNonEmptyString(input.buildId) : !isNonEmptyString(input.buildId)) {
    add('$report.buildId');
  }
  if (allowFailure ? !['passed', 'failed'].includes(input.status) : input.status !== 'passed') add('$report.status');
  if (!Array.isArray(input.violations)) add('$report.violations');
  if (!exactFields(input.inputs, ['assemblyDecision', 'basisEditPlan', 'sourceMedia'])) add('$report.inputs');
  if (!exactFields(input.outputs, ['baseMedia', 'timeline', 'generationManifest'])) add('$report.outputs');
  if (!exactFields(input.checks, [
    'approvalBinding', 'sourceBinding', 'videoQc', 'audioQc', 'timelineQc', 'hashGraph', 'publishPreconditions',
  ])) add('$report.checks');
  if (!allowFailure || input.status === 'passed') {
    if (input.violations.length !== 0) add('$report.violations');
    if (!exactFields(input.inputs.assemblyDecision, ['path', 'fileSha256', 'payloadSha256'])) add('$report.inputs.assemblyDecision');
    if (!exactFields(input.inputs.basisEditPlan, ['path', 'fileSha256'])) add('$report.inputs.basisEditPlan');
    if (!exactFields(input.inputs.sourceMedia, ['path', 'fileSha256'])) add('$report.inputs.sourceMedia');
    if (!exactFields(input.outputs.baseMedia, ['artifactId', 'path', 'fileSha256'])) add('$report.outputs.baseMedia');
    if (!exactFields(input.outputs.timeline, ['timelineId', 'path', 'fileSha256'])) add('$report.outputs.timeline');
    if (!exactFields(input.outputs.generationManifest, ['buildId', 'path', 'fileSha256'])) {
      add('$report.outputs.generationManifest');
    }
    for (const [key, check] of Object.entries(input.checks ?? {})) {
      if (!exactFields(check, ['status', 'violationCodes']) || check.status !== 'passed'
          || !Array.isArray(check.violationCodes) || check.violationCodes.length !== 0) add(`$report.checks.${key}`);
    }
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations: sortViolations(violations)};
};

/**
 * timeline -> base、manifest -> base/timeline、report -> base/timeline/manifest の一方向だけを許す。
 * strict schema検査とは別に、値の対応を検査して自己参照や相互循環を作れないようにする。
 */
export const validatePresentationBaseMediaHashGraphV001 = ({
  timeline,
  manifest,
  report,
  baseMediaFileSha256,
  timelineFileSha256,
  manifestFileSha256,
}) => {
  const violations = [];
  const add = (pathValue, details = null) => violations.push(makePresentationBaseMediaViolationV001(
    'BASE_MEDIA_HASH_GRAPH_INVALID', pathValue, [], details,
  ));
  if (timeline?.baseMedia?.fileSha256 !== baseMediaFileSha256) add('$.timeline.baseMedia.fileSha256');
  if (manifest?.outputs?.baseMedia?.fileSha256 !== baseMediaFileSha256) add('$.manifest.outputs.baseMedia.fileSha256');
  if (manifest?.outputs?.timeline?.fileSha256 !== timelineFileSha256) add('$.manifest.outputs.timeline.fileSha256');
  if (report?.outputs?.baseMedia?.fileSha256 !== baseMediaFileSha256) add('$.report.outputs.baseMedia.fileSha256');
  if (report?.outputs?.timeline?.fileSha256 !== timelineFileSha256) add('$.report.outputs.timeline.fileSha256');
  if (report?.outputs?.generationManifest?.fileSha256 !== manifestFileSha256) {
    add('$.report.outputs.generationManifest.fileSha256');
  }
  // 上流artifactのstrict field集合に、下流artifactを指す名前が紛れ込んでいないことも確認する。
  const forbiddenKey = (value, forbidden, current = '$') => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => forbiddenKey(item, forbidden, `${current}[${index}]`));
      return;
    }
    if (!isObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key)) add(`${current}.${key}`, {reason: 'forbidden_downstream_reference'});
      forbiddenKey(child, forbidden, `${current}.${key}`);
    }
  };
  forbiddenKey(timeline, new Set(['timelineFileSha256', 'generationManifest', 'validationReport']), '$.timeline');
  forbiddenKey(manifest, new Set(['generationManifestFileSha256', 'validationReport']), '$.manifest');
  forbiddenKey(report, new Set(['validationReportFileSha256']), '$.report');
  return {status: violations.length === 0 ? 'passed' : 'failed', violations: sortViolations(violations)};
};

const assertNoSymlinkAncestors = async (absolutePath, stopAt) => {
  const target = path.resolve(absolutePath);
  const root = path.resolve(stopAt);
  if (!pathIsWithin(root, target)) return false;
  let current = root;
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return false;
  for (const part of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let currentStat;
    try {
      currentStat = await lstat(current);
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    if (currentStat.isSymbolicLink()) return false;
  }
  return true;
};

export const assertSafePresentationBaseMediaInputPathV001 = async (value, roots) => {
  if (!isNonEmptyString(value)) throwBuild('BASE_MEDIA_INPUT_PATH_UNSAFE', '$path');
  const absolutePath = resolveWorkspacePath(value);
  const matchingRoot = roots.find((root) => pathIsWithin(root, absolutePath));
  if (!matchingRoot || !(await assertNoSymlinkAncestors(absolutePath, WORKSPACE_ROOT))) {
    throwBuild('BASE_MEDIA_INPUT_PATH_UNSAFE', '$path', {path: value});
  }
  let actual;
  try {
    actual = await realpath(absolutePath);
  } catch {
    throwBuild('BASE_MEDIA_INPUT_PATH_UNSAFE', '$path', {path: value});
  }
  const realRoot = await realpath(matchingRoot);
  if (!pathIsWithin(realRoot, actual)) throwBuild('BASE_MEDIA_INPUT_PATH_UNSAFE', '$path', {path: value});
  const actualStat = await lstat(actual);
  if (!actualStat.isFile() || actualStat.isSymbolicLink()) {
    throwBuild('BASE_MEDIA_INPUT_PATH_UNSAFE', '$path', {path: value});
  }
  return actual;
};

const ensureDirectoryNoSymlink = async (absolutePath) => {
  if (!pathIsWithin(WORKSPACE_ROOT, absolutePath)) throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$outputDirectory');
  const parts = path.relative(WORKSPACE_ROOT, absolutePath).split(path.sep).filter(Boolean);
  let current = WORKSPACE_ROOT;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const currentStat = await lstat(current);
      if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) {
        throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$outputDirectory', {path: repoPath(current)});
      }
    } catch (error) {
      if (error instanceof BaseMediaBuildError) throw error;
      if (error?.code !== 'ENOENT') throw error;
      await mkdir(current);
    }
  }
};

const resolveSafeOutput = async (value) => {
  const absolutePath = resolveWorkspacePath(value);
  if (!pathIsWithin(OUTPUT_ROOT, absolutePath) || absolutePath === OUTPUT_ROOT) {
    throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {path: value});
  }
  await ensureDirectoryNoSymlink(path.dirname(absolutePath));
  try {
    await lstat(absolutePath);
    throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {reason: 'already_exists'});
  } catch (error) {
    if (error instanceof BaseMediaBuildError) throw error;
    if (error?.code !== 'ENOENT') throw error;
  }
  return absolutePath;
};

/**
 * 長時間のmedia処理中に出力先の親階層が差し替わっていないことを、
 * directory renameの直前に再確認する。最終pathだけのlstatでは、親が
 * symlinkへ置換された場合にその先へ公開してしまうため不十分である。
 */
export const assertSafePresentationBaseMediaPublishPathsV001 = async (
  temporaryDirectoryValue,
  outputDirectoryValue,
) => {
  const temporaryDirectory = path.resolve(temporaryDirectoryValue);
  const outputDirectory = path.resolve(outputDirectoryValue);
  const outputParent = path.dirname(outputDirectory);

  if (!pathIsWithin(OUTPUT_ROOT, outputDirectory)
      || outputDirectory === OUTPUT_ROOT
      || path.dirname(temporaryDirectory) !== outputParent) {
    throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'publish_paths_outside_allowed_same_parent',
    });
  }

  const assertPublishAncestors = async () => {
    // final path自身（未作成ならその親まで）とtemporary path自身の双方について、
    // workspaceから全階層を再走査する。OUTPUT_ROOT自体の差し替えもここで拒否する。
    if (!(await assertNoSymlinkAncestors(outputDirectory, WORKSPACE_ROOT))
        || !(await assertNoSymlinkAncestors(temporaryDirectory, WORKSPACE_ROOT))) {
      throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
        reason: 'symlink_ancestor_appeared_before_commit',
      });
    }
  };
  await assertPublishAncestors();

  let realOutputRoot;
  let realOutputParent;
  let realTemporaryDirectory;
  try {
    [realOutputRoot, realOutputParent, realTemporaryDirectory] = await Promise.all([
      realpath(OUTPUT_ROOT),
      realpath(outputParent),
      realpath(temporaryDirectory),
    ]);
  } catch (error) {
    throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'publish_path_realpath_failed',
      errorCode: error?.code ?? null,
    });
  }
  if (!pathIsWithin(realOutputRoot, realOutputParent)
      || path.dirname(realTemporaryDirectory) !== realOutputParent) {
    throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'publish_realpath_outside_allowed_same_parent',
    });
  }
  // realpath検査中の差し替えも、rename直前側の再走査で取りこぼさない。
  await assertPublishAncestors();
  let temporaryStat;
  try {
    temporaryStat = await lstat(temporaryDirectory);
  } catch (error) {
    throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'temporary_directory_disappeared_before_commit',
      errorCode: error?.code ?? null,
    });
  }
  if (!temporaryStat.isDirectory() || temporaryStat.isSymbolicLink()) {
    throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'temporary_directory_not_real_directory',
    });
  }

  try {
    await lstat(outputDirectory);
    throwBuild('BASE_MEDIA_OUTPUT_PATH_UNSAFE', '$.outputDirectory', {
      reason: 'appeared_before_commit',
    });
  } catch (error) {
    if (error instanceof BaseMediaBuildError) throw error;
    if (error?.code !== 'ENOENT') throw error;
  }
};

const parseRational = (value) => {
  const match = /^(\-?\d+)\/(\d+)$/.exec(value ?? '');
  if (!match || Number(match[2]) === 0) return null;
  return {numerator: Number(match[1]), denominator: Number(match[2])};
};
const rationalToInteger = (value, multiplier) => {
  const rational = parseRational(value);
  if (!rational) return null;
  const numerator = rational.numerator * multiplier;
  return numerator % rational.denominator === 0 ? numerator / rational.denominator : null;
};

const ffprobeJson = async (args) => {
  const result = await run('ffprobe', ['-v', 'error', '-print_format', 'json', ...args]);
  return JSON.parse(result.stdout.toString('utf8'));
};

/** ffprobeの長尺frame/packet列を巨大JSONへ蓄積せず、1行ずつ検査する。 */
const forEachFfprobeLine = (args, onLine) => new Promise((resolve, reject) => {
  const stderr = [];
  let callbackError = null;
  const child = spawn('ffprobe', ['-v', 'error', ...args], {
    cwd: WORKSPACE_ROOT,
    env: {...process.env, TMPDIR: '/private/tmp'},
  });
  const lines = createInterface({input: child.stdout, crlfDelay: Infinity});
  lines.on('line', (line) => {
    if (callbackError || line.length === 0) return;
    try {
      onLine(line);
    } catch (error) {
      callbackError = error;
      child.kill('SIGTERM');
    }
  });
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    if (callbackError) reject(callbackError);
    else if (code === 0) resolve();
    else reject(new Error(`ffprobe failed (${code ?? 'unknown'}): ${Buffer.concat(stderr).toString()}`));
  });
});

const parseCompactFields = (line) => Object.fromEntries(line.split('|').flatMap((part) => {
  const separator = part.indexOf('=');
  if (separator < 0) return [];
  const rawKey = part.slice(0, separator);
  const key = rawKey.includes(':') ? rawKey.slice(rawKey.lastIndexOf(':') + 1) : rawKey;
  return [[key, part.slice(separator + 1)]];
}));

const rationalScaledInteger = (integer, timeBaseValue, scale) => {
  const timeBase = parseRational(timeBaseValue);
  if (!Number.isInteger(integer) || !timeBase || !Number.isInteger(scale)) return null;
  const numerator = BigInt(integer) * BigInt(timeBase.numerator) * BigInt(scale);
  const denominator = BigInt(timeBase.denominator);
  if (denominator <= 0n || numerator % denominator !== 0n) return null;
  const result = numerator / denominator;
  return result <= BigInt(Number.MAX_SAFE_INTEGER) && result >= BigInt(Number.MIN_SAFE_INTEGER)
    ? Number(result) : null;
};

/**
 * source音声の提示終端をpacket時計から確定する。
 *
 * AACではstream.duration_tsとpacketのPTS+durationが同じ提示終端を指すことを
 * 必須にする。skip_samples/discard_paddingは既にcontainerのpacket時計へ反映された
 * 事実として記録し、ここで再び足し引きしない。
 * codecを問わず両方の時計を取得できないsourceは停止する。decoded frame終端を
 * 提示終端へfallbackするとcodec paddingを実音声へ戻すため、fallbackは禁止する。
 */
const inspectSourceAudioPresentationClockV001 = async (
  sourcePath,
  audio,
  sampleRate,
  decodedEndSample,
) => {
  let packetCount = 0;
  let packetDurationsComplete = true;
  let packetEndSample = null;
  let previousPacketEndSample = null;
  let skipSamples = 0;
  let discardPadding = 0;
  await forEachFfprobeLine([
    '-select_streams', 'a:0', '-show_packets',
    '-show_entries', 'packet=pts,duration:packet_side_data=skip_samples,discard_padding',
    '-of', 'compact=p=0', sourcePath,
  ], (line) => {
    const packet = parseCompactFields(line);
    packetCount += 1;
    for (const [field, target] of [
      ['skip_samples', 'skip'],
      ['discard_padding', 'discard'],
    ]) {
      if (packet[field] === undefined) continue;
      const value = Number(packet[field]);
      if (!Number.isInteger(value) || value < 0) {
        throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', `$.source.audio.packets[${packetCount - 1}].${field}`);
      }
      if (target === 'skip') skipSamples += value;
      else discardPadding += value;
    }
    const pts = Number(packet.pts);
    const duration = Number(packet.duration);
    if (!Number.isInteger(pts) || !Number.isInteger(duration) || duration <= 0) {
      packetDurationsComplete = false;
      return;
    }
    const startSample = rationalScaledInteger(pts, audio.time_base, sampleRate);
    const durationSamples = rationalScaledInteger(duration, audio.time_base, sampleRate);
    if (!Number.isInteger(startSample) || !Number.isInteger(durationSamples) || durationSamples <= 0) {
      throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', `$.source.audio.packets[${packetCount - 1}]`, {
        pts,
        duration,
        timeBase: audio.time_base,
      });
    }
    const endSample = startSample + durationSamples;
    if (previousPacketEndSample !== null && startSample < previousPacketEndSample) {
      throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', `$.source.audio.packets[${packetCount - 1}]`, {
        startSample,
        previousPacketEndSample,
      });
    }
    previousPacketEndSample = endSample;
    packetEndSample = Math.max(packetEndSample ?? 0, endSample);
  });

  const streamStartPts = Number(audio.start_pts);
  const streamDurationTs = Number(audio.duration_ts);
  const streamStartSample = Number.isInteger(streamStartPts)
    ? rationalScaledInteger(streamStartPts, audio.time_base, sampleRate)
    : null;
  const streamDurationSamples = Number.isInteger(streamDurationTs)
    ? rationalScaledInteger(streamDurationTs, audio.time_base, sampleRate)
    : null;
  const streamEndSample = Number.isInteger(streamStartSample) && Number.isInteger(streamDurationSamples)
    ? streamStartSample + streamDurationSamples
    : null;
  const packetClockAvailable = packetCount > 0 && packetDurationsComplete
    && Number.isInteger(packetEndSample);
  if (!packetClockAvailable
      || !Number.isInteger(streamEndSample)
      || packetEndSample !== streamEndSample) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$.source.audio.presentationClock', {
      codec: audio.codec_name,
      packetEndSample,
      streamEndSample,
    });
  }
  const authority = 'stream-and-packet-v001';
  const endSample = packetEndSample;
  if (!Number.isInteger(endSample) || endSample <= 0 || endSample > decodedEndSample) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$.source.audio.presentationClock.endSample', {
      endSample,
      decodedEndSample,
    });
  }
  return {
    authority,
    endSample,
    streamEndSample,
    packetEndSample: packetClockAvailable ? packetEndSample : null,
    skipSamples,
    discardPadding,
  };
};

export const inspectPresentationBaseMediaSourceV002 = async (sourcePath) => {
  const probe = await ffprobeJson(['-show_streams', '-show_format', sourcePath]);
  const streams = Array.isArray(probe.streams) ? probe.streams : [];
  const videos = streams.filter((stream) => stream.codec_type === 'video');
  const audios = streams.filter((stream) => stream.codec_type === 'audio');
  if (videos.length !== 1 || audios.length > 1) {
    throwBuild('BASE_MEDIA_FORMAT_UNSUPPORTED', '$source.streams', {videoCount: videos.length, audioCount: audios.length});
  }
  const video = videos[0];
  const containerStartSeconds = Number(probe.format?.start_time);
  const containerStartTimeMs = containerStartSeconds * 1000;
  if (!Number.isFinite(containerStartSeconds)
      || !Number.isSafeInteger(containerStartTimeMs)
      || containerStartTimeMs !== 0) {
    throwBuild('BASE_MEDIA_VIDEO_SOURCE_CLOCK_INVALID', '$source.format.startTime', {
      actual: probe.format?.start_time ?? null,
      expectedMs: 0,
    });
  }
  const rotation = Number(video.tags?.rotate ?? video.side_data_list?.find((item) => item.rotation !== undefined)?.rotation ?? 0);
  if (video.width !== 1920 || video.height !== 1080
      || !['30/1', '60/1'].includes(video.r_frame_rate)
      || video.avg_frame_rate !== video.r_frame_rate
      || rotation !== 0) {
    throwBuild('BASE_MEDIA_FORMAT_UNSUPPORTED', '$source.video', {
      width: video.width, height: video.height, rFrameRate: video.r_frame_rate,
      avgFrameRate: video.avg_frame_rate, rotation,
    });
  }
  const fps = Number(video.r_frame_rate.split('/')[0]);
  const timeBase = parseRational(video.time_base);
  if (!timeBase) throwBuild('BASE_MEDIA_FORMAT_UNSUPPORTED', '$source.video.timeBase');
  const ptsStepNumerator = timeBase.denominator;
  const ptsStepDenominator = timeBase.numerator * fps;
  if (ptsStepDenominator <= 0 || ptsStepNumerator % ptsStepDenominator !== 0) {
    throwBuild('BASE_MEDIA_FORMAT_UNSUPPORTED', '$source.video.timeBase');
  }
  const ptsStep = ptsStepNumerator / ptsStepDenominator;
  let videoFrameCount = 0;
  let videoFirstPts = null;
  let videoLastPts = null;
  let audioFrameCount = 0;
  let audioDecodedPayloadSampleCount = 0;
  let audioPreviousEnd = 0;
  let audioFirstPts = null;
  let audioLastPts = null;
  const audioSpans = [];
  const audio = audios[0] ?? null;
  const sampleRate = audio ? Number(audio.sample_rate) : null;
  const channels = audio ? Number(audio.channels) : null;
  if (audio && (
    ![44100, 48000].includes(sampleRate)
    || ![1, 2].includes(channels)
    || !['mono', 'stereo'].includes(audio.channel_layout)
  )) {
    throwBuild('BASE_MEDIA_FORMAT_UNSUPPORTED', '$source.audio', {
      sampleRate, channels, channelLayout: audio.channel_layout,
    });
  }
  await forEachFfprobeLine([
    '-show_frames',
    '-show_entries', 'frame=media_type,pts,best_effort_timestamp,nb_samples',
    '-of', 'compact=p=0',
    sourcePath,
  ], (line) => {
    const frame = parseCompactFields(line);
    if (frame.media_type === 'video') {
      const pts = Number(frame.pts ?? frame.best_effort_timestamp);
      if (!Number.isInteger(pts) || pts < 0) {
        throwBuild('BASE_MEDIA_VIDEO_SOURCE_CLOCK_INVALID', `$.source.video.frames[${videoFrameCount}].pts`, {
          pts,
        });
      }
      videoFirstPts ??= pts;
      const expectedPts = videoFirstPts + videoFrameCount * ptsStep;
      if (pts !== expectedPts) {
        throwBuild('BASE_MEDIA_VIDEO_SOURCE_CLOCK_INVALID', `$.source.video.frames[${videoFrameCount}].pts`, {
          pts, expected: expectedPts,
        });
      }
      videoLastPts = pts;
      videoFrameCount += 1;
      return;
    }
    if (frame.media_type !== 'audio' || !audio) return;
    const pts = Number(frame.pts ?? frame.best_effort_timestamp);
    const startSample = rationalScaledInteger(pts, audio.time_base, sampleRate);
    const sampleCount = Number(frame.nb_samples);
    if (!Number.isInteger(pts) || !Number.isInteger(startSample) || startSample < 0
        || !Number.isInteger(sampleCount) || sampleCount <= 0 || startSample < audioPreviousEnd) {
      throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', `$.source.audio.frames[${audioFrameCount}]`, {
        pts, startSample, sampleCount, previousEnd: audioPreviousEnd,
      });
    }
    if (startSample > audioPreviousEnd) {
      audioSpans.push({startSample: audioPreviousEnd, endSample: startSample});
    }
    audioPreviousEnd = startSample + sampleCount;
    audioDecodedPayloadSampleCount += sampleCount;
    audioFirstPts ??= pts;
    audioLastPts = pts;
    audioFrameCount += 1;
  });
  if (videoFrameCount === 0) throwBuild('BASE_MEDIA_FORMAT_UNSUPPORTED', '$source.video.frames');
  const streamFirstPts = Number(video.start_pts);
  if (!Number.isInteger(streamFirstPts) || streamFirstPts !== videoFirstPts) {
    throwBuild('BASE_MEDIA_VIDEO_SOURCE_CLOCK_INVALID', '$source.video.startPts', {
      streamFirstPts,
      firstDecodedFramePts: videoFirstPts,
    });
  }
  const presentationOffsetMs = videoPresentationOffsetMsV001({
    firstPts: videoFirstPts,
    timeBase: video.time_base,
    containerStartTimeMs,
  });
  if (!Number.isFinite(presentationOffsetMs) || presentationOffsetMs < 0) {
    throwBuild('BASE_MEDIA_VIDEO_SOURCE_CLOCK_INVALID', '$source.video.presentationOffsetMs', {
      firstPts: videoFirstPts,
      timeBase: video.time_base,
      containerStartTimeMs,
    });
  }
  let audioInspection = {present: false};
  let audioClock = null;
  if (audio) {
    if (audioFrameCount === 0) throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$source.audio.frames');
    const insertedSilenceSampleCount = audioSpans.reduce(
      (sum, span) => sum + span.endSample - span.startSample,
      0,
    );
    if (audioDecodedPayloadSampleCount + insertedSilenceSampleCount !== audioPreviousEnd) {
      throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$.source.audio.frames.coverage', {
        decodedPayloadSampleCount: audioDecodedPayloadSampleCount,
        insertedSilenceSampleCount,
        decodedEndSample: audioPreviousEnd,
      });
    }
    const presentationClock = await inspectSourceAudioPresentationClockV001(
      sourcePath,
      audio,
      sampleRate,
      audioPreviousEnd,
    );
    audioInspection = {
      present: true,
      codec: audio.codec_name,
      sampleRate,
      channels,
      channelLayout: audio.channel_layout,
      timeBase: audio.time_base,
      firstDecodedPts: audioFirstPts,
      lastDecodedPts: audioLastPts,
      presentationClock,
    };
    audioClock = {
      sampleRate,
      channels,
      channelLayout: audio.channel_layout,
      spans: audioSpans,
      sourceGridSampleCount: audioPreviousEnd,
      sourceGridMappingEndSample: presentationClock.endSample,
      decodedTailPaddingSampleCount: audioPreviousEnd - presentationClock.endSample,
    };
  }
  const logicalFrameCount = logicalSourceFrameCountV002(video.r_frame_rate, videoFrameCount);
  return {
    source: {
      streamConfiguration: {
        videoCount: videos.length,
        audioCount: audios.length,
        videoStreamIndex: video.index,
        audioStreamIndex: audio?.index ?? null,
      },
      video: {
        width: video.width,
        height: video.height,
        frameRate: video.r_frame_rate,
        timeBase: video.time_base,
        decodedFrameCount: videoFrameCount,
        firstPts: videoFirstPts,
        lastPts: videoLastPts,
        ptsStep,
        containerStartTimeMs,
        presentationOffsetMs,
        clockAuthority: 'container-zero-video-stream-offset-v001',
        rotation,
      },
      audio: audioInspection,
    },
    fps,
    decodedFrameCount: videoFrameCount,
    logicalFrameCount,
    videoClock: {
      containerStartTimeMs,
      streamTimeBase: video.time_base,
      firstPts: videoFirstPts,
      lastPts: videoLastPts,
      ptsStep,
      presentationOffsetMs,
    },
    audioClock,
  };
};

const buildSegmentMappings = (segments, sourceClock, audioClock) => {
  if (!exactFields(sourceClock, [
    'fps', 'decodedFrameCount', 'logicalFrameCount', 'presentationOffsetMs',
  ])
      || ![30, 60].includes(sourceClock.fps)
      || !isInteger(sourceClock.decodedFrameCount) || sourceClock.decodedFrameCount <= 0
      || !isInteger(sourceClock.logicalFrameCount) || sourceClock.logicalFrameCount <= 0
      || sourceClock.logicalFrameCount !== logicalSourceFrameCountV002(
        `${sourceClock.fps}/1`,
        sourceClock.decodedFrameCount,
      )) {
    throwBuild('BASE_MEDIA_SEGMENT_INVALID', '$sourceClock');
  }
  if (!isInteger(sourceClock.presentationOffsetMs) || sourceClock.presentationOffsetMs < 0) {
    throwBuild('BASE_MEDIA_VIDEO_SOURCE_CLOCK_INVALID', '$sourceClock.presentationOffsetMs', {
      actual: sourceClock.presentationOffsetMs,
    });
  }
  const {fps, decodedFrameCount, logicalFrameCount, presentationOffsetMs} = sourceClock;
  const mappings = [];
  let previous = null;
  let outputFrame = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const pathValue = `$.payload.segments[${index}]`;
    if (!exactFields(segment, ['sourceStartMs', 'sourceEndMs'])
        || !isInteger(segment.sourceStartMs) || !isInteger(segment.sourceEndMs)
        || segment.sourceStartMs < 0 || segment.sourceStartMs >= segment.sourceEndMs) {
      throwBuild('BASE_MEDIA_SEGMENT_INVALID', pathValue, segment);
    }
    if (previous && segment.sourceStartMs < previous.sourceStartMs) {
      throwBuild('BASE_MEDIA_SEGMENT_ORDER_INVALID', pathValue, {reason: 'not_ascending'});
    }
    if (previous && segment.sourceStartMs < previous.sourceEndMs) {
      throwBuild('BASE_MEDIA_SEGMENT_ORDER_INVALID', pathValue, {reason: 'positive_overlap'});
    }
    const sourceStartFrame30 = frameBoundaryWithVideoOffsetV001(
      segment.sourceStartMs,
      presentationOffsetMs,
    );
    const sourceEndFrame30 = sourceEndFrameBoundaryWithVideoOffsetV001(segment.sourceEndMs, {
      inputFrameRate: `${fps}/1`,
      decodedFrameCount,
      videoPresentationOffsetMs: presentationOffsetMs,
    });
    if (sourceEndFrame30 <= sourceStartFrame30) {
      throwBuild('BASE_MEDIA_FRAME_MAPPING_UNREPRESENTABLE', pathValue, {
        sourceStartFrame30, sourceEndFrame30,
      });
    }
    if (sourceStartFrame30 < 0 || sourceEndFrame30 > logicalFrameCount) {
      throwBuild('BASE_MEDIA_SEGMENT_OUT_OF_SOURCE', pathValue, {logicalFrameCount, sourceStartFrame30, sourceEndFrame30});
    }
    // ms端点を30fpsへ丸めた結果だけで判定すると、source終端を僅かに越えた値が
    // 最終frame境界へ吸収される。入力fps×decoded frame数の有理比較で先に拒否する。
    if (BigInt(segment.sourceEndMs - presentationOffsetMs) * BigInt(fps)
        > BigInt(decodedFrameCount) * 1000n) {
      throwBuild('BASE_MEDIA_SEGMENT_OUT_OF_SOURCE', pathValue, {
        sourceEndMs: segment.sourceEndMs,
        sourceFps: fps,
        decodedFrameCount,
      });
    }
    const frameLength = sourceEndFrame30 - sourceStartFrame30;
    const mapping = {
      segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      sourceStartFrame30,
      sourceEndFrame30,
      outputStartFrame: outputFrame,
      outputEndFrame: outputFrame + frameLength,
      audioSamples: null,
    };
    if (audioClock) {
      const samplesPerVideoFrame = audioClock.sampleRate / 30;
      const offsetSamples = presentationOffsetMs * audioClock.sampleRate / 1000;
      if (!Number.isInteger(samplesPerVideoFrame)) {
        throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$source.audio.sampleRate');
      }
      if (!Number.isInteger(offsetSamples)) {
        throwBuild('BASE_MEDIA_VIDEO_SOURCE_CLOCK_INVALID', '$source.video.presentationOffsetMs', {
          presentationOffsetMs,
          sampleRate: audioClock.sampleRate,
        });
      }
      const sourceStartSample = offsetSamples + sourceStartFrame30 * samplesPerVideoFrame;
      const nominalSourceEndSample = offsetSamples + sourceEndFrame30 * samplesPerVideoFrame;
      const outputStartSample = outputFrame * samplesPerVideoFrame;
      let sourceEndSample = nominalSourceEndSample;
      if (nominalSourceEndSample > audioClock.sourceGridMappingEndSample) {
        const decodedMediaEndMs = decodedMediaEndMsWithVideoOffsetV001(
          `${fps}/1`,
          decodedFrameCount,
          presentationOffsetMs,
        );
        const terminalSourceAudioShortfall = index === segments.length - 1
          && segment.sourceEndMs === decodedMediaEndMs
          && audioClock.sourceGridMappingEndSample > sourceStartSample;
        if (!terminalSourceAudioShortfall) {
          throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', pathValue, {
            sourceEndSample: nominalSourceEndSample,
            sourceGridMappingEndSample: audioClock.sourceGridMappingEndSample,
          });
        }
        // 存在しない末尾音声を無音で創作しない。source packet時計で提示が
        // 確認された最後sampleまでだけをcopyし、video-only尾はmanifestで明示する。
        sourceEndSample = audioClock.sourceGridMappingEndSample;
      }
      const copiedSampleCount = sourceEndSample - sourceStartSample;
      mapping.audioSamples = {
        sourceStart: sourceStartSample,
        sourceEnd: sourceEndSample,
        outputStart: outputStartSample,
        outputEnd: outputStartSample + copiedSampleCount,
      };
    }
    mappings.push(mapping);
    outputFrame += frameLength;
    previous = segment;
  }
  return mappings;
};

export const validatePresentationBaseMediaSegmentPlanV002 = (
  segments,
  sourceClock,
  audioClock = null,
) => {
  try {
    return {status: 'passed', violations: [], mappings: buildSegmentMappings(segments, sourceClock, audioClock)};
  } catch (error) {
    if (error instanceof BaseMediaBuildError) {
      return {status: 'failed', violations: [error.violation], mappings: null};
    }
    throw error;
  }
};

const videoFilterGraph = (fps, segments) => {
  const extraction = fps === 60
    ? "[0:v]select='not(mod(n\\,2))',setpts=N/(30*TB)"
    : '[0:v]setpts=N/(30*TB)';
  if (segments.length === 1) {
    const item = segments[0];
    return `${extraction},trim=start_frame=${item.sourceStartFrame30}:end_frame=${item.sourceEndFrame30},setpts=PTS-STARTPTS,fps=30,setpts=N/(30*TB)[outv]`;
  }
  const splitOutputs = segments.map((_, index) => `[v${index}]`).join('');
  const trims = segments.map((item, index) => (
    `[v${index}]trim=start_frame=${item.sourceStartFrame30}:end_frame=${item.sourceEndFrame30},setpts=PTS-STARTPTS[s${index}]`
  ));
  const concatInputs = segments.map((_, index) => `[s${index}]`).join('');
  return [
    `${extraction},split=${segments.length}${splitOutputs}`,
    ...trims,
    `${concatInputs}concat=n=${segments.length}:v=1:a=0[concatv]`,
    '[concatv]fps=30,setpts=N/(30*TB)[outv]',
  ].join(';');
};

export const buildPresentationBaseMediaVideoV001 = async (sourcePath, outputPath, fps, segments) => {
  const graph = videoFilterGraph(fps, segments);
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', sourcePath,
    '-filter_complex', graph, '-map', '[outv]', '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-movie_timescale', '30', '-map_metadata', '-1', outputPath,
  ];
  try {
    await run('ffmpeg', args);
  } catch (error) {
    throwBuild('BASE_MEDIA_BUILD_FAILED', '$ffmpeg.video', {message: error.message});
  }
  return {graph, args};
};

const AUDIO_GRID_MOVE_BUFFER_BYTE_COUNT = 1024 * 1024;

const alignedAudioBufferByteCount = (bytesPerSampleFrame) => {
  const aligned = Math.floor(AUDIO_GRID_MOVE_BUFFER_BYTE_COUNT / bytesPerSampleFrame)
    * bytesPerSampleFrame;
  return Math.max(bytesPerSampleFrame, aligned);
};

const readFileRangeExact = async (handle, buffer, byteCount, position, pathValue) => {
  let total = 0;
  while (total < byteCount) {
    const {bytesRead} = await handle.read(buffer, total, byteCount - total, position + total);
    if (bytesRead === 0) {
      throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', pathValue, {
        position,
        requested: byteCount,
        actual: total,
      });
    }
    total += bytesRead;
  }
};

const writeFileRangeExact = async (handle, buffer, byteCount, position, pathValue) => {
  let total = 0;
  while (total < byteCount) {
    const {bytesWritten} = await handle.write(buffer, total, byteCount - total, position + total);
    if (bytesWritten === 0) {
      throwBuild('BASE_MEDIA_BUILD_FAILED', pathValue, {
        position,
        requested: byteCount,
        actual: total,
      });
    }
    total += bytesWritten;
  }
};

const hashFileRange = async (handle, byteStart, byteCount, buffer, pathValue) => {
  const hash = createHash('sha256');
  let offset = 0;
  while (offset < byteCount) {
    const requested = Math.min(buffer.length, byteCount - offset);
    await readFileRangeExact(handle, buffer, requested, byteStart + offset, pathValue);
    hash.update(buffer.subarray(0, requested));
    offset += requested;
  }
  return hash.digest('hex');
};

/**
 * decoded frame時計の空白列から、前詰めPCMと絶対sample格子の対応を決める。
 * manifest契約を増やさず、audio-grid工程内だけで使う決定的な内部計画である。
 */
export const buildPresentationAudioGridPlacementPlanV001 = (audioClock) => {
  if (!isObject(audioClock)
      || !isInteger(audioClock.sourceGridSampleCount)
      || audioClock.sourceGridSampleCount <= 0
      || !Array.isArray(audioClock.spans)) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.placementPlan');
  }
  const absoluteSampleCount = audioClock.sourceGridSampleCount;
  const gaps = [];
  const runs = [];
  let absoluteCursor = 0;
  let rawCursor = 0;
  let gapSampleCount = 0;
  const addRunUntil = (targetEndSample) => {
    if (targetEndSample === absoluteCursor) return;
    const sampleCount = targetEndSample - absoluteCursor;
    runs.push({
      runId: `run-${String(runs.length + 1).padStart(6, '0')}`,
      sourceStartSample: rawCursor,
      sourceEndSample: rawCursor + sampleCount,
      targetStartSample: absoluteCursor,
      targetEndSample,
    });
    rawCursor += sampleCount;
    absoluteCursor = targetEndSample;
  };
  audioClock.spans.forEach((span, index) => {
    if (!isObject(span)
        || !isInteger(span.startSample)
        || !isInteger(span.endSample)
        || span.startSample < absoluteCursor
        || span.startSample >= span.endSample
        || span.endSample > absoluteSampleCount) {
      throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', `$audio.insertedSilenceSpans[${index}]`, {
        span,
        previousEndSample: absoluteCursor,
        absoluteSampleCount,
      });
    }
    addRunUntil(span.startSample);
    gaps.push({
      gapId: `gap-${String(gaps.length + 1).padStart(6, '0')}`,
      startSample: span.startSample,
      endSample: span.endSample,
    });
    gapSampleCount += span.endSample - span.startSample;
    absoluteCursor = span.endSample;
  });
  addRunUntil(absoluteSampleCount);
  if (absoluteCursor !== absoluteSampleCount
      || rawCursor + gapSampleCount !== absoluteSampleCount) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.placementPlan.coverage', {
      rawSampleCount: rawCursor,
      gapSampleCount,
      absoluteSampleCount,
      coveredEndSample: absoluteCursor,
    });
  }
  let coverageCursor = 0;
  const coverage = [
    ...runs.map((run) => ({kind: 'run', startSample: run.targetStartSample, endSample: run.targetEndSample})),
    ...gaps.map((gap) => ({kind: 'gap', startSample: gap.startSample, endSample: gap.endSample})),
  ].sort((left, right) => left.startSample - right.startSample || left.endSample - right.endSample);
  for (const item of coverage) {
    if (item.startSample !== coverageCursor || item.endSample <= item.startSample) {
      throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.placementPlan.coverage', {
        expectedStartSample: coverageCursor,
        item,
      });
    }
    coverageCursor = item.endSample;
  }
  if (coverageCursor !== absoluteSampleCount) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.placementPlan.coverage', {
      expectedEndSample: absoluteSampleCount,
      actualEndSample: coverageCursor,
    });
  }
  return {
    rawSampleCount: rawCursor,
    gapSampleCount,
    absoluteSampleCount,
    runs,
    gaps,
  };
};

export const verifyPresentationAudioGridPlacementV001 = async ({
  gridPath,
  bytesPerSampleFrame,
  plan,
  runPayloadSha256,
}) => {
  const expectedByteCount = plan.absoluteSampleCount * bytesPerSampleFrame;
  const actualByteCount = (await stat(gridPath)).size;
  if (actualByteCount !== expectedByteCount) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.placementLength', {
      expected: expectedByteCount,
      actual: actualByteCount,
    });
  }
  if (!Array.isArray(runPayloadSha256)
      || runPayloadSha256.length !== plan.runs.length) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.runPayloadSha256');
  }
  const handle = await open(gridPath, 'r');
  const buffer = Buffer.allocUnsafe(alignedAudioBufferByteCount(bytesPerSampleFrame));
  try {
    for (let index = 0; index < plan.runs.length; index += 1) {
      const run = plan.runs[index];
      const expectedHash = runPayloadSha256[index];
      const actualHash = await hashFileRange(
        handle,
        run.targetStartSample * bytesPerSampleFrame,
        (run.targetEndSample - run.targetStartSample) * bytesPerSampleFrame,
        buffer,
        '$audio.sourceGrid.runPayload',
      );
      if (!SHA256_PATTERN.test(expectedHash ?? '') || actualHash !== expectedHash) {
        throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$audio.sourceGrid.runPayload', {
          runId: run.runId,
          expected: expectedHash ?? null,
          actual: actualHash,
        });
      }
    }
    for (const gap of plan.gaps) {
      let byteOffset = gap.startSample * bytesPerSampleFrame;
      const byteEnd = gap.endSample * bytesPerSampleFrame;
      while (byteOffset < byteEnd) {
        const requested = Math.min(buffer.length, byteEnd - byteOffset);
        await readFileRangeExact(
          handle,
          buffer,
          requested,
          byteOffset,
          '$audio.insertedSilenceSpans',
        );
        for (let index = 0; index < requested; index += 1) {
          if (buffer[index] !== 0) {
            throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$audio.insertedSilenceSpans', {
              gapId: gap.gapId,
              startSample: gap.startSample,
              endSample: gap.endSample,
              firstNonZeroByteOffset: byteOffset + index,
            });
          }
        }
        byteOffset += requested;
      }
    }
  } finally {
    await handle.close();
  }
  return {
    status: 'passed',
    sampleCount: plan.absoluteSampleCount,
    byteCount: expectedByteCount,
    runCount: plan.runs.length,
    gapCount: plan.gaps.length,
  };
};

export const placePresentationAudioGridV001 = async ({
  gridPath,
  bytesPerSampleFrame,
  audioClock,
}) => {
  const plan = buildPresentationAudioGridPlacementPlanV001(audioClock);
  const initialByteCount = (await stat(gridPath)).size;
  const expectedRawByteCount = plan.rawSampleCount * bytesPerSampleFrame;
  if (initialByteCount !== expectedRawByteCount) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.rawSampleCount', {
      expected: plan.rawSampleCount,
      actual: initialByteCount / bytesPerSampleFrame,
      expectedByteCount: expectedRawByteCount,
      actualByteCount: initialByteCount,
    });
  }
  const handle = await open(gridPath, 'r+');
  const buffer = Buffer.allocUnsafe(alignedAudioBufferByteCount(bytesPerSampleFrame));
  const zeroBuffer = Buffer.alloc(buffer.length, 0);
  const runPayloadSha256 = [];
  try {
    for (const run of plan.runs) {
      runPayloadSha256.push(await hashFileRange(
        handle,
        run.sourceStartSample * bytesPerSampleFrame,
        (run.sourceEndSample - run.sourceStartSample) * bytesPerSampleFrame,
        buffer,
        '$audio.sourceGrid.rawPayload',
      ));
    }
    await handle.truncate(plan.absoluteSampleCount * bytesPerSampleFrame);
    for (let runIndex = plan.runs.length - 1; runIndex >= 0; runIndex -= 1) {
      const run = plan.runs[runIndex];
      let remaining = (run.sourceEndSample - run.sourceStartSample) * bytesPerSampleFrame;
      const sourceStartByte = run.sourceStartSample * bytesPerSampleFrame;
      const targetStartByte = run.targetStartSample * bytesPerSampleFrame;
      while (remaining > 0) {
        const requested = Math.min(buffer.length, remaining);
        const sourcePosition = sourceStartByte + remaining - requested;
        const targetPosition = targetStartByte + remaining - requested;
        await readFileRangeExact(
          handle,
          buffer,
          requested,
          sourcePosition,
          '$audio.sourceGrid.move.read',
        );
        await writeFileRangeExact(
          handle,
          buffer,
          requested,
          targetPosition,
          '$audio.sourceGrid.move.write',
        );
        remaining -= requested;
      }
    }
    for (const gap of plan.gaps) {
      let byteOffset = gap.startSample * bytesPerSampleFrame;
      const byteEnd = gap.endSample * bytesPerSampleFrame;
      while (byteOffset < byteEnd) {
        const requested = Math.min(zeroBuffer.length, byteEnd - byteOffset);
        await writeFileRangeExact(
          handle,
          zeroBuffer,
          requested,
          byteOffset,
          '$audio.insertedSilenceSpans.write',
        );
        byteOffset += requested;
      }
    }
  } finally {
    await handle.close();
  }
  await verifyPresentationAudioGridPlacementV001({
    gridPath,
    bytesPerSampleFrame,
    plan,
    runPayloadSha256,
  });
  return {plan, runPayloadSha256};
};

export const buildPresentationBaseMediaAudioV001 = async (sourcePath, tempDirectory, audioClock, mappings) => {
  if (!audioClock) return {present: false};
  const gridPath = path.join(tempDirectory, 'source-grid.f32le');
  const gridArguments = [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', sourcePath, '-map', '0:a:0',
    '-ar', String(audioClock.sampleRate), '-ac', String(audioClock.channels),
    '-c:a', 'pcm_f32le', '-f', 'f32le', gridPath,
  ];
  try {
    await run('ffmpeg', gridArguments);
  } catch (error) {
    throwBuild('BASE_MEDIA_BUILD_FAILED', '$ffmpeg.audioDecode', {message: error.message});
  }
  const bytesPerSampleFrame = audioClock.channels * 4;
  const rawSourceGridByteCount = (await stat(gridPath)).size;
  if (rawSourceGridByteCount % bytesPerSampleFrame !== 0) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.byteCount');
  }
  const placement = await placePresentationAudioGridV001({
    gridPath,
    bytesPerSampleFrame,
    audioClock,
  });
  const decodedSourceGridSampleCount = placement.plan.absoluteSampleCount;
  if (audioClock.sourceGridMappingEndSample > decodedSourceGridSampleCount
      || decodedSourceGridSampleCount - audioClock.sourceGridMappingEndSample
        !== audioClock.decodedTailPaddingSampleCount) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.mappingEndSample', {
      decodedSourceGridSampleCount,
      mappingEndSample: audioClock.sourceGridMappingEndSample,
      decodedTailPaddingSampleCount: audioClock.decodedTailPaddingSampleCount,
    });
  }
  // decoderがcodec frame幅へ展開した末尾paddingは診断値にだけ残す。
  // mappingに使うcanonical PCM自体はsource packetの提示終端で物理的に切る。
  await truncate(gridPath, audioClock.sourceGridMappingEndSample * bytesPerSampleFrame);
  const sourceGridSampleCount = audioClock.sourceGridMappingEndSample;
  const canonicalSourceGridByteCount = (await stat(gridPath)).size;
  if (canonicalSourceGridByteCount !== sourceGridSampleCount * bytesPerSampleFrame) {
    throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.byteCount', {
      expected: sourceGridSampleCount * bytesPerSampleFrame,
      actual: canonicalSourceGridByteCount,
    });
  }
  const encodePath = path.join(tempDirectory, 'encode-input.f32le');
  const sourceHandle = await open(gridPath, 'r');
  const outputHandle = await open(encodePath, 'w');
  let outputOffset = 0;
  const copyBuffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (const mapping of mappings) {
      let sourceOffset = mapping.audioSamples.sourceStart * bytesPerSampleFrame;
      const sourceEnd = mapping.audioSamples.sourceEnd * bytesPerSampleFrame;
      while (sourceOffset < sourceEnd) {
        const requested = Math.min(copyBuffer.length, sourceEnd - sourceOffset);
        const {bytesRead} = await sourceHandle.read(copyBuffer, 0, requested, sourceOffset);
        if (bytesRead !== requested) {
          throwBuild('BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID', '$audio.sourceGrid.read', {
            sourceOffset, requested, bytesRead,
          });
        }
        const {bytesWritten} = await outputHandle.write(copyBuffer, 0, bytesRead, outputOffset);
        if (bytesWritten !== bytesRead) throwBuild('BASE_MEDIA_BUILD_FAILED', '$audio.encodeInput.write');
        sourceOffset += bytesRead;
        outputOffset += bytesWritten;
      }
    }
  } finally {
    await Promise.all([sourceHandle.close(), outputHandle.close()]);
  }
  const encodeByteCount = (await stat(encodePath)).size;
  // sample数だけでなく、選択したsource PCMの内容・区間順・interleaved channel順が
  // encode入力へbyte単位で保存されたことを、書込み経路とは別の再読で確かめる。
  const verifySource = await open(gridPath, 'r');
  const verifyOutput = await open(encodePath, 'r');
  const sourceBuffer = Buffer.allocUnsafe(1024 * 1024);
  const outputBuffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (const mapping of mappings) {
      let sourceOffset = mapping.audioSamples.sourceStart * bytesPerSampleFrame;
      let outputVerifyOffset = mapping.audioSamples.outputStart * bytesPerSampleFrame;
      const sourceEnd = mapping.audioSamples.sourceEnd * bytesPerSampleFrame;
      while (sourceOffset < sourceEnd) {
        const requested = Math.min(sourceBuffer.length, sourceEnd - sourceOffset);
        const [sourceRead, outputRead] = await Promise.all([
          verifySource.read(sourceBuffer, 0, requested, sourceOffset),
          verifyOutput.read(outputBuffer, 0, requested, outputVerifyOffset),
        ]);
        if (sourceRead.bytesRead !== requested
            || outputRead.bytesRead !== requested
            || !sourceBuffer.subarray(0, requested).equals(outputBuffer.subarray(0, requested))) {
          throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$audio.encodeInput.content', {
            segmentId: mapping.segmentId,
            sourceOffset,
            outputOffset: outputVerifyOffset,
          });
        }
        sourceOffset += requested;
        outputVerifyOffset += requested;
      }
    }
  } finally {
    await Promise.all([verifySource.close(), verifyOutput.close()]);
  }
  return {
    present: true,
    sourceGridPath: gridPath,
    encodePath,
    sourceGridSampleCount,
    sourceGridByteCount: canonicalSourceGridByteCount,
    decodedSourceGridSampleCount,
    decodedTailPaddingSampleCount: audioClock.decodedTailPaddingSampleCount,
    sourceGridPayloadSha256: await fileSha256Streaming(gridPath),
    encodeByteCount,
    encodePayloadSha256: await fileSha256Streaming(encodePath),
    encodeSampleCount: encodeByteCount / bytesPerSampleFrame,
    gridArguments,
  };
};

export const muxPresentationBaseMediaV001 = async (videoPath, outputPath, audioClock, audioData) => {
  if (!audioData.present) {
    await rename(videoPath, outputPath);
    return null;
  }
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', videoPath,
    '-f', 'f32le', '-ar', String(audioClock.sampleRate), '-ac', String(audioClock.channels),
    '-channel_layout', audioClock.channelLayout, '-i', audioData.encodePath,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-ar', String(audioClock.sampleRate), '-ac', String(audioClock.channels),
    '-channel_layout', audioClock.channelLayout, '-movie_timescale', '30',
    '-movflags', '+faststart', '-map_metadata', '-1', outputPath,
  ];
  try {
    await run('ffmpeg', args);
  } catch (error) {
    throwBuild('BASE_MEDIA_BUILD_FAILED', '$ffmpeg.audioEncode', {message: error.message});
  }
  return {args};
};

const packetPayloadHash = async (mediaPath) => {
  const result = await runHashStdout('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', mediaPath, '-map', '0:a:0', '-c', 'copy', '-f', 'data', '-',
  ]);
  return result.payloadSha256;
};

const readExactAt = async (handle, length, position) => {
  const buffer = Buffer.alloc(length);
  const {bytesRead} = await handle.read(buffer, 0, length, position);
  return bytesRead === length ? buffer : null;
};

/** FFprobeが露出しないMP4 mvhd timescaleをcontainer byteから直接読む。 */
export const inspectMp4MovieTimeScaleV001 = async (mediaPath) => {
  const handle = await open(mediaPath, 'r');
  try {
    const fileSize = (await handle.stat()).size;
    const readBoxHeader = async (offset, limit) => {
      const header = await readExactAt(handle, 8, offset);
      if (!header) return null;
      let size = header.readUInt32BE(0);
      const type = header.toString('ascii', 4, 8);
      let headerSize = 8;
      if (size === 1) {
        const extended = await readExactAt(handle, 8, offset + 8);
        if (!extended) return null;
        const largeSize = extended.readBigUInt64BE(0);
        if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
        size = Number(largeSize);
        headerSize = 16;
      } else if (size === 0) {
        size = limit - offset;
      }
      if (size < headerSize || offset + size > limit) return null;
      return {offset, size, type, headerSize, payloadOffset: offset + headerSize};
    };
    let topOffset = 0;
    let moov = null;
    while (topOffset < fileSize) {
      const box = await readBoxHeader(topOffset, fileSize);
      if (!box) return null;
      if (box.type === 'moov') {
        moov = box;
        break;
      }
      topOffset += box.size;
    }
    if (!moov) return null;
    let childOffset = moov.payloadOffset;
    const moovEnd = moov.offset + moov.size;
    while (childOffset < moovEnd) {
      const box = await readBoxHeader(childOffset, moovEnd);
      if (!box) return null;
      if (box.type === 'mvhd') {
        const version = await readExactAt(handle, 1, box.payloadOffset);
        if (!version || ![0, 1].includes(version[0])) return null;
        const timeScaleOffset = box.payloadOffset + (version[0] === 0 ? 12 : 20);
        const timeScale = await readExactAt(handle, 4, timeScaleOffset);
        return timeScale?.readUInt32BE(0) ?? null;
      }
      childOffset += box.size;
    }
    return null;
  } finally {
    await handle.close();
  }
};

export const inspectPresentationBaseMediaOutputV001 = async (
  mediaPath,
  expectedFrames,
  audioClock,
  audioData,
) => {
  const probe = await ffprobeJson(['-show_streams', mediaPath]);
  const videos = (probe.streams ?? []).filter((stream) => stream.codec_type === 'video');
  const audios = (probe.streams ?? []).filter((stream) => stream.codec_type === 'audio');
  let videoFrameCount = 0;
  await forEachFfprobeLine([
    '-select_streams', 'v:0', '-show_frames', '-show_entries', 'frame=media_type',
    '-of', 'compact=p=0', mediaPath,
  ], (line) => {
    if (parseCompactFields(line).media_type === 'video') videoFrameCount += 1;
  });
  const movieTimeScale = await inspectMp4MovieTimeScaleV001(mediaPath);
  if (videos.length !== 1 || videoFrameCount !== expectedFrames
      || videos[0].width !== 1920 || videos[0].height !== 1080
      || videos[0].r_frame_rate !== '30/1' || videos[0].avg_frame_rate !== '30/1'
      || movieTimeScale !== 30) {
    throwBuild('BASE_MEDIA_VIDEO_QC_FAILED', '$output.video', {
      videoCount: videos.length, frameCount: videoFrameCount, expectedFrames, movieTimeScale,
    });
  }
  if (!audioData.present) {
    if (audios.length !== 0) throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$output.audio', {expected: 0, actual: audios.length});
    return {frameCount: videoFrameCount, audio: {present: false}, decodedFramePayloadSha256: await decodedVideoHash(mediaPath)};
  }
  if (audios.length !== 1) throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$output.audio', {expected: 1, actual: audios.length});
  const stream = audios[0];
  if (Number(stream.sample_rate) !== audioClock.sampleRate
      || Number(stream.channels) !== audioClock.channels
      || stream.channel_layout !== audioClock.channelLayout
      || stream.codec_name !== 'aac') {
    throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$output.audio.format', stream);
  }
  const containerDurationSamples = rationalToInteger(
    `${Number(stream.duration_ts) * Number(parseRational(stream.time_base)?.numerator ?? 0)}/${parseRational(stream.time_base)?.denominator ?? 1}`,
    audioClock.sampleRate,
  );
  if (!Number.isInteger(containerDurationSamples)) {
    throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$output.audio.duration', {
      durationTs: stream.duration_ts,
      timeBase: stream.time_base,
    });
  }
  const samplesPerVideoFrame = audioClock.sampleRate / 30;
  const videoPresentationDurationSamples = expectedFrames * samplesPerVideoFrame;
  if (!Number.isInteger(samplesPerVideoFrame)
      || containerDurationSamples < audioData.encodeSampleCount
      || containerDurationSamples > videoPresentationDurationSamples) {
    throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$output.audio.videoAlignment', {
      audioInputSampleCount: audioData.encodeSampleCount,
      containerDurationSamples,
      videoPresentationDurationSamples,
    });
  }
  const rawDecode = await runHashStdout('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', mediaPath, '-map', '0:a:0',
    '-ar', String(audioClock.sampleRate), '-ac', String(audioClock.channels),
    '-c:a', 'pcm_f32le', '-f', 'f32le', '-',
  ]);
  const effectiveDecode = await runHashStdout('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', mediaPath, '-map', '0:a:0',
    '-af', `atrim=end_sample=${audioData.encodeSampleCount}`,
    '-ar', String(audioClock.sampleRate), '-ac', String(audioClock.channels),
    '-c:a', 'pcm_f32le', '-f', 'f32le', '-',
  ]);
  const bytesPerSampleFrame = audioClock.channels * 4;
  const rawDecodedSampleCount = rawDecode.byteCount / bytesPerSampleFrame;
  const effectiveDecodedSampleCount = effectiveDecode.byteCount / bytesPerSampleFrame;
  if (!Number.isInteger(rawDecodedSampleCount)
      || effectiveDecodedSampleCount !== audioData.encodeSampleCount) {
    throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$output.audio.decodeSamples', {
      rawDecodedSampleCount, effectiveDecodedSampleCount, expected: audioData.encodeSampleCount,
    });
  }
  let skipSamples = 0;
  let discardPadding = 0;
  let packetPresentationDurationSamples = 0;
  let expectedPacketPts = 0;
  let packetTimelineInvalid = false;
  await forEachFfprobeLine([
    '-select_streams', 'a:0', '-show_packets',
    '-show_entries', 'packet=pts,duration:packet_side_data=skip_samples,discard_padding',
    '-of', 'compact=p=0', mediaPath,
  ], (line) => {
    const fields = parseCompactFields(line);
    const packetPts = Number(fields.pts);
    const packetDuration = Number(fields.duration);
    if (!Number.isInteger(packetPts) || !Number.isInteger(packetDuration) || packetDuration <= 0) {
      packetTimelineInvalid = true;
    } else if (packetPts < 0) {
      if (packetPts + packetDuration > 0) packetTimelineInvalid = true;
    } else {
      if (packetPts !== expectedPacketPts) packetTimelineInvalid = true;
      expectedPacketPts = packetPts + packetDuration;
      packetPresentationDurationSamples = Math.max(packetPresentationDurationSamples, expectedPacketPts);
    }
    if (fields.skip_samples !== undefined && skipSamples === 0) skipSamples = Number(fields.skip_samples);
    if (fields.discard_padding !== undefined && discardPadding === 0) {
      discardPadding = Number(fields.discard_padding);
    }
  });
  if (packetTimelineInvalid || packetPresentationDurationSamples !== audioData.encodeSampleCount) {
    throwBuild('BASE_MEDIA_AUDIO_QC_FAILED', '$output.audio.packetTimeline', {
      packetTimelineInvalid,
      packetPresentationDurationSamples,
      expectedPresentationDurationSamples: audioData.encodeSampleCount,
    });
  }
  const trailingVideoOnlySampleCount = videoPresentationDurationSamples
    - packetPresentationDurationSamples;
  return {
    frameCount: videoFrameCount,
    decodedFramePayloadSha256: await decodedVideoHash(mediaPath),
    audio: {
      present: true,
      codec: stream.codec_name,
      timeBase: stream.time_base,
      startPts: Number(stream.start_pts ?? 0),
      durationTs: Number(stream.duration_ts),
      containerDurationSamples,
      presentationDurationSamples: packetPresentationDurationSamples,
      videoPresentationDurationSamples,
      trailingVideoOnlySampleCount,
      tailPolicy: trailingVideoOnlySampleCount === 0
        ? 'frame-aligned-v001'
        : 'source-audio-ended-no-padding-v001',
      rawDecodedSampleCount,
      effectiveDecodedSampleCount,
      effectiveDecodedPayloadSha256: effectiveDecode.payloadSha256,
      packetPayloadSha256: await packetPayloadHash(mediaPath),
      skipSamples,
      discardPadding,
      encoderDelay: skipSamples,
    },
  };
};

const decodedVideoHash = async (mediaPath) => {
  const decoded = await runHashStdout('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', mediaPath, '-map', '0:v:0',
    '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-',
  ]);
  return decoded.payloadSha256;
};

const inspectGitState = async () => {
  const [head, dirty] = await Promise.all([
    run('git', ['rev-parse', 'HEAD']),
    run('git', ['status', '--porcelain=v1', '--untracked-files=normal']),
  ]);
  return {head: head.stdout.toString().trim(), dirty: dirty.stdout.length > 0};
};

const verifyPinnedImplementationFiles = async () => {
  for (const [filePath, expected] of Object.entries(EXPECTED_IMPLEMENTATION_HASHES)) {
    const actual = sha256Bytes(await readFile(filePath));
    if (actual !== expected) {
      throwBuild('BASE_MEDIA_TOOL_PROFILE_MISMATCH', '$implementationFiles', {
        path: repoPath(filePath), expected, actual,
      });
    }
  }
};

const implementationFiles = async () => Promise.all([BUILDER_PATH, TIMELINE_V004_PATH].map(async (filePath) => ({
  path: repoPath(filePath),
  fileSha256: sha256Bytes(await readFile(filePath)),
})));

const outputExtractionRule = (fps) => fps === 60
  ? 'source-frame-60fps-global-even-v001'
  : 'source-frame-30fps-identity-v001';

const makeTimeline = ({
  buildHash,
  sourceArtifact,
  sourceFps,
  sourceDecodedFrameCount,
  sourceVideoClock,
  mappings,
  baseMediaHash,
}) => ({
  schemaVersion: 'presentation-base-media-timeline-v003',
  timelineId: `timeline-${buildHash.slice(0, 24)}`,
  sourceProvenance: sourceArtifact.sourceProvenance,
  sourceRef: sourceArtifact.sourceRef,
  sourceFrameClock: {
    inputFrameRate: `${sourceFps}/1`,
    logicalFrameRate: '30/1',
    extractionRuleId: outputExtractionRule(sourceFps),
    decodedFrameCount: sourceDecodedFrameCount,
    containerStartTimeMs: sourceVideoClock.containerStartTimeMs,
    videoStreamTimeBase: sourceVideoClock.streamTimeBase,
    videoFirstPts: sourceVideoClock.firstPts,
    videoPtsStep: sourceVideoClock.ptsStep,
    videoPresentationOffsetMs: sourceVideoClock.presentationOffsetMs,
  },
  baseMedia: {
    artifactId: `base-media-${buildHash.slice(0, 24)}`,
    path: 'base-media.mp4',
    fileSha256: baseMediaHash,
    frameRate: '30/1',
    expectedFrameCount: mappings.at(-1).outputEndFrame,
  },
  segments: mappings.map(({audioSamples: _audioSamples, ...mapping}) => mapping),
});

const successChecks = () => Object.fromEntries([
  'approvalBinding', 'sourceBinding', 'videoQc', 'audioQc', 'timelineQc', 'hashGraph', 'publishPreconditions',
].map((key) => [key, {status: 'passed', violationCodes: []}]));

const createValidationReport = ({buildId, assembly, basis, source, timeline, manifestHash, baseHash}) => ({
  schemaVersion: PRESENTATION_BASE_MEDIA_VALIDATION_REPORT_SCHEMA_VERSION,
  buildId,
  status: 'passed',
  violations: [],
  inputs: {
    assemblyDecision: {path: assembly.path, fileSha256: assembly.fileSha256, payloadSha256: assembly.payloadSha256},
    basisEditPlan: {path: basis.path, fileSha256: basis.fileSha256},
    sourceMedia: {path: source.path, fileSha256: source.fileSha256},
  },
  outputs: {
    baseMedia: {artifactId: timeline.baseMedia.artifactId, path: 'base-media.mp4', fileSha256: baseHash},
    timeline: {timelineId: timeline.timelineId, path: 'timeline.json', fileSha256: sha256Bytes(`${JSON.stringify(timeline, null, 2)}\n`)},
    generationManifest: {buildId, path: 'generation-manifest.json', fileSha256: manifestHash},
  },
  checks: successChecks(),
});

const normalizeExecutionArguments = (argumentsList, replacements) => argumentsList.map((argument) => (
  replacements.get(argument) ?? argument
));

export const inspectPresentationBaseMediaTimelineQcV002 = (timeline, manifest, observed) => {
  const validation = validatePresentationBaseMediaTimelineV004(timeline, manifest, observed);
  if (validation.status !== 'passed') {
    throwBuild('BASE_MEDIA_TIMELINE_QC_FAILED', '$.timeline', {violations: validation.violations});
  }
  return validation;
};

export const commitPresentationBaseMediaOutputV001 = async (
  temporaryDirectory,
  outputDirectory,
  renameDirectory = rename,
) => {
  await assertSafePresentationBaseMediaPublishPathsV001(temporaryDirectory, outputDirectory);
  try {
    await renameDirectory(temporaryDirectory, outputDirectory);
  } catch (error) {
    throwBuild('BASE_MEDIA_ATOMIC_COMMIT_FAILED', '$.outputDirectory', {message: error.message});
  }
};

const validateJobFileContext = (jobInput, context) => {
  if (!Buffer.isBuffer(context.jobFileBytes)
      || !SHA256_PATTERN.test(context.jobFileSha256 ?? '')
      || sha256Bytes(context.jobFileBytes ?? Buffer.alloc(0)) !== context.jobFileSha256) {
    throwBuild('BASE_MEDIA_JOB_INVALID', '$jobFile', {reason: 'actual_job_file_bytes_required'});
  }
  let parsed;
  try {
    parsed = JSON.parse(context.jobFileBytes.toString('utf8'));
  } catch {
    throwBuild('BASE_MEDIA_JOB_INVALID', '$jobFile', {reason: 'actual_job_file_invalid_json'});
  }
  if (canonicalJson(parsed) !== canonicalJson(jobInput)) {
    throwBuild('BASE_MEDIA_JOB_INVALID', '$jobFile', {reason: 'job_input_differs_from_actual_file'});
  }
};

const makeRetainedBuildPaths = ({temporaryDirectory = null, workingDirectory = null, lockPath = null} = {}) => ({
  policy: 'retain-without-automatic-delete-v001',
  publicationTemporaryDirectory: temporaryDirectory === null ? null : repoPath(temporaryDirectory),
  workingDirectory: workingDirectory === null ? null : repoPath(workingDirectory),
  lockFile: lockPath === null ? null : repoPath(lockPath),
});

const attachRetainedBuildPaths = (result, retainedBuildPaths) => {
  if (result.status !== 'failed' || !Array.isArray(result.violations) || result.violations.length === 0) {
    return {...result, retainedBuildPaths};
  }
  const [first, ...rest] = result.violations;
  const previousDetails = isObject(first.details) ? first.details : {};
  return {
    ...result,
    violations: [{
      ...first,
      details: canonicalize({...previousDetails, retainedBuildPaths}),
    }, ...rest],
    retainedBuildPaths,
  };
};

export const executePresentationBaseMediaBuildV001 = async (jobInput, context = {}) => {
  const jobValidation = validatePresentationBaseMediaBuildJobV001(jobInput);
  const emptyRetainedBuildPaths = makeRetainedBuildPaths();
  if (jobValidation.status !== 'passed') {
    return attachRetainedBuildPaths(
      {status: 'failed', violations: jobValidation.violations},
      emptyRetainedBuildPaths,
    );
  }

  try {
    validateJobFileContext(jobInput, context);
  } catch (error) {
    return attachRetainedBuildPaths(
      {status: 'failed', violations: [error.violation]},
      emptyRetainedBuildPaths,
    );
  }

  let outputDirectory;
  let lockHandle = null;
  let lockPath = null;
  let ownsLock = false;
  let temporaryDirectory = null;
  let workingDirectory = null;
  const resultWithRetainedPaths = (result) => attachRetainedBuildPaths(result, makeRetainedBuildPaths({
    temporaryDirectory,
    workingDirectory,
    lockPath: ownsLock ? lockPath : null,
  }));
  try {
    const [observedTools, toolBinaryDiagnostics] = await Promise.all([
      inspectPresentationBaseMediaToolProfileV001(),
      inspectPresentationBaseMediaToolBinaryDiagnosticsV001(),
    ]);
    const toolCheck = evaluatePresentationBaseMediaToolProfileV001(observedTools);
    if (toolCheck.status !== 'passed') {
      return resultWithRetainedPaths({status: 'failed', violations: toolCheck.violations});
    }
    await verifyPinnedImplementationFiles();

    const decisionPath = await assertSafePresentationBaseMediaInputPathV001(
      jobInput.assemblyDecision.path, [INPUT_JSON_ROOT],
    );
    const sourcePath = await assertSafePresentationBaseMediaInputPathV001(
      jobInput.sourceArtifact.path, SOURCE_MEDIA_ROOTS,
    );
    outputDirectory = await resolveSafeOutput(jobInput.outputDirectory);
    lockPath = `${outputDirectory}.lock`;
    try {
      lockHandle = await open(lockPath, 'wx');
      ownsLock = true;
    } catch (error) {
      if (error?.code === 'EEXIST') throwBuild('BASE_MEDIA_OUTPUT_LOCK_CONFLICT', '$.outputDirectory');
      throw error;
    }
    temporaryDirectory = await mkdtemp(path.join(
      path.dirname(outputDirectory),
      `.${path.basename(outputDirectory)}.publish-tmp-`,
    ));
    workingDirectory = await mkdtemp(path.join(
      path.dirname(outputDirectory),
      `.${path.basename(outputDirectory)}.work-`,
    ));

    const decisionInput = await readJsonBytes(decisionPath);
    if (decisionInput.fileSha256 !== jobInput.assemblyDecision.fileSha256) {
      throwBuild('ASSEMBLY_DECISION_HASH_MISMATCH', '$.assemblyDecision.fileSha256', {
        expected: jobInput.assemblyDecision.fileSha256, actual: decisionInput.fileSha256,
      });
    }
    const decisionValidation = validatePresentationBaseMediaAssemblyDecisionV001(decisionInput.value);
    if (decisionValidation.status !== 'passed') {
      return resultWithRetainedPaths({status: 'failed', violations: decisionValidation.violations});
    }
    const decision = decisionInput.value;
    const basisPath = await assertSafePresentationBaseMediaInputPathV001(
      decision.payload.basisEditPlan.path, [INPUT_JSON_ROOT],
    );
    const basisBytes = await readFile(basisPath);
    const basisHash = sha256Bytes(basisBytes);
    if (basisHash !== decision.payload.basisEditPlan.fileSha256) {
      throwBuild('ASSEMBLY_DECISION_BASIS_MISMATCH', '$.payload.basisEditPlan.fileSha256', {
        expected: decision.payload.basisEditPlan.fileSha256, actual: basisHash,
      });
    }
    let basisValue;
    try {
      basisValue = JSON.parse(basisBytes.toString('utf8'));
    } catch {
      throwBuild('ASSEMBLY_DECISION_BASIS_MISMATCH', '$.payload.basisEditPlan.kind', {
        declared: decision.payload.basisEditPlan.kind,
        actual: 'invalid_json',
      });
    }
    if (!isObject(basisValue) || basisValue.kind !== 'edit_plan_json') {
      throwBuild('ASSEMBLY_DECISION_BASIS_MISMATCH', '$.payload.basisEditPlan.kind', {
        declared: decision.payload.basisEditPlan.kind,
        actual: basisValue?.kind ?? null,
      });
    }
    const sourceSnapshotPath = path.join(
      workingDirectory,
      `source-snapshot${path.extname(sourcePath) || '.media'}`,
    );
    await copyFile(sourcePath, sourceSnapshotPath);
    await chmod(sourceSnapshotPath, 0o444);
    const sourceHash = await fileSha256Streaming(sourceSnapshotPath);
    const decisionSource = decision.payload.sourceArtifact;
    const jobSource = jobInput.sourceArtifact;
    if (sourceHash !== jobSource.fileSha256
        || sourceHash !== decisionSource.fileSha256
        || decisionSource.sourceProvenance !== jobSource.sourceProvenance
        || decisionSource.sourceRef !== jobSource.sourceRef
        || decisionSource.sourceUri !== jobSource.sourceUri) {
      throwBuild('BASE_MEDIA_SOURCE_BINDING_MISMATCH', '$.sourceArtifact', {
        actualFileSha256: sourceHash,
      });
    }

    const media = await inspectPresentationBaseMediaSourceV002(sourceSnapshotPath);
    const segmentValidation = validatePresentationBaseMediaSegmentPlanV002(
      decision.payload.segments,
      {
        fps: media.fps,
        decodedFrameCount: media.decodedFrameCount,
        logicalFrameCount: media.logicalFrameCount,
        presentationOffsetMs: media.videoClock.presentationOffsetMs,
      },
      media.audioClock,
    );
    if (segmentValidation.status !== 'passed') return resultWithRetainedPaths(segmentValidation);
    const mappings = segmentValidation.mappings;
    const payloadHash = sha256Canonical(decision.payload);
    const logicalPlan = {
      sourceFileSha256: sourceHash,
      basisEditPlanFileSha256: basisHash,
      assemblyDecisionPayloadSha256: payloadHash,
      sourceProvenance: jobSource.sourceProvenance,
      sourceRef: jobSource.sourceRef,
      sourceUri: jobSource.sourceUri,
      sourceVideoClock: media.videoClock,
      segments: decision.payload.segments,
      generatorVersion: PRESENTATION_BASE_MEDIA_BUILDER_VERSION,
    };
    const buildHash = sha256Canonical(logicalPlan);
    const buildId = `base-media-build-${buildHash.slice(0, 24)}`;
    const intermediateVideo = path.join(workingDirectory, 'video-only.mp4');
    const videoBuild = await buildPresentationBaseMediaVideoV001(
      sourceSnapshotPath, intermediateVideo, media.fps, mappings,
    );
    const audioData = await buildPresentationBaseMediaAudioV001(
      sourceSnapshotPath, workingDirectory, media.audioClock, mappings,
    );
    const baseMediaPath = path.join(temporaryDirectory, 'base-media.mp4');
    const audioMuxBuild = await muxPresentationBaseMediaV001(
      intermediateVideo, baseMediaPath, media.audioClock, audioData,
    );
    const outputInspection = await inspectPresentationBaseMediaOutputV001(
      baseMediaPath, mappings.at(-1).outputEndFrame, media.audioClock, audioData,
    );
    const baseMediaHash = await fileSha256Streaming(baseMediaPath);
    const timeline = makeTimeline({
      buildHash,
      sourceArtifact: jobSource,
      sourceFps: media.fps,
      sourceDecodedFrameCount: media.decodedFrameCount,
      sourceVideoClock: media.videoClock,
      mappings,
      baseMediaHash,
    });
    const timelinePath = path.join(temporaryDirectory, 'timeline.json');
    await writeJson(timelinePath, timeline);
    const timelineHash = sha256Bytes(await readFile(timelinePath));
    const git = await inspectGitState();
    const executionReplacements = new Map([
      [sourceSnapshotPath, '<SOURCE_MEDIA>'],
      [intermediateVideo, '<TEMP_VIDEO>'],
      [audioData.sourceGridPath, '<SOURCE_GRID>'],
      [audioData.encodePath, '<ENCODE_PCM>'],
      [baseMediaPath, '<BASE_MEDIA>'],
    ].filter(([actual]) => isNonEmptyString(actual)));
    const executionCommands = [{
      stage: 'video-build',
      tool: 'ffmpeg',
      arguments: normalizeExecutionArguments(videoBuild.args, executionReplacements),
      filterGraph: videoBuild.graph,
    }];
    if (audioData.present) {
      executionCommands.push(
        {
          stage: 'audio-grid',
          tool: 'ffmpeg',
          arguments: normalizeExecutionArguments(audioData.gridArguments, executionReplacements),
          filterGraph: null,
        },
        {
          stage: 'audio-mux',
          tool: 'ffmpeg',
          arguments: normalizeExecutionArguments(audioMuxBuild.args, executionReplacements),
          filterGraph: null,
        },
      );
    }
    const manifest = {
      schemaVersion: PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION,
      buildId,
      job: {
        jobId: jobInput.jobId,
        schemaVersion: jobInput.schemaVersion,
        fileSha256: context.jobFileSha256,
      },
      source: {
        sourceProvenance: jobSource.sourceProvenance,
        sourceRef: jobSource.sourceRef,
        sourceUri: jobSource.sourceUri,
        path: repoPath(sourcePath),
        fileSha256: sourceHash,
        streamConfiguration: media.source.streamConfiguration,
        video: media.source.video,
        audio: media.source.audio,
      },
      assemblyDecision: {
        decisionId: decision.decisionId,
        fileSha256: decisionInput.fileSha256,
        payloadSha256: payloadHash,
        approvalRecordId: decision.approval.recordId,
      },
      basisEditPlan: {
        kind: decision.payload.basisEditPlan.kind,
        path: repoPath(basisPath),
        fileSha256: basisHash,
      },
      segments: mappings,
      audio: audioData.present ? {
        present: true,
        sampleRate: media.audioClock.sampleRate,
        channels: media.audioClock.channels,
        channelLayout: media.audioClock.channelLayout,
        channelOrder: media.audioClock.channels === 1 ? ['FC'] : ['FL', 'FR'],
        canonicalPcmFormat: {sampleFormat: 'f32le', packing: 'interleaved'},
        insertedSilenceSpans: media.audioClock.spans,
        sourceGrid: {
          sampleCount: audioData.sourceGridSampleCount,
          byteCount: audioData.sourceGridByteCount,
          payloadSha256: audioData.sourceGridPayloadSha256,
          decodedSampleCount: audioData.decodedSourceGridSampleCount,
          decodedTailPaddingSampleCount: audioData.decodedTailPaddingSampleCount,
        },
        encodeInput: {
          sampleCount: audioData.encodeSampleCount,
          byteCount: audioData.encodeByteCount,
          payloadSha256: audioData.encodePayloadSha256,
        },
        encoded: {
          codec: outputInspection.audio.codec,
          bitRate: '192k',
          movieTimeScale: 30,
          timeBase: outputInspection.audio.timeBase,
          startPts: outputInspection.audio.startPts,
          durationTs: outputInspection.audio.durationTs,
          containerDurationSamples: outputInspection.audio.containerDurationSamples,
          presentationDurationSamples: outputInspection.audio.presentationDurationSamples,
          videoPresentationDurationSamples: outputInspection.audio.videoPresentationDurationSamples,
          trailingVideoOnlySampleCount: outputInspection.audio.trailingVideoOnlySampleCount,
          tailPolicy: outputInspection.audio.tailPolicy,
          rawDecodedSampleCount: outputInspection.audio.rawDecodedSampleCount,
          effectiveDecodedSampleCount: outputInspection.audio.effectiveDecodedSampleCount,
          effectiveDecodedPayloadSha256: outputInspection.audio.effectiveDecodedPayloadSha256,
          packetPayloadSha256: outputInspection.audio.packetPayloadSha256,
          skipSamples: outputInspection.audio.skipSamples,
          discardPadding: outputInspection.audio.discardPadding,
          encoderDelay: outputInspection.audio.encoderDelay,
        },
      } : {present: false},
      execution: {
        commands: executionCommands,
        trustedSourceFiles: structuredClone(PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES),
      },
      tools: {
        expected: {...PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE},
        observed: observedTools,
        binaryDiagnostics: toolBinaryDiagnostics,
      },
      versions: {
        generatorVersion: PRESENTATION_BASE_MEDIA_BUILDER_VERSION,
        timelineCheckerVersion: 'presentation-base-media-timeline-checker-v004',
      },
      git,
      implementationFiles: await implementationFiles(),
      outputs: {
        baseMedia: {
          artifactId: timeline.baseMedia.artifactId,
          path: 'base-media.mp4',
          fileSha256: baseMediaHash,
          frameRate: '30/1',
          frameCount: outputInspection.frameCount,
          audioPacketPayloadSha256: audioData.present ? outputInspection.audio.packetPayloadSha256 : null,
        },
        timeline: {
          timelineId: timeline.timelineId,
          schemaVersion: timeline.schemaVersion,
          path: 'timeline.json',
          fileSha256: timelineHash,
        },
      },
      excludedLegacyFields: ['screenLayout', 'telopPlan'],
    };
    const manifestValidation = validatePresentationBaseMediaGenerationManifestV003(manifest);
    if (manifestValidation.status !== 'passed') {
      return resultWithRetainedPaths({status: 'failed', violations: manifestValidation.violations});
    }
    inspectPresentationBaseMediaTimelineQcV002(
      timeline,
      manifest,
      {fileSha256: baseMediaHash, frameCount: outputInspection.frameCount, timelineFileSha256: timelineHash},
    );
    const manifestPath = path.join(temporaryDirectory, 'generation-manifest.json');
    await writeJson(manifestPath, manifest);
    const manifestHash = sha256Bytes(await readFile(manifestPath));
    const report = createValidationReport({
      buildId,
      assembly: {path: repoPath(decisionPath), fileSha256: decisionInput.fileSha256, payloadSha256: payloadHash},
      basis: {path: repoPath(basisPath), fileSha256: basisHash},
      source: {path: repoPath(sourcePath), fileSha256: sourceHash},
      timeline,
      manifestHash,
      baseHash: baseMediaHash,
    });
    const reportValidation = validatePresentationBaseMediaValidationReportV001(report);
    if (reportValidation.status !== 'passed') {
      return resultWithRetainedPaths({status: 'failed', violations: reportValidation.violations});
    }
    const hashGraphValidation = validatePresentationBaseMediaHashGraphV001({
      timeline,
      manifest,
      report,
      baseMediaFileSha256: baseMediaHash,
      timelineFileSha256: timelineHash,
      manifestFileSha256: manifestHash,
    });
    if (hashGraphValidation.status !== 'passed') {
      return resultWithRetainedPaths({status: 'failed', violations: hashGraphValidation.violations});
    }
    await writeJson(path.join(temporaryDirectory, 'validation-report.json'), report);
    await commitPresentationBaseMediaOutputV001(temporaryDirectory, outputDirectory);
    temporaryDirectory = null;
    return resultWithRetainedPaths({
      status: 'passed',
      violations: [],
      buildId,
      outputDirectory,
      logicalDeterminism: {
        buildHash,
        decodedFramePayloadSha256: outputInspection.decodedFramePayloadSha256,
        encodeInputPayloadSha256: audioData.present ? audioData.encodePayloadSha256 : null,
        effectiveDecodedPayloadSha256: audioData.present
          ? outputInspection.audio.effectiveDecodedPayloadSha256 : null,
      },
      videoBuild,
    });
  } catch (error) {
    if (error instanceof BaseMediaBuildError) {
      return resultWithRetainedPaths({status: 'failed', violations: [error.violation]});
    }
    return resultWithRetainedPaths({
      status: 'failed',
      violations: [makePresentationBaseMediaViolationV001(
        'BASE_MEDIA_BUILD_FAILED', '$', [], {name: error?.name ?? 'Error', message: error?.message ?? String(error)},
      )],
    });
  } finally {
    // Nodeのpath指定削除はancestor交換とのraceを完全には閉じられない。
    // file handleだけを閉じ、temporary/work/lock pathは診断用に残す（掃除より安全）。
    if (lockHandle) await lockHandle.close();
  }
};

const failureReportSkeleton = (violation) => ({
  schemaVersion: PRESENTATION_BASE_MEDIA_VALIDATION_REPORT_SCHEMA_VERSION,
  buildId: null,
  status: 'failed',
  violations: [violation],
  inputs: {assemblyDecision: null, basisEditPlan: null, sourceMedia: null},
  outputs: {baseMedia: null, timeline: null, generationManifest: null},
  checks: Object.fromEntries([
    'approvalBinding', 'sourceBinding', 'videoQc', 'audioQc', 'timelineQc', 'hashGraph', 'publishPreconditions',
  ].map((key) => [key, {status: 'not_run', violationCodes: [violation.code]}])),
});

const writeFailureReport = async (violation, jobPath) => {
  await ensureDirectoryNoSymlink(FAILURE_ROOT);
  const id = sha256Bytes(`${jobPath}\0${canonicalJson(violation)}`).slice(0, 24);
  const finalPath = path.join(FAILURE_ROOT, `failure-${id}.json`);
  try {
    await lstat(finalPath);
    return finalPath;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const tempPath = `${finalPath}.tmp-${process.pid}`;
  await writeJson(tempPath, failureReportSkeleton(violation));
  await rename(tempPath, finalPath);
  return finalPath;
};

export const runPresentationBaseMediaBuildJobFileV001 = async (jobPathInput) => {
  let safeJobPath;
  try {
    safeJobPath = await assertSafePresentationBaseMediaInputPathV001(jobPathInput, [INPUT_JSON_ROOT]);
  } catch (error) {
    return {exitCode: 2, result: null, failureReportPath: null, error};
  }
  let jobBytes;
  let job;
  try {
    jobBytes = await readFile(safeJobPath);
    job = JSON.parse(jobBytes.toString('utf8'));
  } catch (error) {
    return {exitCode: 2, result: null, failureReportPath: null, error};
  }
  const result = await executePresentationBaseMediaBuildV001(job, {
    jobFileBytes: jobBytes,
    jobFileSha256: sha256Bytes(jobBytes),
    jobPath: safeJobPath,
  });
  if (result.status === 'passed') return {exitCode: 0, result, failureReportPath: null};
  const failureReportPath = await writeFailureReport(result.violations[0], safeJobPath).catch(() => null);
  return {exitCode: 1, result, failureReportPath};
};

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const jobPath = process.argv[2];
  if (!jobPath || process.argv.length !== 3) {
    process.stderr.write('usage: node presentation_base_media_build_v002.mjs <job.json>\n');
    process.exitCode = 2;
  } else {
    const outcome = await runPresentationBaseMediaBuildJobFileV001(jobPath);
    process.stdout.write(`${JSON.stringify({
      status: outcome.result?.status ?? 'unreadable',
      violations: outcome.result?.violations ?? [],
      outputDirectory: outcome.result?.outputDirectory ?? null,
      retainedBuildPaths: outcome.result?.retainedBuildPaths ?? null,
      failureReportPath: outcome.failureReportPath,
    }, null, 2)}\n`);
    process.exitCode = outcome.exitCode;
  }
}
