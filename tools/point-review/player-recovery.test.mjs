import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSegmentPlayer} from './player.mjs';

class RecoveryVideo {
  constructor() {
    this.listeners = new Map(); this.src = ''; this.currentSrc = ''; this._time = 0;
    this.duration = NaN; this.readyState = 0; this.paused = true; this.error = null;
    this.playbackRate = 1; this.loads = 0; this.pauses = 0; this.attempts = [];
    this.seekWrites = []; this.throwOnSeek = false; this.frames = new Map(); this.frameSequence = 0;
  }
  get currentTime() { return this._time; }
  set currentTime(value) {
    if (this.throwOnSeek) throw new Error('seek rejected');
    this.seekWrites.push(value); this._time = value;
  }
  getAttribute(name) { return name === 'src' ? this.src : null; }
  addEventListener(name, listener) { this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]); }
  emit(name) { for (const listener of this.listeners.get(name) ?? []) listener(); }
  load() { this.loads++; this.readyState = 0; this.duration = NaN; this._time = 0; this.paused = true; this.error = null; this.currentSrc = ''; }
  pause() { this.pauses++; this.paused = true; }
  play() {
    this.paused = false;
    const attempt = {};
    const promise = new Promise((resolve, reject) => { attempt.resolve = resolve; attempt.reject = reject; });
    this.attempts.push(attempt); return promise;
  }
  metadata(duration, event = 'loadedmetadata') {
    this.duration = duration; this.readyState = 1; this.currentSrc = this.src; this.emit(event);
  }
  requestVideoFrameCallback(callback) { this.frames.set(++this.frameSequence, callback); return this.frameSequence; }
  cancelVideoFrameCallback(id) { this.frames.delete(id); }
}
function fixture() {
  const video = new RecoveryVideo(), statuses = [], started = [], frames = new Map(), timers = new Map(); let sequence = 0;
  const player = createSegmentPlayer(video, {
    onStatus: value => statuses.push({...value}), onStarted: id => started.push(id),
    raf: callback => { frames.set(++sequence, callback); return sequence; }, cancelRaf: id => frames.delete(id),
    setTimer: callback => { timers.set(++sequence, callback); return sequence; }, clearTimer: id => timers.delete(id),
  });
  return {video, player, statuses, started, frames, timers};
}
const selection = (view_id = 'a', start = 1, end = 3, src = `file:///code-test/${view_id}.mp4`) => ({view_id, src, start, end});
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('human play starts loading before metadata; recording waits for both metadata and the play response', async () => {
  for (const metadataFirst of [true, false]) {
    const {video, player, started} = fixture(); player.select(selection());
    assert.equal(player.state.ready, false);
    const result = player.play();
    assert.equal(video.attempts.length, 1); assert.equal(video.currentTime, 1);
    assert.equal(player.state.starting, true); assert.deepEqual(started, []);
    if (metadataFirst) video.metadata(5);
    video.attempts[0].resolve(); await flush();
    if (!metadataFirst) {
      assert.equal(player.state.starting, true); assert.deepEqual(started, []);
      video._time = 0; video.metadata(5);
    }
    assert.equal(await result, true); assert.equal(video.currentTime, 1);
    assert.equal(player.state.starting, false); assert.equal(player.state.running, true);
    assert.deepEqual(started, ['a']); player.pause();
  }
});

test('media error survives late pause and metadata events; only explicit replay reloads the source', async () => {
  const {video, player, statuses, started} = fixture(); player.select(selection());
  const first = player.play(); video.error = {code: 3}; video.emit('error');
  assert.equal(await first, false); const message = statuses.at(-1).error, loads = video.loads;
  assert.ok(message); video.emit('pause'); video.metadata(5, 'canplay');
  assert.equal(statuses.at(-1).error, message); assert.equal(video.loads, loads);
  assert.equal(player.state.ready, false); assert.deepEqual(started, []);
  const retry = player.play(); assert.equal(video.loads, loads + 1); assert.equal(player.state.error, '');
  video.metadata(5); video.attempts[1].resolve(); assert.equal(await retry, true);
  const pauses = video.pauses; video.attempts[0].resolve(); await flush();
  assert.equal(video.pauses, pauses); assert.equal(player.state.running, true); assert.deepEqual(started, ['a']);
  player.pause();
});

test('switching or explicit pause cancels pending play; an old completion cannot pause a new request', async () => {
  const {video, player, started} = fixture(); player.select(selection('a'));
  const old = player.play(); player.select(selection('b', 5, 7)); assert.equal(await old, false);
  const next = player.play(), pauses = video.pauses;
  video.attempts[0].resolve(); await flush();
  assert.equal(video.pauses, pauses); assert.equal(player.state.starting, true);
  video.metadata(8); video.attempts[1].resolve(); assert.equal(await next, true); assert.deepEqual(started, ['b']);
  const paused = player.play(); player.pause(); assert.equal(await paused, false);
  video.paused = false; video.attempts[2].resolve(); await flush();
  assert.equal(video.paused, true); assert.equal(player.state.running, false); assert.deepEqual(started, ['b']);
});

test('durationchange or canplay can establish readiness without rewinding an active segment', async () => {
  for (const event of ['durationchange', 'loadeddata', 'canplay']) {
    const {video, player, started} = fixture(); player.select(selection());
    video.emit('durationchange'); assert.equal(player.state.error, ''); assert.equal(player.state.ready, false);
    const result = player.play(); video.metadata(5, event); video.attempts[0].resolve(); assert.equal(await result, true);
    video.currentTime = 2; const writes = video.seekWrites.length;
    for (const repeated of ['loadedmetadata', 'loadeddata', 'durationchange', 'canplay']) video.emit(repeated);
    assert.equal(video.currentTime, 2); assert.equal(video.seekWrites.length, writes); assert.deepEqual(started, ['a']);
    player.pause();
  }
});

test('old-source metadata, pause, ended and cancelled callbacks cannot finish or stop the new request', async () => {
  const {video, player, frames, started} = fixture(); player.select(selection('a')); video.metadata(5);
  const old = player.play(), oldFrame = [...frames.values()][0], oldVideoFrame = [...video.frames.values()][0];
  player.select(selection('b', 5, 7)); assert.equal(await old, false);
  video.currentSrc = 'file:///code-test/a.mp4'; video.duration = 5; video.readyState = 1;
  video.emit('loadedmetadata'); assert.equal(player.state.ready, false); assert.equal(player.state.error, '');
  const next = player.play(); video.paused = true; video.emit('pause'); video.emit('ended');
  oldFrame(); oldVideoFrame(0, {mediaTime: 99});
  assert.equal(player.state.starting, true); assert.deepEqual(started, []);
  video.paused = false; video.metadata(8); video.attempts[1].resolve(); assert.equal(await next, true);
  video.attempts[0].resolve(); await flush(); assert.equal(player.state.running, true); assert.deepEqual(started, ['b']);
  player.pause();
});

test('invalid duration invalidates pending play and cannot be reopened by its delayed response', async () => {
  for (const duration of [2, Infinity]) {
    const {video, player, started} = fixture(); player.select(selection());
    const result = player.play(); video.metadata(duration); assert.equal(await result, false);
    assert.equal(player.state.ready, false); assert.equal(player.state.starting, false); assert.ok(player.state.error);
    video.paused = false; video.attempts[0].resolve(); await flush();
    assert.equal(video.paused, true); assert.deepEqual(started, []);
    video.metadata(5, 'durationchange'); assert.equal(player.state.ready, false); assert.ok(player.state.error);
  }
  const {video, player} = fixture(); player.select(selection('bad', 3, 1));
  assert.equal(await player.play(), false); assert.equal(video.attempts.length, 0); assert.ok(player.state.error);
});

test('segment end is enforced while play response is pending; external seeks remain clipped', async () => {
  for (const event of ['timeupdate', 'ended', 'seeking']) {
    const {video, player, started, frames, timers} = fixture(); player.select(selection()); video.metadata(5);
    const result = player.play(); video.currentTime = 0; video.emit('seeking'); assert.equal(video.currentTime, 1);
    video.currentTime = 3.1; video.emit(event); assert.equal(await result, false);
    assert.equal(video.currentTime, 3); assert.equal(video.paused, true);
    assert.equal(frames.size, 0); assert.equal(timers.size, 0); assert.equal(video.frames.size, 0);
    video.attempts[0].resolve(); await flush(); assert.deepEqual(started, []);
  }
});

test('a rejected starting seek or play leaves no pending start and retains a visible error', async () => {
  const {video, player, started} = fixture(); player.select(selection()); video.throwOnSeek = true;
  assert.equal(await player.play(), false); assert.equal(video.attempts.length, 0);
  assert.equal(player.state.starting, false); assert.ok(player.state.error); assert.deepEqual(started, []);
  video.throwOnSeek = false; const retry = player.play(); video.attempts[0].reject(new Error('play denied'));
  assert.equal(await retry, false); assert.equal(player.state.starting, false); const error = player.state.error;
  video.emit('pause'); assert.equal(player.state.error, error); assert.ok(error);
});

test('all 17 saved view ranges can switch, start, stop, and return using one simulated video element', async () => {
  const files = [
    'digest-quality-q1-q2-20260920-v001/review-main-v001.json',
    'digest-quality-q3-20260920-v001/review-v001.json',
    'digest-quality-q4-20260920-v001/review-v001.json',
    'digest-quality-q5-1-20260920-v001/review-v002.json',
    'digest-quality-q5-2-20260921-v001/review-v001.json',
  ];
  const reviews = await Promise.all(files.map(file => readFile(new URL(`../../docs/reports/${file}`, import.meta.url), 'utf8').then(JSON.parse)));
  const views = reviews.flatMap(review => review.points.flatMap(point => point.views.map(view => ({view, media: review.media.find(media => media.media_id === view.media_id)}))));
  assert.equal(views.length, 17);
  const {video, player, started} = fixture();
  for (const [index, {view, media}] of [...views, views[1]].entries()) {
    const seconds = frame => frame * media.fps_den / media.fps_num;
    player.select(selection(view.view_id, seconds(view.start_frame), seconds(view.end_frame), `file:///code-test/${media.media_id}.mp4`));
    const result = player.play(); video.metadata(seconds(media.total_frames), index % 2 ? 'canplay' : 'loadedmetadata');
    video.attempts.at(-1).resolve(); assert.equal(await result, true);
    assert.equal(video.currentTime, seconds(view.start_frame)); assert.equal(started.at(-1), view.view_id);
    video.currentTime = seconds(view.end_frame); video.emit('timeupdate');
    assert.equal(video.paused, true); assert.equal(player.state.running, false); assert.equal(player.state.error, '');
  }
  assert.equal(started.length, 18);
});
