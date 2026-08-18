import {
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
  codePointWeightV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001,
  validatePresentationInstructionArtifactV001,
} from './presentation_instruction_artifact_v001.mjs';
import {
  validatePresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';

export const PRESENTATION_RENDERER_LINE_LAYOUT_SCHEMA_V001 =
  'presentation-renderer-line-layout-v001';
export const PRESENTATION_CAPTION_LINE_LAYOUT_RULE_V001 =
  'semantic-line-end-projection-v001';
export const PRESENTATION_TITLE_LINE_LAYOUT_RULE_V001 =
  'greedy-code-point-v001';

export const PRESENTATION_LINE_LAYOUT_CODES_V001 = Object.freeze([
  'LINE_LAYOUT_INPUT_INVALID',
  'LINE_LAYOUT_NO_VALID_PARTITION',
  'LINE_LAYOUT_ORACLE_MISMATCH',
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
const formalBytes = value => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return result.bytes;
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

const logicalWidth = (text, characterWidthRule) => [...text].reduce(
  (total, character) => total + codePointWeightV001(character, characterWidthRule),
  0,
);

const buildCaptionLines = ({
  instruction,
  atoms,
  maxLogicalWidth,
  maxLines,
  characterWidthRule,
  sourceCaption,
  projectedCue,
}) => {
  if (!dense(atoms) || atoms.length < 1
    || !atoms.every(atom => FORMAL_ID.test(atom?.atomOccurrenceId)
      && typeof atom.text === 'string' && atom.text.length > 0)
    || instruction.content.text !== atoms.map(atom => atom.text).join('')
    || !isObject(sourceCaption)
    || !dense(sourceCaption.atomOccurrenceIds)
    || !dense(sourceCaption.boundaries)
    || sourceCaption.atomOccurrenceIds.length !== sourceCaption.boundaries.length
    || !isObject(projectedCue)
    || projectedCue.cueId !== instruction.cueEndReference?.cueId
    || !dense(projectedCue.lineEndBoundaryIds)) {
    return rejected('LINE_LAYOUT_INPUT_INVALID', '/atoms');
  }
  const atomIds = atoms.map(atom => atom.atomOccurrenceId);
  const firstIndex = sourceCaption.atomOccurrenceIds.indexOf(atomIds[0]);
  if (firstIndex < 0
    || !same(sourceCaption.atomOccurrenceIds.slice(firstIndex, firstIndex + atomIds.length), atomIds)) {
    return rejected('LINE_LAYOUT_INPUT_INVALID', '/atoms');
  }
  const selectedOrdinals = [];
  for (const boundaryId of projectedCue.lineEndBoundaryIds) {
    const matches = sourceCaption.boundaries.filter(row => row.boundaryId === boundaryId);
    const ordinal = matches[0]?.ordinal ?? 0;
    if (matches.length !== 1
      || matches[0].afterAtomOccurrenceId !== sourceCaption.atomOccurrenceIds[ordinal - 1]
      || ordinal <= firstIndex
      || ordinal > firstIndex + atomIds.length
      || ordinal <= (selectedOrdinals.at(-1) ?? firstIndex)) {
      return rejected('LINE_LAYOUT_INPUT_INVALID', '/lineEndProjection', [boundaryId]);
    }
    selectedOrdinals.push(ordinal);
  }
  if (selectedOrdinals.length > maxLines
    || selectedOrdinals.at(-1) !== firstIndex + atomIds.length
    || projectedCue.lineEndBoundaryIds.at(-1) !== projectedCue.cueEndBoundaryId) {
    return rejected('LINE_LAYOUT_NO_VALID_PARTITION', '/entries', [instruction.instructionId]);
  }
  const lines = [];
  let previousRelativeEnd = 0;
  for (const [lineIndex, ordinal] of selectedOrdinals.entries()) {
    const relativeEnd = ordinal - firstIndex;
    const units = atoms.slice(previousRelativeEnd, relativeEnd);
    const text = units.map(unit => unit.text).join('');
    const width = logicalWidth(text, characterWidthRule);
    if (units.length < 1 || width > maxLogicalWidth) {
      return rejected('LINE_LAYOUT_NO_VALID_PARTITION', '/entries', [instruction.instructionId]);
    }
    lines.push(Object.freeze({
      lineIndex,
      sourceUnitIds: Object.freeze(units.map(unit => unit.atomOccurrenceId)),
      text,
      logicalWidth: width,
    }));
    previousRelativeEnd = relativeEnd;
  }
  return Object.freeze({status: 'built', lines: Object.freeze(lines)});
};

const buildTitleLines = ({instruction, maxLogicalWidth, maxLines, characterWidthRule}) => {
  const units = [...instruction.content.text].map((character, index) => ({
    sourceUnitId: `${instruction.instructionId}-code-point-${String(index + 1).padStart(6, '0')}`,
    character,
  }));
  const lines = [];
  let offset = 0;
  while (offset < units.length) {
    let end = offset;
    let width = 0;
    while (end < units.length) {
      const next = codePointWeightV001(units[end].character, characterWidthRule);
      if (width + next > maxLogicalWidth) break;
      width += next;
      end += 1;
    }
    if (end === offset || lines.length + 1 > maxLines) {
      return rejected('LINE_LAYOUT_NO_VALID_PARTITION', '/entries', [instruction.instructionId]);
    }
    const selected = units.slice(offset, end);
    lines.push(Object.freeze({
      lineIndex: lines.length,
      sourceUnitIds: Object.freeze(selected.map(unit => unit.sourceUnitId)),
      text: selected.map(unit => unit.character).join(''),
      logicalWidth: width,
    }));
    offset = end;
  }
  return Object.freeze({status: 'built', lines: Object.freeze(lines)});
};

export function validatePresentationRendererLineLayoutV001(
  value,
  {instructionArtifact = null} = {},
) {
  if (!exactKeys(value, [
    'schemaVersion', 'layoutId', 'instructionArtifactBinding', 'entries',
  ]) || value.schemaVersion !== PRESENTATION_RENDERER_LINE_LAYOUT_SCHEMA_V001
    || !FORMAL_ID.test(value.layoutId)
    || !formalBinding(value.instructionArtifactBinding)
    || value.instructionArtifactBinding.schemaVersion
      !== PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001
    || !dense(value.entries)
    || value.entries.length < 1) {
    return rejected('LINE_LAYOUT_INPUT_INVALID', '/');
  }
  for (const [entryIndex, entry] of value.entries.entries()) {
    if (!exactKeys(entry, [
      'instructionId', 'lineLayoutRuleId', 'lines',
    ]) || !FORMAL_ID.test(entry.instructionId)
      || ![
        PRESENTATION_CAPTION_LINE_LAYOUT_RULE_V001,
        PRESENTATION_TITLE_LINE_LAYOUT_RULE_V001,
      ].includes(entry.lineLayoutRuleId)
      || !dense(entry.lines)
      || entry.lines.length < 1) {
      return rejected('LINE_LAYOUT_INPUT_INVALID', `/entries/${entryIndex}`);
    }
    const sourceIds = [];
    let text = '';
    for (const [lineIndex, line] of entry.lines.entries()) {
      if (!exactKeys(line, [
        'lineIndex', 'sourceUnitIds', 'text', 'logicalWidth',
      ]) || line.lineIndex !== lineIndex
        || !dense(line.sourceUnitIds)
        || line.sourceUnitIds.length < 1
        || !line.sourceUnitIds.every(id => FORMAL_ID.test(id))
        || typeof line.text !== 'string' || line.text.length < 1
        || !positive(line.logicalWidth)) {
        return rejected('LINE_LAYOUT_INPUT_INVALID', `/entries/${entryIndex}/lines/${lineIndex}`);
      }
      sourceIds.push(...line.sourceUnitIds);
      text += line.text;
    }
    if (new Set(sourceIds).size !== sourceIds.length) {
      return rejected('LINE_LAYOUT_INPUT_INVALID', `/entries/${entryIndex}/lines`);
    }
    if (instructionArtifact !== null) {
      const instruction = instructionArtifact.instructions?.[entryIndex];
      if (!instruction || instruction.instructionId !== entry.instructionId
        || instruction.content.text !== text) {
        return rejected('LINE_LAYOUT_ORACLE_MISMATCH', `/entries/${entryIndex}`);
      }
      if (instruction.semanticKind === 'speech-caption'
        && !same(sourceIds, instruction.targetProvenance.atomOccurrenceIds)) {
        return rejected('LINE_LAYOUT_ORACLE_MISMATCH', `/entries/${entryIndex}/lines`);
      }
    }
  }
  if (instructionArtifact !== null
    && (validatePresentationInstructionArtifactV001(instructionArtifact).status !== 'passed'
      || instructionArtifact.instructions.length !== value.entries.length)) {
    return rejected('LINE_LAYOUT_ORACLE_MISMATCH', '/entries');
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

export function buildPresentationRendererLineLayoutV001({
  layoutId,
  instructionArtifactBinding,
  instructionArtifact,
  meaningPackage,
  lineEndProjection = null,
  lineEndSourcePackage = null,
  maxLogicalWidth,
  maxLines,
  characterWidthRule = PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
  lineLayoutRules,
}) {
  if (!FORMAL_ID.test(layoutId)
    || !formalBinding(instructionArtifactBinding)
    || validatePresentationInstructionArtifactV001(instructionArtifact).status !== 'passed'
    || !isObject(meaningPackage)
    || !positive(maxLogicalWidth)
    || !positive(maxLines)
    || characterWidthRule !== PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001
    || !exactKeys(lineLayoutRules, ['speech-caption', 'title'])
    || lineLayoutRules['speech-caption'] !== PRESENTATION_CAPTION_LINE_LAYOUT_RULE_V001
    || lineLayoutRules.title !== PRESENTATION_TITLE_LINE_LAYOUT_RULE_V001) {
    return rejected('LINE_LAYOUT_INPUT_INVALID', '/');
  }
  const hasCaption = instructionArtifact.instructions.some(
    instruction => instruction.semanticKind === 'speech-caption',
  );
  if (hasCaption && validatePresentationSemanticLineEndProjectionV001(
    lineEndProjection,
    {sourcePackage: lineEndSourcePackage},
  ).status !== 'passed') {
    return rejected('LINE_LAYOUT_INPUT_INVALID', '/lineEndProjection');
  }
  const atomById = new Map((meaningPackage.atomOccurrences ?? []).map(
    atom => [atom.atomOccurrenceId, atom],
  ));
  const projectedCueRows = new Map();
  for (const caption of lineEndProjection?.captions ?? []) {
    const sourceCaption = lineEndSourcePackage.reconstructionMap.captions.find(
      row => row.captionId === caption.inputCaptionId,
    );
    for (const cue of caption.cues) {
      if (projectedCueRows.has(cue.cueId)) {
        return rejected('LINE_LAYOUT_INPUT_INVALID', '/lineEndProjection');
      }
      projectedCueRows.set(cue.cueId, {cue, sourceCaption});
    }
  }
  const entries = [];
  for (const instruction of instructionArtifact.instructions) {
    const projectionRow = projectedCueRows.get(instruction.cueEndReference?.cueId);
    const result = instruction.semanticKind === 'speech-caption'
      ? buildCaptionLines({
        instruction,
        atoms: instruction.targetProvenance.atomOccurrenceIds.map(id => atomById.get(id)),
        maxLogicalWidth,
        maxLines,
        characterWidthRule,
        sourceCaption: projectionRow?.sourceCaption,
        projectedCue: projectionRow?.cue,
      })
      : buildTitleLines({instruction, maxLogicalWidth, maxLines, characterWidthRule});
    if (result.status !== 'built') return result;
    entries.push(Object.freeze({
      instructionId: instruction.instructionId,
      lineLayoutRuleId: instruction.semanticKind === 'speech-caption'
        ? PRESENTATION_CAPTION_LINE_LAYOUT_RULE_V001
        : PRESENTATION_TITLE_LINE_LAYOUT_RULE_V001,
      lines: result.lines,
    }));
  }
  const layout = Object.freeze({
    schemaVersion: PRESENTATION_RENDERER_LINE_LAYOUT_SCHEMA_V001,
    layoutId,
    instructionArtifactBinding: structuredClone(instructionArtifactBinding),
    entries: Object.freeze(entries),
  });
  const validation = validatePresentationRendererLineLayoutV001(
    layout,
    {instructionArtifact},
  );
  return validation.status === 'passed'
    ? Object.freeze({status: 'built', layout})
    : validation;
}

export const serializePresentationRendererLineLayoutV001 = value => {
  const validation = validatePresentationRendererLineLayoutV001(value);
  if (validation.status !== 'passed') throw new TypeError('presentation line layout is invalid');
  return formalBytes(value);
};

export function decodePresentationRendererLineLayoutV001(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    if (!formalBytes(value).equals(bytes)
      || validatePresentationRendererLineLayoutV001(value).status !== 'passed') {
      return Object.freeze({status: 'rejected', reason: 'schema-invalid'});
    }
    return Object.freeze({status: 'decoded', value});
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
}
