#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));

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
  return {
    manifestPath: resolvePath(required(values, 'manifest')),
    chunksDir: values.get('chunksDir')?.trim() || '',
    id: values.get('id')?.trim() || '',
    role: values.get('role')?.trim() || '',
    server: values.get('server')?.trim() || 'http://192.168.1.4:8000',
    chunkSec: positiveInt(values.get('chunkSec')?.trim() || '30', 'chunkSec'),
    timeoutMs: positiveInt(values.get('timeoutMs')?.trim() || '1800000', 'timeoutMs'),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
  };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) {
    throw new Error(`--${key} を指定してください`);
  }
  return value;
}

function positiveInt(value, key) {
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`--${key} は1以上の整数で指定してください`);
  }
  return number;
}

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function sanitizePathPart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function compressRanges(indexes) {
  const sorted = [...new Set(indexes)].sort((left, right) => left - right);
  const ranges = [];
  let start;
  let previous;
  for (const index of sorted) {
    if (start === undefined) {
      start = index;
      previous = index;
      continue;
    }
    if (index === previous + 1) {
      previous = index;
      continue;
    }
    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
    start = index;
    previous = index;
  }
  if (start !== undefined) {
    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
  }
  return ranges.join(',');
}

function buildCommand(input) {
  return [
    'node evals/clip_composition/run_local_stt_selected_chunks.mjs',
    `  --chunksDir ${input.chunksDir}`,
    `  --id ${input.id}`,
    `  --role ${input.role}`,
    `  --ranges ${input.allRangesText}`,
    `  --server ${input.server}`,
    `  --chunkSec ${input.chunkSec}`,
    `  --timeoutMs ${input.timeoutMs}`
  ].join(' \\\n');
}

function buildMarkdown(report) {
  return [
    '# local STT resume plan',
    '',
    `- 出力ID: ${report.outputId}`,
    `- manifest: ${report.manifestPath}`,
    `- 完了状態: ${report.complete ? 'complete' : 'incomplete'}`,
    `- 処理済み: ${report.processedRangesText || 'なし'}`,
    `- 未処理: ${report.remainingRangesText || 'なし'}`,
    `- 全対象: ${report.allRangesText}`,
    '',
    '## 処理の意味',
    '',
    '- STTサーバー停止で中断した選択チャンクSTTを、同じ対象範囲で再開するためのメモ。',
    '- 既存rawがあるチャンクは `run_local_stt_selected_chunks.mjs` が再利用する。',
    '- 未処理チャンクが残っている場合は、STTサーバー再起動後に下のコマンドを再実行する。',
    '',
    '## 再開コマンド',
    '',
    '```bash',
    report.resumeCommand,
    '```',
    '',
    '## 制約',
    '',
    '- fixture/expectedは作成しない。',
    '- runtimeへ書き込まない。',
    '- 本体側には触れない。',
    ''
  ].join('\n');
}

async function main() {
  if (!existsSync(options.manifestPath)) {
    throw new Error(`manifestがありません: ${options.manifestPath}`);
  }
  const manifest = await readJson(options.manifestPath);
  const allRanges = Array.isArray(manifest.ranges) ? manifest.ranges : [];
  const processedRanges = Array.isArray(manifest.processedRanges)
    ? manifest.processedRanges
    : Array.isArray(manifest.chunks)
      ? manifest.chunks.map((chunk) => chunk.index)
      : [];
  const processed = new Set(processedRanges);
  const remainingRanges = allRanges.filter((index) => !processed.has(index));
  const chunksDir = options.chunksDir || manifest.chunksDir;
  const id = options.id || manifest.itemId;
  const role = options.role || manifest.role;
  if (!chunksDir || !id || !role) {
    throw new Error('chunksDir/id/roleをmanifestまたは引数から特定できません');
  }
  const report = {
    kind: 'local_stt_resume_plan',
    runAt: new Date().toISOString(),
    outputId: options.outputId,
    manifestPath: relative(options.manifestPath),
    complete: manifest.complete === true,
    allRanges,
    processedRanges,
    remainingRanges,
    allRangesText: compressRanges(allRanges),
    processedRangesText: compressRanges(processedRanges),
    remainingRangesText: compressRanges(remainingRanges),
    chunksDir: path.isAbsolute(chunksDir) ? relative(chunksDir) : chunksDir,
    id,
    role,
    server: options.server,
    chunkSec: options.chunkSec,
    timeoutMs: options.timeoutMs
  };
  report.resumeCommand = buildCommand(report);
  const outputDir = path.join(evalRoot, 'outputs', 'local-stt-resume');
  const reportDir = path.join(evalRoot, 'reports', 'local-stt-resume');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const outputPath = path.join(outputDir, `${options.outputId}.json`);
  const reportPath = path.join(reportDir, `${options.outputId}.md`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildMarkdown(report), 'utf8');
  console.log(`output: ${relative(outputPath)}`);
  console.log(`report: ${relative(reportPath)}`);
  console.log(`remaining: ${report.remainingRangesText || 'none'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
