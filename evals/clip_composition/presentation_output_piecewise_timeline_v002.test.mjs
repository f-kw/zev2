import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapPresentationOutputPiecewiseTimelineV002,
  validatePresentationOutputPiecewiseFrameContactV002,
} from './presentation_output_piecewise_timeline_v002.mjs';

const H = 'a'.repeat(64);
const timeline = ({segments = null} = {}) => {
  const effectiveSegments = segments ?? [{
    segmentId: 'segment-0001',
    sourceStartMs: 0,
    sourceEndMs: 400,
    sourceStartFrame30: 0,
    sourceEndFrame30: 12,
    outputStartFrame: 0,
    outputEndFrame: 12,
  }, {
    segmentId: 'segment-0002',
    sourceStartMs: 600,
    sourceEndMs: 1000,
    sourceStartFrame30: 18,
    sourceEndFrame30: 30,
    outputStartFrame: 12,
    outputEndFrame: 24,
  }];
  return {
    schemaVersion: 'presentation-base-media-timeline-v002',
    timelineId: 'piecewise-fixture-v002',
    sourceProvenance: 'piecewise-fixture',
    sourceRef: 'youtube:fixture',
    sourceFrameClock: {
      inputFrameRate: '30/1',
      logicalFrameRate: '30/1',
      extractionRuleId: 'source-frame-30fps-identity-v001',
      decodedFrameCount: 30,
    },
    baseMedia: {
      artifactId: 'piecewise-base-v002',
      path: 'base-media.mp4',
      fileSha256: H,
      frameRate: '30/1',
      expectedFrameCount: effectiveSegments.at(-1).outputEndFrame,
    },
    segments: effectiveSegments,
  };
};

const span = (timelineSegmentId, sourceStartMs, sourceEndMs) => ({
  timelineSegmentId, sourceStartMs, sourceEndMs,
});

const mapped = (overrides = {}) => ({
  timelineSegmentId: 'segment-0001',
  sourceStartMs: 100,
  sourceEndMs: 200,
  sourceStartFrame30: 3,
  sourceEndFrame30: 6,
  startFrame: 3,
  endFrameExclusive: 6,
  displayFrameCount: 3,
  ...overrides,
});

test('OPT001: 一つのretained spanを既存mapperでexact写像する', () => {
  const result = mapPresentationOutputPiecewiseTimelineV002({
    retainedSpans: [span('segment-0001', 100, 200)],
    baseMediaTimeline: timeline(),
  });
  assert.equal(result.status, 'mapped');
  assert.deepEqual(result.sourceSpanEnvelopes, [span('segment-0001', 100, 200)]);
  assert.deepEqual(result.displayFrameRange, {
    startFrame: 3, endFrameExclusive: 6, displayFrameCount: 3,
  });
});

test('OPT002: 同一segment内の複数spanは通常の時間差を含む一包絡へ畳む', () => {
  const result = mapPresentationOutputPiecewiseTimelineV002({
    retainedSpans: [
      span('segment-0001', 100, 200),
      span('segment-0001', 300, 400),
    ],
    baseMediaTimeline: timeline(),
  });
  assert.equal(result.status, 'mapped');
  assert.deepEqual(result.sourceSpanEnvelopes, [span('segment-0001', 100, 400)]);
  assert.deepEqual(result.retainedSpans, [
    span('segment-0001', 100, 200),
    span('segment-0001', 300, 400),
  ]);
});

test('OPT003: 切断前後segmentは出力frameでexact接触し切断時間を写さない', () => {
  const result = mapPresentationOutputPiecewiseTimelineV002({
    retainedSpans: [
      span('segment-0001', 300, 400),
      span('segment-0002', 600, 700),
    ],
    baseMediaTimeline: timeline(),
  });
  assert.equal(result.status, 'mapped');
  assert.equal(result.frameMappings[0].endFrameExclusive, 12);
  assert.equal(result.frameMappings[1].startFrame, 12);
  assert.deepEqual(result.displayFrameRange, {
    startFrame: 9, endFrameExclusive: 15, displayFrameCount: 6,
  });
  assert.equal(result.frameMappings.reduce((sum, item) => sum + item.displayFrameCount, 0), 6);
});

test('OPT004: 元時刻またはsegment再出現の逆順を拒否する', () => {
  const result = mapPresentationOutputPiecewiseTimelineV002({
    retainedSpans: [
      span('segment-0002', 600, 700),
      span('segment-0001', 300, 400),
    ],
    baseMediaTimeline: timeline(),
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'OUTPUT_V002_SPAN_ORDER_INVALID');
});

test('OPT005: 一つのspanが複数segmentに入る曖昧写像を拒否する', () => {
  const overlapping = timeline({segments: [{
    segmentId: 'segment-0001',
    sourceStartMs: 0, sourceEndMs: 600,
    sourceStartFrame30: 0, sourceEndFrame30: 18,
    outputStartFrame: 0, outputEndFrame: 18,
  }, {
    segmentId: 'segment-0002',
    sourceStartMs: 400, sourceEndMs: 800,
    sourceStartFrame30: 12, sourceEndFrame30: 24,
    outputStartFrame: 18, outputEndFrame: 30,
  }]});
  const result = mapPresentationOutputPiecewiseTimelineV002({
    retainedSpans: [span('segment-0001', 450, 500)],
    baseMediaTimeline: overlapping,
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'OUTPUT_V002_SPAN_AMBIGUOUS');
});

test('OPT006: timelineに含まれないspanを未写像として拒否する', () => {
  const result = mapPresentationOutputPiecewiseTimelineV002({
    retainedSpans: [span('segment-0001', 450, 500)],
    baseMediaTimeline: timeline(),
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'OUTPUT_V002_SPAN_UNMAPPED');
});

test('OPT007: frame gapを専用codeで拒否する', () => {
  const envelopes = [
    span('segment-0001', 100, 200),
    span('segment-0002', 600, 700),
  ];
  const result = validatePresentationOutputPiecewiseFrameContactV002({
    sourceSpanEnvelopes: envelopes,
    frameMappings: [
      mapped(),
      mapped({
        timelineSegmentId: 'segment-0002', sourceStartMs: 600, sourceEndMs: 700,
        sourceStartFrame30: 18, sourceEndFrame30: 21,
        startFrame: 7, endFrameExclusive: 10, displayFrameCount: 3,
      }),
    ],
  });
  assert.deepEqual(result, {status: 'rejected', code: 'OUTPUT_V002_FRAME_GAP'});
});

test('OPT008: frame overlapを専用codeで拒否する', () => {
  const envelopes = [
    span('segment-0001', 100, 200),
    span('segment-0002', 600, 700),
  ];
  const result = validatePresentationOutputPiecewiseFrameContactV002({
    sourceSpanEnvelopes: envelopes,
    frameMappings: [
      mapped(),
      mapped({
        timelineSegmentId: 'segment-0002', sourceStartMs: 600, sourceEndMs: 700,
        sourceStartFrame30: 18, sourceEndFrame30: 21,
        startFrame: 5, endFrameExclusive: 8, displayFrameCount: 3,
      }),
    ],
  });
  assert.deepEqual(result, {status: 'rejected', code: 'OUTPUT_V002_FRAME_OVERLAP'});
});

test('OPT009: 0-frame写像を専用codeで拒否する', () => {
  const result = validatePresentationOutputPiecewiseFrameContactV002({
    sourceSpanEnvelopes: [span('segment-0001', 100, 101)],
    frameMappings: [mapped({
      sourceEndMs: 101,
      sourceEndFrame30: 3,
      endFrameExclusive: 3,
      displayFrameCount: 0,
    })],
  });
  assert.deepEqual(result, {status: 'rejected', code: 'OUTPUT_V002_ZERO_FRAME'});
});

test('OPT010: source包絡と一致しないframe来歴を拒否する', () => {
  const result = validatePresentationOutputPiecewiseFrameContactV002({
    sourceSpanEnvelopes: [span('segment-0001', 100, 200)],
    frameMappings: [mapped({sourceStartMs: 99})],
  });
  assert.deepEqual(result, {
    status: 'rejected', code: 'OUTPUT_V002_FRAME_MAPPING_INVALID',
  });
  const invalidInput = mapPresentationOutputPiecewiseTimelineV002({
    retainedSpans: [],
    baseMediaTimeline: timeline(),
  });
  assert.equal(invalidInput.status, 'rejected');
  assert.equal(invalidInput.code, 'OUTPUT_V002_PIECEWISE_INPUT_INVALID');
});
