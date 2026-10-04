import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {buildPresentationCompositeArgumentsV001 as build} from './render_presentation_v002.mjs';

const run = promisify(execFile), ffmpeg = '/opt/homebrew/bin/ffmpeg', magick = '/opt/homebrew/bin/magick';
const canvas = {width: 8, height: 8, fps: 30};
function input(pngPath, length, phase = 0) {
  const element = {instructionId: 'small-fixture', startFrame: 2, endFrameExclusive: 2 + length,
    displayFrameCount: length, indexedLines: [{lineIndex: 0, text: 'fixture'}]};
  return {baseMediaPath: '/unused/base.nut', plan: {canvas, elements: [element]},
    overlayRecords: [{element, pngPath}], expectedFrameCount: phase ? length - phase : length + 2,
    serializePngAndFilters: true, ...(phase ? {renderRange: {startFrame: 2 + phase,
      endFrameExclusive: 2 + length, fullFrameCount: length + 2}} : {})};
}

test('actual 8px FFmpeg alpha reaches 100% for 1/2/3-frame captions and keeps 8-frame fade', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-short-opacity-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const source = path.join(directory, 'opaque.rgba'), png = path.join(directory, 'opaque.png');
  await writeFile(source, Buffer.alloc(8 * 8 * 4, 255), {flag: 'wx'});
  await run(magick, ['-size', '8x8', '-depth', '8', 'rgba:' + source, 'PNG32:' + png]);
  const observe = async (length, phase = 0) => {
    const args = build(input(png, length, phase));
    // Observe the compositor's actual caption branch before background/encoding.
    const graph = args[args.indexOf('-filter_complex') + 1].split(';')[0];
    const {stdout} = await run(ffmpeg, ['-v', 'error', '-filter_complex_threads', '1',
      '-threads', '1', '-loop', '1', '-framerate', '30', '-i', png,
      '-filter_complex', graph.replace('[1:v]', '[0:v]'), '-map', '[overlay0]',
      '-fps_mode', 'passthrough', '-frames:v', String(length - phase), '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1'],
    {encoding: 'buffer', maxBuffer: 64_000});
    assert.equal(stdout.length, 8 * 8 * 4 * (length - phase));
    return Array.from({length: length - phase}, (_, index) => {
      const frame = stdout.subarray(index * 256, (index + 1) * 256);
      const alphas = Array.from({length: 64}, (_, pixel) => frame[pixel * 4 + 3]);
      assert(alphas.every(alpha => alpha === alphas[0]));
      return alphas[0];
    });
  };
  for (const [length, expected] of [[1, [255]], [2, [255, 255]], [3, [127, 255, 127]],
    [4, [127, 255, 255, 127]], [5, [85, 170, 255, 170, 85]],
    [6, [85, 170, 255, 255, 170, 85]], [8, [63, 127, 191, 255, 255, 191, 127, 63]]]) {
    assert.deepEqual(await observe(length), expected, `actual alpha, ${length} frames`);
  }
  assert.deepEqual(await observe(3, 1), [255, 127], 'range starts on absolute middle phase');
  assert.deepEqual(await observe(8, 2), [191, 255, 255, 191, 127, 63], 'long fade does not restart at range cut');
});

test('invalid length and clock disagreeing with declared duration stop before composing', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity]) {
    const f = input('/unused.png', 3); f.overlayRecords[0].element.displayFrameCount = value;
    assert.throws(() => build(f), /display length.*frame clock/);
  }
  const f = input('/unused.png', 3); f.overlayRecords[0].element.endFrameExclusive++;
  assert.throws(() => build(f), /display length.*frame clock/);
});
