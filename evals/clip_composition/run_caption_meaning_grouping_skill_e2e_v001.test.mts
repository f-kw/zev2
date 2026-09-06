import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {
  assertCaptionMeaningPlanV001, loadCaptionMeaningContextV001, buildCaptionMeaningRequestV001,
  validateAndAdoptCaptionMeaningV001, promoteCaptionMeaningV001, buildGroupedDisplayRequestsV001,
  validateAndAdoptGroupedDisplayV001, promoteGroupedDisplayV001,
  flattenValidatedCaptionDisplaysV001, promoteCaptionMeaningCoreV001,
} from './run_caption_meaning_grouping_skill_e2e_v001.mts';
import {runCaptionMeaningGroupingV001} from '../../runner/src/skills/caption-meaning-grouping-v001.js';
import {runCaptionDisplayBoundariesV001, assertCaptionDisplayInputV001}
  from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {serializePresentationOutputCropApplicationFormalJsonV001 as formal,
  sha256PresentationOutputCropApplicationBytesV001 as sha} from './presentation_output_crop_application_v001.mjs';
import {validatePresentationInstructionArtifactV002} from './presentation_instruction_artifact_v002.mjs';
import {validatePresentationInstructionRendererJobV002} from './presentation_renderer_admission_receipt_v002.mjs';

const planPath = 'evals/clip_composition/jobs/presentation/caption-meaning-grouping-skill-e2e/fixed-plan-v001.json';
const c = await loadCaptionMeaningContextV001(process.cwd(), planPath);
const request = buildCaptionMeaningRequestV001(c);
const boundaries = c.origin.sourcePackage.promptInput.captions[0].boundaryCandidates;
const old = JSON.parse(await readFile('evals/clip_composition/outputs/presentation/'
  + 'work-caption-display-skill-doctor-20260906-v004/skill-result.json', 'utf8')).answer;
// 保存済み表示回答と一致する区分を配線testにだけ使用。実動画の新規意味判断には使用しない。
const fixtureMeaning = {status: 'complete', containers: request.input.containers.map((container: any, i: number) => ({
  containerId: container.containerId, meaningGroups: (i === 0 ? [35, 62, 88, 106] : [135, 159, 177, 190])
    .map(end => ({meaningGroupEndBoundaryCandidateId: boundaries[end - 1].boundaryId})),
}))};
const responseFor = (request: any, answer: any) => ({schemaVersion: 'caption-meaning-e2e-local-response-v001',
  requestSha256: sha(formal(request)), answer: structuredClone(answer), judgmentNote: '保存回答を使う配線test。実際の新規判断とは数えない。'});
async function meaning(answer = fixtureMeaning) {
  const result = await runCaptionMeaningGroupingV001(request.input, async () => structuredClone(answer));
  const response = responseFor(request, answer);
  const token = validateAndAdoptCaptionMeaningV001(c, request, response, result);
  return {token, response, result};
}
function fixtureDisplay(r: any) {
  const ids = new Set(r.input.captions[0].boundaryCandidates.map((v: any) => v.boundaryId));
  return {status: 'complete', captions: [{captionId: r.groupId,
    cues: structuredClone(old.captions[0].cues.filter((cue: any) => ids.has(cue.cueEndBoundaryId)))}]};
}
async function pipeline() {
  const m = await meaning(); const collection = buildGroupedDisplayRequestsV001(c, m.token);
  const tokens = []; const traces = []; const observed = [];
  for (const [i, r] of collection.requests.entries()) {
    const answer = fixtureDisplay(r);
    const result = await runCaptionDisplayBoundariesV001(r.input, async input => {
      observed.push(structuredClone(input)); return structuredClone(answer);
    });
    const response = responseFor(r, answer);
    tokens.push(validateAndAdoptGroupedDisplayV001(c, m.token, i, r, response, result));
    traces.push({r, response, result});
  }
  return {...m, collection, tokens, traces, observed};
}

test('固定planは二つのSkill・ローカル判断・review用採用だけを許可する', () => {
  assertCaptionMeaningPlanV001(c.plan);
  for (const alter of [
    (v: any) => {v.skills[0].apiCommunication = 'allowed';},
    (v: any) => {v.skills.reverse();},
    (v: any) => {v.skills[1].version = 'v002';},
    (v: any) => {v.adoptionPolicies.meaning = 'automatically-approved';},
    (v: any) => {v.outputRoot = 'evals/clip_composition/outputs/../existing';},
    (v: any) => {v.implementationBindings[0].fileSha256 = 'wrong';},
  ]) {
    const value = structuredClone(c.plan); alter(value);
    assert.throws(() => assertCaptionMeaningPlanV001(value));
  }
});

test('入力ID・本文・所属・順序は5正本から検査した既存発話列と一致する', () => {
  const flattened = request.input.containers.flatMap((v: any) => v.boundaryCandidates);
  assert.deepEqual(flattened.map((v: any) => v.boundaryCandidateId), boundaries.map((v: any) => v.boundaryId));
  assert.deepEqual(flattened.flatMap((v: any) => v.utteranceIds), c.origin.meaning.atomOccurrences.map((v: any) => v.semanticUtteranceId));
  assert.equal(flattened.map((v: any) => v.text).join(''), c.origin.meaning.captions[0].text);
  for (const [i, container] of request.input.containers.entries()) {
    assert.equal(container.containerId, `segment-000${i + 1}`);
    assert.equal(container.boundaryCandidates.length, c.origin.meaning.orderedParts[i].atomOccurrenceIds.length);
  }
  assert.equal(JSON.stringify(request.input).includes('sourceStartMs'), false);
  assert.equal(JSON.stringify(request.input).includes('styleLimits'), false);
});

test('意味回答の不存在ID・別所属・順序逆転・重複・末尾欠落を拒否する', async () => {
  for (const alter of [
    (v: any) => {v.containers[0].meaningGroups[0].meaningGroupEndBoundaryCandidateId = 'missing-boundary';},
    (v: any) => {v.containers[0].meaningGroups[0].meaningGroupEndBoundaryCandidateId = boundaries[189].boundaryId;},
    (v: any) => {v.containers[0].meaningGroups.reverse();},
    (v: any) => {v.containers[0].meaningGroups[1] = structuredClone(v.containers[0].meaningGroups[0]);},
    (v: any) => {v.containers[0].meaningGroups.pop();},
    (v: any) => {v.containers.reverse();},
    (v: any) => {v.containers[0].containerId = 'missing-container';},
  ]) {
    const answer = structuredClone(fixtureMeaning); alter(answer);
    await assert.rejects(meaning(answer), /MEANING_/);
  }
});

test('本文・絶対時刻・表示行末・正式採用を意味回答へ混入できない', async () => {
  for (const key of ['text', 'startMs', 'endFrame', 'lineEndBoundaryIds', 'adopted']) {
    const answer: any = structuredClone(fixtureMeaning); answer.containers[0].meaningGroups[0][key] = 'generated';
    await assert.rejects(meaning(answer), /OUTPUT_INVALID/);
  }
});

test('入力・回答SHA・Skill結果を取り替えた由来を受理しない', async () => {
  const m = await meaning();
  const changed = structuredClone(request); changed.input.containers[0].boundaryCandidates[0].utteranceIds = ['missing-utterance'];
  assert.throws(() => validateAndAdoptCaptionMeaningV001(c, changed, responseFor(changed, fixtureMeaning), m.result), /PROVENANCE/);
  assert.throws(() => validateAndAdoptCaptionMeaningV001(c, request, {...m.response, requestSha256: '0'.repeat(64)}, m.result), /PROVENANCE/);
  const result: any = structuredClone(m.result); result.answer.containers[0].meaningGroups.pop();
  assert.throws(() => validateAndAdoptCaptionMeaningV001(c, request, m.response, result), /PROVENANCE/);
});

test('生の意味result・コピーしたtoken・辞退から正式値を作れない', async () => {
  const m = await meaning();
  assert.throws(() => promoteCaptionMeaningV001(m.result as any), /VALIDATED_MEANING_REQUIRED/);
  assert.throws(() => promoteCaptionMeaningV001({...m.token}), /VALIDATED_MEANING_REQUIRED/);
  assert.throws(() => buildGroupedDisplayRequestsV001(c, m.result as any), /VALIDATED_MEANING_REQUIRED/);
  assert.equal(validatePresentationInstructionArtifactV002(m.result).status, 'rejected');
  const result = await runCaptionMeaningGroupingV001(request.input, async () => ({status: 'abstained'}));
  assert.throws(() => validateAndAdoptCaptionMeaningV001(c, request, responseFor(request, result.answer), result), /MEANING_ANSWER_REJECTED/);
});

test('意味の昇格は全文・全atomと独立した由来を保持し、検査後の改変を受けない', async () => {
  const m = await meaning(); const p = promoteCaptionMeaningV001(m.token); const before = formal(p);
  assert.equal(p.artifact.groups.length, 8);
  assert.equal(p.artifact.groups.map((v: any) => v.text).join(''), c.origin.meaning.captions[0].text);
  assert.deepEqual(p.artifact.groups.flatMap((v: any) => v.atomOccurrenceIds), c.origin.meaning.captions[0].atomOccurrenceIds);
  assert.equal(p.adoption.adoption.humanQuality, 'not-evaluated');
  p.artifact.groups.length = 0; (m.result.answer as any).containers.length = 0; m.response.answer.containers.length = 0;
  assert.deepEqual(formal(promoteCaptionMeaningV001(m.token)), before);
});

test('各意味まとまりから第1 Skillを実際に呼び、入力schemaと実装byteを無変更再利用する', async () => {
  const p = await pipeline();
  assert.equal(p.observed.length, 8);
  for (const [i, input] of p.observed.entries()) {
    assertCaptionDisplayInputV001(input);
    assert.equal(input.captions.length, 1);
    assert.equal(input.captions[0].captionId, p.collection.requests[i].groupId);
    assert.deepEqual(input.styleLimits, c.origin.sourcePackage.promptInput.styleLimits);
  }
  const ref = c.origin.plan.implementationBindings[0];
  assert.equal(createHash('sha256').update(await readFile(ref.path)).digest('hex'), ref.fileSha256);
  assert.equal(ref.fileSha256, '39e0a2bbea05b558fdb81cb2e48fbacd06d0e052a23dd21ab2b5f1c4bed702b3');
});

test('表示が別の意味まとまりへ越境・欠落・順序変更する回答を拒否する', async () => {
  const m = await meaning(); const collection = buildGroupedDisplayRequestsV001(c, m.token);
  const r = collection.requests[0];
  for (const alter of [
    (v: any) => {v.captions[0].captionId = collection.requests[1].groupId;},
    (v: any) => {v.captions[0].cues[0].cueEndBoundaryId = boundaries[61].boundaryId;},
    (v: any) => {v.captions[0].cues.reverse();},
    (v: any) => {v.captions[0].cues.pop();},
    (v: any) => {v.captions[0].cues[0].lineEndBoundaryIds = [boundaries[61].boundaryId];},
    (v: any) => {v.captions[0].cues[0].lineEndBoundaryIds = [boundaries[1].boundaryId];},
  ]) {
    const answer = fixtureDisplay(r); alter(answer);
    const result = await runCaptionDisplayBoundariesV001(r.input, async () => answer);
    assert.throws(() => validateAndAdoptGroupedDisplayV001(c, m.token, 0, r, responseFor(r, answer), result), /DISPLAY_/);
  }
});

test('表示回答の本文・自由時刻・採用宣言、入力差替えと虚偽SHAを拒否する', async () => {
  const p = await pipeline(); const trace = p.traces[0];
  for (const key of ['text', 'startMs', 'startFrame', 'adopted']) {
    const answer: any = fixtureDisplay(trace.r); answer.captions[0].cues[0][key] = 'generated';
    const result = await runCaptionDisplayBoundariesV001(trace.r.input, async () => answer);
    assert.throws(() => validateAndAdoptGroupedDisplayV001(c, p.token, 0, trace.r, responseFor(trace.r, answer), result), /OUTPUT_INVALID/);
  }
  assert.throws(() => validateAndAdoptGroupedDisplayV001(c, p.token, 0, trace.r,
    {...trace.response, requestSha256: '0'.repeat(64)}, trace.result), /PROVENANCE/);
  const changed = structuredClone(trace.r); changed.input.captions[0].boundaryCandidates[0].text = '変更';
  assert.throws(() => validateAndAdoptGroupedDisplayV001(c, p.token, 0, changed,
    responseFor(changed, trace.response.answer), trace.result), /PROVENANCE/);
});

test('幅超過と一行に収まる本文の不要改行を既存幅規約で拒否する', async () => {
  const m = await meaning(); const r = buildGroupedDisplayRequestsV001(c, m.token).requests[0];
  const tooWide = fixtureDisplay(r);
  tooWide.captions[0].cues = [{cueEndBoundaryId: boundaries[34].boundaryId, lineEndBoundaryIds: [boundaries[34].boundaryId]}];
  const broken = fixtureDisplay(r); broken.captions[0].cues[0].lineEndBoundaryIds = [boundaries[4].boundaryId, boundaries[11].boundaryId];
  for (const [answer, code] of [[tooWide, /DISPLAY_LINE_WIDTH/], [broken, /UNNECESSARY_LINE_BREAK/]] as const) {
    const result = await runCaptionDisplayBoundariesV001(r.input, async () => answer);
    assert.throws(() => validateAndAdoptGroupedDisplayV001(c, m.token, 0, r, responseFor(r, answer), result), code);
  }
});

test('表示の生result・コピーしたtokenは昇格できず、辞退も救済されない', async () => {
  const p = await pipeline();
  assert.throws(() => promoteGroupedDisplayV001(p.traces[0].result as any), /VALIDATED_DISPLAY_REQUIRED/);
  assert.throws(() => promoteGroupedDisplayV001({...p.tokens[0]}), /VALIDATED_DISPLAY_REQUIRED/);
  const r = p.collection.requests[0];
  const result = await runCaptionDisplayBoundariesV001(r.input, async () => ({status: 'abstained', reason: '不足'}));
  assert.throws(() => validateAndAdoptGroupedDisplayV001(c, p.token, 0, r, responseFor(r, result.answer), result), /DISPLAY_ABSTAINED/);
});

test('flattenは検査済み表示を結合・分割・再判断せず元順に保ち、全表示の意味所属を保持する', async () => {
  const p = await pipeline(); const f = flattenValidatedCaptionDisplaysV001(c, p.token, p.tokens);
  assert.deepEqual(f.captions[0].cues, old.captions[0].cues);
  assert.deepEqual(f.captions[0].cues, p.tokens.flatMap(t => promoteGroupedDisplayV001(t).selection.cues));
  assert.equal(f.mappings.length, f.captions[0].cues.length);
  assert.deepEqual(f.mappings.flatMap(v => v.atomOccurrenceIds), c.origin.meaning.captions[0].atomOccurrenceIds);
  const groups = promoteCaptionMeaningV001(p.token).artifact.groups;
  f.mappings.forEach((v, i) => {
    assert.equal(v.displayOrdinal, i + 1);
    const group = groups.find((g: any) => g.groupId === v.groupId);
    assert.ok(group); assert.ok(v.atomOccurrenceIds.every((id: string) => group.atomOccurrenceIds.includes(id)));
    assert.equal(v.cueEndBoundaryId, f.captions[0].cues[i].cueEndBoundaryId);
    assert.deepEqual(v.lineEndBoundaryIds, f.captions[0].cues[i].lineEndBoundaryIds);
  });
});

test('意味まとまりを削除・順序変更・他の採用回答から移植した表示列をflattenできない', async () => {
  const p = await pipeline(); const other = await pipeline();
  assert.throws(() => flattenValidatedCaptionDisplaysV001(c, p.token, p.tokens.slice(1)), /DISPLAY_GROUP_COVERAGE/);
  assert.throws(() => flattenValidatedCaptionDisplaysV001(c, p.token, [...p.tokens].reverse()), /VALIDATED_DISPLAY_ORDER_REQUIRED/);
  assert.throws(() => flattenValidatedCaptionDisplaysV001(c, p.token, [p.tokens[0], p.tokens[0], ...p.tokens.slice(2)]), /VALIDATED_DISPLAY_ORDER_REQUIRED/);
  assert.throws(() => flattenValidatedCaptionDisplaysV001(c, other.token, p.tokens), /VALIDATED_DISPLAY_ORDER_REQUIRED/);
  assert.throws(() => flattenValidatedCaptionDisplaysV001(c, p.token, p.traces.map(t => t.result) as any), /VALIDATED_DISPLAY_ORDER_REQUIRED/);
});

test('既存Coreの注文書・投影・行組み・renderer job検査へ接続し、本文と描画条件を保持する', async () => {
  const p = await pipeline(); const core = promoteCaptionMeaningCoreV001(c, p.token, p.tokens);
  assert.equal(validatePresentationInstructionArtifactV002(core.instruction, {meaningPackage: c.origin.meaning,
    timeline: c.origin.timeline, cueEndProjection: core.cueEndProjection}).status, 'passed');
  assert.equal(validatePresentationInstructionRendererJobV002(core.rendererJob).status, 'passed');
  assert.equal(core.instruction.instructions.map((v: any) => v.content.text).join(''), c.origin.meaning.captions[0].text);
  assert.deepEqual(core.rendererJob.executionInputs, c.origin.rendererTemplate.executionInputs);
  assert.deepEqual(core.rendererJob.runtimeBindings, c.origin.rendererTemplate.runtimeBindings);
  assert.deepEqual(core.rendererJob.registryBindings, c.origin.rendererTemplate.registryBindings);
  assert.deepEqual(core.adoption.mappings.map((v: any) => v.atomOccurrenceIds),
    core.instruction.instructions.map((v: any) => v.targetProvenance.atomOccurrenceIds));
  assert.equal(JSON.stringify(core.rendererJob).includes('judgment-'), false);
  assert.equal(JSON.stringify(core.rendererJob).includes('skill-result'), false);
});

test('同一入力・同一の意味/表示採用回答から正式値と由来のbyteを再現する', async () => {
  const a = await pipeline(); const b = await pipeline();
  assert.deepEqual(formal(promoteCaptionMeaningV001(a.token)), formal(promoteCaptionMeaningV001(b.token)));
  assert.deepEqual(formal(promoteCaptionMeaningCoreV001(c, a.token, a.tokens)),
    formal(promoteCaptionMeaningCoreV001(c, b.token, b.tokens)));
});
