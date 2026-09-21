import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const execute = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(repo, 'tools/digest-quality/q5-3-run.mjs');
const catalog = path.join(repo, 'docs/reports/digest-quality-q5-3-20260921-v001/fixed-catalog-v001.json');
const parent = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q5-3-20260921-v001');
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n');
const digest = value => createHash('sha256').update(value).digest('hex');
let rootPromise;
async function directory(label) {
  rootPromise ??= (async () => {
    await mkdir(parent, {recursive: true});
    const root = await mkdtemp(path.join(parent, 'cli-tests-'));
    console.log('Q5-3 real saved-entry evidence: ' + root); return root;
  })();
  const result = path.join(await rootPromise, label); await mkdir(result); return result;
}
async function call(...args) {
  const result = await execute(process.execPath, [cli, ...args], {cwd: repo, maxBuffer: 8 * 1024 * 1024});
  return JSON.parse(result.stdout);
}
async function rejectCall(pattern, ...args) {
  await assert.rejects(call(...args), error => {
    assert.match(error.stderr ?? error.message, pattern); return true;
  });
}
const choose = (state, side, value, statement = 'Explicit Q5-3 development verification; no human adoption.') =>
  call('select', state.directory, state.savedStateToken, side, value ? 'on' : 'off', 'technical-fixture', statement);

test('real CLI saves four states, reopens in separate processes, independently cancels, and acquires existing local media', async () => {
  const root = await directory('four-states'), dir = path.join(root, 'selection');
  let state = await call('init', catalog, dir);
  assert.deepEqual(state.selection, {omit: false, add: false});
  assert.equal(state.frameCount, 44408); assert.equal(state.captionCount, 325);
  const observations = [];
  const acquire = async (label, frames, captions, enabledCount) => {
    const reread = await call('read', dir);
    assert.notEqual(reread.executionProcessId, state.executionProcessId);
    assert.equal(reread.savedStateToken, state.savedStateToken);
    const out = path.join(root, label), completion = await call('acquire', dir, out);
    const verified = await call('verify-output', out);
    assert.notEqual(completion.executionProcessId, verified.executionProcessId);
    assert.equal(verified.frameCount, frames); assert.equal(verified.captionCount, captions);
    assert.equal(verified.wholeContentMediaCreated, false); assert.equal(verified.humanAdoption, false);
    const bindings = await parse(path.join(out, 'reuse-bindings.json'));
    assert.equal(bindings.bindings.length, enabledCount);
    assert.deepEqual(bindings.bindings.map(row => row.candidateKey), ['omit', 'add'].filter(side => state.selection[side]));
    for (const row of bindings.bindings) {
      assert.equal(row.localIdentity.frameCount, row.candidateKey === 'omit' ? 763 : 624);
      assert.equal(row.mediaRef.fileSha256, row.candidateKey === 'omit'
        ? '80f39330b22f238263e282d33327105f1651bd45800d33fddf4888d9d146c8f6'
        : '98d73010ebfa93bf9b094781e279d705f51771d295ae3fbc9fe78d1f0f365737');
      assert.equal(row.mediaGenerated, false); assert.equal(row.historicalQcReexecuted, false);
    }
    observations.push({label, state, completion, verified, bindings});
    return {out, bindings, enabledCount};
  };
  const none = await acquire('none', 44408, 325, 0);
  state = await choose(state, 'omit', true, 'Omission selected only for technical verification.');
  const omit = await acquire('omit', 44349, 324, 1);
  const omissionProvenance = state.selectionProvenance.omit;
  state = await choose(state, 'add', true, 'Introduction selected only for technical verification.');
  assert.deepEqual(state.selectionProvenance.omit, omissionProvenance);
  const both = await acquire('both', 44694, 327, 2);
  assert.deepEqual(both.bindings.bindings.map(row => row.newGlobalRange), [
    {startFrame: 11683, endFrameExclusive: 12446}, {startFrame: 18519, endFrameExclusive: 19143}]);
  const bothState = state;
  state = await choose(state, 'omit', false);
  assert.deepEqual(state.selection, {omit: false, add: true});
  assert.deepEqual(state.selectionProvenance.add, bothState.selectionProvenance.add);
  const add = await acquire('add', 44753, 328, 1);
  state = await choose(state, 'omit', true);
  const preservedOmit = state.selectionProvenance.omit;
  state = await choose(state, 'add', false);
  assert.deepEqual(state.selection, {omit: true, add: false});
  assert.deepEqual(state.selectionProvenance.omit, preservedOmit);
  assert.equal(state.resolutionSha256, observations.find(row => row.label === 'omit').state.resolutionSha256);
  state = await choose(state, 'omit', false);
  assert.equal(state.frameCount, 44408); assert.equal(state.captionCount, 325);
  assert.equal(state.contentVersion, observations[0].state.contentVersion);
  assert.equal(state.resolutionSha256, observations[0].state.resolutionSha256);
  assert.notEqual(state.saveId, observations[0].state.saveId);
  // Earlier output is bound to its saved snapshot, not today's cancelled choices.
  await call('verify-output', both.out);
  const original = await parse(path.join(none.out, 'resolved.json'));
  const last = await call('acquire', dir, path.join(root, 'all-cancelled'));
  const cancelled = await parse(last.files.resolved.path);
  assert.deepEqual(cancelled, original);
  await save(path.join(root, 'observations.json'), {schemaVersion: 'q5-3-real-cli-verification-v001',
    status: 'passed', observations, cancellationResult: state, allCancelled: last,
    mediaAcquisition: 'Verified reuse only; no old decoding/QC or new encoding.', humanAdoption: false});
});

test('saved selection order and repeat enable do not change effective content; stale and ABA saves are refused', async () => {
  const root = await directory('order-and-stale');
  const initialA = await call('init', catalog, path.join(root, 'a'));
  let a = await choose(initialA, 'omit', true); a = await choose(a, 'add', true);
  let b = await call('init', catalog, path.join(root, 'b'));
  b = await choose(b, 'add', true); b = await choose(b, 'omit', true);
  assert.equal(a.resolutionSha256, b.resolutionSha256); assert.equal(a.contentVersion, b.contentVersion);
  const repeated = await choose(a, 'omit', true);
  assert.equal(a.resolutionSha256, repeated.resolutionSha256);
  assert.notEqual(a.savedStateToken, repeated.savedStateToken);
  await rejectCall(/Q53_STALE_SELECTION/, 'select', a.directory, a.savedStateToken, 'add', 'off', 'technical-fixture', 'Stale writer.');
  assert.equal((await call('read', a.directory)).savedStateToken, repeated.savedStateToken);
  a = await choose(repeated, 'omit', false); a = await choose(a, 'add', false);
  assert.equal(a.resolutionSha256, initialA.resolutionSha256);
  await rejectCall(/Q53_STALE_SELECTION/, 'select', a.directory, initialA.savedStateToken, 'add', 'on', 'technical-fixture', 'Stale A to B to A writer.');
  await save(path.join(root, 'observations.json'), {status: 'passed', initialA, oppositeOrder: b,
    repeated, finalCancelled: a, staleSaveRejected: true, staleAbaRejected: true});
});

test('competing processes cannot overwrite one another and invalid or human-review choices do not write state', async () => {
  const root = await directory('competing-saves'), initial = await call('init', catalog, path.join(root, 'selection'));
  const outcomes = await Promise.allSettled([choose(initial, 'omit', true), choose(initial, 'add', true)]);
  assert.equal(outcomes.filter(row => row.status === 'fulfilled').length, 1);
  const failure = outcomes.find(row => row.status === 'rejected').reason;
  assert.match(failure.stderr, /Q53_STALE_SELECTION|EDITING_BUSY/);
  const state = await call('read', initial.directory);
  assert.equal(Number(state.selection.omit) + Number(state.selection.add), 1);
  const unchanged = await readFile(path.join(initial.directory, 'selection.json'));
  for (const [side, kind] of [['third', 'technical-fixture'], ['omit,omit', 'technical-fixture'], ['omit', 'both_usable'], ['add', 'human-answer']])
    await rejectCall(/Q53_STORE_INVALID/, 'select', state.directory, state.savedStateToken, side, 'on', kind, 'Rejected input.');
  assert.deepEqual(await readFile(path.join(initial.directory, 'selection.json')), unchanged);
  await save(path.join(root, 'observations.json'), {status: 'passed', saved: state,
    winner: outcomes.find(row => row.status === 'fulfilled').value, rejected: JSON.parse(failure.stderr),
    unknownDuplicateAndHumanAnswerInputsRejected: true});
});

test('a changed saved selection, candidate binding or false completion is rejected on read', async () => {
  const root = await directory('changed-files'), dir = path.join(root, 'selection');
  const initial = await call('init', catalog, dir), file = path.join(dir, 'selection.json');
  const original = await parse(file), changed = structuredClone(original); changed.selection.add = true;
  await save(file, changed);
  await rejectCall(/Q53_STORE_INVALID/, 'read', dir);
  const differentSource = structuredClone(original); differentSource.sourceIdentitySha256 = '0'.repeat(64);
  await save(file, differentSource);
  await rejectCall(/different original/, 'read', dir);
  await save(file, original);
  const out = path.join(root, 'output'); await call('acquire', dir, out);
  const completionFile = path.join(out, 'completion.json'), completion = await parse(completionFile);
  completion.wholeContentMediaCreated = true; await save(completionFile, completion);
  await rejectCall(/does not reconstruct/, 'verify-output', out);
  const catalogFile = path.join(dir, 'catalog.json');
  const catalogData = await parse(catalogFile); catalogData.candidates.omit.editPlanRef.fileSha256 = 'f'.repeat(64);
  await save(catalogFile, catalogData);
  await rejectCall(/Q53_FIXED_CHANGED/, 'read', dir);
  const changedInstructionPath = path.join(root, 'different-instruction.md');
  const changedInstruction = Buffer.from('Explicit negative fixture: not the received Q5-3 instruction.\n');
  await writeFile(changedInstructionPath, changedInstruction, {flag: 'wx'});
  const rebound = await parse(catalog);
  rebound.policyRef = {path: changedInstructionPath, bytes: changedInstruction.length, fileSha256: digest(changedInstruction)};
  const reboundCatalog = path.join(root, 'rebound-catalog.json'); await save(reboundCatalog, rebound);
  await rejectCall(/fixed Q5-3 instruction/, 'init', reboundCatalog, path.join(root, 'different-instruction-selection'));
  await save(path.join(root, 'observations.json'), {status: 'passed', initial,
    changedSelectionRejected: true, foreignSourceRejected: true, falseMediaClaimRejected: true,
    fixedCatalogChangedRejected: true, reboundInstructionRejected: true, corruptedFixtureSha256: digest(await readFile(catalogFile)),
    scope: 'Only this test workspace was modified; accepted candidates and human reviews are read-only.'});
});
