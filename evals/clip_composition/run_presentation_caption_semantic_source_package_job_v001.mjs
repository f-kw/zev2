#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readlink,
  readdir,
  realpath,
  rename,
  rmdir,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {
  assertPresentationCaptionB1StrictValueV001,
  buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001,
  buildPresentationCaptionSemanticSourcePackageV001,
  canonicalizePresentationCaptionB1JsonV001,
  checkPresentationCaptionSemanticSourcePackageV001,
  decodePresentationCaptionB1StrictJsonV001,
  derivePresentationCaptionEmbeddedGateAReportContextV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
  validatePresentationCaptionSemanticSourcePackageJobV001,
  validatePresentationCaptionSemanticSourcePackageRunReportV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  buildPresentationSegmenterBoundaryEvidenceV001,
} from './presentation_segmenter_boundary_evidence_v001.mjs';

const RUNNER_PATH = fileURLToPath(import.meta.url);
const LEXICAL_WORKSPACE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EXPECTED_RUNNER_REPOSITORY_PATH =
  'evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs';

const PREFLIGHT_JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-source-package-preflight-jobs';
const FORMAL_JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs';
const WATCHED_ROOT = 'evals/clip_composition/outputs/presentation';

const PACKAGE_FILE_NAMES = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);

const PACKAGE_IMPLEMENTATION_ROLES = Object.freeze([
  'packageCore',
  'packageRunner',
  'rendererTrustImplementation',
]);
const WIDTH_POLICY_ROLES = Object.freeze([
  'presetRegistry',
  'presetValidationIndex',
  'materialValidationIndex',
  'registryBinding',
  'rendererTrust',
  'textLayoutImplementation',
]);
const GATE_A_IMPLEMENTATION_ROLES = Object.freeze([
  'core',
  'retainedSourceAtomsCore',
  'runner',
]);
const GATE_A_SOURCE_ROLES = Object.freeze([
  'sourceAtoms',
  'sourceGenerationManifest',
  'sourceValidationReport',
]);

const PACKAGE_CHECK_NAMES = Object.freeze([
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

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const isPlainObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype
    || Object.getPrototypeOf(value) === null);
const hasExactKeys = (value, keys) => isPlainObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const isDenseArray = (value) => Array.isArray(value)
  && Object.keys(value).length === value.length
  && Object.keys(value).every((key, index) => key === String(index));
const compareUtf16 = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const toPosix = (value) => value.split(sep).join('/');

const diagnosticResult = (diagnostic) => Object.freeze({
  kind: 'untrusted',
  exitCode: 2,
  diagnostic,
});

const statKind = (stats) => {
  if (stats.isFile()) return 'regular-file';
  if (stats.isDirectory()) return 'directory';
  if (stats.isSymbolicLink()) return 'symlink';
  return 'other';
};

const directoryEntryKind = (entry) => {
  if (entry.isFile()) return 'file';
  if (entry.isDirectory()) return 'directory';
  if (entry.isSymbolicLink()) return 'symlink';
  return 'other';
};

const statObservation = (stats) => ({
  kind: statKind(stats),
  dev: stats.dev.toString(10),
  ino: stats.ino.toString(10),
  size: stats.size.toString(10),
  mtimeNs: stats.mtimeNs.toString(10),
  nlink: stats.nlink.toString(10),
});

const identityObservation = (stats) => ({
  kind: stats.isDirectory()
    ? 'directory'
    : stats.isSymbolicLink()
      ? 'symlink'
      : 'other',
  dev: stats.dev.toString(10),
  ino: stats.ino.toString(10),
});

const relativePathParts = (pathValue) => {
  if (typeof pathValue !== 'string'
    || pathValue.length === 0
    || pathValue.includes('\0')
    || pathValue.includes('\\')
    || pathValue.includes('//')
    || isAbsolute(pathValue)) return null;
  const parts = pathValue.split('/');
  if (parts.some((part) => part.length === 0 || part === '.' || part === '..')) return null;
  return parts;
};

const pathUnderRoot = (pathValue, root) => {
  const parts = relativePathParts(pathValue);
  const rootParts = root.split('/');
  return parts !== null
    && parts.length > rootParts.length
    && rootParts.every((part, index) => part === parts[index]);
};

const isDirectJsonUnder = (pathValue, root) => pathUnderRoot(pathValue, root)
  && dirname(pathValue) === root
  && basename(pathValue).endsWith('.json');

const coreSerialize = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  return result?.status === 'serialized' && Buffer.isBuffer(result.bytes)
    ? Buffer.from(result.bytes)
    : null;
};

const coreCanonicalize = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  return result?.status === 'canonicalized' && Buffer.isBuffer(result.bytes)
    ? Buffer.from(result.bytes)
    : null;
};

const coreHash = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  return result?.status === 'hashed' && SHA256_PATTERN.test(result.sha256)
    ? result.sha256
    : null;
};

export const createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001 =
  () => Object.freeze({
    openReadOnly: async (pathValue) => {
      const handle = await open(
        pathValue,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      return Object.freeze({
        statBigInt: () => handle.stat({bigint: true}),
        readAllBytes: () => handle.readFile(),
        close: () => handle.close(),
      });
    },
    openWriteExclusive: async (pathValue) => {
      const handle = await open(
        pathValue,
        constants.O_WRONLY
          | constants.O_CREAT
          | constants.O_EXCL
          | constants.O_NOFOLLOW,
        0o600,
      );
      return Object.freeze({
        writeAllBytes: (bytes) => handle.writeFile(bytes),
        sync: () => handle.sync(),
        statBigInt: () => handle.stat({bigint: true}),
        close: () => handle.close(),
      });
    },
    openDirectoryReadOnly: async (pathValue) => {
      const handle = await open(
        pathValue,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      );
      return Object.freeze({
        sync: () => handle.sync(),
        statBigInt: () => handle.stat({bigint: true}),
        close: () => handle.close(),
      });
    },
    lstatBigInt: (pathValue) => lstat(pathValue, {bigint: true}),
    realpath: (pathValue) => realpath(pathValue),
    readdirWithTypes: (pathValue) => readdir(pathValue, {withFileTypes: true}),
    readlink: (pathValue) => readlink(pathValue),
    mkdirExclusive: (pathValue) => mkdir(pathValue, {recursive: false}),
    mkdir: (pathValue) => mkdir(pathValue, {recursive: false}),
    rename: (fromPath, toPath) => rename(fromPath, toPath),
    removeEmptyDirectory: (pathValue) => rmdir(pathValue),
  });

const PACKAGE_ADAPTER_FIELDS = Object.freeze([
  'openReadOnly',
  'openWriteExclusive',
  'openDirectoryReadOnly',
  'lstatBigInt',
  'realpath',
  'readdirWithTypes',
  'readlink',
  'mkdirExclusive',
  'mkdir',
  'rename',
  'removeEmptyDirectory',
]);
const READ_ONLY_ADAPTER_FIELDS = Object.freeze([
  'openReadOnly',
  'lstatBigInt',
  'realpath',
  'readdirWithTypes',
  'readlink',
]);

const validAdapter = (value, fields) => hasExactKeys(value, fields)
  && fields.every((field) => typeof value[field] === 'function');

const makeFacade = (rawAdapter, mode) => {
  const fields = mode === 'read-only-preflight'
    ? READ_ONLY_ADAPTER_FIELDS
    : PACKAGE_ADAPTER_FIELDS;
  const facade = {};
  for (const field of fields) facade[field] = rawAdapter[field];
  return Object.freeze(facade);
};

const workspaceAbsolutePath = (workspaceRoot, repositoryPath) =>
  resolve(workspaceRoot, ...repositoryPath.split('/'));

const workspaceRepositoryPath = (workspaceRoot, absolutePath) => {
  const value = relative(workspaceRoot, absolutePath);
  if (value === '' || value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value)) {
    return null;
  }
  return toPosix(value);
};

const inspectWorkspaceResolution = async (
  repositoryPath,
  workspaceRoot,
  filesystemAdapter,
) => {
  const parts = relativePathParts(repositoryPath);
  if (parts === null) return null;
  const absolutePath = workspaceAbsolutePath(workspaceRoot, repositoryPath);
  if (workspaceRepositoryPath(workspaceRoot, absolutePath) !== repositoryPath) return null;

  const workspaceRootRealPath = workspaceRoot;
  const ancestors = [];
  let cursor = workspaceRoot;
  const parentParts = parts.slice(0, -1);
  for (let index = -1; index < parentParts.length; index += 1) {
    if (index >= 0) cursor = resolve(cursor, parentParts[index]);
    const stats = await filesystemAdapter.lstatBigInt(cursor);
    let resolvedPath = cursor === workspaceRoot ? workspaceRoot : null;
    if (resolvedPath === null) {
      try {
        resolvedPath = await filesystemAdapter.realpath(cursor);
      } catch {
        resolvedPath = null;
      }
    }
    ancestors.push({
      workspaceRelativePath: workspaceRepositoryPath(workspaceRoot, cursor) ?? '',
      lstatKind: stats.isDirectory()
        ? 'directory'
        : stats.isSymbolicLink()
          ? 'symlink'
          : 'other',
      realPath: resolvedPath,
    });
  }

  let targetRealPath = null;
  try {
    targetRealPath = await filesystemAdapter.realpath(absolutePath);
  } catch {
    targetRealPath = null;
  }
  return {
    absolutePath,
    observation: {
      workspaceRootRealPath,
      lexicalWorkspaceRelativePath: repositoryPath,
      targetRealPath,
      ancestors,
    },
  };
};

const readStableWorkspaceObservation = async (
  role,
  repositoryPath,
  workspaceRoot,
  filesystemAdapter,
) => {
  if (relativePathParts(repositoryPath) === null) {
    return {
      role,
      path: repositoryPath,
      status: 'lexically-rejected',
      snapshot: null,
    };
  }

  const absolutePath = workspaceAbsolutePath(workspaceRoot, repositoryPath);
  let pathLstat;
  try {
    pathLstat = await filesystemAdapter.lstatBigInt(absolutePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {role, path: repositoryPath, status: 'missing', snapshot: null};
    }
    throw error;
  }

  const resolution = await inspectWorkspaceResolution(
    repositoryPath,
    workspaceRoot,
    filesystemAdapter,
  );
  if (resolution === null) {
    return {
      role,
      path: repositoryPath,
      status: 'lexically-rejected',
      snapshot: null,
    };
  }
  const pathLstatBeforeOpen = statObservation(pathLstat);
  const unsafe = !pathLstat.isFile()
    || pathLstat.isSymbolicLink()
    || pathLstat.nlink !== 1n
    || resolution.observation.workspaceRootRealPath !== workspaceRoot
    || resolution.observation.targetRealPath !== absolutePath
    || resolution.observation.ancestors.some((entry) => (
      entry.lstatKind !== 'directory'
      || entry.realPath !== (
        entry.workspaceRelativePath === ''
          ? workspaceRoot
          : workspaceAbsolutePath(workspaceRoot, entry.workspaceRelativePath)
      )
    ));
  if (unsafe) {
    return {
      role,
      path: repositoryPath,
      status: 'observed-unsafe',
      snapshot: null,
      pathLstatBeforeOpen,
      pathResolutionObservation: resolution.observation,
    };
  }

  let handle;
  let closeAttempted = false;
  try {
    handle = await filesystemAdapter.openReadOnly(absolutePath);
    const fdStatAfterOpen = statObservation(await handle.statBigInt());
    const bytes = Buffer.from(await handle.readAllBytes());
    const fdStatAfterRead = statObservation(await handle.statBigInt());
    closeAttempted = true;
    await handle.close();
    handle = null;
    return {
      role,
      path: repositoryPath,
      status: 'read',
      snapshot: {
        path: repositoryPath,
        bytes,
        fileSha256: sha256Bytes(bytes),
        pathLstatBeforeOpen,
        fdStatAfterOpen,
        fdStatAfterRead,
        pathResolutionObservation: resolution.observation,
      },
    };
  } finally {
    if (handle !== undefined && handle !== null && !closeAttempted) await handle.close();
  }
};

const inspectExternalResolution = async (absolutePath, filesystemAdapter) => {
  const parsed = resolve(absolutePath);
  if (!isAbsolute(absolutePath) || parsed !== absolutePath) return null;
  const pathParts = absolutePath.split(sep).filter(Boolean);
  const ancestors = [];
  let cursor = sep;
  const parentParts = pathParts.slice(0, -1);
  for (let index = -1; index < parentParts.length; index += 1) {
    if (index >= 0) cursor = resolve(cursor, parentParts[index]);
    const stats = await filesystemAdapter.lstatBigInt(cursor);
    let resolvedPath = null;
    try {
      resolvedPath = await filesystemAdapter.realpath(cursor);
    } catch {
      resolvedPath = null;
    }
    ancestors.push({
      absolutePath: cursor,
      lstatKind: stats.isDirectory()
        ? 'directory'
        : stats.isSymbolicLink()
          ? 'symlink'
          : 'other',
      realPath: resolvedPath,
    });
  }
  let targetRealPath = null;
  try {
    targetRealPath = await filesystemAdapter.realpath(absolutePath);
  } catch {
    targetRealPath = null;
  }
  return {inputAbsolutePath: absolutePath, targetRealPath, ancestors};
};

const readNodeBinaryObservation = async (filesystemAdapter) => {
  if (typeof process.execPath !== 'string' || !isAbsolute(process.execPath)) {
    return {role: 'nodeBinary', status: 'missing', snapshot: null};
  }
  let resolvedNodePath;
  try {
    resolvedNodePath = await filesystemAdapter.realpath(process.execPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {role: 'nodeBinary', status: 'missing', snapshot: null};
    }
    throw error;
  }
  let pathLstat;
  try {
    pathLstat = await filesystemAdapter.lstatBigInt(resolvedNodePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {role: 'nodeBinary', status: 'missing', snapshot: null};
    }
    throw error;
  }
  const resolution = await inspectExternalResolution(resolvedNodePath, filesystemAdapter);
  if (resolution === null) {
    return {role: 'nodeBinary', status: 'missing', snapshot: null};
  }
  const pathLstatBeforeOpen = statObservation(pathLstat);
  const unsafe = !pathLstat.isFile()
    || pathLstat.isSymbolicLink()
    || pathLstat.nlink !== 1n
    || resolution.targetRealPath !== resolvedNodePath
    || resolution.ancestors.some((entry) => (
      entry.lstatKind !== 'directory' || entry.realPath !== entry.absolutePath
    ));
  if (unsafe) {
    return {
      role: 'nodeBinary',
      status: 'observed-unsafe',
      snapshot: null,
      pathLstatBeforeOpen,
      externalPathResolutionObservation: resolution,
    };
  }

  let handle;
  let closeAttempted = false;
  try {
    handle = await filesystemAdapter.openReadOnly(resolvedNodePath);
    const fdStatAfterOpen = statObservation(await handle.statBigInt());
    const bytes = Buffer.from(await handle.readAllBytes());
    const fdStatAfterRead = statObservation(await handle.statBigInt());
    closeAttempted = true;
    await handle.close();
    handle = null;
    return {
      role: 'nodeBinary',
      status: 'read',
      snapshot: {
        path: resolvedNodePath,
        bytes,
        fileSha256: sha256Bytes(bytes),
        pathLstatBeforeOpen,
        fdStatAfterOpen,
        fdStatAfterRead,
        externalPathResolutionObservation: resolution,
      },
    };
  } finally {
    if (handle !== undefined && handle !== null && !closeAttempted) await handle.close();
  }
};

const readDecodedObservation = (observation) => {
  if (observation?.status !== 'read') return null;
  const result = decodePresentationCaptionB1StrictJsonV001(observation.snapshot.bytes);
  return result?.status === 'decoded' ? result.value : null;
};

const makeRuntimeObservation = async (filesystemAdapter) => {
  const nodeBinaryInput = await readNodeBinaryObservation(filesystemAdapter);
  const segmenterOptions = new Intl.Segmenter('ja', {granularity: 'word'}).resolvedOptions();
  return {
    nodeBinaryInput,
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: segmenterOptions.locale,
    resolvedGranularity: segmenterOptions.granularity,
    diagnostics: {
      resolvedNodePath: nodeBinaryInput.status === 'read'
        ? nodeBinaryInput.snapshot.path
        : process.execPath,
      platform: process.platform,
      arch: process.arch,
      v8Version: process.versions.v8,
      unicodeVersion: process.versions.unicode,
      cldrVersion: process.versions.cldr,
    },
  };
};

const canonicalSha256 = (value) => {
  const bytes = coreCanonicalize(value);
  return bytes === null ? null : coreHash(bytes);
};

const snapshotWatchedTree = async (
  workspaceRoot,
  filesystemAdapter,
  excludedPaths,
) => {
  const excluded = new Set(excludedPaths);
  const rootPath = workspaceAbsolutePath(workspaceRoot, WATCHED_ROOT);
  const results = [];

  const visit = async (absoluteDirectory, repositoryDirectory) => {
    const entries = (await filesystemAdapter.readdirWithTypes(absoluteDirectory))
      .map((entry) => ({entry, kind: directoryEntryKind(entry)}))
      .sort((left, right) => compareUtf16(left.entry.name, right.entry.name));
    for (const {entry, kind} of entries) {
      const repositoryPath = `${repositoryDirectory}/${entry.name}`;
      if (excluded.has(repositoryPath)) continue;
      const absolutePath = resolve(absoluteDirectory, entry.name);
      if (kind === 'directory') {
        results.push({path: repositoryPath, kind, contentSha256: null});
        await visit(absolutePath, repositoryPath);
      } else if (kind === 'file') {
        const observation = await readStableWorkspaceObservation(
          'watchedFile',
          repositoryPath,
          workspaceRoot,
          filesystemAdapter,
        );
        if (observation.status !== 'read') throw new TypeError('watched file unreadable');
        results.push({
          path: repositoryPath,
          kind,
          contentSha256: observation.snapshot.fileSha256,
        });
      } else if (kind === 'symlink') {
        const linkText = await filesystemAdapter.readlink(absolutePath);
        results.push({
          path: repositoryPath,
          kind,
          contentSha256: sha256Bytes(Buffer.from(linkText, 'utf8')),
        });
      } else {
        throw new TypeError('unsupported watched entry');
      }
    }
  };

  await visit(rootPath, WATCHED_ROOT);
  return results.sort((left, right) => compareUtf16(left.path, right.path));
};

const inspectLegacyFormalPathState = async (absolutePath, filesystemAdapter) => {
  try {
    await filesystemAdapter.lstatBigInt(absolutePath);
    return 'present';
  } catch (error) {
    if (error?.code === 'ENOENT') return 'absent';
    return 'inspection_failed';
  }
};

const legacyDirectoryEntries = async (absolutePath, filesystemAdapter) =>
  (await filesystemAdapter.readdirWithTypes(absolutePath))
    .map((entry) => ({
      name: entry.name,
      type: entry.isFile()
        ? 'regular-file'
        : entry.isDirectory()
          ? 'directory'
          : entry.isSymbolicLink()
            ? 'symbolic-link'
            : 'other',
    }))
    .sort((left, right) => compareUtf16(left.name, right.name));

const beginLegacyReadOnlyObservation = async (
  gateAJobValue,
  workspaceRoot,
  filesystemAdapter,
) => {
  const formalOutputPath = gateAJobValue?.readOnlyGuard?.formalOutputPath;
  if (relativePathParts(formalOutputPath) === null) {
    return {
      state: null,
      observation: {
        formalOutputPath: formalOutputPath ?? null,
        watchedAncestorPath: null,
        beforeFormalPathState: 'inspection_failed',
        afterFormalPathState: 'inspection_failed',
        beforeEntries: null,
        afterEntries: null,
      },
    };
  }

  const formalAbsolutePath = workspaceAbsolutePath(workspaceRoot, formalOutputPath);
  const parts = formalOutputPath.split('/');
  let watchedAbsolutePath = workspaceRoot;
  let watchedAncestorPath = '';
  for (let count = 1; count < parts.length; count += 1) {
    const candidatePath = parts.slice(0, count).join('/');
    const candidateAbsolute = workspaceAbsolutePath(workspaceRoot, candidatePath);
    try {
      const stats = await filesystemAdapter.lstatBigInt(candidateAbsolute);
      if (!stats.isDirectory() || stats.isSymbolicLink()) break;
      const resolved = await filesystemAdapter.realpath(candidateAbsolute);
      if (resolved !== candidateAbsolute) break;
      watchedAbsolutePath = candidateAbsolute;
      watchedAncestorPath = candidatePath;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      break;
    }
  }
  const beforeFormalPathState = await inspectLegacyFormalPathState(
    formalAbsolutePath,
    filesystemAdapter,
  );
  let beforeEntries = null;
  try {
    beforeEntries = await legacyDirectoryEntries(watchedAbsolutePath, filesystemAdapter);
  } catch {
    beforeEntries = null;
  }
  return {
    state: {formalAbsolutePath, watchedAbsolutePath},
    observation: {
      formalOutputPath,
      watchedAncestorPath,
      beforeFormalPathState,
      afterFormalPathState: 'inspection_failed',
      beforeEntries,
      afterEntries: null,
    },
  };
};

const finishLegacyReadOnlyObservation = async (
  initial,
  filesystemAdapter,
) => {
  if (initial.state === null) return initial.observation;
  let afterFormalPathState = 'inspection_failed';
  let afterEntries = null;
  try {
    const watchedStats = await filesystemAdapter.lstatBigInt(
      initial.state.watchedAbsolutePath,
    );
    const watchedRealPath = await filesystemAdapter.realpath(
      initial.state.watchedAbsolutePath,
    );
    if (!watchedStats.isDirectory()
      || watchedStats.isSymbolicLink()
      || watchedRealPath !== initial.state.watchedAbsolutePath) {
      throw new TypeError('legacy watched ancestor changed');
    }
    afterFormalPathState = await inspectLegacyFormalPathState(
      initial.state.formalAbsolutePath,
      filesystemAdapter,
    );
    afterEntries = await legacyDirectoryEntries(
      initial.state.watchedAbsolutePath,
      filesystemAdapter,
    );
  } catch {
    afterFormalPathState = 'inspection_failed';
    afterEntries = null;
  }
  return {
    formalOutputPath: initial.observation.formalOutputPath,
    watchedAncestorPath: initial.observation.watchedAncestorPath,
    beforeFormalPathState: initial.observation.beforeFormalPathState,
    afterFormalPathState,
    beforeEntries: initial.observation.beforeEntries,
    afterEntries,
  };
};

const makeNotRequestedPublication = () => ({mode: 'not-requested'});
const makeNotAttemptedOperation = () => ({status: 'not-attempted', failurePoint: null});
const makeNotAttemptedStatOperation = () => ({
  status: 'not-attempted',
  identity: null,
  failurePoint: null,
});
const makeInitialFormalPublication = () => ({
  mode: 'formal',
  initialPaths: {status: 'not-attempted', entries: null, failurePoint: null},
  lock: {
    state: 'not-attempted',
    identityAfterCreate: null,
    identityAtLastOwnershipCheck: null,
    failurePoint: null,
  },
  staging: {
    status: 'not-attempted',
    directoryEntries: null,
    artifactReads: null,
    failurePoint: null,
  },
  inputRecheck: {
    status: 'not-attempted',
    observations: null,
    failurePoint: null,
  },
  preRename: {
    state: 'not-attempted',
    lockIdentity: null,
    formalRoot: null,
    sourceParentIdentity: null,
    targetParentIdentity: null,
    failurePoint: null,
  },
  rename: makeNotAttemptedOperation(),
  parentDirectoryDurability: {
    open: makeNotAttemptedOperation(),
    sync: makeNotAttemptedOperation(),
    stat: makeNotAttemptedStatOperation(),
    close: makeNotAttemptedOperation(),
  },
  published: {
    status: 'not-attempted',
    directoryEntries: null,
    artifactReads: null,
    failurePoint: null,
  },
});

const readInitialJob = async (jobPath, workspaceRoot, filesystemAdapter) => {
  if (!isDirectJsonUnder(jobPath, PREFLIGHT_JOB_ROOT)
    && !isDirectJsonUnder(jobPath, FORMAL_JOB_ROOT)) return null;
  const observation = await readStableWorkspaceObservation(
    'job',
    jobPath,
    workspaceRoot,
    filesystemAdapter,
  );
  if (observation.status !== 'read') return null;
  const decoded = decodePresentationCaptionB1StrictJsonV001(observation.snapshot.bytes);
  if (decoded?.status !== 'decoded') return null;
  const validated = validatePresentationCaptionSemanticSourcePackageJobV001(decoded.value);
  if (validated?.status !== 'valid') return null;
  const value = validated.value;
  const expectedRoot = value.mode === 'read-only-preflight'
    ? PREFLIGHT_JOB_ROOT
    : FORMAL_JOB_ROOT;
  if (!isDirectJsonUnder(jobPath, expectedRoot)
    || value.readOnlyGuard?.excludedPaths?.length !== 1
    || value.readOnlyGuard.excludedPaths[0] !== jobPath) return null;
  return {value, observation};
};

const validCheckResult = (value) => value?.status === 'checked'
  && isDenseArray(value.checks)
  && isDenseArray(value.violations);
const checkPassed = (result, checkName) => {
  const entry = result?.checks?.find((candidate) => candidate?.name === checkName);
  return entry?.status === 'passed';
};
const allCoreChecksPassed = (result) => PACKAGE_CHECK_NAMES.every(
  (checkName) => checkPassed(result, checkName),
);

const cloneWithBufferCopies = (value, pathValue = '$', copies = []) => {
  if (Buffer.isBuffer(value)) {
    const copy = Buffer.from(value);
    copies.push({path: pathValue, copy});
    return copy;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => cloneWithBufferCopies(
      entry,
      `${pathValue}[${index}]`,
      copies,
    ));
  }
  if (isPlainObject(value)) {
    const result = {};
    for (const key of Object.keys(value)) {
      result[key] = cloneWithBufferCopies(value[key], `${pathValue}.${key}`, copies);
    }
    return result;
  }
  return value;
};

const validateJsonObjectTransport = (value) => isPlainObject(value)
  && assertPresentationCaptionB1StrictValueV001(value)?.status === 'valid';

const validatePackageTransport = (value) => hasExactKeys(value, ['artifacts'])
  && isDenseArray(value.artifacts)
  && value.artifacts.every((artifact) => (
    hasExactKeys(artifact, [
      'fileName',
      'value',
      'bytes',
      'fileSha256',
      'canonicalSha256',
    ])
    && typeof artifact.fileName === 'string'
    && assertPresentationCaptionB1StrictValueV001(artifact.fileName)?.status === 'valid'
    && validateJsonObjectTransport(artifact.value)
    && Buffer.isBuffer(artifact.bytes)
    && SHA256_PATTERN.test(artifact.fileSha256)
    && SHA256_PATTERN.test(artifact.canonicalSha256)
  ));

const makeByteCopyResults = (copies, beforeHashes) => copies.map((entry, index) => {
  const afterSha256 = sha256Bytes(entry.copy);
  return {
    path: entry.path,
    beforeSha256: beforeHashes[index],
    afterSha256,
    unchanged: beforeHashes[index] === afterSha256,
  };
});

const buildJsonObjectAttempt = (
  builder,
  context,
  {embeddedCanonical = false} = {},
) => {
  const copies = [];
  const copiedContext = cloneWithBufferCopies(context, '$', copies);
  const beforeHashes = copies.map((entry) => sha256Bytes(entry.copy));
  let value;
  let thrown = false;
  try {
    value = builder(copiedContext);
  } catch {
    thrown = true;
  }
  const inputByteCopies = makeByteCopyResults(copies, beforeHashes);
  if (inputByteCopies.some((entry) => !entry.unchanged)) {
    return {status: 'failed', kind: 'input-mutated', inputByteCopies};
  }
  if (thrown) return {status: 'failed', kind: 'thrown', inputByteCopies};
  if (!validateJsonObjectTransport(value)) {
    return {status: 'failed', kind: 'invalid-return', inputByteCopies};
  }
  const canonicalBytes = coreCanonicalize(value);
  const bytes = embeddedCanonical
    ? canonicalBytes === null
      ? null
      : Buffer.concat([canonicalBytes, Buffer.from('\n', 'utf8')])
    : coreSerialize(value);
  if (bytes === null || canonicalBytes === null) {
    return {status: 'failed', kind: 'invalid-return', inputByteCopies};
  }
  const fileSha256 = coreHash(bytes);
  const canonicalSha256 = coreHash(canonicalBytes);
  if (fileSha256 === null || canonicalSha256 === null) {
    return {status: 'failed', kind: 'invalid-return', inputByteCopies};
  }
  return {
    status: 'succeeded',
    result: {
      value,
      bytes,
      fileSha256,
      canonicalSha256,
      inputByteCopies,
    },
  };
};

const buildPackageAttempt = (builder, context, provenanceFactory) => {
  const copies = [];
  const copiedContext = cloneWithBufferCopies(context, '$', copies);
  const beforeHashes = copies.map((entry) => sha256Bytes(entry.copy));
  const provenance = provenanceFactory(copiedContext);
  let value;
  let thrown = false;
  try {
    value = builder(provenance.proxy);
  } catch {
    thrown = true;
  }
  const inputByteCopies = makeByteCopyResults(copies, beforeHashes);
  if (inputByteCopies.some((entry) => !entry.unchanged)) {
    return {
      status: 'failed',
      kind: 'input-mutated',
      inputByteCopies,
      provenance: provenance.value,
    };
  }
  if (thrown) {
    return {
      status: 'failed',
      kind: 'thrown',
      inputByteCopies,
      provenance: provenance.value,
    };
  }
  if (!validatePackageTransport(value)) {
    return {
      status: 'failed',
      kind: 'invalid-return',
      inputByteCopies,
      provenance: provenance.value,
    };
  }
  return {
    status: 'succeeded',
    result: {
      artifacts: value.artifacts,
      inputByteCopies,
    },
    provenance: provenance.value,
  };
};

const buildTwoPasses = (
  stage,
  builder,
  contextFactory,
  attempt,
) => {
  const passes = [null, null];
  const provenancePasses = [];
  for (let passOrdinal = 1; passOrdinal <= 2; passOrdinal += 1) {
    const context = contextFactory(passOrdinal);
    const outcome = attempt(builder, context, passOrdinal);
    if (outcome.provenance !== undefined) provenancePasses.push(outcome.provenance);
    if (outcome.status !== 'succeeded') {
      return {
        passes,
        provenancePasses,
        buildFailure: {
          stage,
          passOrdinal,
          kind: outcome.kind,
          inputByteCopies: outcome.inputByteCopies,
        },
      };
    }
    passes[passOrdinal - 1] = outcome.result;
  }
  return {passes, provenancePasses, buildFailure: null};
};

const provenanceEntry = (role, pathValue) => ({role, path: pathValue});

const packageProvenanceEntries = (context) => [
  provenanceEntry('job', context.job.snapshot.path),
  provenanceEntry('gateA.job', context.gateA.jobSnapshot.path),
  provenanceEntry(
    'gateA.completionReport',
    context.gateA.completionReportSnapshot.path,
  ),
  provenanceEntry('gateA.evidence', null),
  provenanceEntry('gateA.embeddedReport', null),
  ...context.implementationSnapshots.map((snapshot, index) =>
    provenanceEntry(`implementation.${PACKAGE_IMPLEMENTATION_ROLES[index]}`, snapshot.path)),
  ...context.sourceSnapshots.map((snapshot, index) =>
    provenanceEntry(`source.${GATE_A_SOURCE_ROLES[index]}`, snapshot.path)),
  ...context.widthPolicySnapshots.map((snapshot, index) =>
    provenanceEntry(`width.${WIDTH_POLICY_ROLES[index]}`, snapshot.path)),
  provenanceEntry('runtimeObservation', null),
  provenanceEntry('runtimeObservation.nodeBinary', null),
];

const makePackageProvenanceProxy = (context, passOrdinal) => {
  const providedEntries = packageProvenanceEntries(context);
  const accessedEntries = [];
  const accessedRoles = new Set();
  const entryByRole = new Map(providedEntries.map((entry) => [entry.role, entry]));
  const record = (roles) => {
    for (const role of providedEntries.map((entry) => entry.role)) {
      if (!roles.includes(role) || accessedRoles.has(role)) continue;
      accessedRoles.add(role);
      accessedEntries.push({...entryByRole.get(role)});
    }
  };

  const roleForPath = (pathParts) => {
    if (pathParts[0] === 'job') return pathParts.length >= 2 ? 'job' : null;
    if (pathParts[0] === 'gateA') {
      if (['jobValue', 'jobSnapshot'].includes(pathParts[1])) return 'gateA.job';
      if (pathParts[1] === 'completionReportSnapshot') return 'gateA.completionReport';
      if (['evidenceValue', 'evidenceBytes'].includes(pathParts[1])) {
        return 'gateA.evidence';
      }
      if (['embeddedReportValue', 'embeddedReportBytes'].includes(pathParts[1])) {
        return 'gateA.embeddedReport';
      }
    }
    if (pathParts[0] === 'implementationSnapshots' && /^[0-9]+$/u.test(pathParts[1] ?? '')) {
      return `implementation.${PACKAGE_IMPLEMENTATION_ROLES[Number(pathParts[1])]}`;
    }
    if (pathParts[0] === 'sourceSnapshots' && /^[0-9]+$/u.test(pathParts[1] ?? '')) {
      return `source.${GATE_A_SOURCE_ROLES[Number(pathParts[1])]}`;
    }
    if (pathParts[0] === 'widthPolicySnapshots' && /^[0-9]+$/u.test(pathParts[1] ?? '')) {
      return `width.${WIDTH_POLICY_ROLES[Number(pathParts[1])]}`;
    }
    if (pathParts[0] === 'runtimeObservation') {
      if (pathParts.length < 2) return null;
      return pathParts[1] === 'nodeBinaryInput'
        ? 'runtimeObservation.nodeBinary'
        : 'runtimeObservation';
    }
    return null;
  };

  const descendantRoles = (pathParts) => providedEntries
    .map((entry) => entry.role)
    .filter((role) => {
      if (pathParts.length === 0) {
        return ['job', 'runtimeObservation'].includes(role);
      }
      if (pathParts[0] === 'gateA' && pathParts.length === 1) {
        return role.startsWith('gateA.');
      }
      if (pathParts[0] === 'implementationSnapshots' && pathParts.length === 1) {
        return role.startsWith('implementation.');
      }
      if (pathParts[0] === 'sourceSnapshots' && pathParts.length === 1) {
        return role.startsWith('source.');
      }
      if (pathParts[0] === 'widthPolicySnapshots' && pathParts.length === 1) {
        return role.startsWith('width.');
      }
      if (pathParts[0] === 'runtimeObservation' && pathParts.length === 1) {
        return role.startsWith('runtimeObservation');
      }
      const direct = roleForPath(pathParts);
      return direct === role;
    });

  const cache = new WeakMap();
  const wrap = (target, pathParts = []) => {
    if (Buffer.isBuffer(target) || target === null || typeof target !== 'object') return target;
    if (cache.has(target)) return cache.get(target);
    const proxy = new Proxy(target, {
      get(current, property, receiver) {
        const childPath = [...pathParts, String(property)];
        const role = roleForPath(childPath);
        if (role !== null) record([role]);
        const result = Reflect.get(current, property, receiver);
        return wrap(result, childPath);
      },
      has(current, property) {
        const childPath = [...pathParts, String(property)];
        const role = roleForPath(childPath);
        if (role !== null) record([role]);
        return Reflect.has(current, property);
      },
      ownKeys(current) {
        record(descendantRoles(pathParts));
        return Reflect.ownKeys(current);
      },
      getOwnPropertyDescriptor(current, property) {
        const childPath = [...pathParts, String(property)];
        const role = roleForPath(childPath);
        if (role !== null) record([role]);
        return Reflect.getOwnPropertyDescriptor(current, property);
      },
      set() {
        throw new TypeError('package builder context is read-only');
      },
      defineProperty() {
        throw new TypeError('package builder context is read-only');
      },
      deleteProperty() {
        throw new TypeError('package builder context is read-only');
      },
      setPrototypeOf() {
        throw new TypeError('package builder context is read-only');
      },
      preventExtensions() {
        throw new TypeError('package builder context is read-only');
      },
    });
    cache.set(target, proxy);
    return proxy;
  };

  return {
    proxy: wrap(context),
    value: {passOrdinal, providedEntries, accessedEntries},
  };
};

const createProductionBuilderAdapter = () => Object.freeze({
  buildGateAEvidence: buildPresentationSegmenterBoundaryEvidenceV001,
  buildEmbeddedGateAReport:
    buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001,
  buildPackage: buildPresentationCaptionSemanticSourcePackageV001,
});

const validBuilderAdapter = (value) => hasExactKeys(value, [
  'buildGateAEvidence',
  'buildEmbeddedGateAReport',
  'buildPackage',
]) && Object.values(value).every((entry) => typeof entry === 'function');

const readBindingObservations = async (
  bindings,
  workspaceRoot,
  filesystemAdapter,
) => {
  const observations = [];
  for (const binding of bindings) {
    observations.push(await readStableWorkspaceObservation(
      binding.role,
      binding.path,
      workspaceRoot,
      filesystemAdapter,
    ));
  }
  return observations;
};

const bindingsFromGateAJob = (gateAJobValue) => {
  const implementationFiles = gateAJobValue?.implementationBinding?.files;
  const sourceInputs = gateAJobValue?.inputs;
  if (!isDenseArray(implementationFiles)
    || !isDenseArray(sourceInputs)
    || implementationFiles.length !== GATE_A_IMPLEMENTATION_ROLES.length
    || sourceInputs.length !== GATE_A_SOURCE_ROLES.length) {
    return null;
  }
  return {
    implementationFiles: implementationFiles.map((binding, index) => ({
      role: GATE_A_IMPLEMENTATION_ROLES[index],
      path: binding?.path,
    })),
    sourceInputs: sourceInputs.map((binding, index) => ({
      role: GATE_A_SOURCE_ROLES[index],
      path: binding?.path,
    })),
  };
};

const initialNonJobDescriptors = ({
  jobValue,
  gateAJobValue,
}) => {
  const gateABindings = bindingsFromGateAJob(gateAJobValue);
  if (gateABindings === null) return null;
  return [
    {role: 'gateAJob', path: jobValue.gateA.job.path},
    {role: 'gateACompletionReport', path: jobValue.gateA.completionReport.path},
    ...gateABindings.implementationFiles,
    ...gateABindings.sourceInputs,
    ...jobValue.implementationBinding.files.map((binding) => ({
      role: binding.role,
      path: binding.path,
    })),
    ...jobValue.widthPolicyBindings.map((binding) => ({
      role: binding.role,
      path: binding.path,
    })),
    {role: 'nodeBinary', path: null},
  ];
};

const rereadNonJobInputs = async (
  descriptors,
  workspaceRoot,
  filesystemAdapter,
) => {
  if (descriptors === null) return null;
  const values = [];
  for (const descriptor of descriptors) {
    const observation = descriptor.role === 'nodeBinary'
      ? await readNodeBinaryObservation(filesystemAdapter)
      : await readStableWorkspaceObservation(
        descriptor.role,
        descriptor.path,
        workspaceRoot,
        filesystemAdapter,
      );
    values.push({role: descriptor.role, observation});
  }
  return values;
};

const initialNonJobInputEntries = ({
  gateAJobInput,
  gateACompletionReportInput,
  gateAImplementationInputs,
  gateASourceInputs,
  implementationInputs,
  widthPolicyInputs,
  runtimeObservation,
}) => [
  {role: 'gateAJob', observation: gateAJobInput},
  {role: 'gateACompletionReport', observation: gateACompletionReportInput},
  ...gateAImplementationInputs.map((observation) => ({
    role: observation.role,
    observation,
  })),
  ...gateASourceInputs.map((observation) => ({
    role: observation.role,
    observation,
  })),
  ...implementationInputs.map((observation) => ({
    role: observation.role,
    observation,
  })),
  ...widthPolicyInputs.map((observation) => ({
    role: observation.role,
    observation,
  })),
  {role: 'nodeBinary', observation: runtimeObservation.nodeBinaryInput},
];

const successfulSnapshots = (observations) => observations.map((observation) => {
  if (observation.status !== 'read') throw new TypeError('stable snapshot unavailable');
  return observation.snapshot;
});

const legacyRuntimeBinding = (runtimeObservation) => {
  if (runtimeObservation.nodeBinaryInput.status !== 'read') {
    throw new TypeError('node binary snapshot unavailable');
  }
  return {
    nodeBinarySha256: runtimeObservation.nodeBinaryInput.snapshot.fileSha256,
    nodeVersion: runtimeObservation.nodeVersion,
    icuVersion: runtimeObservation.icuVersion,
    resolvedLocale: runtimeObservation.resolvedLocale,
    resolvedGranularity: runtimeObservation.resolvedGranularity,
    diagnostics: runtimeObservation.diagnostics,
  };
};

const makeEvidenceBuilderContext = (
  gateAJobValue,
  gateASourceInputs,
  runtimeObservation,
) => {
  const sourceAtoms = gateASourceInputs[0];
  if (sourceAtoms?.status !== 'read') throw new TypeError('source atoms unavailable');
  const decoded = decodePresentationCaptionB1StrictJsonV001(sourceAtoms.snapshot.bytes);
  if (decoded?.status !== 'decoded') throw new TypeError('source atoms are not strict JSON');
  return {
    artifactId: gateAJobValue.artifactId,
    sourceArtifact: decoded.value,
    sourceArtifactSnapshot: {
      path: sourceAtoms.snapshot.path,
      fileSha256: sourceAtoms.snapshot.fileSha256,
    },
    runtimeBinding: legacyRuntimeBinding(runtimeObservation),
  };
};

const makeEmbeddedDerivationContext = (state) => ({
  gateA: {
    jobValue: state.gateAJobValue,
    jobInput: state.gateAJobInput,
    implementationInputs: state.gateAImplementationInputs,
    sourceInputs: state.gateASourceInputs,
    legacyRecheck: state.legacyRecheck,
    legacyReadOnlyObservation: state.legacyReadOnlyObservation,
    evidencePasses: state.evidencePasses,
  },
  runtimeObservation: state.runtimeObservation,
});

const makePackageBuilderContext = (state) => ({
  job: {
    value: state.jobValue,
    snapshot: state.initialJobObservation.snapshot,
  },
  gateA: {
    jobValue: state.gateAJobValue,
    jobSnapshot: state.gateAJobInput.snapshot,
    completionReportSnapshot: state.gateACompletionReportInput.snapshot,
    evidenceValue: state.evidencePasses[0].value,
    evidenceBytes: state.evidencePasses[0].bytes,
    embeddedReportValue: state.embeddedReportPasses[0].value,
    embeddedReportBytes: state.embeddedReportPasses[0].bytes,
  },
  implementationSnapshots: successfulSnapshots(state.implementationInputs),
  sourceSnapshots: successfulSnapshots(state.gateASourceInputs),
  widthPolicySnapshots: successfulSnapshots(state.widthPolicyInputs),
  runtimeObservation: state.runtimeObservation,
});

const checkerContext = (state, contextPhase) => ({
  contextPhase,
  job: {
    value: state.jobValue,
    initialSnapshot: state.initialJobObservation.snapshot,
    prePublicationInput: state.jobPrePublicationInput,
    preReportInput: state.jobPreReportInput,
  },
  gateA: {
    jobValue: state.gateAJobValue,
    jobInput: state.gateAJobInput,
    completionReportInput: state.gateACompletionReportInput,
    implementationInputs: state.gateAImplementationInputs,
    sourceInputs: state.gateASourceInputs,
    legacyRecheck: state.legacyRecheck,
    legacyReadOnlyObservation: state.legacyReadOnlyObservation,
    evidencePasses: state.evidencePasses,
    embeddedReportPasses: state.embeddedReportPasses,
  },
  implementationInputs: state.implementationInputs,
  widthPolicyInputs: state.widthPolicyInputs,
  builderInvocationProvenance: {
    passes: state.builderInvocationProvenancePasses,
  },
  runtimeObservation: state.runtimeObservation,
  packageBuildPasses: state.packageBuildPasses,
  buildFailure: state.buildFailure,
  readOnlyProcessObservation: state.readOnlyProcessObservation,
  publicationProcessObservation: state.publicationProcessObservation,
  productionMode: state.jobValue.mode,
});

const invokeChecker = (state, contextPhase) => {
  let result;
  try {
    result = checkPresentationCaptionSemanticSourcePackageV001(
      checkerContext(state, contextPhase),
    );
  } catch {
    return null;
  }
  return validCheckResult(result) ? result : null;
};

const initialiseRunState = async (
  jobPath,
  jobValue,
  initialJobObservation,
  workspaceRoot,
  filesystemAdapter,
) => {
  const beforeEntries = jobValue.mode === 'read-only-preflight'
    ? await snapshotWatchedTree(
      workspaceRoot,
      filesystemAdapter,
      jobValue.readOnlyGuard.excludedPaths,
    )
    : null;

  const gateAJobInput = await readStableWorkspaceObservation(
    'gateAJob',
    jobValue.gateA.job.path,
    workspaceRoot,
    filesystemAdapter,
  );
  const gateACompletionReportInput = await readStableWorkspaceObservation(
    'gateACompletionReport',
    jobValue.gateA.completionReport.path,
    workspaceRoot,
    filesystemAdapter,
  );
  const gateAJobValue = readDecodedObservation(gateAJobInput);
  const gateABindings = bindingsFromGateAJob(gateAJobValue);
  const gateAImplementationInputs = gateABindings === null
    ? []
    : await readBindingObservations(
      gateABindings.implementationFiles,
      workspaceRoot,
      filesystemAdapter,
    );
  const gateASourceInputs = gateABindings === null
    ? []
    : await readBindingObservations(
      gateABindings.sourceInputs,
      workspaceRoot,
      filesystemAdapter,
    );

  const legacyReadOnlyInitial = await beginLegacyReadOnlyObservation(
    gateAJobValue,
    workspaceRoot,
    filesystemAdapter,
  );

  const implementationInputs = await readBindingObservations(
    jobValue.implementationBinding.files,
    workspaceRoot,
    filesystemAdapter,
  );
  const widthPolicyInputs = await readBindingObservations(
    jobValue.widthPolicyBindings,
    workspaceRoot,
    filesystemAdapter,
  );
  const runtimeObservation = await makeRuntimeObservation(filesystemAdapter);

  const legacyRecheck = gateABindings === null
    ? {
      jobInput: await readStableWorkspaceObservation(
        'gateAJob',
        jobValue.gateA.job.path,
        workspaceRoot,
        filesystemAdapter,
      ),
      implementationInputs: [],
      sourceInputs: [],
    }
    : {
      jobInput: await readStableWorkspaceObservation(
        'gateAJob',
        jobValue.gateA.job.path,
        workspaceRoot,
        filesystemAdapter,
      ),
      implementationInputs: await readBindingObservations(
        gateABindings.implementationFiles,
        workspaceRoot,
        filesystemAdapter,
      ),
      sourceInputs: await readBindingObservations(
        gateABindings.sourceInputs,
        workspaceRoot,
        filesystemAdapter,
      ),
    };
  const legacyReadOnlyObservation = await finishLegacyReadOnlyObservation(
    legacyReadOnlyInitial,
    filesystemAdapter,
  );

  const descriptors = initialNonJobDescriptors({jobValue, gateAJobValue});
  const initialInputs = descriptors === null
    ? null
    : initialNonJobInputEntries({
      gateAJobInput,
      gateACompletionReportInput,
      gateAImplementationInputs,
      gateASourceInputs,
      implementationInputs,
      widthPolicyInputs,
      runtimeObservation,
    });

  return {
    jobPath,
    jobValue,
    initialJobObservation,
    workspaceRoot,
    filesystemAdapter,
    beforeEntries,
    nonJobDescriptors: descriptors,
    initialNonJobInputs: initialInputs,
    gateAJobValue,
    gateAJobInput,
    gateACompletionReportInput,
    gateAImplementationInputs,
    gateASourceInputs,
    legacyRecheck,
    legacyReadOnlyObservation,
    implementationInputs,
    widthPolicyInputs,
    runtimeObservation,
    evidencePasses: [],
    embeddedReportPasses: [],
    packageBuildPasses: [],
    builderInvocationProvenancePasses: [],
    buildFailure: null,
    jobPrePublicationInput: null,
    jobPreReportInput: null,
    readOnlyProcessObservation: jobValue.mode === 'read-only-preflight'
      ? {mode: 'not-attempted'}
      : {mode: 'not-requested'},
    publicationProcessObservation: jobValue.mode === 'read-only-preflight'
      ? makeNotRequestedPublication()
      : makeInitialFormalPublication(),
    publicationFailureRecords: [],
  };
};

const runCoreBuildStages = (state, builderAdapter) => {
  const gateAContextResult = invokeChecker(state, 'gate-a-context-gate');
  if (gateAContextResult === null) return {status: 'untrusted'};
  if (!checkPassed(gateAContextResult, 'gateAContext')) {
    return {status: 'checked', result: gateAContextResult};
  }

  let evidenceContext;
  try {
    evidenceContext = makeEvidenceBuilderContext(
      state.gateAJobValue,
      state.gateASourceInputs,
      state.runtimeObservation,
    );
  } catch {
    return {status: 'untrusted'};
  }
  const evidenceBuild = buildTwoPasses(
    'gate-a-evidence',
    builderAdapter.buildGateAEvidence,
    () => evidenceContext,
    (builder, context) => buildJsonObjectAttempt(builder, context),
  );
  state.evidencePasses = evidenceBuild.passes;
  state.buildFailure = evidenceBuild.buildFailure;

  const evidenceResult = invokeChecker(state, 'evidence-gate');
  if (evidenceResult === null) return {status: 'untrusted'};
  if (!checkPassed(evidenceResult, 'evidenceBuild')
    || !checkPassed(evidenceResult, 'evidenceDeterminism')) {
    return {status: 'checked', result: evidenceResult};
  }

  const derived = derivePresentationCaptionEmbeddedGateAReportContextV001(
    makeEmbeddedDerivationContext(state),
  );
  if (derived?.status !== 'derived' || !isPlainObject(derived.value)) {
    return {status: 'untrusted'};
  }
  const embeddedBuild = buildTwoPasses(
    'embedded-gate-a-report',
    builderAdapter.buildEmbeddedGateAReport,
    () => derived.value,
    (builder, context) => buildJsonObjectAttempt(
      builder,
      context,
      {embeddedCanonical: true},
    ),
  );
  state.embeddedReportPasses = embeddedBuild.passes;
  state.buildFailure = embeddedBuild.buildFailure;

  const embeddedResult = invokeChecker(state, 'embedded-report-gate');
  if (embeddedResult === null) return {status: 'untrusted'};
  if (!checkPassed(embeddedResult, 'embeddedReportBuild')
    || !checkPassed(embeddedResult, 'gateAReport')) {
    return {status: 'checked', result: embeddedResult};
  }

  let packageContext;
  try {
    packageContext = makePackageBuilderContext(state);
  } catch {
    return {status: 'untrusted'};
  }
  const packageBuild = buildTwoPasses(
    'package',
    builderAdapter.buildPackage,
    () => packageContext,
    (builder, context, passOrdinal) => buildPackageAttempt(
      builder,
      context,
      (copiedContext) => makePackageProvenanceProxy(copiedContext, passOrdinal),
    ),
  );
  state.packageBuildPasses = packageBuild.passes;
  state.builderInvocationProvenancePasses = packageBuild.provenancePasses;
  state.buildFailure = packageBuild.buildFailure;

  const coreResult = invokeChecker(state, 'core-gate');
  if (coreResult === null) return {status: 'untrusted'};
  return {status: 'checked', result: coreResult};
};

const observePathPresence = async (
  role,
  repositoryPath,
  workspaceRoot,
  filesystemAdapter,
) => {
  try {
    const stats = await filesystemAdapter.lstatBigInt(
      workspaceAbsolutePath(workspaceRoot, repositoryPath),
    );
    return {
      role,
      path: repositoryPath,
      state: 'present',
      identity: {
        kind: statKind(stats),
        dev: stats.dev.toString(10),
        ino: stats.ino.toString(10),
      },
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {role, path: repositoryPath, state: 'absent', identity: null};
    }
    throw error;
  }
};

const artifactRead = async (
  fileName,
  repositoryPath,
  artifactOrdinal,
  workspaceRoot,
  filesystemAdapter,
) => {
  const absolutePath = workspaceAbsolutePath(workspaceRoot, repositoryPath);
  let pathStats;
  try {
    pathStats = await filesystemAdapter.lstatBigInt(absolutePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        fileName,
        status: 'missing',
        snapshot: null,
        observedKind: null,
        failurePoint: null,
      };
    }
    return {
      fileName,
      status: 'io-error',
      snapshot: null,
      observedKind: null,
      failurePoint: `artifact-${String(artifactOrdinal).padStart(2, '0')}-open`,
    };
  }
  const kind = statKind(pathStats);
  if (kind !== 'regular-file') {
    return {
      fileName,
      status: 'non-regular',
      snapshot: null,
      observedKind: kind === 'symlink' ? 'symlink' : kind,
      failurePoint: null,
    };
  }
  try {
    const observation = await readStableWorkspaceObservation(
      `artifact-${String(artifactOrdinal).padStart(2, '0')}`,
      repositoryPath,
      workspaceRoot,
      filesystemAdapter,
    );
    if (observation.status === 'read') {
      return {
        fileName,
        status: 'read',
        snapshot: observation.snapshot,
        observedKind: 'regular-file',
        failurePoint: null,
      };
    }
    const unsafeResolution = observation.pathResolutionObservation;
    const onlyHardlinkIsUnsafe = observation.status === 'observed-unsafe'
      && observation.pathLstatBeforeOpen?.kind === 'regular-file'
      && unsafeResolution?.workspaceRootRealPath === workspaceRoot
      && unsafeResolution?.targetRealPath === absolutePath
      && unsafeResolution.ancestors.every((entry) => (
        entry.lstatKind === 'directory'
        && entry.realPath === (
          entry.workspaceRelativePath === ''
            ? workspaceRoot
            : workspaceAbsolutePath(workspaceRoot, entry.workspaceRelativePath)
        )
      ));
    if (onlyHardlinkIsUnsafe) {
      let handle;
      let closeAttempted = false;
      try {
        handle = await filesystemAdapter.openReadOnly(absolutePath);
        const fdStatAfterOpen = statObservation(await handle.statBigInt());
        const bytes = Buffer.from(await handle.readAllBytes());
        const fdStatAfterRead = statObservation(await handle.statBigInt());
        closeAttempted = true;
        await handle.close();
        handle = null;
        return {
          fileName,
          status: 'read',
          snapshot: {
            path: repositoryPath,
            bytes,
            fileSha256: sha256Bytes(bytes),
            pathLstatBeforeOpen: observation.pathLstatBeforeOpen,
            fdStatAfterOpen,
            fdStatAfterRead,
            pathResolutionObservation: observation.pathResolutionObservation,
          },
          observedKind: 'regular-file',
          failurePoint: null,
        };
      } finally {
        if (handle !== undefined && handle !== null && !closeAttempted) {
          await handle.close();
        }
      }
    }
    return {
      fileName,
      status: 'non-regular',
      snapshot: null,
      observedKind: kind === 'directory' || kind === 'symlink' ? kind : 'other',
      failurePoint: null,
    };
  } catch {
    return {
      fileName,
      status: 'io-error',
      snapshot: null,
      observedKind: null,
      failurePoint: `artifact-${String(artifactOrdinal).padStart(2, '0')}-read`,
    };
  }
};

const observeArtifactDirectory = async (
  repositoryRoot,
  stage,
  workspaceRoot,
  filesystemAdapter,
) => {
  const absoluteRoot = workspaceAbsolutePath(workspaceRoot, repositoryRoot);
  let directoryEntries;
  try {
    directoryEntries = (await filesystemAdapter.readdirWithTypes(absoluteRoot))
      .map((entry) => ({name: entry.name, kind: directoryEntryKind(entry)}))
      .sort((left, right) => compareUtf16(left.name, right.name));
  } catch {
    return {
      status: 'io-error',
      directoryEntries: null,
      artifactReads: null,
      failurePoint: stage === 'staging' ? 'staging-read' : 'published-read',
    };
  }
  const artifactReads = [];
  for (let index = 0; index < PACKAGE_FILE_NAMES.length; index += 1) {
    artifactReads.push(await artifactRead(
      PACKAGE_FILE_NAMES[index],
      `${repositoryRoot}/${PACKAGE_FILE_NAMES[index]}`,
      index + 1,
      workspaceRoot,
      filesystemAdapter,
    ));
  }
  return {
    status: 'observed',
    directoryEntries,
    artifactReads,
    failurePoint: null,
  };
};

const safeReleaseLock = async (state, lockPath) => {
  const publication = state.publicationProcessObservation;
  const held = publication.lock.identityAfterCreate;
  if (held === null || held.kind !== 'directory') return;
  if ([
    'pre-rename-stat-io-error',
    'pre-rename-identity-mismatch',
  ].includes(publication.lock.state)) return;
  let currentStats;
  try {
    currentStats = await state.filesystemAdapter.lstatBigInt(
      workspaceAbsolutePath(state.workspaceRoot, lockPath),
    );
  } catch {
    publication.lock = {
      state: 'pre-release-stat-io-error',
      identityAfterCreate: held,
      identityAtLastOwnershipCheck: null,
      failurePoint: 'lock-stat-before-release',
    };
    state.publicationFailureRecords.push({
      path: '$.publication.lock.failurePoint',
      failurePoint: 'lock-stat-before-release',
    });
    return;
  }
  const current = identityObservation(currentStats);
  if (current.kind !== held.kind || current.dev !== held.dev || current.ino !== held.ino) {
    publication.lock = {
      state: 'identity-mismatch',
      identityAfterCreate: held,
      identityAtLastOwnershipCheck: current,
      failurePoint: null,
    };
    return;
  }
  try {
    await state.filesystemAdapter.removeEmptyDirectory(
      workspaceAbsolutePath(state.workspaceRoot, lockPath),
    );
    publication.lock = {
      state: 'released',
      identityAfterCreate: held,
      identityAtLastOwnershipCheck: current,
      failurePoint: null,
    };
  } catch {
    publication.lock = {
      state: 'release-io-error',
      identityAfterCreate: held,
      identityAtLastOwnershipCheck: current,
      failurePoint: 'lock-release',
    };
    state.publicationFailureRecords.push({
      path: '$.publication.lock.failurePoint',
      failurePoint: 'lock-release',
    });
  }
};

const checkStatus = (result, name) =>
  result?.checks?.find((entry) => entry?.name === name)?.status ?? null;

const publicationPhaseMayContinue = (result) =>
  validCheckResult(result)
  && PACKAGE_CHECK_NAMES.every((name) => checkPassed(result, name))
  && checkPassed(result, 'jobPrePublication')
  && checkStatus(result, 'publication') === 'not_evaluated_in_phase';

const recordPublicationIoFailure = (state, pathValue, failurePoint) => {
  state.publicationFailureRecords.push({path: pathValue, failurePoint});
};

const callPublicationPhase = (state, phase) => {
  const result = invokeChecker(state, phase);
  return result === null ? null : {
    result,
    mayContinue: publicationPhaseMayContinue(result),
  };
};

const writePackageArtifacts = async (
  state,
  workPath,
) => {
  const publication = state.publicationProcessObservation;
  const artifacts = state.packageBuildPasses[0].artifacts;
  try {
    await state.filesystemAdapter.mkdir(
      workspaceAbsolutePath(state.workspaceRoot, workPath),
    );
  } catch {
    publication.staging = {
      status: 'io-error',
      directoryEntries: null,
      artifactReads: null,
      failurePoint: 'work-create',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.staging.failurePoint',
      'work-create',
    );
    return false;
  }

  for (let index = 0; index < PACKAGE_FILE_NAMES.length; index += 1) {
    const artifact = artifacts[index];
    const ordinal = String(index + 1).padStart(2, '0');
    const absolutePath = workspaceAbsolutePath(
      state.workspaceRoot,
      `${workPath}/${PACKAGE_FILE_NAMES[index]}`,
    );
    let handle;
    let failurePoint = null;
    try {
      handle = await state.filesystemAdapter.openWriteExclusive(absolutePath);
    } catch {
      failurePoint = `artifact-${ordinal}-open`;
    }
    if (failurePoint === null) {
      try {
        await handle.writeAllBytes(artifact.bytes);
      } catch {
        failurePoint = `artifact-${ordinal}-write`;
      }
    }
    if (failurePoint === null) {
      try {
        await handle.sync();
      } catch {
        failurePoint = `artifact-${ordinal}-sync`;
      }
    }
    if (failurePoint === null) {
      try {
        await handle.statBigInt();
      } catch {
        failurePoint = `artifact-${ordinal}-stat`;
      }
    }
    if (handle !== undefined) {
      try {
        await handle.close();
        handle = undefined;
      } catch {
        if (failurePoint === null) failurePoint = `artifact-${ordinal}-close`;
      }
    }
    if (failurePoint !== null) {
      publication.staging = {
        status: 'io-error',
        directoryEntries: null,
        artifactReads: null,
        failurePoint,
      };
      recordPublicationIoFailure(
        state,
        '$.publication.staging.failurePoint',
        failurePoint,
      );
      return false;
    }
  }

  let directoryHandle;
  let failurePoint = null;
  try {
    directoryHandle = await state.filesystemAdapter.openDirectoryReadOnly(
      workspaceAbsolutePath(state.workspaceRoot, workPath),
    );
  } catch {
    failurePoint = 'work-directory-open';
  }
  if (failurePoint === null) {
    try {
      await directoryHandle.sync();
    } catch {
      failurePoint = 'work-directory-sync';
    }
  }
  if (failurePoint === null) {
    try {
      await directoryHandle.statBigInt();
    } catch {
      failurePoint = 'work-directory-stat';
    }
  }
  if (directoryHandle !== undefined) {
    try {
      await directoryHandle.close();
      directoryHandle = undefined;
    } catch {
      if (failurePoint === null) failurePoint = 'work-directory-close';
    }
  }
  if (failurePoint !== null) {
    publication.staging = {
      status: 'io-error',
      directoryEntries: null,
      artifactReads: null,
      failurePoint,
    };
    recordPublicationIoFailure(
      state,
      '$.publication.staging.failurePoint',
      failurePoint,
    );
    return false;
  }
  publication.staging = await observeArtifactDirectory(
    workPath,
    'staging',
    state.workspaceRoot,
    state.filesystemAdapter,
  );
  if (publication.staging.status === 'io-error') {
    recordPublicationIoFailure(
      state,
      '$.publication.staging.failurePoint',
      publication.staging.failurePoint,
    );
    return false;
  }
  for (let index = 0; index < publication.staging.artifactReads.length; index += 1) {
    const read = publication.staging.artifactReads[index];
    if (read.status === 'io-error') {
      recordPublicationIoFailure(
        state,
        `$.publication.staging.artifactReads[${index}].failurePoint`,
        read.failurePoint,
      );
    }
  }
  return true;
};

const runFormalPublication = async (state, coreResult) => {
  const publication = state.publicationProcessObservation;
  if (!allCoreChecksPassed(coreResult)) return {status: 'completed'};

  state.jobPrePublicationInput = await readStableWorkspaceObservation(
    'job',
    state.jobPath,
    state.workspaceRoot,
    state.filesystemAdapter,
  );
  const publicationGate = invokeChecker(state, 'publication-gate');
  if (publicationGate === null) return {status: 'untrusted'};
  if (!checkPassed(publicationGate, 'jobPrePublication')) {
    return {status: 'completed'};
  }

  const formalRoot = state.jobValue.publication.formalOutputPath;
  const lockPath = `${formalRoot}.lock`;
  const workPath = `${formalRoot}.work`;
  try {
    publication.initialPaths = {
      status: 'observed',
      entries: [
        await observePathPresence(
          'formalRoot',
          formalRoot,
          state.workspaceRoot,
          state.filesystemAdapter,
        ),
        await observePathPresence(
          'lockPath',
          lockPath,
          state.workspaceRoot,
          state.filesystemAdapter,
        ),
        await observePathPresence(
          'workPath',
          workPath,
          state.workspaceRoot,
          state.filesystemAdapter,
        ),
      ],
      failurePoint: null,
    };
  } catch {
    publication.initialPaths = {
      status: 'io-error',
      entries: null,
      failurePoint: 'initial-paths',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.initialPaths.failurePoint',
      'initial-paths',
    );
  }
  if (publication.initialPaths.status === 'observed'
    && publication.initialPaths.entries.some((entry) => entry.state === 'present')) {
    const stopped = callPublicationPhase(state, 'publication-staging-gate');
    return stopped === null ? {status: 'untrusted'} : {status: 'completed'};
  }
  if (publication.initialPaths.status === 'io-error') {
    const stopped = callPublicationPhase(state, 'publication-staging-gate');
    return stopped === null ? {status: 'untrusted'} : {status: 'completed'};
  }

  try {
    await state.filesystemAdapter.mkdirExclusive(
      workspaceAbsolutePath(state.workspaceRoot, lockPath),
    );
  } catch (error) {
    publication.lock = error?.code === 'EEXIST'
      ? {
        state: 'create-exists',
        identityAfterCreate: null,
        identityAtLastOwnershipCheck: null,
        failurePoint: null,
      }
      : {
        state: 'create-io-error',
        identityAfterCreate: null,
        identityAtLastOwnershipCheck: null,
        failurePoint: 'lock-create',
      };
    if (error?.code !== 'EEXIST') {
      recordPublicationIoFailure(
        state,
        '$.publication.lock.failurePoint',
        'lock-create',
      );
    }
    const stopped = callPublicationPhase(state, 'publication-staging-gate');
    return stopped === null ? {status: 'untrusted'} : {status: 'completed'};
  }

  let lockStats;
  try {
    lockStats = await state.filesystemAdapter.lstatBigInt(
      workspaceAbsolutePath(state.workspaceRoot, lockPath),
    );
  } catch {
    publication.lock = {
      state: 'post-create-stat-io-error',
      identityAfterCreate: null,
      identityAtLastOwnershipCheck: null,
      failurePoint: 'lock-stat-after-create',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.lock.failurePoint',
      'lock-stat-after-create',
    );
    const stopped = callPublicationPhase(state, 'publication-staging-gate');
    return stopped === null ? {status: 'untrusted'} : {status: 'completed'};
  }
  const lockIdentity = identityObservation(lockStats);
  if (lockIdentity.kind !== 'directory') {
    publication.lock = {
      state: 'post-create-identity-invalid',
      identityAfterCreate: lockIdentity,
      identityAtLastOwnershipCheck: null,
      failurePoint: null,
    };
    const stopped = callPublicationPhase(state, 'publication-staging-gate');
    return stopped === null ? {status: 'untrusted'} : {status: 'completed'};
  }
  publication.lock = {
    state: 'held',
    identityAfterCreate: lockIdentity,
    identityAtLastOwnershipCheck: null,
    failurePoint: null,
  };

  await writePackageArtifacts(state, workPath);
  const stagingGate = callPublicationPhase(state, 'publication-staging-gate');
  if (stagingGate === null) return {status: 'untrusted'};
  if (!stagingGate.mayContinue) {
    await safeReleaseLock(state, lockPath);
    return {status: 'completed'};
  }

  try {
    const observations = await rereadNonJobInputs(
      state.nonJobDescriptors,
      state.workspaceRoot,
      state.filesystemAdapter,
    );
    if (observations === null) throw new TypeError('input recheck unavailable');
    publication.inputRecheck = {
      status: 'observed',
      observations,
      failurePoint: null,
    };
  } catch {
    publication.inputRecheck = {
      status: 'io-error',
      observations: null,
      failurePoint: 'input-recheck',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.inputRecheck.failurePoint',
      'input-recheck',
    );
  }
  const inputGate = callPublicationPhase(state, 'publication-input-gate');
  if (inputGate === null) return {status: 'untrusted'};
  if (!inputGate.mayContinue) {
    await safeReleaseLock(state, lockPath);
    return {status: 'completed'};
  }

  let preRenameLockStats;
  try {
    preRenameLockStats = await state.filesystemAdapter.lstatBigInt(
      workspaceAbsolutePath(state.workspaceRoot, lockPath),
    );
  } catch {
    publication.lock = {
      state: 'pre-rename-stat-io-error',
      identityAfterCreate: lockIdentity,
      identityAtLastOwnershipCheck: null,
      failurePoint: 'pre-rename-lock-stat',
    };
    publication.preRename = {
      state: 'io-error',
      lockIdentity: null,
      formalRoot: null,
      sourceParentIdentity: null,
      targetParentIdentity: null,
      failurePoint: 'pre-rename-lock-stat',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.preRename.failurePoint',
      'pre-rename-lock-stat',
    );
    const stopped = callPublicationPhase(state, 'publication-pre-rename-gate');
    return stopped === null ? {status: 'untrusted'} : {status: 'completed'};
  }
  const preRenameLockIdentity = identityObservation(preRenameLockStats);
  if (preRenameLockIdentity.kind !== lockIdentity.kind
    || preRenameLockIdentity.dev !== lockIdentity.dev
    || preRenameLockIdentity.ino !== lockIdentity.ino) {
    publication.lock = {
      state: 'pre-rename-identity-mismatch',
      identityAfterCreate: lockIdentity,
      identityAtLastOwnershipCheck: preRenameLockIdentity,
      failurePoint: null,
    };
    publication.preRename = {
      state: 'lock-observed',
      lockIdentity: preRenameLockIdentity,
      formalRoot: null,
      sourceParentIdentity: null,
      targetParentIdentity: null,
      failurePoint: null,
    };
    const stopped = callPublicationPhase(state, 'publication-pre-rename-gate');
    return stopped === null ? {status: 'untrusted'} : {status: 'completed'};
  }

  let formalRootObservation;
  try {
    formalRootObservation = await observePathPresence(
      'formalRoot',
      formalRoot,
      state.workspaceRoot,
      state.filesystemAdapter,
    );
  } catch {
    publication.preRename = {
      state: 'io-error',
      lockIdentity: preRenameLockIdentity,
      formalRoot: null,
      sourceParentIdentity: null,
      targetParentIdentity: null,
      failurePoint: 'pre-rename-root-check',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.preRename.failurePoint',
      'pre-rename-root-check',
    );
    const stopped = callPublicationPhase(state, 'publication-pre-rename-gate');
    if (stopped === null) return {status: 'untrusted'};
    await safeReleaseLock(state, lockPath);
    return {status: 'completed'};
  }
  const formalRootState = {
    state: formalRootObservation.state,
    identity: formalRootObservation.identity === null
      ? null
      : {
        kind: formalRootObservation.identity.kind === 'regular-file'
          ? 'other'
          : formalRootObservation.identity.kind,
        dev: formalRootObservation.identity.dev,
        ino: formalRootObservation.identity.ino,
      },
  };
  if (formalRootState.state === 'present') {
    publication.preRename = {
      state: 'root-observed',
      lockIdentity: preRenameLockIdentity,
      formalRoot: formalRootState,
      sourceParentIdentity: null,
      targetParentIdentity: null,
      failurePoint: null,
    };
    const stopped = callPublicationPhase(state, 'publication-pre-rename-gate');
    if (stopped === null) return {status: 'untrusted'};
    await safeReleaseLock(state, lockPath);
    return {status: 'completed'};
  }

  const workParent = toPosix(dirname(workPath));
  const targetParent = toPosix(dirname(formalRoot));
  let sourceParentStats;
  try {
    sourceParentStats = await state.filesystemAdapter.lstatBigInt(
      workspaceAbsolutePath(state.workspaceRoot, workParent),
    );
  } catch {
    publication.preRename = {
      state: 'io-error',
      lockIdentity: preRenameLockIdentity,
      formalRoot: formalRootState,
      sourceParentIdentity: null,
      targetParentIdentity: null,
      failurePoint: 'pre-rename-source-parent-stat',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.preRename.failurePoint',
      'pre-rename-source-parent-stat',
    );
    const stopped = callPublicationPhase(state, 'publication-pre-rename-gate');
    if (stopped === null) return {status: 'untrusted'};
    await safeReleaseLock(state, lockPath);
    return {status: 'completed'};
  }
  const sourceParentIdentity = identityObservation(sourceParentStats);
  let targetParentStats;
  try {
    targetParentStats = await state.filesystemAdapter.lstatBigInt(
      workspaceAbsolutePath(state.workspaceRoot, targetParent),
    );
  } catch {
    publication.preRename = {
      state: 'io-error',
      lockIdentity: preRenameLockIdentity,
      formalRoot: formalRootState,
      sourceParentIdentity,
      targetParentIdentity: null,
      failurePoint: 'pre-rename-target-parent-stat',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.preRename.failurePoint',
      'pre-rename-target-parent-stat',
    );
    const stopped = callPublicationPhase(state, 'publication-pre-rename-gate');
    if (stopped === null) return {status: 'untrusted'};
    await safeReleaseLock(state, lockPath);
    return {status: 'completed'};
  }
  const targetParentIdentity = identityObservation(targetParentStats);
  publication.preRename = {
    state: 'parents-observed',
    lockIdentity: preRenameLockIdentity,
    formalRoot: formalRootState,
    sourceParentIdentity,
    targetParentIdentity,
    failurePoint: null,
  };
  publication.lock = {
    state: 'pre-rename-owned',
    identityAfterCreate: lockIdentity,
    identityAtLastOwnershipCheck: preRenameLockIdentity,
    failurePoint: null,
  };
  const preRenameGate = callPublicationPhase(state, 'publication-pre-rename-gate');
  if (preRenameGate === null) return {status: 'untrusted'};
  if (!preRenameGate.mayContinue) {
    await safeReleaseLock(state, lockPath);
    return {status: 'completed'};
  }

  try {
    await state.filesystemAdapter.rename(
      workspaceAbsolutePath(state.workspaceRoot, workPath),
      workspaceAbsolutePath(state.workspaceRoot, formalRoot),
    );
    publication.rename = {status: 'succeeded', failurePoint: null};
  } catch {
    publication.rename = {status: 'io-error', failurePoint: 'rename'};
    recordPublicationIoFailure(state, '$.publication.rename.failurePoint', 'rename');
    await safeReleaseLock(state, lockPath);
    return {status: 'completed'};
  }

  const parentAbsolutePath = workspaceAbsolutePath(state.workspaceRoot, targetParent);
  let directoryHandle;
  try {
    directoryHandle = await state.filesystemAdapter.openDirectoryReadOnly(parentAbsolutePath);
    publication.parentDirectoryDurability.open = {
      status: 'succeeded',
      failurePoint: null,
    };
  } catch {
    publication.parentDirectoryDurability.open = {
      status: 'io-error',
      failurePoint: 'parent-directory-open',
    };
    recordPublicationIoFailure(
      state,
      '$.publication.parentDirectoryDurability.open.failurePoint',
      'parent-directory-open',
    );
  }
  if (directoryHandle !== undefined) {
    try {
      await directoryHandle.sync();
      publication.parentDirectoryDurability.sync = {
        status: 'succeeded',
        failurePoint: null,
      };
    } catch {
      publication.parentDirectoryDurability.sync = {
        status: 'io-error',
        failurePoint: 'parent-directory-sync',
      };
      recordPublicationIoFailure(
        state,
        '$.publication.parentDirectoryDurability.sync.failurePoint',
        'parent-directory-sync',
      );
    }
    if (publication.parentDirectoryDurability.sync.status === 'succeeded') {
      try {
        publication.parentDirectoryDurability.stat = {
          status: 'succeeded',
          identity: identityObservation(await directoryHandle.statBigInt()),
          failurePoint: null,
        };
      } catch {
        publication.parentDirectoryDurability.stat = {
          status: 'io-error',
          identity: null,
          failurePoint: 'parent-directory-stat',
        };
        recordPublicationIoFailure(
          state,
          '$.publication.parentDirectoryDurability.stat.failurePoint',
          'parent-directory-stat',
        );
      }
    }
    try {
      await directoryHandle.close();
      directoryHandle = undefined;
      publication.parentDirectoryDurability.close = {
        status: 'succeeded',
        failurePoint: null,
      };
    } catch {
      publication.parentDirectoryDurability.close = {
        status: 'io-error',
        failurePoint: 'parent-directory-close',
      };
      recordPublicationIoFailure(
        state,
        '$.publication.parentDirectoryDurability.close.failurePoint',
        'parent-directory-close',
      );
    }
  }

  const durability = publication.parentDirectoryDurability;
  if (durability.open.status === 'succeeded'
    && durability.sync.status === 'succeeded'
    && durability.stat.status === 'succeeded'
    && durability.close.status === 'succeeded') {
    publication.published = await observeArtifactDirectory(
      formalRoot,
      'published',
      state.workspaceRoot,
      state.filesystemAdapter,
    );
    if (publication.published.status === 'io-error') {
      recordPublicationIoFailure(
        state,
        '$.publication.published.failurePoint',
        publication.published.failurePoint,
      );
    } else {
      for (let index = 0; index < publication.published.artifactReads.length; index += 1) {
        const read = publication.published.artifactReads[index];
        if (read.status === 'io-error') {
          recordPublicationIoFailure(
            state,
            `$.publication.published.artifactReads[${index}].failurePoint`,
            read.failurePoint,
          );
        }
      }
    }
  }
  await safeReleaseLock(state, lockPath);
  return {status: 'completed'};
};

const packageArtifact = (state, fileName) =>
  state.packageBuildPasses[0]?.artifacts?.find((artifact) => artifact.fileName === fileName)
  ?? null;

const candidatePackageSummary = (state, finalCheck) => {
  const base = {
    packageId: state.jobValue.publication.packageId,
    formalOutputPath: state.jobValue.publication.formalOutputPath,
    manifestFileSha256: null,
    validationReportFileSha256: null,
    contentSetCanonicalSha256: null,
  };
  if (!allCoreChecksPassed(finalCheck)) return base;
  const manifest = packageArtifact(state, 'package-manifest.json');
  const report = packageArtifact(state, 'package-validation-report.json');
  if (manifest === null || report === null) return base;
  return {
    packageId: base.packageId,
    formalOutputPath: base.formalOutputPath,
    manifestFileSha256: manifest.fileSha256,
    validationReportFileSha256: report.fileSha256,
    contentSetCanonicalSha256: manifest.value.contentSetCanonicalSha256,
  };
};

const readOnlySummary = (state, finalCheck) => {
  if (state.jobValue.mode !== 'read-only-preflight') return null;
  const observation = state.readOnlyProcessObservation;
  const beforeCanonicalSha256 = canonicalSha256(observation.beforeEntries);
  const afterCanonicalSha256 = canonicalSha256(observation.afterEntries);
  if (observation.inputReread.status !== 'completed') {
    return {
      status: 'not-run-with-upstream-failure',
      beforeCanonicalSha256,
      afterCanonicalSha256,
      unchanged: null,
    };
  }
  return {
    status: 'verified',
    beforeCanonicalSha256,
    afterCanonicalSha256,
    unchanged: checkPassed(finalCheck, 'readOnlyPreflight'),
  };
};

const observedArtifactHashes = (directoryObservation) => {
  if (directoryObservation?.status !== 'observed') return null;
  const reads = directoryObservation.artifactReads;
  if (!isDenseArray(reads)
    || reads.length !== PACKAGE_FILE_NAMES.length
    || reads.some((entry) => entry.status !== 'read')) return null;
  const projected = [];
  for (const entry of reads) {
    const decoded = decodePresentationCaptionB1StrictJsonV001(entry.snapshot.bytes);
    if (decoded?.status !== 'decoded') return null;
    const canonicalSha = canonicalSha256(decoded.value);
    if (canonicalSha === null) return null;
    projected.push({
      fileName: entry.fileName,
      fileSha256: entry.snapshot.fileSha256,
      canonicalSha256: canonicalSha,
    });
  }
  return projected;
};

const publicationSummary = (state, finalCheck) => {
  if (state.jobValue.mode !== 'formal-generation') return null;
  const publication = state.publicationProcessObservation;
  const publishedProjection = observedArtifactHashes(publication.published);
  if (publishedProjection !== null && checkPassed(finalCheck, 'publishedPackage')) {
    return {
      state: 'published_validated',
      publishedRoot: state.jobValue.publication.formalOutputPath,
      manifestFileSha256: publishedProjection[5].fileSha256,
      validationReportFileSha256: publishedProjection[6].fileSha256,
      observedFileSetCanonicalSha256: canonicalSha256(publishedProjection),
    };
  }

  const stagingProjection = observedArtifactHashes(publication.staging);
  const stagingInvalid = finalCheck.violations.some((violation) => (
    ['PUBLICATION_STAGING_INVALID', 'PUBLICATION_INPUT_CHANGED'].includes(violation.code)
    || (violation.code === 'PUBLICATION_FAILED'
      && (violation.path.startsWith('$.publication.staging')
        || violation.path.startsWith('$.publication.inputRecheck')))
  ));
  if (stagingProjection !== null
    && publication.inputRecheck.status === 'observed'
    && !stagingInvalid) {
    return {
      state: 'staging_validated',
      publishedRoot: state.jobValue.publication.formalOutputPath,
      manifestFileSha256: stagingProjection[5].fileSha256,
      validationReportFileSha256: stagingProjection[6].fileSha256,
      observedFileSetCanonicalSha256: null,
    };
  }
  return {
    state: 'not_started',
    publishedRoot: state.jobValue.publication.formalOutputPath,
    manifestFileSha256: null,
    validationReportFileSha256: null,
    observedFileSetCanonicalSha256: null,
  };
};

const publicationFailureSummary = (state, finalCheck) => {
  if (state.jobValue.mode !== 'formal-generation') return [];
  const expectedPaths = new Set(finalCheck.violations
    .filter((violation) => violation.code === 'PUBLICATION_FAILED')
    .map((violation) => violation.path));
  return state.publicationFailureRecords
    .filter((entry) => expectedPaths.has(entry.path))
    .map((entry) => ({path: entry.path, failurePoint: entry.failurePoint}));
};

const buildRunReport = (state, finalCheck) => {
  const failedCheck = finalCheck.checks.find((check) => check.status === 'failed');
  const status = failedCheck === undefined ? 'passed' : 'failed';
  return {
    schemaVersion: 'presentation-caption-semantic-source-package-run-report-v001',
    mode: state.jobValue.mode,
    status,
    failureStage: failedCheck?.name ?? null,
    jobBinding: {
      path: state.initialJobObservation.snapshot.path,
      fileSha256: state.initialJobObservation.snapshot.fileSha256,
    },
    candidatePackage: candidatePackageSummary(state, finalCheck),
    checks: finalCheck.checks,
    violations: finalCheck.violations,
    readOnlyObservation: readOnlySummary(state, finalCheck),
    publicationObservation: publicationSummary(state, finalCheck),
    publicationFailures: publicationFailureSummary(state, finalCheck),
    scope: {
      validatedState: state.jobValue.mode === 'read-only-preflight'
        ? 'read-only-candidate-package'
        : 'published-source-package',
      semanticQualityVerified: false,
      naturalBreakQualityVerified: false,
      nonCooperativePublicationRaceProtected: false,
    },
  };
};

const finishReadOnlyProcessObservation = async (state) => {
  const afterEntries = await snapshotWatchedTree(
    state.workspaceRoot,
    state.filesystemAdapter,
    state.jobValue.readOnlyGuard.excludedPaths,
  );
  const finalInputs = await rereadNonJobInputs(
    state.nonJobDescriptors,
    state.workspaceRoot,
    state.filesystemAdapter,
  );
  state.readOnlyProcessObservation = {
    mode: 'observed',
    beforeEntries: state.beforeEntries,
    afterEntries,
    inputReread: finalInputs === null || state.initialNonJobInputs === null
      ? {
        status: 'not-run-with-upstream-failure',
        initialInputs: null,
        finalInputs: null,
      }
      : {
        status: 'completed',
        initialInputs: state.initialNonJobInputs,
        finalInputs,
      },
    attemptedWriteCalls: [],
  };
};

const finishTrustedRun = async (state) => {
  if (state.jobValue.mode === 'read-only-preflight') {
    await finishReadOnlyProcessObservation(state);
  }
  state.jobPreReportInput = await readStableWorkspaceObservation(
    'job',
    state.jobPath,
    state.workspaceRoot,
    state.filesystemAdapter,
  );
  const finalCheckerContext = checkerContext(state, 'final-report');
  let finalCheck;
  try {
    finalCheck = checkPresentationCaptionSemanticSourcePackageV001(finalCheckerContext);
  } catch {
    return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
  }
  if (!validCheckResult(finalCheck)) {
    return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
  }
  const report = buildRunReport(state, finalCheck);
  const reportBytes = coreSerialize(report);
  if (reportBytes === null) {
    return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
  }
  const expectedExitCode = report.status === 'passed' ? 0 : 1;
  let validation;
  try {
    validation = validatePresentationCaptionSemanticSourcePackageRunReportV001({
      report,
      reportBytes,
      expectedExitCode,
      checkerContext: finalCheckerContext,
    });
  } catch {
    return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
  }
  if (validation?.valid !== true) {
    return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
  }
  return {
    kind: 'trusted-report',
    exitCode: expectedExitCode,
    report,
    reportBytes,
  };
};

export async function runPresentationCaptionSemanticSourcePackageV001(
  jobPath,
  options,
) {
  try {
    const filesystemAdapter = options?.filesystemAdapter;
    const builderAdapter = options?.builderAdapter;
    if (typeof jobPath !== 'string'
      || !hasExactKeys(options, ['filesystemAdapter', 'builderAdapter'])
      || !validAdapter(filesystemAdapter, PACKAGE_ADAPTER_FIELDS)
      || !validBuilderAdapter(builderAdapter)) {
      return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
    }
    const workspaceRoot = await filesystemAdapter.realpath(LEXICAL_WORKSPACE_ROOT);
    if (!isAbsolute(workspaceRoot)
      || await filesystemAdapter.realpath(RUNNER_PATH)
        !== workspaceAbsolutePath(workspaceRoot, EXPECTED_RUNNER_REPOSITORY_PATH)) {
      return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
    }
    let initialJob;
    try {
      initialJob = await readInitialJob(jobPath, workspaceRoot, filesystemAdapter);
    } catch {
      return diagnosticResult('CAPTION_B1_PACKAGE_CLI_JOB_CONTEXT_UNAVAILABLE');
    }
    if (initialJob === null) {
      return diagnosticResult('CAPTION_B1_PACKAGE_CLI_JOB_CONTEXT_UNAVAILABLE');
    }
    const facade = makeFacade(filesystemAdapter, initialJob.value.mode);
    const state = await initialiseRunState(
      jobPath,
      initialJob.value,
      initialJob.observation,
      workspaceRoot,
      facade,
    );
    const core = runCoreBuildStages(state, builderAdapter);
    if (core.status === 'untrusted') {
      return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
    }
    if (state.jobValue.mode === 'formal-generation') {
      const publication = await runFormalPublication(state, core.result);
      if (publication.status === 'untrusted') {
        return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
      }
    }
    return await finishTrustedRun(state);
  } catch {
    return diagnosticResult('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID');
  }
}

const validStreams = (streams) => Object.isFrozen(streams)
  && hasExactKeys(streams, ['stdout', 'stderr'])
  && Object.isFrozen(streams.stdout)
  && Object.isFrozen(streams.stderr)
  && hasExactKeys(streams.stdout, ['write'])
  && hasExactKeys(streams.stderr, ['write'])
  && typeof streams.stdout.write === 'function'
  && typeof streams.stderr.write === 'function';

export async function runPresentationCaptionSemanticSourcePackageCliV001(argv, streams) {
  try {
    if (!Array.isArray(argv) || argv.length !== 1 || typeof argv[0] !== 'string'
      || !validStreams(streams)) {
      if (validStreams(streams)) {
        streams.stderr.write('CAPTION_B1_PACKAGE_CLI_USAGE_INVALID\n');
      }
      return 2;
    }
    const filesystemAdapter =
      createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001();
    const builderAdapter = createProductionBuilderAdapter();
    const result = await runPresentationCaptionSemanticSourcePackageV001(
      argv[0],
      {filesystemAdapter, builderAdapter},
    );
    if (result.kind === 'trusted-report') {
      const output = result.reportBytes.toString('utf8');
      if (result.exitCode === 0) streams.stdout.write(output);
      else streams.stderr.write(output);
    } else {
      streams.stderr.write(`${result.diagnostic}\n`);
    }
    return result.exitCode;
  } catch {
    try {
      if (validStreams(streams)) {
        streams.stderr.write('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID\n');
      }
    } catch {
      // The exported CLI still resolves to exit 2 when its stream is unusable.
    }
    return 2;
  }
}

const isEntrypoint = process.argv[1]
  && resolve(process.argv[1]) === RUNNER_PATH;
if (isEntrypoint) {
  const streams = Object.freeze({
    stdout: Object.freeze({write: (value) => process.stdout.write(value)}),
    stderr: Object.freeze({write: (value) => process.stderr.write(value)}),
  });
  runPresentationCaptionSemanticSourcePackageCliV001(process.argv.slice(2), streams)
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch(() => {
      process.stderr.write('CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID\n');
      process.exitCode = 2;
    });
}
