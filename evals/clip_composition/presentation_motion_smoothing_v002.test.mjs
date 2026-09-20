import assert from 'node:assert/strict';
import test from 'node:test';
import {PRESENTATION_CAPTION_MOTION_PRESETS_V001, getPresentationCaptionMotionProgramV001,
  buildPresentationCaptionMotionStateElementsV001} from './presentation_caption_motion_v001.mjs';
import {PRESENTATION_PULSE_PRESET_V001, getPresentationPulseProgramV001,
  buildPresentationPulseStateElementsV001, resolvePresentationPulseTimingV001} from './presentation_pulse_v001.mjs';

const canvas = {width: 1920, height: 1080, fps: 30};
const caption = (startFrame, displayFrameCount = 90) => ({
  instructionId: 'fixed-content', kind: 'speech-caption', text: '本文と\n改行を守る',
  indexedLines: [{lineIndex: 0, sourceText: '本文と'}, {lineIndex: 1, sourceText: '改行を守る'}],
  sourceRef: {instructionId: 'original'}, startFrame, endFrameExclusive: startFrame + displayFrameCount,
  displayFrameCount, visualState: {textStyle: {fontSizePx: 96, fontColor: '#ffffff'},
    position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6}},
});
const geometryAt = (program, states, frame) => {
  const segment = program.segments.filter(row => row.startFrame <= frame && frame < row.endFrameExclusive);
  assert.equal(segment.length, 1, 'each visible frame has exactly one state');
  return states.find(row => row.state === segment[0].state).element.visualState;
};
const assertOnlyScaleChanged = (element, states, metadataKey) => {
  const normal = structuredClone(element); delete normal[metadataKey];
  for (const row of states) {
    const observed = structuredClone(row.element); observed.visualState.textStyle.fontSizePx = 96;
    assert.deepEqual(observed, normal, 'text, explicit lines, original interval, source and anchor stay fixed');
  }
};

test('Bounce fills each old interval midpoint while retaining its extrema, maximum hold and return clock', () => {
  for (const startFrame of [0, 13, 1000]) {
    const element = {...caption(startFrame), presentationMotion: {
      presentation: 'provisional-bounce', presetVersion: 'presentation-caption-motion-v002'}};
    const before = structuredClone(element);
    const program = getPresentationCaptionMotionProgramV001({element, canvas});
    const states = buildPresentationCaptionMotionStateElementsV001({element, canvas});
    const sizes = Array.from({length: 9}, (_, offset) =>
      geometryAt(program, states, startFrame + offset).textStyle.fontSizePx);
    assert.deepEqual(sizes, [88, 96, 104, 108, 112, 112, 104, 100, 96]);
    assert.equal(sizes[1], (sizes[0] + sizes[2]) / 2);
    assert.equal(sizes[3], (sizes[2] + sizes[4]) / 2);
    assert.equal(sizes[7], (sizes[6] + sizes[8]) / 2);
    assert.deepEqual(sizes.flatMap((size, offset) => size === 112 ? [offset] : []), [4, 5]);
    assert.equal(program.stableStartFrame, startFrame + 8);
    assert.equal(program.representativeFrame, startFrame + 4);
    assert.equal(Math.max(...sizes.slice(1).map((size, index) => Math.abs(size - sizes[index]))), 8);
    assertOnlyScaleChanged(element, states, 'presentationMotion');
    assert.deepEqual(element, before);
    const stale = structuredClone(element); stale.presentationMotion.presetVersion = 'presentation-caption-motion-v001';
    assert.throws(() => getPresentationCaptionMotionProgramV001({element: stale, canvas}), /preset version/);
  }
});

test('Pulse linearly fills the rise and fall, preserving the measured peak and all four maximum frames', () => {
  for (const startFrame of [0, 71, 1000]) {
    const anchorFrame = startFrame + 47;
    const element = {...caption(startFrame), presentationPulse: {
      presentation: 'provisional-pulse', anchorPeakId: 'saved-measured-peak', anchorFrame}};
    const before = structuredClone(element);
    const program = getPresentationPulseProgramV001({element, canvas});
    const states = buildPresentationPulseStateElementsV001({element, canvas});
    const sizes = Array.from({length: 12}, (_, index) =>
      geometryAt(program, states, anchorFrame - 5 + index).textStyle.fontSizePx);
    assert.deepEqual(sizes, [96, 104, 112, 120, 128, 128, 128, 128, 120, 112, 104, 96]);
    assert.deepEqual(sizes.flatMap((size, index) => size === 128 ? [index - 5] : []), [-1, 0, 1, 2]);
    assert.equal(program.pulseStartFrame, anchorFrame - 4);
    assert.equal(program.pulseEndFrameExclusive, anchorFrame + 6);
    assert.equal(program.maximumFrame, anchorFrame);
    assert.equal(program.normalAfterFrame, anchorFrame + 6);
    assert.deepEqual(program.samples.map(row => row.frame), Array.from({length: 12}, (_, index) => anchorFrame - 5 + index));
    assert.equal(Math.max(...sizes.slice(1).map((size, index) => Math.abs(size - sizes[index]))), 8);
    const measured = resolvePresentationPulseTimingV001({element, canvas, sampleRate: 48000,
      peakSample: anchorFrame * 1600 + 1599});
    assert.deepEqual(measured, program, 'sample-to-frame floor mapping stays exact');
    assertOnlyScaleChanged(element, states, 'presentationPulse');
    assert.deepEqual(element, before);
  }
  assert.equal(PRESENTATION_PULSE_PRESET_V001.version, 'presentation-pulse-preset-v002');
});

test('Shake keeps its saved horizontal excursion and never scales the caption', () => {
  const element = {...caption(37), presentationMotion: {
    presentation: 'provisional-shake', presetVersion: 'presentation-caption-motion-v002'}};
  const program = getPresentationCaptionMotionProgramV001({element, canvas});
  const states = buildPresentationCaptionMotionStateElementsV001({element, canvas});
  const positions = Array.from({length: 13}, (_, offset) => geometryAt(program, states, 37 + offset).position.offsetXPercent * canvas.width / 100);
  assert.deepEqual(positions, [-12, -12, 12, 12, -8, -8, 8, 8, -4, -4, 4, 4, 0]);
  assert(states.every(row => row.element.visualState.textStyle.fontSizePx === 96));
  assert.equal(program.stableStartFrame, 49);
  assert.equal(PRESENTATION_CAPTION_MOTION_PRESETS_V001.shake.motionFrameCount, 12);
});
