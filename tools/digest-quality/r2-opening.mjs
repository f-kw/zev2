/** R2-B only: recover the first saved utterance before the existing Digest head. */
import assert from 'node:assert/strict';
import {validatePresentationBaseMediaSegmentPlanV002}
  from '../../evals/clip_composition/presentation_base_media_build_v003.mjs';

const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const integer = value => Number.isSafeInteger(value) && value >= 0;

export function resolveR2OpeningExtensionV001({inspection, generationManifest, completedFrameCount,
  observedStartMs, observedEndMs}) {
  const media = inspection?.media, old = generationManifest?.segments?.[0];
  assert(media && old && integer(completedFrameCount) && completedFrameCount > 0,
    'saved source inspection, first retained segment and completed frame count are required');
  assert(integer(observedStartMs) && integer(observedEndMs) && observedStartMs < observedEndMs,
    'a separately observed utterance interval is required');
  assert(observedStartMs < old.sourceStartMs && old.sourceStartMs < observedEndMs,
    'this operation only restores an utterance crossing the old Digest head');
  assert.equal(old.outputStartFrame, 0);
  const sourceClock = {fps: media.fps, decodedFrameCount: media.decodedFrameCount,
    logicalFrameCount: media.logicalFrameCount, presentationOffsetMs: media.videoClock.presentationOffsetMs};
  const resolve = sourceStartMs => {
    const result = validatePresentationBaseMediaSegmentPlanV002(
      [{sourceStartMs, sourceEndMs: old.sourceEndMs}], sourceClock, media.audioClock);
    assert.equal(result.status, 'passed', JSON.stringify(result.violations));
    return result.mappings[0];
  };
  const reproduced = resolve(old.sourceStartMs);
  assert.deepEqual(reproduced, old, 'the saved frame and source audio mapping must reproduce before extension');
  const extended = resolve(observedStartMs), frameCount = old.sourceStartFrame30 - extended.sourceStartFrame30;
  assert(frameCount > 0, 'the requested speech begins before the current source frame grid');
  assert.equal(extended.sourceEndFrame30, old.sourceEndFrame30);
  assert.equal(extended.audioSamples.sourceEnd, old.audioSamples.sourceEnd);
  const audioSampleCount = old.audioSamples.sourceStart - extended.audioSamples.sourceStart;
  assert.equal(audioSampleCount * 30, frameCount * media.audioClock.sampleRate);
  // Do not round milliseconds, source PTS and sample positions into one clock.
  const video = media.source.video;
  assert.equal(video.frameRate, `${media.fps}/1`);
  assert.equal(video.firstPts, media.videoClock.firstPts);
  assert.equal(video.ptsStep, media.videoClock.ptsStep);
  const timeBase = /^1\/(\d+)$/.exec(video.timeBase);
  assert(timeBase, 'the saved source requires an exact integral PTS time base');
  const ticksPerSecond = Number(timeBase[1]), sourceFramesPerOutputFrame = media.fps / 30;
  assert(Number.isSafeInteger(sourceFramesPerOutputFrame));
  const startPts = video.firstPts + extended.sourceStartFrame30 * sourceFramesPerOutputFrame * video.ptsStep;
  const endPtsExclusive = video.firstPts + old.sourceStartFrame30 * sourceFramesPerOutputFrame * video.ptsStep;
  assert(BigInt(startPts) * 1000n <= BigInt(observedStartMs) * BigInt(ticksPerSecond),
    'the selected first video frame must contain the observed onset');
  assert(BigInt(extended.audioSamples.sourceStart) * 1000n <= BigInt(observedStartMs) * BigInt(media.audioClock.sampleRate),
    'the source audio cut must retain the observed onset');
  return {
    observedUtteranceMs: {startMs: observedStartMs, endMs: observedEndMs},
    oldRequestedSourceStartMs: old.sourceStartMs,
    addedFrameCount: frameCount, oldCompletedFrameCount: completedFrameCount,
    newCompletedFrameCount: completedFrameCount + frameCount,
    sourceVideoRange: range(extended.sourceStartFrame30, old.sourceStartFrame30),
    sourceDecodedFrameRange: range(extended.sourceStartFrame30 * sourceFramesPerOutputFrame,
      old.sourceStartFrame30 * sourceFramesPerOutputFrame),
    sourcePtsRange: {startPts, endPtsExclusive, timeBase: video.timeBase},
    sourceAudioRange: {startSample: extended.audioSamples.sourceStart,
      endSampleExclusive: old.audioSamples.sourceStart, sampleRate: media.audioClock.sampleRate,
      channels: media.audioClock.channels, sampleCount: audioSampleCount},
    physicalPieces: [
      {kind: 'added-source', oldDigestRange: null, newGlobalRange: range(0, frameCount),
        sourceVideoRange: range(extended.sourceStartFrame30, old.sourceStartFrame30)},
      {kind: 'unchanged-old-digest', oldDigestRange: range(0, completedFrameCount),
        newGlobalRange: range(frameCount, frameCount + completedFrameCount)},
    ],
    extendedFirstSegment: extended,
    invariant: 'all old Digest frames and the exit remain in order; only the source-contiguous prefix is new',
    projection: 'resolve the corrected baseline once; project all subsequent captions, measured peaks and motion anchors by the same added frame count',
  };
}
