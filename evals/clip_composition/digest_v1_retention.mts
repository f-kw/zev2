import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {ROOT, bind, readJson, readBound, same, keys, sha, formal, fileSha, assertByteBinding, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {assertSelectionPlanV001, constructSelectionCandidateSetV001} from './run_candidate_selection_e2e_v001.mts';
import {resolveSelectionCandidatesV001} from './candidate_selection_validation_v001.mts';
import {assertInternalRetentionResultV001} from '../../runner/src/skills/candidate-internal-retention-v001.js';
import {validateInternalRetentionIdsV001, resolveInternalRetentionV001} from './candidate_internal_retention_validation_v001.mts';
import {INTERNAL_TASK} from './run_candidate_internal_edit_v001.mts';
import {validateAcousticChunkV001} from './digest_acoustic_timing_validation_v001.mts';
import {validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001 as validateUtterances}
  from '../../runner/src/distant-connection-common-utterance-artifact-v001.js';
import {verifyPresentationFirstRealDataFileReferenceV001 as verifyBytes} from './presentation_first_real_data_gate_v001.mjs';

const fail = (code: string): never => {throw new Error(`DIGEST_RETENTION: ${code}`);};
async function byteJson(binding: Json) {
  assertByteBinding({path: binding.path, fileSha256: binding.fileSha256});
  const bytes = await readFile(path.join(ROOT, binding.path));
  if (sha(bytes) !== binding.fileSha256) fail('EXISTING_BYTES_CHANGED');
  return JSON.parse(bytes.toString('utf8'));
}

/** 候補の所属と根拠は既存入口で一件ずつ検証する。候補をまたぐ時刻順はここで要求しない。 */
export function resolveDigestRetentionParentsV1(c: Json) {
  const rows = c.candidateSet.candidates;
  assert(Array.isArray(rows) && rows.length > 0 && new Set(rows.map((r: Json) => r.candidateId)).size === rows.length,
    'DIGEST_RETENTION_CANDIDATE_IDS_INVALID');
  return rows.map((row: Json) => resolveSelectionCandidatesV001({...c,
    candidateSet: {...c.candidateSet, candidates: [row]}})[0]);
}

/** 原本の回答対応を全体で照合した後、候補ごとの検証済みtokenから保持区間を解決する。
 * 候補内部の本文全量対応・区間順・切断根拠は既存validatorへ委譲する。
 * 候補間で共通する字幕単位や時間の重複は、後段のsort / unionへそのまま渡す。
 */
export function reconstructDigestRetentionV1(c: Json) {
  const parents = resolveDigestRetentionParentsV1(c);
  const atoms = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  const utterances = new Map<string, Json>(c.utterances.utterances.map((u: Json) => [u.utteranceId, u]));
  const input = {schemaVersion: 'candidate-internal-retention-input-v001' as const, taskDescription: INTERNAL_TASK,
    candidates: parents.map((p: Json, i: number) => ({candidateId: p.candidateId, title: p.title,
      highlightReason: c.discovery.answer.candidates[i].reason,
      utterances: p.includedUtteranceIds.map((utteranceId: string) => ({utteranceId,
        atoms: utterances.get(utteranceId)!.sourceSegmentIds.map((id: number) => ({sourceSegmentId: id, text: atoms.get(id)!.text}))}))}))};
  const {retentionRequest: request, retentionResponse: response, retentionResult: result} = c;
  assert(same(request.input, input), 'INTERNAL_RETENTION_REQUEST_CHANGED');
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'candidate-internal-retention-response-v001'
    && response.requestFileSha256 === sha(formal(request)) && same(response.answer, result.answer)
    && typeof response.judgmentNote === 'string' && response.judgmentNote.trim().length > 0,
  'INTERNAL_RETENTION_PROVENANCE_MISMATCH');
  assertInternalRetentionResultV001(result);
  const answer = result.answer as Json;
  assert.equal(answer.status, 'complete', 'INTERNAL_RETENTION_ABSTAINED');
  assert.deepEqual(answer.candidates.map((r: Json) => r.candidateId), input.candidates.map(r => r.candidateId),
    'CANDIDATE_MEMBERSHIP_OR_ORDER_CHANGED');
  const candidates: Json[] = [], segments: Json[] = [];
  for (const [i, candidate] of input.candidates.entries()) {
    // これは原本を変更しない検証用の射影。元のrequest / responseのhashを作り直さない。
    const candidateInput = {...input, candidates: [candidate]};
    const candidateResult = {...result, answer: {...answer, candidates: [answer.candidates[i]]}};
    const token = validateInternalRetentionIdsV001(candidateInput, candidateResult);
    const resolved = resolveInternalRetentionV001(token, [parents[i]], c.chunks);
    assert.equal(resolved.status, 'resolved', `DIGEST_RETENTION_CUT_UNRESOLVED: ${JSON.stringify(resolved.unresolved)}`);
    candidates.push(...resolved.candidates!);
    for (const segment of resolved.segments!) segments.push({...segment,
      segmentId: `segment-${String(segments.length + 1).padStart(4, '0')}`});
  }
  assert(same(candidates, c.retention.candidates) && same(segments, c.retention.segments),
    'EXISTING_RETENTION_RECONSTRUCTION_INVALID');
  return {status: 'resolved' as const, candidates, segments};
}

/** 保存済み入力のfile参照・正式ID・本文・音響根拠を旧入口と同じ照合で読む。
 * 末尾の再構築だけを候補単位のadapterへ接続し、旧経路のvalidatorは変更しない。
 */
export async function loadDigestRetentionContextV1(planPath: string) {
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
  reconstructDigestRetentionV1(c);
  return c;
}

