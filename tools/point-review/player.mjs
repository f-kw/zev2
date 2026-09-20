// A single video element owns audio. Injectable scheduling supports code-only tests.
export function createSegmentPlayer(video, {onStatus = () => {}, onStarted = () => {}, raf = globalThis.requestAnimationFrame?.bind(globalThis), cancelRaf = globalThis.cancelAnimationFrame?.bind(globalThis), setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
  let selection = null, ready = false, running = false, generation = 0, animation = null, timer = null, videoFrame = null;
  const clear = () => {
    if (animation !== null && cancelRaf) cancelRaf(animation);
    if (timer !== null) clearTimer(timer);
    if (videoFrame !== null && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(videoFrame);
    animation = timer = videoFrame = null;
  };
  const status = (error = '') => onStatus({ready, running, current: video.currentTime, selection, error});
  function stop(atEnd = false) {
    generation++; running = false; clear(); video.pause();
    if (atEnd && selection && ready && video.currentTime !== selection.end) video.currentTime = selection.end;
    status();
  }
  function boundary() {
    if (!running || !selection) return;
    if (video.currentTime >= selection.end) stop(true); else status();
  }
  function watchFrame() {
    if (!running) return;
    boundary();
    if (running && raf) animation = raf(watchFrame);
  }
  function watchVideoFrame(_now, metadata) {
    if (!running) return;
    if (metadata.mediaTime >= selection.end) stop(true); else if (video.requestVideoFrameCallback) videoFrame = video.requestVideoFrameCallback(watchVideoFrame);
  }
  function armTimer() {
    if (timer !== null) clearTimer(timer);
    if (!running) return;
    const remaining = Math.max(0, selection.end - video.currentTime) / video.playbackRate;
    timer = setTimer(() => { boundary(); if (running) armTimer(); }, Math.max(1, remaining * 1000));
  }
  const loaded = () => {
    if (!selection) return;
    ready = Number.isFinite(video.duration) && video.duration >= selection.end;
    if (ready) video.currentTime = selection.start;
    status(ready ? '' : '指定区間を動画内で確認できません。');
  };
  video.addEventListener('loadedmetadata', loaded);
  video.addEventListener('timeupdate', boundary);
  video.addEventListener('pause', () => { if (running && video.paused) { generation++; running = false; clear(); } status(); });
  video.addEventListener('ended', () => stop(true));
  video.addEventListener('error', () => { stop(); ready = false; status('動画を開けません。元の会話へお知らせください。'); });
  video.addEventListener('ratechange', armTimer);
  video.addEventListener('seeking', () => {
    if (!selection || !ready) return;
    if (video.currentTime < selection.start) video.currentTime = selection.start;
    if (video.currentTime >= selection.end) stop(true);
  });
  return {
    select(value) {
      stop(); selection = {...value}; ready = false;
      if (video.getAttribute('src') === selection.src && video.readyState >= 1) loaded();
      else { video.src = selection.src; video.load(); status(); }
    },
    async play() {
      if (!ready || !selection) return false;
      stop(); const token = generation; video.currentTime = selection.start;
      try {
        await video.play();
        if (token !== generation) { if (!running) video.pause(); return false; }
        running = true; onStarted(selection.view_id); status(); watchFrame();
        if (video.requestVideoFrameCallback) videoFrame = video.requestVideoFrameCallback(watchVideoFrame);
        armTimer(); return true;
      } catch { if (token === generation) status('再生を開始できませんでした。もう一度押してください。'); return false; }
    },
    pause: () => stop(),
    get state() { return {ready, running, selection}; },
  };
}
