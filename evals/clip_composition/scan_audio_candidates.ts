import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

type CliOptions = {
  targetFile: string;
  outputId: string;
  sampleRate: number;
  envelopeFrameMs: number;
  envelopeHopMs: number;
  scanHopMs: number;
  top: number;
  ffmpegCommand: string;
};

type TargetFile = {
  targetId: string;
  clip: {
    id: string;
    sttId?: string;
    localVideoPath: string;
    durationSec?: number;
  };
  sourceCandidates: Array<{
    id: string;
    sttId?: string;
    localVideoPath?: string;
    durationSec?: number;
  }>;
};

type WordTimestampFile = {
  words?: Array<{
    text: string;
    startMs: number;
    endMs: number;
  }>;
};

type AudioSlice = {
  label: string;
  inputPath: string;
  startMs: number;
  endMs: number;
};

type ScanMatch = {
  sourceId: string;
  queryLabel: string;
  sourceStartMs: number;
  sourceEndMs: number;
  correlation: number;
  absoluteCorrelation: number;
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

  const targetFile = values.get('target')?.trim();
  if (!targetFile) {
    throw new Error('--target evals/clip_composition/stt-targets/r_ztjHaHmcg.json を指定してください');
  }
  const sampleRate = positiveInt(values.get('sampleRate') ?? '16000', '--sampleRate');
  const envelopeFrameMs = positiveInt(values.get('envelopeFrameMs') ?? '20', '--envelopeFrameMs');
  const envelopeHopMs = positiveInt(values.get('envelopeHopMs') ?? '10', '--envelopeHopMs');
  const scanHopMs = positiveInt(values.get('scanHopMs') ?? '500', '--scanHopMs');
  const top = positiveInt(values.get('top') ?? '10', '--top');
  if (scanHopMs < envelopeHopMs || scanHopMs % envelopeHopMs !== 0) {
    throw new Error('--scanHopMs は --envelopeHopMs 以上で、割り切れる値にしてください');
  }

  return {
    targetFile: path.resolve(targetFile),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    sampleRate,
    envelopeFrameMs,
    envelopeHopMs,
    scanHopMs,
    top,
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  };
}

function positiveInt(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} は1以上の整数で指定してください`);
  }
  return parsed;
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function sttWordPath(itemId: string, role: 'clip' | 'source'): string {
  return path.join(evalRoot, 'stt', itemId, role, 'word-timestamps.json');
}

async function clipSpeechRangeMs(clipSttId: string): Promise<{ startMs: number; endMs: number; text: string }> {
  const payload = await readJson<WordTimestampFile>(sttWordPath(clipSttId, 'clip'));
  const words = (payload.words ?? [])
    .filter((word) => typeof word.startMs === 'number' && typeof word.endMs === 'number' && word.endMs >= word.startMs)
    .sort((left, right) => left.startMs - right.startMs);
  if (words.length === 0) {
    throw new Error(`切り抜き側の単語時刻がありません: ${clipSttId}`);
  }
  return {
    startMs: words[0]?.startMs ?? 0,
    endMs: words.at(-1)?.endMs ?? 0,
    text: words.map((word) => word.text).join('')
  };
}

async function readAudioSlice(options: {
  ffmpegCommand: string;
  sampleRate: number;
  slice: AudioSlice;
}): Promise<Float32Array> {
  const durationMs = options.slice.endMs - options.slice.startMs;
  if (durationMs <= 0) {
    throw new Error(`${options.slice.label} の音声範囲が不正です`);
  }
  const args = [
    '-v',
    'error',
    '-ss',
    (options.slice.startMs / 1000).toFixed(3),
    '-i',
    options.slice.inputPath,
    '-t',
    (durationMs / 1000).toFixed(3),
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(options.sampleRate),
    '-f',
    'f32le',
    'pipe:1'
  ];

  const chunks: Buffer[] = [];
  const stderr: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(options.ffmpegCommand, args);
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${options.ffmpegCommand} failed with code ${code ?? 'unknown'}\n${Buffer.concat(stderr).toString('utf8')}`));
    });
  });

  const buffer = Buffer.concat(chunks);
  const samples = new Float32Array(buffer.byteLength / 4);
  for (let offset = 0; offset < samples.length; offset += 1) {
    samples[offset] = buffer.readFloatLE(offset * 4);
  }
  return samples;
}

function rmsEnvelope(samples: Float32Array, sampleRate: number, frameMs: number, hopMs: number): Float32Array {
  const frameSamples = Math.max(1, Math.round(sampleRate * frameMs / 1000));
  const hopSamples = Math.max(1, Math.round(sampleRate * hopMs / 1000));
  if (samples.length < frameSamples) {
    return new Float32Array();
  }
  const frameCount = Math.floor((samples.length - frameSamples) / hopSamples) + 1;
  const envelope = new Float32Array(frameCount);
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const start = frameIndex * hopSamples;
    let energy = 0;
    for (let index = 0; index < frameSamples; index += 1) {
      const value = samples[start + index] ?? 0;
      energy += value * value;
    }
    envelope[frameIndex] = Math.sqrt(energy / frameSamples);
  }
  return envelope;
}

function downsampleEnvelope(envelope: Float32Array, factor: number): Float32Array {
  if (factor <= 1) {
    return envelope;
  }
  const length = Math.floor(envelope.length / factor);
  const result = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    let total = 0;
    for (let offset = 0; offset < factor; offset += 1) {
      total += envelope[index * factor + offset] ?? 0;
    }
    result[index] = total / factor;
  }
  return result;
}

function normalizedCorrelationAt(query: Float32Array, reference: Float32Array, offset: number): number {
  let queryMean = 0;
  let referenceMean = 0;
  for (let index = 0; index < query.length; index += 1) {
    queryMean += query[index] ?? 0;
    referenceMean += reference[offset + index] ?? 0;
  }
  queryMean /= query.length;
  referenceMean /= query.length;

  let numerator = 0;
  let queryEnergy = 0;
  let referenceEnergy = 0;
  for (let index = 0; index < query.length; index += 1) {
    const queryValue = (query[index] ?? 0) - queryMean;
    const referenceValue = (reference[offset + index] ?? 0) - referenceMean;
    numerator += queryValue * referenceValue;
    queryEnergy += queryValue * queryValue;
    referenceEnergy += referenceValue * referenceValue;
  }
  const denominator = Math.sqrt(queryEnergy * referenceEnergy);
  return denominator > 0 ? numerator / denominator : 0;
}

function scanMatches(input: {
  sourceId: string;
  queryLabel: string;
  query: Float32Array;
  reference: Float32Array;
  scanHopMs: number;
  top: number;
}): ScanMatch[] {
  if (input.query.length === 0 || input.reference.length < input.query.length) {
    return [];
  }

  const rawMatches: ScanMatch[] = [];
  for (let offset = 0; offset <= input.reference.length - input.query.length; offset += 1) {
    const correlation = normalizedCorrelationAt(input.query, input.reference, offset);
    rawMatches.push({
      sourceId: input.sourceId,
      queryLabel: input.queryLabel,
      sourceStartMs: offset * input.scanHopMs,
      sourceEndMs: (offset + input.query.length) * input.scanHopMs,
      correlation,
      absoluteCorrelation: Math.abs(correlation)
    });
  }

  const sorted = rawMatches.sort((left, right) =>
    right.absoluteCorrelation - left.absoluteCorrelation ||
    right.correlation - left.correlation ||
    left.sourceStartMs - right.sourceStartMs
  );
  const selected: ScanMatch[] = [];
  for (const match of sorted) {
    if (selected.length >= input.top) {
      break;
    }
    const overlapsExisting = selected.some((item) =>
      Math.max(item.sourceStartMs, match.sourceStartMs) < Math.min(item.sourceEndMs, match.sourceEndMs)
    );
    if (!overlapsExisting) {
      selected.push(match);
    }
  }
  return selected;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const millis = String(ms % 1000).padStart(3, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${millis}`
    : `${minutes}:${String(seconds).padStart(2, '0')}.${millis}`;
}

function buildReport(input: {
  target: TargetFile;
  outputPath: string;
  options: CliOptions;
  queries: AudioSlice[];
  matchesBySource: Array<{ sourceId: string; matches: ScanMatch[] }>;
}): string {
  const lines = [
    '# 音声粗スキャンレポート',
    '',
    `- 対象: ${input.target.targetId}`,
    `- 結果JSON: ${path.relative(evalRoot, input.outputPath)}`,
    `- サンプルレート: ${input.options.sampleRate}Hz`,
    `- 包絡: ${input.options.envelopeFrameMs}ms frame / ${input.options.envelopeHopMs}ms hop`,
    `- スキャン間隔: ${input.options.scanHopMs}ms`,
    '',
    '## 注意',
    '',
    '- この結果はexpectedCutsとして固定しない',
    '- STTサーバー停止中に元動画側STTの探索開始位置を絞るための粗い候補である',
    '- BGM、SE、字幕演出、編集で相関は崩れるため、順位だけで元ネタ確定しない',
    ''
  ];

  lines.push('## 入力');
  for (const query of input.queries) {
    lines.push(`- ${query.label}: ${formatMs(query.startMs)} - ${formatMs(query.endMs)}`);
  }
  lines.push('');

  for (const source of input.matchesBySource) {
    lines.push(`## ${source.sourceId}`);
    if (source.matches.length === 0) {
      lines.push('候補なし');
      lines.push('');
      continue;
    }
    for (const [index, match] of source.matches.entries()) {
      lines.push(`${index + 1}. ${match.queryLabel} ${formatMs(match.sourceStartMs)} - ${formatMs(match.sourceEndMs)}`);
      lines.push(`   - 相関: ${Number(match.correlation.toFixed(6))}, 絶対値: ${Number(match.absoluteCorrelation.toFixed(6))}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const target = await readJson<TargetFile>(options.targetFile);
  const clipInputPath = resolveWorkspacePath(target.clip.localVideoPath);
  const clipSttId = target.clip.sttId ?? target.clip.id;
  const clipDurationMs = Math.round((target.clip.durationSec ?? 0) * 1000);
  if (clipDurationMs <= 0) {
    throw new Error('切り抜き動画のdurationSecが必要です');
  }
  const speechRange = await clipSpeechRangeMs(clipSttId);
  const queries: AudioSlice[] = [
    {
      label: 'clip-full',
      inputPath: clipInputPath,
      startMs: 0,
      endMs: clipDurationMs
    },
    {
      label: 'clip-speech',
      inputPath: clipInputPath,
      startMs: speechRange.startMs,
      endMs: speechRange.endMs
    }
  ];

  const scanFactor = options.scanHopMs / options.envelopeHopMs;
  const queryEnvelopes = new Map<string, Float32Array>();
  for (const query of queries) {
    const samples = await readAudioSlice({ ffmpegCommand: options.ffmpegCommand, sampleRate: options.sampleRate, slice: query });
    const envelope = rmsEnvelope(samples, options.sampleRate, options.envelopeFrameMs, options.envelopeHopMs);
    queryEnvelopes.set(query.label, downsampleEnvelope(envelope, scanFactor));
  }

  const matchesBySource: Array<{ sourceId: string; matches: ScanMatch[] }> = [];
  for (const source of target.sourceCandidates) {
    if (!source.localVideoPath || !source.durationSec) {
      continue;
    }
    const sourceInputPath = resolveWorkspacePath(source.localVideoPath);
    const sourceSlice: AudioSlice = {
      label: source.id,
      inputPath: sourceInputPath,
      startMs: 0,
      endMs: Math.round(source.durationSec * 1000)
    };
    const sourceSamples = await readAudioSlice({ ffmpegCommand: options.ffmpegCommand, sampleRate: options.sampleRate, slice: sourceSlice });
    const sourceEnvelope = downsampleEnvelope(
      rmsEnvelope(sourceSamples, options.sampleRate, options.envelopeFrameMs, options.envelopeHopMs),
      scanFactor
    );

    const matches = queries.flatMap((query) => {
      const queryEnvelope = queryEnvelopes.get(query.label);
      if (!queryEnvelope) {
        return [];
      }
      return scanMatches({
        sourceId: source.id,
        queryLabel: query.label,
        query: queryEnvelope,
        reference: sourceEnvelope,
        scanHopMs: options.scanHopMs,
        top: options.top
      });
    }).sort((left, right) =>
      right.absoluteCorrelation - left.absoluteCorrelation ||
      right.correlation - left.correlation ||
      left.sourceStartMs - right.sourceStartMs
    ).slice(0, options.top);
    matchesBySource.push({ sourceId: source.id, matches });
  }

  const outputPath = path.join(evalRoot, 'outputs', `audio-scan-${options.outputId}.json`);
  const reportPath = path.join(evalRoot, 'reports', `audio-scan-${options.outputId}.md`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });

  const result = {
    kind: 'clip_composition_audio_rough_scan',
    createdAt: new Date().toISOString(),
    targetId: target.targetId,
    options: {
      sampleRate: options.sampleRate,
      envelopeFrameMs: options.envelopeFrameMs,
      envelopeHopMs: options.envelopeHopMs,
      scanHopMs: options.scanHopMs,
      top: options.top
    },
    queries: queries.map((query) => ({
      label: query.label,
      startMs: query.startMs,
      endMs: query.endMs
    })),
    speechRangeText: speechRange.text,
    matchesBySource,
    notes: [
      'この結果はexpectedCutsとして固定しない。',
      'STTサーバー停止中に元動画側STTの探索開始位置を絞るための粗い候補として扱う。'
    ]
  };
  await writeJson(outputPath, result);
  await writeFile(reportPath, buildReport({ target, outputPath, options, queries, matchesBySource }), 'utf8');
  console.log(`result: ${outputPath}`);
  console.log(`report: ${reportPath}`);
  for (const source of matchesBySource) {
    const best = source.matches[0];
    if (best) {
      console.log(`${source.sourceId}: ${best.queryLabel} ${formatMs(best.sourceStartMs)}-${formatMs(best.sourceEndMs)} corr=${Number(best.correlation.toFixed(6))}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
