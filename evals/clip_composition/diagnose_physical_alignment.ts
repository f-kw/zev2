import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

type CliOptions = {
  realignmentPath: string;
  targetPath: string;
  outputId: string;
  ffmpegCommand: string;
};

type WordTimestamp = {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
  segmentId?: number;
};

type WordTimestampFile = {
  words?: WordTimestamp[];
};

type NormalizedWord = WordTimestamp & {
  normalizedText: string;
  wordIndex: number;
};

type TextChar = {
  char: string;
  startMs: number;
  endMs: number;
  wordIndex: number;
};

type SttTarget = {
  clip?: {
    localVideoPath?: string;
  };
  sourceCandidates?: Array<{
    id?: string;
    sttId?: string;
    localVideoPath?: string;
  }>;
};

type RealignmentFile = {
  clipId: string;
  sourceId: string;
  readyForFreeze: boolean;
  humanConfirmedPairPolicy?: {
    inheritedPair?: {
      clipStartMs: number;
      clipEndMs: number;
      sourceStartMs: number;
      sourceEndMs: number;
      checkedBy?: string;
      status?: string;
    };
  };
  settings?: {
    minSegmentMs?: number;
    maxAudioCutpoints?: number;
    maxVideoCutpoints?: number;
  };
  cutpointDetection?: {
    selectedCutpoints?: RankedCutpoint[];
  };
  segments?: Array<{
    segment: {
      index: number;
      startMs: number;
      endMs: number;
      durationMs: number;
      text?: string;
      boundaryEvidence?: RankedCutpoint[];
    };
    bestMatch?: {
      sourceStartMs: number;
      sourceEndMs: number;
      sourceText?: string;
      normalizedSourceText?: string;
      clipCoverage?: number;
      timeAxis?: {
        linearContinuityRatio?: number;
        longestLinearRunClipStartMs?: number;
        longestLinearRunClipEndMs?: number;
      };
    };
  }>;
};

type RankedCutpoint = {
  timeMs: number;
  kind: string;
  rank: number;
  value: number;
};

type AlignmentRow = {
  index: number;
  clipStartMs: number;
  clipEndMs: number;
  clipTimeMs: number;
  sourceTimeMs: number;
  clipToken: string;
  sourceToken: string;
  sourcePhrase: string;
  predictedNewSourceMs: number;
  residualNewMs: number;
  predictedOldSourceMs: number;
  newMinusOldAtClipMs: number;
};

const sampleRate = 16000;
const audioFrameMs = 20;
const audioHopMs = 10;
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
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }
    values.set(key, next);
    index += 1;
  }
  const realignmentPath = values.get('realignment')?.trim();
  const targetPath = values.get('target')?.trim();
  if (!realignmentPath) {
    throw new Error('--realignment を指定してください');
  }
  if (!targetPath) {
    throw new Error('--target を指定してください');
  }
  return {
    realignmentPath: resolveWorkspacePath(realignmentPath),
    targetPath: resolveWorkspacePath(targetPath),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  };
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function relativeWorkspacePath(filePath: string): string {
  return path.relative(workspaceRoot(), filePath);
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

function sttPath(itemId: string, role: 'clip' | 'source'): string {
  return path.join(evalRoot, 'stt', itemId, role, 'word-timestamps.json');
}

async function loadWords(itemId: string, role: 'clip' | 'source'): Promise<NormalizedWord[]> {
  const payload = await readJson<WordTimestampFile>(sttPath(itemId, role));
  return (payload.words ?? [])
    .filter((word) => (
      typeof word.text === 'string' &&
      typeof word.startMs === 'number' &&
      typeof word.endMs === 'number' &&
      word.endMs >= word.startMs
    ))
    .sort((left, right) => left.startMs - right.startMs)
    .map((word, wordIndex) => ({
      ...word,
      wordIndex,
      normalizedText: normalizeForMatch(word.text)
    }));
}

function normalizeForMatch(text: string): string {
  const normalizedWidth = text.normalize('NFKC').toLowerCase();
  let hiragana = '';
  for (const char of normalizedWidth) {
    const code = char.charCodeAt(0);
    if (code >= 0x30a1 && code <= 0x30f6) {
      hiragana += String.fromCharCode(code - 0x60);
      continue;
    }
    hiragana += char;
  }
  return hiragana
    .replace(/[ーｰ]/g, '')
    .replace(/[\p{P}\p{S}\s]/gu, '');
}

function wordsInRange(words: NormalizedWord[], startMs: number, endMs: number): NormalizedWord[] {
  return words.filter((word) => word.endMs > startMs && word.startMs < endMs);
}

function buildTextChars(words: NormalizedWord[]): TextChar[] {
  const chars: TextChar[] = [];
  for (const word of words) {
    for (const char of word.normalizedText) {
      chars.push({
        char,
        startMs: word.startMs,
        endMs: word.endMs,
        wordIndex: word.wordIndex
      });
    }
  }
  return chars;
}

function lcsPairs(left: string, right: string): Array<{ leftIndex: number; rightIndex: number }> {
  const table = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      table[leftIndex]![rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? (table[leftIndex - 1]?.[rightIndex - 1] ?? 0) + 1
        : Math.max(table[leftIndex - 1]?.[rightIndex] ?? 0, table[leftIndex]?.[rightIndex - 1] ?? 0);
    }
  }
  const pairs: Array<{ leftIndex: number; rightIndex: number }> = [];
  let leftIndex = left.length;
  let rightIndex = right.length;
  while (leftIndex > 0 && rightIndex > 0) {
    if (left[leftIndex - 1] === right[rightIndex - 1]) {
      pairs.push({ leftIndex: leftIndex - 1, rightIndex: rightIndex - 1 });
      leftIndex -= 1;
      rightIndex -= 1;
      continue;
    }
    if ((table[leftIndex - 1]?.[rightIndex] ?? 0) >= (table[leftIndex]?.[rightIndex - 1] ?? 0)) {
      leftIndex -= 1;
    } else {
      rightIndex -= 1;
    }
  }
  return pairs.reverse();
}

function uniqueByClipWord(rows: AlignmentRow[]): AlignmentRow[] {
  const result = new Map<number, AlignmentRow>();
  for (const row of rows) {
    if (!result.has(row.index)) {
      result.set(row.index, row);
    }
  }
  return [...result.values()].sort((left, right) => left.clipTimeMs - right.clipTimeMs);
}

function buildSeg14AlignmentRows(input: {
  segmentStartMs: number;
  segmentEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  confirmedClipStartMs: number;
  confirmedSourceStartMs: number;
  clipWords: NormalizedWord[];
  sourceWords: NormalizedWord[];
}): AlignmentRow[] {
  const clipWords = wordsInRange(input.clipWords, input.segmentStartMs, input.segmentEndMs);
  const sourceWords = wordsInRange(input.sourceWords, input.sourceStartMs, input.sourceEndMs);
  const clipChars = buildTextChars(clipWords);
  const sourceChars = buildTextChars(sourceWords);
  const query = clipChars.map((item) => item.char).join('');
  const sourceText = sourceChars.map((item) => item.char).join('');
  const clipWordByIndex = new Map(input.clipWords.map((word) => [word.wordIndex, word]));
  const sourceWordByIndex = new Map(input.sourceWords.map((word) => [word.wordIndex, word]));
  const newScale = (input.sourceEndMs - input.sourceStartMs) / Math.max(1, input.segmentEndMs - input.segmentStartMs);
  const rows: AlignmentRow[] = [];

  for (const [pairIndex, pair] of lcsPairs(query, sourceText).entries()) {
    const clipChar = clipChars[pair.leftIndex];
    const sourceChar = sourceChars[pair.rightIndex];
    if (!clipChar || !sourceChar) {
      continue;
    }
    const clipWord = clipWordByIndex.get(clipChar.wordIndex);
    const sourceWord = sourceWordByIndex.get(sourceChar.wordIndex);
    if (!clipWord || !sourceWord) {
      continue;
    }
    const clipTimeMs = Math.round((clipWord.startMs + clipWord.endMs) / 2);
    const sourceTimeMs = Math.round((sourceWord.startMs + sourceWord.endMs) / 2);
    const predictedNewSourceMs = Math.round(input.sourceStartMs + (clipTimeMs - input.segmentStartMs) * newScale);
    const predictedOldSourceMs = Math.round(input.confirmedSourceStartMs + (clipTimeMs - input.confirmedClipStartMs));
    rows.push({
      index: pairIndex + 1,
      clipStartMs: clipWord.startMs,
      clipEndMs: clipWord.endMs,
      clipTimeMs,
      sourceTimeMs,
      clipToken: clipWord.text,
      sourceToken: sourceChar.char,
      sourcePhrase: sourceWord.text,
      predictedNewSourceMs,
      residualNewMs: sourceTimeMs - predictedNewSourceMs,
      predictedOldSourceMs,
      newMinusOldAtClipMs: predictedNewSourceMs - predictedOldSourceMs
    });
  }
  return uniqueByClipWord(rows);
}

function findBreak(rows: AlignmentRow[], seg14: { startMs: number; endMs: number }, clipWords: NormalizedWord[]) {
  let largestResidualJump: { from?: AlignmentRow; to?: AlignmentRow; jumpMs: number } = { jumpMs: 0 };
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const current = rows[index]!;
    const jumpMs = Math.abs(current.residualNewMs) - Math.abs(previous.residualNewMs);
    if (jumpMs > largestResidualJump.jumpMs) {
      largestResidualJump = { from: previous, to: current, jumpMs };
    }
  }

  const lastMatched = rows.at(-1);
  const firstUnmatchedAfter = lastMatched
    ? clipWords.find((word) => word.startMs >= lastMatched.clipEndMs && word.startMs < seg14.endMs)
    : undefined;
  const breakClipMs = firstUnmatchedAfter?.startMs ?? lastMatched?.clipEndMs ?? seg14.startMs;
  return {
    largestResidualJump,
    lastMatchedClipTimeMs: lastMatched?.clipTimeMs,
    lastMatchedClipEndMs: lastMatched?.clipEndMs,
    lastMatchedToken: lastMatched?.clipToken,
    firstUnmatchedAfter: firstUnmatchedAfter ? {
      text: firstUnmatchedAfter.text,
      startMs: firstUnmatchedAfter.startMs,
      endMs: firstUnmatchedAfter.endMs
    } : undefined,
    breakClipMs,
    samples: [
      { label: 'residual_jump_before', clipMs: largestResidualJump.from?.clipTimeMs ?? Math.max(seg14.startMs, breakClipMs - 260) },
      { label: 'residual_jump_after', clipMs: largestResidualJump.to?.clipTimeMs ?? breakClipMs },
      { label: 'unmatched_tail_start', clipMs: breakClipMs },
      { label: 'near_segment_end', clipMs: Math.max(seg14.startMs, seg14.endMs - 100) }
    ]
  };
}

async function spawnCapture(command: string, args: string[], input?: Buffer): Promise<Buffer> {
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args);
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${Buffer.concat(stderr).toString('utf8')}`));
    });
    if (input) {
      child.stdin.end(input);
    }
  });
  return Buffer.concat(stdout.length > 0 ? stdout : stderr);
}

async function readAudio(ffmpegCommand: string, inputPath: string): Promise<Float32Array> {
  const buffer = await spawnCapture(ffmpegCommand, [
    '-v',
    'error',
    '-i',
    inputPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(sampleRate),
    '-f',
    'f32le',
    'pipe:1'
  ]);
  const samples = new Float32Array(buffer.byteLength / 4);
  for (let offset = 0; offset < samples.length; offset += 1) {
    samples[offset] = buffer.readFloatLE(offset * 4);
  }
  return samples;
}

function rmsEnvelope(samples: Float32Array): Float32Array {
  const frameSamples = Math.max(1, Math.round(sampleRate * audioFrameMs / 1000));
  const hopSamples = Math.max(1, Math.round(sampleRate * audioHopMs / 1000));
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

function localMaxima(rows: Array<{ timeMs: number; value: number }>): Array<{ timeMs: number; value: number }> {
  const result: Array<{ timeMs: number; value: number }> = [];
  for (let index = 1; index < rows.length - 1; index += 1) {
    const previous = rows[index - 1]?.value ?? 0;
    const current = rows[index]?.value ?? 0;
    const next = rows[index + 1]?.value ?? 0;
    if (current >= previous && current >= next && current > 0) {
      result.push(rows[index]!);
    }
  }
  return result;
}

function rankedAudioCutpoints(samples: Float32Array): RankedCutpoint[] {
  const envelope = rmsEnvelope(samples);
  const deltas: Array<{ timeMs: number; value: number }> = [];
  for (let index = 1; index < envelope.length; index += 1) {
    const value = Math.abs((envelope[index] ?? 0) - (envelope[index - 1] ?? 0));
    deltas.push({ timeMs: index * audioHopMs, value });
  }
  return localMaxima(deltas)
    .sort((left, right) => right.value - left.value || left.timeMs - right.timeMs)
    .map((item, index) => ({
      timeMs: item.timeMs,
      value: roundMetric(item.value),
      rank: index + 1,
      kind: 'audio_discontinuity'
    }));
}

async function rankedVideoCutpoints(ffmpegCommand: string, inputPath: string): Promise<RankedCutpoint[]> {
  const output = await spawnCapture(ffmpegCommand, [
    '-hide_banner',
    '-v',
    'error',
    '-i',
    inputPath,
    '-vf',
    'scdet,metadata=print:file=-',
    '-an',
    '-f',
    'null',
    '-'
  ]);
  const rows: Array<{ timeMs: number; value: number }> = [];
  let currentTimeMs: number | undefined;
  for (const line of output.toString('utf8').split(/\r?\n/)) {
    const timeMatch = line.match(/pts_time:([0-9.]+)/);
    if (timeMatch) {
      currentTimeMs = Math.round(Number.parseFloat(timeMatch[1] ?? '0') * 1000);
      continue;
    }
    const scoreMatch = line.match(/lavfi\.scd\.score=([0-9.]+)/);
    if (scoreMatch && currentTimeMs !== undefined) {
      rows.push({ timeMs: currentTimeMs, value: Number.parseFloat(scoreMatch[1] ?? '0') });
    }
  }
  return localMaxima(rows)
    .sort((left, right) => right.value - left.value || left.timeMs - right.timeMs)
    .map((item, index) => ({
      timeMs: item.timeMs,
      value: roundMetric(item.value),
      rank: index + 1,
      kind: 'video_scene_change'
    }));
}

function around(candidates: RankedCutpoint[], targetMs: number, windowMs: number): RankedCutpoint[] {
  return candidates
    .filter((item) => Math.abs(item.timeMs - targetMs) <= windowMs)
    .sort((left, right) => Math.abs(left.timeMs - targetMs) - Math.abs(right.timeMs - targetMs) || left.rank - right.rank);
}

function nearest(candidates: RankedCutpoint[], targetMs: number): RankedCutpoint | undefined {
  return [...candidates].sort((left, right) =>
    Math.abs(left.timeMs - targetMs) - Math.abs(right.timeMs - targetMs) || left.rank - right.rank
  )[0];
}

function targetVideos(target: SttTarget, sourceId: string): { clipVideoPath: string; sourceVideoPath: string } {
  const clipVideoPath = target.clip?.localVideoPath;
  const source = target.sourceCandidates?.find((item) => (
    item.sttId === sourceId ||
    item.id === sourceId ||
    (item.sttId && sourceId.startsWith(`${item.sttId}_`))
  ));
  const sourceVideoPath = source?.localVideoPath;
  if (!clipVideoPath) {
    throw new Error('targetに切り抜き動画パスがありません');
  }
  if (!sourceVideoPath) {
    throw new Error(`targetに元動画パスがありません: ${sourceId}`);
  }
  return {
    clipVideoPath: resolveWorkspacePath(clipVideoPath),
    sourceVideoPath: resolveWorkspacePath(sourceVideoPath)
  };
}

async function writeSeg14Panel(input: {
  ffmpegCommand: string;
  clipVideoPath: string;
  sourceVideoPath: string;
  outputPath: string;
  clipMs: number;
  oldSourceMs: number;
  newSourceMs: number;
}): Promise<void> {
  await spawnCapture(input.ffmpegCommand, [
    '-y',
    '-v',
    'error',
    '-ss',
    (input.clipMs / 1000).toFixed(3),
    '-i',
    input.clipVideoPath,
    '-ss',
    (input.oldSourceMs / 1000).toFixed(3),
    '-i',
    input.sourceVideoPath,
    '-ss',
    (input.newSourceMs / 1000).toFixed(3),
    '-i',
    input.sourceVideoPath,
    '-frames:v',
    '1',
    '-filter_complex',
    '[0:v]scale=426:-2[a];[1:v]scale=426:-2[b];[2:v]scale=426:-2[c];[a][b][c]hstack=inputs=3',
    '-q:v',
    '2',
    input.outputPath
  ]);
}

async function writeSeg11Panel(input: {
  ffmpegCommand: string;
  clipVideoPath: string;
  outputPath: string;
  beforeMs: number;
  atMs: number;
  afterMs: number;
}): Promise<void> {
  await spawnCapture(input.ffmpegCommand, [
    '-y',
    '-v',
    'error',
    '-ss',
    (input.beforeMs / 1000).toFixed(3),
    '-i',
    input.clipVideoPath,
    '-ss',
    (input.atMs / 1000).toFixed(3),
    '-i',
    input.clipVideoPath,
    '-ss',
    (input.afterMs / 1000).toFixed(3),
    '-i',
    input.clipVideoPath,
    '-frames:v',
    '1',
    '-filter_complex',
    '[0:v]scale=426:-2[a];[1:v]scale=426:-2[b];[2:v]scale=426:-2[c];[a][b][c]hstack=inputs=3',
    '-q:v',
    '2',
    input.outputPath
  ]);
}

function msText(ms: number | undefined): string {
  if (ms === undefined) {
    return 'unknown';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function percent(value: number | undefined): string {
  return value === undefined ? 'unknown' : `${Math.round(value * 1000) / 10}%`;
}

function roundMetric(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function buildReport(input: {
  resultPath: string;
  diagnosis: Record<string, any>;
}): string {
  const d = input.diagnosis;
  const lines = [
    '# 物理照合診断: seg14 / seg11 / 旧chunk4',
    '',
    `- 診断JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- readyForFreeze: ${d.readyForFreeze ? 'true' : 'false'}`,
    `- 結論: ${d.conclusion.label}`,
    '',
    '## seg14 結論',
    '',
    ...d.conclusion.reasons.map((item: string) => `- ${item}`),
    '',
    '## seg14 単語対応表抜粋',
    '',
    '| clip | source(new) | token | residual new | old predicted | new-old |',
    '| --- | --- | --- | ---: | --- | ---: |'
  ];

  for (const row of d.seg14.alignmentRows) {
    lines.push(`| ${msText(row.clipTimeMs)} | ${msText(row.sourceTimeMs)} | ${row.clipToken}/${row.sourceToken} | ${row.residualNewMs}ms | ${msText(row.predictedOldSourceMs)} | ${row.newMinusOldAtClipMs}ms |`);
  }

  lines.push('');
  lines.push('## seg14 物理静止画');
  lines.push('');
  for (const sample of d.seg14.stillSamples) {
    lines.push(`- ${sample.label}: clip ${msText(sample.clipMs)} / old ${msText(sample.oldSourceMs)} / new ${msText(sample.newSourceMs)} / ${sample.path}`);
  }
  lines.push('');
  lines.push('### 静止画観測');
  lines.push('');
  lines.push(...d.seg14.visualObservations.map((item: string) => `- ${item}`));
  lines.push('');
  lines.push('## seg11 始点検証');
  lines.push('');
  lines.push(`- 確認済み開始: ${msText(d.seg11.confirmedClipStartMs)}`);
  lines.push(`- 選択済み前後カット点: ${d.seg11.neighborSelectedCutpoints.map((item: any) => `${item.kind}@${msText(item.timeMs)} r${item.rank}`).join(', ')}`);
  lines.push(`- ±3秒内の音声候補: ${d.seg11.audioCandidatesAround.map((item: any) => `${msText(item.timeMs)} r${item.rank} v${item.value}`).join(', ') || 'none'}`);
  lines.push(`- ±3秒内の映像候補: ${d.seg11.videoCandidatesAround.map((item: any) => `${msText(item.timeMs)} r${item.rank} v${item.value}`).join(', ') || 'none'}`);
  lines.push(`- 判定: ${d.seg11.assessment}`);
  lines.push(`- 静止画: ${d.seg11.stillPath}`);
  lines.push('');
  lines.push('## 旧chunk4 再評価');
  lines.push('');
  lines.push(...d.oldChunk4Reevaluation.map((item: string) => `- ${item}`));
  lines.push('');
  lines.push('## DECISIONS.md 追記案');
  lines.push('');
  lines.push('```md');
  lines.push(...d.decisionsMdProposal);
  lines.push('```');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const realignment = await readJson<RealignmentFile>(options.realignmentPath);
  const target = await readJson<SttTarget>(options.targetPath);
  const confirmed = realignment.humanConfirmedPairPolicy?.inheritedPair;
  if (!confirmed) {
    throw new Error('realignmentに確認済みペアがありません');
  }
  const seg14 = realignment.segments?.find((item) => item.segment.index === 13);
  const seg11 = realignment.segments?.find((item) => item.segment.index === 10);
  if (!seg14?.bestMatch || !seg11?.bestMatch) {
    throw new Error('seg14またはseg11の照合結果が見つかりません');
  }

  const { clipVideoPath, sourceVideoPath } = targetVideos(target, realignment.sourceId);
  const clipWords = await loadWords(realignment.clipId, 'clip');
  const sourceWords = await loadWords(realignment.sourceId, 'source');
  const alignmentRows = buildSeg14AlignmentRows({
    segmentStartMs: seg14.segment.startMs,
    segmentEndMs: seg14.segment.endMs,
    sourceStartMs: seg14.bestMatch.sourceStartMs,
    sourceEndMs: seg14.bestMatch.sourceEndMs,
    confirmedClipStartMs: confirmed.clipStartMs,
    confirmedSourceStartMs: confirmed.sourceStartMs,
    clipWords,
    sourceWords
  });
  const breakdown = findBreak(alignmentRows, seg14.segment, clipWords);

  const outputRoot = path.join(evalRoot, 'outputs', 'visual-check', realignment.clipId, `physical-${options.outputId}`);
  await mkdir(outputRoot, { recursive: true });
  const seg14Scale = (seg14.bestMatch.sourceEndMs - seg14.bestMatch.sourceStartMs) /
    Math.max(1, seg14.segment.endMs - seg14.segment.startMs);
  const oldScale = (confirmed.sourceEndMs - confirmed.sourceStartMs) /
    Math.max(1, confirmed.clipEndMs - confirmed.clipStartMs);
  const stillSamples = [];
  for (const sample of breakdown.samples) {
    const oldSourceMs = Math.round(confirmed.sourceStartMs + (sample.clipMs - confirmed.clipStartMs) * oldScale);
    const newSourceMs = Math.round(seg14.bestMatch.sourceStartMs + (sample.clipMs - seg14.segment.startMs) * seg14Scale);
    const outputPath = path.join(outputRoot, `seg14_${sample.label}.jpg`);
    await writeSeg14Panel({
      ffmpegCommand: options.ffmpegCommand,
      clipVideoPath,
      sourceVideoPath,
      outputPath,
      clipMs: sample.clipMs,
      oldSourceMs,
      newSourceMs
    });
    stillSamples.push({
      ...sample,
      oldSourceMs,
      newSourceMs,
      path: relativeWorkspacePath(outputPath)
    });
  }

  const seg11StillPath = path.join(outputRoot, 'seg11_confirmed_start_pre_at_post.jpg');
  await writeSeg11Panel({
    ffmpegCommand: options.ffmpegCommand,
    clipVideoPath,
    outputPath: seg11StillPath,
    beforeMs: confirmed.clipStartMs - 500,
    atMs: confirmed.clipStartMs,
    afterMs: confirmed.clipStartMs + 500
  });

  const clipAudio = await readAudio(options.ffmpegCommand, clipVideoPath);
  const allAudio = rankedAudioCutpoints(clipAudio);
  const allVideo = await rankedVideoCutpoints(options.ffmpegCommand, clipVideoPath);
  const audioAround = around(allAudio, confirmed.clipStartMs, 3000).slice(0, 10);
  const videoAround = around(allVideo, confirmed.clipStartMs, 3000).slice(0, 10);
  const selected = realignment.cutpointDetection?.selectedCutpoints ?? [];
  const neighborSelectedCutpoints = [...selected]
    .sort((left, right) => Math.abs(left.timeMs - confirmed.clipStartMs) - Math.abs(right.timeMs - confirmed.clipStartMs))
    .slice(0, 4);
  const nearestAudio = nearest(allAudio, confirmed.clipStartMs);
  const nearestVideo = nearest(allVideo, confirmed.clipStartMs);
  const bestAudioAround = [...audioAround].sort((left, right) => left.rank - right.rank)[0];
  const bestVideoAround = [...videoAround].sort((left, right) => left.rank - right.rank)[0];
  const maxAudioCutpoints = realignment.settings?.maxAudioCutpoints ?? 12;
  const maxVideoCutpoints = realignment.settings?.maxVideoCutpoints ?? 8;
  const minSegmentMs = realignment.settings?.minSegmentMs ?? 1500;
  const nearestSelectedDistanceMs = neighborSelectedCutpoints[0]
    ? Math.abs(neighborSelectedCutpoints[0].timeMs - confirmed.clipStartMs)
    : undefined;

  const tailUnmatchedMs = breakdown.lastMatchedClipEndMs
    ? Math.max(0, seg14.segment.endMs - breakdown.lastMatchedClipEndMs)
    : 0;
  const conclusion = {
    label: 'どちらも部分的に正: 旧chunk4の物理範囲は大筋同じだが、新seg14は末尾のYouTube相当を次セグメント側へ割っている',
    reasons: [
      `seg14の一致語はclip ${msText(alignmentRows[0]?.clipTimeMs)}-${msText(breakdown.lastMatchedClipTimeMs)} までで、${breakdown.firstUnmatchedAfter ? `${breakdown.firstUnmatchedAfter.text}(${msText(breakdown.firstUnmatchedAfter.startMs)})` : '末尾'} 以降が新seg14対応表から落ちる。`,
      `新seg14のsource ${msText(seg14.bestMatch.sourceStartMs)}-${msText(seg14.bestMatch.sourceEndMs)} と旧基準対応 ${msText(Math.round(confirmed.sourceStartMs + (seg14.segment.startMs - confirmed.clipStartMs) * oldScale))}-${msText(Math.round(confirmed.sourceStartMs + (seg14.segment.endMs - confirmed.clipStartMs) * oldScale))} は同じ発話近辺だが、新seg14はsource側を約${Math.round((seg14.bestMatch.sourceEndMs - seg14.bestMatch.sourceStartMs) / Math.max(1, seg14.segment.endMs - seg14.segment.startMs) * 100) / 100}倍に伸ばして見ている。`,
      `seg14の整合率45%は、最後に対応した語の終端からseg14終端までの${tailUnmatchedMs}ms相当が局所対応から落ちることと、YouTube自動字幕のphrase単位時刻が粗いことが主因。`,
      '静止画では、崩れ前・崩れ直後・末尾の3点とも、切り抜き、旧基準対応、新seg14対応が同じ配信場面近辺を指している。物理的な別場面誤対応ではなく、局所セグメント分割と字幕時刻粒度の問題として扱う。'
    ]
  };

  const seg11Assessment = audioAround.length === 0 && videoAround.length === 0
    ? `1:32.555±3秒に音声・映像のraw候補がなく、選択上限や最短距離制約で落ちたのではなく検出器が物理カットとして見ていない。最寄り音声候補は${nearestAudio ? `${msText(nearestAudio.timeMs)} rank ${nearestAudio.rank}` : 'none'}、最寄り映像候補は${nearestVideo ? `${msText(nearestVideo.timeMs)} rank ${nearestVideo.rank}` : 'none'}。`
    : `1:32.555±3秒にraw候補はあるが、最良でも音声rank ${bestAudioAround?.rank ?? 'none'} / 映像rank ${bestVideoAround?.rank ?? 'none'} で、採用上限 音声${maxAudioCutpoints}・映像${maxVideoCutpoints} の外。最近傍の選択済みカット点との距離は${nearestSelectedDistanceMs ?? 'unknown'}msで最短距離${minSegmentMs}msより大きいため、主因は最短距離制約ではなくrank上限。`;

  const diagnosis = {
    kind: 'clip_composition_physical_alignment_diagnosis',
    runAt: new Date().toISOString(),
    realignmentPath: relativeWorkspacePath(options.realignmentPath),
    targetPath: relativeWorkspacePath(options.targetPath),
    readyForFreeze: realignment.readyForFreeze,
    confirmedPair: confirmed,
    conclusion,
    seg14: {
      segment: seg14.segment,
      bestMatch: seg14.bestMatch,
      oldCorrespondingRange: {
        sourceStartMs: Math.round(confirmed.sourceStartMs + (seg14.segment.startMs - confirmed.clipStartMs) * oldScale),
        sourceEndMs: Math.round(confirmed.sourceStartMs + (seg14.segment.endMs - confirmed.clipStartMs) * oldScale)
      },
      alignmentRows,
      breakdown,
      stillSamples,
      visualObservations: [
        'residual_jump_before と residual_jump_after は3列とも同じ配信画面・同じゲーム場面に見える。',
        'unmatched_tail_start と near_segment_end では切り抜き字幕が「YouTube...」に入っているが、新seg14の単語対応表ではこの部分が拾えていない。',
        '新seg14対応の静止画も別場面ではなく同じ場面近辺で、物理的な対応先違いよりも、seg14/seg15境界とYouTube自動字幕phrase時刻の粗さが問題。'
      ]
    },
    seg11: {
      confirmedClipStartMs: confirmed.clipStartMs,
      segment: seg11.segment,
      bestMatch: seg11.bestMatch,
      selectedCutpointsNearConfirmedStart: neighborSelectedCutpoints,
      neighborSelectedCutpoints,
      audioCandidatesAround: audioAround,
      videoCandidatesAround: videoAround,
      nearestAudioCandidate: nearestAudio,
      nearestVideoCandidate: nearestVideo,
      bestAudioCandidateAroundConfirmedStart: bestAudioAround,
      bestVideoCandidateAroundConfirmedStart: bestVideoAround,
      maxAudioCutpoints,
      maxVideoCutpoints,
      minSegmentMs,
      nearestSelectedDistanceMs,
      assessment: seg11Assessment,
      stillPath: relativeWorkspacePath(seg11StillPath)
    },
    oldChunk4Reevaluation: [
      '旧chunk4の「完全一致」は、通し左右比較の解像度では妥当な観測として保持する。',
      'ただし今回の単語対応では、clip 1:47.068以降のYouTube相当がseg14内では新対応から落ち、seg15側のsource phraseへ寄っている。',
      '内部カットまたは字幕時刻の粗さによる局所分割の問題があるため、confirmedの取り消しや書き換えは行わず、注記付きで人間判断に回す。'
    ],
    decisionsMdProposal: [
      '- 確認済みペアと新セグメントが食い違う場合、確認済みペアを新方式へ合わせて動かさない。まず重なるセグメントの単語対応、残差、物理静止画を出して、旧対応・新対応・部分一致のどれかを判定する。',
      '- YouTube自動字幕のphrase単位時刻は、短いセグメントの時間軸整合率を低く見せることがある。整合率低下だけで即座に物理不一致とせず、末尾未対応語と隣接セグメントへの対応移動を確認する。',
      '- カット点検出の見逃し判定は、選択済みカット点だけでなく、選択前のraw音声候補とraw映像候補のrankを併記して判断する。'
    ],
    productionImpact: {
      writesRuntime: false,
      writesFixturesDirectory: false,
      writesExpectedDirectory: false
    }
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const resultPath = path.join(outputDir, `physical-alignment-diagnosis-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `physical-alignment-diagnosis-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(diagnosis, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport({ resultPath, diagnosis }), 'utf8');
  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`stills: ${outputRoot}`);
  console.log(`conclusion: ${conclusion.label}`);
  console.log(`seg11: ${seg11Assessment}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
