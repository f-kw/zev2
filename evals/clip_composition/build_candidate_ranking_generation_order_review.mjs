#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const rankingRoot = path.join(evalRoot, 'outputs', 'candidate-ranking');
const deskPath = path.join(rankingRoot, '20260713-signal-desk-check-v001', 'result.json');
const previousHumanPath = path.join(rankingRoot, '20260713-title-reason-run1-v001', 'human-review-unlabeled-v001', 'human-review-result.json');
const outputRoot = path.join(rankingRoot, '20260713-title-reason-run1-v001', 'human-review-generation-order-v001');
const mediaRoot = path.join(outputRoot, 'media');
const sources = {
  nOEWCNc77MI_multiblock_material_v001: {
    label: 'B素材（マリン・ころね Raft）', short: 'B', sourceVideoId: 'YE-faluP7zY',
    themeOutputPath: path.join(evalRoot, 'outputs', 'theme-generation', 'nOEWCNc77MI_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260711-chat-velocity-top100-v001', 'run-01-gemini-output.json'),
    sourcePath: path.join(evalRoot, 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4')
  },
  '9dtwF5Exu5w_multiblock_material_v001': {
    label: '第二素材（マリン野球ゲーム）', short: 'second', sourceVideoId: 'o8rZAhARXAc',
    themeOutputPath: path.join(evalRoot, 'outputs', 'theme-generation', '9dtwF5Exu5w_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260712-chat-velocity-top100-generalization-v001', 'run-01-gemini-output.json'),
    sourcePath: path.join(evalRoot, 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')
  }
};
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function run(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let stdout = '';
    let stderr = '';
    if (capture) {
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
    }
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} failed: ${code}\n${stderr}`)));
  });
}

async function durationMs(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], true);
  const value = Number(stdout.trim());
  if (!Number.isFinite(value)) throw new Error(`再生時間不明: ${file}`);
  return Math.round(value * 1000);
}

async function cutMedia(item) {
  const source = sources[item.fixtureId];
  const stem = `${source.short}-candidate-${String(item.candidateId).padStart(2, '0')}`;
  const segments = [];
  for (const [index, range] of item.sourceRanges.entries()) {
    const segmentStem = item.sourceRanges.length === 1 ? stem : `${stem}-part-${index + 1}`;
    const videoPath = path.join(mediaRoot, `${segmentStem}.mp4`);
    const audioPath = path.join(mediaRoot, `${segmentStem}.m4a`);
    const start = range.sourceStartMs / 1000;
    const length = (range.sourceEndMs - range.sourceStartMs) / 1000;
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(start), '-t', String(length), '-i', source.sourcePath, '-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', videoPath]);
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(start), '-t', String(length), '-i', source.sourcePath, '-vn', '-c:a', 'aac', '-b:a', '96k', audioPath]);
    const expectedDurationMs = range.sourceEndMs - range.sourceStartMs;
    const [videoDurationMs, audioDurationMs] = await Promise.all([durationMs(videoPath), durationMs(audioPath)]);
    if (Math.abs(videoDurationMs - expectedDurationMs) > 500 || Math.abs(audioDurationMs - expectedDurationMs) > 500) throw new Error(`${segmentStem} 再生時間不一致`);
    segments.push({
      sourceStartMs: range.sourceStartMs,
      sourceEndMs: range.sourceEndMs,
      videoPath: path.relative(outputRoot, videoPath),
      audioPath: path.relative(outputRoot, audioPath),
      expectedDurationMs,
      videoDurationMs,
      audioDurationMs
    });
  }
  return { ...item, segments, expectedDurationMs: segments.reduce((sum, segment) => sum + segment.expectedDurationMs, 0) };
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function durationText(ms) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`;
}

function html(items, totalDurationMs) {
  const itemJson = JSON.stringify(items.map(({ fixtureId, candidateId, title }) => ({ fixtureId, candidateId, title }))).replace(/</g, '\\u003c');
  const cards = items.map((item, index) => `<article class="case" data-index="${index}" hidden>
  <p class="counter">確認 ${index + 1}/${items.length}　${escapeHtml(item.fixtureLabel)}</p>
  <h2>${escapeHtml(item.title)}</h2>
  <p><strong>候補になった理由:</strong> ${escapeHtml(item.reason)}</p>
  ${item.segments.map((segment, segmentIndex) => `<div class="media"><section><h3>動画${item.segments.length > 1 ? ` ${segmentIndex + 1}/${item.segments.length}` : ''}</h3><video controls preload="metadata" src="${escapeHtml(segment.videoPath)}"></video></section><section><h3>音声のみ</h3><p>左の動画と同じ区間です。両方の再生は不要です。</p><audio controls preload="metadata" src="${escapeHtml(segment.audioPath)}"></audio></section></div>`).join('\n')}
</article>`).join('\n');
  const options = items.map((item, index) => `<option value="${index}">確認${index + 1}: ${escapeHtml(item.title)}</option>`).join('');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>生成順上位の未監査6件</title>
<style>
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d1117;color:#f0f3f6}*{box-sizing:border-box}body{margin:0;padding-bottom:150px}header,main{width:min(1040px,calc(100% - 28px));margin:auto}header{padding:26px 0 14px}.lead{line-height:1.7;color:#c9d1d9}.notice,.case,.complete{border:1px solid #30363d;border-radius:16px;background:#161b22;padding:18px}.progress{display:flex;gap:10px;align-items:center;margin:16px 0}progress{width:100%}.counter{color:#7ee787;font-weight:700}h2{font-size:clamp(22px,3vw,32px)}.media{display:grid;grid-template-columns:2fr 1fr;gap:18px}.media section{background:#0d1117;padding:12px;border-radius:12px}.media p{color:#8b949e}video,audio{width:100%}video{max-height:58vh;background:#000}.bar{position:fixed;left:0;right:0;bottom:0;background:rgba(13,17,23,.96);border-top:1px solid #30363d;padding:12px max(14px,calc((100vw - 1040px)/2));z-index:10}.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}button{border:1px solid #484f58;border-radius:11px;padding:14px;color:#fff;background:#21262d;font-weight:700;font-size:16px;cursor:pointer}button[data-value=publish]{background:#1f6f3f}button[data-value=okay_skip]{background:#6b5419}button[data-value=boring]{background:#6e3030}.active{outline:3px solid #58a6ff}.nav{display:flex;justify-content:space-between;align-items:center;margin-top:9px}.nav button{padding:8px 16px;font-size:14px}textarea{width:100%;min-height:200px;background:#0d1117;color:#fff;margin-top:12px}@media(max-width:760px){.media,.choices{grid-template-columns:1fr}body{padding-bottom:260px}}
</style></head><body><header><h1>生成順上位・未監査6件の確認</h1>
<p class="lead">生成順（何も並べ替えない基準）を意味順位と公平に比較するための確認です。境界や既存切り抜きとの一致は見ず、Vtuber切り抜きとして公開したいかだけを三択で答えてください。</p>
<div class="notice"><strong>人間作業:</strong> 新規6件×1分弱＝約6分。生成順の未ラベルは7件ですが、第二素材candidate 4は前回の「悪くないが選ばない」を再利用します。素材総尺${durationText(totalDurationMs)}、初期1.5倍なら${durationText(Math.round(totalDurationMs / 1.5))}です。</div>
<div class="progress"><progress id="progress" max="${items.length}" value="0"></progress><span id="progressText">0/${items.length}</span></div></header><main>${cards}
<section id="complete" class="complete" hidden><h2>回答完了</h2><p id="elapsed"></p><button id="copy">回答をコピー</button><p><select id="editIndex">${options}</select> <button id="edit">選んだ回答を修正</button></p><textarea id="output" readonly></textarea></section></main>
<div id="bar" class="bar"><div class="choices"><button data-value="publish">公開したい</button><button data-value="okay_skip">悪くないが選ばない</button><button data-value="boring">つまらない</button></div><div class="nav"><button id="prev">前へ</button><span id="status">未回答</span><button id="next">次へ</button></div></div>
<script>
const items=${itemJson},labels={publish:'公開したい',okay_skip:'悪くないが選ばない',boring:'つまらない'},key='zev-generation-order-review-v001';let state={current:0,answers:{}};try{state={...state,...(JSON.parse(localStorage.getItem(key))||{})}}catch{};const cards=[...document.querySelectorAll('.case')],media=[...document.querySelectorAll('video,audio')];media.forEach(x=>{x.defaultPlaybackRate=1.5;x.playbackRate=1.5});function save(){localStorage.setItem(key,JSON.stringify(state))}if(!state.startedAt){state.startedAt=new Date().toISOString();save()}function count(){return Object.keys(state.answers).length}function elapsed(){const end=state.completedAt?new Date(state.completedAt).getTime():Date.now(),s=Math.max(0,Math.round((end-new Date(state.startedAt).getTime())/1000));return Math.floor(s/60)+'分'+String(s%60).padStart(2,'0')+'秒'}function output(){const lines=['candidate-ranking 生成順未監査6件 人間確認結果','確認者: kawafmm','確認日: 2026-07-13','実測: '+elapsed(),'','再利用: 9dtwF5Exu5w_multiblock_material_v001 / candidate 4 / 悪くないが選ばない'];items.forEach((x,i)=>lines.push('確認'+(i+1)+': '+(labels[state.answers[i]]||'未回答')+' / '+x.fixtureId+' / candidate '+x.candidateId+' / '+x.title));return lines.join('\\n')}function render(){const done=count()===items.length;if(done&&!state.completedAt){state.completedAt=new Date().toISOString();save()}cards.forEach((x,i)=>x.hidden=done||i!==state.current);document.getElementById('complete').hidden=!done;document.getElementById('bar').hidden=done;document.getElementById('progress').value=count();document.getElementById('progressText').textContent=count()+'/'+items.length;if(done){document.getElementById('elapsed').textContent='実測: '+elapsed();document.getElementById('output').value=output()}else{const a=state.answers[state.current];document.querySelectorAll('[data-value]').forEach(b=>b.classList.toggle('active',b.dataset.value===a));document.getElementById('status').textContent=a?labels[a]:'未回答';document.getElementById('prev').disabled=state.current===0;document.getElementById('next').disabled=state.current===items.length-1}}document.querySelectorAll('[data-value]').forEach(b=>b.addEventListener('click',()=>{state.answers[state.current]=b.dataset.value;media.forEach(x=>x.pause());if(state.current<items.length-1)state.current+=1;save();render();scrollTo({top:0,behavior:'smooth'})}));document.getElementById('prev').onclick=()=>{state.current=Math.max(0,state.current-1);save();render()};document.getElementById('next').onclick=()=>{state.current=Math.min(items.length-1,state.current+1);save();render()};document.getElementById('copy').onclick=async()=>{const text=output(),box=document.getElementById('output');box.value=text;try{await navigator.clipboard.writeText(text)}catch{box.focus();box.select();document.execCommand('copy')}};document.getElementById('edit').onclick=()=>{const i=Number(document.getElementById('editIndex').value);delete state.answers[i];state.current=i;state.completedAt=null;save();render()};render();
</script></body></html>`;
}

async function main() {
  const [desk, previous] = await Promise.all([readJson(deskPath), readJson(previousHumanPath)]);
  const previousByKey = new Map(previous.items.map((item) => [`${item.fixtureId}:${item.candidateId}`, item]));
  const items = [];
  const reusedHumanAnswers = [];
  for (const fixture of desk.fixtures) {
    const source = sources[fixture.fixtureId];
    const raw = await readJson(source.themeOutputPath);
    const generation = fixture.rankings.find((ranking) => ranking.name === 'generation_order');
    for (const ranked of generation.top5) {
      if (ranked.hitExpectedIndexes.length > 0) continue;
      const prior = previousByKey.get(`${fixture.fixtureId}:${ranked.candidateIndex}`);
      if (prior) {
        reusedHumanAnswers.push({ fixtureId: prior.fixtureId, candidateId: prior.candidateId, title: prior.title, answer: prior.answer, answerLabel: prior.answerLabel, sourceReviewId: previous.reviewId });
        continue;
      }
      const theme = raw.themes[ranked.candidateIndex - 1];
      if (!theme || theme.title !== ranked.title || !Array.isArray(theme.evidenceRanges) || theme.evidenceRanges.length === 0) throw new Error(`${fixture.fixtureId} candidate ${ranked.candidateIndex} 対応不正`);
      for (const range of theme.evidenceRanges) {
        if (range.sourceVideoId !== source.sourceVideoId || range.sourceEndMs <= range.sourceStartMs) throw new Error(`${fixture.fixtureId} candidate ${ranked.candidateIndex} 根拠範囲不正`);
      }
      items.push({
        fixtureId: fixture.fixtureId,
        fixtureLabel: source.label,
        candidateId: ranked.candidateIndex,
        title: theme.title,
        reason: theme.reason,
        sourceVideoId: source.sourceVideoId,
        sourceRanges: theme.evidenceRanges.map(({ sourceStartMs, sourceEndMs }) => ({ sourceStartMs, sourceEndMs }))
      });
    }
  }
  if (items.length !== 6 || reusedHumanAnswers.length !== 1) throw new Error(`対象件数不正: new=${items.length} reused=${reusedHumanAnswers.length}`);
  await mkdir(mediaRoot, { recursive: true });
  const built = [];
  for (const item of items) {
    console.log(`[media] ${item.fixtureId} candidate ${item.candidateId}`);
    built.push(await cutMedia(item));
  }
  const totalDurationMs = built.reduce((sum, item) => sum + item.expectedDurationMs, 0);
  const manifest = {
    kind: 'candidate_ranking_generation_order_human_review_package',
    packageId: '20260713-generation-order-unreviewed-v001',
    createdAt: new Date().toISOString(),
    purpose: '生成順上位5の未ラベル候補を三択監査し、v001/v002と同じ混成打率で比較できる基準を作る。',
    humanWorkEstimate: { newItemCount: 6, estimatedMinutesPerItemUpperBound: 1, estimatedTotalMinutes: 6, reusedAnswerCount: 1 },
    playback: { defaultRate: 1.5, sourceTotalDurationMs: totalDurationMs, durationAtDefaultRateMs: Math.round(totalDurationMs / 1.5) },
    knownHitExcludedFromHumanReview: true,
    reusedHumanAnswers,
    answerStatus: 'awaiting-human-review',
    fixtureAndExpectedChanges: false,
    items: built
  };
  await Promise.all([
    writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(outputRoot, 'review.html'), html(built, totalDurationMs))
  ]);
  console.log(JSON.stringify({ status: 'ready-for-human-review', reviewHtml: path.relative(root, path.join(outputRoot, 'review.html')), newItems: built.length, reusedAnswers: reusedHumanAnswers.length, totalDurationMs, durationAtDefaultRateMs: Math.round(totalDurationMs / 1.5) }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
