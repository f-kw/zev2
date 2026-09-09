import assert from 'node:assert/strict';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';

// Instruction 024 only: this is an execution helper, not a renderer job schema.
// The fast path is deliberately undefined for overlapping display intervals.
export function inspectNonOverlappingCaptionTimelineV001(input) {
  const {overlayRecords, expectedFrameCount, plan} = input;
  assert.equal(plan.canvas.fps, 30, 'QC_CACHE_REQUIRES_30_FPS');
  assert(Number.isInteger(expectedFrameCount) && expectedFrameCount > 0);
  assert(Array.isArray(overlayRecords) && overlayRecords.length > 0);
  const intervals = overlayRecords.map(({element}) => {
    const {instructionId, startFrame, displayFrameCount} = element;
    assert(typeof instructionId === 'string' && instructionId.length > 0);
    assert(Number.isInteger(startFrame) && startFrame >= 0);
    assert(Number.isInteger(displayFrameCount) && displayFrameCount > 0);
    const endFrame = startFrame + displayFrameCount;
    assert(endFrame <= expectedFrameCount);
    return {instructionId, startFrame, endFrame};
  });
  assert.equal(new Set(intervals.map(row => row.instructionId)).size, intervals.length);
  const overlapPairs = [];
  for (let a = 0; a < intervals.length; a++) {
    for (let b = a + 1; b < intervals.length; b++) {
      if (intervals[a].startFrame < intervals[b].endFrame
        && intervals[b].startFrame < intervals[a].endFrame) {
        overlapPairs.push([intervals[a].instructionId, intervals[b].instructionId]);
      }
    }
  }
  assert.equal(overlapPairs.length, 0, 'QC_CACHE_OVERLAPPING_CAPTIONS_UNSUPPORTED');
  return {intervals, overlapPairs, expectedFrameCount, fps: 30};
}

export function buildLosslessCompositeCacheArgumentsV001(input) {
  inspectNonOverlappingCaptionTimelineV001(input);
  const original = buildPresentationCompositeArgumentsV001({...input, serializePngAndFilters: true});
  const graph = original.indexOf('-filter_complex');
  assert(graph > 0 && original[graph + 1].endsWith('fps=30,format=yuv420p[video]'));
  // Preserve the exact original graph, including every transparent/inactive
  // overlay. FFV1 stores the final YUV planes without the H.264 quantization.
  return [...original.slice(0, graph + 2), '-map', '[video]',
    '-frames:v', String(input.expectedFrameCount), '-c:v', 'ffv1', '-level', '3',
    '-g', '1', '-slicecrc', '1', '-pix_fmt', 'yuv420p', '-an', '-f', 'nut'];
}

export function buildCachedCounterfactualArgumentsV001({
  input, baselineCachePath, transparentCachePath, instructionId,
}) {
  const timeline = inspectNonOverlappingCaptionTimelineV001(input);
  const target = timeline.intervals.find(row => row.instructionId === instructionId);
  assert(target, 'QC_CACHE_UNKNOWN_INSTRUCTION');
  for (const p of [baselineCachePath, transparentCachePath]) assert(typeof p === 'string' && p.length > 0);
  const original = buildPresentationCompositeArgumentsV001({...input, serializePngAndFilters: true});
  const output = original.indexOf('-frames:v');
  assert(output > 0);
  // Generic timeline n is zero based. Disabled blend passes its first input
  // unchanged; enabled blend copies B exactly. There is no arithmetic mixing.
  const graph = `[0:v][1:v]blend=all_expr='B':enable='between(n,${target.startFrame},${target.endFrame - 1})'`
    + ':eof_action=endall:shortest=1:repeatlast=0,'
    + 'fps=30,format=yuv420p[video]';
  return ['-hide_banner', '-loglevel', 'error', '-y', '-filter_complex_threads', '1',
    '-i', baselineCachePath, '-i', transparentCachePath, '-i', input.baseMediaPath,
    '-filter_complex', graph, '-map', '[video]', '-map', '2:a?',
    ...original.slice(output)];
}

export function buildPreEncodeFrameHashArgumentsV001(compositeArguments) {
  const output = compositeArguments.indexOf('-frames:v');
  assert(output > 0);
  const maps = compositeArguments.slice(0, output);
  const withoutAudioMap = [];
  for (let i = 0; i < maps.length; i++) {
    if (maps[i] === '-map' && /^\d+:a\?$/u.test(maps[i + 1])) {i++; continue;}
    withoutAudioMap.push(maps[i]);
  }
  return [...withoutAudioMap, '-frames:v', compositeArguments[output + 1],
    '-an', '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', '-'];
}
