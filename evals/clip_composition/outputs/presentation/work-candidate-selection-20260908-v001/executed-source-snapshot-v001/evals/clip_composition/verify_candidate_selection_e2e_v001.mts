import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  ROOT, readJson, readBound, bind, publish, same, fileSha, pass, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadSelectionContextV001, verifySelectionAdoptionV001}
  from './run_candidate_selection_e2e_v001.mts';
import {projectAdoptedMediaRangesV001} from './adopted_media_manufacturing_v001.mts';
import {constructInternalCaptionCoreV001, INTERNAL_CORE_FILES} from './candidate_internal_edit_core_v001.mts';
import {
  validatePresentationBaseMediaHashGraphV001, validatePresentationBaseMediaGenerationManifestV003,
  inspectPresentationBaseMediaTimelineQcV002,
} from './presentation_base_media_build_v003.mjs';
import {inspectRenderedMediaV002} from './presentation_renderer_qc_v002.mjs';

/** 候補判断から媒体・字幕・rendererまで、保存済みの「passed」だけに頼らず再構成する。 */
export async function verifyCandidateSelectionE2EV001(planPath: string) {
  const c = await loadSelectionContextV001(planPath);
  const out = (name: string) => `${c.plan.outputRoot}/${name}`;
  const {validation, adoption, editPlan} = await verifySelectionAdoptionV001(c);
  const verification = await readJson(out('verification.json'));
  assert(same(verification.planBinding, c.planBinding), 'VERIFICATION_PLAN_CHANGED');
  assert(same(verification.candidateSetBinding, c.plan.request.candidateSet), 'VERIFICATION_CANDIDATE_SET_CHANGED');
  assert(same(verification.machineAdoptionBinding, bind(out('machine-adoption.json'), adoption)), 'VERIFICATION_ADOPTION_CHANGED');
  assert.equal(verification.status, 'passed');
  const base = verification.base;
  const [timeline, generation, receipt, inspection, invocation, manufacturing] = await Promise.all([
    readBound(base.timeline), readBound(base.generationManifest), readBound(base.validationReceipt),
    readJson(out('source-media-inspection.json')), readJson(out('core-invocation.json')), readJson(out('manufacturing-values.json')),
  ]);
  const adoptionBinding = bind(out('machine-adoption.json'), adoption), editPlanBinding = bind(out('edit-plan.json'), editPlan);
  assert(same(invocation.machineAdoptionBinding, adoptionBinding) && same(invocation.editPlanBinding, editPlanBinding), 'CORE_ADOPTION_BINDING_CHANGED');
  assert(same(invocation.validatorResultBinding, bind(out('selection-validation.json'), validation)), 'CORE_VALIDATOR_CHANGED');
  assert(same(invocation.manufacturingValuesBinding, bind(out('manufacturing-values.json'), manufacturing)), 'CORE_MANUFACTURING_CHANGED');
  assert(same(receipt.coreInvocationBinding, bind(out('core-invocation.json'), invocation)), 'BASE_INVOCATION_CHANGED');
  assert(same(receipt.machineAdoptionBinding, adoptionBinding) && same(receipt.editPlanBinding, editPlanBinding), 'BASE_ADOPTION_CHANGED');
  assert(same(inspection.sourceVideoBinding, c.plan.request.sourceVideo), 'SOURCE_INSPECTION_CHANGED');
  assert(same(receipt.outputs, {baseMedia: base.baseMedia, timeline: base.timeline, generationManifest: base.generationManifest}), 'BASE_OUTPUT_BINDINGS_CHANGED');
  assert.equal(await fileSha(path.join(ROOT, base.baseMedia.path)), base.baseMedia.fileSha256, 'BASE_MEDIA_BYTES_CHANGED');
  const projected = projectAdoptedMediaRangesV001(editPlan, inspection.media);
  assert(same(projected.mappings, generation.segments), 'CORE_RANGE_PROJECTION_CHANGED');
  assert(same(projected.mappings.map(({audioSamples, ...s}: Json) => s), timeline.segments), 'TIMELINE_RANGE_PROJECTION_CHANGED');
  assert.equal(generation.assemblyDecision.fileSha256, adoptionBinding.fileSha256);
  assert.equal(generation.basisEditPlan.fileSha256, editPlanBinding.fileSha256);
  pass(validatePresentationBaseMediaGenerationManifestV003(generation), 'SELECTION_GENERATION_MANIFEST_INVALID');
  pass(validatePresentationBaseMediaHashGraphV001({timeline, manifest: generation, report: receipt,
    baseMediaFileSha256: base.baseMedia.fileSha256, timelineFileSha256: base.timeline.fileSha256,
    manifestFileSha256: base.generationManifest.fileSha256}), 'SELECTION_BASE_HASH_GRAPH_INVALID');
  inspectPresentationBaseMediaTimelineQcV002(timeline, generation, {fileSha256: base.baseMedia.fileSha256,
    frameCount: timeline.baseMedia.expectedFrameCount, timelineFileSha256: base.timeline.fileSha256});
  const traces = [];
  for (let i = 1; i <= adoption.segments.length; i++) traces.push({
    request: await readJson(out(`display-${i}-request.json`)), response: await readJson(out(`display-${i}-response.json`)),
    result: await readJson(out(`display-${i}-result.json`)),
  });
  const reconstructed = await constructInternalCaptionCoreV001(c as any, adoption, base, traces);
  for (const [key, filename] of Object.entries(INTERNAL_CORE_FILES)) {
    const actual = await readBound(verification.artifacts[key]);
    assert(same(actual, reconstructed[key as keyof typeof reconstructed]), `CAPTION_CORE_RECONSTRUCTION_CHANGED:${key}`);
    assert.equal(verification.artifacts[key].path, out(filename));
  }
  const execution = await readBound(verification.renderer.execution);
  if (verification.rendererContinuationBinding) {
    const continuation = await readBound(verification.rendererContinuationBinding);
    assert(same(continuation.sourceJobBinding, verification.artifacts.rendererJob));
    assert(same(continuation.executionJobBinding, execution.rendererJobBinding));
    assert(same(continuation.changedFields, ['attemptId', 'publication']));
    const continued = await readBound(continuation.executionJobBinding);
    const expected = structuredClone(reconstructed.rendererJob);
    expected.attemptId = continued.attemptId; expected.publication = continued.publication;
    assert(same(continued, expected), 'RENDER_CONTINUATION_CHANGED_CORE_OR_STYLE');
    await readBound(continuation.failedExecutionBinding);
    assert.equal(await fileSha(path.join(ROOT, continuation.stderrBinding.path)), continuation.stderrBinding.fileSha256);
  } else assert(same(execution.rendererJobBinding, verification.artifacts.rendererJob));
  assert.equal(execution.exitCode, 0); assert.equal(execution.result.status, 'completed'); assert.equal(execution.result.qc.status, 'passed');
  await readBound(verification.renderer.admission); await readBound(verification.renderer.lineLayout);
  const videoPath = path.join(ROOT, verification.renderer.video.path);
  assert.equal(await fileSha(videoPath), verification.renderer.video.fileSha256, 'RENDERED_BYTES_CHANGED');
  const media = await inspectRenderedMediaV002(videoPath);
  assert.equal(media.video?.frameCount, timeline.baseMedia.expectedFrameCount, 'RENDERED_FRAME_COUNT_CHANGED');
  assert.equal(media.video?.fps, 30, 'RENDERED_FRAME_RATE_CHANGED');
  assert.equal(media.audio?.packetPayloadSha256, generation.audio.encoded.packetPayloadSha256, 'RENDERED_AUDIO_CHANGED');
  assert(same(verification.counts, {candidates: c.candidateSet.candidates.length,
    adopted: adoption.adoptedCandidates.length, rejected: adoption.rejectedCandidates.length}), 'CANDIDATE_COUNTS_CHANGED');
  assert.equal(verification.finalFrames, timeline.baseMedia.expectedFrameCount);
  assert.equal(verification.finalDurationSeconds, timeline.baseMedia.expectedFrameCount / 30);
  const report = {schemaVersion: 'candidate-selection-provenance-verification-v001', status: 'passed',
    planBinding: c.planBinding, verificationBinding: bind(out('verification.json'), verification),
    implementationBinding: {path: 'evals/clip_composition/verify_candidate_selection_e2e_v001.mts',
      fileSha256: await fileSha(path.join(ROOT, 'evals/clip_composition/verify_candidate_selection_e2e_v001.mts'))},
    checks: {sourceInputs: 'passed', candidateSetReconstruction: 'passed', judgmentValidationAndPromotion: 'passed',
      retainedContentAndCutEvidence: 'passed', selectedCandidatesOnly: 'passed', commonCoreInvocation: 'passed',
      formalRangeProjection: 'passed', baseMediaHashGraph: 'passed', captionCoreReconstruction: 'passed',
      renderedBytesAndFrames: 'passed', audioPacketPreservation: 'passed'},
    counts: verification.counts, media, humanQuality: 'not-evaluated', finalDecisionOwner: 'human'};
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = await verifyCandidateSelectionE2EV001(process.argv[2]);
  const destination = process.argv[3];
  if (destination) await publish(destination, report);
  process.stdout.write(JSON.stringify({status: report.status, counts: report.counts, media: report.media}) + '\n');
}
