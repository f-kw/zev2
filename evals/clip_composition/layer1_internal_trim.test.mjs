import assert from 'node:assert/strict';
import test from 'node:test';
import { createLayer1TrimPlan } from './layer1_internal_trim.mjs';
import { renderLayer1PairReviewHtml } from './build_layer1_pair_review.mjs';

const outerRange = { sourceVideoId: 'source', startMs: 0, endMs: 3000 };

test('同じ発話・同じ話者の400ms以上の停止だけを切る', () => {
  const input = {
    outerRange,
    words: [
      { id: '1', text: '前', startMs: 100, endMs: 1000, speaker: 'S1', utteranceId: 'u1' },
      { id: '2', text: '後', startMs: 2000, endMs: 2400, speaker: 'S1', utteranceId: 'u1' }
    ]
  };
  const result = createLayer1TrimPlan(input);
  assert.deepEqual(result.cutDirectives.map(({ startMs, endMs, kinds }) => ({ startMs, endMs, kinds })), [
    { startMs: 1120, endMs: 1880, kinds: ['speech_absence'] }
  ]);
  assert.deepEqual(result.remainingSourceRanges, [
    { sourceVideoId: 'source', startMs: 0, endMs: 1120 },
    { sourceVideoId: 'source', startMs: 1880, endMs: 3000 }
  ]);
  assert.deepEqual(createLayer1TrimPlan(input), result);
});

test('発話まとまりをまたぐ間は長くても保護する', () => {
  const result = createLayer1TrimPlan({
    outerRange,
    words: [
      { id: '1', text: '問い', startMs: 100, endMs: 1000, speaker: 'S1', utteranceId: 'u1' },
      { id: '2', text: '答え', startMs: 2200, endMs: 2500, speaker: 'S1', utteranceId: 'u2' }
    ]
  });
  assert.equal(result.cutDirectives.length, 0);
  assert.equal(result.protectedCandidates[0].protectionReason, 'utterance_boundary');
});

test('話者不明の間は切らない', () => {
  const result = createLayer1TrimPlan({
    outerRange,
    words: [
      { id: '1', text: '前', startMs: 100, endMs: 1000, speaker: 'unknown', utteranceId: 'u1' },
      { id: '2', text: '後', startMs: 1800, endMs: 2200, speaker: 'unknown', utteranceId: 'u1' }
    ]
  });
  assert.equal(result.cutDirectives.length, 0);
  assert.equal(result.protectedCandidates[0].protectionReason, 'speaker_unknown');
});

test('独立トークンとして得られた安全なフィラーだけを削除候補にする', () => {
  const result = createLayer1TrimPlan({
    outerRange,
    words: [
      { id: '1', text: '前', startMs: 100, endMs: 500, speaker: 'S1', utteranceId: 'u1' },
      { id: '2', text: 'えっと', startMs: 800, endMs: 1200, speaker: 'S1', utteranceId: 'u1' },
      { id: '3', text: '後', startMs: 1500, endMs: 1900, speaker: 'S1', utteranceId: 'u1' }
    ]
  });
  assert.deepEqual(result.cutDirectives[0].removedWordIds, ['2']);
  assert.deepEqual(result.remainingWordIds, ['1', '3']);
  assert.equal(result.cutDirectives[0].kinds.includes('filler'), true);
});

test('順序不正と重複IDを拒否する', () => {
  assert.throws(() => createLayer1TrimPlan({
    outerRange,
    words: [
      { id: '1', text: '前', startMs: 100, endMs: 500, speaker: 'S1', utteranceId: 'u1' },
      { id: '1', text: '後', startMs: 900, endMs: 1200, speaker: 'S1', utteranceId: 'u1' }
    ]
  }), /重複/);
});

test('ペア比較に繋ぎ目の任意メモ欄を含める', () => {
  const html = renderLayer1PairReviewHtml([{
    fixtureId: 'fixture',
    expectedIndex: 1,
    beforePath: 'before.mp4',
    afterPath: 'after.mp4',
    seams: [{ number: 1, startMs: 1000, endMs: 2000, beforeText: '前', afterText: '後' }]
  }]);
  assert.match(html, /繋ぎ目に違和感のある箇所があれば番号をメモ（任意）/);
  assert.match(html, /#1/);
  assert.match(html, /サーバーへ自動保存しません/);
});
