'use strict';
// Digestの人間観測画面と同じく、seekの要求時刻ではなく描画されたframeを採用する。
const $ = id => document.getElementById(id), video = $('video');
let config, configSha, target, index = 0, frame = null, desiredFrame = null;
let seeking = false, saving = false, observedByUser = false, draftStart = null, draftEnd = null;
let observations = [];
const latest = () => new Map(observations.map(r => [r.request.targetId, r]));
const keepsStart = () => target?.optionalStart && !$('change-start').checked;
function ready() {
  const canPick = !saving && !seeking && video.paused && frame !== null && observedByUser;
  $('set-start').disabled = !canPick || keepsStart();
  $('set-end').disabled = !canPick;
  $('terminal').disabled = !canPick || frame !== config?.windowEndFrameExclusive - 1;
  const start = keepsStart() ? target.currentFrames.startFrame : draftStart?.frame;
  $('save').disabled = saving || seeking || !video.paused || start === undefined || !draftEnd || start >= draftEnd.frame;
  $('play').textContent = video.paused ? '再生' : '一時停止';
  $('start-value').textContent = keepsStart() ? `現在の開始frame ${target.currentFrames.startFrame} を維持` : draftStart ? `指定：frame ${draftStart.frame}` : '未指定：声を聞き、表示するコマを選んでください';
  $('end-value').textContent = draftEnd ? `指定：frame ${draftEnd.frame}${draftEnd.kind === 'after-final-frame' ? '（最終コマの直後）' : ' から消える'}` : '未指定：消すのが自然なコマを選んでください';
}
function showPosition() {
  if (frame === null) return;
  const local = frame - config.windowStartFrame;
  $('seek').value = local;
  $('position').textContent = `この25秒内 ${(local / config.framesPerSecond).toFixed(2)}秒 ／ 完成動画 frame ${frame}`;
}
function acceptPresentedFrame(mediaTime) {
  const actual = Math.round(mediaTime * config.framesPerSecond);
  if (desiredFrame !== null && actual !== desiredFrame) return;
  frame = actual;
  if (desiredFrame !== null) { desiredFrame = null; seeking = false; }
  if (frame < config.windowStartFrame || frame >= config.windowEndFrameExclusive) {
    video.pause(); seekTo(config.windowEndFrameExclusive - 1, false); return;
  }
  showPosition(); ready();
}
function watchFrame(_, metadata) {
  if (config && target) acceptPresentedFrame(metadata.mediaTime);
  video.requestVideoFrameCallback(watchFrame);
}
function seekTo(next, userAction = true) {
  video.pause();
  const bounded = Math.max(config.windowStartFrame, Math.min(next, config.windowEndFrameExclusive - 1));
  if (userAction) observedByUser = true;
  if (bounded === frame && !seeking) { ready(); return; }
  desiredFrame = bounded; seeking = true; ready();
  // コマの内部へseekし、callbackがそのコマを表示したと確認してから指定を解禁する。
  // これは字幕時刻のoffsetではない。保存するのはcallbackで確認した整数frameだけ。
  video.currentTime = (bounded + 0.5) / config.framesPerSecond;
}
function renderSummary() {
  const map = latest();
  $('count').textContent = `${map.size} / 3`;
  $('summary').replaceChildren();
  for (const t of config.targets) {
    const r = map.get(t.id), li = document.createElement('li');
    li.textContent = r ? `${t.text}：開始 ${r.proposedFrames.startFrame} ／ 終了 ${r.proposedFrames.endFrameExclusive} を保存済み` : `${t.text}：未保存`;
    $('summary').append(li);
  }
  const rows = config.targets.map(t => map.get(t.id));
  const overlap = rows.some((r, i) => i && r && rows[i-1] && rows[i-1].proposedFrames.endFrameExclusive > r.proposedFrames.startFrame);
  $('completion').textContent = overlap ? '保存した字幕同士が重なっています。該当箇所を再確認して選び直してください。自動では調整しません。'
    : map.size === 3 ? '3字幕の指定を保存しました。相談役へ「3字幕を指定した」と伝えてください。字幕の修正はまだ実行していません。' : '';
}
function select(i) {
  video.pause(); index = i; target = config.targets[i]; observedByUser = false;
  const r = latest().get(target.id);
  draftStart = r?.request.start ?? null; draftEnd = r?.request.end ?? null;
  $('change-start').checked = r?.startMode === 'human-selected';
  $('optional-row').hidden = !target.optionalStart;
  $('title').textContent = `${i + 1}. ${target.text}`;
  $('question').textContent = target.optionalStart ? 'この字幕をどこで消すのが自然かを指定してください。開始にも問題がある場合だけ「開始位置も直す」を選びます。' : '声を聞き、この字幕を出す位置と消す位置の両方を指定してください。現在の位置が正しいとは限りません。';
  $('current').textContent = `修正前：開始frame ${target.currentFrames.startFrame} ／ 終了frame ${target.currentFrames.endFrameExclusive}（このコマから消える）`;
  [...$('tabs').children].forEach((b, n) => b.setAttribute('aria-current', String(i === n)));
  $('next').disabled = i === 2; $('message').textContent = '';
  seekTo(config.windowStartFrame, false); renderSummary(); ready();
}
function pick(side, terminal = false) {
  if ($(terminal ? 'terminal' : `set-${side}`).disabled) return;
  const v = {frame: terminal ? frame + 1 : frame, presentedFrame: frame, kind: terminal ? 'after-final-frame' : 'frame-start'};
  if (side === 'start') draftStart = v; else draftEnd = v;
  $('message').textContent = '位置を選びました。開始・終了を確認して保存してください。'; ready();
}
async function save() {
  if ($('save').disabled) return;
  saving = true; ready();
  try {
    const request = {targetId: target.id, startMode: keepsStart() ? 'keep-current' : 'human-selected',
      start: keepsStart() ? null : draftStart, end: draftEnd, requestId: crypto.randomUUID(), configSha256: configSha};
    const response = await fetch('/observations', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(request)});
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    observations.push(result); renderSummary(); $('message').textContent = 'この字幕の指定を保存しました。字幕時刻そのものはまだ変更していません。';
  } catch (e) { $('message').textContent = `保存できませんでした：${e.message}`; }
  finally { saving = false; ready(); }
}
$('play').onclick = async () => {
  observedByUser = true;
  if (video.paused) { if (frame >= config.windowEndFrameExclusive - 1) seekTo(config.windowStartFrame); await video.play(); }
  else video.pause(); ready();
};
$('restart').onclick = () => { seekTo(config.windowStartFrame); video.play(); };
$('back').onclick = () => seekTo((desiredFrame ?? frame ?? config.windowStartFrame) - 1);
$('forward').onclick = () => seekTo((desiredFrame ?? frame ?? config.windowStartFrame) + 1);
$('seek').oninput = e => seekTo(config.windowStartFrame + Number(e.target.value));
$('speed').onchange = e => { video.playbackRate = Number(e.target.value); };
$('change-start').onchange = () => { draftStart = null; ready(); };
$('set-start').onclick = () => pick('start'); $('set-end').onclick = () => pick('end');
$('terminal').onclick = () => pick('end', true); $('save').onclick = save;
$('jump-start').onclick = () => seekTo(target.currentFrames.startFrame);
$('jump-end').onclick = () => seekTo(target.currentFrames.endFrameExclusive);
$('next').onclick = () => select(index + 1);
video.addEventListener('pause', () => { if (target) ready(); });
video.addEventListener('play', () => { observedByUser = true; if (target) ready(); });
video.addEventListener('timeupdate', () => { if (config && video.currentTime >= config.windowEndFrameExclusive / config.framesPerSecond) { video.pause(); seekTo(config.windowEndFrameExclusive-1, false); } });
video.addEventListener('error', () => { $('message').textContent = '動画を読み込めませんでした。'; });
async function init() {
  const response = await (await fetch('/config.json')).json(); config = response.config; configSha = response.fileSha256;
  $('qa').hidden = !response.qa;
  observations = await (await fetch('/observations')).json();
  $('seek').max = config.windowEndFrameExclusive - config.windowStartFrame - 1;
  for (const [i, t] of config.targets.entries()) {
    const b = document.createElement('button'); b.textContent = `${i+1}. ${t.text}`; b.onclick = () => select(i); $('tabs').append(b);
    const tr = document.createElement('tr');
    for (const text of [t.text, t.currentFrames.startFrame, t.currentFrames.endFrameExclusive]) { const td = document.createElement('td'); td.textContent = text; tr.append(td); }
    $('originals').append(tr);
  }
  if (!video.requestVideoFrameCallback) throw new Error('描画されたコマを確認できません。Edgeで開いてください。');
  video.requestVideoFrameCallback(watchFrame);
  if (video.readyState < 1) await new Promise(r => video.addEventListener('loadedmetadata', r, {once: true}));
  select(0);
}
init().catch(e => { $('message').textContent = e.message; });
