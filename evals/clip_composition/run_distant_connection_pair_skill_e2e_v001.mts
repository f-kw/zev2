import {readFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  ROOT, bind, readJson, readBound, publish, pass, same, keys, canonicalSha, formal, sha, fileSha,
  assertBinding, assertByteBinding, judgeThroughStdinV001, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  assertDistantConnectionPairInputV001, assertDistantConnectionPairResultV001, runDistantConnectionPairV001,
} from '../../runner/src/skills/distant-connection-pair-v001.js';
import {validateSemanticUtteranceArtifactAgainstTranscriptBytesV001 as validateUtterances}
  from '../../runner/src/semantic-utterance-artifact-v001.js';
import {runCaptionDisplayBoundariesV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {validatePresentationBaseMediaBuildJobV001 as validateManufacturingJob}
  from './presentation_base_media_build_v003.mjs';
import {verifyPresentationFirstRealDataFileReferenceV001 as verifyExistingInputBytes}
  from './presentation_first_real_data_gate_v001.mjs';
import {
  buildAdoptedBaseMediaV001, buildAdoptedCaptionInputsV001, validateDisplayForAdoptionV001,
  readValidatedDisplayTracesV001, assembleAdoptedCaptionCoreV001, renderAdoptedVideoV001, CORE_FILES,
} from './adopted_media_manufacturing_v001.mts';

const fail = (code: string): never => {throw new Error(`DISTANT_PAIR_E2E: ${code}`);};
const out = (c: Json, p: string) => `${c.plan.outputRoot}/${p}`;
export const DISTANT_IMPLEMENTATION_PATHS = [
  'runner/src/skills/distant-connection-pair-v001.ts',
  'evals/clip_composition/run_distant_connection_pair_skill_e2e_v001.mts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'runner/src/skills/caption-display-boundaries-v001.ts',
  'runner/src/semantic-utterance-artifact-v001.ts',
];
export const DISTANT_POLICY = Object.freeze({
  composition: 'one-first-part-then-one-second-part', selection: 'new-codex-semantic-judgment',
  grounding: 'existing-candidate-and-utterance-ids', finalTime: 'existing-id-boundaries-then-core-projection',
  internalRetention: 'preserve-existing-reviewed-context-no-internal-deletions',
  quality: 'human-review-after-render', apiCommunication: false,
});
export const DISTANT_CRITERIA = [
  '前半で示された具体的な不安・期待・出来事が、後半の出来事や反応でどう回収されるかを判断する。',
  '単なる同じ話題や同じ単語では不十分。短い動画の中で関係と必要な文脈が伝わる組を選ぶ。',
  '過去の観測・評価は既存事実として参照するが、過去回答をコピーせず今回の制作要求へ新しく判断する。',
  '返すのは既存の前半ID・後半IDと意味上の理由・根拠発話IDだけ。時刻・字幕・正式採用は返さない。',
  '前半と後半は元の時間順で離れた部分であること。成立しなければabstainedを返す。',
];
export function assertDistantPlanV001(p: Json) {
  if (!keys(p, ['schemaVersion', 'planId', 'authorization', 'request', 'policy', 'skills', 'implementationBindings', 'outputRoot'])
    || p.schemaVersion !== 'distant-connection-pair-fixed-plan-v001'
    || typeof p.planId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p.planId)
    || typeof p.outputRoot !== 'string' || !p.outputRoot.startsWith('evals/clip_composition/outputs/presentation/work-distant-connection-skill-')
    || !same(p.policy, DISTANT_POLICY)
    || !same(p.skills, ['distant-connection-pair-v001', 'caption-display-boundaries-v001'])
    || !keys(p.request, ['purpose', 'sourceId', 'sourceVideo', 'transcript', 'utterances', 'candidateResponse',
      'intervalPlan', 'humanCalibration', 'rendererTemplate', 'captionStyleTemplate'])
    || typeof p.request.purpose !== 'string' || !p.request.purpose.length
    || typeof p.request.sourceId !== 'string' || !p.request.sourceId.length
    || !Array.isArray(p.implementationBindings) || p.implementationBindings.length !== DISTANT_IMPLEMENTATION_PATHS.length) fail('PLAN_INVALID');
  assertBinding(p.authorization);
  assertByteBinding({path: p.outputRoot, fileSha256: '0'.repeat(64)});
  for (const k of ['sourceVideo', 'transcript']) assertByteBinding(p.request[k]);
  for (const k of ['utterances', 'candidateResponse', 'intervalPlan', 'humanCalibration', 'rendererTemplate', 'captionStyleTemplate']) assertBinding(p.request[k]);
  DISTANT_IMPLEMENTATION_PATHS.forEach((v, i) => {
    assertByteBinding(p.implementationBindings[i]);
    if (v !== p.implementationBindings[i].path) fail('IMPLEMENTATION_BINDING_INVALID');
  });
}
async function assertBytes(b: Json) {
  await verifyExistingInputBytes(b);
}
export async function loadDistantContextV001(planPath: string) {
  const plan = await readJson(planPath); assertDistantPlanV001(plan);
  const names = ['utterances', 'candidateResponse', 'intervalPlan', 'humanCalibration', 'rendererTemplate', 'captionStyleTemplate'];
  const values = Object.fromEntries(await Promise.all(names.map(async k => [k, await readBound(plan.request[k])])));
  const authorization = await readBound(plan.authorization);
  if (authorization.schemaVersion !== 'distant-connection-instruction-record-v001'
    || authorization.instruction !== 'ZEV進行管理２ 指示-011'
    || authorization.approvalQuote !== 'いいじゃないか。遠方接続E2E着工をしてくれ'
    || authorization.boundaryDecision !== 'ZEV進行管理２ 指示-012'
    || authorization.decision !== 'continue') fail('AUTHORIZATION_INVALID');
  const bytes = await readFile(path.join(ROOT, plan.request.transcript.path));
  if (sha(bytes) !== plan.request.transcript.fileSha256) fail('TRANSCRIPT_SHA_MISMATCH');
  validateUtterances(values.utterances, {sourceTranscriptPath: plan.request.transcript.path, sourceTranscriptBytes: bytes});
  const transcript = JSON.parse(bytes.toString());
  if (values.utterances.sourceUri !== path.join(ROOT, plan.request.sourceVideo.path)
    || transcript.sourceUri !== values.utterances.sourceUri) fail('SOURCE_MEMBERSHIP_MISMATCH');
  for (const b of [plan.request.sourceVideo, ...plan.implementationBindings]) await assertBytes(b);
  const c = {plan, planBinding: bind(planPath, plan), authorization, transcript, ...values};
  buildDistantPartsV001(c);
  return c;
}

/** 旧候補の区間を入力として使い、境界を既存IDで再構築する。過去採否を新採用へ持ち込まない。 */
export function buildDistantPartsV001(c: Json) {
  const u = c.utterances.utterances as Json[];
  const byId = new Map<string, Json>(u.map(v => [v.utteranceId, v]));
  const old = c.intervalPlan, response = c.candidateResponse;
  if (old.sourceVideoId !== c.plan.request.sourceId || response.sourceVideoId !== old.sourceVideoId
    || old.sourceVideoBinding.fileSha256 !== c.plan.request.sourceVideo.fileSha256
    || old.sourceVideoBinding.path !== c.utterances.sourceUri
    || old.semanticUtteranceBinding.path !== c.plan.request.utterances.path
    || old.semanticUtteranceBinding.fileSha256 !== c.plan.request.utterances.fileSha256
    || old.candidateResponseBinding.path !== c.plan.request.candidateResponse.path
    || old.candidateResponseBinding.fileSha256 !== c.plan.request.candidateResponse.fileSha256
    || c.humanCalibration.sourceVideoId !== old.sourceVideoId
    || c.humanCalibration.sourceBindings.candidateResponse.fileSha256 !== old.candidateResponseBinding.fileSha256) fail('EXISTING_INPUT_BINDING_MISMATCH');
  const ids = new Set<string>();
  const parts: Json[] = [];
  for (const candidate of old.candidates) {
    if (ids.has(candidate.candidateId)) fail('DUPLICATE_CANDIDATE');
    ids.add(candidate.candidateId);
    const original = response.candidates.find((v: Json) => v.candidateId === candidate.candidateId);
    if (!original) fail('UNKNOWN_EXISTING_CANDIDATE');
    for (const [role, field] of [['first', 'firstPart'], ['second', 'secondPart']]) {
      const p = candidate[field];
      const rows = p.semanticUtteranceIds.map((id: string) => byId.get(id));
      if (!rows.length || rows.some((v: Json) => !v)
        || rows.some((v: Json, i: number) => i && v.ordinal !== rows[i - 1].ordinal + 1)
        || rows.map((v: Json) => v.text).join('') !== p.text
        || !same(rows.flatMap((v: Json) => v.sourceSegmentIds), p.sourceSegmentIds)
        || rows.some((v: Json) => v.sourceStartMs < p.sourceStartMs || v.sourceEndMs > p.sourceEndMs)
        || !original[`${field}SemanticUtteranceIds`].every((id: string) => p.semanticUtteranceIds.includes(id))) fail('EXISTING_PART_GROUNDING_INVALID');
      // 開始発話自身に一致しない場合は直前発話の終端だけを許す。無言映像を含む既存区間の同一性検査。
      const first = rows[0], last = rows.at(-1);
      const previous = u[first.ordinal - 2];
      const start = first.sourceStartMs === p.sourceStartMs
        ? {utteranceId: first.utteranceId, edge: 'start'}
        : previous?.sourceEndMs === p.sourceStartMs ? {utteranceId: previous.utteranceId, edge: 'end'} : null;
      if (!start || last.sourceEndMs !== p.sourceEndMs) fail('EXISTING_BOUNDARY_NOT_ID_GROUNDED');
      const end = {utteranceId: last.utteranceId, edge: 'end'};
      parts.push({partId: `${candidate.candidateId}-${role}`, candidateId: candidate.candidateId, role,
        utteranceIds: p.semanticUtteranceIds, sourceSegmentIds: p.sourceSegmentIds, text: p.text,
        boundaryRefs: {start, end}, sourceInterval: {sourceStartMs: p.sourceStartMs, sourceEndMs: p.sourceEndMs},
        historicalIntervalPlanBinding: c.plan.request.intervalPlan,
        priorObservation: role === 'second' ? candidate.intervalizationDecision.observedCause : ''});
    }
  }
  return parts;
}
export function buildDistantRequestV001(c: Json) {
  const rows = new Map<string, Json>(c.utterances.utterances.map((u: Json) => [u.utteranceId, u]));
  const input = {schemaVersion: 'distant-connection-pair-skill-input-v001',
    productionRequest: c.plan.request.purpose, sourceId: c.plan.request.sourceId,
    editorialCriteria: [...DISTANT_CRITERIA], parts: buildDistantPartsV001(c).map(p => ({
      partId: p.partId, candidateId: p.candidateId, role: p.role,
      utterances: p.utteranceIds.map((id: string) => ({utteranceId: id, text: rows.get(id)!.text})),
      priorObservation: p.priorObservation,
    })), historicalCalibration: c.humanCalibration.candidateReviews.map((r: Json) => ({candidateId: r.candidateId,
      finding: `過去の評価（今回の品質判定ではない）：${r.reason} ${r.shortFormAssessment}`}))};
  assertDistantConnectionPairInputV001(input);
  return {schemaVersion: 'distant-connection-pair-judgment-request-v001', requestId: `${c.plan.planId}-pair`,
    planBinding: c.planBinding, input, inputCanonicalSha256: canonicalSha(input)};
}
const adoptionTokens = new WeakMap<object, Json>();
export function validateDistantPairV001(c: Json, request: Json, response: Json, result: Json) {
  assertDistantPlanV001(c.plan);
  assertDistantConnectionPairResultV001(result);
  if (!same(request, buildDistantRequestV001(c))
    || !keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    || response.schemaVersion !== 'distant-connection-pair-judgment-response-v001'
    || response.requestFileSha256 !== sha(formal(request)) || !same(response.answer, result.answer)
    || typeof response.judgmentNote !== 'string' || !response.judgmentNote.trim().length) fail('PAIR_PROVENANCE_MISMATCH');
  const a = result.answer;
  if (a.status !== 'complete') fail('PAIR_ABSTAINED');
  if (a.sourceId !== c.plan.request.sourceId) fail('PAIR_SOURCE_MISMATCH');
  const parts = buildDistantPartsV001(c);
  const selected = [a.firstPartId, a.secondPartId].map(id => parts.find(p => p.partId === id));
  if (selected.some(p => !p)) fail('UNKNOWN_PART_ID');
  const [first, second] = selected as Json[];
  if (first.role !== 'first' || second.role !== 'second') fail('PAIR_ROLE_INVALID');
  if (first.sourceInterval.sourceEndMs >= second.sourceInterval.sourceStartMs) fail('PAIR_ORDER_OR_SEPARATION_INVALID');
  for (const [p, evidence] of [[first, a.firstEvidenceUtteranceIds], [second, a.secondEvidenceUtteranceIds]] as [Json, string[]][]) {
    let prior = -1;
    for (const id of evidence) {
      const i = p.utteranceIds.indexOf(id);
      if (i < 0) fail('EVIDENCE_OUTSIDE_PART');
      if (i <= prior) fail('EVIDENCE_ORDER_INVALID');
      prior = i;
    }
  }
  const token = Object.freeze({status: 'validated-distant-pair'});
  adoptionTokens.set(token, structuredClone({c, request, response, result, selected}));
  return token;
}
export function promoteDistantPairV001(token: object) {
  const stored = adoptionTokens.get(token);
  if (!stored) fail('VALIDATED_PAIR_REQUIRED');
  const {c, request, response, result, selected} = structuredClone(stored);
  const parts = selected.map((p: Json, i: number) => ({...p, timelineSegmentId: `segment-${String(i + 1).padStart(4, '0')}`}));
  const adoption = {schemaVersion: 'distant-connection-pair-machine-adoption-v001', artifactId: `${c.plan.planId}-adoption`,
    authorityKind: 'fixed-plan-machine-adoption-for-human-review', planBinding: c.planBinding,
    authorizationBinding: c.plan.authorization, requestBinding: bind(out(c, 'pair-request.json'), request),
    responseBinding: bind(out(c, 'pair-response.json'), response), resultBinding: bind(out(c, 'pair-result.json'), result),
    selectedParts: parts, connectionReason: result.answer.reason,
    evidence: {first: result.answer.firstEvidenceUtteranceIds, second: result.answer.secondEvidenceUtteranceIds},
    formalTimeResolution: 'existing-utterance-boundaries-reconstructed-from-candidate-ids',
    internalRetention: 'existing-reviewed-context-preserved', individualCandidateHumanApproval: 'not-performed',
    historicalHumanQualityInherited: false, humanQuality: 'not-evaluated'};
  const editPlan = {schemaVersion: 'distant-connection-pair-edit-plan-v001', artifactId: `${c.plan.planId}-edit-plan`,
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    sourceVideoBinding: c.plan.request.sourceVideo,
    segments: parts.map((p: Json, i: number) => ({timelineSegmentId: p.timelineSegmentId, ordinal: i + 1,
      partId: p.partId, candidateId: p.candidateId, ...p.sourceInterval,
      sourceSegmentIds: p.sourceSegmentIds, boundaryRefs: p.boundaryRefs})),
    composition: 'first-part-then-second-part', quality: 'not-evaluated'};
  return {adoption, editPlan};
}
export async function verifyDistantAdoptionV001(c: Json) {
  const [request, response, result, adoption, editPlan] = await Promise.all(
    ['pair-request.json', 'pair-response.json', 'pair-result.json', 'machine-adoption.json', 'edit-plan.json'].map(p => readJson(out(c, p))));
  const expected = promoteDistantPairV001(validateDistantPairV001(c, request, response, result));
  if (!same(adoption, expected.adoption) || !same(editPlan, expected.editPlan)) fail('ADOPTION_RECONSTRUCTION_MISMATCH');
  return expected;
}
export async function buildDistantBaseMediaV001(c: Json) {
  const {adoption, editPlan} = await verifyDistantAdoptionV001(c);
  const ad = bind(out(c, 'machine-adoption.json'), adoption);
  const ep = bind(out(c, 'edit-plan.json'), editPlan);
  const manufacturingJob = {schemaVersion: 'presentation-base-media-build-job-v001',
    jobId: `${c.plan.planId}-manufacturing-values`, assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: {sourceProvenance: 'existing-repository-media', sourceRef: c.plan.request.sourceId,
      sourceUri: c.utterances.sourceUri, ...c.plan.request.sourceVideo}, outputDirectory: out(c, 'base-media')};
  pass(validateManufacturingJob(manufacturingJob), 'MANUFACTURING_VALUES_INVALID');
  const jb = await publish(out(c, 'manufacturing-values.json'), manufacturingJob);
  const invocation = {schemaVersion: 'distant-connection-pair-core-invocation-v001',
    authorizationBinding: c.plan.authorization, planBinding: c.planBinding, machineAdoptionBinding: ad,
    editPlanBinding: ep, manufacturingValuesBinding: jb, admission: 'distant-pair-reconstructed-machine-adoption-v001',
    legacyLunaHumanApprovalEntry: 'not-invoked', individualCandidateHumanApproval: 'not-performed',
    implementationBindings: c.plan.implementationBindings};
  const ib = await publish(out(c, 'core-invocation.json'), invocation);
  return buildAdoptedBaseMediaV001(c, adoption, editPlan, manufacturingJob, jb, ib,
    {inspection: 'distant-connection-pair-source-inspection-v001', receipt: 'distant-connection-pair-base-media-validation-v001'});
}
export function buildDistantCaptionInputsV001(c: Json, adoption: Json, base: Json) {
  return buildAdoptedCaptionInputsV001(c, adoption.selectedParts,
    bind(out(c, 'machine-adoption.json'), adoption), base,
    {meaning: 'distant-connection-pair-presentation-meaning-input-v001',
      displayRequest: 'distant-connection-pair-display-request-v001', sourceRole: 'distant-pair-source'});
}
export async function constructDistantCaptionCoreV001(c: Json, adoption: Json, base: Json, tokens: object[]) {
  const input = buildDistantCaptionInputsV001(c, adoption, base);
  const traces = readValidatedDisplayTracesV001(input.requests, tokens);
  const captionAdoption = {schemaVersion: 'distant-connection-pair-caption-adoption-v001',
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    meaningInputBinding: bind(out(c, 'meaning-input.json'), input.meaning),
    displayJudgments: traces.map((v, i) => ({partId: adoption.selectedParts[i].partId,
      request: bind(out(c, `display-${i + 1}-request.json`), v.request),
      response: bind(out(c, `display-${i + 1}-response.json`), v.response),
      result: bind(out(c, `display-${i + 1}-result.json`), v.result)})),
    timeBasis: 'saved-STT-positions-without-perceptual-sync-claim', humanQuality: 'not-evaluated'};
  return assembleAdoptedCaptionCoreV001(c, input, base, captionAdoption, traces);
}
export async function executeDistantE2EV001(planPath: string) {
  let c = await loadDistantContextV001(planPath);
  await mkdir(path.join(ROOT, c.plan.outputRoot));
  let stage = 'pair-judgment';
  try {
    await publish(out(c, 'plan-snapshot.json'), c.plan);
    const request = buildDistantRequestV001(c);
    await publish(out(c, 'pair-request.json'), request);
    let response: Json | undefined;
    const result = await runDistantConnectionPairV001(request.input, async input => {
      if (!same(input, request.input)) fail('SKILL_INPUT_CHANGED');
      response = await judgeThroughStdinV001(request);
      await publish(out(c, 'pair-response.json'), response);
      return response.answer;
    });
    await publish(out(c, 'pair-result.json'), result);
    const fresh = await loadDistantContextV001(planPath);
    if (!same(fresh.planBinding, c.planBinding)) fail('PLAN_CHANGED_DURING_JUDGMENT');
    c = fresh;
    const promoted = promoteDistantPairV001(validateDistantPairV001(c, request, response!, result));
    await publish(out(c, 'machine-adoption.json'), promoted.adoption);
    await publish(out(c, 'edit-plan.json'), promoted.editPlan);
    stage = 'base-media';
    process.stdout.write(JSON.stringify({event: 'distant-pair-base-media-start', selectedParts: promoted.adoption.selectedParts.map((p: Json) => p.partId)}) + '\n');
    const base = await buildDistantBaseMediaV001(c);
    await publish(out(c, 'base-media-bindings.json'), {schemaVersion: 'distant-connection-pair-base-media-bindings-v001', ...base});
    const inputs = buildDistantCaptionInputsV001(c, promoted.adoption, base);
    const tokens: object[] = [];
    for (const [i, request] of inputs.requests.entries()) {
      stage = `display-${i + 1}`;
      await publish(out(c, `display-${i + 1}-request.json`), request);
      let response: Json | undefined;
      const result = await runCaptionDisplayBoundariesV001(request.input, async input => {
        if (!same(input, request.input)) fail('DISPLAY_INPUT_CHANGED');
        response = await judgeThroughStdinV001(request);
        await publish(out(c, `display-${i + 1}-response.json`), response);
        return response.answer;
      });
      await publish(out(c, `display-${i + 1}-result.json`), result);
      tokens.push(validateDisplayForAdoptionV001(request, response!, result, 'distant-connection-pair-display-response-v001'));
    }
    stage = 'caption-core';
    const current = await loadDistantContextV001(planPath);
    if (!same(current.planBinding, c.planBinding)) fail('PLAN_CHANGED_DURING_JUDGMENT');
    await verifyDistantAdoptionV001(current);
    const core = await constructDistantCaptionCoreV001(current, promoted.adoption, base, tokens);
    const artifacts: Json = {};
    for (const [name, filename] of Object.entries(CORE_FILES)) artifacts[name] = await publish(out(c, filename), core[name]);
    stage = 'renderer';
    const renderer = await renderAdoptedVideoV001(current, artifacts, 'distant-connection-pair-renderer-execution-v001');
    const verification = {schemaVersion: 'distant-connection-pair-e2e-verification-v001', status: 'passed',
      planBinding: c.planBinding, selectedParts: promoted.adoption.selectedParts.map((p: Json) => p.partId),
      newPairJudgment: 'executed-current-codex-stdin', reusedDisplaySkill: 'unchanged',
      adoptionReconstruction: 'passed', composition: 'two-id-grounded-source-parts',
      newFreeTimes: 0, visualAnchorsIntroduced: 0, renderer, artifacts,
      humanQuality: 'not-evaluated', perceptualCaptionSync: 'not-evaluated',
      internalDeletion: 'none', apiCommunication: 'none'};
    await publish(out(c, 'verification.json'), verification);
    process.stdout.write(JSON.stringify({event: 'distant-pair-completed', video: renderer.video, qc: renderer.qc}) + '\n');
    return verification;
  } catch (e) {
    await publish(out(c, 'failure.json'), {schemaVersion: 'distant-connection-pair-e2e-failure-v001', stage,
      error: String(e), stack: e instanceof Error ? e.stack : null, humanQuality: 'not-evaluated'});
    throw e;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await executeDistantE2EV001(process.argv[2]);
}
