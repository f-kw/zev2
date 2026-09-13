import assert from 'node:assert/strict';
import path from 'node:path';
import {test} from 'node:test';
import {loadPhase2BridgeContext, projectPhase2Bridge, validatePhase2Bridge} from './digest_v1_phase2_caption_bridge.mts';
import {ROOT, fileSha, publish, bind, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {buildPresentationInstructionCommonCorePlanV001} from './run_presentation_instruction_renderer_job_v002.ts';

// 既存実データを読み取り検証する。media decoder・renderer・AI判断は起動しない。
const job = process.env.DIGEST_PHASE2_BRIDGE_TEST_JOB;
assert(job, 'DIGEST_PHASE2_BRIDGE_TEST_JOB is required');
const context = await loadPhase2BridgeContext(job);
const original = projectPhase2Bridge(context);
const cases: Json[] = [];
test('保存済み実指示・全字幕と既存下位Coreの出力が一致する', () => {
  const validation = validatePhase2Bridge(original, context);
  assert.equal(validation.status, 'passed');
  assert.equal(original.actualTaskDescription.length, 815);
  assert.deepEqual(validation.counts, {captions: 325, atoms: 4437, ranges: 12});
  const common = buildPresentationInstructionCommonCorePlanV001({job: {executionInputs: original.executionInputs},
    visualStateId: original.executionInputs.visualStateId, instructionArtifact: original.instructionArtifact,
    lineLayout: original.lineLayout, styleProfileRegistry: context.style, rendererTrust: context.trust});
  assert.equal(common.status, 'built');
  assert.equal(common.plan.elements.length, 325);
  for (const [i, element] of common.plan.elements.entries()) {
    const row = original.instructionArtifact.instructions[i];
    assert.equal(element.text, row.content.text);
    assert.deepEqual([element.startFrame, element.endFrameExclusive], [row.outputTime.startFrame, row.outputTime.endFrameExclusive]);
    assert.deepEqual(element.indexedLines.map((l: Json) => l.renderedText), original.lineLayout.entries[i].lines.map((l: Json) => l.text));
    assert.deepEqual(element.targetProvenance.sourceAtomIds, row.targetProvenance.atomOccurrenceIds);
  }
  cases.push({name: 'actual-data-and-common-core', status: 'passed'});
});

const mutations: [string, (b: Json) => void][] = [
  ['taskDescription', b => {b.actualTaskDescription += '変更';}],
  ['384文字への実prompt置換', b => {b.actualTaskDescription = context.originalText.request.input.taskDescription;}],
  ['request binding', b => {b.semanticProvenance.actualRequest.fileSha256 = '0'.repeat(64);}],
  ['cue boundary', b => {b.boundaryProjection[0].cueEndBoundaryId = b.boundaryProjection[1].cueEndBoundaryId;}],
  ['line boundary', b => {b.boundaryProjection[0].lineEndBoundaryIds[0] = b.boundaryProjection[1].cueEndBoundaryId;}],
  ['本文', b => {b.instructionArtifact.instructions[0].content.text += 'あ';}],
  ['ID', b => {b.instructionArtifact.instructions[0].targetProvenance.atomOccurrenceIds[0] += '-changed';}],
  ['順序', b => {b.instructionArtifact.instructions.reverse();}],
  ['timing', b => {b.instructionArtifact.instructions[0].outputTime.endFrameExclusive += 1;}],
  ['source timing', b => {b.boundaryProjection[0].sourceEndMs += 1;}],
  ['style', b => {b.instructionArtifact.styleProfileId += '-changed';}],
  ['base media SHA', b => {b.semanticProvenance.baseMedia.baseMedia.fileSha256 = '0'.repeat(64);}],
  ['authority binding', b => {b.semanticProvenance.authority.fileSha256 = '0'.repeat(64);}],
  ['response binding', b => {b.semanticProvenance.response.fileSha256 = '0'.repeat(64);}],
  ['result binding', b => {b.semanticProvenance.result.fileSha256 = '0'.repeat(64);}],
  ['改行本文', b => {b.lineLayout.entries[0].lines[0].text += 'あ';}],
];
for (const [name, mutate] of mutations) test(`${name}改変を拒否する`, () => {
  const changed = structuredClone(original); mutate(changed);
  assert.throws(() => validatePhase2Bridge(changed, context));
  cases.push({name, status: 'passed', invalidInput: 'rejected'});
});
test('全結果を実装と実データに束縛して保存する', async () => {
  assert.equal(cases.length, mutations.length + 1);
  assert(cases.every(c => c.status === 'passed'));
  const implementationPath = 'evals/clip_composition/digest_v1_phase2_caption_bridge.mts';
  const testPath = 'evals/clip_composition/digest_v1_phase2_caption_bridge.test.mts';
  await publish(`${context.plan.outputRoot}/caption-bridge-tests-v001.json`, {
    schemaVersion: 'digest-v1-phase2-caption-bridge-tests-v001', status: 'passed', cases,
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(path.join(ROOT, implementationPath))},
    testImplementationBinding: {path: testPath, fileSha256: await fileSha(path.join(ROOT, testPath))},
    actualRequestBinding: original.semanticProvenance.actualRequest,
    bridgeBinding: bind(`${context.plan.outputRoot}/caption-bridge-v001.json`, original),
    frameRendering: 'not-started', meaningJudgments: 0,
  });
});
