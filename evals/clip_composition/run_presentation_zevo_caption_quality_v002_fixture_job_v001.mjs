import {createHash} from 'node:crypto';
import {constants as fsConstants} from 'node:fs';
import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {publishPresentationDirectoryAtomicallyNoReplaceV001} from './presentation_atomic_directory_publish_v001.mjs';
import {
  decodePresentationZevoCaptionQualityV002ProofJobV001,
  derivePresentationZevoCaptionQualityV002ExecutionPathsV001,
  PRESENTATION_ZEVO_CAPTION_RENDERER_TRUST_RUNTIME_BINDING_V002,
} from './run_presentation_zevo_caption_quality_v002_proof_job_v001.ts';

const JOB_SCHEMA = 'presentation-zevo-caption-quality-v002-fixture-job-v001';
const PACKAGE_SCHEMA = 'presentation-zevo-caption-quality-v002-fixture-package-v001';
const RECEIPT_SCHEMA = 'presentation-zevo-caption-quality-v002-fixture-admission-receipt-v001';
const ENVIRONMENT_SCHEMA = 'presentation-zevo-caption-quality-v002-fixture-environment-manifest-v001';
const RETENTION_SCHEMA = 'presentation-zevo-caption-quality-v002-fixture-retention-manifest-v001';
const CLI_SCHEMA = 'presentation-zevo-caption-quality-v002-fixture-cli-result-v001';
const MODULE_PATH = 'evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs';
const MODULE_ABSOLUTE = fileURLToPath(import.meta.url);
const WORKSPACE_ROOT = path.resolve(path.dirname(MODULE_ABSOLUTE), '../..');
const FIXTURE_ROOT_PREFIX = 'evals/clip_composition/reports/presentation/test-fixtures/zevo-caption-quality-v002/';
const ORACLE_ROOT = 'evals/clip_composition/reports/presentation/test-runs/20260814-zevo-caption-quality-v002-f-gate-attempt-0009/fixtures';
const RENDERER_WORK_PARENT = 'evals/clip_composition/outputs/presentation/zevo-caption-quality-v002-renderer-work';
const MALFORMED_PROOF_LABEL = 'malformed-byte-envelope';
const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\\)(?!.*\0).+$/u;

const CASES = Object.freeze([
  Object.freeze({caseId: 'voice-013', inputCaptionId: 'input-caption-000001', candidateId: 'nE_bNeBNp4E_multiblock_material_v001:2:voice-013'}),
  Object.freeze({caseId: 'voice-067', inputCaptionId: 'input-caption-000002', candidateId: 'nE_bNeBNp4E_multiblock_material_v001:5:voice-067'}),
  Object.freeze({caseId: 'voice-190', inputCaptionId: 'input-caption-000003', candidateId: 'nE_bNeBNp4E_multiblock_material_v001:5:voice-190'}),
]);
const NEGATIVE_LABELS = Object.freeze([
  'completion-reread-failure', 'completion-write-failure', 'fade-throw',
  'failure-report-reread-failure', 'failure-report-write-failure', 'malformed-byte-envelope',
  'output-request-reread-io-failure', 'output-request-reread-mismatch', 'owner-mismatch',
  'owner-missing', 'owner-permission', 'planner-rejected-first-case', 'publisher-helper-failure',
  'publisher-late-collision', 'render-plan-reread-mismatch', 'render-plan-write-failure',
  'render-rejected-first-case', 'renderer-rejected-first-case', 'renderer-rejected-second-case',
  'review-build-failure', 'review-fade-mismatch', 'review-id-mismatch', 'review-reread-failure',
  'review-write-failure', 'root-reservation-collision', 'work-video-missing',
]);
const CONTRACT_BINDINGS = Object.freeze([
  ['caption-quality-atomic-publication-b6-owner-scope-revision-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md', '39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade'],
  ['caption-quality-atomic-runtime-lc-uuid-compatibility-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md', 'bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e'],
  ['caption-quality-b6-credential-unavailable-owner-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md', '573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd'],
  ['caption-quality-complete-implementation-design', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md', '44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4'],
  ['caption-quality-complete-implementation-design-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md', 'a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d'],
  ['caption-quality-dependency-load-stage-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md', '446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc'],
  ['caption-quality-dependency-unit-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md', '77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501'],
  ['caption-quality-formal-capability-read-entry-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md', '6b2cd93d0ab366806160f05457d861899b87b0b08234f051f241ca2510988110'],
  ['caption-quality-fu-fixture-manufacturing-contract-design', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-fu-fixture-manufacturing-contract-design-20260815-v001.md', '8312ab82095dec1e0fd96fea00f6c5e61e04997ae0a9956799fe2b30be17b554'],
  ['caption-quality-parent-contract', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md', '33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba'],
  ['caption-quality-pre-staging-inner-observation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md', '668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f'],
  ['caption-quality-proof-capability-and-tsx-namespace-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md', 'b22aab0ef923b459b1785e32841f9df215ee9f095cf78afc188518523966285a'],
  ['caption-quality-resolved-url-evaluation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md', '42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275'],
  ['caption-quality-runtime-live-binding-separation-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md', '6a5d2115763f97f473f1a66690da05561339c1f51f7412b644ae259dfc61d8a1'],
  ['caption-quality-selection-runtime-value-wiring-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md', '632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e'],
  ['caption-quality-source-final-package-validator-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md', '787d401d2939f58cbc10562c1ed29ab2118f6169607e05bbb2d7c5c5971c8053'],
  ['caption-quality-tsx-wrapper-descriptor-addendum', 'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md', '61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010'],
  ['rendering-decoupling-contract-design-v001', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-20260817-v001.md', 'aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94'],
  ['rendering-decoupling-contract-addendum-v001', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260817-v001.md', '2643e7bf7ad8cdac6dd81a4fa1f1bb5c884b6f2968ec4db465554ad91bee1fad'],
  ['rendering-decoupling-contract-addendum-v002', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260817-v002.md', 'f19a0ff9a27de640959bbbc81fcf7920b63f7a0c19354bc7bf7c6b2a5fcdf47b'],
  ['rendering-decoupling-contract-addendum-v003', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260818-v003.md', 'cd4bfb75f8dfe0aec325ee8ae79cb136908ea7fa7e5fd2e610a430bfb4d1b16d'],
  ['rendering-decoupling-contract-addendum-v004', 'evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260818-v004.md', '8321a7ba99672af164f6a66285a3802f05b7f876e6c4fbf94e4211b0524f4d36'],
].map(([role, bindingPath, fileSha256]) => Object.freeze({role, path: bindingPath, fileSha256})));

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && value.every((_, index) => Object.hasOwn(value, index));
const clone = value => structuredClone(value);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize)
  : isObject(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])])) : value;
const canonicalSha = value => sha256(Buffer.from(JSON.stringify(canonicalize(value)), 'utf8'));
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const freezeDeep = value => {
  if (Buffer.isBuffer(value)) return value;
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freezeDeep(item);
  }
  return value;
};
const absoluteWorkspacePath = relativePath => {
  if (!WORKSPACE_PATH.test(relativePath)) throw new TypeError('workspace path is invalid');
  const absolute = path.resolve(WORKSPACE_ROOT, relativePath);
  if (absolute !== WORKSPACE_ROOT && !absolute.startsWith(`${WORKSPACE_ROOT}${path.sep}`)) {
    throw new TypeError('workspace path escapes root');
  }
  return absolute;
};
const bindingForBytes = (relativePath, bytes) => Object.freeze({path: relativePath, fileSha256: sha256(bytes)});
const bindingForFormal = (schemaVersion, relativePath, value) => Object.freeze({
  schemaVersion,
  path: relativePath,
  fileSha256: sha256(formalBytes(value)),
  canonicalSha256: canonicalSha(value),
});
const validateFormalBinding = value => exactKeys(value, ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256'])
  && typeof value.schemaVersion === 'string' && value.schemaVersion.length > 0
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256) && SHA256.test(value.canonicalSha256);
const validateByteBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const validateImplementationBinding = value => exactKeys(value, ['role', 'path', 'fileSha256'])
  && typeof value.role === 'string' && value.role.length > 0
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const validateContractBinding = validateImplementationBinding;
const stableRead = async relativePath => {
  const absolute = absoluteWorkspacePath(relativePath);
  const before = await lstat(absolute, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || await realpath(absolute) !== absolute) throw new Error('bound file is unsafe');
  const bytes = await readFile(absolute);
  const after = await lstat(absolute, {bigint: true});
  if (!after.isFile() || after.isSymbolicLink() || before.dev !== after.dev || before.ino !== after.ino
    || before.size !== after.size || before.mtimeNs !== after.mtimeNs || await realpath(absolute) !== absolute) {
    throw new Error('bound file changed while reading');
  }
  return bytes;
};
const readBound = async binding => {
  const bytes = await stableRead(binding.path);
  if (sha256(bytes) !== binding.fileSha256) throw new Error('bound file hash mismatch');
  if (validateFormalBinding(binding)) {
    const value = JSON.parse(bytes);
    if (canonicalSha(value) !== binding.canonicalSha256 || value.schemaVersion !== binding.schemaVersion) {
      throw new Error('bound formal value mismatch');
    }
    return Object.freeze({bytes, value});
  }
  return Object.freeze({bytes, value: null});
};
const validateFormalProofJobConsumerArtifact = (binding, bytes) => {
  if (!validateFormalBinding(binding) || path.extname(binding.path) !== '.json') return false;
  const decoded = decodePresentationZevoCaptionQualityV002ProofJobV001(bytes);
  return decoded.status === 'decoded'
    && path.basename(binding.path, '.json') === decoded.value.jobId;
};
const validateMalformedProofJobConsumerArtifact = (row, bytes) => isObject(row)
  && row.label === MALFORMED_PROOF_LABEL
  && validateByteBinding(row.proofJobBinding)
  && path.basename(row.proofJobBinding.path) === `${MALFORMED_PROOF_LABEL}.json`
  && decodePresentationZevoCaptionQualityV002ProofJobV001(bytes).status === 'rejected';
const validateProofJobConsumerClosure = (packageValue, artifactBytes) => {
  if (!isObject(packageValue?.normalFixture) || !dense(packageValue?.negativeFixtures)) return false;
  const malformed = packageValue.negativeFixtures.filter(row => row?.label === MALFORMED_PROOF_LABEL);
  const formalRows = [packageValue.normalFixture, ...packageValue.negativeFixtures.filter(
    row => row?.label !== MALFORMED_PROOF_LABEL,
  )];
  return malformed.length === 1
    && formalRows.length === 26
    && formalRows.every(row => validateFormalProofJobConsumerArtifact(
      row.proofJobBinding,
      artifactBytes.get(row.proofJobBinding.path),
    ))
    && validateMalformedProofJobConsumerArtifact(
      malformed[0],
      artifactBytes.get(malformed[0].proofJobBinding.path),
    );
};
const strictDecode = (bytes, validator) => {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return Object.freeze({status: 'rejected', reason: 'byte-envelope-invalid'});
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { return Object.freeze({status: 'rejected', reason: 'json-invalid'}); }
  if (!formalBytes(value).equals(bytes)) return Object.freeze({status: 'rejected', reason: 'byte-envelope-invalid'});
  const checked = validator(value);
  return checked.status === 'passed' ? Object.freeze({status: 'decoded', value: freezeDeep(value)})
    : Object.freeze({status: 'rejected', reason: 'schema-invalid'});
};

export const validatePresentationZevoCaptionQualityV002FixtureJobV001 = value => {
  const violations = [];
  if (!exactKeys(value, ['schemaVersion', 'jobId', 'attemptId', 'fixtureSetId', 'outputRoot', 'sourceInputs', 'proofExecutionRoots', 'implementationBindings', 'approvedContractBindings'])) {
    violations.push({code: 'CUE_FIXTURE_JOB_INVALID', path: '/'});
  } else {
    if (value.schemaVersion !== JOB_SCHEMA || !FORMAL_ID.test(value.jobId) || !FORMAL_ID.test(value.attemptId)
      || !FORMAL_ID.test(value.fixtureSetId)
      || value.outputRoot !== `${FIXTURE_ROOT_PREFIX}${value.fixtureSetId}`) violations.push({code: 'CUE_FIXTURE_JOB_INVALID', path: '/'});
    if (!exactKeys(value.sourceInputs, ['landscapeStyleRequestBinding', 'cases'])
      || !validateFormalBinding(value.sourceInputs.landscapeStyleRequestBinding)
      || !dense(value.sourceInputs.cases) || value.sourceInputs.cases.length !== 3) violations.push({code: 'CUE_FIXTURE_JOB_INVALID', path: '/sourceInputs'});
    if (!exactKeys(value.proofExecutionRoots, ['proofOutputParent', 'rendererWorkParent'])
      || !WORKSPACE_PATH.test(value.proofExecutionRoots.proofOutputParent)
      || value.proofExecutionRoots.rendererWorkParent !== RENDERER_WORK_PARENT) violations.push({code: 'CUE_FIXTURE_JOB_INVALID', path: '/proofExecutionRoots'});
    if (!dense(value.implementationBindings) || value.implementationBindings.length !== 58
      || !value.implementationBindings.every(validateImplementationBinding)) violations.push({code: 'CUE_FIXTURE_JOB_INVALID', path: '/implementationBindings'});
    if (!dense(value.approvedContractBindings) || value.approvedContractBindings.length !== 22
      || !value.approvedContractBindings.every(validateContractBinding)
      || JSON.stringify(value.approvedContractBindings) !== JSON.stringify(CONTRACT_BINDINGS)) violations.push({code: 'CUE_FIXTURE_JOB_INVALID', path: '/approvedContractBindings'});
  }
  return freezeDeep({status: violations.length === 0 ? 'passed' : 'rejected', violations});
};
export const decodePresentationZevoCaptionQualityV002FixtureJobV001 = bytes => strictDecode(bytes, validatePresentationZevoCaptionQualityV002FixtureJobV001);

const validatePackageShape = value => exactKeys(value, ['schemaVersion', 'fixtureSetId', 'manufactureJobBinding', 'sourceInputs', 'normalFixture', 'negativeFixtures', 'reviewFixture', 'environmentManifestBinding', 'retentionManifestBinding', 'artifactBindings', 'checks'])
  && value.schemaVersion === PACKAGE_SCHEMA && FORMAL_ID.test(value.fixtureSetId)
  && validateFormalBinding(value.manufactureJobBinding)
  && dense(value.negativeFixtures) && value.negativeFixtures.length === 26
  && dense(value.artifactBindings) && value.artifactBindings.length === 44
  && validateFormalBinding(value.environmentManifestBinding) && validateFormalBinding(value.retentionManifestBinding)
  && exactKeys(value.checks, ['sourceBindings', 'artifactClosure', 'normalFixture', 'negativeFixtureSet', 'reviewFixture', 'executionPathProjection', 'environmentManifest', 'retentionManifest', 'atomicPublication'])
  && Object.values(value.checks).every(item => item === 'passed');
export const validatePresentationZevoCaptionQualityV002FixturePackageV001 = value => freezeDeep({
  status: validatePackageShape(value) ? 'passed' : 'rejected',
  violations: validatePackageShape(value) ? [] : [{code: 'CUE_FIXTURE_SOURCE_INVALID', path: '/'}],
});
export const decodePresentationZevoCaptionQualityV002FixturePackageV001 = bytes => strictDecode(bytes, validatePresentationZevoCaptionQualityV002FixturePackageV001);

const validateReceiptShape = value => exactKeys(value, ['schemaVersion', 'receiptId', 'status', 'manufactureJobBinding', 'fixturePackageBinding', 'artifactBindings', 'environmentManifestBinding', 'retentionManifestBinding', 'environmentObservations', 'checks'])
  && value.schemaVersion === RECEIPT_SCHEMA && FORMAL_ID.test(value.receiptId) && value.status === 'passed'
  && validateFormalBinding(value.manufactureJobBinding) && validateFormalBinding(value.fixturePackageBinding)
  && dense(value.artifactBindings) && value.artifactBindings.length === 44
  && validateFormalBinding(value.environmentManifestBinding) && validateFormalBinding(value.retentionManifestBinding)
  && dense(value.environmentObservations) && value.environmentObservations.length === 600
  && exactKeys(value.checks, ['jobBinding', 'sourceBindingSet', 'artifactBindingSet', 'packageBinding', 'environmentBinding', 'retentionBinding', 'environmentObservation', 'publicationReread'])
  && Object.values(value.checks).every(item => item === 'passed');
export const validatePresentationZevoCaptionQualityV002FixtureReceiptV001 = value => freezeDeep({
  status: validateReceiptShape(value) ? 'passed' : 'rejected',
  violations: validateReceiptShape(value) ? [] : [{code: 'CUE_FIXTURE_SOURCE_INVALID', path: '/'}],
});
export const decodePresentationZevoCaptionQualityV002FixtureReceiptV001 = bytes => strictDecode(bytes, validatePresentationZevoCaptionQualityV002FixtureReceiptV001);

const observeRequirement = async row => {
  const absolute = absoluteWorkspacePath(row.path);
  if (row.resourceKind === 'directory-entry-prefix') {
    let names = [];
    try { names = await readdir(absolute); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    return Object.freeze({requirementId: row.requirementId, status: names.filter(name => name.startsWith(row.namePrefix)).length === 0 ? 'passed' : 'failed'});
  }
  let item;
  try { item = await lstat(absolute); } catch (error) {
    if (error?.code === 'ENOENT') return Object.freeze({requirementId: row.requirementId, status: row.requiredState === 'absent' ? 'passed' : 'failed'});
    throw error;
  }
  if (row.requiredState === 'absent') return Object.freeze({requirementId: row.requirementId, status: 'failed'});
  let passed = item.isDirectory() && !item.isSymbolicLink() && await realpath(absolute) === absolute;
  for (const permission of row.permissions) {
    try { await access(absolute, permission === 'write' ? fsConstants.W_OK : fsConstants.X_OK); } catch { passed = false; }
  }
  return Object.freeze({requirementId: row.requirementId, status: passed ? 'passed' : 'failed'});
};
const environmentRowsFor = (job, proofJobs) => {
  const rows = [];
  const add = (owner, resourceKind, rowPath, namePrefix, requiredState, permissions, derivation) => rows.push({owner, resourceKind, path: rowPath, namePrefix, requiredState, permissions, derivation});
  add('fixture-manufacture', 'directory', job.proofExecutionRoots.proofOutputParent, null, 'real-directory', ['write', 'execute'], null);
  add('fixture-manufacture', 'directory', job.proofExecutionRoots.rendererWorkParent, null, 'real-directory', ['write', 'execute'], null);
  for (const proofJob of proofJobs) {
    const projection = derivePresentationZevoCaptionQualityV002ExecutionPathsV001({
      jobId: proofJob.jobId,
      attemptId: proofJob.attemptId,
      proofOutputRoot: proofJob.outputRoot,
      cases: proofJob.cases.map(({caseId}) => ({caseId})),
      rendererWorkParent: job.proofExecutionRoots.rendererWorkParent,
    });
    const rootDerivation = {kind: 'proof-job', jobId: proofJob.jobId, attemptId: proofJob.attemptId, caseId: null};
    add('F', 'path', projection.proofOutputRoot, null, 'absent', [], rootDerivation);
    add('F', 'path', projection.proofStagingRoot, null, 'absent', [], rootDerivation);
    for (const item of projection.cases) add('F', 'path', item.proofCaseRoot, null, 'absent', [], {kind: 'proof-case', jobId: proofJob.jobId, attemptId: proofJob.attemptId, caseId: item.caseId});
    for (const item of projection.cases) add('F', 'path', item.proofStagingCaseRoot, null, 'absent', [], {kind: 'proof-case', jobId: proofJob.jobId, attemptId: proofJob.attemptId, caseId: item.caseId});
    add('F', 'path', projection.proofReviewRoot, null, 'absent', [], rootDerivation);
    add('F', 'path', projection.proofStagingReviewRoot, null, 'absent', [], rootDerivation);
    add('F', 'path', projection.rendererExecutionScopeRoot, null, 'absent', [], rootDerivation);
    for (const item of projection.cases) add('F', 'path', item.rendererCaseParent, null, 'absent', [], {kind: 'renderer-case', jobId: proofJob.jobId, attemptId: proofJob.attemptId, caseId: item.caseId});
    for (const item of projection.cases) add('F', 'path', item.rendererOutputRoot, null, 'absent', [], {kind: 'renderer-case', jobId: proofJob.jobId, attemptId: proofJob.attemptId, caseId: item.caseId});
    for (const item of projection.cases) add('F', 'path', item.rendererLockRoot, null, 'absent', [], {kind: 'renderer-case', jobId: proofJob.jobId, attemptId: proofJob.attemptId, caseId: item.caseId});
    for (const item of projection.cases) add('F', 'directory-entry-prefix', item.rendererWorkPrefixParent, item.rendererWorkPrefix, 'zero-matches', [], {kind: 'renderer-case', jobId: proofJob.jobId, attemptId: proofJob.attemptId, caseId: item.caseId});
  }
  const ordered = rows.map((row, index) => ({requirementId: `environment-${String(index + 1).padStart(6, '0')}`, ...row}));
  if (ordered.length !== 600) throw new Error('environment manifest row count changed');
  return freezeDeep({schemaVersion: ENVIRONMENT_SCHEMA, requirements: ordered});
};

const writeArtifact = async (stagingRoot, relativePath, bytes) => {
  const absolute = path.join(stagingRoot, relativePath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, bytes, {flag: 'wx', mode: 0o444});
  return bindingForBytes(relativePath, bytes);
};
const writeFormalArtifact = async (stagingRoot, relativePath, value) => {
  await writeArtifact(stagingRoot, relativePath, formalBytes(value));
  return bindingForFormal(value.schemaVersion, relativePath, value);
};
const updateFormalBindings = (value, replacements) => {
  const copied = clone(value);
  const visit = current => {
    if (Array.isArray(current)) return current.forEach(visit);
    if (!isObject(current)) return;
    if (typeof current.path === 'string' && replacements.has(current.path)) Object.assign(current, clone(replacements.get(current.path)));
    for (const child of Object.values(current)) visit(child);
  };
  visit(copied);
  return copied;
};
const oracleFile = name => `${ORACLE_ROOT}/${name}`;
const oracleBytes = name => stableRead(oracleFile(name));
const jobNameForLabel = label => label === 'normal'
  ? 'zcq-caption-quality-proof-f-gate-attempt-0009.json'
  : `zcq-caption-quality-proof-${label}-attempt-0001.json`;

const buildReviewInput = ({proofJobBinding, root}) => {
  const oldRoot = 'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008';
  const old = {
    'voice-013': [['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/horizontal-formal/render-plan-v002.json', '86d8769415b00c5a9379164fdaa209e07b78a0179745382d67612cb1a19cbd5e', '9f91df2f907291c0f312baa6faedf912bdc87d545dd4c1edf1720d4528754c5f'], ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/vertical-caption-diagnostic/render-plan-v002.json', '5ebed5a6bb21e29af5c347e17af619737e2b06db55fd4d82336c8ad43cce1ca5', '1d25b2a12c0a388f67f5f67df5dd5bc1eea8e781cefeb43ca3ee0a14bb173c60']],
    'voice-067': [['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-067/horizontal-formal/render-plan-v002.json', '4c82f3ecd81153befcc4ce470322a4fdbe6a777441fb0ff89f03a2d9c256c0e3', 'a84bb0653477253b9a39418d0d30dfa7f4a0057f499780bda32981c5c04135d1'], ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-067/vertical-caption-diagnostic/render-plan-v002.json', '476fe41ad5b0e659641819f78e49f7b992044f37cf2f9bb56b6973decad1ff92', '14dff3764fb2a5502bb908a4f94b8c9aa94ae2bcc72e2a4c991d01dfe9820071']],
    'voice-190': [['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-190/horizontal-formal/render-plan-v002.json', '613f2862bc6ed7a331a37dad0c03b94fbf0d17b8a1d04958790d9f80d3b72e01', '9da441d1c2265067837602483c8c6b03da9ff39aa1c49f1ac2842db3473bfd57'], ['layer1-v3-nE_bNeBNp4E_multiblock_material_v001-5-voice-190/vertical-caption-diagnostic/render-plan-v002.json', 'f153fc409cbb07a9514a80c0f27c6c7f165495ffd23c6eda68ed0b49b139d317', 'ff2834ad902706927998d8412e3fd7a0b871131cac21d7c2c787700157a29a3a']],
  };
  const questions = [
    ['prior-caption-residue', '前の発話の文字が次の発話まで残っていないか。'], ['short-cue-line-break', '一行に収まる短い発話が改行されていないか。'],
    ['long-cue-line-break', '長い発話だけが必要な位置で自然に二行へ分かれているか。'], ['text-closure', '全文を通して文字の欠落・重複・逆順がないか。'],
    ['short-cue-fade', '最短cueで既存4frame fadeにより読めない・不自然に瞬く見え方がないか。'],
  ].map(([questionId, prompt]) => ({questionId, prompt}));
  const videoRows = CASES.map((item, index) => {
    const videoBytes = Buffer.from(`fixture-video-${item.caseId}\n`, 'utf8');
    const videoPath = `${root}/u/${item.caseId}.mp4`;
    const qc = {schemaVersion: 'presentation-renderer-qc-v002', status: 'passed'};
    const qcPath = `${root}/u/${item.caseId}-qc.json`;
    return {item, index, videoBytes, videoPath, videoBinding: bindingForBytes(videoPath, videoBytes), qc, qcPath, qcBinding: bindingForFormal(qc.schemaVersion, qcPath, qc)};
  });
  const reviewInput = {
    schemaVersion: 'presentation-zevo-caption-quality-v002-review-input-v001',
    reviewId: 'zcq-review-proof-job-review', observedFadeFrameCount: 4, proofJobBinding: clone(proofJobBinding), reviewQuestions: questions,
    items: videoRows.map(({item, index, videoBinding, qcBinding}) => ({
      ...item,
      humanObservationFixture: {oldRenderPlanBindings: old[item.caseId].map(([suffix, fileSha256, canonicalSha256]) => ({schemaVersion: 'presentation-output-render-plan-v002', path: `${oldRoot}/${suffix}`, fileSha256, canonicalSha256})), knownIssuePatterns: []},
      horizontal: {videoBinding, qcBinding, durationMilliseconds: 5000 + index, frameCount: 150 + index},
      cueTimingSummary: [
        {cueId: `${item.caseId}-cue-000001`, startFrame: 0, endFrameExclusive: 18 + index, displayFrameCount: 18 + index, lineTexts: [`<&\"' ${item.caseId}`]},
        {cueId: `${item.caseId}-cue-000002`, startFrame: 18 + index, endFrameExclusive: 42 + index, displayFrameCount: 24, lineTexts: ['長い発話だけ', '必要なら二行']},
      ],
    })),
  };
  return {reviewInput, videoRows, oldPlanBindings: Object.values(old).flat().map(([suffix, fileSha256, canonicalSha256]) => ({schemaVersion: 'presentation-output-render-plan-v002', path: `${oldRoot}/${suffix}`, fileSha256, canonicalSha256}))};
};

const manufacture = async (job, jobPath) => {
  const outputAbsolute = absoluteWorkspacePath(job.outputRoot);
  const stagingRelative = `${job.outputRoot}.staging`;
  const stagingAbsolute = absoluteWorkspacePath(stagingRelative);
  try { await lstat(outputAbsolute); throw new Error('fixture output root already exists'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  try { await lstat(stagingAbsolute); throw new Error('fixture staging root already exists'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  await mkdir(absoluteWorkspacePath(job.proofExecutionRoots.proofOutputParent), {recursive: true});
  await mkdir(absoluteWorkspacePath(job.proofExecutionRoots.rendererWorkParent), {recursive: true});
  await mkdir(path.dirname(stagingAbsolute), {recursive: true});
  await mkdir(stagingAbsolute, {recursive: false});

  for (const binding of [...job.implementationBindings, ...job.approvedContractBindings]) await readBound(binding);
  await readBound(job.sourceInputs.landscapeStyleRequestBinding);
  for (const row of job.sourceInputs.cases) for (const binding of Object.values(row).filter(value => validateFormalBinding(value) || validateByteBinding(value))) await readBound(binding);

  const artifactBindings = [];
  const artifactBytes = new Map();
  const replacements = new Map();
  const writeFormalPayload = async (relativePath, value) => {
    const bytes = formalBytes(value);
    const binding = await writeFormalArtifact(stagingAbsolute, relativePath, value);
    artifactBytes.set(relativePath, bytes);
    artifactBindings.push(binding); return binding;
  };
  const writeBytePayload = async (relativePath, bytes) => {
    await writeArtifact(stagingAbsolute, relativePath, bytes);
    artifactBytes.set(relativePath, bytes);
    const binding = bindingForBytes(relativePath, bytes); artifactBindings.push(binding); return binding;
  };

  const source = JSON.parse(await oracleBytes('source-package-v001.json'));
  const sourcePath = `${job.outputRoot}/f/source-package-v001.json`;
  const sourceBinding = await writeFormalPayload('f/source-package-v001.json', source);
  replacements.set(oracleFile('source-package-v001.json'), {...sourceBinding, path: sourcePath});
  const b6 = {schemaVersion: 'presentation-output-caption-cue-b6-manifest-v001', fixture: true};
  const b6Path = `${job.outputRoot}/f/b6-manifest-v001.json`;
  const b6BindingLocal = await writeFormalPayload('f/b6-manifest-v001.json', b6);
  const b6Binding = {...b6BindingLocal, path: b6Path};
  replacements.set(oracleFile('b6-manifest-v001.json'), b6Binding);
  const envelope = {schemaVersion: 'presentation-output-caption-cue-provider-response-envelope-v001', fixture: true};
  const envelopePath = `${job.outputRoot}/f/provider-envelope-v001.json`;
  const envelopeBindingLocal = await writeFormalPayload('f/provider-envelope-v001.json', envelope);
  const envelopeBinding = {...envelopeBindingLocal, path: envelopePath};
  replacements.set(oracleFile('provider-envelope-v001.json'), envelopeBinding);
  const selectionJob = {schemaVersion: 'presentation-output-caption-cue-selection-job-v001', fixture: true};
  const selectionJobPath = `${job.outputRoot}/f/selection-job-v001.json`;
  const selectionJobBindingLocal = await writeFormalPayload('f/selection-job-v001.json', selectionJob);
  const selectionJobBinding = {...selectionJobBindingLocal, path: selectionJobPath};
  replacements.set(oracleFile('selection-job-v001.json'), selectionJobBinding);
  const oracleSelection = JSON.parse(await oracleBytes('selection-v001.json'));
  const rawBytes = formalBytes(oracleSelection.response);
  const rawPath = `${job.outputRoot}/f/provider.raw.json`;
  const rawBindingLocal = await writeBytePayload('f/provider.raw.json', rawBytes);
  const rawBinding = {...rawBindingLocal, path: rawPath};
  replacements.set(oracleFile('provider.raw.json'), rawBinding);
  let selection = updateFormalBindings(oracleSelection, replacements);
  const selectionPath = `${job.outputRoot}/f/selection-v001.json`;
  const selectionBindingLocal = await writeFormalPayload('f/selection-v001.json', selection);
  const selectionBinding = {...selectionBindingLocal, path: selectionPath};
  replacements.set(oracleFile('selection-v001.json'), selectionBinding);
  let selectionReport = updateFormalBindings(JSON.parse(await oracleBytes('selection-report-v001.json')), replacements);
  selectionReport.rawResponseBinding = rawBinding;
  const selectionReportPath = `${job.outputRoot}/f/selection-report-v001.json`;
  const selectionReportBindingLocal = await writeFormalPayload('f/selection-report-v001.json', selectionReport);
  const selectionReportBinding = {...selectionReportBindingLocal, path: selectionReportPath};
  replacements.set(oracleFile('selection-report-v001.json'), selectionReportBinding);

  const proofImplementation = job.implementationBindings.filter(binding => binding.role !== 'caption-quality-fixture-manufacture-runner-v001');
  const normalOracle = JSON.parse(await oracleBytes(jobNameForLabel('normal')));
  const makeJob = (label, override = null) => {
    const proofJob = updateFormalBindings(normalOracle, replacements);
    proofJob.jobId = `zcq-${job.fixtureSetId}-${label}`;
    proofJob.attemptId = 'attempt-0001';
    proofJob.sourcePackageBinding = {...sourceBinding, path: sourcePath};
    proofJob.selectionBinding = selectionBinding;
    proofJob.selectionReportBinding = override ?? selectionReportBinding;
    proofJob.runtimeDataBindings = Object.freeze([
      clone(normalOracle.runtimeDataBindings[0]),
      clone(PRESENTATION_ZEVO_CAPTION_RENDERER_TRUST_RUNTIME_BINDING_V002),
    ]);
    proofJob.outputRoot = `${job.proofExecutionRoots.proofOutputParent}/${label}`;
    proofJob.implementationBindings = clone(proofImplementation);
    proofJob.approvedContractBindings = clone(CONTRACT_BINDINGS);
    return proofJob;
  };
  const normalJob = makeJob('normal');
  const normalRelative = `f/${normalJob.jobId}.json`;
  const normalPath = `${job.outputRoot}/${normalRelative}`;
  const normalBindingLocal = await writeFormalPayload(normalRelative, normalJob);
  const normalBinding = {...normalBindingLocal, path: normalPath};

  const rejectedBindings = {};
  for (const [short, oracleName] of [['write-failure', 'selection-report-write-failure.json'], ['reread-failure', 'selection-report-reread-failure.json']]) {
    const value = updateFormalBindings(JSON.parse(await oracleBytes(oracleName)), replacements);
    value.rawResponseBinding = rawBinding;
    const relative = `f/selection-report-${short}.json`;
    const local = await writeFormalPayload(relative, value);
    rejectedBindings[short] = {...local, path: `${job.outputRoot}/${relative}`};
  }
  const capabilityFaultFor = label => ({
    'root-reservation-collision': 'ensurePathAbsent', 'planner-rejected-first-case': 'buildPageLinePlan',
    'render-rejected-first-case': 'buildRenderPlan', 'renderer-rejected-first-case': 'executeRendererAndQc',
    'renderer-rejected-second-case': 'executeRendererAndQc', 'output-request-reread-mismatch': 'readStableBytes',
    'output-request-reread-io-failure': 'readStableBytes', 'render-plan-write-failure': 'writeNoReplaceBytes',
    'render-plan-reread-mismatch': 'readStableBytes', 'owner-missing': 'executeRendererAndQc',
    'owner-permission': 'executeRendererAndQc', 'owner-mismatch': 'executeRendererAndQc',
    'work-video-missing': 'executeRendererAndQc', 'review-id-mismatch': 'validateReviewInput',
    'review-fade-mismatch': 'validateReviewInput', 'review-build-failure': 'buildReviewHtml',
    'review-write-failure': 'writeNoReplaceBytes', 'review-reread-failure': 'readStableBytes',
    'completion-write-failure': 'writeNoReplaceBytes', 'completion-reread-failure': 'readStableBytes',
    'failure-report-write-failure': 'writeNoReplaceBytes', 'failure-report-reread-failure': 'readStableBytes',
    'fade-throw': 'deriveObservedFadeFrameCount', 'publisher-helper-failure': 'publishDirectory',
    'publisher-late-collision': 'publishDirectory',
  }[label] ?? null);
  const negativeFixtures = [];
  const executableJobs = [normalJob];
  for (const label of NEGATIVE_LABELS) {
    let binding;
    let proofJob = null;
    if (label === MALFORMED_PROOF_LABEL) {
      const relative = `f/negative/${MALFORMED_PROOF_LABEL}.json`;
      const bytes = Buffer.from('{}\n', 'utf8');
      const local = await writeBytePayload(relative, bytes);
      binding = {...local, path: `${job.outputRoot}/${relative}`};
    } else {
      const override = label === 'failure-report-write-failure' ? rejectedBindings['write-failure']
        : label === 'failure-report-reread-failure' ? rejectedBindings['reread-failure'] : null;
      proofJob = makeJob(label, override);
      const relative = `f/negative/${proofJob.jobId}.json`;
      const local = await writeFormalPayload(relative, proofJob);
      binding = {...local, path: `${job.outputRoot}/${relative}`};
      executableJobs.push(proofJob);
    }
    negativeFixtures.push({
      label,
      proofJobBinding: binding,
      selectionReportOverrideBinding: label === 'failure-report-write-failure' ? rejectedBindings['write-failure']
        : label === 'failure-report-reread-failure' ? rejectedBindings['reread-failure'] : null,
      capabilityFault: capabilityFaultFor(label),
      expectedCli: {status: 'owned-by-f-test', stage: 'owned-by-f-test', primaryCode: 'owned-by-f-test'},
      outputRetention: {manifestOwner: 'retention-manifest', label},
      stagingRetention: {manifestOwner: 'retention-manifest', label},
    });
  }
  const auditBytes = await oracleBytes('proof-module-import-audit.mjs');
  await writeBytePayload('f/proof-module-import-audit.mjs', auditBytes);

  const reviewBuilt = buildReviewInput({proofJobBinding: normalBinding, root: job.outputRoot});
  const reviewInputLocal = await writeFormalPayload('u/review-input-v001.json', reviewBuilt.reviewInput);
  for (const row of reviewBuilt.videoRows) {
    await writeBytePayload(`u/${row.item.caseId}.mp4`, row.videoBytes);
    await writeFormalPayload(`u/${row.item.caseId}-qc.json`, row.qc);
  }
  if (artifactBindings.length !== 44) throw new Error(`artifact payload count changed: ${artifactBindings.length}`);
  const absoluteArtifacts = artifactBindings.map(binding => ({...binding, path: `${job.outputRoot}/${binding.path}`}))
    .sort((left, right) => left.path.localeCompare(right.path));
  const absoluteArtifactBytes = new Map([...artifactBytes].map(
    ([relativePath, bytes]) => [`${job.outputRoot}/${relativePath}`, bytes],
  ));

  const environment = environmentRowsFor(job, executableJobs);
  const environmentObservations = await Promise.all(environment.requirements.map(observeRequirement));
  if (!environmentObservations.every(item => item.status === 'passed')) throw new Error('fixture environment preflight failed');
  const environmentRelative = 'environment-manifest-v001.json';
  await writeFormalArtifact(stagingAbsolute, environmentRelative, environment);
  const environmentBinding = bindingForFormal(ENVIRONMENT_SCHEMA, `${job.outputRoot}/${environmentRelative}`, environment);

  const retention = {
    schemaVersion: RETENTION_SCHEMA,
    rows: NEGATIVE_LABELS.map(label => ({label, cli: {owner: 'F_NEGATIVE_EXPECTATIONS', label}, roots: {output: {owner: 'F_NEGATIVE_EXPECTATIONS', label}, staging: {owner: 'F_NEGATIVE_EXPECTATIONS', label}}})),
  };
  const retentionRelative = 'retention-manifest-v001.json';
  await writeFormalArtifact(stagingAbsolute, retentionRelative, retention);
  const retentionBinding = bindingForFormal(RETENTION_SCHEMA, `${job.outputRoot}/${retentionRelative}`, retention);
  const jobValue = JSON.parse(await stableRead(jobPath));
  const manufactureJobBinding = bindingForFormal(JOB_SCHEMA, jobPath, jobValue);
  const packageValue = {
    schemaVersion: PACKAGE_SCHEMA,
    fixtureSetId: job.fixtureSetId,
    manufactureJobBinding,
    sourceInputs: clone(job.sourceInputs),
    normalFixture: {
      sourcePackageBinding: {...sourceBinding, path: sourcePath}, b6ManifestBinding: b6Binding,
      providerEnvelopeBinding: envelopeBinding, selectionJobBinding, rawResponseBinding: rawBinding,
      selectionBinding, selectionReportBinding, proofJobBinding: normalBinding, caseRows: clone(CASES),
    },
    negativeFixtures: negativeFixtures.sort((left, right) => left.label.localeCompare(right.label)),
    reviewFixture: {
      reviewInputBinding: {...reviewInputLocal, path: `${job.outputRoot}/u/review-input-v001.json`},
      videoBindings: reviewBuilt.videoRows.map(row => row.videoBinding),
      qcBindings: reviewBuilt.videoRows.map(row => row.qcBinding),
      oldRenderPlanBindings: reviewBuilt.oldPlanBindings,
    },
    environmentManifestBinding: environmentBinding,
    retentionManifestBinding: retentionBinding,
    artifactBindings: absoluteArtifacts,
    checks: {sourceBindings: 'passed', artifactClosure: 'passed', normalFixture: 'passed', negativeFixtureSet: 'passed', reviewFixture: 'passed', executionPathProjection: 'passed', environmentManifest: 'passed', retentionManifest: 'passed', atomicPublication: 'passed'},
  };
  if (validatePresentationZevoCaptionQualityV002FixturePackageV001(packageValue).status !== 'passed') throw new Error('fixture package invalid');
  if (!validateProofJobConsumerClosure(packageValue, absoluteArtifactBytes)) throw new Error('fixture consumer path invalid');
  const packageRelative = 'fixture-package-v001.json';
  await writeFormalArtifact(stagingAbsolute, packageRelative, packageValue);
  const packageBinding = bindingForFormal(PACKAGE_SCHEMA, `${job.outputRoot}/${packageRelative}`, packageValue);
  const receiptValue = {
    schemaVersion: RECEIPT_SCHEMA,
    receiptId: `${job.fixtureSetId}-receipt-v001`,
    status: 'passed',
    manufactureJobBinding,
    fixturePackageBinding: packageBinding,
    artifactBindings: absoluteArtifacts,
    environmentManifestBinding: environmentBinding,
    retentionManifestBinding: retentionBinding,
    environmentObservations,
    checks: {jobBinding: 'passed', sourceBindingSet: 'passed', artifactBindingSet: 'passed', packageBinding: 'passed', environmentBinding: 'passed', retentionBinding: 'passed', environmentObservation: 'passed', publicationReread: 'passed'},
  };
  if (validatePresentationZevoCaptionQualityV002FixtureReceiptV001(receiptValue).status !== 'passed') throw new Error('fixture receipt invalid');
  const receiptRelative = 'fixture-admission-receipt-v001.json';
  await writeFormalArtifact(stagingAbsolute, receiptRelative, receiptValue);
  const files = [];
  const visit = async (absolute, relative = '') => {
    for (const entry of (await readdir(absolute, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
      const nextAbsolute = path.join(absolute, entry.name);
      const nextRelative = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) await visit(nextAbsolute, nextRelative); else if (entry.isFile()) files.push(nextRelative); else throw new Error('fixture staging contains non-file');
    }
  };
  await visit(stagingAbsolute);
  if (files.length !== 48) throw new Error(`fixture publication file count changed: ${files.length}`);
  for (const relative of files) await stableRead(`${stagingRelative}/${relative}`);
  const publishBindings = job.implementationBindings.filter(binding => binding.role !== 'caption-quality-fixture-manufacture-runner-v001');
  const publication = await publishPresentationDirectoryAtomicallyNoReplaceV001({workspaceRoot: WORKSPACE_ROOT, stagingRoot: stagingRelative, outputRoot: job.outputRoot, verifiedImplementationBindings: publishBindings});
  if (publication.status !== 'published') throw new Error('fixture atomic publication failed');
  for (const relative of files) await stableRead(`${job.outputRoot}/${relative}`);
  return freezeDeep({receiptPath: `${job.outputRoot}/${receiptRelative}`, fixtureSetId: job.fixtureSetId, fileCount: files.length});
};

const cliResult = ({status, job = null, stage, primaryCode}) => freezeDeep({
  schemaVersion: CLI_SCHEMA,
  status,
  jobId: job?.jobId ?? null,
  attemptId: job?.attemptId ?? null,
  fixtureSetId: job?.fixtureSetId ?? null,
  outputRoot: job?.outputRoot ?? null,
  stage,
  primaryCode,
});

export const executePresentationZevoCaptionQualityV002FixtureJobV001 = async jobPath => {
  let job;
  try {
    if (!WORKSPACE_PATH.test(jobPath)) return cliResult({status: 'rejected', stage: 'job-read', primaryCode: 'CUE_FIXTURE_JOB_INVALID'});
    const decoded = decodePresentationZevoCaptionQualityV002FixtureJobV001(await stableRead(jobPath));
    if (decoded.status !== 'decoded') return cliResult({status: 'rejected', stage: 'job-read', primaryCode: 'CUE_FIXTURE_JOB_INVALID'});
    job = decoded.value;
    await manufacture(job, jobPath);
    return cliResult({status: 'passed', job, stage: 'completed', primaryCode: null});
  } catch (error) {
    const code = job === undefined ? 'CUE_FIXTURE_JOB_INVALID'
      : error?.message?.includes('environment') ? 'CUE_FIXTURE_ENVIRONMENT_INVALID'
        : error?.message?.includes('publication') || error?.message?.includes('output root') || error?.message?.includes('staging root') ? 'CUE_FIXTURE_PUBLICATION_FAILED'
          : 'CUE_FIXTURE_SOURCE_INVALID';
    const stage = job === undefined ? 'job-read' : code === 'CUE_FIXTURE_ENVIRONMENT_INVALID' ? 'environment-preflight'
      : code === 'CUE_FIXTURE_PUBLICATION_FAILED' ? 'root-publication' : 'fixture-build';
    return cliResult({status: code === 'CUE_FIXTURE_JOB_INVALID' ? 'rejected' : 'fatal', job, stage, primaryCode: code});
  }
};

export const admitPresentationZevoCaptionQualityV002FixtureV001 = async input => {
  if (!exactKeys(input, ['receiptPath', 'expectedGateId'])
    || typeof input.receiptPath !== 'string'
    || !WORKSPACE_PATH.test(input.receiptPath)
    || !input.receiptPath.startsWith(FIXTURE_ROOT_PREFIX)
    || !['F', 'U'].includes(input.expectedGateId)
    || path.basename(input.receiptPath) !== 'fixture-admission-receipt-v001.json') return freezeDeep({status: 'rejected', reason: 'receipt-input-invalid'});
  try {
    const decoded = decodePresentationZevoCaptionQualityV002FixtureReceiptV001(await stableRead(input.receiptPath));
    if (decoded.status !== 'decoded') return freezeDeep({status: 'rejected', reason: 'receipt-invalid'});
    const receipt = decoded.value;
    const packageRead = await readBound(receipt.fixturePackageBinding);
    const packageDecoded = decodePresentationZevoCaptionQualityV002FixturePackageV001(packageRead.bytes);
    if (packageDecoded.status !== 'decoded') return freezeDeep({status: 'rejected', reason: 'package-invalid'});
    const packageValue = packageDecoded.value;
    const environment = (await readBound(receipt.environmentManifestBinding)).value;
    const retention = (await readBound(receipt.retentionManifestBinding)).value;
    if (environment?.schemaVersion !== ENVIRONMENT_SCHEMA || environment.requirements.length !== 600
      || retention?.schemaVersion !== RETENTION_SCHEMA || retention.rows.length !== 26) return freezeDeep({status: 'rejected', reason: 'manifest-invalid'});
    const artifactValues = {};
    const artifactBytes = new Map();
    for (const binding of receipt.artifactBindings) {
      const artifact = await readBound(binding);
      artifactValues[binding.path] = artifact.value ?? artifact.bytes;
      artifactBytes.set(binding.path, artifact.bytes);
    }
    if (!validateProofJobConsumerClosure(packageValue, artifactBytes)) {
      return freezeDeep({status: 'rejected', reason: 'consumer-path-invalid'});
    }
    if (input.expectedGateId === 'F') {
      const observations = await Promise.all(environment.requirements.map(observeRequirement));
      if (!observations.every(item => item.status === 'passed')) return freezeDeep({status: 'rejected', reason: 'environment-invalid'});
    }
    return freezeDeep({
      status: 'passed', gateId: input.expectedGateId, receipt, package: packageValue, environmentManifest: environment,
      retentionManifest: retention, artifactValues,
      fixture: input.expectedGateId === 'F' ? {normalFixture: packageValue.normalFixture, negativeFixtures: packageValue.negativeFixtures}
        : {reviewFixture: packageValue.reviewFixture},
    });
  } catch { return freezeDeep({status: 'rejected', reason: 'receipt-reread-failed'}); }
};

const isDirectExecution = process.argv.length >= 2
  && process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === path.resolve(MODULE_ABSOLUTE);
if (isDirectExecution) {
  if (process.argv.length !== 3) {
    process.stdout.write(`${JSON.stringify(cliResult({status: 'rejected', stage: 'job-read', primaryCode: 'CUE_FIXTURE_JOB_INVALID'}), null, 2)}\n`);
    process.exitCode = 1;
  } else {
    executePresentationZevoCaptionQualityV002FixtureJobV001(process.argv[2]).then(result => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.status === 'passed' ? 0 : result.status === 'rejected' ? 1 : 2;
    });
  }
}
