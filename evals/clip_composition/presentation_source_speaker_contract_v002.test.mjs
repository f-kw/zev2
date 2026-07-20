import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildPresentationResolutionPackageV002,
} from './build_presentation_resolution_package_v002.mjs';
import {
  PRESENTATION_CAPTION_SCOPE_EXCLUSIONS,
  PRESENTATION_CAPTION_SPEAKER_VIOLATION_CODES,
  canonicalJson,
  serializePresentationCaptionReport,
  validatePresentationCaptionContract,
} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_INSTRUCTION_VIOLATION_CODES,
  serializePresentationInstructionReport,
  validatePresentationInstructionContract,
} from './presentation_instruction_contract_v002.mjs';
import {
  SOURCE_SPEAKER_NON_IDENTITY_REGISTRY,
  SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256,
  canonicalSha256,
  validateSpeakerRegistryArtifact,
} from './presentation_source_speaker_policy_v001.mjs';

const fixtureUrl = (relativePath) => new URL(`./testdata/${relativePath}`, import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(fileURLToPath(fixtureUrl(relativePath)), 'utf8'));
const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');
const speakerIssues = (report) => report.contract.violations.filter((issue) => (
  PRESENTATION_CAPTION_SPEAKER_VIOLATION_CODES.includes(issue.code)
));
const allReportIssues = (report) => {
  const result = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value === null || typeof value !== 'object') return;
    if (typeof value.code === 'string') result.push(value);
    Object.values(value).forEach(visit);
  };
  visit(report);
  return result;
};
const reportCodes = (report) => new Set(allReportIssues(report).map((issue) => issue.code));

const refreshBundleHashes = (bundle, trust) => {
  bundle.resolutionPackage.sourceAtomsSha256 = sha256(bundle.resolutionPackage.sourceAtoms);
  bundle.instructionSet.resolutionPackageSha256 = sha256(bundle.resolutionPackage);
  if (trust) {
    trust.presetValidationIndexSha256 = sha256(bundle.presetValidationIndex);
    trust.materialValidationIndexSha256 = sha256(bundle.materialValidationIndex);
  }
};

const buildCaptionInput = (bundle, entry = bundle.resolutionPackage.captionContracts[0]) => ({
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

const runNode = (args) => spawnSync(process.execPath, args, { cwd: fileURLToPath(new URL('../..', import.meta.url)), encoding: 'utf8' });

test('1: 欄なし・null・不透明ラベル・表示名風文字列を構造上受理し、人物保証外を明示する', async () => {
  const input = await readJson('presentation-caption-contract-v002/valid-character.json');
  delete input.source.atoms[0].speaker;
  input.source.atoms[1].speaker = null;
  input.source.atoms[2].speaker = 'SPEAKER_00';
  input.source.atoms[3].speaker = '宝鐘マリン';
  const before = clone(input);
  const report = validatePresentationCaptionContract(input);
  assert.notEqual(report.overallStatus, 'failed');
  assert.deepEqual(speakerIssues(report), []);
  assert.deepEqual(input, before, '検査器がspeakerを補正しました。');
  assert.deepEqual(report.scopeExclusions, PRESENTATION_CAPTION_SCOPE_EXCLUSIONS);
});

test('2: 話者欄のnumber・boolean・object・arrayを同じ型違反として拒否する', async () => {
  for (const value of [1, true, {}, []]) {
    const input = await readJson('presentation-caption-contract-v002/valid-character.json');
    input.source.atoms[0].speaker = value;
    const issues = speakerIssues(validatePresentationCaptionContract(input));
    assert.equal(issues.filter((issue) => issue.code === 'SOURCE_ATOM_SPEAKER_TYPE_INVALID').length, 1);
    assert.equal(issues.find((issue) => issue.code === 'SOURCE_ATOM_SPEAKER_TYPE_INVALID').path, '$.source.atoms[0].speaker');
  }
});

test('3: 空文字・空白だけ・前後空白を区別し、trimした値を作らない', async () => {
  const cases = [
    ['', 'SOURCE_ATOM_SPEAKER_EMPTY'],
    ['   ', 'SOURCE_ATOM_SPEAKER_EMPTY'],
    [' SPEAKER_00', 'SOURCE_ATOM_SPEAKER_NOT_CANONICAL'],
    ['SPEAKER_00 ', 'SOURCE_ATOM_SPEAKER_NOT_CANONICAL'],
    [' SPEAKER_00 ', 'SOURCE_ATOM_SPEAKER_NOT_CANONICAL'],
  ];
  for (const [value, expectedCode] of cases) {
    const input = await readJson('presentation-caption-contract-v002/valid-character.json');
    input.source.atoms[0].speaker = value;
    const before = clone(input);
    const issues = speakerIssues(validatePresentationCaptionContract(input));
    assert.ok(issues.some((issue) => issue.code === expectedCode));
    assert.deepEqual(input, before);
  }
});

test('4: 固定台帳2値だけを拒否し、台帳外文字列は保証外として通す', async () => {
  for (const rawValue of ['unknown', 'youtube-auto-caption']) {
    const input = await readJson('presentation-caption-contract-v002/valid-character.json');
    input.source.atoms[0].speaker = rawValue;
    const issue = speakerIssues(validatePresentationCaptionContract(input))
      .find((entry) => entry.code === 'SOURCE_ATOM_SPEAKER_NON_IDENTITY_TOKEN');
    assert.equal(issue?.details?.rawValue, rawValue);
  }

  const unknownAlias = await readJson('presentation-caption-contract-v002/valid-character.json');
  unknownAlias.source.atoms[0].speaker = 'UNKNOWN';
  const aliasReport = validatePresentationCaptionContract(unknownAlias);
  assert.equal(aliasReport.contract.status, 'passed');
  assert.deepEqual(aliasReport.scopeExclusions, PRESENTATION_CAPTION_SCOPE_EXCLUSIONS);

  assert.equal(SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256.length, 64);
  for (const mutate of [
    (registry) => { registry.matchMode = 'case-insensitive'; },
    (registry) => { registry.entries[0].normalizedValue = 'unknown'; },
    (registry) => { registry.entries.push(clone(registry.entries[0])); },
  ]) {
    const registry = clone(SOURCE_SPEAKER_NON_IDENTITY_REGISTRY);
    mutate(registry);
    assert.throws(() => validateSpeakerRegistryArtifact(registry));
  }
});

test('5: 同時表示の話者状態・v001拒否・caption CLIと従来24意味ケースを検証する', async () => {
  const base = await readJson('presentation-caption-contract-v002/valid-simultaneous-future-contract.json');
  assert.notEqual(validatePresentationCaptionContract(clone(base)).overallStatus, 'failed');

  for (const mutate of [
    (input) => { input.source.atoms[0].speaker = null; },
    (input) => { delete input.source.atoms[0].speaker; },
  ]) {
    const input = clone(base);
    mutate(input);
    assert.ok(reportCodes(validatePresentationCaptionContract(input)).has('SOURCE_SIMULTANEOUS_GROUP_SPEAKER_UNKNOWN'));
  }
  const same = clone(base);
  same.source.atoms[1].speaker = same.source.atoms[0].speaker;
  assert.ok(reportCodes(validatePresentationCaptionContract(same)).has('SOURCE_SIMULTANEOUS_GROUP_SPEAKERS_NOT_DISTINCT'));

  const old = clone(base);
  old.schemaVersion = 'presentation-caption-check-v001';
  assert.ok(reportCodes(validatePresentationCaptionContract(old)).has('CONTRACT_SCHEMA_VERSION_UNSUPPORTED'));

  const regressionPath = fileURLToPath(new URL('./presentation_caption_contract_v002.regression.mjs', import.meta.url));
  const regression = runNode(['--test', regressionPath]);
  assert.equal(regression.status, 0, regression.stderr || regression.stdout);
  assert.equal((await readFile(regressionPath, 'utf8')).match(/^test\(/gm)?.length, 24);

  const tempDirectory = await mkdtemp(join(tmpdir(), 'presentation-caption-v002-'));
  try {
    const validPath = fileURLToPath(fixtureUrl('presentation-caption-contract-v002/valid-character.json'));
    const invalidPath = join(tempDirectory, 'invalid.json');
    const outputPath = join(tempDirectory, 'report.json');
    await writeFile(invalidPath, `${JSON.stringify(old, null, 2)}\n`, 'utf8');
    const cliPath = fileURLToPath(new URL('./validate_presentation_caption_contract_v002.mjs', import.meta.url));
    assert.equal(runNode([cliPath, validPath]).status, 0);
    assert.equal(runNode([cliPath, invalidPath]).status, 1);
    assert.equal(runNode([cliPath, join(tempDirectory, 'missing.json')]).status, 2);
    const outputRun = runNode([cliPath, validPath, outputPath]);
    assert.equal(outputRun.status, 0);
    const validInput = JSON.parse(await readFile(validPath, 'utf8'));
    assert.equal(await readFile(outputPath, 'utf8'), serializePresentationCaptionReport(validatePresentationCaptionContract(validInput)));
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test('6: 正式生成器だけが登録済み2値をnullへ写し、決定的なatom単位来歴を残す', async () => {
  const request = await readJson('presentation-resolution-package-v002/valid-build-request.json');
  const before = clone(request);
  const first = buildPresentationResolutionPackageV002(request);
  const second = buildPresentationResolutionPackageV002(request);
  assert.deepEqual(first, second);
  assert.deepEqual(request, before, '生成器がraw入力を書き換えました。');
  assert.equal(first.resolutionPackage.sourceAtoms[0].speaker, null);
  assert.equal(first.resolutionPackage.sourceAtoms[1].speaker, null);
  assert.deepEqual(first.generationManifest.speakerNormalization.mappedRecords.map((record) => record.atomId), [
    'speaker-raw-01',
    'speaker-raw-02',
  ]);
  assert.deepEqual(first.generationManifest.speakerNormalization.mappedRecords.map((record) => record.rawSpeaker), [
    'unknown',
    'youtube-auto-caption',
  ]);
  assert.equal(
    first.resolutionPackage.sourceSpeakerNormalization.rawSourceAtomsCanonicalSha256,
    canonicalSha256(request.rawSourceAtoms),
  );
  assert.equal(first.resolutionPackage.sourceAtomsSha256, canonicalSha256(first.resolutionPackage.sourceAtoms));
  assert.equal(
    first.generationManifest.output.resolutionPackageCanonicalSha256,
    canonicalSha256(first.resolutionPackage),
  );
  assert.deepEqual(first.generationManifest.sourceArtifacts.map((artifact) => artifact.sourceRef), [
    'synthetic-source-a-v001',
    'synthetic-source-b-v001',
  ]);
  assert.ok(!JSON.stringify(first.generationManifest).includes('generatedAt'));
});

test('7: 欄なし・null・通常値を保持し、不正値ではpackageを一切生成しない', async () => {
  const request = await readJson('presentation-resolution-package-v002/valid-build-request.json');
  const built = buildPresentationResolutionPackageV002(request);
  assert.equal(built.resolutionPackage.sourceAtoms[2].speaker, 'SPEAKER_00');
  assert.ok(!('speaker' in built.resolutionPackage.sourceAtoms[3]));
  assert.equal(built.resolutionPackage.sourceAtoms[4].speaker, null);
  assert.equal(built.resolutionPackage.sourceAtoms[5].speaker, 'UNKNOWN');
  assert.deepEqual(built.resolutionPackage.targets, []);

  for (const invalidValue of ['', '   ', ' SPEAKER_00', 1, true, {}, []]) {
    const invalidRequest = clone(request);
    invalidRequest.rawSourceAtoms[2].speaker = invalidValue;
    assert.throws(() => buildPresentationResolutionPackageV002(invalidRequest));
  }

  const directInput = await readJson('presentation-caption-contract-v002/valid-character.json');
  directInput.source.atoms[0].speaker = 'unknown';
  assert.equal(validatePresentationCaptionContract(directInput).contract.status, 'failed');
  const sourceOnly = {
    schemaVersion: 'presentation-caption-check-v002',
    format: 'normal-landscape',
    source: {
      atomGranularity: built.resolutionPackage.atomGranularity,
      atomProvenance: built.resolutionPackage.sourceProvenance,
      atoms: built.resolutionPackage.sourceAtoms,
      captionTargets: [],
      allowedSimultaneousGroups: [],
    },
    captionPlan: { cues: [] },
  };
  assert.notEqual(validatePresentationCaptionContract(sourceOnly).overallStatus, 'failed');
});

test('8: 外枠がsource-onlyとfull-captionへ話者違反を無改変伝播し、従来27ケース・全114コードを保つ', async () => {
  const bundle = await readJson('presentation-instruction-contract-v002/valid-all-kinds.bundle.json');
  const trust = await readJson('presentation-instruction-contract-v002/valid-trust-bindings.json');
  bundle.resolutionPackage.sourceAtoms[0].speaker = 'unknown';
  refreshBundleHashes(bundle, trust);
  const outerReport = validatePresentationInstructionContract(bundle, trust);
  const directReport = validatePresentationCaptionContract(buildCaptionInput(bundle));
  assert.deepEqual(outerReport.delegatedChecks.sourceContract.violations, directReport.contract.violations);
  assert.equal(outerReport.delegatedChecks.captionContracts.length, 1);
  assert.deepEqual(outerReport.delegatedChecks.captionContracts[0].report, directReport);
  assert.ok(!PRESENTATION_INSTRUCTION_VIOLATION_CODES.includes('SOURCE_ATOM_SPEAKER_NON_IDENTITY_TOKEN'));
  assert.equal(PRESENTATION_INSTRUCTION_VIOLATION_CODES.length, 114);

  const regressionPath = fileURLToPath(new URL('./presentation_instruction_contract_v002.regression.mjs', import.meta.url));
  const regression = runNode(['--test', regressionPath]);
  assert.equal(regression.status, 0, regression.stderr || regression.stdout);
  assert.equal((await readFile(regressionPath, 'utf8')).match(/^test\(/gm)?.length, 27);
});

test('9: source labelと人物targetを分離し、information-itemは明示speaker targetだけを参照する', async () => {
  const bundle = await readJson('presentation-instruction-contract-v002/valid-all-kinds.bundle.json');
  const trust = await readJson('presentation-instruction-contract-v002/valid-trust-bindings.json');
  bundle.resolutionPackage.sourceAtoms[8].speaker = '声クラスタだけの値';
  refreshBundleHashes(bundle, trust);
  assert.equal(validatePresentationInstructionContract(bundle, trust).overallStatus, 'passed');

  const missingTarget = clone(bundle);
  missingTarget.resolutionPackage.targets = missingTarget.resolutionPackage.targets
    .filter((target) => target.targetRefId !== 'target-speaker');
  refreshBundleHashes(missingTarget, trust);
  const report = validatePresentationInstructionContract(missingTarget, trust);
  assert.ok(reportCodes(report).has('INFORMATION_ITEM_SPEAKER_TARGET_UNKNOWN'));
  assert.ok(!missingTarget.resolutionPackage.targets.some((target) => target.targetType === 'speaker'));
});

test('10: v002入口が全v001版を拒否し、外枠CLIの0・1・2と決定性を保つ', async () => {
  const baseBundle = await readJson('presentation-instruction-contract-v002/valid-all-kinds.bundle.json');
  const baseTrust = await readJson('presentation-instruction-contract-v002/valid-trust-bindings.json');
  const cases = [
    [(bundle) => { bundle.schemaVersion = 'presentation-instruction-check-v001'; }, 'BUNDLE_SCHEMA_VERSION_UNSUPPORTED'],
    [(bundle) => { bundle.resolutionPackage.schemaVersion = 'presentation-resolution-package-v001'; }, 'RESOLUTION_PACKAGE_SCHEMA_VERSION_UNSUPPORTED'],
    [(bundle) => { bundle.resolutionPackage.captionContracts[0].captionSchemaVersion = 'presentation-caption-check-v001'; }, 'CAPTION_CONTRACT_SCHEMA_VERSION_UNSUPPORTED'],
    [(bundle) => { bundle.instructionSet.schemaVersion = 'zev-presentation-instruction-v001'; }, 'INSTRUCTION_SET_SCHEMA_VERSION_UNSUPPORTED'],
    [(bundle) => { bundle.instructionSet.rendererContractVersion = 'zev-renderer-boundary-v001'; }, 'INSTRUCTION_SET_RENDERER_CONTRACT_VERSION_UNSUPPORTED'],
  ];
  for (const [mutate, expectedCode] of cases) {
    const bundle = clone(baseBundle);
    const trust = clone(baseTrust);
    mutate(bundle);
    refreshBundleHashes(bundle, trust);
    assert.ok(reportCodes(validatePresentationInstructionContract(bundle, trust)).has(expectedCode));
  }

  const first = validatePresentationInstructionContract(clone(baseBundle), clone(baseTrust));
  const second = validatePresentationInstructionContract(clone(baseBundle), clone(baseTrust));
  assert.equal(serializePresentationInstructionReport(first), serializePresentationInstructionReport(second));

  const tempDirectory = await mkdtemp(join(tmpdir(), 'presentation-instruction-v002-'));
  try {
    const bundlePath = fileURLToPath(fixtureUrl('presentation-instruction-contract-v002/valid-all-kinds.bundle.json'));
    const trustPath = fileURLToPath(fixtureUrl('presentation-instruction-contract-v002/valid-trust-bindings.json'));
    const legacyPath = fileURLToPath(fixtureUrl('presentation-instruction-contract-v002/legacy-telop-plan.json'));
    const outputPath = join(tempDirectory, 'report.json');
    const cliPath = fileURLToPath(new URL('./validate_presentation_instruction_contract_v002.mjs', import.meta.url));
    assert.equal(runNode([cliPath, bundlePath, trustPath]).status, 0);
    assert.equal(runNode([cliPath, legacyPath, trustPath]).status, 1);
    assert.equal(runNode([cliPath, join(tempDirectory, 'missing.json'), trustPath]).status, 2);
    assert.equal(runNode([cliPath, bundlePath, trustPath, outputPath]).status, 0);
    assert.equal(await readFile(outputPath, 'utf8'), serializePresentationInstructionReport(first));
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
