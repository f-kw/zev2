import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  createOrchestrationProjectionV001, assertProjectionMatchesStateV001,
  projectOriginalFrameV001, projectOriginalSampleV001, projectCaptionIntervalV001,
  projectCaptionPlanV001, projectAudioPeakV001, projectAudioEvidenceIntervalV001,
  assertProjectedTimingV001,
} from './presentation_orchestration_projection_v001.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const copy = value => structuredClone(value);
const bytes = value => Buffer.from(JSON.stringify(value) + '\n');
const clock = projection => ({clock: 'digest-original', sourceClockSha256: projection.sourceClockSha256});
const frame = (projection, value) => ({...clock(projection), frame: value});
const sample = (projection, value, sampleRate = 16000) => ({...clock(projection), sample: value, sampleRate});
const caption = (projection, startFrame, endFrameExclusive) => ({...clock(projection), captionId: 'caption-test', startFrame, endFrameExclusive});
const peak = (projection, value) => ({...sample(projection, value), peakId: 'observed-peak'});
const interval = (projection, startSample, endSampleExclusive) => ({...clock(projection), evidenceId: 'observed-candidate',
  startSample, endSampleExclusive, sampleRate: 16000});
const rat = (numerator, denominator = 1) => ({numerator, denominator});

function fixture({playbackSampleRate = 44100, presets = ['black-separator', 'soft-separator'],
  lengths = [17, 23, 60], changePlan = () => {}} = {}) {
  let end = 0;
  const segments = lengths.map((length, index) => {
    const start = end; end += length;
    return {segmentId: 'segment-' + (index + 1), outputStartFrame: start, outputEndFrame: end,
      sourceStartFrame30: 1000 * index, sourceEndFrame30: 1000 * index + length};
  });
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001', format: 'normal-landscape',
    canvas: {width: 1920, height: 1080, fps: 30, safeAreaPx: {top: 40, right: 80, bottom: 40, left: 80}},
    elements: segments.map((segment, index) => ({instructionId: 'caption-' + (index + 1), text: '元字幕\n本文' + (index + 1),
      startFrame: segment.outputStartFrame, endFrameExclusive: segment.outputEndFrame,
      displayFrameCount: segment.outputEndFrame - segment.outputStartFrame,
      provenance: {segmentId: segment.segmentId}, indexedLines: [{text: '元字幕'}, {text: '本文' + (index + 1)}]}))};
  changePlan(plan);
  const mediaRef = {path: '/synthetic/base.mp4', fileSha256: 'a'.repeat(64)};
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003',
    baseMedia: {frameRate: '30/1', expectedFrameCount: end, fileSha256: mediaRef.fileSha256}, segments};
  const planBytes = bytes(plan), timelineBytes = bytes(timeline);
  return {digestRef: {version: 'synthetic-digest-v001', sha256: 'b'.repeat(64)},
    planRef: {path: '/synthetic/normal.json', fileSha256: hash(planBytes)},
    timelineRef: {path: '/synthetic/timeline.json', fileSha256: hash(timelineBytes)}, mediaRef,
    planBytes, timelineBytes, playbackSampleRate, observationSampleRate: 16000,
    connections: presets.map((preset, index) => ({connectionId: 'connection-' + String(index + 1).padStart(2, '0'), preset, presetVersion: 'v001'}))};
}

test('one timeline binds 44.1kHz playback, 16kHz observations and every concrete preset', () => {
  const source = fixture(), p = createOrchestrationProjectionV001(source);
  assert.equal(p.sourceFrameCount, 100); assert.equal(p.displayFrameCount, 124);
  assert.equal(p.sourcePlaybackSampleCount, 147000); assert.equal(p.displayPlaybackSampleCount, 182280);
  assert.deepEqual(p.retainedSpans.map(s => [s.sourceStartFrame, s.sourceEndFrameExclusive, s.displayStartFrame, s.displayEndFrameExclusive]),
    [[0, 17, 0, 17], [17, 40, 29, 52], [40, 100, 64, 124]]);
  assert.deepEqual(p.insertedSpans.map(s => [s.playbackSampleCount, s.observationSampleCount]), [[17640, 6400], [17640, 6400]]);
  assert.equal(p.retainedSpans[1].sourceStartSample, 17 * 1470);
  assert.equal(assertProjectionMatchesStateV001({projection: JSON.parse(JSON.stringify(p)), ...source}), true);
  assert.ok(Object.isFrozen(p.connections[0]));
});

test('48kHz regression preserves 1600 samples/frame and 19200 samples/12 frames', () => {
  const p = createOrchestrationProjectionV001(fixture({playbackSampleRate: 48000}));
  assert.equal(p.sourcePlaybackSampleCount, 160000);
  assert.equal(p.displayPlaybackSampleCount, 198400);
  assert.equal(p.retainedSpans[1].sourceStartSample, 27200);
  assert.equal(p.insertedSpans[0].playbackSampleCount, 19200);
  assert.equal(p.insertedSpans[0].observationSampleCount, 6400);
});

test('Normal consumes no frame/sample insertion and remains explicit in identity', () => {
  const p = createOrchestrationProjectionV001(fixture({presets: ['normal-cut', 'normal-cut']}));
  assert.equal(p.displayFrameCount, p.sourceFrameCount); assert.equal(p.insertedSpans.length, 0);
  assert.equal(p.connections.length, 2);
  assert.deepEqual(p.retainedSpans.map(s => s.shiftFrames), [0, 0, 0]);
  assert.equal(projectOriginalFrameV001({projection: p, point: frame(p, 17)}).displayFrame, 17);
});

test('frame and integral PCM boundary points belong to the following retained segment', () => {
  const p = createOrchestrationProjectionV001(fixture());
  assert.equal(projectOriginalFrameV001({projection: p, point: frame(p, 16)}).displayFrame, 16);
  assert.equal(projectOriginalFrameV001({projection: p, point: frame(p, 17)}).displayFrame, 29);
  const boundary = 17 * 1470;
  assert.equal(projectOriginalSampleV001({projection: p, point: sample(p, boundary - 1, 44100)}).displaySample, boundary - 1);
  assert.equal(projectOriginalSampleV001({projection: p, point: sample(p, boundary, 44100)}).displaySample, boundary + 17640);
  assert.throws(() => projectOriginalFrameV001({projection: p, point: frame(p, 100)}), /outside retained presentation/);
});

test('16kHz comparison uses sample cross-products before any frame rounding', () => {
  const p = createOrchestrationProjectionV001(fixture());
  // The first boundary is sample 9066 + 2/3. Rounding 9066 to the nearest
  // video frame first would falsely shift this retained, pre-boundary point.
  const before = projectOriginalSampleV001({projection: p, point: sample(p, 9066)});
  const after = projectOriginalSampleV001({projection: p, point: sample(p, 9067)});
  assert.equal(before.displaySample, 9066); assert.equal(before.displayFrame, 16);
  assert.equal(after.displaySample, 15467); assert.equal(after.displayFrame, 29);
  assert.deepEqual(after.playbackSample, rat(6820947, 160));
  const exact = createOrchestrationProjectionV001(fixture({lengths: [18, 22, 60]}));
  assert.equal(projectOriginalSampleV001({projection: exact, point: sample(exact, 9600)}).displaySample, 16000);
});

test('exclusive caption ends remain before black while following captions start after it', () => {
  const f = fixture(), p = createOrchestrationProjectionV001(f);
  const before = projectCaptionIntervalV001({projection: p, caption: caption(p, 0, 17)});
  const after = projectCaptionIntervalV001({projection: p, caption: caption(p, 17, 40)});
  assert.deepEqual([before.startFrame, before.endFrameExclusive, before.displayFrameCount], [0, 17, 17]);
  assert.deepEqual([after.startFrame, after.endFrameExclusive, after.displayFrameCount, after.motionStartFrame], [29, 52, 23, 29]);
  const view = projectCaptionPlanV001({projection: p, planBytes: f.planBytes});
  const originalPlan = JSON.parse(f.planBytes);
  for (let i = 0; i < view.plan.elements.length; i++) {
    const {startFrame, endFrameExclusive, ...actual} = view.plan.elements[i];
    const {startFrame: ignoredStart, endFrameExclusive: ignoredEnd, ...expected} = originalPlan.elements[i];
    assert.deepEqual(actual, expected);
  }
  assert.equal(hash(f.planBytes), f.planRef.fileSha256);
  assert.equal(assertProjectedTimingV001({projection: p, kind: 'caption-plan', original: f.planBytes, projected: view}), true);
});

test('captions crossing any retained boundary are rejected, including Normal boundaries', () => {
  for (const presets of [['black-separator', 'soft-separator'], ['normal-cut', 'normal-cut']]) {
    assert.throws(() => createOrchestrationProjectionV001(fixture({presets,
      changePlan: plan => {plan.elements[0].endFrameExclusive = 18; plan.elements[0].displayFrameCount = 18;}})), /caption crosses/);
  }
  const p = createOrchestrationProjectionV001(fixture());
  assert.throws(() => projectCaptionIntervalV001({projection: p, caption: caption(p, 16, 18)}), /caption crosses/);
});

test('audio candidate splits across rational retained boundaries and excludes black', () => {
  const p = createOrchestrationProjectionV001(fixture());
  const original = interval(p, 9000, 9200), unchanged = copy(original);
  const projected = projectAudioEvidenceIntervalV001({projection: p, interval: original});
  assert.deepEqual(original, unchanged); assert.deepEqual(projected.source, unchanged);
  assert.equal(projected.parts.length, 2); assert.deepEqual(projected.excludedParts, []);
  assert.deepEqual(projected.parts[0].sourceEndSampleExclusive, rat(27200, 3));
  assert.deepEqual(projected.parts[1].sourceStartSample, rat(27200, 3));
  assert.deepEqual(projected.parts[0].displayEndSampleExclusive, rat(27200, 3));
  assert.deepEqual(projected.parts[1].displayStartSample, rat(46400, 3));
  assert.deepEqual(projected.parts[0].playbackEndSampleExclusive, rat(24990));
  assert.deepEqual(projected.parts[1].playbackStartSample, rat(42630));
  assert.deepEqual(projected.parts[1].displayEndSampleExclusive, rat(15600));
  assert.equal(projected.parts.some(part => part.segmentId === 'black'), false);
});

test('AAC observation tail stays in source evidence, outside display evidence', () => {
  const p = createOrchestrationProjectionV001(fixture());
  const input = interval(p, 53000, 54000);
  const result = projectAudioEvidenceIntervalV001({projection: p, interval: input});
  assert.equal(result.source.endSampleExclusive, 54000);
  assert.equal(result.parts.length, 1);
  assert.deepEqual(result.parts[0].sourceEndSampleExclusive, rat(160000, 3));
  assert.deepEqual(result.parts[0].playbackEndSampleExclusive, rat(182280));
  assert.deepEqual(result.excludedParts, [{reason: 'outside-presentation-tail',
    sourceStartSample: rat(160000, 3), sourceEndSampleExclusive: rat(54000)}]);
  const tailOnly = projectAudioEvidenceIntervalV001({projection: p, interval: interval(p, 54000, 55000)});
  assert.equal(tailOnly.parts.length, 0); assert.equal(tailOnly.excludedParts.length, 1);
  assert.throws(() => projectAudioPeakV001({projection: p, peak: peak(p, 53334)}), /outside retained presentation/);
});

test('Pulse preserves original observed peak identity and derives one display anchor', () => {
  const p = createOrchestrationProjectionV001(fixture()), original = peak(p, 22400);
  const result = projectAudioPeakV001({projection: p, peak: original});
  assert.equal(result.peakId, original.peakId); assert.deepEqual(result.source, original);
  assert.equal(result.displaySample, 35200); assert.equal(result.displayFrame, 66);
  assert.deepEqual(result.playbackSample, rat(97020));
  assert.equal(assertProjectedTimingV001({projection: p, kind: 'audio-peak', original, projected: result}), true);
});

test('serialized projections reject wrong versions, source clocks, tampering and projection reinput', () => {
  const f = fixture(), p = createOrchestrationProjectionV001(f);
  const output = projectOriginalFrameV001({projection: p, point: frame(p, 17)});
  assert.throws(() => projectOriginalFrameV001({projection: p, point: output}), /fields|already projected/);
  assert.throws(() => projectOriginalFrameV001({projection: p, point: {...frame(p, 17), clock: 'digest-display'}}), /already projected/);
  assert.throws(() => projectOriginalFrameV001({projection: p, point: {...frame(p, 17), sourceClockSha256: 'c'.repeat(64)}}), /source clock/);
  assert.throws(() => projectOriginalFrameV001({projection: {...p, schemaVersion: 'v002'}, point: frame(p, 17)}), /version/);
  assert.throws(() => projectOriginalFrameV001({projection: {...p, displayFrameCount: 1}, point: frame(p, 17)}), /SHA differs/);
  const view = projectCaptionPlanV001({projection: p, planBytes: f.planBytes});
  assert.throws(() => projectCaptionPlanV001({projection: p, planBytes: bytes(view.plan)}), /source SHA differs/);
});

test('Black to Soft changes identity despite identical time; current-state and source bindings reject stale views', () => {
  const f = fixture(), black = createOrchestrationProjectionV001(f);
  const changed = {...f, connections: f.connections.map((row, i) => i ? row : {...row, preset: 'soft-separator'})};
  const soft = createOrchestrationProjectionV001(changed);
  assert.equal(black.displayFrameCount, soft.displayFrameCount);
  assert.notEqual(black.projectionSha256, soft.projectionSha256);
  assert.equal(black.sourceClockSha256, soft.sourceClockSha256);
  assert.throws(() => assertProjectionMatchesStateV001({projection: black, ...changed}), /stale projection/);
  const sourceChanged = {...f, digestRef: {...f.digestRef, version: 'synthetic-digest-v002'}};
  assert.throws(() => assertProjectionMatchesStateV001({projection: black, ...sourceChanged}), /stale projection/);
  assert.equal(createOrchestrationProjectionV001({...f, connections: [...f.connections].reverse()}).projectionSha256, black.projectionSha256);
  assert.throws(() => createOrchestrationProjectionV001({...f, connections: f.connections.slice(1)}), /coverage/);
  assert.throws(() => createOrchestrationProjectionV001({...f, mediaRef: {...f.mediaRef, fileSha256: 'd'.repeat(64)}}), /media SHA/);
  assert.throws(() => createOrchestrationProjectionV001({...f, connections: [f.connections[0], f.connections[0]]}), /duplicate/);
  assert.throws(() => createOrchestrationProjectionV001({...f, observationSampleRate: 48000}), /observation clock/);
});

test('five clock faults reject: omitted shift, double shift, old peak, old motion start and stale state', () => {
  const f = fixture(), p = createOrchestrationProjectionV001(f), original = caption(p, 17, 40);
  const correct = projectCaptionIntervalV001({projection: p, caption: original});
  for (const shift of [-12, 12]) {
    const broken = {...correct, startFrame: correct.startFrame + shift, endFrameExclusive: correct.endFrameExclusive + shift};
    assert.throws(() => assertProjectedTimingV001({projection: p, kind: 'caption', original, projected: broken}), /timing differs/);
  }
  const measured = peak(p, 22400), correctPeak = projectAudioPeakV001({projection: p, peak: measured});
  assert.throws(() => assertProjectedTimingV001({projection: p, kind: 'audio-peak', original: measured,
    projected: {...correctPeak, displaySample: measured.sample, displayFrame: 42}}), /timing differs/);
  assert.throws(() => assertProjectedTimingV001({projection: p, kind: 'motion-start', original,
    projected: {...correct, motionStartFrame: original.startFrame}}), /timing differs/);
  const changed = createOrchestrationProjectionV001({...f, connections: f.connections.map(row => ({...row, preset: 'normal-cut'}))});
  assert.throws(() => assertProjectedTimingV001({projection: changed, kind: 'caption', original, projected: correct}), /stale/);
});

test('existing connection resolver refuses overlapping Soft windows; projection cannot bypass it', () => {
  assert.throws(() => createOrchestrationProjectionV001(fixture({lengths: [17, 11, 60],
    presets: ['soft-separator', 'soft-separator']})), /soft windows overlap/);
});
