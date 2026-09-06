import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAcousticChunkV001, resolveAcousticCueV001, retainUnresolvedTimingV001} from './digest_acoustic_timing_validation_v001.mts';
const chunk = {index: 4, startMs: 120000, endMs: 150000, text: 'もうもう!',
  atoms: [...'もうもう!'].map((text, i) => ({sourceSegmentId: i + 20, text}))};
const observation = {chunkIndex: 4, audioSamples: 480000, sampleRate: 16000, textTokens: [1, 1, 2],
  words: [{word: 'もう', tokens: [1], start: 2, end: 3, probability: .9},
    {word: 'もう', tokens: [1], start: 4, end: 5, probability: .8}, {word: '!', tokens: [2], start: 5, end: 5, probability: .7}]};
const interval = {sourceStartMs: 120000, sourceEndMs: 150000};
test('repeated text is grounded by complete ordered IDs, with actual local-to-source offset', () => {
  const valid = validateAcousticChunkV001(chunk, observation);
  const cue = resolveAcousticCueV001([22, 23, 24], [valid], interval);
  assert.equal(cue.status, 'resolved');
  assert.deepEqual([cue.sourceStartMs, cue.sourceEndMs], [124000, 125000]);
});
test('a character inside a multi-character acoustic token has no invented time', () => {
  const cue = resolveAcousticCueV001([21], [validateAcousticChunkV001(chunk, observation)], interval, {sourceStartMs: 122500, sourceEndMs: 123500});
  assert.equal(cue.status, 'partial');
  assert.equal(cue.startResolution?.status, 'unresolved');
  assert.deepEqual([cue.sourceStartMs, cue.sourceEndMs], [122500, 123000]);
});
test('punctuation with zero duration is preserved but cannot become a positive standalone cue', () => {
  assert.equal(resolveAcousticCueV001([24], [validateAcousticChunkV001(chunk, observation)], interval).status, 'unresolved');
});
test('corrected cue intersects existing composition without changing the media interval', () => {
  const cue = resolveAcousticCueV001([20, 21], [validateAcousticChunkV001(chunk, observation)], {sourceStartMs: 122500, sourceEndMs: 150000});
  assert.equal(cue.sourceStartMs, 122500); assert.equal(cue.observedStartMs, 122000);
  assert.equal(cue.intersectionWithUnchangedComposition, true);
});
for (const [name, mutate] of [
  ['text change', (o: any) => o.words[0].word = 'まだ'],
  ['token mismatch', (o: any) => o.textTokens.pop()],
  ['wrong chunk', (o: any) => o.chunkIndex++],
  ['backwards time', (o: any) => o.words[1].start = 1],
  ['time outside audio', (o: any) => o.words[2].end = 31],
  ['invalid number', (o: any) => o.words[0].start = NaN],
  ['audio length mismatch', (o: any) => o.audioSamples--],
] as const) test(`rejects ${name}`, () => {const o = structuredClone(observation); mutate(o); assert.throws(() => validateAcousticChunkV001(chunk, o));});
test('rejects duplicate or discontinuous source IDs', () => {
  for (const id of [20, 99]) {const c = structuredClone(chunk); c.atoms[1].sourceSegmentId = id; assert.throws(() => validateAcousticChunkV001(c, observation));}
});
test('ambiguous repeated observation cannot be promoted', () => {
  const valid = validateAcousticChunkV001(chunk, observation);
  assert.equal(resolveAcousticCueV001([20, 21], [valid, valid], interval).status, 'unresolved');
});
test('cue cannot silently skip or reorder source IDs', () => {
  const valid = validateAcousticChunkV001(chunk, observation);
  for (const ids of [[20, 22], [22, 21], [20, 20]]) assert.throws(() => resolveAcousticCueV001(ids, [valid], interval));
});
test('DTW window origin is not a measured first speech onset', () => {
  const o = structuredClone(observation); o.words[0].start = 0;
  const cue = resolveAcousticCueV001([20, 21], [validateAcousticChunkV001(chunk, o)], interval, {sourceStartMs: 121000, sourceEndMs: 124000});
  assert.equal(cue.status, 'partial');
  assert.equal(cue.startResolution?.status, 'unresolved');
  assert.deepEqual([cue.sourceStartMs, cue.sourceEndMs], [121000, 123000]);
});
test('an unresolved endpoint prevents conflict without discarding unrelated measured endpoints', () => {
  const resolved = (start: number, end: number) => ({status: 'resolved', sourceStartMs: start, sourceEndMs: end,
    startResolution: {status: 'resolved', sourceMs: start}, endResolution: {status: 'resolved', sourceMs: end}});
  const cues = [
    {timelineSegmentId: 'one', oldStartMs: 0, oldEndMs: 10, resolution: {status: 'unresolved'}},
    {timelineSegmentId: 'one', oldStartMs: 10, oldEndMs: 20, resolution: resolved(5, 15)},
    {timelineSegmentId: 'one', oldStartMs: 20, oldEndMs: 30, resolution: resolved(15, 25)},
  ];
  const result = retainUnresolvedTimingV001(cues);
  assert.deepEqual(result.map(c => c.resolution.status), ['unresolved', 'partial', 'resolved']);
  assert.equal(result[1].resolution.startResolution.notPromotedObservation.sourceMs, 5);
  assert.deepEqual([result[1].resolution.sourceStartMs, result[1].resolution.sourceEndMs], [10, 15]);
  assert.equal(cues[1].resolution.status, 'resolved');
});
