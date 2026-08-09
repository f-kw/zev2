#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {
  lstat,
  open,
  readdir,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  observePresentationMeaningWorkspaceFileStableStreamingV001,
  readPresentationMeaningWorkspaceFileStableV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  decodePresentationOutputFiniteJsonV001,
} from './presentation_output_crop_application_v001.mjs';
import {
  PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001,
  validatePresentationOutputAcceptanceReportV001,
  validatePresentationOutputFormalJobV001,
  validatePresentationOutputRequestV001,
} from './presentation_output_contract_v001.mjs';
import {
  validatePresentationOutputRenderApplicationResultsV001,
  validatePresentationOutputRenderManifestV001,
  validatePresentationOutputRenderPlanV001,
  validatePresentationOutputRenderQcV001,
} from './presentation_output_render_plan_v001.mjs';
import {
  evaluatePresentationRendererQcWithProfileV001,
  inspectRenderedMediaWithToolsV001,
} from './presentation_renderer_qc_v002.mjs';
import {
  buildPresentationFatalObservationV002,
  classifyPresentationFatalInnerCodeV002,
} from './presentation_fatal_observation_v002.mjs';
import {
  commitValidatedPresentationArtifactsV002,
  executeValidatedPresentationDrawAndQcV001,
} from './render_presentation_v002.mjs';
import {
  ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001,
  ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001,
  ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001,
  ZEVO_TITLE_OUTPUT_MANIFEST_SCHEMA_V001,
  ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001,
  ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001,
  buildZevoTitleCommonCorePlanV001,
  buildZevoTitleDisplayPlanV001,
  buildZevoTitleOutputManifestV001,
  buildZevoTitleOutputQcV001,
  buildZevoTitleRendererEvidenceV001,
  canonicalSha256ZevoTitleJsonV001,
  serializeZevoTitleFormalJsonV001,
  validateZevoTitleDisplayPlanV001,
  validateZevoTitleMeaningReplacementV001,
  validateZevoTitleOutputJobV001,
  validateZevoTitleOutputManifestV001,
  validateZevoTitleOutputQcV001,
  validateZevoTitleRendererEvidenceV001,
  validateZevoTitleStyleRegistryV001,
} from './presentation_output_title_compositor_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;

export const ZEVO_TITLE_OUTPUT_JOB_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/title-output-jobs';
export const ZEVO_TITLE_OUTPUT_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/title-output-renders';
export const ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001 = Object.freeze({
  video: 'title-rendered-v001.mp4',
  overlays: 'overlays',
  plan: 'title-display-plan-v001.json',
  applicationResults: 'title-application-results-v001.json',
  qc: 'title-output-qc-v001.json',
  manifest: 'title-output-manifest-v001.json',
});

const SOURCE_RENDER_ROOT =
  'evals/clip_composition/outputs/presentation/meaning-output-renders';
const SOURCE_CONTROL_ROOT =
  'evals/clip_composition/outputs/presentation/meaning-output-control';
const TITLE_MEANING_ROOT =
  'evals/clip_composition/outputs/presentation/meaning-information-packages';
const TITLE_STYLE_REGISTRY_PATH =
  'evals/clip_composition/registries/presentation/'
  + 'zevo-title-style-registry-v004/registry.json';
const RUNTIME_ROLES = Object.freeze([
  'node', 'tsx', 'remotion', 'browser', 'ffmpeg', 'ffprobe', 'imageMagick',
]);

export function inspectZevoTitleRemotionLauncherV001({
  launcherBytes,
  expectedCliPath,
}) {
  if (!Buffer.isBuffer(launcherBytes) || typeof expectedCliPath !== 'string') {
    return {status: 'rejected'};
  }
  const text = launcherBytes.toString('utf8');
  const marker = `# cmd-shim-target=${expectedCliPath}`;
  const relativeCli = '$basedir/../@remotion/cli/remotion-cli.js';
  return text.split(/\r?\n/u).includes(marker)
    && text.includes(relativeCli)
    ? {status: 'passed'}
    : {status: 'rejected'};
}

const hash = value => createHash('sha256').update(value).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const singleRegular = value => value.isFile()
  && !value.isSymbolicLink()
  && value.nlink === 1n;
const sameIdentity = (left, right) => left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs
  && left.nlink === right.nlink;

const unknownFatalObservation = () => buildPresentationFatalObservationV002({
  innerStage: 'unknown',
  targetFile: null,
  innerCode: 'UNCLASSIFIED',
});

const closedFatalObservation = ({innerStage, evidence, targetFile = null}) => {
  const innerCode = classifyPresentationFatalInnerCodeV002(evidence);
  if (innerCode === 'UNCLASSIFIED') return unknownFatalObservation();
  try {
    return buildPresentationFatalObservationV002({innerStage, targetFile, innerCode});
  } catch {
    return unknownFatalObservation();
  }
};

const trustedProcessFatalObservation = evidence => {
  if (!isObject(evidence)
    || typeof evidence.innerStage !== 'string'
    || typeof evidence.innerCode !== 'string') return unknownFatalObservation();
  try {
    return buildPresentationFatalObservationV002({
      innerStage: evidence.innerStage,
      targetFile: null,
      innerCode: evidence.innerCode,
    });
  } catch {
    return unknownFatalObservation();
  }
};

const fatalEvidenceFor = error => {
  if (isObject(error?.presentationFatalEvidence)) {
    return error.presentationFatalEvidence;
  }
  if (typeof error?.code === 'string') {
    return {kind: 'node-error', code: error.code};
  }
  if (error?.message === 'stream-file-unstable'
    || error?.message === 'tracked-input-changed') {
    return {kind: 'file-changed-during-read'};
  }
  if (error?.message === 'formal-json-invalid') {
    return {kind: 'formal-json-value-invalid'};
  }
  if (typeof error?.message === 'string'
    && /(?:binding|closure|sha)-.*(?:invalid|mismatch)$/u.test(error.message)) {
    return {kind: 'binding-reference-mismatch'};
  }
  return {kind: 'unclassified'};
};

const inRoot = (relativePath, root) => typeof relativePath === 'string'
  && relativePath.startsWith(`${root}/`)
  && WORKSPACE_PATH.test(relativePath);

const jobPathParts = relativePath => {
  if (!inRoot(relativePath, ZEVO_TITLE_OUTPUT_JOB_ROOT_V001)) return null;
  const tail = relativePath.slice(ZEVO_TITLE_OUTPUT_JOB_ROOT_V001.length + 1);
  const parts = tail.split('/');
  return parts.length === 2
    && FORMAL_ID.test(parts[0])
    && parts[1] === 'formal-title-output-job.json'
    ? {jobId: parts[0]}
    : null;
};

export function inspectZevoTitleRunnerLaunchV001({argv, env}) {
  if (!Array.isArray(argv) || argv.length !== 1) {
    return {status: 'rejected', code: 'TITLE_OUTPUT_CLI_ARITY_INVALID'};
  }
  if (isObject(env) && Object.prototype.hasOwnProperty.call(env, 'NODE_OPTIONS')) {
    return {status: 'rejected', code: 'TITLE_OUTPUT_NODE_OPTIONS_PRESENT'};
  }
  const parsed = jobPathParts(argv[0]);
  return parsed === null
    ? {status: 'rejected', code: 'TITLE_OUTPUT_JOB_PATH_INVALID'}
    : {status: 'passed', jobPath: argv[0], jobId: parsed.jobId};
}

export function inspectZevoTitleJobTopologyV001(job) {
  if (!validateZevoTitleOutputJobV001(job)) {
    return {status: 'rejected', code: 'TITLE_OUTPUT_JOB_INVALID'};
  }
  const expectedOutputRoot = `${ZEVO_TITLE_OUTPUT_ROOT_V001}/${job.outputId}`;
  const sourceRoot = path.posix.dirname(job.sourceOutput.manifest.path);
  const valid = same(
    job.implementationBindings.map(({role, path: implementationPath}) => ({
      role,
      path: implementationPath,
    })),
    ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001,
  )
    && job.publication.outputRoot === expectedOutputRoot
    && inRoot(job.sourceOutput.manifest.path, SOURCE_RENDER_ROOT)
    && inRoot(job.sourceOutput.qc.path, SOURCE_RENDER_ROOT)
    && inRoot(job.sourceOutput.video.path, SOURCE_RENDER_ROOT)
    && path.posix.dirname(job.sourceOutput.qc.path) === sourceRoot
    && path.posix.dirname(job.sourceOutput.video.path) === sourceRoot
    && inRoot(job.sourceOutput.renderPlan.path, SOURCE_CONTROL_ROOT)
    && inRoot(job.titleMeaningPackageBinding.path, TITLE_MEANING_ROOT)
    && job.styleRegistryBinding.path === TITLE_STYLE_REGISTRY_PATH;
  return valid
    ? {status: 'passed', outputRoot: expectedOutputRoot}
    : {status: 'rejected', code: 'TITLE_OUTPUT_PATH_TOPOLOGY_INVALID'};
}

const decodeFormal = bytes => {
  const decoded = decodePresentationOutputFiniteJsonV001(bytes);
  if (decoded.status !== 'decoded') throw new Error('formal-json-invalid');
  return decoded.value;
};

const workspaceAbsolute = async (workspaceRoot, relativePath) => {
  if (!WORKSPACE_PATH.test(relativePath)) throw new Error('workspace-path-invalid');
  const rootReal = await realpath(workspaceRoot);
  const absolute = path.resolve(rootReal, relativePath);
  if (!absolute.startsWith(`${rootReal}${path.sep}`)) throw new Error('workspace-path-invalid');
  return absolute;
};

const observeJsonBinding = async (workspaceRoot, binding) => {
  const bytes = await readPresentationMeaningWorkspaceFileStableV001({
    workspaceRoot,
    relativePath: binding.path,
  });
  if (hash(bytes) !== binding.fileSha256) throw new Error('json-file-sha-mismatch');
  const value = decodeFormal(bytes);
  if (value.schemaVersion !== binding.schemaVersion
    || canonicalSha256ZevoTitleJsonV001(value) !== binding.canonicalSha256) {
    throw new Error('json-canonical-sha-mismatch');
  }
  return {binding, bytes, value};
};

const streamHashAbsoluteStable = async absolutePath => {
  const resolved = await realpath(absolutePath);
  const beforePath = await lstat(resolved, {bigint: true});
  if (!singleRegular(beforePath)) throw new Error('stream-file-unsafe');
  const handle = await open(resolved, 'r');
  let beforeHandle;
  let afterHandle;
  const digest = createHash('sha256');
  try {
    beforeHandle = await handle.stat({bigint: true});
    if (!singleRegular(beforeHandle) || !sameIdentity(beforePath, beforeHandle)) {
      throw new Error('stream-file-unstable');
    }
    await new Promise((resolve, reject) => {
      const stream = handle.createReadStream({autoClose: false});
      stream.on('data', chunk => digest.update(chunk));
      stream.once('end', resolve);
      stream.once('error', reject);
    });
    afterHandle = await handle.stat({bigint: true});
    if (!singleRegular(afterHandle) || !sameIdentity(beforeHandle, afterHandle)) {
      throw new Error('stream-file-unstable');
    }
  } finally {
    await handle.close();
  }
  const afterPath = await lstat(resolved, {bigint: true});
  if (!singleRegular(afterPath) || !sameIdentity(afterHandle, afterPath)
    || await realpath(absolutePath) !== resolved) {
    throw new Error('stream-file-unstable');
  }
  return digest.digest('hex');
};

const observeWorkspaceMediaBinding = async (workspaceRoot, binding) => {
  const absolutePath = await workspaceAbsolute(workspaceRoot, binding.path);
  const observed = await observePresentationMeaningWorkspaceFileStableStreamingV001({
    workspaceRoot,
    relativePath: binding.path,
  });
  if (observed.fileSha256 !== binding.fileSha256) {
    throw new Error('media-file-sha-mismatch');
  }
  return {binding, absolutePath};
};

const observeRuntimeBinding = async binding => {
  const resolved = await realpath(binding.path);
  if (await streamHashAbsoluteStable(resolved) !== binding.fileSha256
    || await realpath(binding.path) !== resolved) {
    throw new Error('runtime-binding-mismatch');
  }
  return {path: binding.path, resolvedPath: resolved, fileSha256: binding.fileSha256};
};

const observeImplementationBindings = async (workspaceRoot, bindings) => {
  const observed = [];
  for (const binding of bindings) {
    const absolutePath = await workspaceAbsolute(workspaceRoot, binding.path);
    const observedFile = await observePresentationMeaningWorkspaceFileStableStreamingV001({
      workspaceRoot,
      relativePath: binding.path,
    });
    if (observedFile.fileSha256 !== binding.fileSha256) {
      throw new Error('implementation-binding-mismatch');
    }
    observed.push({role: binding.role, binding, absolutePath});
  }
  return observed;
};

const jsonBindingFor = (schemaVersion, relativePath, bytes, value) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: hash(bytes),
  canonicalSha256: canonicalSha256ZevoTitleJsonV001(value),
});

const mediaBindingFor = (relativePath, fileSha256) => ({
  path: relativePath,
  fileSha256,
});

const writeFormalExclusive = async (absolutePath, value) => {
  const bytes = serializeZevoTitleFormalJsonV001(value);
  await writeFile(absolutePath, bytes, {flag: 'wx'});
  return bytes;
};

const verifySourceClosure = ({
  job,
  manifest,
  plan,
  qc,
  request = null,
  acceptance = null,
  applicationResults = null,
}) => {
  if (validatePresentationOutputRenderManifestV001(manifest).status !== 'passed'
    || validatePresentationOutputRenderPlanV001(plan).status !== 'passed'
    || validatePresentationOutputRenderQcV001(qc).status !== 'passed'
    || !same(manifest.renderPlanBinding, job.sourceOutput.renderPlan)
    || !same(manifest.qcBinding, job.sourceOutput.qc)
    || !same(qc.renderPlanBinding, job.sourceOutput.renderPlan)
    || !same(qc.applicationResultsBinding, manifest.applicationResultsBinding)
    || !same(qc.outputMedia.video, job.sourceOutput.video)
    || !same(plan.meaningPackageBinding, manifest.meaningPackageBinding)
    || plan.titleDisplay.status !== 'not-requested'
    || plan.meaningProjection.titleState !== 'empty') {
    throw new Error('source-output-closure-invalid');
  }
  if (request !== null && (
    !validatePresentationOutputRequestV001(request)
    || !same(request.meaningInformationPackage, manifest.meaningPackageBinding)
    || !same(request.baseMediaInput, manifest.baseMediaBinding)
  )) throw new Error('source-request-closure-invalid');
  if (acceptance !== null && (
    !validatePresentationOutputAcceptanceReportV001(acceptance)
    || acceptance.status !== 'accepted-for-render'
    || !same(acceptance.requestBinding, manifest.outputRequestBinding)
    || !same(acceptance.renderPlanBinding, manifest.renderPlanBinding)
  )) throw new Error('source-acceptance-closure-invalid');
  if (applicationResults !== null && (
    validatePresentationOutputRenderApplicationResultsV001(applicationResults).status
      !== 'passed'
    || !same(applicationResults.outputRequestBinding, manifest.outputRequestBinding)
    || !same(applicationResults.renderPlanBinding, manifest.renderPlanBinding)
  )) {
    throw new Error('source-application-results-closure-invalid');
  }
};

/**
 * 保存済みsource jobは生成時の来歴であり、現在のimplementation role集合との
 * 同一性を要求しない。元のbinding集合はmanifestとの完全一致で検査した上で、
 * それ以外のformal-job契約だけを現行validatorへ委譲する。
 */
export function validateZevoTitleFrozenSourceFormalJobV001({
  formalJob,
  request,
  manifest,
}) {
  if (validatePresentationOutputRenderManifestV001(manifest, {
    formalJob,
  }).status !== 'passed'
    || formalJob?.requestBinding?.schemaVersion
      !== manifest.outputRequestBinding?.schemaVersion
    || formalJob?.requestBinding?.fileSha256
      !== manifest.outputRequestBinding?.fileSha256
    || formalJob?.requestBinding?.canonicalSha256
      !== manifest.outputRequestBinding?.canonicalSha256
    || !Array.isArray(formalJob?.implementationBindings)
    || formalJob.implementationBindings.length === 0) return false;
  const provenSha256 = formalJob.implementationBindings[0]?.fileSha256;
  const validationProjection = {
    ...formalJob,
    implementationBindings: PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001
      .map(({role, path: implementationPath}) => ({
        path: implementationPath,
        fileSha256: provenSha256,
        role,
      })),
  };
  return validatePresentationOutputFormalJobV001(validationProjection, request);
}

const verifyRuntimeTopology = async (workspaceRoot, runtimeProfile) => {
  const expected = {
    remotion: path.join(
      workspaceRoot,
      'runner/node_modules/@remotion/cli/remotion-cli.js',
    ),
    browser: path.join(
      workspaceRoot,
      'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/'
        + 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
    ),
    remotionLauncher: path.join(
      workspaceRoot,
      'runner/node_modules/.bin/remotion',
    ),
  };
  const launcherBytes = await readFile(expected.remotionLauncher);
  if (runtimeProfile.remotion.path !== expected.remotion
    || runtimeProfile.browser.path !== expected.browser
    || inspectZevoTitleRemotionLauncherV001({
      launcherBytes,
      expectedCliPath: expected.remotion,
    }).status !== 'passed') {
    throw new Error('renderer-runtime-topology-invalid');
  }
};

const verifyRegistryAssets = async (workspaceRoot, registry) => {
  for (const asset of registry.fontAssets) {
    const absolutePath = await workspaceAbsolute(workspaceRoot, asset.path);
    if (asset.path !== `runner/public/font/${asset.fileName}`
      || await streamHashAbsoluteStable(absolutePath) !== asset.fileSha256) {
      throw new Error('font-binding-invalid');
    }
    const license = await workspaceAbsolute(workspaceRoot, asset.licensePath);
    const stat = await lstat(license, {bigint: true});
    if (!singleRegular(stat) || await realpath(license) !== license) {
      throw new Error('font-license-invalid');
    }
  }
};

const trackedBindingsFor = ({job, jobBinding, sourceManifest}) => [
  jobBinding,
  job.titleMeaningPackageBinding,
  job.sourceOutput.manifest,
  job.sourceOutput.renderPlan,
  job.sourceOutput.qc,
  job.sourceOutput.video,
  job.styleRegistryBinding,
  sourceManifest.formalOutputJobBinding,
  sourceManifest.outputRequestBinding,
  sourceManifest.acceptanceReportBinding,
  sourceManifest.meaningPackageBinding,
  sourceManifest.baseMediaBinding.baseMedia,
  sourceManifest.baseMediaBinding.timeline,
  sourceManifest.baseMediaBinding.generationManifest,
  sourceManifest.baseMediaBinding.validationReceipt,
  sourceManifest.applicationResultsBinding,
  ...job.implementationBindings,
];

const rereadTracked = async ({workspaceRoot, tracked, job}) => {
  for (const binding of tracked) {
    const observed = await observePresentationMeaningWorkspaceFileStableStreamingV001({
      workspaceRoot,
      relativePath: binding.path,
    });
    if (observed.fileSha256 !== binding.fileSha256) {
      throw new Error('tracked-input-changed');
    }
  }
  for (const role of RUNTIME_ROLES) {
    await observeRuntimeBinding(job.runtimeProfile[role]);
  }
};

const verifyStaging = async ({stagingDirectory, documents, rendererEvidence}) => {
  const names = ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001;
  const expectedRoot = [
    names.video, names.overlays, names.plan, names.applicationResults,
    names.qc, names.manifest,
  ].sort();
  if (!same((await readdir(stagingDirectory)).sort(), expectedRoot)) {
    throw new Error('staging-artifact-set-invalid');
  }
  const overlayNames = (await readdir(path.join(stagingDirectory, names.overlays))).sort();
  const expectedOverlays = rendererEvidence.applicationResults
    .map(result => path.posix.basename(result.overlayFile)).sort();
  if (!same(overlayNames, expectedOverlays) || overlayNames.length !== 1) {
    throw new Error('staging-overlay-set-invalid');
  }
  for (const [name, expected] of documents) {
    const bytes = await readFile(path.join(stagingDirectory, name));
    if (!bytes.equals(serializeZevoTitleFormalJsonV001(expected))) {
      throw new Error('staging-json-byte-invalid');
    }
  }
  const outputVideo = documents.get(names.manifest).video;
  if (await streamHashAbsoluteStable(path.join(stagingDirectory, names.video))
    !== outputVideo.fileSha256) throw new Error('staging-video-sha-invalid');
  for (const result of rendererEvidence.applicationResults) {
    const overlayAbsolute = path.join(stagingDirectory, result.overlayFile);
    if (await streamHashAbsoluteStable(overlayAbsolute) !== result.overlaySha256) {
      throw new Error('staging-overlay-sha-invalid');
    }
  }
};

const fixedFailure = (
  status,
  stage,
  code,
  fatalObservation = status === 'fatal' ? unknownFatalObservation() : null,
) => ({
  schemaVersion: 'zevo-title-output-runner-result-v001',
  status,
  stage,
  code,
  fatalObservation,
});

export async function runZevoTitleOutputJobV001({
  jobPath,
  workspaceRoot = WORKSPACE_ROOT,
  env = process.env,
}) {
  const launch = inspectZevoTitleRunnerLaunchV001({argv: [jobPath], env});
  if (launch.status !== 'passed') {
    return {exitCode: 2, result: fixedFailure('fatal', 'launch', launch.code)};
  }
  let innerStage = 'job-read';
  try {
    const jobBytes = await readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot,
      relativePath: jobPath,
    });
    const job = decodeFormal(jobBytes);
    if (!serializeZevoTitleFormalJsonV001(job).equals(jobBytes)
      || job.jobId !== launch.jobId
      || inspectZevoTitleJobTopologyV001(job).status !== 'passed') {
      return {exitCode: 1, result: fixedFailure(
        'rejected', 'job-validation', 'TITLE_OUTPUT_JOB_INVALID',
      )};
    }
    const jobBinding = jsonBindingFor(
      ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001,
      jobPath,
      jobBytes,
      job,
    );
    innerStage = 'runner-bootstrap';
    await verifyRuntimeTopology(await realpath(workspaceRoot), job.runtimeProfile);
    for (const role of RUNTIME_ROLES) await observeRuntimeBinding(job.runtimeProfile[role]);
    await observeImplementationBindings(workspaceRoot, job.implementationBindings);

    innerStage = 'input-read';
    const [sourceManifestInput, sourcePlanInput, sourceQcInput,
      titleMeaningInput, registryInput] = await Promise.all([
      observeJsonBinding(workspaceRoot, job.sourceOutput.manifest),
      observeJsonBinding(workspaceRoot, job.sourceOutput.renderPlan),
      observeJsonBinding(workspaceRoot, job.sourceOutput.qc),
      observeJsonBinding(workspaceRoot, job.titleMeaningPackageBinding),
      observeJsonBinding(workspaceRoot, job.styleRegistryBinding),
    ]);
    const sourceManifest = sourceManifestInput.value;
    const sourcePlan = sourcePlanInput.value;
    const sourceQc = sourceQcInput.value;
    const titleMeaningPackage = titleMeaningInput.value;
    const registry = registryInput.value;
    verifySourceClosure({job, manifest: sourceManifest, plan: sourcePlan, qc: sourceQc});
    if (!validateZevoTitleStyleRegistryV001(registry)
      || !validateZevoTitleOutputJobV001(job, {registry, titleMeaningPackage})) {
      return {exitCode: 1, result: fixedFailure(
        'rejected', 'input-validation', 'TITLE_OUTPUT_INPUT_INVALID',
      )};
    }
    await verifyRegistryAssets(workspaceRoot, registry);

    const [sourceFormalJobInput, sourceRequestInput, sourceAcceptanceInput,
      sourceMeaningInput, sourceBaseMediaInput, sourceTimelineInput,
      sourceGenerationInput, sourceValidationInput, sourceApplicationInput,
      sourceVideoInput] = await Promise.all([
      observeJsonBinding(workspaceRoot, sourceManifest.formalOutputJobBinding),
      observeJsonBinding(workspaceRoot, sourceManifest.outputRequestBinding),
      observeJsonBinding(workspaceRoot, sourceManifest.acceptanceReportBinding),
      observeJsonBinding(workspaceRoot, sourceManifest.meaningPackageBinding),
      observeWorkspaceMediaBinding(workspaceRoot, sourceManifest.baseMediaBinding.baseMedia),
      observeJsonBinding(workspaceRoot, sourceManifest.baseMediaBinding.timeline),
      observeJsonBinding(workspaceRoot, sourceManifest.baseMediaBinding.generationManifest),
      observeJsonBinding(workspaceRoot, sourceManifest.baseMediaBinding.validationReceipt),
      observeJsonBinding(workspaceRoot, sourceManifest.applicationResultsBinding),
      observeWorkspaceMediaBinding(workspaceRoot, job.sourceOutput.video),
    ]);
    if (!validatePresentationOutputRequestV001(sourceRequestInput.value)
      || !validateZevoTitleFrozenSourceFormalJobV001({
        formalJob: sourceFormalJobInput.value,
        request: sourceRequestInput.value,
        manifest: sourceManifest,
      })
      || validateZevoTitleMeaningReplacementV001(
        sourceMeaningInput.value,
        titleMeaningPackage,
      ).status !== 'passed') {
      return {exitCode: 1, result: fixedFailure(
        'rejected', 'source-validation', 'TITLE_OUTPUT_SOURCE_INVALID',
      )};
    }
    verifySourceClosure({
      job,
      manifest: sourceManifest,
      plan: sourcePlan,
      qc: sourceQc,
      request: sourceRequestInput.value,
      acceptance: sourceAcceptanceInput.value,
      applicationResults: sourceApplicationInput.value,
    });
    if (!sourceBaseMediaInput.absolutePath
      || sourceTimelineInput.value.schemaVersion
        !== sourceManifest.baseMediaBinding.timeline.schemaVersion
      || sourceGenerationInput.value.schemaVersion
        !== sourceManifest.baseMediaBinding.generationManifest.schemaVersion
      || sourceValidationInput.value.schemaVersion
        !== sourceManifest.baseMediaBinding.validationReceipt.schemaVersion) {
      throw new Error('source-base-media-closure-invalid');
    }

    innerStage = 'source-media-read';
    const sourceMedia = await inspectRenderedMediaWithToolsV001(
      sourceVideoInput.absolutePath,
      {
        ffmpegPath: job.runtimeProfile.ffmpeg.path,
        ffprobePath: job.runtimeProfile.ffprobe.path,
      },
    );
    const profile = registry.profiles.find(candidate => candidate.profileId === job.profileId);
    if (!sourceMedia.video || !sourceMedia.audio
      || sourceMedia.video.width !== profile.canvas.width
      || sourceMedia.video.height !== profile.canvas.height
      || sourceMedia.video.fps !== profile.canvas.fps
      || sourceMedia.video.frameCount !== sourceQc.outputMedia.frameCount
      || sourceMedia.audio.packetPayloadSha256
        !== sourceQc.outputMedia.audioPacketPayloadSha256
      || sourceQc.outputMedia.width !== profile.canvas.width
      || sourceQc.outputMedia.height !== profile.canvas.height
      || sourceManifest.resolvedStyle.format !== profile.format
      || profile.displayFrameRange.endFrameExclusive > sourceMedia.video.frameCount) {
      return {exitCode: 1, result: fixedFailure(
        'rejected', 'media-validation', 'TITLE_OUTPUT_SOURCE_MEDIA_INVALID',
      )};
    }

    innerStage = 'layout-preflight';
    const planResult = buildZevoTitleDisplayPlanV001({
      job,
      jobBinding,
      registry,
      sourceMeaningPackage: sourceMeaningInput.value,
      titleMeaningPackage,
    });
    if (planResult.status !== 'built') {
      return {exitCode: 1, result: fixedFailure(
        'rejected', 'title-plan', 'TITLE_OUTPUT_PLAN_REJECTED',
      )};
    }
    const plan = planResult.plan;
    const common = buildZevoTitleCommonCorePlanV001({plan, registry});
    if (common.status !== 'built') {
      return {exitCode: 1, result: fixedFailure(
        'rejected', 'title-plan', 'TITLE_OUTPUT_PLAN_REJECTED',
      )};
    }

    const outputAbsolute = await workspaceAbsolute(workspaceRoot, job.publication.outputRoot);
    innerStage = 'overlay-render';
    const draw = await executeValidatedPresentationDrawAndQcV001({
      outputDirectory: outputAbsolute,
      plan: common.plan,
      presetRegistry: registry,
      baseMediaPath: sourceVideoInput.absolutePath,
      baseMediaInspection: {media: sourceMedia},
      expectedFrameCount: sourceMedia.video.frameCount,
      artifactNames: ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001,
      evaluateQc: input => evaluatePresentationRendererQcWithProfileV001(
        input,
        {
          schemaVersion: 'presentation-render-qc-v002',
          planFile: ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001.plan,
        },
      ),
      toolPaths: {
        ffmpegPath: job.runtimeProfile.ffmpeg.path,
        ffprobePath: job.runtimeProfile.ffprobe.path,
        imageMagickPath: job.runtimeProfile.imageMagick.path,
        tsxPath: job.runtimeProfile.tsx.path,
        layoutInspectorPath: path.join(
          await realpath(workspaceRoot),
          'evals/clip_composition/inspect_presentation_render_layout_v001.ts',
        ),
      },
    });
    if (draw.exitCode !== 0) {
      const fatalObservation = draw.exitCode === 2
        ? trustedProcessFatalObservation(draw.presentationFatalProcessEvidence)
        : null;
      return {exitCode: draw.exitCode === 1 ? 1 : 2, result: fixedFailure(
        draw.exitCode === 1 ? 'rejected' : 'fatal',
        typeof draw.failure?.stage === 'string' ? draw.failure.stage : 'render',
        draw.exitCode === 1
          ? 'TITLE_OUTPUT_RENDER_REJECTED'
          : 'TITLE_OUTPUT_RENDER_FATAL',
        fatalObservation,
      )};
    }

    innerStage = 'formal-serialization';
    const names = ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001;
    const planPath = `${job.publication.outputRoot}/${names.plan}`;
    const evidencePath = `${job.publication.outputRoot}/${names.applicationResults}`;
    const qcPath = `${job.publication.outputRoot}/${names.qc}`;
    const manifestPath = `${job.publication.outputRoot}/${names.manifest}`;
    const videoPath = `${job.publication.outputRoot}/${names.video}`;
    const planBytes = serializeZevoTitleFormalJsonV001(plan);
    const planBinding = jsonBindingFor(
      ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001, planPath, planBytes, plan,
    );
    const evidenceResult = buildZevoTitleRendererEvidenceV001({
      plan,
      planBinding,
      applicationResults: draw.applicationResults,
      rendererQc: draw.finalQc,
    });
    if (evidenceResult.status !== 'built') throw new Error('renderer-evidence-invalid');
    const rendererEvidence = evidenceResult.evidence;
    const evidenceBytes = serializeZevoTitleFormalJsonV001(rendererEvidence);
    const rendererEvidenceBinding = jsonBindingFor(
      ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001,
      evidencePath,
      evidenceBytes,
      rendererEvidence,
    );
    const outputVideoSha256 = await streamHashAbsoluteStable(draw.workVideo);
    const outputVideo = mediaBindingFor(videoPath, outputVideoSha256);
    const qcResult = buildZevoTitleOutputQcV001({
      job,
      jobBinding,
      plan,
      planBinding,
      rendererEvidenceBinding,
      rendererEvidence,
      outputVideo,
      sourceMedia: {
        frameCount: sourceMedia.video.frameCount,
        audioPacketPayloadSha256: sourceMedia.audio.packetPayloadSha256,
      },
      outputMedia: {
        frameCount: draw.outputMedia.video?.frameCount,
        audioPacketPayloadSha256: draw.outputMedia.audio?.packetPayloadSha256,
      },
    });
    if (qcResult.status !== 'built') throw new Error('title-qc-invalid');
    const qc = qcResult.qc;
    const qcBytes = serializeZevoTitleFormalJsonV001(qc);
    const qcBinding = jsonBindingFor(ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001, qcPath, qcBytes, qc);
    const manifestResult = buildZevoTitleOutputManifestV001({
      job,
      jobBinding,
      planBinding,
      rendererEvidenceBinding,
      qcBinding,
      qc,
    });
    if (manifestResult.status !== 'built') throw new Error('title-manifest-invalid');
    const manifest = manifestResult.manifest;

    await writeFormalExclusive(path.join(draw.stagingDirectory, names.plan), plan);
    await writeFormalExclusive(
      path.join(draw.stagingDirectory, names.applicationResults),
      rendererEvidence,
    );
    await writeFormalExclusive(path.join(draw.stagingDirectory, names.qc), qc);
    await writeFormalExclusive(path.join(draw.stagingDirectory, names.manifest), manifest);
    if (!validateZevoTitleDisplayPlanV001(plan, {
      job,
      registry,
      sourceMeaningPackage: sourceMeaningInput.value,
      titleMeaningPackage,
    })
      || !validateZevoTitleRendererEvidenceV001(rendererEvidence, {plan})
      || !validateZevoTitleOutputQcV001(qc, {job, plan, outputId: job.outputId})
      || !validateZevoTitleOutputManifestV001(manifest, {job, qc})) {
      throw new Error('title-output-postcondition-failed');
    }
    await verifyStaging({
      stagingDirectory: draw.stagingDirectory,
      documents: new Map([
        [names.plan, plan],
        [names.applicationResults, rendererEvidence],
        [names.qc, qc],
        [names.manifest, manifest],
      ]),
      rendererEvidence,
    });
    await rereadTracked({
      workspaceRoot,
      tracked: trackedBindingsFor({job, jobBinding, sourceManifest}),
      job,
    });
    await verifyRegistryAssets(workspaceRoot, registry);
    innerStage = 'publication';
    let publication;
    try {
      publication = await commitValidatedPresentationArtifactsV002({
        stagingDirectory: draw.stagingDirectory,
        outputDirectory: outputAbsolute,
        reservation: draw.reservation,
      });
    } catch {
      const closedError = new Error('closed-publication-failure');
      Object.defineProperty(closedError, 'presentationFatalEvidence', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: {kind: 'publication-failed'},
      });
      throw closedError;
    }
    if (publication.status !== 'published') throw new Error('title-output-publish-failed');
    const manifestBytes = await readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot,
      relativePath: manifestPath,
    });
    if (!manifestBytes.equals(serializeZevoTitleFormalJsonV001(manifest))) {
      throw new Error('published-manifest-changed');
    }
    return {
      exitCode: 0,
      result: {
        schemaVersion: 'zevo-title-output-runner-result-v001',
        status: 'passed',
        manifestBinding: jsonBindingFor(
          ZEVO_TITLE_OUTPUT_MANIFEST_SCHEMA_V001,
          manifestPath,
          manifestBytes,
          manifest,
        ),
      },
    };
  } catch (error) {
    return {exitCode: 2, result: fixedFailure(
      'fatal',
      'execution',
      'TITLE_OUTPUT_RUNNER_FATAL',
      closedFatalObservation({
        innerStage,
        evidence: fatalEvidenceFor(error),
      }),
    )};
  }
}

const main = async () => {
  const launch = inspectZevoTitleRunnerLaunchV001({
    argv: process.argv.slice(2),
    env: process.env,
  });
  if (launch.status !== 'passed') {
    process.stdout.write(serializeZevoTitleFormalJsonV001(
      fixedFailure('fatal', 'launch', launch.code),
    ));
    process.exitCode = 2;
    return;
  }
  const execution = await runZevoTitleOutputJobV001({jobPath: launch.jobPath});
  if (execution.exitCode === 0) {
    const manifestBytes = await readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot: WORKSPACE_ROOT,
      relativePath: execution.result.manifestBinding.path,
    });
    process.stdout.write(manifestBytes);
  } else {
    process.stdout.write(serializeZevoTitleFormalJsonV001(execution.result));
  }
  process.exitCode = execution.exitCode;
};

if (typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stdout.write(serializeZevoTitleFormalJsonV001(
      fixedFailure('fatal', 'execution', 'TITLE_OUTPUT_RUNNER_FATAL'),
    ));
    process.exitCode = 2;
  });
}
