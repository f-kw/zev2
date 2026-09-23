import assert from 'node:assert/strict';
import {assertOrchestrationDrawingViewV001} from './presentation_orchestration_v001.mjs';

/** A range changes media coordinates only. Caption and finite-program clocks
 * remain on the validated complete projection. */
export function createOrchestrationRenderScopeV001(view, range = null) {
  assertOrchestrationDrawingViewV001(view);
  assert.equal(view.resolvedPlan.canvas.fps, 30);
  const playbackSampleRate = view.projection.sourceClock.playbackSampleRate;
  assert([44100, 48000].includes(playbackSampleRate));
  const playbackSamplesPerFrame = playbackSampleRate / view.resolvedPlan.canvas.fps;
  assert(Number.isSafeInteger(playbackSamplesPerFrame));
  const fullFrameCount = view.projection.displayFrameCount;
  const actual = range ?? {startFrame: 0, endFrameExclusive: fullFrameCount};
  assert.deepEqual(Object.keys(actual).sort(), ['endFrameExclusive', 'startFrame']);
  assert(Number.isSafeInteger(actual.startFrame) && actual.startFrame >= 0);
  assert(Number.isSafeInteger(actual.endFrameExclusive) && actual.endFrameExclusive > actual.startFrame
    && actual.endFrameExclusive <= fullFrameCount);
  const renderRange = range === null ? null : {...actual, fullFrameCount};
  const scope = {kind: range === null ? 'full' : 'range', ...actual, fullFrameCount,
    frameCount: actual.endFrameExclusive - actual.startFrame,
    viewSha256: view.viewSha256, projectionSha256: view.projection.projectionSha256,
    fourSavedSha256: view.fourSavedSha256,
    playbackStartSample: actual.startFrame * playbackSamplesPerFrame,
    playbackEndSampleExclusive: actual.endFrameExclusive * playbackSamplesPerFrame};
  return {scope, renderRange,
    normalPlan: scopeOrchestrationPlanV001(view.projectedNormalPlan, renderRange),
    resolvedPlan: scopeOrchestrationPlanV001(view.resolvedPlan, renderRange)};
}

export function assertPresentationRenderRangeV001(range, expectedFrameCount) {
  if (range === null) return;
  assert.deepEqual(Object.keys(range).sort(), ['endFrameExclusive', 'fullFrameCount', 'startFrame']);
  assert(Number.isSafeInteger(range.fullFrameCount) && range.fullFrameCount > 0
    && Number.isSafeInteger(range.startFrame) && range.startFrame >= 0
    && Number.isSafeInteger(range.endFrameExclusive) && range.endFrameExclusive > range.startFrame
    && range.endFrameExclusive <= range.fullFrameCount
    && range.endFrameExclusive - range.startFrame === expectedFrameCount,
  'render range must use the complete display clock and exact local media length');
}

export function scopeOrchestrationPlanV001(plan, renderRange = null) {
  if (renderRange === null) return plan;
  assertPresentationRenderRangeV001(renderRange, renderRange.endFrameExclusive - renderRange.startFrame);
  return {...plan, elements: plan.elements.filter(element => element.startFrame < renderRange.endFrameExclusive
    && element.endFrameExclusive > renderRange.startFrame)};
}

export function assertOrchestrationScopedPlansV001({view, plan, baselinePlan, renderRange = null}) {
  const derived = createOrchestrationRenderScopeV001(view, renderRange === null ? null
    : {startFrame: renderRange.startFrame, endFrameExclusive: renderRange.endFrameExclusive});
  assert.deepEqual(renderRange, derived.renderRange);
  assert.deepEqual(plan, derived.resolvedPlan, 'orchestration drawing plans differ: resolved full saved view');
  assert.deepEqual(baselinePlan, derived.normalPlan, 'orchestration drawing plans differ: normal full original projection');
  return derived;
}
