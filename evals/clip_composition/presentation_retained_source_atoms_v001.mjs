import {createHash} from 'node:crypto';

export const PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL = import.meta.url;

export const PRESENTATION_RETAINED_SOURCE_ATOMS_JOB_SCHEMA_VERSION =
  'presentation-retained-source-atoms-job-v001';
export const PRESENTATION_RETAINED_SOURCE_ATOMS_SCHEMA_VERSION =
  'presentation-retained-source-atoms-v001';
export const PRESENTATION_RETAINED_SOURCE_ATOM_SELECTION_VERSION =
  'presentation-retained-source-atom-selection-v001';
export const PRESENTATION_RETAINED_SOURCE_ATOMS_GENERATION_MANIFEST_SCHEMA_VERSION =
  'presentation-retained-source-atoms-generation-manifest-v001';
export const PRESENTATION_RETAINED_SOURCE_ATOMS_VALIDATION_REPORT_SCHEMA_VERSION =
  'presentation-retained-source-atoms-validation-report-v001';
export const PRESENTATION_RETAINED_SOURCE_ATOMS_EXTRACTOR_VERSION =
  'presentation-retained-source-atoms-extractor-v001';

export const PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'expectedProjection',
  'approvalBinding',
  'baseMediaBinding',
  'sourceIdentityBinding',
  'sttCompleteness',
  'sttCrossCheck',
  'candidateGrouping',
  'segmentContainment',
  'rawAtomContract',
  'hashGraph',
  'publishPreconditions',
]);

export const PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES = Object.freeze([
  'RETAINED_ATOMS_JOB_INVALID',
  'RETAINED_ATOMS_JOB_FILE_MISMATCH',
  'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH',
  'RETAINED_ATOMS_EXPECTED_PROJECTION_MISMATCH',
  'RETAINED_ATOMS_INPUT_PATH_UNSAFE',
  'RETAINED_ATOMS_INPUT_HASH_MISMATCH',
  'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED',
  'RETAINED_ATOMS_ASSEMBLY_INVALID',
  'RETAINED_ATOMS_APPROVAL_INVALID',
  'RETAINED_ATOMS_UNRESOLVED_EDITS',
  'RETAINED_ATOMS_BASE_MEDIA_NOT_PASSED',
  'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH',
  'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH',
  'RETAINED_ATOMS_MEDIA_EQUIVALENCE_INVALID',
  'RETAINED_ATOMS_STT_INCOMPLETE',
  'RETAINED_ATOMS_STT_COUNT_MISMATCH',
  'RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH',
  'RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH',
  'RETAINED_ATOMS_GROUPING_INVALID',
  'RETAINED_ATOMS_SEGMENT_INVALID',
  'RETAINED_ATOMS_BOUNDARY_PARTIAL_OVERLAP',
  'RETAINED_ATOMS_MULTIPLE_SEGMENT_MATCH',
  'RETAINED_ATOMS_EMPTY',
  'RETAINED_ATOMS_RAW_CONTRACT_INVALID',
  'RETAINED_ATOMS_HASH_GRAPH_INVALID',
  'RETAINED_ATOMS_OUTPUT_PATH_UNSAFE',
  'RETAINED_ATOMS_OUTPUT_EXISTS',
  'RETAINED_ATOMS_OUTPUT_LOCK_CONFLICT',
  'RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED',
  'RETAINED_ATOMS_ATOMIC_COMMIT_FAILED',
  'RETAINED_ATOMS_BUILD_FAILED',
]);

export const PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES = Object.freeze([
  'sourceIdentity',
  'candidateManifest',
  'assemblyDecision',
  'formalizationReceipt',
  'timeline',
  'baseMediaGenerationManifest',
  'baseMediaValidationReport',
]);

export const PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES = Object.freeze([
  'sttManifest',
  'transcript',
  'wordTimestamps',
  'mediaEquivalence',
  'trustedArtifactSummary',
  'basisEditPlan',
  'baseMedia',
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const ATOM_ID_PATTERN = /^word-([1-9][0-9]*)$/;
const CODE_ORDER = new Map(
  PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES.map((code, index) => [code, index]),
);
const CHECK_BY_CODE = Object.freeze({
  RETAINED_ATOMS_JOB_INVALID: 'jobBinding',
  RETAINED_ATOMS_JOB_FILE_MISMATCH: 'jobBinding',
  RETAINED_ATOMS_IMPLEMENTATION_MISMATCH: 'implementationBinding',
  RETAINED_ATOMS_EXPECTED_PROJECTION_MISMATCH: 'expectedProjection',
  RETAINED_ATOMS_INPUT_PATH_UNSAFE: 'publishPreconditions',
  RETAINED_ATOMS_INPUT_HASH_MISMATCH: 'hashGraph',
  RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED: 'hashGraph',
  RETAINED_ATOMS_ASSEMBLY_INVALID: 'approvalBinding',
  RETAINED_ATOMS_APPROVAL_INVALID: 'approvalBinding',
  RETAINED_ATOMS_UNRESOLVED_EDITS: 'approvalBinding',
  RETAINED_ATOMS_BASE_MEDIA_NOT_PASSED: 'baseMediaBinding',
  RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH: 'baseMediaBinding',
  RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH: 'sourceIdentityBinding',
  RETAINED_ATOMS_MEDIA_EQUIVALENCE_INVALID: 'sourceIdentityBinding',
  RETAINED_ATOMS_STT_INCOMPLETE: 'sttCompleteness',
  RETAINED_ATOMS_STT_COUNT_MISMATCH: 'sttCompleteness',
  RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH: 'sttCrossCheck',
  RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH: 'candidateGrouping',
  RETAINED_ATOMS_GROUPING_INVALID: 'candidateGrouping',
  RETAINED_ATOMS_SEGMENT_INVALID: 'segmentContainment',
  RETAINED_ATOMS_BOUNDARY_PARTIAL_OVERLAP: 'segmentContainment',
  RETAINED_ATOMS_MULTIPLE_SEGMENT_MATCH: 'segmentContainment',
  RETAINED_ATOMS_EMPTY: 'segmentContainment',
  RETAINED_ATOMS_RAW_CONTRACT_INVALID: 'rawAtomContract',
  RETAINED_ATOMS_HASH_GRAPH_INVALID: 'hashGraph',
  RETAINED_ATOMS_OUTPUT_PATH_UNSAFE: 'publishPreconditions',
  RETAINED_ATOMS_OUTPUT_EXISTS: 'publishPreconditions',
  RETAINED_ATOMS_OUTPUT_LOCK_CONFLICT: 'publishPreconditions',
  RETAINED_ATOMS_PUBLISH_PRECONDITION_FAILED: 'publishPreconditions',
  RETAINED_ATOMS_ATOMIC_COMMIT_FAILED: 'publishPreconditions',
  RETAINED_ATOMS_BUILD_FAILED: 'hashGraph',
});

const EXPECTED_DIRECT_SCHEMAS = Object.freeze({
  sourceIdentity: 'presentation-real-data-source-identity-v001',
  candidateManifest: 'presentation-internal-trim-review-candidate-manifest-v001',
  assemblyDecision: 'presentation-base-media-assembly-decision-v001',
  formalizationReceipt: 'presentation-first-real-data-assembly-formalization-receipt-v001',
  timeline: 'presentation-base-media-timeline-v002',
  baseMediaGenerationManifest: 'presentation-base-media-generation-manifest-v002',
  baseMediaValidationReport: 'presentation-base-media-validation-report-v001',
});

const EXPECTED_EXPANDED_SCHEMAS = Object.freeze({
  sttManifest: 'clip_composition_local_stt_chunked_manifest',
  transcript: 'transcript_json',
  wordTimestamps: 'clip_composition_word_timestamps',
  mediaEquivalence: 'presentation-source-media-equivalence-v001',
  trustedArtifactSummary: 'presentation-first-real-data-artifact-build-summary-v001',
  basisEditPlan: 'presentation-real-data-basis-edit-plan-v001',
  baseMedia: null,
});

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isInteger = (value) => Number.isInteger(value) && Number.isFinite(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const exactFields = (value, fields) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};

export const canonicalJsonV001 = (value) => JSON.stringify(canonicalize(value));
export const sha256CanonicalV001 = (value) => createHash('sha256')
  .update(canonicalJsonV001(value))
  .digest('hex');
export const sha256BytesV001 = (value) => createHash('sha256').update(value).digest('hex');
export const serializeJsonFileV001 = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
export const serializePresentationRetainedSourceAtomsJsonV001 = serializeJsonFileV001;
export const prettyJsonBytesV001 = serializeJsonFileV001;

export const makePresentationRetainedSourceAtomsViolationV001 = (
  code,
  pathValue,
  details = {},
) => {
  if (!PRESENTATION_RETAINED_SOURCE_ATOMS_VIOLATION_CODES.includes(code)) {
    throw new TypeError(`unknown retained-source-atoms violation code: ${code}`);
  }
  return {
    code,
    path: isNonEmptyString(pathValue) ? pathValue : '$',
    details: isObject(details) ? canonicalize(details) : {value: details},
  };
};

const sortViolations = (violations) => [...violations].sort((left, right) => {
  const codeOrder = CODE_ORDER.get(left.code) - CODE_ORDER.get(right.code);
  if (codeOrder !== 0) return codeOrder;
  return canonicalJsonV001(left).localeCompare(canonicalJsonV001(right), 'en');
});

const addViolation = (violations, code, pathValue, details = {}) => {
  violations.push(makePresentationRetainedSourceAtomsViolationV001(code, pathValue, details));
};

const makeChecks = (violations, unavailableChecks = new Set()) => Object.fromEntries(
  PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES.map((name) => {
    const codes = violations
      .filter((violation) => CHECK_BY_CODE[violation.code] === name)
      .map((violation) => violation.code);
    if (codes.length > 0) {
      return [name, {status: 'failed', violationCodes: [...new Set(codes)]}];
    }
    if (unavailableChecks.has(name)) {
      return [name, {status: 'not_run_with_upstream_failure', violationCodes: []}];
    }
    return [name, {status: 'passed', violationCodes: []}];
  }),
);

const validateReference = (value) => exactFields(value, ['path', 'fileSha256'])
  && isNonEmptyString(value.path)
  && SHA256_PATTERN.test(value.fileSha256);

const sameReference = (left, right) => validateReference(left)
  && validateReference(right)
  && left.path === right.path
  && left.fileSha256 === right.fileSha256;

const sameJson = (left, right) => canonicalJsonV001(left) === canonicalJsonV001(right);

const validateProjectionEntry = (value, kind) => {
  if (kind === 'segment') {
    return exactFields(value, ['timelineSegmentId', 'atomCount', 'atomIdsCanonicalSha256'])
      && isNonEmptyString(value.timelineSegmentId)
      && isInteger(value.atomCount)
      && value.atomCount >= 0
      && SHA256_PATTERN.test(value.atomIdsCanonicalSha256);
  }
  return exactFields(value, ['speechId', 'atomCount'])
    && isInteger(value.speechId)
    && isInteger(value.atomCount)
    && value.atomCount >= 0;
};

export function validatePresentationRetainedSourceAtomsJobV001(job) {
  const violations = [];
  if (!exactFields(job, [
    'schemaVersion',
    'jobId',
    'artifactId',
    'candidateId',
    'declaredAtomGranularity',
    'implementationBinding',
    'inputs',
    'expectedProjection',
    'outputDirectory',
  ])) {
    addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', '$', {reason: 'top-level-exact-fields'});
    return {status: 'failed', violations: sortViolations(violations)};
  }

  if (job.schemaVersion !== PRESENTATION_RETAINED_SOURCE_ATOMS_JOB_SCHEMA_VERSION) {
    addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', '$.schemaVersion', {actual: job.schemaVersion});
  }
  for (const field of ['jobId', 'artifactId', 'outputDirectory']) {
    if (!isNonEmptyString(job[field])) {
      addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', `$.${field}`, {reason: 'non-empty-string-required'});
    }
  }
  if (!isInteger(job.candidateId)) {
    addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', '$.candidateId', {reason: 'integer-required'});
  }
  if (job.declaredAtomGranularity !== 'character-timestamp') {
    addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', '$.declaredAtomGranularity', {
      expected: 'character-timestamp', actual: job.declaredAtomGranularity,
    });
  }

  const implementation = job.implementationBinding;
  if (!exactFields(implementation, ['gitCommit', 'files'])
    || !COMMIT_PATTERN.test(implementation?.gitCommit ?? '')
    || !Array.isArray(implementation?.files)
    || implementation.files.length !== 2) {
    addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', '$.implementationBinding', {
      reason: 'invalid-implementation-binding',
    });
  } else {
    const expectedRoles = ['core', 'runner'];
    implementation.files.forEach((file, index) => {
      if (!exactFields(file, ['role', 'path', 'fileSha256'])
        || file.role !== expectedRoles[index]
        || !isNonEmptyString(file.path)
        || !SHA256_PATTERN.test(file.fileSha256 ?? '')) {
        addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', `$.implementationBinding.files[${index}]`, {
          reason: 'invalid-implementation-file-binding', expectedRole: expectedRoles[index],
        });
      }
    });
  }

  if (!exactFields(job.inputs, PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES)) {
    addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', '$.inputs', {reason: 'direct-input-exact-fields'});
  } else {
    for (const role of PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES) {
      const expectedFields = role === 'assemblyDecision'
        ? ['path', 'fileSha256', 'payloadCanonicalSha256']
        : ['path', 'fileSha256'];
      const reference = job.inputs[role];
      if (!exactFields(reference, expectedFields)
        || !isNonEmptyString(reference?.path)
        || !SHA256_PATTERN.test(reference?.fileSha256 ?? '')
        || (role === 'assemblyDecision'
          && !SHA256_PATTERN.test(reference?.payloadCanonicalSha256 ?? ''))) {
        addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', `$.inputs.${role}`, {
          reason: 'invalid-input-reference',
        });
      }
    }
  }

  const projection = job.expectedProjection;
  if (!exactFields(projection, ['sourceAtomCount', 'rawSourceAtomsCanonicalSha256', 'segments', 'speechGroups'])
    || !isInteger(projection?.sourceAtomCount)
    || projection.sourceAtomCount < 1
    || !SHA256_PATTERN.test(projection?.rawSourceAtomsCanonicalSha256 ?? '')
    || !Array.isArray(projection?.segments)
    || projection.segments.length < 1
    || !projection.segments.every((entry) => validateProjectionEntry(entry, 'segment'))
    || !Array.isArray(projection?.speechGroups)
    || projection.speechGroups.length < 1
    || !projection.speechGroups.every((entry) => validateProjectionEntry(entry, 'speech'))) {
    addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', '$.expectedProjection', {
      reason: 'invalid-expected-projection',
    });
  } else {
    const segmentIds = projection.segments.map((entry) => entry.timelineSegmentId);
    const speechIds = projection.speechGroups.map((entry) => entry.speechId);
    if (new Set(segmentIds).size !== segmentIds.length
      || new Set(speechIds).size !== speechIds.length
      || speechIds.some((value, index) => index > 0 && value <= speechIds[index - 1])) {
      addViolation(violations, 'RETAINED_ATOMS_JOB_INVALID', '$.expectedProjection', {
        reason: 'projection-order-or-uniqueness',
      });
    }
  }

  return {
    status: violations.length === 0 ? 'passed' : 'failed',
    violations: sortViolations(violations),
  };
}

const validateRoleRecords = (records, expectedRoles, expectedSchemas, violations, pathPrefix) => {
  const result = new Map();
  if (!Array.isArray(records) || records.length !== expectedRoles.length) {
    addViolation(violations, 'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', pathPrefix, {
      reason: 'role-record-count', expectedRoles,
    });
    return result;
  }
  records.forEach((record, index) => {
    const expectedRole = expectedRoles[index];
    if (!isObject(record) || record.role !== expectedRole) {
      addViolation(violations, 'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', `${pathPrefix}[${index}]`, {
        reason: 'role-order', expectedRole, actualRole: record?.role ?? null,
      });
      return;
    }
    if (!isNonEmptyString(record.path) || !SHA256_PATTERN.test(record.fileSha256 ?? '')) {
      addViolation(violations, 'RETAINED_ATOMS_INPUT_HASH_MISMATCH', `${pathPrefix}[${index}]`, {
        reason: 'invalid-loaded-record-reference', role: expectedRole,
      });
    }
    const actualSchema = record.value?.schemaVersion ?? record.value?.kind ?? null;
    if (record.schemaVersion !== actualSchema || actualSchema !== expectedSchemas[expectedRole]) {
      addViolation(violations, 'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', `${pathPrefix}[${index}].schemaVersion`, {
        role: expectedRole, expected: expectedSchemas[expectedRole], declared: record.schemaVersion ?? null,
        actual: actualSchema,
      });
    }
    if (expectedRole !== 'baseMedia' && !isObject(record.value)) {
      addViolation(violations, 'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', `${pathPrefix}[${index}].value`, {
        reason: 'json-object-required', role: expectedRole,
      });
    }
    if (expectedRole === 'baseMedia' && record.value !== null && record.value !== undefined) {
      addViolation(violations, 'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', `${pathPrefix}[${index}].value`, {
        reason: 'base-media-must-not-be-parsed',
      });
    }
    result.set(expectedRole, record);
  });
  return result;
};

const readRecord = (map, role) => map.get(role)?.value;
const recordReference = (record) => record ? {path: record.path, fileSha256: record.fileSha256} : null;
const recordForManifest = (record) => ({
  role: record.role,
  path: record.path,
  fileSha256: record.fileSha256,
  schemaVersion: record.schemaVersion,
});

const compareReference = (violations, code, pathValue, expected, record) => {
  const expectedReferenceValid = isObject(expected)
    && isNonEmptyString(expected.path)
    && SHA256_PATTERN.test(expected.fileSha256 ?? '');
  if (!record || !expectedReferenceValid
    || expected.path !== record.path
    || expected.fileSha256 !== record.fileSha256) {
    addViolation(violations, code, pathValue, {
      expected: expectedReferenceValid
        ? {path: expected.path, fileSha256: expected.fileSha256}
        : null,
      actual: record ? recordReference(record) : null,
    });
    return false;
  }
  return true;
};

const validateImplementation = (job, implementation, violations) => {
  if (!isObject(implementation)
    || !Array.isArray(implementation.files)
    || implementation.files.length !== 2
    || !isObject(implementation.runtime)) {
    addViolation(violations, 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$.implementation', {
      reason: 'runtime-implementation-record-invalid',
    });
    return;
  }
  const actualByRole = new Map(implementation.files.map((entry) => [entry.role, entry]));
  for (const expected of job.implementationBinding.files ?? []) {
    const actual = actualByRole.get(expected.role);
    if (!actual
      || actual.path !== expected.path
      || actual.actualFileSha256 !== expected.fileSha256) {
      addViolation(violations, 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', `$.implementation.files.${expected.role}`, {
        expectedPath: expected.path,
        actualPath: actual?.path ?? null,
        expectedFileSha256: expected.fileSha256,
        actualFileSha256: actual?.actualFileSha256 ?? null,
      });
    }
  }
  if (!isNonEmptyString(implementation.runtime.resolvedNodePath)
    || !SHA256_PATTERN.test(implementation.runtime.nodeFileSha256 ?? '')
    || !isNonEmptyString(implementation.runtime.nodeVersion)) {
    addViolation(violations, 'RETAINED_ATOMS_IMPLEMENTATION_MISMATCH', '$.implementation.runtime', {
      reason: 'runtime-diagnostic-invalid',
    });
  }
};

const validateDirectInputBindings = (job, directMap, violations) => {
  for (const role of PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES) {
    compareReference(violations, 'RETAINED_ATOMS_INPUT_HASH_MISMATCH', `$.inputs.${role}`, job.inputs?.[role], directMap.get(role));
  }
};

const validateApprovalAndSegments = (job, directMap, violations) => {
  const decision = readRecord(directMap, 'assemblyDecision');
  const formalization = readRecord(directMap, 'formalizationReceipt');
  const timeline = readRecord(directMap, 'timeline');
  const generation = readRecord(directMap, 'baseMediaGenerationManifest');
  const validation = readRecord(directMap, 'baseMediaValidationReport');
  if (!isObject(decision?.payload) || !Array.isArray(decision.payload.segments)) {
    addViolation(violations, 'RETAINED_ATOMS_ASSEMBLY_INVALID', '$.directInputs.assemblyDecision.payload', {
      reason: 'segments-missing',
    });
    return [];
  }
  const payloadSha = sha256CanonicalV001(decision.payload);
  if (payloadSha !== job.inputs.assemblyDecision.payloadCanonicalSha256
    || decision.approval?.targetPayloadSha256 !== payloadSha
    || formalization?.formalization?.decisionPayloadSha256 !== payloadSha
    || formalization?.references?.assemblyDecision?.payloadSha256 !== payloadSha
    || generation?.assemblyDecision?.payloadSha256 !== payloadSha
    || validation?.inputs?.assemblyDecision?.payloadSha256 !== payloadSha) {
    addViolation(violations, 'RETAINED_ATOMS_APPROVAL_INVALID', '$.directInputs.assemblyDecision.payload', {
      reason: 'payload-sha-chain-mismatch', actualPayloadSha256: payloadSha,
    });
  }
  if (decision.approval?.status !== 'approved' || decision.approval?.approverType !== 'human') {
    addViolation(violations, 'RETAINED_ATOMS_APPROVAL_INVALID', '$.directInputs.assemblyDecision.approval', {
      status: decision.approval?.status ?? null,
      approverType: decision.approval?.approverType ?? null,
    });
  }
  if (!Array.isArray(decision.payload.unresolvedEdits)) {
    addViolation(violations, 'RETAINED_ATOMS_ASSEMBLY_INVALID', '$.directInputs.assemblyDecision.payload.unresolvedEdits', {
      reason: 'array-required',
    });
  } else if (decision.payload.unresolvedEdits.length !== 0) {
    addViolation(violations, 'RETAINED_ATOMS_UNRESOLVED_EDITS', '$.directInputs.assemblyDecision.payload.unresolvedEdits', {
      count: decision.payload.unresolvedEdits.length,
    });
  }
  if (formalization?.status !== 'passed' || formalization?.formalization?.mappingsMatchViewedVariant !== true) {
    addViolation(violations, 'RETAINED_ATOMS_APPROVAL_INVALID', '$.directInputs.formalizationReceipt', {
      reason: 'formalization-not-passed',
    });
  }
  const candidate = readRecord(directMap, 'candidateManifest');
  if (formalization?.selection?.candidateId !== job.candidateId
    || formalization?.selection?.candidateId !== candidate?.candidate?.candidateId
    || !isNonEmptyString(formalization?.selection?.variantId)
    || formalization?.selection?.variantId !== formalization?.references?.selectedMedia?.variantId) {
    addViolation(violations, 'RETAINED_ATOMS_APPROVAL_INVALID', '$.directInputs.formalizationReceipt.selection', {
      reason: 'candidate-or-selected-variant-mismatch',
    });
  }
  if (!isObject(formalization?.references?.assemblyDecision)
    || formalization.references.assemblyDecision.path !== directMap.get('assemblyDecision')?.path
    || formalization.references.assemblyDecision.fileSha256 !== directMap.get('assemblyDecision')?.fileSha256
    || formalization.references.assemblyDecision.payloadSha256 !== payloadSha) {
    addViolation(violations, 'RETAINED_ATOMS_APPROVAL_INVALID', '$.directInputs.formalizationReceipt.references.assemblyDecision', {
      reason: 'assembly-decision-reference-mismatch',
    });
  }

  const decisionSegments = decision.payload.segments;
  const formalSegments = formalization?.formalization?.segments;
  const formalMappings = formalization?.formalization?.derivedMappings;
  const viewedMappings = formalization?.selection?.viewedMappings;
  const timelineSegments = timeline?.segments;
  const generationSegments = generation?.segments;
  const segmentArraysValid = [formalSegments, formalMappings, viewedMappings, timelineSegments, generationSegments]
    .every((value) => Array.isArray(value) && value.length === decisionSegments.length);
  if (!segmentArraysValid) {
    addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', '$.segments', {
      reason: 'segment-array-count-mismatch',
    });
  }

  const normalized = [];
  const candidateOuterRange = readRecord(directMap, 'candidateManifest')?.candidate?.outerRange;
  let previousEnd = null;
  let previousOutputFrame = 0;
  let previousOutputSample = 0;
  for (let index = 0; index < decisionSegments.length; index += 1) {
    const segment = decisionSegments[index];
    if (!isObject(segment)
      || !isInteger(segment.sourceStartMs)
      || !isInteger(segment.sourceEndMs)
      || segment.sourceStartMs >= segment.sourceEndMs) {
      addViolation(violations, 'RETAINED_ATOMS_SEGMENT_INVALID', `$.segments[${index}]`, {
        reason: 'invalid-half-open-range',
      });
      continue;
    }
    if (!isObject(candidateOuterRange)
      || segment.sourceStartMs < candidateOuterRange.startMs
      || segment.sourceEndMs > candidateOuterRange.endMs) {
      addViolation(violations, 'RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH', `$.segments[${index}]`, {
        reason: 'formal-segment-outside-candidate-outer-range',
      });
    }
    if (previousEnd !== null && segment.sourceStartMs < previousEnd) {
      addViolation(violations, 'RETAINED_ATOMS_SEGMENT_INVALID', `$.segments[${index}]`, {
        reason: 'positive-segment-overlap', previousEndMs: previousEnd,
      });
    }
    previousEnd = segment.sourceEndMs;
    const timelineSegment = timelineSegments?.[index];
    const generationSegment = generationSegments?.[index];
    const formalMapping = formalMappings?.[index];
    const viewedMapping = viewedMappings?.[index];
    const formalSegment = formalSegments?.[index];
    const expectedRange = {sourceStartMs: segment.sourceStartMs, sourceEndMs: segment.sourceEndMs};
    if (!sameJson(formalSegment, expectedRange)
      || ![timelineSegment, generationSegment, formalMapping, viewedMapping].every((entry) => (
        entry?.sourceStartMs === segment.sourceStartMs
        && entry?.sourceEndMs === segment.sourceEndMs
      ))) {
      addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', `$.segments[${index}]`, {
        reason: 'source-range-mismatch',
      });
    }
    const timelineSegmentId = timelineSegment?.segmentId;
    if (!isNonEmptyString(timelineSegmentId)
      || generationSegment?.segmentId !== timelineSegmentId
      || formalMapping?.segmentId !== timelineSegmentId
      || viewedMapping?.segmentId !== timelineSegmentId) {
      addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', `$.segments[${index}].segmentId`, {
        reason: 'segment-id-mismatch',
      });
    }
    const mappingProjection = (entry) => entry && ({
      sourceStartFrame30: entry.sourceStartFrame30,
      sourceEndFrame30: entry.sourceEndFrame30,
      outputStartFrame: entry.outputStartFrame,
      outputEndFrame: entry.outputEndFrame,
    });
    if (!sameJson(mappingProjection(timelineSegment), mappingProjection(generationSegment))
      || !sameJson(mappingProjection(timelineSegment), mappingProjection(formalMapping))
      || !sameJson(mappingProjection(timelineSegment), mappingProjection(viewedMapping))) {
      addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', `$.segments[${index}]`, {
        reason: 'frame-mapping-mismatch',
      });
    }
    const frameFields = [
      timelineSegment?.sourceStartFrame30,
      timelineSegment?.sourceEndFrame30,
      timelineSegment?.outputStartFrame,
      timelineSegment?.outputEndFrame,
    ];
    const audio = generationSegment?.audioSamples;
    const audioFields = [audio?.sourceStart, audio?.sourceEnd, audio?.outputStart, audio?.outputEnd];
    if (!frameFields.every(isInteger)
      || timelineSegment.sourceStartFrame30 >= timelineSegment.sourceEndFrame30
      || timelineSegment.outputStartFrame !== previousOutputFrame
      || timelineSegment.outputStartFrame >= timelineSegment.outputEndFrame
      || !audioFields.every(isInteger)
      || audio.sourceStart >= audio.sourceEnd
      || audio.outputStart !== previousOutputSample
      || audio.outputStart >= audio.outputEnd) {
      addViolation(violations, 'RETAINED_ATOMS_SEGMENT_INVALID', `$.segments[${index}]`, {
        reason: 'frame-or-audio-mapping-invalid',
      });
    } else {
      previousOutputFrame = timelineSegment.outputEndFrame;
      previousOutputSample = audio.outputEnd;
    }
    if (!sameJson(generationSegment?.audioSamples, formalMapping?.audioSamples)
      || !sameJson(generationSegment?.audioSamples, viewedMapping?.audioSamples)) {
      addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', `$.segments[${index}].audioSamples`, {
        reason: 'audio-sample-mapping-mismatch',
      });
    }
    normalized.push({
      timelineSegmentId: timelineSegment?.segmentId,
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      outputStartFrame: timelineSegment?.outputStartFrame,
      outputEndFrame: timelineSegment?.outputEndFrame,
    });
  }
  if (timeline?.baseMedia?.expectedFrameCount !== formalization?.selection?.expectedFrameCount
    || generation?.outputs?.baseMedia?.frameCount !== formalization?.selection?.expectedFrameCount) {
    addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', '$.expectedFrameCount', {
      reason: 'frame-count-mismatch',
    });
  }
  const finalFormalAudio = formalMappings?.at(-1)?.audioSamples?.outputEnd;
  const finalViewedAudio = viewedMappings?.at(-1)?.audioSamples?.outputEnd;
  if (finalFormalAudio !== formalization?.selection?.expectedAudioSampleCount
    || finalViewedAudio !== formalization?.selection?.expectedAudioSampleCount) {
    addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', '$.expectedAudioSampleCount', {
      reason: 'audio-sample-count-mismatch',
    });
  }
  return normalized;
};

const validateBaseMedia = (job, directMap, expandedMap, violations) => {
  const timelineRecord = directMap.get('timeline');
  const generationRecord = directMap.get('baseMediaGenerationManifest');
  const validationRecord = directMap.get('baseMediaValidationReport');
  const timeline = timelineRecord?.value;
  const generation = generationRecord?.value;
  const validation = validationRecord?.value;
  const baseMediaRecord = expandedMap.get('baseMedia');

  const requiredBaseChecks = [
    'approvalBinding', 'sourceBinding', 'videoQc', 'audioQc', 'timelineQc', 'hashGraph',
    'publishPreconditions',
  ];
  if (validation?.status !== 'passed'
    || !Array.isArray(validation?.violations)
    || validation.violations.length !== 0
    || !exactFields(validation?.checks, requiredBaseChecks)
    || Object.values(validation.checks).some((check) => check?.status !== 'passed'
      || !Array.isArray(check?.violationCodes)
      || check.violationCodes.length !== 0)) {
    addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_NOT_PASSED', '$.directInputs.baseMediaValidationReport', {});
  }
  if (generation?.schemaVersion !== 'presentation-base-media-generation-manifest-v002'
    || timeline?.schemaVersion !== 'presentation-base-media-timeline-v002') {
    addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', '$.baseMedia', {
      reason: 'v002-required',
    });
  }
  const timelineHash = timelineRecord?.fileSha256;
  const baseHash = baseMediaRecord?.fileSha256;
  if (generation?.outputs?.timeline?.fileSha256 !== timelineHash
    || validation?.outputs?.timeline?.fileSha256 !== timelineHash
    || generation?.outputs?.baseMedia?.fileSha256 !== baseHash
    || validation?.outputs?.baseMedia?.fileSha256 !== baseHash
    || timeline?.baseMedia?.fileSha256 !== baseHash
    || generation?.outputs?.baseMedia?.artifactId !== timeline?.baseMedia?.artifactId
    || validation?.outputs?.baseMedia?.artifactId !== timeline?.baseMedia?.artifactId
    || generation?.outputs?.timeline?.timelineId !== timeline?.timelineId
    || validation?.outputs?.timeline?.timelineId !== timeline?.timelineId
    || validation?.buildId !== generation?.buildId
    || validation?.outputs?.generationManifest?.buildId !== generation?.buildId
    || validation?.outputs?.generationManifest?.fileSha256 !== generationRecord?.fileSha256) {
    addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', '$.baseMedia', {
      reason: 'timeline-media-hash-or-id-chain',
    });
  }
  const decision = readRecord(directMap, 'assemblyDecision');
  if (generation?.assemblyDecision?.decisionId !== decision?.decisionId
    || generation?.assemblyDecision?.fileSha256 !== directMap.get('assemblyDecision')?.fileSha256
    || validation?.inputs?.assemblyDecision?.fileSha256 !== directMap.get('assemblyDecision')?.fileSha256) {
    addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', '$.baseMedia.assemblyDecision', {
      reason: 'assembly-decision-chain',
    });
  }
  if (generation?.assemblyDecision?.approvalRecordId !== decision?.approval?.recordId) {
    addViolation(violations, 'RETAINED_ATOMS_BASE_MEDIA_BINDING_MISMATCH', '$.baseMedia.assemblyDecision.approvalRecordId', {
      reason: 'approval-record-id-mismatch',
    });
  }
  return {
    timelineId: timeline?.timelineId,
    baseMediaArtifactId: timeline?.baseMedia?.artifactId,
    baseMediaFileSha256: baseHash,
  };
};

const validateSourceIdentity = (directMap, expandedMap, violations) => {
  const sourceRecord = directMap.get('sourceIdentity');
  const candidateRecord = directMap.get('candidateManifest');
  const formalization = readRecord(directMap, 'formalizationReceipt');
  const source = sourceRecord?.value;
  const candidate = candidateRecord?.value;
  const mediaRecord = expandedMap.get('mediaEquivalence');
  const trustedRecord = expandedMap.get('trustedArtifactSummary');
  const basisRecord = expandedMap.get('basisEditPlan');
  const sttRecord = expandedMap.get('sttManifest');
  const transcriptRecord = expandedMap.get('transcript');
  const wordsRecord = expandedMap.get('wordTimestamps');
  const baseMediaGeneration = readRecord(directMap, 'baseMediaGenerationManifest');
  const decision = readRecord(directMap, 'assemblyDecision');

  if (!isNonEmptyString(source?.sourceRef)
    || !isNonEmptyString(source?.sourceProvenance)
    || source?.executionMedia?.fileSha256 !== baseMediaGeneration?.source?.fileSha256
    || source?.sourceRef !== baseMediaGeneration?.source?.sourceRef
    || source?.sourceProvenance !== baseMediaGeneration?.source?.sourceProvenance) {
    addViolation(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.sourceIdentity', {
      reason: 'source-identity-base-media-chain',
    });
  }
  if (decision?.payload?.sourceArtifact?.sourceRef !== source?.sourceRef
    || decision?.payload?.sourceArtifact?.sourceProvenance !== source?.sourceProvenance
    || decision?.payload?.sourceArtifact?.sourceUri !== source?.sourceUrl
    || decision?.payload?.sourceArtifact?.fileSha256 !== source?.executionMedia?.fileSha256
    || baseMediaGeneration?.source?.path !== source?.executionMedia?.path
    || readRecord(directMap, 'baseMediaValidationReport')?.inputs?.sourceMedia?.path !== source?.executionMedia?.path
    || readRecord(directMap, 'baseMediaValidationReport')?.inputs?.sourceMedia?.fileSha256
      !== source?.executionMedia?.fileSha256) {
    addViolation(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.assemblyDecision.payload.sourceArtifact', {
      reason: 'assembly-source-artifact-chain',
    });
  }
  compareReference(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.sourceIdentity.stt.manifest', source?.stt?.manifest, sttRecord);
  compareReference(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.sourceIdentity.stt.transcript', source?.stt?.transcript, transcriptRecord);
  compareReference(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.sourceIdentity.stt.wordTimestamps', source?.stt?.wordTimestamps, wordsRecord);
  compareReference(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.sourceIdentity.mediaEquivalence', source?.mediaEquivalence, mediaRecord);

  if (!sameReference(candidate?.references?.sourceIdentity, recordReference(sourceRecord))
    || !sameReference(candidate?.references?.sttManifest, recordReference(sttRecord))
    || !sameReference(candidate?.references?.wordTimestamps, recordReference(wordsRecord))
    || !sameReference(candidate?.references?.mediaEquivalence, recordReference(mediaRecord))
    || !sameReference(candidate?.references?.basisEditPlan, recordReference(basisRecord))) {
    addViolation(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.candidateManifest.references', {
      reason: 'candidate-reference-chain',
    });
  }
  if (!sameReference(formalization?.references?.trustedArtifactSummary, recordReference(trustedRecord))
    || !sameReference(formalization?.references?.sourceIdentity, recordReference(sourceRecord))
    || !sameReference(formalization?.references?.basisEditPlan, recordReference(basisRecord))) {
    addViolation(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.formalizationReceipt.references', {
      reason: 'formalization-reference-chain',
    });
  }
  const trusted = trustedRecord?.value;
  if (trusted?.status !== 'passed'
    || !sameReference(trusted?.artifactBindings?.candidateManifest, recordReference(candidateRecord))
    || !sameReference(trusted?.artifactBindings?.sourceIdentity, recordReference(sourceRecord))
    || !sameReference(trusted?.artifactBindings?.mediaEquivalence, recordReference(mediaRecord))
    || !sameReference(trusted?.artifactBindings?.basisEditPlan, recordReference(basisRecord))) {
    addViolation(violations, 'RETAINED_ATOMS_SOURCE_IDENTITY_MISMATCH', '$.trustedArtifactSummary', {
      reason: 'trusted-artifact-summary-chain',
    });
  }
  const media = mediaRecord?.value;
  if (media?.status !== 'passed'
    || (hasOwn(media ?? {}, 'violations')
      && (!Array.isArray(media.violations) || media.violations.length !== 0))
    || !Array.isArray(media?.checks)
    || media.checks.some((check) => check?.status !== 'passed')
    || media?.artifacts?.newExecutionMedia?.fileSha256 !== source?.executionMedia?.fileSha256
    || media?.artifacts?.newExecutionMedia?.path !== source?.executionMedia?.path
    || media?.artifacts?.sttManifest?.fileSha256 !== sttRecord?.fileSha256
    || media?.artifacts?.sttTranscript?.fileSha256 !== transcriptRecord?.fileSha256
    || media?.artifacts?.sttWordTimestamps?.fileSha256 !== wordsRecord?.fileSha256) {
    addViolation(violations, 'RETAINED_ATOMS_MEDIA_EQUIVALENCE_INVALID', '$.mediaEquivalence', {});
  }
  const basis = basisRecord?.value;
  if (basis?.candidate?.candidateId !== candidate?.candidate?.candidateId
    || basis?.candidate?.title !== candidate?.candidate?.title
    || !sameJson(basis?.candidate?.outerRange, candidate?.candidate?.outerRange)
    || !sameReference(basis?.references?.sourceIdentity, recordReference(sourceRecord))
    || !sameReference(basis?.references?.mediaEquivalence, recordReference(mediaRecord))) {
    addViolation(violations, 'RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH', '$.basisEditPlan.candidate', {
      reason: 'candidate-or-reference-mismatch',
    });
  }
  const decisionBasis = decision?.payload?.basisEditPlan;
  const generationBasis = baseMediaGeneration?.basisEditPlan;
  const validationBasis = readRecord(directMap, 'baseMediaValidationReport')?.inputs?.basisEditPlan;
  if (decisionBasis?.kind !== basis?.kind
    || decisionBasis?.path !== basisRecord?.path
    || decisionBasis?.fileSha256 !== basisRecord?.fileSha256
    || generationBasis?.kind !== basis?.kind
    || generationBasis?.path !== basisRecord?.path
    || generationBasis?.fileSha256 !== basisRecord?.fileSha256
    || validationBasis?.path !== basisRecord?.path
    || validationBasis?.fileSha256 !== basisRecord?.fileSha256) {
    addViolation(violations, 'RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH', '$.basisEditPlan.bindings', {
      reason: 'assembly-generation-validation-basis-chain',
    });
  }
  return {
    sourceRef: source?.sourceRef,
    sourceProvenance: source?.sourceProvenance,
  };
};

const validateStt = (expandedMap, violations) => {
  const manifest = readRecord(expandedMap, 'sttManifest');
  const transcript = readRecord(expandedMap, 'transcript');
  const words = readRecord(expandedMap, 'wordTimestamps');
  const segments = transcript?.segments;
  const wordItems = words?.words;
  const boundary = manifest?.boundaryResolution;
  if (manifest?.kind !== 'clip_composition_local_stt_chunked_manifest'
    || transcript?.kind !== 'transcript_json'
    || words?.kind !== 'clip_composition_word_timestamps') {
    addViolation(violations, 'RETAINED_ATOMS_INPUT_SCHEMA_UNSUPPORTED', '$.stt.kind', {
      manifestKind: manifest?.kind ?? null,
      transcriptKind: transcript?.kind ?? null,
      wordTimestampsKind: words?.kind ?? null,
    });
  }
  if (manifest?.partial !== false
    || manifest?.processedChunkCount !== manifest?.fullChunkCount
    || manifest?.hasWordTimestamps !== true
    || boundary?.discardedSegmentCount !== 0
    || boundary?.clampedSegmentCount !== 0
    || boundary?.discardedWordCount !== 0
    || boundary?.clampedWordCount !== 0) {
    addViolation(violations, 'RETAINED_ATOMS_STT_INCOMPLETE', '$.sttManifest', {});
  }
  if (!Array.isArray(segments)
    || !Array.isArray(wordItems)
    || manifest?.segmentCount !== segments?.length
    || manifest?.wordTimestampCount !== wordItems?.length
    || transcript?.segmentCount !== segments?.length
    || words?.wordCount !== wordItems?.length
    || segments?.length !== wordItems?.length) {
    addViolation(violations, 'RETAINED_ATOMS_STT_COUNT_MISMATCH', '$.stt', {
      manifestSegmentCount: manifest?.segmentCount ?? null,
      transcriptCount: segments?.length ?? null,
      manifestWordCount: manifest?.wordTimestampCount ?? null,
      wordCount: wordItems?.length ?? null,
    });
    return [];
  }
  const atoms = [];
  const ids = new Set();
  let previousStart = null;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const word = wordItems[index];
    const segmentFields = hasOwn(segment ?? {}, 'speaker')
      ? ['id', 'startMs', 'endMs', 'text', 'speaker']
      : ['id', 'startMs', 'endMs', 'text'];
    const wordFields = hasOwn(word ?? {}, 'speaker')
      ? ['text', 'startMs', 'endMs', 'speaker', 'segmentId']
      : ['text', 'startMs', 'endMs', 'segmentId'];
    if (!exactFields(segment, segmentFields) || !exactFields(word, wordFields)
      || segment.id !== word.segmentId
      || segment.text !== word.text
      || segment.startMs !== word.startMs
      || segment.endMs !== word.endMs
      || !sameJson(segment.speaker, word.speaker)) {
      addViolation(violations, 'RETAINED_ATOMS_STT_CROSSCHECK_MISMATCH', `$.stt[${index}]`, {
        segmentId: segment?.id ?? null, wordSegmentId: word?.segmentId ?? null,
      });
      continue;
    }
    const atomId = `word-${segment.id}`;
    if (!isInteger(segment.id)
      || segment.id <= 0
      || ids.has(atomId)
      || !isNonEmptyString(segment.text)
      || !isInteger(segment.startMs)
      || !isInteger(segment.endMs)
      || segment.startMs >= segment.endMs
      || (previousStart !== null && segment.startMs < previousStart)) {
      addViolation(violations, 'RETAINED_ATOMS_RAW_CONTRACT_INVALID', `$.transcript.segments[${index}]`, {
        atomId, reason: 'id-text-time-order-contract',
      });
      continue;
    }
    ids.add(atomId);
    previousStart = segment.startMs;
    atoms.push({
      atomId,
      text: segment.text,
      startMs: segment.startMs,
      endMs: segment.endMs,
      ...(hasOwn(segment, 'speaker') ? {speaker: segment.speaker} : {}),
      sourceIndex: index,
    });
  }
  return atoms;
};

const canonicalSpeech = (value) => canonicalJsonV001(value);

const collectCandidateGroups = (job, directMap, sttAtoms, violations) => {
  const candidate = readRecord(directMap, 'candidateManifest');
  if (candidate?.candidate?.candidateId !== job.candidateId
    || !isObject(candidate?.candidate?.outerRange)
    || !Array.isArray(candidate?.reviewItems)) {
    addViolation(violations, 'RETAINED_ATOMS_CANDIDATE_BINDING_MISMATCH', '$.candidateManifest', {
      reason: 'candidate-id-range-or-review-items',
    });
    return new Map();
  }
  const groups = new Map();
  for (const [itemIndex, item] of candidate.reviewItems.entries()) {
    for (const side of ['beforeUtterance', 'afterUtterance']) {
      const speech = item?.[side];
      if (!exactFields(speech, ['speechId', 'startMs', 'endMs', 'text', 'characters'])
        || !isInteger(speech.speechId)
        || !isNonEmptyString(speech.text)
        || !Array.isArray(speech.characters)) {
        addViolation(violations, 'RETAINED_ATOMS_GROUPING_INVALID', `$.candidateManifest.reviewItems[${itemIndex}].${side}`, {
          reason: 'speech-shape-invalid',
        });
        continue;
      }
      const prior = groups.get(speech.speechId);
      if (prior && canonicalSpeech(prior) !== canonicalSpeech(speech)) {
        addViolation(violations, 'RETAINED_ATOMS_GROUPING_INVALID', `$.candidateManifest.reviewItems[${itemIndex}].${side}`, {
          reason: 'duplicate-speech-copy-mismatch', speechId: speech.speechId,
        });
      } else if (!prior) {
        groups.set(speech.speechId, speech);
      }
    }
  }
  const sttById = new Map(sttAtoms.map((atom) => [atom.atomId, atom]));
  const candidateAtomIds = new Set();
  for (const [speechId, speech] of [...groups.entries()].sort(([left], [right]) => left - right)) {
    let text = '';
    for (const [characterIndex, character] of speech.characters.entries()) {
      const characterPath = `$.candidateManifest.speechGroups.${speechId}.characters[${characterIndex}]`;
      const stt = sttById.get(character?.characterId);
      if (!exactFields(character, ['characterId', 'text', 'startMs', 'endMs'])
        || !ATOM_ID_PATTERN.test(character.characterId ?? '')
        || candidateAtomIds.has(character.characterId)
        || !stt
        || character.text !== stt.text
        || character.startMs !== stt.startMs
        || character.endMs !== stt.endMs) {
        addViolation(violations, 'RETAINED_ATOMS_GROUPING_INVALID', characterPath, {
          reason: candidateAtomIds.has(character?.characterId) ? 'atom-in-multiple-speech-groups' : 'character-stt-mismatch',
          atomId: character?.characterId ?? null,
        });
        continue;
      }
      candidateAtomIds.add(character.characterId);
      text += character.text;
      stt.speechId = speechId;
    }
    if (text !== speech.text
      || speech.startMs !== speech.characters[0]?.startMs
      || speech.endMs !== speech.characters.at(-1)?.endMs) {
      addViolation(violations, 'RETAINED_ATOMS_GROUPING_INVALID', `$.candidateManifest.speechGroups.${speechId}`, {
        reason: 'speech-aggregate-mismatch',
      });
    }
  }
  const outer = candidate.candidate.outerRange;
  const sttOuterIds = new Set(sttAtoms
    .filter((atom) => atom.startMs >= outer.startMs && atom.endMs <= outer.endMs)
    .map((atom) => atom.atomId));
  const missingFromCandidate = [...sttOuterIds].filter((atomId) => !candidateAtomIds.has(atomId));
  const extraInCandidate = [...candidateAtomIds].filter((atomId) => !sttOuterIds.has(atomId));
  if (missingFromCandidate.length > 0 || extraInCandidate.length > 0) {
    addViolation(violations, 'RETAINED_ATOMS_GROUPING_INVALID', '$.candidateManifest.reviewItems', {
      reason: 'candidate-and-stt-outer-range-not-bijective',
      missingAtomIds: missingFromCandidate,
      extraAtomIds: extraInCandidate,
    });
  }
  return groups;
};

const selectAtoms = (
  candidateOuterRange,
  sourceInfo,
  segments,
  sttAtoms,
  speechGroups,
  violations,
) => {
  const outer = candidateOuterRange;
  const groupAtomIds = new Set(speechGroups.flatMap((speech) => (
    speech.characters.map((character) => character.characterId)
  )));
  const retainedBySegment = segments.map(() => []);
  const excluded = [];
  let boundaryPartialOverlapCount = 0;

  for (const atom of sttAtoms) {
    const containing = [];
    const positiveIntersecting = [];
    segments.forEach((segment, index) => {
      if (atom.startMs >= segment.sourceStartMs && atom.endMs <= segment.sourceEndMs) {
        containing.push(index);
      }
      if (Math.min(atom.endMs, segment.sourceEndMs) - Math.max(atom.startMs, segment.sourceStartMs) > 0) {
        positiveIntersecting.push(index);
      }
    });
    if (containing.length > 1) {
      addViolation(violations, 'RETAINED_ATOMS_MULTIPLE_SEGMENT_MATCH', `$.stt.${atom.atomId}`, {
        timelineSegmentIds: containing.map((index) => segments[index].timelineSegmentId),
      });
      continue;
    }
    if (containing.length === 0 && positiveIntersecting.length > 0) {
      boundaryPartialOverlapCount += 1;
      addViolation(violations, 'RETAINED_ATOMS_BOUNDARY_PARTIAL_OVERLAP', `$.stt.${atom.atomId}`, {
        timelineSegmentIds: positiveIntersecting.map((index) => segments[index].timelineSegmentId),
        startMs: atom.startMs, endMs: atom.endMs,
      });
      continue;
    }
    const insideOuter = isObject(outer)
      && atom.startMs >= outer.startMs
      && atom.endMs <= outer.endMs;
    if (!insideOuter) continue;
    if (containing.length === 0) {
      excluded.push(atom);
      continue;
    }
    if (!groupAtomIds.has(atom.atomId) || !isInteger(atom.speechId)) {
      addViolation(violations, 'RETAINED_ATOMS_GROUPING_INVALID', `$.stt.${atom.atomId}`, {
        reason: 'retained-atom-without-candidate-speech',
      });
      continue;
    }
    retainedBySegment[containing[0]].push({
      atomId: atom.atomId,
      speechId: atom.speechId,
      ...(hasOwn(atom, 'speaker') ? {speaker: atom.speaker} : {}),
      text: atom.text,
      startMs: atom.startMs,
      endMs: atom.endMs,
      sourceRef: sourceInfo.sourceRef,
      sourceIndex: atom.sourceIndex,
    });
  }

  const retainedWithSourceIndex = retainedBySegment.flat();
  const rawSourceAtoms = retainedWithSourceIndex.map(({sourceIndex: _sourceIndex, ...atom}) => atom);
  if (rawSourceAtoms.length === 0) {
    addViolation(violations, 'RETAINED_ATOMS_EMPTY', '$.rawSourceAtoms', {});
  }
  const ids = new Set();
  let previousSourceIndex = -1;
  for (const [index, atomWithSourceIndex] of retainedWithSourceIndex.entries()) {
    const {sourceIndex, ...atom} = atomWithSourceIndex;
    if (ids.has(atom.atomId)
      || sourceIndex <= previousSourceIndex
      || !ATOM_ID_PATTERN.test(atom.atomId)
      || !isInteger(atom.speechId)
      || !isNonEmptyString(atom.text)
      || !isInteger(atom.startMs)
      || !isInteger(atom.endMs)
      || atom.startMs >= atom.endMs
      || atom.sourceRef !== sourceInfo.sourceRef) {
      addViolation(violations, 'RETAINED_ATOMS_RAW_CONTRACT_INVALID', `$.rawSourceAtoms[${index}]`, {});
    }
    ids.add(atom.atomId);
    previousSourceIndex = sourceIndex;
  }

  const sourceAtomPositiveOverlaps = [];
  const active = [];
  for (const atom of rawSourceAtoms) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].endMs <= atom.startMs) active.splice(index, 1);
    }
    for (const left of active) {
      const overlapStartMs = Math.max(left.startMs, atom.startMs);
      const overlapEndMs = Math.min(left.endMs, atom.endMs);
      if (overlapEndMs > overlapStartMs) {
        sourceAtomPositiveOverlaps.push({
          leftAtomId: left.atomId,
          rightAtomId: atom.atomId,
          overlapStartMs,
          overlapEndMs,
        });
      }
    }
    active.push(atom);
  }

  return {
    rawSourceAtoms,
    retainedBySegment: retainedBySegment.map((atoms) => atoms.map(({sourceIndex: _sourceIndex, ...atom}) => atom)),
    excluded,
    boundaryPartialOverlapCount,
    sourceAtomPositiveOverlaps,
  };
};

const validateExpectedProjection = (
  expected,
  segments,
  selection,
  speechGroups,
  violations,
) => {
  const rawHash = sha256CanonicalV001(selection.rawSourceAtoms);
  if (selection.rawSourceAtoms.length !== expected.sourceAtomCount
    || rawHash !== expected.rawSourceAtomsCanonicalSha256
    || expected.segments.length !== segments.length) {
    addViolation(violations, 'RETAINED_ATOMS_EXPECTED_PROJECTION_MISMATCH', '$.expectedProjection', {
      expectedSourceAtomCount: expected.sourceAtomCount,
      actualSourceAtomCount: selection.rawSourceAtoms.length,
      expectedRawSourceAtomsCanonicalSha256: expected.rawSourceAtomsCanonicalSha256,
      actualRawSourceAtomsCanonicalSha256: rawHash,
    });
  }
  const expectedSegments = expected.segments ?? [];
  segments.forEach((segment, index) => {
    const ids = selection.retainedBySegment[index]?.map((atom) => atom.atomId) ?? [];
    const expectedSegment = expectedSegments[index];
    if (expectedSegment?.timelineSegmentId !== segment.timelineSegmentId
      || expectedSegment?.atomCount !== ids.length
      || expectedSegment?.atomIdsCanonicalSha256 !== sha256CanonicalV001(ids)) {
      addViolation(violations, 'RETAINED_ATOMS_EXPECTED_PROJECTION_MISMATCH', `$.expectedProjection.segments[${index}]`, {
        timelineSegmentId: segment.timelineSegmentId,
        atomCount: ids.length,
        atomIdsCanonicalSha256: sha256CanonicalV001(ids),
      });
    }
  });
  const actualSpeechGroups = speechGroups
    .map(({speechId}) => speechId)
    .sort((left, right) => left - right)
    .map((speechId) => ({
      speechId,
      atomCount: selection.rawSourceAtoms.filter((atom) => atom.speechId === speechId).length,
    }));
  if (!sameJson(expected.speechGroups, actualSpeechGroups)) {
    addViolation(violations, 'RETAINED_ATOMS_EXPECTED_PROJECTION_MISMATCH', '$.expectedProjection.speechGroups', {
      actual: actualSpeechGroups,
    });
  }
};

const buildSourceAtomsArtifact = (artifact, selectionContext, segments, selection) => {
  const outputSegments = segments.map((segment, index) => {
    const atomIds = selection.retainedBySegment[index].map((atom) => atom.atomId);
    return {
      timelineSegmentId: segment.timelineSegmentId,
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      outputStartFrame: segment.outputStartFrame,
      outputEndFrame: segment.outputEndFrame,
      atomIds,
      atomIdsCanonicalSha256: sha256CanonicalV001(atomIds),
      atomCount: atomIds.length,
    };
  });
  return {
    schemaVersion: PRESENTATION_RETAINED_SOURCE_ATOMS_SCHEMA_VERSION,
    artifactId: artifact.artifactId,
    extractorVersion: PRESENTATION_RETAINED_SOURCE_ATOMS_EXTRACTOR_VERSION,
    sourceRef: artifact.sourceRef,
    sourceProvenance: artifact.sourceProvenance,
    atomGranularity: artifact.declaredAtomGranularity,
    atomProvenance: structuredClone(artifact.atomProvenance),
    selection: {
      policyVersion: PRESENTATION_RETAINED_SOURCE_ATOM_SELECTION_VERSION,
      candidateId: artifact.candidateId,
      assemblyDecisionId: selectionContext.assemblyDecisionId,
      assemblyDecisionPayloadSha256: selectionContext.assemblyDecisionPayloadSha256,
      formalizationId: selectionContext.formalizationId,
      timelineId: selectionContext.timelineId,
      timelineFileSha256: selectionContext.timelineFileSha256,
      baseMediaArtifactId: selectionContext.baseMediaArtifactId,
      baseMediaFileSha256: selectionContext.baseMediaFileSha256,
      intervalSemantics: 'half-open',
      segments: outputSegments,
    },
    rawSourceAtomsCanonicalSha256: sha256CanonicalV001(selection.rawSourceAtoms),
    rawSourceAtoms: selection.rawSourceAtoms,
  };
};

const buildGenerationManifest = (
  artifact,
  selectionContext,
  generation,
  sourceAtoms,
  speechGroups,
  selection,
) => {
  const sourceBytes = prettyJsonBytesV001(sourceAtoms);
  return {
    schemaVersion: PRESENTATION_RETAINED_SOURCE_ATOMS_GENERATION_MANIFEST_SCHEMA_VERSION,
    generatorVersion: PRESENTATION_RETAINED_SOURCE_ATOMS_EXTRACTOR_VERSION,
    job: {
      jobId: generation.job.jobId,
      path: generation.job.path,
      fileSha256: generation.job.fileSha256,
    },
    implementation: {
      approvedGitCommit: generation.implementationBinding.gitCommit,
      files: generation.implementationBinding.files.map((expected) => {
        const actual = generation.implementation.files.find((entry) => entry.role === expected.role);
        return {
          role: expected.role,
          path: expected.path,
          expectedFileSha256: expected.fileSha256,
          actualFileSha256: actual.actualFileSha256,
        };
      }),
      runtime: {
        resolvedNodePath: generation.implementation.runtime.resolvedNodePath,
        nodeFileSha256: generation.implementation.runtime.nodeFileSha256,
        nodeVersion: generation.implementation.runtime.nodeVersion,
        bindingRole: 'diagnostic-not-pass-fail',
      },
    },
    directInputs: generation.directInputs.map(recordForManifest),
    expandedInputs: generation.expandedInputs.map(recordForManifest),
    source: {
      sourceRef: artifact.sourceRef,
      sourceProvenance: artifact.sourceProvenance,
      atomGranularity: artifact.declaredAtomGranularity,
    },
    selection: {
      policyVersion: PRESENTATION_RETAINED_SOURCE_ATOM_SELECTION_VERSION,
      candidateId: artifact.candidateId,
      assemblyDecisionId: selectionContext.assemblyDecisionId,
      assemblyDecisionPayloadSha256: selectionContext.assemblyDecisionPayloadSha256,
      timelineId: sourceAtoms.selection.timelineId,
      intervalSemantics: 'half-open',
      segments: sourceAtoms.selection.segments.map((segment) => ({
        timelineSegmentId: segment.timelineSegmentId,
        sourceStartMs: segment.sourceStartMs,
        sourceEndMs: segment.sourceEndMs,
        atomCount: segment.atomCount,
        firstAtomId: segment.atomIds[0] ?? null,
        lastAtomId: segment.atomIds.at(-1) ?? null,
        atomIdsCanonicalSha256: segment.atomIdsCanonicalSha256,
      })),
    },
    observations: {
      counts: {
        sttAtomCount: generation.sttAtomCount,
        candidateOuterRangeAtomCount: selection.rawSourceAtoms.length + selection.excluded.length,
        retainedAtomCount: selection.rawSourceAtoms.length,
        excludedByAssemblyCount: selection.excluded.length,
        boundaryPartialOverlapCount: selection.boundaryPartialOverlapCount,
      },
      speechGroups: speechGroups.map(({speechId}) => speechId)
        .sort((left, right) => left - right).map((speechId) => {
        const atoms = selection.rawSourceAtoms.filter((atom) => atom.speechId === speechId);
        return {
          speechId,
          atomCount: atoms.length,
          firstAtomId: atoms[0]?.atomId ?? null,
          lastAtomId: atoms.at(-1)?.atomId ?? null,
        };
      }),
      sourceAtomPositiveOverlaps: selection.sourceAtomPositiveOverlaps,
    },
    output: {
      artifactId: artifact.artifactId,
      path: 'source-atoms.json',
      fileSha256: sha256BytesV001(sourceBytes),
      canonicalSha256: sha256CanonicalV001(sourceAtoms),
      rawSourceAtomsCanonicalSha256: sourceAtoms.rawSourceAtomsCanonicalSha256,
    },
  };
};

const buildValidationReport = (artifact, generation, sourceAtoms, generationManifest) => ({
  schemaVersion: PRESENTATION_RETAINED_SOURCE_ATOMS_VALIDATION_REPORT_SCHEMA_VERSION,
  artifactId: artifact.artifactId,
  status: 'passed',
  violations: [],
  job: {path: generation.job.path, fileSha256: generation.job.fileSha256},
  inputs: [...generation.directInputs, ...generation.expandedInputs].map((record) => ({
    role: record.role,
    path: record.path,
    fileSha256: record.fileSha256,
  })),
  outputs: {
    sourceAtoms: {
      artifactId: artifact.artifactId,
      path: 'source-atoms.json',
      fileSha256: sha256BytesV001(prettyJsonBytesV001(sourceAtoms)),
      canonicalSha256: sha256CanonicalV001(sourceAtoms),
    },
    generationManifest: {
      path: 'generation-manifest.json',
      fileSha256: sha256BytesV001(prettyJsonBytesV001(generationManifest)),
      canonicalSha256: sha256CanonicalV001(generationManifest),
    },
  },
  checks: makeChecks([]),
});

const failedBuild = (violations, unavailableChecks = new Set()) => {
  const sorted = sortViolations(violations);
  return {status: 'failed', violations: sorted, checks: makeChecks(sorted, unavailableChecks)};
};

/**
 * Adapterで検査済みのplain objectだけを受け、残存文字の選択と現行3成果物の構築を行う。
 * file I/O、入力schemaの分岐、媒体処理、時刻丸めはこの関数の責務に含めない。
 */
const buildPresentationRetainedSourceAtomsBundleFromNormalizedInternalV001 = (
  input,
  initialViolations = [],
) => {
  const violations = [...initialViolations];
  try {
    if (!exactFields(input, ['artifact', 'selection', 'generation'])
      || !exactFields(input.artifact, [
        'artifactId',
        'candidateId',
        'declaredAtomGranularity',
        'sourceRef',
        'sourceProvenance',
        'atomProvenance',
      ])
      || !exactFields(input.selection, [
        'candidateOuterRange',
        'segments',
        'sttAtoms',
        'speechGroups',
        'expectedProjection',
        'assemblyDecisionId',
        'assemblyDecisionPayloadSha256',
        'formalizationId',
        'timelineId',
        'timelineFileSha256',
        'baseMediaArtifactId',
        'baseMediaFileSha256',
      ])
      || !exactFields(input.generation, [
        'job',
        'implementationBinding',
        'implementation',
        'directInputs',
        'expandedInputs',
        'sttAtomCount',
      ])
      || !isNonEmptyString(input.artifact.artifactId)
      || !isInteger(input.artifact.candidateId)
      || input.artifact.declaredAtomGranularity !== 'character-timestamp'
      || !isNonEmptyString(input.artifact.sourceRef)
      || !isNonEmptyString(input.artifact.sourceProvenance)
      || !exactFields(input.artifact.atomProvenance, [
        'sttManifest',
        'transcript',
        'wordTimestamps',
        'candidateManifest',
      ])
      || !Object.values(input.artifact.atomProvenance).every(validateReference)
      || !exactFields(input.selection.candidateOuterRange, ['startMs', 'endMs'])
      || !isInteger(input.selection.candidateOuterRange.startMs)
      || !isInteger(input.selection.candidateOuterRange.endMs)
      || input.selection.candidateOuterRange.startMs >= input.selection.candidateOuterRange.endMs
      || !Array.isArray(input.selection.segments)
      || input.selection.segments.length === 0
      || !Array.isArray(input.selection.sttAtoms)
      || !Array.isArray(input.selection.speechGroups)
      || input.selection.speechGroups.length === 0
      || !isObject(input.selection.expectedProjection)
      || !isNonEmptyString(input.selection.assemblyDecisionId)
      || !SHA256_PATTERN.test(input.selection.assemblyDecisionPayloadSha256 ?? '')
      || !isNonEmptyString(input.selection.formalizationId)
      || !isNonEmptyString(input.selection.timelineId)
      || !SHA256_PATTERN.test(input.selection.timelineFileSha256 ?? '')
      || !isNonEmptyString(input.selection.baseMediaArtifactId)
      || !SHA256_PATTERN.test(input.selection.baseMediaFileSha256 ?? '')
      || !exactFields(input.generation.job, ['jobId', 'path', 'fileSha256'])
      || !isNonEmptyString(input.generation.job.jobId)
      || !isNonEmptyString(input.generation.job.path)
      || !SHA256_PATTERN.test(input.generation.job.fileSha256 ?? '')
      || !isObject(input.generation.implementationBinding)
      || !isObject(input.generation.implementation)
      || !Array.isArray(input.generation.directInputs)
      || !Array.isArray(input.generation.expandedInputs)
      || !isInteger(input.generation.sttAtomCount)
      || input.generation.sttAtomCount < 0) {
      addViolation(violations, 'RETAINED_ATOMS_BUILD_FAILED', '$.normalizedInput', {
        reason: 'normalized-input-contract-invalid',
      });
      return failedBuild(violations);
    }

    const speechGroups = [...input.selection.speechGroups]
      .sort((left, right) => left.speechId - right.speechId);
    const selection = selectAtoms(
      input.selection.candidateOuterRange,
      {
        sourceRef: input.artifact.sourceRef,
        sourceProvenance: input.artifact.sourceProvenance,
      },
      input.selection.segments,
      input.selection.sttAtoms,
      speechGroups,
      violations,
    );
    validateExpectedProjection(
      input.selection.expectedProjection,
      input.selection.segments,
      selection,
      speechGroups,
      violations,
    );
    if (violations.length > 0) return failedBuild(violations);

    const sourceAtoms = buildSourceAtomsArtifact(
      input.artifact,
      input.selection,
      input.selection.segments,
      selection,
    );
    const generationManifest = buildGenerationManifest(
      input.artifact,
      input.selection,
      input.generation,
      sourceAtoms,
      speechGroups,
      selection,
    );
    const validationReport = buildValidationReport(
      input.artifact,
      input.generation,
      sourceAtoms,
      generationManifest,
    );
    const published = validatePresentationRetainedSourceAtomsPublishedArtifactsV001({
      sourceAtoms,
      generationManifest,
      validationReport,
    });
    if (published.status !== 'passed') return failedBuild(published.violations);
    const serialized = {
      sourceAtomsBytes: serializeJsonFileV001(sourceAtoms),
      generationManifestBytes: serializeJsonFileV001(generationManifest),
      validationReportBytes: serializeJsonFileV001(validationReport),
    };
    return {
      status: 'passed',
      violations: [],
      checks: makeChecks([]),
      sourceAtoms,
      generationManifest,
      validationReport,
      serialized,
    };
  } catch (error) {
    addViolation(violations, 'RETAINED_ATOMS_BUILD_FAILED', '$.normalizedInput', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    });
    return failedBuild(violations);
  }
};

export function buildPresentationRetainedSourceAtomsBundleFromNormalizedV001(input) {
  return buildPresentationRetainedSourceAtomsBundleFromNormalizedInternalV001(input);
}

export function buildPresentationRetainedSourceAtomsV001(context) {
  const violations = [];
  try {
    if (!isObject(context)) {
      addViolation(violations, 'RETAINED_ATOMS_BUILD_FAILED', '$', {reason: 'context-not-object'});
      return failedBuild(violations, new Set(PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES));
    }
    const jobResult = validatePresentationRetainedSourceAtomsJobV001(context.job);
    violations.push(...jobResult.violations);
    if (jobResult.status !== 'passed') {
      return failedBuild(violations, new Set(PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES.slice(1)));
    }
    if (!isObject(context.jobBinding)
      || !isNonEmptyString(context.jobBinding.path)
      || !SHA256_PATTERN.test(context.jobBinding.fileSha256 ?? '')) {
      addViolation(violations, 'RETAINED_ATOMS_JOB_FILE_MISMATCH', '$.jobBinding', {});
    }
    validateImplementation(context.job, context.implementation, violations);
    const directMap = validateRoleRecords(
      context.directInputs,
      PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES,
      EXPECTED_DIRECT_SCHEMAS,
      violations,
      '$.directInputs',
    );
    const expandedMap = validateRoleRecords(
      context.expandedInputs,
      PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES,
      EXPECTED_EXPANDED_SCHEMAS,
      violations,
      '$.expandedInputs',
    );
    validateDirectInputBindings(context.job, directMap, violations);
    if (directMap.size !== PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES.length
      || expandedMap.size !== PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES.length) {
      return failedBuild(violations, new Set(PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES.slice(3)));
    }
    const segments = validateApprovalAndSegments(context.job, directMap, violations);
    const baseInfo = validateBaseMedia(context.job, directMap, expandedMap, violations);
    const sourceInfo = validateSourceIdentity(directMap, expandedMap, violations);
    const sttAtoms = validateStt(expandedMap, violations);
    const groups = collectCandidateGroups(context.job, directMap, sttAtoms, violations);

    const candidateManifest = readRecord(directMap, 'candidateManifest');
    const sourceIdentity = readRecord(directMap, 'sourceIdentity');
    const decision = readRecord(directMap, 'assemblyDecision');
    const formalization = readRecord(directMap, 'formalizationReceipt');
    const normalized = {
      artifact: {
        artifactId: context.job.artifactId,
        candidateId: context.job.candidateId,
        declaredAtomGranularity: context.job.declaredAtomGranularity,
        sourceRef: sourceInfo.sourceRef,
        sourceProvenance: sourceInfo.sourceProvenance,
        atomProvenance: {
          sttManifest: structuredClone(sourceIdentity.stt.manifest),
          transcript: structuredClone(sourceIdentity.stt.transcript),
          wordTimestamps: structuredClone(sourceIdentity.stt.wordTimestamps),
          candidateManifest: recordReference(directMap.get('candidateManifest')),
        },
      },
      selection: {
        candidateOuterRange: structuredClone(candidateManifest.candidate.outerRange),
        segments,
        sttAtoms,
        speechGroups: [...groups.values()],
        expectedProjection: context.job.expectedProjection,
        assemblyDecisionId: decision.decisionId,
        assemblyDecisionPayloadSha256: context.job.inputs.assemblyDecision.payloadCanonicalSha256,
        formalizationId: formalization.formalizationId,
        timelineId: baseInfo.timelineId,
        timelineFileSha256: directMap.get('timeline').fileSha256,
        baseMediaArtifactId: baseInfo.baseMediaArtifactId,
        baseMediaFileSha256: baseInfo.baseMediaFileSha256,
      },
      generation: {
        job: {
          jobId: context.job.jobId,
          path: context.jobBinding.path,
          fileSha256: context.jobBinding.fileSha256,
        },
        implementationBinding: context.job.implementationBinding,
        implementation: context.implementation,
        directInputs: context.directInputs,
        expandedInputs: context.expandedInputs,
        sttAtomCount: readRecord(expandedMap, 'transcript').segments.length,
      },
    };
    return buildPresentationRetainedSourceAtomsBundleFromNormalizedInternalV001(
      normalized,
      violations,
    );
  } catch (error) {
    addViolation(violations, 'RETAINED_ATOMS_BUILD_FAILED', '$', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    });
    return failedBuild(violations);
  }
}

const validateRawSourceAtomsArtifact = (sourceAtoms, violations) => {
  if (!exactFields(sourceAtoms, [
    'schemaVersion', 'artifactId', 'extractorVersion', 'sourceRef', 'sourceProvenance',
    'atomGranularity', 'atomProvenance', 'selection', 'rawSourceAtomsCanonicalSha256',
    'rawSourceAtoms',
  ])
    || sourceAtoms.schemaVersion !== PRESENTATION_RETAINED_SOURCE_ATOMS_SCHEMA_VERSION
    || sourceAtoms.extractorVersion !== PRESENTATION_RETAINED_SOURCE_ATOMS_EXTRACTOR_VERSION
    || sourceAtoms.atomGranularity !== 'character-timestamp'
    || !exactFields(sourceAtoms.atomProvenance, ['sttManifest', 'transcript', 'wordTimestamps', 'candidateManifest'])
    || !Object.values(sourceAtoms.atomProvenance).every(validateReference)
    || !exactFields(sourceAtoms.selection, [
      'policyVersion', 'candidateId', 'assemblyDecisionId', 'assemblyDecisionPayloadSha256',
      'formalizationId', 'timelineId', 'timelineFileSha256', 'baseMediaArtifactId',
      'baseMediaFileSha256', 'intervalSemantics', 'segments',
    ])
    || sourceAtoms.selection.policyVersion !== PRESENTATION_RETAINED_SOURCE_ATOM_SELECTION_VERSION
    || sourceAtoms.selection.intervalSemantics !== 'half-open'
    || !Array.isArray(sourceAtoms.selection.segments)
    || !Array.isArray(sourceAtoms.rawSourceAtoms)) {
    addViolation(violations, 'RETAINED_ATOMS_RAW_CONTRACT_INVALID', '$.sourceAtoms', {
      reason: 'artifact-schema-invalid',
    });
    return;
  }
  const atomById = new Map();
  let previousStart = null;
  for (const [index, atom] of sourceAtoms.rawSourceAtoms.entries()) {
    const allowed = ['atomId', 'speechId', 'speaker', 'text', 'startMs', 'endMs', 'sourceRef'];
    const required = ['atomId', 'speechId', 'text', 'startMs', 'endMs', 'sourceRef'];
    if (!isObject(atom)
      || Object.keys(atom).some((field) => !allowed.includes(field))
      || required.some((field) => !hasOwn(atom, field))
      || !ATOM_ID_PATTERN.test(atom?.atomId ?? '')
      || atomById.has(atom?.atomId)
      || !isInteger(atom?.speechId)
      || !isNonEmptyString(atom?.text)
      || !isInteger(atom?.startMs)
      || !isInteger(atom?.endMs)
      || atom.startMs >= atom.endMs
      || !isNonEmptyString(atom?.sourceRef)
      || atom.sourceRef !== sourceAtoms.sourceRef
      || (previousStart !== null && atom.startMs < previousStart)) {
      addViolation(violations, 'RETAINED_ATOMS_RAW_CONTRACT_INVALID', `$.sourceAtoms.rawSourceAtoms[${index}]`, {});
      continue;
    }
    atomById.set(atom.atomId, atom);
    previousStart = atom.startMs;
  }
  if (sourceAtoms.rawSourceAtomsCanonicalSha256 !== sha256CanonicalV001(sourceAtoms.rawSourceAtoms)) {
    addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.sourceAtoms.rawSourceAtomsCanonicalSha256', {});
  }
  const referenced = new Set();
  let previousSegmentSourceEnd = null;
  let previousSegmentOutputEnd = 0;
  let previousGlobalIndex = -1;
  for (const [segmentIndex, segment] of sourceAtoms.selection.segments.entries()) {
    if (!exactFields(segment, [
      'timelineSegmentId', 'sourceStartMs', 'sourceEndMs', 'outputStartFrame', 'outputEndFrame',
      'atomIds', 'atomIdsCanonicalSha256', 'atomCount',
    ])
      || !isNonEmptyString(segment.timelineSegmentId)
      || !isInteger(segment.sourceStartMs)
      || !isInteger(segment.sourceEndMs)
      || segment.sourceStartMs >= segment.sourceEndMs
      || !isInteger(segment.outputStartFrame)
      || !isInteger(segment.outputEndFrame)
      || segment.outputStartFrame >= segment.outputEndFrame
      || !Array.isArray(segment.atomIds)
      || segment.atomCount !== segment.atomIds.length
      || segment.atomIdsCanonicalSha256 !== sha256CanonicalV001(segment.atomIds)) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', `$.sourceAtoms.selection.segments[${segmentIndex}]`, {
        reason: 'segment-contract-or-hash',
      });
      continue;
    }
    if ((previousSegmentSourceEnd !== null && segment.sourceStartMs < previousSegmentSourceEnd)
      || segment.outputStartFrame !== previousSegmentOutputEnd) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', `$.sourceAtoms.selection.segments[${segmentIndex}]`, {
        reason: 'segment-source-order-or-output-continuity',
      });
    }
    previousSegmentSourceEnd = segment.sourceEndMs;
    previousSegmentOutputEnd = segment.outputEndFrame;
    let previousIndex = -1;
    for (const atomId of segment.atomIds) {
      const atom = atomById.get(atomId);
      const sourceIndex = sourceAtoms.rawSourceAtoms.findIndex((entry) => entry.atomId === atomId);
      if (!atom || referenced.has(atomId) || sourceIndex <= previousIndex
        || sourceIndex <= previousGlobalIndex
        || atom.startMs < segment.sourceStartMs || atom.endMs > segment.sourceEndMs) {
        addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', `$.sourceAtoms.selection.segments[${segmentIndex}].atomIds`, {
          atomId,
        });
      }
      referenced.add(atomId);
      previousIndex = sourceIndex;
      previousGlobalIndex = sourceIndex;
    }
  }
  if (referenced.size !== atomById.size || [...atomById.keys()].some((id) => !referenced.has(id))) {
    addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.sourceAtoms.selection.segments', {
      reason: 'atom-id-bijection-failed',
    });
  }
};

const validateGenerationManifestShape = (value) => {
  if (!exactFields(value, [
    'schemaVersion', 'generatorVersion', 'job', 'implementation', 'directInputs', 'expandedInputs',
    'source', 'selection', 'observations', 'output',
  ])) return false;
  if (!exactFields(value.job, ['jobId', 'path', 'fileSha256'])
    || !exactFields(value.implementation, ['approvedGitCommit', 'files', 'runtime'])
    || !Array.isArray(value.implementation.files)
    || value.implementation.files.length !== 2
    || !value.implementation.files.every((entry) => exactFields(entry, [
      'role', 'path', 'expectedFileSha256', 'actualFileSha256',
    ]))
    || !exactFields(value.implementation.runtime, [
      'resolvedNodePath', 'nodeFileSha256', 'nodeVersion', 'bindingRole',
    ])
    || !Array.isArray(value.directInputs)
    || value.directInputs.length !== PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES.length
    || !Array.isArray(value.expandedInputs)
    || value.expandedInputs.length !== PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES.length
    || ![...value.directInputs, ...value.expandedInputs].every((entry) => exactFields(entry, [
      'role', 'path', 'fileSha256', 'schemaVersion',
    ]))
    || !exactFields(value.source, ['sourceRef', 'sourceProvenance', 'atomGranularity'])
    || !exactFields(value.selection, [
      'policyVersion', 'candidateId', 'assemblyDecisionId', 'assemblyDecisionPayloadSha256',
      'timelineId', 'intervalSemantics', 'segments',
    ])
    || !Array.isArray(value.selection.segments)
    || !value.selection.segments.every((segment) => exactFields(segment, [
      'timelineSegmentId', 'sourceStartMs', 'sourceEndMs', 'atomCount', 'firstAtomId',
      'lastAtomId', 'atomIdsCanonicalSha256',
    ]))
    || !exactFields(value.observations, ['counts', 'speechGroups', 'sourceAtomPositiveOverlaps'])
    || !exactFields(value.observations.counts, [
      'sttAtomCount', 'candidateOuterRangeAtomCount', 'retainedAtomCount',
      'excludedByAssemblyCount', 'boundaryPartialOverlapCount',
    ])
    || !Array.isArray(value.observations.speechGroups)
    || !value.observations.speechGroups.every((group) => exactFields(group, [
      'speechId', 'atomCount', 'firstAtomId', 'lastAtomId',
    ]))
    || !Array.isArray(value.observations.sourceAtomPositiveOverlaps)
    || !value.observations.sourceAtomPositiveOverlaps.every((overlap) => exactFields(overlap, [
      'leftAtomId', 'rightAtomId', 'overlapStartMs', 'overlapEndMs',
    ]))
    || !exactFields(value.output, [
      'artifactId', 'path', 'fileSha256', 'canonicalSha256', 'rawSourceAtomsCanonicalSha256',
    ])) return false;
  const directRoles = value.directInputs.map((entry) => entry.role);
  const expandedRoles = value.expandedInputs.map((entry) => entry.role);
  return sameJson(directRoles, PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES)
    && sameJson(expandedRoles, PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES);
};

const validateValidationReportShape = (value) => {
  if (!exactFields(value, [
    'schemaVersion', 'artifactId', 'status', 'violations', 'job', 'inputs', 'outputs', 'checks',
  ])
    || !exactFields(value.job, ['path', 'fileSha256'])
    || !Array.isArray(value.inputs)
    || value.inputs.length !== PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES.length
      + PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES.length
    || !value.inputs.every((entry) => exactFields(entry, ['role', 'path', 'fileSha256']))
    || !exactFields(value.outputs, ['sourceAtoms', 'generationManifest'])
    || !exactFields(value.outputs.sourceAtoms, [
      'artifactId', 'path', 'fileSha256', 'canonicalSha256',
    ])
    || !exactFields(value.outputs.generationManifest, [
      'path', 'fileSha256', 'canonicalSha256',
    ])
    || !exactFields(value.checks, PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES)
    || !Object.values(value.checks).every((check) => exactFields(check, ['status', 'violationCodes'])
      && ['passed', 'failed', 'not_run_with_upstream_failure'].includes(check.status)
      && Array.isArray(check.violationCodes))) return false;
  return sameJson(
    value.inputs.map((entry) => entry.role),
    [...PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES,
      ...PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES],
  );
};

export function validatePresentationRetainedSourceAtomsPublishedArtifactsV001(bundle) {
  const violations = [];
  try {
    if (!isObject(bundle)) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$', {reason: 'three-artifacts-required'});
      return failedBuild(violations);
    }
    const parseBytes = (bytes, label) => {
      if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) return null;
      try {
        return JSON.parse(Buffer.from(bytes).toString('utf8'));
      } catch {
        addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', label, {reason: 'json-parse-failed'});
        return null;
      }
    };
    const sourceAtoms = bundle.sourceAtoms ?? parseBytes(bundle.sourceAtomsBytes, '$.sourceAtomsBytes');
    const generationManifest = bundle.generationManifest
      ?? parseBytes(bundle.generationManifestBytes, '$.generationManifestBytes');
    const validationReport = bundle.validationReport
      ?? parseBytes(bundle.validationReportBytes, '$.validationReportBytes');
    if (!isObject(sourceAtoms) || !isObject(generationManifest) || !isObject(validationReport)) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$', {reason: 'three-artifacts-required'});
      return failedBuild(violations);
    }
    if (bundle.sourceAtomsBytes
      && !Buffer.from(bundle.sourceAtomsBytes).equals(serializeJsonFileV001(sourceAtoms))) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.sourceAtomsBytes', {
        reason: 'non-canonical-file-serialization',
      });
    }
    if (bundle.generationManifestBytes
      && !Buffer.from(bundle.generationManifestBytes).equals(serializeJsonFileV001(generationManifest))) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.generationManifestBytes', {
        reason: 'non-canonical-file-serialization',
      });
    }
    if (bundle.validationReportBytes
      && !Buffer.from(bundle.validationReportBytes).equals(serializeJsonFileV001(validationReport))) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.validationReportBytes', {
        reason: 'non-canonical-file-serialization',
      });
    }
    validateRawSourceAtomsArtifact(sourceAtoms, violations);
    if (!validateGenerationManifestShape(generationManifest)
      || generationManifest.schemaVersion !== PRESENTATION_RETAINED_SOURCE_ATOMS_GENERATION_MANIFEST_SCHEMA_VERSION
      || generationManifest.generatorVersion !== PRESENTATION_RETAINED_SOURCE_ATOMS_EXTRACTOR_VERSION
      || generationManifest.output?.artifactId !== sourceAtoms.artifactId
      || generationManifest.output?.path !== 'source-atoms.json'
      || generationManifest.output?.fileSha256 !== sha256BytesV001(prettyJsonBytesV001(sourceAtoms))
      || generationManifest.output?.canonicalSha256 !== sha256CanonicalV001(sourceAtoms)
      || generationManifest.output?.rawSourceAtomsCanonicalSha256 !== sourceAtoms.rawSourceAtomsCanonicalSha256) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.generationManifest', {});
    }
    const expectedManifestSelection = {
      policyVersion: PRESENTATION_RETAINED_SOURCE_ATOM_SELECTION_VERSION,
      candidateId: sourceAtoms.selection.candidateId,
      assemblyDecisionId: sourceAtoms.selection.assemblyDecisionId,
      assemblyDecisionPayloadSha256: sourceAtoms.selection.assemblyDecisionPayloadSha256,
      timelineId: sourceAtoms.selection.timelineId,
      intervalSemantics: 'half-open',
      segments: sourceAtoms.selection.segments.map((segment) => ({
        timelineSegmentId: segment.timelineSegmentId,
        sourceStartMs: segment.sourceStartMs,
        sourceEndMs: segment.sourceEndMs,
        atomCount: segment.atomCount,
        firstAtomId: segment.atomIds[0] ?? null,
        lastAtomId: segment.atomIds.at(-1) ?? null,
        atomIdsCanonicalSha256: segment.atomIdsCanonicalSha256,
      })),
    };
    if (!sameJson(generationManifest.selection, expectedManifestSelection)
      || !sameJson(generationManifest.source, {
        sourceRef: sourceAtoms.sourceRef,
        sourceProvenance: sourceAtoms.sourceProvenance,
        atomGranularity: sourceAtoms.atomGranularity,
      })
      || generationManifest.observations?.counts?.retainedAtomCount !== sourceAtoms.rawSourceAtoms.length
      || !Array.isArray(generationManifest.directInputs)
      || !Array.isArray(generationManifest.expandedInputs)) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.generationManifest', {
        reason: 'source-selection-or-observation-mismatch',
      });
    }
    if (!validateValidationReportShape(validationReport)
      || validationReport.schemaVersion !== PRESENTATION_RETAINED_SOURCE_ATOMS_VALIDATION_REPORT_SCHEMA_VERSION
      || validationReport.artifactId !== sourceAtoms.artifactId
      || validationReport.status !== 'passed'
      || !Array.isArray(validationReport.violations)
      || validationReport.violations.length !== 0
      || validationReport.outputs?.sourceAtoms?.fileSha256 !== sha256BytesV001(prettyJsonBytesV001(sourceAtoms))
      || validationReport.outputs?.sourceAtoms?.canonicalSha256 !== sha256CanonicalV001(sourceAtoms)
      || validationReport.outputs?.generationManifest?.fileSha256 !== sha256BytesV001(prettyJsonBytesV001(generationManifest))
      || validationReport.outputs?.generationManifest?.canonicalSha256 !== sha256CanonicalV001(generationManifest)
      || !sameJson(validationReport.checks, makeChecks([]))) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.validationReport', {});
    }
    const manifestInputReferences = [
      ...(generationManifest.directInputs ?? []),
      ...(generationManifest.expandedInputs ?? []),
    ].map((record) => ({role: record.role, path: record.path, fileSha256: record.fileSha256}));
    if (!sameJson(validationReport.inputs, manifestInputReferences)
      || !sameJson(validationReport.job, {
        path: generationManifest.job?.path,
        fileSha256: generationManifest.job?.fileSha256,
      })) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.validationReport.inputs', {
        reason: 'input-or-job-chain-mismatch',
      });
    }
    if (bundle.expectedContext?.sourceAtoms
      && !sameJson(bundle.expectedContext.sourceAtoms, sourceAtoms)) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.sourceAtoms', {
        reason: 'published-source-atoms-differs-from-built',
      });
    }
    if (bundle.expectedContext?.generationManifest
      && !sameJson(bundle.expectedContext.generationManifest, generationManifest)) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.generationManifest', {
        reason: 'published-generation-manifest-differs-from-built',
      });
    }
    if (bundle.expectedContext?.validationReport
      && !sameJson(bundle.expectedContext.validationReport, validationReport)) {
      addViolation(violations, 'RETAINED_ATOMS_HASH_GRAPH_INVALID', '$.validationReport', {
        reason: 'published-validation-report-differs-from-built',
      });
    }
  } catch (error) {
    addViolation(violations, 'RETAINED_ATOMS_BUILD_FAILED', '$', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return violations.length === 0
    ? {status: 'passed', violations: [], checks: makeChecks([])}
    : failedBuild(violations);
}
