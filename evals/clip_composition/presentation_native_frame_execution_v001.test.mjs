import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {buildPresentationNativeFrameBatchPlanV001, buildPresentationNativeFrameBatchExtractionArgumentsV001,
  buildPresentationNativeLayerPlanV001, buildPresentationNativeLayerArgumentsV001,
  buildPresentationNativeReferenceExecutionV001, buildPresentationNativeReferenceArgumentsV001,
  classifyPresentationNativeFrameRgbV001, classifyPresentationNativeReferenceFilesV001,
  readPresentationNativeFrameBatchOutputsV001}
  from './presentation_native_frame_qc_v001.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {assertPresentationRenderRangeV001} from './presentation_orchestration_render_scope_v001.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const execute = promisify(execFile);
const ffmpeg = '/opt/homebrew/bin/ffmpeg';
const common = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y'];
const run = async args => execute(ffmpeg, args, {encoding: 'buffer', maxBuffer: 1024 * 1024});
const temporary = async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-native-execution-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
};
const decodeRgb = async file => (await run([...common, '-i', file, '-frames:v', '1',
  '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'])).stdout;

test('selected frames retain global/local clocks and reject duplicate local clocks or unsorted media requests', () => {
  const result = buildPresentationNativeFrameBatchPlanV001({directory: '/fixture/frames', samples: [
    {frame: 121, mediaFrame: 21}, {frame: 101, mediaFrame: 1}, {frame: 121, mediaFrame: 21}]});
  assert.deepEqual(result.frames.map(row => [row.frame, row.mediaFrame]), [[101, 1], [121, 21]]);
  for (const samples of [[{frame: 100, mediaFrame: 0}, {frame: 100, mediaFrame: 1}],
    [{frame: 100, mediaFrame: 1}, {frame: 101, mediaFrame: 1}],
    [{frame: 100, mediaFrame: 2}, {frame: 101, mediaFrame: 1}]])
    assert.throws(() => buildPresentationNativeFrameBatchPlanV001({directory: '/fixture/frames', samples}));
  for (const frames of [[], [2, 1], [1, 1], [-1], [0.5]])
    assert.throws(() => buildPresentationNativeFrameBatchExtractionArgumentsV001('/fixture/base.mp4', frames,
      '/fixture/frames/frame-%09d.png'));
  assert.deepEqual(buildPresentationNativeFrameBatchPlanV001({directory: '/fixture/empty', samples: []}).frames, []);
});

test('an exited extraction cannot pass with missing or extra selected outputs', async t => {
  const directory = await temporary(t);
  const extraction = buildPresentationNativeFrameBatchPlanV001({directory, samples: [{frame: 100, mediaFrame: 0}, {frame: 103, mediaFrame: 3}]});
  await mkdir(path.dirname(extraction.baseOutputPattern));
  await mkdir(path.dirname(extraction.completedOutputPattern));
  for (const row of extraction.frames) {
    await writeFile(row.basePath, 'base-' + row.mediaFrame);
    await writeFile(row.completedPath, 'completed-' + row.mediaFrame);
  }
  const observed = await readPresentationNativeFrameBatchOutputsV001(extraction);
  assert.deepEqual(observed.map(row => [row.frame, row.mediaFrame]), [[100, 0], [103, 3]]);
  await rm(extraction.frames[1].completedPath);
  await assert.rejects(readPresentationNativeFrameBatchOutputsV001(extraction), /missing or extra/u);
  await writeFile(extraction.frames[1].completedPath, 'completed-3');
  const extra = path.join(path.dirname(extraction.baseOutputPattern), 'frame-000000002.png');
  await writeFile(extra, 'extra');
  await assert.rejects(readPresentationNativeFrameBatchOutputsV001(extraction), /missing or extra/u);
});

test('an empty caption scope produces no extracted frame or prepared layer', async t => {
  const directory = await temporary(t);
  const extraction = buildPresentationNativeFrameBatchPlanV001({directory, samples: []});
  await mkdir(path.dirname(extraction.baseOutputPattern));
  await mkdir(path.dirname(extraction.completedOutputPattern));
  assert.deepEqual(await readPresentationNativeFrameBatchOutputsV001(extraction), []);
  assert.deepEqual(buildPresentationNativeLayerPlanV001({samples: [], sceneBindings: [],
    directory: path.join(directory, 'layers')}).layers, []);
  await writeFile(path.join(path.dirname(extraction.baseOutputPattern), 'frame-000000000.png'), 'unexpected frame');
  await assert.rejects(readPresentationNativeFrameBatchOutputsV001(extraction), /missing or extra/u);
  assert.throws(() => assertPresentationRenderRangeV001({startFrame: 12, endFrameExclusive: 12, fullFrameCount: 30}, 0));
});

test('batch extraction matches original single-frame RGB for H264 and FFV1, including second-boundary and range offsets', async t => {
  const directory = await temporary(t);
  for (const [codec, suffix, codecArgs] of [['libx264', 'mp4', ['-crf', '18']], ['ffv1', 'mkv', ['-level', '3']]]) {
    const source = path.join(directory, 'source.' + suffix);
    await run([...common, '-f', 'lavfi', '-i', 'testsrc2=size=64x48:rate=30',
      '-frames:v', '90', '-an', '-c:v', codec, ...codecArgs, '-pix_fmt', 'yuv420p', source]);
    for (const frames of [[0, 1, 29, 30, 31, 57, 89], [31, 57, 89]]) {
      const extractionDirectory = path.join(directory, codec + '-' + frames[0]);
      await mkdir(extractionDirectory);
      const pattern = path.join(extractionDirectory, 'frame-%09d.png');
      await run(buildPresentationNativeFrameBatchExtractionArgumentsV001(source, frames, pattern));
      assert.deepEqual((await readdir(extractionDirectory)).sort(),
        frames.map((_frame, index) => 'frame-' + String(index).padStart(9, '0') + '.png'));
      for (const [index, frame] of frames.entries()) {
        const seconds = Math.floor(frame / 30), remainder = frame - seconds * 30;
        const single = path.join(directory, 'single-' + codec + '-' + frames[0] + '-' + frame + '.png');
        await run([...common, '-ss', String(seconds), '-i', source,
          '-vf', 'select=eq(n\\,' + remainder + ')', '-frames:v', '1', single]);
        assert.deepEqual(await decodeRgb(path.join(extractionDirectory, 'frame-' + String(index).padStart(9, '0') + '.png')),
          await decodeRgb(single), 'codec=' + codec + ' frame=' + frame);
      }
    }
  }
});

// Frozen pre-improvement reference compositor: test oracle only, no runtime fallback.
function originalReferenceArgumentsForEquivalence({sample, sceneBindings, baseFramePath, outputPaths}) {
  const byId = new Map(sceneBindings.flatMap(group => [...group.states, ...group.alternates])
    .map(row => [row.bindingId, row]));
  const uses = new Map();
  for (const reference of sample.references) for (const layer of reference.layers) {
    const key = layer.bindingId + '/' + layer.localFrame + '/' + layer.displayFrameCount;
    const found = uses.get(key);
    if (found) found.count++;
    else uses.set(key, {layer, count: 1});
  }
  const paths = [...new Set([...uses.values()].map(use => byId.get(use.layer.bindingId).pngPath))];
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-filter_complex_threads', '1', '-i', baseFramePath];
  for (const file of paths) args.push('-threads', '1', '-i', file);
  const filters = [];
  const baseLabels = sample.references.map((_ref, index) => 'base' + index);
  filters.push('[0:v]format=yuv420p,split=' + baseLabels.length + baseLabels.map(label => '[' + label + ']').join(''));
  const useEntries = [...uses.entries()];
  for (const [fileIndex, file] of paths.entries()) {
    const matching = useEntries.filter(([_key, use]) => byId.get(use.layer.bindingId).pngPath === file);
    filters.push('[' + (fileIndex + 1) + ':v]format=rgba'
      + (matching.length === 1 ? '[png' + fileIndex + '-0]'
        : ',split=' + matching.length + matching.map((_entry, index) => '[png' + fileIndex + '-' + index + ']').join('')));
    for (const [useIndex, [key, use]] of matching.entries()) {
      const index = useEntries.findIndex(entry => entry[0] === key);
      const local = use.layer.localFrame;
      const duration = use.layer.displayFrameCount;
      const alpha = 'alpha(X,Y)*min(1,min((' + local + '+1)/4,(' + duration + '-' + local + ')/4))';
      const labels = Array.from({length: use.count}, (_unused, n) => 'faded' + index + '-' + n);
      filters.push('[png' + fileIndex + '-' + useIndex + ']geq=r=\'r(X,Y)\':g=\'g(X,Y)\':b=\'b(X,Y)\':a=\'' + alpha + '\''
        + (labels.length === 1 ? '[' + labels[0] + ']'
          : ',split=' + labels.length + labels.map(label => '[' + label + ']').join('')));
      use.labels = labels;
      use.next = 0;
    }
  }
  for (const [referenceIndex, reference] of sample.references.entries()) {
    let previous = baseLabels[referenceIndex];
    for (const [layerIndex, layer] of reference.layers.entries()) {
      const use = uses.get(layer.bindingId + '/' + layer.localFrame + '/' + layer.displayFrameCount);
      const next = 'scene' + referenceIndex + '-' + layerIndex;
      filters.push('[' + previous + '][' + use.labels[use.next++] + ']overlay=0:0:eof_action=pass:shortest=0:repeatlast=0[' + next + ']');
      previous = next;
    }
    const crop = sample.crop;
    filters.push('[' + previous + ']format=yuv420p,format=rgb24,crop=' + crop.width + ':' + crop.height + ':'
      + crop.left + ':' + crop.top + ':exact=1[out' + referenceIndex + ']');
  }
  args.push('-filter_complex', filters.join(';'));
  for (const [index, file] of outputPaths.entries()) args.push('-map', '[out' + index + ']', '-frames:v', '1',
    '-c:v', 'rawvideo', '-threads', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', file);
  return args;
}


test('prepared alpha and shared prefixes retain all reference pixels, classes and strict decisions', async t => {
  const directory = await temporary(t), width = 64, height = 48;
  const nativeDirectory = path.join(directory, 'layers'), referenceDirectory = path.join(directory, 'references');
  await mkdir(nativeDirectory); await mkdir(referenceDirectory);
  const native = [];
  for (const [id, offset] of [['a', 0], ['b', 71]]) {
    const rgba = Buffer.alloc(width * height * 4);
    for (let pixel = 0; pixel < width * height; pixel++) {
      rgba[pixel * 4] = (pixel + offset) % 256;
      rgba[pixel * 4 + 1] = (pixel * 3 + offset) % 256;
      rgba[pixel * 4 + 2] = (pixel * 7 + offset) % 256;
      rgba[pixel * 4 + 3] = pixel % 256;
    }
    const raw = path.join(directory, id + '.rgba'), png = path.join(directory, id + '.png');
    await writeFile(raw, rgba);
    await run([...common, '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', width + 'x' + height,
      '-i', raw, '-frames:v', '1', '-c:v', 'png', '-threads', '1', png]);
    native.push({bindingId: id, pngPath: png, pngSha256: hash(await readFile(png))});
  }
  const aliasPath = path.join(directory, 'same-a.png');
  await writeFile(aliasPath, await readFile(native[0].pngPath));
  native.push({...native[0], bindingId: 'same-a', pngPath: aliasPath});
  const sceneBindings = [{states: native, alternates: []}];
  const base = path.join(directory, 'base.png');
  await run([...common, '-f', 'lavfi', '-i', 'testsrc2=size=64x48:rate=30', '-frames:v', '1', '-threads', '1', base]);
  const otherBase = path.join(directory, 'other-base.png');
  await run([...common, '-i', base, '-vf', 'negate', '-frames:v', '1', '-threads', '1', otherBase]);
  const samples = [];
  for (const duration of [7, 20]) for (const frame of [...new Set([0, 1, 2, 3, duration - 4, duration - 3, duration - 2, duration - 1])]) {
    const layer = (bindingId, localFrame = frame) => ({bindingId, localFrame, displayFrameCount: duration});
    samples.push({crop: {left: 0, top: 0, width, height}, baseFrame: {path: base, fileSha256: hash(await readFile(base))},
      references: [{id: 'expected', layers: [layer('a')]}, {id: 'omitted', layers: []},
        {id: 'foreign', layers: [layer('b')]}, {id: 'ordered', layers: [layer('a'), layer('b')]},
        {id: 'swapped', layers: [layer('b'), layer('a')]},
        {id: 'same-png-other-phase', layers: [layer('a'), layer('a', (frame + 1) % duration)]},
        {id: 'same-png-same-phase', layers: [layer('a'), layer('a')]},
        {id: 'same-png-single-other-phase', layers: [layer('a', (frame + 1) % duration)]},
        {id: 'same-binding-bytes', layers: [layer('same-a')]}]});
  }
  // These samples share every layer but change the actual background or crop.
  // The independent old compositor below must still match each saved result.
  samples.push({...samples[0], baseFrame: {path: otherBase, fileSha256: hash(await readFile(otherBase))}});
  samples.push({...samples[0], crop: {left: 2, top: 4, width: width - 4, height: height - 8}});
  const nativeLayers = buildPresentationNativeLayerPlanV001({samples, sceneBindings, directory: nativeDirectory});
  const groups = new Map();
  for (const layer of nativeLayers.layers.filter(row => row.generated)) {
    if (!groups.has(layer.sourceSha256)) groups.set(layer.sourceSha256, []);
    groups.get(layer.sourceSha256).push(layer);
  }
  for (const group of groups.values()) await run(buildPresentationNativeLayerArgumentsV001(group));
  const generated = new Set(), distanceCache = new Map(), distanceCounts = {};
  for (const [sampleIndex, sample] of samples.entries()) {
    const previousFiles = sample.references.map((_row, index) => path.join(directory, 'old-' + sampleIndex + '-' + index + '.rgb'));
    await run(originalReferenceArgumentsForEquivalence({sample, sceneBindings,
      baseFramePath: sample.baseFrame.path, outputPaths: previousFiles}));
    const executions = buildPresentationNativeReferenceExecutionV001({sample, sceneBindings, nativeLayers, directory: referenceDirectory});
    assert.equal(executions[0].key, executions.at(-1).key);
    const fresh = [...new Map(executions.filter(row => !generated.has(row.key)).map(row => [row.key, row])).values()];
    if (fresh.length) await run(buildPresentationNativeReferenceArgumentsV001({
      sample: {...sample, references: fresh.map(row => row.reference)}, sceneBindings, nativeLayers,
      baseFramePath: sample.baseFrame.path, outputPaths: fresh.map(row => row.path)}));
    fresh.forEach(row => generated.add(row.key));
    const before = [], after = [];
    for (const [index, row] of sample.references.entries()) {
      const oldRgb = await readFile(previousFiles[index]), newRgb = await readFile(executions[index].path);
      assert.deepEqual(newRgb, oldRgb, 'sample=' + sampleIndex + ' reference=' + row.id);
      before.push({id: row.id, rgb: oldRgb}); after.push({id: row.id, rgb: newRgb});
    }
    for (const [completedIndex, completed] of before.entries()) {
      const expected = classifyPresentationNativeFrameRgbV001({completedRgb: completed.rgb, references: before});
      assert.deepEqual(classifyPresentationNativeFrameRgbV001({completedRgb: completed.rgb, references: after}), expected);
      assert.deepEqual(await classifyPresentationNativeReferenceFilesV001({completedRgb: completed.rgb,
        completedRgbRef: {path: previousFiles[completedIndex], fileSha256: hash(completed.rgb)},
        references: executions.map((row, index) => ({id: row.reference.id, path: row.path,
          fileSha256: hash(after[index].rgb)})), distanceCache, counts: distanceCounts}), expected);
    }
  }
  assert(generated.size < samples.reduce((total, sample) => total + sample.references.length, 0));
  assert(distanceCounts.exactDistanceCalculations > 0);
  assert(distanceCounts.reusedExactDistances > 0);
  t.diagnostic(JSON.stringify({samples: samples.length,
    logicalReferencePixelComparisons: samples.reduce((total, sample) => total + sample.references.length, 0),
    physicalReferenceOutputs: generated.size, ...distanceCounts}));
});

test('file-based exact distances match the pure classifier, reuse equal byte pairs and reject changed files', async t => {
  const directory = await temporary(t), completed = Buffer.from([8, 9, 10, 11, 12, 13]);
  const arrays = [{id: 'expected', rgb: completed}, {id: 'omitted', rgb: Buffer.alloc(6)},
    {id: 'equal-expected', rgb: completed}, {id: 'other', rgb: Buffer.alloc(6, 1)}];
  const references = [];
  for (const row of arrays) {
    const file = path.join(directory, row.id + '.rgb'); await writeFile(file, row.rgb);
    references.push({id: row.id, path: file, fileSha256: hash(row.rgb)});
  }
  const completedRgbRef = {path: path.join(directory, 'completed.rgb'), fileSha256: hash(completed)};
  await writeFile(completedRgbRef.path, completed);
  const distanceCache = new Map(), counts = {};
  const expected = classifyPresentationNativeFrameRgbV001({completedRgb: completed, references: arrays});
  for (let run = 0; run < 2; run++) assert.deepEqual(
    await classifyPresentationNativeReferenceFilesV001({completedRgb: completed, completedRgbRef, references, distanceCache, counts}), expected);
  assert.equal(counts.exactDistanceCalculations, 3);
  assert.equal(counts.reusedExactDistances, 3);
  await writeFile(references[1].path, Buffer.alloc(6, 2));
  await assert.rejects(classifyPresentationNativeReferenceFilesV001({completedRgb: completed, completedRgbRef,
    references, distanceCache, counts}), /bytes differ/u);
});

test('process timing separates child completion from evidence write on success and failure', async t => {
  const directory = await temporary(t), observer = createPresentationRendererProcessObserverV001({observationDirectory: directory});
  await observer.run(process.execPath, ['-e', "process.stdout.write('ok')"], {observationLabel: 'success'});
  await assert.rejects(observer.run(process.execPath, ['-e', 'process.exit(3)'], {observationLabel: 'failure'}));
  const result = observer.getPerformance();
  assert.equal(result.records.length, 2);
  assert.deepEqual(result.records.map(row => row.code), [0, 3]);
  for (const row of result.records) {
    assert(Number.isFinite(row.childMilliseconds) && row.childMilliseconds >= 0);
    assert(Number.isFinite(row.evidenceWriteMilliseconds) && row.evidenceWriteMilliseconds >= 0);
    assert.equal(result.byLabel[row.label].processCount, 1);
  }
  result.records[0].label = 'mutated-copy';
  assert.equal(observer.getPerformance().records[0].label, 'success');
});
