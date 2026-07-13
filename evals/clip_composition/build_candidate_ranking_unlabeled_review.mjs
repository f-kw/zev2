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
const experimentRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-title-reason-run1-v001');
const resultPath = path.join(experimentRoot, 'result.json');
const reviewRoot = path.join(experimentRoot, 'human-review-unlabeled-v001');
const mediaRoot = path.join(reviewRoot, 'media');

const sources = {
  nOEWCNc77MI_multiblock_material_v001: {
    label: 'B素材（マリン・ころね Raft）',
    themeOutputPath: path.join(evalRoot, 'outputs', 'theme-generation', 'nOEWCNc77MI_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260711-chat-velocity-top100-v001', 'run-01-gemini-output.json'),
    sourceVideoId: 'YE-faluP7zY',
    sourcePath: path.join(evalRoot, 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4')
  },
  '9dtwF5Exu5w_multiblock_material_v001': {
    label: '第二素材（マリン野球ゲーム）',
    themeOutputPath: path.join(evalRoot, 'outputs', 'theme-generation', '9dtwF5Exu5w_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260712-chat-velocity-top100-generalization-v001', 'run-01-gemini-output.json'),
    sourceVideoId: 'o8rZAhARXAc',
    sourcePath: path.join(evalRoot, 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')
  }
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
  const { stdout } = await runProcess('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file
  ], true);
  const duration = Number(stdout.trim());
  if (!Number.isFinite(duration)) throw new Error(`再生時間を取得できません: ${file}`);
  return Math.round(duration * 1000);
}

async function buildMedia(item) {
  const source = sources[item.fixtureId];
  if (!existsSync(source.sourcePath)) throw new Error(`元動画なし: ${source.sourcePath}`);
  const startSec = item.sourceStartMs / 1000;
  const durationSec = (item.sourceEndMs - item.sourceStartMs) / 1000;
  const stem = `${item.fixtureShort}-candidate-${String(item.candidateId).padStart(2, '0')}`;
  const videoPath = path.join(mediaRoot, `${stem}.mp4`);
  const audioPath = path.join(mediaRoot, `${stem}.m4a`);
  await runProcess('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(startSec), '-t', String(durationSec), '-i', source.sourcePath,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', "scale='min(1280,iw)':-2",
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', videoPath
  ]);
  await runProcess('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(startSec), '-t', String(durationSec), '-i', source.sourcePath,
    '-vn', '-c:a', 'aac', '-b:a', '96k', audioPath
  ]);
  const [videoDurationMs, audioDurationMs] = await Promise.all([
    mediaDurationMs(videoPath), mediaDurationMs(audioPath)
  ]);
  const expectedDurationMs = item.sourceEndMs - item.sourceStartMs;
  if (Math.abs(videoDurationMs - expectedDurationMs) > 500 || Math.abs(audioDurationMs - expectedDurationMs) > 500) {
    throw new Error(`${stem} の切り出し時間不一致: expected=${expectedDurationMs} video=${videoDurationMs} audio=${audioDurationMs}`);
  }
  return {
    ...item,
    videoPath: path.relative(reviewRoot, videoPath),
    audioPath: path.relative(reviewRoot, audioPath),
    expectedDurationMs,
    videoDurationMs,
    audioDurationMs
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function timeText(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function durationText(ms) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}分${String(total % 60).padStart(2, '0')}秒`;
}

function buildHtml(items, totalDurationMs) {
  const editOptions = items.map((item, index) => `<option value="${index}">確認${index + 1}: ${escapeHtml(item.title)}</option>`).join('');
  const cards = items.map((item, index) => `
    <article class="case" data-index="${index}" hidden>
      <div class="case-number">確認 ${index + 1} / ${items.length}　${escapeHtml(item.fixtureLabel)}</div>
      <h2>${escapeHtml(item.title)}</h2>
      <p class="reason"><strong>候補になった理由:</strong> ${escapeHtml(item.reason)}</p>
      <p class="meta">元配信 ${escapeHtml(timeText(item.sourceStartMs))}〜${escapeHtml(timeText(item.sourceEndMs))}・${escapeHtml(durationText(item.expectedDurationMs))}</p>
      <div class="media-grid">
        <section>
          <h3>動画で確認</h3>
          <video controls preload="metadata" src="${escapeHtml(item.videoPath)}"></video>
        </section>
        <section class="audio-box">
          <h3>音声だけで確認</h3>
          <p>動画と同じ区間です。両方を再生する必要はありません。</p>
          <audio controls preload="metadata" src="${escapeHtml(item.audioPath)}"></audio>
        </section>
      </div>
    </article>`).join('\n');
  const itemJson = JSON.stringify(items.map((item) => ({
    fixtureId: item.fixtureId,
    fixtureLabel: item.fixtureLabel,
    candidateId: item.candidateId,
    title: item.title,
    reason: item.reason,
    sourceVideoId: item.sourceVideoId,
    sourceStartMs: item.sourceStartMs,
    sourceEndMs: item.sourceEndMs
  }))).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>candidate-ranking-v001 未ラベル8件確認</title>
  <style>
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#0d1117; color:#f0f3f6; }
    * { box-sizing:border-box; }
    body { margin:0; padding-bottom:150px; }
    header, main { width:min(1040px, calc(100% - 28px)); margin:0 auto; }
    header { padding:28px 0 16px; }
    h1 { margin:0 0 12px; font-size:clamp(24px,4vw,38px); }
    .lead { color:#c9d1d9; line-height:1.7; }
    .notice { background:#161b22; border:1px solid #30363d; border-radius:14px; padding:14px 18px; line-height:1.65; }
    .progress { margin:18px 0; display:flex; gap:10px; align-items:center; }
    progress { width:100%; height:16px; }
    .case { background:#161b22; border:1px solid #30363d; border-radius:18px; padding:clamp(18px,3vw,32px); }
    .case-number { color:#7ee787; font-weight:700; }
    h2 { font-size:clamp(22px,3vw,32px); line-height:1.35; }
    .reason { font-size:17px; line-height:1.75; }
    .meta { color:#8b949e; }
    .media-grid { display:grid; grid-template-columns:minmax(0, 2fr) minmax(260px, 1fr); gap:18px; margin-top:22px; }
    video { width:100%; max-height:58vh; background:#000; border-radius:12px; }
    audio { width:100%; }
    .audio-box { background:#0d1117; border-radius:12px; padding:14px; align-self:start; }
    .audio-box p { color:#8b949e; line-height:1.5; }
    .decision-bar { position:fixed; z-index:10; left:0; right:0; bottom:0; background:rgba(13,17,23,.96); border-top:1px solid #30363d; padding:12px max(14px, calc((100vw - 1040px)/2)); backdrop-filter:blur(10px); }
    .choices { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    button { border:1px solid #484f58; border-radius:12px; padding:15px 10px; color:#f0f3f6; background:#21262d; font-weight:700; font-size:16px; cursor:pointer; }
    button:hover { border-color:#8b949e; }
    button.active { outline:3px solid #58a6ff; }
    button[data-value="publish"] { background:#1f6f3f; }
    button[data-value="okay_skip"] { background:#6b5419; }
    button[data-value="boring"] { background:#6e3030; }
    .nav { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:10px; }
    .nav button { padding:9px 18px; font-size:14px; }
    #finish { background:#1f6feb; }
    #outputBox { width:100%; min-height:210px; margin-top:16px; background:#0d1117; color:#f0f3f6; border:1px solid #30363d; border-radius:10px; padding:12px; }
    .complete { background:#12261b; border:1px solid #2ea043; border-radius:14px; padding:18px; }
    @media(max-width:760px) { .media-grid { grid-template-columns:1fr; } .choices { grid-template-columns:1fr; } body { padding-bottom:260px; } }
  </style>
</head>
<body>
  <header>
    <h1>未ラベル候補 8件の確認</h1>
    <p class="lead">目的は、既存切り抜きと重ならなかった上位候補に公開価値があるかを見ることです。境界の細かさや既存正解との一致は見ません。動画か音声のどちらかで内容を確認し、三択を1つ選んでください。</p>
    <div class="notice">
      <strong>人間作業の登録:</strong> 8件×約1分＝約8分。素材総尺は${escapeHtml(durationText(totalDurationMs))}なので、初期再生速度を1.5倍（全編約${escapeHtml(durationText(Math.round(totalDurationMs / 1.5))) }）にしています。聞き取りにくい場合だけ速度を戻してください。<br>
      選ぶと自動で次へ進み、回答はこのブラウザ内へ保存されます。
    </div>
    <div class="progress"><progress id="progress" max="${items.length}" value="0"></progress><span id="progressText">0/${items.length}</span></div>
  </header>
  <main>${cards}
    <section id="complete" class="complete" hidden>
      <h2>8件の回答が揃いました</h2>
      <p id="elapsed"></p>
      <p>下の「回答をコピー」を押して、そのままチャットへ貼り付けてください。</p>
      <button id="copy">回答をコピー</button>
      <p><select id="editIndex">${editOptions}</select> <button id="editAnswer">選んだ回答を修正</button></p>
      <textarea id="outputBox" readonly></textarea>
    </section>
  </main>
  <div class="decision-bar" id="decisionBar">
    <div class="choices">
      <button data-value="publish">公開したい</button>
      <button data-value="okay_skip">悪くないが選ばない</button>
      <button data-value="boring">つまらない</button>
    </div>
    <div class="nav"><button id="prev">前へ</button><span id="currentStatus">未回答</span><button id="next">次へ</button></div>
  </div>
  <script>
    const items = ${itemJson};
    const storageKey = 'zev-candidate-ranking-unlabeled-v001';
    const labels = { publish:'公開したい', okay_skip:'悪くないが選ばない', boring:'つまらない' };
    let state = { current:0, answers:{} };
    try { state = { ...state, ...(JSON.parse(localStorage.getItem(storageKey)) || {}) }; } catch {}
    const cards = [...document.querySelectorAll('.case')];
    const media = [...document.querySelectorAll('video,audio')];
    media.forEach((element) => { element.defaultPlaybackRate = 1.5; element.playbackRate = 1.5; });
    function save() { localStorage.setItem(storageKey, JSON.stringify(state)); }
    if (!state.startedAt) { state.startedAt = new Date().toISOString(); save(); }
    function answeredCount() { return Object.keys(state.answers).length; }
    function pauseAll() { media.forEach((element) => element.pause()); }
    function elapsedText() {
      const end = state.completedAt ? new Date(state.completedAt).getTime() : Date.now();
      const seconds = Math.max(0, Math.round((end - new Date(state.startedAt).getTime()) / 1000));
      return Math.floor(seconds / 60) + '分' + String(seconds % 60).padStart(2, '0') + '秒';
    }
    function buildOutput() {
      const lines = ['candidate-ranking-v001 未ラベル8件 人間確認結果','確認者: kawafmm','確認日: 2026-07-13','実測(画面を開いてから回答完了): ' + elapsedText(),''];
      items.forEach((item, index) => lines.push('確認' + (index + 1) + ': ' + (labels[state.answers[index]] || '未回答') + ' / ' + item.fixtureId + ' / candidate ' + item.candidateId + ' / ' + item.title));
      lines.push('', '公開したい: ' + (items.map((_,i)=>i).filter(i=>state.answers[i]==='publish').map(i=>i+1).join(', ') || 'なし'));
      lines.push('悪くないが選ばない: ' + (items.map((_,i)=>i).filter(i=>state.answers[i]==='okay_skip').map(i=>i+1).join(', ') || 'なし'));
      lines.push('つまらない: ' + (items.map((_,i)=>i).filter(i=>state.answers[i]==='boring').map(i=>i+1).join(', ') || 'なし'));
      return lines.join('\\n');
    }
    function render() {
      const done = answeredCount() === items.length;
      if (done && !state.completedAt) { state.completedAt = new Date().toISOString(); save(); }
      cards.forEach((card,index) => { card.hidden = done || index !== state.current; });
      document.getElementById('complete').hidden = !done;
      document.getElementById('decisionBar').hidden = done;
      document.getElementById('progress').value = answeredCount();
      document.getElementById('progressText').textContent = answeredCount() + '/' + items.length;
      if (done) {
        document.getElementById('outputBox').value = buildOutput();
        document.getElementById('elapsed').textContent = '画面を開いてから回答完了まで: ' + elapsedText();
      }
      if (!done) {
        const answer = state.answers[state.current];
        document.querySelectorAll('[data-value]').forEach((button) => button.classList.toggle('active', button.dataset.value === answer));
        document.getElementById('currentStatus').textContent = answer ? labels[answer] : '未回答';
        document.getElementById('prev').disabled = state.current === 0;
        document.getElementById('next').disabled = state.current === items.length - 1;
      }
    }
    document.querySelectorAll('[data-value]').forEach((button) => button.addEventListener('click', () => {
      state.answers[state.current] = button.dataset.value;
      pauseAll();
      if (state.current < items.length - 1) state.current += 1;
      save(); render(); window.scrollTo({top:0,behavior:'smooth'});
    }));
    document.getElementById('prev').addEventListener('click', () => { pauseAll(); state.current=Math.max(0,state.current-1); save(); render(); });
    document.getElementById('next').addEventListener('click', () => { pauseAll(); state.current=Math.min(items.length-1,state.current+1); save(); render(); });
    document.getElementById('copy').addEventListener('click', async () => {
      const text = buildOutput();
      document.getElementById('outputBox').value = text;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const box = document.getElementById('outputBox');
        box.focus(); box.select(); document.execCommand('copy');
      }
      document.getElementById('copy').textContent = 'コピーしました';
    });
    document.getElementById('editAnswer').addEventListener('click', () => {
      const index = Number(document.getElementById('editIndex').value);
      delete state.answers[index];
      state.current = index;
      state.completedAt = null;
      save(); render();
    });
    render();
  </script>
</body>
</html>`;
}

async function main() {
  const ranking = await readJson(resultPath);
  await mkdir(mediaRoot, { recursive: true });
  const items = [];
  for (const fixture of ranking.fixtures) {
    const source = sources[fixture.fixtureId];
    if (!source) throw new Error(`source設定なし: ${fixture.fixtureId}`);
    const raw = await readJson(source.themeOutputPath);
    for (const discovery of fixture.nonHitDiscoveries) {
      const theme = raw.themes[discovery.candidateId - 1];
      if (!theme || theme.title !== discovery.title || theme.reason !== discovery.sourceReason) {
        throw new Error(`${fixture.fixtureId} candidate ${discovery.candidateId} の対応不一致`);
      }
      if (!Array.isArray(theme.evidenceRanges) || theme.evidenceRanges.length !== 1) {
        throw new Error(`${fixture.fixtureId} candidate ${discovery.candidateId} は単一範囲ではない`);
      }
      const range = theme.evidenceRanges[0];
      if (range.sourceVideoId !== source.sourceVideoId || range.sourceEndMs <= range.sourceStartMs) {
        throw new Error(`${fixture.fixtureId} candidate ${discovery.candidateId} の範囲不正`);
      }
      items.push({
        fixtureId: fixture.fixtureId,
        fixtureShort: fixture.fixtureId.startsWith('nOEW') ? 'B' : 'second',
        fixtureLabel: source.label,
        candidateId: discovery.candidateId,
        title: discovery.title,
        reason: discovery.sourceReason,
        selectionReason: discovery.selectionReason,
        sourceVideoId: range.sourceVideoId,
        sourceStartMs: range.sourceStartMs,
        sourceEndMs: range.sourceEndMs
      });
    }
  }
  if (items.length !== 8) throw new Error(`未ラベル候補が8件ではない: ${items.length}`);
  const built = [];
  for (const item of items) {
    console.log(`[media] ${item.fixtureShort} candidate ${item.candidateId}`);
    built.push(await buildMedia(item));
  }
  const totalDurationMs = built.reduce((sum, item) => sum + item.expectedDurationMs, 0);
  const manifest = {
    kind: 'candidate_ranking_unlabeled_human_review_package',
    packageId: '20260713-unlabeled-top5-review-v001',
    createdAt: new Date().toISOString(),
    sourceExperiment: path.relative(root, experimentRoot),
    purpose: '意味順位の上位5へ入った非hit候補8件を、誤りと決めず公開価値で三択評価する。',
    choices: ['公開したい', '悪くないが選ばない', 'つまらない'],
    humanWorkEstimate: { itemCount: 8, estimatedMinutesPerItem: 1, estimatedTotalMinutes: 8 },
    playback: { defaultRate: 1.5, sourceTotalDurationMs: totalDurationMs, durationAtDefaultRateMs: Math.round(totalDurationMs / 1.5) },
    answerStatus: 'awaiting-human-review',
    fixtureAndExpectedChanges: false,
    items: built
  };
  await Promise.all([
    writeFile(path.join(reviewRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(reviewRoot, 'review.html'), buildHtml(built, totalDurationMs))
  ]);
  console.log(JSON.stringify({
    status: 'ready-for-human-review',
    reviewHtml: path.relative(root, path.join(reviewRoot, 'review.html')),
    manifest: path.relative(root, path.join(reviewRoot, 'manifest.json')),
    itemCount: built.length,
    sourceTotalDurationMs: totalDurationMs,
    durationAtDefaultRateMs: Math.round(totalDurationMs / 1.5)
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
