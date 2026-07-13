#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yamlが見つかりません');
    current = parent;
  }
  return current;
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const runRoot = path.join(evalRoot, 'outputs', 'callback-detection', '20260713-callback-detection-v001');
const resultPath = path.join(runRoot, 'result.json');
const reviewRoot = path.join(runRoot, 'human-review-v001');
const mediaRoot = path.join(reviewRoot, 'media');

const sourcePaths = new Map([
  ['YE-faluP7zY', path.join(evalRoot, 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4')],
  ['o8rZAhARXAc', path.join(evalRoot, 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')]
]);

function runProcess(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    });
    let stdout = '';
    let stderr = '';
    if (capture) {
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} failed (${code})\n${stderr}`));
    });
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function durationMs(filePath) {
  const { stdout } = await runProcess('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', filePath
  ], true);
  const seconds = Number(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`再生時間を取得できません: ${filePath}`);
  return Math.round(seconds * 1000);
}

async function cutMedia(sourcePath, startMs, endMs, outputPath) {
  if (!(Number.isFinite(startMs) && Number.isFinite(endMs) && startMs >= 0 && endMs > startMs)) {
    throw new Error(`切り出し範囲が不正です: ${startMs}-${endMs}`);
  }
  await runProcess('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(startMs / 1000), '-t', String((endMs - startMs) / 1000), '-i', sourcePath,
    '-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale='min(1280,iw)':-2",
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27',
    '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '96k',
    '-movflags', '+faststart', outputPath
  ]);
  const actualDurationMs = await durationMs(outputPath);
  const expectedDurationMs = endMs - startMs;
  if (Math.abs(actualDurationMs - expectedDurationMs) > 500) {
    throw new Error(`切り出し時間が一致しません: expected=${expectedDurationMs} actual=${actualDurationMs}`);
  }
  return { expectedDurationMs, actualDurationMs };
}

function sourcePathFor(sourceVideoId) {
  const sourcePath = sourcePaths.get(sourceVideoId);
  if (!sourcePath || !existsSync(sourcePath)) throw new Error(`元配信動画がありません: ${sourceVideoId}`);
  return sourcePath;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function clock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function durationText(ms) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`;
}

function buildHtml(items, totalDurationMs) {
  const cards = items.map((item, index) => `<article class="case" data-index="${index}" hidden>
    <div class="number">確認 ${index + 1} / ${items.length}</div>
    <h2>${escapeHtml(item.title)}</h2>
    <p class="reason"><strong>元の候補理由:</strong> ${escapeHtml(item.reason)}</p>
    <p class="machine"><strong>機械が原因とした理由:</strong> ${escapeHtml(item.machineReason)}</p>
    <section class="media-block"><h3>1. 元配信の別位置から見つけた原因候補</h3><p>${escapeHtml(item.sourceVideoId)} ${escapeHtml(clock(item.causeStartMs))}〜${escapeHtml(clock(item.causeEndMs))}</p><video class="cause" controls preload="metadata" src="${escapeHtml(item.causeVideoPath)}"></video></section>
    <section class="media-block"><h3>2. 元の反応場面</h3><p>${escapeHtml(item.sourceVideoId)} ${escapeHtml(clock(item.reactionStartMs))}〜${escapeHtml(clock(item.reactionEndMs))}</p><video class="reaction" controls preload="metadata" src="${escapeHtml(item.reactionVideoPath)}"></video></section>
    <button class="play-pair" type="button">原因→反応を連続再生</button>
    <details><summary>発話根拠を見る</summary><h4>原因候補</h4><ol>${item.causeSegments.map((segment) => `<li>speech ${segment.speechId}: ${escapeHtml(segment.text)}</li>`).join('')}</ol><h4>反応場面</h4><ol>${item.reactionSegments.map((segment) => `<li>speech ${segment.speechId}: ${escapeHtml(segment.text)}</li>`).join('')}</ol></details>
  </article>`).join('\n');
  const itemJson = JSON.stringify(items.map((item) => ({
    targetId: item.targetId,
    sourceVideoId: item.sourceVideoId,
    candidateId: item.candidateId,
    title: item.title,
    causeStartMs: item.causeStartMs,
    causeEndMs: item.causeEndMs,
    reactionStartMs: item.reactionStartMs,
    reactionEndMs: item.reactionEndMs
  }))).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>callback-detection-v001 人間確認</title><style>
  :root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d1117;color:#f0f3f6}*{box-sizing:border-box}body{margin:0;padding-bottom:190px}header,main{width:min(980px,calc(100% - 28px));margin:0 auto}header{padding:24px 0 14px}h1{margin:0 0 12px}.guide{line-height:1.65;background:#161b22;border:1px solid #30363d;border-radius:14px;padding:14px 18px}.progress{display:flex;align-items:center;gap:10px;margin:14px 0}progress{width:100%;height:16px}.case{background:#161b22;border:1px solid #30363d;border-radius:18px;padding:clamp(18px,3vw,28px)}.number{color:#7ee787;font-weight:700}.reason,.machine{line-height:1.65}.media-block{background:#0d1117;border-radius:12px;padding:12px;margin-top:14px}.media-block h3{margin:0 0 4px}video{width:100%;max-height:45vh;background:#000;border-radius:10px}.play-pair{width:100%;margin-top:14px;background:#1f6feb;border-color:#58a6ff}details{background:#0d1117;border-radius:10px;padding:12px;margin-top:14px}li{line-height:1.5;margin:.4em 0}.decision{position:fixed;z-index:10;left:0;right:0;bottom:0;background:rgba(13,17,23,.97);border-top:1px solid #30363d;padding:10px max(14px,calc((100vw - 980px)/2));backdrop-filter:blur(10px)}.choices{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}button{border:1px solid #484f58;border-radius:11px;padding:13px 8px;color:#f0f3f6;background:#21262d;font-weight:700;font-size:15px;cursor:pointer}button[data-value="actual"]{background:#1f6f3f}button[data-value="supporting"]{background:#6b5419}button[data-value="unrelated"]{background:#6e3030}button[data-value="uncertain"]{background:#4b3f72}.bulk-nav{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:8px}.bulk-nav button{padding:8px 12px}.all-yes{background:#174d2d}.complete{background:#12261b;border:1px solid #2ea043;border-radius:14px;padding:18px}textarea{width:100%;min-height:210px;background:#0d1117;color:#f0f3f6;border:1px solid #30363d;border-radius:10px;padding:12px}@media(max-width:700px){.choices{grid-template-columns:1fr 1fr}body{padding-bottom:255px}}
  </style></head><body><header><h1>原因場面 2件の確認</h1><div class="guide"><strong>目的:</strong> 機械が元配信の別位置から見つけた場面が、後の反応の本当の原因か確認します。<br><strong>見なくてよいもの:</strong> 公開したい候補か、細かな境界位置かは判断不要です。<br><strong>見るもの:</strong> 「原因→反応を連続再生」を1回押し、画面下から1つ選んでください。<br><strong>人間作業:</strong> ${items.length}件×2分以内、合計上限${items.length * 2}分。動画総尺${escapeHtml(durationText(totalDurationMs))}、初期1.5倍なら約${escapeHtml(durationText(Math.round(totalDurationMs / 1.5)))}です。</div><div class="progress"><progress id="progress" max="${items.length}" value="0"></progress><span id="progressText">0/${items.length}</span></div></header><main>${cards}<section id="complete" class="complete" hidden><h2>回答が揃いました</h2><p id="elapsed"></p><button id="copy">回答をコピー</button><p><select id="editIndex">${items.map((item, index) => `<option value="${index}">確認${index + 1}: ${escapeHtml(item.title)}</option>`).join('')}</select> <button id="editAnswer">回答を修正</button></p><textarea id="output" readonly></textarea></section></main><div class="decision" id="decision"><div class="choices"><button data-value="actual">原因として正しい</button><button data-value="supporting">関連はあるが原因ではない</button><button data-value="unrelated">関係ない</button><button data-value="uncertain">判断できない</button></div><div class="bulk-nav"><button id="allYes" class="all-yes">2件とも原因として正しい</button><button id="prev">前へ</button><span id="status">未回答</span><button id="next">次へ</button></div></div><script>
  const items=${itemJson};const labels={actual:'原因として正しい',supporting:'関連はあるが原因ではない',unrelated:'関係ない',uncertain:'判断できない'};const storageKey='zev-callback-detection-v001-review';let state={current:0,answers:{}};try{state={...state,...(JSON.parse(localStorage.getItem(storageKey))||{})}}catch{}if(!state.startedAt)state.startedAt=new Date().toISOString();const cards=[...document.querySelectorAll('.case')];const media=[...document.querySelectorAll('video')];media.forEach(element=>{element.defaultPlaybackRate=1.5;element.playbackRate=1.5});function save(){localStorage.setItem(storageKey,JSON.stringify(state))}function pauseAll(){media.forEach(element=>element.pause())}function elapsed(){const end=state.completedAt?new Date(state.completedAt):new Date();const sec=Math.max(0,Math.round((end-new Date(state.startedAt))/1000));return Math.floor(sec/60)+'分'+String(sec%60).padStart(2,'0')+'秒'}function outputText(){const lines=['callback-detection-v001 原因場面'+items.length+'件 人間確認結果','確認者: kawafmm','確認日: 2026-07-13','実測: '+elapsed(),''];items.forEach((item,index)=>lines.push('確認'+(index+1)+': '+(labels[state.answers[index]]||'未回答')+' / '+item.targetId+' / '+item.title+' / 原因 '+item.causeStartMs+'-'+item.causeEndMs+'ms / 反応 '+item.reactionStartMs+'-'+item.reactionEndMs+'ms'));for(const [key,label] of Object.entries(labels))lines.push(label+': '+(items.map((_,i)=>i).filter(i=>state.answers[i]===key).map(i=>i+1).join(', ')||'なし'));return lines.join('\\n')}function render(){const done=Object.keys(state.answers).length===items.length;if(done&&!state.completedAt){state.completedAt=new Date().toISOString();save()}cards.forEach((card,index)=>{card.hidden=done||index!==state.current});document.getElementById('complete').hidden=!done;document.getElementById('decision').hidden=done;document.getElementById('progress').value=Object.keys(state.answers).length;document.getElementById('progressText').textContent=Object.keys(state.answers).length+'/'+items.length;if(done){document.getElementById('output').value=outputText();document.getElementById('elapsed').textContent='画面を開いてから回答完了まで: '+elapsed()}else{document.getElementById('prev').disabled=state.current===0;document.getElementById('next').disabled=state.current===items.length-1;document.getElementById('status').textContent=state.answers[state.current]?labels[state.answers[state.current]]:'未回答'}}document.querySelectorAll('.play-pair').forEach((button,index)=>button.addEventListener('click',async()=>{pauseAll();const cause=cards[index].querySelector('.cause');const reaction=cards[index].querySelector('.reaction');cause.currentTime=0;reaction.currentTime=0;cause.onended=()=>reaction.play();await cause.play()}));document.querySelectorAll('[data-value]').forEach(button=>button.addEventListener('click',()=>{state.answers[state.current]=button.dataset.value;pauseAll();if(state.current<items.length-1)state.current+=1;save();render();scrollTo({top:0,behavior:'smooth'})}));document.getElementById('allYes').addEventListener('click',()=>{items.forEach((_,index)=>{state.answers[index]='actual'});pauseAll();save();render()});document.getElementById('prev').addEventListener('click',()=>{pauseAll();state.current=Math.max(0,state.current-1);save();render()});document.getElementById('next').addEventListener('click',()=>{pauseAll();state.current=Math.min(items.length-1,state.current+1);save();render()});document.getElementById('copy').addEventListener('click',async()=>{const text=outputText();document.getElementById('output').value=text;try{await navigator.clipboard.writeText(text)}catch{const box=document.getElementById('output');box.focus();box.select();document.execCommand('copy')}document.getElementById('copy').textContent='コピーしました'});document.getElementById('editAnswer').addEventListener('click',()=>{const index=Number(document.getElementById('editIndex').value);delete state.answers[index];state.current=index;state.completedAt=null;save();render()});save();render();
  </script></body></html>`;
}

function assertReviewHtml(html, itemCount) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  if (scripts.length !== 1) throw new Error(`確認HTMLのscript数が不正です: ${scripts.length}`);
  new Function(scripts[0]);
  const caseCount = (html.match(/<article class="case"/g) ?? []).length;
  const videoCount = (html.match(/<video /g) ?? []).length;
  const choiceCount = (html.match(/<button data-value=/g) ?? []).length;
  if (caseCount !== itemCount || videoCount !== itemCount * 2 || choiceCount !== 4) {
    throw new Error(`確認HTMLの要素数が不正です: case=${caseCount} video=${videoCount} choice=${choiceCount}`);
  }
  if (!html.includes('position:fixed') || !html.includes('2件とも原因として正しい')
    || !html.includes('原因→反応を連続再生')) {
    throw new Error('確認HTMLの省操作導線が不足しています');
  }
}

async function main() {
  if (!existsSync(resultPath)) throw new Error(`実走結果がありません: ${resultPath}`);
  const result = await readJson(resultPath);
  if (result.kind !== 'callback_detection_v001_result') throw new Error('callback detection結果のkindが不正です');
  if (result.verificationPromptVersion !== 'callback_detection_verification_prompt_v003'
    || result.verificationInputVersion !== 'callback_detection_verification_input_v002') {
    throw new Error('最終確認版の結果ではありません');
  }
  if (result.geminiTabCountAfterRun !== 0) throw new Error('Geminiタブが残っています');
  const plan = await readJson(path.join(runRoot, 'window-plan.json'));
  const targetById = new Map(plan.sources.flatMap((source) => source.targets.map((target) => [target.targetId, target])));
  const actualTargets = result.targets.filter((target) => target.status === 'verified'
    && target.decision?.decision === 'actual_separate_cause' && target.primaryFinding);
  if (actualTargets.length === 0) throw new Error('人間確認へ回す主原因がありません');
  await mkdir(mediaRoot, { recursive: true });
  const items = [];
  for (const resultTarget of actualTargets) {
    const target = targetById.get(resultTarget.targetId);
    if (!target) throw new Error(`target planにありません: ${resultTarget.targetId}`);
    const cause = resultTarget.primaryFinding;
    if (cause.sourceVideoId !== target.reactionSegments[0]?.sourceVideoId) throw new Error('原因と反応の元配信が一致しません');
    if (cause.sourceEndMs > target.reactionStartMs) throw new Error('原因と反応が重なっています');
    const sourcePath = sourcePathFor(cause.sourceVideoId);
    const stem = resultTarget.targetId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const causeVideoPath = path.join(mediaRoot, `${stem}-cause.mp4`);
    const reactionVideoPath = path.join(mediaRoot, `${stem}-reaction.mp4`);
    console.log(`[media] ${resultTarget.targetId} cause`);
    const causeMedia = await cutMedia(sourcePath, cause.sourceStartMs, cause.sourceEndMs, causeVideoPath);
    console.log(`[media] ${resultTarget.targetId} reaction`);
    const reactionMedia = await cutMedia(sourcePath, target.reactionStartMs, target.reactionEndMs, reactionVideoPath);
    items.push({
      targetId: resultTarget.targetId,
      sourceVideoId: cause.sourceVideoId,
      candidateId: target.candidateId,
      title: target.title,
      reason: target.reason,
      machineReason: resultTarget.decision.reason,
      causeFindingId: cause.findingId,
      causeStartMs: cause.sourceStartMs,
      causeEndMs: cause.sourceEndMs,
      causeSegments: cause.causeSegments,
      reactionStartMs: target.reactionStartMs,
      reactionEndMs: target.reactionEndMs,
      reactionSegments: target.reactionSegments,
      causeVideoPath: path.relative(reviewRoot, causeVideoPath),
      reactionVideoPath: path.relative(reviewRoot, reactionVideoPath),
      causeMedia,
      reactionMedia
    });
  }
  const totalDurationMs = items.reduce((sum, item) => (
    sum + item.causeMedia.expectedDurationMs + item.reactionMedia.expectedDurationMs
  ), 0);
  const manifest = {
    kind: 'callback_detection_v001_human_review_package',
    createdAt: new Date().toISOString(),
    sourceResult: path.relative(root, resultPath),
    generationSystem: result.generationSystem,
    verificationPromptVersion: result.verificationPromptVersion,
    verificationInputVersion: result.verificationInputVersion,
    purpose: '元配信の別位置から機械が見つけた主原因を先に見せ、後の反応の本当の原因か四択で確認する。',
    choices: ['原因として正しい', '関連はあるが原因ではない', '関係ない', '判断できない'],
    humanWorkEstimate: {
      itemCount: items.length,
      estimatedMinutesPerItemUpperBound: 2,
      estimatedTotalMinutesUpperBound: items.length * 2
    },
    playback: {
      defaultRate: 1.5,
      totalDurationMs,
      durationAtDefaultRateMs: Math.round(totalDurationMs / 1.5)
    },
    answerStatus: 'awaiting-human-review',
    fixtureAndExpectedChanges: false,
    items
  };
  const reviewHtml = buildHtml(items, totalDurationMs);
  assertReviewHtml(reviewHtml, items.length);
  await Promise.all([
    writeFile(path.join(reviewRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    writeFile(path.join(reviewRoot, 'review.html'), reviewHtml, 'utf8')
  ]);
  console.log(JSON.stringify({
    status: 'ready-for-human-review',
    itemCount: items.length,
    estimatedMinutesUpperBound: items.length * 2,
    totalDurationMs,
    durationAtDefaultRateMs: Math.round(totalDurationMs / 1.5),
    reviewHtml: path.relative(root, path.join(reviewRoot, 'review.html')),
    manifest: path.relative(root, path.join(reviewRoot, 'manifest.json'))
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
