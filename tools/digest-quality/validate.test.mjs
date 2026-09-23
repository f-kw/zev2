import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {canonicalHash, validateQualityInput, validateQualityReply, verifyReferences} from './validate.mjs';
import {sourcePartsForRange} from './clock.mjs';

const H = character => character.repeat(64);
const interval = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const raw = value => Buffer.from(JSON.stringify(value), 'utf8');
function bind(packet) {
  const {inputSha256: ignored, ...body} = packet;
  packet.inputSha256 = canonicalHash(body); return packet;
}
function parts(start, end) {
  return sourcePartsForRange(fixtureClock(), interval(start, end));
}
function fixtureClock() {
  return {schemaVersion: 'digest-quality-clock-v001', mediaSha256: H('a'), frameRate: 30, baselineFrameCount: 56,
    completedFrameCount: 60, playbackSampleRate: 44100, observationSampleRate: 16000, sourceClockSha256: H('d'), projectionSha256: H('e'),
    sourceVideoClock: {videoPresentationOffsetMs: 46}, provenance: {source: 'saved projection'}, spans: [
      {kind: 'retained', range: interval(0, 24), baselineRange: interval(0, 24), originalVideoStartFrame: 100,
        originalAudioStartSample: 147000, segmentId: 'segment-01', connectionId: null},
      {kind: 'inserted', range: interval(24, 28), baselineRange: null, originalVideoStartFrame: null,
        originalAudioStartSample: null, segmentId: null, connectionId: 'connection-01'},
      {kind: 'retained', range: interval(28, 60), baselineRange: interval(24, 56), originalVideoStartFrame: 124,
        originalAudioStartSample: 182280, segmentId: 'segment-02', connectionId: null}]};
}
function fixture() {
  const unit = (id, kind, start, end, evidenceIds) => ({id, kind, range: interval(start, end),
    text: kind === 'caption' ? `字幕 ${id}` : null, display: {type: kind}, sourceParts: parts(start, end), evidenceIds});
  const evidence = (id, kind, start, end, unitIds) => ({id, kind, range: interval(start, end), unitIds,
    method: 'saved local measurement', facts: {count: 1, levelDb: -12.5}, limitations: ['Meaning has not been observed.'], referenceIds: ['saved-observations']});
  return bind({schemaVersion: 'digest-quality-input-v001', media: {id: 'HRB-001', path: '/tmp/q3-complete.mp4', sha256: H('a'),
    fpsNum: 30, fpsDen: 1, frameCount: 60, audioSampleRate: 44100, audioSampleCount: 88200},
  references: [{id: 'original-source-media', path: '/tmp/q3-original.mp4', sha256: H('b'), kind: 'original-media'},
    {id: 'saved-observations', path: '/tmp/q3-observations.json', sha256: H('c'), kind: 'saved-observations'}],
  clock: fixtureClock(),
  units: [unit('caption-a', 'caption', 0, 20, ['caption-observation-a', 'pcm-observation']),
    unit('no-caption-20-30', 'no-caption', 20, 30, ['gap-observation', 'pcm-observation']),
    unit('caption-b', 'caption', 30, 60, ['caption-observation-b', 'pcm-observation']),
    unit('connection-01', 'connection', 19, 31, ['connection-observation', 'pcm-observation'])],
  evidence: [evidence('caption-observation-a', 'saved-caption', 0, 20, ['caption-a']),
    evidence('caption-observation-b', 'saved-caption', 30, 60, ['caption-b']),
    evidence('gap-observation', 'saved-source-mapping', 20, 30, ['no-caption-20-30']),
    evidence('connection-observation', 'saved-display-plan', 19, 31, ['connection-01']),
    evidence('pcm-observation', 'completed-pcm-measurement', 0, 60, ['caption-a', 'no-caption-20-30', 'caption-b', 'connection-01'])],
  limitations: ['Fixture observations are not a human quality verdict.']});
}
function answer(packet) {
  return {schemaVersion: 'digest-quality-judgment-v001', inputSha256: packet.inputSha256, mediaSha256: packet.media.sha256,
    status: 'complete', processedUnits: packet.units.map(unit => ({unitId: unit.id, state: 'reviewed-with-available-evidence',
      evidenceIds: [...unit.evidenceIds], summary: 'Available evidence considered; visual meaning remains unobserved.'})),
    candidates: [], limitations: ['The supplied evidence is limited.'], failureReason: null};
}
function candidate() {
  return {id: 'candidate-a', unitIds: ['caption-a'], range: interval(5, 15), evidenceIds: ['caption-observation-a'],
    observedFacts: [{evidenceId: 'caption-observation-a', statement: 'The saved caption is present in this interval.'}],
    hypothesis: 'Reading this passage may need human confirmation.', missingInformation: ['Actual reading comfort is unobserved.'],
    normalExplanations: ['The present duration may already be appropriate.'], humanQuestion: 'Is this passage comfortable to read?',
    reflectionTargets: ['Caption presentation in a later authorized task.']};
}
function withCandidate(packet) { const reply = answer(packet); reply.candidates.push(candidate()); return reply; }

test('canonical hash is key-order independent, preserves array order and rejects non-JSON values', () => {
  assert.equal(canonicalHash({b: 2, a: [1, 2]}), canonicalHash({a: [1, 2], b: 2}));
  assert.notEqual(canonicalHash([1, 2]), canonicalHash([2, 1]));
  for (const invalid of [NaN, Infinity, -0, 9007199254740992, undefined, {a: undefined}, new Date(), [, 1], '\uD800']) {
    assert.throws(() => canonicalHash(invalid));
  }
  const cyclic = {}; cyclic.self = cyclic; assert.throws(() => canonicalHash(cyclic));
});

test('complete zero-candidate result is accepted without claiming media quality', () => {
  const packet = fixture(), reply = answer(packet), bytes = raw(reply);
  assert.equal(validateQualityInput(packet), packet);
  const result = validateQualityReply(packet, bytes);
  assert.equal(result.status, 'accepted'); assert.equal(result.reviewEligible, true);
  assert.deepEqual(result.counts, {units: 4, processedUnits: 4, candidates: 0});
  assert.deepEqual(structuredClone(result.reply), reply);
  assert.equal(result.rawReplySha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(Object.hasOwn(result, 'qualityPassed'), false);
});

test('input and response are not mutated; candidate fact keeps its actual evidence range', () => {
  const packet = fixture(), before = structuredClone(packet), reply = withCandidate(packet), bytes = raw(reply), original = Buffer.from(bytes);
  const result = validateQualityReply(packet, bytes);
  assert.deepEqual(packet, before); assert.deepEqual(bytes, original); assert.deepEqual(structuredClone(result.reply), reply);
  assert.deepEqual(packet.evidence[0].range, interval(0, 20));
  assert.deepEqual(structuredClone(result.reply.candidates[0].range), interval(5, 15));
});

test('explicit insufficient evidence counts as processed but not as newly observed media', () => {
  const packet = fixture(), reply = answer(packet);
  reply.processedUnits[0] = {unitId: 'caption-a', state: 'insufficient-evidence', evidenceIds: [], summary: 'New visual observation is unavailable.'};
  const result = validateQualityReply(packet, raw(reply));
  assert.equal(result.status, 'accepted'); assert.deepEqual(structuredClone(result.reply.processedUnits[0]), reply.processedUnits[0]);
});

for (const status of ['incomplete', 'failed']) test(`${status} retains partial work and raw hash, never enables review`, () => {
  const packet = fixture(), reply = withCandidate(packet);
  reply.status = status; reply.failureReason = 'The remaining units were not processed.';
  reply.processedUnits = reply.processedUnits.slice(0, 1);
  const result = validateQualityReply(packet, raw(reply));
  assert.equal(result.status, status); assert.equal(result.reviewEligible, false);
  assert.deepEqual(structuredClone(result.reply), reply); assert.equal(result.counts.candidates, 1);
});

const inputFaults = {
  'stale input hash': packet => { packet.limitations.push('Changed without rebinding.'); },
  'unknown top-level field': packet => { packet.extra = true; bind(packet); },
  'unknown media field': packet => { packet.media.extra = true; bind(packet); },
  'wrong clock media': packet => { packet.clock.mediaSha256 = H('b'); bind(packet); },
  'wrong completed clock length': packet => { packet.clock.completedFrameCount = 61; bind(packet); },
  'unknown clock field': packet => { packet.clock.extra = true; bind(packet); },
  'incomplete clock spans': packet => { packet.clock.spans.pop(); bind(packet); },
  'wrong clock span order': packet => { packet.clock.spans.reverse(); bind(packet); },
  'baseline gap in clock': packet => { packet.clock.spans[2].baselineRange.startFrame = 25; bind(packet); },
  'decoded audio shorter than video': packet => { packet.media.audioSampleCount = 88199; bind(packet); },
  'unknown unit field': packet => { packet.units[0].extra = true; bind(packet); },
  'unknown unit kind': packet => { packet.units[0].kind = 'scene'; bind(packet); },
  'no-caption ID changed from its range': packet => { packet.units[1].id = 'gap-renamed'; bind(packet); },
  'duplicate unit ID': packet => { packet.units[1].id = packet.units[0].id; bind(packet); },
  'missing no-caption coverage': packet => { packet.units.splice(1, 1); bind(packet); },
  'overlapping subtitle coverage': packet => { packet.units[0].range.endFrameExclusive = 21; packet.units[0].sourceParts = parts(0, 21); bind(packet); },
  'negative range': packet => { packet.units[0].range.startFrame = -1; bind(packet); },
  'fractional range': packet => { packet.units[0].range.startFrame = 0.5; bind(packet); },
  'outside media range': packet => { packet.units[2].range.endFrameExclusive = 61; bind(packet); },
  'unknown unit evidence': packet => { packet.units[0].evidenceIds.push('absent'); bind(packet); },
  'duplicate unit evidence': packet => { packet.units[0].evidenceIds.push(packet.units[0].evidenceIds[0]); bind(packet); },
  'duplicate reference ID': packet => { packet.references.push({...packet.references[0]}); bind(packet); },
  'missing source reference': packet => { packet.references.shift(); bind(packet); },
  'missing evidence reference': packet => { packet.evidence[0].referenceIds = ['absent']; bind(packet); },
  'duplicate evidence ID': packet => { packet.evidence.push({...packet.evidence[0]}); bind(packet); },
  'unknown evidence field': packet => { packet.evidence[0].extra = true; bind(packet); },
  'unknown evidence kind': packet => { packet.evidence[0].kind = 'semantic-certainty'; bind(packet); },
  'unrelated evidence range': packet => { packet.evidence[0].range = interval(30, 40); bind(packet); },
  'unknown evidence target': packet => { packet.evidence[0].unitIds = ['absent']; bind(packet); },
  'one-sided evidence link': packet => { packet.evidence[0].unitIds.push('connection-01'); bind(packet); },
  'missing source part': packet => { packet.units[1].sourceParts.pop(); bind(packet); },
  'inserted part with invented source': packet => { packet.units[1].sourceParts[1].baselineRange = interval(24, 28); bind(packet); },
  'inserted part with unknown connection': packet => { packet.units[1].sourceParts[1].connectionId = 'absent'; bind(packet); },
  'retained audio from a different clock': packet => { packet.units[0].sourceParts[0].originalAudio.sampleRate = 16000; bind(packet); },
  'retained decoded count changed': packet => { packet.units[0].sourceParts[0].originalVideo.decodedFrameIndices.count = 19; bind(packet); },
  'wrong shift with unchanged duration': packet => { packet.units[0].sourceParts[0].baselineRange.startFrame += 1; packet.units[0].sourceParts[0].baselineRange.endFrameExclusive += 1; bind(packet); },
  'repeated projection with unchanged audio duration': packet => { packet.units[2].sourceParts[0].originalAudio.startSample += 5880; packet.units[2].sourceParts[0].originalAudio.endSampleExclusive += 5880; bind(packet); },
};
for (const [name, mutate] of Object.entries(inputFaults)) test(`input rejects ${name}`, () => {
  const packet = fixture(); mutate(packet); assert.throws(() => validateQualityInput(packet), /quality/);
});

const replyFaults = {
  'wrong input hash': reply => { reply.inputSha256 = H('b'); },
  'wrong media hash including another revision': reply => { reply.mediaSha256 = H('b'); },
  'unknown top-level field': reply => { reply.score = 10; },
  'duplicate processed unit': reply => { reply.processedUnits.push({...reply.processedUnits[0]}); },
  'unknown processed unit': reply => { reply.processedUnits[0].unitId = 'absent'; },
  'complete missing processed unit': reply => { reply.processedUnits.pop(); },
  'unknown processed field': reply => { reply.processedUnits[0].extra = true; },
  'unrelated processed evidence': reply => { reply.processedUnits[0].evidenceIds = ['caption-observation-b']; },
  'reviewed unit without evidence': reply => { reply.processedUnits[0].evidenceIds = []; },
  'duplicate candidate ID': reply => { reply.candidates.push(structuredClone(reply.candidates[0])); },
  'unknown candidate field': reply => { reply.candidates[0].qualityScore = 1; },
  'unknown candidate unit': reply => { reply.candidates[0].unitIds = ['absent']; },
  'duplicate candidate unit': reply => { reply.candidates[0].unitIds.push('caption-a'); },
  'candidate outside media': reply => { reply.candidates[0].range.endFrameExclusive = 61; },
  'candidate empty range': reply => { reply.candidates[0].range.endFrameExclusive = 5; },
  'candidate unrelated unit': reply => { reply.candidates[0].unitIds = ['caption-b']; },
  'candidate partly outside nominated unit': reply => { reply.candidates[0].range = interval(5, 21); },
  'candidate nominated union has a gap': reply => { reply.candidates[0].unitIds = ['caption-a', 'caption-b']; reply.candidates[0].range = interval(5, 40); },
  'unknown candidate evidence': reply => { reply.candidates[0].evidenceIds = ['absent']; },
  'candidate evidence from unrelated time': reply => { reply.candidates[0].evidenceIds = ['caption-observation-b']; },
  'duplicate candidate evidence': reply => { reply.candidates[0].evidenceIds.push('caption-observation-a'); },
  'fact without included evidence': reply => { reply.candidates[0].observedFacts[0].evidenceId = 'pcm-observation'; },
  'fact unknown field': reply => { reply.candidates[0].observedFacts[0].confidence = 1; },
  'empty observed facts': reply => { reply.candidates[0].observedFacts = []; },
  'empty normal explanations': reply => { reply.candidates[0].normalExplanations = []; },
  'empty missing information': reply => { reply.candidates[0].missingInformation = []; },
  'empty reflection targets': reply => { reply.candidates[0].reflectionTargets = []; },
  'empty hypothesis': reply => { reply.candidates[0].hypothesis = ' '; },
  'complete with failure reason': reply => { reply.failureReason = 'failure'; },
  'failed without reason': reply => { reply.status = 'failed'; },
  'partial candidate targets unprocessed unit': reply => { reply.status = 'incomplete'; reply.failureReason = 'Not all processed'; reply.processedUnits.shift(); },
};
for (const [name, mutate] of Object.entries(replyFaults)) test(`reply rejects ${name}`, () => {
  const packet = fixture(), reply = withCandidate(packet); mutate(reply);
  assert.throws(() => validateQualityReply(packet, raw(reply)), /quality/);
});

test('candidate evidence must overlap both the candidate and a related nominated unit', () => {
  const packet = fixture(), reply = withCandidate(packet);
  packet.evidence.push({id: 'only-connection-observation', kind: 'completed-pixel-measurement', range: interval(10, 25), unitIds: ['connection-01'],
    method: 'limited saved pixel measurement', facts: {count: 1}, limitations: ['Only the connection is measured.'], referenceIds: ['saved-observations']});
  packet.units[3].evidenceIds.push('only-connection-observation'); bind(packet); reply.inputSha256 = packet.inputSha256;
  reply.candidates[0].evidenceIds = ['only-connection-observation'];
  reply.candidates[0].observedFacts[0].evidenceId = 'only-connection-observation';
  assert.throws(() => validateQualityReply(packet, raw(reply)), /unrelated to its nominated units/);
});

test('candidate can span adjacent nominated units with narrower attributed evidence', () => {
  const packet = fixture(), reply = withCandidate(packet), point = reply.candidates[0];
  point.unitIds = ['caption-a', 'no-caption-20-30']; point.range = interval(10, 25);
  point.evidenceIds.push('gap-observation');
  point.observedFacts.push({evidenceId: 'gap-observation', statement: 'A saved no-caption interval follows.'});
  assert.equal(validateQualityReply(packet, raw(reply)).status, 'accepted');
});

test('strict wire reader rejects duplicate keys, fractions, fences, trailing content, invalid UTF-8 and BOM', () => {
  const packet = fixture(), reply = withCandidate(packet), json = JSON.stringify(reply);
  const invalid = [Buffer.from(json.replace('"status":"complete"', '"status":"complete","status":"complete"')),
    Buffer.from(json.replace('"startFrame":5', '"startFrame":5.5')), Buffer.from(`\`\`\`json\n${json}\n\`\`\``),
    Buffer.from(`${json} {}`), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(json)]),
    Buffer.from([0xff, 0xfe]), Buffer.from('{"unclosed":'), Buffer.from(json.replace('"startFrame":5', '"startFrame":-0'))];
  for (const bytes of invalid) assert.throws(() => validateQualityReply(packet, bytes), /malformed JSON/);
  assert.throws(() => validateQualityReply(packet, json), /raw UTF-8 bytes required/);
});

test('raw reply hashes preserve whitespace differences without changing accepted content', () => {
  const packet = fixture(), reply = answer(packet);
  const compact = validateQualityReply(packet, raw(reply));
  const pretty = validateQualityReply(packet, Buffer.from(JSON.stringify(reply, null, 2) + '\n'));
  assert.deepEqual(compact.reply, pretty.reply); assert.notEqual(compact.rawReplySha256, pretty.rawReplySha256);
});

test('AAC decoder padding after the video is allowed and retained', () => {
  const packet = fixture(); packet.media.audioSampleCount = 89088; bind(packet);
  assert.equal(validateQualityInput(packet).media.audioSampleCount, 89088);
});

test('reused audio remains a retained-span observation and cannot claim inserted silence', () => {
  const packet = fixture(); packet.evidence[0].kind = 'reused-audio-observation'; bind(packet);
  assert.equal(validateQualityInput(packet), packet);
  packet.evidence[2].kind = 'reused-audio-observation'; bind(packet);
  assert.throws(() => validateQualityInput(packet), /historical audio must be split/);
});

test('actual reference verification detects missing files, changed bytes and conflicting path hashes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-q3-validation-'));
  try {
    const packet = fixture(), refs = [packet.media, ...packet.references];
    for (const [index, ref] of refs.entries()) {
      const bytes = Buffer.from(`local fixture ${index}`); ref.path = path.join(directory, `file-${index}`);
      await writeFile(ref.path, bytes); ref.sha256 = createHash('sha256').update(bytes).digest('hex');
    }
    packet.clock.mediaSha256 = packet.media.sha256; bind(packet);
    const checked = await verifyReferences(packet); assert.equal(checked.status, 'verified');
    assert.equal(checked.references.length, 3); assert.equal(checked.references[0].bytes, 15);
    assert.equal(await validateQualityInput(packet, {verifyFiles: true}), packet);
    const conflict = structuredClone(packet); conflict.references[0].path = conflict.media.path; bind(conflict);
    await assert.rejects(verifyReferences(conflict), /conflicting hashes/);
    await writeFile(packet.references[0].path, 'changed'); await assert.rejects(verifyReferences(packet), /SHA mismatch/);
    await rm(packet.references[0].path); await assert.rejects(verifyReferences(packet), /ENOENT/);
  } finally { await rm(directory, {recursive: true, force: true}); }
});
