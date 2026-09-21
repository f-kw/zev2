import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, writeFile, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createR1CaptionSourceV001, resolveR1CaptionRepairsV001, restoreR1CaptionRepairsV001,
  cancelR1CaptionRepairV001, projectR1CaptionRangeV001, loadR1CaptionRepairsV001} from './r1-caption-plan.mjs';
import {indexExplicitLinesV001, PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';

const clone = structuredClone;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ref = (name, bytes) => ({path: '/fixture/r1/' + name, fileSha256: sha(bytes), bytes: Buffer.byteLength(bytes)});
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
function fixture({mutateEvidence = () => {}, mutatePlan = () => {}} = {}) {
  const caption = (id, text, start, end) => ({instructionId: id, kind: 'speech-caption', text,
    startFrame: start, endFrameExclusive: end, displayFrameCount: end - start,
    indexedLines: indexExplicitLinesV001([text]).indexedLines.map(line => ({...line,
      sourceUnitIds: [...text].map((_, i) => id + '-atom-' + i), logicalWidth: [...text].length * 2})),
    visualState: {textStyle: {fontSizePx: 94, fontColor: '#FFFDF8'}, layout: {maxCharsPerLine: 36, maxLines: 2}},
    transition: {entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}},
    targetProvenance: {targetRefId: 'fixture', targetType: 'semantic-caption',
      sourceAtomIds: [...text].map((_, i) => id + '-atom-' + i)}, materialRefs: []});
  const normalPlan = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas: {fps: 30, width: 1920, height: 1080},
    layoutRules: {characterWidthRule: PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001},
    elements: [caption('a', '使ったのに撃てないかー', 10, 100), caption('b', '別の字幕', 110, 140),
      caption('c', '提示前の発話', 160, 180), caption('d', '仲間', 180, 186)]};
  mutatePlan(normalPlan);
  const normalPlanBytes = JSON.stringify(normalPlan), normalPlanRef = ref('normal.json', normalPlanBytes);
  const policyBytes = 'explicit instruction', policyRef = ref('policy.txt', policyBytes);
  const observationBytes = JSON.stringify({words: [{text: '使ったのに', start: 10, end: 40}, {text: '撃てないかー', start: 42, end: 100}]});
  const observationRef = ref('observation.json', observationBytes);
  const evidence = {schemaVersion: 'r1-caption-boundary-evidence-v001', normalPlanRef, policyRef,
    clockId: 'fixture-edited-global-frames', frameCount: 200, sourceRefs: [observationRef], repairs: [
      {repairId: 'split-a', parentCaptionId: 'a', parentText: '使ったのに撃てないかー', parentRange: range(10, 100),
        action: 'replace', reason: 'Split two saved phrases.', inference: 'Saved words give a comparison candidate.',
        observations: [{sourceRef: observationRef, locator: '/words', meaning: 'Saved phrase observations.'}],
        children: [{startCodePoint: 0, endCodePointExclusive: 5, range: range(10, 40), boundaryBasis: 'first saved phrase'},
          {startCodePoint: 5, endCodePointExclusive: 11, range: range(42, 100), boundaryBasis: 'second saved phrase'}]},
      {repairId: 'hide-c', parentCaptionId: 'c', parentText: '提示前の発話', parentRange: range(160, 180),
        action: 'hide', reason: 'Speech precedes the short clip.', inference: 'Local hiding is explicitly allowed.',
        observations: [{sourceRef: observationRef, locator: '/words', meaning: 'Saved speech is outside the clip.'}],
        children: [], reviewRange: range(160, 200), correspondingSpeechRange: range(145, 159)},
    ]};
  mutateEvidence(evidence);
  const evidenceBytes = JSON.stringify(evidence), evidenceRef = ref('evidence.json', evidenceBytes);
  const input = {normalPlanRef, normalPlanBytes, evidenceRef, evidenceBytes, policyRef, policyBytes};
  const source = createR1CaptionSourceV001(input);
  return {source, input, evidence, normalPlan, observationBytes,
    resolve: () => resolveR1CaptionRepairsV001({source, activeRepairIds: ['split-a', 'hide-c']})};
}

test('exact source characters, child atom ownership and untouched captions survive splitting', () => {
  const f = fixture(), result = f.resolve(), children = result.normalPlan.elements.filter(row => row.instructionId.startsWith('a-'));
  assert.deepEqual(children.map(row => row.text), ['使ったのに', '撃てないかー']);
  assert.equal(children.map(row => row.text).join(''), f.normalPlan.elements[0].text);
  assert.deepEqual(children.flatMap(row => row.targetProvenance.sourceAtomIds), f.normalPlan.elements[0].targetProvenance.sourceAtomIds);
  assert.deepEqual(children.map(row => row.displayFrameCount), [30, 58]);
  for (const id of ['b', 'd']) assert.deepEqual(result.normalPlan.elements.find(row => row.instructionId === id),
    f.normalPlan.elements.find(row => row.instructionId === id));
  assert(!result.normalPlan.elements.some(row => row.instructionId === 'c'));
  assert.equal(result.captionMappings[1].originalText, '提示前の発話');
});

test('save/reload recomputes selected repairs, and local cancellation preserves other work', () => {
  const f = fixture(), saved = JSON.parse(JSON.stringify(f.resolve()));
  assert.deepEqual(restoreR1CaptionRepairsV001({source: f.source, saved}), f.resolve());
  const cancelled = cancelR1CaptionRepairV001({source: f.source, saved, repairId: 'split-a'});
  assert.deepEqual(cancelled.normalPlan.elements[0], f.normalPlan.elements[0]);
  assert(!cancelled.normalPlan.elements.some(row => row.instructionId === 'c'));
  assert.deepEqual(resolveR1CaptionRepairsV001({source: f.source, activeRepairIds: []}).normalPlan, f.normalPlan);
});

test('short projection preserves duration and rejects second projection or truncated captions', () => {
  const f = fixture(), result = f.resolve();
  const projected = projectR1CaptionRangeV001({resolved: result, range: range(10, 140), targetClockId: 'fixture-short'});
  assert.equal(projected.frameCount, 130); assert.equal(projected.normalPlan.elements[0].startFrame, 0);
  assert.equal(projected.normalPlan.elements[1].startFrame, 32);
  assert.equal(projected.normalPlan.elements[1].displayFrameCount, 58);
  assert.throws(() => projectR1CaptionRangeV001({resolved: projected, range: range(0, 130), targetClockId: 'second'}));
  assert.throws(() => projectR1CaptionRangeV001({resolved: result, range: range(11, 140), targetClockId: 'fixture-short'}), /truncate/);
  assert.throws(() => projectR1CaptionRangeV001({resolved: result, range: range(10, 140), targetClockId: result.clockId}));
});

for (const [name, mutate] of [
  ['missing source character', evidence => evidence.repairs[0].children[1].startCodePoint++],
  ['repeated source character', evidence => evidence.repairs[0].children[1].startCodePoint--],
  ['text replacement', evidence => evidence.repairs[0].parentText = '別の語'],
  ['missing observation', evidence => evidence.repairs[0].observations = []],
  ['unbound observation', evidence => evidence.repairs[0].observations[0].sourceRef = {...evidence.repairs[0].observations[0].sourceRef, fileSha256: '0'.repeat(64)}],
  ['unsupported action', evidence => evidence.repairs[0].action = 'rewrite'],
  ['empty duration', evidence => evidence.repairs[0].children[0].range.endFrameExclusive = 10],
  ['overlapping child times', evidence => evidence.repairs[0].children[1].range.startFrame = 39],
  ['unexplained child time', evidence => evidence.repairs[0].children[0].boundaryBasis = ''],
  ['hide in-range speech', evidence => evidence.repairs[1].correspondingSpeechRange = range(161, 170)],
  ['hide beyond selected review', evidence => evidence.repairs[1].reviewRange.startFrame = 161],
]) test(name + ' is rejected before rendering', () => assert.throws(() => fixture({mutateEvidence: mutate})));

test('repair cannot overlap another subtitle or run after effects', () => {
  const f = fixture({mutateEvidence: evidence => evidence.repairs[0].children[1].range.endFrameExclusive = 120});
  assert.throws(f.resolve, /overlaps/);
  assert.throws(() => fixture({mutatePlan: plan => plan.elements[0].presentationMotion = {presetId: 'fixture'}}), /precede/);
});

test('changed input bytes and rewritten saved plans are rejected', () => {
  const f = fixture();
  assert.throws(() => createR1CaptionSourceV001({...f.input, normalPlanBytes: f.input.normalPlanBytes + ' '}), /bytes differ/);
  for (const mutate of [saved => saved.normalPlan.elements[0].text = '違う',
    saved => saved.normalPlan.elements[0].startFrame++, saved => saved.captionMappings[0].children[0].endCodePointExclusive++,
    saved => saved.sourceIdentity.clockId = 'short-clock', saved => saved.activeRepairIds.pop()]) {
    const saved = clone(f.resolve()); mutate(saved);
    assert.throws(() => restoreR1CaptionRepairsV001({source: f.source, saved}));
  }
  assert.throws(() => resolveR1CaptionRepairsV001({source: clone(f.source), activeRepairIds: []}), /freshly/);
});

test('fresh process reload verifies saved observation bytes, including later tampering', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'r1-caption-test-'));
  try {
    const f = fixture();
    const observationPath = path.join(dir, 'observation.json'); await writeFile(observationPath, f.observationBytes);
    const normalPath = path.join(dir, 'normal.json'); await writeFile(normalPath, f.input.normalPlanBytes);
    const policyPath = path.join(dir, 'policy.txt'); await writeFile(policyPath, f.input.policyBytes);
    const localRef = async file => {const bytes = await readFile(file); return {path: file, bytes: bytes.length, fileSha256: sha(bytes)};};
    const normalPlanRef = await localRef(normalPath), policyRef = await localRef(policyPath), observationRef = await localRef(observationPath);
    const evidence = clone(f.evidence); evidence.normalPlanRef = normalPlanRef; evidence.policyRef = policyRef;
    evidence.sourceRefs = [observationRef]; evidence.repairs.forEach(repair => repair.observations.forEach(row => row.sourceRef = observationRef));
    const evidencePath = path.join(dir, 'evidence.json'); await writeFile(evidencePath, JSON.stringify(evidence));
    const evidenceRef = await localRef(evidencePath);
    const source = createR1CaptionSourceV001({...f.input, normalPlanRef, policyRef, evidenceRef, evidenceBytes: await readFile(evidencePath)});
    const savedPath = path.join(dir, 'saved.json'); const saved = resolveR1CaptionRepairsV001({source, activeRepairIds: ['split-a', 'hide-c']});
    await writeFile(savedPath, JSON.stringify(saved));
    const script = `import {loadR1CaptionRepairsV001} from ${JSON.stringify(new URL('./r1-caption-plan.mjs', import.meta.url).href)};
      const result = await loadR1CaptionRepairsV001({savedPath: process.argv[1]}); process.stdout.write(result.repairVersion);`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, savedPath], {encoding: 'utf8'});
    assert.equal(child.status, 0, child.stderr); assert.equal(child.stdout, saved.repairVersion);
    await writeFile(observationPath, f.observationBytes + ' ');
    await assert.rejects(loadR1CaptionRepairsV001({savedPath}), /bytes differ/);
  } finally {await rm(dir, {recursive: true, force: true});}
});
