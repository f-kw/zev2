import assert from 'node:assert/strict';
import test from 'node:test';
import {getPresentationCaptionMotionProgramV001 as motion,
  buildPresentationCaptionMotionStateElementsV001 as motionStates,
  PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001 as bounceReturn}
  from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {getPresentationPulseProgramV001 as pulse,
  buildPresentationPulseStateElementsV001 as pulseStates,
  resolvePresentationPulseSpeechReturnTimingV001 as resolvePulseReturn,
  PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001 as pulseReturn}
  from '../../evals/clip_composition/presentation_pulse_v001.mjs';

const canvas = {width: 1920, height: 1080, fps: 30};
const caption = (startFrame, endFrameExclusive) => ({instructionId: 'saved-caption', kind: 'speech-caption',
  text: '保存本文', indexedLines: [{lineIndex: 0, text: '保存本文'}],
  startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame,
  visualState: {textStyle: {fontSizePx: 96, fontColor: '#FFFDF8'},
    position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6}}});
const bounce = (speechEndFrame = 37) => ({...caption(13, 37), presentationMotion: {
  presentation: 'provisional-bounce', presetVersion: bounceReturn.version, speechEndFrame}});
const measured = (speechEndFrame = 154) => ({...caption(71, 154), presentationPulse: {
  presentation: 'provisional-pulse', presetVersion: pulseReturn.version,
  anchorPeakId: 'audio-peak-000020', anchorFrame: 118, speechEndFrame}});
const at = (program, frame) => program.segments.find(row => row.startFrame <= frame && frame < row.endFrameExclusive)?.state;
const sizeAt = (program, states, frame) => states.find(row => row.state === at(program, frame)).element.visualState.textStyle.fontSizePx;

test('explicit phrase-end presets preserve starts and maxima and return visibly near the saved end', () => {
  const cases = [[bounce(), motion, motionStates, 13, 17, 112, 32],
    [measured(), pulse, pulseStates, 114, 118, 128, 149]];
  for (const [element, programOf, statesOf, start, maximum, maximumSize, normal] of cases) {
    const before = structuredClone(element), program = programOf({element, canvas}), states = statesOf({element, canvas});
    assert.equal(program.speechEndFrame, element.endFrameExclusive);
    assert.equal(program.pulseStartFrame ?? program.segments[0].startFrame, start);
    assert.equal(program.maximumFrame ?? program.representativeFrame, maximum);
    assert.equal(sizeAt(program, states, maximum), maximumSize);
    assert.equal(program.normalAfterFrame ?? program.stableStartFrame, normal);
    assert.equal(sizeAt(program, states, normal), 96);
    assert.equal(sizeAt(program, states, element.endFrameExclusive - 4), 96);
    assert(normal < element.endFrameExclusive - 4, 'normal must already be present before the exit fade');
    assert.equal(Math.max(...states.map(row => row.element.visualState.textStyle.fontSizePx)), maximumSize);
    for (let frame = start + 1; frame <= normal; frame++) {
      assert(Math.abs(sizeAt(program, states, frame) - sizeAt(program, states, frame - 1)) <= 8,
        `an improved intermediate size was skipped at ${frame}`);
    }
    for (const state of states) {
      const restored = structuredClone(state.element); restored.visualState.textStyle.fontSizePx = 96;
      const {presentationMotion: _motion, presentationPulse: _pulse, ...expected} = element;
      assert.deepEqual(restored, expected, 'only the finite drawing size may change');
    }
    assert.deepEqual(element, before);
  }
});

test('speech end is independent of display end and no old saved preset is implicitly converted', () => {
  const earlier = measured(142), program = pulse({element: earlier, canvas});
  assert.equal(program.normalAfterFrame, 142);
  assert.equal(program.speechEndFrame, 142);
  const oldBounce = bounce(); delete oldBounce.presentationMotion.speechEndFrame;
  oldBounce.presentationMotion.presetVersion = 'presentation-caption-motion-v002';
  assert.equal(motion({element: oldBounce, canvas}).stableStartFrame, 21);
  const oldPulse = measured(); delete oldPulse.presentationPulse.speechEndFrame; delete oldPulse.presentationPulse.presetVersion;
  assert.equal(pulse({element: oldPulse, canvas}).normalAfterFrame, 124);
  const shake = {...caption(37, 71), presentationMotion: {
    presentation: 'provisional-shake', presetVersion: 'presentation-caption-motion-v002'}};
  const oldShake = motion({element: shake, canvas});
  assert.equal(oldShake.stableStartFrame, 49);
  assert.deepEqual(oldShake.segments.map(row => row.state),
    ['left-12', 'right-12', 'left-8', 'right-8', 'left-4', 'right-4', 'stable']);
  for (const state of motionStates({element: shake, canvas})) assert.equal(state.element.visualState.textStyle.fontSizePx, 96);
});

test('an added source prefix shifts starts, peak and speech end exactly once without changing the phase', () => {
  for (const [element, run] of [[bounce(), motion], [measured(), pulse]]) {
    const original = run({element, canvas}), shifted = structuredClone(element), delta = 11;
    shifted.startFrame += delta; shifted.endFrameExclusive += delta;
    const metadata = shifted.presentationMotion ?? shifted.presentationPulse;
    metadata.speechEndFrame += delta;
    if (Object.hasOwn(metadata, 'anchorFrame')) metadata.anchorFrame += delta;
    const actual = run({element: shifted, canvas});
    for (let frame = element.startFrame; frame < element.endFrameExclusive; frame++) {
      assert.equal(at(actual, frame + delta), at(original, frame));
    }
    assert.deepEqual(actual.segments, original.segments.map(row => ({...row,
      startFrame: row.startFrame + delta, endFrameExclusive: row.endFrameExclusive + delta})));
  }
  const bound = resolvePulseReturn({element: measured(), canvas, peakSample: 63040, sampleRate: 16000, speechEndFrame: 154});
  assert.equal(bound.anchorFrame, 118);
  assert.equal(bound.normalAfterFrame, 149);
  const shifted = measured(165); shifted.startFrame += 11; shifted.endFrameExclusive += 11;
  const shiftedBound = resolvePulseReturn({element: shifted, canvas, peakSample: 63040,
    sampleRate: 16000, speechEndFrame: 165, frameOffset: 11});
  assert.equal(shiftedBound.anchorFrame, 129);
  assert.equal(shiftedBound.normalAfterFrame, 160);
});

test('unbound or impossible speech ends, arbitrary drawing fields and application to Shake fail closed', () => {
  for (const [element, run, key] of [[bounce(), motion, 'presentationMotion'], [measured(), pulse, 'presentationPulse']]) {
    for (const value of [undefined, null, -1, 0, 17, 118, 1000, 1.5, NaN]) {
      const broken = structuredClone(element); broken[key].speechEndFrame = value;
      // 118 is a legitimate earlier return only for a long Pulse's end constraint;
      // here it is equal to its peak, and is outside the Bounce caption.
      assert.throws(() => run({element: broken, canvas}), TypeError);
    }
    const extra = structuredClone(element); extra[key].curve = 'free';
    assert.throws(() => run({element: extra, canvas}), TypeError);
  }
  const shake = bounce(); shake.presentationMotion.presentation = 'provisional-shake';
  assert.throws(() => motion({element: shake, canvas}), TypeError);
  assert.throws(() => resolvePulseReturn({element: measured(), canvas, peakSample: 63040, sampleRate: 16000}), TypeError);
  for (const frameOffset of [null, -1, 0.5, NaN]) assert.throws(() => resolvePulseReturn({element: measured(), canvas,
    peakSample: 63040, sampleRate: 16000, speechEndFrame: 154, frameOffset}), TypeError);
});
