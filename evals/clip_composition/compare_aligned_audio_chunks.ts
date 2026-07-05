import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

type CliOptions = {
  alignmentFile: string;
  clipVideoPath: string;
  sourceVideoPath: string;
  sourceId: string;
  outputId: string;
  ffmpegCommand: string;
};

type AudioSlice = {
  label: string;
  inputPath: string;
  startMs: number;
  endMs: number;
};

type AlignmentFile = {
  kind?: string;
  chunks?: Array<{
    index: number;
    startMs: number;
    endMs: number;
    text: string;
    normalizedText: string;
  }>;
  chunkResults?: Array<{
    chunk: {
      index: number;
      startMs: number;
      endMs: number;
      text: string;
      normalizedText: string;
    };
    sourceMatches?: Array<{
      sourceId: string;
      matches: Array<{
        sourceId: string;
        sourceStartMs: number;
        sourceEndMs: number;
        matchedChars: number;
        queryChars: number;
        sourceChars: number;
        clipCoverage: number;
        sourceCoverage: number;
        exact: boolean;
        sourceText: string;
        normalizedSourceText: string;
      }>;
    }>;
  }>;
};

type AudioComparison = {
  query: AudioSlice;
  reference: AudioSlice;
  sampleRate: number;
  querySamples: number;
  referenceSamples: number;
  direct: {
    correlationAtEnvelopeOffset: number;
    absoluteCorrelationAtEnvelopeOffset: number;
  };
  envelope: {
    frameMs: number;
    hopMs: number;
    maxCorrelation: number;
    minCorrelation: number;
    maxAbsoluteCorrelation: number;
    bestOffsetMs: number;
  };
  bestSourceWindow: {
    sourceStartMs: number;
    sourceEndMs: number;
  };
};

const sampleRate = 16000;
const envelopeFrameMs = 20;
const envelopeHopMs = 10;
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

  const alignmentFile = values.get('alignment')?.trim();
  const clipVideoPath = values.get('clipVideo')?.trim();
  const sourceVideoPath = values.get('sourceVideo')?.trim();
  const sourceId = values.get('sourceId')?.trim();
  if (!alignmentFile) {
    throw new Error('--alignment を指定してください');
  }
  if (!clipVideoPath) {
    throw new Error('--clipVideo を指定してください');
  }
  if (!sourceVideoPath) {
    throw new Error('--sourceVideo を指定してください');
  }
  if (!sourceId) {
    throw new Error('--sourceId を指定してください');
  }

  return {
    alignmentFile: path.resolve(alignmentFile),
    clipVideoPath: resolveWorkspacePath(clipVideoPath),
    sourceVideoPath: resolveWorkspacePath(sourceVideoPath),
    sourceId: sanitizePathPart(sourceId),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function readAudioSlice(options: {
  ffmpegCommand: string;
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
    String(sampleRate),
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

function rmsEnvelope(samples: Float32Array, frameMs: number, hopMs: number): Float32Array {
  const frameSamples = Math.max(1, Math.round(sampleRate * frameMs / 1000));
  const hopSamples = Math.max(1, Math.round(sampleRate * hopMs / 1000));
  if (samples.length < frameSamples) {
    return new Float32Array();
  }

  const frameCount = Math.floor((samples.length - frameSamples) / hopSamples) + 1;
  const result = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * hopSamples;
    let energy = 0;
    for (let index = 0; index < frameSamples; index += 1) {
      const value = samples[start + index] ?? 0;
      energy += value * value;
    }
    result[frame] = Math.sqrt(energy / frameSamples);
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

function orderForScan(query: Float32Array, reference: Float32Array): { query: Float32Array; reference: Float32Array; reversed: boolean } {
  return query.length <= reference.length
    ? { query, reference, reversed: false }
    : { query: reference, reference: query, reversed: true };
}

function correlationScan(queryInput: Float32Array, referenceInput: Float32Array): {
  maxCorrelation: number;
  minCorrelation: number;
  maxAbsoluteCorrelation: number;
  bestOffsetUnits: number;
  reversed: boolean;
} {
  const { query, reference, reversed } = orderForScan(queryInput, referenceInput);
  let maxCorrelation = Number.NEGATIVE_INFINITY;
  let minCorrelation = Number.POSITIVE_INFINITY;
  let maxAbsoluteCorrelation = 0;
  let bestOffsetUnits = 0;

  for (let offset = 0; offset <= reference.length - query.length; offset += 1) {
    const correlation = normalizedCorrelationAt(query, reference, offset);
    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      bestOffsetUnits = offset;
    }
    if (correlation < minCorrelation) {
      minCorrelation = correlation;
    }
    maxAbsoluteCorrelation = Math.max(maxAbsoluteCorrelation, Math.abs(correlation));
  }

  return { maxCorrelation, minCorrelation, maxAbsoluteCorrelation, bestOffsetUnits, reversed };
}

async function compareSlices(options: {
  ffmpegCommand: string;
  query: AudioSlice;
  reference: AudioSlice;
}): Promise<AudioComparison> {
  const queryAudio = await readAudioSlice({ ffmpegCommand: options.ffmpegCommand, slice: options.query });
  const referenceAudio = await readAudioSlice({ ffmpegCommand: options.ffmpegCommand, slice: options.reference });
  const queryEnvelope = rmsEnvelope(queryAudio, envelopeFrameMs, envelopeHopMs);
  const referenceEnvelope = rmsEnvelope(referenceAudio, envelopeFrameMs, envelopeHopMs);
  const envelopeScan = correlationScan(queryEnvelope, referenceEnvelope);
  const bestOffsetMs = envelopeScan.reversed ? 0 : Math.round(envelopeScan.bestOffsetUnits * envelopeHopMs);
  const orderedAudio = orderForScan(queryAudio, referenceAudio);
  const directOffsetSamples = orderedAudio.reversed
    ? 0
    : Math.min(
      Math.max(0, Math.round(bestOffsetMs * sampleRate / 1000)),
      Math.max(0, orderedAudio.reference.length - orderedAudio.query.length)
    );
  const directCorrelation = normalizedCorrelationAt(orderedAudio.query, orderedAudio.reference, directOffsetSamples);
  const queryDurationMs = options.query.endMs - options.query.startMs;

  return {
    query: options.query,
    reference: options.reference,
    sampleRate,
    querySamples: queryAudio.length,
    referenceSamples: referenceAudio.length,
    direct: {
      correlationAtEnvelopeOffset: roundMetric(directCorrelation),
      absoluteCorrelationAtEnvelopeOffset: roundMetric(Math.abs(directCorrelation))
    },
    envelope: {
      frameMs: envelopeFrameMs,
      hopMs: envelopeHopMs,
      maxCorrelation: roundMetric(envelopeScan.maxCorrelation),
      minCorrelation: roundMetric(envelopeScan.minCorrelation),
      maxAbsoluteCorrelation: roundMetric(envelopeScan.maxAbsoluteCorrelation),
      bestOffsetMs
    },
    bestSourceWindow: {
      sourceStartMs: options.reference.startMs + bestOffsetMs,
      sourceEndMs: options.reference.startMs + bestOffsetMs + queryDurationMs
    }
  };
}

function roundMetric(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function msText(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function buildReport(input: {
  resultPath: string;
  sourceId: string;
  comparisons: Array<{
    chunkIndex: number;
    clipText: string;
    sourceText: string;
    textMatch: {
      clipCoverage: number;
      sourceCoverage: number;
      matchedChars: number;
      queryChars: number;
      sourceChars: number;
      exact: boolean;
    };
    audio: AudioComparison;
  }>;
}): string {
  const lines = [
    '# チャンク音声比較レポート',
    '',
    `- 参照元: ${input.sourceId}`,
    `- 結果JSON: ${path.relative(evalRoot, input.resultPath)}`,
    '',
    '## 比較方法',
    '',
    '- 切り抜き側の各チャンク音声を、字幕照合で見つけた元動画候補範囲の中で比較',
    '- 16kHzモノラルPCMへ変換し、20msフレーム/10ms間隔の音量包絡を走査',
    '- しきい値で自動確定せず、テキスト照合、音声比較、目視確認を分けて読む',
    '- 切り抜きは編集で待ち時間が詰められている可能性があるため、全体を連続1区間として扱わない',
    '',
    '## 結果',
    ''
  ];

  for (const item of input.comparisons) {
    lines.push(`### チャンク ${item.chunkIndex + 1}`);
    lines.push('');
    lines.push(`- 切り抜き範囲: ${msText(item.audio.query.startMs)} - ${msText(item.audio.query.endMs)}`);
    lines.push(`- 字幕候補範囲: ${msText(item.audio.reference.startMs)} - ${msText(item.audio.reference.endMs)}`);
    lines.push(`- 音声が最も寄った元動画範囲: ${msText(item.audio.bestSourceWindow.sourceStartMs)} - ${msText(item.audio.bestSourceWindow.sourceEndMs)}`);
    lines.push(`- テキスト一致度: 切り抜き側 ${percent(item.textMatch.clipCoverage)} / 参照元側 ${percent(item.textMatch.sourceCoverage)} / 完全一致 ${item.textMatch.exact ? 'yes' : 'no'}`);
    lines.push(`- 音量包絡相関: 最大 ${item.audio.envelope.maxCorrelation}, 最小 ${item.audio.envelope.minCorrelation}, 最大絶対値 ${item.audio.envelope.maxAbsoluteCorrelation}, 最良ずれ ${item.audio.envelope.bestOffsetMs}ms`);
    lines.push(`- 波形直接相関: 包絡で見つけた位置 ${item.audio.direct.correlationAtEnvelopeOffset}, 絶対値 ${item.audio.direct.absoluteCorrelationAtEnvelopeOffset}`);
    lines.push(`- 切り抜き文字起こし: ${item.clipText}`);
    lines.push(`- 元動画字幕: ${item.sourceText}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const alignment = await readJson<AlignmentFile>(options.alignmentFile);
  const comparisons = [];

  for (const item of alignment.chunkResults ?? []) {
    const sourceMatch = item.sourceMatches?.find((source) => source.sourceId === options.sourceId);
    const match = sourceMatch?.matches[0];
    if (!match) {
      continue;
    }

    const audio = await compareSlices({
      ffmpegCommand: options.ffmpegCommand,
      query: {
        label: `clip-chunk-${item.chunk.index + 1}`,
        inputPath: options.clipVideoPath,
        startMs: item.chunk.startMs,
        endMs: item.chunk.endMs
      },
      reference: {
        label: `${options.sourceId}-chunk-${item.chunk.index + 1}`,
        inputPath: options.sourceVideoPath,
        startMs: match.sourceStartMs,
        endMs: match.sourceEndMs
      }
    });

    comparisons.push({
      chunkIndex: item.chunk.index,
      clipText: item.chunk.text,
      sourceText: match.sourceText,
      textMatch: {
        clipCoverage: match.clipCoverage,
        sourceCoverage: match.sourceCoverage,
        matchedChars: match.matchedChars,
        queryChars: match.queryChars,
        sourceChars: match.sourceChars,
        exact: match.exact
      },
      audio
    });
  }

  const result = {
    kind: 'clip_composition_aligned_audio_chunk_comparison',
    runAt: new Date().toISOString(),
    sourceId: options.sourceId,
    clipVideoPath: path.relative(workspaceRoot(), options.clipVideoPath),
    sourceVideoPath: path.relative(workspaceRoot(), options.sourceVideoPath),
    alignmentFile: path.relative(workspaceRoot(), options.alignmentFile),
    settings: {
      sampleRate,
      channels: 1,
      pcmFormat: 'f32le',
      envelopeFrameMs,
      envelopeHopMs,
      confirmationPolicy: 'しきい値で自動確定せず、テキスト照合、音声比較、目視確認を分けて判断する'
    },
    comparisons
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const resultPath = path.join(outputDir, `audio-compare-chunks-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `audio-compare-chunks-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport({ resultPath, sourceId: options.sourceId, comparisons }), 'utf8');
  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  for (const item of comparisons) {
    console.log(
      `chunk ${item.chunkIndex + 1}: ` +
      `${msText(item.audio.bestSourceWindow.sourceStartMs)}-${msText(item.audio.bestSourceWindow.sourceEndMs)} ` +
      `text=${percent(item.textMatch.clipCoverage)} envelope=${item.audio.envelope.maxCorrelation} direct=${item.audio.direct.correlationAtEnvelopeOffset}`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
