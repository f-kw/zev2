import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {promisify} from 'node:util';
import {inspectOverlayPngWithToolV001} from './presentation_renderer_qc_v002.mjs';

const execute = promisify(execFile);
const imageMagickPath = 'magick';
const metadata = {
  instructionId: 'alpha-bounds-regression',
  lineRects: [{left: 13, top: 27, right: 87, bottom: 66}],
  lineAlphaBounds: [{lineIndex: 0, left: 13, top: 27, right: 87, bottom: 66}],
  visibilityComparisonBasis: 'instruction-omitted-frame',
  representativeFrame: 19,
  changedPixelsAgainstInstructionOmittedFrame: 2886,
  appliedOverlayPropsCanonicalSha256: 'a'.repeat(64),
  overlayFile: 'overlays/regression.png',
  overlaySha256: 'b'.repeat(64),
};

async function withDirectory(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-alpha-bounds-regression-'));
  try { return await callback(directory); }
  finally { await rm(directory, {recursive: true, force: true}); }
}

// Preserve the former two-command measurements as an independent comparison.
async function formerInspection(pngPath) {
  const alpha = await execute(imageMagickPath,
    [pngPath, '-alpha', 'extract', '-format', '%[fx:maxima]', 'info:']);
  const alphaMax = Number(alpha.stdout.trim());
  if (!(alphaMax > 0)) return {alphaMax: 0, alphaBounds: null};
  const geometry = await execute(imageMagickPath, [pngPath, '-alpha', 'extract',
    '-threshold', '0', '-bordercolor', 'black', '-border', '1', '-trim',
    '-format', '%w %h %X %Y', 'info:']);
  const match = geometry.stdout.trim().match(/^(\d+) (\d+) ([+-]\d+) ([+-]\d+)$/);
  assert(match, geometry.stdout);
  const width = Number(match[1]), height = Number(match[2]);
  const left = Number(match[3]) - 1, top = Number(match[4]) - 1;
  return {alphaMax, alphaBounds: {left, top, right: left + width, bottom: top + height, width, height}};
}

function observedExecution() {
  const calls = [];
  return {calls, processObserver: {async run(command, args, options) {
    calls.push({command, args, options});
    const output = await execute(command, args, {encoding: 'buffer'});
    return {stdout: output.stdout, stderr: output.stderr};
  }}};
}

for (const fixture of [
  {name: 'fully transparent PNG', draw: [], bounds: null},
  {name: 'corner-occupied translucent top band',
    draw: ['-fill', 'rgba(13,20,35,0.88)', '-draw', 'rectangle 0,0 319,39'],
    bounds: {left: 0, top: 0, right: 320, bottom: 40, width: 320, height: 40}},
  {name: 'offset translucent rectangle',
    draw: ['-fill', 'rgba(255,255,255,0.42)', '-draw', 'rectangle 13,27 86,65'],
    bounds: {left: 13, top: 27, right: 87, bottom: 66, width: 74, height: 39}},
  {name: 'opaque rectangle and faint disconnected ink',
    draw: ['-fill', 'white', '-draw', 'rectangle 13,27 86,65',
      '-fill', 'rgba(255,255,255,0.01)', '-draw', 'point 101,72'],
    bounds: {left: 13, top: 27, right: 102, bottom: 73, width: 89, height: 46}},
]) {
  test(`${fixture.name}: old measurements and metadata survive a single observed decode`, async () => {
    await withDirectory(async directory => {
      const pngPath = path.join(directory, 'fixture.png');
      await execute(imageMagickPath, ['-size', '320x180', 'xc:none', ...fixture.draw, pngPath]);
      const former = await formerInspection(pngPath);
      const observer = observedExecution();
      const result = await inspectOverlayPngWithToolV001({imageMagickPath, pngPath, ...metadata,
        processObserver: observer.processObserver, observationLabelPrefix: 'regression'});
      assert.deepEqual({alphaMax: result.alphaMax, alphaBounds: result.alphaBounds}, former);
      assert.deepEqual(result.alphaBounds, fixture.bounds);
      assert.deepEqual(result, {...metadata, ...former, lineCount: metadata.lineRects.length});
      if (fixture.name.includes('translucent')) assert(result.alphaMax > 0 && result.alphaMax < 1);
      assert.equal(observer.calls.length, 1);
      assert.equal(observer.calls[0].command, imageMagickPath);
      assert.equal(observer.calls[0].args.filter(value => value === pngPath).length, 1);
      assert.deepEqual(observer.calls[0].options,
        {allowedExitCodes: [0], observationLabel: 'regression-alpha-bounds'});
    });
  });
}

test('unobserved measurement retains the same offset geometry', async () => {
  await withDirectory(async directory => {
    const pngPath = path.join(directory, 'fixture.png');
    await execute(imageMagickPath, ['-size', '320x180', 'xc:none', '-fill', 'white',
      '-draw', 'rectangle 13,27 86,65', pngPath]);
    const result = await inspectOverlayPngWithToolV001({imageMagickPath, pngPath});
    assert.equal(result.alphaMax, 1);
    assert.deepEqual(result.alphaBounds,
      {left: 13, top: 27, right: 87, bottom: 66, width: 74, height: 39});
  });
});

test('missing and corrupt PNGs reject for both observed and unobserved execution', async () => {
  await withDirectory(async directory => {
    const corrupt = path.join(directory, 'corrupt.png');
    await writeFile(corrupt, 'not a PNG');
    for (const pngPath of [path.join(directory, 'missing.png'), corrupt]) {
      await assert.rejects(inspectOverlayPngWithToolV001({imageMagickPath, pngPath}), /failed/);
      const observer = observedExecution();
      await assert.rejects(inspectOverlayPngWithToolV001({imageMagickPath, pngPath,
        processObserver: observer.processObserver}));
      assert.equal(observer.calls.length, 1);
      assert.deepEqual(observer.calls[0].options.allowedExitCodes, [0]);
    }
  });
});

test('positive alpha with missing or malformed geometry rejects', async () => {
  for (const stdout of ['0.5\n', '0.5\ninvalid', '0.5\n74 39 14 28']) {
    await assert.rejects(inspectOverlayPngWithToolV001({imageMagickPath, pngPath: 'unused.png',
      processObserver: {async run() { return {stdout: Buffer.from(stdout)}; }}}),
    /alpha bounds could not be parsed/);
  }
});

test('empty alpha ignores trim geometry rather than inventing a visible rectangle', async () => {
  const result = await inspectOverlayPngWithToolV001({imageMagickPath, pngPath: 'unused.png',
    ...metadata, processObserver: {async run() { return {stdout: Buffer.from('0\ninvalid')}; }}});
  assert.deepEqual(result, {...metadata, alphaMax: 0, alphaBounds: null,
    lineCount: metadata.lineRects.length});
});
