import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createInterface} from 'node:readline';
import {ROOT, bind, readJson, readBound, publish, same, sha, formal, fileSha,
  decodeDigestTransportV001, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {runCandidateSelectionV001} from '../../runner/src/skills/candidate-selection-v001.js';
import {buildSelectionRequestV001, validateSelectionV001, promoteSelectionV001}
  from './candidate_selection_validation_v001.mts';
import {loadThinPlanContextV0, projectThinPlanV0, assertThinPlanV0,
  IMPLEMENTATIONS as PREVIOUS_IMPLEMENTATIONS, WORK as PREVIOUS_WORK}
  from './run_thin_plan_candidate_selection_v0.mts';

export const WORK = 'evals/clip_composition/outputs/presentation/work-contrast-thin-plan-20260909-v001';
const THIS_FILE = 'evals/clip_composition/run_contrast_thin_plan_v0.mts';
const IMPLEMENTATIONS = [...PREVIOUS_IMPLEMENTATIONS, THIS_FILE];
const INTENT = 'ぺこらと一緒にホラーゲームをプレイしているような疑似体験を見せる。';
const AUTHORIZATION = {
  schemaVersion: 'contrast-thin-plan-received-instruction-v0',
  instruction: 'ZEV進行管理２ 指示-022', approvalQuote: 'kawafmm承認済み。',
  scope: {productionIntentOnly: true, existingSelectionUnchanged: true, sameCandidates: true,
    noHumanAnswersInFormalInput: true, knownHumanCalibrationNotIndependentBlind: true,
    existingRetentionAndOutputReuse: true, purposeConditionedRetentionRequiresGptDecision: true,
    humanQualitySeparate: true, paidApi: false, newMaterial: false},
};
const out = (name: string) => `${WORK}/${name}`;

/** 021の固定済み消費経路を変更せず、対照意図を同じ最小planで投影する実験入口。 */
export async function loadContrastContextV0(planPath = out('fixed-plan.json')) {
  const plan = await readJson(planPath);
  const source = await loadThinPlanContextV0(`${PREVIOUS_WORK}/fixed-plan.json`);
  assert(same(plan.sourceContextBinding, source.planBinding), 'CONTRAST_SOURCE_CHANGED');
  const thin = await readBound(plan.thinPlanBinding); assertThinPlanV0(thin);
  assert.equal(thin.productionIntent, INTENT, 'CONTRAST_INTENT_CHANGED');
  assert(same(await readBound(plan.authorization), AUTHORIZATION), 'CONTRAST_AUTHORIZATION_CHANGED');
  assert.equal(plan.planId, 'contrast-thin-plan-ymUsGrT6EaA-20260909-v001');
  assert.equal(plan.outputRoot, WORK);
  assert(same(plan.implementationBindings.map((b: Json) => b.path), IMPLEMENTATIONS), 'CONTRAST_IMPLEMENTATIONS_CHANGED');
  for (const b of plan.implementationBindings) {
    assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256, 'CONTRAST_IMPLEMENTATION_CHANGED');
  }
  const expected = projectThinPlanV0(source, thin, {sourceContextBinding: source.planBinding,
    thinPlanBinding: plan.thinPlanBinding, authorization: plan.authorization, planId: plan.planId,
    outputRoot: plan.outputRoot, implementationBindings: plan.implementationBindings});
  assert(same(plan, expected), 'CONTRAST_PROJECTION_CHANGED');
  const c = {...source, plan, planBinding: bind(planPath, plan), thinPlan: thin,
    authorization: AUTHORIZATION, sourceContextBinding: source.planBinding};
  const before = buildSelectionRequestV001(source).input, after = buildSelectionRequestV001(c).input;
  assert.deepEqual(Object.keys(after).filter(k => !same((before as Json)[k], (after as Json)[k])), ['productionRequest']);
  return c;
}
export async function prepareContrastV0() {
  const source = await loadThinPlanContextV0(`${PREVIOUS_WORK}/fixed-plan.json`);
  const thin = {schemaVersion: 'production-intent-plan-v0' as const, productionIntent: INTENT};
  const thinPlanBinding = await publish(out('thin-plan-v0.json'), thin);
  const authorization = await publish(out('received-instruction.json'), AUTHORIZATION);
  const implementationBindings = await Promise.all(IMPLEMENTATIONS.map(async p => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))})));
  const plan = projectThinPlanV0(source, thin, {sourceContextBinding: source.planBinding,
    thinPlanBinding, authorization, planId: 'contrast-thin-plan-ymUsGrT6EaA-20260909-v001', outputRoot: WORK, implementationBindings});
  const planBinding = await publish(out('fixed-plan.json'), plan);
  const c = await loadContrastContextV0();
  await publish(out('input-isolation-verification.json'), {
    schemaVersion: 'contrast-plan-input-isolation-v0', status: 'passed', planBinding,
    previousPlanBinding: source.planBinding, thinPlanBinding,
    changedInputFields: ['productionRequest'], previousIntent: source.thinPlan.productionIntent,
    currentIntent: c.thinPlan.productionIntent, structureConditionsUnchanged: true,
    candidateSetAndTextUnchanged: true, skillCriteriaValidatorPromotionUnchanged: true,
    humanAnswerFileReadForInput: false, historicalOutputUsageInInput: false,
    experimentClass: 'known-human-calibration-not-independent-blind', humanQuality: 'not-evaluated',
  });
  return planBinding;
}
export async function executeContrastV0() {
  const c = await loadContrastContextV0(), request = buildSelectionRequestV001(c);
  await publish(out('selection-request.json'), request);
  let response: Json | undefined;
  const result = await runCandidateSelectionV001(request.input, async input => {
    assert(same(input, request.input));
    process.stdout.write(JSON.stringify({event: 'contrast-judgment-required', requestFileSha256: sha(formal(request)), input}) + '\n');
    const lines = createInterface({input: process.stdin, crlfDelay: Infinity, terminal: false});
    try {
      for await (const line of lines) {response = decodeDigestTransportV001(line); break;}
    } finally {lines.close();}
    assert(response, 'CONTRAST_JUDGMENT_INPUT_CLOSED');
    await publish(out('selection-response.json'), response);
    return response.answer;
  });
  await publish(out('selection-result.json'), result);
  const fresh = await loadContrastContextV0();
  assert(same(fresh.planBinding, c.planBinding));
  const promoted = promoteSelectionV001(validateSelectionV001(fresh, request, response!, result));
  await publish(out('selection-validation.json'), promoted.validation);
  await publish(out('candidate-adoption.json'), promoted.adoption);
  return promoted;
}
export async function verifyContrastSelectionV0() {
  const c = await loadContrastContextV0();
  const [request, response, result, validation, adoption] = await Promise.all([
    'selection-request.json', 'selection-response.json', 'selection-result.json', 'selection-validation.json', 'candidate-adoption.json',
  ].map(n => readJson(out(n))));
  const promoted = promoteSelectionV001(validateSelectionV001(c, request, response, result));
  assert(same(promoted.validation, validation) && same(promoted.adoption, adoption));
  return {c, request, response, result, ...promoted};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv[2] === 'prepare') process.stdout.write(JSON.stringify(await prepareContrastV0()) + '\n');
  else if (process.argv[2] === 'verify') {await verifyContrastSelectionV0(); process.stdout.write('verified\n');}
  else {const p = await executeContrastV0(); process.stdout.write(JSON.stringify({event: 'contrast-complete', adopted: p.adoption.adoptedCandidates.map((r: Json) => r.candidateId)}) + '\n');}
}
