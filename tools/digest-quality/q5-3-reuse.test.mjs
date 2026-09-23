import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadQ53CatalogV001} from './q5-3-store.mjs';
import {resolveQ53EditPlanV001, projectQ53ComparisonRangeV001} from './q5-3-edit-plan.mjs';
import {assertQ53LocalContentIdentityV001, buildQ53ReuseBindingsV001, restoreQ53ReuseBindingsV001} from './q5-3-reuse.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalogPath = path.join(repo, 'docs/reports/digest-quality-q5-3-20260921-v001/fixed-catalog-v001.json');
const outputParent = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q5-3-20260921-v001');
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
const clone = structuredClone;
const bound = async file => {
  const bytes = await readFile(file);
  return {path: file, bytes: bytes.length, fileSha256: createHash('sha256').update(bytes).digest('hex')};
};
const saveNew = async (file, value) => {
  await writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  return bound(file);
};
let contextPromise, outputPromise;
function context() {
  contextPromise ??= (async () => {
    const catalog = await parse(catalogPath), {source} = await loadQ53CatalogV001(catalog);
    const resolved = resolveQ53EditPlanV001({source, selection: {omit: true, add: true}});
    const comparisons = {};
    for (const key of ['omit', 'add']) comparisons[key] = {
      projection: projectQ53ComparisonRangeV001({source, resolved, candidateId: source.candidateIdentity[key].candidateId}),
      priorComparison: await parse(catalog.candidates[key].comparisonRef.path),
    };
    return {catalog, source, resolved, comparisons};
  })();
  return contextPromise;
}
async function directory(label) {
  outputPromise ??= (async () => {
    await mkdir(outputParent, {recursive: true});
    const root = await mkdtemp(path.join(outputParent, 'reuse-tests-'));
    console.log('Q5-3 reuse-boundary evidence: ' + root); return root;
  })();
  const result = path.join(await outputPromise, label); await mkdir(result); return result;
}
async function snapshot(label, selection) {
  const {catalog, source} = await context(), root = await directory(label);
  const resolved = resolveQ53EditPlanV001({source, selection});
  const savedSelection = {schemaVersion: 'q5-3-selection-state-v001',
    sourceIdentitySha256: source.sourceIdentitySha256, candidateIdentitySha256: source.candidateIdentitySha256,
    selection, selectionProvenance: Object.fromEntries(['omit', 'add'].map(key => [key,
      {kind: 'technical-fixture', statement: 'Explicit development verification only; no human adoption.'}])),
    saveId: randomUUID(), savedAt: new Date().toISOString(), resolutionSha256: resolved.resolutionSha256};
  const selectionRef = await saveNew(path.join(root, 'selection.json'), savedSelection);
  const resolvedRef = await saveNew(path.join(root, 'resolved.json'), resolved);
  const completionRefs = Object.fromEntries(['omit', 'add'].map(key => [key,
    {completionRef: catalog.candidates[key].completionRef, normalCompletionRef: catalog.candidates[key].normalCompletionRef}]));
  return {root, savedSelection, input: {source, resolved, selectionRef, resolvedRef, completionRefs}};
}

test('both fixed short clips preserve local captions, source pieces and audio while the introduction moves globally', async () => {
  const {comparisons} = await context();
  for (const [key, pair] of Object.entries(comparisons)) {
    const identity = assertQ53LocalContentIdentityV001(pair);
    assert.equal(identity.frameCount, key === 'omit' ? 763 : 624);
    assert.equal(identity.captionCount, key === 'omit' ? 5 : 6);
    assert.equal(identity.playback.sampleCount, key === 'omit' ? 1220800 : 998400);
    assert.equal(identity.playback.sampleRate, 48000); assert.equal(identity.playback.channels, 2);
    assert.deepEqual(identity.localRange, {startFrame: 0, endFrameExclusive: identity.frameCount});
    assert.equal(identity.localPieces.length, 2);
  }
  assert.deepEqual(comparisons.add.priorComparison.afterGlobalRange, {startFrame: 18578, endFrameExclusive: 19202});
  assert.deepEqual(comparisons.add.projection.newGlobalRange, {startFrame: 18519, endFrameExclusive: 19143});
  assert.equal(comparisons.add.projection.normalPlan.elements[0].startFrame, 0);
  assert.equal(comparisons.add.projection.normalPlan.elements[3].startFrame, 345);
});

test('changed caption text, wrapping, provenance, appearance and fade phase all prevent reuse', async () => {
  const {comparisons} = await context();
  const changes = [
    plan => {plan.elements[0].text += '変更';},
    plan => {plan.elements[0].indexedLines[0].characters[0].sourceIndex += 1;},
    plan => {plan.elements[0].targetProvenance.sourceAtomIds.reverse();},
    plan => {plan.elements[0].visualState.textStyle.fontSizePx += 1;},
    plan => {plan.elements[0].transition.entry.frames += 1;},
    plan => {plan.elements[0].startFrame += 1;},
    plan => {plan.canvas.width += 2;},
  ];
  for (const pair of Object.values(comparisons)) for (const change of changes) {
    const projection = clone(pair.projection); change(projection.normalPlan);
    assert.throws(() => assertQ53LocalContentIdentityV001({...pair, projection}), /local caption payload or phase differs/);
  }
});

test('source byte changes, equal-duration source shifts, piece reorder and local audio shifts prevent reuse', async () => {
  const {comparisons} = await context();
  const shift = range => {range.startFrame += 1; range.endFrameExclusive += 1;};
  const shiftSamples = range => {range.startSample += 1600; range.endSampleExclusive += 1600;};
  const changes = [
    pieces => {pieces[0].mediaRef.fileSha256 = 'f'.repeat(64);},
    pieces => {shift(pieces[0].sourceVideoRange); shiftSamples(pieces[0].playback.sourceVideoRange);},
    pieces => {shift(pieces[1].originalDigestRange); shiftSamples(pieces[1].playback.originalDigestRange);},
    pieces => {pieces.reverse();},
    pieces => {pieces[0].playback.outputRange.startSample += 1;},
    pieces => {pieces[0].playback.sampleRate = 16000;},
    pieces => {pieces[0].playback.channels = 1;},
  ];
  for (const pair of Object.values(comparisons)) for (const change of changes) {
    const projection = clone(pair.projection); change(projection.physicalPieces);
    assert.throws(() => assertQ53LocalContentIdentityV001({...pair, projection}), {name: 'AssertionError'});
  }
});

test('a different comparison window or local duration cannot borrow the accepted short artifact', async () => {
  const {comparisons} = await context();
  const changes = [
    projection => {projection.beforeRange.startFrame += 1;},
    projection => {projection.afterRange.startFrame += 1;},
    projection => {projection.frameCount += 1;},
    projection => {projection.newGlobalRange.endFrameExclusive += 1;},
    projection => {projection.physicalPieces[1].outputRange.startFrame += 1;},
  ];
  for (const pair of Object.values(comparisons)) for (const change of changes) {
    const projection = clone(pair.projection); change(projection);
    assert.throws(() => assertQ53LocalContentIdentityV001({...pair, projection}), {name: 'AssertionError'});
  }
});

test('disabled selection reads no old media and a changed binding or stale saved content is rejected', async () => {
  const fixture = await snapshot('disabled-and-stale', {omit: false, add: false});
  const input = {...fixture.input, completionRefs: {}};
  const saved = await buildQ53ReuseBindingsV001(input);
  assert.deepEqual(saved.bindings, []); assert.equal(saved.drawingRulesRef, null);
  assert.equal(saved.checkedFileRefs.length, 2); assert.equal(saved.newMediaCount, 0);
  assert.equal(saved.mediaQcExecutions, 0); assert.equal(saved.contentEditsAdopted, false);
  assert.deepEqual(await restoreQ53ReuseBindingsV001({saved, ...input}), saved);
  const changed = clone(saved); changed.newMediaCount = 1;
  await assert.rejects(restoreQ53ReuseBindingsV001({saved: changed, ...input}), /does not exactly match/);
  const active = resolveQ53EditPlanV001({source: input.source, selection: {omit: true, add: false}});
  const wrongRef = await saveNew(path.join(fixture.root, 'different-resolved.json'), active);
  await assert.rejects(buildQ53ReuseBindingsV001({...input, resolvedRef: wrongRef}), /saved resolved content is stale or different/);
  const selected = clone(fixture.savedSelection); selected.selection.add = true;
  const staleSelectionRef = await saveNew(path.join(fixture.root, 'stale-selection.json'), selected);
  await assert.rejects(buildQ53ReuseBindingsV001({...input, selectionRef: staleSelectionRef}), /saved selection is stale or different/);
  const human = clone(fixture.savedSelection); human.selectionProvenance.add.kind = 'both_usable';
  const humanRef = await saveNew(path.join(fixture.root, 'human-answer-as-selection.json'), human);
  await assert.rejects(buildQ53ReuseBindingsV001({...input, selectionRef: humanRef}), /human adoption is not a technical selection/);
  await saveNew(path.join(fixture.root, 'verified-empty-bindings.json'), saved);
});

test('historical frame, audio, media and native-replay evidence must agree before any existing clip is reused', async () => {
  const fixture = await snapshot('historical-proof-rejection', {omit: true, add: false});
  const old = await parse(fixture.input.completionRefs.omit.completionRef.path);
  const changes = [
    ['frame-count', record => {record.expectedFrameCount -= 1;}],
    ['audio-rate', record => {record.baseAudio.sampleRate = 16000;}],
    ['audio-priming', record => {record.baseAudio.primingSkipSamples = 0;}],
    ['qc-media', record => {record.finalQc.currentCompletedMediaRef.fileSha256 = 'f'.repeat(64);} ],
    ['replay-plan', record => {record.completedFrameQc.evidence.exactReplay.planCanonicalSha256 = 'f'.repeat(64);} ],
    ['replay-frame-count', record => {record.completedFrameQc.evidence.exactReplay.expectedFrameCount -= 1;}],
  ];
  for (const [label, change] of changes) {
    const record = clone(old); change(record);
    const completionRef = await saveNew(path.join(fixture.root, label + '.json'), record);
    const completionRefs = {...fixture.input.completionRefs,
      omit: {...fixture.input.completionRefs.omit, completionRef}};
    await assert.rejects(buildQ53ReuseBindingsV001({...fixture.input, completionRefs}), {name: 'AssertionError'});
  }
});
