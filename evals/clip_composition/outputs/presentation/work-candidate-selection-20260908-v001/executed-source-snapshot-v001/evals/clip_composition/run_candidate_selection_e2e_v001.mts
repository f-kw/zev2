import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {
  ROOT, bind, readJson, readBound, publish, same, keys, sha, formal, fileSha,
  assertBinding, assertByteBinding, judgeThroughStdinV001, decodeDigestTransportV001, pass, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {assertCandidateDiscoveryResultV001} from '../../runner/src/skills/candidate-discovery-v001.js';
import {runCandidateSelectionV001} from '../../runner/src/skills/candidate-selection-v001.js';
import {
  SELECTION_POLICY, SELECTION_CRITERIA, resolveSelectionCandidatesV001,
  buildSelectionRequestV001, validateSelectionV001, promoteSelectionV001,
} from './candidate_selection_validation_v001.mts';
import {validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001 as validateUtterances}
  from '../../runner/src/distant-connection-common-utterance-artifact-v001.js';
import {validateInternalRetentionProvenanceV001, resolveInternalRetentionV001}
  from './candidate_internal_retention_validation_v001.mts';
import {INTERNAL_TASK} from './run_candidate_internal_edit_v001.mts';
import {validateAcousticChunkV001} from './digest_acoustic_timing_validation_v001.mts';
import {
  internalCaptionTextV001, validateInternalDisplayV001, constructInternalCaptionCoreV001, INTERNAL_CORE_FILES,
} from './candidate_internal_edit_core_v001.mts';
import {runCaptionDisplayBoundariesV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {buildAdoptedBaseMediaV001, renderAdoptedVideoV001} from './adopted_media_manufacturing_v001.mts';
import {validatePresentationBaseMediaBuildJobV001 as validateManufacturingJob}
  from './presentation_base_media_build_v003.mjs';
import {verifyPresentationFirstRealDataFileReferenceV001 as verifyBytes}
  from './presentation_first_real_data_gate_v001.mjs';

export const SELECTION_IMPLEMENTATIONS = [
  'runner/src/skills/candidate-selection-v001.ts',
  'evals/clip_composition/candidate_selection_validation_v001.mts',
  'evals/clip_composition/run_candidate_selection_e2e_v001.mts',
  'runner/src/skills/candidate-discovery-v001.ts',
  'runner/src/skills/candidate-internal-retention-v001.ts',
  'runner/src/skills/caption-display-boundaries-v001.ts',
  'runner/src/distant-connection-common-utterance-artifact-v001.ts',
  'runner/src/transcript-utils.ts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'evals/clip_composition/run_candidate_internal_edit_v001.mts',
  'evals/clip_composition/candidate_internal_retention_validation_v001.mts',
  'evals/clip_composition/candidate_internal_edit_core_v001.mts',
  'evals/clip_composition/digest_acoustic_timing_validation_v001.mts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts',
];
export const WORK = 'evals/clip_composition/outputs/presentation/work-candidate-selection-20260908-v001';
const out = (c: Json, name: string) => `${c.plan.outputRoot}/${name}`;
const fail = (code: string): never => {throw new Error(`CANDIDATE_SELECTION_E2E: ${code}`);};

async function selectionThroughStdin(request: Json) {
  process.stdout.write(JSON.stringify({event: 'candidate-selection-judgment-required',
    requestFileSha256: sha(formal(request)), input: request.input}) + '\n');
  const lines = createInterface({input: process.stdin, crlfDelay: Infinity, terminal: false});
  try {
    for await (const line of lines) return decodeDigestTransportV001(line);
    return fail('SELECTION_JUDGMENT_INPUT_CLOSED');
  } finally {lines.close();}
}

export function assertSelectionPlanV001(p: Json) {
  if (!keys(p, ['schemaVersion', 'planId', 'authorization', 'request', 'structureConditions', 'policy', 'skills',
    'reuseInternalRetention', 'acousticValidation', 'implementationBindings', 'outputRoot'])
    || p.schemaVersion !== 'candidate-selection-fixed-plan-v001'
    || typeof p.planId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(p.planId)
    || !same(p.policy, SELECTION_POLICY)
    || !Array.isArray(p.structureConditions) || !p.structureConditions.length
    || !p.structureConditions.every((s: unknown) => typeof s === 'string' && s.trim())
    || !same(p.skills, [
      {id: 'candidate-selection', version: 'v001', mode: 'current-codex-stdin-v001'},
      {id: 'candidate-internal-retention', version: 'v001', mode: 'existing-result-revalidation'},
      {id: 'caption-display-boundaries', version: 'v001', mode: 'current-codex-stdin-v001'},
    ]) || !keys(p.request, ['purpose', 'sourceId', 'sourceVideo', 'transcript', 'utterances',
      'candidateSet', 'rendererTemplate', 'captionStyleTemplate'])
    || typeof p.request.purpose !== 'string' || !p.request.purpose.trim()
    || typeof p.request.sourceId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(p.request.sourceId)
    || typeof p.outputRoot !== 'string' || !p.outputRoot.startsWith('evals/clip_composition/outputs/presentation/work-candidate-selection-')
    || !Array.isArray(p.implementationBindings) || p.implementationBindings.length !== SELECTION_IMPLEMENTATIONS.length) fail('PLAN_INVALID');
  for (const k of ['sourceVideo', 'transcript']) assertByteBinding(p.request[k]);
  for (const k of ['utterances', 'candidateSet', 'rendererTemplate', 'captionStyleTemplate']) assertBinding(p.request[k]);
  assertBinding(p.authorization); assertBinding(p.reuseInternalRetention); assertByteBinding(p.acousticValidation);
  assertByteBinding({path: p.outputRoot, fileSha256: '0'.repeat(64)});
  p.implementationBindings.forEach((b: Json, i: number) => {
    assertByteBinding(b);
    if (b.path !== SELECTION_IMPLEMENTATIONS[i]) fail('IMPLEMENTATION_MEMBERSHIP_INVALID');
  });
}

/** 過去の結果はID割当の確認にのみ使い、入力候補は探索結果の全件を無選別で転記する。 */
export function constructSelectionCandidateSetV001(request: Json, discovery: Json, identities: Json, origins: Json) {
  assertCandidateDiscoveryResultV001(discovery);
  const answer = discovery.answer as Json;
  if (answer.status !== 'complete' || identities.schemaVersion !== 'candidate-digest-machine-adoption-v001'
    || identities.resultBinding.fileSha256 !== origins.discoveryResult.fileSha256
    || !same(identities.sourceVideoBinding, request.sourceVideo) || !same(identities.transcriptBinding, request.transcript)
    || !same(identities.utteranceBinding, request.utterances)
    || identities.selectedCandidates.length !== answer.candidates.length) fail('EXISTING_CATALOG_PROVENANCE_INVALID');
  const candidates = answer.candidates.map((r: Json, i: number) => {
    const identity = identities.selectedCandidates.find((row: Json) => row.resultOrdinal === i + 1);
    if (!identity || identity.title !== r.title || r.sourceId !== request.sourceId
      || identity.includedUtteranceIds[0] !== r.contextStartUtteranceId
      || identity.includedUtteranceIds.at(-1) !== r.contextEndUtteranceId
      || !same(identity.evidenceUtteranceIds, r.evidenceUtteranceIds)) fail('EXISTING_CANDIDATE_ID_MAPPING_INVALID');
    return {candidateId: identity.candidateId, sourceId: r.sourceId, title: r.title,
      contextStartUtteranceId: r.contextStartUtteranceId, contextEndUtteranceId: r.contextEndUtteranceId,
      evidenceUtteranceIds: structuredClone(r.evidenceUtteranceIds)};
  });
  return {schemaVersion: 'candidate-selection-candidate-set-v001', sourceId: request.sourceId,
    sourceVideoBinding: request.sourceVideo, transcriptBinding: request.transcript, utteranceBinding: request.utterances,
    origins, candidates};
}
async function byteJson(binding: Json) {
  assertByteBinding({path: binding.path, fileSha256: binding.fileSha256});
  const bytes = await readFile(path.join(ROOT, binding.path));
  if (sha(bytes) !== binding.fileSha256) fail('EXISTING_BYTES_CHANGED');
  return JSON.parse(bytes.toString('utf8'));
}

/** 保存済みの内部保持結果を現物の本文・根拠へ再束縛する。旧plan全体を現在の実装で再実行しない。 */
export function reconstructReusedRetentionV001(c: Json) {
  const parents = resolveSelectionCandidatesV001(c);
  const atoms = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  const utterances = new Map<string, Json>(c.utterances.utterances.map((u: Json) => [u.utteranceId, u]));
  const input = {schemaVersion: 'candidate-internal-retention-input-v001' as const, taskDescription: INTERNAL_TASK,
    candidates: parents.map((p: Json, i: number) => ({candidateId: p.candidateId, title: p.title,
      highlightReason: c.discovery.answer.candidates[i].reason,
      utterances: p.includedUtteranceIds.map((utteranceId: string) => ({utteranceId,
        atoms: utterances.get(utteranceId)!.sourceSegmentIds.map((id: number) => ({sourceSegmentId: id, text: atoms.get(id)!.text}))}))}))};
  const token = validateInternalRetentionProvenanceV001(c.retentionRequest, c.retentionResponse, c.retentionResult, input);
  const resolved = resolveInternalRetentionV001(token, parents, c.chunks);
  if (resolved.status !== 'resolved' || !same(resolved.candidates, c.retention.candidates)
    || !same(resolved.segments, c.retention.segments)) fail('EXISTING_RETENTION_RECONSTRUCTION_INVALID');
  return resolved;
}

export async function loadSelectionContextV001(planPath: string) {
  const plan = await readJson(planPath); assertSelectionPlanV001(plan);
  const [authorization, candidateSet, utterances, rendererTemplate, captionStyleTemplate, retention] = await Promise.all([
    readBound(plan.authorization), readBound(plan.request.candidateSet), readBound(plan.request.utterances),
    readBound(plan.request.rendererTemplate), readBound(plan.request.captionStyleTemplate), readBound(plan.reuseInternalRetention),
  ]);
  if (!keys(authorization, ['schemaVersion', 'recordId', 'instruction', 'approvalQuote', 'scope'])
    || authorization.schemaVersion !== 'candidate-selection-received-instruction-v001'
    || authorization.instruction !== 'ZEV進行管理２ 指示-019' || authorization.approvalQuote !== 'kawafmm承認済み。'
    || !same(authorization.scope, {newCandidateSelection: true, existingMaterialOnly: true,
      deterministicAdoption: true, existingSkillCoreRenderer: true, humanQualityAfterRender: true,
      apiCommunication: false, newMaterial: false})) fail('AUTHORIZATION_INVALID');
  const transcriptBytes = await readFile(path.join(ROOT, plan.request.transcript.path));
  if (sha(transcriptBytes) !== plan.request.transcript.fileSha256) fail('TRANSCRIPT_SHA_CHANGED');
  validateUtterances(utterances, {sourceTranscriptPath: plan.request.transcript.path, sourceTranscriptBytes: transcriptBytes});
  const transcript = JSON.parse(transcriptBytes.toString());
  if (utterances.sourceUri !== path.join(ROOT, plan.request.sourceVideo.path) || transcript.sourceUri !== utterances.sourceUri) fail('SOURCE_MEMBERSHIP_INVALID');
  for (const b of [plan.request.sourceVideo, ...plan.implementationBindings]) await verifyBytes(b);
  if (!keys(candidateSet.origins, ['discoveryResult', 'formalIdentityCatalog'])) fail('CANDIDATE_ORIGINS_INVALID');
  const [discovery, identities] = await Promise.all([
    readBound(candidateSet.origins.discoveryResult), readBound(candidateSet.origins.formalIdentityCatalog),
  ]);
  if (!same(candidateSet, constructSelectionCandidateSetV001(plan.request, discovery, identities, candidateSet.origins))) fail('CANDIDATE_SET_RECONSTRUCTION_INVALID');
  if (retention.schemaVersion !== 'candidate-internal-edit-machine-adoption-v001'
    || !same(retention.parentAdoptionBinding, candidateSet.origins.formalIdentityCatalog)
    || !same(retention.acousticValidationBinding, plan.acousticValidation)
    || !same(retention.sourceVideoBinding, plan.request.sourceVideo) || !same(retention.transcriptBinding, plan.request.transcript)
    || !same(retention.utteranceBinding, plan.request.utterances)) fail('RETENTION_SOURCE_BINDING_INVALID');
  const [retentionRequest, retentionResponse, retentionResult] = await Promise.all(
    ['request', 'response', 'result'].map(k => readBound(retention.judgment[k])));
  if (!same(retentionRequest.planBinding, retention.planBinding)
    || !same(retentionRequest.parentAdoptionBinding, candidateSet.origins.formalIdentityCatalog)) fail('RETENTION_JUDGMENT_BINDING_INVALID');
  const acoustic = await byteJson(plan.acousticValidation);
  await verifyBytes(acoustic.implementationBinding);
  const preflight = await byteJson(acoustic.sourceBindings[0]);
  if (preflight.sourceBindings[0].path !== path.join(ROOT, plan.request.transcript.path)
    || preflight.sourceBindings[0].fileSha256 !== plan.request.transcript.fileSha256) fail('ACOUSTIC_SOURCE_MEMBERSHIP_INVALID');
  const observations = await Promise.all(acoustic.sourceBindings.slice(1, -1).map(byteJson));
  const byId = new Map<number, Json>(transcript.segments.map((s: Json) => [s.id, s]));
  if (observations.length !== preflight.chunks.length) fail('OBSERVATION_COVERAGE_INVALID');
  const chunks = [];
  for (const [i, chunk] of preflight.chunks.entries()) {
    for (const a of chunk.atoms) if (a.text !== byId.get(a.sourceSegmentId)?.text) fail('OBSERVATION_TEXT_CHANGED');
    for (const b of [chunk.audioBinding, chunk.rawTextBinding]) {
      if (!b.path.startsWith(`${ROOT}/`) || await fileSha(b.path) !== b.fileSha256) fail('OBSERVATION_INPUT_CHANGED');
    }
    if (observations[i].preflightBinding.fileSha256 !== acoustic.sourceBindings[0].fileSha256) fail('OBSERVATION_PREFLIGHT_CHANGED');
    chunks.push(validateAcousticChunkV001(chunk, observations[i]));
  }
  if (!same(chunks, acoustic.chunks)) fail('OBSERVATION_RECONSTRUCTION_CHANGED');
  const c = {plan, planBinding: bind(planPath, plan), authorization, candidateSet, utterances, transcript,
    rendererTemplate, captionStyleTemplate, discovery, retention, retentionRequest, retentionResponse, retentionResult, chunks};
  reconstructReusedRetentionV001(c);
  return c;
}

/** 意味判断の採用後、検査済みの既存内部保持から採用候補の区間だけを決定的に取り出す。 */
export function promoteSelectionForExecutionV001(c: Json, token: object) {
  const {validation, adoption: selected} = promoteSelectionV001(token);
  if (!same(selected.planBinding, c.planBinding) || !same(selected.candidateSetBinding, c.plan.request.candidateSet)) fail('PROMOTION_CONTEXT_CHANGED');
  const reused = reconstructReusedRetentionV001(c);
  const selectedIds = new Set(selected.adoptedCandidates.map((p: Json) => p.candidateId));
  const segments = reused.segments!.filter((s: Json) => selectedIds.has(s.candidateId))
    .map((s: Json, i: number) => ({...structuredClone(s), reusedSegmentId: s.segmentId, segmentId: `segment-${String(i + 1).padStart(4, '0')}`}));
  const adoption = {...selected, reusedInternalRetentionBinding: c.plan.reuseInternalRetention,
    internalRetentionReconstruction: 'passed', segments};
  const editPlan = {schemaVersion: 'candidate-selection-edit-plan-v001', kind: 'edit_plan_json',
    artifactId: `${c.plan.planId}-edit-plan`, machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    sourceVideoBinding: c.plan.request.sourceVideo, segments, unresolvedEdits: [], quality: 'human-review-pending'};
  return {validation, adoption, editPlan};
}
export async function verifySelectionAdoptionV001(c: Json) {
  const [request, response, result, validation, adoption, editPlan] = await Promise.all(
    ['selection-request.json', 'selection-response.json', 'selection-result.json', 'selection-validation.json',
      'machine-adoption.json', 'edit-plan.json'].map(name => readJson(out(c, name))));
  const expected = promoteSelectionForExecutionV001(c, validateSelectionV001(c, request, response, result));
  if (!same(validation, expected.validation) || !same(adoption, expected.adoption) || !same(editPlan, expected.editPlan)) fail('ADOPTION_RECONSTRUCTION_INVALID');
  return expected;
}
async function manufacture(c: Json) {
  const {adoption, editPlan} = await verifySelectionAdoptionV001(c);
  if (!adoption.adoptedCandidates.length) fail('NO_ADOPTED_CANDIDATES_TO_RENDER');
  const ad = bind(out(c, 'machine-adoption.json'), adoption), ep = bind(out(c, 'edit-plan.json'), editPlan);
  const job = {schemaVersion: 'presentation-base-media-build-job-v001', jobId: `${c.plan.planId}-manufacturing-values`,
    assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: {sourceProvenance: 'existing-repository-media', sourceRef: c.plan.request.sourceId,
      sourceUri: c.utterances.sourceUri, ...c.plan.request.sourceVideo}, outputDirectory: out(c, 'base-media')};
  pass(validateManufacturingJob(job), 'SELECTION_MANUFACTURING_VALUES_INVALID');
  const jb = await publish(out(c, 'manufacturing-values.json'), job);
  const invocation = {schemaVersion: 'candidate-selection-core-invocation-v001', planBinding: c.planBinding,
    authorizationBinding: c.plan.authorization, machineAdoptionBinding: ad, editPlanBinding: ep,
    validatorResultBinding: adoption.validatorResultBinding, manufacturingValuesBinding: jb,
    admission: 'reconstructed-candidate-selection-and-existing-retention', implementationBindings: c.plan.implementationBindings,
    humanQuality: 'not-evaluated'};
  const ib = await publish(out(c, 'core-invocation.json'), invocation);
  return buildAdoptedBaseMediaV001(c, adoption, editPlan, job, jb, ib,
    {inspection: 'candidate-selection-source-inspection-v001', receipt: 'candidate-selection-base-media-validation-v001'});
}

export async function executeSelectionE2EV001(planPath: string) {
  let c = await loadSelectionContextV001(planPath);
  let stage = 'candidate-selection';
  try {
    await publish(out(c, 'plan-snapshot.json'), c.plan);
    const request = buildSelectionRequestV001(c);
    await publish(out(c, 'selection-request.json'), request);
    let response: Json | undefined;
    const result = await runCandidateSelectionV001(request.input, async input => {
      if (!same(input, request.input)) fail('SKILL_INPUT_CHANGED');
      // 意味判断へは本文・ID・制作条件だけを表示。来歴や旧採否は渡さない。
      response = await selectionThroughStdin(request);
      await publish(out(c, 'selection-response.json'), response);
      return response.answer;
    });
    await publish(out(c, 'selection-result.json'), result);
    const fresh = await loadSelectionContextV001(planPath);
    if (!same(fresh.planBinding, c.planBinding)) fail('PLAN_CHANGED_DURING_JUDGMENT');
    c = fresh;
    const promoted = promoteSelectionForExecutionV001(c, validateSelectionV001(c, request, response!, result));
    for (const [name, filename] of Object.entries({validation: 'selection-validation.json', adoption: 'machine-adoption.json', editPlan: 'edit-plan.json'}))
      await publish(out(c, filename), promoted[name as keyof typeof promoted]);
    stage = 'common-base-media';
    process.stdout.write(JSON.stringify({event: 'selection-base-media-start', adopted: promoted.adoption.adoptedCandidates.map((p: Json) => p.candidateId),
      rejected: promoted.adoption.rejectedCandidates.map((p: Json) => p.candidateId)}) + '\n');
    const base = await manufacture(c);
    await publish(out(c, 'base-media-bindings.json'), {schemaVersion: 'candidate-selection-base-media-bindings-v001', ...base});
    const captionText = internalCaptionTextV001(c as any, promoted.adoption);
    await publish(out(c, 'caption-text-input.json'), captionText.textInput);
    const traces: Json[] = [];
    for (const [i, displayRequest] of captionText.requests.entries()) {
      stage = `caption-display-${i + 1}`;
      await publish(out(c, `display-${i + 1}-request.json`), displayRequest);
      let displayResponse: Json | undefined;
      const displayResult = await runCaptionDisplayBoundariesV001(displayRequest.input, async input => {
        if (!same(input, displayRequest.input)) fail('DISPLAY_INPUT_CHANGED');
        displayResponse = await judgeThroughStdinV001(displayRequest);
        await publish(out(c, `display-${i + 1}-response.json`), displayResponse);
        return displayResponse.answer;
      });
      await publish(out(c, `display-${i + 1}-result.json`), displayResult);
      traces.push(validateInternalDisplayV001(displayRequest, displayResponse!, displayResult));
    }
    stage = 'caption-core';
    const current = await loadSelectionContextV001(planPath);
    if (!same(current.planBinding, c.planBinding)) fail('PLAN_CHANGED_DURING_DISPLAY_JUDGMENT');
    await verifySelectionAdoptionV001(current);
    const core = await constructInternalCaptionCoreV001(current as any, promoted.adoption, base, traces);
    const artifacts: Json = {};
    for (const [name, filename] of Object.entries(INTERNAL_CORE_FILES)) artifacts[name] = await publish(out(c, filename), core[name as keyof typeof core]);
    stage = 'renderer';
    const renderer = await renderAdoptedVideoV001(c, artifacts, 'candidate-selection-renderer-execution-v001');
    const timeline = await readBound(base.timeline);
    const verification = {schemaVersion: 'candidate-selection-e2e-verification-v001', status: 'passed', planBinding: c.planBinding,
      candidateSetBinding: c.plan.request.candidateSet, machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), promoted.adoption),
      counts: {candidates: c.candidateSet.candidates.length, adopted: promoted.adoption.adoptedCandidates.length,
        rejected: promoted.adoption.rejectedCandidates.length},
      rejectedAsRedundant: promoted.adoption.rejectedCandidates.filter((p: Json) => p.judgment.basis === 'redundant').map((p: Json) => p.candidateId),
      rejectedAsWeak: promoted.adoption.rejectedCandidates.filter((p: Json) => p.judgment.basis === 'weak').map((p: Json) => p.candidateId),
      requiredRetained: promoted.adoption.adoptedCandidates.filter((p: Json) => p.judgment.basis.startsWith('necessary-')).map((p: Json) => p.candidateId),
      finalFrames: timeline.baseMedia.expectedFrameCount, finalDurationSeconds: timeline.baseMedia.expectedFrameCount / 30,
      newSelectionJudgment: 'executed-current-codex-stdin', existingInternalRetention: 'reconstructed-unchanged',
      existingDisplaySkill: 'unchanged', commonManufacturing: 'passed', technicalQc: renderer.qc,
      base, artifacts, renderer, humanQuality: 'not-evaluated', historicalHumanQualityInherited: false,
      newGeminiOrAcousticObservation: 'none', apiCommunication: 'none'};
    await publish(out(c, 'verification.json'), verification);
    process.stdout.write(JSON.stringify({event: 'candidate-selection-completed', video: renderer.video, counts: verification.counts}) + '\n');
    return verification;
  } catch (e) {
    await publish(out(c, 'failure.json'), {schemaVersion: 'candidate-selection-failure-v001', stage, error: String(e),
      stack: e instanceof Error ? e.stack : null, humanQuality: 'not-evaluated'});
    throw e;
  }
}

/** 指示-019の実証設営。具体的な採用候補・件数・判断結果はここに置かない。 */
export async function prepareSelectionDemoV001() {
  const priorRoot = 'evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002';
  const priorPlan = await readJson('evals/clip_composition/jobs/presentation/candidate-digest-skill-e2e/fixed-plan-v002.json');
  const request = structuredClone(priorPlan.request);
  const origins = {
    discoveryResult: bind(`${priorRoot}/candidate-result.json`, await readJson(`${priorRoot}/candidate-result.json`)),
    formalIdentityCatalog: bind(`${priorRoot}/machine-adoption.json`, await readJson(`${priorRoot}/machine-adoption.json`)),
  };
  const candidateSet = constructSelectionCandidateSetV001(request, await readBound(origins.discoveryResult),
    await readBound(origins.formalIdentityCatalog), origins);
  request.candidateSet = await publish(`${WORK}/candidate-set.json`, candidateSet);
  const authorization = await publish(`${WORK}/received-instruction.json`, {
    schemaVersion: 'candidate-selection-received-instruction-v001', recordId: 'zev-instruction-019-20260908',
    instruction: 'ZEV進行管理２ 指示-019', approvalQuote: 'kawafmm承認済み。',
    scope: {newCandidateSelection: true, existingMaterialOnly: true, deterministicAdoption: true,
      existingSkillCoreRenderer: true, humanQualityAfterRender: true, apiCommunication: false, newMaterial: false},
  });
  const retainedPath = 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/internal-edit-v001/machine-adoption.json';
  const retained = await readJson(retainedPath);
  const plan = {schemaVersion: 'candidate-selection-fixed-plan-v001', planId: 'candidate-selection-ymUsGrT6EaA-20260908-v001',
    authorization, request,
    structureConditions: [
      '内容上重要または見どころになる場面を、必要な文脈を残してダイジェストにする。',
      '採用候補の元素材順を維持する。候補内の保持は既存の検査済み意味判断を再検査して再利用する。',
      '振り返りや締めの有無も、制作要求と他候補との関係から必要性を判断する。採用件数は指定しない。',
    ], policy: SELECTION_POLICY,
    skills: [
      {id: 'candidate-selection', version: 'v001', mode: 'current-codex-stdin-v001'},
      {id: 'candidate-internal-retention', version: 'v001', mode: 'existing-result-revalidation'},
      {id: 'caption-display-boundaries', version: 'v001', mode: 'current-codex-stdin-v001'},
    ], reuseInternalRetention: bind(retainedPath, retained), acousticValidation: retained.acousticValidationBinding,
    implementationBindings: await Promise.all(SELECTION_IMPLEMENTATIONS.map(async p => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))}))),
    outputRoot: WORK};
  assertSelectionPlanV001(plan);
  const binding = await publish(`${WORK}/fixed-plan.json`, plan);
  const c = await loadSelectionContextV001(binding.path);
  await publish(`${WORK}/preflight.json`, {schemaVersion: 'candidate-selection-preflight-v001', status: 'passed',
    planBinding: binding, candidateCount: c.candidateSet.candidates.length,
    candidateSetReconstruction: 'passed', internalRetentionReconstruction: 'passed',
    judgmentInputContainsOnly: ['productionRequest', 'structureConditions', 'criteria', 'sourceId', 'candidateId', 'title', 'utteranceId', 'text'],
    historicalHumanLabelsInJudgmentInput: false, planHasNoChosenIdsOrCount: true, selectionCriteria: SELECTION_CRITERIA});
  return binding;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv[2] === 'prepare') process.stdout.write(JSON.stringify(await prepareSelectionDemoV001()) + '\n');
  else await executeSelectionE2EV001(process.argv[2]);
}
