import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bind, formal, sha, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {phase2DiscoveryRequest, resolvePhase2Discovery, buildPhase2RetentionInput} from './digest_v1_phase2_semantics.mts';
import {resolvePhase2CutEndpoint, resolvePhase2EndpointRanges, loadPhase2EndpointEvidence,
  type EndpointCollection} from './digest_v1_phase2_endpoints.mts';

const parent = {sourceSegmentIds: [1, 2, 3, 4, 5], sourceInterval: {sourceStartMs: 1000, sourceEndMs: 5500}};
const observationBinding = {path: 'fixture/observation.json', fileSha256: 'a'.repeat(64)};
function unit(id: number, startMs: number, endMs: number, origin = false): Json {
  return {unitId: `fixture-unit-${id}`, sourceSegmentIds: [id], startMs, endMs,
    startBoundary: {before: id - 1, after: id}, endBoundary: {before: id, after: id + 1},
    startTimeRole: origin ? 'alignment-window-origin-not-speech-onset' : 'acoustic-token-boundary',
    timeOrigin: 'fixed-text-acoustic-token-group'};
}
function collection(kind: EndpointCollection['kind'], units: Json[]): EndpointCollection {
  return {kind, chunks: [{units, observationBinding}]};
}
const empty = collection('supplemental', []);

test('window-origin stays unresolved without evidence; one valid centered start resolves', () => {
  const original = collection('original', [unit(2, 2000, 2200, true)]);
  assert.equal(resolvePhase2CutEndpoint(2, 'start', parent, original, empty).status, 'unresolved');
  const observed = collection('supplemental', [unit(2, 2050, 2200)]);
  const result = resolvePhase2CutEndpoint(2, 'start', parent, original, observed);
  assert.equal(result.sourceMs, 2050); assert.equal(result.supplementalObservation, true);
  assert.equal(result.originalFailureReason, 'window-origin-is-not-speech-onset');
  assert.deepEqual(result.observationBinding, observationBinding);
  assert.equal(original.chunks[0].units[0].startMs, 2000);
  for (const units of [[], [unit(2, 2050, 2200), unit(2, 2060, 2200)], [unit(2, 2050, 2200, true)]])
    assert.equal(resolvePhase2CutEndpoint(2, 'start', parent, original, collection('supplemental', units)).status, 'unresolved');
});

test('unique zero-duration end uses the observed boundary; zero-duration start is never rescued', () => {
  const original = collection('original', [unit(4, 4200, 4200)]);
  const end = resolvePhase2CutEndpoint(4, 'end', parent, original, empty);
  assert.equal(end.sourceMs, 4200); assert.equal(end.unitDurationMs, 0);
  assert.equal(end.resolutionMethod, 'zero-duration-unit-end-boundary');
  assert.equal(end.individualCharacterAcousticTime, 'not-claimed');
  assert.equal(resolvePhase2CutEndpoint(4, 'start', parent, original,
    collection('supplemental', [unit(4, 4100, 4300)])).status, 'unresolved');
  assert.equal(resolvePhase2CutEndpoint(4, 'end', parent,
    collection('original', [unit(4, 4200, 4200), unit(4, 4200, 4200)]), empty).status, 'unresolved');
});

test('nonfinite and outside-parent boundaries fail; other failures do not gain a fallback', () => {
  const original = collection('original', [unit(2, 2000, 2200, true)]);
  for (const [start, end] of [[NaN, 2200], [2100, Infinity], [1000, 1100], [5500, 5600], [2100, 2100]])
    assert.equal(resolvePhase2CutEndpoint(2, 'start', parent, original,
      collection('supplemental', [unit(2, start, end)])).status, 'unresolved');
  for (const ms of [NaN, Infinity, 1000, 5500])
    assert.equal(resolvePhase2CutEndpoint(4, 'end', parent, collection('original', [unit(4, ms, ms)]), empty).status, 'unresolved');
  assert.equal(resolvePhase2CutEndpoint(2, 'start', parent, collection('original', []),
    collection('supplemental', [unit(2, 2000, 2200)])).status, 'unresolved');
  assert.throws(() => resolvePhase2CutEndpoint(99, 'start', parent, original, empty), /OUTSIDE_PARENT/);
});

test('ordinary valid endpoints and inherited parent edges retain their original times', () => {
  const original = collection('original', [unit(2, 2000, 2200)]);
  const result = resolvePhase2CutEndpoint(2, 'start', parent, original, collection('supplemental', [unit(2, 2050, 2250)]));
  assert.equal(result.sourceMs, 2000); assert.equal(result.resolutionMethod, 'existing-internal-cut-resolver');
  assert.equal(resolvePhase2CutEndpoint(1, 'start', parent, original, empty).sourceMs, 1000);
  assert.equal(resolvePhase2CutEndpoint(5, 'end', parent, original, empty).sourceMs, 5500);
});

function rangeFixture(): Json {
  const utterances = {schemaVersion: 'test-utterances', utterances: [1, 2, 3, 4, 5].map(id => ({
    utteranceId: `u-${id}`, sourceSegmentIds: [id], text: `発話${id}`, sourceStartMs: id * 1000, sourceEndMs: id * 1000 + 500}))};
  const plan = {schemaVersion: 'test-plan', planId: 'endpoint-test', outputRoot: 'fixture/output',
    authorization: bind('fixture/auth.json', {schemaVersion: 'test-auth'}), request: {purpose: '導入と結論の保持', sourceId: 'fixture-source',
      sourceVideo: {path: 'fixture/video.mp4', fileSha256: '1'.repeat(64)},
      transcript: {path: 'fixture/transcript.json', fileSha256: '2'.repeat(64)},
      utterances: bind('fixture/utterances.json', utterances)}};
  const base = {plan, planBinding: bind('fixture/plan.json', plan), utterances,
    transcript: {segments: utterances.utterances.map((u, i) => ({id: i + 1, text: u.text, startMs: u.sourceStartMs, endMs: u.sourceEndMs}))}};
  const request = phase2DiscoveryRequest(base), discoveryAnswer = {status: 'complete', candidates: [{sourceId: 'fixture-source',
    title: '導入から結論まで', reason: '前提と結論が連続する', evidenceUtteranceIds: ['u-3'],
    contextStartUtteranceId: 'u-1', contextEndUtteranceId: 'u-5'}]};
  const discovery = {schemaVersion: 'candidate-discovery-skill-result-v001', skillId: 'candidate-discovery', skillVersion: 'v001', answer: discoveryAnswer};
  const resolved = resolvePhase2Discovery(base, request, {schemaVersion: 'candidate-discovery-judgment-response-v001',
    requestFileSha256: sha(formal(request)), answer: discoveryAnswer, judgmentNote: '合成例'}, discovery);
  assert.equal(resolved.status, 'resolved'); if (resolved.status !== 'resolved') throw new Error();
  const c = {...base, candidateSet: resolved.candidateSet, discovery};
  const retentionRequest = {schemaVersion: 'candidate-internal-retention-request-v001', input: buildPhase2RetentionInput(c)};
  const answer = {status: 'complete', candidates: [{candidateId: 'candidate-0001', meaningPreserved: '導入と結論を残す。', blocks: [
    {action: 'drop', startSourceSegmentId: 1, endSourceSegmentId: 1, roles: ['dispensable'], reason: '直前の別話題。'},
    {action: 'keep', startSourceSegmentId: 2, endSourceSegmentId: 4, roles: ['lead-in', 'payoff'], reason: '前提から結論まで。'},
    {action: 'drop', startSourceSegmentId: 5, endSourceSegmentId: 5, roles: ['digression'], reason: '次の話題。'},
  ]}]};
  const retentionResponse = {schemaVersion: 'candidate-internal-retention-response-v001',
    requestFileSha256: sha(formal(retentionRequest)), answer, judgmentNote: '合成例'};
  return {...c, retentionRequest, retentionResponse, retentionResult: {
    schemaVersion: 'candidate-internal-retention-result-v001', skillId: 'candidate-internal-retention', skillVersion: 'v001', answer}};
}

test('validated whole-text blocks survive endpoint resolution; nonpositive blocks prevent all promotion', () => {
  const c = rangeFixture(), before = sha(formal(c.retentionResponse));
  const original = collection('original', [unit(2, 2000, 2200, true), unit(4, 4200, 4200)]);
  const good = resolvePhase2EndpointRanges(c, original, collection('supplemental', [unit(2, 2050, 2250)]));
  assert.equal(good.status, 'resolved'); assert.deepEqual(good.segments[0].sourceSegmentIds, [2, 3, 4]);
  assert.equal(good.segments[0].sourceStartMs, 2050); assert.equal(good.segments[0].sourceEndMs, 4200);
  assert.equal(good.candidates[0].blocks.length, 3);
  const bad = resolvePhase2EndpointRanges(c, original, collection('supplemental', [unit(2, 5000, 5100)]));
  assert.equal(bad.status, 'unresolved'); assert.deepEqual(bad.promotedSegments, []);
  assert.equal(bad.unresolved[0].reason, 'nonpositive-observed-range');
  assert.equal(sha(formal(c.retentionResponse)), before);
  const unknown = structuredClone(c); unknown.retentionResponse.answer.candidates[0].blocks[1].endSourceSegmentId = 99;
  unknown.retentionResult.answer = unknown.retentionResponse.answer;
  assert.throws(() => resolvePhase2EndpointRanges(unknown, original, empty));
  assert.throws(() => resolvePhase2EndpointRanges({...c, retentionResponse: {...c.retentionResponse,
    requestFileSha256: 'f'.repeat(64)}}, original, empty));
});

test('saved Phase 2 evidence resolves every rejected endpoint without changing any semantic bytes',
  {skip: !process.env.PHASE2_ENDPOINT_JOB}, async () => {
    const c = await loadPhase2EndpointEvidence(process.env.PHASE2_ENDPOINT_JOB!);
    const result = resolvePhase2EndpointRanges(c, c.original, c.supplemental);
    assert.equal(result.status, 'resolved', JSON.stringify(result.unresolved));
    assert.equal(result.candidates.length, c.retentionResult.answer.candidates.length);
    assert.equal(result.segments.length, c.retentionResult.answer.candidates.reduce((n: number, row: Json) =>
      n + row.blocks.filter((b: Json) => b.action === 'keep').length, 0));
    for (const row of c.failure.result.unresolved) for (const e of row.endpoints) {
      const segment = result.segments.find((s: Json) => s.candidateId === row.candidateId && s.blockOrdinal === row.blockOrdinal);
      const endpoint = segment.cutBoundaryEvidence[e.side];
      assert.equal(endpoint.sourceSegmentId, e.sourceSegmentId); assert.equal(endpoint.originalFailureReason, e.reason);
      assert(endpoint.observationBinding && Number.isFinite(endpoint.sourceMs));
    }
    for (const ref of c.decision.frozenArtifacts) assert.equal(sha(await readFile(ref.path)), ref.fileSha256);
  });
