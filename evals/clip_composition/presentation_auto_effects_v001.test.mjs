import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {
  AUTO_PRESENTATION_RULES_REF_V008,
  sha256AutoPresentationV001,
  sha256AutoPresentationStateV001,
  fixAutoPresentationProposalV001,
  createAutoPresentationOverridesV001,
  editAutoPresentationOverrideV001,
  resolveAutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';

const clone = value => structuredClone(value);
const byteSha = text => createHash('sha256').update(text).digest('hex');
const freeze = value => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const focus = () => ({role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'});
const vocal = () => ({role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption'});
const effect = captionId => ({captionId, ...focus()});
const captionIds = ['caption-1', 'caption-2', 'caption-3'];

// Different ordinary styles and line layouts make accidental wholesale replacement observable.
// The non-caption element also has to survive every caption edit unchanged.
const baseline = () => ({
  schemaVersion: 'presentation-output-common-core-plan-v001',
  canvas: {width: 1280, height: 720, fps: 30},
  baseMedia: {path: 'fixtures/base.mp4', fileSha256: byteSha('fixed base media')},
  provenance: {captionBridge: 'saved-bridge', retainedSourceSegments: ['source-1', 'source-2']},
  elements: [
    ...captionIds.map((instructionId, index) => {
      const lines = index === 1 ? ['必ず成功する、', 'とは限りません。'] : [`字幕${index + 1}の本文`];
      return {
        instructionId, kind: 'speech-caption', text: lines.join(''),
        indexedLines: lines.map((text, lineIndex) => ({lineIndex, text, sourceUnitIds: [`atom-${index}-${lineIndex}`]})),
        startFrame: index * 60, endFrameExclusive: index * 60 + 45, displayFrameCount: 45,
        sourceMapping: {startMs: 10000 + index * 3000, endMs: 11500 + index * 3000},
        targetProvenance: {targetRefId: 'semantic-caption', atomOccurrenceIds: [`atom-${index}`]},
        visualState: {
          textStyle: {fontSizePx: 70 + index, fontColor: ['#FFFDF8', '#FFFFFF', '#DDDDDD'][index],
            fontAssetId: 'saved-font', outlineColor: '#000000', outlineWidthPx: 3},
          position: {preset: 'bottom-center', x: 640, y: 610 + index},
          animation: {preset: 'saved-fade', durationFrames: 4},
        },
      };
    }),
    {instructionId: 'section-title', kind: 'title', text: '既存の見出し',
      startFrame: 0, endFrameExclusive: 180, visualState: {position: {preset: 'top-left'}}},
  ],
});

function fixture() {
  const baselinePlan = baseline();
  const context = {
    baselineRef: {path: 'fixtures/normal-plan.json', fileSha256: byteSha(`${JSON.stringify(baselinePlan, null, 2)}\n`),
      canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: {path: 'fixtures/confirmed-caption-input.json', fileSha256: byteSha('saved caption decision input')},
    renderingRulesRef: clone(AUTO_PRESENTATION_RULES_REF_V008), pulseTimingEvidence: null,
  };
  return freeze({baselinePlan, context});
}

const proposal = (f, changes = {}) => ({
  schemaVersion: 'auto-presentation-proposal-v001', context: clone(f.context),
  targetCaptionIds: [...captionIds], completion: 'complete', effects: [], exceptions: [], ...changes,
});
const fixed = (f, changes = {}) => fixAutoPresentationProposalV001({...f, proposal: proposal(f, changes)});
const emptyOverrides = (f, autoProposal) => createAutoPresentationOverridesV001({...f, autoProposal});
const edit = (f, autoProposal, overrides, captionId, selection) => editAutoPresentationOverrideV001({
  ...f, autoProposal, overrides, captionId, selection,
});
const resolve = (f, autoProposal, overrides) => resolveAutoPresentationV001({...f, autoProposal, overrides});
const item = (result, id) => result.plan.elements.find(element => element.instructionId === id);
const state = (result, id) => result.resolution.captions.find(caption => caption.captionId === id);

const panel = () => ({role: 'Panel accent', presentation: 'provisional-panel', scope: 'whole-caption'});

test('Panel creates a finite plate and preserves caption content, layout lines, font size, time and source identity', () => {
  const f = fixture(), auto = fixed(f, {effects: [{captionId: 'caption-2', ...panel()}]});
  const before = JSON.stringify(f), saved = JSON.stringify(auto);
  const result = resolve(f, auto), expected = clone(f.baselinePlan);
  Object.assign(expected.elements[1].visualState.textStyle, {fontColor: '#111827', borderWidthPx: 0, glowWidthPx: 0});
  expected.elements[1].visualState.background = {color: '#FFFDF8', borderRadiusPx: 0, paddingXPx: 24, paddingYPx: 16, panelPresetId: 'plain'};
  assert.deepEqual(result.plan, expected);
  assert.equal(state(result, 'caption-2').role, 'Panel accent');
  assert.equal(state(result, 'caption-2').canonicalRange, null);
  assert.equal(Object.hasOwn(item(result, 'caption-2'), 'presentationColorRange'), false);
  assert.equal(JSON.stringify(f), before);
  assert.equal(JSON.stringify(auto), saved);
});

test('all finite roles replace each other from Normal; Reset restores the fixed automatic role without stale plate or paint', () => {
  for (const automatic of [focus(), vocal(), panel()]) {
    const f = fixture(), auto = fixed(f, {effects: [{captionId: 'caption-2', ...automatic}]}), saved = JSON.stringify(auto);
    const automaticPlan = resolve(f, auto).plan;
    let overrides = emptyOverrides(f, auto);
    for (const selection of [panel(), vocal(), {...focus(), scope: 'partial-caption', targetText: 'とは限りません'},
      panel(), 'Normal', 'Reset']) {
      overrides = edit(f, auto, overrides, 'caption-2', selection);
      const result = resolve(f, auto, overrides);
      const chosen = selection === 'Reset' ? automatic : selection === 'Normal' ? null : selection;
      const fresh = chosen === null ? f.baselinePlan : resolve(f,
        fixed(f, {effects: [{captionId: 'caption-2', ...chosen}]})).plan;
      assert.deepEqual(result.plan, fresh);
      assert.equal(JSON.stringify(auto), saved);
      if (selection === 'Reset') {
        assert.deepEqual(result.plan, automaticPlan);
        assert.equal(state(result, 'caption-2').hasOverride, false);
      }
    }
  }
});

test('Panel refuses partial text, free drawing values, stacking and unknown presets', () => {
  const f = fixture(), auto = fixed(f), overrides = emptyOverrides(f, auto);
  for (const selection of [
    {...panel(), scope: 'partial-caption', targetText: '字幕'}, {...panel(), targetText: '字幕'},
    {...panel(), duration: 1}, {...panel(), curve: 'ease-out'}, {...panel(), background: {color: '#000000'}},
    {...panel(), paddingXPx: 24}, {...panel(), fontSizePx: 96}, {...panel(), css: 'color:red'},
    {...panel(), jsx: '<div />'}, {...panel(), presentation: 'free-panel'},
  ]) {
    assert.throws(() => fixed(f, {effects: [{captionId: 'caption-1', ...selection}]}), /finite whole-caption|unknown finite Panel preset/);
    assert.throws(() => edit(f, auto, overrides, 'caption-1', selection), /finite whole-caption|unknown finite Panel preset/);
  }
  for (const other of [focus(), vocal(), panel()]) {
    assert.throws(() => fixed(f, {effects: [{captionId: 'caption-1', ...panel()},
      {captionId: 'caption-1', ...other}]}), /conflicting/);
  }
});

test('a Panel layout exception remains unresolved in the fixed plan and survives a temporary human edit', () => {
  const f = fixture(), auto = fixed(f, {exceptions: [{captionId: 'caption-2', status: 'unrepresentable',
    reason: 'The complete plate does not fit in the available safe area.'}]}), before = JSON.stringify(auto);
  const first = resolve(f, auto);
  assert.deepEqual(first.plan, f.baselinePlan);
  assert.equal(state(first, 'caption-2').automaticStatus, 'unrepresentable');
  let overrides = edit(f, auto, emptyOverrides(f, auto), 'caption-2', focus());
  assert.equal(state(resolve(f, auto, overrides), 'caption-2').role, 'Focus');
  overrides = edit(f, auto, overrides, 'caption-2', 'Reset');
  const restored = resolve(f, auto, overrides);
  assert.deepEqual(restored.plan, f.baselinePlan);
  assert.deepEqual(restored.resolution.exceptions, first.resolution.exceptions);
  assert.equal(state(restored, 'caption-2').automaticSelection, null);
  assert.equal(JSON.stringify(auto), before);
});

test('Vocal changes only the selected caption size and preserves fixed text, lines, source, time and other elements', () => {
  const f = fixture(), auto = fixed(f, {effects: [{captionId: 'caption-2', ...vocal()}]});
  const before = JSON.stringify(f), autoBefore = JSON.stringify(auto);
  const result = resolve(f, auto);
  const expected = clone(f.baselinePlan);
  expected.elements[1].visualState.textStyle.fontSizePx = 128;
  assert.deepEqual(result.plan, expected);
  assert.equal(state(result, 'caption-2').role, 'Vocal accent');
  assert.equal(state(result, 'caption-2').canonicalRange, null);
  assert.equal(Object.hasOwn(item(result, 'caption-2'), 'presentationColorRange'), false);
  assert.equal(JSON.stringify(f), before);
  assert.equal(JSON.stringify(auto), autoBefore);
});

test('Focus, Vocal and Normal replace each other and Reset restores either saved automatic role', () => {
  for (const automatic of [focus(), vocal()]) {
    const f = fixture(), auto = fixed(f, {effects: [{captionId: 'caption-2', ...automatic}]});
    const saved = JSON.stringify(auto), automaticPlan = resolve(f, auto).plan;
    let overrides = emptyOverrides(f, auto);
    for (const selection of [vocal(), {...focus(), scope: 'partial-caption', targetText: 'とは限りません'}, vocal(), 'Normal', 'Reset']) {
      overrides = edit(f, auto, overrides, 'caption-2', selection);
      const result = resolve(f, auto, overrides), target = item(result, 'caption-2');
      const role = selection === 'Reset' ? automatic.role : selection === 'Normal' ? 'Normal' : selection.role;
      assert.equal(state(result, 'caption-2').role, role);
      assert.equal(target.visualState.textStyle.fontSizePx, role === 'Vocal accent' ? 128 : 71);
      assert.equal(Object.hasOwn(target, 'presentationColorRange'), role === 'Focus');
      assert.deepEqual(result.plan.elements.filter(e => e.instructionId !== 'caption-2'),
        f.baselinePlan.elements.filter(e => e.instructionId !== 'caption-2'));
      assert.equal(JSON.stringify(auto), saved);
      if (selection === 'Normal') assert.deepEqual(result.plan, f.baselinePlan);
      if (selection === 'Reset') {
        assert.deepEqual(result.plan, automaticPlan);
        assert.equal(state(result, 'caption-2').hasOverride, false);
      }
    }
  }
});

test('Vocal cannot receive partial ranges, free drawing values, duplicate roles, or a prepainted baseline', () => {
  const f = fixture(), auto = fixed(f), overrides = emptyOverrides(f, auto);
  for (const selection of [
    {...vocal(), scope: 'partial-caption', targetText: '字幕'},
    {...vocal(), occurrence: 1}, {...vocal(), fontSizePx: 120}, {...vocal(), scale: 2},
    {...vocal(), presentation: 'dynamic-pop'}, {...vocal(), color: '#FFFF00'},
  ]) {
    assert.throws(() => fixed(f, {effects: [{captionId: 'caption-1', ...selection}]}), /Scale Accent/);
    assert.throws(() => edit(f, auto, overrides, 'caption-1', selection), /Scale Accent/);
  }
  assert.throws(() => fixed(f, {effects: [effect('caption-1'), {captionId: 'caption-1', ...vocal()}]}), /conflicting/);
  const painted = resolve(f, fixed(f, {effects: [effect('caption-1')]})).plan;
  const context = clone(f.context);
  context.baselineRef.canonicalSha256 = sha256AutoPresentationV001(painted);
  assert.throws(() => resolveAutoPresentationV001({baselinePlan: painted, context}), /fixed normal plan/);
});

test('forward-only rules reject an old revision even when its saved proposal hash is recomputed', () => {
  const f = fixture(), auto = clone(fixed(f, {effects: [{captionId: 'caption-1', ...vocal()}]}));
  auto.proposal.context.renderingRulesRef.version = 'auto-presentation-rules-v004';
  auto.proposalSha256 = sha256AutoPresentationStateV001(auto.proposal);
  assert.throws(() => resolve(f, auto), /rendering rules version differs/);
  const context = clone(f.context);
  context.renderingRulesRef.version = 'auto-presentation-rules-v004';
  assert.throws(() => createAutoPresentationOverridesV001({baselinePlan: f.baselinePlan, context}), /rendering rules version differs/);
});

test('content identity ignores object-key order while preserving array order and values', () => {
  assert.equal(sha256AutoPresentationV001({b: 2, a: 1}), byteSha('{"a":1,"b":2}'));
  assert.equal(sha256AutoPresentationV001({b: {d: 4, c: 3}, a: 1}),
    sha256AutoPresentationV001({a: 1, b: {c: 3, d: 4}}));
  assert.notEqual(sha256AutoPresentationV001(['caption-1', 'caption-2']),
    sha256AutoPresentationV001(['caption-2', 'caption-1']));
  assert.notEqual(sha256AutoPresentationV001({a: 1}), sha256AutoPresentationV001({a: 2}));
  assert.notEqual(sha256AutoPresentationV001({path: 'first/location'}),
    sha256AutoPresentationV001({path: 'second/location'}));
});

test('the same complete target set and effects fix to one saved proposal without changing display order', () => {
  const f = fixture();
  const ordered = fixed(f, {effects: [effect('caption-1'), effect('caption-3')]});
  const reordered = fixed(f, {targetCaptionIds: [...captionIds].reverse(),
    effects: [effect('caption-3'), effect('caption-1')]});
  assert.deepEqual(reordered, ordered);
  assert.deepEqual(reordered.proposal.targetCaptionIds, captionIds);
  assert.deepEqual(resolve(f, reordered).plan.elements.map(element => element.instructionId),
    f.baselinePlan.elements.map(element => element.instructionId));
});

test('no automatic judgment, completed all-Normal, and all effects removed retain the entire ordinary plan', () => {
  const f = fixture();
  const noJudgment = resolve(f);
  const allNormal = resolve(f, fixed(f));
  const autoProposal = fixed(f, {effects: [effect('caption-1'), effect('caption-3')]});
  let overrides = emptyOverrides(f, autoProposal);
  for (const id of ['caption-1', 'caption-3']) overrides = edit(f, autoProposal, overrides, id, 'Normal');
  const removed = resolve(f, autoProposal, overrides);
  for (const result of [noJudgment, allNormal, removed]) assert.deepEqual(result.plan, f.baselinePlan);
  assert.equal(noJudgment.resolution.automaticStatus, 'not-processed');
  assert.equal(allNormal.resolution.automaticStatus, 'complete');
  assert.equal(removed.resolution.automaticStatus, 'complete');
  assert.ok(noJudgment.resolution.captions.every(row => row.automaticStatus === 'not-processed'));
  assert.ok(allNormal.resolution.captions.every(row => row.automaticStatus === 'normal'));
});

test('changing one caption preserves every other caption, the non-caption element, and source/timing/layout content', () => {
  const f = fixture();
  const autoProposal = fixed(f, {effects: [effect('caption-1')]});
  const automatic = resolve(f, autoProposal);
  const overrides = edit(f, autoProposal, emptyOverrides(f, autoProposal), 'caption-2', focus());
  const changed = resolve(f, autoProposal, overrides);
  for (const id of ['caption-1', 'caption-3', 'section-title']) assert.deepEqual(item(changed, id), item(automatic, id));
  for (const id of ['caption-1', 'caption-3']) assert.deepEqual(state(changed, id), state(automatic, id));
  assert.notDeepEqual(item(changed, 'caption-2'), item(automatic, 'caption-2'));
  const original = f.baselinePlan.elements[1], selected = item(changed, 'caption-2');
  for (const field of ['instructionId', 'kind', 'text', 'indexedLines', 'startFrame', 'endFrameExclusive',
    'displayFrameCount', 'sourceMapping', 'targetProvenance']) assert.deepEqual(selected[field], original[field], field);
  assert.deepEqual(selected.visualState.position, original.visualState.position);
  assert.deepEqual(selected.visualState.animation, original.visualState.animation);
  assert.deepEqual(changed.plan.canvas, f.baselinePlan.canvas);
  assert.deepEqual(changed.plan.baseMedia, f.baselinePlan.baseMedia);
  assert.deepEqual(changed.plan.provenance, f.baselinePlan.provenance);
  assert.equal(state(changed, 'caption-1').origin, 'automatic');
  assert.equal(state(changed, 'caption-2').origin, 'human');
  assert.equal(state(changed, 'caption-2').role, 'Focus');
});

test('human Focus can add a missing effect, Normal removes an automatic effect, and Reset restores that saved automatic result', () => {
  const f = fixture();
  const autoProposal = fixed(f, {effects: [effect('caption-1')]});
  const automatic = resolve(f, autoProposal);
  let overrides = emptyOverrides(f, autoProposal);
  overrides = edit(f, autoProposal, overrides, 'caption-1', 'Normal');
  const normal = resolve(f, autoProposal, overrides);
  assert.deepEqual(item(normal, 'caption-1'), f.baselinePlan.elements[0]);
  assert.notDeepEqual(item(normal, 'caption-1'), item(automatic, 'caption-1'));
  assert.equal(state(normal, 'caption-1').origin, 'human');
  assert.equal(state(normal, 'caption-1').role, 'Normal');
  overrides = edit(f, autoProposal, overrides, 'caption-2', focus());
  const added = resolve(f, autoProposal, overrides);
  assert.equal(state(added, 'caption-2').role, 'Focus');
  const resetOne = edit(f, autoProposal, overrides, 'caption-1', 'Reset');
  const afterReset = resolve(f, autoProposal, resetOne);
  assert.deepEqual(item(afterReset, 'caption-1'), item(automatic, 'caption-1'));
  assert.deepEqual(state(afterReset, 'caption-1'), state(automatic, 'caption-1'));
  assert.deepEqual(item(afterReset, 'caption-2'), item(added, 'caption-2'));
  assert.deepEqual(state(afterReset, 'caption-2'), state(added, 'caption-2'));
  const resetAll = edit(f, autoProposal, resetOne, 'caption-2', 'Reset');
  assert.deepEqual(resolve(f, autoProposal, resetAll).plan, automatic.plan);
  assert.deepEqual(resetAll.entries, []);
});

test('the same human selection is idempotent and independent caption edits commute', () => {
  const f = fixture(), autoProposal = fixed(f, {effects: [effect('caption-1')]});
  const empty = emptyOverrides(f, autoProposal);
  const first = edit(f, autoProposal, empty, 'caption-2', focus());
  const repeated = edit(f, autoProposal, first, 'caption-2', focus());
  assert.deepEqual(repeated, first);
  assert.deepEqual(resolve(f, autoProposal, repeated).plan, resolve(f, autoProposal, first).plan);
  const ab = edit(f, autoProposal, edit(f, autoProposal, empty, 'caption-1', 'Normal'), 'caption-2', focus());
  const ba = edit(f, autoProposal, edit(f, autoProposal, empty, 'caption-2', focus()), 'caption-1', 'Normal');
  assert.deepEqual(ab, ba);
  assert.deepEqual(resolve(f, autoProposal, ab), resolve(f, autoProposal, ba));
});

test('fixing, editing, resolving, and Reset do not rewrite any supplied baseline, proposal, or prior override', () => {
  const f = fixture();
  const inputProposal = freeze(proposal(f, {effects: [effect('caption-1')]}));
  const originalInputs = clone({f, inputProposal});
  const autoProposal = freeze(fixAutoPresentationProposalV001({...f, proposal: inputProposal}));
  const empty = freeze(emptyOverrides(f, autoProposal));
  const before = clone({autoProposal, empty});
  const overridden = freeze(edit(f, autoProposal, empty, 'caption-1', 'Normal'));
  const savedOverride = clone(overridden);
  resolve(f, autoProposal, overridden);
  const reset = edit(f, autoProposal, overridden, 'caption-1', 'Reset');
  resolve(f, autoProposal, reset);
  assert.deepEqual({f, inputProposal}, originalInputs);
  assert.deepEqual({autoProposal, empty}, before);
  assert.deepEqual(overridden, savedOverride);
});

test('rendering provenance identifies its input versions and human revision without changing the saved automatic reference', () => {
  const f = fixture(), autoProposal = fixed(f, {effects: [effect('caption-1')]});
  const unprocessed = resolve(f);
  assert.deepEqual(unprocessed.resolution.context, f.context);
  assert.equal(unprocessed.resolution.autoProposalSha256, null);
  assert.equal(unprocessed.resolution.overridesSha256, null);
  const automatic = resolve(f, autoProposal);
  assert.equal(automatic.resolution.autoProposalSha256, autoProposal.proposalSha256);
  assert.equal(automatic.resolution.overridesSha256, null);
  const empty = emptyOverrides(f, autoProposal);
  const normal = edit(f, autoProposal, empty, 'caption-1', 'Normal');
  const added = edit(f, autoProposal, normal, 'caption-2', focus());
  const restored = edit(f, autoProposal, normal, 'caption-1', 'Reset');
  for (const overrides of [empty, normal, added, restored]) {
    const {resolution} = resolve(f, autoProposal, overrides);
    assert.deepEqual(resolution.context, f.context);
    assert.equal(resolution.autoProposalSha256, autoProposal.proposalSha256);
    assert.equal(resolution.overridesSha256, sha256AutoPresentationStateV001(overrides));
  }
  assert.notEqual(resolve(f, autoProposal, normal).resolution.overridesSha256,
    resolve(f, autoProposal, added).resolution.overridesSha256);
  assert.equal(resolve(f, autoProposal, restored).resolution.overridesSha256,
    resolve(f, autoProposal, empty).resolution.overridesSha256);
});

test('a changed effective plan cannot replace the fixed baseline under its original reference', () => {
  const f = fixture(), autoProposal = fixed(f, {effects: [effect('caption-1')]});
  const effective = resolve(f, autoProposal);
  const overrides = edit(f, autoProposal, emptyOverrides(f, autoProposal), 'caption-1', 'Normal');
  assert.throws(() => resolve({...f, baselinePlan: effective.plan}, autoProposal, overrides));
  assert.deepEqual(resolve(f, autoProposal, overrides).plan, f.baselinePlan);
});

test('unrepresentable and unresolved judgments remain explicit even when displayed normally or repaired by a person', () => {
  const f = fixture();
  const exceptions = [
    {captionId: 'caption-2', status: 'unrepresentable', reason: 'The intended phrase is part of this caption.'},
    {captionId: 'caption-3', status: 'unresolved', reason: 'The saved text does not establish the vocal delivery.'},
  ];
  const autoProposal = fixed(f, {effects: [effect('caption-1')], exceptions});
  const result = resolve(f, autoProposal);
  assert.equal(result.resolution.automaticStatus, 'complete-with-exceptions');
  assert.deepEqual(result.resolution.exceptions, exceptions);
  for (const [index, id, status] of [[1, 'caption-2', 'unrepresentable'], [2, 'caption-3', 'unresolved']]) {
    assert.deepEqual(item(result, id), f.baselinePlan.elements[index]);
    assert.equal(state(result, id).role, 'Normal');
    assert.equal(state(result, id).automaticStatus, status);
  }
  const human = resolve(f, autoProposal, edit(f, autoProposal, emptyOverrides(f, autoProposal), 'caption-2', focus()));
  assert.equal(state(human, 'caption-2').role, 'Focus');
  assert.equal(state(human, 'caption-2').automaticStatus, 'unrepresentable');
  assert.deepEqual(human.resolution.exceptions, exceptions);
  assert.equal(human.resolution.automaticStatus, 'complete-with-exceptions');
});

test('human additions and Reset also work before any automatic judgment exists', () => {
  const f = fixture(), empty = emptyOverrides(f);
  const added = edit(f, undefined, empty, 'caption-2', focus());
  const result = resolve(f, undefined, added);
  assert.equal(state(result, 'caption-2').role, 'Focus');
  assert.equal(result.resolution.automaticStatus, 'not-processed');
  const reset = edit(f, undefined, added, 'caption-2', 'Reset');
  assert.deepEqual(resolve(f, undefined, reset).plan, f.baselinePlan);
});

test('a completed partial target set leaves other captions unprocessed, including after a human adds an effect there', () => {
  const f = fixture();
  const autoProposal = fixed(f, {targetCaptionIds: ['caption-1']});
  const result = resolve(f, autoProposal);
  assert.equal(result.resolution.automaticStatus, 'partially-processed');
  assert.deepEqual(result.plan, f.baselinePlan);
  assert.equal(state(result, 'caption-1').automaticStatus, 'normal');
  assert.equal(state(result, 'caption-1').origin, 'automatic');
  for (const id of ['caption-2', 'caption-3']) {
    assert.equal(state(result, id).automaticStatus, 'not-processed');
    assert.equal(state(result, id).origin, 'baseline');
  }
  const overrides = edit(f, autoProposal, emptyOverrides(f, autoProposal), 'caption-2', focus());
  const repaired = resolve(f, autoProposal, overrides);
  assert.equal(state(repaired, 'caption-2').role, 'Focus');
  assert.equal(state(repaired, 'caption-2').origin, 'human');
  assert.equal(state(repaired, 'caption-2').automaticStatus, 'not-processed');
  assert.equal(repaired.resolution.automaticStatus, 'partially-processed');
});

test('a proposal is rejected before fixing for unknown targets, unsupported drawing, invalid coverage, and malformed exceptions', async t => {
  const f = fixture();
  const cases = [
    ['unknown caption', p => {p.effects = [effect('missing')];}],
    ['non-caption target', p => {p.effects = [effect('section-title')];}],
    ['unknown role', p => {p.effects = [{...effect('caption-1'), role: 'Emotion'}];}],
    ['Vocal cannot use the Focus preset', p => {p.effects = [{...effect('caption-1'), role: 'Vocal accent'}];}],
    ['unknown presentation', p => {p.effects = [{...effect('caption-1'), presentation: 'free-style'}];}],
    ['partial scope', p => {p.effects = [{...effect('caption-1'), scope: 'partial-range'}];}],
    ['extra drawing value', p => {p.effects = [{...effect('caption-1'), fontColor: '#FF0000'}];}],
    ['duplicate selection', p => {p.effects = [effect('caption-1'), effect('caption-1')];}],
    ['unknown proposal field', p => {p.fontSizePx = 120;}],
    ['empty target set', p => {p.targetCaptionIds = [];}],
    ['only a missing array element', p => {p.targetCaptionIds = new Array(1);}],
    ['known target followed by a missing array element', p => {p.targetCaptionIds = ['caption-1']; p.targetCaptionIds.length = 2;}],
    ['duplicate target', p => {p.targetCaptionIds[1] = p.targetCaptionIds[0];}],
    ['unknown target in coverage', p => {p.targetCaptionIds[1] = 'missing';}],
    ['effect outside processed set', p => {p.targetCaptionIds = ['caption-2']; p.effects = [effect('caption-1')];}],
    ['exception outside processed set', p => {p.targetCaptionIds = ['caption-2']; p.exceptions = [{captionId: 'caption-1', status: 'unresolved', reason: 'missing evidence'}];}],
    ['incomplete judgment with empty effects', p => {p.completion = 'incomplete';}],
    ['missing completion with empty effects', p => {delete p.completion;}],
    ['unknown exception caption', p => {p.exceptions = [{captionId: 'missing', status: 'unresolved', reason: 'missing evidence'}];}],
    ['unknown exception status', p => {p.exceptions = [{captionId: 'caption-1', status: 'Normal', reason: 'not an exception'}];}],
    ['empty exception reason', p => {p.exceptions = [{captionId: 'caption-1', status: 'unresolved', reason: '  '}];}],
    ['extra exception field', p => {p.exceptions = [{captionId: 'caption-1', status: 'unresolved', reason: 'missing evidence', fontSizePx: 120}];}],
    ['duplicate exception', p => {p.exceptions = Array.from({length: 2}, () => ({captionId: 'caption-1', status: 'unresolved', reason: 'missing evidence'}));}],
    ['selection and exception overlap', p => {p.effects = [effect('caption-1')]; p.exceptions = [{captionId: 'caption-1', status: 'unresolved', reason: 'missing evidence'}];}],
  ];
  for (const [name, mutate] of cases) await t.test(name, () => {
    const candidate = proposal(f); mutate(candidate);
    assert.throws(() => fixAutoPresentationProposalV001({...f, proposal: candidate}));
  });
});

test('proposal and baseline references must agree with the current immutable inputs and installed rendering rules', async t => {
  const f = fixture();
  const cases = [
    ['baseline file bytes', p => {p.context.baselineRef.fileSha256 = byteSha('other plan bytes');}],
    ['baseline content', p => {p.context.baselineRef.canonicalSha256 = byteSha('other plan content');}],
    ['decision version', p => {p.context.decisionInputRef.fileSha256 = byteSha('other decision');}],
    ['drawing rule version', p => {p.context.renderingRulesRef.version = 'other-rules';}],
    ['drawing rule content', p => {p.context.renderingRulesRef.contentSha256 = byteSha('other drawing rules');}],
    ['unknown context field', p => {p.context.layout = 'free';}],
    ['missing baseline locator', p => {delete p.context.baselineRef.path;}],
    ['invalid baseline locator', p => {p.context.baselineRef.path = 42;}],
    ['unknown baseline reference field', p => {p.context.baselineRef.extra = 'unrecognized';}],
    ['missing decision locator', p => {delete p.context.decisionInputRef.path;}],
    ['empty decision locator', p => {p.context.decisionInputRef.path = '  ';}],
    ['unknown decision reference field', p => {p.context.decisionInputRef.extra = 'unrecognized';}],
  ];
  for (const [name, mutate] of cases) await t.test(name, () => {
    const candidate = proposal(f); mutate(candidate);
    assert.throws(() => fixAutoPresentationProposalV001({...f, proposal: candidate}));
  });
  const changedBaseline = clone(f.baselinePlan);
  changedBaseline.elements[0].text += 'changed';
  assert.throws(() => fixAutoPresentationProposalV001({...f, baselinePlan: changedBaseline, proposal: proposal(f)}));
  const changedContext = clone(f.context);
  changedContext.renderingRulesRef.contentSha256 = byteSha('unregistered rules');
  assert.throws(() => resolve({...f, context: changedContext}));
});

test('moving identical inputs preserves the fixed judgment and human edits, and Reset still restores the saved automatic result', async t => {
  const f = fixture(), autoProposal = fixed(f, {effects: [effect('caption-1')]});
  const overrides = edit(f, autoProposal, emptyOverrides(f, autoProposal), 'caption-1', 'Normal');
  const saved = clone({autoProposal, overrides});
  const automatic = resolve(f, autoProposal);
  const human = resolve(f, autoProposal, overrides);
  for (const referenceKeys of [['baselineRef'], ['decisionInputRef'], ['baselineRef', 'decisionInputRef']]) {
    await t.test(referenceKeys.join(' and '), () => {
      const movedContext = clone(f.context);
      for (const key of referenceKeys) movedContext[key].path = `relocated/${key}.json`;
      const moved = freeze({baselinePlan: f.baselinePlan, context: movedContext});
      const fixedAgain = fixed(moved, {effects: [effect('caption-1')]});
      assert.equal(fixedAgain.proposalSha256, autoProposal.proposalSha256);
      assert.equal(sha256AutoPresentationStateV001(fixedAgain.proposal),
        sha256AutoPresentationStateV001(autoProposal.proposal));
      assert.notEqual(sha256AutoPresentationV001(fixedAgain.proposal),
        sha256AutoPresentationV001(autoProposal.proposal));
      // The current input location and the previously saved proposal location may differ.
      const priorLocationProposal = fixAutoPresentationProposalV001({...moved, proposal: autoProposal.proposal});
      assert.equal(priorLocationProposal.proposalSha256, autoProposal.proposalSha256);
      const reused = resolve(moved, fixedAgain, overrides);
      assert.deepEqual(reused.plan, human.plan);
      assert.deepEqual(reused.resolution.context, moved.context);
      assert.equal(reused.resolution.autoProposalSha256, autoProposal.proposalSha256);
      assert.equal(reused.resolution.overridesSha256, human.resolution.overridesSha256);
      const equivalentEdit = edit(moved, fixedAgain, emptyOverrides(moved, fixedAgain), 'caption-1', 'Normal');
      assert.equal(sha256AutoPresentationStateV001(equivalentEdit), sha256AutoPresentationStateV001(overrides));
      const reset = edit(moved, fixedAgain, overrides, 'caption-1', 'Reset');
      assert.deepEqual(reset.entries, []);
      assert.deepEqual(resolve(moved, fixedAgain, reset).plan, automatic.plan);
    });
  }
  assert.deepEqual({autoProposal, overrides}, saved);
});

test('invalid human selections and duplicate override entries cannot reach the renderer', async t => {
  const f = fixture(), autoProposal = fixed(f), empty = emptyOverrides(f, autoProposal);
  for (const [name, captionId, selection] of [
    ['unknown Normal target', 'missing', 'Normal'],
    ['unknown Reset target', 'missing', 'Reset'],
    ['non-caption effect target', 'section-title', focus()],
    ['old trial name', 'caption-1', 'emphasis'],
    ['unknown role', 'caption-1', {...focus(), role: 'Emotion'}],
    ['partial range', 'caption-1', {...focus(), scope: 'partial-range'}],
    ['free rendering value', 'caption-1', {...focus(), fontSizePx: 120}],
  ]) await t.test(name, () => assert.throws(() => edit(f, autoProposal, empty, captionId, selection)));
  const added = edit(f, autoProposal, empty, 'caption-1', focus());
  const duplicated = clone(added); duplicated.entries.push(clone(duplicated.entries[0]));
  assert.throws(() => resolve(f, autoProposal, duplicated));
  const unknown = clone(added); unknown.extra = true;
  assert.throws(() => resolve(f, autoProposal, unknown));
  for (const mutate of [
    value => {delete value.context.baselineRef.path;},
    value => {value.context.decisionInputRef.path = '';},
    value => {value.context.baselineRef.extra = 'unrecognized';},
    value => {value.context.decisionInputRef.extra = 'unrecognized';},
  ]) {
    const malformed = clone(added); mutate(malformed);
    assert.throws(() => resolve(f, autoProposal, malformed));
  }
});

test('saved human edits cannot silently migrate to another automatic proposal or changed input content', () => {
  const f = fixture(), originalAuto = fixed(f, {effects: [effect('caption-1')]});
  const overrides = edit(f, originalAuto, emptyOverrides(f, originalAuto), 'caption-1', 'Normal');
  const otherAuto = fixed(f, {effects: [effect('caption-2')]});
  assert.throws(() => resolve(f, otherAuto, overrides));
  assert.throws(() => edit(f, otherAuto, overrides, 'caption-2', focus()));
  assert.throws(() => resolve(f, undefined, overrides));
  const changedContext = clone(f.context); changedContext.decisionInputRef.fileSha256 = byteSha('new decision input');
  assert.throws(() => resolve({...f, context: changedContext}, originalAuto, overrides));
  const changedOverrides = clone(overrides); changedOverrides.context.baselineRef.fileSha256 = byteSha('new baseline file');
  assert.throws(() => resolve(f, originalAuto, changedOverrides));
  const alteredAuto = clone(originalAuto); alteredAuto.proposal.effects = [];
  assert.throws(() => resolve(f, alteredAuto, overrides));
});
