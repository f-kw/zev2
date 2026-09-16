import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {executePresentationFocusSelectionV001, buildPresentationFocusSelectionInputV001}
  from './presentation_focus_selection_v001.mts';
import {loadAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001, createAutoPresentationOverridesV001, editAutoPresentationOverrideV001}
  from './presentation_auto_effects_v001.mjs';
const json = (v: any) => `${JSON.stringify(v, null, 2)}\n`;
const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
async function fixture(t: any) {
  const dir = await mkdtemp(path.join(tmpdir(), 'zev-focus-selection-test-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30}, provenance: {fixed: 'original-source'},
    elements: ['必ず勝つとは限らない', 'はいはい', 'A😀猫', '別の場面'].map((text, i) => ({
      instructionId: `c-${i + 1}`, kind: 'speech-caption', text, startFrame: i * 90,
      endFrameExclusive: (i + 1) * 90, sourceMapping: {fixed: `source-${i}`},
      indexedLines: [{lineIndex: 0, text}], visualState: {textStyle: {fontColor: '#FFFDF8', fontSizePx: 94}}}))};
  const context = {digestId: 'saved-digest', productionPurpose: null,
    contexts: [{contextId: 'a', description: '条件を伴う結論'}, {contextId: 'b', description: '別の場面'}],
    captionContextIds: plan.elements.map((c, i) => ({captionId: c.instructionId, contextId: i < 3 ? 'a' : 'b'})),
    observations: [{observationId: 'no-caption-audio', kind: 'audio', captionIds: [], description: '無字幕区間の独立観測'}]};
  const baselinePath = path.join(dir, 'baseline.json'), contextPath = path.join(dir, 'context.json');
  await writeFile(baselinePath, json(plan)); await writeFile(contextPath, json(context));
  const answer = {status: 'complete', summary: '構造検証用の明示fixture。自動判断の評価には使わない。', decisions: [
    {captionId: 'c-1', role: 'Focus', decision: 'selected', reason: '否定条件を含む核', evidenceCaptionIds: ['c-1'],
      additionalObservation: null, selection: {scope: 'partial-caption', targetText: '勝つとは限らない'}},
    {captionId: 'c-2', role: 'Normal', decision: 'normal', reason: '相づち', evidenceCaptionIds: ['c-1', 'c-2'], additionalObservation: null},
    {captionId: 'c-3', role: 'Focus', decision: 'unrepresentable', reason: '離れた対象を同時に選べない', evidenceCaptionIds: ['c-3'], additionalObservation: null},
    {captionId: 'c-4', role: 'Vocal accent', decision: 'unresolved', reason: '声の様態は未観測', evidenceCaptionIds: ['c-4'],
      additionalObservation: {kind: 'audio', question: '声の勢いが意味の山を作るか'}}]};
  const response = (request: any) => ({schemaVersion: 'presentation-focus-selection-response-v001',
    requestFileSha256: sha(json(request)), answer: structuredClone(answer), judgmentNote: 'Explicit synthetic test only.'});
  return {dir, plan, context, baselinePath, contextPath, answer, response};
}

test('full judgment saves existing fixed format, preserves the entire normal plan, and survives Normal/Reset', async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  const result = await executePresentationFocusSelectionV001({...f, outputDirectory, judge: async request => {
    assert.deepEqual(request.input.captions.map((c: any) => c.text), f.plan.elements.map(c => c.text));
    assert.equal(request.input.observations[0].captionIds.length, 0);
    return f.response(request);
  }});
  assert.deepEqual(result.counts, {normal: 1, selected: 1, unrepresentable: 1, unresolved: 1});
  assert.equal(result.automaticSelectionQuality, 'not-evaluated');
  const loaded = await loadAutoPresentationV001({baselinePath: f.baselinePath,
    decisionInputPath: path.join(outputDirectory, 'decision-input.json'), autoProposalPath: path.join(outputDirectory, 'fixed-auto.json')});
  const args = {baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation};
  const automatic = resolveAutoPresentationV001(args);
  assert.equal(automatic.resolution.automaticStatus, 'complete-with-exceptions');
  assert.deepEqual(automatic.plan.elements.map(({presentationColorRange: _unused, ...e}: any) => e), f.plan.elements);
  const empty = createAutoPresentationOverridesV001(args);
  const normal = editAutoPresentationOverrideV001({...args, overrides: empty, captionId: 'c-1', selection: 'Normal'});
  assert.deepEqual(resolveAutoPresentationV001({...args, overrides: normal}).plan, f.plan);
  const reset = editAutoPresentationOverrideV001({...args, overrides: normal, captionId: 'c-1', selection: 'Reset'});
  assert.deepEqual(resolveAutoPresentationV001({...args, overrides: reset}).plan, automatic.plan);
  assert.equal(await readFile(f.baselinePath, 'utf8'), json(f.plan));
  await assert.rejects(executePresentationFocusSelectionV001({...f, outputDirectory, judge: async () => {throw Error('must not run');}}), {code: 'EEXIST'});
});

for (const [name, mutate] of Object.entries({
  missing: (r: any) => r.answer.decisions.pop(),
  reordered: (r: any) => r.answer.decisions.reverse(),
  duplicate: (r: any) => r.answer.decisions[1] = r.answer.decisions[0],
  inventedEvidence: (r: any) => r.answer.decisions[0].evidenceCaptionIds = ['unknown-caption'],
  drawingValue: (r: any) => r.answer.decisions[0].selection.fontSizePx = 128,
  vocalSelected: (r: any) => r.answer.decisions[0].role = 'Vocal accent',
  unknownText: (r: any) => r.answer.decisions[0].selection.targetText = '必ず勝つ。',
  ambiguous: (r: any) => r.answer.decisions[1] = {...r.answer.decisions[0], captionId: 'c-2', selection: {scope: 'partial-caption', targetText: 'はい'}},
  graphemeCut: (r: any) => r.answer.decisions[2] = {...r.answer.decisions[0], captionId: 'c-3', selection: {scope: 'partial-caption', targetText: '\ud83d'}},
  oldRequest: (r: any) => r.requestFileSha256 = '0'.repeat(64),
  abstained: (r: any) => r.answer = {status: 'abstained', reason: '入力が不十分'},
})) test(`invalid ${name} never creates a fixed automatic proposal`, async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  await assert.rejects(executePresentationFocusSelectionV001({...f, outputDirectory, judge: async request => {
    const r = f.response(request); mutate(r); return r;
  }}));
  assert.equal((await readdir(outputDirectory)).includes('fixed-auto.json'), false);
  assert.equal((await read(path.join(outputDirectory, 'rejection.json'))).status, 'rejected');
  assert.equal(await readFile(f.baselinePath, 'utf8'), json(f.plan));
});

for (const target of ['baselinePath', 'contextPath'] as const) test(`changed ${target} during judgment cannot be rebound`, async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  await assert.rejects(executePresentationFocusSelectionV001({...f, outputDirectory, judge: async request => {
    await writeFile(f[target], '{}\n'); return f.response(request);
  }}), /SOURCE_CHANGED/);
  assert.equal((await readdir(outputDirectory)).includes('fixed-auto.json'), false);
});

test('completed all-Normal is structural success without claiming semantic success', async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  const result = await executePresentationFocusSelectionV001({...f, outputDirectory, judge: async request => {
    const r = f.response(request); r.answer.decisions = r.answer.decisions.map((d: any) => ({
      captionId: d.captionId, role: 'Normal', decision: 'normal', reason: '技術fixtureの通常指定',
      evidenceCaptionIds: [d.captionId], additionalObservation: null})); return r;
  }});
  assert.equal(result.counts.normal, 4); assert.equal(result.normalOnlyIsQualitySuccess, false);
  assert.equal(result.automaticSelectionQuality, 'not-evaluated');
});

test('the judgment callback cannot change the saved request and rebind its response', async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  await assert.rejects(executePresentationFocusSelectionV001({...f, outputDirectory, judge: async request => {
    request.input.captions[0].text = '勝つとは限らないという条件は省略してよい';
    request.inputCanonicalSha256 = '0'.repeat(64);
    return f.response(request);
  }}), /RESPONSE_BINDING_CHANGED/);
  assert.equal((await readdir(outputDirectory)).includes('fixed-auto.json'), false);
  const saved = await read(path.join(outputDirectory, 'request.json'));
  assert.equal(saved.input.captions[0].text, f.plan.elements[0].text);
});

test('the saved request bytes cannot change while an unchanged request is answered', async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  await assert.rejects(executePresentationFocusSelectionV001({...f, outputDirectory, judge: async request => {
    await writeFile(path.join(outputDirectory, 'request.json'), '{}\n');
    return f.response(request);
  }}), /SOURCE_CHANGED/);
  assert.equal((await readdir(outputDirectory)).includes('fixed-auto.json'), false);
});

test('context cannot replace caption order or a previously resolved normal baseline', async t => {
  const f = await fixture(t);
  f.context.captionContextIds.reverse();
  assert.throws(() => buildPresentationFocusSelectionInputV001(f.plan, f.context), /MEMBERSHIP_CHANGED/);
  f.context.captionContextIds.reverse();
  (f.plan.elements[0] as any).presentationColorRange = {startCodePoint: 0, endCodePointExclusive: 1, fontColor: '#FFF000'};
  assert.throws(() => buildPresentationFocusSelectionInputV001(f.plan, f.context), /NORMAL_BASELINE/);
});
