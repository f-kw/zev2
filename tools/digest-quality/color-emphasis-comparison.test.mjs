import assert from 'node:assert/strict';
import test from 'node:test';
import {makeVariants} from './color-emphasis-comparison.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008, fixAutoPresentationProposalV001,
  createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  sha256AutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {indexExplicitLinesV001} from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';

function fixture() {
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001', elements: [
    ['000021', ['なんかさぁアングルで怖がらせんの', 'マジ上手いと思うここの会社'], 3381, 3598],
    ['000025', ['ホラーゲーやってるとさ', 'なんか分かってくるじゃん'], 3809, 3916],
    ['000028', ['来るよなっていうところじゃないところで'], 4067, 4224],
  ].map(([id, lines, startFrame, endFrameExclusive]) => {
    const indexed = indexExplicitLinesV001(lines);
    return {instructionId: id, kind: 'speech-caption', text: indexed.sourceText,
      indexedLines: indexed.indexedLines, startFrame, endFrameExclusive,
      sourceMapping: {sourceId: 'fixed-source', startFrame, endFrameExclusive},
      visualState: {textStyle: {fontColor: '#FFFDF8', fontSizePx: 96},
        position: {preset: 'lower-third'}, background: null}};
  })};
  const context = {baselineRef: {path: '/test/normal', fileSha256: 'a'.repeat(64),
    canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: {path: '/test/decision', fileSha256: 'b'.repeat(64)},
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V008, pulseTimingEvidence: null};
  const autoProposal = fixAutoPresentationProposalV001({baselinePlan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: baselinePlan.elements.map(e => e.instructionId), completion: 'complete',
      effects: [{captionId: '000021', role: 'Focus', presentation: 'provisional-focus',
        scope: 'partial-caption', targetText: 'アングルで怖がらせんのマジ上手い'}], exceptions: []}});
  const overrides = createAutoPresentationOverridesV001({baselinePlan, context, autoProposal});
  return {baselinePlan, autoPresentation: {context, autoProposal, overrides}};
}

test('comparison survives JSON reread, preserves saved input, timing, lines, source mapping and unrelated caption', () => {
  const input = fixture(), before = structuredClone(input);
  const result = JSON.parse(JSON.stringify(makeVariants(input.baselinePlan, input.autoPresentation)));
  assert.deepEqual(input, before);
  for (const variant of ['A', 'B', 'C']) {
    assert.deepEqual(result[variant].elements[2], input.baselinePlan.elements[2]);
    for (const [index, element] of result[variant].elements.entries()) {
      const {presentationColorRange, ...rest} = element;
      assert.deepEqual(rest, input.baselinePlan.elements[index]);
    }
  }
  assert.deepEqual(result.B.elements.slice(0, 2).map(e => e.presentationColorRange), [
    {startCodePoint: 5, endCodePointExclusive: 16, fontColor: '#FFD65A'},
    {startCodePoint: 14, endCodePointExclusive: 20, fontColor: '#FFD65A'},
  ]);
  assert.deepEqual(result.C.elements.slice(0, 2).map(e => e.presentationColorRange),
    result.B.elements.slice(0, 2).map(e => ({...e.presentationColorRange, fontColor: '#87CEFA'})));
});

test('comparison refuses to replace a saved human choice', () => {
  const {baselinePlan, autoPresentation} = fixture();
  autoPresentation.overrides = editAutoPresentationOverrideV001({baselinePlan, ...autoPresentation,
    captionId: '000021', selection: 'Normal'});
  assert.throws(() => makeVariants(baselinePlan, autoPresentation), /existing human choice/);
});

test('cyan remains outside the official saved selection contract', () => {
  const {baselinePlan, autoPresentation} = fixture();
  assert.throws(() => editAutoPresentationOverrideV001({baselinePlan, ...autoPresentation,
    captionId: '000025', selection: {role: 'Focus', presentation: 'provisional-focus',
      scope: 'partial-caption', targetText: '分かってくる', fontColor: '#87CEFA'}}));
});
