import test from 'node:test';
import assert from 'node:assert/strict';
import {readJson, formal, canonicalSha, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {revisePhase2DisplayInput} from './digest_v1_phase2_caption_revision.mts';
import {serializePhase2Timing} from './digest_v1_phase2_manufacturing.mts';
import {validatePhase2Display} from './digest_v1_phase2_captions.mts';

test('限定改訂は入力指示だけを変更し、本文・正式ID・順序・書式を保存する', () => {
  const input: Json = {schemaVersion: 'presentation-zevo-caption-selection-input-v001', taskDescription: '通常の反復語は分割しない',
    captions: [{captionId: 'caption', boundaryCandidates: [{boundaryId: 'end', text: '猫猫'}]}],
    styleLimits: {maxLogicalWidthPerLine: 36, maxLinesPerCue: 2, characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2'}};
  const original = {textInput: {atoms: ['猫', '猫']}, promptInput: input,
    requests: [{requestId: 'range', input, inputCanonicalSha256: canonicalSha(input)}],
    request: {requestId: 'all', input, inputCanonicalSha256: canonicalSha(input)}};
  const bytes = formal(original), revised = revisePhase2DisplayInput(original, {path: 'authority'}, {path: 'previous'});
  assert.equal(formal(original), bytes);
  for (const r of [revised.promptInput, revised.request.input, revised.requests[0].input]) {
    assert.deepEqual(r.captions, input.captions); assert.deepEqual(r.styleLimits, input.styleLimits);
    assert(r.taskDescription.startsWith(input.taskDescription));
  }
  assert.deepEqual(revised.textInput, original.textInput);
  assert.equal(revised.request.inputCanonicalSha256, canonicalSha(revised.request.input));
});

test('未観測の任意診断欄だけを欠落表現にして、実測・採用時刻を改変しない', () => {
  const row = {resolution: {sourceStartMs: 10, sourceEndMs: 20, observedStartMs: undefined,
    observedEndMs: 20, startResolution: {status: 'unresolved', reason: 'not-observed'}}};
  const input = {originalRows: [row], cues: [row]}, output = serializePhase2Timing(input);
  assert.equal(output.absentOptionalObservationPaths.length, 2);
  assert.deepEqual(output.timing.cues[0].resolution, {sourceStartMs: 10, sourceEndMs: 20,
    observedEndMs: 20, startResolution: {status: 'unresolved', reason: 'not-observed'}});
  assert(Object.hasOwn(input.cues[0].resolution, 'observedStartMs'));
});

test('採用時刻や別欄が未定義なら黙って落とさず拒否する', () => {
  for (const input of [{cues: [{resolution: {sourceStartMs: undefined}}]}, {unrelated: undefined}])
    assert.throws(() => serializePhase2Timing(input), /UNEXPECTED_MISSING_TIMING_VALUE/);
});

test('保存された追加判断は12区間を全量被覆し、17個の継続字幕も既存容量内', {skip: !process.env.PHASE2_ENDPOINT_JOB}, async () => {
  const job = await readJson(process.env.PHASE2_ENDPOINT_JOB!);
  const root = job.outputRoot, request = await readJson(`${root}/display-all-request-v002.json`);
  const requests = await Promise.all(Array.from({length: request.input.captions.length}, (_, i) => readJson(`${root}/display-${i + 1}-request-v002.json`)));
  const response = await readJson(`${root}/display-all-response-v002.json`), result = await readJson(`${root}/display-all-result-v002.json`);
  const traces = validatePhase2Display({request, requests}, response, result);
  assert.equal(traces.length, 12); assert.equal(traces.reduce((n, t) => n + t.cues.length, 0), 325);
  const authoring = await readJson(`${root}/display-judgment-authoring-v002.json`);
  const continuations = authoring.cueInterpretations.filter((c: Json) => c.kind.startsWith('nonlexical'));
  assert.equal(continuations.length, 17);
  assert(continuations.every((c: Json) => c.kind.includes('not-a-meaning-boundary')));
  assert.equal(authoring.requestFileSha256, response.requestFileSha256);
});
