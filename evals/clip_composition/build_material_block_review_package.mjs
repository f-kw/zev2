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
const reportPath = path.join(evalRoot, 'reports', `material-block-review-${clipId}-${options.outputId}.md`);

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
    outputId: sanitizePathPart(values.get('outputId') ?? 'material-block-review-v001'),
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

async function buildMatchVideo(input) {
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(input.clipStartMs),
    '-t',
    seconds(input.durationMs),
    '-i',
    options.clipMedia,
    '-ss',
    seconds(input.sourceStartMs),
    '-t',
    seconds(input.durationMs),
    '-i',
    options.sourceMedia,
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
      const durationMs = Math.max(1000, Math.min(2000, run.clipDurationMs, run.sourceDurationMs));
      const outPath = path.join(videoDir, `block_${String(block.blockIndex).padStart(2, '0')}_run_${String(runIndex).padStart(3, '0')}_match.mp4`);
      await buildMatchVideo({
        clipStartMs: run.clipStartMs,
        sourceStartMs: run.sourceStartMs,
        durationMs,
        outPath
      });
      runAssets.push({
        runIndex,
        clipStartMs: run.clipStartMs,
        clipEndMs: run.clipEndMs,
        sourceStartMs: run.sourceStartMs,
        sourceEndMs: run.sourceEndMs,
        matchedWordPairCount: run.matchedWordPairCount,
        durationMs,
        path: outPath
      });
    }
    blockAssets.push({ block, runAssets });
  }
  return blockAssets;
}

function html(blockAssets, materialBlocks) {
  const blockCards = blockAssets.map(({ block, runAssets }) => {
    const videos = runAssets.map((asset) => `<figure>
  <video controls src="${relativeFromOutput(asset.path)}"></video>
  <figcaption>run ${asset.runIndex}: clip ${msText(asset.clipStartMs)}-${msText(asset.clipEndMs)} / source ${msText(asset.sourceStartMs)}-${msText(asset.sourceEndMs)} / 対応語 ${asset.matchedWordPairCount}</figcaption>
</figure>`).join('\n');
    return `<article>
  <h2>block ${block.blockIndex}</h2>
  <table>
    <tr><th>clip</th><td>${msText(block.clipStartMs)}-${msText(block.clipEndMs)}</td></tr>
    <tr><th>source</th><td>${msText(block.sourceStartMs)}-${msText(block.sourceEndMs)}</td></tr>
    <tr><th>対応語</th><td>${block.matchedWordPairCount}</td></tr>
    <tr><th>内部詰め候補</th><td>source ${block.internalGapMs?.sourceExtraInsideMs ?? 0}ms / clip ${block.internalGapMs?.clipExtraInsideMs ?? 0}ms</td></tr>
  </table>
  <div class="videos">${videos}</div>
</article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Material block review ${clipId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #111827; }
    table { border-collapse: collapse; margin: 12px 0 18px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 9px; text-align: left; }
    article { border-top: 1px solid #cbd5e1; padding-top: 20px; margin-top: 24px; }
    .instructions { max-width: 980px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px 16px; margin: 12px 0 18px; }
    .videos { display: grid; grid-template-columns: repeat(2, minmax(320px, 1fr)); gap: 16px; }
    video { display: block; width: 100%; background: #0f172a; }
    figure { margin: 0; }
    figcaption { font-size: 13px; line-height: 1.45; color: #374151; margin-top: 6px; }
    @media (max-width: 900px) { .videos { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>素材ブロック対応確認 ${clipId}</h1>
  <section class="instructions">
    <h2>何を見るか</h2>
    <ol>
      <li>各動画は左が切り抜き、右が元配信。候補直線分ごとに同じ発話に見えるかを確認する。</li>
      <li>このパッケージは境界0件の単一区間候補用。素材の飛びではなく、対応そのものが妥当かを見る。</li>
      <li>2秒確認動画は境界パッケージと同じ確認粒度の短いプレビューで、最終境界確定ではない。</li>
    </ol>
  </section>
  <p>素材境界候補: ${(materialBlocks.boundaries ?? []).length}件</p>
  ${blockCards}
</body>
</html>
`;
}

function markdown(blockAssets, materialBlocks) {
  const lines = [
    '# 素材ブロック対応確認パッケージ',
    '',
    `- 対象: ${clipId}`,
    `- HTML: ${path.relative(evalRoot, indexPath)}`,
    `- 素材境界候補: ${(materialBlocks.boundaries ?? []).length}件`,
    '- fixture/expected作成: なし',
    '- confirmedペア変更: なし',
    '- 本体側変更: なし',
    '',
    '## 確認方法',
    '',
    '- 各動画は左が切り抜き、右が元配信。',
    '- 候補直線分ごとに、同じ発話に見えるかを確認する。',
    '- 境界候補が0件の場合は、素材の飛びではなく単一区間候補として対応そのものを見る。',
    ''
  ];
  for (const { block, runAssets } of blockAssets) {
    lines.push(
      `## block ${block.blockIndex}`,
      '',
      `- clip: ${msText(block.clipStartMs)}-${msText(block.clipEndMs)}`,
      `- source: ${msText(block.sourceStartMs)}-${msText(block.sourceEndMs)}`,
      `- 対応語: ${block.matchedWordPairCount}`,
      `- 内部詰め候補: source ${block.internalGapMs?.sourceExtraInsideMs ?? 0}ms / clip ${block.internalGapMs?.clipExtraInsideMs ?? 0}ms`,
      '',
      '| run | clip | source | 対応語 | 動画 |',
      '| ---: | --- | --- | ---: | --- |'
    );
    for (const asset of runAssets) {
      lines.push(`| ${asset.runIndex} | ${msText(asset.clipStartMs)}-${msText(asset.clipEndMs)} | ${msText(asset.sourceStartMs)}-${msText(asset.sourceEndMs)} | ${asset.matchedWordPairCount} | \`${relativeFromReport(asset.path)}\` |`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const materialBlocks = await readJson(options.materialBlocksPath);
  const dpResult = await readJson(options.dpResultPath);
  await mkdir(outputDir, { recursive: true });
  const blockAssets = await buildAssets(materialBlocks, dpResult);
  await writeFile(indexPath, html(blockAssets, materialBlocks), 'utf8');
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, markdown(blockAssets, materialBlocks), 'utf8');
  console.log(`blocks: ${blockAssets.length}`);
  console.log(`videos: ${blockAssets.reduce((sum, block) => sum + block.runAssets.length, 0)}`);
  console.log(`index: ${indexPath}`);
  console.log(`report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
