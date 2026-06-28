type WrapToken = {
  text: string;
  prefix: string;
};

export function getCharWeight(char: string): number {
  if (/^[\u0000-\u00ff]$/.test(char)) {
    return 1;
  }
  return 2;
}

const getTextWeight = (text: string): number => {
  let weight = 0;
  for (const char of text) {
    weight += getCharWeight(char);
  }
  return weight;
};

export function countVisibleCharacters(text: string): number {
  const normalized = (text || '').trim();
  return normalized ? Array.from(normalized).length : 0;
}

export function isJapaneseText(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
}

// 既存互換の文字単位折り返し（BudouX不可時のフォールバック）
export function breakLineFallback(rawLine: string, maxCharsPerLine?: number): string[] {
  if (!maxCharsPerLine || maxCharsPerLine <= 0) {
    return [rawLine];
  }
  if (rawLine.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let current = '';
  let count = 0;
  for (const char of rawLine) {
    const weight = getCharWeight(char);
    if (count + weight > maxCharsPerLine && current.length > 0) {
      lines.push(current);
      current = char;
      count = weight;
    } else {
      current += char;
      count += weight;
    }
  }
  lines.push(current);
  return lines;
}

const splitTokenByWeight = (token: string, maxCharsPerLine: number): string[] => {
  const parts: string[] = [];
  let current = '';
  let count = 0;

  for (const char of token) {
    const weight = getCharWeight(char);
    if (count + weight > maxCharsPerLine && current.length > 0) {
      parts.push(current);
      current = char;
      count = weight;
    } else {
      current += char;
      count += weight;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }
  return parts;
};

type PackedTokenLines = {
  lines: string[];
  splitIndexes: number[];
};

const renderPackedTokens = (tokens: WrapToken[]): string => {
  let line = '';
  tokens.forEach((token, index) => {
    if (index > 0) {
      line += token.prefix;
    }
    line += token.text;
  });
  return line;
};

const getPackedTokenWeight = (tokens: WrapToken[]): number => {
  let weight = 0;
  tokens.forEach((token, index) => {
    if (index > 0) {
      weight += getTextWeight(token.prefix);
    }
    weight += getTextWeight(token.text);
  });
  return weight;
};

const packTokensWithinLimit = (tokens: WrapToken[], maxCharsPerLine: number): PackedTokenLines => {
  if (tokens.length === 0) {
    return { lines: [''], splitIndexes: [] };
  }

  const lines: string[] = [];
  const splitIndexes: number[] = [];
  let currentTokens: WrapToken[] = [];
  let currentWeight = 0;

  tokens.forEach((token, index) => {
    const prefixWeight = currentTokens.length > 0 ? getTextWeight(token.prefix) : 0;
    const tokenWeight = getTextWeight(token.text);
    if (currentTokens.length > 0 && currentWeight + prefixWeight + tokenWeight > maxCharsPerLine) {
      lines.push(renderPackedTokens(currentTokens));
      splitIndexes.push(index);
      currentTokens = [token];
      currentWeight = tokenWeight;
      return;
    }
    currentTokens.push(token);
    currentWeight += prefixWeight + tokenWeight;
  });

  lines.push(renderPackedTokens(currentTokens));
  return { lines, splitIndexes };
};

// 2行時のみ、上段が長すぎる場合にトークン境界で軽くバランス調整する
const rebalanceTwoLines = (
  tokens: WrapToken[],
  maxCharsPerLine: number,
  initialSplitIndex: number,
  originalLines: string[]
): string[] => {
  if (originalLines.length !== 2) {
    return originalLines;
  }

  const topWeight = getTextWeight(originalLines[0]);
  const bottomWeight = getTextWeight(originalLines[1]);

  let best:
    | {
      top: string;
      bottom: string;
      orphanPenalty: number;
      balanceDiff: number;
      distance: number;
    }
    | null = {
      top: originalLines[0] || '',
      bottom: originalLines[1] || '',
      orphanPenalty: countVisibleCharacters(originalLines[1]) === 1 ? 1 : 0,
      balanceDiff: Math.abs(topWeight - bottomWeight),
      distance: Number.POSITIVE_INFINITY,
    };

  for (let splitIndex = 1; splitIndex < tokens.length; splitIndex++) {
    const topTokens = tokens.slice(0, splitIndex);
    const bottomTokens = tokens.slice(splitIndex);
    const top = renderPackedTokens(topTokens);
    const bottom = renderPackedTokens(bottomTokens);
    if (!top || !bottom) {
      continue;
    }

    const candidateTopWeight = getPackedTokenWeight(topTokens);
    const candidateBottomWeight = getPackedTokenWeight(bottomTokens);
    if (candidateTopWeight > maxCharsPerLine || candidateBottomWeight > maxCharsPerLine) {
      continue;
    }

    const distance = Math.abs(splitIndex - initialSplitIndex);
    const balanceDiff = Math.abs(candidateBottomWeight - candidateTopWeight);
    const orphanPenalty = countVisibleCharacters(bottom) === 1 ? 1 : 0;

    if (
      !best
      || orphanPenalty < best.orphanPenalty
      || (orphanPenalty === best.orphanPenalty && balanceDiff < best.balanceDiff)
      || (
        orphanPenalty === best.orphanPenalty
        && balanceDiff === best.balanceDiff
        && distance < best.distance
      )
    ) {
      best = {
        top,
        bottom,
        orphanPenalty,
        balanceDiff,
        distance,
      };
    }
  }

  if (!best) {
    return originalLines;
  }
  return [best.top, best.bottom];
};

// 非日本語は空白境界を優先し、長単語だけ文字単位へ落とす
const tokenizeNonJapaneseText = (rawLine: string, maxCharsPerLine: number): WrapToken[] => {
  const normalized = rawLine.trim();
  if (!normalized) {
    return [];
  }

  const chunks = normalized.match(/\s+|\S+/g) || [];
  const tokens: WrapToken[] = [];
  let pendingPrefix = '';

  for (const chunk of chunks) {
    if (/^\s+$/.test(chunk)) {
      pendingPrefix += chunk;
      continue;
    }

    const parts = getTextWeight(chunk) <= maxCharsPerLine
      ? [chunk]
      : splitTokenByWeight(chunk, maxCharsPerLine);

    parts.forEach((part, index) => {
      tokens.push({
        text: part,
        prefix: index === 0 ? pendingPrefix : ''
      });
    });
    pendingPrefix = '';
  }

  return tokens;
};

export function breakLineJapanese(rawLine: string, maxCharsPerLine?: number): string[] {
  return breakLineFallback(rawLine, maxCharsPerLine);
}

export function breakLineByWords(rawLine: string, maxCharsPerLine?: number): string[] {
  if (!maxCharsPerLine || maxCharsPerLine <= 0) {
    return [rawLine];
  }
  if (rawLine.length === 0) {
    return [''];
  }

  const tokens = tokenizeNonJapaneseText(rawLine, maxCharsPerLine);
  if (tokens.length === 0) {
    return [''];
  }

  const packed = packTokensWithinLimit(tokens, maxCharsPerLine);
  if (packed.lines.length !== 2) {
    return packed.lines;
  }

  const initialSplitIndex = packed.splitIndexes[0] ?? 1;
  return rebalanceTwoLines(tokens, maxCharsPerLine, initialSplitIndex, packed.lines);
}

function breakSingleLine(rawLine: string, maxCharsPerLine?: number): string[] {
  if (isJapaneseText(rawLine)) {
    return breakLineJapanese(rawLine, maxCharsPerLine);
  }
  return breakLineByWords(rawLine, maxCharsPerLine);
}

function chooseBetterWrappedLines(original: string[], candidate: string[]): string[] {
  if (candidate.length < original.length) {
    return candidate;
  }

  const originalOrphan = countVisibleCharacters(original[original.length - 1] || '') === 1 ? 1 : 0;
  const candidateOrphan = countVisibleCharacters(candidate[candidate.length - 1] || '') === 1 ? 1 : 0;
  if (candidate.length === original.length && candidateOrphan < originalOrphan) {
    return candidate;
  }

  return original;
}

function optimizeTrailingPeriodWrap(rawLine: string, maxCharsPerLine: number, wrappedLines: string[]): string[] {
  const strippedLine = rawLine.replace(/。(?=\s*$)/u, '');
  if (strippedLine === rawLine) {
    return wrappedLines;
  }

  const strippedWrappedLines = breakSingleLine(strippedLine, maxCharsPerLine);
  return chooseBetterWrappedLines(wrappedLines, strippedWrappedLines);
}

// 明示改行を尊重しつつ、行ごとに言語に応じた折り返しを適用する
export function breakTelopText(text: string, maxCharsPerLine?: number): string[] {
  if (!maxCharsPerLine || maxCharsPerLine <= 0) {
    return text.split('\n');
  }

  const lines: string[] = [];
  const rawLines = text.split('\n');
  for (const rawLine of rawLines) {
    if (rawLine.length === 0) {
      lines.push('');
      continue;
    }
    const wrappedLines = breakSingleLine(rawLine, maxCharsPerLine);
    lines.push(...optimizeTrailingPeriodWrap(rawLine, maxCharsPerLine, wrappedLines));
  }
  return lines;
}
