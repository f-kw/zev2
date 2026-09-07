const video = document.querySelector('#video');
const play = document.querySelector('#play');
const pause = document.querySelector('#pause');
const restart = document.querySelector('#restart');
const status = document.querySelector('#status');
let start, end;
function update() {
  const elapsed = Math.max(0, Math.min(end-start,video.currentTime-start));
  status.textContent = `${video.paused ? '停止中' : '再生中'} · 確認範囲 ${elapsed.toFixed(1)} / ${(end-start).toFixed(1)} 秒`;
}
async function init() {
  const response = await fetch('/config.json');
  if (!response.ok) throw new Error('確認情報を読み込めません。');
  const {config} = await response.json();
  start = config.windowStartFrame/config.framesPerSecond;
  end = config.windowEndFrameExclusive/config.framesPerSecond;
  video.addEventListener('loadedmetadata',()=>{video.currentTime=start;play.disabled=pause.disabled=restart.disabled=false;update();},{once:true});
  video.addEventListener('seeking',()=>{if(video.currentTime<start)video.currentTime=start;});
  video.addEventListener('timeupdate',update);
  video.addEventListener('pause',update);
  video.addEventListener('play',update);
  video.addEventListener('error',()=>{status.textContent='修正版を読み込めません。';});
  play.addEventListener('click',async()=>{if(video.ended||video.currentTime>=end)video.currentTime=start;await video.play();});
  pause.addEventListener('click',()=>video.pause());
  restart.addEventListener('click',()=>{video.pause();video.currentTime=start;update();});
  video.src='/media.mp4';
}
init().catch(error=>{status.textContent=error.message;});
