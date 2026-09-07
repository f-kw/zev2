import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {bind, readJson, readBound, formal, sha, same, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  loadDistantContextV001, buildDistantRequestV001, buildDistantPartsV001, assertDistantPlanV001,
  validateDistantPairV001, promoteDistantPairV001,
} from './run_distant_connection_pair_skill_e2e_v001.mts';
import {runDistantConnectionPairV001, assertDistantConnectionPairInputV001}
  from '../../runner/src/skills/distant-connection-pair-v001.js';
import {
  buildDigestCaptionInputsV001, validateDigestDisplayV001, constructDigestCaptionCoreV001,
  verifyDigestAdoptionV001,
} from './candidate_digest_core_adapter_v001.mts';
import {projectAdoptedMediaRangesV001, CORE_FILES} from './adopted_media_manufacturing_v001.mts';
const planPath = 'evals/clip_composition/jobs/presentation/distant-connection-pair-skill-e2e/fixed-plan-v001.json';
const context = await loadDistantContextV001(planPath);
const answer = (first = 'camera-fear-escalation-first', second = 'camera-fear-escalation-second') => {
  const ps = buildDistantPartsV001(context);
  return {status: 'complete', sourceId: context.plan.request.sourceId, firstPartId: first, secondPartId: second,
    reason: '検査用の合成回答。実素材の新規意味判断へ混入させない。',
    firstEvidenceUtteranceIds: [ps.find(p => p.partId === first)!.utteranceIds[0]],
    secondEvidenceUtteranceIds: [ps.find(p => p.partId === second)!.utteranceIds[0]]};
};
async function invoke(a: Json = answer(), c: Json = context) {
  const request = buildDistantRequestV001(c);
  const response = {schemaVersion: 'distant-connection-pair-judgment-response-v001',
    requestFileSha256: sha(formal(request)), answer: a, judgmentNote: '合成検査回答'};
  const result = await runDistantConnectionPairV001(request.input, async () => a);
  return {c, request, response, result};
}
const promote = async (a = answer()) => {
  const v = await invoke(a); return promoteDistantPairV001(validateDistantPairV001(v.c, v.request, v.response, v.result));
};
test('固定planは構造だけを固定し、候補・時刻・独自の尺上限の追加を拒否する', () => {
  for (const key of ['selectedPair', 'selectedIntervals', 'maxDurationMs']) {
    const p = structuredClone(context.plan); p[key] = [];
    assert.throws(() => assertDistantPlanV001(p), /PLAN_INVALID/);
  }
  const r = structuredClone(buildDistantRequestV001(context).input) as any;
  r.parts[0].sourceStartMs = 10;
  assert.throws(() => assertDistantConnectionPairInputV001(r), /PAIR_INPUT_INVALID/);
});
test('既存候補群を入力として、無言映像開始も既存発話終端だけで再構築する', async () => {
  const parts = buildDistantPartsV001(context);
  assert.equal(parts.length, 4);
  assert.deepEqual(parts[1].boundaryRefs.start, {utteranceId: 'semantic-utterance-002765', edge: 'end'});
  const p = await promote();
  assert.deepEqual(p.editPlan.segments.map((s: Json) => [s.sourceStartMs, s.sourceEndMs]), [[664354,671316],[1377918,1426649]]);
  assert.equal(p.adoption.historicalHumanQualityInherited, false);
  assert.equal(p.adoption.humanQuality, 'not-evaluated');
  assert.equal(p.adoption.selectedParts[1].sourceSegmentIds.includes(2765), false);
});
test('意味判断の選択変更が別の正式区間へ反映され、過去合否だけで採用を決めない', async () => {
  const a = await promote(), b = await promote(answer('medicine-effect-payoff-first', 'medicine-effect-payoff-second'));
  assert.notDeepEqual(a.editPlan.segments, b.editPlan.segments);
});
for (const [name, change, error] of [
  ['未知の部分ID', (a: Json) => {a.firstPartId = 'unknown';}, /UNKNOWN_PART_ID/],
  ['他素材所属', (a: Json) => {a.sourceId = 'other';}, /PAIR_SOURCE_MISMATCH/],
  ['前半後半の役割逆転', (a: Json) => {a.firstPartId = 'camera-fear-escalation-second';}, /PAIR_ROLE_INVALID/],
  ['時間順逆転', (a: Json) => {a.firstPartId = 'medicine-effect-payoff-first';}, /PAIR_ORDER_OR_SEPARATION_INVALID/],
  ['部分外の根拠ID', (a: Json) => {a.firstEvidenceUtteranceIds = ['semantic-utterance-002766'];}, /EVIDENCE_OUTSIDE_PART/],
  ['根拠順逆転', (a: Json) => {a.firstEvidenceUtteranceIds = ['semantic-utterance-001183','semantic-utterance-001182'];}, /EVIDENCE_ORDER_INVALID/],
  ['自由な時刻の追加', (a: Json) => {a.sourceStartMs = 1;}, /PAIR_ANSWER_INVALID/],
  ['根拠の重複', (a: Json) => {a.firstEvidenceUtteranceIds.push(a.firstEvidenceUtteranceIds[0]);}, /PAIR_ANSWER_INVALID/],
] as const) test(`${name}を採用前に拒否する`, async () => {
  const a = answer(); change(a); await assert.rejects(promote(a), error);
});
test('棄権・別入力回答・raw result・検査印コピーは正式採用にならない', async () => {
  const abstained = await invoke({status: 'abstained'});
  assert.throws(() => validateDistantPairV001(context, abstained.request, abstained.response, abstained.result), /PAIR_ABSTAINED/);
  const v = await invoke();
  const wrong = {...v.response, requestFileSha256: 'f'.repeat(64)};
  assert.throws(() => validateDistantPairV001(context, v.request, wrong, v.result), /PAIR_PROVENANCE_MISMATCH/);
  assert.throws(() => promoteDistantPairV001(v.result), /VALIDATED_PAIR_REQUIRED/);
  const token = validateDistantPairV001(context, v.request, v.response, v.result);
  assert.throws(() => promoteDistantPairV001(structuredClone(token)), /VALIDATED_PAIR_REQUIRED/);
  const first = promoteDistantPairV001(token); first.adoption.selectedParts[0].sourceInterval.sourceStartMs = 1;
  assert.equal(promoteDistantPairV001(token).adoption.selectedParts[0].sourceInterval.sourceStartMs, 664354);
});
test('過去区間を勝手に延長したり、発話本文を変えると新規採用を拒否する', () => {
  const c = structuredClone(context) as any;
  c.intervalPlan.candidates[0].secondPart.sourceStartMs -= 1;
  assert.throws(() => buildDistantPartsV001(c), /EXISTING_BOUNDARY_NOT_ID_GROUNDED/);
  const d = structuredClone(context) as any; d.intervalPlan.candidates[0].firstPart.text += '捏造';
  assert.throws(() => buildDistantPartsV001(d), /EXISTING_PART_GROUNDING_INVALID/);
});
test('抽出前の実ダイジェストと正式区間・frame・音声sample・字幕表示・正式命令の全値が一致する', async () => {
  const oldPlanPath = 'evals/clip_composition/jobs/presentation/candidate-digest-skill-e2e/fixed-plan-v002.json';
  const plan = await readJson(oldPlanPath), root = plan.outputRoot;
  // 履歴planを現在の実装として実行せず、SHAで束縛された保存入力から回帰比較する。
  const c: any = {plan, planBinding: bind(oldPlanPath, plan),
    authorization: await readBound(plan.authorization), transcript: await readJson(plan.request.transcript.path),
    utterances: await readBound(plan.request.utterances), rendererTemplate: await readBound(plan.request.rendererTemplate),
    captionStyleTemplate: await readBound(plan.request.captionStyleTemplate),
    priorCandidate: Object.fromEntries(await Promise.all(Object.entries(plan.priorCandidateJudgment)
      .map(async ([k, b]) => [k, await readBound(b as any)])))};
  assert.equal(sha(await readFile(plan.request.transcript.path)), plan.request.transcript.fileSha256);
  const {adoption, editPlan} = await verifyDigestAdoptionV001(c);
  const {schemaVersion, ...base} = await readJson(root + '/base-media-bindings.json');
  const sourceInspection = await readJson(root + '/source-media-inspection.json');
  const mappings = projectAdoptedMediaRangesV001(editPlan, sourceInspection.media).mappings;
  assert.deepEqual(mappings, (await readBound(base.generationManifest)).segments);
  const inputs = buildDigestCaptionInputsV001(c, adoption, base), tokens = [];
  for (let i = 1; i <= inputs.requests.length; i++) {
    assert.deepEqual(inputs.requests[i-1], await readJson(root + `/display-${i}-request.json`));
    tokens.push(validateDigestDisplayV001(inputs.requests[i-1], await readJson(root + `/display-${i}-response.json`),
      await readJson(root + `/display-${i}-result.json`)));
  }
  const core = await constructDigestCaptionCoreV001(c, adoption, base, tokens);
  for (const [key, filename] of Object.entries(CORE_FILES)) assert.deepEqual(core[key], await readJson(root + '/' + filename), key);
});
