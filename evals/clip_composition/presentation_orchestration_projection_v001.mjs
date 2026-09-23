/** One source-to-display clock for finite connection and caption expressions. */
import {createHash} from 'node:crypto';
import {
  createConnectionExpressionContextV001,
  createConnectionExpressionOriginalV001,
  resolveConnectionExpressionV001,
} from './connection_expression_v001.mjs';

export const ORCHESTRATION_PROJECTION_VERSION_V001 = 'presentation-orchestration-projection-v001';
const SOURCE_CLOCK = 'digest-original';
const DISPLAY_CLOCK = 'digest-display';
const FPS = 30;
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const fail = message => {throw new TypeError('ORCHESTRATION_PROJECTION_INVALID: ' + message);};
const require = (condition, message) => {if (!condition) fail(message);};
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
const isSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
function exact(value, keys, name) {
  require(object(value) && Object.keys(value).length === keys.length
    && keys.every(key => own(value, key)), name + ' fields');
}
function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  require(value === null || ['string', 'boolean'].includes(typeof value)
    || (typeof value === 'number' && Number.isFinite(value)), 'non-JSON value');
  return value;
}
const canonical = value => JSON.stringify(ordered(value));
const equal = (a, b) => canonical(a) === canonical(b);
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function safeNumber(value) {
  require(value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER), 'clock exceeds safe integer range');
  return Number(value);
}
function product(a, b) {return safeNumber(BigInt(a) * BigInt(b));}
function sum(a, b) {return safeNumber(BigInt(a) + BigInt(b));}
function samplesForFrames(frames, sampleRate) {
  const numerator = BigInt(frames) * BigInt(sampleRate);
  require(numerator % BigInt(FPS) === 0n, 'insertion not integral at bound sample clock');
  return safeNumber(numerator / BigInt(FPS));
}
function gcd(a, b) {while (b) [a, b] = [b, a % b]; return a;}
function rational(numerator, denominator = 1n) {
  require(numerator >= 0n && denominator > 0n, 'invalid nonnegative rational');
  const divisor = gcd(numerator, denominator);
  return {numerator: safeNumber(numerator / divisor), denominator: safeNumber(denominator / divisor)};
}
const compare = (a, b) => BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
const maximum = (a, b) => compare(a, b) >= 0n ? a : b;
const minimum = (a, b) => compare(a, b) <= 0n ? a : b;
const addInteger = (a, b) => rational(BigInt(a.numerator) + BigInt(b) * BigInt(a.denominator), BigInt(a.denominator));
const scaleRational = (a, numerator, denominator) => rational(BigInt(a.numerator) * BigInt(numerator),
  BigInt(a.denominator) * BigInt(denominator));
const frameAtRate = (frame, sampleRate) => rational(BigInt(frame) * BigInt(sampleRate), BigInt(FPS));
function ref(value, name) {
  exact(value, ['path', 'fileSha256'], name);
  require(typeof value.path === 'string' && value.path.length > 0 && isSha(value.fileSha256), name + ' path/SHA');
}
function boundBytes(value, reference, name) {
  require(typeof value === 'string' || Buffer.isBuffer(value) || value instanceof Uint8Array, name + ' original bytes required');
  const bytes = Buffer.from(value);
  require(sha(bytes) === reference.fileSha256, name + ' source SHA differs; display input cannot be projected again');
  let parsed;
  try {parsed = JSON.parse(bytes.toString('utf8'));} catch {fail(name + ' JSON');}
  require(object(parsed) && !own(parsed, 'clock') && !own(parsed, 'projectionSha256'), name + ' must be original clock');
  return {bytes, parsed};
}
const CREATE_KEYS = ['digestRef', 'planRef', 'timelineRef', 'mediaRef', 'planBytes', 'timelineBytes',
  'playbackSampleRate', 'observationSampleRate', 'connections'];

/**
 * All connections are required, including Normal. Their input order is irrelevant;
 * their persisted concrete presets are not redrawn or inferred from durations.
 * refs: {path,fileSha256}; digestRef: {version,sha256}; connections:
 * [{connectionId,preset:'normal-cut'|'black-separator'|'soft-separator',presetVersion:'v001'}].
 * The caller verifies media bytes/probe and audio-evidence source bindings before
 * constructing this projection. JSON byte references are checked here.
 */
export function createOrchestrationProjectionV001(options) {
  exact(options, CREATE_KEYS, 'projection creation');
  for (const name of ['planRef', 'timelineRef', 'mediaRef']) ref(options[name], name);
  require([44100, 48000].includes(options.playbackSampleRate), 'playback clock must be 44100 or 48000 Hz');
  require(options.observationSampleRate === 16000, 'observation clock must be 16000 Hz');
  const planInput = boundBytes(options.planBytes, options.planRef, 'caption plan');
  const timelineInput = boundBytes(options.timelineBytes, options.timelineRef, 'retained timeline');
  const context = createConnectionExpressionContextV001({digestRef: options.digestRef,
    planBytes: planInput.bytes, timelineBytes: timelineInput.bytes});
  const timeline = timelineInput.parsed;
  require(timeline.baseMedia.fileSha256 === options.mediaRef.fileSha256, 'timeline media SHA differs');
  require(Array.isArray(options.connections) && options.connections.length === context.connections.length,
    'complete concrete connection coverage required');
  // The existing resolver validates IDs, finite presets, selected-caption crossings
  // and every pair of Soft windows. It creates the insertion timeline only once.
  const original = createConnectionExpressionOriginalV001({context, selections: options.connections});
  const resolved = resolveConnectionExpressionV001({context, original});
  const connections = resolved.connections.map(row => ({...row,
    insertedFrameCount: row.preset === 'normal-cut' ? 0 : 12}));
  for (const caption of planInput.parsed.elements) {
    require(!connections.some(row => caption.startFrame < row.boundaryFrame
      && caption.endFrameExclusive > row.boundaryFrame), 'caption crosses retained connection boundary');
  }
  const playbackSamplesPerFrame = options.playbackSampleRate / FPS;
  const sourceClock = {schemaVersion: 'presentation-orchestration-source-clock-v001',
    digestRef: clone(options.digestRef), planRef: clone(options.planRef), timelineRef: clone(options.timelineRef),
    mediaRef: clone(options.mediaRef), frameRate: FPS, sourceFrameCount: context.expectedFrameCount,
    playbackSampleRate: options.playbackSampleRate, observationSampleRate: options.observationSampleRate};
  const sourceClockSha256 = sha(canonical(sourceClock));
  const retainedSpans = timeline.segments.map(segment => {
    const shiftFrames = connections.filter(row => row.boundaryFrame <= segment.outputStartFrame)
      .reduce((total, row) => total + row.insertedFrameCount, 0);
    const displayStartFrame = sum(segment.outputStartFrame, shiftFrames);
    const displayEndFrameExclusive = sum(segment.outputEndFrame, shiftFrames);
    return {segmentId: segment.segmentId, sourceStartFrame: segment.outputStartFrame,
      sourceEndFrameExclusive: segment.outputEndFrame, displayStartFrame, displayEndFrameExclusive, shiftFrames,
      sourceStartSample: product(segment.outputStartFrame, playbackSamplesPerFrame),
      sourceEndSampleExclusive: product(segment.outputEndFrame, playbackSamplesPerFrame),
      displayStartSample: product(displayStartFrame, playbackSamplesPerFrame),
      displayEndSampleExclusive: product(displayEndFrameExclusive, playbackSamplesPerFrame)};
  });
  const insertedSpans = resolved.presentationTimeline.spans.filter(span => span.kind === 'black').map(span => {
    const row = connections.find(connection => connection.beforeSegmentId === span.beforeSegmentId
      && connection.afterSegmentId === span.afterSegmentId);
    return {connectionId: row.connectionId, preset: row.preset, sourceBoundaryFrame: row.boundaryFrame,
      displayStartFrame: span.startFrame, displayEndFrameExclusive: span.endFrameExclusive,
      playbackStartSample: product(span.startFrame, playbackSamplesPerFrame),
      playbackEndSampleExclusive: product(span.endFrameExclusive, playbackSamplesPerFrame),
      playbackSampleCount: samplesForFrames(row.insertedFrameCount, options.playbackSampleRate),
      observationSampleCount: samplesForFrames(row.insertedFrameCount, options.observationSampleRate)};
  });
  const body = {schemaVersion: ORCHESTRATION_PROJECTION_VERSION_V001, sourceClock, sourceClockSha256,
    sourceFrameCount: context.expectedFrameCount, displayFrameCount: resolved.expectedFrameCount,
    sourcePlaybackSampleCount: product(context.expectedFrameCount, playbackSamplesPerFrame),
    displayPlaybackSampleCount: product(resolved.expectedFrameCount, playbackSamplesPerFrame),
    connections, retainedSpans, insertedSpans, presentationTimeline: clone(resolved.presentationTimeline),
    softWindows: clone(resolved.softWindows),
    endpointRule: 'points-at-boundary-after;exclusive-caption-end-before;audio-parts-half-open',
    audioEvidenceRule: 'preserve-source;intersect-retained-presentation;exclude-insertion-and-decoder-tail'};
  return freeze({...body, projectionSha256: sha(canonical(body))});
}

function checkProjection(projection) {
  require(object(projection) && projection.schemaVersion === ORCHESTRATION_PROJECTION_VERSION_V001,
    'projection version');
  const {projectionSha256, ...body} = projection;
  require(isSha(projectionSha256) && sha(canonical(body)) === projectionSha256, 'projection SHA differs');
  require(sha(canonical(projection.sourceClock)) === projection.sourceClockSha256, 'source clock SHA differs');
}
/** Rebuild after reload or any override/reset, before accepting a saved view. */
export function assertProjectionMatchesStateV001(options) {
  exact(options, ['projection', ...CREATE_KEYS], 'projection/current state');
  const {projection, ...currentState} = options;
  checkProjection(projection);
  const expected = createOrchestrationProjectionV001(currentState);
  require(equal(projection, expected), 'stale projection: current source or concrete connection state differs');
  return true;
}
function checkSource(projection, source, keys, name) {
  checkProjection(projection);
  exact(source, ['clock', 'sourceClockSha256', ...keys], name);
  require(source.clock === SOURCE_CLOCK, 'already projected or unknown input clock');
  require(source.sourceClockSha256 === projection.sourceClockSha256, 'source clock/ref/version differs');
}
function display(projection, source, derived) {
  return freeze({clock: DISPLAY_CLOCK, sourceClockSha256: projection.sourceClockSha256,
    projectionSha256: projection.projectionSha256, source: clone(source), ...derived});
}
function rate(projection, value) {
  require([projection.sourceClock.playbackSampleRate, projection.sourceClock.observationSampleRate].includes(value),
    'sample clock differs from bound playback/observation rate');
}
function sampleShift(projection, sample, sampleRate) {
  // Compare in the original sample domain, before floor-to-frame or resampling.
  const shiftFrames = projection.connections.filter(row => BigInt(sample) * BigInt(FPS)
    >= BigInt(row.boundaryFrame) * BigInt(sampleRate)).reduce((total, row) => total + row.insertedFrameCount, 0);
  return samplesForFrames(shiftFrames, sampleRate);
}
function samplePoint(projection, sample, sampleRate) {
  rate(projection, sampleRate);
  require(integer(sample) && BigInt(sample) * BigInt(FPS)
    < BigInt(projection.sourceFrameCount) * BigInt(sampleRate), 'sample point outside retained presentation');
  const displaySample = sum(sample, sampleShift(projection, sample, sampleRate));
  return {sampleRate, displaySample,
    displayFrame: safeNumber(BigInt(displaySample) * BigInt(FPS) / BigInt(sampleRate)),
    playbackSample: rational(BigInt(displaySample) * BigInt(projection.sourceClock.playbackSampleRate), BigInt(sampleRate))};
}
export function projectOriginalFrameV001({projection, point}) {
  checkSource(projection, point, ['frame'], 'original frame point');
  require(integer(point.frame) && point.frame < projection.sourceFrameCount, 'frame outside retained presentation');
  const shiftFrames = projection.connections.filter(row => row.boundaryFrame <= point.frame)
    .reduce((total, row) => total + row.insertedFrameCount, 0);
  const displayFrame = sum(point.frame, shiftFrames);
  return display(projection, point, {displayFrame,
    playbackSample: product(displayFrame, projection.sourceClock.playbackSampleRate / FPS)});
}
export function projectOriginalSampleV001({projection, point}) {
  checkSource(projection, point, ['sample', 'sampleRate'], 'original sample point');
  return display(projection, point, samplePoint(projection, point.sample, point.sampleRate));
}
export function projectAudioPeakV001({projection, peak}) {
  checkSource(projection, peak, ['peakId', 'sample', 'sampleRate'], 'original audio peak');
  require(typeof peak.peakId === 'string' && peak.peakId.length > 0, 'peak ID');
  return display(projection, peak, {peakId: peak.peakId, ...samplePoint(projection, peak.sample, peak.sampleRate)});
}
export function projectCaptionIntervalV001({projection, caption}) {
  checkSource(projection, caption, ['captionId', 'startFrame', 'endFrameExclusive'], 'original caption interval');
  require(typeof caption.captionId === 'string' && caption.captionId.length > 0, 'caption ID');
  require(integer(caption.startFrame) && integer(caption.endFrameExclusive, caption.startFrame + 1)
    && caption.endFrameExclusive <= projection.sourceFrameCount, 'caption interval outside presentation');
  require(!projection.connections.some(row => caption.startFrame < row.boundaryFrame
    && caption.endFrameExclusive > row.boundaryFrame), 'caption crosses retained connection boundary');
  const startFrame = projectOriginalFrameV001({projection,
    point: {clock: caption.clock, sourceClockSha256: caption.sourceClockSha256, frame: caption.startFrame}}).displayFrame;
  // End is exclusive: using the start-side shift preserves the exact read time
  // when endFrameExclusive is the next connection boundary.
  const displayFrameCount = caption.endFrameExclusive - caption.startFrame;
  return display(projection, caption, {captionId: caption.captionId, startFrame,
    endFrameExclusive: sum(startFrame, displayFrameCount), displayFrameCount, motionStartFrame: startFrame});
}
export function projectCaptionPlanV001({projection, planBytes}) {
  checkProjection(projection);
  const input = boundBytes(planBytes, projection.sourceClock.planRef, 'caption plan');
  const plan = clone(input.parsed);
  const captionTimings = plan.elements.map(element => projectCaptionIntervalV001({projection, caption: {
    clock: SOURCE_CLOCK, sourceClockSha256: projection.sourceClockSha256, captionId: element.instructionId,
    startFrame: element.startFrame, endFrameExclusive: element.endFrameExclusive}}));
  plan.elements = plan.elements.map((element, index) => ({...element,
    startFrame: captionTimings[index].startFrame, endFrameExclusive: captionTimings[index].endFrameExclusive}));
  return freeze({clock: DISPLAY_CLOCK, sourceClockSha256: projection.sourceClockSha256,
    projectionSha256: projection.projectionSha256, sourcePlanSha256: sha(input.bytes), plan, captionTimings});
}

/**
 * Exact rational sample coordinates keep fractional 16kHz connection boundaries.
 * No raw evidence is trimmed or rewritten. Parts contain only retained media;
 * AAC decoder padding is described separately and black has no evidence part.
 */
export function projectAudioEvidenceIntervalV001({projection, interval}) {
  checkSource(projection, interval, ['evidenceId', 'startSample', 'endSampleExclusive', 'sampleRate'], 'original audio interval');
  require(typeof interval.evidenceId === 'string' && interval.evidenceId.length > 0, 'evidence ID');
  rate(projection, interval.sampleRate);
  require(integer(interval.startSample) && integer(interval.endSampleExclusive, interval.startSample + 1), 'audio interval');
  const sourceStart = rational(BigInt(interval.startSample));
  const sourceEnd = rational(BigInt(interval.endSampleExclusive));
  const parts = [];
  for (const span of projection.retainedSpans) {
    const start = maximum(sourceStart, frameAtRate(span.sourceStartFrame, interval.sampleRate));
    const end = minimum(sourceEnd, frameAtRate(span.sourceEndFrameExclusive, interval.sampleRate));
    if (compare(start, end) >= 0n) continue;
    const shift = samplesForFrames(span.shiftFrames, interval.sampleRate);
    const displayStartSample = addInteger(start, shift), displayEndSampleExclusive = addInteger(end, shift);
    parts.push({segmentId: span.segmentId, sampleRate: interval.sampleRate,
      sourceStartSample: start, sourceEndSampleExclusive: end, displayStartSample, displayEndSampleExclusive,
      playbackStartSample: scaleRational(displayStartSample, projection.sourceClock.playbackSampleRate, interval.sampleRate),
      playbackEndSampleExclusive: scaleRational(displayEndSampleExclusive, projection.sourceClock.playbackSampleRate, interval.sampleRate)});
  }
  const effectiveEnd = frameAtRate(projection.sourceFrameCount, interval.sampleRate);
  const tailStart = maximum(sourceStart, effectiveEnd);
  const excludedParts = compare(tailStart, sourceEnd) < 0n ? [{reason: 'outside-presentation-tail',
    sourceStartSample: tailStart, sourceEndSampleExclusive: sourceEnd}] : [];
  return display(projection, interval, {evidenceId: interval.evidenceId, parts, excludedParts});
}

/** A current projection is supplied by the state owner, never inferred from the view. */
export function assertProjectedTimingV001({projection, kind, original, projected}) {
  checkProjection(projection);
  const projectors = {
    frame: value => projectOriginalFrameV001({projection, point: value}),
    sample: value => projectOriginalSampleV001({projection, point: value}),
    caption: value => projectCaptionIntervalV001({projection, caption: value}),
    'motion-start': value => projectCaptionIntervalV001({projection, caption: value}),
    'audio-peak': value => projectAudioPeakV001({projection, peak: value}),
    'audio-interval': value => projectAudioEvidenceIntervalV001({projection, interval: value}),
    'caption-plan': value => projectCaptionPlanV001({projection, planBytes: value}),
  };
  require(own(projectors, kind), 'unknown timing kind');
  require(object(projected) && projected.clock === DISPLAY_CLOCK
    && projected.projectionSha256 === projection.projectionSha256, 'stale/unknown display projection');
  require(equal(projected, projectors[kind](original)), 'projected timing differs from immutable source');
  return true;
}
