import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {buildCachedCounterfactualArgumentsV001} from './unseen_material_qc_lossless_cache_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORK = path.join(ROOT, 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001');
const SAMPLE = path.join(WORK, 'qc-lossless-actual-sample-v001');
const DIAG = path.join(WORK, 'qc-cache-color-diagnostic-v001');
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const save = async (p, x) => writeFile(p, JSON.stringify(x, null, 2) + '\n', {flag: 'wx'});
async function bind(p) {
  const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b);
  return {path: path.relative(ROOT, p), fileSha256: h.digest('hex'), bytes: (await stat(p)).size};
}
const executions = [];
function run(command, args) {
  const started = Date.now();
  const out = spawnSync(command, args, {maxBuffer: 16 * 1024 * 1024});
  executions.push({command, args, exitCode: out.status, signal: out.signal, elapsedMs: Date.now() - started,
    stderr: out.stderr?.toString() ?? ''});
  assert.equal(out.status, 0); assert.equal(out.signal, null);
  return out.stdout.toString();
}
const rows = text => text.split('\n').filter(s => s && !s.startsWith('#')).map(s => s.split(',').map(v => v.trim()));
await mkdir(DIAG);
const capturePath = path.join(WORK, 'render-v008-completed-main-verification-v001.json');
const capture = await read(capturePath); assert.equal(capture.status, 'main-video-completed-and-verified');
const mainPath = path.join(ROOT, capture.video.path); assert.equal((await bind(mainPath)).fileSha256, capture.video.fileSha256);
const job = await read(path.join(WORK, 'formal-v004/render-attempt-v008/renderer-job.json'));
const generationPath = path.join(WORK, 'formal-v004/qc-only-v001/cache/baseline-generation-input.json');
const generation = await read(generationPath);
const liveHashPath = path.join(WORK, 'formal-v004/qc-only-v001/cache/baseline-pre-encode.framehash.txt');
const liveHash = await readFile(liveHashPath, 'utf8');
const headers = liveHash.split('\n').filter(s => s.startsWith('#'));
const originalRows = rows(liveHash).slice(0, 900); assert.equal(originalRows.length, 900);
const sampleRows = rows(await readFile(path.join(SAMPLE, 'baseline-original.framehash.txt'), 'utf8'));
assert.equal(sampleRows.length, 900);
for (let i = 0; i < 900; i++) assert.deepEqual(originalRows[i], sampleRows[i], `Original full graph prefix differs at ${i}`);
const prefixPath = path.join(DIAG, 'actual-full-graph-first900.framehash.txt');
await writeFile(prefixPath, [...headers, ...originalRows.map(row => row.join(', '))].join('\n') + '\n', {flag: 'wx'});
const cachePath = path.join(SAMPLE, 'baseline.nut');
const args = buildCachedCounterfactualArgumentsV001({input: generation.input,
  baselineCachePath: cachePath, transparentCachePath: cachePath,
  instructionId: generation.input.overlayRecords[0].element.instructionId});
args[args.indexOf('-frames:v') + 1] = '900';
const replayPath = path.join(DIAG, 'baseline-first900-without-restored-color.mp4');
run(job.runtimeBindings.ffmpeg.path, [...args, '-movflags', '+faststart', replayPath]);
const comparisons = [];
for (const pixelFormat of ['yuv420p', 'rgba']) {
  const records = [];
  for (const [name, input] of [['main', mainPath], ['cache-replay', replayPath]]) {
    const output = run(job.runtimeBindings.ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-i', input,
      '-map', '0:v:0', '-frames:v', '600', '-pix_fmt', pixelFormat, '-f', 'framehash', '-hash', 'sha256', '-']);
    const p = path.join(DIAG, `${name}-${pixelFormat}.framehash.txt`); await writeFile(p, output, {flag: 'wx'});
    const actual = rows(output); assert.equal(actual.length, 600); records.push({rows: actual, binding: await bind(p)});
  }
  const differentFrames = records[0].rows.filter((row, i) => row.at(-1) !== records[1].rows[i].at(-1)).length;
  comparisons.push({pixelFormat, framesCompared: 600, identicalFrames: 600 - differentFrames, differentFrames,
    artifacts: records.map(r => r.binding)});
}
const metadata = [];
for (const [name, input] of [['main', mainPath], ['cache', cachePath], ['cache-replay', replayPath]]) {
  metadata.push({name, file: await bind(input), value: JSON.parse(run(job.runtimeBindings.ffprobe.path,
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
      'stream=codec_name,pix_fmt,color_range,color_space,color_transfer,color_primaries,chroma_location,sample_aspect_ratio,avg_frame_rate',
      '-of', 'json', input]))});
}
const result = {schemaVersion: 'unseen-material-qc-cache-color-diagnostic-v001', status: 'diagnostic-completed',
  implementation: await bind(fileURLToPath(import.meta.url)), mainCompletion: await bind(capturePath),
  originalFullGraphInput: await bind(generationPath), originalFullGraphFirst900: await bind(prefixPath),
  sampledPreEncodeFirst900ExactFullGraphMatch: true, cache: await bind(cachePath),
  replay: await bind(replayPath), replayFrames: 900, comparedPrefixFrames: 600,
  scope: 'Actual full-graph first 900 pre-encode frames match the earlier sample. Compare the first 600 decoded frames with the completed full main; report YUV and RGBA separately. No color correction or main mutation.',
  comparisons, metadata, executions};
await save(path.join(DIAG, 'result.json'), result);
console.log(JSON.stringify({status: result.status, comparisons, result: await bind(path.join(DIAG, 'result.json'))}));
