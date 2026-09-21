/** Q5-2: one unadopted, immediately preceding source interval; no change to Q5-1. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isAbsolute, normalize, sep} from 'node:path';
import {canonicalJson} from './clock.mjs';
import {createQ5EditSourceV001} from './q5-edit-plan.mjs';
import {indexExplicitLinesV001, codePointWeightV001, frameBoundaryV001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';

const clone = structuredClone;
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const contexts = new WeakSet();
const ORIGINAL_CLOCK = 'q5-original-c-all-frame-v001';
const EDITED_CLOCK = 'q5-2-edited-content-frame-v001';
const LOCAL_CLOCK = 'q5-2-comparison-local-frame-v001';
const SOURCE_CLOCK = 'q5-2-original-source-frame30-v001';
const TARGET_SEGMENT = 'segment-0008';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const require = (condition, message) => {if (!condition) throw new TypeError('Q52_EDIT_PLAN_INVALID: ' + message);};
const integer = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const frameRange = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const count = value => value.endFrameExclusive - value.startFrame;
const overlaps = (left, right) => left.startFrame < right.endFrameExclusive && right.startFrame < left.endFrameExclusive;
const contains = (outer, inner) => outer.startFrame <= inner.startFrame && inner.endFrameExclusive <= outer.endFrameExclusive;
const sourceRange = segment => frameRange(segment.sourceStartFrame30, segment.sourceEndFrame30);
const digestRange = segment => frameRange(segment.outputStartFrame, segment.outputEndFrame);
const captionRange = caption => frameRange(caption.startFrame, caption.endFrameExclusive);
const shifted = (range, amount) => frameRange(range.startFrame + amount, range.endFrameExclusive + amount);
const sampleRange = range => range === null ? null : ({startSample: range.startFrame * 1600,
  endSampleExclusive: range.endFrameExclusive * 1600});
const withoutTime = ({startFrame, endFrameExclusive, ...payload}) => payload;
function freeze(value) {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
}
function exact(value, fields, name) {
  require(object(value) && Object.keys(value).length === fields.length
    && fields.every(field => Object.hasOwn(value, field)), name + ' fields differ');
}
function reference(value, name) {
  require(object(value) && Object.keys(value).every(key => ['path', 'fileSha256', 'bytes'].includes(key))
    && isAbsolute(value.path ?? '') && /^[a-f0-9]{64}$/.test(value.fileSha256 ?? '')
    && (!Object.hasOwn(value, 'bytes') || integer(value.bytes)), name + ' must be an absolute byte reference');
  return clone(value);
}
function boundJson(value, ref, name) {
  require(typeof value === 'string' || Buffer.isBuffer(value), name + ' bytes required');
  const bytes = Buffer.from(value);
  require(createHash('sha256').update(bytes).digest('hex') === ref.fileSha256
    && (ref.bytes === undefined || bytes.length === ref.bytes), name + ' bytes differ from reference');
  return JSON.parse(bytes.toString('utf8'));
}
function range(value, limit, name) {
  exact(value, ['startFrame', 'endFrameExclusive'], name);
  require(integer(value.startFrame) && integer(value.endFrameExclusive)
    && value.startFrame < value.endFrameExclusive && value.endFrameExclusive <= limit
    && Number.isSafeInteger(value.endFrameExclusive * 1600), name + ' must be a positive half-open frame interval');
  return clone(value);
}
function assertSource(source) {
  require(contexts.has(source), 'only a byte-bound original Q5-2 source context is accepted; derived, serialized or twice-projected input rejected');
}
function sourceForDigest(segment, interval) {
  return shifted(interval, segment.sourceStartFrame30 - segment.outputStartFrame);
}
function playback(sourceVideoRange, originalDigestRange, editedGlobalRange, outputRange) {
  return {sampleRate: 48000, channels: 2, samplesPerFrame: 1600,
    sourceVideoRange: sampleRange(sourceVideoRange), originalDigestRange: sampleRange(originalDigestRange),
    editedGlobalRange: sampleRange(editedGlobalRange), outputRange: sampleRange(outputRange)};
}

/** Original plan/timeline bytes use the existing verifier. The renderer rechecks media and evidence roots. */
export function createQ52EditSourceV001({sourceVideoRef: inputVideoRef,
  sourceEvidenceRef: inputEvidence, sourceEvidenceBytes, boundaryEvidenceRef: inputBoundary, boundaryEvidenceBytes,
  ...originalInput}) {
  const original = createQ5EditSourceV001(originalInput);
  const sourceVideoRef = reference(inputVideoRef, 'original source video');
  const binding = original.basisEditPlan.sourceVideoBinding;
  require(object(binding) && binding.fileSha256 === sourceVideoRef.fileSha256
    && typeof binding.path === 'string'
    && (isAbsolute(binding.path) ? normalize(sourceVideoRef.path) === normalize(binding.path)
      : normalize(sourceVideoRef.path).endsWith(sep + normalize(binding.path))),
  'source video differs from the unchanged original retained plan');
  require(original.timeline.segments.length === 12
    && original.timeline.sourceFrameClock?.logicalFrameRate === '30/1', 'the original twelve-interval source clock is required');
  if (!originalInput.fixture) require(original.timeline.sourceFrameClock.inputFrameRate === '60/1'
    && original.timeline.sourceFrameClock.extractionRuleId === 'source-frame-60fps-global-even-v001',
  'C-all source frame conversion differs from the saved original rule');
  const sourceEvidenceRef = reference(inputEvidence, 'saved source-utterance candidate evidence');
  const boundaryEvidenceRef = reference(inputBoundary, 'saved addition boundary evidence');
  const sourceEvidence = boundJson(sourceEvidenceBytes, sourceEvidenceRef, 'source-utterance candidate evidence');
  const boundaryEvidence = boundJson(boundaryEvidenceBytes, boundaryEvidenceRef, 'addition boundary evidence');
  validateEvidence(original, sourceVideoRef, sourceEvidenceRef, sourceEvidence, boundaryEvidence);
  const sourceIdentity = {...clone(original.sourceIdentity), schemaVersion: 'q5-2-original-content-identity-v001',
    sourceVideoRef, sourceEvidenceRef, boundaryEvidenceRef, sourceFrameClock: clone(original.timeline.sourceFrameClock)};
  const source = freeze({schemaVersion: 'q5-2-edit-source-context-v001', sourceIdentity,
    sourceIdentitySha256: hash(sourceIdentity), normalPlan: original.normalPlan,
    timeline: original.timeline, basisEditPlan: original.basisEditPlan, sourceEvidence, boundaryEvidence});
  contexts.add(source);
  return source;
}

function validateEvidence(original, sourceVideoRef, sourceEvidenceRef, evidence, boundary) {
  const target = original.timeline.segments.find(segment => segment.segmentId === TARGET_SEGMENT);
  require(evidence?.schemaVersion === 'q5-2-context-addition-judgment-v001'
    && boundary?.schemaVersion === 'q5-2-context-addition-boundary-v001', 'Q5-2 source and boundary evidence schemas required');
  require(typeof evidence.candidateId === 'string' && evidence.candidateId.length > 0
    && evidence.candidateId === boundary.candidateId && evidence.targetSegmentId === TARGET_SEGMENT
    && boundary.targetSegmentId === TARGET_SEGMENT && same(evidence.sourceVideoRef, sourceVideoRef)
    && same(boundary.sourceVideoRef, sourceVideoRef) && same(boundary.sourceEvidenceRef, sourceEvidenceRef)
    && same(evidence.policyRef, boundary.policyRef), 'candidate evidence source, policy or target bindings differ');
  reference(evidence.policyRef, 'evidence instruction');
  for (const key of ['sourceTranscriptRef', 'sourceUtterancesRef', 'sourceWordTimestampsRef',
    'sourceAcousticObservationRef', 'sourceAcousticPreflightRef']) reference(evidence[key], 'candidate ' + key);
  exact(evidence.addition, ['targetSegmentId', 'sourceVideoRange', 'subtitleMode'], 'evidence addition');
  const addition = range(evidence.addition.sourceVideoRange, target.sourceStartFrame30, 'evidence added source interval');
  require(evidence.addition.targetSegmentId === TARGET_SEGMENT && evidence.addition.subtitleMode === 'source-text-captions'
    && addition.endFrameExclusive === target.sourceStartFrame30 && count(addition) <= 900
    && original.timeline.segments.every(segment => !overlaps(sourceRange(segment), addition))
    && same(boundary.actualSourceAddition, addition) && boundary.addedFrameCount === count(addition)
    && same(boundary.originalTargetSourceRange, sourceRange(target)) && boundary.subtitleMode === 'source-text-captions'
    && same(boundary.comparisonBeforeRange, evidence.comparisonBeforeRange), 'addition evidence conflicts with unchanged retained media');
  const before = range(evidence.comparisonBeforeRange, original.sourceIdentity.frameCount, 'evidence comparison');
  require(before.startFrame === target.outputStartFrame && before.endFrameExclusive <= target.outputEndFrame,
    'evidence comparison must begin at the original target scene');
  const utterance = evidence.sourceUtterance, atoms = evidence.sourceAtoms, words = evidence.acousticWords, chunk = evidence.acousticChunk;
  require(object(utterance) && Array.isArray(atoms) && atoms.length > 0 && Array.isArray(words) && words.length > 0
    && object(chunk) && integer(chunk.startMs) && integer(chunk.index)
    && typeof utterance.utteranceId === 'string' && Array.isArray(utterance.sourceSegmentIds)
    && atoms.every(atom => integer(atom.id) && typeof atom.text === 'string' && atom.text.length > 0)
    && same(atoms.map(atom => atom.id), utterance.sourceSegmentIds)
    && atoms.map(atom => atom.text).join('') === utterance.text, 'original utterance and source atoms do not correspond');
  require(Array.isArray(evidence.addedCaptionEvidence) && evidence.addedCaptionEvidence.length === 3
    && same(boundary.addedCaptions, evidence.addedCaptionEvidence), 'the three grounded added captions are required');
  let expectedStart = addition.startFrame, expectedAtomPosition = 0, nextWordIndex = null;
  const seenAtoms = new Set(), seenWords = new Set();
  for (const [index, caption] of evidence.addedCaptionEvidence.entries()) {
    exact(caption, ['captionId', 'text', 'sourceVideoRange', 'sourceSegmentIds', 'acousticWordIndices',
      'sourceUtteranceId', 'acousticChunkIndex', 'sourceStartMs', 'sourceEndMs'], 'added caption evidence');
    require(caption.captionId === 'q5-2-added-caption-' + String(index + 1).padStart(6, '0')
      && !original.normalPlan.elements.some(row => row.instructionId === caption.captionId)
      && caption.sourceUtteranceId === utterance.utteranceId && caption.acousticChunkIndex === chunk.index
      && Array.isArray(caption.sourceSegmentIds) && caption.sourceSegmentIds.length > 0
      && Array.isArray(caption.acousticWordIndices) && caption.acousticWordIndices.length > 0,
    'added caption ID, utterance or acoustic ownership differs');
    const positions = caption.sourceSegmentIds.map(id => atoms.findIndex(atom => atom.id === id));
    require(positions[0] === expectedAtomPosition
      && positions.every((position, i) => position >= 0 && (i === 0 || position === positions[i - 1] + 1))
      && caption.sourceSegmentIds.every(id => !seenAtoms.has(id)), 'caption source atoms must form an unused contiguous original passage');
    const selectedAtoms = positions.map(position => atoms[position]);
    require((nextWordIndex === null || caption.acousticWordIndices[0] === nextWordIndex)
      && caption.acousticWordIndices.every((wordIndex, i) => integer(wordIndex) && wordIndex < words.length
      && (i === 0 || wordIndex === caption.acousticWordIndices[i - 1] + 1) && !seenWords.has(wordIndex)),
    'caption acoustic words must form an unused contiguous saved passage');
    const selectedWords = caption.acousticWordIndices.map(wordIndex => words[wordIndex]);
    const first = selectedWords[0], last = selectedWords.at(-1);
    require(selectedAtoms.map(atom => atom.text).join('') === caption.text
      && selectedWords.map(word => word.word).join('') === caption.text,
    'added caption text must exactly match both original atoms and saved acoustic words');
    require(selectedWords.every(word => Number.isFinite(word.start) && Number.isFinite(word.end) && word.start <= word.end)
      && integer(caption.sourceStartMs) && integer(caption.sourceEndMs)
      && caption.sourceStartMs === chunk.startMs + Math.round(first.start * 1000)
      && caption.sourceEndMs === chunk.startMs + Math.round(last.end * 1000), 'caption source clock differs from saved acoustic words');
    const interval = range(caption.sourceVideoRange, addition.endFrameExclusive, 'added caption source interval');
    require(interval.startFrame === expectedStart && interval.startFrame === frameBoundaryV001(caption.sourceStartMs)
      && interval.endFrameExclusive === frameBoundaryV001(caption.sourceEndMs),
    'caption source frames must use the original nearest-at-30fps conversion and cover the addition once');
    expectedStart = interval.endFrameExclusive; expectedAtomPosition = positions.at(-1) + 1;
    nextWordIndex = caption.acousticWordIndices.at(-1) + 1;
    caption.sourceSegmentIds.forEach(id => seenAtoms.add(id)); caption.acousticWordIndices.forEach(id => seenWords.add(id));
  }
  require(expectedStart === addition.endFrameExclusive, 'added caption sequence must end at the unchanged original body');
  const firstCaption = evidence.addedCaptionEvidence[0], firstAtom = atoms.find(atom => atom.id === firstCaption.sourceSegmentIds[0]);
  const selectedBoundary = boundary.selectedSourceSpeechBoundary;
  require(object(selectedBoundary) && selectedBoundary.utteranceId === utterance.utteranceId
    && selectedBoundary.firstSegmentId === firstAtom.id && selectedBoundary.rawObservedStartMs === firstAtom.startMs
    && selectedBoundary.fixedTextObservedStartMs === firstCaption.sourceStartMs
    && selectedBoundary.startMs === firstCaption.sourceStartMs && selectedBoundary.rounding === 'nearest-at-30fps'
    && selectedBoundary.startFrame === addition.startFrame, 'selected speech boundary differs from the first grounded caption');
}

function addedElement(source, evidence, target, contentVersion, addedPiece) {
  const template = source.normalPlan.elements.find(caption => contains(digestRange(target), captionRange(caption)));
  require(template?.visualState?.textStyle?.fontSizePx === 94 && template.visualState.layout,
    'an unchanged Normal 94px caption template is required');
  const indexed = indexExplicitLinesV001([evidence.text]);
  require(indexed.status === 'passed', 'existing caption text indexer rejected added source text');
  const logicalWidth = [...evidence.text].reduce((total, char) => total + codePointWeightV001(char, source.normalPlan.layoutRules.characterWidthRule), 0);
  require(logicalWidth <= template.visualState.layout.maxCharsPerLine,
    'added source phrase exceeds the unchanged Normal single-line allowance');
  const sourceAtomIds = evidence.sourceSegmentIds.map(id => 'q5-2-source-segment-' + String(id).padStart(6, '0'));
  const outputRange = shifted(evidence.sourceVideoRange, addedPiece.editedGlobalRange.startFrame - addedPiece.sourceVideoRange.startFrame);
  const element = {...clone(template), instructionId: evidence.captionId, text: evidence.text,
    indexedLines: indexed.indexedLines.map(line => ({...line, sourceUnitIds: sourceAtomIds, logicalWidth})),
    startFrame: outputRange.startFrame, endFrameExclusive: outputRange.endFrameExclusive, displayFrameCount: count(outputRange),
    targetProvenance: {targetRefId: 'q5-2-added-caption-source-v001', targetType: 'semantic-caption', sourceAtomIds}};
  return {element, mapping: {captionId: evidence.captionId, contentVersion, status: 'added',
    originalContentVersion: null, originalParentSegmentId: null, parentSegmentId: target.segmentId,
    originalDigestRange: null, sourceVideoRange: clone(evidence.sourceVideoRange), editedGlobalRange: outputRange,
    outputRange: clone(outputRange), retainedPieceId: addedPiece.pieceId, displayFrameCount: count(outputRange),
    sourceEvidenceRef: clone(source.sourceIdentity.sourceEvidenceRef), sourceCaptionEvidence: clone(evidence)}};
}

/** Only the three phrases from the fixed original-text/acoustic evidence can be added. */
export function resolveQ52EditPlanV001({source, candidateId, policyRef: inputPolicy,
  boundaryEvidenceRef: inputBoundary, sourceEvidenceRef: inputEvidence, addition: inputAddition, addedCaptions}) {
  assertSource(source);
  require(typeof candidateId === 'string' && candidateId.trim().length > 0, 'candidate ID required');
  const policyRef = reference(inputPolicy, 'received Q5-2 instruction');
  const boundaryEvidenceRef = reference(inputBoundary, 'saved addition boundary evidence');
  const sourceEvidenceRef = reference(inputEvidence, 'saved source-utterance candidate evidence');
  require(candidateId === source.sourceEvidence.candidateId && same(policyRef, source.sourceEvidence.policyRef)
    && same(boundaryEvidenceRef, source.sourceIdentity.boundaryEvidenceRef)
    && same(sourceEvidenceRef, source.sourceIdentity.sourceEvidenceRef), 'edit identity must match the byte-bound candidate and evidence');
  require(inputAddition !== undefined && Array.isArray(addedCaptions), 'addition and addedCaptions must both be explicit');
  require(inputAddition === null ? addedCaptions.length === 0
    : same(addedCaptions, source.sourceEvidence.addedCaptionEvidence),
  'addition and grounded added captions must be applied or cancelled together; altered text, clock and reused IDs are rejected');
  let addition = null, target = null;
  if (inputAddition !== null) {
    exact(inputAddition, ['targetSegmentId', 'sourceVideoRange', 'subtitleMode'], 'addition');
    require(same(inputAddition, source.sourceEvidence.addition), 'only the first fixed source addition and its grounded subtitle mode are supported');
    target = source.timeline.segments.find(segment => segment.segmentId === inputAddition.targetSegmentId);
    require(target, 'selected original retained interval is absent');
    const interval = range(inputAddition.sourceVideoRange, target.sourceStartFrame30, 'added source interval');
    require(interval.endFrameExclusive === target.sourceStartFrame30 && count(interval) <= 900,
      'addition must immediately precede the selected source start and stay within the thirty-second investigation range');
    require(source.timeline.segments.every(segment => !overlaps(sourceRange(segment), interval)),
      'added source interval overlaps already retained media');
    addition = {targetSegmentId: target.segmentId, sourceVideoRange: interval, subtitleMode: 'source-text-captions'};
  }
  const addedFrameCount = addition === null ? 0 : count(addition.sourceVideoRange);
  const frameCount = source.sourceIdentity.frameCount + addedFrameCount;
  require(Number.isSafeInteger(frameCount * 1600), 'expanded playback clock exceeds exact integer range');
  const binding = {sourceIdentity: source.sourceIdentity, sourceIdentitySha256: source.sourceIdentitySha256,
    candidateId, policyRef, boundaryEvidenceRef, sourceEvidenceRef, addition, addedCaptions: clone(addedCaptions),
    operation: 'one-immediately-preceding-source-extension; original-Normal-retained; no-adoption'};
  const contentVersion = addition === null ? source.sourceIdentity.originalContentVersion : 'q5-2-content-v001-' + hash(binding);
  const physicalPieces = [], retainedIntervals = [];
  let nextFrame = 0;
  for (const [index, segment] of source.timeline.segments.entries()) {
    const intervalStart = nextFrame;
    if (segment === target) {
      const editedGlobalRange = frameRange(nextFrame, nextFrame + addedFrameCount);
      physicalPieces.push({pieceId: 'q5-2-piece-' + String(physicalPieces.length + 1).padStart(4, '0'),
        ordinal: physicalPieces.length + 1, contentVersion, kind: 'added-source-video',
        parentSegmentId: segment.segmentId, parentOrdinal: index + 1,
        mediaRef: clone(source.sourceIdentity.sourceVideoRef), sourceVideoRange: clone(addition.sourceVideoRange),
        originalDigestRange: null, editedGlobalRange, outputRange: clone(editedGlobalRange),
        playback: playback(addition.sourceVideoRange, null, editedGlobalRange, editedGlobalRange)});
      nextFrame = editedGlobalRange.endFrameExclusive;
    }
    const originalDigestRange = digestRange(segment), sourceVideoRange = sourceRange(segment);
    const editedGlobalRange = frameRange(nextFrame, nextFrame + count(originalDigestRange));
    physicalPieces.push({pieceId: 'q5-2-piece-' + String(physicalPieces.length + 1).padStart(4, '0'),
      ordinal: physicalPieces.length + 1, contentVersion, kind: 'retained-original-digest',
      parentSegmentId: segment.segmentId, parentOrdinal: index + 1,
      mediaRef: clone(source.sourceIdentity.mediaRef), sourceVideoRange, originalDigestRange, editedGlobalRange,
      outputRange: clone(editedGlobalRange), playback: playback(sourceVideoRange, originalDigestRange, editedGlobalRange, editedGlobalRange)});
    nextFrame = editedGlobalRange.endFrameExclusive;
    retainedIntervals.push({segmentId: segment.segmentId, originalDigestRange,
      originalSourceVideoRange: sourceVideoRange,
      sourceVideoRange: frameRange(segment === target ? addition.sourceVideoRange.startFrame : segment.sourceStartFrame30,
        segment.sourceEndFrame30),
      editedGlobalRange: frameRange(intervalStart, nextFrame), retainedOriginalEditedGlobalRange: editedGlobalRange,
      addedSourceVideoRange: segment === target ? clone(addition.sourceVideoRange) : null});
  }
  require(nextFrame === frameCount, 'expanded retained intervals do not cover the new whole-content clock');
  const captionMappings = [];
  const elements = source.normalPlan.elements.map(caption => {
    const originalDigestRange = captionRange(caption);
    const owner = source.timeline.segments.find(segment => contains(digestRange(segment), originalDigestRange));
    const piece = physicalPieces.find(item => item.kind === 'retained-original-digest' && item.parentSegmentId === owner.segmentId);
    const editedGlobalRange = shifted(originalDigestRange, piece.editedGlobalRange.startFrame - piece.originalDigestRange.startFrame);
    const edited = {...clone(caption), startFrame: editedGlobalRange.startFrame, endFrameExclusive: editedGlobalRange.endFrameExclusive};
    assert.deepEqual(withoutTime(edited), withoutTime(caption), 'original caption payload or full display duration changed');
    captionMappings.push({captionId: caption.instructionId, contentVersion, status: 'retained',
      originalContentVersion: source.sourceIdentity.originalContentVersion, originalParentSegmentId: owner.segmentId,
      originalDigestRange, sourceVideoRange: sourceForDigest(owner, originalDigestRange), editedGlobalRange,
      outputRange: clone(editedGlobalRange), retainedPieceId: piece.pieceId,
      displayFrameCount: caption.displayFrameCount, unchangedCaptionSha256: hash(withoutTime(caption))});
    return edited;
  });
  if (addition !== null) {
    const addedPiece = physicalPieces.find(piece => piece.kind === 'added-source-video');
    for (const evidence of addedCaptions) {
      const added = addedElement(source, evidence, target, contentVersion, addedPiece);
      elements.push(added.element); captionMappings.push(added.mapping);
    }
    elements.sort((left, right) => left.startFrame - right.startFrame);
    captionMappings.sort((left, right) => left.outputRange.startFrame - right.outputRange.startFrame);
  }
  const normalPlan = {...clone(source.normalPlan), elements};
  if (addition === null) assert.deepEqual(normalPlan, source.normalPlan, 'cancellation must restore all original captions and their clock');
  const result = {schemaVersion: 'q5-2-content-edit-plan-v001', ...binding, contentVersion,
    status: addition === null ? 'original-content-restored' : 'unadopted-proposal',
    clock: addition === null ? ORIGINAL_CLOCK : EDITED_CLOCK, frameRate: 30, frameCount, addedFrameCount,
    playback: {sampleRate: 48000, channels: 2, samplesPerFrame: 1600, sampleCount: frameCount * 1600,
      addedSampleCount: addedFrameCount * 1600},
    normalPlan, physicalPieces, retainedIntervals, captionMappings,
    connections: physicalPieces.slice(1).map((piece, index) => ({beforePieceId: physicalPieces[index].pieceId,
      afterPieceId: piece.pieceId, atOutputFrame: piece.editedGlobalRange.startFrame, transition: 'normal-cut',
      sourceContinuity: piece.parentSegmentId === physicalPieces[index].parentSegmentId ? 'continuous-source' : 'original-scene-change'})),
    clocks: {originalSource: SOURCE_CLOCK, originalDigest: ORIGINAL_CLOCK, editedGlobal: addition === null ? ORIGINAL_CLOCK : EDITED_CLOCK,
      output: addition === null ? ORIGINAL_CLOCK : EDITED_CLOCK, playbackSampleRate: 48000, observationSampleRate: 16000},
    invariants: {originalCaptions: 'all payloads, IDs and display durations unchanged; shift once by owning retained interval',
      addedCaptions: addition === null ? 'none; cancelled with the added source media'
        : 'only three exact source phrases with saved acoustic correspondence; new IDs; original Normal 94px template',
      additionProvenance: 'originalDigestRange is null; sourceVideoRange is the original-source frame30 clock',
      sourceContinuity: 'addition ends exactly where the unchanged retained source begins; no inserted transition media',
      cancellation: 'remove addition and added captions together; restore original content and clock; separate from effect Reset',
      earlierEffectsOverridesAndReviews: 'not-imported; no prior answers transferred',
      wholeContentMedia: 'plan only; no newly manufactured whole-content media is claimed'}};
  return freeze({...result, resolutionSha256: hash(result)});
}

/** Saved plans are accepted only when every field reconstructs from verified original bytes. */
export function restoreQ52EditPlanV001({source, saved}) {
  assertSource(source);
  require(object(saved) && saved.schemaVersion === 'q5-2-content-edit-plan-v001', 'saved edit must use the separate Q5-2 schema; old plans are not converted');
  require(same(saved.sourceIdentity, source.sourceIdentity) && saved.sourceIdentitySha256 === source.sourceIdentitySha256,
    'saved content belongs to a different original source');
  const expected = resolveQ52EditPlanV001({source, candidateId: saved.candidateId, policyRef: saved.policyRef,
    boundaryEvidenceRef: saved.boundaryEvidenceRef, sourceEvidenceRef: saved.sourceEvidenceRef,
    addition: saved.addition, addedCaptions: saved.addedCaptions});
  require(same(saved, expected), 'saved content does not exactly reconstruct; altered or twice-projected content rejected');
  return expected;
}

/** Before starts at the original scene; After prepends the new source and shares the same body/exit. */
export function projectQ52ComparisonRangeV001({source, resolved, beforeRange: inputRange}) {
  const plan = restoreQ52EditPlanV001({source, saved: resolved});
  require(plan.addition !== null, 'a comparison requires an active addition proposal');
  const parent = source.timeline.segments.find(segment => segment.segmentId === plan.addition.targetSegmentId);
  const beforeRange = range(inputRange, source.sourceIdentity.frameCount, 'Before range');
  require(beforeRange.startFrame === parent.outputStartFrame && beforeRange.endFrameExclusive <= parent.outputEndFrame,
    'Before must start at the selected original scene and remain inside its unchanged body');
  for (const caption of source.normalPlan.elements) {
    const interval = captionRange(caption);
    require(!overlaps(interval, beforeRange) || contains(beforeRange, interval), 'short comparison endpoint cuts an original caption display clock');
  }
  require(same(beforeRange, source.sourceEvidence.comparisonBeforeRange), 'comparison must match the fixed first-proposal body and exit');
  const afterGlobalRange = frameRange(beforeRange.startFrame, beforeRange.endFrameExclusive + plan.addedFrameCount);
  const afterRange = frameRange(0, count(afterGlobalRange));
  const specs = [
    {kind: 'added-source-video', sourceVideoRange: clone(plan.addition.sourceVideoRange), originalDigestRange: null,
      mediaRef: source.sourceIdentity.sourceVideoRef, outputRange: frameRange(0, plan.addedFrameCount)},
    {kind: 'retained-original-digest', sourceVideoRange: sourceForDigest(parent, beforeRange), originalDigestRange: clone(beforeRange),
      mediaRef: source.sourceIdentity.mediaRef, outputRange: frameRange(plan.addedFrameCount, afterRange.endFrameExclusive)}
  ];
  const physicalPieces = specs.map((piece, index) => {
    const editedGlobalRange = shifted(piece.outputRange, afterGlobalRange.startFrame);
    return {...clone(piece), pieceId: 'q5-2-comparison-piece-' + (index + 1), ordinal: index + 1,
      contentVersion: plan.contentVersion, parentSegmentId: parent.segmentId, editedGlobalRange,
      playback: playback(piece.sourceVideoRange, piece.originalDigestRange, editedGlobalRange, piece.outputRange)};
  });
  require(physicalPieces[0].sourceVideoRange.endFrameExclusive === physicalPieces[1].sourceVideoRange.startFrame,
    'comparison source media is not continuous');
  const mappings = new Map(plan.captionMappings.map(row => [row.captionId, row]));
  const captionMappings = [];
  const elements = plan.normalPlan.elements.filter(caption => contains(afterGlobalRange, captionRange(caption))).map(caption => {
    const edited = {...clone(caption), startFrame: caption.startFrame - afterGlobalRange.startFrame,
      endFrameExclusive: caption.endFrameExclusive - afterGlobalRange.startFrame};
    const mapping = mappings.get(caption.instructionId);
    require((mapping.status === 'added' ? mapping.originalDigestRange === null : contains(beforeRange, mapping.originalDigestRange))
      && edited.displayFrameCount === edited.endFrameExclusive - edited.startFrame,
    'short caption must preserve its complete original display interval');
    captionMappings.push({...clone(mapping), outputRange: captionRange(edited),
      comparisonPieceId: physicalPieces[mapping.status === 'added' ? 0 : 1].pieceId});
    return edited;
  });
  const result = {schemaVersion: 'q5-2-content-comparison-range-v001', sourceIdentity: clone(source.sourceIdentity),
    sourceIdentitySha256: source.sourceIdentitySha256, contentVersion: plan.contentVersion,
    candidateId: plan.candidateId, editPlanSha256: plan.resolutionSha256,
    policyRef: clone(plan.policyRef), boundaryEvidenceRef: clone(plan.boundaryEvidenceRef), sourceEvidenceRef: clone(plan.sourceEvidenceRef),
    addition: clone(plan.addition), addedCaptions: clone(plan.addedCaptions), beforeRange, afterGlobalRange, afterRange,
    commonBodyAfterGlobalRange: shifted(beforeRange, plan.addedFrameCount),
    commonBodyAfterLocalRange: frameRange(plan.addedFrameCount, afterRange.endFrameExclusive),
    frameRate: 30, frameCount: afterRange.endFrameExclusive, addedFrameCount: plan.addedFrameCount,
    playback: {sampleRate: 48000, channels: 2, samplesPerFrame: 1600, sampleCount: afterRange.endFrameExclusive * 1600,
      addedSampleCount: plan.addedFrameCount * 1600},
    normalPlan: {...clone(source.normalPlan), elements}, physicalPieces, captionMappings,
    clocks: {originalSource: SOURCE_CLOCK, before: ORIGINAL_CLOCK, afterGlobal: EDITED_CLOCK, afterLocal: LOCAL_CLOCK,
      playbackSampleRate: 48000, observationSampleRate: 16000,
      rule: 'addition has no old-Digest coordinate; original body shifts once; compare the same body and exit'},
    noCaptionPhaseRestart: true, captionEndpointPolicy: 'short endpoints outside every original caption display interval',
    status: 'unadopted-proposal', humanReviewStatus: 'pending'};
  return freeze({...result, comparisonSha256: hash(result)});
}
