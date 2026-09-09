import test from 'node:test';
import assert from 'node:assert/strict';
import {bind, sha, formal, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {runCandidateDiscoveryV001} from '../../runner/src/skills/candidate-discovery-v001.js';
import {runCandidateSelectionV001} from '../../runner/src/skills/candidate-selection-v001.js';
import {buildSelectionRequestV001} from './candidate_selection_validation_v001.mts';
import {
  buildUnseenDiscoveryRequestV001, validateUnseenDiscoveryV001, projectUnseenSelectionPlanV001,
  selectUnseenCandidatesV001, keepWholeSelectedContextsV001, STRUCTURE024,
} from './unseen_material_thin_plan_v001.mts';

function context(): Json {
  const text = ['種を植えた。', '芽が出て驚いた。', '水を忘れた。', '水を与えると持ち直した。'];
  const utterances = text.map((text, i) => ({utteranceId: `u-${i + 1}`, text, sourceSegmentIds: [i + 1],
    sourceStartMs: i * 1000, sourceEndMs: (i + 1) * 1000}));
  const thinPlan = {schemaVersion: 'production-intent-plan-v0', productionIntent: '初めて育てる植物の変化への気づきを見せる。'};
  const plan = {schemaVersion: 'synthetic-test-plan', planId: 'synthetic-unseen', outputRoot: 'synthetic-output',
    authorization: {}, stage: 'candidate-discovery', request: {sourceId: 'plant', purpose: thinPlan.productionIntent,
      sourceVideo: {path: 'source.mp4', fileSha256: 'a'.repeat(64)},
      transcript: {path: 'transcript.json', fileSha256: 'b'.repeat(64)},
      utterances: bind('utterances.json', {schemaVersion: 'test-utterances', utterances}), candidateSet: null},
    structureConditions: [...STRUCTURE024]};
  return {plan, planBinding: bind('discovery-plan.json', plan), thinPlan, utterances: {utterances},
    transcript: {segments: text.map((text, i) => ({id: i + 1, text, startMs: i * 1000, endMs: (i + 1) * 1000}))}};
}
function discoveryAnswer(): Json {
  return {status: 'complete', candidates: [
    {sourceId: 'plant', title: '発芽への驚き', reason: '育て始めて発芽に気づく。',
      contextStartUtteranceId: 'u-1', contextEndUtteranceId: 'u-2', evidenceUtteranceIds: ['u-2']},
    {sourceId: 'plant', title: '水やりによる回復', reason: '水を忘れた後に対処する。',
      contextStartUtteranceId: 'u-3', contextEndUtteranceId: 'u-4', evidenceUtteranceIds: ['u-3', 'u-4']},
  ]};
}
async function discovery(c = context(), answer = discoveryAnswer()) {
  const request = buildUnseenDiscoveryRequestV001(c);
  const response = {schemaVersion: 'candidate-discovery-judgment-response-v001', requestFileSha256: sha(formal(request)),
    answer, judgmentNote: '合成データによる来歴検査。品質判定ではない。'};
  const result = await runCandidateDiscoveryV001(request.input, async () => answer);
  return {c, request, response, result};
}
async function selection(choices = ['adopt', 'reject']) {
  const d = await discovery();
  const {candidateSet} = validateUnseenDiscoveryV001(d.c, d.request, d.response, d.result);
  const plan = projectUnseenSelectionPlanV001(d.c, candidateSet);
  const c: Json = {...d.c, plan, planBinding: bind('selection-plan.json', plan), candidateSet};
  const request = buildSelectionRequestV001(c);
  const answer = {status: 'complete', decisions: request.input.candidates.map((p, i) => ({
    candidateId: p.candidateId, sourceId: p.sourceId, decision: choices[i],
    basis: choices[i] === 'adopt' ? 'distinct-highlight' : 'weak', reason: '合成の採否。',
    evidenceUtteranceIds: [p.utterances[0].utteranceId],
    comparisons: [{candidateId: request.input.candidates[1 - i].candidateId,
      evidenceUtteranceIds: [request.input.candidates[1 - i].utterances[0].utteranceId]}],
  }))};
  const response = {schemaVersion: 'candidate-selection-response-v001', requestFileSha256: sha(formal(request)),
    answer, judgmentNote: '合成データによる来歴検査。'};
  const result = await runCandidateSelectionV001(request.input, async () => answer);
  return {c, request, response, result};
}

test('full transcript enters discovery, and all proposed candidates reach the unchanged selection input', async () => {
  const d = await discovery();
  assert.deepEqual(d.request.input.utterances.map(u => u.utteranceId), ['u-1', 'u-2', 'u-3', 'u-4']);
  const s = await selection();
  assert.equal(s.request.input.productionRequest, s.c.thinPlan.productionIntent);
  assert.equal(s.request.input.candidates.length, 2);
  assert.deepEqual(s.request.input.candidates.map(p => Object.keys(p)),
    Array.from({length: 2}, () => ['candidateId', 'sourceId', 'title', 'utterances']));
  assert(s.request.input.candidates.every(p => p.utterances.every(u => Object.keys(u).join(',') === 'utteranceId,text')));
});
test('partial discovery input and stale intent fail before candidate projection', async () => {
  const d = await discovery(); d.request.input.utterances.pop();
  assert.throws(() => validateUnseenDiscoveryV001(d.c, d.request, d.response, d.result), /FULL_SOURCE_DISCOVERY_INPUT_CHANGED/);
  const c = context(); c.thinPlan.productionIntent = '別の意図';
  assert.throws(() => buildUnseenDiscoveryRequestV001(c), /FIXED_INTENT_CHANGED/);
});
test('discovery answer cannot be detached from its request or replaced during validation', async () => {
  const d = await discovery(); d.response.requestFileSha256 = '0'.repeat(64);
  assert.throws(() => validateUnseenDiscoveryV001(d.c, d.request, d.response, d.result), /RESPONSE_BINDING/);
  const e = await discovery(); (e.result.answer as Json).candidates[0].title = '改変';
  assert.throws(() => validateUnseenDiscoveryV001(e.c, e.request, e.response, e.result), /RESPONSE_BINDING/);
});
test('unknown IDs, cross-candidate evidence, wrong source and overlapping discovery are rejected', async () => {
  const changes = [
    (a: Json) => {a.candidates[0].contextStartUtteranceId = 'unknown';},
    (a: Json) => {a.candidates[0].evidenceUtteranceIds = ['u-4'];},
    (a: Json) => {a.candidates[0].sourceId = 'other';},
    (a: Json) => {a.candidates[1].contextStartUtteranceId = 'u-2';},
  ];
  for (const change of changes) {
    const a = discoveryAnswer(); change(a); const d = await discovery(context(), a);
    assert.throws(() => validateUnseenDiscoveryV001(d.c, d.request, d.response, d.result));
  }
});
test('selection does not impose a count or force a rejection', async () => {
  for (const choices of [['adopt', 'reject'], ['adopt', 'adopt'], ['reject', 'reject']]) {
    const s = await selection(choices), selected = selectUnseenCandidatesV001(s.c, s.request, s.response, s.result);
    assert.equal(selected.adoption.adoptedCandidates.length, choices.filter(x => x === 'adopt').length);
  }
});
test('selection remains attached to every discovered candidate and the fixed structure conditions', async () => {
  const s = await selection(); s.request.input.candidates.pop();
  assert.throws(() => selectUnseenCandidatesV001(s.c, s.request, s.response, s.result), /SELECTION_REQUEST_CHANGED/);
  const e = await selection(); e.c.plan.structureConditions.push('1件だけ採用する');
  assert.throws(() => selectUnseenCandidatesV001(e.c, e.request, e.response, e.result), /STRUCTURE_CONDITIONS_CHANGED/);
});
test('renderable ranges come only from the new formal selection with explicit retention assessment', async () => {
  const s = await selection(), selected = selectUnseenCandidatesV001(s.c, s.request, s.response, s.result).adoption;
  const assessment = {schemaVersion: 'unseen-material-retention-assessment-v001',
    selectionAdoptionBinding: bind('synthetic-output/selection-adoption.json', selected),
    candidates: [{candidateId: 'candidate-0001', status: 'whole-context-sufficient', reason: '発芽の前提と気づきが残る。'}],
    perceptualLimitations: ['見た目は未観測。']};
  const execution = keepWholeSelectedContextsV001(s.c, selected, assessment);
  assert.equal(execution.editPlan.segments.length, 1);
  assert.deepEqual(execution.editPlan.segments[0].sourceSegmentIds, [1, 2]);
  assessment.candidates[0].status = 'partial-retention-needed';
  assert.throws(() => keepWholeSelectedContextsV001(s.c, selected, assessment), /INTERNAL_RETENTION_DECISION_REQUIRED/);
});
