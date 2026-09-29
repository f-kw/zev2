import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalSha256} from './clock.mjs';
import {createDigestStructureAutoPlanV001, createDigestStructureOverridesV001,
  editDigestStructureOverrideV001, resetDigestStructureOverrideV001, resolveDigestStructureV001,
  exportDigestStructureStateV001, restoreDigestStructureStateV001} from './digest-structure-policy.mjs';

const clone = structuredClone;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const serialize = value => JSON.stringify(value, null, 2) + '\n';
const byteRef = (path, bytes) => ({path, bytes: Buffer.byteLength(bytes), fileSha256: sha(bytes)});
function fixture() {
  const sourceRef = {path: '/tmp/digest-structure-source.mp4', bytes: 16, fileSha256: sha('source-fixture')};
  const fragments = [
    {id: 1, startMs: 1000, endMs: 1400, text: '今日は'}, {id: 2, startMs: 1400, endMs: 2000, text: '監視です。'},
    {id: 3, startMs: 3000, endMs: 3400, text: '異変を'}, {id: 4, startMs: 3400, endMs: 4000, text: '見つけた。'},
    {id: 5, startMs: 5000, endMs: 5400, text: '商品を'}, {id: 6, startMs: 5400, endMs: 6000, text: '紹介します。'},
    {id: 7, startMs: 7000, endMs: 7400, text: '投げ銭を'}, {id: 8, startMs: 7400, endMs: 8000, text: '読みます。'},
    {id: 9, startMs: 9000, endMs: 10000, text: '今日はありがとうございました。'},
  ];
  const transcript = {sourceUri: sourceRef.path, segments: fragments};
  const segment = (segmentId, candidateId, role, ids) => {
    const rows = ids.map(id => fragments.find(row => row.id === id));
    return {segmentId, candidateId, role, sourceStartMs: rows[0].startMs, sourceEndMs: rows.at(-1).endMs,
      sourceSegmentIds: ids, reason: role + 'を保存された文脈から判断した。',
      evidence: {sourceSegmentIds: ids, excerpt: rows.map(row => row.text).join('')}};
  };
  const segments = [segment('intro', null, 'intro', [1, 2]), segment('main', 'c1', 'main', [3, 4]),
    segment('goods', 'c2', 'exclude-goods', [5, 6]), segment('superchat', 'c3', 'exclude-superchat', [7, 8]),
    segment('closure', null, 'closure', [9])];
  const prior = {sourceVideoBinding: {path: sourceRef.path, fileSha256: sourceRef.fileSha256},
    segments: segments.slice(1, 4).map(({segmentId, candidateId, sourceStartMs, sourceEndMs, sourceSegmentIds}) =>
      ({segmentId, candidateId, sourceStartMs, sourceEndMs, sourceSegmentIds}))};
  const transcriptBytes = serialize(transcript), priorEditPlanBytes = serialize(prior);
  return {sourceRef, transcriptRef: byteRef('/tmp/transcript.json', transcriptBytes), transcriptBytes,
    priorEditPlanRef: byteRef('/tmp/prior-edit-plan.json', priorEditPlanBytes), priorEditPlanBytes,
    theme: 'ホラーゲームの監視と結果', segments,
    sourceClock: {fps: 60, decodedFrameCount: 1200, logicalFrameCount: 600, presentationOffsetMs: 0},
    audioClock: {sampleRate: 44100, channels: 2, sourceGridMappingEndSample: 882000}};
}
function initial(input = fixture()) {
  const autoPlan = createDigestStructureAutoPlanV001(input);
  const overrides = createDigestStructureOverridesV001({autoPlan});
  return {autoPlan, overrides};
}
const resolve = value => resolveDigestStructureV001(value);
const edit = (state, segmentId, include) => ({...state, overrides: editDigestStructureOverrideV001({...state, segmentId, include})});
const reset = (state, segmentId) => ({...state, overrides: resetDigestStructureOverrideV001({...state, segmentId})});
const bindInputs = input => {
  input.transcriptRef = byteRef(input.transcriptRef.path, input.transcriptBytes);
  input.priorEditPlanRef = byteRef(input.priorEditPlanRef.path, input.priorEditPlanBytes);
};

test('fixed context judgments produce finite roles and existing exact source frame/sample mappings', () => {
  const input = fixture(), before = clone(input), state = initial(input), result = resolve(state);
  assert.deepEqual(input, before);
  assert.equal(state.autoPlan.judgmentOrigin, 'codex-explicit-saved-source-context-review');
  assert.deepEqual(result.selectedSegments.map(row => row.segmentId), ['intro', 'main', 'closure']);
  assert.deepEqual(result.baseMappings.map(row => [row.sourceStartFrame30, row.sourceEndFrame30,
    row.outputStartFrame, row.outputEndFrame]), [[30, 60, 0, 30], [90, 120, 30, 60], [270, 300, 60, 90]]);
  assert.deepEqual(result.baseMappings[1].audioSamples,
    {sourceStart: 132300, sourceEnd: 176400, outputStart: 44100, outputEnd: 88200});
  assert.equal(result.frameCount, 90); assert.equal(result.humanQuality, 'not-evaluated');
  assert.deepEqual(result.diff.added, ['intro', 'closure']);
  assert.deepEqual(result.diff.removed, ['goods', 'superchat']);
  assert.equal(result.diff.relativeOrderChanged, false);
  assert.equal(result.diff.orderMapping.find(row => row.segmentId === 'main').baseShiftFrames, 30);
  assert(Object.isFrozen(state.autoPlan.segments[0]));
});

test('no intro or closure is a valid explicitly absent choice; related side topic stays intact', () => {
  const input = fixture(); input.segments = input.segments.filter(row => !['intro', 'closure'].includes(row.role));
  input.segments[1].role = 'related-side-topic';
  const state = initial(input), result = resolve(state);
  assert.deepEqual(result.selectedSegments.map(row => row.segmentId), ['main', 'goods']);
  assert.throws(() => edit(state, 'goods', false), /main\/related override/);
});

test('one override changes only its target; Reset removes it and restores the saved automatic proposal', () => {
  const original = initial(), autoBytes = serialize(original.autoPlan), base = resolve(original);
  const introOff = edit(original, 'intro', false), closureOff = edit(introOff, 'closure', false);
  const goodsOn = edit(closureOff, 'goods', true);
  assert.deepEqual(goodsOn.overrides.entries, [{segmentId: 'intro', include: false},
    {segmentId: 'goods', include: true}, {segmentId: 'closure', include: false}]);
  assert.deepEqual(resolve(goodsOn).selectedSegments.map(row => row.segmentId), ['main', 'goods']);
  assert.equal(serialize(goodsOn.autoPlan), autoBytes);
  assert.deepEqual(original.overrides.entries, []);
  const withoutGoods = reset(goodsOn, 'goods');
  assert.deepEqual(withoutGoods.overrides.entries, closureOff.overrides.entries);
  const restored = reset(reset(withoutGoods, 'intro'), 'closure');
  assert.deepEqual(restored.overrides, original.overrides);
  assert.deepEqual(resolve(restored), base);
  assert.deepEqual(reset(restored, 'closure'), restored);
  assert.deepEqual(edit(introOff, 'intro', true), original);
});

test('exclude restoration preserves all original candidate fragments and exposes explicit old/new correspondence', () => {
  const original = initial(); const result = resolve(edit(edit(original, 'goods', true), 'superchat', true));
  assert.deepEqual(result.diff.removed, []);
  assert.deepEqual(result.selectedSegments.map(row => row.segmentId), ['intro', 'main', 'goods', 'superchat', 'closure']);
  assert.deepEqual(result.diff.orderMapping.filter(row => row.priorOrdinal !== null).map(row =>
    [row.segmentId, row.priorOrdinal, row.outputOrdinal, row.timelineSegmentId]),
  [['main', 1, 2, 'segment-0002'], ['goods', 2, 3, 'segment-0003'], ['superchat', 3, 4, 'segment-0004']]);
  for (const row of result.selectedSegments) assert.deepEqual(row, original.autoPlan.segments.find(x => x.segmentId === row.segmentId));
  assert.throws(() => edit(original, 'goods', false), /use Reset/);
});

test('main/unknown targets and nonboolean controls cannot edit structure', () => {
  const state = initial();
  for (const [segmentId, include] of [['main', false], ['main', true], ['missing', true], ['intro', 'false'], ['intro', null]])
    assert.throws(() => edit(state, segmentId, include), /DIGEST_STRUCTURE_INVALID/);
  assert.throws(() => reset(state, 'main'), /main\/related/);
});

test('source order and overlap are rejected, never repaired by sorting', () => {
  const wrongOrder = fixture(); [wrongOrder.segments[0], wrongOrder.segments[1]] = [wrongOrder.segments[1], wrongOrder.segments[0]];
  assert.throws(() => initial(wrongOrder), /source order\/range\/frame\/audio/);
  const overlap = fixture();
  overlap.segments[0].sourceSegmentIds = [1, 2, 3, 4]; overlap.segments[0].sourceEndMs = 4000;
  assert.throws(() => initial(overlap), /source order\/range\/frame\/audio/);
});

test('a closure before a restored candidate needs explicit disabling; other overrides are never silently changed', () => {
  const input = fixture(), transcript = JSON.parse(input.transcriptBytes);
  transcript.segments.find(row => row.id === 9).startMs = 4500; transcript.segments.find(row => row.id === 9).endMs = 4900;
  transcript.segments.sort((a, b) => a.startMs - b.startMs);
  input.transcriptBytes = serialize(transcript); bindInputs(input);
  const closure = input.segments.pop(); closure.sourceStartMs = 4500; closure.sourceEndMs = 4900;
  input.segments.splice(2, 0, closure);
  const state = initial(input), before = serialize(state);
  assert.throws(() => edit(state, 'goods', true), /closure must be the final/);
  assert.equal(serialize(state), before);
  const possible = edit(edit(state, 'closure', false), 'goods', true);
  assert.deepEqual(resolve(possible).selectedSegments.map(row => row.segmentId), ['intro', 'main', 'goods']);
  assert.throws(() => reset(possible, 'closure'), /closure must be the final/);
});

test('saved prior candidates cannot be dropped from catalog, reidentified, trimmed or internally repartitioned', () => {
  for (const mutate of [
    input => input.segments.splice(2, 1),
    input => {input.segments[1].candidateId = 'unrelated';},
    input => {input.segments[1].segmentId = 'replacement';},
    input => {input.segments[1].sourceStartMs = 3400; input.segments[1].sourceSegmentIds = [4];},
    input => {input.segments[1].sourceSegmentIds.reverse();},
  ]) {const input = fixture(); mutate(input); assert.throws(() => initial(input), /DIGEST_STRUCTURE_INVALID/);}
});

test('new source candidates cannot add new main roles and evidence must quote actual ordered fragments', () => {
  for (const mutate of [
    input => {input.segments[0].role = 'free-planner';},
    input => {input.segments[0].role = 'main';},
    input => {input.segments[0].evidence.excerpt = '生成した説明です';},
    input => {input.segments[0].evidence.sourceSegmentIds = [999];},
    input => {input.segments[0].evidence.sourceSegmentIds = [2, 1];},
    input => {input.segments[0].evidence = {};},
    input => {input.segments[0].reason = '';},
  ]) {const input = fixture(); mutate(input); assert.throws(() => initial(input), /DIGEST_STRUCTURE_INVALID/);}
});

test('source reference forgery, incorrect file SHA, byte count and missing transcript clocks are refused', () => {
  for (const mutate of [
    input => {input.sourceRef.fileSha256 = '0'.repeat(64);},
    input => {input.transcriptRef.fileSha256 = '0'.repeat(64);},
    input => {input.priorEditPlanRef.bytes++;},
    input => {input.transcriptBytes += ' ';},
    input => {input.transcriptBytes = serialize({...JSON.parse(input.transcriptBytes), sourceUri: '/tmp/other.mp4'}); bindInputs(input);},
    input => {const t = JSON.parse(input.transcriptBytes); delete t.segments[0].startMs; input.transcriptBytes = serialize(t); bindInputs(input);},
  ]) {const input = fixture(); mutate(input); assert.throws(() => initial(input), /DIGEST_STRUCTURE_INVALID/);}
});

test('missing interior fragments and source-rounded interval changes are refused', () => {
  const input = fixture(); input.segments[0].sourceStartMs++;
  assert.throws(() => initial(input), /source envelope|first\/last/);
  const gap = fixture(); gap.segments[0].sourceSegmentIds = [1, 3]; gap.segments[0].sourceEndMs = 3400;
  assert.throws(() => initial(gap), /interior fragment/);
});

test('save/reload rederives hashes, choices, source mappings and diff from original bytes', () => {
  const input = fixture(), state = edit(edit(initial(input), 'intro', false), 'goods', true);
  const saved = exportDigestStructureStateV001(state), wire = JSON.parse(JSON.stringify(saved));
  const result = restoreDigestStructureStateV001({saved: wire, transcriptBytes: input.transcriptBytes, priorEditPlanBytes: input.priorEditPlanBytes});
  assert.deepEqual(result.autoPlan, state.autoPlan); assert.deepEqual(result.overrides, state.overrides);
  assert.deepEqual(result.resolution, resolve(state));
  assert.deepEqual(exportDigestStructureStateV001(result), saved);
  assert.throws(() => resolve({autoPlan: clone(state.autoPlan), overrides: state.overrides}), /created or restored/);
});

test('tampered saved automatic plans, override entries, missing fields and resolved hashes do not restore', () => {
  const input = fixture(), saved = exportDigestStructureStateV001(initial(input));
  for (const mutate of [
    value => {value.autoPlan.segments[0].sourceStartMs++;},
    value => {delete value.overrides.entries;},
    value => {value.expectedResolutionSha256 = '0'.repeat(64);},
    value => {value.overrides.entries = [{segmentId: 'main', include: false}];},
    value => {value.overrides.entries = [{segmentId: 'intro', include: false}, {segmentId: 'intro', include: false}];},
    value => {value.overrides.entries = [{segmentId: 'intro', include: true}];},
  ]) {
    const value = clone(saved); mutate(value);
    // Even recomputing outer hashes cannot make source-invalid changes valid.
    if (Array.isArray(value.overrides.entries)) {
      const {overridesSha256, ...body} = value.overrides; value.overrides.overridesSha256 = canonicalSha256(body);
    }
    const {stateSha256, ...body} = value; value.stateSha256 = canonicalSha256(body);
    assert.throws(() => restoreDigestStructureStateV001({saved: value, transcriptBytes: input.transcriptBytes,
      priorEditPlanBytes: input.priorEditPlanBytes}), /DIGEST_STRUCTURE_INVALID/);
  }
});

test('a separate process restores the same selected source/frame/sample correspondence without an AI call', () => {
  const input = fixture(), state = edit(initial(input), 'superchat', true), saved = exportDigestStructureStateV001(state);
  const module = new URL('./digest-structure-policy.mjs', import.meta.url).href;
  const program = `import fs from 'node:fs';import {restoreDigestStructureStateV001} from ${JSON.stringify(module)};
    const input=JSON.parse(fs.readFileSync(0,'utf8'));const r=restoreDigestStructureStateV001(input);
    process.stdout.write(JSON.stringify(r.resolution));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
    input: JSON.stringify({saved, transcriptBytes: input.transcriptBytes, priorEditPlanBytes: input.priorEditPlanBytes}),
    encoding: 'utf8', cwd: fileURLToPath(new URL('../..', import.meta.url)), timeout: 15000});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), resolve(state));
});
