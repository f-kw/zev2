import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createInterface} from 'node:readline';
import {
  ROOT, bind, readJson, readBound, publish, same, keys, sha, formal, fileSha,
  assertBinding, decodeDigestTransportV001, type Json, type Binding,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {runCandidateSelectionV001} from '../../runner/src/skills/candidate-selection-v001.js';
import {buildSelectionRequestV001, validateSelectionV001, promoteSelectionV001}
  from './candidate_selection_validation_v001.mts';
import {loadSelectionContextV001, SELECTION_IMPLEMENTATIONS}
  from './run_candidate_selection_e2e_v001.mts';

export const WORK = 'evals/clip_composition/outputs/presentation/work-candidate-selection-thin-plan-20260909-v001';
export const SOURCE_PLAN = 'evals/clip_composition/outputs/presentation/work-candidate-selection-20260908-v002/fixed-plan.json';
export const THIS_FILE = 'evals/clip_composition/run_thin_plan_candidate_selection_v0.mts';
export const IMPLEMENTATIONS = [...SELECTION_IMPLEMENTATIONS, THIS_FILE];
export const STRUCTURE_CONDITIONS = Object.freeze([
  '採用候補の元素材順を維持する。候補内部の編集はこの判断では指定しない。',
  '採用件数・目標尺・採用候補を事前に指定しない。',
]);
export type ThinPlanV0 = {schemaVersion: 'production-intent-plan-v0'; productionIntent: string};
export function assertThinPlanV0(v: unknown): asserts v is ThinPlanV0 {
  assert(keys(v, ['schemaVersion', 'productionIntent']) && v.schemaVersion === 'production-intent-plan-v0'
    && typeof v.productionIntent === 'string' && v.productionIntent.trim().length > 0, 'THIN_PLAN_INVALID');
}
const out = (c: Json, name: string) => `${c.plan.outputRoot}/${name}`;

/** 薄いplanを既存の制作要求欄へ投影する。採否・候補内容・判定基準は生成しない。 */
export function projectThinPlanV0(source: Json, thin: ThinPlanV0, bindings: {
  sourceContextBinding: Binding; thinPlanBinding: Binding; authorization: Binding;
  planId: string; outputRoot: string; implementationBindings: Json[];
}) {
  assertThinPlanV0(thin);
  assert(same(bindings.sourceContextBinding, source.planBinding), 'SOURCE_CONTEXT_BINDING_CHANGED');
  assert(same(bindings.thinPlanBinding, bind(bindings.thinPlanBinding.path, thin)), 'THIN_PLAN_BINDING_CHANGED');
  const plan = {...structuredClone(source.plan), ...structuredClone(bindings),
    schemaVersion: 'thin-plan-candidate-selection-evaluation-v0',
    request: {...structuredClone(source.plan.request), purpose: thin.productionIntent},
    structureConditions: [...STRUCTURE_CONDITIONS]};
  return plan;
}

function assertExperimentPlan(p: Json) {
  assert(keys(p, ['schemaVersion', 'planId', 'authorization', 'request', 'structureConditions', 'policy', 'skills',
    'reuseInternalRetention', 'acousticValidation', 'implementationBindings', 'outputRoot',
    'sourceContextBinding', 'thinPlanBinding']) && p.schemaVersion === 'thin-plan-candidate-selection-evaluation-v0', 'EXPERIMENT_PLAN_INVALID');
  assert(typeof p.planId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(p.planId), 'PLAN_ID_INVALID');
  assert(typeof p.outputRoot === 'string' && p.outputRoot.startsWith('evals/clip_composition/outputs/presentation/work-candidate-selection-thin-plan-')
    && /^[A-Za-z0-9._/-]+$/u.test(p.outputRoot) && !p.outputRoot.split('/').includes('..'), 'OUTPUT_ROOT_INVALID');
  for (const key of ['sourceContextBinding', 'thinPlanBinding', 'authorization']) assertBinding(p[key]);
  assert(Array.isArray(p.implementationBindings)
    && same(p.implementationBindings.map((b: Json) => b.path), IMPLEMENTATIONS), 'IMPLEMENTATION_MEMBERSHIP_INVALID');
}

/** 旧実験を再実行せず、その素材・候補・保持根拠を検査する既存の読取入口を利用する。 */
export async function loadThinPlanContextV0(planPath: string) {
  const plan = await readJson(planPath); assertExperimentPlan(plan);
  const [sourcePlan, thin, authorization] = await Promise.all([
    readBound(plan.sourceContextBinding), readBound(plan.thinPlanBinding), readBound(plan.authorization),
  ]);
  assertThinPlanV0(thin);
  assert(keys(authorization, ['schemaVersion', 'recordId', 'instruction', 'approvalQuote', 'scope'])
    && authorization.schemaVersion === 'thin-plan-selection-received-instruction-v0'
    && authorization.instruction === 'ZEV進行管理２ 指示-021（改訂版）'
    && authorization.approvalQuote === 'kawafmm承認済み。'
    && same(authorization.scope, {firstRunExistingSelectionUnchanged: true, fixedProductionIntent: true,
      sameExistingCandidates: true, noHistoricalHumanAnswersInJudgment: true, deterministicAdoption: true,
      existingOutputReuse: true, conditionalInternalRetention: true, conditionalRendering: true,
      humanQualitySeparate: true, paidApi: false, newMaterial: false}), 'AUTHORIZATION_INVALID');
  const source = await loadSelectionContextV001(plan.sourceContextBinding.path);
  assert(same(source.plan, sourcePlan), 'SOURCE_CONTEXT_CHANGED');
  for (const b of plan.implementationBindings) {
    assert(keys(b, ['path', 'fileSha256']) && await fileSha(path.join(ROOT, b.path)) === b.fileSha256, 'IMPLEMENTATION_CHANGED');
  }
  const expected = projectThinPlanV0(source, thin, {sourceContextBinding: plan.sourceContextBinding,
    thinPlanBinding: plan.thinPlanBinding, authorization: plan.authorization, planId: plan.planId,
    outputRoot: plan.outputRoot, implementationBindings: plan.implementationBindings});
  assert(same(plan, expected), 'THIN_PLAN_PROJECTION_CHANGED');
  return {...source, plan, planBinding: bind(planPath, plan), authorization, thinPlan: thin,
    sourceContextBinding: source.planBinding};
}

export async function prepareThinPlanEvaluationV0() {
  const source = await loadSelectionContextV001(SOURCE_PLAN);
  const thin: ThinPlanV0 = {schemaVersion: 'production-intent-plan-v0',
    productionIntent: 'ぺこらが本気で怖がって絶叫しているところと、怖がっている姿が可愛く見えるところを中心に見せる。'};
  const thinPlanBinding = await publish(`${WORK}/thin-plan-v0.json`, thin);
  const authorization = await publish(`${WORK}/received-instruction.json`, {
    schemaVersion: 'thin-plan-selection-received-instruction-v0', recordId: 'zev-instruction-021-revised-20260909',
    instruction: 'ZEV進行管理２ 指示-021（改訂版）', approvalQuote: 'kawafmm承認済み。',
    scope: {firstRunExistingSelectionUnchanged: true, fixedProductionIntent: true, sameExistingCandidates: true,
      noHistoricalHumanAnswersInJudgment: true, deterministicAdoption: true, existingOutputReuse: true,
      conditionalInternalRetention: true, conditionalRendering: true, humanQualitySeparate: true,
      paidApi: false, newMaterial: false},
  });
  const implementationBindings = await Promise.all(IMPLEMENTATIONS.map(async p => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))})));
  const plan = projectThinPlanV0(source, thin, {sourceContextBinding: source.planBinding, thinPlanBinding,
    authorization, planId: 'candidate-selection-thin-plan-ymUsGrT6EaA-20260909-v001', outputRoot: WORK, implementationBindings});
  const planBinding = await publish(`${WORK}/fixed-plan.json`, plan);
  const current = await loadThinPlanContextV0(planBinding.path);
  const previousInput = buildSelectionRequestV001(source).input;
  const currentInput = buildSelectionRequestV001(current).input;
  assert(same(currentInput.candidates, previousInput.candidates), 'CANDIDATE_INPUT_CHANGED');
  assert(same(currentInput.criteria, previousInput.criteria), 'EXISTING_SELECTION_CRITERIA_CHANGED');
  assert.equal(currentInput.productionRequest, thin.productionIntent);
  await publish(`${WORK}/input-isolation-verification.json`, {
    schemaVersion: 'thin-plan-input-isolation-verification-v0', status: 'passed', planBinding, thinPlanBinding,
    candidateSetBinding: source.plan.request.candidateSet, candidateCount: currentInput.candidates.length,
    candidateInputUnchanged: true, existingSkillAndValidatorUnchanged: true, existingCriteriaUnchanged: true,
    changedInputFields: ['productionRequest', 'structureConditions'],
    changeMeaning: '制作要求を今回の具体的意図へ置換。旧ダイジェストという一般目標とその重複説明を外し、構造条件は元順と結果の事前指定禁止だけにした。過去の感想採否や構成上の正解を入力していない。',
    previousProductionRequest: previousInput.productionRequest, currentProductionRequest: currentInput.productionRequest,
    previousStructureConditions: previousInput.structureConditions, currentStructureConditions: currentInput.structureConditions,
    visibleInputKeys: Object.keys(currentInput), historicalHumanLabelsInJudgmentInput: false,
    previousSelectionAnswerReadForJudgment: false, priorOutputUseInformationInJudgmentInput: false,
    perceptualQualityFromTextNotEstablished: ['実際の声の絶叫の強さ', '本気で怖がっている印象', '怖がる姿の可愛さ'],
    humanQuality: 'not-evaluated',
  });
  return planBinding;
}

async function judgeThroughIsolatedStdin(request: Json) {
  // request全体や旧結果を提示せず、Skillが消費する本文と今回の制作要求だけを送る。
  process.stdout.write(JSON.stringify({event: 'thin-plan-selection-judgment-required',
    requestFileSha256: sha(formal(request)), input: request.input}) + '\n');
  const lines = createInterface({input: process.stdin, crlfDelay: Infinity, terminal: false});
  try {
    for await (const line of lines) return decodeDigestTransportV001(line);
    throw new Error('THIN_PLAN_JUDGMENT_INPUT_CLOSED');
  } finally {lines.close();}
}

export async function executeThinPlanSelectionV0(planPath: string) {
  const c = await loadThinPlanContextV0(planPath);
  const request = buildSelectionRequestV001(c);
  await publish(out(c, 'selection-request.json'), request);
  let response: Json | undefined;
  const result = await runCandidateSelectionV001(request.input, async input => {
    assert(same(input, request.input), 'EXISTING_SKILL_INPUT_CHANGED');
    response = await judgeThroughIsolatedStdin(request);
    await publish(out(c, 'selection-response.json'), response);
    return response.answer;
  });
  await publish(out(c, 'selection-result.json'), result);
  const fresh = await loadThinPlanContextV0(planPath);
  assert(same(fresh.planBinding, c.planBinding), 'PLAN_CHANGED_DURING_JUDGMENT');
  const promoted = promoteSelectionV001(validateSelectionV001(fresh, request, response!, result));
  await publish(out(c, 'selection-validation.json'), promoted.validation);
  await publish(out(c, 'candidate-adoption.json'), promoted.adoption);
  process.stdout.write(JSON.stringify({event: 'thin-plan-selection-completed',
    adopted: promoted.adoption.adoptedCandidates.map((p: Json) => p.candidateId),
    rejected: promoted.adoption.rejectedCandidates.map((p: Json) => p.candidateId), humanQuality: 'not-evaluated'}) + '\n');
  return promoted;
}

export async function verifyThinPlanSelectionV0(planPath: string) {
  const c = await loadThinPlanContextV0(planPath);
  const [request, response, result, validation, adoption] = await Promise.all([
    'selection-request.json', 'selection-response.json', 'selection-result.json', 'selection-validation.json', 'candidate-adoption.json',
  ].map(name => readJson(out(c, name))));
  const promoted = promoteSelectionV001(validateSelectionV001(c, request, response, result));
  assert(same(promoted.validation, validation) && same(promoted.adoption, adoption), 'THIN_PLAN_ADOPTION_CHANGED');
  return {c, request, response, result, ...promoted};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv[2] === 'prepare') process.stdout.write(JSON.stringify(await prepareThinPlanEvaluationV0()) + '\n');
  else await executeThinPlanSelectionV0(process.argv[2]);
}
