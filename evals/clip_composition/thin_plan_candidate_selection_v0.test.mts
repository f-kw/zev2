import assert from 'node:assert/strict';
import test from 'node:test';
import {assertThinPlanV0, projectThinPlanV0, STRUCTURE_CONDITIONS} from './run_thin_plan_candidate_selection_v0.mts';
import {bind} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

const thin = {schemaVersion: 'production-intent-plan-v0' as const, productionIntent: '困難に向き合う反応を見せる。'};
function fixture() {
  const plan = {schemaVersion: 'test-plan-v0', request: {purpose: '以前の目的', sourceId: 'source-x', candidateSet: {path: 'candidates.json'}},
    structureConditions: ['以前の条件'], policy: {adoptionCountTarget: null}, skills: [{id: 'candidate-selection'}]};
  const source = {plan, planBinding: bind('source-plan.json', plan)};
  return {source, bindings: {sourceContextBinding: source.planBinding, thinPlanBinding: bind('thin.json', thin),
    authorization: bind('authorization.json', {schemaVersion: 'test-authorization-v0', instruction: 'new'}), planId: 'new-plan', outputRoot: 'new-output',
    implementationBindings: []}};
}
test('thin plan rejects adopted IDs, duration targets, roles and human answers', () => {
  for (const field of ['adoptedCandidates', 'targetDuration', 'roles', 'historicalHumanAnswer', 'cutTimes']) {
    assert.throws(() => assertThinPlanV0({...thin, [field]: 'injected'}), /THIN_PLAN_INVALID/);
  }
  assert.throws(() => assertThinPlanV0({...thin, productionIntent: ' '}), /THIN_PLAN_INVALID/);
});
test('intent projection retains candidate references and rules without mutating the source', () => {
  const {source, bindings} = fixture();
  const before = structuredClone(source);
  const result = projectThinPlanV0(source, thin, bindings);
  assert.deepEqual(source, before);
  assert.equal(result.request.purpose, thin.productionIntent);
  assert.deepEqual(result.request.candidateSet, source.plan.request.candidateSet);
  assert.deepEqual(result.policy, source.plan.policy);
  assert.deepEqual(result.skills, source.plan.skills);
  assert.deepEqual(result.structureConditions, STRUCTURE_CONDITIONS);
  result.request.candidateSet.path = 'mutation';
  assert.deepEqual(source, before);
});
test('a changed purpose cannot keep a previous thin-plan binding', () => {
  const {source, bindings} = fixture();
  assert.throws(() => projectThinPlanV0(source, {...thin, productionIntent: '別の目的'}, bindings), /THIN_PLAN_BINDING_CHANGED/);
});
test('a substituted source context cannot inherit the recorded source binding', () => {
  const {source, bindings} = fixture();
  assert.throws(() => projectThinPlanV0(source, thin, {...bindings,
    sourceContextBinding: bind('other.json', source.plan)}), /SOURCE_CONTEXT_BINDING_CHANGED/);
});
