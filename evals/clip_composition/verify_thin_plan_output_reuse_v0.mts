/** 今回の採否を再構築し、同じ編集区間の既存媒体を来歴付きで再利用する。新しいrenderの実績は作らない。 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {WORK, SOURCE_PLAN, verifyThinPlanSelectionV0} from './run_thin_plan_candidate_selection_v0.mts';
import {validateSelectionV001} from './candidate_selection_validation_v001.mts';
import {promoteSelectionForExecutionV001} from './run_candidate_selection_e2e_v001.mts';
import {verifyCandidateSelectionE2EV001} from './verify_candidate_selection_e2e_v001.mts';
import {projectAdoptedMediaRangesV001} from './adopted_media_manufacturing_v001.mts';
import {loadHistoricalCaptionRepairFixtureV001} from './replay_caption_local_repair_v001.mts';
import {captionRepairEffectiveInputsV001} from './caption_local_repair_common_v001.mts';
// @ts-expect-error Existing JavaScript media inspection; observed fields are checked below.
import {inspectRenderedMediaV002} from './presentation_renderer_qc_v002.mjs';

const EXISTING = path.posix.dirname(SOURCE_PLAN);
const FULL_REPAIR = 'evals/clip_composition/outputs/presentation/work-caption-local-repair-common-20260908-v001/ui-equivalence-v001/caption-repair-42ddb323-08da-44ef-bd2c-7780a95c13cc';
const THIS_FILE = 'evals/clip_composition/verify_thin_plan_output_reuse_v0.mts';

async function retainExact(p: string, value: Json) {
  try {await access(path.join(ROOT, p));}
  catch (error) {if ((error as NodeJS.ErrnoException).code === 'ENOENT') return publish(p, value); throw error;}
  assert(same(await readJson(p), value), 'SAVED_REUSE_EVIDENCE_CHANGED');
  return bind(p, value);
}

/** 意味判断後の媒体検査専用。過去字幕の人間観測は採否入力へ戻さない。 */
function normalizedCaptions(core: Json, retained: Set<number>) {
  const payload = captionRepairEffectiveInputsV001(core);
  const atoms = new Map<string, Json>(core.meaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
  const sourceId = (id: string) => {const atom = atoms.get(id); assert(atom); return atom.sourceSegmentId;};
  return {styleProfileId: payload.styleProfileId, instructions: payload.instructions.flatMap((row: Json) => {
    const ids = row.targetProvenance.atomOccurrenceIds.map(sourceId);
    if (!ids.some((id: number) => retained.has(id))) return [];
    assert(ids.every((id: number) => retained.has(id)), 'PARTIAL_EXISTING_CAPTION_CANNOT_BE_REUSED');
    return [{semanticKind: row.semanticKind, content: row.content, sourceSegmentIds: ids,
      frames: row.outputTime, cueEndSourceSegmentId: sourceId(row.cueEndTextId),
      lineEndSourceSegmentIds: row.lineEndTextIds.map(sourceId), materialRefs: row.materialRefs}];
  })};
}

async function verifyExistingRepair(root: string) {
  const names = {meaning: 'meaning-input.json', sourcePackage: 'source-package.json', selection: 'selection.json',
    instruction: 'instruction.json', rendererJob: 'renderer-job.json', lineEndProjection: 'line-end-projection.json',
    cueEndProjection: 'cue-end-projection.json', captionAdoption: 'caption-adoption.json'};
  const core: Json = {}, artifacts: Json = {};
  for (const [key, filename] of Object.entries(names)) {
    core[key] = await readJson(`${root}/${filename}`); artifacts[key] = bind(`${root}/${filename}`, core[key]);
  }
  const execution = await readJson(`${root}/renderer-result.json`), job = core.rendererJob;
  assert(same(execution.rendererJobBinding, artifacts.rendererJob));
  assert.equal(execution.exitCode, 0); assert.equal(execution.result.status, 'completed');
  assert.equal(execution.result.qc.status, 'passed'); assert.deepEqual(execution.result.qc.violations, []);
  assert(same(await readBound(job.instructionArtifactBinding), core.instruction));
  assert(same(await readBound(job.lineEndProjectionBinding), core.lineEndProjection));
  const admission = await readJson(`${root}/admission-receipt.json`);
  assert(same(admission, execution.result.receipt)); assert.equal(admission.status, 'accepted');
  assert(same(admission.rendererJobBinding, artifacts.rendererJob));
  assert(same(admission.instructionArtifactBinding, artifacts.instruction));
  assert(same(admission.lineEndProjectionBinding, artifacts.lineEndProjection));
  assert(same(admission.instructionSourceBindings.meaningInformationPackage, artifacts.meaning));
  assert(same(admission.instructionSourceBindings.cueEndProjection, artifacts.cueEndProjection));
  assert(same(admission.cropAppliedBaseMediaBinding, job.cropAppliedBaseMedia));
  const layout = await readJson(`${root}/line-layout.json`); assert(same(layout, execution.result.lineLayout));
  const scope = await readJson(`${root}/scope-verification.json`);
  assert.equal(scope.status, 'passed'); assert(same(scope.effectiveInputs, captionRepairEffectiveInputsV001(core)));
  const base = job.cropAppliedBaseMedia;
  const timeline = await readBound(base.timeline), generation = await readBound(base.generationManifest);
  assert.equal(await fileSha(path.join(ROOT, base.baseMedia.path)), base.baseMedia.fileSha256);
  const videoPath = `${root}/render/presentation-rendered-v002.mp4`;
  const video = {path: videoPath, fileSha256: await fileSha(path.join(ROOT, videoPath))};
  const media = await inspectRenderedMediaV002(path.join(ROOT, videoPath));
  assert.equal(media.video.frameCount, timeline.baseMedia.expectedFrameCount); assert.equal(media.video.fps, 30);
  assert.equal(media.audio.packetPayloadSha256, generation.audio.encoded.packetPayloadSha256);
  return {core, timeline, generation, evidence: {artifacts, base, video, media,
    executionBinding: bind(`${root}/renderer-result.json`, execution), admissionBinding: bind(`${root}/admission-receipt.json`, admission),
    lineLayoutBinding: bind(`${root}/line-layout.json`, layout), scopeBinding: bind(`${root}/scope-verification.json`, scope),
    technicalQc: 'passed', humanQuality: 'not-evaluated'}};
}

export async function verifyThinPlanOutputReuseV0(planPath: string) {
  const selection = await verifyThinPlanSelectionV0(planPath), {c, request, response, result} = selection;
  const expected = promoteSelectionForExecutionV001(c, validateSelectionV001(c, request, response, result));
  // 新しい採否から編集範囲を確定してから、旧動画との一致を調べる。旧採否から新しい採否を作らない。
  const oldEdit = await readJson(`${EXISTING}/edit-plan.json`);
  assert(same(expected.editPlan.segments, oldEdit.segments), 'NEW_COMPOSITION_REQUIRES_DIFFERENT_MEDIA');
  assert(same(expected.editPlan.sourceVideoBinding, oldEdit.sourceVideoBinding), 'REUSE_SOURCE_CHANGED');
  const sourceProof = await verifyCandidateSelectionE2EV001(SOURCE_PLAN);
  assert.equal(sourceProof.status, 'passed');
  const final = await readJson(`${EXISTING}/final-verification.json`);
  const existing = await verifyExistingRepair(`${EXISTING}/caption-repair-v001`);
  assert(same(existing.evidence.video, final.renderer.video));
  assert(same(existing.evidence.base, final.base));
  for (const key of Object.keys(existing.evidence.artifacts)) assert(same(existing.evidence.artifacts[key], final.artifacts[key]));
  const inspection = await readJson(`${EXISTING}/source-media-inspection.json`);
  assert(same(inspection.sourceVideoBinding, c.plan.request.sourceVideo));
  const projected = projectAdoptedMediaRangesV001(expected.editPlan, inspection.media);
  assert(same(projected.mappings, existing.generation.segments), 'NEW_FORMAL_RANGE_PROJECTION_DIFFERS');
  assert(same(projected.mappings.map(({audioSamples, ...s}: Json) => s), existing.timeline.segments));
  const historical = await loadHistoricalCaptionRepairFixtureV001('digest');
  const retained = new Set<number>(expected.adoption.segments.flatMap((s: Json) => s.sourceSegmentIds));
  const oldMeaning = await readBound(historical.source.artifacts.meaning);
  const oldTimeline = await readBound(historical.source.base.timeline);
  // この結果で一致した元フレーム・音声対応を条件とし、字幕の出力位置を恣意的に移動しない。
  assert(same(existing.timeline.segments, oldTimeline.segments.slice(0, existing.timeline.segments.length)));
  const payload = normalizedCaptions(existing.core, retained);
  assert(same(payload, normalizedCaptions({...historical.expected, meaning: oldMeaning}, retained)));
  const full = await verifyExistingRepair(FULL_REPAIR);
  assert.equal(full.evidence.video.fileSha256, historical.fixture.expectedVideo.fileSha256, 'COMPARISON_VIDEO_BYTES_CHANGED');
  assert(same(full.timeline, oldTimeline));
  assert(same(captionRepairEffectiveInputsV001(full.core), captionRepairEffectiveInputsV001(historical.expected)));
  assert(same(normalizedCaptions(full.core, retained), payload));
  const previousResponse = await readJson(`${EXISTING}/selection-response.json`);
  const decisionComparison = result.answer.decisions.map((d: Json, i: number) => ({candidateId: d.candidateId,
    before: previousResponse.answer.decisions[i].decision, after: d.decision,
    beforeBasis: previousResponse.answer.decisions[i].basis, afterBasis: d.basis,
    reasonChanged: previousResponse.answer.decisions[i].reason !== d.reason}));
  const adoptionBinding = await retainExact(`${WORK}/machine-adoption.json`, expected.adoption);
  const editPlanBinding = await retainExact(`${WORK}/edit-plan.json`, expected.editPlan);
  const sourceProofBinding = await retainExact(`${WORK}/reused-source-core-verification.json`, sourceProof);
  const formalReuseInput = {schemaVersion: 'thin-plan-existing-media-reuse-input-v0', planBinding: c.planBinding,
    authorizationBinding: c.plan.authorization, machineAdoptionBinding: adoptionBinding, editPlanBinding,
    currentSelectionValidation: bind(`${WORK}/selection-validation.json`, expected.validation),
    sourceCoreProofBinding: sourceProofBinding, sourceFinalVerificationBinding: bind(`${EXISTING}/final-verification.json`, final),
    resolvedMediaMappings: projected.mappings, unchangedCaptionPayload: payload,
    selectedOutput: existing.evidence, comparisonOutput: full.evidence,
    mode: 'reuse-existing-bytes-after-current-composition-and-payload-equivalence',
    newRendererExecution: false, inheritedHumanQuality: false};
  const reuseBinding = await retainExact(`${WORK}/formal-output-reuse-input.json`, formalReuseInput);
  const proof = {schemaVersion: 'thin-plan-output-reuse-verification-v0', status: 'passed', planBinding: c.planBinding,
    formalReuseInputBinding: reuseBinding, implementationBinding: {path: THIS_FILE, fileSha256: await fileSha(path.join(ROOT, THIS_FILE))},
    decisions: decisionComparison, counts: {candidates: c.candidateSet.candidates.length,
      adopted: expected.adoption.adoptedCandidates.length, rejected: expected.adoption.rejectedCandidates.length},
    selectedOutput: existing.evidence.video, comparisonOutput: full.evidence.video,
    selectedFrames: existing.timeline.baseMedia.expectedFrameCount, comparisonFrames: full.timeline.baseMedia.expectedFrameCount,
    captions: payload.instructions.length, checks: {newJudgmentReconstructed: true, deterministicAdoption: true,
      existingRetentionReconstructed: true, currentFormalRangesMatchExistingMedia: true, sourceCoreReconstructed: true,
      existingCommonRepairPayloadExact: true, existingRendererAdmissionAndQcBound: true, renderedByteHashes: true,
      observedFramesAndAudioPackets: true, previousHumanAnswersExcludedFromNewJudgment: true},
    newInternalRetentionJudgment: false, newRenderCount: 0, partialCandidateUseRequired: false,
    humanQuality: 'not-evaluated', inputImprovementEstablished: false, existingSkillChangeRequired: false};
  await retainExact(`${WORK}/output-reuse-verification-v002.json`, proof);
  return proof;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const proof = await verifyThinPlanOutputReuseV0(process.argv[2]);
  process.stdout.write(JSON.stringify(proof) + '\n');
}
