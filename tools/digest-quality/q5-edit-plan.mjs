/** A separate, unadopted content version. Existing caption/rendering contracts stay unchanged. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isAbsolute} from 'node:path';
import {canonicalJson} from './clock.mjs';
import {C_ALL_IDENTITY} from './q4-c-all-input.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const hash = value => sha(canonicalJson(value));
const clone = structuredClone;
const sourceContexts = new WeakSet();
const SOURCE_CLOCK = 'q5-original-c-all-frame-v001';
const EDITED_CLOCK = 'q5-edited-content-frame-v002';
const HIDDEN_CAPTION_ID = 'digest-v1-phase2-20260913-v001-bridge-caption-000121';
const HIDDEN_CAPTION_TEXT = 'このドスンと落ちていくんですこれ';
// The user's v002 instruction sets this editing margin; it is not a measurement tolerance.
const RETENTION_POLICY = freeze({schemaVersion: 'q5-retain-first-policy-v002',
  minimumRetainedFramesBefore: 6, minimumRetainedFramesAfter: 6,
  meaning: 'user-selected editing margin; retain more when supported by saved observations; not an ASR error bound or proof of natural sound'});
const BASIS_SHA = '0c501519ff3302abedb6d14bf5d27c33abc2a2a63ad295c1086f4d4533b8eb8d';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const require = (condition, message) => {if (!condition) throw new TypeError('Q5_EDIT_PLAN_INVALID: ' + message);};
const exact = (value, fields, name) => require(object(value)
  && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field)), name + ' fields differ');
const integer = value => Number.isSafeInteger(value) && value >= 0;
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
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
  require(sha(bytes) === ref.fileSha256, name + ' bytes differ from reference');
  if (Object.hasOwn(ref, 'bytes')) require(bytes.length === ref.bytes, name + ' byte count differs');
  return JSON.parse(bytes.toString('utf8'));
}
function range(value, limit, name) {
  exact(value, ['startFrame', 'endFrameExclusive'], name);
  require(integer(value.startFrame) && integer(value.endFrameExclusive)
    && value.startFrame < value.endFrameExclusive && value.endFrameExclusive <= limit, name + ' must be a positive half-open frame interval');
  return clone(value);
}
const frameRange = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const sampleRange = (value, scale) => ({startSample: value.startFrame * scale,
  endSampleExclusive: value.endFrameExclusive * scale});
function rationalFrameSample(frame) {
  const numerator = BigInt(frame) * 1600n;
  return numerator % 3n === 0n ? {numerator: String(numerator / 3n), denominator: '1'}
    : {numerator: String(numerator), denominator: '3'};
}
const observationRange = value => ({startSample: rationalFrameSample(value.startFrame),
  endSampleExclusive: rationalFrameSample(value.endFrameExclusive)});
const duration = value => value.endFrameExclusive - value.startFrame;
const overlaps = (a, b) => a.startFrame < b.endFrameExclusive && a.endFrameExclusive > b.startFrame;
const contains = (outer, inner) => outer.startFrame <= inner.startFrame && inner.endFrameExclusive <= outer.endFrameExclusive;
const segmentRange = segment => frameRange(segment.outputStartFrame, segment.outputEndFrame);
const captionRange = caption => frameRange(caption.startFrame, caption.endFrameExclusive);
const withoutTime = caption => {
  const {startFrame, endFrameExclusive, ...unchanged} = caption;
  return unchanged;
};
function originalSourceRange(segment, originalRange) {
  return frameRange(segment.sourceStartFrame30 + originalRange.startFrame - segment.outputStartFrame,
    segment.sourceStartFrame30 + originalRange.endFrameExclusive - segment.outputStartFrame);
}
function assertSource(source) {
  require(sourceContexts.has(source), 'only a byte-bound original source context is accepted; derived or serialized content is not original input');
}

/** JSON references are verified here. The renderer must separately verify the media file bytes. */
export function createQ5EditSourceV001({originalContentVersion, basisEditPlanRef, planRef, timelineRef,
  mediaRef, basisEditPlanBytes, planBytes, timelineBytes, fixture = false}) {
  require(typeof originalContentVersion === 'string' && originalContentVersion.trim().length > 0, 'original content version required');
  require(typeof fixture === 'boolean' && (!fixture || originalContentVersion.startsWith('fixture-')), 'fixtures require an explicit fixture content version');
  const refs = {basisEditPlanRef: reference(basisEditPlanRef, 'original edit plan'),
    planRef: reference(planRef, 'original Normal plan'), timelineRef: reference(timelineRef, 'original timeline'),
    mediaRef: reference(mediaRef, 'original subtitle-free media')};
  const basisEditPlan = boundJson(basisEditPlanBytes, refs.basisEditPlanRef, 'original edit plan');
  const normalPlan = boundJson(planBytes, refs.planRef, 'original Normal plan');
  const timeline = boundJson(timelineBytes, refs.timelineRef, 'original timeline');
  require(basisEditPlan.schemaVersion === 'candidate-digest-edit-plan-v001'
    && normalPlan.schemaVersion === 'presentation-output-common-core-plan-v001'
    && timeline.schemaVersion === 'presentation-base-media-timeline-v003', 'original schema differs; an edited plan cannot be projected twice');
  require(normalPlan.canvas?.fps === 30 && timeline.baseMedia?.frameRate === '30/1'
    && timeline.baseMedia.fileSha256 === refs.mediaRef.fileSha256, 'original frame clock or media binding differs');
  const frameCount = timeline.baseMedia.expectedFrameCount;
  require(integer(frameCount) && frameCount > 0 && Number.isSafeInteger(frameCount * 1600), 'original frame count is invalid');
  require(Array.isArray(timeline.segments) && timeline.segments.length > 0
    && Array.isArray(basisEditPlan.segments) && basisEditPlan.segments.length === timeline.segments.length,
  'original retained intervals differ');
  let end = 0, previousSourceEnd = 0;
  for (const [index, segment] of timeline.segments.entries()) {
    require(segment.segmentId === 'segment-' + String(index + 1).padStart(4, '0')
      && integer(segment.sourceStartFrame30) && integer(segment.sourceEndFrame30)
      && segment.sourceEndFrame30 > segment.sourceStartFrame30
      && segment.outputStartFrame === end && integer(segment.outputEndFrame)
      && segment.sourceEndFrame30 - segment.sourceStartFrame30 === segment.outputEndFrame - segment.outputStartFrame
      && segment.sourceStartFrame30 >= previousSourceEnd, 'original retained frame order or duration differs');
    const original = basisEditPlan.segments[index];
    require(original.segmentId === segment.segmentId && original.sourceStartMs === segment.sourceStartMs
      && original.sourceEndMs === segment.sourceEndMs, 'original edit-plan interval and timeline differ');
    end = segment.outputEndFrame; previousSourceEnd = segment.sourceEndFrame30;
  }
  require(end === frameCount, 'original retained intervals do not cover the full clock');
  require(Array.isArray(normalPlan.elements) && normalPlan.elements.length > 0, 'original Normal captions required');
  const ids = new Set(); let previousStart = 0;
  for (const caption of normalPlan.elements) {
    const interval = range(captionRange(caption), frameCount, 'original caption');
    require(caption.kind === 'speech-caption' && typeof caption.instructionId === 'string'
      && caption.instructionId.length > 0 && !ids.has(caption.instructionId)
      && interval.startFrame >= previousStart && caption.displayFrameCount === duration(interval)
      && typeof caption.text === 'string' && Array.isArray(caption.indexedLines)
      && object(caption.visualState) && object(caption.transition)
      && !['presentationColorRange', 'presentationPulse', 'presentationMotion'].some(key => Object.hasOwn(caption, key)),
    'original caption identity, order, full display duration or Normal appearance differs');
    require(timeline.segments.filter(segment => contains(segmentRange(segment), interval)).length === 1,
      'original caption crosses a retained interval');
    ids.add(caption.instructionId); previousStart = interval.startFrame;
  }
  if (!fixture) {
    require(refs.basisEditPlanRef.fileSha256 === BASIS_SHA
      && refs.planRef.fileSha256 === C_ALL_IDENTITY.baselinePlanSha256
      && refs.timelineRef.fileSha256 === C_ALL_IDENTITY.timelineSha256
      && refs.mediaRef.fileSha256 === C_ALL_IDENTITY.baseMediaSha256,
    'C-all original byte identity differs; a Q4 effect or new content version cannot replace the original');
    require(frameCount === C_ALL_IDENTITY.frameCount && normalPlan.elements.length === C_ALL_IDENTITY.captionCount
      && timeline.segments.length === C_ALL_IDENTITY.segmentCount
      && normalPlan.elements.every(caption => caption.visualState.textStyle.fontSizePx === 94), 'C-all original counts or Normal 94px differ');
  }
  const identity = {schemaVersion: 'q5-original-content-identity-v001', kind: fixture ? 'fixture' : 'c-all',
    originalContentVersion, ...refs, frameRate: 30, frameCount, captionCount: normalPlan.elements.length,
    retainedIntervalCount: timeline.segments.length, playbackSampleRate: 48000, playbackChannels: 2,
    observationSampleRate: 16000, observationRule: 'exact-rational-frame-boundaries; observation samples are not playback samples'};
  const source = freeze({schemaVersion: 'q5-edit-source-context-v001', sourceIdentity: identity,
    sourceIdentitySha256: hash(identity), normalPlan, timeline, basisEditPlan});
  sourceContexts.add(source);
  return source;
}

function resolve(source, omissionInput, hiddenCaptionId, candidateId, policyRefInput, boundaryEvidenceRefInput) {
  assertSource(source);
  require(typeof candidateId === 'string' && candidateId.trim().length > 0, 'candidate ID required');
  const policyRef = reference(policyRefInput, 'received content-edit policy');
  const boundaryEvidenceRef = reference(boundaryEvidenceRefInput, 'saved retain-first boundary evidence');
  require(omissionInput !== undefined && hiddenCaptionId !== undefined,
    'media omission and hidden caption must both be explicit; use two nulls for cancellation');
  require((omissionInput === null) === (hiddenCaptionId === null),
    'cancellation must release media omission and caption hiding together');
  const omission = omissionInput === null ? null : range(omissionInput, source.sourceIdentity.frameCount, 'media omission');
  const hiddenCaption = omission === null ? null : source.normalPlan.elements.find(caption => caption.instructionId === hiddenCaptionId);
  require(omission === null || (hiddenCaptionId === HIDDEN_CAPTION_ID && hiddenCaption?.text === HIDDEN_CAPTION_TEXT),
    'only the selected Q5-1 caption 121 may be hidden; arbitrary caption cutting is forbidden');
  require(omission === null || (contains(captionRange(hiddenCaption), omission)
    && omission.startFrame - hiddenCaption.startFrame >= RETENTION_POLICY.minimumRetainedFramesBefore
    && hiddenCaption.endFrameExclusive - omission.endFrameExclusive >= RETENTION_POLICY.minimumRetainedFramesAfter),
    'media omission must be inside the selected caption and retain at least six frames on each side');
  const parent = omission === null ? null : source.timeline.segments.find(segment =>
    segment.outputStartFrame < omission.startFrame && omission.endFrameExclusive < segment.outputEndFrame);
  require(omission === null || parent, 'one omission strictly inside one original retained interval is required');
  const removedFrames = omission === null ? 0 : duration(omission);
  const versionInput = {sourceIdentity: source.sourceIdentity, sourceIdentitySha256: source.sourceIdentitySha256,
    candidateId, policyRef, boundaryEvidenceRef, mediaOmission: omission, hiddenCaptionId,
    retentionPolicy: RETENTION_POLICY,
    operation: 'v002-retain-first-single-media-omission; hide-only-selected-caption-121; retain-Normal; normal-cut; no-adoption'};
  const contentVersion = omission === null ? source.sourceIdentity.originalContentVersion : 'q5-content-v002-' + hash(versionInput);
  const retainedPieces = [];
  let nextOutputFrame = 0;
  for (const [parentIndex, segment] of source.timeline.segments.entries()) {
    const ranges = segment === parent ? [frameRange(segment.outputStartFrame, omission.startFrame),
      frameRange(omission.endFrameExclusive, segment.outputEndFrame)] : [segmentRange(segment)];
    for (const [childIndex, originalRange] of ranges.entries()) {
      const outputRange = frameRange(nextOutputFrame, nextOutputFrame + duration(originalRange));
      const sourceRange = originalSourceRange(segment, originalRange);
      retainedPieces.push({pieceId: 'q5-piece-' + String(retainedPieces.length + 1).padStart(4, '0'), contentVersion,
        ordinal: retainedPieces.length + 1, parentSegmentId: segment.segmentId, parentOrdinal: parentIndex + 1,
        childOrdinal: childIndex + 1, parentChildCount: ranges.length, originalRange, originalSourceRange: sourceRange,
        outputRange, playback: {sampleRate: 48000, channels: 2, originalRange: sampleRange(originalRange, 1600),
          originalSourceRange: sampleRange(sourceRange, 1600), outputRange: sampleRange(outputRange, 1600)},
        observation: {sampleRate: 16000, originalRange: observationRange(originalRange),
          outputRange: observationRange(outputRange), rule: 'rational-boundaries-only; do-not-use-as-playback-samples'}});
      nextOutputFrame = outputRange.endFrameExclusive;
    }
  }
  require(nextOutputFrame === source.sourceIdentity.frameCount - removedFrames, 'resolved whole-content clock differs');
  const targetMediaRetention = omission === null ? null : {
    captionId: hiddenCaptionId, status: 'partially-retained', originalRange: captionRange(hiddenCaption),
    originalSourceRange: originalSourceRange(parent, captionRange(hiddenCaption)),
    mediaOmission: clone(omission), omittedOriginalSourceRange: originalSourceRange(parent, omission),
    retainedBeforeRange: frameRange(hiddenCaption.startFrame, omission.startFrame),
    retainedAfterRange: frameRange(omission.endFrameExclusive, hiddenCaption.endFrameExclusive),
    retainedFramesBefore: omission.startFrame - hiddenCaption.startFrame,
    retainedFramesAfter: hiddenCaption.endFrameExclusive - omission.endFrameExclusive,
    outputClock: EDITED_CLOCK,
    retainedPieces: [frameRange(hiddenCaption.startFrame, omission.startFrame),
      frameRange(omission.endFrameExclusive, hiddenCaption.endFrameExclusive)].map((originalRange, index) => {
      const piece = retainedPieces.find(item => contains(item.originalRange, originalRange));
      require(piece, 'retained target media must belong to a retained original piece');
      const shift = piece.outputRange.startFrame - piece.originalRange.startFrame;
      const outputRange = frameRange(originalRange.startFrame + shift, originalRange.endFrameExclusive + shift);
      return {side: index === 0 ? 'before' : 'after', originalRange,
        originalSourceRange: originalSourceRange(parent, originalRange), outputRange, retainedPieceId: piece.pieceId,
        playback: {sampleRate: 48000, channels: 2, originalRange: sampleRange(originalRange, 1600),
          outputRange: sampleRange(outputRange, 1600)}};
    }),
    meaning: 'caption is hidden; its two edge media ranges remain; naturalness is not established'};
  const elements = [], captionMappings = [];
  for (const caption of source.normalPlan.elements) {
    const originalRange = captionRange(caption);
    const hidden = omission !== null && caption.instructionId === hiddenCaptionId;
    require(omission === null || !overlaps(originalRange, omission) || hidden,
      'media omission intersects a non-target caption; every other caption must remain complete');
    const originalSegment = source.timeline.segments.find(segment => contains(segmentRange(segment), originalRange));
    const piece = hidden ? null : retainedPieces.find(item => contains(item.originalRange, originalRange));
    require(hidden || piece, 'retained caption does not belong to exactly one retained piece');
    const shift = hidden ? null : piece.outputRange.startFrame - piece.originalRange.startFrame;
    const outputRange = hidden ? null : frameRange(originalRange.startFrame + shift, originalRange.endFrameExclusive + shift);
    if (!hidden) {
      const edited = {...clone(caption), startFrame: outputRange.startFrame, endFrameExclusive: outputRange.endFrameExclusive};
      assert.deepEqual(withoutTime(edited), withoutTime(caption), 'remaining caption text, lines, duration, visual state or transition changed');
      elements.push(edited);
    }
    captionMappings.push({captionId: caption.instructionId, contentVersion,
      originalContentVersion: source.sourceIdentity.originalContentVersion, status: hidden ? 'hidden' : 'retained',
      originalRange, originalSourceRange: originalSourceRange(originalSegment, originalRange), outputRange,
      originalParentSegmentId: originalSegment.segmentId, retainedPieceId: piece?.pieceId ?? null,
      mediaStatus: hidden ? 'partially-retained' : 'retained',
      targetMediaRetention: hidden ? clone(targetMediaRetention) : null,
      displayFrameCount: caption.displayFrameCount, unchangedCaptionSha256: hash(withoutTime(caption))});
  }
  const normalPlan = {...clone(source.normalPlan), elements};
  if (omission === null) assert.deepEqual(normalPlan, source.normalPlan, 'content cancellation must exactly restore the original Normal plan');
  const result = {schemaVersion: 'q5-content-edit-plan-v002', sourceIdentity: clone(source.sourceIdentity),
    sourceIdentitySha256: source.sourceIdentitySha256, contentVersion, candidateId, policyRef, boundaryEvidenceRef,
    mediaOmission: omission, hiddenCaptionId, retentionPolicy: clone(RETENTION_POLICY), targetMediaRetention,
    status: omission === null ? 'original-content-restored' : 'unadopted-proposal',
    clock: omission === null ? SOURCE_CLOCK : EDITED_CLOCK,
    frameRate: 30, frameCount: nextOutputFrame, removedFrameCount: removedFrames,
    playback: {sampleRate: 48000, channels: 2, sampleCount: nextOutputFrame * 1600, removedSampleCount: removedFrames * 1600},
    observation: {sampleRate: 16000, endSampleExclusive: rationalFrameSample(nextOutputFrame),
      removedDurationSamples: rationalFrameSample(removedFrames), rule: 'exact-rational-duration; no-decoder-tail-or-playback-sample-substitution'},
    normalPlan, retainedPieces, captionMappings,
    hiddenCaptionIds: captionMappings.filter(row => row.status === 'hidden').map(row => row.captionId),
    retainedCaptionIds: captionMappings.filter(row => row.status === 'retained').map(row => row.captionId),
    omittedOriginalSourceRange: parent === null ? null : originalSourceRange(parent, omission),
    omittedParentSegmentId: parent?.segmentId ?? null,
    connections: retainedPieces.slice(1).map((piece, index) => ({beforePieceId: retainedPieces[index].pieceId,
      afterPieceId: piece.pieceId, atOutputFrame: piece.outputRange.startFrame, transition: 'normal-cut',
      newlyCreatedByOmission: piece.parentSegmentId === retainedPieces[index].parentSegmentId})),
    invariants: {remainingCaptions: 'all fields except start/end frames exactly preserved',
      projection: 'derive only from bound original inputs; subtract omission duration exactly once',
      cancellation: 'restore original content, captions and clocks; separate from presentation Reset',
      hiddenCaption: 'only selected caption 121 hidden; corresponding edge media retained; no replacement caption',
      earlierEffectsOverridesAndReviews: 'not-imported; same IDs do not transfer between content versions',
      baseMedia: 'original media reference only; no newly manufactured whole-content media is claimed'}};
  return freeze({...result, resolutionSha256: hash(result)});
}

export function resolveQ5EditPlanV002({source, mediaOmission, hiddenCaptionId, candidateId, policyRef, boundaryEvidenceRef}) {
  return resolve(source, mediaOmission, hiddenCaptionId, candidateId, policyRef, boundaryEvidenceRef);
}

/** Recompute saved content from bound originals, including all source and policy identities. */
export function restoreQ5EditPlanV002({source, saved}) {
  assertSource(source);
  require(object(saved) && saved.schemaVersion === 'q5-content-edit-plan-v002', 'saved edit schema must be v002; old plans are not converted');
  require(same(saved.sourceIdentity, source.sourceIdentity)
    && saved.sourceIdentitySha256 === source.sourceIdentitySha256, 'saved content belongs to a different original source');
  const expected = resolve(source, saved.mediaOmission, saved.hiddenCaptionId, saved.candidateId, saved.policyRef, saved.boundaryEvidenceRef);
  require(same(saved, expected), 'saved content does not exactly reconstruct; altered, stale or twice-projected plan rejected');
  return expected;
}

/** A typed point cannot be reused as an original point after projection. Caption ends use interval mapping. */
export function mapQ5OriginalPointV002({source, resolved, point}) {
  const plan = restoreQ5EditPlanV002({source, saved: resolved});
  exact(point, ['clock', 'sourceIdentitySha256', 'frame'], 'original point');
  require(point.clock === SOURCE_CLOCK && point.sourceIdentitySha256 === source.sourceIdentitySha256
    && integer(point.frame) && point.frame <= source.sourceIdentity.frameCount, 'point clock or source differs; double projection rejected');
  const omitted = plan.mediaOmission !== null && point.frame >= plan.mediaOmission.startFrame && point.frame < plan.mediaOmission.endFrameExclusive;
  const frame = omitted ? null : point.frame - (plan.mediaOmission !== null && point.frame >= plan.mediaOmission.endFrameExclusive ? plan.removedFrameCount : 0);
  return freeze({clock: plan.clock, contentVersion: plan.contentVersion,
    sourceIdentitySha256: source.sourceIdentitySha256, originalFrame: point.frame, frame,
    status: omitted ? 'omitted-no-output' : 'mapped'});
}

/** A short Normal plan is admitted only when neither endpoint cuts a caption's display clock. */
export function projectQ5ComparisonRangeV002({source, resolved, beforeRange: inputRange}) {
  const plan = restoreQ5EditPlanV002({source, saved: resolved});
  require(plan.mediaOmission !== null, 'a comparison requires an active omission proposal');
  const beforeRange = range(inputRange, source.sourceIdentity.frameCount, 'Before range');
  require(beforeRange.startFrame < plan.mediaOmission.startFrame && plan.mediaOmission.endFrameExclusive < beforeRange.endFrameExclusive,
    'Before range must include context on both sides of the omission');
  const parent = source.timeline.segments.find(segment => contains(segmentRange(segment), beforeRange));
  require(parent?.segmentId === plan.omittedParentSegmentId, 'comparison must stay inside the same original retained interval');
  for (const caption of source.normalPlan.elements) {
    const interval = captionRange(caption);
    require(!overlaps(interval, beforeRange) || contains(beforeRange, interval), 'short range endpoint cuts a caption display clock');
  }
  const afterGlobalRange = frameRange(beforeRange.startFrame, beforeRange.endFrameExclusive - plan.removedFrameCount);
  const afterRange = frameRange(0, duration(afterGlobalRange));
  const originals = [frameRange(beforeRange.startFrame, plan.mediaOmission.startFrame),
    frameRange(plan.mediaOmission.endFrameExclusive, beforeRange.endFrameExclusive)];
  let end = 0;
  const pieces = originals.map((originalRange, index) => {
    const outputRange = frameRange(end, end + duration(originalRange)); end = outputRange.endFrameExclusive;
    const editedGlobalRange = frameRange(outputRange.startFrame + afterGlobalRange.startFrame,
      outputRange.endFrameExclusive + afterGlobalRange.startFrame);
    return {pieceId: 'q5-comparison-piece-' + (index + 1), ordinal: index + 1, contentVersion: plan.contentVersion,
      parentSegmentId: parent.segmentId, originalRange, originalSourceRange: originalSourceRange(parent, originalRange),
      outputRange, editedGlobalRange, playback: {sampleRate: 48000, channels: 2,
        originalRange: sampleRange(originalRange, 1600), outputRange: sampleRange(outputRange, 1600)},
      observation: {sampleRate: 16000, originalRange: observationRange(originalRange), outputRange: observationRange(outputRange)}};
  });
  require(end === afterRange.endFrameExclusive, 'short original media pieces differ from edited length');
  const elements = plan.normalPlan.elements.filter(caption => contains(afterGlobalRange, captionRange(caption)))
    .map(caption => ({...clone(caption), startFrame: caption.startFrame - afterGlobalRange.startFrame,
      endFrameExclusive: caption.endFrameExclusive - afterGlobalRange.startFrame}));
  const mappingById = new Map(plan.captionMappings.map(row => [row.captionId, row]));
  const captionMappings = elements.map(caption => {
    const full = mappingById.get(caption.instructionId);
    const piece = pieces.find(item => contains(item.originalRange, full.originalRange));
    require(piece && caption.displayFrameCount === caption.endFrameExclusive - caption.startFrame,
      'short caption clock or original media membership differs');
    const original = source.normalPlan.elements.find(item => item.instructionId === caption.instructionId);
    assert.deepEqual(withoutTime(caption), withoutTime(original), 'short projection changed caption content, display duration or appearance');
    return {...clone(full), editedGlobalRange: clone(full.outputRange), outputRange: captionRange(caption),
      comparisonPieceId: piece.pieceId};
  });
  const targetMediaRetention = {...clone(plan.targetMediaRetention), outputClock: 'q5-comparison-local-frame-v002',
    retainedPieces: plan.targetMediaRetention.retainedPieces.map(piece => {
      const outputRange = frameRange(piece.outputRange.startFrame - afterGlobalRange.startFrame,
        piece.outputRange.endFrameExclusive - afterGlobalRange.startFrame);
      return {...clone(piece), editedGlobalRange: clone(piece.outputRange), outputRange,
        playback: {...clone(piece.playback), outputRange: sampleRange(outputRange, 1600)}};
    })};
  const hiddenCaptionMappings = plan.captionMappings.filter(row => row.status === 'hidden')
    .map(row => ({...clone(row), targetMediaRetention: clone(targetMediaRetention)}));
  const result = {schemaVersion: 'q5-content-comparison-range-v002', sourceIdentity: clone(source.sourceIdentity),
    sourceIdentitySha256: source.sourceIdentitySha256, contentVersion: plan.contentVersion, candidateId: plan.candidateId,
    editPlanSha256: plan.resolutionSha256, mediaOmission: clone(plan.mediaOmission),
    hiddenCaptionId: plan.hiddenCaptionId, hiddenCaptionIds: clone(plan.hiddenCaptionIds),
    policyRef: clone(plan.policyRef), boundaryEvidenceRef: clone(plan.boundaryEvidenceRef),
    retentionPolicy: clone(plan.retentionPolicy), targetMediaRetention, beforeRange, afterGlobalRange, afterRange,
    frameRate: 30, frameCount: afterRange.endFrameExclusive, normalPlan: {...clone(source.normalPlan), elements}, pieces,
    captionMappings, hiddenCaptionMappings,
    clocks: {before: SOURCE_CLOCK, afterGlobal: EDITED_CLOCK, afterLocal: 'q5-comparison-local-frame-v002',
      playbackSampleRate: 48000, observationSampleRate: 16000,
      rule: 'two ordered original ranges; no single offset crosses the omitted interval'},
    noCaptionPhaseRestart: true, captionEndpointPolicy: 'both short endpoints outside every caption display interval'};
  return freeze({...result, comparisonSha256: hash(result)});
}
