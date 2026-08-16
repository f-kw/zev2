import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test, {before} from 'node:test';

import * as reviewModule from './presentation_zevo_caption_quality_v002_review_ui_v001.mjs';
import {admitPresentationZevoCaptionQualityV002FixtureV001} from './run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs';
import {
  deriveApprovedCaptionQualityProofIdsV015,
  ownerForApprovedCaptionQualityProofIdV001,
} from './presentation_output_caption_cue_source_package_v001.test.mjs';

const ROOT = process.cwd();
const RECEIPT_ENV = 'ZEV_ZEVO_CAPTION_QUALITY_FIXTURE_RECEIPT_PATH';
const RECEIPT_PATH = process.env[RECEIPT_ENV];
if (typeof RECEIPT_PATH !== 'string') throw new TypeError('fixture receipt environment is required');
const FIXED_NODE = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
const DOCUMENT_ROOT = 'evals/clip_composition/reports/presentation';
const PARENT = 'presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md';
const DOCS = Object.freeze([
  PARENT,
  'presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260810-v001.md',
  'presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md',
  'presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md',
  'presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md',
  'presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md',
  'presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md',
  'presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md',
  'presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md',
  'presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md',
  'presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md',
  'presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md',
  'presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md',
  'presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md',
  'presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md',
  'presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md',
]);
const SHA = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

const CASES = Object.freeze([
  ['voice-013', 'input-caption-000001', 'nE_bNeBNp4E_multiblock_material_v001:2:voice-013'],
  ['voice-067', 'input-caption-000002', 'nE_bNeBNp4E_multiblock_material_v001:5:voice-067'],
  ['voice-190', 'input-caption-000003', 'nE_bNeBNp4E_multiblock_material_v001:5:voice-190'],
]);
const OLD_RENDER_PLAN_KEYS = Object.freeze([
  'schemaVersion', 'planId', 'outputRequestBinding', 'meaningPackageBinding',
  'baseMediaBinding', 'resolvedStyle', 'captionDisplays', 'titleDisplay',
  'meaningProjection',
]);
const OCCURRENCES = Object.freeze({
  'voice-013': [{issueId: 'old-break-004', splitText: 'マリ/ン', occurrences: [
    {caseId: 'voice-013', format: 'vertical-caption-diagnostic', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000020'},
    {caseId: 'voice-013', format: 'vertical-caption-diagnostic', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000032'},
  ]}],
  'voice-067': [{issueId: 'old-break-001', splitText: 'ス/イちゃん', occurrences: [
    {caseId: 'voice-067', format: 'horizontal', boundaryKind: 'page-end', afterAtomOccurrenceId: 'atom-occurrence-000042'},
  ]}],
  'voice-190': [
    {issueId: 'old-break-002', splitText: 'じ/ゃ報告', occurrences: [
      {caseId: 'voice-190', format: 'horizontal', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000032'},
      {caseId: 'voice-190', format: 'vertical-caption-diagnostic', boundaryKind: 'page-end', afterAtomOccurrenceId: 'atom-occurrence-000032'},
    ]},
    {issueId: 'old-break-003', splitText: '言ってほし/いみたいな', occurrences: [
      {caseId: 'voice-190', format: 'vertical-caption-diagnostic', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000015'},
    ]},
    {issueId: 'old-break-005', splitText: 'サク/サク', occurrences: [
      {caseId: 'voice-190', format: 'vertical-caption-diagnostic', boundaryKind: 'line-end', afterAtomOccurrenceId: 'atom-occurrence-000062'},
    ]},
  ],
});
const QUESTIONS = Object.freeze([
  {questionId: 'prior-caption-residue', prompt: '前の発話の文字が次の発話まで残っていないか。'},
  {questionId: 'short-cue-line-break', prompt: '一行に収まる短い発話が改行されていないか。'},
  {questionId: 'long-cue-line-break', prompt: '長い発話だけが必要な位置で自然に二行へ分かれているか。'},
  {questionId: 'text-closure', prompt: '全文を通して文字の欠落・重複・逆順がないか。'},
  {questionId: 'short-cue-fade', prompt: '最短cueで既存4frame fadeにより読めない・不自然に瞬く見え方がないか。'},
]);

let proofByOwner;
let expectedExports;
const diagnosticsFor = (t, owner) => proofByOwner[owner].forEach(
  id => t.diagnostic(`proof-item:${id}:passed`),
);
let admittedReviewInput;
let admittedReviewInputBinding;
let admittedOldRenderPlanBindings;
const reviewInput = () => structuredClone(admittedReviewInput);

before(async () => {
  assert.deepEqual(Object.keys(process.env).filter(key => key === RECEIPT_ENV), [RECEIPT_ENV]);
  const admission = await admitPresentationZevoCaptionQualityV002FixtureV001({
    receiptPath: RECEIPT_PATH,
    expectedGateId: 'U',
  });
  assert.equal(admission.status, 'passed', admission.reason);
  const binding = admission.package.reviewFixture.reviewInputBinding;
  admittedReviewInput = structuredClone(admission.artifactValues[binding.path]);
  admittedReviewInputBinding = structuredClone(binding);
  admittedOldRenderPlanBindings = structuredClone(
    admission.package.reviewFixture.oldRenderPlanBindings,
  );
  assert.equal(admission.package.reviewFixture.videoBindings.length, 3);
  assert.equal(admission.package.reviewFixture.qcBindings.length, 3);
  assert.equal(admission.package.reviewFixture.oldRenderPlanBindings.length, 6);
  const documents = await Promise.all(DOCS.map(name => readFile(path.join(ROOT, DOCUMENT_ROOT, name), 'utf8')));
  const proofIds = deriveApprovedCaptionQualityProofIdsV015({
    parent: documents[0], v1: documents[1], v2: documents[2], v3: documents[3],
    v4: documents[4], v5: documents[5], v6: documents[6], v7: documents[7], v8: documents[8], v9: documents[9], v10: documents[10], v11: documents[11], v12: documents[12], v13: documents[13], v14: documents[14], v15: documents[15],
  });
  assert.equal(proofIds.length, 489);
  proofByOwner = Object.fromEntries(['ZCQ045', 'ZCQ046'].map(owner => [
    owner, proofIds.filter(id => ownerForApprovedCaptionQualityProofIdV001(id) === owner),
  ]));
  assert.deepEqual(Object.fromEntries(Object.entries(proofByOwner).map(([owner, ids]) => [owner, ids.length])), {
    ZCQ045: 9, ZCQ046: 7,
  });
  expectedExports = documents[0].split('\n')
    .filter(line => line.startsWith('| #13 review |'))
    .flatMap(line => [...line.matchAll(/`([A-Za-z][A-Za-z0-9]*)\(/gu)].map(match => match[1]))
    .sort();
  assert.deepEqual(expectedExports, [
    'buildPresentationZevoCaptionQualityV002ReviewHtmlV001',
    'decodePresentationZevoCaptionQualityV002ReviewInputV001',
    'validatePresentationZevoCaptionQualityV002ReviewInputV001',
  ]);
  for (const bindingRow of admittedOldRenderPlanBindings) {
    const bytes = await readFile(path.join(ROOT, bindingRow.path));
    const plan = JSON.parse(bytes);
    assert.deepEqual(Object.keys(plan), OLD_RENDER_PLAN_KEYS, `${bindingRow.path}:schema`);
    assert.equal(SHA(bytes), bindingRow.fileSha256, `${bindingRow.path}:fileSha256`);
    assert.equal(
      SHA(Buffer.from(JSON.stringify(canonicalize(plan)), 'utf8')),
      bindingRow.canonicalSha256,
      `${bindingRow.path}:canonicalSha256`,
    );
  }
});

test('ZCQ045: 確認画面は横型3本と固定5問を一つの非循環入力から構築する', t => {
  assert.deepEqual(Object.keys(reviewModule).sort(), expectedExports);
  const modulePath = path.join(ROOT, 'evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.mjs');
  const script = `const module = await import(${JSON.stringify(modulePath)}); process.stdout.write(JSON.stringify(Object.keys(module).sort()) + '\\n');`;
  const importResult = spawnSync(FIXED_NODE, [
    '--no-warnings', '--experimental-permission', `--allow-fs-read=${modulePath}`,
    '--input-type=module', '--eval', script,
  ], {cwd: ROOT, encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_OPTIONS'))});
  assert.equal(importResult.status, 0);
  assert.equal(importResult.stderr, '');
  assert.equal(importResult.stdout, `${JSON.stringify(expectedExports)}\n`);
  const input = reviewInput();
  assert.equal(reviewModule.validatePresentationZevoCaptionQualityV002ReviewInputV001(input).status, 'passed');
  const decoded = reviewModule.decodePresentationZevoCaptionQualityV002ReviewInputV001(formalBytes(input));
  assert.equal(decoded.status, 'decoded');
  const built = reviewModule.buildPresentationZevoCaptionQualityV002ReviewHtmlV001(input);
  assert.equal(built.status, 'passed');
  const html = built.bytes.toString('utf8');
  assert.equal((html.match(/<video /gu) ?? []).length, 3);
  assert.equal((html.match(/data-question-id=/gu) ?? []).length, 5);
  for (const [caseId, , candidateId] of CASES) {
    assert.match(html, new RegExp(`data-case-id="${caseId}"`, 'u'));
    assert.ok(html.includes(candidateId));
  }
  for (const question of QUESTIONS) assert.ok(html.includes(question.prompt));
  assert.ok(!Object.hasOwn(input, 'completionReportBinding'));
  const expectRejected = (candidate, expectedPath) => {
    const result = reviewModule.validatePresentationZevoCaptionQualityV002ReviewInputV001(candidate);
    assert.equal(result.status, 'rejected');
    assert.deepEqual(result.violations.map(item => [item.code, item.path]), [
      ['CUE_REVIEW_INPUT_INVALID', expectedPath],
    ]);
  };
  const missing = structuredClone(input);
  delete missing.reviewId;
  expectRejected(missing, '/');
  const extra = structuredClone(input);
  extra.extra = true;
  expectRejected(extra, '/');
  expectRejected(Object.fromEntries(Object.entries(input).reverse()), '/');
  const wrongSchema = structuredClone(input);
  wrongSchema.schemaVersion = 'wrong';
  expectRejected(wrongSchema, '/schemaVersion');
  const wrongId = structuredClone(input);
  wrongId.reviewId = '';
  expectRejected(wrongId, '/reviewId');
  const wrongFade = structuredClone(input);
  wrongFade.observedFadeFrameCount = 0;
  expectRejected(wrongFade, '/observedFadeFrameCount');
  const wrongBinding = structuredClone(input);
  wrongBinding.proofJobBinding.fileSha256 = 'x';
  expectRejected(wrongBinding, '/proofJobBinding');
  for (const mutate of [
    value => value.reviewQuestions.pop(),
    value => value.reviewQuestions.push(structuredClone(value.reviewQuestions[0])),
    value => value.reviewQuestions.reverse(),
    value => { value.reviewQuestions[0].questionId = 'different'; },
    value => { value.reviewQuestions[0].prompt = ''; },
  ]) {
    const candidate = structuredClone(input);
    mutate(candidate);
    expectRejected(candidate, '/reviewQuestions');
  }
  for (const mutate of [
    value => value.items.pop(),
    value => value.items.push(structuredClone(value.items[0])),
    value => value.items.reverse(),
    value => { value.items[0].caseId = 'different'; },
    value => { value.items[0].extra = true; },
  ]) {
    const candidate = structuredClone(input);
    mutate(candidate);
    expectRejected(candidate, '/items');
  }
  diagnosticsFor(t, 'ZCQ045');
});

test('ZCQ046: 最短cueとfade証拠・binding・HTML escapeを個別byteで閉じる', t => {
  const input = reviewInput();
  const inputBytes = formalBytes(input);
  const built = reviewModule.buildPresentationZevoCaptionQualityV002ReviewHtmlV001(input);
  assert.equal(built.status, 'passed');
  const html = built.bytes.toString('utf8');
  assert.match(html, /voice-013-cue-000001<\/code> — 18 frames/u);
  assert.match(html, /既存fade: 4 frames/u);
  assert.ok(html.includes(
    `data-review-input-canonical-sha256="${admittedReviewInputBinding.canonicalSha256}"`,
  ));
  assert.ok(!html.includes('<&\"\' voice-013'));
  assert.ok(html.includes('&lt;&amp;&quot;&#39; voice-013'));
  const htmlSha256 = SHA(built.bytes);
  assert.equal(admittedReviewInputBinding.fileSha256, SHA(inputBytes));
  assert.notEqual(admittedReviewInputBinding.fileSha256, htmlSha256);
  for (const bytes of [
    Buffer.alloc(0),
    Buffer.concat([Buffer.from(' ', 'utf8'), inputBytes]),
    inputBytes.subarray(0, inputBytes.length - 1),
    Buffer.from(inputBytes.toString('utf8').replaceAll('\n', '\r\n'), 'utf8'),
    Buffer.from('```json\n{}\n```\n', 'utf8'),
    Buffer.from('{]\n', 'utf8'),
  ]) {
    assert.equal(reviewModule.decodePresentationZevoCaptionQualityV002ReviewInputV001(bytes).status, 'rejected');
  }
  const schemaInvalid = structuredClone(input);
  schemaInvalid.observedFadeFrameCount = 0;
  assert.deepEqual(reviewModule.decodePresentationZevoCaptionQualityV002ReviewInputV001(formalBytes(schemaInvalid)), {
    status: 'rejected', reason: 'schema-invalid',
  });
  assert.deepEqual(reviewModule.buildPresentationZevoCaptionQualityV002ReviewHtmlV001(schemaInvalid), {
    status: 'rejected',
    violations: [{code: 'CUE_REVIEW_INPUT_INVALID', path: '/', relatedPaths: []}],
    reason: 'schema-invalid',
  });
  diagnosticsFor(t, 'ZCQ046');
});
