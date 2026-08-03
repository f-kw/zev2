import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapPresentationSourceIntervalV002,
  sourceEndFrameBoundaryV002,
} from './presentation_base_media_timeline_v002.mjs';

const H = 'a'.repeat(64);
const timeline = ({inputFrameRate = '60/1'} = {}) => ({
  schemaVersion: 'presentation-base-media-timeline-v002',
  timelineId: 'output-timeline-mapping-fixture-v001',
  sourceProvenance: 'fixture-source-provenance',
  sourceRef: 'fixture-source-ref',
  sourceFrameClock: {
    inputFrameRate,
    logicalFrameRate: '30/1',
    extractionRuleId: inputFrameRate === '60/1'
      ? 'source-frame-60fps-global-even-v001'
      : 'source-frame-30fps-identity-v001',
    decodedFrameCount: inputFrameRate === '60/1' ? 480 : 240,
  },
  baseMedia: {
    artifactId: 'output-timeline-base-media-v001',
    path: 'base-media.mp4',
    fileSha256: H,
    frameRate: '30/1',
    expectedFrameCount: 150,
  },
  segments: [
    {
      segmentId: 'segment-0001',
      sourceStartMs: 1001,
      sourceEndMs: 4001,
      sourceStartFrame30: 30,
      sourceEndFrame30: 120,
      outputStartFrame: 0,
      outputEndFrame: 90,
    },
    {
      segmentId: 'segment-0002',
      sourceStartMs: 6001,
      sourceEndMs: 8000,
      sourceStartFrame30: 180,
      sourceEndFrame30: 240,
      outputStartFrame: 90,
      outputEndFrame: 150,
    },
  ],
});

const codes = result => result.violations.map(entry => entry.code);

test('OTM001: source半開区間を正しいoutput frameへ写す', () => {
  const result = mapPresentationSourceIntervalV002(timeline(), 1101, 3901);
  assert.deepEqual(result, {
    status: 'passed',
    violations: [],
    mapping: {
      timelineSegmentId: 'segment-0001',
      sourceStartMs: 1101,
      sourceEndMs: 3901,
      sourceStartFrame30: 33,
      sourceEndFrame30: 117,
      startFrame: 3,
      endFrameExclusive: 87,
      displayFrameCount: 84,
    },
  });
});

test('OTM002: 30fps source終端をidentity frame境界で決める', () => {
  const value = timeline({inputFrameRate: '30/1'});
  assert.equal(sourceEndFrameBoundaryV002(8000, value.sourceFrameClock), 240);
  const result = mapPresentationSourceIntervalV002(value, 7900, 8000);
  assert.equal(result.status, 'passed');
  assert.equal(result.mapping.sourceEndFrame30, 240);
});

test('OTM003: 60fps source終端をglobal-even frame境界で決める', () => {
  const value = timeline({inputFrameRate: '60/1'});
  assert.equal(sourceEndFrameBoundaryV002(8000, value.sourceFrameClock), 240);
  const result = mapPresentationSourceIntervalV002(value, 7900, 8000);
  assert.equal(result.status, 'passed');
  assert.equal(result.mapping.sourceEndFrame30, 240);
});

test('OTM004: 30fpsで0 frameになるsource区間を拒否する', () => {
  const result = mapPresentationSourceIntervalV002(timeline(), 1100, 1101);
  assert.equal(result.status, 'failed');
  assert.ok(codes(result).includes('INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME'));
});

test('OTM005: 複数segmentを跨ぐsource区間を拒否する', () => {
  const result = mapPresentationSourceIntervalV002(timeline(), 3500, 6500);
  assert.equal(result.status, 'failed');
  assert.ok(codes(result).includes('INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED'));
});

test('OTM006: base mediaに含まれないsource区間を拒否する', () => {
  const result = mapPresentationSourceIntervalV002(timeline(), 4500, 5000);
  assert.equal(result.status, 'failed');
  assert.ok(codes(result).includes('INSTRUCTION_SOURCE_INTERVAL_UNMAPPED'));
});

test('OTM007: 非単調segment能力をtimeline不正として拒否する', () => {
  const value = timeline();
  value.segments[1].sourceStartMs = 3001;
  value.segments[1].sourceEndMs = 5000;
  value.segments[1].sourceStartFrame30 = 90;
  value.segments[1].sourceEndFrame30 = 150;
  const result = mapPresentationSourceIntervalV002(value, 4100, 4500);
  assert.equal(result.status, 'failed');
  assert.ok(codes(result).includes('TIMELINE_SEGMENT_SOURCE_OVERLAP'));
});

test('OTM008: source msを変えずderived frameだけを追加する', () => {
  const startMs = 1101;
  const endMs = 3901;
  const result = mapPresentationSourceIntervalV002(timeline(), startMs, endMs);
  assert.equal(result.status, 'passed');
  assert.equal(result.mapping.sourceStartMs, startMs);
  assert.equal(result.mapping.sourceEndMs, endMs);
  assert.deepEqual(
    Object.keys(result.mapping),
    [
      'timelineSegmentId', 'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30',
      'sourceEndFrame30', 'startFrame', 'endFrameExclusive', 'displayFrameCount',
    ],
  );
});
