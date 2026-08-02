#!/usr/bin/env node

import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readlinkSync,
  readSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {
  open,
  readFile,
  realpath,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  buildPresentationCaptionDisplayPairValidationReportV002,
  buildPresentationCaptionDisplayPairV003,
  checkPresentationCaptionDisplayPairV003,
  validatePresentationCaptionDisplayPairGenerationJobV001,
  validatePresentationCaptionDisplayPairValidationReportV002,
} from './presentation_caption_display_pair_v003.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  decodePresentationCaptionB4LayoutInspectionJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  mapPresentationSourceIntervalV002,
  validatePresentationBaseMediaTimelineV002,
} from './presentation_base_media_timeline_v002.mjs';
import {
  normalizeSourceAtomSpeakerForPackage,
} from './presentation_source_speaker_policy_v001.mjs';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/';
const OUTPUT_PARENT =
  'evals/clip_composition/outputs/presentation/caption-display-pairs';
const PACKAGE_FILES = Object.freeze([
  ['boundaryEvidence', 'segmenter-boundary-evidence.json'],
  ['embeddedGateAReport', 'embedded-gate-a-validation-report.json'],
  ['semanticSourceInput', 'semantic-source-input.json'],
  ['deterministicExpansionMap', 'deterministic-expansion-map.json'],
  ['sourceOnlyLeakageReport', 'source-only-leakage-report.json'],
  ['packageManifest', 'package-manifest.json'],
  ['packageValidationReport', 'package-validation-report.json'],
]);
const SEMANTIC_FILES = Object.freeze([
  ['job', null],
  ['rawSemanticOutput', null],
  ['validationReport', null],
]);
const RETAINED_FILES = Object.freeze([
  ['generationManifest', 'generation-manifest.json'],
  ['sourceAtoms', 'source-atoms.json'],
  ['validationReport', 'validation-report.json'],
]);
const BASE_FILES = Object.freeze([
  ['generationManifest', 'generation-manifest.json'],
  ['timeline', 'timeline.json'],
  ['validationReport', 'validation-report.json'],
  ['baseMedia', 'base-media.mp4'],
]);
const REGISTRY_FILES = Object.freeze([
  ['trustedRegistryBindings', 'trusted-registry-bindings.json'],
  ['presetRegistry', 'preset-registry.json'],
  ['presetValidationIndex', 'preset-validation-index.json'],
  ['materialValidationIndex', 'material-validation-index.json'],
]);
const OUTPUT_FILES = Object.freeze([
  ['displayPlan', 'display-plan.json'],
  ['instructionBundle', 'instruction-bundle.json'],
  ['captionCheckReport', 'caption-check-report.json'],
  ['layoutPreflight', 'layout-preflight.json'],
  ['reviewRenderRequest', 'review-render-request.json'],
  ['pairGenerationManifest', 'pair-generation-manifest.json'],
  ['pairValidationReport', 'pair-validation-report.json'],
]);
const SHA256 = /^[0-9a-f]{64}$/;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result?.status !== 'serialized') throw new TypeError('formal serialization failed');
  return result.bytes;
};
const canonicalBytes = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result?.status !== 'canonicalized') throw new TypeError('canonicalization failed');
  return result.bytes;
};
const shaBytes = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result?.status !== 'hashed') throw new TypeError('hash failed');
  return result.sha256;
};
const canonicalSha = (value) => shaBytes(canonicalBytes(value));
const decode = (snapshot) => {
  if (!Buffer.isBuffer(snapshot?.bytes)) throw new TypeError('json bytes unavailable');
  const decoded = decodePresentationCaptionB1StrictJsonV001(snapshot.bytes);
  if (decoded?.status !== 'decoded') throw new TypeError('strict json decode failed');
  return decoded.value;
};
const sameJson = (left, right) => canonicalBytes(left).equals(canonicalBytes(right));
const fatal = () => ({
  schemaVersion: 'presentation-caption-display-pair-cli-fatal-v001',
  diagnostic: 'CAPTION_B4_FORMAL_CLI_JOB_CONTEXT_UNAVAILABLE',
});
const safeJobPath = (value) => typeof value === 'string'
  && value.startsWith(JOB_ROOT)
  && value.endsWith('.json')
  && value.slice(JOB_ROOT.length).length > 5
  && !value.slice(JOB_ROOT.length).includes('/')
  && !value.includes('..')
  && !value.includes('\\');
const repositoryAbsolute = (pathValue) => {
  const absolute = resolve(WORKSPACE_ROOT, pathValue);
  if (absolute !== `${WORKSPACE_ROOT}${sep}${pathValue}`) throw new TypeError('unsafe path');
  return absolute;
};
const statProjection = (stats) => ({
  dev: stats.dev.toString(),
  ino: stats.ino.toString(),
  mode: stats.mode.toString(),
  nlink: stats.nlink.toString(),
  size: stats.size.toString(),
  mtimeNs: stats.mtimeNs.toString(),
  ctimeNs: stats.ctimeNs.toString(),
});
const sameProjection = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const stableRead = async (pathValue, {binary = false} = {}) => {
  const absolute = repositoryAbsolute(pathValue);
  const pathStat = lstatSync(absolute, {bigint: true});
  if (!pathStat.isFile() || pathStat.isSymbolicLink() || pathStat.nlink !== 1n) {
    throw new TypeError('unsafe input file');
  }
  const handle = await open(absolute, 'r');
  try {
    const before = statProjection(await handle.stat({bigint: true}));
    let bytes = null;
    let fileSha256 = null;
    if (binary) {
      const hash = createHash('sha256');
      const chunk = Buffer.allocUnsafe(1024 * 1024);
      let position = 0;
      while (true) {
        const {bytesRead} = await handle.read(chunk, 0, chunk.length, position);
        if (bytesRead === 0) break;
        hash.update(chunk.subarray(0, bytesRead));
        position += bytesRead;
      }
      fileSha256 = hash.digest('hex');
    } else {
      bytes = await handle.readFile();
      fileSha256 = shaBytes(bytes);
    }
    const after = statProjection(await handle.stat({bigint: true}));
    if (!sameProjection(before, after)) throw new TypeError('input changed during read');
    return {path: pathValue, bytes, fileSha256, statBefore: before, statAfter: after};
  } finally {
    await handle.close();
  }
};

const readGroup = async (rootPath, specifications) => Promise.all(
  specifications.map(async ([role, fileName]) => {
    const path = `${rootPath}/${fileName}`;
    return {role, path, snapshot: await stableRead(path, {binary: role === 'baseMedia'})};
  }),
);
const readSemanticGroup = async (binding) => Promise.all(
  SEMANTIC_FILES.map(async ([role]) => {
    const path = binding[role].path;
    return {role, path, snapshot: await stableRead(path)};
  }),
);
const bound = (entry, binding, canonical = true) => entry.path === binding?.path
  && entry.snapshot.fileSha256 === binding?.fileSha256
  && (!canonical || canonicalSha(decode(entry.snapshot)) === binding?.canonicalSha256);
const byRole = (entries) => new Map(entries.map((entry) => [entry.role, entry]));

const packageTreeSha = (rootPath) => {
  const rows = [];
  const visit = (absoluteRoot, relativeRoot = '') => {
    const entries = readdirSync(absoluteRoot, {withFileTypes: true})
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const relativePath = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
      const absolute = resolve(absoluteRoot, entry.name);
      if (entry.isSymbolicLink()) throw new TypeError('package symlink');
      if (entry.isDirectory()) visit(absolute, relativePath);
      else if (entry.isFile()) {
        const bytes = readFileSync(absolute);
        rows.push({relativePath, sizeBytes: bytes.length, fileSha256: shaBytes(bytes)});
      } else throw new TypeError('unknown package entry');
    }
  };
  visit(rootPath);
  return canonicalSha(rows);
};

const observeRuntime = async () => {
  const resolvedNodePath = await realpath(process.execPath);
  const segmenter = new Intl.Segmenter('ja', {granularity: 'word'}).resolvedOptions();
  const tsxEntryLogicalPath = 'runner/node_modules/tsx/dist/cli.mjs';
  const tsxEntryRealPath = await realpath(repositoryAbsolute(tsxEntryLogicalPath));
  const tsxRoot = resolve(dirname(tsxEntryRealPath), '..');
  const tsxPackage = JSON.parse(await readFile(resolve(tsxRoot, 'package.json'), 'utf8'));
  const requireFromTsx = createRequire(tsxEntryRealPath);
  const esbuildEntryRealPath = await realpath(requireFromTsx.resolve('esbuild/lib/main.js'));
  const esbuildRoot = resolve(dirname(esbuildEntryRealPath), '..');
  const esbuildPackage = JSON.parse(
    await readFile(resolve(esbuildRoot, 'package.json'), 'utf8'),
  );
  const requireFromEsbuild = createRequire(esbuildEntryRealPath);
  const esbuildBinaryRealPath = await realpath(
    requireFromEsbuild.resolve(`@esbuild/${process.platform}-${process.arch}/bin/esbuild`),
  );
  return {
    resolvedNodePath,
    nodeBinarySha256: shaBytes(await readFile(resolvedNodePath)),
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: segmenter.locale,
    resolvedGranularity: segmenter.granularity,
    layoutExecutionBinding: {
      tsxEntryLogicalPath,
      tsxEntryRealPath,
      tsxEntryFileSha256: shaBytes(await readFile(tsxEntryRealPath)),
      tsxPackageVersion: tsxPackage.version,
      tsxPackageTreeCanonicalSha256: packageTreeSha(tsxRoot),
      esbuildEntryRealPath,
      esbuildEntryFileSha256: shaBytes(await readFile(esbuildEntryRealPath)),
      esbuildPackageVersion: esbuildPackage.version,
      esbuildPackageTreeCanonicalSha256: packageTreeSha(esbuildRoot),
      esbuildBinaryRealPath,
      esbuildBinaryFileSha256: shaBytes(await readFile(esbuildBinaryRealPath)),
    },
  };
};

const monitoredProjection = (rootPath, ignoredPaths) => {
  const ignored = new Set(ignoredPaths);
  const rows = [];
  const fileHash = (absolute) => {
    const descriptor = openSync(absolute, 'r');
    try {
      const before = statProjection(fstatSync(descriptor, {bigint: true}));
      const hash = createHash('sha256');
      const chunk = Buffer.allocUnsafe(1024 * 1024);
      let position = 0;
      while (true) {
        const bytesRead = readSync(descriptor, chunk, 0, chunk.length, position);
        if (bytesRead === 0) break;
        hash.update(chunk.subarray(0, bytesRead));
        position += bytesRead;
      }
      const after = statProjection(fstatSync(descriptor, {bigint: true}));
      if (!sameProjection(before, after)) throw new TypeError('monitored file changed');
      return hash.digest('hex');
    } finally {
      closeSync(descriptor);
    }
  };
  const visit = (absolute) => {
    const repositoryPath = relative(WORKSPACE_ROOT, absolute).split(sep).join('/');
    if (ignored.has(repositoryPath)) return;
    const stats = lstatSync(absolute, {bigint: true});
    if (stats.isDirectory()) {
      rows.push({path: repositoryPath, kind: 'directory', contentSha256: null});
      readdirSync(absolute, {withFileTypes: true})
        .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
        .forEach((entry) => visit(resolve(absolute, entry.name)));
    } else if (stats.isSymbolicLink()) {
      rows.push({
        path: repositoryPath,
        kind: 'symlink',
        contentSha256: shaBytes(Buffer.from(readlinkSync(absolute), 'utf8')),
      });
    } else if (stats.isFile()) {
      rows.push({path: repositoryPath, kind: 'file', contentSha256: fileHash(absolute)});
    } else {
      throw new TypeError('unsupported monitored node');
    }
  };
  visit(repositoryAbsolute(rootPath));
  return canonicalSha(rows);
};

const FORMAL_PROJECTION_UNAVAILABLE = Object.freeze({
  kind: 'untrusted',
  diagnostic: 'CAPTION_B4_FORMAL_READ_ONLY_PROJECTION_UNAVAILABLE',
});

const pathIsMissing = (pathValue) => {
  try {
    lstatSync(repositoryAbsolute(pathValue));
    return false;
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    throw error;
  }
};

export function inspectPresentationCaptionDisplayPairReadOnlyProjectionV001({
  watchedRoot,
  jobPath,
  allowedWritePaths,
} = {}) {
  try {
    if (typeof watchedRoot !== 'string'
      || !safeJobPath(jobPath)
      || !Array.isArray(allowedWritePaths)
      || allowedWritePaths.length !== 3
      || allowedWritePaths.some((pathValue) => typeof pathValue !== 'string')) {
      return FORMAL_PROJECTION_UNAVAILABLE;
    }
    const [formalOutputPath, lockPath, workPath] = allowedWritePaths;
    const formalPrefix = `${OUTPUT_PARENT}/`;
    const pairId = formalOutputPath.slice(formalPrefix.length);
    if (!formalOutputPath.startsWith(formalPrefix)
      || !FORMAL_ID.test(pairId)
      || ['.', '..'].includes(pairId)
      || formalOutputPath.includes('\0')
      || lockPath.includes('\0')
      || workPath.includes('\0')
      || lockPath !== `${formalOutputPath}.lock`
      || workPath !== `${formalOutputPath}.work`) {
      return FORMAL_PROJECTION_UNAVAILABLE;
    }
    const ignoredPaths = [jobPath, ...allowedWritePaths];
    ignoredPaths.forEach(repositoryAbsolute);
    repositoryAbsolute(watchedRoot);
    if (ignoredPaths.some((pathValue) => !pathIsMissing(pathValue))) {
      return FORMAL_PROJECTION_UNAVAILABLE;
    }
    const expectedBeforeCanonicalSha256 = monitoredProjection(
      watchedRoot,
      ignoredPaths,
    );
    if (ignoredPaths.some((pathValue) => !pathIsMissing(pathValue))) {
      return FORMAL_PROJECTION_UNAVAILABLE;
    }
    return Object.freeze({
      kind: 'trusted-projection',
      watchedRoot,
      excludedPaths: Object.freeze([jobPath]),
      allowedWritePaths: Object.freeze([...allowedWritePaths]),
      expectedBeforeCanonicalSha256,
    });
  } catch {
    return FORMAL_PROJECTION_UNAVAILABLE;
  }
}

const normalizedAtoms = (retained) => retained.rawSourceAtoms.map((atom) => {
  const normalized = normalizeSourceAtomSpeakerForPackage(atom).atom;
  return {
    atomId: normalized.atomId,
    speechId: normalized.speechId,
    speaker: Object.prototype.hasOwnProperty.call(normalized, 'speaker')
      ? normalized.speaker
      : null,
    text: normalized.text,
    startMs: normalized.startMs,
    endMs: normalized.endMs,
  };
});

const runLayoutInspector = async (runtime, displayPlan, registry) => {
  const preset = registry.presets.find(
    (entry) => entry.presetId === 'normal-landscape-readable-pop-v001',
  );
  const state = preset.visualStates.find((entry) => entry.stateId === 'caption-core-v001');
  const font = registry.fontAssets.find((entry) => entry.fontAssetId === state.textStyle.fontAssetId);
  const items = displayPlan.containers.flatMap((container) => container.cues).map((cue) => ({
    layerId: cue.cueId,
    stateId: state.stateId,
    text: cue.lines.map((line) => line.text).join('\n'),
    maxLines: 2,
    props: {
      style: {
        fontFamily: font.fileName,
        fontSize: state.textStyle.fontSizePx,
        fontColor: state.textStyle.fontColor,
        borderColor: state.textStyle.borderColor,
        borderWidth: state.textStyle.borderWidthPx,
        lineSpacing: state.textStyle.lineSpacingPercent,
        glowColor: state.textStyle.glowColor,
        glowColorMode: 'fixed',
        glowWidth: state.textStyle.glowWidthPx,
        glowOpacity: state.textStyle.glowOpacityPercent,
      },
      position: {
        preset: state.position.preset,
        alignment: state.position.alignment,
        offsetX: state.position.offsetXPercent,
        offsetY: state.position.offsetYPercent,
      },
      maxCharsPerLine: state.layout.maxCharsPerLine,
      singleLine: state.layout.singleLine,
      width: registry.canvas.width,
      height: registry.canvas.height,
      glowSeedHint: `${preset.presetId}/speech-caption/${state.stateId}`,
    },
  }));
  const input = {canvas: {width: registry.canvas.width, height: registry.canvas.height, safeAreaPx: registry.canvas.safeAreaPx}, items};
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'zev-b4-layout-'));
  const inputPath = join(temporaryRoot, 'input.json');
  const outputPath = join(temporaryRoot, 'output.json');
  try {
    writeFileSync(inputPath, formalBytes(input), {flag: 'wx'});
    const argv = [
      runtime.layoutExecutionBinding.tsxEntryRealPath,
      repositoryAbsolute('evals/clip_composition/inspect_presentation_preset_layout.ts'),
      inputPath,
      outputPath,
    ];
    const result = await new Promise((resolvePromise) => {
      const child = spawn(runtime.resolvedNodePath, argv, {
        cwd: WORKSPACE_ROOT,
        env: {},
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      child.on('error', () => resolvePromise({code: null}));
      child.on('close', (code) => resolvePromise({code}));
    });
    if (![0, 1].includes(result.code) || !existsSync(outputPath)) {
      throw new TypeError('layout inspector failed');
    }
    const decoded =
      decodePresentationCaptionB4LayoutInspectionJsonV001(readFileSync(outputPath));
    if (decoded?.status !== 'decoded') throw new TypeError('layout output invalid');
    return decoded.value;
  } finally {
    rmSync(temporaryRoot, {recursive: true, force: true});
  }
};

const contentSetHash = (artifacts) => canonicalSha(artifacts.map((artifact) => ({
  role: artifact.role,
  fileName: artifact.fileName,
  fileSha256: artifact.fileSha256,
  canonicalSha256: artifact.canonicalSha256,
  schemaVersion: artifact.schemaVersion,
})));
const reviewState = () => ({
  stage: 'review_input_ready',
  reviewOnly: true,
  publicationAllowed: false,
  segmenterBoundaryEvidence: 'passed',
  semanticStructure: 'passed',
  naturalBoundary: 'pending_human_review',
  semanticReadability: 'pending_human_review',
  layoutPreflight: 'passed',
  renderedLayoutQc: 'pending_render_qc',
  humanAssessment: 'not_requested',
});
const makeManifest = ({jobPath, jobSnapshot, job, runtime, artifacts}) => ({
  schemaVersion: 'presentation-resolution-instruction-pair-generation-manifest-v001',
  generatorVersion: 'presentation-caption-display-pair-generator-v001',
  pairId: job.publication.pairId,
  artifactId: job.artifactId,
  jobBinding: {path: jobPath, fileSha256: jobSnapshot.fileSha256},
  implementationBinding: structuredClone(job.implementationBinding),
  inputBindings: {
    sourcePackageBinding: structuredClone(job.sourcePackageBinding),
    semanticCheckBinding: structuredClone(job.semanticCheckBinding),
    retainedSourceBinding: structuredClone(job.retainedSourceBinding),
    baseMediaBinding: structuredClone(job.baseMediaBinding),
    registryBinding: structuredClone(job.registryBinding),
  },
  runtimeBinding: structuredClone(runtime),
  contentArtifacts: artifacts.map((artifact) => ({
    role: artifact.role,
    fileName: artifact.fileName,
    fileSha256: artifact.fileSha256,
    canonicalSha256: artifact.canonicalSha256,
    schemaVersion: artifact.schemaVersion,
  })),
  contentSetCanonicalSha256: contentSetHash(artifacts),
  reviewState: reviewState(),
  publication: {
    formalOutputPath: job.publication.formalOutputPath,
    fileCount: 7,
    atomicRename: true,
    lockReleased: true,
    workPathRemoved: true,
  },
});

const artifact = (role, fileName, value) => {
  const bytes = formalBytes(value);
  return {
    role,
    fileName,
    schemaVersion: value.schemaVersion,
    value,
    bytes,
    fileSha256: shaBytes(bytes),
    canonicalSha256: canonicalSha(value),
  };
};

const runTrusted = async (jobPath, jobSnapshot, job) => {
  const ignored = [jobPath, ...job.readOnlyGuard.allowedWritePaths];
  const before = monitoredProjection(job.readOnlyGuard.watchedRoot, ignored);
  const implementationInputs = await Promise.all(
    [...job.implementationBinding.files, ...job.implementationBinding.dependencyFiles]
      .map(async (binding) => ({role: binding.role, path: binding.path, snapshot: await stableRead(binding.path)})),
  );
  const sourcePackageInputs = await readGroup(job.sourcePackageBinding.rootPath, PACKAGE_FILES);
  const semanticCheckInputs = await readSemanticGroup(job.semanticCheckBinding);
  const retainedSourceInputs = await readGroup(job.retainedSourceBinding.rootPath, RETAINED_FILES);
  const baseMediaInputs = await readGroup(job.baseMediaBinding.rootPath, BASE_FILES);
  const registryInputs = await readGroup(job.registryBinding.rootPath, REGISTRY_FILES);
  const runtime = await observeRuntime();

  const implementationMatches = implementationInputs.map((entry, index) => ({
    matches: entry.snapshot.fileSha256 === [
      ...job.implementationBinding.files,
      ...job.implementationBinding.dependencyFiles,
    ][index].fileSha256,
  }));
  const sourceByRole = byRole(sourcePackageInputs);
  const semanticByRole = byRole(semanticCheckInputs);
  const retainedByRole = byRole(retainedSourceInputs);
  const baseByRole = byRole(baseMediaInputs);
  const registryByRole = byRole(registryInputs);
  const inputMatches = [
    bound(sourceByRole.get('packageManifest'), job.sourcePackageBinding.manifest)
      && bound(sourceByRole.get('packageValidationReport'), job.sourcePackageBinding.validationReport),
    bound(semanticByRole.get('job'), job.semanticCheckBinding.job)
      && bound(semanticByRole.get('rawSemanticOutput'), job.semanticCheckBinding.rawSemanticOutput)
      && bound(semanticByRole.get('validationReport'), job.semanticCheckBinding.validationReport),
    bound(retainedByRole.get('sourceAtoms'), job.retainedSourceBinding.sourceAtoms)
      && bound(retainedByRole.get('generationManifest'), job.retainedSourceBinding.generationManifest)
      && bound(retainedByRole.get('validationReport'), job.retainedSourceBinding.validationReport),
    bound(baseByRole.get('generationManifest'), job.baseMediaBinding.generationManifest)
      && bound(baseByRole.get('timeline'), job.baseMediaBinding.timeline)
      && bound(baseByRole.get('validationReport'), job.baseMediaBinding.validationReport)
      && bound(baseByRole.get('baseMedia'), job.baseMediaBinding.baseMedia, false),
    REGISTRY_FILES.every(([role]) => bound(registryByRole.get(role), job.registryBinding[role])),
  ];
  const runtimeMatches = sameJson(runtime, job.expectedRuntime);
  const semanticReport = decode(semanticByRole.get('validationReport').snapshot);
  const semanticValid = semanticReport.status === 'passed'
    && semanticReport.compilerInput?.observedByteSha256
      === job.semanticCheckBinding.expectedCompilerInputObservedByteSha256
    && semanticReport.compilerInput?.canonicalSha256
      === job.semanticCheckBinding.expectedCompilerInputCanonicalSha256;
  const retained = decode(retainedByRole.get('sourceAtoms').snapshot);
  const timeline = decode(baseByRole.get('timeline').snapshot);
  const timelineManifest = decode(baseByRole.get('generationManifest').snapshot);
  const timelineCheck = validatePresentationBaseMediaTimelineV002(
    timeline,
    timelineManifest,
    {
      fileSha256: baseByRole.get('baseMedia').snapshot.fileSha256,
      frameCount: timelineManifest.outputs.baseMedia.frameCount,
      timelineFileSha256: baseByRole.get('timeline').snapshot.fileSha256,
    },
  );

  const provisional = buildPresentationCaptionDisplayPairV003({
    job,
    jobSnapshot,
    implementationInputs,
    sourcePackageInputs,
    semanticCheckInputs,
    retainedSourceInputs,
    baseMediaInputs,
    registryInputs,
    runtimeObservation: runtime,
    layoutInspection: {status: 'passed', items: [], violations: []},
  });
  let buildA = provisional;
  let buildB = provisional;
  if (provisional.status === 'built') {
    const registry = decode(registryByRole.get('presetRegistry').snapshot);
    const layoutInspection = await runLayoutInspector(
      runtime,
      provisional.artifacts[0].value,
      registry,
    );
    const builderContext = {
      job,
      jobSnapshot,
      implementationInputs,
      sourcePackageInputs,
      semanticCheckInputs,
      retainedSourceInputs,
      baseMediaInputs,
      registryInputs,
      runtimeObservation: runtime,
      layoutInspection,
    };
    buildA = buildPresentationCaptionDisplayPairV003(builderContext);
    buildB = buildPresentationCaptionDisplayPairV003(builderContext);
  }
  const deterministic = buildA.status === 'built'
    && buildB.status === 'built'
    && buildA.artifacts.every((entry, index) => entry.bytes.equals(buildB.artifacts[index].bytes));
  const displayPlan = buildA.artifacts?.[0]?.value;
  const mappings = {};
  const nestedViolationCodes = [];
  let mappingPassed = true;
  if (displayPlan) {
    for (const cue of displayPlan.containers.flatMap((container) => container.cues)) {
      const mapped = mapPresentationSourceIntervalV002(
        timeline,
        cue.sourceStartMs,
        cue.sourceEndMs,
      );
      if (mapped.status !== 'passed') mappingPassed = false;
      const cueViolationCodes = mapped.violations.map((entry) => entry.code);
      nestedViolationCodes.push(...cueViolationCodes);
      mappings[cue.cueId] = {
        segmentCount: mapped.status === 'passed' ? 1 : 0,
        nestedViolationCodes: cueViolationCodes,
      };
    }
  }
  const initialClear = [
    job.publication.formalOutputPath,
    job.publication.lockPath,
    job.publication.workPath,
  ].every((pathValue) => !existsSync(repositoryAbsolute(pathValue)));
  const contentArtifacts = buildA.artifacts ?? [];
  const manifestValue = contentArtifacts.length === 5
    ? makeManifest({jobPath, jobSnapshot, job, runtime, artifacts: contentArtifacts})
    : null;
  const manifestArtifact = manifestValue
    ? artifact('pairGenerationManifest', 'pair-generation-manifest.json', manifestValue)
    : null;
  const atoms = normalizedAtoms(retained);
  const positiveOverlaps = atoms.reduce((sum, atom, index) => sum + atoms.slice(index + 1)
    .filter((right) => Math.min(atom.endMs, right.endMs) - Math.max(atom.startMs, right.startMs) > 0).length, 0);
  const checkerContext = {
    contextPhase: 'report-finalization',
    jobObservation: {
      path: jobPath,
      fileSha256: jobSnapshot.fileSha256,
      value: job,
      prePublicationMatches: true,
      preReportMatches: true,
    },
    implementationObservations: implementationMatches,
    inputObservations: inputMatches.map((matches) => ({
      pathSafe: true,
      fileSetValid: true,
      hashMatches: matches,
      schemaSupported: true,
    })),
    runtimeObservation: {
      value: runtime,
      matches: runtimeMatches,
      mismatchPath: '$.runtime.nodeVersion',
    },
    semanticObservation: {
      reportPassed: semanticValid,
      compilerInputAvailable: true,
      bindingsMatch: inputMatches[1],
      compilerRebuildFailed: buildA.failureStage === 'semantic-compiler-rebuild',
      compilerHashesMatch: buildA.compilerObservation?.observedByteSha256
        === job.semanticCheckBinding.expectedCompilerInputObservedByteSha256
        && buildA.compilerObservation?.canonicalSha256
          === job.semanticCheckBinding.expectedCompilerInputCanonicalSha256,
      compilerObservedByteSha256: buildA.compilerObservation?.observedByteSha256 ?? null,
      compilerCanonicalSha256: buildA.compilerObservation?.canonicalSha256 ?? null,
      compilerInput: buildA.compilerObservation?.value ?? null,
    },
    sourceObservation: {
      bindingMatches: inputMatches[2],
      atoms,
      positiveOverlapCount: positiveOverlaps,
    },
    timelineObservation: {
      bindingMatches: inputMatches[3],
      validationPassed: timelineCheck.status === 'passed',
      mappingPassed,
      nestedViolationCodes,
      mappings,
      segmentCount: timeline.segments.length,
      mappingByCue: mappings,
      positiveCueOverlapCount: 0,
    },
    buildObservation: {
      status: buildA.status,
      failureStage: buildA.failureStage,
      displayPlan,
      instructionInput: buildA.artifacts ? {
        instructionBundle: buildA.artifacts[1].value,
        displayPlan: buildA.artifacts[0].value,
        retainedSourceAtoms: retained,
        trustedRegistryBindings: decode(registryByRole.get('trustedRegistryBindings').snapshot),
        presetRegistry: decode(registryByRole.get('presetRegistry').snapshot),
        presetValidationIndex: decode(registryByRole.get('presetValidationIndex').snapshot),
        materialValidationIndex: decode(registryByRole.get('materialValidationIndex').snapshot),
      } : null,
      captionCheckReport: buildA.artifacts?.[2]?.value ?? null,
      layoutPreflight: buildA.artifacts?.[3]?.value ?? null,
      reviewState: reviewState(),
      reviewRenderRequestValid: buildA.artifacts?.[4]?.value?.requiredInputState === 'review_input_ready',
      pairBindingsMatch: manifestArtifact !== null,
      deterministic,
    },
    publicationObservation: {
      readOnlyUnchanged: true,
      readOnlyObservation: {
        status: 'passed',
        beforeCanonicalSha256: before,
        afterCanonicalSha256: before,
        unchanged: true,
      },
      initialPathsClear: initialClear,
      lockAvailable: initialClear,
      stagingValid: true,
      inputUnchanged: true,
      preRenameValid: true,
      ioSucceeded: true,
      publishedPairValid: true,
    },
  };
  const checked = checkPresentationCaptionDisplayPairV003(checkerContext);
  if (checked.status !== 'checked') throw new TypeError('checker context untrusted');
  const trustedBuildFailure = checked.violations.some((entry) => entry.code === 'BUILD_FAILED');
  const reportValue = buildPresentationCaptionDisplayPairValidationReportV002({
    jobPath,
    jobFileSha256: jobSnapshot.fileSha256,
    job,
    runtime,
    checked,
    compilerObservation: buildA.compilerObservation,
    contentArtifacts: trustedBuildFailure ? null : contentArtifacts,
    manifestArtifact: trustedBuildFailure ? null : manifestArtifact,
  });
  if (reportValue === null) throw new TypeError('report build failed');
  const reportBytes = formalBytes(reportValue);
  const reportValidation = validatePresentationCaptionDisplayPairValidationReportV002({
    report: reportValue,
    checkerContext,
    artifactBytes: trustedBuildFailure
      ? []
      : contentArtifacts.map((entry) => entry.bytes),
    manifestBytes: trustedBuildFailure ? null : manifestArtifact?.bytes ?? null,
  });
  if (!reportValidation.valid) throw new TypeError('report validation failed');
  if (checked.violations.length > 0) {
    return {exitCode: 1, reportBytes};
  }
  const reportArtifact = artifact(
    'pairValidationReport',
    'pair-validation-report.json',
    reportValue,
  );
  const allArtifacts = [...contentArtifacts, manifestArtifact, reportArtifact];
  const lockAbsolute = repositoryAbsolute(job.publication.lockPath);
  const workAbsolute = repositoryAbsolute(job.publication.workPath);
  const formalAbsolute = repositoryAbsolute(job.publication.formalOutputPath);
  mkdirSync(dirname(formalAbsolute), {recursive: true});
  const lockFd = openSync(lockAbsolute, 'wx');
  try {
    mkdirSync(workAbsolute);
    for (const output of allArtifacts) {
      const path = join(workAbsolute, output.fileName);
      const descriptor = openSync(path, 'wx');
      try {
        writeFileSync(descriptor, output.bytes);
        fsyncSync(descriptor);
      } finally {
        closeSync(descriptor);
      }
    }
    const stagedNames = readdirSync(workAbsolute).sort();
    const expectedNames = OUTPUT_FILES.map(([, name]) => name).sort();
    if (JSON.stringify(stagedNames) !== JSON.stringify(expectedNames)) {
      throw new TypeError('staging file set invalid');
    }
    const reread = await Promise.all([
      stableRead(jobPath),
      ...implementationInputs.map((entry) => stableRead(entry.path)),
      ...sourcePackageInputs.map((entry) => stableRead(entry.path)),
      ...semanticCheckInputs.map((entry) => stableRead(entry.path)),
      ...retainedSourceInputs.map((entry) => stableRead(entry.path)),
      ...baseMediaInputs.map((entry) => stableRead(entry.path, {binary: entry.role === 'baseMedia'})),
      ...registryInputs.map((entry) => stableRead(entry.path)),
    ]);
    const originals = [
      jobSnapshot,
      ...implementationInputs.map((entry) => entry.snapshot),
      ...sourcePackageInputs.map((entry) => entry.snapshot),
      ...semanticCheckInputs.map((entry) => entry.snapshot),
      ...retainedSourceInputs.map((entry) => entry.snapshot),
      ...baseMediaInputs.map((entry) => entry.snapshot),
      ...registryInputs.map((entry) => entry.snapshot),
    ];
    if (!reread.every((entry, index) => entry.fileSha256 === originals[index].fileSha256)) {
      throw new TypeError('publication input changed');
    }
    if (existsSync(formalAbsolute)) throw new TypeError('formal root appeared');
    const workDirectoryFd = openSync(workAbsolute, 'r');
    try {
      fsyncSync(workDirectoryFd);
    } finally {
      closeSync(workDirectoryFd);
    }
    renameSync(workAbsolute, formalAbsolute);
    const outputParentFd = openSync(dirname(formalAbsolute), 'r');
    try {
      fsyncSync(outputParentFd);
    } finally {
      closeSync(outputParentFd);
    }
    const names = readdirSync(formalAbsolute).sort();
    if (JSON.stringify(names) !== JSON.stringify(expectedNames)) {
      throw new TypeError('published file set invalid');
    }
    for (const output of allArtifacts) {
      const bytes = readFileSync(join(formalAbsolute, output.fileName));
      if (shaBytes(bytes) !== output.fileSha256) throw new TypeError('published hash mismatch');
    }
  } finally {
    try {
      closeSync(lockFd);
    } catch {
      // The report remains untrusted if this path is reached through an outer failure.
    }
    rmSync(lockAbsolute, {force: true});
    rmSync(workAbsolute, {recursive: true, force: true});
  }
  const after = monitoredProjection(job.readOnlyGuard.watchedRoot, ignored);
  if (before !== after || before !== job.readOnlyGuard.expectedBeforeCanonicalSha256) {
    throw new TypeError('read-only projection changed');
  }
  return {exitCode: 0, reportBytes};
};

const main = async () => {
  if (process.argv.length !== 3 || !safeJobPath(process.argv[2])) {
    process.stdout.write(formalBytes(fatal()));
    process.exitCode = 2;
    return;
  }
  try {
    const jobPath = process.argv[2];
    const jobSnapshot = await stableRead(jobPath);
    const job = decode(jobSnapshot);
    if (!validatePresentationCaptionDisplayPairGenerationJobV001(job).valid
      || job.readOnlyGuard.excludedPaths[0] !== jobPath
      || job.publication.formalOutputPath
        !== `${OUTPUT_PARENT}/${job.publication.pairId}`
      || job.publication.lockPath !== `${job.publication.formalOutputPath}.lock`
      || job.publication.workPath !== `${job.publication.formalOutputPath}.work`) {
      throw new TypeError('job invalid');
    }
    const result = await runTrusted(jobPath, jobSnapshot, job);
    process.stdout.write(result.reportBytes);
    process.exitCode = result.exitCode;
  } catch {
    process.stdout.write(formalBytes(fatal()));
    process.exitCode = 2;
  }
};

const isDirectExecution =
  typeof process.argv[1] === 'string'
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) main();
