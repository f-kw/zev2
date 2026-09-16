import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {parseAutoPresentationEditArgsV001, inspectAutoPresentationCaptionsV001,
  runAutoPresentationEditV001, AUTO_PRESENTATION_EDIT_HELP} from './edit_auto_presentation_v001.mjs';
import {loadAutoPresentationContextV001, loadAutoPresentationV001,
  saveFixedAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';

const exec = promisify(execFile);
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
async function fixture(t, auto = true, selection = {role: 'Focus', presentation: 'provisional-focus',
  scope: 'partial-caption', targetText: '同じ語', occurrence: 2}, withPulseEvidence = false) {
  const directory = await mkdtemp(join(tmpdir(), 'zev-phase2-cli-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const files = {baselinePath: join(directory, 'baseline.json'), decisionInputPath: join(directory, 'input.json'),
    ...(auto ? {autoProposalPath: join(directory, 'auto.json')} : {})};
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30}, elements: [
      ['a', '同じ語、同じ語。'], ['b', '同じ語は大切。'], ['c', '未解決の本文'], ['d', '未処理の本文'],
    ].map(([instructionId, text], index) => ({instructionId, text, kind: 'speech-caption',
      startFrame: index * 30, endFrameExclusive: (index + 1) * 30,
      ...(withPulseEvidence ? {displayFrameCount: 30} : {}),
      visualState: {textStyle: {fontColor: '#FFFFFF', fontSizePx: withPulseEvidence ? 96 : 94,
        fontAssetId: 'saved-font'}, position: {preset: 'bottom-center'}}}))};
  await writeJson(files.baselinePath, baselinePlan);
  const evidenceFiles = [];
  if (withPulseEvidence) {
    const bound = async (name, value, json = true) => {
      const path = join(directory, name), bytes = Buffer.from(json ? `${JSON.stringify(value, null, 2)}\n` : value);
      await writeFile(path, bytes); evidenceFiles.push(path);
      return {path, fileSha256: createHash('sha256').update(bytes).digest('hex')};
    };
    const sourceRef = await bound('synthetic-source.bin', 'Synthetic source bytes for CLI binding only; not encoded media.', false);
    const source = {path: sourceRef.path, sha256: sourceRef.fileSha256,
      bytes: (await readFile(sourceRef.path)).length};
    const sampleRate = 3000, sampleCount = 12000;
    const peaks = [['peak-a-first', 1200], ['peak-a-second', 1800], ['peak-a-edge', 400],
      ['peak-a-end', 3000], ['peak-b', 4500]].map(([peakId, peakSample]) => ({
      peakId, startSample: peakSample - 20, endSampleExclusive: peakSample + 21, peakSample}));
    const candidates = [{candidateId: 'candidate-union', peakIds: peaks.map(peak => peak.peakId)}];
    const peaksRef = await bound('acoustic-peaks.json', {
      schemaVersion: 'presentation-vocal-audio-measurements-v001', source, sampleRate, sampleCount,
      rows: peaks.map(({peakId, ...peak}) => ({id: peakId, ...peak, qualifies: true})),
    });
    const candidatesRef = await bound('audio-candidates.json', {
      schemaVersion: 'presentation-vocal-audio-candidates-v001', source, sampleRate, sampleCount,
      candidateCount: 1,
      candidates: [{id: 'candidate-union', startSample: 380, endSampleExclusive: 4521,
        constituentPeakIds: peaks.map(peak => peak.peakId)}],
      measurementEvidence: [{path: peaksRef.path, sha256: peaksRef.fileSha256,
        bytes: (await readFile(peaksRef.path)).length}],
    });
    await writeJson(files.decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v004',
      pulseTimingEvidence: {schemaVersion: 'auto-presentation-pulse-timing-v001',
        sourceRef, candidatesRef, peaksRef, sampleRate, sampleCount, candidates, peaks}});
  } else await writeJson(files.decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v004',
    purpose: 'CLI finite-operation fixture', pulseTimingEvidence: null});
  const {context} = await loadAutoPresentationContextV001(files);
  if (auto) await saveFixedAutoPresentationV001({...files, outputPath: files.autoProposalPath,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context, targetCaptionIds: ['a', 'b', 'c'],
      completion: 'complete', effects: [{captionId: 'a', ...selection}],
      exceptions: [{captionId: 'c', status: 'unresolved', reason: 'fixture: selection unresolved'}]}});
  const args = ['--baseline', files.baselinePath, '--decision-input', files.decisionInputPath,
    ...(auto ? ['--auto', files.autoProposalPath] : [])];
  return {directory, files, baselinePlan, args, evidenceFiles};
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
    ['color', ...required, '--caption-id', 'a', '--output', 'new', '--target', '語'],
    ['scale', ...required, '--caption-id', 'a', '--output', 'new', '--target', '語'],
    ['panel', ...required, '--caption-id', 'a', '--output', 'new', '--target', '語'],
    ['panel', ...required, '--caption-id', 'a', '--output', 'new', '--occurrence', '1'],
    ['show', ...required, '--caption-id', 'a', '--caption-id', 'b'],
    ['show', ...required, '--unknown', 'x'], ['show', ...required, '--output', 'new'],
    ['partial', ...required, '--caption-id', 'a', '--target', '語', '--output', 'new', '--occurrence', '1.5'],
  ]) assert.throws(() => parseAutoPresentationEditArgsV001(args), TypeError);
});

test('CLI uses Color, Scale and provisional Panel/Pulse names and rejects the replaced action names', () => {
  const required = ['--baseline', 'base', '--decision-input', 'input', '--caption-id', 'a', '--output', 'new'];
  for (const action of ['color', 'scale', 'panel', 'pulse']) {
    assert.equal(parseAutoPresentationEditArgsV001([action, ...required]).action, action);
  }
  for (const action of ['focus', 'vocal']) {
    assert.throws(() => parseAutoPresentationEditArgsV001([action, ...required]), /color \/ scale \/ panel/);
  }
  assert.match(AUTO_PRESENTATION_EDIT_HELP, /color\s+全文Color Accent/);
  assert.match(AUTO_PRESENTATION_EDIT_HELP, /scale\s+全文Scale Accent/);
  assert.match(AUTO_PRESENTATION_EDIT_HELP, /panel\s+全文Panel Accent（仮称）/);
  assert.match(AUTO_PRESENTATION_EDIT_HELP, /pulse\s+全文Pulse Accent（仮称）: --peak/);
  assert.match(AUTO_PRESENTATION_EDIT_HELP, /partial\s+部分Color Accent/);
  assert.doesNotMatch(AUTO_PRESENTATION_EDIT_HELP, /Focus|Vocal accent|\bfocus\b|\bvocal\b/);
});

test('Pulse accepts one measured peak ID and keeps time as caption search only', () => {
  const required = ['--baseline', 'base', '--decision-input', 'input', '--time', '1.2', '--output', 'new'];
  const parsed = parseAutoPresentationEditArgsV001(['pulse', ...required, '--peak', 'peak-b']);
  assert.equal(parsed.anchorPeakId, 'peak-b');
  assert.equal(parsed.timeSeconds, 1.2);
  // An omitted ID reaches the bound input so the CLI can display eligible IDs.
  assert.equal(parseAutoPresentationEditArgsV001(['pulse', ...required]).anchorPeakId, undefined);
  for (const action of ['show', 'normal', 'color', 'scale', 'panel', 'partial', 'reset']) {
    const args = [action, '--baseline', 'base', '--decision-input', 'input', '--caption-id', 'a',
      ...(action === 'show' ? [] : ['--output', 'new']),
      ...(action === 'partial' ? ['--target', '語'] : []), '--peak', 'peak-b'];
    assert.throws(() => parseAutoPresentationEditArgsV001(args), /--peak は pulse 専用/);
  }
  for (const extra of [
    ['--peak', 'peak-a', '--peak', 'peak-b'], ['--target', '語'], ['--occurrence', '1'],
    ['--start-frame', '10'], ['--end-frame', '20'], ['--scale', '2'], ['--easing', 'linear'],
    ['--keyframes', '[]'], ['--position', '0,0'], ['--color', '#ffffff'], ['--filter', 'null'],
  ]) assert.throws(() => parseAutoPresentationEditArgsV001(['pulse', ...required, ...extra]), TypeError);
});

test('Pulse lists eligible IDs and never chooses one or writes for a missing, foreign or unfittable peak', async t => {
  const f = await fixture(t, true, undefined, true), before = await readdir(f.directory);
  for (const extra of [[], ['--peak', 'unknown'], ['--peak', 'peak-b'],
    ['--peak', 'peak-a-edge'], ['--peak', 'peak-a-end']]) {
    const output = [];
    await assert.rejects(runAutoPresentationEditV001(['pulse', ...f.args, '--caption-id', 'a',
      ...extra, '--output', join(f.directory, 'not-created.json')], text => output.push(text)), /保存しませんでした/);
    const shown = output.join('\n');
    assert.match(shown, /ID: peak-a-first /);
    assert.match(shown, /ID: peak-a-second /);
    assert.doesNotMatch(shown, /ID: peak-b |ID: peak-a-edge |ID: peak-a-end /);
    assert.deepEqual(await readdir(f.directory), before);
  }
  // Caption b has exactly one eligible peak; it is still never auto-selected.
  const output = [];
  await assert.rejects(runAutoPresentationEditV001(['pulse', ...f.args, '--caption-id', 'b',
    '--output', join(f.directory, 'not-created.json')], text => output.push(text)), /自動選択せず/);
  assert.match(output.join('\n'), /ID: peak-b /);
  assert.deepEqual(await readdir(f.directory), before);
});

test('Pulse cannot be saved without bound acoustic evidence', async t => {
  const f = await fixture(t), before = await readdir(f.directory), output = [];
  await assert.rejects(runAutoPresentationEditV001(['pulse', ...f.args, '--caption-id', 'a',
    '--peak', 'invented', '--output', join(f.directory, 'not-created.json')], text => output.push(text)), /保存しませんでした/);
  assert.match(output.join('\n'), /適格なピークはありません/);
  assert.deepEqual(await readdir(f.directory), before);
});

test('Pulse overrides preserve other captions and Reset restores the saved automatic peak exactly', async t => {
  const savedSelection = {role: 'Pulse accent', presentation: 'provisional-pulse',
    scope: 'whole-caption', anchorPeakId: 'peak-a-first'};
  const f = await fixture(t, true, savedSelection, true);
  const unchangedFiles = [...Object.values(f.files), ...f.evidenceFiles];
  const sourceBytes = await Promise.all(unchangedFiles.map(p => readFile(p)));
  const original = await loadAutoPresentationV001(f.files);
  const originalResolved = resolveAutoPresentationV001({baselinePlan: original.baselinePlan, ...original.autoPresentation});
  const otherRows = inspectAutoPresentationCaptionsV001(original).slice(1);
  let current;
  const operations = [
    ['pulse', ['--peak', 'peak-a-second'], 'Pulse accent'],
    ['color', [], 'Focus'], ['scale', [], 'Vocal accent'], ['panel', [], 'Panel accent'],
    ['normal', [], 'Normal'], ['reset', [], 'Pulse accent'],
  ];
  for (const [index, [action, extra, expectedRole]] of operations.entries()) {
    const outputPath = join(f.directory, `pulse-edit-${index}.json`), output = [];
    const result = await runAutoPresentationEditV001([action, ...f.args,
      ...(current ? ['--overrides', current] : []), '--time', '0.8', ...extra, '--output', outputPath], text => output.push(text));
    const loaded = await loadAutoPresentationV001({...f.files, overridesPath: outputPath});
    const rows = inspectAutoPresentationCaptionsV001(loaded);
    const resolved = resolveAutoPresentationV001({baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation});
    assert.equal(result.after.effective.role, expectedRole);
    assert.equal(result.after.automatic.anchorPeakId, 'peak-a-first');
    assert.deepEqual(rows.slice(1), otherRows);
    assert.deepEqual(resolved.plan.elements.slice(1), originalResolved.plan.elements.slice(1));
    assert.doesNotMatch(output.join('\n'), /Focus|Vocal accent|Panel accent|Pulse accent/);
    assert.match(output.join('\n'), /Pulse Accent（仮称）.*根拠ピーク: peak-a-first/);
    if (action === 'pulse') {
      assert.equal(result.after.effective.anchorPeakId, 'peak-a-second');
      assert.equal(resolved.plan.elements[0].presentationPulse.anchorFrame, 18);
      assert.deepEqual(loaded.autoPresentation.overrides.entries, [{captionId: 'a',
        ...savedSelection, anchorPeakId: 'peak-a-second'}]);
    }
    if (action === 'reset') {
      assert.equal(result.after.effective.anchorPeakId, 'peak-a-first');
      assert.equal(result.after.hasOverride, false);
      assert.deepEqual(loaded.autoPresentation.overrides.entries, []);
      assert.deepEqual(resolved.plan, originalResolved.plan);
    }
    current = outputPath;
  }
  for (const [index, file] of unchangedFiles.entries()) assert.deepEqual(await readFile(file), sourceBytes[index]);
});

test('Pulse direct CLI prints eligible IDs on refusal and the selected peak after an explicit save', async t => {
  const f = await fixture(t, true, undefined, true);
  const script = new URL('./edit_auto_presentation_v001.mjs', import.meta.url).pathname;
  const outputPath = join(f.directory, 'explicit-pulse.json');
  await assert.rejects(exec(process.execPath, [script, 'pulse', ...f.args, '--caption-id', 'a', '--output', outputPath]), error => {
    assert.equal(error.code, 1);
    assert.match(error.stdout, /ID: peak-a-first /);
    assert.match(error.stdout, /ID: peak-a-second /);
    assert.match(error.stderr, /自動選択せず/);
    return true;
  });
  await assert.rejects(readFile(outputPath), {code: 'ENOENT'});
  const saved = await exec(process.execPath, [script, 'pulse', ...f.args, '--caption-id', 'a',
    '--peak', 'peak-a-second', '--output', outputPath]);
  assert.match(saved.stdout, /現在: Pulse Accent（仮称）.*根拠ピーク: peak-a-second/);
  const before = await readFile(outputPath);
  await assert.rejects(exec(process.execPath, [script, 'pulse', ...f.args, '--caption-id', 'a',
    '--peak', 'peak-a-first', '--output', outputPath]), error => error.code === 1);
  assert.deepEqual(await readFile(outputPath), before);
});

test('all three accents can be overridden and Normal or Reset preserves every saved automatic role', async t => {
  const choices = [
    {action: 'color', role: 'Focus', presentation: 'provisional-focus', label: 'Color Accent'},
    {action: 'scale', role: 'Vocal accent', presentation: 'provisional-vocal', label: 'Scale Accent'},
    {action: 'panel', role: 'Panel accent', presentation: 'provisional-panel', label: 'Panel Accent（仮称）'},
  ];
  for (const saved of choices) await t.test(`saved ${saved.label}`, async t => {
    const f = await fixture(t, true, {role: saved.role, presentation: saved.presentation, scope: 'whole-caption'});
    const before = await Promise.all(Object.values(f.files).map(p => readFile(p)));
    let current;
    for (const [index, action] of ['color', 'scale', 'panel', 'normal', 'reset'].entries()) {
      const outputPath = join(f.directory, `accent-edit-${index}.json`), output = [];
      const result = await runAutoPresentationEditV001([action, ...f.args,
        ...(current ? ['--overrides', current] : []), '--caption-id', 'a', '--output', outputPath], s => output.push(s));
      const loaded = await loadAutoPresentationV001({...f.files, overridesPath: outputPath});
      const row = inspectAutoPresentationCaptionsV001({...loaded, query: {captionId: 'a'}})[0];
      const expected = action === 'reset' ? saved : choices.find(choice => choice.action === action);
      assert.deepEqual(row, result.after);
      assert.equal(row.automatic.role, saved.role);
      assert.equal(row.effective.role, action === 'normal' ? 'Normal' : expected.role);
      assert.ok(output.join('\n').includes(`${saved.label} / whole`));
      assert.doesNotMatch(output.join('\n'), /Focus|Vocal accent|Panel accent/);
      const entries = loaded.autoPresentation.overrides.entries;
      if (action === 'reset') {
        assert.equal(row.hasOverride, false);
        assert.equal(row.origin, 'auto');
        assert.deepEqual(entries, []);
      } else if (action === 'normal') {
        assert.equal(row.origin, 'Normal fixed');
        assert.deepEqual(entries, [{captionId: 'a', role: 'Normal'}]);
      } else {
        assert.equal(row.origin, 'human override');
        assert.deepEqual(entries, [{captionId: 'a', role: expected.role,
          presentation: expected.presentation, scope: 'whole-caption'}]);
      }
      current = outputPath;
    }
    for (const [i, file] of Object.values(f.files).entries()) assert.deepEqual(await readFile(file), before[i]);
  });
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
    ['normal', []], ['color', []], ['reset', []]]) {
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

test('human partial Color can be added to automatic Normal and Reset restores Normal', async t => {
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
  await assert.rejects(runAutoPresentationEditV001(['color', ...f.args, '--caption-id', 'missing', '--output', join(f.directory, 'new.json')], () => {}), /対象がありません/);
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
  const result = await runAutoPresentationEditV001(['color', ...f.args, '--caption-id', 'a', '--output', outputPath], () => {});
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
