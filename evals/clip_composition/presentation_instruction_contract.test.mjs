import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { canonicalJson, validatePresentationCaptionContract } from './presentation_caption_contract.mjs';
import {
  PRESENTATION_INSTRUCTION_VIOLATION_CODES,
  serializePresentationInstructionReport,
  validatePresentationInstructionContract,
} from './presentation_instruction_contract.mjs';

const fixtureUrl = (name) => new URL(`./testdata/presentation-instruction-contract-v001/${name}`, import.meta.url);
const readFixture = async (name) => JSON.parse(await readFile(fileURLToPath(fixtureUrl(name)), 'utf8'));
const VALID_BUNDLE = await readFixture('valid-all-kinds.bundle.json');
const VALID_TRUST = await readFixture('valid-trust-bindings.json');
const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');

const refreshHashes = (bundle, trust) => {
  if (bundle?.resolutionPackage && typeof bundle.resolutionPackage === 'object') {
    if ('sourceAtoms' in bundle.resolutionPackage) {
      bundle.resolutionPackage.sourceAtomsSha256 = sha256(bundle.resolutionPackage.sourceAtoms);
    }
    if (bundle?.instructionSet && typeof bundle.instructionSet === 'object') {
      bundle.instructionSet.resolutionPackageSha256 = sha256(bundle.resolutionPackage);
    }
  }
  if (trust && typeof trust === 'object') {
    if (bundle?.presetValidationIndex && typeof bundle.presetValidationIndex === 'object') {
      trust.presetValidationIndexSha256 = sha256(bundle.presetValidationIndex);
    }
    if (bundle?.materialValidationIndex && typeof bundle.materialValidationIndex === 'object') {
      trust.materialValidationIndexSha256 = sha256(bundle.materialValidationIndex);
    }
  }
};

const outerIssues = (report) => [
  ...(report?.contract?.violations ?? []),
  ...(report?.checks?.instructionEnvelope?.violations ?? []),
  ...(report?.checks?.resolutionIntegrity?.violations ?? []),
  ...(report?.checks?.presetCompatibility?.violations ?? []),
  ...(report?.checks?.materialCompatibility?.violations ?? []),
];
const outerCodeSet = (report) => new Set(outerIssues(report).map((issue) => issue.code));
const reportCodeSet = (value, result = new Set()) => {
  if (Array.isArray(value)) {
    value.forEach((entry) => reportCodeSet(entry, result));
    return result;
  }
  if (value === null || typeof value !== 'object') return result;
  if (typeof value.code === 'string') result.add(value.code);
  Object.values(value).forEach((entry) => reportCodeSet(entry, result));
  return result;
};
const delegatedCaptionReports = (report) => report?.delegatedChecks?.captionContracts ?? [];
const instruction = (bundle, id) => bundle.instructionSet.instructions.find((item) => item?.instructionId === id);
const target = (bundle, id) => bundle.resolutionPackage.targets.find((item) => item?.targetRefId === id);
const preset = (bundle, id = 'synthetic-style-v001') => bundle.presetValidationIndex.presets.find((item) => item?.presetId === id);
const policy = (bundle, kind) => preset(bundle)?.kindPolicies.find((item) => item?.kind === kind);
const material = (bundle, id) => bundle.materialValidationIndex.materials.find((item) => item?.materialId === id);
const captionContract = (bundle) => bundle.resolutionPackage.captionContracts[0];
const captionCue = (bundle) => captionContract(bundle).captionPlan.cues[0];

const verifyBaseFixtureHashes = (bundle, trust) => {
  assert.equal(bundle.resolutionPackage.sourceAtomsSha256, sha256(bundle.resolutionPackage.sourceAtoms));
  assert.equal(bundle.instructionSet.resolutionPackageSha256, sha256(bundle.resolutionPackage));
  assert.equal(trust.presetValidationIndexSha256, sha256(bundle.presetValidationIndex));
  assert.equal(trust.materialValidationIndexSha256, sha256(bundle.materialValidationIndex));
};

const buildCaptionInput = (bundle, entry = captionContract(bundle)) => ({
  schemaVersion: entry.captionSchemaVersion,
  format: bundle.instructionSet.format,
  source: {
    atomGranularity: bundle.resolutionPackage.atomGranularity,
    atomProvenance: bundle.resolutionPackage.sourceProvenance,
    atoms: bundle.resolutionPackage.sourceAtoms,
    captionTargets: entry.captionTargets,
    allowedSimultaneousGroups: entry.allowedSimultaneousGroups,
  },
  captionPlan: entry.captionPlan,
});

const reverseObjectKeys = (value) => {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).reverse().map((key) => [key, reverseObjectKeys(value[key])]));
};

const addValidSecondCaptionCue = (bundle) => {
  const entry = captionContract(bundle);
  entry.captionTargets.push({
    targetId: 'caption-source-target-002',
    requiredAtomIds: ['a-06'],
    allowedOmissionAtomIds: [],
  });
  entry.allowedSimultaneousGroups.push({
    simultaneousGroupId: 'caption-group-001',
    targetIds: ['caption-source-target-001', 'caption-source-target-002'],
  });
  entry.captionPlan.cues.push({
    cueId: 'cue-002',
    targetId: 'caption-source-target-002',
    lines: [{ atomIds: ['a-06'], renderedText: 'コメント' }],
    startAnchor: { atomId: 'a-06', edge: 'start' },
    endAnchor: { atomId: 'a-06', edge: 'end' },
    startMs: 1500,
    endMs: 1600,
    simultaneousGroupId: 'caption-group-001',
  });
  bundle.resolutionPackage.targets.push({
    targetRefId: 'target-caption-002',
    targetType: 'caption-target',
    captionContractRefId: 'caption-contract-001',
    cueId: 'cue-002',
  });
  bundle.instructionSet.instructions.push({
    instructionId: 'instruction-caption-002',
    trigger: { startAtomId: 'a-06' },
    kind: 'speech-caption',
    target: { targetType: 'caption-target', targetRefIds: ['target-caption-002'] },
    presetId: 'synthetic-style-v001',
    materialRefs: [],
  });
};

test('10種類を含む固定fixtureはhashまで一致して通る', () => {
  const bundle = clone(VALID_BUNDLE);
  const trust = clone(VALID_TRUST);
  verifyBaseFixtureHashes(bundle, trust);
  const report = validatePresentationInstructionContract(bundle, trust);
  assert.equal(report.overallStatus, 'passed');
  assert.equal(outerIssues(report).length, 0);
  assert.equal(delegatedCaptionReports(report).length, 1);
  assert.deepEqual(delegatedCaptionReports(report)[0].report, validatePresentationCaptionContract(buildCaptionInput(bundle)));
});

test('空の指示書と専用の空解決packageを許す', () => {
  const bundle = clone(VALID_BUNDLE);
  const trust = clone(VALID_TRUST);
  bundle.instructionSet.instructions = [];
  bundle.resolutionPackage.targets = [];
  bundle.resolutionPackage.captionContracts = [];
  refreshHashes(bundle, trust);
  const report = validatePresentationInstructionContract(bundle, trust);
  assert.equal(report.overallStatus, 'passed');
  assert.equal(delegatedCaptionReports(report).length, 0);
});

test('caption契約は0件と1件を通し、2件を拒否する', () => {
  const zeroBundle = clone(VALID_BUNDLE);
  const zeroTrust = clone(VALID_TRUST);
  zeroBundle.instructionSet.instructions = zeroBundle.instructionSet.instructions.filter((item) => item.kind !== 'speech-caption');
  zeroBundle.resolutionPackage.targets = zeroBundle.resolutionPackage.targets.filter((item) => item.targetType !== 'caption-target');
  zeroBundle.resolutionPackage.captionContracts = [];
  refreshHashes(zeroBundle, zeroTrust);
  assert.equal(validatePresentationInstructionContract(zeroBundle, zeroTrust).overallStatus, 'passed');

  assert.equal(validatePresentationInstructionContract(clone(VALID_BUNDLE), clone(VALID_TRUST)).overallStatus, 'passed');

  const twoBundle = clone(VALID_BUNDLE);
  const twoTrust = clone(VALID_TRUST);
  const extra = clone(captionContract(twoBundle));
  extra.captionContractRefId = 'caption-contract-002';
  twoBundle.resolutionPackage.captionContracts.push(extra);
  refreshHashes(twoBundle, twoTrust);
  const twoReport = validatePresentationInstructionContract(twoBundle, twoTrust);
  assert.equal(twoReport.overallStatus, 'failed');
  assert.ok(outerCodeSet(twoReport).has('RESOLUTION_PACKAGE_CAPTION_CONTRACT_COUNT_UNSUPPORTED'));
  assert.equal(delegatedCaptionReports(twoReport).length, 0);
});

test('caption cue ID重複を先勝ちで処理せず外枠接続を曖昧失敗にする', () => {
  const bundle = clone(VALID_BUNDLE);
  const trust = clone(VALID_TRUST);
  captionContract(bundle).captionPlan.cues.push(clone(captionCue(bundle)));
  refreshHashes(bundle, trust);
  const report = validatePresentationInstructionContract(bundle, trust);
  assert.equal(report.overallStatus, 'failed');
  assert.ok(outerCodeSet(report).has('CAPTION_TARGET_CUE_AMBIGUOUS'));
  assert.ok(
    delegatedCaptionReports(report)[0]?.report?.contract?.violations?.some(
      (item) => item.code === 'CAPTION_CUE_ID_INVALID',
    ),
  );
});

test('sourceの既存検査を委譲し、重複・逆転・正の重なりを既存コードのまま保つ', () => {
  const duplicateBundle = clone(VALID_BUNDLE);
  const duplicateTrust = clone(VALID_TRUST);
  duplicateBundle.resolutionPackage.sourceAtoms[1].atomId = 'a-01';
  refreshHashes(duplicateBundle, duplicateTrust);
  const duplicateReport = validatePresentationInstructionContract(duplicateBundle, duplicateTrust);
  assert.ok(
    duplicateReport.delegatedChecks.sourceContract.violations.some((item) => item.code === 'SOURCE_DUPLICATE_ATOM_ID'),
  );

  const reversedBundle = clone(VALID_BUNDLE);
  const reversedTrust = clone(VALID_TRUST);
  reversedBundle.resolutionPackage.sourceAtoms[1].startMs = 900;
  reversedBundle.resolutionPackage.sourceAtoms[1].endMs = 950;
  refreshHashes(reversedBundle, reversedTrust);
  const reversedReport = validatePresentationInstructionContract(reversedBundle, reversedTrust);
  assert.ok(
    reversedReport.delegatedChecks.sourceContract.violations.some(
      (item) => item.code === 'SOURCE_ATOM_TIME_ORDER_REVERSED',
    ),
  );

  const overlapBundle = clone(VALID_BUNDLE);
  const overlapTrust = clone(VALID_TRUST);
  overlapBundle.resolutionPackage.sourceAtoms[1].startMs = 1050;
  refreshHashes(overlapBundle, overlapTrust);
  const overlapReport = validatePresentationInstructionContract(overlapBundle, overlapTrust);
  assert.ok(
    overlapReport.delegatedChecks.sourceContract.observations.some(
      (item) => item.code === 'SOURCE_ATOM_TIME_OVERLAP_RECORDED',
    ),
  );
});

test('実captionだけのcharacter timestamp部分検査を上位へ伝播する', () => {
  const bundle = clone(VALID_BUNDLE);
  const trust = clone(VALID_TRUST);
  bundle.resolutionPackage.atomGranularity = 'character-timestamp';
  refreshHashes(bundle, trust);
  const report = validatePresentationInstructionContract(bundle, trust);
  assert.equal(report.overallStatus, 'passed_with_declared_limit');
  assert.equal(delegatedCaptionReports(report)[0].report.overallStatus, 'passed_with_declared_limit');
  assert.equal(report.delegatedChecks.sourceContract.status, 'passed');
});

test('information-commentの話者アイコンは無しと正しい人物を許し、別人物を拒否する', () => {
  const absentBundle = clone(VALID_BUNDLE);
  const absentTrust = clone(VALID_TRUST);
  instruction(absentBundle, 'instruction-comment').materialRefs = [];
  refreshHashes(absentBundle, absentTrust);
  assert.equal(validatePresentationInstructionContract(absentBundle, absentTrust).overallStatus, 'passed');

  assert.equal(validatePresentationInstructionContract(clone(VALID_BUNDLE), clone(VALID_TRUST)).overallStatus, 'passed');

  const wrongBundle = clone(VALID_BUNDLE);
  const wrongTrust = clone(VALID_TRUST);
  material(wrongBundle, 'material-speaker-icon').compatibleSubjects[0].subjectId = 'speaker-other';
  refreshHashes(wrongBundle, wrongTrust);
  const wrongReport = validatePresentationInstructionContract(wrongBundle, wrongTrust);
  assert.ok(outerCodeSet(wrongReport).has('INSTRUCTION_MATERIAL_TARGET_MISMATCH'));

  const noSpeakerBundle = clone(absentBundle);
  const noSpeakerTrust = clone(absentTrust);
  delete target(noSpeakerBundle, 'target-comment').speakerId;
  refreshHashes(noSpeakerBundle, noSpeakerTrust);
  const noSpeakerReport = validatePresentationInstructionContract(noSpeakerBundle, noSpeakerTrust);
  assert.ok(outerCodeSet(noSpeakerReport).has('TARGET_ENTRY_TYPE_PAYLOAD_INVALID'));
});

test('G7素材ORは画像だけ・動画だけ・両方を許し、無しを拒否する', () => {
  for (const refs of [
    ['material-reference-image'],
    ['material-reference-video'],
    ['material-reference-image', 'material-reference-video'],
  ]) {
    const bundle = clone(VALID_BUNDLE);
    const trust = clone(VALID_TRUST);
    instruction(bundle, 'instruction-reference').materialRefs = refs;
    refreshHashes(bundle, trust);
    assert.equal(validatePresentationInstructionContract(bundle, trust).overallStatus, 'passed');
  }

  const noneBundle = clone(VALID_BUNDLE);
  const noneTrust = clone(VALID_TRUST);
  instruction(noneBundle, 'instruction-reference').materialRefs = [];
  refreshHashes(noneBundle, noneTrust);
  const noneReport = validatePresentationInstructionContract(noneBundle, noneTrust);
  assert.ok(outerCodeSet(noneReport).has('INSTRUCTION_REFERENCE_MATERIAL_MISSING'));
});

test('役割または対象が違う素材は必須素材とG7のORを満たしたことにしない', () => {
  const wrongRoleBundle = clone(VALID_BUNDLE);
  const wrongRoleTrust = clone(VALID_TRUST);
  policy(wrongRoleBundle, 'speaker-identification').requiredMaterialRoles = ['speaker-icon'];
  instruction(wrongRoleBundle, 'instruction-speaker').materialRefs = ['material-reference-image'];
  refreshHashes(wrongRoleBundle, wrongRoleTrust);
  const wrongRoleReport = validatePresentationInstructionContract(wrongRoleBundle, wrongRoleTrust);
  assert.ok(outerCodeSet(wrongRoleReport).has('INSTRUCTION_MATERIAL_ROLE_UNSUPPORTED'));
  assert.ok(outerCodeSet(wrongRoleReport).has('INSTRUCTION_REQUIRED_MATERIAL_MISSING'));

  const wrongSpeakerBundle = clone(VALID_BUNDLE);
  const wrongSpeakerTrust = clone(VALID_TRUST);
  policy(wrongSpeakerBundle, 'speaker-identification').requiredMaterialRoles = ['speaker-icon'];
  material(wrongSpeakerBundle, 'material-speaker-icon').compatibleSubjects[0].subjectId = 'speaker-other';
  refreshHashes(wrongSpeakerBundle, wrongSpeakerTrust);
  const wrongSpeakerReport = validatePresentationInstructionContract(wrongSpeakerBundle, wrongSpeakerTrust);
  assert.ok(outerCodeSet(wrongSpeakerReport).has('INSTRUCTION_MATERIAL_TARGET_MISMATCH'));
  assert.ok(outerCodeSet(wrongSpeakerReport).has('INSTRUCTION_REQUIRED_MATERIAL_MISSING'));

  const wrongG7RoleBundle = clone(VALID_BUNDLE);
  const wrongG7RoleTrust = clone(VALID_TRUST);
  instruction(wrongG7RoleBundle, 'instruction-reference').materialRefs = ['material-speaker-icon'];
  refreshHashes(wrongG7RoleBundle, wrongG7RoleTrust);
  const wrongG7RoleReport = validatePresentationInstructionContract(wrongG7RoleBundle, wrongG7RoleTrust);
  assert.ok(outerCodeSet(wrongG7RoleReport).has('INSTRUCTION_MATERIAL_ROLE_UNSUPPORTED'));
  assert.ok(outerCodeSet(wrongG7RoleReport).has('INSTRUCTION_REFERENCE_MATERIAL_MISSING'));

  const wrongG7SubjectBundle = clone(VALID_BUNDLE);
  const wrongG7SubjectTrust = clone(VALID_TRUST);
  material(wrongG7SubjectBundle, 'material-reference-image').compatibleSubjects[0].subjectId = 'reference-other';
  refreshHashes(wrongG7SubjectBundle, wrongG7SubjectTrust);
  const wrongG7SubjectReport = validatePresentationInstructionContract(wrongG7SubjectBundle, wrongG7SubjectTrust);
  assert.ok(outerCodeSet(wrongG7SubjectReport).has('INSTRUCTION_MATERIAL_TARGET_MISMATCH'));
  assert.ok(outerCodeSet(wrongG7SubjectReport).has('INSTRUCTION_REFERENCE_MATERIAL_MISSING'));
});

test('G7の素材ORはpreset必須条件と独立し、対象が解けない時は素材対象不一致を推測しない', () => {
  const unknownPresetBundle = clone(VALID_BUNDLE);
  const unknownPresetTrust = clone(VALID_TRUST);
  instruction(unknownPresetBundle, 'instruction-reference').presetId = 'missing-preset';
  refreshHashes(unknownPresetBundle, unknownPresetTrust);
  const unknownPresetReport = validatePresentationInstructionContract(unknownPresetBundle, unknownPresetTrust);
  assert.ok(outerCodeSet(unknownPresetReport).has('INSTRUCTION_PRESET_UNKNOWN'));
  assert.ok(!outerCodeSet(unknownPresetReport).has('INSTRUCTION_REFERENCE_MATERIAL_MISSING'));

  const unknownTargetBundle = clone(VALID_BUNDLE);
  const unknownTargetTrust = clone(VALID_TRUST);
  instruction(unknownTargetBundle, 'instruction-reference').target.targetRefIds = ['missing-target'];
  refreshHashes(unknownTargetBundle, unknownTargetTrust);
  const unknownTargetReport = validatePresentationInstructionContract(unknownTargetBundle, unknownTargetTrust);
  assert.ok(outerCodeSet(unknownTargetReport).has('INSTRUCTION_TARGET_REFERENCE_UNKNOWN'));
  assert.ok(!outerCodeSet(unknownTargetReport).has('INSTRUCTION_MATERIAL_TARGET_MISMATCH'));
});

test('caption本文改変は旧G1コードと旧reportのまま伝播して全体を失敗させる', () => {
  const bundle = clone(VALID_BUNDLE);
  const trust = clone(VALID_TRUST);
  captionCue(bundle).lines[0].renderedText = '創作した発話';
  refreshHashes(bundle, trust);
  const expectedNested = validatePresentationCaptionContract(buildCaptionInput(bundle));
  const report = validatePresentationInstructionContract(bundle, trust);
  assert.equal(report.overallStatus, 'failed');
  assert.deepEqual(delegatedCaptionReports(report)[0].report, expectedNested);
  assert.ok(
    delegatedCaptionReports(report)[0].report.checks.G1.violations.some(
      (item) => item.code === 'G1_TEXT_NOT_SOURCE_DERIVED',
    ),
  );
});

test('同一入力はバイト一致し、object key順はhash不変、artifact配列順はhashだけ変わる', () => {
  const first = validatePresentationInstructionContract(clone(VALID_BUNDLE), clone(VALID_TRUST));
  const second = validatePresentationInstructionContract(clone(VALID_BUNDLE), clone(VALID_TRUST));
  assert.equal(serializePresentationInstructionReport(first), serializePresentationInstructionReport(second));

  const reorderedObjectReport = validatePresentationInstructionContract(
    reverseObjectKeys(clone(VALID_BUNDLE)),
    reverseObjectKeys(clone(VALID_TRUST)),
  );
  assert.equal(reorderedObjectReport.inputSha256, first.inputSha256);
  assert.equal(
    serializePresentationInstructionReport(reorderedObjectReport),
    serializePresentationInstructionReport(first),
  );

  const reorderedArrayBundle = clone(VALID_BUNDLE);
  reorderedArrayBundle.instructionSet.instructions.reverse();
  const reorderedArrayReport = validatePresentationInstructionContract(reorderedArrayBundle, clone(VALID_TRUST));
  assert.notEqual(reorderedArrayReport.inputSha256, first.inputSha256);
  assert.equal(reorderedArrayReport.overallStatus, first.overallStatus);
  assert.deepEqual(outerCodeSet(reorderedArrayReport), outerCodeSet(first));

  const reorderedMaterialBundle = clone(VALID_BUNDLE);
  const reorderedMaterialTrust = clone(VALID_TRUST);
  reorderedMaterialBundle.materialValidationIndex.materials.reverse();
  refreshHashes(reorderedMaterialBundle, reorderedMaterialTrust);
  const reorderedMaterialReport = validatePresentationInstructionContract(
    reorderedMaterialBundle,
    reorderedMaterialTrust,
  );
  assert.notEqual(reorderedMaterialReport.inputSha256, first.inputSha256);
  assert.equal(reorderedMaterialReport.overallStatus, first.overallStatus);
  assert.deepEqual(outerCodeSet(reorderedMaterialReport), outerCodeSet(first));
});

test('10種類は対応対象で通り、別対象種別へすり替えると全種類で失敗する', () => {
  const expectedTargetTypes = new Map([
    ['speech-caption', 'caption-target'],
    ['emphasis-important-statement', 'source-atom-range'],
    ['emphasis-mistake-realization', 'source-atom-range'],
    ['emphasis-discovery', 'source-atom-range'],
    ['emphasis-strong-emotion', 'source-atom-range'],
    ['information-comment', 'information-item'],
    ['information-narration', 'information-item'],
    ['information-lyrics', 'information-item'],
    ['speaker-identification', 'speaker'],
    ['reference-supplement', 'reference-subject'],
  ]);
  assert.deepEqual(
    new Set(VALID_BUNDLE.instructionSet.instructions.map((item) => item.kind)),
    new Set(expectedTargetTypes.keys()),
  );
  for (const sourceInstruction of VALID_BUNDLE.instructionSet.instructions) {
    assert.equal(sourceInstruction.target.targetType, expectedTargetTypes.get(sourceInstruction.kind));
    const bundle = clone(VALID_BUNDLE);
    const trust = clone(VALID_TRUST);
    const changed = instruction(bundle, sourceInstruction.instructionId);
    changed.target.targetType = changed.target.targetType === 'speaker' ? 'information-item' : 'speaker';
    refreshHashes(bundle, trust);
    assert.ok(
      outerCodeSet(validatePresentationInstructionContract(bundle, trust)).has('INSTRUCTION_KIND_TARGET_MISMATCH'),
      `${sourceInstruction.kind}の対象種別すり替えを検出できませんでした。`,
    );
  }
});

test('未使用preset・policy・materialもindex全体の不正として検出する', () => {
  const unusedPresetBundle = clone(VALID_BUNDLE);
  const unusedPresetTrust = clone(VALID_TRUST);
  unusedPresetBundle.presetValidationIndex.presets.push({
    presetId: 'unused-preset',
    format: 'vertical-short',
    kindPolicies: [clone(policy(unusedPresetBundle, 'information-narration'))],
  });
  refreshHashes(unusedPresetBundle, unusedPresetTrust);
  assert.ok(
    outerCodeSet(validatePresentationInstructionContract(unusedPresetBundle, unusedPresetTrust))
      .has('PRESET_ENTRY_FORMAT_UNSUPPORTED'),
  );

  const unusedPolicyBundle = clone(VALID_BUNDLE);
  const unusedPolicyTrust = clone(VALID_TRUST);
  unusedPolicyBundle.presetValidationIndex.presets.push({
    presetId: 'unused-preset',
    format: 'normal-landscape',
    kindPolicies: [{
      ...clone(policy(unusedPolicyBundle, 'information-narration')),
      allowedMaterialRoles: ['reference-image'],
    }],
  });
  refreshHashes(unusedPolicyBundle, unusedPolicyTrust);
  assert.ok(
    outerCodeSet(validatePresentationInstructionContract(unusedPolicyBundle, unusedPolicyTrust))
      .has('PRESET_MATERIAL_ROLE_UNSUPPORTED'),
  );

  const unusedMaterialBundle = clone(VALID_BUNDLE);
  const unusedMaterialTrust = clone(VALID_TRUST);
  unusedMaterialBundle.materialValidationIndex.materials.push({
    materialId: 'unused-material',
    role: 'legacy-role',
    compatibleSubjects: [{ subjectType: 'speaker', subjectId: 'speaker-unused' }],
  });
  refreshHashes(unusedMaterialBundle, unusedMaterialTrust);
  assert.ok(
    outerCodeSet(validatePresentationInstructionContract(unusedMaterialBundle, unusedMaterialTrust))
      .has('MATERIAL_ROLE_UNSUPPORTED'),
  );
});

test('caption内部のtarget横断参照は旧G1違反のまま委譲する', () => {
  const bundle = clone(VALID_BUNDLE);
  const trust = clone(VALID_TRUST);
  captionCue(bundle).lines = [{ atomIds: ['a-02'], renderedText: '重要' }];
  captionCue(bundle).startAnchor = { atomId: 'a-02', edge: 'start' };
  captionCue(bundle).endAnchor = { atomId: 'a-02', edge: 'end' };
  captionCue(bundle).startMs = 1100;
  captionCue(bundle).endMs = 1200;
  refreshHashes(bundle, trust);
  const report = validatePresentationInstructionContract(bundle, trust);
  assert.ok(
    delegatedCaptionReports(report)[0].report.checks.G1.violations.some(
      (item) => item.code === 'G1_ATOM_OUTSIDE_TARGET',
    ),
  );
});

test('固定1 presetでもpresetId省略を暗黙defaultへ変換しない', () => {
  const bundle = clone(VALID_BUNDLE);
  const trust = clone(VALID_TRUST);
  delete instruction(bundle, 'instruction-narration').presetId;
  refreshHashes(bundle, trust);
  const report = validatePresentationInstructionContract(bundle, trust);
  assert.equal(report.overallStatus, 'failed');
  assert.ok(outerCodeSet(report).has('INSTRUCTION_PRESET_ID_INVALID'));
});

test('未知field allowlistを全入れ子階層で拒否する', () => {
  const cases = [
    ['instruction', ({ bundle }) => { instruction(bundle, 'instruction-narration').unknown = true; }, 'INSTRUCTION_UNKNOWN_FIELD'],
    ['trigger', ({ bundle }) => { instruction(bundle, 'instruction-narration').trigger.unknown = true; }, 'INSTRUCTION_UNKNOWN_FIELD'],
    ['instruction target', ({ bundle }) => { instruction(bundle, 'instruction-narration').target.unknown = true; }, 'INSTRUCTION_UNKNOWN_FIELD'],
    ['source atom', ({ bundle }) => { bundle.resolutionPackage.sourceAtoms[0].unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['resolution target', ({ bundle }) => { target(bundle, 'target-emphasis').unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['caption entry', ({ bundle }) => { captionContract(bundle).unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['caption target', ({ bundle }) => { captionContract(bundle).captionTargets[0].unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['simultaneous group', ({ bundle }) => {
      captionContract(bundle).allowedSimultaneousGroups.push({
        simultaneousGroupId: 'group-unknown-field',
        targetIds: ['caption-source-target-001'],
        unknown: true,
      });
    }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['caption plan', ({ bundle }) => { captionContract(bundle).captionPlan.unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['cue', ({ bundle }) => { captionCue(bundle).unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['line', ({ bundle }) => { captionCue(bundle).lines[0].unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['start anchor', ({ bundle }) => { captionCue(bundle).startAnchor.unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['end anchor', ({ bundle }) => { captionCue(bundle).endAnchor.unknown = true; }, 'RESOLUTION_STRUCTURE_UNKNOWN_FIELD'],
    ['preset index', ({ bundle }) => { bundle.presetValidationIndex.unknown = true; }, 'PRESET_INDEX_UNKNOWN_FIELD'],
    ['preset entry', ({ bundle }) => { preset(bundle).unknown = true; }, 'PRESET_INDEX_UNKNOWN_FIELD'],
    ['preset policy', ({ bundle }) => { policy(bundle, 'information-narration').unknown = true; }, 'PRESET_INDEX_UNKNOWN_FIELD'],
    ['material index', ({ bundle }) => { bundle.materialValidationIndex.unknown = true; }, 'MATERIAL_INDEX_UNKNOWN_FIELD'],
    ['material entry', ({ bundle }) => { material(bundle, 'material-speaker-icon').unknown = true; }, 'MATERIAL_INDEX_UNKNOWN_FIELD'],
    ['compatible subject', ({ bundle }) => { material(bundle, 'material-speaker-icon').compatibleSubjects[0].unknown = true; }, 'MATERIAL_INDEX_UNKNOWN_FIELD'],
  ];
  for (const [name, mutate, expectedCode] of cases) {
    const state = { bundle: clone(VALID_BUNDLE), trust: clone(VALID_TRUST) };
    mutate(state);
    refreshHashes(state.bundle, state.trust);
    assert.ok(
      outerCodeSet(validatePresentationInstructionContract(state.bundle, state.trust)).has(expectedCode),
      `${name}の未知fieldを拒否できませんでした。`,
    );
  }
});

test('bundle・binding・指示書・解決package・指示・対象の必須field削除を対応コードで拒否する', () => {
  const remove = (object, field) => { delete object[field]; };
  const cases = [
    ['bundle.schemaVersion', ({ bundle }) => remove(bundle, 'schemaVersion'), 'BUNDLE_SCHEMA_VERSION_UNSUPPORTED'],
    ['bundle.instructionSet', ({ bundle }) => remove(bundle, 'instructionSet'), 'INSTRUCTION_SET_NOT_OBJECT'],
    ['bundle.resolutionPackage', ({ bundle }) => remove(bundle, 'resolutionPackage'), 'RESOLUTION_PACKAGE_NOT_OBJECT'],
    ['bundle.presetValidationIndex', ({ bundle }) => remove(bundle, 'presetValidationIndex'), 'PRESET_INDEX_INVALID'],
    ['bundle.materialValidationIndex', ({ bundle }) => remove(bundle, 'materialValidationIndex'), 'MATERIAL_INDEX_INVALID'],
    ['trust.schemaVersion', ({ trust }) => remove(trust, 'schemaVersion'), 'TRUST_BINDING_SCHEMA_VERSION_UNSUPPORTED'],
    ['trust.presetRegistryVersion', ({ trust }) => remove(trust, 'presetRegistryVersion'), 'TRUST_BINDING_VERSION_INVALID'],
    ['trust.presetValidationIndexSha256', () => {}, 'TRUST_BINDING_HASH_INVALID', ({ trust }) => remove(trust, 'presetValidationIndexSha256')],
    ['trust.materialRegistryVersion', ({ trust }) => remove(trust, 'materialRegistryVersion'), 'TRUST_BINDING_VERSION_INVALID'],
    ['trust.materialValidationIndexSha256', () => {}, 'TRUST_BINDING_HASH_INVALID', ({ trust }) => remove(trust, 'materialValidationIndexSha256')],
    ['instructionSet.schemaVersion', ({ bundle }) => remove(bundle.instructionSet, 'schemaVersion'), 'INSTRUCTION_SET_SCHEMA_VERSION_UNSUPPORTED'],
    ['instructionSet.instructionSetId', ({ bundle }) => remove(bundle.instructionSet, 'instructionSetId'), 'INSTRUCTION_SET_ID_INVALID'],
    ['instructionSet.format', ({ bundle }) => remove(bundle.instructionSet, 'format'), 'INSTRUCTION_SET_FORMAT_UNSUPPORTED'],
    ['instructionSet.rendererContractVersion', ({ bundle }) => remove(bundle.instructionSet, 'rendererContractVersion'), 'INSTRUCTION_SET_RENDERER_CONTRACT_VERSION_UNSUPPORTED'],
    ['instructionSet.sourceProvenance', ({ bundle }) => remove(bundle.instructionSet, 'sourceProvenance'), 'INSTRUCTION_SET_SOURCE_PROVENANCE_INVALID'],
    ['instructionSet.resolutionPackageId', ({ bundle }) => remove(bundle.instructionSet, 'resolutionPackageId'), 'INSTRUCTION_SET_RESOLUTION_PACKAGE_ID_INVALID'],
    ['instructionSet.resolutionPackageSha256', () => {}, 'INSTRUCTION_SET_RESOLUTION_PACKAGE_HASH_INVALID', ({ bundle }) => remove(bundle.instructionSet, 'resolutionPackageSha256')],
    ['instructionSet.presetRegistryVersion', ({ bundle }) => remove(bundle.instructionSet, 'presetRegistryVersion'), 'INSTRUCTION_SET_REGISTRY_VERSION_INVALID'],
    ['instructionSet.materialRegistryVersion', ({ bundle }) => remove(bundle.instructionSet, 'materialRegistryVersion'), 'INSTRUCTION_SET_REGISTRY_VERSION_INVALID'],
    ['instructionSet.instructions', ({ bundle }) => remove(bundle.instructionSet, 'instructions'), 'INSTRUCTION_SET_INSTRUCTIONS_NOT_ARRAY'],
    ['resolutionPackage.schemaVersion', ({ bundle }) => remove(bundle.resolutionPackage, 'schemaVersion'), 'RESOLUTION_PACKAGE_SCHEMA_VERSION_UNSUPPORTED'],
    ['resolutionPackage.resolutionPackageId', ({ bundle }) => remove(bundle.resolutionPackage, 'resolutionPackageId'), 'RESOLUTION_PACKAGE_ID_INVALID'],
    ['resolutionPackage.sourceProvenance', ({ bundle }) => remove(bundle.resolutionPackage, 'sourceProvenance'), 'RESOLUTION_PACKAGE_SOURCE_PROVENANCE_INVALID'],
    ['resolutionPackage.atomGranularity', ({ bundle }) => remove(bundle.resolutionPackage, 'atomGranularity'), 'RESOLUTION_PACKAGE_ATOM_GRANULARITY_UNSUPPORTED'],
    ['resolutionPackage.sourceAtomsSha256', ({ bundle }) => remove(bundle.resolutionPackage, 'sourceAtomsSha256'), 'RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_INVALID', ({ bundle }) => {
      remove(bundle.resolutionPackage, 'sourceAtomsSha256');
      bundle.instructionSet.resolutionPackageSha256 = sha256(bundle.resolutionPackage);
    }],
    ['resolutionPackage.sourceAtoms', ({ bundle }) => remove(bundle.resolutionPackage, 'sourceAtoms'), 'RESOLUTION_PACKAGE_SOURCE_ATOMS_NOT_ARRAY'],
    ['resolutionPackage.targets', ({ bundle }) => remove(bundle.resolutionPackage, 'targets'), 'RESOLUTION_PACKAGE_TARGETS_NOT_ARRAY'],
    ['resolutionPackage.captionContracts', ({ bundle }) => remove(bundle.resolutionPackage, 'captionContracts'), 'RESOLUTION_PACKAGE_CAPTION_CONTRACTS_NOT_ARRAY'],
    ['sourceAtom.atomId', ({ bundle }) => remove(bundle.resolutionPackage.sourceAtoms[0], 'atomId'), 'SOURCE_ATOM_ID_INVALID'],
    ['sourceAtom.speechId', ({ bundle }) => remove(bundle.resolutionPackage.sourceAtoms[0], 'speechId'), 'SOURCE_ATOM_SPEECH_ID_INVALID'],
    ['sourceAtom.text', ({ bundle }) => remove(bundle.resolutionPackage.sourceAtoms[0], 'text'), 'SOURCE_ATOM_TEXT_EMPTY'],
    ['sourceAtom.startMs', ({ bundle }) => remove(bundle.resolutionPackage.sourceAtoms[0], 'startMs'), 'SOURCE_ATOM_TIME_RANGE_INVALID'],
    ['sourceAtom.endMs', ({ bundle }) => remove(bundle.resolutionPackage.sourceAtoms[0], 'endMs'), 'SOURCE_ATOM_TIME_RANGE_INVALID'],
    ['instruction.instructionId', ({ bundle }) => remove(instruction(bundle, 'instruction-narration'), 'instructionId'), 'INSTRUCTION_ID_INVALID'],
    ['instruction.trigger', ({ bundle }) => remove(instruction(bundle, 'instruction-narration'), 'trigger'), 'INSTRUCTION_TRIGGER_INVALID'],
    ['instruction.trigger.startAtomId', ({ bundle }) => remove(instruction(bundle, 'instruction-narration').trigger, 'startAtomId'), 'INSTRUCTION_TRIGGER_INVALID'],
    ['instruction.kind', ({ bundle }) => remove(instruction(bundle, 'instruction-narration'), 'kind'), 'INSTRUCTION_KIND_UNSUPPORTED'],
    ['instruction.target', ({ bundle }) => remove(instruction(bundle, 'instruction-narration'), 'target'), 'INSTRUCTION_TARGET_INVALID'],
    ['instruction.target.targetType', ({ bundle }) => remove(instruction(bundle, 'instruction-narration').target, 'targetType'), 'INSTRUCTION_TARGET_INVALID'],
    ['instruction.target.targetRefIds', ({ bundle }) => remove(instruction(bundle, 'instruction-narration').target, 'targetRefIds'), 'INSTRUCTION_TARGET_CARDINALITY_INVALID'],
    ['instruction.presetId', ({ bundle }) => remove(instruction(bundle, 'instruction-narration'), 'presetId'), 'INSTRUCTION_PRESET_ID_INVALID'],
    ['instruction.materialRefs', ({ bundle }) => remove(instruction(bundle, 'instruction-narration'), 'materialRefs'), 'INSTRUCTION_MATERIAL_REFS_INVALID'],
    ['captionTarget.captionContractRefId', ({ bundle }) => remove(target(bundle, 'target-caption'), 'captionContractRefId'), 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['captionTarget.cueId', ({ bundle }) => remove(target(bundle, 'target-caption'), 'cueId'), 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['sourceRange.sourceAtomIds', ({ bundle }) => remove(target(bundle, 'target-emphasis'), 'sourceAtomIds'), 'TARGET_ENTRY_SOURCE_ATOMS_INVALID'],
    ['informationItem.informationItemId', ({ bundle }) => remove(target(bundle, 'target-narration'), 'informationItemId'), 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['informationItem.sourceAtomIds', ({ bundle }) => remove(target(bundle, 'target-narration'), 'sourceAtomIds'), 'TARGET_ENTRY_SOURCE_ATOMS_INVALID'],
    ['speaker.speakerId', ({ bundle }) => remove(target(bundle, 'target-speaker'), 'speakerId'), 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['speaker.speakerDisplayName', ({ bundle }) => remove(target(bundle, 'target-speaker'), 'speakerDisplayName'), 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['speaker.sourceAtomIds', ({ bundle }) => remove(target(bundle, 'target-speaker'), 'sourceAtomIds'), 'TARGET_ENTRY_SOURCE_ATOMS_INVALID'],
    ['reference.referenceSubjectId', ({ bundle }) => remove(target(bundle, 'target-reference'), 'referenceSubjectId'), 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['reference.sourceAtomIds', ({ bundle }) => remove(target(bundle, 'target-reference'), 'sourceAtomIds'), 'TARGET_ENTRY_SOURCE_ATOMS_INVALID'],
    ['target.targetRefId', ({ bundle }) => remove(target(bundle, 'target-emphasis'), 'targetRefId'), 'TARGET_ENTRY_ID_INVALID'],
    ['target.targetType', ({ bundle }) => remove(target(bundle, 'target-emphasis'), 'targetType'), 'TARGET_ENTRY_TYPE_UNSUPPORTED'],
  ];

  for (const [name, mutate, expectedCode, afterRefresh] of cases) {
    const state = { bundle: clone(VALID_BUNDLE), trust: clone(VALID_TRUST) };
    mutate(state);
    refreshHashes(state.bundle, state.trust);
    afterRefresh?.(state);
    assert.ok(
      reportCodeSet(validatePresentationInstructionContract(state.bundle, state.trust)).has(expectedCode),
      `${name}の削除で${expectedCode}が出ませんでした。`,
    );
  }
});

test('caption・preset・material各階層の必須field削除を対応コードで拒否する', () => {
  const remove = (object, field) => { delete object[field]; };
  const cases = [
    ['captionEntry.captionContractRefId', ({ bundle }) => remove(captionContract(bundle), 'captionContractRefId'), 'CAPTION_CONTRACT_ID_INVALID'],
    ['captionEntry.captionSchemaVersion', ({ bundle }) => remove(captionContract(bundle), 'captionSchemaVersion'), 'CAPTION_CONTRACT_SCHEMA_VERSION_UNSUPPORTED'],
    ['captionEntry.captionTargets', ({ bundle }) => remove(captionContract(bundle), 'captionTargets'), 'SOURCE_TARGETS_NOT_ARRAY'],
    ['captionEntry.allowedSimultaneousGroups', ({ bundle }) => remove(captionContract(bundle), 'allowedSimultaneousGroups'), 'SOURCE_SIMULTANEOUS_GROUPS_NOT_ARRAY'],
    ['captionEntry.captionPlan', ({ bundle }) => remove(captionContract(bundle), 'captionPlan'), 'CAPTION_PLAN_NOT_OBJECT'],
    ['captionSourceTarget.targetId', ({ bundle }) => remove(captionContract(bundle).captionTargets[0], 'targetId'), 'SOURCE_TARGET_ID_INVALID'],
    ['captionSourceTarget.requiredAtomIds', ({ bundle }) => remove(captionContract(bundle).captionTargets[0], 'requiredAtomIds'), 'SOURCE_TARGET_REQUIRED_ATOMS_INVALID'],
    ['captionSourceTarget.allowedOmissionAtomIds', ({ bundle }) => remove(captionContract(bundle).captionTargets[0], 'allowedOmissionAtomIds'), 'SOURCE_TARGET_OMISSIONS_NOT_ARRAY'],
    ['captionPlan.cues', ({ bundle }) => remove(captionContract(bundle).captionPlan, 'cues'), 'CAPTION_CUES_NOT_ARRAY'],
    ['cue.cueId', ({ bundle }) => remove(captionCue(bundle), 'cueId'), 'CAPTION_CUE_ID_INVALID'],
    ['cue.targetId', ({ bundle }) => remove(captionCue(bundle), 'targetId'), 'CAPTION_CUE_UNKNOWN_TARGET'],
    ['cue.lines', ({ bundle }) => remove(captionCue(bundle), 'lines'), 'G2_EMPTY_CUE'],
    ['cue.startAnchor', ({ bundle }) => remove(captionCue(bundle), 'startAnchor'), 'G3_START_ANCHOR_NOT_FIRST_ATOM'],
    ['cue.endAnchor', ({ bundle }) => remove(captionCue(bundle), 'endAnchor'), 'G3_END_ANCHOR_NOT_LAST_ATOM'],
    ['cue.startMs', ({ bundle }) => remove(captionCue(bundle), 'startMs'), 'G3_INVALID_TIME_RANGE'],
    ['cue.endMs', ({ bundle }) => remove(captionCue(bundle), 'endMs'), 'G3_INVALID_TIME_RANGE'],
    ['line.atomIds', ({ bundle }) => remove(captionCue(bundle).lines[0], 'atomIds'), 'G2_EMPTY_LINE'],
    ['line.renderedText', ({ bundle }) => remove(captionCue(bundle).lines[0], 'renderedText'), 'G2_BOUNDARY_REPRESENTATION_INVALID'],
    ['startAnchor.atomId', ({ bundle }) => remove(captionCue(bundle).startAnchor, 'atomId'), 'G3_START_ANCHOR_NOT_FIRST_ATOM'],
    ['startAnchor.edge', ({ bundle }) => remove(captionCue(bundle).startAnchor, 'edge'), 'G3_START_ANCHOR_NOT_FIRST_ATOM'],
    ['endAnchor.atomId', ({ bundle }) => remove(captionCue(bundle).endAnchor, 'atomId'), 'G3_END_ANCHOR_NOT_LAST_ATOM'],
    ['endAnchor.edge', ({ bundle }) => remove(captionCue(bundle).endAnchor, 'edge'), 'G3_END_ANCHOR_NOT_LAST_ATOM'],
    ['simultaneousGroup.simultaneousGroupId', ({ bundle }) => {
      captionContract(bundle).allowedSimultaneousGroups.push({ targetIds: ['caption-source-target-001'] });
    }, 'SOURCE_SIMULTANEOUS_GROUP_ID_INVALID'],
    ['simultaneousGroup.targetIds', ({ bundle }) => {
      captionContract(bundle).allowedSimultaneousGroups.push({ simultaneousGroupId: 'group-missing-targets' });
    }, 'SOURCE_SIMULTANEOUS_GROUP_TARGETS_INVALID'],
    ['presetIndex.registryVersion', ({ bundle }) => remove(bundle.presetValidationIndex, 'registryVersion'), 'PRESET_INDEX_VERSION_INVALID'],
    ['presetIndex.presets', ({ bundle }) => remove(bundle.presetValidationIndex, 'presets'), 'PRESET_INDEX_INVALID'],
    ['presetEntry.presetId', ({ bundle }) => remove(preset(bundle), 'presetId'), 'PRESET_ENTRY_ID_INVALID'],
    ['presetEntry.format', ({ bundle }) => remove(preset(bundle), 'format'), 'PRESET_ENTRY_FORMAT_UNSUPPORTED'],
    ['presetEntry.kindPolicies', ({ bundle }) => remove(preset(bundle), 'kindPolicies'), 'PRESET_KIND_POLICIES_INVALID'],
    ['presetPolicy.kind', ({ bundle }) => remove(policy(bundle, 'information-narration'), 'kind'), 'PRESET_KIND_POLICY_INVALID'],
    ['presetPolicy.endResponsibility', ({ bundle }) => remove(policy(bundle, 'information-narration'), 'endResponsibility'), 'PRESET_KIND_POLICY_INVALID'],
    ['presetPolicy.endPolicyId', ({ bundle }) => remove(policy(bundle, 'information-narration'), 'endPolicyId'), 'PRESET_END_POLICY_MISSING'],
    ['presetPolicy.allowedMaterialRoles', ({ bundle }) => remove(policy(bundle, 'information-narration'), 'allowedMaterialRoles'), 'PRESET_KIND_POLICY_INVALID'],
    ['presetPolicy.requiredMaterialRoles', ({ bundle }) => remove(policy(bundle, 'information-narration'), 'requiredMaterialRoles'), 'PRESET_KIND_POLICY_INVALID'],
    ['materialIndex.registryVersion', ({ bundle }) => remove(bundle.materialValidationIndex, 'registryVersion'), 'MATERIAL_INDEX_VERSION_INVALID'],
    ['materialIndex.materials', ({ bundle }) => remove(bundle.materialValidationIndex, 'materials'), 'MATERIAL_INDEX_INVALID'],
    ['materialEntry.materialId', ({ bundle }) => remove(material(bundle, 'material-speaker-icon'), 'materialId'), 'MATERIAL_ENTRY_ID_INVALID'],
    ['materialEntry.role', ({ bundle }) => remove(material(bundle, 'material-speaker-icon'), 'role'), 'MATERIAL_ROLE_UNSUPPORTED'],
    ['materialEntry.compatibleSubjects', ({ bundle }) => remove(material(bundle, 'material-speaker-icon'), 'compatibleSubjects'), 'MATERIAL_COMPATIBLE_SUBJECTS_INVALID'],
    ['compatibleSubject.subjectType', ({ bundle }) => remove(material(bundle, 'material-speaker-icon').compatibleSubjects[0], 'subjectType'), 'MATERIAL_COMPATIBLE_SUBJECTS_INVALID'],
    ['compatibleSubject.subjectId', ({ bundle }) => remove(material(bundle, 'material-speaker-icon').compatibleSubjects[0], 'subjectId'), 'MATERIAL_COMPATIBLE_SUBJECTS_INVALID'],
  ];

  for (const [name, mutate, expectedCode] of cases) {
    const state = { bundle: clone(VALID_BUNDLE), trust: clone(VALID_TRUST) };
    mutate(state);
    refreshHashes(state.bundle, state.trust);
    assert.ok(
      reportCodeSet(validatePresentationInstructionContract(state.bundle, state.trust)).has(expectedCode),
      `${name}の削除で${expectedCode}が出ませんでした。`,
    );
  }
});

test('任意fieldは許可条件だけを通し、caption終了方針の越権を拒否する', () => {
  const optionalAbsentBundle = clone(VALID_BUNDLE);
  const optionalAbsentTrust = clone(VALID_TRUST);
  delete optionalAbsentBundle.resolutionPackage.sourceAtoms[0].speaker;
  assert.ok(!('speakerId' in target(optionalAbsentBundle, 'target-narration')));
  assert.ok(!('simultaneousGroupId' in captionCue(optionalAbsentBundle)));
  refreshHashes(optionalAbsentBundle, optionalAbsentTrust);
  assert.equal(validatePresentationInstructionContract(optionalAbsentBundle, optionalAbsentTrust).overallStatus, 'passed');

  const optionalInformationSpeakerBundle = clone(VALID_BUNDLE);
  const optionalInformationSpeakerTrust = clone(VALID_TRUST);
  target(optionalInformationSpeakerBundle, 'target-narration').speakerId = 'speaker-marine';
  refreshHashes(optionalInformationSpeakerBundle, optionalInformationSpeakerTrust);
  assert.equal(
    validatePresentationInstructionContract(optionalInformationSpeakerBundle, optionalInformationSpeakerTrust).overallStatus,
    'passed',
  );

  assert.ok('endPolicyId' in policy(VALID_BUNDLE, 'information-narration'));
  const forbiddenCaptionEndBundle = clone(VALID_BUNDLE);
  const forbiddenCaptionEndTrust = clone(VALID_TRUST);
  policy(forbiddenCaptionEndBundle, 'speech-caption').endPolicyId = 'forbidden-caption-end';
  refreshHashes(forbiddenCaptionEndBundle, forbiddenCaptionEndTrust);
  assert.ok(
    outerCodeSet(validatePresentationInstructionContract(forbiddenCaptionEndBundle, forbiddenCaptionEndTrust))
      .has('PRESET_END_POLICY_FORBIDDEN'),
  );
});

test('全階層の必須fieldを1つずつ欠落させると対応する契約違反になる', () => {
  const cases = [
    ['bundle schemaVersion', ({ bundle }) => { delete bundle.schemaVersion; }, 'BUNDLE_SCHEMA_VERSION_UNSUPPORTED'],
    ['bundle instructionSet', ({ bundle }) => { delete bundle.instructionSet; }, 'INSTRUCTION_SET_NOT_OBJECT'],
    ['bundle resolutionPackage', ({ bundle }) => { delete bundle.resolutionPackage; }, 'RESOLUTION_PACKAGE_NOT_OBJECT'],
    ['bundle presetValidationIndex', ({ bundle }) => { delete bundle.presetValidationIndex; }, 'PRESET_INDEX_INVALID'],
    ['bundle materialValidationIndex', ({ bundle }) => { delete bundle.materialValidationIndex; }, 'MATERIAL_INDEX_INVALID'],
    ['binding schemaVersion', ({ trust }) => { delete trust.schemaVersion; }, 'TRUST_BINDING_SCHEMA_VERSION_UNSUPPORTED'],
    ['binding presetRegistryVersion', ({ trust }) => { delete trust.presetRegistryVersion; }, 'TRUST_BINDING_VERSION_INVALID'],
    ['binding preset hash', ({ trust }) => { delete trust.presetValidationIndexSha256; }, 'TRUST_BINDING_HASH_INVALID'],
    ['binding materialRegistryVersion', ({ trust }) => { delete trust.materialRegistryVersion; }, 'TRUST_BINDING_VERSION_INVALID'],
    ['binding material hash', ({ trust }) => { delete trust.materialValidationIndexSha256; }, 'TRUST_BINDING_HASH_INVALID'],
    ['instruction set schemaVersion', ({ bundle }) => { delete bundle.instructionSet.schemaVersion; }, 'INSTRUCTION_SET_SCHEMA_VERSION_UNSUPPORTED'],
    ['instruction set ID', ({ bundle }) => { delete bundle.instructionSet.instructionSetId; }, 'INSTRUCTION_SET_ID_INVALID'],
    ['instruction set format', ({ bundle }) => { delete bundle.instructionSet.format; }, 'INSTRUCTION_SET_FORMAT_UNSUPPORTED'],
    ['renderer contract version', ({ bundle }) => { delete bundle.instructionSet.rendererContractVersion; }, 'INSTRUCTION_SET_RENDERER_CONTRACT_VERSION_UNSUPPORTED'],
    ['instruction source provenance', ({ bundle }) => { delete bundle.instructionSet.sourceProvenance; }, 'INSTRUCTION_SET_SOURCE_PROVENANCE_INVALID'],
    ['instruction resolution package ID', ({ bundle }) => { delete bundle.instructionSet.resolutionPackageId; }, 'INSTRUCTION_SET_RESOLUTION_PACKAGE_ID_INVALID'],
    ['instruction resolution package hash', ({ bundle }) => { delete bundle.instructionSet.resolutionPackageSha256; }, 'INSTRUCTION_SET_RESOLUTION_PACKAGE_HASH_INVALID'],
    ['instruction preset registry version', ({ bundle }) => { delete bundle.instructionSet.presetRegistryVersion; }, 'INSTRUCTION_SET_REGISTRY_VERSION_INVALID'],
    ['instruction material registry version', ({ bundle }) => { delete bundle.instructionSet.materialRegistryVersion; }, 'INSTRUCTION_SET_REGISTRY_VERSION_INVALID'],
    ['instruction list', ({ bundle }) => { delete bundle.instructionSet.instructions; }, 'INSTRUCTION_SET_INSTRUCTIONS_NOT_ARRAY'],
    ['resolution schemaVersion', ({ bundle }) => { delete bundle.resolutionPackage.schemaVersion; }, 'RESOLUTION_PACKAGE_SCHEMA_VERSION_UNSUPPORTED'],
    ['resolution package ID', ({ bundle }) => { delete bundle.resolutionPackage.resolutionPackageId; }, 'RESOLUTION_PACKAGE_ID_INVALID'],
    ['resolution source provenance', ({ bundle }) => { delete bundle.resolutionPackage.sourceProvenance; }, 'RESOLUTION_PACKAGE_SOURCE_PROVENANCE_INVALID'],
    ['resolution atom granularity', ({ bundle }) => { delete bundle.resolutionPackage.atomGranularity; }, 'RESOLUTION_PACKAGE_ATOM_GRANULARITY_UNSUPPORTED'],
    ['resolution source hash', ({ bundle }) => { delete bundle.resolutionPackage.sourceAtomsSha256; }, 'RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_INVALID'],
    ['resolution source atoms', ({ bundle }) => { delete bundle.resolutionPackage.sourceAtoms; }, 'RESOLUTION_PACKAGE_SOURCE_ATOMS_NOT_ARRAY'],
    ['resolution targets', ({ bundle }) => { delete bundle.resolutionPackage.targets; }, 'RESOLUTION_PACKAGE_TARGETS_NOT_ARRAY'],
    ['resolution caption contracts', ({ bundle }) => { delete bundle.resolutionPackage.captionContracts; }, 'RESOLUTION_PACKAGE_CAPTION_CONTRACTS_NOT_ARRAY'],
    ['source atom ID', ({ bundle }) => { delete bundle.resolutionPackage.sourceAtoms[0].atomId; }, 'SOURCE_ATOM_ID_INVALID'],
    ['source speech ID', ({ bundle }) => { delete bundle.resolutionPackage.sourceAtoms[0].speechId; }, 'SOURCE_ATOM_SPEECH_ID_INVALID'],
    ['source text', ({ bundle }) => { delete bundle.resolutionPackage.sourceAtoms[0].text; }, 'SOURCE_ATOM_TEXT_EMPTY'],
    ['source startMs', ({ bundle }) => { delete bundle.resolutionPackage.sourceAtoms[0].startMs; }, 'SOURCE_ATOM_TIME_RANGE_INVALID'],
    ['source endMs', ({ bundle }) => { delete bundle.resolutionPackage.sourceAtoms[0].endMs; }, 'SOURCE_ATOM_TIME_RANGE_INVALID'],
    ['instruction ID', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').instructionId; }, 'INSTRUCTION_ID_INVALID'],
    ['instruction trigger', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').trigger; }, 'INSTRUCTION_TRIGGER_INVALID'],
    ['trigger start atom', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').trigger.startAtomId; }, 'INSTRUCTION_TRIGGER_INVALID'],
    ['instruction kind', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').kind; }, 'INSTRUCTION_KIND_UNSUPPORTED'],
    ['instruction target', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').target; }, 'INSTRUCTION_TARGET_INVALID'],
    ['instruction target type', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').target.targetType; }, 'INSTRUCTION_TARGET_INVALID'],
    ['instruction target IDs', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').target.targetRefIds; }, 'INSTRUCTION_TARGET_CARDINALITY_INVALID'],
    ['instruction preset', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').presetId; }, 'INSTRUCTION_PRESET_ID_INVALID'],
    ['instruction materials', ({ bundle }) => { delete instruction(bundle, 'instruction-narration').materialRefs; }, 'INSTRUCTION_MATERIAL_REFS_INVALID'],
    ['caption target ID', ({ bundle }) => { delete target(bundle, 'target-caption').targetRefId; }, 'TARGET_ENTRY_ID_INVALID'],
    ['caption target type', ({ bundle }) => { delete target(bundle, 'target-caption').targetType; }, 'TARGET_ENTRY_TYPE_UNSUPPORTED'],
    ['caption contract reference', ({ bundle }) => { delete target(bundle, 'target-caption').captionContractRefId; }, 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['caption cue reference', ({ bundle }) => { delete target(bundle, 'target-caption').cueId; }, 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['source-range atoms', ({ bundle }) => { delete target(bundle, 'target-emphasis').sourceAtomIds; }, 'TARGET_ENTRY_SOURCE_ATOMS_INVALID'],
    ['information item ID', ({ bundle }) => { delete target(bundle, 'target-comment').informationItemId; }, 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['information item atoms', ({ bundle }) => { delete target(bundle, 'target-comment').sourceAtomIds; }, 'TARGET_ENTRY_SOURCE_ATOMS_INVALID'],
    ['speaker ID', ({ bundle }) => { delete target(bundle, 'target-speaker').speakerId; }, 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['speaker display name', ({ bundle }) => { delete target(bundle, 'target-speaker').speakerDisplayName; }, 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['speaker atoms', ({ bundle }) => { delete target(bundle, 'target-speaker').sourceAtomIds; }, 'TARGET_ENTRY_SOURCE_ATOMS_INVALID'],
    ['reference subject ID', ({ bundle }) => { delete target(bundle, 'target-reference').referenceSubjectId; }, 'TARGET_ENTRY_TYPE_PAYLOAD_INVALID'],
    ['reference atoms', ({ bundle }) => { delete target(bundle, 'target-reference').sourceAtomIds; }, 'TARGET_ENTRY_SOURCE_ATOMS_INVALID'],
    ['caption entry ID', ({ bundle }) => { delete captionContract(bundle).captionContractRefId; }, 'CAPTION_CONTRACT_ID_INVALID'],
    ['caption entry schema', ({ bundle }) => { delete captionContract(bundle).captionSchemaVersion; }, 'CAPTION_CONTRACT_SCHEMA_VERSION_UNSUPPORTED'],
    ['caption targets', ({ bundle }) => { delete captionContract(bundle).captionTargets; }, 'SOURCE_TARGETS_NOT_ARRAY'],
    ['simultaneous groups', ({ bundle }) => { delete captionContract(bundle).allowedSimultaneousGroups; }, 'SOURCE_SIMULTANEOUS_GROUPS_NOT_ARRAY'],
    ['caption plan', ({ bundle }) => { delete captionContract(bundle).captionPlan; }, 'CAPTION_PLAN_NOT_OBJECT'],
    ['caption source target ID', ({ bundle }) => { delete captionContract(bundle).captionTargets[0].targetId; }, 'SOURCE_TARGET_ID_INVALID'],
    ['caption required atoms', ({ bundle }) => { delete captionContract(bundle).captionTargets[0].requiredAtomIds; }, 'SOURCE_TARGET_REQUIRED_ATOMS_INVALID'],
    ['caption omissions', ({ bundle }) => { delete captionContract(bundle).captionTargets[0].allowedOmissionAtomIds; }, 'SOURCE_TARGET_OMISSIONS_NOT_ARRAY'],
    ['simultaneous group ID', ({ bundle }) => { addValidSecondCaptionCue(bundle); delete captionContract(bundle).allowedSimultaneousGroups[0].simultaneousGroupId; }, 'SOURCE_SIMULTANEOUS_GROUP_ID_INVALID'],
    ['simultaneous group targets', ({ bundle }) => { addValidSecondCaptionCue(bundle); delete captionContract(bundle).allowedSimultaneousGroups[0].targetIds; }, 'SOURCE_SIMULTANEOUS_GROUP_TARGETS_INVALID'],
    ['cue ID', ({ bundle }) => { delete captionCue(bundle).cueId; }, 'CAPTION_CUE_ID_INVALID'],
    ['cue target ID', ({ bundle }) => { delete captionCue(bundle).targetId; }, 'CAPTION_CUE_UNKNOWN_TARGET'],
    ['cue lines', ({ bundle }) => { delete captionCue(bundle).lines; }, 'G2_EMPTY_CUE'],
    ['cue start anchor', ({ bundle }) => { delete captionCue(bundle).startAnchor; }, 'G3_START_ANCHOR_NOT_FIRST_ATOM'],
    ['cue end anchor', ({ bundle }) => { delete captionCue(bundle).endAnchor; }, 'G3_END_ANCHOR_NOT_LAST_ATOM'],
    ['cue start time', ({ bundle }) => { delete captionCue(bundle).startMs; }, 'G3_START_TIME_NOT_ANCHORED'],
    ['cue end time', ({ bundle }) => { delete captionCue(bundle).endMs; }, 'G3_END_TIME_NOT_ANCHORED'],
    ['line atoms', ({ bundle }) => { delete captionCue(bundle).lines[0].atomIds; }, 'G2_EMPTY_LINE'],
    ['line rendered text', ({ bundle }) => { delete captionCue(bundle).lines[0].renderedText; }, 'G2_BOUNDARY_REPRESENTATION_INVALID'],
    ['start anchor atom', ({ bundle }) => { delete captionCue(bundle).startAnchor.atomId; }, 'G3_START_ANCHOR_NOT_FIRST_ATOM'],
    ['start anchor edge', ({ bundle }) => { delete captionCue(bundle).startAnchor.edge; }, 'G3_START_ANCHOR_NOT_FIRST_ATOM'],
    ['end anchor atom', ({ bundle }) => { delete captionCue(bundle).endAnchor.atomId; }, 'G3_END_ANCHOR_NOT_LAST_ATOM'],
    ['end anchor edge', ({ bundle }) => { delete captionCue(bundle).endAnchor.edge; }, 'G3_END_ANCHOR_NOT_LAST_ATOM'],
    ['preset index version', ({ bundle }) => { delete bundle.presetValidationIndex.registryVersion; }, 'PRESET_INDEX_VERSION_INVALID'],
    ['preset entries', ({ bundle }) => { delete bundle.presetValidationIndex.presets; }, 'PRESET_INDEX_INVALID'],
    ['preset ID', ({ bundle }) => { delete preset(bundle).presetId; }, 'PRESET_ENTRY_ID_INVALID'],
    ['preset format', ({ bundle }) => { delete preset(bundle).format; }, 'PRESET_ENTRY_FORMAT_UNSUPPORTED'],
    ['preset policies', ({ bundle }) => { delete preset(bundle).kindPolicies; }, 'PRESET_KIND_POLICIES_INVALID'],
    ['policy kind', ({ bundle }) => { delete policy(bundle, 'information-narration').kind; }, 'PRESET_KIND_POLICY_INVALID'],
    ['policy end responsibility', ({ bundle }) => { delete policy(bundle, 'information-narration').endResponsibility; }, 'PRESET_KIND_POLICY_INVALID'],
    ['policy end ID', ({ bundle }) => { delete policy(bundle, 'information-narration').endPolicyId; }, 'PRESET_END_POLICY_MISSING'],
    ['policy allowed roles', ({ bundle }) => { delete policy(bundle, 'information-narration').allowedMaterialRoles; }, 'PRESET_KIND_POLICY_INVALID'],
    ['policy required roles', ({ bundle }) => { delete policy(bundle, 'information-narration').requiredMaterialRoles; }, 'PRESET_KIND_POLICY_INVALID'],
    ['material index version', ({ bundle }) => { delete bundle.materialValidationIndex.registryVersion; }, 'MATERIAL_INDEX_VERSION_INVALID'],
    ['material entries', ({ bundle }) => { delete bundle.materialValidationIndex.materials; }, 'MATERIAL_INDEX_INVALID'],
    ['material ID', ({ bundle }) => { delete material(bundle, 'material-speaker-icon').materialId; }, 'MATERIAL_ENTRY_ID_INVALID'],
    ['material role', ({ bundle }) => { delete material(bundle, 'material-speaker-icon').role; }, 'MATERIAL_ROLE_UNSUPPORTED'],
    ['material subjects', ({ bundle }) => { delete material(bundle, 'material-speaker-icon').compatibleSubjects; }, 'MATERIAL_COMPATIBLE_SUBJECTS_INVALID'],
    ['subject type', ({ bundle }) => { delete material(bundle, 'material-speaker-icon').compatibleSubjects[0].subjectType; }, 'MATERIAL_COMPATIBLE_SUBJECTS_INVALID'],
    ['subject ID', ({ bundle }) => { delete material(bundle, 'material-speaker-icon').compatibleSubjects[0].subjectId; }, 'MATERIAL_COMPATIBLE_SUBJECTS_INVALID'],
  ];

  for (const [name, mutate, expectedCode] of cases) {
    const state = { bundle: clone(VALID_BUNDLE), trust: clone(VALID_TRUST) };
    mutate(state);
    const report = validatePresentationInstructionContract(state.bundle, state.trust);
    assert.ok(reportCodeSet(report).has(expectedCode), `${name}欠落時に${expectedCode}を検出できませんでした。`);
  }
});

test('任意fieldは許可された文脈だけで有無の両方を受け付ける', () => {
  const withoutSpeakerBundle = clone(VALID_BUNDLE);
  const withoutSpeakerTrust = clone(VALID_TRUST);
  delete withoutSpeakerBundle.resolutionPackage.sourceAtoms[1].speaker;
  refreshHashes(withoutSpeakerBundle, withoutSpeakerTrust);
  assert.equal(validatePresentationInstructionContract(withoutSpeakerBundle, withoutSpeakerTrust).overallStatus, 'passed');

  const optionalInformationSpeakerBundle = clone(VALID_BUNDLE);
  const optionalInformationSpeakerTrust = clone(VALID_TRUST);
  const commentInstruction = instruction(optionalInformationSpeakerBundle, 'instruction-comment');
  commentInstruction.kind = 'information-narration';
  commentInstruction.materialRefs = [];
  delete target(optionalInformationSpeakerBundle, 'target-comment').speakerId;
  refreshHashes(optionalInformationSpeakerBundle, optionalInformationSpeakerTrust);
  assert.equal(
    validatePresentationInstructionContract(optionalInformationSpeakerBundle, optionalInformationSpeakerTrust).overallStatus,
    'passed',
  );

  const simultaneousBundle = clone(VALID_BUNDLE);
  const simultaneousTrust = clone(VALID_TRUST);
  addValidSecondCaptionCue(simultaneousBundle);
  refreshHashes(simultaneousBundle, simultaneousTrust);
  assert.equal(validatePresentationInstructionContract(simultaneousBundle, simultaneousTrust).overallStatus, 'passed');
  assert.equal(validatePresentationInstructionContract(clone(VALID_BUNDLE), clone(VALID_TRUST)).overallStatus, 'passed');
});

test('重複IDは下流接続を満たしたことにせず曖昧失敗にする', () => {
  const cases = [
    ['source atom', ({ bundle }) => { bundle.resolutionPackage.sourceAtoms[1].atomId = 'a-01'; }, ['INSTRUCTION_TRIGGER_UNKNOWN_ATOM']],
    ['target', ({ bundle }) => { bundle.resolutionPackage.targets.push(clone(target(bundle, 'target-emphasis'))); }, ['INSTRUCTION_TARGET_REFERENCE_UNKNOWN']],
    ['preset', ({ bundle }) => { bundle.presetValidationIndex.presets.push(clone(preset(bundle))); }, ['INSTRUCTION_PRESET_UNKNOWN']],
    ['preset policy', ({ bundle }) => { preset(bundle).kindPolicies.push(clone(policy(bundle, 'information-comment'))); }, ['INSTRUCTION_PRESET_KIND_UNSUPPORTED']],
    ['material', ({ bundle }) => {
      policy(bundle, 'speaker-identification').requiredMaterialRoles = ['speaker-icon'];
      bundle.materialValidationIndex.materials.push(clone(material(bundle, 'material-speaker-icon')));
    }, ['INSTRUCTION_MATERIAL_UNKNOWN', 'INSTRUCTION_REQUIRED_MATERIAL_MISSING']],
    ['instruction', ({ bundle }) => { bundle.instructionSet.instructions.push(clone(instruction(bundle, 'instruction-narration'))); }, ['TARGET_WITHOUT_INSTRUCTION']],
    ['caption instruction', ({ bundle }) => { bundle.instructionSet.instructions.push(clone(instruction(bundle, 'instruction-caption'))); }, ['TARGET_WITHOUT_INSTRUCTION', 'CAPTION_CUE_WITHOUT_INSTRUCTION']],
    ['caption contract', ({ bundle }) => { bundle.resolutionPackage.captionContracts.push(clone(captionContract(bundle))); }, ['CAPTION_TARGET_CUE_UNKNOWN']],
  ];
  for (const [name, mutate, downstreamCodes] of cases) {
    const state = { bundle: clone(VALID_BUNDLE), trust: clone(VALID_TRUST) };
    mutate(state);
    refreshHashes(state.bundle, state.trust);
    const report = validatePresentationInstructionContract(state.bundle, state.trust);
    for (const downstreamCode of downstreamCodes) {
      assert.ok(outerCodeSet(report).has(downstreamCode), `${name}重複を下流で一意解決してしまいました。`);
    }
  }
});

test('未検査範囲は5件を固定順で明示する', () => {
  const report = validatePresentationInstructionContract(clone(VALID_BUNDLE), clone(VALID_TRUST));
  assert.deepEqual(report.scopeExclusions, [
    'G4_TO_G7_SEMANTIC_CORRECTNESS_NOT_VERIFIED',
    'PRESET_VISUAL_QUALITY_NOT_VERIFIED',
    'POST_RENDER_QC_NOT_VERIFIED',
    'VISUAL_ONLY_TRIGGER_NOT_SUPPORTED',
    'INSTRUCTION_TEMPORAL_COLLISION_NOT_VERIFIED',
  ]);
});

test('旧telopPlanを推測変換しない', async () => {
  const legacy = await readFixture('legacy-telop-plan.json');
  const report = validatePresentationInstructionContract(legacy, clone(VALID_TRUST));
  assert.equal(report.overallStatus, 'failed');
  assert.ok(outerCodeSet(report).has('BUNDLE_UNKNOWN_FIELD'));
});

const mutationProbe = (code, mutate, { refresh = true, afterRefresh } = {}) => ({
  code,
  make() {
    const state = { bundle: clone(VALID_BUNDLE), trust: clone(VALID_TRUST) };
    mutate(state);
    if (refresh) refreshHashes(state.bundle, state.trust);
    afterRefresh?.(state);
    return state;
  },
});

const violationProbes = [
  mutationProbe('BUNDLE_INPUT_NOT_OBJECT', (state) => { state.bundle = null; }),
  mutationProbe('BUNDLE_SCHEMA_VERSION_UNSUPPORTED', ({ bundle }) => { bundle.schemaVersion = 'unsupported'; }),
  mutationProbe('BUNDLE_UNKNOWN_FIELD', ({ bundle }) => { bundle.legacy = true; }),
  mutationProbe('TRUST_BINDING_NOT_OBJECT', (state) => { state.trust = null; }),
  mutationProbe('TRUST_BINDING_SCHEMA_VERSION_UNSUPPORTED', ({ trust }) => { trust.schemaVersion = 'unsupported'; }),
  mutationProbe('TRUST_BINDING_UNKNOWN_FIELD', ({ trust }) => { trust.legacy = true; }),
  mutationProbe('TRUST_BINDING_VERSION_INVALID', ({ trust }) => { trust.presetRegistryVersion = ''; }),
  mutationProbe(
    'TRUST_BINDING_HASH_INVALID',
    () => {},
    { afterRefresh: ({ trust }) => { trust.presetValidationIndexSha256 = 'INVALID'; } },
  ),
  mutationProbe('TRUST_PRESET_VERSION_MISMATCH', ({ trust }) => { trust.presetRegistryVersion = 'other-preset-v001'; }),
  mutationProbe(
    'TRUST_PRESET_HASH_MISMATCH',
    () => {},
    { afterRefresh: ({ trust }) => { trust.presetValidationIndexSha256 = '0'.repeat(64); } },
  ),
  mutationProbe('TRUST_MATERIAL_VERSION_MISMATCH', ({ trust }) => { trust.materialRegistryVersion = 'other-material-v001'; }),
  mutationProbe(
    'TRUST_MATERIAL_HASH_MISMATCH',
    () => {},
    { afterRefresh: ({ trust }) => { trust.materialValidationIndexSha256 = '0'.repeat(64); } },
  ),

  mutationProbe('INSTRUCTION_SET_NOT_OBJECT', ({ bundle }) => { bundle.instructionSet = null; }),
  mutationProbe('INSTRUCTION_SET_SCHEMA_VERSION_UNSUPPORTED', ({ bundle }) => { bundle.instructionSet.schemaVersion = 'unsupported'; }),
  mutationProbe('INSTRUCTION_SET_UNKNOWN_FIELD', ({ bundle }) => { bundle.instructionSet.telopPlan = []; }),
  mutationProbe('INSTRUCTION_SET_ID_INVALID', ({ bundle }) => { bundle.instructionSet.instructionSetId = ''; }),
  mutationProbe('INSTRUCTION_SET_FORMAT_UNSUPPORTED', ({ bundle }) => { bundle.instructionSet.format = 'vertical-short'; }),
  mutationProbe('INSTRUCTION_SET_RENDERER_CONTRACT_VERSION_UNSUPPORTED', ({ bundle }) => { bundle.instructionSet.rendererContractVersion = 'unsupported'; }),
  mutationProbe('INSTRUCTION_SET_SOURCE_PROVENANCE_INVALID', ({ bundle }) => { bundle.instructionSet.sourceProvenance = ''; }),
  mutationProbe('INSTRUCTION_SET_RESOLUTION_PACKAGE_ID_INVALID', ({ bundle }) => { bundle.instructionSet.resolutionPackageId = ''; }),
  mutationProbe(
    'INSTRUCTION_SET_RESOLUTION_PACKAGE_HASH_INVALID',
    () => {},
    { afterRefresh: ({ bundle }) => { bundle.instructionSet.resolutionPackageSha256 = 'INVALID'; } },
  ),
  mutationProbe('INSTRUCTION_SET_REGISTRY_VERSION_INVALID', ({ bundle }) => { bundle.instructionSet.presetRegistryVersion = ''; }),
  mutationProbe('INSTRUCTION_SET_REGISTRY_VERSION_MISMATCH', ({ bundle }) => { bundle.instructionSet.presetRegistryVersion = 'other-preset-v001'; }),
  mutationProbe('INSTRUCTION_SET_INSTRUCTIONS_NOT_ARRAY', ({ bundle }) => { bundle.instructionSet.instructions = null; }),

  mutationProbe('RESOLUTION_PACKAGE_NOT_OBJECT', ({ bundle }) => { bundle.resolutionPackage = null; }),
  mutationProbe('RESOLUTION_PACKAGE_SCHEMA_VERSION_UNSUPPORTED', ({ bundle }) => { bundle.resolutionPackage.schemaVersion = 'unsupported'; }),
  mutationProbe('RESOLUTION_PACKAGE_UNKNOWN_FIELD', ({ bundle }) => { bundle.resolutionPackage.legacy = true; }),
  mutationProbe('RESOLUTION_PACKAGE_ID_INVALID', ({ bundle }) => { bundle.resolutionPackage.resolutionPackageId = ''; }),
  mutationProbe('RESOLUTION_PACKAGE_ID_MISMATCH', ({ bundle }) => { bundle.resolutionPackage.resolutionPackageId = 'other-resolution-v001'; }),
  mutationProbe(
    'RESOLUTION_PACKAGE_HASH_MISMATCH',
    () => {},
    { afterRefresh: ({ bundle }) => { bundle.instructionSet.resolutionPackageSha256 = '0'.repeat(64); } },
  ),
  mutationProbe('RESOLUTION_PACKAGE_SOURCE_PROVENANCE_INVALID', ({ bundle }) => { bundle.resolutionPackage.sourceProvenance = ''; }),
  mutationProbe('RESOLUTION_PACKAGE_SOURCE_PROVENANCE_MISMATCH', ({ bundle }) => { bundle.resolutionPackage.sourceProvenance = 'other-source-v001'; }),
  mutationProbe('RESOLUTION_PACKAGE_ATOM_GRANULARITY_UNSUPPORTED', ({ bundle }) => { bundle.resolutionPackage.atomGranularity = 'sentence-timestamp'; }),
  mutationProbe('RESOLUTION_PACKAGE_SOURCE_ATOMS_NOT_ARRAY', ({ bundle }) => { bundle.resolutionPackage.sourceAtoms = null; }),
  mutationProbe(
    'RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_INVALID',
    () => {},
    { afterRefresh: ({ bundle }) => {
      bundle.resolutionPackage.sourceAtomsSha256 = 'INVALID';
      bundle.instructionSet.resolutionPackageSha256 = sha256(bundle.resolutionPackage);
    } },
  ),
  mutationProbe(
    'RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_MISMATCH',
    () => {},
    { afterRefresh: ({ bundle }) => {
      bundle.resolutionPackage.sourceAtomsSha256 = '0'.repeat(64);
      bundle.instructionSet.resolutionPackageSha256 = sha256(bundle.resolutionPackage);
    } },
  ),
  mutationProbe('RESOLUTION_PACKAGE_TARGETS_NOT_ARRAY', ({ bundle }) => { bundle.resolutionPackage.targets = null; }),
  mutationProbe('RESOLUTION_PACKAGE_CAPTION_CONTRACTS_NOT_ARRAY', ({ bundle }) => { bundle.resolutionPackage.captionContracts = null; }),
  mutationProbe('RESOLUTION_PACKAGE_CAPTION_CONTRACT_COUNT_UNSUPPORTED', ({ bundle }) => {
    const entry = clone(captionContract(bundle));
    entry.captionContractRefId = 'caption-contract-002';
    bundle.resolutionPackage.captionContracts.push(entry);
  }),
  mutationProbe('RESOLUTION_STRUCTURE_UNKNOWN_FIELD', ({ bundle }) => { bundle.resolutionPackage.sourceAtoms[0].rawMs = 1000; }),

  mutationProbe('TARGET_ENTRY_INVALID', ({ bundle }) => { bundle.resolutionPackage.targets.push(null); }),
  mutationProbe('TARGET_ENTRY_ID_INVALID', ({ bundle }) => { target(bundle, 'target-emphasis').targetRefId = ''; }),
  mutationProbe('TARGET_ENTRY_DUPLICATE_ID', ({ bundle }) => { bundle.resolutionPackage.targets.push(clone(target(bundle, 'target-emphasis'))); }),
  mutationProbe('TARGET_ENTRY_TYPE_UNSUPPORTED', ({ bundle }) => { target(bundle, 'target-emphasis').targetType = 'legacy-target'; }),
  mutationProbe('TARGET_ENTRY_TYPE_PAYLOAD_INVALID', ({ bundle }) => { delete target(bundle, 'target-speaker').speakerDisplayName; }),
  mutationProbe('TARGET_ENTRY_SOURCE_ATOMS_INVALID', ({ bundle }) => { target(bundle, 'target-emphasis').sourceAtomIds = []; }),
  mutationProbe('TARGET_ENTRY_SOURCE_ATOM_UNKNOWN', ({ bundle }) => { target(bundle, 'target-emphasis').sourceAtomIds = ['missing-atom']; }),
  mutationProbe('TARGET_ENTRY_SOURCE_ORDER_REVERSED', ({ bundle }) => { target(bundle, 'target-emphasis').sourceAtomIds.reverse(); }),
  mutationProbe('TARGET_WITHOUT_INSTRUCTION', ({ bundle }) => {
    bundle.resolutionPackage.targets.push({
      targetRefId: 'target-unused',
      targetType: 'source-atom-range',
      sourceAtomIds: ['a-10'],
    });
  }),

  mutationProbe('CAPTION_CONTRACT_ENTRY_INVALID', ({ bundle }) => { bundle.resolutionPackage.captionContracts = [null]; }),
  mutationProbe('CAPTION_CONTRACT_ID_INVALID', ({ bundle }) => { captionContract(bundle).captionContractRefId = ''; }),
  mutationProbe('CAPTION_CONTRACT_DUPLICATE_ID', ({ bundle }) => { bundle.resolutionPackage.captionContracts.push(clone(captionContract(bundle))); }),
  mutationProbe('CAPTION_CONTRACT_SCHEMA_VERSION_UNSUPPORTED', ({ bundle }) => { captionContract(bundle).captionSchemaVersion = 'unsupported'; }),
  mutationProbe('CAPTION_CONTRACT_WITHOUT_TARGET', ({ bundle }) => { target(bundle, 'target-caption').captionContractRefId = 'missing-contract'; }),
  mutationProbe('CAPTION_TARGET_CUE_UNKNOWN', ({ bundle }) => { target(bundle, 'target-caption').cueId = 'missing-cue'; }),
  mutationProbe('CAPTION_TARGET_CUE_AMBIGUOUS', ({ bundle }) => { captionContract(bundle).captionPlan.cues.push(clone(captionCue(bundle))); }),
  mutationProbe('CAPTION_CUE_IN_MULTIPLE_TARGETS', ({ bundle }) => {
    const copiedTarget = clone(target(bundle, 'target-caption'));
    copiedTarget.targetRefId = 'target-caption-copy';
    bundle.resolutionPackage.targets.push(copiedTarget);
    const copiedInstruction = clone(instruction(bundle, 'instruction-caption'));
    copiedInstruction.instructionId = 'instruction-caption-copy';
    copiedInstruction.target.targetRefIds = ['target-caption-copy'];
    bundle.instructionSet.instructions.push(copiedInstruction);
  }),
  mutationProbe('CAPTION_CUE_WITHOUT_INSTRUCTION', ({ bundle }) => {
    bundle.instructionSet.instructions = bundle.instructionSet.instructions.filter((item) => item.kind !== 'speech-caption');
  }),

  mutationProbe('INSTRUCTION_NOT_OBJECT', ({ bundle }) => { bundle.instructionSet.instructions.push(null); }),
  mutationProbe('INSTRUCTION_UNKNOWN_FIELD', ({ bundle }) => { instruction(bundle, 'instruction-narration').startMs = 1600; }),
  mutationProbe('INSTRUCTION_ID_INVALID', ({ bundle }) => { instruction(bundle, 'instruction-narration').instructionId = ''; }),
  mutationProbe('INSTRUCTION_DUPLICATE_ID', ({ bundle }) => { bundle.instructionSet.instructions.push(clone(instruction(bundle, 'instruction-narration'))); }),
  mutationProbe('INSTRUCTION_TRIGGER_INVALID', ({ bundle }) => { instruction(bundle, 'instruction-narration').trigger = {}; }),
  mutationProbe('INSTRUCTION_TRIGGER_UNKNOWN_ATOM', ({ bundle }) => { instruction(bundle, 'instruction-narration').trigger.startAtomId = 'missing-atom'; }),
  mutationProbe('INSTRUCTION_KIND_UNSUPPORTED', ({ bundle }) => { instruction(bundle, 'instruction-narration').kind = 'legacy-kind'; }),
  mutationProbe('INSTRUCTION_TARGET_INVALID', ({ bundle }) => { instruction(bundle, 'instruction-narration').target = null; }),
  mutationProbe('INSTRUCTION_TARGET_CARDINALITY_INVALID', ({ bundle }) => { instruction(bundle, 'instruction-narration').target.targetRefIds = []; }),
  mutationProbe('INSTRUCTION_KIND_TARGET_MISMATCH', ({ bundle }) => { instruction(bundle, 'instruction-narration').kind = 'speaker-identification'; }),
  mutationProbe('INSTRUCTION_TARGET_REFERENCE_UNKNOWN', ({ bundle }) => { instruction(bundle, 'instruction-narration').target.targetRefIds = ['missing-target']; }),
  mutationProbe('INSTRUCTION_TRIGGER_OUTSIDE_TARGET', ({ bundle }) => { instruction(bundle, 'instruction-emphasis-important').trigger.startAtomId = 'a-06'; }),
  mutationProbe('INSTRUCTION_PRESET_ID_INVALID', ({ bundle }) => { instruction(bundle, 'instruction-narration').presetId = ''; }),
  mutationProbe('INSTRUCTION_MATERIAL_REFS_INVALID', ({ bundle }) => { instruction(bundle, 'instruction-comment').materialRefs = null; }),
  mutationProbe('INSTRUCTION_MATERIAL_REF_INVALID', ({ bundle }) => { instruction(bundle, 'instruction-comment').materialRefs = ['']; }),
  mutationProbe('INSTRUCTION_DUPLICATE_MATERIAL_REF', ({ bundle }) => { instruction(bundle, 'instruction-comment').materialRefs.push('material-speaker-icon'); }),
  mutationProbe('INSTRUCTION_CAPTION_TRIGGER_MISMATCH', ({ bundle }) => { instruction(bundle, 'instruction-caption').trigger.startAtomId = 'a-02'; }),
  mutationProbe('INSTRUCTION_CAPTION_CUE_REUSED', ({ bundle }) => {
    const copied = clone(instruction(bundle, 'instruction-caption'));
    copied.instructionId = 'instruction-caption-copy';
    bundle.instructionSet.instructions.push(copied);
  }),

  mutationProbe('PRESET_INDEX_INVALID', ({ bundle }) => { bundle.presetValidationIndex = null; }),
  mutationProbe('PRESET_INDEX_UNKNOWN_FIELD', ({ bundle }) => { bundle.presetValidationIndex.legacy = true; }),
  mutationProbe('PRESET_INDEX_VERSION_INVALID', ({ bundle }) => { bundle.presetValidationIndex.registryVersion = ''; }),
  mutationProbe('PRESET_ENTRY_INVALID', ({ bundle }) => { bundle.presetValidationIndex.presets.push(null); }),
  mutationProbe('PRESET_ENTRY_ID_INVALID', ({ bundle }) => { preset(bundle).presetId = ''; }),
  mutationProbe('PRESET_ENTRY_DUPLICATE_ID', ({ bundle }) => { bundle.presetValidationIndex.presets.push(clone(preset(bundle))); }),
  mutationProbe('PRESET_ENTRY_FORMAT_UNSUPPORTED', ({ bundle }) => { preset(bundle).format = 'vertical-short'; }),
  mutationProbe('PRESET_KIND_POLICIES_INVALID', ({ bundle }) => { preset(bundle).kindPolicies = null; }),
  mutationProbe('PRESET_KIND_POLICY_INVALID', ({ bundle }) => { preset(bundle).kindPolicies.push(null); }),
  mutationProbe('PRESET_KIND_POLICY_DUPLICATE', ({ bundle }) => { preset(bundle).kindPolicies.push(clone(policy(bundle, 'information-narration'))); }),
  mutationProbe('PRESET_KIND_UNSUPPORTED', ({ bundle }) => { policy(bundle, 'information-narration').kind = 'legacy-kind'; }),
  mutationProbe('PRESET_END_RESPONSIBILITY_INVALID', ({ bundle }) => { policy(bundle, 'information-narration').endResponsibility = 'target-anchor'; }),
  mutationProbe('PRESET_END_POLICY_FORBIDDEN', ({ bundle }) => { policy(bundle, 'speech-caption').endPolicyId = 'forbidden'; }),
  mutationProbe('PRESET_END_POLICY_MISSING', ({ bundle }) => { delete policy(bundle, 'information-narration').endPolicyId; }),
  mutationProbe('PRESET_MATERIAL_ROLES_INVALID', ({ bundle }) => { policy(bundle, 'information-comment').allowedMaterialRoles = null; }),
  mutationProbe('PRESET_MATERIAL_ROLE_UNSUPPORTED', ({ bundle }) => { policy(bundle, 'information-comment').allowedMaterialRoles.push('reference-image'); }),
  mutationProbe('PRESET_REQUIRED_ROLE_NOT_ALLOWED', ({ bundle }) => { policy(bundle, 'information-comment').requiredMaterialRoles = ['reference-image']; }),
  mutationProbe('INSTRUCTION_PRESET_UNKNOWN', ({ bundle }) => { instruction(bundle, 'instruction-narration').presetId = 'missing-preset'; }),
  mutationProbe('INSTRUCTION_PRESET_KIND_UNSUPPORTED', ({ bundle }) => {
    bundle.presetValidationIndex.presets.push({
      presetId: 'caption-only-style-v001',
      format: 'normal-landscape',
      kindPolicies: [clone(policy(bundle, 'speech-caption'))],
    });
    instruction(bundle, 'instruction-narration').presetId = 'caption-only-style-v001';
  }),

  mutationProbe('MATERIAL_INDEX_INVALID', ({ bundle }) => { bundle.materialValidationIndex = null; }),
  mutationProbe('MATERIAL_INDEX_UNKNOWN_FIELD', ({ bundle }) => { bundle.materialValidationIndex.legacy = true; }),
  mutationProbe('MATERIAL_INDEX_VERSION_INVALID', ({ bundle }) => { bundle.materialValidationIndex.registryVersion = ''; }),
  mutationProbe('MATERIAL_ENTRY_INVALID', ({ bundle }) => { bundle.materialValidationIndex.materials.push(null); }),
  mutationProbe('MATERIAL_ENTRY_ID_INVALID', ({ bundle }) => { material(bundle, 'material-speaker-icon').materialId = ''; }),
  mutationProbe('MATERIAL_ENTRY_DUPLICATE_ID', ({ bundle }) => { bundle.materialValidationIndex.materials.push(clone(material(bundle, 'material-speaker-icon'))); }),
  mutationProbe('MATERIAL_ROLE_UNSUPPORTED', ({ bundle }) => { material(bundle, 'material-speaker-icon').role = 'legacy-role'; }),
  mutationProbe('MATERIAL_COMPATIBLE_SUBJECTS_INVALID', ({ bundle }) => { material(bundle, 'material-speaker-icon').compatibleSubjects = []; }),
  mutationProbe('MATERIAL_SUBJECT_TYPE_UNSUPPORTED', ({ bundle }) => { material(bundle, 'material-speaker-icon').compatibleSubjects[0].subjectType = 'reference-subject'; }),
  mutationProbe('INSTRUCTION_MATERIAL_UNKNOWN', ({ bundle }) => { instruction(bundle, 'instruction-comment').materialRefs = ['missing-material']; }),
  mutationProbe('INSTRUCTION_MATERIAL_ROLE_UNSUPPORTED', ({ bundle }) => { instruction(bundle, 'instruction-comment').materialRefs = ['material-reference-image']; }),
  mutationProbe('INSTRUCTION_MATERIAL_TARGET_MISMATCH', ({ bundle }) => { material(bundle, 'material-speaker-icon').compatibleSubjects[0].subjectId = 'speaker-other'; }),
  mutationProbe('INSTRUCTION_REQUIRED_MATERIAL_MISSING', ({ bundle }) => {
    policy(bundle, 'speaker-identification').requiredMaterialRoles = ['speaker-icon'];
    instruction(bundle, 'instruction-speaker').materialRefs = [];
  }),
  mutationProbe('INSTRUCTION_REFERENCE_MATERIAL_MISSING', ({ bundle }) => { instruction(bundle, 'instruction-reference').materialRefs = []; }),
];

const expectedGrammarForCode = (code) => {
  if (code.startsWith('BUNDLE_') || code.startsWith('TRUST_')) return 'CONTRACT';
  if (code.startsWith('RESOLUTION_') || code.startsWith('TARGET_') || code.startsWith('CAPTION_')) return 'RESOLUTION';
  if (
    code.startsWith('PRESET_')
    || code === 'INSTRUCTION_PRESET_UNKNOWN'
    || code === 'INSTRUCTION_PRESET_KIND_UNSUPPORTED'
  ) return 'PRESET';
  if (
    code.startsWith('MATERIAL_')
    || code === 'INSTRUCTION_MATERIAL_UNKNOWN'
    || code === 'INSTRUCTION_MATERIAL_ROLE_UNSUPPORTED'
    || code === 'INSTRUCTION_MATERIAL_TARGET_MISMATCH'
    || code === 'INSTRUCTION_REQUIRED_MATERIAL_MISSING'
    || code === 'INSTRUCTION_REFERENCE_MATERIAL_MISSING'
  ) return 'MATERIAL';
  return 'INSTRUCTION';
};

test('exportされた全外枠違反コードを意図入力で発火させ、所属grammarを固定する', () => {
  const observedCodes = new Set();
  const grammarsByCode = new Map();
  for (const probe of violationProbes) {
    const { bundle, trust } = probe.make();
    const report = validatePresentationInstructionContract(bundle, trust);
    const issues = outerIssues(report);
    const matching = issues.filter((issue) => issue.code === probe.code);
    assert.ok(matching.length > 0, `${probe.code}を意図した入力で発火できませんでした。`);
    for (const issue of issues) {
      observedCodes.add(issue.code);
      const prior = grammarsByCode.get(issue.code);
      if (prior !== undefined) assert.equal(issue.grammar, prior, `${issue.code}のgrammarが入力によって変わりました。`);
      grammarsByCode.set(issue.code, issue.grammar);
    }
  }

  const exportedCodes = [...PRESENTATION_INSTRUCTION_VIOLATION_CODES];
  assert.deepEqual([...observedCodes].sort(), [...exportedCodes].sort());
  assert.equal(new Set(exportedCodes).size, exportedCodes.length, 'export違反コード集合に重複があります。');
  for (const code of exportedCodes) {
    assert.equal(grammarsByCode.get(code), expectedGrammarForCode(code), `${code}のgrammarが契約表と違います。`);
  }
});

test('CLIは合格0・契約失敗1・処理失敗2を返し、任意の出力先へ同じreportを書く', async () => {
  const cliPath = fileURLToPath(new URL('./validate_presentation_instruction_contract.mjs', import.meta.url));
  const bundlePath = fileURLToPath(fixtureUrl('valid-all-kinds.bundle.json'));
  const trustPath = fileURLToPath(fixtureUrl('valid-trust-bindings.json'));
  const legacyPath = fileURLToPath(fixtureUrl('legacy-telop-plan.json'));

  const passed = spawnSync(process.execPath, [cliPath, bundlePath, trustPath], { encoding: 'utf8' });
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(JSON.parse(passed.stdout).overallStatus, 'passed');

  const failed = spawnSync(process.execPath, [cliPath, legacyPath, trustPath], { encoding: 'utf8' });
  assert.equal(failed.status, 1, failed.stderr);
  assert.equal(JSON.parse(failed.stdout).overallStatus, 'failed');

  const tempDirectory = await mkdtemp(join(tmpdir(), 'presentation-instruction-cli-'));
  try {
    const outputPath = join(tempDirectory, 'report.json');
    const written = spawnSync(process.execPath, [cliPath, bundlePath, trustPath, outputPath], { encoding: 'utf8' });
    assert.equal(written.status, 0, written.stderr);
    assert.equal(written.stdout, '');
    assert.equal(await readFile(outputPath, 'utf8'), passed.stdout);

    const partialBundle = clone(VALID_BUNDLE);
    const partialTrust = clone(VALID_TRUST);
    partialBundle.resolutionPackage.atomGranularity = 'character-timestamp';
    refreshHashes(partialBundle, partialTrust);
    const partialBundlePath = join(tempDirectory, 'partial-bundle.json');
    const partialTrustPath = join(tempDirectory, 'partial-trust.json');
    await writeFile(partialBundlePath, `${JSON.stringify(partialBundle, null, 2)}\n`, 'utf8');
    await writeFile(partialTrustPath, `${JSON.stringify(partialTrust, null, 2)}\n`, 'utf8');
    const partial = spawnSync(process.execPath, [cliPath, partialBundlePath, partialTrustPath], { encoding: 'utf8' });
    assert.equal(partial.status, 0, partial.stderr);
    assert.equal(JSON.parse(partial.stdout).overallStatus, 'passed_with_declared_limit');

    const invalidJsonPath = join(tempDirectory, 'invalid.json');
    await writeFile(invalidJsonPath, '{', 'utf8');
    const parseFailure = spawnSync(process.execPath, [cliPath, invalidJsonPath, trustPath], { encoding: 'utf8' });
    assert.equal(parseFailure.status, 2);
    assert.match(parseFailure.stderr, /検査入力を処理できません/);

    const argumentFailure = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });
    assert.equal(argumentFailure.status, 2);
    assert.match(argumentFailure.stderr, /使い方/);

    const readFailure = spawnSync(
      process.execPath,
      [cliPath, join(tempDirectory, 'missing.json'), trustPath],
      { encoding: 'utf8' },
    );
    assert.equal(readFailure.status, 2);
    assert.match(readFailure.stderr, /検査入力を処理できません/);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
