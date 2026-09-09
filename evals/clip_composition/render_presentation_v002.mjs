#!/usr/bin/env node

import {createHash, randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationInstructionContract} from './presentation_instruction_contract_v002.mjs';
import {
  PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
  validatePresentationBaseMediaTimelineV002,
} from './presentation_base_media_timeline_v002.mjs';
import {
  PRESENTATION_RENDERER_PLAN_VIOLATION_CODES,
  PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256,
  PRESENTATION_RENDERER_TRUST_VIOLATION_CODES,
  PRESENTATION_RENDERER_VERSION,
  PRESENTATION_RENDER_PLAN_SCHEMA_VERSION,
  buildPresentationRendererPlanV002,
  loadAndValidatePresentationRendererTrustV001,
} from './presentation_renderer_plan_v002.mjs';
import {
  PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES,
  resolveVisibleCenterOffsetsV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  PRESENTATION_RENDERER_QC_VIOLATION_CODES,
  evaluatePresentationRendererQcV002,
  fileSha256V002,
  inspectOverlayPngV002,
  inspectOverlayPngWithToolV001,
  inspectRenderedMediaV002,
  inspectRenderedMediaWithToolsV001,
} from './presentation_renderer_qc_v002.mjs';
import {
  buildPresentationFatalObservationV002,
  classifyPresentationFatalInnerCodeV002,
} from './presentation_fatal_observation_v002.mjs';

export const PRESENTATION_RENDER_JOB_SCHEMA_VERSION = 'presentation-render-job-v002';
export const PRESENTATION_RENDER_APPLICATION_RESULTS_SCHEMA_VERSION =
  'presentation-render-application-results-v002';
export const PRESENTATION_RENDER_MANIFEST_SCHEMA_VERSION = 'presentation-render-manifest-v002';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const PRESENTATION_OUTPUT_ROOT = path.join(MODULE_DIRECTORY, 'outputs/presentation');
const RENDER_NODE_MODULES = path.join(WORKSPACE_ROOT, 'runner/node_modules');
const REMOTION_BIN = path.join(WORKSPACE_ROOT, 'runner/node_modules/.bin/remotion');
const REMOTION_ENTRY = path.join(MODULE_DIRECTORY, 'presentation_renderer_entry_v001.tsx');
const REMOTION_PUBLIC = path.join(WORKSPACE_ROOT, 'runner/public');
const CHROME_BIN = path.join(
  WORKSPACE_ROOT,
  'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell',
);
const TSX_BIN = path.join(WORKSPACE_ROOT, 'runner/node_modules/.bin/tsx');
const LAYOUT_INSPECTOR = path.join(MODULE_DIRECTORY, 'inspect_presentation_render_layout_v001.ts');

const JOB_CODES = Object.freeze([
  'RENDER_JOB_SCHEMA_INVALID',
  'RENDER_JOB_UNKNOWN_FIELD',
  'RENDER_JOB_INPUT_HASH_MISMATCH',
  'FONT_LOAD_FAILED',
  'FONT_FALLBACK_DETECTED',
  'RESOLUTION_GENERATION_MANIFEST_MISMATCH',
  'INSTRUCTION_CONTRACT_NOT_PASSED',
  'INSTRUCTION_CONTRACT_PARTIAL',
  'OVERLAY_RENDER_NONDETERMINISTIC',
  'BASE_MEDIA_TOOL_PROFILE_MISMATCH',
  'RENDER_OUTPUT_ALREADY_EXISTS',
  'RENDER_OUTPUT_LOCKED',
  'RENDER_OUTPUT_LOCK_OWNERSHIP_LOST',
  'RENDER_OUTPUT_PUBLISH_FAILED',
]);

export const PRESENTATION_RENDERER_VIOLATION_CODES = Object.freeze([
  ...new Set([
    ...JOB_CODES,
    ...PRESENTATION_RENDERER_TRUST_VIOLATION_CODES,
    ...PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
    ...PRESENTATION_RENDERER_PLAN_VIOLATION_CODES,
    ...PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES,
    ...PRESENTATION_RENDERER_QC_VIOLATION_CODES,
  ]),
]);

const CODE_ORDER = new Map(PRESENTATION_RENDERER_VIOLATION_CODES.map((code, index) => [code, index]));
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};
const makeViolation = (code, pathValue, relatedIds = [], details = undefined) => ({
  code,
  path: pathValue,
  relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  ...(details === undefined ? {} : {details: canonicalize(details)}),
});
const sortViolations = (violations) => violations.sort((left, right) => {
  const order = (CODE_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER)
    - (CODE_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
  if (order !== 0) return order;
  return JSON.stringify(left).localeCompare(JSON.stringify(right), 'en');
});
const repoPath = (absolutePath) => path.relative(WORKSPACE_ROOT, absolutePath);
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const UNKNOWN_PRESENTATION_FATAL_PROCESS_EVIDENCE_V002 = Object.freeze({
  innerStage: 'unknown',
  innerCode: 'UNCLASSIFIED',
});

const closePresentationFatalProcessEvidenceV002 = (innerStage, innerCode) => {
  try {
    const observation = buildPresentationFatalObservationV002({
      innerStage,
      targetFile: null,
      innerCode,
    });
    return Object.freeze({
      innerStage: observation.innerStage,
      innerCode: observation.innerCode,
    });
  } catch {
    return UNKNOWN_PRESENTATION_FATAL_PROCESS_EVIDENCE_V002;
  }
};

const presentationRendererChildProcessErrorV001 = ({
  innerStage,
  innerCode,
  rendererViolationCode = null,
}) => {
  const error = new Error('presentation renderer child process failed');
  if (rendererViolationCode !== null) error.rendererViolationCode = rendererViolationCode;
  Object.defineProperty(error, 'presentationFatalProcessEvidence', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: closePresentationFatalProcessEvidenceV002(innerStage, innerCode),
  });
  return error;
};

const runPresentationRendererChildProcessUnobservedV001 = (
  command,
  args,
  options = {},
) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {
    cwd: options.cwd ?? WORKSPACE_ROOT,
    env: {...process.env, TMPDIR: '/private/tmp', ...(options.env ?? {})},
  });
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', (error) => {
    const innerCode = classifyPresentationFatalInnerCodeV002(
      ['EPERM', 'EACCES'].includes(error?.code)
        ? {kind: 'node-error', code: error.code}
        : {kind: 'child-process', event: 'spawn-failed'},
    );
    reject(presentationRendererChildProcessErrorV001({
      innerStage: options.fatalInnerStage ?? 'unknown',
      innerCode,
    }));
  });
  child.on('close', (code, signal) => {
    const result = {
      code,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
    };
    if (signal === null && (options.allowedExitCodes ?? [0]).includes(code)) resolve(result);
    else {
      const innerCode = classifyPresentationFatalInnerCodeV002({
        kind: 'child-process',
        event: signal === null ? 'exit-nonzero' : 'signalled',
      });
      const rendererViolationCode = classifyPresentationRenderErrorV002(
        `${result.stderr.toString()}${result.stdout.toString()}`,
      );
      reject(presentationRendererChildProcessErrorV001({
        innerStage: options.fatalInnerStage ?? 'unknown',
        innerCode,
        rendererViolationCode,
      }));
    }
  });
});

export const runPresentationRendererChildProcessV001 = async (
  command,
  args,
  options = {},
) => {
  if (options.processObserver === undefined || options.processObserver === null) {
    return runPresentationRendererChildProcessUnobservedV001(command, args, options);
  }
  try {
    return await options.processObserver.run(command, args, {
      cwd: options.cwd ?? WORKSPACE_ROOT,
      env: {...process.env, TMPDIR: '/private/tmp', ...(options.env ?? {})},
      allowedExitCodes: options.allowedExitCodes ?? [0],
      observationLabel: options.observationLabel,
    });
  } catch (error) {
    const result = error?.processResult ?? null;
    const spawnErrorCode = error?.spawnErrorCode ?? null;
    const innerCode = classifyPresentationFatalInnerCodeV002(
      ['EPERM', 'EACCES'].includes(spawnErrorCode)
        ? {kind: 'node-error', code: spawnErrorCode}
        : {kind: 'child-process', event: result === null
          ? 'spawn-failed'
          : result.signal === null ? 'exit-nonzero' : 'signalled'},
    );
    const rendererViolationCode = result === null
      ? null
      : classifyPresentationRenderErrorV002(
        `${result.stderr.toString()}${result.stdout.toString()}`,
      );
    throw presentationRendererChildProcessErrorV001({
      innerStage: options.fatalInnerStage ?? 'unknown',
      innerCode,
      rendererViolationCode,
    });
  }
};

/** レンダラーが成果物を書き始める前のcommitと作業木状態を記録する。 */
export const inspectGitStateV001 = async () => {
  const [head, status] = await Promise.all([
    runPresentationRendererChildProcessV001('git', ['rev-parse', 'HEAD'], {
      fatalInnerStage: 'runner-bootstrap',
    }),
    runPresentationRendererChildProcessV001(
      'git',
      ['status', '--porcelain=v1', '--untracked-files=normal'],
      {fatalInnerStage: 'runner-bootstrap'},
    ),
  ]);
  return {
    head: head.stdout.toString().trim(),
    dirty: status.stdout.length > 0,
  };
};

const exactFields = (value, expectedFields) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expectedFields].sort());

const pathIsWithin = (rootPath, candidatePath) => {
  const relative = path.relative(rootPath, candidatePath);
  return relative === ''
    || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

const resolvePresentationOutputDirectory = (value) => {
  if (!isNonEmptyString(value)) return null;
  const absolutePath = resolveJobPath(value);
  return pathIsWithin(PRESENTATION_OUTPUT_ROOT, absolutePath) ? absolutePath : null;
};

const unsafeOutputDirectoryError = () => {
  const error = new Error('presentation render output directory is outside the approved subtree or is not a real directory');
  error.code = 'UNSAFE_PRESENTATION_OUTPUT_DIRECTORY';
  return error;
};

/** root自身を含め、targetまでの既存・新規各階層をsymlinkなしの実directoryへ固定する。 */
export const ensureDirectoryChainNoSymlinkV002 = async (rootPath, targetPath) => {
  const absoluteRoot = path.resolve(rootPath);
  const absoluteTarget = path.resolve(targetPath);
  if (!pathIsWithin(absoluteRoot, absoluteTarget)) throw unsafeOutputDirectoryError();
  const rootStat = await lstat(absoluteRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw unsafeOutputDirectoryError();

  const relative = path.relative(absoluteRoot, absoluteTarget);
  let current = absoluteRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await mkdir(current);
      stat = await lstat(current);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw unsafeOutputDirectoryError();
  }

  const [realRoot, realOutput] = await Promise.all([
    realpath(absoluteRoot),
    realpath(absoluteTarget),
  ]);
  if (!pathIsWithin(realRoot, realOutput)) throw unsafeOutputDirectoryError();
  return absoluteTarget;
};

/** publish直前用。既存階層だけをread-onlyで辿り、欠落を新規作成して隠さない。 */
const inspectExistingDirectoryChainNoSymlinkV002 = async (rootPath, targetPath) => {
  const absoluteRoot = path.resolve(rootPath);
  const absoluteTarget = path.resolve(targetPath);
  if (!pathIsWithin(absoluteRoot, absoluteTarget)) throw unsafeOutputDirectoryError();
  const relative = path.relative(absoluteRoot, absoluteTarget);
  let current = absoluteRoot;
  for (const part of ['', ...relative.split(path.sep).filter(Boolean)]) {
    if (part) current = path.join(current, part);
    const currentStat = await lstat(current);
    if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) throw unsafeOutputDirectoryError();
  }
  const [realRoot, realTarget] = await Promise.all([realpath(absoluteRoot), realpath(absoluteTarget)]);
  if (!pathIsWithin(realRoot, realTarget)) throw unsafeOutputDirectoryError();
  return {absolutePath: absoluteTarget, realPath: realTarget};
};

/** 最終出力directory自体は作らず、親までをsymlinkなしの実directoryへ固定する。 */
const ensurePresentationOutputParentV002 = async (absolutePath) => {
  if (!pathIsWithin(PRESENTATION_OUTPUT_ROOT, absolutePath)) throw unsafeOutputDirectoryError();
  await ensureDirectoryChainNoSymlinkV002(WORKSPACE_ROOT, PRESENTATION_OUTPUT_ROOT);
  const [realWorkspace, realPresentationRoot] = await Promise.all([
    realpath(WORKSPACE_ROOT),
    realpath(PRESENTATION_OUTPUT_ROOT),
  ]);
  if (!pathIsWithin(realWorkspace, realPresentationRoot)) throw unsafeOutputDirectoryError();
  return ensureDirectoryChainNoSymlinkV002(PRESENTATION_OUTPUT_ROOT, path.dirname(absolutePath));
};

const transportEntryValid = (entry) => exactFields(entry, ['path', 'fileSha256'])
  && isNonEmptyString(entry.path)
  && SHA256_PATTERN.test(entry.fileSha256);

export function validatePresentationRenderJobV002(jobInput) {
  const violations = [];
  const expectedFields = [
    'schemaVersion',
    'instructionBundle',
    'registryBinding',
    'presetRegistry',
    'resolutionGenerationManifest',
    'baseMediaGenerationManifest',
    'baseMediaTimeline',
    'outputDirectory',
  ];
  if (!isObject(jobInput)) {
    violations.push(makeViolation('RENDER_JOB_SCHEMA_INVALID', '$'));
    return {status: 'failed', violations};
  }
  for (const field of Object.keys(jobInput).sort()) {
    if (!expectedFields.includes(field)) {
      violations.push(makeViolation('RENDER_JOB_UNKNOWN_FIELD', `$.${field}`));
    }
  }
  for (const field of expectedFields) {
    if (!Object.hasOwn(jobInput, field)) violations.push(makeViolation('RENDER_JOB_SCHEMA_INVALID', `$.${field}`));
  }
  if (jobInput.schemaVersion !== PRESENTATION_RENDER_JOB_SCHEMA_VERSION) {
    violations.push(makeViolation('RENDER_JOB_SCHEMA_INVALID', '$.schemaVersion'));
  }
  for (const field of [
    'instructionBundle',
    'registryBinding',
    'resolutionGenerationManifest',
    'baseMediaGenerationManifest',
    'baseMediaTimeline',
  ]) {
    if (!transportEntryValid(jobInput[field])) {
      violations.push(makeViolation('RENDER_JOB_SCHEMA_INVALID', `$.${field}`));
    }
  }
  if (
    !isObject(jobInput.presetRegistry)
    || !exactFields(jobInput.presetRegistry, ['path', 'canonicalSha256'])
    || !isNonEmptyString(jobInput.presetRegistry.path)
    || !SHA256_PATTERN.test(jobInput.presetRegistry.canonicalSha256)
  ) {
    violations.push(makeViolation('RENDER_JOB_SCHEMA_INVALID', '$.presetRegistry'));
  }
  if (!isNonEmptyString(jobInput.outputDirectory)) {
    violations.push(makeViolation('RENDER_JOB_SCHEMA_INVALID', '$.outputDirectory'));
  } else if (resolvePresentationOutputDirectory(jobInput.outputDirectory) === null) {
    violations.push(makeViolation('RENDER_JOB_SCHEMA_INVALID', '$.outputDirectory'));
  }
  sortViolations(violations);
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

const resolveJobPath = (value) => path.isAbsolute(value) ? value : path.resolve(WORKSPACE_ROOT, value);

const readTransportJson = async (entry, label, violations) => {
  try {
    const absolutePath = resolveJobPath(entry.path);
    const bytes = await readFile(absolutePath);
    const actualHash = sha256Bytes(bytes);
    if (actualHash !== entry.fileSha256) {
      violations.push(makeViolation('RENDER_JOB_INPUT_HASH_MISMATCH', `$.${label}`, [entry.path], {
        expected: entry.fileSha256,
        actual: actualHash,
      }));
    }
    return {absolutePath, bytes, value: JSON.parse(bytes.toString('utf8')), fileSha256: actualHash};
  } catch (error) {
    violations.push(makeViolation('RENDER_JOB_INPUT_HASH_MISMATCH', `$.${label}`, [entry.path], {
      readError: error instanceof Error ? error.code ?? error.name : String(error),
    }));
    return null;
  }
};

export const actualToolVersions = async () => {
  const [remotionPackage, browserVersion, ffmpeg, ffprobe] = await Promise.all([
    readJson(path.join(WORKSPACE_ROOT, 'runner/node_modules/remotion/package.json')),
    readFile(path.join(WORKSPACE_ROOT, 'runner/node_modules/.remotion/chrome-headless-shell/VERSION'), 'utf8'),
    runPresentationRendererChildProcessV001('ffmpeg', ['-version'], {
      fatalInnerStage: 'runner-bootstrap',
    }),
    runPresentationRendererChildProcessV001('ffprobe', ['-version'], {
      fatalInnerStage: 'runner-bootstrap',
    }),
  ]);
  return {
    nodeVersion: process.version,
    remotionVersion: remotionPackage.version,
    browserVersion: browserVersion.trim(),
    ffmpegVersion: ffmpeg.stdout.toString().split('\n')[0],
    ffprobeVersion: ffprobe.stdout.toString().split('\n')[0],
  };
};

/** 基礎映像を作った3つのtoolと、現在それを描画する3つのtoolが同一であることを固定する。 */
export function validateBaseMediaToolProfileV002(generationManifest, actualVersions) {
  const expectedFields = ['nodeVersion', 'ffmpegVersion', 'ffprobeVersion'];
  const expected = generationManifest?.tools?.expected;
  const observed = generationManifest?.tools?.observed;
  const binaryDiagnostics = generationManifest?.tools?.binaryDiagnostics;
  const current = Object.fromEntries(expectedFields.map((field) => [field, actualVersions?.[field]]));
  const binaryDiagnosticsValid = exactFields(binaryDiagnostics, ['node', 'ffmpeg', 'ffprobe'])
    && ['node', 'ffmpeg', 'ffprobe'].every((tool) => (
      exactFields(binaryDiagnostics[tool], ['resolvedPath', 'fileSha256'])
      && path.isAbsolute(binaryDiagnostics[tool].resolvedPath)
      && SHA256_PATTERN.test(binaryDiagnostics[tool].fileSha256)
    ));
  const valid = exactFields(generationManifest?.tools, ['expected', 'observed', 'binaryDiagnostics'])
    && exactFields(expected, expectedFields)
    && exactFields(observed, expectedFields)
    && binaryDiagnosticsValid
    && expectedFields.every((field) => (
      isNonEmptyString(expected[field])
      && expected[field] === observed[field]
      && expected[field] === current[field]
    ));
  if (valid) return {status: 'passed', expected: structuredClone(expected), observed: current, violations: []};
  return {
    status: 'failed',
    expected: isObject(expected) ? structuredClone(expected) : null,
    observed: current,
    violations: [makeViolation('BASE_MEDIA_TOOL_PROFILE_MISMATCH', '$.baseMediaGenerationManifest.tools', [], {
      manifestExpected: isObject(expected) ? expected : null,
      manifestObserved: isObject(observed) ? observed : null,
      rendererObserved: current,
    })],
  };
}

/** file輸送と生成manifestの成果物宣言が同じ一組を指すことだけを判定する。 */
export function validateBaseMediaGenerationBindingV002({
  generationManifest,
  generationManifestPath,
  timelineFilePath,
  timelineFileSha256,
  baseMediaFilePath,
  baseMediaInspection,
}) {
  const violations = [];
  const outputTimeline = generationManifest?.outputs?.timeline;
  const outputBaseMedia = generationManifest?.outputs?.baseMedia;
  const resolveDeclared = (value) => (
    isNonEmptyString(value)
      ? (path.isAbsolute(value) ? value : path.resolve(path.dirname(generationManifestPath), value))
      : null
  );
  const actualAudioPacketSha256 = baseMediaInspection?.media?.audio?.packetPayloadSha256 ?? null;
  if (
    resolveDeclared(outputTimeline?.path) !== timelineFilePath
    || outputTimeline?.fileSha256 !== timelineFileSha256
    || resolveDeclared(outputBaseMedia?.path) !== baseMediaFilePath
    || outputBaseMedia?.fileSha256 !== baseMediaInspection?.fileSha256
    || outputBaseMedia?.frameCount !== baseMediaInspection?.frameCount
    || outputBaseMedia?.audioPacketPayloadSha256 !== actualAudioPacketSha256
  ) {
    violations.push(makeViolation('BASE_MEDIA_GENERATION_MANIFEST_INVALID', '$.baseMediaGenerationManifest.outputs', [], {
      declaredTimelinePath: outputTimeline?.path ?? null,
      observedTimelinePath: timelineFilePath,
      declaredTimelineFileSha256: outputTimeline?.fileSha256 ?? null,
      observedTimelineFileSha256: timelineFileSha256,
      declaredBaseMediaPath: outputBaseMedia?.path ?? null,
      observedBaseMediaPath: baseMediaFilePath,
      declaredBaseMediaFileSha256: outputBaseMedia?.fileSha256 ?? null,
      observedBaseMediaFileSha256: baseMediaInspection?.fileSha256 ?? null,
      declaredBaseMediaFrameCount: outputBaseMedia?.frameCount ?? null,
      observedBaseMediaFrameCount: baseMediaInspection?.frameCount ?? null,
      declaredAudioPacketPayloadSha256: outputBaseMedia?.audioPacketPayloadSha256 ?? null,
      observedAudioPacketPayloadSha256: actualAudioPacketSha256,
    }));
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

export const inspectFrameCount = async (filePath) => {
  return inspectFrameCountWithToolV001(filePath, 'ffprobe', 'input-read');
};

export const inspectFrameCountWithToolV001 = async (
  filePath,
  ffprobePath,
  fatalInnerStage = 'input-read',
  processObserver = null,
  observationLabel = 'frame-count-inspection',
) => {
  if (!isNonEmptyString(ffprobePath)) throw new TypeError('ffprobePath is required');
  const result = await runPresentationRendererChildProcessV001(ffprobePath, [
    '-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_frames', '-of', 'json', filePath,
  ], {fatalInnerStage, processObserver, observationLabel});
  const parsed = JSON.parse(result.stdout.toString());
  return Number(parsed.streams?.[0]?.nb_read_frames);
};

export function validateResolutionGenerationManifestV001(bundle, generationManifest) {
  const violations = [];
  const packageValue = bundle?.resolutionPackage;
  const add = (pathValue, relatedIds = [], details = undefined) => violations.push(makeViolation(
    'RESOLUTION_GENERATION_MANIFEST_MISMATCH',
    pathValue,
    relatedIds,
    details,
  ));
  if (!exactFields(generationManifest, [
    'schemaVersion',
    'generatorVersion',
    'sourceArtifacts',
    'sourceProvenance',
    'speakerNormalization',
    'output',
  ])) add('$generationManifest');
  if (generationManifest?.schemaVersion !== 'presentation-resolution-package-generation-manifest-v001') {
    add('$generationManifest.schemaVersion');
  }
  if (generationManifest?.generatorVersion !== 'presentation-resolution-package-builder-v001') {
    add('$generationManifest.generatorVersion');
  }
  if (
    !isNonEmptyString(generationManifest?.sourceProvenance)
    || generationManifest.sourceProvenance !== packageValue?.sourceProvenance
  ) add('$generationManifest.sourceProvenance');

  const sourceArtifacts = generationManifest?.sourceArtifacts;
  if (!Array.isArray(sourceArtifacts) || sourceArtifacts.length === 0) {
    add('$generationManifest.sourceArtifacts');
  } else {
    const sourceRefs = new Set();
    for (const [index, artifact] of sourceArtifacts.entries()) {
      const artifactPath = `$generationManifest.sourceArtifacts[${index}]`;
      if (
        !exactFields(artifact, ['sourceRef', 'path', 'fileSha256'])
        || !isNonEmptyString(artifact.sourceRef)
        || !isNonEmptyString(artifact.path)
        || !SHA256_PATTERN.test(artifact.fileSha256)
      ) {
        add(artifactPath, [artifact?.sourceRef, artifact?.path]);
        continue;
      }
      if (sourceRefs.has(artifact.sourceRef)) add(`${artifactPath}.sourceRef`, [artifact.sourceRef]);
      sourceRefs.add(artifact.sourceRef);
    }
  }

  const normalization = generationManifest?.speakerNormalization;
  if (!exactFields(normalization, [
    'normalizerVersion',
    'registryVersion',
    'registryCanonicalSha256',
    'mappedRecords',
    'passThroughValueCounts',
  ])) add('$generationManifest.speakerNormalization');
  if (
    normalization?.normalizerVersion !== packageValue?.sourceSpeakerNormalization?.normalizerVersion
    || normalization?.registryVersion !== packageValue?.sourceSpeakerNormalization?.registryVersion
    || normalization?.registryCanonicalSha256
      !== packageValue?.sourceSpeakerNormalization?.registryCanonicalSha256
    || !SHA256_PATTERN.test(normalization?.registryCanonicalSha256 ?? '')
  ) add('$generationManifest.speakerNormalization');
  if (!Array.isArray(normalization?.mappedRecords)) {
    add('$generationManifest.speakerNormalization.mappedRecords');
  } else {
    for (const [index, record] of normalization.mappedRecords.entries()) {
      if (
        !exactFields(record, [
          'atomId', 'sourceRef', 'rawSpeaker', 'normalizedSpeaker', 'ruleId',
        ])
        || !isNonEmptyString(record.atomId)
        || !isNonEmptyString(record.sourceRef)
        || !isNonEmptyString(record.rawSpeaker)
        || record.normalizedSpeaker !== null
        || record.ruleId !== 'exact-non-identity-token-to-null'
      ) add(`$generationManifest.speakerNormalization.mappedRecords[${index}]`, [record?.atomId, record?.sourceRef]);
    }
  }
  if (!Array.isArray(normalization?.passThroughValueCounts)) {
    add('$generationManifest.speakerNormalization.passThroughValueCounts');
  } else {
    for (const [index, record] of normalization.passThroughValueCounts.entries()) {
      if (
        !exactFields(record, ['value', 'count'])
        || !isNonEmptyString(record.value)
        || !Number.isInteger(record.count)
        || record.count <= 0
      ) add(`$generationManifest.speakerNormalization.passThroughValueCounts[${index}]`);
    }
  }

  const output = generationManifest?.output;
  if (!exactFields(output, [
    'resolutionPackageId',
    'resolutionPackageCanonicalSha256',
    'rawSourceAtomsCanonicalSha256',
    'sourceAtomsCanonicalSha256',
  ])) add('$generationManifest.output');
  if (
    output?.resolutionPackageId !== packageValue?.resolutionPackageId
    || output?.resolutionPackageCanonicalSha256 !== sha256Canonical(packageValue)
    || output?.rawSourceAtomsCanonicalSha256
      !== packageValue?.sourceSpeakerNormalization?.rawSourceAtomsCanonicalSha256
    || output?.sourceAtomsCanonicalSha256 !== packageValue?.sourceAtomsSha256
    || !SHA256_PATTERN.test(output?.resolutionPackageCanonicalSha256 ?? '')
    || !SHA256_PATTERN.test(output?.rawSourceAtomsCanonicalSha256 ?? '')
    || !SHA256_PATTERN.test(output?.sourceAtomsCanonicalSha256 ?? '')
  ) add('$generationManifest.output');

  sortViolations(violations);
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

/**
 * 解決パッケージ側と基礎映像側が、同じ1つの元動画を指すことを正式入口で束縛する。
 * 各入力がそれぞれ単独で正しくても、別の元動画どうしを組み合わせた状態は受理しない。
 */
export function validatePresentationRendererSourceBindingV002({
  bundle,
  resolutionGenerationManifest,
  timeline,
}) {
  const violations = [];
  const sourceArtifacts = resolutionGenerationManifest?.sourceArtifacts;
  if (!Array.isArray(sourceArtifacts) || sourceArtifacts.length !== 1) {
    violations.push(makeViolation(
      'RESOLUTION_GENERATION_MANIFEST_MISMATCH',
      '$resolutionGenerationManifest.sourceArtifacts',
      [],
      {expectedCount: 1, actualCount: Array.isArray(sourceArtifacts) ? sourceArtifacts.length : null},
    ));
  }

  const sourceArtifact = Array.isArray(sourceArtifacts) && sourceArtifacts.length === 1
    ? sourceArtifacts[0]
    : null;
  if (
    sourceArtifact !== null
    && isNonEmptyString(sourceArtifact?.sourceRef)
    && isNonEmptyString(timeline?.sourceRef)
    && sourceArtifact.sourceRef !== timeline.sourceRef
  ) {
    violations.push(makeViolation(
      'TIMELINE_SOURCE_REF_MISMATCH',
      '$baseMediaTimeline.sourceRef',
      [sourceArtifact.sourceRef, timeline.sourceRef],
      {
        resolutionSourceRef: sourceArtifact.sourceRef,
        timelineSourceRef: timeline.sourceRef,
      },
    ));
  }

  const provenances = {
    instructionSet: bundle?.instructionSet?.sourceProvenance,
    resolutionPackage: bundle?.resolutionPackage?.sourceProvenance,
    resolutionGenerationManifest: resolutionGenerationManifest?.sourceProvenance,
    timeline: timeline?.sourceProvenance,
  };
  const provenanceValues = Object.values(provenances);
  if (
    !provenanceValues.every(isNonEmptyString)
    || new Set(provenanceValues).size !== 1
  ) {
    violations.push(makeViolation(
      'TIMELINE_SOURCE_REF_MISMATCH',
      '$baseMediaTimeline.sourceProvenance',
      provenanceValues.filter(isNonEmptyString),
      provenances,
    ));
  }

  sortViolations(violations);
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

/** 生成manifestが申告した元artifactをworkspace基準で開き、実byte hashを照合する。 */
export async function validateResolutionGenerationSourceArtifactFilesV001(generationManifest) {
  const violations = [];
  for (const [index, artifact] of generationManifest.sourceArtifacts.entries()) {
    const pathValue = `$generationManifest.sourceArtifacts[${index}].fileSha256`;
    try {
      const actual = sha256Bytes(await readFile(resolveJobPath(artifact.path)));
      if (actual !== artifact.fileSha256) {
        violations.push(makeViolation(
          'RESOLUTION_GENERATION_MANIFEST_MISMATCH',
          pathValue,
          [artifact.sourceRef, artifact.path],
          {expected: artifact.fileSha256, actual},
        ));
      }
    } catch (error) {
      violations.push(makeViolation(
        'RESOLUTION_GENERATION_MANIFEST_MISMATCH',
        pathValue,
        [artifact.sourceRef, artifact.path],
        {readError: error instanceof Error ? error.code ?? error.name : String(error)},
      ));
    }
  }
  sortViolations(violations);
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

const overlayPropsFor = (element, plan, presetRegistry) => {
  const font = presetRegistry.fontAssets.find(
    (entry) => entry.fontAssetId === element.visualState.textStyle.fontAssetId,
  );
  if (!font) throw new Error(`font asset missing for ${element.instructionId}`);
  return {
    schemaVersion: 'presentation-renderer-overlay-props-v001',
    canvas: structuredClone(plan.canvas),
    instructionId: element.instructionId,
    text: element.text,
    indexedLines: structuredClone(element.indexedLines),
    visualState: structuredClone(element.visualState),
    layoutRules: structuredClone(plan.layoutRules),
    fontFamilyName: `zev-renderer-${font.fontAssetId}`,
    fontFileName: font.fileName,
    inspectionLineIndex: null,
  };
};

const renderOverlayStillWithRuntimeV001 = async ({
  props,
  outputPath,
  remotionPath,
  chromiumPath,
  processObserver = null,
  observationLabel = 'overlay-still',
}) => {
  await runPresentationRendererChildProcessV001(remotionPath, [
    'still', REMOTION_ENTRY, 'PresentationOverlayV001', outputPath,
    '--props', JSON.stringify(props),
    '--image-format', 'png',
    '--public-dir', REMOTION_PUBLIC,
    '--browser-executable', chromiumPath,
    '--log', 'error',
  ], {
    cwd: WORKSPACE_ROOT,
    env: {NODE_PATH: RENDER_NODE_MODULES},
    fatalInnerStage: 'overlay-render',
    processObserver,
    observationLabel,
  });
};

const renderOverlayStill = async (props, outputPath) => renderOverlayStillWithRuntimeV001({
  props,
  outputPath,
  remotionPath: REMOTION_BIN,
  chromiumPath: CHROME_BIN,
});

export function buildPresentationRendererOverlayAdapterV001({
  remotionPath,
  chromiumPath,
  processObserver,
}) {
  if (!path.isAbsolute(remotionPath) || !path.isAbsolute(chromiumPath)) {
    throw new TypeError('renderer overlay runtime paths must be absolute');
  }
  if (!isObject(processObserver) || typeof processObserver.run !== 'function') {
    throw new TypeError('renderer overlay process observer is required');
  }
  return Object.freeze({
    buildProps: overlayPropsFor,
    renderStill: (props, outputPath) => renderOverlayStillWithRuntimeV001({
      props,
      outputPath,
      remotionPath,
      chromiumPath,
      processObserver,
      observationLabel: 'overlay-still',
    }),
    renderLineMask: (props, lineIndex, outputPath) => renderOverlayStillWithRuntimeV001({
      props: {...props, inspectionLineIndex: lineIndex},
      outputPath,
      remotionPath,
      chromiumPath,
      processObserver,
      observationLabel: 'overlay-line-mask',
    }),
  });
}

/** Remotionの失敗文を未知失敗へ丸めず、既知のfont失敗だけを固定コードへ分類する。 */
export function classifyPresentationRenderErrorV002(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('PRESENTATION_FONT_FALLBACK_DETECTED:')) return 'FONT_FALLBACK_DETECTED';
  if (message.includes('PRESENTATION_FONT_LOAD_FAILED:')) return 'FONT_LOAD_FAILED';
  return null;
}

/** 同じ論理入力から描いた2画像のbyte hashが一致することだけを判定する。 */
export function validateOverlayDeterminismV002(firstSha256, secondSha256, instructionId = null) {
  if (SHA256_PATTERN.test(firstSha256) && firstSha256 === secondSha256) {
    return {status: 'passed', violations: []};
  }
  return {
    status: 'failed',
    violations: [makeViolation(
      'OVERLAY_RENDER_NONDETERMINISTIC',
      '$overlay',
      instructionId ? [instructionId] : [],
      {first: firstSha256, second: secondSha256},
    )],
  };
}

const imageDifferencePixelsWithinBounds = async (
  leftPath,
  rightPath,
  bounds,
  imageMagickPath = 'magick',
  processObserver = null,
) => {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (![bounds.left, bounds.top, width, height].every(Number.isInteger) || width <= 0 || height <= 0) {
    throw new TypeError('image comparison bounds are invalid');
  }
  const geometry = `${width}x${height}+${bounds.left}+${bounds.top}`;
  const result = await runPresentationRendererChildProcessV001(imageMagickPath, [
    'compare', '-metric', 'AE',
    '(', leftPath, '-crop', geometry, '+repage', ')',
    '(', rightPath, '-crop', geometry, '+repage', ')',
    'null:',
  ], {
    allowedExitCodes: [0, 1],
    fatalInnerStage: 'post-render-qc',
    processObserver,
    observationLabel: 'qc-image-difference',
  });
  const value = Number(result.stderr.toString().trim().split(/\s+/)[0]);
  if (!Number.isFinite(value)) throw new Error('bounded image difference could not be parsed');
  return value;
};

const extractFrame = async (
  inputPath,
  frame,
  outputPath,
  fps,
  ffmpegPath = 'ffmpeg',
  processObserver = null,
) => {
  await runPresentationRendererChildProcessV001(ffmpegPath,
    buildPresentationFrameExtractionArgumentsV001({inputPath, frame, outputPath, fps}), {
    fatalInnerStage: 'post-render-qc',
    processObserver,
    observationLabel: 'qc-frame-extract',
  });
};

export const buildPresentationFrameExtractionArgumentsV001 = ({inputPath, frame, outputPath, fps}) => {
  if (!Number.isInteger(frame) || frame < 0 || !Number.isInteger(fps) || fps <= 0) {
    throw new TypeError('frame extraction requires nonnegative frame and integer frame rate');
  }
  // The rendered media is CFR and starts at zero. Integer seconds avoid rounding
  // a rational frame timestamp; select the remaining frame after accurate seek.
  const seconds = Math.floor(frame / fps);
  const remainingFrame = frame - seconds * fps;
  return ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(seconds), '-i', inputPath,
    '-vf', `select=eq(n\\,${remainingFrame})`, '-frames:v', '1', outputPath];
};

export const buildPresentationCompositeArgumentsV001 = ({
  baseMediaPath,
  plan,
  overlayRecords,
  expectedFrameCount,
}) => {
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', baseMediaPath];
  for (const record of overlayRecords) {
    args.push('-loop', '1', '-framerate', String(plan.canvas.fps), '-i', record.pngPath);
  }
  const filters = [];
  let previous = '0:v';
  overlayRecords.forEach((record, index) => {
    const element = record.element;
    const inputIndex = index + 1;
    const alpha = `alpha(X,Y)*min(1,min((N+1)/4,(${element.displayFrameCount}-N)/4))`;
    filters.push(
      `[${inputIndex}:v]format=rgba,trim=end_frame=${element.displayFrameCount},setpts=PTS-STARTPTS,`
      + `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alpha}',`
      + `setpts=PTS+${element.startFrame}/${plan.canvas.fps}/TB[overlay${index}]`,
    );
    const next = `video${index + 1}`;
    filters.push(
      `[${previous}][overlay${index}]overlay=0:0:eof_action=pass:shortest=0:repeatlast=0[${next}]`,
    );
    previous = next;
  });
  filters.push(`[${previous}]fps=${plan.canvas.fps},format=yuv420p[video]`);
  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[video]', '-map', '0:a?',
    '-frames:v', String(expectedFrameCount),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
  );
  return args;
};

const composite = async ({
  baseMediaPath, plan, overlayRecords, expectedFrameCount, outputPath,
  ffmpegPath = 'ffmpeg', fatalInnerStage = 'overlay-render',
  processObserver = null, observationLabel = 'video-composite',
}) => {
  const args = buildPresentationCompositeArgumentsV001({baseMediaPath, plan, overlayRecords, expectedFrameCount});
  await runPresentationRendererChildProcessV001(ffmpegPath, [...args, '-movflags', '+faststart', outputPath], {
    fatalInnerStage,
    processObserver,
    observationLabel,
  });
};

/**
 * Encode the unchanged full timeline, then stop only after its requested encoded
 * frame has been decoded. Fragmented MP4 changes delivery, not video encoding.
 * In particular this does not trim encoder input or flush it at the target frame.
 */
export const renderPresentationCounterfactualEncodedFrameV001 = async (input) => {
  const keys = ['instructionId', 'ffmpegPath', 'compositeArguments', 'representativeFrame',
    'expectedFrameCount', 'outputPath'];
  if (!isObject(input) || Object.keys(input).sort().join('\0') !== keys.sort().join('\0')
    || typeof input.instructionId !== 'string' || input.instructionId.length === 0
    || typeof input.ffmpegPath !== 'string' || input.ffmpegPath.length === 0
    || !Array.isArray(input.compositeArguments) || !input.compositeArguments.every(value => typeof value === 'string')
    || !Number.isInteger(input.representativeFrame) || input.representativeFrame < 0
    || !Number.isInteger(input.expectedFrameCount) || input.representativeFrame >= input.expectedFrameCount
    || typeof input.outputPath !== 'string' || !path.isAbsolute(input.outputPath)) {
    throw new TypeError('encoded counterfactual frame input is invalid');
  }
  const encoderArgs = [...input.compositeArguments, '-progress', 'pipe:2',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1'];
  const decoderArgs = ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0',
    '-vf', `select=eq(n\\,${input.representativeFrame})`, '-frames:v', '1', input.outputPath];
  const create = (args, stdio) => {
    const stderr = [];
    const child = spawn(input.ffmpegPath, args, {stdio});
    const errors = [];
    child.stderr.on('data', value => stderr.push(value));
    child.on('error', error => errors.push({code: error.code ?? null, message: error.message}));
    const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({
      code, signal, errors, stderr: Buffer.concat(stderr).toString('utf8'),
    })));
    return {child, closed};
  };
  const encoder = create(encoderArgs, ['pipe', 'pipe', 'pipe']);
  const decoder = create(decoderArgs, ['pipe', 'ignore', 'pipe']);
  const pipeErrors = [];
  decoder.child.stdin.on('error', error => pipeErrors.push(error.code ?? error.message));
  encoder.child.stdin.on('error', error => pipeErrors.push(error.code ?? error.message));
  encoder.child.stdout.pipe(decoder.child.stdin);
  const decoderResult = await decoder.closed;
  encoder.child.stdout.unpipe(decoder.child.stdin);
  // Always drain the producer after the decoder exits, including failure paths.
  // This prevents a broken output pipe from substituting for a successful exit.
  encoder.child.stdout.resume();
  let targetDecoded = false;
  if (decoderResult.code === 0 && decoderResult.signal === null && decoderResult.errors.length === 0) {
    try {
      const output = await lstat(input.outputPath);
      targetDecoded = output.isFile() && !output.isSymbolicLink() && output.size > 0;
    } catch {}
  }
  const quitRequested = encoder.child.exitCode === null && encoder.child.signalCode === null;
  if (quitRequested && !encoder.child.stdin.destroyed) encoder.child.stdin.end('q\n');
  const encoderResult = await encoder.closed;
  const frameLines = [...encoderResult.stderr.matchAll(/^frame=(\d+)\s*$/gmu)];
  const evidence = {
    instructionId: input.instructionId,
    representativeFrame: input.representativeFrame,
    expectedFrameCount: input.expectedFrameCount,
    encodedFrames: frameLines.length === 0 ? null : Number(frameLines.at(-1)[1]),
    targetDecodedBeforeQuit: targetDecoded,
    quitRequestedAfterDecoderExit: quitRequested,
    inputCanonicalSha256: sha256Canonical(input),
    encoderArgumentsCanonicalSha256: sha256Canonical(encoderArgs),
    decoderArgumentsCanonicalSha256: sha256Canonical(decoderArgs),
    encoder: encoderResult,
    decoder: decoderResult,
    pipeErrors,
  };
  // EPIPE on the decoder's stdin is expected only after it successfully decoded
  // its single requested output. Both ffmpeg processes must still exit zero.
  if (!targetDecoded || encoderResult.code !== 0 || encoderResult.signal !== null
    || encoderResult.errors.length !== 0 || pipeErrors.some(code => code !== 'EPIPE')) {
    console.error(JSON.stringify({status: 'failed', ...evidence}));
    throw new Error('encoded counterfactual frame pipeline did not complete successfully');
  }
  return {status: 'completed', ...evidence, outputFileSha256: await fileSha256V002(input.outputPath)};
};

const DEFAULT_PRESENTATION_OVERLAY_ADAPTER_V001 = Object.freeze({
  buildProps: overlayPropsFor,
  renderStill: renderOverlayStill,
  renderLineMask: (props, lineIndex, outputPath) => renderOverlayStill(
    {...props, inspectionLineIndex: lineIndex},
    outputPath,
  ),
});

const DEFAULT_PRESENTATION_DRAW_TOOL_PATHS_V001 = Object.freeze({
  ffmpegPath: 'ffmpeg',
  ffprobePath: 'ffprobe',
  imageMagickPath: 'magick',
  tsxPath: TSX_BIN,
  layoutInspectorPath: LAYOUT_INSPECTOR,
});

export const PRESENTATION_RENDERER_OUTPUT_NAMES = Object.freeze({
  video: 'presentation-rendered-v002.mp4',
  overlays: 'overlays',
  plan: 'presentation-render-plan-v002.json',
  applicationResults: 'presentation-render-application-results-v002.json',
  manifest: 'presentation-render-manifest-v002.json',
  qc: 'presentation-render-qc-v002.json',
  failure: 'presentation-render-failure-v002.json',
});
const outputNames = PRESENTATION_RENDERER_OUTPUT_NAMES;

/** 描画済み要素を、要求値と実適用値を分けた決定的な適用結果へ写す。 */
export function buildPresentationRenderApplicationResults(
  overlayRecords,
  artifactNames,
) {
  return overlayRecords.map((record) => {
    if (!isObject(record.props)) throw new TypeError('rendered overlay props are required');
    const finalElement = record.finalElement ?? {
      ...record.element,
      overlaySha256: record.pngSha256,
    };
    return {
      instructionId: record.element.instructionId,
      status: 'rendered',
      requestedPresetId: record.element.requestedPresetId,
      appliedPresetId: record.element.appliedPresetId,
      appliedPresetRegistryVersion: record.element.registryVersion,
      stateId: record.element.stateId,
      appliedOverlayPropsCanonicalSha256: sha256Canonical(record.props),
      overlayFile: path.posix.join(artifactNames.overlays, path.basename(record.pngPath)),
      overlaySha256: record.pngSha256,
      finalPlanElementReference: {
        planFile: artifactNames.plan,
        instructionId: finalElement.instructionId,
        canonicalSha256: sha256Canonical(finalElement),
      },
    };
  });
}

export function buildPresentationRenderApplicationResultsV002(overlayRecords) {
  return buildPresentationRenderApplicationResults(
    overlayRecords,
    PRESENTATION_RENDERER_OUTPUT_NAMES,
  );
}

const successArtifactNamesFor = (artifactNames) => [
  artifactNames.video,
  artifactNames.overlays,
  artifactNames.plan,
  artifactNames.applicationResults,
  artifactNames.qc,
  artifactNames.manifest,
];

const outputSafetyError = (code, message, cause = undefined) => {
  const error = new Error(message, cause === undefined ? undefined : {cause});
  error.rendererViolationCode = code;
  return error;
};

const lstatOrNull = async (targetPath) => {
  try {
    return await lstat(targetPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const assertReservationOwnershipV002 = async (reservation) => {
  try {
    const owner = await readJson(reservation.ownerFile);
    if (
      !exactFields(owner, ['schemaVersion', 'ownerToken', 'processId', 'outputDirectory'])
      || owner.schemaVersion !== 'presentation-render-output-lock-v002'
      || owner.ownerToken !== reservation.ownerToken
      || owner.outputDirectory !== reservation.outputDirectory
    ) {
      throw outputSafetyError(
        'RENDER_OUTPUT_LOCK_OWNERSHIP_LOST',
        'presentation render output lock is no longer owned by this execution',
      );
    }
  } catch (error) {
    if (error?.rendererViolationCode) throw error;
    throw outputSafetyError(
      'RENDER_OUTPUT_LOCK_OWNERSHIP_LOST',
      'presentation render output lock ownership cannot be verified',
      error,
    );
  }
};

/**
 * 最終出力先を作らず、同じ親directory内の所有lockだけを原子的に確保する。
 * 既存出力・他実行のlock・symlinkはいずれも削除せず停止する。
 */
export const acquirePresentationOutputReservationV002 = async (outputDirectoryInput) => {
  const outputDirectory = resolvePresentationOutputDirectory(outputDirectoryInput);
  if (outputDirectory === null) throw unsafeOutputDirectoryError();
  const outputParent = await ensurePresentationOutputParentV002(outputDirectory);
  const [workspaceRealPath, presentationRootRealPath, outputParentRealPath] = await Promise.all([
    realpath(WORKSPACE_ROOT),
    realpath(PRESENTATION_OUTPUT_ROOT),
    realpath(outputParent),
  ]);
  if (await lstatOrNull(outputDirectory)) {
    throw outputSafetyError(
      'RENDER_OUTPUT_ALREADY_EXISTS',
      'presentation render output directory already exists; v002 only publishes to a new destination',
    );
  }
  const lockDirectory = path.join(
    outputParent,
    `.${path.basename(outputDirectory)}.presentation-renderer-v002.lock`,
  );
  try {
    await mkdir(lockDirectory);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw outputSafetyError(
        'RENDER_OUTPUT_LOCKED',
        'presentation render output destination is reserved by another execution',
        error,
      );
    }
    throw error;
  }
  const reservation = {
    outputDirectory,
    outputParent,
    lockDirectory,
    ownerFile: path.join(lockDirectory, 'owner.json'),
    ownerToken: randomUUID(),
    workspaceRealPath,
    presentationRootRealPath,
    outputParentRealPath,
  };
  let ownerWritten = false;
  try {
    await writeFile(reservation.ownerFile, `${JSON.stringify({
      schemaVersion: 'presentation-render-output-lock-v002',
      ownerToken: reservation.ownerToken,
      processId: process.pid,
      outputDirectory,
    }, null, 2)}\n`, {encoding: 'utf8', flag: 'wx', mode: 0o600});
    ownerWritten = true;
    if (await lstatOrNull(outputDirectory)) {
      throw outputSafetyError(
        'RENDER_OUTPUT_ALREADY_EXISTS',
        'presentation render output directory appeared while acquiring its reservation',
      );
    }
    return reservation;
  } catch (error) {
    // 検査と削除の間にもpath差し替え窓が残るため、取得済みlockは自動削除しない。
    // 次回実行はこのlockで停止し、人間が実体を確認してから扱う。
    error.cleanupDiagnostics = [{
      code: 'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY',
      path: repoPath(lockDirectory),
      ownerWritten,
    }];
    throw error;
  }
};

const retainedCleanupDiagnosticsV002 = ({reservation, workDirectory = null}) => [
  {
    code: 'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY',
    path: repoPath(reservation.lockDirectory),
    reason: 'automatic path-based cleanup is disabled to avoid deleting a replaced external directory',
  },
  ...(workDirectory === null ? [] : [{
    code: 'RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY',
    path: repoPath(workDirectory),
    reason: 'automatic path-based cleanup is disabled to avoid deleting a replaced external directory',
  }]),
];

const assertRegularFile = async (filePath) => {
  const fileStat = await lstat(filePath);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(`publish artifact is not a regular file: ${filePath}`);
  }
};

const projectDefaultPresentationManifestArtifactsV002 = (
  manifest,
  artifactNames,
) => ({
  rootFiles: [
    {
      name: artifactNames.video,
      declaredName: manifest?.output?.videoFile,
      fileSha256: manifest?.output?.videoFileSha256,
    },
    {
      name: artifactNames.plan,
      declaredName: manifest?.output?.planFile,
      fileSha256: manifest?.output?.planFileSha256,
    },
    {
      name: artifactNames.applicationResults,
      declaredName: manifest?.output?.applicationResultsFile,
      fileSha256: manifest?.output?.applicationResultsFileSha256,
    },
    {
      name: artifactNames.qc,
      declaredName: manifest?.output?.qcFile,
      fileSha256: manifest?.output?.qcFileSha256,
    },
  ],
  overlayDirectory: manifest?.output?.overlaySet?.directory,
  overlays: manifest?.output?.overlaySet?.files,
  overlaySetCanonicalSha256: manifest?.output?.overlaySet?.canonicalSha256,
});

/** 公開予定一式がmanifestどおりで、余分・欠落・symlinkを含まないことを公開前に確定する。 */
const validateStagedSuccessArtifactsV002 = async (
  stagingDirectory,
  artifactNames = PRESENTATION_RENDERER_OUTPUT_NAMES,
  projectManifestArtifacts = projectDefaultPresentationManifestArtifactsV002,
) => {
  const successArtifactNames = successArtifactNamesFor(artifactNames);
  const stagingStat = await lstat(stagingDirectory);
  if (!stagingStat.isDirectory() || stagingStat.isSymbolicLink()) {
    throw new Error('presentation render staging path is not a real directory');
  }
  const rootEntries = (await readdir(stagingDirectory)).sort();
  if (JSON.stringify(rootEntries) !== JSON.stringify([...successArtifactNames].sort())) {
    throw new Error(`presentation render staging artifact set mismatch: ${rootEntries.join(',')}`);
  }
  const overlayDirectory = path.join(stagingDirectory, artifactNames.overlays);
  const overlayStat = await lstat(overlayDirectory);
  if (!overlayStat.isDirectory() || overlayStat.isSymbolicLink()) {
    throw new Error('presentation render overlay set is not a real directory');
  }
  for (const name of successArtifactNames.filter((name) => name !== artifactNames.overlays)) {
    await assertRegularFile(path.join(stagingDirectory, name));
  }
  const manifest = await readJson(path.join(stagingDirectory, artifactNames.manifest));
  if (typeof projectManifestArtifacts !== 'function') {
    throw new TypeError('presentation render manifest artifact projector is invalid');
  }
  const projected = projectManifestArtifacts(manifest, artifactNames);
  if (
    !isObject(projected)
    || !Array.isArray(projected.rootFiles)
    || projected.rootFiles.length !== 4
    || !Array.isArray(projected.overlays)
    || (
      projected.overlaySetCanonicalSource !== undefined
      && !Array.isArray(projected.overlaySetCanonicalSource)
    )
  ) {
    throw new Error('presentation render manifest artifact projection is invalid');
  }
  for (const entry of projected.rootFiles) {
    const expectedName = entry?.name;
    const declaredName = entry?.declaredName;
    const declaredHash = entry?.fileSha256;
    if (
      !successArtifactNames.includes(expectedName)
      || declaredName !== expectedName
      || !SHA256_PATTERN.test(declaredHash)
    ) {
      throw new Error(`presentation render manifest does not bind ${expectedName}`);
    }
    if (await fileSha256V002(path.join(stagingDirectory, expectedName)) !== declaredHash) {
      throw new Error(`presentation render staged hash mismatch: ${expectedName}`);
    }
  }
  if (projected.overlayDirectory !== artifactNames.overlays) {
    throw new Error('presentation render manifest does not bind the overlay directory');
  }
  const declaredOverlays = projected.overlays;
  const expectedOverlayNames = [];
  for (const entry of declaredOverlays) {
    if (
      !isObject(entry)
      || !isNonEmptyString(entry.path)
      || path.posix.dirname(entry.path) !== artifactNames.overlays
      || path.posix.basename(entry.path) !== path.basename(entry.path)
      || !SHA256_PATTERN.test(entry.fileSha256)
    ) {
      throw new Error('presentation render manifest contains an invalid overlay binding');
    }
    const overlayName = path.posix.basename(entry.path);
    expectedOverlayNames.push(overlayName);
    const overlayPath = path.join(overlayDirectory, overlayName);
    await assertRegularFile(overlayPath);
    if (await fileSha256V002(overlayPath) !== entry.fileSha256) {
      throw new Error(`presentation render staged overlay hash mismatch: ${overlayName}`);
    }
  }
  const actualOverlayNames = (await readdir(overlayDirectory)).sort();
  if (JSON.stringify(actualOverlayNames) !== JSON.stringify(expectedOverlayNames.sort())) {
    throw new Error('presentation render staged overlay set does not match the manifest');
  }
  if (
    sha256Canonical(projected.overlaySetCanonicalSource ?? declaredOverlays)
    !== projected.overlaySetCanonicalSha256
  ) {
    throw new Error('presentation render staged overlay set canonical hash mismatch');
  }
};

const validateReservationBaseTopologyV002 = async (reservation) => {
  const workspace = await inspectExistingDirectoryChainNoSymlinkV002(
    WORKSPACE_ROOT,
    WORKSPACE_ROOT,
  );
  const presentationRoot = await inspectExistingDirectoryChainNoSymlinkV002(
    WORKSPACE_ROOT,
    PRESENTATION_OUTPUT_ROOT,
  );
  const outputParent = await inspectExistingDirectoryChainNoSymlinkV002(
    PRESENTATION_OUTPUT_ROOT,
    reservation.outputParent,
  );
  if (
    workspace.realPath !== reservation.workspaceRealPath
    || presentationRoot.realPath !== reservation.presentationRootRealPath
    || outputParent.realPath !== reservation.outputParentRealPath
  ) {
    throw new Error('presentation render output ancestry changed after reservation');
  }
  const lock = await inspectExistingDirectoryChainNoSymlinkV002(
    reservation.outputParent,
    reservation.lockDirectory,
  );
  if (path.dirname(lock.realPath) !== reservation.outputParentRealPath) {
    throw new Error('presentation render lock is no longer under the reserved real parent');
  }
};

const validateReservationWorkTopologyV002 = async (reservation, workDirectory) => {
  await validateReservationBaseTopologyV002(reservation);
  const work = await inspectExistingDirectoryChainNoSymlinkV002(
    reservation.outputParent,
    workDirectory,
  );
  if (path.dirname(work.realPath) !== reservation.outputParentRealPath) {
    throw new Error('presentation render work directory is no longer under the reserved real parent');
  }
  return work;
};

const validatePublishTopologyV002 = async (reservation, stagingDirectory) => {
  const absoluteStaging = path.resolve(stagingDirectory);
  const temporaryDirectory = path.dirname(absoluteStaging);
  const temporary = await validateReservationWorkTopologyV002(reservation, temporaryDirectory);
  const staging = await inspectExistingDirectoryChainNoSymlinkV002(
    temporaryDirectory,
    absoluteStaging,
  );
  if (
    path.dirname(temporary.realPath) !== reservation.outputParentRealPath
    || path.dirname(staging.realPath) !== temporary.realPath
  ) {
    throw new Error('presentation render staging path is no longer under the reserved real parent');
  }
};

/** hash検査完了後の最終commit。直前に実体・所有権・出力先不在をすべて再検査する。 */
export const commitValidatedPresentationArtifactsV002 = async ({
  stagingDirectory,
  outputDirectory,
  reservation,
}) => {
  try {
    if (path.resolve(outputDirectory) !== reservation.outputDirectory) {
      throw new Error('publish destination does not match the owned reservation');
    }
    await validatePublishTopologyV002(reservation, stagingDirectory);
    await assertReservationOwnershipV002(reservation);
    if (await lstatOrNull(reservation.outputDirectory)) {
      throw outputSafetyError(
        'RENDER_OUTPUT_ALREADY_EXISTS',
        'presentation render output directory appeared before publish',
      );
    }
    await rename(path.resolve(stagingDirectory), reservation.outputDirectory);
    return {status: 'published', outputDirectory: reservation.outputDirectory};
  } catch (error) {
    if (error?.rendererViolationCode) throw error;
    throw outputSafetyError(
      'RENDER_OUTPUT_PUBLISH_FAILED',
      'presentation render artifacts could not be atomically published',
      error,
    );
  }
};

/** 所有lock下で一式を検証し、最終再検査を経て1回のdirectory renameで公開する。 */
export const publishPresentationArtifactsV002 = async ({
  stagingDirectory,
  outputDirectory,
  reservation,
  artifactNames = PRESENTATION_RENDERER_OUTPUT_NAMES,
  projectManifestArtifacts = projectDefaultPresentationManifestArtifactsV002,
}) => {
  try {
    if (path.resolve(outputDirectory) !== reservation.outputDirectory) {
      throw new Error('publish destination does not match the owned reservation');
    }
    await validatePublishTopologyV002(reservation, stagingDirectory);
    await assertReservationOwnershipV002(reservation);
    if (await lstatOrNull(reservation.outputDirectory)) {
      throw outputSafetyError(
        'RENDER_OUTPUT_ALREADY_EXISTS',
        'presentation render output directory appeared before staged artifact validation',
      );
    }
    await validateStagedSuccessArtifactsV002(
      path.resolve(stagingDirectory),
      artifactNames,
      projectManifestArtifacts,
    );
    // hash検査中の親差し替え・lock置換・出力先出現を、rename直前に再度止める。
    return commitValidatedPresentationArtifactsV002({
      stagingDirectory,
      outputDirectory,
      reservation,
    });
  } catch (error) {
    if (error?.rendererViolationCode) throw error;
    throw outputSafetyError(
      'RENDER_OUTPUT_PUBLISH_FAILED',
      'presentation render artifacts could not be atomically published',
      error,
    );
  }
};

const contractFailure = (
  violations,
  stage,
  nested = undefined,
  cleanupWarnings = [],
) => ({
  exitCode: 1,
  failure: {
    schemaVersion: 'presentation-render-failure-v002',
    status: 'failed',
    stage,
    violations: sortViolations(violations),
    ...(nested === undefined ? {} : {nested}),
    ...(cleanupWarnings.length === 0 ? {} : {cleanupWarnings}),
  },
});

const processFailure = (stage, error, cleanupWarnings = []) => {
  const result = {
    exitCode: 2,
    failure: {
      schemaVersion: 'presentation-render-failure-v002',
      status: 'process_failed',
      stage,
      message: error instanceof Error ? error.message : String(error),
      ...(cleanupWarnings.length === 0 ? {} : {cleanupWarnings}),
    },
  };
  if (error?.presentationFatalProcessEvidence) {
    Object.defineProperty(result, 'presentationFatalProcessEvidence', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: error.presentationFatalProcessEvidence,
    });
  }
  return result;
};

/**
 * 合格済みの論理描画計画を、現行v002描画エンジンとQCへ一度だけ通す共通入口。
 * 入力契約の判定と成果物manifestの組み立ては呼び出し側が所有し、
 * ここでは描画アルゴリズム・合成・描画後QCだけを一つの実装へ固定する。
 */
export async function executeValidatedPresentationDrawAndQcV001({
  outputDirectory,
  plan,
  presetRegistry,
  baseMediaPath,
  baseMediaInspection,
  expectedFrameCount,
  artifactNames = PRESENTATION_RENDERER_OUTPUT_NAMES,
  evaluateQc = evaluatePresentationRendererQcV002,
  overlayAdapter = DEFAULT_PRESENTATION_OVERLAY_ADAPTER_V001,
  toolPaths = DEFAULT_PRESENTATION_DRAW_TOOL_PATHS_V001,
  validatedLayoutInspection = null,
  processObserver = null,
}) {
  if (
    !isObject(overlayAdapter)
    || typeof overlayAdapter.buildProps !== 'function'
    || typeof overlayAdapter.renderStill !== 'function'
    || typeof overlayAdapter.renderLineMask !== 'function'
  ) {
    throw new TypeError('validated draw overlay adapter is invalid');
  }
  for (const key of ['ffmpegPath', 'ffprobePath', 'imageMagickPath']) {
    if (!isNonEmptyString(toolPaths?.[key])) {
      throw new TypeError(`validated draw tool path is missing: ${key}`);
    }
  }
  if (
    validatedLayoutInspection === null
    && (
      !isNonEmptyString(toolPaths?.tsxPath)
      || !isNonEmptyString(toolPaths?.layoutInspectorPath)
    )
  ) {
    throw new TypeError('layout inspector tool paths are required');
  }
  let reservation;
  try {
    reservation = await acquirePresentationOutputReservationV002(outputDirectory);
  } catch (error) {
    if (error?.code === 'UNSAFE_PRESENTATION_OUTPUT_DIRECTORY') {
      return contractFailure([
        makeViolation('RENDER_JOB_SCHEMA_INVALID', '$.outputDirectory', [], {reason: error.code}),
      ], 'output-reservation');
    }
    if (error?.rendererViolationCode) {
      return contractFailure([
        makeViolation(error.rendererViolationCode, '$.outputDirectory'),
      ], 'output-reservation', undefined, error.cleanupDiagnostics ?? []);
    }
    throw error;
  }

  let workDirectory;
  let stagingDirectory;
  let scratchDirectory;
  try {
    workDirectory = await mkdtemp(path.join(
      reservation.outputParent,
      `.${path.basename(outputDirectory)}.presentation-renderer-v002-work-`,
    ));
    stagingDirectory = path.join(workDirectory, 'publish');
    scratchDirectory = path.join(workDirectory, 'scratch');
    await mkdir(path.join(stagingDirectory, artifactNames.overlays), {recursive: true});
    await mkdir(path.join(scratchDirectory, 'frames'), {recursive: true});
    await validateReservationWorkTopologyV002(reservation, workDirectory);
  } catch (error) {
    return processFailure(
      'work-directory',
      error,
      retainedCleanupDiagnosticsV002({reservation, workDirectory: workDirectory ?? null}),
    );
  }

  const cleanupWarnings = retainedCleanupDiagnosticsV002({reservation, workDirectory});
  const failAfterWork = async (violations, stage, nested = undefined) => (
    contractFailure(violations, stage, nested, cleanupWarnings)
  );

  try {
    const overlayProps = plan.elements.map(
      (element) => overlayAdapter.buildProps(element, plan, presetRegistry),
    );
    let layoutInspection = validatedLayoutInspection;
    if (layoutInspection === null) {
      const layoutInputPath = path.join(scratchDirectory, 'layout-input.json');
      const layoutOutputPath = path.join(scratchDirectory, 'layout-output.json');
      await writeJson(layoutInputPath, {canvas: plan.canvas, overlays: overlayProps});
      await runPresentationRendererChildProcessV001(
        toolPaths.tsxPath,
        [toolPaths.layoutInspectorPath, layoutInputPath, layoutOutputPath],
        {
          allowedExitCodes: [0, 1],
          env: {NODE_PATH: RENDER_NODE_MODULES},
          fatalInnerStage: 'layout-preflight',
          processObserver,
          observationLabel: 'layout-inspection',
        },
      );
      try {
        layoutInspection = await readJson(layoutOutputPath);
      } catch {
        throw new Error('layout inspector produced no result');
      }
    }
    if (layoutInspection.status !== 'passed') {
      return failAfterWork(layoutInspection.violations, 'layout-preflight', layoutInspection);
    }

    const layoutByInstruction = new Map(
      layoutInspection.items.map((item) => [item.instructionId, item]),
    );
    const overlayRecords = [];
    for (const [index, element] of plan.elements.entries()) {
      const baseName =
        `${String(index + 1).padStart(2, '0')}-${sha256Bytes(element.instructionId).slice(0, 12)}`;
      const pngPath = path.join(stagingDirectory, artifactNames.overlays, `${baseName}.png`);
      const repeatPath = path.join(scratchDirectory, 'frames', `${baseName}.repeat.png`);
      const layoutItem = layoutByInstruction.get(element.instructionId);
      if (element.visualState.position.preset === 'top-band') {
        const calibrationLineBounds = [];
        for (const line of element.indexedLines) {
          const calibrationPath = path.join(
            scratchDirectory,
            'frames',
            `${baseName}-visible-center-calibration-${String(line.lineIndex + 1).padStart(2, '0')}.png`,
          );
          await overlayAdapter.renderLineMask(
            overlayProps[index],
            line.lineIndex,
            calibrationPath,
          );
          const calibration = await inspectOverlayPngWithToolV001({
            instructionId: element.instructionId,
            pngPath: calibrationPath,
            imageMagickPath: toolPaths.imageMagickPath,
            processObserver,
            observationLabelPrefix: 'overlay-calibration-inspection',
          });
          if (!calibration.alphaBounds) {
            throw new Error('top band visible center calibration produced no alpha bounds');
          }
          calibrationLineBounds.push(calibration.alphaBounds);
        }
        const wrapper = layoutItem?.wrapper;
        if (!wrapper) throw new Error('top band visible center calibration has no wrapper');
        overlayProps[index] = {
          ...overlayProps[index],
          renderVisibleCenterCorrectionPx: resolveVisibleCenterOffsetsV001({
            containerBounds: {
              left: wrapper.left,
              top: wrapper.top,
              right: wrapper.left + wrapper.width,
              bottom: wrapper.top + wrapper.height,
            },
            lineBounds: calibrationLineBounds,
          }),
        };
      }
      await overlayAdapter.renderStill(overlayProps[index], pngPath);
      await overlayAdapter.renderStill(overlayProps[index], repeatPath);
      const [pngSha256, repeatSha256] = await Promise.all([
        fileSha256V002(pngPath),
        fileSha256V002(repeatPath),
      ]);
      const determinism = validateOverlayDeterminismV002(
        pngSha256,
        repeatSha256,
        element.instructionId,
      );
      if (determinism.status !== 'passed') {
        return failAfterWork(determinism.violations, 'overlay-determinism');
      }

      const lineRects = layoutItem?.lineRects ?? [];
      const lineAlphaBounds = [];
      for (const line of element.indexedLines) {
        const lineMaskPath = path.join(
          scratchDirectory,
          'frames',
          `${baseName}-line-${String(line.lineIndex + 1).padStart(2, '0')}.png`,
        );
        await overlayAdapter.renderLineMask(
          overlayProps[index],
          line.lineIndex,
          lineMaskPath,
        );
        const lineInspection = await inspectOverlayPngWithToolV001({
          instructionId: element.instructionId,
          pngPath: lineMaskPath,
          imageMagickPath: toolPaths.imageMagickPath,
          processObserver,
          observationLabelPrefix: 'overlay-line-inspection',
        });
        if (lineInspection.alphaBounds) {
          lineAlphaBounds.push({lineIndex: line.lineIndex, ...lineInspection.alphaBounds});
        }
      }
      const inspection = await inspectOverlayPngWithToolV001({
        instructionId: element.instructionId,
        pngPath,
        imageMagickPath: toolPaths.imageMagickPath,
        processObserver,
        observationLabelPrefix: 'overlay-final-inspection',
        lineRects,
        lineAlphaBounds,
        appliedOverlayPropsCanonicalSha256: sha256Canonical(overlayProps[index]),
        overlayFile: path.posix.join(artifactNames.overlays, path.basename(pngPath)),
        overlaySha256: pngSha256,
      });
      overlayRecords.push({
        element,
        props: overlayProps[index],
        fileStem: baseName,
        pngPath,
        pngSha256,
        inspection,
      });
    }

    const applicationResults = buildPresentationRenderApplicationResults(
      overlayRecords,
      artifactNames,
    );
    const baseExpectedAudio = baseMediaInspection.media.audio
      ? {present: true, ...baseMediaInspection.media.audio}
      : {present: false};
    const layoutQc = evaluateQc({
      plan,
      applicationResults,
      overlayInspections: overlayRecords.map((record) => record.inspection),
      mediaInspection: baseMediaInspection.media,
      expectedAudio: baseExpectedAudio,
      canvas: plan.canvas,
      requireFinalVisibility: false,
    });
    if (layoutQc.status !== 'passed') {
      return failAfterWork(layoutQc.violations, 'overlay-preflight', layoutQc);
    }

    const workVideo = path.join(stagingDirectory, artifactNames.video);
    await composite({
      baseMediaPath,
      plan,
      overlayRecords,
      expectedFrameCount,
      outputPath: workVideo,
      ffmpegPath: toolPaths.ffmpegPath,
      fatalInnerStage: 'overlay-render',
      processObserver,
      observationLabel: 'video-composite',
    });
    const outputMedia = await inspectRenderedMediaWithToolsV001(workVideo, {
      ffprobePath: toolPaths.ffprobePath,
      ffmpegPath: toolPaths.ffmpegPath,
      processObserver,
      observationLabelPrefix: 'output-media-inspection',
    });
    if (outputMedia.video) {
      outputMedia.video.frameCount = await inspectFrameCountWithToolV001(
        workVideo,
        toolPaths.ffprobePath,
        'post-render-qc',
        processObserver,
        'output-frame-count',
      );
    }

    const transparentOverlayPath = path.join(scratchDirectory, 'frames', 'transparent-overlay.png');
    await runPresentationRendererChildProcessV001(toolPaths.imageMagickPath, [
      '-size', `${plan.canvas.width}x${plan.canvas.height}`,
      'xc:none',
      transparentOverlayPath,
    ], {
      fatalInnerStage: 'post-render-qc',
      processObserver,
      observationLabel: 'transparent-overlay-create',
    });
    for (const record of overlayRecords) {
      const representativeFrame = record.element.startFrame
        + Math.floor(record.element.displayFrameCount / 2);
      const outputFrame = path.join(scratchDirectory, 'frames', `${record.fileStem}-output.png`);
      const omittedFrame = path.join(scratchDirectory, 'frames', `${record.fileStem}-omitted.png`);
      const counterfactualRecords = overlayRecords.map((entry) => (
        entry === record ? {...entry, pngPath: transparentOverlayPath} : entry
      ));
      const counterfactualInput = {
        instructionId: record.element.instructionId,
        ffmpegPath: toolPaths.ffmpegPath,
        compositeArguments: buildPresentationCompositeArgumentsV001({
          baseMediaPath, plan, overlayRecords: counterfactualRecords, expectedFrameCount,
        }),
        representativeFrame,
        expectedFrameCount,
        outputPath: omittedFrame,
      };
      const counterfactualInputPath = path.join(scratchDirectory, 'frames', `${record.fileStem}-counterfactual-input.json`);
      await writeFile(counterfactualInputPath, JSON.stringify(counterfactualInput), {flag: 'wx'});
      const counterfactual = await runPresentationRendererChildProcessV001(toolPaths.tsxPath, [
        fileURLToPath(import.meta.url), '--counterfactual-frame', counterfactualInputPath,
      ], {
        fatalInnerStage: 'post-render-qc',
        processObserver,
        observationLabel: 'counterfactual-encoded-frame',
      });
      const counterfactualResult = JSON.parse(counterfactual.stdout.toString('utf8'));
      if (counterfactualResult.status !== 'completed'
        || counterfactualResult.inputCanonicalSha256 !== sha256Canonical(counterfactualInput)
        || counterfactualResult.outputFileSha256 !== await fileSha256V002(omittedFrame)) {
        throw new Error('encoded counterfactual frame evidence does not match its input and output');
      }
      await extractFrame(
        workVideo,
        representativeFrame,
        outputFrame,
        plan.canvas.fps,
        toolPaths.ffmpegPath,
        processObserver,
      );
      record.inspection.visibilityComparisonBasis = 'same-composite-with-instruction-omitted';
      record.inspection.representativeFrame = representativeFrame;
      record.inspection.changedPixelsAgainstInstructionOmittedFrame =
        await imageDifferencePixelsWithinBounds(
          outputFrame,
          omittedFrame,
          record.inspection.alphaBounds,
          toolPaths.imageMagickPath,
          processObserver,
        );
    }

    const finalQc = evaluateQc({
      plan,
      applicationResults,
      overlayInspections: overlayRecords.map((record) => record.inspection),
      mediaInspection: outputMedia,
      expectedAudio: baseExpectedAudio,
      expectedFrameCount,
      canvas: plan.canvas,
    });
    if (finalQc.status !== 'passed') {
      return failAfterWork(finalQc.violations, 'post-render-qc', finalQc);
    }

    return {
      exitCode: 0,
      outputDirectory,
      reservation,
      workDirectory,
      stagingDirectory,
      scratchDirectory,
      cleanupWarnings,
      overlayRecords,
      applicationResults,
      baseExpectedAudio,
      outputMedia,
      finalQc,
      workVideo,
    };
  } catch (error) {
    const rendererCode = error?.rendererViolationCode;
    if (rendererCode) {
      const outputSafetyCode = rendererCode.startsWith('RENDER_OUTPUT_');
      return contractFailure(
        [makeViolation(rendererCode, outputSafetyCode ? '$.outputDirectory' : '$render')],
        outputSafetyCode ? 'publish' : 'overlay-render',
        undefined,
        cleanupWarnings,
      );
    }
    return processFailure('execution', error, cleanupWarnings);
  }
}

export async function executePresentationRendererV002(jobInput) {
  const jobReport = validatePresentationRenderJobV002(jobInput);
  if (jobReport.status !== 'passed') return contractFailure(jobReport.violations, 'job');
  const outputDirectory = resolvePresentationOutputDirectory(jobInput.outputDirectory);
  if (outputDirectory === null) {
    return contractFailure([makeViolation('RENDER_JOB_SCHEMA_INVALID', '$.outputDirectory')], 'job');
  }
  // 自身のlock・一時成果物でdirtyにする前の事実を先に取る。
  const gitState = await inspectGitStateV001();
  const transportViolations = [];
  const [bundleInput, bindingInput, generationInput, baseGenerationInput, timelineInput] = await Promise.all([
    readTransportJson(jobInput.instructionBundle, 'instructionBundle', transportViolations),
    readTransportJson(jobInput.registryBinding, 'registryBinding', transportViolations),
    readTransportJson(jobInput.resolutionGenerationManifest, 'resolutionGenerationManifest', transportViolations),
    readTransportJson(jobInput.baseMediaGenerationManifest, 'baseMediaGenerationManifest', transportViolations),
    readTransportJson(jobInput.baseMediaTimeline, 'baseMediaTimeline', transportViolations),
  ]);
  let presetInput = null;
  try {
    const absolutePath = resolveJobPath(jobInput.presetRegistry.path);
    const bytes = await readFile(absolutePath);
    const value = JSON.parse(bytes.toString('utf8'));
    const actual = sha256Canonical(value);
    if (actual !== jobInput.presetRegistry.canonicalSha256) {
      transportViolations.push(makeViolation(
        'PRESET_REGISTRY_CANONICAL_HASH_MISMATCH',
        '$.presetRegistry',
        [jobInput.presetRegistry.path],
        {expected: jobInput.presetRegistry.canonicalSha256, actual},
      ));
    }
    presetInput = {absolutePath, bytes, value, canonicalSha256: actual};
  } catch (error) {
    transportViolations.push(makeViolation('PRESET_REGISTRY_CANONICAL_HASH_MISMATCH', '$.presetRegistry', [], {
      readError: error instanceof Error ? error.code ?? error.name : String(error),
    }));
  }
  if (transportViolations.length > 0) return contractFailure(transportViolations, 'transport');

  const tools = await actualToolVersions();
  const trustReport = await loadAndValidatePresentationRendererTrustV001(tools);
  if (trustReport.status !== 'passed') return contractFailure(trustReport.violations, 'trust', trustReport);
  const baseMediaToolReport = validateBaseMediaToolProfileV002(baseGenerationInput.value, tools);
  if (baseMediaToolReport.status !== 'passed') {
    return contractFailure(baseMediaToolReport.violations, 'base-media-tool-profile', baseMediaToolReport);
  }

  // jobの自己申告hashだけで別台帳・別bindingを受け入れない。固定trustの実体と
  // 同じ内容であることを、外枠検査へ渡す前に確認する。
  const trustedInputViolations = [];
  const bindingCanonicalSha256 = sha256Canonical(bindingInput.value);
  if (
    bindingInput.fileSha256 !== trustReport.trust.registryBinding.fileSha256
    || bindingCanonicalSha256 !== trustReport.trust.registryBinding.canonicalSha256
    || repoPath(bindingInput.absolutePath) !== trustReport.trust.registryBinding.path
  ) {
    trustedInputViolations.push(makeViolation(
      'RENDERER_TRUST_ROOT_MISMATCH',
      '$.registryBinding',
      [jobInput.registryBinding.path],
      {
        expectedPath: trustReport.trust.registryBinding.path,
        actualPath: repoPath(bindingInput.absolutePath),
        expectedFileSha256: trustReport.trust.registryBinding.fileSha256,
        actualFileSha256: bindingInput.fileSha256,
        expectedCanonicalSha256: trustReport.trust.registryBinding.canonicalSha256,
        actualCanonicalSha256: bindingCanonicalSha256,
      },
    ));
  }
  if (
    presetInput.canonicalSha256 !== trustReport.trust.presetRegistry.canonicalSha256
    || repoPath(presetInput.absolutePath) !== trustReport.trust.presetRegistry.path
  ) {
    trustedInputViolations.push(makeViolation(
      'PRESET_REGISTRY_CANONICAL_HASH_MISMATCH',
      '$.presetRegistry',
      [jobInput.presetRegistry.path],
      {
        expectedPath: trustReport.trust.presetRegistry.path,
        actualPath: repoPath(presetInput.absolutePath),
        expectedCanonicalSha256: trustReport.trust.presetRegistry.canonicalSha256,
        actualCanonicalSha256: presetInput.canonicalSha256,
      },
    ));
  }
  if (trustedInputViolations.length > 0) {
    return contractFailure(trustedInputViolations, 'trusted-inputs');
  }

  const contractReport = validatePresentationInstructionContract(bundleInput.value, bindingInput.value);
  if (contractReport.overallStatus === 'passed_with_declared_limit') {
    return contractFailure(
      [makeViolation('INSTRUCTION_CONTRACT_PARTIAL', '$instructionBundle')],
      'instruction-contract',
      contractReport,
    );
  }
  if (contractReport.overallStatus !== 'passed') {
    return contractFailure(
      [makeViolation('INSTRUCTION_CONTRACT_NOT_PASSED', '$instructionBundle')],
      'instruction-contract',
      contractReport,
    );
  }

  const generationReport = validateResolutionGenerationManifestV001(bundleInput.value, generationInput.value);
  if (generationReport.status !== 'passed') {
    return contractFailure(generationReport.violations, 'resolution-generation-manifest');
  }
  const sourceBindingReport = validatePresentationRendererSourceBindingV002({
    bundle: bundleInput.value,
    resolutionGenerationManifest: generationInput.value,
    timeline: timelineInput.value,
  });
  if (sourceBindingReport.status !== 'passed') {
    return contractFailure(sourceBindingReport.violations, 'source-binding', sourceBindingReport);
  }
  const sourceArtifactReport = await validateResolutionGenerationSourceArtifactFilesV001(
    generationInput.value,
  );
  if (sourceArtifactReport.status !== 'passed') {
    return contractFailure(sourceArtifactReport.violations, 'resolution-generation-source-artifacts');
  }

  const baseMediaDeclaredPath = timelineInput.value.baseMedia?.path ?? '';
  const baseMediaPath = path.isAbsolute(baseMediaDeclaredPath)
    ? baseMediaDeclaredPath
    : path.resolve(path.dirname(baseGenerationInput.absolutePath), baseMediaDeclaredPath);
  let baseMediaInspection;
  try {
    const [fileSha256, frameCount, media] = await Promise.all([
      fileSha256V002(baseMediaPath),
      inspectFrameCount(baseMediaPath),
      inspectRenderedMediaV002(baseMediaPath),
    ]);
    baseMediaInspection = {fileSha256, frameCount, media};
  } catch (error) {
    return contractFailure([
      makeViolation('BASE_MEDIA_HASH_MISMATCH', '$timeline.baseMedia', [], {
        readError: error instanceof Error ? error.message : String(error),
      }),
    ], 'base-media');
  }
  const baseMediaBindingReport = validateBaseMediaGenerationBindingV002({
    generationManifest: baseGenerationInput.value,
    generationManifestPath: baseGenerationInput.absolutePath,
    timelineFilePath: timelineInput.absolutePath,
    timelineFileSha256: timelineInput.fileSha256,
    baseMediaFilePath: baseMediaPath,
    baseMediaInspection,
  });
  if (baseMediaBindingReport.status !== 'passed') {
    return contractFailure(
      baseMediaBindingReport.violations,
      'base-media-generation-manifest',
      baseMediaBindingReport,
    );
  }
  const timelineReport = validatePresentationBaseMediaTimelineV002(
    timelineInput.value,
    baseGenerationInput.value,
    {
      fileSha256: baseMediaInspection.fileSha256,
      frameCount: baseMediaInspection.frameCount,
      timelineFileSha256: timelineInput.fileSha256,
    },
  );
  if (timelineReport.status !== 'passed') return contractFailure(timelineReport.violations, 'timeline', timelineReport);

  const planReport = buildPresentationRendererPlanV002({
    bundle: bundleInput.value,
    presetRegistry: presetInput.value,
    timeline: timelineInput.value,
    generationManifest: baseGenerationInput.value,
    observedBaseMedia: {
      fileSha256: baseMediaInspection.fileSha256,
      frameCount: baseMediaInspection.frameCount,
      timelineFileSha256: timelineInput.fileSha256,
    },
    layoutRules: trustReport.trust.layoutRules,
  });
  if (planReport.status !== 'passed') return contractFailure(planReport.violations, 'render-plan', planReport);
  const plan = planReport.plan;
  const drawResult = await executeValidatedPresentationDrawAndQcV001({
    outputDirectory,
    plan,
    presetRegistry: presetInput.value,
    baseMediaPath,
    baseMediaInspection,
    expectedFrameCount: timelineInput.value.baseMedia.expectedFrameCount,
  });
  if (drawResult.exitCode !== 0) return drawResult;
  const {
    reservation,
    stagingDirectory,
    cleanupWarnings,
    overlayRecords,
    applicationResults,
    outputMedia,
    finalQc,
    workVideo,
  } = drawResult;

  try {
    const finalPlan = {
      ...plan,
      schemaVersion: PRESENTATION_RENDER_PLAN_SCHEMA_VERSION,
      elements: plan.elements.map((element) => {
        const record = overlayRecords.find((entry) => entry.element.instructionId === element.instructionId);
        return {...element, overlaySha256: record.pngSha256};
      }),
    };
    const applicationDocument = {
      schemaVersion: PRESENTATION_RENDER_APPLICATION_RESULTS_SCHEMA_VERSION,
      rendererVersion: PRESENTATION_RENDERER_VERSION,
      presetRegistryVersion: plan.presetRegistryVersion,
      results: applicationResults,
    };
    const inputFiles = {
      instructionBundle: {path: jobInput.instructionBundle.path, fileSha256: bundleInput.fileSha256},
      registryBinding: {
        path: jobInput.registryBinding.path,
        fileSha256: bindingInput.fileSha256,
        canonicalSha256: bindingCanonicalSha256,
      },
      presetRegistry: {
        path: jobInput.presetRegistry.path,
        canonicalSha256: presetInput.canonicalSha256,
      },
      resolutionGenerationManifest: {
        path: jobInput.resolutionGenerationManifest.path,
        fileSha256: generationInput.fileSha256,
      },
      sourceArtifacts: structuredClone(generationInput.value.sourceArtifacts),
      baseMediaGenerationManifest: {
        path: jobInput.baseMediaGenerationManifest.path,
        fileSha256: baseGenerationInput.fileSha256,
      },
      baseMediaTimeline: {path: jobInput.baseMediaTimeline.path, fileSha256: timelineInput.fileSha256},
      baseMedia: {
        path: timelineInput.value.baseMedia.path,
        fileSha256: baseMediaInspection.fileSha256,
        frameCount: baseMediaInspection.frameCount,
      },
    };
    const rendererFiles = [];
    for (const rendererFile of [
      REMOTION_ENTRY,
      path.join(MODULE_DIRECTORY, 'presentation_base_media_timeline_v002.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_plan_v002.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_text_layout_v001.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_qc_v002.mjs'),
      fileURLToPath(import.meta.url),
      LAYOUT_INSPECTOR,
    ]) {
      rendererFiles.push({path: repoPath(rendererFile), fileSha256: await fileSha256V002(rendererFile)});
    }
    const planPath = path.join(stagingDirectory, outputNames.plan);
    const applicationResultsPath = path.join(stagingDirectory, outputNames.applicationResults);
    const qcPath = path.join(stagingDirectory, outputNames.qc);
    await Promise.all([
      writeJson(planPath, finalPlan),
      writeJson(applicationResultsPath, applicationDocument),
      writeJson(qcPath, finalQc),
    ]);
    const [
      videoFileSha256,
      planFileSha256,
      applicationResultsFileSha256,
      qcFileSha256,
    ] = await Promise.all([
      fileSha256V002(workVideo),
      fileSha256V002(planPath),
      fileSha256V002(applicationResultsPath),
      fileSha256V002(qcPath),
    ]);
    const overlayFiles = applicationResults
      .map((result) => ({
        instructionId: result.instructionId,
        path: result.overlayFile,
        fileSha256: result.overlaySha256,
      }))
      .sort((left, right) => left.path.localeCompare(right.path, 'en'));
    const manifest = {
      schemaVersion: PRESENTATION_RENDER_MANIFEST_SCHEMA_VERSION,
      rendererVersion: PRESENTATION_RENDERER_VERSION,
      rendererTrustCanonicalSha256: PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256,
      git: gitState,
      rendererFiles,
      tools,
      trustedAppearance: {
        rendererContractVersion: trustReport.trust.rendererContractVersion,
        approvedPreview: structuredClone(trustReport.trust.approvedPreview),
        rendererDependencies: structuredClone(trustReport.trust.rendererDependencies),
        fontAssets: structuredClone(trustReport.trust.fontAssets),
        layoutRules: structuredClone(trustReport.trust.layoutRules),
      },
      inputs: inputFiles,
      instructionSetId: plan.instructionSetId,
      resolutionPackageId: plan.resolutionPackageId,
      resolutionPackageCanonicalSha256: sha256Canonical(bundleInput.value.resolutionPackage),
      resolutionPackageGenerationManifestFileSha256: generationInput.fileSha256,
      baseMediaBuildId: baseGenerationInput.value.buildId,
      baseMediaGenerationManifestFileSha256: baseGenerationInput.fileSha256,
      baseMediaToolVerification: {
        status: 'passed',
        expected: structuredClone(baseMediaToolReport.expected),
        observed: structuredClone(baseMediaToolReport.observed),
      },
      timelineId: plan.timelineId,
      presetRegistryVersion: plan.presetRegistryVersion,
      output: {
        videoFile: outputNames.video,
        videoFileSha256,
        video: outputMedia.video,
        audio: outputMedia.audio,
        planFile: outputNames.plan,
        planFileSha256,
        applicationResultsFile: outputNames.applicationResults,
        applicationResultsFileSha256,
        qcFile: outputNames.qc,
        qcFileSha256,
        overlaySet: {
          directory: outputNames.overlays,
          files: overlayFiles,
          canonicalSha256: sha256Canonical(overlayFiles),
        },
      },
    };
    await writeJson(path.join(stagingDirectory, outputNames.manifest), manifest);
    const publication = await publishPresentationArtifactsV002({
      stagingDirectory,
      outputDirectory,
      reservation,
    });
    return {
      exitCode: 0,
      outputDirectory,
      publication,
      cleanupWarnings,
      plan: finalPlan,
      applicationResults: applicationDocument,
      manifest,
      qc: finalQc,
    };
  } catch (error) {
    const rendererCode = error?.rendererViolationCode;
    if (rendererCode) {
      const outputSafetyCode = rendererCode.startsWith('RENDER_OUTPUT_');
      return contractFailure(
        [makeViolation(rendererCode, outputSafetyCode ? '$.outputDirectory' : '$render')],
        outputSafetyCode ? 'publish' : 'overlay-render',
        undefined,
        cleanupWarnings,
      );
    }
    return processFailure('execution', error, cleanupWarnings);
  }
}

export async function runPresentationRendererJobFileV002(jobPath) {
  const absoluteJobPath = resolveJobPath(jobPath);
  let job;
  try {
    job = await readJson(absoluteJobPath);
  } catch (error) {
    return {
      exitCode: 2,
      failure: {
        schemaVersion: 'presentation-render-failure-v002',
        status: 'process_failed',
        stage: 'job-read',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  let result;
  try {
    result = await executePresentationRendererV002(job);
  } catch (error) {
    result = {
      exitCode: 2,
      failure: {
        schemaVersion: 'presentation-render-failure-v002',
        status: 'process_failed',
        stage: 'execution',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  // 失敗報告は戻り値とCLI stderrだけに出す。無効jobの申告先を作成・上書きしない。
  return result;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const main = async () => {
  if (process.argv[2] === '--counterfactual-frame' && process.argv.length === 4) {
    const input = JSON.parse(await readFile(process.argv[3], 'utf8'));
    const result = await renderPresentationCounterfactualEncodedFrameV001(input);
    // The observed subprocess records stderr, so preserve the real outcomes of
    // both ffmpeg children there as well as returning structured stdout.
    console.error(JSON.stringify(result));
    console.log(JSON.stringify(result));
    return;
  }
  const [, , jobPath] = process.argv;
  if (!jobPath || process.argv.length !== 3) {
    console.error('使い方: node render_presentation_v002.mjs <presentation-render-job-v002.json>');
    process.exitCode = 2;
  } else {
    const result = await runPresentationRendererJobFileV002(jobPath);
    if (result.exitCode === 0) {
      console.log(`演出レンダリング完了: ${result.outputDirectory}`);
      if (result.cleanupWarnings?.length > 0) {
        console.error(JSON.stringify({
          status: 'published_with_retained_safety_artifacts',
          cleanupWarnings: result.cleanupWarnings,
        }, null, 2));
      }
    } else console.error(JSON.stringify(result.failure, null, 2));
    process.exitCode = result.exitCode;
  }
};
if (isDirectExecution) {
  main().catch((error) => {
    console.error(JSON.stringify({
      schemaVersion: 'presentation-render-failure-v002',
      status: 'process_failed',
      stage: 'execution',
      message: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 2;
  });
}
