/** Supplement the frozen palette pixel probe with the brightest observed
 * existing Color-caption background. No source/Color range is added. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile, stat} from 'node:fs/promises';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {canonicalJson} from './clock.mjs';
import {PROBE_PALETTES_V001, paletteProbePropsV001, summarizeLumaV001} from './caption-palette-pixel-probe.mjs';
import {createPresentationDevProxyOverlaySessionV001} from '../../evals/clip_composition/presentation_dev_proxy_overlay_session_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), execute = promisify(execFile);
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const same = (a, b, reason) => assert.equal(canonicalJson(a), canonicalJson(b), reason);
async function bind(file) {
  const before = await stat(file), h = createHash('sha256');for await (const chunk of createReadStream(file)) h.update(chunk);
  const after = await stat(file);for (const key of ['ino', 'size', 'mtimeMs']) assert.equal(after[key], before[key]);
  return {path: file, bytes: after.size, fileSha256: h.digest('hex')};
}
export function measureVisibleSubtitleBackgroundV001({luma, rgba, width, height}) {
  assert.equal(luma.length, width * height);assert.equal(rgba.length, width * height * 4);
  let sum = 0, count = 0, left = width, right = -1, top = height, bottom = -1;
  const histogram = Array(256).fill(0);
  for (let p = 0; p < luma.length; p++) if (rgba[p * 4 + 3] > 0) {
    count++;sum += luma[p];histogram[luma[p]]++;
    const x = p % width, y = Math.floor(p / width);left = Math.min(left, x);right = Math.max(right, x);top = Math.min(top, y);bottom = Math.max(bottom, y);
  }
  assert(count > 0);const maximum = histogram.findLastIndex(n => n > 0);
  const brightestCoordinates = [];
  for (let p = 0; p < luma.length; p++) if (rgba[p * 4 + 3] > 0 && luma[p] === maximum)
    brightestCoordinates.push({x: p % width, y: Math.floor(p / width)});
  return {visibleSubtitlePixels: count, sum, mean: sum / count, minimum: histogram.findIndex(n => n > 0), maximum,
    histogram, alphaBounds: {left, top, right, bottom},
    brightestCoveredPixels: {value: maximum, count: brightestCoordinates.length,
      firstCoordinate: brightestCoordinates[0], lastCoordinate: brightestCoordinates.at(-1)},
    rule: 'Arithmetic mean of decoded Y only where the saved 540p caption alpha is nonzero; no brightness threshold or RGB weights.'};
}
export async function runCaptionPaletteBrightBackgroundV001({completionPath, priorProbePath, outputDirectory}) {
  assert([completionPath, priorProbePath, outputDirectory].every(path.isAbsolute));
  assert.equal(path.dirname(outputDirectory), path.join(root, 'runtime/artifacts/caption-palette-20260929-v001'));
  const startedAt = new Date().toISOString(), start = performance.now();await mkdir(outputDirectory);
  const commands = [], operations = [], refs = [], samples = [], paletteRows = [];let session;
  const run = async (command, args) => {
    const began = performance.now();
    try {const r = await execute(command, args, {encoding: 'buffer', maxBuffer: 8 * 1024 * 1024});
      commands.push({command, args, status: 'passed', wallMilliseconds: performance.now() - began, stdoutSha256: sha(r.stdout)});return r.stdout;}
    catch (error) {commands.push({command, args, status: 'failed', stderr: String(error.stderr ?? error.message)});throw error;}
  };
  const observer = {async observeOperation(d, fn) {const s = performance.now();const r = await fn();
    operations.push({observationLabel: d.observationLabel, operationKind: d.operationKind, wallMilliseconds: performance.now() - s});return r;}};
  try {
    const completion = await readJson(completionPath), prior = await readJson(priorProbePath);
    assert.equal(completion.status, 'development-proxy-ready');assert.equal(prior.status, 'passed');
    assert.equal(prior.schemaVersion, 'caption-palette-pixel-probe-v001');same(prior.palettes, PROBE_PALETTES_V001);
    const frozenModule = path.join(root, 'tools/digest-quality/caption-palette-pixel-probe.mjs');
    const frozenRef = prior.inputs.find(ref => ref.path === frozenModule);assert(frozenRef);same(await bind(frozenModule), frozenRef, 'frozen prior probe changed');
    refs.push(await bind(completionPath), await bind(priorProbePath), await bind(fileURLToPath(import.meta.url)), frozenRef);
    const priorCompletion = prior.inputs.find(ref => ref.path === completionPath);assert(priorCompletion);same(refs[0], priorCompletion);
    for (const row of prior.results) for (const p of row.palettes) {
      for (const key of ['alphaDifferences', 'outsideRangeRgbaDifferences', 'transparentBackgroundDifferences', 'strokeAndGlowRgbaDifferences']) assert.equal(p[key], 0);
      assert(p.insideSafeArea && p.independentHarnessMatchesProduction && p.lineAndGlyphGeometryUnchanged);
    }
    const {tools} = completion, width = 960, height = 540;
    for (const tool of ['ffmpegPath', 'imageMagickPath', 'chromiumPath']) refs.push(await bind(tools[tool]));
    const background = await bind(completion.localMedia.videoAndPcm.path);same(background, completion.localMedia.videoAndPcm);refs.push(background);
    const records = completion.stateRecords.filter(r => r.props.presentationColorRange);
    assert.equal(records.length, 18);assert.equal(new Set(records.map(r => r.captionId)).size, 18);
    records.forEach(r => {assert.equal(r.state, 'static');assert.equal(r.props.presentationColorRange.fontColor, '#FFD65A');assert(!r.captionId.startsWith('7b-'));});
    const frames = records.map(r => Math.floor((r.element.startFrame + r.element.endFrameExclusive - 1) / 2));
    assert.equal(new Set(frames).size, frames.length);assert(frames.every((f, i) => !i || f > frames[i - 1]));
    await run(tools.ffmpegPath, ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-i', background.path,
      '-filter_complex', `[0:v]select=${frames.map(f => `eq(n\\,${f})`).join('+')},split=2[p][y];[y]extractplanes=y[l]`,
      '-map', '[p]', '-frames:v', String(frames.length), '-fps_mode', 'passthrough', path.join(outputDirectory, 'background-%02d.png'),
      '-map', '[l]', '-frames:v', String(frames.length), '-fps_mode', 'passthrough', '-f', 'rawvideo', path.join(outputDirectory, 'background-y.gray')]);
    const yBytes = await readFile(path.join(outputDirectory, 'background-y.gray'));assert.equal(yBytes.length, width * height * frames.length);
    for (const [index, record] of records.entries()) {
      const ref = await bind(record.png.path);same(ref, record.png);refs.push(ref);
      const rgba = await run(tools.imageMagickPath, [ref.path, '-depth', '8', 'rgba:-']);
      const luma = yBytes.subarray(index * width * height, (index + 1) * width * height);
      const visible = measureVisibleSubtitleBackgroundV001({luma, rgba, width, height});
      samples.push({captionId: record.captionId, frame: frames[index], seconds: frames[index] / 30,
        range: record.props.presentationColorRange, lines: record.props.indexedLines.map(l => l.text),
        visibleSubtitleY: visible, boundingRectangleY: summarizeLumaV001(luma, {width, height, rect: visible.alphaBounds}),
        wholeFrameY: summarizeLumaV001(luma, {width, height}),
        backgroundPng: await bind(path.join(outputDirectory, `background-${String(index + 1).padStart(2, '0')}.png`)), savedOverlay: ref});
    }
    // Stable order resolves an exact tie; no score/threshold is introduced.
    const selectedIndex = samples.reduce((best, item, index) => item.visibleSubtitleY.mean > samples[best].visibleSubtitleY.mean ? index : best, 0);
    const selected = samples[selectedIndex], record = records[selectedIndex], safe = record.props.canvas.safeAreaPx;
    session = createPresentationDevProxyOverlaySessionV001({repositoryRoot: root,
      entryPoint: path.join(root, 'evals/clip_composition/presentation_renderer_entry_v001.tsx'), publicDir: path.join(root, 'runner/public'),
      remotionPath: tools.remotionPath, chromiumPath: tools.chromiumPath, processObserver: observer, profileId: completion.profileId});
    const oldRgba = await run(tools.imageMagickPath, [record.png.path, '-depth', '8', 'rgba:-']);
    for (const palette of PROBE_PALETTES_V001) {
      const props = paletteProbePropsV001(record.props, palette.paletteId);
      const png = path.join(outputDirectory, palette.paletteId + '-overlay.png');await session.render(props, png);
      const rgba = await run(tools.imageMagickPath, [png, '-depth', '8', 'rgba:-']);assert.equal(rgba.length, oldRgba.length);
      let alphaDifferences = 0, transparentBackgroundDifferences = 0, changedPixels = 0, exactOpaqueColorPixels = 0;
      const rgb = [1, 3, 5].map(i => parseInt(palette.color.slice(i, i + 2), 16));
      for (let i = 0; i < rgba.length; i += 4) {
        if (oldRgba[i + 3] !== rgba[i + 3]) alphaDifferences++;
        const changed = !oldRgba.subarray(i, i + 4).equals(rgba.subarray(i, i + 4));if (changed) changedPixels++;
        if (!oldRgba[i + 3] && changed) transparentBackgroundDifferences++;
        if (rgba[i + 3] === 255 && rgb.every((v, j) => rgba[i + j] === v)) exactOpaqueColorPixels++;
      }
      assert.equal(alphaDifferences, 0);assert.equal(transparentBackgroundDifferences, 0);assert(exactOpaqueColorPixels > 0);
      if (palette.paletteId === 'yellow') assert.equal(changedPixels, 0);else assert(changedPixels > 0);
      const b = selected.visibleSubtitleY.alphaBounds;
      assert(b.left >= safe.left / 2 && b.top >= safe.top / 2 && b.right < width - safe.right / 2 && b.bottom < height - safe.bottom / 2);
      const composite = path.join(outputDirectory, palette.paletteId + '-on-brightest-observed-background.png');
      await run(tools.imageMagickPath, [selected.backgroundPng.path, png, '-compose', 'Over', '-composite', composite]);
      paletteRows.push({...palette, alphaDifferences, transparentBackgroundDifferences, changedPixels, exactOpaqueColorPixels,
        lineBreakUnchanged: true, insideSafeArea: true, overlay: await bind(png), composite: await bind(composite)});
    }
    await session.close();session = null;
    for (const ref of refs) same(await bind(ref.path), ref, 'input changed during bright-background supplement');
    const result = {schemaVersion: 'caption-palette-bright-background-v001', status: 'passed', startedAt, endedAt: new Date().toISOString(),
      wallMilliseconds: performance.now() - start, inputs: refs, profileId: completion.profileId, sampleCount: samples.length,
      selectionRule: 'Exactly one middle frame for each of the 18 saved Color captions; choose greatest arithmetic mean of decoded Y at the saved nonzero-alpha subtitle pixels.',
      selectedIndex, selectedCaptionId: selected.captionId, selectedFrame: selected.frame,
      selectedVisibleSubtitleMeanY: selected.visibleSubtitleY.mean, samples, palettes: paletteRows,
      priorTechnicalGuarantees: {ref: refs[1], scope: 'The frozen 3-caption x 3-color diagnostic independently proved range-only changes, full alpha identity, stroke/glow identity and glyph geometry. This supplement adds real-background coverage and three selected-caption alpha checks; it does not rerun the independent glyph mask/stroke harness.',
        oldYellowMatchesSaved: true, selectedFrameRangeOnlyNotIndependentlyRemeasured: true},
      limitations: ['The brightest sample is relative to these 18 middle frames, not a claim that it is a white background or a global source maximum.',
        'No synthetic white background was created.', 'Human palette adoption is not evaluated.'],
      commands, operations, humanQuality: 'not-evaluated', externalApiCalls: 0};
    await save(path.join(outputDirectory, 'summary.json'), result);return result;
  } catch (error) {await save(path.join(outputDirectory, 'failure.json'), {status: 'failed', error: error.stack, refs, samples, paletteRows, commands, operations});throw error;}
  finally {await session?.close();}
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runCaptionPaletteBrightBackgroundV001({
    completionPath: path.resolve('runtime/artifacts/digest-structure-20260929-v001/candidate/completion.json'),
    priorProbePath: path.resolve('runtime/artifacts/caption-palette-20260929-v001/pixel-probe-v003/summary.json'),
    outputDirectory: path.resolve('runtime/artifacts/caption-palette-20260929-v001/bright-background-v001')});
  console.log(JSON.stringify({status: result.status, sampleCount: result.sampleCount, selectedCaptionId: result.selectedCaptionId,
    selectedFrame: result.selectedFrame, meanY: result.selectedVisibleSubtitleMeanY, wallMilliseconds: result.wallMilliseconds}));
}
