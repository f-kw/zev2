import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fixture} from '../../evals/clip_composition/presentation_orchestration_v001.test.mjs';
import {sha256AutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001,
  fixOrchestrationJudgmentV001, editOrchestrationOverrideV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {checkQ4StateFileTransitions, checkQ4SavedState} from './q4-state-check.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const qualityRoot = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q4-20260920-v001');
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const names = ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides', 'selectionRecord'];

async function packageFixture(t, {panel = true, otherOverrides = false} = {}) {
  const base = await mkdtemp(path.join(qualityRoot, 'state-check-fixture-'));
  t.after(() => rm(base, {recursive: true, force: true}));
  const directory = path.join(base, 'original'); await mkdir(directory);
  const f = fixture({sampleRate: 48000}), source = structuredClone(f.source);
  const plan = JSON.parse(source.planBytes);
  for (const element of plan.elements) element.visualState.textStyle.fontSizePx = 94;
  source.planBytes = json(plan); source.planRef.fileSha256 = hash(source.planBytes);
  source.captionContext.baselineRef.fileSha256 = source.planRef.fileSha256;
  source.captionContext.baselineRef.canonicalSha256 = sha256AutoPresentationV001(plan);
  const context = createOrchestrationContextV001(source);
  const evidence = structuredClone(f.evidence);
  for (const row of evidence.captions) row.eligiblePulsePeakIds = [];
  const input = createOrchestrationJudgmentInputV001({context, evidence, connectionPolicy: 'preserve-normal-cut'});
  const reply = structuredClone(f.reply); reply.inputSha256 = input.inputSha256;
  for (const row of reply.captions) Object.assign(row, {semanticRole: panel ? 'focus' : 'normal',
    allowedPresets: panel ? [{preset: 'panel', allowedBackgroundPresets: ['graph-paper']}] : [{preset: 'normal'}]});
  for (const row of reply.connections) Object.assign(row, {semanticRole: 'continuation', allowedPresets: ['normal-cut']});
  const raw = json(reply);
  let state = fixOrchestrationJudgmentV001({context, input, replyBytes: raw});
  if (otherOverrides) {
    state = editOrchestrationOverrideV001({context, state, kind: 'caption', itemId: 'caption-3', selection: 'Normal'});
    state = editOrchestrationOverrideV001({context, state, kind: 'connection', itemId: 'connection-01', selection: 'Normal'});
  }
  const values = {'source-bindings.json': json(source), 'judgment-input.json': json(input), 'judgment-reply.raw.json': raw,
    ...Object.fromEntries(names.map(name => [name + '.json', json(state[name])]))};
  for (const [name, value] of Object.entries(values)) await writeFile(path.join(directory, name), value, {flag: 'wx'});
  return {base, directory, outputDirectory: path.join(base, 'inspection'), source, context, input, state, values};
}

test('disk reload, Normal, one background override and both Resets preserve the fixed state and 94px normal captions', async t => {
  const f = await packageFixture(t);
  const result = await checkQ4StateFileTransitions(f);
  assert.equal(result.status, 'passed'); assert.equal(result.targetCaptionId, 'caption-1');
  assert.equal(result.automaticBackground, 'graph-paper'); assert.equal(result.inspectionBackground, 'plain');
  assert.equal(result.inspectionOnly, true); assert.equal(result.videoGenerated, false); assert.equal(result.connectionOperations, 0);
  assert.deepEqual(result.variants.map(row => row.name), ['saved', 'normal-fixed', 'normal-reset', 'background-fixed', 'background-reset']);
  for (const [name, original] of Object.entries(f.values)) assert.equal(await readFile(path.join(f.directory, name), 'utf8'), original);
  for (const variant of ['normal-reset', 'background-reset']) for (const name of names) {
    assert.equal(await readFile(path.join(f.outputDirectory, variant, name + '.json'), 'utf8'), f.values[name + '.json']);
  }
  const source = JSON.parse(await readFile(path.join(f.outputDirectory, 'source-bindings.json'), 'utf8'));
  assert(JSON.parse(source.planBytes).elements.every(row => row.visualState.textStyle.fontSizePx === 94));
  assert.equal(result.variants[0].viewSha256, result.variants[2].viewSha256);
  assert.equal(result.variants[0].viewSha256, result.variants[4].viewSha256);
  const normal = JSON.parse(await readFile(path.join(f.outputDirectory, 'normal-fixed/captionOverrides.json'), 'utf8'));
  assert.equal(normal.entries.length, 1);
  assert.equal(JSON.parse(await readFile(path.join(f.outputDirectory, 'transition-check.json'), 'utf8')).originalFilesUnchanged, true);
});

test('other caption and normal-connection override records survive the inspected caption changes and Reset byte for byte', async t => {
  const f = await packageFixture(t, {otherOverrides: true});
  const result = await checkQ4StateFileTransitions(f);
  assert.equal(result.targetCaptionId, 'caption-1');
  const other = f.state.captionOverrides.entries.find(row => row.captionId === 'caption-3');
  for (const variant of result.variants) {
    assert.equal(await readFile(path.join(f.outputDirectory, variant.name, 'connectionOverrides.json'), 'utf8'), f.values['connectionOverrides.json']);
    const captions = JSON.parse(await readFile(path.join(f.outputDirectory, variant.name, 'captionOverrides.json'), 'utf8'));
    assert.deepEqual(captions.entries.find(row => row.captionId === 'caption-3'), other);
  }
  assert.equal(result.connectionOperations, 0);
});

test('no automatic Panel records no target and never invents override or Reset cases', async t => {
  const f = await packageFixture(t, {panel: false}), result = await checkQ4StateFileTransitions(f);
  assert.equal(result.targetStatus, 'no-automatic-panel-target'); assert.equal(result.targetCaptionId, null);
  assert.equal(result.automaticBackground, null); assert.equal(result.inspectionBackground, null);
  assert.deepEqual(result.variants.map(row => row.name), ['saved']);
  assert.equal((await readdir(f.outputDirectory)).includes('normal-fixed'), false);
});

test('raw reply and input association mismatches reject before any derived directory is created', async t => {
  for (const target of ['judgment-reply.raw.json', 'judgment-input.json']) {
    const f = await packageFixture(t);
    if (target === 'judgment-reply.raw.json') await writeFile(path.join(f.directory, target), f.values[target] + ' ');
    else {
      const input = JSON.parse(f.values[target]); input.judgmentMode = 'technical-recompile';
      const {inputSha256, ...body} = input; input.inputSha256 = sha256AutoPresentationV001(body);
      await writeFile(path.join(f.directory, target), json(input));
    }
    await assert.rejects(checkQ4StateFileTransitions(f));
    await assert.rejects(readdir(f.outputDirectory), /ENOENT/);
  }
});

test('saved plan corruption is rejected and an existing inspection is never overwritten', async t => {
  const corrupt = await packageFixture(t);
  const state = structuredClone(corrupt.state.captionAuto); state.proposal.effects[0].presentation = 'provisional-panel-comic-frame';
  await writeFile(path.join(corrupt.directory, 'captionAuto.json'), json(state));
  await assert.rejects(checkQ4StateFileTransitions(corrupt), /fixed semantic choices/);
  await assert.rejects(readdir(corrupt.outputDirectory), /ENOENT/);
  const f = await packageFixture(t); await checkQ4StateFileTransitions(f);
  const before = await readFile(path.join(f.outputDirectory, 'transition-check.json'));
  await assert.rejects(checkQ4StateFileTransitions(f), /unused run directory/);
  assert((await readFile(path.join(f.outputDirectory, 'transition-check.json'))).equals(before));
});

test('real C-all entry requires an accepted request and output must remain in the managed Q4 tree', async t => {
  const f = await packageFixture(t);
  await assert.rejects(checkQ4SavedState(f), /ENOENT/);
  await assert.rejects(readdir(f.outputDirectory), /ENOENT/);
  await assert.rejects(checkQ4StateFileTransitions({...f, outputDirectory: path.join(repo, 'docs/reports/forbidden-state-check')}), /managed Q4 output/);
});
