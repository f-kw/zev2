import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
import {buildPresentationPulseStateElementsV001} from './presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001} from './presentation_caption_motion_v001.mjs';

const execute = promisify(execFile);
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const priorCommit = 'c17c8de83f127d156c0d031d6866ba2024c7b490';
const ffmpeg = '/opt/homebrew/bin/ffmpeg', magick = '/opt/homebrew/bin/magick';
const canvas = {width: 64, height: 48, fps: 30};
const frameBytes = canvas.width * canvas.height * 3 / 2;
const clone = value => structuredClone(value);
const run = (command, args) => execute(command, args, {encoding: 'buffer', maxBuffer: 8 * 1024 * 1024});

let priorBuilderPromise;
function priorBuilder() {
  return priorBuilderPromise ??= (async () => {
    const {stdout} = await run('git', ['-C', root, 'show',
      priorCommit + ':evals/clip_composition/render_presentation_v002.mjs']);
    // Freeze the pre-change renderer. Only import resolution changes; the
    // compositor body remains the exact source from the named Git commit.
    const source = stdout.toString('utf8').replace(/(['"])(\.\/[^'"\n]+)\1/g,
      (_match, quote, relative) => quote + new URL(relative, import.meta.url).href + quote)
      .replaceAll('import.meta.url', JSON.stringify(new URL('./render_presentation_v002.mjs', import.meta.url).href));
    const module = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    return module.buildPresentationCompositeArgumentsV001;
  })();
}

async function fixture(t, frames = 72) {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-composite-fade-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const base = path.join(directory, 'base.nut');
  await run(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x48:r=30',
    '-frames:v', String(frames), '-c:v', 'ffv1', '-pix_fmt', 'yuv420p', base]);
  return {directory, base, frames, sequence: 0};
}

function element(id, startFrame, displayFrameCount, kind = 'normal') {
  return {instructionId: id, kind: 'speech-caption', text: '固定字幕',
    indexedLines: [{lineIndex: 0, text: '固定字幕'}], startFrame,
    endFrameExclusive: startFrame + displayFrameCount, displayFrameCount,
    visualState: {textStyle: {fontSizePx: 96, fontColor: '#FFFDF8'},
      position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6},
      background: kind === 'panel' ? {color: '#172338', panelPresetId: 'plain', panelPaletteId: 'dark'} : null},
    ...(kind === 'color' ? {presentationColorRange: {startCodePoint: 1, endCodePointExclusive: 3, fontColor: '#FFD65A'}} : {}),
    ...(kind === 'pulse' ? {presentationPulse: {presentation: 'provisional-pulse', anchorPeakId: 'measured', anchorFrame: startFrame + 25}}
      : ['bounce', 'shake'].includes(kind) ? {presentationMotion: {
        presentation: 'provisional-' + kind, presetVersion: 'presentation-caption-motion-v002'}} : {})};
}

async function png(f, name, {kind = 'normal', expansion = 0, shift = 0, trimRight = null} = {}) {
  const rgba = Buffer.alloc(canvas.width * canvas.height * 4);
  // Hidden nonzero RGB and several fractional alpha values expose conversion
  // and rounding differences that fully opaque geometric fixtures cannot.
  for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) rgba.set([19, 73, 129, 0], pixel * 4);
  const left = 12 - expansion + shift, right = 40 + expansion + shift;
  const top = 12 - expansion, bottom = 34 + expansion;
  const levels = [1, 63, 127, 128, 254, 255];
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height || (trimRight !== null && x >= trimRight)) continue;
    const color = kind === 'color' && x >= (left + right) / 2 ? [255, 214, 90]
      : kind === 'panel' ? [23, 35, 56] : [255, 253, 248];
    const edge = x === left || y === top || x === right - 1 || y === bottom - 1;
    rgba.set([...color, edge ? 128 : levels[(x + y) % levels.length]], (y * canvas.width + x) * 4);
  }
  const source = path.join(f.directory, name + '.rgba'), target = path.join(f.directory, name + '.png');
  await writeFile(source, rgba, {flag: 'wx'});
  await run(magick, ['-size', '64x48', '-depth', '8', 'rgba:' + source, 'PNG32:' + target]);
  return target;
}

async function record(f, caption, kind = 'normal') {
  const states = kind === 'pulse' ? buildPresentationPulseStateElementsV001({element: caption, canvas})
    : ['bounce', 'shake'].includes(kind) ? buildPresentationCaptionMotionStateElementsV001({element: caption, canvas})
      : [{state: 'static', element: clone(caption)}];
  const records = [];
  for (const state of states) {
    const size = state.element.visualState.textStyle.fontSizePx;
    const expansion = Math.round((size - 96) / 8);
    const shift = Math.round(state.element.visualState.position.offsetXPercent * canvas.width / 100);
    records.push({...state, pngPath: await png(f, caption.instructionId + '-' + state.state, {kind, expansion, shift})});
  }
  return {...records[0], element: clone(caption), ...(kind === 'pulse' ? {pulseStates: records}
    : ['bounce', 'shake'].includes(kind) ? {motionStates: records} : {})};
}

function input(f, records, extras = {}) {
  return {baseMediaPath: f.base, plan: {canvas, elements: records.map(row => row.element)},
    overlayRecords: records, expectedFrameCount: f.frames, serializePngAndFilters: true, ...extras};
}

async function observe(f, build, value, changeGraph = null) {
  const args = build(value), filterIndex = args.indexOf('-filter_complex');
  let graph = args[filterIndex + 1];
  if (changeGraph) {
    const changed = changeGraph(graph);
    assert.notEqual(changed, graph, 'fault injection must actually change the graph');
    graph = changed;
  }
  // Both outputs observe the very same pre-encoder yuv420p frames. The raw
  // output establishes byte equality; framehash preserves clock and duration.
  graph += ';[video]split=2[observedRaw][observedClock]';
  const raw = path.join(f.directory, 'observation-' + f.sequence++ + '.yuv');
  const beforeOutputs = [...args.slice(0, filterIndex), '-filter_complex', graph];
  const {stdout} = await run(ffmpeg, [...beforeOutputs,
    '-map', '[observedRaw]', '-an', '-frames:v', String(value.expectedFrameCount), '-c:v', 'rawvideo',
    '-pix_fmt', 'yuv420p', '-f', 'rawvideo', raw,
    '-map', '[observedClock]', '-an', '-frames:v', String(value.expectedFrameCount), '-c:v', 'rawvideo',
    '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', 'pipe:1']);
  const lines = stdout.toString('utf8').split('\n');
  const clock = lines.filter(line => line && !line.startsWith('#')).map(line => {
    const [stream, dts, pts, duration, bytes, hash] = line.split(',').map(field => field.trim());
    return {stream: Number(stream), dts: Number(dts), pts: Number(pts), duration: Number(duration), bytes: Number(bytes), hash};
  });
  const bytes = await readFile(raw);
  assert.equal(clock.length, value.expectedFrameCount);
  assert.equal(bytes.length, value.expectedFrameCount * frameBytes);
  assert.equal(lines.find(line => line.startsWith('#tb 0:')), '#tb 0: 1/30');
  for (const [index, row] of clock.entries()) {
    assert.equal(row.pts, index); assert.equal(row.dts, index);
    assert.equal(row.duration, 1); assert.equal(row.bytes, frameBytes);
  }
  return {bytes, clock};
}

function equal(actual, expected, label) {
  assert.deepEqual(actual.bytes, expected.bytes, label + ': every precompression byte');
  assert.deepEqual(actual.clock, expected.clock, label + ': frame order, PTS, duration and hashes');
}

function slice(observation, start, end) {
  return {bytes: observation.bytes.subarray(start * frameBytes, end * frameBytes),
    clock: observation.clock.slice(start, end).map(row => ({...row, dts: row.dts - start, pts: row.pts - start}))};
}

async function clipped(f, startFrame, endFrameExclusive) {
  const destination = path.join(f.directory, 'range-' + f.sequence++ + '.nut');
  await run(ffmpeg, ['-v', 'error', '-i', f.base, '-vf',
    `trim=start_frame=${startFrame}:end_frame=${endFrameExclusive},setpts=PTS-STARTPTS`,
    '-an', '-c:v', 'ffv1', '-pix_fmt', 'yuv420p', destination]);
  return {baseMediaPath: destination, expectedFrameCount: endFrameExclusive - startFrame,
    renderRange: {startFrame, endFrameExclusive, fullFrameCount: f.frames}};
}

test('fixed old compositor matches Normal, partial Color, Panel, lengths 7–9, gaps and simultaneous translucent layers', async t => {
  const f = await fixture(t, 128), old = await priorBuilder();
  const records = [];
  let start = 2;
  for (let length = 7; length <= 9; length++) {
    records.push(await record(f, element('short-' + length, start, length)));
    start += length + 2;
  }
  records.push(await record(f, element('normal', 70, 30)));
  records.push(await record(f, element('partial-color', 78, 30, 'color'), 'color'));
  records.push(await record(f, element('panel', 99, 20, 'panel'), 'panel'));
  const value = input(f, records), before = clone(value);
  const baseline = await observe(f, old, value);
  equal(await observe(f, buildPresentationCompositeArgumentsV001, value), baseline, 'full static cases');
  const saved = path.join(f.directory, 'saved-input.json');
  await writeFile(saved, JSON.stringify(value), {flag: 'wx'});
  equal(await observe(f, buildPresentationCompositeArgumentsV001, JSON.parse(await readFile(saved, 'utf8'))), baseline,
    'saving and rereading does not alter the draw program');
  for (const [startFrame, endFrameExclusive] of [[0, 2], [70, 71], [72, 75], [75, 79], [95, 102], [105, 121], [120, 128]]) {
    const active = records.filter(row => row.element.startFrame < endFrameExclusive && row.element.endFrameExclusive > startFrame);
    const range = await clipped(f, startFrame, endFrameExclusive);
    equal(await observe(f, buildPresentationCompositeArgumentsV001, input(f, active, range)),
      slice(baseline, startFrame, endFrameExclusive), 'static range ' + startFrame);
  }
  assert.deepEqual(value, before, 'drawing leaves supplied plan, timing, color range and order intact');
});

test('fixed old compositor matches every Pulse, Bounce and Shake state through range cuts and fade boundaries', async t => {
  const f = await fixture(t), old = await priorBuilder();
  for (const kind of ['pulse', 'bounce', 'shake']) {
    const caption = element(kind, 10, 52, kind), records = [await record(f, caption, kind)];
    const value = input(f, records), baseline = await observe(f, old, value);
    equal(await observe(f, buildPresentationCompositeArgumentsV001, value), baseline, kind + ' full');
    // Reuse the existing range-compositor cases, adding both fade plateaus and
    // a window with no active caption. State clocks remain absolute.
    for (const [startFrame, endFrameExclusive] of [[0, 5], [10, 14], [12, 13], [12, 18], [13, 16], [33, 41], [58, 64], [59, 64]]) {
      const range = await clipped(f, startFrame, endFrameExclusive);
      const active = records.filter(row => row.element.startFrame < endFrameExclusive && row.element.endFrameExclusive > startFrame);
      equal(await observe(f, buildPresentationCompositeArgumentsV001, input(f, active, range)),
        slice(baseline, startFrame, endFrameExclusive), kind + ' range ' + startFrame);
    }
  }
});

test('the unchanged byte oracle detects position, alpha loss, motion bounds, timing, layer order and source PNG faults', async t => {
  const f = await fixture(t), old = await priorBuilder();
  const records = [await record(f, element('first', 8, 40)),
    await record(f, element('second', 15, 38, 'color'), 'color'),
    await record(f, element('bounce', 20, 42, 'bounce'), 'bounce')];
  const baseline = await observe(f, old, input(f, records));
  equal(await observe(f, buildPresentationCompositeArgumentsV001, input(f, records)), baseline, 'unmodified fault fixture');
  const clippedAlpha = await png(f, 'missing-alpha-edge', {trimRight: 39});
  const clippedMaximum = await png(f, 'maximum-cropped-to-static', {expansion: 2, trimRight: 40});
  const different = await png(f, 'wrong-source-png', {kind: 'panel'});
  const faults = [
    {name: 'crop placement shifted', graph: graph => graph.replace('overlay=0:0:', 'overlay=2:0:')},
    {name: 'alpha bounds cut off', mutate: rows => {rows[0].pngPath = clippedAlpha;}},
    {name: 'motion maximum exceeds retained bounds', mutate: rows => {
      rows[2].motionStates.find(row => row.state === 'maximum').pngPath = clippedMaximum;
    }},
    {name: 'caption shifted one frame', mutate: rows => {rows[0].element.startFrame++; rows[0].element.endFrameExclusive++;}},
    {name: 'translucent layer order reversed', mutate: rows => {[rows[0], rows[1]] = [rows[1], rows[0]];}},
    {name: 'different source PNG', mutate: rows => {rows[0].pngPath = different;}},
  ];
  for (const fault of faults) {
    const changed = clone(records); fault.mutate?.(changed);
    if (fault.mutate) assert.notDeepEqual(changed, records, fault.name + ': injected inputs differ');
    const observed = await observe(f, buildPresentationCompositeArgumentsV001, input(f, changed), fault.graph);
    assert.equal(observed.bytes.equals(baseline.bytes), false, fault.name + ': bytes must detect the fault');
    assert(observed.clock.some((row, index) => row.hash !== baseline.clock[index].hash), fault.name + ': at least one frame differs');
  }
});
