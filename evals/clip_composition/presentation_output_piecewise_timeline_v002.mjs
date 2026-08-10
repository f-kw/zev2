import {
  mapPresentationSourceIntervalV002,
} from './presentation_base_media_timeline_v002.mjs';

export const PRESENTATION_OUTPUT_PIECEWISE_TIMELINE_VERSION_V002 =
  'presentation-output-piecewise-timeline-v002';

export const PRESENTATION_OUTPUT_PIECEWISE_VIOLATION_CODES_V002 = Object.freeze([
  'OUTPUT_V002_PIECEWISE_INPUT_INVALID',
  'OUTPUT_V002_SPAN_UNMAPPED',
  'OUTPUT_V002_SPAN_AMBIGUOUS',
  'OUTPUT_V002_SPAN_ORDER_INVALID',
  'OUTPUT_V002_FRAME_GAP',
  'OUTPUT_V002_FRAME_OVERLAP',
  'OUTPUT_V002_ZERO_FRAME',
  'OUTPUT_V002_FRAME_MAPPING_INVALID',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const clone = value => structuredClone(value);

const validRetainedSpan = value => exactKeys(value, [
  'timelineSegmentId', 'sourceStartMs', 'sourceEndMs',
])
  && FORMAL_ID.test(value.timelineSegmentId)
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const rejected = (code, retainedSpans = [], sourceSpanEnvelopes = [], frameMappings = []) => ({
  status: 'rejected',
  code,
  retainedSpans: clone(retainedSpans),
  sourceSpanEnvelopes: clone(sourceSpanEnvelopes),
  frameMappings: clone(frameMappings),
});

const buildSourceSpanEnvelopes = retainedSpans => {
  const envelopes = [];
  const closedSegmentIds = new Set();
  for (const span of retainedSpans) {
    const current = envelopes.at(-1);
    if (current !== undefined && span.sourceStartMs < current.sourceEndMs) return null;
    if (current?.timelineSegmentId === span.timelineSegmentId) {
      current.sourceEndMs = span.sourceEndMs;
      continue;
    }
    if (current !== undefined) closedSegmentIds.add(current.timelineSegmentId);
    if (closedSegmentIds.has(span.timelineSegmentId)) return null;
    envelopes.push({
      timelineSegmentId: span.timelineSegmentId,
      sourceStartMs: span.sourceStartMs,
      sourceEndMs: span.sourceEndMs,
    });
  }
  return envelopes;
};

const mappingFailureCode = violations => {
  const codes = dense(violations) ? violations.map(item => item?.code) : [];
  if (codes.includes('INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS')) {
    return 'OUTPUT_V002_SPAN_AMBIGUOUS';
  }
  if (codes.includes('INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME')) {
    return 'OUTPUT_V002_ZERO_FRAME';
  }
  return 'OUTPUT_V002_SPAN_UNMAPPED';
};

const mappingHasExpectedSource = (mapping, envelope) => exactKeys(mapping, [
  'timelineSegmentId',
  'sourceStartMs',
  'sourceEndMs',
  'sourceStartFrame30',
  'sourceEndFrame30',
  'startFrame',
  'endFrameExclusive',
  'displayFrameCount',
])
  && mapping.timelineSegmentId === envelope.timelineSegmentId
  && mapping.sourceStartMs === envelope.sourceStartMs
  && mapping.sourceEndMs === envelope.sourceEndMs
  && nonnegative(mapping.sourceStartFrame30)
  && nonnegative(mapping.sourceEndFrame30)
  && nonnegative(mapping.startFrame)
  && nonnegative(mapping.endFrameExclusive)
  && nonnegative(mapping.displayFrameCount);

const validMapping = (mapping, envelope) => mappingHasExpectedSource(mapping, envelope)
  && mapping.sourceStartFrame30 < mapping.sourceEndFrame30
  && mapping.startFrame < mapping.endFrameExclusive
  && mapping.displayFrameCount === mapping.endFrameExclusive - mapping.startFrame;

export function validatePresentationOutputPiecewiseFrameContactV002({
  sourceSpanEnvelopes,
  frameMappings,
} = {}) {
  if (!dense(sourceSpanEnvelopes)
    || sourceSpanEnvelopes.length < 1
    || !sourceSpanEnvelopes.every(validRetainedSpan)
    || !dense(frameMappings)
    || frameMappings.length !== sourceSpanEnvelopes.length) {
    return {status: 'rejected', code: 'OUTPUT_V002_FRAME_MAPPING_INVALID'};
  }
  for (let index = 0; index < frameMappings.length; index += 1) {
    const mapping = frameMappings[index];
    const envelope = sourceSpanEnvelopes[index];
    if (!mappingHasExpectedSource(mapping, envelope)) {
      return {status: 'rejected', code: 'OUTPUT_V002_FRAME_MAPPING_INVALID'};
    }
    if (mapping.sourceStartFrame30 >= mapping.sourceEndFrame30
      || mapping.startFrame >= mapping.endFrameExclusive
      || mapping.displayFrameCount === 0) {
      return {status: 'rejected', code: 'OUTPUT_V002_ZERO_FRAME'};
    }
    if (mapping.displayFrameCount !== mapping.endFrameExclusive - mapping.startFrame) {
      return {status: 'rejected', code: 'OUTPUT_V002_FRAME_MAPPING_INVALID'};
    }
  }
  for (let index = 1; index < frameMappings.length; index += 1) {
    const previous = frameMappings[index - 1];
    const current = frameMappings[index];
    if (previous.endFrameExclusive < current.startFrame) {
      return {status: 'rejected', code: 'OUTPUT_V002_FRAME_GAP'};
    }
    if (previous.endFrameExclusive > current.startFrame) {
      return {status: 'rejected', code: 'OUTPUT_V002_FRAME_OVERLAP'};
    }
  }
  const startFrame = frameMappings[0].startFrame;
  const endFrameExclusive = frameMappings.at(-1).endFrameExclusive;
  if (startFrame >= endFrameExclusive) {
    return {status: 'rejected', code: 'OUTPUT_V002_ZERO_FRAME'};
  }
  const displayFrameCount = endFrameExclusive - startFrame;
  const mappedFrameCount = frameMappings.reduce(
    (total, mapping) => total + mapping.displayFrameCount,
    0,
  );
  if (displayFrameCount !== mappedFrameCount) {
    return {status: 'rejected', code: 'OUTPUT_V002_FRAME_MAPPING_INVALID'};
  }
  return {
    status: 'passed',
    displayFrameRange: {startFrame, endFrameExclusive, displayFrameCount},
  };
}

/**
 * 採用された元時刻片をsegment別包絡へ畳み、既存の単一区間mapperで個別に写す。
 * 切断で隣接したsegmentの出力frameはexact接触しなければならない。
 */
export function mapPresentationOutputPiecewiseTimelineV002({
  retainedSpans,
  baseMediaTimeline,
} = {}) {
  if (!dense(retainedSpans)
    || retainedSpans.length < 1
    || !retainedSpans.every(validRetainedSpan)
    || !isObject(baseMediaTimeline)) {
    return rejected('OUTPUT_V002_PIECEWISE_INPUT_INVALID');
  }

  const sourceSpanEnvelopes = buildSourceSpanEnvelopes(retainedSpans);
  if (sourceSpanEnvelopes === null) {
    return rejected('OUTPUT_V002_SPAN_ORDER_INVALID', retainedSpans);
  }

  const frameMappings = [];
  for (const envelope of sourceSpanEnvelopes) {
    const result = mapPresentationSourceIntervalV002(
      baseMediaTimeline,
      envelope.sourceStartMs,
      envelope.sourceEndMs,
    );
    if (result?.status !== 'passed') {
      return rejected(
        mappingFailureCode(result?.violations),
        retainedSpans,
        sourceSpanEnvelopes,
        frameMappings,
      );
    }
    if (!validMapping(result.mapping, envelope)) {
      return rejected(
        'OUTPUT_V002_FRAME_MAPPING_INVALID',
        retainedSpans,
        sourceSpanEnvelopes,
        frameMappings,
      );
    }
    frameMappings.push(clone(result.mapping));
  }

  const contact = validatePresentationOutputPiecewiseFrameContactV002({
    sourceSpanEnvelopes,
    frameMappings,
  });
  if (contact.status !== 'passed') {
    return rejected(
      contact.code,
      retainedSpans,
      sourceSpanEnvelopes,
      frameMappings,
    );
  }

  return {
    status: 'mapped',
    retainedSpans: clone(retainedSpans),
    sourceSpanEnvelopes,
    frameMappings,
    displayFrameRange: contact.displayFrameRange,
  };
}
