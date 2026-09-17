import assert from 'node:assert/strict';
import test from 'node:test';
import {getPresentationCaptionMotionProgramV001, buildPresentationCaptionMotionStateElementsV001,
  assertPresentationCaptionMotionLayoutsV001} from './presentation_caption_motion_v001.mjs';

const canvas = {width: 1920, height: 1080, fps: 30};
function caption(kind, frames = kind === 'bounce' ? 20 : 24) {
  return {instructionId: 'fixed-caption', kind: 'speech-caption', text: '先に条件を示す\nその後で進める',
    indexedLines: [{lineIndex: 0, sourceText: '先に条件を示す'}, {lineIndex: 1, sourceText: 'その後で進める'}],
    sourceRef: {instructionId: 'original-instruction'}, startFrame: 30, endFrameExclusive: 30 + frames,
    displayFrameCount: frames, visualState: {textStyle: {fontSizePx: 96, fontColor: '#ffffff'},
      position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6}},
    presentationMotion: {presentation: `provisional-${kind}`, presetVersion: 'presentation-caption-motion-v001'}};
}

test('entrances use the fixed subtitle clock, leave stable reading time, and preserve all caption content', () => {
  const expected = {
    bounce: ['small', 'small', 'middle', 'middle', 'maximum', 'maximum', 'middle', 'middle'],
    shake: ['left-12', 'left-12', 'right-12', 'right-12', 'left-8', 'left-8',
      'right-8', 'right-8', 'left-4', 'left-4', 'right-4', 'right-4'],
  };
  for (const kind of ['bounce', 'shake']) {
    const element = caption(kind), snapshot = structuredClone(element);
    const program = getPresentationCaptionMotionProgramV001({element, canvas});
    assert.deepEqual(program.samples.slice(0, expected[kind].length).map(row => row.expectedState), expected[kind]);
    assert.deepEqual(program.samples.map(row => row.frame), [
      ...expected[kind].map((_state, index) => 30 + index), 30 + expected[kind].length,
      element.endFrameExclusive - 5,
    ]);
    assert.deepEqual(program.segments.at(-1), {state: 'stable', startFrame: 30 + expected[kind].length,
      endFrameExclusive: element.endFrameExclusive});
    const states = buildPresentationCaptionMotionStateElementsV001({element, canvas});
    const {presentationMotion: _metadata, ...normal} = element;
    assert.deepEqual(states[0], {state: 'stable', element: normal});
    for (const state of states) {
      const actual = structuredClone(state.element);
      actual.visualState.textStyle.fontSizePx = 96;
      actual.visualState.position.offsetXPercent = 0;
      assert.deepEqual(actual, normal);
      assert.equal(state.element.visualState.position.offsetYPercent, -6);
    }
    assert.deepEqual(element, snapshot);
  }
});

test('short captions, arbitrary motion values, old presets and stacked expressions cannot enter drawing', () => {
  for (const kind of ['bounce', 'shake']) {
    const minimum = kind === 'bounce' ? 20 : 24;
    assert.throws(() => getPresentationCaptionMotionProgramV001({element: caption(kind, minimum - 1), canvas}), /do not fit/);
    const cases = [
      element => {element.presentationMotion.duration = 2;},
      element => {element.presentationMotion.presetVersion = 'old-version';},
      element => {element.presentationMotion.presentation = 'unlisted';},
      element => {element.presentationColorRange = {};},
      element => {element.presentationPulse = {};},
      element => {element.presentationPreset = 'reaction';},
      element => {element.visualState.position.offsetXPercent = 1;},
      element => {element.visualState.position.offsetYPercent = NaN;},
      element => {element.visualState.textStyle.fontSizePx = 128;},
      element => {element.endFrameExclusive++;},
    ];
    for (const mutate of cases) {
      const element = caption(kind); mutate(element);
      assert.throws(() => getPresentationCaptionMotionProgramV001({element, canvas}), TypeError);
    }
    assert.throws(() => getPresentationCaptionMotionProgramV001({element: caption(kind), canvas: {...canvas, fps: 60}}), /30 fps/);
  }
});

test('native layout must show the prescribed offsets and sizes without clamping or vertical drift', () => {
  const makeBox = (width, height, x = 0) => ({wrapper: {left: 960 - width / 2 + x, top: 900 - height, width, height}});
  const bounce = caption('bounce'), shake = caption('shake');
  const bounceLayouts = [makeBox(500, 140), makeBox(450, 130), makeBox(550, 150), makeBox(600, 160)];
  const shakeLayouts = [0, -12, 12, -8, 8, -4, 4].map(x => makeBox(500, 140, x));
  for (const [element, layoutItems] of [[bounce, bounceLayouts], [shake, shakeLayouts]]) {
    assert.doesNotThrow(() => assertPresentationCaptionMotionLayoutsV001({element, canvas, layoutItems}));
    for (const change of [
      rows => {rows[1].wrapper.left = rows[0].wrapper.left;},
      rows => {rows[1].wrapper.top += 1;},
      rows => {rows.pop();},
    ]) {
      const broken = structuredClone(layoutItems); change(broken);
      assert.throws(() => assertPresentationCaptionMotionLayoutsV001({element, canvas, layoutItems: broken}), TypeError);
    }
  }
  const sameSize = structuredClone(bounceLayouts); sameSize[2] = structuredClone(sameSize[0]);
  assert.throws(() => assertPresentationCaptionMotionLayoutsV001({element: bounce, canvas, layoutItems: sameSize}), /four fixed sizes/);
});
