import assert from 'node:assert/strict';
import test from 'node:test';
import {assertCandidateDiscoveryInputV001, assertCandidateDiscoveryAnswerV001,
  assertCandidateDiscoveryResultV001, runCandidateDiscoveryV001, type CandidateDiscoveryInputV001}
  from '../src/skills/candidate-discovery-v001.js';
const input: CandidateDiscoveryInputV001 = {schemaVersion: 'candidate-discovery-skill-input-v001',
  productionRequest: '見どころを探す', editorialCriteria: ['根拠を持つ具体的な話題'], sourceId: 'source-test',
  utterances: [{utteranceId: 'utterance-1', text: '鍵を発見した。'}, {utteranceId: 'utterance-2', text: '扉が開いた。'}]};
const answer = {status: 'complete', candidates: [{sourceId: 'source-test', title: '鍵で開いた扉',
  reason: '発見から解決までがある。', evidenceUtteranceIds: ['utterance-1', 'utterance-2'],
  contextStartUtteranceId: 'utterance-1', contextEndUtteranceId: 'utterance-2'}]};
test('Skillは確定本文と既存IDの提案だけを入出力する', async () => {
  assertCandidateDiscoveryInputV001(input);
  assertCandidateDiscoveryAnswerV001(answer);
  let calls = 0;
  const result = await runCandidateDiscoveryV001(input, async received => {
    calls++; assert.deepEqual(received, input); received.utterances[0].text = '書換え'; return answer;
  });
  assert.equal(calls, 1); assert.equal(input.utterances[0].text, '鍵を発見した。');
  assertCandidateDiscoveryResultV001(result);
  assert.deepEqual(Object.keys(result), ['schemaVersion', 'skillId', 'skillVersion', 'answer']);
  (result.answer as any).candidates[0].title = 'コピー側'; assert.equal(answer.candidates[0].title, '鍵で開いた扉');
});
test('Skill入力に時刻・過去候補・描画・採用権限を混ぜられない', () => {
  for (const change of [
    (v: any) => {v.utterances[0].startMs = 1;}, (v: any) => {v.candidates = answer.candidates;},
    (v: any) => {v.renderer = {};}, (v: any) => {v.adoption = 'approved';},
    (v: any) => {v.utterances[1].utteranceId = 'utterance-1';},
    (v: any) => {delete v.utterances[0];}, (v: any) => {v.utterances[0].text = '';},
  ]) {const v = structuredClone(input); change(v); assert.throws(() => assertCandidateDiscoveryInputV001(v));}
});
test('Skill回答へ正式時刻・順序・尺・採用・字幕・renderer値を生成できない', () => {
  for (const [k, value] of Object.entries({startMs: 100, order: 1, durationMs: 200,
    adopted: true, caption: '生成', renderer: {}, candidateId: 'invented-id', confidence: 0.9})) {
    const v: any = structuredClone(answer); v.candidates[0][k] = value;
    assert.throws(() => assertCandidateDiscoveryAnswerV001(v), /OUTPUT_INVALID/);
  }
});
test('該当なしを返せるが、Skill自身は採用や成功へ変換しない', async () => {
  const result = await runCandidateDiscoveryV001(input, async () => ({status: 'abstained'}));
  assertCandidateDiscoveryResultV001(result); assert.deepEqual(result.answer, {status: 'abstained'});
  assert.throws(() => assertCandidateDiscoveryAnswerV001({status: 'complete', candidates: []}));
});
