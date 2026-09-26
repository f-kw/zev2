/** Source-specific mechanical line-break repair; retains the failed caption attempt. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, ARTIFACTS as ORIGINAL, context} from './run_new_material_digest_20260926.mts';
export const ARTIFACTS = `${ORIGINAL}/caption-attempt-003`;
const load = async (p: string) => JSON.parse(await readFile(path.join(ROOT, p), 'utf8'));
export async function acceptDisplay(responsePath: string) {
  const { bind, publish, same, readBound, pass } = await import('./run_candidate_discovery_digest_skill_e2e_v001.mts');
  const { buildAdoptedCaptionInputsV001, validateDisplayForAdoptionV001, readValidatedDisplayTracesV001,
    assembleAdoptedCaptionCoreV001, CORE_FILES } = await import('./adopted_media_manufacturing_v001.mts');
  const { runCaptionDisplayBoundariesV001 } = await import('../../runner/src/skills/caption-display-boundaries-v001.js');
  const { buildPresentationRendererLineLayoutV002 } = await import('./presentation_renderer_line_layout_rule_v002.mjs');
  const { buildPresentationInstructionCommonCorePlanV001 } = await import('./run_presentation_instruction_renderer_job_v002.ts');
  const originalContext = await context('selection');
  const c = {...originalContext, plan: {...originalContext.plan, outputRoot: ARTIFACTS}};
  const adoption = await load(`${ORIGINAL}/machine-adoption.json`);
  const { schemaVersion, ...base } = await load(`${ORIGINAL}/base-media-bindings.json`);
  const input = buildAdoptedCaptionInputsV001(c, adoption.selectedCandidates, bind(`${ORIGINAL}/machine-adoption.json`, adoption), base,
    { meaning: 'new-material-presentation-meaning-input-v001', displayRequest: 'new-material-display-request-v001', sourceRole: 'new-material' });
  for (const [i, request] of input.requests.entries()) await publish(`${ARTIFACTS}/display-${i + 1}-request.json`, request);
  const oldResponses = await load(`${ORIGINAL}/display-judgment-input.json`);
  const groups = (await readFile(path.join(ROOT, responsePath), 'utf8')).trim().split('\n===\n');
  assert.equal(groups.length, input.requests.length);
  const responses = {responses: input.requests.map((request, i) => {
    const caption = request.input.captions[0];
    const full = caption.boundaryCandidates.map((b: any) => b.text).join('');
    assert.equal(groups[i].replaceAll('\n', '').replaceAll('|', ''), full);
    const ends = new Map<number, string>(); let offset = 0;
    for (const b of caption.boundaryCandidates) {offset += b.text.length; ends.set(offset, b.boundaryId);}
    offset = 0;
    const cues = groups[i].split('\n').map((cue: string) => {
      const lineEndBoundaryIds = cue.split('|').map(line => {offset += line.length; assert(ends.has(offset)); return ends.get(offset)!;});
      return {cueEndBoundaryId: lineEndBoundaryIds.at(-1)!, lineEndBoundaryIds};
    });
    const newEnds = cues.map(cue => cue.cueEndBoundaryId);
    assert(oldResponses.responses[i].answer.captions[0].cues.every((cue: any) => newEnds.includes(cue.cueEndBoundaryId)));
    return {schemaVersion: 'new-material-display-response-v001', requestFileSha256: bind(`${ARTIFACTS}/display-${i + 1}-request.json`, request).fileSha256,
      answer: {status: 'complete', captions: [{captionId: caption.captionId, cues}]},
      judgmentNote: '実フォント検査で安全領域を超えた12表示だけを機械的に修正。11表示は語句境界で二つへ分割し、1表示は改行位置を変更。本文・元音声との時刻対応・フォント・サイズ・位置を維持し、品質調整は行わない。'};
  })};
  await publish(`${ARTIFACTS}/display-judgment-input.json`, responses);
  assert.equal(responses.responses.length, input.requests.length);
  const tokens = [];
  for (const [i, request] of input.requests.entries()) {
    assert(same(request, await load(`${ARTIFACTS}/display-${i + 1}-request.json`)));
    const response = responses.responses[i];
    const result = await runCaptionDisplayBoundariesV001(request.input, async () => response.answer);
    tokens.push(validateDisplayForAdoptionV001(request, response, result, 'new-material-display-response-v001'));
    await publish(`${ARTIFACTS}/display-${i + 1}-response.json`, response);
    await publish(`${ARTIFACTS}/display-${i + 1}-result.json`, result);
  }
  const traces = readValidatedDisplayTracesV001(input.requests, tokens);
  const captionAdoption = { schemaVersion: 'new-material-caption-adoption-v001',
    machineAdoptionBinding: bind(`${ORIGINAL}/machine-adoption.json`, adoption),
    meaningInputBinding: bind(`${ARTIFACTS}/meaning-input.json`, input.meaning),
    displayJudgments: traces.map((v: any, i: number) => ({ candidateId: v.request.candidateId,
      request: bind(`${ARTIFACTS}/display-${i + 1}-request.json`, v.request),
      response: bind(`${ARTIFACTS}/display-${i + 1}-response.json`, v.response),
      result: bind(`${ARTIFACTS}/display-${i + 1}-result.json`, v.result) })),
    composition: 'validated-display-cues-in-adopted-source-order', quality: 'not-evaluated' };
  const artifacts: any = await assembleAdoptedCaptionCoreV001(c, input, base, captionAdoption, traces);
  for (const [key, name] of Object.entries(CORE_FILES)) await publish(`${ARTIFACTS}/${name}`, artifacts[key]);
  const style = await readBound(c.rendererTemplate.registryBindings.styleProfileRegistry);
  const trust = await readBound(c.rendererTemplate.registryBindings.rendererTrust);
  const layout = pass(buildPresentationRendererLineLayoutV002({ layoutId: `${c.plan.planId}-layout`,
    instructionArtifactBinding: bind(`${ARTIFACTS}/instruction.json`, artifacts.instruction), instructionArtifact: artifacts.instruction,
    meaningPackage: artifacts.meaning, lineEndProjection: artifacts.lineEndProjection, lineEndSourcePackage: artifacts.sourcePackage,
    maxLogicalWidth: artifacts.sourcePackage.promptInput.styleLimits.maxLogicalWidthPerLine,
    maxLines: artifacts.sourcePackage.promptInput.styleLimits.maxLinesPerCue,
    characterWidthRule: trust.layoutRules.characterWidthRule, lineLayoutRules: artifacts.rendererJob.executionInputs.lineLayoutRules }), 'NEW_MATERIAL_LAYOUT_INVALID').layout;
  await publish(`${ARTIFACTS}/line-layout.json`, layout);
  const common = pass(buildPresentationInstructionCommonCorePlanV001({ job: artifacts.rendererJob,
    visualStateId: artifacts.rendererJob.executionInputs.visualStateId, instructionArtifact: artifacts.instruction,
    lineLayout: layout, styleProfileRegistry: style, rendererTrust: trust }), 'NEW_MATERIAL_NORMAL_PLAN_INVALID');
  const oldPlan = await load(`${ORIGINAL}/normal-plan.json`);
  assert.equal(common.plan.elements.length, oldPlan.elements.length + 11);
  assert.deepEqual(common.plan.canvas, oldPlan.canvas);
  const failure = await load(`${ORIGINAL}/normal-layout-failure.json`);
  const permitted = new Set(failure.violations.map((v: any) => v.instructionId));
  const changes: any[] = []; let cursor = 0;
  for (const old of oldPlan.elements) {
    const group: any[] = []; let text = '';
    while (text.length < old.text.length) {
      const item = common.plan.elements[cursor++]; assert(item);
      text += item.text; group.push(item);
      assert.deepEqual(item.visualState, old.visualState);
      assert.deepEqual(item.transition, old.transition);
    }
    assert.equal(text, old.text);
    assert.deepEqual(group.flatMap(e => e.targetProvenance.sourceAtomIds), old.targetProvenance.sourceAtomIds);
    assert.equal(group[0].startFrame, old.startFrame);
    assert.equal(group.at(-1).endFrameExclusive, old.endFrameExclusive);
    if (group.length > 1 || !same(group[0].indexedLines, old.indexedLines)) {
      assert(permitted.has(old.instructionId));
      changes.push({originalCaptionId: old.instructionId, newCaptionIds: group.map(e => e.instructionId),
        beforeText: old.text, afterTexts: group.map(e => e.text),
        frameRanges: group.map(e => [e.startFrame, e.endFrameExclusive])});
    }
  }
  assert.equal(cursor, common.plan.elements.length);
  assert.equal(changes.length, permitted.size);
  await publish(`${ARTIFACTS}/repair-verification.json`, {status: 'passed', changes,
    unchanged: ['concatenated text', 'source atom order and coverage', 'outer cue clocks', 'font', 'size', 'position', 'style'],
    cueSplits: 11, lineBreakChanges: 1, originalAttemptsPreserved: true});
  await publish(`${ARTIFACTS}/normal-plan.json`, common.plan);
  return { captionCount: common.plan.elements.length, normalPlan: `${ARTIFACTS}/normal-plan.json` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await acceptDisplay(process.argv[2])));
}
