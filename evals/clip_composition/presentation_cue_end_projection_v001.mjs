import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

export const PRESENTATION_CUE_END_PROJECTION_SCHEMA_V001 =
  'presentation-cue-end-projection-v001';
export const PRESENTATION_SEMANTIC_LINE_END_PROJECTION_SCHEMA_V001 =
  'presentation-semantic-line-end-projection-v001';

export const PRESENTATION_CUE_END_PROJECTION_CODES_V001 = Object.freeze([
  'CUE_END_PROJECTION_INVALID',
  'CUE_END_PROJECTION_BINDING_MISMATCH',
  'LINE_END_PROJECTION_INVALID',
  'LINE_END_PROJECTION_BINDING_MISMATCH',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && value.every((_, index) => Object.hasOwn(value, index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);
const formalBytes = value => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return result.bytes;
};
const canonicalBytes = value => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') throw new TypeError('canonical JSON serialization failed');
  return result.bytes;
};
const hash = bytes => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result.status !== 'hashed') throw new TypeError('SHA-256 calculation failed');
  return result.sha256;
};

const formalBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && FORMAL_ID.test(value.schemaVersion)
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && SHA256.test(value.canonicalSha256);

const digestProvenance = value => exactKeys(value, [
  'schemaVersion', 'artifactId', 'fileSha256', 'canonicalSha256',
]) && FORMAL_ID.test(value.schemaVersion)
  && FORMAL_ID.test(value.artifactId)
  && SHA256.test(value.fileSha256)
  && SHA256.test(value.canonicalSha256);

const violation = (code, pointer, relatedIds = []) => Object.freeze({
  code,
  path: pointer,
  relatedIds: Object.freeze([...new Set(relatedIds)].sort()),
});

const rejected = (code, pointer, relatedIds = []) => Object.freeze({
  status: 'rejected',
  primaryCode: code,
  violations: Object.freeze([violation(code, pointer, relatedIds)]),
});

const sourceCaptions = sourcePackage => sourcePackage?.reconstructionMap?.captions;
const sourceContexts = sourcePackage => sourcePackage?.reconstructionMap?.caseContexts;
const selectedCaptions = selection => selection?.response?.captions;

const validateAgainstSources = (projection, sourcePackage, selection = null) => {
  const captions = sourceCaptions(sourcePackage);
  const contexts = sourceContexts(sourcePackage);
  if (!dense(captions) || !dense(contexts)
    || captions.length !== contexts.length
    || projection.captions.length !== contexts.length) {
    return rejected('CUE_END_PROJECTION_BINDING_MISMATCH', '/captions');
  }
  const selected = selection === null ? null : selectedCaptions(selection);
  if (selection !== null && (!dense(selected) || selected.length !== captions.length)) {
    return rejected('CUE_END_PROJECTION_BINDING_MISMATCH', '/sourceSelectionDigest');
  }

  for (const [captionIndex, projected] of projection.captions.entries()) {
    const sourceCaption = captions[captionIndex];
    const context = contexts[captionIndex];
    const selectedCaption = selected?.[captionIndex] ?? null;
    if (projected.caseId !== context?.caseId
      || projected.inputCaptionId !== context?.inputCaptionId
      || projected.inputCaptionId !== sourceCaption?.captionId
      || projected.semanticCaptionId !== sourceCaption?.semanticCaptionId
      || projected.ordinal !== captionIndex + 1
      || !dense(sourceCaption?.atomOccurrenceIds)
      || !dense(sourceCaption?.boundaries)
      || sourceCaption.atomOccurrenceIds.length !== sourceCaption.boundaries.length
      || (selectedCaption !== null && selectedCaption.captionId !== projected.inputCaptionId)) {
      return rejected(
        'CUE_END_PROJECTION_BINDING_MISMATCH',
        `/captions/${captionIndex}`,
        [projected.inputCaptionId],
      );
    }
    const selectedCues = selectedCaption?.cues ?? null;
    if (selectedCues !== null && (!dense(selectedCues)
      || selectedCues.length !== projected.cues.length)) {
      return rejected('CUE_END_PROJECTION_BINDING_MISMATCH', `/captions/${captionIndex}/cues`);
    }
    let previousOrdinal = 0;
    const coveredAtomIds = [];
    for (const [cueIndex, cue] of projected.cues.entries()) {
      const boundaryIndex = sourceCaption.boundaries.findIndex(
        boundary => boundary.boundaryId === cue.cueEndBoundaryId,
      );
      if (boundaryIndex < 0
        || boundaryIndex + 1 <= previousOrdinal
        || cue.cueOrdinal !== cueIndex + 1
        || cue.cueId !== `${projected.inputCaptionId}-cue-${String(cueIndex + 1).padStart(6, '0')}`
        || (selectedCues !== null
          && selectedCues[cueIndex].cueEndBoundaryId !== cue.cueEndBoundaryId)) {
        return rejected(
          'CUE_END_PROJECTION_INVALID',
          `/captions/${captionIndex}/cues/${cueIndex}`,
          [cue.cueEndBoundaryId],
        );
      }
      coveredAtomIds.push(...sourceCaption.atomOccurrenceIds.slice(previousOrdinal, boundaryIndex + 1));
      previousOrdinal = boundaryIndex + 1;
    }
    const finalBoundary = sourceCaption.boundaries.at(-1)?.boundaryId;
    if (projected.cues.length < 1
      || projected.cues.at(-1).cueEndBoundaryId !== finalBoundary
      || !same(coveredAtomIds, sourceCaption.atomOccurrenceIds)) {
      return rejected(
        'CUE_END_PROJECTION_INVALID',
        `/captions/${captionIndex}/cues`,
        [projected.inputCaptionId],
      );
    }
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
};

export function validatePresentationCueEndProjectionV001(
  value,
  {sourcePackage = null, selection = null} = {},
) {
  if (!exactKeys(value, [
    'schemaVersion', 'projectionId', 'sourcePackageBinding',
    'sourceSelectionDigest', 'captions', 'provenance',
  ]) || value.schemaVersion !== PRESENTATION_CUE_END_PROJECTION_SCHEMA_V001
    || !FORMAL_ID.test(value.projectionId)
    || !formalBinding(value.sourcePackageBinding)
    || value.sourcePackageBinding.schemaVersion
      !== 'presentation-output-caption-cue-source-package-v001'
    || !digestProvenance(value.sourceSelectionDigest)
    || value.sourceSelectionDigest.schemaVersion
      !== 'presentation-output-caption-cue-selection-v001'
    || Object.hasOwn(value.sourceSelectionDigest, 'path')
    || !dense(value.captions)
    || value.captions.length < 1
    || !exactKeys(value.provenance, ['producerJobBinding'])
    || !formalBinding(value.provenance.producerJobBinding)) {
    return rejected('CUE_END_PROJECTION_INVALID', '/');
  }
  for (const [captionIndex, caption] of value.captions.entries()) {
    if (!exactKeys(caption, [
      'caseId', 'inputCaptionId', 'semanticCaptionId', 'ordinal', 'cues',
    ]) || !FORMAL_ID.test(caption.caseId)
      || !FORMAL_ID.test(caption.inputCaptionId)
      || !FORMAL_ID.test(caption.semanticCaptionId)
      || caption.ordinal !== captionIndex + 1
      || !dense(caption.cues)
      || caption.cues.length < 1) {
      return rejected('CUE_END_PROJECTION_INVALID', `/captions/${captionIndex}`);
    }
    for (const [cueIndex, cue] of caption.cues.entries()) {
      if (!exactKeys(cue, ['cueId', 'cueOrdinal', 'cueEndBoundaryId'])
        || !FORMAL_ID.test(cue.cueId)
        || cue.cueOrdinal !== cueIndex + 1
        || !FORMAL_ID.test(cue.cueEndBoundaryId)) {
        return rejected('CUE_END_PROJECTION_INVALID', `/captions/${captionIndex}/cues/${cueIndex}`);
      }
    }
  }
  if (sourcePackage !== null) {
    if (!isObject(sourcePackage)
      || sourcePackage.schemaVersion !== value.sourcePackageBinding.schemaVersion) {
      return rejected('CUE_END_PROJECTION_BINDING_MISMATCH', '/sourcePackageBinding');
    }
    if (selection !== null
      && (!isObject(selection)
        || selection.schemaVersion !== value.sourceSelectionDigest.schemaVersion
        || selection.selectionId !== value.sourceSelectionDigest.artifactId
        || !same(selection.sourcePackageBinding, value.sourcePackageBinding))) {
      return rejected('CUE_END_PROJECTION_BINDING_MISMATCH', '/sourceSelectionDigest');
    }
    return validateAgainstSources(value, sourcePackage, selection);
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

export function buildPresentationCueEndProjectionV001({
  projectionId,
  sourcePackageBinding,
  sourceSelectionDigest,
  producerJobBinding,
  sourcePackage,
  selection,
}) {
  if (!FORMAL_ID.test(projectionId)
    || !formalBinding(sourcePackageBinding)
    || !digestProvenance(sourceSelectionDigest)
    || !formalBinding(producerJobBinding)
    || !isObject(sourcePackage)
    || !isObject(selection)
    || !same(sourcePackageBinding, selection.sourcePackageBinding)
    || sourceSelectionDigest.artifactId !== selection.selectionId) {
    return rejected('CUE_END_PROJECTION_BINDING_MISMATCH', '/');
  }
  const captions = sourceCaptions(sourcePackage);
  const contexts = sourceContexts(sourcePackage);
  const selected = selectedCaptions(selection);
  if (!dense(captions) || !dense(contexts) || !dense(selected)
    || captions.length !== contexts.length || captions.length !== selected.length) {
    return rejected('CUE_END_PROJECTION_INVALID', '/captions');
  }
  const projection = Object.freeze({
    schemaVersion: PRESENTATION_CUE_END_PROJECTION_SCHEMA_V001,
    projectionId,
    sourcePackageBinding: clone(sourcePackageBinding),
    sourceSelectionDigest: clone(sourceSelectionDigest),
    captions: Object.freeze(captions.map((caption, captionIndex) => Object.freeze({
      caseId: contexts[captionIndex].caseId,
      inputCaptionId: caption.captionId,
      semanticCaptionId: caption.semanticCaptionId,
      ordinal: captionIndex + 1,
      cues: Object.freeze(selected[captionIndex].cues.map((cue, cueIndex) => Object.freeze({
        cueId: `${caption.captionId}-cue-${String(cueIndex + 1).padStart(6, '0')}`,
        cueOrdinal: cueIndex + 1,
        cueEndBoundaryId: cue.cueEndBoundaryId,
      }))),
    }))),
    provenance: Object.freeze({producerJobBinding: clone(producerJobBinding)}),
  });
  const validation = validatePresentationCueEndProjectionV001(
    projection,
    {sourcePackage, selection},
  );
  return validation.status === 'passed'
    ? Object.freeze({status: 'built', projection})
    : validation;
}

export const serializePresentationCueEndProjectionV001 = value => {
  const validation = validatePresentationCueEndProjectionV001(value);
  if (validation.status !== 'passed') throw new TypeError('cue end projection is invalid');
  return formalBytes(value);
};

export function decodePresentationCueEndProjectionV001(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    if (!formalBytes(value).equals(bytes)
      || validatePresentationCueEndProjectionV001(value).status !== 'passed') {
      return Object.freeze({status: 'rejected', reason: 'schema-invalid'});
    }
    return Object.freeze({status: 'decoded', value});
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
}

export const buildPresentationCueEndProjectionBindingV001 = ({path, projection}) => {
  const bytes = serializePresentationCueEndProjectionV001(projection);
  return Object.freeze({
    schemaVersion: PRESENTATION_CUE_END_PROJECTION_SCHEMA_V001,
    path,
    fileSha256: hash(bytes),
    canonicalSha256: hash(canonicalBytes(projection)),
  });
};

const validateLineEndsAgainstSources = (
  projection,
  sourcePackage,
  {selection = null, cueEndProjection = null} = {},
) => {
  const captions = sourceCaptions(sourcePackage);
  const contexts = sourceContexts(sourcePackage);
  const selected = selection === null ? null : selectedCaptions(selection);
  const cueEndCaptions = cueEndProjection?.captions ?? null;
  if (!dense(captions) || !dense(contexts)
    || captions.length !== contexts.length
    || projection.captions.length !== contexts.length
    || (selected !== null && (!dense(selected) || selected.length !== captions.length))
    || (cueEndCaptions !== null
      && (!dense(cueEndCaptions) || cueEndCaptions.length !== captions.length))) {
    return rejected('LINE_END_PROJECTION_BINDING_MISMATCH', '/captions');
  }

  for (const [captionIndex, projected] of projection.captions.entries()) {
    const sourceCaption = captions[captionIndex];
    const context = contexts[captionIndex];
    const selectedCaption = selected?.[captionIndex] ?? null;
    const cueEndCaption = cueEndCaptions?.[captionIndex] ?? null;
    if (projected.caseId !== context?.caseId
      || projected.inputCaptionId !== context?.inputCaptionId
      || projected.inputCaptionId !== sourceCaption?.captionId
      || projected.semanticCaptionId !== sourceCaption?.semanticCaptionId
      || projected.ordinal !== captionIndex + 1
      || !dense(sourceCaption?.atomOccurrenceIds)
      || !dense(sourceCaption?.boundaries)
      || sourceCaption.atomOccurrenceIds.length !== sourceCaption.boundaries.length
      || (selectedCaption !== null && selectedCaption.captionId !== projected.inputCaptionId)
      || (cueEndCaption !== null && (
        cueEndCaption.caseId !== projected.caseId
        || cueEndCaption.inputCaptionId !== projected.inputCaptionId
        || cueEndCaption.semanticCaptionId !== projected.semanticCaptionId
      ))) {
      return rejected(
        'LINE_END_PROJECTION_BINDING_MISMATCH',
        `/captions/${captionIndex}`,
        [projected.inputCaptionId],
      );
    }
    const selectedCues = selectedCaption?.cues ?? null;
    const cueEndCues = cueEndCaption?.cues ?? null;
    if ((selectedCues !== null
      && (!dense(selectedCues) || selectedCues.length !== projected.cues.length))
      || (cueEndCues !== null
        && (!dense(cueEndCues) || cueEndCues.length !== projected.cues.length))) {
      return rejected(
        'LINE_END_PROJECTION_BINDING_MISMATCH',
        `/captions/${captionIndex}/cues`,
      );
    }
    let previousCueEndOrdinal = 0;
    for (const [cueIndex, cue] of projected.cues.entries()) {
      const boundaryMatches = sourceCaption.boundaries.filter(
        boundary => boundary.boundaryId === cue.cueEndBoundaryId,
      );
      const cueEndOrdinal = boundaryMatches[0]?.ordinal ?? 0;
      if (boundaryMatches.length !== 1
        || cueEndOrdinal <= previousCueEndOrdinal
        || cue.cueOrdinal !== cueIndex + 1
        || cue.cueId !== `${projected.inputCaptionId}-cue-${String(cueIndex + 1).padStart(6, '0')}`
        || (selectedCues !== null && (
          selectedCues[cueIndex].cueEndBoundaryId !== cue.cueEndBoundaryId
          || !same(selectedCues[cueIndex].lineEndBoundaryIds, cue.lineEndBoundaryIds)
        ))
        || (cueEndCues !== null && (
          cueEndCues[cueIndex].cueId !== cue.cueId
          || cueEndCues[cueIndex].cueEndBoundaryId !== cue.cueEndBoundaryId
        ))) {
        return rejected(
          'LINE_END_PROJECTION_INVALID',
          `/captions/${captionIndex}/cues/${cueIndex}`,
          [cue.cueEndBoundaryId],
        );
      }
      let previousLineEndOrdinal = previousCueEndOrdinal;
      for (const [lineIndex, boundaryId] of cue.lineEndBoundaryIds.entries()) {
        const lineBoundaryMatches = sourceCaption.boundaries.filter(
          boundary => boundary.boundaryId === boundaryId,
        );
        const lineEndOrdinal = lineBoundaryMatches[0]?.ordinal ?? 0;
        if (lineBoundaryMatches.length !== 1
          || lineEndOrdinal <= previousLineEndOrdinal
          || lineEndOrdinal > cueEndOrdinal
          || (lineIndex === cue.lineEndBoundaryIds.length - 1
            && boundaryId !== cue.cueEndBoundaryId)) {
          return rejected(
            'LINE_END_PROJECTION_INVALID',
            `/captions/${captionIndex}/cues/${cueIndex}/lineEndBoundaryIds/${lineIndex}`,
            [boundaryId],
          );
        }
        previousLineEndOrdinal = lineEndOrdinal;
      }
      previousCueEndOrdinal = cueEndOrdinal;
    }
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
};

export function validatePresentationSemanticLineEndProjectionV001(
  value,
  {sourcePackage = null, selection = null, cueEndProjection = null} = {},
) {
  if (!exactKeys(value, [
    'schemaVersion', 'projectionId', 'sourcePackageBinding',
    'cueEndProjectionBinding', 'sourceSelectionDigest', 'captions', 'provenance',
  ]) || value.schemaVersion !== PRESENTATION_SEMANTIC_LINE_END_PROJECTION_SCHEMA_V001
    || !FORMAL_ID.test(value.projectionId)
    || !formalBinding(value.sourcePackageBinding)
    || value.sourcePackageBinding.schemaVersion
      !== 'presentation-output-caption-cue-source-package-v001'
    || !formalBinding(value.cueEndProjectionBinding)
    || value.cueEndProjectionBinding.schemaVersion
      !== PRESENTATION_CUE_END_PROJECTION_SCHEMA_V001
    || !digestProvenance(value.sourceSelectionDigest)
    || value.sourceSelectionDigest.schemaVersion
      !== 'presentation-output-caption-cue-selection-v001'
    || Object.hasOwn(value.sourceSelectionDigest, 'path')
    || !dense(value.captions)
    || value.captions.length < 1
    || !exactKeys(value.provenance, ['producerJobBinding'])
    || !formalBinding(value.provenance.producerJobBinding)) {
    return rejected('LINE_END_PROJECTION_INVALID', '/');
  }
  for (const [captionIndex, caption] of value.captions.entries()) {
    if (!exactKeys(caption, [
      'caseId', 'inputCaptionId', 'semanticCaptionId', 'ordinal', 'cues',
    ]) || !FORMAL_ID.test(caption.caseId)
      || !FORMAL_ID.test(caption.inputCaptionId)
      || !FORMAL_ID.test(caption.semanticCaptionId)
      || caption.ordinal !== captionIndex + 1
      || !dense(caption.cues)
      || caption.cues.length < 1) {
      return rejected('LINE_END_PROJECTION_INVALID', `/captions/${captionIndex}`);
    }
    for (const [cueIndex, cue] of caption.cues.entries()) {
      if (!exactKeys(cue, [
        'cueId', 'cueOrdinal', 'cueEndBoundaryId', 'lineEndBoundaryIds',
      ]) || !FORMAL_ID.test(cue.cueId)
        || cue.cueOrdinal !== cueIndex + 1
        || !FORMAL_ID.test(cue.cueEndBoundaryId)
        || !dense(cue.lineEndBoundaryIds)
        || cue.lineEndBoundaryIds.length < 1
        || !cue.lineEndBoundaryIds.every(boundaryId => FORMAL_ID.test(boundaryId))) {
        return rejected('LINE_END_PROJECTION_INVALID', `/captions/${captionIndex}/cues/${cueIndex}`);
      }
    }
  }
  if (sourcePackage !== null) {
    if (!isObject(sourcePackage)
      || sourcePackage.schemaVersion !== value.sourcePackageBinding.schemaVersion
      || (selection !== null && (
        !isObject(selection)
        || selection.schemaVersion !== value.sourceSelectionDigest.schemaVersion
        || selection.selectionId !== value.sourceSelectionDigest.artifactId
        || !same(selection.sourcePackageBinding, value.sourcePackageBinding)
      ))
      || (cueEndProjection !== null && (
        validatePresentationCueEndProjectionV001(
          cueEndProjection,
          {sourcePackage, selection},
        ).status !== 'passed'
      ))) {
      return rejected('LINE_END_PROJECTION_BINDING_MISMATCH', '/');
    }
    return validateLineEndsAgainstSources(
      value,
      sourcePackage,
      {selection, cueEndProjection},
    );
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

export function buildPresentationSemanticLineEndProjectionV001({
  projectionId,
  sourcePackageBinding,
  cueEndProjectionBinding,
  sourceSelectionDigest,
  producerJobBinding,
  sourcePackage,
  selection,
  cueEndProjection,
}) {
  if (!FORMAL_ID.test(projectionId)
    || !formalBinding(sourcePackageBinding)
    || !formalBinding(cueEndProjectionBinding)
    || !digestProvenance(sourceSelectionDigest)
    || !formalBinding(producerJobBinding)
    || !isObject(sourcePackage)
    || !isObject(selection)
    || !isObject(cueEndProjection)
    || !same(sourcePackageBinding, selection.sourcePackageBinding)
    || sourceSelectionDigest.artifactId !== selection.selectionId) {
    return rejected('LINE_END_PROJECTION_BINDING_MISMATCH', '/');
  }
  const captions = sourceCaptions(sourcePackage);
  const contexts = sourceContexts(sourcePackage);
  const selected = selectedCaptions(selection);
  if (!dense(captions) || !dense(contexts) || !dense(selected)
    || captions.length !== contexts.length || captions.length !== selected.length) {
    return rejected('LINE_END_PROJECTION_INVALID', '/captions');
  }
  const projection = Object.freeze({
    schemaVersion: PRESENTATION_SEMANTIC_LINE_END_PROJECTION_SCHEMA_V001,
    projectionId,
    sourcePackageBinding: clone(sourcePackageBinding),
    cueEndProjectionBinding: clone(cueEndProjectionBinding),
    sourceSelectionDigest: clone(sourceSelectionDigest),
    captions: Object.freeze(captions.map((caption, captionIndex) => Object.freeze({
      caseId: contexts[captionIndex].caseId,
      inputCaptionId: caption.captionId,
      semanticCaptionId: caption.semanticCaptionId,
      ordinal: captionIndex + 1,
      cues: Object.freeze(selected[captionIndex].cues.map((cue, cueIndex) => Object.freeze({
        cueId: `${caption.captionId}-cue-${String(cueIndex + 1).padStart(6, '0')}`,
        cueOrdinal: cueIndex + 1,
        cueEndBoundaryId: cue.cueEndBoundaryId,
        lineEndBoundaryIds: Object.freeze(clone(cue.lineEndBoundaryIds)),
      }))),
    }))),
    provenance: Object.freeze({producerJobBinding: clone(producerJobBinding)}),
  });
  const validation = validatePresentationSemanticLineEndProjectionV001(
    projection,
    {sourcePackage, selection, cueEndProjection},
  );
  return validation.status === 'passed'
    ? Object.freeze({status: 'built', projection})
    : validation;
}

export const serializePresentationSemanticLineEndProjectionV001 = value => {
  const validation = validatePresentationSemanticLineEndProjectionV001(value);
  if (validation.status !== 'passed') throw new TypeError('semantic line end projection is invalid');
  return formalBytes(value);
};

export function decodePresentationSemanticLineEndProjectionV001(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    if (!formalBytes(value).equals(bytes)
      || validatePresentationSemanticLineEndProjectionV001(value).status !== 'passed') {
      return Object.freeze({status: 'rejected', reason: 'schema-invalid'});
    }
    return Object.freeze({status: 'decoded', value});
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
}

export const buildPresentationSemanticLineEndProjectionBindingV001 = ({path, projection}) => {
  const bytes = serializePresentationSemanticLineEndProjectionV001(projection);
  return Object.freeze({
    schemaVersion: PRESENTATION_SEMANTIC_LINE_END_PROJECTION_SCHEMA_V001,
    path,
    fileSha256: hash(bytes),
    canonicalSha256: hash(canonicalBytes(projection)),
  });
};
