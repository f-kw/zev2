import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile, access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {
  ROOT, bind, readJson, readBound, publish, same, keys, formal, sha, canonicalSha, fileSha,
  assertBinding, assertByteBinding, buildCandidateInputV001, judgeThroughStdinV001, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  assertCandidateDiscoveryResultV001, runCandidateDiscoveryV001,
} from '../../runner/src/skills/candidate-discovery-v001.js';
import {validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001 as validateUtterances}
  from '../../runner/src/distant-connection-common-utterance-artifact-v001.js';
import {constructSelectionCandidateSetV001} from './run_candidate_selection_e2e_v001.mts';
import {resolveDigestRetentionParentsV1} from './digest_v1_retention.mts';
import {assertInternalRetentionInputV001} from '../../runner/src/skills/candidate-internal-retention-v001.js';
import {INTERNAL_TASK} from './run_candidate_internal_edit_v001.mts';
import {verifyPresentationFirstRealDataFileReferenceV001 as verifyBytes}
  from './presentation_first_real_data_gate_v001.mjs';

const out = (c: Json, name: string) => `${c.plan.outputRoot}/${name}`;
const event = (value: Json) => process.stdout.write(JSON.stringify(value) + '\n');

/** 新素材の正式入力だけを読む。旧工事の採否、正解区間、完成字幕は参照しない。 */
export async function loadPhase2Context(jobPath: string) {
  const plan = await readJson(jobPath);
  assert(keys(plan, ['schemaVersion', 'planId', 'authorization', 'request', 'outputRoot',
    'implementationBindings', 'rendererImplementationBindings'])
    && plan.schemaVersion === 'digest-v1-phase2-input-job-v001', 'PHASE2_JOB_INVALID');
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(plan.planId), 'PHASE2_JOB_ID_INVALID');
  assertByteBinding({path: plan.outputRoot, fileSha256: '0'.repeat(64)});
  assert(plan.outputRoot.startsWith('evals/clip_composition/outputs/presentation/work-digest-v1-'), 'PHASE2_OUTPUT_ROOT_INVALID');
  assert(keys(plan.request, ['purpose', 'sourceId', 'sourceVideo', 'transcript', 'wordTimestamps',
    'sttManifest', 'utterances', 'rendererTemplate', 'captionStyleTemplate']), 'PHASE2_REQUEST_INVALID');
  assertBinding(plan.authorization);
  const authorization = await readBound(plan.authorization);
  assert(authorization.schemaVersion === 'digest-v1-phase2-received-instruction-v001'
    && authorization.approvalQuote === 'kawafmm承認済み。'
    && authorization.sourceDecision.sourceId === plan.request.sourceId, 'PHASE2_AUTHORIZATION_INVALID');
  for (const key of ['sourceVideo', 'transcript', 'wordTimestamps', 'sttManifest']) {
    const b = plan.request[key]; assertByteBinding(b);
    await verifyBytes(b);
  }
  for (const b of [...plan.implementationBindings, ...plan.rendererImplementationBindings]) {
    assertByteBinding({path: b.path, fileSha256: b.fileSha256});
    assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256, 'PHASE2_IMPLEMENTATION_CHANGED');
  }
  const transcriptBytes = await readFile(path.join(ROOT, plan.request.transcript.path));
  const transcript = JSON.parse(transcriptBytes.toString('utf8'));
  const utterances = await readBound(plan.request.utterances);
  validateUtterances(utterances, {sourceTranscriptPath: plan.request.transcript.path, sourceTranscriptBytes: transcriptBytes});
  assert.equal(utterances.sourceUri, path.join(ROOT, plan.request.sourceVideo.path), 'PHASE2_VIDEO_MEMBERSHIP_CHANGED');
  const [rendererTemplate, captionStyleTemplate] = await Promise.all([
    readBound(plan.request.rendererTemplate), readBound(plan.request.captionStyleTemplate),
  ]);
  rendererTemplate.rendererImplementationBindings = structuredClone(plan.rendererImplementationBindings);
  return {plan, planBinding: bind(jobPath, plan), authorization, transcript, utterances,
    rendererTemplate, captionStyleTemplate};
}

export function phase2DiscoveryRequest(c: Json) {
  const input = buildCandidateInputV001(c as any);
  return {schemaVersion: 'candidate-discovery-judgment-request-v001', requestId: `${c.plan.planId}-candidates`,
    planBinding: c.planBinding, input, inputCanonicalSha256: canonicalSha(input)};
}

/** 実行前の全文入力を不変保存する。この処理に意味判断はない。 */
export async function preparePhase2Discovery(jobPath: string) {
  const c = await loadPhase2Context(jobPath), request = phase2DiscoveryRequest(c);
  const requestBinding = await publish(out(c, 'candidate-request.json'), request);
  const preflight = {schemaVersion: 'digest-v1-phase2-discovery-input-preflight-v001', status: 'passed',
    planBinding: c.planBinding, requestBinding, inputContract: 'passed',
    executorBinding: {path: path.relative(ROOT, new URL(import.meta.url).pathname),
      fileSha256: await fileSha(new URL(import.meta.url).pathname)},
    sourceSegmentCount: c.utterances.sourceSegmentCount, utteranceCount: request.input.utterances.length,
    formalInputBytes: formal(request.input).length, compactInputCharacters: JSON.stringify(request.input).length,
    textCharacters: request.input.utterances.reduce((n, u) => n + u.text.length, 0),
    judgmentMethod: 'current-codex-stdin-v001', discoveryCalls: 0,
    chunking: false, hierarchicalDiscovery: false, priorCandidateAnswerUsed: false};
  await publish(out(c, 'discovery-input-preflight.json'), preflight);
  event(preflight);
}

/** C全採用用の正式IDを旧割当規則で生成し、候補単位のPhase 1検証へ渡す。
 * 旧runnerの「二件以上」「候補間非重複」は課さない。本文・所属・順序検査は省略しない。
 */
export function resolvePhase2Discovery(c: Json, request: Json, response: Json, result: Json) {
  assert(same(request, phase2DiscoveryRequest(c)), 'PHASE2_DISCOVERY_REQUEST_CHANGED');
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'candidate-discovery-judgment-response-v001'
    && response.requestFileSha256 === sha(formal(request)) && same(response.answer, result.answer)
    && typeof response.judgmentNote === 'string' && response.judgmentNote.trim(), 'PHASE2_DISCOVERY_PROVENANCE_INVALID');
  assertCandidateDiscoveryResultV001(result);
  if (result.answer.status === 'abstained') return {status: 'abstained' as const};
  const origins = {discoveryResult: bind(out(c, 'candidate-result.json'), result),
    formalIdentityCatalog: null as any};
  const candidateSet = {schemaVersion: 'candidate-selection-candidate-set-v001', sourceId: c.plan.request.sourceId,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances, origins,
    candidates: result.answer.candidates.map((r: Json, i: number) => ({
      candidateId: `candidate-${String(i + 1).padStart(4, '0')}`, sourceId: r.sourceId, title: r.title,
      contextStartUtteranceId: r.contextStartUtteranceId, contextEndUtteranceId: r.contextEndUtteranceId,
      evidenceUtteranceIds: structuredClone(r.evidenceUtteranceIds)}))};
  const parents = resolveDigestRetentionParentsV1({...c, candidateSet});
  const identities = {schemaVersion: 'candidate-digest-machine-adoption-v001',
    artifactId: `${c.plan.planId}-candidate-identities`, authorityKind: 'C-all-new-discovery-formal-ids',
    planBinding: c.planBinding, authorizationBinding: c.plan.authorization,
    sourceVideoBinding: c.plan.request.sourceVideo, transcriptBinding: c.plan.request.transcript,
    utteranceBinding: c.plan.request.utterances, resultBinding: origins.discoveryResult,
    requestBinding: bind(out(c, 'candidate-request.json'), request),
    responseBinding: bind(out(c, 'candidate-response.json'), response),
    selectedCandidates: parents.map((p: Json, i: number) => ({...p, resultOrdinal: i + 1,
      reason: result.answer.candidates[i].reason})),
    humanQuality: 'not-evaluated', individualCandidateHumanApproval: 'not-performed'};
  origins.formalIdentityCatalog = bind(out(c, 'candidate-identities.json'), identities);
  assert(same(candidateSet, constructSelectionCandidateSetV001(c.plan.request, result, identities, origins)),
    'PHASE2_CANDIDATE_RECONSTRUCTION_INVALID');
  return {status: 'resolved' as const, candidateSet, identities, parents};
}

export function buildPhase2RetentionInput(c: Json) {
  const atoms = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  const utterances = new Map<string, Json>(c.utterances.utterances.map((u: Json) => [u.utteranceId, u]));
  const input = {schemaVersion: 'candidate-internal-retention-input-v001' as const, taskDescription: INTERNAL_TASK,
    candidates: resolveDigestRetentionParentsV1(c).map((p: Json, i: number) => ({candidateId: p.candidateId,
      title: p.title, highlightReason: c.discovery.answer.candidates[i].reason,
      utterances: p.includedUtteranceIds.map((utteranceId: string) => ({utteranceId,
        atoms: utterances.get(utteranceId)!.sourceSegmentIds.map((id: number) => ({sourceSegmentId: id, text: atoms.get(id)!.text}))}))}))};
  // Phase 1と同じ射影。候補間の共有IDを改名せず、候補内部の閉じた語彙を検査する。
  for (const candidate of input.candidates) assertInternalRetentionInputV001({...input, candidates: [candidate]});
  return input;
}

export async function executePhase2Discovery(jobPath: string) {
  const c = await loadPhase2Context(jobPath);
  const request = await readJson(out(c, 'candidate-request.json'));
  assert(same(request, phase2DiscoveryRequest(c)), 'PHASE2_SAVED_REQUEST_CHANGED');
  const preflight = await readJson(out(c, 'discovery-input-preflight.json'));
  assert(same(preflight.requestBinding, bind(out(c, 'candidate-request.json'), request)), 'PHASE2_PREFLIGHT_REQUEST_CHANGED');
  assert.equal(await fileSha(path.join(ROOT, preflight.executorBinding.path)), preflight.executorBinding.fileSha256,
    'PHASE2_DISCOVERY_EXECUTOR_CHANGED');
  await assertAbsent(path.join(ROOT, out(c, 'candidate-response.json')));
  const result = await runCandidateDiscoveryV001(request.input, async input => {
    assert(same(input, request.input), 'PHASE2_SKILL_INPUT_CHANGED');
    const response = await judgeThroughStdinV001(request);
    await publish(out(c, 'candidate-response.json'), response);
    return response.answer;
  });
  await publish(out(c, 'candidate-result.json'), result);
  const response = await readJson(out(c, 'candidate-response.json'));
  const resolved = resolvePhase2Discovery(c, request, response, result);
  if (resolved.status === 'abstained') {event({stage: 'candidate-discovery', status: 'abstained', prospectCount: 0}); return;}
  await publish(out(c, 'candidate-identities.json'), resolved.identities);
  const candidates = await publish(out(c, 'candidate-set.json'), resolved.candidateSet);
  const input = buildPhase2RetentionInput({...c, candidateSet: resolved.candidateSet, discovery: result});
  const retentionRequest = {schemaVersion: 'candidate-internal-retention-request-v001',
    requestId: `${c.plan.planId}-retention`, planBinding: c.planBinding,
    parentAdoptionBinding: resolved.candidateSet.origins.formalIdentityCatalog,
    input, inputCanonicalSha256: canonicalSha(input)};
  await publish(out(c, 'retention-request.json'), retentionRequest);
  event({stage: 'candidate-discovery', status: 'validated', prospectCount: resolved.parents.length,
    candidateSetBinding: candidates, retentionRequestBinding: bind(out(c, 'retention-request.json'), retentionRequest)});
}

async function assertAbsent(p: string) {
  try {await access(p);} catch (error: any) {if (error.code === 'ENOENT') return; throw error;}
  throw new Error(`PHASE2_EXISTING_RESPONSE_CANNOT_BE_REJUDGED: ${p}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  if (!job || !['prepare-discovery', 'discovery'].includes(mode)) throw new Error('usage: prepare-discovery|discovery job.json');
  try {await (mode === 'prepare-discovery' ? preparePhase2Discovery : executePhase2Discovery)(job);}
  catch (error) {process.stderr.write(String(error) + '\n'); process.exitCode = 1;}
}
