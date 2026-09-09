import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {ROOT, readJson, publish, bind, fileSha, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadUnseenContextV001} from './run_unseen_material_thin_plan_v001.mts';
import {WORK024} from './unseen_material_thin_plan_v001.mts';
import {runPresentationInstructionRendererJobFileV002 as render}
  from './run_presentation_instruction_renderer_job_v002.ts';

const retryRoot = `${WORK024}/render-attempt-v003`;
const jobPath = `${retryRoot}/renderer-job.json`;
const fixPath = `${retryRoot}/setup-fix.json`;
const c = await loadUnseenContextV001('selection');
const fix = await readJson(fixPath);
assert.equal(fix.status, 'preflight-passed');
const job = await readJson(jobPath);
assert.deepEqual(bind(jobPath, job), fix.rendererJobBinding);
assert.equal(await fileSha(fileURLToPath(import.meta.url)), fix.implementationBinding.fileSha256);
const parent = await readJson(fix.priorRendererJobBinding.path);
assert.deepEqual(bind(fix.priorRendererJobBinding.path, parent), fix.priorRendererJobBinding);
assert.deepEqual({...job, jobId: parent.jobId, attemptId: parent.attemptId, publication: parent.publication}, parent);
const failed = await readJson(fix.priorFailureBinding.path);
assert.deepEqual(bind(fix.priorFailureBinding.path, failed), fix.priorFailureBinding);
assert.equal(failed.result.failure.message, 'layout inspector produced no result');
const stderr = await readFile(path.join(ROOT, fix.processFailureBinding.path), 'utf8');
assert.equal(await fileSha(path.join(ROOT, fix.processFailureBinding.path)), fix.processFailureBinding.fileSha256);
assert(stderr.includes('listen EPERM: operation not permitted') && stderr.includes('tsx-501'));
assert.equal(job.publication.renderOutputRoot,
  'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/render-v003');
const adopted = await readJson(`${WORK024}/machine-adoption.json`);
const proof = await readJson(fix.coreCaptionVerificationBinding.path);
assert.deepEqual(bind(fix.coreCaptionVerificationBinding.path, proof), fix.coreCaptionVerificationBinding);
for (const ref of proof.artifacts) assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
console.log(JSON.stringify({status: 'render-runtime-retry-started', jobPath}));
const executed: Json = await render(jobPath, {workspaceRoot: ROOT});
const execution = await publish(`${retryRoot}/renderer-result.json`, {
  schemaVersion: 'unseen-material-renderer-execution-v002', rendererJobBinding: bind(jobPath, job),
  setupFixBinding: bind(fixPath, fix), exitCode: executed.exitCode, result: executed.result,
});
assert.equal(executed.exitCode, 0, 'RENDER_RUNTIME_RETRY_FAILED');
assert.equal(executed.result?.status, 'completed');
assert.equal(executed.result?.qc?.status, 'passed');
const videoPath = `${job.publication.renderOutputRoot}/presentation-rendered-v002.mp4`;
const completion = await publish(`${WORK024}/render-completion.json`, {
  schemaVersion: 'unseen-material-render-completion-v001', status: 'technical-render-complete',
  planBinding: c.planBinding, machineAdoptionBinding: bind(`${WORK024}/machine-adoption.json`, adopted),
  execution, admission: bind(job.publication.admissionReceiptPath, await readJson(job.publication.admissionReceiptPath)),
  lineLayout: bind(job.publication.lineLayoutPath, await readJson(job.publication.lineLayoutPath)), qc: 'passed',
  video: {path: videoPath, fileSha256: await fileSha(path.join(ROOT, videoPath))}, humanQuality: 'not-evaluated',
});
console.log(JSON.stringify({status: 'technical-render-complete', completion}));
