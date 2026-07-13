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
const connectionRoot = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-main-v001');
const connectionResultPath = path.join(connectionRoot, 'result.json');
const connectionManifestPath = path.join(connectionRoot, 'input-manifest.json');
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260713-trial-v001');
const manifestPath = path.join(outputRoot, 'manifest.json');
const preflightPath = path.join(outputRoot, 'preflight.json');
const htmlPath = path.join(outputRoot, 'index.html');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

const excluded = {
  fixtureId: '9dtwF5Exu5w_multiblock_material_v001',
  candidateIndex: 16,
  reason: '1つの仮区間を開始・終了の2点だけでは複数区間へ分割できないため、境界手直し試験の構造的対象外'
};

function candidateKey(fixtureId, candidateIndex) {
  return `${fixtureId}:${candidateIndex}`;
}

function taskId(fixtureId, candidateIndex) {
  return `${fixtureId}__candidate-${String(candidateIndex).padStart(3, '0')}`;
}

const html = String.raw`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>境界手直し試験 v001</title>
  <style>
    :root { color-scheme: dark; --bg:#101217; --panel:#191d25; --line:#323947; --text:#f4f6fb; --muted:#aab3c5; --accent:#74d7ff; --ok:#75e3a5; --warn:#ffcd70; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1120px; margin:0 auto; padding:20px 20px 190px; }
    .top { display:flex; gap:16px; justify-content:space-between; align-items:flex-start; }
    h1 { margin:0 0 6px; font-size:24px; }
    h2 { margin:12px 0 6px; font-size:22px; line-height:1.35; }
    p { margin:6px 0; line-height:1.6; }
    .muted { color:var(--muted); }
    .pill { border:1px solid var(--line); border-radius:999px; padding:7px 11px; white-space:nowrap; }
    .panel { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; margin-top:14px; }
    video { width:100%; max-height:58vh; background:#000; border-radius:10px; }
    .times { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:12px; }
    .time { background:#11151c; border:1px solid var(--line); padding:10px; border-radius:10px; }
    .time strong { display:block; font-size:18px; margin-top:3px; }
    .controls { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
    button, textarea { font:inherit; }
    button { color:var(--text); background:#252b36; border:1px solid #3b4555; border-radius:9px; padding:10px 13px; cursor:pointer; }
    button:hover { border-color:var(--accent); }
    button.primary { background:#155c78; border-color:#2ca3d1; font-weight:700; }
    button.ok { background:#17623c; border-color:#28a86a; font-weight:700; }
    button.warn { background:#5c4318; border-color:#b7862d; }
    button:disabled { opacity:.42; cursor:not-allowed; }
    textarea { width:100%; min-height:62px; color:var(--text); background:#11151c; border:1px solid var(--line); border-radius:9px; padding:10px; }
    .bottom { position:fixed; left:0; right:0; bottom:0; background:rgba(16,18,23,.97); border-top:1px solid var(--line); padding:12px 18px; backdrop-filter:blur(8px); }
    .bottom-inner { max-width:1120px; margin:0 auto; display:flex; gap:10px; align-items:center; }
    .bottom .spacer { flex:1; }
    .shortcut { font-size:13px; color:var(--muted); }
    #saveState { min-width:110px; text-align:right; color:var(--muted); }
    @media (max-width:700px) { .times { grid-template-columns:1fr; } .bottom-inner { flex-wrap:wrap; } .shortcut { display:none; } }
  </style>
</head>
<body>
<main>
  <div class="top">
    <div><h1>境界手直し試験 v001</h1><p class="muted">正解境界は表示していません。公開できる開始と終了を決めてください。</p></div>
    <div class="pill" id="progress">読込中</div>
  </div>
  <section class="panel">
    <div class="muted" id="source"></div>
    <h2 id="title"></h2>
    <p id="summary"></p>
  </section>
  <section class="panel">
    <video id="video" controls preload="metadata"></video>
    <div class="times">
      <div class="time"><span class="muted">現在位置</span><strong id="current">--:--.---</strong></div>
      <div class="time"><span class="muted">選択した開始</span><strong id="start">--:--.---</strong></div>
      <div class="time"><span class="muted">選択した終了</span><strong id="end">--:--.---</strong></div>
    </div>
    <div class="controls">
      <button data-step="-5">−5秒</button><button data-step="-1">−1秒</button><button data-step="-0.1">−0.1秒</button>
      <button data-step="0.1">＋0.1秒</button><button data-step="1">＋1秒</button><button data-step="5">＋5秒</button>
      <button id="jumpStart">開始へ</button><button id="jumpEnd">終了へ</button>
    </div>
    <div class="controls">
      <button class="primary" id="setStart">現在位置を開始に（I）</button>
      <button class="primary" id="setEnd">現在位置を終了に（O）</button>
      <button id="preview">選択区間を再生（P）</button>
      <button id="reset">仮区間へ戻す</button>
    </div>
  </section>
  <section class="panel">
    <label for="notes">判断メモ（任意）</label>
    <textarea id="notes" placeholder="音、映像、間合いなど、境界を決めた合図があれば残してください"></textarea>
  </section>
</main>
<div class="bottom">
  <div class="bottom-inner">
    <button id="prev">前へ</button>
    <button id="next">次へ</button>
    <button id="begin" class="ok">この候補の計測を開始</button>
    <button id="unable" class="warn" disabled>境界を決められない</button>
    <span class="shortcut">Space 再生 / I 開始 / O 終了 / P プレビュー / ←→ 1秒</span>
    <span class="spacer"></span>
    <span id="timer">未開始</span>
    <span id="saveState"></span>
    <button id="complete" class="ok" disabled>保存して次へ</button>
  </div>
</div>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const video = $('video');
  let manifest;
  let state;
  let index = 0;
  let previewing = false;
  let saveTimer;
  let tickTimer;
  let activeStartedAt;
  let hiddenStartedAt;

  const blankCounts = () => ({ setStart:0, setEnd:0, preview:0, seek:0, step:0, playPause:0, reset:0 });
  const format = (ms) => {
    if (!Number.isFinite(ms)) return '--:--.---';
    const total = Math.max(0, Math.round(ms));
    const h = Math.floor(total / 3600000);
    const m = Math.floor((total % 3600000) / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const milli = total % 1000;
    return (h ? String(h).padStart(2,'0') + ':' : '') + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + '.' + String(milli).padStart(3,'0');
  };
  const currentTask = () => manifest.tasks[index];
  const currentRecord = () => state.tasks[currentTask().id];
  const nowIso = () => new Date().toISOString();

  function ensureRecord(task) {
    if (!state.tasks[task.id]) state.tasks[task.id] = {
      taskId:task.id, fixtureId:task.fixtureId, sourceVideoId:task.sourceVideoId, candidateIndex:task.candidateIndex,
      status:'not_started', provisionalStartMs:task.provisionalStartMs, provisionalEndMs:task.provisionalEndMs,
      finalStartMs:task.provisionalStartMs, finalEndMs:task.provisionalEndMs, activeElapsedMs:0, hiddenElapsedMs:0,
      operationCounts:blankCounts(), events:[], notes:''
    };
    return state.tasks[task.id];
  }

  function flushActive() {
    const record = currentRecord();
    if (!record || record.status !== 'in_progress' || activeStartedAt == null) return;
    record.activeElapsedMs += performance.now() - activeStartedAt;
    activeStartedAt = undefined;
  }

  function resumeActive() {
    const record = currentRecord();
    if (record && record.status === 'in_progress' && !document.hidden && activeStartedAt == null) activeStartedAt = performance.now();
  }

  function event(action, detail = {}) {
    const record = currentRecord();
    if (!record || record.status === 'not_started') return;
    record.events.push({ at:nowIso(), action, currentTimeMs:Math.round(video.currentTime * 1000), startMs:record.finalStartMs, endMs:record.finalEndMs, ...detail });
    scheduleSave();
  }

  async function save() {
    flushActive();
    $('saveState').textContent = '保存中…';
    state.updatedAt = nowIso();
    const response = await fetch('/api/save', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(state) });
    if (!response.ok) throw new Error(await response.text());
    $('saveState').textContent = '保存済み';
    resumeActive();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save().catch((error) => { $('saveState').textContent = '保存失敗'; console.error(error); }), 500);
  }

  function updateTimes() {
    const record = currentRecord();
    $('current').textContent = format(video.currentTime * 1000);
    $('start').textContent = format(record.finalStartMs);
    $('end').textContent = format(record.finalEndMs);
    if (record.status === 'in_progress') {
      const active = record.activeElapsedMs + (activeStartedAt == null ? 0 : performance.now() - activeStartedAt);
      $('timer').textContent = '操作時間 ' + format(active);
    } else if (record.status === 'complete') $('timer').textContent = '完了 ' + format(record.activeElapsedMs);
    else if (record.status === 'unable') $('timer').textContent = '判断不能';
    else $('timer').textContent = '未開始';
  }

  function updateButtons() {
    const record = currentRecord();
    const running = record.status === 'in_progress';
    $('prev').disabled = running || index === 0;
    $('next').disabled = running || index === manifest.tasks.length - 1 || !['complete','unable'].includes(record.status);
    $('begin').hidden = record.status !== 'not_started';
    $('complete').disabled = !running || !(record.finalStartMs < record.finalEndMs);
    $('unable').disabled = !running;
    $('setStart').disabled = !running; $('setEnd').disabled = !running; $('preview').disabled = !running; $('reset').disabled = !running;
  }

  function loadTask(nextIndex) {
    flushActive();
    index = Math.max(0, Math.min(manifest.tasks.length - 1, nextIndex));
    const task = currentTask();
    const record = ensureRecord(task);
    $('progress').textContent = (index + 1) + ' / ' + manifest.tasks.length;
    $('source').textContent = task.fixtureLabel + ' / candidate ' + task.candidateIndex;
    $('title').textContent = task.title;
    $('summary').textContent = task.summary;
    $('notes').value = record.notes || '';
    video.src = task.videoRoute;
    video.onloadedmetadata = () => { video.currentTime = record.finalStartMs / 1000; updateTimes(); };
    updateButtons(); updateTimes(); resumeActive(); scheduleSave();
  }

  function begin() {
    const record = currentRecord();
    if (record.status !== 'not_started') return;
    record.status = 'in_progress'; record.startedAt = nowIso(); record.wallStartedAtMs = Date.now();
    activeStartedAt = performance.now();
    event('begin'); updateButtons(); updateTimes();
  }

  function setBoundary(side) {
    const record = currentRecord(); if (record.status !== 'in_progress') return;
    const value = Math.round(video.currentTime * 1000);
    if (side === 'start') { record.finalStartMs = value; record.operationCounts.setStart += 1; }
    else { record.finalEndMs = value; record.operationCounts.setEnd += 1; }
    event(side === 'start' ? 'set_start' : 'set_end'); updateTimes(); updateButtons();
  }

  function step(seconds) {
    const record = currentRecord(); if (record.status !== 'in_progress') return;
    video.currentTime = Math.max(0, video.currentTime + seconds);
    record.operationCounts.step += 1; event('step', { seconds });
  }

  function preview() {
    const record = currentRecord(); if (record.status !== 'in_progress') return;
    previewing = true; video.currentTime = record.finalStartMs / 1000; video.play();
    record.operationCounts.preview += 1; event('preview');
  }

  async function finish(status) {
    const record = currentRecord(); if (record.status !== 'in_progress') return;
    flushActive(); record.status = status; record.completedAt = nowIso(); record.wallElapsedMs = Date.now() - record.wallStartedAtMs;
    record.notes = $('notes').value; record.events.push({ at:nowIso(), action:status, currentTimeMs:Math.round(video.currentTime*1000), startMs:record.finalStartMs, endMs:record.finalEndMs });
    await save(); updateButtons(); updateTimes();
    if (index < manifest.tasks.length - 1) loadTask(index + 1);
  }

  video.addEventListener('timeupdate', () => { const r=currentRecord(); if (previewing && r && video.currentTime * 1000 >= r.finalEndMs) { video.pause(); previewing=false; } updateTimes(); });
  video.addEventListener('seeking', () => { const r=currentRecord(); if (r && r.status==='in_progress') r.operationCounts.seek += 1; });
  video.addEventListener('play', () => { const r=currentRecord(); if (r && r.status==='in_progress') { r.operationCounts.playPause += 1; event('play'); } });
  video.addEventListener('pause', () => { const r=currentRecord(); if (r && r.status==='in_progress' && !previewing) { r.operationCounts.playPause += 1; event('pause'); } });
  document.querySelectorAll('[data-step]').forEach((button) => button.addEventListener('click', () => step(Number(button.dataset.step))));
  $('jumpStart').onclick = () => { video.currentTime = currentRecord().finalStartMs / 1000; event('jump_start'); };
  $('jumpEnd').onclick = () => { video.currentTime = currentRecord().finalEndMs / 1000; event('jump_end'); };
  $('setStart').onclick = () => setBoundary('start'); $('setEnd').onclick = () => setBoundary('end'); $('preview').onclick = preview;
  $('reset').onclick = () => { const r=currentRecord(); if (r.status!=='in_progress') return; r.finalStartMs=r.provisionalStartMs; r.finalEndMs=r.provisionalEndMs; r.operationCounts.reset += 1; event('reset'); updateTimes(); };
  $('notes').oninput = () => { currentRecord().notes = $('notes').value; scheduleSave(); };
  $('begin').onclick = begin; $('complete').onclick = () => finish('complete'); $('unable').onclick = () => finish('unable'); $('prev').onclick = () => loadTask(index - 1); $('next').onclick = () => loadTask(index + 1);
  document.addEventListener('visibilitychange', () => {
    const record=currentRecord(); if (!record || record.status!=='in_progress') return;
    if (document.hidden) { flushActive(); hiddenStartedAt=Date.now(); event('hidden'); }
    else { if (hiddenStartedAt) record.hiddenElapsedMs += Date.now()-hiddenStartedAt; hiddenStartedAt=undefined; event('visible'); resumeActive(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.target === $('notes')) return;
    if (e.code==='Space') { e.preventDefault(); video.paused ? video.play() : video.pause(); }
    if (e.key==='i' || e.key==='I') setBoundary('start');
    if (e.key==='o' || e.key==='O') setBoundary('end');
    if (e.key==='p' || e.key==='P') preview();
    if (e.key==='ArrowLeft') { e.preventDefault(); step(e.shiftKey ? -5 : -1); }
    if (e.key==='ArrowRight') { e.preventDefault(); step(e.shiftKey ? 5 : 1); }
  });
  window.addEventListener('beforeunload', flushActive);

  Promise.all([fetch('/api/manifest').then(r=>r.json()), fetch('/api/state').then(r=>r.json())]).then(([m,s]) => {
    manifest=m; state=s; manifest.tasks.forEach(ensureRecord);
    const firstIncomplete=manifest.tasks.findIndex(task => !['complete','unable'].includes(state.tasks[task.id].status));
    index=firstIncomplete < 0 ? manifest.tasks.length-1 : firstIncomplete;
    loadTask(index); tickTimer=setInterval(updateTimes,250);
  }).catch(error => { document.body.textContent='読込失敗: '+error.message; });
})();
</script>
</body>
</html>
`;

async function main() {
  const [result, inputManifest] = await Promise.all([readJson(connectionResultPath), readJson(connectionManifestPath)]);
  const runOne = result.runs.filter((item) => item.runIndex === 1);
  if (result.candidates.length !== 25 || runOne.length !== 25) throw new Error(`接続候補件数不一致 candidates=${result.candidates.length} run1=${runOne.length}`);
  const inputByKey = new Map(inputManifest.inputs.map((item) => [candidateKey(item.fixtureId, item.candidateIndex), item]));
  const tasks = [];
  for (const run of runOne) {
    if (run.fixtureId === excluded.fixtureId && run.candidateIndex === excluded.candidateIndex) continue;
    if (!run.formatValid || run.selectedCutCount !== 1 || run.selectedCuts.length !== 1) throw new Error(`2点手直し不能: ${candidateKey(run.fixtureId, run.candidateIndex)}`);
    const input = inputByKey.get(candidateKey(run.fixtureId, run.candidateIndex));
    if (!input) throw new Error(`接続入力なし: ${candidateKey(run.fixtureId, run.candidateIndex)}`);
    const payload = await readJson(path.join(root, input.payloadPath));
    const theme = payload.modelInput.selectedTheme;
    const cut = run.selectedCuts[0];
    tasks.push({
      id: taskId(run.fixtureId, run.candidateIndex),
      fixtureId: run.fixtureId,
      fixtureLabel: run.fixtureId.startsWith('nOEW') ? 'マリン・ころね Raft' : 'マリン 野球ゲーム',
      sourceVideoId: payload.modelInput.sourceVideoId,
      candidateIndex: run.candidateIndex,
      title: theme.title,
      summary: theme.summary,
      provisionalStartMs: cut.sourceStartMs,
      provisionalEndMs: cut.sourceEndMs,
      videoRoute: `/video/${payload.modelInput.sourceVideoId}`,
      generationSystem: result.generationSystem,
      upstreamGenerationSystem: result.upstreamGenerationSystem,
      sourceOutputPath: run.outputPath
    });
  }
  if (tasks.length !== 24) throw new Error(`試験対象は24件で固定: actual=${tasks.length}`);
  const manifest = {
    kind: 'human_boundary_trim_trial_manifest',
    version: 'human-boundary-trim-v001',
    preparedAt: new Date().toISOString(),
    reviewer: 'kawafmm',
    taskCount: tasks.length,
    sourceCandidateCount: 25,
    structuralExclusionCount: 1,
    taskOrder: 'saved-connection-manifest-order',
    provisionalSelection: 'connection-v001 llm-v012 run-1 only',
    expectedBoundaryDataIncluded: false,
    tasks
  };
  const serialized = JSON.stringify(manifest);
  if (/targetExpected|expectedCuts|boundary-v001/i.test(serialized)) throw new Error('人間用manifestへ正解由来情報が混入');
  const preflight = {
    kind: 'human_boundary_trim_trial_preflight',
    preparedAt: new Date().toISOString(),
    sourceCandidateCount: result.candidates.length,
    runOneCount: runOne.length,
    includedTaskCount: tasks.length,
    excluded,
    allIncludedInputsFormatValid: true,
    allIncludedInputsSingleInterval: true,
    expectedBoundaryDataIncludedInManifest: false,
    generationSystem: result.generationSystem,
    status: 'pass'
  };
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(preflightPath, `${JSON.stringify(preflight, null, 2)}\n`),
    writeFile(htmlPath, html)
  ]);
  console.log(JSON.stringify({ status: 'prepared', taskCount: tasks.length, excludedCandidate: excluded, outputRoot: path.relative(root, outputRoot) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
