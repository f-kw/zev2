import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { inspectTimeAxisIntegrity, type TimeAxisInspection } from './time_axis_integrity.js';

type CliOptions = {
  targetPath: string;
  clipId: string;
  sourceId: string;
  oldAlignmentPath: string;
  oldDecisionPath: string;
  outputId: string;
  maxAudioCutpoints: number;
  maxVideoCutpoints: number;
  minSegmentMs: number;
  minAnchorWords: number;
  topMatches: number;
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
  sourceUri?: string;
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
  targetId: string;
  title?: string;
  clip?: {
    id?: string;
    localVideoPath?: string;
    url?: string;
  };
  sourceCandidates?: Array<{
    id?: string;
    sttId?: string;
    localVideoPath?: string;
    url?: string;
  }>;
};

type OldAlignmentFile = {
  chunks?: Array<{
    index: number;
    startMs: number;
    endMs: number;
    text?: string;
  }>;
  chunkResults?: Array<{
    chunk: {
      index: number;
      startMs: number;
      endMs: number;
    };
    sourceMatches?: Array<{
      sourceId: string;
      matches?: Array<{
        sourceStartMs: number;
        sourceEndMs: number;
        clipCoverage?: number;
        sourceCoverage?: number;
        timeAxis?: TimeAxisInspection;
      }>;
    }>;
  }>;
};

type HumanDecisionFile = {
  chunks?: Array<{
    cutIndex: number;
    status?: string;
    clipRange?: {
      startMs?: number;
      endMs?: number;
    };
    sourceRange?: {
      startMs?: number;
      endMs?: number;
    };
    humanNote?: string;
  }>;
};

type ClipSegment = {
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  boundaryEvidence: Array<{
    timeMs: number;
    kind: 'audio_discontinuity' | 'video_scene_change';
    rank: number;
    value: number;
  }>;
  text: string;
  normalizedText: string;
  wordCount: number;
};

type MatchCandidate = {
  sourceId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  sourceText: string;
  normalizedSourceText: string;
  matchedChars: number;
  queryChars: number;
  sourceChars: number;
  clipCoverage: number;
  sourceCoverage: number;
  timeAxis: TimeAxisInspection;
};

type AlignmentReliability = {
  anchorWordCount: number;
  minimumAnchorWordCount: number;
  status: 'judgeable' | 'not_judgeable' | 'no_match';
  displayText: string;
  linearContinuityRatioForDisplay: number | null;
};

type RankedCutpoint = {
  timeMs: number;
  kind: 'audio_discontinuity' | 'video_scene_change';
  rank: number;
  value: number;
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

  const targetPath = values.get('target')?.trim();
  const clipId = values.get('clipId')?.trim();
  const sourceId = values.get('sourceId')?.trim();
  const oldAlignmentPath = values.get('oldAlignment')?.trim();
  const oldDecisionPath = values.get('oldDecision')?.trim();
  if (!targetPath) {
    throw new Error('--target を指定してください');
  }
  if (!clipId) {
    throw new Error('--clipId を指定してください');
  }
  if (!sourceId) {
    throw new Error('--sourceId を指定してください');
  }
  if (!oldAlignmentPath) {
    throw new Error('--oldAlignment を指定してください');
  }
  if (!oldDecisionPath) {
    throw new Error('--oldDecision を指定してください');
  }

  return {
    targetPath: resolveWorkspacePath(targetPath),
    clipId: sanitizePathPart(clipId),
    sourceId: sanitizePathPart(sourceId),
    oldAlignmentPath: resolveWorkspacePath(oldAlignmentPath),
    oldDecisionPath: resolveWorkspacePath(oldDecisionPath),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    maxAudioCutpoints: positiveInteger(values.get('maxAudioCutpoints'), 12, '--maxAudioCutpoints'),
    maxVideoCutpoints: positiveInteger(values.get('maxVideoCutpoints'), 8, '--maxVideoCutpoints'),
    minSegmentMs: positiveInteger(values.get('minSegmentMs'), 1500, '--minSegmentMs'),
    minAnchorWords: positiveInteger(values.get('minAnchorWords'), 10, '--minAnchorWords'),
    topMatches: positiveInteger(values.get('top'), 3, '--top'),
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  };
}

function positiveInteger(value: string | undefined, fallback: number, label: string): number {
  if (!value?.trim()) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
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

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function relativeWorkspacePath(filePath: string): string {
  return path.relative(workspaceRoot(), filePath);
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

function rankedAudioCutpoints(samples: Float32Array, maxCount: number): RankedCutpoint[] {
  const envelope = rmsEnvelope(samples);
  const deltas: Array<{ timeMs: number; value: number }> = [];
  for (let index = 1; index < envelope.length; index += 1) {
    const value = Math.abs((envelope[index] ?? 0) - (envelope[index - 1] ?? 0));
    deltas.push({ timeMs: index * audioHopMs, value });
  }
  return localMaxima(deltas)
    .sort((left, right) => right.value - left.value || left.timeMs - right.timeMs)
    .slice(0, maxCount)
    .map((item, index) => ({
      timeMs: item.timeMs,
      value: roundMetric(item.value),
      rank: index + 1,
      kind: 'audio_discontinuity'
    }));
}

async function rankedVideoCutpoints(ffmpegCommand: string, inputPath: string, maxCount: number): Promise<RankedCutpoint[]> {
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
  const text = output.toString('utf8');
  const rows: Array<{ timeMs: number; value: number }> = [];
  let currentTimeMs: number | undefined;
  for (const line of text.split(/\r?\n/)) {
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
    .slice(0, maxCount)
    .map((item, index) => ({
      timeMs: item.timeMs,
      value: roundMetric(item.value),
      rank: index + 1,
      kind: 'video_scene_change'
    }));
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

function mergeCutpoints(input: {
  audioCutpoints: RankedCutpoint[];
  videoCutpoints: RankedCutpoint[];
  startMs: number;
  endMs: number;
  minSegmentMs: number;
}): RankedCutpoint[] {
  const result: RankedCutpoint[] = [];
  const audioFirst = [...input.audioCutpoints].sort((left, right) => left.rank - right.rank);
  for (const item of audioFirst) {
    addIfUseful(result, item, input);
  }
  const videoNext = [...input.videoCutpoints].sort((left, right) => left.rank - right.rank);
  for (const item of videoNext) {
    addIfUseful(result, item, input);
  }
  return result.sort((left, right) => left.timeMs - right.timeMs);
}

function addIfUseful(
  result: RankedCutpoint[],
  item: RankedCutpoint,
  bounds: { startMs: number; endMs: number; minSegmentMs: number }
): void {
  if (item.timeMs <= bounds.startMs + bounds.minSegmentMs || item.timeMs >= bounds.endMs - bounds.minSegmentMs) {
    return;
  }
  if (result.some((current) => Math.abs(current.timeMs - item.timeMs) < bounds.minSegmentMs)) {
    return;
  }
  result.push(item);
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

function wordsInRange(words: NormalizedWord[], startMs: number, endMs: number): NormalizedWord[] {
  return words.filter((word) => word.endMs > startMs && word.startMs < endMs);
}

function buildSegments(input: {
  clipWords: NormalizedWord[];
  cutpoints: RankedCutpoint[];
}): ClipSegment[] {
  const firstStartMs = input.clipWords[0]?.startMs ?? 0;
  const lastEndMs = input.clipWords.at(-1)?.endMs ?? firstStartMs;
  const boundaries = [firstStartMs, ...input.cutpoints.map((item) => item.timeMs), lastEndMs]
    .filter((item, index, array) => index === 0 || item > (array[index - 1] ?? 0));
  const segments: ClipSegment[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startMs = boundaries[index]!;
    const endMs = boundaries[index + 1]!;
    const words = wordsInRange(input.clipWords, startMs, endMs);
    if (words.length === 0) {
      continue;
    }
    segments.push({
      index: segments.length,
      startMs,
      endMs,
      durationMs: endMs - startMs,
      boundaryEvidence: input.cutpoints.filter((item) => item.timeMs === endMs),
      text: words.map((word) => word.text).join(''),
      normalizedText: words.map((word) => word.normalizedText).join(''),
      wordCount: words.length
    });
  }
  return segments;
}

function lcsLength(left: string, right: string): number {
  const previous = new Array(right.length + 1).fill(0);
  const current = new Array(right.length + 1).fill(0);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? previous[rightIndex - 1] + 1
        : Math.max(previous[rightIndex], current[rightIndex - 1]);
    }
    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index] ?? 0;
      current[index] = 0;
    }
  }
  return previous[right.length] ?? 0;
}

function findMatches(input: {
  segment: ClipSegment;
  clipWords: NormalizedWord[];
  sourceId: string;
  sourceWords: NormalizedWord[];
  top: number;
}): MatchCandidate[] {
  const queryWords = wordsInRange(input.clipWords, input.segment.startMs, input.segment.endMs);
  const queryChars = buildTextChars(queryWords);
  const sourceChars = buildTextChars(input.sourceWords);
  const sourceText = sourceChars.map((item) => item.char).join('');
  const query = queryChars.map((item) => item.char).join('');
  if (!query) {
    return [];
  }

  const preliminary: Array<{
    startChar: number;
    endExclusive: number;
    matchedChars: number;
    clipCoverage: number;
    sourceCoverage: number;
  }> = [];
  for (let startChar = 0; startChar < sourceChars.length; startChar += 1) {
    const endExclusive = Math.min(sourceChars.length, startChar + query.length);
    const normalizedSourceText = sourceText.slice(startChar, endExclusive);
    if (!normalizedSourceText) {
      continue;
    }
    const matchedChars = lcsLength(query, normalizedSourceText);
    preliminary.push({
      startChar,
      endExclusive,
      matchedChars,
      clipCoverage: matchedChars / query.length,
      sourceCoverage: matchedChars / normalizedSourceText.length
    });
  }

  return preliminary
    .sort((left, right) => (
      right.clipCoverage - left.clipCoverage ||
      right.sourceCoverage - left.sourceCoverage ||
      right.matchedChars - left.matchedChars ||
      left.startChar - right.startChar
    ))
    .slice(0, input.top)
    .map((candidate) => {
      const range = sourceChars.slice(candidate.startChar, candidate.endExclusive);
      const normalizedSourceText = sourceText.slice(candidate.startChar, candidate.endExclusive);
      const firstChar = range[0]!;
      const lastChar = range.at(-1)!;
      return {
        sourceId: input.sourceId,
        sourceStartMs: firstChar.startMs,
        sourceEndMs: lastChar.endMs,
        sourceText: sourceTextForRange(input.sourceWords, range),
        normalizedSourceText,
        matchedChars: candidate.matchedChars,
        queryChars: query.length,
        sourceChars: normalizedSourceText.length,
        clipCoverage: candidate.clipCoverage,
        sourceCoverage: candidate.sourceCoverage,
        timeAxis: inspectTimeAxisIntegrity({
          segmentStartMs: input.segment.startMs,
          segmentEndMs: input.segment.endMs,
          query,
          sourceText: normalizedSourceText,
          queryChars,
          sourceChars: range,
          clipWords: queryWords,
          sourceWords: input.sourceWords
        })
      };
    });
}

function sourceTextForRange(words: NormalizedWord[], chars: TextChar[]): string {
  const indexes = [...new Set(chars.map((item) => item.wordIndex))].sort((left, right) => left - right);
  return indexes.map((wordIndex) => words[wordIndex]?.text ?? '').join('');
}

function confirmedInheritance(segment: ClipSegment, match: MatchCandidate | undefined): {
  status: 'inherited_confirmed' | 'requires_review' | 'not_applicable';
  reason: string;
} {
  if (!match) {
    return { status: 'requires_review', reason: '照合候補がないため再確認が必要。' };
  }
  const confirmed = {
    clipStartMs: 92555,
    clipEndMs: 121147,
    sourceStartMs: 2404730,
    sourceEndMs: 2436085
  };
  const toleranceMs = 500;
  const matches =
    Math.abs(segment.startMs - confirmed.clipStartMs) <= toleranceMs &&
    Math.abs(segment.endMs - confirmed.clipEndMs) <= toleranceMs &&
    Math.abs(match.sourceStartMs - confirmed.sourceStartMs) <= toleranceMs &&
    Math.abs(match.sourceEndMs - confirmed.sourceEndMs) <= toleranceMs;
  return matches
    ? { status: 'inherited_confirmed', reason: '人間確認済みの時間区間ペアと±500ms以内で一致したためconfirmedを継承。' }
    : { status: 'requires_review', reason: '人間確認済みペアと±500ms以内で一致しないため再確認が必要。' };
}

function oldFixedRows(oldAlignment: OldAlignmentFile, oldDecision: HumanDecisionFile, sourceId: string) {
  const rows = [];
  for (const chunk of oldAlignment.chunks ?? []) {
    const result = oldAlignment.chunkResults?.find((item) => item.chunk.index === chunk.index);
    const match = result?.sourceMatches?.find((item) => item.sourceId === sourceId)?.matches?.[0];
    const decision = oldDecision.chunks?.find((item) => item.cutIndex === chunk.index);
    rows.push({
      chunkIndex: chunk.index,
      clipStartMs: chunk.startMs,
      clipEndMs: chunk.endMs,
      sourceStartMs: match?.sourceStartMs,
      sourceEndMs: match?.sourceEndMs,
      clipCoverage: match?.clipCoverage,
      sourceCoverage: match?.sourceCoverage,
      linearContinuityRatio: match?.timeAxis?.linearContinuityRatio,
      longestLinearRunDurationMs: match?.timeAxis?.longestLinearRunDurationMs,
      segmentDurationMs: match?.timeAxis?.segmentDurationMs,
      nonLinearDurationMs: match?.timeAxis
        ? Math.max(0, match.timeAxis.segmentDurationMs - match.timeAxis.longestLinearRunDurationMs)
        : undefined,
      humanStatus: decision?.status,
      humanNote: decision?.humanNote
    });
  }
  return rows;
}

function compareOldNew(oldRows: ReturnType<typeof oldFixedRows>, segmentResults: Array<{
  segment: ClipSegment;
  bestMatch?: MatchCandidate;
  reliability: AlignmentReliability;
  inheritance: ReturnType<typeof confirmedInheritance>;
}>) {
  return oldRows.map((oldRow) => {
    const overlapping = segmentResults.filter((item) =>
      item.segment.endMs > oldRow.clipStartMs && item.segment.startMs < oldRow.clipEndMs
    );
    return {
      oldChunkIndex: oldRow.chunkIndex,
      oldClipRange: { startMs: oldRow.clipStartMs, endMs: oldRow.clipEndMs },
      oldSourceRange: { startMs: oldRow.sourceStartMs, endMs: oldRow.sourceEndMs },
      linearContinuityRatio: oldRow.linearContinuityRatio,
      nonLinearDurationMs: oldRow.nonLinearDurationMs,
      oldHumanObservation: oldRow.humanNote,
      overlappingNewSegments: overlapping.map((item) => ({
        segmentIndex: item.segment.index,
        clipStartMs: item.segment.startMs,
        clipEndMs: item.segment.endMs,
        sourceStartMs: item.bestMatch?.sourceStartMs,
        sourceEndMs: item.bestMatch?.sourceEndMs,
        linearContinuityRatio: item.bestMatch?.timeAxis.linearContinuityRatio,
        anchorWordCount: item.reliability.anchorWordCount,
        linearDisplay: item.reliability.displayText,
        confirmedInheritance: item.inheritance.status
      })),
      meaning: overlapping.length === 1
        ? '旧固定幅チャンクは新セグメント1件に対応。'
        : `旧固定幅チャンクは新セグメント${overlapping.length}件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。`
    };
  });
}

async function writeStill(options: {
  ffmpegCommand: string;
  clipVideoPath: string;
  sourceVideoPath: string;
  outputPath: string;
  clipMs: number;
  sourceMs: number;
}): Promise<void> {
  await spawnCapture(options.ffmpegCommand, [
    '-y',
    '-v',
    'error',
    '-ss',
    (options.clipMs / 1000).toFixed(3),
    '-i',
    options.clipVideoPath,
    '-ss',
    (options.sourceMs / 1000).toFixed(3),
    '-i',
    options.sourceVideoPath,
    '-frames:v',
    '1',
    '-filter_complex',
    '[0:v]scale=640:-1[left];[1:v]scale=640:-1[right];[left][right]hstack=inputs=2',
    '-q:v',
    '2',
    '-update',
    '1',
    options.outputPath
  ]);
}

function samplePoints(segment: ClipSegment): Array<{ label: 'head' | 'mid' | 'tail'; clipMs: number }> {
  return [
    { label: 'head', clipMs: segment.startMs },
    { label: 'mid', clipMs: Math.round((segment.startMs + segment.endMs) / 2) },
    { label: 'tail', clipMs: Math.max(segment.startMs, segment.endMs - 500) }
  ];
}

async function buildStillPackage(input: {
  options: CliOptions;
  clipVideoPath: string;
  sourceVideoPath: string;
  segmentResults: Array<{
    segment: ClipSegment;
    bestMatch?: MatchCandidate;
  }>;
}): Promise<Array<{
  segmentIndex: number;
  stills: Array<{ label: string; clipMs: number; sourceMs?: number; path?: string }>;
}>> {
  const stillDir = path.join(evalRoot, 'outputs', 'visual-check', input.options.clipId, `cutpoint-${input.options.outputId}`);
  await mkdir(stillDir, { recursive: true });
  const manifests = [];
  for (const item of input.segmentResults) {
    const stills = [];
    for (const point of samplePoints(item.segment)) {
      const sourceMs = item.bestMatch
        ? item.bestMatch.sourceStartMs + (point.clipMs - item.segment.startMs)
        : undefined;
      const outputPath = path.join(
        stillDir,
        `segment${String(item.segment.index + 1).padStart(2, '0')}_${point.label}.jpg`
      );
      if (sourceMs !== undefined) {
        await writeStill({
          ffmpegCommand: input.options.ffmpegCommand,
          clipVideoPath: input.clipVideoPath,
          sourceVideoPath: input.sourceVideoPath,
          outputPath,
          clipMs: point.clipMs,
          sourceMs
        });
      }
      stills.push({
        label: point.label,
        clipMs: point.clipMs,
        ...(sourceMs !== undefined ? { sourceMs } : {}),
        ...(existsSync(outputPath) ? { path: relativeWorkspacePath(outputPath) } : {})
      });
    }
    manifests.push({ segmentIndex: item.segment.index, stills });
  }
  return manifests;
}

function roundMetric(value: number): number {
  return Math.round(value * 1000000) / 1000000;
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

function alignmentReliability(match: MatchCandidate | undefined, minimumAnchorWordCount: number): AlignmentReliability {
  if (!match) {
    return {
      anchorWordCount: 0,
      minimumAnchorWordCount,
      status: 'no_match',
      displayText: '候補なし',
      linearContinuityRatioForDisplay: null
    };
  }
  const anchorWordCount = match.timeAxis.matchedWordPairCount ?? 0;
  if (anchorWordCount < minimumAnchorWordCount) {
    return {
      anchorWordCount,
      minimumAnchorWordCount,
      status: 'not_judgeable',
      displayText: `判定不能 (${anchorWordCount}/${minimumAnchorWordCount}語)`,
      linearContinuityRatioForDisplay: null
    };
  }
  return {
    anchorWordCount,
    minimumAnchorWordCount,
    status: 'judgeable',
    displayText: percent(match.timeAxis.linearContinuityRatio),
    linearContinuityRatioForDisplay: match.timeAxis.linearContinuityRatio
  };
}

function buildReport(input: {
  resultPath: string;
  archivePath: string;
  minAnchorWords: number;
  stills: Array<{
    segmentIndex: number;
    stills: Array<{ label: string; clipMs: number; sourceMs?: number; path?: string }>;
  }>;
  segmentResults: Array<{
    segment: ClipSegment;
    matches: MatchCandidate[];
    bestMatch?: MatchCandidate;
    reliability: AlignmentReliability;
    inheritance: ReturnType<typeof confirmedInheritance>;
  }>;
  oldComparison: ReturnType<typeof compareOldNew>;
}): string {
  const firstStillPath = input.stills.flatMap((item) => item.stills).find((item) => item.path)?.path;
  const stillPackagePath = firstStillPath
    ? path.relative(evalRoot, path.join(workspaceRoot(), path.dirname(firstStillPath)))
    : undefined;
  const lines = [
    '# 複数区間 カット点ベース再照合レポート',
    '',
    `- 結果JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- 旧30秒方式アーカイブ: ${path.relative(evalRoot, input.archivePath)}`,
    `- 静止画比較パッケージ: ${stillPackagePath ?? 'not generated'}`,
    '- fixture凍結: no',
    '- readyForFreeze: false',
    '',
    '## 方針',
    '',
    '- 固定30秒幅ではなく、切り抜き側の音声不連続候補と映像シーンチェンジ候補から可変長セグメントを作る。',
    '- 音声不連続候補を先に採用し、映像シーンチェンジ候補は補助として追加する。',
    '- 整合率は、単語タイムスタンプ対応が線形に続いた最長区間の長さをセグメント長で割った値。',
    `- 対応に使えた単語数が${input.minAnchorWords}語未満の場合、整合率は判定不能として表示する。`,
    '- 整合率は自動凍結条件ではなく、人間確認のための数値として読む。',
    '',
    '## 新セグメント',
    '',
    '| seg | clip | source | text | 対応単語 | 整合率表示 | inherited | stills |',
    '| ---: | --- | --- | ---: | ---: | ---: | --- | --- |'
  ];

  for (const item of input.segmentResults) {
    const match = item.bestMatch;
    const stillText = `segment${String(item.segment.index + 1).padStart(2, '0')}_head/mid/tail.jpg`;
    lines.push(`| ${item.segment.index + 1} | ${msText(item.segment.startMs)}-${msText(item.segment.endMs)} | ${msText(match?.sourceStartMs)}-${msText(match?.sourceEndMs)} | ${percent(match?.clipCoverage)} | ${item.reliability.anchorWordCount} | ${item.reliability.displayText} | ${item.inheritance.status} | ${stillText} |`);
  }

  lines.push('');
  lines.push('## 旧30秒方式との比較');
  lines.push('');
  for (const row of input.oldComparison) {
    lines.push(`- old chunk ${row.oldChunkIndex + 1}: ${row.meaning}`);
    lines.push(`  - 旧clip: ${msText(row.oldClipRange.startMs)}-${msText(row.oldClipRange.endMs)} / 旧source: ${msText(row.oldSourceRange.startMs)}-${msText(row.oldSourceRange.endMs)}`);
    if (row.linearContinuityRatio !== undefined) {
      lines.push(`  - 旧整合率: ${percent(row.linearContinuityRatio)} / 線形に続かなかった長さ: ${msText(row.nonLinearDurationMs)}`);
    }
    if (row.oldHumanObservation) {
      lines.push(`  - 人間観測: ${row.oldHumanObservation}`);
    }
    for (const segment of row.overlappingNewSegments) {
      lines.push(`  - new seg ${segment.segmentIndex + 1}: clip ${msText(segment.clipStartMs)}-${msText(segment.clipEndMs)} / source ${msText(segment.sourceStartMs)}-${msText(segment.sourceEndMs)} / 対応単語 ${segment.anchorWordCount} / 整合率表示 ${segment.linearDisplay} / 継承 ${segment.confirmedInheritance}`);
    }
  }

  lines.push('');
  lines.push('## 本体影響');
  lines.push('');
  lines.push('- runtime/ への書き込みなし');
  lines.push('- fixtures/ への書き込みなし');
  lines.push('- expected/ への書き込みなし');
  lines.push('- 本番UI/API/キュー/DBへの変更なし');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const target = await readJson<SttTarget>(options.targetPath);
  const { clipVideoPath, sourceVideoPath } = targetVideos(target, options.sourceId);
  const clipWords = await loadWords(options.clipId, 'clip');
  const sourceWords = await loadWords(options.sourceId, 'source');
  const oldAlignment = await readJson<OldAlignmentFile>(options.oldAlignmentPath);
  const oldDecision = await readJson<HumanDecisionFile>(options.oldDecisionPath);

  const firstStartMs = clipWords[0]?.startMs ?? 0;
  const lastEndMs = clipWords.at(-1)?.endMs ?? firstStartMs;
  const samples = await readAudio(options.ffmpegCommand, clipVideoPath);
  const audioCutpoints = rankedAudioCutpoints(samples, options.maxAudioCutpoints);
  const videoCutpoints = await rankedVideoCutpoints(options.ffmpegCommand, clipVideoPath, options.maxVideoCutpoints);
  const selectedCutpoints = mergeCutpoints({
    audioCutpoints,
    videoCutpoints,
    startMs: firstStartMs,
    endMs: lastEndMs,
    minSegmentMs: options.minSegmentMs
  });
  const segments = buildSegments({ clipWords, cutpoints: selectedCutpoints });
  const segmentResults = segments.map((segment) => {
    const matches = findMatches({
      segment,
      clipWords,
      sourceId: options.sourceId,
      sourceWords,
      top: options.topMatches
    });
    const bestMatch = matches[0];
    return {
      segment,
      matches,
      ...(bestMatch ? { bestMatch } : {}),
      reliability: alignmentReliability(bestMatch, options.minAnchorWords),
      inheritance: confirmedInheritance(segment, bestMatch)
    };
  });
  const stills = await buildStillPackage({ options, clipVideoPath, sourceVideoPath, segmentResults });
  const oldRows = oldFixedRows(oldAlignment, oldDecision, options.sourceId);
  const oldComparison = compareOldNew(oldRows, segmentResults);

  const outputDir = path.join(evalRoot, 'outputs');
  const archiveDir = path.join(outputDir, 'archive');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const archive = {
    kind: 'clip_composition_fixed30_alignment_archive',
    runAt: new Date().toISOString(),
    reason: '固定30秒幅方式の結果を削除せず、新しいカット点ベース再照合との比較用に保存する。',
    oldAlignmentPath: relativeWorkspacePath(options.oldAlignmentPath),
    oldDecisionPath: relativeWorkspacePath(options.oldDecisionPath),
    rows: oldRows
  };
  const archivePath = path.join(archiveDir, `fixed30-alignment-${options.clipId}-${options.outputId}.json`);
  await writeFile(archivePath, `${JSON.stringify(archive, null, 2)}\n`, 'utf8');

  const result = {
    kind: 'clip_composition_cutpoint_realignment',
    runAt: new Date().toISOString(),
    targetId: target.targetId,
    title: target.title,
    clipId: options.clipId,
    sourceId: options.sourceId,
    readyForFreeze: false,
    freezeStatus: 'hold_until_human_review',
    settings: {
      fixedThirtySecondChunking: 'disabled',
      maxAudioCutpoints: options.maxAudioCutpoints,
      maxVideoCutpoints: options.maxVideoCutpoints,
      minSegmentMs: options.minSegmentMs,
      minAnchorWords: options.minAnchorWords,
      topMatches: options.topMatches,
      audioFrameMs,
      audioHopMs,
      audioPriority: '音声不連続候補を先に採用し、映像シーンチェンジ候補は補助として追加する',
      timeAxisIntegrity: '単語タイムスタンプ対応が線形に続いた最長区間の長さ/セグメント長',
      reliabilityDisplay: '対応に使えた単語数がminAnchorWords未満の場合、整合率は判定不能として表示する'
    },
    cutpointDetection: {
      audioCutpoints,
      videoCutpoints,
      selectedCutpoints
    },
    segments: segmentResults,
    stills,
    fixed30ArchivePath: relativeWorkspacePath(archivePath),
    fixed30Comparison: oldComparison,
    humanConfirmedPairPolicy: {
      inheritedPair: {
        clipStartMs: 92555,
        clipEndMs: 121147,
        sourceStartMs: 2404730,
        sourceEndMs: 2436085,
        checkedBy: 'kawafmm',
        verifiedAt: '2026-07-06',
        verificationMethod: '境界別静止画・音声比較(motion-v001)',
        status: 'confirmed'
      },
      metadata: {
        clipDurationMs: 28592,
        sourceDurationMs: 31355,
        durationDeltaMs: 2763,
        durationDeltaNote: '内部未特定カットあり(概算)',
        readyForFreeze: false,
        freezeBlockedReason: '残る3ブロック(旧chunk1-3相当)の境界確定が残っているため'
      },
      history: [
        {
          clipStartMs: 92555,
          clipEndMs: 121147,
          sourceStartMs: 2404730,
          sourceEndMs: 2433322,
          checkedBy: 'kawafmm',
          verifiedAt: '2026-07-05',
          verificationMethod: '旧確認(通し視聴解像度)',
          status: 'superseded',
          supersededAt: '2026-07-06',
          supersededReason: '境界別静止画・音声比較(motion-v001)で終端約2.8秒過小と判明。旧確認は当時の確認手段の解像度における事実として履歴保持。'
        }
      ],
      toleranceMs: 500,
      applied: segmentResults
        .filter((item) => item.inheritance.status === 'inherited_confirmed')
        .map((item) => item.segment.index)
    },
    productionImpact: {
      writesRuntime: false,
      touchesProductionUi: false,
      touchesProductionApi: false,
      touchesProductionQueue: false,
      touchesDatabase: false,
      writesExpectedDirectory: false,
      writesFixturesDirectory: false
    }
  };

  const resultPath = path.join(outputDir, `cutpoint-realignment-${options.clipId}-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `cutpoint-realignment-${options.clipId}-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport({ resultPath, archivePath, minAnchorWords: options.minAnchorWords, stills, segmentResults, oldComparison }), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`archive: ${archivePath}`);
  console.log(`segments: ${segmentResults.length}`);
  console.log(`inherited confirmed: ${result.humanConfirmedPairPolicy.applied.length}`);
  console.log('ready for freeze: no');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
