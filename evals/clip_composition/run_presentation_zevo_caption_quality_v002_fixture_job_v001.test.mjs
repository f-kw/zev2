import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import * as fixtureModule from './run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs';
import {decodePresentationZevoCaptionQualityV002ProofJobV001} from './run_presentation_zevo_caption_quality_v002_proof_job_v001.ts';

const ROOT = process.cwd();
const FIXTURE_SET_ID = 'zevo-caption-quality-v002-fixture-selftest-20260815-attempt-0005';
const OUTPUT_ROOT = `evals/clip_composition/reports/presentation/test-fixtures/zevo-caption-quality-v002/${FIXTURE_SET_ID}`;
const JOB_ROOT = 'evals/clip_composition/reports/presentation/test-runs/20260815-zevo-caption-quality-v002-fixture-gate-attempt-0005';
const JOB_PATH = `${JOB_ROOT}/fixture-job-v001.json`;
const OLD_ROOT = 'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008';
const NORMAL_ORACLE = 'evals/clip_composition/reports/presentation/test-runs/20260814-zevo-caption-quality-v002-f-gate-attempt-0009/fixtures/zcq-caption-quality-proof-f-gate-attempt-0009.json';
const STYLE_REQUEST = 'evals/clip_composition/outputs/presentation/meaning-output-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/output-request.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])])) : value;
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const canonicalSha = value => sha(Buffer.from(JSON.stringify(canonicalize(value)), 'utf8'));
const formalBinding = async relativePath => {
  const bytes = await readFile(path.join(ROOT, relativePath));
  const value = JSON.parse(bytes);
  return {schemaVersion: value.schemaVersion, path: relativePath, fileSha256: sha(bytes), canonicalSha256: canonicalSha(value)};
};
const byteBinding = async relativePath => ({path: relativePath, fileSha256: sha(await readFile(path.join(ROOT, relativePath)))});
const CASE_ROWS = Object.freeze([
  ['voice-013', 'input-caption-000001', 'nE_bNeBNp4E_multiblock_material_v001:2:voice-013', 'layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013'],
  ['voice-067', 'input-caption-000002', 'nE_bNeBNp4E_multiblock_material_v001:5:voice-067', 'layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-067'],
  ['voice-190', 'input-caption-000003', 'nE_bNeBNp4E_multiblock_material_v001:5:voice-190', 'layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-190'],
]);
const CONTRACT_BINDINGS = Object.freeze([
  ['caption-quality-atomic-publication-b6-owner-scope-revision-addendum', 'presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md', '39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade'],
  ['caption-quality-atomic-runtime-lc-uuid-compatibility-addendum', 'presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md', 'bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e'],
  ['caption-quality-b6-credential-unavailable-owner-addendum', 'presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md', '573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd'],
  ['caption-quality-complete-implementation-design', 'presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md', '44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4'],
  ['caption-quality-complete-implementation-design-addendum', 'presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md', 'a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d'],
  ['caption-quality-dependency-load-stage-observation-addendum', 'presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md', '446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc'],
  ['caption-quality-dependency-unit-observation-addendum', 'presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md', '77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501'],
  ['caption-quality-formal-capability-read-entry-addendum', 'presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md', '6b2cd93d0ab366806160f05457d861899b87b0b08234f051f241ca2510988110'],
  ['caption-quality-fu-fixture-manufacturing-contract-design', 'presentation-zevo-caption-quality-v002-fu-fixture-manufacturing-contract-design-20260815-v001.md', '8312ab82095dec1e0fd96fea00f6c5e61e04997ae0a9956799fe2b30be17b554'],
  ['caption-quality-parent-contract', 'presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md', '33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba'],
  ['caption-quality-pre-staging-inner-observation-addendum', 'presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md', '668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f'],
  ['caption-quality-proof-capability-and-tsx-namespace-addendum', 'presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md', 'b22aab0ef923b459b1785e32841f9df215ee9f095cf78afc188518523966285a'],
  ['caption-quality-resolved-url-evaluation-addendum', 'presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md', '42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275'],
  ['caption-quality-runtime-live-binding-separation-addendum', 'presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md', '6a5d2115763f97f473f1a66690da05561339c1f51f7412b644ae259dfc61d8a1'],
  ['caption-quality-selection-runtime-value-wiring-addendum', 'presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md', '632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e'],
  ['caption-quality-source-final-package-validator-addendum', 'presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md', '787d401d2939f58cbc10562c1ed29ab2118f6169607e05bbb2d7c5c5971c8053'],
  ['caption-quality-tsx-wrapper-descriptor-addendum', 'presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md', '61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010'],
].map(([role, name, fileSha256]) => ({role, path: `evals/clip_composition/reports/presentation/${name}`, fileSha256})));

const makeJob = async () => {
  const oracleJob = JSON.parse(await readFile(path.join(ROOT, NORMAL_ORACLE)));
  const proofBindings = await Promise.all(oracleJob.implementationBindings.map(async binding => ({
    role: binding.role, path: binding.path, fileSha256: sha(await readFile(path.join(ROOT, binding.path))),
  })));
  const selfPath = 'evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs';
  const implementationBindings = [...proofBindings, {role: 'caption-quality-fixture-manufacture-runner-v001', path: selfPath, fileSha256: sha(await readFile(path.join(ROOT, selfPath)))}]
    .sort((left, right) => left.role.localeCompare(right.role) || left.path.localeCompare(right.path));
  const cases = [];
  for (const [caseId, inputCaptionId, candidateId, directory] of CASE_ROWS) {
    const oldOutput = `${OLD_ROOT}/${directory}/horizontal-formal/output-request-v001.json`;
    const horizontal = `${OLD_ROOT}/${directory}/horizontal-formal/render-plan-v002.json`;
    const vertical = `${OLD_ROOT}/${directory}/vertical-caption-diagnostic/render-plan-v002.json`;
    const request = JSON.parse(await readFile(path.join(ROOT, oldOutput)));
    cases.push({
      caseId, inputCaptionId, candidateId,
      oldOutputRequestBinding: await byteBinding(oldOutput),
      oldHorizontalRenderPlanBinding: await formalBinding(horizontal),
      oldVerticalRenderPlanBinding: await formalBinding(vertical),
      meaningPackageBinding: request.meaningInformationPackage,
      baseMediaInput: request.baseMediaInput,
      styleArtifactBindings: {},
    });
  }
  return {
    schemaVersion: 'presentation-zevo-caption-quality-v002-fixture-job-v001',
    jobId: 'zevo-caption-quality-v002-fixture-selftest-job-v001',
    attemptId: 'attempt-0005', fixtureSetId: FIXTURE_SET_ID, outputRoot: OUTPUT_ROOT,
    sourceInputs: {landscapeStyleRequestBinding: await formalBinding(STYLE_REQUEST), cases},
    proofExecutionRoots: {
      proofOutputParent: `evals/clip_composition/outputs/presentation/zevo-caption-quality-v002-fixture-proof/${FIXTURE_SET_ID}`,
      rendererWorkParent: 'evals/clip_composition/outputs/presentation/zevo-caption-quality-v002-renderer-work',
    },
    implementationBindings, approvedContractBindings: structuredClone(CONTRACT_BINDINGS),
  };
};
const walkFiles = async root => {
  const rows = [];
  const visit = async (absolute, relative = '') => {
    for (const entry of (await readdir(absolute, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
      const next = path.join(absolute, entry.name); const name = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) await visit(next, name); else rows.push(name);
    }
  };
  await visit(root); return rows;
};
const diagnostics = (t, prefix, count) => {
  for (let index = 1; index <= count; index += 1) t.diagnostic(`proof-item:${prefix}-${String(index).padStart(2, '0')}:passed`);
};
let receiptPath;

test('ZCQF001 fixture manufactureは44成果物と600環境行をatomic公開する', async t => {
  assert.deepEqual(Object.keys(fixtureModule).sort(), [
    'admitPresentationZevoCaptionQualityV002FixtureV001',
    'decodePresentationZevoCaptionQualityV002FixtureJobV001',
    'decodePresentationZevoCaptionQualityV002FixturePackageV001',
    'decodePresentationZevoCaptionQualityV002FixtureReceiptV001',
    'executePresentationZevoCaptionQualityV002FixtureJobV001',
    'validatePresentationZevoCaptionQualityV002FixtureJobV001',
    'validatePresentationZevoCaptionQualityV002FixturePackageV001',
    'validatePresentationZevoCaptionQualityV002FixtureReceiptV001',
  ]);
  const job = await makeJob();
  assert.equal(job.implementationBindings.length, 52);
  assert.equal(job.approvedContractBindings.length, 17);
  assert.equal(fixtureModule.validatePresentationZevoCaptionQualityV002FixtureJobV001(job).status, 'passed');
  assert.equal(fixtureModule.decodePresentationZevoCaptionQualityV002FixtureJobV001(formalBytes(job)).status, 'decoded');
  for (const bytes of [Buffer.alloc(0), Buffer.from(` ${formalBytes(job)}`), formalBytes(job).subarray(0, formalBytes(job).length - 1), Buffer.from('```json\n{}\n```\n')]) {
    assert.equal(fixtureModule.decodePresentationZevoCaptionQualityV002FixtureJobV001(bytes).status, 'rejected');
  }
  await mkdir(path.join(ROOT, JOB_ROOT), {recursive: true});
  await writeFile(path.join(ROOT, JOB_PATH), formalBytes(job), {flag: 'wx', mode: 0o444});
  const result = await fixtureModule.executePresentationZevoCaptionQualityV002FixtureJobV001(JOB_PATH);
  assert.deepEqual({status: result.status, stage: result.stage, primaryCode: result.primaryCode}, {status: 'passed', stage: 'completed', primaryCode: null});
  const files = await walkFiles(path.join(ROOT, OUTPUT_ROOT));
  assert.equal(files.length, 48);
  const packageValue = JSON.parse(await readFile(path.join(ROOT, OUTPUT_ROOT, 'fixture-package-v001.json')));
  const environment = JSON.parse(await readFile(path.join(ROOT, OUTPUT_ROOT, 'environment-manifest-v001.json')));
  const retention = JSON.parse(await readFile(path.join(ROOT, OUTPUT_ROOT, 'retention-manifest-v001.json')));
  assert.equal(packageValue.artifactBindings.length, 44);
  assert.equal(packageValue.negativeFixtures.length, 26);
  assert.equal(environment.requirements.length, 600);
  assert.equal(retention.rows.length, 26);
  const malformedRows = packageValue.negativeFixtures.filter(row => row.label === 'malformed-byte-envelope');
  const formalRows = [packageValue.normalFixture, ...packageValue.negativeFixtures.filter(
    row => row.label !== 'malformed-byte-envelope',
  )];
  assert.equal(formalRows.length, 26);
  assert.equal(malformedRows.length, 1);
  for (const row of formalRows) {
    const bytes = await readFile(path.join(ROOT, row.proofJobBinding.path));
    const decoded = decodePresentationZevoCaptionQualityV002ProofJobV001(bytes);
    assert.equal(decoded.status, 'decoded', row.proofJobBinding.path);
    assert.equal(path.basename(row.proofJobBinding.path, '.json'), decoded.value.jobId);
  }
  const malformed = malformedRows[0];
  const malformedBytes = await readFile(path.join(ROOT, malformed.proofJobBinding.path));
  assert.deepEqual(Object.keys(malformed.proofJobBinding), ['path', 'fileSha256']);
  assert.equal(path.basename(malformed.proofJobBinding.path), 'malformed-byte-envelope.json');
  assert.equal(decodePresentationZevoCaptionQualityV002ProofJobV001(malformedBytes).status, 'rejected');
  receiptPath = `${OUTPUT_ROOT}/fixture-admission-receipt-v001.json`;
  const collision = await fixtureModule.executePresentationZevoCaptionQualityV002FixtureJobV001(JOB_PATH);
  assert.equal(collision.status, 'fatal');
  assert.equal(collision.primaryCode, 'CUE_FIXTURE_PUBLICATION_FAILED');
  assert.deepEqual(await walkFiles(path.join(ROOT, OUTPUT_ROOT)), files);
  diagnostics(t, 'ZCQF001', 18);
});

test('ZCQF002 receipt admissionはFとUを分離し、root escapeと環境差を拒否する', async t => {
  const f = await fixtureModule.admitPresentationZevoCaptionQualityV002FixtureV001({receiptPath, expectedGateId: 'F'});
  assert.equal(f.status, 'passed');
  assert.equal(f.package.artifactBindings.length, 44);
  assert.equal(f.fixture.negativeFixtures.length, 26);
  assert.equal(f.environmentManifest.requirements.length, 600);
  const u = await fixtureModule.admitPresentationZevoCaptionQualityV002FixtureV001({receiptPath, expectedGateId: 'U'});
  assert.equal(u.status, 'passed');
  assert.equal(u.fixture.reviewFixture.videoBindings.length, 3);
  assert.equal(u.fixture.reviewFixture.qcBindings.length, 3);
  assert.equal(u.fixture.reviewFixture.oldRenderPlanBindings.length, 6);
  assert.equal((await fixtureModule.admitPresentationZevoCaptionQualityV002FixtureV001({receiptPath: '../escape.json', expectedGateId: 'F'})).status, 'rejected');
  assert.equal((await fixtureModule.admitPresentationZevoCaptionQualityV002FixtureV001({receiptPath: `${OUTPUT_ROOT}/missing.json`, expectedGateId: 'F'})).status, 'rejected');
  const normalRoot = f.artifactValues[f.package.normalFixture.proofJobBinding.path].outputRoot;
  await mkdir(path.join(ROOT, normalRoot), {recursive: true});
  const changed = await fixtureModule.admitPresentationZevoCaptionQualityV002FixtureV001({receiptPath, expectedGateId: 'F'});
  assert.equal(changed.status, 'rejected');
  assert.equal(changed.reason, 'environment-invalid');
  assert.equal((await fixtureModule.admitPresentationZevoCaptionQualityV002FixtureV001({receiptPath, expectedGateId: 'U'})).status, 'passed');
  diagnostics(t, 'ZCQF002', 16);
});
