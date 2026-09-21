/** Saved, explicitly evidenced local subtitle changes, before presentation selection.
 * This module changes no media and has no knowledge of particular caption IDs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {canonicalJson} from './clock.mjs';
import {indexExplicitLinesV001, codePointWeightV001, validateIndexedLinesV001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';

const clone = structuredClone;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => sha(canonicalJson(value));
const contexts = new WeakSet();
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const fail = (ok, message) => {if (!ok) throw new TypeError('R1_CAPTION_REPAIR_INVALID: ' + message);};
const integer = value => Number.isSafeInteger(value) && value >= 0;
const interval = value => value && integer(value.startFrame) && integer(value.endFrameExclusive)
  && value.startFrame < value.endFrameExclusive;
const rangeOf = caption => ({startFrame: caption.startFrame, endFrameExclusive: caption.endFrameExclusive});
const count = range => range.endFrameExclusive - range.startFrame;
const contains = (outer, inner) => outer.startFrame <= inner.startFrame && outer.endFrameExclusive >= inner.endFrameExclusive;
const overlap = (a, b) => a.startFrame < b.endFrameExclusive && b.startFrame < a.endFrameExclusive;
function frozen(value) {
  if (value && typeof value === 'object') {Object.values(value).forEach(frozen); Object.freeze(value);}
  return value;
}
function reference(ref) {
  fail(ref && isAbsolute(ref.path ?? '') && /^[a-f0-9]{64}$/.test(ref.fileSha256 ?? '')
    && integer(ref.bytes), 'an absolute byte reference is required');
  return clone(ref);
}
function bound(ref, bytes) {
  reference(ref); const data = Buffer.from(bytes);
  fail(data.length === ref.bytes && sha(data) === ref.fileSha256, 'saved input bytes differ: ' + ref.path);
  return data;
}
function indexedChild(parent, child, id, widthRule) {
  const source = [...parent.text];
  const text = source.slice(child.startCodePoint, child.endCodePointExclusive).join('');
  const lines = child.lines ?? [text];
  const indexed = indexExplicitLinesV001(lines);
  fail(indexed.status === 'passed' && lines.join('') === text, 'child line layout must preserve its exact source passage');
  const lineSources = parent.indexedLines.flatMap(line => line.characters.map(character => ({
    codePoint: character.sourceIndex, ids: line.sourceUnitIds ?? [],
  })));
  const parentAtoms = parent.targetProvenance?.sourceAtomIds ?? [];
  // The base captions have one atom per code point; Q5-2 also admits whole source segments.
  const atomPerCharacter = parentAtoms.length === source.length;
  const atoms = atomPerCharacter ? parentAtoms.slice(child.startCodePoint, child.endCodePointExclusive) : parentAtoms;
  const indexedLines = indexed.indexedLines.map(line => {
    const logicalWidth = [...line.text].reduce((sum, char) => sum + codePointWeightV001(char, widthRule), 0);
    fail(logicalWidth <= parent.visualState.layout.maxCharsPerLine, 'child exceeds admitted line width');
    const selected = atomPerCharacter ? line.characters.map(char => atoms[char.sourceIndex])
      : [...new Set(lineSources.filter(item => item.codePoint >= child.startCodePoint && item.codePoint < child.endCodePointExclusive).flatMap(item => item.ids))];
    return {...line, logicalWidth, sourceUnitIds: selected};
  });
  fail(indexedLines.length <= parent.visualState.layout.maxLines, 'child exceeds admitted line count');
  return {...clone(parent), instructionId: id, text, indexedLines,
    startFrame: child.range.startFrame, endFrameExclusive: child.range.endFrameExclusive,
    displayFrameCount: count(child.range),
    targetProvenance: {...clone(parent.targetProvenance), sourceAtomIds: clone(atoms)}};
}

/** Evidence supplies a finite list of changes and explicitly distinguishes observations from estimates. */
export function createR1CaptionSourceV001({normalPlanRef, normalPlanBytes, evidenceRef, evidenceBytes,
  policyRef, policyBytes}) {
  const normalPlan = JSON.parse(bound(normalPlanRef, normalPlanBytes));
  const evidence = JSON.parse(bound(evidenceRef, evidenceBytes));
  bound(policyRef, policyBytes);
  fail(normalPlan.schemaVersion === 'presentation-output-common-core-plan-v001'
    && normalPlan.canvas.fps === 30 && Array.isArray(normalPlan.elements), 'unchanged common Normal schema required');
  fail(evidence.schemaVersion === 'r1-caption-boundary-evidence-v001'
    && same(evidence.normalPlanRef, normalPlanRef) && same(evidence.policyRef, policyRef)
    && typeof evidence.clockId === 'string' && evidence.clockId.length > 0
    && integer(evidence.frameCount) && evidence.frameCount > 0
    && Array.isArray(evidence.repairs) && evidence.repairs.length > 0,
  'caption evidence identity, clock or finite repair list differs');
  for (const ref of evidence.sourceRefs) reference(ref);
  const parents = new Map(normalPlan.elements.map(caption => [caption.instructionId, caption]));
  fail(parents.size === normalPlan.elements.length, 'duplicate input caption identity');
  const ids = new Set(), touched = new Set();
  for (const repair of evidence.repairs) {
    const parent = parents.get(repair.parentCaptionId);
    fail(typeof repair.repairId === 'string' && repair.repairId.length > 0 && !ids.has(repair.repairId)
      && parent && !touched.has(parent.instructionId) && repair.parentText === parent.text
      && same(repair.parentRange, rangeOf(parent)) && typeof repair.reason === 'string' && repair.reason.length > 0
      && Array.isArray(repair.observations) && repair.observations.length > 0
      && typeof repair.inference === 'string' && repair.inference.length > 0,
    'repair must name an unchanged parent once and retain its observations and inference');
    fail(!['presentationColorRange', 'presentationPulse', 'presentationMotion'].some(key => key in parent),
      'caption repair must precede presentation resolution');
    repair.observations.forEach(observation => {
      fail(evidence.sourceRefs.some(ref => same(ref, observation.sourceRef))
        && typeof observation.locator === 'string' && observation.locator.length > 0
        && typeof observation.meaning === 'string' && observation.meaning.length > 0,
      'observation must refer to a byte-bound source and identify its saved passage');
    });
    fail(['replace', 'hide'].includes(repair.action) && Array.isArray(repair.children), 'explicit repair operation required');
    if (repair.action === 'hide') {
      fail(repair.children.length === 0 && interval(repair.reviewRange)
        && contains(repair.reviewRange, rangeOf(parent)) && interval(repair.correspondingSpeechRange)
        && !overlap(repair.reviewRange, repair.correspondingSpeechRange),
      'local hiding requires the complete original caption in the reviewed range and observed speech outside it');
    } else {
      fail(repair.children.length > 0, 'replacement needs a complete exact-text partition');
      let position = 0, end = 0;
      for (const child of repair.children) {
        fail(child.startCodePoint === position && Number.isSafeInteger(child.endCodePointExclusive)
          && child.endCodePointExclusive > position && child.endCodePointExclusive <= [...parent.text].length
          && interval(child.range) && child.range.startFrame >= end && child.range.endFrameExclusive <= evidence.frameCount
          && typeof child.boundaryBasis === 'string' && child.boundaryBasis.length > 0,
        'child source partition, frame interval or boundary explanation differs');
        position = child.endCodePointExclusive; end = child.range.endFrameExclusive;
      }
      fail(position === [...parent.text].length, 'split must retain all original code points exactly once');
    }
    ids.add(repair.repairId); touched.add(parent.instructionId);
  }
  const identity = {normalPlanRef: reference(normalPlanRef), evidenceRef: reference(evidenceRef),
    policyRef: reference(policyRef), clockId: evidence.clockId, frameCount: evidence.frameCount};
  const source = frozen({normalPlan, evidence, identity, identitySha256: hash(identity)});
  contexts.add(source); return source;
}

export function resolveR1CaptionRepairsV001({source, activeRepairIds}) {
  fail(contexts.has(source), 'only freshly byte-bound original input can resolve repairs');
  fail(Array.isArray(activeRepairIds) && new Set(activeRepairIds).size === activeRepairIds.length
    && activeRepairIds.every(id => source.evidence.repairs.some(repair => repair.repairId === id)), 'unknown or duplicate active repair');
  const orderedIds = source.evidence.repairs.filter(repair => activeRepairIds.includes(repair.repairId)).map(repair => repair.repairId);
  const selected = new Map(source.evidence.repairs.filter(repair => orderedIds.includes(repair.repairId)).map(repair => [repair.parentCaptionId, repair]));
  const elements = [], captionMappings = [];
  for (const parent of source.normalPlan.elements) {
    const repair = selected.get(parent.instructionId);
    if (!repair) {elements.push(clone(parent)); continue;}
    const children = repair.children.map((child, index) => {
      const id = repair.children.length === 1 ? parent.instructionId : parent.instructionId + '-r1-child-' + String(index + 1).padStart(2, '0');
      return indexedChild(parent, child, id, source.normalPlan.layoutRules.characterWidthRule);
    });
    elements.push(...children);
    captionMappings.push({repairId: repair.repairId, parentCaptionId: parent.instructionId,
      originalText: parent.text, originalRange: rangeOf(parent), originalCaptionSha256: hash(parent),
      action: repair.action, reason: repair.reason, children: children.map((child, index) => ({captionId: child.instructionId,
        text: child.text, startCodePoint: repair.children[index].startCodePoint,
        endCodePointExclusive: repair.children[index].endCodePointExclusive,
        range: rangeOf(child), sourceAtomIds: clone(child.targetProvenance.sourceAtomIds)}))});
  }
  elements.sort((a, b) => a.startFrame - b.startFrame);
  const names = new Set();
  for (const caption of elements) {
    fail(!names.has(caption.instructionId) && validateIndexedLinesV001(caption.text, caption.indexedLines).status === 'passed',
      'duplicate output identity or altered indexed text'); names.add(caption.instructionId);
  }
  // Existing unrelated overlaps are not silently repaired, but this revision may not introduce any.
  for (const child of elements.filter(caption => captionMappings.some(map => map.children.some(row => row.captionId === caption.instructionId)))) {
    for (const other of elements) if (other !== child) fail(!overlap(rangeOf(child), rangeOf(other)), 'a repaired caption overlaps another subtitle');
  }
  const normalPlan = {...clone(source.normalPlan), elements};
  const payload = {schemaVersion: 'r1-caption-repair-plan-v001', sourceIdentity: clone(source.identity),
    sourceIdentitySha256: source.identitySha256, activeRepairIds: orderedIds,
    clockId: source.evidence.clockId, frameCount: source.evidence.frameCount,
    normalPlan, captionMappings, evidenceBindings: clone(source.evidence.sourceRefs),
    invariants: {mediaChanged: false, sourceTextChanged: false, unselectedCaptionsUnchanged: true,
      humanQuality: 'not-evaluated', adopted: false}};
  return frozen({...payload, repairVersion: 'r1-caption-repair-' + hash(payload)});
}

export function restoreR1CaptionRepairsV001({source, saved}) {
  fail(saved?.schemaVersion === 'r1-caption-repair-plan-v001'
    && saved.sourceIdentitySha256 === source.identitySha256 && same(saved.sourceIdentity, source.identity),
  'saved repair source differs; derived input cannot be repaired twice');
  const resolved = resolveR1CaptionRepairsV001({source, activeRepairIds: saved.activeRepairIds});
  fail(same(resolved, saved), 'saved text, boundaries, evidence, or selected repair differs');
  return resolved;
}

export function cancelR1CaptionRepairV001({source, saved, repairId}) {
  const resolved = restoreR1CaptionRepairsV001({source, saved});
  fail(resolved.activeRepairIds.includes(repairId), 'only an active local repair can be cancelled');
  return resolveR1CaptionRepairsV001({source, activeRepairIds: resolved.activeRepairIds.filter(id => id !== repairId)});
}

/** Whole-caption projection only. Content omission/addition is resolved by its own saved edit before this step. */
export function projectR1CaptionRangeV001({resolved, range, targetClockId}) {
  fail(resolved?.schemaVersion === 'r1-caption-repair-plan-v001' && interval(range)
    && range.endFrameExclusive <= resolved.frameCount && typeof targetClockId === 'string'
    && targetClockId !== resolved.clockId, 'one explicit source-to-short clock projection required');
  const selected = resolved.normalPlan.elements.filter(caption => overlap(rangeOf(caption), range));
  fail(selected.length > 0 && selected.every(caption => contains(range, rangeOf(caption))),
    'short boundary would truncate a subtitle; select a complete saved caption interval');
  const elements = selected.map(caption => ({...clone(caption), startFrame: caption.startFrame - range.startFrame,
    endFrameExclusive: caption.endFrameExclusive - range.startFrame}));
  return frozen({schemaVersion: 'r1-caption-short-projection-v001', repairVersion: resolved.repairVersion,
    sourceClockId: resolved.clockId, targetClockId, sourceRange: clone(range), frameCount: count(range),
    normalPlan: {...clone(resolved.normalPlan), elements},
    captionMappings: elements.map((caption, index) => ({captionId: caption.instructionId,
      sourceRange: rangeOf(selected[index]), outputRange: rangeOf(caption)})),
    parentChildMappings: clone(resolved.captionMappings), noCaptionPhaseRestart: true});
}

export async function loadR1CaptionRepairsV001({savedPath}) {
  const saved = JSON.parse(await readFile(savedPath));
  const identity = saved.sourceIdentity;
  const source = createR1CaptionSourceV001({normalPlanRef: identity.normalPlanRef,
    normalPlanBytes: await readFile(identity.normalPlanRef.path), evidenceRef: identity.evidenceRef,
    evidenceBytes: await readFile(identity.evidenceRef.path), policyRef: identity.policyRef,
    policyBytes: await readFile(identity.policyRef.path)});
  for (const ref of source.evidence.sourceRefs) bound(ref, await readFile(ref.path));
  return restoreR1CaptionRepairsV001({source, saved});
}
