import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  serializePresentationCaptionReport,
  validatePresentationCaptionContract,
} from './presentation_caption_contract.mjs';

const fixtureUrl = (name) => new URL(`./testdata/presentation-caption-contract-v001/${name}`, import.meta.url);
const readFixture = async (name) => JSON.parse(await readFile(fileURLToPath(fixtureUrl(name)), 'utf8'));
const codes = (report, section) => {
  if (section === 'contract') return report.contract.violations.map((item) => item.code);
  return report.checks[section].violations.map((item) => item.code);
};

test('正常な文字相当入力は部分検査として通り、境界接触を重なりにしない', async () => {
  const report = validatePresentationCaptionContract(await readFixture('valid-character.json'));
  assert.equal(report.overallStatus, 'passed_with_declared_limit');
  assert.equal(report.contract.status, 'passed');
  assert.equal(report.checks.G1.status, 'passed');
  assert.equal(report.checks.G2.status, 'passed_with_declared_limit');
  assert.deepEqual(report.checks.G2.unverified, [
    'linguistic_word_boundary',
    'semantic_chunk_readability',
    'on_screen_readability',
  ]);
  assert.equal(report.checks.G3.status, 'passed');
  assert.ok(!codes(report, 'G3').includes('G3_UNDECLARED_OVERLAP'));
});

test('表示対象にcueが無ければG1_TARGET_WITHOUT_CAPTIONを検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues = [];
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G1').includes('G1_TARGET_WITHOUT_CAPTION'));
});

test('未知atom参照を検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[0].lines[0].atomIds[0] = 'missing-atom';
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G1').includes('G1_UNKNOWN_ATOM_REFERENCE'));
});

test('cueによるtarget横断参照を検出する', async () => {
  const crossInput = await readFixture('valid-simultaneous-future-contract.json');
  crossInput.captionPlan.cues[0].lines[0].atomIds = ['speaker-b-01'];
  crossInput.captionPlan.cues[0].lines[0].renderedText = 'うん';
  crossInput.captionPlan.cues[0].startAnchor.atomId = 'speaker-b-01';
  crossInput.captionPlan.cues[0].endAnchor.atomId = 'speaker-b-01';
  crossInput.captionPlan.cues[0].startMs = 1050;
  crossInput.captionPlan.cues[0].endMs = 1250;
  const crossReport = validatePresentationCaptionContract(crossInput);
  assert.ok(codes(crossReport, 'G1').includes('G1_ATOM_OUTSIDE_TARGET'));
});

test('元発話に無い公開文言を厳密一致違反として検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[0].lines[0].renderedText = '船。';
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G1').includes('G1_TEXT_NOT_SOURCE_DERIVED'));
});

test('必須atomの欠落をG1とG2の両方で検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[1].lines[0].atomIds = ['a-03'];
  input.captionPlan.cues[1].lines[0].renderedText = 'で';
  input.captionPlan.cues[1].endAnchor.atomId = 'a-03';
  input.captionPlan.cues[1].endMs = 1300;
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G1').includes('G1_UNDECLARED_OMISSION'));
  assert.ok(codes(report, 'G2').includes('G2_REQUIRED_ATOM_MISSING'));
});

test('atomの重複参照を検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[0].lines[1].atomIds = ['a-01'];
  input.captionPlan.cues[0].lines[1].renderedText = '船';
  input.captionPlan.cues[0].endAnchor.atomId = 'a-01';
  input.captionPlan.cues[0].endMs = 1100;
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G2').includes('G2_DUPLICATE_ATOM'));
});

test('atomの参照逆順を検出する', async () => {
  const reversedInput = await readFixture('valid-character.json');
  reversedInput.captionPlan.cues[0].lines = [
    { atomIds: ['a-02', 'a-01'], renderedText: '長船' },
  ];
  reversedInput.captionPlan.cues[0].startAnchor.atomId = 'a-02';
  reversedInput.captionPlan.cues[0].endAnchor.atomId = 'a-01';
  reversedInput.captionPlan.cues[0].startMs = 1100;
  reversedInput.captionPlan.cues[0].endMs = 1100;
  const reversedReport = validatePresentationCaptionContract(reversedInput);
  assert.ok(codes(reversedReport, 'G1').includes('G1_SOURCE_ORDER_REVERSED'));
  assert.ok(codes(reversedReport, 'G2').includes('G2_ATOM_ORDER_REVERSED'));
});

test('空cueを検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[0].lines = [];
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G2').includes('G2_EMPTY_CUE'));
});

test('空lineを検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[0].lines[0].atomIds = [];
  input.captionPlan.cues[0].lines[0].renderedText = '';
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G2').includes('G2_EMPTY_LINE'));
});

test('renderedTextへの改行文字埋め込みを検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[0].lines[0].renderedText = '船\n';
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G2').includes('G2_BOUNDARY_REPRESENTATION_INVALID'));
});

test('anchorと異なる創作時刻を検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[0].startMs = 999;
  input.captionPlan.cues[0].endMs = 1201;
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G3').includes('G3_START_TIME_NOT_ANCHORED'));
  assert.ok(codes(report, 'G3').includes('G3_END_TIME_NOT_ANCHORED'));
});

test('cue論理順の逆転を検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues.reverse();
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G3').includes('G3_CUE_ORDER_REVERSED'));
});

test('正の交差だけを未宣言重なりとして検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.captionPlan.cues[1].startMs = 1199;
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'G3').includes('G3_UNDECLARED_OVERLAP'));
  const overlap = report.checks.G3.violations.find((item) => item.code === 'G3_UNDECLARED_OVERLAP');
  assert.equal(overlap.details.overlapMs, 1);
});

test('上流固定groupと異なる既知話者の同時表示だけを許可する', async () => {
  const validInput = await readFixture('valid-simultaneous-future-contract.json');
  const validReport = validatePresentationCaptionContract(validInput);
  assert.equal(validReport.overallStatus, 'passed');
  assert.equal(validReport.contract.observations[0].code, 'SOURCE_ATOM_TIME_OVERLAP_RECORDED');
  assert.equal(validReport.contract.observations[0].details.overlapMs, 150);
  assert.ok(!codes(validReport, 'G3').includes('G3_UNDECLARED_OVERLAP'));

});

test('cueの自己申告だけによる同時表示groupを拒否する', async () => {
  const selfDeclaredInput = await readFixture('valid-simultaneous-future-contract.json');
  selfDeclaredInput.source.allowedSimultaneousGroups = [];
  const selfDeclaredReport = validatePresentationCaptionContract(selfDeclaredInput);
  assert.ok(codes(selfDeclaredReport, 'G3').includes('G3_INVALID_SIMULTANEOUS_GROUP'));
  assert.ok(codes(selfDeclaredReport, 'G3').includes('G3_UNDECLARED_OVERLAP'));

});

test('同一話者targetの同時表示groupを拒否する', async () => {
  const sameSpeakerInput = await readFixture('valid-simultaneous-future-contract.json');
  sameSpeakerInput.source.atoms[1].speaker = 'SPEAKER_A';
  const sameSpeakerReport = validatePresentationCaptionContract(sameSpeakerInput);
  assert.ok(codes(sameSpeakerReport, 'contract').includes('SOURCE_SIMULTANEOUS_GROUP_SPEAKERS_NOT_DISTINCT'));
});

test('source atomId重複を検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.source.atoms[1].atomId = 'a-01';
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'contract').includes('SOURCE_DUPLICATE_ATOM_ID'));
});

test('source時刻逆転を検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.source.atoms[1].startMs = 900;
  input.source.atoms[1].endMs = 950;
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'contract').includes('SOURCE_ATOM_TIME_ORDER_REVERSED'));
});

test('source atomの境界接触は重なり記録にしない', async () => {
  const report = validatePresentationCaptionContract(await readFixture('valid-character.json'));
  assert.equal(report.contract.observations.length, 0);
});

test('source atom時刻の正の重なりは拒否せず記録する', async () => {
  const input = await readFixture('valid-character.json');
  input.source.atoms[1].startMs = 1050;
  const report = validatePresentationCaptionContract(input);
  assert.equal(report.contract.status, 'passed');
  assert.ok(report.contract.observations.some((item) => item.code === 'SOURCE_ATOM_TIME_OVERLAP_RECORDED'));
});

test('同一source atomの複数target登録を検出する', async () => {
  const input = await readFixture('valid-character.json');
  input.source.captionTargets.push({
    targetId: 'target-02',
    requiredAtomIds: ['a-01'],
    allowedOmissionAtomIds: [],
  });
  const report = validatePresentationCaptionContract(input);
  assert.ok(codes(report, 'contract').includes('SOURCE_ATOM_IN_MULTIPLE_TARGETS'));
});

test('旧telopPlanはschema不成立になり推測変換しない', async () => {
  const report = validatePresentationCaptionContract(await readFixture('legacy-telop-plan.json'));
  assert.equal(report.overallStatus, 'failed');
  assert.ok(codes(report, 'contract').includes('CONTRACT_SCHEMA_VERSION_UNSUPPORTED'));
  assert.ok(codes(report, 'contract').includes('SOURCE_NOT_OBJECT'));
});

test('同じ入力の検査結果はバイト単位で一致する', async () => {
  const input = await readFixture('valid-character.json');
  const first = serializePresentationCaptionReport(validatePresentationCaptionContract(input));
  const second = serializePresentationCaptionReport(validatePresentationCaptionContract(input));
  assert.equal(first, second);
});
