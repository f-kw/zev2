import {createHash} from 'node:crypto';

const fail = message => { throw new Error(`QUALITY_CLOCK_INVALID: ${message}`); };
const require = (condition, message) => { if (!condition) fail(message); };
const integer = value => Number.isSafeInteger(value) && value >= 0;
export const canonicalJson = value => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
  require(value === null || ['string', 'boolean'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value)), 'non-JSON value');
  return value;
}
export const canonicalSha256 = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
function same(a, b, message) { require(canonicalJson(a) === canonicalJson(b), message); }
export function rational(numerator, denominator = 1) {
  let n = BigInt(numerator), d = BigInt(denominator);
  require(n >= 0n && d > 0n, 'invalid rational');
  let a = n, b = d;
  while (b) [a, b] = [b, a % b];
  n /= a; d /= a;
  // ASR seconds can preserve long decimal residue. Keep that precision rather than
  // rounding it onto an audio sample; large integers use JSON decimal strings.
  const jsonInteger = value => value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  return {numerator: jsonInteger(n), denominator: jsonInteger(d)};
}
const cmp = (a, b) => BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
const add = (a, b) => rational(BigInt(a.numerator) * BigInt(b.denominator) + BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
const sub = (a, b) => rational(BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
const scale = (a, n, d = 1) => rational(BigInt(a.numerator) * BigInt(n), BigInt(a.denominator) * BigInt(d));
const max = (a, b) => cmp(a, b) >= 0n ? a : b;
const min = (a, b) => cmp(a, b) <= 0n ? a : b;
const floor = a => Number(BigInt(a.numerator) / BigInt(a.denominator));
const ceil = a => Number((BigInt(a.numerator) + BigInt(a.denominator) - 1n) / BigInt(a.denominator));
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
function checkedRange(value, end) {
  require(value && Object.keys(value).length === 2 && integer(value.startFrame) && integer(value.endFrameExclusive)
    && value.startFrame < value.endFrameExclusive && value.endFrameExclusive <= end, 'frame range outside completed video');
}

/** Consume persisted concrete clocks only. No selector, renderer or state restoration. */
export function createQualityClock({projection, timeline, generationManifest, mediaSha256}) {
  require(projection?.schemaVersion === 'presentation-orchestration-projection-v001', 'projection schema');
  const {projectionSha256, ...body} = projection;
  require(canonicalSha256(body) === projectionSha256, 'projection hash');
  require(canonicalSha256(projection.sourceClock) === projection.sourceClockSha256, 'source clock hash');
  const s = projection.sourceClock, m = generationManifest;
  require(s.frameRate === 30 && s.playbackSampleRate === 44100 && s.observationSampleRate === 16000, 'unsupported saved clocks');
  require(timeline?.schemaVersion === 'presentation-base-media-timeline-v003', 'timeline schema');
  require(m?.schemaVersion === 'presentation-base-media-generation-manifest-v003', 'generation manifest schema');
  require(timeline.sourceRef === m.source.sourceRef, 'original source differs');
  require(m.outputs.baseMedia.fileSha256 === s.mediaRef.fileSha256 && m.outputs.timeline.fileSha256 === s.timelineRef.fileSha256, 'manifest output identity');
  const vc = timeline.sourceFrameClock;
  require(vc.inputFrameRate === '60/1' && vc.logicalFrameRate === '30/1' && vc.extractionRuleId === 'source-frame-60fps-global-even-v001', 'source frame extraction');
  require(vc.videoFirstPts === m.source.video.firstPts && vc.videoStreamTimeBase === m.source.video.timeBase
    && vc.videoPresentationOffsetMs === m.source.video.presentationOffsetMs, 'source video clock differs');
  const [tbNum, tbDen] = vc.videoStreamTimeBase.split('/').map(Number);
  require(vc.videoFirstPts * tbNum * 1000 === (vc.videoPresentationOffsetMs + vc.containerStartTimeMs) * tbDen, 'source video offset');
  require(m.source.audio.sampleRate === s.playbackSampleRate && m.source.audio.firstDecodedPts === 0, 'source audio clock');
  require(/^[a-f0-9]{64}$/.test(mediaSha256), 'completed media identity');
  require(projection.sourceFrameCount === s.sourceFrameCount && projection.sourceFrameCount === m.outputs.baseMedia.frameCount, 'baseline length');
  require(projection.sourcePlaybackSampleCount === projection.sourceFrameCount * 1470
    && projection.displayPlaybackSampleCount === projection.displayFrameCount * 1470, 'playback length');
  require(projection.retainedSpans.length === timeline.segments.length && timeline.segments.length === m.segments.length, 'segment count');
  const spans = [];
  let baselineEnd = 0;
  for (const r of projection.retainedSpans) {
    const t = timeline.segments.find(row => row.segmentId === r.segmentId);
    const g = m.segments.find(row => row.segmentId === r.segmentId);
    require(t && g, 'missing original source segment');
    require(r.sourceStartFrame === baselineEnd && r.sourceEndFrameExclusive > baselineEnd, 'baseline coverage/order');
    same([r.sourceStartFrame, r.sourceEndFrameExclusive], [t.outputStartFrame, t.outputEndFrame], 'timeline segment range');
    require(t.sourceEndFrame30 - t.sourceStartFrame30 === r.sourceEndFrameExclusive - r.sourceStartFrame, 'source frame length');
    require(g.sourceStartFrame30 === t.sourceStartFrame30 && g.outputStartFrame === t.outputStartFrame, 'manifest segment position');
    require(r.displayStartFrame - r.sourceStartFrame === r.shiftFrames
      && r.displayEndFrameExclusive - r.sourceEndFrameExclusive === r.shiftFrames, 'saved frame shift');
    same([r.sourceStartSample, r.sourceEndSampleExclusive, r.displayStartSample, r.displayEndSampleExclusive],
      [r.sourceStartFrame * 1470, r.sourceEndFrameExclusive * 1470, r.displayStartFrame * 1470, r.displayEndFrameExclusive * 1470], 'saved playback samples');
    same([g.audioSamples.outputStart, g.audioSamples.outputEnd], [r.sourceStartSample, r.sourceEndSampleExclusive], 'manifest audio baseline');
    require(g.audioSamples.sourceEnd - g.audioSamples.sourceStart === r.sourceEndSampleExclusive - r.sourceStartSample, 'source audio length');
    spans.push({kind: 'retained', range: range(r.displayStartFrame, r.displayEndFrameExclusive),
      baselineRange: range(r.sourceStartFrame, r.sourceEndFrameExclusive), originalVideoStartFrame: t.sourceStartFrame30,
      originalAudioStartSample: g.audioSamples.sourceStart, segmentId: r.segmentId, connectionId: null});
    baselineEnd = r.sourceEndFrameExclusive;
  }
  require(baselineEnd === projection.sourceFrameCount, 'baseline terminal boundary');
  require(projection.connections.length === spans.length - 1, 'connection count');
  require(new Set(projection.connections.map(row => row.connectionId)).size === projection.connections.length, 'duplicate connection');
  let shift = 0;
  projection.connections.forEach((c, i) => {
    require(c.beforeSegmentId === spans[i].segmentId && c.afterSegmentId === spans[i + 1].segmentId
      && c.boundaryFrame === spans[i + 1].baselineRange.startFrame, 'connection ordering');
    const insertion = projection.insertedSpans.filter(row => row.connectionId === c.connectionId);
    require(integer(c.insertedFrameCount), 'insertion count');
    require(insertion.length === (c.insertedFrameCount ? 1 : 0), 'insertion missing/duplicate');
    if (c.insertedFrameCount) {
      const r = insertion[0], start = c.boundaryFrame + shift, end = start + c.insertedFrameCount;
      require(r.sourceBoundaryFrame === c.boundaryFrame && r.preset === c.preset, 'insertion connection identity');
      same([r.displayStartFrame, r.displayEndFrameExclusive, r.playbackStartSample, r.playbackEndSampleExclusive,
        r.playbackSampleCount, r.observationSampleCount], [start, end, start * 1470, end * 1470,
        c.insertedFrameCount * 1470, c.insertedFrameCount * 16000 / 30], 'insertion clocks');
      spans.push({kind: 'inserted', range: range(start, end), baselineRange: null, originalVideoStartFrame: null,
        originalAudioStartSample: null, segmentId: null, connectionId: c.connectionId});
      shift += c.insertedFrameCount;
    }
  });
  require(projection.insertedSpans.length === spans.filter(row => row.kind === 'inserted').length, 'unknown insertion');
  spans.sort((a, b) => a.range.startFrame - b.range.startFrame);
  let completedEnd = 0;
  for (const span of spans) {
    checkedRange(span.range, projection.displayFrameCount);
    require(span.range.startFrame === completedEnd, 'completed coverage gap/overlap');
    completedEnd = span.range.endFrameExclusive;
  }
  require(completedEnd === projection.displayFrameCount && completedEnd === baselineEnd + shift, 'completed terminal boundary');
  return {schemaVersion: 'digest-quality-clock-v001', mediaSha256, frameRate: 30,
    baselineFrameCount: projection.sourceFrameCount, completedFrameCount: projection.displayFrameCount,
    playbackSampleRate: 44100, observationSampleRate: 16000, sourceClockSha256: projection.sourceClockSha256,
    projectionSha256, sourceVideoClock: structuredClone(vc), spans,
    provenance: {mapping: 'persisted-retained-and-inserted-spans; no automatic choices recomputed',
      originalAudio: 'generation-manifest segment source samples; separate from video timestamps',
      frameRangeRule: 'half-open; points at a connection belong to the following retained segment',
      observationRule: 'historical observation retained; insertions and decoder tail excluded'}};
}

export function sourcePartsForRange(clock, completedRange) {
  checkedRange(completedRange, clock.completedFrameCount);
  return clock.spans.flatMap(span => {
    const start = Math.max(completedRange.startFrame, span.range.startFrame);
    const end = Math.min(completedRange.endFrameExclusive, span.range.endFrameExclusive);
    if (start >= end) return [];
    const common = {kind: span.kind, range: range(start, end), baselineRange: null, originalVideo: null,
      originalAudio: null, segmentId: span.segmentId, connectionId: span.connectionId};
    if (span.kind === 'inserted') return [common];
    const offset = start - span.range.startFrame, count = end - start;
    const sourceFrame = span.originalVideoStartFrame + offset;
    const offsetTime = rational(clock.sourceVideoClock.videoPresentationOffsetMs, 1000);
    return [{...common, baselineRange: range(span.baselineRange.startFrame + offset, span.baselineRange.startFrame + offset + count),
      originalVideo: {sourceRef: 'original-source-media', logicalFrameRange: range(sourceFrame, sourceFrame + count),
        decodedFrameIndices: {first: sourceFrame * 2, step: 2, count},
        presentationSeconds: {start: add(rational(sourceFrame, 30), offsetTime), end: add(rational(sourceFrame + count, 30), offsetTime)}},
      originalAudio: {sourceRef: 'original-source-media', sampleRate: 44100,
        startSample: span.originalAudioStartSample + offset * 1470,
        endSampleExclusive: span.originalAudioStartSample + (offset + count) * 1470}}];
  });
}

/** Integer frame ranges are envelopes; exact fractional sample coverage remains in each part. */
export function projectObservationInterval(clock, {clock: inputClock, sourceClockSha256, sampleRate, startSample, endSampleExclusive}) {
  require(inputClock === 'digest-original' && sourceClockSha256 === clock.sourceClockSha256, 'wrong or already projected observation clock');
  require(sampleRate === clock.observationSampleRate || sampleRate === clock.playbackSampleRate, 'observation rate');
  const coordinate = value => {
    if (integer(value)) return rational(value);
    const natural = field => integer(field) || (typeof field === 'string' && /^(0|[1-9]\d*)$/.test(field));
    require(value && typeof value === 'object' && Object.keys(value).length === 2
      && natural(value.numerator) && natural(value.denominator) && BigInt(value.denominator) > 0n, 'observation samples');
    return rational(value.numerator, value.denominator);
  };
  const start = coordinate(startSample), end = coordinate(endSampleExclusive), parts = [];
  require(cmp(start, end) <= 0n, 'observation samples reversed');
  const isPoint = cmp(start, end) === 0n;
  for (const span of clock.spans.filter(row => row.kind === 'retained')) {
    const spanStart = rational(span.baselineRange.startFrame * sampleRate, 30);
    const spanEnd = rational(span.baselineRange.endFrameExclusive * sampleRate, 30);
    const a = max(start, spanStart), b = min(end, spanEnd);
    if (isPoint ? cmp(start, spanStart) < 0n || cmp(start, spanEnd) >= 0n : cmp(a, b) >= 0n) continue;
    const offset = rational((span.range.startFrame - span.baselineRange.startFrame) * sampleRate, 30);
    const fa = add(a, offset), fb = add(b, offset);
    const first = floor(scale(fa, 30, sampleRate));
    const last = isPoint ? first + 1 : ceil(scale(fb, 30, sampleRate));
    parts.push({range: range(first, last), segmentId: span.segmentId, pointOnly: isPoint, sampleRate,
      baselineSamples: {start: a, end: b}, completedObservationSamples: {start: fa, end: fb},
      completedPlaybackSamples: {start: scale(fa, 44100, sampleRate), end: scale(fb, 44100, sampleRate)},
      originalAudioSamples: {start: add(rational(span.originalAudioStartSample), scale(sub(a, spanStart), 44100, sampleRate)),
        end: add(rational(span.originalAudioStartSample), scale(sub(b, spanStart), 44100, sampleRate))}});
  }
  const effectiveEnd = rational(clock.baselineFrameCount * sampleRate, 30);
  const excluded = cmp(end, effectiveEnd) > 0n || (isPoint && cmp(start, effectiveEnd) >= 0n)
    ? [{reason: 'outside-presentation-decoder-tail', sampleRate, start: max(start, effectiveEnd), end}] : [];
  return {parts, excluded};
}
