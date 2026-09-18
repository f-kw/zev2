import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  createConnectionExpressionContextV001,
  createConnectionExpressionOriginalV001,
  createConnectionExpressionOverridesV001,
  setConnectionExpressionOverrideV001,
  resetConnectionExpressionOverrideV001,
  resolveConnectionExpressionV001,
  buildConnectionExpressionTimelineFiltersV001,
} from './connection_expression_v001.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const choice = (number, preset) => ({connectionId: 'connection-' + String(number).padStart(2, '0'),
  preset, presetVersion: 'v001'});
const canonical = value => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
  return value;
}
function reseal(record, change) {
  const altered = copy(record);
  change(altered);
  const {recordSha256: ignored, ...body} = altered;
  altered.recordSha256 = createHash('sha256').update(canonical(body)).digest('hex');
  return altered;
}
function fixture(lengths = [24, 24, 24, 24], changePlan = () => {}) {
  let end = 0;
  const segments = lengths.map((length, index) => {
    const start = end; end += length;
    return {segmentId: 'segment-' + (index + 1), outputStartFrame: start, outputEndFrame: end,
      sourceStartFrame30: 1000 * index, sourceEndFrame30: 1000 * index + length};
  });
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30, safeAreaPx: {top: 40, right: 80, bottom: 40, left: 80}},
    elements: segments.map((segment, index) => ({
      instructionId: 'caption-' + (index + 1), kind: 'speech-caption', text: '字幕' + (index + 1),
      startFrame: segment.outputStartFrame, endFrameExclusive: segment.outputEndFrame,
      displayFrameCount: segment.outputEndFrame - segment.outputStartFrame,
      indexedLines: [{text: '字幕' + (index + 1)}], targetProvenance: {source: 'synthetic-fixture'},
    }))};
  changePlan(plan);
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003',
    baseMedia: {frameRate: '30/1', expectedFrameCount: end}, segments};
  const digestRef = {version: 'synthetic-digest-v001', sha256: 'a'.repeat(64)};
  const planBytes = Buffer.from(JSON.stringify(plan) + '\n');
  const timelineBytes = Buffer.from(JSON.stringify(timeline) + '\n');
  const context = createConnectionExpressionContextV001({digestRef, planBytes, timelineBytes});
  return {context, digestRef, plan, timeline, planBytes, timelineBytes};
}
const originalFor = (f, selections = []) => createConnectionExpressionOriginalV001({context: f.context, selections});
const resolve = (f, original, overrides) => resolveConnectionExpressionV001({
  context: f.context, original, ...(overrides === undefined ? {} : {overrides}),
});
const edit = (f, original, overrides, selection) => setConnectionExpressionOverrideV001({
  context: f.context, original, overrides, ...selection,
});
const dimensions = canvas => ({width: canvas.width, height: canvas.height, fps: canvas.fps});
const filtersFor = resolved => buildConnectionExpressionTimelineFiltersV001({
  presentationTimeline: resolved.presentationTimeline, canvas: dimensions(resolved.plan.canvas),
  audio: {sampleRate: 48000, channelLayout: 'stereo'}, softWindows: resolved.softWindows,
});

test('Normal preserves every caption and source frame and supplies a single base span', () => {
  const f = fixture(), savedBytes = [Buffer.from(f.planBytes), Buffer.from(f.timelineBytes)];
  const original = originalFor(f), result = resolve(f, original);
  assert.deepEqual(result.plan, f.plan);
  assert.equal(result.expectedFrameCount, 96);
  assert.deepEqual(result.presentationTimeline.spans, [{
    kind: 'base', baseStartFrame: 0, baseEndFrame: 96, startFrame: 0, endFrameExclusive: 96,
  }]);
  assert.deepEqual(result.softWindows, []);
  assert.deepEqual(original.connections.map(row => [row.role, row.preset, row.presetVersion]),
    Array(3).fill(['normal-cut', 'normal-cut', 'v001']));
  assert.equal(original.purpose, 'development-fixture');
  assert.equal(original.createdBy, 'codex-development-fixture');
  assert.deepEqual(filtersFor(result), [
    '[0:v]split=1[basev0]',
    '[0:a]asplit=1[basea0]',
    '[basev0]trim=start_frame=0:end_frame=96,setpts=PTS-STARTPTS[tv0]',
    '[basea0]atrim=start_sample=0:end_sample=153600,asetpts=PTS-STARTPTS[ta0]',
    '[tv0][ta0]concat=n=1:v=1:a=1[timelineVideo][timelineAudio]',
  ]);
  assert.deepEqual(f.planBytes, savedBytes[0]);
  assert.deepEqual(f.timelineBytes, savedBytes[1]);
});

test('mixed insertions shift once and soft windows follow resolved spans after preceding insertions', () => {
  const f = fixture();
  const original = originalFor(f, [choice(3, 'soft-separator'), choice(1, 'black-separator')]);
  const result = resolve(f, original);
  assert.equal(result.expectedFrameCount, 120);
  assert.deepEqual(result.plan.elements.map(row => [row.startFrame, row.endFrameExclusive]),
    [[0, 24], [36, 60], [60, 84], [96, 120]]);
  assert.deepEqual(result.softWindows, [{connectionId: 'connection-03',
    beforeSegmentId: 'segment-3', afterSegmentId: 'segment-4',
    blackStartFrame: 84, blackEndFrameExclusive: 96}]);
  for (const [index, row] of result.plan.elements.entries()) {
    const {startFrame, endFrameExclusive, ...retained} = row;
    const {startFrame: beforeStart, endFrameExclusive: beforeEnd, ...before} = f.plan.elements[index];
    assert.deepEqual(retained, before);
    assert.equal(endFrameExclusive - startFrame, beforeEnd - beforeStart);
  }
  assert.deepEqual(resolve(f, copy(original)), result);
  assert.deepEqual(result, resolve(f, original));
  const sortedOriginal = originalFor(f, [choice(1, 'black-separator'), choice(3, 'soft-separator')]);
  assert.equal(sortedOriginal.recordSha256, original.recordSha256);
});

test('saved overrides and Reset restore the original soft choice while preserving another edit', () => {
  const f = fixture(), original = originalFor(f, [choice(1, 'soft-separator'), choice(2, 'black-separator')]);
  const originalJson = JSON.stringify(original);
  const initial = createConnectionExpressionOverridesV001({context: f.context, original});
  assert.equal(initial.createdBy, 'codex-development-fixture');
  const normal = edit(f, original, initial, choice(1, 'normal-cut'));
  const second = edit(f, copy(original), copy(normal), choice(2, 'soft-separator'));
  assert.deepEqual(second.entries.map(row => [row.connectionId, row.preset]), [
    ['connection-01', 'normal-cut'], ['connection-02', 'soft-separator'],
  ]);
  assert.equal(resolve(f, original, second).expectedFrameCount, 108);
  const peerBefore = JSON.stringify(second.entries[1]);
  const reset = resetConnectionExpressionOverrideV001({
    context: f.context, original: copy(original), overrides: copy(second), connectionId: 'connection-01',
  });
  assert.equal(reset.entries.length, 1);
  assert.equal(JSON.stringify(reset.entries[0]), peerBefore);
  assert.deepEqual(resolve(f, original, reset).connections.map(row => row.preset),
    ['soft-separator', 'soft-separator', 'normal-cut']);
  assert.equal(resolve(f, original, reset).expectedFrameCount, 120);
  assert.equal(JSON.stringify(original), originalJson);
  assert.equal(normal.entries.length, 1);
  assert.equal(initial.entries.length, 0);
  const allReset = resetConnectionExpressionOverrideV001({
    context: f.context, original, overrides: reset, connectionId: 'connection-02',
  });
  assert.equal(allReset.recordSha256, initial.recordSha256);
  assert.deepEqual(resolve(f, original, allReset), resolve(f, original));
  const absentReset = resetConnectionExpressionOverrideV001({
    context: f.context, original, overrides: allReset, connectionId: 'connection-03',
  });
  assert.equal(absentReset.recordSha256, allReset.recordSha256);
});

test('normal override remains explicit and edit order cannot change the saved result', () => {
  const f = fixture(), original = originalFor(f), empty = createConnectionExpressionOverridesV001({context: f.context, original});
  const explicitNormal = edit(f, original, empty, choice(1, 'normal-cut'));
  assert.equal(explicitNormal.entries.length, 1);
  assert.notEqual(explicitNormal.recordSha256, empty.recordSha256);
  const a = edit(f, original, edit(f, original, empty, choice(1, 'soft-separator')), choice(3, 'black-separator'));
  const b = edit(f, original, edit(f, original, empty, choice(3, 'black-separator')), choice(1, 'soft-separator'));
  assert.deepEqual(a, b);
  assert(Object.isFrozen(original) && Object.isFrozen(original.connections[0]));
  assert(Object.isFrozen(a) && Object.isFrozen(a.entries[0]));
  assert.throws(() => { a.entries[0].preset = 'normal-cut'; }, TypeError);
});

test('original JSON bytes, Digest version and Digest SHA all bind saved records', () => {
  const f = fixture(), original = originalFor(f, [choice(1, 'black-separator')]);
  const variants = [
    {planBytes: Buffer.from(f.planBytes.toString() + ' ')},
    {timelineBytes: Buffer.from(f.timelineBytes.toString() + ' ')},
    {digestRef: {...f.digestRef, version: 'synthetic-digest-v002'}},
    {digestRef: {...f.digestRef, sha256: 'b'.repeat(64)}},
  ];
  for (const variant of variants) {
    const context = createConnectionExpressionContextV001({
      digestRef: f.digestRef, planBytes: f.planBytes, timelineBytes: f.timelineBytes, ...variant,
    });
    assert.throws(() => resolveConnectionExpressionV001({context, original}), /SHA differs/);
  }
  // Shift only a caption that remains inside the original duration. Range
  // checks alone would accept it; the saved original-byte binding must reject.
  const shifted = copy(f.plan);
  shifted.elements[1].startFrame += 12;
  shifted.elements[1].endFrameExclusive += 12;
  const shiftedContext = createConnectionExpressionContextV001({
    digestRef: f.digestRef, planBytes: JSON.stringify(shifted), timelineBytes: f.timelineBytes,
  });
  assert.throws(() => resolveConnectionExpressionV001({context: shiftedContext, original}), /original input SHA differs/);
  assert.throws(() => resolveConnectionExpressionV001({context: copy(f.context), original}), /context must be created/);
  // Mutating a caller-owned buffer after context creation cannot replace its parsed original.
  f.planBytes.fill(0);
  assert.equal(resolve(f, original).plan.elements[1].startFrame, 36);
});

test('hash failures and correctly resealed identity, version and free-value changes are rejected', () => {
  const f = fixture(), original = originalFor(f), empty = createConnectionExpressionOverridesV001({context: f.context, original});
  const unsealed = copy(original); unsealed.connections[0].preset = 'soft-separator';
  assert.throws(() => resolve(f, unsealed), /record SHA differs/);
  const invalidOriginalChanges = [
    record => { record.schemaVersion = 'connection-three-layer-research-v001'; },
    record => { record.purpose = 'production'; },
    record => { record.createdBy = 'human-approved'; },
    record => { record.connections[0].beforeSegmentId = 'segment-2'; },
    record => { record.connections[0].afterSegmentId = 'segment-3'; },
    record => { record.connections[0].boundaryFrame++; },
    record => { record.connections[1] = copy(record.connections[0]); },
    record => { record.connections[0].connectionId = 'connection-99'; },
    record => { record.connections[0].preset = 'free-fade'; },
    record => { record.connections[0].presetVersion = 'v002'; },
    record => { record.connections[0].role = 'separator'; },
    record => { record.connections[0].durationFrames = 12; },
    record => { record.opacity = 0.5; },
  ];
  for (const change of invalidOriginalChanges) assert.throws(() => resolve(f, reseal(original, change)), /CONNECTION_EXPRESSION_INVALID/);
  const wrongRef = reseal(empty, record => { record.originalRef.recordSha256 = '0'.repeat(64); });
  assert.throws(() => resolve(f, original, wrongRef), /original record SHA differs/);
  const changedOriginal = originalFor(f, [choice(1, 'black-separator')]);
  assert.throws(() => resolve(f, changedOriginal, empty), /original record SHA differs/);
  const wrongDigest = reseal(empty, record => { record.digestRef.version = 'other'; });
  assert.throws(() => resolve(f, original, wrongDigest), /Digest version\/SHA differs/);
  const wrongInput = reseal(empty, record => { record.inputBindings.canonicalPlanSha256 = '0'.repeat(64); });
  assert.throws(() => resolve(f, original, wrongInput), /original input SHA differs/);
});

test('all finite selection entrances reject unknown, duplicate, version and extra fields', () => {
  const f = fixture(), original = originalFor(f), empty = createConnectionExpressionOverridesV001({context: f.context, original});
  for (const selection of [
    {...choice(1, 'soft-separator'), durationFrames: 12},
    {...choice(1, 'soft-separator'), role: 'separator'},
    choice(99, 'normal-cut'),
    {...choice(1, 'soft-separator'), presetVersion: 'v002'},
    {...choice(1, 'soft-separator'), preset: 'black'},
  ]) {
    assert.throws(() => originalFor(f, [selection]), /CONNECTION_EXPRESSION_INVALID/);
    assert.throws(() => edit(f, original, empty, selection), /CONNECTION_EXPRESSION_INVALID/);
  }
  assert.throws(() => originalFor(f, [choice(1, 'normal-cut'), choice(1, 'black-separator')]), /duplicate selection/);
  assert.throws(() => resetConnectionExpressionOverrideV001({
    context: f.context, original, overrides: empty, connectionId: 'unknown',
  }), /unknown connection ID/);
  const edited = edit(f, original, empty, choice(1, 'black-separator'));
  for (const change of [
    record => { record.entries.push(copy(record.entries[0])); },
    record => { record.entries[0].connectionId = 'unknown'; },
    record => { record.entries[0].presetVersion = 'v002'; },
    record => { record.entries[0].role = 'normal-cut'; },
    record => { record.entries[0].amount = 0.5; },
    record => { record.originalRef.schemaVersion = 'legacy'; },
    record => { record.createdBy = 'automatic-selector'; },
  ]) {
    assert.throws(() => resolve(f, original, reseal(edited, change)), /CONNECTION_EXPRESSION_INVALID/);
  }
});

test('soft needs six retained frames on both sides and cannot reuse one retained frame twice', () => {
  const tooShortBefore = fixture([5, 24]), tooShortAfter = fixture([24, 5]);
  for (const f of [tooShortBefore, tooShortAfter]) {
    assert.throws(() => originalFor(f, [choice(1, 'soft-separator')]), /soft window leaves retained segment/);
    assert.doesNotThrow(() => originalFor(f, [choice(1, 'black-separator')]));
  }
  const overlap = fixture([24, 11, 24]);
  assert.doesNotThrow(() => originalFor(overlap, [choice(1, 'soft-separator')]));
  assert.doesNotThrow(() => originalFor(overlap, [choice(2, 'soft-separator')]));
  assert.throws(() => originalFor(overlap, [choice(1, 'soft-separator'), choice(2, 'soft-separator')]),
    /soft windows overlap retained frames/);
  const original = originalFor(overlap, [choice(1, 'soft-separator')]);
  const empty = createConnectionExpressionOverridesV001({context: overlap.context, original});
  assert.throws(() => edit(overlap, original, empty, choice(2, 'soft-separator')), /soft windows overlap retained frames/);
  const touching = fixture([24, 12, 24]);
  const resolved = resolve(touching, originalFor(touching, [choice(1, 'soft-separator'), choice(2, 'soft-separator')]));
  assert.deepEqual(resolved.softWindows.map(row => [row.blackStartFrame, row.blackEndFrameExclusive]), [[24, 36], [48, 60]]);
  assert.equal(filtersFor(resolved).filter(line => line.includes(']lut=')).length, 24);
});

test('captions ending or starting on a cut survive, while a crossing caption rejects insertion', () => {
  const f = fixture([24, 24], plan => {
    plan.elements = [{instructionId: 'crossing', kind: 'speech-caption', text: '境界を跨ぐ',
      startFrame: 20, endFrameExclusive: 28, displayFrameCount: 8}];
  });
  assert.deepEqual(resolve(f, originalFor(f)).plan, f.plan);
  for (const preset of ['black-separator', 'soft-separator']) {
    assert.throws(() => originalFor(f, [choice(1, preset)]), /caption crosses selected connection/);
    const original = originalFor(f), overrides = createConnectionExpressionOverridesV001({context: f.context, original});
    assert.throws(() => edit(f, original, overrides, choice(1, preset)), /caption crosses selected connection/);
  }
  const edges = fixture([24, 24]);
  assert.deepEqual(resolve(edges, originalFor(edges, [choice(1, 'soft-separator')])).plan.elements
    .map(row => [row.startFrame, row.endFrameExclusive]), [[0, 24], [36, 60]]);
});

test('soft filters use the specified twelve discrete luma/chroma states and keep audio identical to black', () => {
  const f = fixture([24, 24]);
  const soft = resolve(f, originalFor(f, [choice(1, 'soft-separator')]));
  const black = resolve(f, originalFor(f, [choice(1, 'black-separator')]));
  const filters = filtersFor(soft), baselineFilters = filtersFor(black);
  const states = filters.filter(line => line.includes(']lut='));
  assert.equal(states.length, 12);
  assert.deepEqual(states.map(line => Number(line.match(/eq\(n,(\d+)\)/)[1])),
    [18, 19, 20, 21, 22, 23, 36, 37, 38, 39, 40, 41]);
  assert.deepEqual(states.map(line => Number(line.match(/val\*(\d+)/)[1])), [5, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 5]);
  assert.match(states[0], /y='floor\(\(val\*5\+16\*\(5-5\)\+2\)\/5\)'/);
  assert.match(states[5], /u='floor\(\(val\*0\+128\*\(5-0\)\+2\)\/5\)'/);
  assert.match(states[6], /v='floor\(\(val\*0\+128\*\(5-0\)\+2\)\/5\)'/);
  assert.match(states.at(-1), /\[timelineVideo\]$/);
  assert.equal(filters.filter(line => line.includes('[timelineAudio]')).length, 1);
  const audioLines = lines => lines.filter(line => line.includes('[0:a]') || line.includes('atrim=') || line.includes('anullsrc='));
  assert.deepEqual(audioLines(filters), audioLines(baselineFilters));
  assert.deepEqual(soft.plan, black.plan);
  assert.deepEqual(soft.presentationTimeline, black.presentationTimeline);
  assert.equal(soft.expectedFrameCount, black.expectedFrameCount);
});

test('renderer accepts an exactly cropped local clock and rejects incomplete or conflicting windows', () => {
  const f = fixture([240, 240]), full = resolve(f, originalFor(f, [choice(1, 'soft-separator')]));
  const input = {
    presentationTimeline: {spans: [
      {kind: 'base', baseStartFrame: 0, baseEndFrame: 120, startFrame: 0, endFrameExclusive: 120},
      {kind: 'black', beforeSegmentId: 'segment-1', afterSegmentId: 'segment-2', startFrame: 120, endFrameExclusive: 132},
      {kind: 'base', baseStartFrame: 120, baseEndFrame: 240, startFrame: 132, endFrameExclusive: 252},
    ]},
    canvas: dimensions(full.plan.canvas), audio: {sampleRate: 48000, channelLayout: 'stereo'},
    softWindows: full.softWindows.map(row => ({...row, blackStartFrame: row.blackStartFrame - 120,
      blackEndFrameExclusive: row.blackEndFrameExclusive - 120})),
  };
  const filters = buildConnectionExpressionTimelineFiltersV001(input);
  assert.deepEqual(filters.filter(line => line.includes(']lut=')).map(line => Number(line.match(/eq\(n,(\d+)\)/)[1])),
    [114, 115, 116, 117, 118, 119, 132, 133, 134, 135, 136, 137]);
  const input44100 = copy(input); input44100.audio.sampleRate = 44100;
  const filters44100 = buildConnectionExpressionTimelineFiltersV001(input44100);
  assert(filters44100.some(line => line.includes('atrim=start_sample=0:end_sample=176400')));
  assert(filters44100.some(line => line.includes('anullsrc=r=44100:cl=stereo,atrim=end_sample=17640')));
  assert.deepEqual(filters44100.filter(line => line.includes(']lut=')), filters.filter(line => line.includes(']lut=')));
  for (const change of [
    value => { value.audio.sampleRate = 32000; },
    value => { value.audio.channelLayout = 'mono'; },
    value => { value.canvas.fps = 60; },
    value => { value.softWindows[0].blackStartFrame++; },
    value => { value.softWindows[0].frameCount = 6; },
    value => { value.softWindows.push(copy(value.softWindows[0])); },
    value => { value.presentationTimeline.spans[2].baseStartFrame++; },
    value => { value.presentationTimeline.spans[1].endFrameExclusive++; },
    value => { value.presentationTimeline.spans[0].kind = 'unknown'; },
  ]) {
    const invalid = copy(input); change(invalid);
    assert.throws(() => buildConnectionExpressionTimelineFiltersV001(invalid), /CONNECTION_EXPRESSION_INVALID/);
  }
  const short = copy(input);
  short.presentationTimeline.spans = [
    {kind: 'base', baseStartFrame: 0, baseEndFrame: 5, startFrame: 0, endFrameExclusive: 5},
    {kind: 'black', beforeSegmentId: 'segment-1', afterSegmentId: 'segment-2', startFrame: 5, endFrameExclusive: 17},
    {kind: 'base', baseStartFrame: 5, baseEndFrame: 125, startFrame: 17, endFrameExclusive: 137},
  ];
  Object.assign(short.softWindows[0], {blackStartFrame: 5, blackEndFrameExclusive: 17});
  assert.throws(() => buildConnectionExpressionTimelineFiltersV001(short), /cropped soft window loses retained frames/);
});

test('malformed original clocks and context extras are rejected before any record can be created', () => {
  const f = fixture();
  assert.throws(() => createConnectionExpressionContextV001({
    digestRef: f.digestRef, planBytes: f.planBytes, timelineBytes: f.timelineBytes, plan: f.plan,
  }), /context input fields/);
  for (const change of [
    value => { value.schemaVersion = 'presentation-base-media-timeline-v002'; },
    value => { value.segments[1].segmentId = value.segments[0].segmentId; },
    value => { value.segments[1].outputStartFrame++; },
    value => { value.segments[1].sourceEndFrame30++; },
    value => { value.baseMedia.expectedFrameCount++; },
  ]) {
    const timeline = copy(f.timeline); change(timeline);
    assert.throws(() => createConnectionExpressionContextV001({
      digestRef: f.digestRef, planBytes: f.planBytes, timelineBytes: JSON.stringify(timeline),
    }), /CONNECTION_EXPRESSION_INVALID/);
  }
  for (const change of [
    value => { value.canvas.fps = 60; },
    value => { value.elements[1].instructionId = value.elements[0].instructionId; },
    value => { value.elements[0].displayFrameCount++; },
    value => { value.elements[0].endFrameExclusive = 1000; },
  ]) {
    const plan = copy(f.plan); change(plan);
    assert.throws(() => createConnectionExpressionContextV001({
      digestRef: f.digestRef, planBytes: JSON.stringify(plan), timelineBytes: f.timelineBytes,
    }), /CONNECTION_EXPRESSION_INVALID/);
  }
});
