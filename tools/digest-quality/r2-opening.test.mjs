import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveR2OpeningExtensionV001 as resolve} from './r2-opening.mjs';

function fixture() {
  const inspection = {media: {fps: 60, decodedFrameCount: 370924, logicalFrameCount: 185462,
    videoClock: {presentationOffsetMs: 16, firstPts: 1440, ptsStep: 1500},
    source: {video: {frameRate: '60/1', firstPts: 1440, ptsStep: 1500, timeBase: '1/90000'}},
    audioClock: {sampleRate: 44100, channels: 2, sourceGridMappingEndSample: 272631808}}};
  const generationManifest = {segments: [{segmentId: 'segment-0001',
    sourceStartMs: 1268581, sourceEndMs: 1279920, sourceStartFrame30: 38057, sourceEndFrame30: 38397,
    outputStartFrame: 0, outputEndFrame: 340,
    audioSamples: {sourceStart: 55944496, sourceEnd: 56444296, outputStart: 0, outputEnd: 499800}}]};
  return {inspection, generationManifest, completedFrameCount: 4867, observedStartMs: 1268220, observedEndMs: 1269000};
}

test('the measured first utterance derives an eleven-frame prefix on the saved offset source clocks', () => {
  const input = fixture(), before = structuredClone(input), actual = resolve(input);
  assert.equal(actual.addedFrameCount, 11);
  assert.deepEqual(actual.sourceVideoRange, {startFrame: 38046, endFrameExclusive: 38057});
  assert.deepEqual(actual.sourcePtsRange, {startPts: 114139440, endPtsExclusive: 114172440, timeBase: '1/90000'});
  assert.deepEqual(actual.sourceAudioRange, {startSample: 55928326, endSampleExclusive: 55944496,
    sampleRate: 44100, channels: 2, sampleCount: 16170});
  assert.equal(actual.physicalPieces[0].oldDigestRange, null);
  assert.deepEqual(actual.physicalPieces[1].oldDigestRange, {startFrame: 0, endFrameExclusive: 4867});
  assert.deepEqual(actual.physicalPieces[1].newGlobalRange, {startFrame: 11, endFrameExclusive: 4878});
  assert.equal(actual.extendedFirstSegment.sourceEndFrame30, input.generationManifest.segments[0].sourceEndFrame30);
  assert.notEqual(actual.sourcePtsRange.endPtsExclusive / 90, actual.oldRequestedSourceStartMs);
  assert.notEqual(actual.sourceAudioRange.endSampleExclusive * 1000 / 44100, actual.oldRequestedSourceStartMs);
  assert.deepEqual(input, before);
});

test('clock substitution, fabricated old mapping and an unrelated utterance cannot extend the head', () => {
  for (const change of [
    input => {input.inspection.media.videoClock.presentationOffsetMs = 0;},
    input => {input.generationManifest.segments[0].audioSamples.sourceStart--;},
    input => {input.generationManifest.segments[0].outputStartFrame = 11;},
    input => {input.observedStartMs = 1268582;},
    input => {input.observedEndMs = 1268200;},
    input => {input.inspection.media.source.video.firstPts = 0;},
  ]) {
    const input = fixture(); change(input); assert.throws(() => resolve(input));
  }
});
