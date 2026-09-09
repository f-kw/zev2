import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {readFile, writeFile, mkdir, statfs, stat, realpath} from 'node:fs/promises';
import {buildPresentationInstructionCommonCorePlanV001} from './run_presentation_instruction_renderer_job_v002.ts';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
import {buildLosslessCompositeCacheArgumentsV001, buildCachedCounterfactualArgumentsV001,
  buildPreEncodeFrameHashArgumentsV001} from './unseen_material_qc_lossless_cache_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORK = path.join(ROOT, 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001');
const DEST = path.join(WORK, 'qc-lossless-actual-sample-v001');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bind = async p => {const digest = createHash('sha256');
  for await (const chunk of createReadStream(p)) digest.update(chunk);
  return {path: path.relative(ROOT, p), fileSha256: digest.digest('hex'), bytes: (await stat(p)).size};};
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const bound = async ref => {const p = path.join(ROOT, ref.path); assert.equal((await bind(p)).fileSha256, ref.fileSha256); return read(p);};
const save = (p, value) => writeFile(p, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const shortFrameCount = 900; // Same 30-second span as the existing equivalence fixture.
const jobPath = path.join(WORK, 'formal-v004/render-attempt-v008/renderer-job.json');
const job = await read(jobPath);
for (const ref of job.rendererImplementationBindings) assert.equal((await bind(path.join(ROOT, ref.path))).fileSha256, ref.fileSha256);
for (const ref of Object.values(job.runtimeBindings)) {
  const resolved = await realpath(ref.path);
  assert.equal((await bind(resolved)).fileSha256, ref.fileSha256);
  assert.equal(await realpath(ref.path), resolved);
}
const instruction = await bound(job.instructionArtifactBinding);
const style = await bound(job.registryBindings.styleProfileRegistry);
const trust = await bound(job.registryBindings.rendererTrust);
const layout = await read(path.join(ROOT, job.publication.lineLayoutPath));
const common = buildPresentationInstructionCommonCorePlanV001({job, visualStateId: job.executionInputs.visualStateId,
  instructionArtifact: instruction, lineLayout: layout, styleProfileRegistry: style, rendererTrust: trust});
assert.equal(common.status, 'built'); assert.equal(common.plan.elements.length, 343);
const retained = await read(path.join(WORK, 'render-v007-retained-artifacts-v001.json'));
const sourceRefs = new Map(retained.files.map(ref => [ref.path, ref]));
const records = [];
for (const [i, element] of common.plan.elements.entries()) {
  if (element.startFrame >= shortFrameCount) continue;
  const stem = `${String(i + 1).padStart(2, '0')}-${hash(element.instructionId).slice(0, 12)}`;
  const p = `${retained.workRoot}/publish/overlays/${stem}.png`;
  assert.equal((await bind(path.join(ROOT, p))).fileSha256, sourceRefs.get(p)?.fileSha256);
  records.push({element, pngPath: path.join(ROOT, p)});
}
const fullFrameCount = 65363;
const input = {baseMediaPath: path.join(ROOT, job.cropAppliedBaseMedia.baseMedia.path),
  plan: common.plan, expectedFrameCount: fullFrameCount, overlayRecords: records};
const baseBinding = await bind(input.baseMediaPath);
assert.equal(baseBinding.fileSha256, job.cropAppliedBaseMedia.baseMedia.fileSha256);
const transparentPng = path.join(WORK, 'qc-integrated-fixture-v001-ibyU3m/transparent.png');
const blank = {...input, overlayRecords: records.map(row => ({...row, pngPath: transparentPng}))};
await mkdir(DEST);
let sequence = 0;
const run = (command, args) => new Promise((resolve, reject) => {
  const number = ++sequence, start = Date.now(), child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  const out = [], err = []; child.stdout.on('data', b => out.push(b)); child.stderr.on('data', b => err.push(b)); child.on('error', reject);
  child.on('close', async (code, signal) => {
    const stdout = Buffer.concat(out), elapsedMs = Date.now() - start;
    await save(path.join(DEST, `process-${String(number).padStart(3, '0')}.json`), {command, arguments: args, code, signal,
      elapsedMs, stdoutBytes: stdout.length, stdoutSha256: hash(stdout), stderr: Buffer.concat(err).toString()});
    if (code === 0 && signal === null) resolve({stdout, elapsedMs});
    else reject(new Error(`actual sample process ${number} failed: ${code}/${signal}`));
  });
});
const cap = args => {const out = [...args], i = out.indexOf('-frames:v'); assert(i > 0); out[i + 1] = String(shortFrameCount); return out;};
const results = [];
for (const [name, source] of [['baseline', input], ['transparent', blank]]) {
  const cache = path.join(DEST, name + '.nut');
  const original = buildPresentationCompositeArgumentsV001({...source, serializePngAndFilters: true});
  const originalHash = (await run(job.runtimeBindings.ffmpeg.path, cap(buildPreEncodeFrameHashArgumentsV001(original)))).stdout;
  await writeFile(path.join(DEST, name + '-original.framehash.txt'), originalHash, {flag: 'wx'});
  const generation = await run(job.runtimeBindings.ffmpeg.path, [...cap(buildLosslessCompositeCacheArgumentsV001(source)), cache]);
  const decode = await run(job.runtimeBindings.ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-i', cache,
    '-map', '0:v:0', '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', '-']);
  await writeFile(path.join(DEST, name + '-decoded.framehash.txt'), decode.stdout, {flag: 'wx'});
  const rows = data => data.toString().split('\n').filter(s => s && !s.startsWith('#')).map(s => s.split(',').at(-1).trim());
  assert.equal(rows(originalHash).length, shortFrameCount); assert.deepEqual(rows(decode.stdout), rows(originalHash));
  const metadata = await run(job.runtimeBindings.ffprobe.path, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', cache]);
  const parsed = JSON.parse(metadata.stdout.toString());
  assert.equal(parsed.streams[0].pix_fmt, 'yuv420p'); assert.equal(parsed.streams[0].r_frame_rate, '30/1');
  await save(path.join(DEST, name + '-media.json'), parsed);
  results.push({name, cache: await bind(cache), generationMs: generation.elapsedMs, decodedFrameHashMs: decode.elapsedMs,
    all900CachePixelsIdentical: true});
  console.log(JSON.stringify({status: 'sample-cache-verified', name, frames: shortFrameCount, bytes: (await stat(cache)).size}));
}
const encoderArgs = cap(buildCachedCounterfactualArgumentsV001({input, baselineCachePath: path.join(DEST, 'baseline.nut'),
  transparentCachePath: path.join(DEST, 'transparent.nut'), instructionId: records[0].element.instructionId}));
const benchmark = await run(job.runtimeBindings.ffmpeg.path, [...encoderArgs, '-movflags', '+faststart', path.join(DEST, 'sample-counterfactual.mp4')]);
const fs = await statfs(WORK);
const availableBytes = fs.bavail * fs.bsize;
const observedPairBytes = results.reduce((sum, row) => sum + row.cache.bytes, 0);
const projectedPairBytes = Math.ceil(observedPairBytes * fullFrameCount / shortFrameCount);
await save(path.join(DEST, 'result.json'), {status: 'sample-measured', rendererJob: await bind(jobPath),
  baseBinding,
  implementation: await bind(fileURLToPath(import.meta.url)),
  cacheImplementation: await bind(path.join(ROOT, 'evals/clip_composition/unseen_material_qc_lossless_cache_v001.mjs')),
  sampleStartFrame: 0, sampleFrameCount: shortFrameCount, fullFrameCount, sampledCaptionCount: records.length,
  scope: 'capacity and throughput measurement on the first 900 actual base frames and captions intersecting them; later inactive inputs omitted only in this measurement, not a formal full-graph identity proof',
  unchangedCaptionInputs: records, transparentPng: await bind(transparentPng), results,
  cachedEncode900FramesMs: benchmark.elapsedMs, availableBytes, observedPairBytes, projectedPairBytes,
  projectionFitsObservedFreeSpace: projectedPairBytes < availableBytes,
  projectionMeaning: 'linear extrapolation from observed actual first-900-frame byte count, not a guaranteed bound on later scenes; no added reserve/limit/coefficient',
  formalFullScaleStarted: false});
console.log(JSON.stringify({status: 'sample-measured', projectedPairBytes, availableBytes, fits: projectedPairBytes < availableBytes}));
