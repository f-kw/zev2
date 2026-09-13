import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, lstat, realpath} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPresentationCompositeArgumentsV001, buildPresentationFrameExtractionArgumentsV001,
  renderPresentationCounterfactualEncodedFrameV001} from './render_presentation_v002.mjs';
import {buildCachedCounterfactualArgumentsV001, buildPreEncodeFrameHashArgumentsV001,
  inspectNonOverlappingCaptionTimelineV001} from './unseen_material_qc_lossless_cache_v001.mjs';
import {STREAM_INTERPRETATION_FIELDS_V001, deriveObservedStreamRestorationV001,
  restoreObservedStreamMetadataArgumentsV001} from './unseen_material_qc_color_metadata_v001.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORK = path.join(ROOT, 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001');
const DEST = path.join(WORK, 'qc-color-equivalence-v001');
const PROOF = path.join(WORK, 'qc-lossless-verification-v001.json');
const hash = b => createHash('sha256').update(b).digest('hex');
const read = async p => JSON.parse(await readFile(p, 'utf8'));
async function bind(p) {const s = await lstat(p); assert(s.isFile() && !s.isSymbolicLink());
  const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b);
  return {path: path.relative(ROOT, p), fileSha256: h.digest('hex'), bytes: s.size};}
const resolve = ref => path.isAbsolute(ref.path) ? ref.path : path.join(ROOT, ref.path);
const bound = async ref => {assert.deepEqual(await bind(resolve(ref)), ref); return read(resolve(ref));};
const save = async (p, x) => {await writeFile(p, JSON.stringify(x, null, 2) + '\n', {flag: 'wx'}); return bind(p);};
const decisionPath = path.join(WORK, 'advisor-qc-color-metadata-decision-v001.json');
const decision = await read(decisionPath); assert.equal(decision.decision, 'continue'); assert(decision.allowObservedColorMetadataRestoration);
const proof = await read(PROOF); assert.equal(proof.status, 'passed');
for (const ref of [...proof.implementationBindings, ...proof.artifacts]) assert.equal((await bind(resolve(ref))).fileSha256, ref.fileSha256);
const fixture = await bound(proof.fullFixtureBinding), sample = await bound(proof.actualSampleBinding);
const fixtureDir = path.dirname(resolve(proof.fullFixtureBinding));
const generationPath = path.join(WORK, 'formal-v004/qc-only-v001/cache/baseline-generation-input.json');
const generation = await read(generationPath);
const jobPath = path.join(WORK, 'formal-v004/render-attempt-v008/renderer-job.json'), job = await read(jobPath);
for (const ref of Object.values(job.runtimeBindings)) assert.equal((await bind(await realpath(ref.path))).fileSha256, ref.fileSha256);
const FFMPEG = job.runtimeBindings.ffmpeg.path, FFPROBE = job.runtimeBindings.ffprobe.path, MAGICK = job.runtimeBindings.imageMagick.path;
const implementationNames = ['unseen_material_qc_color_metadata_v001.mjs', 'verify_unseen_material_qc_color_metadata_v001.mjs'];
const implementationBindings = await Promise.all(implementationNames.map(n => bind(path.join(ROOT, 'evals/clip_composition', n))));
await mkdir(DEST);
let sequence = 0;
const run = (command, args) => new Promise((resolveRun, reject) => {
  const number = ++sequence, started = Date.now(); const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  const out = [], err = []; child.stdout.on('data', b => out.push(b)); child.stderr.on('data', b => err.push(b)); child.on('error', reject);
  child.on('close', async (code, signal) => {try {
    const stdout = Buffer.concat(out); await save(path.join(DEST, `process-${String(number).padStart(3, '0')}.json`),
      {command, arguments: args, code, signal, elapsedMs: Date.now() - started, stdoutBytes: stdout.length,
        stdoutSha256: hash(stdout), stderr: Buffer.concat(err).toString()});
    assert.equal(code, 0); assert.equal(signal, null); resolveRun(stdout);
  } catch (e) {reject(e);}});
});
const help = await run(FFMPEG, ['-hide_banner', '-h', 'filter=setparams']);
await writeFile(path.join(DEST, 'setparams-help.txt'), help, {flag: 'wx'});
const inspect = async (p, name) => {const args = ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', p];
  const raw = JSON.parse((await run(FFPROBE, args)).toString()); assert.equal(raw.streams.length, 1);
  const stream = Object.fromEntries(STREAM_INTERPRETATION_FIELDS_V001.filter(k => raw.streams[0][k] !== undefined).map(k => [k, raw.streams[0][k]]));
  await save(path.join(DEST, name + '-metadata.json'), {media: await bind(p), arguments: args, raw, stream}); return stream;};
function compareFrames(a, b, count, label) {
  const parse = text => {text = text.toString(); const tb = text.match(/^#tb 0: (\d+)\/(\d+)$/mu); assert(tb);
    return {tb: tb.slice(1).map(BigInt), rows: text.split('\n').filter(s => s && !s.startsWith('#')).map(s => s.split(',').map(v => v.trim()))};};
  const x = parse(a), y = parse(b); assert.equal(x.rows.length, count, label); assert.equal(y.rows.length, count, label);
  for (let i = 0; i < count; i++) {assert.equal(x.rows[i].at(-1), y.rows[i].at(-1), `${label}: pixels frame ${i}`);
    assert.equal(BigInt(x.rows[i][2]) * x.tb[0] * y.tb[1], BigInt(y.rows[i][2]) * y.tb[0] * x.tb[1], `${label}: PTS ${i}`);}
}
const cap = args => {const a = [...args]; a[a.indexOf('-frames:v') + 1] = '900'; return a;};
async function pre(args, name) {const bytes = await run(FFMPEG, buildPreEncodeFrameHashArgumentsV001(args));
  await writeFile(path.join(DEST, name + '.framehash.txt'), bytes, {flag: 'wx'}); return bytes;}
async function decoded(p, pixelFormat, name, count) {
  const bytes = await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', p, '-map', '0:v:0',
    ...(count === undefined ? [] : ['-frames:v', String(count)]), '-pix_fmt', pixelFormat, '-f', 'framehash', '-hash', 'sha256', '-']);
  await writeFile(path.join(DEST, name + '.framehash.txt'), bytes, {flag: 'wx'}); return bytes;
}
const pixels = async p => run(MAGICK, [p, '-depth', '8', 'rgba:-']);
const results = [], comparisons = new Map();
async function verifyCase({name, oldArgs, rawNewArgs, oldPre, oldVideo, input, representativeFrame, omit}) {
  const base = await inspect(input.baseMediaPath, name + '-base');
  const main = await inspect(oldVideo, name + '-legacy');
  const cachePath = rawNewArgs[rawNewArgs.indexOf('-i') + 1], cache = await inspect(cachePath, name + '-cache');
  const metadata = deriveObservedStreamRestorationV001({base, main, cache});
  const newArgs = restoreObservedStreamMetadataArgumentsV001(rawNewArgs, metadata);
  const metadataBinding = await save(path.join(DEST, name + '-restoration.json'), metadata);
  const [before, after] = [await pre(rawNewArgs, name + '-before-restoration'), await pre(newArgs, name + '-after-restoration')];
  compareFrames(before, oldPre, 900, name + ': original pre-encode'); compareFrames(after, before, 900, name + ': metadata only');
  const newVideo = path.join(DEST, name + '-restored.mp4');
  await save(path.join(DEST, name + '-input.json'), {input, oldArgs, rawNewArgs, newArgs, metadataBinding, oldVideo: await bind(oldVideo)});
  await run(FFMPEG, [...newArgs, '-movflags', '+faststart', newVideo]);
  const observedRestored = await inspect(newVideo, name + '-restored');
  for (const k of STREAM_INTERPRETATION_FIELDS_V001.filter(k => !['time_base','r_frame_rate'].includes(k))) assert.equal(observedRestored[k], main[k], name + ':' + k);
  for (const format of ['yuv420p', 'rgba']) {
    const a = await decoded(oldVideo, format, name + '-legacy-' + format), b = await decoded(newVideo, format, name + '-restored-' + format);
    compareFrames(b, a, 900, name + ': decoded ' + format);
  }
  const oldPng = path.join(DEST, name + '-legacy.png'), newPng = path.join(DEST, name + '-restored.png');
  for (const [p, outputPath] of [[oldVideo, oldPng], [newVideo, newPng]]) await run(FFMPEG,
    buildPresentationFrameExtractionArgumentsV001({inputPath: p, frame: representativeFrame, outputPath, fps: 30}));
  const expectedPixels = await pixels(oldPng); assert.deepEqual(await pixels(newPng), expectedPixels);
  const request = {instructionId: omit, ffmpegPath: FFMPEG, compositeArguments: newArgs,
    representativeFrame, expectedFrameCount: 900, outputPath: path.join(DEST, name + '-stream.png')};
  const streamOutcome = await renderPresentationCounterfactualEncodedFrameV001(request); assert.equal(streamOutcome.status, 'completed');
  assert.deepEqual(await pixels(request.outputPath), expectedPixels); comparisons.set(name, expectedPixels);
  results.push({name, frames: 900, metadataBinding, preEncodeYuvUnchanged: true, originalPreEncodeYuvIdentical: true,
    decodedYuvIdentical: true, decodedRgbaIdentical: true, representativePngIdentical: true,
    streamedPngIdentical: true, oldVideo: await bind(oldVideo), newVideo: await bind(newVideo), streamOutcome});
  console.log(JSON.stringify({status: 'color-equivalence-case-passed', name, yuvFrames: 900, rgbaFrames: 900}));
}
for (const r of fixture.results) {
  for (const ref of [r.baselineCache, r.transparentCache, r.oldVideo, r.newVideo]) assert.deepEqual(await bind(resolve(ref)), ref);
  const saved = await bound(r.input); const target = saved.input.overlayRecords[0].element;
  await verifyCase({name: r.name, oldArgs: saved.oldArgs, rawNewArgs: saved.newArgs, input: saved.input,
    oldPre: await readFile(path.join(fixtureDir, r.name + '-legacy-omitted.framehash.txt')), oldVideo: resolve(r.oldVideo),
    representativeFrame: target.startFrame + Math.floor(target.displayFrameCount / 2),
    omit: r.outcome.instructionId ?? (r.name === 'wrong-omission' ? 'other' : 'target')});
}
assert.notDeepEqual(comparisons.get('wrong-omission'), comparisons.get('regular'));
assert.deepEqual(comparisons.get('transparent'), await pixels(path.join(fixtureDir, 'transparent-full.png')));
const overlapInput = structuredClone(generation.input); overlapInput.overlayRecords[1].element.startFrame = overlapInput.overlayRecords[0].element.startFrame;
assert.throws(() => inspectNonOverlappingCaptionTimelineV001(overlapInput), /OVERLAPPING_CAPTIONS_UNSUPPORTED/u);
assert.throws(() => buildCachedCounterfactualArgumentsV001({input: overlapInput, baselineCachePath: 'unused', transparentCachePath: 'unused', instructionId: overlapInput.overlayRecords[0].element.instructionId}), /OVERLAPPING_CAPTIONS_UNSUPPORTED/u);
// Actual BT.709 media: compare with the original full 343-input graph, not an
// invented expected color profile or a synthetic replacement for the main.
for (const r of sample.results) assert.deepEqual(await bind(resolve(r.cache)), r.cache);
const actualInput = generation.input, target = actualInput.overlayRecords[0].element;
const blankPath = resolve(sample.transparentPng);
assert.deepEqual(await bind(blankPath), sample.transparentPng);
const omitted = {...actualInput, overlayRecords: actualInput.overlayRecords.map(r => r.element.instructionId === target.instructionId ? {...r, pngPath: blankPath} : r)};
const oldArgs = cap(buildPresentationCompositeArgumentsV001({...omitted, serializePngAndFilters: true}));
const oldPre = await pre(oldArgs, 'actual-bt709-original');
const oldVideo = path.join(DEST, 'actual-bt709-legacy.mp4');
await run(FFMPEG, [...oldArgs, '-movflags', '+faststart', oldVideo]);
const actualRaw = cap(buildCachedCounterfactualArgumentsV001({input: actualInput,
  baselineCachePath: resolve(sample.results.find(r => r.name === 'baseline').cache),
  transparentCachePath: resolve(sample.results.find(r => r.name === 'transparent').cache), instructionId: target.instructionId}));
await verifyCase({name: 'actual-bt709', oldArgs, rawNewArgs: actualRaw, oldPre, oldVideo, input: actualInput,
  representativeFrame: target.startFrame + Math.floor(target.displayFrameCount / 2), omit: target.instructionId});
for (const ref of implementationBindings) assert.deepEqual(await bind(resolve(ref)), ref);
await save(path.join(DEST, 'result.json'), {status: 'passed', scope: '024-only observed metadata restoration, no color conversion or invented defaults',
  implementationBindings, inheritedLosslessProof: await bind(PROOF), decision: await bind(decisionPath),
  actualFullGraphInput: await bind(generationPath), runtimeBindings: job.runtimeBindings,
  totalYuvFramesCompared: 5400, totalRgbaFramesCompared: 5400, preEncodeYuvUnchanged: true,
  originalPreEncodeYuvIdentical: true, allRepresentativePngsIdentical: true, allStreamedPngsIdentical: true,
  overlappingInputsRejected: true, wrongOmissionDistinguished: true, transparentDifferenceZero: true,
  originalPositionChangeNegativePreservedByExactEquality: true, results,
  formalFull65363FrameGate: 'still-required-before-343-QC'});
console.log(JSON.stringify({status: 'color-equivalence-passed', result: await bind(path.join(DEST, 'result.json'))}));
