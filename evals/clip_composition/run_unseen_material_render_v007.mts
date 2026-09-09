import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {access, copyFile, lstat, mkdir} from 'node:fs/promises';
import {ROOT, readJson, readBound, publish, bind, fileSha, pass, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadUnseenContextV001} from './run_unseen_material_thin_plan_v001.mts';
import {ROOT024, WORK024} from './unseen_material_thin_plan_v001.mts';
import {runPresentationInstructionRendererJobFileV002 as render}
  from './run_presentation_instruction_renderer_job_v002.ts';
import {validatePresentationInstructionRendererJobV002 as validateJob}
  // @ts-expect-error Existing JS validator has no declaration file.
  from './presentation_renderer_admission_receipt_v002.mjs';
import {buildPresentationRendererOverlayAdapterV001}
  // @ts-expect-error Existing renderer has no declaration file.
  from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001}
  // @ts-expect-error Existing observer has no declaration file.
  from './presentation_renderer_process_observation_v001.mjs';

const retryRoot = `${WORK024}/render-attempt-v008`;
const outputRoot = 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/render-v008';
const jobPath = `${retryRoot}/renderer-job.json`, fixPath = `${retryRoot}/setup-fix.json`;
const decisionPath = `${ROOT024}/advisor-execution-resources-decision-v001.json`;
const parentPath = `${WORK024}/render-attempt-v007/renderer-job.json`;
const failurePath = `${WORK024}/render-attempt-v007/renderer-result.json`;
const coreProofPath = `${ROOT024}/core-caption-linkage-verification-v001.json`;
const fontProofPath = `${ROOT024}/font-size-selection-v001.json`;
const pngProofPath = `${ROOT024}/font94-all-actual-png-verification-v001.json`;
const resourceProofPath = `${ROOT024}/resource-control-verification-v001.json`;
const qcProofPath = `${ROOT024}/qc-optimization-verification-v001.json`;
const implementationPath = path.relative(ROOT, fileURLToPath(import.meta.url));
const changedPaths = ['evals/clip_composition/render_presentation_v002.mjs',
  'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts'];

async function readEvidence(ref: Json) {
  const absolute = path.join(ROOT, ref.path), observed = await lstat(absolute);
  assert(observed.isFile() && !observed.isSymbolicLink());
  assert.equal(await fileSha(absolute), ref.fileSha256);
  if (ref.bytes !== undefined) assert.equal(observed.size, ref.bytes);
  return readJson(ref.path);
}

async function verifyInputs() {
  const c = await loadUnseenContextV001('selection');
  const decision = await readJson(decisionPath);
  assert.equal(decision.decision, 'continue');
  assert.equal(decision.auditedCheckpoint, '91b740d7707b812fdf22de4129e157309e0f9155');
  assert.deepEqual(decision.allowedExecutionResources, {pngDecoderThreads: 1, filterComplexThreads: 1});
  assert.equal(decision.allowSingleRestartOfVerifiedFont94Pngs, true);
  const parent = await readJson(parentPath), failed = await readJson(failurePath);
  assert.deepEqual(failed.rendererJobBinding, bind(parentPath, parent));
  assert.equal(failed.result.failure.status, 'process_failed');
  const coreProof = await readJson(coreProofPath);
  assert.equal(coreProof.status, 'passed');
  for (const ref of coreProof.artifacts) assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
  const resourceProof = await readJson(resourceProofPath);
  assert.equal(resourceProof.status, 'passed');
  assert(resourceProof.defaultArgumentsUnchanged && resourceProof.allDecodedFramesIdentical
    && resourceProof.streamedQcFramesIdentical && resourceProof.baseDecoderAndEncoderThreadsUnchanged);
  for (const ref of [...resourceProof.implementationBindings, ...resourceProof.artifacts]) {
    assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
  }
  for (const old of parent.rendererImplementationBindings) {
    const current = await fileSha(path.join(ROOT, old.path));
    if (changedPaths.includes(old.path)) {
      assert.equal(resourceProof.priorImplementationBindings.find((r: Json) => r.path === old.path)?.fileSha256, old.fileSha256);
      assert.equal(resourceProof.implementationBindings.find((r: Json) => r.path === old.path)?.fileSha256, current);
    } else assert.equal(current, old.fileSha256);
  }
  const qcProof = await readJson(qcProofPath);
  assert.equal(qcProof.status, 'passed');
  assert.equal(qcProof.implementationBinding.fileSha256,
    resourceProof.priorImplementationBindings.find((r: Json) => r.path === qcProof.implementationBinding.path)?.fileSha256);
  for (const ref of qcProof.artifacts) assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
  const fontProof = await readJson(fontProofPath);
  assert.equal(fontProof.status, 'single-caption-probe-passed'); assert.equal(fontProof.selectedFontSizePx, 94);
  const pngProof = await readJson(pngProofPath);
  assert.equal(pngProof.status, 'passed'); assert.equal(pngProof.actualPngCount, 343);
  assert.equal(pngProof.deterministicRepeatCount, 343); assert.equal(pngProof.fontSizePx, 94);
  assert.equal(pngProof.qc.status, 'passed'); assert.equal(pngProof.qc.violations.length, 0);
  assert.equal(pngProof.rendererJob.fileSha256, await fileSha(path.join(ROOT, parentPath)));
  assert.equal(await fileSha(path.join(ROOT, pngProof.implementation.path)), pngProof.implementation.fileSha256);
  const inventory = await readEvidence(pngProof.retainedInventory);
  assert.equal(inventory.workRoot, 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/.render-v007.presentation-renderer-v002-work-94CMqV');
  for (const ref of inventory.files) {
    const absolute = path.join(ROOT, ref.path), observed = await lstat(absolute);
    assert(observed.isFile() && !observed.isSymbolicLink());
    assert.equal(observed.size, ref.bytes); assert.equal(await fileSha(absolute), ref.fileSha256);
  }
  const drawnInput = await readEvidence(pngProof.sourceLayoutInput);
  assert.equal(drawnInput.overlays.length, 343);
  for (const props of drawnInput.overlays) assert.equal(props.visualState.textStyle.fontSizePx, 94);
  await readBound(parent.registryBindings.styleProfileRegistry);
  await readBound(parent.registryBindings.rendererTrust);
  return {c, parent, failed, decision, resourceProof, qcProof, fontProof, pngProof, inventory, drawnInput};
}

async function prepare() {
  const inputs = await verifyInputs(); const {parent, failed, decision, resourceProof, qcProof, fontProof, pngProof} = inputs;
  for (const p of [retryRoot, outputRoot, `${WORK024}/render-completion.json`]) {
    await assert.rejects(access(path.join(ROOT, p)), (e: NodeJS.ErrnoException) => e.code === 'ENOENT');
  }
  const implementations = await Promise.all(parent.rendererImplementationBindings.map(async (ref: Json) => ({
    ...ref, fileSha256: await fileSha(path.join(ROOT, ref.path)),
  })));
  const job = {...structuredClone(parent), jobId: 'unseen-SsdxVhwxyYo-024-v001-renderer-render-v008',
    attemptId: 'unseen-SsdxVhwxyYo-024-v001-render-v008', rendererImplementationBindings: implementations,
    publication: {admissionReceiptPath: `${retryRoot}/admission-receipt.json`,
      lineLayoutPath: `${retryRoot}/line-layout.json`, renderOutputRoot: outputRoot}};
  assert.deepEqual({...job, jobId: parent.jobId, attemptId: parent.attemptId,
    rendererImplementationBindings: parent.rendererImplementationBindings, publication: parent.publication}, parent);
  pass(validateJob(job), 'RESOURCE_CONTROL_JOB_INVALID'); await mkdir(path.join(ROOT, retryRoot));
  const jb = await publish(jobPath, job);
  await publish(fixPath, {schemaVersion: 'unseen-material-execution-resources-preflight-v001', status: 'preflight-passed',
    decisionBinding: bind(decisionPath, decision), priorRendererJobBinding: bind(parentPath, parent),
    priorFailureBinding: bind(failurePath, failed), coreCaptionVerificationBinding: bind(coreProofPath, await readJson(coreProofPath)),
    qcEquivalenceBinding: bind(qcProofPath, qcProof), fontSizeSelectionBinding: bind(fontProofPath, fontProof),
    resourceEquivalenceBinding: bind(resourceProofPath, resourceProof), retainedPngVerificationBinding: bind(pngProofPath, pngProof),
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(fileURLToPath(import.meta.url))},
    rendererJobBinding: jb, executionControl: {serializePngAndFilters: true},
    overlayProvenance: {mode: 'one-time-restart-with-verified-retained-artifacts', sourceAttempt: 'render-attempt-v007',
      sourceRendererJobBinding: bind(parentPath, parent), inventoryBinding: pngProof.retainedInventory,
      newlyRenderedInThisAttempt: false, sourceNewRenderAndRepeatVerified: true},
    unchanged: ['candidate-selection-retention', 'all-caption-content-boundaries-timing', 'font94-and-visual-style',
      'base-media', 'overlay-pixels-order-and-fade', 'base-decoder-and-video-encoder-threads',
      'video-encoding-quality-audio-copy', 'formal-schema', 'all343-final-qc-criteria', 'other-callers-defaults'],
    note: 'The v007 images were freshly rendered at 94px and passed actual PNG QC. This attempt copies those exact bound artifacts as an explicitly approved one-time restart input; no new PNG rendering is claimed. Only PNG decoder and complex-filter threading changes.'});
  console.log(JSON.stringify({status: 'execution-resources-preflight-passed', jobPath}));
}

async function execute() {
  const inputs = await verifyInputs(); const {c, parent, drawnInput, inventory, pngProof} = inputs;
  const fix = await readJson(fixPath), job = await readJson(jobPath);
  assert.equal(fix.status, 'preflight-passed');
  assert.equal(await fileSha(fileURLToPath(import.meta.url)), fix.implementationBinding.fileSha256);
  assert.deepEqual(bind(jobPath, job), fix.rendererJobBinding);
  assert.deepEqual(fix.priorRendererJobBinding, bind(parentPath, parent));
  for (const key of ['decisionBinding', 'resourceEquivalenceBinding', 'retainedPngVerificationBinding', 'fontSizeSelectionBinding']) await readBound(fix[key]);
  const references = new Map<string, Json>(inventory.files.map((r: Json) => [r.path, r]));
  const saved = new Map<string, {props: Json; stem: string; stillCount: number}>(drawnInput.overlays.map((props: Json, i: number) => [props.instructionId,
    {props, stem: `${String(i + 1).padStart(2, '0')}-${createHash('sha256').update(props.instructionId).digest('hex').slice(0, 12)}`, stillCount: 0}]));
  const copies: Json[] = [];
  const verifiedProps = new Set<string>();
  const originalAdapter = buildPresentationRendererOverlayAdapterV001({remotionPath: job.runtimeBindings.remotion.path,
    chromiumPath: job.runtimeBindings.chromium.path, processObserver: createPresentationRendererProcessObserverV001({
      observationDirectory: path.join(ROOT, retryRoot, 'restart-provenance-observations')})});
  const checkProps = (props: Json) => {const source = saved.get(props.instructionId); assert(source);
    assert.deepEqual(props, source.props, 'RESTART_DRAW_INPUT_DIFFERS'); verifiedProps.add(props.instructionId); return source;};
  const copy = async (relativeSource: string, output: string, kind: string, instructionId: string) => {
    const sourceRef = references.get(relativeSource); assert(sourceRef, 'UNBOUND_RESTART_ARTIFACT');
    assert.equal(await fileSha(path.join(ROOT, relativeSource)), sourceRef.fileSha256);
    await copyFile(path.join(ROOT, relativeSource), output, constants.COPYFILE_EXCL);
    assert.equal(await fileSha(output), sourceRef.fileSha256);
    copies.push({instructionId, kind, source: sourceRef, destination: path.relative(ROOT, output), fileSha256: sourceRef.fileSha256});
  };
  const overlayAdapter = {
    buildProps: (element: Json, plan: Json, registry: Json) => {const props = originalAdapter.buildProps(element, plan, registry); checkProps(props); return props;},
    renderStill: async (props: Json, output: string) => {const row = checkProps(props); assert(row.stillCount < 2);
      const repeat = row.stillCount++ === 1;
      await copy(`${inventory.workRoot}/${repeat ? 'scratch/frames' : 'publish/overlays'}/${row.stem}${repeat ? '.repeat' : ''}.png`, output,
        repeat ? 'retained-v007-repeat' : 'retained-v007-main', props.instructionId);},
    renderLineMask: async (props: Json, index: number, output: string) => {const row = checkProps(props);
      assert(Number.isInteger(index) && index >= 0);
      await copy(`${inventory.workRoot}/scratch/frames/${row.stem}-line-${String(index + 1).padStart(2, '0')}.png`, output, 'retained-v007-line-mask', props.instructionId);},
  };
  console.log(JSON.stringify({status: 'execution-resources-render-started', jobPath, overlaySourceAttempt: 'render-attempt-v007', freshlyRenderedPngs: 0}));
  const executed: Json = await render(jobPath, {workspaceRoot: ROOT, serializePngAndFilters: true, overlayAdapter});
  const reuse = await publish(`${retryRoot}/overlay-restart-provenance.json`, {schemaVersion: 'unseen-material-overlay-restart-provenance-v001',
    mode: fix.overlayProvenance.mode, newlyRenderedPngs: 0, copiedArtifacts: copies,
    sourceRendererJobBinding: bind(parentPath, parent), sourcePngVerificationBinding: bind(pngProofPath, pngProof),
    sourceInventoryBinding: pngProof.retainedInventory, verifiedDrawInputCount: verifiedProps.size,
    drawInputsExactlyVerified: verifiedProps.size === 343});
  const execution = await publish(`${retryRoot}/renderer-result.json`, {schemaVersion: 'unseen-material-renderer-execution-v002',
    rendererJobBinding: bind(jobPath, job), setupFixBinding: bind(fixPath, fix), overlayRestartProvenanceBinding: reuse,
    exitCode: executed.exitCode, result: executed.result});
  assert.equal(executed.exitCode, 0, 'RESOURCE_CONTROL_RENDER_FAILED');
  assert.equal(executed.result?.status, 'completed'); assert.equal(executed.result?.qc?.status, 'passed');
  assert.equal(verifiedProps.size, 343);
  assert([...saved.values()].every(row => row.stillCount === 2));
  const videoPath = `${outputRoot}/presentation-rendered-v002.mp4`;
  const completion = await publish(`${WORK024}/render-completion.json`, {
    schemaVersion: 'unseen-material-render-completion-v001', status: 'technical-render-complete', planBinding: c.planBinding,
    machineAdoptionBinding: bind(`${WORK024}/machine-adoption.json`, await readJson(`${WORK024}/machine-adoption.json`)),
    execution, admission: bind(job.publication.admissionReceiptPath, await readJson(job.publication.admissionReceiptPath)),
    lineLayout: bind(job.publication.lineLayoutPath, await readJson(job.publication.lineLayoutPath)), qc: 'passed',
    video: {path: videoPath, fileSha256: await fileSha(path.join(ROOT, videoPath))}, humanQuality: 'not-evaluated'});
  console.log(JSON.stringify({status: 'technical-render-complete', completion}));
}

if (process.argv[2] === 'prepare') await prepare();
else if (process.argv[2] === 'render') await execute();
else throw new Error('Expected prepare or render');
