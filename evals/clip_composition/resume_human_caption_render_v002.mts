import assert from 'node:assert/strict';
import path from 'node:path';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {WORK, REPAIR, reconstructHumanRepairV001} from './repair_internal_caption_human_v001.mts';
import {runPresentationInstructionRendererJobFileV002 as render} from './run_presentation_instruction_renderer_job_v002.ts';
const root = `${WORK}/caption-human-repair-render-v002`;
const out = (name: string) => `${root}/${name}.json`;
const exactFile = async (p: string) => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))});
const b = await reconstructHumanRepairV001();
for (const [key, binding] of Object.entries(b.artifacts) as [string, Json][]) assert(same(b.core[key], await readBound(binding)));
const failedPath = `${REPAIR}/renderer-result.json`, failed = await readJson(failedPath);
assert.equal(failed.result.failure.message, 'layout inspector produced no result');
const job = structuredClone(b.core.rendererJob); job.jobId += '-render-v002'; job.attemptId += '-render-v002';
job.publication = {admissionReceiptPath: out('admission-receipt'), lineLayoutPath: out('line-layout'), renderOutputRoot: `${root}/render`};
const jb = await publish(out('renderer-job'), job);
const setup = await publish(out('setup-correction'), {schemaVersion: 'digest-human-caption-render-setup-correction-v002',
  failedExecution: bind(failedPath, failed), originalArtifacts: b.artifacts,
  evidence: await exactFile(`${REPAIR}/process-observations/digest-human-caption-repair-20260907-v001/0003-layout-inspection/stderr.txt`),
  cause: 'sandbox-denied-tsx-local-ipc-listen-EPERM', correction: 'same-renderer-with-local-process-permission-new-publication-only',
  rendererJob: jb, changedJobFields: ['jobId', 'attemptId', 'publication'],
  implementation: await exactFile('evals/clip_composition/resume_human_caption_render_v002.mts')});
const rendered = await render(jb.path, {workspaceRoot: ROOT});
const eb = await publish(out('renderer-result'), {schemaVersion: 'digest-human-caption-renderer-execution-v001',
  rendererJobBinding: jb, exitCode: rendered.exitCode, result: rendered.result});
assert.equal(rendered.exitCode, 0); assert.equal(rendered.result?.status, 'completed'); assert.equal(rendered.result?.qc?.status, 'passed');
const qc = rendered.result!.qc; assert.deepEqual(qc.violations, []);
assert.equal(qc.mediaEvidence.observed.video.frameCount, b.timeline.baseMedia.expectedFrameCount);
assert.equal(qc.mediaEvidence.observed.audio.packetPayloadSha256, b.generation.audio.encoded.packetPayloadSha256);
const video = await exactFile(`${root}/render/presentation-rendered-v002.mp4`);
assert.deepEqual(qc.instructionEvidence.map((r: Json) => r.instructionId), b.core.instruction.instructions.map((r: Json) => r.instructionId));
for (const [i, row] of qc.instructionEvidence.entries()) {
  const interval = b.core.instruction.instructions[i].outputTime;
  assert(row.representativeFrame >= interval.startFrame && row.representativeFrame < interval.endFrameExclusive);
  assert.equal(row.applicationOverlayFile, row.inspectedOverlayFile); assert.equal(row.applicationOverlaySha256, row.overlaySha256);
  assert.equal((await exactFile(`${root}/render/${row.applicationOverlayFile}`)).fileSha256, row.overlaySha256);
}
const admission = await readJson(out('admission-receipt')); assert.equal(admission.status, 'accepted');
const manifest = {schemaVersion: 'digest-human-caption-repair-manifest-v001', status: 'review-ready',
  parentManifest: b.core.adoption.parentManifest, baseMedia: b.parent.baseMedia, artifacts: {...b.artifacts, rendererJob: jb}, setupCorrection: setup,
  renderer: {execution: eb, admission: bind(out('admission-receipt'), admission),
    lineLayout: bind(out('line-layout'), await readJson(out('line-layout'))), video, qc: 'passed'},
  checks: {formalInputReconstruction: 'exact', other30TextFramesLineBreaksSourceIds: 'exact', humanFrameProjection: 'exact',
    unchangedBaseMediaAndAudioPackets: 'exact', instructionOverlayBytes: '32-exact',
    sourceTextAccounting: '415-caption-atoms-plus-9-explicitly-omitted-equals-original-424'},
  counts: {captions: 32, unchangedCaptions: 30, retainedMediaRanges: b.timeline.segments.length,
    frameCount: qc.mediaEvidence.observed.video.frameCount, durationMs: qc.mediaEvidence.observed.durationMs},
  humanQuality: 'pending-three-local-reviews', operations: {newInference: 0, apiCommunication: 0, newMaterial: 0}};
await publish(out('manifest'), manifest); console.log(JSON.stringify(manifest));
