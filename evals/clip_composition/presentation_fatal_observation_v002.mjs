export const PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002 =
  'presentation-fatal-observation-v002';

export const PRESENTATION_FATAL_INNER_STAGES_V002 = Object.freeze([
  'runner-bootstrap',
  'job-read',
  'source-media-read',
  'input-read',
  'semantic-rebuild',
  'formal-serialization',
  'crop-frame-inspection',
  'layout-preflight',
  'overlay-render',
  'post-render-qc',
  'publication',
  'failure-report-publication',
  'unknown',
]);

export const PRESENTATION_FATAL_INNER_CODES_V002 = Object.freeze([
  'ERR_FS_FILE_TOO_LARGE',
  'FILE_CHANGED_DURING_READ',
  'NUMERIC_TOKEN_INVALID',
  'FORMAL_JSON_VALUE_INVALID',
  'BINDING_REFERENCE_MISMATCH',
  'REQUIRED_EXPORT_MISSING',
  'OS_PERMISSION_DENIED',
  'CHILD_PROCESS_SPAWN_FAILED',
  'CHILD_PROCESS_EXIT_NONZERO',
  'CHILD_PROCESS_SIGNALLED',
  'PUBLICATION_FAILED',
  'REPORT_TARGET_INVALID',
  'REPORT_PUBLICATION_FAILED',
  'UNCLASSIFIED',
]);

export const PRESENTATION_FATAL_ALLOWED_STAGES_BY_INNER_CODE_V002 = Object.freeze({
  ERR_FS_FILE_TOO_LARGE: Object.freeze([
    'job-read',
    'source-media-read',
    'input-read',
  ]),
  FILE_CHANGED_DURING_READ: Object.freeze([
    'job-read',
    'source-media-read',
    'input-read',
  ]),
  NUMERIC_TOKEN_INVALID: Object.freeze([
    'input-read',
    'semantic-rebuild',
    'layout-preflight',
  ]),
  FORMAL_JSON_VALUE_INVALID: Object.freeze([
    'input-read',
    'semantic-rebuild',
    'formal-serialization',
    'crop-frame-inspection',
    'layout-preflight',
  ]),
  BINDING_REFERENCE_MISMATCH: Object.freeze([
    'job-read',
    'source-media-read',
    'input-read',
    'semantic-rebuild',
    'layout-preflight',
  ]),
  REQUIRED_EXPORT_MISSING: Object.freeze([
    'runner-bootstrap',
    'crop-frame-inspection',
  ]),
  OS_PERMISSION_DENIED: Object.freeze([
    'runner-bootstrap',
    'job-read',
    'source-media-read',
    'input-read',
    'overlay-render',
    'publication',
  ]),
  CHILD_PROCESS_SPAWN_FAILED: Object.freeze([
    'runner-bootstrap',
    'semantic-rebuild',
    'crop-frame-inspection',
    'layout-preflight',
    'overlay-render',
    'post-render-qc',
  ]),
  CHILD_PROCESS_EXIT_NONZERO: Object.freeze([
    'runner-bootstrap',
    'semantic-rebuild',
    'crop-frame-inspection',
    'layout-preflight',
    'overlay-render',
    'post-render-qc',
  ]),
  CHILD_PROCESS_SIGNALLED: Object.freeze([
    'runner-bootstrap',
    'semantic-rebuild',
    'crop-frame-inspection',
    'layout-preflight',
    'overlay-render',
    'post-render-qc',
  ]),
  PUBLICATION_FAILED: Object.freeze(['publication']),
  REPORT_TARGET_INVALID: Object.freeze(['failure-report-publication']),
  REPORT_PUBLICATION_FAILED: Object.freeze(['failure-report-publication']),
  UNCLASSIFIED: Object.freeze(['unknown']),
});

const FATAL_OBSERVATION_KEYS = Object.freeze([
  'schemaVersion',
  'innerStage',
  'targetFile',
  'innerCode',
]);
const TARGET_FILE_KEYS = Object.freeze(['path', 'fileSha256']);
const TARGET_SOURCE_KEYS = Object.freeze(['sourceField', 'path', 'fileSha256']);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export const PRESENTATION_FATAL_TARGET_BOUNDARY_IDS_V002 = Object.freeze([
  'timeline-composition',
  'legacy-caption-b1',
  'meaning-boundary-selection',
  'meaning-information-package',
  'output-runner',
]);

export const PRESENTATION_FATAL_TARGET_SOURCE_FIELDS_BY_BOUNDARY_V002 =
  Object.freeze({
    'timeline-composition': Object.freeze([
      'job',
      'job.implementationBindings[*]',
      'job.approvedContractBindings[*]',
      'job.sourceMedia[*].sourceIdentityBinding',
      'job.sourceMedia[*].mediaBinding',
      'job.sourceMedia[*].retainedSourceAtomsBinding.sourceAtoms',
      'job.sourceMedia[*].retainedSourceAtomsBinding.generationManifest',
      'job.sourceMedia[*].retainedSourceAtomsBinding.validationReport',
    ]),
    'legacy-caption-b1': Object.freeze([
      'job',
      'job.implementationBinding.files[*]',
      'job.implementationBinding.dependencyFiles[*]',
      'job.sourcePackageBinding.manifest',
      'job.sourcePackageBinding.validationReport',
      'job.semanticOutputBinding',
    ]),
    'meaning-boundary-selection': Object.freeze([
      'job',
      'job.implementationBindings[*]',
      'job.approvedContractBindings[*]',
      'job.sourcePackageBinding',
      'job.b6ManifestBinding',
      'job.providerEnvelopeBinding',
      'b6Manifest.b5ManifestBinding',
      'b6Manifest.b6JobBinding',
      'b6Manifest.rawResponseBinding',
      'b6Manifest.generateRequestBinding',
      'providerEnvelope.rawResponseBinding',
      'b5Manifest.generateRequestBinding',
    ]),
    'meaning-information-package': Object.freeze([
      'job',
      'job.implementationBindings[*]',
      'job.approvedContractBindings[*]',
      'job.timelineCompositionDecisionBinding',
      'job.semanticSelectionValidationBinding',
      'job.semanticSelectionBinding',
      'timelineDecision.sourceMedia[*].sourceIdentityBinding',
      'timelineDecision.sourceMedia[*].mediaBinding',
      'timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.sourceAtoms',
      'timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.generationManifest',
      'timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.validationReport',
    ]),
    'output-runner': Object.freeze([
      'job',
      'job.requestBinding',
      'job.implementationBindings[*]',
      'job.approvedContractBindings[*]',
      'request.meaningInformationPackage',
      'request.baseMediaInput.baseMedia',
      'request.baseMediaInput.timeline',
      'request.baseMediaInput.generationManifest',
      'request.baseMediaInput.validationReceipt',
      'request.styleInput.presetBinding.trustedRegistryBindings[*]',
      'request.styleInput.presetBinding.presetRegistry',
      'request.styleInput.presetBinding.presetValidationIndex',
      'request.styleInput.presetBinding.materialValidationIndex',
      'request.styleInput.presetBinding.rendererTrust',
      'request.styleInput.cropPolicy.application',
    ]),
  });

const isRecord = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasExactKeysInOrder = (value, expectedKeys) => (
  isRecord(value)
  && Object.keys(value).length === expectedKeys.length
  && Object.keys(value).every((key, index) => key === expectedKeys[index])
);

const hasExactKeySet = (value, expectedKeys) => {
  if (!isRecord(value)) return false;
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.hasOwn(value, key));
};

const isSafeWorkspaceRelativePath = (value) => {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value)) return false;
  if (value.includes('\\') || value.includes('\0')) return false;
  const segments = value.split('/');
  return segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..');
};

const isValidTargetFile = (value) => (
  hasExactKeysInOrder(value, TARGET_FILE_KEYS)
  && isSafeWorkspaceRelativePath(value.path)
  && typeof value.fileSha256 === 'string'
  && SHA256_PATTERN.test(value.fileSha256)
);

const isValidTargetSource = (value) => (
  hasExactKeysInOrder(value, TARGET_SOURCE_KEYS)
  && typeof value.sourceField === 'string'
  && value.sourceField.length > 0
  && isSafeWorkspaceRelativePath(value.path)
  && typeof value.fileSha256 === 'string'
  && SHA256_PATTERN.test(value.fileSha256)
);

export const validatePresentationFatalObservationV002 = (value) => {
  if (!hasExactKeysInOrder(value, FATAL_OBSERVATION_KEYS)) return false;
  if (value.schemaVersion !== PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002) return false;
  if (!PRESENTATION_FATAL_INNER_STAGES_V002.includes(value.innerStage)) return false;
  if (!PRESENTATION_FATAL_INNER_CODES_V002.includes(value.innerCode)) return false;
  if (value.targetFile !== null && !isValidTargetFile(value.targetFile)) return false;
  if (!PRESENTATION_FATAL_ALLOWED_STAGES_BY_INNER_CODE_V002[value.innerCode]
    .includes(value.innerStage)) return false;

  const isUnclassifiedTriple = value.innerStage === 'unknown'
    && value.targetFile === null
    && value.innerCode === 'UNCLASSIFIED';
  if (value.innerStage === 'unknown' || value.innerCode === 'UNCLASSIFIED') {
    return isUnclassifiedTriple;
  }
  return true;
};

export const buildPresentationFatalObservationV002 = (input) => {
  if (!hasExactKeySet(input, ['innerStage', 'targetFile', 'innerCode'])) {
    throw new TypeError('presentation fatal observation input is invalid');
  }
  const targetFile = input.targetFile === null
    ? null
    : Object.freeze({
      path: input.targetFile?.path,
      fileSha256: input.targetFile?.fileSha256,
    });
  const observation = {
    schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
    innerStage: input.innerStage,
    targetFile,
    innerCode: input.innerCode,
  };
  if (!validatePresentationFatalObservationV002(observation)) {
    throw new TypeError('presentation fatal observation input is invalid');
  }
  return Object.freeze(observation);
};

export const serializePresentationFatalObservationV002 = (value) => {
  if (!validatePresentationFatalObservationV002(value)) {
    throw new TypeError('presentation fatal observation is invalid');
  }
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

export const selectPresentationFatalTargetFileV002 = (input) => {
  if (!hasExactKeySet(input, [
    'boundaryId',
    'sourceField',
    'path',
    'fileSha256',
    'verifiedTargetSources',
    'sourceRecordVerified',
  ])) return null;
  if (input.sourceRecordVerified !== true) return null;
  const allowedSourceFields =
    PRESENTATION_FATAL_TARGET_SOURCE_FIELDS_BY_BOUNDARY_V002[input.boundaryId];
  if (!Array.isArray(allowedSourceFields)) return null;
  if (!allowedSourceFields.includes(input.sourceField)) return null;
  if (!Array.isArray(input.verifiedTargetSources)) return null;
  const candidate = {path: input.path, fileSha256: input.fileSha256};
  if (!isValidTargetFile(candidate)) return null;

  const matchingBindings = input.verifiedTargetSources.filter((binding, index) => (
    Object.hasOwn(input.verifiedTargetSources, index)
    && isValidTargetSource(binding)
    && binding.sourceField === input.sourceField
    && binding.path === input.path
    && binding.fileSha256 === input.fileSha256
  ));
  if (matchingBindings.length !== 1) return null;
  return Object.freeze(candidate);
};

const classifyNodeError = (evidence) => {
  if (!hasExactKeySet(evidence, ['kind', 'code'])) return 'UNCLASSIFIED';
  if (evidence.code === 'ERR_FS_FILE_TOO_LARGE') return 'ERR_FS_FILE_TOO_LARGE';
  if (evidence.code === 'EPERM' || evidence.code === 'EACCES') return 'OS_PERMISSION_DENIED';
  return 'UNCLASSIFIED';
};

const classifyStrictJsonDecode = (evidence) => {
  if (!hasExactKeySet(evidence, ['kind', 'reason'])) return 'UNCLASSIFIED';
  if (typeof evidence.reason !== 'string' || evidence.reason.length === 0) return 'UNCLASSIFIED';
  return evidence.reason === 'number-invalid'
    ? 'NUMERIC_TOKEN_INVALID'
    : 'FORMAL_JSON_VALUE_INVALID';
};

const classifyChildProcess = (evidence) => {
  if (!hasExactKeySet(evidence, ['kind', 'event'])) return 'UNCLASSIFIED';
  if (evidence.event === 'spawn-failed') return 'CHILD_PROCESS_SPAWN_FAILED';
  if (evidence.event === 'exit-nonzero') return 'CHILD_PROCESS_EXIT_NONZERO';
  if (evidence.event === 'signalled') return 'CHILD_PROCESS_SIGNALLED';
  return 'UNCLASSIFIED';
};

export const classifyPresentationFatalInnerCodeV002 = (evidence) => {
  if (!isRecord(evidence) || typeof evidence.kind !== 'string') return 'UNCLASSIFIED';
  if (evidence.kind === 'node-error') return classifyNodeError(evidence);
  if (evidence.kind === 'strict-json-decode') return classifyStrictJsonDecode(evidence);
  if (evidence.kind === 'child-process') return classifyChildProcess(evidence);

  const exactSingleKindClassifications = Object.freeze({
    'file-changed-during-read': 'FILE_CHANGED_DURING_READ',
    'formal-json-value-invalid': 'FORMAL_JSON_VALUE_INVALID',
    'binding-reference-mismatch': 'BINDING_REFERENCE_MISMATCH',
    'required-export-missing': 'REQUIRED_EXPORT_MISSING',
    'publication-failed': 'PUBLICATION_FAILED',
    'report-target-invalid': 'REPORT_TARGET_INVALID',
    'report-publication-failed': 'REPORT_PUBLICATION_FAILED',
    unclassified: 'UNCLASSIFIED',
  });
  if (!hasExactKeySet(evidence, ['kind'])) return 'UNCLASSIFIED';
  return exactSingleKindClassifications[evidence.kind] ?? 'UNCLASSIFIED';
};
