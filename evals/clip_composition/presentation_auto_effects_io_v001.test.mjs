import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {
  createAutoPresentationOverridesV001,
  editAutoPresentationOverrideV001,
  resolveAutoPresentationV001,
  sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {
  loadAutoPresentationContextV001,
  loadAutoPresentationV001,
  saveAutoPresentationOverridesV001,
  saveFixedAutoPresentationV001,
} from './presentation_auto_effects_io_v001.mjs';

const captionIds = ['caption-a', 'caption-b', 'caption-c'];
const focus = () => ({role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'});
const byteHash = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const expectMissing = path => assert.rejects(readFile(path), {code: 'ENOENT'});

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'zev-auto-presentation-io-'));
  // Only this test's newly created directory is removed; no repository or saved media is used.
  t.after(() => rm(directory, {recursive: true, force: true}));
  const baselinePath = join(directory, 'normal-plan.json');
  const decisionInputPath = join(directory, 'confirmed-input.json');
  const autoProposalPath = join(directory, 'fixed-auto.json');
  const overridesPath = join(directory, 'human-overrides.json');
  const baselinePlan = {
    schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1280, height: 720, fps: 30},
    elements: captionIds.map((instructionId, index) => ({
      instructionId, kind: 'speech-caption', text: ['勝つなら許す', '確定した字幕', '普通の会話'][index],
      startFrame: index * 60, endFrameExclusive: index * 60 + 45,
      visualState: {
        textStyle: {fontColor: '#FFFDF8', fontSizePx: 94, fontAssetId: 'saved-font'},
        position: {preset: 'bottom-center'},
      },
    })),
  };
  await writeJson(baselinePath, baselinePlan);
  await writeJson(decisionInputPath, {captions: baselinePlan.elements.map(({instructionId, text}) => ({instructionId, text}))});
  const loaded = await loadAutoPresentationContextV001({baselinePath, decisionInputPath});
  return {directory, baselinePath, decisionInputPath, autoProposalPath, overridesPath, ...loaded};
}

function proposal(f, changes = {}) {
  return {
    schemaVersion: 'auto-presentation-proposal-v001', context: structuredClone(f.context),
    targetCaptionIds: [...captionIds], completion: 'complete',
    effects: [{captionId: 'caption-a', ...focus()}], exceptions: [], ...changes,
  };
}

const saveAuto = (f, value = proposal(f)) => saveFixedAutoPresentationV001({
  baselinePath: f.baselinePath, decisionInputPath: f.decisionInputPath,
  proposal: value, outputPath: f.autoProposalPath,
});
const readAuto = (f, withOverrides = false) => loadAutoPresentationV001({
  baselinePath: f.baselinePath, decisionInputPath: f.decisionInputPath,
  autoProposalPath: f.autoProposalPath,
  ...(withOverrides ? {overridesPath: f.overridesPath} : {}),
});
const saveOverrides = (f, overrides, outputPath = f.overridesPath) => saveAutoPresentationOverridesV001({
  baselinePath: f.baselinePath, decisionInputPath: f.decisionInputPath,
  autoProposalPath: f.autoProposalPath, overrides, outputPath,
});
const newOverrides = (f, autoProposal) => createAutoPresentationOverridesV001({
  baselinePlan: f.baselinePlan, context: f.context, autoProposal,
});
const editOverride = (f, autoProposal, overrides, captionId, selection) => editAutoPresentationOverrideV001({
  baselinePlan: f.baselinePlan, context: f.context, autoProposal, overrides, captionId, selection,
});
const resolved = loaded => resolveAutoPresentationV001({baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation});

test('invalid automatic proposals are rejected before any output file is created', async t => {
  const cases = [
    ['unknown caption', f => proposal(f, {effects: [{captionId: 'missing-caption', ...focus()}]})],
    ['incomplete judgment', f => proposal(f, {completion: 'incomplete'})],
    ['extra drawing value', f => proposal(f, {effects: [{captionId: 'caption-a', ...focus(), fontColor: '#123456'}]})],
    ['unsupported partial range', f => proposal(f, {effects: [{captionId: 'caption-a', ...focus(), scope: 'substring'}]})],
  ];
  for (const [name, make] of cases) await t.test(name, async child => {
    const f = await fixture(child);
    await assert.rejects(saveAuto(f, make(f)), TypeError);
    await expectMissing(f.autoProposalPath);
  });
});

test('invalid human overrides are rejected before their output is created', async t => {
  for (const [name, entry] of [
    ['unknown caption', {captionId: 'missing-caption', role: 'Normal'}],
    ['extra drawing value', {captionId: 'caption-b', ...focus(), scale: 2}],
  ]) await t.test(name, async child => {
    const f = await fixture(child);
    const fixed = await saveAuto(f);
    const invalid = {...structuredClone(newOverrides(f, fixed)), entries: [entry]};
    await assert.rejects(saveOverrides(f, invalid), TypeError);
    await expectMissing(f.overridesPath);
    assert.deepEqual(await readJson(f.autoProposalPath), fixed);
  });
});

test('human override saving rejects omitted and undefined documents without creating a file', async t => {
  for (const explicit of [false, true]) await t.test(explicit ? 'explicit undefined' : 'omitted', async child => {
    const f = await fixture(child);
    const fixed = await saveAuto(f);
    const input = {
      baselinePath: f.baselinePath, decisionInputPath: f.decisionInputPath,
      autoProposalPath: f.autoProposalPath, outputPath: f.overridesPath,
      ...(explicit ? {overrides: undefined} : {}),
    };
    await assert.rejects(saveAutoPresentationOverridesV001(input), TypeError);
    await expectMissing(f.overridesPath);
    assert.deepEqual(await readJson(f.autoProposalPath), fixed);
  });
});

test('saved automatic judgment and human edits survive a fresh read, and saved Reset restores the automatic result', async t => {
  const f = await fixture(t);
  const originalBaseline = await readFile(f.baselinePath);
  const originalInput = await readFile(f.decisionInputPath);
  const fixed = await saveAuto(f);
  const automatic = resolved(await readAuto(f));
  let overrides = editOverride(f, fixed, newOverrides(f, fixed), 'caption-a', 'Normal');
  overrides = editOverride(f, fixed, overrides, 'caption-b', focus());
  await saveOverrides(f, overrides);

  const loaded = await readAuto(f, true);
  assert.deepEqual(loaded.autoPresentation.autoProposal, fixed);
  assert.deepEqual(loaded.autoPresentation.overrides, overrides);
  assert.equal(loaded.autoPresentation.context.baselineRef.fileSha256, byteHash(originalBaseline));
  assert.equal(loaded.autoPresentation.context.decisionInputRef.fileSha256, byteHash(originalInput));
  const edited = resolved(loaded);
  assert.deepEqual(edited.plan.elements[0], f.baselinePlan.elements[0]);
  assert.notDeepEqual(edited.plan.elements[1], f.baselinePlan.elements[1]);
  assert.deepEqual(edited.plan.elements[2], f.baselinePlan.elements[2]);

  let reset = editOverride(f, fixed, loaded.autoPresentation.overrides, 'caption-a', 'Reset');
  reset = editOverride(f, fixed, reset, 'caption-b', 'Reset');
  const resetPath = join(f.directory, 'reset-overrides.json');
  await saveOverrides(f, reset, resetPath);
  const afterReset = await loadAutoPresentationV001({...f, overridesPath: resetPath});
  assert.deepEqual(afterReset.autoPresentation.overrides.entries, []);
  assert.deepEqual(resolved(afterReset).plan, automatic.plan);
  assert.deepEqual(await readJson(f.autoProposalPath), fixed);
  assert.deepEqual(await readFile(f.baselinePath), originalBaseline);
  assert.deepEqual(await readFile(f.decisionInputPath), originalInput);
});

test('source byte changes invalidate saved judgment even when parsed JSON is unchanged', async t => {
  for (const property of ['baselinePath', 'decisionInputPath']) await t.test(property, async child => {
    const f = await fixture(child);
    const fixed = await saveAuto(f);
    await saveOverrides(f, newOverrides(f, fixed));
    const original = await readFile(f[property], 'utf8');
    await writeFile(f[property], `${original}\n`);
    assert.deepEqual(await readJson(f[property]), JSON.parse(original));
    await assert.rejects(readAuto(f, true), /proposal reference version differs/);
  });
});

test('identical files may relocate while saved proposal and override paths remain provenance', async t => {
  const f = await fixture(t);
  const fixed = await saveAuto(f);
  let overrides = editOverride(f, fixed, newOverrides(f, fixed), 'caption-a', 'Normal');
  overrides = editOverride(f, fixed, overrides, 'caption-b', focus());
  await saveOverrides(f, overrides);
  const originalResult = resolved(await readAuto(f, true));

  const directory = await mkdtemp(join(tmpdir(), 'zev-auto-presentation-relocated-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const relocated = {
    baselinePath: join(directory, 'normal-plan.json'),
    decisionInputPath: join(directory, 'confirmed-input.json'),
    autoProposalPath: join(directory, 'fixed-auto.json'),
    overridesPath: join(directory, 'human-overrides.json'),
  };
  const originalBytes = {};
  for (const property of Object.keys(relocated)) {
    originalBytes[property] = await readFile(f[property]);
    await copyFile(f[property], relocated[property]);
    assert.notEqual(relocated[property], f[property]);
    assert.deepEqual(await readFile(relocated[property]), originalBytes[property]);
  }

  const loaded = await loadAutoPresentationV001(relocated);
  assert.equal(loaded.autoPresentation.context.baselineRef.path, relocated.baselinePath);
  assert.equal(loaded.autoPresentation.context.decisionInputRef.path, relocated.decisionInputPath);
  assert.equal(loaded.autoPresentation.context.baselineRef.fileSha256, byteHash(originalBytes.baselinePath));
  assert.equal(loaded.autoPresentation.context.decisionInputRef.fileSha256, byteHash(originalBytes.decisionInputPath));
  assert.deepEqual(loaded.autoPresentation.autoProposal, fixed);
  assert.deepEqual(loaded.autoPresentation.overrides, overrides);
  for (const storedContext of [
    loaded.autoPresentation.autoProposal.proposal.context,
    loaded.autoPresentation.overrides.context,
  ]) {
    assert.equal(storedContext.baselineRef.path, f.baselinePath);
    assert.equal(storedContext.decisionInputRef.path, f.decisionInputPath);
  }
  const expectedRelocatedResult = {
    ...originalResult,
    resolution: {...originalResult.resolution, context: loaded.autoPresentation.context},
  };
  assert.deepEqual(resolved(loaded), expectedRelocatedResult);

  // The original files remain valid. Changing only the relocated bytes must
  // still fail, proving that current input paths are read rather than old ones.
  for (const property of ['baselinePath', 'decisionInputPath']) {
    await writeFile(relocated[property], Buffer.concat([originalBytes[property], Buffer.from('\n')]));
    assert.deepEqual(await readJson(relocated[property]), JSON.parse(originalBytes[property].toString('utf8')));
    await assert.rejects(loadAutoPresentationV001(relocated), /proposal reference version differs/, property);
    assert.deepEqual(resolved(await readAuto(f, true)), originalResult);
    await writeFile(relocated[property], originalBytes[property]);
  }
  assert.deepEqual(resolved(await loadAutoPresentationV001(relocated)), expectedRelocatedResult);
  for (const property of Object.keys(relocated)) {
    assert.deepEqual(await readFile(f[property]), originalBytes[property]);
    assert.deepEqual(await readFile(relocated[property]), originalBytes[property]);
  }
});

test('malformed JSON in either saved file is rejected during reload', async t => {
  for (const property of ['autoProposalPath', 'overridesPath']) await t.test(property, async child => {
    const f = await fixture(child);
    const fixed = await saveAuto(f);
    await saveOverrides(f, newOverrides(f, fixed));
    await writeFile(f[property], '{"unfinished":');
    await assert.rejects(readAuto(f, true), SyntaxError);
  });
});

test('reload revalidates drawing fields rather than trusting a saved JSON file or its checksum', async t => {
  await t.test('automatic proposal with a recomputed checksum', async child => {
    const f = await fixture(child);
    await saveAuto(f);
    const tampered = await readJson(f.autoProposalPath);
    tampered.proposal.effects[0].fontColor = '#123456';
    tampered.proposalSha256 = sha256AutoPresentationV001(tampered.proposal);
    await writeJson(f.autoProposalPath, tampered);
    await assert.rejects(readAuto(f), /unknown role, presentation, scope, or drawing field/);
  });
  await t.test('human override', async child => {
    const f = await fixture(child);
    const fixed = await saveAuto(f);
    await saveOverrides(f, editOverride(f, fixed, newOverrides(f, fixed), 'caption-b', focus()));
    const tampered = await readJson(f.overridesPath);
    tampered.entries[0].fontSizePx = 500;
    await writeJson(f.overridesPath, tampered);
    await assert.rejects(readAuto(f, true), /unknown role, presentation, scope, or drawing field/);
  });
});

test('a valid-looking edit to a saved automatic proposal cannot retain its old content hash', async t => {
  const f = await fixture(t);
  await saveAuto(f);
  const tampered = await readJson(f.autoProposalPath);
  tampered.proposal.effects[0].captionId = 'caption-b';
  await writeJson(f.autoProposalPath, tampered);
  await assert.rejects(readAuto(f), /fixed proposal content differs/);
});

test('saving again cannot replace an existing automatic proposal or human edit file', async t => {
  const f = await fixture(t);
  const fixed = await saveAuto(f);
  const beforeAuto = await readFile(f.autoProposalPath);
  await assert.rejects(saveAuto(f, proposal(f, {effects: []})), {code: 'EEXIST'});
  assert.deepEqual(await readFile(f.autoProposalPath), beforeAuto);

  const original = newOverrides(f, fixed);
  await saveOverrides(f, original);
  const beforeOverrides = await readFile(f.overridesPath);
  const different = editOverride(f, fixed, original, 'caption-a', 'Normal');
  await assert.rejects(saveOverrides(f, different), {code: 'EEXIST'});
  assert.deepEqual(await readFile(f.overridesPath), beforeOverrides);
  assert.deepEqual((await readAuto(f, true)).autoPresentation.overrides, original);
});

test('unresolved and unrepresentable cases remain exceptions after saving and reloading', async t => {
  const f = await fixture(t);
  await saveAuto(f, proposal(f, {effects: [], exceptions: [
    {captionId: 'caption-a', status: 'unrepresentable', reason: 'This selected intent needs a partial range.'},
    {captionId: 'caption-b', status: 'unresolved', reason: 'The necessary vocal evidence was not observed.'},
  ]}));
  const result = resolved(await readAuto(f));
  assert.deepEqual(result.plan, f.baselinePlan);
  assert.equal(result.resolution.automaticStatus, 'complete-with-exceptions');
  assert.deepEqual(result.resolution.captions.map(row => row.automaticStatus),
    ['unrepresentable', 'unresolved', 'normal']);
  assert.equal(result.resolution.exceptions.length, 2);
});
