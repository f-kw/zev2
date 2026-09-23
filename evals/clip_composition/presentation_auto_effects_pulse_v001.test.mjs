import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {AUTO_PRESENTATION_RULES_REF_V008, sha256AutoPresentationV001, sha256AutoPresentationStateV001,
  fixAutoPresentationProposalV001, createAutoPresentationOverridesV001,
  editAutoPresentationOverrideV001, resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {loadAutoPresentationContextV001, saveFixedAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';
import {resolvePresentationPulseTimingV001, buildPresentationPulseStateElementsV001,
  assertPresentationPulseAnchorsV001} from './presentation_pulse_v001.mjs';

const clone = value => structuredClone(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const ref = name => ({path: `/fixture/${name}`, fileSha256: hash(name)});
const pulse = (anchorPeakId = 'central') => ({role: 'Pulse accent', presentation: 'provisional-pulse', scope: 'whole-caption', anchorPeakId});
function fixture() {
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas: {width: 1920, height: 1080, fps: 30},
    provenance: {retainedRanges: [[300, 900]], prospectIds: ['kept']}, elements: ['a', 'b'].map((instructionId, index) => ({
      instructionId, kind: 'speech-caption', text: '本文\nそのまま', indexedLines: [{lineIndex: 0, text: '本文'}, {lineIndex: 1, text: 'そのまま'}],
      startFrame: index * 90, endFrameExclusive: (index + 1) * 90, displayFrameCount: 90,
      sourceMapping: {startMs: 10000 + index * 3000, endMs: 13000 + index * 3000},
      visualState: {textStyle: {fontSizePx: 96, fontColor: '#FFFDF8'}, position: {preset: 'bottom-center'}}}))};
  const peaks = [['early', 10], ['central', 450], ['end', 900], ['other', 1200]].map(([peakId, peakSample]) => ({
    peakId, startSample: peakSample, endSampleExclusive: peakSample + 1, peakSample}));
  const context = {baselineRef: {...ref('baseline'), canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: ref('decision'), renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V008,
    pulseTimingEvidence: {schemaVersion: 'auto-presentation-pulse-timing-v001', sourceRef: ref('source'),
      candidatesRef: ref('candidates'), peaksRef: ref('peaks'), sampleRate: 300, sampleCount: 1800,
      candidates: [{candidateId: 'native-union', peakIds: peaks.map(row => row.peakId)}], peaks}};
  return {baselinePlan, context};
}
const proposal = (f, selection = pulse()) => ({schemaVersion: 'auto-presentation-proposal-v001', context: clone(f.context),
  targetCaptionIds: ['a', 'b'], completion: 'complete', effects: [{captionId: 'a', ...selection}], exceptions: []});
const fix = (f, selection) => fixAutoPresentationProposalV001({...f, proposal: proposal(f, selection)});

test('Pulse changes only finite metadata; all expressions and Normal Reset restore the fixed anchor', () => {
  const f = fixture(), before = clone(f), autoProposal = fix(f), args = {...f, autoProposal};
  const automatic = resolveAutoPresentationV001(args);
  const expected = clone(f.baselinePlan);
  expected.elements[0].presentationPulse = {presentation: 'provisional-pulse', anchorPeakId: 'central', anchorFrame: 45};
  assert.deepEqual(automatic.plan, expected);
  for (const selection of ['Normal', {role: 'Focus', presentation: 'provisional-focus', scope: 'partial-caption', targetText: '本文'},
    {role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption'},
    {role: 'Panel accent', presentation: 'provisional-panel', scope: 'whole-caption'}]) {
    const empty = createAutoPresentationOverridesV001(args);
    const changed = editAutoPresentationOverrideV001({...args, overrides: empty, captionId: 'a', selection});
    assert.equal(Object.hasOwn(resolveAutoPresentationV001({...args, overrides: changed}).plan.elements[0], 'presentationPulse'), false);
    const reset = editAutoPresentationOverrideV001({...args, overrides: changed, captionId: 'a', selection: 'Reset'});
    assert.deepEqual(resolveAutoPresentationV001({...args, overrides: reset}).plan, automatic.plan);
  }
  assert.deepEqual(f, before);
  const states = buildPresentationPulseStateElementsV001({element: expected.elements[0], canvas: expected.canvas});
  assert.deepEqual(states.map(row => row.element.visualState.textStyle.fontSizePx), [96, 112, 128, 104, 120]);
  for (const {element} of states) {
    const restored = clone(element); restored.visualState.textStyle.fontSizePx = 96;
    assert.deepEqual(restored, f.baselinePlan.elements[0]);
  }
});

test('unknown, outside, end-boundary and early peaks are rejected at fix and human edit', async t => {
  for (const id of ['missing', 'other', 'end', 'early']) await t.test(id, () => {
    const f = fixture(); assert.throws(() => fix(f, pulse(id)), TypeError);
    const args = {...f, autoProposal: fix(f)};
    assert.throws(() => editAutoPresentationOverrideV001({...args, overrides: createAutoPresentationOverridesV001(args),
      captionId: 'a', selection: pulse(id)}), TypeError);
  });
});
test('Pulse rejects missing evidence and arbitrary rendering fields at the saved boundary', async t => {
  for (const [name, value] of Object.entries({scale: 2, anchorFrame: 45, startFrame: 40, endFrame: 50,
    easing: 'ease', keyframes: [], x: 0, color: '#FFF', filter: 'scale=2', targetText: '本文', occurrence: 1})) {
    await t.test(name, () => assert.throws(() => fix(fixture(), {...pulse(), [name]: value}), TypeError));
  }
  const f = fixture(); f.context.pulseTimingEvidence = null;
  assert.throws(() => fix(f), /missing or unknown/);
  const missing = pulse(); delete missing.anchorPeakId;
  assert.throws(() => fix(fixture(), missing), TypeError);
});
test('timing uses exact measured samples and rejects clipping instead of moving the anchor', () => {
  const f = fixture(), element = f.baselinePlan.elements[0], canvas = f.baselinePlan.canvas;
  const run = peakSample => resolvePresentationPulseTimingV001({element, canvas, sampleRate: 300, peakSample});
  assert.equal(run(459).anchorFrame, 45);
  assert.equal(run(80).normalBeforeFrame, 3);
  assert.equal(run(800).normalAfterFrame, 86);
  for (const sample of [79, 810, 899, 900, -1, 1.5]) assert.throws(() => run(sample), TypeError);
  assert.deepEqual(run(450).segments, [{state: 'normal', startFrame: 0, endFrameExclusive: 41},
    {state: 'between-normal-middle', startFrame: 41, endFrameExclusive: 42},
    {state: 'middle', startFrame: 42, endFrameExclusive: 43},
    {state: 'between-middle-maximum', startFrame: 43, endFrameExclusive: 44},
    {state: 'maximum', startFrame: 44, endFrameExclusive: 48},
    {state: 'between-middle-maximum', startFrame: 48, endFrameExclusive: 49},
    {state: 'middle', startFrame: 49, endFrameExclusive: 50},
    {state: 'between-normal-middle', startFrame: 50, endFrameExclusive: 51},
    {state: 'normal', startFrame: 51, endFrameExclusive: 90}]);
  const layouts = [96, 112, 128, 104, 120].map(size => ({wrapper: {left: 100 - size / 2, top: 500 - size, width: size, height: size}}));
  assert.doesNotThrow(() => assertPresentationPulseAnchorsV001(layouts));
  layouts[2].wrapper.left += 1;
  assert.throws(() => assertPresentationPulseAnchorsV001(layouts), /anchor/);
});
test('timing identity includes all samples, preserves relocation and rejects old contexts', () => {
  const f = fixture(), p = proposal(f), originalHash = sha256AutoPresentationStateV001(p);
  p.context.pulseTimingEvidence.sourceRef.path = '/moved/source';
  assert.equal(sha256AutoPresentationStateV001(p), originalHash);
  p.context.pulseTimingEvidence.peaks[1].peakSample += 1;
  p.context.pulseTimingEvidence.peaks[1].endSampleExclusive += 1;
  assert.notEqual(sha256AutoPresentationStateV001(p), originalHash);
  assert.throws(() => fixAutoPresentationProposalV001({...f, proposal: p}), /reference version/);
  const old = fixture(); delete old.context.pulseTimingEvidence;
  assert.throws(() => resolveAutoPresentationV001(old), /invalid context/);
  const reused = fixture(); reused.baselinePlan.elements[0].presentationPulse = {presentation: 'provisional-pulse'};
  reused.context.baselineRef.canonicalSha256 = sha256AutoPresentationV001(reused.baselinePlan);
  assert.throws(() => resolveAutoPresentationV001(reused), /fixed normal/);
});

async function nativeFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'zev-pulse-bound-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const write = async (name, value) => {const path = join(directory, name); const bytes = Buffer.from(typeof value === 'string' ? value : `${JSON.stringify(value)}\n`);
    await writeFile(path, bytes); return {path, bytes: bytes.length, sha256: hash(bytes)};};
  const f = fixture(), source = await write('synthetic-source.bin', 'explicit synthetic timing-only source');
  const rows = f.context.pulseTimingEvidence.peaks.map(({peakId, ...row}) => ({id: peakId, ...row, qualifies: true}));
  const peaks = await write('acoustic-peaks.json', {schemaVersion: 'presentation-vocal-audio-measurements-v001', source,
    sampleRate: 300, sampleCount: 1800, rows});
  const candidates = await write('candidates.json', {schemaVersion: 'presentation-vocal-audio-candidates-v001', source,
    sampleRate: 300, sampleCount: 1800, candidateCount: 1, measurementEvidence: [peaks],
    candidates: [{id: 'native-union', peakSample: 1200, constituentPeakIds: rows.map(row => row.id)}]});
  const evidence = f.context.pulseTimingEvidence;
  for (const [key, native] of [['sourceRef', source], ['candidatesRef', candidates], ['peaksRef', peaks]]) {
    evidence[key] = {path: native.path, fileSha256: native.sha256};
  }
  const baselinePath = (await write('normal.json', f.baselinePlan)).path;
  const decision = {schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: evidence};
  const decisionInputPath = (await write('decision.json', decision)).path;
  return {baselinePath, decisionInputPath, decision, write, source, candidates, peaks, directory};
}
test('native IO derives each constituent time rather than the union representative', async t => {
  const f = await nativeFixture(t), loaded = await loadAutoPresentationContextV001(f);
  assert.equal(loaded.context.pulseTimingEvidence.peaks.find(row => row.peakId === 'central').peakSample, 450);
  const fixed = fix(loaded);
  assert.equal(resolveAutoPresentationV001({...loaded, autoProposal: fixed}).plan.elements[0].presentationPulse.anchorFrame, 45);
});
test('native source changes and fabricated embedded times fail before saving', async t => {
  for (const target of ['source', 'candidates', 'peaks', 'embedded']) await t.test(target, async child => {
    const f = await nativeFixture(child), loaded = await loadAutoPresentationContextV001(f);
    if (target === 'embedded') {
      f.decision.pulseTimingEvidence.peaks[1].peakSample = 600;
      f.decision.pulseTimingEvidence.peaks[1].endSampleExclusive = 601;
      await f.write('decision.json', f.decision);
    } else await writeFile(f[target].path, Buffer.concat([await readFile(f[target].path), Buffer.from('\n')]));
    const outputPath = join(f.directory, 'must-not-exist.json');
    await assert.rejects(saveFixedAutoPresentationV001({...f, proposal: proposal(loaded), outputPath}), TypeError);
    await assert.rejects(readFile(outputPath), {code: 'ENOENT'});
  });
});
