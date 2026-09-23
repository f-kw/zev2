import {createHash} from 'node:crypto';
import {open, stat} from 'node:fs/promises';
import path from 'node:path';
import {canonical} from '../point-review/core.mjs';
import {sourcePartsForRange} from './clock.mjs';
import {decodePresentationCaptionB1StrictJsonV001} from '../../evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';

const INPUT_SCHEMA = 'digest-quality-input-v001';
const REPLY_SCHEMA = 'digest-quality-judgment-v001';
const EVIDENCE_KINDS = new Set(['saved-caption', 'saved-display-plan', 'saved-source-mapping',
  'reused-audio-observation', 'completed-pcm-measurement', 'completed-pixel-measurement']);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function reject(where, message) { throw new TypeError(`${where}: ${message}`); }
function require(condition, where, message) { if (!condition) reject(where, message); }
function keys(value, expected, where) {
  require(plain(value) && Object.keys(value).length === expected.length
    && expected.every(key => Object.hasOwn(value, key)), where, 'unexpected or missing fields');
}
function text(value, where) { require(typeof value === 'string' && value.trim().length > 0, where, 'nonempty text required'); }
function id(value, where) {
  require(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value), where, 'invalid ID');
}
function hash(value, where) { require(typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value), where, 'invalid SHA-256'); }
function integer(value, where, minimum = 0) {
  require(Number.isSafeInteger(value) && !Object.is(value, -0) && value >= minimum, where, 'invalid integer');
}
function array(value, where, nonempty = false) {
  require(Array.isArray(value) && (!nonempty || value.length > 0)
    && Object.keys(value).length === value.length
    && Array.from({length: value.length}, (_, index) => Object.hasOwn(value, index)).every(Boolean), where, 'dense array required');
}
function unique(values, where) { require(new Set(values).size === values.length, where, 'duplicate ID'); }
function ids(value, where, nonempty = false) { array(value, where, nonempty); value.forEach(v => id(v, where)); unique(value, where); }
function strings(value, where, nonempty = true) { array(value, where, nonempty); value.forEach(v => text(v, where)); }
function localPath(value, where) {
  text(value, where);
  require(path.isAbsolute(value) && !value.includes('\0') && !value.startsWith('//'), where, 'absolute local path required');
}
function finiteJson(value, where, ancestors = new Set()) {
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    require(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value), where, 'invalid Unicode');
    return;
  }
  if (typeof value === 'number') {
    require(Number.isFinite(value) && !Object.is(value, -0)
      && (!Number.isInteger(value) || Number.isSafeInteger(value)), where, 'invalid number');
    return;
  }
  require((Array.isArray(value) || plain(value)) && !ancestors.has(value), where, 'finite JSON required');
  require(Object.getOwnPropertySymbols(value).length === 0, where, 'symbol fields are not JSON');
  ancestors.add(value);
  if (Array.isArray(value)) array(value, where);
  for (const [key, item] of Object.entries(value)) { finiteJson(key, where, ancestors); finiteJson(item, where, ancestors); }
  ancestors.delete(value);
}
export function canonicalHash(value) {
  finiteJson(value, 'quality hash');
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}
function range(value, total, where) {
  keys(value, ['startFrame', 'endFrameExclusive'], where);
  integer(value.startFrame, where); integer(value.endFrameExclusive, where, 1);
  require(value.startFrame < value.endFrameExclusive && value.endFrameExclusive <= total, where, 'range outside its clock');
}
const overlaps = (a, b) => a.startFrame < b.endFrameExclusive && b.startFrame < a.endFrameExclusive;
const contains = (outer, inner) => outer.startFrame <= inner.startFrame && inner.endFrameExclusive <= outer.endFrameExclusive;
function covers(target, ranges) {
  let cursor = target.startFrame;
  for (const item of [...ranges].sort((a, b) => a.startFrame - b.startFrame)) {
    if (item.endFrameExclusive <= cursor) continue;
    if (item.startFrame > cursor) return false;
    cursor = Math.max(cursor, item.endFrameExclusive);
    if (cursor >= target.endFrameExclusive) return true;
  }
  return false;
}
function partition(target, ranges, where) {
  let cursor = target.startFrame;
  for (const item of [...ranges].sort((a, b) => a.startFrame - b.startFrame)) {
    require(item.startFrame === cursor && contains(target, item), where, 'gap or overlap in partition');
    cursor = item.endFrameExclusive;
  }
  require(cursor === target.endFrameExclusive, where, 'incomplete partition');
}
function rational(value, where) {
  keys(value, ['numerator', 'denominator'], where);
  integer(value.numerator, where); integer(value.denominator, where, 1);
}
function clock(packet, connectionIds) {
  const value = packet.clock, where = 'quality clock';
  keys(value, ['schemaVersion', 'mediaSha256', 'frameRate', 'baselineFrameCount', 'completedFrameCount',
    'playbackSampleRate', 'observationSampleRate', 'sourceClockSha256', 'projectionSha256', 'sourceVideoClock', 'spans', 'provenance'], where);
  require(value.schemaVersion === 'digest-quality-clock-v001' && value.mediaSha256 === packet.media.sha256
    && value.completedFrameCount === packet.media.frameCount, where, 'completed media clock differs');
  // The persisted source mapping helper implements these already-fixed media clocks.
  require(value.frameRate === 30 && value.playbackSampleRate === 44100 && value.observationSampleRate === 16000,
    where, 'unsupported source mapping clocks');
  require(BigInt(value.frameRate) * BigInt(packet.media.fpsDen) === BigInt(packet.media.fpsNum)
    && value.playbackSampleRate === packet.media.audioSampleRate, where, 'playback media rate differs');
  integer(value.baselineFrameCount, where, 1); hash(value.sourceClockSha256, where); hash(value.projectionSha256, where);
  require(plain(value.sourceVideoClock) && plain(value.provenance), where, 'source clock/provenance required');
  integer(value.sourceVideoClock.videoPresentationOffsetMs, where);
  array(value.spans, where, true);
  let end = 0, baselineEnd = 0;
  const segments = new Set(), insertedConnections = new Set();
  for (const span of value.spans) {
    keys(span, ['kind', 'range', 'baselineRange', 'originalVideoStartFrame', 'originalAudioStartSample', 'segmentId', 'connectionId'], where);
    range(span.range, value.completedFrameCount, where);
    require(span.range.startFrame === end, where, 'completed mapping has a gap, overlap or wrong order');
    end = span.range.endFrameExclusive;
    if (span.kind === 'inserted') {
      require([span.baselineRange, span.originalVideoStartFrame, span.originalAudioStartSample, span.segmentId].every(v => v === null)
        && connectionIds.has(span.connectionId) && !insertedConnections.has(span.connectionId), where, 'invalid insertion origins/connection');
      insertedConnections.add(span.connectionId);
    } else {
      require(span.kind === 'retained' && span.connectionId === null, where, 'unknown retained/inserted clock span');
      range(span.baselineRange, value.baselineFrameCount, where);
      integer(span.originalVideoStartFrame, where); integer(span.originalAudioStartSample, where); id(span.segmentId, where);
      require(!segments.has(span.segmentId), where, 'duplicate retained segment'); segments.add(span.segmentId);
      require(span.baselineRange.startFrame === baselineEnd
        && span.baselineRange.endFrameExclusive - baselineEnd === span.range.endFrameExclusive - span.range.startFrame,
      where, 'baseline mapping has a gap, overlap or changed duration');
      baselineEnd = span.baselineRange.endFrameExclusive;
    }
  }
  require(end === value.completedFrameCount && baselineEnd === value.baselineFrameCount, where, 'incomplete clock mapping');
}
function sourceParts(unit, packet, referenceIds, connectionIds) {
  const where = `quality input unit ${unit.id} sourceParts`;
  array(unit.sourceParts, where, true);
  for (const part of unit.sourceParts) {
    keys(part, ['kind', 'range', 'baselineRange', 'originalVideo', 'originalAudio', 'segmentId', 'connectionId'], where);
    range(part.range, packet.media.frameCount, where);
    require(contains(unit.range, part.range), where, 'part outside unit');
    if (part.kind === 'inserted') {
      require([part.baselineRange, part.originalVideo, part.originalAudio, part.segmentId].every(v => v === null)
        && connectionIds.has(part.connectionId), where, 'inserted part must have no source origins and a known connection');
      continue;
    }
    require(part.kind === 'retained' && part.connectionId === null, where, 'unknown retained/inserted mapping');
    id(part.segmentId, where);
    range(part.baselineRange, packet.clock.baselineFrameCount ?? Number.MAX_SAFE_INTEGER, where);
    const frames = part.range.endFrameExclusive - part.range.startFrame;
    require(part.baselineRange.endFrameExclusive - part.baselineRange.startFrame === frames, where, 'retained frame count changed');
    const video = part.originalVideo, audio = part.originalAudio;
    keys(video, ['sourceRef', 'logicalFrameRange', 'decodedFrameIndices', 'presentationSeconds'], where);
    require(referenceIds.has(video.sourceRef), where, 'unknown original video reference');
    range(video.logicalFrameRange, Number.MAX_SAFE_INTEGER, where);
    keys(video.decodedFrameIndices, ['first', 'step', 'count'], where);
    integer(video.decodedFrameIndices.first, where); integer(video.decodedFrameIndices.step, where, 1);
    integer(video.decodedFrameIndices.count, where, 1);
    require(video.logicalFrameRange.endFrameExclusive - video.logicalFrameRange.startFrame === frames
      && video.decodedFrameIndices.count === frames, where, 'source video frame count changed');
    keys(video.presentationSeconds, ['start', 'end'], where);
    rational(video.presentationSeconds.start, where); rational(video.presentationSeconds.end, where);
    const start = video.presentationSeconds.start, end = video.presentationSeconds.end;
    require(BigInt(start.numerator) * BigInt(end.denominator) < BigInt(end.numerator) * BigInt(start.denominator), where, 'source video time reversed');
    keys(audio, ['sourceRef', 'sampleRate', 'startSample', 'endSampleExclusive'], where);
    require(referenceIds.has(audio.sourceRef), where, 'unknown original audio reference');
    integer(audio.sampleRate, where, 1); integer(audio.startSample, where); integer(audio.endSampleExclusive, where, 1);
    require(audio.startSample < audio.endSampleExclusive
      && BigInt(audio.endSampleExclusive - audio.startSample) * BigInt(packet.media.fpsNum)
        === BigInt(frames) * BigInt(audio.sampleRate) * BigInt(packet.media.fpsDen), where, 'source audio duration changed');
  }
  partition(unit.range, unit.sourceParts.map(part => part.range), where);
  require(canonicalHash(unit.sourceParts) === canonicalHash(sourcePartsForRange(packet.clock, unit.range)), where,
    'source mapping differs from the bound clock (wrong shift or repeated projection)');
}

/** Synchronous by default. File verification is explicit and asynchronous. */
export function validateQualityInput(packet, {verifyFiles = false} = {}) {
  const where = 'quality input';
  require(typeof verifyFiles === 'boolean', where, 'verifyFiles must be boolean');
  finiteJson(packet, where);
  keys(packet, ['schemaVersion', 'inputSha256', 'media', 'references', 'clock', 'units', 'evidence', 'limitations'], where);
  require(packet.schemaVersion === INPUT_SCHEMA, where, 'unsupported schema');
  hash(packet.inputSha256, where);
  const {inputSha256, ...body} = packet;
  require(canonicalHash(body) === inputSha256, where, 'input SHA mismatch');
  const media = packet.media;
  keys(media, ['id', 'path', 'sha256', 'fpsNum', 'fpsDen', 'frameCount', 'audioSampleRate', 'audioSampleCount'], 'quality media');
  id(media.id, where); localPath(media.path, where); hash(media.sha256, where);
  for (const field of ['fpsNum', 'fpsDen', 'frameCount', 'audioSampleRate', 'audioSampleCount']) integer(media[field], `quality media ${field}`, 1);
  const requiredSamples = (BigInt(media.frameCount) * BigInt(media.audioSampleRate) * BigInt(media.fpsDen)
    + BigInt(media.fpsNum) - 1n) / BigInt(media.fpsNum);
  require(BigInt(media.audioSampleCount) >= requiredSamples, where, 'audio does not cover completed video duration');
  strings(packet.limitations, where);
  array(packet.references, where, true); unique(packet.references.map(ref => ref?.id), where);
  for (const ref of packet.references) {
    keys(ref, ['id', 'path', 'sha256', 'kind'], 'quality reference');
    id(ref.id, where); localPath(ref.path, where); hash(ref.sha256, where); text(ref.kind, where);
  }
  const referenceIds = new Set(packet.references.map(ref => ref.id));
  array(packet.units, where, true); unique(packet.units.map(unit => unit?.id), where);
  const units = new Map(packet.units.map(unit => [unit?.id, unit]));
  const connectionIds = new Set(packet.units.filter(unit => unit?.kind === 'connection').map(unit => unit.id));
  clock(packet, connectionIds);
  for (const unit of packet.units) {
    keys(unit, ['id', 'kind', 'range', 'text', 'display', 'sourceParts', 'evidenceIds'], 'quality unit');
    id(unit.id, where); require(['caption', 'connection', 'no-caption'].includes(unit.kind), where, 'unknown unit kind');
    range(unit.range, media.frameCount, `quality unit ${unit.id}`);
    if (unit.kind === 'caption') text(unit.text, where);
    else require(unit.text === null || typeof unit.text === 'string', where, 'unit text must be text or null');
    if (unit.kind === 'no-caption') require(unit.id === `no-caption-${unit.range.startFrame}-${unit.range.endFrameExclusive}`,
      where, 'no-caption ID differs from its interval');
    require(plain(unit.display), where, 'saved display object required');
    ids(unit.evidenceIds, where);
    sourceParts(unit, packet, referenceIds, connectionIds);
  }
  partition({startFrame: 0, endFrameExclusive: media.frameCount},
    packet.units.filter(unit => unit.kind !== 'connection').map(unit => unit.range), 'quality caption/no-caption coverage');
  array(packet.evidence, where); unique(packet.evidence.map(item => item?.id), where);
  const evidence = new Map(packet.evidence.map(item => [item?.id, item]));
  for (const item of packet.evidence) {
    keys(item, ['id', 'kind', 'range', 'unitIds', 'method', 'facts', 'limitations', 'referenceIds'], 'quality evidence');
    id(item.id, where); require(EVIDENCE_KINDS.has(item.kind), where, 'unknown evidence kind');
    range(item.range, media.frameCount, `quality evidence ${item.id}`);
    if (item.kind === 'reused-audio-observation') require(packet.clock.spans.some(span => span.kind === 'retained'
      && contains(span.range, item.range)), where, 'historical audio must be split into retained clock spans');
    ids(item.unitIds, where, true); text(item.method, where); strings(item.limitations, where);
    require(plain(item.facts), where, 'facts object required'); ids(item.referenceIds, where, true);
    require(item.referenceIds.every(ref => referenceIds.has(ref)), where, 'missing evidence reference');
    for (const unitId of item.unitIds) {
      const unit = units.get(unitId);
      require(unit && overlaps(unit.range, item.range) && unit.evidenceIds.includes(item.id), where, 'unrelated or one-sided evidence/unit reference');
    }
  }
  for (const unit of packet.units) for (const evidenceId of unit.evidenceIds) {
    const item = evidence.get(evidenceId);
    require(item && item.unitIds.includes(unit.id) && overlaps(unit.range, item.range), where, 'unknown or unrelated unit evidence');
  }
  if (verifyFiles) return verifyReferences(packet).then(() => packet);
  return packet;
}

/** Validate attribution and bounds; natural-language claims are not semantically certified. */
export function validateQualityReply(packet, rawBytes) {
  validateQualityInput(packet);
  const where = 'quality reply';
  require(Buffer.isBuffer(rawBytes) || rawBytes instanceof Uint8Array, where, 'raw UTF-8 bytes required');
  const bytes = Buffer.from(rawBytes), rawReplySha256 = createHash('sha256').update(bytes).digest('hex');
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  require(decoded.status === 'decoded', where, `malformed JSON (${decoded.reason ?? 'unknown'})`);
  const reply = decoded.value;
  keys(reply, ['schemaVersion', 'inputSha256', 'mediaSha256', 'status', 'processedUnits', 'candidates', 'limitations', 'failureReason'], where);
  require(reply.schemaVersion === REPLY_SCHEMA && reply.inputSha256 === packet.inputSha256
    && reply.mediaSha256 === packet.media.sha256, where, 'schema or input/media SHA mismatch');
  require(['complete', 'incomplete', 'failed'].includes(reply.status), where, 'unknown completion state');
  if (reply.status === 'complete') require(reply.failureReason === null, where, 'complete reply has failure reason');
  else text(reply.failureReason, where);
  strings(reply.limitations, where);
  array(reply.processedUnits, where); unique(reply.processedUnits.map(row => row?.unitId), where);
  const units = new Map(packet.units.map(unit => [unit.id, unit]));
  const evidence = new Map(packet.evidence.map(item => [item.id, item]));
  const processed = new Set();
  for (const row of reply.processedUnits) {
    keys(row, ['unitId', 'state', 'evidenceIds', 'summary'], 'quality processed unit');
    require(units.has(row.unitId), where, 'unknown processed unit');
    require(['reviewed-with-available-evidence', 'insufficient-evidence'].includes(row.state), where, 'unknown processing state');
    ids(row.evidenceIds, where); text(row.summary, where);
    const unit = units.get(row.unitId);
    require(row.evidenceIds.every(evidenceId => unit.evidenceIds.includes(evidenceId)), where, 'unrelated processed-unit evidence');
    if (row.state === 'reviewed-with-available-evidence') require(row.evidenceIds.length > 0, where, 'reviewed unit has no available evidence');
    processed.add(row.unitId);
  }
  if (reply.status === 'complete') require(processed.size === units.size, where, 'unprocessed target in complete reply');
  array(reply.candidates, where); unique(reply.candidates.map(candidate => candidate?.id), where);
  for (const candidate of reply.candidates) {
    keys(candidate, ['id', 'unitIds', 'range', 'evidenceIds', 'observedFacts', 'hypothesis', 'missingInformation',
      'normalExplanations', 'humanQuestion', 'reflectionTargets'], 'quality candidate');
    id(candidate.id, where); ids(candidate.unitIds, where, true); ids(candidate.evidenceIds, where, true);
    range(candidate.range, packet.media.frameCount, `quality candidate ${candidate.id}`);
    const nominated = candidate.unitIds.map(unitId => {
      require(units.has(unitId) && processed.has(unitId), where, 'unknown or unprocessed candidate target');
      const unit = units.get(unitId);
      require(overlaps(candidate.range, unit.range), where, 'candidate does not overlap nominated unit');
      return unit;
    });
    require(covers(candidate.range, nominated.map(unit => unit.range)), where, 'candidate range is not covered by nominated units');
    for (const evidenceId of candidate.evidenceIds) {
      const item = evidence.get(evidenceId);
      require(item && overlaps(item.range, candidate.range), where, 'unknown or unrelated candidate evidence range');
      require(nominated.some(unit => item.unitIds.includes(unit.id)
        && Math.max(unit.range.startFrame, item.range.startFrame, candidate.range.startFrame)
          < Math.min(unit.range.endFrameExclusive, item.range.endFrameExclusive, candidate.range.endFrameExclusive)),
      where, 'candidate evidence is unrelated to its nominated units');
    }
    array(candidate.observedFacts, where, true);
    for (const fact of candidate.observedFacts) {
      keys(fact, ['evidenceId', 'statement'], 'quality observed fact');
      require(candidate.evidenceIds.includes(fact.evidenceId), where, 'observed fact lacks candidate evidence attribution');
      text(fact.statement, where);
    }
    text(candidate.hypothesis, where); text(candidate.humanQuestion, where);
    for (const field of ['missingInformation', 'normalExplanations', 'reflectionTargets']) strings(candidate[field], where);
  }
  return {schemaVersion: 'digest-quality-validation-v001',
    status: reply.status === 'complete' ? 'accepted' : reply.status,
    reviewEligible: reply.status === 'complete', inputSha256: packet.inputSha256, mediaSha256: packet.media.sha256,
    rawReplySha256, reply, counts: {units: units.size, processedUnits: processed.size, candidates: reply.candidates.length}};
}

const stableIdentity = (a, b) => ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key] === b[key]);
async function verifyFile(ref) {
  const beforePath = await stat(ref.path, {bigint: true});
  const handle = await open(ref.path, 'r');
  try {
    const before = await handle.stat({bigint: true});
    require(before.isFile() && stableIdentity(beforePath, before), 'quality reference', 'reference is not a stable regular file');
    const digest = createHash('sha256'); let bytes = 0;
    for await (const chunk of handle.createReadStream({autoClose: false})) { digest.update(chunk); bytes += chunk.length; }
    const after = await handle.stat({bigint: true});
    const afterPath = await stat(ref.path, {bigint: true});
    require(stableIdentity(before, after) && stableIdentity(after, afterPath) && BigInt(bytes) === after.size,
      'quality reference', 'reference changed while reading');
    const sha256 = digest.digest('hex');
    require(sha256 === ref.sha256, 'quality reference', `SHA mismatch for ${ref.id}`);
    return {id: ref.id, path: ref.path, sha256, bytes};
  } finally { await handle.close(); }
}
export async function verifyReferences(packet) {
  validateQualityInput(packet);
  const references = [], files = new Map();
  for (const ref of [packet.media, ...packet.references]) {
    let observed = files.get(ref.path);
    if (observed) require(observed.sha256 === ref.sha256, 'quality reference', 'same path has conflicting hashes');
    else { observed = await verifyFile(ref); files.set(ref.path, observed); }
    references.push({...observed, id: ref.id});
  }
  return {schemaVersion: 'digest-quality-reference-verification-v001', status: 'verified',
    inputSha256: packet.inputSha256, mediaSha256: packet.media.sha256, references};
}
