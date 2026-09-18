/** Resolve playback through the video's own clock, never the current edit clock. */
import {assertOrchestrationDrawingViewV001} from './presentation_orchestration_v001.mjs';
import {projectOriginalFrameV001} from './presentation_orchestration_projection_v001.mjs';

const demand = (condition, message) => {if (!condition) throw new TypeError(message);};
const fps = view => view.projection.sourceClock.frameRate;
const caption = (view, id) => view.resolvedPlan.elements.find(row => row.instructionId === id);
function boundary(view, id) {
  const row = view.projection.connections.find(item => item.connectionId === id);
  demand(row, '接続が見つかりません');
  const inserted = view.projection.insertedSpans.find(item => item.connectionId === id);
  const start = inserted?.displayStartFrame ?? projectOriginalFrameV001({projection: view.projection,
    point: {clock: 'digest-original', sourceClockSha256: view.projection.sourceClockSha256,
      frame: row.boundaryFrame}}).displayFrame;
  return {row, start, end: inserted?.displayEndFrameExclusive ?? start};
}
export function assertEditingRangeV001(view, range) {
  assertOrchestrationDrawingViewV001(view);
  demand(range && Number.isSafeInteger(range.startFrame) && range.startFrame >= 0
    && Number.isSafeInteger(range.endFrameExclusive) && range.endFrameExclusive > range.startFrame
    && range.endFrameExclusive <= view.projection.displayFrameCount, '確認範囲が動画の外にあります');
  return range;
}
export function deriveEditingPreviewRangeV001({view, kind, itemId, contextSeconds = 2}) {
  assertOrchestrationDrawingViewV001(view);
  demand(Number.isFinite(contextSeconds) && contextSeconds >= 2, '前後の文脈は2秒以上で指定してください');
  let start, end;
  if (kind === 'caption') {
    const row = caption(view, itemId); demand(row, '字幕が見つかりません');
    start = row.startFrame; end = row.endFrameExclusive;
  } else {
    demand(kind === 'connection', '対象種別が不正です');
    const edge = boundary(view, itemId);
    // connection_expression_v001 defines six fade frames on either side.
    start = edge.start - (edge.row.preset === 'soft-separator' ? 6 : 0);
    end = edge.end + (edge.row.preset === 'soft-separator' ? 6 : 0);
    const before = view.resolvedPlan.elements.filter(row => row.endFrameExclusive <= edge.start).at(-1);
    const after = view.resolvedPlan.elements.find(row => row.startFrame >= edge.end);
    if (before) start = Math.min(start, before.startFrame);
    if (after) end = Math.max(end, after.endFrameExclusive);
  }
  const margin = Math.ceil(contextSeconds * fps(view));
  return assertEditingRangeV001(view, {startFrame: Math.max(0, start - margin),
    endFrameExclusive: Math.min(view.projection.displayFrameCount, end + margin)});
}
export function getEditingPlaybackTargetsV001({playingView, currentView, range, seconds, contextSeconds = 2}) {
  assertEditingRangeV001(playingView, range); assertOrchestrationDrawingViewV001(currentView);
  demand(playingView.projection.sourceClockSha256 === currentView.projection.sourceClockSha256,
    '再生動画と現在の編集対象が異なります');
  demand(Number.isFinite(seconds) && seconds >= 0
    && seconds <= (range.endFrameExclusive - range.startFrame) / fps(playingView), '再生位置が動画の外にあります');
  const scaled = seconds * fps(playingView), nearestFrame = Math.round(scaled);
  // Preserve exact seek round-trips without an epsilon or a time tolerance.
  // E.g. 3905/30 * 30 is one floating-point step below 3905 in JavaScript.
  const localFrame = nearestFrame / fps(playingView) === seconds ? nearestFrame : Math.floor(scaled);
  const displayFrame = Math.min(range.endFrameExclusive - 1, range.startFrame + localFrame);
  const insertion = playingView.projection.insertedSpans.find(row => row.displayStartFrame <= displayFrame
    && displayFrame < row.displayEndFrameExclusive);
  const retained = playingView.projection.retainedSpans.find(row => row.displayStartFrame <= displayFrame
    && displayFrame < row.displayEndFrameExclusive);
  demand(insertion || retained, '再生位置の元時計が解決できません');
  const originalFrame = insertion?.sourceBoundaryFrame ?? (displayFrame - retained.shiftFrames);
  // Stable IDs are taken from the playing view at its own display time. An empty
  // caption interval stays empty, even if another caption is nearby.
  const captionIds = insertion ? [] : playingView.resolvedPlan.elements.filter(row =>
    row.startFrame <= displayFrame && displayFrame < row.endFrameExclusive).map(row => row.instructionId);
  const connectionIds = insertion ? [insertion.connectionId]
    : playingView.projection.connections.filter(row => row.boundaryFrame === originalFrame).map(row => row.connectionId);
  const margin = Math.ceil(contextSeconds * fps(playingView));
  const nearbyCaptionIds = playingView.resolvedPlan.elements.filter(row => !captionIds.includes(row.instructionId)
    && row.endFrameExclusive > displayFrame - margin && row.startFrame <= displayFrame + margin)
    .map(row => row.instructionId);
  const nearbyConnectionIds = playingView.projection.connections.filter(row => !connectionIds.includes(row.connectionId)
    && Math.abs(row.boundaryFrame - originalFrame) <= margin).map(row => row.connectionId);
  for (const id of [...captionIds, ...nearbyCaptionIds]) demand(caption(currentView, id), '字幕の安定IDが一致しません');
  return {captionIds, connectionIds, nearbyCaptionIds, nearbyConnectionIds, originalFrame,
    playingDisplayFrame: displayFrame, revision: currentView.viewSha256};
}
export function getEditingPlaybackSeekV001({playingView, range, kind, itemId}) {
  assertEditingRangeV001(playingView, range);
  const row = kind === 'caption' ? caption(playingView, itemId) : null;
  if (kind === 'caption') demand(row, '字幕が見つかりません');
  else demand(kind === 'connection', '対象種別が不正です');
  const edge = kind === 'connection' ? boundary(playingView, itemId) : null;
  const start = row?.startFrame ?? edge.start, end = row?.endFrameExclusive ?? edge.end + 1;
  if (end <= range.startFrame || start >= range.endFrameExclusive) return {seconds: null,
    reason: 'この対象は再生中の周辺動画に含まれません。全編動画を選択してください。'};
  return {seconds: (Math.max(start, range.startFrame) - range.startFrame) / fps(playingView)};
}
