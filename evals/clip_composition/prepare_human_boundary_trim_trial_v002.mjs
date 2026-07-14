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
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260713-trial-v002');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sttChunkDurationMs = 30_000;
const labels = {
  nOEWCNc77MI_multiblock_material_v001: 'マリン・ころね Raft',
  '9dtwF5Exu5w_multiblock_material_v001': 'マリン 野球ゲーム'
};
const transcriptPaths = {
  'YE-faluP7zY': path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'transcript.json'),
  o8rZAhARXAc: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'transcript.json')
};

function buildHtml(manifest) {
  const manifestJson = JSON.stringify(manifest).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>発話から公開範囲を選ぶ</title>
  <style>
    :root{color-scheme:dark;--bg:#0d1117;--panel:#161b22;--line:#30363d;--text:#f0f3f6;--muted:#a7b0bb;--blue:#58a6ff;--green:#2ea043;--yellow:#b18428;--purple:#7c4da0;--ai:#8b5cf6;--human:#238636}
    *{box-sizing:border-box}body{margin:0;padding:0 0 178px;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header,main{width:min(1060px,calc(100% - 28px));margin:auto}header{padding:22px 0 8px}h1{margin:0 0 8px;font-size:clamp(24px,4vw,36px)}h2{line-height:1.35}.guide,.card,.selection,.copy-panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:12px}.guide{line-height:1.65}.muted{color:var(--muted)}.topline{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}select,button,textarea{font:inherit}select{max-width:100%;color:var(--text);background:#21262d;border:1px solid #484f58;border-radius:9px;padding:9px}video{width:100%;max-height:50vh;background:#000;border-radius:12px}button{color:var(--text);background:#21262d;border:1px solid #484f58;border-radius:10px;padding:11px 14px;cursor:pointer}button:hover{border-color:var(--blue)}button.active{outline:3px solid var(--blue)}button:disabled{opacity:.4;cursor:not-allowed}.play-controls{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.play-status{min-height:1.5em;margin:8px 0 0}.selection{display:grid;grid-template-columns:1fr 1fr;gap:10px}.selection strong{display:block;margin-bottom:5px}.selection-text{line-height:1.6}.mode-controls,.context-controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.mode-controls button,.context-controls button{flex:1}.legend{display:flex;gap:18px;flex-wrap:wrap;margin:12px 0 4px}.swatch{display:inline-block;width:14px;height:14px;border-radius:3px;margin-right:5px;vertical-align:-2px}.swatch.ai{background:var(--ai)}.swatch.human{background:var(--human)}.transcript{display:grid;gap:10px;margin-top:12px;max-height:58vh;overflow:auto}.chunk{background:#10151c;border:1px solid var(--line);border-radius:11px;padding:10px}.chunk-title{margin-bottom:7px}.utterance{display:block;width:100%;text-align:left;line-height:1.65;margin:6px 0;background:#151b24}.utterance.ai-range{border-left:7px solid var(--ai)}.utterance.selected-range{background:#173523;border-color:#2d854a}.utterance.start{box-shadow:inset 4px 0 0 #75e19d}.utterance.end{box-shadow:inset -4px 0 0 #ffd071}.empty{padding:10px;color:var(--muted)}.copy-panel textarea{width:100%;min-height:240px;margin-top:10px;background:#0d1117;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px}.bottom{position:fixed;z-index:5;left:0;right:0;bottom:0;background:rgba(13,17,23,.97);border-top:1px solid var(--line);padding:11px 14px}.bottom-inner{width:min(1060px,100%);margin:auto}.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.publish{background:#1f6f3f}.skip{background:#765d1a}.unknown{background:#54376e}.nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}.nav button{min-width:110px}.hidden{display:none!important}@media(max-width:720px){body{padding-bottom:264px}.selection,.play-controls{grid-template-columns:1fr}.choices{grid-template-columns:1fr}.nav button{min-width:0;flex:1}}
    @media(max-width:720px){body{padding-bottom:178px}.choices{grid-template-columns:repeat(3,1fr)}.choices button{padding-left:5px;padding-right:5px}}
  </style>
</head>
<body>
  <header>
    <div class="topline"><div><h1>発話から公開範囲を選ぶ</h1><div id="progress" class="muted"></div></div><select id="jump"></select></div>
    <div class="guide"><strong>やること:</strong> AIが見つけた場面を見て、公開するならどの発話から始め、どの発話で終えるかを選びます。三択を決める前でも境界を選べます。発話を押しても動画は勝手に再生しません。前後が足りなければ30秒ずつ追加できます。時刻入力と時間計測はありません。</div>
  </header>
  <main>
    <section class="card"><div id="source" class="muted"></div><h2 id="title"></h2><p id="reason"></p></section>
    <section class="card"><video id="video" controls preload="metadata"></video><div class="play-controls"><button id="previewCandidate"></button><button id="previewSelection"></button></div><p id="playStatus" class="play-status muted">再生する範囲をボタンで選んでください。</p></section>
    <section class="card"><h2>開始と終了を発話から選ぶ</h2><p>最初に残す発話と、最後に残す発話を選びます。紫はAIの候補、緑はあなたが選んだ範囲です。</p><div class="selection"><div><strong>開始</strong><div id="startText" class="selection-text"></div></div><div><strong>終了</strong><div id="endText" class="selection-text"></div></div></div><div class="mode-controls"><button id="modeStart">開始する発話を選ぶ</button><button id="modeEnd">終了する発話を選ぶ</button></div><p id="modeGuide" class="muted"></p><div class="legend"><span><i class="swatch ai"></i>AIが見つけた場面</span><span><i class="swatch human"></i>自分で選んだ範囲</span></div><div class="context-controls"><button id="addBefore">前の30秒を追加</button><button id="addAfter">後ろの30秒を追加</button></div><p id="contextStatus" class="muted"></p><div id="transcript" class="transcript"><div class="empty">発話を読み込んでいます。</div></div></section>
    <section id="copyPanel" class="copy-panel hidden"><h2>確認結果</h2><p>「結果をコピー」を押して、そのままチャットへ貼り付けてください。「文章を選択しました」と出た場合だけ Command+C を押してください。コピー後も前へ戻って直せます。</p><button id="copy">結果をコピー</button><textarea id="output" readonly></textarea></section>
  </main>
  <div class="bottom"><div class="bottom-inner"><div class="choices"><button data-decision="publish" class="publish">公開する</button><button data-decision="skip" class="skip">選ばない</button><button data-decision="context_unknown" class="unknown">文脈不明</button></div><div class="nav"><button id="prev">前の候補</button><span id="status">未回答</span><button id="next">次の候補</button></div></div></div>
  <script>
    (async()=>{
      const manifest=${manifestJson};
      const items=manifest.tasks;
      const storageKey='zev-human-boundary-trim-v003-simple-context-v002';
      const labels={publish:'公開する',skip:'選ばない',context_unknown:'文脈不明'};
      const $=id=>document.getElementById(id);
      const video=$('video');
      const cache=new Map();
      let previewEndMs=null;
      let mode='start';
      let state={current:0,answers:{}};
      try{state={...state,...(JSON.parse(localStorage.getItem(storageKey))||{})}}catch{}
      function item(){return items[state.current]}
      function answer(t){if(!state.answers[t.id])state.answers[t.id]={decision:null,startId:null,endId:null,firstChunk:t.initialFirstChunk,lastChunk:t.initialLastChunk};return state.answers[t.id]}
      items.forEach(t=>{const a=answer(t);a.firstChunk=Number.isInteger(a.firstChunk)?Math.max(0,a.firstChunk):t.initialFirstChunk;a.lastChunk=Number.isInteger(a.lastChunk)?Math.min(t.sourceChunkCount-1,a.lastChunk):t.initialLastChunk});
      state.current=Math.min(Math.max(0,Number(state.current)||0),items.length-1);
      function save(){localStorage.setItem(storageKey,JSON.stringify(state))}
      function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
      function clock(ms){const total=Math.max(0,Math.floor(ms/1000)),m=Math.floor(total/60),s=total%60;return m+':'+String(s).padStart(2,'0')}
      function duration(ms){const total=Math.max(0,Math.round(ms/1000)),m=Math.floor(total/60),s=total%60;return m?m+'分'+(s?String(s)+'秒':''):total+'秒'}
      function key(t,n){return t.sourceVideoId+'::'+n}
      async function loadChunk(t,n){const k=key(t,n);if(!cache.has(k)){const response=await fetch('/api/transcript-chunk?sourceVideoId='+encodeURIComponent(t.sourceVideoId)+'&chunkIndex='+n);if(!response.ok)throw new Error('発話の読み込みに失敗しました');cache.set(k,await response.json())}return cache.get(k)}
      async function loadVisible(t,a){const jobs=[];for(let n=a.firstChunk;n<=a.lastChunk;n++)jobs.push(loadChunk(t,n));await Promise.all(jobs)}
      function chunks(t,a){const list=[];for(let n=a.firstChunk;n<=a.lastChunk;n++){const value=cache.get(key(t,n));if(value)list.push(value)}return list}
      function utterances(t,a){return chunks(t,a).flatMap(chunk=>chunk.utterances)}
      function byId(t,a,id){return utterances(t,a).find(row=>row.id===id)}
      function ensureSelection(t,a){const list=utterances(t,a);if(!list.length)return;let start=byId(t,a,a.startId),end=byId(t,a,a.endId);if(!start)start=list.find(row=>row.startMs<=t.provisionalStartMs&&row.endMs>=t.provisionalStartMs)||list.find(row=>row.endMs>=t.provisionalStartMs)||list[0];if(!end)end=[...list].reverse().find(row=>row.startMs<=t.provisionalEndMs&&row.endMs>=t.provisionalEndMs)||[...list].reverse().find(row=>row.startMs<=t.provisionalEndMs)||list.at(-1);a.startId=start.id;a.endId=end.id;if(start.startMs>end.startMs)a.endId=a.startId}
      function selected(t,a){return {start:byId(t,a,a.startId),end:byId(t,a,a.endId)}}
      function valid(t,a){if(!a.decision)return false;if(a.decision!=='publish')return true;const s=selected(t,a);return Boolean(s.start&&s.end&&s.start.startMs<=s.end.startMs)}
      function complete(){return items.every(t=>valid(t,answer(t)))}
      function boundaryText(row){return row?clock(row.startMs)+' 「'+row.text+'」':'未選択'}
      function play(startMs,endMs,label){video.currentTime=startMs/1000;previewEndMs=endMs;$('playStatus').textContent=label+'を再生中です。'+clock(endMs)+'で自動停止します。';video.play().catch(()=>{$('playStatus').textContent='再生を開始できませんでした。もう一度この再生ボタンを押してください。';previewEndMs=null})}
      function renderTranscript(t,a,preserveScroll){const area=$('transcript'),oldScroll=preserveScroll?area.scrollTop:0,s=selected(t,a);area.innerHTML=chunks(t,a).map(chunk=>'<div class="chunk"><div class="chunk-title muted">'+clock(chunk.startMs)+'〜'+clock(chunk.endMs)+'</div>'+(chunk.utterances.length?chunk.utterances.map(row=>{const ai=row.endMs>=t.provisionalStartMs&&row.startMs<=t.provisionalEndMs,chosen=s.start&&s.end&&row.endMs>=s.start.startMs&&row.startMs<=s.end.endMs;return '<button class="utterance '+(ai?'ai-range ':'')+(chosen?'selected-range ':'')+(row.id===a.startId?'start ':'')+(row.id===a.endId?'end':'')+'" data-utterance="'+row.id+'"><span class="muted">'+clock(row.startMs)+'</span>　'+esc(row.text)+'</button>'}).join(''):'<div class="empty">この30秒に発話なし</div>')+'</div>').join('');area.scrollTop=oldScroll;area.querySelectorAll('[data-utterance]').forEach(button=>button.onclick=async()=>{const row=byId(t,a,button.dataset.utterance),s0=selected(t,a);if(mode==='start'){a.startId=row.id;if(s0.end&&row.startMs>s0.end.startMs)a.endId=row.id;mode='end'}else{a.endId=row.id;if(s0.start&&row.startMs<s0.start.startMs)a.startId=row.id}save();await renderCurrent(true)})}
      function buildOutput(){const lines=['手直し試験v002 / UI v003 発話境界選択結果','確認者: kawafmm',''];items.forEach((t,index)=>{const a=answer(t);lines.push('確認'+(index+1)+': '+labels[a.decision]+' / '+t.fixtureId+' / candidate '+t.candidateId+' / '+t.title);if(a.decision==='publish'){const s=selected(t,a);lines.push('開始: '+s.start.startMs+'ms / '+s.start.text);lines.push('終了: '+s.end.endMs+'ms / '+s.end.text)}});return lines.join('\\n')}
      async function renderCurrent(preserveScroll=false){const t=item(),a=answer(t);await loadVisible(t,a);ensureSelection(t,a);const s=selected(t,a);$('progress').textContent=(state.current+1)+' / '+items.length+'　回答済み '+items.filter(x=>answer(x).decision).length+'件';$('jump').value=String(state.current);$('source').textContent=t.fixtureLabel+' / '+t.rank+'位 / candidate '+t.candidateId;$('title').textContent=t.title;$('reason').textContent=t.reason;if(video.dataset.source!==t.videoRoute){video.dataset.source=t.videoRoute;video.src=t.videoRoute;video.onloadedmetadata=()=>{video.currentTime=t.provisionalStartMs/1000}}$('startText').textContent=boundaryText(s.start);$('endText').textContent=boundaryText(s.end);$('modeStart').classList.toggle('active',mode==='start');$('modeEnd').classList.toggle('active',mode==='end');$('modeGuide').textContent=mode==='start'?'開始にしたい発話を押してください。選ぶと終了選択へ移ります。動画は再生されません。':'最後に残したい発話を押してください。動画は再生されません。';$('previewCandidate').textContent='AIが見つけた場面を再生（'+duration(t.provisionalEndMs-t.provisionalStartMs)+'）';$('previewSelection').textContent='自分で選んだ範囲を再生（'+duration(s.end.endMs-s.start.startMs)+'）';$('addBefore').disabled=a.firstChunk===0;$('addAfter').disabled=a.lastChunk===t.sourceChunkCount-1;$('contextStatus').textContent='現在は '+clock(a.firstChunk*manifest.contextChunkDurationMs)+'〜'+clock(Math.min(t.sourceDurationMs,(a.lastChunk+1)*manifest.contextChunkDurationMs))+' の発話を表示中。必要なら前後を30秒ずつ追加できます。';renderTranscript(t,a,preserveScroll);document.querySelectorAll('[data-decision]').forEach(button=>button.classList.toggle('active',button.dataset.decision===a.decision));$('status').textContent=a.decision?labels[a.decision]:'未回答';$('prev').disabled=state.current===0;$('next').disabled=state.current===items.length-1;$('copyPanel').classList.toggle('hidden',!complete());if(complete())$('output').value=buildOutput();save()}
      $('jump').innerHTML=items.map((t,index)=>'<option value="'+index+'">確認'+(index+1)+': '+esc(t.title)+'</option>').join('');
      $('jump').onchange=async()=>{state.current=Number($('jump').value);mode='start';save();await renderCurrent()};
      $('modeStart').onclick=async()=>{mode='start';await renderCurrent(true)};
      $('modeEnd').onclick=async()=>{mode='end';await renderCurrent(true)};
      document.querySelectorAll('[data-decision]').forEach(button=>button.onclick=async()=>{answer(item()).decision=button.dataset.decision;save();await renderCurrent(true)});
      $('prev').onclick=async()=>{state.current=Math.max(0,state.current-1);mode='start';save();await renderCurrent();window.scrollTo({top:0,behavior:'smooth'})};
      $('next').onclick=async()=>{state.current=Math.min(items.length-1,state.current+1);mode='start';save();await renderCurrent();window.scrollTo({top:0,behavior:'smooth'})};
      $('addBefore').onclick=async()=>{const a=answer(item());if(a.firstChunk>0)a.firstChunk--;save();await renderCurrent(true)};
      $('addAfter').onclick=async()=>{const t=item(),a=answer(t);if(a.lastChunk<t.sourceChunkCount-1)a.lastChunk++;save();await renderCurrent(true)};
      $('previewCandidate').onclick=()=>play(item().provisionalStartMs,item().provisionalEndMs,'AIの場面');
      $('previewSelection').onclick=()=>{const t=item(),s=selected(t,answer(t));play(s.start.startMs,s.end.endMs,'選択範囲')};
      $('copy').onclick=()=>{const text=buildOutput(),output=$('output'),button=$('copy');output.value=text;output.focus();output.select();let copied=false;try{copied=document.execCommand('copy')}catch{}button.textContent=copied?'コピーしました':'文章を選択しました';if(!copied&&navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>{button.textContent='コピーしました'}).catch(()=>{})};
      video.addEventListener('timeupdate',()=>{if(previewEndMs!==null&&video.currentTime*1000>=previewEndMs){video.pause();previewEndMs=null;$('playStatus').textContent='指定した範囲の終わりで停止しました。'}});
      video.addEventListener('pause',()=>{if(previewEndMs!==null)$('playStatus').textContent='一時停止中です。'});
      await renderCurrent();
    })().catch(error=>{document.getElementById('transcript').innerHTML='<div class="empty">'+String(error.message)+'</div>'});
  </script>
</body>
</html>`;
}

function verifyHtmlContract(html) {
  const required = [
    '三択を決める前でも境界を選べます',
    '発話を押しても動画は勝手に再生しません',
    'id="addBefore"',
    'id="addAfter"',
    'id="previewCandidate"',
    'id="previewSelection"',
    'data-utterance'
  ];
  for (const text of required) {
    if (!html.includes(text)) throw new Error(`UX契約の必須要素なし: ${text}`);
  }
  const forbidden = [
    'id="boundaryPanel" class="card hidden"',
    'Date.now(',
    'performance.',
    'elapsedMs',
    'wallClock'
  ];
  for (const text of forbidden) {
    if (html.includes(text)) throw new Error(`UX契約の禁止要素あり: ${text}`);
  }
  const selectionStart = html.indexOf("area.querySelectorAll('[data-utterance]')");
  const selectionEnd = html.indexOf('function buildOutput', selectionStart);
  if (selectionStart < 0 || selectionEnd < 0) throw new Error('発話選択処理を検査できない');
  if (html.slice(selectionStart, selectionEnd).includes('play(')) throw new Error('発話選択に暗黙再生が混入');
}

async function main() {
  const [ranking, runManifest] = await Promise.all([
    readJson(path.join(rankingRoot, 'result.json')),
    readJson(path.join(rankingRoot, 'run-manifest.json'))
  ]);
  if (ranking.generationSystem !== 'candidate-ranking-v002@gemini-web-flash') throw new Error('ランキング系統不一致');
  const sourceByFixture = new Map(runManifest.fixtures.map((entry) => [entry.fixtureId, entry.sourceOutputPath]));
  const transcriptCache = new Map();
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
      if (theme.evidenceRanges.length !== 1) throw new Error(`単一根拠範囲でない: ${fixture.fixtureId} ${ranked.candidateId}`);
      const range = theme.evidenceRanges[0];
      const transcriptPath = transcriptPaths[range.sourceVideoId];
      if (!transcriptPath) throw new Error(`STT対応なし: ${range.sourceVideoId}`);
      if (!transcriptCache.has(transcriptPath)) transcriptCache.set(transcriptPath, await readJson(transcriptPath));
      const transcript = transcriptCache.get(transcriptPath);
      const firstCandidateChunk = Math.floor(range.sourceStartMs / sttChunkDurationMs);
      const lastCandidateChunk = Math.floor(Math.max(range.sourceStartMs, range.sourceEndMs - 1) / sttChunkDurationMs);
      const id = `${fixture.fixtureId}__candidate-${String(ranked.candidateId).padStart(3, '0')}`;
      taskIds.push(id);
      tasks.push({
        id,
        fixtureId: fixture.fixtureId,
        fixtureLabel: labels[fixture.fixtureId],
        sourceVideoId: range.sourceVideoId,
        sourceChunkCount: transcript.fullChunkCount,
        sourceDurationMs: Math.round(transcript.originalDurationSec * 1000),
        initialFirstChunk: Math.max(0, firstCandidateChunk - 1),
        initialLastChunk: Math.min(transcript.fullChunkCount - 1, lastCandidateChunk + 1),
        rank: ranked.rank,
        candidateId: ranked.candidateId,
        title: ranked.title,
        reason: ranked.sourceReason,
        provisionalStartMs: range.sourceStartMs,
        provisionalEndMs: range.sourceEndMs,
        videoRoute: `/video/${range.sourceVideoId}`
      });
    }
    materials.push({ fixtureId: fixture.fixtureId, label: labels[fixture.fixtureId], taskIds });
  }
  if (materials.length !== 2 || tasks.length !== 10 || materials.some((entry) => entry.taskIds.length !== 5)) throw new Error('対象数不一致');
  const manifest = {
    kind: 'human_boundary_trim_simple_utterance_context_manifest',
    version: 'human-boundary-trim-v003-simple-context-v002',
    reviewer: 'kawafmm',
    priorProgress: 'invalid_old_ui_not_loaded',
    serverPersistence: false,
    resultDelivery: 'copy_to_chat',
    boundaryInput: 'select_complete_utterances',
    contextChunkDurationMs: sttChunkDurationMs,
    initialAdjacentContextChunks: 1,
    contextExpansion: 'repeat_to_source_edges',
    boundaryEditorAlwaysVisible: true,
    decisionUnlocksBoundaryEditor: false,
    autoplayOnBoundarySelection: false,
    interactionTimingRecorded: false,
    htmlContractVerified: true,
    expectedBoundaryDataIncluded: false,
    previousHumanLabelsIncluded: false,
    callbackOutputIncluded: false,
    materials,
    tasks
  };
  const visible = JSON.stringify({ materials, tasks });
  if (/expectedCuts|targetExpected|humanLabel|answerLabel|callback-detection/i.test(visible)) throw new Error('人間用データへ非表示情報が混入');
  const preflight = {
    kind: 'human_boundary_trim_simple_utterance_context_preflight',
    version: manifest.version,
    materialCount: materials.length,
    taskCount: tasks.length,
    completeUtteranceSelection: true,
    boundaryEditorAlwaysVisible: true,
    decisionUnlocksBoundaryEditor: false,
    explicitPlaybackOnly: true,
    initialAdjacentContextChunks: 1,
    contextExpansionToSourceEdges: true,
    resultCopy: true,
    serverPersistence: false,
    interactionTimingRecorded: false,
    htmlContractVerified: true,
    priorProgressLoaded: false,
    expectedBoundaryDataIncluded: false,
    previousHumanLabelsIncluded: false,
    callbackOutputIncluded: false,
    newSttRequired: false,
    status: 'pass'
  };
  await mkdir(outputRoot, { recursive: true });
  const html = buildHtml(manifest);
  verifyHtmlContract(html);
  await Promise.all([
    writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(outputRoot, 'preflight.json'), `${JSON.stringify(preflight, null, 2)}\n`),
    writeFile(path.join(outputRoot, 'index.html'), html)
  ]);
  console.log(JSON.stringify({ status: 'prepared', materialCount: materials.length, taskCount: tasks.length, uiVersion: manifest.version }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
