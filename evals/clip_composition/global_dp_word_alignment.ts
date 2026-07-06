import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

type CliOptions = {
  clipId: string;
  sourceId: string;
  outputId: string;
  current16Path: string;
  current41Path: string;
  minAnchorWords: number;
  confirmedClipStartMs: number;
  confirmedClipEndMs: number;
  confirmedSourceStartMs: number;
  confirmedSourceEndMs: number;
  toleranceMs: number;
  current16ElapsedMs?: number;
  current41ElapsedMs?: number;
  repairLocalContinuity: boolean;
  offsetJumpThresholdMs: number;
  traceClipStartMs?: number;
  traceClipEndMs?: number;
  traceSourceStartMs?: number;
  traceSourceEndMs?: number;
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

type AlignmentUnit = {
  normalizedText: string;
  text: string;
  startMs: number;
  endMs: number;
  wordIndex: number;
};

type WordPair = {
  clipWordIndex: number;
  sourceWordIndex: number;
  clipText: string;
  sourceText: string;
  normalizedText: string;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
};

type LinearRun = {
  index: number;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  matchedWordPairCount: number;
  clipDurationMs: number;
  sourceDurationMs: number;
  sourceMinusClipDurationMs: number;
  maxDeltaDifferenceMs: number;
  firstPairIndex: number;
  lastPairIndex: number;
};

type ContinuityRepair = {
  clipText: string;
  normalizedText: string;
  clipStartMs: number;
  originalSourceText: string;
  originalSourceStartMs: number;
  repairedSourceText: string;
  repairedSourceStartMs: number;
  previousSourceStartMs: number;
  originalDeltaDifferenceMs: number;
  repairedDeltaDifferenceMs: number;
};

type BoundaryCandidate = {
  candidateType: 'line_start' | 'line_end' | 'offset_jump';
  pairIndex: number;
  clipMs: number;
  sourceMs: number;
  offsetMs: number;
  clipText: string;
  sourceText: string;
  runIndex?: number;
  runWordCount?: number;
  previousPairIndex?: number;
  previousClipMs?: number;
  previousSourceMs?: number;
  previousOffsetMs?: number;
  offsetJumpMs?: number;
};

type WindowTraceRow = {
  side: 'clip' | 'source';
  wordIndex: number;
  startMs: number;
  endMs: number;
  text: string;
  normalizedText: string;
  matched: boolean;
  counterpartText?: string;
  counterpartStartMs?: number;
  runIndex?: number;
  runWordCount?: number;
  candidateIncluded?: boolean;
  stage: string;
};

type RealignmentFile = {
  sourceId?: string;
  readyForFreeze?: boolean;
  settings?: Record<string, unknown>;
  segments?: Array<{
    segment?: {
      index?: number;
      startMs?: number;
      endMs?: number;
    };
    bestMatch?: {
      sourceStartMs?: number;
      sourceEndMs?: number;
      timeAxis?: {
        matchedWordPairCount?: number;
        linearContinuityRatio?: number;
      };
    };
    reliability?: {
      anchorWordCount?: number;
      displayText?: string;
    };
    inheritance?: {
      status?: string;
    };
  }>;
  humanConfirmedPairPolicy?: {
    applied?: Array<unknown>;
  };
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

  const clipId = values.get('clipId')?.trim();
  const sourceId = values.get('sourceId')?.trim();
  if (!clipId) {
    throw new Error('--clipId を指定してください');
  }
  if (!sourceId) {
    throw new Error('--sourceId を指定してください');
  }

  return {
    clipId: sanitizePathPart(clipId),
    sourceId: sanitizePathPart(sourceId),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    current16Path: resolveWorkspacePath(values.get('current16')?.trim() || 'evals/clip_composition/outputs/cutpoint-realignment-r_ztjHaHmcg-20260706-local-stt-300s-anchor-v001.json'),
    current41Path: resolveWorkspacePath(values.get('current41')?.trim() || 'evals/clip_composition/outputs/cutpoint-realignment-r_ztjHaHmcg-20260706-local-stt-300s-video56-audit-v001.json'),
    minAnchorWords: positiveInteger(values.get('minAnchorWords'), 10, '--minAnchorWords'),
    confirmedClipStartMs: positiveInteger(values.get('confirmedClipStartMs'), 92555, '--confirmedClipStartMs'),
    confirmedClipEndMs: positiveInteger(values.get('confirmedClipEndMs'), 121147, '--confirmedClipEndMs'),
    confirmedSourceStartMs: positiveInteger(values.get('confirmedSourceStartMs'), 2404730, '--confirmedSourceStartMs'),
    confirmedSourceEndMs: positiveInteger(values.get('confirmedSourceEndMs'), 2436085, '--confirmedSourceEndMs'),
    toleranceMs: positiveInteger(values.get('toleranceMs'), 500, '--toleranceMs'),
    current16ElapsedMs: optionalPositiveNumber(values.get('current16ElapsedMs'), '--current16ElapsedMs'),
    current41ElapsedMs: optionalPositiveNumber(values.get('current41ElapsedMs'), '--current41ElapsedMs'),
    repairLocalContinuity: booleanValue(values.get('repairLocalContinuity')),
    offsetJumpThresholdMs: positiveInteger(values.get('offsetJumpThresholdMs'), 1500, '--offsetJumpThresholdMs'),
    traceClipStartMs: optionalPositiveNumber(values.get('traceClipStartMs'), '--traceClipStartMs'),
    traceClipEndMs: optionalPositiveNumber(values.get('traceClipEndMs'), '--traceClipEndMs'),
    traceSourceStartMs: optionalPositiveNumber(values.get('traceSourceStartMs'), '--traceSourceStartMs'),
    traceSourceEndMs: optionalPositiveNumber(values.get('traceSourceEndMs'), '--traceSourceEndMs')
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

function optionalPositiveNumber(value: string | undefined, label: string): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} は0以上の数値で指定してください`);
  }
  return parsed;
}

function booleanValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
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

async function loadWords(itemId: string, role: 'clip' | 'source'): Promise<{ sourceUri: string; words: NormalizedWord[] }> {
  const filePath = sttPath(itemId, role);
  const payload = await readJson<WordTimestampFile>(filePath);
  const words = (payload.words ?? [])
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
    }))
    .filter((word) => word.normalizedText.length > 0);

  return {
    sourceUri: payload.sourceUri ?? filePath,
    words
  };
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

function toUnits(words: NormalizedWord[]): AlignmentUnit[] {
  return words.map((word) => ({
    normalizedText: word.normalizedText,
    text: word.text,
    startMs: word.startMs,
    endMs: word.endMs,
    wordIndex: word.wordIndex
  }));
}

function alignByLcs(clipUnits: AlignmentUnit[], sourceUnits: AlignmentUnit[]): WordPair[] {
  const width = sourceUnits.length + 1;
  const height = clipUnits.length + 1;
  const table = new Uint16Array(width * height);

  for (let clipIndex = 1; clipIndex < height; clipIndex += 1) {
    const clipUnit = clipUnits[clipIndex - 1]!;
    const rowOffset = clipIndex * width;
    const previousRowOffset = (clipIndex - 1) * width;
    for (let sourceIndex = 1; sourceIndex < width; sourceIndex += 1) {
      if (clipUnit.normalizedText === sourceUnits[sourceIndex - 1]?.normalizedText) {
        table[rowOffset + sourceIndex] = (table[previousRowOffset + sourceIndex - 1] ?? 0) + 1;
        continue;
      }
      const up = table[previousRowOffset + sourceIndex] ?? 0;
      const left = table[rowOffset + sourceIndex - 1] ?? 0;
      table[rowOffset + sourceIndex] = up >= left ? up : left;
    }
  }

  const pairs: WordPair[] = [];
  let clipIndex = clipUnits.length;
  let sourceIndex = sourceUnits.length;
  while (clipIndex > 0 && sourceIndex > 0) {
    const clipUnit = clipUnits[clipIndex - 1]!;
    const sourceUnit = sourceUnits[sourceIndex - 1]!;
    if (clipUnit.normalizedText === sourceUnit.normalizedText) {
      pairs.push({
        clipWordIndex: clipUnit.wordIndex,
        sourceWordIndex: sourceUnit.wordIndex,
        clipText: clipUnit.text,
        sourceText: sourceUnit.text,
        normalizedText: clipUnit.normalizedText,
        clipStartMs: clipUnit.startMs,
        clipEndMs: clipUnit.endMs,
        sourceStartMs: sourceUnit.startMs,
        sourceEndMs: sourceUnit.endMs
      });
      clipIndex -= 1;
      sourceIndex -= 1;
      continue;
    }

    const up = table[(clipIndex - 1) * width + sourceIndex] ?? 0;
    const left = table[clipIndex * width + sourceIndex - 1] ?? 0;
    if (up >= left) {
      clipIndex -= 1;
    } else {
      sourceIndex -= 1;
    }
  }

  return pairs.reverse();
}

function repairLocalContinuityPairs(pairs: WordPair[], sourceUnits: AlignmentUnit[], toleranceMs: number): {
  pairs: WordPair[];
  repairs: ContinuityRepair[];
} {
  if (pairs.length < 2) {
    return { pairs, repairs: [] };
  }
  const repaired: WordPair[] = [pairs[0]!];
  const repairs: ContinuityRepair[] = [];
  for (let index = 1; index < pairs.length; index += 1) {
    const previous = repaired[repaired.length - 1]!;
    const current = pairs[index]!;
    const clipDelta = current.clipStartMs - previous.clipStartMs;
    const sourceDelta = current.sourceStartMs - previous.sourceStartMs;
    const originalDeltaDifferenceMs = Math.abs(sourceDelta - clipDelta);
    if (sourceDelta >= 0 && originalDeltaDifferenceMs <= toleranceMs) {
      repaired.push(current);
      continue;
    }

    let best: { unit: AlignmentUnit; deltaDifferenceMs: number } | undefined;
    for (const candidate of sourceUnits) {
      if (candidate.wordIndex <= previous.sourceWordIndex || candidate.wordIndex >= current.sourceWordIndex) {
        continue;
      }
      if (candidate.normalizedText !== current.normalizedText) {
        continue;
      }
      const candidateSourceDelta = candidate.startMs - previous.sourceStartMs;
      if (candidateSourceDelta < 0) {
        continue;
      }
      const deltaDifferenceMs = Math.abs(candidateSourceDelta - clipDelta);
      if (!best || deltaDifferenceMs < best.deltaDifferenceMs) {
        best = { unit: candidate, deltaDifferenceMs };
      }
    }

    if (best && best.deltaDifferenceMs <= toleranceMs) {
      const replacement: WordPair = {
        ...current,
        sourceWordIndex: best.unit.wordIndex,
        sourceText: best.unit.text,
        sourceStartMs: best.unit.startMs,
        sourceEndMs: best.unit.endMs
      };
      repaired.push(replacement);
      repairs.push({
        clipText: current.clipText,
        normalizedText: current.normalizedText,
        clipStartMs: current.clipStartMs,
        originalSourceText: current.sourceText,
        originalSourceStartMs: current.sourceStartMs,
        repairedSourceText: best.unit.text,
        repairedSourceStartMs: best.unit.startMs,
        previousSourceStartMs: previous.sourceStartMs,
        originalDeltaDifferenceMs,
        repairedDeltaDifferenceMs: best.deltaDifferenceMs
      });
      continue;
    }

    repaired.push(current);
  }
  return { pairs: repaired, repairs };
}

function extractLinearRuns(pairs: WordPair[], toleranceMs: number): LinearRun[] {
  if (pairs.length === 0) {
    return [];
  }
  const runs: LinearRun[] = [];
  let startIndex = 0;
  let maxDeltaDifferenceMs = 0;
  for (let index = 1; index < pairs.length; index += 1) {
    const previous = pairs[index - 1]!;
    const current = pairs[index]!;
    const clipDelta = current.clipStartMs - previous.clipStartMs;
    const sourceDelta = current.sourceStartMs - previous.sourceStartMs;
    const deltaDifference = Math.abs(sourceDelta - clipDelta);
    maxDeltaDifferenceMs = Math.max(maxDeltaDifferenceMs, deltaDifference);
    if (clipDelta >= 0 && sourceDelta >= 0 && deltaDifference <= toleranceMs) {
      continue;
    }
    runs.push(buildRun(runs.length, pairs, startIndex, index - 1, maxDeltaDifferenceMs));
    startIndex = index;
    maxDeltaDifferenceMs = 0;
  }
  runs.push(buildRun(runs.length, pairs, startIndex, pairs.length - 1, maxDeltaDifferenceMs));
  return runs;
}

function buildRun(index: number, pairs: WordPair[], firstPairIndex: number, lastPairIndex: number, maxDeltaDifferenceMs: number): LinearRun {
  const first = pairs[firstPairIndex]!;
  const last = pairs[lastPairIndex]!;
  const clipDurationMs = Math.max(0, last.clipEndMs - first.clipStartMs);
  const sourceDurationMs = Math.max(0, last.sourceEndMs - first.sourceStartMs);
  return {
    index,
    clipStartMs: first.clipStartMs,
    clipEndMs: last.clipEndMs,
    sourceStartMs: first.sourceStartMs,
    sourceEndMs: last.sourceEndMs,
    matchedWordPairCount: lastPairIndex - firstPairIndex + 1,
    clipDurationMs,
    sourceDurationMs,
    sourceMinusClipDurationMs: sourceDurationMs - clipDurationMs,
    maxDeltaDifferenceMs,
    firstPairIndex,
    lastPairIndex
  };
}

function pairOffsetMs(pair: WordPair): number {
  return pair.sourceStartMs - pair.clipStartMs;
}

function boundaryFromPair(candidateType: 'line_start' | 'line_end', pair: WordPair, pairIndex: number, run: LinearRun): BoundaryCandidate {
  return {
    candidateType,
    pairIndex,
    clipMs: pair.clipStartMs,
    sourceMs: pair.sourceStartMs,
    offsetMs: pairOffsetMs(pair),
    clipText: pair.clipText,
    sourceText: pair.sourceText,
    runIndex: run.index + 1,
    runWordCount: run.matchedWordPairCount
  };
}

function extractRunBoundaryCandidates(runs: LinearRun[], pairs: WordPair[]): BoundaryCandidate[] {
  const candidates: BoundaryCandidate[] = [];
  for (const run of runs) {
    const first = pairs[run.firstPairIndex];
    const last = pairs[run.lastPairIndex];
    if (first) {
      candidates.push(boundaryFromPair('line_start', first, run.firstPairIndex, run));
    }
    if (last && run.lastPairIndex !== run.firstPairIndex) {
      candidates.push(boundaryFromPair('line_end', last, run.lastPairIndex, run));
    }
  }
  return candidates;
}

function extractOffsetJumpBoundaryCandidates(pairs: WordPair[], thresholdMs: number): BoundaryCandidate[] {
  const candidates: BoundaryCandidate[] = [];
  for (let index = 1; index < pairs.length; index += 1) {
    const previous = pairs[index - 1]!;
    const current = pairs[index]!;
    const previousOffsetMs = pairOffsetMs(previous);
    const offsetMs = pairOffsetMs(current);
    const offsetJumpMs = offsetMs - previousOffsetMs;
    if (Math.abs(offsetJumpMs) < thresholdMs) {
      continue;
    }
    candidates.push({
      candidateType: 'offset_jump',
      pairIndex: index,
      clipMs: current.clipStartMs,
      sourceMs: current.sourceStartMs,
      offsetMs,
      clipText: current.clipText,
      sourceText: current.sourceText,
      previousPairIndex: index - 1,
      previousClipMs: previous.clipStartMs,
      previousSourceMs: previous.sourceStartMs,
      previousOffsetMs,
      offsetJumpMs
    });
  }
  return candidates;
}

function confirmedStartBoundaryDeltas(candidate: BoundaryCandidate, options: CliOptions): {
  clipBoundaryDeltaMs: number;
  sourceBoundaryDeltaMs: number;
} {
  return {
    clipBoundaryDeltaMs: candidate.clipMs - options.confirmedClipStartMs,
    sourceBoundaryDeltaMs: candidate.sourceMs - options.confirmedSourceStartMs
  };
}

function confirmedStartBoundaryPasses(candidate: BoundaryCandidate, options: CliOptions): boolean {
  const deltas = confirmedStartBoundaryDeltas(candidate, options);
  return Math.abs(deltas.clipBoundaryDeltaMs) <= options.toleranceMs &&
    Math.abs(deltas.sourceBoundaryDeltaMs) <= options.toleranceMs;
}

function boundaryCandidateDistance(candidate: BoundaryCandidate, options: CliOptions): number {
  const deltas = confirmedStartBoundaryDeltas(candidate, options);
  return Math.max(Math.abs(deltas.clipBoundaryDeltaMs), Math.abs(deltas.sourceBoundaryDeltaMs));
}

function bestConfirmedStartBoundaryCandidate(candidates: BoundaryCandidate[], options: CliOptions): {
  passes: boolean;
  candidate?: BoundaryCandidate;
  deltas?: ReturnType<typeof confirmedStartBoundaryDeltas>;
  maxBoundaryErrorMs?: number;
} {
  const direct = candidates.find((candidate) => confirmedStartBoundaryPasses(candidate, options));
  const best = direct ?? [...candidates].sort((left, right) => {
    const leftDistance = boundaryCandidateDistance(left, options);
    const rightDistance = boundaryCandidateDistance(right, options);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    const leftDeltas = confirmedStartBoundaryDeltas(left, options);
    const rightDeltas = confirmedStartBoundaryDeltas(right, options);
    const leftTotal = Math.abs(leftDeltas.clipBoundaryDeltaMs) + Math.abs(leftDeltas.sourceBoundaryDeltaMs);
    const rightTotal = Math.abs(rightDeltas.clipBoundaryDeltaMs) + Math.abs(rightDeltas.sourceBoundaryDeltaMs);
    return leftTotal - rightTotal;
  })[0];
  return {
    passes: direct !== undefined,
    ...(best ? {
      candidate: best,
      deltas: confirmedStartBoundaryDeltas(best, options),
      maxBoundaryErrorMs: boundaryCandidateDistance(best, options)
    } : {})
  };
}

function medianWordDuration(words: NormalizedWord[]): number {
  const durations = words
    .map((word) => word.endMs - word.startMs)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((left, right) => left - right);
  if (durations.length === 0) {
    return 0;
  }
  return durations[Math.floor(durations.length / 2)] ?? 0;
}

function confirmedDeltas(run: LinearRun, options: CliOptions) {
  return {
    clipStartDeltaMs: run.clipStartMs - options.confirmedClipStartMs,
    clipEndDeltaMs: run.clipEndMs - options.confirmedClipEndMs,
    sourceStartDeltaMs: run.sourceStartMs - options.confirmedSourceStartMs,
    sourceEndDeltaMs: run.sourceEndMs - options.confirmedSourceEndMs
  };
}

function confirmedPasses(run: LinearRun, options: CliOptions): boolean {
  const deltas = confirmedDeltas(run, options);
  return Math.abs(deltas.clipStartDeltaMs) <= options.toleranceMs &&
    Math.abs(deltas.clipEndDeltaMs) <= options.toleranceMs &&
    Math.abs(deltas.sourceStartDeltaMs) <= options.toleranceMs &&
    Math.abs(deltas.sourceEndDeltaMs) <= options.toleranceMs;
}

function overlapDuration(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): number {
  return Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart));
}

function bestConfirmedLikeRun(runs: LinearRun[], options: CliOptions): LinearRun | undefined {
  return [...runs].sort((left, right) => {
    const leftOverlap = overlapDuration(left.clipStartMs, left.clipEndMs, options.confirmedClipStartMs, options.confirmedClipEndMs);
    const rightOverlap = overlapDuration(right.clipStartMs, right.clipEndMs, options.confirmedClipStartMs, options.confirmedClipEndMs);
    if (rightOverlap !== leftOverlap) {
      return rightOverlap - leftOverlap;
    }
    return boundaryDistance(left, options) - boundaryDistance(right, options);
  })[0];
}

function boundaryDistance(run: LinearRun, options: CliOptions): number {
  const deltas = confirmedDeltas(run, options);
  return Math.abs(deltas.clipStartDeltaMs) +
    Math.abs(deltas.clipEndDeltaMs) +
    Math.abs(deltas.sourceStartDeltaMs) +
    Math.abs(deltas.sourceEndDeltaMs);
}

function connectedConfirmedComparison(runs: LinearRun[], options: CliOptions) {
  const overlapping = runs.filter((run) =>
    run.clipEndMs > options.confirmedClipStartMs &&
    run.clipStartMs < options.confirmedClipEndMs
  );
  const first = overlapping[0];
  const last = overlapping.at(-1);
  if (!first || !last) {
    return {
      overlappingRunCount: 0,
      passes: false
    };
  }
  const deltas = {
    clipStartDeltaMs: first.clipStartMs - options.confirmedClipStartMs,
    clipEndDeltaMs: last.clipEndMs - options.confirmedClipEndMs,
    sourceStartDeltaMs: first.sourceStartMs - options.confirmedSourceStartMs,
    sourceEndDeltaMs: last.sourceEndMs - options.confirmedSourceEndMs
  };
  return {
    overlappingRunCount: overlapping.length,
    firstRunIndex: first.index,
    lastRunIndex: last.index,
    connectedRange: {
      clipStartMs: first.clipStartMs,
      clipEndMs: last.clipEndMs,
      sourceStartMs: first.sourceStartMs,
      sourceEndMs: last.sourceEndMs
    },
    deltas,
    passes: Object.values(deltas).every((value) => Math.abs(value) <= options.toleranceMs)
  };
}

function currentSummary(label: string, run: RealignmentFile, options: CliOptions, elapsedMs?: number) {
  const segments = run.segments ?? [];
  const overlapping = segments.filter((row) => {
    const startMs = row.segment?.startMs;
    const endMs = row.segment?.endMs;
    return typeof startMs === 'number' &&
      typeof endMs === 'number' &&
      endMs > options.confirmedClipStartMs &&
      startMs < options.confirmedClipEndMs;
  });
  const first = overlapping[0];
  const last = overlapping.at(-1);
  const connectedDeltas = first && last
    ? {
        clipStartDeltaMs: (first.segment?.startMs ?? 0) - options.confirmedClipStartMs,
        clipEndDeltaMs: (last.segment?.endMs ?? 0) - options.confirmedClipEndMs,
        sourceStartDeltaMs: (first.bestMatch?.sourceStartMs ?? 0) - options.confirmedSourceStartMs,
        sourceEndDeltaMs: (last.bestMatch?.sourceEndMs ?? 0) - options.confirmedSourceEndMs
      }
    : undefined;
  return {
    label,
    sourceId: run.sourceId,
    segmentCount: segments.length,
    directInheritedCount: run.humanConfirmedPairPolicy?.applied?.length ?? 0,
    overlappingConfirmedRunCount: overlapping.length,
    connectedDeltas,
    connectedPasses: connectedDeltas
      ? Object.values(connectedDeltas).every((value) => Math.abs(value) <= options.toleranceMs)
      : false,
    ...(elapsedMs !== undefined ? { elapsedMs } : {})
  };
}

function traceWindow(input: {
  options: CliOptions;
  clipWords: NormalizedWord[];
  sourceWords: NormalizedWord[];
  pairs: WordPair[];
  allRuns: LinearRun[];
}): { clipRows: WindowTraceRow[]; sourceRows: WindowTraceRow[] } | undefined {
  const { options } = input;
  if (
    options.traceClipStartMs === undefined ||
    options.traceClipEndMs === undefined ||
    options.traceSourceStartMs === undefined ||
    options.traceSourceEndMs === undefined
  ) {
    return undefined;
  }
  const pairByClipWord = new Map<number, { pair: WordPair; pairIndex: number }>();
  const pairBySourceWord = new Map<number, { pair: WordPair; pairIndex: number }>();
  input.pairs.forEach((pair, pairIndex) => {
    pairByClipWord.set(pair.clipWordIndex, { pair, pairIndex });
    pairBySourceWord.set(pair.sourceWordIndex, { pair, pairIndex });
  });
  const runByPairIndex = new Map<number, LinearRun>();
  for (const run of input.allRuns) {
    for (let pairIndex = run.firstPairIndex; pairIndex <= run.lastPairIndex; pairIndex += 1) {
      runByPairIndex.set(pairIndex, run);
    }
  }
  const clipRows = input.clipWords
    .filter((word) => word.endMs >= options.traceClipStartMs! && word.startMs <= options.traceClipEndMs!)
    .map((word) => traceRowForWord('clip', word, pairByClipWord.get(word.wordIndex), runByPairIndex, options.minAnchorWords));
  const sourceRows = input.sourceWords
    .filter((word) => word.endMs >= options.traceSourceStartMs! && word.startMs <= options.traceSourceEndMs!)
    .map((word) => traceRowForWord('source', word, pairBySourceWord.get(word.wordIndex), runByPairIndex, options.minAnchorWords));
  return { clipRows, sourceRows };
}

function traceRowForWord(
  side: 'clip' | 'source',
  word: NormalizedWord,
  match: { pair: WordPair; pairIndex: number } | undefined,
  runByPairIndex: Map<number, LinearRun>,
  minAnchorWords: number
): WindowTraceRow {
  if (word.normalizedText.length === 0) {
    return {
      side,
      wordIndex: word.wordIndex,
      startMs: word.startMs,
      endMs: word.endMs,
      text: word.text,
      normalizedText: word.normalizedText,
      matched: false,
      stage: '正規化で空になった'
    };
  }
  if (!match) {
    return {
      side,
      wordIndex: word.wordIndex,
      startMs: word.startMs,
      endMs: word.endMs,
      text: word.text,
      normalizedText: word.normalizedText,
      matched: false,
      stage: 'DP対応点にならなかった'
    };
  }
  const run = runByPairIndex.get(match.pairIndex);
  const runWordCount = run?.matchedWordPairCount ?? 0;
  const candidateIncluded = runWordCount >= minAnchorWords;
  const counterpartText = side === 'clip' ? match.pair.sourceText : match.pair.clipText;
  const counterpartStartMs = side === 'clip' ? match.pair.sourceStartMs : match.pair.clipStartMs;
  return {
    side,
    wordIndex: word.wordIndex,
    startMs: word.startMs,
    endMs: word.endMs,
    text: word.text,
    normalizedText: word.normalizedText,
    matched: true,
    counterpartText,
    counterpartStartMs,
    runIndex: run ? run.index + 1 : undefined,
    runWordCount,
    candidateIncluded,
    stage: candidateIncluded
      ? 'DP対応点になり、候補直線分にも残った'
      : 'DP対応点になったが、直線分の対応語数が最低語数未満で確認候補から外れた'
  };
}

function svgScatter(input: {
  pairs: WordPair[];
  runs: LinearRun[];
  outputPath: string;
  minAnchorWords: number;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
}): string {
  const width = 1200;
  const height = 760;
  const margin = { left: 90, right: 40, top: 40, bottom: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = (ms: number) => margin.left + ((ms - input.clipStartMs) / Math.max(1, input.clipEndMs - input.clipStartMs)) * plotWidth;
  const y = (ms: number) => margin.top + plotHeight - ((ms - input.sourceStartMs) / Math.max(1, input.sourceEndMs - input.sourceStartMs)) * plotHeight;
  const circles = input.pairs.map((pair) =>
    `<circle cx="${roundSvg(x(pair.clipStartMs))}" cy="${roundSvg(y(pair.sourceStartMs))}" r="1.6" fill="#2563eb" opacity="0.38" />`
  );
  const lines = input.runs
    .filter((run) => run.matchedWordPairCount >= input.minAnchorWords)
    .map((run) => `<line x1="${roundSvg(x(run.clipStartMs))}" y1="${roundSvg(y(run.sourceStartMs))}" x2="${roundSvg(x(run.clipEndMs))}" y2="${roundSvg(y(run.sourceEndMs))}" stroke="#dc2626" stroke-width="2.2" opacity="0.85" />`);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="white" />',
    `<rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="#f8fafc" stroke="#cbd5e1" />`,
    `<text x="${width / 2}" y="24" text-anchor="middle" font-family="sans-serif" font-size="16">Global DP monotonic word alignment: clip time x source time</text>`,
    `<text x="${width / 2}" y="${height - 22}" text-anchor="middle" font-family="sans-serif" font-size="13">clip time</text>`,
    `<text x="22" y="${height / 2}" text-anchor="middle" font-family="sans-serif" font-size="13" transform="rotate(-90 22 ${height / 2})">source time</text>`,
    `<text x="${margin.left}" y="${height - 42}" font-family="monospace" font-size="12">${msText(input.clipStartMs)}</text>`,
    `<text x="${width - margin.right}" y="${height - 42}" text-anchor="end" font-family="monospace" font-size="12">${msText(input.clipEndMs)}</text>`,
    `<text x="${margin.left - 8}" y="${margin.top + plotHeight}" text-anchor="end" font-family="monospace" font-size="12">${msText(input.sourceStartMs)}</text>`,
    `<text x="${margin.left - 8}" y="${margin.top + 4}" text-anchor="end" font-family="monospace" font-size="12">${msText(input.sourceEndMs)}</text>`,
    ...circles,
    ...lines,
    '</svg>'
  ].join('\n');
}

function roundSvg(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

function msText(ms: number | undefined): string {
  if (ms === undefined) {
    return 'n/a';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function signed(value: number | undefined): string {
  if (value === undefined) {
    return 'n/a';
  }
  return `${value >= 0 ? '+' : ''}${value}ms`;
}

function boundaryCandidateText(candidate: BoundaryCandidate): string {
  const label = candidate.candidateType === 'line_start'
    ? '直線分開始'
    : candidate.candidateType === 'line_end'
      ? '直線分終了'
      : 'オフセット跳び';
  const runText = candidate.runIndex ? ` / run ${candidate.runIndex}` : '';
  const jumpText = candidate.offsetJumpMs !== undefined ? ` / offset差 ${signed(candidate.offsetJumpMs)}` : '';
  return `${label}${runText} pair ${candidate.pairIndex} clip ${msText(candidate.clipMs)} / source ${msText(candidate.sourceMs)} / ${candidate.clipText}/${candidate.sourceText}${jumpText}`;
}

async function lineCount(filePath: string): Promise<number> {
  const text = await readFile(filePath, 'utf8');
  const withoutFinalLineBreak = text.replace(/\r?\n$/, '');
  if (withoutFinalLineBreak.length === 0) {
    return 0;
  }
  return withoutFinalLineBreak.split(/\r?\n/).length;
}

function behaviorParameterSummary(options: CliOptions) {
  const globalParameters: Array<{ name: string; value: number | boolean; meaning: string }> = [
    {
      name: 'minAnchorWords',
      value: options.minAnchorWords,
      meaning: '候補として人間に読む直線分の最低対応単語数。照合DPの重みではない。'
    },
    {
      name: 'offsetJumpThresholdMs',
      value: options.offsetJumpThresholdMs,
      meaning: '対応点列で元動画時刻と切り抜き時刻の差がこの値以上跳んだ場所を、追加の境界候補として出す。'
    }
  ];
  if (options.repairLocalContinuity) {
    globalParameters.push({
      name: 'repairLocalContinuity',
      value: true,
      meaning: '遠方の同一語へ飛んだ対応点について、直前対応からの時刻差が単語時刻中央値以内に収まる近傍同一語へ置き換える。'
    });
  }
  return {
    globalDpPrototype: {
      count: globalParameters.length,
      parameters: globalParameters,
      derivedValues: [
        '直線分の切断許容幅は、切り抜き側と元動画側の単語時刻中央値から導出'
      ]
    },
    cutpointCurrent: {
      count: 7,
      parameters: [
        'maxAudioCutpoints',
        'maxVideoCutpoints',
        'minSegmentMs',
        'minAnchorWords',
        'topMatches',
        'audioFrameMs',
        'audioHopMs'
      ]
    }
  };
}

function reportMarkdown(input: {
  resultPath: string;
  svgPath: string;
  clipId: string;
  sourceId: string;
  clipWordCount: number;
  sourceWordCount: number;
  confirmedClipStartMs: number;
  pairCount: number;
  allRuns: LinearRun[];
  candidateRuns: LinearRun[];
  runBoundaryCandidates: BoundaryCandidate[];
  offsetJumpBoundaryCandidates: BoundaryCandidate[];
  combinedBoundaryCandidates: BoundaryCandidate[];
  confirmedStartBoundaryCandidate: ReturnType<typeof bestConfirmedStartBoundaryCandidate>;
  confirmedDirectAll: { passes: boolean; run?: LinearRun; deltas?: ReturnType<typeof confirmedDeltas> };
  confirmedConnectedAll: ReturnType<typeof connectedConfirmedComparison>;
  confirmedDirectCandidate: { passes: boolean; run?: LinearRun; deltas?: ReturnType<typeof confirmedDeltas> };
  confirmedConnectedCandidate: ReturnType<typeof connectedConfirmedComparison>;
  current16: ReturnType<typeof currentSummary>;
  current41: ReturnType<typeof currentSummary>;
  maintainability: Record<string, unknown>;
  continuityRepairs: ContinuityRepair[];
  traceReportPath?: string;
}): string {
  const lines = [
    '# 大域DP単調アラインメント試作レポート',
    '',
    `- 結果JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- 散布図SVG: ${path.relative(evalRoot, input.svgPath)}`,
    `- 切り抜きSTT: ${input.clipId}`,
    `- 元動画STT: ${input.sourceId}`,
    '- カット点検出: 未使用',
    `- 局所連続修復: ${input.continuityRepairs.length > 0 ? '使用' : '未使用'}`,
    '- fixture凍結: no',
    '- readyForFreeze: false',
    '',
    '## 方法',
    '',
    '- 既存照合と同じ正規化を使う。',
    '- 切り抜き側と元動画側の全単語列を、単語の最長共通部分列で一括対応付けする。',
    '- 対応点列を時刻差の連続性で直線分へ分ける。切断許容幅は既存の時間軸整合チェックと同じく、単語時刻の中央値から導出する。',
    '- 新しい重み係数は使っていない。',
    '',
    '## 結果',
    '',
    `- 切り抜き側単語数: ${input.clipWordCount}`,
    `- 元動画側単語数: ${input.sourceWordCount}`,
    `- DP対応点数: ${input.pairCount}`,
    `- 抽出した直線分: ${input.allRuns.length}`,
    `- 対応単語${(input.maintainability as any).parameters?.globalDpPrototype?.parameters?.[0]?.value ?? 10}語以上の候補直線分: ${input.candidateRuns.length}`,
    `- 直線分端点の境界候補: ${input.runBoundaryCandidates.length}`,
    `- オフセット跳び境界候補: ${input.offsetJumpBoundaryCandidates.length}`,
    `- 境界候補の合計: ${input.combinedBoundaryCandidates.length}`,
    `- 局所連続修復数: ${input.continuityRepairs.length}`,
    input.traceReportPath ? `- 窓トレース: ${path.relative(evalRoot, input.traceReportPath)}` : '- 窓トレース: 未指定',
    '',
    '## 確認済みペア再現',
    '',
    `- 全直線分の単一区間で±500ms再現: ${input.confirmedDirectAll.passes ? 'yes' : 'no'}`,
    input.confirmedDirectAll.run
      ? `- 全直線分で最も近い区間: run ${input.confirmedDirectAll.run.index + 1} clip ${msText(input.confirmedDirectAll.run.clipStartMs)}-${msText(input.confirmedDirectAll.run.clipEndMs)} / source ${msText(input.confirmedDirectAll.run.sourceStartMs)}-${msText(input.confirmedDirectAll.run.sourceEndMs)} / 対応単語 ${input.confirmedDirectAll.run.matchedWordPairCount}`
      : '- 最も近い直線分: none',
    input.confirmedDirectAll.deltas
      ? `- 全直線分で最も近い区間の境界差: clip開始 ${signed(input.confirmedDirectAll.deltas.clipStartDeltaMs)}, clip終了 ${signed(input.confirmedDirectAll.deltas.clipEndDeltaMs)}, 元開始 ${signed(input.confirmedDirectAll.deltas.sourceStartDeltaMs)}, 元終了 ${signed(input.confirmedDirectAll.deltas.sourceEndDeltaMs)}`
      : '- 境界差: n/a',
    `- 全直線分の連結で±500ms再現: ${input.confirmedConnectedAll.passes ? 'yes' : 'no'}`,
    `- 対応単語10語以上の確認候補で単一区間±500ms再現: ${input.confirmedDirectCandidate.passes ? 'yes' : 'no'}`,
    input.confirmedDirectCandidate.run
      ? `- 確認候補で最も近い区間: run ${input.confirmedDirectCandidate.run.index + 1} clip ${msText(input.confirmedDirectCandidate.run.clipStartMs)}-${msText(input.confirmedDirectCandidate.run.clipEndMs)} / source ${msText(input.confirmedDirectCandidate.run.sourceStartMs)}-${msText(input.confirmedDirectCandidate.run.sourceEndMs)} / 対応単語 ${input.confirmedDirectCandidate.run.matchedWordPairCount}`
      : '- 確認候補で最も近い区間: none',
    input.confirmedDirectCandidate.deltas
      ? `- 確認候補で最も近い区間の境界差: clip開始 ${signed(input.confirmedDirectCandidate.deltas.clipStartDeltaMs)}, clip終了 ${signed(input.confirmedDirectCandidate.deltas.clipEndDeltaMs)}, 元開始 ${signed(input.confirmedDirectCandidate.deltas.sourceStartDeltaMs)}, 元終了 ${signed(input.confirmedDirectCandidate.deltas.sourceEndDeltaMs)}`
      : '- 確認候補の境界差: n/a',
    `- 対応単語10語以上の確認候補を連結した場合の±500ms再現: ${input.confirmedConnectedCandidate.passes ? 'yes' : 'no'}`,
    `- 境界候補で確定開始clip/sourceが±500ms再現: ${input.confirmedStartBoundaryCandidate.passes ? 'yes' : 'no'}`,
    input.confirmedStartBoundaryCandidate.candidate
      ? `- 確定開始に最も近い境界候補: ${boundaryCandidateText(input.confirmedStartBoundaryCandidate.candidate)}`
      : '- 確定開始に最も近い境界候補: none',
    input.confirmedStartBoundaryCandidate.deltas
      ? `- 最も近い境界候補の差: clip ${signed(input.confirmedStartBoundaryCandidate.deltas.clipBoundaryDeltaMs)}, source ${signed(input.confirmedStartBoundaryCandidate.deltas.sourceBoundaryDeltaMs)}`
      : '- 最も近い境界候補の差: n/a',
    '',
    '## オフセット跳び境界候補',
    '',
    '| pair | clip | source | offset差 | 単語 |',
    '| ---: | ---: | ---: | ---: | --- |'
  ];

  const offsetRows = [...input.offsetJumpBoundaryCandidates]
    .sort((left, right) => Math.abs(left.clipMs - input.confirmedClipStartMs) - Math.abs(right.clipMs - input.confirmedClipStartMs))
    .slice(0, 12);
  for (const candidate of offsetRows) {
    lines.push(`| ${candidate.pairIndex} | ${msText(candidate.clipMs)} | ${msText(candidate.sourceMs)} | ${signed(candidate.offsetJumpMs)} | ${candidate.clipText}/${candidate.sourceText} |`);
  }
  if (offsetRows.length === 0) {
    lines.push('| n/a | n/a | n/a | n/a | n/a |');
  }

  lines.push(
    '',
    '## 候補直線分',
    '',
    '| run | clip | source | 対応単語 | clip長 | source長 |',
    '| ---: | --- | --- | ---: | ---: | ---: |'
  );

  for (const run of input.candidateRuns) {
    lines.push(`| ${run.index + 1} | ${msText(run.clipStartMs)}-${msText(run.clipEndMs)} | ${msText(run.sourceStartMs)}-${msText(run.sourceEndMs)} | ${run.matchedWordPairCount} | ${msText(run.clipDurationMs)} | ${msText(run.sourceDurationMs)} |`);
  }

  lines.push(
    '',
    '## 現行方式との比較',
    '',
    '| 方式 | 区間数 | 確認済み直接継承 | 確認済み連結±500ms | 実行時間 |',
    '| --- | ---: | ---: | --- | ---: |',
    `| DP一括対応 | ${input.candidateRuns.length} | ${input.confirmedDirectCandidate.passes ? '1' : '0'} | ${input.confirmedConnectedCandidate.passes ? 'yes' : 'no'} | ${formatElapsed((input.maintainability as any).executionTimeMs?.globalDpPrototype)} |`,
    `| 現行16セグメント | ${input.current16.segmentCount} | ${input.current16.directInheritedCount} | ${input.current16.connectedPasses ? 'yes' : 'no'} | ${formatElapsed(input.current16.elapsedMs)} |`,
    `| 現行41セグメント監査 | ${input.current41.segmentCount} | ${input.current41.directInheritedCount} | ${input.current41.connectedPasses ? 'yes' : 'no'} | ${formatElapsed(input.current41.elapsedMs)} |`,
    '',
    '## 確認済み範囲の連結境界差',
    '',
    '| 方式 | 重なった区間数 | clip開始 | clip終了 | 元開始 | 元終了 |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    `| DP全直線分 | ${input.confirmedConnectedAll.overlappingRunCount} | ${signed(input.confirmedConnectedAll.deltas?.clipStartDeltaMs)} | ${signed(input.confirmedConnectedAll.deltas?.clipEndDeltaMs)} | ${signed(input.confirmedConnectedAll.deltas?.sourceStartDeltaMs)} | ${signed(input.confirmedConnectedAll.deltas?.sourceEndDeltaMs)} |`,
    `| DP確認候補 | ${input.confirmedConnectedCandidate.overlappingRunCount} | ${signed(input.confirmedConnectedCandidate.deltas?.clipStartDeltaMs)} | ${signed(input.confirmedConnectedCandidate.deltas?.clipEndDeltaMs)} | ${signed(input.confirmedConnectedCandidate.deltas?.sourceStartDeltaMs)} | ${signed(input.confirmedConnectedCandidate.deltas?.sourceEndDeltaMs)} |`,
    `| 現行16セグメント | ${input.current16.overlappingConfirmedRunCount} | ${signed(input.current16.connectedDeltas?.clipStartDeltaMs)} | ${signed(input.current16.connectedDeltas?.clipEndDeltaMs)} | ${signed(input.current16.connectedDeltas?.sourceStartDeltaMs)} | ${signed(input.current16.connectedDeltas?.sourceEndDeltaMs)} |`,
    `| 現行41セグメント監査 | ${input.current41.overlappingConfirmedRunCount} | ${signed(input.current41.connectedDeltas?.clipStartDeltaMs)} | ${signed(input.current41.connectedDeltas?.clipEndDeltaMs)} | ${signed(input.current41.connectedDeltas?.sourceStartDeltaMs)} | ${signed(input.current41.connectedDeltas?.sourceEndDeltaMs)} |`,
    '',
    '## 保守性メモ',
    '',
    `- DP試作コード行数: ${(input.maintainability as any).codeLines?.globalDpPrototype}`,
    `- 現行カット点再照合コード行数: ${(input.maintainability as any).codeLines?.cutpointRealignment}`,
    `- DP試作の挙動パラメータ数: ${(input.maintainability as any).parameters?.globalDpPrototype?.count}`,
    `- 現行方式の挙動パラメータ数: ${(input.maintainability as any).parameters?.cutpointCurrent?.count}`,
    '',
    '## 本体影響',
    '',
    '- runtime/ への書き込みなし',
    '- fixtures/ への書き込みなし',
    '- expected/ への書き込みなし',
    '- 本番UI/API/キュー/DBへの変更なし'
  );

  return `${lines.join('\n')}\n`;
}

function traceMarkdown(input: {
  options: CliOptions;
  trace: NonNullable<ReturnType<typeof traceWindow>>;
  repairs: ContinuityRepair[];
  directCandidatePasses: boolean;
  connectedCandidatePasses: boolean;
  directAllPasses: boolean;
  connectedAllPasses: boolean;
}): string {
  const clipSequence = input.trace.clipRows.map((row) => `${row.text}/${row.normalizedText || 'EMPTY'}`).join(' ');
  const sourceSequence = input.trace.sourceRows.map((row) => `${row.text}/${row.normalizedText || 'EMPTY'}`).join(' ');
  const rows = [...input.trace.clipRows, ...input.trace.sourceRows].map((row) => (
    `| ${row.side} | ${msText(row.startMs)}-${msText(row.endMs)} | ${row.text} | ${row.normalizedText || 'EMPTY'} | ${row.matched ? 'yes' : 'no'} | ${row.counterpartText ?? ''} ${row.counterpartStartMs !== undefined ? msText(row.counterpartStartMs) : ''} | ${row.runIndex ?? ''} | ${row.runWordCount ?? ''} | ${row.candidateIncluded === undefined ? '' : row.candidateIncluded ? 'yes' : 'no'} | ${row.stage} |`
  ));
  const repairRows = input.repairs.slice(0, 40).map((repair) => (
    `| ${msText(repair.clipStartMs)} ${repair.clipText} | ${msText(repair.originalSourceStartMs)} ${repair.originalSourceText} | ${msText(repair.repairedSourceStartMs)} ${repair.repairedSourceText} | ${repair.originalDeltaDifferenceMs}ms | ${repair.repairedDeltaDifferenceMs}ms |`
  ));
  return [
    '# DP窓トレース',
    '',
    `- clip窓: ${msText(input.options.traceClipStartMs)}-${msText(input.options.traceClipEndMs)}`,
    `- source窓: ${msText(input.options.traceSourceStartMs)}-${msText(input.options.traceSourceEndMs)}`,
    `- 最低対応語数: ${input.options.minAnchorWords}`,
    `- 局所連続修復: ${input.options.repairLocalContinuity ? '使用' : '未使用'}`,
    '',
    '## 正規化後の語列',
    '',
    `- clip: ${clipSequence}`,
    `- source: ${sourceSequence}`,
    '',
    '## 段階別トレース',
    '',
    '| 側 | 時刻 | 語 | 正規化後 | DP対応 | 対応先 | 直線分 | 直線分語数 | 候補残り | 消えた段階 |',
    '| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |',
    ...rows,
    '',
    '## 確認済みペア再現',
    '',
    `- 全直線分の単一区間: ${input.directAllPasses ? 'yes' : 'no'}`,
    `- 全直線分の連結: ${input.connectedAllPasses ? 'yes' : 'no'}`,
    `- 確認候補の単一区間: ${input.directCandidatePasses ? 'yes' : 'no'}`,
    `- 確認候補の連結: ${input.connectedCandidatePasses ? 'yes' : 'no'}`,
    '',
    '## 局所連続修復の内容',
    '',
    repairRows.length > 0
      ? '| clip語 | 修復前source | 修復後source | 修復前の時間差崩れ | 修復後の時間差崩れ |'
      : '- 修復なし',
    ...(repairRows.length > 0 ? ['| --- | --- | --- | ---: | ---: |', ...repairRows] : []),
    '',
    '## 原因',
    '',
    '- この窓の語は正規化で消えていない。',
    '- この窓の主要語はDP対応点になっている。',
    '- 現行DPにはギャップペナルティや局所性スコアがなく、同じ語が元動画の後方に再出現すると、全体の一致語数を最大化する経路が局所対応から外れることがある。',
    '- clip 1:37.221-1:37.962 の2語はDP対応点だが、直線分語数2のため、最低対応語数10の確認候補から外れる。',
    '- clip 1:32.555 は57語の直線分の内部にあるため、現行の「最大直線分をそのまま候補区間にする」処理では、確認済み開始境界としては出てこない。'
  ].join('\n') + '\n';
}

function formatElapsed(ms: number | undefined): string {
  return ms === undefined ? 'not recorded' : `${Math.round(ms)}ms`;
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const options = parseOptions(process.argv.slice(2));
  const clip = await loadWords(options.clipId, 'clip');
  const source = await loadWords(options.sourceId, 'source');
  const clipUnits = toUnits(clip.words);
  const sourceUnits = toUnits(source.words);
  const derivedLineToleranceMs = Math.max(medianWordDuration(clip.words), medianWordDuration(source.words));
  const rawPairs = alignByLcs(clipUnits, sourceUnits);
  const repairResult = options.repairLocalContinuity
    ? repairLocalContinuityPairs(rawPairs, sourceUnits, derivedLineToleranceMs)
    : { pairs: rawPairs, repairs: [] };
  const pairs = repairResult.pairs;
  const allRuns = extractLinearRuns(pairs, derivedLineToleranceMs);
  const candidateRuns = allRuns.filter((run) => run.matchedWordPairCount >= options.minAnchorWords);
  const runBoundaryCandidates = extractRunBoundaryCandidates(candidateRuns, pairs);
  const offsetJumpBoundaryCandidates = extractOffsetJumpBoundaryCandidates(pairs, options.offsetJumpThresholdMs);
  const combinedBoundaryCandidates = [...runBoundaryCandidates, ...offsetJumpBoundaryCandidates];
  const confirmedStartBoundaryCandidate = bestConfirmedStartBoundaryCandidate(combinedBoundaryCandidates, options);
  const directRunAll = allRuns.find((run) => confirmedPasses(run, options));
  const bestRunAll = directRunAll ?? bestConfirmedLikeRun(allRuns, options);
  const confirmedConnectedAll = connectedConfirmedComparison(allRuns, options);
  const directRunCandidate = candidateRuns.find((run) => confirmedPasses(run, options));
  const bestRunCandidate = directRunCandidate ?? bestConfirmedLikeRun(candidateRuns, options);
  const confirmedConnectedCandidate = connectedConfirmedComparison(candidateRuns, options);
  const current16Run = await readJson<RealignmentFile>(options.current16Path);
  const current41Run = await readJson<RealignmentFile>(options.current41Path);

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  const plotDir = path.join(outputDir, 'plots');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  await mkdir(plotDir, { recursive: true });

  const resultPath = path.join(outputDir, `global-dp-word-alignment-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `global-dp-word-alignment-${options.outputId}.md`);
  const svgPath = path.join(plotDir, `global-dp-word-alignment-${options.outputId}.svg`);
  const windowTrace = traceWindow({
    options,
    clipWords: clip.words,
    sourceWords: source.words,
    pairs,
    allRuns
  });
  const traceReportPath = windowTrace
    ? path.join(reportDir, `global-dp-window-trace-${options.outputId}.md`)
    : undefined;
  const elapsedBeforeWriteMs = performance.now() - startedAt;

  const maintainability = {
    codeLines: {
      globalDpPrototype: await lineCount(resolveWorkspacePath('evals/clip_composition/global_dp_word_alignment.ts')),
      cutpointRealignment: await lineCount(resolveWorkspacePath('evals/clip_composition/realign_multicut_cutpoints.ts'))
    },
    parameters: behaviorParameterSummary(options),
    executionTimeMs: {
      globalDpPrototype: Math.round(elapsedBeforeWriteMs),
      current16SegmentRun: options.current16ElapsedMs,
      current41SegmentRun: options.current41ElapsedMs
    }
  };

  const result = {
    kind: 'clip_composition_global_dp_word_alignment',
    runAt: new Date().toISOString(),
    clip: {
      id: options.clipId,
      sourceUri: clip.sourceUri,
      wordCount: clip.words.length
    },
    source: {
      id: options.sourceId,
      sourceUri: source.sourceUri,
      wordCount: source.words.length
    },
    settings: {
      normalization: [
        '全角半角統一',
        'カタカナのひらがな化',
        'Unicode正規化による数字表記統一',
        '記号・空白・長音記号の除外',
        '漢字の読み変換は未実装'
      ],
      monotonicAlignment: '単語列の最長共通部分列',
      lineExtraction: '隣接対応点の切り抜き側時刻差と元動画側時刻差の差が、単語時刻中央値以内なら同一直線分として扱う',
      derivedLineToleranceMs,
      minAnchorWords: options.minAnchorWords,
      repairLocalContinuity: options.repairLocalContinuity,
      offsetJumpThresholdMs: options.offsetJumpThresholdMs
    },
    confirmedPair: {
      clipStartMs: options.confirmedClipStartMs,
      clipEndMs: options.confirmedClipEndMs,
      sourceStartMs: options.confirmedSourceStartMs,
      sourceEndMs: options.confirmedSourceEndMs,
      toleranceMs: options.toleranceMs
    },
    alignment: {
      pairCount: pairs.length,
      rawPairCount: rawPairs.length,
      pairs,
      allRuns,
      candidateRuns,
      boundaryCandidates: {
        runEndpointCandidates: runBoundaryCandidates,
        offsetJumpCandidates: offsetJumpBoundaryCandidates,
        combinedCandidates: combinedBoundaryCandidates,
        confirmedStart: confirmedStartBoundaryCandidate
      },
      continuityRepairs: repairResult.repairs,
      windowTrace,
      directConfirmedAll: {
        passes: directRunAll !== undefined,
        ...(bestRunAll ? { run: bestRunAll, deltas: confirmedDeltas(bestRunAll, options) } : {})
      },
      connectedConfirmedAll: confirmedConnectedAll,
      directConfirmedCandidate: {
        passes: directRunCandidate !== undefined,
        ...(bestRunCandidate ? { run: bestRunCandidate, deltas: confirmedDeltas(bestRunCandidate, options) } : {})
      },
      connectedConfirmedCandidate: confirmedConnectedCandidate
    },
    comparison: {
      current16: currentSummary('current16', current16Run, options, options.current16ElapsedMs),
      current41: currentSummary('current41', current41Run, options, options.current41ElapsedMs)
    },
    maintainability,
    outputs: {
      scatterSvg: relativeWorkspacePath(svgPath),
      report: relativeWorkspacePath(reportPath),
      ...(traceReportPath ? { windowTraceReport: relativeWorkspacePath(traceReportPath) } : {})
    },
    productionImpact: {
      runtimeWrites: false,
      fixtureWrites: false,
      expectedWrites: false,
      productionApiUiQueueDbChanged: false
    }
  };

  const clipStartMs = clip.words[0]?.startMs ?? 0;
  const clipEndMs = clip.words.at(-1)?.endMs ?? clipStartMs;
  const sourceStartMs = Math.min(...pairs.map((pair) => pair.sourceStartMs));
  const sourceEndMs = Math.max(...pairs.map((pair) => pair.sourceEndMs));
  await writeFile(svgPath, svgScatter({
    pairs,
    runs: candidateRuns,
    outputPath: svgPath,
    minAnchorWords: options.minAnchorWords,
    clipStartMs,
    clipEndMs,
    sourceStartMs,
    sourceEndMs
  }), 'utf8');
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown({
    resultPath,
    svgPath,
    clipId: options.clipId,
    sourceId: options.sourceId,
    clipWordCount: clip.words.length,
    sourceWordCount: source.words.length,
    confirmedClipStartMs: options.confirmedClipStartMs,
    pairCount: pairs.length,
    allRuns,
    candidateRuns,
    runBoundaryCandidates,
    offsetJumpBoundaryCandidates,
    combinedBoundaryCandidates,
    confirmedStartBoundaryCandidate,
    confirmedDirectAll: {
      passes: directRunAll !== undefined,
      ...(bestRunAll ? { run: bestRunAll, deltas: confirmedDeltas(bestRunAll, options) } : {})
    },
    confirmedConnectedAll,
    confirmedDirectCandidate: {
      passes: directRunCandidate !== undefined,
      ...(bestRunCandidate ? { run: bestRunCandidate, deltas: confirmedDeltas(bestRunCandidate, options) } : {})
    },
    confirmedConnectedCandidate,
    current16: currentSummary('current16', current16Run, options, options.current16ElapsedMs),
    current41: currentSummary('current41', current41Run, options, options.current41ElapsedMs),
    maintainability,
    continuityRepairs: repairResult.repairs,
    traceReportPath
  }), 'utf8');
  if (windowTrace && traceReportPath) {
    await writeFile(traceReportPath, traceMarkdown({
      options,
      trace: windowTrace,
      repairs: repairResult.repairs,
      directCandidatePasses: directRunCandidate !== undefined,
      connectedCandidatePasses: confirmedConnectedCandidate.passes,
      directAllPasses: directRunAll !== undefined,
      connectedAllPasses: confirmedConnectedAll.passes
    }), 'utf8');
  }

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`scatter: ${svgPath}`);
  console.log(`pairs: ${pairs.length}`);
  console.log(`linear runs: ${allRuns.length}`);
  console.log(`candidate runs: ${candidateRuns.length}`);
  console.log(`direct confirmed: ${directRunCandidate ? 'yes' : 'no'}`);
  console.log(`boundary confirmed start: ${confirmedStartBoundaryCandidate.passes ? 'yes' : 'no'}`);
  if (traceReportPath) {
    console.log(`trace: ${traceReportPath}`);
  }
  console.log(`continuity repairs: ${repairResult.repairs.length}`);
  console.log(`elapsed ms: ${Math.round(performance.now() - startedAt)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
