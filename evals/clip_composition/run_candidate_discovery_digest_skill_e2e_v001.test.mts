import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {bind, formal, sha, buildCandidateRequestV001, validateCandidateAdoptionV001,
  promoteCandidateAdoptionV001, assertDigestPlanV001, decodeDigestTransportV001,
  loadDigestContextV001, readBound, readJson,
  type Context, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {buildDigestCaptionInputsV001, validateDigestDisplayV001, constructDigestCaptionCoreV001}
  from './candidate_digest_core_adapter_v001.mts';
import {runCandidateDiscoveryV001} from '../../runner/src/skills/candidate-discovery-v001.js';
import {runCaptionDisplayBoundariesV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';
const planPath = 'evals/clip_composition/jobs/presentation/candidate-digest-skill-e2e/fixed-plan-v002.json';
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const fixture = (): Context => {
  const segments = Array.from({length: 6}, (_, i) => ({id: i + 1, startMs: 1000 + i * 1000,
    endMs: 1500 + i * 1000, text: ['鍵', '発見', '余談', '扉', '開いた', '余談'][i]}));
  return {plan, planBinding: bind(planPath, plan), authorization: {}, rendererTemplate: {}, captionStyleTemplate: {}, priorCandidate: null,
    transcript: {segments} as any, utterances: {utterances: segments.map((s, i) => ({utteranceId: `u-${i + 1}`,
      ordinal: i + 1, text: s.text, sourceStartMs: s.startMs, sourceEndMs: s.endMs, sourceSegmentIds: [s.id]}))}} as Context;
};
const answer = () => ({status: 'complete', candidates: [
  {sourceId: plan.request.sourceId, title: '扉が開いた', reason: '結果が伝わる', evidenceUtteranceIds: ['u-5'],
    contextStartUtteranceId: 'u-4', contextEndUtteranceId: 'u-5'},
  {sourceId: plan.request.sourceId, title: '鍵を発見', reason: '発見の場面', evidenceUtteranceIds: ['u-1', 'u-2'],
    contextStartUtteranceId: 'u-1', contextEndUtteranceId: 'u-2'},
]});
async function invoke(c = fixture(), a: any = answer()) {
  const request = buildCandidateRequestV001(c);
  const response = {schemaVersion: 'candidate-discovery-judgment-response-v001', requestFileSha256: sha(formal(request)),
    answer: a, judgmentNote: 'これは検査用の合成回答。実素材の新規判断として数えない。'};
  const result = await runCandidateDiscoveryV001(request.input, async () => a);
  return {c, request, response, result};
}
async function adopt(c = fixture(), a: any = answer()) {
  const v = await invoke(c, a); return promoteCandidateAdoptionV001(validateCandidateAdoptionV001(v.c, v.request, v.response, v.result));
}
test('固定planに候補・候補数上限・独自の尺上限を事前記入できない', () => {
  assertDigestPlanV001(plan);
  for (const key of ['candidates', 'selectedIntervals', 'maxCandidates', 'durationMs']) {
    const altered = structuredClone(plan); altered.request[key] = [];
    assert.throws(() => assertDigestPlanV001(altered), /PLAN_INVALID/);
  }
});
test('採用は独立executorが行い、提案順から元素材順と正式位置を解決する', async () => {
  const p = await adopt();
  assert.deepEqual(p.adoption.selectedCandidates.map((r: Json) => r.resultOrdinal), [2, 1]);
  assert.deepEqual(p.editPlan.segments.map((r: Json) => [r.sourceStartMs, r.sourceEndMs]), [[1000, 2500], [4000, 5500]]);
  assert.equal(p.adoption.authorityKind, 'fixed-plan-machine-adoption-for-human-review');
  assert.equal(p.adoption.individualCandidateHumanApproval, 'not-performed');
  assert.equal(p.adoption.humanQuality, 'not-evaluated');
});
for (const [name, change, error] of [
  ['未知の文脈ID', (a: any) => {a.candidates[0].contextStartUtteranceId = 'unknown';}, /UNKNOWN_CONTEXT_ID/],
  ['他素材所属', (a: any) => {a.candidates[0].sourceId = 'other';}, /SOURCE_MISMATCH/],
  ['逆向き文脈', (a: any) => {a.candidates[0].contextStartUtteranceId = 'u-6';}, /CONTEXT_ORDER_INVALID/],
  ['未知の根拠ID', (a: any) => {a.candidates[0].evidenceUtteranceIds = ['unknown'];}, /UNKNOWN_EVIDENCE_ID/],
  ['文脈外の根拠', (a: any) => {a.candidates[0].evidenceUtteranceIds = ['u-6'];}, /EVIDENCE_OUTSIDE_CONTEXT/],
  ['根拠ID重複', (a: any) => {a.candidates[0].evidenceUtteranceIds = ['u-5', 'u-5'];}, /DUPLICATE_OR_ORDER/],
  ['文脈重複', (a: any) => {a.candidates[0].contextStartUtteranceId = 'u-2';}, /CONTEXT_OVERLAP/],
  ['単一候補', (a: any) => {a.candidates.pop();}, /MULTIPLE_HIGHLIGHTS/],
] as const) test(`${name}を採用前に拒否する`, async () => {
  const a = answer(); change(a); await assert.rejects(adopt(fixture(), a), error);
});
test('該当なしは描画可能な採用正本へ昇格しない', async () => {
  await assert.rejects(adopt(fixture(), {status: 'abstained'}), /ABSTAINED/);
});
test('別入力回答、SHA改変、raw result、JSONコピーの検査済み印を拒否する', async () => {
  const v = await invoke(); v.response.requestFileSha256 = 'a'.repeat(64);
  assert.throws(() => validateCandidateAdoptionV001(v.c, v.request, v.response, v.result), /PROVENANCE/);
  assert.throws(() => promoteCandidateAdoptionV001(v.result as any), /VALIDATED_MACHINE_ADOPTION_REQUIRED/);
  const x = await invoke(); const token = validateCandidateAdoptionV001(x.c, x.request, x.response, x.result);
  assert.throws(() => promoteCandidateAdoptionV001(structuredClone(token)), /VALIDATED_MACHINE_ADOPTION_REQUIRED/);
  const p = promoteCandidateAdoptionV001(token); p.editPlan.segments[0].sourceStartMs = 9999;
  assert.equal(promoteCandidateAdoptionV001(token).editPlan.segments[0].sourceStartMs, 1000);
});
test('候補の変更が正式区間と映像に使う発話集合を変える', async () => {
  const original = await adopt(); const a = answer();
  a.candidates[1].contextStartUtteranceId = 'u-2'; a.candidates[1].evidenceUtteranceIds = ['u-2'];
  const changed = await adopt(fixture(), a);
  assert.notDeepEqual(original.editPlan.segments, changed.editPlan.segments);
  assert.deepEqual(changed.editPlan.segments[0].sourceSegmentIds, [2]);
  assert.equal(changed.editPlan.segments[0].sourceStartMs, 2000);
});
test('標準入力は日本語の1行JSONを受理し、重複key・非有限値を拒否する', () => {
  assert.deepEqual(decodeDigestTransportV001('{"text":"日本語"}'), {text: '日本語'});
  for (const line of ['{"text":1,"text":2}', '{"text":NaN}', '{"text":1e999}']) {
    assert.throws(() => decodeDigestTransportV001(line));
  }
});

test('入口修正後は実行済みの同一候補判断だけを再開し、回答の差し替えを拒否する', async () => {
  // 指示-012の抽出後、新実装を旧planのSHAとして受理してはならない。
  await assert.rejects(loadDigestContextV001(planPath), /trusted file byte hash mismatch: evals\/clip_composition\/candidate_digest_core_adapter_v001.mts/);
  // 旧判断の検査はSHA照合した歴史入力から行う。製造入口や旧planを書き換えない。
  const c = {...fixture(),
    authorization: await readBound(plan.authorization),
    utterances: await readBound(plan.request.utterances),
    transcript: await readJson(plan.request.transcript.path),
    priorCandidate: Object.fromEntries(await Promise.all(Object.entries(plan.priorCandidateJudgment)
      .map(async ([k, b]) => [k, await readBound(b as any)]))),
  } as Context;
  assert.ok(c.priorCandidate);
  const r = buildCandidateRequestV001(c);
  assert.equal(sha(formal(r)), c.plan.priorCandidateJudgment.request.fileSha256);
  const token = validateCandidateAdoptionV001(c, r, c.priorCandidate.response, c.priorCandidate.result);
  assert.equal(promoteCandidateAdoptionV001(token).adoption.selectedCandidates.length, 3);
  const response = structuredClone(c.priorCandidate.response), result = structuredClone(c.priorCandidate.result);
  response.answer.candidates[0].title = '別の判断'; result.answer = response.answer;
  assert.throws(() => validateCandidateAdoptionV001(c, r, response, result), /PRIOR_JUDGMENT_CHANGED/);
});

test('候補ごとの字幕を無変更Skillで呼出し、全文順序とCoreへの対応を保存する', async () => {
  // 字幕配線検査だけに既存の正式timelineと本文片を使う。今回の新規候補実走とは別。
  const old = JSON.parse(await readFile('evals/clip_composition/jobs/presentation/caption-display-skill-e2e/fixed-plan-v001.json', 'utf8'));
  const oldMeaning = JSON.parse(await readFile(old.request.meaningInput.path, 'utf8'));
  const c = fixture();
  c.rendererTemplate = JSON.parse(await readFile(old.request.rendererTemplate.path, 'utf8'));
  c.captionStyleTemplate = JSON.parse(await readFile(old.request.sourcePackage.path, 'utf8'));
  const subset = ['segment-0001', 'segment-0002'].map(id => oldMeaning.atomOccurrences.filter((a: Json) => a.retainedSpans[0].timelineSegmentId === id).slice(0, 4));
  c.transcript.segments = subset.flat().map((a: Json, i: number) => ({id: i + 1, text: a.text,
    startMs: a.retainedSpans[0].sourceStartMs, endMs: a.retainedSpans[0].sourceEndMs}));
  c.utterances.utterances = c.transcript.segments.map((s: Json, i: number) => ({utteranceId: `fixture-u-${i + 1}`, text: s.text,
    sourceSegmentIds: [s.id], sourceStartMs: s.startMs, sourceEndMs: s.endMs}));
  const adoption = {schemaVersion: 'candidate-digest-machine-adoption-v001', selectedCandidates: subset.map((atoms: Json[], i: number) => ({
    candidateId: `candidate-${i + 1}`, timelineSegmentId: `segment-000${i + 1}`,
    sourceSegmentIds: atoms.map((a: Json, j: number) => i * 4 + j + 1),
    sourceInterval: {sourceStartMs: atoms[0].retainedSpans[0].sourceStartMs, sourceEndMs: atoms.at(-1).retainedSpans[0].sourceEndMs},
  }))};
  const base = {baseMedia: old.request.baseMedia.media, timeline: old.request.baseMedia.timeline,
    generationManifest: old.request.baseMedia.generationManifest, validationReceipt: old.request.baseMedia.validationReceipt};
  const inputs = buildDigestCaptionInputsV001(c, adoption, base);
  const tokens = [];
  for (const req of inputs.requests) {
    const caption = req.input.captions[0]; const end = caption.boundaryCandidates.at(-1).boundaryId;
    const a = {status: 'complete', captions: [{captionId: caption.captionId, cues: [{cueEndBoundaryId: end, lineEndBoundaryIds: [end]}]}]};
    const result = await runCaptionDisplayBoundariesV001(req.input, async () => a);
    const response = {schemaVersion: 'candidate-digest-display-response-v001', requestFileSha256: sha(formal(req)), answer: a,
      judgmentNote: '字幕接続の検査用合成回答'};
    tokens.push(validateDigestDisplayV001(req, response, result));
    const altered = structuredClone(response); altered.answer.captions[0].cues[0].cueEndBoundaryId = 'other-segment';
    const alteredResult = {...result, answer: altered.answer};
    assert.throws(() => validateDigestDisplayV001(req, altered, alteredResult), /CUE_ORDER_INVALID/);
  }
  const core = await constructDigestCaptionCoreV001(c, adoption, base, tokens);
  assert.equal(core.instruction.instructions.length, 2);
  assert.equal(core.instruction.instructions.map((r: Json) => r.content.text).join(''), c.transcript.segments.map((s: Json) => s.text).join(''));
  assert.equal(core.captionAdoption.displayJudgments.length, 2);
  await assert.rejects(constructDigestCaptionCoreV001(c, adoption, base, tokens.map(t => structuredClone(t))), /VALIDATED_DISPLAY_REQUIRED/);
});
