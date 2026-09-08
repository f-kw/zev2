/** Read-only final proof for this frozen selection; never renders or changes an earlier artifact. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, type Json, type Binding}
  from '../../../run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadSelectionContextV001, verifySelectionAdoptionV001}
  from '../../../run_candidate_selection_e2e_v001.mts';
import {loadHistoricalCaptionRepairFixtureV001} from '../../../replay_caption_local_repair_v001.mts';
import {captionRepairEffectiveInputsV001} from '../../../caption_local_repair_common_v001.mts';
// @ts-expect-error The existing JavaScript inspector has no declaration file; all observed fields are checked below.
import {inspectRenderedMediaV002} from '../../../presentation_renderer_qc_v002.mjs';

const c = await loadSelectionContextV001(process.argv[2]);
const {adoption} = await verifySelectionAdoptionV001(c);
const work = c.plan.outputRoot;
const final = await readJson(`${work}/final-verification.json`);
assert.equal(final.status, 'passed');
assert(same(final.planBinding, c.planBinding));
assert.equal(final.humanQuality, 'not-evaluated');
assert.equal(final.newHumanSubtitleJudgment, false);
const preliminary = await readBound(final.selectionVerificationBinding);
assert(same(preliminary.machineAdoptionBinding, bind(`${work}/machine-adoption.json`, adoption)));
assert(same(final.base, preliminary.base));
const mapping = await readBound(final.captionRepairMappingBinding);
const equivalence = await readBound(final.captionRepairEquivalenceBinding);
assert.equal(mapping.status, 'passed');
assert.equal(mapping.newHumanObservation, false);
assert.equal(mapping.newAcousticObservation, false);
assert.equal(mapping.newTimingInference, false);
assert.equal(equivalence.status, 'passed');
const core: Json = {};
for (const [name, reference] of Object.entries(final.artifacts)) core[name] = await readBound(reference as Binding);
assert.equal(core.captionAdoption.purpose, 'fixture-replay');
assert.equal(core.captionAdoption.newHumanJudgment, false);
assert(same(core.rendererJob.cropAppliedBaseMedia, final.base));
const scope = await readJson(`${work}/caption-repair-v001/scope-verification.json`);
assert.equal(scope.status, 'passed');
const effective = captionRepairEffectiveInputsV001(core);
assert(same(scope.effectiveInputs, effective));
const historical = await loadHistoricalCaptionRepairFixtureV001('digest');
const oldMeaning = await readBound(historical.source.artifacts.meaning);
const oldTimeline = await readBound(historical.source.base.timeline);
const timeline = await readBound(final.base.timeline);
const generation = await readBound(final.base.generationManifest);
// This actual judgment retained the first two candidates. Verify that fact from the exact timelines.
assert(same(timeline.segments, oldTimeline.segments.slice(0, timeline.segments.length)));
const retained = new Set(adoption.segments.flatMap((s: Json) => s.sourceSegmentIds));
function normalize(payload: Json, meaning: Json) {
  const atoms = new Map<string, Json>(meaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
  const sourceId = (id: string) => {const atom = atoms.get(id); assert(atom); return atom.sourceSegmentId;};
  return {styleProfileId: payload.styleProfileId, instructions: payload.instructions.flatMap((row: Json) => {
    const ids = row.targetProvenance.atomOccurrenceIds.map(sourceId);
    if (!ids.some((id: number) => retained.has(id))) return [];
    assert(ids.every((id: number) => retained.has(id)));
    return [{semanticKind: row.semanticKind, content: row.content, sourceSegmentIds: ids,
      frames: row.outputTime, cueEndSourceSegmentId: sourceId(row.cueEndTextId),
      lineEndSourceSegmentIds: row.lineEndTextIds.map(sourceId), materialRefs: row.materialRefs}];
  })};
}
const actualPayload = normalize(effective, core.meaning);
const expectedPayload = normalize(captionRepairEffectiveInputsV001(historical.expected), oldMeaning);
assert(same(actualPayload, expectedPayload), 'FINAL_CAPTIONS_DIFFER_FROM_CONFIRMED_RETAINED_CONTENT');
assert(same(actualPayload, equivalence.payload));
const execution = await readBound(final.renderer.execution);
assert(same(execution.rendererJobBinding, final.artifacts.rendererJob));
assert.equal(execution.exitCode, 0);
assert.equal(execution.result.status, 'completed');
assert.equal(execution.result.qc.status, 'passed');
assert.deepEqual(execution.result.qc.violations, []);
await readBound(final.renderer.admission);
await readBound(final.renderer.lineLayout);
const videoPath = path.join(ROOT, final.renderer.video.path);
assert.equal(await fileSha(videoPath), final.renderer.video.fileSha256);
const media = await inspectRenderedMediaV002(videoPath);
assert.equal(media.video.frameCount, timeline.baseMedia.expectedFrameCount);
assert.equal(media.video.fps, 30);
assert.equal(media.audio.packetPayloadSha256, generation.audio.encoded.packetPayloadSha256);
assert.equal(media.durationMs, timeline.baseMedia.expectedFrameCount * 1000 / 30);
const result = {schemaVersion: 'candidate-selection-final-independent-verification-v001', status: 'passed',
  finalVerificationBinding: bind(`${work}/final-verification.json`, final), finalVideo: final.renderer.video,
  candidateCounts: final.counts, formalCaptionCount: actualPayload.instructions.length, media,
  checks: {selectionReconstructed: true, commonRepairOnly: true, sourceFramePrefixExact: true,
    remainingConfirmedCaptionPayloadExact: true, publishedBindings: true, renderedBytes: true,
    renderedFrameCount: true, encodedAudioPacketsPreserved: true},
  humanQuality: 'not-evaluated', newHumanSubtitleJudgment: false};
await publish(`${work}/final-independent-verification-v001.json`, result);
process.stdout.write(JSON.stringify({status: result.status, captions: result.formalCaptionCount, video: result.finalVideo}) + '\n');
