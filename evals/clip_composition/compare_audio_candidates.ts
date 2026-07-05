import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

type CliOptions = {
  targetFile: string;
  alignmentFile: string;
  outputId: string;
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
  }>;
};

type WordTimestampFile = {
  words?: Array<{
    text: string;
    startMs: number;
    endMs: number;
  }>;
};

type AlignmentFile = {
  chunkResults?: Array<{
    sourceMatches?: Array<{
      sourceId: string;
      matches: Array<{
        sourceId: string;
        sourceStartMs: number;
        sourceEndMs: number;
        clipCoverage: number;
        sourceCoverage: number;
        sourceText: string;
        normalizedSourceText: string;
      }>;
    }>;
  }>;
};

type AudioSlice = {
  label: string;
  inputPath: string;
  startMs: number;
  endMs: number;
};

type ComparisonMetric = {
  query: AudioSlice;
  reference: AudioSlice;
  sampleRate: number;
  querySamples: number;
  referenceSamples: number;
  direct: {
    correlationAtEnvelopeOffset: number;
    absoluteCorrelationAtEnvelopeOffset: number;
    evaluatedOffsetMs: number;
  };
  envelope: {
    frameMs: number;
    hopMs: number;
    maxCorrelation: number;
    minCorrelation: number;
    maxAbsoluteCorrelation: number;
    bestOffsetMs: number;
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

  const targetFile = values.get('target')?.trim();
  if (!targetFile) {
    throw new Error('--target evals/clip_composition/stt-targets/IMQYaT_RWRA.json を指定してください');
  }

  const alignmentFile = values.get('alignment')?.trim();
  if (!alignmentFile) {
    throw new Error('--alignment evals/clip_composition/outputs/alignment-IMQYaT_RWRA_v001.json を指定してください');
  }

  const outputId = values.get('outputId')?.trim() || timestampForFile();

  return {
    targetFile: path.resolve(targetFile),
    alignmentFile: path.resolve(alignmentFile),
    outputId: sanitizePathPart(outputId),
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  };
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

function sourceMap(target: TargetFile): Map<string, { id: string; sttId: string; inputPath: string }> {
  const result = new Map<string, { id: string; sttId: string; inputPath: string }>();
  for (const source of target.sourceCandidates) {
    if (!source.localVideoPath) {
      continue;
    }
    const sttId = source.sttId ?? source.id;
    result.set(sttId, {
      id: source.id,
      sttId,
      inputPath: resolveWorkspacePath(source.localVideoPath)
    });
  }
  return result;
}

function bestMatchesBySource(alignment: AlignmentFile) {
  const firstChunk = alignment.chunkResults?.[0];
  return (firstChunk?.sourceMatches ?? []).flatMap((source) => {
    const best = source.matches[0];
    return best ? [{ sourceId: source.sourceId, match: best }] : [];
  });
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

function correlationScan(queryInput: Float32Array, referenceInput: Float32Array): {
  maxCorrelation: number;
  minCorrelation: number;
  maxAbsoluteCorrelation: number;
  bestOffsetUnits: number;
} {
  const { query, reference } = orderForScan(queryInput, referenceInput);
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

  return {
    maxCorrelation,
    minCorrelation,
    maxAbsoluteCorrelation,
    bestOffsetUnits
  };
}

function orderForScan(query: Float32Array, reference: Float32Array): { query: Float32Array; reference: Float32Array } {
  return query.length <= reference.length
    ? { query, reference }
    : { query: reference, reference: query };
}

function rmsEnvelope(samples: Float32Array, frameMs: number, hopMs: number): Float32Array {
  const frameSamples = Math.max(1, Math.round(sampleRate * frameMs / 1000));
  const hopSamples = Math.max(1, Math.round(sampleRate * hopMs / 1000));
  const frameCount = Math.max(1, Math.floor(Math.max(0, samples.length - frameSamples) / hopSamples) + 1);
  const result = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * hopSamples;
    const end = Math.min(samples.length, start + frameSamples);
    let energy = 0;
    for (let index = start; index < end; index += 1) {
      const value = samples[index] ?? 0;
      energy += value * value;
    }
    result[frame] = Math.sqrt(energy / Math.max(1, end - start));
  }
  return result;
}

async function compareSlices(options: {
  ffmpegCommand: string;
  query: AudioSlice;
  reference: AudioSlice;
}): Promise<ComparisonMetric> {
  const queryAudio = await readAudioSlice({ ffmpegCommand: options.ffmpegCommand, slice: options.query });
  const referenceAudio = await readAudioSlice({ ffmpegCommand: options.ffmpegCommand, slice: options.reference });

  const queryEnvelope = rmsEnvelope(queryAudio, envelopeFrameMs, envelopeHopMs);
  const referenceEnvelope = rmsEnvelope(referenceAudio, envelopeFrameMs, envelopeHopMs);
  const envelopeScan = correlationScan(queryEnvelope, referenceEnvelope);
  const envelopeOffsetMs = Math.round(envelopeScan.bestOffsetUnits * envelopeHopMs);
  const directOffsetSamples = Math.min(
    Math.max(0, Math.round(envelopeOffsetMs * sampleRate / 1000)),
    Math.max(0, referenceAudio.length - queryAudio.length)
  );
  const orderedForDirect = orderForScan(queryAudio, referenceAudio);
  const directCorrelation = normalizedCorrelationAt(
    orderedForDirect.query,
    orderedForDirect.reference,
    Math.min(directOffsetSamples, Math.max(0, orderedForDirect.reference.length - orderedForDirect.query.length))
  );

  return {
    query: options.query,
    reference: options.reference,
    sampleRate,
    querySamples: queryAudio.length,
    referenceSamples: referenceAudio.length,
    direct: {
      correlationAtEnvelopeOffset: roundMetric(directCorrelation),
      absoluteCorrelationAtEnvelopeOffset: roundMetric(Math.abs(directCorrelation)),
      evaluatedOffsetMs: envelopeOffsetMs
    },
    envelope: {
      frameMs: envelopeFrameMs,
      hopMs: envelopeHopMs,
      maxCorrelation: roundMetric(envelopeScan.maxCorrelation),
      minCorrelation: roundMetric(envelopeScan.minCorrelation),
      maxAbsoluteCorrelation: roundMetric(envelopeScan.maxAbsoluteCorrelation),
      bestOffsetMs: envelopeOffsetMs
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

function buildReport(input: {
  target: TargetFile;
  clipSpeech: { startMs: number; endMs: number; text: string };
  comparisons: Array<{
    sourceId: string;
    sttId: string;
    alignment: {
      sourceStartMs: number;
      sourceEndMs: number;
      clipCoverage: number;
      sourceCoverage: number;
      sourceText: string;
    };
    fullTimeline: ComparisonMetric;
    speechOnly: ComparisonMetric;
  }>;
  resultPath: string;
}): string {
  const lines = [
    '# 音声比較レポート',
    '',
    `- 対象: ${input.target.targetId}`,
    `- 結果JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- 切り抜き発話範囲: ${msText(input.clipSpeech.startMs)} - ${msText(input.clipSpeech.endMs)}`,
    `- 切り抜き発話STT: ${input.clipSpeech.text}`,
    '',
    '## 比較方法',
    '',
    '- 切り抜き全体と、STT候補開始時刻を切り抜き内発話開始位置に合わせた参照元音声を比較',
    '- 切り抜き発話部分と、STT照合で出た参照元候補範囲を比較',
    '- 16kHzモノラルPCMに変換して正規化相関を計算',
    '- 20msフレーム/10ms間隔のRMS包絡で最良位置を探し、その位置の波形直接相関を併記',
    '- しきい値で自動確定せず、候補同士の相対比較として読む',
    '',
    '## 結果',
    ''
  ];

  for (const item of input.comparisons) {
    lines.push(`### ${item.sourceId}`);
    lines.push('');
    lines.push(`- STT候補範囲: ${msText(item.alignment.sourceStartMs)} - ${msText(item.alignment.sourceEndMs)}`);
    lines.push(`- STT一致度: 切り抜き側 ${percent(item.alignment.clipCoverage)} / 参照元側 ${percent(item.alignment.sourceCoverage)}`);
    lines.push(`- 参照元STT: ${item.alignment.sourceText}`);
    lines.push('');
    appendMetric(lines, '切り抜き全体', item.fullTimeline);
    appendMetric(lines, '発話部分のみ', item.speechOnly);
    lines.push('');
  }

  lines.push('## 読み方');
  lines.push('');
  lines.push('- 再編集候補の相関が元配信候補より高い場合、切り抜き同士の近さを示す');
  lines.push('- 元配信候補の発話部分だけが高い場合、元配信の該当発話である可能性が上がる');
  lines.push('- 切り抜きにBGMやSEが重なっている場合、全体波形の相関は下がる');
  lines.push('- expectedCutsへ固定する前に、音声比較結果と目視確認を合わせて見る');

  return `${lines.join('\n')}\n`;
}

function appendMetric(lines: string[], label: string, metric: ComparisonMetric): void {
  lines.push(`#### ${label}`);
  lines.push('');
  lines.push(`- 切り抜き側: ${msText(metric.query.startMs)} - ${msText(metric.query.endMs)}`);
  lines.push(`- 参照元側: ${msText(metric.reference.startMs)} - ${msText(metric.reference.endMs)}`);
  lines.push(`- 波形直接相関: 包絡で見つけた位置の相関 ${metric.direct.correlationAtEnvelopeOffset}, 絶対値 ${metric.direct.absoluteCorrelationAtEnvelopeOffset}, 評価位置 ${metric.direct.evaluatedOffsetMs}ms`);
  lines.push(`- 音量包絡相関: 最大 ${metric.envelope.maxCorrelation}, 最小 ${metric.envelope.minCorrelation}, 最大絶対値 ${metric.envelope.maxAbsoluteCorrelation}, 最良ずれ ${metric.envelope.bestOffsetMs}ms`);
}

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const target = await readJson<TargetFile>(options.targetFile);
  const alignment = await readJson<AlignmentFile>(options.alignmentFile);
  const clipInputPath = resolveWorkspacePath(target.clip.localVideoPath);
  const clipSttId = target.clip.sttId ?? target.clip.id;
  const clipSpeech = await clipSpeechRangeMs(clipSttId);
  const clipDurationMs = Math.round((target.clip.durationSec ?? 0) * 1000);
  if (clipDurationMs <= 0) {
    throw new Error('切り抜き動画のdurationSecがありません');
  }

  const sources = sourceMap(target);
  const comparisons = [];

  for (const item of bestMatchesBySource(alignment)) {
    const source = sources.get(item.sourceId);
    if (!source) {
      continue;
    }

    const fullReferenceStartMs = Math.max(0, item.match.sourceStartMs - clipSpeech.startMs);
    const fullTimeline = await compareSlices({
      ffmpegCommand: options.ffmpegCommand,
      query: {
        label: 'clip-full',
        inputPath: clipInputPath,
        startMs: 0,
        endMs: clipDurationMs
      },
      reference: {
        label: `${source.sttId}-timeline-aligned`,
        inputPath: source.inputPath,
        startMs: fullReferenceStartMs,
        endMs: fullReferenceStartMs + clipDurationMs
      }
    });

    const speechOnly = await compareSlices({
      ffmpegCommand: options.ffmpegCommand,
      query: {
        label: 'clip-speech',
        inputPath: clipInputPath,
        startMs: clipSpeech.startMs,
        endMs: clipSpeech.endMs
      },
      reference: {
        label: `${source.sttId}-stt-match`,
        inputPath: source.inputPath,
        startMs: item.match.sourceStartMs,
        endMs: item.match.sourceEndMs
      }
    });

    comparisons.push({
      sourceId: source.id,
      sttId: source.sttId,
      alignment: item.match,
      fullTimeline,
      speechOnly
    });
  }

  const result = {
    kind: 'clip_composition_audio_candidate_comparison',
    runAt: new Date().toISOString(),
    targetId: target.targetId,
    clip: {
      id: target.clip.id,
      sttId: clipSttId,
      localVideoPath: target.clip.localVideoPath,
      durationMs: clipDurationMs,
      speechRange: clipSpeech
    },
    settings: {
      sampleRate,
      channels: 1,
      pcmFormat: 'f32le',
      envelopeFrameMs,
      envelopeHopMs,
      confirmationPolicy: 'しきい値で自動確定せず、相関値と目視確認で判断する'
    },
    comparisons
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const resultPath = path.join(outputDir, `audio-compare-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `audio-compare-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport({ target, clipSpeech, comparisons, resultPath }), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  for (const item of comparisons) {
    console.log(
      `${item.sourceId}: ` +
      `full direct=${item.fullTimeline.direct.correlationAtEnvelopeOffset} envelope=${item.fullTimeline.envelope.maxCorrelation}; ` +
      `speech direct=${item.speechOnly.direct.correlationAtEnvelopeOffset} envelope=${item.speechOnly.envelope.maxCorrelation}`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
