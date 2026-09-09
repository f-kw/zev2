import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {access, mkdir} from 'node:fs/promises';
import {ROOT, readJson, readBound, publish, bind, fileSha, pass, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadUnseenContextV001} from './run_unseen_material_thin_plan_v001.mts';
import {ROOT024, WORK024} from './unseen_material_thin_plan_v001.mts';
import {runPresentationInstructionRendererJobFileV002 as render}
  from './run_presentation_instruction_renderer_job_v002.ts';
import {validatePresentationInstructionRendererJobV002 as validateJob}
  // @ts-expect-error Existing JS validator has no declaration file.
  from './presentation_renderer_admission_receipt_v002.mjs';

const retryRoot = `${WORK024}/render-attempt-v006`;
const outputRoot = 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/render-v006';
const parentPath = `${WORK024}/render-attempt-v005/renderer-job.json`;
const jobPath = `${retryRoot}/renderer-job.json`;
const fixPath = `${retryRoot}/setup-fix.json`;
const decisionPath = `${ROOT024}/advisor-qc-scaling-decision-v001.json`;
const proofPath = `${ROOT024}/qc-optimization-verification-v001.json`;
const coreProofPath = `${ROOT024}/core-caption-linkage-verification-v001.json`;
const corePath = 'evals/clip_composition/render_presentation_v002.mjs';
const implementationPath = path.relative(ROOT, fileURLToPath(import.meta.url));

async function verifyInputs() {
  const c = await loadUnseenContextV001('selection');
  const decision = await readJson(decisionPath);
  assert.equal(decision.decision, 'conditional-continue');
  assert.equal(decision.auditedCheckpoint, '174b30716a1808dc3304756d9a0e0189576144ed');
  const proof = await readJson(proofPath);
  assert.equal(proof.status, 'passed');
  assert.equal(proof.mainEncodingArgumentsUnchanged, true);
  assert.equal(proof.omittedFramesPixelIdentical, true);
  assert.equal(proof.allRequiredNegativeCasesVerified, true);
  assert.equal(proof.implementationBinding.path, corePath);
  assert.equal(await fileSha(path.join(ROOT, corePath)), proof.implementationBinding.fileSha256);
  for (const ref of proof.artifacts) assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
  const core = await readJson(coreProofPath);
  assert.equal(core.status, 'passed');
  for (const ref of core.artifacts) assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
  const parent = await readJson(parentPath);
  await readBound(parent.instructionArtifactBinding);
  await readBound(parent.registryBindings.styleProfileRegistry);
  await readBound(parent.registryBindings.rendererTrust);
  return {c, decision, proof, parent, core};
}

async function prepare() {
  const {decision, proof, parent, core} = await verifyInputs();
  for (const p of [retryRoot, outputRoot, `${WORK024}/render-completion.json`]) {
    await assert.rejects(access(path.join(ROOT, p)), (e: NodeJS.ErrnoException) => e.code === 'ENOENT');
  }
  const implementations = await Promise.all(parent.rendererImplementationBindings.map(async (row: Json) => {
    const observed = await fileSha(path.join(ROOT, row.path));
    if (row.path === corePath) assert.notEqual(observed, row.fileSha256);
    else assert.equal(observed, row.fileSha256, 'ONLY_APPROVED_QC_IMPLEMENTATION_MAY_CHANGE');
    return {...row, fileSha256: observed};
  }));
  const job = {...structuredClone(parent), jobId: 'unseen-SsdxVhwxyYo-024-v001-renderer-render-v006',
    attemptId: 'unseen-SsdxVhwxyYo-024-v001-render-v006', rendererImplementationBindings: implementations,
    publication: {admissionReceiptPath: `${retryRoot}/admission-receipt.json`,
      lineLayoutPath: `${retryRoot}/line-layout.json`, renderOutputRoot: outputRoot}};
  assert.deepEqual({...job, jobId: parent.jobId, attemptId: parent.attemptId,
    rendererImplementationBindings: parent.rendererImplementationBindings, publication: parent.publication}, parent);
  pass(validateJob(job), 'QC_OPTIMIZED_JOB_INVALID');
  await mkdir(path.join(ROOT, retryRoot));
  const jb = await publish(jobPath, job);
  await publish(fixPath, {schemaVersion: 'unseen-material-render-qc-optimization-preflight-v001',
    status: 'preflight-passed', decisionBinding: bind(decisionPath, decision),
    priorRendererJobBinding: bind(parentPath, parent), rendererJobBinding: jb,
    qcEquivalenceBinding: bind(proofPath, proof), coreCaptionVerificationBinding: bind(coreProofPath, core),
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(fileURLToPath(import.meta.url))},
    changedRendererImplementation: proof.implementationBinding,
    unchanged: ['source', 'transcript', 'discovery', 'selection', 'retention', 'base-media',
      'all-343-caption-instructions-cue-ends-line-ends-text-and-times', 'font95-setting-and-trust',
      'main-video-composite-and-encode-arguments', 'qc-schema-criteria-and-coverage'],
    operation: 'Feed the complete unchanged counterfactual encoder timeline. Deliver encoded MP4 packets to a decoder; request normal encoder shutdown only after the representative encoded frame exists. No full counterfactual MP4 is retained. Extract the main encoded frame with frame-exact integer-second seeking.',
    previousAttempt: 'v005 was terminated after preserving its partial state; no final video or QC was published from it.'});
  console.log(JSON.stringify({status: 'qc-optimization-preflight-passed', jobPath}));
}

async function execute() {
  const {c, decision, proof, parent} = await verifyInputs();
  const fix = await readJson(fixPath), job = await readJson(jobPath);
  assert.equal(await fileSha(fileURLToPath(import.meta.url)), fix.implementationBinding.fileSha256);
  assert.deepEqual(fix.rendererJobBinding, bind(jobPath, job));
  assert.deepEqual(fix.priorRendererJobBinding, bind(parentPath, parent));
  assert.deepEqual(fix.decisionBinding, bind(decisionPath, decision));
  assert.deepEqual(fix.qcEquivalenceBinding, bind(proofPath, proof));
  console.log(JSON.stringify({status: 'qc-optimized-render-started', jobPath}));
  const executed: Json = await render(jobPath, {workspaceRoot: ROOT});
  const execution = await publish(`${retryRoot}/renderer-result.json`, {
    schemaVersion: 'unseen-material-renderer-execution-v002', rendererJobBinding: bind(jobPath, job),
    setupFixBinding: bind(fixPath, fix), exitCode: executed.exitCode, result: executed.result});
  assert.equal(executed.exitCode, 0, 'QC_OPTIMIZED_RENDER_FAILED');
  assert.equal(executed.result?.status, 'completed');
  assert.equal(executed.result?.qc?.status, 'passed');
  const videoPath = `${outputRoot}/presentation-rendered-v002.mp4`;
  const completion = await publish(`${WORK024}/render-completion.json`, {
    schemaVersion: 'unseen-material-render-completion-v001', status: 'technical-render-complete',
    planBinding: c.planBinding, machineAdoptionBinding: bind(`${WORK024}/machine-adoption.json`, await readJson(`${WORK024}/machine-adoption.json`)),
    execution, admission: bind(job.publication.admissionReceiptPath, await readJson(job.publication.admissionReceiptPath)),
    lineLayout: bind(job.publication.lineLayoutPath, await readJson(job.publication.lineLayoutPath)), qc: 'passed',
    video: {path: videoPath, fileSha256: await fileSha(path.join(ROOT, videoPath))}, humanQuality: 'not-evaluated'});
  console.log(JSON.stringify({status: 'technical-render-complete', completion}));
}

if (process.argv[2] === 'prepare') await prepare();
else if (process.argv[2] === 'render') await execute();
else throw new Error('Expected prepare or render');
