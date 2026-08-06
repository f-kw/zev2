import {createHash} from 'node:crypto';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001,
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';

export const PRESENTATION_MEANING_INFORMATION_PACKAGE_SCHEMA_V001 =
  'zev-meaning-information-package-v001';
export const PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001 =
  'zev-meaning-information-package-job-v001';
export const PRESENTATION_MEANING_INFORMATION_FAILURE_REPORT_SCHEMA_V001 =
  'zev-meaning-information-failure-report-v001';

export const PRESENTATION_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V001 = Object.freeze([
  'MEANING_JOB_INVALID',
  'MEANING_JOB_BINDING_MISMATCH',
  'TIMELINE_DECISION_INVALID',
  'TIMELINE_DECISION_BINDING_MISMATCH',
  'SOURCE_IDENTITY_INVALID',
  'SOURCE_MEDIA_BINDING_MISMATCH',
  'RETAINED_ATOMS_BUNDLE_INVALID',
  'RETAINED_ATOMS_BINDING_MISMATCH',
  'TIMELINE_SEGMENT_SOURCE_UNRESOLVED',
  'TIMELINE_SEGMENT_SELECTION_UNRESOLVED',
  'TIMELINE_SELECTION_SET_MISMATCH',
  'SOURCE_ATOM_UNRESOLVED',
  'SOURCE_ATOM_PARTIAL_INTERSECTION',
  'EXPECTED_ATOM_OCCURRENCE_INVALID',
  'SEMANTIC_VALIDATION_INVALID',
  'SEMANTIC_VALIDATION_BINDING_MISMATCH',
  'CAPTION_COUNT_INVALID',
  'CAPTION_ATOM_COVERAGE_MISMATCH',
  'CAPTION_ATOM_SEQUENCE_MISMATCH',
  'CAPTION_SEGMENT_SPAN_INVALID',
  'CAPTION_TEXT_MISMATCH',
  'CAPTION_ANCHOR_MISMATCH',
  'CAPTION_SOURCE_TIME_MISMATCH',
  'TITLE_INPUT_MISMATCH',
  'SEMANTIC_OBSERVATIONS_NOT_EMPTY',
  'PRESENTATION_KEY_LEAKED',
  'MEANING_PACKAGE_BYTE_INVALID',
  'MEANING_PACKAGE_NON_DETERMINISTIC',
  'MEANING_PUBLICATION_TARGET_INVALID',
  'MEANING_PUBLICATION_FAILED',
]);

export const PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001 =
  Object.freeze([
    Object.freeze({
      role: 'meaning-package',
      path: 'evals/clip_composition/presentation_meaning_information_package_v001.mjs',
    }),
    Object.freeze({
      role: 'meaning-package-runner',
      path: 'evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs',
    }),
    Object.freeze({
      role: 'retained-atoms',
      path: 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs',
    }),
    Object.freeze({
      role: 'strict-json',
      path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    }),
  ]);

export const PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001 =
  Object.freeze([
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

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const B1_JOB_SHA_PREFIX = /^[0-9a-f]{32}$/u;
const B1_REPORT_ID_PREFIX = 'presentation-meaning-boundary-validation-report-';
const B1_SELECTION_ID_PREFIX = 'presentation-meaning-boundary-selection-';
const SOURCE_REF = /^youtube:[A-Za-z0-9_-]{11}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const PRESENTATION_KEYS = new Set([
  'lines', 'lineOrdinal', 'displayPage', 'logicalWidth',
  'maxLogicalWidthPerLine', 'maxLinesPerPage', 'characterWidthRule',
  'format', 'screenLayoutId', 'presetId', 'visualStateId', 'crop',
  'cropDecision', 'viewports', 'fontSizePx', 'fontFamily', 'safeAreaPx',
  'position', 'transition', 'audioPolicy',
]);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const occurrenceKey = ref => `${ref.timelineSegmentId}\u0000${ref.sourceMediaId}\u0000${ref.atomId}`;

const b1JobShaPrefixFromArtifactId = (artifactId, prefix) => {
  if (typeof artifactId !== 'string' || !artifactId.startsWith(prefix)) return null;
  const suffix = artifactId.slice(prefix.length);
  return B1_JOB_SHA_PREFIX.test(suffix) ? suffix : null;
};

export const validatePresentationMeaningSemanticArtifactLinkV001 = (
  semanticValidation,
  semanticSelection,
) => {
  const reportSuffix = b1JobShaPrefixFromArtifactId(
    semanticValidation?.reportId,
    B1_REPORT_ID_PREFIX,
  );
  const selectionSuffix = b1JobShaPrefixFromArtifactId(
    semanticSelection?.selectionId,
    B1_SELECTION_ID_PREFIX,
  );
  // v001 artifacts expose only the common 32-hex B1 job-file SHA prefix in their IDs.
  // This links the two published artifacts, but does not prove the B1 job path or full SHA.
  return reportSuffix !== null && reportSuffix === selectionSuffix;
};

export const makePresentationMeaningInformationViolationV001 = (code, pointer) => {
  if (!PRESENTATION_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V001.includes(code)) {
    throw new TypeError(`unknown meaning-information violation code: ${code}`);
  }
  return Object.freeze({code, path: pointer, relatedIds: Object.freeze([])});
};

export const sha256PresentationMeaningInformationBytesV001 = bytes =>
  createHash('sha256').update(bytes).digest('hex');

export function serializePresentationMeaningInformationFormalJsonV001(value) {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return result.bytes;
}

export function canonicalizePresentationMeaningInformationJsonV001(value) {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') throw new TypeError('canonical JSON serialization failed');
  return result.bytes;
}

export const canonicalSha256PresentationMeaningInformationJsonV001 = value =>
  sha256PresentationMeaningInformationBytesV001(
    canonicalizePresentationMeaningInformationJsonV001(value),
  );

export const validatePresentationMeaningMediaBindingV001 = value =>
  exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256);

export const validatePresentationMeaningJsonBindingV001 = value =>
  exactKeys(value, ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256'])
  && typeof value.schemaVersion === 'string'
  && value.schemaVersion.length > 0
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && SHA256.test(value.canonicalSha256);

export const validatePresentationMeaningImplementationBindingV001 = value =>
  exactKeys(value, ['path', 'fileSha256', 'role'])
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && typeof value.role === 'string'
  && value.role.length > 0;

export const validatePresentationMeaningAtomRefV001 = value =>
  exactKeys(value, ['timelineSegmentId', 'sourceMediaId', 'atomId'])
  && FORMAL_ID.test(value.timelineSegmentId)
  && FORMAL_ID.test(value.sourceMediaId)
  && typeof value.atomId === 'string'
  && value.atomId.length > 0;

const validateAnchor = (value, edge) => exactKeys(value, ['atomRef', 'edge'])
  && validatePresentationMeaningAtomRefV001(value.atomRef)
  && value.edge === edge;

const validRetainedBindings = value => exactKeys(value, [
  'sourceAtoms', 'generationManifest', 'validationReport',
])
  && validatePresentationMeaningJsonBindingV001(value.sourceAtoms)
  && value.sourceAtoms.schemaVersion === 'presentation-retained-source-atoms-v001'
  && validatePresentationMeaningJsonBindingV001(value.generationManifest)
  && value.generationManifest.schemaVersion
    === 'presentation-retained-source-atoms-generation-manifest-v001'
  && validatePresentationMeaningJsonBindingV001(value.validationReport)
  && value.validationReport.schemaVersion
    === 'presentation-retained-source-atoms-validation-report-v001';

const validateSourceMedia = (value, index) => exactKeys(value, [
  'sourceMediaId', 'ordinal', 'sourceRef', 'mediaBinding',
  'sourceIdentityBinding', 'retainedSourceAtomsBinding',
])
  && value.sourceMediaId === `source-media-${String(index + 1).padStart(6, '0')}`
  && value.ordinal === index + 1
  && SOURCE_REF.test(value.sourceRef)
  && validatePresentationMeaningMediaBindingV001(value.mediaBinding)
  && validatePresentationMeaningJsonBindingV001(value.sourceIdentityBinding)
  && ['presentation-real-data-source-identity-v001',
    'presentation-material-source-identity-v001'].includes(
    value.sourceIdentityBinding.schemaVersion,
  )
  && validRetainedBindings(value.retainedSourceAtomsBinding);

const validateTimelineSegment = (value, index, sourceIds) => exactKeys(value, [
  'segmentId', 'ordinal', 'sourceMediaId', 'sourceStartMs', 'sourceEndMs',
])
  && value.segmentId === `segment-${String(index + 1).padStart(4, '0')}`
  && value.ordinal === index + 1
  && sourceIds.has(value.sourceMediaId)
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const validateTitle = value => exactKeys(value, ['text', 'inputMode'])
  && typeof value.text === 'string'
  && !/[\r\n]/u.test(value.text)
  && ((value.text === '' && value.inputMode === 'none')
    || (value.text.length > 0 && value.inputMode === 'human'));

export function validatePresentationMeaningInformationPackageJobV001(job) {
  if (!exactKeys(job, [
    'schemaVersion', 'jobId', 'packageId', 'title',
    'timelineCompositionDecisionBinding', 'semanticSelectionValidationBinding',
    'semanticSelectionBinding', 'outputPath', 'implementationBindings',
    'approvedContractBindings',
  ])
    || job.schemaVersion !== PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001
    || !FORMAL_ID.test(job.jobId)
    || job.packageId !== `${job.jobId}-meaning-information`
    || !FORMAL_ID.test(job.packageId)
    || !FORMAL_ID.test(`${job.packageId}-timeline`)
    || !validateTitle(job.title)
    || !validatePresentationMeaningJsonBindingV001(job.timelineCompositionDecisionBinding)
    || job.timelineCompositionDecisionBinding.schemaVersion
      !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001
    || !validatePresentationMeaningJsonBindingV001(job.semanticSelectionValidationBinding)
    || job.semanticSelectionValidationBinding.schemaVersion
      !== 'presentation-caption-meaning-boundary-validation-report-v001'
    || !validatePresentationMeaningJsonBindingV001(job.semanticSelectionBinding)
    || job.semanticSelectionBinding.schemaVersion !== 'presentation-meaning-boundary-selection-v001'
    || !WORKSPACE_PATH.test(job.outputPath)
    || !dense(job.implementationBindings)
    || job.implementationBindings.length
      !== PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001.length
    || !job.implementationBindings.every(validatePresentationMeaningImplementationBindingV001)
    || !job.implementationBindings.every((binding, index) =>
      binding.role === PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001[index].role
      && binding.path
        === PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001[index].path)
    || !dense(job.approvedContractBindings)
    || !same(
      job.approvedContractBindings,
      PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001,
    )) return false;
  return true;
}

const validateRawAtom = (atom, sourceRef) => isObject(atom)
  && Object.keys(atom).every(key => [
    'atomId', 'speechId', 'speaker', 'text', 'startMs', 'endMs', 'sourceRef',
  ].includes(key))
  && ['atomId', 'speechId', 'text', 'startMs', 'endMs', 'sourceRef']
    .every(key => Object.hasOwn(atom, key))
  && typeof atom.atomId === 'string' && atom.atomId.length > 0
  && Number.isSafeInteger(atom.speechId)
  && typeof atom.text === 'string' && atom.text.length > 0
  && !/[\r\n]/u.test(atom.text)
  && nonnegative(atom.startMs) && positive(atom.endMs) && atom.startMs < atom.endMs
  && atom.sourceRef === sourceRef;

const intervalKey = (startMs, endMs) => `${startMs}:${endMs}`;

export function derivePresentationExpectedAtomOccurrencesV001({
  timelineDecision,
  retainedSources,
}) {
  if (!validatePresentationTimelineCompositionDecisionV001(timelineDecision)
    || !dense(retainedSources)) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'EXPECTED_ATOM_OCCURRENCE_INVALID',
        '/expectedAtomOccurrences',
      )],
    };
  }
  const retainedBySource = new Map();
  for (const retained of retainedSources) {
    if (!exactKeys(retained, [
      'sourceMediaId', 'sourceAtoms', 'generationManifest', 'validationReport',
    ]) || retainedBySource.has(retained.sourceMediaId)) {
      return {
        status: 'rejected',
        violations: [makePresentationMeaningInformationViolationV001(
          'EXPECTED_ATOM_OCCURRENCE_INVALID',
          '/expectedAtomOccurrences',
        )],
      };
    }
    retainedBySource.set(retained.sourceMediaId, retained);
  }
  const sourceById = new Map(timelineDecision.sourceMedia.map(source => [source.sourceMediaId, source]));
  for (const segment of timelineDecision.segments) {
    if (!sourceById.has(segment.sourceMediaId) || !retainedBySource.has(segment.sourceMediaId)) {
      return {
        status: 'rejected',
        violations: [makePresentationMeaningInformationViolationV001(
          'TIMELINE_SEGMENT_SOURCE_UNRESOLVED',
          '/timelineDecision/segments',
        )],
      };
    }
  }
  const atomBySource = new Map();
  const selectionBySource = new Map();
  for (const source of timelineDecision.sourceMedia) {
    const retained = retainedBySource.get(source.sourceMediaId);
    const sourceAtoms = retained?.sourceAtoms;
    if (!isObject(sourceAtoms)
      || sourceAtoms.sourceRef !== source.sourceRef
      || !isObject(sourceAtoms.selection)
      || !dense(sourceAtoms.selection.segments)
      || !dense(sourceAtoms.rawSourceAtoms)) {
      return {
        status: 'rejected',
        violations: [makePresentationMeaningInformationViolationV001(
          'RETAINED_ATOMS_BUNDLE_INVALID',
          '/retainedSources',
        )],
      };
    }
    const atoms = new Map();
    for (const atom of sourceAtoms.rawSourceAtoms) {
      if (!validateRawAtom(atom, source.sourceRef) || atoms.has(atom.atomId)) {
        return {
          status: 'rejected',
          violations: [makePresentationMeaningInformationViolationV001(
            'SOURCE_ATOM_UNRESOLVED',
            '/retainedSources',
          )],
        };
      }
      atoms.set(atom.atomId, atom);
    }
    atomBySource.set(source.sourceMediaId, atoms);
    selectionBySource.set(source.sourceMediaId, sourceAtoms.selection.segments);
    const expectedIntervals = [...new Set(
      timelineDecision.segments
        .filter(segment => segment.sourceMediaId === source.sourceMediaId)
        .map(segment => intervalKey(segment.sourceStartMs, segment.sourceEndMs)),
    )].sort();
    const selectedIntervals = [...new Set(sourceAtoms.selection.segments.map(
      segment => intervalKey(segment.sourceStartMs, segment.sourceEndMs),
    ))].sort();
    if (!same(expectedIntervals, selectedIntervals)) {
      return {
        status: 'rejected',
        violations: [makePresentationMeaningInformationViolationV001(
          'TIMELINE_SELECTION_SET_MISMATCH',
          '/timelineDecision/segments',
        )],
      };
    }
  }

  const occurrences = [];
  const occurrenceAtoms = new Map();
  for (const segment of timelineDecision.segments) {
    const selected = selectionBySource.get(segment.sourceMediaId).filter(candidate =>
      candidate.sourceStartMs === segment.sourceStartMs
      && candidate.sourceEndMs === segment.sourceEndMs);
    if (selected.length !== 1) {
      return {
        status: 'rejected',
        violations: [makePresentationMeaningInformationViolationV001(
          'TIMELINE_SEGMENT_SELECTION_UNRESOLVED',
          '/timelineDecision/segments',
        )],
      };
    }
    const atoms = atomBySource.get(segment.sourceMediaId);
    for (const atom of atoms.values()) {
      const overlap = Math.min(atom.endMs, segment.sourceEndMs)
        - Math.max(atom.startMs, segment.sourceStartMs);
      if (overlap > 0
        && !(atom.startMs >= segment.sourceStartMs && atom.endMs <= segment.sourceEndMs)) {
        return {
          status: 'rejected',
          violations: [makePresentationMeaningInformationViolationV001(
            'SOURCE_ATOM_PARTIAL_INTERSECTION',
            '/retainedSources',
          )],
        };
      }
    }
    if (!dense(selected[0].atomIds)) {
      return {
        status: 'rejected',
        violations: [makePresentationMeaningInformationViolationV001(
          'EXPECTED_ATOM_OCCURRENCE_INVALID',
          '/expectedAtomOccurrences',
        )],
      };
    }
    const seen = new Set();
    for (const atomId of selected[0].atomIds) {
      const atom = atoms.get(atomId);
      if (!atom || seen.has(atomId)) {
        return {
          status: 'rejected',
          violations: [makePresentationMeaningInformationViolationV001(
            'SOURCE_ATOM_UNRESOLVED',
            '/retainedSources',
          )],
        };
      }
      if (atom.startMs < segment.sourceStartMs || atom.endMs > segment.sourceEndMs) {
        return {
          status: 'rejected',
          violations: [makePresentationMeaningInformationViolationV001(
            'SOURCE_ATOM_PARTIAL_INTERSECTION',
            '/retainedSources',
          )],
        };
      }
      seen.add(atomId);
      const ref = {
        timelineSegmentId: segment.segmentId,
        sourceMediaId: segment.sourceMediaId,
        atomId,
      };
      occurrences.push(ref);
      occurrenceAtoms.set(occurrenceKey(ref), atom);
    }
  }
  return {
    status: 'passed',
    violations: [],
    expectedAtomOccurrences: occurrences,
    occurrenceAtoms,
  };
}

const validateBoundaryCandidate = (value, ordinal, timelineSegmentId, sourceMediaId) =>
  exactKeys(value, [
    'boundaryCandidateId', 'ordinal', 'atomRefs', 'text', 'startAnchor', 'endAnchor',
    'sourceStartMs', 'sourceEndMs', 'isWordLike',
  ])
  && FORMAL_ID.test(value.boundaryCandidateId)
  && value.ordinal === ordinal
  && dense(value.atomRefs) && value.atomRefs.length > 0
  && value.atomRefs.every(ref => validatePresentationMeaningAtomRefV001(ref)
    && ref.timelineSegmentId === timelineSegmentId
    && ref.sourceMediaId === sourceMediaId)
  && typeof value.text === 'string' && value.text.length > 0 && !/[\r\n]/u.test(value.text)
  && validateAnchor(value.startAnchor, 'start')
  && validateAnchor(value.endAnchor, 'end')
  && same(value.startAnchor.atomRef, value.atomRefs[0])
  && same(value.endAnchor.atomRef, value.atomRefs.at(-1))
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs
  && typeof value.isWordLike === 'boolean';

export function validatePresentationMeaningBoundarySourcePackageForMeaningV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'packageId', 'timelineCompositionDecisionBinding', 'runtimeBinding',
    'containers', 'candidateOccurrenceMap', 'taskDescription', 'provenance',
  ])
    || value.schemaVersion !== 'presentation-meaning-boundary-source-package-v001'
    || !FORMAL_ID.test(value.packageId)
    || !validatePresentationMeaningJsonBindingV001(value.timelineCompositionDecisionBinding)
    || value.timelineCompositionDecisionBinding.schemaVersion
      !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001
    || !exactKeys(value.runtimeBinding, [
      'segmenterSources', 'strictJsonImplementationBinding',
    ])
    || !dense(value.runtimeBinding.segmenterSources)
    || value.runtimeBinding.segmenterSources.length < 1
    || !value.runtimeBinding.segmenterSources.every(entry => exactKeys(entry, [
      'sourceMediaId', 'preflightReportBinding', 'evidenceBinding', 'runtimeProjection',
    ])
      && FORMAL_ID.test(entry.sourceMediaId)
      && validatePresentationMeaningJsonBindingV001(entry.preflightReportBinding)
      && validatePresentationMeaningJsonBindingV001(entry.evidenceBinding)
      && exactKeys(entry.runtimeProjection, [
        'nodeBinarySha256', 'nodeVersion', 'icuVersion', 'resolvedLocale',
        'resolvedGranularity',
      ])
      && SHA256.test(entry.runtimeProjection.nodeBinarySha256)
      && ['nodeVersion', 'icuVersion', 'resolvedLocale', 'resolvedGranularity']
        .every(key => typeof entry.runtimeProjection[key] === 'string'
          && entry.runtimeProjection[key].length > 0))
    || !validatePresentationMeaningImplementationBindingV001(
      value.runtimeBinding.strictJsonImplementationBinding,
    )
    || !dense(value.containers) || value.containers.length < 1
    || !dense(value.candidateOccurrenceMap)
    || value.taskDescription !== '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、発話の意味が自然に完結するまとまりの終端をmeaningGroupEndBoundaryCandidateIdで選んでください。最後のまとまりはcontainer最後の候補で終えてください。本文、候補ID、時刻、順序を変更しないでください。'
    || !exactKeys(value.provenance, [
      'sourcePackageJobBinding', 'timelineCompositionDecisionBinding',
      'implementationBindings',
    ])
    || !validatePresentationMeaningJsonBindingV001(value.provenance.sourcePackageJobBinding)
    || !validatePresentationMeaningJsonBindingV001(
      value.provenance.timelineCompositionDecisionBinding,
    )
    || !dense(value.provenance.implementationBindings)
    || value.provenance.implementationBindings.length !== 4
    || !value.provenance.implementationBindings.every(
      validatePresentationMeaningImplementationBindingV001,
    )
    || !same(value.provenance.implementationBindings.map(({path: bindingPath, role}) => ({
      path: bindingPath,
      role,
    })), [
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
        role: 'meaning-source-package',
      },
      {
        path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
        role: 'gate-a-core',
      },
      {
        path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
        role: 'gate-a-preflight',
      },
      {
        path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
        role: 'strict-json',
      },
    ])) return false;
  const runtimeSourceIds = value.runtimeBinding.segmenterSources.map(entry => entry.sourceMediaId);
  if (new Set(runtimeSourceIds).size !== runtimeSourceIds.length
    || value.runtimeBinding.segmenterSources.some(entry =>
      entry.preflightReportBinding.schemaVersion
        !== 'presentation-segmenter-boundary-preflight-report-v001'
      || entry.evidenceBinding.schemaVersion
        !== 'presentation-segmenter-boundary-evidence-v001')
    || value.runtimeBinding.strictJsonImplementationBinding.path
      !== 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'
    || value.runtimeBinding.strictJsonImplementationBinding.role !== 'strict-json') return false;
  const containerIds = new Set();
  const candidateIds = new Set();
  const flattened = [];
  for (const [containerIndex, container] of value.containers.entries()) {
    if (!exactKeys(container, [
      'containerId', 'ordinal', 'sourceMediaId', 'timelineSegmentId', 'boundaryCandidates',
    ])
      || container.containerId !== `segmenter-container-${String(containerIndex + 1).padStart(6, '0')}`
      || container.ordinal !== containerIndex + 1
      || !FORMAL_ID.test(container.sourceMediaId)
      || !FORMAL_ID.test(container.timelineSegmentId)
      || containerIds.has(container.containerId)
      || !dense(container.boundaryCandidates) || container.boundaryCandidates.length < 1) return false;
    containerIds.add(container.containerId);
    for (const [candidateIndex, candidate] of container.boundaryCandidates.entries()) {
      if (!validateBoundaryCandidate(
        candidate,
        candidateIndex + 1,
        container.timelineSegmentId,
        container.sourceMediaId,
      )
        || candidate.boundaryCandidateId
          !== `segmenter-boundary-${String(flattened.length + 1).padStart(6, '0')}`
        || candidateIds.has(candidate.boundaryCandidateId)) return false;
      candidateIds.add(candidate.boundaryCandidateId);
      flattened.push({container, candidate});
    }
  }
  if (flattened.length !== value.candidateOccurrenceMap.length) return false;
  if (!value.candidateOccurrenceMap.every((entry, index) => {
    const {container, candidate} = flattened[index];
    return exactKeys(entry, [
      'boundaryCandidateId', 'timelineSegmentId', 'sourceMediaId',
      'sourceGateAContainerId', 'sourceGateABoundaryCandidateId', 'atomRefs',
    ])
      && entry.boundaryCandidateId === candidate.boundaryCandidateId
      && entry.timelineSegmentId === container.timelineSegmentId
      && entry.sourceMediaId === container.sourceMediaId
      && typeof entry.sourceGateAContainerId === 'string'
      && entry.sourceGateAContainerId.length > 0
      && typeof entry.sourceGateABoundaryCandidateId === 'string'
      && entry.sourceGateABoundaryCandidateId.length > 0
      && same(entry.atomRefs, candidate.atomRefs);
  })) return false;
  const containerSourceIds = [...new Set(value.containers.map(container => container.sourceMediaId))];
  return same(runtimeSourceIds, containerSourceIds)
    && same(
      value.provenance.timelineCompositionDecisionBinding,
      value.timelineCompositionDecisionBinding,
    );
}

export const validatePresentationMeaningSelectionWrapperV001 = value => {
  if (!exactKeys(value, [
    'schemaVersion', 'selectionId', 'sourcePackageBinding', 'b6ManifestBinding',
    'providerEnvelopeBinding', 'response',
  ])
    || value.schemaVersion !== 'presentation-meaning-boundary-selection-v001'
    || !FORMAL_ID.test(value.selectionId)
    || b1JobShaPrefixFromArtifactId(value.selectionId, B1_SELECTION_ID_PREFIX) === null
    || !validatePresentationMeaningJsonBindingV001(value.sourcePackageBinding)
    || value.sourcePackageBinding.schemaVersion
      !== 'presentation-meaning-boundary-source-package-v001'
    || !validatePresentationMeaningJsonBindingV001(value.b6ManifestBinding)
    || value.b6ManifestBinding.schemaVersion !== 'presentation-meaning-boundary-b6-manifest-v001'
    || !validatePresentationMeaningJsonBindingV001(value.providerEnvelopeBinding)
    || value.providerEnvelopeBinding.schemaVersion
      !== 'presentation-meaning-boundary-provider-response-envelope-v001'
    || !exactKeys(value.response, ['status', 'containers'])
    || value.response.status !== 'complete'
    || !dense(value.response.containers) || value.response.containers.length < 1) return false;
  return value.response.containers.every(container => exactKeys(container, [
    'containerId', 'meaningGroups',
  ])
    && FORMAL_ID.test(container.containerId)
    && dense(container.meaningGroups) && container.meaningGroups.length > 0
    && container.meaningGroups.every(group => exactKeys(group, [
      'meaningGroupEndBoundaryCandidateId',
    ]) && FORMAL_ID.test(group.meaningGroupEndBoundaryCandidateId)));
};

const validateSelectionBindingObject = value => value === null
  || (validatePresentationMeaningJsonBindingV001(value)
    && value.schemaVersion === 'presentation-meaning-boundary-selection-v001');

const MEANING_SELECTION_CHECKS = Object.freeze([
  'sourcePackageBinding',
  'responseEnvelope',
  'responseSchema',
  'containerBijection',
  'candidateResolution',
  'endMonotonicity',
  'containerFinalEnd',
  'candidateCoverage',
  'atomOccurrenceCoverage',
  'captionProjection',
]);

export const validatePresentationMeaningBoundaryValidationReportV001 = value => {
  if (!exactKeys(value, [
    'schemaVersion', 'reportId', 'status', 'sourcePackageBinding', 'rawResponseBinding',
    'selectionBinding', 'checks', 'violations', 'selectionProjection',
    'captionProjection', 'implementationBindings',
  ])
    || value.schemaVersion !== 'presentation-caption-meaning-boundary-validation-report-v001'
    || !FORMAL_ID.test(value.reportId)
    || b1JobShaPrefixFromArtifactId(value.reportId, B1_REPORT_ID_PREFIX) === null
    || value.status !== 'passed'
    || !validatePresentationMeaningJsonBindingV001(value.sourcePackageBinding)
    || !validatePresentationMeaningMediaBindingV001(value.rawResponseBinding)
    || !validateSelectionBindingObject(value.selectionBinding)
    || value.selectionBinding === null
    || !dense(value.checks) || value.checks.length !== MEANING_SELECTION_CHECKS.length
    || !value.checks.every((check, index) => exactKeys(check, ['name', 'status', 'violationCodes'])
      && check.name === MEANING_SELECTION_CHECKS[index]
      && check.status === 'passed' && dense(check.violationCodes) && check.violationCodes.length === 0)
    || !dense(value.violations) || value.violations.length !== 0
    || !exactKeys(value.selectionProjection, [
      'containerCount', 'meaningGroupCount', 'selectedBoundaryCount',
      'selectionCanonicalSha256',
    ])
    || !positive(value.selectionProjection.containerCount)
    || !positive(value.selectionProjection.meaningGroupCount)
    || value.selectionProjection.selectedBoundaryCount
      !== value.selectionProjection.meaningGroupCount
    || !SHA256.test(value.selectionProjection.selectionCanonicalSha256)
    || !exactKeys(value.captionProjection, [
      'captionCount', 'atomOccurrenceCount', 'captionTextSequenceCanonicalSha256',
      'captionTimingSequenceCanonicalSha256', 'captionAtomRefSequenceCanonicalSha256',
    ])
    || !positive(value.captionProjection.captionCount)
    || !positive(value.captionProjection.atomOccurrenceCount)
    || !SHA256.test(value.captionProjection.captionTextSequenceCanonicalSha256)
    || !SHA256.test(value.captionProjection.captionTimingSequenceCanonicalSha256)
    || !SHA256.test(value.captionProjection.captionAtomRefSequenceCanonicalSha256)
    || !dense(value.implementationBindings)
    || value.implementationBindings.length !== 3
    || !value.implementationBindings.every(validatePresentationMeaningImplementationBindingV001)
    || !same(value.implementationBindings.map(({path: bindingPath, role}) => ({
      path: bindingPath,
      role,
    })), [
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
        role: 'meaning-selection',
      },
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
        role: 'meaning-source-package',
      },
      {
        path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
        role: 'strict-json-codec',
      },
    ])) return false;
  return true;
};

export function validatePresentationMeaningSemanticInputsV001({
  sourcePackage,
  semanticValidation,
  semanticSelection,
}) {
  return validatePresentationMeaningBoundarySourcePackageForMeaningV001(sourcePackage)
    && validatePresentationMeaningBoundaryValidationReportV001(semanticValidation)
    && validatePresentationMeaningSelectionWrapperV001(semanticSelection)
    && validatePresentationMeaningSemanticArtifactLinkV001(
      semanticValidation,
      semanticSelection,
    );
}

const buildCaptions = ({sourcePackage, response, occurrenceAtoms}) => {
  if (response.containers.length !== sourcePackage.containers.length) {
    throw makePresentationMeaningInformationViolationV001(
      'CAPTION_ATOM_COVERAGE_MISMATCH',
      '/candidatePackage/captions',
    );
  }
  const captions = [];
  for (const [containerIndex, responseContainer] of response.containers.entries()) {
    const container = sourcePackage.containers[containerIndex];
    if (responseContainer.containerId !== container.containerId) {
      throw makePresentationMeaningInformationViolationV001(
        'CAPTION_ATOM_COVERAGE_MISMATCH',
        '/candidatePackage/captions',
      );
    }
    const candidateIndex = new Map(container.boundaryCandidates.map((candidate, index) => [
      candidate.boundaryCandidateId,
      index,
    ]));
    let previousEnd = -1;
    for (const group of responseContainer.meaningGroups) {
      const end = candidateIndex.get(group.meaningGroupEndBoundaryCandidateId);
      if (!Number.isSafeInteger(end) || end <= previousEnd) {
        throw makePresentationMeaningInformationViolationV001(
          'CAPTION_ATOM_SEQUENCE_MISMATCH',
          '/candidatePackage/captions',
        );
      }
      const refs = container.boundaryCandidates
        .slice(previousEnd + 1, end + 1)
        .flatMap(candidate => candidate.atomRefs);
      if (refs.length === 0) {
        throw makePresentationMeaningInformationViolationV001(
          'CAPTION_COUNT_INVALID',
          '/candidatePackage/captions',
        );
      }
      const atomRecords = refs.map(ref => occurrenceAtoms.get(occurrenceKey(ref)));
      if (atomRecords.some(atom => !atom)) {
        throw makePresentationMeaningInformationViolationV001(
          'SOURCE_ATOM_UNRESOLVED',
          '/retainedSources',
        );
      }
      const firstRef = refs[0];
      if (refs.some(ref => ref.timelineSegmentId !== firstRef.timelineSegmentId)) {
        throw makePresentationMeaningInformationViolationV001(
          'CAPTION_SEGMENT_SPAN_INVALID',
          '/candidatePackage/captions',
        );
      }
      const ordinal = captions.length + 1;
      captions.push({
        captionId: `caption-${String(ordinal).padStart(6, '0')}`,
        ordinal,
        timelineSegmentId: firstRef.timelineSegmentId,
        text: atomRecords.map(atom => atom.text).join(''),
        atomRefs: refs,
        startAnchor: {atomRef: firstRef, edge: 'start'},
        endAnchor: {atomRef: refs.at(-1), edge: 'end'},
        sourceStartMs: atomRecords[0].startMs,
        sourceEndMs: atomRecords.at(-1).endMs,
      });
      previousEnd = end;
    }
    if (previousEnd !== container.boundaryCandidates.length - 1) {
      throw makePresentationMeaningInformationViolationV001(
        'CAPTION_ATOM_COVERAGE_MISMATCH',
        '/candidatePackage/captions',
      );
    }
  }
  return captions;
};

const recursivelyContainsPresentationKey = value => {
  if (Array.isArray(value)) return value.some(recursivelyContainsPresentationKey);
  if (!isObject(value)) return false;
  return Object.entries(value).some(([key, child]) =>
    PRESENTATION_KEYS.has(key) || recursivelyContainsPresentationKey(child));
};

export function derivePresentationMeaningCaptionProjectionV001(captions) {
  if (!dense(captions)) throw new TypeError('captions must be a dense array');
  const atomOccurrenceCount = captions.reduce(
    (total, caption) => total + (Array.isArray(caption.atomRefs) ? caption.atomRefs.length : 0),
    0,
  );
  const captionTextSequence = captions.map(caption => ({
    captionId: caption.captionId,
    text: caption.text,
  }));
  const captionTimingSequence = captions.map(caption => ({
    captionId: caption.captionId,
    startAnchor: caption.startAnchor,
    endAnchor: caption.endAnchor,
    sourceStartMs: caption.sourceStartMs,
    sourceEndMs: caption.sourceEndMs,
  }));
  const captionAtomRefSequence = captions.map(caption => ({
    captionId: caption.captionId,
    atomRefs: caption.atomRefs,
  }));
  return {
    captionCount: captions.length,
    atomOccurrenceCount,
    captionTextSequenceCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(captionTextSequence),
    captionTimingSequenceCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(captionTimingSequence),
    captionAtomRefSequenceCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(captionAtomRefSequence),
  };
}

export function derivePresentationMeaningSelectionProjectionV001(response) {
  if (!exactKeys(response, ['status', 'containers'])
    || response.status !== 'complete'
    || !dense(response.containers)) throw new TypeError('complete response is required');
  const meaningGroupCount = response.containers.reduce(
    (total, container) => total + container.meaningGroups.length,
    0,
  );
  return {
    containerCount: response.containers.length,
    meaningGroupCount,
    selectedBoundaryCount: meaningGroupCount,
    selectionCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(response),
  };
}

const multiset = refs => {
  const counts = new Map();
  for (const ref of refs) counts.set(occurrenceKey(ref), (counts.get(occurrenceKey(ref)) ?? 0) + 1);
  return [...counts.entries()].sort(([left], [right]) => Buffer.compare(
    Buffer.from(left, 'utf8'),
    Buffer.from(right, 'utf8'),
  ));
};

const MEANING_INFORMATION_PACKAGE_KEYS_V001 = Object.freeze([
  'schemaVersion', 'packageId', 'sourceMedia', 'timelineComposition', 'captions',
  'title', 'semanticObservations', 'provenance',
]);

const validatePresentationMeaningInformationPackageRootEnvelopeV001 = value => {
  const reject = (code, pointer) => ({
    status: 'rejected',
    violations: [makePresentationMeaningInformationViolationV001(code, pointer)],
  });
  if (!isObject(value)
    || !MEANING_INFORMATION_PACKAGE_KEYS_V001.every(key => Object.hasOwn(value, key))
    || value.schemaVersion !== PRESENTATION_MEANING_INFORMATION_PACKAGE_SCHEMA_V001
    || !FORMAL_ID.test(value.packageId)
    || !dense(value.sourceMedia) || value.sourceMedia.length < 1
    || value.sourceMedia.length > 999999
    || !value.sourceMedia.every(validateSourceMedia)
    || !exactKeys(value.timelineComposition, ['timelineId', 'segments'])
    || value.timelineComposition.timelineId !== `${value.packageId}-timeline`
    || !FORMAL_ID.test(value.timelineComposition.timelineId)
    || !dense(value.timelineComposition.segments)
    || value.timelineComposition.segments.length < 1
    || value.timelineComposition.segments.length > 9999
    || !dense(value.captions)
    || value.captions.length > 999999
    || !exactKeys(value.provenance, [
      'formalJobBinding', 'timelineCompositionBinding',
      'semanticSelectionValidationBinding',
    ])
    || !validatePresentationMeaningJsonBindingV001(value.provenance.formalJobBinding)
    || value.provenance.formalJobBinding.schemaVersion
      !== PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001
    || !validatePresentationMeaningJsonBindingV001(value.provenance.timelineCompositionBinding)
    || value.provenance.timelineCompositionBinding.schemaVersion
      !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001
    || !validatePresentationMeaningJsonBindingV001(
      value.provenance.semanticSelectionValidationBinding,
    )
    || value.provenance.semanticSelectionValidationBinding.schemaVersion
      !== 'presentation-caption-meaning-boundary-validation-report-v001') {
    return reject('MEANING_PACKAGE_BYTE_INVALID', '/candidatePackage');
  }
  const sourceIds = new Set(value.sourceMedia.map(source => source.sourceMediaId));
  if (sourceIds.size !== value.sourceMedia.length
    || new Set(value.sourceMedia.map(source => source.sourceRef)).size
      !== value.sourceMedia.length
    || value.sourceMedia.some(source => !value.timelineComposition.segments.some(
      segment => segment.sourceMediaId === source.sourceMediaId,
    ))) {
    return reject('TIMELINE_DECISION_INVALID', '/timelineDecision');
  }
  if (!value.timelineComposition.segments.every((segment, index) =>
    validateTimelineSegment(segment, index, sourceIds))) {
    return reject('TIMELINE_DECISION_INVALID', '/timelineDecision');
  }
  const firstSeenSourceIds = [];
  const seenSourceIds = new Set();
  for (const segment of value.timelineComposition.segments) {
    if (!seenSourceIds.has(segment.sourceMediaId)) {
      seenSourceIds.add(segment.sourceMediaId);
      firstSeenSourceIds.push(segment.sourceMediaId);
    }
  }
  if (!same(firstSeenSourceIds, value.sourceMedia.map(source => source.sourceMediaId))) {
    return reject('TIMELINE_DECISION_INVALID', '/timelineDecision');
  }
  return {status: 'passed', violations: []};
};

const validatePresentationMeaningInformationMetadataEnvelopeV001 = value => {
  const reject = (code, pointer) => ({
    status: 'rejected',
    violations: [makePresentationMeaningInformationViolationV001(code, pointer)],
  });
  if (!validateTitle(value.title)) {
    return reject('TITLE_INPUT_MISMATCH', '/candidatePackage/title');
  }
  if (!dense(value.semanticObservations) || value.semanticObservations.length !== 0) {
    return reject('SEMANTIC_OBSERVATIONS_NOT_EMPTY', '/candidatePackage/semanticObservations');
  }
  if (recursivelyContainsPresentationKey(value)) {
    return reject('PRESENTATION_KEY_LEAKED', '/candidatePackage');
  }
  if (!exactKeys(value, MEANING_INFORMATION_PACKAGE_KEYS_V001)) {
    return reject('MEANING_PACKAGE_BYTE_INVALID', '/candidatePackage');
  }
  return {status: 'passed', violations: []};
};

const validatePresentationMeaningCaptionEnvelopeV001 = value => {
  const reject = (code, pointer) => ({
    status: 'rejected',
    violations: [makePresentationMeaningInformationViolationV001(code, pointer)],
  });
  for (const [index, caption] of value.captions.entries()) {
    if (!exactKeys(caption, [
      'captionId', 'ordinal', 'timelineSegmentId', 'text', 'atomRefs', 'startAnchor',
      'endAnchor', 'sourceStartMs', 'sourceEndMs',
    ])
      || caption.captionId !== `caption-${String(index + 1).padStart(6, '0')}`
      || caption.ordinal !== index + 1
      || !FORMAL_ID.test(caption.timelineSegmentId)
      || !dense(caption.atomRefs) || caption.atomRefs.length < 1
      || !caption.atomRefs.every(validatePresentationMeaningAtomRefV001)) {
      return reject('CAPTION_COUNT_INVALID', '/candidatePackage/captions');
    }
    if (typeof caption.text !== 'string' || caption.text.length === 0
      || /[\r\n]/u.test(caption.text)
      || !exactKeys(caption.startAnchor, ['atomRef', 'edge'])
      || !validatePresentationMeaningAtomRefV001(caption.startAnchor.atomRef)
      || !['start', 'end'].includes(caption.startAnchor.edge)
      || !exactKeys(caption.endAnchor, ['atomRef', 'edge'])
      || !validatePresentationMeaningAtomRefV001(caption.endAnchor.atomRef)
      || !['start', 'end'].includes(caption.endAnchor.edge)
      || !nonnegative(caption.sourceStartMs) || !positive(caption.sourceEndMs)
      || caption.sourceStartMs >= caption.sourceEndMs) {
      return reject('MEANING_PACKAGE_BYTE_INVALID', '/candidatePackage');
    }
  }
  return {status: 'passed', violations: []};
};

const validatePresentationMeaningCaptionAnchorRelationsV001 = value => {
  if (value.captions.some(caption =>
    !same(caption.startAnchor, {atomRef: caption.atomRefs[0], edge: 'start'})
    || !same(caption.endAnchor, {atomRef: caption.atomRefs.at(-1), edge: 'end'}))) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'CAPTION_ANCHOR_MISMATCH',
        '/candidatePackage/captions',
      )],
    };
  }
  return {status: 'passed', violations: []};
};

const validatePresentationMeaningCaptionRelationsV001 = value => {
  if (value.captions.some(caption =>
    caption.atomRefs.some(ref => ref.timelineSegmentId !== caption.timelineSegmentId))) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'CAPTION_SEGMENT_SPAN_INVALID',
        '/candidatePackage/captions',
      )],
    };
  }
  return {status: 'passed', violations: []};
};

/**
 * 工程入場が所有する、文脈非依存の正式schema検査。
 * AtomRef全量閉包はexpected occurrenceを復元できる工程本体だけが検査する。
 */
export function validatePresentationMeaningInformationPackageAdmissionEnvelopeV001(value) {
  const root = validatePresentationMeaningInformationPackageRootEnvelopeV001(value);
  if (root.status !== 'passed') return root;
  const metadata = validatePresentationMeaningInformationMetadataEnvelopeV001(value);
  if (metadata.status !== 'passed') return metadata;
  const captions = validatePresentationMeaningCaptionEnvelopeV001(value);
  if (captions.status !== 'passed') return captions;
  const relations = validatePresentationMeaningCaptionRelationsV001(value);
  if (relations.status !== 'passed') return relations;
  return validatePresentationMeaningCaptionAnchorRelationsV001(value);
}

export function validatePresentationMeaningInformationPackageV001(value, context = {}) {
  const reject = (code, pointer) => ({
    status: 'rejected',
    violations: [makePresentationMeaningInformationViolationV001(code, pointer)],
  });
  const root = validatePresentationMeaningInformationPackageRootEnvelopeV001(value);
  if (root.status !== 'passed') return root;
  if (context.timelineDecision
    && (!same(value.sourceMedia, context.timelineDecision.sourceMedia)
      || !same(value.timelineComposition.segments, context.timelineDecision.segments))) {
    return reject('TIMELINE_DECISION_BINDING_MISMATCH', '/timelineDecision');
  }
  if (context.job) {
    if (!validateTitle(value.title) || !same(value.title, context.job.title)) {
      return reject('TITLE_INPUT_MISMATCH', '/candidatePackage/title');
    }
    if (value.packageId !== context.job.packageId
      || !same(value.provenance.timelineCompositionBinding,
        context.job.timelineCompositionDecisionBinding)
      || !same(value.provenance.semanticSelectionValidationBinding,
        context.job.semanticSelectionValidationBinding)) {
      return reject('MEANING_JOB_BINDING_MISMATCH', '/job');
    }
  }
  if (context.jobBinding
    && !same(value.provenance.formalJobBinding, context.jobBinding)) {
    return reject('MEANING_JOB_BINDING_MISMATCH', '/job');
  }
  const metadata = validatePresentationMeaningInformationMetadataEnvelopeV001(value);
  if (metadata.status !== 'passed') return metadata;
  const expected = context.expectedAtomOccurrences;
  if (!dense(expected) || !expected.every(validatePresentationMeaningAtomRefV001)) {
    return reject('EXPECTED_ATOM_OCCURRENCE_INVALID', '/expectedAtomOccurrences');
  }
  if ((expected.length === 0 && value.captions.length !== 0)
    || (expected.length > 0 && (value.captions.length < 1 || value.captions.length > 999999))) {
    return reject('CAPTION_COUNT_INVALID', '/candidatePackage/captions');
  }
  const captionEnvelope = validatePresentationMeaningCaptionEnvelopeV001(value);
  if (captionEnvelope.status !== 'passed') return captionEnvelope;
  const actual = value.captions.flatMap(caption => caption.atomRefs);
  if (!same(multiset(actual), multiset(expected))) {
    return reject('CAPTION_ATOM_COVERAGE_MISMATCH', '/candidatePackage/captions');
  }
  if (!same(actual, expected)) {
    return reject('CAPTION_ATOM_SEQUENCE_MISMATCH', '/candidatePackage/captions');
  }
  const captionRelations = validatePresentationMeaningCaptionRelationsV001(value);
  if (captionRelations.status !== 'passed') return captionRelations;
  const atomRecords = context.occurrenceAtoms;
  for (const caption of value.captions) {
    if (atomRecords instanceof Map) {
      const records = caption.atomRefs.map(ref => atomRecords.get(occurrenceKey(ref)));
      if (records.some(record => !record)) {
        return reject('SOURCE_ATOM_UNRESOLVED', '/retainedSources');
      }
      if (typeof caption.text !== 'string' || caption.text.length === 0
        || /[\r\n]/u.test(caption.text)
        || caption.text !== records.map(record => record.text).join('')) {
        return reject('CAPTION_TEXT_MISMATCH', '/candidatePackage/captions');
      }
      if (!same(caption.startAnchor, {atomRef: caption.atomRefs[0], edge: 'start'})
        || !same(caption.endAnchor, {atomRef: caption.atomRefs.at(-1), edge: 'end'})) {
        return reject('CAPTION_ANCHOR_MISMATCH', '/candidatePackage/captions');
      }
      if (caption.sourceStartMs !== records[0].startMs
        || caption.sourceEndMs !== records.at(-1).endMs) {
        return reject('CAPTION_SOURCE_TIME_MISMATCH', '/candidatePackage/captions');
      }
    } else if (!validateAnchor(caption.startAnchor, 'start')
      || !validateAnchor(caption.endAnchor, 'end')) {
      return reject('MEANING_PACKAGE_BYTE_INVALID', '/candidatePackage');
    }
  }
  return {status: 'passed', violations: []};
}

export function buildPresentationMeaningInformationPackageV001({
  job,
  jobBinding,
  timelineDecision,
  sourcePackage,
  semanticValidation,
  semanticSelection,
  retainedSources,
}) {
  if (!validatePresentationMeaningInformationPackageJobV001(job)) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001('MEANING_JOB_INVALID', '/job')],
    };
  }
  if (!validatePresentationMeaningJsonBindingV001(jobBinding)
    || jobBinding.schemaVersion !== PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'MEANING_JOB_BINDING_MISMATCH',
        '/job',
      )],
    };
  }
  if (!validatePresentationTimelineCompositionDecisionV001(timelineDecision)) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'TIMELINE_DECISION_INVALID',
        '/timelineDecision',
      )],
    };
  }
  if (!validatePresentationMeaningBoundarySourcePackageForMeaningV001(sourcePackage)) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'SEMANTIC_VALIDATION_INVALID',
        '/sourcePackage',
      )],
    };
  }
  if (!validatePresentationMeaningBoundaryValidationReportV001(semanticValidation)) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'SEMANTIC_VALIDATION_INVALID',
        '/semanticValidation',
      )],
    };
  }
  if (!validatePresentationMeaningSelectionWrapperV001(semanticSelection)) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'SEMANTIC_VALIDATION_INVALID',
        '/semanticSelection',
      )],
    };
  }
  if (!validatePresentationMeaningSemanticArtifactLinkV001(
    semanticValidation,
    semanticSelection,
  )) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'SEMANTIC_VALIDATION_BINDING_MISMATCH',
        '/semanticValidation/selectionBinding',
      )],
    };
  }
  const expected = derivePresentationExpectedAtomOccurrencesV001({
    timelineDecision,
    retainedSources,
  });
  if (expected.status !== 'passed') return expected;
  let captions;
  try {
    captions = buildCaptions({
      sourcePackage,
      response: semanticSelection.response,
      occurrenceAtoms: expected.occurrenceAtoms,
    });
  } catch (error) {
    if (isObject(error)
      && PRESENTATION_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V001.includes(error.code)) {
      return {status: 'rejected', violations: [error]};
    }
    throw error;
  }
  const packageValue = {
    schemaVersion: PRESENTATION_MEANING_INFORMATION_PACKAGE_SCHEMA_V001,
    packageId: job.packageId,
    sourceMedia: timelineDecision.sourceMedia,
    timelineComposition: {
      timelineId: `${job.packageId}-timeline`,
      segments: timelineDecision.segments,
    },
    captions,
    title: job.title,
    semanticObservations: [],
    provenance: {
      formalJobBinding: jobBinding,
      timelineCompositionBinding: job.timelineCompositionDecisionBinding,
      semanticSelectionValidationBinding: job.semanticSelectionValidationBinding,
    },
  };
  const validation = validatePresentationMeaningInformationPackageV001(packageValue, {
    job,
    jobBinding,
    timelineDecision,
    expectedAtomOccurrences: expected.expectedAtomOccurrences,
    occurrenceAtoms: expected.occurrenceAtoms,
  });
  return validation.status === 'passed'
    ? {
      status: 'passed',
      violations: [],
      package: packageValue,
      expectedAtomOccurrences: expected.expectedAtomOccurrences,
      occurrenceAtoms: expected.occurrenceAtoms,
    }
    : validation;
}

export function validatePresentationMeaningInformationPackageFormalBytesV001(bytes, context = {}) {
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (decoded.status !== 'decoded') {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'MEANING_PACKAGE_BYTE_INVALID',
        '/candidatePackage',
      )],
    };
  }
  let expectedBytes;
  try {
    expectedBytes = serializePresentationMeaningInformationFormalJsonV001(decoded.value);
  } catch {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'MEANING_PACKAGE_BYTE_INVALID',
        '/candidatePackage',
      )],
    };
  }
  if (!Buffer.from(bytes).equals(expectedBytes)) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'MEANING_PACKAGE_BYTE_INVALID',
        '/candidatePackage',
      )],
    };
  }
  return validatePresentationMeaningInformationPackageV001(decoded.value, context);
}
