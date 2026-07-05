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
  ffmpegCommand: string;
  dryRun: boolean;
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
    throw new Error('入力動画または音声を指定してください: --input evals/clip_composition/research/downloads/IMQYaT_RWRA/IMQYaT_RWRA.mp4');
  }

  const itemId = values.get('id')?.trim();
  if (!itemId) {
    throw new Error('保存IDを指定してください: --id IMQYaT_RWRA');
  }

  const role = values.get('role')?.trim();
  if (role !== 'clip' && role !== 'source') {
    throw new Error('--role は clip または source を指定してください');
  }

  const timeoutMs = Number.parseInt(
    values.get('timeoutMs') ?? process.env.ZEV2_STT_SERVER_TIMEOUT_MS ?? process.env.ZEV_STT_SERVER_TIMEOUT_MS ?? '1800000',
    10
  );
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error('--timeoutMs は0以上の整数で指定してください');
  }

  return {
    inputPath: path.resolve(inputPath),
    itemId: sanitizePathPart(itemId),
    role,
    serverUrl: values.get('server')?.trim() || process.env.ZEV2_STT_SERVER_URL?.trim() || process.env.ZEV_STT_SERVER_URL?.trim() || '',
    language: values.get('language')?.trim() || process.env.ZEV2_STT_LANGUAGE?.trim() || 'ja-JP',
    timeoutMs,
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg',
    dryRun: flags.has('dry-run'),
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

async function extractAudio(options: CliOptions, outputDir: string): Promise<string> {
  const audioPath = path.join(outputDir, 'audio.flac');
  if (existsSync(audioPath) && !options.force) {
    return audioPath;
  }

  await runProcess(options.ffmpegCommand, [
    '-y',
    '-i',
    options.inputPath,
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

function buildAbortSignal(timeoutMs: number): AbortSignal | undefined {
  return timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined;
}

async function transcribe(audioPath: string, options: CliOptions): Promise<unknown> {
  if (!options.serverUrl) {
    throw new Error('ローカルSTTサーバの接続先がありません。--server、ZEV2_STT_SERVER_URL、ZEV_STT_SERVER_URL のいずれかを指定してください。');
  }

  const fileBuffer = await readFile(audioPath);
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: 'audio/flac' }), path.basename(audioPath));
  formData.append('language', toSttServerLanguage(options.language));

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      accept: 'application/json'
    },
    body: formData
  };
  const signal = buildAbortSignal(options.timeoutMs);
  if (signal) {
    requestInit.signal = signal;
  }

  const transcribeUrl = new URL('/transcribe', options.serverUrl).toString();
  let response: Response;
  try {
    response = await fetch(transcribeUrl, requestInit);
  } catch {
    throw new Error(`ローカルSTTサーバへ接続できません: ${transcribeUrl}`);
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`ローカルSTTサーバがエラーを返しました (${response.status}): ${responseText}`);
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch (error) {
    throw new Error(`STTサーバーの応答JSONを読めません: ${String(error)}`);
  }
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeSegments(payload: unknown): SttSegment[] {
  const record = recordFrom(payload);
  if (!Array.isArray(record.segments)) {
    return [];
  }

  return record.segments.flatMap((item, index) => {
    const segment = recordFrom(item);
    const id = typeof segment.id === 'number' && Number.isInteger(segment.id) ? segment.id : index + 1;
    const startMs = numberMs(segment.startMs ?? segment.start ?? segment.startSec);
    const endMs = numberMs(segment.endMs ?? segment.end ?? segment.endSec);
    const text = typeof segment.text === 'string' ? segment.text.trim() : '';
    if (!text || startMs === undefined || endMs === undefined || endMs < startMs) {
      return [];
    }

    return [{
      id,
      startMs,
      endMs,
      text,
      ...(typeof segment.speaker === 'string' && segment.speaker.trim() ? { speaker: segment.speaker.trim() } : {})
    }];
  });
}

function numberMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value < 10000 && !Number.isInteger(value) ? Math.round(value * 1000) : Math.round(value);
}

function collectWords(payload: unknown): WordTimestamp[] {
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

    const nextSegmentId = typeof record.id === 'number' && Number.isInteger(record.id) ? record.id : segmentId;
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
        startMs,
        endMs,
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

function buildSpeechUnitGroups(segments: SttSegment[]): number[][] {
  return segments.map((segment) => [segment.id]);
}

function buildTranscriptArtifact(input: {
  options: CliOptions;
  segments: SttSegment[];
  rawPayload: unknown;
}) {
  const durationSec = typeof recordFrom(input.rawPayload).durationSec === 'number'
    ? recordFrom(input.rawPayload).durationSec
    : (input.segments.at(-1)?.endMs ?? 0) / 1000;
  return {
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: input.options.inputPath,
    notes: [
      'clip_composition評価環境でローカルSTTサーバーを使って文字起こしした結果です。',
      input.options.role === 'clip'
        ? '切り抜き側はBGM、SE、追加音声が混ざる前提で扱います。'
        : '元動画側はexpectedCuts作成の時刻基準として扱います。'
    ],
    generatedAt: new Date().toISOString(),
    language: input.options.language,
    durationSec,
    segmentCount: input.segments.length,
    segments: input.segments,
    speechUnitGroups: buildSpeechUnitGroups(input.segments)
  };
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function stripJsonComments(input: string): string {
  let output = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < input.length && input[index] !== '\n') {
        index += 1;
      }
      output += '\n';
      continue;
    }

    output += char;
  }

  return output;
}

async function runtimeSttConfig(): Promise<{ serverUrl?: string; language?: string }> {
  const configPath = path.join(workspaceRoot(), 'config', 'runtime.jsonc');
  if (!existsSync(configPath)) {
    return {};
  }

  const raw = await readFile(configPath, 'utf8');
  const parsed = JSON.parse(stripJsonComments(raw)) as unknown;
  const stt = recordFrom(recordFrom(parsed).stt);
  return {
    ...(typeof stt.localServerUrl === 'string' && stt.localServerUrl.trim() ? { serverUrl: stt.localServerUrl.trim() } : {}),
    ...(typeof stt.language === 'string' && stt.language.trim() ? { language: stt.language.trim() } : {})
  };
}

async function applyConfigDefaults(options: CliOptions): Promise<CliOptions> {
  const config = await runtimeSttConfig();
  return {
    ...options,
    serverUrl: options.serverUrl || config.serverUrl || '',
    language: options.language || config.language || 'ja-JP'
  };
}

async function main() {
  const options = await applyConfigDefaults(parseOptions(process.argv.slice(2)));
  if (!existsSync(options.inputPath)) {
    throw new Error(`入力ファイルが見つかりません: ${options.inputPath}`);
  }

  const outputDir = sttOutputDir(options);
  await mkdir(outputDir, { recursive: true });

  if (options.dryRun) {
    const audioPath = path.join(outputDir, 'audio.flac');
    console.log(`input: ${options.inputPath}`);
    console.log(`audio: ${audioPath}`);
    console.log(`raw: ${path.join(outputDir, 'local-stt-response.raw.json')}`);
    console.log(`transcript: ${path.join(outputDir, 'transcript.json')}`);
    console.log(`word timestamps: ${path.join(outputDir, 'word-timestamps.json')}`);
    console.log(`server: ${options.serverUrl || '(not set)'}`);
    console.log('dry-run: STTサーバーは呼びません');
    return;
  }

  const audioPath = await extractAudio(options, outputDir);
  const rawPayload = await transcribe(audioPath, options);
  const segments = normalizeSegments(rawPayload);
  const words = collectWords(rawPayload);
  const transcript = buildTranscriptArtifact({ options, segments, rawPayload });
  const manifest = {
    kind: 'clip_composition_local_stt_manifest',
    createdAt: new Date().toISOString(),
    itemId: options.itemId,
    role: options.role,
    inputPath: options.inputPath,
    audioPath,
    serverUrl: options.serverUrl,
    language: options.language,
    segmentCount: segments.length,
    wordTimestampCount: words.length,
    hasWordTimestamps: words.length > 0,
    outputs: {
      rawResponse: path.join(outputDir, 'local-stt-response.raw.json'),
      transcript: path.join(outputDir, 'transcript.json'),
      wordTimestamps: path.join(outputDir, 'word-timestamps.json')
    }
  };

  await writeJson(path.join(outputDir, 'local-stt-response.raw.json'), rawPayload);
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
