#!/usr/bin/env node
/** Stage-II development fixture. Uses saved real excerpts; performs no selection by AI.
 * node connection_expression_fixture_v001.mjs --manifest /abs/input.json --output /abs/new-dir
 * Rendering and independent media validation are kept separate. No original media is rewritten.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {
  createConnectionExpressionContextV001 as contextFrom,
  createConnectionExpressionOriginalV001 as makeOriginal,
  createConnectionExpressionOverridesV001 as makeOverrides,
  setConnectionExpressionOverrideV001 as change,
  resetConnectionExpressionOverrideV001 as reset,
  resolveConnectionExpressionV001 as resolve,
  buildConnectionExpressionTimelineFiltersV001 as filters,
} from './connection_expression_v001.mjs';

const json = x => JSON.stringify(x, null, 2) + '\n';
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const hash = async p => {
  const h = createHash('sha256');
  for await (const c of createReadStream(p)) h.update(c);
  return h.digest('hex');
};
const save = (p, x) => writeFile(p, json(x), {flag: 'wx'});
const absolute = p => {
  assert(path.isAbsolute(p), 'absolute path required');
  assert(!p.split(path.sep).some(x => /archive|退避/i.test(x)), 'archive is outside scope');
  return p;
};
const args = process.argv.slice(2);
assert.equal(args.length, 4, '--manifest /absolute/file --output /absolute/new-directory');
assert.equal(args[0], '--manifest'); assert.equal(args[2], '--output');
const manifestPath = absolute(args[1]); const out = absolute(args[3]);
await mkdir(out); // No overwrite/restart of an existing run.
const manifest = await read(manifestPath);
await save(path.join(out, 'manifest-copy.json'), manifest);
const records = [];
async function run(label, executable, argv) {
  const result = spawnSync(executable, argv, {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  await save(path.join(out, label + '-command.json'), {executable, argv, status: result.status,
    signal: result.signal, error: result.error?.message ?? null});
  await writeFile(path.join(out, label + '.log'), result.stderr ?? '', {flag: 'wx'});
  assert.equal(result.status, 0, `${label}: ${result.stderr?.slice(-1200)}`);
  return result.stdout;
}
const selected = manifest.selectedCases;
assert.deepEqual(selected.map(c => c.connectionId), ['connection-01', 'connection-02', 'connection-11']);
for (const b of manifest.verifiedInputBindings) {
  assert.equal((await stat(absolute(b.path))).size, b.bytes);
  assert.equal(await hash(b.path), b.sha256, `input changed: ${b.path}`);
}
assert.equal(await hash(manifest.nodePath), manifest.nodeSha256);
assert.equal(await hash(manifest.stage2PriorEvidence.path), manifest.stage2PriorEvidence.sha256);
const prior = await read(manifest.stage2PriorEvidence.path);
assert.equal(prior.status, 'passed'); assert(prior.inputBindingsUnchanged);
const sample = selected[0];
const planBytes = await readFile(sample.canonicalPlanPath);
const timelineBytes = await readFile(sample.canonicalTimelinePath);
const plan = JSON.parse(planBytes); const timeline = JSON.parse(timelineBytes);
assert.equal(timeline.sourceFrameClock.logicalFrameRate, '30/1');
assert.equal(timeline.sourceFrameClock.inputFrameRate, '60/1');
assert.equal(timeline.sourceFrameClock.extractionRuleId, 'source-frame-60fps-global-even-v001');
const context = contextFrom({digestRef: {version: 'digest-v1-phase2-style-94-v001', sha256: sample.canonicalSha256}, planBytes, timelineBytes});
const original = makeOriginal({context, selections: selected.map(c => ({connectionId: c.connectionId,
  preset: 'soft-separator', presetVersion: 'v001'}))});
const empty = makeOverrides({context, original});
await save(path.join(out, 'saved-original.json'), original);
await save(path.join(out, 'saved-overrides-empty.json'), empty);
const loadedOriginal = await read(path.join(out, 'saved-original.json'));
const loadedEmpty = await read(path.join(out, 'saved-overrides-empty.json'));
const savedOriginalSha = await hash(path.join(out, 'saved-original.json'));
const savedEmptySha = await hash(path.join(out, 'saved-overrides-empty.json'));
const beforeInput = json({plan, timeline, original: loadedOriginal});
const state = {context, original: loadedOriginal, overrides: loadedEmpty};
const originalResult = resolve(state);
// Save a second override, then reset only the first: the second must survive.
const one = change({...state, connectionId: 'connection-01', preset: 'normal-cut', presetVersion: 'v001'});
const two = change({...state, overrides: one, connectionId: 'connection-02', preset: 'black-separator', presetVersion: 'v001'});
await save(path.join(out, 'saved-overrides-two.json'), two);
const twoRead = await read(path.join(out, 'saved-overrides-two.json'));
const resetOne = reset({...state, overrides: twoRead, connectionId: 'connection-01'});
await save(path.join(out, 'saved-reset-first-only.json'), resetOne);
const keptSecond = change({...state, connectionId: 'connection-02', preset: 'black-separator', presetVersion: 'v001'});
assert.deepEqual(resetOne, keptSecond, 'Reset must delete only the target override');
const resetAll = reset({...state, overrides: resetOne, connectionId: 'connection-02'});
await save(path.join(out, 'saved-reset-all.json'), resetAll);
const restored = resolve({...state, overrides: await read(path.join(out, 'saved-reset-all.json'))});
assert.deepEqual(restored, originalResult, 'Reset must recover saved Soft original, not Normal');
const changedResult = resolve({...state, overrides: twoRead});
assert.deepEqual(resolve(state), originalResult, 'repeated resolution must not add shifts twice');

function verifyClock(result, activeIds) {
  const boundaries = activeIds.map(id => selected.find(c => c.connectionId === id))
    .map(c => c.originalStartFrame + c.boundaryFrame).sort((a,b) => a-b);
  assert.equal(result.expectedFrameCount, timeline.baseMedia.expectedFrameCount + boundaries.length * 12);
  assert.equal(result.plan.elements.length, plan.elements.length);
  const captions = plan.elements.map((element, i) => {
    assert(!boundaries.some(b => element.startFrame < b && element.endFrameExclusive > b));
    const shift = boundaries.filter(b => b <= element.startFrame).length * 12;
    assert.deepEqual(result.plan.elements[i], {...element,
      startFrame: element.startFrame + shift, endFrameExclusive: element.endFrameExclusive + shift});
    return {id: element.instructionId, before: [element.startFrame, element.endFrameExclusive],
      after: [result.plan.elements[i].startFrame, result.plan.elements[i].endFrameExclusive], shift};
  });
  // Every base span consumes the original clock once in order; inserted frames have no base/source reference.
  let nextBase = 0, nextDisplay = 0, blackCount = 0;
  for (const s of result.presentationTimeline.spans) {
    assert.equal(s.startFrame, nextDisplay); nextDisplay = s.endFrameExclusive;
    if (s.kind === 'base') {
      assert.equal(s.baseStartFrame, nextBase); nextBase = s.baseEndFrame;
      assert.equal(s.baseEndFrame - s.baseStartFrame, s.endFrameExclusive - s.startFrame);
    } else {
      assert.equal(s.kind, 'black'); assert.equal(s.endFrameExclusive - s.startFrame, 12);
      assert(!Object.hasOwn(s, 'baseStartFrame'));
      const boundary = boundaries[blackCount];
      const before = timeline.segments.findIndex(segment => segment.outputEndFrame === boundary);
      assert(before >= 0 && before < timeline.segments.length - 1);
      assert.equal(s.beforeSegmentId, timeline.segments[before].segmentId);
      assert.equal(s.afterSegmentId, timeline.segments[before + 1].segmentId);
      assert.equal(s.startFrame, boundary + blackCount * 12);
      assert.equal(s.endFrameExclusive, boundary + blackCount * 12 + 12);
      blackCount++;
    }
  }
  assert.equal(nextBase, timeline.baseMedia.expectedFrameCount);
  assert.equal(nextDisplay, result.expectedFrameCount); assert.equal(blackCount, activeIds.length);
  return {captionCount: captions.length, captions, retainedBaseFrames: nextBase, insertedFrames: blackCount * 12};
}
const originalClock = verifyClock(originalResult, selected.map(c => c.connectionId));
const overrideClock = verifyClock(changedResult, ['connection-02', 'connection-11']);
await save(path.join(out, 'clock-original.json'), originalClock);
await save(path.join(out, 'clock-two-overrides.json'), overrideClock);

/** Slice only a supplied 240-frame excerpt of the resolved full clock. No media extraction or caption invention. */
function localize(result, item) {
  const start = item.originalStartFrame, end = start + item.frameCount;
  const spans = []; let cursor = 0; let globalStart;
  for (const s of result.presentationTimeline.spans) {
    if (s.kind === 'base') {
      const a = Math.max(start, s.baseStartFrame), b = Math.min(end, s.baseEndFrame);
      if (b <= a) continue;
      if (globalStart === undefined) globalStart = s.startFrame + a - s.baseStartFrame;
      spans.push({kind: 'base', baseStartFrame: a - start, baseEndFrame: b - start,
        startFrame: cursor, endFrameExclusive: cursor + b - a}); cursor += b - a;
    } else {
      const bound = timeline.segments.find(x => x.segmentId === s.beforeSegmentId).outputEndFrame;
      if (bound <= start || bound >= end) continue;
      spans.push({...s, startFrame: cursor, endFrameExclusive: cursor + 12}); cursor += 12;
    }
  }
  assert(globalStart !== undefined);
  const softWindows = result.softWindows.filter(w => w.blackStartFrame >= globalStart && w.blackEndFrameExclusive <= globalStart + cursor)
    .map(w => ({...w, blackStartFrame: w.blackStartFrame - globalStart,
      blackEndFrameExclusive: w.blackEndFrameExclusive - globalStart}));
  for (const w of softWindows) assert(w.blackStartFrame >= 6 && w.blackEndFrameExclusive + 6 <= cursor,
    'the fixed excerpt must include the entire fade window');
  const sources = [];
  for (const s of spans) for (let f = s.startFrame; f < s.endFrameExclusive; f++) {
    if (s.kind === 'black') sources.push({displayFrame: f, canonicalFrame: null, sourceFrame30: null, sourceFrame60: null});
    else {
      const originalFrame = start + s.baseStartFrame + f - s.startFrame;
      const segment = timeline.segments.find(t => t.outputStartFrame <= originalFrame && originalFrame < t.outputEndFrame);
      assert(segment);
      const sourceFrame30 = segment.sourceStartFrame30 + originalFrame - segment.outputStartFrame;
      sources.push({displayFrame: f, canonicalFrame: originalFrame, segmentId: segment.segmentId,
        sourceFrame30, sourceFrame60: sourceFrame30 * 2});
    }
  }
  assert.deepEqual(sources.filter(x => x.canonicalFrame !== null).map(x => x.canonicalFrame),
    Array.from({length: item.frameCount}, (_, i) => start + i));
  return {presentationTimeline: {spans}, softWindows, globalStart, frameCount: cursor, sources};
}
const ff = ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-filter_complex_threads', '1'];
async function render(label, item, result, expectedMode, mutateGraph = x => x) {
  const local = localize(result, item);
  let graph = filters({presentationTimeline: local.presentationTimeline,
    canvas: {width: plan.canvas.width, height: plan.canvas.height, fps: plan.canvas.fps},
    audio: {sampleRate: 48000, channelLayout: 'stereo'}, softWindows: local.softWindows});
  assert(Array.isArray(graph)); graph = mutateGraph(graph);
  const graphPath = path.join(out, label + '-filter.txt');
  await writeFile(graphPath, graph.join(';'), {flag: 'wx'});
  const outputPath = path.join(out, label + '.nut');
  // The helper returns the common [timelineVideo] and [timelineAudio] labels.
  await run(label, manifest.ffmpegPath, [...ff, '-i', item.losslessPath,
    '-filter_complex_script', graphPath, '-map', '[timelineVideo]', '-map', '[timelineAudio]',
    '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough',
    '-c:a', 'pcm_f32le', '-f', 'nut', outputPath]);
  const entry = {label, connectionId: item.connectionId, inputPath: item.losslessPath,
    outputPath, sha256: await hash(outputPath), mode: expectedMode,
    frameCount: local.frameCount, boundaryFrame: item.boundaryFrame, inputFrameCount: item.frameCount,
    canonicalStartFrame: item.originalStartFrame, canonicalBoundaryFrame: item.originalStartFrame + item.boundaryFrame,
    globalDisplayStartFrame: local.globalStart, softWindows: local.softWindows};
  await save(path.join(out, label + '-source-clock.json'), local.sources);
  records.push(entry); return entry;
}
for (const c of selected) {
  const old = prior.results.find(r => r.connectionId === c.connectionId);
  assert.deepEqual(c, old.excerpt, 'each excerpt SHA must retain its verified canonical clock and source references');
  assert.equal(await hash(c.losslessPath), old.canonicalWindowVerification.excerptSha256);
  assert(old.canonicalWindowVerification.completeFrameSequenceEqual && old.canonicalWindowVerification.completeFloat32PcmByteEqual);
  await render(c.connectionId + '-soft-original', c, originalResult, 'soft');
}
await render('connection-01-normal-override', selected[0], changedResult, 'normal');
await render('connection-01-soft-reset', selected[0], restored, 'soft');
const blackOriginal = makeOriginal({context, selections: selected.map(c => ({connectionId: c.connectionId,
  preset: c.connectionId === 'connection-01' ? 'black-separator' : 'soft-separator', presetVersion: 'v001'}))});
const blackEmpty = makeOverrides({context, original: blackOriginal});
const blackState = {context, original: blackOriginal, overrides: blackEmpty};
await save(path.join(out, 'saved-black-original.json'), blackOriginal);
const blackOverride = change({...blackState, connectionId: 'connection-01', preset: 'normal-cut', presetVersion: 'v001'});
await save(path.join(out, 'saved-black-normal-override.json'), blackOverride);
assert.deepEqual(resolve({...blackState, overrides: await read(path.join(out, 'saved-black-normal-override.json'))}).presentationTimeline,
  changedResult.presentationTimeline, 'same effective insertions must yield the same clock');
const blackReset = reset({...blackState, overrides: await read(path.join(out, 'saved-black-normal-override.json')), connectionId: 'connection-01'});
await save(path.join(out, 'saved-black-reset.json'), blackReset);
const blackResult = resolve(blackState);
assert.deepEqual(resolve({...blackState, original: await read(path.join(out, 'saved-black-original.json')),
  overrides: await read(path.join(out, 'saved-black-reset.json'))}), blackResult);
await render('connection-01-black-original', selected[0], blackResult, 'black');
await render('connection-01-black-reset', selected[0], resolve({...blackState, overrides: blackReset}), 'black');
// Deliberately faulty real media: render the correct schedule with the fade windows delayed by one frame.
await render('fault-window-delayed-one-frame', selected[0], originalResult, 'soft', graph =>
  graph.map(s => s.replace(/eq\(n,(\d+)\)/g, (_, n) => `eq(n,${Number(n) + 1})`)));
assert.equal(json({plan, timeline, original: loadedOriginal}), beforeInput, 'original input mutated');
assert.equal(await hash(path.join(out, 'saved-original.json')), savedOriginalSha);
assert.equal(await hash(path.join(out, 'saved-overrides-empty.json')), savedEmptySha);
for (const b of manifest.verifiedInputBindings) assert.equal(await hash(b.path), b.sha256);
const result = {schemaVersion: 'connection-expression-real-fixture-v001', status: 'rendered-awaiting-independent-media-check',
  createdBy: 'development-fixture', actualAiSelections: 0, humanEvaluations: 0,
  independentInputBindingsPreserved: true, originalSavedBytesPreserved: true,
  canonicalCaptionCount: plan.elements.length, sourceFrameClock: timeline.sourceFrameClock,
  immutableOriginalAndSeparateOverrides: true, oneResetKeepsOtherOverride: true,
  softOriginalRestoredFromSavedOverrides: true, blackOriginalRestoredFromSavedOverrides: true,
  repeatedResolutionNoDoubleShift: true, captionContentsAndOriginalDurationsPreserved: true,
  records};
await save(path.join(out, 'fixture-result.json'), result);
console.log(json({status: result.status, out, renders: records.length, captions: plan.elements.length}));
