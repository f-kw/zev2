import {createHash} from 'node:crypto';
import {
  lstat,
  open,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  decodePresentationCaptionB1StrictJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  derivePresentationMeaningCaptionProjectionV001,
  derivePresentationExpectedAtomOccurrencesV001,
  canonicalSha256PresentationMeaningInformationJsonV001,
  serializePresentationMeaningInformationFormalJsonV001,
  validatePresentationMeaningBoundaryValidationReportV001,
  validatePresentationMeaningInformationPackageJobV001,
  validatePresentationMeaningJsonBindingV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  validatePresentationRetainedSourceAtomsPublishedArtifactsV001,
} from './presentation_retained_source_atoms_v001.mjs';
import {
  createPresentationMeaningOwnedStagingRootV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  validatePresentationSourceIdentityV001,
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  PRESENTATION_OUTPUT_FORMAL_JOB_SCHEMA_V001,
  buildPresentationOutputAcceptanceReportV001,
  derivePresentationOutputMeaningProjectionV001,
  derivePresentationOutputResolvedStyleProjectionV001,
  evaluatePresentationOutputAcceptanceChecksV001,
  inspectPresentationOutputRequestV001,
  inspectPresentationOutputAcceptanceObservationV001,
  makePresentationOutputAcceptancePassedObservationV001,
  validatePresentationOutputFormalJobV001,
} from './presentation_output_contract_v001.mjs';
import {
  PRESENTATION_OUTPUT_BASE_MEDIA_JOB_ROOT_V001,
  canonicalSha256PresentationOutputBaseMediaJsonV001,
  validatePresentationOutputBaseMediaBuildJobV001,
  validatePresentationOutputBaseMediaGenerationManifestV001,
  validatePresentationOutputBaseMediaValidationReceiptV001,
  validatePresentationOutputBaseMediaTimelineV001,
  validatePresentationOutputMeaningPackageV001,
} from './presentation_output_base_media_v001.mjs';
import {
  PresentationOutputPlannerResourceExhaustedV001,
  buildPresentationOutputPageLinePlanV001,
  validatePresentationOutputCaptionDisplaysV001,
} from './presentation_output_page_line_planner_v001.mjs';
import {
  inspectPresentationOutputDisplayPageV001,
  resolvePresentationOutputStyleV001,
} from './presentation_output_style_resolver_v001.ts';
import {
  canonicalSha256PresentationOutputFiniteJsonV001 as canonicalSha256FiniteOutputJson,
  decodePresentationOutputFiniteJsonV001,
  inspectPresentationOutputCropApplicationEnvelopeV001,
} from './presentation_output_crop_application_v001.mjs';
import {
  buildPresentationOutputCommonCorePlanV001,
  buildPresentationOutputRenderApplicationResultsV001,
  buildPresentationOutputRenderFailureReportV002,
  buildPresentationOutputRenderManifestV001,
  buildPresentationOutputRenderPlanV001,
  buildPresentationOutputRenderQcV001,
  PRESENTATION_OUTPUT_RENDER_DIAGNOSTIC_CODES_V001,
  projectPresentationOutputRendererViolationsV001,
  serializePresentationOutputRenderJsonV001,
  validatePresentationOutputRenderApplicationResultsV001,
  validatePresentationOutputRenderFailureReportV002,
  validatePresentationOutputRenderManifestV001,
  validatePresentationOutputRenderPlanV001,
  validatePresentationOutputRenderQcV001,
} from './presentation_output_render_plan_v001.mjs';
import * as presentationRendererCoreV002 from './render_presentation_v002.mjs';
import {
  buildPresentationFatalObservationV002,
  classifyPresentationFatalInnerCodeV002,
  selectPresentationFatalTargetFileV002,
  validatePresentationFatalObservationV002,
} from './presentation_fatal_observation_v002.mjs';
import {
  createPresentationVerticalCroppedBaseMediaV001,
} from './render_presentation_vertical_review_v001.ts';
import {
  evaluatePresentationVerticalReviewRendererQcV001,
  fileSha256V002,
  inspectRenderedMediaWithToolsV001,
} from './presentation_renderer_qc_v002.mjs';

export const PRESENTATION_OUTPUT_FORMAL_JOB_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-output-jobs';
export const PRESENTATION_OUTPUT_RENDER_FAILURE_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-output-render-failures';

export const PRESENTATION_OUTPUT_RUNNER_OUTER_CODES_V001 = Object.freeze([
  'OUTPUT_ACCEPTANCE_EXECUTION_FAILED',
  'OUTPUT_ACCEPTANCE_INPUT_CHANGED',
  'OUTPUT_ACCEPTANCE_PUBLICATION_FAILED',
  'OUTPUT_ACCEPTANCE_REPORT_BUILD_FAILED',
  'OUTPUT_FORMAL_JOB_INVALID',
  'OUTPUT_PLANNER_RESOURCE_EXHAUSTED',
  'OUTPUT_RENDER_CORE_CONTRACT_FAILED',
  'OUTPUT_RENDER_CORE_PROCESS_FAILED',
  'OUTPUT_RENDER_FAILURE_REPORT_INVALID',
  'OUTPUT_RENDER_FAILURE_TARGET_INVALID',
  'OUTPUT_RENDER_PUBLICATION_FAILED',
  'OUTPUT_RENDER_SAFETY_ARTIFACT_INVALID',
  'OUTPUT_RENDER_STAGED_ARTIFACT_INVALID',
]);

if (!PRESENTATION_OUTPUT_RENDER_DIAGNOSTIC_CODES_V001.every(
  code => PRESENTATION_OUTPUT_RUNNER_OUTER_CODES_V001.includes(code),
)) throw new TypeError('output renderer diagnostic code set is not closed by its runner');

const PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001 = Object.freeze({
  reportPath: 'evals/clip_composition/registries/presentation/'
    + 'vertical-short-preset-registry-v001/preset-finalization-report.json',
  reportFileSha256: '64b821f1d61bfffe69f1d4415d894c53dec4c02f4e4bbda8d5258871522cb85e',
  trustPath: 'evals/clip_composition/registries/presentation/'
    + 'presentation-vertical-renderer-trust-v001/trust.json',
  trustFileSha256: 'af0738e2c96b7e6a8f6efc1d035191cd989f3c0adf52f939cb46fb945205e72e',
});

export const OUTPUT_DRAW_ARTIFACT_NAMES_V001 = Object.freeze({
  video: 'presentation-output-rendered-v001.mp4',
  overlays: 'overlays',
  plan: 'presentation-render-plan-v002.json',
  applicationResults: 'presentation-output-render-application-results-v001.json',
  qc: 'presentation-output-render-qc-v001.json',
  manifest: 'presentation-output-render-manifest-v001.json',
});

const OUTPUT_VERTICAL_DRAW_ARTIFACT_NAMES_V001 = Object.freeze({
  ...OUTPUT_DRAW_ARTIFACT_NAMES_V001,
  plan: 'presentation-vertical-review-render-plan-v001.json',
});

const CONTROL_ARTIFACT_NAMES = Object.freeze({
  request: 'output-request.json',
  report: 'output-acceptance-report.json',
  plan: 'render-plan.json',
});

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;

type JsonObject = Record<string, any>;
type TrackedFile = {
  absolutePath: string;
  fileSha256: string;
  pathPolicy?: 'direct-regular' | 'bound-runtime-tool';
};

const isObject = (value: unknown): value is JsonObject => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);
const exactKeys = (value: unknown, keys: readonly string[]) => (
  isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index])
);
const dense = (value: unknown): value is unknown[] => (
  Array.isArray(value) && Object.keys(value).length === value.length
);

export const inspectPresentationOutputRendererCoreExportsV001 = (moduleNamespace: JsonObject) => {
  const codes = moduleNamespace?.PRESENTATION_RENDERER_VIOLATION_CODES;
  const valid = dense(codes)
    && Object.isFrozen(codes)
    && codes.length > 0
    && codes.every(code => typeof code === 'string' && code.length > 0)
    && new Set(codes).size === codes.length
    && typeof moduleNamespace?.commitValidatedPresentationArtifactsV002 === 'function'
    && typeof moduleNamespace?.executeValidatedPresentationDrawAndQcV001 === 'function'
    && typeof moduleNamespace?.inspectFrameCountWithToolV001 === 'function';
  return {status: valid ? 'passed' : 'failed'};
};

const {
  PRESENTATION_RENDERER_VIOLATION_CODES,
  commitValidatedPresentationArtifactsV002,
  executeValidatedPresentationDrawAndQcV001,
  inspectFrameCountWithToolV001,
} = presentationRendererCoreV002;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const clone = <T>(value: T): T => structuredClone(value);
const unknownFatalObservationV002 = () => buildPresentationFatalObservationV002({
  innerStage: 'unknown',
  targetFile: null,
  innerCode: 'UNCLASSIFIED',
});
const buildClosedFatalObservationV002 = ({
  innerStage,
  targetFile = null,
  evidence,
}: {
  innerStage: string;
  targetFile?: JsonObject | null;
  evidence: JsonObject;
}) => {
  const innerCode = classifyPresentationFatalInnerCodeV002(evidence);
  if (innerCode === 'UNCLASSIFIED') return unknownFatalObservationV002();
  try {
    return buildPresentationFatalObservationV002({innerStage, targetFile, innerCode});
  } catch {
    return unknownFatalObservationV002();
  }
};
const buildTrustedFatalObservationV002 = ({
  innerStage,
  targetFile = null,
  innerCode,
}: {
  innerStage: string;
  targetFile?: JsonObject | null;
  innerCode: string;
}) => {
  try {
    return buildPresentationFatalObservationV002({innerStage, targetFile, innerCode});
  } catch {
    return unknownFatalObservationV002();
  }
};
const selectOutputJobTargetFileV002 = ({
  sourceField,
  binding,
  verifiedTargetSources,
  sourceRecordVerified,
}: {
  sourceField: 'job.requestBinding' | 'job.implementationBindings[*]';
  binding: JsonObject;
  verifiedTargetSources: JsonObject[];
  sourceRecordVerified: boolean;
}) => {
  return selectPresentationFatalTargetFileV002({
    boundaryId: 'output-runner',
    sourceField,
    path: binding?.path,
    fileSha256: binding?.fileSha256,
    verifiedTargetSources,
    sourceRecordVerified,
  });
};
const occurrenceKey = (ref: JsonObject) => (
  `${ref.timelineSegmentId}\u0000${ref.sourceMediaId}\u0000${ref.atomId}`
);

const sameIdentity = (left: any, right: any) => left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs
  && left.nlink === right.nlink;
const singleRegular = (value: any) => (
  value.isFile() && !value.isSymbolicLink() && value.nlink === 1n
);

const decodeStrict = (bytes: Buffer) => {
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  return decoded.status === 'decoded' ? decoded.value : null;
};

// Crop and renderer geometry use the existing output-side finite-number domain.
// Semantic/package JSON continues to use the integer-only strict decoder above.
const decodeFiniteOutputJsonValue = (bytes: Buffer) => {
  const decoded = decodePresentationOutputFiniteJsonV001(bytes);
  return decoded.status === 'decoded' ? decoded.value : null;
};

const resolveWorkspacePath = async (workspaceRoot: string, relativePath: string) => {
  if (!WORKSPACE_PATH.test(relativePath ?? '')) throw new Error('unsafe-workspace-path');
  const rootReal = await realpath(workspaceRoot);
  const absolutePath = path.resolve(rootReal, relativePath);
  if (!absolutePath.startsWith(`${rootReal}${path.sep}`)) throw new Error('unsafe-workspace-path');
  return {rootReal, absolutePath};
};

const readAbsoluteStable = async (absolutePath: string) => {
  const beforePath = await lstat(absolutePath, {bigint: true});
  if (!singleRegular(beforePath) || await realpath(absolutePath) !== absolutePath) {
    throw new Error('unsafe-file');
  }
  const handle = await open(absolutePath, 'r');
  let bytes: Buffer;
  let afterHandle: any;
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
  const afterPath = await lstat(absolutePath, {bigint: true});
  if (!singleRegular(afterPath) || !sameIdentity(afterHandle, afterPath)
    || await realpath(absolutePath) !== absolutePath) throw new Error('unstable-file');
  return bytes!;
};

const readStable = async (workspaceRoot: string, relativePath: string) => {
  const {absolutePath} = await resolveWorkspacePath(workspaceRoot, relativePath);
  return {absolutePath, bytes: await readAbsoluteStable(absolutePath)};
};

const hashFileHandle = async (handle: any) => {
  const digest = createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let position = 0;
  while (true) {
    const {bytesRead} = await handle.read(buffer, 0, buffer.length, position);
    if (bytesRead === 0) break;
    digest.update(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  return digest.digest('hex');
};

const hashAbsoluteStableStreaming = async (absolutePath: string) => {
  const before = await lstat(absolutePath, {bigint: true});
  if (!singleRegular(before) || await realpath(absolutePath) !== absolutePath) {
    throw new Error('unsafe-file');
  }
  const handle = await open(absolutePath, 'r');
  let digest: string;
  let afterHandle: any;
  try {
    const beforeHandle = await handle.stat({bigint: true});
    if (!singleRegular(beforeHandle) || !sameIdentity(before, beforeHandle)) {
      throw new Error('unstable-file');
    }
    digest = await hashFileHandle(handle);
    afterHandle = await handle.stat({bigint: true});
    if (!singleRegular(afterHandle) || !sameIdentity(beforeHandle, afterHandle)) {
      throw new Error('unstable-file');
    }
  } finally {
    await handle.close();
  }
  const after = await lstat(absolutePath, {bigint: true});
  if (!singleRegular(after) || !sameIdentity(afterHandle, after)
    || await realpath(absolutePath) !== absolutePath) throw new Error('unstable-file');
  return digest!;
};

const hashBoundRuntimeToolStableStreaming = async (boundPath: string) => {
  if (!path.isAbsolute(boundPath)) throw new Error('unsafe-runtime-tool-path');
  const beforeTarget = await realpath(boundPath);
  const digest = await hashAbsoluteStableStreaming(beforeTarget);
  const afterTarget = await realpath(boundPath);
  if (afterTarget !== beforeTarget) throw new Error('unstable-runtime-tool-path');
  return digest;
};

const observeJsonBinding = async (
  workspaceRoot: string,
  binding: JsonObject,
  tracked: TrackedFile[],
  numberDomain: 'integer' | 'finite-output' = 'integer',
  versionField: 'schemaVersion' | 'registryVersion' = 'schemaVersion',
) => {
  const observed = await readStable(workspaceRoot, binding.path);
  tracked.push({absolutePath: observed.absolutePath, fileSha256: binding.fileSha256});
  if (hash(observed.bytes) !== binding.fileSha256) {
    return {status: 'binding-mismatch' as const, ...observed, value: null};
  }
  const value = numberDomain === 'finite-output'
    ? decodeFiniteOutputJsonValue(observed.bytes)
    : decodeStrict(observed.bytes);
  if (!isObject(value)) return {status: 'invalid' as const, ...observed, value: null};
  let canonicalSha256: string;
  try {
    canonicalSha256 = numberDomain === 'finite-output'
      ? canonicalSha256FiniteOutputJson(value)
      : canonicalSha256PresentationMeaningInformationJsonV001(value);
  } catch {
    return {status: 'invalid' as const, ...observed, value};
  }
  if (canonicalSha256 !== binding.canonicalSha256
    || value[versionField] !== binding.schemaVersion) {
    return {status: 'binding-mismatch' as const, ...observed, value, canonicalSha256};
  }
  return {status: 'passed' as const, ...observed, value, canonicalSha256};
};

// requestSchema check owns the request shape.  This envelope verifies only the
// bound raw JSON bytes so decoded primitive/array inputs can reach that check.
export const observePresentationOutputRawRequestBindingV001 = async (
  workspaceRoot: string,
  binding: JsonObject,
  tracked: TrackedFile[],
) => {
  const observed = await readStable(workspaceRoot, binding.path);
  tracked.push({absolutePath: observed.absolutePath, fileSha256: binding.fileSha256});
  const decoded = decodePresentationCaptionB1StrictJsonV001(observed.bytes);
  if (decoded.status !== 'decoded') {
    return {
      status: 'invalid' as const,
      reason: decoded.reason,
      ...observed,
      value: undefined,
    };
  }
  if (hash(observed.bytes) !== binding.fileSha256) {
    return {
      status: 'binding-mismatch' as const,
      bindingMismatchKind: 'file-sha' as const,
      ...observed,
      value: decoded.value,
    };
  }
  let canonicalSha256: string;
  try {
    canonicalSha256 = canonicalSha256PresentationMeaningInformationJsonV001(decoded.value);
  } catch {
    return {
      status: 'invalid' as const,
      ...observed,
      value: decoded.value,
    };
  }
  if (canonicalSha256 !== binding.canonicalSha256) {
    return {
      status: 'binding-mismatch' as const,
      bindingMismatchKind: 'canonical-sha' as const,
      ...observed,
      value: decoded.value,
      canonicalSha256,
    };
  }
  return {
    status: 'passed' as const,
    ...observed,
    value: decoded.value,
    canonicalSha256,
  };
};

export const inspectPresentationOutputRequestFatalObservationV002 = ({
  job,
  requestObservation,
}: {
  job: JsonObject;
  requestObservation: JsonObject;
}) => {
  const acceptedJob = validatePresentationOutputFormalJobV001(job);
  const targetFile = acceptedJob
    ? selectOutputJobTargetFileV002({
      sourceField: 'job.requestBinding',
      binding: job.requestBinding,
      verifiedTargetSources: [{
        sourceField: 'job.requestBinding',
        path: job.requestBinding.path,
        fileSha256: job.requestBinding.fileSha256,
      }],
      sourceRecordVerified: true,
    })
    : null;
  if (requestObservation?.status === 'invalid') {
    return buildClosedFatalObservationV002({
      innerStage: 'input-read',
      targetFile,
      evidence: typeof requestObservation.reason === 'string'
        ? {
          kind: 'strict-json-decode',
          reason: requestObservation.reason,
        }
        : {kind: 'formal-json-value-invalid'},
    });
  }
  if (requestObservation?.status === 'binding-mismatch') {
    return buildClosedFatalObservationV002({
      innerStage: 'input-read',
      targetFile,
      evidence: {kind: 'binding-reference-mismatch'},
    });
  }
  return unknownFatalObservationV002();
};

const observeMeaningPackageProvenance = async ({
  workspaceRoot,
  packageBinding,
  packageValue,
  tracked,
}: {
  workspaceRoot: string;
  packageBinding: JsonObject;
  packageValue: JsonObject;
  tracked: TrackedFile[];
}) => {
  const formalBinding = packageValue?.provenance?.formalJobBinding;
  const timelineBinding = packageValue?.provenance?.timelineCompositionBinding;
  const semanticBinding = packageValue?.provenance?.semanticSelectionValidationBinding;
  if (!validatePresentationMeaningJsonBindingV001(formalBinding)
    || !validatePresentationMeaningJsonBindingV001(timelineBinding)
    || !validatePresentationMeaningJsonBindingV001(semanticBinding)) {
    return {status: 'invalid' as const};
  }
  const [formalObserved, timelineObserved, semanticObserved] = await Promise.all([
    observeJsonBinding(workspaceRoot, formalBinding, tracked),
    observeJsonBinding(workspaceRoot, timelineBinding, tracked),
    observeJsonBinding(workspaceRoot, semanticBinding, tracked),
  ]);
  if (formalObserved.status === 'binding-mismatch'
    || timelineObserved.status === 'binding-mismatch'
    || semanticObserved.status === 'binding-mismatch') {
    return {status: 'binding-mismatch' as const};
  }
  if (formalObserved.status !== 'passed'
    || timelineObserved.status !== 'passed'
    || semanticObserved.status !== 'passed') {
    return {status: 'invalid' as const};
  }
  let captionProjection;
  try {
    captionProjection = derivePresentationMeaningCaptionProjectionV001(packageValue.captions);
  } catch {
    return {status: 'invalid' as const};
  }
  const formalJob = formalObserved.value;
  const timelineDecision = timelineObserved.value;
  const semanticValidation = semanticObserved.value;
  if (!validatePresentationMeaningInformationPackageJobV001(formalJob)
    || !validatePresentationTimelineCompositionDecisionV001(timelineDecision)
    || !validatePresentationMeaningBoundaryValidationReportV001(semanticValidation)
    || formalJob.packageId !== packageValue.packageId
    || !same(formalJob.title, packageValue.title)
    || formalJob.outputPath !== packageBinding.path
    || !same(
      formalJob.timelineCompositionDecisionBinding,
      timelineBinding,
    )
    || !same(
      formalJob.semanticSelectionValidationBinding,
      semanticBinding,
    )
    || !same(formalJob.semanticSelectionBinding, semanticValidation.selectionBinding)
    || !same(timelineDecision.sourceMedia, packageValue.sourceMedia)
    || !same(timelineDecision.segments, packageValue.timelineComposition.segments)
    || !same(semanticValidation.captionProjection, captionProjection)) {
    return {status: 'invalid' as const};
  }
  return {
    status: 'passed' as const,
    formalJob,
    timelineDecision,
    semanticValidation,
  };
};

const observeMediaBinding = async (
  workspaceRoot: string,
  binding: JsonObject,
  tracked: TrackedFile[],
) => {
  const {absolutePath} = await resolveWorkspacePath(workspaceRoot, binding.path);
  tracked.push({absolutePath, fileSha256: binding.fileSha256});
  return await hashAbsoluteStableStreaming(absolutePath) === binding.fileSha256
    ? {status: 'passed' as const, absolutePath}
    : {status: 'binding-mismatch' as const, absolutePath};
};

const rereadTracked = async (tracked: TrackedFile[]) => {
  for (const item of tracked) {
    const digest = item.pathPolicy === 'bound-runtime-tool'
      ? await hashBoundRuntimeToolStableStreaming(item.absolutePath)
      : await hashAbsoluteStableStreaming(item.absolutePath);
    if (digest !== item.fileSha256) return false;
  }
  return true;
};

const assertStableToolInputs = async ({
  runtimeProfile,
  media,
}: {
  runtimeProfile: JsonObject;
  media: Array<{absolutePath: string; fileSha256: string}>;
}) => {
  for (const binding of Object.values(runtimeProfile) as JsonObject[]) {
    if (!path.isAbsolute(binding.path)
      || await hashBoundRuntimeToolStableStreaming(binding.path) !== binding.fileSha256) {
      throw new Error('runtime binding changed around tool execution');
    }
  }
  for (const binding of media) {
    if (await hashAbsoluteStableStreaming(binding.absolutePath) !== binding.fileSha256) {
      throw new Error('media binding changed around tool execution');
    }
  }
};

const withStableToolInputs = async <T>({
  runtimeProfile,
  media,
  operation,
}: {
  runtimeProfile: JsonObject;
  media: Array<{absolutePath: string; fileSha256: string}>;
  operation: () => Promise<T>;
}) => {
  await assertStableToolInputs({runtimeProfile, media});
  let result: T | undefined;
  let operationError: unknown = null;
  try {
    result = await operation();
  } catch (error) {
    operationError = error;
  }
  await assertStableToolInputs({runtimeProfile, media});
  if (operationError !== null) throw operationError;
  return result as T;
};

const lstatOrNull = async (target: string) => {
  try { return await lstat(target); } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const publishExactDirectory = async ({
  workspaceRoot,
  outputRoot,
  files,
}: {
  workspaceRoot: string;
  outputRoot: string;
  files: Array<{name: string; bytes: Buffer}>;
}) => {
  const claim = await createPresentationMeaningOwnedStagingRootV001({
    workspaceRoot,
    relativeOutputRoot: outputRoot,
  });
  try {
    for (const file of files) {
      await writeFile(path.join(claim.stagingAbsolute, file.name), file.bytes, {flag: 'wx'});
    }
    const names = (await readdir(claim.stagingAbsolute)).sort();
    if (!same(names, files.map(file => file.name).sort())) throw new Error('staging-set-invalid');
    for (const file of files) {
      if (!(await readAbsoluteStable(path.join(claim.stagingAbsolute, file.name))).equals(file.bytes)) {
        throw new Error('staging-byte-mismatch');
      }
    }
    const publication = await publishPresentationMeaningOwnedStagingRootNoReplaceV001({
      claim,
      expectedRelativeFiles: files.map(file => file.name),
    });
    if (publication.status !== 'published') throw new Error('publication-target-exists');
    return claim.outputAbsolute;
  } catch (error) {
    throw error;
  }
};

const captureStagingTree = async (root: string) => {
  const rootStat = await lstat(root, {bigint: true});
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || await realpath(root) !== root) {
    throw new Error('unsafe staging root');
  }
  const entries: JsonObject[] = [];
  const walk = async (directory: string, relativeDirectory: string) => {
    const names = (await readdir(directory)).sort(compareUtf8);
    for (const name of names) {
      const absolutePath = path.join(directory, name);
      const relativePath = relativeDirectory === '' ? name : `${relativeDirectory}/${name}`;
      const item = await lstat(absolutePath, {bigint: true});
      if (item.isSymbolicLink() || await realpath(absolutePath) !== absolutePath) {
        throw new Error('unsafe staging entry');
      }
      if (item.isDirectory()) {
        entries.push({path: `${relativePath}/`, type: 'directory'});
        await walk(absolutePath, relativePath);
      } else if (singleRegular(item)) {
        entries.push({
          path: relativePath,
          type: 'file',
          fileSha256: await hashAbsoluteStableStreaming(absolutePath),
        });
      } else {
        throw new Error('unsafe staging entry');
      }
    }
  };
  await walk(root, '');
  return entries;
};

const jsonBinding = (
  schemaVersion: string,
  relativePath: string,
  bytes: Buffer,
  value: unknown,
  canonicalSha256: (candidate: unknown) => string =
    canonicalSha256PresentationMeaningInformationJsonV001,
) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: hash(bytes),
  canonicalSha256: canonicalSha256(value),
});

const acceptanceObservation = (checkName: string, observation: JsonObject) => (
  inspectPresentationOutputAcceptanceObservationV001({checkName, observation})
);
const passedAcceptanceObservation = (checkName: string) => acceptanceObservation(
  checkName,
  makePresentationOutputAcceptancePassedObservationV001(checkName),
);

const loadRetainedSources = async (
  workspaceRoot: string,
  meaningPackage: JsonObject,
  tracked: TrackedFile[],
) => {
  const retainedSources = [];
  for (const source of meaningPackage.sourceMedia) {
    const observed: JsonObject = {};
    for (const role of ['sourceAtoms', 'generationManifest', 'validationReport']) {
      const item = await observeJsonBinding(
        workspaceRoot,
        source.retainedSourceAtomsBinding[role],
        tracked,
      );
      if (item.status !== 'passed') return {status: 'rejected' as const};
      observed[role] = item;
    }
    const bundle = {
      sourceAtoms: observed.sourceAtoms.value,
      generationManifest: observed.generationManifest.value,
      validationReport: observed.validationReport.value,
      sourceAtomsBytes: observed.sourceAtoms.bytes,
      generationManifestBytes: observed.generationManifest.bytes,
      validationReportBytes: observed.validationReport.bytes,
    };
    if (validatePresentationRetainedSourceAtomsPublishedArtifactsV001(bundle).status !== 'passed'
      || bundle.sourceAtoms.sourceRef !== source.sourceRef) {
      return {status: 'rejected' as const};
    }
    retainedSources.push({
      sourceMediaId: source.sourceMediaId,
      sourceAtoms: bundle.sourceAtoms,
      generationManifest: bundle.generationManifest,
      validationReport: bundle.validationReport,
    });
  }
  return {status: 'passed' as const, retainedSources};
};

const loadStyleArtifacts = async (
  workspaceRoot: string,
  request: JsonObject,
  tracked: TrackedFile[],
) => {
  const artifacts: JsonObject = {};
  for (const role of [
    'trustedRegistryBindings',
    'presetRegistry',
    'presetValidationIndex',
    'materialValidationIndex',
    'rendererTrust',
  ]) {
    const item = await observeJsonBinding(
      workspaceRoot,
      request.styleInput.presetBinding[role],
      tracked,
      role === 'rendererTrust' ? 'finite-output' : 'integer',
      role === 'presetValidationIndex' || role === 'materialValidationIndex'
        ? 'registryVersion'
        : 'schemaVersion',
    );
    if (item.status !== 'passed') return {status: 'rejected' as const};
    artifacts[role] = item.value;
  }
  if (request.styleInput.format === 'vertical-short-1080x1920') {
    const application = await observeJsonBinding(
      workspaceRoot,
      request.styleInput.cropPolicy.application,
      tracked,
      'finite-output',
    );
    if (application.status !== 'passed') return {status: 'rejected' as const};
    const envelope = inspectPresentationOutputCropApplicationEnvelopeV001(application.value);
    if (envelope.status !== 'passed') return {status: 'rejected' as const};
    const decision = await observeJsonBinding(
      workspaceRoot,
      envelope.decisionBinding,
      tracked,
      'finite-output',
    );
    const selection = await observeJsonBinding(
      workspaceRoot,
      envelope.selectionPackageManifestBinding,
      tracked,
      'finite-output',
    );
    if (decision.status !== 'passed' || selection.status !== 'passed') {
      return {status: 'rejected' as const};
    }
    artifacts.cropApplicationArtifact = {
      path: request.styleInput.cropPolicy.application.path,
      absolutePath: application.absolutePath,
      bytes: application.bytes,
      value: application.value,
    };
    artifacts.cropDecisionArtifact = {
      path: envelope.decisionBinding.path,
      absolutePath: decision.absolutePath,
      bytes: decision.bytes,
      value: decision.value,
    };
    artifacts.cropSelectionPackageManifest = {
      path: envelope.selectionPackageManifestBinding.path,
      absolutePath: selection.absolutePath,
      bytes: selection.bytes,
      value: selection.value,
    };
  }
  return {status: 'passed' as const, artifacts};
};

const timelineCapabilityPassed = (meaningPackage: JsonObject) => {
  if (meaningPackage.sourceMedia.length !== 1) return false;
  const sourceId = meaningPackage.sourceMedia[0].sourceMediaId;
  let previous: JsonObject | null = null;
  const intervals = new Set<string>();
  for (const segment of meaningPackage.timelineComposition.segments) {
    const key = `${segment.sourceStartMs}:${segment.sourceEndMs}`;
    if (segment.sourceMediaId !== sourceId
      || (previous !== null && previous.sourceEndMs > segment.sourceStartMs)
      || intervals.has(key)) return false;
    intervals.add(key);
    previous = segment;
  }
  return true;
};

const captionDisplayProjection = (captionDisplays: JsonObject[]) => {
  const pages = captionDisplays.flatMap(display => display.pages);
  const lines = pages.flatMap(page => page.lines);
  return {
    semanticCaptionCount: captionDisplays.length,
    displayPageCount: pages.length,
    displayLineCount: lines.length,
    maxObservedLogicalWidth: lines.reduce(
      (maximum, line) => Math.max(maximum, line.logicalWidth),
      0,
    ),
    captionPageLineMapCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(
        captionDisplays.map(display => ({
          semanticCaptionId: display.semanticCaptionId,
          pages: display.pages.map((page: JsonObject) => ({
            pageId: page.pageId,
            atomRefs: page.atomRefs,
            lines: page.lines.map((line: JsonObject) => ({
              lineId: line.lineId,
              atomRefs: line.atomRefs,
              logicalWidth: line.logicalWidth,
            })),
          })),
        })),
      ),
  };
};

const timelineProjection = (
  meaningPackage: JsonObject,
  timeline: JsonObject,
  baseMediaFileSha256: string,
) => ({
  sourceMediaCount: meaningPackage.sourceMedia.length,
  segmentCount: meaningPackage.timelineComposition.segments.length,
  outputFrameCount: timeline.baseMedia.expectedFrameCount,
  sourceToOutputMappingCanonicalSha256:
    canonicalSha256PresentationMeaningInformationJsonV001(timeline.segments),
  baseMediaFileSha256,
});

const buildFinalLayoutInspection = async (
  renderPlan: JsonObject,
  layoutContext: JsonObject,
) => {
  const items = [];
  for (const display of renderPlan.captionDisplays) {
    for (const page of display.pages) {
      const inspection = await inspectPresentationOutputDisplayPageV001({
        layoutContext,
        indexedLines: page.lines.map((line: JsonObject, index: number) => ({
          lineIndex: index,
          renderedText: line.text,
        })),
        pageId: page.pageId,
      });
      if (inspection.status !== 'passed' || inspection.violations.length !== 0) {
        throw new Error('accepted display page no longer passes physical inspection');
      }
      const item = inspection.inspection?.items?.[0];
      if (!item) throw new Error('layout inspection item missing');
      items.push({
        instructionId: page.pageId,
        stateId: item.stateId,
        lineCount: item.lineCount,
        lineRects: clone(item.lineRects),
        wrapper: clone(item.wrapper),
      });
    }
  }
  return {
    schemaVersion: 'presentation-output-native-layout-inspection-v001',
    status: 'passed',
    canvas: clone(layoutContext.canvas),
    items,
    violations: [],
  };
};

const retainedSafetyArtifacts = async (core: JsonObject, workspaceRoot: string) => {
  const warnings = core.cleanupWarnings ?? core.failure?.cleanupWarnings ?? [];
  const order = [
    'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY',
    'RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY',
  ];
  if (!dense(warnings) || warnings.some((item: JsonObject) => (
    !isObject(item)
    || !order.includes(item.code)
    || typeof item.path !== 'string'
    || !WORKSPACE_PATH.test(item.path)
  ))) throw new Error('unknown retained safety artifact');
  const projected = order.flatMap(code => warnings
    .filter((item: JsonObject) => item?.code === code)
    .map((item: JsonObject) => ({code, path: item.path})));
  if (new Set(projected.map(item => `${item.code}\u0000${item.path}`)).size
    !== projected.length) throw new Error('duplicate retained safety artifact');
  for (const item of projected) {
    const {absolutePath} = await resolveWorkspacePath(workspaceRoot, item.path);
    const observed = await lstat(absolutePath);
    if (observed.isSymbolicLink() || await realpath(absolutePath) !== absolutePath) {
      throw new Error('unsafe retained safety artifact');
    }
  }
  return projected;
};

const formalBytes = (value: unknown) => {
  const serialized = serializePresentationMeaningInformationFormalJsonV001(value);
  return Buffer.isBuffer(serialized) ? serialized : Buffer.from(serialized);
};

const renderBytes = (value: unknown) => Buffer.from(
  serializePresentationOutputRenderJsonV001(value),
  'utf8',
);

const regularFileAt = async (absolutePath: string) => {
  const item = await lstat(absolutePath, {bigint: true});
  return singleRegular(item) && await realpath(absolutePath) === absolutePath;
};

const regularDirectoryAt = async (absolutePath: string) => {
  const item = await lstat(absolutePath);
  return item.isDirectory() && !item.isSymbolicLink()
    && await realpath(absolutePath) === absolutePath;
};

const compareUtf8 = (left: string, right: string) => Buffer.compare(
  Buffer.from(left, 'utf8'),
  Buffer.from(right, 'utf8'),
);

const formalOverlayName = (pageId: string, index: number) => (
  `${String(index + 1).padStart(6, '0')}-${hash(Buffer.from(pageId, 'utf8')).slice(0, 12)}.png`
);

const expectedRenderRootNames = () => [
  OUTPUT_DRAW_ARTIFACT_NAMES_V001.video,
  OUTPUT_DRAW_ARTIFACT_NAMES_V001.overlays,
  OUTPUT_DRAW_ARTIFACT_NAMES_V001.applicationResults,
  OUTPUT_DRAW_ARTIFACT_NAMES_V001.qc,
  OUTPUT_DRAW_ARTIFACT_NAMES_V001.manifest,
].sort(compareUtf8);

const readStagedJson = async (absolutePath: string) => {
  if (!await regularFileAt(absolutePath)) return null;
  return decodeFiniteOutputJsonValue(await readAbsoluteStable(absolutePath));
};

/**
 * 新forward-only render rootの唯一のexact staging検査入口。
 * 旧v002の6-entry projectorを再利用・複製せず、新しい5種だけを検査する。
 */
export async function validatePresentationOutputStagedArtifactsV001({
  stagingDirectory,
  expected,
}: {
  stagingDirectory: string;
  expected: JsonObject;
}) {
  try {
    if (!await regularDirectoryAt(stagingDirectory)) return {status: 'rejected'};
    const rootNames = (await readdir(stagingDirectory)).sort(compareUtf8);
    if (!same(rootNames, expectedRenderRootNames())) return {status: 'rejected'};
    const overlaysDirectory = path.join(
      stagingDirectory,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.overlays,
    );
    if (!await regularDirectoryAt(overlaysDirectory)) return {status: 'rejected'};
    for (const name of [
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.video,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.applicationResults,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.qc,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.manifest,
    ]) {
      if (!await regularFileAt(path.join(stagingDirectory, name))) {
        return {status: 'rejected'};
      }
    }
    const pages = expected.renderPlan.captionDisplays.flatMap(
      (display: JsonObject) => display.pages,
    );
    const expectedOverlays = pages.map((page: JsonObject, index: number) =>
      formalOverlayName(page.pageId, index));
    const actualOverlays = (await readdir(overlaysDirectory)).sort(compareUtf8);
    if (!same(actualOverlays, [...expectedOverlays].sort(compareUtf8))) {
      return {status: 'rejected'};
    }
    for (const name of actualOverlays) {
      if (!await regularFileAt(path.join(overlaysDirectory, name))) {
        return {status: 'rejected'};
      }
    }
    const applicationResults = await readStagedJson(path.join(
      stagingDirectory,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.applicationResults,
    ));
    const qc = await readStagedJson(path.join(
      stagingDirectory,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.qc,
    ));
    const manifest = await readStagedJson(path.join(
      stagingDirectory,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.manifest,
    ));
    if (
      validatePresentationOutputRenderApplicationResultsV001(applicationResults, {
        outputId: expected.request.publication.outputId,
        renderPlan: expected.renderPlan,
        finalElements: expected.finalElements,
        presetRegistryVersion: expected.presetRegistryVersion,
      }).status !== 'passed'
      || validatePresentationOutputRenderQcV001(qc, {
        outputId: expected.request.publication.outputId,
        rendererQc: expected.qc.rendererQc,
      }).status !== 'passed'
      || validatePresentationOutputRenderManifestV001(manifest, {
        outputId: expected.request.publication.outputId,
        formalJob: expected.job,
      }).status !== 'passed'
      || validatePresentationOutputRenderPlanV001(expected.renderPlan, {
        requestId: expected.request.requestId,
        meaningPackage: expected.meaningPackage,
      }).status !== 'passed'
    ) return {status: 'rejected'};

    const applicationPath = `${expected.request.publication.renderOutputRoot}/${
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.applicationResults}`;
    const qcPath = `${expected.request.publication.renderOutputRoot}/${
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.qc}`;
    const videoPath = `${expected.request.publication.renderOutputRoot}/${
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.video}`;
    const applicationBytes = await readAbsoluteStable(path.join(
      stagingDirectory,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.applicationResults,
    ));
    const qcBytes = await readAbsoluteStable(path.join(
      stagingDirectory,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.qc,
    ));
    const manifestBytes = await readAbsoluteStable(path.join(
      stagingDirectory,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.manifest,
    ));
    const videoSha256 = await hashAbsoluteStableStreaming(path.join(
      stagingDirectory,
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.video,
    ));
    if (
      !applicationBytes.equals(renderBytes(applicationResults))
      || !qcBytes.equals(renderBytes(qc))
      || !manifestBytes.equals(renderBytes(manifest))
      || !same(applicationResults, expected.applicationResults)
      || !same(qc, expected.qc)
      || !same(manifest, expected.manifest)
      || !same(manifest.formalOutputJobBinding, expected.formalOutputJobBinding)
      || !same(manifest.outputRequestBinding, expected.controlRequestBinding)
      || !same(manifest.acceptanceReportBinding, expected.acceptanceReportBinding)
      || !same(manifest.renderPlanBinding, expected.renderPlanBinding)
      || !same(manifest.meaningPackageBinding, expected.request.meaningInformationPackage)
      || !same(manifest.baseMediaBinding, expected.request.baseMediaInput)
      || !same(manifest.resolvedStyle, expected.renderPlan.resolvedStyle)
      || !same(manifest.runtimeProfile, expected.job.runtimeProfile)
      || !same(manifest.implementationBindings, expected.job.implementationBindings)
      || !same(manifest.applicationResultsBinding, jsonBinding(
        applicationResults.schemaVersion,
        applicationPath,
        applicationBytes,
        applicationResults,
        canonicalSha256FiniteOutputJson,
      ))
      || !same(manifest.qcBinding, jsonBinding(
        qc.schemaVersion,
        qcPath,
        qcBytes,
        qc,
        canonicalSha256FiniteOutputJson,
      ))
      || qc.outputMedia.video.path !== videoPath
      || qc.outputMedia.video.fileSha256 !== videoSha256
      || qc.outputMedia.frameCount !== expected.baseReceipt.mediaProjection.frameCount
      || qc.outputMedia.sampleCount !== expected.baseReceipt.mediaProjection.sampleCount
      || qc.outputMedia.audioPacketPayloadSha256
        !== expected.baseReceipt.mediaProjection.audioPacketPayloadSha256
      || !same(qc.renderPlanBinding, expected.renderPlanBinding)
      || !same(qc.applicationResultsBinding, manifest.applicationResultsBinding)
      || applicationResults.results.length !== pages.length
    ) return {status: 'rejected'};
    const seenOverlayPaths = new Set<string>();
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const item = applicationResults.results[index];
      const name = expectedOverlays[index];
      const finalPath = `${expected.request.publication.renderOutputRoot}/${
        OUTPUT_DRAW_ARTIFACT_NAMES_V001.overlays}/${name}`;
      const overlaySha256 = await hashAbsoluteStableStreaming(path.join(
        overlaysDirectory,
        name,
      ));
      if (
        item.pageId !== page.pageId
        || item.overlay.path !== finalPath
        || item.overlay.fileSha256 !== overlaySha256
        || seenOverlayPaths.has(finalPath)
      ) return {status: 'rejected'};
      seenOverlayPaths.add(finalPath);
    }
    return {status: 'passed'};
  } catch {
    return {status: 'rejected'};
  }
}

const verifyFormalJobEnvironment = async (
  workspaceRoot: string,
  job: JsonObject,
  tracked: TrackedFile[],
) => {
  const [profileReportObserved, trustObserved] = await Promise.all([
    readStable(workspaceRoot, PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001.reportPath),
    readStable(workspaceRoot, PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001.trustPath),
  ]);
  const profileReport = decodeFiniteOutputJsonValue(profileReportObserved.bytes);
  const verticalTrust = decodeFiniteOutputJsonValue(trustObserved.bytes);
  if (hash(profileReportObserved.bytes)
      !== PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001.reportFileSha256
    || hash(trustObserved.bytes)
      !== PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001.trustFileSha256
    || !isObject(profileReport)
    || profileReport.status !== 'passed'
    || !isObject(profileReport.runtimeProfile)
    || !isObject(profileReport.outputBindings?.rendererTrust)
    || profileReport.outputBindings.rendererTrust.path
      !== PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001.trustPath
    || profileReport.outputBindings.rendererTrust.fileSha256
      !== PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001.trustFileSha256
    || !isObject(verticalTrust)
    || verticalTrust.schemaVersion !== 'presentation-vertical-renderer-trust-v001'
    || !same(profileReport.runtimeProfile, verticalTrust.toolVersions)
    || !same(job.runtimeProfile, profileReport.runtimeProfile)) return false;
  tracked.push(
    {
      absolutePath: profileReportObserved.absolutePath,
      fileSha256: PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001.reportFileSha256,
    },
    {
      absolutePath: trustObserved.absolutePath,
      fileSha256: PRESENTATION_OUTPUT_RUNTIME_PROFILE_SOURCE_V001.trustFileSha256,
    },
  );
  for (const binding of job.implementationBindings) {
    const observed = await readStable(workspaceRoot, binding.path);
    if (hash(observed.bytes) !== binding.fileSha256) return false;
    tracked.push({absolutePath: observed.absolutePath, fileSha256: binding.fileSha256});
  }
  for (const binding of job.approvedContractBindings) {
    const observed = await readStable(workspaceRoot, binding.path);
    if (hash(observed.bytes) !== binding.fileSha256) return false;
    tracked.push({absolutePath: observed.absolutePath, fileSha256: binding.fileSha256});
  }
  for (const binding of Object.values(job.runtimeProfile) as JsonObject[]) {
    if (!path.isAbsolute(binding.path)) return false;
    if (await hashBoundRuntimeToolStableStreaming(binding.path) !== binding.fileSha256) {
      return false;
    }
    tracked.push({
      absolutePath: binding.path,
      fileSha256: binding.fileSha256,
      pathPolicy: 'bound-runtime-tool',
    });
  }
  return true;
};

const observeBaseMediaBundle = async (
  workspaceRoot: string,
  request: JsonObject,
  meaningPackage: JsonObject,
  tracked: TrackedFile[],
) => {
  const baseMedia = await observeMediaBinding(
    workspaceRoot,
    request.baseMediaInput.baseMedia,
    tracked,
  );
  const timeline = await observeJsonBinding(
    workspaceRoot,
    request.baseMediaInput.timeline,
    tracked,
  );
  const manifest = await observeJsonBinding(
    workspaceRoot,
    request.baseMediaInput.generationManifest,
    tracked,
  );
  const receipt = await observeJsonBinding(
    workspaceRoot,
    request.baseMediaInput.validationReceipt,
    tracked,
  );
  if ([baseMedia, timeline, manifest, receipt].some(item => item.status !== 'passed')) {
    return {status: 'rejected' as const};
  }
  if (validatePresentationOutputBaseMediaGenerationManifestV001(manifest.value) !== true
    || validatePresentationOutputBaseMediaValidationReceiptV001(receipt.value) !== true) {
    return {status: 'rejected' as const};
  }
  const job = await observeJsonBinding(
    workspaceRoot,
    manifest.value.jobBinding,
    tracked,
  );
  if (job.status !== 'passed'
    || validatePresentationOutputBaseMediaBuildJobV001(job.value).status !== 'passed') {
    return {status: 'rejected' as const};
  }
  const outputRoot = path.posix.dirname(request.baseMediaInput.baseMedia.path);
  const expectedSourceMediaBindings = meaningPackage.sourceMedia.map(
    (source: JsonObject) => source.mediaBinding,
  );
  const expectedSemanticProjection = {
    sourceMediaCount: meaningPackage.sourceMedia.length,
    segmentCount: meaningPackage.timelineComposition.segments.length,
    sourceMediaBindingsCanonicalSha256:
      canonicalSha256PresentationOutputBaseMediaJsonV001(expectedSourceMediaBindings),
    timelineCompositionCanonicalSha256:
      canonicalSha256PresentationOutputBaseMediaJsonV001(
        meaningPackage.timelineComposition,
      ),
  };
  const expectedMediaProjection = {
    frameCount: manifest.value.mediaBuildProjection.frameCount,
    sampleCount: manifest.value.mediaBuildProjection.sampleCount,
    audioPacketPayloadSha256:
      manifest.value.mediaBuildProjection.audioPacketPayloadSha256,
  };
  if (
    job.value.outputRoot !== outputRoot
    || !same(job.value.meaningPackageBinding, request.meaningInformationPackage)
    || job.value.expectedTimelineCompositionCanonicalSha256
      !== expectedSemanticProjection.timelineCompositionCanonicalSha256
    || manifest.value.manifestId !== `${job.value.jobId}-generation-manifest`
    || receipt.value.receiptId !== `${job.value.jobId}-validation-receipt`
    || !same(manifest.value.jobBinding, receipt.value.jobBinding)
    || manifest.value.jobBinding.path
      !== `${PRESENTATION_OUTPUT_BASE_MEDIA_JOB_ROOT_V001}/${job.value.jobId}.json`
    || !same(manifest.value.jobBinding, {
      schemaVersion: manifest.value.jobBinding.schemaVersion,
      path: manifest.value.jobBinding.path,
      fileSha256: hash(job.bytes),
      canonicalSha256:
        canonicalSha256PresentationOutputBaseMediaJsonV001(job.value),
    })
    || !same(manifest.value.meaningPackageBinding, request.meaningInformationPackage)
    || !same(manifest.value.sourceMediaBindings, expectedSourceMediaBindings)
    || !same(manifest.value.semanticProjection, expectedSemanticProjection)
    || !same(manifest.value.baseMedia, request.baseMediaInput.baseMedia)
    || !same(manifest.value.timeline, request.baseMediaInput.timeline)
    || request.baseMediaInput.baseMedia.path !== `${outputRoot}/base-media.mp4`
    || request.baseMediaInput.timeline.path !== `${outputRoot}/timeline.json`
    || request.baseMediaInput.generationManifest.path
      !== `${outputRoot}/generation-manifest.json`
    || request.baseMediaInput.validationReceipt.path
      !== `${outputRoot}/validation-receipt.json`
    || !same(receipt.value.manifestBinding, request.baseMediaInput.generationManifest)
    || !same(receipt.value.mediaProjection, {
      ...expectedMediaProjection,
      baseMediaFileSha256: request.baseMediaInput.baseMedia.fileSha256,
      timelineFileSha256: request.baseMediaInput.timeline.fileSha256,
    })
    || receipt.value.mediaProjection.baseMediaFileSha256
      !== request.baseMediaInput.baseMedia.fileSha256
    || receipt.value.mediaProjection.timelineFileSha256
      !== request.baseMediaInput.timeline.fileSha256
  ) return {status: 'rejected' as const};
  return {
    status: 'passed' as const,
    baseMedia,
    timeline,
    manifest,
    receipt,
    job,
  };
};

const buildOccurrenceRecords = (
  meaningPackage: JsonObject,
  occurrenceAtoms: Map<string, JsonObject>,
) => meaningPackage.captions.flatMap((caption: JsonObject) => caption.atomRefs.map(
  (atomRef: JsonObject) => {
    const atom = occurrenceAtoms.get(occurrenceKey(atomRef));
    if (!atom) throw new TypeError('caption AtomRef is absent from retained occurrence map');
    return {
      atomRef: clone(atomRef),
      text: atom.text,
      startMs: atom.startMs,
      endMs: atom.endMs,
    };
  },
));

const cropApplicationMatchesBase = (styleState: JsonObject, request: JsonObject) => {
  if (request.styleInput.format === 'normal-landscape') return true;
  return isObject(styleState.cropContext?.applicationBindingProjection)
    && same(
      styleState.cropContext.applicationBindingProjection.targetBaseMedia,
      request.baseMediaInput,
    )
    && styleState.cropContext?.selectionProjection?.screenLayoutId
      === request.styleInput.screenLayoutId;
};

export const publishPresentationOutputRenderFailureV002 = async ({
  workspaceRoot,
  request,
  job,
  formalJobFileSha256,
  formalOutputJobBinding,
  controlRequestBinding,
  acceptanceReportBinding,
  renderPlanBinding,
  observation,
  safetyArtifacts,
}: JsonObject) => {
  const outputRoot = `${PRESENTATION_OUTPUT_RENDER_FAILURE_ROOT_V001}/${
    request.publication.outputId}/${formalJobFileSha256}`;
  let report: JsonObject;
  try {
    report = buildPresentationOutputRenderFailureReportV002({
      outputId: request.publication.outputId,
      formalJobFileSha256,
      status: observation.status,
      stage: observation.stage,
      formalOutputJobBinding,
      outputRequestBinding: controlRequestBinding,
      acceptanceReportBinding,
      renderPlanBinding,
      failureObservation: observation.failureObservation,
      fatalObservation: observation.fatalObservation,
      retainedSafetyArtifacts: safetyArtifacts,
    });
    if (validatePresentationOutputRenderFailureReportV002(report, {
      rendererCodes: PRESENTATION_RENDERER_VIOLATION_CODES,
      outputId: request.publication.outputId,
      formalJobFileSha256,
      formalOutputJobBinding,
      outputRequestBinding: controlRequestBinding,
      acceptanceReportBinding,
      renderPlanBinding,
      retainedSafetyArtifacts: safetyArtifacts,
    }).status !== 'passed') throw new TypeError('render failure report is invalid');
    const bytes = renderBytes(report);
    await publishExactDirectory({
      workspaceRoot,
      outputRoot,
      files: [{name: 'failure-report.json', bytes}],
    });
    return {
      status: observation.status,
      exitCode: observation.status === 'rejected' ? 1 : 2,
      report,
      bytes,
      failureRoot: outputRoot,
      retainedSafetyArtifacts: safetyArtifacts,
      stderr: null,
    };
  } catch {
    return {
      status: 'fatal',
      exitCode: 2,
      report: null,
      bytes: null,
      failureRoot: null,
      stderr: fatalDiagnostic(
        'publication',
        'OUTPUT_RENDER_PUBLICATION_FAILED',
        buildClosedFatalObservationV002({
          innerStage: 'failure-report-publication',
          evidence: {kind: 'report-publication-failed'},
        }),
      ).stderr,
    };
  }
};

export const inspectPresentationOutputCoreFailureObservationV001 = (core: JsonObject) => {
  const coreStage = core.failure?.stage;
  if (typeof coreStage !== 'string') throw new TypeError('core failure stage is absent');
  if (core.exitCode === 1) {
    const projected = projectPresentationOutputRendererViolationsV001({
      violations: core.failure?.violations ?? [],
      rendererCodes: PRESENTATION_RENDERER_VIOLATION_CODES,
    });
    if (projected.status !== 'passed') {
      throw new TypeError('common renderer violations cannot be projected');
    }
    return {
      status: 'rejected',
      stage: coreStage,
      failureObservation: {
        source: 'common-draw-core',
        coreStage,
        violations: projected.violations,
        diagnosticCode: 'OUTPUT_RENDER_CORE_CONTRACT_FAILED',
      },
      fatalObservation: null,
    };
  }
  const processEvidence = core?.presentationFatalProcessEvidence;
  const fatalObservation = isObject(processEvidence)
    ? buildTrustedFatalObservationV002({
      innerStage: processEvidence.innerStage,
      innerCode: processEvidence.innerCode,
    })
    : unknownFatalObservationV002();
  return {
    status: 'fatal',
    stage: coreStage,
    failureObservation: {
      source: 'common-draw-core',
      coreStage,
      violations: [],
      diagnosticCode: 'OUTPUT_RENDER_CORE_PROCESS_FAILED',
    },
    fatalObservation,
  };
};

const fatalDiagnostic = (
  stage: string,
  diagnosticCode: string,
  fatalObservation: JsonObject = unknownFatalObservationV002(),
) => {
  if (!PRESENTATION_OUTPUT_RUNNER_OUTER_CODES_V001.includes(diagnosticCode)) {
    throw new TypeError('output runner diagnostic code is not owned');
  }
  const closedObservation = validatePresentationFatalObservationV002(fatalObservation)
    ? fatalObservation
    : unknownFatalObservationV002();
  return {
    status: 'fatal',
    exitCode: 2,
    report: null,
    bytes: null,
    stderr: {
      schemaVersion: 'presentation-output-runner-diagnostic-v002',
      status: 'fatal',
      stage,
      diagnosticCode,
      fatalObservation: closedObservation,
    },
  };
};

export const inspectPresentationOutputRendererCoreBootstrapV002 = async ({
  workspaceRoot,
  moduleNamespace,
  job,
}: {
  workspaceRoot: string;
  moduleNamespace: JsonObject;
  job: JsonObject;
}) => {
  if (inspectPresentationOutputRendererCoreExportsV001(moduleNamespace).status === 'passed') {
    return {status: 'passed' as const};
  }
  const acceptedJob = validatePresentationOutputFormalJobV001(job);
  const commonRendererBindings = Array.isArray(job?.implementationBindings)
    ? job.implementationBindings.filter(
      (binding: JsonObject) => binding.role === 'common-renderer',
    )
    : [];
  const commonRendererBinding = commonRendererBindings.length === 1
    ? commonRendererBindings[0]
    : null;
  const verifiedTargetSources: JsonObject[] = [];
  if (acceptedJob && commonRendererBinding !== null) {
    try {
      const observed = await readStable(workspaceRoot, commonRendererBinding.path);
      if (hash(observed.bytes) === commonRendererBinding.fileSha256) {
        verifiedTargetSources.push({
          sourceField: 'job.implementationBindings[*]',
          path: commonRendererBinding.path,
          fileSha256: commonRendererBinding.fileSha256,
        });
      }
    } catch {
      // A missing or unstable implementation file cannot become a fatal target.
    }
  }
  const targetFile = commonRendererBinding
    ? selectOutputJobTargetFileV002({
      sourceField: 'job.implementationBindings[*]',
      binding: commonRendererBinding,
      verifiedTargetSources,
      sourceRecordVerified: acceptedJob,
    })
    : null;
  return fatalDiagnostic(
    'execution',
    'OUTPUT_RENDER_CORE_PROCESS_FAILED',
    buildClosedFatalObservationV002({
      innerStage: 'runner-bootstrap',
      targetFile,
      evidence: {kind: 'required-export-missing'},
    }),
  );
};

export const inspectPresentationOutputRenderFailureTargetV002 = async ({
  workspaceRoot,
  outputId,
  formalJobFileSha256,
}: {
  workspaceRoot: string;
  outputId: string;
  formalJobFileSha256: string;
}) => {
  const failureRoot = `${PRESENTATION_OUTPUT_RENDER_FAILURE_ROOT_V001}/${
    outputId}/${formalJobFileSha256}`;
  const targetInvalid = () => fatalDiagnostic(
    'publication',
    'OUTPUT_RENDER_FAILURE_TARGET_INVALID',
    buildClosedFatalObservationV002({
      innerStage: 'failure-report-publication',
      evidence: {kind: 'report-target-invalid'},
    }),
  );
  try {
    const resolvedFailureRoot = await resolveWorkspacePath(workspaceRoot, failureRoot);
    if (await lstatOrNull(resolvedFailureRoot.absolutePath)) return targetInvalid();
  } catch {
    return targetInvalid();
  }
  return {status: 'passed' as const, failureRoot};
};

export async function runPresentationOutputJobV001({
  workspaceRoot,
  jobPath,
}: {
  workspaceRoot: string;
  jobPath: string;
}) {
  const tracked: TrackedFile[] = [];
  const jobPrefix = `${PRESENTATION_OUTPUT_FORMAL_JOB_ROOT_V001}/`;
  const jobSuffix = '/formal-output-job.json';
  if (
    typeof workspaceRoot !== 'string'
    || typeof jobPath !== 'string'
    || !jobPath.startsWith(jobPrefix)
    || !jobPath.endsWith(jobSuffix)
  ) return fatalDiagnostic('job-validation', 'OUTPUT_FORMAL_JOB_INVALID');
  const requestId = jobPath.slice(jobPrefix.length, -jobSuffix.length);
  if (!FORMAL_ID.test(requestId) || requestId.includes('/')) {
    return fatalDiagnostic('job-validation', 'OUTPUT_FORMAL_JOB_INVALID');
  }
  const expectedOutputId = `${requestId}-output`;
  const expectedControlOutputRoot =
    `evals/clip_composition/outputs/presentation/meaning-output-control/${requestId}`;
  const expectedRenderOutputRoot =
    `evals/clip_composition/outputs/presentation/meaning-output-renders/${expectedOutputId}`;

  let jobObserved: {absolutePath: string; bytes: Buffer};
  let job: JsonObject;
  let requestObserved: JsonObject;
  try {
    jobObserved = await readStable(workspaceRoot, jobPath);
    job = decodeStrict(jobObserved.bytes) as JsonObject;
    if (!isObject(job) || job.schemaVersion !== PRESENTATION_OUTPUT_FORMAL_JOB_SCHEMA_V001) {
      return fatalDiagnostic('job-validation', 'OUTPUT_FORMAL_JOB_INVALID');
    }
    tracked.push({absolutePath: jobObserved.absolutePath, fileSha256: hash(jobObserved.bytes)});
  } catch (error: any) {
    return fatalDiagnostic(
      'job-validation',
      'OUTPUT_FORMAL_JOB_INVALID',
      buildClosedFatalObservationV002({
        innerStage: 'job-read',
        evidence: typeof error?.code === 'string'
          ? {kind: 'node-error', code: error.code}
          : {kind: 'unclassified'},
      }),
    );
  }
  try {
    requestObserved = await observePresentationOutputRawRequestBindingV001(
      workspaceRoot,
      job.requestBinding,
      tracked,
    );
  } catch (error: any) {
    return fatalDiagnostic(
      'job-validation',
      'OUTPUT_FORMAL_JOB_INVALID',
      buildClosedFatalObservationV002({
        innerStage: 'input-read',
        evidence: typeof error?.code === 'string'
          ? {kind: 'node-error', code: error.code}
          : {kind: 'unclassified'},
      }),
    );
  }
  const request = requestObserved.value;
  if (requestObserved.status !== 'passed') {
    return fatalDiagnostic(
      'job-validation',
      'OUTPUT_FORMAL_JOB_INVALID',
      inspectPresentationOutputRequestFatalObservationV002({job, requestObservation: requestObserved}),
    );
  }
  if (
    !jobObserved.bytes.equals(formalBytes(job))
    || !requestObserved.bytes.equals(formalBytes(request))
    || !validatePresentationOutputFormalJobV001(job)
    || job.requestBinding.path !== `${jobPrefix}${requestId}/output-request.json`
    || job.controlOutputRoot !== expectedControlOutputRoot
    || job.renderOutputRoot !== expectedRenderOutputRoot
    || job.expectedOutputId !== expectedOutputId
    || !await verifyFormalJobEnvironment(workspaceRoot, job, tracked)
  ) return fatalDiagnostic('job-validation', 'OUTPUT_FORMAL_JOB_INVALID');

  const rendererBootstrap = await inspectPresentationOutputRendererCoreBootstrapV002({
    workspaceRoot,
    moduleNamespace: presentationRendererCoreV002,
    job,
  });
  if (rendererBootstrap.status !== 'passed') return rendererBootstrap;

  const formalJobFileSha256 = hash(jobObserved.bytes);
  const formalOutputJobBinding = jsonBinding(
    PRESENTATION_OUTPUT_FORMAL_JOB_SCHEMA_V001,
    jobPath,
    jobObserved.bytes,
    job,
  );
  const controlRequestPath = `${expectedControlOutputRoot}/${
    CONTROL_ARTIFACT_NAMES.request}`;
  const controlRequestBinding = jsonBinding(
    job.requestBinding.schemaVersion,
    controlRequestPath,
    requestObserved.bytes,
    request,
  );

  const state: JsonObject = {
    request,
    requestBytes: requestObserved.bytes,
    meaningObserved: null,
    meaningPackage: null,
    meaningProvenance: null,
    base: null,
    baseMediaInspection: null,
    sourceMediaInspection: null,
    sourceMediaTracked: null,
    sourceIdentity: null,
    styleArtifacts: null,
    styleResolution: null,
    timelineDecision: null,
    retainedSources: null,
    expectedAtomOccurrences: null,
    occurrenceAtoms: null,
    pageLinePlan: null,
    renderPlan: null,
    renderPlanBytes: null,
    renderPlanBinding: null,
  };

  const evaluators: JsonObject = {
    requestSchema: async () => {
      const inspected = inspectPresentationOutputRequestV001(request);
      const requestSchemaValid = inspected.status === 'passed';
      const requestBindingMatches = isObject(request)
        && request.requestId === requestId
        && request.publication?.outputId === expectedOutputId
        && request.publication?.controlRoot === expectedControlOutputRoot
        && request.publication?.renderOutputRoot === expectedRenderOutputRoot
        && hash(state.requestBytes) === job.requestBinding.fileSha256
        && canonicalSha256PresentationMeaningInformationJsonV001(request)
          === job.requestBinding.canonicalSha256;
      return acceptanceObservation('requestSchema', {
        requestSchemaValid,
        requestBindingMatches,
      });
    },
    meaningPackageBinding: async () => {
      try {
        state.meaningObserved = await observeJsonBinding(
          workspaceRoot,
          request.meaningInformationPackage,
          tracked,
        );
      } catch {
        return acceptanceObservation('meaningPackageBinding', {bindingMatches: false});
      }
      if (state.meaningObserved.status !== 'passed') {
        return acceptanceObservation('meaningPackageBinding', {bindingMatches: false});
      }
      state.meaningPackage = state.meaningObserved.value;
      try {
        state.meaningProvenance = await observeMeaningPackageProvenance({
          workspaceRoot,
          packageBinding: request.meaningInformationPackage,
          packageValue: state.meaningPackage,
          tracked,
        });
      } catch {
        return acceptanceObservation('meaningPackageBinding', {bindingMatches: false});
      }
      return acceptanceObservation('meaningPackageBinding', {
        bindingMatches: state.meaningProvenance.status !== 'binding-mismatch',
      });
    },
    meaningPackage: async () => {
      try {
        const timelineDecision = state.meaningProvenance?.timelineDecision;
        if (state.meaningProvenance?.status !== 'passed'
          || !validatePresentationTimelineCompositionDecisionV001(timelineDecision)
          || !same(timelineDecision.sourceMedia, state.meaningPackage.sourceMedia)
          || !same(
            timelineDecision.segments,
            state.meaningPackage.timelineComposition.segments,
          )) {
          return acceptanceObservation('meaningPackage', {packageValid: false});
        }
        const retained = await loadRetainedSources(
          workspaceRoot,
          state.meaningPackage,
          tracked,
        );
        if (retained.status !== 'passed') {
          return acceptanceObservation('meaningPackage', {packageValid: false});
        }
        const derived = derivePresentationExpectedAtomOccurrencesV001({
          timelineDecision,
          retainedSources: retained.retainedSources,
        });
        const packageValid = derived.status === 'passed'
          && validatePresentationOutputMeaningPackageV001(state.meaningPackage, {
            timelineDecision,
            expectedAtomOccurrences: derived.expectedAtomOccurrences,
            occurrenceAtoms: derived.occurrenceAtoms,
          }).status === 'passed'
          && state.meaningObserved.bytes.equals(formalBytes(state.meaningPackage));
        if (packageValid) {
          state.timelineDecision = timelineDecision;
          state.retainedSources = retained.retainedSources;
          state.expectedAtomOccurrences = derived.expectedAtomOccurrences;
          state.occurrenceAtoms = buildOccurrenceRecords(
            state.meaningPackage,
            derived.occurrenceAtoms,
          );
        }
        return acceptanceObservation('meaningPackage', {packageValid});
      } catch {
        return acceptanceObservation('meaningPackage', {packageValid: false});
      }
    },
    baseMediaInput: async () => {
      try {
        state.base = await observeBaseMediaBundle(
          workspaceRoot,
          request,
          state.meaningPackage,
          tracked,
        );
        if (state.base.status !== 'passed') {
          return acceptanceObservation('baseMediaInput', {inputMatches: false});
        }
        const {media, frameCount} = await withStableToolInputs({
          runtimeProfile: job.runtimeProfile,
          media: [{
            absolutePath: state.base.baseMedia.absolutePath,
            fileSha256: request.baseMediaInput.baseMedia.fileSha256,
          }],
          operation: async () => ({
            media: await inspectRenderedMediaWithToolsV001(
              state.base.baseMedia.absolutePath,
              {
                ffprobePath: job.runtimeProfile.ffprobe.path,
                ffmpegPath: job.runtimeProfile.ffmpeg.path,
              },
            ),
            frameCount: await inspectFrameCountWithToolV001(
              state.base.baseMedia.absolutePath,
              job.runtimeProfile.ffprobe.path,
              'input-read',
            ),
          }),
        });
        if (!media.video || !media.audio || !Number.isSafeInteger(frameCount)
          || frameCount <= 0) {
          return acceptanceObservation('baseMediaInput', {inputMatches: false});
        }
        media.video.frameCount = frameCount;
        state.baseMediaInspection = {
          fileSha256: request.baseMediaInput.baseMedia.fileSha256,
          frameCount,
          media,
        };
        const receipt = state.base.receipt.value;
        const inputMatches = frameCount === receipt.mediaProjection.frameCount
          && media.audio.packetPayloadSha256
            === receipt.mediaProjection.audioPacketPayloadSha256;
        return acceptanceObservation('baseMediaInput', {inputMatches});
      } catch {
        return acceptanceObservation('baseMediaInput', {inputMatches: false});
      }
    },
    sourceMediaCapability: async () => {
      const sources = state.meaningPackage.sourceMedia;
      if (sources.length !== 1) {
        return acceptanceObservation('sourceMediaCapability', {
          capabilitySupported: false,
          bindingMatches: true,
        });
      }
      let observed;
      try {
        observed = await observeMediaBinding(workspaceRoot, sources[0].mediaBinding, tracked);
      } catch {
        return acceptanceObservation('sourceMediaCapability', {
          capabilitySupported: true,
          bindingMatches: false,
        });
      }
      if (observed.status !== 'passed'
        || !same(state.base.manifest.value.sourceMediaBindings, [sources[0].mediaBinding])) {
        return acceptanceObservation('sourceMediaCapability', {
          capabilitySupported: true,
          bindingMatches: false,
        });
      }
      try {
        const identity = await observeJsonBinding(
          workspaceRoot,
          sources[0].sourceIdentityBinding,
          tracked,
        );
        if (identity.status !== 'passed'
          || !validatePresentationSourceIdentityV001(identity.value)
          || identity.value.sourceRef !== sources[0].sourceRef
          || !same(identity.value.executionMedia, sources[0].mediaBinding)) {
          return acceptanceObservation('sourceMediaCapability', {
            capabilitySupported: true,
            bindingMatches: false,
          });
        }
        const {media, decodedFrameCount} = await withStableToolInputs({
          runtimeProfile: job.runtimeProfile,
          media: [{
            absolutePath: observed.absolutePath,
            fileSha256: sources[0].mediaBinding.fileSha256,
          }],
          operation: async () => ({
            media: await inspectRenderedMediaWithToolsV001(observed.absolutePath, {
              ffprobePath: job.runtimeProfile.ffprobe.path,
              ffmpegPath: job.runtimeProfile.ffmpeg.path,
            }),
            decodedFrameCount: await inspectFrameCountWithToolV001(
              observed.absolutePath,
              job.runtimeProfile.ffprobe.path,
              'input-read',
            ),
          }),
        });
        if (!media.video || !media.audio || ![30, 60].includes(media.video.fps)
          || !Number.isSafeInteger(decodedFrameCount) || decodedFrameCount <= 0) {
          return acceptanceObservation('sourceMediaCapability', {
            capabilitySupported: false,
            bindingMatches: true,
          });
        }
        state.sourceMediaInspection = {media, decodedFrameCount};
        state.sourceIdentity = identity.value;
        state.sourceMediaTracked = {
          absolutePath: observed.absolutePath,
          fileSha256: sources[0].mediaBinding.fileSha256,
        };
        return passedAcceptanceObservation('sourceMediaCapability');
      } catch {
        return acceptanceObservation('sourceMediaCapability', {
          capabilitySupported: false,
          bindingMatches: true,
        });
      }
    },
    timelineCapability: async () => acceptanceObservation('timelineCapability', {
      compositionSupported: timelineCapabilityPassed(state.meaningPackage),
    }),
    timelineFrameMapping: async () => acceptanceObservation('timelineFrameMapping', {
      mappingValid: Boolean(state.sourceIdentity && state.sourceMediaInspection)
      && validatePresentationOutputBaseMediaTimelineV001(
        state.base.timeline.value,
        {
          job: state.base.job.value,
          packageValue: state.meaningPackage,
          sourceIdentity: state.sourceIdentity,
          sourceInspection: {
            fps: state.sourceMediaInspection?.media?.video?.fps,
            decodedFrameCount: state.sourceMediaInspection?.decodedFrameCount,
          },
        },
      ) && state.base.timeline.value.baseMedia.expectedFrameCount
        === state.baseMediaInspection.frameCount,
    }),
    styleResolution: async () => {
      try {
        const loaded = await loadStyleArtifacts(workspaceRoot, request, tracked);
        if (loaded.status !== 'passed') {
          return acceptanceObservation('styleResolution', {
            bindingMatches: false,
            presetCapabilitySupported: true,
          });
        }
        state.styleArtifacts = loaded.artifacts;
        state.styleResolution = await resolvePresentationOutputStyleV001({
          styleInput: request.styleInput,
          artifacts: loaded.artifacts,
          baseMediaInput: request.baseMediaInput,
          baseMediaInspection: state.baseMediaInspection === null
            ? null
            : {
              width: state.baseMediaInspection.media.video.width,
              height: state.baseMediaInspection.media.video.height,
              frameCount: state.baseMediaInspection.frameCount,
              fps: state.baseMediaInspection.media.video.fps,
            },
          runtimeProfile: job.runtimeProfile,
          implementationBindings: job.implementationBindings,
        });
      } catch (error) {
        if (error instanceof RangeError) throw error;
        return acceptanceObservation('styleResolution', {
          bindingMatches: false,
          presetCapabilitySupported: true,
        });
      }
      const observedCodes = new Set(
        state.styleResolution.status === 'rejected'
          ? state.styleResolution.violations.map((item: JsonObject) => item.code)
          : [],
      );
      const hasResolvedStyle = Boolean(
        state.styleResolution.resolvedStyle && state.styleResolution.layoutContext,
      );
      return acceptanceObservation('styleResolution', {
        bindingMatches: !observedCodes.has('STYLE_BINDING_MISMATCH')
          && (hasResolvedStyle || observedCodes.has('CROP_BINDING_MISMATCH')),
        presetCapabilitySupported: !observedCodes.has('PRESET_CAPABILITY_MISMATCH'),
      });
    },
    cropResolution: async () => {
      if (state.styleResolution.status === 'rejected') {
        const cropViolations = state.styleResolution.violations.filter(
          (item: JsonObject) => item.code === 'CROP_BINDING_MISMATCH',
        );
        return acceptanceObservation('cropResolution', {
          bindingMatches: cropViolations.length === 0,
        });
      }
      return acceptanceObservation('cropResolution', {bindingMatches: cropApplicationMatchesBase({
        artifacts: state.styleArtifacts,
        cropContext: state.styleResolution.cropContext,
      }, request)});
    },
    captionSourceResolution: async () => {
      try {
        if (!validatePresentationTimelineCompositionDecisionV001(state.timelineDecision)
          || !dense(state.expectedAtomOccurrences)
          || !dense(state.occurrenceAtoms)) {
          return acceptanceObservation('captionSourceResolution', {sourceResolved: false});
        }
        for (const source of state.meaningPackage.sourceMedia) {
          if (!validatePresentationSourceIdentityV001(state.sourceIdentity)
            || state.sourceIdentity.sourceRef !== source.sourceRef
            || !same(state.sourceIdentity.executionMedia, source.mediaBinding)) {
            return acceptanceObservation('captionSourceResolution', {sourceResolved: false});
          }
        }
        return passedAcceptanceObservation('captionSourceResolution');
      } catch {
        return acceptanceObservation('captionSourceResolution', {sourceResolved: false});
      }
    },
    captionDisplayLayout: async () => {
      const styleProjection = {
        resolvedStyle: state.styleResolution.resolvedStyle,
        layoutContext: state.styleResolution.layoutContext,
      };
      state.pageLinePlan = await buildPresentationOutputPageLinePlanV001({
        meaningPackage: state.meaningPackage,
        occurrenceAtoms: state.occurrenceAtoms,
        styleResolution: styleProjection,
        baseMediaTimeline: state.base.timeline.value,
      });
      return acceptanceObservation('captionDisplayLayout', {
        layoutRepresentable: !(state.pageLinePlan.status === 'rejected'
          && state.pageLinePlan.code === 'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE'),
      });
    },
    captionDisplayTimeline: async () => acceptanceObservation('captionDisplayTimeline', {
      timelineRepresentable: state.pageLinePlan.status !== 'rejected',
    }),
    titleCapability: async () => acceptanceObservation('titleCapability', {
      styleAvailable: state.meaningPackage.title.text === '',
    }),
    meaningPreservation: async () => acceptanceObservation('meaningPreservation', {
      projectionPreserved: validatePresentationOutputCaptionDisplaysV001(
        state.pageLinePlan.captionDisplays,
        state.meaningPackage,
        state.styleResolution.resolvedStyle,
      ),
    }),
    publicationTarget: async () => {
      try {
        const control = await resolveWorkspacePath(workspaceRoot, request.publication.controlRoot);
        const render = await resolveWorkspacePath(workspaceRoot, request.publication.renderOutputRoot);
        return acceptanceObservation('publicationTarget', {
          targetAvailable: await lstatOrNull(control.absolutePath) === null
            && await lstatOrNull(render.absolutePath) === null,
        });
      } catch {
        return acceptanceObservation('publicationTarget', {targetAvailable: false});
      }
    },
    commonRenderPlan: async () => {
      const built = buildPresentationOutputRenderPlanV001({
        request,
        outputRequestBinding: controlRequestBinding,
        meaningPackage: state.meaningPackage,
        pageLinePlan: state.pageLinePlan,
        resolvedStyle: state.styleResolution.resolvedStyle,
      });
      if (built.status !== 'built') {
        return acceptanceObservation('commonRenderPlan', {planValid: false});
      }
      state.renderPlan = built.plan;
      state.renderPlanBytes = renderBytes(built.plan);
      state.renderPlanBinding = jsonBinding(
        built.plan.schemaVersion,
        `${request.publication.controlRoot}/${CONTROL_ARTIFACT_NAMES.plan}`,
        state.renderPlanBytes,
        built.plan,
      );
      return acceptanceObservation('commonRenderPlan', {planValid:
        state.renderPlanBytes.equals(formalBytes(built.plan))
        && validatePresentationOutputRenderPlanV001(built.plan, {
          requestId,
          meaningPackage: state.meaningPackage,
        }).status === 'passed'});
    },
  };

  let evaluated: JsonObject;
  try {
    evaluated = await evaluatePresentationOutputAcceptanceChecksV001({evaluators});
  } catch (error) {
    if (error instanceof PresentationOutputPlannerResourceExhaustedV001
      || error instanceof RangeError) {
      return fatalDiagnostic('caption-display-layout', 'OUTPUT_PLANNER_RESOURCE_EXHAUSTED');
    }
    return fatalDiagnostic('execution', 'OUTPUT_ACCEPTANCE_EXECUTION_FAILED');
  }

  const checkPassed = (name: string) => evaluated.results[name]?.status === 'passed';
  let report: JsonObject;
  let reportBytes: Buffer;
  let acceptanceReportBinding: JsonObject;
  try {
    report = buildPresentationOutputAcceptanceReportV001({
      request: {requestId},
      requestBinding: controlRequestBinding,
      checks: evaluated.checks,
      violations: evaluated.violations,
      timelineProjection: checkPassed('timelineFrameMapping')
        ? timelineProjection(
          state.meaningPackage,
          state.base.timeline.value,
          request.baseMediaInput.baseMedia.fileSha256,
        )
        : null,
      captionDisplayProjection: checkPassed('captionDisplayTimeline')
        ? captionDisplayProjection(state.pageLinePlan.captionDisplays)
        : null,
      meaningProjection: checkPassed('meaningPackage')
        ? derivePresentationOutputMeaningProjectionV001(state.meaningPackage)
        : null,
      resolvedStyleProjection: checkPassed('styleResolution') && checkPassed('cropResolution')
        ? derivePresentationOutputResolvedStyleProjectionV001(
          state.styleResolution.resolvedStyle,
        )
        : null,
      renderPlanBinding: checkPassed('commonRenderPlan')
        ? state.renderPlanBinding
        : null,
    });
    reportBytes = formalBytes(report);
    acceptanceReportBinding = jsonBinding(
      report.schemaVersion,
      `${expectedControlOutputRoot}/${CONTROL_ARTIFACT_NAMES.report}`,
      reportBytes,
      report,
    );
  } catch {
    return fatalDiagnostic('execution', 'OUTPUT_ACCEPTANCE_REPORT_BUILD_FAILED');
  }

  try {
    if (!await rereadTracked(tracked)) {
      return fatalDiagnostic('publication', 'OUTPUT_ACCEPTANCE_INPUT_CHANGED');
    }
    const controlFiles = [
      {name: CONTROL_ARTIFACT_NAMES.request, bytes: state.requestBytes},
      {name: CONTROL_ARTIFACT_NAMES.report, bytes: reportBytes},
      ...(report.status === 'accepted-for-render'
        ? [{name: CONTROL_ARTIFACT_NAMES.plan, bytes: state.renderPlanBytes}]
        : []),
    ];
    await publishExactDirectory({
      workspaceRoot,
      outputRoot: expectedControlOutputRoot,
      files: controlFiles,
    });
    const publishedControlRoot = (await resolveWorkspacePath(
      workspaceRoot,
      expectedControlOutputRoot,
    )).absolutePath;
    const publishedNames = (await readdir(publishedControlRoot)).sort(compareUtf8);
    if (!same(
      publishedNames,
      controlFiles.map(item => item.name).sort(compareUtf8),
    )) throw new Error('control root is not the exact status union');
    for (const file of controlFiles) {
      if (!(await readAbsoluteStable(path.join(publishedControlRoot, file.name))).equals(file.bytes)) {
        throw new Error('control publication byte mismatch');
      }
    }
  } catch {
    return fatalDiagnostic('publication', 'OUTPUT_ACCEPTANCE_PUBLICATION_FAILED');
  }

  if (report.status !== 'accepted-for-render') {
    return {
      status: 'rejected',
      exitCode: 1,
      report,
      bytes: reportBytes,
      stderr: null,
    };
  }

  const failureTargetObservation = await inspectPresentationOutputRenderFailureTargetV002({
    workspaceRoot,
    outputId: request.publication.outputId,
    formalJobFileSha256,
  });
  if (failureTargetObservation.status !== 'passed') return failureTargetObservation;

  const publishSyntheticCoreFailure = async (stage: string) => (
    publishPresentationOutputRenderFailureV002({
      workspaceRoot,
      request,
      job,
      formalJobFileSha256,
      formalOutputJobBinding,
      controlRequestBinding,
      acceptanceReportBinding,
      renderPlanBinding: state.renderPlanBinding,
      observation: {
        status: 'fatal',
        stage,
        failureObservation: {
          source: 'common-draw-core',
          coreStage: stage,
          violations: [],
          diagnosticCode: 'OUTPUT_RENDER_CORE_PROCESS_FAILED',
        },
        fatalObservation: unknownFatalObservationV002(),
      },
      safetyArtifacts: [],
    })
  );

  let commonPlan: JsonObject;
  let finalLayoutInspection: JsonObject;
  try {
    const built = buildPresentationOutputCommonCorePlanV001({
      renderPlan: state.renderPlan,
      layoutContext: state.styleResolution.layoutContext,
    });
    if (built.status !== 'built') return await publishSyntheticCoreFailure('execution');
    commonPlan = built.plan;
    finalLayoutInspection = await buildFinalLayoutInspection(
      state.renderPlan,
      state.styleResolution.layoutContext,
    );
  } catch {
    return await publishSyntheticCoreFailure('execution');
  }

  let cropWorkDirectory: string | null = null;
  let renderBaseMediaPath = state.base.baseMedia.absolutePath;
  let renderBaseMediaInspection = state.baseMediaInspection;
  if (request.styleInput.format === 'vertical-short-1080x1920') {
    try {
      const crop = await withStableToolInputs({
        runtimeProfile: job.runtimeProfile,
        media: [{
          absolutePath: state.base.baseMedia.absolutePath,
          fileSha256: request.baseMediaInput.baseMedia.fileSha256,
        }],
        operation: () => createPresentationVerticalCroppedBaseMediaV001({
          baseMediaPath: state.base.baseMedia.absolutePath,
          cropDecision: state.styleResolution.cropContext.cropDecision,
          runtimeProfile: job.runtimeProfile,
        }),
      });
      if (crop.status !== 'passed') {
        if (typeof crop.workDirectory === 'string') cropWorkDirectory = crop.workDirectory;
        const failed = await publishSyntheticCoreFailure('execution');
        if (cropWorkDirectory) await rm(cropWorkDirectory, {recursive: true, force: true});
        return failed;
      }
      cropWorkDirectory = crop.workDirectory;
      renderBaseMediaPath = await realpath(crop.outputPath);
      renderBaseMediaInspection = {
        fileSha256: await fileSha256V002(renderBaseMediaPath),
        frameCount: crop.sourceFrameCount,
        media: crop.outputMedia,
      };
    } catch {
      if (cropWorkDirectory) await rm(cropWorkDirectory, {recursive: true, force: true});
      return await publishSyntheticCoreFailure('execution');
    }
  }

  let core: JsonObject;
  try {
    const outputDirectory = (await resolveWorkspacePath(
      workspaceRoot,
      request.publication.renderOutputRoot,
    )).absolutePath;
    const vertical = request.styleInput.format === 'vertical-short-1080x1920';
    core = await withStableToolInputs({
      runtimeProfile: job.runtimeProfile,
      media: [{
        absolutePath: renderBaseMediaPath,
        fileSha256: renderBaseMediaInspection.fileSha256,
      }],
      operation: async () => executeValidatedPresentationDrawAndQcV001({
        outputDirectory,
        plan: commonPlan,
        presetRegistry: state.styleArtifacts.presetRegistry,
        baseMediaPath: renderBaseMediaPath,
        baseMediaInspection: renderBaseMediaInspection,
        expectedFrameCount: state.base.timeline.value.baseMedia.expectedFrameCount,
        artifactNames: vertical
          ? OUTPUT_VERTICAL_DRAW_ARTIFACT_NAMES_V001
          : OUTPUT_DRAW_ARTIFACT_NAMES_V001,
        ...(vertical ? {
          evaluateQc: evaluatePresentationVerticalReviewRendererQcV001,
          overlayAdapter: state.styleResolution.layoutContext.overlayAdapter,
        } : {}),
        toolPaths: {
          ffmpegPath: job.runtimeProfile.ffmpeg.path,
          ffprobePath: job.runtimeProfile.ffprobe.path,
          imageMagickPath: job.runtimeProfile.imageMagick.path,
          tsxPath: job.runtimeProfile.tsx.path,
          layoutInspectorPath: (await resolveWorkspacePath(
            workspaceRoot,
            'evals/clip_composition/inspect_presentation_preset_layout.ts',
          )).absolutePath,
        },
        validatedLayoutInspection: finalLayoutInspection,
      }),
    });
  } catch {
    if (cropWorkDirectory) await rm(cropWorkDirectory, {recursive: true, force: true});
    return await publishSyntheticCoreFailure('execution');
  }
  if (cropWorkDirectory) await rm(cropWorkDirectory, {recursive: true, force: true});

  let safetyArtifacts: JsonObject[];
  try {
    safetyArtifacts = await retainedSafetyArtifacts(core, workspaceRoot);
  } catch {
    return fatalDiagnostic('execution', 'OUTPUT_RENDER_SAFETY_ARTIFACT_INVALID');
  }
  if (core.exitCode !== 0) {
    try {
      return await publishPresentationOutputRenderFailureV002({
        workspaceRoot,
        request,
        job,
        formalJobFileSha256,
        formalOutputJobBinding,
        controlRequestBinding,
        acceptanceReportBinding,
        renderPlanBinding: state.renderPlanBinding,
        observation: inspectPresentationOutputCoreFailureObservationV001(core),
        safetyArtifacts,
      });
    } catch {
      return fatalDiagnostic('execution', 'OUTPUT_RENDER_FAILURE_REPORT_INVALID');
    }
  }

  let applicationResults: JsonObject;
  let finalElements: JsonObject[];
  let applicationBytes: Buffer;
  let applicationBinding: JsonObject;
  let qc: JsonObject;
  let qcBytes: Buffer;
  let qcBinding: JsonObject;
  let manifest: JsonObject;
  let manifestBytes: Buffer;
  try {
    const pages = state.renderPlan.captionDisplays.flatMap(
      (display: JsonObject) => display.pages,
    );
    if (core.overlayRecords.length !== pages.length) {
      throw new TypeError('overlay/page count mismatch');
    }
    for (let index = 0; index < core.overlayRecords.length; index += 1) {
      const record = core.overlayRecords[index];
      const newName = formalOverlayName(pages[index].pageId, index);
      const newPath = path.join(
        core.stagingDirectory,
        OUTPUT_DRAW_ARTIFACT_NAMES_V001.overlays,
        newName,
      );
      await rename(record.pngPath, newPath);
      record.pngPath = newPath;
      record.fileStem = path.basename(newName, '.png');
      record.finalElement = {
        ...record.element,
        overlaySha256: record.pngSha256,
      };
      if (isObject(record.inspection)) {
        record.inspection.overlayFile = path.posix.join(
          OUTPUT_DRAW_ARTIFACT_NAMES_V001.overlays,
          newName,
        );
      }
    }

    applicationResults = buildPresentationOutputRenderApplicationResultsV001({
      outputId: request.publication.outputId,
      outputRequestBinding: controlRequestBinding,
      renderPlanBinding: state.renderPlanBinding,
      presetRegistryBinding: request.styleInput.presetBinding.presetRegistry,
      renderPlan: state.renderPlan,
      overlayRecords: core.overlayRecords,
      presetRegistryVersion: state.styleArtifacts.presetRegistry.registryVersion,
      overlaysDirectory: `${request.publication.renderOutputRoot}/${
        OUTPUT_DRAW_ARTIFACT_NAMES_V001.overlays}`,
    });
    finalElements = core.overlayRecords.map((record: JsonObject) => record.finalElement);
    if (validatePresentationOutputRenderApplicationResultsV001(applicationResults, {
      outputId: request.publication.outputId,
      renderPlan: state.renderPlan,
      finalElements,
      presetRegistryVersion: state.styleArtifacts.presetRegistry.registryVersion,
    }).status !== 'passed') throw new TypeError('application results are invalid');
    applicationBytes = renderBytes(applicationResults);
    const applicationPath = `${request.publication.renderOutputRoot}/${
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.applicationResults}`;
    applicationBinding = jsonBinding(
      applicationResults.schemaVersion,
      applicationPath,
      applicationBytes,
      applicationResults,
      canonicalSha256FiniteOutputJson,
    );

    const videoPath = `${request.publication.renderOutputRoot}/${
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.video}`;
    const videoSha256 = await hashAbsoluteStableStreaming(core.workVideo);
    qc = buildPresentationOutputRenderQcV001({
      outputId: request.publication.outputId,
      renderPlanBinding: state.renderPlanBinding,
      applicationResultsBinding: applicationBinding,
      videoBinding: {path: videoPath, fileSha256: videoSha256},
      outputMedia: core.outputMedia,
      sampleCount: state.base.receipt.value.mediaProjection.sampleCount,
      rendererQc: core.finalQc,
    });
    if (validatePresentationOutputRenderQcV001(qc, {
      outputId: request.publication.outputId,
      rendererQc: core.finalQc,
    }).status !== 'passed'
      || qc.outputMedia.frameCount !== state.base.receipt.value.mediaProjection.frameCount
      || qc.outputMedia.sampleCount !== state.base.receipt.value.mediaProjection.sampleCount
      || qc.outputMedia.audioPacketPayloadSha256
        !== state.base.receipt.value.mediaProjection.audioPacketPayloadSha256) {
      throw new TypeError('formal renderer QC is invalid');
    }
    qcBytes = renderBytes(qc);
    const qcPath = `${request.publication.renderOutputRoot}/${
      OUTPUT_DRAW_ARTIFACT_NAMES_V001.qc}`;
    qcBinding = jsonBinding(
      qc.schemaVersion,
      qcPath,
      qcBytes,
      qc,
      canonicalSha256FiniteOutputJson,
    );

    manifest = buildPresentationOutputRenderManifestV001({
      outputId: request.publication.outputId,
      formalOutputJobBinding,
      outputRequestBinding: controlRequestBinding,
      acceptanceReportBinding,
      renderPlanBinding: state.renderPlanBinding,
      meaningPackageBinding: request.meaningInformationPackage,
      baseMediaBinding: request.baseMediaInput,
      resolvedStyle: state.renderPlan.resolvedStyle,
      applicationResultsBinding: applicationBinding,
      qcBinding,
      runtimeProfile: clone(job.runtimeProfile),
      implementationBindings: clone(job.implementationBindings),
    });
    if (validatePresentationOutputRenderManifestV001(manifest, {
      outputId: request.publication.outputId,
      formalJob: job,
    }).status !== 'passed') {
      throw new TypeError('render manifest is invalid');
    }
    manifestBytes = renderBytes(manifest);
    await Promise.all([
      writeFile(
        path.join(core.stagingDirectory, OUTPUT_DRAW_ARTIFACT_NAMES_V001.applicationResults),
        applicationBytes,
        {flag: 'wx'},
      ),
      writeFile(
        path.join(core.stagingDirectory, OUTPUT_DRAW_ARTIFACT_NAMES_V001.qc),
        qcBytes,
        {flag: 'wx'},
      ),
      writeFile(
        path.join(core.stagingDirectory, OUTPUT_DRAW_ARTIFACT_NAMES_V001.manifest),
        manifestBytes,
        {flag: 'wx'},
      ),
    ]);
  } catch {
    return await publishPresentationOutputRenderFailureV002({
      workspaceRoot,
      request,
      job,
      formalJobFileSha256,
      formalOutputJobBinding,
      controlRequestBinding,
      acceptanceReportBinding,
      renderPlanBinding: state.renderPlanBinding,
      observation: {
        status: 'fatal',
        stage: 'staged-artifact-validation',
        failureObservation: {
          source: 'output-artifact-validator',
          coreStage: null,
          violations: [],
          diagnosticCode: 'OUTPUT_RENDER_STAGED_ARTIFACT_INVALID',
        },
        fatalObservation: unknownFatalObservationV002(),
      },
      safetyArtifacts,
    });
  }

  let staged: JsonObject;
  let validatedStagingTree: JsonObject[];
  try {
    const beforeValidation = await captureStagingTree(core.stagingDirectory);
    staged = await validatePresentationOutputStagedArtifactsV001({
      stagingDirectory: core.stagingDirectory,
      expected: {
        request,
        job,
        meaningPackage: state.meaningPackage,
        renderPlan: state.renderPlan,
        applicationResults,
        finalElements,
        presetRegistryVersion: state.styleArtifacts.presetRegistry.registryVersion,
        qc,
        manifest,
        formalOutputJobBinding,
        controlRequestBinding,
        acceptanceReportBinding,
        renderPlanBinding: state.renderPlanBinding,
        baseReceipt: state.base.receipt.value,
      },
    });
    const afterValidation = await captureStagingTree(core.stagingDirectory);
    if (!same(beforeValidation, afterValidation)) {
      throw new Error('staging tree changed during validation');
    }
    validatedStagingTree = afterValidation;
  } catch {
    staged = {status: 'rejected'};
    validatedStagingTree = [];
  }
  if (staged.status !== 'passed') {
    return await publishPresentationOutputRenderFailureV002({
      workspaceRoot,
      request,
      job,
      formalJobFileSha256,
      formalOutputJobBinding,
      controlRequestBinding,
      acceptanceReportBinding,
      renderPlanBinding: state.renderPlanBinding,
      observation: {
        status: 'fatal',
        stage: 'staged-artifact-validation',
        failureObservation: {
          source: 'output-artifact-validator',
          coreStage: null,
          violations: [],
          diagnosticCode: 'OUTPUT_RENDER_STAGED_ARTIFACT_INVALID',
        },
        fatalObservation: unknownFatalObservationV002(),
      },
      safetyArtifacts,
    });
  }

  try {
    if (!await rereadTracked(tracked)) {
      throw new Error('upstream binding changed before publication');
    }
    await assertStableToolInputs({
      runtimeProfile: job.runtimeProfile,
      media: [
        {
          absolutePath: state.base.baseMedia.absolutePath,
          fileSha256: request.baseMediaInput.baseMedia.fileSha256,
        },
        state.sourceMediaTracked,
      ],
    });
    const controlRoot = (await resolveWorkspacePath(
      workspaceRoot,
      request.publication.controlRoot,
    )).absolutePath;
    if (
      !(await readAbsoluteStable(path.join(
        controlRoot,
        CONTROL_ARTIFACT_NAMES.request,
      ))).equals(state.requestBytes)
      || !(await readAbsoluteStable(path.join(
        controlRoot,
        CONTROL_ARTIFACT_NAMES.report,
      ))).equals(reportBytes)
      || !(await readAbsoluteStable(path.join(
        controlRoot,
        CONTROL_ARTIFACT_NAMES.plan,
      ))).equals(state.renderPlanBytes)
    ) throw new Error('control artifact changed before publication');
    if (!same(
      await captureStagingTree(core.stagingDirectory),
      validatedStagingTree,
    )) throw new Error('staging tree changed before publication');
    await commitValidatedPresentationArtifactsV002({
      stagingDirectory: core.stagingDirectory,
      outputDirectory: core.outputDirectory,
      reservation: core.reservation,
    });
  } catch {
    return await publishPresentationOutputRenderFailureV002({
      workspaceRoot,
      request,
      job,
      formalJobFileSha256,
      formalOutputJobBinding,
      controlRequestBinding,
      acceptanceReportBinding,
      renderPlanBinding: state.renderPlanBinding,
      observation: {
        status: 'fatal',
        stage: 'publication',
        failureObservation: {
          source: 'atomic-publication',
          coreStage: null,
          violations: [],
          diagnosticCode: 'OUTPUT_RENDER_PUBLICATION_FAILED',
        },
        fatalObservation: buildClosedFatalObservationV002({
          innerStage: 'publication',
          evidence: {kind: 'publication-failed'},
        }),
      },
      safetyArtifacts,
    });
  }

  return {
    status: 'passed',
    exitCode: 0,
    manifest,
    bytes: manifestBytes,
    retainedSafetyArtifacts: safetyArtifacts,
    stderr: null,
  };
}

export async function runPresentationOutputJobCliV001(
  argv = process.argv.slice(2),
  writers: {
    stdout?: (chunk: Buffer) => unknown;
    stderr?: (chunk: Buffer) => unknown;
  } = {},
) {
  const writeStdout = writers.stdout ?? ((chunk: Buffer) => process.stdout.write(chunk));
  const writeStderr = writers.stderr ?? ((chunk: Buffer) => process.stderr.write(chunk));
  const writeFatal = (stage: string, diagnosticCode: string) => {
    writeStderr(renderBytes(fatalDiagnostic(stage, diagnosticCode).stderr));
    return 2;
  };
  if (!Array.isArray(argv) || argv.length !== 1) {
    return writeFatal('job-validation', 'OUTPUT_FORMAL_JOB_INVALID');
  }
  let result: JsonObject;
  try {
    result = await runPresentationOutputJobV001({
      workspaceRoot: process.cwd(),
      jobPath: argv[0],
    });
  } catch {
    return writeFatal('execution', 'OUTPUT_ACCEPTANCE_EXECUTION_FAILED');
  }
  return writePresentationOutputJobCliResultV001(result, {stdout: writeStdout, stderr: writeStderr});
}

export function writePresentationOutputJobCliResultV001(
  result: JsonObject,
  writers: {
    stdout?: (chunk: Buffer) => unknown;
    stderr?: (chunk: Buffer) => unknown;
  } = {},
) {
  const writeStdout = writers.stdout ?? ((chunk: Buffer) => process.stdout.write(chunk));
  const writeStderr = writers.stderr ?? ((chunk: Buffer) => process.stderr.write(chunk));
  if (result.bytes) writeStdout(result.bytes);
  if (dense(result.retainedSafetyArtifacts)
    && result.retainedSafetyArtifacts.length > 0) {
    writeStderr(renderBytes(result.retainedSafetyArtifacts));
  } else if (result.stderr) {
    writeStderr(renderBytes(result.stderr));
  }
  return result.exitCode;
}

const isDirect = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  runPresentationOutputJobCliV001().then(
    exitCode => { process.exitCode = exitCode; },
    () => { process.exitCode = 2; },
  );
}
