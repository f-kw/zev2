import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const clipId = 'r_ztjHaHmcg';
const sourceId = '-DwSCDMCWDQ';
const outputId = '20260706-final-block-boundary-motion-v001';

const boundaries = {
  clipNewStartMs: 87475,
  clipOldStartMs: 92555,
  sourceNewStartMs: 2399621,
  sourceOldStartMs: 2404730,
  clipEndMs: 121147,
  sourceOldEndMs: 2433322,
  sourceNewEndLastWordStartMs: 2436085,
  sourceNewEndMs: 2440868
};

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const clipMedia = path.join(evalRoot, 'research', 'downloads', clipId, `${clipId}.mp4`);
const sourceMedia = path.join(evalRoot, 'research', 'downloads', clipId, 'sources', sourceId, `${sourceId}.mp4`);
const packageDir = path.join(evalRoot, 'outputs', 'boundary-check', clipId, outputId);
const videoDir = path.join(packageDir, 'videos');
const reportPath = path.join(evalRoot, 'reports', `boundary-motion-verification-${clipId}-${outputId}.md`);
const indexPath = path.join(packageDir, 'index.html');

const comparisons = [
  {
    id: 'start_new_pair_pm2s',
    label: '開始 新仮説: clip 1:27.475 / source 39:59.621',
    purpose: '新開始候補同士を同じ相対位置で再生する。発話開始と動きが自然に同期するかを見る。',
    mode: 'center',
    clipPointMs: boundaries.clipNewStartMs,
    sourcePointMs: boundaries.sourceNewStartMs,
    durationMs: 4000
  },
  {
    id: 'start_old_pair_pm2s',
    label: '開始 旧ペア: clip 1:32.555 / source 40:04.730',
    purpose: '旧開始同士を同じ相対位置で再生する。ここから始まる方が自然か、途中からに見えるかを見る。',
    mode: 'center',
    clipPointMs: boundaries.clipOldStartMs,
    sourcePointMs: boundaries.sourceOldStartMs,
    durationMs: 4000
  },
  {
    id: 'end_old_pair_end_aligned_4s',
    label: '終端 旧ペア: clip 2:01.147 / source 40:33.322',
    purpose: '新旧共通のclip終端直前4秒と、旧source終端直前4秒を比較する。最後の発話がここで終わるかを見る。',
    mode: 'endAligned',
    clipPointMs: boundaries.clipEndMs,
    sourcePointMs: boundaries.sourceOldEndMs,
    durationMs: 4000
  },
  {
    id: 'end_new_last_word_start_pair_pm2s',
    label: '終端 新補助: clip 2:01.147周辺 / source 40:36.085周辺',
    purpose: 'source最終語「ね」の開始候補周辺を確認する。長い最終語のため補助として見る。',
    mode: 'center',
    clipPointMs: boundaries.clipEndMs,
    sourcePointMs: boundaries.sourceNewEndLastWordStartMs,
    durationMs: 4000
  },
  {
    id: 'end_new_pair_end_aligned_4s',
    label: '終端 新仮説: clip 2:01.147 / source 40:40.868',
    purpose: '新旧共通のclip終端直前4秒と、新source終端直前4秒を比較する。最後の発話がここまで続くかを見る。',
    mode: 'endAligned',
    clipPointMs: boundaries.clipEndMs,
    sourcePointMs: boundaries.sourceNewEndMs,
    durationMs: 4000
  }
];

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

function seconds(ms) {
  return (Math.max(0, ms) / 1000).toFixed(3);
}

function windowFor(comparison, side) {
  const pointMs = side === 'clip' ? comparison.clipPointMs : comparison.sourcePointMs;
  if (comparison.mode === 'endAligned') {
    return {
      startMs: Math.max(0, pointMs - comparison.durationMs),
      durationMs: comparison.durationMs
    };
  }
  return {
    startMs: Math.max(0, pointMs - comparison.durationMs / 2),
    durationMs: comparison.durationMs
  };
}

async function buildComparisonVideo(comparison) {
  const clipWindow = windowFor(comparison, 'clip');
  const sourceWindow = windowFor(comparison, 'source');
  const outPath = path.join(videoDir, `${comparison.id}.mp4`);
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(clipWindow.startMs),
    '-t',
    seconds(clipWindow.durationMs),
    '-i',
    clipMedia,
    '-ss',
    seconds(sourceWindow.startMs),
    '-t',
    seconds(sourceWindow.durationMs),
    '-i',
    sourceMedia,
    '-filter_complex',
    [
      '[0:v]scale=640:360,setpts=PTS-STARTPTS[leftv]',
      '[1:v]scale=640:360,setpts=PTS-STARTPTS[rightv]',
      '[leftv][rightv]hstack=inputs=2[v]',
      '[0:a]aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[lefta]',
      '[1:a]aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[righta]',
      '[lefta][righta]amerge=inputs=2[a]'
    ].join(';'),
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-ac',
    '2',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-shortest',
    outPath
  ]);
  return {
    ...comparison,
    clipWindow,
    sourceWindow,
    path: outPath
  };
}

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secondsPart = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${String(secondsPart).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function relFromReport(filePath) {
  return path.relative(path.dirname(reportPath), filePath);
}

function relFromPackage(filePath) {
  return path.relative(packageDir, filePath);
}

function reportMarkdown(items) {
  const rows = items.map((item) => (
    `| ${item.label} | ${msText(item.clipWindow.startMs)}-${msText(item.clipWindow.startMs + item.clipWindow.durationMs)} | ${msText(item.sourceWindow.startMs)}-${msText(item.sourceWindow.startMs + item.sourceWindow.durationMs)} | \`${relFromReport(item.path)}\` |`
  ));
  return [
    '# 境界モーション確認パッケージ',
    '',
    '- 目的: 静止画では判別しにくい境界を、動画の動きと音声で確認する。',
    '- 左画面/左音声: clip',
    '- 右画面/右音声: source',
    '- 判定は人間が行う。confirmedペア、fixture、expected、照合ロジックは変更していない。',
    `- HTML index: \`${relFromReport(indexPath)}\``,
    '',
    '## 見方',
    '',
    '1. 開始は `開始 新仮説` と `開始 旧ペア` を見比べる。',
    '2. 同じ言葉が同じタイミングで始まり、口の動きと音が自然に重なる方を開始候補として見る。',
    '3. 終端は `終端 旧ペア` と `終端 新仮説` を見比べる。',
    '4. clip終端直前の言葉がsource側のどちらの終端直前と一致しているかを見る。',
    '5. `終端 新補助` は、source最終語が長いため、開始位置確認用の補助として見る。',
    '',
    '## 動画一覧',
    '',
    '| 比較 | clip窓 | source窓 | 動画 |',
    '| --- | ---: | ---: | --- |',
    ...rows,
    '',
    '## 確認ポイント',
    '',
    '- 開始が新なら、clip 1:27.475 / source 39:59.621 の動画の方が自然に同期する。',
    '- 開始が旧なら、clip 1:32.555 / source 40:04.730 の動画の方が自然に同期する。',
    '- 終端が旧なら、clip 2:01.147直前の発話がsource 40:33.322直前と合う。',
    '- 終端が新なら、clip 2:01.147直前の発話がsource 40:40.868直前と合う。'
  ].join('\n') + '\n';
}

function htmlIndex(items) {
  const cards = items.map((item) => `<section>
  <h2>${item.label}</h2>
  <p>${item.purpose}</p>
  <p>clip: ${msText(item.clipWindow.startMs)}-${msText(item.clipWindow.startMs + item.clipWindow.durationMs)} / source: ${msText(item.sourceWindow.startMs)}-${msText(item.sourceWindow.startMs + item.sourceWindow.durationMs)}</p>
  <video controls src="${relFromPackage(item.path)}"></video>
</section>`).join('\n');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Boundary motion verification ${clipId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #111827; }
    section { border-top: 1px solid #d1d5db; margin-top: 20px; padding-top: 18px; }
    video { width: min(1280px, 100%); background: #111827; display: block; }
    .note { background: #f3f4f6; padding: 12px 14px; border-left: 4px solid #6b7280; }
  </style>
</head>
<body>
  <h1>境界モーション確認 ${clipId}</h1>
  <div class="note">
    <p>左画面/左音声がclip、右画面/右音声がsource。判定は人間が行う。confirmedペア、fixture、expected、照合ロジックは変更していない。</p>
  </div>
  ${cards}
</body>
</html>
`;
}

async function main() {
  await mkdir(videoDir, { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  const items = [];
  for (const comparison of comparisons) {
    items.push(await buildComparisonVideo(comparison));
  }
  await writeFile(reportPath, reportMarkdown(items), 'utf8');
  await writeFile(indexPath, htmlIndex(items), 'utf8');
  console.log(`report: ${reportPath}`);
  console.log(`index: ${indexPath}`);
  for (const item of items) {
    console.log(`${item.id}: ${item.path}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
