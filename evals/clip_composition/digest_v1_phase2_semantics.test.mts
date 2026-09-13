import test from 'node:test';
import assert from 'node:assert/strict';
import {bind, formal, sha} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {phase2DiscoveryRequest, resolvePhase2Discovery, buildPhase2RetentionInput} from './digest_v1_phase2_semantics.mts';

function fixture() {
  const sourceVideo = {path: 'fixture/video.mp4', fileSha256: '1'.repeat(64)};
  const transcriptBinding = {path: 'fixture/transcript.json', fileSha256: '2'.repeat(64)};
  const utterances = {schemaVersion: 'test-utterances', utterances: [1, 2, 3, 4].map(i => ({
    utteranceId: `u-${i}`, sourceSegmentIds: [i], text: `発話${i}`, sourceStartMs: i * 1000, sourceEndMs: i * 1000 + 500}))};
  const plan = {schemaVersion: 'test-plan', planId: 'test-phase2', authorization: bind('fixture/auth.json', {schemaVersion: 'test-auth'}),
    request: {sourceId: 'fixture-source', purpose: '発話から見どころを提案する', sourceVideo,
      transcript: transcriptBinding, utterances: bind('fixture/utterances.json', utterances)}, outputRoot: 'fixture/output'};
  const c = {plan, planBinding: bind('fixture/plan.json', plan), utterances,
    transcript: {segments: utterances.utterances.map((u, i) => ({id: i + 1, text: u.text, startMs: u.sourceStartMs, endMs: u.sourceEndMs}))}};
  const candidate = (start: number, end: number) => ({sourceId: 'fixture-source', title: `場面${start}`,
    reason: '導入と結論がある', evidenceUtteranceIds: [`u-${end}`],
    contextStartUtteranceId: `u-${start}`, contextEndUtteranceId: `u-${end}`});
  const wrap = (answer: any) => {
    const request = phase2DiscoveryRequest(c);
    return {request, response: {schemaVersion: 'candidate-discovery-judgment-response-v001',
      requestFileSha256: sha(formal(request)), answer, judgmentNote: '合成入力で所属検査'},
    result: {schemaVersion: 'candidate-discovery-skill-result-v001', skillId: 'candidate-discovery', skillVersion: 'v001', answer}};
  };
  return {c, candidate, wrap};
}

test('zero result stays abstained and a single valid candidate needs no invented minimum', () => {
  const {c, candidate, wrap} = fixture();
  for (const answer of [{status: 'abstained'}, {status: 'complete', candidates: [candidate(1, 2)]}]) {
    const {request, response, result} = wrap(answer);
    const resolved = resolvePhase2Discovery(c, request, response, result);
    assert.equal(resolved.status, answer.status === 'abstained' ? 'abstained' : 'resolved');
    if (resolved.status === 'resolved') assert.deepEqual(resolved.candidateSet.candidates.map((x: any) => x.candidateId), ['candidate-0001']);
  }
});

test('out-of-order overlapping prospects preserve original IDs and shared atoms for Phase 1 union', () => {
  const {c, candidate, wrap} = fixture();
  const {request, response, result} = wrap({status: 'complete', candidates: [candidate(3, 4), candidate(1, 3)]});
  const resolved = resolvePhase2Discovery(c, request, response, result);
  assert.equal(resolved.status, 'resolved');
  if (resolved.status !== 'resolved') return;
  assert.deepEqual(resolved.parents.map((p: any) => p.sourceSegmentIds), [[3, 4], [1, 2, 3]]);
  const input = buildPhase2RetentionInput({...c, candidateSet: resolved.candidateSet, discovery: result});
  assert.equal(input.candidates.length, 2);
  assert.equal(input.candidates[0].utterances[0].atoms[0].sourceSegmentId, 3);
  assert.equal(input.candidates[1].utterances[2].atoms[0].sourceSegmentId, 3);
});

test('unknown evidence, reversed bounds, another source, and changed answer provenance are rejected', () => {
  const {c, candidate, wrap} = fixture();
  for (const invalid of [{...candidate(1, 2), evidenceUtteranceIds: ['u-4']}, candidate(3, 2),
    {...candidate(1, 2), sourceId: 'another-source'}, {...candidate(1, 2), contextEndUtteranceId: 'u-missing'}]) {
    const {request, response, result} = wrap({status: 'complete', candidates: [invalid]});
    assert.throws(() => resolvePhase2Discovery(c, request, response, result));
  }
  const {request, response, result} = wrap({status: 'complete', candidates: [candidate(1, 2)]});
  assert.throws(() => resolvePhase2Discovery(c, request, {...response, requestFileSha256: 'f'.repeat(64)}, result));
});
