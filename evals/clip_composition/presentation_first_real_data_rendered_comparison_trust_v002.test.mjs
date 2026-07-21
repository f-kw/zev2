import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  assertPresentationRenderedComparisonReferenceChainV002,
  assertPresentationRenderedComparisonResultMayBeFormalizedV002,
  derivePresentationRenderedComparisonInspectionPlaybackV002,
  derivePresentationRenderedComparisonResolutionV002,
  PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001,
  PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001,
  PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001,
  PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_HTML_PATH,
  PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_PAGE_PATH,
  validatePresentationRenderedComparisonBuildSummaryV002,
  validatePresentationRenderedComparisonHumanResultV002,
  validatePresentationRenderedComparisonInspectionPlaybackV002,
  validatePresentationRenderedComparisonManifestV001ForV002,
  validatePresentationRenderedComparisonPageV002,
  validatePresentationRenderedComparisonProvenanceV001ForV002,
} from './presentation_first_real_data_rendered_comparison_trust_v002.mjs';

const manifest = JSON.parse(await readFile(PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001.path));
const provenance = JSON.parse(await readFile(PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001.path));
const inspectionPlayback = derivePresentationRenderedComparisonInspectionPlaybackV002(provenance);
const page = {
  schemaVersion: 'presentation-first-real-data-rendered-comparison-page-v002',
  pageId: 'DmWu0jVQfTE-candidate-13-rendered-comparison-review-v002',
  pageRevision: 2,
  comparisonManifest: {...PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001},
  comparisonProvenance: {...PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001},
  candidate: structuredClone(manifest.candidate),
  mediaVariants: structuredClone(manifest.mediaVariants),
  inspectionPlayback,
};
const summary = {
  schemaVersion: 'presentation-rendered-comparison-build-summary-v002',
  status: 'passed',
  artifactBindings: {
    reviewPage: {path: PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_PAGE_PATH, fileSha256: 'a'.repeat(64)},
    reviewHtml: {path: PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_HTML_PATH, fileSha256: 'b'.repeat(64)},
    comparisonManifest: {...PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001},
    comparisonProvenance: {...PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001},
    mediaVariants: PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001.map((entry) => ({...entry})),
  },
};

const buildResult = ({
  primaryChoice,
  secondaryChoice = null,
  finalAssessment = 'comparison_sufficient',
}) => {
  const resolution = derivePresentationRenderedComparisonResolutionV002({
    primaryChoice,
    secondaryChoice,
  });
  return {
    schemaVersion: 'presentation-first-real-data-rendered-comparison-human-result-v002',
    reviewId: page.pageId,
    candidate: structuredClone(page.candidate),
    primaryChoice,
    secondaryChoice,
    resolution,
    finalAssessment,
    comparisonManifest: {...page.comparisonManifest},
    comparisonProvenance: {...page.comparisonProvenance},
    selectedVariant: resolution?.variantId
      ? structuredClone(page.mediaVariants.find(({variantId}) => variantId === resolution.variantId))
      : null,
    mediaBindings: page.mediaVariants.map(({variantId, fileSha256}) => ({
      variantId,
      fileSha256,
    })),
    timeMeasurement: 'not_measured',
    formalAssemblyDecision: false,
  };
};

test('固定v001 manifest・provenanceをv002の厳密な来歴入力として検証する', () => {
  assert.equal(validatePresentationRenderedComparisonManifestV001ForV002(manifest), manifest);
  assert.equal(
    validatePresentationRenderedComparisonProvenanceV001ForV002(provenance, manifest),
    provenance,
  );
  assert.equal(validatePresentationRenderedComparisonPageV002(page, manifest, provenance), page);
});

test('8つの確認位置はprovenanceの出力frameから2秒=60frame前として再計算する', () => {
  assert.deepEqual(inspectionPlayback, {
    frameRate: 30,
    leadFrames: 60,
    leadSeconds: 2,
    points: [
      {variantId: 'keep-both', gapId: 'gap-01', eventKind: 'kept-gap-start', focusFrame: 834, playbackStartFrame: 774},
      {variantId: 'keep-both', gapId: 'gap-02', eventKind: 'kept-gap-start', focusFrame: 1722, playbackStartFrame: 1662},
      {variantId: 'cut-both', gapId: 'gap-01', eventKind: 'cut-join', focusFrame: 834, playbackStartFrame: 774},
      {variantId: 'cut-both', gapId: 'gap-02', eventKind: 'cut-join', focusFrame: 1665, playbackStartFrame: 1605},
      {variantId: 'cut-gap1', gapId: 'gap-01', eventKind: 'cut-join', focusFrame: 834, playbackStartFrame: 774},
      {variantId: 'cut-gap1', gapId: 'gap-02', eventKind: 'kept-gap-start', focusFrame: 1665, playbackStartFrame: 1605},
      {variantId: 'cut-gap2', gapId: 'gap-01', eventKind: 'kept-gap-start', focusFrame: 834, playbackStartFrame: 774},
      {variantId: 'cut-gap2', gapId: 'gap-02', eventKind: 'cut-join', focusFrame: 1722, playbackStartFrame: 1662},
    ],
  });
  const altered = structuredClone(inspectionPlayback);
  altered.points[3].playbackStartFrame += 1;
  assert.throws(
    () => validatePresentationRenderedComparisonInspectionPlaybackV002(altered, provenance),
    /does not match the fixed provenance/u,
  );
});

test('用途・candidate・gap・variant・media・source・固定参照の改変を拒否する', () => {
  const mutations = [
    (value) => { value.purpose = 'formal-assembly'; },
    (value) => { value.humanReviewOnly = false; },
    (value) => { value.formalAssemblyDecision = true; },
    (value) => { value.candidate.startMs += 1; },
    (value) => { value.gaps[0].startMs += 1; },
    (value) => { value.variants.reverse(); },
    (value) => { value.variants[1].cutGapIds = ['gap-01']; },
    (value) => { value.variants[0].media.fileSha256 = 'f'.repeat(64); },
    (value) => { value.variants[0].mappings[0].outputEndFrame -= 1; },
    (value) => { value.source.fileSha256 = 'f'.repeat(64); },
    (value) => { value.fixedReferences.sourceIdentity.path = '../alternate.json'; },
    (value) => { delete value.fixedReferences.mediaEquivalence; },
  ];
  mutations.forEach((mutate) => {
    const altered = structuredClone(provenance);
    mutate(altered);
    assert.throws(
      () => validatePresentationRenderedComparisonProvenanceV001ForV002(altered, manifest),
    );
  });
});

test('pageはmanifest・provenance bindingと全8確認位置の欠落・余分・改変を拒否する', () => {
  for (const mutate of [
    (value) => { value.comparisonProvenance.fileSha256 = 'f'.repeat(64); },
    (value) => { value.comparisonManifest.path = '../manifest.json'; },
    (value) => { value.inspectionPlayback.points.pop(); },
    (value) => { value.inspectionPlayback.points.push(structuredClone(value.inspectionPlayback.points[0])); },
    (value) => { value.inspectionPlayback.leadSeconds = 3; },
    (value) => { value.extra = true; },
  ]) {
    const altered = structuredClone(page);
    mutate(altered);
    assert.throws(() => validatePresentationRenderedComparisonPageV002(altered, manifest, provenance));
  }
});

test('v002 summaryはpage/htmlと固定v001 manifest/provenance/4媒体だけを束縛する', () => {
  assert.equal(validatePresentationRenderedComparisonBuildSummaryV002(summary), summary);
  assert.deepEqual(assertPresentationRenderedComparisonReferenceChainV002({
    summary,
    page,
    manifest,
    provenance,
  }), {status: 'passed'});
  for (const mutate of [
    (value) => { delete value.artifactBindings.comparisonProvenance; },
    (value) => { value.artifactBindings.comparisonProvenance.fileSha256 = 'f'.repeat(64); },
    (value) => { value.artifactBindings.comparisonManifest.path = '../manifest.json'; },
    (value) => { value.artifactBindings.mediaVariants.reverse(); },
    (value) => { value.artifactBindings.extra = true; },
    (value) => { value.schemaVersion = 'presentation-rendered-comparison-build-summary-v001'; },
  ]) {
    const altered = structuredClone(summary);
    mutate(altered);
    assert.throws(() => validatePresentationRenderedComparisonBuildSummaryV002(altered));
  }
});

test('v002回答の全9状態を回答から再計算し、正式化可能性を分離する', () => {
  const resolvedChoices = [
    {primaryChoice: 'cut_both'},
    {primaryChoice: 'keep_both'},
    {primaryChoice: 'one_or_different', secondaryChoice: 'cut_gap1'},
    {primaryChoice: 'one_or_different', secondaryChoice: 'cut_gap2'},
  ];
  for (const choice of resolvedChoices) {
    const sufficient = validatePresentationRenderedComparisonHumanResultV002({
      result: buildResult({...choice, finalAssessment: 'comparison_sufficient'}),
      page,
      manifest,
      provenance,
    });
    assert.equal(sufficient.mayCreateFormalAssemblyDecision, true);
    assert.doesNotThrow(() => assertPresentationRenderedComparisonResultMayBeFormalizedV002(
      sufficient,
    ));
    const needsMore = validatePresentationRenderedComparisonHumanResultV002({
      result: buildResult({...choice, finalAssessment: 'needs_more_editing'}),
      page,
      manifest,
      provenance,
    });
    assert.equal(needsMore.mayCreateFormalAssemblyDecision, false);
    assert.equal(needsMore.formalizationBlockReason, 'additional-editing-required');
    assert.throws(() => assertPresentationRenderedComparisonResultMayBeFormalizedV002(needsMore));
  }
  const unresolved = validatePresentationRenderedComparisonHumanResultV002({
    result: buildResult({
      primaryChoice: 'one_or_different',
      secondaryChoice: 'needs_other_editing',
      finalAssessment: 'needs_more_editing',
    }),
    page,
    manifest,
    provenance,
  });
  assert.equal(unresolved.mayCreateFormalAssemblyDecision, false);
  assert.equal(unresolved.formalizationBlockReason, 'comparison-unresolved');
  assert.throws(() => assertPresentationRenderedComparisonResultMayBeFormalizedV002(unresolved));
});

test('v001結果・回答とresolutionの不一致・非選択hash改変・自動正式化を拒否する', () => {
  const base = buildResult({primaryChoice: 'cut_both'});
  for (const mutate of [
    (value) => { value.schemaVersion = 'presentation-first-real-data-rendered-comparison-human-result-v001'; },
    (value) => { value.resolution.variantId = 'keep-both'; },
    (value) => { value.selectedVariant = structuredClone(page.mediaVariants[0]); },
    (value) => { value.mediaBindings[0].fileSha256 = 'f'.repeat(64); },
    (value) => { value.comparisonProvenance.fileSha256 = 'f'.repeat(64); },
    (value) => { value.secondaryChoice = 'cut_gap1'; },
    (value) => { value.formalAssemblyDecision = true; },
    (value) => { value.extra = true; },
  ]) {
    const altered = structuredClone(base);
    mutate(altered);
    assert.throws(() => validatePresentationRenderedComparisonHumanResultV002({
      result: altered,
      page,
      manifest,
      provenance,
    }));
  }
  assert.deepEqual(
    page.mediaVariants.map(({variantId, fileSha256}) => ({variantId, fileSha256})),
    PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001.map(({variantId, fileSha256}) => ({
      variantId,
      fileSha256,
    })),
  );
});
