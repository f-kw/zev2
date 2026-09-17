import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {AUTO_PRESENTATION_RULES_REF_V007, sha256AutoPresentationV001, sha256AutoPresentationStateV001,
  fixAutoPresentationProposalV001, createAutoPresentationOverridesV001,
  editAutoPresentationOverrideV001, resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {loadAutoPresentationContextV001, loadAutoPresentationV001, saveFixedAutoPresentationV001}
  from './presentation_auto_effects_io_v001.mjs';
import {runAutoPresentationEditV001, parseAutoPresentationEditArgsV001} from './edit_auto_presentation_v001.mjs';

const motion = name => ({role: `${name} accent`, presentation: `provisional-${name.toLowerCase()}`, scope: 'whole-caption'});
const clone = value => structuredClone(value);
const write = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
function fixture() {
  const baselinePlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30}, provenance: {retained: ['fixed-original-segment']},
    elements: ['a', 'b', 'c', 'd'].map((instructionId, i) => ({instructionId, kind: 'speech-caption', text: '条件😀\nそのまま',
      indexedLines: [{lineIndex: 0, text: '条件😀'}, {lineIndex: 1, text: 'そのまま'}],
      startFrame: i * 60, endFrameExclusive: (i + 1) * 60, displayFrameCount: 60,
      sourceMapping: {startFrame: 900 + i * 60, endFrameExclusive: 960 + i * 60},
      visualState: {textStyle: {fontSizePx: 96, fontColor: '#FFFDF8'},
        position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6}}}))};
  const context = {baselineRef: {path: '/synthetic/normal.json', fileSha256: 'a'.repeat(64),
    canonicalSha256: sha256AutoPresentationV001(baselinePlan)}, decisionInputRef: {path: '/synthetic/decision.json', fileSha256: 'b'.repeat(64)},
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V007, pulseTimingEvidence: null};
  return {baselinePlan, context};
}
const proposal = (f, name = 'Bounce') => ({schemaVersion: 'auto-presentation-proposal-v001', context: clone(f.context),
  targetCaptionIds: ['a', 'b', 'c'], completion: 'complete', effects: [{captionId: 'a', ...motion(name)},
    {captionId: 'b', role: 'Focus', presentation: 'provisional-focus', scope: 'partial-caption', targetText: '条件😀'}],
  exceptions: [{captionId: 'c', status: 'unrepresentable', reason: 'Synthetic: intended expression cannot fit'}]});
const fixed = (f, name) => fixAutoPresentationProposalV001({...f, proposal: proposal(f, name)});

test('entrance expressions preserve the normal plan and Color range while Normal and Reset retain fixed proposals', () => {
  for (const name of ['Bounce', 'Shake']) {
    const f = fixture(), before = clone(f), autoProposal = fixed(f, name), args = {...f, autoProposal};
    const automatic = resolveAutoPresentationV001(args), proposed = JSON.stringify(autoProposal);
    const normalElement = clone(automatic.plan.elements[0]);
    assert.deepEqual(normalElement.presentationMotion,
      {presentation: motion(name).presentation, presetVersion: 'presentation-caption-motion-v001'});
    delete normalElement.presentationMotion;
    assert.deepEqual(normalElement, f.baselinePlan.elements[0]);
    assert.deepEqual(automatic.plan.elements[1].presentationColorRange,
      {startCodePoint: 0, endCodePointExclusive: 3, fontColor: '#FFD65A'});
    for (const selection of [motion('Bounce'), motion('Shake'), 'Normal']) {
      const overrides = editAutoPresentationOverrideV001({...args, overrides: createAutoPresentationOverridesV001(args), captionId: 'a', selection});
      const changed = resolveAutoPresentationV001({...args, overrides});
      assert.deepEqual(changed.plan.elements.slice(1), automatic.plan.elements.slice(1));
      const reset = editAutoPresentationOverrideV001({...args, overrides, captionId: 'a', selection: 'Reset'});
      assert.deepEqual(reset.entries, []);
      assert.deepEqual(resolveAutoPresentationV001({...args, overrides: reset}).plan, automatic.plan);
    }
    assert.equal(JSON.stringify(autoProposal), proposed); assert.deepEqual(f, before);
    assert.equal(automatic.resolution.captions[2].automaticStatus, 'unrepresentable');
    assert.equal(automatic.resolution.captions[3].automaticStatus, 'not-processed');
  }
});

test('unknown expressions, fields, partial ranges, duplicate IDs and previous rules cannot enter saved plans', () => {
  const f = fixture();
  for (const name of ['Bounce', 'Shake']) {
    const badSelections = [
      {...motion(name), presentation: 'unknown'}, {...motion(name), role: 'Unknown accent'},
      {...motion(name), scope: 'partial-caption', targetText: '条件'},
      ...Object.entries({anchorPeakId: 'p-1', presetVersion: 'unknown', fontSizePx: 100, offsetX: 1,
        startFrame: 2, keyframes: [], filter: 'scale=2', color: '#FFFFFF'}).map(([key, value]) => ({...motion(name), [key]: value})),
    ];
    for (const selection of badSelections) {
      const p = proposal(f, name); p.effects[0] = {captionId: 'a', ...selection};
      assert.throws(() => fixAutoPresentationProposalV001({...f, proposal: p}), TypeError);
      assert.throws(() => editAutoPresentationOverrideV001({...f, overrides: createAutoPresentationOverridesV001(f),
        captionId: 'a', selection}), TypeError);
    }
  }
  for (const captionId of ['unknown', 'b']) {
    const p = proposal(f); p.effects[0].captionId = captionId;
    assert.throws(() => fixAutoPresentationProposalV001({...f, proposal: p}), /outside|duplicate/);
  }
  const old = clone(f); old.context.renderingRulesRef.version = 'auto-presentation-rules-v006';
  const oldProposal = proposal(old), oldFixed = {schemaVersion: 'fixed-auto-presentation-v001', proposal: oldProposal,
    proposalSha256: sha256AutoPresentationStateV001(oldProposal)};
  assert.throws(() => resolveAutoPresentationV001({...old, autoProposal: oldFixed}), /rules version/);
  const resolvedBase = clone(f); resolvedBase.baselinePlan.elements[0].presentationMotion =
    {presentation: 'provisional-bounce', presetVersion: 'unknown'};
  resolvedBase.context.baselineRef.canonicalSha256 = sha256AutoPresentationV001(resolvedBase.baselinePlan);
  assert.throws(() => resolveAutoPresentationV001(resolvedBase), /fixed normal/);
});

test('each expression checks its own complete duration and never lengthens the fixed subtitle', () => {
  for (const [name, minimum] of [['Bounce', 20], ['Shake', 24]]) {
    const f = fixture(), element = f.baselinePlan.elements[0];
    element.endFrameExclusive = minimum; element.displayFrameCount = minimum;
    f.context.baselineRef.canonicalSha256 = sha256AutoPresentationV001(f.baselinePlan);
    assert.doesNotThrow(() => fixed(f, name));
    element.endFrameExclusive--; element.displayFrameCount--;
    f.context.baselineRef.canonicalSha256 = sha256AutoPresentationV001(f.baselinePlan);
    assert.throws(() => fixed(f, name), /stable frames/);
  }
});

test('CLI saves entrance changes to new files, reloads them, and Reset restores the exact fixed automatic assignment', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'zev-motion-storage-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const files = {baselinePath: join(directory, 'normal.json'), decisionInputPath: join(directory, 'decision.json'),
    autoProposalPath: join(directory, 'fixed-auto.json')};
  await write(files.baselinePath, fixture().baselinePlan);
  await write(files.decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: null});
  const loaded = await loadAutoPresentationContextV001(files);
  await saveFixedAutoPresentationV001({...files, proposal: proposal(loaded), outputPath: files.autoProposalPath});
  const beforeBytes = await Promise.all(Object.values(files).map(file => readFile(file)));
  const initial = await loadAutoPresentationV001(files);
  const automatic = resolveAutoPresentationV001({baselinePlan: initial.baselinePlan, ...initial.autoPresentation});
  const baseArgs = ['--baseline', files.baselinePath, '--decision-input', files.decisionInputPath, '--auto', files.autoProposalPath];
  let overridesPath;
  for (const [index, action] of ['shake', 'normal', 'reset', 'bounce', 'normal', 'reset'].entries()) {
    const outputPath = join(directory, `edit-${index}.json`), lines = [];
    const args = [action, ...baseArgs, '--caption-id', 'a', '--output', outputPath,
      ...(overridesPath ? ['--overrides', overridesPath] : [])];
    const result = await runAutoPresentationEditV001(args, line => lines.push(line));
    assert.equal(result.status, 'saved');
    const reloaded = await loadAutoPresentationV001({...files, overridesPath: outputPath});
    const resolved = resolveAutoPresentationV001({baselinePlan: reloaded.baselinePlan, ...reloaded.autoPresentation});
    assert.deepEqual(resolved.plan.elements.slice(1), automatic.plan.elements.slice(1));
    if (action === 'reset') assert.deepEqual(resolved.plan, automatic.plan);
    else if (action === 'normal') assert.deepEqual(resolved.plan.elements[0], initial.baselinePlan.elements[0]);
    else assert.match(lines.join('\n'), new RegExp(`${action === 'bounce' ? 'Bounce' : 'Shake'} Accent`));
    overridesPath = outputPath;
  }
  assert.deepEqual(await Promise.all(Object.values(files).map(file => readFile(file))), beforeBytes);
  for (const action of ['bounce', 'shake']) for (const extra of [['--peak', 'p-1'], ['--target', '条件'], ['--size', '112']]) {
    assert.throws(() => parseAutoPresentationEditArgsV001([action, ...baseArgs, '--caption-id', 'a', '--output', 'unused', ...extra]), TypeError);
  }
  await write(files.decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v004', pulseTimingEvidence: null});
  await assert.rejects(loadAutoPresentationContextV001(files), /forward-only decision input v005/);
});
