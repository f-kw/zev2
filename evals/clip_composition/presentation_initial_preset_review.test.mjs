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
  applyReviewAction,
  buildEphemeralTrust,
  buildReviewHtml,
  checkCandidateIndexCompatibility,
  createInitialReviewState,
  deriveReviewDecisionState,
  deriveEmptyMaterialValidationIndex,
  derivePresetValidationIndex,
  validateCandidateRegistry,
  validatePreviewEvidence,
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
  await validatePreviewEvidence(plan);
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

test('lyrics preview uses a dedicated sung-audio segment for the whole lyrics scene', async () => {
  const { plan } = await loadCandidate();
  const lyricsScene = plan.scenes.find((scene) => scene.kind === 'information-lyrics');
  const lyricsSegments = plan.sourceSelection.segments
    .map((segment, index, segments) => ({
      ...segment,
      previewStartMs: segments.slice(0, index).reduce(
        (sum, item) => sum + (item.endMs - item.startMs),
        0,
      ),
    }))
    .filter((segment) => segment.purpose === 'information-lyrics-audio');
  assert.equal(lyricsSegments.length, 1);
  assert.equal(lyricsSegments[0].previewStartMs, lyricsScene.startMs);
  assert.equal(
    lyricsSegments[0].previewStartMs + lyricsSegments[0].endMs - lyricsSegments[0].startMs,
    lyricsScene.endMs,
  );
  assert.match(lyricsSegments[0].transcriptEvidence.text, /テン/);
  const evidence = await validatePreviewEvidence(plan);
  assert.equal(evidence.selectedStartMs, lyricsSegments[0].startMs);
  assert.equal(evidence.selectedEndMs, lyricsSegments[0].endMs);
  assert.match(evidence.selectedText, /テンテン/);
  assert.match(evidence.selectedText, new RegExp(evidence.displayedText));
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
  assert.doesNotMatch(html, /data-question-id="q1" data-answer="approved"/);
  assert.match(html, /q5Approve\.disabled=!decision\.canApproveFinal/);
  assert.match(html, /showResult'\)\.disabled=!decision\.canShowResult/);
  assert.doesNotMatch(html, /localStorage|fetch\(|elapsed/);
});

test('review state prevents incomplete or contradictory final approval', () => {
  let state = createInitialReviewState();
  assert.deepEqual(deriveReviewDecisionState(state), {
    q1ToQ4Approved: false,
    allAnswered: false,
    canApproveFinal: false,
    canShowResult: false,
  });

  state = applyReviewAction(state, { type: 'approve-q1-q4' });
  assert.equal(state.answers.q1, 'approved');
  assert.equal(Object.values(state.criteria).every(Boolean), true);
  assert.equal(state.answers.q5, null);
  assert.equal(deriveReviewDecisionState(state).canApproveFinal, true);
  assert.equal(deriveReviewDecisionState(state).canShowResult, false);

  state = applyReviewAction(state, { type: 'set-answer', questionId: 'q5', answer: 'approved' });
  assert.equal(deriveReviewDecisionState(state).canShowResult, true);

  state = applyReviewAction(state, { type: 'set-answer', questionId: 'q3', answer: 'needs_revision' });
  assert.equal(state.answers.q5, null);
  assert.equal(deriveReviewDecisionState(state).canApproveFinal, false);
  assert.equal(deriveReviewDecisionState(state).canShowResult, false);

  state = applyReviewAction(state, { type: 'set-answer', questionId: 'q5', answer: 'approved' });
  assert.equal(state.answers.q5, null);
  state = applyReviewAction(state, { type: 'set-answer', questionId: 'q5', answer: 'needs_revision' });
  assert.equal(deriveReviewDecisionState(state).canShowResult, true);

  state = createInitialReviewState();
  state = applyReviewAction(state, { type: 'set-criterion', criterion: 'readable', checked: true });
  assert.equal(state.answers.q1, 'needs_revision');
  state = applyReviewAction(state, { type: 'approve-q1' });
  assert.equal(state.answers.q1, 'approved');
  assert.equal(Object.values(state.criteria).every(Boolean), true);
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
