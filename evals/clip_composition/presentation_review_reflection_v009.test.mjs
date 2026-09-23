import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {AUTO_PRESENTATION_RULES_REF_V008, AUTO_PRESENTATION_RULES_REF_V009, sha256AutoPresentationV001,
  fixAutoPresentationProposalV001, createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {PRESENTATION_PANEL_PALETTES_V003} from './presentation_panel_presets_v002.mjs';

function fixture(rules = AUTO_PRESENTATION_RULES_REF_V009) {
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30},
    elements: ['first', 'second'].map((instructionId, index) => ({instructionId, kind: 'speech-caption',
      text: index ? '対象外の字幕。' : '原文と表示時刻を保つ。',
      startFrame: index * 90, endFrameExclusive: index * 90 + 70, displayFrameCount: 70,
      indexedLines: [{lineIndex: 0, text: index ? '対象外の字幕。' : '原文と表示時刻を保つ。', sourceUnitIds: [instructionId]}],
      visualState: {textStyle: {fontSizePx: 96, fontColor: '#FFFFFF', borderWidthPx: 3},
        position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0}}}))};
  const context = {baselineRef: {path: '/saved/normal.json', fileSha256: 'a'.repeat(64),
    canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: {path: '/saved/decision.json', fileSha256: 'b'.repeat(64)},
    renderingRulesRef: rules, pulseTimingEvidence: null};
  return {baselinePlan, context};
}
const panel = (presentation, paletteId) => ({role: 'Panel accent', presentation, scope: 'whole-caption',
  ...(paletteId === undefined ? {} : {paletteId})});
const fix = (f, selection) => fixAutoPresentationProposalV001({...f, proposal: {
  schemaVersion: 'auto-presentation-proposal-v001', context: f.context,
  targetCaptionIds: ['first', 'second'], completion: 'complete', effects: [{captionId: 'first', ...selection}], exceptions: []}});

test('new finite palettes survive saved reload, Normal and Reset with text, clock and other caption unchanged', () => {
  for (const presentation of ['provisional-panel', 'provisional-panel-graph-paper']) {
    for (const paletteId of ['ivory', 'cool', 'warm', 'dark']) {
      const f = fixture(), selection = panel(presentation, paletteId);
      const autoProposal = JSON.parse(JSON.stringify(fix(f, selection)));
      const initial = resolveAutoPresentationV001({...f, autoProposal});
      const first = initial.plan.elements[0], original = f.baselinePlan.elements[0];
      assert.deepEqual({...first, visualState: original.visualState}, original);
      assert.deepEqual(initial.plan.elements[1], f.baselinePlan.elements[1]);
      assert.equal(first.visualState.background.panelPaletteId, paletteId);
      assert.equal(first.visualState.background.color, PRESENTATION_PANEL_PALETTES_V003[paletteId].backgroundColor);
      assert.equal(first.visualState.textStyle.fontColor, PRESENTATION_PANEL_PALETTES_V003[paletteId].fontColor);
      let overrides = createAutoPresentationOverridesV001({...f, autoProposal});
      overrides = editAutoPresentationOverrideV001({...f, autoProposal, overrides, captionId: 'first', selection: 'Normal'});
      assert.deepEqual(resolveAutoPresentationV001({...f, autoProposal, overrides}).plan, f.baselinePlan);
      overrides = editAutoPresentationOverrideV001({...f, autoProposal,
        overrides: JSON.parse(JSON.stringify(overrides)), captionId: 'first', selection: 'Reset'});
      assert.deepEqual(resolveAutoPresentationV001({...f, autoProposal, overrides}).plan, initial.plan);
      assert.deepEqual(overrides.entries, []);
    }
  }
});

test('new plans reject comic, missing palette and arbitrary drawing values', () => {
  const f = fixture();
  for (const selection of [panel('provisional-panel-comic-frame'), panel('provisional-panel-comic-frame', 'ivory'),
    panel('provisional-panel'), panel('provisional-panel', 'unknown'),
    {...panel('provisional-panel', 'cool'), fontColor: '#FFFFFF'}]) assert.throws(() => fix(f, selection));
});

test('historical comic is read and Reset exactly; a new comic edit is rejected', () => {
  const f = fixture(AUTO_PRESENTATION_RULES_REF_V008), oldComic = panel('provisional-panel-comic-frame');
  const autoProposal = fix(f, oldComic), original = resolveAutoPresentationV001({...f, autoProposal}).plan;
  let overrides = createAutoPresentationOverridesV001({...f, autoProposal});
  assert.throws(() => editAutoPresentationOverrideV001({...f, autoProposal, overrides, captionId: 'first', selection: oldComic}), /unavailable/);
  overrides = editAutoPresentationOverrideV001({...f, autoProposal, overrides, captionId: 'first', selection: 'Normal'});
  overrides = editAutoPresentationOverrideV001({...f, autoProposal, overrides, captionId: 'first', selection: 'Reset'});
  assert.deepEqual(resolveAutoPresentationV001({...f, autoProposal, overrides}).plan, original);
  assert.throws(() => fix(f, panel('provisional-panel', 'warm')), /v009/);
});

test('previous saved rendering-rule identity stays exact', async () => {
  const source = JSON.parse(await readFile(new URL('../../docs/reports/digest-quality-q4-20260920-v001/hrb-recompile-lineage-v001.json', import.meta.url), 'utf8'));
  assert.deepEqual(AUTO_PRESENTATION_RULES_REF_V008, source.newRenderingRules);
  assert.notDeepEqual(AUTO_PRESENTATION_RULES_REF_V008, AUTO_PRESENTATION_RULES_REF_V009);
});
