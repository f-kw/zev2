import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalSha256, createQualityClock, projectObservationInterval, sourcePartsForRange} from './clock.mjs';
import {secondsToObservationSample} from './prepare.mjs';

const completedSha256 = '49ea952aea47e38095c9a8e336a1722fd3278230dda4203e10ab76f0129ba225';
const baselineSha256 = '8c36b25a30e8acf5ac97475646092adeca5336d1c9a447dc9f2ffd0f7fd5ce2d';
const timelineSha256 = 'dd4ebac277c0f3da73765457ea7812cfc801a16231d35a1cd0a0c4c1b0e61aef';
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const fraction = (numerator, denominator = 1) => ({numerator, denominator});

// These positions are copied from HRB001's persisted projection, source timeline,
// and generation manifest. Fixtures do not read temporary outputs or run selectors.
// Baseline start/end, completed start/end, original 30fps start/end, original audio start/end.
const savedSegments = [
  [0, 340, 0, 340, 38057, 38397, 55944496, 56444296],
  [340, 462, 340, 462, 38505, 38627, 56603056, 56782396],
  [462, 756, 474, 768, 58752, 59046, 86366146, 86798326],
  [756, 2997, 768, 3009, 59717, 61958, 87784696, 91078966],
  [2997, 3563, 3021, 3587, 177572, 178138, 261031546, 261863566],
  [3563, 4382, 3587, 4406, 178473, 179292, 262356016, 263559946],
  [4382, 4831, 4418, 4867, 180046, 180495, 264668326, 265328356],
];
const segmentId = index => `segment-${String(index + 1).padStart(4, '0')}`;
const connectionId = index => `connection-${String(index + 1).padStart(2, '0')}`;

function sealProjection(projection, {sourceClock = false} = {}) {
  if (sourceClock) projection.sourceClockSha256 = canonicalSha256(projection.sourceClock);
  const {projectionSha256: ignored, ...body} = projection;
  projection.projectionSha256 = canonicalSha256(body);
  return projection;
}

function fixture() {
  const sourceFrameClock = {
    inputFrameRate: '60/1', logicalFrameRate: '30/1', extractionRuleId: 'source-frame-60fps-global-even-v001',
    decodedFrameCount: 370924, containerStartTimeMs: 0, videoStreamTimeBase: '1/90000',
    videoFirstPts: 1440, videoPtsStep: 1500, videoPresentationOffsetMs: 16,
  };
  const timeline = {
    schemaVersion: 'presentation-base-media-timeline-v003', sourceRef: 'ymUsGrT6EaA', sourceFrameClock,
    baseMedia: {fileSha256: baselineSha256, frameRate: '30/1', expectedFrameCount: 4831},
    segments: savedSegments.map(([start, end, , , originalStart, originalEnd], i) => ({
      segmentId: segmentId(i), sourceStartFrame30: originalStart, sourceEndFrame30: originalEnd,
      outputStartFrame: start, outputEndFrame: end,
    })),
  };
  const generationManifest = {
    schemaVersion: 'presentation-base-media-generation-manifest-v003',
    source: {
      sourceRef: 'ymUsGrT6EaA',
      video: {frameRate: '60/1', firstPts: 1440, timeBase: '1/90000', presentationOffsetMs: 16},
      audio: {sampleRate: 44100, firstDecodedPts: 0},
    },
    outputs: {baseMedia: {fileSha256: baselineSha256, frameCount: 4831}, timeline: {fileSha256: timelineSha256}},
    segments: savedSegments.map(([start, end, , , originalStart, originalEnd, audioStart, audioEnd], i) => ({
      segmentId: segmentId(i), sourceStartFrame30: originalStart, sourceEndFrame30: originalEnd,
      outputStartFrame: start, outputEndFrame: end,
      audioSamples: {sourceStart: audioStart, sourceEnd: audioEnd, outputStart: start * 1470, outputEnd: end * 1470},
    })),
  };
  const presets = ['normal-cut', 'soft-separator', 'normal-cut', 'black-separator', 'normal-cut', 'soft-separator'];
  const projection = {
    schemaVersion: 'presentation-orchestration-projection-v001',
    sourceClock: {
      schemaVersion: 'presentation-orchestration-source-clock-v001',
      digestRef: {version: 'digest-completed-ymUsGrT6EaA-human-caption-repair', sha256: 'c4bbf207440cc846f73ffcd8bde12b95258dc8589ce9f0cd824a449ad3af258c'},
      planRef: {path: 'saved/normal-plan.json', fileSha256: '9a4550ee0f9d3ccaf7ddedac26ed5af8af2bf64e23c505f082830b9031c3311e'},
      timelineRef: {path: 'saved/timeline.json', fileSha256: timelineSha256},
      mediaRef: {path: 'saved/base-media.mp4', fileSha256: baselineSha256},
      frameRate: 30, sourceFrameCount: 4831, playbackSampleRate: 44100, observationSampleRate: 16000,
    },
    sourceFrameCount: 4831, displayFrameCount: 4867,
    sourcePlaybackSampleCount: 7101570, displayPlaybackSampleCount: 7154490,
    connections: presets.map((preset, i) => ({
      connectionId: connectionId(i), beforeSegmentId: segmentId(i), afterSegmentId: segmentId(i + 1),
      boundaryFrame: savedSegments[i + 1][0], role: preset === 'normal-cut' ? 'normal-cut' : 'separator',
      preset, presetVersion: 'v001', insertedFrameCount: preset === 'normal-cut' ? 0 : 12,
    })),
    retainedSpans: savedSegments.map(([start, end, completedStart, completedEnd], i) => ({
      segmentId: segmentId(i), sourceStartFrame: start, sourceEndFrameExclusive: end,
      displayStartFrame: completedStart, displayEndFrameExclusive: completedEnd, shiftFrames: completedStart - start,
      sourceStartSample: start * 1470, sourceEndSampleExclusive: end * 1470,
      displayStartSample: completedStart * 1470, displayEndSampleExclusive: completedEnd * 1470,
    })),
    insertedSpans: [
      {connectionId: 'connection-02', preset: 'soft-separator', sourceBoundaryFrame: 462,
        displayStartFrame: 462, displayEndFrameExclusive: 474, playbackStartSample: 679140,
        playbackEndSampleExclusive: 696780, playbackSampleCount: 17640, observationSampleCount: 6400},
      {connectionId: 'connection-04', preset: 'black-separator', sourceBoundaryFrame: 2997,
        displayStartFrame: 3009, displayEndFrameExclusive: 3021, playbackStartSample: 4423230,
        playbackEndSampleExclusive: 4440870, playbackSampleCount: 17640, observationSampleCount: 6400},
      {connectionId: 'connection-06', preset: 'soft-separator', sourceBoundaryFrame: 4382,
        displayStartFrame: 4406, displayEndFrameExclusive: 4418, playbackStartSample: 6476820,
        playbackEndSampleExclusive: 6494460, playbackSampleCount: 17640, observationSampleCount: 6400},
    ],
  };
  sealProjection(projection, {sourceClock: true});
  return {projection, timeline, generationManifest, mediaSha256: completedSha256};
}

function observation(clock, startSample, endSampleExclusive, extra = {}) {
  return projectObservationInterval(clock, {
    clock: 'digest-original', sourceClockSha256: clock.sourceClockSha256,
    sampleRate: 16000, startSample, endSampleExclusive, ...extra,
  });
}

function savedDecimalSample(text) {
  const seconds = Number(text);
  assert.equal(String(seconds), text, 'the decimal fixture must survive the saved JSON number representation');
  return secondsToObservationSample(seconds, 16000);
}

test('saved clocks cover every completed frame once with seven source and three inserted parts', () => {
  const clock = createQualityClock(fixture());
  const parts = sourcePartsForRange(clock, range(0, 4867));
  assert.equal(clock.mediaSha256, completedSha256);
  assert.equal(clock.baselineFrameCount, 4831);
  assert.equal(clock.completedFrameCount, 4867);
  assert.equal(parts.filter(part => part.kind === 'retained').length, 7);
  assert.equal(parts.filter(part => part.kind === 'inserted').length, 3);
  assert.deepEqual(parts.map(part => part.range), [range(0, 340), range(340, 462), range(462, 474),
    range(474, 768), range(768, 3009), range(3009, 3021), range(3021, 3587),
    range(3587, 4406), range(4406, 4418), range(4418, 4867)]);
});

test('a normal cut preserves the discontinuity in original video and audio', () => {
  const parts = sourcePartsForRange(createQualityClock(fixture()), range(339, 341));
  assert.deepEqual(parts.map(part => part.range), [range(339, 340), range(340, 341)]);
  assert.deepEqual(parts.map(part => part.baselineRange), [range(339, 340), range(340, 341)]);
  assert.deepEqual(parts.map(part => part.originalVideo.logicalFrameRange), [range(38396, 38397), range(38505, 38506)]);
  assert.deepEqual(parts.map(part => [part.originalAudio.startSample, part.originalAudio.endSampleExclusive]),
    [[56442826, 56444296], [56603056, 56604526]]);
});

test('crossing an insertion gives three parts and keeps both inserted origins null', () => {
  const parts = sourcePartsForRange(createQualityClock(fixture()), range(461, 475));
  assert.deepEqual(parts.map(part => part.range), [range(461, 462), range(462, 474), range(474, 475)]);
  assert.deepEqual(parts.map(part => part.baselineRange), [range(461, 462), null, range(462, 463)]);
  assert.deepEqual(parts[1], {kind: 'inserted', range: range(462, 474), baselineRange: null,
    originalVideo: null, originalAudio: null, segmentId: null, connectionId: 'connection-02'});
  assert.deepEqual(parts.filter(part => part.kind === 'retained').map(part => part.originalVideo.logicalFrameRange),
    [range(38626, 38627), range(58752, 58753)]);
  assert.deepEqual(parts.filter(part => part.kind === 'retained').map(part => [part.originalAudio.startSample, part.originalAudio.endSampleExclusive]),
    [[56780926, 56782396], [86366146, 86367616]]);
});

test('later black and soft insertions use the accumulated completed-clock shift', () => {
  const clock = createQualityClock(fixture());
  for (const [start, end, baselineBefore, baselineAfter, connection] of [
    [3009, 3021, 2996, 2997, 'connection-04'], [4406, 4418, 4381, 4382, 'connection-06'],
  ]) {
    const parts = sourcePartsForRange(clock, range(start - 1, end + 1));
    assert.deepEqual(parts.map(part => part.baselineRange), [range(baselineBefore, baselineBefore + 1), null, range(baselineAfter, baselineAfter + 1)]);
    assert.equal(parts[1].connectionId, connection);
    assert.deepEqual(parts[1].range, range(start, end));
    assert.equal(parts[1].originalAudio, null);
    assert.equal(parts[1].originalVideo, null);
  }
});

test('source video keeps the 16ms presentation offset and even 60fps indices; audio uses saved samples', () => {
  const [part] = sourcePartsForRange(createQualityClock(fixture()), range(474, 475));
  assert.deepEqual(part.baselineRange, range(462, 463));
  assert.deepEqual(part.originalVideo, {sourceRef: 'original-source-media', logicalFrameRange: range(58752, 58753),
    decodedFrameIndices: {first: 117504, step: 2, count: 1},
    presentationSeconds: {start: fraction(244802, 125), end: fraction(1468837, 750)}});
  assert.deepEqual(part.originalAudio, {sourceRef: 'original-source-media', sampleRate: 44100,
    startSample: 86366146, endSampleExclusive: 86367616});
  // The source audio cut is 0.4 sample after the video's exact 16ms offset.
  assert.notEqual(part.originalAudio.startSample, 86366145.6);
});

test('16kHz observations spanning an insertion produce disjoint evidence without black coverage', () => {
  const clock = createQualityClock(fixture());
  const result = observation(clock, 246399, 246401);
  assert.deepEqual(result.parts.map(part => part.range), [range(461, 462), range(474, 475)]);
  assert.deepEqual(result.parts.map(part => part.baselineSamples), [
    {start: fraction(246399), end: fraction(246400)}, {start: fraction(246400), end: fraction(246401)},
  ]);
  assert.deepEqual(result.parts.map(part => part.completedObservationSamples), [
    {start: fraction(246399), end: fraction(246400)}, {start: fraction(252800), end: fraction(252801)},
  ]);
  assert.deepEqual(result.parts[0].completedPlaybackSamples.end, fraction(679140));
  assert.deepEqual(result.parts[1].completedPlaybackSamples.start, fraction(696780));
  assert.deepEqual(result.excluded, []);
});

test('a normal cut inside a 16kHz sample splits exact thirds before frame rounding', () => {
  const result = observation(createQualityClock(fixture()), 181333, 181334);
  assert.deepEqual(result.parts.map(part => part.range), [range(339, 340), range(340, 341)]);
  assert.deepEqual(result.parts.map(part => part.baselineSamples), [
    {start: fraction(181333), end: fraction(544000, 3)}, {start: fraction(544000, 3), end: fraction(181334)},
  ]);
  assert.deepEqual(result.parts.map(part => part.originalAudioSamples), [
    {start: fraction(9031087213, 160), end: fraction(56444296)},
    {start: fraction(56603056), end: fraction(4528244627, 80)},
  ]);
});

test('long saved ASR decimals retain exact sample fractions through playback and original-audio conversion', () => {
  const start = savedDecimalSample('43.120000000000005');
  const end = savedDecimalSample('43.12000000000001');
  assert.deepEqual(start, fraction(8624000000000001, 12500000000));
  assert.deepEqual(end, fraction(4312000000000001, 6250000000));
  const result = observation(createQualityClock(fixture()), start, end);
  assert.equal(result.parts.length, 1);
  const [part] = result.parts;
  assert.equal(part.pointOnly, false);
  assert.deepEqual(part.range, range(1305, 1306));
  assert.deepEqual(part.baselineSamples, {start, end});
  assert.deepEqual(part.completedObservationSamples, {
    start: fraction(8704000000000001, 12500000000), end: fraction(4352000000000001, 6250000000),
  });
  assert.deepEqual(part.completedPlaybackSamples, {
    start: fraction('3838464000000000441', 2000000000000), end: fraction('1919232000000000441', 1000000000000),
  });
  assert.deepEqual(part.originalAudioSamples, {
    start: fraction('177149936000000000441', 2000000000000), end: fraction('88574968000000000441', 1000000000000),
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result, 'large rational integers remain lossless JSON values');
});

test('decimal-derived fractions on opposite sides of a normal cut remain two nonempty parts', () => {
  const start = savedDecimalSample('11.33333333333333');
  const end = savedDecimalSample('11.333333333333336');
  assert.deepEqual(start, fraction(1133333333333333, 6250000000));
  assert.deepEqual(end, fraction(1416666666666667, 7812500000));
  const result = observation(createQualityClock(fixture()), start, end);
  assert.deepEqual(result.parts.map(part => part.range), [range(339, 340), range(340, 341)]);
  assert.deepEqual(result.parts.map(part => part.pointOnly), [false, false]);
  assert.deepEqual(result.parts.map(part => part.baselineSamples), [
    {start, end: fraction(544000, 3)}, {start: fraction(544000, 3), end},
  ]);
  assert.deepEqual(result.excluded, []);
});

test('decimal-derived fractions spanning an insertion preserve both sides without observing the insertion', () => {
  const start = savedDecimalSample('15.399999999999999');
  const end = savedDecimalSample('15.400000000000002');
  assert.deepEqual(start, fraction('15399999999999999', 62500000000));
  assert.deepEqual(end, fraction(7700000000000001, 31250000000));
  const result = observation(createQualityClock(fixture()), start, end);
  assert.deepEqual(result.parts.map(part => part.range), [range(461, 462), range(474, 475)]);
  assert.deepEqual(result.parts.map(part => part.pointOnly), [false, false]);
  assert.deepEqual(result.parts.map(part => part.baselineSamples), [
    {start, end: fraction(246400)}, {start: fraction(246400), end},
  ]);
  assert.deepEqual(result.parts.map(part => part.completedObservationSamples), [
    {start, end: fraction(246400)}, {start: fraction(252800), end: fraction(7900000000000001, 31250000000)},
  ]);
  assert.deepEqual(result.excluded, []);
});

test('decimal-derived fractions spanning the baseline end retain only the last video-frame portion', () => {
  const start = savedDecimalSample('161.03333333333333');
  const end = savedDecimalSample('161.03333333333336');
  assert.deepEqual(start, fraction('16103333333333333', 6250000000));
  assert.deepEqual(end, fraction(2012916666666667, 781250000));
  const result = observation(createQualityClock(fixture()), start, end);
  assert.equal(result.parts.length, 1);
  assert.equal(result.parts[0].pointOnly, false);
  assert.deepEqual(result.parts[0].range, range(4866, 4867));
  assert.deepEqual(result.parts[0].baselineSamples, {start, end: fraction(7729600, 3)});
  assert.deepEqual(result.parts[0].completedObservationSamples, {
    start: fraction('16223333333333333', 6250000000), end: fraction(7787200, 3),
  });
  assert.deepEqual(result.excluded, [{reason: 'outside-presentation-decoder-tail', sampleRate: 16000,
    start: fraction(7729600, 3), end}]);
});

test('zero-length rational points retain half-open ownership at normal, insertion, and terminal boundaries', () => {
  const clock = createQualityClock(fixture());
  const normalPoint = observation(clock, fraction(544000, 3), fraction(1088000, 6));
  assert.equal(normalPoint.parts.length, 1);
  assert.equal(normalPoint.parts[0].segmentId, 'segment-0002');
  assert.equal(normalPoint.parts[0].pointOnly, true);
  assert.deepEqual(normalPoint.parts[0].range, range(340, 341));
  assert.deepEqual(normalPoint.parts[0].baselineSamples, {start: fraction(544000, 3), end: fraction(544000, 3)});
  for (const [text, expectedRange, segment] of [
    ['15.399999999999999', range(461, 462), 'segment-0002'],
    ['15.4', range(474, 475), 'segment-0003'],
    ['15.400000000000002', range(474, 475), 'segment-0003'],
    ['161.03333333333333', range(4866, 4867), 'segment-0007'],
  ]) {
    const coordinate = savedDecimalSample(text);
    const result = observation(clock, coordinate, coordinate);
    assert.equal(result.parts.length, 1);
    assert.equal(result.parts[0].pointOnly, true);
    assert.equal(result.parts[0].segmentId, segment);
    assert.deepEqual(result.parts[0].range, expectedRange);
    assert.deepEqual(result.parts[0].baselineSamples, {start: coordinate, end: coordinate});
  }
  const terminal = fraction(7729600, 3);
  const terminalPoint = observation(clock, terminal, fraction(15459200, 6));
  assert.deepEqual(terminalPoint.parts, []);
  assert.deepEqual(terminalPoint.excluded, [{reason: 'outside-presentation-decoder-tail', sampleRate: 16000,
    start: terminal, end: terminal}]);
  const afterTerminal = savedDecimalSample('161.03333333333336');
  assert.deepEqual(observation(clock, afterTerminal, afterTerminal).parts, []);
});

test('rational coordinates with denominators beyond safe integers remain lossless at an insertion boundary', () => {
  const coordinate = fraction('2464000000000000000000000001', '10000000000000000000000');
  const result = observation(createQualityClock(fixture()), coordinate, coordinate);
  assert.equal(result.parts.length, 1);
  assert.equal(result.parts[0].pointOnly, true);
  assert.deepEqual(result.parts[0].range, range(474, 475));
  assert.deepEqual(result.parts[0].baselineSamples, {start: coordinate, end: coordinate});
  const completed = fraction('2528000000000000000000000001', '10000000000000000000000');
  assert.deepEqual(result.parts[0].completedObservationSamples, {start: completed, end: completed});
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('points at a cut or insertion boundary belong only to the following source segment', () => {
  const clock = createQualityClock(fixture());
  const insertionPoint = observation(clock, 246400, 246400);
  assert.equal(insertionPoint.parts.length, 1);
  assert.deepEqual(insertionPoint.parts[0].range, range(474, 475));
  assert.equal(insertionPoint.parts[0].pointOnly, true);
  assert.deepEqual(insertionPoint.parts[0].originalAudioSamples, {start: fraction(86366146), end: fraction(86366146)});
  const normalPoint = observation(clock, 499800, 499800, {sampleRate: 44100});
  assert.equal(normalPoint.parts.length, 1);
  assert.deepEqual(normalPoint.parts[0].range, range(340, 341));
  assert.deepEqual(normalPoint.parts[0].originalAudioSamples, {start: fraction(56603056), end: fraction(56603056)});
});

test('16kHz decoder tail is excluded exactly and never creates completed-video evidence', () => {
  const clock = createQualityClock(fixture());
  const result = observation(clock, 2562560, 2576858);
  assert.equal(result.parts.length, 1);
  assert.deepEqual(result.parts[0].range, range(4840, 4867));
  assert.deepEqual(result.parts[0].baselineSamples.end, fraction(7729600, 3));
  assert.deepEqual(result.parts[0].completedObservationSamples.end, fraction(7787200, 3));
  assert.deepEqual(result.parts[0].completedPlaybackSamples.end, fraction(7154490));
  assert.deepEqual(result.excluded, [{reason: 'outside-presentation-decoder-tail', sampleRate: 16000,
    start: fraction(7729600, 3), end: fraction(2576858)}]);
  assert.equal(2576858 * 3 - result.excluded[0].start.numerator, 974);
  const tailOnly = observation(clock, 2576534, 2576858);
  assert.deepEqual(tailOnly.parts, []);
  assert.deepEqual(tailOnly.excluded[0].start, fraction(2576534));
  assert.deepEqual(observation(clock, 2576534, 2576534).parts, []);
});

test('the completed terminal frame maps to the final retained frame without overflow', () => {
  const [part] = sourcePartsForRange(createQualityClock(fixture()), range(4866, 4867));
  assert.deepEqual(part.baselineRange, range(4830, 4831));
  assert.deepEqual(part.originalVideo.logicalFrameRange, range(180494, 180495));
  assert.deepEqual(part.originalVideo.decodedFrameIndices, {first: 360988, step: 2, count: 1});
  assert.deepEqual([part.originalAudio.startSample, part.originalAudio.endSampleExclusive], [265326886, 265328356]);
});

test('invalid completed frame ranges are rejected', () => {
  const clock = createQualityClock(fixture());
  for (const invalid of [range(-1, 1), range(0, 0), range(2, 1), range(0, 4868), range(0.5, 1),
    {...range(0, 1), sourceClock: 'digest-original'}]) {
    assert.throws(() => sourcePartsForRange(clock, invalid), /QUALITY_CLOCK_INVALID/);
  }
});

test('observations reject the wrong clock, identity, rate, and malformed sample ranges', () => {
  const clock = createQualityClock(fixture());
  for (const extra of [{clock: 'digest-display'}, {sourceClockSha256: '0'.repeat(64)}, {sampleRate: 48000},
    {startSample: -1}, {startSample: 2, endSampleExclusive: 1}, {startSample: 0.5}, {endSampleExclusive: Infinity}]) {
    assert.throws(() => observation(clock, 0, 1, extra), /QUALITY_CLOCK_INVALID/);
  }
});

test('projection and source-clock tampering are rejected before mapping', () => {
  const changedProjection = fixture();
  changedProjection.projection.displayFrameCount += 1;
  assert.throws(() => createQualityClock(changedProjection), /projection hash/);
  const changedSourceClock = fixture();
  changedSourceClock.projection.sourceClock.sourceFrameCount -= 1;
  sealProjection(changedSourceClock.projection);
  assert.throws(() => createQualityClock(changedSourceClock), /source clock hash/);
});

test('resealing does not make an unsupported clock or inconsistent persisted mapping valid', () => {
  for (const mutate of [
    value => {value.projection.sourceClock.observationSampleRate = 48000;},
    value => {value.projection.retainedSpans[2].shiftFrames = 0;},
    value => {value.projection.insertedSpans[1].playbackEndSampleExclusive += 1;},
    value => {value.projection.connections[2].boundaryFrame += 1;},
    value => {value.projection.insertedSpans.push({...value.projection.insertedSpans[0]});},
  ]) {
    const value = fixture();
    mutate(value);
    sealProjection(value.projection, {sourceClock: true});
    assert.throws(() => createQualityClock(value), /QUALITY_CLOCK_INVALID/);
  }
});

test('contradictory source timeline and audio generation records are rejected', () => {
  for (const mutate of [
    value => {value.timeline.segments[2].outputStartFrame += 1;},
    value => {value.generationManifest.segments[2].audioSamples.sourceStart += 1;},
    value => {value.generationManifest.outputs.timeline.fileSha256 = '0'.repeat(64);},
    value => {value.generationManifest.source.video.presentationOffsetMs = 0;},
    value => {value.generationManifest.source.audio.firstDecodedPts = 1024;},
  ]) {
    const value = fixture();
    mutate(value);
    assert.throws(() => createQualityClock(value), /QUALITY_CLOCK_INVALID/);
  }
});
