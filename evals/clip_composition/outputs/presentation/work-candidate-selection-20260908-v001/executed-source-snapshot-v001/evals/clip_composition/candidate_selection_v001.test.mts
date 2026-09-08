import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCandidateSelectionInputV001, assertCandidateSelectionResultV001, runCandidateSelectionV001,
} from '../../runner/src/skills/candidate-selection-v001.js';
import {
  buildSelectionInputV001, buildSelectionRequestV001, resolveSelectionCandidatesV001,
  validateSelectionV001, promoteSelectionV001,
} from './candidate_selection_validation_v001.mts';
import {bind, formal, sha, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {decodeDigestTransportV001} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

const clone = <T,>(v: T): T => structuredClone(v);
function context() {
  const texts = ['種を植える。', '芽が出た。', '新芽を見つけた。', '発芽して嬉しい。', '葉が枯れた。', '水を補って回復した。'];
  const utterances = texts.map((text, i) => ({utteranceId: `utterance-${i}`, text, sourceSegmentIds: [i + 1],
    sourceStartMs: i * 1000, sourceEndMs: (i + 1) * 1000}));
  const source = {path: 'source.mp4', fileSha256: 'a'.repeat(64)};
  const transcript = {path: 'transcript.json', fileSha256: 'b'.repeat(64)};
  const ub = bind('utterances.json', {schemaVersion: 'utterances', utterances});
  const candidateSet = {schemaVersion: 'candidate-selection-candidate-set-v001', sourceId: 'garden',
    sourceVideoBinding: source, transcriptBinding: transcript, utteranceBinding: ub,
    origins: {discoveryResult: {}, formalIdentityCatalog: {}},
    candidates: ['seed', 'sprout', 'recovery'].map((candidateId, i) => ({candidateId, sourceId: 'garden', title: candidateId,
      contextStartUtteranceId: `utterance-${i * 2}`, contextEndUtteranceId: `utterance-${i * 2 + 1}`,
      evidenceUtteranceIds: [`utterance-${i * 2 + 1}`]}))};
  const plan = {schemaVersion: 'test-plan', planId: 'test', outputRoot: 'test-output', authorization: {},
    request: {sourceId: 'garden', purpose: '植物の変化が伝わる動画', sourceVideo: source, transcript, utterances: ub,
      candidateSet: bind('set.json', candidateSet)}, structureConditions: ['前提と変化が理解できること']};
  return {plan, planBinding: bind('plan.json', plan), candidateSet, utterances: {utterances},
    transcript: {segments: texts.map((text, i) => ({id: i + 1, text, startMs: i * 1000, endMs: (i + 1) * 1000}))}};
}
function rebind(c: Json) {
  c.plan.request.candidateSet = bind('set.json', c.candidateSet);
  c.planBinding = bind('plan.json', c.plan);
}
function answer(c: Json, choices = ['adopt', 'reject', 'adopt']): Json {
  const input = buildSelectionInputV001(c);
  return {status: 'complete', decisions: input.candidates.map((p, i) => ({candidateId: p.candidateId, sourceId: p.sourceId,
    decision: choices[i], basis: choices[i] === 'adopt' ? 'distinct-highlight' : 'weak',
    reason: '発芽の説明と回復という出来事を比較した判断。', evidenceUtteranceIds: [p.utterances[0].utteranceId],
    comparisons: [{candidateId: input.candidates[i === 0 ? 1 : 0].candidateId,
      evidenceUtteranceIds: [input.candidates[i === 0 ? 1 : 0].utterances[0].utteranceId]}]}))};
}
function envelope(c: Json, a = answer(c)) {
  const request = buildSelectionRequestV001(c);
  const result = {schemaVersion: 'candidate-selection-result-v001', skillId: 'candidate-selection', skillVersion: 'v001', answer: a};
  const response = {schemaVersion: 'candidate-selection-response-v001', requestFileSha256: sha(formal(request)),
    answer: clone(a), judgmentNote: 'validator test only; semantic quality is not asserted'};
  return {request, response, result};
}
function validate(c: Json, e = envelope(c)) {return validateSelectionV001(c, e.request, e.response, e.result);}
function mutateAnswer(change: (a: Json) => void, pattern: RegExp) {
  const c = context(), a = answer(c); change(a);
  assert.throws(() => validate(c, envelope(c, a)), pattern);
}

test('all decisions are preserved and adoption carries SHA-bound evidence; promotion needs its actual token', () => {
  const c = context(), e = envelope(c), token = validate(c, e);
  c.candidateSet.candidates[0].title = 'changed'; e.result.answer.decisions[0].decision = 'reject';
  const promoted = promoteSelectionV001(token);
  assert.deepEqual(promoted.adoption.adoptedCandidates.map((p: Json) => p.candidateId), ['seed', 'recovery']);
  assert.deepEqual(promoted.adoption.rejectedCandidates.map((p: Json) => p.candidateId), ['sprout']);
  assert.equal(promoted.adoption.validatorResultBinding.fileSha256, sha(formal(promoted.validation)));
  assert.equal(promoted.adoption.historicalHumanQualityInherited, false);
  assert.throws(() => promoteSelectionV001(clone(token)), /VALIDATED_SELECTION_REQUIRED/);
  assert.throws(() => promoteSelectionV001(e.result), /VALIDATED_SELECTION_REQUIRED/);
});
test('zero, one and all candidates can be selected; no quota or forced rejection', () => {
  for (const choices of [['reject', 'reject', 'reject'], ['adopt', 'reject', 'reject'], ['adopt', 'adopt', 'adopt']]) {
    const c = context(), promoted = promoteSelectionV001(validate(c, envelope(c, answer(c, choices))));
    assert.equal(promoted.adoption.adoptedCandidates.length, choices.filter(x => x === 'adopt').length);
  }
});
test('closed input rejects human adoption, final-use flags, timing and scores', () => {
  for (const [key, value] of Object.entries({humanAdopted: true, previouslyRejected: false, usedInFinalVideo: true, durationMs: 3000, score: 1})) {
    const input: Json = buildSelectionInputV001(context()); input.candidates[0][key] = value;
    assert.throws(() => assertCandidateSelectionInputV001(input), /SELECTION_INPUT_INVALID/);
  }
  const input: Json = buildSelectionInputV001(context()); input.candidates[0].utterances[0].startMs = 0;
  assert.throws(() => assertCandidateSelectionInputV001(input), /SELECTION_INPUT_INVALID/);
});
test('skill runs its supplied judgment anew and does not mutate input or promote the result', async () => {
  const c = context(), input = buildSelectionInputV001(c), original = clone(input); let calls = 0;
  const result = await runCandidateSelectionV001(input, async v => {calls++; v.candidates[0].title = 'changed'; return answer(c);});
  assert.equal(calls, 1); assert.deepEqual(input, original); assertCandidateSelectionResultV001(result);
  assert.throws(() => promoteSelectionV001(result), /VALIDATED_SELECTION_REQUIRED/);
});
test('unknown candidate rejected', () => mutateAnswer(a => {a.decisions[0].candidateId = 'unknown';}, /COVERAGE_MEMBERSHIP/));
test('missing candidate rejected', () => mutateAnswer(a => {a.decisions.pop();}, /COVERAGE_MEMBERSHIP/));
test('duplicate candidate rejected', () => mutateAnswer(a => {a.decisions[1].candidateId = a.decisions[0].candidateId;}, /COVERAGE_MEMBERSHIP/));
test('candidate order change rejected', () => mutateAnswer(a => {a.decisions.reverse();}, /COVERAGE_MEMBERSHIP/));
test('wrong source rejected', () => mutateAnswer(a => {a.decisions[0].sourceId = 'other';}, /SOURCE_MEMBERSHIP/));
test('evidence from another candidate rejected', () => mutateAnswer(a => {a.decisions[0].evidenceUtteranceIds = ['utterance-4'];}, /EVIDENCE_OUTSIDE/));
test('reversed own evidence rejected', () => mutateAnswer(a => {a.decisions[0].evidenceUtteranceIds = ['utterance-1', 'utterance-0'];}, /EVIDENCE_DUPLICATE_OR_ORDER/));
test('duplicate own evidence rejected', () => mutateAnswer(a => {a.decisions[0].evidenceUtteranceIds.push('utterance-0');}, /SELECTION_ANSWER_INVALID/));
test('unknown comparison rejected', () => mutateAnswer(a => {a.decisions[0].comparisons[0].candidateId = 'unknown';}, /COMPARISON_MEMBERSHIP/));
test('comparison with self rejected', () => mutateAnswer(a => {a.decisions[0].comparisons[0].candidateId = 'seed';}, /COMPARISON_MEMBERSHIP/));
test('comparison evidence must belong to its named candidate', () => mutateAnswer(a => {a.decisions[0].comparisons[0].evidenceUtteranceIds = ['utterance-4'];}, /EVIDENCE_OUTSIDE/));
test('comparison is required and must be unique', () => {
  mutateAnswer(a => {a.decisions[0].comparisons = [];}, /COMPARISON_REQUIRED/);
  mutateAnswer(a => {a.decisions[0].comparisons.push(a.decisions[0].comparisons[0]);}, /COMPARISON_DUPLICATE_OR_ORDER/);
});
test('duplicate rejection requires a retained comparison; cannot remove every copy as redundant', () => {
  const c = context(), a = answer(c, ['reject', 'reject', 'reject']); a.decisions[0].basis = 'redundant';
  assert.throws(() => validate(c, envelope(c, a)), /ADOPTED_COMPARISON_REQUIRED/);
});
test('candidate bounds, order and source transcript membership are deterministic', () => {
  const changes = [
    (c: Json) => {c.candidateSet.candidates[0].contextEndUtteranceId = 'unknown';},
    (c: Json) => {c.candidateSet.candidates[0].contextStartUtteranceId = 'utterance-1'; c.candidateSet.candidates[0].contextEndUtteranceId = 'utterance-0';},
    (c: Json) => {c.candidateSet.candidates.reverse();},
    (c: Json) => {c.utterances.utterances[0].sourceSegmentIds = [999];},
    (c: Json) => {c.utterances.utterances[0].sourceStartMs = 10;},
  ];
  for (const change of changes) {const c = context(); change(c); rebind(c); assert.throws(() => resolveSelectionCandidatesV001(c));}
});
test('overlapping candidates may be compared but cannot both pass the disjoint executor', () => {
  const c = context(); c.candidateSet.candidates[1].contextStartUtteranceId = 'utterance-1'; rebind(c);
  assert.doesNotThrow(() => validate(c));
  assert.throws(() => validate(c, envelope(c, answer(c, ['adopt', 'adopt', 'adopt']))), /ADOPTED_CANDIDATES_OVERLAP/);
});
test('SHA changes to request, answer, candidate set or plan reject the result', () => {
  for (const mutate of [
    (c: Json, e: Json) => {e.response.requestFileSha256 = '0'.repeat(64);},
    (c: Json, e: Json) => {e.result.answer.decisions[0].reason = 'changed';},
    (c: Json, e: Json) => {c.candidateSet.candidates[0].title = 'changed';},
    (c: Json, e: Json) => {c.plan.request.purpose = 'changed';},
    (c: Json, e: Json) => {e.request.input.candidates[0].utterances[0].text = 'changed';},
  ]) {const c = context(), e = envelope(c); mutate(c, e); assert.throws(() => validate(c, e), /BINDING_CHANGED|PROVENANCE_INVALID/);}
});
test('renamed IDs and unrelated fixture text do not change validation or promotion rules', () => {
  const c = context(); c.candidateSet.candidates.forEach((p, i) => {p.candidateId = ['Z9', 'Q3', 'A1'][i]; p.title = '別の制作物';});
  rebind(c);
  const p = promoteSelectionV001(validate(c));
  assert.deepEqual(p.adoption.adoptedCandidates.map((x: Json) => x.candidateId), ['Z9', 'A1']);
});
test('abstention has no adoption authority; free times and executable fields are invalid output', () => {
  const c = context(); assert.throws(() => validate(c, envelope(c, {status: 'abstained', reason: '判断不能'})), /SELECTION_ABSTAINED/);
  mutateAnswer(a => {a.decisions[0].startMs = 100;}, /SELECTION_ANSWER_INVALID/);
  mutateAnswer(a => {a.decisions[0].decision = 'execute';}, /SELECTION_ANSWER_INVALID/);
});
test('transport rejects duplicate JSON keys', () => {
  assert.throws(() => decodeDigestTransportV001('{"answer":1,"answer":2}'), /JUDGMENT_ENVELOPE_INVALID/);
});
