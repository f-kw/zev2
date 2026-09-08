import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORK, loadSelectionContextV001, assertSelectionPlanV001, constructSelectionCandidateSetV001,
  reconstructReusedRetentionV001, promoteSelectionForExecutionV001, verifySelectionAdoptionV001,
} from './run_candidate_selection_e2e_v001.mts';
import {buildSelectionRequestV001, buildSelectionInputV001, validateSelectionV001}
  from './candidate_selection_validation_v001.mts';
import {readJson, readBound, same, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

const c = await loadSelectionContextV001(`${WORK}/fixed-plan-v002.json`);
const request = await readJson(`${WORK}/selection-request.json`);
const response = await readJson(`${WORK}/selection-response.json`);
const result = await readJson(`${WORK}/selection-result.json`);
const token = () => validateSelectionV001(c, request, response, result);

test('actual input is reconstructed from every existing discovery candidate, without historical labels', async () => {
  const identities = await readBound(c.candidateSet.origins.formalIdentityCatalog);
  const changed: Json = structuredClone(identities);
  changed.humanQuality = 'arbitrary-historical-label';
  for (const p of changed.selectedCandidates) {p.humanAdopted = false; p.usedInFinalVideo = false; p.previousHumanScore = 999;}
  const actual = constructSelectionCandidateSetV001(c.plan.request, c.discovery, changed, c.candidateSet.origins);
  assert(same(actual, c.candidateSet));
  assert.equal(actual.candidates.length, c.discovery.answer.candidates.length);
  assert(same(request, buildSelectionRequestV001(c)));
  const input = buildSelectionInputV001(c);
  assert(!JSON.stringify(input).includes('humanQuality'));
  assert(!JSON.stringify(input).includes('usedInFinalVideo'));
  assert(!JSON.stringify(input).includes('selectedCandidates'));
  assert(!JSON.stringify(input).includes('sourceStartMs'));
});
test('actual new judgment, validator, machine adoption and edit plan reconstruct from their original inputs', async () => {
  const actual = await verifySelectionAdoptionV001(c);
  assert(same(actual.adoption, await readJson(`${WORK}/machine-adoption.json`)));
  assert.equal(actual.adoption.resultBinding.fileSha256, (await readJson(`${WORK}/selection-validation.json`)).resultBinding.fileSha256);
  assert.equal(actual.adoption.candidateSetBinding.fileSha256, c.plan.request.candidateSet.fileSha256);
});
test('only selected candidate materializations enter Core; retained content and cut evidence are unchanged', () => {
  const actual = promoteSelectionForExecutionV001(c, token());
  const selected = new Set(actual.adoption.adoptedCandidates.map((p: Json) => p.candidateId));
  const rejected = new Set(actual.adoption.rejectedCandidates.map((p: Json) => p.candidateId));
  const original = reconstructReusedRetentionV001(c).segments!;
  assert.deepEqual(actual.editPlan.segments.map((s: Json) => s.reusedSegmentId),
    original.filter((s: Json) => selected.has(s.candidateId)).map((s: Json) => s.segmentId));
  for (const segment of actual.editPlan.segments as Json[]) {
    assert(selected.has(segment.candidateId)); assert(!rejected.has(segment.candidateId));
    const old = original.find((s: Json) => s.segmentId === segment.reusedSegmentId)!;
    const {reusedSegmentId, segmentId, ...rest} = segment;
    const {segmentId: ignored, ...oldRest} = old;
    assert.deepEqual(rest, oldRest);
  }
});
test('retention result or formal cut evidence cannot be replaced by an unchecked segment list', () => {
  const wrong: Json = structuredClone(c);
  wrong.retention.segments[0].sourceEndMs++;
  assert.throws(() => reconstructReusedRetentionV001(wrong), /RETENTION_RECONSTRUCTION_INVALID/);
  const wrongAnswer: Json = structuredClone(c);
  wrongAnswer.retentionResponse.answer.candidates[0].blocks[0].endSourceSegmentId++;
  assert.throws(() => reconstructReusedRetentionV001(wrongAnswer), /RETENTION_PROVENANCE_MISMATCH/);
});
test('the fixed plan rejects a chosen-ID list, an adoption quota and different order policy', () => {
  for (const mutate of [
    (p: Json) => {p.adoptedIds = ['candidate-0001'];},
    (p: Json) => {p.policy.adoptionCountTarget = 2;},
    (p: Json) => {p.policy.order = 'free-order';},
    (p: Json) => {p.skills[0].mode = 'historical-answer';},
  ]) {const p: Json = structuredClone(c.plan); mutate(p); assert.throws(() => assertSelectionPlanV001(p), /PLAN_INVALID/);}
});
test('formal candidate ID reassignment without discovery identity correspondence is rejected', async () => {
  const identities = await readBound(c.candidateSet.origins.formalIdentityCatalog);
  identities.selectedCandidates[0].resultOrdinal = 2;
  assert.throws(() => constructSelectionCandidateSetV001(c.plan.request, c.discovery, identities, c.candidateSet.origins), /ID_MAPPING_INVALID/);
});
