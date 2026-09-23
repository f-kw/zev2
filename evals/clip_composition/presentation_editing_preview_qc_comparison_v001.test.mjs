import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, realpath, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {comparePreviewFramePixelsV001} from './compare_presentation_editing_preview_qc_v001.mjs';
import {bindPreviewQcFileV001} from './reproduce_presentation_editing_preview_qc_v001.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';

const execute = promisify(execFile);
async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-preview-frame-comparison-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const tool = await realpath('/opt/homebrew/bin/magick');
  const images = [];
  for (const [index, color, compression] of [[0, 'red', '0'], [1, 'red', '9'], [2, 'blue', '9']]) {
    const file = path.join(directory, index + '.png');
    await execute(tool, ['-size', '8x6', 'xc:' + color, '-define', 'png:compression-level=' + compression, file]);
    images.push(await bindPreviewQcFileV001(file));
  }
  const sample = ref => ({instructionId: 'caption-1', frame: 31, mediaFrame: 1,
    crop: {left: 0, top: 0, right: 8, bottom: 6, width: 8, height: 6}, baseFrame: ref, completedFrame: ref});
  return {directory, images, before: {samples: [sample(images[0])]}, after: {samples: [sample(images[1])]},
    canvas: {width: 8, height: 6}, imageMagick: await bindPreviewQcFileV001(tool),
    processObserver: createPresentationRendererProcessObserverV001({observationDirectory: path.join(directory, 'processes')})};
}

test('comparison reopens differently compressed frame PNGs and matches actual complete RGB', async t => {
  const value = await fixture(t);
  assert.notEqual(value.images[0].fileSha256, value.images[1].fileSha256);
  const result = await comparePreviewFramePixelsV001(value);
  assert.equal(result.status, 'passed'); assert.equal(result.actualRgbComparisons, 2);
  assert.equal(result.uniquePngDecodes, 2); assert(result.pairs.every(row => row.actualBytesEqual && row.rgbBytes === 144));
});

test('comparison rejects wrong full-frame pixels even when each PNG reference has its own valid hash', async t => {
  const value = await fixture(t);
  value.after.samples[0].completedFrame = value.images[2];
  await assert.rejects(comparePreviewFramePixelsV001(value), /actual full-frame RGB differs/u);
});

test('comparison rejects different width and height even when total RGB length and pixels match', async t => {
  const value = await fixture(t), file = path.join(value.directory, 'wrong-shape.png');
  await execute(value.imageMagick.path, ['-size', '12x4', 'xc:red', file]);
  value.after.samples[0].baseFrame = await bindPreviewQcFileV001(file);
  await assert.rejects(comparePreviewFramePixelsV001(value), /PNG dimensions differ/u);
});

test('comparison rejects shifted frame clocks before decoding and rejects stale PNG bytes', async t => {
  const value = await fixture(t);
  value.after.samples[0].mediaFrame++;
  await assert.rejects(comparePreviewFramePixelsV001(value), /correspondence differs/u);
  assert.equal(value.processObserver.getPerformance().records.length, 0);
  value.after.samples[0].mediaFrame--;
  value.after.samples[0].baseFrame = {...value.images[2], fileSha256: value.images[1].fileSha256};
  await assert.rejects(comparePreviewFramePixelsV001(value), /comparison input changed/u);
});

test('comparison rejects a current frame file removed after decoding before accepting the pair', async t => {
  const value = await fixture(t), observer = value.processObserver;
  value.processObserver = {run: async (...args) => {
    const result = await observer.run(...args);
    if (args[1][0] === value.images[1].path && args[1].includes('rgb:-')) await rm(value.images[1].path);
    return result;
  }};
  await assert.rejects(comparePreviewFramePixelsV001(value), /ENOENT/u);
});
