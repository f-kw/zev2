import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPresentationRenderedComparisonHtmlV001,
  buildPresentationRenderedComparisonHumanReadableSummaryV001,
  buildPresentationRenderedComparisonHumanReviewResultV001,
  derivePresentationRenderedComparisonResolutionV001,
  validatePresentationRenderedComparisonGeneratedHtmlV001,
  validatePresentationRenderedComparisonManifestV001,
  validatePresentationRenderedComparisonPageV001,
} from './presentation_first_real_data_rendered_comparison_ui_v001.mjs';

const hash = (character) => character.repeat(64);
const mediaVariants = ['keep-both', 'cut-both', 'cut-gap1', 'cut-gap2'].map((variantId, index) => ({
  variantId,
  url: `/preview/${variantId}.mp4`,
  fileSha256: hash(String(index + 1)),
}));
const candidate = {
  candidateId: 13,
  title: '実家の母ちゃんから届いた謎の仕送り『月刊ムー』',
  startMs: 1920260,
  endMs: 2008506,
};
const gaps = [
  {gapId: 'gap-01', startMs: 1948058, endMs: 1949982},
  {gapId: 'gap-02', startMs: 1977670, endMs: 1981394},
];
const page = {
  schemaVersion: 'presentation-first-real-data-rendered-comparison-page-v001',
  pageId: 'page-v001',
  pageRevision: 1,
  comparisonManifest: {
    path: 'evals/clip_composition/outputs/presentation/example/comparison-preview-manifest.json',
    fileSha256: hash('a'),
  },
  candidate,
  mediaVariants,
};
const manifest = {
  schemaVersion: 'presentation-first-real-data-rendered-comparison-manifest-v001',
  manifestId: 'manifest-v001',
  human_review_only: true,
  formalOutput: false,
  candidate,
  gaps,
  mediaVariants,
};

test('pageとmanifestは固定4媒体だけを受理する', () => {
  assert.doesNotThrow(() => validatePresentationRenderedComparisonPageV001(page));
  assert.doesNotThrow(() => validatePresentationRenderedComparisonManifestV001(manifest));
  const wrong = structuredClone(page);
  wrong.mediaVariants[0].url = '/preview/cut-both.mp4';
  assert.throws(() => validatePresentationRenderedComparisonPageV001(wrong));
});

test('最初の一問で決まる2状態と追加比較の2状態を一意に解決する', () => {
  assert.deepEqual(
    derivePresentationRenderedComparisonResolutionV001({primaryChoice: 'cut_both'}),
    {status: 'resolved', gapDecisions: {gap01: 'cut', gap02: 'cut'}, variantId: 'cut-both'},
  );
  assert.deepEqual(
    derivePresentationRenderedComparisonResolutionV001({
      primaryChoice: 'one_or_different', secondaryChoice: 'cut_gap2',
    }),
    {status: 'resolved', gapDecisions: {gap01: 'keep', gap02: 'cut'}, variantId: 'cut-gap2'},
  );
  assert.equal(
    derivePresentationRenderedComparisonResolutionV001({primaryChoice: 'one_or_different'}),
    null,
  );
});

test('結果は比較回答であり正式組立決定や時間計測を偽装しない', () => {
  const result = buildPresentationRenderedComparisonHumanReviewResultV001({
    page,
    primaryChoice: 'cut_both',
    finalAssessment: 'comparison_sufficient',
  });
  assert.equal(result.formalAssemblyDecision, false);
  assert.equal(result.timeMeasurement, 'not_measured');
  assert.deepEqual(result.comparisonManifest, page.comparisonManifest);
  assert.deepEqual(result.selectedVariant, mediaVariants[1]);
  assert.match(buildPresentationRenderedComparisonHumanReadableSummaryV001(result), /正式組立決定: まだ作成しない/u);
});

test('生成HTMLは実MP4 4本・段階分岐・結果コピーだけを持つ', () => {
  const html = buildPresentationRenderedComparisonHtmlV001(page, manifest);
  assert.deepEqual(validatePresentationRenderedComparisonGeneratedHtmlV001(html), {status: 'passed'});
  assert.match(html, /動画A — 2つの間を残した実物/u);
  assert.match(html, /動画B — 2つの間を切った実物/u);
  assert.match(html, /片方だけ切る／この2本では決まらない/u);
  assert.match(html, /navigator\.clipboard\.writeText/u);
  assert.match(html, /if\(other!==video\)other\.pause/u);
  assert.match(html, /resolved\.status==='resolved'/u);
  assert.match(html, /data-lazy-src="\/preview\/cut-gap1\.mp4"/u);
  assert.match(html, /if\(state\.primaryChoice==='one_or_different'\)loadSecondaryMedia\(\)/u);
  assert.doesNotMatch(html, /preload="metadata" src="\/preview\/cut-gap1\.mp4"/u);
  assert.doesNotMatch(html, /再生完了|必須再生|seek\(/u);
});
