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

const retryRoot = `${WORK024}/render-attempt-v004`;
const outputRoot = 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/render-v004';
const jobPath = `${retryRoot}/renderer-job.json`;
const fixPath = `${retryRoot}/setup-fix.json`;
const decisionPath = `${ROOT024}/advisor-layout-decision-v002.json`;
const parentPath = `${WORK024}/render-attempt-v003/renderer-job.json`;
const failurePath = `${WORK024}/render-attempt-v003/renderer-result.json`;
const proofPath = `${ROOT024}/core-caption-linkage-verification-v001.json`;
const implementationPath = path.relative(ROOT, fileURLToPath(import.meta.url));

async function verifyInputs() {
  const c = await loadUnseenContextV001('selection');
  const decision = await readJson(decisionPath);
  assert.equal(decision.decision, 'continue');
  assert.equal(decision.auditedCheckpoint, 'be390574ac9af11647dc3069f3defc62e33437d4');
  assert(decision.answerTranscription.includes('文字サイズのみ96px→95px'));
  const parent = await readJson(parentPath), failed = await readJson(failurePath);
  assert.deepEqual(failed.rendererJobBinding, bind(parentPath, parent));
  assert.equal(failed.result.failure.stage, 'layout-preflight');
  assert(failed.result.failure.violations.every((v: Json) => v.code === 'LAYOUT_SAFE_AREA_VIOLATION'));
  const proof = await readJson(proofPath);
  assert.equal(proof.status, 'passed');
  for (const ref of proof.artifacts) assert.equal(await fileSha(path.join(ROOT, ref.path)), ref.fileSha256);
  return {c, parent, failed, decision, proof};
}

async function prepare() {
  const {parent, failed, decision} = await verifyInputs();
  for (const p of [retryRoot, outputRoot, `${WORK024}/render-completion.json`]) {
    await assert.rejects(access(path.join(ROOT, p)), (e: NodeJS.ErrnoException) => e.code === 'ENOENT');
  }
  const oldRegistry = await readBound(parent.registryBindings.styleProfileRegistry);
  const oldTrust = await readBound(parent.registryBindings.rendererTrust);
  const instruction = await readBound(parent.instructionArtifactBinding);
  const resolved = appearance({instructionArtifact: instruction, styleProfileRegistry: oldRegistry,
    visualStateId: parent.executionInputs.visualStateId}) as Json;
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.visualState.textStyle.fontSizePx, 96);
  assert.equal(resolved.visualState.layout.maxCharsPerLine, 36);
  const registry = structuredClone(oldRegistry);
  const adjusted = appearance({instructionArtifact: instruction, styleProfileRegistry: registry,
    visualStateId: parent.executionInputs.visualStateId}) as Json;
  adjusted.visualState.textStyle.fontSizePx = 95;
  const restored = structuredClone(registry);
  (appearance({instructionArtifact: instruction, styleProfileRegistry: restored,
    visualStateId: parent.executionInputs.visualStateId}) as Json).visualState.textStyle.fontSizePx = 96;
  assert.deepEqual(restored, oldRegistry, 'ONLY_APPROVED_FONT_SIZE_MAY_CHANGE');
  const safeWidth = oldRegistry.canvas.width - oldRegistry.canvas.safeAreaPx.left - oldRegistry.canvas.safeAreaPx.right;
  const textStyle = resolved.visualState.textStyle;
  const strokeWidth = Math.max(textStyle.glowWidthPx * 2 + textStyle.borderWidthPx * 2, textStyle.borderWidthPx * 2);
  const padding = Math.max(2, Math.ceil(95 * oldTrust.layoutRules.textSafePaddingRatio));
  assert.equal(Math.floor((safeWidth - strokeWidth - 2 * padding) / 18), 95);
  await mkdir(path.join(ROOT, retryRoot));
  const settingBinding = await publish(`${retryRoot}/display-setting-font95-v001.json`, registry);
  // The existing v002 renderer requires its font ledger and style reference to
  // be bound by the same trust document. Its rules/assets/dependencies stay exact.
  const trust = {...structuredClone(oldTrust), presetRegistry: settingBinding};
  assert.deepEqual({...trust, presetRegistry: oldTrust.presetRegistry}, oldTrust);
  const trustBinding = await publish(`${retryRoot}/renderer-trust-font95-v001.json`, trust);
  const job = {...structuredClone(parent), jobId: `${parent.jobId}-font95`,
    attemptId: `${parent.attemptId}-font95`, registryBindings: {...parent.registryBindings,
      styleProfileRegistry: settingBinding, rendererTrust: trustBinding,
      fontLedger: {...trustBinding, jsonPointer: '/fontAssets', valueCanonicalSha256: canonicalSha(trust.fontAssets)}},
    publication: {admissionReceiptPath: `${retryRoot}/admission-receipt.json`,
      lineLayoutPath: `${retryRoot}/line-layout.json`, renderOutputRoot: outputRoot}};
  assert.deepEqual({...job, jobId: parent.jobId, attemptId: parent.attemptId,
    registryBindings: parent.registryBindings, publication: parent.publication}, parent);
  assert.deepEqual(job.registryBindings.materialRegistry, parent.registryBindings.materialRegistry);
  pass(validateJob(job), 'FONT95_JOB_INVALID');
  const jb = await publish(jobPath, job);
  await publish(fixPath, {schemaVersion: 'unseen-material-render-output-path-fix-v001', status: 'preflight-passed',
    decisionBinding: bind(decisionPath, decision), priorRendererJobBinding: bind(parentPath, parent),
    priorFailureBinding: bind(failurePath, failed), coreCaptionVerificationBinding: bind(proofPath, await readJson(proofPath)),
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(fileURLToPath(import.meta.url))},
    rendererJobBinding: jb, previousStyleBinding: parent.registryBindings.styleProfileRegistry,
    previousTrustBinding: parent.registryBindings.rendererTrust, displaySettingBinding: settingBinding,
    rendererTrustBinding: trustBinding,
    derivation: {safeWidthPx: safeWidth, maximumFullWidthCharacters: 18, strokeWidthPx: strokeWidth,
      paddingEachPx: padding, fontSizeBeforePx: 96, fontSizeAfterPx: 95, predictedMaximumWidthPx: 18 * 95 + strokeWidth + 2 * padding},
    unchanged: ['all-343-cue-and-line-answers', 'all-caption-core-artifacts', 'source-package',
      'logical-width-36', 'source', 'transcript', 'discovery', 'selection', 'retention', 'base-media',
      'shared-registry', 'renderer-code', 'trust-rules-assets-and-dependencies'],
    note: 'Caption source and all projections remain the admitted original bytes. The existing separate renderer job binds the approved per-run display size; the trust copy changes only its preset reference. No legacy source-style resolver is invoked or represented as run.',
    checks: {onlyApprovedFontSettingChanged: 'passed', existingJobSchema: 'passed',
      existingCaptionArtifactsUnchanged: 'passed', completeTrustRulesUnchanged: 'passed',
      freshAttemptPaths: 'passed', actualBrowserLayout: 'pending'}});
  console.log(JSON.stringify({status: 'font95-preflight-passed', jobPath}));
}

async function execute() {
  const {c, parent} = await verifyInputs();
  const fix = await readJson(fixPath), job = await readJson(jobPath);
  assert.equal(fix.status, 'preflight-passed');
  assert.equal(await fileSha(fileURLToPath(import.meta.url)), fix.implementationBinding.fileSha256);
  assert.deepEqual(bind(jobPath, job), fix.rendererJobBinding);
  assert.deepEqual(fix.priorRendererJobBinding, bind(parentPath, parent));
  assert.deepEqual(fix.decisionBinding, bind(decisionPath, await readJson(decisionPath)));
  await readBound(fix.displaySettingBinding); await readBound(fix.rendererTrustBinding);
  console.log(JSON.stringify({status: 'font95-render-started', jobPath}));
  const executed: Json = await render(jobPath, {workspaceRoot: ROOT});
  const execution = await publish(`${retryRoot}/renderer-result.json`, {
    schemaVersion: 'unseen-material-renderer-execution-v002', rendererJobBinding: bind(jobPath, job),
    setupFixBinding: bind(fixPath, fix), exitCode: executed.exitCode, result: executed.result});
  assert.equal(executed.exitCode, 0, 'FONT95_RENDER_FAILED');
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
