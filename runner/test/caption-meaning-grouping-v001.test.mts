import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCaptionMeaningGroupingInputV001, assertCaptionMeaningGroupingAnswerV001,
  assertCaptionMeaningGroupingResultV001, runCaptionMeaningGroupingV001,
  type CaptionMeaningGroupingInputV001,
} from '../src/skills/caption-meaning-grouping-v001.js';

// shapeと呼出境界のための小さな入力。実素材の新規判断の証拠には使用しない。
const input: CaptionMeaningGroupingInputV001 = {
  schemaVersion: 'caption-meaning-grouping-skill-input-v001',
  taskDescription: '確定本文の意味が一区切りつく終端IDを選ぶ。',
  containers: [{containerId: 'segment-0001', boundaryCandidates: [
    {boundaryCandidateId: 'boundary-000001', utteranceIds: ['utterance-1'], text: '雨が降った。'},
    {boundaryCandidateId: 'boundary-000002', utteranceIds: ['utterance-2'], text: '傘を開いた。'},
  ]}],
};
const answer = {status: 'complete', containers: [{containerId: 'segment-0001', meaningGroups: [
  {meaningGroupEndBoundaryCandidateId: 'boundary-000002'},
]}]};

test('意味の問いは既存IDと確定本文を入力し、回答は終端IDだけを返す', () => {
  assertCaptionMeaningGroupingInputV001(input);
  assertCaptionMeaningGroupingAnswerV001(answer);
});

test('空本文・重複ID・欠けた配列・表示規約・自由時刻を入力へ混ぜられない', () => {
  for (const change of [
    (v: any) => {v.containers[0].boundaryCandidates[0].text = '';},
    (v: any) => {v.containers[0].boundaryCandidates[1].boundaryCandidateId = 'boundary-000001';},
    (v: any) => {v.containers[0].boundaryCandidates[1].utteranceIds = ['utterance-1'];},
    (v: any) => {delete v.containers[0].boundaryCandidates[0];},
    (v: any) => {v.containers.push(structuredClone(v.containers[0]));},
    (v: any) => {v.styleLimits = {maxLines: 2};},
    (v: any) => {v.containers[0].boundaryCandidates[0].startMs = 0;},
  ]) {
    const altered = structuredClone(input); change(altered);
    assert.throws(() => assertCaptionMeaningGroupingInputV001(altered), /INPUT_INVALID/);
  }
});

test('本文生成・時刻生成・表示行末・正式採用宣言を回答へ混ぜられない', () => {
  for (const change of [
    (v: any) => {v.containers[0].meaningGroups[0].text = '生成本文';},
    (v: any) => {v.containers[0].meaningGroups[0].startMs = 0;},
    (v: any) => {v.containers[0].meaningGroups[0].startFrame = 1;},
    (v: any) => {v.containers[0].meaningGroups[0].lineEndBoundaryIds = ['boundary-000001'];},
    (v: any) => {v.adopted = true;},
    (v: any) => {v.containers[0].meaningGroups = [];},
  ]) {
    const altered = structuredClone(answer); change(altered);
    assert.throws(() => assertCaptionMeaningGroupingAnswerV001(altered), /OUTPUT_INVALID/);
  }
});

test('判断を実際に1回呼び出し、呼出元の入力と返却後の回答を隔離する', async () => {
  const before = structuredClone(input); const adopted = structuredClone(answer); let calls = 0;
  const result = await runCaptionMeaningGroupingV001(input, async received => {
    calls++; assert.deepEqual(received, input);
    received.containers[0].boundaryCandidates[0].text = '判断側の変更';
    return adopted;
  });
  assert.equal(calls, 1); assert.deepEqual(input, before);
  adopted.containers.length = 0;
  assert.deepEqual(result.answer, answer); assertCaptionMeaningGroupingResultV001(result);
  assert.deepEqual(Object.keys(result), ['schemaVersion', 'skillId', 'skillVersion', 'answer']);
});

test('辞退・不正回答・例外を正式値へ救済しない', async () => {
  const result = await runCaptionMeaningGroupingV001(input, async () => ({status: 'abstained'}));
  assertCaptionMeaningGroupingResultV001(result);
  const invalid = await runCaptionMeaningGroupingV001(input, async () => ({status: 'complete', text: '生成'}));
  assert.throws(() => assertCaptionMeaningGroupingResultV001(invalid), /OUTPUT_INVALID/);
  await assert.rejects(runCaptionMeaningGroupingV001(input, async () => {throw new Error('failed');}), /failed/);
});

test('同一入力・同一採用回答から同一の権限なし結果を返す', async () => {
  const judge = async () => structuredClone(answer);
  assert.deepEqual(await runCaptionMeaningGroupingV001(input, judge),
    await runCaptionMeaningGroupingV001(input, judge));
});
