import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalSha256} from './clock.mjs';
import {summarizeQ3SavedDigestTimingV001} from './q3-saved-digest-timing.mjs';

const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
function rebind(input) {
  input.instruction.sourceBindings.timeline.canonicalSha256 = canonicalSha256(input.timeline);
  return input;
}
function fixture() {
  const caption = (id, text, start, end) => ({instructionId: id, content: {text}, outputTime: range(start, end)});
  return rebind({fps: 30, expectedFrameCount: 30,
    instruction: {schemaVersion: 'presentation-instruction-artifact-v002', artifactId: 'saved-caption-artifact',
      artifactKind: 'caption', sourceBindings: {timeline: {schemaVersion: 'presentation-base-media-timeline-v003'}},
      instructions: [caption('caption-a', '同率の短文', 2, 5), caption('caption-b', '接続をまたぐ字幕', 8, 23),
        caption('caption-c', '同率の別文', 25, 28)]},
    timeline: {schemaVersion: 'presentation-base-media-timeline-v003', timelineId: 'saved-timeline', sourceRef: 'saved-source',
      sourceFrameClock: {inputFrameRate: '60/1', logicalFrameRate: '30/1',
        extractionRuleId: 'source-frame-60fps-global-even-v001', decodedFrameCount: 2000},
      baseMedia: {frameRate: '30/1', expectedFrameCount: 30},
      segments: [
        {segmentId: 'segment-a', outputStartFrame: 0, outputEndFrame: 10, sourceStartFrame30: 100, sourceEndFrame30: 110},
        {segmentId: 'segment-b', outputStartFrame: 10, outputEndFrame: 20, sourceStartFrame30: 500, sourceEndFrame30: 510},
        {segmentId: 'segment-c', outputStartFrame: 20, outputEndFrame: 30, sourceStartFrame30: 200, sourceEndFrame30: 210},
      ]}});
}

test('saved frame coverage, tied minima and discontinuous source parts retain their exact ranges', () => {
  const input = fixture(), original = structuredClone(input), result = summarizeQ3SavedDigestTimingV001(input);
  assert.deepEqual(result.coverage, {captionCount: 3, captionFrameCount: 21, noCaptionIntervalCount: 4,
    noCaptionFrameCount: 9, totalFrameCount: 30});
  assert.deepEqual(result.noCaptionRanges, [range(0, 2), range(5, 8), range(23, 25), range(28, 30)]);
  assert.equal(result.minimumDisplayFrameCount, 3);
  assert.deepEqual(result.shortestCaptions.map(caption => caption.ordinal), [1, 3]);
  assert.deepEqual(result.captions[1].sourceParts, [
    {segmentId: 'segment-a', outputRange: range(8, 10), sourceRange30: range(108, 110)},
    {segmentId: 'segment-b', outputRange: range(10, 20), sourceRange30: range(500, 510)},
    {segmentId: 'segment-c', outputRange: range(20, 23), sourceRange30: range(200, 203)},
  ]);
  assert.deepEqual(input, original);
  result.captions[0].outputRange.startFrame = 99;
  assert.deepEqual(input, original);
  assert.equal(result.shortestCaptions[0].outputRange.startFrame, 2);
});

test('a half-open join boundary belongs to the next source segment only', () => {
  const input = fixture();
  input.instruction.instructions = [{instructionId: 'join-caption', content: {text: '境界'}, outputTime: range(10, 20)}];
  const result = summarizeQ3SavedDigestTimingV001(input);
  assert.deepEqual(result.captions[0].sourceParts,
    [{segmentId: 'segment-b', outputRange: range(10, 20), sourceRange30: range(500, 510)}]);
});

test('an empty saved caption list covers the video as no-caption without inventing a shortest caption', () => {
  const input = fixture(); input.instruction.instructions = [];
  const result = summarizeQ3SavedDigestTimingV001(input);
  assert.deepEqual(result.noCaptionRanges, [range(0, 30)]);
  assert.equal(result.coverage.captionFrameCount, 0);
  assert.equal(result.coverage.noCaptionFrameCount, 30);
  assert.equal(result.minimumDisplayFrameCount, null);
  assert.deepEqual(result.shortestCaptions, []);
});

test('valid safe-integer clocks do not lose a frame through an overflowing intermediate addition', () => {
  const input = fixture();
  input.expectedFrameCount = input.timeline.baseMedia.expectedFrameCount = 9000000000000000;
  input.timeline.sourceFrameClock.decodedFrameCount = 9000000000000000;
  input.timeline.segments = [
    {segmentId: 'long-a', outputStartFrame: 0, outputEndFrame: 4000000000000000,
      sourceStartFrame30: 0, sourceEndFrame30: 4000000000000000},
    {segmentId: 'long-b', outputStartFrame: 4000000000000000, outputEndFrame: 8000000000000000,
      sourceStartFrame30: 0, sourceEndFrame30: 4000000000000000},
    {segmentId: 'long-c', outputStartFrame: 8000000000000000, outputEndFrame: 9000000000000000,
      sourceStartFrame30: 2000000000000000, sourceEndFrame30: 3000000000000000},
  ];
  input.instruction.instructions = [{instructionId: 'late-caption', content: {text: '一フレームのずれを拒む'},
    outputTime: range(8000000000000001, 8000000000000004)}];
  const result = summarizeQ3SavedDigestTimingV001(rebind(input));
  assert.deepEqual(result.captions[0].sourceParts[0].sourceRange30, range(2000000000000001, 2000000000000004));
  assert.equal(result.coverage.captionFrameCount, 3);
  assert.equal(result.coverage.noCaptionFrameCount, 8999999999999997);
});

for (const [name, mutate, message] of [
  ['a different timeline with the same output duration', input => {input.timeline.segments[0].sourceStartFrame30++; input.timeline.segments[0].sourceEndFrame30++;}, /different timeline/],
  ['a different source identity', input => {input.timeline.sourceRef = 'other-source';}, /different timeline/],
  ['non-30 output fps', input => {input.fps = 60;}, /30 fps/],
  ['a different source extraction clock even when rebound', input => {input.timeline.sourceFrameClock.inputFrameRate = '30/1'; rebind(input);}, /source frame clock/],
  ['a different logical clock even when rebound', input => {input.timeline.sourceFrameClock.logicalFrameRate = '60/1'; rebind(input);}, /source frame clock/],
  ['a different extraction rule even when rebound', input => {input.timeline.sourceFrameClock.extractionRuleId = 'odd-source-frames'; rebind(input);}, /source frame clock/],
  ['a different saved output rate', input => {input.timeline.baseMedia.frameRate = '60/1'; rebind(input);}, /output clock/],
  ['a different expected frame count', input => {input.expectedFrameCount++;}, /output clock/],
  ['a timeline coverage gap', input => {input.timeline.segments[1].outputStartFrame++; rebind(input);}, /without gaps or overlaps/],
  ['a timeline coverage overlap', input => {input.timeline.segments[1].outputStartFrame--; rebind(input);}, /without gaps or overlaps/],
  ['out-of-order timeline segments', input => {input.timeline.segments.reverse(); rebind(input);}, /without gaps or overlaps/],
  ['a missing terminal source segment', input => {input.timeline.segments.pop(); rebind(input);}, /whole video/],
  ['unequal source/output segment spans', input => {input.timeline.segments[1].sourceEndFrame30++; rebind(input);}, /segment spans differ/],
  ['a source range beyond the decoded clock', input => {input.timeline.sourceFrameClock.decodedFrameCount = 1000; rebind(input);}, /decoded frame clock/],
  ['a duplicate segment ID', input => {input.timeline.segments[1].segmentId = 'segment-a'; rebind(input);}, /duplicate segment ID/],
  ['a duplicate caption ID', input => {input.instruction.instructions[1].instructionId = 'caption-a';}, /duplicate caption ID/],
  ['overlapping captions', input => {input.instruction.instructions[1].outputTime.startFrame = 4;}, /overlapping/],
  ['out-of-order captions', input => {input.instruction.instructions.reverse();}, /out of order/],
  ['a caption outside the completed video', input => {input.instruction.instructions[2].outputTime.endFrameExclusive = 31;}, /out of bounds/],
  ['an empty caption range', input => {input.instruction.instructions[0].outputTime.endFrameExclusive = 2;}, /empty/],
  ['a fractional caption boundary', input => {input.instruction.instructions[0].outputTime.startFrame = 2.5;}, /range/],
  ['a negative caption boundary', input => {input.instruction.instructions[0].outputTime.startFrame = -1;}, /range/],
  ['missing caption text', input => {input.instruction.instructions[0].content.text = '';}, /text required/],
]) test(name + ' is rejected', () => {
  const input = fixture(); mutate(input);
  assert.throws(() => summarizeQ3SavedDigestTimingV001(input), message);
});
