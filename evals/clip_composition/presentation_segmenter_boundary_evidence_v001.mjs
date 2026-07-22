import {createHash} from 'node:crypto';
import {isAbsolute, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL,
  canonicalJsonV001,
  sha256CanonicalV001,
  validatePresentationRetainedSourceAtomsPublishedArtifactsV001,
} from './presentation_retained_source_atoms_v001.mjs';

export const PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'sourceContract',
  'segmentation',
  'coverage',
  'expectedProjection',
  'determinism',
  'readOnlyPreflight',
]);

export const PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES = Object.freeze([
  'SEGMENTER_BOUNDARY_JOB_INVALID',
  'SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH',
  'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH',
  'SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE',
  'SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH',
  'SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED',
  'SEGMENTER_BOUNDARY_SOURCE_VALIDATION_NOT_PASSED',
  'SEGMENTER_BOUNDARY_SOURCE_BINDING_MISMATCH',
  'SEGMENTER_BOUNDARY_RUNTIME_MISMATCH',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_TIME_REVERSED',
  'SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID',
  'SEGMENTER_BOUNDARY_SPEECH_MEMBERSHIP_INVALID',
  'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID',
  'SEGMENTER_BOUNDARY_EVIDENCE_BINDING_MISMATCH',
  'SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID',
  'SEGMENTER_BOUNDARY_SPLITS_SOURCE_ATOM',
  'SEGMENTER_BOUNDARY_CANDIDATE_EMPTY',
  'SEGMENTER_BOUNDARY_CONTAINER_ID_INVALID',
  'SEGMENTER_BOUNDARY_CANDIDATE_ID_INVALID',
  'SEGMENTER_BOUNDARY_CANDIDATE_ID_DUPLICATE',
  'SEGMENTER_BOUNDARY_CANDIDATE_NONCONTIGUOUS',
  'SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SEGMENT',
  'SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SPEECH',
  'SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH',
  'SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_MISSING',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATED',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_ORDER_REVERSED',
  'SEGMENTER_BOUNDARY_EXPECTED_PROJECTION_MISMATCH',
  'SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH',
  'SEGMENTER_BOUNDARY_NONDETERMINISTIC',
  'SEGMENTER_BOUNDARY_READ_ONLY_CONTRACT_VIOLATED',
  'SEGMENTER_BOUNDARY_BUILD_FAILED',
]);

export const PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001 = Object.freeze({
  core: import.meta.url,
  retainedSourceAtomsCore: PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL,
});

const EVIDENCE_SCHEMA_VERSION = 'presentation-segmenter-boundary-evidence-v001';
const GENERATOR_VERSION = 'presentation-segmenter-boundary-evidence-generator-v001';
const POLICY_VERSION = 'presentation-segmenter-boundary-policy-v001';
const CHECK_REPORT_SCHEMA_VERSION = 'presentation-segmenter-boundary-check-report-v001';
const JOB_SCHEMA_VERSION = 'presentation-segmenter-boundary-preflight-job-v001';
const SOURCE_SCHEMA_VERSION = 'presentation-retained-source-atoms-v001';
const SOURCE_MANIFEST_SCHEMA_VERSION =
  'presentation-retained-source-atoms-generation-manifest-v001';
const SOURCE_REPORT_SCHEMA_VERSION =
  'presentation-retained-source-atoms-validation-report-v001';
const ARTIFACT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const CONTAINER_ID_PATTERN = /^segmenter-container-([0-9]{6,})$/;
const CANDIDATE_ID_PATTERN = /^segmenter-boundary-([0-9]{6,})$/;
const WORKSPACE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\).+$/;

const CORE_PATH = 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs';
const RETAINED_CORE_PATH = 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs';
const RUNNER_PATH =
  'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs';
const IMPLEMENTATION_ROLES = Object.freeze(['core', 'retainedSourceAtomsCore', 'runner']);
const IMPLEMENTATION_PATHS = Object.freeze([CORE_PATH, RETAINED_CORE_PATH, RUNNER_PATH]);
const INPUT_ROLES = Object.freeze([
  'sourceAtoms',
  'sourceGenerationManifest',
  'sourceValidationReport',
]);
const INPUT_BASENAMES = Object.freeze([
  'source-atoms.json',
  'generation-manifest.json',
  'validation-report.json',
]);
const INPUT_ROOT =
  'evals/clip_composition/outputs/presentation/retained-source-atoms/';
const FORMAL_OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence';
const WORKSPACE_ROOT_PATH = fileURLToPath(new URL('../../', import.meta.url));

const CHECK_BY_CODE = Object.freeze(Object.fromEntries([
  ['SEGMENTER_BOUNDARY_JOB_INVALID', 'jobBinding'],
  ['SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH', 'jobBinding'],
  ['SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH', 'implementationBinding'],
  ['SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE', 'inputBinding'],
  ['SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH', 'inputBinding'],
  ['SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED', 'inputBinding'],
  ['SEGMENTER_BOUNDARY_SOURCE_VALIDATION_NOT_PASSED', 'inputBinding'],
  ['SEGMENTER_BOUNDARY_SOURCE_BINDING_MISMATCH', 'inputBinding'],
  ['SEGMENTER_BOUNDARY_RUNTIME_MISMATCH', 'runtimeBinding'],
  ['SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID', 'sourceContract'],
  ['SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE', 'sourceContract'],
  ['SEGMENTER_BOUNDARY_SOURCE_ATOM_TIME_REVERSED', 'sourceContract'],
  ['SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID', 'sourceContract'],
  ['SEGMENTER_BOUNDARY_SPEECH_MEMBERSHIP_INVALID', 'sourceContract'],
  ['SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', 'segmentation'],
  ['SEGMENTER_BOUNDARY_EVIDENCE_BINDING_MISMATCH', 'segmentation'],
  ['SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID', 'segmentation'],
  ['SEGMENTER_BOUNDARY_SPLITS_SOURCE_ATOM', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CANDIDATE_EMPTY', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CONTAINER_ID_INVALID', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CANDIDATE_ID_INVALID', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CANDIDATE_ID_DUPLICATE', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CANDIDATE_NONCONTIGUOUS', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SEGMENT', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SPEECH', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH', 'segmentation'],
  ['SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH', 'segmentation'],
  ['SEGMENTER_BOUNDARY_SOURCE_ATOM_MISSING', 'coverage'],
  ['SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATED', 'coverage'],
  ['SEGMENTER_BOUNDARY_SOURCE_ATOM_ORDER_REVERSED', 'coverage'],
  ['SEGMENTER_BOUNDARY_EXPECTED_PROJECTION_MISMATCH', 'expectedProjection'],
  ['SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH', 'segmentation'],
  ['SEGMENTER_BOUNDARY_NONDETERMINISTIC', 'determinism'],
  ['SEGMENTER_BOUNDARY_READ_ONLY_CONTRACT_VIOLATED', 'readOnlyPreflight'],
  ['SEGMENTER_BOUNDARY_BUILD_FAILED', 'segmentation'],
]));
const CODE_ORDER = new Map(
  PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES.map((code, index) => [code, index]),
);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isInteger = (value) => Number.isInteger(value) && Number.isFinite(value);
const isNonNegativeInteger = (value) => isInteger(value) && value >= 0;
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const exactFields = (value, fields) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
const sameCanonical = (left, right) => canonicalJsonV001(left) === canonicalJsonV001(right);
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const serializeEvidence = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const clone = (value) => structuredClone(value);
const compareUtf16 = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const formatOrdinalId = (prefix, ordinal) => `${prefix}${String(ordinal).padStart(6, '0')}`;
const isSafeWorkspacePath = (value) => isNonEmptyString(value)
  && WORKSPACE_PATH_PATTERN.test(value)
  && !value.startsWith('./')
  && !value.includes('//');

const makeViolation = (code, path) => {
  if (!PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES.includes(code)) {
    throw new TypeError(`unknown segmenter-boundary violation code: ${code}`);
  }
  return Object.freeze({code, path, details: Object.freeze({})});
};

const addViolation = (state, code, path) => {
  const key = `${code}\u0000${path}`;
  if (state.violationKeys.has(key)) return;
  state.violationKeys.add(key);
  state.violations.push(makeViolation(code, path));
};

const sortedViolations = (violations) => [...violations].sort((left, right) => {
  const codeDelta = CODE_ORDER.get(left.code) - CODE_ORDER.get(right.code);
  return codeDelta !== 0 ? codeDelta : compareUtf16(left.path, right.path);
});

class SegmenterBoundaryInternalContextError extends TypeError {
  constructor() {
    super('segmenter boundary checker context is invalid');
    this.name = 'SegmenterBoundaryInternalContextError';
  }
}

class SegmenterBoundarySegmenterError extends Error {
  constructor(kind, candidateIndex = null) {
    super('Intl.Segmenter result cannot be mapped to source atom boundaries');
    this.name = 'SegmenterBoundarySegmenterError';
    this.kind = kind;
    this.candidateIndex = candidateIndex;
  }
}

const validateRuntimeShape = (value) => exactFields(value, [
  'nodeBinarySha256',
  'nodeVersion',
  'icuVersion',
  'resolvedLocale',
  'resolvedGranularity',
  'diagnostics',
])
  && SHA256_PATTERN.test(value.nodeBinarySha256)
  && isNonEmptyString(value.nodeVersion)
  && isNonEmptyString(value.icuVersion)
  && value.resolvedLocale === 'ja'
  && value.resolvedGranularity === 'word'
  && exactFields(value.diagnostics, [
    'resolvedNodePath',
    'platform',
    'arch',
    'v8Version',
    'unicodeVersion',
    'cldrVersion',
  ])
  && isAbsolute(value.diagnostics.resolvedNodePath)
  && Object.values(value.diagnostics).every(isNonEmptyString);

const runtimePassFailProjection = (value) => ({
  nodeBinarySha256: value.nodeBinarySha256,
  nodeVersion: value.nodeVersion,
  icuVersion: value.icuVersion,
  resolvedLocale: value.resolvedLocale,
  resolvedGranularity: value.resolvedGranularity,
});

const atomSpeakerValue = (atom) => (hasOwn(atom, 'speaker') ? atom.speaker : null);

const validateGeneratorInputs = ({artifactId, sourceArtifact, sourceArtifactSnapshot, runtimeBinding}) => {
  if (!isNonEmptyString(artifactId)
    || !isObject(sourceArtifact)
    || !exactFields(sourceArtifactSnapshot, ['path', 'fileSha256'])
    || !isSafeWorkspacePath(sourceArtifactSnapshot.path)
    || !SHA256_PATTERN.test(sourceArtifactSnapshot.fileSha256 ?? '')
    || !validateRuntimeShape(runtimeBinding)
    || !Array.isArray(sourceArtifact.rawSourceAtoms)
    || sourceArtifact.rawSourceAtoms.length === 0
    || !isObject(sourceArtifact.selection)
    || !Array.isArray(sourceArtifact.selection.segments)) {
    throw new TypeError('invalid segmenter-boundary generator input');
  }
};

const buildSegmentMembership = (sourceArtifact) => {
  const membership = new Map();
  for (const segment of sourceArtifact.selection.segments) {
    if (!isObject(segment)
      || !isNonEmptyString(segment.timelineSegmentId)
      || !Array.isArray(segment.atomIds)) {
      throw new TypeError('invalid source segment membership');
    }
    for (const atomId of segment.atomIds) {
      if (!isNonEmptyString(atomId) || membership.has(atomId)) {
        throw new TypeError('source atom does not have unique segment membership');
      }
      membership.set(atomId, segment.timelineSegmentId);
    }
  }
  return membership;
};

const buildContainers = (sourceArtifact) => {
  const membership = buildSegmentMembership(sourceArtifact);
  const containers = [];
  let current = null;
  for (const [sourceIndex, atom] of sourceArtifact.rawSourceAtoms.entries()) {
    if (!isObject(atom)
      || !isNonEmptyString(atom.atomId)
      || !isInteger(atom.speechId)
      || !isNonEmptyString(atom.text)) {
      throw new TypeError('invalid source atom for segmentation');
    }
    const timelineSegmentId = membership.get(atom.atomId);
    if (!isNonEmptyString(timelineSegmentId)) {
      throw new TypeError('source atom has no segment membership');
    }
    if (!current
      || current.timelineSegmentId !== timelineSegmentId
      || current.speechId !== atom.speechId) {
      current = {
        containerId: formatOrdinalId('segmenter-container-', containers.length + 1),
        timelineSegmentId,
        speechId: atom.speechId,
        atoms: [],
        sourceIndexes: [],
        text: '',
      };
      containers.push(current);
    }
    current.atoms.push(atom);
    current.sourceIndexes.push(sourceIndex);
    current.text += atom.text;
  }
  if (membership.size !== sourceArtifact.rawSourceAtoms.length) {
    throw new TypeError('segment membership is not a bijection');
  }
  return containers;
};

const mapSegmentToAtoms = (container, segmentStart, segmentEnd) => {
  let cursor = 0;
  let firstIndex = -1;
  let lastIndex = -1;
  for (const [index, atom] of container.atoms.entries()) {
    const start = cursor;
    const end = start + atom.text.length;
    if (start === segmentStart) firstIndex = index;
    if (end === segmentEnd) lastIndex = index;
    cursor = end;
  }
  if (firstIndex < 0 || lastIndex < firstIndex) {
    throw new SegmenterBoundarySegmenterError('split');
  }
  return container.atoms.slice(firstIndex, lastIndex + 1);
};

const segmentContainers = (sourceArtifact) => {
  const segmenter = new Intl.Segmenter('ja', {granularity: 'word'});
  const resolved = segmenter.resolvedOptions();
  if (resolved.locale !== 'ja' || resolved.granularity !== 'word') {
    throw new SegmenterBoundarySegmenterError('output');
  }
  const containers = buildContainers(sourceArtifact);
  const candidates = [];
  for (const container of containers) {
    const containerFirstCandidateIndex = candidates.length;
    const returned = [...segmenter.segment(container.text)];
    if (returned.length === 0) {
      throw new SegmenterBoundarySegmenterError('output', containerFirstCandidateIndex);
    }
    let expectedIndex = 0;
    for (const segment of returned) {
      if (!isObject(segment)
        || !isNonEmptyString(segment.segment)
        || !isNonNegativeInteger(segment.index)
        || typeof segment.isWordLike !== 'boolean') {
        throw new SegmenterBoundarySegmenterError('output', containerFirstCandidateIndex);
      }
      const end = segment.index + segment.segment.length;
      if (segment.index !== expectedIndex
        || end > container.text.length
        || container.text.slice(segment.index, end) !== segment.segment) {
        throw new SegmenterBoundarySegmenterError('output', containerFirstCandidateIndex);
      }
      let atoms;
      try {
        atoms = mapSegmentToAtoms(container, segment.index, end);
      } catch (error) {
        if (error?.name === 'SegmenterBoundarySegmenterError') {
          throw new SegmenterBoundarySegmenterError('split', candidates.length);
        }
        throw error;
      }
      candidates.push({
        boundaryCandidateId: formatOrdinalId('segmenter-boundary-', candidates.length + 1),
        containerId: container.containerId,
        timelineSegmentId: container.timelineSegmentId,
        speechId: container.speechId,
        sourceAtomIds: atoms.map((atom) => atom.atomId),
        text: atoms.map((atom) => atom.text).join(''),
        startAnchor: {atomId: atoms[0].atomId, edge: 'start'},
        endAnchor: {atomId: atoms.at(-1).atomId, edge: 'end'},
        segmenterIndexUtf16: segment.index,
        segmenterLengthUtf16: segment.segment.length,
        isWordLike: segment.isWordLike,
        sourceAtomCount: atoms.length,
      });
      expectedIndex = end;
    }
    if (expectedIndex !== container.text.length) {
      throw new SegmenterBoundarySegmenterError('output', containerFirstCandidateIndex);
    }
  }
  return {containers, candidates};
};

export function buildPresentationSegmenterBoundaryEvidenceV001({
  artifactId,
  sourceArtifact,
  sourceArtifactSnapshot,
  runtimeBinding,
}) {
  validateGeneratorInputs({artifactId, sourceArtifact, sourceArtifactSnapshot, runtimeBinding});
  const {candidates} = segmentContainers(sourceArtifact);
  const membershipProjection = candidates.map((candidate) => ({
    boundaryCandidateId: candidate.boundaryCandidateId,
    sourceAtomIds: [...candidate.sourceAtomIds],
  }));
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    artifactId,
    generatorVersion: GENERATOR_VERSION,
    sourceBinding: {
      sourceArtifactId: sourceArtifact.artifactId,
      sourceArtifactPath: sourceArtifactSnapshot.path,
      sourceArtifactFileSha256: sourceArtifactSnapshot.fileSha256,
      sourceArtifactCanonicalSha256: sha256CanonicalV001(sourceArtifact),
      sourceRef: sourceArtifact.sourceRef,
      sourceProvenance: sourceArtifact.sourceProvenance,
      atomGranularity: sourceArtifact.atomGranularity,
      rawSourceAtomsCanonicalSha256: sourceArtifact.rawSourceAtomsCanonicalSha256,
    },
    runtimeBinding: clone(runtimeBinding),
    segmentationPolicy: {
      policyVersion: POLICY_VERSION,
      engine: 'Intl.Segmenter',
      locale: 'ja',
      granularity: 'word',
      indexUnit: 'utf16-code-unit',
      containerRule: 'maximal-contiguous-run-by-timeline-segment-and-speech-v001',
      candidateIdRule: 'source-order-six-digit-v001',
      unicodeNormalization: 'none',
    },
    boundaryCandidates: candidates,
    boundaryCandidatesCanonicalSha256: sha256CanonicalV001(candidates),
    sourceAtomMembershipCanonicalSha256: sha256CanonicalV001(membershipProjection),
  };
}

const validateContextOuterShape = (context) => {
  if (!exactFields(context, [
    'jobValue',
    'jobSnapshot',
    'observedImplementationBinding',
    'inputSnapshots',
    'runtimeBinding',
    'evidencePasses',
    'buildFailure',
    'readOnlyGuard',
    'productionMode',
  ])
    || !isObject(context.jobSnapshot)
    || !isObject(context.observedImplementationBinding)
    || !Array.isArray(context.inputSnapshots)
    || !(context.runtimeBinding === null || isObject(context.runtimeBinding))
    || !Array.isArray(context.evidencePasses)
    || !(context.buildFailure === null || isObject(context.buildFailure))
    || !(context.readOnlyGuard === null || isObject(context.readOnlyGuard))
    || typeof context.productionMode !== 'boolean') {
    throw new SegmenterBoundaryInternalContextError();
  }
};

const validateExpectedRuntime = (value) => exactFields(value, [
  'nodeBinarySha256', 'nodeVersion', 'icuVersion', 'resolvedLocale', 'resolvedGranularity',
])
  && SHA256_PATTERN.test(value.nodeBinarySha256)
  && isNonEmptyString(value.nodeVersion)
  && isNonEmptyString(value.icuVersion)
  && value.resolvedLocale === 'ja'
  && value.resolvedGranularity === 'word';

const validateProjectionShape = (projection) => {
  if (!exactFields(projection, [
    'sourceAtomCount',
    'containerCount',
    'boundaryCandidateCount',
    'wordLikeCandidateCount',
    'nonWordLikeCandidateCount',
    'timelineSegments',
    'containers',
    'mixedRawSpeakerCandidateCount',
    'rawSpeakerExactSetQueryResults',
    'sourcePositiveOverlapCount',
    'membership',
  ])) return false;
  const scalarFields = [
    'sourceAtomCount',
    'containerCount',
    'boundaryCandidateCount',
    'wordLikeCandidateCount',
    'nonWordLikeCandidateCount',
    'mixedRawSpeakerCandidateCount',
    'sourcePositiveOverlapCount',
  ];
  if (!scalarFields.every((field) => isNonNegativeInteger(projection[field]))) return false;
  if (projection.sourceAtomCount < 1
    || projection.containerCount < 1
    || projection.boundaryCandidateCount < 1
    || !Array.isArray(projection.timelineSegments)
    || !projection.timelineSegments.every((entry) => exactFields(entry, [
      'timelineSegmentId', 'sourceAtomCount', 'boundaryCandidateCount',
    ])
      && isNonEmptyString(entry.timelineSegmentId)
      && isNonNegativeInteger(entry.sourceAtomCount)
      && isNonNegativeInteger(entry.boundaryCandidateCount))
    || !Array.isArray(projection.containers)
    || !projection.containers.every((entry) => exactFields(entry, [
      'containerId', 'timelineSegmentId', 'speechId', 'sourceAtomCount',
      'boundaryCandidateCount',
    ])
      && isNonEmptyString(entry.containerId)
      && isNonEmptyString(entry.timelineSegmentId)
      && isInteger(entry.speechId)
      && isNonNegativeInteger(entry.sourceAtomCount)
      && isNonNegativeInteger(entry.boundaryCandidateCount))
    || !Array.isArray(projection.rawSpeakerExactSetQueryResults)
    || !projection.rawSpeakerExactSetQueryResults.every((entry) => exactFields(entry, [
      'values', 'boundaryCandidateCount',
    ])
      && Array.isArray(entry.values)
      && entry.values.length > 0
      && entry.values.every((value) => value === null || isNonEmptyString(value))
      && new Set(entry.values.map((value) => canonicalJsonV001(value))).size === entry.values.length
      && isNonNegativeInteger(entry.boundaryCandidateCount))
    || !exactFields(projection.membership, [
      'missingCount', 'duplicatedCount', 'orderReversedCount', 'crossSegmentCount',
      'crossSpeechCount',
    ])
    || !Object.values(projection.membership).every(isNonNegativeInteger)) return false;
  const querySets = projection.rawSpeakerExactSetQueryResults.map((entry) =>
    entry.values.map((value) => canonicalJsonV001(value)).sort(compareUtf16).join('\u0000'));
  return new Set(querySets).size === querySets.length;
};

const validateJobValue = (job) => {
  if (!exactFields(job, [
    'schemaVersion',
    'jobId',
    'artifactId',
    'mode',
    'implementationBinding',
    'inputs',
    'expectedSourceBinding',
    'expectedRuntime',
    'expectedProjection',
    'readOnlyGuard',
  ])
    || job.schemaVersion !== JOB_SCHEMA_VERSION
    || !isNonEmptyString(job.jobId)
    || !ARTIFACT_ID_PATTERN.test(job.artifactId ?? '')
    || job.artifactId === '.'
    || job.artifactId === '..'
    || job.mode !== 'read-only-preflight'
    || !exactFields(job.implementationBinding, ['gitCommit', 'files'])
    || !COMMIT_PATTERN.test(job.implementationBinding.gitCommit ?? '')
    || !Array.isArray(job.implementationBinding.files)
    || job.implementationBinding.files.length !== 3
    || !job.implementationBinding.files.every((entry, index) => exactFields(entry, [
      'role', 'path', 'fileSha256',
    ])
      && entry.role === IMPLEMENTATION_ROLES[index]
      && entry.path === IMPLEMENTATION_PATHS[index]
      && SHA256_PATTERN.test(entry.fileSha256 ?? ''))
    || !Array.isArray(job.inputs)
    || job.inputs.length !== 3
    || !job.inputs.every((entry, index) => exactFields(entry, ['role', 'path', 'fileSha256'])
      && entry.role === INPUT_ROLES[index]
      && isSafeWorkspacePath(entry.path)
      && SHA256_PATTERN.test(entry.fileSha256 ?? ''))
    || !exactFields(job.expectedSourceBinding, [
      'sourceArtifactCanonicalSha256', 'rawSourceAtomsCanonicalSha256',
    ])
    || !SHA256_PATTERN.test(job.expectedSourceBinding.sourceArtifactCanonicalSha256 ?? '')
    || !SHA256_PATTERN.test(job.expectedSourceBinding.rawSourceAtomsCanonicalSha256 ?? '')
    || !validateExpectedRuntime(job.expectedRuntime)
    || !validateProjectionShape(job.expectedProjection)
    || !exactFields(job.readOnlyGuard, ['formalOutputPath', 'expectedState'])
    || job.readOnlyGuard.expectedState !== 'absent'
    || job.readOnlyGuard.formalOutputPath !== `${FORMAL_OUTPUT_ROOT}/${job.artifactId}`) {
    return false;
  }
  const parentPaths = job.inputs.map((entry, index) => {
    if (!entry.path.startsWith(INPUT_ROOT) || !entry.path.endsWith(`/${INPUT_BASENAMES[index]}`)) {
      return null;
    }
    return entry.path.slice(0, -(INPUT_BASENAMES[index].length + 1));
  });
  return parentPaths.every(isNonEmptyString) && new Set(parentPaths).size === 1;
};

const issueListExactly = (value, allowedOrder) => Array.isArray(value)
  && value.every((entry) => allowedOrder.includes(entry))
  && new Set(value).size === value.length
  && value.every((entry, index) => index === 0
    || allowedOrder.indexOf(value[index - 1]) < allowedOrder.indexOf(entry));

const validateJobSnapshot = (snapshot) => exactFields(snapshot, [
  'path', 'firstFileSha256', 'secondFileSha256', 'issues',
])
  && isSafeWorkspacePath(snapshot.path)
  && SHA256_PATTERN.test(snapshot.firstFileSha256 ?? '')
  && (snapshot.secondFileSha256 === null || SHA256_PATTERN.test(snapshot.secondFileSha256 ?? ''))
  && issueListExactly(snapshot.issues, ['second_read_failed', 'hash_changed'])
  && ((snapshot.issues.length === 0
    && snapshot.secondFileSha256 === snapshot.firstFileSha256)
    || (sameCanonical(snapshot.issues, ['second_read_failed'])
      && snapshot.secondFileSha256 === null)
    || (sameCanonical(snapshot.issues, ['hash_changed'])
      && snapshot.secondFileSha256 !== null
      && snapshot.secondFileSha256 !== snapshot.firstFileSha256));

const validateSnapshotIssueState = (snapshot, kind) => {
  const pathRead = ['path_unsafe', 'first_read_failed', 'second_read_failed', 'hash_changed'];
  const allowed = kind === 'implementation'
    ? [...pathRead, 'module_url_unavailable', 'module_path_mismatch']
    : [...pathRead.slice(0, 2), 'json_parse_failed', ...pathRead.slice(2)];
  if (!issueListExactly(snapshot.issues, allowed)) return false;
  const issues = new Set(snapshot.issues);
  const pathAxis = pathRead.filter((issue) => issues.has(issue));
  if (pathAxis.length > 1) return false;
  if (issues.has('path_unsafe')) {
    if (snapshot.firstFileSha256 !== null || snapshot.secondFileSha256 !== null) return false;
    if (kind === 'input' && snapshot.document !== null) return false;
    if (issues.size !== 1 && kind === 'input') return false;
  } else if (issues.has('first_read_failed')) {
    if (snapshot.firstFileSha256 !== null || snapshot.secondFileSha256 !== null) return false;
    if (kind === 'input' && snapshot.document !== null) return false;
    if (kind === 'input' && issues.has('json_parse_failed')) return false;
  } else {
    if (!SHA256_PATTERN.test(snapshot.firstFileSha256 ?? '')) return false;
    if (issues.has('second_read_failed')) {
      if (snapshot.secondFileSha256 !== null) return false;
    } else if (!SHA256_PATTERN.test(snapshot.secondFileSha256 ?? '')) return false;
    if (issues.has('hash_changed')) {
      if (snapshot.secondFileSha256 === snapshot.firstFileSha256) return false;
    } else if (!issues.has('second_read_failed')
      && snapshot.secondFileSha256 !== snapshot.firstFileSha256) return false;
  }
  if (kind === 'input') {
    if (issues.has('json_parse_failed')) {
      if (snapshot.document !== null) return false;
    } else if (!issues.has('path_unsafe') && !issues.has('first_read_failed')
      && !isObject(snapshot.document)) return false;
  } else {
    const moduleIssues = ['module_url_unavailable', 'module_path_mismatch']
      .filter((issue) => issues.has(issue));
    if (moduleIssues.length > 1) return false;
    if (issues.has('module_url_unavailable')) {
      if (snapshot.loadedModuleUrl !== null) return false;
    } else if (!isNonEmptyString(snapshot.loadedModuleUrl)) return false;
  }
  return true;
};

const moduleUrlToWorkspacePath = (value) => {
  try {
    const absolute = fileURLToPath(value);
    const pathValue = relative(WORKSPACE_ROOT_PATH, absolute).split(sep).join('/');
    return isSafeWorkspacePath(pathValue) ? pathValue : null;
  } catch {
    return null;
  }
};

const validateInputDocumentSchemas = (snapshots) => snapshots.length === 3
  && snapshots[0].document?.schemaVersion === SOURCE_SCHEMA_VERSION
  && snapshots[1].document?.schemaVersion === SOURCE_MANIFEST_SCHEMA_VERSION
  && snapshots[2].document?.schemaVersion === SOURCE_REPORT_SCHEMA_VERSION;

const sourceBindingMatches = (source, manifest, report, snapshots) => {
  if (!Array.isArray(source.rawSourceAtoms)) return false;
  const expectedSourceCanonical = sha256CanonicalV001(source);
  const expectedRawCanonical = sha256CanonicalV001(source.rawSourceAtoms);
  const sourceFileHash = snapshots[0].firstFileSha256;
  const manifestFileHash = snapshots[1].firstFileSha256;
  return source.rawSourceAtomsCanonicalSha256 === expectedRawCanonical
    && manifest.output?.artifactId === source.artifactId
    && manifest.output?.fileSha256 === sourceFileHash
    && manifest.output?.canonicalSha256 === expectedSourceCanonical
    && manifest.output?.rawSourceAtomsCanonicalSha256 === expectedRawCanonical
    && report.artifactId === source.artifactId
    && report.outputs?.sourceAtoms?.artifactId === source.artifactId
    && report.outputs?.sourceAtoms?.fileSha256 === sourceFileHash
    && report.outputs?.sourceAtoms?.canonicalSha256 === expectedSourceCanonical
    && report.outputs?.generationManifest?.fileSha256 === manifestFileHash
    && report.outputs?.generationManifest?.canonicalSha256 === sha256CanonicalV001(manifest);
};

const addInputSnapshotViolations = (state, snapshot, index) => {
  const pathBase = `$.inputSnapshots[${index}]`;
  if (!isObject(snapshot)
    || !exactFields(snapshot, [
      'role', 'path', 'firstFileSha256', 'secondFileSha256', 'document', 'issues',
    ])) {
    addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED', `${pathBase}.document`);
    return;
  }
  const issues = Array.isArray(snapshot.issues) ? new Set(snapshot.issues) : new Set();
  if (issues.has('path_unsafe')) {
    addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE', `${pathBase}.path`);
  }
  if (['first_read_failed', 'second_read_failed', 'hash_changed']
    .some((issue) => issues.has(issue))) {
    addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH', pathBase);
  }
  if (issues.has('json_parse_failed')) {
    addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED', `${pathBase}.document`);
  }
  if (!validateSnapshotIssueState(snapshot, 'input')) {
    if (!issueListExactly(snapshot.issues, [
      'path_unsafe', 'first_read_failed', 'json_parse_failed', 'second_read_failed', 'hash_changed',
    ])) {
      addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED', `${pathBase}.document`);
    } else if (!issues.has('path_unsafe')
      && !issues.has('first_read_failed')
      && !issues.has('json_parse_failed')) {
      addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH', pathBase);
    }
  }
};

const validateSourceContract = (source, manifest, report, state) => {
  const rawPath = '$.inputSnapshots[0].document.rawSourceAtoms';
  const published = validatePresentationRetainedSourceAtomsPublishedArtifactsV001({
    sourceAtoms: source,
    generationManifest: manifest,
    validationReport: report,
  });
  if (!isObject(source) || !Array.isArray(source.rawSourceAtoms) || source.rawSourceAtoms.length === 0) {
    addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID', rawPath);
    return {usable: false, atomById: new Map(), membership: new Map()};
  }
  const atomById = new Map();
  const rawIndexById = new Map();
  let previousStart = null;
  for (const [index, atom] of source.rawSourceAtoms.entries()) {
    const atomPath = `${rawPath}[${index}]`;
    if (!isObject(atom)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID', atomPath);
      previousStart = null;
      continue;
    }
    const allowed = ['atomId', 'speechId', 'speaker', 'text', 'startMs', 'endMs', 'sourceRef'];
    const required = ['atomId', 'speechId', 'text', 'startMs', 'endMs', 'sourceRef'];
    const genericInvalid = Object.keys(atom).some((key) => !allowed.includes(key))
      || required.some((key) => !hasOwn(atom, key))
      || !isNonEmptyString(atom.atomId)
      || !isNonEmptyString(atom.text)
      || !isInteger(atom.startMs)
      || !isInteger(atom.endMs)
      || (isInteger(atom.startMs) && isInteger(atom.endMs) && atom.startMs >= atom.endMs)
      || !isNonEmptyString(atom.sourceRef)
      || atom.sourceRef !== source.sourceRef
      || (hasOwn(atom, 'speaker') && atom.speaker !== null && !isNonEmptyString(atom.speaker));
    if (genericInvalid) {
      addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID', atomPath);
    }
    if (isNonEmptyString(atom.atomId)) {
      if (atomById.has(atom.atomId)) {
        addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE', `${atomPath}.atomId`);
      } else {
        atomById.set(atom.atomId, atom);
        rawIndexById.set(atom.atomId, index);
      }
    }
    if (!isInteger(atom.speechId)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_SPEECH_MEMBERSHIP_INVALID', `${atomPath}.speechId`);
    }
    if (isInteger(atom.startMs)) {
      if (previousStart !== null && atom.startMs < previousStart) {
        addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_ATOM_TIME_REVERSED', `${atomPath}.startMs`);
      }
      previousStart = atom.startMs;
    } else {
      previousStart = null;
    }
  }

  const membership = new Map();
  const segmentsPath = '$.inputSnapshots[0].document.selection.segments';
  if (!exactFields(source.selection, [
    'policyVersion', 'candidateId', 'assemblyDecisionId', 'assemblyDecisionPayloadSha256',
    'formalizationId', 'timelineId', 'timelineFileSha256', 'baseMediaArtifactId',
    'baseMediaFileSha256', 'intervalSemantics', 'segments',
  ])
    || !Array.isArray(source.selection.segments)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID', segmentsPath);
    return {usable: false, atomById, membership, rawIndexById};
  }
  let previousGlobalIndex = -1;
  for (const [segmentIndex, segment] of source.selection.segments.entries()) {
    const segmentPath = `${segmentsPath}[${segmentIndex}]`;
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
      || segment.atomIds.length === 0
      || segment.atomIds.some((atomId) => !isNonEmptyString(atomId))
      || segment.atomCount !== segment.atomIds.length
      || segment.atomIdsCanonicalSha256 !== sha256CanonicalV001(segment.atomIds)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID', segmentPath);
      continue;
    }
    let previousLocalIndex = -1;
    for (const atomId of segment.atomIds) {
      const rawIndex = rawIndexById.get(atomId);
      const atom = atomById.get(atomId);
      if (rawIndex === undefined
        || membership.has(atomId)
        || rawIndex <= previousLocalIndex
        || rawIndex <= previousGlobalIndex
        || (atom && isInteger(segment.sourceStartMs) && atom.startMs < segment.sourceStartMs)
        || (atom && isInteger(segment.sourceEndMs) && atom.endMs > segment.sourceEndMs)) {
        addViolation(state, 'SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID', segmentPath);
      }
      if (rawIndex !== undefined) {
        membership.set(atomId, segment.timelineSegmentId);
        previousLocalIndex = rawIndex;
        previousGlobalIndex = rawIndex;
      }
    }
  }
  if (membership.size !== atomById.size
    || [...atomById.keys()].some((atomId) => !membership.has(atomId))) {
    addViolation(state, 'SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID', segmentsPath);
  }
  if (published.status !== 'passed'
    && state.violations.every((entry) => CHECK_BY_CODE[entry.code] !== 'sourceContract')) {
    addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID', rawPath);
  }
  return {
    usable: state.violations.every((entry) => CHECK_BY_CODE[entry.code] !== 'sourceContract'),
    atomById,
    membership,
    rawIndexById,
  };
};

const expectedEvidenceBinding = (job, source, sourceSnapshot, runtimeBinding) => ({
  artifactId: job.artifactId,
  sourceBinding: {
    sourceArtifactId: source.artifactId,
    sourceArtifactPath: sourceSnapshot.path,
    sourceArtifactFileSha256: sourceSnapshot.firstFileSha256,
    sourceArtifactCanonicalSha256: sha256CanonicalV001(source),
    sourceRef: source.sourceRef,
    sourceProvenance: source.sourceProvenance,
    atomGranularity: source.atomGranularity,
    rawSourceAtomsCanonicalSha256: source.rawSourceAtomsCanonicalSha256,
  },
  runtimeBinding,
});

const validateEvidenceTopShape = (evidence) => exactFields(evidence, [
  'schemaVersion',
  'artifactId',
  'generatorVersion',
  'sourceBinding',
  'runtimeBinding',
  'segmentationPolicy',
  'boundaryCandidates',
  'boundaryCandidatesCanonicalSha256',
  'sourceAtomMembershipCanonicalSha256',
])
  && evidence.schemaVersion === EVIDENCE_SCHEMA_VERSION
  && isNonEmptyString(evidence.artifactId)
  && evidence.generatorVersion === GENERATOR_VERSION
  && exactFields(evidence.sourceBinding, [
    'sourceArtifactId',
    'sourceArtifactPath',
    'sourceArtifactFileSha256',
    'sourceArtifactCanonicalSha256',
    'sourceRef',
    'sourceProvenance',
    'atomGranularity',
    'rawSourceAtomsCanonicalSha256',
  ])
  && isNonEmptyString(evidence.sourceBinding.sourceArtifactId)
  && isSafeWorkspacePath(evidence.sourceBinding.sourceArtifactPath)
  && SHA256_PATTERN.test(evidence.sourceBinding.sourceArtifactFileSha256 ?? '')
  && SHA256_PATTERN.test(evidence.sourceBinding.sourceArtifactCanonicalSha256 ?? '')
  && isNonEmptyString(evidence.sourceBinding.sourceRef)
  && isNonEmptyString(evidence.sourceBinding.sourceProvenance)
  && evidence.sourceBinding.atomGranularity === 'character-timestamp'
  && SHA256_PATTERN.test(evidence.sourceBinding.rawSourceAtomsCanonicalSha256 ?? '')
  && validateRuntimeShape(evidence.runtimeBinding)
  && exactFields(evidence.segmentationPolicy, [
    'policyVersion', 'engine', 'locale', 'granularity', 'indexUnit', 'containerRule',
    'candidateIdRule', 'unicodeNormalization',
  ])
  && sameCanonical(evidence.segmentationPolicy, {
    policyVersion: POLICY_VERSION,
    engine: 'Intl.Segmenter',
    locale: 'ja',
    granularity: 'word',
    indexUnit: 'utf16-code-unit',
    containerRule: 'maximal-contiguous-run-by-timeline-segment-and-speech-v001',
    candidateIdRule: 'source-order-six-digit-v001',
    unicodeNormalization: 'none',
  })
  && Array.isArray(evidence.boundaryCandidates)
  && SHA256_PATTERN.test(evidence.boundaryCandidatesCanonicalSha256 ?? '')
  && SHA256_PATTERN.test(evidence.sourceAtomMembershipCanonicalSha256 ?? '');

const candidateScalarFieldsReadable = (candidate) => isObject(candidate)
  && typeof candidate.boundaryCandidateId === 'string'
  && typeof candidate.containerId === 'string'
  && isNonEmptyString(candidate.timelineSegmentId)
  && isInteger(candidate.speechId)
  && Array.isArray(candidate.sourceAtomIds)
  && candidate.sourceAtomIds.every(isNonEmptyString)
  && typeof candidate.text === 'string'
  && isNonNegativeInteger(candidate.segmenterIndexUtf16)
  && isNonNegativeInteger(candidate.segmenterLengthUtf16)
  && typeof candidate.isWordLike === 'boolean'
  && isNonNegativeInteger(candidate.sourceAtomCount);

const validateCandidateScalarShape = (candidate) => candidateScalarFieldsReadable(candidate)
  && exactFields(candidate, [
    'boundaryCandidateId', 'containerId', 'timelineSegmentId', 'speechId', 'sourceAtomIds',
    'text', 'startAnchor', 'endAnchor', 'segmenterIndexUtf16', 'segmenterLengthUtf16',
    'isWordLike', 'sourceAtomCount',
  ])
  && candidate.sourceAtomCount === candidate.sourceAtomIds.length;

const anchorShapeReadable = (value) => isObject(value);
const anchorShapeValid = (value, edge) => exactFields(value, ['atomId', 'edge'])
  && isNonEmptyString(value.atomId)
  && value.edge === edge;

const validateEvidence = (evidence, passIndex, context, state, sourceData) => {
  const passPath = `$.evidencePasses[${passIndex}]`;
  if (!validateEvidenceTopShape(evidence)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', passPath);
    return {shapeReadable: false, segmentation: null};
  }
  const job = context.jobValue;
  const source = context.inputSnapshots[0].document;
  const binding = expectedEvidenceBinding(
    job,
    source,
    context.inputSnapshots[0],
    context.runtimeBinding,
  );
  if (evidence.artifactId !== binding.artifactId
    || !sameCanonical(evidence.sourceBinding, binding.sourceBinding)
    || !sameCanonical(evidence.runtimeBinding, binding.runtimeBinding)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_BINDING_MISMATCH', passPath);
  }

  let expectedSegmentation = null;
  try {
    expectedSegmentation = segmentContainers(source);
  } catch (error) {
    if (error?.name === 'SegmenterBoundarySegmenterError') {
      const candidateIndex = isNonNegativeInteger(error.candidateIndex)
        ? error.candidateIndex
        : 0;
      if (error.kind === 'split') {
        const candidatePath = candidateIndex < evidence.boundaryCandidates.length
          ? `${passPath}.boundaryCandidates[${candidateIndex}].sourceAtomIds`
          : `${passPath}.boundaryCandidates`;
        addViolation(state, 'SEGMENTER_BOUNDARY_SPLITS_SOURCE_ATOM', candidatePath);
      } else {
        const candidatePath = candidateIndex < evidence.boundaryCandidates.length
          ? `${passPath}.boundaryCandidates[${candidateIndex}]`
          : `${passPath}.boundaryCandidates`;
        addViolation(state, 'SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID', candidatePath);
      }
    } else {
      addViolation(state, 'SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID',
        `${passPath}.boundaryCandidates`);
    }
  }

  const rawIndexes = sourceData.rawIndexById;
  const candidateIds = new Map();
  const segmenterInvalidContainerIds = new Set();
  const segmenterInvalidFallbackPaths = new Set();
  const expectedContainerFirstIndexes = new Map();
  for (const [expectedIndex, expectedCandidate] of
    (expectedSegmentation?.candidates ?? []).entries()) {
    if (!expectedContainerFirstIndexes.has(expectedCandidate.containerId)) {
      expectedContainerFirstIndexes.set(expectedCandidate.containerId, expectedIndex);
    }
  }
  const markSegmenterOutputInvalid = (candidateIndex) => {
    const expected = expectedSegmentation?.candidates[candidateIndex];
    if (expected) {
      segmenterInvalidContainerIds.add(expected.containerId);
      return;
    }
    const candidate = evidence.boundaryCandidates[candidateIndex];
    if (isObject(candidate) && expectedContainerFirstIndexes.has(candidate.containerId)) {
      segmenterInvalidContainerIds.add(candidate.containerId);
      return;
    }
    segmenterInvalidFallbackPaths.add(`${passPath}.boundaryCandidates`);
  };
  for (const [index, candidate] of evidence.boundaryCandidates.entries()) {
    const candidatePath = `${passPath}.boundaryCandidates[${index}]`;
    if (!isObject(candidate)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', passPath);
      continue;
    }
    if (!validateCandidateScalarShape(candidate)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', passPath);
    }
    const sourceAtomIdsReadable = Array.isArray(candidate.sourceAtomIds)
      && candidate.sourceAtomIds.every(isNonEmptyString);
    const textReadable = typeof candidate.text === 'string';
    const segmenterIndexReadable = isNonNegativeInteger(candidate.segmenterIndexUtf16);
    const segmenterLengthReadable = isNonNegativeInteger(candidate.segmenterLengthUtf16);
    const wordLikeReadable = typeof candidate.isWordLike === 'boolean';
    const timelineSegmentReadable = isNonEmptyString(candidate.timelineSegmentId);
    const speechReadable = isInteger(candidate.speechId);
    if ((sourceAtomIdsReadable && candidate.sourceAtomIds.length === 0)
      || (textReadable && candidate.text.length === 0)
      || (segmenterLengthReadable && candidate.segmenterLengthUtf16 === 0)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_EMPTY', candidatePath);
    }
    const expectedContainerId = expectedSegmentation?.candidates[index]?.containerId;
    if (typeof candidate.containerId === 'string'
      && (!CONTAINER_ID_PATTERN.test(candidate.containerId)
        || (expectedSegmentation !== null && candidate.containerId !== expectedContainerId))) {
      addViolation(state, 'SEGMENTER_BOUNDARY_CONTAINER_ID_INVALID',
        `${candidatePath}.containerId`);
    }
    if (typeof candidate.boundaryCandidateId === 'string') {
      const validCandidateFormat = CANDIDATE_ID_PATTERN.test(candidate.boundaryCandidateId);
      const duplicateCandidateId = candidateIds.has(candidate.boundaryCandidateId);
      if (duplicateCandidateId) {
        addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_ID_DUPLICATE',
          `${candidatePath}.boundaryCandidateId`);
      } else {
        candidateIds.set(candidate.boundaryCandidateId, index);
      }
      if (!validCandidateFormat
        || (!duplicateCandidateId
          && candidate.boundaryCandidateId !== formatOrdinalId('segmenter-boundary-', index + 1))) {
        addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_ID_INVALID',
          `${candidatePath}.boundaryCandidateId`);
      }
    }

    const sourceIndexes = sourceAtomIdsReadable
      ? candidate.sourceAtomIds.map((atomId) => rawIndexes.get(atomId))
      : [];
    const allIndexesKnown = sourceAtomIdsReadable
      && sourceIndexes.every((value) => value !== undefined);
    if (sourceAtomIdsReadable
      && (!allIndexesKnown || sourceIndexes.some((value, atomIndex) => atomIndex > 0
        && value !== sourceIndexes[atomIndex - 1] + 1))) {
      addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_NONCONTIGUOUS',
        `${candidatePath}.sourceAtomIds`);
    }
    const atoms = sourceAtomIdsReadable
      ? candidate.sourceAtomIds.map((atomId) => sourceData.atomById.get(atomId))
      : [];
    const knownAtoms = atoms.filter(Boolean);
    const segments = new Set(sourceAtomIdsReadable
      ? candidate.sourceAtomIds.map((atomId) => sourceData.membership.get(atomId)).filter(Boolean)
      : []);
    const speeches = new Set(knownAtoms.map((atom) => atom.speechId));
    if (sourceAtomIdsReadable && timelineSegmentReadable
      && (segments.size !== 1 || !segments.has(candidate.timelineSegmentId))) {
      addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SEGMENT', candidatePath);
    }
    if (sourceAtomIdsReadable && speechReadable
      && (speeches.size !== 1 || !speeches.has(candidate.speechId))) {
      addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SPEECH', candidatePath);
    }
    const expectedText = sourceAtomIdsReadable
      && knownAtoms.length === candidate.sourceAtomIds.length
      ? knownAtoms.map((atom) => atom.text).join('')
      : null;
    if (expectedText !== null && textReadable && candidate.text !== expectedText) {
      addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH', `${candidatePath}.text`);
    }
    if (!anchorShapeReadable(candidate.startAnchor) || !anchorShapeReadable(candidate.endAnchor)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', passPath);
    } else {
      if (!anchorShapeValid(candidate.startAnchor, 'start')
        || (sourceAtomIdsReadable
          && candidate.startAnchor.atomId !== candidate.sourceAtomIds[0])) {
        addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH',
          `${candidatePath}.startAnchor`);
      }
      if (!anchorShapeValid(candidate.endAnchor, 'end')
        || (sourceAtomIdsReadable
          && candidate.endAnchor.atomId !== candidate.sourceAtomIds.at(-1))) {
        addViolation(state, 'SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH',
          `${candidatePath}.endAnchor`);
      }
    }

    const expected = expectedSegmentation?.candidates[index];
    if (expected) {
      const sourceTextMatches = expectedText !== null
        && textReadable
        && expectedText === candidate.text;
      if ((segmenterIndexReadable
          && candidate.segmenterIndexUtf16 !== expected.segmenterIndexUtf16)
        || (segmenterLengthReadable
          && candidate.segmenterLengthUtf16 !== expected.segmenterLengthUtf16)
        || (wordLikeReadable && candidate.isWordLike !== expected.isWordLike)
        || (sourceTextMatches && candidate.text !== expected.text)) {
        markSegmenterOutputInvalid(index);
      }
      if (sourceAtomIdsReadable
        && !sameCanonical(candidate.sourceAtomIds, expected.sourceAtomIds)
        && allIndexesKnown
        && sourceIndexes.every((value, atomIndex) => atomIndex === 0
          || value === sourceIndexes[atomIndex - 1] + 1)) {
        markSegmenterOutputInvalid(index);
      }
    }
  }
  if (expectedSegmentation
    && evidence.boundaryCandidates.length !== expectedSegmentation.candidates.length) {
    markSegmenterOutputInvalid(Math.min(
      evidence.boundaryCandidates.length,
      expectedSegmentation.candidates.length,
    ));
  }
  for (const [containerId, firstIndex] of expectedContainerFirstIndexes.entries()) {
    if (segmenterInvalidContainerIds.has(containerId)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID',
        firstIndex < evidence.boundaryCandidates.length
          ? `${passPath}.boundaryCandidates[${firstIndex}]`
          : `${passPath}.boundaryCandidates`);
    }
  }
  for (const path of segmenterInvalidFallbackPaths) {
    addViolation(state, 'SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID', path);
  }

  const membershipProjection = evidence.boundaryCandidates
    .filter((candidate) => isObject(candidate)
      && typeof candidate.boundaryCandidateId === 'string'
      && Array.isArray(candidate.sourceAtomIds))
    .map((candidate) => ({
      boundaryCandidateId: candidate.boundaryCandidateId,
      sourceAtomIds: [...candidate.sourceAtomIds],
    }));
  if (evidence.boundaryCandidatesCanonicalSha256
      !== sha256CanonicalV001(evidence.boundaryCandidates)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH',
      `${passPath}.boundaryCandidatesCanonicalSha256`);
  }
  if (evidence.sourceAtomMembershipCanonicalSha256
      !== sha256CanonicalV001(membershipProjection)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH',
      `${passPath}.sourceAtomMembershipCanonicalSha256`);
  }
  return {shapeReadable: true, segmentation: expectedSegmentation};
};

const validateBuildUnion = (context, state) => {
  const passes = context.evidencePasses;
  const failure = context.buildFailure;
  if (passes.length !== 2
    || (passes[0] === null && passes[1] !== null)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.evidencePasses');
    return {legal: false, buildFailed: false};
  }
  if (failure !== null) {
    if (!exactFields(failure, ['pass', 'kind'])) {
      addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.buildFailure');
      return {legal: false, buildFailed: false};
    }
    if (!['segmenter_exception', 'unexpected_exception'].includes(failure.kind)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.buildFailure.kind');
      return {legal: false, buildFailed: false};
    }
    if (![1, 2].includes(failure.pass)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.buildFailure.pass');
      return {legal: false, buildFailed: false};
    }
  }
  const first = passes[0];
  const second = passes[1];
  if (first === null && second === null && failure === null) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.buildFailure');
    return {legal: false, buildFailed: false};
  }
  if (first !== null && second === null && failure === null) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.buildFailure');
    return {legal: false, buildFailed: false};
  }
  if (first !== null && second !== null && failure !== null) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.buildFailure');
    return {legal: false, buildFailed: false};
  }
  if (failure?.pass === 1 && !(first === null && second === null)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.buildFailure.pass');
    return {legal: false, buildFailed: false};
  }
  if (failure?.pass === 2 && !(first !== null && second === null)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', '$.buildFailure.pass');
    return {legal: false, buildFailed: false};
  }
  if (failure !== null) {
    addViolation(state, 'SEGMENTER_BOUNDARY_BUILD_FAILED', '$.buildFailure');
    return {legal: true, buildFailed: true};
  }
  return {legal: true, buildFailed: false};
};

const membershipAnalysis = (source, evidence) => {
  const rawIndexes = new Map(source.rawSourceAtoms.map((atom, index) => [atom.atomId, index]));
  const occurrences = new Map();
  const missing = [];
  const duplicated = [];
  const reversed = [];
  let previousIndex = -1;
  for (const [candidateIndex, candidate] of evidence.boundaryCandidates.entries()) {
    for (const [atomIndex, atomId] of candidate.sourceAtomIds.entries()) {
      const rawIndex = rawIndexes.get(atomId);
      if (rawIndex === undefined) continue;
      const occurrence = (occurrences.get(atomId) ?? 0) + 1;
      occurrences.set(atomId, occurrence);
      if (occurrence > 1) duplicated.push({candidateIndex, atomIndex});
      if (rawIndex < previousIndex) reversed.push({candidateIndex, atomIndex});
      previousIndex = rawIndex;
    }
  }
  for (const [index, atom] of source.rawSourceAtoms.entries()) {
    if (!occurrences.has(atom.atomId)) missing.push({index, atomId: atom.atomId});
  }
  return {rawIndexes, occurrences, missing, duplicated, reversed};
};

const exactSetMatches = (leftValues, rightValues) => leftValues.length === rightValues.length
  && leftValues.every((value) => rightValues.some((other) => sameCanonical(value, other)));

const sourcePositiveOverlapCount = (atoms) => {
  let count = 0;
  for (let left = 0; left < atoms.length; left += 1) {
    for (let right = left + 1; right < atoms.length; right += 1) {
      if (Math.max(atoms[left].startMs, atoms[right].startMs)
        < Math.min(atoms[left].endMs, atoms[right].endMs)) count += 1;
    }
  }
  return count;
};

const buildObservedProjection = (job, source, evidence, sourceData) => {
  const containers = buildContainers(source);
  const membership = membershipAnalysis(source, evidence);
  const candidateRawSpeakerSets = evidence.boundaryCandidates.map((candidate) => {
    const values = [];
    for (const atomId of candidate.sourceAtomIds) {
      const atom = sourceData.atomById.get(atomId);
      if (!atom) continue;
      const value = atomSpeakerValue(atom);
      if (!values.some((existing) => sameCanonical(existing, value))) values.push(value);
    }
    return values;
  });
  const timelineSegments = source.selection.segments.map((segment) => ({
    timelineSegmentId: segment.timelineSegmentId,
    sourceAtomCount: segment.atomIds.length,
    boundaryCandidateCount: evidence.boundaryCandidates
      .filter((candidate) => candidate.timelineSegmentId === segment.timelineSegmentId).length,
  }));
  const containerRows = containers.map((container) => ({
    containerId: container.containerId,
    timelineSegmentId: container.timelineSegmentId,
    speechId: container.speechId,
    sourceAtomCount: container.atoms.length,
    boundaryCandidateCount: evidence.boundaryCandidates
      .filter((candidate) => candidate.containerId === container.containerId).length,
  }));
  const crossSegmentCount = evidence.boundaryCandidates.filter((candidate) => {
    const values = new Set(candidate.sourceAtomIds.map((atomId) => sourceData.membership.get(atomId))
      .filter(Boolean));
    return values.size !== 1 || !values.has(candidate.timelineSegmentId);
  }).length;
  const crossSpeechCount = evidence.boundaryCandidates.filter((candidate) => {
    const values = new Set(candidate.sourceAtomIds.map((atomId) => sourceData.atomById.get(atomId)?.speechId)
      .filter((value) => value !== undefined));
    return values.size !== 1 || !values.has(candidate.speechId);
  }).length;
  return {
    sourceAtomCount: source.rawSourceAtoms.length,
    containerCount: containers.length,
    boundaryCandidateCount: evidence.boundaryCandidates.length,
    wordLikeCandidateCount: evidence.boundaryCandidates.filter((candidate) => candidate.isWordLike).length,
    nonWordLikeCandidateCount: evidence.boundaryCandidates
      .filter((candidate) => !candidate.isWordLike).length,
    timelineSegments,
    containers: containerRows,
    mixedRawSpeakerCandidateCount: candidateRawSpeakerSets
      .filter((values) => values.length >= 2).length,
    rawSpeakerExactSetQueryResults: job.expectedProjection.rawSpeakerExactSetQueryResults
      .map((query) => ({
        values: clone(query.values),
        boundaryCandidateCount: candidateRawSpeakerSets
          .filter((values) => exactSetMatches(values, query.values)).length,
      })),
    sourcePositiveOverlapCount: sourcePositiveOverlapCount(source.rawSourceAtoms),
    membership: {
      missingCount: membership.missing.length,
      duplicatedCount: membership.duplicated.length,
      orderReversedCount: membership.reversed.length,
      crossSegmentCount,
      crossSpeechCount,
    },
  };
};

const snapshotShapeValid = (value) => exactFields(value, [
  'formalPathState', 'entryCount', 'entriesCanonicalSha256',
])
  && ['absent', 'present', 'inspection_failed'].includes(value.formalPathState)
  && ((value.formalPathState === 'inspection_failed'
    && value.entryCount === null
    && value.entriesCanonicalSha256 === null)
    || (value.formalPathState !== 'inspection_failed'
      && isNonNegativeInteger(value.entryCount)
      && SHA256_PATTERN.test(value.entriesCanonicalSha256 ?? '')));

const readOnlyGuardValid = (guard, job) => exactFields(guard, [
  'formalOutputPath', 'watchedAncestorPath', 'before', 'after',
  ])
  && guard.formalOutputPath === job.readOnlyGuard.formalOutputPath
  && isSafeWorkspacePath(guard.watchedAncestorPath)
  && guard.formalOutputPath.startsWith(`${guard.watchedAncestorPath}/`)
  && snapshotShapeValid(guard.before)
  && snapshotShapeValid(guard.after)
  && guard.before.formalPathState === 'absent'
  && guard.after.formalPathState === 'absent'
  && guard.before.entryCount === guard.after.entryCount
  && guard.before.entriesCanonicalSha256 === guard.after.entriesCanonicalSha256;

const checkHasViolation = (state, check) => state.violations
  .some((entry) => CHECK_BY_CODE[entry.code] === check);

const checkStatus = (state, check) => state.checkStatuses.get(check);
const prerequisitesPassed = (state, prerequisites) => prerequisites
  .every((name) => checkStatus(state, name) === 'passed');

const finalizeCheck = (state, name) => {
  state.checkStatuses.set(name, checkHasViolation(state, name) ? 'failed' : 'passed');
};

const markNotRun = (state, name) => {
  state.checkStatuses.set(name, 'not_run_with_upstream_failure');
};

const validateImplementationBinding = (context, state) => {
  const observed = context.observedImplementationBinding;
  if (!exactFields(observed, ['files'])
    || !Array.isArray(observed.files)
    || observed.files.length !== 3) {
    addViolation(state, 'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH',
      '$.observedImplementationBinding.files[0]');
    return;
  }
  for (const [index, file] of observed.files.entries()) {
    const path = `$.observedImplementationBinding.files[${index}]`;
    if (!isObject(file)
      || !exactFields(file, [
        'role', 'path', 'firstFileSha256', 'secondFileSha256', 'loadedModuleUrl', 'issues',
      ])
      || !validateSnapshotIssueState(file, 'implementation')) {
      addViolation(state, 'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH', path);
      continue;
    }
    const expected = context.jobValue.implementationBinding.files[index];
    const urlPath = file.loadedModuleUrl === null ? null : moduleUrlToWorkspacePath(file.loadedModuleUrl);
    if (file.role !== expected.role
      || file.path !== expected.path
      || file.firstFileSha256 !== expected.fileSha256
      || file.secondFileSha256 !== expected.fileSha256
      || urlPath !== expected.path
      || file.issues.length > 0) {
      addViolation(state, 'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH', path);
    }
  }
};

const validateInputBinding = (context, state) => {
  const job = context.jobValue;
  const snapshots = context.inputSnapshots;
  if (snapshots.length !== 3) {
    addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED',
      '$.inputSnapshots[0].document');
    return;
  }
  for (const [index, snapshot] of snapshots.entries()) {
    addInputSnapshotViolations(state, snapshot, index);
    if (!isObject(snapshot)) continue;
    const expected = job.inputs[index];
    const expectedParent = expected.path.slice(0, -(INPUT_BASENAMES[index].length + 1));
    const actualParent = typeof snapshot.path === 'string'
      ? snapshot.path.slice(0, -(INPUT_BASENAMES[index].length + 1))
      : null;
    if (snapshot.role !== expected.role
      || snapshot.path !== expected.path
      || !snapshot.path?.startsWith(INPUT_ROOT)
      || !snapshot.path?.endsWith(`/${INPUT_BASENAMES[index]}`)
      || actualParent !== expectedParent) {
      addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE',
        `$.inputSnapshots[${index}].path`);
    }
    if (snapshot.firstFileSha256 !== expected.fileSha256
      || (snapshot.secondFileSha256 !== null
        && snapshot.secondFileSha256 !== expected.fileSha256)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH',
        `$.inputSnapshots[${index}]`);
    }
  }
  if (!snapshots.every((snapshot) => isObject(snapshot) && isObject(snapshot.document))) return;
  if (!validateInputDocumentSchemas(snapshots)) {
    snapshots.forEach((snapshot, index) => {
      const expectedSchema = [SOURCE_SCHEMA_VERSION, SOURCE_MANIFEST_SCHEMA_VERSION,
        SOURCE_REPORT_SCHEMA_VERSION][index];
      if (snapshot.document?.schemaVersion !== expectedSchema) {
        addViolation(state, 'SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED',
          `$.inputSnapshots[${index}].document`);
      }
    });
    return;
  }
  const [source, manifest, report] = snapshots.map((entry) => entry.document);
  if (report.status !== 'passed') {
    addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_VALIDATION_NOT_PASSED',
      '$.inputSnapshots[2].document.status');
  }
  const actualSourceCanonical = sha256CanonicalV001(source);
  const actualRawCanonical = Array.isArray(source.rawSourceAtoms)
    ? sha256CanonicalV001(source.rawSourceAtoms)
    : null;
  if (job.expectedSourceBinding.sourceArtifactCanonicalSha256 !== actualSourceCanonical
    || job.expectedSourceBinding.rawSourceAtomsCanonicalSha256 !== actualRawCanonical) {
    addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_BINDING_MISMATCH',
      '$.jobValue.expectedSourceBinding');
  }
  if (!sourceBindingMatches(source, manifest, report, snapshots)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_SOURCE_BINDING_MISMATCH', '$.inputSnapshots');
  }
};

const makeCheckRows = (state) => PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES.map((name) => {
  const violationCodes = PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES.filter((code) =>
    CHECK_BY_CODE[code] === name
      && state.violations.some((violation) => violation.code === code));
  return {
    name,
    status: state.checkStatuses.get(name),
    violationCodes,
  };
});

export function checkPresentationSegmenterBoundaryPreflightV001(context) {
  validateContextOuterShape(context);
  const state = {
    violations: [],
    violationKeys: new Set(),
    checkStatuses: new Map(),
    sourceData: null,
    observedProjection: null,
  };

  if (!validateJobValue(context.jobValue)) {
    addViolation(state, 'SEGMENTER_BOUNDARY_JOB_INVALID', '$.jobValue');
  }
  if (!validateJobSnapshot(context.jobSnapshot)
    || context.jobSnapshot.issues.length > 0) {
    addViolation(state, 'SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH', '$.jobSnapshot');
  }
  finalizeCheck(state, 'jobBinding');

  if (!prerequisitesPassed(state, ['jobBinding'])) {
    markNotRun(state, 'implementationBinding');
    markNotRun(state, 'inputBinding');
    markNotRun(state, 'runtimeBinding');
  } else {
    validateImplementationBinding(context, state);
    finalizeCheck(state, 'implementationBinding');
    validateInputBinding(context, state);
    finalizeCheck(state, 'inputBinding');
    if (!validateRuntimeShape(context.runtimeBinding)
      || !sameCanonical(runtimePassFailProjection(context.runtimeBinding),
        context.jobValue.expectedRuntime)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_RUNTIME_MISMATCH', '$.runtimeBinding');
    }
    finalizeCheck(state, 'runtimeBinding');
  }

  if (!prerequisitesPassed(state, ['inputBinding'])) {
    markNotRun(state, 'sourceContract');
  } else {
    state.sourceData = validateSourceContract(
      context.inputSnapshots[0].document,
      context.inputSnapshots[1].document,
      context.inputSnapshots[2].document,
      state,
    );
    finalizeCheck(state, 'sourceContract');
  }

  const segmentationPrerequisites = ['implementationBinding', 'runtimeBinding', 'sourceContract'];
  if (!prerequisitesPassed(state, segmentationPrerequisites)) {
    markNotRun(state, 'segmentation');
  } else {
    const union = validateBuildUnion(context, state);
    if (union.legal && !union.buildFailed) {
      validateEvidence(context.evidencePasses[0], 0, context, state, state.sourceData);
      validateEvidence(context.evidencePasses[1], 1, context, state, state.sourceData);
    }
    finalizeCheck(state, 'segmentation');
  }

  const passOne = context.evidencePasses[0];
  const membershipReadable = isObject(passOne)
    && Array.isArray(passOne.boundaryCandidates)
    && passOne.boundaryCandidates.every((candidate) => isObject(candidate)
      && Array.isArray(candidate.sourceAtomIds)
      && candidate.sourceAtomIds.every((atomId) => typeof atomId === 'string'));
  if (!prerequisitesPassed(state, ['sourceContract']) || !membershipReadable) {
    markNotRun(state, 'coverage');
  } else {
    const analysis = membershipAnalysis(context.inputSnapshots[0].document, passOne);
    analysis.missing.forEach(({index}) => addViolation(
      state,
      'SEGMENTER_BOUNDARY_SOURCE_ATOM_MISSING',
      `$.inputSnapshots[0].document.rawSourceAtoms[${index}].atomId`,
    ));
    analysis.duplicated.forEach(({candidateIndex, atomIndex}) => addViolation(
      state,
      'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATED',
      `$.evidencePasses[0].boundaryCandidates[${candidateIndex}].sourceAtomIds[${atomIndex}]`,
    ));
    analysis.reversed.forEach(({candidateIndex, atomIndex}) => addViolation(
      state,
      'SEGMENTER_BOUNDARY_SOURCE_ATOM_ORDER_REVERSED',
      `$.evidencePasses[0].boundaryCandidates[${candidateIndex}].sourceAtomIds[${atomIndex}]`,
    ));
    finalizeCheck(state, 'coverage');
  }

  if (!prerequisitesPassed(state, ['segmentation', 'coverage'])) {
    markNotRun(state, 'expectedProjection');
  } else {
    try {
      state.observedProjection = buildObservedProjection(
        context.jobValue,
        context.inputSnapshots[0].document,
        passOne,
        state.sourceData,
      );
      if (!sameCanonical(state.observedProjection, context.jobValue.expectedProjection)) {
        addViolation(state, 'SEGMENTER_BOUNDARY_EXPECTED_PROJECTION_MISMATCH',
          '$.jobValue.expectedProjection');
      }
    } catch {
      addViolation(state, 'SEGMENTER_BOUNDARY_EXPECTED_PROJECTION_MISMATCH',
        '$.jobValue.expectedProjection');
    }
    finalizeCheck(state, 'expectedProjection');
  }

  const determinismPrerequisites = ['implementationBinding', 'runtimeBinding', 'sourceContract'];
  if (!prerequisitesPassed(state, determinismPrerequisites)
    || context.evidencePasses.length !== 2
    || context.evidencePasses.some((entry) => entry === null)) {
    markNotRun(state, 'determinism');
  } else {
    let equal = false;
    try {
      equal = serializeEvidence(context.evidencePasses[0])
        .equals(serializeEvidence(context.evidencePasses[1]));
    } catch {
      equal = false;
    }
    if (!equal) {
      addViolation(state, 'SEGMENTER_BOUNDARY_NONDETERMINISTIC', '$.evidencePasses');
    }
    finalizeCheck(state, 'determinism');
  }

  if (!prerequisitesPassed(state, ['jobBinding'])) {
    markNotRun(state, 'readOnlyPreflight');
  } else {
    if (context.readOnlyGuard === null
      || !readOnlyGuardValid(context.readOnlyGuard, context.jobValue)) {
      addViolation(state, 'SEGMENTER_BOUNDARY_READ_ONLY_CONTRACT_VIOLATED',
        '$.readOnlyGuard');
    }
    finalizeCheck(state, 'readOnlyPreflight');
  }

  for (const name of PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES) {
    if (!state.checkStatuses.has(name)) markNotRun(state, name);
  }
  const violations = sortedViolations(state.violations);
  state.violations = violations;
  const checks = makeCheckRows(state);
  const status = checks.every((check) => check.status === 'passed') ? 'passed' : 'failed';
  const segmentationPassed = state.checkStatuses.get('segmentation') === 'passed';
  const coveragePassed = state.checkStatuses.get('coverage') === 'passed';
  if (segmentationPassed && coveragePassed && state.observedProjection === null) {
    state.observedProjection = buildObservedProjection(
      context.jobValue,
      context.inputSnapshots[0].document,
      passOne,
      state.sourceData,
    );
  }
  return {
    schemaVersion: CHECK_REPORT_SCHEMA_VERSION,
    status,
    artifactId: segmentationPassed ? context.evidencePasses[0].artifactId : null,
    checks,
    observedProjection: segmentationPassed && coveragePassed
      ? clone(state.observedProjection)
      : null,
    violations,
  };
}
