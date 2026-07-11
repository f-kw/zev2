import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
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
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags.add(key);
      continue;
    }
    values.set(key, next);
    index += 1;
  }
  const splitDir = resolveInsideEval(required(values, 'split-dir'));
  const output = resolveInsideEval(required(values, 'output'));
  const subchunkSec = positiveNumber(required(values, 'subchunk-sec'), '--subchunk-sec');
  const expectedDurationSec = positiveNumber(required(values, 'expected-duration-sec'), '--expected-duration-sec');
  return { splitDir, output, subchunkSec, expectedDurationSec, force: flags.has('force') };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return value;
}

function positiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} は正の数で指定してください`);
  return parsed;
}

function resolveInsideEval(value) {
  const resolved = path.isAbsolute(value) ? value : path.join(root, value);
  const relative = path.relative(evalRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('入出力は evals/clip_composition 配下を指定してください');
  }
  return resolved;
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

if (!existsSync(options.splitDir)) throw new Error(`分割応答ディレクトリが見つかりません: ${options.splitDir}`);
if (existsSync(options.output) && !options.force) throw new Error(`出力済みです。上書きする場合は --force: ${options.output}`);

const files = (await readdir(options.splitDir))
  .filter((name) => /^chunk-\d+\.raw\.json$/.test(name))
  .sort();
const expectedCount = Math.ceil(options.expectedDurationSec / options.subchunkSec);
if (files.length !== expectedCount) {
  throw new Error(`分割応答数が一致しません: expected=${expectedCount}, actual=${files.length}`);
}

const segments = [];
const speechUnitGroups = [];
const sourceFiles = [];
let language;
for (let index = 0; index < files.length; index += 1) {
  const filePath = path.join(options.splitDir, files[index]);
  const payload = record(JSON.parse(await readFile(filePath, 'utf8')));
  const offsetMs = Math.round(index * options.subchunkSec * 1000);
  const idMap = new Map();
  for (const sourceSegment of Array.isArray(payload.segments) ? payload.segments : []) {
    const segment = record(sourceSegment);
    const sourceId = Number(segment.id);
    const startMs = Number(segment.startMs);
    const endMs = Number(segment.endMs);
    if (!Number.isFinite(sourceId) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    const id = segments.length + 1;
    idMap.set(sourceId, id);
    segments.push({
      ...segment,
      id,
      startMs: offsetMs + Math.round(startMs),
      endMs: offsetMs + Math.round(endMs)
    });
  }
  for (const group of Array.isArray(payload.speechUnitGroups) ? payload.speechUnitGroups : []) {
    const mapped = (Array.isArray(group) ? group : []).map((id) => idMap.get(Number(id))).filter(Number.isInteger);
    if (mapped.length > 0) speechUnitGroups.push(mapped);
  }
  if (typeof payload.language === 'string') language ??= payload.language;
  sourceFiles.push(path.relative(root, filePath));
}

const maxEndMs = segments.reduce((maximum, segment) => Math.max(maximum, segment.endMs), 0);
if (maxEndMs > Math.round(options.expectedDurationSec * 1000)) {
  throw new Error(`統合後の発話時刻が元チャンク範囲を超えています: ${maxEndMs}ms`);
}

const output = {
  durationSec: maxEndMs / 1000,
  language: language ?? 'ja',
  text: segments.map((segment) => typeof segment.text === 'string' ? segment.text : '').join(''),
  segments,
  speechUnitGroups,
  composedFromSplitResponses: {
    subchunkSec: options.subchunkSec,
    expectedDurationSec: options.expectedDurationSec,
    sourceFiles
  }
};
await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`);
console.log(`output: ${path.relative(root, options.output)}`);
console.log(`segments: ${segments.length}`);
console.log(`max end: ${maxEndMs}ms`);
