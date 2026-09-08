import assert from 'node:assert/strict';
import test from 'node:test';
import {verifyThinPlanSelectionV0, WORK} from './run_thin_plan_candidate_selection_v0.mts';
import {buildSelectionRequestV001, validateSelectionV001} from './candidate_selection_validation_v001.mts';
import {promoteSelectionForExecutionV001} from './run_candidate_selection_e2e_v001.mts';
import {readJson, same, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
const actual = await verifyThinPlanSelectionV0(`${WORK}/fixed-plan.json`);
const {c, request, response, result} = actual;

test('the frozen purpose reaches the Skill while candidate text and original rules stay identical', async () => {
  const previous = await readJson(`${c.sourceContextBinding.path.replace(/fixed-plan.json$/u, '')}selection-request.json`);
  assert.equal(request.input.productionRequest, c.thinPlan.productionIntent);
  assert(same(request.input.candidates, previous.input.candidates));
  assert(same(request.input.criteria, previous.input.criteria));
  assert.deepEqual(Object.keys(c.thinPlan), ['schemaVersion', 'productionIntent']);
});
test('historical adoption fields in the execution context cannot enter the closed judgment input', () => {
  const poisoned: Json = structuredClone(c);
  poisoned.retention.humanQuality = 'historical-answer';
  poisoned.retention.recommendKeepCandidate = 'candidate-0003';
  poisoned.oldSelectionResponse = {answer: 'keep everything'};
  assert(same(buildSelectionRequestV001(poisoned), request));
});
test('an old-plan response cannot substitute for the fresh bound judgment', async () => {
  const old = await readJson(`${c.sourceContextBinding.path.replace(/fixed-plan.json$/u, '')}selection-response.json`);
  assert.throws(() => validateSelectionV001(c, request, old, result), /JUDGMENT_PROVENANCE_INVALID/);
});
test('mutated current reasons and unvalidated internal cuts have no execution authority', () => {
  const changed: Json = structuredClone(result);
  changed.answer.decisions[0].reason = '後から人間回答に合わせた理由';
  assert.throws(() => validateSelectionV001(c, request, response, changed), /JUDGMENT_PROVENANCE_INVALID/);
  const altered: Json = structuredClone(c); altered.retention.segments[0].sourceEndMs++;
  assert.throws(() => promoteSelectionForExecutionV001(altered, validateSelectionV001(c, request, response, result)), /RETENTION_RECONSTRUCTION_INVALID/);
});
test('newly bound adoption and formal editing input reconstruct and keep only selected candidates', async () => {
  const rebuilt = promoteSelectionForExecutionV001(c, validateSelectionV001(c, request, response, result));
  assert(same(rebuilt.adoption, await readJson(`${WORK}/machine-adoption.json`)));
  assert(same(rebuilt.editPlan, await readJson(`${WORK}/edit-plan.json`)));
  const selected = new Set(actual.adoption.adoptedCandidates.map((r: Json) => r.candidateId));
  assert(rebuilt.editPlan.segments.every((s: Json) => selected.has(s.candidateId)));
  assert.equal(rebuilt.adoption.historicalHumanQualityInherited, false);
});
