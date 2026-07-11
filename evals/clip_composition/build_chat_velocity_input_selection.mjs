#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${item} の値を指定してください`);
    values.set(item.slice(2), value);
    index += 1;
  }
  const selectionCount = Number(required(values, 'selection-count'));
  if (!Number.isInteger(selectionCount) || selectionCount < 1) {
    throw new Error('--selection-count は1以上の整数で指定してください');
  }
  const inputSelectionVersion = required(values, 'input-selection-version');
  if (!/^input-selection-v\d{3}$/.test(inputSelectionVersion)) {
    throw new Error('--input-selection-version は input-selection-vNNN 形式で指定してください');
  }
  return {
    timeSeriesPath: resolve(required(values, 'time-series')),
    sourceVideoId: required(values, 'source-video-id'),
    selectionCount,
    inputSelectionVersion,
    outputPath: resolve(required(values, 'output'))
  };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return value;
}

function resolve(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  if (path.relative(evalRoot, resolved).startsWith('..')) {
    throw new Error('入出力は evals/clip_composition 配下を指定してください');
  }
  return resolved;
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift()?.split(',') ?? [];
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const source = await readFile(options.timeSeriesPath, 'utf8');
  const rows = parseCsv(source).map((row) => ({
    minuteIndex: Number(row.minuteIndex),
    sourceStartMs: Number(row.sourceStartMs),
    sourceEndMs: Number(row.sourceEndMs),
    durationMs: Number(row.durationMs),
    relativeToStreamBaseline: Number(row.relativeToStreamBaseline),
    velocityRank: row.velocityRank === '' ? null : Number(row.velocityRank),
    isFullMinute: row.isFullMinute === 'true'
  }));
  const rankable = rows.filter((row) => row.isFullMinute && Number.isInteger(row.velocityRank));
  const selected = rankable
    .filter((row) => row.velocityRank <= options.selectionCount)
    .sort((left, right) => left.velocityRank - right.velocityRank);
  assert(selected.length === options.selectionCount, `上位${options.selectionCount}分を一意に取得できません`);
  assert(new Set(selected.map((row) => row.velocityRank)).size === options.selectionCount, '流速順位が重複しています');
  assert(selected.every((row) => row.durationMs === 60_000), '選択対象に1分未満の区間が含まれています');
  const expectedRanks = Array.from({ length: options.selectionCount }, (_, index) => index + 1);
  assert(JSON.stringify(selected.map((row) => row.velocityRank)) === JSON.stringify(expectedRanks), '流速順位が連続していません');

  const result = {
    kind: 'chat_velocity_source_only_input_selection_plan',
    createdAt: new Date().toISOString(),
    inputSelectionVersion: options.inputSelectionVersion,
    sourceVideoId: options.sourceVideoId,
    selectionMethod: {
      signal: 'one-minute chat replay comment velocity',
      normalization: 'relative to mean comment count of all complete one-minute intervals in the stream',
      ranking: 'relative velocity descending, then earlier source time',
      absoluteThresholdUsed: false,
      selectionCount: options.selectionCount,
      selectedDurationMs: selected.reduce((sum, row) => sum + row.durationMs, 0),
      generalizationStatus: 'N=100 was selected with reference to 13 expected ranges from one B-material stream; not validated for generalization'
    },
    sourceOnlyGuard: {
      expectedUsedToCalculateRanks: false,
      expectedIncludedInPlan: false,
      chatTextIncludedInPlan: false,
      chatAuthorIncludedInPlan: false
    },
    sourceTimeSeriesPath: relative(options.timeSeriesPath),
    sourceTimeSeriesSha256: createHash('sha256').update(source).digest('hex'),
    selectedRanges: selected.map((row) => ({
      sourceVideoId: options.sourceVideoId,
      sourceStartMs: row.sourceStartMs,
      sourceEndMs: row.sourceEndMs,
      minuteIndex: row.minuteIndex,
      velocityRank: row.velocityRank,
      relativeToStreamBaseline: row.relativeToStreamBaseline
    }))
  };
  const serialized = JSON.stringify(result);
  assert(!serialized.includes('expectedCuts'), '選択計画へexpectedが混入しました');
  assert(!serialized.includes('clipUrl'), '選択計画へ切り抜き情報が混入しました');
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`output: ${relative(options.outputPath)}`);
  console.log(`selected one-minute ranges: ${selected.length}`);
  console.log(`selected duration: ${result.selectionMethod.selectedDurationMs}ms`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
