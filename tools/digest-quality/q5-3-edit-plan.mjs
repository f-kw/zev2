/** Q5-3: resolve only the two fixed, verified proposals against their common original once. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isAbsolute} from 'node:path';
import {canonicalJson, canonicalSha256, rational} from './clock.mjs';
import {createQ5EditSourceV001, restoreQ5EditPlanV002, projectQ5ComparisonRangeV002} from './q5-edit-plan.mjs';
import {createQ52EditSourceV001, restoreQ52EditPlanV001, projectQ52ComparisonRangeV001} from './q5-2-edit-plan.mjs';

const clone = structuredClone;
const contexts = new WeakMap();
const ORIGINAL_CLOCK = 'q5-original-c-all-frame-v001';
const EDITED_CLOCK = 'q5-3-edited-content-frame-v001';
const SOURCE_CLOCK = 'q5-3-original-source-frame30-v001';
const LOCAL_CLOCK = 'q5-3-comparison-local-frame-v001';
// Accepted Q5-1/Q5-2 files are the complete production candidate set, not a replaceable registry.
const FIXED_C_ALL = Object.freeze({
  omit: {editPlanSha256: '55b5b00253401fd7ef740aa0f62f0b4ebaa4fa4fd4f4b9461d997d19544d13e5',
    comparisonSha256: 'bb913456eb754f833797665b55712adbd109563fe2b0643338e768d1d8456a78'},
  add: {editPlanSha256: '0a759f79583bc9070f0a0d3365cc4df76aa98c7029c2afdeb89a6c79516d6944',
    comparisonSha256: '377bb98eb2969f331c0490d6d4e950362fea01a436924924eb4221cd4fe312be'}
});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const require = (condition, message) => {if (!condition) throw new TypeError('Q53_EDIT_PLAN_INVALID: ' + message);};
const integer = value => Number.isSafeInteger(value) && value >= 0;
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const frameRange = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const count = range => range.endFrameExclusive - range.startFrame;
const contains = (outer, inner) => outer.startFrame <= inner.startFrame && inner.endFrameExclusive <= outer.endFrameExclusive;
const overlaps = (a, b) => a.startFrame < b.endFrameExclusive && b.startFrame < a.endFrameExclusive;
const intersection = (a, b) => overlaps(a, b) ? frameRange(Math.max(a.startFrame, b.startFrame), Math.min(a.endFrameExclusive, b.endFrameExclusive)) : null;
const shifted = (range, shift) => frameRange(range.startFrame + shift, range.endFrameExclusive + shift);
const digestRange = segment => frameRange(segment.outputStartFrame, segment.outputEndFrame);
const sourceRange = segment => frameRange(segment.sourceStartFrame30, segment.sourceEndFrame30);
const captionRange = caption => frameRange(caption.startFrame, caption.endFrameExclusive);
const sourceForDigest = (segment, range) => shifted(range, segment.sourceStartFrame30 - segment.outputStartFrame);
const payload = ({startFrame, endFrameExclusive, ...unchanged}) => unchanged;
const samples = range => range === null ? null : ({startSample: range.startFrame * 1600, endSampleExclusive: range.endFrameExclusive * 1600});
function freeze(value) {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
}
function exact(value, fields, name) {
  require(object(value) && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field)), name + ' fields differ');
}
function reference(value, name) {
  require(object(value) && Object.keys(value).every(key => ['path', 'bytes', 'fileSha256'].includes(key))
    && isAbsolute(value.path ?? '') && /^[a-f0-9]{64}$/.test(value.fileSha256 ?? '')
    && (value.bytes === undefined || integer(value.bytes)), name + ' must be an absolute byte reference');
  return clone(value);
}
function boundJson(bytesInput, ref, name) {
  require(typeof bytesInput === 'string' || Buffer.isBuffer(bytesInput), name + ' bytes required');
  const bytes = Buffer.from(bytesInput);
  require(createHash('sha256').update(bytes).digest('hex') === ref.fileSha256
    && (ref.bytes === undefined || ref.bytes === bytes.length), name + ' bytes differ from reference');
  return JSON.parse(bytes.toString('utf8'));
}
function sourceData(source) {
  const data = contexts.get(source);
  require(data, 'only a byte-bound common-original Q5-3 source is accepted; derived and serialized plans are not original input');
  return data;
}
function checkedSelection(value) {
  exact(value, ['omit', 'add'], 'selection');
  require(typeof value.omit === 'boolean' && typeof value.add === 'boolean', 'selection must contain exactly two booleans');
  return {omit: value.omit, add: value.add};
}
function playback(sourceVideoRange, originalDigestRange, editedGlobalRange, outputRange = editedGlobalRange) {
  return {sampleRate: 48000, channels: 2, samplesPerFrame: 1600,
    sourceVideoRange: samples(sourceVideoRange), originalDigestRange: samples(originalDigestRange),
    editedGlobalRange: samples(editedGlobalRange), outputRange: samples(outputRange),
    rule: '48k normalized playback coordinates; source-container audio sample indices are not inferred'};
}

/** Reuse both existing validators; their derived clocks never become this resolver's original clock. */
export function createQ53EditSourceV001({sourceInput, candidates, policyRef: inputPolicy}) {
  exact(candidates, ['omit', 'add'], 'fixed candidates');
  const policyRef = reference(inputPolicy, 'Q5-3 received instruction');
  const omitSource = createQ5EditSourceV001(sourceInput), addSource = createQ52EditSourceV001(sourceInput);
  require(same(omitSource.normalPlan, addSource.normalPlan) && same(omitSource.timeline, addSource.timeline)
    && same(omitSource.basisEditPlan, addSource.basisEditPlan)
    && omitSource.sourceIdentity.originalContentVersion === addSource.sourceIdentity.originalContentVersion,
  'the two proposals must share the exact original plan, timeline, retained plan and content version');
  const loaded = {}, candidateIdentity = {};
  for (const role of ['omit', 'add']) {
    const input = candidates[role];
    exact(input, ['editPlanRef', 'editPlanBytes', 'comparisonRef', 'comparisonBytes'], role + ' candidate');
    const editPlanRef = reference(input.editPlanRef, role + ' saved proposal');
    const comparisonRef = reference(input.comparisonRef, role + ' saved comparison');
    const saved = boundJson(input.editPlanBytes, editPlanRef, role + ' saved proposal');
    const comparison = boundJson(input.comparisonBytes, comparisonRef, role + ' saved comparison');
    if (omitSource.sourceIdentity.kind !== 'fixture') require(editPlanRef.fileSha256 === FIXED_C_ALL[role].editPlanSha256
      && comparisonRef.fileSha256 === FIXED_C_ALL[role].comparisonSha256,
    'production candidate or comparison differs from the two accepted fixed files; rebound alternate proposals are forbidden');
    const plan = role === 'omit' ? restoreQ5EditPlanV002({source: omitSource, saved}) : restoreQ52EditPlanV001({source: addSource, saved});
    require(plan.status === 'unadopted-proposal', 'the fixed proposal must be active and unadopted; cancellation records are not candidates');
    const expectedComparison = role === 'omit'
      ? projectQ5ComparisonRangeV002({source: omitSource, resolved: plan, beforeRange: comparison.beforeRange})
      : projectQ52ComparisonRangeV001({source: addSource, resolved: plan, beforeRange: comparison.beforeRange});
    require(same(comparison, expectedComparison), 'saved comparison does not exactly reconstruct from its fixed original proposal');
    candidateIdentity[role] = {candidateId: plan.candidateId, editPlanRef, comparisonRef,
      editPlanResolutionSha256: plan.resolutionSha256, comparisonSha256: comparison.comparisonSha256,
      effect: role === 'omit' ? {mediaOmission: clone(plan.mediaOmission), hiddenCaptionId: plan.hiddenCaptionId,
        parentSegmentId: plan.omittedParentSegmentId, retainedTargetMedia: clone(plan.targetMediaRetention)}
        : {addition: clone(plan.addition), addedCaptions: clone(plan.addedCaptions)}};
    loaded[role] = {plan, comparison};
  }
  require(loaded.omit.plan.candidateId !== loaded.add.plan.candidateId
    && candidateIdentity.omit.editPlanRef.fileSha256 !== candidateIdentity.add.editPlanRef.fileSha256,
  'duplicate proposal identity is forbidden');
  require(loaded.omit.plan.omittedParentSegmentId !== loaded.add.plan.addition.targetSegmentId
    && !overlaps(loaded.omit.comparison.beforeRange, loaded.add.comparison.beforeRange),
  'fixed proposal ownership or comparison ranges overlap; no interacting or alternate proposals are admitted');
  require(!overlaps(loaded.omit.plan.omittedOriginalSourceRange, loaded.add.plan.addition.sourceVideoRange),
    'fixed added and omitted original-source intervals overlap');
  const addedIds = loaded.add.plan.addedCaptions.map(caption => caption.captionId);
  require(new Set(addedIds).size === addedIds.length
    && addedIds.every(id => !omitSource.normalPlan.elements.some(caption => caption.instructionId === id)),
  'added caption IDs collide with original captions or each other');
  const sourceIdentity = {schemaVersion: 'q5-3-common-original-identity-v001',
    originalIdentity: clone(omitSource.sourceIdentity), sourceVideoRef: clone(addSource.sourceIdentity.sourceVideoRef),
    sourceFrameClock: clone(addSource.sourceIdentity.sourceFrameClock)};
  const source = freeze({schemaVersion: 'q5-3-edit-source-context-v001', sourceIdentity,
    sourceIdentitySha256: canonicalSha256(sourceIdentity), candidateIdentity,
    candidateIdentitySha256: canonicalSha256(candidateIdentity), policyRef,
    normalPlan: omitSource.normalPlan, timeline: omitSource.timeline, basisEditPlan: omitSource.basisEditPlan});
  contexts.set(source, loaded);
  return source;
}

/** Every state is derived from the same original intervals. Selection history does not affect the result. */
export function resolveQ53EditPlanV001({source, selection: inputSelection}) {
  const data = sourceData(source), selection = checkedSelection(inputSelection);
  const original = source.sourceIdentity.originalIdentity, omission = selection.omit ? data.omit.plan.mediaOmission : null;
  const addition = selection.add ? data.add.plan.addition : null;
  const removedFrameCount = omission === null ? 0 : count(omission), addedFrameCount = addition === null ? 0 : count(addition.sourceVideoRange);
  const identity = {sourceIdentitySha256: source.sourceIdentitySha256, candidateIdentitySha256: source.candidateIdentitySha256,
    policyRef: source.policyRef, selection};
  const contentVersion = selection.omit || selection.add ? 'q5-3-content-v001-' + canonicalSha256(identity) : original.originalContentVersion;
  const physicalPieces = [], retainedIntervals = [];
  let nextFrame = 0;
  function append(segment, kind, originalDigestRange, sourceVideoRange, candidateId = null) {
    const editedGlobalRange = frameRange(nextFrame, nextFrame + count(sourceVideoRange));
    physicalPieces.push({pieceId: 'q5-3-piece-' + String(physicalPieces.length + 1).padStart(4, '0'),
      ordinal: physicalPieces.length + 1, kind, candidateId, contentVersion, parentSegmentId: segment.segmentId,
      mediaRef: clone(kind === 'added-source-video' ? source.sourceIdentity.sourceVideoRef : original.mediaRef),
      originalDigestRange, sourceVideoRange, editedGlobalRange, outputRange: clone(editedGlobalRange),
      playback: playback(sourceVideoRange, originalDigestRange, editedGlobalRange)});
    nextFrame = editedGlobalRange.endFrameExclusive;
  }
  // Traverse the common original once; split the omission owner and prepend only the addition owner.
  for (const segment of source.timeline.segments) {
    const intervalStart = nextFrame, firstPiece = physicalPieces.length;
    if (addition !== null && segment.segmentId === addition.targetSegmentId) {
      append(segment, 'added-source-video', null, clone(addition.sourceVideoRange), data.add.plan.candidateId);
    }
    const originals = omission !== null && segment.segmentId === data.omit.plan.omittedParentSegmentId
      ? [frameRange(segment.outputStartFrame, omission.startFrame), frameRange(omission.endFrameExclusive, segment.outputEndFrame)]
      : [digestRange(segment)];
    for (const originalDigestRange of originals) {
      require(count(originalDigestRange) > 0, 'fixed omission cannot erase an entire original retained interval');
      append(segment, 'retained-original-digest', originalDigestRange, sourceForDigest(segment, originalDigestRange));
    }
    retainedIntervals.push({segmentId: segment.segmentId, originalDigestRange: digestRange(segment),
      originalSourceVideoRange: sourceRange(segment), editedGlobalRange: frameRange(intervalStart, nextFrame),
      physicalPieceIds: physicalPieces.slice(firstPiece).map(piece => piece.pieceId),
      sourceVideoRanges: physicalPieces.slice(firstPiece).map(piece => clone(piece.sourceVideoRange)),
      addedSourceVideoRange: addition !== null && segment.segmentId === addition.targetSegmentId ? clone(addition.sourceVideoRange) : null,
      omittedOriginalDigestRange: omission !== null && segment.segmentId === data.omit.plan.omittedParentSegmentId ? clone(omission) : null});
  }
  require(nextFrame === original.frameCount - removedFrameCount + addedFrameCount && Number.isSafeInteger(nextFrame * 1600),
    'combined whole-content clock differs from the selected fixed lengths');
  let previousEnd = 0;
  for (const piece of physicalPieces) {
    require(piece.editedGlobalRange.startFrame === previousEnd && count(piece.editedGlobalRange) === count(piece.sourceVideoRange),
      'combined physical pieces have a gap, overlap or changed source duration');
    previousEnd = piece.editedGlobalRange.endFrameExclusive;
  }
  const elements = [], captionMappings = [];
  for (const caption of source.normalPlan.elements) {
    const originalDigestRange = captionRange(caption);
    const owner = source.timeline.segments.find(segment => contains(digestRange(segment), originalDigestRange));
    const hidden = omission !== null && caption.instructionId === data.omit.plan.hiddenCaptionId;
    require(omission === null || !overlaps(originalDigestRange, omission) || hidden,
      'an original non-target caption intersects the selected omission');
    const matches = hidden ? [] : physicalPieces.filter(piece => piece.kind === 'retained-original-digest'
      && piece.parentSegmentId === owner.segmentId && contains(piece.originalDigestRange, originalDigestRange));
    require(hidden || matches.length === 1, 'original caption must belong to exactly one retained piece');
    const piece = matches[0], outputRange = hidden ? null : shifted(originalDigestRange, piece.editedGlobalRange.startFrame - piece.originalDigestRange.startFrame);
    if (!hidden) {
      const edited = {...clone(caption), startFrame: outputRange.startFrame, endFrameExclusive: outputRange.endFrameExclusive};
      assert.deepEqual(payload(edited), payload(caption), 'original caption payload or duration changed'); elements.push(edited);
    }
    captionMappings.push({captionId: caption.instructionId, contentVersion, status: hidden ? 'hidden' : 'retained',
      originalContentVersion: original.originalContentVersion, originalParentSegmentId: owner.segmentId,
      originalDigestRange, sourceVideoRange: sourceForDigest(owner, originalDigestRange),
      editedGlobalRange: outputRange, outputRange: clone(outputRange), retainedPieceId: piece?.pieceId ?? null,
      displayFrameCount: caption.displayFrameCount, unchangedCaptionSha256: canonicalSha256(payload(caption)),
      mediaStatus: hidden ? 'partially-retained' : 'retained'});
  }
  if (addition !== null) {
    const piece = physicalPieces.find(row => row.kind === 'added-source-video');
    for (const evidence of data.add.plan.addedCaptions) {
      const verified = data.add.plan.normalPlan.elements.find(row => row.instructionId === evidence.captionId);
      const outputRange = shifted(evidence.sourceVideoRange, piece.editedGlobalRange.startFrame - piece.sourceVideoRange.startFrame);
      const edited = {...clone(verified), startFrame: outputRange.startFrame, endFrameExclusive: outputRange.endFrameExclusive};
      assert.deepEqual(payload(edited), payload(verified), 'verified added-caption payload changed'); elements.push(edited);
      captionMappings.push({captionId: evidence.captionId, contentVersion, status: 'added', originalContentVersion: null,
        originalParentSegmentId: null, parentSegmentId: addition.targetSegmentId, originalDigestRange: null,
        sourceVideoRange: clone(evidence.sourceVideoRange), editedGlobalRange: outputRange, outputRange: clone(outputRange),
        retainedPieceId: piece.pieceId, displayFrameCount: count(outputRange),
        sourceEvidenceRef: clone(data.add.plan.sourceEvidenceRef), sourceCaptionEvidence: clone(evidence)});
    }
  }
  elements.sort((a, b) => a.startFrame - b.startFrame);
  const normalPlan = {...clone(source.normalPlan), elements};
  const targetMediaRetention = omission === null ? null : (() => {
    const hidden = source.normalPlan.elements.find(caption => caption.instructionId === data.omit.plan.hiddenCaptionId);
    const edges = [frameRange(hidden.startFrame, omission.startFrame), frameRange(omission.endFrameExclusive, hidden.endFrameExclusive)];
    return {captionId: hidden.instructionId, mediaStatus: 'partially-retained', originalDigestRange: captionRange(hidden),
      omittedOriginalDigestRange: clone(omission), retainedEdges: edges.map((originalDigestRange, index) => {
        const piece = physicalPieces.find(row => row.kind === 'retained-original-digest' && contains(row.originalDigestRange, originalDigestRange));
        require(piece, 'target speech edge must remain in its original retained piece');
        const sourceVideoRange = shifted(originalDigestRange, piece.sourceVideoRange.startFrame - piece.originalDigestRange.startFrame);
        const editedGlobalRange = shifted(originalDigestRange, piece.editedGlobalRange.startFrame - piece.originalDigestRange.startFrame);
        return {side: index === 0 ? 'before' : 'after', originalDigestRange, sourceVideoRange, editedGlobalRange,
          playback: playback(sourceVideoRange, originalDigestRange, editedGlobalRange)};
      }), meaning: 'only the selected subtitle is hidden; its two media edges remain; acoustic naturalness is not established'};
  })();
  if (!selection.omit && !selection.add) assert.deepEqual(normalPlan, source.normalPlan, 'clearing both proposals must exactly restore the original Normal plan');
  const result = {schemaVersion: 'q5-3-content-edit-plan-v001', sourceIdentity: clone(source.sourceIdentity),
    sourceIdentitySha256: source.sourceIdentitySha256, candidateIdentity: clone(source.candidateIdentity),
    candidateIdentitySha256: source.candidateIdentitySha256, policyRef: clone(source.policyRef), selection, contentVersion,
    status: selection.omit || selection.add ? 'unadopted-proposal' : 'original-content-restored',
    clock: selection.omit || selection.add ? EDITED_CLOCK : ORIGINAL_CLOCK,
    frameRate: 30, frameCount: nextFrame, originalFrameCount: original.frameCount, removedFrameCount, addedFrameCount,
    originalCaptionCount: original.captionCount, captionCount: elements.length,
    hiddenCaptionIds: captionMappings.filter(row => row.status === 'hidden').map(row => row.captionId),
    addedCaptionIds: captionMappings.filter(row => row.status === 'added').map(row => row.captionId),
    mediaOmission: omission === null ? null : {originalDigestRange: clone(omission),
      sourceVideoRange: clone(data.omit.plan.omittedOriginalSourceRange), editedGlobalRange: null, outputRange: null, status: 'omitted-no-output'},
    addition: clone(addition), targetMediaRetention, normalPlan, physicalPieces, retainedIntervals, captionMappings,
    playback: {sampleRate: 48000, channels: 2, samplesPerFrame: 1600, sampleCount: nextFrame * 1600,
      addedSampleCount: addedFrameCount * 1600, removedSampleCount: removedFrameCount * 1600},
    observation: {sampleRate: 16000, endSampleExclusive: rational(BigInt(nextFrame) * 16000n, 30),
      rule: 'exact rational observation clock only; never substitute observation samples for playback samples'},
    connections: physicalPieces.slice(1).map((piece, index) => ({beforePieceId: physicalPieces[index].pieceId,
      afterPieceId: piece.pieceId, atOutputFrame: piece.editedGlobalRange.startFrame, transition: 'normal-cut',
      sourceContinuity: piece.parentSegmentId !== physicalPieces[index].parentSegmentId ? 'original-scene-change'
        : piece.sourceVideoRange.startFrame === physicalPieces[index].sourceVideoRange.endFrameExclusive ? 'continuous-source' : 'selected-omitted-source-gap'})),
    clocks: {originalSource: SOURCE_CLOCK, originalDigest: ORIGINAL_CLOCK,
      editedGlobal: selection.omit || selection.add ? EDITED_CLOCK : ORIGINAL_CLOCK,
      playbackSampleRate: 48000, observationSampleRate: 16000},
    invariants: {derivation: 'one traversal of common original retained intervals; never project one derived plan through the other',
      sharedBoundary: 'map complete owned intervals; the previous interval end and next body start are distinct roles',
      cancellation: 'selection false removes the corresponding media operation and caption operation together',
      proposalScope: 'only the two fixed byte-bound candidates; no arbitrary edits or replacement candidate selection',
      wholeContentMedia: 'plan only; no full movie is claimed', humanReview: 'pending; previous answers are not transferred'}};
  return freeze({...result, resolutionSha256: canonicalSha256(result)});
}

export function restoreQ53EditPlanV001({source, saved}) {
  sourceData(source);
  require(object(saved) && saved.schemaVersion === 'q5-3-content-edit-plan-v001', 'saved content must use the Q5-3 schema; prior plans are not converted');
  require(same(saved.sourceIdentity, source.sourceIdentity) && saved.sourceIdentitySha256 === source.sourceIdentitySha256
    && same(saved.candidateIdentity, source.candidateIdentity) && saved.candidateIdentitySha256 === source.candidateIdentitySha256
    && same(saved.policyRef, source.policyRef), 'saved common original, fixed candidates or policy differ');
  const expected = resolveQ53EditPlanV001({source, selection: saved.selection});
  require(same(saved, expected), 'saved plan does not exactly reconstruct; tampering or double projection rejected');
  return expected;
}

/** Localize the selected candidate's fixed window from the combined state, for old-short equivalence checks. */
export function projectQ53ComparisonRangeV001({source, resolved, candidateId}) {
  const data = sourceData(source), plan = restoreQ53EditPlanV001({source, saved: resolved});
  const role = ['omit', 'add'].find(key => data[key].plan.candidateId === candidateId);
  require(role && plan.selection[role], 'comparison requires one of the two selected fixed candidate IDs');
  const previous = data[role].comparison, beforeRange = clone(previous.beforeRange);
  const selected = [];
  for (const piece of plan.physicalPieces) {
    if (piece.kind === 'added-source-video') {
      if (role === 'add') selected.push(clone(piece));
      continue;
    }
    const originalDigestRange = intersection(piece.originalDigestRange, beforeRange);
    if (originalDigestRange === null) continue;
    const sourceVideoRange = shifted(originalDigestRange, piece.sourceVideoRange.startFrame - piece.originalDigestRange.startFrame);
    const editedGlobalRange = shifted(originalDigestRange, piece.editedGlobalRange.startFrame - piece.originalDigestRange.startFrame);
    selected.push({...clone(piece), originalDigestRange, sourceVideoRange, editedGlobalRange});
  }
  require(selected.length === 2, 'fixed candidate comparison must have exactly its two physical pieces');
  const newGlobalRange = frameRange(selected[0].editedGlobalRange.startFrame, selected.at(-1).editedGlobalRange.endFrameExclusive);
  let nextFrame = 0;
  const physicalPieces = selected.map((piece, index) => {
    const outputRange = frameRange(nextFrame, nextFrame + count(piece.sourceVideoRange));
    require(piece.editedGlobalRange.startFrame === newGlobalRange.startFrame + nextFrame, 'comparison contains a combined-clock gap or overlap');
    nextFrame = outputRange.endFrameExclusive;
    return {...piece, pieceId: 'q5-3-comparison-' + candidateId + '-' + (index + 1), ordinal: index + 1,
      outputRange, playback: playback(piece.sourceVideoRange, piece.originalDigestRange, piece.editedGlobalRange, outputRange)};
  });
  require(nextFrame === previous.frameCount && nextFrame === count(newGlobalRange), 'fixed local comparison duration differs');
  const mappings = new Map(plan.captionMappings.map(mapping => [mapping.captionId, mapping]));
  const captionMappings = [];
  const elements = plan.normalPlan.elements.filter(caption => overlaps(captionRange(caption), newGlobalRange)).map(caption => {
    require(contains(newGlobalRange, captionRange(caption)), 'fixed comparison endpoint cuts a caption');
    const outputRange = shifted(captionRange(caption), -newGlobalRange.startFrame), full = mappings.get(caption.instructionId);
    const piece = physicalPieces.find(row => contains(row.editedGlobalRange, captionRange(caption)));
    require(piece, 'comparison caption does not belong to a selected physical piece');
    captionMappings.push({...clone(full), outputRange, comparisonPieceId: piece.pieceId});
    return {...clone(caption), startFrame: outputRange.startFrame, endFrameExclusive: outputRange.endFrameExclusive};
  });
  const normalPlan = {...clone(source.normalPlan), elements};
  const result = {schemaVersion: 'q5-3-content-comparison-range-v001', sourceIdentitySha256: source.sourceIdentitySha256,
    candidateIdentitySha256: source.candidateIdentitySha256, selection: clone(plan.selection), candidateId,
    contentVersion: plan.contentVersion, editPlanSha256: plan.resolutionSha256,
    originalEditPlanRef: clone(source.candidateIdentity[role].editPlanRef),
    originalComparisonRef: clone(source.candidateIdentity[role].comparisonRef),
    originalComparisonSha256: previous.comparisonSha256, originalCandidateContentVersion: previous.contentVersion,
    beforeRange, newGlobalRange, afterGlobalRange: clone(newGlobalRange), afterRange: frameRange(0, nextFrame),
    frameRate: 30, frameCount: nextFrame, normalPlan, physicalPieces, captionMappings,
    hiddenCaptionIds: role === 'omit' ? clone(plan.hiddenCaptionIds) : [],
    addedCaptionIds: role === 'add' ? clone(plan.addedCaptionIds) : [],
    localNormalMatchesOriginalComparison: same(normalPlan, previous.normalPlan),
    clocks: {originalSource: SOURCE_CLOCK, before: ORIGINAL_CLOCK, afterGlobal: EDITED_CLOCK, afterLocal: LOCAL_CLOCK,
      playbackSampleRate: 48000, observationSampleRate: 16000},
    status: 'unadopted-proposal', humanReviewStatus: 'pending'};
  return freeze({...result, comparisonSha256: canonicalSha256(result)});
}
