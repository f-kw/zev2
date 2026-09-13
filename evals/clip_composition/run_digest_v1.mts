import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {stat, readFile} from 'node:fs/promises';
import {
  ROOT, bind, readJson, readBound, publish, pass, same, keys, fileSha, sha,
  assertBinding, assertByteBinding, type Binding, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadSelectionContextV001, reconstructReusedRetentionV001}
  from './run_candidate_selection_e2e_v001.mts';
import {validateInternalDisplayV001} from './candidate_internal_edit_core_v001.mts';
import {
  buildAdoptedBaseMediaV001, assembleAdoptedCaptionCoreV001, renderAdoptedVideoV001, CORE_FILES,
} from './adopted_media_manufacturing_v001.mts';
import {validatePresentationBaseMediaBuildJobV001 as validateManufacturingJob}
  from './presentation_base_media_build_v003.mjs';
import {validatePresentationOutputCaptionCueSourcePackageV001 as validateSourcePackage}
  from './presentation_output_caption_cue_source_package_v001.mjs';
import {buildPresentationCueEndProjectionV001 as cueProjection}
  from './presentation_cue_end_projection_v001.mjs';
import {composeSelectedDigestRangesV1, selectAllCandidatesV1, projectSavedDigestCaptionsV1, type RetainedRangeV1}
  from './digest_v1.mts';

const IMPLEMENTATIONS = [
  'evals/clip_composition/digest_v1.mts',
  'evals/clip_composition/run_digest_v1.mts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts',
];
const out = (c: Json, name: string) => `${c.plan.outputRoot}/${name}`;
const event = (stage: string, detail: Json = {}) => process.stdout.write(JSON.stringify({stage, ...detail}) + '\n');

export type DigestJobV1 = {
  schemaVersion: 'digest-execution-job-v1'; jobId: string; mode: 'C'; outputRoot: string;
  candidateContext: Binding; authorization: Binding;
  captionReuse: {meaning: Binding; sourcePackage: Binding; selection: Binding; omission: Binding | null};
  implementationBindings: Array<{path: string; fileSha256: string}>;
  rendererImplementationBindings: Array<{role: string; path: string; fileSha256: string}>;
};

function assertJob(v: Json): asserts v is DigestJobV1 {
  assert(keys(v, ['schemaVersion', 'jobId', 'mode', 'outputRoot', 'candidateContext', 'authorization',
    'captionReuse', 'implementationBindings', 'rendererImplementationBindings']) && v.schemaVersion === 'digest-execution-job-v1'
    && v.mode === 'C' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(v.jobId), 'DIGEST_JOB_INVALID');
  assertByteBinding({path: v.outputRoot, fileSha256: '0'.repeat(64)});
  assert(v.outputRoot.startsWith('evals/clip_composition/outputs/presentation/work-digest-v1-'), 'DIGEST_OUTPUT_ROOT_INVALID');
  assertBinding(v.candidateContext); assertBinding(v.authorization);
  assert(keys(v.captionReuse, ['meaning', 'sourcePackage', 'selection', 'omission']), 'DIGEST_CAPTION_REUSE_INVALID');
  for (const [key, binding] of Object.entries(v.captionReuse)) if (key !== 'omission' || binding !== null) assertBinding(binding);
  assert(same(v.implementationBindings.map((b: Json) => b.path), IMPLEMENTATIONS), 'DIGEST_IMPLEMENTATION_MEMBERSHIP_INVALID');
  v.implementationBindings.forEach(assertByteBinding);
  assert(Array.isArray(v.rendererImplementationBindings), 'DIGEST_RENDERER_IMPLEMENTATION_INVALID');
  for (const row of v.rendererImplementationBindings) {
    assert(keys(row, ['role', 'path', 'fileSha256']), 'DIGEST_RENDERER_IMPLEMENTATION_INVALID');
    assertByteBinding({path: row.path, fileSha256: row.fileSha256});
  }
}

/** 保存済みcandidateと判断の既存読取adapterを使い、旧工事を再実行しない。 */
export async function loadDigestJobV1(jobPath: string) {
  const job = await readJson(jobPath); assertJob(job);
  const sourcePlan = await readBound(job.candidateContext);
  const source = await loadSelectionContextV001(job.candidateContext.path);
  assert(same(source.plan, sourcePlan), 'DIGEST_CANDIDATE_CONTEXT_CHANGED');
  const authorization = await readBound(job.authorization);
  assert(authorization.schemaVersion === 'digest-v1-received-instruction'
    && authorization.instruction === 'ZEV ダイジェストv1 実装開始指示'
    && authorization.approvalQuote === 'kawafmm承認済み。'
    && same(authorization.scope, {phase: 1, selection: 'C-all', existingAssets: true,
      newPaidInference: false, newMaterial: false, checkpointAudit: true}), 'DIGEST_AUTHORIZATION_INVALID');
  for (const b of job.implementationBindings) assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256,
    'DIGEST_IMPLEMENTATION_CHANGED');
  assert(same(job.rendererImplementationBindings.map(({role, path}) => ({role, path})),
    source.rendererTemplate.rendererImplementationBindings.map(({role, path}: Json) => ({role, path}))),
  'DIGEST_RENDERER_IMPLEMENTATION_MEMBERSHIP_CHANGED');
  for (const b of job.rendererImplementationBindings) assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256,
    'DIGEST_RENDERER_IMPLEMENTATION_CHANGED');
  const rendererTemplate = structuredClone(source.rendererTemplate);
  rendererTemplate.rendererImplementationBindings = job.rendererImplementationBindings;
  const plan = {schemaVersion: job.schemaVersion, planId: job.jobId, outputRoot: job.outputRoot,
    authorization: job.authorization, request: source.plan.request, implementationBindings: job.implementationBindings,
    acousticValidation: source.plan.acousticValidation};
  return {...source, rendererTemplate, sourceContext: source, job, plan, planBinding: bind(jobPath, job), authorization};
}

export async function readSavedDigestCaptionsV1(c: Json) {
  const bindings = c.job.captionReuse;
  const [meaning, sourcePackage, selection] = await Promise.all([
    readBound(bindings.meaning), readBound(bindings.sourcePackage), readBound(bindings.selection),
  ]);
  for (const [key, sourceKey] of [['sourceVideoBinding', 'sourceVideo'], ['transcriptBinding', 'transcript'],
    ['utteranceBinding', 'utterances']]) assert(same(meaning[key], c.plan.request[sourceKey]), 'DIGEST_CAPTION_SOURCE_CHANGED');
  assert(same(meaning.machineAdoptionBinding, c.sourceContext.plan.reuseInternalRetention), 'DIGEST_CAPTION_RETENTION_CHANGED');
  assert(same(sourcePackage.reconstructionMap.meaningPackageBindings, [bindings.meaning])
    && same(selection.sourcePackageBinding, bindings.sourcePackage), 'DIGEST_CAPTION_BINDING_CHANGED');
  pass(validateSourcePackage(sourcePackage), 'DIGEST_REUSED_SOURCE_PACKAGE_INVALID');
  const producer = sourcePackage.provenance.sourcePackageJobBinding;
  await readBound(producer);
  pass(cueProjection({projectionId: `${c.plan.planId}-saved-display-check`, sourcePackageBinding: bindings.sourcePackage,
    sourceSelectionDigest: {schemaVersion: selection.schemaVersion, artifactId: selection.selectionId,
      fileSha256: bindings.selection.fileSha256, canonicalSha256: bindings.selection.canonicalSha256},
    producerJobBinding: producer, sourcePackage, selection}), 'DIGEST_REUSED_DISPLAY_INVALID');
  const timing = await readBound(meaning.captionTimingBinding);
  assert(same(timing.machineAdoptionBinding, meaning.machineAdoptionBinding), 'DIGEST_SAVED_TIMING_RETENTION_CHANGED');
  for (const judgment of timing.displayJudgments) {
    const [request, response, result] = await Promise.all(['request', 'response', 'result'].map(k => readBound(judgment[k])));
    validateInternalDisplayV001(request, response, result);
  }
  const atoms = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  for (const atom of meaning.atomOccurrences) assert.equal(atom.text, atoms.get(atom.sourceSegmentId)?.text,
    'DIGEST_SAVED_CAPTION_TEXT_CHANGED');
  let omittedSourceSegmentIds: number[] = [];
  if (bindings.omission !== null) {
    const omission = await readBound(bindings.omission);
    assert(omission.schemaVersion === 'digest-human-caption-local-repair-adoption-v001'
      && same(meaning.humanRepairAdoptionBinding, bindings.omission)
      && same(sourcePackage.provenance.sourcePackageJobBinding, bindings.omission), 'DIGEST_OMISSION_PROVENANCE_INVALID');
    const observationBytes = await readFile(path.join(ROOT, omission.humanObservations.path));
    const diagnosisBytes = await readFile(path.join(ROOT, omission.diagnosis.path));
    assert.equal(sha(observationBytes), omission.humanObservations.fileSha256, 'DIGEST_HUMAN_OBSERVATIONS_CHANGED');
    assert.equal(sha(diagnosisBytes), omission.diagnosis.fileSha256, 'DIGEST_OMISSION_DIAGNOSIS_CHANGED');
    const parent = await readBound(omission.parentManifest);
    assert(same(parent.machineAdoption, c.sourceContext.plan.reuseInternalRetention), 'DIGEST_OMISSION_RETENTION_CHANGED');
    const priorMeaning = await readBound(parent.caption.artifacts.meaning);
    const priorAtoms = new Map<string, Json>(priorMeaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
    omittedSourceSegmentIds = omission.omission.sourceSegmentIds;
    assert(same(omission.omission.originalInstruction.targetProvenance.atomOccurrenceIds
      .map((id: string) => priorAtoms.get(id)?.sourceSegmentId), omittedSourceSegmentIds), 'DIGEST_OMISSION_IDS_CHANGED');
  }
  return {meaning, sourcePackage, selection, bindings, omittedSourceSegmentIds};
}

/** 全採用と後段を分離する。後段へ渡すのは既存のcandidate IDだけ。 */
export function buildDigestAdoptionV1(c: Json, adoptedIds: string[]) {
  const candidates = c.candidateSet.candidates;
  const retained = reconstructReusedRetentionV001(c.sourceContext);
  const segments = composeSelectedDigestRangesV1(candidates.map((r: Json) => r.candidateId), adoptedIds,
    retained.segments as RetainedRangeV1[], c.transcript.segments);
  const adoption = {schemaVersion: 'candidate-digest-machine-adoption-v001', artifactId: `${c.plan.planId}-adoption`,
    authorityKind: 'approved-digest-candidate-ids', authorizationBinding: c.job.authorization,
    planBinding: c.planBinding, candidateSetBinding: c.sourceContext.plan.request.candidateSet,
    reusedInternalRetentionBinding: c.sourceContext.plan.reuseInternalRetention,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances,
    selectedCandidates: candidates.filter((r: Json) => adoptedIds.includes(r.candidateId)),
    segments, policy: {order: 'retained-source-time', overlap: 'exact-union', fillGaps: false},
    humanQuality: 'not-evaluated', individualCandidateHumanApproval: 'not-performed'};
  const editPlan = {schemaVersion: 'candidate-digest-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${c.plan.planId}-edit-plan`, machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    sourceVideoBinding: c.plan.request.sourceVideo, segments, unresolvedEdits: [], quality: 'human-review-pending'};
  return {adoption, editPlan};
}

async function buildBase(c: Json, adoption: Json, editPlan: Json) {
  const ad = bind(out(c, 'machine-adoption.json'), adoption), ep = bind(out(c, 'edit-plan.json'), editPlan);
  const manufacturingJob = {schemaVersion: 'presentation-base-media-build-job-v001', jobId: `${c.plan.planId}-manufacturing-values`,
    assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: {sourceProvenance: 'existing-repository-media', sourceRef: c.plan.request.sourceId,
      sourceUri: c.utterances.sourceUri, ...c.plan.request.sourceVideo}, outputDirectory: out(c, 'base-media')};
  pass(validateManufacturingJob(manufacturingJob), 'DIGEST_MANUFACTURING_JOB_INVALID');
  const jobBinding = await publish(out(c, 'manufacturing-values.json'), manufacturingJob);
  const invocation = await publish(out(c, 'core-invocation.json'), {
    schemaVersion: 'candidate-digest-core-invocation-v001', authorizationBinding: c.job.authorization,
    planBinding: c.planBinding, machineAdoptionBinding: ad, editPlanBinding: ep,
    manufacturingValuesBinding: jobBinding, admission: 'C-all-with-validated-existing-retention',
    reusedCandidateContextBinding: c.job.candidateContext,
    adapterBinding: c.job.implementationBindings.find((b: Json) => b.path.endsWith('run_digest_v1.mts'))});
  return buildAdoptedBaseMediaV001(c, adoption, editPlan, manufacturingJob, jobBinding, invocation,
    {inspection: 'candidate-digest-source-inspection-v001', receipt: 'candidate-digest-base-media-validation-v001'});
}

export async function executeDigestV1(jobPath: string) {
  const c = await loadDigestJobV1(jobPath);
  // readBound後も副作用開始前に未使用の出力先であることを確かめる。
  await assertAbsent(path.join(ROOT, c.plan.outputRoot));
  const selectedIds = selectAllCandidatesV1(c.candidateSet.candidates);
  const {adoption, editPlan} = buildDigestAdoptionV1(c, selectedIds);
  const saved = await readSavedDigestCaptionsV1(c);
  projectSavedDigestCaptionsV1(c, adoption, saved.sourcePackage.reconstructionMap.caseContexts[0].baseMediaInput, saved);
  event('validated', {candidates: selectedIds.length, retainedRanges: adoption.segments.length});
  await publish(out(c, 'machine-adoption.json'), adoption);
  await publish(out(c, 'edit-plan.json'), editPlan);
  event('base-media');
  const base = await buildBase(c, adoption, editPlan);
  await publish(out(c, 'base-media-bindings.json'), {schemaVersion: 'candidate-digest-base-media-bindings-v001', ...base});
  event('saved-caption-display');
  const input = projectSavedDigestCaptionsV1(c, adoption, base, saved);
  const captionAdoption = {schemaVersion: 'candidate-digest-caption-adoption-v001',
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    meaningInputBinding: bind(out(c, 'meaning-input.json'), input.meaning),
    reusedDisplayBindings: c.job.captionReuse, composition: 'saved-cues-in-normalized-retained-source-order',
    newMeaningJudgment: false, quality: 'not-evaluated'};
  const core = await assembleAdoptedCaptionCoreV001(c, input, base, captionAdoption, input.traces);
  const artifacts: Json = {};
  for (const [key, filename] of Object.entries(CORE_FILES)) artifacts[key] = await publish(out(c, filename), core[key as keyof typeof core]);
  event('renderer', {captions: core.instruction.instructions.length});
  const renderer = await renderAdoptedVideoV001(c, artifacts, 'candidate-digest-renderer-execution-v001');
  const execution = await readBound(renderer.execution);
  assert.equal(execution.result.qc.violations.length, 0, 'DIGEST_TECHNICAL_QC_VIOLATIONS');
  const timeline = await readBound(base.timeline);
  const verification = {schemaVersion: 'digest-v1-execution-result', status: 'technical-checkpoint',
    jobBinding: c.planBinding,
    candidateSetBinding: c.sourceContext.plan.request.candidateSet,
    retainedJudgmentBinding: c.sourceContext.plan.reuseInternalRetention,
    machineAdoption: bind(out(c, 'machine-adoption.json'), adoption), editPlan: bind(out(c, 'edit-plan.json'), editPlan),
    baseMedia: base, artifacts, renderer,
    counts: {prospects: c.candidateSet.candidates.length, adopted: selectedIds.length,
      retainedRanges: adoption.segments.length, ...input.counts},
    frameCount: timeline.baseMedia.expectedFrameCount, durationSeconds: timeline.baseMedia.expectedFrameCount / 30,
    operations: {newCandidateJudgments: 0, newRetentionJudgments: 0, newDisplayJudgments: 0, paidApiCalls: 0, newMaterials: 0},
    humanQuality: 'not-evaluated', completionApproval: 'not-claimed'};
  await publish(out(c, 'verification.json'), verification);
  event('technical-checkpoint', {video: renderer.video, counts: verification.counts, frameCount: verification.frameCount});
  return verification;
}

async function assertAbsent(absolutePath: string) {
  try {await stat(absolutePath);} catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`DIGEST_OUTPUT_ALREADY_EXISTS: ${absolutePath}`);
}

/** 実行設定だけを作るCLI。candidate正本や既存ID、過去の判断は変換しない。 */
export async function prepareDigestJobV1(sourcePlanPath: string, captionManifestPath: string, jobPath: string,
  outputRoot: string, jobId: string) {
  await assertAbsent(path.join(ROOT, outputRoot));
  const sourcePlan = await readJson(sourcePlanPath), captionManifest = await readJson(captionManifestPath);
  const source = await loadSelectionContextV001(sourcePlanPath);
  const authorizationPath = `${path.posix.dirname(jobPath)}/received-instruction.json`;
  const authorization = await publish(authorizationPath, {schemaVersion: 'digest-v1-received-instruction',
    recordId: 'zev-digest-v1-start-20260913', instruction: 'ZEV ダイジェストv1 実装開始指示',
    approvalQuote: 'kawafmm承認済み。', scope: {phase: 1, selection: 'C-all', existingAssets: true,
      newPaidInference: false, newMaterial: false, checkpointAudit: true}});
  const job: DigestJobV1 = {schemaVersion: 'digest-execution-job-v1', jobId, mode: 'C', outputRoot,
    candidateContext: bind(sourcePlanPath, sourcePlan), authorization,
    captionReuse: {meaning: captionManifest.artifacts.meaning, sourcePackage: captionManifest.artifacts.sourcePackage,
      selection: captionManifest.artifacts.selection, omission: captionManifest.artifacts.adoption ?? null},
    implementationBindings: await Promise.all(IMPLEMENTATIONS.map(async p => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))}))),
    rendererImplementationBindings: await Promise.all(source.rendererTemplate.rendererImplementationBindings.map(
      async ({role, path: p}: Json) => ({role, path: p, fileSha256: await fileSha(path.join(ROOT, p))})))};
  assertJob(job);
  await publish(jobPath, job);
  return bind(jobPath, job);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'prepare' && args.length === 5) event('prepared', await prepareDigestJobV1(args[0], args[1], args[2], args[3], args[4]));
  else if (command === 'run' && args.length === 1) await executeDigestV1(args[0]);
  else throw new Error('Usage: prepare <existing-context> <caption-manifest> <job-path> <output-root> <job-id> | run <job-path>');
}
