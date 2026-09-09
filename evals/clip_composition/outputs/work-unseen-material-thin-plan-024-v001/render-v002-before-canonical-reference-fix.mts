import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {access, lstat, mkdir, realpath} from 'node:fs/promises';
import {
  ROOT, readJson, publish, bind, fileSha, pass, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadUnseenContextV001} from './run_unseen_material_thin_plan_v001.mts';
import {WORK024} from './unseen_material_thin_plan_v001.mts';
import {runPresentationInstructionRendererJobFileV002 as render}
  from './run_presentation_instruction_renderer_job_v002.ts';
import {validatePresentationInstructionRendererJobV002 as validateJob}
  // @ts-expect-error Existing JS validator has no declaration file.
  from './presentation_renderer_admission_receipt_v002.mjs';

const retryRoot = `${WORK024}/render-attempt-v002`;
const outputRoot = 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/render-v002';
const absolute = (p: string) => path.join(ROOT, p);
const receiptPath = `${retryRoot}/setup-fix.json`;

// Keep the executed v001 files immutable. This forward attempt changes only the
// destination and attempt identity; it reuses the admitted media and instructions.
const c = await loadUnseenContextV001('selection');
const parentJobPath = `${WORK024}/renderer-job.json`;
const parentJob = await readJson(parentJobPath);
const failurePath = `${WORK024}/renderer-result.json`;
const failed = await readJson(failurePath);
assert.equal(failed.exitCode, 1);
assert.equal(failed.result.failure.stage, 'output-reservation');
assert.deepEqual(failed.result.failure.violations.map((v: Json) => v.details?.reason),
  ['UNSAFE_PRESENTATION_OUTPUT_DIRECTORY']);
assert.deepEqual(failed.rendererJobBinding, bind(parentJobPath, parentJob));
const baseReceipt = await readJson(parentJob.cropAppliedBaseMedia.validationReceipt.path);
assert.equal(baseReceipt.status, 'passed');
assert(Object.values(baseReceipt.checks).every(v => v === 'passed'));
const adopted = await readJson(`${WORK024}/machine-adoption.json`);
assert.deepEqual(baseReceipt.machineAdoptionBinding, bind(`${WORK024}/machine-adoption.json`, adopted));
assert.deepEqual(baseReceipt.editPlanBinding, bind(`${WORK024}/edit-plan.json`, await readJson(`${WORK024}/edit-plan.json`)));
const captionProof = await readJson(`${WORK024}/../core-caption-linkage-verification-v001.json`);
assert.equal(captionProof.status, 'passed');
for (const ref of captionProof.artifacts) {
  assert.equal(await fileSha(absolute(ref.path)), ref.fileSha256, 'ADMITTED_CAPTION_OR_MEDIA_RECORD_CHANGED');
}
const job = structuredClone(parentJob);
job.jobId = `${parentJob.jobId}-render-v002`;
job.attemptId = `${parentJob.attemptId}-render-v002`;
job.publication = {
  admissionReceiptPath: `${retryRoot}/admission-receipt.json`,
  lineLayoutPath: `${retryRoot}/line-layout.json`, renderOutputRoot: outputRoot,
};
assert.deepEqual({...job, jobId: parentJob.jobId, attemptId: parentJob.attemptId,
  publication: parentJob.publication}, parentJob, 'RENDER_CONTENT_CHANGED');
pass(validateJob(job), 'RETRY_JOB_INVALID');
const permitted = absolute('evals/clip_composition/outputs/presentation');
assert.equal(await realpath(permitted), permitted, 'EXPECTED_REAL_PRESENTATION_ROOT');
assert((await lstat(permitted)).isDirectory());
const relative = path.relative(permitted, absolute(outputRoot));
assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'OUTPUT_OUTSIDE_EXISTING_PRESENTATION_ROOT');
for (const p of [retryRoot, outputRoot, `${WORK024}/render-completion.json`]) {
  await assert.rejects(access(absolute(p)), (e: NodeJS.ErrnoException) => e.code === 'ENOENT', 'FRESH_OUTPUT_REQUIRED');
}
await mkdir(absolute(retryRoot));
const jobPath = `${retryRoot}/renderer-job.json`;
const jobBinding = await publish(jobPath, job);
const fixBinding = await publish(receiptPath, {
  schemaVersion: 'unseen-material-render-output-path-fix-v001', status: 'preflight-passed',
  classification: 'evaluation-job-wiring', reason: 'The original rendering destination was outside the existing presentation subtree.',
  priorRendererJobBinding: bind(parentJobPath, parentJob), priorFailureBinding: bind(failurePath, failed),
  rendererJobBinding: jobBinding,
  implementationBinding: {path: path.relative(ROOT, fileURLToPath(import.meta.url)),
    fileSha256: await fileSha(fileURLToPath(import.meta.url))},
  unchanged: ['source', 'transcript', 'thin-plan', 'candidate-discovery', 'candidate-selection', 'adoption',
    'retention', 'base-media', 'caption-instructions', 'line-end-projection', 'renderer', 'style', 'output-policy'],
  changedFields: ['jobId', 'attemptId', 'publication'],
  existingOutputSubtree: 'evals/clip_composition/outputs/presentation', newOutputRoot: outputRoot,
  checks: {onlyDestinationAndAttemptIdentityChanged: 'passed', existingJobValidator: 'passed',
    admittedCoreRecordsUnchanged: 'passed', existingOutputPolicyMembership: 'passed', freshAttemptPaths: 'passed'},
});
console.log(JSON.stringify({status: 'renderer-path-preflight-passed', jobPath, outputRoot}));
const executed: Json = await render(jobPath, {workspaceRoot: ROOT});
const execution = await publish(`${retryRoot}/renderer-result.json`, {
  schemaVersion: 'unseen-material-renderer-execution-v002', rendererJobBinding: jobBinding,
  setupFixBinding: fixBinding, exitCode: executed.exitCode, result: executed.result,
});
assert.equal(executed.exitCode, 0, 'RENDER_RETRY_FAILED');
assert.equal(executed.result?.status, 'completed', 'RENDER_RETRY_NOT_COMPLETED');
assert.equal(executed.result?.qc?.status, 'passed', 'RENDER_RETRY_QC_FAILED');
const videoPath = `${outputRoot}/presentation-rendered-v002.mp4`;
const completion = await publish(`${WORK024}/render-completion.json`, {
  schemaVersion: 'unseen-material-render-completion-v001', status: 'technical-render-complete',
  planBinding: c.planBinding, machineAdoptionBinding: bind(`${WORK024}/machine-adoption.json`, adopted),
  execution, admission: bind(job.publication.admissionReceiptPath, await readJson(job.publication.admissionReceiptPath)),
  lineLayout: bind(job.publication.lineLayoutPath, await readJson(job.publication.lineLayoutPath)),
  qc: 'passed', video: {path: videoPath, fileSha256: await fileSha(absolute(videoPath))}, humanQuality: 'not-evaluated',
});
console.log(JSON.stringify({status: 'technical-render-complete', completion}));
