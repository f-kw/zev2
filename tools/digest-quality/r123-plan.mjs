/** HRB-only assembly: retain the saved connections/palettes and apply the R2 head once. */
import assert from 'node:assert/strict';
import {AUTO_PRESENTATION_RULES_REF_V009, sha256AutoPresentationV001 as hash,
  materializeFiniteAutoPresentationCaptionV001 as materialize}
  from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {assertOrchestrationDrawingViewV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {projectAudioPeakV001}
  from '../../evals/clip_composition/presentation_orchestration_projection_v001.mjs';
import {PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001}
  from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001}
  from '../../evals/clip_composition/presentation_pulse_v001.mjs';

const clone = structuredClone;
const firstTexts = ['あーもういるやん', 'これもういるやん', 'いるやんいるやん', 'もうリカちゃんやめてー!', 'リカー!'];
const interval = element => ({startFrame: element.startFrame, endFrameExclusive: element.endFrameExclusive});
const shift = (element, frames) => ({...clone(element), startFrame: element.startFrame + frames,
  endFrameExclusive: element.endFrameExclusive + frames});
const withoutElements = ({elements: _elements, ...plan}) => plan;
function freeze(value) {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
}

/**
 * Call again from freshly restored inputs at prepare/reload/render. The caller
 * binds their actual files and the unchanged native measurement bytes. This is
 * deliberately limited to this HRB: a Pulse after an inserted connection cannot
 * enter its uniform eleven-frame clock. No evidence samples are rewritten.
 */
export function buildR123IntegratedPlanV001({view, r2BaselinePlan, r2ResolvedPlan, extension}) {
  assertOrchestrationDrawingViewV001(view);
  assert.deepEqual(view.sourceContext.renderingRulesRef, AUTO_PRESENTATION_RULES_REF_V009);
  assert.equal(view.projection.sourceFrameCount, 4831, 'only the saved HRB source clock is supported');
  assert.equal(view.projection.displayFrameCount, 4867, 'only the saved HRB display clock is supported');
  assert.equal(view.projectedNormalPlan.canvas.fps, 30);
  assert.equal(view.projectedNormalPlan.elements.length, 32);
  assert.equal(extension.addedFrameCount, 11, 'this assembly applies the observed eleven-frame prefix once');
  assert.equal(extension.oldCompletedFrameCount, view.projection.displayFrameCount);
  assert.equal(extension.newCompletedFrameCount, extension.oldCompletedFrameCount + extension.addedFrameCount);
  assert.equal(extension.sourceVideoRange.endFrameExclusive - extension.sourceVideoRange.startFrame, extension.addedFrameCount);
  assert.equal(extension.sourceAudioRange.endSampleExclusive - extension.sourceAudioRange.startSample,
    extension.sourceAudioRange.sampleCount);
  assert.equal(BigInt(extension.sourceAudioRange.sampleCount) * 30n,
    BigInt(extension.addedFrameCount) * BigInt(extension.sourceAudioRange.sampleRate));
  assert.deepEqual(withoutElements(r2BaselinePlan), withoutElements(view.projectedNormalPlan));
  assert.deepEqual(withoutElements(r2ResolvedPlan), withoutElements(r2BaselinePlan));
  assert.equal(r2BaselinePlan.elements.length, 5);
  assert.equal(r2ResolvedPlan.elements.length, 5);
  const sourceCaptions = view.projectedNormalPlan.elements;
  assert.deepEqual(sourceCaptions.slice(0, 5).map(element => element.text), firstTexts);
  assert.deepEqual(sourceCaptions.slice(0, 5).map(element => [element.startFrame, element.endFrameExclusive]),
    [[8, 13], [13, 37], [37, 71], [71, 154], [154, 197]]);
  const normalPlan = {...clone(view.projectedNormalPlan),
    elements: sourceCaptions.map(element => shift(element, extension.addedFrameCount))};
  // The recovered first utterance starts at the new source head. Other fields,
  // including text, glyph indexing, geometry and provenance, stay exact.
  normalPlan.elements[0].startFrame = 0;
  normalPlan.elements[0].displayFrameCount = normalPlan.elements[0].endFrameExclusive;
  assert.deepEqual(r2BaselinePlan.elements, normalPlan.elements.slice(0, 5),
    'R2 must preserve the same five IDs, original text and drawing values on the once-shifted clock');
  normalPlan.elements.splice(0, 5, ...clone(r2BaselinePlan.elements));
  const finiteSelections = view.effectiveSelections.map(row => ({captionId: row.captionId, selection: clone(row.selection)}));
  assert.deepEqual(finiteSelections.map(row => row.captionId), sourceCaptions.map(element => element.instructionId));
  assert(finiteSelections.every(row => !Object.hasOwn(row.selection, 'speechEndFrame')
    && !Object.hasOwn(row.selection, 'presetVersion')), 'the source view must precede the R2 speech-return change');
  assert.deepEqual(finiteSelections[0].selection, {role: 'Normal'});
  const updates = [
    {index: 1, role: 'Bounce accent', field: 'presentationMotion', preset: PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001},
    {index: 3, role: 'Pulse accent', field: 'presentationPulse', preset: PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001},
  ];
  for (const {index, role, field, preset} of updates) {
    const row = finiteSelections[index], metadata = r2ResolvedPlan.elements[index][field];
    assert.equal(row.selection.role, role);
    assert.equal(metadata?.presetVersion, preset.version, 'the explicit R2 speech-return preset is required');
    assert.equal(metadata.speechEndFrame, r2BaselinePlan.elements[index].endFrameExclusive,
      'the saved R2 utterance endpoint must already use the new display clock');
    if (role === 'Pulse accent') assert.equal(metadata.anchorPeakId, row.selection.anchorPeakId);
    row.selection = {...row.selection, presetVersion: metadata.presetVersion, speechEndFrame: metadata.speechEndFrame};
  }
  const timing = view.sourceContext.pulseTimingEvidence;
  assert.equal(timing.sampleRate, 16000);
  const pulseRows = finiteSelections.filter(row => row.selection.role === 'Pulse accent');
  assert.equal(view.projectedPeaks.length, pulseRows.length);
  const pulseAnchors = [];
  const materialized = normalPlan.elements.map((element, index) => {
    const {captionId, selection} = finiteSelections[index];
    let measuredPeak;
    if (selection.role === 'Pulse accent') {
      const peak = timing.peaks.find(row => row.peakId === selection.anchorPeakId);
      assert(peak, 'the effective Pulse must retain a native measured peak');
      const projected = projectAudioPeakV001({projection: view.projection, peak: {
        clock: 'digest-original', sourceClockSha256: view.projection.sourceClockSha256,
        peakId: peak.peakId, sample: peak.peakSample, sampleRate: timing.sampleRate}});
      const saved = view.projectedPeaks.filter(row => row.peakId === peak.peakId);
      assert.equal(saved.length, 1);
      assert.deepEqual(saved[0], projected, 'the saved projected peak must reproduce from its native sample');
      const connectionFrames = view.projection.connections.filter(row => BigInt(peak.peakSample) * 30n
        >= BigInt(row.boundaryFrame) * BigInt(timing.sampleRate))
        .reduce((total, row) => total + row.insertedFrameCount, 0);
      assert.equal(connectionFrames, 0, 'HRB uniform prefix does not support a Pulse after an inserted connection');
      assert.equal(projected.displaySample, peak.peakSample, 'native samples must remain on their original clock');
      const oldElement = view.resolvedPlan.elements[index];
      assert.equal(oldElement.presentationPulse.anchorFrame, projected.displayFrame);
      measuredPeak = {peakId: peak.peakId, peakSample: peak.peakSample, sampleRate: timing.sampleRate,
        frameOffset: extension.addedFrameCount};
      pulseAnchors.push({captionId, peakId: peak.peakId, nativeSample: peak.peakSample,
        sampleRate: timing.sampleRate, connectionFrames,
        oldAnchorFrame: projected.displayFrame, newAnchorFrame: projected.displayFrame + extension.addedFrameCount});
    }
    const rendered = materialize({element, canvas: normalPlan.canvas, selection,
      ...(measuredPeak === undefined ? {} : {measuredPeak})});
    if (selection.role === 'Pulse accent') assert.equal(rendered.presentationPulse.anchorFrame,
      pulseAnchors.at(-1).newAnchorFrame, 'the native peak receives exactly one prefix shift');
    if (index < 5) assert.deepEqual(rendered, r2ResolvedPlan.elements[index],
      'the saved R2 finite drawing must reproduce exactly inside the full plan');
    else {
      const expected = shift(view.resolvedPlan.elements[index], extension.addedFrameCount);
      if (expected.presentationPulse) expected.presentationPulse.anchorFrame += extension.addedFrameCount;
      assert.deepEqual(rendered, expected, 'all later finite expressions and palettes must remain unchanged');
    }
    return rendered;
  });
  assert.equal(materialized.length, sourceCaptions.length);
  const pulseTimingProjection = {schemaVersion: 'auto-presentation-pulse-frame-offset-v001',
    frameOffset: extension.addedFrameCount, sourceBaselineRef: clone(view.sourceContext.baselineRef)};
  return freeze({schemaVersion: 'r123-hrb-integrated-plan-v001', frameCount: extension.newCompletedFrameCount,
    normalPlan, finiteSelections, pulseTimingProjection,
    lineage: {sourceViewSha256: view.viewSha256, r2BaselinePlanSha256: hash(r2BaselinePlan),
      r2ResolvedPlanSha256: hash(r2ResolvedPlan), extensionSha256: hash(extension),
      nativePulseEvidenceSha256: hash(timing), nativeEvidenceUnchanged: true,
      connectionAssignments: view.resolution.connections.map(row => ({connectionId: row.connectionId,
        preset: row.preset, presetVersion: row.presetVersion})),
      connectionProjectionSha256: view.projection.projectionSha256,
      oldFrameCount: view.projection.displayFrameCount, addedFrameCount: extension.addedFrameCount,
      newFrameCount: extension.newCompletedFrameCount, pulseAnchors,
      openingCaptions: normalPlan.elements.slice(0, 5).map((element, index) => ({captionId: element.instructionId,
        text: element.text, oldRange: interval(sourceCaptions[index]), newRange: interval(element)})),
      speechReturnCaptionIds: updates.map(row => finiteSelections[row.index].captionId),
      freshAiJudgment: false, humanQualityApproved: false}});
}
