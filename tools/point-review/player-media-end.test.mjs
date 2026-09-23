import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSegmentPlayer} from './player.mjs';
import {frameRange} from './core.mjs';

const diagnosis = JSON.parse(await readFile(new URL('../../docs/reports/human-review-batch-10-20260921-v001/media-end-diagnosis-v001.json', import.meta.url), 'utf8'));
const affected = diagnosis.cases.filter(item => !item.codeOnlyObservation.containerDecimalSeconds.ready);

class EndVideo {
  constructor() {
    this.listeners = new Map(); this.src = ''; this.currentSrc = ''; this._time = 0; this.duration = NaN;
    this.readyState = 0; this.paused = true; this.ended = false; this.error = null; this.playbackRate = 1;
    this.writes = []; this.attempts = []; this.loads = 0;
  }
  get currentTime() { return this._time; }
  set currentTime(value) { this.writes.push(value); this._time = value; this.ended = false; }
  getAttribute(name) { return name === 'src' ? this.src : null; }
  addEventListener(name, listener) { this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]); }
  emit(name) { for (const listener of this.listeners.get(name) ?? []) listener(); }
  load() { this.loads++; this.currentSrc = ''; this._time = 0; this.duration = NaN; this.readyState = 0; this.paused = true; this.ended = false; this.error = null; }
  pause() { this.paused = true; }
  play() {
    this.paused = false; this.ended = false; const attempt = {};
    const result = new Promise((resolve, reject) => { attempt.resolve = resolve; attempt.reject = reject; });
    this.attempts.push(attempt); return result;
  }
  metadata(duration, event = 'loadedmetadata') { this.duration = duration; this.currentSrc = this.src; this.readyState = 1; this.emit(event); }
}
function fixture() {
  const video = new EndVideo(), started = [], frames = new Map(), timers = new Map(); let sequence = 0;
  const player = createSegmentPlayer(video, {onStarted: id => started.push(id),
    raf: callback => { frames.set(++sequence, callback); return sequence; }, cancelRaf: id => frames.delete(id),
    setTimer: callback => { timers.set(++sequence, callback); return sequence; }, clearTimer: id => timers.delete(id)});
  return {video, player, started, frames, timers};
}
function rangeFor(item, totalFrames = item.frames.total) {
  const media = {media_id: item.viewId, fps_num: item.frames.fpsNum, fps_den: item.frames.fpsDen, total_frames: totalFrames, timeline_start_frame: 0};
  const view = {media_id: item.viewId, start_frame: item.frames.start, end_frame: item.frames.endExclusive,
    context_start_frame: item.frames.start, context_end_frame: item.frames.endExclusive};
  return {...frameRange({media: [media]}, view), view_id: item.viewId, src: `file:///code-only/${item.viewId}.mp4`};
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('frame ranges derive media-end and last-included-frame facts from unchanged integer clocks', () => {
  for (const item of diagnosis.cases) {
    const result = rangeFor(item);
    assert.equal(result.start_frame, item.frames.start); assert.equal(result.end_frame, item.frames.endExclusive);
    assert.equal(result.end, item.logicalEndSeconds);
    assert.equal(result.ends_at_media_end, item.selectionEndsAtMediaEnd);
    assert.equal(result.last_frame_start_seconds, item.lastIncludedFrameStartSeconds);
  }
  const media = {media_id: 'context', total_frames: 137, fps_num: 30, fps_den: 1, timeline_start_frame: 456};
  const view = {media_id: 'context', start_frame: 30, end_frame: 112, context_start_frame: 0, context_end_frame: 137};
  const before = structuredClone({media, view});
  assert.equal(frameRange({media: [media]}, view).ends_at_media_end, false);
  const expanded = frameRange({media: [media]}, view, true);
  assert.equal(expanded.ends_at_media_end, true); assert.equal(expanded.last_frame_start_seconds, 136 / 30);
  assert.equal(expanded.timeline_end_frame, 593); assert.deepEqual({media, view}, before);
});

test('all 17 stored decimal durations are accepted, including exactly the three prior rejected views', async () => {
  assert.equal(diagnosis.browserDurationObserved, false);
  assert.deepEqual(diagnosis.summary.exactTickDurationRejected, []);
  assert.deepEqual(affected.map(item => item.viewId), ['background-graph-paper', 'background-comic-frame', 'Q5-AFTER-VIEW']);
  assert.equal(diagnosis.cases.length, 17);
  const {video, player, started} = fixture();
  for (const item of diagnosis.cases) {
    player.select(rangeFor(item)); const result = player.play();
    video.metadata(item.storedDuration.containerDecimalSeconds); video.attempts.at(-1).resolve();
    assert.equal(await result, true, item.viewId); assert.equal(player.state.ready, true, item.viewId);
    assert.equal(player.state.error, '', item.viewId); assert.equal(started.at(-1), item.viewId);
    player.pause();
  }
  assert.equal(started.length, 17);
});

test('a missing last frame or an interior selection remains rejected without a tolerance', () => {
  for (const item of affected) {
    for (const duration of [item.lastIncludedFrameStartSeconds, (item.frames.endExclusive - 2) * item.frames.fpsDen / item.frames.fpsNum]) {
      const {video, player, started} = fixture(); player.select(rangeFor(item)); video.metadata(duration);
      assert.equal(player.state.ready, false); assert.match(player.state.error, /指定区間/); assert.deepEqual(started, []);
    }
    // This deliberately declares one more frame: the requested endpoint is now interior.
    const {video, player} = fixture(); const interior = rangeFor(item, item.frames.total + 1);
    assert.equal(interior.ends_at_media_end, false); player.select(interior); video.metadata(item.storedDuration.containerDecimalSeconds);
    assert.equal(player.state.ready, false); assert.match(player.state.error, /指定区間/);
  }
});

test('confirmed current-resource EOF stops at rounded duration without an out-of-media seek', async () => {
  for (const item of affected) {
    const {video, player, frames, timers} = fixture(); player.select(rangeFor(item)); video.metadata(item.storedDuration.containerDecimalSeconds);
    const result = player.play(); video.attempts[0].resolve(); assert.equal(await result, true);
    const count = video.writes.length; video._time = video.duration; video.ended = true; video.emit('ended');
    assert.equal(player.state.running, false); assert.equal(player.state.starting, false); assert.equal(video.paused, true);
    assert.equal(video.currentTime, video.duration); assert.equal(video.writes.length, count);
    assert.equal(frames.size, 0); assert.equal(timers.size, 0); assert.equal(player.state.error, '');
    const replay = player.play(); video.attempts[1].resolve(); assert.equal(await replay, true);
    assert.equal(video.currentTime, item.frames.start * item.frames.fpsDen / item.frames.fpsNum);
    // A scheduled boundary callback can observe the logical endpoint; the seek still caps at media duration.
    video._time = item.logicalEndSeconds; video.emit('timeupdate');
    assert.equal(video.currentTime, video.duration); assert.ok(video.writes.every(value => value <= video.duration));
  }
});

test('stale ended events do not cancel a new point, and pending play cannot resume after actual EOF', async () => {
  const {video, player, started} = fixture(), first = affected[0], second = affected[2];
  player.select(rangeFor(first)); const old = player.play(); player.select(rangeFor(second)); assert.equal(await old, false);
  const next = player.play(); video.metadata(second.storedDuration.containerDecimalSeconds);
  video.currentSrc = rangeFor(first).src; video.ended = true; video._time = first.storedDuration.containerDecimalSeconds; video.emit('ended');
  assert.equal(player.state.starting, true); assert.deepEqual(started, []);
  video.currentSrc = video.src; video._time = second.storedDuration.containerDecimalSeconds; video.ended = false; video.emit('ended');
  assert.equal(player.state.starting, true); assert.deepEqual(started, []);
  video._time = 0; video.ended = true; video.emit('ended'); assert.equal(player.state.starting, true);
  video._time = video.duration; video.ended = true; video.emit('ended');
  assert.equal(await next, false); assert.equal(video.paused, true); assert.deepEqual(started, []);
  video.attempts[0].resolve(); video.attempts[1].resolve(); await flush();
  assert.equal(video.paused, true); assert.equal(player.state.running, false); assert.deepEqual(started, []);
});

test('unknown duration stays pending, while non-finite duration and invalid frame-end facts remain rejected', async () => {
  const item = affected[0];
  const {video, player} = fixture(); player.select(rangeFor(item)); const result = player.play();
  video.emit('durationchange'); assert.equal(player.state.ready, false); assert.equal(player.state.error, '');
  assert.equal(player.state.starting, true); video.metadata(Infinity); assert.equal(await result, false); assert.match(player.state.error, /指定区間/);
  for (const update of [{end: 0}, {start: -1}, {last_frame_start_seconds: NaN}, {last_frame_start_seconds: 3}, {last_frame_start_seconds: -1}]) {
    const {video, player} = fixture(); player.select({...rangeFor(item), ...update}); video.metadata(item.storedDuration.containerDecimalSeconds);
    assert.equal(player.state.ready, false); assert.match(player.state.error, /指定区間/);
  }
});

test('duration refreshes never rewind accepted playback, and ordinary interior boundaries still stop exactly', async () => {
  for (const item of [affected[0], diagnosis.cases.find(item => item.viewId === 'wide-after')]) {
    const {video, player} = fixture(); player.select(rangeFor(item)); video.metadata(item.storedDuration.containerDecimalSeconds);
    const result = player.play(); video.attempts[0].resolve(); assert.equal(await result, true);
    video.currentTime = (item.frames.start + 1) * item.frames.fpsDen / item.frames.fpsNum;
    const current = video.currentTime, writes = video.writes.length;
    for (const event of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange']) video.emit(event);
    assert.equal(video.currentTime, current); assert.equal(video.writes.length, writes); assert.equal(player.state.running, true);
    if (!item.selectionEndsAtMediaEnd) {
      video._time = item.logicalEndSeconds; video.emit('timeupdate');
      assert.equal(video.currentTime, item.logicalEndSeconds); assert.equal(player.state.running, false); assert.equal(video.paused, true);
    } else player.pause();
  }
});
