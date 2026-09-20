import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fixture} from './presentation_orchestration_v001.test.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001,
  selectOrchestrationPresetV001, selectOrchestrationPanelBackgroundV002,
  recompileOrchestrationPanelBackgroundsV002,
  resolveOrchestrationDrawingViewV001, editOrchestrationOverrideV001,
  exportOrchestrationDrawingViewEvidenceV001, restoreOrchestrationDrawingViewEvidenceV001}
  from './presentation_orchestration_v001.mjs';

const copy = value => structuredClone(value);
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const serialize = value => JSON.stringify(value) + '\n';
const backgrounds = ['plain', 'graph-paper', 'comic-frame'];
const finalPresets = {plain: 'panel', 'graph-paper': 'panel-graph-paper', 'comic-frame': 'panel-comic-frame'};
const fixed = (f, reply = f.reply) => fixOrchestrationJudgmentV001({context: f.context, input: f.input,
  replyBytes: serialize(reply)});
const view = (f, state) => resolveOrchestrationDrawingViewV001({context: f.context, state});
const panelOnly = (f, allowed = backgrounds) => {
  const reply = copy(f.reply);
  for (const row of reply.captions) row.allowedPresets = [{preset: 'panel', allowedBackgroundPresets: [...allowed]}];
  return reply;
};

// A declared synthetic v001 history, created directly in the original wire
// shape. It is not a migrated fresh reply or production history rewrite.
function originalSemanticHistory(f) {
  const oldInput = copy(f.input), {contextSha256, ...identity} = copy(f.context);
  identity.schemaVersion = 'presentation-orchestration-context-v001'; identity.version = 'presentation-orchestration-v001';
  oldInput.contextSha256 = hash(identity);
  oldInput.schemaVersion = 'presentation-orchestration-judgment-input-v001';
  oldInput.orchestrationVersion = 'presentation-orchestration-v001';
  for (const key of ['judgmentMode', 'connectionPolicy', 'panelBackgroundPresets']) delete oldInput[key];
  for (const key of ['panelBackgroundOnlyAfterPanel', 'explicitPanelBackgroundAllowedSet']) delete oldInput.policy[key];
  const {inputSha256, ...inputBody} = oldInput; oldInput.inputSha256 = hash(inputBody);
  const oldReply = copy(f.reply); oldReply.schemaVersion = 'presentation-orchestration-judgment-v001';
  oldReply.inputSha256 = oldInput.inputSha256;
  for (const row of oldReply.captions) row.allowedPresets = row.allowedPresets.map(choice => choice.preset === 'panel'
    ? {preset: 'panel'} : choice);
  const state = fixed(f), replyBytes = serialize(oldReply), inputBytes = serialize(oldInput);
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const rows = (values, kind) => values.map(row => ({...row, selection: row.status === 'resolved'
    ? selectOrchestrationPresetV001({digestSha256: f.context.digestRef.sha256, kind,
      itemId: row[kind + 'Id'], allowedPresets: row.allowedPresets}) : null}));
  const recordBody = {schemaVersion: 'presentation-orchestration-selection-record-v001',
    version: 'presentation-orchestration-v001', contextSha256: oldInput.contextSha256, input: oldInput,
    replyBytes, replySha256: digest(replyBytes), captions: rows(oldReply.captions, 'caption'),
    connections: rows(oldReply.connections, 'connection'), captionAutoSha256: hash(state.captionAuto),
    connectionAutoSha256: hash(state.connectionAuto)};
  const selectionRecordBytes = serialize({...recordBody, recordSha256: hash(recordBody)});
  return {selectionRecordBytes, selectionRecordFileSha256: digest(selectionRecordBytes),
    inputBytes, inputFileSha256: digest(inputBytes), replyBytes, replyFileSha256: digest(replyBytes)};
}

test('new input keeps Color and Panel as the two Focus expressions with a separate finite background table', () => {
  const f = fixture();
  assert.equal(f.input.schemaVersion, 'presentation-orchestration-judgment-input-v002');
  assert.equal(f.input.orchestrationVersion, 'presentation-orchestration-v002');
  assert.equal(f.input.judgmentMode, 'fresh-codex');
  assert.equal(f.input.connectionPolicy, 'semantic-choice');
  assert.deepEqual(f.input.captionRolePresets, {normal: ['normal'], focus: ['color', 'panel'],
    'vocal-energy': ['scale', 'pulse'], reaction: ['bounce', 'shake']});
  assert.deepEqual(f.input.panelBackgroundPresets, backgrounds);
  assert.equal(f.input.policy.panelBackgroundOnlyAfterPanel, true);
  assert.equal(f.input.policy.explicitPanelBackgroundAllowedSet, true);
});

test('expression assignments and full hashes match the pre-background identity after background expansion', () => {
  const f = fixture(), plain = fixed(f), expanded = copy(f.reply);
  for (const row of expanded.captions) row.allowedPresets.find(choice => choice.preset === 'panel')
    .allowedBackgroundPresets = [...backgrounds];
  const enriched = fixed(f, expanded);
  assert.deepEqual(enriched.connectionAuto, plain.connectionAuto);
  assert.deepEqual(enriched.selectionRecord.connections, plain.selectionRecord.connections);
  for (const [kind, rows] of [['caption', enriched.selectionRecord.captions], ['connection', enriched.selectionRecord.connections]]) {
    for (const row of rows) {
      const id = row[kind + 'Id'];
      const expressionChoices = kind === 'caption' ? row.allowedPresets.map(choice => choice.preset === 'panel'
        ? {preset: 'panel'} : choice) : row.allowedPresets;
      const sorted = [...expressionChoices].sort((a, b) => {
        const x = typeof a === 'string' ? a : a.preset, y = typeof b === 'string' ? b : b.preset;
        return x < y ? -1 : x > y ? 1 : 0;
      });
      const historicalSha = hash([f.context.digestRef.sha256, 'presentation-orchestration-v001', kind, id]);
      assert.equal(row.selection.selectionSha256, historicalSha);
      assert.deepEqual(row.selection.selectedPreset, sorted[Number(BigInt('0x' + historicalSha) % BigInt(sorted.length))]);
    }
  }
  for (let index = 0; index < plain.selectionRecord.captions.length; index++) {
    const before = plain.selectionRecord.captions[index], after = enriched.selectionRecord.captions[index];
    assert.deepEqual(after.selection, before.selection);
    if (after.selection.selectedPreset.preset !== 'panel') {
      assert.equal(after.panelBackgroundSelection, null);
      assert.deepEqual(after.finalCaptionChoice, before.finalCaptionChoice);
      assert.deepEqual(view(f, enriched).resolvedPlan.elements[index], view(f, plain).resolvedPlan.elements[index]);
    }
  }
});

test('Normal, reaction and vocal-energy retain their expression assignment without a Panel background selection', () => {
  const f = fixture(), reply = copy(f.reply);
  Object.assign(reply.captions[0], {semanticRole: 'normal', allowedPresets: [{preset: 'normal'}]});
  Object.assign(reply.captions[1], {semanticRole: 'reaction', allowedPresets: [{preset: 'bounce'}, {preset: 'shake'}]});
  Object.assign(reply.captions[2], {semanticRole: 'vocal-energy', allowedPresets: [{preset: 'scale'}]});
  const state = fixed(f, reply);
  for (const row of state.selectionRecord.captions) {
    assert.equal(row.panelBackgroundSelection, null);
    assert.deepEqual(row.finalCaptionChoice, row.selection.selectedPreset);
    assert.deepEqual(row.selection, selectOrchestrationPresetV001({digestSha256: f.context.digestRef.sha256,
      kind: 'caption', itemId: row.captionId, allowedPresets: row.allowedPresets}));
  }
});

test('each singleton Panel background is saved as its final finite preset and materialized on the same clock', () => {
  const f = fixture();
  for (const background of backgrounds) {
    const state = fixed(f, panelOnly(f, [background])), drawn = view(f, state);
    assert.equal(state.selectionRecord.schemaVersion, 'presentation-orchestration-selection-record-v002');
    for (const [index, row] of state.selectionRecord.captions.entries()) {
      assert.deepEqual(row.selection.selectedPreset, {preset: 'panel'});
      assert.deepEqual(row.panelBackgroundSelection.allowedPresets, [background]);
      assert.equal(row.panelBackgroundSelection.selectedPreset, background);
      assert.deepEqual(row.finalCaptionChoice, {preset: finalPresets[background]});
      assert.equal(state.captionAuto.proposal.effects[index].presentation, 'provisional-' + finalPresets[background]);
      assert.equal(drawn.resolvedPlan.elements[index].visualState.background.panelPresetId, background);
      assert.equal(drawn.resolvedPlan.elements[index].text, f.plan.elements[index].text);
      assert.equal(drawn.resolvedPlan.elements[index].startFrame, index * 132);
    }
  }
});

test('Panel background selection is independent of expression assignment and ignores row or set ordering', () => {
  const f = fixture(), reply = panelOnly(f), state = fixed(f, reply);
  const reordered = copy(reply); reordered.captions.reverse(); reordered.connections.reverse();
  for (const row of reordered.captions) row.allowedPresets[0].allowedBackgroundPresets.reverse();
  const restoredOrder = fixed(f, reordered);
  assert.deepEqual(state.captionAuto, restoredOrder.captionAuto);
  assert.deepEqual(state.connectionAuto, restoredOrder.connectionAuto);
  for (const [index, row] of state.selectionRecord.captions.entries()) {
    assert.deepEqual(row.panelBackgroundSelection, restoredOrder.selectionRecord.captions[index].panelBackgroundSelection);
    assert.notEqual(row.panelBackgroundSelection.selectionSha256, row.selection.selectionSha256);
    assert.equal(row.panelBackgroundSelection.selectionSha256, hash([f.context.digestRef.sha256,
      'presentation-orchestration-panel-background-v001', 'caption-panel-background', row.captionId]));
    assert.ok(backgrounds.includes(row.panelBackgroundSelection.selectedPreset));
  }
  const local = copy(reply); local.captions[0].allowedPresets[0].allowedBackgroundPresets = ['graph-paper'];
  const changed = fixed(f, local);
  assert.deepEqual(changed.selectionRecord.captions.slice(1), state.selectionRecord.captions.slice(1));
  assert.deepEqual(changed.connectionAuto, state.connectionAuto);
});

test('Panel backgrounds cannot become extra Focus expressions or drawing values and must be explicitly allowed', () => {
  const f = fixture();
  const invalid = [
    {preset: 'panel'}, {preset: 'panel', allowedBackgroundPresets: []},
    {preset: 'panel', allowedBackgroundPresets: ['plain', 'plain']},
    {preset: 'panel', allowedBackgroundPresets: ['unknown']},
    {preset: 'panel', allowedBackgroundPresets: ['/tmp/arbitrary.svg']},
    {preset: 'panel', allowedBackgroundPresets: [{id: 'plain'}]},
    {preset: 'panel', allowedBackgroundPresets: ['plain'], path: '/tmp/arbitrary.svg'},
    {preset: 'panel', allowedBackgroundPresets: ['plain'], opacity: 0.5},
    {preset: 'panel-graph-paper'}, {preset: 'panel-comic-frame'},
    {preset: 'color', scope: 'whole-caption', allowedBackgroundPresets: ['plain']},
  ];
  for (const choice of invalid) {
    const reply = copy(f.reply); reply.captions[0].allowedPresets = [choice];
    assert.throws(() => fixed(f, reply), undefined, JSON.stringify(choice));
  }
  const duplicatePanel = copy(f.reply);
  duplicatePanel.captions[0].allowedPresets.push({preset: 'panel', allowedBackgroundPresets: ['comic-frame']});
  assert.throws(() => fixed(f, duplicatePanel), /duplicate preset/);
});

test('inapplicable backgrounds are rejected even when the first stage would select Color', () => {
  const f = fixture(), reply = copy(f.reply), evidence = copy(f.evidence);
  assert.equal(fixed(f).selectionRecord.captions[0].selection.selectedPreset.preset, 'color');
  evidence.observations.push({observationId: 'graph-excluded', kind: 'panel-graph-paper-unrepresentable',
    captionIds: [...f.context.captionIds], description: 'この検査対象では方眼紙を適用できない。'});
  const input = createOrchestrationJudgmentInputV001({context: f.context, evidence});
  reply.inputSha256 = input.inputSha256;
  for (const row of reply.captions) row.allowedPresets.find(choice => choice.preset === 'panel')
    .allowedBackgroundPresets = ['plain', 'graph-paper'];
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input, replyBytes: serialize(reply)}),
    /physically unrepresentable Panel background/);
  evidence.observations[0].kind = 'panel-unrepresentable';
  const whollyExcluded = createOrchestrationJudgmentInputV001({context: f.context, evidence});
  reply.inputSha256 = whollyExcluded.inputSha256;
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input: whollyExcluded, replyBytes: serialize(reply)}),
    /physically unrepresentable preset/);
});

test('duplicate JSON keys cannot hide an unallowed background before validation', () => {
  const f = fixture(), raw = serialize(panelOnly(f, ['plain']));
  const hiddenUnknown = raw.replace('"allowedBackgroundPresets":["plain"]',
    '"allowedBackgroundPresets":["unknown"],"allowedBackgroundPresets":["plain"]');
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input: f.input,
    replyBytes: hiddenUnknown}), /strict JSON: duplicate-key/);
  for (const altered of ['\ufeff' + raw, raw + '{}', '```json\n' + raw + '```']) {
    assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input: f.input,
      replyBytes: altered}), /strict JSON/);
  }
});

test('reloading and Reset restore the fixed automatic background while preserving other saved axes', () => {
  const f = fixture(), state = fixed(f, panelOnly(f)), original = view(f, state);
  const proof = JSON.parse(serialize(exportOrchestrationDrawingViewEvidenceV001(original)));
  assert.equal(proof.schemaVersion, 'presentation-orchestration-drawing-evidence-v002');
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(proof), original);
  for (const preset of Object.values(finalPresets)) {
    const overridden = editOrchestrationOverrideV001({context: f.context, state, kind: 'caption',
      itemId: 'caption-2', selection: {preset}});
    for (const key of ['captionAuto', 'connectionAuto', 'connectionOverrides', 'selectionRecord']) {
      assert.strictEqual(overridden[key], state[key]);
    }
    const reset = editOrchestrationOverrideV001({context: f.context, state: JSON.parse(serialize(overridden)),
      kind: 'caption', itemId: 'caption-2', selection: 'Reset'});
    assert.deepEqual(reset, state);
    assert.deepEqual(view(f, reset), original);
  }
});

test('saved background selections and final choices cannot be changed, including to a managed but unallowed background', () => {
  const f = fixture(), state = fixed(f, panelOnly(f, ['plain']));
  for (const mutate of [
    changed => {changed.selectionRecord.captions[0].panelBackgroundSelection.selectedPreset = 'graph-paper';},
    changed => {changed.selectionRecord.captions[0].finalCaptionChoice = {preset: 'panel-comic-frame'};},
    changed => {changed.captionAuto.proposal.effects[0].presentation = 'provisional-panel-graph-paper';},
  ]) {
    const changed = copy(state); mutate(changed);
    const {recordSha256, ...body} = changed.selectionRecord;
    changed.selectionRecord.recordSha256 = hash(body);
    assert.throws(() => view(f, changed), /fixed semantic choices/);
  }
});

test('v001 input, reply, selection record and evidence are rejected without implicit upgrading', () => {
  const f = fixture(), reply = copy(f.reply);
  reply.schemaVersion = 'presentation-orchestration-judgment-v001';
  assert.throws(() => fixed(f, reply), /complete fresh judgment/);
  const staleInput = copy(f.input); staleInput.schemaVersion = 'presentation-orchestration-judgment-input-v001';
  const {inputSha256, ...oldBody} = staleInput; staleInput.inputSha256 = hash(oldBody);
  reply.schemaVersion = 'presentation-orchestration-judgment-v002'; reply.inputSha256 = staleInput.inputSha256;
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input: staleInput, replyBytes: serialize(reply)}), /input source/);
  const state = fixed(f), oldState = copy(state);
  oldState.selectionRecord.schemaVersion = 'presentation-orchestration-selection-record-v001';
  assert.throws(() => view(f, oldState), /new selection record/);
  const proof = copy(exportOrchestrationDrawingViewEvidenceV001(view(f, state)));
  proof.schemaVersion = 'presentation-orchestration-drawing-evidence-v001';
  const {evidenceSha256, ...body} = proof; proof.evidenceSha256 = hash(body);
  assert.throws(() => restoreOrchestrationDrawingViewEvidenceV001(proof), /drawing proof SHA/);
});

test('unfinished and unrepresentable rows do not receive a background selection or become Normal', () => {
  const f = fixture(), reply = copy(f.reply);
  Object.assign(reply.captions[0], {status: 'unresolved', semanticRole: null, allowedPresets: []});
  Object.assign(reply.captions[1], {status: 'unrepresentable', semanticRole: null, allowedPresets: []});
  const state = fixed(f, reply);
  for (const row of state.selectionRecord.captions.slice(0, 2)) {
    assert.equal(row.selection, null); assert.equal(row.panelBackgroundSelection, null); assert.equal(row.finalCaptionChoice, null);
  }
  assert.equal(view(f, state).resolution.counts.captions.unresolved, 1);
  assert.equal(view(f, state).resolution.counts.captions.unrepresentable, 1);
});

test('the independent background selector rejects unknown, duplicate or arbitrary values without coercion', () => {
  const f = fixture(), args = {digestSha256: f.context.digestRef.sha256, captionId: 'caption-1'};
  for (const allowedPresets of [[], ['plain', 'plain'], [null], [1], ['../plain'], ['panel'], ['constructor']]) {
    assert.throws(() => selectOrchestrationPanelBackgroundV002({...args, allowedPresets}), /finite Panel/);
  }
  const selected = selectOrchestrationPanelBackgroundV002({...args, allowedPresets: backgrounds});
  assert.deepEqual(selected, selectOrchestrationPanelBackgroundV002({...args, allowedPresets: [...backgrounds].reverse()}));
});

test('explicit technical recompilation binds original bytes, preserves old semantic choices and assigns only Panel backgrounds', () => {
  const f = fixture(), original = originalSemanticHistory(f), before = copy(original);
  const state = recompileOrchestrationPanelBackgroundsV002({context: f.context, original});
  assert.deepEqual(original, before);
  assert.equal(state.selectionRecord.origin.kind, 'technical-recompile');
  assert.deepEqual(state.selectionRecord.origin.original, original);
  assert.equal(state.selectionRecord.input.judgmentMode, 'technical-recompile');
  assert.equal(state.selectionRecord.input.policy.noSavedPriorAnswers, false);
  assert.deepEqual(state.selectionRecord.origin.backgroundPolicy.allowedBackgroundPresets, backgrounds);
  const oldRecord = JSON.parse(original.selectionRecordBytes);
  for (const key of ['captions', 'connections']) for (const [index, row] of state.selectionRecord[key].entries()) {
    const prior = oldRecord[key][index];
    assert.deepEqual(row.selection, prior.selection);
    for (const field of ['status', 'semanticRole', 'reason', 'evidenceIds']) assert.deepEqual(row[field], prior[field]);
    if (key === 'captions') {
      assert.deepEqual(row.allowedPresets.map(choice => choice.preset === 'panel' ? {preset: 'panel'} : choice), prior.allowedPresets);
    } else assert.deepEqual(row.allowedPresets, prior.allowedPresets);
  }
  assert.deepEqual(view(f, state).projection, view(f, fixed(f)).projection);
  const proof = JSON.parse(serialize(exportOrchestrationDrawingViewEvidenceV001(view(f, state))));
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(proof), view(f, state));
  const override = editOrchestrationOverrideV001({context: f.context, state, kind: 'caption', itemId: 'caption-2', selection: 'Normal'});
  const reset = editOrchestrationOverrideV001({context: f.context, state: override, kind: 'caption', itemId: 'caption-2', selection: 'Reset'});
  assert.deepEqual(reset, state);
});

test('technical recompilation does not enter the fresh judgment path and its provenance is checked on reload', () => {
  const f = fixture(), state = recompileOrchestrationPanelBackgroundsV002({context: f.context, original: originalSemanticHistory(f)});
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input: state.selectionRecord.input,
    replyBytes: state.selectionRecord.replyBytes}), /input source/);
  for (const mutate of [
    changed => {changed.selectionRecord.origin.kind = 'fresh-codex';},
    changed => {changed.selectionRecord.origin.backgroundPolicy.allowedBackgroundPresets = ['plain'];},
    changed => {changed.selectionRecord.origin.original.replyBytes += ' ';},
    changed => {changed.selectionRecord.replyBytes = changed.selectionRecord.replyBytes.replace('本文の意味', '書き換えた意味');},
  ]) {
    const changed = copy(state); mutate(changed);
    assert.throws(() => view(f, changed));
  }
  assert.deepEqual(fixed(f).selectionRecord.origin, {kind: 'fresh-codex'});
});

test('technical recompilation retains old unrepresentable and unresolved decisions without new background choices', () => {
  const f = fixture();
  Object.assign(f.reply.captions[0], {status: 'unrepresentable', semanticRole: null, allowedPresets: [],
    reason: '保存された表現不能を保持する。'});
  Object.assign(f.reply.connections[0], {status: 'unresolved', semanticRole: null, allowedPresets: [],
    reason: '保存された未解決を保持する。'});
  const original = originalSemanticHistory(f), state = recompileOrchestrationPanelBackgroundsV002({context: f.context, original});
  const caption = state.selectionRecord.captions[0], connection = state.selectionRecord.connections[0];
  assert.equal(caption.status, 'unrepresentable'); assert.equal(caption.selection, null);
  assert.equal(caption.panelBackgroundSelection, null); assert.equal(caption.finalCaptionChoice, null);
  assert.equal(connection.status, 'unresolved'); assert.equal(connection.selection, null);
  assert.deepEqual(state.captionAuto.proposal.exceptions, fixed(f).captionAuto.proposal.exceptions);
  assert.deepEqual(state.connectionAuto, fixed(f).connectionAuto);
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(exportOrchestrationDrawingViewEvidenceV001(view(f, state))), view(f, state));
});

test('explicit recompilation rejects changed original bytes, record hashes and old selected expressions', () => {
  const f = fixture();
  for (const key of ['selectionRecordBytes', 'inputBytes', 'replyBytes']) {
    const original = originalSemanticHistory(f); original[key] += ' ';
    assert.throws(() => recompileOrchestrationPanelBackgroundsV002({context: f.context, original}), /file SHA/);
  }
  for (const mutate of [
    record => {record.recordSha256 = 'a'.repeat(64);},
    record => {record.captions[0].selection.selectedPreset = {preset: 'panel'}; const {recordSha256, ...body} = record; record.recordSha256 = hash(body);},
    record => {record.replySha256 = 'a'.repeat(64); const {recordSha256, ...body} = record; record.recordSha256 = hash(body);},
  ]) {
    const original = originalSemanticHistory(f), record = JSON.parse(original.selectionRecordBytes); mutate(record);
    original.selectionRecordBytes = serialize(record);
    original.selectionRecordFileSha256 = createHash('sha256').update(original.selectionRecordBytes).digest('hex');
    assert.throws(() => recompileOrchestrationPanelBackgroundsV002({context: f.context, original}));
  }
});

test('preserve-normal-cut is explicit in the input and refuses separator assignments without changing captions', () => {
  const f = fixture(), input = createOrchestrationJudgmentInputV001({context: f.context, evidence: f.evidence,
    connectionPolicy: 'preserve-normal-cut'}), reply = copy(f.reply);
  assert.equal(input.connectionPolicy, 'preserve-normal-cut');
  assert.deepEqual(input.connectionRolePresets, {continuation: ['normal-cut']});
  reply.inputSha256 = input.inputSha256;
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input, replyBytes: serialize(reply)}), /connection semantic role/);
  for (const row of reply.connections) Object.assign(row, {semanticRole: 'continuation', allowedPresets: ['normal-cut']});
  const state = fixOrchestrationJudgmentV001({context: f.context, input, replyBytes: serialize(reply)});
  assert.ok(state.connectionAuto.connections.every(row => row.preset === 'normal-cut'));
  assert.equal(view(f, state).projection.displayFrameCount, 360);
  assert.deepEqual(state.selectionRecord.captions, fixed(f).selectionRecord.captions);
  const altered = copy(input); altered.connectionRolePresets.separator = ['black-separator'];
  const {inputSha256, ...body} = altered; altered.inputSha256 = hash(body); reply.inputSha256 = altered.inputSha256;
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context, input: altered, replyBytes: serialize(reply)}), /input source/);
  assert.throws(() => createOrchestrationJudgmentInputV001({context: f.context, evidence: f.evidence, connectionPolicy: 'unknown'}), /connection policy/);
});

test('whole-audio ASR evidence is available outside acoustic candidates and requires unique saved observation IDs', () => {
  const f = fixture(), evidence = copy(f.evidence);
  evidence.audioEvidence.allAsrSegments = [{id: 'outside-candidate-asr-1', text: '音声候補の外にある保存発話'}];
  const input = createOrchestrationJudgmentInputV001({context: f.context, evidence}), reply = copy(f.reply);
  reply.inputSha256 = input.inputSha256; reply.captions[0].evidenceIds = ['outside-candidate-asr-1'];
  assert.equal(fixOrchestrationJudgmentV001({context: f.context, input, replyBytes: serialize(reply)})
    .selectionRecord.captions[0].evidenceIds[0], 'outside-candidate-asr-1');
  for (const allAsrSegments of [null, [{id: ''}], [{id: 'same'}, {id: 'same'}]]) {
    evidence.audioEvidence.allAsrSegments = allAsrSegments;
    assert.throws(() => createOrchestrationJudgmentInputV001({context: f.context, evidence}), /whole-audio ASR/);
  }
});
