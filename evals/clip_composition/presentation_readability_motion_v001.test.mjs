import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {
  PRESENTATION_CAPTION_MOTION_PRESETS_V001,
  PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001,
  PRESENTATION_CAPTION_MOTION_READABILITY_PRESETS_V001,
  getPresentationCaptionMotionPresetV001,
  getPresentationCaptionMotionProgramV001,
  buildPresentationCaptionMotionStateElementsV001,
  assertPresentationCaptionMotionLayoutsV001,
} from './presentation_caption_motion_v001.mjs';
import {
  PRESENTATION_PULSE_PRESET_V001,
  PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001,
  PRESENTATION_PULSE_READABILITY_PRESET_V001,
  resolvePresentationPulseTimingV001,
  getPresentationPulsePresetV001,
  getPresentationPulseProgramV001,
  buildPresentationPulseStateElementsV001,
  assertPresentationPulseAnchorsV001,
} from './presentation_pulse_v001.mjs';

const canvas = {width: 1920, height: 1080, fps: 30};
const clone = value => structuredClone(value);
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normal = size => ({instructionId: 'readability-caption', kind: 'speech-caption', text: '本文と時計を保持',
  indexedLines: [{lineIndex: 0, text: '本文と時計を保持'}],
  startFrame: 30, endFrameExclusive: 120, displayFrameCount: 90,
  sourceMapping: {fragmentIds: ['source-fragment-1'], startMs: 1000, endMs: 4000},
  transition: {entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}},
  visualState: {textStyle: {fontSizePx: size, fontColor: '#FFFDF8', borderColor: '#2F4F4F',
    borderWidthPx: 4, glowWidthPx: 4},
  position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6}}});
const motion = (kind, readability) => ({...normal(readability ? 144 : 96), presentationMotion: {
  presentation: `provisional-${kind}`, presetVersion: (readability
    ? PRESENTATION_CAPTION_MOTION_READABILITY_PRESETS_V001 : PRESENTATION_CAPTION_MOTION_PRESETS_V001)[kind].version}});
const pulse = readability => ({...normal(readability ? 144 : 96), presentationPulse: {
  presentation: 'provisional-pulse', anchorPeakId: 'measured-peak', anchorFrame: 60,
  ...(readability ? {presetVersion: PRESENTATION_PULSE_READABILITY_PRESET_V001.version} : {})}});
const normalizeStates = (program, from, to) => {
  const names = new Map(from.states.map((state, index) => [state.state, to.states[index].state]));
  return {...program, presetVersion: to.version,
    segments: program.segments.map(row => ({...row, state: names.get(row.state)})),
    samples: program.samples.map(row => ({...row, expectedState: names.get(row.expectedState)}))};
};

test('readability opt-in preserves the four saved finite definitions byte for byte', () => {
  for (const [value, expected] of [
    [PRESENTATION_CAPTION_MOTION_PRESETS_V001, '45689944d8a7354c6eae01d384c1aa8bef0492889ae8073cbddbe0d8de3cf78c'],
    [PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001, 'aa1c1192840dacc4524dced1882f5269a3f5c051ecc00b4b25843efb5f7c549c'],
    [PRESENTATION_PULSE_PRESET_V001, '469b63df1f28564449824cbbf35ae784c0befdbbc6f5fe03a92c4e11fc623daa'],
    [PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001, '4bc71b4de3c384c7b6ca5ac0be7a1ee6248eae172bc507eb63472fa7765c39e8'],
  ]) assert.equal(sha(value), expected);
});

test('144 px Bounce and Shake retain every frame, order, caption field and relative geometry', () => {
  for (const kind of ['bounce', 'shake']) {
    const element = motion(kind, true), before = clone(element), oldElement = motion(kind, false);
    const current = getPresentationCaptionMotionPresetV001({element, canvas});
    const previous = getPresentationCaptionMotionPresetV001({element: oldElement, canvas});
    const program = getPresentationCaptionMotionProgramV001({element, canvas});
    const oldProgram = getPresentationCaptionMotionProgramV001({element: oldElement, canvas});
    assert.deepEqual(normalizeStates(program, current, previous), oldProgram);
    assert.equal(current.commonFadeFrames, 4);
    assert.equal(current.minimumDisplayFrames, previous.minimumDisplayFrames);
    for (const [index, state] of current.states.entries()) {
      assert.equal(state.fontSizePx * 96, previous.states[index].fontSizePx * 144);
      assert.equal(state.offsetXPx * 96, previous.states[index].offsetXPx * 144);
    }
    const states = buildPresentationCaptionMotionStateElementsV001({element, canvas});
    assert.deepEqual(states.map(row => row.element.visualState.textStyle.fontSizePx),
      kind === 'bounce' ? [144, 132, 156, 168, 162, 150] : [144, 144, 144, 144, 144, 144, 144]);
    assert.deepEqual(states.map(row => row.element.visualState.position.offsetXPercent * canvas.width / 100),
      kind === 'bounce' ? [0, 0, 0, 0, 0, 0] : [0, -18, 18, -12, 12, -6, 6]);
    for (const row of states) {
      const restored = clone(row.element);
      restored.visualState.textStyle.fontSizePx = 144;
      restored.visualState.position.offsetXPercent = 0;
      assert.deepEqual(restored, normal(144));
    }
    assert.deepEqual(element, before);
  }
});

test('new motion requires an explicit known version and rejects clamped or incomplete geometry', () => {
  for (const kind of ['bounce', 'shake']) {
    const element = motion(kind, true);
    for (const version of ['unknown', undefined, null, PRESENTATION_CAPTION_MOTION_PRESETS_V001[kind].version]) {
      const invalid = clone(element); invalid.presentationMotion.presetVersion = version;
      assert.throws(() => getPresentationCaptionMotionProgramV001({element: invalid, canvas}), TypeError);
    }
    for (const mutate of [
      row => {row.visualState.textStyle.fontSizePx = 96;},
      row => {row.presentationMotion.fontSizePx = 144;},
      row => {row.presentationColorRange = {};},
      row => {row.endFrameExclusive = row.startFrame + 19; row.displayFrameCount = 19;},
    ]) {
      const invalid = clone(element); mutate(invalid);
      assert.throws(() => getPresentationCaptionMotionProgramV001({element: invalid, canvas}), TypeError);
    }
    const preset = getPresentationCaptionMotionPresetV001({element, canvas});
    const layouts = preset.states.map(state => ({wrapper: {
      left: 960 - state.fontSizePx / 2 + state.offsetXPx,
      top: 900 - state.fontSizePx, width: state.fontSizePx, height: state.fontSizePx}}));
    assert.doesNotThrow(() => assertPresentationCaptionMotionLayoutsV001({element, canvas, layoutItems: layouts}));
    for (const mutate of [rows => rows.pop(), rows => {rows[1].wrapper.left += 1;}, rows => {rows[1].wrapper.top += 1;}]) {
      const invalid = clone(layouts); mutate(invalid);
      assert.throws(() => assertPresentationCaptionMotionLayoutsV001({element, canvas, layoutItems: invalid}), TypeError);
    }
  }
});

test('144 px Pulse retains measured peak clocks, all finite states and caption content after save/reload', () => {
  const element = JSON.parse(JSON.stringify(pulse(true))), before = clone(element);
  const presetVersion = PRESENTATION_PULSE_READABILITY_PRESET_V001.version;
  const resolved = resolvePresentationPulseTimingV001({element: normal(144), canvas,
    peakSample: 600, sampleRate: 300, presetVersion});
  const program = getPresentationPulseProgramV001({element, canvas});
  assert.deepEqual(program, resolved);
  assert.deepEqual({...program, presetVersion: PRESENTATION_PULSE_PRESET_V001.version},
    getPresentationPulseProgramV001({element: pulse(false), canvas}));
  assert.equal(getPresentationPulsePresetV001({element, canvas}), PRESENTATION_PULSE_READABILITY_PRESET_V001);
  assert.equal(PRESENTATION_PULSE_READABILITY_PRESET_V001.commonFadeFrames, 4);
  const states = buildPresentationPulseStateElementsV001({element, canvas});
  assert.deepEqual(states.map(row => row.element.visualState.textStyle.fontSizePx), [144, 168, 192, 156, 180]);
  for (const [index, row] of states.entries()) {
    assert.equal(row.element.visualState.textStyle.fontSizePx * 96, PRESENTATION_PULSE_PRESET_V001.states[index].fontSizePx * 144);
    const restored = clone(row.element); restored.visualState.textStyle.fontSizePx = 144;
    assert.deepEqual(restored, normal(144));
  }
  const layouts = states.map(row => {const size = row.element.visualState.textStyle.fontSizePx;
    return {wrapper: {left: 960 - size / 2, top: 900 - size, width: size, height: size}};});
  assert.doesNotThrow(() => assertPresentationPulseAnchorsV001(layouts));
  layouts[2].wrapper.left += 1;
  assert.throws(() => assertPresentationPulseAnchorsV001(layouts), /anchor/);
  assert.deepEqual(element, before);
});

test('new Pulse cannot be selected implicitly or rescue invalid peak timing', () => {
  const version = PRESENTATION_PULSE_READABILITY_PRESET_V001.version;
  for (const presetVersion of ['unknown', null, undefined, PRESENTATION_PULSE_PRESET_V001.version]) {
    const invalid = pulse(true);
    invalid.presentationPulse.presetVersion = presetVersion;
    assert.throws(() => getPresentationPulseProgramV001({element: invalid, canvas}), TypeError);
  }
  const implicit = pulse(true); delete implicit.presentationPulse.presetVersion;
  assert.throws(() => getPresentationPulseProgramV001({element: implicit, canvas}), /96 px/);
  for (const presetVersion of [undefined, 'unknown', null]) {
    assert.throws(() => resolvePresentationPulseTimingV001({element: normal(144), canvas,
      peakSample: 600, sampleRate: 300, presetVersion}), TypeError);
  }
  for (const peakSample of [300, 1200, -1, 1.5]) assert.throws(() => resolvePresentationPulseTimingV001({
    element: normal(144), canvas, peakSample, sampleRate: 300, presetVersion: version}), TypeError);
  const wrongSize = pulse(true); wrongSize.visualState.textStyle.fontSizePx = 96;
  assert.throws(() => getPresentationPulseProgramV001({element: wrongSize, canvas}), /144 px/);
  const extra = pulse(true); extra.presentationPulse.scale = 1.5;
  assert.throws(() => getPresentationPulseProgramV001({element: extra, canvas}), TypeError);
});
