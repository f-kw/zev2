import {
  mapPresentationSourceIntervalV002,
} from './presentation_base_media_timeline_v002.mjs';
import {
  PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
  codePointWeightV001,
  indexExplicitLinesV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  inspectPresentationOutputDisplayPageV001,
} from './presentation_output_style_resolver_v001.ts';

export const PRESENTATION_OUTPUT_PAGE_LINE_PLANNER_VERSION_V001 =
  'presentation-output-page-line-planner-v001';
export const PRESENTATION_OUTPUT_PLANNER_RESOURCE_DIAGNOSTIC_V001 =
  'OUTPUT_PLANNER_RESOURCE_EXHAUSTED';
export const PRESENTATION_OUTPUT_PLANNER_MAX_PAGES_PER_CAPTION_V001 = 999;

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const FORMATS = Object.freeze(['normal-landscape', 'vertical-short-1080x1920']);

const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);

const compareNumberArrays = (left, right) => {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
};

const comparePageEdges = (left, right) => {
  if (left.startBoundaryOrdinal !== right.startBoundaryOrdinal) {
    return left.startBoundaryOrdinal - right.startBoundaryOrdinal;
  }
  if (left.endBoundaryOrdinal !== right.endBoundaryOrdinal) {
    return left.endBoundaryOrdinal - right.endBoundaryOrdinal;
  }
  if (left.lines.length !== right.lines.length) return left.lines.length - right.lines.length;
  return compareNumberArrays(
    left.lineEndBoundaryOrdinals,
    right.lineEndBoundaryOrdinals,
  );
};

const atomRefKey = ref =>
  `${ref.timelineSegmentId}\u0000${ref.sourceMediaId}\u0000${ref.atomId}`;

export class PresentationOutputPlannerResourceExhaustedV001 extends Error {
  constructor(cause = undefined) {
    super(PRESENTATION_OUTPUT_PLANNER_RESOURCE_DIAGNOSTIC_V001, {cause});
    this.name = 'PresentationOutputPlannerResourceExhaustedV001';
    this.diagnosticCode = PRESENTATION_OUTPUT_PLANNER_RESOURCE_DIAGNOSTIC_V001;
  }
}

const rethrowResourceFailure = error => {
  if (error instanceof PresentationOutputPlannerResourceExhaustedV001) throw error;
  if (error instanceof RangeError) {
    throw new PresentationOutputPlannerResourceExhaustedV001(error);
  }
  throw error;
};

const validAtomRef = value => exactKeys(value, [
  'timelineSegmentId', 'sourceMediaId', 'atomId',
])
  && FORMAL_ID.test(value.timelineSegmentId)
  && FORMAL_ID.test(value.sourceMediaId)
  && typeof value.atomId === 'string'
  && value.atomId.length > 0;

const validResolvedStyle = value => exactKeys(value, [
  'format',
  'screenLayoutId',
  'presetId',
  'visualStateId',
  'maxLogicalWidthPerLine',
  'maxLinesPerDisplayPage',
  'characterWidthRule',
  'cropMode',
  'sceneTransitionMode',
  'audioMode',
])
  && FORMATS.includes(value.format)
  && (value.format === 'normal-landscape'
    ? value.screenLayoutId === null && value.cropMode === 'identity'
    : FORMAL_ID.test(value.screenLayoutId) && value.cropMode === 'bound-decision')
  && FORMAL_ID.test(value.presetId)
  && FORMAL_ID.test(value.visualStateId)
  && positive(value.maxLogicalWidthPerLine)
  && [1, 2].includes(value.maxLinesPerDisplayPage)
  && value.characterWidthRule === PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001
  && value.sceneTransitionMode === 'straight-cut-only'
  && value.audioMode === 'preserve-source-only';

export function validatePresentationOutputPlannerInputV001({
  meaningPackage,
  occurrenceAtoms,
  styleResolution,
  baseMediaTimeline,
} = {}) {
  if (!isObject(meaningPackage)
    || meaningPackage.schemaVersion !== 'zev-meaning-information-package-v001'
    || !dense(meaningPackage.captions)
    || !dense(occurrenceAtoms)
    || !exactKeys(styleResolution, ['resolvedStyle', 'layoutContext'])
    || !validResolvedStyle(styleResolution.resolvedStyle)
    || !isObject(styleResolution.layoutContext)
    || !isObject(baseMediaTimeline)) return false;
  const captionRefs = meaningPackage.captions.flatMap(caption =>
    dense(caption?.atomRefs) ? caption.atomRefs : [null]);
  if (captionRefs.length !== occurrenceAtoms.length) return false;
  for (let index = 0; index < occurrenceAtoms.length; index += 1) {
    const occurrence = occurrenceAtoms[index];
    if (!exactKeys(occurrence, ['atomRef', 'text', 'startMs', 'endMs'])
      || !validAtomRef(occurrence.atomRef)
      || !same(occurrence.atomRef, captionRefs[index])
      || typeof occurrence.text !== 'string'
      || occurrence.text.length === 0
      || /[\r\n]/u.test(occurrence.text)
      || !nonnegative(occurrence.startMs)
      || !positive(occurrence.endMs)
      || occurrence.startMs >= occurrence.endMs) return false;
  }
  let occurrenceOffset = 0;
  for (const [captionIndex, caption] of meaningPackage.captions.entries()) {
    if (!exactKeys(caption, [
      'captionId',
      'ordinal',
      'timelineSegmentId',
      'text',
      'atomRefs',
      'startAnchor',
      'endAnchor',
      'sourceStartMs',
      'sourceEndMs',
    ])
      || caption.captionId !== `caption-${String(captionIndex + 1).padStart(6, '0')}`
      || caption.ordinal !== captionIndex + 1
      || !FORMAL_ID.test(caption.timelineSegmentId)
      || !dense(caption.atomRefs)
      || caption.atomRefs.length < 1
      || !caption.atomRefs.every(ref => validAtomRef(ref)
        && ref.timelineSegmentId === caption.timelineSegmentId)) return false;
    const records = occurrenceAtoms.slice(
      occurrenceOffset,
      occurrenceOffset + caption.atomRefs.length,
    );
    occurrenceOffset += caption.atomRefs.length;
    if (records.map(record => record.text).join('') !== caption.text
      || records[0].startMs !== caption.sourceStartMs
      || records.at(-1).endMs !== caption.sourceEndMs) return false;
  }
  return occurrenceOffset === occurrenceAtoms.length;
}

const weightText = (text, characterWidthRule) => {
  let width = 0;
  for (const character of Array.from(text)) {
    width += codePointWeightV001(character, characterWidthRule);
  }
  return width;
};

const makeLine = (records, start, end, width) => ({
  startBoundaryOrdinal: start,
  endBoundaryOrdinal: end,
  atomRefs: records.slice(start, end).map(record => clone(record.atomRef)),
  text: records.slice(start, end).map(record => record.text).join(''),
  logicalWidth: width,
});

const buildLineCandidates = (records, maximumWidth, characterWidthRule) => {
  const byStart = Array.from({length: records.length}, () => []);
  for (let start = 0; start < records.length; start += 1) {
    let width = 0;
    for (let end = start + 1; end <= records.length; end += 1) {
      width += weightText(records[end - 1].text, characterWidthRule);
      if (width > maximumWidth) break;
      byStart[start].push(makeLine(records, start, end, width));
    }
  }
  return byStart;
};

const physicalEdge = (records, lines) => {
  const first = lines[0];
  const last = lines.at(-1);
  return {
    startBoundaryOrdinal: first.startBoundaryOrdinal,
    endBoundaryOrdinal: last.endBoundaryOrdinal,
    lineEndBoundaryOrdinals: lines.map(line => line.endBoundaryOrdinal),
    lines: lines.map(line => ({
      atomRefs: clone(line.atomRefs),
      text: line.text,
      logicalWidth: line.logicalWidth,
    })),
    sourceInterval: {
      sourceStartMs: records[first.startBoundaryOrdinal].startMs,
      sourceEndMs: records[last.endBoundaryOrdinal - 1].endMs,
    },
  };
};

const finiteDeepNumbers = value => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteDeepNumbers);
  if (isObject(value)) return Object.values(value).every(finiteDeepNumbers);
  return true;
};

const validPhysicalLineRect = value => exactKeys(value, [
  'left', 'top', 'right', 'bottom',
])
  && finiteDeepNumbers(value)
  && value.left < value.right
  && value.top < value.bottom;

const physicalGeometryPasses = ({inspection, canvas, expectedLineCount}) => {
  if (!isObject(inspection)
    || !isObject(canvas)
    || !positive(canvas.width)
    || !positive(canvas.height)
    || !exactKeys(canvas.safeAreaPx, ['top', 'right', 'bottom', 'left'])
    || !Object.values(canvas.safeAreaPx).every(nonnegative)
    || !dense(inspection.items)
    || inspection.items.length !== 1
    || !isObject(inspection.items[0])
    || !dense(inspection.items[0].lineRects)
    || inspection.items[0].lineRects.length !== expectedLineCount
    || !inspection.items[0].lineRects.every(validPhysicalLineRect)) return false;
  const safe = canvas.safeAreaPx;
  const rectangles = inspection.items[0].lineRects;
  for (const rectangle of rectangles) {
    if (rectangle.left < safe.left
      || rectangle.top < safe.top
      || rectangle.right > canvas.width - safe.right
      || rectangle.bottom > canvas.height - safe.bottom) return false;
  }
  for (let leftIndex = 0; leftIndex < rectangles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < rectangles.length; rightIndex += 1) {
      const left = rectangles[leftIndex];
      const right = rectangles[rightIndex];
      const overlapWidth = Math.min(left.right, right.right) - Math.max(left.left, right.left);
      const overlapHeight = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
      if (overlapWidth > 0 && overlapHeight > 0) return false;
    }
  }
  return true;
};

const inspectPhysicalPage = async ({edge, caption, styleResolution}) => {
  const indexed = indexExplicitLinesV001(edge.lines.map(line => line.text));
  if (indexed.status !== 'passed'
    || indexed.sourceText !== edge.lines.map(line => line.text).join('')
    || indexed.indexedLines.length !== edge.lines.length) return false;
  const pageId = `planner-page-${String(caption.ordinal).padStart(6, '0')}-${String(
    edge.startBoundaryOrdinal,
  ).padStart(6, '0')}-${edge.lineEndBoundaryOrdinals
    .map(value => String(value).padStart(6, '0')).join('-')}`;
  const inspection = await inspectPresentationOutputDisplayPageV001({
    layoutContext: styleResolution.layoutContext,
    indexedLines: indexed.indexedLines,
    pageId,
  });
  return isObject(inspection)
    && inspection.status === 'passed'
    && dense(inspection.violations)
    && inspection.violations.length === 0
    && finiteDeepNumbers(inspection)
    && physicalGeometryPasses({
      inspection: inspection.inspection,
      canvas: styleResolution.layoutContext.canvas,
      expectedLineCount: edge.lines.length,
    });
};

const reachableEnd = (edgeList, finalBoundary) => {
  const edgesByStart = new Map();
  for (const edge of edgeList) {
    const bucket = edgesByStart.get(edge.startBoundaryOrdinal) ?? [];
    bucket.push(edge);
    edgesByStart.set(edge.startBoundaryOrdinal, bucket);
  }
  const reachable = new Set([0]);
  for (let boundary = 0; boundary <= finalBoundary; boundary += 1) {
    if (!reachable.has(boundary)) continue;
    for (const edge of edgesByStart.get(boundary) ?? []) {
      reachable.add(edge.endBoundaryOrdinal);
    }
  }
  return reachable.has(finalBoundary);
};

const makeTimelineEdge = (edge, baseMediaTimeline) => {
  const mapping = mapPresentationSourceIntervalV002(
    baseMediaTimeline,
    edge.sourceInterval.sourceStartMs,
    edge.sourceInterval.sourceEndMs,
  );
  if (mapping.status !== 'passed') return null;
  return {
    startBoundaryOrdinal: edge.startBoundaryOrdinal,
    endBoundaryOrdinal: edge.endBoundaryOrdinal,
    lineEndBoundaryOrdinals: [...edge.lineEndBoundaryOrdinals],
    lines: clone(edge.lines),
    sourceInterval: clone(edge.sourceInterval),
    frameMapping: clone(mapping.mapping),
  };
};

const stateKey = state => [
  state.boundaryOrdinal,
  state.pageCount,
  state.oneLinePageCount,
  state.minimumLineLogicalWidth,
  state.maximumLineLogicalWidth,
  state.previousEndFrameExclusive,
].join('\u0000');

const reconstructEdges = state => {
  const edges = [];
  let cursor = state;
  while (cursor?.predecessor !== null) {
    edges.push(cursor.edge);
    cursor = cursor.predecessor;
  }
  edges.reverse();
  return edges;
};

const pathOrdinals = state => {
  const edges = reconstructEdges(state);
  return {
    pageEnds: edges.map(edge => edge.endBoundaryOrdinal),
    lineEnds: edges.flatMap(edge => edge.lineEndBoundaryOrdinals),
  };
};

const compareTiePaths = (left, right) => {
  const leftOrdinals = pathOrdinals(left);
  const rightOrdinals = pathOrdinals(right);
  const pageDifference = compareNumberArrays(leftOrdinals.pageEnds, rightOrdinals.pageEnds);
  return pageDifference !== 0
    ? pageDifference
    : compareNumberArrays(leftOrdinals.lineEnds, rightOrdinals.lineEnds);
};

const compareTerminalStates = (left, right) => {
  if (left.pageCount !== right.pageCount) return left.pageCount - right.pageCount;
  if (left.oneLinePageCount !== right.oneLinePageCount) {
    return left.oneLinePageCount - right.oneLinePageCount;
  }
  if (left.maximumLineLogicalWidth !== right.maximumLineLogicalWidth) {
    return left.maximumLineLogicalWidth - right.maximumLineLogicalWidth;
  }
  const leftRange = left.maximumLineLogicalWidth - left.minimumLineLogicalWidth;
  const rightRange = right.maximumLineLogicalWidth - right.minimumLineLogicalWidth;
  if (leftRange !== rightRange) return leftRange - rightRange;
  return compareTiePaths(left, right);
};

const selectTimelinePath = (edges, finalBoundary) => {
  const edgesByStart = new Map();
  for (const edge of edges) {
    const bucket = edgesByStart.get(edge.startBoundaryOrdinal) ?? [];
    bucket.push(edge);
    edgesByStart.set(edge.startBoundaryOrdinal, bucket);
  }
  for (const bucket of edgesByStart.values()) bucket.sort(comparePageEdges);
  const statesByBoundary = Array.from({length: finalBoundary + 1}, () => new Map());
  const startState = {
    boundaryOrdinal: 0,
    pageCount: 0,
    oneLinePageCount: 0,
    minimumLineLogicalWidth: null,
    maximumLineLogicalWidth: null,
    previousEndFrameExclusive: null,
    predecessor: null,
    edge: null,
  };
  statesByBoundary[0].set(stateKey(startState), startState);
  for (let boundary = 0; boundary < finalBoundary; boundary += 1) {
    for (const state of statesByBoundary[boundary].values()) {
      for (const edge of edgesByStart.get(boundary) ?? []) {
        if (state.pageCount >= PRESENTATION_OUTPUT_PLANNER_MAX_PAGES_PER_CAPTION_V001
          || (state.previousEndFrameExclusive !== null
            && state.previousEndFrameExclusive > edge.frameMapping.startFrame)) continue;
        const widths = edge.lines.map(line => line.logicalWidth);
        const edgeMinimum = Math.min(...widths);
        const edgeMaximum = Math.max(...widths);
        const next = {
          boundaryOrdinal: edge.endBoundaryOrdinal,
          pageCount: state.pageCount + 1,
          oneLinePageCount: state.oneLinePageCount + (edge.lines.length === 1 ? 1 : 0),
          minimumLineLogicalWidth: state.minimumLineLogicalWidth === null
            ? edgeMinimum
            : Math.min(state.minimumLineLogicalWidth, edgeMinimum),
          maximumLineLogicalWidth: state.maximumLineLogicalWidth === null
            ? edgeMaximum
            : Math.max(state.maximumLineLogicalWidth, edgeMaximum),
          previousEndFrameExclusive: edge.frameMapping.endFrameExclusive,
          predecessor: state,
          edge,
        };
        const key = stateKey(next);
        const current = statesByBoundary[next.boundaryOrdinal].get(key);
        if (current === undefined || compareTiePaths(next, current) < 0) {
          statesByBoundary[next.boundaryOrdinal].set(key, next);
        }
      }
    }
  }
  const terminals = [...statesByBoundary[finalBoundary].values()];
  if (terminals.length === 0) return null;
  terminals.sort(compareTerminalStates);
  return terminals[0];
};

const buildCaptionDisplay = (caption, records, selectedEdges) => ({
  displayCaptionId: `display-caption-${String(caption.ordinal).padStart(6, '0')}`,
  semanticCaptionId: caption.captionId,
  ordinal: caption.ordinal,
  pages: selectedEdges.map((edge, pageIndex) => {
    const pageOrdinal = pageIndex + 1;
    const pageId = `display-page-${String(caption.ordinal).padStart(6, '0')}-${String(
      pageOrdinal,
    ).padStart(3, '0')}`;
    let lineStart = edge.startBoundaryOrdinal;
    const lines = edge.lineEndBoundaryOrdinals.map((lineEnd, lineIndex) => {
      const lineOrdinal = lineIndex + 1;
      const line = edge.lines[lineIndex];
      const result = {
        lineId: `display-line-${String(caption.ordinal).padStart(6, '0')}-${String(
          pageOrdinal,
        ).padStart(3, '0')}-${String(lineOrdinal).padStart(2, '0')}`,
        lineOrdinal,
        atomRefs: records.slice(lineStart, lineEnd).map(record => clone(record.atomRef)),
        text: line.text,
        logicalWidth: line.logicalWidth,
      };
      lineStart = lineEnd;
      return result;
    });
    return {
      pageId,
      pageOrdinal,
      atomRefs: records
        .slice(edge.startBoundaryOrdinal, edge.endBoundaryOrdinal)
        .map(record => clone(record.atomRef)),
      text: records
        .slice(edge.startBoundaryOrdinal, edge.endBoundaryOrdinal)
        .map(record => record.text).join(''),
      sourceStartMs: edge.frameMapping.sourceStartMs,
      sourceEndMs: edge.frameMapping.sourceEndMs,
      timelineSegmentId: edge.frameMapping.timelineSegmentId,
      sourceStartFrame30: edge.frameMapping.sourceStartFrame30,
      sourceEndFrame30: edge.frameMapping.sourceEndFrame30,
      startFrame: edge.frameMapping.startFrame,
      endFrameExclusive: edge.frameMapping.endFrameExclusive,
      displayFrameCount: edge.frameMapping.displayFrameCount,
      lines,
    };
  }),
});

export function validatePresentationOutputCaptionDisplaysV001(
  captionDisplays,
  meaningPackage,
  resolvedStyle,
) {
  if (!dense(captionDisplays)
    || !dense(meaningPackage?.captions)
    || captionDisplays.length !== meaningPackage.captions.length
    || !validResolvedStyle(resolvedStyle)) return false;
  let previousPageEnd = null;
  for (const [captionIndex, display] of captionDisplays.entries()) {
    const caption = meaningPackage.captions[captionIndex];
    if (!exactKeys(display, [
      'displayCaptionId', 'semanticCaptionId', 'ordinal', 'pages',
    ])
      || display.displayCaptionId
        !== `display-caption-${String(captionIndex + 1).padStart(6, '0')}`
      || display.semanticCaptionId !== caption.captionId
      || display.ordinal !== captionIndex + 1
      || !dense(display.pages)
      || display.pages.length < 1
      || display.pages.length > PRESENTATION_OUTPUT_PLANNER_MAX_PAGES_PER_CAPTION_V001) {
      return false;
    }
    const captionRefs = [];
    let captionText = '';
    for (const [pageIndex, page] of display.pages.entries()) {
      if (!exactKeys(page, [
        'pageId',
        'pageOrdinal',
        'atomRefs',
        'text',
        'sourceStartMs',
        'sourceEndMs',
        'timelineSegmentId',
        'sourceStartFrame30',
        'sourceEndFrame30',
        'startFrame',
        'endFrameExclusive',
        'displayFrameCount',
        'lines',
      ])
        || page.pageId !== `display-page-${String(captionIndex + 1).padStart(6, '0')}-${String(
          pageIndex + 1,
        ).padStart(3, '0')}`
        || page.pageOrdinal !== pageIndex + 1
        || !dense(page.atomRefs)
        || page.atomRefs.length < 1
        || !page.atomRefs.every(validAtomRef)
        || typeof page.text !== 'string'
        || page.text.length === 0
        || !nonnegative(page.sourceStartMs)
        || !positive(page.sourceEndMs)
        || page.sourceStartMs >= page.sourceEndMs
        || !FORMAL_ID.test(page.timelineSegmentId)
        || !nonnegative(page.sourceStartFrame30)
        || !positive(page.sourceEndFrame30)
        || page.sourceStartFrame30 >= page.sourceEndFrame30
        || !nonnegative(page.startFrame)
        || !positive(page.endFrameExclusive)
        || page.startFrame >= page.endFrameExclusive
        || page.displayFrameCount !== page.endFrameExclusive - page.startFrame
        || (previousPageEnd !== null && previousPageEnd > page.startFrame)
        || !dense(page.lines)
        || page.lines.length < 1
        || page.lines.length > resolvedStyle.maxLinesPerDisplayPage) return false;
      previousPageEnd = page.endFrameExclusive;
      const pageRefs = [];
      let pageText = '';
      for (const [lineIndex, line] of page.lines.entries()) {
        if (!exactKeys(line, [
          'lineId', 'lineOrdinal', 'atomRefs', 'text', 'logicalWidth',
        ])
          || line.lineId
            !== `display-line-${String(captionIndex + 1).padStart(6, '0')}-${String(
              pageIndex + 1,
            ).padStart(3, '0')}-${String(lineIndex + 1).padStart(2, '0')}`
          || line.lineOrdinal !== lineIndex + 1
          || !dense(line.atomRefs)
          || line.atomRefs.length < 1
          || !line.atomRefs.every(validAtomRef)
          || typeof line.text !== 'string'
          || line.text.length === 0
          || !positive(line.logicalWidth)
          || line.logicalWidth !== weightText(
            line.text,
            resolvedStyle.characterWidthRule,
          )
          || line.logicalWidth > resolvedStyle.maxLogicalWidthPerLine) return false;
        pageRefs.push(...line.atomRefs);
        pageText += line.text;
      }
      if (!same(pageRefs, page.atomRefs) || pageText !== page.text) return false;
      captionRefs.push(...page.atomRefs);
      captionText += page.text;
    }
    if (!same(captionRefs, caption.atomRefs) || captionText !== caption.text) return false;
  }
  return true;
}

const buildPredecessorProjection = (caption, terminal) => ({
  semanticCaptionId: caption.captionId,
  states: reconstructEdges(terminal).map((edge, index) => ({
    boundaryOrdinal: edge.endBoundaryOrdinal,
    pageCount: index + 1,
    predecessorBoundaryOrdinal: edge.startBoundaryOrdinal,
    previousEndFrameExclusive: edge.frameMapping.endFrameExclusive,
  })),
});

const rejected = (code, physicalEdges, timelineEdges) => ({
  status: 'rejected',
  code,
  physicalEdges,
  timelineEdges,
});

/**
 * 意味captionのAtomRef境界だけで有限page DAGを作り、物理成立後に時間写像し、
 * page数、2行優先、最大幅、幅range、境界辞書順の固定tupleで一意に選ぶ。
 */
export async function buildPresentationOutputPageLinePlanV001({
  meaningPackage,
  occurrenceAtoms,
  styleResolution,
  baseMediaTimeline,
}) {
  try {
    if (!validatePresentationOutputPlannerInputV001({
      meaningPackage,
      occurrenceAtoms,
      styleResolution,
      baseMediaTimeline,
    })) throw new TypeError('presentation output planner input is invalid');
    const physicalEdges = [];
    const timelineEdges = [];
    const selectedStates = [];
    const selectedByCaption = [];
    let occurrenceOffset = 0;
    for (const caption of meaningPackage.captions) {
      const records = occurrenceAtoms.slice(
        occurrenceOffset,
        occurrenceOffset + caption.atomRefs.length,
      );
      occurrenceOffset += caption.atomRefs.length;
      const lineCandidates = buildLineCandidates(
        records,
        styleResolution.resolvedStyle.maxLogicalWidthPerLine,
        styleResolution.resolvedStyle.characterWidthRule,
      );
      const captionPhysicalEdges = [];
      for (let start = 0; start < records.length; start += 1) {
        for (const firstLine of lineCandidates[start]) {
          const oneLine = physicalEdge(records, [firstLine]);
          if (await inspectPhysicalPage({
            edge: oneLine,
            caption,
            styleResolution,
          })) captionPhysicalEdges.push(oneLine);
          if (styleResolution.resolvedStyle.maxLinesPerDisplayPage === 2) {
            for (const secondLine of lineCandidates[firstLine.endBoundaryOrdinal] ?? []) {
              const twoLine = physicalEdge(records, [firstLine, secondLine]);
              if (await inspectPhysicalPage({
                edge: twoLine,
                caption,
                styleResolution,
              })) captionPhysicalEdges.push(twoLine);
            }
          }
        }
      }
      captionPhysicalEdges.sort(comparePageEdges);
      physicalEdges.push({
        semanticCaptionId: caption.captionId,
        edges: captionPhysicalEdges,
      });
      if (!reachableEnd(captionPhysicalEdges, records.length)) {
        return rejected(
          'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE',
          physicalEdges,
          timelineEdges,
        );
      }
      const captionTimelineEdges = captionPhysicalEdges
        .map(edge => makeTimelineEdge(edge, baseMediaTimeline))
        .filter(edge => edge !== null)
        .sort(comparePageEdges);
      timelineEdges.push({
        semanticCaptionId: caption.captionId,
        edges: captionTimelineEdges,
      });
      const terminal = selectTimelinePath(captionTimelineEdges, records.length);
      if (terminal === null) {
        return rejected(
          'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE',
          physicalEdges,
          timelineEdges,
        );
      }
      const selectedEdges = reconstructEdges(terminal);
      selectedByCaption.push({caption, records, selectedEdges});
      selectedStates.push(buildPredecessorProjection(caption, terminal));
    }
    const flattened = selectedByCaption.flatMap(entry => entry.selectedEdges);
    for (let index = 1; index < flattened.length; index += 1) {
      if (flattened[index - 1].frameMapping.endFrameExclusive
        > flattened[index].frameMapping.startFrame) {
        return rejected(
          'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE',
          physicalEdges,
          timelineEdges,
        );
      }
    }
    const captionDisplays = selectedByCaption.map(({caption, records, selectedEdges}) =>
      buildCaptionDisplay(caption, records, selectedEdges));
    if (!validatePresentationOutputCaptionDisplaysV001(
      captionDisplays,
      meaningPackage,
      styleResolution.resolvedStyle,
    )) {
      throw new TypeError('planner postcondition failed');
    }
    return {
      status: 'planned',
      captionDisplays,
      physicalEdges,
      timelineEdges,
      selectedPredecessors: selectedStates,
    };
  } catch (error) {
    rethrowResourceFailure(error);
  }
}
