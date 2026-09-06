import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {
  bind, loadCaptionDisplayContextV001, buildCaptionDisplayJudgmentRequestV001,
  validateAndAdoptCaptionDisplayV001, promoteCaptionDisplayV001,
} from './run_caption_display_skill_e2e_v001.mts';
import {runCaptionDisplayBoundariesV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {serializePresentationOutputCropApplicationFormalJsonV001 as formal,
  sha256PresentationOutputCropApplicationBytesV001 as sha} from './presentation_output_crop_application_v001.mjs';
import {validatePresentationInstructionArtifactV002} from './presentation_instruction_artifact_v002.mjs';
import {validatePresentationInstructionRendererJobV002} from './presentation_renderer_admission_receipt_v002.mjs';

const planPath = 'evals/clip_composition/jobs/presentation/caption-display-skill-e2e/fixed-plan-v001.json';
const actualContext = await loadCaptionDisplayContextV001(process.cwd(), planPath);
// 新規呼出側は従来の保存fixtureで配線だけを検査。再開側の実回答とは分離する。
const context = structuredClone(actualContext);
context.plan.priorJudgment = null;
context.priorJudgment = null;
context.planBinding = bind(planPath, context.plan);
const request = buildCaptionDisplayJudgmentRequestV001(context);
const selection = JSON.parse(await readFile('evals/clip_composition/outputs/presentation/'
  + 'distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001/cue-selection-v001.json', 'utf8'));
const saved = {status: 'complete', ...selection.response};
async function judgment(answer = saved) {
  const result = await runCaptionDisplayBoundariesV001(request.input, async () => structuredClone(answer));
  const response = {schemaVersion: 'caption-display-skill-judgment-response-v001', requestFileSha256: sha(formal(request)), answer: structuredClone(answer), judgmentNote: '保存回答による配線検査専用'};
  return {result, response};
}

test('保存回答の配線で全既存projection・注文書・行幅とrenderer jobの検査を通す', async () => {
  const {result, response} = await judgment();
  const token = validateAndAdoptCaptionDisplayV001(context, request, response, result);
  const p = promoteCaptionDisplayV001(token);
  assert.equal(p.adoption.adoption.quality, 'not-evaluated');
  assert.equal(validatePresentationInstructionArtifactV002(p.instruction, {
    meaningPackage: context.meaning, timeline: context.timeline, cueEndProjection: p.cueEndProjection,
  }).status, 'passed');
  assert.equal(validatePresentationInstructionRendererJobV002(p.rendererJob).status, 'passed');
  assert.deepEqual(p.selection.response, selection.response);
  assert.deepEqual(p.rendererJob.executionInputs, context.rendererTemplate.executionInputs);
  assert.equal(p.instruction.instructions.map((v: any) => v.content.text).join(''), context.meaning.captions[0].text);
});

test('同一入力・同一採用回答から正式命令のbyteを再現できる', async () => {
  const {result, response} = await judgment();
  const a = promoteCaptionDisplayV001(validateAndAdoptCaptionDisplayV001(context, request, response, result));
  const b = promoteCaptionDisplayV001(validateAndAdoptCaptionDisplayV001(context, request, response, result));
  assert.deepEqual(formal(a), formal(b));
});

test('生result・正式selectionの偽装・コピーした検査トークンを昇格できない', async () => {
  const {result, response} = await judgment();
  assert.throws(() => promoteCaptionDisplayV001(result as any), /VALIDATED_ADOPTION_REQUIRED/);
  assert.throws(() => promoteCaptionDisplayV001(selection as any), /VALIDATED_ADOPTION_REQUIRED/);
  const token = validateAndAdoptCaptionDisplayV001(context, request, response, result);
  assert.throws(() => promoteCaptionDisplayV001({...token}), /VALIDATED_ADOPTION_REQUIRED/);
  assert.equal(validatePresentationInstructionArtifactV002(result).status, 'rejected');
});

test('不存在ID・所属・順序・全文欠落・不正改行を正式化前に拒否する', async () => {
  const edits = [
    (v: any) => {v.captions[0].cues[0].cueEndBoundaryId = 'missing';},
    (v: any) => {v.captions[0].captionId = 'other-caption';},
    (v: any) => {v.captions[0].cues.reverse();},
    (v: any) => {v.captions[0].cues.pop();},
    (v: any) => {v.captions[0].cues[0].lineEndBoundaryIds = ['missing'];},
    (v: any) => {v.captions[0].cues[0].lineEndBoundaryIds = [v.captions[0].cues.at(-1).cueEndBoundaryId];},
    (v: any) => {v.captions[0].cues[0].lineEndBoundaryIds.reverse();},
  ];
  for (const edit of edits) {
    const answer = structuredClone(saved); edit(answer);
    const {result, response} = await judgment(answer);
    assert.throws(() => validateAndAdoptCaptionDisplayV001(context, request, response, result), /CUE_INVALID|LINE_INVALID/);
  }
});

test('異なる入力・回答・SHAの由来を受理しない', async () => {
  const {result, response} = await judgment();
  assert.throws(() => validateAndAdoptCaptionDisplayV001(context, request, {...response, requestFileSha256: '0'.repeat(64)}, result), /PROVENANCE/);
  const changed = structuredClone(request); changed.input.captions[0].boundaryCandidates[0].text = '変更';
  assert.throws(() => validateAndAdoptCaptionDisplayV001(context, changed, response, result), /PROVENANCE/);
  const otherResult = structuredClone(result); (otherResult.answer as any).captions[0].cues.pop();
  assert.throws(() => validateAndAdoptCaptionDisplayV001(context, request, response, otherResult), /PROVENANCE/);
});

test('昇格後の命令・renderer jobは生回答ファイルを入力にしない', async () => {
  const {result, response} = await judgment();
  const p = promoteCaptionDisplayV001(validateAndAdoptCaptionDisplayV001(context, request, response, result));
  const rendererInputs = JSON.stringify({instruction: p.instruction, rendererJob: p.rendererJob});
  assert.equal(rendererInputs.includes('judgment-response.json'), false);
  assert.equal(rendererInputs.includes('skill-result.json'), false);
  assert.deepEqual(p.instruction.provenance.producerJobBinding,
    bind(context.plan.outputRoot + '/validation-and-adoption.json', p.adoption));
});

test('描画準備失敗から同じ新規判断をbyte同一で再開し、別の出力先へ昇格する', () => {
  const prior = actualContext.priorJudgment!;
  const p = promoteCaptionDisplayV001(validateAndAdoptCaptionDisplayV001(
    actualContext, prior.request, prior.response, prior.result));
  assert.deepEqual(p.selection.response.captions, prior.result.answer.captions);
  assert.deepEqual(p.adoption.priorJudgmentBindings, actualContext.plan.priorJudgment);
  assert.match(p.rendererJob.publication.renderOutputRoot, /^evals\/clip_composition\/outputs\/presentation\//);
  const wrong = structuredClone(prior.request); wrong.input.captions[0].boundaryCandidates[0].text = '変更';
  assert.throws(() => validateAndAdoptCaptionDisplayV001(actualContext, wrong, prior.response, prior.result), /PROVENANCE/);
  const changedResponse = structuredClone(prior.response);
  const changedResult = structuredClone(prior.result);
  changedResponse.answer.captions[0].cues.pop(); changedResult.answer.captions[0].cues.pop();
  assert.throws(() => validateAndAdoptCaptionDisplayV001(actualContext, prior.request, changedResponse, changedResult), /PROVENANCE/);
});
