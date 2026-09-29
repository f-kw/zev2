import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {canonicalSha256} from './clock.mjs';
import {materializeFiniteAutoPresentationCaptionV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {CAPTION_PALETTE_V001, resolveCaptionPaletteIdV001, materializeCaptionPaletteColorV001,
  createCaptionPaletteAutoV001, createCaptionPaletteOverridesV001, editCaptionPaletteOverrideV001,
  resolveCaptionPaletteV001, exportCaptionPaletteStateV001, restoreCaptionPaletteStateV001} from './caption-palette-policy.mjs';

const clone = structuredClone;
function fixture() {
  const texts = ['甲乙甲乙', '全体', 'トイレには行かない', '通常字幕', '背景あり', '動きあり'];
  const normal = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas: {width: 1920, height: 1080, fps: 30},
    elements: texts.map((text, i) => ({instructionId: 'caption-' + i, kind: 'speech-caption', text,
      indexedLines: [{lineIndex: 0, text}], startFrame: i * 100, endFrameExclusive: i * 100 + 90,
      displayFrameCount: 90, sourceStartMs: i * 5000, sourceEndMs: i * 5000 + 3000, timelineSegmentId: 'main',
      targetProvenance: {sourceAtomIds: ['atom-' + i]},
      visualState: {textStyle: {fontSizePx: 144, fontColor: '#FFFDF8', borderWidthPx: 4,
        borderColor: '#2F4F4F', glowColor: '#2F4F4F', glowWidthPx: 4},
      position: {preset: 'bottom-center'}, background: null},
      transition: {entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}}}))};
  const selections = [
    {role: 'Focus', presentation: 'provisional-focus', scope: 'partial-caption', targetText: '甲乙', occurrence: 2},
    {role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'},
    {role: 'Focus', presentation: 'provisional-focus', scope: 'partial-caption', targetText: texts[2]},
    {role: 'Normal'},
    {role: 'Panel accent', presentation: 'provisional-panel', scope: 'whole-caption', paletteId: 'ivory'},
    {role: 'Bounce accent', presentation: 'provisional-bounce', scope: 'whole-caption'},
  ];
  const resolved = clone(normal);
  for (let i = 0; i < 3; i++) resolved.elements[i] = materializeFiniteAutoPresentationCaptionV001({element: resolved.elements[i], canvas: normal.canvas, selection: selections[i]});
  resolved.elements[4].visualState.background = {kind: 'saved-panel-fixture', paletteId: 'ivory'};
  resolved.elements[5].presentationMotion = {presentation: 'provisional-bounce', presetVersion: 'saved-motion-fixture', speechEndFrame: 582};
  const source = {sourceViewSha256: 'a'.repeat(64), resolvedPlan: resolved, projectedNormalPlan: normal,
    effectiveSelections: selections.map((selection, i) => ({captionId: 'caption-' + i, selection, origin: 'automatic', hasOverride: false}))};
  const choices = ['light-sky-blue', 'yellow', 'light-sky-blue'].map((paletteId, i) => ({captionId: 'caption-' + i, paletteId, reason: '保存文脈に対する明示候補 ' + i}));
  const automatic = createCaptionPaletteAutoV001({source, choices});
  const overrides = createCaptionPaletteOverridesV001({source, automatic});
  return {source, automatic, overrides, choices};
}

test('two approved candidate colors only, and only a missing palette field restores legacy Yellow', () => {
  assert.deepEqual(CAPTION_PALETTE_V001.colors.map(row => [row.paletteId, row.fontColor]),
    [['yellow', '#FFD65A'], ['light-sky-blue', '#87CEFA']]);
  assert.equal(resolveCaptionPaletteIdV001({}), 'yellow');
  for (const value of [{paletteId: null}, {paletteId: undefined}, {paletteId: ''}, {paletteId: 'cyan'}, {paletteId: 'light-coral'},
    {paletteId: '#87CEFA'}, {fontColor: '#87CEFA'}, {paletteId: 'yellow', rgb: '#FFD65A'}])
    assert.throws(() => resolveCaptionPaletteIdV001(value), /CAPTION_PALETTE_INVALID/);
});

test('palette-only resolution preserves exact ranges, partial child-full scope, source clocks and all other effects', () => {
  const f = fixture(), before = clone(f), result = resolveCaptionPaletteV001(f);
  assert.deepEqual(f, before);
  for (const [i, actual] of result.plan.elements.entries()) {
    const original = f.source.resolvedPlan.elements[i];
    if (i < 3) {
      assert.deepEqual({...actual, presentationColorRange: {...actual.presentationColorRange, fontColor: null}},
        {...original, presentationColorRange: {...original.presentationColorRange, fontColor: null}});
      assert.equal(actual.presentationColorRange.fontColor, CAPTION_PALETTE_V001.colors.find(row => row.paletteId === f.choices[i].paletteId).fontColor);
    } else assert.deepEqual(actual, original);
  }
  assert.deepEqual(result.colorBindings[0].range, {startCodePoint: 2, endCodePointExclusive: 4});
  assert.equal(result.effectiveSelections[2].selection.scope, 'partial-caption');
  assert.equal(result.effectiveSelections[2].selection.targetText, 'トイレには行かない');
  assert.deepEqual(result.effectiveSelections.slice(3), f.source.effectiveSelections.slice(3));
  assert.equal(result.humanQuality, 'not-evaluated'); assert.equal(result.productionDefaultChanged, false);
});

test('legacy materialization stays byte-for-byte Yellow and does not write palette metadata into old inputs', () => {
  const f = fixture();
  for (let i = 0; i < 3; i++) {
    const selection = f.source.effectiveSelections[i].selection, before = clone(selection);
    const output = materializeCaptionPaletteColorV001({element: f.source.projectedNormalPlan.elements[i], canvas: f.source.projectedNormalPlan.canvas, selection});
    assert.deepEqual(output, f.source.resolvedPlan.elements[i]); assert.deepEqual(selection, before);
    assert(!Object.hasOwn(selection, 'paletteId'));
  }
});

test('one palette edit saves and reloads; Reset removes only that override and restores the saved nonyellow choice', () => {
  const f = fixture(), original = resolveCaptionPaletteV001(f);
  const changed = {...f, overrides: editCaptionPaletteOverrideV001({...f, captionId: 'caption-0', selection: {paletteId: 'yellow'}})};
  const saved = exportCaptionPaletteStateV001(changed), reread = restoreCaptionPaletteStateV001({source: f.source, saved: clone(saved)});
  assert.deepEqual(reread.resolution, resolveCaptionPaletteV001(changed));
  assert.deepEqual(reread.resolution.plan.elements.slice(1), original.plan.elements.slice(1));
  const second = {...changed, overrides: editCaptionPaletteOverrideV001({...changed, captionId: 'caption-2', selection: {paletteId: 'yellow'}})};
  const reset = {...second, overrides: editCaptionPaletteOverrideV001({...second, captionId: 'caption-0', selection: 'Reset'})};
  assert.deepEqual(reset.overrides.entries, [{captionId: 'caption-2', selection: {paletteId: 'yellow'}}]);
  assert.deepEqual(resolveCaptionPaletteV001(reset).plan.elements[0], original.plan.elements[0]);
  assert.equal(resolveCaptionPaletteV001(reset).effectiveSelections[0].selection.paletteId, 'light-sky-blue');
  assert.deepEqual(f.automatic, changed.automatic);
});

test('existing Normal override clears one Color without losing its saved range; Reset restores it exactly', () => {
  const f = fixture(); const changed = {...f, overrides: editCaptionPaletteOverrideV001({...f, captionId: 'caption-2', selection: 'Normal'})};
  const resolved = resolveCaptionPaletteV001(changed);
  assert.deepEqual(resolved.plan.elements[2], f.source.projectedNormalPlan.elements[2]);
  assert.equal(resolved.colorBindings[2].active, false); assert.equal(resolved.colorBindings[2].effectivePaletteId, null);
  assert.equal(resolved.colorBindings[2].selection.scope, 'partial-caption');
  const reset = {...changed, overrides: editCaptionPaletteOverrideV001({...changed, captionId: 'caption-2', selection: 'Reset'})};
  assert.deepEqual(reset.overrides, f.overrides); assert.deepEqual(resolveCaptionPaletteV001(reset), resolveCaptionPaletteV001(f));
});

test('palette edits cannot add a Color target, change a range, alter another role, or inject raw RGB', () => {
  const f = fixture();
  for (const captionId of ['caption-3', 'caption-4', 'caption-5', 'unknown'])
    assert.throws(() => editCaptionPaletteOverrideV001({...f, captionId, selection: {paletteId: 'yellow'}}), /existing Color target/);
  for (const selection of [{paletteId: 'yellow', targetText: '乙'}, {paletteId: 'yellow', startCodePoint: 0},
    {fontColor: '#87CEFA'}, {}, {paletteId: null}, 'yellow', {role: 'Normal'}, {paletteId: 'not-known'}])
    assert.throws(() => editCaptionPaletteOverrideV001({...f, captionId: 'caption-0', selection}));
  for (const mutate of [rows => rows.pop(), rows => rows.reverse(), rows => rows.push({...rows[0], captionId: 'caption-3'}),
    rows => {delete rows[0].paletteId;}, rows => {rows[0].reason = '';}, rows => {rows[0].fontColor = '#fff';}]) {
    const choices = clone(f.choices); mutate(choices); assert.throws(() => createCaptionPaletteAutoV001({source: f.source, choices}));
  }
});

test('existing substring, overlapping occurrence, codepoint and grapheme validation still rejects malformed targets', () => {
  const f = fixture(), element = {...clone(f.source.projectedNormalPlan.elements[0]), text: 'á👨‍👩‍👧‍👦甲甲甲'};
  const selection = {role: 'Focus', presentation: 'provisional-focus', scope: 'partial-caption', paletteId: 'light-sky-blue'};
  for (const extra of [{targetText: 'a'}, {targetText: '👩'}, {targetText: '不存在'}, {targetText: '甲甲'},
    {targetText: '甲', occurrence: 0}, {targetText: '甲', occurrence: 4}, {targetText: '甲', occurrence: 1, fontColor: '#000'}])
    assert.throws(() => materializeCaptionPaletteColorV001({element, canvas: f.source.projectedNormalPlan.canvas, selection: {...selection, ...extra}}));
  const result = materializeCaptionPaletteColorV001({element, canvas: f.source.projectedNormalPlan.canvas,
    selection: {...selection, targetText: '甲甲', occurrence: 2}});
  assert.deepEqual(result.presentationColorRange, {startCodePoint: 10, endCodePointExclusive: 12, fontColor: '#87CEFA'});
});

test('modified source clocks/text/order/Color range or saved automatic/override hashes cannot restore', () => {
  const f = fixture(), saved = exportCaptionPaletteStateV001(f);
  for (const mutate of [s => {s.sourceViewSha256 = 'b'.repeat(64);}, s => {s.resolvedPlan.elements[0].text += '変';},
    s => {s.resolvedPlan.elements[0].startFrame++;}, s => {s.resolvedPlan.elements.reverse();},
    s => {s.resolvedPlan.elements[0].presentationColorRange.startCodePoint = 0;},
    s => {s.effectiveSelections[0].selection.targetText = '乙';}, s => {s.projectedNormalPlan.elements[3].visualState.textStyle.fontSizePx = 96;}]) {
    const source = clone(f.source); mutate(source); assert.throws(() => restoreCaptionPaletteStateV001({source, saved}));
  }
  for (const mutate of [s => {s.automatic.choices[0].paletteId = 'unknown';}, s => {s.automatic.targets[0].range.startCodePoint = 0;},
    s => {s.expectedResolutionSha256 = '0'.repeat(64);}, s => {s.overrides.entries = [{captionId: 'caption-3', selection: {paletteId: 'yellow'}}];},
    s => {delete s.automatic.targets;}, s => {s.automatic.humanQuality = 'approved';}]) {
    const changed = clone(saved); mutate(changed);
    const {stateSha256, ...body} = changed; changed.stateSha256 = canonicalSha256(body);
    assert.throws(() => restoreCaptionPaletteStateV001({source: f.source, saved: changed}));
  }
});

test('a separate process reconstructs the saved colors, scopes and non-Color elements without a decision call', () => {
  const f = fixture(), saved = exportCaptionPaletteStateV001(f);
  const url = new URL('./caption-palette-policy.mjs', import.meta.url).href;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import fs from 'node:fs';
    import {restoreCaptionPaletteStateV001} from ${JSON.stringify(url)};
    process.stdout.write(JSON.stringify(restoreCaptionPaletteStateV001(JSON.parse(fs.readFileSync(0,'utf8'))).resolution));`],
  {input: JSON.stringify({source: f.source, saved}), encoding: 'utf8', timeout: 15000});
  assert.equal(child.status, 0, child.stderr); assert.deepEqual(JSON.parse(child.stdout), resolveCaptionPaletteV001(f));
});

test('saved 7B has exactly its 18 partial Color targets; a uniform Yellow candidate reproduces the old plan', async t => {
  const root = new URL('../../', import.meta.url);
  let plans, evidence;
  try {
    plans = JSON.parse(await readFile(new URL('runtime/artifacts/digest-structure-20260929-v001/source-plans.json', root), 'utf8'));
    evidence = JSON.parse(await readFile(new URL('runtime/artifacts/caption-readability-full-20260929-v001/candidate-drawing-evidence.json', root), 'utf8'));
  } catch (error) {if (error.code === 'ENOENT') {t.skip('saved local 7B inputs unavailable'); return;} throw error;}
  const {restoreOrchestrationDrawingViewEvidenceV001} = await import('../../evals/clip_composition/presentation_orchestration_v001.mjs');
  const old = restoreOrchestrationDrawingViewEvidenceV001(evidence), selections = new Map(old.effectiveSelections.map(row => [row.captionId, row]));
  const source = {sourceViewSha256: 'c'.repeat(64), resolvedPlan: plans.resolvedPlan, projectedNormalPlan: plans.normalPlan,
    effectiveSelections: plans.resolvedPlan.elements.map(row => selections.get(row.instructionId)
      ?? {captionId: row.instructionId, selection: {role: 'Normal'}, origin: 'new-source-intro-closure', hasOverride: false})};
  const choices = source.effectiveSelections.filter(row => row.selection.role === 'Focus').map(row => ({captionId: row.captionId, paletteId: 'yellow', reason: '旧保存Yellowの同一性fixture。'}));
  assert.equal(choices.length, 18); assert(choices.every(row => selections.get(row.captionId).selection.scope === 'partial-caption'));
  const automatic = createCaptionPaletteAutoV001({source, choices}), overrides = createCaptionPaletteOverridesV001({source, automatic});
  const result = resolveCaptionPaletteV001({source, automatic, overrides});
  assert.deepEqual(result.plan, source.resolvedPlan); assert.equal(result.plan.elements.length, 265);
});
