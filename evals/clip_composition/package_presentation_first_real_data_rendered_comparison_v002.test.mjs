import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  buildPresentationRenderedComparisonPackageV002,
  createPresentationRenderedComparisonPackageDocumentsV002,
} from './package_presentation_first_real_data_rendered_comparison_v002.mjs';
import {
  PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001,
  PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001,
  PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001,
  PRESENTATION_RENDERED_COMPARISON_V002_ROOT,
  validatePresentationRenderedComparisonBuildSummaryV002,
} from './presentation_first_real_data_rendered_comparison_trust_v002.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001.path));
const provenance = JSON.parse(await readFile(PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001.path));

test('固定入力からv002 pageとHTMLを決定的に作り、8確認位置を来歴から含める', () => {
  const first = createPresentationRenderedComparisonPackageDocumentsV002({manifest, provenance});
  const second = createPresentationRenderedComparisonPackageDocumentsV002({manifest, provenance});
  assert.deepEqual(first.page, second.page);
  assert.equal(first.reviewHtml, second.reviewHtml);
  assert.equal(first.page.inspectionPlayback.points.length, 8);
  assert.equal(first.reviewHtml.includes('data-inspection-variant="cut-both"'), true);
});

test('v002固定出力はpage・HTML・summaryだけで、v001媒体を複製しない', async () => {
  assert.deepEqual((await readdir(PRESENTATION_RENDERED_COMPARISON_V002_ROOT)).sort(), [
    'comparison-preview-build-summary.json',
    'review-page.json',
    'review.html',
  ]);
  const summaryBytes = await readFile(
    `${PRESENTATION_RENDERED_COMPARISON_V002_ROOT}/comparison-preview-build-summary.json`,
  );
  const summary = validatePresentationRenderedComparisonBuildSummaryV002(
    JSON.parse(summaryBytes.toString('utf8')),
  );
  assert.deepEqual(summary.artifactBindings.mediaVariants, PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001);
  assert.deepEqual(summary.artifactBindings.comparisonManifest, PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001);
  assert.deepEqual(summary.artifactBindings.comparisonProvenance, PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001);
  assert.equal(sha256(await readFile(summary.artifactBindings.reviewPage.path)), summary.artifactBindings.reviewPage.fileSha256);
  assert.equal(sha256(await readFile(summary.artifactBindings.reviewHtml.path)), summary.artifactBindings.reviewHtml.fileSha256);
});

test('固定v002出力は既存時に上書きせず停止する', async () => {
  await assert.rejects(
    buildPresentationRenderedComparisonPackageV002(),
    /fixed v002 comparison output already exists/u,
  );
});
