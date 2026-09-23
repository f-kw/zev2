/** Saved timing arithmetic only: no media observation, readability judgment or edits. */
import {canonicalSha256} from './clock.mjs';

const fail = (condition, message) => {
  if (!condition) throw new TypeError('Q3_SAVED_DIGEST_TIMING_INVALID: ' + message);
};
const natural = value => Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const frameCount = value => value.endFrameExclusive - value.startFrame;

/** The caller binds actual file bytes separately. This function checks the saved
 * instruction-to-timeline canonical binding and the supported 60 -> 30 fps clock. */
export function summarizeQ3SavedDigestTimingV001({instruction, timeline, expectedFrameCount, fps}) {
  fail(fps === 30 && natural(expectedFrameCount) && expectedFrameCount > 0, 'expected 30 fps and a positive frame count');
  fail(instruction?.schemaVersion === 'presentation-instruction-artifact-v002'
    && instruction.artifactKind === 'caption' && nonempty(instruction.artifactId)
    && Array.isArray(instruction.instructions), 'saved caption instruction artifact required');
  fail(timeline?.schemaVersion === 'presentation-base-media-timeline-v003'
    && nonempty(timeline.timelineId) && nonempty(timeline.sourceRef)
    && Array.isArray(timeline.segments) && timeline.segments.length > 0, 'saved timeline required');
  const sourceClock = timeline.sourceFrameClock;
  fail(sourceClock?.inputFrameRate === '60/1' && sourceClock.logicalFrameRate === '30/1'
    && sourceClock.extractionRuleId === 'source-frame-60fps-global-even-v001'
    && natural(sourceClock.decodedFrameCount) && sourceClock.decodedFrameCount > 0,
  'unsupported source frame clock');
  fail(timeline.baseMedia?.frameRate === '30/1'
    && timeline.baseMedia.expectedFrameCount === expectedFrameCount, 'saved output clock differs');
  const timelineSha256 = canonicalSha256(timeline);
  fail(instruction.sourceBindings?.timeline?.schemaVersion === timeline.schemaVersion
    && instruction.sourceBindings.timeline.canonicalSha256 === timelineSha256,
  'instruction is bound to a different timeline');

  const segmentIds = new Set();
  let coveredEnd = 0;
  const segments = timeline.segments.map(segment => {
    fail(nonempty(segment?.segmentId) && !segmentIds.has(segment.segmentId), 'missing or duplicate segment ID');
    const {outputStartFrame, outputEndFrame, sourceStartFrame30, sourceEndFrame30} = segment;
    fail([outputStartFrame, outputEndFrame, sourceStartFrame30, sourceEndFrame30].every(natural)
      && outputStartFrame === coveredEnd && outputStartFrame < outputEndFrame
      && outputEndFrame <= expectedFrameCount, 'timeline output must cover the video in order without gaps or overlaps');
    fail(sourceStartFrame30 < sourceEndFrame30
      && sourceEndFrame30 - sourceStartFrame30 === outputEndFrame - outputStartFrame,
    'source and output segment spans differ');
    // The saved extraction rule selects source decoded frames 0, 2, 4, ... .
    fail(2n * (BigInt(sourceEndFrame30) - 1n) < BigInt(sourceClock.decodedFrameCount),
      'source segment exceeds the saved decoded frame clock');
    segmentIds.add(segment.segmentId); coveredEnd = outputEndFrame;
    return {segmentId: segment.segmentId, outputRange: range(outputStartFrame, outputEndFrame),
      sourceRange30: range(sourceStartFrame30, sourceEndFrame30)};
  });
  fail(coveredEnd === expectedFrameCount, 'timeline does not cover the whole video');

  const captionIds = new Set(), noCaptionRanges = [];
  let captionEnd = 0, captionFrameCount = 0, minimumDisplayFrameCount = null;
  const captions = instruction.instructions.map((item, index) => {
    fail(nonempty(item?.instructionId) && !captionIds.has(item.instructionId), 'missing or duplicate caption ID');
    fail(nonempty(item.content?.text), 'caption text required');
    const {startFrame, endFrameExclusive} = item.outputTime ?? {};
    fail(natural(startFrame) && natural(endFrameExclusive) && startFrame < endFrameExclusive
      && startFrame >= captionEnd && endFrameExclusive <= expectedFrameCount,
    'caption range is empty, out of bounds, out of order or overlapping');
    if (startFrame > captionEnd) noCaptionRanges.push(range(captionEnd, startFrame));
    const sourceParts = segments.flatMap(segment => {
      const start = Math.max(startFrame, segment.outputRange.startFrame);
      const end = Math.min(endFrameExclusive, segment.outputRange.endFrameExclusive);
      if (start >= end) return [];
      const sourceStart = segment.sourceRange30.startFrame + (start - segment.outputRange.startFrame);
      return [{segmentId: segment.segmentId, outputRange: range(start, end),
        sourceRange30: range(sourceStart, sourceStart + (end - start))}];
    });
    const displayFrameCount = endFrameExclusive - startFrame;
    fail(sourceParts.reduce((sum, part) => sum + frameCount(part.outputRange), 0) === displayFrameCount,
      'caption source projection is incomplete');
    captionIds.add(item.instructionId); captionEnd = endFrameExclusive;
    captionFrameCount += displayFrameCount;
    minimumDisplayFrameCount = minimumDisplayFrameCount === null
      ? displayFrameCount : Math.min(minimumDisplayFrameCount, displayFrameCount);
    return {ordinal: index + 1, instructionId: item.instructionId, text: item.content.text,
      outputRange: range(startFrame, endFrameExclusive), displayFrameCount, sourceParts};
  });
  if (captionEnd < expectedFrameCount) noCaptionRanges.push(range(captionEnd, expectedFrameCount));
  const noCaptionFrameCount = noCaptionRanges.reduce((sum, interval) => sum + frameCount(interval), 0);
  fail(captionFrameCount + noCaptionFrameCount === expectedFrameCount, 'caption and no-caption coverage differs');
  return {schemaVersion: 'q3-saved-digest-timing-v001',
    observationScope: 'saved-timing-only; no semantic video observation or listening performed',
    instructionArtifactId: instruction.artifactId, timelineId: timeline.timelineId,
    timelineCanonicalSha256: timelineSha256, sourceRef: timeline.sourceRef,
    fps, frameCount: expectedFrameCount, captions, noCaptionRanges,
    coverage: {captionCount: captions.length, captionFrameCount, noCaptionIntervalCount: noCaptionRanges.length,
      noCaptionFrameCount, totalFrameCount: expectedFrameCount},
    minimumDisplayFrameCount,
    shortestCaptions: structuredClone(captions.filter(caption => caption.displayFrameCount === minimumDisplayFrameCount))};
}
