#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function rootDir() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceなし');
    current = parent;
  }
  return current;
}

const root = rootDir();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const rankingRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-character-context-run1-v002');
const rankingResultPath = path.join(rankingRoot, 'result.json');
const rankingManifestPath = path.join(rankingRoot, 'run-manifest.json');
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260713-trial-v002');
const manifestPath = path.join(outputRoot, 'manifest.json');
const preflightPath = path.join(outputRoot, 'preflight.json');
const htmlPath = path.join(outputRoot, 'index.html');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

const labels = {
  nOEWCNc77MI_multiblock_material_v001: 'マリン・ころね Raft',
  '9dtwF5Exu5w_multiblock_material_v001': 'マリン 野球ゲーム'
};

const html = String.raw`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>手直し試験 v002</title>
  <style>
    :root{color-scheme:dark;--bg:#0f1218;--panel:#191e27;--line:#343d4d;--text:#f5f7fb;--muted:#aab4c5;--blue:#67d2ff;--green:#72e4a3;--yellow:#ffd071;--red:#ff8b8b}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1120px;margin:auto;padding:18px 18px 210px}h1{font-size:25px;margin:0 0 5px}h2{font-size:22px;margin:5px 0 9px}.muted{color:var(--muted)}.top{display:flex;justify-content:space-between;gap:16px}.pill{border:1px solid var(--line);border-radius:99px;padding:7px 11px;white-space:nowrap}.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;margin-top:14px}.candidate-list{display:grid;gap:8px;margin-top:12px}.candidate-list div{background:#11161e;border:1px solid var(--line);border-radius:10px;padding:11px}.candidate-list b{display:block;margin-bottom:3px}video{width:100%;max-height:55vh;background:#000;border-radius:10px}.times{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px}.time,.snap{background:#11161e;border:1px solid var(--line);border-radius:10px;padding:10px}.time strong{display:block;font-size:18px;margin-top:3px}.snap-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.snap-options{display:flex;flex-wrap:wrap;gap:7px;margin-top:7px}.snap-options button.selected{background:#17543a;border-color:var(--green)}button,input,textarea{font:inherit}button{color:var(--text);background:#252d39;border:1px solid #445064;border-radius:9px;padding:10px 13px;cursor:pointer}button:hover{border-color:var(--blue)}button:disabled{opacity:.4;cursor:not-allowed}.publish{background:#17613e;border-color:#2cad6e;font-weight:700}.skip{background:#4b3c1a;border-color:#aa812c}.unknown{background:#49365e;border-color:#8f67ba}.primary{background:#155e7c;border-color:#2da7d5;font-weight:700}.danger{background:#5e2626;border-color:#a94b4b}.direct-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:11px}.direct label{font-weight:700}.direct input{width:100%;margin-top:4px;color:var(--text);background:#0d1117;border:2px solid #596981;border-radius:9px;padding:10px;font-size:17px}.controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}textarea{width:100%;min-height:60px;color:var(--text);background:#11161e;border:1px solid var(--line);border-radius:9px;padding:9px}.bottom{position:fixed;left:0;right:0;bottom:0;background:rgba(15,18,24,.97);border-top:1px solid var(--line);padding:12px 18px;backdrop-filter:blur(8px)}.bottom-inner{max-width:1120px;margin:auto;display:flex;gap:9px;align-items:center;flex-wrap:wrap}.spacer{flex:1}.status{color:var(--muted)}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.summary-grid div{background:#11161e;border:1px solid var(--line);border-radius:10px;padding:12px}.summary-grid strong{display:block;font-size:23px}.hidden{display:none!important}@media(max-width:720px){.times,.snap-grid,.direct-grid,.summary-grid{grid-template-columns:1fr}.bottom-inner button{flex:1}.spacer{display:none}}
  </style>
</head>
<body>
<main>
  <div class="top"><div><h1>手直し試験 v002</h1><div class="muted">上位5候補から公開する候補を選び、公開できる開始・終了へ直します。</div></div><div class="pill" id="progress">読込中</div></div>
  <section id="intro" class="panel hidden"><h2 id="introTitle"></h2><p>この5件が表示された時点から、候補確認と境界調整を含めて計測します。正解や過去の人間評価は表示していません。</p><div id="introList" class="candidate-list"></div></section>
  <div id="workspace" class="hidden">
    <section class="panel"><div id="source" class="muted"></div><h2 id="title"></h2><p id="reason"></p></section>
    <section class="panel"><video id="video" controls preload="metadata"></video><div class="times"><div class="time"><span class="muted">現在位置</span><strong id="current">--:--.---</strong></div><div class="time"><span class="muted">開始</span><strong id="start">--:--.---</strong></div><div class="time"><span class="muted">終了</span><strong id="end">--:--.---</strong></div></div></section>
    <section id="editor" class="panel hidden"><h2>公開する境界を決める</h2><p class="muted">まず概算時刻を入力してください。直前・直後の単語境界へ合わせたあと、候補ボタンで周辺を短く試聴できます。</p><div class="direct-grid"><div class="direct"><label>開始<input id="directStart" inputmode="decimal" placeholder="4:13"></label></div><div class="direct"><label>終了<input id="directEnd" inputmode="decimal" placeholder="5:13"></label></div></div><div class="controls"><button id="applyTime" class="primary">時刻を単語境界へ合わせる</button><button id="preview">選択範囲を再生</button><button id="reset">仮区間へ戻す</button></div><div class="snap-grid"><div class="snap"><strong>開始候補</strong><div id="snapStart" class="snap-options"><span class="muted">時刻入力後に表示</span></div></div><div class="snap"><strong>終了候補</strong><div id="snapEnd" class="snap-options"><span class="muted">時刻入力後に表示</span></div></div></div><div class="controls"><button data-step="-5">−5秒</button><button data-step="-1">−1秒</button><button data-step="-0.1">−0.1秒</button><button data-step="0.1">＋0.1秒</button><button data-step="1">＋1秒</button><button data-step="5">＋5秒</button><button id="setStart">現在位置を開始</button><button id="setEnd">現在位置を終了</button></div><p><label>判断メモ（任意）<textarea id="notes"></textarea></label></p></section>
  </div>
  <section id="summary" class="panel hidden"><h2 id="summaryTitle"></h2><div class="summary-grid"><div>公開する<strong id="publishCount">0</strong></div><div>選ばない<strong id="skipCount">0</strong></div><div>文脈不明<strong id="unknownCount">0</strong></div></div><p id="summaryTime"></p><p class="muted">文脈不明は「つまらない」へ合算しません。</p></section>
</main>
<div class="bottom"><div class="bottom-inner"><button id="startMaterial" class="publish hidden">この配信の計測を開始</button><div id="decisionButtons" class="hidden"><button id="choosePublish" class="publish">公開する</button><button id="chooseSkip" class="skip">選ばない</button><button id="chooseUnknown" class="unknown">文脈不明</button></div><button id="savePublish" class="publish hidden">境界を保存して次へ</button><button id="nextMaterial" class="primary hidden">次の配信へ</button><span class="spacer"></span><span id="timer" class="status"></span><span id="saveState" class="status"></span></div></div>
<script>
(() => {
  const $=id=>document.getElementById(id);const video=$('video');let manifest,state,materialIndex=0,taskIndex=0,mode='intro',sessionActiveAt,taskActiveAt,hiddenAt,previewEndMs=null,snippetEndMs=null,directDirty=true,saveTimer;
  const now=()=>new Date().toISOString();
  const fmt=ms=>{if(!Number.isFinite(ms))return'--:--.---';const t=Math.max(0,Math.round(ms)),h=Math.floor(t/3600000),m=Math.floor((t%3600000)/60000),s=Math.floor((t%60000)/1000),x=t%1000;return(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(x).padStart(3,'0')};
  const fmtInput=ms=>{const total=Math.max(0,ms)/1000,h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60,ss=(Number.isInteger(s)?String(s).padStart(2,'0'):s.toFixed(3).padStart(6,'0').replace(/0+$/,'').replace(/\.$/,''));return h?h+':'+String(m).padStart(2,'0')+':'+ss:m+':'+ss};
  const parse=value=>{const p=String(value).trim().split(':').map(Number);if(!p.length||p.length>3||p.some(x=>!Number.isFinite(x)||x<0))return null;if((p.length>=2&&p.at(-1)>=60)||(p.length===3&&p[1]>=60))return null;return Math.round((p.length===1?p[0]:p.length===2?p[0]*60+p[1]:p[0]*3600+p[1]*60+p[2])*1000)};
  const material=()=>manifest.materials[materialIndex];const tasks=()=>material().taskIds.map(id=>manifest.tasks.find(t=>t.id===id));const task=()=>tasks()[taskIndex];const record=()=>state.tasks[task().id];const session=()=>state.sessions[material().fixtureId];
  function ensure(){for(const m of manifest.materials)if(!state.sessions[m.fixtureId])state.sessions[m.fixtureId]={fixtureId:m.fixtureId,status:'not_started',activeElapsedMs:0,hiddenElapsedMs:0,events:[]};for(const t of manifest.tasks)if(!state.tasks[t.id])state.tasks[t.id]={taskId:t.id,fixtureId:t.fixtureId,candidateId:t.candidateId,rank:t.rank,status:'not_started',decision:null,provisionalStartMs:t.provisionalStartMs,provisionalEndMs:t.provisionalEndMs,finalStartMs:t.provisionalStartMs,finalEndMs:t.provisionalEndMs,activeElapsedMs:0,operationCounts:{directEntry:0,wordSnap:0,preview:0,seek:0,step:0,playPause:0,manualBoundary:0,reset:0},events:[],notes:''};}
  function flush(){const n=Date.now();if(sessionActiveAt){session().activeElapsedMs+=n-sessionActiveAt;sessionActiveAt=null}if(taskActiveAt&&mode==='task'){record().activeElapsedMs+=n-taskActiveAt;taskActiveAt=null}}
  function resume(){if(document.hidden||session().status!=='in_progress')return;if(!sessionActiveAt)sessionActiveAt=Date.now();if(mode==='task'&&record().status==='in_progress'&&!taskActiveAt)taskActiveAt=Date.now()}
  async function save(){flush();state.updatedAt=now();$('saveState').textContent='保存中…';const r=await fetch('/api/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(state)});if(!r.ok)throw new Error(await r.text());$('saveState').textContent='保存済み';resume()}
  function schedule(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(e=>{$('saveState').textContent='保存失敗';console.error(e)}),300)}
  function event(target,action,detail={}){target.events.push({at:now(),action,...detail});schedule()}
  function show(id,value){$(id).classList.toggle('hidden',!value)}
  function intro(){flush();mode='intro';const m=material();$('progress').textContent=(materialIndex+1)+' / '+manifest.materials.length+' 配信';$('introTitle').textContent=m.label+'：上位5候補';$('introList').innerHTML=tasks().map(t=>'<div><b>'+t.rank+'位　'+escapeHtml(t.title)+'</b><span class="muted">'+escapeHtml(t.reason)+'</span></div>').join('');show('intro',true);show('workspace',false);show('summary',false);show('startMaterial',true);show('decisionButtons',false);show('savePublish',false);show('nextMaterial',false);$('timer').textContent='上限15分';}
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function startMaterial(){const s=session();if(s.status==='not_started'){s.status='in_progress';s.startedAt=now();s.wallStartedAtMs=Date.now();event(s,'material_begin')}taskIndex=Math.max(0,tasks().findIndex(t=>state.tasks[t.id].status!=='complete'));if(taskIndex<0)taskIndex=0;loadTask()}
  function loadTask(){flush();mode='task';const t=task(),r=record();if(r.status!=='complete'){r.status='in_progress';r.startedAt=r.startedAt||now()}$('progress').textContent=material().label+'　'+(taskIndex+1)+' / 5';$('source').textContent=material().label+' / '+t.rank+'位 / candidate '+t.candidateId;$('title').textContent=t.title;$('reason').textContent=t.reason;$('notes').value=r.notes||'';video.src=t.videoRoute;video.onloadedmetadata=()=>{video.currentTime=r.finalStartMs/1000;update()};directDirty=true;syncInputs();$('snapStart').innerHTML='<span class="muted">時刻入力後に表示</span>';$('snapEnd').innerHTML='<span class="muted">時刻入力後に表示</span>';show('intro',false);show('workspace',true);show('summary',false);show('startMaterial',false);show('decisionButtons',true);show('editor',r.decision==='publish');show('savePublish',r.decision==='publish');show('nextMaterial',false);resume();update();schedule()}
  function syncInputs(){$('directStart').value=fmtInput(record().finalStartMs);$('directEnd').value=fmtInput(record().finalEndMs);$('directStart').setCustomValidity('');$('directEnd').setCustomValidity('')}
  function update(){$('current').textContent=fmt(video.currentTime*1000);if(mode==='task'){$('start').textContent=fmt(record().finalStartMs);$('end').textContent=fmt(record().finalEndMs);const s=session().activeElapsedMs+(sessionActiveAt?Date.now()-sessionActiveAt:0),r=record().activeElapsedMs+(taskActiveAt?Date.now()-taskActiveAt:0);$('timer').textContent='配信 '+fmt(s)+' / この候補 '+fmt(r)}}
  function choosePublish(){const r=record();r.decision='publish';event(r,'choose_publish');show('editor',true);show('savePublish',true);directDirty=true;syncInputs();video.currentTime=r.finalStartMs/1000;update()}
  async function finish(decision){const r=record();if(decision==='publish'&&!(await applyDirect()))return;flush();r.status='complete';r.decision=decision;r.completedAt=now();r.notes=$('notes').value;event(r,'candidate_complete',{decision,startMs:r.finalStartMs,endMs:r.finalEndMs});await save();if(taskIndex<tasks().length-1){taskIndex+=1;loadTask()}else finishMaterial()}
  async function finishMaterial(){flush();const s=session();s.status='complete';s.completedAt=now();s.wallElapsedMs=Date.now()-s.wallStartedAtMs;event(s,'material_complete');await save();mode='summary';const rs=tasks().map(t=>state.tasks[t.id]),counts=k=>rs.filter(r=>r.decision===k).length;$('summaryTitle').textContent=material().label+' 完了';$('publishCount').textContent=counts('publish');$('skipCount').textContent=counts('skip');$('unknownCount').textContent=counts('context_unknown');$('summaryTime').textContent='操作可能時間 '+fmt(s.activeElapsedMs)+' / 壁時計 '+fmt(s.wallElapsedMs)+' / 非表示 '+fmt(s.hiddenElapsedMs);show('intro',false);show('workspace',false);show('summary',true);show('decisionButtons',false);show('savePublish',false);show('nextMaterial',materialIndex<manifest.materials.length-1);$('timer').textContent=materialIndex<manifest.materials.length-1?'次の配信は別計測':'2配信完了'}
  function setBoundary(side,option,requested,automatic){const r=record();if(side==='start')r.finalStartMs=option.timeMs;else r.finalEndMs=option.timeMs;r.snapSelections=r.snapSelections||{};r.snapSelections[side]={requestedTimeMs:requested,selectedTimeMs:option.timeMs,relation:option.relation,word:option.word,context:option.context,automatic};r.operationCounts.wordSnap+=1;event(r,'word_boundary_snap',{side,requestedTimeMs:requested,selectedTimeMs:option.timeMs,automatic});directDirty=false;syncInputs();update()}
  function renderOptions(side,data,selected){const box=side==='start'?$('snapStart'):$('snapEnd');box.textContent='';for(const o of data.options){const b=document.createElement('button');b.type='button';b.className=o.timeMs===selected?'selected':'';const rel=o.relation==='before'?'直前':o.relation==='after'?'直後':'一致';b.textContent=rel+' '+fmt(o.timeMs)+'「'+o.context+'」';b.onclick=()=>{setBoundary(side,o,data.requestedTimeMs,false);renderOptions(side,data,o.timeMs);video.currentTime=Math.max(0,(o.timeMs-2000)/1000);snippetEndMs=o.timeMs+2000;video.play().catch(()=>{})};box.appendChild(b)}}
  async function fetchSnap(side,requested){const t=task(),res=await fetch('/api/boundary-options?sourceVideoId='+encodeURIComponent(t.sourceVideoId)+'&timeMs='+requested+'&side='+side);if(!res.ok)throw new Error(await res.text());const data=await res.json();if(!data.options.length)return requested;const selected=[...data.options].sort((a,b)=>{const d=Math.abs(a.timeMs-requested)-Math.abs(b.timeMs-requested);if(d)return d;if(side==='start')return a.timeMs-b.timeMs;return b.timeMs-a.timeMs})[0];setBoundary(side,selected,requested,true);renderOptions(side,data,selected.timeMs);return selected.timeMs}
  async function applyDirect(){const r=record();if(!directDirty&&r.snapSelections?.start&&r.snapSelections?.end)return true;const a=parse($('directStart').value),b=parse($('directEnd').value);$('directStart').setCustomValidity(a==null?'4:13 のように入力してください':'');$('directEnd').setCustomValidity(b==null?'5:13 のように入力してください':'');if(a==null||b==null||a>=b){if(a!=null&&b!=null)$('directEnd').setCustomValidity('終了は開始より後にしてください');$('directStart').reportValidity();$('directEnd').reportValidity();return false}r.operationCounts.directEntry+=1;event(r,'direct_time_entry',{requestedStartMs:a,requestedEndMs:b});const sa=await fetchSnap('start',a),sb=await fetchSnap('end',b);if(sa>=sb){$('directEnd').setCustomValidity('単語境界へ合わせると終了が開始以前です');$('directEnd').reportValidity();return false}directDirty=false;return true}
  async function preview(){if(!(await applyDirect()))return;video.currentTime=record().finalStartMs/1000;previewEndMs=record().finalEndMs;record().operationCounts.preview+=1;event(record(),'preview');video.play().catch(()=>{})}
  function step(sec){video.currentTime=Math.max(0,video.currentTime+sec);record().operationCounts.step+=1;event(record(),'step',{seconds:sec})}
  function manual(side){const v=Math.round(video.currentTime*1000),r=record();if(side==='start')r.finalStartMs=v;else r.finalEndMs=v;r.operationCounts.manualBoundary+=1;r.snapSelections=null;directDirty=true;event(r,'manual_boundary',{side,timeMs:v});syncInputs();update()}
  function reset(){const r=record();r.finalStartMs=r.provisionalStartMs;r.finalEndMs=r.provisionalEndMs;r.snapSelections=null;r.operationCounts.reset+=1;directDirty=true;event(r,'reset');syncInputs();update()}
  function restore(){ensure();let idx=manifest.materials.findIndex(m=>state.sessions[m.fixtureId].status!=='complete');if(idx<0){materialIndex=manifest.materials.length-1;finishMaterial();return}materialIndex=idx;const s=session();if(s.status==='in_progress'){taskIndex=Math.max(0,tasks().findIndex(t=>state.tasks[t.id].status!=='complete'));loadTask()}else intro()}
  $('startMaterial').onclick=startMaterial;$('choosePublish').onclick=choosePublish;$('chooseSkip').onclick=()=>finish('skip');$('chooseUnknown').onclick=()=>finish('context_unknown');$('savePublish').onclick=()=>finish('publish');$('applyTime').onclick=applyDirect;$('preview').onclick=preview;$('reset').onclick=reset;$('setStart').onclick=()=>manual('start');$('setEnd').onclick=()=>manual('end');$('nextMaterial').onclick=()=>{materialIndex+=1;intro()};$('directStart').oninput=()=>{directDirty=true};$('directEnd').oninput=()=>{directDirty=true};$('notes').oninput=()=>{record().notes=$('notes').value;schedule()};document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>step(Number(b.dataset.step)));
  video.addEventListener('timeupdate',()=>{const ms=video.currentTime*1000;if((previewEndMs&&ms>=previewEndMs)||(snippetEndMs&&ms>=snippetEndMs)){video.pause();previewEndMs=null;snippetEndMs=null}update()});video.addEventListener('seeking',()=>{if(mode==='task'){record().operationCounts.seek+=1}});video.addEventListener('play',()=>{if(mode==='task'){record().operationCounts.playPause+=1;event(record(),'play')}});video.addEventListener('pause',()=>{if(mode==='task'){event(record(),'pause')}});
  document.addEventListener('visibilitychange',()=>{if(session().status!=='in_progress')return;if(document.hidden){flush();hiddenAt=Date.now();event(session(),'hidden')}else{if(hiddenAt){session().hiddenElapsedMs+=Date.now()-hiddenAt;hiddenAt=null}event(session(),'visible');resume()}});window.addEventListener('beforeunload',flush);setInterval(update,250);
  Promise.all([fetch('/api/manifest').then(r=>r.json()),fetch('/api/state').then(r=>r.json())]).then(([m,s])=>{manifest=m;state=s;ensure();restore()}).catch(e=>{document.body.textContent='読込失敗: '+e.message});
})();
</script>
</body></html>`;

async function main() {
  const [ranking, runManifest] = await Promise.all([readJson(rankingResultPath), readJson(rankingManifestPath)]);
  if (ranking.generationSystem !== 'candidate-ranking-v002@gemini-web-flash') throw new Error('ランキング系統不一致');
  const sourceByFixture = new Map(runManifest.fixtures.map((item) => [item.fixtureId, item.sourceOutputPath]));
  const tasks = [];
  const materials = [];
  for (const fixture of ranking.fixtures) {
    const sourcePath = sourceByFixture.get(fixture.fixtureId);
    if (!sourcePath) throw new Error(`テーマ生成元なし: ${fixture.fixtureId}`);
    const themeOutput = await readJson(path.join(evalRoot, sourcePath));
    const taskIds = [];
    for (const ranked of fixture.rankedCandidates) {
      const theme = themeOutput.themes[ranked.candidateId - 1];
      if (!theme || theme.title !== ranked.title) throw new Error(`候補対応不一致: ${fixture.fixtureId} ${ranked.candidateId}`);
      if (theme.evidenceRanges.length !== 1) throw new Error(`v002手直しは単一根拠範囲だけ: ${fixture.fixtureId} ${ranked.candidateId}`);
      const range = theme.evidenceRanges[0];
      const id = `${fixture.fixtureId}__candidate-${String(ranked.candidateId).padStart(3, '0')}`;
      taskIds.push(id);
      tasks.push({
        id,
        fixtureId: fixture.fixtureId,
        fixtureLabel: labels[fixture.fixtureId],
        sourceVideoId: range.sourceVideoId,
        rank: ranked.rank,
        candidateId: ranked.candidateId,
        title: ranked.title,
        reason: ranked.sourceReason,
        provisionalStartMs: range.sourceStartMs,
        provisionalEndMs: range.sourceEndMs,
        videoRoute: `/video/${range.sourceVideoId}`,
        rankingGenerationSystem: ranking.generationSystem,
        themeGenerationSystem: themeOutput.params?.generationSystem ?? 'theme-llm-v002@gemini-web-flash',
        sourceThemeOutputPath: sourcePath,
        provisionalSelection: 'theme evidence range resolved from supporting speech IDs'
      });
    }
    if (taskIds.length !== 5) throw new Error(`上位5件でない: ${fixture.fixtureId}`);
    materials.push({ fixtureId: fixture.fixtureId, label: labels[fixture.fixtureId], taskIds });
  }
  if (materials.length !== 2 || tasks.length !== 10) throw new Error(`対象数不一致 materials=${materials.length} tasks=${tasks.length}`);
  const manifest = {
    kind: 'human_boundary_trim_trial_manifest',
    version: 'human-boundary-trim-v002',
    preparedAt: new Date().toISOString(),
    reviewer: 'kawafmm',
    trialStatus: 'approved-awaiting-human',
    rankingGenerationSystem: ranking.generationSystem,
    taskOrder: 'candidate-ranking-v002 saved rank 1-5 per material',
    provisionalSelection: 'theme evidence range only; callback output not included',
    expectedBoundaryDataIncluded: false,
    previousHumanLabelsIncluded: false,
    callbackOutputIncluded: false,
    humanWorkEstimate: { materials: 2, candidatesPerMaterial: 5, maximumMinutesPerMaterial: 15, maximumTotalMinutes: 30 },
    choices: ['publish', 'skip', 'context_unknown'],
    materials,
    tasks
  };
  const humanVisibleCandidateData = JSON.stringify({ materials, tasks });
  if (/expectedCuts|targetExpected|humanLabel|answerLabel|callback-detection/i.test(humanVisibleCandidateData)) throw new Error('人間用候補データへ非表示情報が混入');
  const preflight = {
    kind: 'human_boundary_trim_trial_preflight',
    preparedAt: new Date().toISOString(),
    version: manifest.version,
    materialCount: materials.length,
    taskCount: tasks.length,
    allTasksSingleEvidenceRange: true,
    expectedBoundaryDataIncluded: false,
    previousHumanLabelsIncluded: false,
    callbackOutputIncluded: false,
    sourceVideos: [...new Set(tasks.map((item) => item.sourceVideoId))],
    sourceTranscriptsRequiredAtRuntime: true,
    newSttRequired: false,
    status: 'pass'
  };
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(preflightPath, `${JSON.stringify(preflight, null, 2)}\n`),
    writeFile(htmlPath, html)
  ]);
  console.log(JSON.stringify({ status: 'prepared', outputRoot: path.relative(root, outputRoot), materialCount: materials.length, taskCount: tasks.length }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
