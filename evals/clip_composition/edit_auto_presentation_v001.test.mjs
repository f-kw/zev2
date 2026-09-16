import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {parseAutoPresentationEditArgsV001, inspectAutoPresentationCaptionsV001,
  runAutoPresentationEditV001} from './edit_auto_presentation_v001.mjs';
import {loadAutoPresentationContextV001, loadAutoPresentationV001,
  saveFixedAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';

const exec = promisify(execFile);
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
async function fixture(t, auto = true, selection = {role: 'Focus', presentation: 'provisional-focus',
  scope: 'partial-caption', targetText: '同じ語', occurrence: 2}) {
  const directory = await mkdtemp(join(tmpdir(), 'zev-phase2-cli-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const files = {baselinePath: join(directory, 'baseline.json'), decisionInputPath: join(directory, 'input.json'),
    ...(auto ? {autoProposalPath: join(directory, 'auto.json')} : {})};
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30}, elements: [
      ['a', '同じ語、同じ語。'], ['b', '同じ語は大切。'], ['c', '未解決の本文'], ['d', '未処理の本文'],
    ].map(([instructionId, text], index) => ({instructionId, text, kind: 'speech-caption',
      startFrame: index * 30, endFrameExclusive: (index + 1) * 30,
      visualState: {textStyle: {fontColor: '#FFFFFF', fontSizePx: 94, fontAssetId: 'saved-font'}, position: {preset: 'bottom-center'}}}))};
  await writeJson(files.baselinePath, baselinePlan);
  await writeJson(files.decisionInputPath, {purpose: 'CLI finite-operation fixture'});
  const {context} = await loadAutoPresentationContextV001(files);
  if (auto) await saveFixedAutoPresentationV001({...files, outputPath: files.autoProposalPath,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context, targetCaptionIds: ['a', 'b', 'c'],
      completion: 'complete', effects: [{captionId: 'a', ...selection}],
      exceptions: [{captionId: 'c', status: 'unresolved', reason: 'fixture: selection unresolved'}]}});
  const args = ['--baseline', files.baselinePath, '--decision-input', files.decisionInputPath,
    ...(auto ? ['--auto', files.autoProposalPath] : [])];
  return {directory, files, baselinePlan, args};
}

test('CLI accepts exact identity/text and time, and rejects ambiguous argument contracts', () => {
  const required = ['--baseline', 'base', '--decision-input', 'input'];
  assert.equal(parseAutoPresentationEditArgsV001(['show', ...required, '--time', '00:01:02.5']).timeSeconds, 62.5);
  assert.equal(parseAutoPresentationEditArgsV001(['show', ...required, '--time', '0']).timeSeconds, 0);
  assert.equal(parseAutoPresentationEditArgsV001(['partial', ...required, '--caption-id', 'a', '--target', '語',
    '--occurrence', '2', '--output', 'new']).occurrence, 2);
  assert.equal(parseAutoPresentationEditArgsV001(['partial', ...required, '--caption-id', 'a', '--target', '--',
    '--output', 'new']).targetText, '--');
  for (const args of [
    ['show', ...required, '--time', '-1'], ['show', ...required, '--time', '1:99:00'],
    ['show', ...required, '--time', 'NaN'], ['show', ...required, '--caption-id', 'a', '--text', '語'],
    ['normal', ...required, '--caption-id', 'a'], ['normal', ...required, '--output', 'new'],
    ['partial', ...required, '--caption-id', 'a', '--output', 'new'],
    ['focus', ...required, '--caption-id', 'a', '--output', 'new', '--target', '語'],
    ['show', ...required, '--caption-id', 'a', '--caption-id', 'b'],
    ['show', ...required, '--unknown', 'x'], ['show', ...required, '--output', 'new'],
    ['partial', ...required, '--caption-id', 'a', '--target', '語', '--output', 'new', '--occurrence', '1.5'],
  ]) assert.throws(() => parseAutoPresentationEditArgsV001(args), TypeError);
});

test('Vocal CLI reloads its own role, replaces Focus and Normal, and Reset recovers saved Vocal', async t => {
  const f = await fixture(t, true, {role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption'});
  const before = await Promise.all(Object.values(f.files).map(p => readFile(p)));
  let current;
  for (const [index, action] of ['focus', 'vocal', 'normal', 'reset'].entries()) {
    const outputPath = join(f.directory, `vocal-edit-${index}.json`), output = [];
    const result = await runAutoPresentationEditV001([action, ...f.args,
      ...(current ? ['--overrides', current] : []), '--caption-id', 'a', '--output', outputPath], s => output.push(s));
    const loaded = await loadAutoPresentationV001({...f.files, overridesPath: outputPath});
    const row = inspectAutoPresentationCaptionsV001({...loaded, query: {captionId: 'a'}})[0];
    assert.deepEqual(row, result.after);
    assert.equal(row.automatic.role, 'Vocal accent');
    assert.equal(row.effective.role, action === 'focus' ? 'Focus' : action === 'normal' ? 'Normal' : 'Vocal accent');
    assert.match(output.join('\n'), /Vocal accent \/ whole/);
    if (action === 'reset') assert.equal(row.hasOverride, false);
    current = outputPath;
  }
  for (const [i, file] of Object.values(f.files).entries()) assert.deepEqual(await readFile(file), before[i]);
  assert.throws(() => parseAutoPresentationEditArgsV001(['vocal', ...f.args, '--caption-id', 'a',
    '--target', '同じ語', '--output', join(f.directory, 'invalid.json')]), /partial 専用/);
});

test('ID, exact substring, and half-open video time return all matching candidates', async t => {
  const f = await fixture(t), loaded = await loadAutoPresentationV001(f.files);
  const inspect = query => inspectAutoPresentationCaptionsV001({...loaded, query});
  assert.deepEqual(inspect({captionId: 'a'}).map(r => r.captionId), ['a']);
  assert.deepEqual(inspect({text: '同じ語'}).map(r => r.captionId), ['a', 'b']);
  assert.deepEqual(inspect({text: '同じ 語'}), []);
  assert.deepEqual(inspect({timeSeconds: 1}).map(r => r.captionId), ['b']);
  assert.deepEqual(inspect({timeSeconds: 0.999}).map(r => r.captionId), ['a']);
  assert.deepEqual(inspect({timeSeconds: 4}), []);
  assert.throws(() => inspect({text: ''}), TypeError);
  assert.throws(() => inspect({captionId: 'a', text: '語'}), TypeError);
});

test('display distinguishes fixed automatic range, automatic Normal, unresolved, and unprocessed', async t => {
  const f = await fixture(t), output = [];
  const result = await runAutoPresentationEditV001(['show', ...f.args], text => output.push(text));
  assert.deepEqual(result.rows.map(r => r.origin), ['auto', 'auto', 'unresolved', 'unprocessed']);
  assert.equal(result.rows[0].automatic.scope, 'partial-caption');
  assert.equal(result.rows[0].automatic.occurrence, 2);
  assert.equal(result.rows[1].automatic.status, 'normal');
  assert.ok(result.rows.every(r => !r.hasOverride && !r.canReset));
  assert.match(output.join('\n'), /ID: a/);
  assert.match(output.join('\n'), /partial.*同じ語.*occurrence=2/);
  assert.match(output.join('\n'), /selection unresolved/);
});

test('four CLI operations save, reload, display their origin, and Reset restores the fixed auto range', async t => {
  const f = await fixture(t);
  const before = await Promise.all(Object.values(f.files).map(p => readFile(p)));
  let current;
  const results = [];
  for (const [action, extra] of [['partial', ['--target', '同じ語', '--occurrence', '1']],
    ['normal', []], ['focus', []], ['reset', []]]) {
    const outputPath = join(f.directory, `${action}.json`);
    const args = [action, ...f.args, ...(current ? ['--overrides', current] : []),
      '--caption-id', 'a', ...extra, '--output', outputPath];
    const result = await runAutoPresentationEditV001(args, () => {});
    const loaded = await loadAutoPresentationV001({...f.files, overridesPath: outputPath});
    const row = inspectAutoPresentationCaptionsV001({...loaded, query: {captionId: 'a'}})[0];
    assert.deepEqual(row, result.after);
    assert.equal(result.before.captionId, 'a');
    results.push(row); current = outputPath;
  }
  assert.deepEqual(results.map(r => r.origin), ['human override', 'Normal fixed', 'human override', 'auto']);
  assert.deepEqual(results.map(r => r.effective.scope), ['partial-caption', 'none', 'whole-caption', 'partial-caption']);
  assert.equal(results[0].effective.occurrence, 1);
  assert.equal(results[3].effective.occurrence, 2);
  assert.equal(results[3].hasOverride, false);
  assert.equal(results[3].canReset, false);
  for (const [index, path] of Object.values(f.files).entries()) assert.deepEqual(await readFile(path), before[index]);
});

test('human partial Focus can be added to automatic Normal and Reset restores Normal', async t => {
  const f = await fixture(t), partial = join(f.directory, 'partial.json'), reset = join(f.directory, 'reset.json');
  const added = await runAutoPresentationEditV001(['partial', ...f.args, '--time', '1.2', '--target', '大切', '--output', partial], () => {});
  assert.equal(added.before.automatic.role, 'Normal');
  assert.equal(added.after.effective.role, 'Focus');
  const restored = await runAutoPresentationEditV001(['reset', ...f.args, '--overrides', partial,
    '--text', '同じ語は大切。', '--output', reset], () => {});
  assert.equal(restored.after.effective.role, 'Normal');
  assert.equal(restored.after.origin, 'auto');
});

test('several matches and missing matches show candidates without writing an override', async t => {
  const f = await fixture(t), before = await readdir(f.directory);
  const output = [];
  await assert.rejects(runAutoPresentationEditV001(['normal', ...f.args, '--text', '同じ語', '--output', join(f.directory, 'new.json')], text => output.push(text)), /候補が複数/);
  assert.match(output.join('\n'), /ID: a/); assert.match(output.join('\n'), /ID: b/);
  await assert.rejects(runAutoPresentationEditV001(['focus', ...f.args, '--caption-id', 'missing', '--output', join(f.directory, 'new.json')], () => {}), /対象がありません/);
  assert.deepEqual(await readdir(f.directory), before);
});

test('invalid exact range and existing output fail without modifying any saved state', async t => {
  const f = await fixture(t), before = await readdir(f.directory);
  const output = join(f.directory, 'invalid.json');
  await assert.rejects(runAutoPresentationEditV001(['partial', ...f.args, '--caption-id', 'a', '--target', '同じ語', '--output', output], () => {}), TypeError);
  assert.deepEqual(await readdir(f.directory), before);
  const previous = await readFile(f.files.autoProposalPath);
  await assert.rejects(runAutoPresentationEditV001(['normal', ...f.args, '--caption-id', 'a', '--output', f.files.autoProposalPath], () => {}), {code: 'EEXIST'});
  assert.deepEqual(await readFile(f.files.autoProposalPath), previous);
});

test('no automatic proposal remains visibly unprocessed and allows a bound one-caption edit', async t => {
  const f = await fixture(t, false), outputPath = join(f.directory, 'human.json');
  const result = await runAutoPresentationEditV001(['focus', ...f.args, '--caption-id', 'a', '--output', outputPath], () => {});
  assert.equal(result.before.origin, 'unprocessed');
  assert.equal(result.after.origin, 'human override');
  assert.equal(result.after.automatic.status, 'not-processed');
});

test('direct CLI process emits readable help, state, and nonzero errors without JSON editing', async t => {
  const f = await fixture(t), script = new URL('./edit_auto_presentation_v001.mjs', import.meta.url).pathname;
  const help = await exec(process.execPath, [script, '--help']);
  assert.match(help.stdout, /Normal固定/);
  const shown = await exec(process.execPath, [script, 'show', ...f.args, '--caption-id', 'a']);
  assert.match(shown.stdout, /固定自動案: selected/);
  await assert.rejects(exec(process.execPath, [script, 'normal', ...f.args, '--text', '同じ語', '--output', join(f.directory, 'new.json')]), error => {
    assert.equal(error.code, 1); assert.match(error.stdout, /ID: b/); assert.match(error.stderr, /候補が複数/); return true;
  });
});
