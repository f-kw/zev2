import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {access, mkdir} from 'node:fs/promises';
import {ROOT, readJson, readBound, publish, bind, fileSha, canonicalSha, pass, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadUnseenContextV001} from './run_unseen_material_thin_plan_v001.mts';
import {ROOT024, WORK024} from './unseen_material_thin_plan_v001.mts';
import {runPresentationInstructionRendererJobFileV002 as render,
  resolvePresentationRendererAppearanceV001 as appearance}
  from './run_presentation_instruction_renderer_job_v002.ts';
import {validatePresentationInstructionRendererJobV002 as validateJob}
  // @ts-expect-error Existing JS validator has no declaration file.
  from './presentation_renderer_admission_receipt_v002.mjs';

const retryRoot = `${WORK024}/render-attempt-v007`;
const outputRoot = 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/render-v007';
const jobPath = `${retryRoot}/renderer-job.json`;
const fixPath = `${retryRoot}/setup-fix.json`;
const decisionPath = `${ROOT024}/advisor-font-size-decision-v003.json`;
const parentPath = `${WORK024}/render-attempt-v006/renderer-job.json`;
const failurePath = `${WORK024}/render-attempt-v006/renderer-result.json`;
const proofPath = `${ROOT024}/core-caption-linkage-verification-v001.json`;
const fontProofPath = `${ROOT024}/font-size-selection-v001.json`;
const qcProofPath = `${ROOT024}/qc-optimization-verification-v001.json`;
const implementationPath = path.relative(ROOT, fileURLToPath(import.meta.url));

async function verifyInputs() {
  const c = await loadUnseenContextV001('selection');
  const decision = await readJson(decisionPath);
  assert.equal(decision.decision, 'continue');
  assert.equal(decision.auditedCheckpoint, '394edfb648ca25020635d5efc75811c83412af4f');
  assert.equal(decision.startingFontSizePx, 94);
  assert.equal(decision.decrementPx, 1);
  assert.equal(decision.full343RedrawRequired, true);
  const parent = await readJson(parentPath), failed = await readJson(failurePath);
  assert.deepEqual(failed.rendererJobBinding, bind(parentPath, parent));
  assert.equal(failed.result.failure.stage, 'overlay-preflight');
  assert.equal(failed.result.failure.violations.length, 1);
  assert.equal(failed.result.failure.violations[0].code, 'LAYOUT_SAFE_AREA_VIOLATION');
  const proof = await readJson(proofPath);
  assert.equal(proof.status, 'passed');
  for (const ref of proof.artifacts) assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
  const qcProof = await readJson(qcProofPath);
  assert.equal(qcProof.status, 'passed');
  assert(qcProof.mainEncodingArgumentsUnchanged && qcProof.omittedFramesPixelIdentical && qcProof.allRequiredNegativeCasesVerified);
  for (const ref of [qcProof.implementationBinding, ...qcProof.artifacts, ...parent.rendererImplementationBindings]) {
    assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
  }
  const fontProof = await readJson(fontProofPath);
  assert.equal(fontProof.status, 'single-caption-probe-passed');
  assert.equal(fontProof.selectionRule, decision.selectionRule);
  assert.equal(fontProof.decisionBinding.fileSha256, await fileSha(path.join(ROOT, decisionPath)));
  assert.deepEqual(fontProof.rendererJobBinding, bind(parentPath, parent));
  assert.equal(await fileSha(path.join(ROOT, fontProof.probeImplementation.path)), fontProof.probeImplementation.fileSha256);
  assert(fontProof.attempts.length > 0);
  for (const [index, ref] of fontProof.attempts.entries()) {
    assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
    const result = await readJson(ref.path);
    assert.equal(result.fontSizePx, decision.startingFontSizePx - index * decision.decrementPx);
    assert(result.onlyFontSizeChanged && result.redrawDeterministic);
    for (const image of [result.mainImage, result.repeatImage, result.props]) {
      assert.equal(await fileSha(path.join(ROOT, image.path)), image.fileSha256);
    }
    const last = index === fontProof.attempts.length - 1;
    assert.equal(result.qc.status, last ? 'passed' : 'failed');
    if (last) assert.equal(result.fontSizePx, fontProof.selectedFontSizePx);
    else assert(result.qc.violations.every((v: Json) => v.code === 'LAYOUT_SAFE_AREA_VIOLATION'));
  }
  return {c, parent, failed, decision, proof, fontProof, qcProof};
}

async function prepare() {
  const {parent, failed, decision, fontProof, qcProof} = await verifyInputs();
  for (const p of [retryRoot, outputRoot, `${WORK024}/render-completion.json`]) {
    await assert.rejects(access(path.join(ROOT, p)), (e: NodeJS.ErrnoException) => e.code === 'ENOENT');
  }
  const oldRegistry = await readBound(parent.registryBindings.styleProfileRegistry);
  const oldTrust = await readBound(parent.registryBindings.rendererTrust);
  const instruction = await readBound(parent.instructionArtifactBinding);
  const resolved = appearance({instructionArtifact: instruction, styleProfileRegistry: oldRegistry,
    visualStateId: parent.executionInputs.visualStateId}) as Json;
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.visualState.textStyle.fontSizePx, 95);
  assert.equal(resolved.visualState.layout.maxCharsPerLine, 36);
  const selectedSize = fontProof.selectedFontSizePx;
  assert(Number.isInteger(selectedSize) && selectedSize >= oldTrust.layoutRules.minimumFontSizePx);
  const registry = structuredClone(oldRegistry);
  const adjusted = appearance({instructionArtifact: instruction, styleProfileRegistry: registry,
    visualStateId: parent.executionInputs.visualStateId}) as Json;
  adjusted.visualState.textStyle.fontSizePx = selectedSize;
  const restored = structuredClone(registry);
  (appearance({instructionArtifact: instruction, styleProfileRegistry: restored,
    visualStateId: parent.executionInputs.visualStateId}) as Json).visualState.textStyle.fontSizePx = 95;
  assert.deepEqual(restored, oldRegistry, 'ONLY_APPROVED_FONT_SIZE_MAY_CHANGE');
  await mkdir(path.join(ROOT, retryRoot));
  const settingBinding = await publish(`${retryRoot}/display-setting-font${selectedSize}-v001.json`, registry);
  const trust = {...structuredClone(oldTrust), presetRegistry: {...oldTrust.presetRegistry,
    path: settingBinding.path, fileSha256: settingBinding.fileSha256,
    canonicalSha256: settingBinding.canonicalSha256}};
  assert.deepEqual(Object.keys(trust.presetRegistry), Object.keys(oldTrust.presetRegistry));
  assert.equal(trust.presetRegistry.registryVersion, registry.registryVersion);
  assert.deepEqual({...trust, presetRegistry: oldTrust.presetRegistry}, oldTrust);
  const trustBinding = await publish(`${retryRoot}/renderer-trust-font${selectedSize}-v001.json`, trust);
  const job = {...structuredClone(parent), jobId: 'unseen-SsdxVhwxyYo-024-v001-renderer-render-v007',
    attemptId: 'unseen-SsdxVhwxyYo-024-v001-render-v007', registryBindings: {...parent.registryBindings,
      styleProfileRegistry: settingBinding, rendererTrust: trustBinding,
      fontLedger: {...trustBinding, jsonPointer: '/fontAssets', valueCanonicalSha256: canonicalSha(trust.fontAssets)}},
    publication: {admissionReceiptPath: `${retryRoot}/admission-receipt.json`,
      lineLayoutPath: `${retryRoot}/line-layout.json`, renderOutputRoot: outputRoot}};
  assert.deepEqual({...job, jobId: parent.jobId, attemptId: parent.attemptId,
    registryBindings: parent.registryBindings, publication: parent.publication}, parent);
  assert.deepEqual(job.registryBindings.materialRegistry, parent.registryBindings.materialRegistry);
  pass(validateJob(job), 'ACTUAL_FONT_SIZE_JOB_INVALID');
  const jb = await publish(jobPath, job);
  await publish(fixPath, {schemaVersion: 'unseen-material-actual-font-size-preflight-v001', status: 'preflight-passed',
    decisionBinding: bind(decisionPath, decision), priorRendererJobBinding: bind(parentPath, parent),
    priorFailureBinding: bind(failurePath, failed), coreCaptionVerificationBinding: bind(proofPath, await readJson(proofPath)),
    qcEquivalenceBinding: bind(qcProofPath, qcProof), fontSizeSelectionBinding: bind(fontProofPath, fontProof),
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(fileURLToPath(import.meta.url))},
    rendererJobBinding: jb, previousStyleBinding: parent.registryBindings.styleProfileRegistry,
    previousTrustBinding: parent.registryBindings.rendererTrust, displaySettingBinding: settingBinding,
    rendererTrustBinding: trustBinding, selectedFontSizePx: selectedSize,
    unchanged: ['all-343-cue-and-line-answers', 'all-caption-core-artifacts', 'source-package',
      'logical-width-36', 'source', 'transcript', 'discovery', 'selection', 'retention', 'base-media',
      'shared-registry', 'renderer-code', 'trust-rules-assets-and-dependencies', 'main-video-encoding', 'qc-criteria'],
    note: 'The selected size passed an actual newly rendered caption PNG probe. All 343 captions must now be freshly rendered and pass actual alpha safe-area QC before the main encode. Earlier Node layout calculations are not browser or PNG measurements. The prior95px images are preserved and not reused.',
    checks: {onlyApprovedFontSettingChanged: 'passed', existingJobSchema: 'passed',
      existingCaptionArtifactsUnchanged: 'passed', completeTrustRulesUnchanged: 'passed',
      freshAttemptPaths: 'passed', all343ActualPngSafeArea: 'pending', finalVisibility: 'pending'}});
  console.log(JSON.stringify({status: 'actual-font-size-preflight-passed', selectedFontSizePx: selectedSize, jobPath}));
}

async function execute() {
  const {c, parent, fontProof, qcProof} = await verifyInputs();
  const fix = await readJson(fixPath), job = await readJson(jobPath);
  assert.equal(fix.status, 'preflight-passed');
  assert.equal(await fileSha(fileURLToPath(import.meta.url)), fix.implementationBinding.fileSha256);
  assert.deepEqual(bind(jobPath, job), fix.rendererJobBinding);
  assert.deepEqual(fix.priorRendererJobBinding, bind(parentPath, parent));
  assert.deepEqual(fix.decisionBinding, bind(decisionPath, await readJson(decisionPath)));
  assert.deepEqual(fix.fontSizeSelectionBinding, bind(fontProofPath, fontProof));
  assert.deepEqual(fix.qcEquivalenceBinding, bind(qcProofPath, qcProof));
  await readBound(fix.displaySettingBinding); await readBound(fix.rendererTrustBinding);
  console.log(JSON.stringify({status: 'actual-font-size-render-started', selectedFontSizePx: fontProof.selectedFontSizePx, jobPath}));
  const executed: Json = await render(jobPath, {workspaceRoot: ROOT});
  const execution = await publish(`${retryRoot}/renderer-result.json`, {
    schemaVersion: 'unseen-material-renderer-execution-v002', rendererJobBinding: bind(jobPath, job),
    setupFixBinding: bind(fixPath, fix), exitCode: executed.exitCode, result: executed.result});
  assert.equal(executed.exitCode, 0, 'ACTUAL_FONT_SIZE_RENDER_FAILED');
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
