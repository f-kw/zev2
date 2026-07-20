import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { canonicalJson } from './presentation_caption_contract.mjs';
import {
  APPROVAL_ROOT,
  buildFormalTrustBinding,
  CANDIDATE_ROOT,
  FORMAL_FILES,
  FORMAL_REGISTRY_ROOT,
  validateHumanApproval,
} from './finalize_presentation_initial_preset_review.mjs';

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('human approval binds all five approvals to the v002 preview manifest', async () => {
  const approval = await readJson(path.join(APPROVAL_ROOT, 'human-approval.json'));
  const previewManifestPath = path.join(CANDIDATE_ROOT, 'preview-manifest.json');
  const previewManifestText = await readFile(previewManifestPath, 'utf8');
  const previewManifest = JSON.parse(previewManifestText);
  assert.equal(validateHumanApproval({
    approval,
    previewManifest,
    previewManifestSha256: sha256(previewManifestText),
  }), true);
});

test('incomplete or candidate-v001 approval cannot be promoted', async () => {
  const approval = await readJson(path.join(APPROVAL_ROOT, 'human-approval.json'));
  const previewManifestText = await readFile(path.join(CANDIDATE_ROOT, 'preview-manifest.json'), 'utf8');
  const previewManifest = JSON.parse(previewManifestText);
  assert.throws(() => validateHumanApproval({
    approval: { ...approval, decisions: { ...approval.decisions, q3: 'needs_revision' } },
    previewManifest,
    previewManifestSha256: sha256(previewManifestText),
  }), /q3 is not approved/);
  assert.throws(() => validateHumanApproval({
    approval: { ...approval, previewId: 'normal-landscape-readable-pop-preview-20260720-v001' },
    previewManifest,
    previewManifestSha256: sha256(previewManifestText),
  }), /approved preview ID mismatch/);
});

test('formal registry is byte-identical to the human-reviewed candidate', async () => {
  const candidate = await readFile(path.join(CANDIDATE_ROOT, 'candidate-preset-registry.json'));
  const formal = await readFile(path.join(FORMAL_REGISTRY_ROOT, FORMAL_FILES.presetRegistry));
  assert.deepEqual(formal, candidate);
});

test('formal indices are byte-identical to the reviewed candidate indices', async () => {
  const pairs = [
    ['candidate-preset-validation-index.json', FORMAL_FILES.presetValidationIndex],
    ['candidate-empty-material-validation-index.json', FORMAL_FILES.materialValidationIndex],
  ];
  for (const [candidateName, formalName] of pairs) {
    assert.deepEqual(
      await readFile(path.join(FORMAL_REGISTRY_ROOT, formalName)),
      await readFile(path.join(CANDIDATE_ROOT, candidateName)),
    );
  }
});

test('formal trust binding contains canonical hashes of the exact formal indices', async () => {
  const [presetIndex, materialIndex, trustBinding] = await Promise.all([
    readJson(path.join(FORMAL_REGISTRY_ROOT, FORMAL_FILES.presetValidationIndex)),
    readJson(path.join(FORMAL_REGISTRY_ROOT, FORMAL_FILES.materialValidationIndex)),
    readJson(path.join(FORMAL_REGISTRY_ROOT, FORMAL_FILES.trustedRegistryBindings)),
  ]);
  assert.deepEqual(trustBinding, buildFormalTrustBinding(presetIndex, materialIndex));
  assert.equal(trustBinding.presetValidationIndexSha256, sha256(canonicalJson(presetIndex)));
  assert.equal(trustBinding.materialValidationIndexSha256, sha256(canonicalJson(materialIndex)));
});

test('approval manifest records formal trust and contract compatibility without mutating candidate manifest', async () => {
  const [approvalManifest, candidateManifest, formalRegistry] = await Promise.all([
    readJson(path.join(APPROVAL_ROOT, 'approval-manifest.json')),
    readJson(path.join(CANDIDATE_ROOT, 'preview-manifest.json')),
    readJson(path.join(FORMAL_REGISTRY_ROOT, FORMAL_FILES.presetRegistry)),
  ]);
  assert.equal(approvalManifest.formalTrustBindingWritten, true);
  assert.equal(approvalManifest.candidateContentChangedDuringPromotion, false);
  assert.equal(approvalManifest.contractCompatibility.status, 'passed');
  assert.equal(candidateManifest.formalTrustBindingWritten, false);
  assert.equal(
    approvalManifest.candidate.previewManifestFileSha256,
    sha256(await readFile(path.join(CANDIDATE_ROOT, 'preview-manifest.json'), 'utf8')),
  );
  assert.equal(
    approvalManifest.candidate.candidatePresetRegistryCanonicalSha256,
    candidateManifest.preset.candidateRegistrySha256,
  );
  assert.equal(
    approvalManifest.candidate.candidatePresetRegistryCanonicalSha256,
    sha256(canonicalJson(formalRegistry)),
  );
  assert.equal(approvalManifest.candidate.humanResultPath.endsWith('/human-result.md'), true);
});

test('approved registry keeps nine material-free kinds and leaves real G7 disabled', async () => {
  const [presetIndex, materialIndex] = await Promise.all([
    readJson(path.join(FORMAL_REGISTRY_ROOT, FORMAL_FILES.presetValidationIndex)),
    readJson(path.join(FORMAL_REGISTRY_ROOT, FORMAL_FILES.materialValidationIndex)),
  ]);
  const policies = presetIndex.presets[0].kindPolicies;
  assert.equal(policies.filter((policy) => policy.kind !== 'reference-supplement').length, 9);
  assert.deepEqual(materialIndex.materials, []);
  const g7 = policies.find((policy) => policy.kind === 'reference-supplement');
  assert.deepEqual(g7.allowedMaterialRoles, ['reference-image', 'reference-video']);
  assert.equal(materialIndex.materials.some((material) => g7.allowedMaterialRoles.includes(material.role)), false);
});
