import {createHash} from 'node:crypto';
import {lstat, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001,
  PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001,
  validatePresentationMeaningBoundarySourcePackageV001,
} from './presentation_meaning_boundary_source_package_v001.mjs';
import {
  readPresentationMeaningBoundaryB5ManifestArtifactGraphV001,
  validatePresentationMeaningBoundaryB6ArtifactGraphV001,
  validatePresentationMeaningBoundaryB5JobV001,
  validatePresentationMeaningBoundaryB5ManifestV001,
  validatePresentationMeaningBoundaryB6JobV001,
  validatePresentationMeaningBoundaryB6ManifestV001,
  validatePresentationMeaningBoundaryProviderEnvelopeV001,
} from './run_presentation_meaning_boundary_b5_b6_v001.mjs';
import {
  createPresentationMeaningOwnedStagingRootV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  readPresentationMeaningWorkspaceFileStableV001,
} from './presentation_timeline_composition_decision_v001.mjs';
export {PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001};
export {
  validatePresentationMeaningBoundaryB5ManifestV001,
  validatePresentationMeaningBoundaryB6ManifestV001,
  validatePresentationMeaningBoundaryProviderEnvelopeV001,
};
export const PRESENTATION_MEANING_BOUNDARY_SELECTION_OWNED_VIOLATION_CODES_V001 =
  Object.freeze([
    ...PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001.slice(8, 15),
    PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001[21],
  ]);
export const PRESENTATION_MEANING_BOUNDARY_VALIDATION_JOB_SCHEMA_V001 =
  'presentation-meaning-boundary-validation-job-v001';
export const PRESENTATION_MEANING_BOUNDARY_SELECTION_SCHEMA_V001 =
  'presentation-meaning-boundary-selection-v001';
export const PRESENTATION_MEANING_BOUNDARY_VALIDATION_REPORT_SCHEMA_V001 =
  'presentation-caption-meaning-boundary-validation-report-v001';

const ROOT = 'evals/clip_composition/outputs/presentation';
const JOB_ROOT = `${ROOT}/meaning-boundary-validation-jobs`;
const OUTPUT_ROOT = `${ROOT}/meaning-boundary-validations`;
const SELF_PATH = 'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs';
const SOURCE_PACKAGE_PATH =
  'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs';
const STRICT_JSON_PATH =
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA = /^[0-9a-f]{64}$/u;
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const CHECKS = Object.freeze([
  'sourcePackageBinding', 'responseEnvelope', 'responseSchema',
  'containerBijection', 'candidateResolution', 'endMonotonicity',
  'containerFinalEnd', 'candidateCoverage', 'atomOccurrenceCoverage',
  'captionProjection',
]);
const IMPLEMENTATION_BINDING_SPECS = Object.freeze([
  Object.freeze({role: 'meaning-selection', path: SELF_PATH}),
  Object.freeze({role: 'meaning-source-package', path: SOURCE_PACKAGE_PATH}),
  Object.freeze({role: 'strict-json-codec', path: STRICT_JSON_PATH}),
]);
const CONTRACT_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-meaning-information-package-contract-design-20260803-v001.md',
    fileSha256: 'a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de',
    role: 'meaning-package-contract',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md',
    fileSha256: 'c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de',
    role: 'output-side-contract',
  }),
]);
const B5_JOB_SCHEMA = 'presentation-meaning-boundary-b5-job-v001';
const B5_MANIFEST_SCHEMA = 'presentation-meaning-boundary-b5-manifest-v001';
const B6_JOB_SCHEMA = 'presentation-meaning-boundary-b6-job-v001';
const B6_MANIFEST_SCHEMA = 'presentation-meaning-boundary-b6-manifest-v001';
const PROVIDER_ENVELOPE_SCHEMA =
  'presentation-meaning-boundary-provider-response-envelope-v001';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function assertPresentationMeaningBoundaryAtomPostconditionV001(expected, observed) {
  if (!same(expected, observed)) {
    throw new Error('atom occurrence postcondition failed');
  }
  return true;
}

export function assertPresentationMeaningBoundaryReportPostconditionV001(report) {
  if (!validatePresentationMeaningBoundaryValidationReportV001(report)) {
    throw new Error('report postcondition failed');
  }
  return true;
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const validJsonBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && typeof value.schemaVersion === 'string' && value.schemaVersion.length > 0
  && SAFE_PATH.test(value.path) && SHA.test(value.fileSha256) && SHA.test(value.canonicalSha256);
const validMediaBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && SAFE_PATH.test(value.path) && SHA.test(value.fileSha256);
const validCodeBinding = value => exactKeys(value, ['path', 'fileSha256', 'role'])
  && SAFE_PATH.test(value.path) && SHA.test(value.fileSha256)
  && typeof value.role === 'string' && value.role.length > 0;
const validImplementationBindingSet = value => dense(value)
  && value.length === IMPLEMENTATION_BINDING_SPECS.length
  && value.every((binding, index) => validCodeBinding(binding)
    && binding.role === IMPLEMENTATION_BINDING_SPECS[index].role
    && binding.path === IMPLEMENTATION_BINDING_SPECS[index].path);
const positiveSafeInteger = value => Number.isSafeInteger(value) && value > 0;
const nonNegativeSafeInteger = value => Number.isSafeInteger(value) && value >= 0;
const validUtcMilliseconds = value => typeof value === 'string'
  && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u.test(value)
  && !Number.isNaN(Date.parse(value))
  && new Date(value).toISOString() === value;
const violation = (code, pointer) => ({code, path: pointer, relatedIds: []});
const canonicalSha = value => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') throw new TypeError('canonicalization failed');
  return hash(result.bytes);
};
const formalBytes = value => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('serialization failed');
  return result.bytes;
};

export function validatePresentationMeaningBoundaryValidationJobV001(job) {
  return exactKeys(job, [
    'schemaVersion', 'jobId', 'attemptId', 'sourcePackageBinding',
    'b6ManifestBinding', 'providerEnvelopeBinding', 'outputRoot',
    'implementationBindings', 'approvedContractBindings',
  ]) && job.schemaVersion === PRESENTATION_MEANING_BOUNDARY_VALIDATION_JOB_SCHEMA_V001
    && FORMAL_ID.test(job.jobId) && FORMAL_ID.test(job.attemptId)
    && validJsonBinding(job.sourcePackageBinding)
    && job.sourcePackageBinding.schemaVersion
      === PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001
    && validJsonBinding(job.b6ManifestBinding)
    && job.b6ManifestBinding.schemaVersion === 'presentation-meaning-boundary-b6-manifest-v001'
    && validJsonBinding(job.providerEnvelopeBinding)
    && job.providerEnvelopeBinding.schemaVersion
      === 'presentation-meaning-boundary-provider-response-envelope-v001'
    && job.outputRoot === `${OUTPUT_ROOT}/${job.jobId}/${job.attemptId}`
    && validImplementationBindingSet(job.implementationBindings)
    && dense(job.approvedContractBindings)
    && same(job.approvedContractBindings, CONTRACT_BINDINGS);
}

const validCompleteResponse = value => exactKeys(value, ['status', 'containers'])
  && value.status === 'complete' && dense(value.containers) && value.containers.length > 0
  && value.containers.length <= 999999
  && value.containers.every(container => exactKeys(container, ['containerId', 'meaningGroups'])
    && FORMAL_ID.test(container.containerId) && dense(container.meaningGroups)
    && container.meaningGroups.length > 0 && container.meaningGroups.length <= 999999
    && container.meaningGroups.every(group => exactKeys(
      group, ['meaningGroupEndBoundaryCandidateId'],
    ) && FORMAL_ID.test(group.meaningGroupEndBoundaryCandidateId)))
  && value.containers.reduce((sum, container) => sum + container.meaningGroups.length, 0)
    <= 999999;
const validAbstainedResponse = value => exactKeys(value, ['status']) && value.status === 'abstained';

export function decodePresentationMeaningBoundaryResponseV001(bytes) {
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (decoded.status !== 'decoded') return {status: 'invalid', reason: decoded.reason};
  const endsWithObject = bytes.at(-1) === 0x7d;
  const endsWithObjectAndLf = bytes.at(-2) === 0x7d && bytes.at(-1) === 0x0a;
  if (bytes.length < 2
    || bytes[0] !== 0x7b
    || (!endsWithObject && !endsWithObjectAndLf)) {
    return {status: 'invalid', reason: 'byte-envelope-invalid'};
  }
  if (validAbstainedResponse(decoded.value)) return {status: 'abstained', response: decoded.value};
  if (validCompleteResponse(decoded.value)) return {status: 'complete', response: decoded.value};
  return {status: 'invalid', reason: 'schema-invalid'};
}

const makeCheckRows = (failedIndex, violationValue) => CHECKS.map((name, index) => ({
  name,
  status: failedIndex === null ? 'passed' : index < failedIndex ? 'passed'
    : index === failedIndex ? 'failed' : 'blocked',
  violationCodes: index === failedIndex ? [violationValue.code] : [],
}));

const fail = (checkName, code, pointer, status = 'rejected') => {
  const item = violation(code, pointer);
  const index = CHECKS.indexOf(checkName);
  return {status, checks: makeCheckRows(index, item), violations: [item]};
};

export function inspectPresentationMeaningBoundaryCandidateCoverageV001({
  candidateCount,
  selectedOrdinalRanges,
  containerIndex,
}) {
  const pointer = Number.isSafeInteger(containerIndex) && containerIndex >= 0
    ? `/response/containers/${containerIndex}/meaningGroups`
    : '/response/containers';
  if (!positiveSafeInteger(candidateCount)
    || !dense(selectedOrdinalRanges)
    || selectedOrdinalRanges.length < 1
    || !Number.isSafeInteger(containerIndex)
    || containerIndex < 0) {
    return {
      status: 'rejected',
      violation: violation('MEANING_BOUNDARY_COVERAGE_MISMATCH', pointer),
    };
  }
  let nextOrdinal = 0;
  for (const range of selectedOrdinalRanges) {
    if (!exactKeys(range, ['startOrdinal', 'endOrdinal'])
      || !nonNegativeSafeInteger(range.startOrdinal)
      || !nonNegativeSafeInteger(range.endOrdinal)
      || range.startOrdinal !== nextOrdinal
      || range.endOrdinal < range.startOrdinal
      || range.endOrdinal >= candidateCount) {
      return {
        status: 'rejected',
        violation: violation('MEANING_BOUNDARY_COVERAGE_MISMATCH', pointer),
      };
    }
    nextOrdinal = range.endOrdinal + 1;
  }
  if (nextOrdinal !== candidateCount) {
    return {
      status: 'rejected',
      violation: violation('MEANING_BOUNDARY_COVERAGE_MISMATCH', pointer),
    };
  }
  return {status: 'passed', violation: null};
}

const buildCaptionProjection = (sourcePackage, response) => {
  const captions = [];
  let captionOrdinal = 0;
  for (let containerIndex = 0; containerIndex < sourcePackage.containers.length; containerIndex += 1) {
    const sourceContainer = sourcePackage.containers[containerIndex];
    const selectedContainer = response.containers[containerIndex];
    let previousEnd = -1;
    const selectedOrdinalRanges = [];
    for (const group of selectedContainer.meaningGroups) {
      const end = sourceContainer.boundaryCandidates.findIndex(candidate =>
        candidate.boundaryCandidateId === group.meaningGroupEndBoundaryCandidateId);
      if (end < 0) return fail(
        'candidateResolution', 'MEANING_BOUNDARY_CANDIDATE_UNKNOWN',
        `/response/containers/${containerIndex}/meaningGroups/${selectedContainer.meaningGroups.indexOf(group)}/meaningGroupEndBoundaryCandidateId`,
      );
      if (end <= previousEnd) return fail(
        'endMonotonicity', 'MEANING_BOUNDARY_END_ORDER_INVALID',
        `/response/containers/${containerIndex}/meaningGroups/${selectedContainer.meaningGroups.indexOf(group)}/meaningGroupEndBoundaryCandidateId`,
      );
      const candidates = sourceContainer.boundaryCandidates.slice(previousEnd + 1, end + 1);
      selectedOrdinalRanges.push({startOrdinal: previousEnd + 1, endOrdinal: end});
      captionOrdinal += 1;
      const atomRefs = candidates.flatMap(candidate => candidate.atomRefs);
      const first = candidates[0];
      const last = candidates.at(-1);
      captions.push({
        captionId: `caption-${String(captionOrdinal).padStart(6, '0')}`,
        ordinal: captionOrdinal,
        timelineSegmentId: sourceContainer.timelineSegmentId,
        text: candidates.map(candidate => candidate.text).join(''),
        atomRefs,
        startAnchor: first.startAnchor,
        endAnchor: last.endAnchor,
        sourceStartMs: first.sourceStartMs,
        sourceEndMs: last.sourceEndMs,
      });
      previousEnd = end;
    }
    if (previousEnd !== sourceContainer.boundaryCandidates.length - 1) return fail(
      'containerFinalEnd', 'MEANING_BOUNDARY_FINAL_END_MISMATCH',
      `/response/containers/${containerIndex}/meaningGroups`,
    );
    const coverage = inspectPresentationMeaningBoundaryCandidateCoverageV001({
      candidateCount: sourceContainer.boundaryCandidates.length,
      selectedOrdinalRanges,
      containerIndex,
    });
    if (coverage.status !== 'passed') return fail(
      'candidateCoverage', coverage.violation.code, coverage.violation.path,
    );
  }
  const expected = sourcePackage.containers.flatMap(container =>
    container.boundaryCandidates.flatMap(candidate => candidate.atomRefs));
  const observed = captions.flatMap(caption => caption.atomRefs);
  assertPresentationMeaningBoundaryAtomPostconditionV001(expected, observed);
  return {status: 'passed', captions};
};

export function evaluatePresentationMeaningBoundarySelectionV001({
  job,
  jobFileSha256,
  sourcePackage,
  b5Manifest,
  b6Manifest,
  providerEnvelope,
  provenanceArtifactsVerified = false,
}) {
  if (!validatePresentationMeaningBoundaryValidationJobV001(job)
    || !SHA.test(jobFileSha256)
    || typeof provenanceArtifactsVerified !== 'boolean') {
    throw new TypeError('selection validation input is invalid');
  }
  if (!validatePresentationMeaningBoundarySourcePackageV001(sourcePackage)) {
    return fail('sourcePackageBinding', 'MEANING_BOUNDARY_SOURCE_PACKAGE_INVALID',
      '/sourcePackageBinding');
  }
  const b5Validation = validatePresentationMeaningBoundaryB5ManifestV001(b5Manifest);
  const b6Validation = validatePresentationMeaningBoundaryB6ManifestV001(b6Manifest);
  const providerValidation =
    validatePresentationMeaningBoundaryProviderEnvelopeV001(providerEnvelope);
  const envelopeValid = b5Validation.status === 'passed'
    && b6Validation.status === 'passed'
    && providerValidation.status === 'passed'
    && provenanceArtifactsVerified
    && b6Manifest.status === 'passed-transport'
    && b6Manifest.primaryRejectionCode === null
    && Object.values(b6Manifest.checks).every(value => value === 'passed')
    && same(b6Manifest.providerEnvelopeBinding, job.providerEnvelopeBinding)
    && same(providerEnvelope.rawResponseBinding, b6Manifest.rawResponseBinding)
    && providerEnvelope.envelopeId === `presentation-meaning-boundary-provider-envelope-`
      + b6Manifest.b6JobBinding.fileSha256.slice(0, 32)
    && b5Manifest.status === 'passed'
    && same(b5Manifest.sourcePackageBinding, job.sourcePackageBinding)
    && same(b5Manifest.generateRequestBinding, b6Manifest.generateRequestBinding);
  if (!envelopeValid) return fail(
    'responseEnvelope', 'MEANING_BOUNDARY_RESPONSE_INVALID', '/providerEnvelopeBinding',
  );
  const decoded = decodePresentationMeaningBoundaryResponseV001(
    Buffer.from(providerEnvelope.semanticText, 'utf8'),
  );
  if (decoded.status === 'abstained') return fail(
    'responseSchema', 'MEANING_BOUNDARY_RESPONSE_ABSTAINED', '/response/status', 'abstained',
  );
  if (decoded.status !== 'complete') return fail(
    'responseSchema', 'MEANING_BOUNDARY_RESPONSE_SCHEMA_INVALID', '/response',
  );
  const response = decoded.response;
  const expectedIds = sourcePackage.containers.map(container => container.containerId);
  const actualIds = response.containers.map(container => container.containerId);
  if (!same(expectedIds, actualIds) || new Set(actualIds).size !== actualIds.length) {
    return fail('containerBijection', 'MEANING_BOUNDARY_CONTAINER_SET_MISMATCH',
      '/response/containers');
  }
  const projection = buildCaptionProjection(sourcePackage, response);
  if (projection.status !== 'passed') return projection;
  const captions = projection.captions;
  const selection = {
    schemaVersion: PRESENTATION_MEANING_BOUNDARY_SELECTION_SCHEMA_V001,
    selectionId: `presentation-meaning-boundary-selection-${jobFileSha256.slice(0, 32)}`,
    sourcePackageBinding: job.sourcePackageBinding,
    b6ManifestBinding: job.b6ManifestBinding,
    providerEnvelopeBinding: job.providerEnvelopeBinding,
    response,
  };
  const selectionProjection = {
    containerCount: response.containers.length,
    meaningGroupCount: captions.length,
    selectedBoundaryCount: captions.length,
    selectionCanonicalSha256: canonicalSha(response),
  };
  const captionProjection = {
    captionCount: captions.length,
    atomOccurrenceCount: captions.reduce((sum, caption) => sum + caption.atomRefs.length, 0),
    captionTextSequenceCanonicalSha256: canonicalSha(captions.map(caption => ({
      captionId: caption.captionId, text: caption.text,
    }))),
    captionTimingSequenceCanonicalSha256: canonicalSha(captions.map(caption => ({
      captionId: caption.captionId,
      startAnchor: caption.startAnchor,
      endAnchor: caption.endAnchor,
      sourceStartMs: caption.sourceStartMs,
      sourceEndMs: caption.sourceEndMs,
    }))),
    captionAtomRefSequenceCanonicalSha256: canonicalSha(captions.map(caption => ({
      captionId: caption.captionId, atomRefs: caption.atomRefs,
    }))),
  };
  return {
    status: 'passed',
    checks: makeCheckRows(null, null),
    violations: [],
    selection,
    captions,
    selectionProjection,
    captionProjection,
  };
}

const jsonBindingFor = (schemaVersion, bindingPath, value) => {
  const bytes = formalBytes(value);
  return {
    schemaVersion,
    path: bindingPath,
    fileSha256: hash(bytes),
    canonicalSha256: canonicalSha(value),
  };
};

export function buildPresentationMeaningBoundaryValidationReportV001({
  job,
  jobFileSha256,
  evaluation,
  selectionPath,
  rawResponseBinding,
}) {
  if (!validatePresentationMeaningBoundaryValidationJobV001(job)
    || !SHA.test(jobFileSha256) || !isObject(evaluation)) throw new TypeError('report input');
  const passed = evaluation.status === 'passed';
  const responseEnvelopePassed = evaluation.checks.find(
    check => check.name === 'responseEnvelope',
  )?.status === 'passed';
  return {
    schemaVersion: PRESENTATION_MEANING_BOUNDARY_VALIDATION_REPORT_SCHEMA_V001,
    reportId: `presentation-meaning-boundary-validation-report-${jobFileSha256.slice(0, 32)}`,
    status: evaluation.status,
    sourcePackageBinding: job.sourcePackageBinding,
    rawResponseBinding: responseEnvelopePassed && validMediaBinding(rawResponseBinding)
      ? rawResponseBinding : null,
    selectionBinding: passed
      ? jsonBindingFor(PRESENTATION_MEANING_BOUNDARY_SELECTION_SCHEMA_V001,
        selectionPath, evaluation.selection) : null,
    checks: evaluation.checks,
    violations: evaluation.violations,
    selectionProjection: passed ? evaluation.selectionProjection : null,
    captionProjection: passed ? evaluation.captionProjection : null,
    implementationBindings: job.implementationBindings,
  };
}

export function validatePresentationMeaningBoundarySelectionV001(value) {
  return exactKeys(value, [
    'schemaVersion', 'selectionId', 'sourcePackageBinding', 'b6ManifestBinding',
    'providerEnvelopeBinding', 'response',
  ]) && value.schemaVersion === PRESENTATION_MEANING_BOUNDARY_SELECTION_SCHEMA_V001
    && FORMAL_ID.test(value.selectionId) && validJsonBinding(value.sourcePackageBinding)
    && value.sourcePackageBinding.schemaVersion
      === PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001
    && validJsonBinding(value.b6ManifestBinding)
    && value.b6ManifestBinding.schemaVersion === 'presentation-meaning-boundary-b6-manifest-v001'
    && validJsonBinding(value.providerEnvelopeBinding)
    && value.providerEnvelopeBinding.schemaVersion
      === 'presentation-meaning-boundary-provider-response-envelope-v001'
    && validCompleteResponse(value.response);
}

const validReportViolation = value => exactKeys(value, ['code', 'path', 'relatedIds'])
  && PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001.includes(value.code)
  && typeof value.path === 'string' && value.path.startsWith('/')
  && !value.path.includes('~')
  && dense(value.relatedIds) && value.relatedIds.length === 0;

const validSelectionProjection = value => exactKeys(value, [
  'containerCount', 'meaningGroupCount', 'selectedBoundaryCount',
  'selectionCanonicalSha256',
]) && Number.isSafeInteger(value.containerCount) && value.containerCount > 0
  && Number.isSafeInteger(value.meaningGroupCount) && value.meaningGroupCount > 0
  && value.selectedBoundaryCount === value.meaningGroupCount
  && SHA.test(value.selectionCanonicalSha256);

const validCaptionProjection = value => exactKeys(value, [
  'captionCount', 'atomOccurrenceCount', 'captionTextSequenceCanonicalSha256',
  'captionTimingSequenceCanonicalSha256', 'captionAtomRefSequenceCanonicalSha256',
]) && Number.isSafeInteger(value.captionCount) && value.captionCount > 0
  && Number.isSafeInteger(value.atomOccurrenceCount) && value.atomOccurrenceCount > 0
  && SHA.test(value.captionTextSequenceCanonicalSha256)
  && SHA.test(value.captionTimingSequenceCanonicalSha256)
  && SHA.test(value.captionAtomRefSequenceCanonicalSha256);

const violationOwnedByCheck = (checkName, item) => {
  const exact = {
    sourcePackageBinding: ['MEANING_BOUNDARY_SOURCE_PACKAGE_INVALID', '/sourcePackageBinding'],
    responseEnvelope: ['MEANING_BOUNDARY_RESPONSE_INVALID', '/providerEnvelopeBinding'],
    containerBijection: ['MEANING_BOUNDARY_CONTAINER_SET_MISMATCH', '/response/containers'],
  }[checkName];
  if (exact) return item.code === exact[0] && item.path === exact[1];
  if (checkName === 'responseSchema') return item.code === 'MEANING_BOUNDARY_RESPONSE_SCHEMA_INVALID'
    ? item.path === '/response'
    : item.code === 'MEANING_BOUNDARY_RESPONSE_ABSTAINED'
      && item.path === '/response/status';
  if (checkName === 'candidateResolution' || checkName === 'endMonotonicity') {
    const expectedCode = checkName === 'candidateResolution'
      ? 'MEANING_BOUNDARY_CANDIDATE_UNKNOWN' : 'MEANING_BOUNDARY_END_ORDER_INVALID';
    return item.code === expectedCode
      && /^\/response\/containers\/[0-9]+\/meaningGroups\/[0-9]+\/meaningGroupEndBoundaryCandidateId$/u
        .test(item.path);
  }
  if (checkName === 'containerFinalEnd' || checkName === 'candidateCoverage') {
    const expectedCode = checkName === 'containerFinalEnd'
      ? 'MEANING_BOUNDARY_FINAL_END_MISMATCH' : 'MEANING_BOUNDARY_COVERAGE_MISMATCH';
    return item.code === expectedCode
      && /^\/response\/containers\/[0-9]+\/meaningGroups$/u.test(item.path);
  }
  return false;
};

export function validatePresentationMeaningBoundaryValidationReportV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'reportId', 'status', 'sourcePackageBinding', 'rawResponseBinding',
    'selectionBinding', 'checks', 'violations', 'selectionProjection',
    'captionProjection', 'implementationBindings',
  ]) || value.schemaVersion !== PRESENTATION_MEANING_BOUNDARY_VALIDATION_REPORT_SCHEMA_V001
    || !FORMAL_ID.test(value.reportId) || !['passed', 'rejected', 'abstained'].includes(value.status)
    || !validJsonBinding(value.sourcePackageBinding)
    || !(value.rawResponseBinding === null || validMediaBinding(value.rawResponseBinding))
    || !(value.selectionBinding === null || validJsonBinding(value.selectionBinding))
    || !dense(value.checks) || value.checks.length !== CHECKS.length
    || !value.checks.every((check, index) => exactKeys(check, ['name', 'status', 'violationCodes'])
      && check.name === CHECKS[index] && ['passed', 'failed', 'blocked'].includes(check.status)
      && dense(check.violationCodes)
      && check.violationCodes.every(code =>
        PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001.includes(code)))
    || !dense(value.violations) || !value.violations.every(validReportViolation)
    || !validImplementationBindingSet(value.implementationBindings)) return false;
  if (value.status === 'passed') {
    return value.rawResponseBinding !== null
      && value.selectionBinding !== null
      && value.selectionBinding.schemaVersion === PRESENTATION_MEANING_BOUNDARY_SELECTION_SCHEMA_V001
      && validSelectionProjection(value.selectionProjection)
      && validCaptionProjection(value.captionProjection)
      && value.selectionProjection.meaningGroupCount === value.captionProjection.captionCount
      && value.violations.length === 0
      && value.checks.every(check => check.status === 'passed'
        && check.violationCodes.length === 0);
  }
  if (value.selectionBinding !== null || value.selectionProjection !== null
    || value.captionProjection !== null || value.violations.length !== 1) return false;
  const failedIndexes = value.checks
    .map((check, index) => check.status === 'failed' ? index : -1)
    .filter(index => index >= 0);
  if (failedIndexes.length !== 1) return false;
  const failedIndex = failedIndexes[0];
  const failedCheck = value.checks[failedIndex];
  if (failedCheck.violationCodes.length !== 1
    || failedCheck.violationCodes[0] !== value.violations[0].code
    || !violationOwnedByCheck(failedCheck.name, value.violations[0])
    || value.checks.some((check, index) => index < failedIndex
      ? check.status !== 'passed' || check.violationCodes.length !== 0
      : index > failedIndex
        ? check.status !== 'blocked' || check.violationCodes.length !== 0
        : false)) return false;
  const responseEnvelopePassed = value.checks[1].status === 'passed';
  if (responseEnvelopePassed !== (value.rawResponseBinding !== null)) return false;
  if (value.status === 'abstained') {
    return failedIndex === 2
      && value.violations[0].code === 'MEANING_BOUNDARY_RESPONSE_ABSTAINED'
      && value.violations[0].path === '/response/status';
  }
  return value.status === 'rejected'
    && value.violations[0].code !== 'MEANING_BOUNDARY_RESPONSE_ABSTAINED';
}

const readStable = (workspaceRoot, relativePath) =>
  readPresentationMeaningWorkspaceFileStableV001({workspaceRoot, relativePath});

const inputFileIdentity = stat => Object.freeze({
  dev: stat.dev.toString(),
  ino: stat.ino.toString(),
  size: stat.size.toString(),
  mtimeNs: stat.mtimeNs.toString(),
  ctimeNs: stat.ctimeNs.toString(),
  nlink: stat.nlink.toString(),
  mode: stat.mode.toString(),
});

const captureInputObservation = async ({workspaceRoot, binding, kind}) => {
  const rootReal = await realpath(workspaceRoot);
  const absolute = path.resolve(rootReal, binding.path);
  let initialStat;
  try {
    initialStat = await lstat(absolute, {bigint: true});
  } catch (error) {
    if (error.code === 'ENOENT') {
      return Object.freeze({binding, kind, state: 'missing', identity: null,
        bytes: null, value: null});
    }
    throw error;
  }
  const initialIdentity = inputFileIdentity(initialStat);
  let bytes;
  try {
    bytes = await readStable(workspaceRoot, binding.path);
  } catch {
    return Object.freeze({binding, kind, state: 'invalid', identity: initialIdentity,
      bytes: null, value: null});
  }
  const finalIdentity = inputFileIdentity(await lstat(absolute, {bigint: true}));
  if (!same(initialIdentity, finalIdentity)) throw new Error('input identity changed');
  if (kind === 'media') {
    const valid = validMediaBinding(binding) && hash(bytes) === binding.fileSha256;
    return Object.freeze({binding, kind, state: valid ? 'valid' : 'invalid',
      identity: finalIdentity, bytes, value: null});
  }
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  const valid = hash(bytes) === binding.fileSha256
    && decoded.status === 'decoded'
    && decoded.value.schemaVersion === binding.schemaVersion
    && canonicalSha(decoded.value) === binding.canonicalSha256;
  return Object.freeze({binding, kind, state: valid ? 'valid' : 'invalid',
    identity: finalIdentity, bytes, value: valid ? decoded.value : null});
};

export function inspectPresentationMeaningBoundaryInputObservationStabilityV001({
  before,
  after,
}) {
  const unchanged = before?.kind === after?.kind
    && before?.state === after?.state
    && same(before?.identity ?? null, after?.identity ?? null)
    && (before?.bytes === null
      ? after?.bytes === null
      : Buffer.isBuffer(before?.bytes)
        && Buffer.isBuffer(after?.bytes)
        && after.bytes.equals(before.bytes));
  return Object.freeze({status: unchanged ? 'unchanged' : 'changed'});
}

export async function inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001({
  workspaceRoot,
  jobPath,
  jobBytes,
  jobBindings,
  inputObservations,
  graphSnapshots,
}) {
  try {
    const jobBytesBeforePublication = await readStable(workspaceRoot, jobPath);
    if (!jobBytesBeforePublication.equals(jobBytes)) {
      return Object.freeze({status: 'fatal', stage: 'input-read'});
    }
    for (const binding of jobBindings) {
      const bytes = await readStable(workspaceRoot, binding.path);
      if (hash(bytes) !== binding.fileSha256) {
        return Object.freeze({status: 'fatal', stage: 'input-read'});
      }
    }
    for (const observation of inputObservations) {
      const current = await captureInputObservation({
        workspaceRoot,
        binding: observation.binding,
        kind: observation.kind,
      });
      if (inspectPresentationMeaningBoundaryInputObservationStabilityV001({
        before: observation,
        after: current,
      }).status !== 'unchanged') {
        return Object.freeze({status: 'fatal', stage: 'input-read'});
      }
    }
    for (const snapshot of graphSnapshots) {
      const bytes = await readStable(workspaceRoot, snapshot.path);
      if (!bytes.equals(snapshot.bytes)) {
        return Object.freeze({status: 'fatal', stage: 'input-read'});
      }
    }
  } catch {
    return Object.freeze({status: 'fatal', stage: 'input-read'});
  }
  return Object.freeze({status: 'passed'});
}

export async function runPresentationMeaningBoundarySelectionJobV001({workspaceRoot, jobPath}) {
  if (typeof workspaceRoot !== 'string' || typeof jobPath !== 'string') throw new TypeError('runner input');
  const match = new RegExp(`^${JOB_ROOT}/([^/]+)\\.json$`, 'u').exec(jobPath);
  if (!match || !FORMAL_ID.test(match[1])) throw new Error('job path invalid');
  const jobBytes = await readStable(workspaceRoot, jobPath);
  const decoded = decodePresentationCaptionB1StrictJsonV001(jobBytes);
  if (decoded.status !== 'decoded' || !validatePresentationMeaningBoundaryValidationJobV001(decoded.value)
    || decoded.value.jobId !== match[1]) throw new Error('job invalid');
  const job = decoded.value;
  for (const binding of [...job.implementationBindings, ...job.approvedContractBindings]) {
    const bytes = await readStable(workspaceRoot, binding.path);
    if (hash(bytes) !== binding.fileSha256) throw new Error('job binding mismatch');
  }
  const inputObservations = [];
  const captureJson = async binding => {
    const observation = await captureInputObservation({workspaceRoot, binding, kind: 'json'});
    inputObservations.push(observation);
    return observation.state === 'valid' ? observation.value : null;
  };
  const captureMedia = async binding => {
    const observation = await captureInputObservation({workspaceRoot, binding, kind: 'media'});
    inputObservations.push(observation);
    return observation.state === 'valid';
  };
  const sourcePackage = await captureJson(job.sourcePackageBinding);
  const b6Manifest = await captureJson(job.b6ManifestBinding);
  const providerEnvelope = await captureJson(job.providerEnvelopeBinding);
  let b5Manifest = null;
  if (isObject(b6Manifest) && validJsonBinding(b6Manifest.b5ManifestBinding)) {
    b5Manifest = await captureJson(b6Manifest.b5ManifestBinding);
  }
  let provenanceArtifactsVerified = false;
  const graphSnapshots = [];
  if (validatePresentationMeaningBoundaryB5ManifestV001(b5Manifest).status === 'passed'
    && validatePresentationMeaningBoundaryB6ManifestV001(b6Manifest).status === 'passed'
    && validatePresentationMeaningBoundaryProviderEnvelopeV001(providerEnvelope).status
      === 'passed') {
    try {
      const b6Job = await captureJson(b6Manifest.b6JobBinding);
      validatePresentationMeaningBoundaryB6JobV001(b6Job);
      const b5Graph = await readPresentationMeaningBoundaryB5ManifestArtifactGraphV001({
        manifest: b5Manifest,
        workspaceRoot,
      });
      const graphValidation = validatePresentationMeaningBoundaryB6ArtifactGraphV001({
        b5Manifest,
        b5Job: b5Graph.b5Job.value,
        b6Manifest,
        b6Job,
        providerEnvelope,
      });
      graphSnapshots.push(...b5Graph.snapshots);
      const b6RawVerified = await captureMedia(b6Manifest.rawResponseBinding);
      const envelopeRawVerified = await captureMedia(providerEnvelope.rawResponseBinding);
      const b6RequestVerified = await captureMedia(b6Manifest.generateRequestBinding);
      const b5RequestVerified = await captureMedia(b5Manifest.generateRequestBinding);
      const liveBindings = [
        ...b6Job.implementationBindings,
        ...b6Job.approvedContractBindings,
      ];
      const liveVerified = (await Promise.all(liveBindings.map(async binding => {
        return captureMedia({path: binding.path, fileSha256: binding.fileSha256});
      }))).every(Boolean);
      provenanceArtifactsVerified = graphValidation.status === 'passed'
        && b6RawVerified && envelopeRawVerified
        && b6RequestVerified && b5RequestVerified && liveVerified
        && same(b6Job.b5ManifestBinding, b6Manifest.b5ManifestBinding)
        && same(b6Job.generateRequestBinding, b6Manifest.generateRequestBinding)
        && same(b6Job.implementationBindings, b6Manifest.implementationBindings)
        && same(b5Graph.source.value, sourcePackage)
        && same(b5Manifest.sourcePackageBinding, job.sourcePackageBinding);
    } catch {
      provenanceArtifactsVerified = false;
    }
  }
  const evaluation = evaluatePresentationMeaningBoundarySelectionV001({
    job,
    jobFileSha256: hash(jobBytes),
    sourcePackage,
    b5Manifest,
    b6Manifest,
    providerEnvelope,
    provenanceArtifactsVerified,
  });
  const selectionPath = `${job.outputRoot}/meaning-boundary-selection.json`;
  const reportPath = `${job.outputRoot}/meaning-boundary-validation-report.json`;
  const report = buildPresentationMeaningBoundaryValidationReportV001({
    job, jobFileSha256: hash(jobBytes), evaluation, selectionPath,
    rawResponseBinding: providerEnvelope?.rawResponseBinding ?? null,
  });
  assertPresentationMeaningBoundaryReportPostconditionV001(report);
  const reread = await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001({
    workspaceRoot,
    jobPath,
    jobBytes,
    jobBindings: [...job.implementationBindings, ...job.approvedContractBindings],
    inputObservations,
    graphSnapshots,
  });
  if (reread.status !== 'passed') throw new Error('input-read-failed');
  const publicationClaim = await createPresentationMeaningOwnedStagingRootV001({
    workspaceRoot,
    relativeOutputRoot: job.outputRoot,
  });
  try {
    if (evaluation.status === 'passed') {
      await writeFile(path.join(publicationClaim.stagingAbsolute, 'meaning-boundary-selection.json'),
        formalBytes(evaluation.selection), {flag: 'wx'});
    }
    await writeFile(path.join(publicationClaim.stagingAbsolute,
      'meaning-boundary-validation-report.json'),
      formalBytes(report), {flag: 'wx'});
    const expectedFiles = evaluation.status === 'passed'
      ? ['meaning-boundary-selection.json', 'meaning-boundary-validation-report.json']
      : ['meaning-boundary-validation-report.json'];
    const published = await publishPresentationMeaningOwnedStagingRootNoReplaceV001({
      claim: publicationClaim,
      expectedRelativeFiles: expectedFiles,
    });
    if (published.status !== 'published') throw new Error('output exists');
  } catch (error) {
    throw error;
  }
  return {status: evaluation.status, evaluation, report};
}

export function makePresentationMeaningBoundaryFatalCliResultV001() {
  return Object.freeze({
    exitCode: 2,
    bytes: Buffer.from('{"status":"fatal","violations":[]}\n', 'utf8'),
  });
}

export async function runPresentationMeaningBoundarySelectionCliV001(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || argv.length !== 1) {
    const fatal = makePresentationMeaningBoundaryFatalCliResultV001();
    process.stdout.write(fatal.bytes);
    return fatal.exitCode;
  }
  try {
    const result = await runPresentationMeaningBoundarySelectionJobV001({
      workspaceRoot: process.cwd(), jobPath: argv[0],
    });
    process.stdout.write(formalBytes(result.report));
    return result.status === 'passed' ? 0 : 1;
  } catch {
    const fatal = makePresentationMeaningBoundaryFatalCliResultV001();
    process.stdout.write(fatal.bytes);
    return fatal.exitCode;
  }
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  void runPresentationMeaningBoundarySelectionCliV001().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
