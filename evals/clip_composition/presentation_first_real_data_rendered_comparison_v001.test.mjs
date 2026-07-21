import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPresentationRenderedComparisonFilterGraphV001,
  createPresentationRenderedComparisonPlanV001,
} from './presentation_first_real_data_rendered_comparison_v001.mjs';

test('4状態は固定済み外側境界と2つの提示間だけから作る', () => {
  const plan = createPresentationRenderedComparisonPlanV001();
  assert.deepEqual(
    plan.variants.map(({variantId, cutGapIds, expectedFrameCount, expectedAudioSampleCount}) => ({
      variantId,
      cutGapIds,
      expectedFrameCount,
      expectedAudioSampleCount,
    })),
    [
      {variantId: 'keep-both', cutGapIds: [], expectedFrameCount: 2647, expectedAudioSampleCount: 4235200},
      {variantId: 'cut-both', cutGapIds: ['gap-01', 'gap-02'], expectedFrameCount: 2478, expectedAudioSampleCount: 3964800},
      {variantId: 'cut-gap1', cutGapIds: ['gap-01'], expectedFrameCount: 2590, expectedAudioSampleCount: 4144000},
      {variantId: 'cut-gap2', cutGapIds: ['gap-02'], expectedFrameCount: 2535, expectedAudioSampleCount: 4056000},
    ],
  );
  assert.deepEqual(plan.gaps, [
    {gapId: 'gap-01', startMs: 1948058, endMs: 1949982},
    {gapId: 'gap-02', startMs: 1977670, endMs: 1981394},
  ]);
  assert.deepEqual(plan.candidate, {
    candidateId: 13,
    title: '実家の母ちゃんから届いた謎の仕送り『月刊ムー』',
    startMs: 1920260,
    endMs: 2008506,
  });
});

test('各状態のsource区間は追加境界やpaddingを持たない', () => {
  const plan = createPresentationRenderedComparisonPlanV001();
  const allowedBoundaries = new Set([
    plan.candidate.startMs,
    plan.candidate.endMs,
    ...plan.gaps.flatMap((gap) => [gap.startMs, gap.endMs]),
  ]);
  plan.variants.forEach((variant) => {
    variant.mappings.forEach((mapping) => {
      assert.equal(allowedBoundaries.has(mapping.sourceStartMs), true);
      assert.equal(allowedBoundaries.has(mapping.sourceEndMs), true);
      assert.equal(mapping.outputEndFrame > mapping.outputStartFrame, true);
      assert.equal(mapping.audioSamples.outputEnd > mapping.audioSamples.outputStart, true);
    });
  });
});

test('filter graphは全4動画を実際のtrimとconcatで一度に生成する', () => {
  const graph = createPresentationRenderedComparisonFilterGraphV001(
    createPresentationRenderedComparisonPlanV001(),
  );
  assert.match(graph, /split=8/);
  assert.match(graph, /asplit=8/);
  assert.match(graph, /trim=start_frame=68:end_frame=2715/);
  assert.match(graph, /atrim=start_sample=108800:end_sample=4344000/);
  assert.equal((graph.match(/\[out-video-/g) ?? []).length, 4);
  assert.equal((graph.match(/\[out-audio-/g) ?? []).length, 4);
  assert.equal(graph.includes('seek'), false);
});
