import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const clipId = 'r_ztjHaHmcg';
const sourceId = '-DwSCDMCWDQ';
const outputId = '20260706-final-block-boundary-v001';
const oldPair = {
  clipStartMs: 92555,
  clipEndMs: 121147,
  sourceStartMs: 2404730,
  sourceEndMs: 2433322
};
const newHypothesis = {
  clipStartMs: 87475,
  clipEndMs: 121147,
  sourceStartMs: 2399621,
  sourceEndMs: 2440868,
  sourceEndLastWordStartMs: 2436085
};

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const clipMedia = path.join(evalRoot, 'research', 'downloads', clipId, `${clipId}.mp4`);
const sourceMedia = path.join(evalRoot, 'research', 'downloads', clipId, 'sources', sourceId, `${sourceId}.mp4`);
const packageDir = path.join(evalRoot, 'outputs', 'boundary-check', clipId, outputId);
const stillDir = path.join(packageDir, 'stills');
const audioDir = path.join(packageDir, 'audio');
const reportPath = path.join(evalRoot, 'reports', `boundary-verification-${clipId}-${outputId}.md`);
const indexPath = path.join(packageDir, 'index.html');

const boundaryPoints = [
  {
    id: 'clip_new_start',
    label: 'clip 新開始候補 1:27.475',
    mediaKind: 'clip',
    mediaPath: clipMedia,
    pointMs: newHypothesis.clipStartMs,
    purpose: '新仮説の開始。57語直線分の開始点。'
  },
  {
    id: 'clip_old_start',
    label: 'clip 旧開始 1:32.555',
    mediaKind: 'clip',
    mediaPath: clipMedia,
    pointMs: oldPair.clipStartMs,
    purpose: '旧確認済みペアの開始。57語直線分の内部。'
  },
  {
    id: 'source_new_start',
    label: 'source 新開始候補 39:59.621',
    mediaKind: 'source',
    mediaPath: sourceMedia,
    pointMs: newHypothesis.sourceStartMs,
    purpose: '新仮説の開始。57語直線分の開始点。'
  },
  {
    id: 'source_old_start',
    label: 'source 旧開始 40:04.730',
    mediaKind: 'source',
    mediaPath: sourceMedia,
    pointMs: oldPair.sourceStartMs,
    purpose: '旧確認済みペアの開始。57語直線分の内部。'
  },
  {
    id: 'clip_shared_end',
    label: 'clip 新旧共通終端 2:01.147',
    mediaKind: 'clip',
    mediaPath: clipMedia,
    pointMs: oldPair.clipEndMs,
    purpose: '新旧どちらも同じclip終端。'
  },
  {
    id: 'source_old_end',
    label: 'source 旧終端 40:33.322',
    mediaKind: 'source',
    mediaPath: sourceMedia,
    pointMs: oldPair.sourceEndMs,
    purpose: '旧確認済みペアのsource終端。STT上では「変」の途中。'
  },
  {
    id: 'source_new_end_last_word_start',
    label: 'source 新終端補助 40:36.085',
    mediaKind: 'source',
    mediaPath: sourceMedia,
    pointMs: newHypothesis.sourceEndLastWordStartMs,
    purpose: '新仮説終端の最終語「ね」の開始。長い最終語の下限確認用。'
  },
  {
    id: 'source_new_end',
    label: 'source 新終端候補 40:40.868',
    mediaKind: 'source',
    mediaPath: sourceMedia,
    pointMs: newHypothesis.sourceEndMs,
    purpose: '新仮説のsource終端。修復後DPの最終対応語の終了点。'
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

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secondsPart = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${String(secondsPart).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function signedMs(ms) {
  return `${ms >= 0 ? '+' : ''}${ms}ms`;
}

function relativeEval(filePath) {
  return path.relative(evalRoot, filePath);
}

function relativeReport(filePath) {
  return path.relative(path.dirname(reportPath), filePath);
}

function relativePackage(filePath) {
  return path.relative(packageDir, filePath);
}

async function extractStill(mediaPath, pointMs, outPath) {
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(pointMs),
    '-i',
    mediaPath,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    outPath
  ]);
}

async function extractAudio(mediaPath, pointMs, outPath) {
  const startMs = Math.max(0, pointMs - 2000);
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(startMs),
    '-t',
    '4.000',
    '-i',
    mediaPath,
    '-vn',
    '-acodec',
    'pcm_s16le',
    '-ac',
    '1',
    '-ar',
    '16000',
    outPath
  ]);
}

function reportMarkdown(items) {
  const diffRows = [
    `| 開始 | ${msText(oldPair.clipStartMs)} | ${msText(newHypothesis.clipStartMs)} | ${signedMs(newHypothesis.clipStartMs - oldPair.clipStartMs)} | ${msText(oldPair.sourceStartMs)} | ${msText(newHypothesis.sourceStartMs)} | ${signedMs(newHypothesis.sourceStartMs - oldPair.sourceStartMs)} |`,
    `| 終端 | ${msText(oldPair.clipEndMs)} | ${msText(newHypothesis.clipEndMs)} | ${signedMs(newHypothesis.clipEndMs - oldPair.clipEndMs)} | ${msText(oldPair.sourceEndMs)} | ${msText(newHypothesis.sourceEndMs)} | ${signedMs(newHypothesis.sourceEndMs - oldPair.sourceEndMs)} |`
  ];
  const sections = items.map((item) => {
    const images = item.stills.map((still) => `![${item.id} ${still.offsetLabel}](${relativeReport(still.path)})`).join('\n');
    return [
      `### ${item.label}`,
      '',
      `- 意味: ${item.purpose}`,
      `- 音声: \`${relativeReport(item.audioPath)}\``,
      `- 静止画: ${item.stills.map((still) => `\`${relativeReport(still.path)}\``).join(', ')}`,
      '',
      images
    ].join('\n');
  });
  return [
    '# 境界検証パッケージ',
    '',
    '- 判定目的: 旧確認済みペアの境界と、DP連続対応から組んだ新仮説の境界を人間が比較する。',
    '- 判定はこのレポートでは行わない。',
    '- confirmedペア、fixture、expected、照合ロジックは変更していない。',
    `- HTML index: \`${relativeReport(indexPath)}\``,
    '',
    '## 新仮説',
    '',
    `- clip: ${msText(newHypothesis.clipStartMs)}-${msText(newHypothesis.clipEndMs)}`,
    `- source: ${msText(newHypothesis.sourceStartMs)}-${msText(newHypothesis.sourceEndMs)}`,
    `- 補助: source最終語開始 ${msText(newHypothesis.sourceEndLastWordStartMs)}`,
    '- 根拠: 修復ありDPの連続対応。57語直線分を開始軸にし、後続の連続対応を終端まで連結。',
    '',
    '## 旧ペアとの差分',
    '',
    '| 境界 | 旧clip | 新clip | clip差分 | 旧source | 新source | source差分 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...diffRows,
    '',
    '## 確認ポイント',
    '',
    '- 開始側: clip 1:27.475 / source 39:59.621 と、clip 1:32.555 / source 40:04.730 のどちらが実際の切り出し開始か。',
    '- 終端側: source 40:33.322 と、source 40:36.085-40:40.868 のどちらがclip 2:01.147終端に対応するか。',
    '- source 40:36.085 は最終語「ね」の開始で、40:40.868 はSTT上の最終語終了。長い最終語なので両方を確認対象に入れている。',
    '',
    '## 境界別素材',
    '',
    ...sections
  ].join('\n') + '\n';
}

function htmlIndex(items) {
  const cards = items.map((item) => {
    const imgs = item.stills.map((still) => `<figure><img src="${relativePackage(still.path)}" alt="${item.id} ${still.offsetLabel}"><figcaption>${still.offsetLabel}</figcaption></figure>`).join('\n');
    return `<section>
  <h2>${item.label}</h2>
  <p>${item.purpose}</p>
  <audio controls src="${relativePackage(item.audioPath)}"></audio>
  <div class="grid">${imgs}</div>
</section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Boundary verification ${clipId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #111827; }
    table { border-collapse: collapse; margin: 16px 0 28px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 9px; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    section { border-top: 1px solid #d1d5db; padding-top: 18px; margin-top: 18px; }
    audio { display: block; width: 520px; max-width: 100%; margin: 8px 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 10px; align-items: start; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid #d1d5db; background: #f9fafb; }
    figcaption { font-size: 12px; color: #4b5563; margin-top: 3px; }
  </style>
</head>
<body>
  <h1>境界検証パッケージ ${clipId}</h1>
  <p>判定は人間が行う。confirmedペア、fixture、expected、照合ロジックは変更していない。</p>
  <table>
    <thead><tr><th>境界</th><th>旧clip</th><th>新clip</th><th>旧source</th><th>新source</th></tr></thead>
    <tbody>
      <tr><td>開始</td><td>${msText(oldPair.clipStartMs)}</td><td>${msText(newHypothesis.clipStartMs)}</td><td>${msText(oldPair.sourceStartMs)}</td><td>${msText(newHypothesis.sourceStartMs)}</td></tr>
      <tr><td>終端</td><td>${msText(oldPair.clipEndMs)}</td><td>${msText(newHypothesis.clipEndMs)}</td><td>${msText(oldPair.sourceEndMs)}</td><td>${msText(newHypothesis.sourceEndMs)}</td></tr>
    </tbody>
  </table>
  ${cards}
</body>
</html>
`;
}

async function main() {
  await mkdir(stillDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  const resultItems = [];
  for (const point of boundaryPoints) {
    const pointStillDir = path.join(stillDir, point.id);
    await mkdir(pointStillDir, { recursive: true });
    const stills = [];
    for (const offsetMs of [-2000, -1000, 0, 1000, 2000]) {
      const timeMs = Math.max(0, point.pointMs + offsetMs);
      const offsetLabel = offsetMs === 0 ? 'exact' : `${offsetMs > 0 ? 'plus' : 'minus'}${Math.abs(offsetMs / 1000)}s`;
      const stillPath = path.join(pointStillDir, `${point.id}_${offsetLabel}.jpg`);
      await extractStill(point.mediaPath, timeMs, stillPath);
      stills.push({ offsetMs, offsetLabel, timeMs, path: stillPath });
    }
    const audioPath = path.join(audioDir, `${point.id}_pm2s.wav`);
    await extractAudio(point.mediaPath, point.pointMs, audioPath);
    resultItems.push({ ...point, stills, audioPath });
  }
  await writeFile(reportPath, reportMarkdown(resultItems), 'utf8');
  await writeFile(indexPath, htmlIndex(resultItems), 'utf8');
  console.log(`report: ${reportPath}`);
  console.log(`index: ${indexPath}`);
  console.log(`package: ${packageDir}`);
  for (const item of resultItems) {
    console.log(`${item.id}: ${msText(item.pointMs)} audio=${item.audioPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
