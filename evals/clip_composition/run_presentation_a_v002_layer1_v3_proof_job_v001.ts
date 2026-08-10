import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001,
  buildPresentationAV002Layer1V3FixturesV001,
  canonicalSha256PresentationAV002Layer1V3JsonV001,
  serializePresentationAV002Layer1V3FormalJsonV001,
  sha256PresentationAV002Layer1V3BytesV001,
  validatePresentationAV002Layer1V3JsonBindingV001,
  validatePresentationAV002Layer1V3MediaBindingV001,
} from './presentation_a_v002_layer1_v3_fixture_v001.mjs';
import {
  PRESENTATION_A_V002_REVIEW_INPUT_SCHEMA_V001,
  buildPresentationAV002ReviewHtmlV001,
  validatePresentationAV002ReviewInputV001,
} from './presentation_a_v002_review_ui_v001.mjs';
import {
  PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
  PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
  buildPresentationAV002VerticalCaptionDiagnosticStyleV001,
  createPresentationAV002VerticalDiagnosticBaseMediaV001,
} from './presentation_a_v002_vertical_caption_diagnostic_v001.mjs';
import {
  PRESENTATION_A_MEANING_INFORMATION_FILE_NAME_V002,
  PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002,
  PRESENTATION_A_MEANING_INFORMATION_OUTPUT_ROOT_V002,
  PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
} from './presentation_a_meaning_information_package_v002.mjs';
import {
  PRESENTATION_A_SOURCE_SEQUENCE_FILE_NAME_V002,
  PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002,
  PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
  PRESENTATION_A_SOURCE_SEQUENCE_OUTPUT_ROOT_V002,
  serializePresentationAFormalJsonV002,
} from './presentation_a_source_sequence_v002.mjs';
import {
  buildPresentationFatalObservationV002,
  classifyPresentationFatalInnerCodeV002,
} from './presentation_fatal_observation_v002.mjs';
import {
  PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
  resolvePresentationOutputStyleV001,
} from './presentation_output_style_resolver_v001.ts';
import {
  buildPresentationOutputPageLinePlanV002,
} from './presentation_output_page_line_planner_v002.mjs';
import {
  buildPresentationOutputCommonCorePlanV002,
  buildPresentationOutputRenderPlanV002,
  classifyPresentationOutputDownstreamResultV002,
} from './presentation_output_render_plan_v002.mjs';

export const PRESENTATION_A_V002_LAYER1_V3_PROOF_JOB_SCHEMA_V001 =
  'presentation-a-v002-layer1-v3-proof-job-v001';
export const PRESENTATION_A_V002_LAYER1_V3_PROOF_RUN_SCHEMA_V001 =
  'presentation-a-v002-layer1-v3-proof-run-v001';
export const PRESENTATION_A_V002_LAYER1_V3_PROOF_OUTPUT_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs';

export const PRESENTATION_A_V002_LAYER1_V3_PROOF_VARIANTS_V001 = Object.freeze([
  'horizontal-formal',
  'vertical-caption-diagnostic',
]);

export const PRESENTATION_A_V002_PLANNER_RESOURCE_CHECKPOINT_SCHEMA_V001 =
  'presentation-a-v002-planner-resource-checkpoint-v001';

const PRESENTATION_OUTPUT_PLANNER_RESOURCE_EVENT_SCHEMA_V001 =
  'presentation-output-planner-resource-event-v001';
const PRESENTATION_OUTPUT_PLANNER_RESOURCE_EVENT_STAGES_V001 = Object.freeze([
  'physical-graph',
  'timeline-mapping',
  'path-selection',
  'planner-completed',
]);
const PRESENTATION_OUTPUT_PLANNER_RESOURCE_EVENT_KEYS_V001 = Object.freeze([
  'schemaVersion',
  'stage',
  'processedAtomCount',
  'generatedPhysicalEdgeCount',
  'acceptedPhysicalEdgeCount',
  'processedTimelineEdgeCount',
  'mappedTimelineEdgeCount',
  'rejectedTimelineEdgeCount',
  'generatedStateCount',
  'insertedStateCount',
  'replacedEquivalentStateCount',
  'prunedDominatedStateCount',
  'retainedStateCount',
  'maximumRetainedStateCount',
  'elapsedMs',
]);

export const PRESENTATION_A_V002_LAYER1_V3_PROOF_IMPLEMENTATION_ROLES_V001 = Object.freeze([
  ['proof-runner', 'evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.ts'],
  ['fixture', 'evals/clip_composition/presentation_a_v002_layer1_v3_fixture_v001.mjs'],
  ['source-sequence', 'evals/clip_composition/presentation_a_source_sequence_v002.mjs'],
  ['source-sequence-runner', 'evals/clip_composition/run_presentation_a_source_sequence_job_v002.mjs'],
  ['meaning-package', 'evals/clip_composition/presentation_a_meaning_information_package_v002.mjs'],
  ['meaning-package-runner', 'evals/clip_composition/run_presentation_a_meaning_information_package_job_v002.mjs'],
  ['strict-json', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['fatal-observation', 'evals/clip_composition/presentation_fatal_observation_v002.mjs'],
  ['piecewise-timeline', 'evals/clip_composition/presentation_output_piecewise_timeline_v002.mjs'],
  ['page-line-planner-v002', 'evals/clip_composition/presentation_output_page_line_planner_v002.mjs'],
  ['page-line-planner-v001', 'evals/clip_composition/presentation_output_page_line_planner_v001.mjs'],
  ['style-resolver', 'evals/clip_composition/presentation_output_style_resolver_v001.ts'],
  ['render-plan-v002', 'evals/clip_composition/presentation_output_render_plan_v002.mjs'],
  ['render-plan-v001', 'evals/clip_composition/presentation_output_render_plan_v001.mjs'],
  ['base-media-builder', 'evals/clip_composition/presentation_base_media_build_v001.mjs'],
  ['renderer-core', 'evals/clip_composition/render_presentation_v002.mjs'],
  ['renderer-qc', 'evals/clip_composition/presentation_renderer_qc_v002.mjs'],
  ['vertical-diagnostic', 'evals/clip_composition/presentation_a_v002_vertical_caption_diagnostic_v001.mjs'],
  ['review-ui', 'evals/clip_composition/presentation_a_v002_review_ui_v001.mjs'],
  ['vertical-renderer', 'evals/clip_composition/render_presentation_vertical_review_v001.ts'],
].map(([role, filePath]) => Object.freeze({role, path: filePath})));

/**
 * `.ts`をCommonJSへ変換する固定TSX実行でも、top-level awaitを持つ既存`.mjs`を
 * native ESMとして読む。返す関数は全て既存実装のexportそのもので、計算は複製しない。
 */
export async function loadPresentationAV002Layer1V3ProofExistingCoreExportsV001({
  loadModule = async ({href}) => import(href),
} = {}) {
  const moduleHref = fileName => pathToFileURL(path.resolve(path.dirname(__filename), fileName)).href;
  const baseMediaHref = moduleHref('presentation_base_media_build_v001.mjs');
  const rendererHref = moduleHref('render_presentation_v002.mjs');
  const [baseMedia, renderer] = await Promise.all([
    loadModule({role: 'base-media-builder', href: baseMediaHref}),
    loadModule({role: 'renderer-core', href: rendererHref}),
  ]);
  return Object.freeze({
    inspectSourceMedia: baseMedia.inspectPresentationBaseMediaSourceV001,
    inspectToolBinaries: baseMedia.inspectPresentationBaseMediaToolBinaryDiagnosticsV001,
    validateSegmentPlan: baseMedia.validatePresentationBaseMediaSegmentPlanV001,
    buildVideo: baseMedia.buildPresentationBaseMediaVideoV001,
    buildAudio: baseMedia.buildPresentationBaseMediaAudioV001,
    muxAudioVideo: baseMedia.muxPresentationBaseMediaV001,
    inspectBaseMediaOutput: baseMedia.inspectPresentationBaseMediaOutputV001,
    drawAndQc: renderer.executeValidatedPresentationDrawAndQcV001,
  });
}

export const PRESENTATION_A_V002_LAYER1_V3_PROOF_VIOLATION_CODES_V001 = Object.freeze([
  'OUTPUT_V002_PLANNER_INPUT_INVALID',
  'OUTPUT_V002_TEXT_COVERAGE_MISMATCH',
  'OUTPUT_V002_LAYOUT_UNRESOLVED',
  'OUTPUT_V002_RENDER_PLAN_INVALID',
  'OUTPUT_V002_RENDER_PROJECTION_MISMATCH',
  'OUTPUT_V002_BASE_MEDIA_INVALID',
  'OUTPUT_V002_PUBLICATION_FAILED',
  'OUTPUT_V002_QC_FAILED',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const PRESENTATION_OUTPUT_PLANNER_RESOURCE_FIELDS_BY_STAGE_V001 = Object.freeze({
  'physical-graph': Object.freeze([
    'processedAtomCount',
    'generatedPhysicalEdgeCount',
    'acceptedPhysicalEdgeCount',
  ]),
  'timeline-mapping': Object.freeze([
    'processedAtomCount',
    'processedTimelineEdgeCount',
    'mappedTimelineEdgeCount',
    'rejectedTimelineEdgeCount',
  ]),
  'path-selection': Object.freeze([
    'processedAtomCount',
    'generatedStateCount',
    'insertedStateCount',
    'replacedEquivalentStateCount',
    'prunedDominatedStateCount',
    'retainedStateCount',
    'maximumRetainedStateCount',
  ]),
  'planner-completed': Object.freeze([
    'processedAtomCount',
    'generatedStateCount',
    'maximumRetainedStateCount',
    'elapsedMs',
  ]),
});

const validatePresentationOutputPlannerResourceEventForProofV001 = value => {
  if (!exactKeys(value, PRESENTATION_OUTPUT_PLANNER_RESOURCE_EVENT_KEYS_V001)
    || value.schemaVersion !== PRESENTATION_OUTPUT_PLANNER_RESOURCE_EVENT_SCHEMA_V001
    || !PRESENTATION_OUTPUT_PLANNER_RESOURCE_EVENT_STAGES_V001.includes(value.stage)) {
    return false;
  }
  const populatedFields = PRESENTATION_OUTPUT_PLANNER_RESOURCE_FIELDS_BY_STAGE_V001[value.stage];
  return PRESENTATION_OUTPUT_PLANNER_RESOURCE_EVENT_KEYS_V001
    .filter(key => !['schemaVersion', 'stage'].includes(key))
    .every(key => populatedFields.includes(key) ? nonnegative(value[key]) : value[key] === null);
};

/**
 * plannerの閉語彙整数eventを、proof本体schemaへ混ぜず独立fileへ即時保存する。
 * 同期writeにすることで途中停止時も最後に完了した自然境界までを証拠として残す。
 */
export function createPresentationAV002Layer1V3PlannerResourceObserverV001({
  outputRoot,
  candidateOrdinal,
  variant,
  proofArtifacts,
} = {}) {
  if (typeof outputRoot !== 'string' || !path.isAbsolute(outputRoot)
    || ![1, 2, 3].includes(candidateOrdinal)
    || !PRESENTATION_A_V002_LAYER1_V3_PROOF_VARIANTS_V001.includes(variant)
    || !(proofArtifacts instanceof Map)) {
    throw new TypeError('invalid planner resource observer input');
  }
  let sequence = 0;
  return event => {
    if (!validatePresentationOutputPlannerResourceEventForProofV001(event)) {
      throw new TypeError('invalid planner resource event');
    }
    const nextSequence = sequence + 1;
    const artifact = {
      schemaVersion: PRESENTATION_A_V002_PLANNER_RESOURCE_CHECKPOINT_SCHEMA_V001,
      candidateOrdinal,
      variant,
      sequence: nextSequence,
      plannerEvent: structuredClone(event),
    };
    const bytes = serializePresentationAV002Layer1V3FormalJsonV001(artifact);
    const absolutePath = path.join(
      outputRoot,
      'planner-resource-observations-v001',
      `candidate-${String(candidateOrdinal).padStart(3, '0')}`
        + `-${variant}-sequence-${String(nextSequence).padStart(6, '0')}.json`,
    );
    mkdirSync(path.dirname(absolutePath), {recursive: true});
    writeFileSync(absolutePath, bytes, {flag: 'wx'});
    proofArtifacts.set(
      absolutePath,
      sha256PresentationAV002Layer1V3BytesV001(bytes),
    );
    sequence = nextSequence;
    return Object.freeze({absolutePath, artifact: Object.freeze(artifact)});
  };
}

export const PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002 =
  'presentation-a-v002-layer1-v3-proof-observation-v002';

const PROOF_OBSERVATION_INITIAL_CHECKPOINTS_V002 = Object.freeze([
  'dependency-initialization-entered',
  'dependency-initialization-completed',
  'start-input-reread-entered',
  'start-input-reread-completed',
]);
const PROOF_OBSERVATION_VARIANT_STAGES_V002 = Object.freeze([
  'horizontal-style-resolution',
  'vertical-style-resolution',
  'page-line-plan',
  'render-plan',
  'common-render-plan',
  'media-inspection',
  'renderer-work-acquisition',
  'rendering',
  'qc',
]);
const PROOF_OBSERVATION_BASE_MEDIA_STAGE_V002 = 'base-media-inspection';
const PROOF_OBSERVATION_CALLER_STAGES_V002 = Object.freeze([
  'argument-validation',
  'job-read',
  'dependency-initialization',
  'start-input-reread',
  'fixture-build',
  PROOF_OBSERVATION_BASE_MEDIA_STAGE_V002,
  ...PROOF_OBSERVATION_VARIANT_STAGES_V002,
  'prepublication-input-reread',
  'publication',
  'top-level',
]);
const PROOF_OBSERVATION_START_STEPS_V002 = Object.freeze([
  'job',
  'upstream-json',
  'source-media',
  'implementation-file',
  'runtime-binary',
  'tool-inspection',
]);
const PROOF_OBSERVATION_EXCEPTION_TYPES_V002 = Object.freeze([
  'argument-validation',
  'module-load',
  'json-decode',
  'file-read',
  'tool-inspection',
  'fixture-build',
  'child-process',
  'publication',
  'unknown',
]);
const proofFatalEvidenceByErrorV001 = new WeakMap();

const createProofObservationStateV001 = () => ({
  checkpoints: [],
  failure: null,
  jobTarget: null,
});

const proofVariantStageFromCheckpointV002 = checkpoint => (
  checkpoint.endsWith('-entered')
    ? checkpoint.slice(0, -'-entered'.length)
    : checkpoint.endsWith('-completed')
      ? checkpoint.slice(0, -'-completed'.length)
      : null
);

const validateProofCheckpointSequenceV002 = checkpoints => {
  if (!dense(checkpoints)) return false;
  const initialLength = Math.min(
    checkpoints.length,
    PROOF_OBSERVATION_INITIAL_CHECKPOINTS_V002.length,
  );
  for (let index = 0; index < initialLength; index += 1) {
    if (checkpoints[index] !== PROOF_OBSERVATION_INITIAL_CHECKPOINTS_V002[index]) return false;
  }
  if (checkpoints.length <= PROOF_OBSERVATION_INITIAL_CHECKPOINTS_V002.length) return true;

  const orderedStages = PROOF_OBSERVATION_VARIANT_STAGES_V002.slice(2);
  let stageIndex = 0;
  for (let index = PROOF_OBSERVATION_INITIAL_CHECKPOINTS_V002.length;
    index < checkpoints.length;) {
    const expectedStage = stageIndex === 0
      ? [
        PROOF_OBSERVATION_BASE_MEDIA_STAGE_V002,
        'horizontal-style-resolution',
        'vertical-style-resolution',
      ]
      : [orderedStages[stageIndex - 1]];
    const entered = checkpoints[index];
    if (typeof entered !== 'string') return false;
    const stage = proofVariantStageFromCheckpointV002(entered);
    if (!entered.endsWith('-entered') || !expectedStage.includes(stage)) return false;
    if (index + 1 === checkpoints.length) return true;
    if (checkpoints[index + 1] !== `${stage}-completed`) return false;
    index += 2;
    if (stage !== PROOF_OBSERVATION_BASE_MEDIA_STAGE_V002) {
      stageIndex = stageIndex === PROOF_OBSERVATION_VARIANT_STAGES_V002.length - 2
        ? 0
        : stageIndex + 1;
    }
  }
  return true;
};

const recordProofCheckpointV001 = (state, checkpoint) => {
  if (state === null) return;
  const next = [...state.checkpoints, checkpoint];
  if (!validateProofCheckpointSequenceV002(next)) {
    throw new TypeError('invalid proof observation checkpoint order');
  }
  state.checkpoints.push(checkpoint);
};

const proofTargetFromBindingV001 = binding => (
  isObject(binding)
  && typeof binding.path === 'string'
  && binding.path.length > 0
  && SHA256.test(binding.fileSha256)
    ? Object.freeze({path: binding.path, fileSha256: binding.fileSha256})
    : null
);

const normalizeProofThrownValueV001 = error => (
  (typeof error === 'object' && error !== null) || typeof error === 'function'
    ? error
    : new Error('proof operation failed')
);

const attachProofFatalEvidenceV001 = (error, evidence) => {
  const normalized = normalizeProofThrownValueV001(error);
  if (!proofFatalEvidenceByErrorV001.has(normalized)) {
    proofFatalEvidenceByErrorV001.set(normalized, Object.freeze({
      callerStage: evidence.callerStage,
      step: evidence.step,
      exceptionType: evidence.exceptionType,
      targetFile: evidence.targetFile,
      toolExitCode: evidence.toolExitCode,
    }));
  }
  return normalized;
};

const observeProofOperationV001 = async ({
  callerStage,
  step = null,
  exceptionType,
  targetFile = null,
  toolExitCode = null,
  operation,
}) => {
  try {
    return await operation();
  } catch (error) {
    throw attachProofFatalEvidenceV001(error, {
      callerStage,
      step,
      exceptionType,
      targetFile,
      toolExitCode: nonnegative(error?.proofToolExitCode)
        ? error.proofToolExitCode
        : toolExitCode,
    });
  }
};

const observeProofVariantStageV002 = async ({
  state,
  stage,
  exceptionType = 'unknown',
  targetFile = null,
  operation,
}) => {
  recordProofCheckpointV001(state, `${stage}-entered`);
  const result = await observeProofOperationV001({
    callerStage: stage,
    exceptionType,
    targetFile,
    operation,
  });
  recordProofCheckpointV001(state, `${stage}-completed`);
  return result;
};

const proofRendererFailureStageV002 = draw => {
  const aggregateStage = draw?.failure?.stage;
  const innerStage = draw?.presentationFatalProcessEvidence?.innerStage;
  if (['output-reservation', 'work-directory'].includes(aggregateStage)) {
    return 'renderer-work-acquisition';
  }
  if (aggregateStage === 'post-render-qc' || innerStage === 'post-render-qc') return 'qc';
  if ([
    'layout-preflight',
    'overlay-determinism',
    'overlay-preflight',
    'overlay-render',
  ].includes(aggregateStage) || ['layout-preflight', 'overlay-render'].includes(innerStage)) {
    return 'rendering';
  }
  return 'renderer-work-acquisition';
};

const recordProofRendererReturnV002 = ({state, draw, targetFile}) => {
  const failureStage = draw?.exitCode === 0 ? null : proofRendererFailureStageV002(draw);
  if (failureStage !== 'renderer-work-acquisition') {
    recordProofCheckpointV001(state, 'renderer-work-acquisition-completed');
    recordProofCheckpointV001(state, 'rendering-entered');
  }
  if (failureStage === 'qc' || failureStage === null) {
    recordProofCheckpointV001(state, 'rendering-completed');
    recordProofCheckpointV001(state, 'qc-entered');
  }
  if (failureStage === null) {
    recordProofCheckpointV001(state, 'qc-completed');
    return;
  }
  if (draw?.exitCode === 2) {
    const error = new Error('proof renderer stage failed');
    if (draw?.presentationFatalProcessEvidence !== undefined) {
      Object.defineProperty(error, 'presentationFatalProcessEvidence', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: draw.presentationFatalProcessEvidence,
      });
    }
    throw attachProofFatalEvidenceV001(error, {
      callerStage: failureStage,
      step: null,
      exceptionType: draw?.presentationFatalProcessEvidence === undefined
        ? 'unknown'
        : 'child-process',
      targetFile: failureStage === 'rendering' ? targetFile : null,
      toolExitCode: nonnegative(draw?.presentationFatalProcessEvidence?.toolExitCode)
        ? draw.presentationFatalProcessEvidence.toolExitCode
        : null,
    });
  }
};

const validateProofObservationTargetV001 = value => value === null || (
  exactKeys(value, ['path', 'fileSha256'])
  && typeof value.path === 'string'
  && value.path.length > 0
  && SHA256.test(value.fileSha256)
);

const validateProofCheckpointStageConsistencyV002 = (checkpoints, failure) => {
  if (failure === null || failure.callerStage === 'top-level') return true;
  if (failure.callerStage === PROOF_OBSERVATION_BASE_MEDIA_STAGE_V002
    || PROOF_OBSERVATION_VARIANT_STAGES_V002.includes(failure.callerStage)) {
    return checkpoints.at(-1) === `${failure.callerStage}-entered`;
  }
  if (['prepublication-input-reread', 'publication'].includes(failure.callerStage)) {
    return !checkpoints.at(-1)?.endsWith('-entered');
  }
  const expectedCount = {
    'argument-validation': 0,
    'job-read': 0,
    'dependency-initialization': 1,
    'start-input-reread': 3,
    'fixture-build': 4,
  }[failure.callerStage];
  return checkpoints.length === expectedCount;
};

export function validatePresentationAV002Layer1V3ProofObservationV002(value) {
  if (!exactKeys(value, ['schemaVersion', 'checkpoints', 'failure'])
    || value.schemaVersion !== PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002
    || !validateProofCheckpointSequenceV002(value.checkpoints)) return false;
  if (value.failure === null) return true;
  return exactKeys(value.failure, [
    'callerStage', 'step', 'exceptionType', 'targetFile', 'toolExitCode',
  ])
    && PROOF_OBSERVATION_CALLER_STAGES_V002.includes(value.failure.callerStage)
    && (value.failure.step === null
      || PROOF_OBSERVATION_START_STEPS_V002.includes(value.failure.step))
    && PROOF_OBSERVATION_EXCEPTION_TYPES_V002.includes(value.failure.exceptionType)
    && validateProofObservationTargetV001(value.failure.targetFile)
    && (value.failure.toolExitCode === null
      || nonnegative(value.failure.toolExitCode))
    && validateProofCheckpointStageConsistencyV002(value.checkpoints, value.failure);
}

const recordProofFailureV001 = (state, {
  callerStage,
  step = null,
  exceptionType = 'unknown',
  targetFile = null,
  toolExitCode = null,
  error = null,
}) => {
  if (state === null || state.failure !== null) return;
  const attached = ((typeof error === 'object' && error !== null) || typeof error === 'function')
    ? proofFatalEvidenceByErrorV001.get(error)
    : null;
  const candidate = {
    callerStage: attached?.callerStage ?? callerStage,
    step: attached?.step ?? step,
    exceptionType: attached?.exceptionType ?? exceptionType,
    targetFile: attached?.targetFile ?? targetFile,
    toolExitCode: attached?.toolExitCode ?? toolExitCode,
  };
  state.failure = Object.freeze({
    callerStage: PROOF_OBSERVATION_CALLER_STAGES_V002.includes(candidate.callerStage)
      ? candidate.callerStage
      : 'top-level',
    step: candidate.step === null || PROOF_OBSERVATION_START_STEPS_V002.includes(candidate.step)
      ? candidate.step
      : null,
    exceptionType: PROOF_OBSERVATION_EXCEPTION_TYPES_V002.includes(candidate.exceptionType)
      ? candidate.exceptionType
      : 'unknown',
    targetFile: validateProofObservationTargetV001(candidate.targetFile)
      ? candidate.targetFile
      : null,
    toolExitCode: candidate.toolExitCode === null || nonnegative(candidate.toolExitCode)
      ? candidate.toolExitCode
      : null,
  });
};

const buildProofObservationV001 = state => Object.freeze({
  schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002,
  checkpoints: Object.freeze([...state.checkpoints]),
  failure: state.failure === null ? null : Object.freeze({
    callerStage: state.failure.callerStage,
    step: state.failure.step,
    exceptionType: state.failure.exceptionType,
    targetFile: state.failure.targetFile === null ? null : Object.freeze({
      path: state.failure.targetFile.path,
      fileSha256: state.failure.targetFile.fileSha256,
    }),
    toolExitCode: state.failure.toolExitCode,
  }),
});

const attachProofObservationV001 = (result, state) => {
  const proofObservation = buildProofObservationV001(state);
  if (!validatePresentationAV002Layer1V3ProofObservationV002(proofObservation)) {
    throw new TypeError('invalid proof observation');
  }
  return Object.freeze({...result, proofObservation});
};

const validateImplementationBinding = value => exactKeys(value, ['path', 'fileSha256', 'role'])
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && typeof value.role === 'string'
  && value.role.length > 0;

const validateInputBindings = value => exactKeys(value, [
  'legacyPackage', 'humanResult', 'sourceIdentity', 'sourceTranscriptByte',
])
  && validatePresentationAV002Layer1V3JsonBindingV001(value.legacyPackage)
  && validatePresentationAV002Layer1V3JsonBindingV001(value.humanResult)
  && validatePresentationAV002Layer1V3JsonBindingV001(value.sourceIdentity)
  && validatePresentationAV002Layer1V3MediaBindingV001(value.sourceTranscriptByte);

const validateStyleBindings = value => exactKeys(value, [
  'horizontalPresetRegistry', 'verticalPresetRegistry',
])
  && validatePresentationAV002Layer1V3JsonBindingV001(value.horizontalPresetRegistry)
  && validatePresentationAV002Layer1V3JsonBindingV001(value.verticalPresetRegistry);

export function validatePresentationAV002Layer1V3ProofJobV001(job) {
  return exactKeys(job, [
    'schemaVersion',
    'jobId',
    'createdAt',
    'sourceMedia',
    'inputBindings',
    'styleBindings',
    'outputDirectory',
    'implementationBindings',
  ])
    && job.schemaVersion === PRESENTATION_A_V002_LAYER1_V3_PROOF_JOB_SCHEMA_V001
    && FORMAL_ID.test(job.jobId)
    && typeof job.createdAt === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(job.createdAt)
    && validatePresentationAV002Layer1V3MediaBindingV001(job.sourceMedia)
    && validateInputBindings(job.inputBindings)
    && validateStyleBindings(job.styleBindings)
    && job.outputDirectory
      === `${PRESENTATION_A_V002_LAYER1_V3_PROOF_OUTPUT_ROOT_V001}/${job.jobId}`
    && dense(job.implementationBindings)
    && job.implementationBindings.length
      === PRESENTATION_A_V002_LAYER1_V3_PROOF_IMPLEMENTATION_ROLES_V001.length
    && job.implementationBindings.every((binding, index) => (
      validateImplementationBinding(binding)
      && binding.role === PRESENTATION_A_V002_LAYER1_V3_PROOF_IMPLEMENTATION_ROLES_V001[index].role
      && binding.path === PRESENTATION_A_V002_LAYER1_V3_PROOF_IMPLEMENTATION_ROLES_V001[index].path
    ));
}

export const makePresentationAV002Layer1V3ProofViolationV001 = (code, pointer) => {
  if (!PRESENTATION_A_V002_LAYER1_V3_PROOF_VIOLATION_CODES_V001.includes(code)) {
    throw new TypeError(`unknown A-v002 proof violation code: ${code}`);
  }
  return Object.freeze({code, path: pointer, relatedIds: Object.freeze([])});
};

const rejected = (code, pointer) => Object.freeze({
  exitCode: 1,
  status: 'rejected',
  violations: Object.freeze([makePresentationAV002Layer1V3ProofViolationV001(code, pointer)]),
});

const fatalObservation = ({innerStage = 'unknown', error = null, innerCode = null} = {}) => {
  const processEvidence = error?.presentationFatalProcessEvidence;
  const observedInnerCode = innerCode
    ?? processEvidence?.innerCode
    ?? classifyPresentationFatalInnerCodeV002(
      error?.code === undefined
        ? {kind: 'unclassified'}
        : {kind: 'node-error', code: error.code},
    );
  const observedStage = processEvidence?.innerStage ?? innerStage;
  try {
    return buildPresentationFatalObservationV002({
      innerStage: observedInnerCode === 'UNCLASSIFIED' ? 'unknown' : observedStage,
      targetFile: null,
      innerCode: observedInnerCode,
    });
  } catch {
    return buildPresentationFatalObservationV002({
      innerStage: 'unknown',
      targetFile: null,
      innerCode: 'UNCLASSIFIED',
    });
  }
};

const fatal = input => Object.freeze({
  exitCode: 2,
  status: 'fatal',
  violations: Object.freeze([]),
  fatalObservation: fatalObservation(
    typeof input === 'string' ? {innerStage: input} : input,
  ),
});

const proofRejectedError = (code, pointer) => Object.assign(
  new Error('A-v002 proof input was rejected'),
  {proofRejected: true, code, pointer},
);

export async function rereadPresentationAV002Layer1V3ProofArtifactsV001(artifacts) {
  for (const [absolutePath, expectedSha256] of artifacts) {
    const bytes = await readStableBytes(absolutePath);
    if (sha256PresentationAV002Layer1V3BytesV001(bytes) !== expectedSha256) {
      throw proofRejectedError('OUTPUT_V002_RENDER_PROJECTION_MISMATCH', '/outputDirectory');
    }
  }
}

const caughtResult = (error, {
  innerStage,
  rejectedCode = null,
  rejectedPath = '/',
  proofObservationState = null,
  proofCallerStage = 'top-level',
  proofStep = null,
  proofExceptionType = 'unknown',
  proofTargetFile = null,
} = {}) => {
  if (error?.proofRejected === true) return rejected(error.code, error.pointer);
  if (rejectedCode !== null && error?.code === 'EEXIST') {
    return rejected(rejectedCode, rejectedPath);
  }
  recordProofFailureV001(proofObservationState, {
    callerStage: proofCallerStage,
    step: proofStep,
    exceptionType: proofExceptionType,
    targetFile: proofTargetFile,
    error,
  });
  return fatal({innerStage, error});
};

const validateExecutionResult = (value, item, variant) => {
  if (!exactKeys(value, [
    'status',
    'proofItemId',
    'candidateId',
    'variant',
    'baseMedia',
    'renderedMedia',
    'qc',
    'commonCoreIdentity',
  ])) return false;
  if (
    value.status !== 'passed'
    || value.proofItemId !== item.proofInput.proofInputId
    || value.candidateId !== item.candidateId
    || value.variant !== variant
    || typeof value.commonCoreIdentity !== 'string'
    || value.commonCoreIdentity.length === 0
    || !exactKeys(value.baseMedia, [
      'mediaBinding', 'durationMs', 'frameCount', 'audioSampleCount', 'segmentCount',
    ])
    || !validatePresentationAV002Layer1V3MediaBindingV001(value.baseMedia.mediaBinding)
    || !positive(value.baseMedia.durationMs)
    || !positive(value.baseMedia.frameCount)
    || !positive(value.baseMedia.audioSampleCount)
    || value.baseMedia.segmentCount !== 2
    || !exactKeys(value.renderedMedia, [
      'label', 'mediaBinding', 'durationMs', 'frameCount',
    ])
    || !validatePresentationAV002Layer1V3MediaBindingV001(value.renderedMedia.mediaBinding)
    || !positive(value.renderedMedia.durationMs)
    || !positive(value.renderedMedia.frameCount)
    || value.renderedMedia.frameCount !== value.baseMedia.frameCount
    || !exactKeys(value.qc, ['status', 'binding'])
    || value.qc.status !== 'passed'
    || !validatePresentationAV002Layer1V3MediaBindingV001(value.qc.binding)
  ) return false;
  return true;
};

const buildReviewInput = ({job, fixtures, executions}) => ({
  schemaVersion: PRESENTATION_A_V002_REVIEW_INPUT_SCHEMA_V001,
  reviewId: `${job.jobId}-review`,
  createdAt: job.createdAt,
  verticalDiagnosticGuarantee: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
  items: fixtures.map(item => {
    const horizontal = executions.find(entry => (
      entry.proofItemId === item.proofInput.proofInputId
      && entry.variant === 'horizontal-formal'
    ));
    const vertical = executions.find(entry => (
      entry.proofItemId === item.proofInput.proofInputId
      && entry.variant === 'vertical-caption-diagnostic'
    ));
    const crossedAtom = item.proofInput.sourceAtoms.find(atom => (
      atom.sourceStartMs < item.removalDecision.sourceEndMs
      && item.removalDecision.sourceStartMs < atom.sourceEndMs
    ));
    // The review page explains what remains visible for the atom crossed by the
    // approved cut.  It must not label the complement of the whole clip as if it
    // were this atom's provenance.
    const retainedSpans = crossedAtom === undefined ? [] : [
      {
        sourceStartMs: crossedAtom.sourceStartMs,
        sourceEndMs: Math.min(
          crossedAtom.sourceEndMs,
          item.removalDecision.sourceStartMs,
        ),
      },
      {
        sourceStartMs: Math.max(
          crossedAtom.sourceStartMs,
          item.removalDecision.sourceEndMs,
        ),
        sourceEndMs: crossedAtom.sourceEndMs,
      },
    ].filter(span => span.sourceStartMs < span.sourceEndMs);
    return {
      proofItemId: item.proofInput.proofInputId,
      candidateId: item.candidateId,
      approvedCut: {
        sourceStartMs: item.removalDecision.sourceStartMs,
        sourceEndMs: item.removalDecision.sourceEndMs,
      },
      crossedAtom: {
        text: crossedAtom?.text ?? '',
        sourceStartMs: crossedAtom?.sourceStartMs ?? 0,
        sourceEndMs: crossedAtom?.sourceEndMs ?? 0,
      },
      retainedSpans,
      horizontal: {
        label: '横型・正式style',
        mediaBinding: horizontal.renderedMedia.mediaBinding,
        durationMs: horizontal.renderedMedia.durationMs,
        frameCount: horizontal.renderedMedia.frameCount,
        qcBinding: horizontal.qc.binding,
        qcStatus: horizontal.qc.status,
      },
      verticalDiagnostic: {
        label: '縦型・字幕跨ぎ診断',
        mediaBinding: vertical.renderedMedia.mediaBinding,
        durationMs: vertical.renderedMedia.durationMs,
        frameCount: vertical.renderedMedia.frameCount,
        qcBinding: vertical.qc.binding,
        qcStatus: vertical.qc.status,
      },
    };
  }),
});

const validateDependencies = value => isObject(value)
  && typeof value.captureInputs === 'function'
  && typeof value.buildFixtures === 'function'
  && typeof value.executeVariant === 'function'
  && typeof value.publishRun === 'function';

/**
 * A-v002旧v3実証の正式な一回入口。
 * filesystem、trim/concat、ZEVO plan、共通描画/QCはdependenciesの正本入口を呼び、
 * このrunner自身は順序・再読・3x2・no-replaceだけを所有する。
 */
export async function executePresentationAV002Layer1V3ProofJobV001({
  job,
  dependencies,
  proofObservationState = null,
}) {
  if (!validatePresentationAV002Layer1V3ProofJobV001(job)) {
    return rejected('OUTPUT_V002_PLANNER_INPUT_INVALID', '/job');
  }
  if (!validateDependencies(dependencies)) {
    recordProofFailureV001(proofObservationState, {
      callerStage: 'dependency-initialization',
      exceptionType: 'unknown',
    });
    return fatal('dependency-resolution');
  }

  let startSnapshot;
  recordProofCheckpointV001(proofObservationState, 'start-input-reread-entered');
  try {
    startSnapshot = await dependencies.captureInputs(job, {phase: 'start'});
  } catch (error) {
    return caughtResult(error, {
      innerStage: 'input-read',
      proofObservationState,
      proofCallerStage: 'start-input-reread',
      proofExceptionType: 'file-read',
    });
  }
  recordProofCheckpointV001(proofObservationState, 'start-input-reread-completed');
  let fixtureResult;
  try {
    fixtureResult = await dependencies.buildFixtures(startSnapshot, job);
  } catch (error) {
    return caughtResult(error, {
      innerStage: 'semantic-rebuild',
      proofObservationState,
      proofCallerStage: 'fixture-build',
      proofExceptionType: 'fixture-build',
    });
  }
  if (
    !isObject(fixtureResult)
    || fixtureResult.status !== 'built'
    || !dense(fixtureResult.fixtures)
    || fixtureResult.fixtures.length !== 3
    || fixtureResult.fixtures.some(item => (
      !isObject(item)
      || item.proofInput?.schemaVersion
        !== PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001
    ))
  ) return rejected('OUTPUT_V002_PLANNER_INPUT_INVALID', '/fixtures');

  const executions = [];
  for (const item of fixtureResult.fixtures) {
    for (const variant of PRESENTATION_A_V002_LAYER1_V3_PROOF_VARIANTS_V001) {
      let execution;
      try {
        execution = await dependencies.executeVariant({
          job,
          fixtureResult,
          item,
          variant,
          diagnosticId: variant === 'vertical-caption-diagnostic'
            ? PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001
            : null,
        });
      } catch (error) {
        return caughtResult(error, {
          innerStage: 'overlay-render',
          proofObservationState,
          proofCallerStage: 'top-level',
          proofExceptionType: 'unknown',
        });
      }
      if (execution?.status === 'qc-failed') {
        return rejected('OUTPUT_V002_QC_FAILED', '/executions');
      }
      if (!validateExecutionResult(execution, item, variant)) {
        return rejected('OUTPUT_V002_RENDER_PROJECTION_MISMATCH', '/executions');
      }
      executions.push(execution);
    }
  }

  let prepublicationSnapshot;
  try {
    prepublicationSnapshot = await dependencies.captureInputs(job, {phase: 'prepublication'});
  } catch (error) {
    return caughtResult(error, {
      innerStage: 'input-read',
      proofObservationState,
      proofCallerStage: 'prepublication-input-reread',
      proofExceptionType: 'file-read',
    });
  }
  if (!same(startSnapshot.bindings, prepublicationSnapshot.bindings)) {
    return rejected('OUTPUT_V002_RENDER_PROJECTION_MISMATCH', '/inputBindings');
  }

  const reviewInput = buildReviewInput({job, fixtures: fixtureResult.fixtures, executions});
  if (!validatePresentationAV002ReviewInputV001(reviewInput)) {
    return rejected('OUTPUT_V002_RENDER_PROJECTION_MISMATCH', '/reviewInput');
  }
  const runRecord = {
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_RUN_SCHEMA_V001,
    jobId: job.jobId,
    createdAt: job.createdAt,
    inputBindings: structuredClone(job.inputBindings),
    sourceMedia: structuredClone(job.sourceMedia),
    verticalDiagnosticGuarantee: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
    executionCount: executions.length,
    outputs: executions.map(entry => ({
      proofItemId: entry.proofItemId,
      candidateId: entry.candidateId,
      variant: entry.variant,
      baseMediaBinding: entry.baseMedia.mediaBinding,
      renderedMediaBinding: entry.renderedMedia.mediaBinding,
      qcBinding: entry.qc.binding,
    })),
  };
  try {
    const publication = await dependencies.publishRun({
      job,
      fixtureResult,
      executions,
      reviewInput,
      runRecord,
    });
    if (!exactKeys(publication, ['status', 'outputDirectory'])
      || publication.status !== 'published'
      || publication.outputDirectory !== job.outputDirectory) {
      return rejected('OUTPUT_V002_PUBLICATION_FAILED', '/outputDirectory');
    }
  } catch (error) {
    return caughtResult(error, {
      innerStage: 'publication',
      rejectedCode: 'OUTPUT_V002_PUBLICATION_FAILED',
      rejectedPath: '/outputDirectory',
      proofObservationState,
      proofCallerStage: 'publication',
      proofExceptionType: 'publication',
    });
  }
  return Object.freeze({
    exitCode: 0,
    status: 'passed',
    violations: Object.freeze([]),
    executionCount: executions.length,
    reviewInput,
    runRecord,
  });
}

export const sha256PresentationAV002Layer1V3ProofBytesV001 = bytes =>
  createHash('sha256').update(bytes).digest('hex');

export async function hashPresentationAV002ResolvedStableFileV001({
  logicalPath,
  hashResolvedPath,
}) {
  if (typeof logicalPath !== 'string' || logicalPath.length === 0
    || typeof hashResolvedPath !== 'function') {
    throw new TypeError('invalid resolved stable file read input');
  }
  const resolvedBeforeRead = await realpath(logicalPath);
  const fileSha256 = await hashResolvedPath(resolvedBeforeRead);
  const resolvedAfterRead = await realpath(logicalPath);
  if (resolvedBeforeRead !== resolvedAfterRead) {
    throw new Error('resolved stable file target changed during read');
  }
  return fileSha256;
}

const HORIZONTAL_REGISTRY_DIRECTORY_V001 =
  'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001';
const HORIZONTAL_RENDERER_TRUST_PATH_V001 =
  'evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json';
const FORMAL_RUNTIME_PROFILE_REPORT_PATH_V001 =
  'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/'
  + 'preset-finalization-report.json';
const PRESENTATION_LAYOUT_INSPECTOR_PATH_V001 =
  'evals/clip_composition/inspect_presentation_render_layout_v001.ts';
const PROOF_ARTIFACT_NAMES_V001 = Object.freeze({
  normalizedTranscript: 'source-atom-transcript-v001.json',
  normalizedHumanApproval: 'human-approval-v001.json',
  runRecord: 'proof-run-v001.json',
  reviewInput: 'review-input-v001.json',
  reviewHtml: 'review.html',
});

const workspacePath = (workspaceRoot, relativePath) => {
  if (!WORKSPACE_PATH.test(relativePath)) throw Object.assign(new Error('unsafe path'), {
    code: 'EACCES',
  });
  const absolute = path.resolve(workspaceRoot, relativePath);
  if (!absolute.startsWith(`${path.resolve(workspaceRoot)}${path.sep}`)) {
    throw Object.assign(new Error('unsafe path'), {code: 'EACCES'});
  }
  return absolute;
};

const readStableBytes = async absolutePath => {
  const before = await stat(absolutePath, {bigint: true});
  const bytes = await readFile(absolutePath);
  const after = await stat(absolutePath, {bigint: true});
  if (
    !before.isFile()
    || !after.isFile()
    || before.dev !== after.dev
    || before.ino !== after.ino
    || before.size !== after.size
    || before.mtimeNs !== after.mtimeNs
  ) {
    const error = new Error('file changed during read');
    Object.defineProperty(error, 'presentationFatalProcessEvidence', {
      value: {innerStage: 'input-read', innerCode: 'FILE_CHANGED_DURING_READ'},
    });
    throw error;
  }
  return bytes;
};

const formalArtifact = ({schemaVersion, relativePath, value}) => {
  const bytes = serializePresentationAFormalJsonV002(value);
  return Object.freeze({
    bytes,
    binding: Object.freeze({
      schemaVersion,
      path: relativePath,
      fileSha256: sha256PresentationAV002Layer1V3BytesV001(bytes),
      canonicalSha256: canonicalSha256PresentationAV002Layer1V3JsonV001(value),
    }),
  });
};

const artifactBindingFromBytes = ({schemaVersion, relativePath, bytes, value}) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: sha256PresentationAV002Layer1V3BytesV001(bytes),
  canonicalSha256: canonicalSha256PresentationAV002Layer1V3JsonV001(value),
});

const bindingSchemaOf = value => value.schemaVersion ?? value.registryVersion;

const implementationSubset = (job, required) => {
  const byRole = new Map(job.implementationBindings.map(binding => [binding.role, binding]));
  return required.map(item => {
    const binding = byRole.get(item.role);
    if (!binding || binding.path !== item.path) {
      throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/implementationBindings');
    }
    return structuredClone(binding);
  });
};

const safeLeaf = value => value.replace(/[^A-Za-z0-9._-]/gu, '-');

const buildTimelineV002 = ({candidateId, fixture, sequence, mappings, baseMediaBinding,
  sourceInspection}) => ({
  schemaVersion: 'presentation-base-media-timeline-v002',
  timelineId: `${safeLeaf(candidateId)}-a-v002-proof-timeline-v001`,
  sourceProvenance: 'a-v002-layer1-v3-human-approved-proof-v001',
  sourceRef: fixture.proofInput.sourceMedia.sourceRef,
  sourceFrameClock: {
    inputFrameRate: `${sourceInspection.fps}/1`,
    logicalFrameRate: '30/1',
    extractionRuleId: sourceInspection.fps === 60
      ? 'source-frame-60fps-global-even-v001'
      : 'source-frame-30fps-identity-v001',
    decodedFrameCount: sourceInspection.decodedFrameCount,
  },
  baseMedia: {
    artifactId: `${safeLeaf(candidateId)}-a-v002-proof-base-media-v001`,
    path: 'base-media.mp4',
    fileSha256: baseMediaBinding.fileSha256,
    frameRate: '30/1',
    expectedFrameCount: mappings.at(-1).outputEndFrame,
  },
  segments: mappings.map(({audioSamples: _audioSamples, ...mapping}, index) => ({
    ...mapping,
    segmentId: sequence.segments[index].segmentId,
  })),
});

const readJsonArtifact = async (workspaceRoot, relativePath) => {
  const bytes = await readStableBytes(workspacePath(workspaceRoot, relativePath));
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch {
    throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/inputs');
  }
  return {relativePath, bytes, value};
};

const verifyJsonBinding = async (workspaceRoot, binding) => {
  const artifact = await readJsonArtifact(workspaceRoot, binding.path);
  if (
    sha256PresentationAV002Layer1V3BytesV001(artifact.bytes) !== binding.fileSha256
    || canonicalSha256PresentationAV002Layer1V3JsonV001(artifact.value)
      !== binding.canonicalSha256
  ) throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/inputBindings');
  return artifact;
};

const verifyFormalJsonBinding = async (workspaceRoot, binding) => {
  const artifact = await verifyJsonBinding(workspaceRoot, binding);
  if (!Buffer.from(artifact.bytes).equals(serializePresentationAFormalJsonV002(artifact.value))) {
    throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/inputBindings');
  }
  return artifact;
};

const writeNoReplace = async (absolutePath, bytes) => {
  await mkdir(path.dirname(absolutePath), {recursive: true});
  await writeFile(absolutePath, bytes, {flag: 'wx'});
};

const requirePassedFormalRunner = (execution, pointer) => {
  if (execution?.exitCode === 2 || execution?.result?.status === 'fatal') {
    const error = new Error('formal child runner failed');
    Object.defineProperty(error, 'presentationFatalProcessEvidence', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: execution?.result?.fatalObservation
        ?? {innerStage: 'unknown', innerCode: 'UNCLASSIFIED'},
    });
    throw error;
  }
  if (execution?.exitCode !== 0
    || execution?.result?.status !== 'passed'
    || !validatePresentationAV002Layer1V3JsonBindingV001(execution.result.outputBinding)) {
    throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', pointer);
  }
  return execution.result.outputBinding;
};

const proofScopedId = (jobId, candidateId, suffix) => {
  const digest = sha256PresentationAV002Layer1V3ProofBytesV001(
    Buffer.from(`${jobId}\0${candidateId}`, 'utf8'),
  ).slice(0, 24);
  return `a-v002-proof-${digest}-${suffix}`;
};

/**
 * Formal proof runner's production dependencies.  These functions bind existing
 * ZEVG, base-media, ZEVO planner, renderer and QC exports; they do not duplicate
 * their calculations.
 */
export async function createPresentationAV002Layer1V3ProofDefaultDependenciesV001({
  job,
  jobPath,
  workspaceRoot = path.resolve(path.dirname(__filename), '../..'),
  proofObservationState = null,
  moduleLoader = async ({href}) => import(href),
} = {}) {
  if (!validatePresentationAV002Layer1V3ProofJobV001(job)
    || !WORKSPACE_PATH.test(jobPath)) throw new TypeError('formal proof dependency input is invalid');
  const implementationByRole = new Map(
    job.implementationBindings.map(binding => [binding.role, binding]),
  );
  const loadBoundModule = async ({role, href}) => observeProofOperationV001({
    callerStage: 'dependency-initialization',
    exceptionType: 'module-load',
    targetFile: role === null
      ? null
      : proofTargetFromBindingV001(implementationByRole.get(role)),
    operation: () => moduleLoader({role, href}),
  });
  const existingCore = await loadPresentationAV002Layer1V3ProofExistingCoreExportsV001({
    loadModule: loadBoundModule,
  });
  const moduleHref = fileName => pathToFileURL(path.resolve(path.dirname(__filename), fileName)).href;
  const [timelineIo, verticalRenderer, rendererQcModule, sourceRunnerModule,
    meaningRunnerModule] = await Promise.all([
    loadBoundModule({
      role: null,
      href: moduleHref('presentation_timeline_composition_decision_v001.mjs'),
    }),
    loadBoundModule({
      role: 'vertical-renderer',
      href: moduleHref('render_presentation_vertical_review_v001.ts'),
    }),
    loadBoundModule({
      role: 'renderer-qc',
      href: moduleHref('presentation_renderer_qc_v002.mjs'),
    }),
    loadBoundModule({
      role: 'source-sequence-runner',
      href: moduleHref('run_presentation_a_source_sequence_job_v002.mjs'),
    }),
    loadBoundModule({
      role: 'meaning-package-runner',
      href: moduleHref('run_presentation_a_meaning_information_package_job_v002.mjs'),
    }),
  ]);
  const state = {
    outputClaimed: false,
    claimIdentity: null,
    proofArtifacts: new Map(),
    sourceInspection: null,
    fixtures: null,
    candidates: new Map(),
    rendererClaims: [],
    verticalWorkDirectories: [],
  };
  const finalRoot = workspacePath(workspaceRoot, job.outputDirectory);
  const finalPath = (...segments) => path.posix.join(job.outputDirectory, ...segments);
  const stagedPath = (...segments) => path.join(finalRoot, ...segments);
  const writeProofArtifact = async (absolutePath, bytes) => {
    await writeNoReplace(absolutePath, bytes);
    state.proofArtifacts.set(
      absolutePath,
      sha256PresentationAV002Layer1V3BytesV001(bytes),
    );
  };
  const copyProofArtifact = async (sourcePath, absolutePath) => {
    await mkdir(path.dirname(absolutePath), {recursive: true});
    await copyFile(sourcePath, absolutePath, 0x1);
    state.proofArtifacts.set(
      absolutePath,
      await timelineIo.hashAbsoluteStableStreaming(absolutePath),
    );
  };
  const registerVerifiedFormalChildArtifact = (binding, artifact) => {
    state.proofArtifacts.set(
      workspacePath(workspaceRoot, binding.path),
      sha256PresentationAV002Layer1V3BytesV001(artifact.bytes),
    );
  };

  const observeInputRead = ({phase, step, targetFile = null, exceptionType = 'file-read',
    operation}) => observeProofOperationV001({
    callerStage: phase === 'start'
      ? 'start-input-reread'
      : 'prepublication-input-reread',
    step,
    exceptionType,
    targetFile,
    operation,
  });

  const loadHorizontalSupport = async phase => {
    const paths = {
      trustedRegistryBindings: `${HORIZONTAL_REGISTRY_DIRECTORY_V001}/trusted-registry-bindings.json`,
      presetRegistry: `${HORIZONTAL_REGISTRY_DIRECTORY_V001}/preset-registry.json`,
      presetValidationIndex: `${HORIZONTAL_REGISTRY_DIRECTORY_V001}/preset-validation-index.json`,
      materialValidationIndex: `${HORIZONTAL_REGISTRY_DIRECTORY_V001}/material-validation-index.json`,
      rendererTrust: HORIZONTAL_RENDERER_TRUST_PATH_V001,
      runtimeProfileReport: FORMAL_RUNTIME_PROFILE_REPORT_PATH_V001,
    };
    const entries = await Promise.all(Object.entries(paths).map(async ([key, relativePath]) => [
      key,
      await observeInputRead({
        phase,
        step: 'upstream-json',
        operation: () => readJsonArtifact(workspaceRoot, relativePath),
      }),
    ]));
    return Object.fromEntries(entries);
  };

  const captureInputs = async (_formalJob, {phase}) => {
    if (phase === 'start') {
      try {
        await stat(finalRoot);
        throw Object.assign(new Error('proof output exists'), {code: 'EEXIST'});
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    } else if (phase === 'prepublication') {
      const rootStatus = await stat(finalRoot);
      if (!state.outputClaimed
        || !rootStatus.isDirectory()
        || state.claimIdentity === null
        || rootStatus.dev !== state.claimIdentity.dev
        || rootStatus.ino !== state.claimIdentity.ino) {
        throw proofRejectedError('OUTPUT_V002_PUBLICATION_FAILED', '/outputDirectory');
      }
      await rereadPresentationAV002Layer1V3ProofArtifactsV001(state.proofArtifacts);
      for (const name of [
        PROOF_ARTIFACT_NAMES_V001.runRecord,
        PROOF_ARTIFACT_NAMES_V001.reviewInput,
        PROOF_ARTIFACT_NAMES_V001.reviewHtml,
      ]) {
        try {
          await stat(stagedPath(name));
          throw proofRejectedError('OUTPUT_V002_PUBLICATION_FAILED', '/outputDirectory');
        } catch (error) {
          if (error?.proofRejected === true || error?.code !== 'ENOENT') throw error;
        }
      }
    }
    const [jobArtifact, legacyPackage, humanResult, sourceIdentity, sourceTranscript,
      horizontalPresetRegistry, verticalPresetRegistry, horizontalSupport] = await Promise.all([
      observeInputRead({
        phase,
        step: 'job',
        targetFile: proofObservationState?.jobTarget ?? null,
        operation: () => readJsonArtifact(workspaceRoot, jobPath),
      }),
      observeInputRead({
        phase,
        step: 'upstream-json',
        targetFile: proofTargetFromBindingV001(job.inputBindings.legacyPackage),
        operation: () => verifyJsonBinding(workspaceRoot, job.inputBindings.legacyPackage),
      }),
      observeInputRead({
        phase,
        step: 'upstream-json',
        targetFile: proofTargetFromBindingV001(job.inputBindings.humanResult),
        operation: () => verifyJsonBinding(workspaceRoot, job.inputBindings.humanResult),
      }),
      observeInputRead({
        phase,
        step: 'upstream-json',
        targetFile: proofTargetFromBindingV001(job.inputBindings.sourceIdentity),
        operation: () => verifyJsonBinding(workspaceRoot, job.inputBindings.sourceIdentity),
      }),
      observeInputRead({
        phase,
        step: 'upstream-json',
        targetFile: proofTargetFromBindingV001(job.inputBindings.sourceTranscriptByte),
        operation: () => readJsonArtifact(
          workspaceRoot,
          job.inputBindings.sourceTranscriptByte.path,
        ),
      }),
      observeInputRead({
        phase,
        step: 'upstream-json',
        targetFile: proofTargetFromBindingV001(job.styleBindings.horizontalPresetRegistry),
        operation: () => verifyJsonBinding(
          workspaceRoot,
          job.styleBindings.horizontalPresetRegistry,
        ),
      }),
      observeInputRead({
        phase,
        step: 'upstream-json',
        targetFile: proofTargetFromBindingV001(job.styleBindings.verticalPresetRegistry),
        operation: () => verifyJsonBinding(
          workspaceRoot,
          job.styleBindings.verticalPresetRegistry,
        ),
      }),
      loadHorizontalSupport(phase),
    ]);
    if (!same(jobArtifact.value, job)
      || !Buffer.from(jobArtifact.bytes).equals(serializePresentationAFormalJsonV002(job))) {
      throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/job');
    }
    if (sha256PresentationAV002Layer1V3BytesV001(sourceTranscript.bytes)
      !== job.inputBindings.sourceTranscriptByte.fileSha256) {
      throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/inputBindings');
    }
    const sourceMediaSha = await observeInputRead({
      phase,
      step: 'source-media',
      targetFile: proofTargetFromBindingV001(job.sourceMedia),
      operation: () => timelineIo.hashAbsoluteStableStreaming(
        workspacePath(workspaceRoot, job.sourceMedia.path),
      ),
    });
    if (sourceMediaSha !== job.sourceMedia.fileSha256) {
      throw proofRejectedError('OUTPUT_V002_BASE_MEDIA_INVALID', '/sourceMedia');
    }
    const implementationObservations = [];
    for (const binding of job.implementationBindings) {
      const actual = await observeInputRead({
        phase,
        step: 'implementation-file',
        targetFile: proofTargetFromBindingV001(binding),
        operation: () => timelineIo.hashAbsoluteStableStreaming(
          workspacePath(workspaceRoot, binding.path),
        ),
      });
      if (actual !== binding.fileSha256) {
        throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/implementationBindings');
      }
      implementationObservations.push({path: binding.path, fileSha256: actual, role: binding.role});
    }
    const runtimeProfile = horizontalSupport.runtimeProfileReport.value?.runtimeProfile;
    const runtimeRoles = [
      'node', 'tsx', 'remotion', 'browser', 'ffmpeg', 'ffprobe', 'imageMagick',
    ];
    if (!isObject(runtimeProfile)
      || !exactKeys(runtimeProfile, runtimeRoles)
      || runtimeRoles.some(role => (
        !isObject(runtimeProfile[role])
        || typeof runtimeProfile[role].path !== 'string'
        || !SHA256.test(runtimeProfile[role].fileSha256)
      ))) throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/runtimeProfile');
    const runtimeObservations = [];
    for (const role of runtimeRoles) {
      const runtimeBinding = runtimeProfile[role];
      const actual = await observeInputRead({
        phase,
        step: 'runtime-binary',
        targetFile: proofTargetFromBindingV001(runtimeBinding),
        operation: () => hashPresentationAV002ResolvedStableFileV001({
          logicalPath: runtimeBinding.path,
          hashResolvedPath: timelineIo.hashAbsoluteStableStreaming,
        }),
      });
      if (actual !== runtimeProfile[role].fileSha256) {
        throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/runtimeProfile');
      }
      runtimeObservations.push({role, path: runtimeProfile[role].path, fileSha256: actual});
    }
    const baseMediaToolDiagnostics = await observeInputRead({
      phase,
      step: 'tool-inspection',
      exceptionType: 'tool-inspection',
      operation: () => existingCore.inspectToolBinaries(),
    });
    for (const role of ['node', 'ffmpeg', 'ffprobe']) {
      const expectedRealPath = await observeInputRead({
        phase,
        step: 'tool-inspection',
        exceptionType: 'tool-inspection',
        targetFile: proofTargetFromBindingV001(runtimeProfile[role]),
        operation: () => realpath(runtimeProfile[role].path),
      });
      if (baseMediaToolDiagnostics[role]?.resolvedPath !== expectedRealPath
        || baseMediaToolDiagnostics[role]?.fileSha256 !== runtimeProfile[role].fileSha256) {
        throw proofRejectedError('OUTPUT_V002_BASE_MEDIA_INVALID', '/runtimeProfile');
      }
    }
    const supportBindings = Object.fromEntries(Object.entries(horizontalSupport).map(
      ([key, artifact]) => [key, {
        path: artifact.relativePath,
        fileSha256: sha256PresentationAV002Layer1V3BytesV001(artifact.bytes),
      }],
    ));
    return {
      bindings: {
        job: {path: jobPath, fileSha256: sha256PresentationAV002Layer1V3BytesV001(jobArtifact.bytes)},
        sourceMedia: {path: job.sourceMedia.path, fileSha256: sourceMediaSha},
        inputBindings: structuredClone(job.inputBindings),
        styleBindings: structuredClone(job.styleBindings),
        implementationBindings: implementationObservations,
        runtimeProfile: runtimeObservations,
        baseMediaToolResolution: structuredClone(baseMediaToolDiagnostics),
        horizontalStyleSupport: supportBindings,
      },
      values: {
        legacyPackage: legacyPackage.value,
        humanResult: humanResult.value,
        sourceIdentity: sourceIdentity.value,
        sourceTranscript: sourceTranscript.value,
        sourceTranscriptBytes: sourceTranscript.bytes,
        horizontalPresetRegistry: horizontalPresetRegistry.value,
        verticalPresetRegistry: verticalPresetRegistry.value,
        runtimeProfile: structuredClone(runtimeProfile),
        horizontalSupport,
      },
    };
  };

  const buildFixtures = async snapshot => {
    await mkdir(path.dirname(finalRoot), {recursive: true});
    try {
      await mkdir(finalRoot);
      state.outputClaimed = true;
      const claimed = await stat(finalRoot);
      state.claimIdentity = {dev: claimed.dev, ino: claimed.ino};
    } catch (error) {
      if (error?.code === 'EEXIST') {
        throw proofRejectedError('OUTPUT_V002_PUBLICATION_FAILED', '/outputDirectory');
      }
      throw error;
    }
    const fixtures = buildPresentationAV002Layer1V3FixturesV001({
      legacyPackage: snapshot.values.legacyPackage,
      humanResult: snapshot.values.humanResult,
      sourceIdentity: snapshot.values.sourceIdentity,
      sourceAtomTranscript: snapshot.values.sourceTranscript,
      sourceAtomTranscriptBytes: snapshot.values.sourceTranscriptBytes,
      normalizedTranscriptPath: finalPath(PROOF_ARTIFACT_NAMES_V001.normalizedTranscript),
      normalizedHumanApprovalPath: finalPath(PROOF_ARTIFACT_NAMES_V001.normalizedHumanApproval),
      bindings: {
        legacyPackage: job.inputBindings.legacyPackage,
        humanResult: job.inputBindings.humanResult,
        sourceIdentity: job.inputBindings.sourceIdentity,
        sourceTranscriptByteBinding: job.inputBindings.sourceTranscriptByte,
      },
    });
    await writeProofArtifact(stagedPath(PROOF_ARTIFACT_NAMES_V001.normalizedTranscript),
      fixtures.normalizedTranscriptBytes);
    await writeProofArtifact(stagedPath(PROOF_ARTIFACT_NAMES_V001.normalizedHumanApproval),
      fixtures.normalizedHumanApprovalBytes);
    state.fixtures = fixtures;
    state.startValues = snapshot.values;
    return fixtures;
  };

  const buildCandidate = async item => {
    const leaf = safeLeaf(item.proofInput.proofInputId);
    const directory = finalPath(leaf);
    const parentArtifact = formalArtifact({
      schemaVersion: item.proofInput.schemaVersion,
      relativePath: `${directory}/proof-input-v001.json`,
      value: item.proofInput,
    });
    await writeProofArtifact(stagedPath(leaf, 'proof-input-v001.json'), parentArtifact.bytes);

    const sequenceId = proofScopedId(job.jobId, item.candidateId, 'sequence-v001');
    const sourceJob = {
      schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
      jobId: `${sequenceId}-job`,
      sequenceId,
      parentSemanticInputBinding: parentArtifact.binding,
      sourceMedia: {
        sourceMediaId: item.proofInput.sourceMedia.sourceMediaId,
        sourceRef: item.proofInput.sourceMedia.sourceRef,
        mediaBinding: item.proofInput.sourceMedia.mediaBinding,
        sourceAtomBinding: item.proofInput.sourceMedia.sourceAtomTranscriptBinding,
      },
      outerRange: structuredClone(item.proofInput.outerRange),
      removalDecisions: [structuredClone(item.removalDecision)],
      outputDirectory: `${PRESENTATION_A_SOURCE_SEQUENCE_OUTPUT_ROOT_V002}/${sequenceId}`,
      implementationBindings: implementationSubset(
        job,
        PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002,
      ),
    };
    const sourceJobArtifact = formalArtifact({
      schemaVersion: sourceJob.schemaVersion,
      relativePath: `${directory}/source-sequence-job-v002.json`,
      value: sourceJob,
    });
    await writeProofArtifact(stagedPath(leaf, 'source-sequence-job-v002.json'), sourceJobArtifact.bytes);
    const sourceExecution = await sourceRunnerModule.runPresentationASourceSequenceJobV002({
      workspaceRoot,
      jobPath: sourceJobArtifact.binding.path,
    });
    const sequenceBinding = requirePassedFormalRunner(sourceExecution, '/sourceSequence');
    if (sequenceBinding.path
      !== `${sourceJob.outputDirectory}/${PRESENTATION_A_SOURCE_SEQUENCE_FILE_NAME_V002}`) {
      throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/sourceSequence');
    }
    const sequenceArtifact = await verifyFormalJsonBinding(workspaceRoot, sequenceBinding);
    registerVerifiedFormalChildArtifact(sequenceBinding, sequenceArtifact);

    const packageId = proofScopedId(job.jobId, item.candidateId, 'meaning-v001');
    const meaningJob = {
      schemaVersion: PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
      jobId: `${packageId}-job`,
      packageId,
      parentSemanticInputBinding: parentArtifact.binding,
      adoptedSourceSequenceBinding: structuredClone(sequenceBinding),
      title: {text: '', inputMode: 'none'},
      outputDirectory: `${PRESENTATION_A_MEANING_INFORMATION_OUTPUT_ROOT_V002}/${packageId}`,
      implementationBindings: implementationSubset(
        job,
        PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002,
      ),
    };
    const meaningJobArtifact = formalArtifact({
      schemaVersion: meaningJob.schemaVersion,
      relativePath: `${directory}/meaning-package-job-v002.json`,
      value: meaningJob,
    });
    await writeProofArtifact(stagedPath(leaf, 'meaning-package-job-v002.json'), meaningJobArtifact.bytes);
    const meaningExecution = await meaningRunnerModule
      .runPresentationAMeaningInformationPackageJobV002({
      workspaceRoot,
      jobPath: meaningJobArtifact.binding.path,
    });
    const meaningBinding = requirePassedFormalRunner(meaningExecution, '/meaningPackage');
    if (meaningBinding.path
      !== `${meaningJob.outputDirectory}/${PRESENTATION_A_MEANING_INFORMATION_FILE_NAME_V002}`) {
      throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/meaningPackage');
    }
    const meaningArtifact = await verifyFormalJsonBinding(workspaceRoot, meaningBinding);
    registerVerifiedFormalChildArtifact(meaningBinding, meaningArtifact);

    if (state.sourceInspection === null) {
      state.sourceInspection = await existingCore.inspectSourceMedia(
        workspacePath(workspaceRoot, job.sourceMedia.path),
      );
    }
    const plan = existingCore.validateSegmentPlan(
      sequenceArtifact.value.segments.map(segment => ({
        sourceStartMs: segment.sourceStartMs,
        sourceEndMs: segment.sourceEndMs,
      })),
      {
        fps: state.sourceInspection.fps,
        decodedFrameCount: state.sourceInspection.decodedFrameCount,
        logicalFrameCount: state.sourceInspection.logicalFrameCount,
      },
      state.sourceInspection.audioClock,
    );
    const basePlanOwnership = classifyPresentationOutputDownstreamResultV002({
      stage: 'base-media',
      result: plan,
    });
    if (basePlanOwnership.status !== 'passed') {
      if (basePlanOwnership.status === 'fatal') {
        throw new Error('base media segment plan failed fatally');
      }
      throw proofRejectedError(
        basePlanOwnership.violations[0].code,
        basePlanOwnership.violations[0].path,
      );
    }
    const workDirectory = await mkdtemp(path.join(tmpdir(), 'zev2-a-v002-proof-base-'));
    const videoPath = path.join(workDirectory, 'video-only.mp4');
    const basePath = path.join(workDirectory, 'base-media.mp4');
    await existingCore.buildVideo(
      workspacePath(workspaceRoot, job.sourceMedia.path),
      videoPath,
      state.sourceInspection.fps,
      plan.mappings,
    );
    const audio = await existingCore.buildAudio(
      workspacePath(workspaceRoot, job.sourceMedia.path),
      workDirectory,
      state.sourceInspection.audioClock,
      plan.mappings,
    );
    await existingCore.muxAudioVideo(
      videoPath,
      basePath,
      state.sourceInspection.audioClock,
      audio,
    );
    const expectedFrameCount = plan.mappings.at(-1).outputEndFrame;
    const baseOutput = await existingCore.inspectBaseMediaOutput(
      basePath,
      expectedFrameCount,
      state.sourceInspection.audioClock,
      audio,
    );
    const baseMediaSha = await hashPresentationAV002ResolvedStableFileV001({
      logicalPath: basePath,
      hashResolvedPath: timelineIo.hashAbsoluteStableStreaming,
    });
    const baseMediaBinding = {
      path: `${directory}/base-media.mp4`,
      fileSha256: baseMediaSha,
    };
    const timeline = buildTimelineV002({
      candidateId: item.candidateId,
      fixture: item,
      sequence: sequenceArtifact.value,
      mappings: plan.mappings,
      baseMediaBinding,
      sourceInspection: state.sourceInspection,
    });
    const timelineArtifact = formalArtifact({
      schemaVersion: timeline.schemaVersion,
      relativePath: `${directory}/base-media-timeline-v002.json`,
      value: timeline,
    });
    const generationManifest = {
      schemaVersion: 'presentation-output-base-media-generation-manifest-v001',
      candidateId: item.candidateId,
      baseMedia: baseMediaBinding,
      timeline: timelineArtifact.binding,
    };
    const manifestArtifact = formalArtifact({
      schemaVersion: generationManifest.schemaVersion,
      relativePath: `${directory}/base-media-generation-manifest-v001.json`,
      value: generationManifest,
    });
    const receipt = {
      schemaVersion: 'presentation-output-base-media-validation-receipt-v001',
      candidateId: item.candidateId,
      status: 'passed',
      baseMedia: baseMediaBinding,
      expectedFrameCount,
    };
    const receiptArtifact = formalArtifact({
      schemaVersion: receipt.schemaVersion,
      relativePath: `${directory}/base-media-validation-receipt-v001.json`,
      value: receipt,
    });
    const writes = [
      ['base-media-timeline-v002.json', timelineArtifact.bytes],
      ['base-media-generation-manifest-v001.json', manifestArtifact.bytes],
      ['base-media-validation-receipt-v001.json', receiptArtifact.bytes],
    ];
    for (const [name, bytes] of writes) await writeProofArtifact(stagedPath(leaf, name), bytes);
    await copyProofArtifact(basePath, stagedPath(leaf, 'base-media.mp4'));
    const inspectedMedia = await observeProofVariantStageV002({
      state: proofObservationState,
      stage: PROOF_OBSERVATION_BASE_MEDIA_STAGE_V002,
      exceptionType: 'tool-inspection',
      operation: () => rendererQcModule.inspectRenderedMediaWithToolsV001(basePath, {
        ffmpegPath: state.startValues.runtimeProfile.ffmpeg.path,
        ffprobePath: state.startValues.runtimeProfile.ffprobe.path,
      }),
    });
    if (inspectedMedia.video.frameCount !== expectedFrameCount) {
      throw proofRejectedError('OUTPUT_V002_BASE_MEDIA_INVALID', '/baseMedia/frameCount');
    }
    const candidate = {
      leaf,
      directory,
      parentArtifact,
      sequenceArtifact: {binding: structuredClone(sequenceBinding), ...sequenceArtifact},
      meaningArtifact: {binding: structuredClone(meaningBinding), ...meaningArtifact},
      meaningPackage: meaningArtifact.value,
      basePath,
      baseMediaBinding,
      baseMediaOutput: baseOutput,
      baseMediaInspection: {fileSha256: baseMediaSha, frameCount: expectedFrameCount,
        media: inspectedMedia},
      expectedFrameCount,
      audioSampleCount: audio.present ? audio.encodeSampleCount : 0,
      timeline,
      timelineArtifact,
      manifestArtifact,
      receiptArtifact,
      workDirectory,
    };
    state.candidates.set(item.candidateId, candidate);
    return candidate;
  };

  const resolveHorizontalStyle = async candidate => {
    const support = state.startValues.horizontalSupport;
    const artifactBinding = artifact => artifactBindingFromBytes({
      schemaVersion: bindingSchemaOf(artifact.value),
      relativePath: artifact.relativePath,
      bytes: artifact.bytes,
      value: artifact.value,
    });
    const result = await resolvePresentationOutputStyleV001({
      artifacts: {
        trustedRegistryBindings: support.trustedRegistryBindings.value,
        presetRegistry: support.presetRegistry.value,
        presetValidationIndex: support.presetValidationIndex.value,
        materialValidationIndex: support.materialValidationIndex.value,
        rendererTrust: support.rendererTrust.value,
      },
      baseMediaInput: {
        baseMedia: candidate.baseMediaBinding,
        timeline: candidate.timelineArtifact.binding,
        generationManifest: candidate.manifestArtifact.binding,
        validationReceipt: candidate.receiptArtifact.binding,
      },
      baseMediaInspection: null,
      styleInput: {
        format: 'normal-landscape',
        screenLayoutId: null,
        presetBinding: {
          trustedRegistryBindings: artifactBinding(support.trustedRegistryBindings),
          presetRegistry: artifactBinding(support.presetRegistry),
          presetValidationIndex: artifactBinding(support.presetValidationIndex),
          materialValidationIndex: artifactBinding(support.materialValidationIndex),
          rendererTrust: artifactBinding(support.rendererTrust),
          presetId: 'normal-landscape-readable-pop-v001',
        },
        captionLayoutPolicy: {
          maxLogicalWidthPerLine: 36,
          maxLinesPerDisplayPage: 2,
          characterWidthRule: PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
          pageBreakPolicy: 'split-at-source-atom-boundary-or-reject',
        },
        cropPolicy: {mode: 'identity'},
        sceneTransitionPolicy: {mode: 'straight-cut-only'},
        audioPolicy: {mode: 'preserve-source-only'},
        materials: [],
      },
    });
    if (result.status !== 'resolved') {
      throw proofRejectedError('OUTPUT_V002_LAYOUT_UNRESOLVED', '/horizontalStyle');
    }
    return result;
  };

  const executeVariant = async ({item, variant}) => {
    const candidate = state.candidates.get(item.candidateId) ?? await buildCandidate(item);
    const candidateOrdinal = Array.isArray(state.fixtures?.fixtures)
      ? state.fixtures.fixtures.indexOf(item) + 1
      : 0;
    if (![1, 2, 3].includes(candidateOrdinal)) {
      throw proofRejectedError('OUTPUT_V002_PLANNER_INPUT_INVALID', '/fixtures');
    }
    const vertical = variant === 'vertical-caption-diagnostic';
    const styleStage = vertical
      ? 'vertical-style-resolution'
      : 'horizontal-style-resolution';
    const style = await observeProofVariantStageV002({
      state: proofObservationState,
      stage: styleStage,
      targetFile: vertical
        ? proofTargetFromBindingV001(job.styleBindings.verticalPresetRegistry)
        : null,
      operation: () => vertical
        ? buildPresentationAV002VerticalCaptionDiagnosticStyleV001({
          presetRegistry: state.startValues.verticalPresetRegistry,
          presetRegistryBinding: {
            path: job.styleBindings.verticalPresetRegistry.path,
            fileSha256: job.styleBindings.verticalPresetRegistry.fileSha256,
          },
        })
        : resolveHorizontalStyle(candidate),
    });
    const styleResolution = vertical
      ? {resolvedStyle: style.resolvedStyle, layoutContext: style.layoutContext}
      : {resolvedStyle: style.resolvedStyle, layoutContext: style.layoutContext};
    const pageLinePlan = await observeProofVariantStageV002({
      state: proofObservationState,
      stage: 'page-line-plan',
      operation: () => buildPresentationOutputPageLinePlanV002({
        meaningPackage: candidate.meaningPackage,
        styleResolution,
        baseMediaTimeline: candidate.timeline,
        resourceObserver: createPresentationAV002Layer1V3PlannerResourceObserverV001({
          outputRoot: finalRoot,
          candidateOrdinal,
          variant,
          proofArtifacts: state.proofArtifacts,
        }),
      }),
    });
    if (pageLinePlan.status !== 'planned') {
      throw proofRejectedError('OUTPUT_V002_LAYOUT_UNRESOLVED', '/pageLinePlan');
    }
    const variantDirectory = `${candidate.directory}/${variant}`;
    const request = {
      requestId: `${candidate.leaf}-${variant}-request-v001`,
      meaningInformationPackage: candidate.meaningArtifact.binding,
      baseMediaInput: {
        baseMedia: candidate.baseMediaBinding,
        timeline: candidate.timelineArtifact.binding,
        generationManifest: candidate.manifestArtifact.binding,
        validationReceipt: candidate.receiptArtifact.binding,
      },
    };
    const requestArtifact = formalArtifact({
      schemaVersion: 'presentation-a-v002-proof-output-request-v001',
      relativePath: `${variantDirectory}/output-request-v001.json`,
      value: request,
    });
    const renderPlan = await observeProofVariantStageV002({
      state: proofObservationState,
      stage: 'render-plan',
      operation: () => buildPresentationOutputRenderPlanV002({
        request,
        outputRequestBinding: requestArtifact.binding,
        meaningPackage: candidate.meaningPackage,
        pageLinePlan,
        resolvedStyle: styleResolution.resolvedStyle,
      }),
    });
    if (renderPlan.status !== 'built') {
      throw proofRejectedError('OUTPUT_V002_RENDER_PLAN_INVALID', '/renderPlan');
    }
    const core = await observeProofVariantStageV002({
      state: proofObservationState,
      stage: 'common-render-plan',
      operation: () => buildPresentationOutputCommonCorePlanV002({
        renderPlan: renderPlan.plan,
        meaningPackage: candidate.meaningPackage,
        layoutContext: styleResolution.layoutContext,
      }),
    });
    if (core.status !== 'built') {
      throw proofRejectedError('OUTPUT_V002_RENDER_PROJECTION_MISMATCH', '/renderPlan');
    }
    const validatedLayoutInspection = vertical
      ? await verticalRenderer.inspectPresentationVerticalTextLayoutV001({
        plan: core.plan,
        presetRegistry: styleResolution.layoutContext.presetRegistry,
      })
      : null;
    if (vertical && validatedLayoutInspection.status !== 'passed') {
      throw proofRejectedError('OUTPUT_V002_LAYOUT_UNRESOLVED', '/verticalLayoutInspection');
    }
    let basePath = candidate.basePath;
    let baseInspection = candidate.baseMediaInspection;
    let verticalBase = null;
    let overlayAdapter;
    let evaluateQc;
    const mediaResult = await observeProofVariantStageV002({
      state: proofObservationState,
      stage: 'media-inspection',
      exceptionType: 'tool-inspection',
      operation: async () => {
        if (!vertical) return {basePath, baseInspection, verticalBase, overlayAdapter, evaluateQc};
        verticalBase = await createPresentationAV002VerticalDiagnosticBaseMediaV001({
          baseMediaPath: candidate.basePath,
          runtimeProfile: {
            ffmpeg: state.startValues.runtimeProfile.ffmpeg,
            ffprobe: state.startValues.runtimeProfile.ffprobe,
          },
          diagnosticStyle: style,
        });
        if (verticalBase.status !== 'passed') {
          throw proofRejectedError('OUTPUT_V002_BASE_MEDIA_INVALID', '/verticalBaseMedia');
        }
        basePath = verticalBase.outputPath;
        const baseSha = await hashPresentationAV002ResolvedStableFileV001({
          logicalPath: basePath,
          hashResolvedPath: timelineIo.hashAbsoluteStableStreaming,
        });
        const media = await rendererQcModule.inspectRenderedMediaWithToolsV001(basePath, {
          ffmpegPath: state.startValues.runtimeProfile.ffmpeg.path,
          ffprobePath: state.startValues.runtimeProfile.ffprobe.path,
        });
        if (media.video.frameCount !== candidate.expectedFrameCount) {
          throw proofRejectedError('OUTPUT_V002_BASE_MEDIA_INVALID', '/verticalBaseMedia/frameCount');
        }
        baseInspection = {fileSha256: baseSha, frameCount: candidate.expectedFrameCount, media};
        overlayAdapter = verticalRenderer.buildPresentationVerticalOverlayAdapterV001(
          style.layoutContext.presetRegistry,
          {
            nodePath: state.startValues.runtimeProfile.node.path,
            remotionCliPath: state.startValues.runtimeProfile.remotion.path,
            browserExecutablePath: state.startValues.runtimeProfile.browser.path,
          },
        );
        evaluateQc = verticalRenderer.evaluatePresentationVerticalReviewRendererQcV001;
        return {basePath, baseInspection, verticalBase, overlayAdapter, evaluateQc};
      },
    });
    ({basePath, baseInspection, verticalBase, overlayAdapter, evaluateQc} = mediaResult);
    const rendererRoot = `${PRESENTATION_A_V002_LAYER1_V3_PROOF_OUTPUT_ROOT_V001}/`
      + `.${job.jobId}-renderer-work/${candidate.leaf}/${variant}`;
    recordProofCheckpointV001(proofObservationState, 'renderer-work-acquisition-entered');
    let draw;
    try {
      draw = await existingCore.drawAndQc({
        outputDirectory: workspacePath(workspaceRoot, rendererRoot),
        plan: core.plan,
        presetRegistry: styleResolution.layoutContext.presetRegistry,
        baseMediaPath: basePath,
        baseMediaInspection: baseInspection,
        expectedFrameCount: candidate.expectedFrameCount,
        ...(vertical ? {overlayAdapter, evaluateQc, validatedLayoutInspection} : {}),
        toolPaths: {
          ffmpegPath: state.startValues.runtimeProfile.ffmpeg.path,
          ffprobePath: state.startValues.runtimeProfile.ffprobe.path,
          imageMagickPath: state.startValues.runtimeProfile.imageMagick.path,
          tsxPath: state.startValues.runtimeProfile.tsx.path,
          layoutInspectorPath: workspacePath(workspaceRoot, PRESENTATION_LAYOUT_INSPECTOR_PATH_V001),
        },
      });
    } catch (error) {
      throw attachProofFatalEvidenceV001(error, {
        callerStage: 'renderer-work-acquisition',
        step: null,
        exceptionType: 'unknown',
        targetFile: null,
        toolExitCode: null,
      });
    }
    recordProofRendererReturnV002({state: proofObservationState, draw, targetFile: null});
    const qcOwnership = classifyPresentationOutputDownstreamResultV002({
      stage: 'qc',
      result: draw.exitCode === 0 && draw.finalQc?.status === 'passed'
        ? {status: 'passed'}
        : {status: 'failed'},
    });
    if (qcOwnership.status !== 'passed') {
      return {status: 'qc-failed'};
    }
    state.rendererClaims.push({
      outputDirectory: draw.reservation.outputDirectory,
      lockDirectory: draw.reservation.lockDirectory,
      ownerFile: draw.reservation.ownerFile,
      ownerToken: draw.reservation.ownerToken,
      workDirectory: draw.workDirectory,
    });
    if (verticalBase?.workDirectory) {
      state.verticalWorkDirectories.push(verticalBase.workDirectory);
    }
    const videoRelative = `${variantDirectory}/video.mp4`;
    const qcRelative = `${variantDirectory}/renderer-qc-v001.json`;
    await copyProofArtifact(draw.workVideo, stagedPath(candidate.leaf, variant, 'video.mp4'));
    const qcBytes = serializePresentationAV002Layer1V3FormalJsonV001(draw.finalQc);
    await writeProofArtifact(stagedPath(candidate.leaf, variant, 'renderer-qc-v001.json'), qcBytes);
    await writeProofArtifact(stagedPath(candidate.leaf, variant, 'output-request-v001.json'),
      requestArtifact.bytes);
    await writeProofArtifact(stagedPath(candidate.leaf, variant, 'render-plan-v002.json'),
      serializePresentationAV002Layer1V3FormalJsonV001(renderPlan.plan));
    const renderedSha = await timelineIo.hashAbsoluteStableStreaming(draw.workVideo);
    const qcSha = sha256PresentationAV002Layer1V3BytesV001(qcBytes);
    return {
      status: 'passed',
      proofItemId: item.proofInput.proofInputId,
      candidateId: item.candidateId,
      variant,
      baseMedia: {
        mediaBinding: candidate.baseMediaBinding,
        durationMs: Math.round(candidate.expectedFrameCount * 1000 / 30),
        frameCount: candidate.expectedFrameCount,
        audioSampleCount: candidate.audioSampleCount,
        segmentCount: candidate.timeline.segments.length,
      },
      renderedMedia: {
        label: variant,
        mediaBinding: {path: videoRelative, fileSha256: renderedSha},
        durationMs: Math.round(candidate.expectedFrameCount * 1000 / 30),
        frameCount: candidate.expectedFrameCount,
      },
      qc: {status: 'passed', binding: {path: qcRelative, fileSha256: qcSha}},
      commonCoreIdentity: 'executeValidatedPresentationDrawAndQcV001',
    };
  };

  const publishRun = async ({reviewInput, runRecord}) => {
    // The proof root was exclusively claimed before any formal child runner.
    // Re-read every staged artifact before removing scratch data; the run record
    // is written last and is the completion marker for this partial-root model.
    await rereadPresentationAV002Layer1V3ProofArtifactsV001(state.proofArtifacts);
    for (const claim of state.rendererClaims) {
      const owner = JSON.parse((await readStableBytes(claim.ownerFile)).toString('utf8'));
      if (owner.ownerToken !== claim.ownerToken
        || owner.processId !== process.pid
        || owner.outputDirectory !== claim.outputDirectory) {
        throw new Error('renderer reservation ownership changed before cleanup');
      }
      await rm(claim.workDirectory, {recursive: true, force: true});
      await rm(claim.lockDirectory, {recursive: true, force: true});
    }
    for (const workDirectory of state.verticalWorkDirectories) {
      await rm(workDirectory, {recursive: true, force: true});
    }
    for (const candidate of state.candidates.values()) {
      await rm(candidate.workDirectory, {recursive: true, force: true});
    }
    try {
      await writeProofArtifact(stagedPath(PROOF_ARTIFACT_NAMES_V001.reviewInput),
        serializePresentationAV002Layer1V3FormalJsonV001(reviewInput));
      await writeProofArtifact(stagedPath(PROOF_ARTIFACT_NAMES_V001.reviewHtml),
        buildPresentationAV002ReviewHtmlV001(reviewInput, {workspaceRoot}));
      await writeProofArtifact(stagedPath(PROOF_ARTIFACT_NAMES_V001.runRecord),
        serializePresentationAV002Layer1V3FormalJsonV001(runRecord));
    } catch (error) {
      if (error?.code === 'EEXIST') {
        const ownership = classifyPresentationOutputDownstreamResultV002({
          stage: 'publication', result: {status: 'conflict'},
        });
        throw proofRejectedError(
          ownership.violations[0].code,
          ownership.violations[0].path,
        );
      }
      throw error;
    }
    const ownership = classifyPresentationOutputDownstreamResultV002({
      stage: 'publication', result: {status: 'published'},
    });
    if (ownership.status !== 'passed') {
      throw proofRejectedError('OUTPUT_V002_PUBLICATION_FAILED', '/publication');
    }
    return {status: 'published', outputDirectory: job.outputDirectory};
  };

  return Object.freeze({captureInputs, buildFixtures, executeVariant, publishRun});
}

export async function runPresentationAV002Layer1V3ProofCliV001({
  argv = process.argv.slice(2),
  workspaceRoot = path.resolve(path.dirname(__filename), '../..'),
  dependencyFactory = createPresentationAV002Layer1V3ProofDefaultDependenciesV001,
} = {}) {
  const proofObservationState = createProofObservationStateV001();
  const finish = result => result.status === 'fatal'
    ? attachProofObservationV001(result, proofObservationState)
    : result;
  if (!Array.isArray(argv) || argv.length !== 1 || !WORKSPACE_PATH.test(argv[0])) {
    recordProofFailureV001(proofObservationState, {
      callerStage: 'argument-validation',
      exceptionType: 'argument-validation',
    });
    return finish(fatal({
      innerStage: 'runner-bootstrap',
      innerCode: 'CHILD_PROCESS_EXIT_NONZERO',
    }));
  }
  const jobPath = argv[0];
  let bytes;
  let job;
  try {
    bytes = await readStableBytes(workspacePath(workspaceRoot, jobPath));
  } catch (error) {
    recordProofFailureV001(proofObservationState, {
      callerStage: 'job-read',
      step: 'job',
      exceptionType: 'file-read',
      error,
    });
    return finish(fatal({innerStage: 'job-read', error}));
  }
  proofObservationState.jobTarget = Object.freeze({
    path: jobPath,
    fileSha256: sha256PresentationAV002Layer1V3ProofBytesV001(bytes),
  });
  try {
    job = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    recordProofFailureV001(proofObservationState, {
      callerStage: 'job-read',
      step: 'job',
      exceptionType: 'json-decode',
      targetFile: proofObservationState.jobTarget,
      error,
    });
    return finish(fatal({innerStage: 'job-read', error}));
  }
  if (!validatePresentationAV002Layer1V3ProofJobV001(job)
    || !Buffer.from(bytes).equals(serializePresentationAFormalJsonV002(job))) {
    return finish(rejected('OUTPUT_V002_PLANNER_INPUT_INVALID', '/job'));
  }
  let dependencies;
  recordProofCheckpointV001(
    proofObservationState,
    'dependency-initialization-entered',
  );
  try {
    dependencies = await dependencyFactory({
      job,
      jobPath,
      workspaceRoot,
      proofObservationState,
    });
  } catch (error) {
    return finish(caughtResult(error, {
      innerStage: 'runner-bootstrap',
      proofObservationState,
      proofCallerStage: 'dependency-initialization',
      proofExceptionType: 'module-load',
    }));
  }
  if (!validateDependencies(dependencies)) {
    recordProofFailureV001(proofObservationState, {
      callerStage: 'dependency-initialization',
      exceptionType: 'unknown',
    });
    return finish(fatal('dependency-resolution'));
  }
  recordProofCheckpointV001(
    proofObservationState,
    'dependency-initialization-completed',
  );
  try {
    const result = await executePresentationAV002Layer1V3ProofJobV001({
      job,
      dependencies,
      proofObservationState,
    });
    return finish(result);
  } catch (error) {
    recordProofFailureV001(proofObservationState, {
      callerStage: 'top-level',
      exceptionType: 'unknown',
      error,
    });
    return finish(fatal({innerStage: 'unknown', error}));
  }
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  runPresentationAV002Layer1V3ProofCliV001().then(result => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.exitCode;
  }).catch(() => {
    const proofObservationState = createProofObservationStateV001();
    recordProofFailureV001(proofObservationState, {
      callerStage: 'top-level',
      exceptionType: 'unknown',
    });
    const result = attachProofObservationV001(fatal(), proofObservationState);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 2;
  });
}
