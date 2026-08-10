import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
  PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
  PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_ID_V001,
  PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_PATH_V001,
  buildPresentationAV002VerticalCaptionDiagnosticStyleV001,
  buildPresentationAV002VerticalContainFilterV001,
  validatePresentationAV002VerticalCaptionDiagnosticStyleV001,
  validatePresentationAV002VerticalContainOutputV001,
  validatePresentationAV002VerticalDiagnosticPlanV001,
} from './presentation_a_v002_vertical_caption_diagnostic_v001.mjs';

const hex = character => character.repeat(64);

const sourcePresetBytes = await readFile(PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_PATH_V001);
const sourcePresetRegistry = JSON.parse(sourcePresetBytes.toString('utf8'));
const sourcePresetBinding = Object.freeze({
  path: PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_PATH_V001,
  fileSha256: createHash('sha256').update(sourcePresetBytes).digest('hex'),
});
const sourcePreset = sourcePresetRegistry.presets.find(
  entry => entry.presetId === PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_ID_V001,
);
const sourcePolicy = sourcePreset.kindPolicies.find(entry => entry.kind === 'speech-caption');
const sourceVisualState = sourcePreset.visualStates.find(
  entry => entry.stateId === sourcePolicy.stateId,
);

const buildStyle = () => buildPresentationAV002VerticalCaptionDiagnosticStyleV001({
  presetRegistry: sourcePresetRegistry,
  presetRegistryBinding: sourcePresetBinding,
});

const diagnosticPlan = () => {
  const style = buildStyle();
  const lines = ['これは字幕の', '跨ぎ診断です'];
  let sourceIndex = 0;
  return {
    style,
    plan: {
      canvas: structuredClone(style.canvas),
      layoutRules: structuredClone(style.layoutRules),
      elements: [{
        instructionId: 'diagnostic-caption-000001',
        text: lines.join(''),
        appliedPresetId: style.diagnosticId,
        stateId: style.resolvedStyle.visualStateId,
        visualState: structuredClone(style.layoutContext.visualState),
        indexedLines: lines.map((renderedText, lineIndex) => ({
          lineIndex,
          renderedText,
          characters: Array.from(renderedText).map(character => ({
            sourceIndex: sourceIndex++,
            character,
            codePoint: character.codePointAt(0),
            role: 'visible',
          })),
        })),
        startFrame: 0,
        displayFrameCount: 30,
      }],
    },
  };
};

test('AVD001: 縦型字幕診断IDと保証限界を固定する', () => {
  const style = buildStyle();
  assert.equal(style.diagnosticId, PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001);
  assert.equal(style.limitation, PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001);
  assert.equal(validatePresentationAV002VerticalCaptionDiagnosticStyleV001(style), true);
});

test('AVD002: 診断canvasを1080x1920・30fpsへ固定する', () => {
  const style = buildStyle();
  assert.deepEqual(style.canvas, {
    width: sourcePresetRegistry.canvas.width,
    height: sourcePresetRegistry.canvas.height,
    fps: sourcePresetRegistry.canvas.fps,
  });
  assert.deepEqual(style.safeAreaPx, sourcePresetRegistry.canvas.safeAreaPx);
  assert.equal(style.resolvedStyle.visualStateId, sourceVisualState.stateId);
  assert.deepEqual(style.layoutContext.visualState, sourceVisualState);
  assert.deepEqual(Object.keys(style.resolvedStyle), [
    'format', 'screenLayoutId', 'presetId', 'visualStateId',
    'maxLogicalWidthPerLine', 'maxLinesPerDisplayPage', 'characterWidthRule',
    'cropMode', 'sceneTransitionMode', 'audioMode',
  ]);
  assert.deepEqual(Object.keys(style.layoutContext), [
    'format', 'resolvedStyle', 'presetRegistry', 'presetRegistryBinding',
    'presetRegistryVersion', 'preset', 'policy', 'visualState', 'transition',
    'canvas', 'layoutRules', 'overlayAdapter',
  ]);
});

test('AVD003: 全画面containはsource pixelをcropせずpadする', () => {
  const result = buildPresentationAV002VerticalContainFilterV001({
    sourceWidth: 1920,
    sourceHeight: 1080,
    canvas: sourcePresetRegistry.canvas,
  });
  assert.equal(result.sourcePixelPolicy, 'contain-all-source-pixels-without-crop');
  assert.match(result.filter, /force_original_aspect_ratio=decrease/u);
  assert.match(result.filter, /pad=1080:1920/u);
  assert.doesNotMatch(result.filter, /crop=/u);
});

test('AVD004: 診断planは字幕本文を欠落・重複なく一度だけ保持する', () => {
  const {style, plan} = diagnosticPlan();
  assert.deepEqual(validatePresentationAV002VerticalDiagnosticPlanV001({plan, style}), {
    status: 'passed',
    diagnosticId: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
    elementCount: 1,
    text: 'これは字幕の跨ぎ診断です',
  });
  plan.elements[0].indexedLines[1].renderedText = '重複重複';
  assert.equal(validatePresentationAV002VerticalDiagnosticPlanV001({plan, style}).status, 'rejected');
});

test('AVD005: 診断styleを正式preset registryやscreen_speakerとして登録しない', () => {
  const style = buildStyle();
  assert.notEqual(style.presetRegistry.schemaVersion, 'presentation-preset-registry-v002');
  assert.notEqual(style.presetRegistry.registryVersion, 'vertical-short-preset-registry-v001');
  assert.equal(style.presetRegistry.presets[0].screenLayoutId, null);
  assert.equal(style.presetRegistry.presets[0].presetId, 'diagnostic-full-frame-contain-v001');
  assert.deepEqual(style.sourcePresetBinding, sourcePresetBinding);
  assert.deepEqual(style.presetRegistry.presets[0].visualStates[0], sourceVisualState);
  assert.equal(style.layoutContext.preset.screenLayoutId, 'speaker_only');
  assert.equal(style.layoutContext.presetRegistry.schemaVersion, 'presentation-preset-registry-v002');
  assert.equal(
    sourcePresetRegistry.presets.some(entry => (
      entry.presetId === PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001
    )),
    false,
  );
});

test('AVD006: 診断base mediaはframe・音声を維持した場合だけ合格する', () => {
  const source = {
    width: 1920,
    height: 1080,
    fps: 30,
    frameCount: 829,
    audioPacketPayloadSha256: hex('a'),
  };
  assert.deepEqual(validatePresentationAV002VerticalContainOutputV001({
    source,
    output: {
      width: 1080,
      height: 1920,
      fps: 30,
      frameCount: 829,
      audioPacketPayloadSha256: hex('a'),
    },
    canvas: {
      width: sourcePresetRegistry.canvas.width,
      height: sourcePresetRegistry.canvas.height,
      fps: sourcePresetRegistry.canvas.fps,
    },
  }), {
    status: 'passed',
    sourcePixelPolicy: 'contain-all-source-pixels-without-crop',
    frameCount: 829,
    audioPacketPayloadSha256: hex('a'),
  });
  assert.equal(validatePresentationAV002VerticalContainOutputV001({
    source,
    output: {
      width: 1080,
      height: 1920,
      fps: 30,
      frameCount: 828,
      audioPacketPayloadSha256: hex('a'),
    },
    canvas: {
      width: sourcePresetRegistry.canvas.width,
      height: sourcePresetRegistry.canvas.height,
      fps: sourcePresetRegistry.canvas.fps,
    },
  }).status, 'rejected');
});
