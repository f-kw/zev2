import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildR123IntegratedPlanV001 as build} from './r123-plan.mjs';
import {createOrchestrationContextV001, editOrchestrationOverrideV001,
  resolveOrchestrationDrawingViewV001, restoreOrchestrationDrawingViewEvidenceV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {sha256AutoPresentationV001 as hash, fixAutoPresentationProposalV001, resolveAutoPresentationV001}
  from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';

const directory = new URL('../../evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/review-reflection-r1-r3-20260921-v002/', import.meta.url);
const json = async relative => JSON.parse(await readFile(new URL(relative, directory), 'utf8'));
const proof = await json('hrb-integrated-v001/drawing-evidence.json');
const r2BaselinePlan = await json('r2-v002/normal-plan.json');
const r2ResolvedPlan = await json('r2-v002/resolved-plan.json');
const {extension} = await json('r2-v002/r2-evidence.json');
const fixture = () => ({view: restoreOrchestrationDrawingViewEvidenceV001(structuredClone(proof)),
  r2BaselinePlan: structuredClone(r2BaselinePlan), r2ResolvedPlan: structuredClone(r2ResolvedPlan),
  extension: structuredClone(extension)});

test('real HRB keeps all 32 captions, palette/connection choices and three exact peaks while applying R2 once', () => {
  const input = fixture(), before = structuredClone(input), output = build(input);
  assert.equal(output.frameCount, 4878);
  assert.equal(output.normalPlan.elements.length, 32);
  assert.deepEqual(output.normalPlan.elements.slice(0, 5), r2BaselinePlan.elements);
  assert.deepEqual(output.normalPlan.elements.slice(5), input.view.projectedNormalPlan.elements.slice(5)
    .map(element => ({...element, startFrame: element.startFrame + 11, endFrameExclusive: element.endFrameExclusive + 11})));
  assert.deepEqual(output.finiteSelections.filter((_, index) => ![1, 3].includes(index)),
    input.view.effectiveSelections.filter((_, index) => ![1, 3].includes(index)).map(({captionId, selection}) => ({captionId, selection})));
  assert.deepEqual(output.lineage.connectionAssignments, input.view.resolution.connections
    .map(({connectionId, preset, presetVersion}) => ({connectionId, preset, presetVersion})));
  assert.deepEqual(output.lineage.pulseAnchors.map(row => [row.nativeSample, row.connectionFrames, row.oldAnchorFrame, row.newAnchorFrame]),
    [[63040, 0, 118, 129], [138560, 0, 259, 270], [172480, 0, 323, 334]]);
  assert.deepEqual(output.lineage.speechReturnCaptionIds, [output.finiteSelections[1].captionId, output.finiteSelections[3].captionId]);
  assert.equal(output.finiteSelections[1].selection.speechEndFrame, 48);
  assert.equal(output.finiteSelections[3].selection.speechEndFrame, 165);
  assert.equal(output.lineage.nativePulseEvidenceSha256, hash(input.view.sourceContext.pulseTimingEvidence));
  assert.deepEqual(input, before, 'no source, native evidence, saved expression, or R2 input is changed');
});

test('the returned choices resolve through current common rules and reproduce the saved R2 drawing', () => {
  const input = fixture(), output = build(input);
  const bytes = JSON.stringify(output.normalPlan);
  const context = {...structuredClone(input.view.sourceContext),
    baselineRef: {path: '/r123-fixture/normal-plan.json',
      fileSha256: createHash('sha256').update(bytes).digest('hex'), canonicalSha256: hash(output.normalPlan)},
    pulseTimingProjection: output.pulseTimingProjection};
  const autoProposal = fixAutoPresentationProposalV001({baselinePlan: output.normalPlan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: output.finiteSelections.map(row => row.captionId), completion: 'complete',
      effects: output.finiteSelections.filter(row => row.selection.role !== 'Normal')
        .map(({captionId, selection}) => ({captionId, ...selection})), exceptions: []}});
  const resolved = resolveAutoPresentationV001({baselinePlan: output.normalPlan, context, autoProposal});
  assert.deepEqual(resolved.plan.elements.slice(0, 5), r2ResolvedPlan.elements);
  assert.deepEqual(resolved.plan.elements.filter(element => element.presentationPulse).map(element => element.presentationPulse.anchorFrame),
    [129, 270, 334]);
  for (const row of output.finiteSelections.filter(row => row.selection.role === 'Panel accent')) {
    const old = input.view.resolvedPlan.elements.find(element => element.instructionId === row.captionId);
    const current = resolved.plan.elements.find(element => element.instructionId === row.captionId);
    assert.deepEqual(current.visualState, old.visualState, 'finite background and text colors stay assigned to the same caption');
  }
});

test('fresh source-proof reconstruction deterministically rebuilds the same plan and rejects an unbound copied view', () => {
  const first = build(fixture());
  const reloaded = {view: restoreOrchestrationDrawingViewEvidenceV001(JSON.parse(JSON.stringify(proof))),
    r2BaselinePlan: JSON.parse(JSON.stringify(r2BaselinePlan)), r2ResolvedPlan: JSON.parse(JSON.stringify(r2ResolvedPlan)),
    extension: JSON.parse(JSON.stringify(extension))};
  assert.deepEqual(build(reloaded), JSON.parse(JSON.stringify(first)));
  assert.throws(() => build({...reloaded, view: structuredClone(reloaded.view)}), /drawing view/);
});

test('changed original text, caption identity, drawing, repeated prefix and repeated speech endpoint are rejected', () => {
  const mutations = [
    input => {input.r2BaselinePlan.elements[0].text += '!';},
    input => {input.r2BaselinePlan.elements[1].instructionId += '-other';},
    input => {input.r2BaselinePlan.elements[2].visualState.textStyle.fontColor = '#000000';},
    input => {for (const row of input.r2BaselinePlan.elements) {row.startFrame += 11; row.endFrameExclusive += 11;}},
    input => {input.r2ResolvedPlan.elements[1].presentationMotion.speechEndFrame += 11;},
    input => {input.r2ResolvedPlan.elements[3].presentationPulse.anchorFrame += 11;},
    input => {input.r2ResolvedPlan.elements[3].presentationPulse.anchorPeakId = 'audio-peak-000047';},
    input => {input.extension.addedFrameCount = 22; input.extension.newCompletedFrameCount += 11;},
    input => {input.extension.oldCompletedFrameCount -= 36; input.extension.newCompletedFrameCount -= 36;},
  ];
  for (const mutate of mutations) {const input = fixture(); mutate(input); assert.throws(() => build(input));}
});

test('a valid later Pulse is rejected explicitly because its native peak needs an additional connection shift', () => {
  const context = createOrchestrationContextV001(structuredClone(proof.source));
  const caption = proof.state.selectionRecord.input.captions.find(row => row.startFrame === 462);
  assert(caption.eligiblePulsePeakIds.includes('audio-peak-000093'));
  const state = editOrchestrationOverrideV001({context, state: structuredClone(proof.state), kind: 'caption',
    itemId: caption.captionId, selection: {preset: 'pulse', anchorPeakId: 'audio-peak-000093'}});
  const view = resolveOrchestrationDrawingViewV001({context, state});
  const peak = view.projectedPeaks.find(row => row.peakId === 'audio-peak-000093');
  assert.equal((peak.displaySample - peak.source.sample) * 30 / peak.sampleRate, 12);
  assert.throws(() => build({...fixture(), view}), /does not support a Pulse after an inserted connection/);
});
