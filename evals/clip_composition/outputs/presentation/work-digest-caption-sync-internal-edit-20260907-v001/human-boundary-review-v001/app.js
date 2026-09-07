'use strict';
const $ = id => document.getElementById(id);
const video = $('video');
let targets, current, frame = null, seeking = false, saving = false, reviewed = false, desiredFrame = null;
let observations = [];
function ready() {
  $('save').disabled = saving || seeking || !video.paused || frame === null || !reviewed;
  $('play').textContent = video.paused ? '再生' : '一時停止';
}
function showPosition() {
  if (!current || frame === null) return;
  const local = frame - current.windowStartFrame;
  $('seek').value = local;
  $('position').textContent = `${(local/30).toFixed(2)} / ${(current.windowEndFrameExclusive-current.windowStartFrame)/30} 秒`;
}
function acceptPresentedFrame(mediaTime) {
  // Every source presentation timestamp is an exact 30 fps frame boundary.
  const actual = Math.round(mediaTime * 30);
  if (desiredFrame !== null && actual !== desiredFrame) return;
  frame = actual;
  if (desiredFrame !== null) { desiredFrame = null; seeking = false; }
  if (current && (frame < current.windowStartFrame || frame >= current.windowEndFrameExclusive)) {
    video.pause();
    if (!seeking) seekTo(current.windowEndFrameExclusive-1, false);
    return;
  }
  showPosition(); ready();
}
function watchFrame(_, metadata) {
  acceptPresentedFrame(metadata.mediaTime);
  video.requestVideoFrameCallback(watchFrame);
}
function seekTo(next, userAction=true) {
  video.pause();
  const bounded = Math.max(current.windowStartFrame, Math.min(next, current.windowEndFrameExclusive-1));
  if (userAction) reviewed = true;
  if (bounded === frame && !seeking) { ready(); return; }
  desiredFrame = bounded; seeking = true; ready();
  // Seek to the interior of the requested frame, then trust the displayed frame callback.
  video.currentTime = (bounded + 0.5) / 30;
}
function select(index) {
  video.pause(); current = targets[index]; frame = null; reviewed = false;
  $('capture').setAttribute('aria-current', String(index===0));
  $('place').setAttribute('aria-current', String(index===1));
  $('title').textContent = current.text;
  $('question').textContent = current.side==='start' ? 'この言葉を話し始めた位置を選んでください。' : '「どこ？」と言い終わった直後の位置を選んでください。';
  $('locked').textContent = current.side==='start' ? '消える位置は現在のままです。今回は出始めだけを合わせます。' : '出始めは確認済みの位置に固定しています。今回は消える位置だけを合わせます。';
  $('seek').max = current.windowEndFrameExclusive-current.windowStartFrame-1;
  $('message').textContent = ''; seekTo(current.windowStartFrame, false); renderSummary();
}
function renderSummary() {
  const latest = new Map(observations.map(x=>[x.request.targetId,x]));
  $('count').textContent = `${latest.size} / 2`;
  $('summary').replaceChildren();
  for (const [index,t] of targets.entries()) {
    const r=latest.get(t.id), li=document.createElement('li');
    const label = !r ? '未回答' : r.status==='not-identifiable' ? '指定できないと記録' : r.status==='eligible-for-local-promotion' ? '位置を保存済み' : '位置を保存済み・追加判断が必要';
    $(index===0?'capture-state':'place-state').textContent = `／${label}`;
    li.textContent=`${t.text}：${label}`;
    if (r?.selectedBoundary) li.textContent+=`（この短い動画の${(r.selectedBoundary.windowLocalFrame/30).toFixed(2)}秒のコマ）`;
    $('summary').append(li);
  }
  const r=latest.get(current.id);
  $('saved').textContent=r ? '保存した位置は下の回答一覧に表示しています。選び直して確定すると新しい回答も保存されます。' : '';
}
async function save(unknown=false) {
  if (saving || (!unknown && $('save').disabled)) return;
  video.pause(); saving=true; ready(); $('unclear').disabled=true;
  try {
    const response=await fetch('/observations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:current.id,frame:unknown?null:frame,requestId:crypto.randomUUID()})});
    const result=await response.json(); if(!response.ok)throw new Error(result.error);
    observations.push(result); renderSummary();
    $('message').textContent=result.status==='not-identifiable' ? '指定できないという回答を保存しました。' : result.status==='eligible-for-local-promotion' ? 'この位置を保存しました。' : 'この位置を保存しました。固定する字幕の境界と重なるため、追加判断が必要です。';
  } catch(error) { $('message').textContent=`保存できませんでした：${error.message}`; }
  finally {saving=false;$('unclear').disabled=false;ready();}
}
$('capture').onclick=()=>select(0); $('place').onclick=()=>select(1);
$('play').onclick=async()=>{reviewed=true;if(video.paused){if(frame>=current.windowEndFrameExclusive-1)seekTo(current.windowStartFrame);await video.play();}else video.pause();ready();};
$('restart').onclick=()=>{seekTo(current.windowStartFrame);video.play();};
$('back').onclick=()=>seekTo((frame??current.windowStartFrame)-1);
$('forward').onclick=()=>seekTo((frame??current.windowStartFrame)+1);
$('seek').oninput=event=>seekTo(current.windowStartFrame+Number(event.target.value));
$('speed').onchange=event=>{video.playbackRate=Number(event.target.value);};
$('save').onclick=()=>save();$('unclear').onclick=()=>save(true);
video.addEventListener('pause',ready);video.addEventListener('play',()=>{reviewed=true;ready();});
video.addEventListener('timeupdate',()=>{if(current && video.currentTime>=current.windowEndFrameExclusive/30){video.pause();seekTo(current.windowEndFrameExclusive-1,false);}});
video.addEventListener('error',()=>{$('message').textContent='動画を読み込めませんでした。';});
async function init(){
  const config=await (await fetch('/config.json')).json(); targets=config.targets;
  observations=await(await fetch('/observations')).json();
  if (!video.requestVideoFrameCallback) throw new Error('このブラウザではコマ位置を確かめられません。Edgeで開いてください。');
  video.requestVideoFrameCallback(watchFrame);
  if(video.readyState<1)await new Promise(resolve=>video.addEventListener('loadedmetadata',resolve,{once:true}));
  select(0);
}
init().catch(error=>{$('message').textContent=error.message;});
