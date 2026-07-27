#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationInstructionContractV003} from './presentation_instruction_contract_v003.mjs';
import {
  mapPresentationSourceIntervalV002,
  validatePresentationBaseMediaTimelineV002,
} from './presentation_base_media_timeline_v002.mjs';
import {
  PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256,
  PRESENTATION_RENDERER_VERSION,
  loadAndValidatePresentationRendererTrustV001,
} from './presentation_renderer_plan_v002.mjs';
import {indexExplicitLinesV001} from './presentation_renderer_text_layout_v001.mjs';
import {
  actualToolVersions,
  executeValidatedPresentationDrawAndQcV001,
  inspectFrameCount,
  inspectGitStateV001,
  publishPresentationArtifactsV002,
  validateBaseMediaGenerationBindingV002,
  validateBaseMediaToolProfileV002,
} from './render_presentation_v002.mjs';
import {
  evaluatePresentationReviewRendererQcV003,
  fileSha256V002,
  inspectRenderedMediaV002,
} from './presentation_renderer_qc_v002.mjs';

export const PRESENTATION_REVIEW_RENDER_JOB_SCHEMA_VERSION_V003 =
  'presentation-review-render-job-v003';
export const PRESENTATION_REVIEW_RENDERER_VERSION_V003 =
  'presentation-review-renderer-v003';
export const PRESENTATION_REVIEW_RENDER_MANIFEST_SCHEMA_VERSION_V003 =
  'presentation-review-render-manifest-v003';
export const PRESENTATION_REVIEW_RENDER_PLAN_DRAFT_SCHEMA_VERSION_V003 =
  'presentation-review-render-plan-draft-v003';
export const PRESENTATION_REVIEW_RENDER_PLAN_SCHEMA_VERSION_V003 =
  'presentation-review-render-plan-v003';
export const PRESENTATION_REVIEW_RENDER_APPLICATION_RESULTS_SCHEMA_VERSION_V003 =
  'presentation-review-render-application-results-v003';
export const PRESENTATION_REVIEW_RENDER_OUTPUT_NAMES_V003 = Object.freeze({
  video: 'presentation-review-rendered-v003.mp4',
  overlays: 'overlays',
  plan: 'presentation-review-render-plan-v003.json',
  applicationResults: 'presentation-review-render-application-results-v003.json',
  manifest: 'presentation-review-render-manifest-v003.json',
  qc: 'presentation-review-render-qc-v003.json',
  failure: 'presentation-review-render-failure-v003.json',
});

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const REVIEW_REQUEST_SCHEMA_VERSION = 'presentation-caption-review-render-request-v003';
const REVIEW_REQUEST_RENDERER_ENTRY = PRESENTATION_REVIEW_RENDERER_VERSION_V003;
const EXPECTED_QC = Object.freeze([
  'preset_applied',
  'no_text_overlap',
  'inside_safe_area',
  'no_missing_caption',
  'base_frame_count_preserved',
  'base_audio_preserved',
]);
const RUNTIME_PROFILE_FIELDS = Object.freeze([
  'nodeVersion',
  'remotionVersion',
  'browserVersion',
  'ffmpegVersion',
  'ffprobeVersion',
]);
const SHA256 = /^[0-9a-f]{64}$/;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const exactFields = (value, fields) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
const sameArray = (left, right) => Array.isArray(left)
  && left.length === right.length
  && left.every((value, index) => value === right[index]);
const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));
const repoPath = (absolutePath) => path.relative(WORKSPACE_ROOT, absolutePath);
const resolveRepoPath = (value) => (
  path.isAbsolute(value) ? value : path.resolve(WORKSPACE_ROOT, value)
);
export const resolvePresentationReviewOutputDirectoryV003 = (value) => resolveRepoPath(value);
const resolveRequestPath = (requestDirectory, value) => {
  if (path.isAbsolute(value)) return value;
  if (value.startsWith('evals/') || value.startsWith('docs/') || value.startsWith('runner/')) {
    return path.resolve(WORKSPACE_ROOT, value);
  }
  return path.resolve(requestDirectory, value);
};
const writeJson = async (filePath, value) => (
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
);
const readJsonFile = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const failure = (stage, violations, details = undefined, cleanupWarnings = []) => ({
  exitCode: 1,
  failure: {
    schemaVersion: 'presentation-review-render-failure-v003',
    status: 'failed',
    stage,
    violations,
    ...(details === undefined ? {} : {details}),
    ...(cleanupWarnings.length === 0 ? {} : {cleanupWarnings}),
  },
});

const processFailure = (stage, error, cleanupWarnings = []) => ({
  exitCode: 2,
  failure: {
    schemaVersion: 'presentation-review-render-failure-v003',
    status: 'process_failed',
    stage,
    message: error instanceof Error ? error.message : String(error),
    ...(cleanupWarnings.length === 0 ? {} : {cleanupWarnings}),
  },
});

const violation = (code, pathValue, details = undefined) => ({
  code,
  path: pathValue,
  ...(details === undefined ? {} : {details}),
});

const transportEntryValid = (entry, canonicalRequired = false) => (
  exactFields(
    entry,
    canonicalRequired ? ['path', 'fileSha256', 'canonicalSha256'] : ['path', 'fileSha256'],
  )
  && isNonEmptyString(entry.path)
  && SHA256.test(entry.fileSha256)
  && (!canonicalRequired || SHA256.test(entry.canonicalSha256))
);

export function validatePresentationReviewRenderJobV003(job) {
  const violations = [];
  if (!exactFields(job, [
    'schemaVersion',
    'jobId',
    'reviewRenderRequest',
    'implementationBindings',
    'runtimeProfile',
    'outputDirectory',
  ])) {
    violations.push(violation('REVIEW_RENDER_JOB_SHAPE_INVALID', '$'));
    return {status: 'failed', violations};
  }
  if (
    job.schemaVersion !== PRESENTATION_REVIEW_RENDER_JOB_SCHEMA_VERSION_V003
    || !isNonEmptyString(job.jobId)
    || !transportEntryValid(job.reviewRenderRequest, true)
    || !Array.isArray(job.implementationBindings)
    || job.implementationBindings.length !== 3
    || !exactFields(job.runtimeProfile, RUNTIME_PROFILE_FIELDS)
    || !Object.values(job.runtimeProfile ?? {}).every(isNonEmptyString)
    || !isNonEmptyString(job.outputDirectory)
  ) {
    violations.push(violation('REVIEW_RENDER_JOB_VALUE_INVALID', '$'));
  }
  const roles = [];
  for (const [index, binding] of (job.implementationBindings ?? []).entries()) {
    if (
      !exactFields(binding, ['role', 'path', 'fileSha256'])
      || !['shared-render-entry', 'review-renderer', 'renderer-qc'].includes(binding.role)
      || !isNonEmptyString(binding.path)
      || !SHA256.test(binding.fileSha256)
    ) {
      violations.push(violation(
        'REVIEW_RENDER_IMPLEMENTATION_BINDING_INVALID',
        `$.implementationBindings[${index}]`,
      ));
    }
    roles.push(binding?.role);
  }
  if (!sameArray(
    [...roles].sort(),
    ['renderer-qc', 'review-renderer', 'shared-render-entry'],
  )) {
    violations.push(violation(
      'REVIEW_RENDER_IMPLEMENTATION_BINDING_INVALID',
      '$.implementationBindings',
    ));
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

export function validatePresentationReviewRenderRequestV003(request) {
  const violations = [];
  if (!exactFields(request, [
    'schemaVersion',
    'requestId',
    'purpose',
    'reviewOnly',
    'publicationAllowed',
    'displayPlanBinding',
    'instructionBundleBinding',
    'captionCheckBinding',
    'layoutPreflightBinding',
    'baseMediaBinding',
    'registryBindings',
    'requiredInputState',
    'rendererEntry',
    'expectedOutput',
  ])) {
    return {
      status: 'failed',
      violations: [violation('REVIEW_RENDER_REQUEST_SHAPE_INVALID', '$')],
    };
  }
  if (
    request.schemaVersion !== REVIEW_REQUEST_SCHEMA_VERSION
    || !isNonEmptyString(request.requestId)
    || request.purpose !== 'caption-readability-alignment-completeness-review'
    || request.reviewOnly !== true
    || request.publicationAllowed !== false
    || request.requiredInputState !== 'review_input_ready'
    || request.rendererEntry !== REVIEW_REQUEST_RENDERER_ENTRY
  ) {
    violations.push(violation('REVIEW_RENDER_REQUEST_VALUE_INVALID', '$'));
  }
  for (const field of [
    'displayPlanBinding',
    'instructionBundleBinding',
    'captionCheckBinding',
    'layoutPreflightBinding',
  ]) {
    if (!transportEntryValid(request[field], true)) {
      violations.push(violation('REVIEW_RENDER_REQUEST_BINDING_INVALID', `$.${field}`));
    }
  }
  if (
    !isObject(request.expectedOutput)
    || request.expectedOutput.state !== 'review_rendered'
    || request.expectedOutput.publicationAllowed !== false
    || !sameArray(request.expectedOutput.requiredQc, EXPECTED_QC)
  ) {
    violations.push(violation('REVIEW_RENDER_QC_CONTRACT_INVALID', '$.expectedOutput'));
  }
  if (
    !isObject(request.baseMediaBinding)
    || !transportEntryValid(request.baseMediaBinding.baseMedia, false)
    || !transportEntryValid(request.baseMediaBinding.timeline, true)
    || !transportEntryValid(request.baseMediaBinding.generationManifest, true)
    || !transportEntryValid(request.baseMediaBinding.validationReport, true)
  ) {
    violations.push(violation('REVIEW_RENDER_REQUEST_BINDING_INVALID', '$.baseMediaBinding'));
  }
  if (
    !isObject(request.registryBindings)
    || !transportEntryValid(request.registryBindings.trustedRegistryBindings, true)
    || !transportEntryValid(request.registryBindings.presetRegistry, true)
    || !transportEntryValid(request.registryBindings.presetValidationIndex, true)
    || !transportEntryValid(request.registryBindings.materialValidationIndex, true)
  ) {
    violations.push(violation('REVIEW_RENDER_REQUEST_BINDING_INVALID', '$.registryBindings'));
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

const readBoundJson = async ({
  binding,
  baseDirectory,
  pathValue,
  canonicalRequired = true,
  violations,
}) => {
  try {
    const absolutePath = resolveRequestPath(baseDirectory, binding.path);
    const bytes = await readFile(absolutePath);
    const fileSha256 = sha256Bytes(bytes);
    const value = JSON.parse(bytes.toString('utf8'));
    const canonicalSha256 = sha256Canonical(value);
    if (
      fileSha256 !== binding.fileSha256
      || (canonicalRequired && canonicalSha256 !== binding.canonicalSha256)
    ) {
      violations.push(violation('REVIEW_RENDER_INPUT_HASH_MISMATCH', pathValue, {
        expectedFileSha256: binding.fileSha256,
        actualFileSha256: fileSha256,
        ...(canonicalRequired ? {
          expectedCanonicalSha256: binding.canonicalSha256,
          actualCanonicalSha256: canonicalSha256,
        } : {}),
      }));
    }
    return {absolutePath, value, fileSha256, canonicalSha256};
  } catch (error) {
    violations.push(violation('REVIEW_RENDER_INPUT_HASH_MISMATCH', pathValue, {
      readError: error instanceof Error ? error.code ?? error.name : String(error),
    }));
    return null;
  }
};

const readBoundFile = async ({binding, baseDirectory, pathValue, violations}) => {
  try {
    const absolutePath = resolveRequestPath(baseDirectory, binding.path);
    const bytes = await readFile(absolutePath);
    const fileSha256 = sha256Bytes(bytes);
    if (fileSha256 !== binding.fileSha256) {
      violations.push(violation('REVIEW_RENDER_INPUT_HASH_MISMATCH', pathValue, {
        expectedFileSha256: binding.fileSha256,
        actualFileSha256: fileSha256,
      }));
    }
    return {absolutePath, fileSha256};
  } catch (error) {
    violations.push(violation('REVIEW_RENDER_INPUT_HASH_MISMATCH', pathValue, {
      readError: error instanceof Error ? error.code ?? error.name : String(error),
    }));
    return null;
  }
};

const uniqueBy = (values, readId) => {
  const result = new Map();
  for (const value of Array.isArray(values) ? values : []) {
    const id = readId(value);
    if (!isNonEmptyString(id) || result.has(id)) return null;
    result.set(id, value);
  }
  return result;
};

/**
 * v003の表示計画を、v002指示書へ変換せず、共有描画エンジンの解決済みplanへ直接写す。
 */
export function buildPresentationReviewRenderPlanV003({
  instructionBundle,
  displayPlan,
  presetRegistry,
  timeline,
  layoutRules,
}) {
  const violations = [];
  const instructionSet = instructionBundle?.instructionSet;
  const resolutionPackage = instructionBundle?.resolutionPackage;
  const instructions = uniqueBy(
    instructionSet?.instructions,
    (instruction) => instruction?.instructionId,
  );
  const presets = uniqueBy(presetRegistry?.presets, (preset) => preset?.presetId);
  const transitions = uniqueBy(
    presetRegistry?.transitions,
    (transition) => transition?.transitionId,
  );
  if (!instructions || !presets || !transitions) {
    return {
      status: 'failed',
      violations: [violation('REVIEW_RENDER_PLAN_MAPPING_FAILED', '$')],
      plan: null,
    };
  }

  const cueRecords = [];
  for (const container of displayPlan?.containers ?? []) {
    for (const cue of container?.cues ?? []) cueRecords.push({container, cue});
  }
  cueRecords.sort((left, right) => left.cue.globalCueOrdinal - right.cue.globalCueOrdinal);
  const elements = [];
  const usedInstructionIds = new Set();
  for (const [index, {container, cue}] of cueRecords.entries()) {
    const pathValue = `$.displayPlan.cues[${index}]`;
    const instruction = instructions.get(cue?.instructionId);
    if (
      !instruction
      || usedInstructionIds.has(instruction.instructionId)
      || instruction.kind !== 'speech-caption'
      || !sameArray(instruction.target?.targetRefIds, [cue.targetRefId])
      || instruction.presetId !== displayPlan?.presetBinding?.presetId
      || !Array.isArray(instruction.materialRefs)
      || instruction.materialRefs.length !== 0
    ) {
      violations.push(violation('REVIEW_RENDER_PLAN_MAPPING_FAILED', pathValue));
      continue;
    }
    usedInstructionIds.add(instruction.instructionId);

    const preset = presets.get(instruction.presetId);
    const policy = preset?.kindPolicies?.find((entry) => entry.kind === instruction.kind);
    const visualState = preset?.visualStates?.find((entry) => entry.stateId === policy?.stateId);
    const transition = transitions.get(visualState?.transitionId);
    const textLayout = indexExplicitLinesV001(
      (cue.lines ?? []).map((line) => line.text),
    );
    const mapping = mapPresentationSourceIntervalV002(
      timeline,
      cue.sourceStartMs,
      cue.sourceEndMs,
    );
    if (
      !preset
      || preset.presetId !== instruction.presetId
      || presetRegistry.registryVersion
        !== instructionSet.presetRegistryBinding?.registryVersion
      || !policy
      || policy.endResponsibility !== 'target-anchor'
      || !visualState
      || !transition
      || textLayout.status !== 'passed'
      || (cue.lines ?? []).length > visualState.layout.maxLines
      || mapping.status !== 'passed'
      || mapping.mapping.timelineSegmentId !== container.timelineSegmentId
    ) {
      violations.push(violation('REVIEW_RENDER_PLAN_MAPPING_FAILED', pathValue, {
        textLayoutViolations: textLayout.violations ?? [],
        timelineViolations: mapping.violations ?? [],
      }));
      continue;
    }
    elements.push({
      instructionId: instruction.instructionId,
      kind: instruction.kind,
      text: textLayout.sourceText,
      indexedLines: textLayout.indexedLines,
      sourceStartMs: cue.sourceStartMs,
      sourceEndMs: cue.sourceEndMs,
      startFrame: mapping.mapping.startFrame,
      endFrameExclusive: mapping.mapping.endFrameExclusive,
      displayFrameCount: mapping.mapping.displayFrameCount,
      requestedPresetId: instruction.presetId,
      appliedPresetId: preset.presetId,
      presetId: preset.presetId,
      registryVersion: presetRegistry.registryVersion,
      presetRegistryVersion: presetRegistry.registryVersion,
      stateId: visualState.stateId,
      visualState: structuredClone(visualState),
      transition: structuredClone(transition),
      timelineSegmentId: mapping.mapping.timelineSegmentId,
      targetProvenance: {
        targetRefId: cue.targetRefId,
        targetType: 'caption-target',
        sourceAtomIds: cue.lines.flatMap((line) => [...line.sourceAtomIds]),
        cueId: cue.cueId,
        captionTargetId: cue.targetRefId,
        lineAtomIds: cue.lines.map((line) => [...line.sourceAtomIds]),
        startAnchor: structuredClone(cue.startAnchor),
        endAnchor: structuredClone(cue.endAnchor),
      },
      materialRefs: [],
    });
  }
  if (elements.length !== instructions.size || elements.length !== cueRecords.length) {
    violations.push(violation('REVIEW_RENDER_PLAN_MAPPING_FAILED', '$.displayPlan', {
      instructionCount: instructions.size,
      cueCount: cueRecords.length,
      elementCount: elements.length,
    }));
  }
  for (let index = 1; index < elements.length; index += 1) {
    if (elements[index].startFrame < elements[index - 1].endFrameExclusive) {
      violations.push(violation('REVIEW_RENDER_PLAN_TEMPORAL_OVERLAP', `$.elements[${index}]`));
    }
  }
  return {
    status: violations.length === 0 ? 'passed' : 'failed',
    violations,
    plan: violations.length === 0 ? {
      schemaVersion: PRESENTATION_REVIEW_RENDER_PLAN_DRAFT_SCHEMA_VERSION_V003,
      rendererVersion: PRESENTATION_REVIEW_RENDERER_VERSION_V003,
      sharedRenderEngineVersion: PRESENTATION_RENDERER_VERSION,
      instructionSetId: instructionSet.instructionSetId,
      resolutionPackageId: resolutionPackage.resolutionPackageId,
      timelineId: timeline.timelineId,
      timelineSchemaVersion: timeline.schemaVersion,
      presetRegistryVersion: presetRegistry.registryVersion,
      format: presetRegistry.format,
      canvas: structuredClone(presetRegistry.canvas),
      layoutRules: structuredClone(layoutRules),
      elements,
    } : null,
  };
}

const checkImplementationBindings = async (job, violations) => {
  const expectedPaths = {
    'shared-render-entry': 'evals/clip_composition/render_presentation_v002.mjs',
    'review-renderer': 'evals/clip_composition/render_presentation_review_v003.mjs',
    'renderer-qc': 'evals/clip_composition/presentation_renderer_qc_v002.mjs',
  };
  for (const [index, binding] of job.implementationBindings.entries()) {
    const expectedPath = expectedPaths[binding.role];
    const absolutePath = resolveRepoPath(binding.path);
    let actual = null;
    try {
      actual = await fileSha256V002(absolutePath);
    } catch (error) {
      violations.push(violation(
        'REVIEW_RENDER_IMPLEMENTATION_HASH_MISMATCH',
        `$.implementationBindings[${index}]`,
        {readError: error instanceof Error ? error.code ?? error.name : String(error)},
      ));
      continue;
    }
    if (binding.path !== expectedPath || actual !== binding.fileSha256) {
      violations.push(violation(
        'REVIEW_RENDER_IMPLEMENTATION_HASH_MISMATCH',
        `$.implementationBindings[${index}]`,
        {
          expectedPath,
          actualPath: binding.path,
          expectedFileSha256: binding.fileSha256,
          actualFileSha256: actual,
        },
      ));
    }
  }
};

const loadReviewInputs = async (job) => {
  const violations = [];
  const requestPath = resolveRepoPath(job.reviewRenderRequest.path);
  const requestDirectory = path.dirname(requestPath);
  let requestInput;
  try {
    const bytes = await readFile(requestPath);
    const value = JSON.parse(bytes.toString('utf8'));
    requestInput = {
      absolutePath: requestPath,
      value,
      fileSha256: sha256Bytes(bytes),
      canonicalSha256: sha256Canonical(value),
    };
    if (
      requestInput.fileSha256 !== job.reviewRenderRequest.fileSha256
      || requestInput.canonicalSha256 !== job.reviewRenderRequest.canonicalSha256
    ) {
      violations.push(violation('REVIEW_RENDER_INPUT_HASH_MISMATCH', '$.reviewRenderRequest'));
    }
  } catch (error) {
    violations.push(violation('REVIEW_RENDER_INPUT_HASH_MISMATCH', '$.reviewRenderRequest', {
      readError: error instanceof Error ? error.code ?? error.name : String(error),
    }));
    return {violations};
  }
  const requestReport = validatePresentationReviewRenderRequestV003(requestInput.value);
  violations.push(...requestReport.violations);
  if (violations.length > 0) return {violations, requestInput};
  const request = requestInput.value;

  const [
    displayPlan,
    instructionBundle,
    captionCheck,
    layoutPreflight,
    timeline,
    baseGenerationManifest,
    baseValidationReport,
    trustedRegistryBindings,
    presetRegistry,
    presetValidationIndex,
    materialValidationIndex,
  ] = await Promise.all([
    readBoundJson({
      binding: request.displayPlanBinding,
      baseDirectory: requestDirectory,
      pathValue: '$request.displayPlanBinding',
      violations,
    }),
    readBoundJson({
      binding: request.instructionBundleBinding,
      baseDirectory: requestDirectory,
      pathValue: '$request.instructionBundleBinding',
      violations,
    }),
    readBoundJson({
      binding: request.captionCheckBinding,
      baseDirectory: requestDirectory,
      pathValue: '$request.captionCheckBinding',
      violations,
    }),
    readBoundJson({
      binding: request.layoutPreflightBinding,
      baseDirectory: requestDirectory,
      pathValue: '$request.layoutPreflightBinding',
      violations,
    }),
    readBoundJson({
      binding: request.baseMediaBinding.timeline,
      baseDirectory: WORKSPACE_ROOT,
      pathValue: '$request.baseMediaBinding.timeline',
      violations,
    }),
    readBoundJson({
      binding: request.baseMediaBinding.generationManifest,
      baseDirectory: WORKSPACE_ROOT,
      pathValue: '$request.baseMediaBinding.generationManifest',
      violations,
    }),
    readBoundJson({
      binding: request.baseMediaBinding.validationReport,
      baseDirectory: WORKSPACE_ROOT,
      pathValue: '$request.baseMediaBinding.validationReport',
      violations,
    }),
    readBoundJson({
      binding: request.registryBindings.trustedRegistryBindings,
      baseDirectory: WORKSPACE_ROOT,
      pathValue: '$request.registryBindings.trustedRegistryBindings',
      violations,
    }),
    readBoundJson({
      binding: request.registryBindings.presetRegistry,
      baseDirectory: WORKSPACE_ROOT,
      pathValue: '$request.registryBindings.presetRegistry',
      violations,
    }),
    readBoundJson({
      binding: request.registryBindings.presetValidationIndex,
      baseDirectory: WORKSPACE_ROOT,
      pathValue: '$request.registryBindings.presetValidationIndex',
      violations,
    }),
    readBoundJson({
      binding: request.registryBindings.materialValidationIndex,
      baseDirectory: WORKSPACE_ROOT,
      pathValue: '$request.registryBindings.materialValidationIndex',
      violations,
    }),
  ]);
  if (violations.length > 0) return {violations, requestInput};

  const sourceAtomBinding = displayPlan.value?.sourceAtomBinding;
  const [retainedSourceAtoms, retainedGenerationManifest, retainedValidationReport, baseMedia] =
    await Promise.all([
      readBoundJson({
        binding: sourceAtomBinding?.sourceAtoms,
        baseDirectory: WORKSPACE_ROOT,
        pathValue: '$displayPlan.sourceAtomBinding.sourceAtoms',
        violations,
      }),
      readBoundJson({
        binding: sourceAtomBinding?.generationManifest,
        baseDirectory: WORKSPACE_ROOT,
        pathValue: '$displayPlan.sourceAtomBinding.generationManifest',
        violations,
      }),
      readBoundJson({
        binding: sourceAtomBinding?.validationReport,
        baseDirectory: WORKSPACE_ROOT,
        pathValue: '$displayPlan.sourceAtomBinding.validationReport',
        violations,
      }),
      readBoundFile({
        binding: request.baseMediaBinding.baseMedia,
        baseDirectory: WORKSPACE_ROOT,
        pathValue: '$request.baseMediaBinding.baseMedia',
        violations,
      }),
    ]);
  return {
    violations,
    requestInput,
    requestDirectory,
    displayPlan,
    instructionBundle,
    captionCheck,
    layoutPreflight,
    timeline,
    baseGenerationManifest,
    baseValidationReport,
    trustedRegistryBindings,
    presetRegistry,
    presetValidationIndex,
    materialValidationIndex,
    retainedSourceAtoms,
    retainedGenerationManifest,
    retainedValidationReport,
    baseMedia,
  };
};

const makeInputBinding = (input) => ({
  path: repoPath(input.absolutePath),
  fileSha256: input.fileSha256,
  ...(input.canonicalSha256 ? {canonicalSha256: input.canonicalSha256} : {}),
});

const makeQcSummary = ({
  requiredQc,
  plan,
  applicationResults,
  finalQc,
  baseMediaInspection,
  outputMedia,
  expectedFrameCount,
}) => {
  const violationCodes = new Set((finalQc.violations ?? []).map((entry) => entry.code));
  const status = (passed, evidence) => ({status: passed ? 'passed' : 'failed', evidence});
  const checks = {
    preset_applied: status(
      applicationResults.length === plan.elements.length
        && applicationResults.every((result) => (
          result.requestedPresetId === result.appliedPresetId
          && result.appliedPresetRegistryVersion === plan.presetRegistryVersion
        ))
        && !violationCodes.has('APPLIED_PRESET_MISMATCH'),
      {instructionCount: plan.elements.length, renderedCount: applicationResults.length},
    ),
    no_text_overlap: status(
      !violationCodes.has('LAYOUT_LINE_POSITIVE_INTERSECTION')
        && !violationCodes.has('INSTRUCTION_TEMPORAL_SPATIAL_COLLISION'),
      {positiveIntersectionViolations: 0},
    ),
    inside_safe_area: status(
      !violationCodes.has('LAYOUT_SAFE_AREA_VIOLATION'),
      {safeAreaViolations: 0},
    ),
    no_missing_caption: status(
      applicationResults.length === plan.elements.length
        && !violationCodes.has('INSTRUCTION_RENDER_MISSING')
        && !violationCodes.has('INSTRUCTION_RENDER_DUPLICATED')
        && !violationCodes.has('OUTPUT_ELEMENT_NOT_VISIBLE'),
      {instructionCount: plan.elements.length, renderedCount: applicationResults.length},
    ),
    base_frame_count_preserved: status(
      outputMedia.video?.frameCount === expectedFrameCount,
      {
        expectedFrameCount,
        actualFrameCount: outputMedia.video?.frameCount ?? null,
      },
    ),
    base_audio_preserved: status(
      baseMediaInspection.media.audio?.codecName === outputMedia.audio?.codecName
        && baseMediaInspection.media.audio?.packetPayloadSha256
          === outputMedia.audio?.packetPayloadSha256,
      {
        expectedCodecName: baseMediaInspection.media.audio?.codecName ?? null,
        actualCodecName: outputMedia.audio?.codecName ?? null,
        expectedPacketPayloadSha256:
          baseMediaInspection.media.audio?.packetPayloadSha256 ?? null,
        actualPacketPayloadSha256: outputMedia.audio?.packetPayloadSha256 ?? null,
      },
    ),
  };
  return {
    state: requiredQc.every((name) => checks[name]?.status === 'passed')
      && finalQc.status === 'passed'
      ? 'passed'
      : 'failed',
    requiredQc: requiredQc.map((name) => ({name, ...checks[name]})),
  };
};

export async function executePresentationReviewRendererV003(job) {
  const jobReport = validatePresentationReviewRenderJobV003(job);
  if (jobReport.status !== 'passed') return failure('job', jobReport.violations);
  const outputDirectory = resolvePresentationReviewOutputDirectoryV003(job.outputDirectory);
  const implementationViolations = [];
  await checkImplementationBindings(job, implementationViolations);
  if (implementationViolations.length > 0) {
    return failure('implementation-bindings', implementationViolations);
  }

  const gitState = await inspectGitStateV001();
  const inputs = await loadReviewInputs(job);
  if (inputs.violations.length > 0) return failure('transport', inputs.violations);
  const request = inputs.requestInput.value;
  const tools = await actualToolVersions();
  if (RUNTIME_PROFILE_FIELDS.some((field) => tools[field] !== job.runtimeProfile[field])) {
    return failure('runtime-profile', [
      violation('REVIEW_RENDER_RUNTIME_PROFILE_MISMATCH', '$.runtimeProfile', {
        expected: structuredClone(job.runtimeProfile),
        observed: structuredClone(tools),
      }),
    ]);
  }
  const trustReport = await loadAndValidatePresentationRendererTrustV001(tools);
  if (trustReport.status !== 'passed') {
    return failure('renderer-trust', trustReport.violations, trustReport);
  }
  const trustedInputViolations = [];
  if (
    inputs.trustedRegistryBindings.fileSha256 !== trustReport.trust.registryBinding.fileSha256
    || inputs.trustedRegistryBindings.canonicalSha256
      !== trustReport.trust.registryBinding.canonicalSha256
    || repoPath(inputs.trustedRegistryBindings.absolutePath)
      !== trustReport.trust.registryBinding.path
  ) {
    trustedInputViolations.push(violation(
      'REVIEW_RENDER_TRUST_ROOT_MISMATCH',
      '$request.registryBindings.trustedRegistryBindings',
    ));
  }
  if (
    inputs.presetRegistry.canonicalSha256 !== trustReport.trust.presetRegistry.canonicalSha256
    || repoPath(inputs.presetRegistry.absolutePath) !== trustReport.trust.presetRegistry.path
  ) {
    trustedInputViolations.push(violation(
      'REVIEW_RENDER_TRUST_ROOT_MISMATCH',
      '$request.registryBindings.presetRegistry',
    ));
  }
  if (trustedInputViolations.length > 0) {
    return failure('trusted-inputs', trustedInputViolations);
  }

  const contractReport = validatePresentationInstructionContractV003({
    instructionBundle: inputs.instructionBundle.value,
    displayPlan: inputs.displayPlan.value,
    retainedSourceAtoms: inputs.retainedSourceAtoms.value,
    trustedRegistryBindings: inputs.trustedRegistryBindings.value,
    presetRegistry: inputs.presetRegistry.value,
    presetValidationIndex: inputs.presetValidationIndex.value,
    materialValidationIndex: inputs.materialValidationIndex.value,
  });
  if (
    !['passed', 'passed_with_declared_limit'].includes(contractReport.status)
    || contractReport.violations.length !== 0
  ) {
    return failure('instruction-contract-v003', [
      violation('REVIEW_RENDER_INSTRUCTION_CONTRACT_REJECTED', '$instructionBundle', {
        status: contractReport.status,
        violationCodes: contractReport.violations.map((entry) => entry.code),
      }),
    ], contractReport);
  }
  if (
    inputs.captionCheck.value.overallStatus !== 'passed_with_declared_limit'
    || inputs.captionCheck.value.checks?.G1?.status !== 'passed'
    || inputs.captionCheck.value.checks?.G2?.status !== 'passed_with_declared_limit'
    || inputs.captionCheck.value.checks?.G3?.status !== 'passed'
    || inputs.layoutPreflight.value.status !== 'passed'
    || inputs.baseValidationReport.value.status !== 'passed'
    || inputs.retainedValidationReport.value.status !== 'passed'
  ) {
    return failure('review-input-state', [
      violation('REVIEW_RENDER_INPUT_STATE_INVALID', '$request.requiredInputState'),
    ]);
  }

  let baseMediaInspection;
  try {
    const [fileSha256, frameCount, media] = await Promise.all([
      fileSha256V002(inputs.baseMedia.absolutePath),
      inspectFrameCount(inputs.baseMedia.absolutePath),
      inspectRenderedMediaV002(inputs.baseMedia.absolutePath),
    ]);
    baseMediaInspection = {fileSha256, frameCount, media};
  } catch (error) {
    return failure('base-media', [
      violation('REVIEW_RENDER_BASE_MEDIA_INVALID', '$request.baseMediaBinding.baseMedia', {
        readError: error instanceof Error ? error.message : String(error),
      }),
    ]);
  }
  const baseMediaToolReport = validateBaseMediaToolProfileV002(
    inputs.baseGenerationManifest.value,
    tools,
  );
  if (baseMediaToolReport.status !== 'passed') {
    return failure('base-media-tool-profile', baseMediaToolReport.violations, baseMediaToolReport);
  }
  const baseBindingReport = validateBaseMediaGenerationBindingV002({
    generationManifest: inputs.baseGenerationManifest.value,
    generationManifestPath: inputs.baseGenerationManifest.absolutePath,
    timelineFilePath: inputs.timeline.absolutePath,
    timelineFileSha256: inputs.timeline.fileSha256,
    baseMediaFilePath: inputs.baseMedia.absolutePath,
    baseMediaInspection,
  });
  if (baseBindingReport.status !== 'passed') {
    return failure('base-media-binding', baseBindingReport.violations, baseBindingReport);
  }
  const timelineReport = validatePresentationBaseMediaTimelineV002(
    inputs.timeline.value,
    inputs.baseGenerationManifest.value,
    {
      fileSha256: baseMediaInspection.fileSha256,
      frameCount: baseMediaInspection.frameCount,
      timelineFileSha256: inputs.timeline.fileSha256,
    },
  );
  if (timelineReport.status !== 'passed') {
    return failure('timeline', timelineReport.violations, timelineReport);
  }

  const planReport = buildPresentationReviewRenderPlanV003({
    instructionBundle: inputs.instructionBundle.value,
    displayPlan: inputs.displayPlan.value,
    presetRegistry: inputs.presetRegistry.value,
    timeline: inputs.timeline.value,
    layoutRules: trustReport.trust.layoutRules,
  });
  if (planReport.status !== 'passed') {
    return failure('review-render-plan', planReport.violations, planReport);
  }
  const plan = planReport.plan;
  const expectedFrameCount = inputs.timeline.value.baseMedia.expectedFrameCount;
  const drawResult = await executeValidatedPresentationDrawAndQcV001({
    outputDirectory,
    plan,
    presetRegistry: inputs.presetRegistry.value,
    baseMediaPath: inputs.baseMedia.absolutePath,
    baseMediaInspection,
    expectedFrameCount,
    artifactNames: PRESENTATION_REVIEW_RENDER_OUTPUT_NAMES_V003,
    evaluateQc: evaluatePresentationReviewRendererQcV003,
  });
  if (drawResult.exitCode !== 0) {
    return failure(
      `shared-draw-${drawResult.failure?.stage ?? 'unknown'}`,
      drawResult.failure?.violations ?? [
        violation('REVIEW_RENDER_SHARED_DRAW_FAILED', '$render'),
      ],
      drawResult.failure ?? null,
      drawResult.failure?.cleanupWarnings ?? [],
    );
  }

  const {
    reservation,
    stagingDirectory,
    cleanupWarnings,
    overlayRecords,
    applicationResults,
    outputMedia,
    finalQc,
    workVideo,
  } = drawResult;
  try {
    const finalPlan = {
      ...plan,
      schemaVersion: PRESENTATION_REVIEW_RENDER_PLAN_SCHEMA_VERSION_V003,
      elements: plan.elements.map((element) => {
        const record = overlayRecords.find(
          (entry) => entry.element.instructionId === element.instructionId,
        );
        return {...element, overlaySha256: record.pngSha256};
      }),
    };
    const applicationDocument = {
      schemaVersion: PRESENTATION_REVIEW_RENDER_APPLICATION_RESULTS_SCHEMA_VERSION_V003,
      rendererVersion: PRESENTATION_REVIEW_RENDERER_VERSION_V003,
      sharedRenderEngineVersion: PRESENTATION_RENDERER_VERSION,
      presetRegistryVersion: plan.presetRegistryVersion,
      results: applicationResults,
    };
    const qcSummary = makeQcSummary({
      requiredQc: request.expectedOutput.requiredQc,
      plan,
      applicationResults,
      finalQc,
      baseMediaInspection,
      outputMedia,
      expectedFrameCount,
    });
    if (qcSummary.state !== 'passed') {
      return failure(
        'required-review-qc',
        [violation('REVIEW_RENDER_REQUIRED_QC_FAILED', '$output')],
        qcSummary,
        cleanupWarnings,
      );
    }

    const outputNames = PRESENTATION_REVIEW_RENDER_OUTPUT_NAMES_V003;
    const planPath = path.join(stagingDirectory, outputNames.plan);
    const applicationResultsPath = path.join(stagingDirectory, outputNames.applicationResults);
    const qcPath = path.join(stagingDirectory, outputNames.qc);
    await Promise.all([
      writeJson(planPath, finalPlan),
      writeJson(applicationResultsPath, applicationDocument),
      writeJson(qcPath, finalQc),
    ]);
    const [
      videoFileSha256,
      planFileSha256,
      applicationResultsFileSha256,
      qcFileSha256,
    ] = await Promise.all([
      fileSha256V002(workVideo),
      fileSha256V002(planPath),
      fileSha256V002(applicationResultsPath),
      fileSha256V002(qcPath),
    ]);
    const overlayFiles = applicationResults
      .map((result) => ({
        instructionId: result.instructionId,
        path: result.overlayFile,
        fileSha256: result.overlaySha256,
      }))
      .sort((left, right) => left.path.localeCompare(right.path, 'en'));
    const rendererFiles = [];
    for (const rendererFile of [
      path.join(MODULE_DIRECTORY, 'presentation_renderer_entry_v001.tsx'),
      path.join(MODULE_DIRECTORY, 'presentation_base_media_timeline_v002.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_plan_v002.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_text_layout_v001.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_renderer_qc_v002.mjs'),
      path.join(MODULE_DIRECTORY, 'presentation_instruction_contract_v003.mjs'),
      path.join(MODULE_DIRECTORY, 'render_presentation_v002.mjs'),
      fileURLToPath(import.meta.url),
      path.join(MODULE_DIRECTORY, 'inspect_presentation_render_layout_v001.ts'),
    ]) {
      rendererFiles.push({
        path: repoPath(rendererFile),
        fileSha256: await fileSha256V002(rendererFile),
      });
    }
    const manifest = {
      schemaVersion: PRESENTATION_REVIEW_RENDER_MANIFEST_SCHEMA_VERSION_V003,
      state: 'review_rendered',
      reviewOnly: true,
      publicReleaseAllowed: false,
      reviewRendererVersion: PRESENTATION_REVIEW_RENDERER_VERSION_V003,
      sharedRenderEngineVersion: PRESENTATION_RENDERER_VERSION,
      rendererTrustCanonicalSha256: PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256,
      git: gitState,
      rendererFiles,
      tools,
      trustedAppearance: {
        rendererContractVersion: trustReport.trust.rendererContractVersion,
        approvedPreview: structuredClone(trustReport.trust.approvedPreview),
        rendererDependencies: structuredClone(trustReport.trust.rendererDependencies),
        fontAssets: structuredClone(trustReport.trust.fontAssets),
        layoutRules: structuredClone(trustReport.trust.layoutRules),
      },
      inputs: {
        job: {
          jobId: job.jobId,
          reviewRenderRequest: structuredClone(job.reviewRenderRequest),
          implementationBindings: structuredClone(job.implementationBindings),
        },
        reviewRenderRequest: makeInputBinding(inputs.requestInput),
        displayPlan: makeInputBinding(inputs.displayPlan),
        instructionBundle: makeInputBinding(inputs.instructionBundle),
        captionCheck: makeInputBinding(inputs.captionCheck),
        layoutPreflight: makeInputBinding(inputs.layoutPreflight),
        retainedSourceAtoms: makeInputBinding(inputs.retainedSourceAtoms),
        retainedSourceAtomsGenerationManifest:
          makeInputBinding(inputs.retainedGenerationManifest),
        retainedSourceAtomsValidationReport:
          makeInputBinding(inputs.retainedValidationReport),
        trustedRegistryBindings: makeInputBinding(inputs.trustedRegistryBindings),
        presetRegistry: makeInputBinding(inputs.presetRegistry),
        presetValidationIndex: makeInputBinding(inputs.presetValidationIndex),
        materialValidationIndex: makeInputBinding(inputs.materialValidationIndex),
        baseMediaGenerationManifest: makeInputBinding(inputs.baseGenerationManifest),
        baseMediaValidationReport: makeInputBinding(inputs.baseValidationReport),
        baseMediaTimeline: makeInputBinding(inputs.timeline),
        baseMedia: makeInputBinding(inputs.baseMedia),
      },
      instructionContract: {
        status: contractReport.status,
        declaredLimits: inputs.captionCheck.value.checks.G2.unverified,
      },
      instructionSetId: plan.instructionSetId,
      resolutionPackageId: plan.resolutionPackageId,
      timelineId: plan.timelineId,
      presetRegistryVersion: plan.presetRegistryVersion,
      baseMediaToolVerification: {
        status: 'passed',
        expected: structuredClone(baseMediaToolReport.expected),
        observed: structuredClone(baseMediaToolReport.observed),
      },
      requiredReviewQc: qcSummary,
      output: {
        videoFile: outputNames.video,
        videoFileSha256,
        video: outputMedia.video,
        audio: outputMedia.audio,
        planFile: outputNames.plan,
        planFileSha256,
        applicationResultsFile: outputNames.applicationResults,
        applicationResultsFileSha256,
        qcFile: outputNames.qc,
        qcFileSha256,
        overlaySet: {
          directory: outputNames.overlays,
          files: overlayFiles,
          canonicalSha256: sha256Canonical(overlayFiles),
        },
      },
    };
    await writeJson(path.join(stagingDirectory, outputNames.manifest), manifest);
    const publication = await publishPresentationArtifactsV002({
      stagingDirectory,
      outputDirectory: reservation.outputDirectory,
      reservation,
      artifactNames: outputNames,
    });
    return {
      exitCode: 0,
      outputDirectory: reservation.outputDirectory,
      publication,
      cleanupWarnings,
      plan: finalPlan,
      applicationResults: applicationDocument,
      manifest,
      qc: finalQc,
      requiredReviewQc: qcSummary,
    };
  } catch (error) {
    return processFailure('review-render-finalize', error, cleanupWarnings);
  }
}

export async function runPresentationReviewRendererJobFileV003(jobPath) {
  let job;
  try {
    job = await readJsonFile(resolveRepoPath(jobPath));
  } catch (error) {
    return processFailure('job-read', error);
  }
  try {
    return await executePresentationReviewRendererV003(job);
  } catch (error) {
    return processFailure('execution', error);
  }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  const [, , jobPath] = process.argv;
  if (!jobPath || process.argv.length !== 3) {
    console.error(
      '使い方: node render_presentation_review_v003.mjs '
      + '<presentation-review-render-job-v003.json>',
    );
    process.exitCode = 2;
  } else {
    const result = await runPresentationReviewRendererJobFileV003(jobPath);
    if (result.exitCode === 0) {
      console.log(`確認描画完了: ${result.outputDirectory}`);
      if (result.cleanupWarnings?.length > 0) {
        console.error(JSON.stringify({
          status: 'review_rendered_with_retained_safety_artifacts',
          cleanupWarnings: result.cleanupWarnings,
        }, null, 2));
      }
    } else {
      console.error(JSON.stringify(result.failure, null, 2));
    }
    process.exitCode = result.exitCode;
  }
}
