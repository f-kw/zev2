import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {
  lstat,
  open,
  realpath,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  createPresentationMeaningOwnedStagingRootV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  readPresentationMeaningWorkspaceFileStableV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  inspectFrameCountWithToolV001,
} from './render_presentation_v002.mjs';
import {
  inspectRenderedMediaWithToolsV001,
} from './presentation_renderer_qc_v002.mjs';
import {
  validatePresentationVerticalCropSourceBindingV001,
} from './render_presentation_vertical_review_v001.ts';
import {
  PRESENTATION_OUTPUT_CROP_APPLICATION_FAILURE_REPORT_SCHEMA_V001,
  PRESENTATION_OUTPUT_CROP_APPLICATION_FAILURE_ROOT_V001,
  PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_ROOT_V001,
  PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_SCHEMA_V001,
  buildPresentationOutputCropApplicationV001,
  canonicalSha256PresentationOutputFiniteJsonV001,
  decodePresentationOutputFiniteJsonV001,
  makePresentationOutputCropApplicationViolationV001,
  serializePresentationOutputCropApplicationFormalJsonV001,
  sha256PresentationOutputCropApplicationBytesV001,
  validatePresentationOutputCropApplicationJobV001,
} from './presentation_output_crop_application_v001.mjs';

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;

const hash = sha256PresentationOutputCropApplicationBytesV001;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sameIdentity = (left, right) => left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs
  && left.nlink === right.nlink;
const singleRegular = value => value.isFile() && !value.isSymbolicLink() && value.nlink === 1n;

const FAILURE_STAGE = Object.freeze({
  CROP_APPLICATION_JOB_INVALID: 'job-validation',
  CROP_APPLICATION_RUN_INPUT_MISMATCH: 'run-input-validation',
  CROP_APPLICATION_REVIEWED_BINDING_MISMATCH: 'reviewed-crop-validation',
  CROP_APPLICATION_TARGET_BINDING_MISMATCH: 'target-base-media-validation',
  CROP_APPLICATION_SOURCE_IDENTITY_MISMATCH: 'equivalence-validation',
  CROP_APPLICATION_TIMELINE_MISMATCH: 'equivalence-validation',
  CROP_APPLICATION_MEDIA_GEOMETRY_MISMATCH: 'equivalence-validation',
  CROP_APPLICATION_SELECTION_PROJECTION_MISMATCH: 'reviewed-crop-validation',
  CROP_APPLICATION_PUBLICATION_TARGET_INVALID: 'publication',
  CROP_APPLICATION_PUBLICATION_FAILED: 'publication',
});

const readStable = (workspaceRoot, relativePath) =>
  readPresentationMeaningWorkspaceFileStableV001({workspaceRoot, relativePath});

const readAbsoluteStable = async absolutePath => {
  if (typeof absolutePath !== 'string' || !path.isAbsolute(absolutePath)) {
    throw new Error('runtime-path-invalid');
  }
  const beforePath = await lstat(absolutePath, {bigint: true});
  if (!singleRegular(beforePath) || await realpath(absolutePath) !== absolutePath) {
    throw new Error('runtime-file-unsafe');
  }
  const handle = await open(absolutePath, 'r');
  let bytes;
  let afterHandle;
  try {
    const beforeHandle = await handle.stat({bigint: true});
    if (!singleRegular(beforeHandle) || !sameIdentity(beforePath, beforeHandle)) {
      throw new Error('runtime-file-unstable');
    }
    bytes = await handle.readFile();
    afterHandle = await handle.stat({bigint: true});
    if (!singleRegular(afterHandle) || !sameIdentity(beforeHandle, afterHandle)) {
      throw new Error('runtime-file-unstable');
    }
  } finally {
    await handle.close();
  }
  const afterPath = await lstat(absolutePath, {bigint: true});
  if (!singleRegular(afterPath) || !sameIdentity(afterHandle, afterPath)
    || await realpath(absolutePath) !== absolutePath) {
    throw new Error('runtime-file-unstable');
  }
  return bytes;
};

// Runtime profiles bind the command path presented to the process, while
// Homebrew legitimately exposes that path as a symlink.  Inspect the canonical
// target as a stable regular file and make the symlink target part of the
// before/after observation instead of treating the bound path as an artifact.
const readBoundRuntimeToolStable = async boundPath => {
  if (typeof boundPath !== 'string' || !path.isAbsolute(boundPath)) {
    throw new Error('runtime-path-invalid');
  }
  const beforeTarget = await realpath(boundPath);
  const bytes = await readAbsoluteStable(beforeTarget);
  const afterTarget = await realpath(boundPath);
  if (afterTarget !== beforeTarget) throw new Error('runtime-file-unstable');
  return bytes;
};

const runVersion = (executable, argument) => new Promise((resolve, reject) => {
  const child = spawn(executable, [argument], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', chunk => stdout.push(chunk));
  child.stderr.on('data', chunk => stderr.push(chunk));
  child.once('error', reject);
  child.once('close', code => resolve({
    code,
    stdout: Buffer.concat(stdout),
    stderr: Buffer.concat(stderr),
  }));
});

const firstLine = bytes => bytes.toString('utf8').split(/\r?\n/u)[0];

const observeRuntimeProfile = async runtimeProfile => {
  const observed = {};
  for (const name of ['ffmpeg', 'ffprobe']) {
    const binding = runtimeProfile[name];
    const bytes = await readBoundRuntimeToolStable(binding.path);
    if (hash(bytes) !== binding.fileSha256) throw new Error('runtime-hash-mismatch');
    const version = await runVersion(binding.path, '-version');
    if (version.code !== 0 || version.stderr.length !== 0
      || firstLine(version.stdout) !== binding.version) {
      throw new Error('runtime-version-mismatch');
    }
    observed[name] = {path: binding.path, fileSha256: binding.fileSha256};
  }
  return observed;
};

const decodeFormal = bytes => {
  const decoded = decodePresentationOutputFiniteJsonV001(bytes);
  if (decoded.status !== 'decoded') throw new Error('json-invalid');
  return decoded.value;
};

const observeJsonBinding = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  if (hash(bytes) !== binding.fileSha256) throw new Error('binding-file-sha-mismatch');
  const value = decodeFormal(bytes);
  if (value.schemaVersion !== binding.schemaVersion
    || canonicalSha256PresentationOutputFiniteJsonV001(value)
      !== binding.canonicalSha256) {
    throw new Error('binding-canonical-sha-mismatch');
  }
  return {
    bytes,
    value,
    absolutePath: path.resolve(await realpath(workspaceRoot), binding.path),
  };
};

const observeMediaBinding = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  if (hash(bytes) !== binding.fileSha256) throw new Error('media-binding-sha-mismatch');
  return {
    bytes,
    absolutePath: path.resolve(await realpath(workspaceRoot), binding.path),
  };
};

const bindingEntries = job => [
  ['run-input', job.runInputRecordBinding],
  ['reviewed-decision', job.reviewedCrop.decision],
  ['reviewed-selection', job.reviewedCrop.selectionPackageManifest],
  ['reviewed-base-media', job.reviewedCrop.reviewedBaseMedia.baseMedia],
  ['reviewed-timeline', job.reviewedCrop.reviewedBaseMedia.timeline],
  ['reviewed-generation-manifest', job.reviewedCrop.reviewedBaseMedia.generationManifest],
  ['reviewed-validation-report', job.reviewedCrop.reviewedBaseMedia.validationReport],
  ['target-base-media', job.targetBaseMedia.baseMedia],
  ['target-timeline', job.targetBaseMedia.timeline],
  ['target-generation-manifest', job.targetBaseMedia.generationManifest],
  ['target-validation-receipt', job.targetBaseMedia.validationReceipt],
  ...job.implementationBindings.map(binding => [`implementation:${binding.role}`, binding]),
];

const rereadTracked = async (workspaceRoot, tracked, runtimeProfile) => {
  for (const [role, binding] of tracked) {
    if (hash(await readStable(workspaceRoot, binding.path)) !== binding.fileSha256) {
      return {status: 'mismatch', role};
    }
  }
  for (const name of ['ffmpeg', 'ffprobe']) {
    const binding = runtimeProfile[name];
    if (hash(await readBoundRuntimeToolStable(binding.path)) !== binding.fileSha256) {
      return {status: 'mismatch', role: `runtime:${name}`};
    }
  }
  return {status: 'passed', role: null};
};

const rereadViolationCode = role => {
  if (role === 'run-input') return 'CROP_APPLICATION_RUN_INPUT_MISMATCH';
  if (typeof role === 'string' && role.startsWith('reviewed-')) {
    return 'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH';
  }
  if (typeof role === 'string' && role.startsWith('target-')) {
    return 'CROP_APPLICATION_TARGET_BINDING_MISMATCH';
  }
  if (role === 'job' || (typeof role === 'string' && role.startsWith('implementation:'))) {
    return 'CROP_APPLICATION_JOB_INVALID';
  }
  return null;
};

const inspectBaseMedia = async ({absolutePath, runtimeProfile}) => {
  const [media, frameCount] = await Promise.all([
    inspectRenderedMediaWithToolsV001(absolutePath, {
      ffmpegPath: runtimeProfile.ffmpeg.path,
      ffprobePath: runtimeProfile.ffprobe.path,
    }),
    inspectFrameCountWithToolV001(absolutePath, runtimeProfile.ffprobe.path),
  ]);
  const fps = media?.video?.fps;
  if (!media?.video || !Number.isSafeInteger(frameCount) || frameCount <= 0
    || !Number.isSafeInteger(fps) || fps <= 0
    || media.video.frameCount !== frameCount) {
    throw new Error('media-inspection-invalid');
  }
  return {
    width: media.video.width,
    height: media.video.height,
    frameRate: `${fps}/1`,
    frameCount,
  };
};

const failureReport = ({jobPath, jobBytes, jobValue, status, stage, code, executedAt}) => {
  let canonicalSha256 = null;
  if (jobValue !== null) {
    try { canonicalSha256 = canonicalSha256PresentationOutputFiniteJsonV001(jobValue); } catch {}
  }
  const jobFileSha256 = hash(jobBytes);
  return {
    schemaVersion: PRESENTATION_OUTPUT_CROP_APPLICATION_FAILURE_REPORT_SCHEMA_V001,
    failureId: `crop-application-failure-${jobFileSha256.slice(0, 32)}`,
    status,
    stage,
    jobFileObservation: {
      path: jobPath,
      fileSha256: jobFileSha256,
      canonicalSha256,
    },
    violations: code === null ? [] : [makePresentationOutputCropApplicationViolationV001(code)],
    retainedPaths: [],
    executedAt,
  };
};

const publishOneFileRoot = async ({workspaceRoot, directoryPath, fileName, bytes}) => {
  let claim;
  try {
    claim = await createPresentationMeaningOwnedStagingRootV001({
      workspaceRoot,
      relativeOutputRoot: directoryPath,
    });
  } catch (error) {
    if (error?.message === 'publication-target-exists') return {status: 'target-exists'};
    throw error;
  }
  await writeFile(path.join(claim.stagingAbsolute, fileName), bytes, {flag: 'wx'});
  return publishPresentationMeaningOwnedStagingRootNoReplaceV001({
    claim,
    expectedRelativeFiles: [fileName],
  });
};

const publishFailure = async ({
  workspaceRoot,
  pathJobId,
  jobPath,
  jobBytes,
  jobValue,
  code = null,
  stage,
  executedAt,
}) => {
  try {
    const status = code === null || code === 'CROP_APPLICATION_PUBLICATION_FAILED'
      ? 'fatal' : 'rejected';
    const value = failureReport({
      jobPath,
      jobBytes,
      jobValue,
      status,
      stage,
      code,
      executedAt,
    });
    const bytes = serializePresentationOutputCropApplicationFormalJsonV001(value);
    const directoryPath = `${PRESENTATION_OUTPUT_CROP_APPLICATION_FAILURE_ROOT_V001}`
      + `/${pathJobId}/${hash(jobBytes)}`;
    const publication = await publishOneFileRoot({
      workspaceRoot,
      directoryPath,
      fileName: 'failure-report.json',
      bytes,
    });
    if (publication.status !== 'published') throw new Error('failure-target-exists');
    return {status, exitCode: status === 'rejected' ? 1 : 2, bytes, failureReport: value};
  } catch {
    return {status: 'fatal', exitCode: 2, bytes: null, failureReport: null};
  }
};

const failCode = (context, code) => publishFailure({
  ...context,
  code,
  stage: FAILURE_STAGE[code],
});
const failFatal = (context, stage) => publishFailure({...context, code: null, stage});

export async function runPresentationOutputCropApplicationJobV001({
  workspaceRoot,
  jobPath,
  executedAt = new Date().toISOString(),
}) {
  if (typeof workspaceRoot !== 'string' || typeof jobPath !== 'string'
    || !UTC.test(executedAt)) {
    return {status: 'fatal', exitCode: 2, bytes: null, failureReport: null};
  }
  const prefix = `${PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_ROOT_V001}/`;
  if (!jobPath.startsWith(prefix) || !jobPath.endsWith('.json')
    || jobPath.slice(prefix.length, -5).includes('/')) {
    return {status: 'fatal', exitCode: 2, bytes: null, failureReport: null};
  }
  const pathJobId = jobPath.slice(prefix.length, -5);
  if (!FORMAL_ID.test(pathJobId)) {
    return {status: 'fatal', exitCode: 2, bytes: null, failureReport: null};
  }
  let jobBytes;
  try { jobBytes = await readStable(workspaceRoot, jobPath); } catch {
    return {status: 'fatal', exitCode: 2, bytes: null, failureReport: null};
  }
  let jobValue = null;
  try { jobValue = decodeFormal(jobBytes); } catch {}
  const failureContext = {
    workspaceRoot,
    pathJobId,
    jobPath,
    jobBytes,
    jobValue,
    executedAt,
  };
  const jobValidation = jobValue === null
    ? {status: 'rejected'}
    : validatePresentationOutputCropApplicationJobV001(jobValue);
  if (jobValidation.status !== 'passed' || jobValue.jobId !== pathJobId) {
    return failCode(failureContext, 'CROP_APPLICATION_JOB_INVALID');
  }
  const job = jobValue;
  const tracked = [
    ['job', {path: jobPath, fileSha256: hash(jobBytes)}],
    ...bindingEntries(job),
  ];
  try {
    await observeRuntimeProfile(job.runtimeProfile);
    for (const binding of job.implementationBindings) {
      if (hash(await readStable(workspaceRoot, binding.path)) !== binding.fileSha256) {
        return failCode(failureContext, 'CROP_APPLICATION_JOB_INVALID');
      }
    }
  } catch {
    return failFatal(failureContext, 'job-validation');
  }

  let runInput;
  try {
    runInput = await observeJsonBinding(workspaceRoot, job.runInputRecordBinding);
  } catch {
    return failCode(failureContext, 'CROP_APPLICATION_RUN_INPUT_MISMATCH');
  }
  let reviewedInputs;
  try {
    reviewedInputs = {
      decision: await observeJsonBinding(workspaceRoot, job.reviewedCrop.decision),
      selection: await observeJsonBinding(
        workspaceRoot,
        job.reviewedCrop.selectionPackageManifest,
      ),
      reviewedBaseMedia: await observeMediaBinding(
        workspaceRoot,
        job.reviewedCrop.reviewedBaseMedia.baseMedia,
      ),
      reviewedTimeline: await observeJsonBinding(
        workspaceRoot,
        job.reviewedCrop.reviewedBaseMedia.timeline,
      ),
      reviewedManifest: await observeJsonBinding(
        workspaceRoot,
        job.reviewedCrop.reviewedBaseMedia.generationManifest,
      ),
      reviewedReport: await observeJsonBinding(
        workspaceRoot,
        job.reviewedCrop.reviewedBaseMedia.validationReport,
      ),
    };
  } catch {
    return failCode(failureContext, 'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH');
  }
  let targetInputs;
  try {
    targetInputs = {
      targetBaseMedia: await observeMediaBinding(workspaceRoot, job.targetBaseMedia.baseMedia),
      targetTimeline: await observeJsonBinding(workspaceRoot, job.targetBaseMedia.timeline),
      targetManifest: await observeJsonBinding(
        workspaceRoot,
        job.targetBaseMedia.generationManifest,
      ),
      targetReceipt: await observeJsonBinding(
        workspaceRoot,
        job.targetBaseMedia.validationReceipt,
      ),
    };
  } catch {
    return failCode(failureContext, 'CROP_APPLICATION_TARGET_BINDING_MISMATCH');
  }
  const inputs = {runInput, ...reviewedInputs, ...targetInputs};

  try {
    const reviewedSourceValidation = await validatePresentationVerticalCropSourceBindingV001({
      cropDecisionArtifact: {
        value: inputs.decision.value,
        absolutePath: inputs.decision.absolutePath,
      },
      baseMediaBinding: job.reviewedCrop.reviewedBaseMedia.baseMedia,
    });
    if (reviewedSourceValidation.status !== 'passed') {
      return failCode(failureContext, 'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH');
    }
  } catch {
    return failCode(failureContext, 'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH');
  }

  let reviewedMediaInspection;
  let targetMediaInspection;
  try {
    [reviewedMediaInspection, targetMediaInspection] = await Promise.all([
      inspectBaseMedia({
        absolutePath: inputs.reviewedBaseMedia.absolutePath,
        runtimeProfile: job.runtimeProfile,
      }),
      inspectBaseMedia({
        absolutePath: inputs.targetBaseMedia.absolutePath,
        runtimeProfile: job.runtimeProfile,
      }),
    ]);
    const reread = await rereadTracked(workspaceRoot, tracked, job.runtimeProfile);
    if (reread.status !== 'passed') {
      const code = rereadViolationCode(reread.role);
      return code === null
        ? failFatal(failureContext, 'job-validation')
        : failCode(failureContext, code);
    }
  } catch {
    return failCode(failureContext, 'CROP_APPLICATION_MEDIA_GEOMETRY_MISMATCH');
  }

  let application;
  try {
    application = await buildPresentationOutputCropApplicationV001({
      job,
      jobPath,
      jobBytes,
      runInputRecord: inputs.runInput.value,
      cropDecision: inputs.decision.value,
      selectionPackageManifest: inputs.selection.value,
      reviewedTimeline: inputs.reviewedTimeline.value,
      reviewedGenerationManifest: inputs.reviewedManifest.value,
      reviewedValidationReport: inputs.reviewedReport.value,
      targetTimeline: inputs.targetTimeline.value,
      targetGenerationManifest: inputs.targetManifest.value,
      targetValidationReceipt: inputs.targetReceipt.value,
      reviewedMediaInspection,
      targetMediaInspection,
    });
  } catch (error) {
    const code = error?.violationCode;
    return code && FAILURE_STAGE[code]
      ? failCode(failureContext, code)
      : failFatal(failureContext, 'equivalence-validation');
  }
  const bytes = serializePresentationOutputCropApplicationFormalJsonV001(application);
  const finalReread = await rereadTracked(workspaceRoot, tracked, job.runtimeProfile);
  if (finalReread.status !== 'passed') {
    const code = rereadViolationCode(finalReread.role);
    return code === null
      ? failFatal(failureContext, 'job-validation')
      : failCode(failureContext, code);
  }
  const outputRoot = path.posix.dirname(job.outputPath);
  const outputName = path.posix.basename(job.outputPath);
  let publication;
  try {
    publication = await publishOneFileRoot({
      workspaceRoot,
      directoryPath: outputRoot,
      fileName: outputName,
      bytes,
    });
  } catch {
    return failCode(failureContext, 'CROP_APPLICATION_PUBLICATION_FAILED');
  }
  if (publication.status !== 'published') {
    return failCode(failureContext, 'CROP_APPLICATION_PUBLICATION_TARGET_INVALID');
  }
  return {
    status: 'passed',
    exitCode: 0,
    application,
    bytes,
    outputPath: job.outputPath,
  };
}

export async function runPresentationOutputCropApplicationJobCliV001(
  argv = process.argv.slice(2),
) {
  if (!Array.isArray(argv) || argv.length !== 1) return 2;
  let result;
  try {
    result = await runPresentationOutputCropApplicationJobV001({
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
  void runPresentationOutputCropApplicationJobCliV001().then(exitCode => {
    process.exitCode = exitCode;
  });
}
