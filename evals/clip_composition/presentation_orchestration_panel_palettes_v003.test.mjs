import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fixture} from './presentation_orchestration_v001.test.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V009} from './presentation_auto_effects_v001.mjs';
import {PRESENTATION_PANEL_PALETTES_V003} from './presentation_panel_presets_v002.mjs';
import {PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001} from './presentation_caption_motion_v001.mjs';
import {PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001} from './presentation_pulse_v001.mjs';
import {
  createOrchestrationContextV001, createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001,
  selectOrchestrationPanelPaletteV003, recompileOrchestrationPanelPalettesV003,
  editOrchestrationOverrideV001, resolveOrchestrationDrawingViewV001,
  exportOrchestrationDrawingViewEvidenceV001, restoreOrchestrationDrawingViewEvidenceV001,
} from './presentation_orchestration_v001.mjs';

const copy = value => structuredClone(value);
const bytes = value => JSON.stringify(value) + '\n';
const sha = value => createHash('sha256').update(value).digest('hex');
const hash = value => sha(canonicalJson(value));
const paletteIds = ['ivory', 'cool', 'warm', 'dark'];
// Real saved media inputs can live outside the current checkout after Git consolidation.
const savedOutputRoot = process.env.ZEV_PANEL_SAVED_OUTPUT_ROOT
  ?? 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001';
const fixed = (f, reply = f.reply) => fixOrchestrationJudgmentV001({context: f.context, input: f.input, replyBytes: bytes(reply)});
const view = (f, state) => resolveOrchestrationDrawingViewV001({context: f.context, state});
function newFixture() {
  const legacy = fixture(), source = {...copy(legacy.source),
    captionContext: {...copy(legacy.source.captionContext), renderingRulesRef: copy(AUTO_PRESENTATION_RULES_REF_V009)}};
  const context = createOrchestrationContextV001(source);
  const input = createOrchestrationJudgmentInputV001({context, evidence: legacy.evidence});
  const reply = copy(legacy.reply);
  reply.schemaVersion = 'presentation-orchestration-judgment-v003'; reply.inputSha256 = input.inputSha256;
  for (const row of reply.captions) {
    const panel = row.allowedPresets.find(choice => choice.preset === 'panel');
    panel.allowedBackgroundPresets = ['plain', 'graph-paper']; panel.allowedPaletteIds = [...paletteIds];
  }
  return {...legacy, source, context, input, reply, legacy};
}
function originals(record, selectionRecordBytes = bytes(record), inputBytes = bytes(record.input)) {
  return {selectionRecordBytes, selectionRecordFileSha256: sha(selectionRecordBytes),
    inputBytes, inputFileSha256: sha(inputBytes), replyBytes: record.replyBytes, replyFileSha256: sha(record.replyBytes)};
}
const semantic = row => ({status: row.status, semanticRole: row.semanticRole, reason: row.reason, evidenceIds: row.evidenceIds});

test('new rules bind a versioned three-stage finite choice without changing the old v002 input', () => {
  const f = newFixture();
  assert.equal(f.context.schemaVersion, 'presentation-orchestration-context-v003');
  assert.equal(f.input.schemaVersion, 'presentation-orchestration-judgment-input-v003');
  assert.equal(f.input.orchestrationVersion, 'presentation-orchestration-v003');
  assert.deepEqual(f.input.panelBackgroundPresets, ['plain', 'graph-paper']);
  assert.deepEqual(f.input.panelPaletteIdsByBackground, {plain: paletteIds, 'graph-paper': paletteIds});
  assert.equal(f.input.policy.panelPaletteOnlyAfterBackground, true);
  assert.deepEqual(f.input.captionRolePresets, f.legacy.input.captionRolePresets);
  assert.equal(f.legacy.input.schemaVersion, 'presentation-orchestration-judgment-input-v002');
  assert.deepEqual(f.legacy.input.panelBackgroundPresets, ['plain', 'graph-paper', 'comic-frame']);
  assert.equal(Object.hasOwn(f.legacy.input, 'panelPaletteIdsByBackground'), false);
});

test('adding palettes cannot change Panel frequency, background, other expressions or connections', () => {
  const f = newFixture(), single = copy(f.reply);
  for (const row of single.captions) row.allowedPresets.find(choice => choice.preset === 'panel').allowedPaletteIds = ['ivory'];
  const before = fixed(f, single), after = fixed(f);
  assert.deepEqual(after.connectionAuto, before.connectionAuto);
  assert.deepEqual(after.selectionRecord.connections, before.selectionRecord.connections);
  assert.deepEqual(after.selectionRecord.captions.map(row => row.selection), before.selectionRecord.captions.map(row => row.selection));
  assert.deepEqual(after.selectionRecord.captions.map(row => row.panelBackgroundSelection), before.selectionRecord.captions.map(row => row.panelBackgroundSelection));
  assert.deepEqual(after.captionAuto.proposal.effects.filter(row => row.role !== 'Panel accent'),
    before.captionAuto.proposal.effects.filter(row => row.role !== 'Panel accent'));
  assert.deepEqual(view(f, after).projection, view(f, before).projection);
  for (const row of after.selectionRecord.captions.filter(row => row.selection.selectedPreset.preset !== 'panel')) {
    assert.equal(row.panelPaletteSelection, null);
    assert.deepEqual(view(f, after).resolvedPlan.elements.find(element => element.instructionId === row.captionId),
      view(f, before).resolvedPlan.elements.find(element => element.instructionId === row.captionId));
  }
});

test('palette choice uses its own full hash and ignores row/set order while one-item changes stay local', () => {
  const f = newFixture();
  for (const row of f.reply.captions) row.allowedPresets = row.allowedPresets.filter(choice => choice.preset === 'panel');
  const before = fixed(f), reordered = copy(f.reply);
  reordered.captions.reverse(); reordered.connections.reverse();
  for (const row of reordered.captions) {
    row.allowedPresets[0].allowedBackgroundPresets.reverse(); row.allowedPresets[0].allowedPaletteIds.reverse();
  }
  const after = fixed(f, reordered);
  assert.deepEqual(after.captionAuto, before.captionAuto); assert.deepEqual(after.connectionAuto, before.connectionAuto);
  for (const [index, row] of before.selectionRecord.captions.entries()) {
    const palette = row.panelPaletteSelection;
    assert.deepEqual(palette, after.selectionRecord.captions[index].panelPaletteSelection);
    assert.equal(palette.selectionSha256, hash([f.context.digestRef.sha256,
      'presentation-orchestration-panel-palette-v001', 'caption-panel-palette', row.captionId,
      row.panelBackgroundSelection.selectedPreset]));
    assert.notEqual(palette.selectionSha256, row.selection.selectionSha256);
    assert.notEqual(palette.selectionSha256, row.panelBackgroundSelection.selectionSha256);
  }
  const changedReply = copy(f.reply); changedReply.captions[0].allowedPresets[0].allowedPaletteIds = ['dark'];
  const changed = fixed(f, changedReply);
  assert.deepEqual(changed.selectionRecord.captions.slice(1), before.selectionRecord.captions.slice(1));
  assert.deepEqual(changed.connectionAuto, before.connectionAuto);
});

test('deliberate singleton coverage materializes all eight declared pairs without claiming automatic diversity', () => {
  const f = newFixture();
  for (const background of ['plain', 'graph-paper']) for (const paletteId of paletteIds) {
    const reply = copy(f.reply);
    for (const row of reply.captions) row.allowedPresets = [{preset: 'panel',
      allowedBackgroundPresets: [background], allowedPaletteIds: [paletteId]}];
    const state = fixed(f, reply), drawn = view(f, state);
    for (const [index, row] of state.selectionRecord.captions.entries()) {
      assert.equal(row.panelPaletteSelection.selectedPaletteId, paletteId);
      assert.deepEqual(row.finalCaptionChoice, {preset: background === 'plain' ? 'panel' : 'panel-graph-paper', paletteId});
      const element = drawn.resolvedPlan.elements[index];
      assert.equal(element.visualState.background.panelPresetId, background);
      assert.equal(element.visualState.background.panelPaletteId, paletteId);
      assert.equal(element.visualState.background.color, PRESENTATION_PANEL_PALETTES_V003[paletteId].backgroundColor);
      assert.equal(element.visualState.textStyle.fontColor, PRESENTATION_PANEL_PALETTES_V003[paletteId].fontColor);
      assert.equal(element.text, f.plan.elements[index].text);
      assert.equal(element.displayFrameCount, f.plan.elements[index].displayFrameCount);
    }
  }
});

test('new selection rejects comic, missing or arbitrary palettes, duplicate sets and drawing fields before fixation', () => {
  const f = newFixture();
  const invalid = [
    {preset: 'panel', allowedBackgroundPresets: ['plain']},
    {preset: 'panel', allowedBackgroundPresets: ['comic-frame'], allowedPaletteIds: ['ivory']},
    {preset: 'panel', allowedBackgroundPresets: ['plain'], allowedPaletteIds: []},
    {preset: 'panel', allowedBackgroundPresets: ['plain'], allowedPaletteIds: ['dark', 'dark']},
    {preset: 'panel', allowedBackgroundPresets: ['plain'], allowedPaletteIds: ['sepia']},
    {preset: 'panel', allowedBackgroundPresets: ['plain'], allowedPaletteIds: [{id: 'dark'}]},
    {preset: 'panel', allowedBackgroundPresets: ['plain'], allowedPaletteIds: ['dark'], fontColor: '#FFFFFF'},
    {preset: 'panel-graph-paper', paletteId: 'dark'},
    {preset: 'color', scope: 'whole-caption', allowedPaletteIds: ['dark']},
  ];
  for (const choice of invalid) {
    const reply = copy(f.reply); reply.captions[0].allowedPresets = [choice];
    assert.throws(() => fixed(f, reply));
  }
  const args = {digestSha256: f.context.digestRef.sha256, captionId: 'caption-1', backgroundPreset: 'plain'};
  for (const allowedPaletteIds of [undefined, null, [], ['dark', 'dark'], [1], ['constructor'], ['#FFFFFF']]) {
    assert.throws(() => selectOrchestrationPanelPaletteV003({...args, allowedPaletteIds}), /finite Panel palette/);
  }
  assert.throws(() => selectOrchestrationPanelPaletteV003({...args, backgroundPreset: 'comic-frame', allowedPaletteIds: ['ivory']}));
  const raw = bytes(f.reply).replace('"allowedPaletteIds":["ivory","cool","warm","dark"]',
    '"allowedPaletteIds":["unmanaged"],"allowedPaletteIds":["ivory","cool","warm","dark"]');
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input: f.input, replyBytes: raw}), /strict JSON/);
});

test('saved new plans reload exactly; one-item palette, Normal and Reset retain all other saved systems', () => {
  const f = newFixture(), state = fixed(f), initial = view(f, state);
  const proof = copy(exportOrchestrationDrawingViewEvidenceV001(initial));
  assert.equal(proof.schemaVersion, 'presentation-orchestration-drawing-evidence-v003');
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(proof), initial);
  let changed = editOrchestrationOverrideV001({context: f.context, state, kind: 'caption', itemId: 'caption-2',
    selection: {preset: 'panel-graph-paper', paletteId: 'dark'}});
  assert.equal(view(f, changed).resolvedPlan.elements[1].visualState.background.panelPaletteId, 'dark');
  assert.deepEqual(changed.captionAuto, state.captionAuto); assert.deepEqual(changed.connectionAuto, state.connectionAuto);
  assert.deepEqual(changed.connectionOverrides, state.connectionOverrides);
  assert.deepEqual(view(f, changed).resolvedPlan.elements.filter(row => row.instructionId !== 'caption-2'),
    initial.resolvedPlan.elements.filter(row => row.instructionId !== 'caption-2'));
  changed = editOrchestrationOverrideV001({context: f.context, state: changed, kind: 'caption', itemId: 'caption-2', selection: 'Normal'});
  assert.deepEqual(view(f, changed).resolvedPlan.elements[1], initial.projectedNormalPlan.elements[1]);
  changed = editOrchestrationOverrideV001({context: f.context, state: copy(changed), kind: 'caption', itemId: 'caption-2', selection: 'Reset'});
  assert.deepEqual(changed, state); assert.deepEqual(view(f, changed), initial);
  for (const selection of [{preset: 'panel'}, {preset: 'panel', paletteId: 'unknown'}, {preset: 'panel-comic-frame'}]) {
    assert.throws(() => editOrchestrationOverrideV001({context: f.context, state, kind: 'caption', itemId: 'caption-2', selection}));
  }
});

test('old comic reading and Reset reproduce saved v002 values while new comic editing is unavailable', () => {
  const f = fixture();
  for (const row of f.reply.captions) row.allowedPresets = [{preset: 'panel', allowedBackgroundPresets: ['comic-frame']}];
  const state = fixed(f), initial = view(f, state), proof = exportOrchestrationDrawingViewEvidenceV001(initial);
  assert.equal(proof.schemaVersion, 'presentation-orchestration-drawing-evidence-v002');
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(copy(proof)), initial);
  assert.ok(initial.resolvedPlan.elements.every(row => row.visualState.background.panelPresetId === 'comic-frame'));
  const normal = editOrchestrationOverrideV001({context: f.context, state, kind: 'caption', itemId: 'caption-2', selection: 'Normal'});
  const reset = editOrchestrationOverrideV001({context: f.context, state: normal, kind: 'caption', itemId: 'caption-2', selection: 'Reset'});
  assert.deepEqual(reset, state); assert.deepEqual(view(f, reset), initial);
  assert.throws(() => editOrchestrationOverrideV001({context: f.context, state, kind: 'caption', itemId: 'caption-2',
    selection: {preset: 'panel-comic-frame'}}), /comic Panel/);
});

test('explicit v002 recompilation keeps raw bytes, semantics, expression assignments and connections', () => {
  const f = newFixture(), legacy = fixed(f.legacy), original = originals(legacy.selectionRecord), before = copy(original);
  const state = recompileOrchestrationPanelPalettesV003({context: f.context, original});
  assert.deepEqual(original, before);
  assert.deepEqual(state.selectionRecord.origin.original, original);
  assert.equal(state.selectionRecord.origin.kind, 'technical-recompile');
  assert.equal(state.selectionRecord.input.judgmentMode, 'technical-recompile');
  assert.equal(state.selectionRecord.input.policy.noSavedPriorAnswers, false);
  assert.deepEqual(state.connectionAuto, legacy.connectionAuto);
  assert.deepEqual(state.captionAuto.proposal.effects.filter(row => row.role !== 'Panel accent'),
    legacy.captionAuto.proposal.effects.filter(row => row.role !== 'Panel accent'));
  for (const key of ['captions', 'connections']) for (const [index, row] of state.selectionRecord[key].entries()) {
    assert.deepEqual(row.selection, legacy.selectionRecord[key][index].selection);
    assert.deepEqual(semantic(row), semantic(legacy.selectionRecord[key][index]));
  }
  const initial = view(f, state);
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(copy(exportOrchestrationDrawingViewEvidenceV001(initial))), initial);
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input: state.selectionRecord.input,
    replyBytes: state.selectionRecord.replyBytes}), /input source/);
  assert.throws(() => recompileOrchestrationPanelPalettesV003({context: f.legacy.context, original}), /v009/);
});

test('recompiled bytes, palette policy, selected palette and version cannot be altered even with a replacement outer hash', () => {
  const f = newFixture(), original = originals(fixed(f.legacy).selectionRecord);
  for (const stem of ['selectionRecord', 'input', 'reply']) {
    const changed = copy(original); changed[stem + 'Bytes'] += ' ';
    assert.throws(() => recompileOrchestrationPanelPalettesV003({context: f.context, original: changed}), /file SHA/);
  }
  const state = recompileOrchestrationPanelPalettesV003({context: f.context, original});
  for (const mutate of [
    row => {row.selectionRecord.origin.palettePolicy.allowedPaletteIds = ['ivory'];},
    row => {row.selectionRecord.origin.original.replyBytes += ' ';},
    row => {row.selectionRecord.origin.kind = 'fresh-codex';},
    row => {const palette = row.selectionRecord.captions.find(value => value.panelPaletteSelection).panelPaletteSelection;
      palette.selectedPaletteId = palette.selectedPaletteId === 'ivory' ? 'dark' : 'ivory';},
    row => {const effect = row.captionAuto.proposal.effects.find(value => value.role === 'Panel accent');
      effect.paletteId = effect.paletteId === 'ivory' ? 'dark' : 'ivory';},
  ]) {
    const changed = copy(state); mutate(changed);
    const {recordSha256, ...body} = changed.selectionRecord; changed.selectionRecord.recordSha256 = hash(body);
    assert.throws(() => view(f, changed));
  }
  const proof = copy(exportOrchestrationDrawingViewEvidenceV001(view(f, state)));
  proof.schemaVersion = 'presentation-orchestration-drawing-evidence-v002';
  const {evidenceSha256, ...body} = proof; proof.evidenceSha256 = hash(body);
  assert.throws(() => restoreOrchestrationDrawingViewEvidenceV001(proof), /version differs/);
});

test('unfinished captions retain their exception status and receive no palette choice', () => {
  const f = newFixture();
  Object.assign(f.reply.captions[0], {status: 'unresolved', semanticRole: null, allowedPresets: []});
  Object.assign(f.reply.captions[1], {status: 'unrepresentable', semanticRole: null, allowedPresets: []});
  const state = fixed(f);
  for (const row of state.selectionRecord.captions.slice(0, 2)) {
    assert.equal(row.selection, null); assert.equal(row.panelBackgroundSelection, null);
    assert.equal(row.panelPaletteSelection, null); assert.equal(row.finalCaptionChoice, null);
  }
  assert.deepEqual(state.captionAuto.proposal.exceptions.map(row => row.status), ['unresolved', 'unrepresentable']);
});

test('explicit Bounce and Pulse speech endpoints follow the caption shift once and saved selections remain original-clock', () => {
  const f = newFixture();
  Object.assign(f.reply.captions[1], {semanticRole: 'vocal-energy', allowedPresets: [{preset: 'pulse', anchorPeakId: 'peak-1',
    presetVersion: PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001.version, speechEndFrame: 210}]});
  Object.assign(f.reply.captions[2], {semanticRole: 'reaction', allowedPresets: [{preset: 'bounce',
    presetVersion: PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001.version, speechEndFrame: 330}]});
  const state = fixed(f), drawn = view(f, state);
  assert.equal(drawn.resolvedPlan.elements[1].presentationPulse.speechEndFrame, 222);
  assert.equal(drawn.resolvedPlan.elements[1].presentationPulse.anchorFrame, 162);
  assert.equal(drawn.resolvedPlan.elements[2].presentationMotion.speechEndFrame, 354);
  assert.equal(state.captionAuto.proposal.effects.find(row => row.captionId === 'caption-2').speechEndFrame, 210);
  assert.equal(state.captionAuto.proposal.effects.find(row => row.captionId === 'caption-3').speechEndFrame, 330);
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(copy(exportOrchestrationDrawingViewEvidenceV001(drawn))), drawn);
  const normalConnection = editOrchestrationOverrideV001({context: f.context, state, kind: 'connection',
    itemId: f.context.connectionIds[0], selection: 'Normal'});
  assert.equal(view(f, normalConnection).resolvedPlan.elements[1].presentationPulse.speechEndFrame, 210);
  assert.equal(view(f, normalConnection).resolvedPlan.elements[2].presentationMotion.speechEndFrame, 342);
  assert.equal(state.captionAuto.proposal.effects.find(row => row.captionId === 'caption-3').speechEndFrame, 330);
});

test('real fixed HRB and C-all saved v002 drawing evidence replays its original view hash exactly', async () => {
  const base = `${savedOutputRoot}/quality-q4-20260920-v001`;
  for (const name of ['hrb-recompile-v002', 'c-all-run-v001']) {
    const file = `${base}/${name}/drawing-evidence.json`, saved = await readFile(file, 'utf8');
    const proof = JSON.parse(saved), replayed = restoreOrchestrationDrawingViewEvidenceV001(proof);
    assert.equal(replayed.viewSha256, proof.expectedViewSha256);
    assert.equal(replayed.schemaVersion, 'presentation-orchestration-drawing-view-v002');
    assert.equal(await readFile(file, 'utf8'), saved);
  }
});

test('real HRB v001 and C-all v002 semantic records derive new palettes without another AI judgment or text/timing changes', async () => {
  const inputs = [
    {name: 'HRB', directory: 'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918',
      inputFile: 'fresh-input.json', replyFile: 'raw-ai-response-v001.json'},
    {name: 'C-all', directory: `${savedOutputRoot}/quality-q4-20260920-v001/c-all-run-v001`},
  ];
  for (const row of inputs) {
    const source = JSON.parse(await readFile(`${row.directory}/source-bindings.json`, 'utf8'));
    const selectionRecordBytes = await readFile(`${row.directory}/selectionRecord.json`, 'utf8'), record = JSON.parse(selectionRecordBytes);
    const inputBytes = row.inputFile ? await readFile(`${row.directory}/${row.inputFile}`, 'utf8') : bytes(record.input);
    const original = originals(record, selectionRecordBytes, inputBytes);
    if (row.replyFile) assert.equal(original.replyBytes, await readFile(`${row.directory}/${row.replyFile}`, 'utf8'));
    source.captionContext.renderingRulesRef = copy(AUTO_PRESENTATION_RULES_REF_V009);
    const context = createOrchestrationContextV001(source), state = recompileOrchestrationPanelPalettesV003({context, original});
    const drawn = resolveOrchestrationDrawingViewV001({context, state});
    assert.equal(state.selectionRecord.origin.kind, 'technical-recompile');
    assert.deepEqual(state.selectionRecord.origin.original, original);
    assert.deepEqual(state.selectionRecord.captions.map(value => value.selection), record.captions.map(value => value.selection));
    assert.deepEqual(state.selectionRecord.connections.map(value => value.selection), record.connections.map(value => value.selection));
    for (const item of drawn.resolvedPlan.elements) {
      const before = JSON.parse(source.planBytes).elements.find(value => value.instructionId === item.instructionId);
      assert.equal(item.text, before.text); assert.deepEqual(item.indexedLines, before.indexedLines);
      assert.equal(item.displayFrameCount, before.displayFrameCount);
    }
    const actual = drawn.effectiveSelections.filter(value => value.selection.role === 'Panel accent');
    assert.ok(actual.length > 0);
    assert.ok(actual.every(value => paletteIds.includes(value.selection.paletteId)
      && value.selection.presentation !== 'provisional-panel-comic-frame'));
    assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(copy(exportOrchestrationDrawingViewEvidenceV001(drawn))), drawn);
    assert.equal(await readFile(`${row.directory}/selectionRecord.json`, 'utf8'), selectionRecordBytes);
  }
});
