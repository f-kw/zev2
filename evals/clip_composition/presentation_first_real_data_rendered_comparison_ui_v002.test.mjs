import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRESENTATION_RENDERED_COMPARISON_INSPECTION_PLAYBACK_V002,
  buildPresentationRenderedComparisonHtmlV002,
  buildPresentationRenderedComparisonHumanReadableSummaryV002,
  buildPresentationRenderedComparisonHumanReviewResultV002,
  derivePresentationRenderedComparisonResolutionV002,
  validatePresentationRenderedComparisonGeneratedHtmlV002,
  validatePresentationRenderedComparisonPageV002,
} from './presentation_first_real_data_rendered_comparison_ui_v002.mjs';

const hash = (character) => character.repeat(64);
const mediaVariants = ['keep-both', 'cut-both', 'cut-gap1', 'cut-gap2'].map((variantId, index) => ({
  variantId,
  url: `/preview/${variantId}.mp4`,
  fileSha256: hash(String(index + 1)),
}));
const page = {
  schemaVersion: 'presentation-first-real-data-rendered-comparison-page-v002',
  pageId: 'DmWu0jVQfTE-candidate-13-rendered-comparison-review-v002',
  pageRevision: 2,
  comparisonManifest: {path: 'fixed/comparison-preview-manifest.json', fileSha256: hash('a')},
  comparisonProvenance: {path: 'fixed/comparison-preview-provenance.json', fileSha256: hash('b')},
  candidate: {
    candidateId: 13,
    title: '実家の母ちゃんから届いた謎の仕送り『月刊ムー』',
    startMs: 1920260,
    endMs: 2008506,
  },
  mediaVariants,
  inspectionPlayback: structuredClone(PRESENTATION_RENDERED_COMPARISON_INSPECTION_PLAYBACK_V002),
};

test('2秒前の確認位置8点を30fpsの固定frameで保持する', () => {
  assert.deepEqual(PRESENTATION_RENDERED_COMPARISON_INSPECTION_PLAYBACK_V002, {
    frameRate: 30,
    leadFrames: 60,
    leadSeconds: 2,
    points: [
      {variantId: 'keep-both', gapId: 'gap-01', focusFrame: 834, playbackStartFrame: 774, eventKind: 'kept-gap-start'},
      {variantId: 'keep-both', gapId: 'gap-02', focusFrame: 1722, playbackStartFrame: 1662, eventKind: 'kept-gap-start'},
      {variantId: 'cut-both', gapId: 'gap-01', focusFrame: 834, playbackStartFrame: 774, eventKind: 'cut-join'},
      {variantId: 'cut-both', gapId: 'gap-02', focusFrame: 1665, playbackStartFrame: 1605, eventKind: 'cut-join'},
      {variantId: 'cut-gap1', gapId: 'gap-01', focusFrame: 834, playbackStartFrame: 774, eventKind: 'cut-join'},
      {variantId: 'cut-gap1', gapId: 'gap-02', focusFrame: 1665, playbackStartFrame: 1605, eventKind: 'kept-gap-start'},
      {variantId: 'cut-gap2', gapId: 'gap-01', focusFrame: 834, playbackStartFrame: 774, eventKind: 'kept-gap-start'},
      {variantId: 'cut-gap2', gapId: 'gap-02', focusFrame: 1722, playbackStartFrame: 1662, eventKind: 'cut-join'},
    ],
  });
  assert.deepEqual(
    PRESENTATION_RENDERED_COMPARISON_INSPECTION_PLAYBACK_V002.points.map((point) => (
      point.playbackStartFrame / PRESENTATION_RENDERED_COMPARISON_INSPECTION_PLAYBACK_V002.frameRate
    )),
    [25.8, 55.4, 25.8, 53.5, 25.8, 53.5, 25.8, 55.4],
  );
});

test('page v002はmanifest・provenance・媒体と固定確認位置をstrictに要求する', () => {
  assert.doesNotThrow(() => validatePresentationRenderedComparisonPageV002(page));
  const wrongPoint = structuredClone(page);
  wrongPoint.inspectionPlayback.points[3].playbackStartFrame += 1;
  assert.throws(() => validatePresentationRenderedComparisonPageV002(wrongPoint));
  const missingProvenance = structuredClone(page);
  delete missingProvenance.comparisonProvenance;
  assert.throws(() => validatePresentationRenderedComparisonPageV002(missingProvenance));
  const oldRevision = structuredClone(page);
  oldRevision.pageRevision = 1;
  assert.throws(() => validatePresentationRenderedComparisonPageV002(oldRevision));
});

test('回答意味は維持し結果v002へmanifest・provenance・全媒体bindingを残す', () => {
  assert.deepEqual(
    derivePresentationRenderedComparisonResolutionV002({primaryChoice: 'cut_both'}),
    {status: 'resolved', gapDecisions: {gap01: 'cut', gap02: 'cut'}, variantId: 'cut-both'},
  );
  const result = buildPresentationRenderedComparisonHumanReviewResultV002({
    page,
    primaryChoice: 'cut_both',
    finalAssessment: 'comparison_sufficient',
  });
  assert.equal(result.schemaVersion, 'presentation-first-real-data-rendered-comparison-human-result-v002');
  assert.deepEqual(result.comparisonManifest, page.comparisonManifest);
  assert.deepEqual(result.comparisonProvenance, page.comparisonProvenance);
  assert.deepEqual(result.selectedVariant, mediaVariants[1]);
  assert.equal(result.mediaBindings.length, 4);
  assert.equal(result.timeMeasurement, 'not_measured');
  assert.equal(result.formalAssemblyDecision, false);
  assert.match(buildPresentationRenderedComparisonHumanReadableSummaryV002(result), /正式組立決定: まだ作成しない/u);
});

test('A〜Dの全カードが2つの明示再生ボタンを持ちC/Dは遅延読込のまま', () => {
  const html = buildPresentationRenderedComparisonHtmlV002(page);
  assert.deepEqual(validatePresentationRenderedComparisonGeneratedHtmlV002(html), {status: 'passed'});
  assert.equal((html.match(/data-inspection-variant=/gu) ?? []).length, 8);
  assert.equal((html.match(/確認箇所1を2秒前から再生/gu) ?? []).length, 4);
  assert.equal((html.match(/確認箇所2を2秒前から再生/gu) ?? []).length, 4);
  assert.match(html, /data-lazy-src="\/preview\/cut-gap1\.mp4"/u);
  assert.match(html, /data-lazy-src="\/preview\/cut-gap2\.mp4"/u);
  assert.doesNotMatch(html, /preload="metadata" src="\/preview\/cut-gap1\.mp4"/u);
  assert.match(html, /video\.currentTime=point\.playbackStartFrame\/PAGE\.inspectionPlayback\.frameRate/u);
  assert.match(html, /pauseAll\(\);[\s\S]*video\.currentTime=[\s\S]*video\.play\(\)/u);
  assert.match(html, /clearInspectionStatuses=[\s\S]*pauseAll=[\s\S]*clearInspectionStatuses\(\)/u);
  assert.match(html, /video\.readyState===0[\s\S]*loadedmetadata[\s\S]*once:true/u);
  assert.match(html, /requestSerial!==inspectionRequestSerial/u);
  assert.match(html, /2秒後が確認位置です/u);
  assert.doesNotMatch(html, /fastSeek|setTimeout/u);
});

test('未解決回答は正式決定に昇格せず追加編集としてだけ保存する', () => {
  const result = buildPresentationRenderedComparisonHumanReviewResultV002({
    page,
    primaryChoice: 'one_or_different',
    secondaryChoice: 'needs_other_editing',
    finalAssessment: 'needs_more_editing',
  });
  assert.equal(result.resolution.status, 'needs_other_editing');
  assert.equal(result.resolution.variantId, null);
  assert.equal(result.selectedVariant, null);
  assert.equal(result.formalAssemblyDecision, false);
  assert.throws(() => buildPresentationRenderedComparisonHumanReviewResultV002({
    page,
    primaryChoice: 'one_or_different',
    secondaryChoice: 'needs_other_editing',
    finalAssessment: 'comparison_sufficient',
  }));
});
