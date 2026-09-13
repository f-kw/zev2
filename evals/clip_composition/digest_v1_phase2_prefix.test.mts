import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalSha, sha, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {validateAcousticChunkV001} from './digest_acoustic_timing_validation_v001.mts';
import {validateSupplementalEndpointPrefixEvidenceV1} from './digest_v1_phase2_prefix.mts';
import {loadPhase2EndpointEvidence, resolvePhase2EndpointRanges, resolvePhase2CutEndpoint}
  from './digest_v1_phase2_endpoints.mts';

function fixture() {
  const formalText = {path: 'fixture/formal.json', fileSha256: 'a'.repeat(64)};
  const observationRef = {path: 'fixture/observation.json', fileSha256: 'b'.repeat(64)};
  const chunk = {index: 0, startMs: 10000, endMs: 13000,
    audioBinding: {path: 'fixture/audio.flac', fileSha256: 'c'.repeat(64)}, rawTextBinding: formalText,
    atoms: [...'あいうえ'].map((text, i) => ({sourceSegmentId: i + 1, text})), text: 'あいうえ'};
  const observation = {chunkIndex: 0, audioSamples: 48000, sampleRate: 16000, numFrames: 300,
    textTokens: [1, 2, 3, 4], words: [...'あいうえ'].map((word, i) => ({word, tokens: [i + 1],
      start: [0, 1, 2, 2.8][i], end: [.5, 1.5, 2.5, 3.08][i], probability: 1}))};
  const parent = {sourceSegmentIds: [1, 2, 3, 4], sourceInterval: {sourceStartMs: 9000, sourceEndMs: 14000}};
  const bindings = {formalText, observation: observationRef};
  return {chunk, observation, parent, bindings};
}
function run(f: ReturnType<typeof fixture>, target = 2, overrides: Json = {}) {
  let reason = '';
  try {validateAcousticChunkV001(f.chunk, f.observation);} catch (error) {reason = String(error);}
  return validateSupplementalEndpointPrefixEvidenceV1(f.chunk, f.observation, target, f.parent,
    {status: 'rejected', reason, observationBinding: f.bindings.observation, ...overrides}, f.bindings);
}

test('derives maximal complete prefix from original rejection without changing audio, words, text, or time', () => {
  const f = fixture(), before = canonicalSha(f), proof = run(f);
  assert.equal(proof.firstInvalidWordOrdinal, 4); assert.equal(proof.maximalValidPrefixWordCount, 3);
  assert.deepEqual(proof.firstInvalidWord, f.observation.words[3]);
  assert.deepEqual(proof.projectedObservation.words, f.observation.words.slice(0, 3));
  assert.deepEqual(proof.projectedObservation.textTokens, f.observation.textTokens.slice(0, 3));
  assert.equal(proof.projectedChunk.startMs, f.chunk.startMs); assert.equal(proof.projectedChunk.endMs, f.chunk.endMs);
  assert.equal(proof.projectedObservation.audioSamples, f.observation.audioSamples);
  assert.equal(proof.targetRawWord.start, f.observation.words[1].start);
  assert.equal(proof.resolvedSourceMs, f.chunk.startMs + f.observation.words[1].start * 1000);
  assert.equal(proof.fullValidationStatus, 'rejected'); assert.equal(proof.fullObservationPromoted, false);
  assert.equal(canonicalSha(f), before);
  assert.throws(() => validateAcousticChunkV001(f.chunk, f.observation), /ACOUSTIC_TIME_ORDER_INVALID/);
});

test('refuses a target at or after the first invalid word, including earlier time reversal', () => {
  assert.throws(() => run(fixture(), 4), /TARGET/);
  const firstBad = fixture(); firstBad.observation.words[0].end = 3.1;
  assert.throws(() => run(firstBad), /NO_VALID_WORD_PREFIX/);
  const reverse = fixture(); reverse.observation.words[1].start = .25;
  assert.throws(() => run(reverse, 3), /TARGET/);
  for (const n of [NaN, Infinity]) {
    const f = fixture(); f.observation.words[1].start = n;
    assert.throws(() => run(f), /TARGET/);
  }
});

test('refuses incomplete atom boundaries, changed text or tokens, missing and duplicated source IDs', () => {
  const boundary = fixture(); boundary.chunk.atoms = [
    {sourceSegmentId: 1, text: 'あ'}, {sourceSegmentId: 2, text: 'い'}, {sourceSegmentId: 3, text: 'うえ'}];
  assert.throws(() => run(boundary), /NOT_AT_COMPLETE_SOURCE_BOUNDARY/);
  const text = fixture(); text.chunk.atoms[1].text = '異';
  assert.throws(() => run(text), /FULL_TEXT_CHANGED/);
  const word = fixture(); word.observation.words[1].word = '異';
  assert.throws(() => run(word), /OBSERVED_TEXT_CHANGED/);
  const token = fixture(); token.observation.textTokens[1] = 99;
  assert.throws(() => run(token), /FULL_TOKENS_CHANGED/);
  for (const changed of [9, 1]) {
    const id = fixture(); id.chunk.atoms[1].sourceSegmentId = changed;
    assert.throws(() => run(id), /SOURCE_ID_ORDER_INVALID/);
  }
});

test('refuses window-origin, nonpositive targets, outside-parent starts and altered evidence bindings', () => {
  assert.throws(() => run(fixture(), 1), /WINDOW_ORIGIN/);
  const zero = fixture(); zero.observation.words[1].end = zero.observation.words[1].start;
  assert.throws(() => run(zero), /TARGET_TIME_INVALID/);
  const outside = fixture(); outside.parent.sourceInterval.sourceStartMs = 11000;
  assert.throws(() => run(outside), /OUTSIDE_PARENT/);
  assert.throws(() => run(fixture(), 2, {observationBinding: {path: 'fixture/changed.json', fileSha256: 'b'.repeat(64)}}), /RAW_BINDING_CHANGED/);
  const formal = fixture(); formal.chunk.rawTextBinding = {...formal.chunk.rawTextBinding, fileSha256: 'f'.repeat(64)};
  assert.throws(() => run(formal), /FORMAL_TEXT_BINDING_CHANGED/);
  assert.throws(() => run(fixture(), 2, {status: 'validated'}), /ORIGINAL_REJECTION_REQUIRED/);
});

test('endpoint resolver limits prefix evidence to its authorized start and rejects duplicate targets', () => {
  const f = fixture(), proof = run(f), originalUnit = {...proof.targetUnit, startTimeRole: 'alignment-window-origin-not-speech-onset'};
  const original = {kind: 'original' as const, chunks: [{units: [originalUnit], observationBinding: f.bindings.observation}]};
  const projected = {units: proof.prefixValidatorResult.units, observationBinding: f.bindings.observation,
    endpointPrefixEvidence: {targetSourceSegmentId: 2, evidenceScope: 'target-start-endpoint-only'}};
  const supplemental = {kind: 'supplemental' as const, chunks: [projected]};
  assert.equal(resolvePhase2CutEndpoint(2, 'start', f.parent, original, supplemental).resolutionMethod,
    'rejected-window-maximal-valid-prefix-start-boundary');
  assert.equal(resolvePhase2CutEndpoint(2, 'start', f.parent, original,
    {...supplemental, chunks: [projected, projected]}).status, 'unresolved');
  assert.equal(resolvePhase2CutEndpoint(2, 'start', f.parent, original,
    {...supplemental, chunks: [{...projected, endpointPrefixEvidence: {...projected.endpointPrefixEvidence, targetSourceSegmentId: 3}}]}).status, 'unresolved');
});

test('saved data keeps full rejection and resolves all endpoints from unchanged raw evidence',
  {skip: !process.env.PHASE2_ENDPOINT_JOB}, async () => {
    const c = await loadPhase2EndpointEvidence(process.env.PHASE2_ENDPOINT_JOB!);
    assert.equal(c.prefixArtifacts.length, 1);
    const proof = c.prefixArtifacts[0].artifact;
    const raw = JSON.parse(await readFile(proof.rawObservationBinding.path, 'utf8'));
    const preflight = JSON.parse(await readFile(proof.rawPreflightBinding.path, 'utf8'));
    const chunk = preflight.chunks.find((x: Json) => x.index === raw.chunkIndex);
    assert.throws(() => validateAcousticChunkV001(chunk, raw), /ACOUSTIC_TIME_ORDER_INVALID/);
    const invalid = raw.words[proof.firstInvalidWordOrdinal - 1];
    assert.deepEqual(proof.firstInvalidWord, invalid); assert(invalid.end * 1000 > proof.audioDurationMs);
    const target = raw.words[proof.targetWordOrdinal - 1];
    assert.deepEqual(proof.targetRawWord, target);
    assert.equal(proof.resolvedSourceMs, chunk.startMs + Math.round(target.start * 1000));
    assert(proof.targetWordOrdinal < proof.firstInvalidWordOrdinal);
    const result = resolvePhase2EndpointRanges(c, c.original, c.supplemental);
    assert.equal(result.status, 'resolved');
    assert.equal(result.candidates.length, c.retentionResult.answer.candidates.length);
    assert.equal(result.segments.length, c.retentionResult.answer.candidates.reduce((n: number, row: Json) =>
      n + row.blocks.filter((b: Json) => b.action === 'keep').length, 0));
    for (const ref of c.decision.frozenArtifacts) assert.equal(sha(await readFile(ref.path)), ref.fileSha256);
  });
