import assert from 'node:assert/strict';
import test from 'node:test';
import {WORK, verifyContrastSelectionV0} from './run_contrast_thin_plan_v0.mts';
import {WORK as PREVIOUS_WORK, projectThinPlanV0} from './run_thin_plan_candidate_selection_v0.mts';
import {buildSelectionRequestV001, validateSelectionV001} from './candidate_selection_validation_v001.mts';
import {promoteSelectionForExecutionV001} from './run_candidate_selection_e2e_v001.mts';
import {readJson, readBound, same, bind, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
const actual = await verifyContrastSelectionV0();
const {c, request, response, result} = actual;
test('only production intent differs in the actual formal Skill input', async () => {
  const previous = await readJson(`${PREVIOUS_WORK}/selection-request.json`);
  assert.deepEqual(Object.keys(request.input).filter(k => !same(previous.input[k], request.input[k])), ['productionRequest']);
  assert.equal(request.input.productionRequest, c.thinPlan.productionIntent);
  assert.deepEqual(Object.keys(c.thinPlan), ['schemaVersion', 'productionIntent']);
});
test('human judgments and previous outputs added to context do not enter the Skill', () => {
  const changed: Json = structuredClone(c);
  changed.humanReview = {expectedAdoptedCandidates: ['candidate-0003']};
  changed.retention.humanReview = 'expectation';
  changed.previousOutput = {adopted: 'all', duration: 161};
  assert(same(buildSelectionRequestV001(changed), request));
});
test('021 response cannot authorize 022 adoption', async () => {
  assert.throws(() => validateSelectionV001(c, request,
    { ...response, requestFileSha256: 'old-response' }, result), /JUDGMENT_PROVENANCE_INVALID/);
  const previous = await readJson(`${PREVIOUS_WORK}/selection-response.json`);
  assert.throws(() => validateSelectionV001(c, request, previous, result), /JUDGMENT_PROVENANCE_INVALID/);
});
test('judgment wording cannot be rewritten after the bound response', () => {
  const changed = structuredClone(result); changed.answer.decisions[0].reason = 'human-aligned rewrite';
  assert.throws(() => validateSelectionV001(c, request, response, changed), /JUDGMENT_PROVENANCE_INVALID/);
});
test('unvalidated retention edits cannot be promoted', () => {
  const changed = structuredClone(c); changed.retention.segments[0].sourceEndMs++;
  assert.throws(() => promoteSelectionForExecutionV001(changed,
    validateSelectionV001(c, request, response, result)), /RETENTION_RECONSTRUCTION_INVALID/);
});
test('current adopted candidates alone deterministically reconstruct formal edit input', async () => {
  const rebuilt = promoteSelectionForExecutionV001(c, validateSelectionV001(c, request, response, result));
  assert(same(rebuilt.adoption, await readJson(`${WORK}/machine-adoption.json`)));
  assert(same(rebuilt.editPlan, await readJson(`${WORK}/edit-plan.json`)));
  const selected = new Set(actual.adoption.adoptedCandidates.map((r: Json) => r.candidateId));
  assert(rebuilt.editPlan.segments.every((s: Json) => selected.has(s.candidateId)));
  assert.equal(rebuilt.adoption.historicalHumanQualityInherited, false);
});
test('changing intention invalidates its existing binding', async () => {
  const oldPlan = await readBound(c.sourceContextBinding);
  const source = {plan: oldPlan, planBinding: c.sourceContextBinding};
  assert.throws(() => projectThinPlanV0(source, {...c.thinPlan, productionIntent: 'different'}, {
    sourceContextBinding: source.planBinding, thinPlanBinding: c.plan.thinPlanBinding,
    authorization: c.plan.authorization, planId: c.plan.planId, outputRoot: WORK,
    implementationBindings: c.plan.implementationBindings,
  }), /THIN_PLAN_BINDING_CHANGED/);
  assert(same(bind(c.planBinding.path, c.plan), c.planBinding));
});
