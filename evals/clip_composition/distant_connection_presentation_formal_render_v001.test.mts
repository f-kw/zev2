import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validatePresentationCueEndProjectionV001,
  validatePresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {validatePresentationInstructionArtifactV002}
  from './presentation_instruction_artifact_v002.mjs';
import {validatePresentationInstructionRendererJobV002}
  from './presentation_renderer_admission_receipt_v002.mjs';
import {validatePresentationOutputCaptionCueSourcePackageV001}
  from './presentation_output_caption_cue_source_package_v001.mjs';
import {
  buildDistantConnectionPresentationFormalRenderV001,
  buildDistantConnectionPresentationRendererRepairedChromiumV001,
}
  from './distant_connection_presentation_formal_render_v001.mts';

test('正式字幕意味入力を文字・順序・時刻無変更で既存renderer jobへ投影する', async () => {
  const built = await buildDistantConnectionPresentationFormalRenderV001();
  const meaning = built.input.meaning;
  assert.equal(validatePresentationOutputCaptionCueSourcePackageV001(built.sourcePackage).status,
    'passed');
  assert.equal(validatePresentationCueEndProjectionV001(
    built.projection, {sourcePackage: built.sourcePackage, selection: built.selection},
  ).status, 'passed');
  assert.equal(validatePresentationSemanticLineEndProjectionV001(
    built.lineProjection, {sourcePackage: built.sourcePackage, cueEndProjection: built.projection},
  ).status, 'passed');
  assert.equal(validatePresentationInstructionArtifactV002(built.instruction, {
    meaningPackage: meaning, timeline: built.input.timeline, cueEndProjection: built.projection,
  }).status, 'passed');
  assert.equal(validatePresentationInstructionRendererJobV002(built.job).status, 'passed');
  assert.deepEqual(built.instruction.instructions.map(row => row.content.text), [
    '今年一怖いと言われるホラーゲーム',
    'おい、急に速くなった!おい、急に速くなった!',
  ]);
  assert.deepEqual(built.instruction.instructions.map(row => row.outputTime), [
    {startFrame: 101, endFrameExclusive: 279},
    {startFrame: 421, endFrameExclusive: 728},
  ]);
  assert.equal(meaning.atomOccurrences.map(row => row.text).join(''),
    built.instruction.instructions.map(row => row.content.text).join(''));
});

test('cueは承認済み前半・後半、行末は既存幅制約内の句読点境界だけを使う', async () => {
  const built = await buildDistantConnectionPresentationFormalRenderV001();
  const cues = built.selection.response.captions[0].cues;
  assert.equal(cues.length, 2);
  assert.equal(cues[0].cueEndBoundaryId.endsWith('000016'), true);
  assert.deepEqual(cues[1].lineEndBoundaryIds.map(value => value.slice(-6)), ['000027', '000038']);
  assert.equal(built.lineProjection.captions[0].cues[1].lineEndBoundaryIds.length, 2);
});

test('binding差と意味入力の言い換えをfail-closedにする', async () => {
  const built = await buildDistantConnectionPresentationFormalRenderV001();
  const changedSource = structuredClone(built.sourcePackage);
  changedSource.reconstructionMap.captions[0].captionId = 'unknown-caption';
  assert.equal(validatePresentationCueEndProjectionV001(
    built.projection, {sourcePackage: changedSource, selection: built.selection},
  ).status, 'rejected');
  const changedMeaning = structuredClone(built.input.meaning);
  changedMeaning.atomOccurrences[0].text = '別';
  assert.equal(validatePresentationInstructionArtifactV002(built.instruction, {
    meaningPackage: changedMeaning, timeline: built.input.timeline,
    cueEndProjection: built.projection,
  }).status, 'rejected');
  const changedJob = structuredClone(built.job);
  changedJob.cropAppliedBaseMedia.timeline.fileSha256 = '0'.repeat(64);
  assert.notEqual(changedJob.cropAppliedBaseMedia.timeline.fileSha256,
    built.job.cropAppliedBaseMedia.timeline.fileSha256);
});

test('同一入力から同一formal byteと同一jobを作る', async () => {
  const first = await buildDistantConnectionPresentationFormalRenderV001();
  const second = await buildDistantConnectionPresentationFormalRenderV001();
  assert.deepEqual(first.sourcePackage, second.sourcePackage);
  assert.deepEqual(first.selection, second.selection);
  assert.deepEqual(first.projection, second.projection);
  assert.deepEqual(first.lineProjection, second.lineProjection);
  assert.deepEqual(first.instruction, second.instruction);
  assert.deepEqual(first.job, second.job);
});

test('修復後Chromium jobはruntime SHAと新job/output識別子以外を変更しない', async () => {
  const built = await buildDistantConnectionPresentationRendererRepairedChromiumV001();
  const expected = structuredClone(built.sourceJob);
  expected.jobId = built.job.jobId;
  expected.attemptId = built.job.attemptId;
  expected.runtimeBindings.chromium.fileSha256 =
    'b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8';
  expected.publication = structuredClone(built.job.publication);
  assert.deepEqual(built.job, expected);
  assert.equal(validatePresentationInstructionRendererJobV002(built.job).status, 'passed');
});

test('修復後Chromium jobも同一入力から同一formal byteになる', async () => {
  const first = await buildDistantConnectionPresentationRendererRepairedChromiumV001();
  const second = await buildDistantConnectionPresentationRendererRepairedChromiumV001();
  assert.deepEqual(first.job, second.job);
  assert.deepEqual(first.bytes, second.bytes);
});
