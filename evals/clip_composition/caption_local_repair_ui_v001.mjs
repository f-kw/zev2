const $ = id => document.getElementById(id);
const video = $('video');
let state, current, target, allowed, frame = null, desired = null, seeking = false, observed = false;
let draftStart = null, draftEnd = null, busy = false, preview = null, reviewError = null;
const latest = () => new Map(current.records.map(row => [row.operation.target.instructionId, row]));
const base = () => ({caseId: current.id, sourceSha256: current.sourceSha256});
async function post(route, data) {
  const response = await fetch(route, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...base(),...data})});
  const value = await response.json(); if(!response.ok) throw new Error(value.error);return value;
}
const shownFrame = time => Math.round(time * current.framesPerSecond);
const selectedFrame = endpoint => endpoint?.observation?.selectedVideoFrame;
function update() {
  if(!target)return;
  for(const id of ['case','target','reload'])$(id).disabled=busy;
  const candidate=current.reviewCandidates?.find(r=>r.instructionId===target.instructionId);
  const answer=current.reviewAnswers?.find(r=>r.target.instructionId===target.instructionId)?.answer;
  $('candidate-review').hidden=!candidate;
  $('repair-controls').hidden=!!candidate&&answer!=='issue';
  $('no-issue').disabled=busy||current.run?.status==='running';$('has-issue').disabled=$('no-issue').disabled;
  $('candidate-answer').textContent=reviewError??(answer==='no-issue'?'問題なしを記録しました。字幕や動画は変更しません。':answer==='issue'?'問題ありを記録しました。下の共通補修で境界指定・除外を選べます。':'動画を確認して判断してください。');
  const exclusion=$('exclude-mode').checked;
  $('boundary-controls').hidden=exclusion;$('exclude-controls').hidden=!exclusion;
  const locked=busy||current.run?.status==='running'||!!candidate&&answer!=='issue';
  const ready=!locked&&!seeking&&video.paused&&observed&&frame!==null;
  $('pick-start').disabled=!ready||$('keep-start').checked||!allowed.operations.includes('change-start');
  $('pick-end').disabled=!ready||$('keep-end').checked||!allowed.operations.includes('change-end');
  $('pick-final').disabled=$('pick-end').disabled||frame!==current.frameCount-1;
  $('start-value').textContent=$('keep-start').checked?`現在の開始 ${target.currentFrames.startFrame} コマを維持`:draftStart?`指定した開始：${selectedFrame(draftStart)} コマ`:'開始位置をまだ指定していません';
  $('end-value').textContent=$('keep-end').checked?`現在の終了 ${target.currentFrames.endFrameExclusive} コマを維持`:draftEnd?`指定した終了：${selectedFrame(draftEnd)} コマから消える`:'終了位置をまだ指定していません';
  const start=$('keep-start').checked?target.currentFrames.startFrame:selectedFrame(draftStart);
  const end=$('keep-end').checked?target.currentFrames.endFrameExclusive:selectedFrame(draftEnd);
  const boundaryValid=(!$('keep-start').checked||!$('keep-end').checked)&&Number.isInteger(start)&&Number.isInteger(end)&&start<end;
  const excludeValid=$('confirm-exclude').checked&&$('reason').value.trim().length>0;
  $('save').disabled=locked||seeking||!video.paused||(exclusion?!excludeValid:!boundaryValid);
  $('play').textContent=video.paused?'短時間再生':'一時停止';
  $('validate').disabled=busy||current.records.length===0||current.run?.status==='running';
  $('approve').disabled=busy||current.run?.status==='running';
  if(frame!==null) {if(!seeking)$('seek').value=frame;$('position').textContent=`完成動画の ${frame} コマ ／ この確認範囲 ${((frame-allowed.reviewWindow.startFrame)/current.framesPerSecond).toFixed(2)} 秒`;}
}
function seekTo(next, humanAction=true) {
  video.pause();if(humanAction)observed=true;
  const n=Math.max(allowed.reviewWindow.startFrame,Math.min(next,allowed.reviewWindow.endFrameExclusive-1));
  if(n===frame&&!seeking) {update();return;}
  desired=n;seeking=true;update();
  // Seek inside the requested frame; adopt only the frame acknowledged by the video callback.
  video.currentTime=(n+0.5)/current.framesPerSecond;
}
function onFrame(_,metadata) {
  if(current&&target) {
    const actual=shownFrame(metadata.mediaTime);
    if(desired===null||actual===desired) {
      frame=actual;if(desired!==null){desired=null;seeking=false;}
      if(frame>=allowed.reviewWindow.endFrameExclusive)seekTo(allowed.reviewWindow.endFrameExclusive-1,false);
      else update();
    }
  }
  video.requestVideoFrameCallback(onFrame);
}
video.requestVideoFrameCallback(onFrame);
video.addEventListener('timeupdate',()=>{
  if(target&&!video.paused&&video.currentTime>=allowed.reviewWindow.endFrameExclusive/current.framesPerSecond)seekTo(allowed.reviewWindow.endFrameExclusive-1,false);
});
video.addEventListener('pause',update);
video.addEventListener('error',()=>{$('message').textContent='動画を読み込めませんでした。再読込して確認してください。';});
function operationText(operation) {
  if(operation.kind==='exclude-caption')return `除外する字幕：「${operation.confirmedText}」\n理由：${operation.reason}\n映像と音声は残します。`;
  const start=operation.start.mode==='keep-current'?`${operation.target.currentFrames.startFrame}（維持）`:operation.start.observation.selectedVideoFrame;
  const end=operation.end.mode==='keep-current'?`${operation.target.currentFrames.endFrameExclusive}（維持）`:operation.end.observation.selectedVideoFrame;
  return `「${operation.target.text}」\n開始 ${start} ／ 終了 ${end} コマ`;
}
function summary() {
  $('summary').replaceChildren();
  for(const row of current.records) {const li=document.createElement('li');li.textContent=operationText(row.operation);$('summary').append(li);}
  const run=current.run;
  $('render-status').textContent=run?.status==='running'?'承認した変更を反映して動画を再生成しています。':run?.status==='failed'?`再生成できませんでした：${run.error}`:run?.status==='completed'?'再生成と技術検査が完了しました。対象箇所だけ確認できます。':'';
  $('review').hidden=run?.status!=='completed';
  if(run?.status==='completed') {
    const beforeUrl=new URL(current.mediaUrl,location.href).href,afterUrl=new URL(run.reviewUrl,location.href).href;
    if($('before').src!==beforeUrl)$('before').src=beforeUrl;
    if($('after').src!==afterUrl)$('after').src=afterUrl;
  }
  updateReviewText();
}
function updateReviewText() {
  if(!target)return;
  const operation=latest().get(target.instructionId)?.operation;
  $('review-text').textContent=operation?.kind==='exclude-caption'?`除外した字幕：「${target.text}」。補修前にはこの字幕が表示され、補修後ではこの字幕だけがなくなります。映像と音声は同じです。`:`確認する字幕：「${target.text}」。変更した開始・終了だけを確認します。`;
  for(const v of [$('before'),$('after')]) {v.pause();if(v.readyState>=1)v.currentTime=allowed.reviewWindow.startFrame/current.framesPerSecond;}
}
function chooseTarget(instructionId) {
  video.pause();reviewError=null;target=current.targets.find(t=>t.instructionId===instructionId)??current.targets[0];
  allowed=current.allowedTargets.find(t=>t.instructionId===target.instructionId);
  $('candidate-reasons').replaceChildren();for(const reason of current.reviewCandidates?.find(r=>r.instructionId===target.instructionId)?.reasons??[]){const li=document.createElement('li');li.textContent=reason;$('candidate-reasons').append(li);}
  $('target').value=target.instructionId;$('text').textContent=target.text;$('excluded-text').textContent=`「${target.text}」`;
  $('current').textContent=`現在：開始 ${target.currentFrames.startFrame} コマ ／ 終了 ${target.currentFrames.endFrameExclusive} コマ（このコマから消える）`;
  if(current.reviewCandidates){const sameWindow=current.allowedTargets.filter(t=>t.reviewWindow.startFrame===allowed.reviewWindow.startFrame&&t.reviewWindow.endFrameExclusive===allowed.reviewWindow.endFrameExclusive);
    const texts=sameWindow.map(t=>current.targets.find(row=>row.instructionId===t.instructionId).text);
    $('current').textContent+=`。この再生範囲の確認対象：${texts.map(text=>`「${text}」`).join('、')}。同じ範囲は一度の再生で確認でき、回答は字幕ごとに保存します。`;}
  const saved=latest().get(target.instructionId)?.operation;
  draftStart=saved?.kind==='change-boundaries'&&saved.start.mode==='observed'?saved.start:null;
  draftEnd=saved?.kind==='change-boundaries'&&saved.end.mode==='observed'?saved.end:null;
  $('keep-start').checked=!draftStart;$('keep-end').checked=!draftEnd;
  $('keep-start').disabled=!allowed.operations.includes('change-start');$('keep-end').disabled=!allowed.operations.includes('change-end');
  $('boundary-mode').disabled=!allowed.operations.some(op=>op==='change-start'||op==='change-end');
  $('exclude-mode').disabled=!allowed.operations.includes('exclude-caption');
  const exclusion=saved?.kind==='exclude-caption'||$('boundary-mode').disabled;
  $('exclude-mode').checked=exclusion;$('boundary-mode').checked=!exclusion;
  $('reason').value=saved?.kind==='exclude-caption'?saved.reason:'';$('confirm-exclude').checked=saved?.kind==='exclude-caption';
  $('seek').min=allowed.reviewWindow.startFrame;$('seek').max=allowed.reviewWindow.endFrameExclusive-1;
  frame=null;desired=null;observed=false;$('message').textContent='';
  if(video.readyState>=1)seekTo(allowed.reviewWindow.startFrame,false);
  else video.addEventListener('loadedmetadata',()=>seekTo(allowed.reviewWindow.startFrame,false),{once:true});
  summary();update();
}
function chooseCase(id) {
  current=state.cases.find(c=>c.id===id)??state.cases[0];$('case').value=current.id;
  preview=null;$('preview').textContent='';$('approve').hidden=true;
  $('selection-summary').hidden=!state.reviewSummary;$('selection-summary').textContent=state.reviewSummary??'';
  $('purpose').textContent=current.reviewCandidates?(current.purpose==='human-observation'?'選ばれた字幕だけを確認し、問題がある場合に共通補修へ進みます。':'レビュー導線の技術検証です。この操作を新しい人間品質判断として扱いません。'):current.purpose==='human-observation'?'問題のある字幕だけ指定し、保存した変更を確認してから再生成します。':'既存の人間指定を使う共通化の操作検証です。今回の操作を新しい人間判断や品質評価として保存しません。';
  $('target').replaceChildren();for(const t of current.targets){const o=document.createElement('option');o.value=t.instructionId;o.textContent=t.text;$('target').append(o);}
  video.src=current.mediaUrl;chooseTarget(current.targets[0].instructionId);
}
async function reload(keep=true) {
  const caseId=current?.id,targetId=target?.instructionId;
  const response=await fetch('/api/state');if(!response.ok)throw new Error('保存内容を読み込めません。');state=await response.json();
  $('case').replaceChildren();for(const c of state.cases){const o=document.createElement('option');o.value=c.id;o.textContent=c.title;$('case').append(o);}
  chooseCase(keep&&caseId?caseId:state.cases[0].id);if(keep&&targetId)chooseTarget(targetId);
}
async function pick(side,terminal=false) {
  if($(terminal?'pick-final':`pick-${side}`).disabled)return;
  const selectedTarget=target;
  busy=true;update();
  try {
    const observation=await post('/api/frame',{instructionId:target.instructionId,presentedVideoFrame:frame,boundaryKind:terminal?'after-final-frame':'frame-start'});
    if(target!==selectedTarget)return;
    const endpoint={mode:'observed',observation};if(side==='start')draftStart=endpoint;else draftEnd=endpoint;
    $('message').textContent='表示中のコマを指定しました。内容を確認して保存してください。';
  }catch(error){$('message').textContent=error.message;}finally{busy=false;update();}
}
$('pick-start').onclick=()=>pick('start');$('pick-end').onclick=()=>pick('end');$('pick-final').onclick=()=>pick('end',true);
$('case').onchange=()=>chooseCase($('case').value);$('target').onchange=()=>chooseTarget($('target').value);
$('reload').onclick=()=>reload().catch(error=>$('message').textContent=error.message);
for(const id of ['keep-start','keep-end','boundary-mode','exclude-mode','confirm-exclude','reason'])$(id).oninput=update;
$('seek').oninput=()=>seekTo(Number($('seek').value));$('previous-frame').onclick=()=>seekTo((frame??allowed.reviewWindow.startFrame)-1);$('next-frame').onclick=()=>seekTo((frame??allowed.reviewWindow.startFrame)+1);
$('play').onclick=async()=>{observed=true;if(video.paused){if(frame>=allowed.reviewWindow.endFrameExclusive-1)seekTo(allowed.reviewWindow.startFrame);await video.play();}else video.pause();update();};
$('restart').onclick=()=>seekTo(allowed.reviewWindow.startFrame);
$('save').onclick=async()=>{
  if($('save').disabled)return;const selectedCase=current;busy=true;update();
  const operation=$('exclude-mode').checked?{kind:'exclude-caption',target,confirmedText:target.text,reason:$('reason').value.trim()}
    :{kind:'change-boundaries',target,start:$('keep-start').checked?{mode:'keep-current'}:draftStart,end:$('keep-end').checked?{mode:'keep-current'}:draftEnd};
  try{const row=await post('/api/save',{operation});selectedCase.records=selectedCase.records.filter(r=>r.operation.target.instructionId!==operation.target.instructionId);selectedCase.records.push(row);selectedCase.run=null;if(current!==selectedCase)return;preview=null;$('approve').hidden=true;$('preview').textContent='';$('message').textContent='指定を保存しました。動画はまだ変更していません。';summary();}
  catch(error){$('message').textContent=`保存できませんでした：${error.message}`;}finally{busy=false;update();}
};
$('validate').onclick=async()=>{
  busy=true;update();try{preview=await post('/api/validate',{});$('preview').textContent='次の変更だけを反映します。\n\n'+preview.operations.map(operationText).join('\n\n');$('approve').hidden=false;}
  catch(error){$('render-status').textContent=`変更を確定できません：${error.message}`;}finally{busy=false;update();}
};
$('approve').onclick=async()=>{
  if(!preview||$('approve').disabled)return;busy=true;update();
  try{current.run=await post('/api/render',{approvalId:preview.approvalId,approval:preview.approval});$('approve').hidden=true;summary();}
  catch(error){$('render-status').textContent=error.message;}finally{busy=false;update();}
};
async function playReview(which) {
  const v=$(which);$('before').pause();$('after').pause();
  v.currentTime=allowed.reviewWindow.startFrame/current.framesPerSecond;
  await v.play();
}
for(const which of ['before','after']){
  $(`play-${which}`).onclick=()=>playReview(which);
  const boundReview=()=>{const v=$(which);if(!target||v.readyState<1)return;const start=allowed.reviewWindow.startFrame/current.framesPerSecond,end=(allowed.reviewWindow.endFrameExclusive-1)/current.framesPerSecond;if(v.currentTime<start)v.currentTime=start;else if(v.currentTime>end){v.pause();v.currentTime=end;}};
  $(which).addEventListener('loadedmetadata',boundReview);
  $(which).addEventListener('seeking',boundReview);
  $(which).addEventListener('timeupdate',()=>{const v=$(which);if(target&&v.currentTime>=allowed.reviewWindow.endFrameExclusive/current.framesPerSecond){v.pause();v.currentTime=(allowed.reviewWindow.endFrameExclusive-1)/current.framesPerSecond;}});
}
setInterval(async()=>{
  if(current?.run?.status!=='running')return;
  try{const response=await fetch('/api/state');const fresh=await response.json();const next=fresh.cases.find(c=>c.id===current.id);current.run=next.run;summary();update();}catch(error){$('render-status').textContent=error.message;}
},1000);
reload(false).catch(error=>$('message').textContent=error.message);

async function recordReview(answer){if(busy)return;reviewError=null;busy=true;update();try{const row=await post('/api/review',{instructionId:target.instructionId,answer});current.reviewAnswers=current.reviewAnswers.filter(r=>r.target.instructionId!==target.instructionId);current.reviewAnswers.push(row);}catch(error){reviewError=error.message==='SAVED_REPAIR_ALREADY_EXISTS'?'この字幕には補修指定を保存済みです。問題なしへ変更できません。':`回答を保存できませんでした：${error.message}`;}finally{busy=false;update();}}
$('no-issue').onclick=()=>recordReview('no-issue');$('has-issue').onclick=()=>recordReview('issue');
