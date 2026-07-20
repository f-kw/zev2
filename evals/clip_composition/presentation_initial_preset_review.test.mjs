import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { canonicalJson } from './presentation_caption_contract.mjs';
import { validatePresentationInstructionContract } from './presentation_instruction_contract.mjs';
import {
  CANDIDATE_REGISTRY_PATH,
  EXPECTED_KINDS,
  OUTPUT_ROOT,
  PREVIEW_PLAN_PATH,
  buildEphemeralTrust,
  buildReviewHtml,
  checkCandidateIndexCompatibility,
  deriveEmptyMaterialValidationIndex,
  derivePresetValidationIndex,
  validateCandidateRegistry,
  validatePreviewPlan,
  validateReviewHtml,
} from './build_presentation_initial_preset_review.mjs';

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const sha256Canonical = async (value) => {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
};

const loadCandidate = async () => {
  const registry = validateCandidateRegistry(await readJson(CANDIDATE_REGISTRY_PATH));
  const plan = validatePreviewPlan(await readJson(PREVIEW_PLAN_PATH), registry);
  return { registry, plan };
};

test('candidate registry fixes one preset and all ten kinds in contract order', async () => {
  const { registry } = await loadCandidate();
  assert.equal(registry.presets.length, 1);
  assert.deepEqual(registry.presets[0].kindPolicies.map((policy) => policy.kind), EXPECTED_KINDS);
  assert.equal(new Set(registry.presets[0].visualStates.map((state) => state.stateId)).size, 10);
});

test('candidate registry projection is deterministic and strips visual-only fields', async () => {
  const { registry } = await loadCandidate();
  const first = derivePresetValidationIndex(registry);
  const second = derivePresetValidationIndex(JSON.parse(JSON.stringify(registry)));
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(await sha256Canonical(first), await sha256Canonical(second));
  assert.deepEqual(Object.keys(first.presets[0]), ['presetId', 'format', 'kindPolicies']);
  assert.deepEqual(
    Object.keys(first.presets[0].kindPolicies[0]),
    ['kind', 'endResponsibility', 'allowedMaterialRoles', 'requiredMaterialRoles'],
  );
  assert.deepEqual(
    Object.keys(first.presets[0].kindPolicies[1]),
    ['kind', 'endResponsibility', 'endPolicyId', 'allowedMaterialRoles', 'requiredMaterialRoles'],
  );
});

test('empty material index and candidate preset index pass the existing outer contract', async () => {
  const { registry } = await loadCandidate();
  const presetIndex = derivePresetValidationIndex(registry);
  const materialIndex = deriveEmptyMaterialValidationIndex();
  const result = checkCandidateIndexCompatibility(presetIndex, materialIndex);
  assert.equal(result.status, 'passed');
  assert.equal(result.formalTrustBindingWritten, false);
});

test('nine material-free kinds pass while real G7 fails against the empty material index', async () => {
  const { registry } = await loadCandidate();
  const presetIndex = derivePresetValidationIndex(registry);
  const materialIndex = deriveEmptyMaterialValidationIndex();
  const sourceBundle = await readJson(new URL(
    './testdata/presentation-instruction-contract-v001/valid-all-kinds.bundle.json',
    import.meta.url,
  ));

  const prepare = async (includeG7) => {
    const bundle = structuredClone(sourceBundle);
    bundle.presetValidationIndex = structuredClone(presetIndex);
    bundle.materialValidationIndex = structuredClone(materialIndex);
    bundle.instructionSet.presetRegistryVersion = presetIndex.registryVersion;
    bundle.instructionSet.materialRegistryVersion = materialIndex.registryVersion;
    bundle.instructionSet.instructions = bundle.instructionSet.instructions
      .filter((instruction) => includeG7 || instruction.kind !== 'reference-supplement')
      .map((instruction) => ({
        ...instruction,
        presetId: registry.presets[0].presetId,
        materialRefs: [],
      }));
    if (!includeG7) {
      bundle.resolutionPackage.targets = bundle.resolutionPackage.targets
        .filter((target) => target.targetType !== 'reference-subject');
    }
    bundle.instructionSet.resolutionPackageSha256 = await sha256Canonical(bundle.resolutionPackage);
    return bundle;
  };

  const trust = buildEphemeralTrust(presetIndex, materialIndex);
  const nineKindReport = validatePresentationInstructionContract(await prepare(false), trust);
  assert.equal(nineKindReport.overallStatus, 'passed');

  const g7Report = validatePresentationInstructionContract(await prepare(true), trust);
  assert.equal(g7Report.overallStatus, 'failed');
  const codes = Object.values(g7Report.checks).flatMap((check) => check.violations.map((issue) => issue.code));
  assert.deepEqual(codes, ['INSTRUCTION_REFERENCE_MATERIAL_MISSING']);
});

test('preview plan covers every kind once and reserves synthetic material for G7 only', async () => {
  const { plan } = await loadCandidate();
  assert.deepEqual(plan.scenes.map((scene) => scene.kind), EXPECTED_KINDS);
  assert.equal(plan.scenes.filter((scene) => scene.previewOnlySyntheticMaterial === true).length, 1);
  assert.equal(plan.scenes.at(-1).kind, 'reference-supplement');
  assert.equal(plan.scenes[0].layers.length, 2);
});

test('review UI keeps five decisions editable and excludes Q5 from bulk approval', async () => {
  const { registry, plan } = await loadCandidate();
  const manifest = {
    preset: { presetId: registry.presets[0].presetId, registryVersion: registry.registryVersion },
    materialIndex: { registryVersion: 'presentation-material-registry-empty-v001' },
    media: { publicPath: 'media/preview.mp4' },
    scenes: plan.scenes,
  };
  const html = buildReviewHtml({ manifest, manifestSha256: 'a'.repeat(64) });
  validateReviewHtml(html, manifest);
  assert.equal((html.match(/data-question="q[1-5]"/g) ?? []).length, 5);
  assert.match(html, /Q1〜Q4をすべて承認/);
  assert.match(html, /Q5の最終承認だけは別/);
  assert.doesNotMatch(html, /localStorage|fetch\(|elapsed/);
});

test('generated candidate artifacts preserve the source registry and empty material index', async () => {
  const { registry } = await loadCandidate();
  const generatedRegistry = await readJson(path.join(OUTPUT_ROOT, 'candidate-preset-registry.json'));
  const generatedPresetIndex = await readJson(path.join(OUTPUT_ROOT, 'candidate-preset-validation-index.json'));
  const generatedMaterialIndex = await readJson(path.join(OUTPUT_ROOT, 'candidate-empty-material-validation-index.json'));

  assert.equal(canonicalJson(generatedRegistry), canonicalJson(registry));
  assert.equal(canonicalJson(generatedPresetIndex), canonicalJson(derivePresetValidationIndex(registry)));
  assert.equal(canonicalJson(generatedMaterialIndex), canonicalJson(deriveEmptyMaterialValidationIndex()));
  assert.deepEqual(generatedMaterialIndex.materials, []);
});

test('generated preview manifest passes preflight without formalizing trust', async () => {
  const manifest = await readJson(path.join(OUTPUT_ROOT, 'preview-manifest.json'));
  assert.equal(manifest.preflight.status, 'passed');
  assert.equal(manifest.preflight.allTenKindsRendered, true);
  assert.equal(manifest.preflight.allRepresentativeFramesDifferFromSource, true);
  assert.equal(manifest.preflight.allOverlaysInsideSafeArea, true);
  assert.equal(manifest.preflight.managedFontsDifferFromFallback, true);
  assert.equal(manifest.preflight.representativeStillByteDeterministic, true);
  assert.equal(manifest.formalTrustBindingWritten, false);
  assert.equal(manifest.preflightOnlyTrustBindingPersisted, false);
  assert.equal(manifest.materialIndex.materialCount, 0);
  assert.equal(manifest.materialIndex.g7RealInstructionPermitted, false);
  assert.equal(manifest.materialIndex.g7PreviewUsesSyntheticCardOnly, true);
  assert.deepEqual(manifest.scenes.map((scene) => scene.kind), EXPECTED_KINDS);
  assert.equal(manifest.scenes.filter((scene) => scene.previewOnlySyntheticMaterial === true).length, 1);
  assert.deepEqual(manifest.humanWork, {
    requiredJudgements: 5,
    sessions: 1,
    timeMeasurement: false,
    exactTimeEntry: false,
    freeTextRequired: false,
  });

  const artifactNames = await readdir(OUTPUT_ROOT, { recursive: true });
  assert.equal(artifactNames.some((name) => /trust|binding/i.test(name)), false);
});

test('generated review page binds the current manifest and keeps the five-decision contract', async () => {
  const manifestPath = path.join(OUTPUT_ROOT, 'preview-manifest.json');
  const manifest = await readJson(manifestPath);
  const html = await readFile(path.join(OUTPUT_ROOT, 'review.html'), 'utf8');
  const { createHash } = await import('node:crypto');
  const manifestSha256 = createHash('sha256').update(await readFile(manifestPath)).digest('hex');

  validateReviewHtml(html, manifest);
  assert.match(html, new RegExp(manifestSha256));
  assert.equal((html.match(/data-question="q[1-5]"/g) ?? []).length, 5);
  assert.equal((html.match(/data-scene=/g) ?? []).length, 10);
  assert.doesNotMatch(html, /localStorage|fetch\(|elapsed|timeMeasurement/);
});
