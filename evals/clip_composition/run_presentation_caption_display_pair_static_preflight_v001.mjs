#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  lstat,
  open,
  readlink,
  readdir,
  readFile,
  realpath,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildPresentationCaptionDisplayPairStaticPreflightReportV001,
  validatePresentationCaptionDisplayPairStaticPreflightJobV001,
} from './presentation_caption_display_pair_v003.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/';
const PACKAGE_FILES = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);
const PACKAGE_ROLES = Object.freeze([
  'boundaryEvidence',
  'embeddedGateAReport',
  'semanticSourceInput',
  'deterministicExpansionMap',
  'sourceOnlyLeakageReport',
  'packageManifest',
  'packageValidationReport',
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
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const shaBytes = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  return result?.status === 'hashed' ? result.sha256 : null;
};
const canonicalSha = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  return result?.status === 'canonicalized' ? shaBytes(result.bytes) : null;
};
const formal = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  return result?.status === 'serialized' ? result.bytes : null;
};
const fatal = (diagnostic) => ({
  schemaVersion: 'presentation-caption-display-pair-cli-fatal-v001',
  diagnostic,
});
const safeJobPath = (value) => typeof value === 'string'
  && value.startsWith(JOB_ROOT)
  && value.endsWith('.json')
  && value.slice(JOB_ROOT.length).length > 5
  && !value.slice(JOB_ROOT.length).includes('/')
  && !value.includes('..')
  && !value.includes('\\');
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
  const absolutePath = resolve(workspaceRoot, pathValue);
  if (absolutePath !== `${workspaceRoot}${sep}${pathValue}`) {
    throw new TypeError('path outside workspace');
  }
  const pathStats = await lstat(absolutePath, {bigint: true});
  if (!pathStats.isFile() || pathStats.isSymbolicLink() || pathStats.nlink !== 1n) {
    throw new TypeError('unsafe file');
  }
  const handle = await open(absolutePath, 'r');
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
    if (!sameProjection(before, after)) throw new TypeError('file changed during read');
    return {
      path: pathValue,
      bytes,
      fileSha256,
      statBefore: before,
      statAfter: after,
    };
  } finally {
    await handle.close();
  }
};

const decode = (snapshot) => {
  const result = decodePresentationCaptionB1StrictJsonV001(snapshot.bytes);
  if (result?.status !== 'decoded') throw new TypeError('strict json decode failed');
  return result.value;
};

const readGroup = async (rootPath, specifications) => Promise.all(
  specifications.map(async ([role, fileName]) => {
    const path = `${rootPath}/${fileName}`;
    return {role, path, snapshot: await stableRead(path, {binary: role === 'baseMedia'})};
  }),
);

const verifyBound = (entry, binding, canonical = true) => (
  entry.path === binding?.path
  && entry.snapshot.fileSha256 === binding?.fileSha256
  && (!canonical || canonicalSha(decode(entry.snapshot)) === binding?.canonicalSha256)
);

const packageTree = async (rootPath) => {
  const values = [];
  const visit = async (absoluteRoot, relativeRoot = '') => {
    const entries = await readdir(absoluteRoot, {withFileTypes: true});
    entries.sort((left, right) => (
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    ));
    for (const entry of entries) {
      const relativePath = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
      const absolutePath = resolve(absoluteRoot, entry.name);
      if (entry.isSymbolicLink()) throw new TypeError('package tree symlink');
      if (entry.isDirectory()) await visit(absolutePath, relativePath);
      else if (entry.isFile()) {
        const bytes = await readFile(absolutePath);
        values.push({relativePath, sizeBytes: bytes.length, fileSha256: shaBytes(bytes)});
      } else throw new TypeError('package tree unknown kind');
    }
  };
  await visit(rootPath);
  return canonicalSha(values);
};

const observeLayoutRuntime = async () => {
  const tsxLogical = 'runner/node_modules/tsx/dist/cli.mjs';
  const tsxReal = await realpath(resolve(workspaceRoot, tsxLogical));
  const tsxPackageRoot = resolve(dirname(tsxReal), '..');
  const tsxPackage = JSON.parse(await readFile(resolve(tsxPackageRoot, 'package.json'), 'utf8'));
  const requireFromTsx = createRequire(tsxReal);
  const esbuildEntry = await realpath(requireFromTsx.resolve('esbuild/lib/main.js'));
  const esbuildPackageRoot = resolve(dirname(esbuildEntry), '..');
  const esbuildPackage = JSON.parse(
    await readFile(resolve(esbuildPackageRoot, 'package.json'), 'utf8'),
  );
  const requireFromEsbuild = createRequire(esbuildEntry);
  const platformPackage = `@esbuild/${process.platform}-${process.arch}`;
  const esbuildBinary = await realpath(
    requireFromEsbuild.resolve(`${platformPackage}/bin/esbuild`),
  );
  return {
    tsxEntryLogicalPath: tsxLogical,
    tsxEntryRealPath: tsxReal,
    tsxEntryFileSha256: shaBytes(await readFile(tsxReal)),
    tsxPackageVersion: tsxPackage.version,
    tsxPackageTreeCanonicalSha256: await packageTree(tsxPackageRoot),
    esbuildEntryRealPath: esbuildEntry,
    esbuildEntryFileSha256: shaBytes(await readFile(esbuildEntry)),
    esbuildPackageVersion: esbuildPackage.version,
    esbuildPackageTreeCanonicalSha256: await packageTree(esbuildPackageRoot),
    esbuildBinaryRealPath: esbuildBinary,
    esbuildBinaryFileSha256: shaBytes(await readFile(esbuildBinary)),
  };
};

const observeRuntime = async () => {
  const resolvedNodePath = await realpath(process.execPath);
  const segmenter = new Intl.Segmenter('ja', {granularity: 'word'}).resolvedOptions();
  return {
    resolvedNodePath,
    nodeBinarySha256: shaBytes(await readFile(resolvedNodePath)),
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: segmenter.locale,
    resolvedGranularity: segmenter.granularity,
    layoutExecutionBinding: await observeLayoutRuntime(),
  };
};

const monitorProjection = async (rootPath, excludedPath) => {
  const absoluteRoot = resolve(workspaceRoot, rootPath);
  const rows = [];
  const visit = async (absoluteDirectory) => {
    const entries = await readdir(absoluteDirectory, {withFileTypes: true});
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const entry of entries) {
      const absolutePath = resolve(absoluteDirectory, entry.name);
      const relativePath = relative(workspaceRoot, absolutePath).split(sep).join('/');
      if (relativePath === excludedPath) continue;
      const stats = await lstat(absolutePath, {bigint: true});
      if (entry.isDirectory()) {
        rows.push({path: relativePath, kind: 'directory', contentSha256: null});
        await visit(absolutePath);
      } else if (entry.isSymbolicLink()) {
        rows.push({
          path: relativePath,
          kind: 'symlink',
          contentSha256: shaBytes(Buffer.from(await readlink(absolutePath), 'utf8')),
        });
      } else if (entry.isFile()) {
        const snapshot = await stableRead(relativePath, {binary: true});
        rows.push({
          path: relativePath,
          kind: 'file',
          contentSha256: snapshot.fileSha256,
        });
      } else {
        throw new TypeError('unsupported monitored node');
      }
    }
  };
  await visit(absoluteRoot);
  return canonicalSha(rows);
};

const main = async () => {
  if (process.argv.length !== 3 || !safeJobPath(process.argv[2])) {
    process.stdout.write(formal(fatal('CAPTION_B4_PREFLIGHT_CLI_JOB_CONTEXT_UNAVAILABLE')));
    process.exitCode = 2;
    return;
  }
  const jobPath = process.argv[2];
  try {
    const jobSnapshot = await stableRead(jobPath);
    const job = decode(jobSnapshot);
    if (!validatePresentationCaptionDisplayPairStaticPreflightJobV001(job).valid
      || job.readOnlyGuard.excludedPaths[0] !== jobPath) {
      throw new TypeError('job invalid');
    }
    const before = await monitorProjection(job.readOnlyGuard.watchedRoot, jobPath);
    const implementation = await Promise.all(
      [...job.implementationBinding.files, ...job.implementationBinding.dependencyFiles]
        .map(async (binding) => ({
          binding,
          snapshot: await stableRead(binding.path),
        })),
    );
    const implementationValid = implementation.every(
      ({binding, snapshot}) => snapshot.fileSha256 === binding.fileSha256,
    );
    const sourcePackageInputs = await readGroup(
      job.sourcePackageBinding.rootPath,
      PACKAGE_FILES.map((fileName, index) => [PACKAGE_ROLES[index], fileName]),
    );
    const retainedInputs = await readGroup(job.retainedSourceBinding.rootPath, RETAINED_FILES);
    const baseInputs = await readGroup(job.baseMediaBinding.rootPath, BASE_FILES);
    const registryInputs = await readGroup(job.registryBinding.rootPath, REGISTRY_FILES);
    const sourceManifest = sourcePackageInputs[5];
    const sourceReport = sourcePackageInputs[6];
    const sourcePackageValid = verifyBound(
      sourceManifest,
      job.sourcePackageBinding.manifest,
    ) && verifyBound(sourceReport, job.sourcePackageBinding.validationReport)
      && decode(sourceReport.snapshot).status === 'passed';
    const retainedSourceValid = verifyBound(
      retainedInputs[0],
      job.retainedSourceBinding.generationManifest,
    ) && verifyBound(retainedInputs[1], job.retainedSourceBinding.sourceAtoms)
      && verifyBound(retainedInputs[2], job.retainedSourceBinding.validationReport)
      && decode(retainedInputs[2].snapshot).status === 'passed';
    const baseMediaValid = verifyBound(
      baseInputs[0],
      job.baseMediaBinding.generationManifest,
    ) && verifyBound(baseInputs[1], job.baseMediaBinding.timeline)
      && verifyBound(baseInputs[2], job.baseMediaBinding.validationReport)
      && verifyBound(baseInputs[3], job.baseMediaBinding.baseMedia, false)
      && decode(baseInputs[2].snapshot).status === 'passed';
    const registryValid = REGISTRY_FILES.every(([role], index) =>
      verifyBound(registryInputs[index], job.registryBinding[role]));
    const runtimeBinding = await observeRuntime();
    const runtimeValid = canonicalSha(runtimeBinding) === canonicalSha(job.expectedRuntime);
    const after = await monitorProjection(job.readOnlyGuard.watchedRoot, jobPath);
    const readOnlyUnchanged = before === after
      && before === job.readOnlyGuard.expectedBeforeCanonicalSha256;
    const values = Object.fromEntries(sourcePackageInputs.map(
      (entry) => [entry.role, decode(entry.snapshot)],
    ));
    const report = buildPresentationCaptionDisplayPairStaticPreflightReportV001({
      job,
      jobBinding: {path: jobPath, fileSha256: jobSnapshot.fileSha256},
      sourcePackageValues: {
        boundaryEvidence: values.boundaryEvidence,
        semanticSourceInput: values.semanticSourceInput,
      },
      retainedSourceValue: decode(retainedInputs[1].snapshot),
      timelineValue: decode(baseInputs[1].snapshot),
      implementationValid,
      sourcePackageValid,
      retainedSourceValid,
      baseMediaValid,
      registryValid,
      runtimeValid,
      readOnlyUnchanged,
      runtimeBinding,
      inputBindings: {
        sourcePackageBinding: job.sourcePackageBinding,
        retainedSourceBinding: job.retainedSourceBinding,
        baseMediaBinding: job.baseMediaBinding,
        registryBinding: job.registryBinding,
      },
      readOnlyObservation: {
        status: readOnlyUnchanged ? 'passed' : 'failed',
        beforeCanonicalSha256: before,
        afterCanonicalSha256: after,
        unchanged: readOnlyUnchanged,
      },
    });
    process.stdout.write(formal(report));
    process.exitCode = report.status === 'passed' ? 0 : 1;
  } catch {
    process.stdout.write(formal(fatal('CAPTION_B4_PREFLIGHT_CLI_JOB_CONTEXT_UNAVAILABLE')));
    process.exitCode = 2;
  }
};

main();
