#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

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
  const input = resolveInsideWorkspace(required(values, 'input'));
  const id = sanitize(required(values, 'id'));
  const role = required(values, 'role');
  if (role !== 'clip' && role !== 'source') throw new Error('--role は clip または source を指定してください');
  const chunkSec = positiveInteger(required(values, 'chunk-sec'), '--chunk-sec');
  const subchunkSec = positiveInteger(required(values, 'subchunk-sec'), '--subchunk-sec');
  if (chunkSec % subchunkSec !== 0 || subchunkSec >= chunkSec) {
    throw new Error('--subchunk-sec は --chunk-sec を割り切る、より短い秒数にしてください');
  }
  return {
    input,
    id,
    role,
    server: required(values, 'server'),
    chunkSec,
    subchunkSec,
    timeoutMs: positiveInteger(values.get('timeout-ms') ?? '300000', '--timeout-ms')
  };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return value;
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} は正の整数で指定してください`);
  return parsed;
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function resolveInsideWorkspace(value) {
  const resolved = path.isAbsolute(value) ? value : path.join(root, value);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('入力はworkspace内を指定してください');
  }
  return resolved;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const output = [];
    const child = spawn(command, args, { cwd: root, env: process.env });
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output.push(text);
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output.push(text);
      process.stderr.write(text);
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, output: output.join('') }));
  });
}

function readMediaDurationSec(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], { cwd: root, env: process.env });
    const output = [];
    const errors = [];
    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => errors.push(chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      const durationSec = Number(output.join('').trim());
      if ((code ?? 1) !== 0 || !Number.isFinite(durationSec) || durationSec <= 0) {
        reject(new Error(`音声長を取得できません: ${relative(filePath)} ${errors.join('').trim()}`));
        return;
      }
      resolve(durationSec);
    });
  });
}

function relative(filePath) {
  return path.relative(root, filePath);
}

const tsx = path.join(root, 'runner', 'node_modules', '.bin', 'tsx');
const chunkRunner = path.join(evalRoot, 'run_local_stt_chunked.ts');
const mergeRunner = path.join(evalRoot, 'merge_split_stt_chunk_response.mjs');
const mainOutputDir = path.join(evalRoot, 'stt', options.id, options.role);

while (true) {
  const main = await run(tsx, [
    chunkRunner,
    '--input', options.input,
    '--id', options.id,
    '--role', options.role,
    '--server', options.server,
    '--chunkSec', String(options.chunkSec),
    '--timeoutMs', String(options.timeoutMs),
    '--resume-after-server-restart'
  ]);
  if (main.code === 0) {
    console.log(`full STT completed: ${options.id}`);
    break;
  }

  const match = main.output.match(/chunk (\d+)\/(\d+) はサーバー再起動後の再送でも接続失敗しました/);
  if (!match) {
    throw new Error(`短分割対象を特定できない失敗で停止しました (exit=${main.code})`);
  }
  const oneBasedChunk = Number(match[1]);
  const chunkIndex = oneBasedChunk - 1;
  const chunkName = `chunk-${String(chunkIndex).padStart(4, '0')}`;
  const chunkAudio = path.join(mainOutputDir, 'chunks', `${chunkName}.flac`);
  const mergedRaw = path.join(mainOutputDir, 'chunks', `${chunkName}.raw.json`);
  if (!existsSync(chunkAudio)) throw new Error(`短分割する音声がありません: ${relative(chunkAudio)}`);
  if (existsSync(mergedRaw)) throw new Error(`失敗対象に既存rawがあります: ${relative(mergedRaw)}`);

  const splitId = `${options.id}_chunk${String(chunkIndex).padStart(4, '0')}_local${options.subchunkSec}_v001`;
  console.log(`split fallback: ${chunkName} -> ${options.subchunkSec}s chunks (${splitId})`);
  const split = await run(tsx, [
    chunkRunner,
    '--input', chunkAudio,
    '--id', splitId,
    '--role', options.role,
    '--server', options.server,
    '--chunkSec', String(options.subchunkSec),
    '--timeoutMs', String(options.timeoutMs),
    '--resume-after-server-restart'
  ]);
  if (split.code !== 0) {
    throw new Error(`${chunkName} の短分割STTにも失敗しました (exit=${split.code})`);
  }

  const splitDir = path.join(evalRoot, 'stt', splitId, options.role, 'chunks');
  const chunkDurationSec = await readMediaDurationSec(chunkAudio);
  const merge = await run(process.execPath, [
    mergeRunner,
    '--split-dir', splitDir,
    '--output', mergedRaw,
    '--subchunk-sec', String(options.subchunkSec),
    '--expected-duration-sec', String(chunkDurationSec)
  ]);
  if (merge.code !== 0 || !existsSync(mergedRaw)) {
    throw new Error(`${chunkName} の短分割応答を統合できませんでした (exit=${merge.code})`);
  }
  console.log(`split fallback merged: ${relative(mergedRaw)}`);
}
