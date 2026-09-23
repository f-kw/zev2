/**
 * Typed development fixtures for finite connection expressions.
 * These records are not a promoted version of the earlier research schema.
 * All source clocks come from the exact original JSON bytes supplied once.
 */
import {createHash} from 'node:crypto';
import {
  PRESENTATION_BLACK_FRAME_COUNT_V001,
  resolvePresentationEffectsV001,
  buildPresentationTimelineFiltersV001,
} from './presentation_effects_v001.mjs';

/** @typedef {'normal-cut'|'black-separator'|'soft-separator'} ConnectionPresetV001 */
/** @typedef {{version: string, sha256: string}} DigestReferenceV001 */
/** @typedef {{connectionId: string, preset: ConnectionPresetV001, presetVersion: 'v001'}} ConnectionSelectionV001 */
/** @typedef {{connectionId: string, beforeSegmentId: string, afterSegmentId: string,
 * blackStartFrame: number, blackEndFrameExclusive: number}} ConnectionSoftWindowV001 */

const ORIGINAL_SCHEMA = 'connection-expression-original-development-v001';
const OVERRIDE_SCHEMA = 'connection-expression-overrides-development-v001';
const PURPOSE = 'development-fixture';
const CREATED_BY = 'codex-development-fixture';
const VERSION = 'v001';
const FADE_FRAMES = 6;
const contexts = new WeakMap();
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const fail = message => { throw new TypeError('CONNECTION_EXPRESSION_INVALID: ' + message); };
const require = (condition, message) => { if (!condition) fail(message); };
const exact = (value, keys, name) => require(object(value)
  && Object.keys(value).length === keys.length && keys.every(key => own(value, key)), name + ' fields');
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const isSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const clone = value => structuredClone(value);
const canonical = value => JSON.stringify(canonicalValue(value));
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  require(value === null || typeof value === 'string' || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value)), 'non-JSON record value');
  return value;
}
const equal = (left, right) => canonical(left) === canonical(right);
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const roleFor = preset => preset === 'normal-cut' ? 'normal-cut' : 'separator';
function preset(value, presetVersion) {
  require(['normal-cut', 'black-separator', 'soft-separator'].includes(value), 'unknown preset');
  require(presetVersion === VERSION, 'unknown preset version');
}
function sealed(body) {
  return freeze({...clone(body), recordSha256: sha(canonical(body))});
}
function checkSeal(record) {
  const {recordSha256, ...body} = record;
  require(isSha(recordSha256) && sha(canonical(body)) === recordSha256, 'record SHA differs');
}
function inputBytes(value, name) {
  require(typeof value === 'string' || Buffer.isBuffer(value) || value instanceof Uint8Array, name + ' bytes required');
  const bytes = Buffer.from(value);
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); } catch { fail(name + ' JSON'); }
  require(object(parsed), name + ' object');
  return {bytes, parsed};
}
function getContext(context) {
  const data = contexts.get(context);
  require(data !== undefined, 'context must be created from original bytes');
  return data;
}
function canvasCheck(canvas) {
  exact(canvas, ['width', 'height', 'fps'], 'canvas');
  require(integer(canvas.width, 2) && integer(canvas.height, 2)
    && canvas.width % 2 === 0 && canvas.height % 2 === 0 && canvas.fps === 30, '30fps even canvas required');
}

/**
 * This in-memory context is not a saved record. Recreate it from the same input
 * bytes after reading saved records; a shifted plan cannot match their binding.
 * @param {{digestRef: DigestReferenceV001, planBytes: Buffer|string|Uint8Array,
 * timelineBytes: Buffer|string|Uint8Array}} options
 */
export function createConnectionExpressionContextV001(options) {
  exact(options, ['digestRef', 'planBytes', 'timelineBytes'], 'context input');
  exact(options.digestRef, ['version', 'sha256'], 'Digest reference');
  require(typeof options.digestRef.version === 'string' && options.digestRef.version.length > 0
    && isSha(options.digestRef.sha256), 'Digest version/SHA');
  const planInput = inputBytes(options.planBytes, 'canonical plan');
  const timelineInput = inputBytes(options.timelineBytes, 'canonical timeline');
  const plan = planInput.parsed, timeline = timelineInput.parsed;
  require(plan.schemaVersion === 'presentation-output-common-core-plan-v001', 'plan version');
  require(timeline.schemaVersion === 'presentation-base-media-timeline-v003', 'timeline version');
  require(object(plan.canvas), 'canonical canvas');
  // The existing canonical plan also owns safe-area metadata. Its canvas is
  // preserved whole; this development module validates only its drawing clock.
  canvasCheck({width: plan.canvas.width, height: plan.canvas.height, fps: plan.canvas.fps});
  require(timeline.baseMedia?.frameRate === '30/1' && integer(timeline.baseMedia.expectedFrameCount, 1),
    'timeline frame clock');
  require(Array.isArray(timeline.segments) && timeline.segments.length >= 2, 'adjacent segments required');
  const expectedFrameCount = timeline.baseMedia.expectedFrameCount;
  const ids = new Set();
  let end = 0;
  for (const segment of timeline.segments) {
    require(object(segment) && typeof segment.segmentId === 'string' && segment.segmentId.length > 0
      && !ids.has(segment.segmentId), 'segment ID');
    require(segment.outputStartFrame === end && integer(segment.outputEndFrame, end + 1),
      'contiguous original segment clock');
    require(integer(segment.sourceStartFrame30) && integer(segment.sourceEndFrame30, segment.sourceStartFrame30 + 1)
      && segment.sourceEndFrame30 - segment.sourceStartFrame30 === segment.outputEndFrame - segment.outputStartFrame,
    'retained source clock');
    ids.add(segment.segmentId);
    end = segment.outputEndFrame;
  }
  require(end === expectedFrameCount, 'timeline frame count');
  require(Array.isArray(plan.elements), 'plan elements');
  const captionIds = new Set();
  for (const element of plan.elements) {
    require(object(element) && typeof element.instructionId === 'string' && element.instructionId.length > 0
      && !captionIds.has(element.instructionId), 'caption ID');
    require(integer(element.startFrame) && integer(element.endFrameExclusive, element.startFrame + 1)
      && element.endFrameExclusive <= expectedFrameCount, 'original caption clock');
    if (own(element, 'displayFrameCount')) require(element.displayFrameCount === element.endFrameExclusive - element.startFrame,
      'caption display length');
    captionIds.add(element.instructionId);
  }
  const connections = timeline.segments.slice(0, -1).map((before, index) => ({
    connectionId: 'connection-' + String(index + 1).padStart(2, '0'),
    beforeSegmentId: before.segmentId,
    afterSegmentId: timeline.segments[index + 1].segmentId,
    boundaryFrame: before.outputEndFrame,
  }));
  const inputBindings = {
    canonicalPlanSha256: sha(planInput.bytes),
    canonicalTimelineSha256: sha(timelineInput.bytes),
  };
  const context = freeze({digestRef: clone(options.digestRef), inputBindings,
    expectedFrameCount, connections: clone(connections)});
  contexts.set(context, freeze({digestRef: clone(options.digestRef), inputBindings: clone(inputBindings),
    expectedFrameCount, plan, timeline, connections}));
  return context;
}

function checkBinding(record, context, schema) {
  const data = getContext(context);
  require(record.schemaVersion === schema && record.purpose === PURPOSE
    && record.createdBy === CREATED_BY, 'development record version/purpose/creator');
  exact(record.digestRef, ['version', 'sha256'], 'record Digest reference');
  exact(record.inputBindings, ['canonicalPlanSha256', 'canonicalTimelineSha256'], 'record input bindings');
  require(equal(record.digestRef, data.digestRef), 'Digest version/SHA differs');
  require(equal(record.inputBindings, data.inputBindings), 'original input SHA differs');
}
function connectionFor(data, id) {
  const connection = data.connections.find(row => row.connectionId === id);
  require(connection !== undefined, 'unknown connection ID');
  return connection;
}
function intervalsDoNotOverlap(intervals, message) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  for (let index = 1; index < sorted.length; index++) {
    require(sorted[index][0] >= sorted[index - 1][1], message);
  }
}
function resolveRows(data, rows) {
  const sourceFadeIntervals = [];
  for (const row of rows) {
    if (row.preset !== 'soft-separator') continue;
    const before = data.timeline.segments.find(segment => segment.segmentId === row.beforeSegmentId);
    const after = data.timeline.segments.find(segment => segment.segmentId === row.afterSegmentId);
    require(row.boundaryFrame - before.outputStartFrame >= FADE_FRAMES
      && after.outputEndFrame - row.boundaryFrame >= FADE_FRAMES, 'soft window leaves retained segment');
    sourceFadeIntervals.push([row.boundaryFrame - FADE_FRAMES, row.boundaryFrame],
      [row.boundaryFrame, row.boundaryFrame + FADE_FRAMES]);
  }
  intervalsDoNotOverlap(sourceFadeIntervals, 'soft windows overlap retained frames');
  require(PRESENTATION_BLACK_FRAME_COUNT_V001 === 12, 'existing black preset changed');
  // The existing resolver owns subtitle shifts and the single insertion clock.
  const resolved = resolvePresentationEffectsV001({
    plan: data.plan, expectedFrameCount: data.expectedFrameCount, baseTimeline: data.timeline,
    effects: {connections: rows.map(row => ({
      beforeSegmentId: row.beforeSegmentId, afterSegmentId: row.afterSegmentId,
      transition: row.preset === 'normal-cut' ? 'normal-cut' : 'black',
    }))},
  });
  const presentationTimeline = resolved.presentationTimeline ?? {spans: [{
    kind: 'base', baseStartFrame: 0, baseEndFrame: data.expectedFrameCount,
    startFrame: 0, endFrameExclusive: data.expectedFrameCount,
  }]};
  const softWindows = rows.filter(row => row.preset === 'soft-separator').map(row => {
    const span = presentationTimeline.spans.find(candidate => candidate.kind === 'black'
      && candidate.beforeSegmentId === row.beforeSegmentId && candidate.afterSegmentId === row.afterSegmentId);
    require(span !== undefined, 'resolved soft insertion missing');
    return {connectionId: row.connectionId, beforeSegmentId: row.beforeSegmentId, afterSegmentId: row.afterSegmentId,
      blackStartFrame: span.startFrame, blackEndFrameExclusive: span.endFrameExclusive};
  });
  return {...resolved, presentationTimeline, connections: clone(rows), softWindows};
}
function checkOriginal(context, original) {
  exact(original, ['schemaVersion', 'purpose', 'createdBy', 'digestRef', 'inputBindings', 'connections', 'recordSha256'], 'original record');
  checkBinding(original, context, ORIGINAL_SCHEMA);
  checkSeal(original);
  const data = getContext(context);
  require(Array.isArray(original.connections) && original.connections.length === data.connections.length, 'complete connection coverage');
  original.connections.forEach((row, index) => {
    exact(row, ['connectionId', 'beforeSegmentId', 'afterSegmentId', 'boundaryFrame', 'role', 'preset', 'presetVersion'], 'original connection');
    const bound = data.connections[index];
    for (const key of Object.keys(bound)) require(row[key] === bound[key], 'connection identity/adjacency/original boundary differs');
    preset(row.preset, row.presetVersion);
    require(row.role === roleFor(row.preset), 'preset role differs');
  });
  resolveRows(data, original.connections);
  return data;
}
function checkOverrides(context, original, overrides) {
  const data = checkOriginal(context, original);
  exact(overrides, ['schemaVersion', 'purpose', 'createdBy', 'digestRef', 'inputBindings', 'originalRef', 'entries', 'recordSha256'], 'override record');
  checkBinding(overrides, context, OVERRIDE_SCHEMA);
  checkSeal(overrides);
  exact(overrides.originalRef, ['schemaVersion', 'recordSha256'], 'original reference');
  require(overrides.originalRef.schemaVersion === ORIGINAL_SCHEMA
    && overrides.originalRef.recordSha256 === original.recordSha256, 'original record SHA differs');
  require(Array.isArray(overrides.entries), 'override entries');
  let previousIndex = -1;
  for (const row of overrides.entries) {
    exact(row, ['connectionId', 'role', 'preset', 'presetVersion'], 'override entry');
    connectionFor(data, row.connectionId);
    const index = data.connections.findIndex(connection => connection.connectionId === row.connectionId);
    require(index > previousIndex, 'duplicate or unordered override');
    previousIndex = index;
    preset(row.preset, row.presetVersion);
    require(row.role === roleFor(row.preset), 'override preset role differs');
  }
  resolveRows(data, effectiveRows(original, overrides));
  return data;
}
function effectiveRows(original, overrides) {
  return original.connections.map(row => {
    const override = overrides?.entries.find(entry => entry.connectionId === row.connectionId);
    return override ? {...row, ...override} : {...row};
  });
}

/** @param {{context: object, selections: ConnectionSelectionV001[]}} options */
export function createConnectionExpressionOriginalV001(options) {
  exact(options, ['context', 'selections'], 'original creation');
  const data = getContext(options.context);
  require(Array.isArray(options.selections), 'finite selections');
  const choices = new Map();
  for (const selection of options.selections) {
    exact(selection, ['connectionId', 'preset', 'presetVersion'], 'selection');
    connectionFor(data, selection.connectionId);
    require(!choices.has(selection.connectionId), 'duplicate selection');
    preset(selection.preset, selection.presetVersion);
    choices.set(selection.connectionId, selection.preset);
  }
  const original = sealed({
    schemaVersion: ORIGINAL_SCHEMA, purpose: PURPOSE, createdBy: CREATED_BY,
    digestRef: data.digestRef, inputBindings: data.inputBindings,
    connections: data.connections.map(connection => {
      const selected = choices.get(connection.connectionId) ?? 'normal-cut';
      return {...connection, role: roleFor(selected), preset: selected, presetVersion: VERSION};
    }),
  });
  checkOriginal(options.context, original);
  return original;
}

/** @param {{context: object, original: object}} options */
export function createConnectionExpressionOverridesV001(options) {
  exact(options, ['context', 'original'], 'override creation');
  const data = checkOriginal(options.context, options.original);
  return sealed({schemaVersion: OVERRIDE_SCHEMA, purpose: PURPOSE, createdBy: CREATED_BY,
    digestRef: data.digestRef, inputBindings: data.inputBindings,
    originalRef: {schemaVersion: ORIGINAL_SCHEMA, recordSha256: options.original.recordSha256}, entries: []});
}

/** @param {{context: object, original: object, overrides: object, connectionId: string,
 * preset: ConnectionPresetV001, presetVersion: 'v001'}} options */
export function setConnectionExpressionOverrideV001(options) {
  exact(options, ['context', 'original', 'overrides', 'connectionId', 'preset', 'presetVersion'], 'override edit');
  const data = checkOverrides(options.context, options.original, options.overrides);
  connectionFor(data, options.connectionId);
  preset(options.preset, options.presetVersion);
  const entries = options.overrides.entries.filter(row => row.connectionId !== options.connectionId).map(clone);
  entries.push({connectionId: options.connectionId, role: roleFor(options.preset),
    preset: options.preset, presetVersion: options.presetVersion});
  entries.sort((a, b) => data.connections.findIndex(row => row.connectionId === a.connectionId)
    - data.connections.findIndex(row => row.connectionId === b.connectionId));
  const {recordSha256: ignored, ...body} = options.overrides;
  const updated = sealed({...body, entries});
  checkOverrides(options.context, options.original, updated);
  return updated;
}

/** @param {{context: object, original: object, overrides: object, connectionId: string}} options */
export function resetConnectionExpressionOverrideV001(options) {
  exact(options, ['context', 'original', 'overrides', 'connectionId'], 'override reset');
  const data = checkOverrides(options.context, options.original, options.overrides);
  connectionFor(data, options.connectionId);
  const {recordSha256: ignored, ...body} = options.overrides;
  const updated = sealed({...body, entries: body.entries.filter(row => row.connectionId !== options.connectionId)});
  checkOverrides(options.context, options.original, updated);
  return updated;
}

/** @param {{context: object, original: object, overrides?: object}} options */
export function resolveConnectionExpressionV001(options) {
  require(object(options), 'resolve input');
  exact(options, own(options, 'overrides') ? ['context', 'original', 'overrides'] : ['context', 'original'], 'resolve input');
  const data = own(options, 'overrides')
    ? checkOverrides(options.context, options.original, options.overrides)
    : checkOriginal(options.context, options.original);
  return freeze(clone(resolveRows(data, effectiveRows(options.original, options.overrides))));
}

/**
 * Renderer-only input. The caller may crop the resolved global spans for a
 * fixture, subtracting its original start from base frames and display start
 * from display frames and both black endpoints. Saved selections contain none
 * of these numbers. Input/output media pixel format and range are checked by
 * the renderer's media probe, not inferred from a selection record.
 * @param {{presentationTimeline: {spans: object[]}, canvas: {width:number,height:number,fps:number},
 * audio: {sampleRate:number,channelLayout:string}, softWindows: ConnectionSoftWindowV001[]}} options
 * @returns {string[]} FFmpeg filters ending in timelineVideo and timelineAudio.
 */
export function buildConnectionExpressionTimelineFiltersV001(options) {
  exact(options, ['presentationTimeline', 'canvas', 'audio', 'softWindows'], 'renderer input');
  canvasCheck(options.canvas);
  exact(options.audio, ['sampleRate', 'channelLayout'], 'audio clock');
  require([44100, 48000].includes(options.audio.sampleRate) && options.audio.channelLayout === 'stereo',
    '44.1kHz or 48kHz stereo required');
  exact(options.presentationTimeline, ['spans'], 'presentation timeline');
  const spans = options.presentationTimeline.spans;
  require(Array.isArray(spans) && spans.length > 0, 'renderer spans');
  let displayEnd = 0, baseEnd = 0;
  const blackKeys = new Set();
  for (const span of spans) {
    require(object(span), 'renderer span');
    exact(span, span.kind === 'base'
      ? ['kind', 'baseStartFrame', 'baseEndFrame', 'startFrame', 'endFrameExclusive']
      : ['kind', 'beforeSegmentId', 'afterSegmentId', 'startFrame', 'endFrameExclusive'], 'renderer span');
    require(span.startFrame === displayEnd && integer(span.endFrameExclusive, displayEnd + 1), 'renderer display clock');
    if (span.kind === 'base') {
      require(span.baseStartFrame === baseEnd && integer(span.baseEndFrame, baseEnd + 1)
        && span.baseEndFrame - span.baseStartFrame === span.endFrameExclusive - span.startFrame, 'renderer retained clock');
      baseEnd = span.baseEndFrame;
    } else {
      require(span.kind === 'black' && span.endFrameExclusive - span.startFrame === 12, 'finite black interval');
      require(typeof span.beforeSegmentId === 'string' && span.beforeSegmentId.length > 0
        && typeof span.afterSegmentId === 'string' && span.afterSegmentId.length > 0
        && span.beforeSegmentId !== span.afterSegmentId, 'renderer segment identity');
      const key = canonical([span.beforeSegmentId, span.afterSegmentId]);
      require(!blackKeys.has(key), 'duplicate renderer connection');
      blackKeys.add(key);
    }
    displayEnd = span.endFrameExclusive;
  }
  require(spans[0].kind === 'base' && spans.at(-1).kind === 'base', 'retained media must surround insertion');
  require(Array.isArray(options.softWindows), 'finite soft windows');
  const usedIds = new Set(), usedSpans = new Set(), sourceFades = [], frames = [];
  for (const window of options.softWindows) {
    exact(window, ['connectionId', 'beforeSegmentId', 'afterSegmentId', 'blackStartFrame', 'blackEndFrameExclusive'], 'soft window');
    require(typeof window.connectionId === 'string' && window.connectionId.length > 0
      && !usedIds.has(window.connectionId), 'duplicate soft window');
    usedIds.add(window.connectionId);
    const index = spans.findIndex(span => span.kind === 'black'
      && span.beforeSegmentId === window.beforeSegmentId && span.afterSegmentId === window.afterSegmentId
      && span.startFrame === window.blackStartFrame && span.endFrameExclusive === window.blackEndFrameExclusive);
    require(index > 0 && index < spans.length - 1 && !usedSpans.has(index), 'soft window must bind one black span');
    usedSpans.add(index);
    const before = spans[index - 1], after = spans[index + 1];
    require(before.kind === 'base' && after.kind === 'base'
      && before.endFrameExclusive - before.startFrame >= FADE_FRAMES
      && after.endFrameExclusive - after.startFrame >= FADE_FRAMES, 'cropped soft window loses retained frames');
    sourceFades.push([before.baseEndFrame - FADE_FRAMES, before.baseEndFrame],
      [after.baseStartFrame, after.baseStartFrame + FADE_FRAMES]);
    for (let offset = 0; offset < FADE_FRAMES; offset++) {
      frames.push({frame: window.blackStartFrame - FADE_FRAMES + offset, numerator: 5 - offset});
      frames.push({frame: window.blackEndFrameExclusive + offset, numerator: offset});
    }
  }
  intervalsDoNotOverlap(sourceFades, 'renderer soft windows overlap retained frames');
  frames.sort((a, b) => a.frame - b.frame);
  const filters = buildPresentationTimelineFiltersV001({
    presentationTimeline: options.presentationTimeline, canvas: options.canvas, audio: options.audio,
  });
  if (!frames.length) return filters;
  filters[filters.length - 1] = filters.at(-1).replace('[timelineVideo]', '[connectionBaseVideo]');
  for (const [index, state] of frames.entries()) {
    const input = index === 0 ? 'connectionBaseVideo' : 'connectionSoft' + (index - 1);
    const output = index === frames.length - 1 ? 'timelineVideo' : 'connectionSoft' + index;
    const expression = black => "'floor((val*" + state.numerator + '+' + black + '*(5-' + state.numerator + ")+2)/5)'";
    filters.push('[' + input + ']lut=y=' + expression(16) + ':u=' + expression(128)
      + ':v=' + expression(128) + ":enable='eq(n," + state.frame + ")'[" + output + ']');
  }
  return filters;
}
