import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRESENTATION_A_V002_REVIEW_INPUT_SCHEMA_V001,
  buildPresentationAV002ReviewHtmlV001,
  validatePresentationAV002ReviewInputV001,
} from './presentation_a_v002_review_ui_v001.mjs';
import {
  PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
} from './presentation_a_v002_vertical_caption_diagnostic_v001.mjs';

const hex = character => character.repeat(64);
const media = (label, stem, digit) => ({
  label,
  mediaBinding: {
    path: `evals/clip_composition/outputs/presentation/a-v002/${stem}.mp4`,
    fileSha256: hex(digit),
  },
  durationMs: 25000,
  frameCount: 750,
  qcBinding: {
    path: `evals/clip_composition/outputs/presentation/a-v002/${stem}-qc.json`,
    fileSha256: hex(digit === 'a' ? 'b' : digit),
  },
  qcStatus: 'passed',
});

const item = (ordinal, candidateId, cut, atom, spans) => ({
  proofItemId: `proof-item-${String(ordinal).padStart(3, '0')}`,
  candidateId,
  approvedCut: {sourceStartMs: cut[0], sourceEndMs: cut[1]},
  crossedAtom: {text: atom[0], sourceStartMs: atom[1], sourceEndMs: atom[2]},
  retainedSpans: spans.map(([sourceStartMs, sourceEndMs]) => ({sourceStartMs, sourceEndMs})),
  horizontal: media('横型・正式style', `item-${ordinal}-horizontal`, String(ordinal)),
  verticalDiagnostic: media('縦型・字幕跨ぎ診断', `item-${ordinal}-vertical`, 'a'),
});

const reviewInput = () => ({
  schemaVersion: PRESENTATION_A_V002_REVIEW_INPUT_SCHEMA_V001,
  reviewId: 'presentation-a-v002-layer1-v3-review-v001',
  createdAt: '2026-08-09T12:00:00.000Z',
  verticalDiagnosticGuarantee:
    PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
  items: [
    item(1, 'nE_bNeBNp4E_multiblock_material_v001:2:voice-013',
      [4084435, 4086915], ['ぁ', 4083972, 4087055],
      [[4083972, 4084435], [4086915, 4087055]]),
    item(2, 'nE_bNeBNp4E_multiblock_material_v001:5:voice-067',
      [4455270, 4457090], ['が', 4453870, 4457212],
      [[4453870, 4455270], [4457090, 4457212]]),
    item(3, 'nE_bNeBNp4E_multiblock_material_v001:5:voice-190',
      [4611230, 4613470], ['ク', 4610824, 4616745],
      [[4610824, 4611230], [4613470, 4616745]]),
  ],
});

test('ARU001: 三候補それぞれの横型・縦型をexact 6 mediaとして受理する', () => {
  const input = reviewInput();
  assert.equal(validatePresentationAV002ReviewInputV001(input), true);
  assert.equal(input.items.flatMap(entry => [entry.horizontal, entry.verticalDiagnostic]).length, 6);
});

test('ARU002: 確認HTMLは三つの対と六つのvideoを一画面へ出す', () => {
  const html = buildPresentationAV002ReviewHtmlV001(reviewInput()).toString('utf8');
  assert.equal((html.match(/class="proof-item"/gu) ?? []).length, 3);
  assert.equal((html.match(/<video /gu) ?? []).length, 6);
  for (const candidateId of reviewInput().items.map(entry => entry.candidateId)) {
    const escaped = candidateId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    assert.match(html, new RegExp(escaped, 'u'));
  }
  assert.match(html, /\[4083972, 4084435\)/u);
  assert.match(html, /\[4086915, 4087055\)/u);
  assert.doesNotMatch(html, /\[4083972, 4086915\)/u);
});

test('ARU003: 縦型を正式preset品質でなく字幕跨ぎ診断と明示する', () => {
  const html = buildPresentationAV002ReviewHtmlV001(reviewInput()).toString('utf8');
  assert.match(html, /縦型・字幕跨ぎ診断/u);
  assert.match(html, /正式preset、crop品質、公開品質を主張しない/u);
  assert.match(html, /diagnostic-full-frame-contain-v001/u);
});

test('ARU004: 候補・対・fieldの欠落または余分を拒否する', () => {
  const missing = reviewInput();
  missing.items.pop();
  assert.equal(validatePresentationAV002ReviewInputV001(missing), false);
  const extra = reviewInput();
  extra.items[0].verticalDiagnostic.uncontracted = true;
  assert.equal(validatePresentationAV002ReviewInputV001(extra), false);
});
