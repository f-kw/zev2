/** ソケット制限による描画設営失敗から、同一入力を新しい出力先で再開する。 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadSelectionContextV001, verifySelectionAdoptionV001} from './run_candidate_selection_e2e_v001.mts';
import {constructInternalCaptionCoreV001, INTERNAL_CORE_FILES} from './candidate_internal_edit_core_v001.mts';
import {renderAdoptedVideoV001} from './adopted_media_manufacturing_v001.mts';

export async function resumeSelectionRendererV001(planPath: string) {
  const c = await loadSelectionContextV001(planPath), work = c.plan.outputRoot;
  const {adoption} = await verifySelectionAdoptionV001(c);
  const failed = await readJson(`${work}/renderer-result.json`);
  assert.equal(failed.exitCode, 2); assert.equal(failed.result.failure.message, 'layout inspector produced no result');
  const evidencePath = `${work}/process-observations/${c.plan.planId}/0003-layout-inspection/stderr.txt`;
  const stderr = await (await import('node:fs/promises')).readFile(path.join(ROOT, evidencePath), 'utf8');
  assert(stderr.includes('listen EPERM') && stderr.includes('createIpcServer'), 'SOCKET_FAILURE_EVIDENCE_REQUIRED');
  const {schemaVersion: ignored, ...base} = await readJson(`${work}/base-media-bindings.json`);
  const traces = [];
  for (let i = 1; i <= adoption.segments.length; i++) traces.push({
    request: await readJson(`${work}/display-${i}-request.json`), response: await readJson(`${work}/display-${i}-response.json`),
    result: await readJson(`${work}/display-${i}-result.json`),
  });
  const core = await constructInternalCaptionCoreV001(c as any, adoption, base, traces);
  const artifacts: Json = {};
  for (const [key, filename] of Object.entries(INTERNAL_CORE_FILES)) {
    const actual = await readJson(`${work}/${filename}`);
    assert(same(actual, core[key as keyof typeof core]), `UNCHANGED_CORE_REQUIRED:${key}`);
    artifacts[key] = bind(`${work}/${filename}`, actual);
  }
  const resumeRoot = `${work}/renderer-resume-v001`;
  const job = structuredClone(core.rendererJob);
  job.attemptId = `${c.plan.planId}-renderer-resume-v001`;
  job.publication = {admissionReceiptPath: `${resumeRoot}/admission-receipt.json`, lineLayoutPath: `${resumeRoot}/line-layout.json`,
    renderOutputRoot: `${resumeRoot}/render`};
  const jobBinding = await publish(`${resumeRoot}/renderer-job.json`, job);
  const continuation = await publish(`${work}/renderer-continuation.json`, {
    schemaVersion: 'candidate-selection-renderer-continuation-v001', category: 'inspection-setup',
    reason: 'tsx-local-ipc-socket-denied-by-execution-sandbox', planBinding: c.planBinding,
    failedExecutionBinding: bind(`${work}/renderer-result.json`, failed),
    stderrBinding: {path: evidencePath, fileSha256: await fileSha(path.join(ROOT, evidencePath))},
    sourceJobBinding: artifacts.rendererJob, executionJobBinding: jobBinding,
    changedFields: ['attemptId', 'publication'], semanticOrStyleChanges: false,
    preservedFailedOutput: 'kept-at-original-path', newOutputRoot: resumeRoot,
    implementationBinding: {path: 'evals/clip_composition/resume_candidate_selection_renderer_v001.mts',
      fileSha256: await fileSha(path.join(ROOT, 'evals/clip_composition/resume_candidate_selection_renderer_v001.mts'))},
  });
  const renderer = await renderAdoptedVideoV001({plan: {outputRoot: resumeRoot}}, {...artifacts, rendererJob: jobBinding},
    'candidate-selection-renderer-execution-v001');
  const timeline = await readBound(base.timeline);
  const verification = {schemaVersion: 'candidate-selection-e2e-verification-v001', status: 'passed', planBinding: c.planBinding,
    candidateSetBinding: c.plan.request.candidateSet, machineAdoptionBinding: bind(`${work}/machine-adoption.json`, adoption),
    counts: {candidates: c.candidateSet.candidates.length, adopted: adoption.adoptedCandidates.length, rejected: adoption.rejectedCandidates.length},
    rejectedAsRedundant: adoption.rejectedCandidates.filter((p: Json) => p.judgment.basis === 'redundant').map((p: Json) => p.candidateId),
    rejectedAsWeak: adoption.rejectedCandidates.filter((p: Json) => p.judgment.basis === 'weak').map((p: Json) => p.candidateId),
    requiredRetained: adoption.adoptedCandidates.filter((p: Json) => p.judgment.basis.startsWith('necessary-')).map((p: Json) => p.candidateId),
    finalFrames: timeline.baseMedia.expectedFrameCount, finalDurationSeconds: timeline.baseMedia.expectedFrameCount / 30,
    newSelectionJudgment: 'executed-current-codex-stdin-once', existingInternalRetention: 'reconstructed-unchanged',
    existingDisplaySkill: 'unchanged', commonManufacturing: 'passed', technicalQc: renderer.qc,
    base, artifacts, renderer, rendererContinuationBinding: continuation,
    humanQuality: 'not-evaluated', historicalHumanQualityInherited: false, newGeminiOrAcousticObservation: 'none', apiCommunication: 'none'};
  await publish(`${work}/verification.json`, verification);
  return verification;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const v = await resumeSelectionRendererV001(process.argv[2]);
  process.stdout.write(JSON.stringify({status: v.status, video: v.renderer.video, counts: v.counts}) + '\n');
}
