export const PRESENTATION_RENDERER_TEXT_LAYOUT_VERSION = 'presentation-renderer-text-layout-v001';
export const PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001 =
  'U+0000..U+00FF=1; other Unicode code point=2';

/**
 * 可視輪郭の実測boundsを、対象領域の中央へ移す整数pixel量へ変換する。
 * 横は各行を個別に揃え、縦は全行unionを一つの文字塊として揃える。
 */
export function resolveVisibleCenterOffsetsV001({
  containerBounds,
  lineBounds,
  coordinateScale = 1,
}) {
  const actualLines = Array.isArray(lineBounds) ? lineBounds : [];
  const values = [
    containerBounds?.left,
    containerBounds?.top,
    containerBounds?.right,
    containerBounds?.bottom,
    coordinateScale,
    ...actualLines.flatMap(
      bounds => [bounds?.left, bounds?.top, bounds?.right, bounds?.bottom],
    ),
  ];
  if (
    actualLines.length === 0
    || values.some(value => !Number.isFinite(value))
    || !(coordinateScale > 0)
    || !(containerBounds.right > containerBounds.left)
    || !(containerBounds.bottom > containerBounds.top)
    || actualLines.some(bounds => (
      !(bounds.right > bounds.left) || !(bounds.bottom > bounds.top)
    ))
  ) throw new TypeError('visible center bounds are invalid');

  const centerX = (containerBounds.left + containerBounds.right) / 2;
  const centerY = (containerBounds.top + containerBounds.bottom) / 2;
  const unionTop = Math.min(...actualLines.map(bounds => bounds.top));
  const unionBottom = Math.max(...actualLines.map(bounds => bounds.bottom));
  const verticalOffset = Math.round(
    (centerY - (unionTop + unionBottom) / 2) / coordinateScale,
  );
  return actualLines.map(bounds => ({
    x: Math.round((centerX - (bounds.left + bounds.right) / 2) / coordinateScale),
    y: verticalOffset,
  }));
}

export const PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES = Object.freeze([
  'TARGET_TEXT_MUTATED',
  'TARGET_TEXT_INDEX_GAP',
  'TARGET_TEXT_INDEX_DUPLICATED',
  'LAYOUT_LINE_COUNT_EXCEEDED',
  'TARGET_DURATION_ZERO_AFTER_FRAME_MAPPING',
]);
const CODE_ORDER = new Map(PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES.map((code, index) => [code, index]));

const isPositiveInteger = (value) => Number.isInteger(value) && Number.isFinite(value) && value > 0;

export const frameBoundaryV001 = (milliseconds) => Math.round(milliseconds * 30 / 1000);

export function transitionAlphaV001(relativeFrame, displayFrameCount) {
  if (
    !Number.isInteger(relativeFrame)
    || !isPositiveInteger(displayFrameCount)
    || relativeFrame < 0
    || relativeFrame >= displayFrameCount
  ) return 0;
  return Math.min(1, (relativeFrame + 1) / 4, (displayFrameCount - relativeFrame) / 4);
}

export const codePointWeightV001 = (character, characterWidthRule = PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001) => {
  if (characterWidthRule !== PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001) {
    throw new TypeError('unsupported renderer character width rule');
  }
  return (/^[\u0000-\u00ff]$/u.test(character) ? 1 : 2);
};

const indexedCharacters = (text) => Array.from(text).map((character, sourceIndex) => ({
  sourceIndex,
  character,
  codePoint: character.codePointAt(0),
  role: character === '\n' || character === '\r' ? 'source-line-break' : 'visible',
}));

const renderedTextFor = (characters) => characters
  .filter((item) => item.role === 'visible')
  .map((item) => item.character)
  .join('');

const makeLine = (lineIndex, characters) => {
  const renderedText = renderedTextFor(characters);
  return {
    lineIndex,
    characters,
    renderedText,
    // Remotion入口へ渡す描画値。元改行はcharacters側で保持し、文字としては描かない。
    text: renderedText,
    codePointIndices: characters
      .filter((item) => item.role === 'visible')
      .map((item) => item.sourceIndex),
  };
};

/** Keep admitted line geometry intact; only partition each line's foreground fill. */
export function buildPresentationColorRunsV001({text, indexedLines, fontColor, presentationColorRange}) {
  if (validateIndexedLinesV001(text, indexedLines).status !== 'passed') {
    throw new TypeError('color runs require intact indexed source text');
  }
  if (presentationColorRange !== undefined) {
    const range = presentationColorRange;
    const source = Array.from(text);
    if (
      !range || typeof range !== 'object' || Array.isArray(range)
      || Object.keys(range).length !== 3
      || Object.keys(range).some(key => !['startCodePoint', 'endCodePointExclusive', 'fontColor'].includes(key))
      || !Number.isInteger(range.startCodePoint) || !Number.isInteger(range.endCodePointExclusive)
      || range.startCodePoint < 0 || range.endCodePointExclusive > source.length
      || range.startCodePoint >= range.endCodePointExclusive
      || typeof range.fontColor !== 'string' || !/^#[0-9a-f]{6}$/iu.test(range.fontColor)
    ) throw new TypeError('presentation color range is invalid');
    const graphemeBoundaries = new Set([0]);
    let codePointOffset = 0;
    for (const {segment} of new Intl.Segmenter('und', {granularity: 'grapheme'}).segment(text)) {
      codePointOffset += Array.from(segment).length;
      graphemeBoundaries.add(codePointOffset);
    }
    if (!graphemeBoundaries.has(range.startCodePoint) || !graphemeBoundaries.has(range.endCodePointExclusive)) {
      throw new TypeError('presentation color range splits a grapheme');
    }
    for (const line of indexedLines) {
      const first = line.characters[0]?.sourceIndex;
      const last = line.characters.at(-1)?.sourceIndex;
      if (first !== undefined && (!graphemeBoundaries.has(first) || !graphemeBoundaries.has(last + 1))) {
        throw new TypeError('indexed display line splits a grapheme');
      }
    }
    if (!indexedLines.some(line => line.characters.some(item => item.role === 'visible'
      && item.sourceIndex >= range.startCodePoint && item.sourceIndex < range.endCodePointExclusive))) {
      throw new TypeError('presentation color range contains no visible characters');
    }
  }
  return indexedLines.map(line => {
    const runs = [];
    for (const item of line.characters) {
      if (item.role !== 'visible') continue;
      const selected = presentationColorRange !== undefined
        && item.sourceIndex >= presentationColorRange.startCodePoint
        && item.sourceIndex < presentationColorRange.endCodePointExclusive;
      const color = selected ? presentationColorRange.fontColor : fontColor;
      const last = runs.at(-1);
      if (last?.fontColor === color) last.text += item.character;
      else runs.push({text: item.character, fontColor: color});
    }
    return runs;
  });
}

/**
 * 非caption本文をcode point境界で折り返す。入力由来の改行もindex付き要素として
 * 保持し、描画用改行と混同しない。
 */
export function layoutUnicodeCodePointsV001(text, layoutPolicy, characterWidthRule) {
  if (typeof text !== 'string') {
    return {
      status: 'failed',
      violations: [{ code: 'TARGET_TEXT_MUTATED', path: '$text', relatedIds: [] }],
      sourceText: null,
      indexedLines: [],
    };
  }
  const policy = layoutPolicy ?? {};
  const maxCharsPerLine = policy.maxCharsPerLine;
  const maxLines = policy.maxLines;
  const singleLine = policy.singleLine === true;
  if (!isPositiveInteger(maxCharsPerLine) || !isPositiveInteger(maxLines)) {
    return {
      status: 'failed',
      violations: [{ code: 'LAYOUT_LINE_COUNT_EXCEEDED', path: '$layoutPolicy', relatedIds: [] }],
      sourceText: text,
      indexedLines: [],
    };
  }

  const items = indexedCharacters(text);
  const lines = [];
  let current = [];
  let currentWeight = 0;
  const flush = () => {
    lines.push(makeLine(lines.length, current));
    current = [];
    currentWeight = 0;
  };
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (item.role === 'source-line-break') {
      current.push(item);
      if (item.character === '\r' && items[itemIndex + 1]?.character === '\n') {
        current.push(items[itemIndex + 1]);
        itemIndex += 1;
      }
      if (!singleLine) flush();
      continue;
    }
    let weight;
    try {
      weight = codePointWeightV001(item.character, characterWidthRule);
    } catch {
      return {
        status: 'failed',
        violations: [{ code: 'TARGET_TEXT_MUTATED', path: '$characterWidthRule', relatedIds: [] }],
        sourceText: text,
        indexedLines: [],
      };
    }
    if (!singleLine && currentWeight + weight > maxCharsPerLine && current.length > 0) flush();
    current.push(item);
    currentWeight += weight;
  }
  if (current.length > 0 || lines.length === 0) flush();

  const violations = [];
  if (lines.length > maxLines || (singleLine && lines.length !== 1)) {
    violations.push({
      code: 'LAYOUT_LINE_COUNT_EXCEEDED',
      path: '$indexedLines',
      relatedIds: [],
      details: { actualLines: lines.length, maxLines },
    });
  }
  const integrity = validateIndexedLinesV001(text, lines);
  violations.push(...integrity.violations);
  return {
    status: violations.length === 0 ? 'passed' : 'failed',
    violations,
    sourceText: text,
    indexedLines: lines,
  };
}

/** cueが明示した行をそのまま保ち、行間へ文字を発明しない。 */
export function indexExplicitLinesV001(lineTexts) {
  if (!Array.isArray(lineTexts) || lineTexts.length === 0 || lineTexts.some((line) => typeof line !== 'string')) {
    return {
      status: 'failed',
      violations: [{ code: 'TARGET_TEXT_MUTATED', path: '$lineTexts', relatedIds: [] }],
      sourceText: null,
      indexedLines: [],
    };
  }
  const sourceText = lineTexts.join('');
  let nextIndex = 0;
  const indexedLines = lineTexts.map((lineText, lineIndex) => {
    const characters = Array.from(lineText).map((character) => {
      const item = {
        sourceIndex: nextIndex,
        character,
        codePoint: character.codePointAt(0),
        role: character === '\n' || character === '\r' ? 'source-line-break' : 'visible',
      };
      nextIndex += 1;
      return item;
    });
    return makeLine(lineIndex, characters);
  });
  const integrity = validateIndexedLinesV001(sourceText, indexedLines);
  return {
    status: integrity.status,
    violations: integrity.violations,
    sourceText,
    indexedLines,
  };
}

export function validateIndexedLinesV001(sourceText, indexedLines) {
  const violations = [];
  const sourceCharacters = typeof sourceText === 'string' ? Array.from(sourceText) : [];
  const items = Array.isArray(indexedLines)
    ? indexedLines.flatMap((line) => Array.isArray(line?.characters) ? line.characters : [])
    : [];
  const seen = new Map();
  for (const [position, item] of items.entries()) {
    if (!Number.isInteger(item?.sourceIndex)) {
      violations.push({ code: 'TARGET_TEXT_INDEX_GAP', path: `$indexedLines[${position}].sourceIndex`, relatedIds: [] });
      continue;
    }
    seen.set(item.sourceIndex, (seen.get(item.sourceIndex) ?? 0) + 1);
    if (
      sourceCharacters[item.sourceIndex] !== item.character
      || item.codePoint !== item.character?.codePointAt(0)
      || item.sourceIndex !== position
      || item.role !== (item.character === '\n' || item.character === '\r' ? 'source-line-break' : 'visible')
    ) {
      violations.push({
        code: 'TARGET_TEXT_MUTATED',
        path: `$indexedLines[${position}].character`,
        relatedIds: [],
        details: { sourceIndex: item.sourceIndex },
      });
    }
  }
  if (Array.isArray(indexedLines)) {
    indexedLines.forEach((line, lineIndex) => {
      const expectedRenderedText = renderedTextFor(Array.isArray(line?.characters) ? line.characters : []);
      const expectedVisibleIndices = (Array.isArray(line?.characters) ? line.characters : [])
        .filter((item) => item.role === 'visible')
        .map((item) => item.sourceIndex);
      if (
        line?.lineIndex !== lineIndex
        || line?.renderedText !== expectedRenderedText
        || line?.text !== expectedRenderedText
        || JSON.stringify(line?.codePointIndices) !== JSON.stringify(expectedVisibleIndices)
      ) {
        violations.push({
          code: 'TARGET_TEXT_MUTATED',
          path: `$indexedLines[${lineIndex}].renderedText`,
          relatedIds: [],
        });
      }
    });
  }
  for (let index = 0; index < sourceCharacters.length; index += 1) {
    const count = seen.get(index) ?? 0;
    if (count === 0) {
      violations.push({ code: 'TARGET_TEXT_INDEX_GAP', path: `$sourceText[${index}]`, relatedIds: [] });
    } else if (count > 1) {
      violations.push({ code: 'TARGET_TEXT_INDEX_DUPLICATED', path: `$sourceText[${index}]`, relatedIds: [] });
    }
  }
  for (const index of [...seen.keys()].sort((a, b) => a - b)) {
    if (index < 0 || index >= sourceCharacters.length) {
      violations.push({ code: 'TARGET_TEXT_MUTATED', path: `$indexedLines[sourceIndex=${index}]`, relatedIds: [] });
    }
  }
  violations.sort((left, right) => {
    const codeDifference = (CODE_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER)
      - (CODE_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
    if (codeDifference !== 0) return codeDifference;
    return left.path.localeCompare(right.path, 'en');
  });
  return { status: violations.length === 0 ? 'passed' : 'failed', violations };
}

export function mapOutputIntervalToFramesV001(outputStartMs, outputEndMs) {
  const startFrame = frameBoundaryV001(outputStartMs);
  const endFrameExclusive = frameBoundaryV001(outputEndMs);
  if (endFrameExclusive <= startFrame) {
    return {
      status: 'failed',
      violations: [{
        code: 'TARGET_DURATION_ZERO_AFTER_FRAME_MAPPING',
        path: '$outputInterval',
        relatedIds: [],
        details: { outputStartMs, outputEndMs, startFrame, endFrameExclusive },
      }],
      frames: null,
    };
  }
  return {
    status: 'passed',
    violations: [],
    frames: { startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame },
  };
}
