import assert from 'node:assert/strict';
import test from 'node:test';
import { createLayer1TrimPlanV002 } from './layer1_internal_trim_v002.mjs';

const words = [
  { id: '1', text: '前', startMs: 0, endMs: 500, speaker: 'A', utteranceId: 'u1' },
  { id: '2', text: '後', startMs: 1100, endMs: 1500, speaker: 'A', utteranceId: 'u1' }
];

function evidence(runs) {
  return { voice: { method: 'WebRTC VAD 2.0.14', consensusRuns: runs }, volume: { observed400ms: false } };
}

test('音響と単語時刻の二重根拠が揃った区間だけを前後120ms保護して切る', () => {
  const plan = createLayer1TrimPlanV002({
    outerRange: { sourceVideoId: 'source', startMs: 0, endMs: 2000 },
    words,
    acousticEvidence: evidence([{ startMs: 500, endMs: 1100, durationMs: 600 }])
  });
  assert.deepEqual(plan.cutDirectives.map(({ startMs, endMs, kinds }) => ({ startMs, endMs, kinds })), [
    { startMs: 620, endMs: 980, kinds: ['voice_absence'] }
  ]);
});

test('音響根拠のない単語間ギャップは切らない', () => {
  const plan = createLayer1TrimPlanV002({
    outerRange: { startMs: 0, endMs: 2000 },
    words,
    acousticEvidence: evidence([])
  });
  assert.equal(plan.cutDirectives.length, 0);
});

test('単独の安全フィラー削除契約は継承する', () => {
  const plan = createLayer1TrimPlanV002({
    outerRange: { startMs: 0, endMs: 1400 },
    words: [
      { id: '1', text: '前', startMs: 0, endMs: 500, speaker: 'A', utteranceId: 'u1' },
      { id: '2', text: 'えっと', startMs: 650, endMs: 750, speaker: 'A', utteranceId: 'u1' },
      { id: '3', text: '後', startMs: 900, endMs: 1300, speaker: 'A', utteranceId: 'u1' }
    ],
    acousticEvidence: evidence([])
  });
  assert.deepEqual(plan.cutDirectives.map(({ startMs, endMs, kinds, removedWordIds }) => ({ startMs, endMs, kinds, removedWordIds })), [
    { startMs: 620, endMs: 780, kinds: ['filler'], removedWordIds: ['2'] }
  ]);
});

test('音響区間へ文字時刻が重なる場合は切らない', () => {
  const plan = createLayer1TrimPlanV002({
    outerRange: { startMs: 0, endMs: 2000 },
    words: [{ ...words[0], endMs: 800 }, words[1]],
    acousticEvidence: evidence([{ startMs: 500, endMs: 1100, durationMs: 600 }])
  });
  assert.equal(plan.cutDirectives.length, 0);
  assert.ok(plan.protectedCandidates.some((item) => item.protectionReason === 'word_timestamp_overlaps_acoustic_gap'));
});

test('発話まとまり境界の声なしは保護する', () => {
  const plan = createLayer1TrimPlanV002({
    outerRange: { startMs: 0, endMs: 2000 },
    words: [words[0], { ...words[1], utteranceId: 'u2' }],
    acousticEvidence: evidence([{ startMs: 500, endMs: 1100, durationMs: 600 }])
  });
  assert.equal(plan.cutDirectives.length, 0);
  assert.ok(plan.protectedCandidates.some((item) => item.protectionReason === 'utterance_boundary'));
});

test('話者交代の声なしは保護する', () => {
  const plan = createLayer1TrimPlanV002({
    outerRange: { startMs: 0, endMs: 2000 },
    words: [words[0], { ...words[1], speaker: 'B' }],
    acousticEvidence: evidence([{ startMs: 500, endMs: 1100, durationMs: 600 }])
  });
  assert.equal(plan.cutDirectives.length, 0);
  assert.ok(plan.protectedCandidates.some((item) => item.protectionReason === 'speaker_change'));
});

test('同じ入力から同じ結果を返す', () => {
  const input = {
    outerRange: { startMs: 0, endMs: 2000 },
    words,
    acousticEvidence: evidence([{ startMs: 500, endMs: 1100, durationMs: 600 }])
  };
  assert.deepEqual(createLayer1TrimPlanV002(input), createLayer1TrimPlanV002(input));
});
