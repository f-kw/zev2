export type TimeAxisWord = {
  text: string;
  startMs: number;
  endMs: number;
  wordIndex?: number;
};

export type TimeAxisTextChar = {
  char: string;
  startMs: number;
  endMs: number;
  wordIndex: number;
};

export type TimeAxisInspection = {
  matchedWordPairCount: number;
  toleranceMs: number;
  longestLinearRunClipStartMs?: number;
  longestLinearRunClipEndMs?: number;
  longestLinearRunDurationMs: number;
  segmentDurationMs: number;
  linearContinuityRatio: number;
  maxDeltaDifferenceMs?: number;
  discontinuityCount: number;
};

export function inspectTimeAxisIntegrity(input: {
  segmentStartMs: number;
  segmentEndMs: number;
  query: string;
  sourceText: string;
  queryChars: TimeAxisTextChar[];
  sourceChars: TimeAxisTextChar[];
  clipWords: TimeAxisWord[];
  sourceWords: TimeAxisWord[];
}): TimeAxisInspection {
  const segmentDurationMs = Math.max(0, input.segmentEndMs - input.segmentStartMs);
  const pairs = lcsPairs(input.query, input.sourceText);
  const clipWordByIndex = wordsByIndex(input.clipWords);
  const sourceWordByIndex = wordsByIndex(input.sourceWords);
  const uniqueWordPairs = new Map<string, { clipWord: TimeAxisWord; sourceWord: TimeAxisWord }>();

  for (const pair of pairs) {
    const queryChar = input.queryChars[pair.leftIndex];
    const sourceChar = input.sourceChars[pair.rightIndex];
    if (!queryChar || !sourceChar) {
      continue;
    }

    const clipWord = clipWordByIndex.get(queryChar.wordIndex);
    const sourceWord = sourceWordByIndex.get(sourceChar.wordIndex);
    if (!clipWord || !sourceWord) {
      continue;
    }

    uniqueWordPairs.set(`${queryChar.wordIndex}:${sourceChar.wordIndex}`, { clipWord, sourceWord });
  }

  const wordPairs = [...uniqueWordPairs.values()].sort((left, right) => (
    left.clipWord.startMs - right.clipWord.startMs ||
    left.sourceWord.startMs - right.sourceWord.startMs
  ));
  const toleranceMs = Math.max(medianWordDuration(input.clipWords), medianWordDuration(input.sourceWords));
  if (wordPairs.length === 0) {
    return {
      matchedWordPairCount: 0,
      toleranceMs,
      longestLinearRunDurationMs: 0,
      segmentDurationMs,
      linearContinuityRatio: 0,
      discontinuityCount: 0
    };
  }

  let currentStart = wordPairs[0]!;
  let currentEnd = wordPairs[0]!;
  let bestStart = currentStart;
  let bestEnd = currentEnd;
  let maxDeltaDifferenceMs = 0;
  let discontinuityCount = 0;

  for (let index = 1; index < wordPairs.length; index += 1) {
    const previous = wordPairs[index - 1]!;
    const current = wordPairs[index]!;
    const clipDelta = current.clipWord.startMs - previous.clipWord.startMs;
    const sourceDelta = current.sourceWord.startMs - previous.sourceWord.startMs;
    const deltaDifference = Math.abs(sourceDelta - clipDelta);
    maxDeltaDifferenceMs = Math.max(maxDeltaDifferenceMs, deltaDifference);

    if (clipDelta >= 0 && sourceDelta >= 0 && deltaDifference <= toleranceMs) {
      currentEnd = current;
      continue;
    }

    discontinuityCount += 1;
    if (runDuration(currentStart, currentEnd, input) > runDuration(bestStart, bestEnd, input)) {
      bestStart = currentStart;
      bestEnd = currentEnd;
    }
    currentStart = current;
    currentEnd = current;
  }

  if (runDuration(currentStart, currentEnd, input) > runDuration(bestStart, bestEnd, input)) {
    bestStart = currentStart;
    bestEnd = currentEnd;
  }

  const longestLinearRunDurationMs = runDuration(bestStart, bestEnd, input);
  const linearContinuityRatio = segmentDurationMs > 0
    ? Math.min(1, longestLinearRunDurationMs / segmentDurationMs)
    : 0;

  return {
    matchedWordPairCount: wordPairs.length,
    toleranceMs,
    longestLinearRunClipStartMs: Math.max(input.segmentStartMs, bestStart.clipWord.startMs),
    longestLinearRunClipEndMs: Math.min(input.segmentEndMs, bestEnd.clipWord.endMs),
    longestLinearRunDurationMs,
    segmentDurationMs,
    linearContinuityRatio: roundMetric(linearContinuityRatio),
    maxDeltaDifferenceMs,
    discontinuityCount
  };
}

function wordsByIndex(words: TimeAxisWord[]): Map<number, TimeAxisWord> {
  const result = new Map<number, TimeAxisWord>();
  for (const [fallbackIndex, word] of words.entries()) {
    result.set(word.wordIndex ?? fallbackIndex, word);
  }
  return result;
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

function runDuration(
  start: { clipWord: TimeAxisWord },
  end: { clipWord: TimeAxisWord },
  segment: { segmentStartMs: number; segmentEndMs: number }
): number {
  const runStartMs = Math.max(segment.segmentStartMs, start.clipWord.startMs);
  const runEndMs = Math.min(segment.segmentEndMs, end.clipWord.endMs);
  return Math.max(0, runEndMs - runStartMs);
}

function medianWordDuration(words: TimeAxisWord[]): number {
  const durations = words
    .map((word) => word.endMs - word.startMs)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((left, right) => left - right);
  if (durations.length === 0) {
    return 0;
  }
  return durations[Math.floor(durations.length / 2)] ?? 0;
}

function roundMetric(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}
