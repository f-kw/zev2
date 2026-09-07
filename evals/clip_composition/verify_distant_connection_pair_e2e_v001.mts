import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT, readJson, readBound, publish, bind, fileSha, sha, canonicalSha, same, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  loadDistantContextV001, verifyDistantAdoptionV001, buildDistantCaptionInputsV001, constructDistantCaptionCoreV001,
} from './run_distant_connection_pair_skill_e2e_v001.mts';
import {validateDisplayForAdoptionV001, projectAdoptedMediaRangesV001, CORE_FILES}
  from './adopted_media_manufacturing_v001.mts';

const c = await loadDistantContextV001(process.argv[2]);
const target = (p: string) => `${c.plan.outputRoot}/${p}`;
const final = await readJson(target('verification.json'));
assert.equal(final.status, 'passed');
assert(same(final.planBinding, c.planBinding));
assert(same(c.plan, await readJson(target('plan-snapshot.json'))));
const {adoption, editPlan} = await verifyDistantAdoptionV001(c);
const {schemaVersion, ...base} = await readJson(target('base-media-bindings.json'));
const source = await readJson(target('source-media-inspection.json'));
const timeline = await readBound(base.timeline), manifest = await readBound(base.generationManifest);
const receipt = await readBound(base.validationReceipt);
const mappings = projectAdoptedMediaRangesV001(editPlan, source.media).mappings;
assert.deepEqual(mappings, manifest.segments);
assert.deepEqual(mappings.map(({audioSamples, ...v}: Json) => v), timeline.segments);
assert.equal(receipt.status, 'passed');
assert.equal(await fileSha(path.join(ROOT, base.baseMedia.path)), base.baseMedia.fileSha256);
assert.equal(base.baseMedia.fileSha256, timeline.baseMedia.fileSha256);
assert.equal(base.baseMedia.fileSha256, manifest.outputs.baseMedia.fileSha256);
const inputs = buildDistantCaptionInputsV001(c, adoption, base), tokens = [];
for (const [i, request] of inputs.requests.entries()) {
  assert(same(request, await readJson(target(`display-${i + 1}-request.json`))));
  tokens.push(validateDisplayForAdoptionV001(request, await readJson(target(`display-${i + 1}-response.json`)),
    await readJson(target(`display-${i + 1}-result.json`)), 'distant-connection-pair-display-response-v001'));
}
const core = await constructDistantCaptionCoreV001(c, adoption, base, tokens);
for (const [key, filename] of Object.entries(CORE_FILES)) {
  assert(same(core[key], await readBound(final.artifacts[key])), key);
  assert(same(final.artifacts[key], bind(target(filename), core[key])), key);
}
const renderer = await readBound(final.renderer.execution), admission = await readBound(final.renderer.admission);
const layout = await readBound(final.renderer.lineLayout);
assert.equal(renderer.exitCode, 0);
assert.equal(renderer.result.status, 'completed');
assert.equal(renderer.result.qc.status, 'passed');
assert.deepEqual(renderer.result.qc.violations, []);
assert.equal(admission.status, 'accepted');
assert(same(renderer.rendererJobBinding, final.artifacts.rendererJob));
assert.equal(renderer.result.qc.instructionEvidence.length, core.instruction.instructions.length);
assert.equal(layout.entries.length, core.instruction.instructions.length);
const finalSha = await fileSha(path.join(ROOT, final.renderer.video.path));
assert.equal(finalSha, final.renderer.video.fileSha256);
const sourceById = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
const retainedIds = adoption.selectedParts.flatMap((p: Json) => p.sourceSegmentIds);
assert.deepEqual(core.meaning.atomOccurrences.map((a: Json) => a.sourceSegmentId), retainedIds);
assert.equal(core.instruction.instructions.map((v: Json) => v.content.text).join(''),
  retainedIds.map((id: number) => sourceById.get(id)!.text).join(''));
const firstFrameCount = mappings[0].outputEndFrame, frameCount = timeline.baseMedia.expectedFrameCount;
assert.equal(renderer.result.qc.mediaEvidence.observed.video.frameCount, frameCount);
assert.equal(renderer.result.qc.mediaEvidence.expectedFrameCount, frameCount);
assert.equal(renderer.result.qc.mediaEvidence.observed.audio.packetPayloadSha256,
  manifest.outputs.baseMedia.audioPacketPayloadSha256);
assert.equal(renderer.result.qc.mediaEvidence.expectedAudio.packetPayloadSha256,
  manifest.outputs.baseMedia.audioPacketPayloadSha256);
const expectedJob = structuredClone(c.rendererTemplate);
for (const k of ['jobId', 'attemptId', 'instructionArtifactBinding', 'lineEndProjectionBinding', 'cropAppliedBaseMedia', 'publication']) {
  expectedJob[k] = core.rendererJob[k];
}
assert.deepEqual(core.rendererJob, expectedJob, 'RENDERER_STYLE_RUNTIME_RULES_CHANGED');
const bindingFiles = [];
for (const name of await readdir(path.join(ROOT, target('process-observations')), {recursive: true})) {
  const p = target(`process-observations/${name}`);
  try {
    const bytes = await readFile(path.join(ROOT, p));
    bindingFiles.push({path: p, sizeBytes: bytes.length, fileSha256: sha(bytes), encoding: 'base64', bytes: bytes.toString('base64')});
  } catch (e: any) {if (e.code !== 'EISDIR') throw e;}
}
bindingFiles.sort((a, b) => a.path.localeCompare(b.path));
assert(bindingFiles.length > 0);
const processEvidence = await publish(target('process-observation-evidence.json'), {
  schemaVersion: 'distant-connection-pair-process-evidence-v001', status: 'captured-exact-bytes', files: bindingFiles});
const traces = core.instruction.instructions.map((ins: Json, i: number) => ({
  text: ins.content.text, outputTime: ins.outputTime, lines: layout.entries[i],
  sourceAtomOccurrenceIds: ins.targetProvenance.atomOccurrenceIds,
}));
const evidence = {schemaVersion: 'distant-connection-pair-final-verification-v001', technicalStatus: 'passed',
  humanQuality: 'not-evaluated', perceptualCaptionSync: 'not-evaluated',
  verificationBinding: bind(target('verification.json'), final), planBinding: c.planBinding,
  machineAdoptionBinding: bind(target('machine-adoption.json'), adoption), editPlanBinding: bind(target('edit-plan.json'), editPlan),
  checks: {newSemanticJudgment: 'saved-current-codex-response', adoptionReconstruction: 'exact',
    captionCoreReconstruction: 'all-eight-artifacts-exact', sourceToFrameAndAudioMapping: 'exact',
    sourceTextCoverage: 'exact', frameCount, firstPartFrameCount: firstFrameCount,
    durationMs: frameCount * 1000 / 30, captionCount: traces.length,
    rendererAdmission: 'accepted', technicalQc: 'passed', finalCaptionVisibilityChecks: traces.length,
    renderedAudioPacketPayload: 'exact-match-to-base-media',
    sourceOutputAndImplementationSha: 'exact', displaySkillRendererStyleRuntime: 'unchanged',
    historicalHumanQualityInherited: false, freeTimeOrOffsetIntroduced: false,
    internalDeletion: 'none', captionTimingBasis: 'saved-STT-without-perceptual-accuracy-claim'},
  actualFrameAndAudioMappings: mappings, actualCaptionTraces: traces, video: final.renderer.video,
  rendererQc: renderer.result.qc, processEvidence};
await publish(target('final-verification.json'), evidence);
console.log(JSON.stringify({status: evidence.technicalStatus, checks: evidence.checks, video: evidence.video}));
