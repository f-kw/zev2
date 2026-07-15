#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
  return current;
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const rankingRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260716-third-material-run1-v002');
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260716-third-material-trial-v002');
const thirdThemePath = path.join(evalRoot, 'outputs', 'theme-generation', 'nE_bNeBNp4E_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260715-chat-velocity-top100-third-material-v001', 'run-01-gemini-output.json');
const bThemePath = path.join(evalRoot, 'outputs', 'theme-generation', 'nOEWCNc77MI_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260711-chat-velocity-top100-v001', 'run-01-gemini-output.json');
const generalizationThemePath = path.join(evalRoot, 'outputs', 'theme-generation', '9dtwF5Exu5w_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260712-chat-velocity-top100-generalization-v001', 'run-01-gemini-output.json');
const transcriptPaths = {
  qdczJpv8RCc: path.join(evalRoot, 'stt', 'nE_bNeBNp4E_qdczJpv8RCc_local30_v001', 'source', 'transcript.json'),
  'YE-faluP7zY': path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'transcript.json'),
  o8rZAhARXAc: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'transcript.json')
};
const videoPaths = {
  qdczJpv8RCc: path.join(evalRoot, 'research', 'downloads', 'nE_bNeBNp4E', 'sources', 'qdczJpv8RCc', 'qdczJpv8RCc.mp4'),
  'YE-faluP7zY': path.join(evalRoot, 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4'),
  o8rZAhARXAc: path.join(evalRoot, 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')
};
const chunkDurationMs = 30_000;
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

function escapedJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function buildSessionHtml(session) {
  const page = {
    sessionId: session.sessionId,
    sessionNumber: session.sessionNumber,
    totalSessions: 2,
    tasks: session.tasks.map((task, index) => ({
      displayNumber: index + 1,
      id: task.id,
      fixtureId: task.fixtureId,
      candidateId: task.candidateId,
      title: task.title,
      reason: task.reason,
      sourceVideoId: task.sourceVideoId,
      sourceChunkCount: task.sourceChunkCount,
      sourceDurationMs: task.sourceDurationMs,
      initialFirstChunk: task.initialFirstChunk,
      initialLastChunk: task.initialLastChunk,
      provisionalStartMs: task.provisionalStartMs,
      provisionalEndMs: task.provisionalEndMs,
      videoRoute: `/video/${task.sourceVideoId}`
    }))
  };
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>第三素材 手直し確認 ${session.sessionNumber}/2</title>
  <style>
    :root{color-scheme:dark;--bg:#0d1117;--panel:#161b22;--line:#30363d;--text:#f0f3f6;--muted:#a7b0bb;--blue:#58a6ff;--green:#2ea043;--purple:#8b5cf6;--yellow:#b18428;--red:#7a3333}
    *{box-sizing:border-box}body{margin:0;padding:0 0 168px;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header,main{width:min(1040px,calc(100% - 24px));margin:auto}header{padding:14px 0 2px}h1{margin:0 0 6px;font-size:clamp(23px,4vw,34px)}h2{line-height:1.35}.guide,.card,.copy-panel{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:13px;margin-top:9px}.guide{line-height:1.55;border-left:5px solid var(--blue);padding-left:11px}.guide p{margin:5px 0}.muted{color:var(--muted)}.topline{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}select,button,textarea{font:inherit}select{max-width:100%;color:var(--text);background:#21262d;border:1px solid #484f58;border-radius:9px;padding:9px}video{display:block;width:100%;height:auto;max-height:min(38vh,420px);object-fit:contain;background:#000;border-radius:11px}.play-controls{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}.play-status{min-height:1.4em;margin:7px 0 0}.selection{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.selection>div{background:#10151c;border:1px solid var(--line);border-radius:10px;padding:10px}.selection strong{display:block;margin-bottom:4px}.selection-text{line-height:1.55;word-break:break-word}.mode-controls,.context-controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.mode-controls button,.context-controls button{flex:1}button{color:var(--text);background:#21262d;border:1px solid #484f58;border-radius:9px;padding:10px 13px;cursor:pointer}button:hover{border-color:var(--blue)}button.active{outline:3px solid var(--blue)}button:disabled{opacity:.42;cursor:not-allowed}.legend{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0 4px}.swatch{display:inline-block;width:13px;height:13px;border-radius:3px;margin-right:5px;vertical-align:-2px}.swatch.ai{background:var(--purple)}.swatch.human{background:var(--green)}.transcript{display:grid;gap:9px;margin-top:10px;max-height:52vh;overflow:auto}.chunk{background:#10151c;border:1px solid var(--line);border-radius:10px;padding:10px}.chunk-title{margin-bottom:6px}.utterance{display:block;line-height:2.1;margin:6px 0;padding:5px 7px;border-left:4px solid transparent;background:#141a22;border-radius:7px;word-break:break-word}.utterance.ai-range{border-left-color:var(--purple)}.token{display:inline;padding:3px 1px;border-radius:3px;cursor:pointer;outline:none}.token:hover,.token:focus{background:#274566}.token.ai-token{box-shadow:inset 0 -2px 0 var(--purple)}.token.selected-token{background:#205d36}.token.start-token{outline:2px solid #7ee2a8}.token.end-token{outline:2px solid #ffd071}.copy-panel textarea{width:100%;min-height:260px;margin-top:9px;background:#0d1117;color:var(--text);border:1px solid var(--line);border-radius:9px;padding:10px}.bottom{position:fixed;z-index:5;left:0;right:0;bottom:0;background:rgba(13,17,23,.98);border-top:1px solid var(--line);padding:10px 12px}.bottom-inner{width:min(1040px,100%);margin:auto}.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.choices [data-decision="publish"]{background:#1f6f3f}.choices [data-decision="skip"]{background:var(--red)}.choices [data-decision="context_unknown"]{background:#593777}.nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px}.nav button{min-width:120px}.hidden{display:none!important}.error{color:#ff9b9b}@media(max-width:720px){body{padding-bottom:218px}.selection,.play-controls{grid-template-columns:1fr}.choices button{font-size:13px;padding:9px 4px}.nav button{min-width:0;flex:1}video{max-height:32vh}}
  </style>
</head>
<body>
  <header>
    <div class="topline"><div><h1>手直し確認 ${session.sessionNumber}/2</h1><div id="progress" class="muted"></div></div><select id="jump"></select></div>
    <div class="guide"><p><strong>見る観点:</strong> AIの場面の前後を発話で調整し、同じ場面内の無音や不要部分を切れば公開候補になるか。</p><p><strong>三択:</strong> 場面内の編集で使える／選ばない／離れた別場面の文脈が必要。前後30秒は境界確認用で、単純延長を正解にしません。</p><p><strong>境界:</strong> 全文中で、開始は始めたい言葉の最初、終了は最後に残す言葉の最後を押します。単語の途中は選ばないでください。文字を押しても再生しません。時刻はHH:MM:SS。画面は時間を自動計測せず、回答をサーバーへ保存しません。</p></div>
  </header>
  <main>
    <section class="card"><div id="source" class="muted"></div><h2 id="title"></h2><p id="reason"></p></section>
    <section class="card"><video id="video" controls preload="metadata"></video><div class="play-controls"><button id="previewCandidate"></button><button id="previewSelection"></button></div><p id="playStatus" class="play-status muted">再生する範囲をボタンで選んでください。</p></section>
    <section class="card"><h2>開始と終了を全文の中から選ぶ</h2><div class="selection"><div><strong>開始</strong><div id="startText" class="selection-text"></div></div><div><strong>終了</strong><div id="endText" class="selection-text"></div></div></div><div class="mode-controls"><button id="modeStart">開始位置を選ぶ</button><button id="modeEnd">終了位置を選ぶ</button></div><p id="modeGuide" class="muted"></p><div class="legend"><span><i class="swatch ai"></i>AIの場面</span><span><i class="swatch human"></i>現在選択中</span></div><div class="context-controls"><button id="addBefore">前の30秒を表示</button><button id="addAfter">後ろの30秒を表示</button></div><p id="contextStatus" class="muted"></p><div id="transcript" class="transcript"><div class="muted">発話を読み込んでいます。</div></div></section>
    <section id="copyPanel" class="copy-panel hidden"><h2>このセッションの結果</h2><p>結果をコピーして、そのままチャットへ貼ってください。コピー後も前へ戻って修正できます。次のセッションへは自動で進みません。</p><button id="copy">結果をコピー</button><textarea id="output" readonly></textarea></section>
  </main>
  <div class="bottom"><div class="bottom-inner"><div class="choices"><button data-decision="publish">区間内編集で公開候補</button><button data-decision="skip">選ばない</button><button data-decision="context_unknown">別場面の文脈が必要</button></div><div class="nav"><button id="prev">前の候補</button><span id="status">未回答</span><button id="next">次の候補</button></div></div></div>
  <script>
    (async()=>{
      const page=${escapedJson(page)};
      const items=page.tasks;
      const storageKey='zev-third-material-hand-trim-human-v001-'+page.sessionId;
      const labels={publish:'区間内編集で公開候補',skip:'選ばない',context_unknown:'文脈不明（別場面が必要）'};
      const $=id=>document.getElementById(id);
      const video=$('video');
      const cache=new Map();
      let previewEndMs=null;
      let mode='start';
      let state={current:0,answers:{}};
      try{state={...state,...(JSON.parse(localStorage.getItem(storageKey))||{})}}catch{}
      function item(){return items[state.current]}
      function answer(task){if(!state.answers[task.id])state.answers[task.id]={decision:null,startId:null,endId:null,firstChunk:task.initialFirstChunk,lastChunk:task.initialLastChunk};return state.answers[task.id]}
      items.forEach(task=>{const a=answer(task);a.firstChunk=Number.isInteger(a.firstChunk)?Math.max(0,a.firstChunk):task.initialFirstChunk;a.lastChunk=Number.isInteger(a.lastChunk)?Math.min(task.sourceChunkCount-1,a.lastChunk):task.initialLastChunk});
      state.current=Math.min(Math.max(0,Number(state.current)||0),items.length-1);
      function save(){localStorage.setItem(storageKey,JSON.stringify(state))}
      function esc(value){return String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}
      function clock(ms){const total=Math.max(0,Math.floor(ms/1000)),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
      function duration(ms){const total=Math.max(0,Math.round(ms/1000)),m=Math.floor(total/60),s=total%60;return m?m+'分'+(s?String(s)+'秒':''):total+'秒'}
      function chunkKey(task,index){return task.sourceVideoId+'::'+index}
      async function loadChunk(task,index){const key=chunkKey(task,index);if(!cache.has(key)){const response=await fetch('/api/transcript-chunk?sourceVideoId='+encodeURIComponent(task.sourceVideoId)+'&chunkIndex='+index);if(!response.ok)throw new Error('発話の読み込みに失敗しました');cache.set(key,await response.json())}return cache.get(key)}
      async function loadVisible(task,a){const jobs=[];for(let index=a.firstChunk;index<=a.lastChunk;index++)jobs.push(loadChunk(task,index));await Promise.all(jobs)}
      function chunks(task,a){const list=[];for(let index=a.firstChunk;index<=a.lastChunk;index++){const value=cache.get(chunkKey(task,index));if(value)list.push(value)}return list}
      function utterances(task,a){return chunks(task,a).flatMap(chunk=>chunk.utterances)}
      function words(task,a){return utterances(task,a).flatMap(utterance=>utterance.words).sort((left,right)=>left.startMs-right.startMs||left.endMs-right.endMs)}
      function wordById(task,a,id){return words(task,a).find(word=>word.id===id)}
      function ensureSelection(task,a){const list=words(task,a);if(!list.length)return;let start=wordById(task,a,a.startId),end=wordById(task,a,a.endId);if(!start)start=list.find(word=>word.endMs>=task.provisionalStartMs)||list[0];if(!end)end=[...list].reverse().find(word=>word.startMs<=task.provisionalEndMs)||list.at(-1);a.startId=start.id;a.endId=end.id;if(start.startMs>end.startMs)a.endId=a.startId}
      function selected(task,a){return {start:wordById(task,a,a.startId),end:wordById(task,a,a.endId)}}
      function valid(task,a){if(!a.decision)return false;if(a.decision!=='publish')return true;const value=selected(task,a);return Boolean(value.start&&value.end&&value.start.startMs<=value.end.startMs)}
      function complete(){return items.every(task=>valid(task,answer(task)))}
      function utteranceForWord(task,a,wordId){return utterances(task,a).find(utterance=>utterance.words.some(word=>word.id===wordId))}
      function markedBoundaryText(task,a,word,kind){if(!word)return'未選択';const utterance=utteranceForWord(task,a,word.id);if(!utterance)return clock(word.startMs)+' 「'+word.text+'」';const position=utterance.words.findIndex(item=>item.id===word.id);const before=utterance.words.slice(0,position).map(item=>item.text).join('');const selectedText=utterance.words[position].text;const after=utterance.words.slice(position+1).map(item=>item.text).join('');const marker=kind==='start'?'【開始】':'【終了】';const text=kind==='start'?before+marker+selectedText+after:before+selectedText+marker+after;return clock(kind==='start'?word.startMs:word.endMs)+' 「'+text+'」'}
      function setVideoTask(task){if(video.dataset.source===task.videoRoute)return;video.dataset.source=task.videoRoute;video.src=task.videoRoute;video.load()}
      function playRange(startMs,endMs,label){const status=()=>{$('playStatus').textContent=label+' '+clock(startMs)+'〜'+clock(endMs)+'（'+duration(endMs-startMs)+'）を再生中。'+clock(endMs)+'で停止します。'};const fail=()=>{$('playStatus').textContent='再生を開始できませんでした。同じ再生ボタンをもう一度押してください。';previewEndMs=null};previewEndMs=endMs;status();if(video.readyState>=1){video.currentTime=startMs/1000;video.play().catch(fail);return}video.addEventListener('loadedmetadata',()=>{video.currentTime=startMs/1000},{once:true});video.play().catch(fail)}
      function renderTranscript(task,a,preserveScroll){const area=$('transcript'),oldScroll=preserveScroll?area.scrollTop:0,selection=selected(task,a);area.innerHTML=chunks(task,a).map(chunk=>'<div class="chunk"><div class="chunk-title muted">'+clock(chunk.startMs)+'〜'+clock(chunk.endMs)+'</div>'+chunk.utterances.map(utterance=>{const ai=utterance.endMs>=task.provisionalStartMs&&utterance.startMs<=task.provisionalEndMs;const tokens=utterance.words.map(word=>{const inAi=word.endMs>=task.provisionalStartMs&&word.startMs<=task.provisionalEndMs;const chosen=selection.start&&selection.end&&word.endMs>=selection.start.startMs&&word.startMs<=selection.end.endMs;const classes=['token',inAi?'ai-token':'',chosen?'selected-token':'',word.id===a.startId?'start-token':'',word.id===a.endId?'end-token':''].filter(Boolean).join(' ');return '<span role="button" tabindex="0" class="'+classes+'" data-word="'+esc(word.id)+'" title="'+clock(word.startMs)+'">'+esc(word.text)+'</span>'}).join('');return '<div class="utterance '+(ai?'ai-range':'')+'">'+tokens+'</div>'}).join('')+'</div>').join('');area.scrollTop=oldScroll;const selectWord=async id=>{const word=wordById(task,a,id),current=selected(task,a);if(!word)return;if(mode==='start'){a.startId=word.id;if(current.end&&word.startMs>current.end.startMs)a.endId=word.id;mode='end'}else{a.endId=word.id;if(current.start&&word.startMs<current.start.startMs)a.startId=word.id}save();await renderCurrent(true)};area.querySelectorAll('[data-word]').forEach(token=>{token.onclick=()=>selectWord(token.dataset.word);token.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectWord(token.dataset.word)}}})}
      function resultLines(){const lines=['第三素材 手直し試験v002 / '+page.sessionId+' 結果','確認者: kawafmm',''];items.forEach((task,index)=>{const a=answer(task);lines.push('確認'+(index+1)+': '+labels[a.decision]+' / '+task.fixtureId+' / candidate '+task.candidateId+' / '+task.title);if(a.decision==='publish'){const selection=selected(task,a);lines.push('開始: '+markedBoundaryText(task,a,selection.start,'start')+' / '+selection.start.startMs+'ms');lines.push('終了: '+markedBoundaryText(task,a,selection.end,'end')+' / '+selection.end.endMs+'ms')}});return lines}
      async function renderCurrent(preserveScroll=false){const task=item(),a=answer(task);setVideoTask(task);await loadVisible(task,a);ensureSelection(task,a);const selection=selected(task,a);$('progress').textContent='セッション '+page.sessionNumber+'/'+page.totalSessions+'　確認 '+(state.current+1)+'/'+items.length+'　回答済み '+items.filter(value=>answer(value).decision).length+'件';$('jump').value=String(state.current);$('source').textContent='確認'+(state.current+1)+' / '+items.length;$('title').textContent=task.title;$('reason').textContent=task.reason;$('startText').textContent=markedBoundaryText(task,a,selection.start,'start');$('endText').textContent=markedBoundaryText(task,a,selection.end,'end');$('modeStart').classList.toggle('active',mode==='start');$('modeEnd').classList.toggle('active',mode==='end');$('modeGuide').textContent=mode==='start'?'始めたい言葉の最初の文字を、全文の中から押してください。次に終了選択へ移ります。':'最後に残す言葉の最後の文字を、全文の中から押してください。';$('previewCandidate').textContent='AIの場面を再生 '+clock(task.provisionalStartMs)+'〜'+clock(task.provisionalEndMs)+'（'+duration(task.provisionalEndMs-task.provisionalStartMs)+'）';$('previewSelection').textContent='選んだ範囲を再生 '+clock(selection.start.startMs)+'〜'+clock(selection.end.endMs)+'（'+duration(selection.end.endMs-selection.start.startMs)+'）';$('addBefore').disabled=a.firstChunk===0;$('addAfter').disabled=a.lastChunk===task.sourceChunkCount-1;$('contextStatus').textContent='現在表示: '+clock(a.firstChunk*${chunkDurationMs})+'〜'+clock(Math.min(task.sourceDurationMs,(a.lastChunk+1)*${chunkDurationMs}))+'。追加尺は見るコストになるため、必要情報の確認にだけ使ってください。';renderTranscript(task,a,preserveScroll);document.querySelectorAll('[data-decision]').forEach(button=>button.classList.toggle('active',button.dataset.decision===a.decision));$('status').textContent=a.decision?labels[a.decision]:'未回答';$('prev').disabled=state.current===0;$('next').disabled=state.current===items.length-1;$('copyPanel').classList.toggle('hidden',!complete());if(complete())$('output').value=resultLines().join('\\n');save()}
      $('jump').innerHTML=items.map((task,index)=>'<option value="'+index+'">確認'+(index+1)+': '+esc(task.title)+'</option>').join('');
      $('jump').onchange=async()=>{state.current=Number($('jump').value);mode='start';save();await renderCurrent()};
      $('modeStart').onclick=async()=>{mode='start';await renderCurrent(true)};
      $('modeEnd').onclick=async()=>{mode='end';await renderCurrent(true)};
      document.querySelectorAll('[data-decision]').forEach(button=>button.onclick=async()=>{answer(item()).decision=button.dataset.decision;save();await renderCurrent(true)});
      $('prev').onclick=async()=>{state.current=Math.max(0,state.current-1);mode='start';save();await renderCurrent();window.scrollTo({top:0,behavior:'smooth'})};
      $('next').onclick=async()=>{state.current=Math.min(items.length-1,state.current+1);mode='start';save();const task=item();setVideoTask(task);playRange(task.provisionalStartMs,task.provisionalEndMs,'次のAI場面');await renderCurrent();window.scrollTo({top:0,behavior:'smooth'})};
      $('addBefore').onclick=async()=>{const a=answer(item());if(a.firstChunk>0)a.firstChunk--;save();await renderCurrent(true)};
      $('addAfter').onclick=async()=>{const task=item(),a=answer(task);if(a.lastChunk<task.sourceChunkCount-1)a.lastChunk++;save();await renderCurrent(true)};
      $('previewCandidate').onclick=()=>playRange(item().provisionalStartMs,item().provisionalEndMs,'AIの場面');
      $('previewSelection').onclick=()=>{const task=item(),selection=selected(task,answer(task));playRange(selection.start.startMs,selection.end.endMs,'選んだ範囲')};
      $('copy').onclick=()=>{const text=resultLines().join('\\n'),output=$('output'),button=$('copy');output.value=text;output.focus();output.select();let copied=false;try{copied=document.execCommand('copy')}catch{}button.textContent=copied?'コピーしました':'文章を選択しました';if(!copied&&navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>{button.textContent='コピーしました'}).catch(()=>{})};
      video.addEventListener('timeupdate',()=>{if(previewEndMs!==null&&video.currentTime*1000>=previewEndMs){video.pause();previewEndMs=null;$('playStatus').textContent='指定した終点で停止しました。'}});
      video.addEventListener('pause',()=>{if(previewEndMs!==null)$('playStatus').textContent='一時停止中です。'});
      await renderCurrent();
    })().catch(error=>{document.getElementById('transcript').innerHTML='<div class="error">'+String(error.message)+'</div>'});
  </script>
</body>
</html>`;
}

function verifyHtml(html, expectedTaskCount) {
  const required = [
    '区間内編集で公開候補',
    '別場面の文脈が必要',
    '単語の途中は選ばないでください',
    '時間を自動計測せず',
    'max-height:min(38vh,420px)',
    'object-fit:contain',
    'data-word=',
    '次のAI場面',
    'HH:MM:SS',
    '結果をコピー',
    '回答済み '
  ];
  for (const token of required) {
    if (!html.includes(token)) throw new Error(`UI契約の必須要素がありません: ${token}`);
  }
  const forbidden = ['Date.now(', 'performance.', 'elapsedMs', 'startedAt', 'completedAt', 'priorDecision', 'known-hit', 'expectedCuts'];
  for (const token of forbidden) {
    if (html.includes(token)) throw new Error(`UIへ禁止情報または不要計測が混入: ${token}`);
  }
  const wordHandlerStart = html.indexOf("area.querySelectorAll('[data-word]')");
  const wordHandlerEnd = html.indexOf('function resultLines', wordHandlerStart);
  if (wordHandlerStart < 0 || wordHandlerEnd < 0) throw new Error('文字位置選択処理を検査できません');
  if (html.slice(wordHandlerStart, wordHandlerEnd).includes('playRange(')) throw new Error('文字位置選択に暗黙再生が混入しています');
}

function buildLanding() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第三素材 手直し試験</title><style>:root{color-scheme:dark}body{max-width:760px;margin:40px auto;padding:0 18px;background:#0d1117;color:#f0f3f6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7}.card{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:18px;margin:14px 0}a{display:block;background:#1f6f3f;color:#fff;text-decoration:none;padding:13px;border-radius:10px;text-align:center;font-weight:700}.muted{color:#a7b0bb}</style></head><body><h1>第三素材 手直し試験</h1><div class="card"><h2>セッション1</h2><p>5件です。第三素材の上位3件と、回答の再現性だけを見る既判定2件を、ラベルなしで混ぜています。</p><a href="/session-1/">セッション1を開く</a></div><div class="card"><h2>セッション2</h2><p>2件です。セッション1の結果を機械側へ返したあとに開きます。自動では移動しません。</p><a href="/session-2/">セッション2を開く</a></div><p class="muted">画面は時間を計測せず、回答をサーバーへ保存しません。各セッションの最後に結果をコピーしてください。</p></body></html>`;
}

async function main() {
  const [ranking, thirdThemes, bThemes, generalizationThemes, ...transcripts] = await Promise.all([
    readJson(path.join(rankingRoot, 'result.json')),
    readJson(thirdThemePath),
    readJson(bThemePath),
    readJson(generalizationThemePath),
    ...Object.values(transcriptPaths).map(readJson)
  ]);
  if (ranking.kind !== 'candidate_ranking_v002_third_material_run1_result'
    || ranking.generationSystem !== 'candidate-ranking-v002@gemini-web-flash'
    || ranking.rankedCandidates.length !== 5) {
    throw new Error('第三素材のランキング結果が確定していません');
  }
  for (const filePath of Object.values(videoPaths)) {
    if (!existsSync(filePath)) throw new Error(`元配信動画がありません: ${filePath}`);
  }
  const transcriptBySource = new Map(Object.keys(transcriptPaths).map((sourceVideoId, index) => [sourceVideoId, transcripts[index]]));
  function taskFromTheme({ fixtureId, candidateId, themeOutput, role, rank, priorDecision }) {
    const theme = themeOutput.themes[candidateId - 1];
    if (!theme || !Array.isArray(theme.evidenceRanges) || theme.evidenceRanges.length !== 1) {
      throw new Error(`${fixtureId} candidate ${candidateId} は単一場面として確認できません`);
    }
    const range = theme.evidenceRanges[0];
    const transcript = transcriptBySource.get(range.sourceVideoId);
    if (!transcript) throw new Error(`STT対応がありません: ${range.sourceVideoId}`);
    const firstCandidateChunk = Math.floor(range.sourceStartMs / chunkDurationMs);
    const lastCandidateChunk = Math.floor(Math.max(range.sourceStartMs, range.sourceEndMs - 1) / chunkDurationMs);
    return {
      id: `${fixtureId}__candidate-${String(candidateId).padStart(3, '0')}`,
      fixtureId,
      candidateId,
      title: theme.title,
      reason: theme.reason,
      sourceVideoId: range.sourceVideoId,
      sourceChunkCount: transcript.fullChunkCount,
      sourceDurationMs: Math.round(transcript.originalDurationSec * 1000),
      initialFirstChunk: Math.max(0, firstCandidateChunk - 1),
      initialLastChunk: Math.min(transcript.fullChunkCount - 1, lastCandidateChunk + 1),
      provisionalStartMs: range.sourceStartMs,
      provisionalEndMs: range.sourceEndMs,
      role,
      rank,
      priorDecision
    };
  }
  const thirdTasks = ranking.rankedCandidates.map((candidate) => taskFromTheme({
    fixtureId: ranking.fixtureId,
    candidateId: candidate.candidateId,
    themeOutput: thirdThemes,
    role: 'third-material-scored-item',
    rank: candidate.rank
  }));
  const controls = [
    taskFromTheme({
      fixtureId: 'nOEWCNc77MI_multiblock_material_v001',
      candidateId: 32,
      themeOutput: bThemes,
      role: 'reproducibility-control',
      priorDecision: { decision: 'publish', startMs: 2790074, endMs: 2848146, sourceReview: '2026-07-15 UI v003正式回答' }
    }),
    taskFromTheme({
      fixtureId: '9dtwF5Exu5w_multiblock_material_v001',
      candidateId: 14,
      themeOutput: generalizationThemes,
      role: 'reproducibility-control',
      priorDecision: { decision: 'skip', sourceReview: '2026-07-15 UI v003正式回答' }
    })
  ];
  const sessions = [
    { sessionId: 'session-1', sessionNumber: 1, tasks: [thirdTasks[0], controls[0], thirdTasks[1], controls[1], thirdTasks[2]] },
    { sessionId: 'session-2', sessionNumber: 2, tasks: [thirdTasks[3], thirdTasks[4]] }
  ];
  if (sessions[0].tasks.length !== 5 || sessions[1].tasks.length !== 2 || thirdTasks.length !== 5 || controls.length !== 2) {
    throw new Error('事前登録したセッション分割と一致しません');
  }
  const htmls = sessions.map(buildSessionHtml);
  htmls.forEach((html, index) => verifyHtml(html, sessions[index].tasks.length));
  const visiblePages = htmls.join('\n');
  if (/reproducibility-control|third-material-scored-item|priorDecision|sourceReview|knownHit|hitExpected|expectedCuts/i.test(visiblePages)) {
    throw new Error('人間用ページへ役割・旧回答・正解情報が混入しています');
  }
  const manifest = {
    kind: 'third_material_hand_trim_trial_manifest',
    version: 'human-boundary-trim-v002-third-material-ui-v004',
    createdAt: new Date().toISOString(),
    sourceRanking: path.relative(root, path.join(rankingRoot, 'result.json')),
    question: 'AIの場面の外側境界を文字位置で調整し、同じ場面内のカット・無音除去を行えば公開候補にできるか。離れた別場面が必要なら文脈不足として分ける。',
    decisions: ['区間内編集で公開候補', '選ばない', '文脈不明（別場面が必要）'],
    humanWork: {
      totalDecisionCount: 7,
      thirdMaterialDecisionCount: 5,
      reproducibilityControlCount: 2,
      baselineEstimateMinutesPerDecision: 3,
      totalBaselineEstimateMinutes: 21,
      thirdMaterialTimeLimitMinutes: 15,
      sessionDecisionCounts: [5, 2],
      note: 'UIは時間を計測しない。第三素材5件だけを15分条件で判定し、既判定2件は再現性を別集計する。'
    },
    uiContract: {
      boundarySelection: 'complete utterance context with selectable timed character positions; reviewer avoids mid-word boundaries',
      humanTimeDisplay: 'HH:MM:SS',
      boundaryInput: 'no numeric input',
      playback: 'explicit buttons; next-candidate navigation autoplays next AI range',
      adjacentContext: '30-second chunks expandable to source edges; not treated as default solution',
      videoSizing: 'max-height:min(38vh,420px); object-fit:contain',
      serverPersistence: false,
      resultDelivery: 'copy to chat',
      interactionTimingRecorded: false,
      sessionAutoAdvance: false
    },
    sessions: sessions.map((session) => ({
      sessionId: session.sessionId,
      page: `${session.sessionId}.html`,
      decisionCount: session.tasks.length,
      taskIds: session.tasks.map((task) => task.id)
    })),
    tasks: [...thirdTasks, ...controls].map(({ priorDecision, ...task }) => task),
    controlReferencePath: path.relative(root, path.join(outputRoot, 'control-reference.json')),
    fixtureAndExpectedChanges: false
  };
  const controlReference = {
    kind: 'blind_reproducibility_control_reference',
    excludedFromHumanPages: true,
    controls: controls.map((task) => ({
      taskId: task.id,
      fixtureId: task.fixtureId,
      candidateId: task.candidateId,
      priorDecision: task.priorDecision
    }))
  };
  const preflight = {
    kind: 'third_material_hand_trim_trial_preflight',
    version: manifest.version,
    status: 'pass',
    checks: {
      rankingCandidateCountFive: true,
      sessionDecisionCounts: [5, 2],
      thirdMaterialItemsFive: true,
      blindControlsTwo: true,
      blindControlLabelsExcludedFromPages: true,
      questionStatesCurrentRangeEditingAndSeparateSceneContext: true,
      fullUtteranceWithTimedCharacterSelection: true,
      noNumericTimeInput: true,
      humanClockHhMmSs: true,
      explicitPlaybackOnlyForBoundarySelection: true,
      nextCandidateAutoplay: true,
      contextExpandableToSourceEdges: true,
      viewportBoundVideo: true,
      noInteractionTimer: true,
      noServerPersistence: true,
      copyResultAndEditAfterCompletion: true,
      noSessionAutoAdvance: true,
      sourceVideosPresent: true,
      existingFixtureAndExpectedUnchanged: true
    },
    humanWork: manifest.humanWork
  };
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputRoot, 'index.html'), buildLanding()),
    writeFile(path.join(outputRoot, 'session-1.html'), htmls[0]),
    writeFile(path.join(outputRoot, 'session-2.html'), htmls[1]),
    writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(outputRoot, 'control-reference.json'), `${JSON.stringify(controlReference, null, 2)}\n`),
    writeFile(path.join(outputRoot, 'preflight.json'), `${JSON.stringify(preflight, null, 2)}\n`)
  ]);
  console.log(JSON.stringify({
    status: 'ready-for-human-review',
    outputRoot: path.relative(root, outputRoot),
    session1DecisionCount: 5,
    session2DecisionCount: 2,
    thirdMaterialDecisionCount: 5,
    controlDecisionCount: 2,
    thirdMaterialTimeLimitMinutes: 15,
    interactionTimingRecorded: false
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
