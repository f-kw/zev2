import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v002.mjs';
import {
  PRESENTATION_CUE_END_PROJECTION_SCHEMA_V001,
  validatePresentationCueEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';

export const PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001 =
  'presentation-instruction-artifact-v001';

export const PRESENTATION_INSTRUCTION_CODES_V001 = Object.freeze([
  'INSTRUCTION_INPUT_INVALID',
  'INSTRUCTION_BINDING_MISMATCH',
  'INSTRUCTION_CONTENT_INVALID',
  'INSTRUCTION_TIME_INVALID',
  'INSTRUCTION_TARGET_INVALID',
  'INSTRUCTION_FORBIDDEN_FIELD',
]);

export const PRESENTATION_INSTRUCTION_FORBIDDEN_FIELDS_V001 = Object.freeze([
  'selectionBinding', 'selectionReportBinding', 'lineEndBoundaryIds', 'lines',
  'indexedLines', 'lineId', 'lineOrdinal', 'lineTexts', 'logicalWidth',
  'maxLogicalWidth', 'maxLogicalWidthPerLine', 'maxLines', 'maxLinesPerDisplayPage',
  'characterWidthRule', 'resolvedStyle', 'styleIntent', 'visualStateId', 'stateId',
  'requestedPresetId', 'appliedPresetId', 'fontAssetId', 'fontFamily', 'fontSizePx',
  'fontColor', 'fillColor', 'borderColor', 'borderWidthPx', 'glowColor',
  'glowWidthPx', 'glowBlurPx', 'backgroundColor', 'backgroundOpacity', 'position',
  'x', 'y', 'offsetX', 'offsetY', 'safeArea', 'safeAreaPx', 'canvas', 'format',
  'screenLayoutId', 'cropMode', 'cropViewport', 'cropFilter', 'sceneTransitionMode',
  'audioMode', 'transition', 'fadeFrames', 'easing', 'animation', 'animationCurve',
  'rendererImplementationBinding',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const FORBIDDEN = new Set(PRESENTATION_INSTRUCTION_FORBIDDEN_FIELDS_V001);

const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && value.every((_, index) => Object.hasOwn(value, index));
const nonempty = value => typeof value === 'string' && value.length > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
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

const firstForbidden = (value, pointer = '') => {
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      const found = firstForbidden(child, `${pointer}/${index}`);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN.has(key)) return `${pointer}/${key}`;
    const found = firstForbidden(value[key], `${pointer}/${key}`);
    if (found !== null) return found;
  }
  return null;
};

const cueEndReference = value => exactKeys(value, [
  'projectionId', 'inputCaptionId', 'cueId', 'cueOrdinal', 'cueEndBoundaryId',
]) && FORMAL_ID.test(value.projectionId)
  && FORMAL_ID.test(value.inputCaptionId)
  && FORMAL_ID.test(value.cueId)
  && positive(value.cueOrdinal)
  && FORMAL_ID.test(value.cueEndBoundaryId);

const targetProvenance = value => exactKeys(value, [
  'targetRefId', 'targetType', 'atomOccurrenceIds',
]) && FORMAL_ID.test(value.targetRefId)
  && ['semantic-caption', 'meaning-title'].includes(value.targetType)
  && dense(value.atomOccurrenceIds)
  && value.atomOccurrenceIds.every(id => FORMAL_ID.test(id))
  && new Set(value.atomOccurrenceIds).size === value.atomOccurrenceIds.length;

const mapCueAtoms = (timeline, atoms) => {
  const envelopes = [];
  for (const atom of atoms) {
    if (!dense(atom?.retainedSpans) || atom.retainedSpans.length < 1) return null;
    for (const span of atom.retainedSpans) {
      const current = envelopes.at(-1);
      if (current?.timelineSegmentId === span.timelineSegmentId) {
        current.sourceEndMs = span.sourceEndMs;
      } else {
        envelopes.push({
          timelineSegmentId: span.timelineSegmentId,
          sourceStartMs: span.sourceStartMs,
          sourceEndMs: span.sourceEndMs,
        });
      }
    }
  }
  const mappings = envelopes.map(span => mapPresentationSourceIntervalV002(
    timeline,
    span.sourceStartMs,
    span.sourceEndMs,
  ));
  return mappings.length > 0 && mappings.every(result => result.status === 'passed')
    ? mappings
    : null;
};

const validateBasic = value => {
  const forbidden = firstForbidden(value);
  if (forbidden !== null) return rejected('INSTRUCTION_FORBIDDEN_FIELD', forbidden);
  if (!exactKeys(value, [
    'schemaVersion', 'artifactId', 'artifactKind', 'sourceBindings',
    'styleProfileId', 'instructions', 'provenance',
  ]) || value.schemaVersion !== PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001
    || !FORMAL_ID.test(value.artifactId)
    || !['caption', 'title'].includes(value.artifactKind)
    || !exactKeys(value.sourceBindings, [
      'meaningInformationPackage', 'timeline', 'cueEndProjection',
    ])
    || !formalBinding(value.sourceBindings.meaningInformationPackage)
    || !FORMAL_ID.test(value.styleProfileId)
    || !dense(value.instructions)
    || value.instructions.length < 1
    || !exactKeys(value.provenance, ['producerJobBinding', 'sourceCaseId'])
    || !formalBinding(value.provenance.producerJobBinding)
    || !FORMAL_ID.test(value.provenance.sourceCaseId)) {
    return rejected('INSTRUCTION_INPUT_INVALID', '/');
  }
  const caption = value.artifactKind === 'caption';
  if (caption !== formalBinding(value.sourceBindings.timeline)
    || caption !== formalBinding(value.sourceBindings.cueEndProjection)
    || (caption && value.sourceBindings.cueEndProjection.schemaVersion
      !== PRESENTATION_CUE_END_PROJECTION_SCHEMA_V001)
    || (!caption && (value.sourceBindings.timeline !== null
      || value.sourceBindings.cueEndProjection !== null))) {
    return rejected('INSTRUCTION_BINDING_MISMATCH', '/sourceBindings');
  }
  const seen = new Set();
  let previous = null;
  for (const [index, instruction] of value.instructions.entries()) {
    if (!exactKeys(instruction, [
      'instructionId', 'semanticKind', 'content', 'outputTime', 'cueEndReference',
      'targetProvenance', 'materialRefs',
    ]) || !FORMAL_ID.test(instruction.instructionId)
      || seen.has(instruction.instructionId)
      || !['speech-caption', 'title'].includes(instruction.semanticKind)
      || !exactKeys(instruction.content, ['text'])
      || !nonempty(instruction.content.text)
      || !exactKeys(instruction.outputTime, ['startFrame', 'endFrameExclusive'])
      || !nonnegative(instruction.outputTime.startFrame)
      || !positive(instruction.outputTime.endFrameExclusive)
      || instruction.outputTime.startFrame >= instruction.outputTime.endFrameExclusive
      || !targetProvenance(instruction.targetProvenance)
      || !dense(instruction.materialRefs)
      || !instruction.materialRefs.every(id => FORMAL_ID.test(id))
      || new Set(instruction.materialRefs).size !== instruction.materialRefs.length
      || !same([...instruction.materialRefs].sort(), instruction.materialRefs)) {
      return rejected('INSTRUCTION_INPUT_INVALID', `/instructions/${index}`);
    }
    seen.add(instruction.instructionId);
    const sortTuple = [
      instruction.outputTime.startFrame,
      instruction.outputTime.endFrameExclusive,
      instruction.instructionId,
    ];
    if (previous !== null && (
      sortTuple[0] < previous[0]
      || sortTuple[0] === previous[0] && sortTuple[1] < previous[1]
      || sortTuple[0] === previous[0] && sortTuple[1] === previous[1]
        && sortTuple[2] <= previous[2]
    )) return rejected('INSTRUCTION_TIME_INVALID', `/instructions/${index}/outputTime`);
    previous = sortTuple;
    if (caption) {
      if (instruction.semanticKind !== 'speech-caption'
        || !cueEndReference(instruction.cueEndReference)
        || instruction.targetProvenance.targetType !== 'semantic-caption'
        || instruction.targetProvenance.atomOccurrenceIds.length < 1) {
        return rejected('INSTRUCTION_TARGET_INVALID', `/instructions/${index}`);
      }
    } else if (instruction.semanticKind !== 'title'
      || instruction.cueEndReference !== null
      || instruction.targetProvenance.targetType !== 'meaning-title'
      || instruction.targetProvenance.atomOccurrenceIds.length !== 0) {
      return rejected('INSTRUCTION_TARGET_INVALID', `/instructions/${index}`);
    }
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
};

const validateCaptionAgainstSources = ({artifact, meaningPackage, timeline, cueEndProjection}) => {
  if (validatePresentationCueEndProjectionV001(cueEndProjection).status !== 'passed'
    || cueEndProjection.projectionId
      !== artifact.instructions[0]?.cueEndReference?.projectionId) {
    return rejected('INSTRUCTION_BINDING_MISMATCH', '/sourceBindings/cueEndProjection');
  }
  const projectedCaption = cueEndProjection.captions.find(
    row => row.caseId === artifact.provenance.sourceCaseId,
  );
  const semanticCaption = meaningPackage?.captions?.find(
    row => row.captionId === projectedCaption?.semanticCaptionId,
  );
  if (!projectedCaption || !semanticCaption
    || projectedCaption.cues.length !== artifact.instructions.length
    || !dense(meaningPackage?.atomOccurrences)) {
    return rejected('INSTRUCTION_BINDING_MISMATCH', '/instructions');
  }
  const atomById = new Map(meaningPackage.atomOccurrences.map(atom => [atom.atomOccurrenceId, atom]));
  const captionAtoms = semanticCaption.atomOccurrenceIds.map(id => atomById.get(id));
  if (captionAtoms.some(atom => !atom)) {
    return rejected('INSTRUCTION_TARGET_INVALID', '/instructions');
  }
  let start = 0;
  for (const [index, instruction] of artifact.instructions.entries()) {
    const projectedCue = projectedCaption.cues[index];
    const boundaryOrdinal = Number.parseInt(
      projectedCue.cueEndBoundaryId.match(/([0-9]+)$/u)?.[1] ?? '',
      10,
    );
    if (!positive(boundaryOrdinal) || boundaryOrdinal <= start
      || boundaryOrdinal > captionAtoms.length
      || !same(instruction.cueEndReference, {
        projectionId: cueEndProjection.projectionId,
        inputCaptionId: projectedCaption.inputCaptionId,
        cueId: projectedCue.cueId,
        cueOrdinal: projectedCue.cueOrdinal,
        cueEndBoundaryId: projectedCue.cueEndBoundaryId,
      })) {
      return rejected('INSTRUCTION_TARGET_INVALID', `/instructions/${index}/cueEndReference`);
    }
    const atoms = captionAtoms.slice(start, boundaryOrdinal);
    if (instruction.content.text !== atoms.map(atom => atom.text).join('')
      || !same(instruction.targetProvenance, {
        targetRefId: semanticCaption.captionId,
        targetType: 'semantic-caption',
        atomOccurrenceIds: atoms.map(atom => atom.atomOccurrenceId),
      })) {
      return rejected('INSTRUCTION_CONTENT_INVALID', `/instructions/${index}`);
    }
    const mappings = mapCueAtoms(timeline, atoms);
    if (mappings === null) {
      return rejected('INSTRUCTION_TIME_INVALID', `/instructions/${index}/outputTime`);
    }
    const expectedTime = {
      startFrame: mappings[0].mapping.startFrame,
      endFrameExclusive: mappings.at(-1).mapping.endFrameExclusive,
    };
    if (!same(instruction.outputTime, expectedTime)) {
      return rejected('INSTRUCTION_TIME_INVALID', `/instructions/${index}/outputTime`);
    }
    start = boundaryOrdinal;
  }
  if (start !== captionAtoms.length) return rejected('INSTRUCTION_CONTENT_INVALID', '/instructions');
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
};

export function validatePresentationInstructionArtifactV001(
  value,
  {meaningPackage = null, timeline = null, cueEndProjection = null} = {},
) {
  const basic = validateBasic(value);
  if (basic.status !== 'passed') return basic;
  if (meaningPackage === null) return basic;
  if (meaningPackage.schemaVersion !== value.sourceBindings.meaningInformationPackage.schemaVersion) {
    return rejected('INSTRUCTION_BINDING_MISMATCH', '/sourceBindings/meaningInformationPackage');
  }
  if (value.artifactKind === 'title') {
    const title = meaningPackage?.title?.text;
    const instruction = value.instructions[0];
    if (value.instructions.length !== 1
      || !nonempty(title)
      || instruction.content.text !== title
      || instruction.targetProvenance.targetRefId !== `${value.provenance.sourceCaseId}-title`) {
      return rejected('INSTRUCTION_CONTENT_INVALID', '/instructions/0');
    }
    return basic;
  }
  if (timeline === null || cueEndProjection === null) {
    return rejected('INSTRUCTION_BINDING_MISMATCH', '/sourceBindings');
  }
  return validateCaptionAgainstSources({
    artifact: value,
    meaningPackage,
    timeline,
    cueEndProjection,
  });
}

export function buildPresentationCaptionInstructionArtifactV001({
  artifactId,
  sourceCaseId,
  meaningInformationPackageBinding,
  timelineBinding,
  cueEndProjectionBinding,
  producerJobBinding,
  styleProfileId,
  meaningPackage,
  timeline,
  cueEndProjection,
}) {
  if (!FORMAL_ID.test(artifactId) || !FORMAL_ID.test(sourceCaseId)
    || !formalBinding(meaningInformationPackageBinding)
    || !formalBinding(timelineBinding)
    || !formalBinding(cueEndProjectionBinding)
    || !formalBinding(producerJobBinding)
    || !FORMAL_ID.test(styleProfileId)
    || !isObject(meaningPackage) || !isObject(timeline) || !isObject(cueEndProjection)) {
    return rejected('INSTRUCTION_INPUT_INVALID', '/');
  }
  const projectedCaption = cueEndProjection.captions?.find(row => row.caseId === sourceCaseId);
  const semanticCaption = meaningPackage.captions?.find(
    row => row.captionId === projectedCaption?.semanticCaptionId,
  );
  if (!projectedCaption || !semanticCaption || !dense(meaningPackage.atomOccurrences)) {
    return rejected('INSTRUCTION_BINDING_MISMATCH', '/sourceBindings');
  }
  const atomById = new Map(meaningPackage.atomOccurrences.map(atom => [atom.atomOccurrenceId, atom]));
  const captionAtoms = semanticCaption.atomOccurrenceIds.map(id => atomById.get(id));
  if (captionAtoms.some(atom => !atom)) return rejected('INSTRUCTION_TARGET_INVALID', '/instructions');
  let start = 0;
  const instructions = [];
  for (const cue of projectedCaption.cues) {
    const boundaryOrdinal = Number.parseInt(cue.cueEndBoundaryId.match(/([0-9]+)$/u)?.[1] ?? '', 10);
    const atoms = captionAtoms.slice(start, boundaryOrdinal);
    const mappings = mapCueAtoms(timeline, atoms);
    if (!positive(boundaryOrdinal) || boundaryOrdinal <= start
      || atoms.length < 1 || mappings === null) {
      return rejected('INSTRUCTION_TIME_INVALID', `/instructions/${instructions.length}`);
    }
    instructions.push(Object.freeze({
      instructionId: `${artifactId}-instruction-${String(instructions.length + 1).padStart(6, '0')}`,
      semanticKind: 'speech-caption',
      content: Object.freeze({text: atoms.map(atom => atom.text).join('')}),
      outputTime: Object.freeze({
        startFrame: mappings[0].mapping.startFrame,
        endFrameExclusive: mappings.at(-1).mapping.endFrameExclusive,
      }),
      cueEndReference: Object.freeze({
        projectionId: cueEndProjection.projectionId,
        inputCaptionId: projectedCaption.inputCaptionId,
        cueId: cue.cueId,
        cueOrdinal: cue.cueOrdinal,
        cueEndBoundaryId: cue.cueEndBoundaryId,
      }),
      targetProvenance: Object.freeze({
        targetRefId: semanticCaption.captionId,
        targetType: 'semantic-caption',
        atomOccurrenceIds: Object.freeze(atoms.map(atom => atom.atomOccurrenceId)),
      }),
      materialRefs: Object.freeze([]),
    }));
    start = boundaryOrdinal;
  }
  const artifact = Object.freeze({
    schemaVersion: PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001,
    artifactId,
    artifactKind: 'caption',
    sourceBindings: Object.freeze({
      meaningInformationPackage: clone(meaningInformationPackageBinding),
      timeline: clone(timelineBinding),
      cueEndProjection: clone(cueEndProjectionBinding),
    }),
    styleProfileId,
    instructions: Object.freeze(instructions),
    provenance: Object.freeze({producerJobBinding: clone(producerJobBinding), sourceCaseId}),
  });
  const validation = validatePresentationInstructionArtifactV001(
    artifact,
    {meaningPackage, timeline, cueEndProjection},
  );
  return validation.status === 'passed'
    ? Object.freeze({status: 'built', artifact})
    : validation;
}

export function buildPresentationTitleInstructionArtifactV001({
  artifactId,
  sourceCaseId,
  meaningInformationPackageBinding,
  producerJobBinding,
  styleProfileId,
  displayFrameRange,
  meaningPackage,
}) {
  if (!FORMAL_ID.test(artifactId) || !FORMAL_ID.test(sourceCaseId)
    || !formalBinding(meaningInformationPackageBinding)
    || !formalBinding(producerJobBinding)
    || !FORMAL_ID.test(styleProfileId)
    || !exactKeys(displayFrameRange, ['startFrame', 'endFrameExclusive'])
    || !nonnegative(displayFrameRange.startFrame)
    || !positive(displayFrameRange.endFrameExclusive)
    || displayFrameRange.startFrame >= displayFrameRange.endFrameExclusive
    || !nonempty(meaningPackage?.title?.text)) {
    return rejected('INSTRUCTION_INPUT_INVALID', '/');
  }
  const artifact = Object.freeze({
    schemaVersion: PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001,
    artifactId,
    artifactKind: 'title',
    sourceBindings: Object.freeze({
      meaningInformationPackage: clone(meaningInformationPackageBinding),
      timeline: null,
      cueEndProjection: null,
    }),
    styleProfileId,
    instructions: Object.freeze([Object.freeze({
      instructionId: `${artifactId}-instruction-000001`,
      semanticKind: 'title',
      content: Object.freeze({text: meaningPackage.title.text}),
      outputTime: Object.freeze(clone(displayFrameRange)),
      cueEndReference: null,
      targetProvenance: Object.freeze({
        targetRefId: `${sourceCaseId}-title`,
        targetType: 'meaning-title',
        atomOccurrenceIds: Object.freeze([]),
      }),
      materialRefs: Object.freeze([]),
    })]),
    provenance: Object.freeze({producerJobBinding: clone(producerJobBinding), sourceCaseId}),
  });
  const validation = validatePresentationInstructionArtifactV001(artifact, {meaningPackage});
  return validation.status === 'passed'
    ? Object.freeze({status: 'built', artifact})
    : validation;
}

export const serializePresentationInstructionArtifactV001 = value => {
  const validation = validatePresentationInstructionArtifactV001(value);
  if (validation.status !== 'passed') throw new TypeError('presentation instruction artifact is invalid');
  return formalBytes(value);
};

export function decodePresentationInstructionArtifactV001(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    if (!formalBytes(value).equals(bytes)
      || validatePresentationInstructionArtifactV001(value).status !== 'passed') {
      return Object.freeze({status: 'rejected', reason: 'schema-invalid'});
    }
    return Object.freeze({status: 'decoded', value});
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
}

export const buildPresentationInstructionArtifactBindingV001 = ({path, artifact}) => {
  const bytes = serializePresentationInstructionArtifactV001(artifact);
  return Object.freeze({
    schemaVersion: PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001,
    path,
    fileSha256: hash(bytes),
    canonicalSha256: hash(canonicalBytes(artifact)),
  });
};
