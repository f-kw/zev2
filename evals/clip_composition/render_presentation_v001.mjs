#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationInstructionContract} from './presentation_instruction_contract_v002.mjs';
import {
  PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
  validatePresentationBaseMediaTimelineV001,
} from './presentation_base_media_timeline_v001.mjs';
import {
  PRESENTATION_RENDERER_PLAN_VIOLATION_CODES,
  PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256,
  PRESENTATION_RENDERER_TRUST_VIOLATION_CODES,
  PRESENTATION_RENDERER_VERSION,
  buildPresentationRendererPlanV001,
  loadAndValidatePresentationRendererTrustV001,
} from './presentation_renderer_plan_v001.mjs';
import {PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES} from './presentation_renderer_text_layout_v001.mjs';
import {
  PRESENTATION_RENDERER_QC_VIOLATION_CODES,
  evaluatePresentationRendererQcV001,
  fileSha256V001,
  inspectOverlayPngV001,
  inspectRenderedMediaV001,
} from './presentation_renderer_qc_v001.mjs';

export const PRESENTATION_RENDER_JOB_SCHEMA_VERSION = 'presentation-render-job-v001';
export const PRESENTATION_RENDER_APPLICATION_RESULTS_SCHEMA_VERSION =
  'presentation-render-application-results-v001';
export const PRESENTATION_RENDER_MANIFEST_SCHEMA_VERSION = 'presentation-render-manifest-v001';

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

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {
    cwd: options.cwd ?? WORKSPACE_ROOT,
    env: {...process.env, TMPDIR: '/private/tmp', ...(options.env ?? {})},
  });
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    const result = {code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)};
    if ((options.allowedExitCodes ?? [0]).includes(code)) resolve(result);
    else {
      const error = new Error(
        `${command} failed (${code ?? 'unknown'}): ${result.stderr.toString()}${result.stdout.toString()}`,
      );
      error.processResult = result;
      reject(error);
    }
  });
});

/** レンダラーが成果物を書き始める前のcommitと作業木状態を記録する。 */
const inspectGitStateV001 = async () => {
  const [head, status] = await Promise.all([
    run('git', ['rev-parse', 'HEAD']),
    run('git', ['status', '--porcelain=v1', '--untracked-files=normal']),
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
export const ensureDirectoryChainNoSymlinkV001 = async (rootPath, targetPath) => {
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

/** 書込み前にworkspaceから承認済み出力root、さらに対象までの全階層を検査する。 */
const ensurePresentationOutputDirectory = async (absolutePath) => {
  if (!pathIsWithin(PRESENTATION_OUTPUT_ROOT, absolutePath)) throw unsafeOutputDirectoryError();
  await ensureDirectoryChainNoSymlinkV001(WORKSPACE_ROOT, PRESENTATION_OUTPUT_ROOT);
  const [realWorkspace, realPresentationRoot] = await Promise.all([
    realpath(WORKSPACE_ROOT),
    realpath(PRESENTATION_OUTPUT_ROOT),
  ]);
  if (!pathIsWithin(realWorkspace, realPresentationRoot)) throw unsafeOutputDirectoryError();
  return ensureDirectoryChainNoSymlinkV001(PRESENTATION_OUTPUT_ROOT, absolutePath);
};

const transportEntryValid = (entry) => exactFields(entry, ['path', 'fileSha256'])
  && isNonEmptyString(entry.path)
  && SHA256_PATTERN.test(entry.fileSha256);

export function validatePresentationRenderJobV001(jobInput) {
  const violations = [];
  const expectedFields = [
    'schemaVersion',
    'instructionBundle',
    'registryBinding',
    'presetRegistry',
    'resolutionGenerationManifest',
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

const actualToolVersions = async () => {
  const [remotionPackage, browserVersion, ffmpeg, ffprobe] = await Promise.all([
    readJson(path.join(WORKSPACE_ROOT, 'runner/node_modules/remotion/package.json')),
    readFile(path.join(WORKSPACE_ROOT, 'runner/node_modules/.remotion/chrome-headless-shell/VERSION'), 'utf8'),
    run('ffmpeg', ['-version']),
    run('ffprobe', ['-version']),
  ]);
  return {
    nodeVersion: process.version,
    remotionVersion: remotionPackage.version,
    browserVersion: browserVersion.trim(),
    ffmpegVersion: ffmpeg.stdout.toString().split('\n')[0],
    ffprobeVersion: ffprobe.stdout.toString().split('\n')[0],
  };
};

const inspectFrameCount = async (filePath) => {
  const result = await run('ffprobe', [
    '-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_frames', '-of', 'json', filePath,
  ]);
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

const renderOverlayStill = async (props, outputPath) => {
  try {
    await run(REMOTION_BIN, [
      'still', REMOTION_ENTRY, 'PresentationOverlayV001', outputPath,
      '--props', JSON.stringify(props),
      '--image-format', 'png',
      '--public-dir', REMOTION_PUBLIC,
      '--browser-executable', CHROME_BIN,
      '--log', 'error',
    ], {cwd: WORKSPACE_ROOT, env: {NODE_PATH: RENDER_NODE_MODULES}});
  } catch (error) {
    const violationCode = classifyPresentationRenderErrorV001(error);
    if (violationCode) {
      const mapped = new Error(error instanceof Error ? error.message : String(error));
      mapped.rendererViolationCode = violationCode;
      throw mapped;
    }
    throw error;
  }
};

/** Remotionの失敗文を未知失敗へ丸めず、既知のfont失敗だけを固定コードへ分類する。 */
export function classifyPresentationRenderErrorV001(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('PRESENTATION_FONT_FALLBACK_DETECTED:')) return 'FONT_FALLBACK_DETECTED';
  if (message.includes('PRESENTATION_FONT_LOAD_FAILED:')) return 'FONT_LOAD_FAILED';
  return null;
}

/** 同じ論理入力から描いた2画像のbyte hashが一致することだけを判定する。 */
export function validateOverlayDeterminismV001(firstSha256, secondSha256, instructionId = null) {
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

const imageDifferencePixelsWithinBounds = async (leftPath, rightPath, bounds) => {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (![bounds.left, bounds.top, width, height].every(Number.isInteger) || width <= 0 || height <= 0) {
    throw new TypeError('image comparison bounds are invalid');
  }
  const geometry = `${width}x${height}+${bounds.left}+${bounds.top}`;
  const result = await run('magick', [
    'compare', '-metric', 'AE',
    '(', leftPath, '-crop', geometry, '+repage', ')',
    '(', rightPath, '-crop', geometry, '+repage', ')',
    'null:',
  ], {allowedExitCodes: [0, 1]});
  const value = Number(result.stderr.toString().trim().split(/\s+/)[0]);
  if (!Number.isFinite(value)) throw new Error('bounded image difference could not be parsed');
  return value;
};

const extractFrame = async (inputPath, frame, outputPath) => {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath,
    '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', outputPath,
  ]);
};

const composite = async ({baseMediaPath, plan, overlayRecords, expectedFrameCount, outputPath}) => {
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
    '-c:a', 'copy', '-movflags', '+faststart', outputPath,
  );
  await run('ffmpeg', args);
};

export const PRESENTATION_RENDERER_OUTPUT_NAMES = Object.freeze({
  video: 'presentation-rendered-v001.mp4',
  overlays: 'overlays',
  plan: 'presentation-render-plan-v001.json',
  applicationResults: 'presentation-render-application-results-v001.json',
  manifest: 'presentation-render-manifest-v001.json',
  qc: 'presentation-render-qc-v001.json',
  failure: 'presentation-render-failure-v001.json',
});
const outputNames = PRESENTATION_RENDERER_OUTPUT_NAMES;

/** 描画済み要素を、要求値と実適用値を分けた決定的な適用結果へ写す。 */
export function buildPresentationRenderApplicationResultsV001(overlayRecords) {
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
      overlayFile: path.posix.join(outputNames.overlays, path.basename(record.pngPath)),
      overlaySha256: record.pngSha256,
      finalPlanElementReference: {
        planFile: outputNames.plan,
        instructionId: finalElement.instructionId,
        canonicalSha256: sha256Canonical(finalElement),
      },
    };
  });
}

const removeSuccessArtifacts = async (outputDirectory) => Promise.all(
  Object.entries(outputNames)
    .filter(([key]) => key !== 'failure')
    .map(([, name]) => rm(path.join(outputDirectory, name), {force: true, recursive: true})),
);

const publishSuccessArtifacts = async (workDirectory, outputDirectory) => {
  // manifestを最後に確定し、その存在を一組すべての公開完了標識にする。
  for (const name of [
    outputNames.video,
    outputNames.overlays,
    outputNames.plan,
    outputNames.applicationResults,
    outputNames.qc,
    outputNames.manifest,
  ]) {
    await rename(path.join(workDirectory, name), path.join(outputDirectory, name));
  }
};

const contractFailure = (violations, stage, nested = undefined) => ({
  exitCode: 1,
  failure: {
    schemaVersion: 'presentation-render-failure-v001',
    status: 'failed',
    stage,
    violations: sortViolations(violations),
    ...(nested === undefined ? {} : {nested}),
  },
});

export async function executePresentationRendererV001(jobInput) {
  const outputCandidate = resolvePresentationOutputDirectory(jobInput?.outputDirectory);
  let outputDirectory = null;
  let outputDirectoryViolation = null;
  let gitState = null;
  let gitStateError = null;
  if (outputCandidate !== null) {
    // 自身の一時成果物でdirtyにする前の事実を先に取る。
    try {
      gitState = await inspectGitStateV001();
    } catch (error) {
      gitStateError = error;
    }
    try {
      outputDirectory = await ensurePresentationOutputDirectory(outputCandidate);
      await removeSuccessArtifacts(outputDirectory);
      await rm(path.join(outputDirectory, outputNames.failure), {force: true});
    } catch (error) {
      if (error?.code !== 'UNSAFE_PRESENTATION_OUTPUT_DIRECTORY') throw error;
      outputDirectoryViolation = makeViolation('RENDER_JOB_SCHEMA_INVALID', '$.outputDirectory', [], {
        reason: error.code,
      });
    }
  }
  const jobReport = validatePresentationRenderJobV001(jobInput);
  if (outputDirectoryViolation) {
    jobReport.violations.push(outputDirectoryViolation);
    sortViolations(jobReport.violations);
    jobReport.status = 'failed';
  }
  if (jobReport.status !== 'passed') return contractFailure(jobReport.violations, 'job');
  if (gitStateError) throw gitStateError;
  if (outputDirectory === null) {
    return contractFailure([makeViolation('RENDER_JOB_SCHEMA_INVALID', '$.outputDirectory')], 'job');
  }
  const transportViolations = [];
  const [bundleInput, bindingInput, generationInput, timelineInput] = await Promise.all([
    readTransportJson(jobInput.instructionBundle, 'instructionBundle', transportViolations),
    readTransportJson(jobInput.registryBinding, 'registryBinding', transportViolations),
    readTransportJson(jobInput.resolutionGenerationManifest, 'resolutionGenerationManifest', transportViolations),
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
  const sourceArtifactReport = await validateResolutionGenerationSourceArtifactFilesV001(
    generationInput.value,
  );
  if (sourceArtifactReport.status !== 'passed') {
    return contractFailure(sourceArtifactReport.violations, 'resolution-generation-source-artifacts');
  }

  const baseMediaPath = resolveJobPath(timelineInput.value.baseMedia?.path ?? '');
  let baseMediaInspection;
  try {
    const [fileSha256, frameCount, media] = await Promise.all([
      fileSha256V001(baseMediaPath),
      inspectFrameCount(baseMediaPath),
      inspectRenderedMediaV001(baseMediaPath),
    ]);
    baseMediaInspection = {fileSha256, frameCount, media};
  } catch (error) {
    return contractFailure([
      makeViolation('BASE_MEDIA_HASH_MISMATCH', '$timeline.baseMedia', [], {
        readError: error instanceof Error ? error.message : String(error),
      }),
    ], 'base-media');
  }
  const timelineReport = validatePresentationBaseMediaTimelineV001(
    timelineInput.value,
    generationInput.value,
    {fileSha256: baseMediaInspection.fileSha256, frameCount: baseMediaInspection.frameCount},
  );
  if (timelineReport.status !== 'passed') return contractFailure(timelineReport.violations, 'timeline', timelineReport);

  const planReport = buildPresentationRendererPlanV001({
    bundle: bundleInput.value,
    presetRegistry: presetInput.value,
    timeline: timelineInput.value,
    generationManifest: generationInput.value,
    layoutRules: trustReport.trust.layoutRules,
  });
  if (planReport.status !== 'passed') return contractFailure(planReport.violations, 'render-plan', planReport);
  const timelineDurationMs = timelineInput.value.segments.at(-1).outputEndMs;
  const plan = {
    ...planReport.plan,
    timelineDurationMs,
    expectedFrameCount: timelineInput.value.baseMedia.expectedFrameCount,
  };
  const workDirectory = await mkdtemp(path.join(outputDirectory, '.presentation-renderer-v001-work-'));
  await mkdir(path.join(workDirectory, 'overlays'), {recursive: true});
  await mkdir(path.join(workDirectory, 'frames'), {recursive: true});
  const failAfterWork = async (violations, stage, nested = undefined) => {
    await Promise.all([
      rm(workDirectory, {recursive: true, force: true}),
      removeSuccessArtifacts(outputDirectory),
    ]);
    return contractFailure(violations, stage, nested);
  };

  try {
    const overlayProps = plan.elements.map((element) => overlayPropsFor(element, plan, presetInput.value));
    const layoutInputPath = path.join(workDirectory, 'layout-input.json');
    const layoutOutputPath = path.join(workDirectory, 'layout-output.json');
    await writeJson(layoutInputPath, {canvas: plan.canvas, overlays: overlayProps});
    const layoutProcess = await run(
      TSX_BIN,
      [LAYOUT_INSPECTOR, layoutInputPath, layoutOutputPath],
      {
        allowedExitCodes: [0, 1],
        env: {NODE_PATH: RENDER_NODE_MODULES},
      },
    );
    let layoutInspection;
    try {
      layoutInspection = await readJson(layoutOutputPath);
    } catch (error) {
      throw new Error(
        `layout inspector produced no result (exit ${layoutProcess.code}): `
        + `${layoutProcess.stderr.toString()}${layoutProcess.stdout.toString()}`,
        {cause: error},
      );
    }
    if (layoutInspection.status !== 'passed') {
      return failAfterWork(layoutInspection.violations, 'layout-preflight', layoutInspection);
    }
    const layoutByInstruction = new Map(layoutInspection.items.map((item) => [item.instructionId, item]));
    const overlayRecords = [];
    for (const [index, element] of plan.elements.entries()) {
      const baseName = `${String(index + 1).padStart(2, '0')}-${sha256Bytes(element.instructionId).slice(0, 12)}`;
      const pngPath = path.join(workDirectory, 'overlays', `${baseName}.png`);
      const repeatPath = path.join(workDirectory, 'overlays', `${baseName}.repeat.png`);
      await renderOverlayStill(overlayProps[index], pngPath);
      await renderOverlayStill(overlayProps[index], repeatPath);
      const [pngSha256, repeatSha256] = await Promise.all([
        fileSha256V001(pngPath),
        fileSha256V001(repeatPath),
      ]);
      const determinism = validateOverlayDeterminismV001(
        pngSha256,
        repeatSha256,
        element.instructionId,
      );
      if (determinism.status !== 'passed') {
        return failAfterWork(determinism.violations, 'overlay-determinism');
      }
      await rm(repeatPath, {force: true});
      const lineRects = layoutByInstruction.get(element.instructionId)?.lineRects ?? [];
      const lineAlphaBounds = [];
      for (const line of element.indexedLines) {
        const lineMaskPath = path.join(
          workDirectory,
          'frames',
          `${baseName}-line-${String(line.lineIndex + 1).padStart(2, '0')}.png`,
        );
        await renderOverlayStill(
          {...overlayProps[index], inspectionLineIndex: line.lineIndex},
          lineMaskPath,
        );
        const lineInspection = await inspectOverlayPngV001({
          instructionId: element.instructionId,
          pngPath: lineMaskPath,
        });
        if (lineInspection.alphaBounds) {
          lineAlphaBounds.push({lineIndex: line.lineIndex, ...lineInspection.alphaBounds});
        }
        await rm(lineMaskPath, {force: true});
      }
      const inspection = await inspectOverlayPngV001({
        instructionId: element.instructionId,
        pngPath,
        lineRects,
        lineAlphaBounds,
        appliedOverlayPropsCanonicalSha256: sha256Canonical(overlayProps[index]),
        overlayFile: path.posix.join(outputNames.overlays, path.basename(pngPath)),
        overlaySha256: pngSha256,
      });
      overlayRecords.push({element, props: overlayProps[index], fileStem: baseName, pngPath, pngSha256, inspection});
    }

    const applicationResults = buildPresentationRenderApplicationResultsV001(overlayRecords);
    const baseExpectedAudio = baseMediaInspection.media.audio
      ? {present: true, ...baseMediaInspection.media.audio}
      : {present: false};
    const layoutQc = evaluatePresentationRendererQcV001({
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

    const workVideo = path.join(workDirectory, outputNames.video);
    await composite({
      baseMediaPath,
      plan,
      overlayRecords,
      expectedFrameCount: timelineInput.value.baseMedia.expectedFrameCount,
      outputPath: workVideo,
    });
    const outputMedia = await inspectRenderedMediaV001(workVideo);
    if (outputMedia.video) outputMedia.video.frameCount = await inspectFrameCount(workVideo);
    const transparentOverlayPath = path.join(workDirectory, 'frames', 'transparent-overlay.png');
    await run('magick', [
      '-size', `${plan.canvas.width}x${plan.canvas.height}`,
      'xc:none',
      transparentOverlayPath,
    ]);
    for (const record of overlayRecords) {
      const representativeFrame = record.element.startFrame
        + Math.floor(record.element.displayFrameCount / 2);
      const outputFrame = path.join(workDirectory, 'frames', `${record.fileStem}-output.png`);
      const omittedFrame = path.join(workDirectory, 'frames', `${record.fileStem}-omitted.png`);
      const omittedVideo = path.join(workDirectory, 'frames', `${record.fileStem}-omitted.mp4`);
      const counterfactualRecords = overlayRecords.map((entry) => (
        entry === record ? {...entry, pngPath: transparentOverlayPath} : entry
      ));
      await composite({
        baseMediaPath,
        plan,
        overlayRecords: counterfactualRecords,
        expectedFrameCount: timelineInput.value.baseMedia.expectedFrameCount,
        outputPath: omittedVideo,
      });
      await extractFrame(workVideo, representativeFrame, outputFrame);
      await extractFrame(omittedVideo, representativeFrame, omittedFrame);
      record.inspection.visibilityComparisonBasis = 'same-composite-with-instruction-omitted';
      record.inspection.representativeFrame = representativeFrame;
      record.inspection.changedPixelsAgainstInstructionOmittedFrame =
        await imageDifferencePixelsWithinBounds(
          outputFrame,
          omittedFrame,
          record.inspection.alphaBounds,
        );
      await rm(omittedVideo, {force: true});
    }
    const finalQc = evaluatePresentationRendererQcV001({
      plan,
      applicationResults,
      overlayInspections: overlayRecords.map((record) => record.inspection),
      mediaInspection: outputMedia,
      expectedAudio: baseExpectedAudio,
      expectedFrameCount: plan.expectedFrameCount,
      canvas: plan.canvas,
    });
    if (finalQc.status !== 'passed') {
      return failAfterWork(finalQc.violations, 'post-render-qc', finalQc);
    }

    const finalPlan = {
      ...plan,
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
      path.join(MODULE_DIRECTORY, 'presentation_base_media_timeline_v001.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_plan_v001.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_text_layout_v001.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_qc_v001.mjs'),
      fileURLToPath(import.meta.url),
      LAYOUT_INSPECTOR,
    ]) {
      rendererFiles.push({path: repoPath(rendererFile), fileSha256: await fileSha256V001(rendererFile)});
    }
    const planPath = path.join(workDirectory, outputNames.plan);
    const applicationResultsPath = path.join(workDirectory, outputNames.applicationResults);
    const qcPath = path.join(workDirectory, outputNames.qc);
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
      fileSha256V001(workVideo),
      fileSha256V001(planPath),
      fileSha256V001(applicationResultsPath),
      fileSha256V001(qcPath),
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
    await writeJson(path.join(workDirectory, outputNames.manifest), manifest);
    await publishSuccessArtifacts(workDirectory, outputDirectory);
    await rm(workDirectory, {recursive: true, force: true});
    return {
      exitCode: 0,
      outputDirectory,
      plan: finalPlan,
      applicationResults: applicationDocument,
      manifest,
      qc: finalQc,
    };
  } catch (error) {
    await Promise.all([
      rm(workDirectory, {recursive: true, force: true}),
      removeSuccessArtifacts(outputDirectory),
    ]);
    const rendererCode = error?.rendererViolationCode;
    if (rendererCode) {
      return contractFailure([makeViolation(rendererCode, '$render')], 'overlay-render');
    }
    throw error;
  }
}

export async function runPresentationRendererJobFileV001(jobPath) {
  const absoluteJobPath = resolveJobPath(jobPath);
  let job;
  try {
    job = await readJson(absoluteJobPath);
  } catch (error) {
    return {
      exitCode: 2,
      failure: {
        schemaVersion: 'presentation-render-failure-v001',
        status: 'process_failed',
        stage: 'job-read',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  let result;
  try {
    result = await executePresentationRendererV001(job);
  } catch (error) {
    result = {
      exitCode: 2,
      failure: {
        schemaVersion: 'presentation-render-failure-v001',
        status: 'process_failed',
        stage: 'execution',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  if (result.exitCode !== 0) {
    const outputCandidate = resolvePresentationOutputDirectory(job?.outputDirectory);
    if (outputCandidate !== null) {
      try {
        const outputDirectory = await ensurePresentationOutputDirectory(outputCandidate);
        await removeSuccessArtifacts(outputDirectory);
        await writeJson(path.join(outputDirectory, outputNames.failure), result.failure);
      } catch (error) {
        if (error?.code !== 'UNSAFE_PRESENTATION_OUTPUT_DIRECTORY') throw error;
      }
    }
  }
  return result;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  const [, , jobPath] = process.argv;
  if (!jobPath || process.argv.length !== 3) {
    console.error('使い方: node render_presentation_v001.mjs <presentation-render-job-v001.json>');
    process.exitCode = 2;
  } else {
    const result = await runPresentationRendererJobFileV001(jobPath);
    if (result.exitCode === 0) console.log(`演出レンダリング完了: ${result.outputDirectory}`);
    else console.error(JSON.stringify(result.failure, null, 2));
    process.exitCode = result.exitCode;
  }
}
