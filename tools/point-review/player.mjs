// A single video element owns audio. Injectable scheduling supports code-only tests.
export function createSegmentPlayer(video, {onStatus = () => {}, onStarted = () => {}, raf = globalThis.requestAnimationFrame?.bind(globalThis), cancelRaf = globalThis.cancelAnimationFrame?.bind(globalThis), setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
  let selection = null, ready = false, running = false, starting = false, error = '', positioned = false;
  let generation = 0, pending = null, animation = null, timer = null, videoFrame = null;
  const clear = () => {
    if (animation !== null && cancelRaf) cancelRaf(animation);
    if (timer !== null) clearTimer(timer);
    if (videoFrame !== null && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(videoFrame);
    animation = timer = videoFrame = null;
  };
  const status = () => onStatus({ready, running, starting, current: video.currentTime, selection, error});
  const currentSource = () => selection && video.getAttribute('src') === selection.src && (!video.currentSrc || video.currentSrc === selection.src);
  const active = token => token === generation && (running || starting);
  const currentRequest = request => pending === request && request.token === generation && request.selection === selection;
  const validRange = () => selection && Number.isFinite(selection.start) && Number.isFinite(selection.end) && selection.start >= 0 && selection.end > selection.start;
  function stop(atEnd = false) {
    generation++; running = starting = false;
    if (pending) { pending.resolve(false); pending = null; }
    clear(); video.pause();
    if (atEnd && selection && ready && video.currentTime !== selection.end) video.currentTime = selection.end;
    status();
  }
  function fail(message) { error = message; ready = false; stop(); }
  function boundary() {
    if ((!running && !starting) || !currentSource()) return;
    if (video.currentTime >= selection.end) stop(true); else status();
  }
  function watchFrame(token) {
    if (!active(token)) return;
    boundary();
    if (active(token) && raf) animation = raf(() => watchFrame(token));
  }
  function watchVideoFrame(token, metadata) {
    if (!active(token)) return;
    if (currentSource() && metadata.mediaTime >= selection.end) stop(true);
    else if (video.requestVideoFrameCallback) videoFrame = video.requestVideoFrameCallback((_now, next) => watchVideoFrame(token, next));
  }
  function armTimer() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if ((!running && !starting) || !ready || !currentSource()) return;
    const token = generation;
    const remaining = Math.max(0, selection.end - video.currentTime) / video.playbackRate;
    timer = setTimer(() => { if (!active(token)) return; boundary(); if (active(token)) armTimer(); }, Math.max(1, remaining * 1000));
  }
  function finishStart(request) {
    if (!currentRequest(request) || !request.played || !ready || error || !currentSource()) return;
    if (video.paused || video.currentTime >= selection.end) { stop(); return; }
    pending = null; starting = false; running = true;
    onStarted(selection.view_id); status(); armTimer(); request.resolve(true);
  }
  function refreshReadiness() {
    if (!selection || error || !currentSource()) return;
    // NaN is the normal duration before metadata arrives, not a failed clip.
    if (Number.isNaN(video.duration)) { ready = false; status(); return; }
    if (!validRange() || !Number.isFinite(video.duration) || video.duration < selection.end) {
      fail('指定区間を動画内で確認できません。'); return;
    }
    ready = true;
    try {
      if (!positioned && !running) { video.currentTime = selection.start; positioned = true; }
    } catch { fail('指定区間の開始位置へ移動できませんでした。もう一度押してください。'); return; }
    status(); armTimer(); if (pending) finishStart(pending);
  }
  for (const event of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange']) video.addEventListener(event, refreshReadiness);
  video.addEventListener('timeupdate', boundary);
  video.addEventListener('pause', () => { if (running && video.paused) stop(); else status(); });
  video.addEventListener('ended', boundary);
  video.addEventListener('error', () => { if (currentSource() && video.error !== null) fail('動画を開けません。もう一度押すと読み込み直します。'); });
  video.addEventListener('ratechange', armTimer);
  video.addEventListener('seeking', () => {
    if (!selection || !ready || !currentSource()) return;
    if (video.currentTime < selection.start) video.currentTime = selection.start;
    if (video.currentTime >= selection.end) stop(true);
  });
  return {
    select(value) {
      stop(); selection = {...value}; ready = false; positioned = false; error = '';
      if (!validRange()) { fail('指定区間を動画内で確認できません。'); return; }
      try {
        if (currentSource() && video.readyState >= 1 && !video.error) refreshReadiness();
        else { video.src = selection.src; video.load(); status(); }
      } catch { fail('動画を開けません。もう一度押すと読み込み直します。'); }
    },
    async play() {
      if (!selection) return false;
      const retry = Boolean(error || video.error);
      stop(); error = '';
      let resolve;
      const completion = new Promise(done => { resolve = done; });
      const request = {token: generation, selection, played: false, resolve};
      pending = request; starting = true;
      try {
        if (!validRange()) { fail('指定区間を動画内で確認できません。'); return completion; }
        if (retry) { ready = false; positioned = false; video.load(); }
        if (currentSource() && video.readyState >= 1) refreshReadiness();
        if (!currentRequest(request)) return completion;
        // At HAVE_NOTHING this sets the browser's default playback start position.
        // Keep play() in the user's action; metadata-only preload need not finish first.
        video.currentTime = selection.start; positioned = ready;
        const attempt = video.play();
        Promise.resolve(attempt).then(() => {
          if (!currentRequest(request)) { if (!running && !starting) video.pause(); return; }
          request.played = true; refreshReadiness(); finishStart(request);
        }, () => { if (currentRequest(request)) fail('再生を開始できませんでした。もう一度押してください。'); });
        if (currentRequest(request)) {
          status(); watchFrame(request.token);
          if (active(request.token) && video.requestVideoFrameCallback) videoFrame = video.requestVideoFrameCallback((_now, metadata) => watchVideoFrame(request.token, metadata));
          armTimer();
        }
      } catch { if (currentRequest(request)) fail('再生を開始できませんでした。もう一度押してください。'); }
      return completion;
    },
    pause: () => stop(),
    get state() { return {ready, running, starting, selection, error}; },
  };
}
