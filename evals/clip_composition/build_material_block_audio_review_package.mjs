import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));
const clipId = options.clipId;
const outputDir = path.join(evalRoot, 'outputs', 'block-check', clipId, options.outputId);
const videoDir = path.join(outputDir, 'videos');
const indexPath = path.join(outputDir, 'index.html');
const reportPath = path.join(evalRoot, 'reports', `material-block-audio-review-${clipId}-${options.outputId}.md`);

const simultaneousAudioJudgement = new Map([
  [32, 'not_match'],
  [41, 'not_match'],
  [43, 'match'],
  [45, 'match'],
  [47, 'match'],
  [49, 'match'],
  [57, 'not_match'],
  [59, 'match'],
  [61, 'uncertain'],
  [62, 'uncertain']
]);

const separatedAudioJudgement = new Map([
  [32, 'match'],
  [41, 'match'],
  [43, 'match'],
  [45, 'match'],
  [47, 'match'],
  [49, 'match'],
  [57, 'match'],
  [59, 'match'],
  [61, 'match'],
  [62, 'match']
]);

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つかりません');
    }
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const inlineValueIndex = item.indexOf('=');
    if (inlineValueIndex >= 0) {
      values.set(item.slice(2, inlineValueIndex), item.slice(inlineValueIndex + 1));
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }
    values.set(key, next);
    index += 1;
  }
  const clipId = sanitizePathPart(requireValue(values, 'clipId'));
  return {
    clipId,
    outputId: sanitizePathPart(values.get('outputId') ?? 'material-block-audio-review-v001'),
    materialBlocksPath: resolveWorkspacePath(requireValue(values, 'materialBlocks')),
    dpResultPath: resolveWorkspacePath(requireValue(values, 'dpResult')),
    clipMedia: resolveWorkspacePath(requireValue(values, 'clipMedia')),
    sourceMedia: resolveWorkspacePath(requireValue(values, 'sourceMedia'))
  };
}

function requireValue(values, key) {
  const value = values.get(key)?.trim();
  if (!value) {
    throw new Error(`--${key} を指定してください`);
  }
  return value;
}

function resolveWorkspacePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function sanitizePathPart(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function seconds(ms) {
  return (Math.max(0, ms) / 1000).toFixed(3);
}

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secondsPart = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${String(secondsPart).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function relativeFromOutput(filePath) {
  return path.relative(outputDir, filePath);
}

function relativeFromReport(filePath) {
  return path.relative(path.dirname(reportPath), filePath);
}

function runProcess(command, args) {
  const stdout = [];
  const stderr = [];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${Buffer.concat(stderr).toString('utf8')}`));
    });
  });
}

async function buildSingleVideo(input) {
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(input.startMs),
    '-t',
    seconds(input.durationMs),
    '-i',
    input.mediaPath,
    '-vf',
    'scale=640:-2,setpts=PTS-STARTPTS',
    '-af',
    'aformat=channel_layouts=mono,asetpts=PTS-STARTPTS',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-ac',
    '1',
    '-shortest',
    input.outPath
  ]);
}

function runByDisplayIndex(candidateRuns) {
  return new Map(candidateRuns.map((run) => [run.index + 1, run]));
}

async function buildAssets(materialBlocks, dpResult) {
  const byRun = runByDisplayIndex(dpResult.alignment?.candidateRuns ?? []);
  const blockAssets = [];
  await mkdir(videoDir, { recursive: true });
  for (const block of materialBlocks.blocks ?? []) {
    const runAssets = [];
    for (const runIndex of block.runIndexes ?? []) {
      const run = byRun.get(runIndex);
      if (!run) {
        continue;
      }
      const clipPath = path.join(videoDir, `block_${String(block.blockIndex).padStart(2, '0')}_run_${String(runIndex).padStart(3, '0')}_clip.mp4`);
      const sourcePath = path.join(videoDir, `block_${String(block.blockIndex).padStart(2, '0')}_run_${String(runIndex).padStart(3, '0')}_source.mp4`);
      await buildSingleVideo({
        mediaPath: options.clipMedia,
        startMs: run.clipStartMs,
        durationMs: run.clipDurationMs,
        outPath: clipPath
      });
      await buildSingleVideo({
        mediaPath: options.sourceMedia,
        startMs: run.sourceStartMs,
        durationMs: run.sourceDurationMs,
        outPath: sourcePath
      });
      runAssets.push({
        runIndex,
        clipStartMs: run.clipStartMs,
        clipEndMs: run.clipEndMs,
        sourceStartMs: run.sourceStartMs,
        sourceEndMs: run.sourceEndMs,
        matchedWordPairCount: run.matchedWordPairCount,
        clipPath,
        sourcePath,
        simultaneousJudgement: simultaneousAudioJudgement.get(runIndex) ?? 'unreviewed',
        separatedJudgement: separatedAudioJudgement.get(runIndex) ?? 'unreviewed'
      });
    }
    blockAssets.push({ block, runAssets });
  }
  return blockAssets;
}

function judgementText(value) {
  return {
    match: '一致',
    not_match: '不一致',
    uncertain: '判定困難',
    unreviewed: '未確認'
  }[value] ?? '未確認';
}

function html(blockAssets, materialBlocks) {
  const runCards = blockAssets.flatMap(({ block, runAssets }) => runAssets.map((asset) => `<article class="run-card" id="run-${asset.runIndex}">
  <header>
    <h2>run ${asset.runIndex}</h2>
    <span class="badge ${asset.separatedJudgement}">音声分離: ${judgementText(asset.separatedJudgement)}</span>
  </header>
  <table>
    <tr><th>block</th><td>${block.blockIndex}</td></tr>
    <tr><th>clip</th><td>${msText(asset.clipStartMs)}-${msText(asset.clipEndMs)}</td></tr>
    <tr><th>source</th><td>${msText(asset.sourceStartMs)}-${msText(asset.sourceEndMs)}</td></tr>
    <tr><th>対応語</th><td>${asset.matchedWordPairCount}</td></tr>
    <tr><th>同時再生一次判定</th><td>${judgementText(asset.simultaneousJudgement)}</td></tr>
    <tr><th>音声分離最終判定</th><td>${judgementText(asset.separatedJudgement)}</td></tr>
  </table>
  <div class="controls">
    <button type="button" data-action="play-clip" data-run="${asset.runIndex}">切り抜きだけ再生</button>
    <button type="button" data-action="play-source" data-run="${asset.runIndex}">元配信だけ再生</button>
    <button type="button" data-action="play-sequence" data-run="${asset.runIndex}">切り抜き→元配信</button>
    <button type="button" data-action="pause" data-run="${asset.runIndex}">停止</button>
  </div>
  <div class="pair">
    <figure>
      <video controls preload="metadata" data-role="clip" data-run="${asset.runIndex}" src="${relativeFromOutput(asset.clipPath)}"></video>
      <figcaption>切り抜き</figcaption>
    </figure>
    <figure>
      <video controls preload="metadata" data-role="source" data-run="${asset.runIndex}" src="${relativeFromOutput(asset.sourcePath)}"></video>
      <figcaption>元配信</figcaption>
    </figure>
  </div>
</article>`)).join('\n');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Audio-separated block review ${clipId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #111827; }
    .instructions { max-width: 980px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px 16px; margin: 12px 0 18px; }
    .run-card { border-top: 1px solid #cbd5e1; padding-top: 18px; margin-top: 22px; }
    header { display: flex; align-items: center; gap: 12px; }
    h1, h2 { margin: 0.2em 0; }
    table { border-collapse: collapse; margin: 10px 0 12px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 9px; text-align: left; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 12px; }
    button { border: 1px solid #9ca3af; background: #ffffff; padding: 7px 10px; cursor: pointer; }
    button:hover { background: #f3f4f6; }
    .pair { display: grid; grid-template-columns: repeat(2, minmax(320px, 1fr)); gap: 14px; }
    video { display: block; width: 100%; background: #0f172a; }
    figure { margin: 0; }
    figcaption { font-size: 13px; color: #374151; margin-top: 5px; }
    .badge { display: inline-block; border: 1px solid #9ca3af; padding: 3px 7px; font-size: 13px; }
    .badge.match { background: #ecfdf5; border-color: #34d399; }
    .badge.not_match { background: #fef2f2; border-color: #f87171; }
    .badge.uncertain { background: #fffbeb; border-color: #f59e0b; }
    @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>音声分離確認 ${clipId}</h1>
  <section class="instructions">
    <h2>何を見るか</h2>
    <ol>
      <li>このページは、左右同時音声で判定しづらかった候補を、切り抜き音声と元配信音声に分けて確認する。</li>
      <li>まず「切り抜き→元配信」を押し、同じ発話に聞こえるかを見る。</li>
      <li>迷ったら「切り抜きだけ」「元配信だけ」で片方ずつ再生する。片方が無音なら、その候補は判定困難として残す。</li>
      <li>ここで確認するのは素材対応の妥当性。fixture凍結やconfirmed化はまだ行わない。</li>
    </ol>
  </section>
  <p>素材境界候補: ${(materialBlocks.boundaries ?? []).length}件。2026-07-07 kawafmm確認では、音声分離版の全runが一致。</p>
  ${runCards}
  <script>
    function videos(run) {
      return {
        clip: document.querySelector('video[data-run="' + run + '"][data-role="clip"]'),
        source: document.querySelector('video[data-run="' + run + '"][data-role="source"]')
      };
    }
    function stop(video) {
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    }
    function stopBoth(run) {
      const pair = videos(run);
      stop(pair.clip);
      stop(pair.source);
    }
    async function playOne(video) {
      if (!video) return;
      video.currentTime = 0;
      await video.play();
    }
    function playSequence(run) {
      const pair = videos(run);
      stopBoth(run);
      if (!pair.clip || !pair.source) return;
      const handler = async () => {
        pair.clip.removeEventListener('ended', handler);
        pair.source.currentTime = 0;
        await pair.source.play();
      };
      pair.clip.addEventListener('ended', handler);
      pair.clip.currentTime = 0;
      pair.clip.play();
    }
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const run = button.dataset.run;
      const action = button.dataset.action;
      const pair = videos(run);
      if (action === 'pause') {
        stopBoth(run);
        return;
      }
      if (action === 'play-clip') {
        stopBoth(run);
        await playOne(pair.clip);
        return;
      }
      if (action === 'play-source') {
        stopBoth(run);
        await playOne(pair.source);
        return;
      }
      if (action === 'play-sequence') {
        playSequence(run);
      }
    });
  </script>
</body>
</html>
`;
}

function markdown(blockAssets) {
  const lines = [
    '# 音声分離確認パッケージ',
    '',
    `- 対象: ${clipId}`,
    `- HTML: ${path.relative(evalRoot, indexPath)}`,
    '- fixture/expected作成: なし',
    '- confirmedペア変更: なし',
    '- 本体側変更: なし',
    '',
    '## 作成理由',
    '',
    '左右同時音声の確認では、画面変化が少ない候補や片側が無音の候補を人間が判定しづらい。そこで、候補ごとに切り抜き側と元配信側を別動画として切り出し、HTML上で片方ずつ、または切り抜き→元配信の順で再生できるようにした。',
    '',
    '## 人間確認結果',
    '',
    '- 確認日: 2026-07-07',
    '- 確認者: kawafmm',
    '- 確認手段: 音声分離確認パッケージ(v002)',
    '- 結論: 全run一致',
    '',
    '| run | 音声分離最終判定 | 同時再生一次判定 | clip | source | 対応語 |',
    '| ---: | --- | --- | --- | --- | ---: |'
  ];
  for (const { runAssets } of blockAssets) {
    for (const asset of runAssets) {
      lines.push(`| ${asset.runIndex} | ${judgementText(asset.separatedJudgement)} | ${judgementText(asset.simultaneousJudgement)} | ${msText(asset.clipStartMs)}-${msText(asset.clipEndMs)} | ${msText(asset.sourceStartMs)}-${msText(asset.sourceEndMs)} | ${asset.matchedWordPairCount} |`);
    }
  }
  lines.push(
    '',
    '## 判定上の注意',
    '',
    '- ここでの問いは、素材対応の妥当性であり、境界確定ではない。',
    '- 同時再生の一次判定では不一致/判定困難が出たが、画面変化が少なく音声が重なる確認方法の問題だった。音声分離版では全run一致。',
    '- このパッケージ作成によってfixture/expectedは更新していない。'
  );
  lines.push(
    '',
    '## 動画',
    ''
  );
  for (const { runAssets } of blockAssets) {
    for (const asset of runAssets) {
      lines.push(`- run ${asset.runIndex}: clip \`${relativeFromReport(asset.clipPath)}\` / source \`${relativeFromReport(asset.sourcePath)}\``);
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const materialBlocks = await readJson(options.materialBlocksPath);
  const dpResult = await readJson(options.dpResultPath);
  const blockAssets = await buildAssets(materialBlocks, dpResult);
  await writeFile(indexPath, html(blockAssets, materialBlocks));
  await writeFile(reportPath, markdown(blockAssets));
  console.log(JSON.stringify({
    index: path.relative(root, indexPath),
    report: path.relative(root, reportPath),
    videoCount: blockAssets.reduce((count, block) => count + block.runAssets.length * 2, 0)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
