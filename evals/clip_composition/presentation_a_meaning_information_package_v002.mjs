import {
  PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002,
  PRESENTATION_A_SOURCE_SEQUENCE_SCHEMA_V002,
  canonicalSha256PresentationAJsonV002,
  decodePresentationAStrictJsonV002,
  serializePresentationAFormalJsonV002,
  validatePresentationAImplementationBindingV002,
  validatePresentationAJsonBindingV002,
  validatePresentationAParentSemanticInputV002,
  validatePresentationASourceMediaV002,
  validatePresentationASourceSequenceV002,
} from './presentation_a_source_sequence_v002.mjs';

export const PRESENTATION_A_MEANING_INFORMATION_PACKAGE_SCHEMA_V002 =
  'zev-meaning-information-package-v002';
export const PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002 =
  'presentation-a-meaning-information-package-job-v002';

export const PRESENTATION_A_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V002 =
  Object.freeze([
    'A_MEANING_JOB_INVALID',
    'A_MEANING_PARENT_INVALID',
    'A_MEANING_SEQUENCE_INVALID',
    'A_SOURCE_ATOM_INVALID',
    'A_SOURCE_ATOM_ORDER_INVALID',
    'A_SOURCE_ATOM_SPAN_MISMATCH',
    'A_SOURCE_ATOM_FULLY_REMOVED',
    'A_SOURCE_ATOM_TEXT_MISMATCH',
    'A_CAPTION_COVERAGE_MISMATCH',
    'A_CAPTION_TEXT_MISMATCH',
    'A_MEANING_BINDING_MISMATCH',
    'A_MEANING_PACKAGE_BYTE_INVALID',
    'A_MEANING_PUBLICATION_FAILED',
  ]);

export const PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002 = Object.freeze([
  Object.freeze({
    role: 'meaning-package',
    path: 'evals/clip_composition/presentation_a_meaning_information_package_v002.mjs',
  }),
  Object.freeze({
    role: 'meaning-package-runner',
    path: 'evals/clip_composition/run_presentation_a_meaning_information_package_job_v002.mjs',
  }),
  Object.freeze({
    role: 'source-sequence',
    path: 'evals/clip_composition/presentation_a_source_sequence_v002.mjs',
  }),
  Object.freeze({
    role: 'strict-json',
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
  }),
  Object.freeze({
    role: 'fatal-observation',
    path: 'evals/clip_composition/presentation_fatal_observation_v002.mjs',
  }),
]);

export const PRESENTATION_A_MEANING_INFORMATION_OUTPUT_ROOT_V002 =
  'evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages';
export const PRESENTATION_A_MEANING_INFORMATION_FILE_NAME_V002 =
  'zev-meaning-information-package-v002.json';

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export {
  canonicalSha256PresentationAJsonV002,
  serializePresentationAFormalJsonV002,
};

export const makePresentationAMeaningInformationViolationV002 = (code, pointer) => {
  if (!PRESENTATION_A_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V002.includes(code)) {
    throw new TypeError(`unknown A meaning-package violation code: ${code}`);
  }
  return Object.freeze({code, path: pointer, relatedIds: Object.freeze([])});
};

const rejected = (code, pointer) => Object.freeze({
  status: 'rejected',
  violations: Object.freeze([makePresentationAMeaningInformationViolationV002(code, pointer)]),
});

const validateTitle = value => exactKeys(value, ['text', 'inputMode'])
  && typeof value.text === 'string' && !/[\r\n]/u.test(value.text)
  && ((value.text === '' && value.inputMode === 'none')
    || (value.text.length > 0 && value.inputMode === 'human'));

const validateImplementationBindings = value => dense(value)
  && value.length === PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002.length
  && value.every((binding, index) => validatePresentationAImplementationBindingV002(binding)
    && binding.role
      === PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002[index].role
    && binding.path
      === PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002[index].path);

export function validatePresentationAMeaningInformationPackageJobV002(job) {
  return exactKeys(job, [
    'schemaVersion', 'jobId', 'packageId', 'parentSemanticInputBinding',
    'adoptedSourceSequenceBinding', 'title', 'outputDirectory',
    'implementationBindings',
  ]) && job.schemaVersion === PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002
    && FORMAL_ID.test(job.jobId) && FORMAL_ID.test(job.packageId)
    && validatePresentationAJsonBindingV002(job.parentSemanticInputBinding)
    && job.parentSemanticInputBinding.schemaVersion
      === PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002
    && validatePresentationAJsonBindingV002(job.adoptedSourceSequenceBinding)
    && job.adoptedSourceSequenceBinding.schemaVersion
      === PRESENTATION_A_SOURCE_SEQUENCE_SCHEMA_V002
    && validateTitle(job.title)
    && job.outputDirectory
      === `${PRESENTATION_A_MEANING_INFORMATION_OUTPUT_ROOT_V002}/${job.packageId}`
    && validateImplementationBindings(job.implementationBindings);
}

const validateTimelineSegment = (value, index, sourceMediaId) => exactKeys(value, [
  'segmentId', 'storyOrdinal', 'sourceTimeOrdinal', 'sourceMediaId',
  'sourceStartMs', 'sourceEndMs',
]) && value.segmentId === `segment-${String(index + 1).padStart(4, '0')}`
  && value.storyOrdinal === index + 1 && value.sourceTimeOrdinal === index + 1
  && value.sourceMediaId === sourceMediaId
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const validateSpan = (value, segmentById) => exactKeys(value, [
  'timelineSegmentId', 'sourceStartMs', 'sourceEndMs',
]) && segmentById.has(value.timelineSegmentId)
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs
  && value.sourceStartMs >= segmentById.get(value.timelineSegmentId).sourceStartMs
  && value.sourceEndMs <= segmentById.get(value.timelineSegmentId).sourceEndMs;

const validateOccurrence = (value, index, sourceMediaId, segmentById) => exactKeys(value, [
  'atomOccurrenceId', 'ordinal', 'sourceMediaId', 'sourceAtomId', 'text',
  'sourceAtomInterval', 'retainedSpans',
]) && value.atomOccurrenceId === `atom-occurrence-${String(index + 1).padStart(6, '0')}`
  && value.ordinal === index + 1 && value.sourceMediaId === sourceMediaId
  && typeof value.sourceAtomId === 'string' && value.sourceAtomId.length > 0
  && typeof value.text === 'string' && value.text.length > 0 && !/[\r\n]/u.test(value.text)
  && exactKeys(value.sourceAtomInterval, ['sourceStartMs', 'sourceEndMs'])
  && nonnegative(value.sourceAtomInterval.sourceStartMs)
  && positive(value.sourceAtomInterval.sourceEndMs)
  && value.sourceAtomInterval.sourceStartMs < value.sourceAtomInterval.sourceEndMs
  && dense(value.retainedSpans) && value.retainedSpans.length > 0
  && value.retainedSpans.every(span => validateSpan(span, segmentById)
    && span.sourceStartMs >= value.sourceAtomInterval.sourceStartMs
    && span.sourceEndMs <= value.sourceAtomInterval.sourceEndMs);

const validateCaption = (value, index) => exactKeys(value, [
  'captionId', 'ordinal', 'text', 'atomOccurrenceIds',
]) && value.captionId === `caption-${String(index + 1).padStart(6, '0')}`
  && value.ordinal === index + 1
  && typeof value.text === 'string' && value.text.length > 0 && !/[\r\n]/u.test(value.text)
  && dense(value.atomOccurrenceIds) && value.atomOccurrenceIds.length > 0
  && value.atomOccurrenceIds.every(id => typeof id === 'string' && id.length > 0);

const validatePackageEnvelope = value => {
  if (!exactKeys(value, [
    'schemaVersion', 'packageId', 'sourceMedia', 'timelineComposition',
    'atomOccurrences', 'captions', 'title', 'semanticObservations', 'provenance',
  ]) || value.schemaVersion !== PRESENTATION_A_MEANING_INFORMATION_PACKAGE_SCHEMA_V002
    || !FORMAL_ID.test(value.packageId)
    || !dense(value.sourceMedia) || value.sourceMedia.length !== 1
    || !validatePresentationASourceMediaV002(value.sourceMedia[0])
    || !exactKeys(value.timelineComposition, ['timelineId', 'segments'])
    || value.timelineComposition.timelineId !== `${value.packageId}-timeline`
    || !dense(value.timelineComposition.segments)
    || value.timelineComposition.segments.length < 1
    || !dense(value.atomOccurrences) || value.atomOccurrences.length < 1
    || !dense(value.captions) || value.captions.length < 1
    || !validateTitle(value.title)
    || !dense(value.semanticObservations) || value.semanticObservations.length !== 0
    || !exactKeys(value.provenance, [
      'formalJobBinding', 'parentSemanticInputBinding', 'adoptedSourceSequenceBinding',
    ])
    || !validatePresentationAJsonBindingV002(value.provenance.formalJobBinding)
    || value.provenance.formalJobBinding.schemaVersion
      !== PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002
    || !validatePresentationAJsonBindingV002(value.provenance.parentSemanticInputBinding)
    || value.provenance.parentSemanticInputBinding.schemaVersion
      !== PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002
    || !validatePresentationAJsonBindingV002(value.provenance.adoptedSourceSequenceBinding)
    || value.provenance.adoptedSourceSequenceBinding.schemaVersion
      !== PRESENTATION_A_SOURCE_SEQUENCE_SCHEMA_V002) return false;
  const sourceMediaId = value.sourceMedia[0].sourceMediaId;
  if (!value.timelineComposition.segments.every((segment, index) =>
    validateTimelineSegment(segment, index, sourceMediaId))) return false;
  const segmentById = new Map(value.timelineComposition.segments.map(segment => [
    segment.segmentId,
    segment,
  ]));
  return value.atomOccurrences.every((occurrence, index) =>
    validateOccurrence(occurrence, index, sourceMediaId, segmentById))
    && value.captions.every(validateCaption);
};

const positiveIntersections = (atom, segments) => segments.flatMap(segment => {
  const sourceStartMs = Math.max(atom.sourceStartMs, segment.sourceStartMs);
  const sourceEndMs = Math.min(atom.sourceEndMs, segment.sourceEndMs);
  return sourceStartMs < sourceEndMs ? [{
    timelineSegmentId: segment.segmentId,
    sourceStartMs,
    sourceEndMs,
  }] : [];
});

export function inspectPresentationAMeaningInformationPackageV002(value, context = {}) {
  if (!validatePackageEnvelope(value)) {
    return rejected('A_MEANING_PACKAGE_BYTE_INVALID', '/meaningPackage');
  }
  const actualIds = value.atomOccurrences.map(occurrence => occurrence.atomOccurrenceId);
  if (new Set(actualIds).size !== actualIds.length
    || new Set(value.atomOccurrences.map(occurrence => occurrence.sourceAtomId)).size
      !== value.atomOccurrences.length) {
    return rejected('A_SOURCE_ATOM_INVALID', '/atomOccurrences');
  }
  const flattened = value.captions.flatMap(caption => caption.atomOccurrenceIds);
  if (!same(flattened, actualIds)) {
    return rejected('A_CAPTION_COVERAGE_MISMATCH', '/captions');
  }
  const occurrenceById = new Map(value.atomOccurrences.map(occurrence => [
    occurrence.atomOccurrenceId,
    occurrence,
  ]));
  if (value.captions.some(caption => caption.text !== caption.atomOccurrenceIds
    .map(id => occurrenceById.get(id)?.text ?? '').join(''))) {
    return rejected('A_CAPTION_TEXT_MISMATCH', '/captions');
  }
  for (const occurrence of value.atomOccurrences) {
    let prior = null;
    for (const span of occurrence.retainedSpans) {
      if (prior !== null && (span.sourceStartMs < prior.sourceStartMs
        || span.timelineSegmentId === prior.timelineSegmentId)) {
        return rejected('A_SOURCE_ATOM_SPAN_MISMATCH', '/atomOccurrences');
      }
      prior = span;
    }
  }
  if (context.job && (!validatePresentationAMeaningInformationPackageJobV002(context.job)
    || value.packageId !== context.job.packageId
    || !same(value.title, context.job.title)
    || !same(value.provenance.formalJobBinding, context.jobBinding)
    || !same(value.provenance.parentSemanticInputBinding,
      context.job.parentSemanticInputBinding)
    || !same(value.provenance.adoptedSourceSequenceBinding,
      context.job.adoptedSourceSequenceBinding))) {
    return rejected('A_MEANING_BINDING_MISMATCH', '/provenance');
  }
  if (context.parentSemanticInput) {
    const parent = context.parentSemanticInput;
    if (!validatePresentationAParentSemanticInputV002(parent)
      || !same(value.sourceMedia, [parent.sourceMedia])
      || value.atomOccurrences.length !== parent.sourceAtoms.length) {
      return rejected('A_MEANING_PARENT_INVALID', '/parentSemanticInput');
    }
    for (const [index, atom] of parent.sourceAtoms.entries()) {
      const occurrence = value.atomOccurrences[index];
      if (occurrence.sourceAtomId !== atom.sourceAtomId || occurrence.text !== atom.text
        || !same(occurrence.sourceAtomInterval, {
          sourceStartMs: atom.sourceStartMs,
          sourceEndMs: atom.sourceEndMs,
        })) return rejected('A_SOURCE_ATOM_TEXT_MISMATCH', '/atomOccurrences');
    }
    if (value.captions.length !== 1
      || value.captions[0].text !== parent.caption.text) {
      return rejected('A_CAPTION_TEXT_MISMATCH', '/captions');
    }
  }
  if (context.adoptedSourceSequence) {
    const sequence = context.adoptedSourceSequence;
    if (!validatePresentationASourceSequenceV002(sequence)
      || !same(value.timelineComposition.segments, sequence.segments)) {
      return rejected('A_MEANING_SEQUENCE_INVALID', '/timelineComposition');
    }
    if (context.parentSemanticInput) {
      for (const [index, atom] of context.parentSemanticInput.sourceAtoms.entries()) {
        if (!same(value.atomOccurrences[index].retainedSpans,
          positiveIntersections(atom, sequence.segments))) {
          return rejected('A_SOURCE_ATOM_SPAN_MISMATCH', '/atomOccurrences');
        }
      }
    }
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

export function validatePresentationAMeaningInformationPackageV002(value, context = {}) {
  return inspectPresentationAMeaningInformationPackageV002(value, context).status === 'passed';
}

export function buildPresentationAMeaningInformationPackageV002({
  job,
  jobBinding,
  parentSemanticInput,
  adoptedSourceSequence,
}) {
  if (!validatePresentationAMeaningInformationPackageJobV002(job)) {
    return rejected('A_MEANING_JOB_INVALID', '/job');
  }
  if (!validatePresentationAJsonBindingV002(jobBinding)
    || jobBinding.schemaVersion !== PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002) {
    return rejected('A_MEANING_BINDING_MISMATCH', '/job');
  }
  if (!isObject(parentSemanticInput) || !dense(parentSemanticInput.sourceAtoms)) {
    return rejected('A_MEANING_PARENT_INVALID', '/parentSemanticInput');
  }
  if (parentSemanticInput.sourceAtoms.some((atom, index) =>
    !exactKeys(atom, ['sourceAtomId', 'ordinal', 'text', 'sourceStartMs', 'sourceEndMs'])
      || atom.ordinal !== index + 1 || typeof atom.sourceAtomId !== 'string'
      || atom.sourceAtomId.length === 0 || typeof atom.text !== 'string'
      || atom.text.length === 0 || !nonnegative(atom.sourceStartMs)
      || !positive(atom.sourceEndMs) || atom.sourceStartMs >= atom.sourceEndMs)) {
    return rejected('A_SOURCE_ATOM_INVALID', '/parentSemanticInput/sourceAtoms');
  }
  if (parentSemanticInput.sourceAtoms.some((atom, index) => index > 0
    && (atom.sourceStartMs < parentSemanticInput.sourceAtoms[index - 1].sourceStartMs
      || (atom.sourceStartMs === parentSemanticInput.sourceAtoms[index - 1].sourceStartMs
        && atom.sourceEndMs < parentSemanticInput.sourceAtoms[index - 1].sourceEndMs)))) {
    return rejected('A_SOURCE_ATOM_ORDER_INVALID', '/parentSemanticInput/sourceAtoms');
  }
  if (isObject(parentSemanticInput.caption)
    && parentSemanticInput.caption.text
      !== parentSemanticInput.sourceAtoms.map(atom => atom.text).join('')) {
    return rejected('A_SOURCE_ATOM_TEXT_MISMATCH', '/parentSemanticInput/caption');
  }
  if (!validatePresentationAParentSemanticInputV002(parentSemanticInput)) {
    return rejected('A_MEANING_PARENT_INVALID', '/parentSemanticInput');
  }
  if (!validatePresentationASourceSequenceV002(adoptedSourceSequence)) {
    return rejected('A_MEANING_SEQUENCE_INVALID', '/adoptedSourceSequence');
  }
  if (!same(job.parentSemanticInputBinding, adoptedSourceSequence.parentSemanticInputBinding)
    || !same(job.parentSemanticInputBinding, {
      schemaVersion: parentSemanticInput.schemaVersion,
      path: job.parentSemanticInputBinding.path,
      fileSha256: job.parentSemanticInputBinding.fileSha256,
      canonicalSha256: job.parentSemanticInputBinding.canonicalSha256,
    })) return rejected('A_MEANING_BINDING_MISMATCH', '/job');
  const atomOccurrences = [];
  for (const [index, atom] of parentSemanticInput.sourceAtoms.entries()) {
    if (atom.ordinal !== index + 1 || typeof atom.text !== 'string' || atom.text.length === 0) {
      return rejected('A_SOURCE_ATOM_INVALID', '/parentSemanticInput/sourceAtoms');
    }
    if (index > 0 && atom.sourceStartMs < parentSemanticInput.sourceAtoms[index - 1].sourceStartMs) {
      return rejected('A_SOURCE_ATOM_ORDER_INVALID', '/parentSemanticInput/sourceAtoms');
    }
    const retainedSpans = positiveIntersections(atom, adoptedSourceSequence.segments);
    if (retainedSpans.length === 0) {
      return rejected('A_SOURCE_ATOM_FULLY_REMOVED', '/parentSemanticInput/sourceAtoms');
    }
    atomOccurrences.push({
      atomOccurrenceId: `atom-occurrence-${String(index + 1).padStart(6, '0')}`,
      ordinal: index + 1,
      sourceMediaId: parentSemanticInput.sourceMedia.sourceMediaId,
      sourceAtomId: atom.sourceAtomId,
      text: atom.text,
      sourceAtomInterval: {
        sourceStartMs: atom.sourceStartMs,
        sourceEndMs: atom.sourceEndMs,
      },
      retainedSpans,
    });
  }
  if (parentSemanticInput.caption.text
    !== parentSemanticInput.sourceAtoms.map(atom => atom.text).join('')) {
    return rejected('A_SOURCE_ATOM_TEXT_MISMATCH', '/parentSemanticInput/caption');
  }
  const meaningPackage = {
    schemaVersion: PRESENTATION_A_MEANING_INFORMATION_PACKAGE_SCHEMA_V002,
    packageId: job.packageId,
    sourceMedia: [structuredClone(parentSemanticInput.sourceMedia)],
    timelineComposition: {
      timelineId: `${job.packageId}-timeline`,
      segments: structuredClone(adoptedSourceSequence.segments),
    },
    atomOccurrences,
    captions: [{
      captionId: 'caption-000001',
      ordinal: 1,
      text: parentSemanticInput.caption.text,
      atomOccurrenceIds: atomOccurrences.map(occurrence => occurrence.atomOccurrenceId),
    }],
    title: structuredClone(job.title),
    semanticObservations: [],
    provenance: {
      formalJobBinding: structuredClone(jobBinding),
      parentSemanticInputBinding: structuredClone(job.parentSemanticInputBinding),
      adoptedSourceSequenceBinding: structuredClone(job.adoptedSourceSequenceBinding),
    },
  };
  if (!validatePresentationAMeaningInformationPackageV002(meaningPackage, {
    job,
    jobBinding,
    parentSemanticInput,
    adoptedSourceSequence,
  })) return rejected('A_SOURCE_ATOM_SPAN_MISMATCH', '/atomOccurrences');
  return Object.freeze({
    status: 'passed',
    violations: Object.freeze([]),
    package: meaningPackage,
  });
}

export function validatePresentationAMeaningInformationPackageFormalBytesV002(
  bytes,
  context = {},
) {
  const decoded = decodePresentationAStrictJsonV002(bytes);
  if (decoded.status !== 'decoded'
    || decoded.value.schemaVersion !== PRESENTATION_A_MEANING_INFORMATION_PACKAGE_SCHEMA_V002) {
    return rejected('A_MEANING_PACKAGE_BYTE_INVALID', '/meaningPackage');
  }
  let expected;
  try { expected = serializePresentationAFormalJsonV002(decoded.value); } catch {
    return rejected('A_MEANING_PACKAGE_BYTE_INVALID', '/meaningPackage');
  }
  return Buffer.from(bytes).equals(expected)
    && validatePresentationAMeaningInformationPackageV002(decoded.value, context)
    ? Object.freeze({status: 'passed', violations: Object.freeze([]), value: decoded.value})
    : rejected('A_MEANING_PACKAGE_BYTE_INVALID', '/meaningPackage');
}
