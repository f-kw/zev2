/** The two explicitly authorized development/final output sizes.
 * A proxy retains the saved 1080p logical layout and projects its entire raster
 * by 1/2. It never reflows captions or grants a final-render trust/quality pass.
 */
import assert from 'node:assert/strict';

const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
export const PRESENTATION_DEV_PROXY_PROFILE_V001 = freeze({
  schemaVersion: 'presentation-development-output-profile-v001',
  profileId: 'dev-proxy-540p-v001',
  purpose: 'development-structure-only',
  sourceCanvas: {width: 1920, height: 1080, fps: 30},
  outputCanvas: {width: 960, height: 540, fps: 30},
  pixelScale: 0.5,
  projection: 'whole-logical-canvas-at-rasterization',
  clocks: 'unchanged',
  finalPixelQc: 'not-run-dev-only',
  humanQuality: 'not-evaluated',
});
export const PRESENTATION_FINAL_OUTPUT_PROFILE_V001 = freeze({
  schemaVersion: 'presentation-development-output-profile-v001',
  profileId: 'final-1080p-v001',
  purpose: 'existing-final-render-contract-required',
  sourceCanvas: {width: 1920, height: 1080, fps: 30},
  outputCanvas: {width: 1920, height: 1080, fps: 30},
  pixelScale: 1,
  projection: 'existing-final-renderer',
  clocks: 'unchanged',
  finalPixelQc: 'required-by-existing-final-contract',
  humanQuality: 'not-granted-by-profile',
});

export function resolvePresentationDevelopmentProfileV001(profileId) {
  const profile = [PRESENTATION_DEV_PROXY_PROFILE_V001, PRESENTATION_FINAL_OUTPUT_PROFILE_V001]
    .find(value => value.profileId === profileId);
  assert(profile, 'unknown or missing explicit output profile');
  return profile;
}

export function assertPresentationDevProxyProfileV001(profileId) {
  const profile = resolvePresentationDevelopmentProfileV001(profileId);
  assert.equal(profile.profileId, PRESENTATION_DEV_PROXY_PROFILE_V001.profileId,
    'final output requires the existing final renderer and QC');
  return profile;
}

export function assertPresentationDevProxySourceCanvasV001(canvas) {
  assert.deepEqual({width: canvas?.width, height: canvas?.height, fps: canvas?.fps},
    PRESENTATION_DEV_PROXY_PROFILE_V001.sourceCanvas, 'proxy requires the saved 1080p logical canvas at 30fps');
}

/** Descriptive physical dimensions, not another executable plan/preset.
 * Percentages, state IDs, text ranges and all clocks stay in the source plan.
 * The rasterizer scales hard-coded padding/tile/clamp geometry as well, avoiding
 * a second independently rounded implementation of the saved layout rules.
 */
export function describePresentationDevProxyGeometryV001({profileId, plan}) {
  const profile = assertPresentationDevProxyProfileV001(profileId);
  assertPresentationDevProxySourceCanvasV001(plan.canvas);
  const spatial = (value, field) => {
    assert(Number.isFinite(value), 'invalid logical spatial value: ' + field);
    return {logicalPx: value, outputPx: value * profile.pixelScale};
  };
  return {
    profileId, sourceCanvas: profile.sourceCanvas, outputCanvas: profile.outputCanvas,
    pixelScale: profile.pixelScale, projection: profile.projection,
    safeArea: Object.fromEntries(Object.entries(plan.canvas.safeAreaPx)
      .map(([key, value]) => [key, spatial(value, key)])),
    captions: plan.elements.map(element => ({
      captionId: element.instructionId,
      textStyle: Object.fromEntries(['fontSizePx', 'borderWidthPx', 'glowWidthPx'].map(key =>
        [key, spatial(element.visualState.textStyle[key], key)])),
      background: element.visualState.background === null ? null : Object.fromEntries(
        ['borderRadiusPx', 'paddingXPx', 'paddingYPx'].map(key =>
          [key, spatial(element.visualState.background[key], key)])),
      offset: {
        x: spatial(plan.canvas.width * element.visualState.position.offsetXPercent / 100, 'offsetX'),
        y: spatial(plan.canvas.height * element.visualState.position.offsetYPercent / 100, 'offsetY'),
      },
    })),
  };
}
