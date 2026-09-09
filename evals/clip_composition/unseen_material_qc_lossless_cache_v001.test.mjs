import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtemp, readFile, writeFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {buildPresentationCompositeArgumentsV001, buildPresentationFrameExtractionArgumentsV001,
  renderPresentationCounterfactualEncodedFrameV001} from './render_presentation_v002.mjs';
import {inspectNonOverlappingCaptionTimelineV001, buildLosslessCompositeCacheArgumentsV001,
  buildCachedCounterfactualArgumentsV001, buildPreEncodeFrameHashArgumentsV001}
  from './unseen_material_qc_lossless_cache_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORK = path.join(ROOT, 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001');
const FIXTURE = path.join(WORK, 'qc-integrated-fixture-v001-ibyU3m');
const FFMPEG = '/opt/homebrew/bin/ffmpeg', FFPROBE = '/opt/homebrew/bin/ffprobe', MAGICK = '/opt/homebrew/bin/magick';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bind = async p => {const bytes = await readFile(p); return {path: path.relative(ROOT, p), bytes: bytes.length, fileSha256: hash(bytes)};};
const save = (p, value) => writeFile(p, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const canvas = {width: 1920, height: 1080, fps: 30};
const png = name => path.join(FIXTURE, name + '.png');
const inputFor = (start = 90, count = 61, target = 'target') => ({
  baseMediaPath: path.join(FIXTURE, 'base.mp4'), plan: {canvas}, expectedFrameCount: 900,
  overlayRecords: [{element: {instructionId: 'target', startFrame: start, displayFrameCount: count}, pngPath: png(target)},
    {element: {instructionId: 'other', startFrame: 10, displayFrameCount: 25}, pngPath: png('other')}],
});
const transparent = input => ({...input, overlayRecords: input.overlayRecords.map(row => ({...row, pngPath: png('transparent')}))});

test('024 lossless fast path refuses simultaneous captions and unknown targets before execution', () => {
  const simultaneous = inputFor(20, 61);
  assert.throws(() => inspectNonOverlappingCaptionTimelineV001(simultaneous), /OVERLAPPING_CAPTIONS_UNSUPPORTED/u);
  assert.throws(() => buildLosslessCompositeCacheArgumentsV001(simultaneous), /OVERLAPPING_CAPTIONS_UNSUPPORTED/u);
  assert.throws(() => buildCachedCounterfactualArgumentsV001({input: simultaneous,
    baselineCachePath: 'unused', transparentCachePath: 'unused', instructionId: 'target'}), /OVERLAPPING_CAPTIONS_UNSUPPORTED/u);
  assert.throws(() => buildCachedCounterfactualArgumentsV001({input: inputFor(),
    baselineCachePath: 'unused', transparentCachePath: 'unused', instructionId: 'absent'}), /UNKNOWN_INSTRUCTION/u);
  assert.deepEqual(inspectNonOverlappingCaptionTimelineV001(inputFor(35, 61)).overlapPairs, [], 'adjacent intervals are allowed');
});

test('lossless cached counterfactuals preserve every encoder input pixel and encoded frame', async () => {
  const directory = await mkdtemp(path.join(WORK, 'qc-lossless-fixture-v001-'));
  const code = ['render_presentation_v002.mjs', 'unseen_material_qc_lossless_cache_v001.mjs'];
  const implementations = await Promise.all(code.map(name => bind(path.join(ROOT, 'evals/clip_composition', name))));
  const fixtureBindings = await Promise.all(['base.mp4', 'target.png', 'other.png', 'transparent.png', 'moved.png'].map(name => bind(path.join(FIXTURE, name))));
  let processCount = 0;
  const run = (command, args) => new Promise((resolve, reject) => {
    const number = ++processCount, started = Date.now();
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']}), stdout = [], stderr = [];
    child.stdout.on('data', b => stdout.push(b)); child.stderr.on('data', b => stderr.push(b)); child.on('error', reject);
    child.on('close', async (code, signal) => {
      const result = {code, signal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)};
      await save(path.join(directory, `process-${String(number).padStart(3, '0')}.json`), {
        command, arguments: args, code, signal, elapsedMs: Date.now() - started,
        stdoutBytes: result.stdout.length, stdoutSha256: hash(result.stdout), stderr: result.stderr.toString(),
      });
      if (code === 0 && signal === null) resolve(result);
      else reject(new Error(JSON.stringify({code, signal, stderr: result.stderr.toString()})));
    });
  });
  const decodedHash = async video => (await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', video,
    '-map', '0:v:0', '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', '-'])).stdout;
  const frameRows = data => data.toString().split('\n').filter(row => row && !row.startsWith('#'))
    .map(row => row.split(',').map(value => value.trim()));
  const compareFrames = (actual, expected, label) => {
    const a = frameRows(actual), e = frameRows(expected);
    assert.equal(a.length, 900, label + ': cache frame count'); assert.equal(e.length, 900);
    assert.deepEqual(a.map(row => row.at(-1)), e.map(row => row.at(-1)), label + ': pixel sequence');
    // framehash headers may express container time bases differently; verify
    // each packet's rational presentation time, not the denominator spelling.
    const timebase = data => {const found = data.toString().match(/^#tb 0: (\d+)\/(\d+)$/mu); assert(found); return [BigInt(found[1]), BigInt(found[2])];};
    const [an, ad] = timebase(actual), [en, ed] = timebase(expected);
    for (let i = 0; i < a.length; i++) assert.equal(BigInt(a[i][2]) * an * ed, BigInt(e[i][2]) * en * ad, label + ': frame timing');
  };
  const preHash = async (args, name) => {
    const data = (await run(FFMPEG, buildPreEncodeFrameHashArgumentsV001(args))).stdout;
    await writeFile(path.join(directory, name + '.framehash.txt'), data, {flag: 'wx'}); return data;
  };
  const imagePixels = async p => (await run(MAGICK, [p, '-depth', '8', 'rgba:-'])).stdout;
  const cases = [
    {name: 'regular', input: inputFor(), omit: 'target'},
    {name: 'short-fade', input: inputFor(190, 3), omit: 'target'},
    {name: 'transparent', input: inputFor(410, 31, 'transparent'), omit: 'target'},
    {name: 'wrong-omission', input: inputFor(), omit: 'other'},
    {name: 'moved-target', input: inputFor(90, 61, 'moved'), omit: 'target'},
  ];
  const results = [], targetComparisonPixels = new Map(), fullPixels = new Map();
  for (const c of cases) {
    const baselineCachePath = path.join(directory, c.name + '-baseline.nut');
    const transparentCachePath = path.join(directory, c.name + '-transparent.nut');
    const baselineArgs = buildPresentationCompositeArgumentsV001({...c.input, serializePngAndFilters: true});
    const blankArgs = buildPresentationCompositeArgumentsV001({...transparent(c.input), serializePngAndFilters: true});
    const baselinePreHash = await preHash(baselineArgs, c.name + '-baseline-before-cache');
    const blankPreHash = await preHash(blankArgs, c.name + '-transparent-before-cache');
    await run(FFMPEG, [...buildLosslessCompositeCacheArgumentsV001(c.input), baselineCachePath]);
    await run(FFMPEG, [...buildLosslessCompositeCacheArgumentsV001(transparent(c.input)), transparentCachePath]);
    compareFrames(await decodedHash(baselineCachePath), baselinePreHash, c.name + ': baseline lossless');
    compareFrames(await decodedHash(transparentCachePath), blankPreHash, c.name + ': transparent lossless');
    const omitted = {...c.input, overlayRecords: c.input.overlayRecords.map(row => row.element.instructionId === c.omit
      ? {...row, pngPath: png('transparent')} : row)};
    const oldArgs = buildPresentationCompositeArgumentsV001({...omitted, serializePngAndFilters: true});
    const newArgs = buildCachedCounterfactualArgumentsV001({input: c.input, baselineCachePath, transparentCachePath, instructionId: c.omit});
    await save(path.join(directory, c.name + '-input.json'), {input: c.input, omitted, oldArgs, newArgs});
    const oldPre = await preHash(oldArgs, c.name + '-legacy-omitted');
    const newPre = await preHash(newArgs, c.name + '-cached-omitted');
    compareFrames(newPre, oldPre, c.name + ': assembled encoder input');
    const oldVideo = path.join(directory, c.name + '-legacy.mp4'), newVideo = path.join(directory, c.name + '-cached.mp4');
    await run(FFMPEG, [...oldArgs, '-movflags', '+faststart', oldVideo]);
    await run(FFMPEG, [...newArgs, '-movflags', '+faststart', newVideo]);
    const oldDecoded = await decodedHash(oldVideo), newDecoded = await decodedHash(newVideo);
    await writeFile(path.join(directory, c.name + '-legacy-decoded.framehash.txt'), oldDecoded, {flag: 'wx'});
    await writeFile(path.join(directory, c.name + '-cached-decoded.framehash.txt'), newDecoded, {flag: 'wx'});
    compareFrames(newDecoded, oldDecoded, c.name + ': encoded output');
    const target = c.input.overlayRecords[0].element;
    const representativeFrame = target.startFrame + Math.floor(target.displayFrameCount / 2);
    const oldPng = path.join(directory, c.name + '-legacy.png'), newPng = path.join(directory, c.name + '-cached.png');
    for (const [video, outputPath] of [[oldVideo, oldPng], [newVideo, newPng]]) {
      await run(FFMPEG, buildPresentationFrameExtractionArgumentsV001({inputPath: video, frame: representativeFrame, outputPath, fps: 30}));
    }
    const oldPixels = await imagePixels(oldPng);
    assert.deepEqual(await imagePixels(newPng), oldPixels, c.name + ': representative PNG');
    const request = {instructionId: c.omit, ffmpegPath: FFMPEG, compositeArguments: newArgs,
      representativeFrame, expectedFrameCount: 900, outputPath: path.join(directory, c.name + '-stream.png')};
    const outcome = await renderPresentationCounterfactualEncodedFrameV001(request);
    assert.equal(outcome.status, 'completed');
    assert.deepEqual(await imagePixels(request.outputPath), oldPixels, c.name + ': streamed representative PNG');
    targetComparisonPixels.set(c.name, oldPixels);
    const fullVideo = path.join(directory, c.name + '-full.mp4'), fullPng = path.join(directory, c.name + '-full.png');
    await run(FFMPEG, [...baselineArgs, '-movflags', '+faststart', fullVideo]);
    await run(FFMPEG, buildPresentationFrameExtractionArgumentsV001({inputPath: fullVideo, frame: representativeFrame, outputPath: fullPng, fps: 30}));
    fullPixels.set(c.name, await imagePixels(fullPng));
    if (c.name === 'transparent') assert.deepEqual(fullPixels.get(c.name), oldPixels, 'absent subtitle must produce zero encoded difference');
    results.push({name: c.name, frames: 900, allPreEncodePixelsIdentical: true, allDecodedFramesIdentical: true,
      representativePngIdentical: true, streamedPngIdentical: true, input: await bind(path.join(directory, c.name + '-input.json')),
      baselineCache: await bind(baselineCachePath), transparentCache: await bind(transparentCachePath),
      oldVideo: await bind(oldVideo), newVideo: await bind(newVideo), outcome});
    process.stdout.write('# ' + c.name + ': cache pixels, 900 encoder input/decoded frames, representative PNG identical\n');
  }
  assert.notDeepEqual(targetComparisonPixels.get('wrong-omission'), targetComparisonPixels.get('regular'), 'wrong omission must be distinguishable');
  assert.notDeepEqual(fullPixels.get('moved-target'), fullPixels.get('regular'), 'target position change must be distinguishable');
  for (const ref of implementations) assert.deepEqual(await bind(path.join(ROOT, ref.path)), ref, 'active implementation mutated');
  await save(path.join(directory, 'result.json'), {status: 'passed', implementations, fixtureBindings,
    admission: {simultaneousCaptionsRejected: true, adjacentCaptionsAllowed: true},
    preEncodePixelsIdentical: true, decodedFramesIdentical: true, representativePngsIdentical: true,
    transparentDifferenceZero: true, wrongOmissionDistinguished: true, positionChangeDistinguished: true,
    totalDecodedFramesCompared: 4500, results});
  process.stdout.write('# evidence: ' + directory + '\n');
});
