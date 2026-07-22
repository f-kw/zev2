import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {open, lstat, realpath, readdir} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES,
  PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001,
  PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES,
  buildPresentationSegmenterBoundaryEvidenceV001,
  checkPresentationSegmenterBoundaryPreflightV001,
} from './presentation_segmenter_boundary_evidence_v001.mjs';

const RUNNER_MODULE_URL = import.meta.url;
const RUNNER_FILE_PATH = fileURLToPath(RUNNER_MODULE_URL);
const WORKSPACE_ROOT = resolve(dirname(RUNNER_FILE_PATH), '..', '..');

const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs';
const INPUT_ROOT =
  'evals/clip_composition/outputs/presentation/retained-source-atoms';
const FORMAL_OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence';

const IMPLEMENTATION_SPECS = Object.freeze([
  Object.freeze({
    role: 'core',
    path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
  }),
  Object.freeze({
    role: 'retainedSourceAtomsCore',
    path: 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs',
  }),
  Object.freeze({
    role: 'runner',
    path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
  }),
]);

const INPUT_SPECS = Object.freeze([
  Object.freeze({role: 'sourceAtoms', basename: 'source-atoms.json'}),
  Object.freeze({role: 'sourceGenerationManifest', basename: 'generation-manifest.json'}),
  Object.freeze({role: 'sourceValidationReport', basename: 'validation-report.json'}),
]);

const IMPLEMENTATION_ISSUE_ORDER = Object.freeze([
  'path_unsafe',
  'first_read_failed',
  'second_read_failed',
  'hash_changed',
  'module_url_unavailable',
  'module_path_mismatch',
]);
const INPUT_ISSUE_ORDER = Object.freeze([
  'path_unsafe',
  'first_read_failed',
  'json_parse_failed',
  'second_read_failed',
  'hash_changed',
]);
const JOB_ISSUE_ORDER = Object.freeze(['second_read_failed', 'hash_changed']);

const REPORT_SCHEMA_VERSION = 'presentation-segmenter-boundary-preflight-report-v001';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ARTIFACT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const CHECK_BY_CODE = Object.freeze({
  SEGMENTER_BOUNDARY_JOB_INVALID: 'jobBinding',
  SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH: 'jobBinding',
  SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH: 'implementationBinding',
  SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE: 'inputBinding',
  SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH: 'inputBinding',
  SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED: 'inputBinding',
  SEGMENTER_BOUNDARY_SOURCE_VALIDATION_NOT_PASSED: 'inputBinding',
  SEGMENTER_BOUNDARY_SOURCE_BINDING_MISMATCH: 'inputBinding',
  SEGMENTER_BOUNDARY_RUNTIME_MISMATCH: 'runtimeBinding',
  SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID: 'sourceContract',
  SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE: 'sourceContract',
  SEGMENTER_BOUNDARY_SOURCE_ATOM_TIME_REVERSED: 'sourceContract',
  SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID: 'sourceContract',
  SEGMENTER_BOUNDARY_SPEECH_MEMBERSHIP_INVALID: 'sourceContract',
  SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID: 'segmentation',
  SEGMENTER_BOUNDARY_EVIDENCE_BINDING_MISMATCH: 'segmentation',
  SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID: 'segmentation',
  SEGMENTER_BOUNDARY_SPLITS_SOURCE_ATOM: 'segmentation',
  SEGMENTER_BOUNDARY_CANDIDATE_EMPTY: 'segmentation',
  SEGMENTER_BOUNDARY_CONTAINER_ID_INVALID: 'segmentation',
  SEGMENTER_BOUNDARY_CANDIDATE_ID_INVALID: 'segmentation',
  SEGMENTER_BOUNDARY_CANDIDATE_ID_DUPLICATE: 'segmentation',
  SEGMENTER_BOUNDARY_CANDIDATE_NONCONTIGUOUS: 'segmentation',
  SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SEGMENT: 'segmentation',
  SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SPEECH: 'segmentation',
  SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH: 'segmentation',
  SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH: 'segmentation',
  SEGMENTER_BOUNDARY_SOURCE_ATOM_MISSING: 'coverage',
  SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATED: 'coverage',
  SEGMENTER_BOUNDARY_SOURCE_ATOM_ORDER_REVERSED: 'coverage',
  SEGMENTER_BOUNDARY_EXPECTED_PROJECTION_MISMATCH: 'expectedProjection',
  SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH: 'segmentation',
  SEGMENTER_BOUNDARY_NONDETERMINISTIC: 'determinism',
  SEGMENTER_BOUNDARY_READ_ONLY_CONTRACT_VIOLATED: 'readOnlyPreflight',
  SEGMENTER_BOUNDARY_BUILD_FAILED: 'segmentation',
});

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const exactFields = (value, fields) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};

const canonicalJsonV001 = (value) => JSON.stringify(canonicalize(value));
const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sha256Canonical = (value) => sha256Bytes(Buffer.from(canonicalJsonV001(value), 'utf8'));

const compareUtf16 = (left, right) => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const sortIssues = (issues, order) => [...new Set(issues)]
  .sort((left, right) => order.indexOf(left) - order.indexOf(right));

const diagnosticResult = (diagnostic) => ({
  exitCode: 2,
  stdout: '',
  stderr: `${diagnostic}\n`,
});

export const createPresentationSegmenterBoundaryProductionFilesystemAdapterV001 = () =>
  Object.freeze({
    openReadOnly: (pathValue) => open(
      pathValue,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    ),
    lstat: (pathValue) => lstat(pathValue, {bigint: true}),
    realpath: (pathValue) => realpath(pathValue),
    readdir: (pathValue) => readdir(pathValue, {withFileTypes: true}),
  });

const statsFingerprint = (stats) => ({
  dev: stats.dev.toString(),
  ino: stats.ino.toString(),
  size: stats.size.toString(),
  mtimeNs: stats.mtimeNs.toString(),
});

const sameFingerprint = (left, right) =>
  left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs;

const readHandleStable = async (absolutePath, filesystemAdapter) => {
  let handle;
  try {
    handle = await filesystemAdapter.openReadOnly(absolutePath);
    const beforeStats = await handle.stat({bigint: true});
    if (!beforeStats.isFile()) throw new TypeError('regular file required');
    const before = statsFingerprint(beforeStats);
    const bytes = await handle.readFile();
    const afterStats = await handle.stat({bigint: true});
    if (!afterStats.isFile()) throw new TypeError('regular file required');
    const after = statsFingerprint(afterStats);
    if (!sameFingerprint(before, after)) throw new TypeError('file changed while reading');
    return {bytes, fileSha256: sha256Bytes(bytes)};
  } finally {
    if (handle) await handle.close();
  }
};

const relativePathParts = (pathValue) => {
  if (!isNonEmptyString(pathValue)
    || pathValue.includes('\0')
    || pathValue.includes('\\')
    || isAbsolute(pathValue)) return null;
  const parts = pathValue.split('/');
  if (parts.some((part) => part.length === 0 || part === '.' || part === '..')) return null;
  return parts;
};

const toWorkspaceRelative = (absolutePath) => {
  const value = relative(WORKSPACE_ROOT, absolutePath);
  if (!value || value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value)) return null;
  return value.split(sep).join('/');
};

const inspectWorkspacePath = async (
  repositoryPath,
  filesystemAdapter,
  {requireRegularFile = true} = {},
) => {
  const parts = relativePathParts(repositoryPath);
  if (!parts) return {ok: false};
  const absolutePath = resolve(WORKSPACE_ROOT, ...parts);
  if (toWorkspaceRelative(absolutePath) !== repositoryPath) return {ok: false};

  try {
    const rootRealPath = await filesystemAdapter.realpath(WORKSPACE_ROOT);
    if (rootRealPath !== WORKSPACE_ROOT) return {ok: false};
    const rootStats = await filesystemAdapter.lstat(WORKSPACE_ROOT);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) return {ok: false};

    let current = WORKSPACE_ROOT;
    for (let index = 0; index < parts.length; index += 1) {
      current = resolve(current, parts[index]);
      const stats = await filesystemAdapter.lstat(current);
      if (stats.isSymbolicLink()) return {ok: false};
      const isLast = index === parts.length - 1;
      if (!isLast && !stats.isDirectory()) return {ok: false};
      if (isLast && requireRegularFile && !stats.isFile()) return {ok: false};
    }

    const finalRealPath = await filesystemAdapter.realpath(absolutePath);
    if (finalRealPath !== absolutePath) return {ok: false};
    return {ok: true, absolutePath};
  } catch {
    return {ok: false};
  }
};

const readSafeWorkspaceFile = async (repositoryPath, filesystemAdapter) => {
  const inspection = await inspectWorkspacePath(repositoryPath, filesystemAdapter);
  if (!inspection.ok) throw new TypeError('unsafe workspace file');
  return readHandleStable(inspection.absolutePath, filesystemAdapter);
};

const isJobPath = (pathValue) => {
  const parts = relativePathParts(pathValue);
  const rootParts = JOB_ROOT.split('/');
  return Boolean(parts)
    && parts.length > rootParts.length
    && rootParts.every((part, index) => parts[index] === part)
    && basename(pathValue).endsWith('.json');
};

const readInitialJob = async (jobPath, filesystemAdapter) => {
  if (!isJobPath(jobPath)) return null;
  try {
    const first = await readSafeWorkspaceFile(jobPath, filesystemAdapter);
    let value;
    try {
      value = JSON.parse(first.bytes.toString('utf8'));
    } catch {
      return null;
    }
    return {
      value,
      snapshot: {
        path: jobPath,
        firstFileSha256: first.fileSha256,
        secondFileSha256: null,
        issues: [],
      },
    };
  } catch {
    return null;
  }
};

const refreshJobSnapshot = async (snapshot, filesystemAdapter) => {
  try {
    const second = await readSafeWorkspaceFile(snapshot.path, filesystemAdapter);
    snapshot.secondFileSha256 = second.fileSha256;
    if (second.fileSha256 !== snapshot.firstFileSha256) snapshot.issues = ['hash_changed'];
  } catch {
    snapshot.secondFileSha256 = null;
    snapshot.issues = ['second_read_failed'];
  }
  snapshot.issues = sortIssues(snapshot.issues, JOB_ISSUE_ORDER);
};

const loadedModuleUrls = () => Object.freeze({
  core: PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001?.core ?? null,
  retainedSourceAtomsCore:
    PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001?.retainedSourceAtomsCore ?? null,
  runner: RUNNER_MODULE_URL,
});

const repositoryPathFromModuleUrl = (moduleUrl) => {
  try {
    if (!isNonEmptyString(moduleUrl) || !moduleUrl.startsWith('file:')) return null;
    return toWorkspaceRelative(fileURLToPath(moduleUrl));
  } catch {
    return null;
  }
};

const loadImplementationSnapshots = async (filesystemAdapter) => {
  const urls = loadedModuleUrls();
  const files = [];
  for (const spec of IMPLEMENTATION_SPECS) {
    const moduleUrl = urls[spec.role];
    const modulePath = repositoryPathFromModuleUrl(moduleUrl);
    const issues = [];
    if (modulePath === null) issues.push('module_url_unavailable');
    else if (modulePath !== spec.path) issues.push('module_path_mismatch');

    const inspection = await inspectWorkspacePath(spec.path, filesystemAdapter);
    let firstFileSha256 = null;
    if (!inspection.ok) {
      issues.push('path_unsafe');
    } else {
      try {
        firstFileSha256 = (await readHandleStable(
          inspection.absolutePath,
          filesystemAdapter,
        )).fileSha256;
      } catch {
        issues.push('first_read_failed');
      }
    }

    files.push({
      role: spec.role,
      path: spec.path,
      firstFileSha256,
      secondFileSha256: null,
      loadedModuleUrl: moduleUrl,
      issues: sortIssues(issues, IMPLEMENTATION_ISSUE_ORDER),
    });
  }
  return {files};
};

const refreshImplementationSnapshots = async (binding, filesystemAdapter) => {
  for (const record of binding.files) {
    const moduleIssues = record.issues.filter((issue) => issue.startsWith('module_'));
    if (record.issues.includes('path_unsafe')) {
      record.firstFileSha256 = null;
      record.secondFileSha256 = null;
      record.issues = sortIssues(['path_unsafe', ...moduleIssues], IMPLEMENTATION_ISSUE_ORDER);
      continue;
    }
    const inspection = await inspectWorkspacePath(record.path, filesystemAdapter);
    if (!inspection.ok) {
      record.firstFileSha256 = null;
      record.secondFileSha256 = null;
      record.issues = sortIssues(['path_unsafe', ...moduleIssues], IMPLEMENTATION_ISSUE_ORDER);
      continue;
    }
    if (record.issues.includes('first_read_failed')) {
      record.secondFileSha256 = null;
      record.issues = sortIssues(
        ['first_read_failed', ...moduleIssues],
        IMPLEMENTATION_ISSUE_ORDER,
      );
      continue;
    }
    try {
      const second = await readHandleStable(inspection.absolutePath, filesystemAdapter);
      record.secondFileSha256 = second.fileSha256;
      const pathIssues = second.fileSha256 === record.firstFileSha256 ? [] : ['hash_changed'];
      record.issues = sortIssues([...pathIssues, ...moduleIssues], IMPLEMENTATION_ISSUE_ORDER);
    } catch {
      record.secondFileSha256 = null;
      record.issues = sortIssues(
        ['second_read_failed', ...moduleIssues],
        IMPLEMENTATION_ISSUE_ORDER,
      );
    }
  }
};

const inputRecordFromJob = (jobValue, index) => {
  const record = Array.isArray(jobValue?.inputs) ? jobValue.inputs[index] : null;
  return {
    role: INPUT_SPECS[index].role,
    path: isObject(record) && hasOwn(record, 'path') ? record.path : null,
  };
};

const inputPathIsLexicallyAllowed = (pathValue, spec) => {
  const parts = relativePathParts(pathValue);
  const rootParts = INPUT_ROOT.split('/');
  return Boolean(parts)
    && parts.length === rootParts.length + 2
    && rootParts.every((part, index) => parts[index] === part)
    && parts.at(-1) === spec.basename;
};

const loadInputSnapshots = async (jobValue, filesystemAdapter) => {
  const records = INPUT_SPECS.map((spec, index) => inputRecordFromJob(jobValue, index));
  const lexicalParents = records.map((record, index) => (
    inputPathIsLexicallyAllowed(record.path, INPUT_SPECS[index])
      ? dirname(record.path)
      : null
  ));
  const nonNullParents = lexicalParents.filter((value) => value !== null);
  const oneParent = nonNullParents.length === INPUT_SPECS.length
    && new Set(nonNullParents).size === 1;

  const snapshots = [];
  for (let index = 0; index < INPUT_SPECS.length; index += 1) {
    const record = records[index];
    const issues = [];
    let firstFileSha256 = null;
    let document = null;
    if (lexicalParents[index] === null || !oneParent) {
      issues.push('path_unsafe');
    } else {
      const inspection = await inspectWorkspacePath(record.path, filesystemAdapter);
      if (!inspection.ok) {
        issues.push('path_unsafe');
      } else {
        try {
          const first = await readHandleStable(inspection.absolutePath, filesystemAdapter);
          firstFileSha256 = first.fileSha256;
          try {
            document = JSON.parse(first.bytes.toString('utf8'));
          } catch {
            issues.push('json_parse_failed');
          }
        } catch {
          issues.push('first_read_failed');
        }
      }
    }
    snapshots.push({
      role: INPUT_SPECS[index].role,
      path: record.path,
      firstFileSha256,
      secondFileSha256: null,
      document,
      issues: sortIssues(issues, INPUT_ISSUE_ORDER),
    });
  }
  return snapshots;
};

const refreshInputSnapshots = async (snapshots, filesystemAdapter) => {
  for (const record of snapshots) {
    if (!isNonEmptyString(record.path)) continue;
    if (record.issues.includes('path_unsafe')) {
      record.firstFileSha256 = null;
      record.secondFileSha256 = null;
      record.document = null;
      record.issues = ['path_unsafe'];
      continue;
    }
    const inspection = await inspectWorkspacePath(record.path, filesystemAdapter);
    if (!inspection.ok) {
      record.firstFileSha256 = null;
      record.secondFileSha256 = null;
      record.document = null;
      record.issues = ['path_unsafe'];
      continue;
    }
    if (record.issues.includes('first_read_failed')) continue;
    try {
      const second = await readHandleStable(inspection.absolutePath, filesystemAdapter);
      record.secondFileSha256 = second.fileSha256;
      const issues = record.issues.filter((issue) => issue === 'json_parse_failed');
      if (second.fileSha256 !== record.firstFileSha256) issues.push('hash_changed');
      record.issues = sortIssues(issues, INPUT_ISSUE_ORDER);
    } catch {
      record.secondFileSha256 = null;
      const issues = record.issues.filter((issue) => issue === 'json_parse_failed');
      issues.push('second_read_failed');
      record.issues = sortIssues(issues, INPUT_ISSUE_ORDER);
    }
  }
};

const direntType = (entry) => {
  if (entry.isFile()) return 'regular-file';
  if (entry.isDirectory()) return 'directory';
  if (entry.isSymbolicLink()) return 'symbolic-link';
  return 'other';
};

const snapshotDirectory = async (absolutePath, filesystemAdapter) => {
  const entries = (await filesystemAdapter.readdir(absolutePath))
    .map((entry) => ({name: entry.name, type: direntType(entry)}))
    .sort((left, right) => compareUtf16(left.name, right.name));
  return {
    entryCount: entries.length,
    entriesCanonicalSha256: sha256Canonical(entries),
  };
};

const inspectFormalPathState = async (absolutePath, filesystemAdapter) => {
  try {
    await filesystemAdapter.lstat(absolutePath);
    return 'present';
  } catch (error) {
    if (error?.code === 'ENOENT') return 'absent';
    return 'inspection_failed';
  }
};

const initialiseReadOnlyGuard = async (jobValue, filesystemAdapter) => {
  const artifactId = jobValue?.artifactId;
  const guard = jobValue?.readOnlyGuard;
  if (!isNonEmptyString(artifactId)
    || !ARTIFACT_ID_PATTERN.test(artifactId)
    || artifactId === '.'
    || artifactId === '..'
    || !exactFields(guard, ['formalOutputPath', 'expectedState'])
    || guard.expectedState !== 'absent') return null;

  const expectedPath = `${FORMAL_OUTPUT_ROOT}/${artifactId}`;
  if (guard.formalOutputPath !== expectedPath || !relativePathParts(expectedPath)) return null;

  const parts = expectedPath.split('/');
  let current = WORKSPACE_ROOT;
  let watchedAncestor = WORKSPACE_ROOT;
  try {
    const rootRealPath = await filesystemAdapter.realpath(WORKSPACE_ROOT);
    const rootStats = await filesystemAdapter.lstat(WORKSPACE_ROOT);
    if (rootRealPath !== WORKSPACE_ROOT
      || rootStats.isSymbolicLink()
      || !rootStats.isDirectory()) return null;

    for (let index = 0; index < parts.length - 1; index += 1) {
      current = resolve(current, parts[index]);
      try {
        const stats = await filesystemAdapter.lstat(current);
        if (stats.isSymbolicLink() || !stats.isDirectory()) return null;
        if (await filesystemAdapter.realpath(current) !== current) return null;
        watchedAncestor = current;
      } catch (error) {
        if (error?.code !== 'ENOENT') return null;
        break;
      }
    }

    const formalAbsolutePath = resolve(WORKSPACE_ROOT, ...parts);
    const formalPathState = await inspectFormalPathState(formalAbsolutePath, filesystemAdapter);
    const directory = await snapshotDirectory(watchedAncestor, filesystemAdapter);
    return {
      formalOutputPath: expectedPath,
      formalAbsolutePath,
      watchedAncestorPath: toWorkspaceRelative(watchedAncestor),
      watchedAncestorAbsolutePath: watchedAncestor,
      before: {formalPathState, ...directory},
    };
  } catch {
    return null;
  }
};

const finishReadOnlyGuard = async (state, filesystemAdapter) => {
  if (!state) return null;
  let after;
  try {
    const watchedStats = await filesystemAdapter.lstat(state.watchedAncestorAbsolutePath);
    const watchedRealPath = await filesystemAdapter.realpath(state.watchedAncestorAbsolutePath);
    if (watchedStats.isSymbolicLink()
      || !watchedStats.isDirectory()
      || watchedRealPath !== state.watchedAncestorAbsolutePath) {
      throw new TypeError('watched ancestor changed');
    }
    const formalPathState = await inspectFormalPathState(
      state.formalAbsolutePath,
      filesystemAdapter,
    );
    const directory = await snapshotDirectory(state.watchedAncestorAbsolutePath, filesystemAdapter);
    after = {formalPathState, ...directory};
  } catch {
    after = {
      formalPathState: 'inspection_failed',
      entryCount: null,
      entriesCanonicalSha256: null,
    };
  }
  return {
    formalOutputPath: state.formalOutputPath,
    watchedAncestorPath: state.watchedAncestorPath,
    before: state.before,
    after,
  };
};

const beginRuntimeBinding = async (filesystemAdapter) => {
  try {
    if (!isNonEmptyString(process.execPath) || !isAbsolute(process.execPath)) return null;
    const resolvedNodePath = await filesystemAdapter.realpath(process.execPath);
    if (!isAbsolute(resolvedNodePath)) return null;
    const first = await readHandleStable(resolvedNodePath, filesystemAdapter);
    const options = new Intl.Segmenter('ja', {granularity: 'word'}).resolvedOptions();
    const requiredValues = [
      process.version,
      process.versions.icu,
      options.locale,
      options.granularity,
      process.platform,
      process.arch,
      process.versions.v8,
      process.versions.unicode,
      process.versions.cldr,
    ];
    if (!requiredValues.every(isNonEmptyString)) return null;
    return {
      resolvedNodePath,
      firstFileSha256: first.fileSha256,
      binding: {
        nodeBinarySha256: first.fileSha256,
        nodeVersion: process.version,
        icuVersion: process.versions.icu,
        resolvedLocale: options.locale,
        resolvedGranularity: options.granularity,
        diagnostics: {
          resolvedNodePath,
          platform: process.platform,
          arch: process.arch,
          v8Version: process.versions.v8,
          unicodeVersion: process.versions.unicode,
          cldrVersion: process.versions.cldr,
        },
      },
    };
  } catch {
    return null;
  }
};

const finishRuntimeBinding = async (state, filesystemAdapter) => {
  if (!state) return null;
  try {
    const resolvedNodePath = await filesystemAdapter.realpath(process.execPath);
    if (resolvedNodePath !== state.resolvedNodePath) return null;
    const second = await readHandleStable(resolvedNodePath, filesystemAdapter);
    if (second.fileSha256 !== state.firstFileSha256) return null;
    return state.binding;
  } catch {
    return null;
  }
};

const classifyBuildFailure = (error) => (
  error?.name === 'SegmenterBoundarySegmenterError'
    ? 'segmenter_exception'
    : 'unexpected_exception'
);

const buildEvidenceTwice = ({jobValue, inputSnapshots, runtimeBinding}) => {
  const sourceRecord = inputSnapshots[0];
  const argumentsValue = {
    artifactId: jobValue?.artifactId,
    sourceArtifact: sourceRecord?.document,
    sourceArtifactSnapshot: {
      path: sourceRecord?.path,
      fileSha256: sourceRecord?.firstFileSha256,
    },
    runtimeBinding,
  };

  let firstEvidence;
  try {
    firstEvidence = buildPresentationSegmenterBoundaryEvidenceV001(argumentsValue);
  } catch (error) {
    return {
      evidencePasses: [null, null],
      buildFailure: {pass: 1, kind: classifyBuildFailure(error)},
    };
  }

  try {
    const secondEvidence = buildPresentationSegmenterBoundaryEvidenceV001(argumentsValue);
    return {evidencePasses: [firstEvidence, secondEvidence], buildFailure: null};
  } catch (error) {
    return {
      evidencePasses: [firstEvidence, null],
      buildFailure: {pass: 2, kind: classifyBuildFailure(error)},
    };
  }
};

const validRuntimeBinding = (value) => exactFields(value, [
  'nodeBinarySha256',
  'nodeVersion',
  'icuVersion',
  'resolvedLocale',
  'resolvedGranularity',
  'diagnostics',
])
  && SHA256_PATTERN.test(value.nodeBinarySha256)
  && isNonEmptyString(value.nodeVersion)
  && isNonEmptyString(value.icuVersion)
  && value.resolvedLocale === 'ja'
  && value.resolvedGranularity === 'word'
  && exactFields(value.diagnostics, [
    'resolvedNodePath',
    'platform',
    'arch',
    'v8Version',
    'unicodeVersion',
    'cldrVersion',
  ])
  && isAbsolute(value.diagnostics.resolvedNodePath)
  && [
    value.diagnostics.platform,
    value.diagnostics.arch,
    value.diagnostics.v8Version,
    value.diagnostics.unicodeVersion,
    value.diagnostics.cldrVersion,
  ].every(isNonEmptyString);

const validGuardSnapshot = (value) => {
  if (!exactFields(value, ['formalPathState', 'entryCount', 'entriesCanonicalSha256'])
    || !['absent', 'present', 'inspection_failed'].includes(value.formalPathState)) return false;
  if (value.formalPathState === 'inspection_failed') {
    return value.entryCount === null && value.entriesCanonicalSha256 === null;
  }
  return Number.isInteger(value.entryCount)
    && value.entryCount >= 0
    && SHA256_PATTERN.test(value.entriesCanonicalSha256);
};

const validReadOnlyGuard = (value) => exactFields(value, [
  'formalOutputPath',
  'watchedAncestorPath',
  'before',
  'after',
])
  && isNonEmptyString(value.formalOutputPath)
  && isNonEmptyString(value.watchedAncestorPath)
  && validGuardSnapshot(value.before)
  && validGuardSnapshot(value.after);

const validateCheckReport = (report) => {
  if (!exactFields(report, [
    'schemaVersion',
    'status',
    'artifactId',
    'checks',
    'observedProjection',
    'violations',
  ])
    || report.schemaVersion !== 'presentation-segmenter-boundary-check-report-v001'
    || !['passed', 'failed'].includes(report.status)
    || !(report.artifactId === null || isNonEmptyString(report.artifactId))
    || !Array.isArray(report.checks)
    || report.checks.length !== PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES.length
    || !Array.isArray(report.violations)) return false;

  const codeOrder = new Map(
    PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES.map((code, index) => [code, index]),
  );
  for (let index = 0; index < report.checks.length; index += 1) {
    const check = report.checks[index];
    if (!exactFields(check, ['name', 'status', 'violationCodes'])
      || check.name !== PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES[index]
      || !['passed', 'failed', 'not_run_with_upstream_failure'].includes(check.status)
      || !Array.isArray(check.violationCodes)
      || new Set(check.violationCodes).size !== check.violationCodes.length
      || !check.violationCodes.every((code) => codeOrder.has(code))) return false;
    for (let codeIndex = 1; codeIndex < check.violationCodes.length; codeIndex += 1) {
      if (codeOrder.get(check.violationCodes[codeIndex - 1])
        >= codeOrder.get(check.violationCodes[codeIndex])) return false;
    }
  }

  let previousViolation = null;
  const observedCodesByCheck = new Map(
    PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES.map((name) => [name, new Set()]),
  );
  const seenViolationKeys = new Set();
  for (const violation of report.violations) {
    if (!exactFields(violation, ['code', 'path', 'details'])
      || !codeOrder.has(violation.code)
      || !isNonEmptyString(violation.path)
      || !exactFields(violation.details, [])) return false;
    const violationKey = `${violation.code}\u0000${violation.path}`;
    if (seenViolationKeys.has(violationKey)) return false;
    seenViolationKeys.add(violationKey);
    if (previousViolation) {
      const codeDifference = codeOrder.get(previousViolation.code) - codeOrder.get(violation.code);
      if (codeDifference > 0
        || (codeDifference === 0 && compareUtf16(previousViolation.path, violation.path) >= 0)) {
        return false;
      }
    }
    previousViolation = violation;
    observedCodesByCheck.get(CHECK_BY_CODE[violation.code]).add(violation.code);
  }

  for (const check of report.checks) {
    const expectedCodes = PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES
      .filter((code) => observedCodesByCheck.get(check.name).has(code));
    if (canonicalJsonV001(check.violationCodes) !== canonicalJsonV001(expectedCodes)) return false;
    if ((check.status === 'failed') !== (expectedCodes.length > 0)) {
      if (check.status !== 'not_run_with_upstream_failure' || expectedCodes.length > 0) return false;
    }
    if (check.status === 'passed' && expectedCodes.length > 0) return false;
  }

  const allPassed = report.checks.every((check) => check.status === 'passed');
  if ((report.status === 'passed') !== allPassed) return false;
  if (report.status === 'passed' && report.violations.length !== 0) return false;
  if (report.status === 'failed'
    && !report.checks.some((check) => check.status === 'failed')) return false;
  return report.observedProjection === null || isObject(report.observedProjection);
};

const checkByName = (checkReport, name) =>
  checkReport.checks.find((check) => check.name === name);

const makePreflightReport = ({
  jobValue,
  jobSnapshot,
  inputSnapshots,
  runtimeBinding,
  evidencePasses,
  readOnlyGuard,
  checkReport,
}) => {
  if (!validateCheckReport(checkReport)) throw new TypeError('invalid check report');
  const inputCheck = checkByName(checkReport, 'inputBinding');
  const runtimeCheck = checkByName(checkReport, 'runtimeBinding');
  const segmentationCheck = checkByName(checkReport, 'segmentation');
  const readOnlyCheck = checkByName(checkReport, 'readOnlyPreflight');
  const firstFailed = checkReport.checks.find((check) => check.status === 'failed');

  const inputs = inputCheck.status === 'passed'
    ? inputSnapshots.map((record) => ({
      role: record.role,
      path: record.path,
      fileSha256: record.firstFileSha256,
    }))
    : null;
  const observedRuntime = runtimeCheck.status === 'not_run_with_upstream_failure'
    || runtimeBinding === null
    ? null
    : runtimeBinding;
  const firstEvidence = evidencePasses[0];
  const evidence = segmentationCheck.status === 'passed'
    ? {
      artifactId: firstEvidence.artifactId,
      canonicalSha256: sha256Canonical(firstEvidence),
      boundaryCandidatesCanonicalSha256:
        firstEvidence.boundaryCandidatesCanonicalSha256,
      sourceAtomMembershipCanonicalSha256:
        firstEvidence.sourceAtomMembershipCanonicalSha256,
    }
    : null;
  const reportedGuard = readOnlyCheck.status === 'not_run_with_upstream_failure'
    || readOnlyGuard === null
    ? null
    : readOnlyGuard;

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    status: checkReport.status,
    failureStage: checkReport.status === 'passed' ? null : firstFailed?.name ?? null,
    job: {
      jobId: isNonEmptyString(jobValue?.jobId) ? jobValue.jobId : null,
      path: jobSnapshot.path,
      fileSha256: jobSnapshot.firstFileSha256,
    },
    inputs,
    runtimeBinding: observedRuntime,
    observedProjection: checkReport.observedProjection,
    evidence,
    readOnlyGuard: reportedGuard,
    checkReport,
  };
};

const validStrictJsonValue = (value) => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(validStrictJsonValue);
  if (!isObject(value)) return false;
  return Object.keys(value).every((key) => validStrictJsonValue(value[key]));
};

const sameCanonicalValue = (left, right) => {
  if (!validStrictJsonValue(left) || !validStrictJsonValue(right)) return false;
  return canonicalJsonV001(left) === canonicalJsonV001(right);
};

const serializeEvidenceBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

const validateJobSnapshotState = (value) => {
  if (!exactFields(value, [
    'path',
    'firstFileSha256',
    'secondFileSha256',
    'issues',
  ])
    || !isNonEmptyString(value.path)
    || !SHA256_PATTERN.test(value.firstFileSha256)
    || !Array.isArray(value.issues)) return false;
  if (value.issues.length === 0) {
    return value.secondFileSha256 === value.firstFileSha256;
  }
  if (sameCanonicalValue(value.issues, ['second_read_failed'])) {
    return value.secondFileSha256 === null;
  }
  if (sameCanonicalValue(value.issues, ['hash_changed'])) {
    return SHA256_PATTERN.test(value.secondFileSha256)
      && value.secondFileSha256 !== value.firstFileSha256;
  }
  return false;
};

const validatePassedInputSnapshots = (jobValue, inputSnapshots) => {
  if (!Array.isArray(jobValue?.inputs)
    || jobValue.inputs.length !== INPUT_SPECS.length
    || !Array.isArray(inputSnapshots)
    || inputSnapshots.length !== INPUT_SPECS.length) return false;
  return inputSnapshots.every((snapshot, index) => {
    const expected = jobValue.inputs[index];
    return exactFields(expected, ['role', 'path', 'fileSha256'])
      && exactFields(snapshot, [
        'role',
        'path',
        'firstFileSha256',
        'secondFileSha256',
        'document',
        'issues',
      ])
      && snapshot.role === INPUT_SPECS[index].role
      && snapshot.role === expected.role
      && snapshot.path === expected.path
      && snapshot.firstFileSha256 === expected.fileSha256
      && snapshot.secondFileSha256 === expected.fileSha256
      && SHA256_PATTERN.test(expected.fileSha256)
      && isObject(snapshot.document)
      && sameCanonicalValue(snapshot.issues, []);
  });
};

const validateInputSummary = (value, snapshot) => exactFields(value, [
  'role',
  'path',
  'fileSha256',
])
  && value.role === snapshot.role
  && value.path === snapshot.path
  && value.fileSha256 === snapshot.firstFileSha256
  && SHA256_PATTERN.test(value.fileSha256);

const validateEvidenceSummary = (value, firstEvidence) => exactFields(value, [
  'artifactId',
  'canonicalSha256',
  'boundaryCandidatesCanonicalSha256',
  'sourceAtomMembershipCanonicalSha256',
])
  && isObject(firstEvidence)
  && value.artifactId === firstEvidence.artifactId
  && isNonEmptyString(value.artifactId)
  && value.canonicalSha256 === sha256Canonical(firstEvidence)
  && value.boundaryCandidatesCanonicalSha256
    === firstEvidence.boundaryCandidatesCanonicalSha256
  && value.sourceAtomMembershipCanonicalSha256
    === firstEvidence.sourceAtomMembershipCanonicalSha256
  && [
    value.canonicalSha256,
    value.boundaryCandidatesCanonicalSha256,
    value.sourceAtomMembershipCanonicalSha256,
  ].every((hash) => SHA256_PATTERN.test(hash));

const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

const validateObservedProjectionShape = (value) => {
  if (!exactFields(value, [
    'sourceAtomCount',
    'containerCount',
    'boundaryCandidateCount',
    'wordLikeCandidateCount',
    'nonWordLikeCandidateCount',
    'timelineSegments',
    'containers',
    'mixedRawSpeakerCandidateCount',
    'rawSpeakerExactSetQueryResults',
    'sourcePositiveOverlapCount',
    'membership',
  ])
    || ![value.sourceAtomCount, value.containerCount, value.boundaryCandidateCount]
      .every((count) => Number.isInteger(count) && count >= 1)
    || ![
      value.wordLikeCandidateCount,
      value.nonWordLikeCandidateCount,
      value.mixedRawSpeakerCandidateCount,
      value.sourcePositiveOverlapCount,
    ].every(isNonNegativeInteger)
    || !Array.isArray(value.timelineSegments)
    || !Array.isArray(value.containers)
    || !Array.isArray(value.rawSpeakerExactSetQueryResults)
    || !exactFields(value.membership, [
      'missingCount',
      'duplicatedCount',
      'orderReversedCount',
      'crossSegmentCount',
      'crossSpeechCount',
    ])
    || !Object.values(value.membership).every(isNonNegativeInteger)) return false;

  if (!value.timelineSegments.every((entry) => exactFields(entry, [
    'timelineSegmentId',
    'sourceAtomCount',
    'boundaryCandidateCount',
  ])
    && isNonEmptyString(entry.timelineSegmentId)
    && isNonNegativeInteger(entry.sourceAtomCount)
    && isNonNegativeInteger(entry.boundaryCandidateCount))) return false;

  if (!value.containers.every((entry) => exactFields(entry, [
    'containerId',
    'timelineSegmentId',
    'speechId',
    'sourceAtomCount',
    'boundaryCandidateCount',
  ])
    && isNonEmptyString(entry.containerId)
    && isNonEmptyString(entry.timelineSegmentId)
    && Number.isInteger(entry.speechId)
    && isNonNegativeInteger(entry.sourceAtomCount)
    && isNonNegativeInteger(entry.boundaryCandidateCount))) return false;

  if (!value.rawSpeakerExactSetQueryResults.every((entry) => exactFields(entry, [
    'values',
    'boundaryCandidateCount',
  ])
    && Array.isArray(entry.values)
    && entry.values.length > 0
    && entry.values.every((speaker) => speaker === null || isNonEmptyString(speaker))
    && new Set(entry.values.map((speaker) => canonicalJsonV001(speaker))).size
      === entry.values.length
    && isNonNegativeInteger(entry.boundaryCandidateCount))) return false;

  const querySets = value.rawSpeakerExactSetQueryResults.map((entry) =>
    entry.values.map((speaker) => canonicalJsonV001(speaker))
      .sort(compareUtf16)
      .join('\u0000'));
  return new Set(querySets).size === querySets.length;
};

const validatePreflightReportInternal = ({
  report,
  expectedExitCode,
  jobValue,
  jobSnapshot,
  inputSnapshots,
  runtimeBinding,
  evidencePasses,
  readOnlyGuard,
}) => {
  if (!exactFields(report, [
    'schemaVersion',
    'status',
    'failureStage',
    'job',
    'inputs',
    'runtimeBinding',
    'observedProjection',
    'evidence',
    'readOnlyGuard',
    'checkReport',
  ])
    || report.schemaVersion !== REPORT_SCHEMA_VERSION
    || !validStrictJsonValue(report)
    || !validateCheckReport(report.checkReport)
    || report.status !== report.checkReport.status
    || ![0, 1].includes(expectedExitCode)
    || (expectedExitCode === 0) !== (report.status === 'passed')) return false;

  const jobCheck = checkByName(report.checkReport, 'jobBinding');
  if (!validateJobSnapshotState(jobSnapshot)
    || !['passed', 'failed'].includes(jobCheck.status)
    || jobCheck.violationCodes.includes('SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH')
      !== (jobSnapshot.issues.length > 0)
    || !exactFields(report.job, ['jobId', 'path', 'fileSha256'])
    || report.job.jobId !== (isNonEmptyString(jobValue?.jobId) ? jobValue.jobId : null)
    || report.job.path !== jobSnapshot.path
    || report.job.fileSha256 !== jobSnapshot.firstFileSha256
    || !SHA256_PATTERN.test(report.job.fileSha256)) return false;

  const firstFailed = report.checkReport.checks.find((check) => check.status === 'failed');
  const failedChecks = report.checkReport.checks.filter((check) => check.status === 'failed');
  if (report.status === 'passed') {
    if (report.failureStage !== null
      || failedChecks.length !== 0
      || report.checkReport.violations.length !== 0
      || !report.checkReport.checks.every((check) => check.status === 'passed')) return false;
  } else if (failedChecks.length === 0
    || report.checkReport.violations.length === 0
    || report.failureStage !== firstFailed.name) return false;

  const inputCheck = checkByName(report.checkReport, 'inputBinding');
  if (inputCheck.status === 'passed') {
    if (!validatePassedInputSnapshots(jobValue, inputSnapshots)
      || !Array.isArray(report.inputs)
      || report.inputs.length !== inputSnapshots.length
      || report.inputs.length !== INPUT_SPECS.length
      || !report.inputs.every((entry, index) => (
        validateInputSummary(entry, inputSnapshots[index])
      ))) return false;
  } else if (report.inputs !== null) return false;

  const runtimeCheck = checkByName(report.checkReport, 'runtimeBinding');
  const runtimeShouldBeReported = runtimeCheck.status !== 'not_run_with_upstream_failure'
    && runtimeBinding !== null;
  if (runtimeShouldBeReported) {
    if (!validRuntimeBinding(report.runtimeBinding)
      || !sameCanonicalValue(report.runtimeBinding, runtimeBinding)) return false;
  } else if (report.runtimeBinding !== null) return false;

  const segmentationCheck = checkByName(report.checkReport, 'segmentation');
  const coverageCheck = checkByName(report.checkReport, 'coverage');
  const projectionMustExist = segmentationCheck.status === 'passed'
    && coverageCheck.status === 'passed';
  if (projectionMustExist) {
    if (!validateObservedProjectionShape(report.observedProjection)
      || !validateObservedProjectionShape(report.checkReport.observedProjection)
      || !sameCanonicalValue(
        report.observedProjection,
        report.checkReport.observedProjection,
      )) return false;
  } else if (report.observedProjection !== null
    || report.checkReport.observedProjection !== null) return false;

  if (segmentationCheck.status === 'passed') {
    if (!validateEvidenceSummary(report.evidence, evidencePasses[0])
      || report.evidence.artifactId !== report.checkReport.artifactId
      || report.evidence.artifactId !== jobValue?.artifactId) return false;
  } else if (report.evidence !== null || report.checkReport.artifactId !== null) return false;

  const determinismCheck = checkByName(report.checkReport, 'determinism');
  if (determinismCheck.status === 'passed') {
    if (!Array.isArray(evidencePasses)
      || evidencePasses.length !== 2
      || evidencePasses.some((entry) => entry === null)
      || !serializeEvidenceBytes(evidencePasses[0])
        .equals(serializeEvidenceBytes(evidencePasses[1]))) return false;
  }

  const readOnlyCheck = checkByName(report.checkReport, 'readOnlyPreflight');
  const guardShouldBeReported = readOnlyCheck.status !== 'not_run_with_upstream_failure'
    && readOnlyGuard !== null;
  if (guardShouldBeReported) {
    if (!validReadOnlyGuard(report.readOnlyGuard)
      || !sameCanonicalValue(report.readOnlyGuard, readOnlyGuard)) return false;
  } else if (report.readOnlyGuard !== null) return false;

  if (report.status === 'passed') {
    if (report.inputs === null
      || report.runtimeBinding === null
      || report.observedProjection === null
      || report.evidence === null
      || report.readOnlyGuard === null) return false;
  }
  return true;
};

export function validatePresentationSegmenterBoundaryPreflightReportV001(parameters) {
  try {
    if (!exactFields(parameters, [
      'report',
      'expectedExitCode',
      'jobValue',
      'jobSnapshot',
      'inputSnapshots',
      'runtimeBinding',
      'evidencePasses',
      'readOnlyGuard',
    ])) return false;
    return validatePreflightReportInternal(parameters);
  } catch {
    return false;
  }
}

const validFilesystemAdapter = (value) => exactFields(value, [
  'openReadOnly',
  'lstat',
  'realpath',
  'readdir',
]) && Object.values(value).every((entry) => typeof entry === 'function');

export async function runPresentationSegmenterBoundaryPreflightV001(
  jobPath,
  {
    filesystemAdapter = createPresentationSegmenterBoundaryProductionFilesystemAdapterV001(),
  } = {},
) {
  if (!validFilesystemAdapter(filesystemAdapter)) {
    return diagnosticResult('SEGMENTER_BOUNDARY_CLI_INTERNAL_REPORT_INVALID');
  }

  const initialJob = await readInitialJob(jobPath, filesystemAdapter);
  if (initialJob === null) {
    return diagnosticResult('SEGMENTER_BOUNDARY_CLI_JOB_CONTEXT_UNAVAILABLE');
  }

  const {value: jobValue, snapshot: jobSnapshot} = initialJob;
  const guardState = await initialiseReadOnlyGuard(jobValue, filesystemAdapter);
  const observedImplementationBinding = await loadImplementationSnapshots(filesystemAdapter);
  const inputSnapshots = await loadInputSnapshots(jobValue, filesystemAdapter);
  const runtimeState = await beginRuntimeBinding(filesystemAdapter);
  const {evidencePasses, buildFailure} = buildEvidenceTwice({
    jobValue,
    inputSnapshots,
    runtimeBinding: runtimeState?.binding ?? null,
  });

  await refreshJobSnapshot(jobSnapshot, filesystemAdapter);
  await refreshImplementationSnapshots(observedImplementationBinding, filesystemAdapter);
  await refreshInputSnapshots(inputSnapshots, filesystemAdapter);
  const runtimeBinding = await finishRuntimeBinding(runtimeState, filesystemAdapter);
  const readOnlyGuard = await finishReadOnlyGuard(guardState, filesystemAdapter);

  const context = {
    jobValue,
    jobSnapshot,
    observedImplementationBinding,
    inputSnapshots,
    runtimeBinding,
    evidencePasses,
    buildFailure,
    readOnlyGuard,
    productionMode: true,
  };

  let checkReport;
  try {
    checkReport = checkPresentationSegmenterBoundaryPreflightV001(context);
  } catch {
    return diagnosticResult('SEGMENTER_BOUNDARY_CLI_INTERNAL_REPORT_INVALID');
  }

  let report;
  try {
    report = makePreflightReport({
      jobValue,
      jobSnapshot,
      inputSnapshots,
      runtimeBinding,
      evidencePasses,
      readOnlyGuard,
      checkReport,
    });
    const expectedExitCode = report.status === 'passed' ? 0 : 1;
    if (!validatePresentationSegmenterBoundaryPreflightReportV001({
      report,
      expectedExitCode,
      jobValue,
      jobSnapshot,
      inputSnapshots,
      runtimeBinding,
      evidencePasses,
      readOnlyGuard,
    })) {
      return diagnosticResult('SEGMENTER_BOUNDARY_CLI_INTERNAL_REPORT_INVALID');
    }
    const serializedReport = `${canonicalJsonV001(report)}\n`;
    return expectedExitCode === 0
      ? {exitCode: 0, stdout: serializedReport, stderr: ''}
      : {exitCode: 1, stdout: '', stderr: serializedReport};
  } catch {
    return diagnosticResult('SEGMENTER_BOUNDARY_CLI_INTERNAL_REPORT_INVALID');
  }
}

export async function runPresentationSegmenterBoundaryPreflightCliV001(
  argv = process.argv.slice(2),
  streams = {stdout: process.stdout, stderr: process.stderr},
) {
  let result;
  if (!Array.isArray(argv) || argv.length !== 1) {
    result = diagnosticResult('SEGMENTER_BOUNDARY_CLI_USAGE_ERROR');
  } else {
    try {
      result = await runPresentationSegmenterBoundaryPreflightV001(argv[0]);
    } catch {
      result = diagnosticResult('SEGMENTER_BOUNDARY_CLI_INTERNAL_REPORT_INVALID');
    }
  }
  if (result.stdout.length > 0) streams.stdout.write(result.stdout);
  if (result.stderr.length > 0) streams.stderr.write(result.stderr);
  return result.exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === RUNNER_FILE_PATH) {
  process.exitCode = await runPresentationSegmenterBoundaryPreflightCliV001();
}
