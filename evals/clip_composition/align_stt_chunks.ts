import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type WordTimestamp = {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
  segmentId?: number;
};

type WordTimestampFile = {
  kind?: string;
  sourceUri?: string;
  generatedAt?: string;
  wordCount?: number;
  words?: WordTimestamp[];
};

type CliOptions = {
  clipId: string;
  sourceIds: string[];
  chunkMs: number;
  top: number;
  outputId: string;
};

type NormalizedWord = WordTimestamp & {
  normalizedText: string;
};

type TextChar = {
  char: string;
  startMs: number;
  endMs: number;
  wordIndex: number;
};

type ClipChunk = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  normalizedText: string;
  wordCount: number;
};

type MatchCandidate = {
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
  const values = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }

    const inlineValueIndex = item.indexOf('=');
    if (inlineValueIndex >= 0) {
      pushValue(values, item.slice(2, inlineValueIndex), item.slice(inlineValueIndex + 1));
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      pushValue(values, key, 'true');
      continue;
    }

    pushValue(values, key, next);
    index += 1;
  }

  const clipId = first(values, 'clipId')?.trim();
  if (!clipId) {
    throw new Error('--clipId を指定してください');
  }

  const sourceIds = values.get('sourceId')?.map((value) => value.trim()).filter(Boolean) ?? [];
  if (sourceIds.length === 0) {
    throw new Error('--sourceId を1つ以上指定してください');
  }

  const chunkSec = Number.parseInt(first(values, 'chunkSec') ?? '30', 10);
  if (!Number.isFinite(chunkSec) || chunkSec <= 0) {
    throw new Error('--chunkSec は1以上の整数で指定してください');
  }

  const top = Number.parseInt(first(values, 'top') ?? '10', 10);
  if (!Number.isFinite(top) || top <= 0) {
    throw new Error('--top は1以上の整数で指定してください');
  }

  return {
    clipId: sanitizePathPart(clipId),
    sourceIds: sourceIds.map(sanitizePathPart),
    chunkMs: chunkSec * 1000,
    top,
    outputId: sanitizePathPart(first(values, 'outputId')?.trim() || `${clipId}-${timestampForFile()}`)
  };
}

function pushValue(values: Map<string, string[]>, key: string, value: string): void {
  const current = values.get(key) ?? [];
  current.push(value);
  values.set(key, current);
}

function first(values: Map<string, string[]>, key: string): string | undefined {
  return values.get(key)?.[0];
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

async function loadWords(itemId: string, role: 'clip' | 'source'): Promise<{ sourceUri: string; words: NormalizedWord[] }> {
  const filePath = sttPath(itemId, role);
  if (!existsSync(filePath)) {
    throw new Error(`STT単語時刻ファイルが見つかりません: ${filePath}`);
  }

  const payload = await readJson<WordTimestampFile>(filePath);
  const words = (payload.words ?? [])
    .filter((word) => (
      typeof word.text === 'string' &&
      typeof word.startMs === 'number' &&
      typeof word.endMs === 'number' &&
      word.endMs >= word.startMs
    ))
    .sort((left, right) => left.startMs - right.startMs)
    .map((word) => ({
      ...word,
      normalizedText: normalizeForMatch(word.text)
    }));

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

function buildClipChunks(words: NormalizedWord[], chunkMs: number): ClipChunk[] {
  if (words.length === 0) {
    return [];
  }

  const firstStartMs = words[0]?.startMs ?? 0;
  const lastEndMs = words.at(-1)?.endMs ?? firstStartMs;
  const chunks: ClipChunk[] = [];
  for (let startMs = firstStartMs, index = 0; startMs < lastEndMs; startMs += chunkMs, index += 1) {
    const endMs = startMs + chunkMs;
    const chunkWords = words.filter((word) => word.endMs > startMs && word.startMs < endMs);
    if (chunkWords.length === 0) {
      continue;
    }

    chunks.push({
      index,
      startMs,
      endMs: Math.min(endMs, lastEndMs),
      text: joinWordText(chunkWords),
      normalizedText: chunkWords.map((word) => word.normalizedText).join(''),
      wordCount: chunkWords.length
    });
  }

  return chunks;
}

function joinWordText(words: Array<Pick<WordTimestamp, 'text'>>): string {
  return words.map((word) => word.text).join('');
}

function buildTextChars(words: NormalizedWord[]): TextChar[] {
  const chars: TextChar[] = [];
  for (const [wordIndex, word] of words.entries()) {
    for (const char of word.normalizedText) {
      chars.push({
        char,
        startMs: word.startMs,
        endMs: word.endMs,
        wordIndex
      });
    }
  }
  return chars;
}

function sourceTextForRange(words: NormalizedWord[], chars: TextChar[], startChar: number, endExclusive: number): string {
  const range = chars.slice(startChar, endExclusive);
  const wordIndexes = Array.from(new Set(range.map((item) => item.wordIndex))).sort((left, right) => left - right);
  return wordIndexes.map((wordIndex) => words[wordIndex]?.text ?? '').join('');
}

function findMatches(input: {
  chunk: ClipChunk;
  sourceId: string;
  sourceWords: NormalizedWord[];
  top: number;
}): MatchCandidate[] {
  const sourceChars = buildTextChars(input.sourceWords);
  const sourceText = sourceChars.map((item) => item.char).join('');
  const query = input.chunk.normalizedText;
  if (!query || sourceChars.length === 0) {
    return [];
  }

  const candidates: MatchCandidate[] = [];
  for (let startChar = 0; startChar < sourceChars.length; startChar += 1) {
    const endExclusive = Math.min(sourceChars.length, startChar + query.length);
    if (endExclusive <= startChar) {
      continue;
    }

    const normalizedSourceText = sourceText.slice(startChar, endExclusive);
    const matchedChars = lcsLength(query, normalizedSourceText);
    const sourceCharCount = normalizedSourceText.length;
    const firstChar = sourceChars[startChar];
    const lastChar = sourceChars[endExclusive - 1];
    if (!firstChar || !lastChar || sourceCharCount === 0) {
      continue;
    }

    candidates.push({
      sourceId: input.sourceId,
      sourceStartMs: firstChar.startMs,
      sourceEndMs: lastChar.endMs,
      matchedChars,
      queryChars: query.length,
      sourceChars: sourceCharCount,
      clipCoverage: matchedChars / query.length,
      sourceCoverage: matchedChars / sourceCharCount,
      exact: query === normalizedSourceText,
      sourceText: sourceTextForRange(input.sourceWords, sourceChars, startChar, endExclusive),
      normalizedSourceText
    });
  }

  return candidates
    .sort(compareCandidates)
    .slice(0, input.top);
}

function compareCandidates(left: MatchCandidate, right: MatchCandidate): number {
  return (
    Number(right.exact) - Number(left.exact) ||
    right.clipCoverage - left.clipCoverage ||
    right.sourceCoverage - left.sourceCoverage ||
    right.matchedChars - left.matchedChars ||
    left.sourceStartMs - right.sourceStartMs ||
    left.sourceEndMs - right.sourceEndMs
  );
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

function formatMs(ms: number): string {
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
  options: CliOptions;
  resultPath: string;
  chunks: ClipChunk[];
  chunkResults: Array<{
    chunk: ClipChunk;
    bestMatches: MatchCandidate[];
    sourceMatches: Array<{ sourceId: string; matches: MatchCandidate[] }>;
  }>;
}): string {
  const lines: string[] = [
    '# STTチャンク照合レポート',
    '',
    `- 切り抜きSTT: ${input.options.clipId}`,
    `- 参照元STT: ${input.options.sourceIds.join(', ')}`,
    `- チャンク長: ${input.options.chunkMs / 1000}秒`,
    `- 結果JSON: ${path.relative(evalRoot, input.resultPath)}`,
    '',
    '## 正規化',
    '',
    '- 全角半角を統一',
    '- カタカナをひらがなへ統一',
    '- 数字はUnicode正規化後の半角数字へ統一',
    '- 記号、空白、長音記号を照合対象から除外',
    '- 漢字の読み変換は未実装',
    '',
    '## 注意',
    '',
    '- この結果はexpectedCutsとして固定しない',
    '- 元動画の該当秒数を目視確認してから正解データにする',
    '- 切り抜き側のBGM、SE、追加ナレーション由来の不一致は正常に起こる',
    '',
    '## 候補',
    ''
  ];

  if (input.chunks.length === 0) {
    lines.push('切り抜き側STTから照合対象チャンクを作れませんでした。');
    return `${lines.join('\n')}\n`;
  }

  for (const item of input.chunkResults) {
    lines.push(`### チャンク ${item.chunk.index + 1}`);
    lines.push('');
    lines.push(`- 切り抜き範囲: ${formatMs(item.chunk.startMs)} - ${formatMs(item.chunk.endMs)}`);
    lines.push(`- 切り抜き文字起こし: ${item.chunk.text}`);
    lines.push(`- 正規化後: ${item.chunk.normalizedText || '(empty)'}`);
    lines.push('');

    if (item.bestMatches.length === 0) {
      lines.push('候補なし');
      lines.push('');
      continue;
    }

    lines.push('#### 全体上位');
    lines.push('');
    for (const [index, match] of item.bestMatches.entries()) {
      appendMatch(lines, `${index + 1}.`, match);
    }
    lines.push('');
    lines.push('#### 参照元別の最上位');
    lines.push('');
    for (const source of item.sourceMatches) {
      const match = source.matches[0];
      if (!match) {
        lines.push(`- ${source.sourceId}: 候補なし`);
        continue;
      }
      appendMatch(lines, `- ${source.sourceId}:`, match);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function appendMatch(lines: string[], prefix: string, match: MatchCandidate): void {
  lines.push(`${prefix} ${match.sourceId} ${formatMs(match.sourceStartMs)} - ${formatMs(match.sourceEndMs)}`);
  lines.push(`   - 一致度: 切り抜き側 ${percent(match.clipCoverage)} / 参照元側 ${percent(match.sourceCoverage)} / 完全一致 ${match.exact ? 'yes' : 'no'}`);
  lines.push(`   - 参照元文字起こし: ${match.sourceText}`);
  lines.push(`   - 正規化後: ${match.normalizedSourceText}`);
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const clip = await loadWords(options.clipId, 'clip');
  const sources = await Promise.all(options.sourceIds.map(async (sourceId) => ({
    id: sourceId,
    ...(await loadWords(sourceId, 'source'))
  })));

  const chunks = buildClipChunks(clip.words, options.chunkMs);
  const chunkResults = chunks.map((chunk) => {
    const sourceMatches = sources.map((source) => ({
      sourceId: source.id,
      matches: findMatches({
        chunk,
        sourceId: source.id,
        sourceWords: source.words,
        top: options.top
      })
    }));
    const bestMatches = sourceMatches
      .flatMap((source) => source.matches)
      .sort(compareCandidates)
      .slice(0, options.top);

    return { chunk, bestMatches, sourceMatches };
  });

  const runAt = new Date().toISOString();
  const result = {
    kind: 'clip_composition_stt_chunk_alignment',
    runAt,
    clip: {
      id: options.clipId,
      sourceUri: clip.sourceUri,
      wordCount: clip.words.length
    },
    sources: sources.map((source) => ({
      id: source.id,
      sourceUri: source.sourceUri,
      wordCount: source.words.length
    })),
    settings: {
      chunkMs: options.chunkMs,
      top: options.top,
      ranking: '完全一致、切り抜き側の一致率、参照元側の一致率、一致文字数、開始時刻の順に並べる',
      normalization: [
        '全角半角統一',
        'カタカナのひらがな化',
        'Unicode正規化による数字表記統一',
        '記号・空白・長音記号の除外',
        '漢字の読み変換は未実装'
      ]
    },
    chunks,
    chunkResults,
    warnings: [
      'この照合結果をexpectedCutsとしてそのまま固定しないでください。',
      '元動画の候補秒数を目視確認してから正解データにしてください。',
      '切り抜き側STTにはBGM、SE、追加音声由来の不一致が混ざる前提です。'
    ]
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const resultPath = path.join(outputDir, `alignment-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `alignment-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport({ options, resultPath, chunks, chunkResults }), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  for (const item of chunkResults) {
    const best = item.bestMatches[0];
    if (!best) {
      console.log(`chunk ${item.chunk.index + 1}: no match`);
      continue;
    }
    console.log(
      `chunk ${item.chunk.index + 1}: ${best.sourceId} ${formatMs(best.sourceStartMs)}-${formatMs(best.sourceEndMs)} ` +
      `clipCoverage=${percent(best.clipCoverage)} sourceCoverage=${percent(best.sourceCoverage)} exact=${best.exact ? 'yes' : 'no'}`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
