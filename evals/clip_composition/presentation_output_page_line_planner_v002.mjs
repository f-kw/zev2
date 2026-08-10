import {performance} from 'node:perf_hooks';

import {
  inspectPresentationAMeaningInformationPackageV002,
  validatePresentationAMeaningInformationPackageV002,
} from './presentation_a_meaning_information_package_v002.mjs';
import {
  canonicalSha256PresentationAJsonV002,
  serializePresentationAFormalJsonV002,
  sha256PresentationABytesV002,
} from './presentation_a_source_sequence_v002.mjs';
import {
  buildPresentationOutputPhysicalPageGraphV001,
  isPresentationOutputPageGraphCompleteV001,
  selectPresentationOutputPagePathV001,
} from './presentation_output_page_line_planner_v001.mjs';
import {
  mapPresentationOutputPiecewiseTimelineV002,
  validatePresentationOutputPiecewiseFrameContactV002,
} from './presentation_output_piecewise_timeline_v002.mjs';
import {
  PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
  codePointWeightV001,
} from './presentation_renderer_text_layout_v001.mjs';

export const PRESENTATION_OUTPUT_PAGE_LINE_PLANNER_VERSION_V002 =
  'presentation-output-page-line-planner-v002';

export const PRESENTATION_OUTPUT_PAGE_LINE_VIOLATION_CODES_V002 = Object.freeze([
  'OUTPUT_V002_PLANNER_INPUT_INVALID',
  'OUTPUT_V002_TEXT_COVERAGE_MISMATCH',
  'OUTPUT_V002_LAYOUT_UNRESOLVED',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const FORMATS = Object.freeze(['normal-landscape', 'vertical-short-1080x1920']);
const RESOURCE_EVENT_SCHEMA_VERSION = 'presentation-output-planner-resource-event-v001';
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);
const validResourceObserver = value => value === undefined || typeof value === 'function';

const emitResourceEvent = (resourceObserver, {
  stage,
  processedAtomCount = null,
  generatedPhysicalEdgeCount = null,
  acceptedPhysicalEdgeCount = null,
  processedTimelineEdgeCount = null,
  mappedTimelineEdgeCount = null,
  rejectedTimelineEdgeCount = null,
  generatedStateCount = null,
  insertedStateCount = null,
  replacedEquivalentStateCount = null,
  prunedDominatedStateCount = null,
  retainedStateCount = null,
  maximumRetainedStateCount = null,
  elapsedMs = null,
}) => {
  if (resourceObserver === undefined) return;
  const numericValues = [
    processedAtomCount,
    generatedPhysicalEdgeCount,
    acceptedPhysicalEdgeCount,
    processedTimelineEdgeCount,
    mappedTimelineEdgeCount,
    rejectedTimelineEdgeCount,
    generatedStateCount,
    insertedStateCount,
    replacedEquivalentStateCount,
    prunedDominatedStateCount,
    retainedStateCount,
    maximumRetainedStateCount,
    elapsedMs,
  ];
  if (!numericValues.every(value => value === null || nonnegative(value))) {
    throw new TypeError('presentation output planner resource event is invalid');
  }
  resourceObserver(Object.freeze({
    schemaVersion: RESOURCE_EVENT_SCHEMA_VERSION,
    stage,
    processedAtomCount,
    generatedPhysicalEdgeCount,
    acceptedPhysicalEdgeCount,
    processedTimelineEdgeCount,
    mappedTimelineEdgeCount,
    rejectedTimelineEdgeCount,
    generatedStateCount,
    insertedStateCount,
    replacedEquivalentStateCount,
    prunedDominatedStateCount,
    retainedStateCount,
    maximumRetainedStateCount,
    elapsedMs,
  }));
};

const createInvocationResourceTracker = resourceObserver => {
  const startedAt = resourceObserver === undefined ? null : performance.now();
  const totals = {
    processedAtomCount: 0,
    generatedPhysicalEdgeCount: 0,
    acceptedPhysicalEdgeCount: 0,
    processedTimelineEdgeCount: 0,
    mappedTimelineEdgeCount: 0,
    rejectedTimelineEdgeCount: 0,
    generatedStateCount: 0,
    insertedStateCount: 0,
    replacedEquivalentStateCount: 0,
    prunedDominatedStateCount: 0,
    maximumRetainedStateCount: 0,
  };
  let atomOffset = 0;
  const beginCaption = () => {
    if (resourceObserver === undefined) return undefined;
    const base = {...totals};
    return event => {
      totals.processedAtomCount = Math.max(
        totals.processedAtomCount,
        atomOffset + event.processedAtomCount,
      );
      if (event.stage === 'physical-graph') {
        totals.generatedPhysicalEdgeCount = base.generatedPhysicalEdgeCount
          + event.generatedPhysicalEdgeCount;
        totals.acceptedPhysicalEdgeCount = base.acceptedPhysicalEdgeCount
          + event.acceptedPhysicalEdgeCount;
        emitResourceEvent(resourceObserver, {
          stage: event.stage,
          processedAtomCount: atomOffset + event.processedAtomCount,
          generatedPhysicalEdgeCount: totals.generatedPhysicalEdgeCount,
          acceptedPhysicalEdgeCount: totals.acceptedPhysicalEdgeCount,
        });
        return;
      }
      if (event.stage === 'timeline-mapping') {
        totals.processedTimelineEdgeCount = base.processedTimelineEdgeCount
          + event.processedTimelineEdgeCount;
        totals.mappedTimelineEdgeCount = base.mappedTimelineEdgeCount
          + event.mappedTimelineEdgeCount;
        totals.rejectedTimelineEdgeCount = base.rejectedTimelineEdgeCount
          + event.rejectedTimelineEdgeCount;
        emitResourceEvent(resourceObserver, {
          stage: event.stage,
          processedAtomCount: atomOffset + event.processedAtomCount,
          processedTimelineEdgeCount: totals.processedTimelineEdgeCount,
          mappedTimelineEdgeCount: totals.mappedTimelineEdgeCount,
          rejectedTimelineEdgeCount: totals.rejectedTimelineEdgeCount,
        });
        return;
      }
      if (event.stage === 'path-selection') {
        totals.generatedStateCount = base.generatedStateCount + event.generatedStateCount;
        totals.insertedStateCount = base.insertedStateCount + event.insertedStateCount;
        totals.replacedEquivalentStateCount = base.replacedEquivalentStateCount
          + event.replacedEquivalentStateCount;
        totals.prunedDominatedStateCount = base.prunedDominatedStateCount
          + event.prunedDominatedStateCount;
        totals.maximumRetainedStateCount = Math.max(
          totals.maximumRetainedStateCount,
          event.maximumRetainedStateCount,
        );
        emitResourceEvent(resourceObserver, {
          stage: event.stage,
          processedAtomCount: atomOffset + event.processedAtomCount,
          generatedStateCount: totals.generatedStateCount,
          insertedStateCount: totals.insertedStateCount,
          replacedEquivalentStateCount: totals.replacedEquivalentStateCount,
          prunedDominatedStateCount: totals.prunedDominatedStateCount,
          retainedStateCount: event.retainedStateCount,
          maximumRetainedStateCount: totals.maximumRetainedStateCount,
        });
      }
    };
  };
  return {
    beginCaption,
    completeCaption(atomCount) {
      atomOffset += atomCount;
    },
    finish(result) {
      if (resourceObserver === undefined) return result;
      emitResourceEvent(resourceObserver, {
        stage: 'planner-completed',
        processedAtomCount: totals.processedAtomCount,
        generatedStateCount: totals.generatedStateCount,
        maximumRetainedStateCount: totals.maximumRetainedStateCount,
        elapsedMs: Math.floor(performance.now() - startedAt),
      });
      return result;
    },
  };
};
const PAGE_LINE_TIMELINE_OBSERVATION = Symbol(
  'presentation-output-page-line-plan-timeline-observation-v002',
);

const observeBaseMediaTimeline = baseMediaTimeline => Object.freeze({
  schemaVersion: baseMediaTimeline.schemaVersion,
  fileSha256: sha256PresentationABytesV002(
    serializePresentationAFormalJsonV002(baseMediaTimeline),
  ),
  canonicalSha256: canonicalSha256PresentationAJsonV002(baseMediaTimeline),
});

/**
 * page/line planを作った実timelineのbyte観測を、正式schemaへ混ぜずに保持する。
 * 正式経路ではplanner自身がこの入口を呼び、render側は非列挙観測だけを読む。
 */
export function bindPresentationOutputPageLinePlanTimelineV002({
  pageLinePlan,
  baseMediaTimeline,
} = {}) {
  if (!isObject(pageLinePlan) || pageLinePlan.status !== 'planned'
    || !isObject(baseMediaTimeline)
    || baseMediaTimeline.schemaVersion !== 'presentation-base-media-timeline-v002') {
    throw new TypeError('planned page/line plan and base-media timeline are required');
  }
  const bound = {...pageLinePlan};
  Object.defineProperty(bound, PAGE_LINE_TIMELINE_OBSERVATION, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: observeBaseMediaTimeline(baseMediaTimeline),
  });
  return bound;
}

export function getPresentationOutputPageLinePlanTimelineObservationV002(pageLinePlan) {
  const observation = isObject(pageLinePlan)
    ? pageLinePlan[PAGE_LINE_TIMELINE_OBSERVATION]
    : null;
  return observation === undefined ? null : clone(observation);
}

export const validatePresentationOutputResolvedStyleV002 = value => exactKeys(value, [
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
    ? value.screenLayoutId === null
      && value.cropMode === 'identity'
      && value.presetId !== 'diagnostic-full-frame-contain-v001'
    : ((FORMAL_ID.test(value.screenLayoutId)
        && value.cropMode === 'bound-decision'
        && value.presetId !== 'diagnostic-full-frame-contain-v001')
      || (value.screenLayoutId === null
        && value.presetId === 'diagnostic-full-frame-contain-v001'
        && value.cropMode === 'diagnostic-contain')))
  && FORMAL_ID.test(value.presetId)
  && FORMAL_ID.test(value.visualStateId)
  && positive(value.maxLogicalWidthPerLine)
  && [1, 2].includes(value.maxLinesPerDisplayPage)
  && value.characterWidthRule === PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001
  && value.sceneTransitionMode === 'straight-cut-only'
  && value.audioMode === 'preserve-source-only';

const validRetainedSpan = value => exactKeys(value, [
  'timelineSegmentId', 'sourceStartMs', 'sourceEndMs',
])
  && FORMAL_ID.test(value.timelineSegmentId)
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const validSourceEnvelope = validRetainedSpan;

const validFrameMapping = value => exactKeys(value, [
  'timelineSegmentId',
  'sourceStartMs',
  'sourceEndMs',
  'sourceStartFrame30',
  'sourceEndFrame30',
  'startFrame',
  'endFrameExclusive',
  'displayFrameCount',
])
  && FORMAL_ID.test(value.timelineSegmentId)
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs
  && nonnegative(value.sourceStartFrame30)
  && positive(value.sourceEndFrame30)
  && value.sourceStartFrame30 < value.sourceEndFrame30
  && nonnegative(value.startFrame)
  && positive(value.endFrameExclusive)
  && value.startFrame < value.endFrameExclusive
  && value.displayFrameCount === value.endFrameExclusive - value.startFrame;

const textWidth = (text, characterWidthRule) => Array.from(text).reduce(
  (width, character) => width + codePointWeightV001(character, characterWidthRule),
  0,
);

const rejected = (code, physicalEdges = [], timelineEdges = []) => ({
  status: 'rejected',
  code,
  physicalEdges,
  timelineEdges,
});

const internalRecord = occurrence => ({
  atomRef: {
    atomOccurrenceId: occurrence.atomOccurrenceId,
    sourceMediaId: occurrence.sourceMediaId,
    sourceAtomId: occurrence.sourceAtomId,
  },
  text: occurrence.text,
  startMs: occurrence.sourceAtomInterval.sourceStartMs,
  endMs: occurrence.sourceAtomInterval.sourceEndMs,
  retainedSpans: clone(occurrence.retainedSpans),
});

const mapPhysicalRange = ({startBoundary, endBoundary, records, baseMediaTimeline}) => {
  const retainedSpans = records
    .slice(startBoundary, endBoundary)
    .flatMap(record => clone(record.retainedSpans));
  return mapPresentationOutputPiecewiseTimelineV002({
    retainedSpans,
    baseMediaTimeline,
  });
};

const materializeMappedPhysicalEdge = (edge, mapped) => {
  if (mapped.status !== 'mapped') return clone(mapped);
  return {
    status: 'mapped',
    edge: {
      startBoundaryOrdinal: edge.startBoundaryOrdinal,
      endBoundaryOrdinal: edge.endBoundaryOrdinal,
      lineEndBoundaryOrdinals: [...edge.lineEndBoundaryOrdinals],
      lines: clone(edge.lines),
      retainedSpans: clone(mapped.retainedSpans),
      sourceSpanEnvelopes: clone(mapped.sourceSpanEnvelopes),
      frameMappings: clone(mapped.frameMappings),
      displayFrameRange: clone(mapped.displayFrameRange),
    },
  };
};

const mapPhysicalEdges = ({
  edges,
  records,
  baseMediaTimeline,
  resourceObserver,
}) => {
  const edgesByStart = new Map();
  for (const edge of edges) {
    const bucket = edgesByStart.get(edge.startBoundaryOrdinal) ?? [];
    bucket.push(edge);
    edgesByStart.set(edge.startBoundaryOrdinal, bucket);
  }
  const rangeMappingCache = new Map();
  const mappedResults = [];
  let processedTimelineEdgeCount = 0;
  let mappedTimelineEdgeCount = 0;
  let rejectedTimelineEdgeCount = 0;
  for (let start = 0; start < records.length; start += 1) {
    for (const edge of edgesByStart.get(start) ?? []) {
      const cacheKey = `${edge.startBoundaryOrdinal}\u0000${edge.endBoundaryOrdinal}`;
      let mappedRange = rangeMappingCache.get(cacheKey);
      if (mappedRange === undefined) {
        mappedRange = mapPhysicalRange({
          startBoundary: edge.startBoundaryOrdinal,
          endBoundary: edge.endBoundaryOrdinal,
          records,
          baseMediaTimeline,
        });
        rangeMappingCache.set(cacheKey, mappedRange);
      }
      const result = materializeMappedPhysicalEdge(edge, mappedRange);
      mappedResults.push(result);
      processedTimelineEdgeCount += 1;
      if (result.status === 'mapped') {
        mappedTimelineEdgeCount += 1;
      } else {
        rejectedTimelineEdgeCount += 1;
      }
    }
    emitResourceEvent(resourceObserver, {
      stage: 'timeline-mapping',
      processedAtomCount: start + 1,
      processedTimelineEdgeCount,
      mappedTimelineEdgeCount,
      rejectedTimelineEdgeCount,
    });
  }
  return mappedResults;
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
      const result = {
        lineId: `display-line-${String(caption.ordinal).padStart(6, '0')}-${String(
          pageOrdinal,
        ).padStart(3, '0')}-${String(lineOrdinal).padStart(2, '0')}`,
        lineOrdinal,
        atomOccurrenceIds: records
          .slice(lineStart, lineEnd)
          .map(record => record.atomRef.atomOccurrenceId),
        text: edge.lines[lineIndex].text,
        logicalWidth: edge.lines[lineIndex].logicalWidth,
      };
      lineStart = lineEnd;
      return result;
    });
    const pageRecords = records.slice(
      edge.startBoundaryOrdinal,
      edge.endBoundaryOrdinal,
    );
    return {
      pageId,
      pageOrdinal,
      atomOccurrenceIds: pageRecords.map(record => record.atomRef.atomOccurrenceId),
      text: pageRecords.map(record => record.text).join(''),
      retainedSpans: clone(edge.retainedSpans),
      sourceSpanEnvelopes: clone(edge.sourceSpanEnvelopes),
      frameMappings: clone(edge.frameMappings),
      startFrame: edge.displayFrameRange.startFrame,
      endFrameExclusive: edge.displayFrameRange.endFrameExclusive,
      displayFrameCount: edge.displayFrameRange.displayFrameCount,
      lines,
    };
  }),
});

const validateLine = ({line, captionOrdinal, pageOrdinal, lineIndex, occurrences, style}) => {
  const expectedId = `display-line-${String(captionOrdinal).padStart(6, '0')}-${String(
    pageOrdinal,
  ).padStart(3, '0')}-${String(lineIndex + 1).padStart(2, '0')}`;
  return exactKeys(line, [
    'lineId', 'lineOrdinal', 'atomOccurrenceIds', 'text', 'logicalWidth',
  ])
    && line.lineId === expectedId
    && line.lineOrdinal === lineIndex + 1
    && dense(line.atomOccurrenceIds)
    && line.atomOccurrenceIds.length > 0
    && same(line.atomOccurrenceIds, occurrences.map(item => item.atomOccurrenceId))
    && line.text === occurrences.map(item => item.text).join('')
    && positive(line.logicalWidth)
    && line.logicalWidth === textWidth(line.text, style.characterWidthRule)
    && line.logicalWidth <= style.maxLogicalWidthPerLine;
};

export function validatePresentationOutputCaptionDisplaysV002(
  captionDisplays,
  meaningPackage,
  resolvedStyle,
) {
  if (!validatePresentationAMeaningInformationPackageV002(meaningPackage)
    || !validatePresentationOutputResolvedStyleV002(resolvedStyle)
    || !dense(captionDisplays)
    || captionDisplays.length !== meaningPackage.captions.length) return false;
  const occurrenceById = new Map(meaningPackage.atomOccurrences.map(item => [
    item.atomOccurrenceId,
    item,
  ]));
  let previousEndFrame = null;
  for (const [captionIndex, display] of captionDisplays.entries()) {
    const caption = meaningPackage.captions[captionIndex];
    if (!exactKeys(display, [
      'displayCaptionId', 'semanticCaptionId', 'ordinal', 'pages',
    ])
      || display.displayCaptionId !== `display-caption-${String(captionIndex + 1).padStart(6, '0')}`
      || display.semanticCaptionId !== caption.captionId
      || display.ordinal !== captionIndex + 1
      || !dense(display.pages)
      || display.pages.length < 1) return false;
    const captionOccurrenceIds = [];
    let captionText = '';
    for (const [pageIndex, page] of display.pages.entries()) {
      if (!exactKeys(page, [
        'pageId', 'pageOrdinal', 'atomOccurrenceIds', 'text', 'retainedSpans',
        'sourceSpanEnvelopes', 'frameMappings', 'startFrame', 'endFrameExclusive',
        'displayFrameCount', 'lines',
      ])
        || page.pageId !== `display-page-${String(captionIndex + 1).padStart(6, '0')}-${String(
          pageIndex + 1,
        ).padStart(3, '0')}`
        || page.pageOrdinal !== pageIndex + 1
        || !dense(page.atomOccurrenceIds)
        || page.atomOccurrenceIds.length < 1
        || !page.atomOccurrenceIds.every(id => occurrenceById.has(id))
        || !dense(page.retainedSpans)
        || page.retainedSpans.length < 1
        || !page.retainedSpans.every(validRetainedSpan)
        || !dense(page.sourceSpanEnvelopes)
        || page.sourceSpanEnvelopes.length < 1
        || !page.sourceSpanEnvelopes.every(validSourceEnvelope)
        || !dense(page.frameMappings)
        || page.frameMappings.length !== page.sourceSpanEnvelopes.length
        || !page.frameMappings.every(validFrameMapping)
        || !nonnegative(page.startFrame)
        || !positive(page.endFrameExclusive)
        || page.startFrame >= page.endFrameExclusive
        || page.displayFrameCount !== page.endFrameExclusive - page.startFrame
        || (previousEndFrame !== null && previousEndFrame > page.startFrame)
        || !dense(page.lines)
        || page.lines.length < 1
        || page.lines.length > resolvedStyle.maxLinesPerDisplayPage) return false;
      const occurrences = page.atomOccurrenceIds.map(id => occurrenceById.get(id));
      if (page.text !== occurrences.map(item => item.text).join('')
        || !same(page.retainedSpans, occurrences.flatMap(item => item.retainedSpans))) return false;
      const contact = validatePresentationOutputPiecewiseFrameContactV002({
        sourceSpanEnvelopes: page.sourceSpanEnvelopes,
        frameMappings: page.frameMappings,
      });
      if (contact.status !== 'passed'
        || !same(contact.displayFrameRange, {
          startFrame: page.startFrame,
          endFrameExclusive: page.endFrameExclusive,
          displayFrameCount: page.displayFrameCount,
        })) return false;
      const lineOccurrenceIds = [];
      let lineOffset = 0;
      for (const [lineIndex, line] of page.lines.entries()) {
        const lineOccurrences = occurrences.slice(
          lineOffset,
          lineOffset + line.atomOccurrenceIds.length,
        );
        if (!validateLine({
          line,
          captionOrdinal: captionIndex + 1,
          pageOrdinal: pageIndex + 1,
          lineIndex,
          occurrences: lineOccurrences,
          style: resolvedStyle,
        })) return false;
        lineOffset += line.atomOccurrenceIds.length;
        lineOccurrenceIds.push(...line.atomOccurrenceIds);
      }
      if (!same(lineOccurrenceIds, page.atomOccurrenceIds)) return false;
      previousEndFrame = page.endFrameExclusive;
      captionOccurrenceIds.push(...page.atomOccurrenceIds);
      captionText += page.text;
    }
    if (!same(captionOccurrenceIds, caption.atomOccurrenceIds)
      || captionText !== caption.text) return false;
  }
  return true;
}

export async function buildPresentationOutputPageLinePlanV002({
  meaningPackage,
  styleResolution,
  baseMediaTimeline,
  resourceObserver,
} = {}) {
  if (!validResourceObserver(resourceObserver)) {
    return rejected('OUTPUT_V002_PLANNER_INPUT_INVALID');
  }
  const resourceTracker = createInvocationResourceTracker(resourceObserver);
  const meaningInspection = inspectPresentationAMeaningInformationPackageV002(meaningPackage);
  if (meaningInspection.status !== 'passed') {
    const meaningCode = meaningInspection.violations?.[0]?.code;
    return resourceTracker.finish(rejected([
      'A_CAPTION_COVERAGE_MISMATCH',
      'A_CAPTION_TEXT_MISMATCH',
    ].includes(meaningCode)
      ? 'OUTPUT_V002_TEXT_COVERAGE_MISMATCH'
      : 'OUTPUT_V002_PLANNER_INPUT_INVALID'));
  }
  if (!exactKeys(styleResolution, ['resolvedStyle', 'layoutContext'])
    || !validatePresentationOutputResolvedStyleV002(styleResolution.resolvedStyle)
    || !isObject(styleResolution.layoutContext)
    || !isObject(baseMediaTimeline)) {
    return resourceTracker.finish(rejected('OUTPUT_V002_PLANNER_INPUT_INVALID'));
  }
  const occurrenceById = new Map(meaningPackage.atomOccurrences.map(item => [
    item.atomOccurrenceId,
    item,
  ]));
  const physicalEdges = [];
  const timelineEdges = [];
  const selectedByCaption = [];
  for (const caption of meaningPackage.captions) {
    const captionResourceObserver = resourceTracker.beginCaption();
    const occurrences = caption.atomOccurrenceIds.map(id => occurrenceById.get(id));
    if (occurrences.some(item => item === undefined)
      || occurrences.map(item => item.text).join('') !== caption.text) {
      return resourceTracker.finish(rejected(
        'OUTPUT_V002_TEXT_COVERAGE_MISMATCH',
        physicalEdges,
        timelineEdges,
      ));
    }
    const records = occurrences.map(internalRecord);
    const captionPhysicalEdges = await buildPresentationOutputPhysicalPageGraphV001({
      caption,
      records,
      styleResolution,
      resolvedStyleValidator: validatePresentationOutputResolvedStyleV002,
      resourceObserver: captionResourceObserver,
    });
    physicalEdges.push({semanticCaptionId: caption.captionId, edges: captionPhysicalEdges});
    if (!isPresentationOutputPageGraphCompleteV001(captionPhysicalEdges, records.length)) {
      return resourceTracker.finish(rejected(
        'OUTPUT_V002_LAYOUT_UNRESOLVED',
        physicalEdges,
        timelineEdges,
      ));
    }
    const mappedResults = mapPhysicalEdges({
      edges: captionPhysicalEdges,
      records,
      baseMediaTimeline,
      resourceObserver: captionResourceObserver,
    });
    const captionTimelineEdges = mappedResults
      .filter(result => result.status === 'mapped')
      .map(result => result.edge);
    timelineEdges.push({semanticCaptionId: caption.captionId, edges: captionTimelineEdges});
    const selected = selectPresentationOutputPagePathV001({
      edges: captionTimelineEdges,
      finalBoundary: records.length,
      frameRangeOf: edge => edge.displayFrameRange,
      resourceObserver: captionResourceObserver,
    });
    if (selected === null) {
      const firstFailure = mappedResults.find(result => result.status === 'rejected');
      return resourceTracker.finish(rejected(
        firstFailure?.code ?? 'OUTPUT_V002_LAYOUT_UNRESOLVED',
        physicalEdges,
        timelineEdges,
      ));
    }
    selectedByCaption.push({caption, records, selectedEdges: selected.selectedEdges});
    resourceTracker.completeCaption(records.length);
  }
  const captionDisplays = selectedByCaption.map(({caption, records, selectedEdges}) =>
    buildCaptionDisplay(caption, records, selectedEdges));
  if (!validatePresentationOutputCaptionDisplaysV002(
    captionDisplays,
    meaningPackage,
    styleResolution.resolvedStyle,
  )) {
    return resourceTracker.finish(rejected(
      'OUTPUT_V002_TEXT_COVERAGE_MISMATCH',
      physicalEdges,
      timelineEdges,
    ));
  }
  return resourceTracker.finish(bindPresentationOutputPageLinePlanTimelineV002({
    baseMediaTimeline,
    pageLinePlan: {
      status: 'planned',
      captionDisplays,
      physicalEdges,
      timelineEdges,
    },
  }));
}
