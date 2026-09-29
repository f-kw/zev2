import assert from 'node:assert/strict';
import test from 'node:test';
import {PRESENTATION_DEV_PROXY_PROFILE_V001, PRESENTATION_FINAL_OUTPUT_PROFILE_V001,
  resolvePresentationDevelopmentProfileV001, assertPresentationDevProxyProfileV001,
  assertPresentationDevProxySourceCanvasV001, describePresentationDevProxyGeometryV001}
  from './presentation_dev_proxy_profile_v001.mjs';

test('only the explicit finite Dev and Final profiles resolve; a proxy cannot claim final QC', () => {
  for (const value of [undefined, null, '', '540p', 'dev-proxy-720p-v001', {}, 'candidate-readability-v001'])
    assert.throws(() => resolvePresentationDevelopmentProfileV001(value), /explicit output profile/);
  assert.equal(resolvePresentationDevelopmentProfileV001('dev-proxy-540p-v001'), PRESENTATION_DEV_PROXY_PROFILE_V001);
  assert.equal(resolvePresentationDevelopmentProfileV001('final-1080p-v001'), PRESENTATION_FINAL_OUTPUT_PROFILE_V001);
  assert.throws(() => assertPresentationDevProxyProfileV001('final-1080p-v001'), /existing final renderer and QC/);
  assert.equal(PRESENTATION_DEV_PROXY_PROFILE_V001.finalPixelQc, 'not-run-dev-only');
  assert.equal(PRESENTATION_FINAL_OUTPUT_PROFILE_V001.finalPixelQc, 'required-by-existing-final-contract');
  assert.throws(() => {PRESENTATION_DEV_PROXY_PROFILE_V001.outputCanvas.width = 1920;}, TypeError);
});

test('1080p logical canvas cannot be relabelled as a proxy or change its frame clock', () => {
  assertPresentationDevProxySourceCanvasV001({width: 1920, height: 1080, fps: 30});
  for (const canvas of [{width: 960, height: 540, fps: 30}, {width: 1920, height: 1080, fps: 60}, null])
    assert.throws(() => assertPresentationDevProxySourceCanvasV001(canvas));
});

test('the physical geometry description halves spatial values without editing saved text, states or clocks', () => {
  const plan = {canvas: {width: 1920, height: 1080, fps: 30, safeAreaPx: {left: 4, right: 4, top: 40, bottom: 40}},
    elements: [{instructionId: 'saved-child', text: '否定しない\n123', startFrame: 301, endFrameExclusive: 333,
      sourceStartMs: 12345, presentationColorRange: {startCodePoint: 0, endCodePointExclusive: 5},
      visualState: {textStyle: {fontSizePx: 144, borderWidthPx: 4, glowWidthPx: 4},
        position: {offsetXPercent: 1, offsetYPercent: -10},
        background: {paddingXPx: 24, paddingYPx: 16, borderRadiusPx: 8}}}]};
  const before = structuredClone(plan);
  const geometry = describePresentationDevProxyGeometryV001({profileId: 'dev-proxy-540p-v001', plan});
  assert.deepEqual(plan, before);
  assert.deepEqual(geometry.safeArea.top, {logicalPx: 40, outputPx: 20});
  assert.deepEqual(geometry.captions[0].textStyle.fontSizePx, {logicalPx: 144, outputPx: 72});
  assert.deepEqual(geometry.captions[0].background.paddingXPx, {logicalPx: 24, outputPx: 12});
  assert.deepEqual(geometry.captions[0].offset.x, {logicalPx: 19.2, outputPx: 9.6});
  assert.deepEqual(geometry.captions[0].offset.y, {logicalPx: -108, outputPx: -54});
});
