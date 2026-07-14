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
const labels = {
  nOEWCNc77MI_multiblock_material_v001: 'マリン・ころね Raft',
  '9dtwF5Exu5w_multiblock_material_v001': 'マリン 野球ゲーム'
};
const wordTimestampPaths = {
  'YE-faluP7zY': path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'word-timestamps.json'),
  o8rZAhARXAc: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'word-timestamps.json')
};

function buildSpeechRows(rows, timestampWords) {
  const merged = [];
  for (const source of rows) {
    const sourceText = String(source.text ?? '').trim();
    const row = { id: source.speechId, startMs: source.sourceStartMs, endMs: source.sourceEndMs, text: sourceText, sourceText };
    if ([...row.text].length === 1 && merged.length > 0) {
      const previous = merged.at(-1);
      previous.endMs = row.endMs;
      previous.text += row.text;
      previous.sourceText = null;
    } else if (merged.at(-1)?.sourceText === sourceText) {
      merged.at(-1).endMs = row.endMs;
      merged.at(-1).text += sourceText;
    } else {
      merged.push(row);
    }
  }
  if (merged.length > 1 && [...merged[0].text].length === 1) {
    merged[1].startMs = merged[0].startMs;
    merged[1].text = merged[0].text + merged[1].text;
    merged[1].sourceText = null;
    merged.shift();
  }
  if (merged.some((row) => [...row.text].length === 1)) throw new Error('1文字だけの発話文脈が残った');
  let pointIndex = 0;
  return merged.map((row, rowIndex) => {
    const pieces = timestampWords
      .filter((word) => word.startMs >= row.startMs && word.startMs < row.endMs && String(word.text ?? '').length > 0)
      .map((word, localIndex) => ({ index: pointIndex++, rowIndex, localIndex, text: String(word.text), startMs: word.startMs, endMs: word.endMs }));
    if (pieces.length === 0) throw new Error(`単語時刻なし: ${row.id}`);
    const displayText = pieces.map((piece) => piece.text).join('');
    if ([...displayText].length === 1) throw new Error(`1文字だけの発話文脈: ${row.id}`);
    const { sourceText, ...visibleRow } = row;
    return { ...visibleRow, displayText, pieces };
  });
}

function buildHtml(manifest) {
  const manifestJson = JSON.stringify(manifest).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>候補の公開範囲を選ぶ</title>
  <style>
    :root{color-scheme:dark;--bg:#0d1117;--panel:#161b22;--line:#30363d;--text:#f0f3f6;--muted:#a7b0bb;--blue:#58a6ff;--green:#2ea043;--yellow:#9e7b20;--purple:#6e4b91}
    *{box-sizing:border-box}body{margin:0;padding:0 0 170px;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header,main{width:min(1050px,calc(100% - 28px));margin:auto}header{padding:22px 0 8px}h1{margin:0 0 8px;font-size:clamp(24px,4vw,36px)}h2{line-height:1.35}.guide,.card,.selection,.copy-panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:12px}.guide{line-height:1.65}.muted{color:var(--muted)}.topline{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}select,button,textarea{font:inherit}select{max-width:100%;color:var(--text);background:#21262d;border:1px solid #484f58;border-radius:9px;padding:9px}video{width:100%;max-height:52vh;background:#000;border-radius:12px}.selection{display:grid;grid-template-columns:1fr 1fr;gap:10px}.selection strong{display:block;margin-bottom:5px}.selection-text{line-height:1.65}.mode-controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.mode-controls button{flex:1}.transcript{display:grid;gap:9px;margin-top:12px;max-height:52vh;overflow:auto}.speech-row{background:#11161e;border:1px solid var(--line);border-radius:10px;padding:10px}.speech-row.in-range{background:#15253a;border-color:#315f8d}.speech-meta{margin-bottom:6px}.speech-text{font-size:18px;line-height:2.05;word-break:break-all}.piece{display:inline;color:var(--text);background:transparent;border:0;border-radius:3px;padding:3px 0;line-height:1.5}.piece:hover{background:#29405b}.piece.start{background:var(--green);color:#fff;box-shadow:-3px 0 0 #8bf0b4}.piece.end{background:#9e7b20;color:#fff;box-shadow:3px 0 0 #ffd071}.piece.in-range:not(.start):not(.end){background:#213a58}.piece:focus-visible{outline:3px solid var(--blue);outline-offset:2px}button{color:var(--text);background:#21262d;border:1px solid #484f58;border-radius:10px;padding:11px 14px;cursor:pointer}button:hover{border-color:var(--blue)}button.active{outline:3px solid var(--blue)}button:disabled{opacity:.4;cursor:not-allowed}.controls{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px}.copy-panel textarea{width:100%;min-height:240px;margin-top:10px;background:#0d1117;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px}.bottom{position:fixed;z-index:5;left:0;right:0;bottom:0;background:rgba(13,17,23,.97);border-top:1px solid var(--line);padding:11px 14px}.bottom-inner{width:min(1050px,100%);margin:auto}.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.publish{background:#1f6f3f}.skip{background:#765d1a}.unknown{background:#54376e}.nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}.nav button{min-width:110px}.hidden{display:none!important}@media(max-width:720px){body{padding-bottom:260px}.selection{grid-template-columns:1fr}.choices{grid-template-columns:1fr}.nav button{min-width:0;flex:1}}
  </style>
</head>
<body>
  <header>
    <div class="topline"><div><h1>候補の公開範囲を選ぶ</h1><div id="progress" class="muted"></div></div><select id="jump"></select></div>
    <div class="guide"><strong>やること:</strong> 動画を見て三択を選びます。公開する場合だけ、発話文の中から開始と終了を選びます。開始は「始めたい言葉の最初」、終了は「最後に残す言葉の最後」を押してください。1文字だけを孤立表示せず、発話全体の意味を読みながら選べます。時刻入力も確定保存もありません。</div>
  </header>
  <main>
    <section class="card"><div id="source" class="muted"></div><h2 id="title"></h2><p id="reason"></p></section>
    <section class="card"><video id="video" controls preload="metadata"></video><div class="controls"><button id="previewCandidate">候補全体を再生</button><button id="previewSelection">選んだ範囲を再生</button></div></section>
    <section id="boundaryPanel" class="card hidden"><h2>発話文から公開範囲を選ぶ</h2><div class="selection"><div><strong>開始</strong><div id="startText" class="selection-text"></div></div><div><strong>終了</strong><div id="endText" class="selection-text"></div></div></div><div class="mode-controls"><button id="modeStart">開始を選ぶ</button><button id="modeEnd">終了を選ぶ</button></div><p id="modeGuide" class="muted"></p><div id="transcript" class="transcript"></div></section>
    <section id="copyPanel" class="copy-panel hidden"><h2>確認結果</h2><p>「結果をコピー」を押して、そのままチャットへ貼り付けてください。ブラウザが直接コピーを許可しない場合は結果欄を選択するので、Command+Cだけ押してください。コピー後も候補を選び直せます。</p><button id="copy">結果をコピー</button><textarea id="output" readonly></textarea></section>
  </main>
  <div class="bottom"><div class="bottom-inner"><div class="choices"><button data-decision="publish" class="publish">公開する</button><button data-decision="skip" class="skip">選ばない</button><button data-decision="context_unknown" class="unknown">文脈不明</button></div><div class="nav"><button id="prev">前の候補</button><span id="status">未回答</span><button id="next">次の候補</button></div></div></div>
  <script>
    (()=>{
      const manifest=${manifestJson};const items=manifest.tasks;const storageKey='zev-human-boundary-trim-v002-utterance-context-v002';const labels={publish:'公開する',skip:'選ばない',context_unknown:'文脈不明'};const $=id=>document.getElementById(id);const video=$('video');const pointsByTask=Object.fromEntries(items.map(t=>[t.id,t.transcriptRows.flatMap(row=>row.pieces)]));let previewEndMs=null;let mode='start';let state={current:0,answers:{}};try{state={...state,...(JSON.parse(localStorage.getItem(storageKey))||{})}}catch{}
      function answer(item){if(!state.answers[item.id])state.answers[item.id]={decision:null,startPoint:0,endPoint:item.pointCount-1};return state.answers[item.id]}
      items.forEach(t=>{const a=answer(t);if(!Number.isInteger(a.startPoint)||!Number.isInteger(a.endPoint)){state.answers[t.id]={decision:a.decision??null,startPoint:0,endPoint:t.pointCount-1}}});state.current=Math.min(Math.max(0,Number(state.current)||0),items.length-1);
      function save(){localStorage.setItem(storageKey,JSON.stringify(state))}
      function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
      function item(){return items[state.current]}
      function points(t){return pointsByTask[t.id]}
      function valid(a){return a.decision&&a.startPoint<=a.endPoint}
      function complete(){return items.every(t=>valid(answer(t)))}
      function selected(t,a){return {start:points(t)[a.startPoint],end:points(t)[a.endPoint]}}
      function boundaryText(t,index,side){const p=points(t)[index],row=t.transcriptRows[p.rowIndex],cut=side==='start'?p.localIndex:p.localIndex+1,before=row.pieces.slice(0,cut).map(x=>x.text).join(''),after=row.pieces.slice(cut).map(x=>x.text).join('');return '発話 '+(p.rowIndex+1)+': '+before+'｜'+after}
      function play(startMs,endMs){video.currentTime=startMs/1000;previewEndMs=endMs;video.play().catch(()=>{})}
      function renderTranscript(t,a){const scroll=$('transcript').scrollTop;$('transcript').innerHTML=t.transcriptRows.map((row,rowIndex)=>{const inside=row.pieces.some(p=>p.index>=a.startPoint&&p.index<=a.endPoint);return '<div class="speech-row '+(inside?'in-range':'')+'"><div class="speech-meta muted">発話 '+(rowIndex+1)+' / '+t.transcriptRows.length+'</div><div class="speech-text">'+row.pieces.map(p=>'<button class="piece '+(p.index>=a.startPoint&&p.index<=a.endPoint?'in-range ':'')+(p.index===a.startPoint?'start ':'')+(p.index===a.endPoint?'end':'')+'" data-point="'+p.index+'" aria-label="'+esc(row.displayText)+' 内の位置">'+esc(p.text)+'</button>').join('')+'</div></div>'}).join('');$('transcript').scrollTop=scroll;document.querySelectorAll('[data-point]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.point),p=points(t)[index];if(mode==='start'){a.startPoint=index;if(a.startPoint>a.endPoint)a.endPoint=a.startPoint;mode='end'}else{a.endPoint=index;if(a.endPoint<a.startPoint)a.startPoint=a.endPoint}save();render();const row=t.transcriptRows[p.rowIndex];play(row.startMs,row.endMs)})}
      function buildOutput(){const lines=['手直し確認v002 発話文境界選択結果','確認者: kawafmm',''];items.forEach((t,index)=>{const a=answer(t);lines.push('確認'+(index+1)+': '+labels[a.decision]+' / '+t.fixtureId+' / candidate '+t.candidateId+' / '+t.title);if(a.decision==='publish'){const s=selected(t,a);lines.push('開始: '+s.start.startMs+'ms / '+boundaryText(t,a.startPoint,'start'));lines.push('終了: '+s.end.endMs+'ms / '+boundaryText(t,a.endPoint,'end'))}});return lines.join('\\n')}
      function render(){const t=item(),a=answer(t),s=selected(t,a);$('progress').textContent=(state.current+1)+' / '+items.length+'　回答済み '+items.filter(x=>answer(x).decision).length+'件';$('jump').value=String(state.current);$('source').textContent=t.fixtureLabel+' / '+t.rank+'位 / candidate '+t.candidateId;$('title').textContent=t.title;$('reason').textContent=t.reason;if(video.dataset.source!==t.videoRoute){video.dataset.source=t.videoRoute;video.src=t.videoRoute;video.onloadedmetadata=()=>{video.currentTime=t.provisionalStartMs/1000}}$('boundaryPanel').classList.toggle('hidden',a.decision!=='publish');$('startText').textContent=boundaryText(t,a.startPoint,'start');$('endText').textContent=boundaryText(t,a.endPoint,'end');$('modeStart').classList.toggle('active',mode==='start');$('modeEnd').classList.toggle('active',mode==='end');$('modeGuide').textContent=mode==='start'?'始めたい言葉の最初の文字を、発話文の中で押してください。選ぶと終了選択へ移ります。':'最後に残す言葉の最後の文字を、発話文の中で押してください。';renderTranscript(t,a);document.querySelectorAll('[data-decision]').forEach(button=>button.classList.toggle('active',button.dataset.decision===a.decision));$('status').textContent=a.decision?labels[a.decision]:'未回答';$('prev').disabled=state.current===0;$('next').disabled=state.current===items.length-1;$('copyPanel').classList.toggle('hidden',!complete());if(complete())$('output').value=buildOutput()}
      $('jump').innerHTML=items.map((t,index)=>'<option value="'+index+'">確認'+(index+1)+': '+esc(t.title)+'</option>').join('');$('jump').onchange=()=>{state.current=Number($('jump').value);mode='start';save();render()};$('modeStart').onclick=()=>{mode='start';render()};$('modeEnd').onclick=()=>{mode='end';render()};document.querySelectorAll('[data-decision]').forEach(button=>button.onclick=()=>{answer(item()).decision=button.dataset.decision;if(button.dataset.decision==='publish')mode='start';save();render()});$('prev').onclick=()=>{state.current=Math.max(0,state.current-1);mode='start';save();render();window.scrollTo({top:0,behavior:'smooth'})};$('next').onclick=()=>{state.current=Math.min(items.length-1,state.current+1);mode='start';save();render();window.scrollTo({top:0,behavior:'smooth'})};$('previewCandidate').onclick=()=>play(item().provisionalStartMs,item().provisionalEndMs);$('previewSelection').onclick=()=>{const t=item(),a=answer(t),s=selected(t,a);play(s.start.startMs,s.end.endMs)};$('copy').onclick=()=>{const text=buildOutput(),output=$('output'),button=$('copy');output.value=text;output.focus();output.select();let copied=false;try{copied=document.execCommand('copy')}catch{}button.textContent=copied?'コピーしました':'文章を選択しました';if(!copied&&navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>{button.textContent='コピーしました'}).catch(()=>{})};video.addEventListener('timeupdate',()=>{if(previewEndMs!==null&&video.currentTime*1000>=previewEndMs){video.pause();previewEndMs=null}});save();render();
    })();
  </script>
</body>
</html>`;
}

async function main() {
  const [ranking, runManifest] = await Promise.all([
    readJson(path.join(rankingRoot, 'result.json')),
    readJson(path.join(rankingRoot, 'run-manifest.json'))
  ]);
  if (ranking.generationSystem !== 'candidate-ranking-v002@gemini-web-flash') throw new Error('ランキング系統不一致');
  const sourceByFixture = new Map(runManifest.fixtures.map((item) => [item.fixtureId, item.sourceOutputPath]));
  const promptInputCache = new Map();
  const wordTimestampCache = new Map();
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
      const promptInputPath = path.join(path.dirname(path.join(evalRoot, sourcePath)), 'windows', `${theme.windowId}-prompt-input.json`);
      if (!promptInputCache.has(promptInputPath)) promptInputCache.set(promptInputPath, await readJson(promptInputPath));
      const promptSource = promptInputCache.get(promptInputPath).modelInput.sources.find((item) => item.sourceVideoId === range.sourceVideoId);
      const sourceRows = promptSource?.segments.filter((row) => row.sourceEndMs >= range.sourceStartMs && row.sourceStartMs <= range.sourceEndMs) ?? [];
      const wordTimestampPath = wordTimestampPaths[range.sourceVideoId];
      if (!wordTimestampPath) throw new Error(`単語時刻の対応なし: ${range.sourceVideoId}`);
      if (!wordTimestampCache.has(wordTimestampPath)) wordTimestampCache.set(wordTimestampPath, (await readJson(wordTimestampPath)).words);
      const transcriptRows = buildSpeechRows(sourceRows, wordTimestampCache.get(wordTimestampPath));
      if (transcriptRows.length === 0) throw new Error(`発話テキストなし: ${fixture.fixtureId} ${ranked.candidateId}`);
      const pointCount = transcriptRows.reduce((sum, row) => sum + row.pieces.length, 0);
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
        transcriptRows,
        pointCount
      });
    }
    materials.push({ fixtureId: fixture.fixtureId, label: labels[fixture.fixtureId], taskIds });
  }
  if (materials.length !== 2 || tasks.length !== 10 || materials.some((item) => item.taskIds.length !== 5)) throw new Error('対象数不一致');
  const manifest = {
    kind: 'human_boundary_trim_utterance_context_manifest',
    version: 'human-boundary-trim-v002-utterance-context-v001',
    reviewer: 'kawafmm',
    priorProgress: 'invalid_due_to_unusable_ui_not_loaded',
    serverPersistence: false,
    resultDelivery: 'copy_to_chat',
    boundaryInput: 'select_timestamped_position_inside_full_utterance_context',
    expectedBoundaryDataIncluded: false,
    previousHumanLabelsIncluded: false,
    callbackOutputIncluded: false,
    materials,
    tasks
  };
  const visible = JSON.stringify({ materials, tasks });
  if (/expectedCuts|targetExpected|humanLabel|answerLabel|callback-detection/i.test(visible)) throw new Error('人間用データへ非表示情報が混入');
  const preflight = {
    kind: 'human_boundary_trim_utterance_context_preflight',
    version: manifest.version,
    materialCount: materials.length,
    taskCount: tasks.length,
    utteranceContextBoundarySelection: true,
    isolatedSingleCharacterChoice: false,
    resultCopy: true,
    serverPersistence: false,
    priorProgressLoaded: false,
    expectedBoundaryDataIncluded: false,
    previousHumanLabelsIncluded: false,
    callbackOutputIncluded: false,
    newSttRequired: false,
    status: 'pass'
  };
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(outputRoot, 'preflight.json'), `${JSON.stringify(preflight, null, 2)}\n`),
    writeFile(path.join(outputRoot, 'index.html'), buildHtml(manifest))
  ]);
  console.log(JSON.stringify({ status: 'prepared', materialCount: materials.length, taskCount: tasks.length, transcriptRowCount: tasks.reduce((sum, item) => sum + item.transcriptRows.length, 0), selectablePointCount: tasks.reduce((sum, item) => sum + item.pointCount, 0) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
