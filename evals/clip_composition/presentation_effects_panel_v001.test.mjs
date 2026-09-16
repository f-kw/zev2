import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRESENTATION_EFFECT_TRIAL_PANEL_V001,
  resolvePresentationEffectsV001,
} from './presentation_effects_v001.mjs';

const plan = {
  canvas: {width: 1920, height: 1080, fps: 30},
  elements: [
    {
      instructionId: 'caption-1',
      kind: 'speech-caption',
      text: 'ここは仮の第三演出です',
      indexedLines: [{lineIndex: 0, text: 'ここは仮の第三演出です'}],
      startFrame: 30,
      endFrameExclusive: 90,
      displayFrameCount: 60,
      visualState: {
        textStyle: {fontSizePx: 94, fontColor: '#FFFDF8', fontAssetId: 'existing'},
        position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0},
        background: null,
      },
    },
    {
      instructionId: 'caption-2',
      kind: 'speech-caption',
      text: 'こちらは変更しません',
      indexedLines: [{lineIndex: 0, text: 'こちらは変更しません'}],
      startFrame: 90,
      endFrameExclusive: 150,
      displayFrameCount: 60,
      visualState: {
        textStyle: {fontSizePx: 94, fontColor: '#FFFDF8', fontAssetId: 'existing'},
        position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0},
        background: null,
      },
    },
  ],
};

const input = {plan, expectedFrameCount: 150};

test('provisional panel changes only the selected caption background', () => {
  const before = structuredClone(plan);
  const result = resolvePresentationEffectsV001({
    ...input,
    effects: {captions: [{captionId: 'caption-1', preset: 'panel'}]},
  });
  const expected = structuredClone(plan.elements[0]);
  expected.presentationPreset = 'panel';
  expected.visualState.background = {...PRESENTATION_EFFECT_TRIAL_PANEL_V001};
  assert.deepEqual(result.plan.elements[0], expected);
  assert.deepEqual(result.plan.elements[1], plan.elements[1]);
  assert.deepEqual(plan, before);
  assert.equal(result.expectedFrameCount, 150);
  assert.equal(result.presentationTimeline, null);
});

test('provisional panel does not alter text, time, position, or text style', () => {
  const result = resolvePresentationEffectsV001({
    ...input,
    effects: {captions: [{captionId: 'caption-1', preset: 'panel'}]},
  });
  const original = plan.elements[0];
  const selected = result.plan.elements[0];
  for (const field of ['instructionId', 'kind', 'text', 'indexedLines', 'startFrame', 'endFrameExclusive', 'displayFrameCount']) {
    assert.deepEqual(selected[field], original[field], field);
  }
  assert.deepEqual(selected.visualState.position, original.visualState.position);
  assert.deepEqual(selected.visualState.textStyle, original.visualState.textStyle);
});

test('panel remains a finite preset and rejects free drawing values', () => {
  assert.throws(() => resolvePresentationEffectsV001({
    ...input,
    effects: {captions: [{captionId: 'caption-1', preset: 'panel', color: 'red'}]},
  }), /presentation effects/);
  assert.throws(() => resolvePresentationEffectsV001({
    ...input,
    effects: {captions: [{captionId: 'caption-1', preset: 'background-accent'}]},
  }), /presentation effects/);
});
