import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {
  assertCaptionDisplayInputV001, assertCaptionDisplayAnswerV001, assertCaptionDisplayResultV001,
  runCaptionDisplayBoundariesV001,
} from '../src/skills/caption-display-boundaries-v001.js';

const root = 'evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/'
  + 'candidate-doctor-disappearance-to-ogre-mother-v001/';
const input = JSON.parse(await readFile(root + 'source-package-v001.json', 'utf8')).promptInput;
// 保存回答はこの単体配線検査にだけ使用。新しい判断の実証には使わない。
const answer = {status: 'complete', ...JSON.parse(await readFile(root + 'cue-selection-v001.json', 'utf8')).response};

test('既存の本文だけの入力と境界だけの回答を受理する', () => {
  assert.doesNotThrow(() => assertCaptionDisplayInputV001(input));
  assert.doesNotThrow(() => assertCaptionDisplayAnswerV001(answer));
});

test('入力へ時刻・素材path・空文字・重複ID・欠けた配列を混入できない', () => {
  const cases = [
    (v: any) => {v.sourcePath = '/video.mp4';},
    (v: any) => {v.captions[0].startMs = 0;},
    (v: any) => {v.captions[0].boundaryCandidates[0].text = '';},
    (v: any) => {v.captions[0].boundaryCandidates[1].boundaryId = v.captions[0].boundaryCandidates[0].boundaryId;},
    (v: any) => {delete v.captions[0].boundaryCandidates[0];},
    (v: any) => {v.captions.push(structuredClone(v.captions[0]));},
    (v: any) => {v.styleLimits.maxLinesPerCue = 0;},
  ];
  for (const mutate of cases) {
    const value = structuredClone(input); mutate(value);
    assert.throws(() => assertCaptionDisplayInputV001(value), /INPUT_INVALID/);
  }
});

test('回答へ本文・frame・採用宣言・余分field・空cueを混入できない', () => {
  const cases = [
    (v: any) => {v.captions[0].text = '書き換え';},
    (v: any) => {v.captions[0].cues[0].startFrame = 0;},
    (v: any) => {v.adopted = true;},
    (v: any) => {v.captions[0].cues = [];},
    (v: any) => {v.captions[0].cues[0].lineEndBoundaryIds = [];},
  ];
  for (const mutate of cases) {
    const value = structuredClone(answer); mutate(value);
    assert.throws(() => assertCaptionDisplayAnswerV001(value), /OUTPUT_INVALID/);
  }
});

test('判断手段へ実際に一回渡し、呼出元の入力を変更させない', async () => {
  let called = 0;
  const before = structuredClone(input);
  const result = await runCaptionDisplayBoundariesV001(input, async payload => {
    called++;
    assert.deepEqual(payload, input);
    payload.captions[0].boundaryCandidates[0].text = '変更';
    return structuredClone(answer);
  });
  assert.equal(called, 1);
  assert.deepEqual(input, before);
  assertCaptionDisplayResultV001(result);
  assert.equal(result.schemaVersion, 'caption-display-skill-result-v001');
  assert.deepEqual(Object.keys(result), ['schemaVersion', 'skillId', 'skillVersion', 'answer']);
  assert.deepEqual(result.answer, answer);
});

test('辞退と例外を採用値に救済しない', async () => {
  const abstained = await runCaptionDisplayBoundariesV001(input, async () => ({status: 'abstained', reason: '判断材料不足'}));
  assertCaptionDisplayResultV001(abstained);
  await assert.rejects(runCaptionDisplayBoundariesV001(input, async () => {throw new Error('judge failed');}), /judge failed/);
});

test('同じ入力と同じ判断回答から同じ権限なしresultを返す', async () => {
  const judge = async () => structuredClone(answer);
  assert.deepEqual(await runCaptionDisplayBoundariesV001(input, judge), await runCaptionDisplayBoundariesV001(input, judge));
});
