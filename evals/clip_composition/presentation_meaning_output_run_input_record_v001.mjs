import {createHash} from 'node:crypto';

import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001,
  validatePresentationTimelineCompositionDecisionJobV001,
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION,
  validatePresentationBaseMediaAssemblyDecisionV001,
} from './presentation_base_media_build_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001,
  validatePresentationMeaningBoundarySourcePackageJobV001,
  validatePresentationMeaningBoundarySourcePackageV001,
} from './presentation_meaning_boundary_source_package_v001.mjs';
import {
  validatePresentationMeaningBoundaryB5JobV001,
  validatePresentationMeaningBoundaryB5ManifestV001,
  validatePresentationMeaningBoundaryB6JobV001,
  validatePresentationMeaningBoundaryB6ManifestV001,
  validatePresentationMeaningBoundaryProviderEnvelopeV001,
} from './run_presentation_meaning_boundary_b5_b6_v001.mjs';
import {
  validatePresentationMeaningBoundarySelectionV001,
  validatePresentationMeaningBoundaryValidationJobV001,
  validatePresentationMeaningBoundaryValidationReportV001,
} from './presentation_meaning_boundary_selection_v001.mjs';
import {
  validatePresentationMeaningInformationPackageAdmissionEnvelopeV001,
  validatePresentationMeaningInformationPackageJobV001,
  validatePresentationMeaningJsonBindingV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  validatePresentationOutputBaseMediaBuildJobV001,
  validatePresentationOutputBaseMediaGenerationManifestV001,
  validatePresentationOutputBaseMediaValidationReceiptV001,
} from './presentation_output_base_media_v001.mjs';
import {
  validatePresentationOutputFormalJobV001,
  validatePresentationOutputRequestV001,
} from './presentation_output_contract_v001.mjs';

export const PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001 =
  'presentation-meaning-output-run-input-record-v001';
export const PRESENTATION_MEANING_OUTPUT_RUN_INPUT_PUBLICATION_JOB_SCHEMA_V001 =
  'presentation-meaning-output-run-input-publication-job-v001';
export const PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V001 =
  'presentation-meaning-output-stage-admission-job-v001';
export const PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V001 =
  'presentation-meaning-output-stage-admission-receipt-v001';
export const PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V002 =
  'presentation-meaning-output-stage-admission-job-v002';
export const PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V002 =
  'presentation-meaning-output-stage-admission-receipt-v002';
export const PRESENTATION_MEANING_OUTPUT_RUN_INPUT_FAILURE_REPORT_SCHEMA_V001 =
  'presentation-meaning-output-run-input-failure-report-v001';

export const PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001 = Object.freeze([
  Object.freeze({ordinal: '01', stage: 'timeline-decision', upstreamRoles: Object.freeze([])}),
  Object.freeze({
    ordinal: '02', stage: 'b3-source-package',
    upstreamRoles: Object.freeze(['timeline-decision']),
  }),
  Object.freeze({
    ordinal: '03', stage: 'b5-token-measurement',
    upstreamRoles: Object.freeze(['source-package']),
  }),
  Object.freeze({
    ordinal: '04', stage: 'b6-generation',
    upstreamRoles: Object.freeze(['b5-manifest']),
  }),
  Object.freeze({
    ordinal: '05', stage: 'b1-validation',
    upstreamRoles: Object.freeze(['source-package', 'b6-manifest', 'provider-envelope']),
  }),
  Object.freeze({
    ordinal: '06', stage: 'meaning-package',
    upstreamRoles: Object.freeze([
      'timeline-decision', 'semantic-validation', 'semantic-selection',
    ]),
  }),
  Object.freeze({
    ordinal: '07', stage: 'base-media',
    upstreamRoles: Object.freeze(['meaning-package']),
  }),
  Object.freeze({
    ordinal: '08', stage: 'output-landscape',
    upstreamRoles: Object.freeze(['output-request', 'meaning-package', 'base-media']),
  }),
  Object.freeze({
    ordinal: '09', stage: 'crop-application',
    upstreamRoles: Object.freeze([
      'reviewed-crop-decision',
      'reviewed-crop-selection',
      'reviewed-base-media',
      'reviewed-timeline',
      'reviewed-generation-manifest',
      'reviewed-validation-report',
      'target-base-media',
      'target-timeline',
      'target-generation-manifest',
      'target-validation-receipt',
    ]),
  }),
  Object.freeze({
    ordinal: '10', stage: 'output-vertical',
    upstreamRoles: Object.freeze([
      'output-request', 'meaning-package', 'base-media', 'crop-application',
    ]),
  }),
]);

export const PRESENTATION_MEANING_OUTPUT_RUN_INPUT_VIOLATION_CODES_V001 = Object.freeze([
  'RUN_INPUT_PUBLICATION_JOB_INVALID',
  'RUN_INPUT_RECORD_INVALID',
  'RUN_INPUT_REFERENCE_MISMATCH',
  'RUN_INPUT_PUBLICATION_TARGET_INVALID',
  'STAGE_ADMISSION_JOB_INVALID',
  'STAGE_ADMISSION_RECORD_BINDING_MISMATCH',
  'STAGE_ADMISSION_TARGET_JOB_BINDING_MISMATCH',
  'STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH',
  'STAGE_ADMISSION_PROJECTION_MISMATCH',
  'RUN_INPUT_PUBLICATION_FAILED',
  'STAGE_ADMISSION_PUBLICATION_FAILED',
]);

const CORE_PATH = 'evals/clip_composition/presentation_meaning_output_run_input_record_v001.mjs';
const RUNNER_PATH = 'evals/clip_composition/run_presentation_meaning_output_run_input_record_v001.mjs';
const RECORD_ROOT = 'evals/clip_composition/outputs/presentation/meaning-output-run-input-records';
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SOURCE_REF = /^youtube:[A-Za-z0-9_-]{11}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const JSON_POINTER = /^(?:\/(?:[^~\/]|~0|~1)*)*$/u;
const SCREEN_LAYOUT_IDS = new Set(['speaker_only', 'screen_speaker', 'speaker_pair']);
const STAGE_BY_NAME = new Map(PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001
  .map(item => [item.stage, item]));

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && Object.keys(value).every((key, index) => key === String(index));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

const validJsonBinding = value => validatePresentationMeaningJsonBindingV001(value);
const validMediaBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256);
const validImplementationBinding = value => exactKeys(value, ['path', 'fileSha256', 'role'])
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && typeof value.role === 'string'
  && value.role.length > 0;
const expectedImplementationBindings = value => dense(value)
  && value.length === 2
  && value.every(validImplementationBinding)
  && value[0].role === 'run-input-record'
  && value[0].path === CORE_PATH
  && value[1].role === 'run-input-record-runner'
  && value[1].path === RUNNER_PATH;
const validExecutionPolicy = value => exactKeys(value, ['oneShot', 'allowOverwrite'])
  && value.oneShot === true
  && value.allowOverwrite === false;

const runInputRecordRoot = binding => {
  const suffix = '/run-input-record.json';
  return typeof binding?.path === 'string' && binding.path.endsWith(suffix)
    ? binding.path.slice(0, -suffix.length)
    : null;
};
const formatAttemptOrdinal = value => String(value).padStart(4, '0');
const stageAdmissionV002Root = (recordRoot, definition, attemptOrdinal) =>
  `${recordRoot}/admissions-v002/${definition.ordinal}-${definition.stage}`
    + `/attempt-${formatAttemptOrdinal(attemptOrdinal)}`;
const stageAdmissionV002ReceiptPath = (recordRoot, definition, attemptOrdinal) =>
  `${stageAdmissionV002Root(recordRoot, definition, attemptOrdinal)}`
    + '/stage-admission-receipt.json';
const stageAdmissionV002ReceiptId = (recordId, definition) =>
  `${recordId}-${definition.ordinal}-${definition.stage}-admission`;

const validPresentationMeaningOutputStageAttemptV002 = (
  value,
  {recordRoot, definition},
) => {
  if (!exactKeys(value, ['attemptOrdinal', 'supersedesReceipt'])
    || !positive(value.attemptOrdinal)) return false;
  if (value.attemptOrdinal === 1) return value.supersedesReceipt === null;
  return validJsonBinding(value.supersedesReceipt)
    && value.supersedesReceipt.schemaVersion
      === PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V002
    && value.supersedesReceipt.path === stageAdmissionV002ReceiptPath(
      recordRoot,
      definition,
      value.attemptOrdinal - 1,
    );
};

const makeViolation = (code, pointer) => Object.freeze({
  code,
  path: pointer,
  relatedIds: Object.freeze([]),
});

export function serializePresentationMeaningOutputRunInputFormalJsonV001(value) {
  const serialized = serializePresentationCaptionB1FormalJsonV001(value);
  if (serialized.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return serialized.bytes;
}

export function canonicalSha256PresentationMeaningOutputRunInputJsonV001(value) {
  const canonical = canonicalizePresentationCaptionB1JsonV001(value);
  if (canonical.status !== 'canonicalized') throw new TypeError('canonical JSON failed');
  return hash(canonical.bytes);
}

export function validatePresentationMeaningOutputRunInputRecordV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'recordId', 'sourceAndInterval', 'horizontalStyle',
    'verticalStyle', 'spendingLimit', 'title',
  ])
    || value.schemaVersion !== PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001
    || !FORMAL_ID.test(value.recordId)) return false;
  const source = value.sourceAndInterval;
  if (!exactKeys(source, [
    'sourceRef', 'candidateId', 'assemblyDecision', 'sourceStartMs', 'sourceEndMs',
  ])
    || !SOURCE_REF.test(source.sourceRef)
    || !positive(source.candidateId)
    || !validJsonBinding(source.assemblyDecision)
    || source.assemblyDecision.schemaVersion
      !== PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION
    || !nonnegative(source.sourceStartMs)
    || !positive(source.sourceEndMs)
    || source.sourceStartMs >= source.sourceEndMs) return false;
  const horizontal = value.horizontalStyle;
  if (!exactKeys(horizontal, [
    'format', 'presetId', 'maxLogicalWidthPerLine', 'crop',
  ])
    || horizontal.format !== 'normal-landscape'
    || !FORMAL_ID.test(horizontal.presetId)
    || !positive(horizontal.maxLogicalWidthPerLine)
    || !exactKeys(horizontal.crop, ['mode'])
    || horizontal.crop.mode !== 'identity') return false;
  const vertical = value.verticalStyle;
  if (!exactKeys(vertical, [
    'format', 'screenLayoutId', 'presetId', 'maxLogicalWidthPerLine',
    'cropDecision', 'selectionPackageManifest',
  ])
    || vertical.format !== 'vertical-short-1080x1920'
    || !SCREEN_LAYOUT_IDS.has(vertical.screenLayoutId)
    || !FORMAL_ID.test(vertical.presetId)
    || !positive(vertical.maxLogicalWidthPerLine)
    || !validJsonBinding(vertical.cropDecision)
    || vertical.cropDecision.schemaVersion !== 'vertical-preset-type-crop-decision-v006'
    || !validJsonBinding(vertical.selectionPackageManifest)
    || vertical.selectionPackageManifest.schemaVersion
      !== 'vertical-preset-type-crop-selection-package-v006') return false;
  return exactKeys(value.spendingLimit, ['currency', 'maximumNanoUsd'])
    && value.spendingLimit.currency === 'USD'
    && positive(value.spendingLimit.maximumNanoUsd)
    && exactKeys(value.title, ['text', 'inputMode'])
    && value.title.text === ''
    && value.title.inputMode === 'none';
}

export function validatePresentationMeaningOutputRunInputPublicationJobV001(value) {
  return validatePresentationMeaningOutputRunInputPublicationJobEnvelopeV001(value)
    && validatePresentationMeaningOutputRunInputRecordV001(value.record);
}

/**
 * dispatch前に確認するpublication jobの外形。record本文の意味検査は
 * `RUN_INPUT_RECORD_INVALID`が所有するため、ここでは重ねて判定しない。
 */
export function validatePresentationMeaningOutputRunInputPublicationJobEnvelopeV001(value) {
  return exactKeys(value, [
    'schemaVersion', 'jobId', 'action', 'record', 'outputRoot',
    'implementationBindings', 'executionPolicy',
  ])
    && value.schemaVersion === PRESENTATION_MEANING_OUTPUT_RUN_INPUT_PUBLICATION_JOB_SCHEMA_V001
    && FORMAL_ID.test(value.jobId)
    && value.action === 'publish-run-input-record'
    && isObject(value.record)
    && FORMAL_ID.test(value.record.recordId ?? '')
    && value.outputRoot === `${RECORD_ROOT}/${value.record.recordId}`
    && expectedImplementationBindings(value.implementationBindings)
    && validExecutionPolicy(value.executionPolicy);
}

const validUpstreamBinding = value => exactKeys(value, [
  'role', 'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
])
  && typeof value.role === 'string'
  && value.role.length > 0
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && ((value.schemaVersion === null && value.canonicalSha256 === null)
    || (typeof value.schemaVersion === 'string'
      && value.schemaVersion.length > 0
      && SHA256.test(value.canonicalSha256)));

const validPresentationMeaningOutputStageAdmissionJobFields = (value, schemaVersion) => {
  if (value.schemaVersion !== schemaVersion
    || !FORMAL_ID.test(value.jobId)
    || value.action !== 'admit-stage'
    || !STAGE_BY_NAME.has(value.stage)
    || !validJsonBinding(value.runInputRecordBinding)
    || value.runInputRecordBinding.schemaVersion
      !== PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001
    || !validJsonBinding(value.targetJobBinding)
    || !dense(value.upstreamBindings)
    || !value.upstreamBindings.every(validUpstreamBinding)
    || !expectedImplementationBindings(value.implementationBindings)
    || !validExecutionPolicy(value.executionPolicy)) return false;
  const definition = STAGE_BY_NAME.get(value.stage);
  return same(
    value.upstreamBindings.map(item => item.role),
    definition.upstreamRoles,
  );
};

export function validatePresentationMeaningOutputStageAdmissionJobV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'jobId', 'action', 'stage', 'runInputRecordBinding',
    'targetJobBinding', 'upstreamBindings', 'outputRoot',
    'implementationBindings', 'executionPolicy',
  ])
    || !validPresentationMeaningOutputStageAdmissionJobFields(
      value,
      PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V001,
    )) return false;
  const definition = STAGE_BY_NAME.get(value.stage);
  const recordRoot = value.runInputRecordBinding.path
    .replace(/\/run-input-record\.json$/u, '');
  return recordRoot !== value.runInputRecordBinding.path
    && value.outputRoot === `${recordRoot}/admissions/${definition.ordinal}-${definition.stage}`;
}

export function validatePresentationMeaningOutputStageAdmissionJobV002(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'jobId', 'action', 'stage', 'runInputRecordBinding',
    'targetJobBinding', 'upstreamBindings', 'outputRoot',
    'implementationBindings', 'executionPolicy', 'attempt',
  ])
    || !validPresentationMeaningOutputStageAdmissionJobFields(
      value,
      PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V002,
    )) return false;
  const definition = STAGE_BY_NAME.get(value.stage);
  const recordRoot = runInputRecordRoot(value.runInputRecordBinding);
  return recordRoot !== null
    && validPresentationMeaningOutputStageAttemptV002(
      value.attempt,
      {recordRoot, definition},
    )
    && value.outputRoot === stageAdmissionV002Root(
      recordRoot,
      definition,
      value.attempt.attemptOrdinal,
    );
}

const passedValidation = result => result === true || result?.status === 'passed';
const safeValidation = (validator, value, ...args) => {
  try { return passedValidation(validator(value, ...args)); } catch { return false; }
};
const safeThrowOrReturnSameJobValidation = (validator, job) => {
  try { return validator(job) === job; } catch { return false; }
};
const bindingFor = (artifacts, role) => {
  const binding = artifacts.find(item => item.role === role)?.binding ?? null;
  if (binding === null) return null;
  return binding.schemaVersion === null
    ? {path: binding.path, fileSha256: binding.fileSha256}
    : {
      schemaVersion: binding.schemaVersion,
      path: binding.path,
      fileSha256: binding.fileSha256,
      canonicalSha256: binding.canonicalSha256,
    };
};
const valueFor = (artifacts, role) => artifacts.find(item => item.role === role)?.value ?? null;
const bindingMatches = (left, right) => same(left, right);
const singleSourceSegment = value => Array.isArray(value?.sourceMedia)
  && value.sourceMedia.length === 1
  && Array.isArray(value?.segments)
  && value.segments.length === 1;

const rejectProjection = pointer => ({
  status: 'rejected',
  violations: [makeViolation('STAGE_ADMISSION_PROJECTION_MISMATCH', pointer)],
});

const targetValidatorPassed = (stage, targetJob, targetJobValidator) => {
  if (typeof targetJobValidator === 'function') {
    return safeValidation(targetJobValidator, targetJob);
  }
  if (stage === 'timeline-decision') {
    return validatePresentationTimelineCompositionDecisionJobV001(targetJob);
  }
  if (stage === 'b3-source-package') {
    return validatePresentationMeaningBoundarySourcePackageJobV001(targetJob);
  }
  if (stage === 'b5-token-measurement') {
    return safeThrowOrReturnSameJobValidation(
      validatePresentationMeaningBoundaryB5JobV001,
      targetJob,
    );
  }
  if (stage === 'b6-generation') {
    return safeThrowOrReturnSameJobValidation(
      validatePresentationMeaningBoundaryB6JobV001,
      targetJob,
    );
  }
  if (stage === 'b1-validation') {
    return validatePresentationMeaningBoundaryValidationJobV001(targetJob);
  }
  if (stage === 'meaning-package') {
    return validatePresentationMeaningInformationPackageJobV001(targetJob);
  }
  if (stage === 'base-media') {
    return passedValidation(validatePresentationOutputBaseMediaBuildJobV001(targetJob));
  }
  if (stage === 'output-landscape' || stage === 'output-vertical') {
    return validatePresentationOutputFormalJobV001(targetJob);
  }
  return false;
};

const sourceAndIntervalMatches = (record, sourceRef, segment) => sourceRef
  === record.sourceAndInterval.sourceRef
  && segment?.sourceStartMs === record.sourceAndInterval.sourceStartMs
  && segment?.sourceEndMs === record.sourceAndInterval.sourceEndMs;

const validateUpstreamArtifact = (role, value) => {
  if (role === 'timeline-decision') return validatePresentationTimelineCompositionDecisionV001(value);
  if (role === 'source-package') {
    return validatePresentationMeaningBoundarySourcePackageV001(value);
  }
  if (role === 'b5-manifest') {
    return passedValidation(validatePresentationMeaningBoundaryB5ManifestV001(value));
  }
  if (role === 'b6-manifest') {
    return passedValidation(validatePresentationMeaningBoundaryB6ManifestV001(value));
  }
  if (role === 'provider-envelope') {
    return passedValidation(validatePresentationMeaningBoundaryProviderEnvelopeV001(value));
  }
  if (role === 'semantic-validation') {
    return validatePresentationMeaningBoundaryValidationReportV001(value);
  }
  if (role === 'semantic-selection') {
    return validatePresentationMeaningBoundarySelectionV001(value);
  }
  if (role === 'meaning-package') {
    return passedValidation(
      validatePresentationMeaningInformationPackageAdmissionEnvelopeV001(value),
    );
  }
  if (role === 'output-request') return validatePresentationOutputRequestV001(value);
  // The timeline validators require their package/source inspection context.  That
  // context is owned by the base-media and crop runners, so admission checks the
  // bound formal envelope here and leaves the already-defined full validation to
  // those runners instead of inventing a second context reconstruction.
  if (role === 'target-timeline') {
    return isObject(value)
      && value.schemaVersion === 'presentation-base-media-timeline-v002';
  }
  if (role === 'reviewed-timeline') return isObject(value);
  if (role === 'target-generation-manifest') {
    return validatePresentationOutputBaseMediaGenerationManifestV001(value);
  }
  if (role === 'target-validation-receipt') {
    return validatePresentationOutputBaseMediaValidationReceiptV001(value);
  }
  return isObject(value) || Buffer.isBuffer(value) || value instanceof Uint8Array;
};

const stageComparedPaths = stage => Object.freeze({
  'timeline-decision': Object.freeze([
    'record:/sourceAndInterval/sourceRef', 'record:/sourceAndInterval/sourceStartMs',
    'record:/sourceAndInterval/sourceEndMs', 'record:/sourceAndInterval/assemblyDecision',
    'job:/sourceMedia/0/sourceRef', 'job:/segments/0',
  ]),
  'b3-source-package': Object.freeze([
    'record:/sourceAndInterval/sourceRef', 'record:/sourceAndInterval/sourceStartMs',
    'record:/sourceAndInterval/sourceEndMs', 'job:/timelineCompositionDecisionBinding',
    'upstream:timeline-decision:/sourceMedia/0/sourceRef',
    'upstream:timeline-decision:/segments/0',
  ]),
  'b5-token-measurement': Object.freeze([
    'record:/spendingLimit', 'job:/sourcePackageBinding',
    'job:/spendingAuthorization/currency',
    'job:/spendingAuthorization/maximumNanoUsd', 'upstream:source-package:',
  ]),
  'b6-generation': Object.freeze([
    'record:/spendingLimit', 'job:/b5ManifestBinding',
    'job:/generateRequestBinding', 'upstream:b5-manifest:/generateRequestBinding',
    'job:/sendAuthorization/currency', 'job:/sendAuthorization/maximumNanoUsd',
    'upstream:b5-manifest:',
  ]),
  'b1-validation': Object.freeze([
    'job:/sourcePackageBinding', 'job:/b6ManifestBinding', 'job:/providerEnvelopeBinding',
    'upstream:source-package:', 'upstream:b6-manifest:', 'upstream:provider-envelope:',
  ]),
  'meaning-package': Object.freeze([
    'record:/title', 'job:/title', 'job:/timelineCompositionDecisionBinding',
    'job:/semanticSelectionValidationBinding', 'job:/semanticSelectionBinding',
  ]),
  'base-media': Object.freeze([
    'record:/sourceAndInterval/sourceRef', 'record:/sourceAndInterval/sourceStartMs',
    'record:/sourceAndInterval/sourceEndMs', 'job:/meaningPackageBinding',
    'upstream:meaning-package:/timelineComposition/segments/0',
  ]),
  'output-landscape': Object.freeze([
    'record:/horizontalStyle', 'job:/requestBinding',
    'upstream:output-request:/styleInput',
    'upstream:meaning-package:', 'upstream:base-media:',
  ]),
  'crop-application': Object.freeze([
    'record:/verticalStyle/screenLayoutId', 'record:/verticalStyle/cropDecision',
    'record:/verticalStyle/selectionPackageManifest', 'job:/reviewedCrop',
    'job:/targetBaseMedia',
  ]),
  'output-vertical': Object.freeze([
    'record:/verticalStyle', 'job:/requestBinding',
    'upstream:output-request:/styleInput', 'upstream:crop-application:',
  ]),
}[stage]);

const derivePresentationMeaningOutputStageProjection = ({
  record,
  admissionJob,
  targetJob,
  upstreamArtifacts,
  referenceArtifacts = {},
  targetJobValidator = null,
}, admissionJobValidator) => {
  if (!validatePresentationMeaningOutputRunInputRecordV001(record)
    || !admissionJobValidator(admissionJob)
    || !dense(upstreamArtifacts)
    || !same(upstreamArtifacts.map(item => item.role),
      admissionJob.upstreamBindings.map(item => item.role))
    || upstreamArtifacts.some((item, index) => !exactKeys(item, ['role', 'binding', 'value'])
      || !bindingMatches(item.binding, admissionJob.upstreamBindings[index])
      || !validateUpstreamArtifact(item.role, item.value))) {
    return rejectProjection('/stageInputs');
  }
  const {stage} = admissionJob;
  if (!targetValidatorPassed(stage, targetJob, targetJobValidator)) {
    return rejectProjection('/targetJob');
  }
  let passed = false;
  if (stage === 'timeline-decision') {
    const assembly = referenceArtifacts.assemblyDecision;
    passed = safeValidation(validatePresentationBaseMediaAssemblyDecisionV001, assembly)
      && assembly.payload.segments.length === 1
      && sourceAndIntervalMatches(
        record,
        assembly.payload.sourceArtifact.sourceRef,
        assembly.payload.segments[0],
      )
      && singleSourceSegment(targetJob)
      && sourceAndIntervalMatches(record, targetJob.sourceMedia[0].sourceRef, targetJob.segments[0])
      && bindingMatches(targetJob.segments.length === 1
        ? record.sourceAndInterval.assemblyDecision : null,
      referenceArtifacts.assemblyDecisionBinding);
  } else if (stage === 'b3-source-package') {
    const decision = valueFor(upstreamArtifacts, 'timeline-decision');
    passed = bindingMatches(
      targetJob.timelineCompositionDecisionBinding,
      bindingFor(upstreamArtifacts, 'timeline-decision'),
    ) && singleSourceSegment(decision)
      && sourceAndIntervalMatches(record, decision.sourceMedia[0].sourceRef, decision.segments[0]);
  } else if (stage === 'b5-token-measurement') {
    passed = bindingMatches(targetJob.sourcePackageBinding, bindingFor(upstreamArtifacts, 'source-package'))
      && targetJob.spendingAuthorization.currency === record.spendingLimit.currency
      && targetJob.spendingAuthorization.maximumNanoUsd
        === record.spendingLimit.maximumNanoUsd;
  } else if (stage === 'b6-generation') {
    const b5Manifest = valueFor(upstreamArtifacts, 'b5-manifest');
    passed = bindingMatches(targetJob.b5ManifestBinding, bindingFor(upstreamArtifacts, 'b5-manifest'))
      && bindingMatches(targetJob.generateRequestBinding, b5Manifest.generateRequestBinding)
      && targetJob.sendAuthorization.currency === record.spendingLimit.currency
      && targetJob.sendAuthorization.maximumNanoUsd === record.spendingLimit.maximumNanoUsd;
  } else if (stage === 'b1-validation') {
    const b6Manifest = valueFor(upstreamArtifacts, 'b6-manifest');
    const b5Manifest = referenceArtifacts.b5Manifest;
    passed = bindingMatches(targetJob.sourcePackageBinding, bindingFor(upstreamArtifacts, 'source-package'))
      && bindingMatches(targetJob.b6ManifestBinding, bindingFor(upstreamArtifacts, 'b6-manifest'))
      && bindingMatches(targetJob.providerEnvelopeBinding, bindingFor(upstreamArtifacts, 'provider-envelope'))
      && passedValidation(validatePresentationMeaningBoundaryB5ManifestV001(b5Manifest))
      && bindingMatches(referenceArtifacts.b5ManifestBinding, b6Manifest.b5ManifestBinding)
      && bindingMatches(b5Manifest.sourcePackageBinding, targetJob.sourcePackageBinding);
  } else if (stage === 'meaning-package') {
    const report = valueFor(upstreamArtifacts, 'semantic-validation');
    passed = bindingMatches(
      targetJob.timelineCompositionDecisionBinding,
      bindingFor(upstreamArtifacts, 'timeline-decision'),
    ) && bindingMatches(
      targetJob.semanticSelectionValidationBinding,
      bindingFor(upstreamArtifacts, 'semantic-validation'),
    ) && bindingMatches(
      targetJob.semanticSelectionBinding,
      bindingFor(upstreamArtifacts, 'semantic-selection'),
    ) && same(targetJob.title, record.title)
      && report.status === 'passed';
  } else if (stage === 'base-media') {
    const meaningPackage = valueFor(upstreamArtifacts, 'meaning-package');
    const segment = meaningPackage?.timelineComposition?.segments?.[0];
    passed = bindingMatches(targetJob.meaningPackageBinding, bindingFor(upstreamArtifacts, 'meaning-package'))
      && meaningPackage.sourceMedia.length === 1
      && meaningPackage.timelineComposition.segments.length === 1
      && sourceAndIntervalMatches(record, meaningPackage.sourceMedia[0].sourceRef, segment);
  } else if (stage === 'output-landscape' || stage === 'output-vertical') {
    const request = valueFor(upstreamArtifacts, 'output-request');
    const style = request?.styleInput;
    const common = validatePresentationOutputRequestV001(request)
      && validatePresentationOutputFormalJobV001(targetJob, request)
      && bindingMatches(targetJob.requestBinding, bindingFor(upstreamArtifacts, 'output-request'))
      && bindingMatches(request.meaningInformationPackage, bindingFor(upstreamArtifacts, 'meaning-package'))
      && bindingMatches(request.baseMediaInput.baseMedia, bindingFor(upstreamArtifacts, 'base-media'));
    if (stage === 'output-landscape') {
      passed = common
        && style.format === record.horizontalStyle.format
        && style.presetBinding.presetId === record.horizontalStyle.presetId
        && style.captionLayoutPolicy.maxLogicalWidthPerLine
          === record.horizontalStyle.maxLogicalWidthPerLine
        && same(style.cropPolicy, record.horizontalStyle.crop);
    } else {
      passed = common
        && style.format === record.verticalStyle.format
        && style.screenLayoutId === record.verticalStyle.screenLayoutId
        && style.presetBinding.presetId === record.verticalStyle.presetId
        && style.captionLayoutPolicy.maxLogicalWidthPerLine
          === record.verticalStyle.maxLogicalWidthPerLine
        && bindingMatches(style.cropPolicy.application, bindingFor(upstreamArtifacts, 'crop-application'));
    }
  } else if (stage === 'crop-application') {
    passed = bindingMatches(targetJob.runInputRecordBinding, admissionJob.runInputRecordBinding)
      && bindingMatches(targetJob.reviewedCrop.decision,
        bindingFor(upstreamArtifacts, 'reviewed-crop-decision'))
      && bindingMatches(targetJob.reviewedCrop.selectionPackageManifest,
        bindingFor(upstreamArtifacts, 'reviewed-crop-selection'))
      && bindingMatches(targetJob.reviewedCrop.reviewedBaseMedia.baseMedia,
        bindingFor(upstreamArtifacts, 'reviewed-base-media'))
      && bindingMatches(targetJob.reviewedCrop.reviewedBaseMedia.timeline,
        bindingFor(upstreamArtifacts, 'reviewed-timeline'))
      && bindingMatches(targetJob.reviewedCrop.reviewedBaseMedia.generationManifest,
        bindingFor(upstreamArtifacts, 'reviewed-generation-manifest'))
      && bindingMatches(targetJob.reviewedCrop.reviewedBaseMedia.validationReport,
        bindingFor(upstreamArtifacts, 'reviewed-validation-report'))
      && bindingMatches(targetJob.targetBaseMedia.baseMedia,
        bindingFor(upstreamArtifacts, 'target-base-media'))
      && bindingMatches(targetJob.targetBaseMedia.timeline,
        bindingFor(upstreamArtifacts, 'target-timeline'))
      && bindingMatches(targetJob.targetBaseMedia.generationManifest,
        bindingFor(upstreamArtifacts, 'target-generation-manifest'))
      && bindingMatches(targetJob.targetBaseMedia.validationReceipt,
        bindingFor(upstreamArtifacts, 'target-validation-receipt'))
      && bindingMatches(targetJob.reviewedCrop.decision, record.verticalStyle.cropDecision)
      && bindingMatches(
        targetJob.reviewedCrop.selectionPackageManifest,
        record.verticalStyle.selectionPackageManifest,
      )
      && referenceArtifacts.cropDecision?.selectedPlan?.screenLayoutId
        === record.verticalStyle.screenLayoutId;
  }
  if (!passed) return rejectProjection('/stageProjection');
  return {
    status: 'passed',
    violations: [],
    projection: {
      stage,
      comparedPaths: stageComparedPaths(stage),
    },
  };
};

export function derivePresentationMeaningOutputStageProjectionV001(args) {
  return derivePresentationMeaningOutputStageProjection(
    args,
    validatePresentationMeaningOutputStageAdmissionJobV001,
  );
}

export function derivePresentationMeaningOutputStageProjectionV002(args) {
  return derivePresentationMeaningOutputStageProjection(
    args,
    validatePresentationMeaningOutputStageAdmissionJobV002,
  );
}

const validComparedPath = value => {
  if (typeof value !== 'string') return false;
  if (value.startsWith('record:')) return JSON_POINTER.test(value.slice('record:'.length));
  if (value.startsWith('job:')) return JSON_POINTER.test(value.slice('job:'.length));
  if (!value.startsWith('upstream:')) return false;
  const parts = value.split(':');
  return parts.length === 3 && parts[1].length > 0 && JSON_POINTER.test(parts[2]);
};

const CHECK_NAMES = Object.freeze([
  'recordBinding',
  'targetJobBinding',
  'upstreamBindings',
  'stageProjection',
  'prePublicationReread',
]);

const buildPresentationMeaningOutputStageAdmissionReceiptFields = ({
  record,
  admissionJob,
  targetJob,
  upstreamArtifacts,
  referenceArtifacts = {},
  targetJobValidator = null,
}, projectionBuilder) => {
  const result = projectionBuilder({
    record,
    admissionJob,
    targetJob,
    upstreamArtifacts,
    referenceArtifacts,
    targetJobValidator,
  });
  if (result.status !== 'passed') throw new TypeError('stage admission projection rejected');
  const definition = STAGE_BY_NAME.get(admissionJob.stage);
  const recordId = record.recordId;
  const checks = [
    {
      name: 'recordBinding',
      status: 'passed',
      comparedPaths: ['record:/schemaVersion', 'record:/recordId', 'job:/runInputRecordBinding'],
    },
    {
      name: 'targetJobBinding',
      status: 'passed',
      comparedPaths: ['job:/targetJobBinding'],
    },
    {
      name: 'upstreamBindings',
      status: 'passed',
      comparedPaths: admissionJob.upstreamBindings.map(item => `upstream:${item.role}:`),
    },
    {
      name: 'stageProjection',
      status: 'passed',
      comparedPaths: [...result.projection.comparedPaths],
    },
    {
      name: 'prePublicationReread',
      status: 'passed',
      comparedPaths: [
        'job:/runInputRecordBinding', 'job:/targetJobBinding', 'job:/upstreamBindings',
      ],
    },
  ];
  return {definition, recordId, checks};
};

export function buildPresentationMeaningOutputStageAdmissionReceiptV001(args) {
  const {definition, recordId, checks} =
    buildPresentationMeaningOutputStageAdmissionReceiptFields(
      args,
      derivePresentationMeaningOutputStageProjectionV001,
    );
  return {
    schemaVersion: PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V001,
    receiptId: `${recordId}-${definition.ordinal}-${definition.stage}-admission`,
    status: 'passed',
    stage: definition.stage,
    runInputRecordBinding: args.admissionJob.runInputRecordBinding,
    jobBinding: args.admissionJob.targetJobBinding,
    upstreamBindings: args.admissionJob.upstreamBindings,
    checks,
  };
}

export function buildPresentationMeaningOutputStageAdmissionReceiptV002(args) {
  const {definition, recordId, checks} =
    buildPresentationMeaningOutputStageAdmissionReceiptFields(
      args,
      derivePresentationMeaningOutputStageProjectionV002,
    );
  const {admissionJob} = args;
  return {
    schemaVersion: PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V002,
    receiptId: stageAdmissionV002ReceiptId(
      recordId,
      definition,
    ),
    status: 'passed',
    stage: definition.stage,
    runInputRecordBinding: admissionJob.runInputRecordBinding,
    jobBinding: admissionJob.targetJobBinding,
    upstreamBindings: admissionJob.upstreamBindings,
    checks,
    attempt: admissionJob.attempt,
  };
}

const validPresentationMeaningOutputStageAdmissionReceiptFields = (
  value,
  schemaVersion,
) => {
  if (value.schemaVersion !== schemaVersion
    || value.status !== 'passed'
    || !STAGE_BY_NAME.has(value.stage)
    || !validJsonBinding(value.runInputRecordBinding)
    || value.runInputRecordBinding.schemaVersion
      !== PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001
    || !validJsonBinding(value.jobBinding)
    || !dense(value.upstreamBindings)
    || !value.upstreamBindings.every(validUpstreamBinding)
    || !dense(value.checks)
    || value.checks.length !== CHECK_NAMES.length
    || !value.checks.every((check, index) => exactKeys(
      check, ['name', 'status', 'comparedPaths'],
    ) && check.name === CHECK_NAMES[index]
      && check.status === 'passed'
      && dense(check.comparedPaths)
      && check.comparedPaths.every(validComparedPath))) return false;
  const definition = STAGE_BY_NAME.get(value.stage);
  return same(value.upstreamBindings.map(item => item.role), definition.upstreamRoles);
};

export function validatePresentationMeaningOutputStageAdmissionReceiptV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'receiptId', 'status', 'stage', 'runInputRecordBinding',
    'jobBinding', 'upstreamBindings', 'checks',
  ])
    || !validPresentationMeaningOutputStageAdmissionReceiptFields(
      value,
      PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V001,
    )) return false;
  const definition = STAGE_BY_NAME.get(value.stage);
  const recordName = value.runInputRecordBinding.path.split('/').at(-2);
  return FORMAL_ID.test(recordName ?? '')
    && value.receiptId === `${recordName}-${definition.ordinal}-${definition.stage}-admission`;
}

export function validatePresentationMeaningOutputStageAdmissionReceiptV002(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'receiptId', 'status', 'stage', 'runInputRecordBinding',
    'jobBinding', 'upstreamBindings', 'checks', 'attempt',
  ])
    || !validPresentationMeaningOutputStageAdmissionReceiptFields(
      value,
      PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V002,
    )) return false;
  const definition = STAGE_BY_NAME.get(value.stage);
  const recordName = value.runInputRecordBinding.path.split('/').at(-2);
  const recordRoot = runInputRecordRoot(value.runInputRecordBinding);
  return FORMAL_ID.test(recordName ?? '')
    && recordRoot !== null
    && validPresentationMeaningOutputStageAttemptV002(
      value.attempt,
      {recordRoot, definition},
    )
    && value.receiptId === stageAdmissionV002ReceiptId(
      recordName,
      definition,
    );
}

/**
 * 10工程を個別合格の寄せ集めで終わらせず、全receiptが同じ実行入力記録へ
 * 接続していることを固定順で確認する読み取り専用入口。
 */
export function validatePresentationMeaningOutputStageAdmissionReceiptSetV001(values) {
  if (!dense(values)
    || values.length !== PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.length
    || !values.every(validatePresentationMeaningOutputStageAdmissionReceiptV001)) {
    return false;
  }
  const firstBinding = values[0].runInputRecordBinding;
  return values.every((receipt, index) =>
    receipt.stage === PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[index].stage
    && same(receipt.runInputRecordBinding, firstBinding));
}

export function validatePresentationMeaningOutputStageAdmissionReceiptSetV002(values) {
  if (!dense(values)
    || values.length !== PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.length
    || !values.every(validatePresentationMeaningOutputStageAdmissionReceiptV002)) {
    return false;
  }
  const firstBinding = values[0].runInputRecordBinding;
  return values.every((receipt, index) =>
    receipt.stage === PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[index].stage
    && same(receipt.runInputRecordBinding, firstBinding));
}
