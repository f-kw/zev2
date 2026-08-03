import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  createPresentationMeaningOwnedStagingRootV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001,
  readPresentationMeaningWorkspaceFileStableV001,
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';

export const PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001 =
  'presentation-meaning-boundary-source-package-v001';
export const PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_JOB_SCHEMA_V001 =
  'presentation-meaning-boundary-source-package-job-v001';
export const PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001 =
  '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、発話の意味が自然に完結するまとまりの終端をmeaningGroupEndBoundaryCandidateIdで選んでください。最後のまとまりはcontainer最後の候補で終えてください。本文、候補ID、時刻、順序を変更しないでください。';

export const PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001 = Object.freeze([
  'MEANING_BOUNDARY_JOB_INVALID',
  'MEANING_BOUNDARY_INPUT_BINDING_MISMATCH',
  'MEANING_BOUNDARY_RUNTIME_BINDING_MISMATCH',
  'MEANING_BOUNDARY_SOURCE_PACKAGE_INVALID',
  'MEANING_BOUNDARY_CONTAINER_ID_COLLISION',
  'MEANING_BOUNDARY_CANDIDATE_ID_COLLISION',
  'MEANING_BOUNDARY_OCCURRENCE_MAPPING_MISMATCH',
  'MEANING_BOUNDARY_REQUEST_INVALID',
  'MEANING_BOUNDARY_RESPONSE_INVALID',
  'MEANING_BOUNDARY_RESPONSE_ABSTAINED',
  'MEANING_BOUNDARY_CONTAINER_SET_MISMATCH',
  'MEANING_BOUNDARY_CANDIDATE_UNKNOWN',
  'MEANING_BOUNDARY_END_ORDER_INVALID',
  'MEANING_BOUNDARY_FINAL_END_MISMATCH',
  'MEANING_BOUNDARY_COVERAGE_MISMATCH',
  'MEANING_BOUNDARY_MODEL_MISMATCH',
  'MEANING_BOUNDARY_USAGE_INVALID',
  'MEANING_BOUNDARY_COST_LIMIT_EXCEEDED',
  'MEANING_BOUNDARY_RAW_RESPONSE_UNAVAILABLE',
  'MEANING_BOUNDARY_SECRET_EXPOSED',
  'MEANING_BOUNDARY_PUBLICATION_FAILED',
  'MEANING_BOUNDARY_RESPONSE_SCHEMA_INVALID',
]);

export const PRESENTATION_MEANING_BOUNDARY_SOURCE_OWNED_VIOLATION_CODES_V001 =
  Object.freeze(PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001.slice(0, 7));

const ROOT = 'evals/clip_composition/outputs/presentation';
const JOB_ROOT = `${ROOT}/meaning-boundary-jobs`;
const OUTPUT_ROOT = `${ROOT}/meaning-boundary-source-packages`;
const SELF_PATH =
  'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs';
const GATE_A_CORE_PATH =
  'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs';
const GATE_A_PREFLIGHT_PATH =
  'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs';
const STRICT_JSON_PATH =
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA = /^[0-9a-f]{64}$/u;
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const GATE_A_CONTAINER_ID = /^segmenter-container-[0-9]{6}$/u;
const GATE_A_CANDIDATE_ID = /^segmenter-boundary-[0-9]{6}$/u;
const GATE_A_CHECK_NAMES = Object.freeze([
  'jobBinding', 'implementationBinding', 'inputBinding', 'runtimeBinding',
  'sourceContract', 'segmentation', 'coverage', 'expectedProjection',
  'determinism', 'readOnlyPreflight',
]);
const IMPLEMENTATION_BINDING_SPECS = Object.freeze([
  Object.freeze({role: 'meaning-source-package', path: SELF_PATH}),
  Object.freeze({role: 'gate-a-core', path: GATE_A_CORE_PATH}),
  Object.freeze({role: 'gate-a-preflight', path: GATE_A_PREFLIGHT_PATH}),
  Object.freeze({role: 'strict-json', path: STRICT_JSON_PATH}),
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
const DISPLAY_KEYS = new Set([
  'lines', 'lineOrdinal', 'displayPage', 'logicalWidth', 'maxLogicalWidthPerLine',
  'maxLinesPerPage', 'characterWidthRule', 'format', 'screenLayoutId', 'presetId',
  'visualStateId', 'crop', 'cropDecision', 'viewports', 'fontSizePx', 'fontFamily',
  'safeAreaPx', 'position', 'transition', 'audioPolicy',
]);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const violation = (code, pointer) => ({code, path: pointer, relatedIds: []});
const validMediaBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && SAFE_PATH.test(value.path) && SHA.test(value.fileSha256);
const validJsonBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && typeof value.schemaVersion === 'string' && value.schemaVersion.length > 0
  && SAFE_PATH.test(value.path) && SHA.test(value.fileSha256)
  && SHA.test(value.canonicalSha256);
const validCodeBinding = value => exactKeys(value, ['path', 'fileSha256', 'role'])
  && SAFE_PATH.test(value.path) && SHA.test(value.fileSha256)
  && typeof value.role === 'string' && value.role.length > 0;
const validImplementationBindingSet = value => dense(value)
  && value.length === IMPLEMENTATION_BINDING_SPECS.length
  && value.every((binding, index) => validCodeBinding(binding)
    && binding.role === IMPLEMENTATION_BINDING_SPECS[index].role
    && binding.path === IMPLEMENTATION_BINDING_SPECS[index].path);
const validAtomRef = value => exactKeys(value, ['timelineSegmentId', 'sourceMediaId', 'atomId'])
  && FORMAL_ID.test(value.timelineSegmentId) && FORMAL_ID.test(value.sourceMediaId)
  && FORMAL_ID.test(value.atomId);
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
const containsDisplayKey = value => {
  if (Array.isArray(value)) return value.some(containsDisplayKey);
  if (!isObject(value)) return false;
  return Object.entries(value).some(([key, child]) => DISPLAY_KEYS.has(key) || containsDisplayKey(child));
};

export function validatePresentationMeaningBoundarySourcePackageJobV001(job) {
  if (!exactKeys(job, [
    'schemaVersion', 'jobId', 'packageId', 'timelineCompositionDecisionBinding',
    'segmenterSourceBindings', 'outputPath', 'implementationBindings',
    'approvedContractBindings',
  ]) || job.schemaVersion !== PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_JOB_SCHEMA_V001
    || !FORMAL_ID.test(job.jobId) || !FORMAL_ID.test(job.packageId)
    || !validJsonBinding(job.timelineCompositionDecisionBinding)
    || job.timelineCompositionDecisionBinding.schemaVersion
      !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001
    || !dense(job.segmenterSourceBindings) || job.segmenterSourceBindings.length < 1
    || !job.segmenterSourceBindings.every(item => exactKeys(item, [
      'sourceMediaId', 'preflightReportBinding', 'evidenceBinding',
    ]) && FORMAL_ID.test(item.sourceMediaId)
      && validJsonBinding(item.preflightReportBinding)
      && item.preflightReportBinding.schemaVersion
        === 'presentation-segmenter-boundary-preflight-report-v001'
      && validJsonBinding(item.evidenceBinding)
      && item.evidenceBinding.schemaVersion
        === 'presentation-segmenter-boundary-evidence-v001')
    || new Set(job.segmenterSourceBindings.map(item => item.sourceMediaId)).size
      !== job.segmenterSourceBindings.length
    || job.outputPath !== `${OUTPUT_ROOT}/${job.jobId}/meaning-boundary-source-package.json`
    || !validImplementationBindingSet(job.implementationBindings)
    || !dense(job.approvedContractBindings)
    || !same(job.approvedContractBindings, CONTRACT_BINDINGS)) return false;
  return true;
}

const runtimeProjectionFor = runtime => ({
  nodeBinarySha256: runtime.nodeBinarySha256,
  nodeVersion: runtime.nodeVersion,
  icuVersion: runtime.icuVersion,
  resolvedLocale: runtime.resolvedLocale,
  resolvedGranularity: runtime.resolvedGranularity,
});

const validRuntimeProjection = value => exactKeys(value, [
  'nodeBinarySha256', 'nodeVersion', 'icuVersion', 'resolvedLocale', 'resolvedGranularity',
]) && SHA.test(value.nodeBinarySha256)
  && typeof value.nodeVersion === 'string' && value.nodeVersion.length > 0
  && typeof value.icuVersion === 'string' && value.icuVersion.length > 0
  && value.resolvedLocale === 'ja' && value.resolvedGranularity === 'word';

const validEvidenceRuntime = value => exactKeys(value, [
  'nodeBinarySha256', 'nodeVersion', 'icuVersion', 'resolvedLocale', 'resolvedGranularity',
  'diagnostics',
]) && validRuntimeProjection(runtimeProjectionFor(value))
  && exactKeys(value.diagnostics, [
    'resolvedNodePath', 'platform', 'arch', 'v8Version', 'unicodeVersion', 'cldrVersion',
  ]) && Object.values(value.diagnostics).every(item =>
    typeof item === 'string' && item.length > 0);

const validReportRuntime = value => exactKeys(value, [
  'diagnostics', 'icuVersion', 'nodeBinarySha256', 'nodeVersion', 'resolvedGranularity',
  'resolvedLocale',
]) && validRuntimeProjection(runtimeProjectionFor(value))
  && exactKeys(value.diagnostics, [
    'arch', 'cldrVersion', 'platform', 'resolvedNodePath', 'unicodeVersion', 'v8Version',
  ]) && Object.values(value.diagnostics).every(item =>
    typeof item === 'string' && item.length > 0);

const validSegmentationPolicy = value => exactKeys(value, [
  'policyVersion', 'engine', 'locale', 'granularity', 'indexUnit', 'containerRule',
  'candidateIdRule', 'unicodeNormalization',
]) && same(value, {
  policyVersion: 'presentation-segmenter-boundary-policy-v001',
  engine: 'Intl.Segmenter',
  locale: 'ja',
  granularity: 'word',
  indexUnit: 'utf16-code-unit',
  containerRule: 'maximal-contiguous-run-by-timeline-segment-and-speech-v001',
  candidateIdRule: 'source-order-six-digit-v001',
  unicodeNormalization: 'none',
});

const expectedPreflightInputs = source => [
  {binding: source.retainedSourceAtomsBinding.sourceAtoms, role: 'sourceAtoms'},
  {binding: source.retainedSourceAtomsBinding.generationManifest, role: 'sourceGenerationManifest'},
  {binding: source.retainedSourceAtomsBinding.validationReport, role: 'sourceValidationReport'},
].map(({binding, role}) => ({
  fileSha256: binding.fileSha256,
  path: binding.path,
  role,
}));

const validEvidenceSourceBinding = (value, source, retained) => exactKeys(value, [
  'sourceArtifactId', 'sourceArtifactPath', 'sourceArtifactFileSha256',
  'sourceArtifactCanonicalSha256', 'sourceRef', 'sourceProvenance', 'atomGranularity',
  'rawSourceAtomsCanonicalSha256',
]) && value.sourceArtifactId === retained.artifactId
  && value.sourceArtifactPath === source.retainedSourceAtomsBinding.sourceAtoms.path
  && value.sourceArtifactFileSha256
    === source.retainedSourceAtomsBinding.sourceAtoms.fileSha256
  && value.sourceArtifactCanonicalSha256
    === source.retainedSourceAtomsBinding.sourceAtoms.canonicalSha256
  && value.sourceRef === source.sourceRef
  && value.sourceRef === retained.sourceRef
  && value.sourceProvenance === retained.sourceProvenance
  && value.atomGranularity === retained.atomGranularity
  && value.rawSourceAtomsCanonicalSha256 === retained.rawSourceAtomsCanonicalSha256;

const validEvidenceCandidate = (candidate, atoms) => {
  if (!exactKeys(candidate, [
    'boundaryCandidateId', 'containerId', 'timelineSegmentId', 'speechId', 'sourceAtomIds',
    'text', 'startAnchor', 'endAnchor', 'segmenterIndexUtf16', 'segmenterLengthUtf16',
    'isWordLike', 'sourceAtomCount',
  ]) || !GATE_A_CANDIDATE_ID.test(candidate.boundaryCandidateId)
    || !GATE_A_CONTAINER_ID.test(candidate.containerId)
    || !FORMAL_ID.test(candidate.timelineSegmentId)
    || !Number.isSafeInteger(candidate.speechId)
    || !dense(candidate.sourceAtomIds) || candidate.sourceAtomIds.length < 1
    || new Set(candidate.sourceAtomIds).size !== candidate.sourceAtomIds.length
    || !candidate.sourceAtomIds.every(atomId => FORMAL_ID.test(atomId) && atoms.has(atomId))
    || !exactKeys(candidate.startAnchor, ['atomId', 'edge'])
    || !exactKeys(candidate.endAnchor, ['atomId', 'edge'])
    || candidate.startAnchor.atomId !== candidate.sourceAtomIds[0]
    || candidate.startAnchor.edge !== 'start'
    || candidate.endAnchor.atomId !== candidate.sourceAtomIds.at(-1)
    || candidate.endAnchor.edge !== 'end'
    || !Number.isSafeInteger(candidate.segmenterIndexUtf16)
    || candidate.segmenterIndexUtf16 < 0
    || !Number.isSafeInteger(candidate.segmenterLengthUtf16)
    || candidate.segmenterLengthUtf16 < 1
    || typeof candidate.isWordLike !== 'boolean'
    || candidate.sourceAtomCount !== candidate.sourceAtomIds.length) return false;
  return candidate.text === candidate.sourceAtomIds.map(atomId => atoms.get(atomId).text).join('');
};

const validEvidenceCandidateOrder = candidates => {
  let expectedContainerOrdinal = 0;
  let previousContainerId = null;
  const closedContainers = new Set();
  for (const [index, candidate] of candidates.entries()) {
    if (candidate.boundaryCandidateId
      !== `segmenter-boundary-${String(index + 1).padStart(6, '0')}`) return false;
    if (candidate.containerId !== previousContainerId) {
      if (closedContainers.has(candidate.containerId)) return false;
      if (previousContainerId !== null) closedContainers.add(previousContainerId);
      expectedContainerOrdinal += 1;
      if (candidate.containerId
        !== `segmenter-container-${String(expectedContainerOrdinal).padStart(6, '0')}`) return false;
      previousContainerId = candidate.containerId;
    }
  }
  return true;
};

const reportProjection = ({report, source, evidence, retained, atoms}) => {
  if (!isObject(report)
    || report.schemaVersion !== 'presentation-segmenter-boundary-preflight-report-v001'
    || report.status !== 'passed' || report.failureStage !== null
    || !dense(report.inputs) || !same(report.inputs, expectedPreflightInputs(source))
    || !isObject(report.evidence)
    || !exactKeys(report.evidence, [
      'artifactId', 'boundaryCandidatesCanonicalSha256', 'canonicalSha256',
      'sourceAtomMembershipCanonicalSha256',
    ])
    || report.evidence.artifactId !== evidence.artifactId
    || report.evidence.canonicalSha256 !== canonicalSha(evidence)
    || report.evidence.boundaryCandidatesCanonicalSha256
      !== evidence.boundaryCandidatesCanonicalSha256
    || report.evidence.sourceAtomMembershipCanonicalSha256
      !== evidence.sourceAtomMembershipCanonicalSha256
    || !validReportRuntime(report.runtimeBinding)
    || !same(runtimeProjectionFor(report.runtimeBinding), runtimeProjectionFor(evidence.runtimeBinding))
    || !exactKeys(report.checkReport, [
      'artifactId', 'checks', 'observedProjection', 'schemaVersion', 'status', 'violations',
    ])
    || report.checkReport.schemaVersion !== 'presentation-segmenter-boundary-check-report-v001'
    || report.checkReport.artifactId !== evidence.artifactId
    || report.checkReport.status !== 'passed'
    || !dense(report.checkReport.violations) || report.checkReport.violations.length !== 0
    || !same(report.checkReport.observedProjection, report.observedProjection)
    || report.observedProjection?.sourcePositiveOverlapCount !== 0
    || !dense(report.checkReport.checks)
    || !same(report.checkReport.checks.map(check => check?.name), GATE_A_CHECK_NAMES)
    || !report.checkReport.checks.every(check => exactKeys(
      check, ['name', 'status', 'violationCodes'],
    ) && check.status === 'passed' && dense(check.violationCodes)
      && check.violationCodes.length === 0)
    || !dense(evidence.boundaryCandidates) || evidence.boundaryCandidates.length < 1
    || canonicalSha(evidence.boundaryCandidates)
      !== evidence.boundaryCandidatesCanonicalSha256
    || !evidence.boundaryCandidates.every(candidate => validEvidenceCandidate(candidate, atoms))
    || !validEvidenceCandidateOrder(evidence.boundaryCandidates)
    || new Set(evidence.boundaryCandidates.map(candidate => candidate.boundaryCandidateId)).size
      !== evidence.boundaryCandidates.length) return null;
  const runtimeProjection = runtimeProjectionFor(report.runtimeBinding);
  return {
    artifactId: report.evidence.artifactId,
    evidenceCanonicalSha256: report.evidence.canonicalSha256,
    inputs: report.inputs,
    runtimeProjection,
  };
};

const buildSourceContext = (source, context) => {
  const evidence = context.evidence;
  const retained = context.retainedSourceAtoms;
  if (!isObject(evidence) || !exactKeys(evidence, [
    'schemaVersion', 'artifactId', 'generatorVersion', 'sourceBinding', 'runtimeBinding',
    'segmentationPolicy', 'boundaryCandidates', 'boundaryCandidatesCanonicalSha256',
    'sourceAtomMembershipCanonicalSha256',
  ]) || evidence.schemaVersion !== 'presentation-segmenter-boundary-evidence-v001'
    || !FORMAL_ID.test(evidence.artifactId)
    || evidence.generatorVersion !== 'presentation-segmenter-boundary-evidence-generator-v001'
    || !isObject(retained) || retained.schemaVersion !== 'presentation-retained-source-atoms-v001'
    || retained.sourceRef !== source.sourceRef || !dense(retained.rawSourceAtoms)
    || !dense(retained.selection?.segments)
    || !validEvidenceSourceBinding(evidence.sourceBinding, source, retained)
    || !validSegmentationPolicy(evidence.segmentationPolicy)) {
    throw new Error('binding');
  }
  if (!validEvidenceRuntime(evidence.runtimeBinding)
    || !validReportRuntime(context.preflightReport?.runtimeBinding)
    || !same(runtimeProjectionFor(context.preflightReport.runtimeBinding),
      runtimeProjectionFor(evidence.runtimeBinding))) {
    throw new Error('runtime-binding');
  }
  const atoms = new Map();
  for (const atom of retained.rawSourceAtoms) {
    if (!isObject(atom) || !FORMAL_ID.test(atom.atomId) || atoms.has(atom.atomId)
      || typeof atom.text !== 'string' || atom.text.includes('\r') || atom.text.includes('\n')
      || !Number.isSafeInteger(atom.startMs) || !Number.isSafeInteger(atom.endMs)
      || atom.startMs < 0 || atom.endMs <= atom.startMs || atom.sourceRef !== source.sourceRef) {
      throw new Error('occurrence');
    }
    atoms.set(atom.atomId, atom);
  }
  if (canonicalSha(retained.rawSourceAtoms) !== retained.rawSourceAtomsCanonicalSha256) {
    throw new Error('binding');
  }
  const projection = reportProjection({
    report: context.preflightReport, source, evidence, retained, atoms,
  });
  if (!projection) throw new Error('binding');
  return {...context, projection, evidence, retained, atoms};
};

const makeAnchor = (atomRef, edge) => ({atomRef, edge});

export function buildPresentationMeaningBoundarySourcePackageV001({
  job,
  jobBinding,
  timelineDecision,
  segmenterSources,
}) {
  if (!validatePresentationMeaningBoundarySourcePackageJobV001(job)
    || !validJsonBinding(jobBinding)
    || jobBinding.schemaVersion !== job.schemaVersion
    || !validatePresentationTimelineCompositionDecisionV001(timelineDecision)
    || !dense(segmenterSources)
    || segmenterSources.length !== timelineDecision.sourceMedia.length) {
    throw new TypeError('meaning boundary source package input is invalid');
  }
  const jobSourceMap = new Map(job.segmenterSourceBindings.map(item => [item.sourceMediaId, item]));
  const suppliedMap = new Map(segmenterSources.map(item => [item.sourceMediaId, item]));
  if (jobSourceMap.size !== timelineDecision.sourceMedia.length
    || suppliedMap.size !== timelineDecision.sourceMedia.length
    || !same(job.segmenterSourceBindings.map(item => item.sourceMediaId),
      timelineDecision.sourceMedia.map(item => item.sourceMediaId))
    || !same(segmenterSources.map(item => item.sourceMediaId),
      timelineDecision.sourceMedia.map(item => item.sourceMediaId))) throw new Error('source-binding');
  const contexts = new Map();
  const runtimeSources = [];
  for (const source of timelineDecision.sourceMedia) {
    const supplied = suppliedMap.get(source.sourceMediaId);
    const declared = jobSourceMap.get(source.sourceMediaId);
    if (!supplied || !declared
      || !same(supplied.preflightReportBinding, declared.preflightReportBinding)
      || !same(supplied.evidenceBinding, declared.evidenceBinding)) throw new Error('source-binding');
    const built = buildSourceContext(source, supplied);
    contexts.set(source.sourceMediaId, built);
    runtimeSources.push({
      sourceMediaId: source.sourceMediaId,
      preflightReportBinding: declared.preflightReportBinding,
      evidenceBinding: declared.evidenceBinding,
      runtimeProjection: built.projection.runtimeProjection,
    });
  }

  const containers = [];
  const candidateOccurrenceMap = [];
  let containerOrdinal = 0;
  let candidateOrdinal = 0;
  for (const segment of timelineDecision.segments) {
    const context = contexts.get(segment.sourceMediaId);
    const matches = context.retained.selection.segments.filter(selection =>
      selection.sourceStartMs === segment.sourceStartMs
      && selection.sourceEndMs === segment.sourceEndMs);
    if (matches.length !== 1) throw new Error('occurrence');
    const selection = matches[0];
    const foreignSegmentOverlap = context.evidence.boundaryCandidates.some(candidate =>
      candidate.timelineSegmentId !== selection.timelineSegmentId
      && candidate.sourceAtomIds.some(atomId => {
        const atom = context.atoms.get(atomId);
        return atom !== undefined
          && atom.endMs > segment.sourceStartMs && atom.startMs < segment.sourceEndMs;
      }));
    if (foreignSegmentOverlap) throw new Error('occurrence');
    const sourceCandidates = context.evidence.boundaryCandidates.filter(
      candidate => candidate.timelineSegmentId === selection.timelineSegmentId,
    );
    if (sourceCandidates.length === 0) throw new Error('occurrence');
    const runs = [];
    const seenContainers = new Set();
    for (const candidate of sourceCandidates) {
      const previous = runs.at(-1);
      if (!previous || previous.sourceContainerId !== candidate.containerId) {
        if (seenContainers.has(candidate.containerId)) throw new Error('occurrence');
        seenContainers.add(candidate.containerId);
        runs.push({sourceContainerId: candidate.containerId, candidates: []});
      }
      runs.at(-1).candidates.push(candidate);
    }
    const segmentAtomIds = [];
    for (const run of runs) {
      containerOrdinal += 1;
      if (containerOrdinal > 999999) throw new Error('occurrence');
      const containerId = `segmenter-container-${String(containerOrdinal).padStart(6, '0')}`;
      const boundaryCandidates = [];
      const containerAtomIds = [];
      for (const sourceCandidate of run.candidates) {
        if (!dense(sourceCandidate.sourceAtomIds) || sourceCandidate.sourceAtomIds.length < 1) {
          throw new Error('occurrence');
        }
        const atoms = sourceCandidate.sourceAtomIds.map(atomId => context.atoms.get(atomId));
        if (atoms.some(atom => atom === undefined)) throw new Error('occurrence');
        const atomRefs = atoms.map(atom => ({
          timelineSegmentId: segment.segmentId,
          sourceMediaId: segment.sourceMediaId,
          atomId: atom.atomId,
        }));
        candidateOrdinal += 1;
        if (candidateOrdinal > 999999) throw new Error('occurrence');
        const boundaryCandidateId = `segmenter-boundary-${String(candidateOrdinal).padStart(6, '0')}`;
        const boundaryCandidate = {
          boundaryCandidateId,
          ordinal: boundaryCandidates.length + 1,
          atomRefs,
          text: atoms.map(atom => atom.text).join(''),
          startAnchor: makeAnchor(atomRefs[0], 'start'),
          endAnchor: makeAnchor(atomRefs.at(-1), 'end'),
          sourceStartMs: atoms[0].startMs,
          sourceEndMs: atoms.at(-1).endMs,
          isWordLike: sourceCandidate.isWordLike,
        };
        boundaryCandidates.push(boundaryCandidate);
        candidateOccurrenceMap.push({
          boundaryCandidateId,
          timelineSegmentId: segment.segmentId,
          sourceMediaId: segment.sourceMediaId,
          sourceGateAContainerId: sourceCandidate.containerId,
          sourceGateABoundaryCandidateId: sourceCandidate.boundaryCandidateId,
          atomRefs,
        });
        containerAtomIds.push(...sourceCandidate.sourceAtomIds);
      }
      if (new Set(containerAtomIds).size !== containerAtomIds.length) throw new Error('occurrence');
      segmentAtomIds.push(...containerAtomIds);
      containers.push({
        containerId,
        ordinal: containerOrdinal,
        sourceMediaId: segment.sourceMediaId,
        timelineSegmentId: segment.segmentId,
        boundaryCandidates,
      });
    }
    if (!same(segmentAtomIds, selection.atomIds)) throw new Error('occurrence');
  }
  if (new Set(containers.map(item => item.containerId)).size !== containers.length) {
    throw new Error('container-collision');
  }
  if (new Set(candidateOccurrenceMap.map(item => item.boundaryCandidateId)).size
    !== candidateOccurrenceMap.length) throw new Error('candidate-collision');
  const strictBinding = job.implementationBindings.find(item => item.role === 'strict-json');
  const result = {
    schemaVersion: PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001,
    packageId: job.packageId,
    timelineCompositionDecisionBinding: job.timelineCompositionDecisionBinding,
    runtimeBinding: {
      segmenterSources: runtimeSources,
      strictJsonImplementationBinding: strictBinding,
    },
    containers,
    candidateOccurrenceMap,
    taskDescription: PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001,
    provenance: {
      sourcePackageJobBinding: jobBinding,
      timelineCompositionDecisionBinding: job.timelineCompositionDecisionBinding,
      implementationBindings: job.implementationBindings,
    },
  };
  const inspection = inspectPresentationMeaningBoundarySourcePackageV001(result);
  if (inspection.status !== 'passed') {
    const code = inspection.violations[0].code;
    if (code === 'MEANING_BOUNDARY_CONTAINER_ID_COLLISION') {
      throw new Error('container-collision');
    }
    if (code === 'MEANING_BOUNDARY_CANDIDATE_ID_COLLISION') {
      throw new Error('candidate-collision');
    }
    throw new Error('package-invalid');
  }
  return result;
}

export function validatePresentationMeaningBoundarySourcePackageV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'packageId', 'timelineCompositionDecisionBinding', 'runtimeBinding',
    'containers', 'candidateOccurrenceMap', 'taskDescription', 'provenance',
  ]) || value.schemaVersion !== PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001
    || !FORMAL_ID.test(value.packageId)
    || !validJsonBinding(value.timelineCompositionDecisionBinding)
    || value.timelineCompositionDecisionBinding.schemaVersion
      !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001
    || !exactKeys(value.runtimeBinding, ['segmenterSources', 'strictJsonImplementationBinding'])
    || !dense(value.runtimeBinding.segmenterSources)
    || value.runtimeBinding.segmenterSources.length < 1
    || !value.runtimeBinding.segmenterSources.every(item => exactKeys(item, [
      'sourceMediaId', 'preflightReportBinding', 'evidenceBinding', 'runtimeProjection',
    ]) && FORMAL_ID.test(item.sourceMediaId)
      && validJsonBinding(item.preflightReportBinding)
      && item.preflightReportBinding.schemaVersion
        === 'presentation-segmenter-boundary-preflight-report-v001'
      && validJsonBinding(item.evidenceBinding)
      && item.evidenceBinding.schemaVersion === 'presentation-segmenter-boundary-evidence-v001'
      && validRuntimeProjection(item.runtimeProjection))
    || new Set(value.runtimeBinding.segmenterSources.map(item => item.sourceMediaId)).size
      !== value.runtimeBinding.segmenterSources.length
    || !validCodeBinding(value.runtimeBinding.strictJsonImplementationBinding)
    || value.runtimeBinding.strictJsonImplementationBinding.role !== 'strict-json'
    || value.runtimeBinding.strictJsonImplementationBinding.path !== STRICT_JSON_PATH
    || !dense(value.containers) || value.containers.length < 1
    || value.containers.length > 999999
    || !dense(value.candidateOccurrenceMap)
    || value.taskDescription !== PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001
    || !exactKeys(value.provenance, [
      'sourcePackageJobBinding', 'timelineCompositionDecisionBinding', 'implementationBindings',
    ]) || !validJsonBinding(value.provenance.sourcePackageJobBinding)
    || value.provenance.sourcePackageJobBinding.schemaVersion
      !== PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_JOB_SCHEMA_V001
    || !same(value.provenance.timelineCompositionDecisionBinding,
      value.timelineCompositionDecisionBinding)
    || !validImplementationBindingSet(value.provenance.implementationBindings)
    || !same(value.runtimeBinding.strictJsonImplementationBinding,
      value.provenance.implementationBindings[3])
    || containsDisplayKey(value)) return false;
  const flattened = [];
  let expectedCandidateOrdinal = 0;
  for (let containerIndex = 0; containerIndex < value.containers.length; containerIndex += 1) {
    const container = value.containers[containerIndex];
    if (!exactKeys(container, [
      'containerId', 'ordinal', 'sourceMediaId', 'timelineSegmentId', 'boundaryCandidates',
    ]) || container.containerId !== `segmenter-container-${String(containerIndex + 1).padStart(6, '0')}`
      || container.ordinal !== containerIndex + 1 || !FORMAL_ID.test(container.sourceMediaId)
      || !FORMAL_ID.test(container.timelineSegmentId) || !dense(container.boundaryCandidates)
      || container.boundaryCandidates.length < 1) return false;
    for (let index = 0; index < container.boundaryCandidates.length; index += 1) {
      const candidate = container.boundaryCandidates[index];
      expectedCandidateOrdinal += 1;
      flattened.push({container, candidate});
      if (!exactKeys(candidate, [
        'boundaryCandidateId', 'ordinal', 'atomRefs', 'text', 'startAnchor', 'endAnchor',
        'sourceStartMs', 'sourceEndMs', 'isWordLike',
      ]) || candidate.boundaryCandidateId
        !== `segmenter-boundary-${String(expectedCandidateOrdinal).padStart(6, '0')}`
        || candidate.ordinal !== index + 1 || !dense(candidate.atomRefs)
        || candidate.atomRefs.length < 1 || !candidate.atomRefs.every(validAtomRef)
        || candidate.atomRefs.some(ref => ref.timelineSegmentId !== container.timelineSegmentId
          || ref.sourceMediaId !== container.sourceMediaId)
        || typeof candidate.text !== 'string' || candidate.text.length < 1
        || candidate.text.includes('\r') || candidate.text.includes('\n')
        || !exactKeys(candidate.startAnchor, ['atomRef', 'edge'])
        || !exactKeys(candidate.endAnchor, ['atomRef', 'edge'])
        || candidate.startAnchor.edge !== 'start' || candidate.endAnchor.edge !== 'end'
        || !same(candidate.startAnchor.atomRef, candidate.atomRefs[0])
        || !same(candidate.endAnchor.atomRef, candidate.atomRefs.at(-1))
        || !Number.isSafeInteger(candidate.sourceStartMs) || candidate.sourceStartMs < 0
        || !Number.isSafeInteger(candidate.sourceEndMs)
        || candidate.sourceEndMs <= candidate.sourceStartMs
        || typeof candidate.isWordLike !== 'boolean') return false;
    }
  }
  if (flattened.length > 999999
    || flattened.length !== value.candidateOccurrenceMap.length
    || new Set(flattened.map(item => item.candidate.boundaryCandidateId)).size
      !== flattened.length) return false;
  const firstSourceOrder = [];
  const seenSourceIds = new Set();
  for (const container of value.containers) {
    if (!seenSourceIds.has(container.sourceMediaId)) {
      seenSourceIds.add(container.sourceMediaId);
      firstSourceOrder.push(container.sourceMediaId);
    }
  }
  if (!same(firstSourceOrder,
    value.runtimeBinding.segmenterSources.map(item => item.sourceMediaId))) return false;
  return flattened.every(({container, candidate}, index) => {
    const mapped = value.candidateOccurrenceMap[index];
    return exactKeys(mapped, [
      'boundaryCandidateId', 'timelineSegmentId', 'sourceMediaId',
      'sourceGateAContainerId', 'sourceGateABoundaryCandidateId', 'atomRefs',
    ]) && mapped.boundaryCandidateId === candidate.boundaryCandidateId
      && mapped.timelineSegmentId === container.timelineSegmentId
      && mapped.sourceMediaId === container.sourceMediaId
      && GATE_A_CONTAINER_ID.test(mapped.sourceGateAContainerId)
      && GATE_A_CANDIDATE_ID.test(mapped.sourceGateABoundaryCandidateId)
      && same(mapped.atomRefs, candidate.atomRefs);
  });
}

export function inspectPresentationMeaningBoundarySourcePackageV001(value) {
  if (isObject(value) && dense(value.containers)) {
    const containerIds = value.containers
      .filter(container => isObject(container) && typeof container.containerId === 'string')
      .map(container => container.containerId);
    if (new Set(containerIds).size !== containerIds.length) {
      return {
        status: 'rejected',
        violations: [violation('MEANING_BOUNDARY_CONTAINER_ID_COLLISION', '/containers')],
      };
    }
    const candidateIds = value.containers.flatMap(container =>
      isObject(container) && dense(container.boundaryCandidates)
        ? container.boundaryCandidates
          .filter(candidate => isObject(candidate)
            && typeof candidate.boundaryCandidateId === 'string')
          .map(candidate => candidate.boundaryCandidateId)
        : []);
    if (new Set(candidateIds).size !== candidateIds.length) {
      return {
        status: 'rejected',
        violations: [violation('MEANING_BOUNDARY_CANDIDATE_ID_COLLISION', '/containers')],
      };
    }
  }
  if (!validatePresentationMeaningBoundarySourcePackageV001(value)) {
    return {
      status: 'rejected',
      violations: [violation('MEANING_BOUNDARY_SOURCE_PACKAGE_INVALID', '/sourcePackage')],
    };
  }
  return {status: 'passed', violations: []};
}

const readStable = (workspaceRoot, relativePath) =>
  readPresentationMeaningWorkspaceFileStableV001({workspaceRoot, relativePath});
const observeJson = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (hash(bytes) !== binding.fileSha256 || decoded.status !== 'decoded'
    || decoded.value.schemaVersion !== binding.schemaVersion
    || canonicalSha(decoded.value) !== binding.canonicalSha256) throw new Error('binding');
  return decoded.value;
};

export async function inspectPresentationMeaningBoundarySourceInputsBeforePublicationV001({
  workspaceRoot,
  tracked,
}) {
  const deduplicated = new Map();
  for (const binding of tracked) {
    if (!deduplicated.has(binding.path)) deduplicated.set(binding.path, binding);
  }
  for (const binding of deduplicated.values()) {
    try {
      const bytes = await readStable(workspaceRoot, binding.path);
      if (hash(bytes) !== binding.fileSha256) {
        return Object.freeze({status: 'rejected', changed: binding});
      }
    } catch {
      return Object.freeze({status: 'rejected', changed: binding});
    }
  }
  return Object.freeze({status: 'passed'});
}

export async function runPresentationMeaningBoundarySourcePackageJobV001({workspaceRoot, jobPath}) {
  if (typeof workspaceRoot !== 'string' || typeof jobPath !== 'string') throw new TypeError('runner input');
  const match = new RegExp(`^${JOB_ROOT}/([^/]+)/source-package-job\\.json$`, 'u').exec(jobPath);
  if (!match || !FORMAL_ID.test(match[1])) {
    return {status: 'rejected', violations: [violation('MEANING_BOUNDARY_JOB_INVALID', '/job')]};
  }
  const jobBytes = await readStable(workspaceRoot, jobPath);
  const decoded = decodePresentationCaptionB1StrictJsonV001(jobBytes);
  if (decoded.status !== 'decoded' || !validatePresentationMeaningBoundarySourcePackageJobV001(decoded.value)
    || decoded.value.jobId !== match[1]) {
    return {status: 'rejected', violations: [violation('MEANING_BOUNDARY_JOB_INVALID', '/job')]};
  }
  const job = decoded.value;
  const tracked = [{path: jobPath, fileSha256: hash(jobBytes), pointer: '/job'}];
  for (const binding of [...job.implementationBindings, ...job.approvedContractBindings]) {
    const bytes = await readStable(workspaceRoot, binding.path);
    tracked.push({...binding, pointer: '/job'});
    if (hash(bytes) !== binding.fileSha256) {
      return {status: 'rejected', violations: [violation('MEANING_BOUNDARY_INPUT_BINDING_MISMATCH', '/job')]};
    }
  }
  let timelineDecision;
  const segmenterSources = [];
  try {
    timelineDecision = await observeJson(workspaceRoot, job.timelineCompositionDecisionBinding);
    tracked.push({...job.timelineCompositionDecisionBinding,
      pointer: '/timelineCompositionDecisionBinding'});
    for (const declared of job.segmenterSourceBindings) {
      const source = timelineDecision.sourceMedia.find(item => item.sourceMediaId === declared.sourceMediaId);
      if (!source) throw new Error('binding');
      const retainedArtifacts = {};
      for (const [name, binding] of Object.entries(source.retainedSourceAtomsBinding)) {
        retainedArtifacts[name] = await observeJson(workspaceRoot, binding);
        tracked.push({...binding, pointer: '/segmenterSourceBindings'});
      }
      segmenterSources.push({
        sourceMediaId: declared.sourceMediaId,
        preflightReportBinding: declared.preflightReportBinding,
        evidenceBinding: declared.evidenceBinding,
        preflightReport: await observeJson(workspaceRoot, declared.preflightReportBinding),
        evidence: await observeJson(workspaceRoot, declared.evidenceBinding),
        retainedSourceAtoms: retainedArtifacts.sourceAtoms,
        retainedArtifacts,
      });
      tracked.push(
        {...declared.preflightReportBinding, pointer: '/segmenterSourceBindings'},
        {...declared.evidenceBinding, pointer: '/segmenterSourceBindings'},
      );
    }
  } catch {
    return {status: 'rejected', violations: [violation(
      'MEANING_BOUNDARY_INPUT_BINDING_MISMATCH', '/timelineCompositionDecisionBinding',
    )]};
  }
  const jobBinding = {
    schemaVersion: job.schemaVersion,
    path: jobPath,
    fileSha256: hash(jobBytes),
    canonicalSha256: canonicalSha(job),
  };
  let packageValue;
  try {
    packageValue = buildPresentationMeaningBoundarySourcePackageV001({
      job, jobBinding, timelineDecision, segmenterSources,
    });
  } catch (error) {
    if (['binding', 'source-binding'].includes(error.message)) {
      return {status: 'rejected', violations: [violation(
        'MEANING_BOUNDARY_INPUT_BINDING_MISMATCH', '/segmenterSourceBindings',
      )]};
    }
    if (error.message === 'runtime-binding') {
      return {status: 'rejected', violations: [violation(
        'MEANING_BOUNDARY_RUNTIME_BINDING_MISMATCH', '/runtimeBinding',
      )]};
    }
    const code = error.message === 'package-invalid'
      ? 'MEANING_BOUNDARY_SOURCE_PACKAGE_INVALID'
      : error.message === 'container-collision'
        ? 'MEANING_BOUNDARY_CONTAINER_ID_COLLISION'
        : error.message === 'candidate-collision'
          ? 'MEANING_BOUNDARY_CANDIDATE_ID_COLLISION'
          : 'MEANING_BOUNDARY_OCCURRENCE_MAPPING_MISMATCH';
    return {status: 'rejected', violations: [violation(code, '/containers')]};
  }
  const bytes = formalBytes(packageValue);
  const relativeOutputRoot = path.dirname(job.outputPath).split(path.sep).join('/');
  const reread = await inspectPresentationMeaningBoundarySourceInputsBeforePublicationV001({
    workspaceRoot,
    tracked,
  });
  if (reread.status !== 'passed') {
    return {status: 'rejected', violations: [violation(
      'MEANING_BOUNDARY_INPUT_BINDING_MISMATCH', reread.changed.pointer,
    )]};
  }
  let publicationClaim;
  try {
    publicationClaim = await createPresentationMeaningOwnedStagingRootV001({
      workspaceRoot,
      relativeOutputRoot,
    });
  } catch (error) {
    return {status: error.message === 'publication-target-exists' ? 'rejected' : 'fatal',
      violations: [violation('MEANING_BOUNDARY_PUBLICATION_FAILED', '/outputPath')]};
  }
  try {
    await writeFile(
      path.join(publicationClaim.stagingAbsolute, 'meaning-boundary-source-package.json'),
      bytes,
      {flag: 'wx'},
    );
    const published = await publishPresentationMeaningOwnedStagingRootNoReplaceV001({
      claim: publicationClaim,
      expectedRelativeFiles: ['meaning-boundary-source-package.json'],
    });
    if (published.status !== 'published') {
      return {status: 'rejected', violations: [violation(
        'MEANING_BOUNDARY_PUBLICATION_FAILED', '/outputPath',
      )]};
    }
  } catch {
    return {status: 'fatal', violations: [violation(
      'MEANING_BOUNDARY_PUBLICATION_FAILED', '/outputPath',
    )]};
  }
  return {status: 'passed', sourcePackage: packageValue, bytes};
}

export async function runPresentationMeaningBoundarySourcePackageCliV001(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || argv.length !== 1) {
    process.stdout.write('{"status":"fatal","violations":[]}\n');
    return 2;
  }
  try {
    const result = await runPresentationMeaningBoundarySourcePackageJobV001({
      workspaceRoot: process.cwd(), jobPath: argv[0],
    });
    process.stdout.write(formalBytes(result.status === 'passed' ? result.sourcePackage : {
      status: result.status, violations: result.violations,
    }));
    return result.status === 'passed' ? 0 : result.status === 'rejected' ? 1 : 2;
  } catch {
    process.stdout.write('{"status":"fatal","violations":[]}\n');
    return 2;
  }
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  void runPresentationMeaningBoundarySourcePackageCliV001().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
