import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

type CliOptions = {
  inputPath: string;
  itemId: string;
  role: 'clip' | 'source';
  serverUrl: string;
  language: string;
  timeoutMs: number;
  chunkSec: number;
  maxChunks?: number;
  reuseChunkDir?: string;
  ffmpegCommand: string;
  ffprobeCommand: string;
  prepareOnly: boolean;
  resumeAfterServerRestart: boolean;
  force: boolean;
};

type SttSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
};

type WordTimestamp = {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  speaker?: string;
  segmentId?: number;
};

type ChunkBoundaryResolution = {
  discardedSegmentCount: number;
  clampedSegmentCount: number;
  discardedWordCount: number;
  clampedWordCount: number;
};

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

function workspaceRoot(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つからないため評価環境の位置を確認できません');
    }
    current = parent;
  }
}

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  const flags = new Set<string>();
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

  const inputPath = values.get('input')?.trim();
  if (!inputPath) {
    throw new Error('--input で入力動画または音声を指定してください');
  }
  const itemId = values.get('id')?.trim();
  if (!itemId) {
    throw new Error('--id で保存IDを指定してください');
  }
  const role = values.get('role')?.trim();
  if (role !== 'clip' && role !== 'source') {
    throw new Error('--role は clip または source を指定してください');
  }
  const chunkSec = Number.parseInt(values.get('chunkSec') ?? '', 10);
  if (!Number.isFinite(chunkSec) || chunkSec <= 0) {
    throw new Error('--chunkSec は1以上の整数で指定してください');
  }
  const timeoutMs = Number.parseInt(values.get('timeoutMs') ?? '1800000', 10);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error('--timeoutMs は0以上の整数で指定してください');
  }
  const rawMaxChunks = values.get('maxChunks')?.trim();
  const maxChunks = rawMaxChunks ? Number.parseInt(rawMaxChunks, 10) : undefined;
  if (rawMaxChunks && (!Number.isFinite(maxChunks) || maxChunks <= 0)) {
    throw new Error('--maxChunks は1以上の整数で指定してください');
  }

  return {
    inputPath: path.resolve(inputPath),
    itemId: sanitizePathPart(itemId),
    role,
    serverUrl: values.get('server')?.trim() || process.env.ZEV2_STT_SERVER_URL?.trim() || process.env.ZEV_STT_SERVER_URL?.trim() || '',
    language: values.get('language')?.trim() || process.env.ZEV2_STT_LANGUAGE?.trim() || 'ja-JP',
    timeoutMs,
    chunkSec,
    ...(maxChunks ? { maxChunks } : {}),
    ...(values.get('reuseChunkDir')?.trim() ? { reuseChunkDir: path.resolve(values.get('reuseChunkDir')!.trim()) } : {}),
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg',
    ffprobeCommand: values.get('ffprobe')?.trim() || process.env.ZEV2_FFPROBE_BIN?.trim() || process.env.FFPROBE_BIN?.trim() || 'ffprobe',
    prepareOnly: flags.has('prepare-only'),
    resumeAfterServerRestart: flags.has('resume-after-server-restart'),
    force: flags.has('force')
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function sttOutputDir(options: CliOptions): string {
  return path.join(evalRoot, 'stt', options.itemId, options.role);
}

type RunProcessResult = { stdout: string; stderr: string; combined: string };

function runProcess(command: string, args: string[]): Promise<RunProcessResult> {
  return new Promise((resolve, reject) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const combined: string[] = [];
    const child = spawn(command, args, { env: process.env });
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout.push(text);
      combined.push(text);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr.push(text);
      combined.push(text);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.join(''), stderr: stderr.join(''), combined: combined.join('') });
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${combined.join('')}`));
    });
  });
}

async function mediaDurationSec(options: CliOptions): Promise<number> {
  const result = await runProcess(options.ffprobeCommand, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    options.inputPath
  ]);
  const duration = Number.parseFloat(result.stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`入力ファイルの長さを取得できません: ${options.inputPath}`);
  }
  return duration;
}

async function extractChunkAudio(options: CliOptions, outputDir: string, index: number, startSec: number, durationSec: number): Promise<string> {
  const chunksDir = path.join(outputDir, 'chunks');
  await mkdir(chunksDir, { recursive: true });
  const audioPath = path.join(chunksDir, `chunk-${String(index).padStart(4, '0')}.flac`);
  if (existsSync(audioPath) && !options.force) {
    return audioPath;
  }
  await runProcess(options.ffmpegCommand, [
    '-y',
    '-ss',
    startSec.toFixed(3),
    '-i',
    options.inputPath,
    '-t',
    durationSec.toFixed(3),
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-sample_fmt',
    's16',
    audioPath
  ]);
  return audioPath;
}

function toSttServerLanguage(language: string): string {
  return language.split('-')[0] || language;
}

async function transcribe(audioPath: string, options: CliOptions): Promise<unknown> {
  if (!options.serverUrl) {
    throw new Error('ローカルSTTサーバの接続先がありません');
  }
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
  return JSON.parse(responseText) as unknown;
}

function retryableServerFailure(error: unknown): boolean {
  return error instanceof TypeError || (
    error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

async function waitForServerRestart(options: CliOptions): Promise<void> {
  const healthUrl = new URL('/health', options.serverUrl).toString();
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(10_000) });
      if (response.ok) {
        console.log(`STT server recovered after ${attempt} health check(s)`);
        return;
      }
      console.log(`STT server health returned ${response.status}; waiting for automatic restart`);
    } catch (error) {
      console.log(`STT server unavailable (${error instanceof Error ? error.message : String(error)}); waiting for automatic restart`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value < 10000 && !Number.isInteger(value) ? Math.round(value * 1000) : Math.round(value);
}

function normalizeSegments(payload: unknown, offsetMs: number, idOffset: number): SttSegment[] {
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

function collectWords(payload: unknown, offsetMs: number, segmentIdOffset: number): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  function visit(value: unknown, segmentId?: number, speaker?: string): void {
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

function constrainToChunkBoundary(
  segments: SttSegment[],
  words: WordTimestamp[],
  chunkStartMs: number,
  chunkEndMs: number,
  segmentIdOffset: number
): { segments: SttSegment[]; words: WordTimestamp[]; resolution: ChunkBoundaryResolution } {
  const keptSegments = segments.filter((segment) => segment.startMs < chunkEndMs && segment.endMs > chunkStartMs);
  const discardedSegmentCount = segments.length - keptSegments.length;
  let clampedSegmentCount = 0;
  const segmentIdMap = new Map<number, number>();
  const constrainedSegments = keptSegments.map((segment, index) => {
    const startMs = Math.max(chunkStartMs, segment.startMs);
    const endMs = Math.min(chunkEndMs, segment.endMs);
    if (startMs !== segment.startMs || endMs !== segment.endMs) {
      clampedSegmentCount += 1;
    }
    const id = segmentIdOffset + index + 1;
    segmentIdMap.set(segment.id, id);
    return { ...segment, id, startMs, endMs };
  });

  const keptWords = words.filter((word) => word.startMs < chunkEndMs && word.endMs > chunkStartMs);
  const discardedWordCount = words.length - keptWords.length;
  let clampedWordCount = 0;
  const constrainedWords = keptWords.map((word) => {
    const startMs = Math.max(chunkStartMs, word.startMs);
    const endMs = Math.min(chunkEndMs, word.endMs);
    if (startMs !== word.startMs || endMs !== word.endMs) {
      clampedWordCount += 1;
    }
    const mappedSegmentId = word.segmentId === undefined ? undefined : segmentIdMap.get(word.segmentId);
    if (word.segmentId !== undefined && mappedSegmentId === undefined) {
      throw new Error(`チャンク境界正規化後の単語が存在しない発話ID ${word.segmentId} を参照しています`);
    }
    const { segmentId: _segmentId, ...rest } = word;
    return {
      ...rest,
      startMs,
      endMs,
      ...(mappedSegmentId !== undefined ? { segmentId: mappedSegmentId } : {})
    };
  });

  return {
    segments: constrainedSegments,
    words: constrainedWords,
    resolution: {
      discardedSegmentCount,
      clampedSegmentCount,
      discardedWordCount,
      clampedWordCount
    }
  };
}

function buildSpeechUnitGroups(segments: SttSegment[]): number[][] {
  return segments.map((segment) => [segment.id]);
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8')) as unknown;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!existsSync(options.inputPath)) {
    throw new Error(`入力ファイルが見つかりません: ${options.inputPath}`);
  }
  const outputDir = sttOutputDir(options);
  await mkdir(outputDir, { recursive: true });

  const durationSec = await mediaDurationSec(options);
  const chunkCount = Math.ceil(durationSec / options.chunkSec);
  const chunksToProcess = options.maxChunks ? Math.min(options.maxChunks, chunkCount) : chunkCount;
  if (options.prepareOnly) {
    const preparedChunks = [];
    for (let index = 0; index < chunksToProcess; index += 1) {
      const startSec = index * options.chunkSec;
      const durationForChunkSec = Math.min(options.chunkSec, durationSec - startSec);
      const audioPath = await extractChunkAudio(options, outputDir, index, startSec, durationForChunkSec);
      preparedChunks.push({
        index,
        startMs: Math.round(startSec * 1000),
        endMs: Math.round((startSec + durationForChunkSec) * 1000),
        audioPath
      });
      console.log(`prepared ${index + 1}/${chunksToProcess}: ${Math.round(startSec)}s-${Math.round(startSec + durationForChunkSec)}s`);
    }
    const preparationPath = path.join(outputDir, 'audio-preparation.json');
    await writeJson(preparationPath, {
      kind: 'clip_composition_local_stt_audio_preparation',
      createdAt: new Date().toISOString(),
      itemId: options.itemId,
      role: options.role,
      inputPath: options.inputPath,
      chunkSec: options.chunkSec,
      fullChunkCount: chunkCount,
      preparedChunkCount: preparedChunks.length,
      partial: preparedChunks.length < chunkCount,
      chunks: preparedChunks
    });
    console.log(`preparation: ${preparationPath}`);
    return;
  }
  const chunks: Array<{
    index: number;
    startMs: number;
    endMs: number;
    audioPath: string;
    segmentCount: number;
    wordTimestampCount: number;
    rawResponsePath: string;
    boundaryResolution: ChunkBoundaryResolution;
  }> = [];
  const segments: SttSegment[] = [];
  const words: WordTimestamp[] = [];
  const boundaryResolution: ChunkBoundaryResolution = {
    discardedSegmentCount: 0,
    clampedSegmentCount: 0,
    discardedWordCount: 0,
    clampedWordCount: 0
  };

  for (let index = 0; index < chunksToProcess; index += 1) {
    const startSec = index * options.chunkSec;
    const durationForChunkSec = Math.min(options.chunkSec, durationSec - startSec);
    const offsetMs = Math.round(startSec * 1000);
    const chunkName = `chunk-${String(index).padStart(4, '0')}`;
    const reusedAudioPath = options.reuseChunkDir ? path.join(options.reuseChunkDir, `${chunkName}.flac`) : undefined;
    const audioPath = reusedAudioPath && existsSync(reusedAudioPath)
      ? reusedAudioPath
      : await extractChunkAudio(options, outputDir, index, startSec, durationForChunkSec);
    console.log(`chunk ${index + 1}/${chunksToProcess}: ${Math.round(startSec)}s-${Math.round(startSec + durationForChunkSec)}s`);
    const outputRawResponsePath = path.join(outputDir, 'chunks', `${chunkName}.raw.json`);
    const reusedRawResponsePath = options.reuseChunkDir ? path.join(options.reuseChunkDir, `${chunkName}.raw.json`) : undefined;
    let rawResponsePath = reusedRawResponsePath && existsSync(reusedRawResponsePath)
      ? reusedRawResponsePath
      : outputRawResponsePath;
    let rawPayload: unknown;
    if (existsSync(rawResponsePath) && !options.force) {
      rawPayload = await readJson(rawResponsePath);
      console.log(`chunk ${index + 1}/${chunksToProcess}: existing STT response reused`);
    } else {
      while (true) {
        try {
          rawPayload = await transcribe(audioPath, options);
          break;
        } catch (error) {
          if (!options.resumeAfterServerRestart || !retryableServerFailure(error)) {
            throw new Error(
              `chunk ${index + 1}/${chunksToProcess} のSTTに失敗しました: ${error instanceof Error ? error.message : String(error)}`
            );
          }
          console.log(`chunk ${index + 1}/${chunksToProcess}: STT server connection failed; preserving completed chunks and waiting for restart`);
          await waitForServerRestart(options);
          console.log(`chunk ${index + 1}/${chunksToProcess}: retrying after STT server restart`);
        }
      }
      await mkdir(path.dirname(outputRawResponsePath), { recursive: true });
      await writeJson(outputRawResponsePath, rawPayload);
      rawResponsePath = outputRawResponsePath;
    }
    const segmentIdOffset = segments.length;
    const rawChunkSegments = normalizeSegments(rawPayload, offsetMs, segmentIdOffset);
    const rawChunkWords = collectWords(rawPayload, offsetMs, segmentIdOffset);
    const constrained = constrainToChunkBoundary(
      rawChunkSegments,
      rawChunkWords,
      offsetMs,
      Math.round((startSec + durationForChunkSec) * 1000),
      segmentIdOffset
    );
    const chunkSegments = constrained.segments;
    const chunkWords = constrained.words;
    boundaryResolution.discardedSegmentCount += constrained.resolution.discardedSegmentCount;
    boundaryResolution.clampedSegmentCount += constrained.resolution.clampedSegmentCount;
    boundaryResolution.discardedWordCount += constrained.resolution.discardedWordCount;
    boundaryResolution.clampedWordCount += constrained.resolution.clampedWordCount;
    segments.push(...chunkSegments);
    words.push(...chunkWords);
    chunks.push({
      index,
      startMs: offsetMs,
      endMs: Math.round((startSec + durationForChunkSec) * 1000),
      audioPath,
      segmentCount: chunkSegments.length,
      wordTimestampCount: chunkWords.length,
      rawResponsePath,
      boundaryResolution: constrained.resolution
    });
  }

  const transcript = {
    kind: 'transcript_json',
    mode: 'zev-local-stt-chunked',
    sourceUri: options.inputPath,
    notes: [
      'clip_composition評価環境でローカルSTTサーバーを分割利用して文字起こしした結果です。',
      options.role === 'clip'
        ? '切り抜き側はBGM、SE、追加音声が混ざる前提で扱います。'
        : '元動画側はexpectedCuts作成の時刻基準として扱います。',
      'STT応答の時刻は各音声チャンクの実範囲内に正規化し、範囲外の語は評価入力から除外します。'
    ],
    generatedAt: new Date().toISOString(),
    language: options.language,
    durationSec: options.maxChunks ? Math.min(durationSec, chunksToProcess * options.chunkSec) : durationSec,
    originalDurationSec: durationSec,
    processedChunkCount: chunksToProcess,
    fullChunkCount: chunkCount,
    partial: chunksToProcess < chunkCount,
    segmentCount: segments.length,
    segments,
    speechUnitGroups: buildSpeechUnitGroups(segments)
  };
  const manifest = {
    kind: 'clip_composition_local_stt_chunked_manifest',
    createdAt: new Date().toISOString(),
    itemId: options.itemId,
    role: options.role,
    inputPath: options.inputPath,
    serverUrl: options.serverUrl,
    language: options.language,
    chunkSec: options.chunkSec,
    ...(options.reuseChunkDir ? { reuseChunkDir: options.reuseChunkDir } : {}),
    fullChunkCount: chunkCount,
    processedChunkCount: chunksToProcess,
    partial: chunksToProcess < chunkCount,
    segmentCount: segments.length,
    wordTimestampCount: words.length,
    hasWordTimestamps: words.length > 0,
    boundaryResolution: {
      basis: 'exact_audio_chunk_boundaries',
      ...boundaryResolution
    },
    chunks,
    outputs: {
      rawResponse: path.join(outputDir, 'local-stt-response.raw.json'),
      transcript: path.join(outputDir, 'transcript.json'),
      wordTimestamps: path.join(outputDir, 'word-timestamps.json')
    }
  };

  await writeJson(path.join(outputDir, 'local-stt-response.raw.json'), {
    kind: 'clip_composition_chunked_stt_response',
    chunks
  });
  await writeJson(path.join(outputDir, 'transcript.json'), transcript);
  await writeJson(path.join(outputDir, 'word-timestamps.json'), {
    kind: 'clip_composition_word_timestamps',
    sourceUri: options.inputPath,
    generatedAt: new Date().toISOString(),
    wordCount: words.length,
    words
  });
  await writeJson(path.join(outputDir, 'manifest.json'), manifest);

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
