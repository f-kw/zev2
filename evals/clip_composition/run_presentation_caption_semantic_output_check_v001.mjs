import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {lstat, open, readdir, readlink, realpath} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import {fileURLToPath} from 'node:url';
import process from 'node:process';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  buildPresentationCaptionSemanticCompilerInputV001,
  checkPresentationCaptionSemanticOutputV001,
  validatePresentationCaptionSemanticOutputCheckJobV001,
  validatePresentationCaptionSemanticOutputValidationReportV001,
} from './presentation_caption_semantic_output_v001.mjs';

const RUNNER_PATH =
  'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs';
const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/';
const PACKAGE_FILES = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);
const DIRECT_ROLES = Object.freeze(['packageCore', 'semanticCore', 'semanticRunner']);
const DEPENDENCY_ROLES = Object.freeze([
  'textLayoutImplementation',
  'gateACore',
  'gateARetainedSourceAtomsCore',
  'gateARunner',
]);
const REPORT_SCHEMA = 'presentation-caption-semantic-output-validation-report-v001';
const CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'packageShape',
  'semanticOutput',
  'compilerBuild',
  'compilerInput',
  'deterministicExpansion',
  'determinism',
  'readOnlyCheck',
  'jobStability',
]);
const WORKSPACE_ROOT_LEXICAL = fileURLToPath(new URL('../../', import.meta.url));

const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const compareUtf16 = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const shaBytes = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  return result?.status === 'hashed' ? result.sha256 : null;
};
const canonicalSha = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  return result?.status === 'canonicalized' ? shaBytes(result.bytes) : null;
};
const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  return result?.status === 'serialized' ? result.bytes : null;
};
const cloneBufferTree = (value, path = '$', copies = []) => {
  if (Buffer.isBuffer(value)) {
    const copy = Buffer.from(value);
    copies.push({path, copy, beforeSha256: shaBytes(copy)});
    return copy;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => cloneBufferTree(entry, `${path}[${index}]`, copies));
  }
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      cloneBufferTree(entry, `${path}.${key}`, copies),
    ]));
  }
  return value;
};

const toKind = (stats) => {
  if (stats.isFile()) return 'regular-file';
  if (stats.isDirectory()) return 'directory';
  if (stats.isSymbolicLink()) return 'symlink';
  return 'other';
};
const statShape = (stats) => ({
  kind: toKind(stats),
  dev: stats.dev.toString(10),
  ino: stats.ino.toString(10),
  size: stats.size.toString(10),
  mtimeNs: stats.mtimeNs.toString(10),
  nlink: stats.nlink.toString(10),
});
const externalAncestorShape = (absolutePath, stats, realPath) => ({
  absolutePath,
  lstatKind: toKind(stats) === 'regular-file' ? 'other' : toKind(stats),
  realPath,
});
const workspaceAncestorShape = (workspaceRelativePath, stats, realPath) => ({
  workspaceRelativePath,
  lstatKind: toKind(stats) === 'regular-file' ? 'other' : toKind(stats),
  realPath,
});
const sameStat = (left, right) => left.kind === right.kind
  && left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.nlink === right.nlink;

const adapterFields = [
  'openReadOnly',
  'lstatBigInt',
  'realpath',
  'readdirWithTypes',
  'readlink',
];

export function createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001() {
  return Object.freeze({
    openReadOnly: async (pathValue) => {
      const handle = await open(pathValue, constants.O_RDONLY | constants.O_NOFOLLOW);
      return Object.freeze({
        statBigInt: () => handle.stat({bigint: true}),
        readAllBytes: () => handle.readFile(),
        close: () => handle.close(),
      });
    },
    lstatBigInt: (pathValue) => lstat(pathValue, {bigint: true}),
    realpath: (pathValue) => realpath(pathValue),
    readdirWithTypes: async (pathValue) => (await readdir(pathValue, {withFileTypes: true}))
      .map((entry) => ({
        name: entry.name,
        kind: entry.isFile()
          ? 'file'
          : entry.isDirectory()
            ? 'directory'
            : entry.isSymbolicLink()
              ? 'symlink'
              : 'other',
      }))
      .sort((left, right) => compareUtf16(left.name, right.name)),
    readlink: (pathValue) => readlink(pathValue),
  });
}

const validateAdapter = (value) => exactKeys(value, adapterFields)
  && adapterFields.every((field) => typeof value[field] === 'function');
const safeRelativeParts = (value) => {
  if (typeof value !== 'string'
    || value.length === 0
    || value.includes('\0')
    || value.includes('\\')
    || value.includes('//')
    || value.startsWith('./')
    || isAbsolute(value)) return null;
  const parts = value.split('/');
  return parts.some((part) => part.length === 0 || part === '.' || part === '..')
    ? null
    : parts;
};
const workspaceRelative = (root, absolutePath) => {
  const value = relative(root, absolutePath);
  if (!value || value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value)) return null;
  return value.split(sep).join('/');
};

const inspectWorkspaceResolution = async (root, repositoryPath, adapter) => {
  const parts = safeRelativeParts(repositoryPath);
  if (!parts) return {status: 'lexically-rejected'};
  const absolutePath = resolve(root, ...parts);
  if (workspaceRelative(root, absolutePath) !== repositoryPath) {
    return {status: 'lexically-rejected'};
  }
  let rootReal;
  try {
    rootReal = await adapter.realpath(root);
  } catch {
    return {status: 'io-error'};
  }
  const ancestors = [];
  let current = root;
  for (const part of parts.slice(0, -1)) {
    current = resolve(current, part);
    try {
      const stats = await adapter.lstatBigInt(current);
      const real = await adapter.realpath(current);
      ancestors.push(workspaceAncestorShape(workspaceRelative(root, current) ?? '', stats, real));
    } catch (error) {
      return error?.code === 'ENOENT' ? {status: 'missing'} : {status: 'io-error'};
    }
  }
  let pathStats;
  let targetRealPath;
  try {
    pathStats = await adapter.lstatBigInt(absolutePath);
    targetRealPath = await adapter.realpath(absolutePath);
  } catch (error) {
    return error?.code === 'ENOENT' ? {status: 'missing'} : {status: 'io-error'};
  }
  return {
    status: 'observed',
    absolutePath,
    pathStats,
    observation: {
      workspaceRootRealPath: rootReal,
      lexicalWorkspaceRelativePath: repositoryPath,
      targetRealPath,
      ancestors,
    },
  };
};

const readStableWorkspace = async (
  root,
  role,
  repositoryPath,
  adapter,
  {preserveRegularHardlink = false} = {},
) => {
  const inspected = await inspectWorkspaceResolution(root, repositoryPath, adapter);
  if (inspected.status === 'lexically-rejected') {
    return {role, path: repositoryPath, status: 'lexically-rejected', snapshot: null};
  }
  if (inspected.status === 'missing') {
    return {role, path: repositoryPath, status: 'missing', snapshot: null};
  }
  if (inspected.status !== 'observed') throw new TypeError('workspace inspection failed');
  const before = statShape(inspected.pathStats);
  const ancestorUnsafe = inspected.observation.ancestors.some((entry) =>
    entry.lstatKind !== 'directory')
    || before.kind !== 'regular-file'
    || (!preserveRegularHardlink && before.nlink !== '1')
    || inspected.observation.targetRealPath !== inspected.absolutePath;
  if (ancestorUnsafe) {
    return {
      role,
      path: repositoryPath,
      status: 'observed-unsafe',
      snapshot: null,
      pathLstatBeforeOpen: before,
      pathResolutionObservation: inspected.observation,
    };
  }
  let handle;
  try {
    handle = await adapter.openReadOnly(inspected.absolutePath);
    const afterOpen = statShape(await handle.statBigInt());
    const bytes = await handle.readAllBytes();
    const afterRead = statShape(await handle.statBigInt());
    if (!Buffer.isBuffer(bytes)) throw new TypeError('read must return Buffer');
    if (!sameStat(before, afterOpen) || !sameStat(before, afterRead)) {
      return {
        role,
        path: repositoryPath,
        status: 'observed-unsafe',
        snapshot: null,
        pathLstatBeforeOpen: before,
        pathResolutionObservation: inspected.observation,
      };
    }
    return {
      role,
      path: repositoryPath,
      status: 'read',
      snapshot: {
        path: repositoryPath,
        bytes,
        fileSha256: shaBytes(bytes),
        pathLstatBeforeOpen: before,
        fdStatAfterOpen: afterOpen,
        fdStatAfterRead: afterRead,
        pathResolutionObservation: inspected.observation,
      },
    };
  } finally {
    if (handle) await handle.close();
  }
};

const readNodeBinary = async (adapter) => {
  const input = process.execPath;
  let target;
  try {
    target = await adapter.realpath(input);
  } catch {
    throw new TypeError('node realpath unavailable');
  }
  const ancestors = [];
  let current = '/';
  for (const part of target.split('/').filter(Boolean).slice(0, -1)) {
    current = resolve(current, part);
    const stats = await adapter.lstatBigInt(current);
    const real = await adapter.realpath(current);
    ancestors.push(externalAncestorShape(current, stats, real));
  }
  const lstatBefore = statShape(await adapter.lstatBigInt(target));
  let handle;
  try {
    handle = await adapter.openReadOnly(target);
    const afterOpen = statShape(await handle.statBigInt());
    const bytes = await handle.readAllBytes();
    const afterRead = statShape(await handle.statBigInt());
    if (!sameStat(lstatBefore, afterOpen)
      || !sameStat(lstatBefore, afterRead)
      || lstatBefore.kind !== 'regular-file'
      || lstatBefore.nlink !== '1') {
      throw new TypeError('node binary changed');
    }
    return {
      role: 'nodeBinary',
      status: 'read',
      snapshot: {
        path: target,
        bytes,
        fileSha256: shaBytes(bytes),
        pathLstatBeforeOpen: lstatBefore,
        fdStatAfterOpen: afterOpen,
        fdStatAfterRead: afterRead,
        externalPathResolutionObservation: {
          inputAbsolutePath: input,
          targetRealPath: target,
          ancestors,
        },
      },
    };
  } finally {
    if (handle) await handle.close();
  }
};

const runtimeObservation = async (adapter) => {
  const nodeBinaryInput = await readNodeBinary(adapter);
  const segmenter = new Intl.Segmenter('ja', {granularity: 'word'});
  const resolved = segmenter.resolvedOptions();
  return {
    nodeBinaryInput,
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: resolved.locale,
    resolvedGranularity: resolved.granularity,
    diagnostics: {
      resolvedNodePath: nodeBinaryInput.snapshot.path,
      platform: process.platform,
      arch: process.arch,
      v8Version: process.versions.v8,
      unicodeVersion: process.versions.unicode,
      cldrVersion: process.versions.cldr,
    },
  };
};

const monitorTree = async (root, repositoryRoot, excludedPath, adapter) => {
  const start = resolve(root, ...repositoryRoot.split('/'));
  const entries = [];
  const visit = async (absolutePath) => {
    const relativePath = workspaceRelative(root, absolutePath);
    if (relativePath === excludedPath) return;
    let stats;
    try {
      stats = await adapter.lstatBigInt(absolutePath);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    const kind = toKind(stats);
    if (kind === 'other') throw new TypeError('unsupported monitored node');
    if (kind === 'directory') {
      entries.push({path: relativePath, kind: 'directory', contentSha256: null});
      const children = await adapter.readdirWithTypes(absolutePath);
      for (const child of children) await visit(resolve(absolutePath, child.name));
      return;
    }
    if (kind === 'symlink') {
      const target = await adapter.readlink(absolutePath);
      entries.push({
        path: relativePath,
        kind: 'symlink',
        contentSha256: createHash('sha256').update(Buffer.from(target, 'utf8')).digest('hex'),
      });
      return;
    }
    const observation = await readStableWorkspace(root, 'monitor', relativePath, adapter);
    if (observation.status !== 'read') throw new TypeError('monitored file unstable');
    entries.push({
      path: relativePath,
      kind: 'file',
      contentSha256: observation.snapshot.fileSha256,
    });
  };
  await visit(start);
  return entries.sort((left, right) => compareUtf16(left.path, right.path));
};

const directoryEntries = async (root, repositoryPath, adapter) => {
  const absolute = resolve(root, ...repositoryPath.split('/'));
  return (await adapter.readdirWithTypes(absolute))
    .map((entry) => ({name: entry.name, kind: entry.kind}))
    .sort((left, right) => compareUtf16(left.name, right.name));
};

const productionBuilderAdapter = () => Object.freeze({
  buildCompilerInput: buildPresentationCaptionSemanticCompilerInputV001,
});
const validBuilderAdapter = (value) => exactKeys(value, ['buildCompilerInput'])
  && typeof value.buildCompilerInput === 'function';

const buildCompilerPass = (adapter, context) => {
  const copies = [];
  const cloned = cloneBufferTree(context, '$', copies);
  let value;
  try {
    value = adapter.buildCompilerInput(cloned);
  } catch {
    const finalized = copies.map(({path, copy, beforeSha256}) => ({
      path,
      beforeSha256,
      afterSha256: shaBytes(copy),
      unchanged: beforeSha256 === shaBytes(copy),
    }));
    return {
      success: false,
      kind: finalized.some((entry) => !entry.unchanged) ? 'input-mutated' : 'thrown',
      inputByteCopies: finalized,
    };
  }
  const finalized = copies.map(({path, copy, beforeSha256}) => ({
    path,
    beforeSha256,
    afterSha256: shaBytes(copy),
    unchanged: beforeSha256 === shaBytes(copy),
  }));
  if (finalized.some((entry) => !entry.unchanged)) {
    return {success: false, kind: 'input-mutated', inputByteCopies: finalized};
  }
  const bytes = formalBytes(value);
  const canonical = canonicalSha(value);
  if (!bytes || !canonical) {
    return {success: false, kind: 'invalid-return', inputByteCopies: finalized};
  }
  return {
    success: true,
    pass: {
      value,
      bytes,
      fileSha256: shaBytes(bytes),
      canonicalSha256: canonical,
      inputByteCopies: finalized,
    },
  };
};

const summaryRuntime = (runtime) => ({
  nodeBinarySha256: runtime.nodeBinaryInput.snapshot.fileSha256,
  nodeVersion: runtime.nodeVersion,
  icuVersion: runtime.icuVersion,
  resolvedLocale: runtime.resolvedLocale,
  resolvedGranularity: runtime.resolvedGranularity,
  diagnostics: {
    nodeExecutableFileName: basename(runtime.diagnostics.resolvedNodePath),
    platform: runtime.diagnostics.platform,
    arch: runtime.diagnostics.arch,
    v8Version: runtime.diagnostics.v8Version,
    unicodeVersion: runtime.diagnostics.unicodeVersion,
    cldrVersion: runtime.diagnostics.cldrVersion,
  },
});

const buildReport = (checkerContext, checked) => {
  const job = checkerContext.job.value;
  const failed = checked.checks.find((check) => check.status === 'failed');
  const rawDecoded = checkerContext.rawSemanticOutputInput.status === 'read'
    ? decodePresentationCaptionB1StrictJsonV001(
      checkerContext.rawSemanticOutputInput.snapshot.bytes,
    )
    : null;
  const abstained = !failed
    && rawDecoded?.status === 'decoded'
    && rawDecoded.value?.status === 'abstained';
  const status = failed ? 'failed' : abstained ? 'abstained' : 'passed';
  const packageSnapshots = checkerContext.sourcePackageObservation.artifactReads;
  const manifest = packageSnapshots[5]?.status === 'read'
    ? decodePresentationCaptionB1StrictJsonV001(packageSnapshots[5].snapshot.bytes)
    : null;
  const report = packageSnapshots[6]?.status === 'read'
    ? decodePresentationCaptionB1StrictJsonV001(packageSnapshots[6].snapshot.bytes)
    : null;
  const rawCanonical = rawDecoded?.status === 'decoded'
    ? canonicalSha(rawDecoded.value)
    : null;
  const compiler = status === 'passed' ? checkerContext.compilerBuildPasses[0] : null;
  const lines = compiler
    ? compiler.value.containers.flatMap((container) =>
      container.meaningGroups.flatMap((group) => group.lines))
    : [];
  const meaningGroups = compiler
    ? compiler.value.containers.reduce(
      (sum, container) => sum + container.meaningGroups.length,
      0,
    )
    : null;
  const candidates = compiler
    ? lines.reduce((sum, line) => sum + line.boundaryCandidateIds.length, 0)
    : null;
  const atoms = compiler
    ? lines.reduce((sum, line) => sum + line.sourceAtomIds.length, 0)
    : null;
  const readOnly = checkerContext.readOnlyProcessObservation;
  const beforeHash = readOnly.mode === 'observed' ? canonicalSha(readOnly.beforeEntries) : null;
  const afterHash = readOnly.mode === 'observed' ? canonicalSha(readOnly.afterEntries) : null;
  const readOnlyCheck = checked.checks.find((check) => check.name === 'readOnlyCheck');
  return {
    schemaVersion: REPORT_SCHEMA,
    status,
    failureStage: failed?.name ?? null,
    jobBinding: {
      path: checkerContext.job.initialSnapshot.path,
      fileSha256: checkerContext.job.initialSnapshot.fileSha256,
    },
    implementationBinding: {
      gitCommit: job.implementationBinding.gitCommit,
      files: job.implementationBinding.files.map((entry) => ({...entry})),
      dependencyFiles: job.implementationBinding.dependencyFiles.map((entry) => ({...entry})),
    },
    runtimeBinding: summaryRuntime(checkerContext.runtimeObservation),
    inputBindings: {
      sourcePackageManifest: {
        path: job.sourcePackageBinding.manifest.path,
        fileSha256: packageSnapshots[5]?.snapshot?.fileSha256 ?? null,
        canonicalSha256: manifest?.status === 'decoded'
          ? canonicalSha(manifest.value)
          : null,
      },
      sourcePackageValidationReport: {
        path: job.sourcePackageBinding.validationReport.path,
        fileSha256: packageSnapshots[6]?.snapshot?.fileSha256 ?? null,
        canonicalSha256: report?.status === 'decoded'
          ? canonicalSha(report.value)
          : null,
      },
      rawSemanticOutput: {
        path: job.semanticOutputBinding.path,
        observationStatus: checkerContext.rawSemanticOutputInput.status,
        fileSha256: checkerContext.rawSemanticOutputInput.snapshot?.fileSha256 ?? null,
        canonicalSha256: rawCanonical,
      },
    },
    checks: checked.checks.map((entry) => ({
      name: entry.name,
      status: entry.status,
      violationCodes: [...entry.violationCodes],
    })),
    violations: checked.violations.map((entry) => ({
      code: entry.code,
      path: entry.path,
      details: {},
    })),
    observedProjection: status === 'passed'
      ? {
        containerCount: compiler.value.containers.length,
        meaningGroupCount: meaningGroups,
        lineCount: lines.length,
        boundaryCandidateCount: candidates,
        sourceAtomCount: atoms,
        maximumObservedLineLogicalWidth: Math.max(...lines.map((line) => line.logicalWidth)),
      }
      : {
        containerCount: null,
        meaningGroupCount: null,
        lineCount: null,
        boundaryCandidateCount: null,
        sourceAtomCount: null,
        maximumObservedLineLogicalWidth: null,
      },
    compilerInput: status === 'passed'
      ? {
        status: 'generated',
        canonicalSha256: compiler.canonicalSha256,
        observedByteSha256: compiler.fileSha256,
      }
      : {
        status: 'not_generated',
        canonicalSha256: null,
        observedByteSha256: null,
      },
    readOnlyObservation: {
      status: readOnly.inputReread?.status === 'completed'
        ? 'verified'
        : 'not-run-with-upstream-failure',
      beforeCanonicalSha256: beforeHash,
      afterCanonicalSha256: afterHash,
      unchanged: readOnly.inputReread?.status === 'completed'
        ? readOnlyCheck?.status === 'passed'
        : null,
    },
    scope: {
      validatedState: 'semantic-boundary-selection-only',
      semanticQualityVerified: false,
      naturalBreakQualityVerified: false,
      renderReadabilityVerified: false,
    },
  };
};

const rereadInputs = async (root, job, adapter) => {
  const values = [];
  const implementation = [
    ...job.implementationBinding.files,
    ...job.implementationBinding.dependencyFiles,
  ];
  for (const binding of implementation) {
    values.push({
      role: binding.role,
      observation: await readStableWorkspace(root, binding.role, binding.path, adapter),
    });
  }
  for (const fileName of PACKAGE_FILES) {
    const path = `${job.sourcePackageBinding.rootPath}/${fileName}`;
    values.push({
      role: `sourcePackage.${fileName}`,
      observation: await readStableWorkspace(
        root,
        `sourcePackage.${fileName}`,
        path,
        adapter,
      ),
    });
  }
  values.push({
    role: 'rawSemanticOutput',
    observation: await readStableWorkspace(
      root,
      'rawSemanticOutput',
      job.semanticOutputBinding.path,
      adapter,
    ),
  });
  values.push({role: 'nodeBinary', observation: await readNodeBinary(adapter)});
  return values;
};

export async function runPresentationCaptionSemanticOutputCheckV001(
  jobPath,
  options,
) {
  try {
    if (!exactKeys(options, ['filesystemAdapter', 'builderAdapter'])) {
      return {
        kind: 'untrusted',
        exitCode: 2,
        diagnostic: 'CAPTION_B1_SEMANTIC_CLI_JOB_CONTEXT_UNAVAILABLE',
      };
    }
    const {filesystemAdapter, builderAdapter} = options;
    if (typeof jobPath !== 'string'
      || !directJobPath(jobPath)
      || !validateAdapter(filesystemAdapter)
      || !validBuilderAdapter(builderAdapter)) {
      return {
        kind: 'untrusted',
        exitCode: 2,
        diagnostic: 'CAPTION_B1_SEMANTIC_CLI_JOB_CONTEXT_UNAVAILABLE',
      };
    }
    const workspaceRoot = await filesystemAdapter.realpath(WORKSPACE_ROOT_LEXICAL);
    const runnerReal = await filesystemAdapter.realpath(resolve(workspaceRoot, RUNNER_PATH));
    if (runnerReal !== resolve(workspaceRoot, RUNNER_PATH)) throw new TypeError('runner path');
    const jobInput = await readStableWorkspace(workspaceRoot, 'job', jobPath, filesystemAdapter);
    if (jobInput.status !== 'read') {
      return {
        kind: 'untrusted',
        exitCode: 2,
        diagnostic: 'CAPTION_B1_SEMANTIC_CLI_JOB_CONTEXT_UNAVAILABLE',
      };
    }
    const decodedJob = decodePresentationCaptionB1StrictJsonV001(jobInput.snapshot.bytes);
    if (decodedJob?.status !== 'decoded') {
      return {
        kind: 'untrusted',
        exitCode: 2,
        diagnostic: 'CAPTION_B1_SEMANTIC_CLI_JOB_CONTEXT_UNAVAILABLE',
      };
    }
    const jobValidation = validatePresentationCaptionSemanticOutputCheckJobV001(decodedJob.value);
    if (jobValidation.status !== 'valid'
      || jobValidation.value.readOnlyGuard.excludedPaths[0] !== jobPath) {
      return {
        kind: 'untrusted',
        exitCode: 2,
        diagnostic: 'CAPTION_B1_SEMANTIC_CLI_JOB_CONTEXT_UNAVAILABLE',
      };
    }
    const job = jobValidation.value;
    const beforeEntries = await monitorTree(
      workspaceRoot,
      job.readOnlyGuard.watchedRoot,
      jobPath,
      filesystemAdapter,
    );
    const implementationInputs = [];
    for (const binding of [
      ...job.implementationBinding.files,
      ...job.implementationBinding.dependencyFiles,
    ]) {
      implementationInputs.push(
        await readStableWorkspace(workspaceRoot, binding.role, binding.path, filesystemAdapter),
      );
    }
    const entries = await directoryEntries(
      workspaceRoot,
      job.sourcePackageBinding.rootPath,
      filesystemAdapter,
    );
    const artifactReads = [];
    for (const fileName of PACKAGE_FILES) {
      const observation = await readStableWorkspace(
        workspaceRoot,
        `sourcePackage.${fileName}`,
        `${job.sourcePackageBinding.rootPath}/${fileName}`,
        filesystemAdapter,
        {preserveRegularHardlink: true},
      );
      if (observation.status === 'read') {
        artifactReads.push({
          fileName,
          status: 'read',
          snapshot: observation.snapshot,
          observedKind: 'regular-file',
          failurePoint: null,
        });
      } else if (observation.status === 'missing') {
        artifactReads.push({
          fileName,
          status: 'missing',
          snapshot: null,
          observedKind: null,
          failurePoint: null,
        });
      } else {
        artifactReads.push({
          fileName,
          status: 'non-regular',
          snapshot: null,
          observedKind: observation.pathLstatBeforeOpen?.kind ?? 'other',
          failurePoint: null,
        });
      }
    }
    if (artifactReads[5]?.status !== 'read' || artifactReads[6]?.status !== 'read') {
      throw new TypeError('source package manifest/report unavailable');
    }
    const rawSemanticOutputInput = await readStableWorkspace(
      workspaceRoot,
      'rawSemanticOutput',
      job.semanticOutputBinding.path,
      filesystemAdapter,
    );
    const runtime = await runtimeObservation(filesystemAdapter);
    const sourcePackageObservation = {directoryEntries: entries, artifactReads};
    const initialContext = {
      contextPhase: 'semantic-output-gate',
      job: {value: job, initialSnapshot: jobInput.snapshot, preReportInput: null},
      implementationInputs,
      sourcePackageObservation,
      rawSemanticOutputInput,
      runtimeObservation: runtime,
      compilerBuildPasses: [],
      buildFailure: null,
      readOnlyProcessObservation: {mode: 'not-attempted'},
    };
    const gate = checkPresentationCaptionSemanticOutputV001(initialContext);
    if (gate.status !== 'checked') throw new TypeError('semantic gate context invalid');

    let compilerBuildPasses = [];
    let buildFailure = null;
    const prefixPassed = gate.checks.slice(0, 6).every((check) => check.status === 'passed');
    const raw = rawSemanticOutputInput.status === 'read'
      ? decodePresentationCaptionB1StrictJsonV001(rawSemanticOutputInput.snapshot.bytes)
      : null;
    if (prefixPassed && raw?.status === 'decoded' && raw.value?.status === 'complete') {
      const compilerContext = {
        sourcePackageSnapshots: artifactReads.map((entry) => entry.snapshot),
        rawSemanticOutputSnapshot: rawSemanticOutputInput.snapshot,
      };
      const first = buildCompilerPass(builderAdapter, compilerContext);
      if (!first.success) {
        compilerBuildPasses = [null, null];
        buildFailure = {
          stage: 'compiler',
          passOrdinal: 1,
          kind: first.kind,
          inputByteCopies: first.inputByteCopies,
        };
      } else {
        const second = buildCompilerPass(builderAdapter, compilerContext);
        if (!second.success) {
          compilerBuildPasses = [first.pass, null];
          buildFailure = {
            stage: 'compiler',
            passOrdinal: 2,
            kind: second.kind,
            inputByteCopies: second.inputByteCopies,
          };
        } else {
          compilerBuildPasses = [first.pass, second.pass];
        }
      }
    }

    const initialInputs = [
      ...implementationInputs.map((observation) => ({
        role: observation.role,
        observation,
      })),
      ...artifactReads.map((read) => ({
        role: `sourcePackage.${read.fileName}`,
        observation: read.status === 'read'
          ? {
            role: `sourcePackage.${read.fileName}`,
            path: read.snapshot.path,
            status: 'read',
            snapshot: read.snapshot,
          }
          : {
            role: `sourcePackage.${read.fileName}`,
            path: `${job.sourcePackageBinding.rootPath}/${read.fileName}`,
            status: read.status === 'missing' ? 'missing' : 'observed-unsafe',
            snapshot: null,
          },
      })),
      {role: 'rawSemanticOutput', observation: rawSemanticOutputInput},
      {role: 'nodeBinary', observation: runtime.nodeBinaryInput},
    ];
    const finalInputs = await rereadInputs(workspaceRoot, job, filesystemAdapter);
    const afterEntries = await monitorTree(
      workspaceRoot,
      job.readOnlyGuard.watchedRoot,
      jobPath,
      filesystemAdapter,
    );
    const preReportInput = await readStableWorkspace(
      workspaceRoot,
      'job',
      jobPath,
      filesystemAdapter,
    );
    const finalContext = {
      contextPhase: 'final-report',
      job: {value: job, initialSnapshot: jobInput.snapshot, preReportInput},
      implementationInputs,
      sourcePackageObservation,
      rawSemanticOutputInput,
      runtimeObservation: runtime,
      compilerBuildPasses,
      buildFailure,
      readOnlyProcessObservation: {
        mode: 'observed',
        beforeEntries,
        afterEntries,
        inputReread: {status: 'completed', initialInputs, finalInputs},
        attemptedWriteCalls: [],
      },
    };
    const checked = checkPresentationCaptionSemanticOutputV001(finalContext);
    if (checked.status !== 'checked') throw new TypeError('final checker context invalid');
    const report = buildReport(finalContext, checked);
    const reportBytes = formalBytes(report);
    if (!reportBytes) throw new TypeError('report serialization failed');
    const exitCode = report.status === 'passed' ? 0 : 1;
    if (!validatePresentationCaptionSemanticOutputValidationReportV001({
      report,
      reportBytes,
      expectedExitCode: exitCode,
      checkerContext: finalContext,
    }).valid) {
      throw new TypeError('self-validation failed');
    }
    return {kind: 'trusted-report', exitCode, report, reportBytes};
  } catch {
    return {
      kind: 'untrusted',
      exitCode: 2,
      diagnostic: 'CAPTION_B1_SEMANTIC_CLI_INTERNAL_REPORT_INVALID',
    };
  }
}

const directJobPath = (value) => typeof value === 'string'
  && value.startsWith(JOB_ROOT)
  && value.slice(JOB_ROOT.length).length > 0
  && !value.slice(JOB_ROOT.length).includes('/')
  && value.endsWith('.json')
  && safeRelativeParts(value) !== null;

const validStreams = (streams) => Object.isFrozen(streams)
  && exactKeys(streams, ['stdout', 'stderr'])
  && Object.isFrozen(streams.stdout)
  && Object.isFrozen(streams.stderr)
  && exactKeys(streams.stdout, ['write'])
  && exactKeys(streams.stderr, ['write'])
  && typeof streams.stdout.write === 'function'
  && typeof streams.stderr.write === 'function';

export async function runPresentationCaptionSemanticOutputCheckCliV001(argv, streams) {
  try {
    if (!Array.isArray(argv) || argv.length !== 1 || !validStreams(streams)) {
      if (validStreams(streams)) {
        streams.stderr.write('CAPTION_B1_SEMANTIC_CLI_USAGE_INVALID\n');
      }
      return 2;
    }
    const result = await runPresentationCaptionSemanticOutputCheckV001(argv[0], {
      filesystemAdapter:
        createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001(),
      builderAdapter: productionBuilderAdapter(),
    });
    if (result.kind === 'trusted-report') {
      const text = result.reportBytes.toString('utf8');
      if (result.exitCode === 0) streams.stdout.write(text);
      else streams.stderr.write(text);
      return result.exitCode;
    }
    streams.stderr.write(`${result.diagnostic}\n`);
    return 2;
  } catch {
    try {
      if (validStreams(streams)) {
        streams.stderr.write('CAPTION_B1_SEMANTIC_CLI_INTERNAL_REPORT_INVALID\n');
      }
    } catch {
      // A broken output stream cannot be repaired by the CLI.
    }
    return 2;
  }
}

const isEntrypoint = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  const streams = Object.freeze({
    stdout: Object.freeze({write: (value) => process.stdout.write(value)}),
    stderr: Object.freeze({write: (value) => process.stderr.write(value)}),
  });
  runPresentationCaptionSemanticOutputCheckCliV001(process.argv.slice(2), streams)
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch(() => {
      process.stderr.write('CAPTION_B1_SEMANTIC_CLI_INTERNAL_REPORT_INVALID\n');
      process.exitCode = 2;
    });
}
