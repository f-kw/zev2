import {createHash} from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import {dirname, relative, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {
  buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001,
  buildPresentationCaptionSemanticSourcePackageV001,
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  derivePresentationCaptionEmbeddedGateAReportContextV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  buildPresentationSegmenterBoundaryEvidenceV001,
} from './presentation_segmenter_boundary_evidence_v001.mjs';

export const PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_JOB_SCHEMA_V002 =
  'presentation-caption-semantic-source-package-job-v002';
export const PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_MANIFEST_SCHEMA_V002 =
  'presentation-caption-semantic-source-package-manifest-v002';
export const PRESENTATION_CAPTION_SEMANTIC_SOURCE_INPUT_SCHEMA_V002 =
  'presentation-caption-semantic-source-input-v002';
export const PRESENTATION_CAPTION_SEMANTIC_EXPANSION_MAP_SCHEMA_V002 =
  'presentation-caption-semantic-expansion-map-v002';
export const PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_REPORT_SCHEMA_V002 =
  'presentation-caption-semantic-source-package-validation-report-v002';

const RUNNER_ID = PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_JOB_SCHEMA_V002;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/;
const CHARACTER_WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const FORMAT = 'vertical-short-1080x1920';
const SCREEN_LAYOUT = 'speaker_only';
const PRESET = 'vertical-short-speaker-only-readable-pop-v001';
const VISUAL_STATE = 'caption-core-vertical-speaker-only-v001';
const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs/';
const WATCHED_ROOT = 'evals/clip_composition/outputs/presentation';
const FORMAL_OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/';

const FILE_BINDINGS = Object.freeze([
  ['packageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['packageRunner', 'evals/clip_composition/run_presentation_caption_semantic_source_package_job_v002.mjs'],
  ['rendererTrustImplementation', 'evals/clip_composition/presentation_renderer_plan_v002.mjs'],
]);
const DEPENDENCY_BINDINGS = Object.freeze([
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
]);
const WIDTH_BINDINGS = Object.freeze([
  ['presetRegistry', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json'],
  ['presetValidationIndex', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-validation-index.json'],
  ['materialValidationIndex', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/material-validation-index.json'],
  ['registryBinding', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/trusted-registry-bindings.json'],
  ['rendererTrust', 'evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001/trust.json'],
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
]);
const PACKAGE_FILES = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);
const CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'gateAContext',
  'evidenceBuild',
  'evidenceDeterminism',
  'embeddedReportBuild',
  'gateAReport',
  'packageBuild',
  'packageShape',
  'modelInput',
  'expansionMap',
  'sourceOnlyLeakage',
  'determinism',
]);

const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const denseArray = (value) => Array.isArray(value)
  && Object.keys(value).length === value.length
  && Object.keys(value).every((key, index) => key === String(index));
const safePath = (value) => typeof value === 'string'
  && value.length > 0
  && !value.startsWith('/')
  && !value.split('/').some((part) => part === '' || part === '.' || part === '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const clone = (value) => structuredClone(value);
const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return result.bytes;
};
const bindingShape = (value, expected, canonical) => exactKeys(
  value,
  canonical
    ? ['role', 'path', 'fileSha256', 'canonicalSha256']
    : ['role', 'path', 'fileSha256'],
)
  && value.role === expected[0]
  && value.path === expected[1]
  && SHA256.test(value.fileSha256 ?? '')
  && (!canonical || SHA256.test(value.canonicalSha256 ?? ''));
const pathAndHash = (value) => exactKeys(value, ['path', 'fileSha256'])
  && safePath(value.path)
  && SHA256.test(value.fileSha256 ?? '');
const nonNegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const validGateA = (value) => exactKeys(value, [
  'job',
  'completionReport',
  'expectedEvidenceHashes',
])
  && pathAndHash(value.job)
  && pathAndHash(value.completionReport)
  && exactKeys(value.expectedEvidenceHashes, [
    'boundaryCandidatesCanonicalSha256',
    'sourceAtomMembershipCanonicalSha256',
    'evidenceCanonicalSha256',
  ])
  && Object.values(value.expectedEvidenceHashes).every(
    (entry) => SHA256.test(entry ?? ''),
  );
const validExpectedRuntime = (value) => exactKeys(value, [
  'nodeBinarySha256',
  'nodeVersion',
  'icuVersion',
  'resolvedLocale',
  'resolvedGranularity',
])
  && SHA256.test(value.nodeBinarySha256 ?? '')
  && [value.nodeVersion, value.icuVersion].every(
    (entry) => typeof entry === 'string' && entry.length > 0,
  )
  && value.resolvedLocale === 'ja'
  && value.resolvedGranularity === 'word';
const validExpectedProjection = (value) => exactKeys(value, [
  'sourceAtomCount',
  'containerCount',
  'boundaryCandidateCount',
  'containers',
])
  && nonNegativeInteger(value.sourceAtomCount)
  && positiveInteger(value.containerCount)
  && nonNegativeInteger(value.boundaryCandidateCount)
  && denseArray(value.containers)
  && value.containers.length === value.containerCount
  && value.containers.every((entry) => exactKeys(entry, [
    'containerId',
    'sourceAtomCount',
    'boundaryCandidateCount',
  ])
    && typeof entry.containerId === 'string'
    && entry.containerId.length > 0
    && nonNegativeInteger(entry.sourceAtomCount)
    && nonNegativeInteger(entry.boundaryCandidateCount))
  && value.containers.reduce((sum, entry) => sum + entry.sourceAtomCount, 0)
    === value.sourceAtomCount
  && value.containers.reduce(
    (sum, entry) => sum + entry.boundaryCandidateCount,
    0,
  ) === value.boundaryCandidateCount;
const validReadOnlyGuard = (value) => exactKeys(value, [
  'watchedRoot',
  'excludedPaths',
  'expectedBeforeCanonicalSha256',
])
  && value.watchedRoot === WATCHED_ROOT
  && denseArray(value.excludedPaths)
  && value.excludedPaths.length === 1
  && typeof value.excludedPaths[0] === 'string'
  && value.excludedPaths[0].startsWith(JOB_ROOT)
  && value.excludedPaths[0].endsWith('.json')
  && safePath(value.excludedPaths[0])
  && SHA256.test(value.expectedBeforeCanonicalSha256 ?? '');

const validateJob = (value) => {
  const violations = [];
  const add = (path) => violations.push({code: 'CAPTION_B1_JOB_INVALID', path, details: {}});
  if (!exactKeys(value, [
    'schemaVersion',
    'jobId',
    'artifactId',
    'mode',
    'gateA',
    'implementationBinding',
    'widthPolicyBindings',
    'formatSelection',
    'displayConstraintInput',
    'expectedRuntime',
    'expectedProjection',
    'publication',
    'readOnlyGuard',
  ])) {
    add('$');
    return {status: 'rejected', violations};
  }
  if (value.schemaVersion !== PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_JOB_SCHEMA_V002) {
    add('$.schemaVersion');
  }
  if (!ID.test(value.jobId ?? '')) add('$.jobId');
  if (!ID.test(value.artifactId ?? '')) add('$.artifactId');
  if (!['read-only-preflight', 'formal-generation'].includes(value.mode)) add('$.mode');
  if (!validGateA(value.gateA)) {
    add('$.gateA');
  }
  const implementation = value.implementationBinding;
  if (!exactKeys(implementation, ['gitCommit', 'files', 'dependencyFiles'])
    || !COMMIT.test(implementation?.gitCommit ?? '')
    || !denseArray(implementation.files)
    || implementation.files.length !== FILE_BINDINGS.length
    || !implementation.files.every(
      (entry, index) => bindingShape(entry, FILE_BINDINGS[index], false),
    )
    || !denseArray(implementation.dependencyFiles)
    || implementation.dependencyFiles.length !== DEPENDENCY_BINDINGS.length
    || !implementation.dependencyFiles.every(
      (entry, index) => bindingShape(entry, DEPENDENCY_BINDINGS[index], false),
    )) {
    add('$.implementationBinding');
  }
  if (!denseArray(value.widthPolicyBindings)
    || value.widthPolicyBindings.length !== WIDTH_BINDINGS.length
    || !value.widthPolicyBindings.every((entry, index) =>
      exactKeys(entry, ['role', 'path', 'fileSha256', 'canonicalSha256'])
      && entry.role === WIDTH_BINDINGS[index][0]
      && entry.path === WIDTH_BINDINGS[index][1]
      && SHA256.test(entry.fileSha256 ?? '')
      && (index === WIDTH_BINDINGS.length - 1
        ? entry.canonicalSha256 === null
        : SHA256.test(entry.canonicalSha256 ?? '')))) {
    add('$.widthPolicyBindings');
  }
  if (!exactKeys(value.formatSelection, [
    'format',
    'screenLayoutId',
    'presetId',
    'visualStateId',
  ])
    || value.formatSelection.format !== FORMAT
    || value.formatSelection.screenLayoutId !== SCREEN_LAYOUT
    || value.formatSelection.presetId !== PRESET
    || value.formatSelection.visualStateId !== VISUAL_STATE) {
    add('$.formatSelection');
  }
  if (!exactKeys(value.displayConstraintInput, [
    'maxLogicalWidthPerLine',
    'maxLinesPerMeaningGroup',
    'characterWidthRule',
  ])
    || !Number.isSafeInteger(value.displayConstraintInput.maxLogicalWidthPerLine)
    || value.displayConstraintInput.maxLogicalWidthPerLine <= 0
    || !Number.isSafeInteger(value.displayConstraintInput.maxLinesPerMeaningGroup)
    || value.displayConstraintInput.maxLinesPerMeaningGroup !== 2
    || value.displayConstraintInput.characterWidthRule !== CHARACTER_WIDTH_RULE) {
    add('$.displayConstraintInput');
  }
  if (!validExpectedRuntime(value.expectedRuntime)) add('$.expectedRuntime');
  if (!validExpectedProjection(value.expectedProjection)) add('$.expectedProjection');
  if (!exactKeys(value.publication, ['packageId', 'formalOutputPath', 'expectedState'])
    || !ID.test(value.publication.packageId ?? '')
    || !safePath(value.publication.formalOutputPath)
    || !value.publication.formalOutputPath.startsWith(FORMAL_OUTPUT_ROOT)
    || value.publication.expectedState !== 'absent') {
    add('$.publication');
  }
  if (!validReadOnlyGuard(value.readOnlyGuard)) add('$.readOnlyGuard');
  return {
    status: violations.length === 0 ? 'passed' : 'rejected',
    violations,
  };
};

export function validatePresentationCaptionSemanticSourcePackageJobV002(value) {
  try {
    return validateJob(value);
  } catch {
    return {
      status: 'rejected',
      violations: [{code: 'CAPTION_B1_JOB_INVALID', path: '$', details: {}}],
    };
  }
}

export function buildPresentationCaptionSemanticSourcePackageV002(input) {
  if (!exactKeys(input, ['context', 'dependencySnapshots', 'maximumSupportedLogicalWidth'])
    || !Number.isSafeInteger(input.maximumSupportedLogicalWidth)
    || input.maximumSupportedLogicalWidth <= 0) {
    throw new TypeError('invalid v002 package build input');
  }
  const job = input.context?.job?.value;
  const validation = validatePresentationCaptionSemanticSourcePackageJobV002(job);
  if (validation.status !== 'passed') throw new TypeError('invalid v002 package job');
  if (job.displayConstraintInput.maxLogicalWidthPerLine
    > input.maximumSupportedLogicalWidth) {
    throw new RangeError('job width exceeds the selected visual state safety limit');
  }
  const build = buildPresentationCaptionSemanticSourcePackageV001.forDisplayPolicy;
  if (typeof build !== 'function') throw new TypeError('format-neutral package core unavailable');
  return build(input.context, {
    modelInputSchemaVersion: PRESENTATION_CAPTION_SEMANTIC_SOURCE_INPUT_SCHEMA_V002,
    expansionMapSchemaVersion: PRESENTATION_CAPTION_SEMANTIC_EXPANSION_MAP_SCHEMA_V002,
    manifestSchemaVersion: PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_MANIFEST_SCHEMA_V002,
    packageReportSchemaVersion:
      PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_REPORT_SCHEMA_V002,
    presetId: job.formatSelection.presetId,
    visualStateId: job.formatSelection.visualStateId,
    maxLogicalWidthPerLine: job.displayConstraintInput.maxLogicalWidthPerLine,
    maxLinesPerMeaningGroup: job.displayConstraintInput.maxLinesPerMeaningGroup,
    characterWidthRule: job.displayConstraintInput.characterWidthRule,
    includeDisplayPolicyInManifest: true,
    widthPolicyAlreadyValidated: true,
    dependencySnapshots: input.dependencySnapshots,
  });
}

const fatal = () => ({
  schemaVersion: 'presentation-formal-runner-fatal-v001',
  runnerId: RUNNER_ID,
  status: 'fatal',
  diagnosticCode: 'CAPTION_B3_V002_RUNNER_FATAL',
});

const rejectedReport = (
  jobPath,
  jobBytes,
  job,
  violations,
  failureStage = 'jobBinding',
  failedCheck = 'jobBinding',
) => ({
  schemaVersion: PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_REPORT_SCHEMA_V002,
  status: 'rejected',
  failureStage,
  jobBinding: {
    path: jobPath,
    fileSha256: hash(jobBytes),
  },
  package: {
    packageId: job?.publication?.packageId ?? null,
    artifactId: job?.artifactId ?? null,
    formalOutputPath: job?.publication?.formalOutputPath ?? null,
  },
  manifestBinding: null,
  checks: CHECK_NAMES.map((name) => ({
    name,
    status: name === failedCheck
      ? 'failed'
      : CHECK_NAMES.indexOf(name) < CHECK_NAMES.indexOf(failedCheck)
        ? 'passed'
        : 'not_run_with_upstream_failure',
    violationCodes: name === failedCheck
      ? [...new Set(violations.map((entry) => entry.code))]
      : [],
  })),
  violations,
  validatedContentArtifacts: [],
  observedProjection: {
    sourceAtomCount: null,
    containerCount: null,
    boundaryCandidateCount: null,
    containers: [],
    maximumObservedCandidateLogicalWidth: null,
    formatSelection: job?.formatSelection ?? null,
    displayConstraintInput: job?.displayConstraintInput ?? null,
  },
  scope: {
    validatedState: 'source-package-only',
    postPublishValidationRequired: true,
    semanticQualityVerified: false,
    naturalBreakQualityVerified: false,
    nonCooperativePublicationRaceProtected: false,
  },
});

const ensureInsideRoot = (root, repositoryPath) => {
  const absolute = resolve(root, repositoryPath);
  const rel = relative(root, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel === '') {
    throw new TypeError('path outside repository');
  }
  return absolute;
};

class TrustedContractFailure extends Error {
  constructor(check, code, path) {
    super(code);
    this.check = check;
    this.code = code;
    this.path = path;
  }
}

const contractFailure = (check, code, path) => {
  throw new TrustedContractFailure(check, code, path);
};

const statKind = (value) => {
  if (value.isFile()) return 'regular-file';
  if (value.isDirectory()) return 'directory';
  if (value.isSymbolicLink()) return 'symlink';
  return 'other';
};

const statObservation = (value) => ({
  kind: statKind(value),
  dev: value.dev.toString(10),
  ino: value.ino.toString(10),
  size: value.size.toString(10),
  mtimeNs: value.mtimeNs.toString(10),
  nlink: value.nlink.toString(10),
});

const sameStat = (left, right) => Object.keys(left).every(
  (key) => left[key] === right[key],
);

const inspectPathResolution = async (root, repositoryPath) => {
  const rootRealPath = await realpath(root);
  if (rootRealPath !== root) throw new TypeError('repository root is not canonical');
  const parts = repositoryPath.split('/');
  const ancestors = [];
  let cursor = root;
  for (let index = -1; index < parts.length - 1; index += 1) {
    if (index >= 0) cursor = resolve(cursor, parts[index]);
    const observed = await lstat(cursor, {bigint: true});
    ancestors.push({
      workspaceRelativePath: index < 0 ? '' : parts.slice(0, index + 1).join('/'),
      lstatKind: statKind(observed),
      realPath: await realpath(cursor),
    });
  }
  const target = ensureInsideRoot(root, repositoryPath);
  return {
    workspaceRootRealPath: rootRealPath,
    lexicalWorkspaceRelativePath: repositoryPath,
    targetRealPath: await realpath(target),
    ancestors,
  };
};

const readStableSnapshot = async (root, repositoryPath) => {
  if (!safePath(repositoryPath)) throw new TypeError('unsafe snapshot path');
  const absolute = ensureInsideRoot(root, repositoryPath);
  const pathLstatBeforeOpen = statObservation(await lstat(absolute, {bigint: true}));
  const pathResolutionObservation = await inspectPathResolution(root, repositoryPath);
  if (pathLstatBeforeOpen.kind !== 'regular-file'
    || pathLstatBeforeOpen.nlink !== '1'
    || pathResolutionObservation.targetRealPath !== absolute
    || pathResolutionObservation.ancestors.some(
      (entry) => entry.lstatKind !== 'directory',
    )) {
    throw new TypeError('snapshot path is not a stable regular file');
  }
  const handle = await open(absolute, 'r');
  try {
    const fdStatAfterOpen = statObservation(await handle.stat({bigint: true}));
    const bytes = await handle.readFile();
    const fdStatAfterRead = statObservation(await handle.stat({bigint: true}));
    if (!sameStat(pathLstatBeforeOpen, fdStatAfterOpen)
      || !sameStat(fdStatAfterOpen, fdStatAfterRead)
      || BigInt(fdStatAfterRead.size) !== BigInt(bytes.length)) {
      throw new TypeError('file changed during stable read');
    }
    return {
      path: repositoryPath,
      bytes,
      fileSha256: hash(bytes),
      pathLstatBeforeOpen,
      fdStatAfterOpen,
      fdStatAfterRead,
      pathResolutionObservation,
    };
  } finally {
    await handle.close();
  }
};

const observation = (role, snapshot) => ({
  role,
  path: snapshot.path,
  status: 'read',
  snapshot,
});

const decodeSnapshot = (snapshot) => {
  const decoded = decodePresentationCaptionB1StrictJsonV001(snapshot.bytes);
  if (decoded.status !== 'decoded') throw new TypeError('snapshot is not strict JSON');
  return decoded.value;
};

const canonicalBytes = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') {
    throw new TypeError('canonical JSON serialization failed');
  }
  return result.bytes;
};

const canonicalHash = (value) => hash(canonicalBytes(value));

const checkedSnapshot = async (
  root,
  binding,
  check,
  code,
  path,
  {canonical = false} = {},
) => {
  let snapshot;
  try {
    snapshot = await readStableSnapshot(root, binding.path);
  } catch {
    contractFailure(check, code, path);
  }
  if (snapshot.fileSha256 !== binding.fileSha256) {
    contractFailure(check, code, path);
  }
  if (canonical) {
    let actual;
    try {
      actual = canonicalHash(decodeSnapshot(snapshot));
    } catch {
      contractFailure(check, 'INPUT_SCHEMA_UNSUPPORTED', path);
    }
    if (actual !== binding.canonicalSha256) contractFailure(check, code, path);
  }
  return snapshot;
};

const jsonBuildSuccess = (value, embedded = false) => {
  const bytes = embedded
    ? Buffer.concat([canonicalBytes(value), Buffer.from('\n', 'utf8')])
    : formalBytes(value);
  return {
    value,
    bytes,
    fileSha256: hash(bytes),
    canonicalSha256: canonicalHash(value),
    inputByteCopies: [],
  };
};

const makeRuntimeObservation = async (job) => {
  const nodeBytes = await readFile(process.execPath);
  const nodeBinarySha256 = hash(nodeBytes);
  const segmenter = new Intl.Segmenter('ja', {granularity: 'word'}).resolvedOptions();
  const actual = {
    nodeBinarySha256,
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: segmenter.locale,
    resolvedGranularity: segmenter.granularity,
  };
  if (formalBytes(actual).equals(formalBytes(job.expectedRuntime)) === false) {
    contractFailure('runtimeBinding', 'RUNTIME_MISMATCH', '$.expectedRuntime');
  }
  return {
    nodeBinaryInput: {
      role: 'nodeBinary',
      status: 'read',
      snapshot: {bytes: nodeBytes, fileSha256: nodeBinarySha256},
    },
    nodeVersion: actual.nodeVersion,
    icuVersion: actual.icuVersion,
    resolvedLocale: actual.resolvedLocale,
    resolvedGranularity: actual.resolvedGranularity,
    diagnostics: {
      resolvedNodePath: await realpath(process.execPath),
      platform: process.platform,
      arch: process.arch,
      v8Version: process.versions.v8,
      unicodeVersion: process.versions.unicode,
      cldrVersion: process.versions.cldr,
    },
  };
};

const assertEvidenceBinding = (evidence, job) => {
  const expected = job.gateA.expectedEvidenceHashes;
  if (evidence.boundaryCandidatesCanonicalSha256
      !== expected.boundaryCandidatesCanonicalSha256
    || evidence.sourceAtomMembershipCanonicalSha256
      !== expected.sourceAtomMembershipCanonicalSha256
    || canonicalHash(evidence) !== expected.evidenceCanonicalSha256) {
    contractFailure(
      'evidenceDeterminism',
      'EVIDENCE_EXPECTED_HASH_MISMATCH',
      '$.gateA.expectedEvidenceHashes',
    );
  }
};

const resolveMaximumSupportedLogicalWidth = (
  job,
  widthPolicySnapshots,
) => {
  let registry;
  let trust;
  try {
    registry = decodeSnapshot(widthPolicySnapshots[0]);
    trust = decodeSnapshot(widthPolicySnapshots[4]);
  } catch {
    contractFailure(
      'inputBinding',
      'INPUT_SCHEMA_UNSUPPORTED',
      '$.widthPolicyBindings',
    );
  }
  const preset = registry?.presets?.find(
    (entry) => entry?.presetId === job.formatSelection.presetId,
  );
  const state = preset?.visualStates?.find(
    (entry) => entry?.stateId === job.formatSelection.visualStateId,
  );
  const maximum = state?.layout?.maxSupportedLogicalWidthPerLine;
  if (!Number.isSafeInteger(maximum)
    || maximum <= 0
    || state.layout.maxLines !== job.displayConstraintInput.maxLinesPerMeaningGroup
    || trust?.layoutRules?.maxSupportedLogicalWidthPerLine !== maximum
    || trust.layoutRules.maxLines !== state.layout.maxLines
    || trust.layoutRules.characterWidthRule
      !== job.displayConstraintInput.characterWidthRule) {
    contractFailure(
      'inputBinding',
      'INPUT_HASH_MISMATCH',
      '$.widthPolicyBindings',
    );
  }
  return maximum;
};

const ensureGateAFormalPathAbsent = async (gateAJob, root) => {
  const formalOutputPath = gateAJob?.readOnlyGuard?.formalOutputPath;
  if (!safePath(formalOutputPath)) {
    contractFailure('gateAContext', 'GATE_A_CONTEXT_INVALID', '$.gateA.job');
  }
  try {
    await lstat(ensureInsideRoot(root, formalOutputPath));
    contractFailure('gateAContext', 'GATE_A_CONTEXT_INVALID', '$.gateA.job');
  } catch (error) {
    if (error instanceof TrustedContractFailure) throw error;
    if (error?.code !== 'ENOENT') throw error;
  }
  return {
    formalOutputPath,
    watchedAncestorPath: dirname(formalOutputPath),
    beforeFormalPathState: 'absent',
    afterFormalPathState: 'absent',
    beforeEntries: [],
    afterEntries: [],
  };
};

const buildProductionPackage = async ({
  job,
  jobSnapshot,
  root,
}) => {
  const gateAJobSnapshot = await checkedSnapshot(
    root,
    job.gateA.job,
    'inputBinding',
    'INPUT_HASH_MISMATCH',
    '$.gateA.job',
  );
  const gateACompletionReportSnapshot = await checkedSnapshot(
    root,
    job.gateA.completionReport,
    'inputBinding',
    'INPUT_HASH_MISMATCH',
    '$.gateA.completionReport',
  );
  const gateAJob = decodeSnapshot(gateAJobSnapshot);
  const gateAImplementationBindings = gateAJob?.implementationBinding?.files;
  const gateASourceBindings = gateAJob?.inputs;
  if (!Array.isArray(gateAImplementationBindings)
    || gateAImplementationBindings.length !== 3
    || !Array.isArray(gateASourceBindings)
    || gateASourceBindings.length !== 3) {
    contractFailure('gateAContext', 'GATE_A_CONTEXT_INVALID', '$.gateA.job');
  }

  const implementationSnapshots = [];
  for (let index = 0; index < job.implementationBinding.files.length; index += 1) {
    implementationSnapshots.push(await checkedSnapshot(
      root,
      job.implementationBinding.files[index],
      'implementationBinding',
      'IMPLEMENTATION_MISMATCH',
      `$.implementationBinding.files[${index}]`,
    ));
  }
  const dependencySnapshots = [];
  for (let index = 0; index < job.implementationBinding.dependencyFiles.length; index += 1) {
    dependencySnapshots.push(await checkedSnapshot(
      root,
      job.implementationBinding.dependencyFiles[index],
      'implementationBinding',
      'IMPLEMENTATION_MISMATCH',
      `$.implementationBinding.dependencyFiles[${index}]`,
    ));
  }
  for (let index = 0; index < gateAImplementationBindings.length; index += 1) {
    const snapshot = await checkedSnapshot(
      root,
      gateAImplementationBindings[index],
      'gateAContext',
      'GATE_A_CONTEXT_INVALID',
      `$.gateA.job.implementationBinding.files[${index}]`,
    );
    if (snapshot.path !== dependencySnapshots[index + 1].path
      || snapshot.fileSha256 !== dependencySnapshots[index + 1].fileSha256) {
      contractFailure(
        'gateAContext',
        'GATE_A_CONTEXT_INVALID',
        `$.implementationBinding.dependencyFiles[${index + 1}]`,
      );
    }
  }

  const sourceSnapshots = [];
  for (let index = 0; index < gateASourceBindings.length; index += 1) {
    sourceSnapshots.push(await checkedSnapshot(
      root,
      gateASourceBindings[index],
      'inputBinding',
      'INPUT_HASH_MISMATCH',
      `$.gateA.job.inputs[${index}]`,
    ));
  }
  const widthPolicySnapshots = [];
  for (let index = 0; index < job.widthPolicyBindings.length; index += 1) {
    widthPolicySnapshots.push(await checkedSnapshot(
      root,
      job.widthPolicyBindings[index],
      'inputBinding',
      'INPUT_HASH_MISMATCH',
      `$.widthPolicyBindings[${index}]`,
      {canonical: index < job.widthPolicyBindings.length - 1},
    ));
  }
  const maximumSupportedLogicalWidth = resolveMaximumSupportedLogicalWidth(
    job,
    widthPolicySnapshots,
  );
  if (job.displayConstraintInput.maxLogicalWidthPerLine
    > maximumSupportedLogicalWidth) {
    contractFailure(
      'modelInput',
      'MODEL_INPUT_PROJECTION_MISMATCH',
      '$.displayConstraintInput.maxLogicalWidthPerLine',
    );
  }

  const runtimeObservation = await makeRuntimeObservation(job);
  const sourceArtifact = decodeSnapshot(sourceSnapshots[0]);
  const runtimeBinding = {
    nodeBinarySha256:
      runtimeObservation.nodeBinaryInput.snapshot.fileSha256,
    nodeVersion: runtimeObservation.nodeVersion,
    icuVersion: runtimeObservation.icuVersion,
    resolvedLocale: runtimeObservation.resolvedLocale,
    resolvedGranularity: runtimeObservation.resolvedGranularity,
    diagnostics: clone(runtimeObservation.diagnostics),
  };
  const evidenceInput = {
    artifactId: gateAJob.artifactId,
    sourceArtifact,
    sourceArtifactSnapshot: {
      path: sourceSnapshots[0].path,
      fileSha256: sourceSnapshots[0].fileSha256,
    },
    runtimeBinding,
  };
  const evidencePasses = [
    buildPresentationSegmenterBoundaryEvidenceV001(clone(evidenceInput)),
    buildPresentationSegmenterBoundaryEvidenceV001(clone(evidenceInput)),
  ];
  if (!formalBytes(evidencePasses[0]).equals(formalBytes(evidencePasses[1]))) {
    contractFailure(
      'evidenceDeterminism',
      'EVIDENCE_NONDETERMINISTIC',
      '$.gateA',
    );
  }
  assertEvidenceBinding(evidencePasses[0], job);

  const gateAImplementationInputs = gateAImplementationBindings.map(
    (binding, index) => observation(binding.role, dependencySnapshots[index + 1]),
  );
  const gateASourceInputs = gateASourceBindings.map(
    (binding, index) => observation(binding.role, sourceSnapshots[index]),
  );
  const legacyReadOnlyObservation = await ensureGateAFormalPathAbsent(gateAJob, root);
  const derived = derivePresentationCaptionEmbeddedGateAReportContextV001({
    gateA: {
      jobValue: gateAJob,
      jobInput: observation('gateAJob', gateAJobSnapshot),
      implementationInputs: gateAImplementationInputs,
      sourceInputs: gateASourceInputs,
      legacyRecheck: {
        jobInput: observation('gateAJob', gateAJobSnapshot),
        implementationInputs: gateAImplementationBindings.map(
          (binding, index) =>
            observation(binding.role, dependencySnapshots[index + 1]),
        ),
        sourceInputs: gateASourceBindings.map(
          (binding, index) => observation(binding.role, sourceSnapshots[index]),
        ),
      },
      legacyReadOnlyObservation,
      evidencePasses: evidencePasses.map((value) => jsonBuildSuccess(value)),
    },
    runtimeObservation,
  });
  if (derived.status !== 'derived') {
    contractFailure('gateAContext', 'GATE_A_CONTEXT_INVALID', '$.gateA');
  }
  const embeddedReport =
    buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001(derived.value);
  if (embeddedReport.status !== 'passed') {
    contractFailure('gateAReport', 'GATE_A_NOT_PASSED', '$.gateA');
  }
  const embeddedArtifact = jsonBuildSuccess(embeddedReport, true);
  const context = {
    job: {value: job, snapshot: jobSnapshot},
    gateA: {
      jobValue: gateAJob,
      jobSnapshot: gateAJobSnapshot,
      completionReportSnapshot: gateACompletionReportSnapshot,
      evidenceValue: evidencePasses[0],
      evidenceBytes: formalBytes(evidencePasses[0]),
      embeddedReportValue: embeddedReport,
      embeddedReportBytes: embeddedArtifact.bytes,
    },
    implementationSnapshots,
    sourceSnapshots,
    widthPolicySnapshots,
    runtimeObservation,
  };
  return buildPresentationCaptionSemanticSourcePackageV002({
    context,
    dependencySnapshots,
    maximumSupportedLogicalWidth,
  });
};

const publishPackage = async (job, artifacts, root) => {
  if (job.mode !== 'formal-generation') return;
  const output = ensureInsideRoot(root, job.publication.formalOutputPath);
  const work = `${output}.work`;
  try {
    await stat(output);
    throw new Error('formal output already exists');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await mkdir(dirname(output), {recursive: true});
  await mkdir(work, {recursive: false});
  try {
    for (const [index, artifact] of artifacts.entries()) {
      if (artifact.fileName !== PACKAGE_FILES[index]) {
        throw new TypeError('package artifact order mismatch');
      }
      const handle = await open(resolve(work, artifact.fileName), 'wx');
      try {
        await handle.writeFile(artifact.bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
    }
    await rename(work, output);
  } catch (error) {
    await rm(work, {recursive: true, force: true});
    throw error;
  }
};

export async function runPresentationCaptionSemanticSourcePackageJobV002(
  jobPath,
  options = {},
) {
  let trustedJobBytes = null;
  let trustedJob = null;
  try {
    if (typeof jobPath !== 'string' || !jobPath.startsWith(JOB_ROOT)
      || !jobPath.endsWith('.json') || !safePath(jobPath)) {
      return {exitCode: 2, value: fatal()};
    }
    const root = options.repositoryRoot ?? ROOT;
    let jobSnapshot = null;
    const bytes = options.jobBytes ?? (
      jobSnapshot = await readStableSnapshot(root, jobPath)
    ).bytes;
    trustedJobBytes = bytes;
    const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
    if (decoded.status !== 'decoded') return {exitCode: 2, value: fatal()};
    const job = decoded.value;
    trustedJob = job;
    const validation = validatePresentationCaptionSemanticSourcePackageJobV002(job);
    if (validation.status === 'passed'
      && job.readOnlyGuard.excludedPaths[0] !== jobPath) {
      validation.status = 'rejected';
      validation.violations.push({
        code: 'CAPTION_B1_JOB_INVALID',
        path: '$.readOnlyGuard.excludedPaths[0]',
        details: {},
      });
    }
    if (validation.status !== 'passed') {
      return {
        exitCode: 1,
        value: rejectedReport(jobPath, bytes, job, validation.violations),
      };
    }
    const build = typeof options.build === 'function'
      ? () => options.build(clone(job), Buffer.from(bytes))
      : () => buildProductionPackage({
        job: clone(job),
        jobSnapshot,
        root,
      });
    if (typeof options.build !== 'function' && jobSnapshot === null) {
      return {exitCode: 2, value: fatal()};
    }
    const first = await build();
    const second = await build();
    if (!isObject(first)
      || !isObject(second)
      || !Array.isArray(first.artifacts)
      || !Array.isArray(second.artifacts)
      || first.artifacts.length !== PACKAGE_FILES.length
      || second.artifacts.length !== PACKAGE_FILES.length
      || !first.artifacts.every(
        (entry, index) => entry.bytes.equals(second.artifacts[index].bytes),
      )) {
      contractFailure('determinism', 'NONDETERMINISTIC', '$');
    }
    const report = first.artifacts[6]?.value;
    if (report?.schemaVersion
        !== PRESENTATION_CAPTION_SEMANTIC_SOURCE_PACKAGE_REPORT_SCHEMA_V002
      || report.status !== 'passed') {
      return {exitCode: 2, value: fatal()};
    }
    if (jobSnapshot !== null) {
      const prePublicationJobSnapshot = await readStableSnapshot(root, jobPath);
      if (prePublicationJobSnapshot.fileSha256 !== jobSnapshot.fileSha256
        || !sameStat(
          prePublicationJobSnapshot.pathLstatBeforeOpen,
          jobSnapshot.pathLstatBeforeOpen,
        )) {
        contractFailure('jobBinding', 'JOB_FILE_MISMATCH', '$');
      }
    }
    if (options.publish !== false) await publishPackage(job, first.artifacts, root);
    return {exitCode: 0, value: report};
  } catch (error) {
    if (error instanceof TrustedContractFailure
      && trustedJobBytes !== null
      && trustedJob !== null) {
      const violation = {
        code: error.code,
        path: error.path,
        details: {},
      };
      return {
        exitCode: 1,
        value: rejectedReport(
          jobPath,
          trustedJobBytes,
          trustedJob,
          [violation],
          error.check,
          error.check,
        ),
      };
    }
    return {exitCode: 2, value: fatal()};
  }
}

export async function runPresentationCaptionSemanticSourcePackageCliV002(
  argv = process.argv.slice(2),
  streams = {stdout: process.stdout},
) {
  const result = argv.length === 1
    ? await runPresentationCaptionSemanticSourcePackageJobV002(argv[0])
    : {exitCode: 2, value: fatal()};
  streams.stdout.write(formalBytes(result.value));
  return result.exitCode;
}

const direct = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const exitCode = await runPresentationCaptionSemanticSourcePackageCliV002();
  process.exitCode = exitCode;
}
