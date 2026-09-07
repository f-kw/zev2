import test from 'node:test';
import assert from 'node:assert/strict';
import {assertInternalRetentionInputV001, runInternalRetentionV001} from '../../runner/src/skills/candidate-internal-retention-v001.js';
import {validateInternalRetentionIdsV001, resolveInternalRetentionV001, resolveInternalCutEndpointV001,
  validateInternalRetentionProvenanceV001} from './candidate_internal_retention_validation_v001.mts';
import {formal, sha, canonicalSha} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {validateInternalDisplayV001} from './candidate_internal_edit_core_v001.mts';
import {PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001} from './presentation_renderer_text_layout_v001.mjs';
import {readByteJson} from './run_candidate_internal_edit_v001.mts';

const input = () => ({schemaVersion: 'candidate-internal-retention-input-v001' as const, taskDescription: '意味を保つ',
  candidates: [{candidateId: 'c1', title: '発見と反応', highlightReason: '前提から結論へ',
    utterances: [{utteranceId: 'u1', atoms: [1, 2, 3, 4].map(sourceSegmentId => ({sourceSegmentId, text: String(sourceSegmentId)}))}]}]});
const block = (action: 'keep' | 'drop', first: number, last: number) => ({action,
  startSourceSegmentId: first, endSourceSegmentId: last, roles: [action === 'keep' ? 'reaction' : 'duplicate'], reason: '意味上の理由'});
const result = () => ({schemaVersion: 'candidate-internal-retention-result-v001', skillId: 'candidate-internal-retention',
  skillVersion: 'v001', answer: {status: 'complete', candidates: [{candidateId: 'c1', meaningPreserved: '前提と反応を保持',
    blocks: [block('keep', 1, 2), block('drop', 3, 3), block('keep', 4, 4)]}]}});
const parents = [{candidateId: 'c1', sourceSegmentIds: [1, 2, 3, 4], sourceInterval: {sourceStartMs: 100, sourceEndMs: 900}}];
const chunks = [{units: [1, 2, 3, 4].map((id, i) => ({unitId: `w${id}`, sourceSegmentIds: [id],
  startBoundary: {before: id - 1, after: id}, endBoundary: {before: id, after: id + 1},
  startTimeRole: 'acoustic-token-boundary', startMs: 100 + i * 200, endMs: 250 + i * 200, timeOrigin: 'observed'}))}];
test('new judgment receives only text and IDs; result cannot mutate input', async () => {
  const original = input(); let calls = 0;
  const r = await runInternalRetentionV001(original, async received => {
    calls++; received.candidates[0].utterances[0].atoms[0].text = 'changed'; return result().answer;
  });
  assert.equal(calls, 1); assert.equal(original.candidates[0].utterances[0].atoms[0].text, '1');
  assert.equal(r.skillId, 'candidate-internal-retention');
});
for (const field of ['startMs', 'durationMs', 'cuttableBoundaries']) test(`input rejects ${field}`, () => {
  const v: any = input(); v.candidates[0][field] = [0, 1]; assert.throws(() => assertInternalRetentionInputV001(v));
});
test('ordered full accounting promotes exact observed cuts and inherited old edges', () => {
  const token = validateInternalRetentionIdsV001(input(), result());
  const r = resolveInternalRetentionV001(token, parents, chunks);
  assert.equal(r.status, 'resolved');
  assert.deepEqual(r.segments!.map(s => [s.sourceStartMs, s.sourceEndMs]), [[100, 450], [700, 900]]);
  assert.equal(r.segments![0].cutBoundaryEvidence.start.status, 'inherited-parent-edge');
});
test('detached token and later result mutation cannot change validated ranges', () => {
  const answer = result(), token = validateInternalRetentionIdsV001(input(), answer);
  answer.answer.candidates[0].blocks[0].endSourceSegmentId = 4;
  assert.equal(resolveInternalRetentionV001(token, parents, chunks).segments![0].sourceEndMs, 450);
  assert.throws(() => resolveInternalRetentionV001({...token}, parents, chunks), /VALIDATED_INTERNAL_RETENTION_REQUIRED/);
});
for (const [name, mutate] of [
  ['unknown ID', (r: any) => r.answer.candidates[0].blocks[0].startSourceSegmentId = 99],
  ['unexplained gap', (r: any) => r.answer.candidates[0].blocks[1].startSourceSegmentId = 4],
  ['overlap', (r: any) => r.answer.candidates[0].blocks[1].startSourceSegmentId = 2],
  ['reversed range', (r: any) => r.answer.candidates[0].blocks[1].endSourceSegmentId = 2],
  ['missing tail', (r: any) => r.answer.candidates[0].blocks.pop()],
  ['different candidate', (r: any) => r.answer.candidates[0].candidateId = 'other'],
  ['whole candidate dropped', (r: any) => r.answer.candidates[0].blocks = [block('drop', 1, 4)]],
  ['free absolute time', (r: any) => r.answer.candidates[0].blocks[0].startMs = 123],
] as const) test(`refuses ${name}`, () => {
  const r = result(); mutate(r); assert.throws(() => validateInternalRetentionIdsV001(input(), r));
});
test('token interior refuses the whole proposal, without dropping necessary block or moving cut', () => {
  const c = structuredClone(chunks); c[0].units[1].endBoundary.before = 3;
  const r = resolveInternalRetentionV001(validateInternalRetentionIdsV001(input(), result()), parents, c);
  assert.equal(r.status, 'requires-new-meaning-judgment'); assert.deepEqual(r.promotedSegments, []);
  assert.equal(r.rejectedProposal![0].blocks.filter((b: any) => b.action === 'keep').length, 2);
});
test('window origin, duplicate observation, zero-length unit and outside-parent observation are unresolved', () => {
  for (const mutate of [
    (c: any) => {c[0].units[3].startTimeRole = 'alignment-window-origin-not-speech-onset';},
    (c: any) => {c[0].units.push(structuredClone(c[0].units[3]));},
    (c: any) => {c[0].units[3].startMs = c[0].units[3].endMs;},
    (c: any) => {c[0].units[3].startMs = 99;},
  ]) {const c = structuredClone(chunks); mutate(c); assert.equal(resolveInternalCutEndpointV001(4, 'start', parents[0], c).status, 'unresolved');}
});
test('source membership cannot be changed after meaning validation', () => {
  const p = structuredClone(parents); p[0].sourceSegmentIds = [1, 2, 3, 5];
  assert.throws(() => resolveInternalRetentionV001(validateInternalRetentionIdsV001(input(), result()), p, chunks), /PARENT_SOURCE_MEMBERSHIP_CHANGED/);
});
test('judgment envelope must bind exact request bytes and exact answer', () => {
  const request = {input: input()}, r = result();
  const response = {schemaVersion: 'candidate-internal-retention-response-v001', requestFileSha256: sha(formal(request)), answer: r.answer, judgmentNote: '新規判断'};
  validateInternalRetentionProvenanceV001(request, response, r, input());
  assert.throws(() => validateInternalRetentionProvenanceV001(request, {...response, requestFileSha256: '0'.repeat(64)}, r, input()));
  assert.throws(() => validateInternalRetentionProvenanceV001(request, {...response, answer: {status: 'abstained'}}, r, input()));
});
test('display validation requires complete grounded cues with exact provenance', () => {
  const input = {schemaVersion: 'presentation-zevo-caption-selection-input-v001', taskDescription: '表示区切り',
    captions: [{captionId: 'caption', boundaryCandidates: [{boundaryId: 'b1', text: 'あ'}, {boundaryId: 'b2', text: 'い'}]}],
    styleLimits: {maxLogicalWidthPerLine: 10, maxLinesPerCue: 2, characterWidthRule: PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001}};
  const request = {input, inputCanonicalSha256: canonicalSha(input)};
  const answer = {status: 'complete', captions: [{captionId: 'caption', cues: [{cueEndBoundaryId: 'b2', lineEndBoundaryIds: ['b2']}]}]};
  const r = {schemaVersion: 'caption-display-skill-result-v001', skillId: 'caption-display-boundaries', skillVersion: 'v001', answer};
  const response = {schemaVersion: 'candidate-internal-edit-display-response-v001', requestFileSha256: sha(formal(request)), answer, judgmentNote: '表示単位'};
  validateInternalDisplayV001(request, response, r);
  const wrong = structuredClone(r); wrong.answer.captions[0].cues[0] = {cueEndBoundaryId: 'b1', lineEndBoundaryIds: ['b1']};
  assert.throws(() => validateInternalDisplayV001(request, {...response, answer: wrong.answer}, wrong), /DISPLAY_FULL_COVERAGE_REQUIRED/);
});
test('original acoustic raw JSON is read without changing numeric representation and rejects changed SHA', async () => {
  const binding = {path: 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/acoustic-observation-chunk-0198-v001.json',
    fileSha256: 'ef125a04ca5d14e6295615d30ebfdfbc649d20ab6730294cb72566613d35bc3b'};
  assert.equal((await readByteJson(binding)).chunkIndex, 198);
  await assert.rejects(readByteJson({...binding, fileSha256: '0'.repeat(64)}), /INPUT_BYTES_CHANGED/);
});
