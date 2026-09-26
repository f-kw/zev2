/** Run-specific repair: retain the failed attempt and bind the existing instruction by its SHA. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {ROOT, ARTIFACTS, context} from './run_new_material_digest_20260926.mts';
import {bind, publish, readJson, pass, fileSha} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {buildAdoptedBaseMediaV001, buildAdoptedCaptionInputsV001} from './adopted_media_manufacturing_v001.mts';
import {validatePresentationBaseMediaBuildJobV001} from './presentation_base_media_build_v003.mjs';

export function receivedInstructionRecordId(receipt: any) {
  assert.equal(receipt.schemaVersion, 'new-material-digest-received-instruction-v001');
  assert.equal(receipt.instruction, 'Codex2｜5. 新素材Digest生成');
  assert.match(receipt.receivedInstructionSha256, /^[a-f0-9]{64}$/);
  // This identifies the already received instruction, not a new approval or human quality decision.
  return `received-instruction-sha256-${receipt.receivedInstructionSha256}`;
}

export async function retryBase() {
  const c = await context('selection'); // Revalidate all original immutable inputs and implementation hashes.
  const recordId = receivedInstructionRecordId(c.authorization);
  const retryRoot = `${ARTIFACTS}/base-attempt-002`;
  const adoption = await readJson(`${ARTIFACTS}/machine-adoption.json`);
  const editPlan = await readJson(`${ARTIFACTS}/edit-plan.json`);
  const originalAd = bind(`${ARTIFACTS}/machine-adoption.json`, adoption);
  const originalEp = bind(`${ARTIFACTS}/edit-plan.json`, editPlan);
  const ad = await publish(`${retryRoot}/machine-adoption.json`, adoption);
  const ep = await publish(`${retryRoot}/edit-plan.json`, editPlan);
  assert.equal(ad.fileSha256, originalAd.fileSha256);
  assert.equal(ep.fileSha256, originalEp.fileSha256);
  const job = {schemaVersion: 'presentation-base-media-build-job-v001', jobId: `${c.plan.planId}-base-attempt-002`,
    assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: {sourceProvenance: 'user-authorized-youtube-full-source', sourceRef: c.plan.request.sourceId,
      sourceUri: c.transcript.sourceUri, ...c.plan.request.sourceVideo}, outputDirectory: `${retryRoot}/base-media`};
  pass(validatePresentationBaseMediaBuildJobV001(job), 'NEW_MATERIAL_RETRY_JOB_INVALID');
  const jb = await publish(`${retryRoot}/manufacturing-values.json`, job);
  const invocation = await publish(`${retryRoot}/core-invocation.json`, {
    schemaVersion: 'new-material-digest-base-retry-invocation-v001',
    originalInvocationBinding: bind(`${ARTIFACTS}/core-invocation.json`, await readJson(`${ARTIFACTS}/core-invocation.json`)),
    authorizationBinding: c.plan.authorization, authorizationRecordId: recordId,
    authorizationIdentityRule: 'SHA of the received user instruction; no new approval',
    planBinding: c.planBinding, originalMachineAdoptionBinding: originalAd, originalEditPlanBinding: originalEp,
    machineAdoptionBinding: ad, editPlanBinding: ep, manufacturingValuesBinding: jb,
    adapter: {path: 'evals/clip_composition/run_new_material_digest_20260926_base_retry.mts',
      fileSha256: await fileSha(path.join(ROOT, 'evals/clip_composition/run_new_material_digest_20260926_base_retry.mts'))},
    failedAttemptPreserved: true, individualCandidateHumanApproval: 'not-performed'
  });
  // Only the manufacturing destination and receipt identifier differ; selection plans stay untouched.
  const manufacturingContext = {...c, plan: {...c.plan, outputRoot: retryRoot}, authorization: {...c.authorization, recordId}};
  const base = await buildAdoptedBaseMediaV001(manufacturingContext, adoption, editPlan, job, jb, invocation,
    {inspection: 'new-material-source-inspection-v001', receipt: 'new-material-base-validation-v001'});
  await publish(`${ARTIFACTS}/base-media-bindings.json`, {schemaVersion: 'new-material-base-bindings-v001', ...base});
  const captions = buildAdoptedCaptionInputsV001(c, adoption.selectedCandidates, originalAd, base,
    {meaning: 'new-material-presentation-meaning-input-v001', displayRequest: 'new-material-display-request-v001', sourceRole: 'new-material'});
  for (const [i, request] of captions.requests.entries()) await publish(`${ARTIFACTS}/display-${i + 1}-request.json`, request);
  return {displayRequests: captions.requests.length, baseMedia: base.baseMedia};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const startedAt = new Date().toISOString(), started = performance.now();
  try {
    const result = await retryBase();
    await publish(`${ARTIFACTS}/base-attempt-002/execution.json`, {startedAt, endedAt: new Date().toISOString(),
      elapsedSeconds: (performance.now() - started) / 1000, status: 'completed', result});
    console.log(JSON.stringify(result));
  } catch (error) {
    await publish(`${ARTIFACTS}/base-attempt-002/execution.json`, {startedAt, endedAt: new Date().toISOString(),
      elapsedSeconds: (performance.now() - started) / 1000, status: 'failed', error: String(error)});
    throw error;
  }
}
