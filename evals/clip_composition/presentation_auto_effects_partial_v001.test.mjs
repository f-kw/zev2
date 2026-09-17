import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {
  AUTO_PRESENTATION_RULES_REF_V007,
  createAutoPresentationOverridesV001,
  editAutoPresentationOverrideV001,
  fixAutoPresentationProposalV001,
  resolveAutoPresentationV001,
  sha256AutoPresentationStateV001,
  sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {
  loadAutoPresentationContextV001,
  loadAutoPresentationV001,
  saveAutoPresentationOverridesV001,
  saveFixedAutoPresentationV001,
} from './presentation_auto_effects_io_v001.mjs';

const clone = value => structuredClone(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const whole = () => ({role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'});
const partial = (targetText, occurrence) => ({role: 'Focus', presentation: 'provisional-focus',
  scope: 'partial-caption', targetText, ...(occurrence === undefined ? {} : {occurrence})});
const ids = ['caption-a', 'caption-b', 'caption-c'];

function fixture(text = '先頭中間末尾', lines = [text]) {
  const baselinePlan = {
    schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1280, height: 720, fps: 30},
    baseMedia: {path: 'fixed-media.mp4', fileSha256: hash('fixed media')},
    provenance: {captionBridge: 'fixed bridge', sourceIds: ['source-a', 'source-b']},
    elements: ids.map((instructionId, index) => ({
      instructionId, kind: 'speech-caption', text: index === 0 ? text : ['他の字幕', '通常のまま'][index - 1],
      indexedLines: (index === 0 ? lines : [['他の字幕'], ['通常のまま']][index - 1])
        .map((lineText, lineIndex) => ({lineIndex, text: lineText, sourceUnitIds: [`unit-${index}-${lineIndex}`]})),
      startFrame: 15 + index * 90, endFrameExclusive: 75 + index * 90,
      sourceMapping: {startMs: 11000 + index * 4000, endMs: 13000 + index * 4000},
      targetProvenance: {targetRefId: 'fixed-caption', atomOccurrenceIds: [`atom-${index}`]},
      visualState: {
        textStyle: {fontColor: ['#FFFDF8', '#EEEEEE', '#FFFFFF'][index], fontSizePx: 70 + index,
          fontAssetId: 'fixed-font', outlineColor: '#000000', outlineWidthPx: 3},
        position: {preset: 'bottom-center', x: 640, y: 600 + index},
        animation: {preset: 'fixed-fade', durationFrames: 4},
      },
    })),
  };
  baselinePlan.elements.push({instructionId: 'title-a', kind: 'title', text: '固定見出し',
    startFrame: 0, endFrameExclusive: 300, visualState: {position: {preset: 'top-left'}}});
  const context = {
    baselineRef: {path: 'normal.json', fileSha256: hash(JSON.stringify(baselinePlan)),
      canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: {path: 'input.json', fileSha256: hash('fixed input')},
    renderingRulesRef: clone(AUTO_PRESENTATION_RULES_REF_V007), pulseTimingEvidence: null,
  };
  return freeze({baselinePlan, context});
}
const proposal = (f, effects = [], changes = {}) => ({
  schemaVersion: 'auto-presentation-proposal-v001', context: clone(f.context),
  targetCaptionIds: [...ids], completion: 'complete', effects, exceptions: [], ...changes,
});
const effect = (captionId, selection) => ({captionId, ...selection});
const fix = (f, effects = [], changes) => fixAutoPresentationProposalV001({...f, proposal: proposal(f, effects, changes)});
const create = (f, autoProposal) => createAutoPresentationOverridesV001({...f, autoProposal});
const edit = (f, autoProposal, overrides, captionId, selection) => editAutoPresentationOverrideV001({
  ...f, autoProposal, overrides, captionId, selection,
});
const resolve = (f, autoProposal, overrides) => resolveAutoPresentationV001({...f, autoProposal, overrides});
const caption = (result, id = ids[0]) => result.plan.elements.find(element => element.instructionId === id);
const state = (result, id = ids[0]) => result.resolution.captions.find(row => row.captionId === id);

const validRanges = [
  ['beginning', '先頭中間末尾', '先頭', undefined, 0, 2],
  ['middle', '先頭中間末尾', '中間', undefined, 2, 4],
  ['end', '先頭中間末尾', '末尾', undefined, 4, 6],
  ['second repeated text after supplementary characters', '😀同じ😀同じ', '同じ', 2, 4, 6],
  ['overlapping third occurrence', 'aaaa', 'aa', 3, 2, 4],
  ['crossing an existing visual line break', '前半後半', '半後', undefined, 1, 3, ['前半', '後半']],
  ['including a literal newline', '前半\n後半', '半\n後', undefined, 1, 4],
  ['including complete CRLF grapheme and surrounding text', '前\r\n後', '前\r\n後', undefined, 0, 4],
  ['Japanese punctuation', '「本当？」、はい。', '？」、', undefined, 3, 6],
  ['emoji', '前😀後', '😀', undefined, 1, 2],
  ['mixed ordinary text and native color glyph', '前成功😀後', '成功😀', undefined, 1, 4],
  ['ZWJ emoji', 'A👩‍💻B', '👩‍💻', undefined, 1, 4],
  ['combining character', 'Aか\u3099B', 'か\u3099', undefined, 1, 3],
  ['ideographic variation selector', 'A葛\u{E0100}B', '葛\u{E0100}', undefined, 1, 3],
  ['emoji variation selector', 'A✈️B', '✈️', undefined, 1, 3],
  ['regional indicator pair', 'A🇯🇵B', '🇯🇵', undefined, 1, 3],
  ['skin tone modifier', 'A👍🏽B', '👍🏽', undefined, 1, 3],
  ['entire caption', '先頭中間末尾', '先頭中間末尾', undefined, 0, 6],
  ['single grapheme caption', '😀', '😀', undefined, 0, 1],
  ['literal space without trimming', 'A B', ' ', undefined, 1, 2],
  ['second literal match after a cut first match', 'xか\u3099yかz', 'か', 2, 4, 5],
];

test('exact partial selectors resolve to code-point ranges without changing ordinary caption content', async t => {
  for (const [name, text, target, occurrence, startCodePoint, endCodePointExclusive, lines] of validRanges) {
    await t.test(name, () => {
      const f = fixture(text, lines), selection = partial(target, occurrence);
      const auto = fix(f, [effect(ids[0], selection)]), automatic = resolve(f, auto);
      const overrides = edit(f, fix(f), create(f, fix(f)), ids[0], selection);
      const human = resolve(f, fix(f), overrides);
      for (const result of [automatic, human]) {
        assert.deepEqual(state(result).canonicalRange, {startCodePoint, endCodePointExclusive});
        assert.deepEqual(caption(result), {...f.baselinePlan.elements[0],
          presentationColorRange: {startCodePoint, endCodePointExclusive, fontColor: '#FFD65A'}});
        assert.deepEqual(result.plan.elements.slice(1), f.baselinePlan.elements.slice(1));
        assert.deepEqual(state(result).effectiveSelection, selection);
        assert.deepEqual(result.plan.baseMedia, f.baselinePlan.baseMedia);
        assert.deepEqual(result.plan.provenance, f.baselinePlan.provenance);
      }
      assert.deepEqual(auto.proposal.effects, [effect(ids[0], selection)]);
      assert.deepEqual(overrides.entries, [effect(ids[0], selection)]);
      assert.equal(state(automatic).origin, 'automatic');
      assert.equal(state(human).origin, 'human');
    });
  }
});

const invalidRanges = [
  ['missing exact text', '先頭中間末尾', partial('存在しない')],
  ['case is not folded', 'ABC', partial('abc')],
  ['width is not normalized', 'ＡＢＣ', partial('ABC')],
  ['combining text is not normalized', 'か\u3099', partial('が')],
  ['punctuation is not corrected', '本当？', partial('本当?')],
  ['surrounding spaces are not trimmed', 'A B', partial(' B ')],
  ['empty text', '先頭', partial('')],
  ['non-string text', '先頭', partial(1)],
  ['ambiguous repeated text', '同じ同じ', partial('同じ')],
  ['ambiguous overlapping text', 'aaaa', partial('aa')],
  ['zero occurrence', '同じ同じ', partial('同じ', 0)],
  ['negative occurrence', '同じ同じ', partial('同じ', -1)],
  ['fractional occurrence', '同じ同じ', partial('同じ', 1.5)],
  ['string occurrence', '同じ同じ', partial('同じ', '2')],
  ['unsafe occurrence', '同じ同じ', partial('同じ', Number.MAX_SAFE_INTEGER + 1)],
  ['nonfinite occurrence', '同じ同じ', partial('同じ', Infinity)],
  ['null occurrence', '同じ同じ', partial('同じ', null)],
  ['explicit undefined occurrence', '同じ同じ', {...partial('同じ'), occurrence: undefined}],
  ['out of range occurrence', '同じ同じ', partial('同じ', 3)],
  ['target exceeds caption', '先頭', partial('先頭中間')],
  ['target may not cross caption IDs', '先頭', partial('先頭他の字幕')],
  ['combining cluster end cut', 'Aか\u3099B', partial('か')],
  ['combining cluster start cut', 'Aか\u3099B', partial('\u3099')],
  ['variation selector end cut', 'A葛\u{E0100}B', partial('葛')],
  ['variation selector start cut', 'A葛\u{E0100}B', partial('\u{E0100}')],
  ['ZWJ cluster cut', 'A👩‍💻B', partial('👩')],
  ['regional indicator cut', 'A🇯🇵B', partial('🇯')],
  ['skin tone cut', 'A👍🏽B', partial('👍')],
  ['surrogate pair cut', 'A😀B', partial('\uD83D')],
  ['CRLF cluster cut', '前\r\n後', partial('\n後')],
  ['source LF without visible text', '前\n後', partial('\n')],
  ['source CR without visible text', '前\r後', partial('\r')],
  ['source CRLF without visible text', '前\r\n後', partial('\r\n')],
  ['invalid first literal match is not skipped', 'xか\u3099yかz', partial('か', 1)],
  ['invalid first match still makes omitted occurrence ambiguous', 'xか\u3099yかz', partial('か')],
  ['multiple ranges field', '先頭中間末尾', {...partial('先頭'), ranges: ['先頭', '末尾']}],
  ['raw offset field', '先頭中間末尾', {...partial('先頭'), startCodePoint: 0}],
  ['noncontiguous target array', '先頭中間末尾', {...partial('先頭'), targetText: ['先頭', '末尾']}],
  ['unknown role', '先頭中間末尾', {...partial('先頭'), role: 'Accent'}],
  ['unknown presentation', '先頭中間末尾', {...partial('先頭'), presentation: 'custom'}],
  ['font choice', '先頭中間末尾', {...partial('先頭'), fontFamily: 'other'}],
  ['font size', '先頭中間末尾', {...partial('先頭'), fontSizePx: 100}],
  ['position change', '先頭中間末尾', {...partial('先頭'), x: 12}],
  ['timing change', '先頭中間末尾', {...partial('先頭'), startFrame: 12}],
  ['free color', '先頭中間末尾', {...partial('先頭'), fontColor: '#123456'}],
];

test('invalid partial selectors fail at automatic fixing, human edit, and saved-override resolution', async t => {
  for (const [name, text, selection] of invalidRanges) await t.test(name, () => {
    const f = fixture(text), auto = fix(f), empty = create(f, auto);
    assert.throws(() => fix(f, [effect(ids[0], selection)]), TypeError);
    assert.throws(() => edit(f, auto, empty, ids[0], selection), TypeError);
    assert.throws(() => resolve(f, auto, {...clone(empty), entries: [effect(ids[0], selection)]}), TypeError);
    assert.deepEqual(empty.entries, []);
  });
});

test('partial assignment rejects duplicate, conflicting, and unknown caption IDs', () => {
  const f = fixture(), selected = effect(ids[0], partial('先頭'));
  assert.throws(() => fix(f, [selected, effect(ids[0], partial('末尾'))]), /duplicate or conflicting/);
  assert.throws(() => fix(f, [selected, effect(ids[0], whole())]), /duplicate or conflicting/);
  assert.throws(() => fix(f, [effect('missing', partial('先頭'))]), /outside the judgment target set/);
  const auto = fix(f), empty = create(f, auto);
  assert.throws(() => edit(f, auto, empty, 'missing', partial('先頭')), /unknown override caption ID/);
  assert.throws(() => resolve(f, auto, {...clone(empty), entries: [selected, selected]}), /duplicate override/);
});

test('range replacement is local, idempotent, commutative, and immutable; Reset recovers the saved automatic range', () => {
  const f = fixture(), inputs = clone(f);
  const auto = fix(f, [effect(ids[0], partial('先頭')), effect(ids[1], partial('字幕'))]);
  const originalAuto = clone(auto), empty = create(f, auto), automatic = resolve(f, auto);
  const edited = edit(f, auto, empty, ids[0], partial('末尾'));
  assert.deepEqual(edit(f, auto, edited, ids[0], partial('末尾')), edited);
  const changed = resolve(f, auto, edited);
  assert.deepEqual(changed.plan.elements.slice(1), automatic.plan.elements.slice(1));
  assert.deepEqual(changed.resolution.captions.slice(1), automatic.resolution.captions.slice(1));
  assert.deepEqual(caption(changed).visualState, caption(automatic).visualState);
  assert.deepEqual(state(changed).canonicalRange, {startCodePoint: 4, endCodePointExclusive: 6});
  const ab = edit(f, auto, edited, ids[1], partial('他の'));
  const ba = edit(f, auto, edit(f, auto, empty, ids[1], partial('他の')), ids[0], partial('末尾'));
  assert.deepEqual(ab, ba);
  assert.deepEqual(resolve(f, auto, ab), resolve(f, auto, ba));
  const reset = edit(f, auto, edited, ids[0], 'Reset');
  assert.deepEqual(reset.entries, []);
  assert.deepEqual(resolve(f, auto, reset).plan, automatic.plan);
  assert.deepEqual(state(resolve(f, auto, reset)), state(automatic));
  assert.deepEqual(f, inputs);
  assert.deepEqual(auto, originalAuto);
  assert.deepEqual(empty.entries, []);
  assert.deepEqual(edited.entries, [effect(ids[0], partial('末尾'))]);
});

test('whole to partial to whole replaces the range; Normal and Reset restore their distinct saved states', () => {
  const f = fixture(), auto = fix(f, [effect(ids[0], partial('中間'))]);
  let overrides = create(f, auto);
  overrides = edit(f, auto, overrides, ids[0], whole());
  const firstWhole = resolve(f, auto, overrides);
  assert.deepEqual(caption(firstWhole), {...f.baselinePlan.elements[0],
    presentationColorRange: {startCodePoint: 0, endCodePointExclusive: 6, fontColor: '#FFD65A'}});
  assert.deepEqual(firstWhole.plan,
    resolve(f, auto, edit(f, auto, create(f, auto), ids[0], partial('先頭中間末尾'))).plan);
  assert.deepEqual(state(firstWhole).canonicalRange, {startCodePoint: 0, endCodePointExclusive: 6});
  overrides = edit(f, auto, overrides, ids[0], partial('末尾'));
  assert.equal(caption(resolve(f, auto, overrides)).visualState.textStyle.fontColor, '#FFFDF8');
  overrides = edit(f, auto, overrides, ids[0], whole());
  assert.deepEqual(resolve(f, auto, overrides).plan, firstWhole.plan);
  overrides = edit(f, auto, overrides, ids[0], partial('末尾'));
  overrides = edit(f, auto, overrides, ids[0], 'Normal');
  const normal = resolve(f, auto, overrides);
  assert.deepEqual(caption(normal), f.baselinePlan.elements[0]);
  assert.deepEqual(state(normal), {captionId: ids[0], origin: 'human', role: 'Normal', automaticStatus: 'selected',
    automaticSelection: partial('中間'), effectiveSelection: {role: 'Normal'}, hasOverride: true, canonicalRange: null});
  overrides = edit(f, auto, overrides, ids[0], 'Reset');
  assert.deepEqual(resolve(f, auto, overrides).plan, resolve(f, auto).plan);
});

test('automatic Normal can receive a partial override and Reset returns to automatic Normal', () => {
  const f = fixture(), auto = fix(f), empty = create(f, auto);
  const human = edit(f, auto, empty, ids[0], partial('中間'));
  assert.deepEqual(state(resolve(f, auto, human)).automaticSelection, {role: 'Normal'});
  const reset = edit(f, auto, human, ids[0], 'Reset');
  assert.deepEqual(resolve(f, auto, reset).plan, f.baselinePlan);
  assert.deepEqual(state(resolve(f, auto, reset)), state(resolve(f, auto)));
});

test('human repair keeps unresolved, unrepresentable, and unprocessed automatic states distinguishable', () => {
  const f = fixture(), auto = fix(f, [], {targetCaptionIds: ids.slice(0, 2), exceptions: [
    {captionId: ids[0], status: 'unresolved', reason: 'ambiguous editorial target'},
    {captionId: ids[1], status: 'unrepresentable', reason: 'separated ranges are unsupported'},
  ]});
  let overrides = create(f, auto);
  for (const [id, text] of [[ids[0], '中間'], [ids[1], '字幕'], [ids[2], '通常']]) {
    overrides = edit(f, auto, overrides, id, partial(text));
  }
  const result = resolve(f, auto, overrides);
  assert.deepEqual(result.resolution.captions.map(row => row.automaticStatus), ['unresolved', 'unrepresentable', 'not-processed']);
  for (const row of result.resolution.captions) {
    assert.equal(row.automaticSelection, null);
    assert.equal(row.origin, 'human');
    assert.equal(row.hasOverride, true);
    assert.equal(row.effectiveSelection.scope, 'partial-caption');
  }
  assert.deepEqual(result.resolution.exceptions, auto.proposal.exceptions);
});

test('partial selectors remain bound to baseline, saved proposal, and the current rendering rules', () => {
  const f = fixture(), auto = fix(f, [effect(ids[0], partial('先頭'))]);
  const overrides = edit(f, auto, create(f, auto), ids[0], partial('末尾'));
  const changedBaseline = clone(f.baselinePlan);
  changedBaseline.elements[0].text = '変更された字幕';
  assert.throws(() => resolve({...f, baselinePlan: changedBaseline}, auto, overrides), /baseline content differs/);
  assert.throws(() => resolve(f, fix(f, [effect(ids[0], partial('中間'))]), overrides), /override reference version differs/);
  const oldContext = clone(f.context);
  for (const version of ['auto-presentation-rules-v001', 'auto-presentation-rules-v002']) {
    oldContext.renderingRulesRef.version = version;
    assert.throws(() => resolve({...f, context: oldContext}, auto, overrides), /rendering rules version differs/);
  }
});

const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
async function ioFixture(t, text = '先頭中間末尾') {
  const directory = await mkdtemp(join(tmpdir(), 'zev-partial-presentation-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const baselinePath = join(directory, 'normal.json'), decisionInputPath = join(directory, 'input.json');
  await writeJson(baselinePath, fixture(text).baselinePlan);
  await writeJson(decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: null, text, confirmed: true});
  return {directory, baselinePath, decisionInputPath, autoProposalPath: join(directory, 'auto.json'),
    overridesPath: join(directory, 'override.json'),
    ...await loadAutoPresentationContextV001({baselinePath, decisionInputPath})};
}
const saveAuto = (f, value) => saveFixedAutoPresentationV001({...f, proposal: value, outputPath: f.autoProposalPath});
const saveOverride = (f, overrides, outputPath = f.overridesPath) => saveAutoPresentationOverridesV001({...f, overrides, outputPath});
const read = f => loadAutoPresentationV001(f);
const resolvedRead = loaded => resolveAutoPresentationV001({baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation});

test('partial saved selectors reload exactly, range edits save separately, and Reset preserves source bytes', async t => {
  const f = await ioFixture(t, '同じ、同じ。');
  const originalBaseline = await readFile(f.baselinePath), originalInput = await readFile(f.decisionInputPath);
  const auto = await saveAuto(f, proposal(f, [effect(ids[0], partial('同じ', 2))]));
  const originalAuto = await readFile(f.autoProposalPath);
  const override = edit(f, auto, create(f, auto), ids[0], partial('同じ', 1));
  await saveOverride(f, override);
  const originalOverride = await readFile(f.overridesPath);
  const loaded = await read(f);
  assert.deepEqual(loaded.autoPresentation.autoProposal, auto);
  assert.deepEqual(loaded.autoPresentation.overrides, override);
  assert.deepEqual(state(resolvedRead(loaded)).canonicalRange, {startCodePoint: 0, endCodePointExclusive: 2});
  const reset = edit(f, auto, loaded.autoPresentation.overrides, ids[0], 'Reset');
  const resetPath = join(f.directory, 'reset.json');
  await saveOverride(f, reset, resetPath);
  const restored = resolvedRead(await read({...f, overridesPath: resetPath}));
  assert.deepEqual(restored.plan, resolve(f, auto).plan);
  assert.deepEqual(state(restored).canonicalRange, {startCodePoint: 3, endCodePointExclusive: 5});
  assert.deepEqual(await readFile(f.baselinePath), originalBaseline);
  assert.deepEqual(await readFile(f.decisionInputPath), originalInput);
  assert.deepEqual(await readFile(f.autoProposalPath), originalAuto);
  assert.deepEqual(await readFile(f.overridesPath), originalOverride);
});

test('native color glyph selection remains saved Focus through mixed-range edit, Normal, and Reset', async t => {
  const f = await ioFixture(t, '前成功😀後');
  const auto = await saveAuto(f, proposal(f, [effect(ids[0], partial('😀'))]));
  const originalAuto = await readFile(f.autoProposalPath);
  const original = resolvedRead(await read({...f, overridesPath: undefined}));
  assert.deepEqual(state(original).effectiveSelection, partial('😀'));
  assert.deepEqual(state(original).canonicalRange, {startCodePoint: 3, endCodePointExclusive: 4});
  let override = edit(f, auto, create(f, auto), ids[0], partial('成功😀'));
  await saveOverride(f, override);
  const mixed = resolvedRead(await read(f));
  assert.deepEqual(state(mixed).effectiveSelection, partial('成功😀'));
  assert.deepEqual(state(mixed).canonicalRange, {startCodePoint: 1, endCodePointExclusive: 4});
  override = edit(f, auto, override, ids[0], 'Normal');
  const normalPath = join(f.directory, 'normal-override.json');
  await saveOverride(f, override, normalPath);
  assert.deepEqual(resolvedRead(await read({...f, overridesPath: normalPath})).plan, f.baselinePlan);
  override = edit(f, auto, override, ids[0], 'Reset');
  const resetPath = join(f.directory, 'reset-override.json');
  await saveOverride(f, override, resetPath);
  const restored = resolvedRead(await read({...f, overridesPath: resetPath}));
  assert.deepEqual(restored.plan, original.plan);
  assert.deepEqual(state(restored).effectiveSelection, partial('😀'));
  assert.equal(state(restored).hasOverride, false);
  assert.deepEqual(await readFile(f.autoProposalPath), originalAuto);
});

test('invalid partial automatic and human documents create no completed output file', async t => {
  for (const [name, text, selection] of invalidRanges) await t.test(name, async child => {
    const f = await ioFixture(child, text);
    await assert.rejects(saveAuto(f, proposal(f, [effect(ids[0], selection)])), TypeError);
    await assert.rejects(readFile(f.autoProposalPath), {code: 'ENOENT'});
    const auto = await saveAuto(f, proposal(f));
    const invalid = {...clone(create(f, auto)), entries: [effect(ids[0], selection)]};
    await assert.rejects(saveOverride(f, invalid), TypeError);
    await assert.rejects(readFile(f.overridesPath), {code: 'ENOENT'});
    assert.deepEqual(JSON.parse(await readFile(f.autoProposalPath, 'utf8')), auto);
  });
});

test('reload rejects a recomputed invalid partial proposal and a directly edited invalid override', async t => {
  const f = await ioFixture(t, '同じ、同じ。');
  const auto = await saveAuto(f, proposal(f, [effect(ids[0], partial('同じ', 2))]));
  await saveOverride(f, create(f, auto));
  const tampered = clone(auto);
  delete tampered.proposal.effects[0].occurrence;
  tampered.proposalSha256 = sha256AutoPresentationStateV001(tampered.proposal);
  await writeJson(f.autoProposalPath, tampered);
  await assert.rejects(read(f), /ambiguous without occurrence/);
  await writeJson(f.autoProposalPath, auto);
  await writeJson(f.overridesPath, {...clone(create(f, auto)), entries: [effect(ids[0], partial('同じ', 3))]});
  await assert.rejects(read(f), /occurrence was not found/);
});
