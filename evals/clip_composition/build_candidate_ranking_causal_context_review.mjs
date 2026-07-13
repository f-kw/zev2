#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceなし');
    current = parent;
  }
  return current;
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const auditRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-causal-context-audit-v001');
const auditPath = path.join(auditRoot, 'desk-audit.json');
const reviewRoot = path.join(auditRoot, 'human-review-causal-context-v001');
const mediaRoot = path.join(reviewRoot, 'media');
const partsRoot = path.join(reviewRoot, 'parts');
const packageId = '20260713-causal-context-rereview-v001';

const sourcePaths = {
  YE_faluP7zY: path.join(evalRoot, 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4'),
  o8rZAhARXAc: path.join(evalRoot, 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')
};

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function runProcess(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let stdout = '';
    let stderr = '';
    if (capture) {
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} failed: ${code}\n${stderr}`));
    });
  });
}

async function mediaDurationMs(file) {
  const { stdout } = await runProcess('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], true);
  const duration = Number(stdout.trim());
  if (!Number.isFinite(duration)) throw new Error(`再生時間を取得できません: ${file}`);
  return Math.round(duration * 1000);
}

function safeSourcePath(sourceVideoId) {
  const key = sourceVideoId.replace(/-/g, '_');
  const sourcePath = sourcePaths[key];
  if (!sourcePath || !existsSync(sourcePath)) throw new Error(`元動画なし: ${sourceVideoId}`);
  return sourcePath;
}

async function buildCandidateMedia(candidate) {
  const sourcePath = safeSourcePath(candidate.sourceVideoId);
  const stem = `${candidate.fixtureId.startsWith('nOEW') ? 'B' : 'second'}-candidate-${String(candidate.candidateId).padStart(2, '0')}`;
  const candidatePartsRoot = path.join(partsRoot, stem);
  await mkdir(candidatePartsRoot, { recursive: true });
  const parts = [];
  for (const [index, piece] of candidate.evidencePieces.entries()) {
    const partPath = path.join(candidatePartsRoot, `speech-${piece.speechId}.mp4`);
    const expectedDurationMs = piece.sourceEndMs - piece.sourceStartMs;
    await runProcess('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', String(piece.sourceStartMs / 1000), '-t', String(expectedDurationMs / 1000), '-i', sourcePath,
      '-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale='min(1280,iw)':-2",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27',
      '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '96k', '-movflags', '+faststart', partPath
    ]);
    const actualDurationMs = await mediaDurationMs(partPath);
    if (Math.abs(actualDurationMs - expectedDurationMs) > 500) throw new Error(`${stem} speech ${piece.speechId} の切り出し時間不一致`);
    parts.push({
      index: index + 1,
      speechId: piece.speechId,
      sourceStartMs: piece.sourceStartMs,
      sourceEndMs: piece.sourceEndMs,
      text: piece.text,
      expectedDurationMs,
      actualDurationMs,
      path: path.relative(reviewRoot, partPath)
    });
  }
  const concatListPath = path.join(candidatePartsRoot, 'concat-list.txt');
  await writeFile(concatListPath, `${parts.map((part) => `file '${path.join(reviewRoot, part.path).replaceAll("'", "'\\''")}'`).join('\n')}\n`);
  const videoPath = path.join(mediaRoot, `${stem}-stitched.mp4`);
  const audioPath = path.join(mediaRoot, `${stem}-stitched.m4a`);
  await runProcess('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', '-movflags', '+faststart', videoPath]);
  await runProcess('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', videoPath, '-vn', '-c:a', 'copy', audioPath]);
  const [videoDurationMs, audioDurationMs] = await Promise.all([mediaDurationMs(videoPath), mediaDurationMs(audioPath)]);
  const expectedDurationMs = parts.reduce((sum, part) => sum + part.expectedDurationMs, 0);
  if (Math.abs(videoDurationMs - expectedDurationMs) > 500 || Math.abs(audioDurationMs - expectedDurationMs) > 500) {
    throw new Error(`${stem} のつぎはぎ時間不一致: expected=${expectedDurationMs} video=${videoDurationMs} audio=${audioDurationMs}`);
  }
  await unlink(concatListPath);
  return {
    ...candidate,
    parts,
    stitchedVideoPath: path.relative(reviewRoot, videoPath),
    stitchedAudioPath: path.relative(reviewRoot, audioPath),
    expectedDurationMs,
    videoDurationMs,
    audioDurationMs
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function durationText(ms) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`;
}

function buildHtml(items, totalDurationMs) {
  const cards = items.map((item, index) => `<article class="case" data-index="${index}" hidden>
    <div class="case-number">確認 ${index + 1} / ${items.length}</div>
    <h2>${escapeHtml(item.title)}</h2>
    <p class="reason"><strong>候補になった理由:</strong> ${escapeHtml(item.reason)}</p>
    <p class="notice">根拠内の発話 ${item.parts.length}ピースを時系列につないだ動画です。元配信の固定秒数を前後へ足してはいません。細かな境界ではなく、これだけで出来事の原因と反応が分かり、公開候補として成立するかを見てください。</p>
    <video controls preload="metadata" src="${escapeHtml(item.stitchedVideoPath)}"></video>
    <details><summary>音声だけで確認</summary><p>動画と同じつぎはぎ区間です。両方を再生する必要はありません。</p><audio controls preload="metadata" src="${escapeHtml(item.stitchedAudioPath)}"></audio></details>
    <details><summary>含まれる発話ピースを確認</summary><ol>${item.parts.map((part) => `<li>speech ${part.speechId}: ${escapeHtml(part.text)}</li>`).join('')}</ol></details>
  </article>`).join('\n');
  const itemJson = JSON.stringify(items.map((item) => ({
    fixtureId: item.fixtureId,
    candidateId: item.candidateId,
    title: item.title,
    sourceVideoId: item.sourceVideoId,
    speechIds: item.parts.map((part) => part.speechId)
  }))).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>因果文脈4件 再確認</title><style>
  :root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d1117;color:#f0f3f6}*{box-sizing:border-box}body{margin:0;padding-bottom:160px}header,main{width:min(1040px,calc(100% - 28px));margin:0 auto}header{padding:26px 0 14px}h1{margin:0 0 10px}.lead{color:#c9d1d9;line-height:1.7}.work{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:14px 18px;line-height:1.65}.progress{display:flex;gap:10px;align-items:center;margin:16px 0}progress{width:100%;height:16px}.case{background:#161b22;border:1px solid #30363d;border-radius:18px;padding:clamp(18px,3vw,30px)}.case-number{color:#7ee787;font-weight:700}.reason,.notice{line-height:1.7}.notice{background:#0d1117;border-radius:10px;padding:12px;color:#c9d1d9}video{width:100%;max-height:58vh;background:#000;border-radius:12px}audio{width:100%}details{background:#0d1117;border-radius:10px;padding:12px;margin-top:12px}li{margin:.5em 0;line-height:1.5}.decision-bar{position:fixed;z-index:10;left:0;right:0;bottom:0;background:rgba(13,17,23,.97);border-top:1px solid #30363d;padding:12px max(14px,calc((100vw - 1040px)/2));backdrop-filter:blur(10px)}.choices{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}button{border:1px solid #484f58;border-radius:11px;padding:14px 8px;color:#f0f3f6;background:#21262d;font-weight:700;font-size:15px;cursor:pointer}button[data-value="publish"]{background:#1f6f3f}button[data-value="okay_skip"]{background:#6b5419}button[data-value="boring"]{background:#6e3030}button[data-value="context_unknown"]{background:#4b3f72}.nav{display:flex;justify-content:space-between;align-items:center;margin-top:9px}.nav button{padding:8px 16px}#outputBox{width:100%;min-height:220px;background:#0d1117;color:#f0f3f6;border:1px solid #30363d;border-radius:10px;padding:12px}.complete{background:#12261b;border:1px solid #2ea043;border-radius:14px;padding:18px}@media(max-width:760px){.choices{grid-template-columns:1fr 1fr}body{padding-bottom:230px}}
  </style></head><body><header><h1>因果文脈 4件の再確認</h1><p class="lead"><strong>目的:</strong> 原因と反応が分かるように根拠内発話をつないだとき、候補の評価が変わるかを見る一回きりの小監査です。</p><div class="work"><strong>見なくてよいもの:</strong> 細かな開始・終了位置、動画と音声の両方、旧判定。動画か音声の一方だけで構いません。<br><strong>答えてほしいこと:</strong> 今回の媒体だけを見て、画面下の「公開したい / 悪くないが選ばない / つまらない / 文脈不明」から1つ選んでください。選ぶと自動で次へ進みます。<br><strong>人間作業:</strong> 4件×2分弱、合計上限約8分。つぎはぎ動画の総尺は${escapeHtml(durationText(totalDurationMs))}、初期1.5倍では約${escapeHtml(durationText(Math.round(totalDurationMs / 1.5)))}です。</div><div class="progress"><progress id="progress" max="${items.length}" value="0"></progress><span id="progressText">0/${items.length}</span></div></header><main>${cards}<section id="complete" class="complete" hidden><h2>4件の回答が揃いました</h2><p id="elapsed"></p><button id="copy">回答をコピー</button><p><select id="editIndex">${items.map((item, index) => `<option value="${index}">確認${index + 1}: ${escapeHtml(item.title)}</option>`).join('')}</select> <button id="editAnswer">回答を修正</button></p><textarea id="outputBox" readonly></textarea></section></main><div class="decision-bar" id="decisionBar"><div class="choices"><button data-value="publish">公開したい</button><button data-value="okay_skip">悪くないが選ばない</button><button data-value="boring">つまらない</button><button data-value="context_unknown">文脈不明</button></div><div class="nav"><button id="prev">前へ</button><span id="currentStatus">未回答</span><button id="next">次へ</button></div></div><script>
  const items=${itemJson};const storageKey='zev-causal-context-rereview-v001';const labels={publish:'公開したい',okay_skip:'悪くないが選ばない',boring:'つまらない',context_unknown:'文脈不明'};let state={current:0,answers:{}};try{state={...state,...(JSON.parse(localStorage.getItem(storageKey))||{})}}catch{}const cards=[...document.querySelectorAll('.case')];const media=[...document.querySelectorAll('video,audio')];media.forEach(element=>{element.defaultPlaybackRate=1.5;element.playbackRate=1.5});function save(){localStorage.setItem(storageKey,JSON.stringify(state))}if(!state.startedAt){state.startedAt=new Date().toISOString();save()}function pauseAll(){media.forEach(element=>element.pause())}function elapsedText(){const end=state.completedAt?new Date(state.completedAt).getTime():Date.now();const sec=Math.max(0,Math.round((end-new Date(state.startedAt).getTime())/1000));return Math.floor(sec/60)+'分'+String(sec%60).padStart(2,'0')+'秒'}function buildOutput(){const lines=['candidate-ranking 因果文脈4件 再確認結果','確認者: kawafmm','確認日: 2026-07-13','実測: '+elapsedText(),''];items.forEach((item,index)=>lines.push('確認'+(index+1)+': '+(labels[state.answers[index]]||'未回答')+' / '+item.fixtureId+' / candidate '+item.candidateId+' / '+item.title));for(const [value,label] of Object.entries(labels))lines.push(label+': '+(items.map((_,i)=>i).filter(i=>state.answers[i]===value).map(i=>i+1).join(', ')||'なし'));return lines.join('\\n')}function render(){const count=Object.keys(state.answers).length;const done=count===items.length;if(done&&!state.completedAt){state.completedAt=new Date().toISOString();save()}cards.forEach((card,index)=>{card.hidden=done||index!==state.current});document.getElementById('complete').hidden=!done;document.getElementById('decisionBar').hidden=done;document.getElementById('progress').value=count;document.getElementById('progressText').textContent=count+'/'+items.length;if(done){document.getElementById('outputBox').value=buildOutput();document.getElementById('elapsed').textContent='画面を開いてから回答完了まで: '+elapsedText()}else{document.getElementById('prev').disabled=state.current===0;document.getElementById('next').disabled=state.current===items.length-1;document.getElementById('currentStatus').textContent=state.answers[state.current]?labels[state.answers[state.current]]:'未回答'}}document.querySelectorAll('[data-value]').forEach(button=>button.addEventListener('click',()=>{state.answers[state.current]=button.dataset.value;pauseAll();if(state.current<items.length-1)state.current+=1;save();render();window.scrollTo({top:0,behavior:'smooth'})}));document.getElementById('prev').addEventListener('click',()=>{pauseAll();state.current=Math.max(0,state.current-1);save();render()});document.getElementById('next').addEventListener('click',()=>{pauseAll();state.current=Math.min(items.length-1,state.current+1);save();render()});document.getElementById('copy').addEventListener('click',async()=>{const text=buildOutput();document.getElementById('outputBox').value=text;try{await navigator.clipboard.writeText(text)}catch{const box=document.getElementById('outputBox');box.focus();box.select();document.execCommand('copy')}document.getElementById('copy').textContent='コピーしました'});document.getElementById('editAnswer').addEventListener('click',()=>{const index=Number(document.getElementById('editIndex').value);delete state.answers[index];state.current=index;state.completedAt=null;save();render()});render();
  </script></body></html>`;
}

async function main() {
  const audit = await readJson(auditPath);
  if (audit.kind !== 'candidate_ranking_causal_context_desk_audit') throw new Error('机上監査結果が不正');
  const targets = audit.candidates.filter((candidate) => candidate.assessment === 'cause-in-evidence');
  if (targets.length !== audit.humanWork.reReview.itemCount || targets.length !== 4) throw new Error('再提示件数が机上監査と不一致');
  await Promise.all([mkdir(mediaRoot, { recursive: true }), mkdir(partsRoot, { recursive: true })]);
  const items = [];
  for (const target of targets) {
    console.log(`[media] ${target.fixtureId} candidate ${target.candidateId}`);
    items.push(await buildCandidateMedia(target));
  }
  const totalDurationMs = items.reduce((sum, item) => sum + item.expectedDurationMs, 0);
  const manifest = {
    kind: 'candidate_ranking_causal_context_human_review_package',
    packageId,
    createdAt: new Date().toISOString(),
    sourceAudit: path.relative(root, auditPath),
    purpose: '根拠内の全発話ピースを時系列につぎはぎし、原因と反応が理解できるかを四択で再確認する。',
    choices: ['公開したい', '悪くないが選ばない', 'つまらない', '文脈不明'],
    humanWorkEstimate: { itemCount: items.length, estimatedMinutesPerItemUpperBound: 2, estimatedTotalMinutesUpperBound: items.length * 2 },
    playback: { defaultRate: 1.5, sourceTotalDurationMs: totalDurationMs, durationAtDefaultRateMs: Math.round(totalDurationMs / 1.5) },
    contextPolicy: { fixedTimeLeadIn: false, source: 'theme evidence speech pieces only', chronologicalStitching: true },
    answerStatus: 'awaiting-human-review',
    fixtureAndExpectedChanges: false,
    items
  };
  await Promise.all([
    writeFile(path.join(reviewRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(reviewRoot, 'review.html'), buildHtml(items, totalDurationMs))
  ]);
  console.log(JSON.stringify({ status: 'ready-for-human-review', itemCount: items.length, estimatedMinutesUpperBound: items.length * 2, totalDurationMs, durationAtDefaultRateMs: Math.round(totalDurationMs / 1.5), reviewHtml: path.relative(root, path.join(reviewRoot, 'review.html')), manifest: path.relative(root, path.join(reviewRoot, 'manifest.json')) }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
