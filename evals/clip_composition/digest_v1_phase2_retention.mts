import assert from 'node:assert/strict';
import path from 'node:path';
import {access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, readJson, publish, same, keys, sha, formal, canonicalSha, fileSha,
  judgeThroughStdinV001, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadPhase2Context, phase2DiscoveryRequest, resolvePhase2Discovery, buildPhase2RetentionInput}
  from './digest_v1_phase2_semantics.mts';
import {assertInternalRetentionResultV001, runInternalRetentionV001}
  from '../../runner/src/skills/candidate-internal-retention-v001.js';
import {validateInternalRetentionIdsV001, resolveInternalRetentionV001}
  from './candidate_internal_retention_validation_v001.mts';
import {resolveDigestRetentionParentsV1, reconstructDigestRetentionV1} from './digest_v1_retention.mts';

export const phase2Out = (c: Json, name: string) => `${c.plan.outputRoot}/${name}`;
export async function requireAbsent(p: string) {
  try {await access(path.join(ROOT, p));} catch (error: any) {if (error.code === 'ENOENT') return; throw error;}
  throw new Error(`PHASE2_EXISTING_ARTIFACT: ${p}`);
}

/** 今回の探索原本と正式候補の対応を再構築し、過去の候補回答を読まない。 */
export async function loadPhase2DiscoveryContext(jobPath: string) {
  const c = await loadPhase2Context(jobPath);
  const [request, response, discovery, candidateSet, identities, retentionRequest] = await Promise.all(
    ['candidate-request.json', 'candidate-response.json', 'candidate-result.json', 'candidate-set.json',
      'candidate-identities.json', 'retention-request.json'].map(n => readJson(phase2Out(c, n))));
  assert(same(request, phase2DiscoveryRequest(c)), 'PHASE2_DISCOVERY_REQUEST_CHANGED');
  const resolved = resolvePhase2Discovery(c, request, response, discovery);
  assert(resolved.status === 'resolved' && same(resolved.candidateSet, candidateSet)
    && same(resolved.identities, identities), 'PHASE2_DISCOVERY_ARTIFACT_CHANGED');
  const context = {...c, candidateSet, identities, discovery, retentionRequest};
  const input = buildPhase2RetentionInput(context);
  assert(same(retentionRequest, {schemaVersion: 'candidate-internal-retention-request-v001',
    requestId: `${c.plan.planId}-retention`, planBinding: c.planBinding,
    parentAdoptionBinding: candidateSet.origins.formalIdentityCatalog,
    input, inputCanonicalSha256: canonicalSha(input)}), 'PHASE2_RETENTION_REQUEST_CHANGED');
  return context;
}

/** 全体の原本対応を照合してから、候補内部だけの検証用tokenを得る。 */
export function validatePhase2Retention(c: Json, response: Json, result: Json) {
  const input = buildPhase2RetentionInput(c), request = c.retentionRequest;
  assert(same(request.input, input), 'PHASE2_RETENTION_REQUEST_CHANGED');
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'candidate-internal-retention-response-v001'
    && response.requestFileSha256 === sha(formal(request)) && same(response.answer, result.answer)
    && typeof response.judgmentNote === 'string' && response.judgmentNote.trim(), 'PHASE2_RETENTION_PROVENANCE_INVALID');
  assertInternalRetentionResultV001(result);
  if (result.answer.status === 'abstained') return {status: 'abstained' as const, reason: result.answer.reason};
  assert.deepEqual(result.answer.candidates.map((x: Json) => x.candidateId),
    input.candidates.map(x => x.candidateId), 'PHASE2_RETENTION_MEMBERSHIP_CHANGED');
  const tokens = input.candidates.map((candidate, i) => validateInternalRetentionIdsV001(
    {...input, candidates: [candidate]},
    {...result, answer: {...result.answer, candidates: [result.answer.candidates[i]]}}));
  return {status: 'validated' as const, tokens};
}

/** 一集合に対して既存Skillを一度だけ呼び、技術拒否も回答を変更せず保存する。 */
export async function executePhase2Retention(jobPath: string) {
  const c = await loadPhase2DiscoveryContext(jobPath), request = c.retentionRequest;
  await requireAbsent(phase2Out(c, 'retention-response.json'));
  await publish(phase2Out(c, 'retention-executor.json'), {
    schemaVersion: 'digest-v1-phase2-retention-executor-v001', planBinding: c.planBinding,
    requestBinding: bind(phase2Out(c, 'retention-request.json'), request),
    implementationBinding: {path: path.relative(ROOT, new URL(import.meta.url).pathname),
      fileSha256: await fileSha(new URL(import.meta.url).pathname)},
    judgmentMethod: 'current-codex-stdin-v001', inputCollections: 1, skillInvocations: 1});
  const result = await runInternalRetentionV001(request.input, async input => {
    assert(same(input, request.input), 'PHASE2_RETENTION_SKILL_INPUT_CHANGED');
    const response = await judgeThroughStdinV001(request);
    await publish(phase2Out(c, 'retention-response.json'), response);
    return response.answer;
  });
  await publish(phase2Out(c, 'retention-result.json'), result);
  const response = await readJson(phase2Out(c, 'retention-response.json'));
  let validation: Json;
  try {
    const checked = validatePhase2Retention(c, response, result);
    validation = {schemaVersion: 'digest-v1-phase2-retention-id-validation-v001', status: checked.status,
      request: bind(phase2Out(c, 'retention-request.json'), request),
      response: bind(phase2Out(c, 'retention-response.json'), response),
      result: bind(phase2Out(c, 'retention-result.json'), result),
      candidateCount: request.input.candidates.length,
      atomCount: request.input.candidates.reduce((n: number, x: Json) => n + x.utterances.reduce((m: number, u: Json) => m + u.atoms.length, 0), 0),
      sourceRangePromotion: 'pending-acoustic-endpoint-validation'};
  } catch (error) {
    await publish(phase2Out(c, 'retention-id-validation-rejected.json'), {
      schemaVersion: 'digest-v1-phase2-retention-id-validation-v001', status: 'rejected', reason: String(error),
      response: bind(phase2Out(c, 'retention-response.json'), response), result: bind(phase2Out(c, 'retention-result.json'), result),
      answerChanged: false});
    throw error;
  }
  await publish(phase2Out(c, 'retention-id-validation.json'), validation);
  process.stdout.write(JSON.stringify(validation) + '\n');
  return validation;
}

/** Phase 1の端点解決と再構築を再利用する。未解決時は一部だけを昇格しない。 */
export function resolvePhase2Retention(c: Json, response: Json, result: Json, chunks: Json[]) {
  const checked = validatePhase2Retention(c, response, result);
  if (checked.status === 'abstained') return checked;
  const parents = resolveDigestRetentionParentsV1(c), candidates: Json[] = [], segments: Json[] = [], unresolved: Json[] = [];
  checked.tokens.forEach((token, i) => {
    const resolved = resolveInternalRetentionV001(token, [parents[i]], chunks);
    if (resolved.status !== 'resolved') {unresolved.push(...resolved.unresolved!); return;}
    candidates.push(...resolved.candidates!);
    for (const segment of resolved.segments!) segments.push({...segment, segmentId: `segment-${String(segments.length + 1).padStart(4, '0')}`});
  });
  if (unresolved.length) return {status: 'unresolved' as const, unresolved, promotedSegments: []};
  const retention = {candidates, segments};
  reconstructDigestRetentionV1({...c, retentionResponse: response, retentionResult: result, retention, chunks});
  return {status: 'resolved' as const, ...retention};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  if (mode !== 'retention' || !job) throw new Error('usage: retention job.json');
  try {await executePhase2Retention(job);} catch (error) {process.stderr.write(String(error) + '\n'); process.exitCode = 1;}
}
