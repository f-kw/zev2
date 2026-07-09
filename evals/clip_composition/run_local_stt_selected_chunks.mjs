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
  const flags = new Set();
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
      flags.add(key);
      continue;
    }
    values.set(key, next);
    index += 1;
  }

  const chunksDir = values.get('chunksDir')?.trim();
  const id = values.get('id')?.trim();
  const role = values.get('role')?.trim();
  const rangesText = values.get('ranges')?.trim();
  const serverUrl = values.get('server')?.trim() || process.env.ZEV2_STT_SERVER_URL?.trim() || process.env.ZEV_STT_SERVER_URL?.trim() || '';
  const chunkSec = Number.parseInt(values.get('chunkSec') ?? '30', 10);
  const timeoutMs = Number.parseInt(values.get('timeoutMs') ?? '1800000', 10);
  if (!chunksDir) {
    throw new Error('--chunksDir で既存音声チャンクディレクトリを指定してください');
  }
  if (!id) {
    throw new Error('--id で保存IDを指定してください');
  }
  if (role !== 'clip' && role !== 'source') {
    throw new Error('--role は clip または source を指定してください');
  }
  if (!rangesText) {
    throw new Error('--ranges で処理するチャンク範囲を指定してください。例: 45-49,190-196');
  }
  if (!serverUrl) {
    throw new Error('--server または ZEV2_STT_SERVER_URL でローカルSTTサーバーを指定してください');
  }
  if (!Number.isFinite(chunkSec) || chunkSec <= 0) {
    throw new Error('--chunkSec は1以上の整数で指定してください');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error('--timeoutMs は0以上の整数で指定してください');
  }
  return {
    chunksDir: path.resolve(chunksDir),
    id: sanitizePathPart(id),
    role,
    ranges: parseRanges(rangesText),
    serverUrl,
    language: values.get('language')?.trim() || process.env.ZEV2_STT_LANGUAGE?.trim() || 'ja-JP',
    chunkSec,
    timeoutMs,
    force: flags.has('force')
  };
}

function sanitizePathPart(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function parseRanges(value) {
  const indexes = new Set();
  for (const part of value.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const match = /^(\d+)(?:-(\d+))?$/.exec(trimmed);
    if (!match) {
      throw new Error(`--ranges の形式が不正です: ${trimmed}`);
    }
    const start = Number.parseInt(match[1], 10);
    const end = match[2] ? Number.parseInt(match[2], 10) : start;
    if (end < start) {
      throw new Error(`--ranges の終了が開始より前です: ${trimmed}`);
    }
    for (let index = start; index <= end; index += 1) {
      indexes.add(index);
    }
  }
  return [...indexes].sort((left, right) => left - right);
}

function outputDir() {
  return path.join(evalRoot, 'stt', options.id, options.role);
}

function toSttServerLanguage(language) {
  return language.split('-')[0] || language;
}

async function transcribe(audioPath) {
  const fileBuffer = await readFile(audioPath);
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: 'audio/flac' }), path.basename(audioPath));
  formData.append('language', toSttServerLanguage(options.language));
  const signal = options.timeoutMs > 0 ? AbortSignal.timeout(options.timeoutMs) : undefined;
  const response = await fetch(new URL('/transcribe', options.serverUrl).toString(), {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: formData,
    ...(signal ? { signal } : {})
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`ローカルSTTサーバがエラーを返しました (${response.status}): ${responseText}`);
  }
  return JSON.parse(responseText);
}

function recordFrom(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function numberMs(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value < 10000 && !Number.isInteger(value) ? Math.round(value * 1000) : Math.round(value);
}

function normalizeSegments(payload, offsetMs, idOffset) {
  const record = recordFrom(payload);
  if (!Array.isArray(record.segments)) {
    return [];
  }
  return record.segments.flatMap((item, index) => {
    const segment = recordFrom(item);
    const startMs = numberMs(segment.startMs ?? segment.start ?? segment.startSec);
    const endMs = numberMs(segment.endMs ?? segment.end ?? segment.endSec);
    const text = typeof segment.text === 'string' ? segment.text.trim() : '';
    if (!text || startMs === undefined || endMs === undefined || endMs < startMs) {
      return [];
    }
    return [{
      id: idOffset + index + 1,
      startMs: offsetMs + startMs,
      endMs: offsetMs + endMs,
      text,
      ...(typeof segment.speaker === 'string' && segment.speaker.trim() ? { speaker: segment.speaker.trim() } : {})
    }];
  });
}

function collectWords(payload, offsetMs, segmentIdOffset) {
  const words = [];
  function visit(value, segmentId, speaker) {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, segmentId, speaker);
      }
      return;
    }
    const record = recordFrom(value);
    if (Object.keys(record).length === 0) {
      return;
    }
    const nextSegmentId = typeof record.id === 'number' && Number.isInteger(record.id) ? segmentIdOffset + record.id : segmentId;
    const nextSpeaker = typeof record.speaker === 'string' && record.speaker.trim() ? record.speaker.trim() : speaker;
    const textValue = record.word ?? record.text ?? record.token;
    const startMs = numberMs(record.startMs ?? record.start ?? record.startSec);
    const endMs = numberMs(record.endMs ?? record.end ?? record.endSec);
    if (
      typeof textValue === 'string' &&
      textValue.trim() &&
      startMs !== undefined &&
      endMs !== undefined &&
      endMs >= startMs &&
      !Array.isArray(record.segments)
    ) {
      words.push({
        text: textValue.trim(),
        startMs: offsetMs + startMs,
        endMs: offsetMs + endMs,
        ...(typeof record.confidence === 'number' ? { confidence: record.confidence } : {}),
        ...(nextSpeaker ? { speaker: nextSpeaker } : {}),
        ...(nextSegmentId !== undefined ? { segmentId: nextSegmentId } : {})
      });
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === 'word' || key === 'text' || key === 'token') {
        continue;
      }
      visit(child, nextSegmentId, nextSpeaker);
    }
  }
  visit(payload);
  return words;
}

function buildSpeechUnitGroups(segments) {
  return segments.map((segment) => [segment.id]);
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function chunkPath(index) {
  return path.join(options.chunksDir, `chunk-${String(index).padStart(4, '0')}.flac`);
}

function buildTranscript(segments) {
  return {
    kind: 'transcript_json',
    mode: 'zev-local-stt-selected-existing-chunks',
    sourceUri: options.chunksDir,
    notes: [
      'clip_composition評価環境で、粗探索で絞った既存音声チャンクだけをローカルSTTした結果です。',
      '時刻は元動画または切り抜き内のチャンク番号に基づく絶対時刻へ戻しています。',
      options.role === 'source'
        ? '元動画側はexpectedCuts作成の時刻基準候補として扱います。凍結には素材ブロック再構成と人間確認が必要です。'
        : '切り抜き側はBGM、SE、追加音声が混ざる前提で扱います。'
    ],
    generatedAt: new Date().toISOString(),
    language: options.language,
    segmentCount: segments.length,
    segments,
    speechUnitGroups: buildSpeechUnitGroups(segments)
  };
}

function buildManifest(outDir, chunks, segments, words, complete) {
  return {
    kind: 'clip_composition_local_stt_selected_chunks_manifest',
    createdAt: new Date().toISOString(),
    itemId: options.id,
    role: options.role,
    chunksDir: options.chunksDir,
    serverUrl: options.serverUrl,
    language: options.language,
    chunkSec: options.chunkSec,
    ranges: options.ranges,
    processedRanges: chunks.map((chunk) => chunk.index),
    complete,
    segmentCount: segments.length,
    wordTimestampCount: words.length,
    hasWordTimestamps: words.length > 0,
    chunks,
    outputs: {
      rawResponse: path.join(outDir, 'local-stt-response.raw.json'),
      transcript: path.join(outDir, 'transcript.json'),
      wordTimestamps: path.join(outDir, 'word-timestamps.json')
    }
  };
}

async function writeOutputs(outDir, chunks, segments, words, complete) {
  const transcript = buildTranscript(segments);
  const manifest = buildManifest(outDir, chunks, segments, words, complete);
  await writeJson(path.join(outDir, 'local-stt-response.raw.json'), {
    kind: 'clip_composition_selected_chunk_stt_response',
    complete,
    chunks
  });
  await writeJson(path.join(outDir, 'transcript.json'), transcript);
  await writeJson(path.join(outDir, 'word-timestamps.json'), {
    kind: 'clip_composition_word_timestamps',
    sourceUri: options.chunksDir,
    generatedAt: new Date().toISOString(),
    wordCount: words.length,
    words
  });
  await writeJson(path.join(outDir, 'manifest.json'), manifest);
  return manifest;
}

async function main() {
  if (!existsSync(options.chunksDir)) {
    throw new Error(`チャンクディレクトリが見つかりません: ${options.chunksDir}`);
  }
  const outDir = outputDir();
  const rawDir = path.join(outDir, 'chunks');
  await mkdir(rawDir, { recursive: true });
  const segments = [];
  const words = [];
  const chunks = [];

  for (const index of options.ranges) {
    const audioPath = chunkPath(index);
    if (!existsSync(audioPath)) {
      throw new Error(`音声チャンクが見つかりません: ${audioPath}`);
    }
    const offsetMs = index * options.chunkSec * 1000;
    const rawResponsePath = path.join(rawDir, `chunk-${String(index).padStart(4, '0')}.raw.json`);
    console.log(`chunk ${index}: ${Math.round(offsetMs / 1000)}s-${Math.round(offsetMs / 1000 + options.chunkSec)}s`);
    let rawPayload;
    if (existsSync(rawResponsePath) && !options.force) {
      rawPayload = await readJson(rawResponsePath);
      console.log(`chunk ${index}: existing STT response reused`);
    } else {
      rawPayload = await transcribe(audioPath);
      await writeJson(rawResponsePath, rawPayload);
    }
    const segmentIdOffset = segments.length;
    const chunkSegments = normalizeSegments(rawPayload, offsetMs, segmentIdOffset);
    const chunkWords = collectWords(rawPayload, offsetMs, segmentIdOffset);
    segments.push(...chunkSegments);
    words.push(...chunkWords);
    chunks.push({
      index,
      startMs: offsetMs,
      endMs: offsetMs + options.chunkSec * 1000,
      audioPath,
      segmentCount: chunkSegments.length,
      wordTimestampCount: chunkWords.length,
      rawResponsePath
    });
    await writeOutputs(outDir, chunks, segments, words, false);
  }

  const manifest = await writeOutputs(outDir, chunks, segments, words, true);

  console.log(`raw: ${manifest.outputs.rawResponse}`);
  console.log(`transcript: ${manifest.outputs.transcript}`);
  console.log(`word timestamps: ${manifest.outputs.wordTimestamps}`);
  console.log(`segments: ${segments.length}`);
  console.log(`word timestamps available: ${words.length > 0 ? 'yes' : 'no'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
