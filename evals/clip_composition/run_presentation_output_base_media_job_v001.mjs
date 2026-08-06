import {createHash} from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  realpath,
  rename,
  rm,
  rmdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  assertSafePresentationBaseMediaInputPathV001,
  buildPresentationAudioGridPlacementPlanV001,
  buildPresentationBaseMediaAudioV001,
  buildPresentationBaseMediaVideoV001,
  inspectPresentationBaseMediaOutputV001,
  inspectPresentationBaseMediaSourceV001,
  inspectPresentationBaseMediaToolBinaryDiagnosticsV001,
  muxPresentationBaseMediaV001,
  validatePresentationBaseMediaSegmentPlanV001,
} from './presentation_base_media_build_v001.mjs';
import {
  decodePresentationCaptionB1StrictJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  derivePresentationMeaningCaptionProjectionV001,
  derivePresentationExpectedAtomOccurrencesV001,
  validatePresentationMeaningBoundaryValidationReportV001,
  validatePresentationMeaningInformationPackageJobV001,
  validatePresentationMeaningJsonBindingV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  sha256CanonicalV001 as canonicalSha256PresentationRetainedSourceAtomsV001,
  validatePresentationRetainedSourceAtomsPublishedArtifactsV001,
} from './presentation_retained_source_atoms_v001.mjs';
import {
  PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001,
  hashAbsoluteStableStreaming,
  validatePresentationSourceIdentityV001,
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  PRESENTATION_OUTPUT_BASE_MEDIA_ARTIFACT_NAMES_V001,
  PRESENTATION_OUTPUT_BASE_MEDIA_FAILURE_ROOT_V001,
  PRESENTATION_OUTPUT_BASE_MEDIA_JOB_ROOT_V001,
  buildPresentationOutputBaseMediaFailureReportV001,
  buildPresentationOutputBaseMediaSuccessDocumentsV001,
  canonicalSha256PresentationOutputBaseMediaJsonV001,
  createPresentationOutputBaseMediaObservationsV001,
  inspectPresentationOutputBaseMediaCapabilityObservationV001,
  makePresentationOutputBaseMediaViolationV001,
  presentationOutputBaseMediaStageForCodeV001,
  resolvePresentationOutputBaseMediaExecutionFailureV001,
  serializePresentationOutputBaseMediaFormalJsonV001,
  validatePresentationOutputBaseMediaBuildJobV001,
  validatePresentationOutputBaseMediaCapabilityV001,
  validatePresentationOutputBaseMediaSuccessBundleV001,
  validatePresentationOutputMeaningPackageV001,
} from './presentation_output_base_media_v001.mjs';

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sameIdentity = (left, right) => left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs
  && left.nlink === right.nlink;
const singleRegular = value => value.isFile() && !value.isSymbolicLink() && value.nlink === 1n;

const resolveWorkspacePath = async (workspaceRoot, relativePath) => {
  if (typeof workspaceRoot !== 'string' || !WORKSPACE_PATH.test(relativePath ?? '')) {
    throw new Error('unsafe-workspace-path');
  }
  const rootReal = await realpath(workspaceRoot);
  const absolute = path.resolve(rootReal, relativePath);
  if (!absolute.startsWith(`${rootReal}${path.sep}`)) throw new Error('unsafe-workspace-path');
  return {rootReal, absolute};
};

const readAbsoluteStable = async absolute => {
  const beforePath = await lstat(absolute, {bigint: true});
  if (!singleRegular(beforePath) || await realpath(absolute) !== absolute) {
    throw new Error('unsafe-file');
  }
  const handle = await open(absolute, 'r');
  let bytes;
  let afterHandle;
  try {
    const beforeHandle = await handle.stat({bigint: true});
    if (!singleRegular(beforeHandle) || !sameIdentity(beforePath, beforeHandle)) {
      throw new Error('unstable-file');
    }
    bytes = await handle.readFile();
    afterHandle = await handle.stat({bigint: true});
    if (!singleRegular(afterHandle) || !sameIdentity(beforeHandle, afterHandle)) {
      throw new Error('unstable-file');
    }
  } finally {
    await handle.close();
  }
  const afterPath = await lstat(absolute, {bigint: true});
  if (!singleRegular(afterPath) || !sameIdentity(afterHandle, afterPath)
    || await realpath(absolute) !== absolute) throw new Error('unstable-file');
  return bytes;
};

const readStable = async (workspaceRoot, relativePath) => {
  const {absolute} = await resolveWorkspacePath(workspaceRoot, relativePath);
  return readAbsoluteStable(absolute);
};

const decodeStrict = bytes => {
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  return decoded.status === 'decoded' ? decoded.value : null;
};

const observeJsonBinding = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  const value = decodeStrict(bytes);
  if (hash(bytes) !== binding.fileSha256) return {status: 'binding-mismatch', bytes, value};
  if (value === null) return {status: 'invalid', bytes, value: null};
  let canonicalSha256;
  try { canonicalSha256 = canonicalSha256PresentationOutputBaseMediaJsonV001(value); } catch {
    return {status: 'invalid', bytes, value};
  }
  if (canonicalSha256 !== binding.canonicalSha256
    || value.schemaVersion !== binding.schemaVersion) {
    return {status: 'binding-mismatch', bytes, value, canonicalSha256};
  }
  return {status: 'passed', bytes, value, canonicalSha256};
};

const observeRetainedJsonBinding = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  const value = decodeStrict(bytes);
  if (hash(bytes) !== binding.fileSha256) return {status: 'binding-mismatch', bytes, value};
  if (value === null) return {status: 'invalid', bytes, value: null};
  let canonicalSha256;
  try { canonicalSha256 = canonicalSha256PresentationRetainedSourceAtomsV001(value); } catch {
    return {status: 'invalid', bytes, value};
  }
  if (canonicalSha256 !== binding.canonicalSha256
    || value.schemaVersion !== binding.schemaVersion) {
    return {status: 'binding-mismatch', bytes, value, canonicalSha256};
  }
  return {status: 'passed', bytes, value, canonicalSha256};
};

const observeMeaningPackageProvenance = async ({
  workspaceRoot,
  packageBinding,
  packageValue,
}) => {
  const formalBinding = packageValue?.provenance?.formalJobBinding;
  const semanticBinding = packageValue?.provenance?.semanticSelectionValidationBinding;
  if (!validatePresentationMeaningJsonBindingV001(formalBinding)
    || !validatePresentationMeaningJsonBindingV001(semanticBinding)) {
    return {status: 'invalid'};
  }
  const [formalObserved, semanticObserved] = await Promise.all([
    observeJsonBinding(workspaceRoot, formalBinding),
    observeJsonBinding(workspaceRoot, semanticBinding),
  ]);
  if (formalObserved.status === 'binding-mismatch'
    || semanticObserved.status === 'binding-mismatch') {
    return {status: 'binding-mismatch'};
  }
  if (formalObserved.status !== 'passed' || semanticObserved.status !== 'passed') {
    return {status: 'invalid'};
  }
  const formalJob = formalObserved.value;
  const semanticValidation = semanticObserved.value;
  let captionProjection;
  try {
    captionProjection = derivePresentationMeaningCaptionProjectionV001(packageValue.captions);
  } catch {
    return {status: 'invalid'};
  }
  if (!validatePresentationMeaningInformationPackageJobV001(formalJob)
    || !validatePresentationMeaningBoundaryValidationReportV001(semanticValidation)
    || formalJob.packageId !== packageValue.packageId
    || !same(formalJob.title, packageValue.title)
    || formalJob.outputPath !== packageBinding.path
    || !same(
      formalJob.timelineCompositionDecisionBinding,
      packageValue.provenance.timelineCompositionBinding,
    )
    || !same(
      formalJob.semanticSelectionValidationBinding,
      semanticBinding,
    )
    || !same(
      formalJob.semanticSelectionBinding,
      semanticValidation.selectionBinding,
    )
    || !same(semanticValidation.captionProjection, captionProjection)) {
    return {status: 'invalid'};
  }
  return {
    status: 'passed',
    bindings: [formalBinding, semanticBinding],
    formalJob,
    semanticValidation,
  };
};

const ensureSafeDirectoryChain = async (workspaceRoot, absoluteDirectory) => {
  const rootReal = await realpath(workspaceRoot);
  const relative = path.relative(rootReal, absoluteDirectory);
  if (relative === '' || path.isAbsolute(relative) || relative === '..'
    || relative.startsWith(`..${path.sep}`)) throw new Error('unsafe-directory');
  let current = rootReal;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    let item;
    try { item = await lstat(current, {bigint: true}); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await mkdir(current, {recursive: false});
      item = await lstat(current, {bigint: true});
    }
    if (!item.isDirectory() || item.isSymbolicLink() || await realpath(current) !== current) {
      throw new Error('unsafe-directory');
    }
  }
  return rootReal;
};

const lstatOrNull = async value => {
  try { return await lstat(value, {bigint: true}); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const removeOwnedDirectory = async (directory, identity) => {
  if (!identity) return;
  try {
    const current = await lstat(directory, {bigint: true});
    if (!current.isDirectory() || current.isSymbolicLink()
      || current.dev !== identity.dev || current.ino !== identity.ino
      || await realpath(directory) !== directory) return;
    await rm(directory, {recursive: true, force: false});
  } catch {}
};

const acquirePublicationAttempt = async ({workspaceRoot, outputRoot}) => {
  const {rootReal, absolute: outputDirectory} = await resolveWorkspacePath(
    workspaceRoot,
    outputRoot,
  );
  const parent = path.dirname(outputDirectory);
  await ensureSafeDirectoryChain(rootReal, parent);
  if (await lstatOrNull(outputDirectory)) return {status: 'target-exists'};
  const lockDirectory = `${outputDirectory}.publication-lock-v001`;
  try { await mkdir(lockDirectory, {recursive: false}); } catch (error) {
    if (error.code === 'EEXIST') return {status: 'target-exists'};
    throw error;
  }
  const lockIdentity = await lstat(lockDirectory, {bigint: true});
  if (!lockIdentity.isDirectory() || lockIdentity.isSymbolicLink()
    || await realpath(lockDirectory) !== lockDirectory) {
    await removeOwnedDirectory(lockDirectory, lockIdentity);
    throw new Error('unsafe-publication-lock');
  }
  let workDirectory;
  let workIdentity;
  try {
    workDirectory = await mkdtemp(path.join(parent, `.${path.basename(outputDirectory)}.work-`));
    workIdentity = await lstat(workDirectory, {bigint: true});
    if (!workIdentity.isDirectory() || workIdentity.isSymbolicLink()
      || await realpath(workDirectory) !== workDirectory) throw new Error('unsafe-work-directory');
    const internalDirectory = path.join(workDirectory, 'internal');
    const stagingDirectory = path.join(workDirectory, 'staging');
    await mkdir(internalDirectory);
    await mkdir(stagingDirectory);
    return {
      status: 'reserved', rootReal, outputDirectory, parent,
      lockDirectory, lockIdentity, workDirectory, workIdentity,
      internalDirectory, stagingDirectory,
    };
  } catch (error) {
    await removeOwnedDirectory(workDirectory, workIdentity);
    await removeOwnedDirectory(lockDirectory, lockIdentity);
    throw error;
  }
};

const releasePublicationAttempt = async attempt => {
  if (!attempt || attempt.status !== 'reserved') return;
  await removeOwnedDirectory(attempt.workDirectory, attempt.workIdentity);
  try {
    const current = await lstat(attempt.lockDirectory, {bigint: true});
    if (current.isDirectory() && !current.isSymbolicLink()
      && current.dev === attempt.lockIdentity.dev
      && current.ino === attempt.lockIdentity.ino
      && await realpath(attempt.lockDirectory) === attempt.lockDirectory) {
      await rmdir(attempt.lockDirectory);
    }
  } catch {}
};

const validateStagingSet = async stagingDirectory => {
  const names = (await readdir(stagingDirectory)).sort();
  const expected = [...PRESENTATION_OUTPUT_BASE_MEDIA_ARTIFACT_NAMES_V001].sort();
  if (!same(names, expected)) throw new Error('staging-set-invalid');
  const values = {};
  for (const name of expected) {
    const absolute = path.join(stagingDirectory, name);
    values[name] = await readAbsoluteStable(absolute);
  }
  return values;
};

const assertExpectedStaging = async (stagingDirectory, expectedFiles) => {
  const names = (await readdir(stagingDirectory)).sort();
  const expectedNames = expectedFiles.map(file => file.name).sort();
  if (!same(names, expectedNames)) throw new Error('staging-set-changed');
  for (const expected of expectedFiles) {
    const absolute = path.join(stagingDirectory, expected.name);
    if (await hashAbsoluteStableStreaming(absolute) !== expected.fileSha256) {
      throw new Error('staging-byte-changed');
    }
  }
};

const commitPublication = async (attempt, expectedFiles) => {
  await ensureSafeDirectoryChain(attempt.rootReal, attempt.parent);
  const lock = await lstat(attempt.lockDirectory, {bigint: true});
  if (!lock.isDirectory() || lock.isSymbolicLink()
    || lock.dev !== attempt.lockIdentity.dev || lock.ino !== attempt.lockIdentity.ino
    || await realpath(attempt.lockDirectory) !== attempt.lockDirectory) {
    throw new Error('publication-lock-changed');
  }
  if (await lstatOrNull(attempt.outputDirectory)) {
    const error = new Error('publication-target-exists');
    error.publicationTargetExists = true;
    throw error;
  }
  const work = await lstat(attempt.workDirectory, {bigint: true});
  if (!work.isDirectory() || work.isSymbolicLink()
    || work.dev !== attempt.workIdentity.dev || work.ino !== attempt.workIdentity.ino
    || await realpath(attempt.workDirectory) !== attempt.workDirectory
    || await realpath(attempt.stagingDirectory) !== attempt.stagingDirectory) {
    throw new Error('publication-work-changed');
  }
  await assertExpectedStaging(attempt.stagingDirectory, expectedFiles);
  await rename(attempt.stagingDirectory, attempt.outputDirectory);
  return {status: 'published', outputDirectory: attempt.outputDirectory};
};

const collectEnvironment = async executedAt => {
  try {
    const observed = await inspectPresentationBaseMediaToolBinaryDiagnosticsV001();
    const item = name => ({
      path: observed[name]?.resolvedPath ?? null,
      fileSha256: observed[name]?.fileSha256 ?? null,
    });
    const node = item('node');
    const ffmpeg = item('ffmpeg');
    const ffprobe = item('ffprobe');
    return {
      nodePath: node.path,
      nodeFileSha256: node.fileSha256,
      ffmpegPath: ffmpeg.path,
      ffmpegFileSha256: ffmpeg.fileSha256,
      ffprobePath: ffprobe.path,
      ffprobeFileSha256: ffprobe.fileSha256,
      executedAt,
    };
  } catch {
    return {
      nodePath: null,
      nodeFileSha256: null,
      ffmpegPath: null,
      ffmpegFileSha256: null,
      ffprobePath: null,
      ffprobeFileSha256: null,
      executedAt,
    };
  }
};

const publishSingleFileRoot = async ({workspaceRoot, directoryPath, fileName, bytes}) => {
  const attempt = await acquirePublicationAttempt({workspaceRoot, outputRoot: directoryPath});
  if (attempt.status !== 'reserved') return attempt;
  try {
    await writeFile(path.join(attempt.stagingDirectory, fileName), bytes, {flag: 'wx'});
    const names = await readdir(attempt.stagingDirectory);
    if (names.length !== 1 || names[0] !== fileName
      || !(await readAbsoluteStable(path.join(attempt.stagingDirectory, fileName))).equals(bytes)) {
      throw new Error('failure-staging-invalid');
    }
    await commitPublication(attempt, [{
      name: fileName,
      fileSha256: hash(bytes),
    }]);
    return {status: 'published'};
  } finally {
    await releasePublicationAttempt(attempt);
  }
};

const publishFailure = async context => {
  try {
    const environment = await collectEnvironment(context.executedAt);
    const report = buildPresentationOutputBaseMediaFailureReportV001({
      jobPath: context.jobPath,
      jobBytes: context.jobBytes,
      jobValue: context.jobValue,
      meaningPackageBinding: context.meaningPackageBinding,
      code: context.code ?? null,
      stage: context.stage,
      observations: createPresentationOutputBaseMediaObservationsV001(context.observations),
      environment,
    });
    const bytes = serializePresentationOutputBaseMediaFormalJsonV001(report);
    const failureDirectory = `${PRESENTATION_OUTPUT_BASE_MEDIA_FAILURE_ROOT_V001}`
      + `/${context.pathJobId}/${hash(context.jobBytes)}`;
    const published = await publishSingleFileRoot({
      workspaceRoot: context.workspaceRoot,
      directoryPath: failureDirectory,
      fileName: 'failure-report.json',
      bytes,
    });
    if (published.status !== 'published') throw new Error('failure-target-exists');
    return {
      status: report.status,
      exitCode: report.status === 'rejected' ? 1 : 2,
      failureReport: report,
      bytes,
    };
  } catch {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
};

const failCode = (context, code) => publishFailure({
  ...context,
  code,
  stage: presentationOutputBaseMediaStageForCodeV001(code),
});
const failExecution = (context, event, detail = {}) => {
  const ownership = resolvePresentationOutputBaseMediaExecutionFailureV001(event, detail);
  if (ownership === null) throw new TypeError('unknown output base-media execution failure');
  return publishFailure({...context, code: ownership.code, stage: ownership.stage});
};
const failFatal = (context, stage) => publishFailure({...context, code: null, stage});

/**
 * validation段のfile I/Oだけを内容検査から分離するproduction共用入口。
 * I/O失敗をhash graph違反へ読み替えず、違反なしのfatalとして保持する。
 */
export const observePresentationOutputBaseMediaValidationIoV001 = async operation => {
  if (typeof operation !== 'function') throw new TypeError('validation I/O operation is required');
  try {
    return {status: 'passed', value: await operation()};
  } catch {
    return {status: 'fatal', stage: 'validation', violations: []};
  }
};

/**
 * 公開直前のsource/tool再読もvalidation I/Oと同じfatal境界を通す。
 * 検査はこの実入口へI/O失敗を注入し、runnerと別の所有表を作らない。
 */
export const observePresentationOutputBaseMediaFinalIntegrityV001 = operation =>
  observePresentationOutputBaseMediaValidationIoV001(operation);

/**
 * staging済みbase mediaのhash再読もvalidation I/Oのfatal境界を通す。
 * runnerと検査が同じ実入口を使い、読取不能を内容不一致へ読み替えない。
 */
export const observePresentationOutputBaseMediaStagedMediaHashV001 = operation =>
  observePresentationOutputBaseMediaValidationIoV001(operation);

const validateToolEnvironmentObservation = async observed => {
  for (const name of ['node', 'ffmpeg', 'ffprobe']) {
    const item = observed?.[name];
    if (typeof item?.resolvedPath !== 'string'
      || !path.isAbsolute(item.resolvedPath)
      || typeof item.fileSha256 !== 'string'
      || await hashAbsoluteStableStreaming(item.resolvedPath) !== item.fileSha256) {
      return false;
    }
  }
  return true;
};

const rereadInputs = async ({workspaceRoot, jsonInputs, media}) => {
  for (const input of jsonInputs) {
    if (hash(await readStable(workspaceRoot, input.path)) !== input.fileSha256) {
      return input.role;
    }
  }
  if (await hashAbsoluteStableStreaming(media.absolutePath) !== media.fileSha256) return 'media';
  return null;
};

export async function runPresentationOutputBaseMediaJobV001({
  workspaceRoot,
  jobPath,
  executedAt = new Date().toISOString(),
}) {
  if (typeof workspaceRoot !== 'string' || typeof jobPath !== 'string' || !UTC.test(executedAt)) {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
  const prefix = `${PRESENTATION_OUTPUT_BASE_MEDIA_JOB_ROOT_V001}/`;
  if (!jobPath.startsWith(prefix) || !jobPath.endsWith('.json')
    || jobPath.slice(prefix.length, -5).includes('/')) {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
  const pathJobId = jobPath.slice(prefix.length, -5);
  if (!FORMAL_ID.test(pathJobId)) {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
  let jobBytes;
  try { jobBytes = await readStable(workspaceRoot, jobPath); } catch {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
  const jobValue = decodeStrict(jobBytes);
  const observations = {'job-file-sha256': hash(jobBytes)};
  let failureContext = {
    workspaceRoot,
    pathJobId,
    jobPath,
    jobBytes,
    jobValue,
    meaningPackageBinding: null,
    observations,
    executedAt,
  };
  const jobValidation = jobValue === null
    ? {status: 'rejected', violations: [
      makePresentationOutputBaseMediaViolationV001('OUTPUT_BASE_MEDIA_JOB_INVALID'),
    ]}
    : validatePresentationOutputBaseMediaBuildJobV001(jobValue);
  if (jobValidation.status !== 'passed' || jobValue.jobId !== pathJobId) {
    return failCode(
      failureContext,
      jobValidation.violations[0]?.code ?? 'OUTPUT_BASE_MEDIA_JOB_INVALID',
    );
  }
  const job = jobValue;
  failureContext = {...failureContext, meaningPackageBinding: job.meaningPackageBinding};

  let attempt;
  try { attempt = await acquirePublicationAttempt({workspaceRoot, outputRoot: job.outputRoot}); } catch {
    return failCode(failureContext, 'OUTPUT_BASE_MEDIA_PUBLICATION_FAILED');
  }
  if (attempt.status !== 'reserved') {
    return failCode(failureContext, 'OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID');
  }

  try {
    let packageObserved;
    try { packageObserved = await observeJsonBinding(workspaceRoot, job.meaningPackageBinding); } catch {
      return failFatal(failureContext, 'meaning-package-read');
    }
    observations['meaning-package-file-sha256'] = hash(packageObserved.bytes);
    if (packageObserved.status === 'binding-mismatch') {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH');
    }
    if (packageObserved.status !== 'passed'
      || !packageObserved.bytes.equals(
        serializePresentationOutputBaseMediaFormalJsonV001(packageObserved.value),
      )) {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
    }
    const packageValue = packageObserved.value;
    let provenanceObserved;
    try {
      provenanceObserved = await observeMeaningPackageProvenance({
        workspaceRoot,
        packageBinding: job.meaningPackageBinding,
        packageValue,
      });
    } catch {
      return failFatal(failureContext, 'meaning-package-read');
    }
    if (provenanceObserved.status === 'binding-mismatch') {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH');
    }
    if (provenanceObserved.status !== 'passed') {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
    }
    const timelineDecisionBinding = packageValue?.provenance?.timelineCompositionBinding;
    if (!validatePresentationMeaningJsonBindingV001(timelineDecisionBinding)
      || timelineDecisionBinding.schemaVersion
        !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001) {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
    }
    let timelineDecisionObserved;
    try {
      timelineDecisionObserved = await observeJsonBinding(workspaceRoot, timelineDecisionBinding);
    } catch {
      return failFatal(failureContext, 'meaning-package-read');
    }
    if (timelineDecisionObserved.status === 'binding-mismatch') {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH');
    }
    if (timelineDecisionObserved.status !== 'passed'
      || !validatePresentationTimelineCompositionDecisionV001(
        timelineDecisionObserved.value,
      )
      || !same(
        provenanceObserved.formalJob.timelineCompositionDecisionBinding,
        timelineDecisionBinding,
      )) {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
    }
    const timelineDecision = timelineDecisionObserved.value;
    if (!same(timelineDecision.sourceMedia, packageValue.sourceMedia)
      || !same(timelineDecision.segments, packageValue.timelineComposition.segments)) {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
    }
    const retainedSources = [];
    const retainedInputBindings = [...provenanceObserved.bindings];
    for (const timelineSource of timelineDecision.sourceMedia) {
      const retainedObserved = {};
      for (const name of ['sourceAtoms', 'generationManifest', 'validationReport']) {
        const binding = timelineSource.retainedSourceAtomsBinding[name];
        let observed;
        try { observed = await observeRetainedJsonBinding(workspaceRoot, binding); } catch {
          return failFatal(failureContext, 'meaning-package-read');
        }
        if (observed.status === 'binding-mismatch') {
          return failCode(failureContext, 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH');
        }
        if (observed.status !== 'passed') {
          return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
        }
        retainedObserved[name] = observed;
        retainedInputBindings.push(binding);
      }
      const retainedBundle = {
        sourceAtoms: retainedObserved.sourceAtoms.value,
        generationManifest: retainedObserved.generationManifest.value,
        validationReport: retainedObserved.validationReport.value,
        sourceAtomsBytes: retainedObserved.sourceAtoms.bytes,
        generationManifestBytes: retainedObserved.generationManifest.bytes,
        validationReportBytes: retainedObserved.validationReport.bytes,
      };
      if (validatePresentationRetainedSourceAtomsPublishedArtifactsV001(
        retainedBundle,
      ).status !== 'passed'
        || retainedBundle.sourceAtoms.sourceRef !== timelineSource.sourceRef) {
        return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
      }
      retainedSources.push({
        sourceMediaId: timelineSource.sourceMediaId,
        sourceAtoms: retainedBundle.sourceAtoms,
        generationManifest: retainedBundle.generationManifest,
        validationReport: retainedBundle.validationReport,
      });
    }
    const expectedOccurrences = derivePresentationExpectedAtomOccurrencesV001({
      timelineDecision,
      retainedSources,
    });
    if (expectedOccurrences.status !== 'passed'
      || validatePresentationOutputMeaningPackageV001(packageValue, {
        timelineDecision,
        expectedAtomOccurrences: expectedOccurrences.expectedAtomOccurrences,
        occurrenceAtoms: expectedOccurrences.occurrenceAtoms,
      }).status !== 'passed') {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
    }
    if (packageValue.packageId !== jobValidation.packageId
      || canonicalSha256PresentationOutputBaseMediaJsonV001(
        packageValue.timelineComposition,
      ) !== job.expectedTimelineCompositionCanonicalSha256) {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH');
    }
    const source = packageValue.sourceMedia[0];
    let identityObserved;
    try { identityObserved = await observeJsonBinding(workspaceRoot, source.sourceIdentityBinding); } catch {
      return failFatal(failureContext, 'meaning-package-read');
    }
    if (identityObserved.status === 'binding-mismatch') {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH');
    }
    if (identityObserved.status !== 'passed'
      || !validatePresentationSourceIdentityV001(identityObserved.value)
      || identityObserved.value.sourceRef !== source.sourceRef
      || !same(identityObserved.value.executionMedia, source.mediaBinding)) {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID');
    }
    let sourceAbsolute;
    try {
      const {absolute} = await resolveWorkspacePath(workspaceRoot, source.mediaBinding.path);
      sourceAbsolute = await assertSafePresentationBaseMediaInputPathV001(
        absolute,
        [await realpath(workspaceRoot)],
      );
      if (await hashAbsoluteStableStreaming(sourceAbsolute) !== source.mediaBinding.fileSha256) {
        return failCode(failureContext, 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH');
      }
    } catch {
      return failFatal(failureContext, 'meaning-package-read');
    }

    let toolEnvironmentBefore;
    try {
      toolEnvironmentBefore = await inspectPresentationBaseMediaToolBinaryDiagnosticsV001();
      if (!await validateToolEnvironmentObservation(toolEnvironmentBefore)) {
        return failExecution(failureContext, 'source-inspection-failed');
      }
    } catch {
      return failExecution(failureContext, 'source-inspection-failed');
    }
    let sourceInspection;
    try { sourceInspection = await inspectPresentationBaseMediaSourceV001(sourceAbsolute); } catch {
      return failExecution(failureContext, 'source-inspection-failed');
    }
    observations['source-frame-count'] = sourceInspection.decodedFrameCount;
    const capabilityObservation = inspectPresentationOutputBaseMediaCapabilityObservationV001({
      capabilitySupported: validatePresentationOutputBaseMediaCapabilityV001(
        packageValue,
        sourceInspection,
      ),
    });
    if (capabilityObservation.status !== 'passed') {
      return publishFailure({
        ...failureContext,
        code: capabilityObservation.violations[0].code,
        stage: capabilityObservation.stage,
      });
    }
    const segmentPlan = validatePresentationBaseMediaSegmentPlanV001(
      packageValue.timelineComposition.segments.map(segment => ({
        sourceStartMs: segment.sourceStartMs,
        sourceEndMs: segment.sourceEndMs,
      })),
      {
        fps: sourceInspection.fps,
        decodedFrameCount: sourceInspection.decodedFrameCount,
        logicalFrameCount: sourceInspection.logicalFrameCount,
      },
      sourceInspection.audioClock,
    );
    if (segmentPlan.status !== 'passed'
      || segmentPlan.mappings.some((mapping, index) =>
        mapping.segmentId !== packageValue.timelineComposition.segments[index].segmentId)) {
      return failExecution(failureContext, 'frame-mapping-invalid');
    }
    const mappings = segmentPlan.mappings;
    const frameCount = mappings.at(-1).outputEndFrame;
    observations['mapped-output-frame-count'] = frameCount;

    const temporaryVideo = path.join(attempt.internalDirectory, 'video-only.mp4');
    try {
      await buildPresentationBaseMediaVideoV001(
        sourceAbsolute,
        temporaryVideo,
        sourceInspection.fps,
        mappings,
      );
      const videoInspection = await inspectPresentationBaseMediaOutputV001(
        temporaryVideo,
        frameCount,
        null,
        {present: false},
      );
      observations['built-video-frame-count'] = videoInspection.frameCount;
    } catch {
      return failExecution(failureContext, 'video-build-failed');
    }

    try { buildPresentationAudioGridPlacementPlanV001(sourceInspection.audioClock); } catch {
      return failExecution(failureContext, 'audio-grid-failed');
    }
    let audioData;
    try {
      audioData = await buildPresentationBaseMediaAudioV001(
        sourceAbsolute,
        attempt.internalDirectory,
        sourceInspection.audioClock,
        mappings,
      );
    } catch (error) {
      return failExecution(failureContext, 'audio-build-error', {
        errorPath: error?.violation?.path ?? '',
      });
    }
    if (!audioData.present || !Number.isSafeInteger(audioData.encodeSampleCount)
      || audioData.encodeSampleCount <= 0) {
      return failExecution(failureContext, 'audio-build-failed');
    }
    observations['built-audio-sample-count'] = audioData.encodeSampleCount;

    const stagedBaseMedia = path.join(attempt.stagingDirectory, 'base-media.mp4');
    try {
      await muxPresentationBaseMediaV001(
        temporaryVideo,
        stagedBaseMedia,
        sourceInspection.audioClock,
        audioData,
      );
    } catch {
      return failExecution(failureContext, 'mux-failed');
    }
    let outputInspection;
    try {
      outputInspection = await inspectPresentationBaseMediaOutputV001(
        stagedBaseMedia,
        frameCount,
        sourceInspection.audioClock,
        audioData,
      );
    } catch {
      return failExecution(failureContext, 'output-inspection-failed');
    }
    if (outputInspection.frameCount !== frameCount
      || outputInspection.audio?.presentationDurationSamples !== audioData.encodeSampleCount) {
      return failExecution(failureContext, 'output-inspection-failed');
    }
    const stagedMediaHashIo = await observePresentationOutputBaseMediaStagedMediaHashV001(
      () => hashAbsoluteStableStreaming(stagedBaseMedia),
    );
    if (stagedMediaHashIo.status !== 'passed') {
      return failFatal(failureContext, stagedMediaHashIo.stage);
    }
    const baseMediaFileSha256 = stagedMediaHashIo.value;
    observations['output-file-sha256'] = baseMediaFileSha256;

    let documents;
    try {
      documents = buildPresentationOutputBaseMediaSuccessDocumentsV001({
        job,
        jobPath,
        jobBytes,
        packageValue,
        sourceIdentity: identityObserved.value,
        sourceInspection,
        mappings,
        baseMediaFileSha256,
        frameCount,
        sampleCount: audioData.encodeSampleCount,
        audioPacketPayloadSha256: outputInspection.audio.packetPayloadSha256,
      });
    } catch {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH');
    }
    const initialStagingIo = await observePresentationOutputBaseMediaValidationIoV001(
      async () => {
        await Promise.all([
        writeFile(path.join(attempt.stagingDirectory, 'timeline.json'), documents.timelineBytes, {flag: 'wx'}),
        writeFile(path.join(attempt.stagingDirectory, 'generation-manifest.json'), documents.manifestBytes, {flag: 'wx'}),
        writeFile(path.join(attempt.stagingDirectory, 'validation-receipt.json'), documents.receiptBytes, {flag: 'wx'}),
        ]);
        return validateStagingSet(attempt.stagingDirectory);
      },
    );
    if (initialStagingIo.status !== 'passed') {
      return failFatal(failureContext, initialStagingIo.stage);
    }
    try {
      const staged = initialStagingIo.value;
      const validation = validatePresentationOutputBaseMediaSuccessBundleV001({
        job,
        jobPath,
        jobBytes,
        packageValue,
        packageBytes: packageObserved.bytes,
        sourceIdentity: identityObserved.value,
        sourceInspection,
        outputInspection,
        baseMediaBytes: staged['base-media.mp4'],
        timelineBytes: staged['timeline.json'],
        timeline: decodeStrict(staged['timeline.json']),
        manifestBytes: staged['generation-manifest.json'],
        manifest: decodeStrict(staged['generation-manifest.json']),
        receiptBytes: staged['validation-receipt.json'],
        receipt: decodeStrict(staged['validation-receipt.json']),
      });
      if (validation.status !== 'passed') {
        return failCode(failureContext, 'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH');
      }
    } catch {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH');
    }

    let changed;
    try {
      changed = await rereadInputs({
        workspaceRoot,
        jsonInputs: [
          {role: 'job', path: jobPath, fileSha256: hash(jobBytes)},
          {role: 'package', ...job.meaningPackageBinding},
          {role: 'timeline-decision', ...timelineDecisionBinding},
          ...retainedInputBindings.map(binding => ({role: 'retained-source', ...binding})),
          {role: 'identity', ...source.sourceIdentityBinding},
        ],
        media: {absolutePath: sourceAbsolute, fileSha256: source.mediaBinding.fileSha256},
      });
    } catch {
      return failFatal(failureContext, 'validation');
    }
    if (changed !== null) {
      return failCode(
        failureContext,
        changed === 'job'
          ? 'OUTPUT_BASE_MEDIA_JOB_INVALID'
          : 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH',
      );
    }
    let finalOutputInspection;
    try {
      finalOutputInspection = await inspectPresentationBaseMediaOutputV001(
        stagedBaseMedia,
        frameCount,
        sourceInspection.audioClock,
        audioData,
      );
    } catch {
      return failExecution(failureContext, 'output-inspection-failed');
    }
    const finalIntegrityIo = await observePresentationOutputBaseMediaFinalIntegrityV001(
      async () => {
        const toolEnvironmentAfter =
          await inspectPresentationBaseMediaToolBinaryDiagnosticsV001();
        return {
          sourceFileSha256: await hashAbsoluteStableStreaming(sourceAbsolute),
          toolEnvironmentAfter,
          toolEnvironmentAfterValid:
            await validateToolEnvironmentObservation(toolEnvironmentAfter),
        };
      },
    );
    if (finalIntegrityIo.status !== 'passed') {
      return failFatal(failureContext, finalIntegrityIo.stage);
    }
    if (finalIntegrityIo.value.sourceFileSha256 !== source.mediaBinding.fileSha256
      || !finalIntegrityIo.value.toolEnvironmentAfterValid
      || !same(toolEnvironmentBefore, finalIntegrityIo.value.toolEnvironmentAfter)) {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH');
    }
    let finalStagingFiles;
    const finalStagingIo = await observePresentationOutputBaseMediaValidationIoV001(
      () => validateStagingSet(attempt.stagingDirectory),
    );
    if (finalStagingIo.status !== 'passed') {
      return failFatal(failureContext, finalStagingIo.stage);
    }
    try {
      const staged = finalStagingIo.value;
      const validation = validatePresentationOutputBaseMediaSuccessBundleV001({
        job,
        jobPath,
        jobBytes,
        packageValue,
        packageBytes: packageObserved.bytes,
        sourceIdentity: identityObserved.value,
        sourceInspection,
        outputInspection: finalOutputInspection,
        baseMediaBytes: staged['base-media.mp4'],
        timelineBytes: staged['timeline.json'],
        timeline: decodeStrict(staged['timeline.json']),
        manifestBytes: staged['generation-manifest.json'],
        manifest: decodeStrict(staged['generation-manifest.json']),
        receiptBytes: staged['validation-receipt.json'],
        receipt: decodeStrict(staged['validation-receipt.json']),
      });
      if (validation.status !== 'passed') {
        return failCode(failureContext, 'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH');
      }
      finalStagingFiles = Object.entries(staged).map(([name, bytes]) => ({
        name,
        fileSha256: hash(bytes),
      }));
    } catch {
      return failCode(failureContext, 'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH');
    }
    try { await commitPublication(attempt, finalStagingFiles); } catch (error) {
      return failCode(
        failureContext,
        error?.publicationTargetExists
          ? 'OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID'
          : 'OUTPUT_BASE_MEDIA_PUBLICATION_FAILED',
      );
    }
    return {
      status: 'passed',
      exitCode: 0,
      receipt: documents.receipt,
      bytes: documents.receiptBytes,
      outputRoot: job.outputRoot,
    };
  } finally {
    await releasePublicationAttempt(attempt);
  }
}

export async function runPresentationOutputBaseMediaJobCliV001(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || argv.length !== 1) return 2;
  let result;
  try {
    result = await runPresentationOutputBaseMediaJobV001({
      workspaceRoot: process.cwd(),
      jobPath: argv[0],
    });
  } catch {
    return 2;
  }
  if (result.bytes) process.stdout.write(result.bytes);
  return result.exitCode;
}

const isDirect = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  void runPresentationOutputBaseMediaJobCliV001().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
