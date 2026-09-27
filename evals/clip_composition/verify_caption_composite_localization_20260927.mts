/** Limited saved-PNG compositor experiment; never renders the protected full draft. */
import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {mkdir, readFile, writeFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.env.ZEV_CAPTION_COMPOSITE_OUTPUT ?? path.join(root, 'runtime/artifacts/caption-composite-localization-20260927-v001'));
assert(out.startsWith(path.join(root, 'runtime/artifacts') + path.sep), 'experiment outputs belong under ignored runtime artifacts');
const retained = path.join(root, 'evals/clip_composition/outputs/presentation/.new-material-digest-20260926-first-draft-v001.presentation-renderer-v002-work-JdfNbP');
const original = path.join(root, 'evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001/presentation-rendered-v002.mp4');
const background = path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001/presentation/background');
const before = 'c17c8de83f127d156c0d031d6866ba2024c7b490';
const renderer = path.join(root, 'evals/clip_composition/render_presentation_v002.mjs');
const ffmpeg = '/opt/homebrew/bin/ffmpeg';
const ranges = [
  {name: 'A', startFrame: 7347, endFrameExclusive: 7872, reason: 'Normal, Shake, Bounce, short fades, gaps and identical PNG at different clocks'},
  {name: 'B', startFrame: 10058, endFrameExclusive: 10552, reason: 'Normal, partial Color, Panel, Bounce, switches and gaps'},
];
const json = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const save = (p: string, value: unknown) => writeFile(p, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function hash(p: string) {const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b); return h.digest('hex');}
async function bound(p: string) {return {path: p, bytes: (await stat(p)).size, sha256: await hash(p)};}
function time(log: string) {
  const m = [...log.matchAll(/\s+(\d+(?:\.\d+)?) real\s+(\d+(?:\.\d+)?) user\s+(\d+(?:\.\d+)?) sys/g)].at(-1);
  assert(m, 'native /usr/bin/time counters required');
  const rss = log.match(/(\d+)\s+maximum resident set size/); assert(rss);
  return {realSeconds: +m[1], userSeconds: +m[2], systemSeconds: +m[3], maximumResidentSetBytes: +rss[1],
    memoryScope: 'timed ffmpeg process, all its threads; Node parent excluded',
    averageCpuCores: (+m[2] + +m[3]) / +m[1]};
}
async function run(label: string, args: string[]) {
  await mkdir(out, {recursive: true});
  await save(path.join(out, label + '-command.json'), {command: ffmpeg, args});
  const logPath = path.join(out, label + '.log'), stdoutPath = path.join(out, label + '.stdout');
  const stderr = createWriteStream(logPath, {flags: 'wx'}), stdout = createWriteStream(stdoutPath, {flags: 'wx'});
  const start = performance.now();
  const child = spawn('/usr/bin/time', ['-l', ffmpeg, ...args], {stdio: ['ignore', 'pipe', 'pipe'], detached: true});
  const interrupt = () => {if (child.pid) process.kill(-child.pid, 'SIGTERM');};
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  child.stdout.pipe(stdout); child.stderr.pipe(stderr);
  const exit = await new Promise(resolve => child.once('close', (code, signal) => resolve({code, signal})));
  await Promise.all([new Promise(resolve => stdout.end(resolve)), new Promise(resolve => stderr.end(resolve))]);
  process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  const log = await readFile(logPath, 'utf8');
  const result = {label, exit, wallSeconds: (performance.now() - start) / 1000, ...time(log), logPath, stdoutPath};
  await save(path.join(out, label + '-timing.json'), result);
  assert.deepEqual(exit, {code: 0, signal: null}, log.slice(-6000));
  console.log(JSON.stringify(result)); return result;
}
function structure(args: string[]) {
  const graph = args[args.indexOf('-filter_complex') + 1];
  return {pngInputs: args.filter(v => v === '-loop').length, overlayCount: (graph.match(/overlay=/g) ?? []).length,
    alphaCount: (graph.match(/geq=/g) ?? []).length, graphCharacters: graph.length,
    explicitFilterCount: (graph.match(/(?:^|[;,\]])(?:format|trim|setpts|geq|overlay|fps|split|concat|settb)=/g) ?? []).length};
}
async function input(range: typeof ranges[0]) {
  const plan = await json(path.join(retained, 'scratch/native-qc-preparation/plan.json'));
  const preparation = await json(path.join(retained, 'scratch/native-qc-preparation/preparation.json'));
  const active = (e: any) => e.startFrame < range.endFrameExclusive && e.endFrameExclusive > range.startFrame;
  return {baseMediaPath: path.join(out, range.name + '-background.nut'),
    audioMediaPath: path.join(out, range.name + '-audio.m4a'),
    plan: {...plan, elements: plan.elements.filter(active)}, overlayRecords: preparation.records.filter((r: any) => active(r.element)),
    expectedFrameCount: range.endFrameExclusive - range.startFrame, serializePngAndFilters: true,
    renderRange: {startFrame: range.startFrame, endFrameExclusive: range.endFrameExclusive, fullFrameCount: 27949}};
}
async function prepare() {
  const expectedSource = execFileSync('git', ['show', before + ':evals/clip_composition/render_presentation_v002.mjs'], {cwd: root});
  const importSource = expectedSource.toString().replace(/(['"])(\.\/[^'"\n]+)\1/g,
    (_match, quote, relative) => quote + new URL(relative, import.meta.url).href + quote)
    .replaceAll('import.meta.url', JSON.stringify(new URL('./render_presentation_v002.mjs', import.meta.url).href));
  const previous = await import('data:text/javascript;base64,' + Buffer.from(importSource).toString('base64'));
  await mkdir(out, {recursive: true});
  const protectedBefore = await bound(original); assert.equal(protectedBefore.sha256, '11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a');
  await save(path.join(out, 'protected-original-before.json'), protectedBefore);
  for (const r of ranges) {
    const source = path.join(background, 'background.nut');
    await run(r.name + '-prepare-background', ['-hide_banner', '-v', 'error', '-n', '-i', source,
      '-vf', `trim=start_frame=${r.startFrame}:end_frame=${r.endFrameExclusive},setpts=PTS-STARTPTS`,
      '-an', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', path.join(out, r.name + '-background.nut')]);
    // One immutable packet-copy sidecar per range, shared by ALL experiment variants.
    // Its packet-cut boundaries are recorded; this is not a full-Digest audio rewrite.
    await run(r.name + '-prepare-audio', ['-hide_banner', '-v', 'error', '-n', '-i', path.join(background, 'audio.m4a'),
      '-ss', String(r.startFrame / 30), '-t', String((r.endFrameExclusive - r.startFrame) / 30),
      '-c:a', 'copy', path.join(out, r.name + '-audio.m4a')]);
    const params = await input(r), args = previous.buildPresentationCompositeArgumentsV001(params);
    const pngs = [...new Set(params.overlayRecords.flatMap((row: any) =>
      (row.motionStates ?? row.pulseStates ?? [row]).map((state: any) => state.pngPath)))];
    await save(path.join(out, r.name + '-baseline-arguments.json'), args);
    await save(path.join(out, r.name + '-manifest.json'), {...r, frameCount: params.expectedFrameCount,
      subtitleIds: params.overlayRecords.map((row: any) => row.element.instructionId),
      subtitleCount: params.overlayRecords.length, structure: structure(args),
      input: await bound(params.baseMediaPath), audio: await bound(params.audioMediaPath),
      pngs: await Promise.all(pngs.map(p => bound(String(p))))});
  }
  await save(path.join(out, 'source-bindings.json'), {beforeCommit: before,
    baselineRendererSha256: createHash('sha256').update(expectedSource).digest('hex'), renderer: await bound(renderer),
    tool: await bound(ffmpeg), version: execFileSync(ffmpeg, ['-version']).toString(),
    plan: await bound(path.join(retained, 'scratch/native-qc-preparation/plan.json')),
    preparation: await bound(path.join(retained, 'scratch/native-qc-preparation/preparation.json')),
    background: await bound(path.join(background, 'background.nut')), audio: await bound(path.join(background, 'audio.m4a'))});
}
async function argsFor(r: typeof ranges[0], variant: string) {
  const baseline = await json(path.join(out, r.name + '-baseline-arguments.json'));
  if (variant === 'baseline') return baseline;
  const candidate = buildPresentationCompositeArgumentsV001(await input(r));
  const graphIndex = baseline.indexOf('-filter_complex') + 1;
  assert.deepEqual(candidate.map((v: string, i: number) => i === graphIndex ? null : v),
    baseline.map((v: string, i: number) => i === graphIndex ? null : v), 'only the graph may differ');
  return candidate;
}
async function encode(variant: string, repeat: string) {
  assert(['baseline', 'candidate'].includes(variant)); assert(/^[12]$/.test(repeat));
  for (const r of ranges) {
    const args = await argsFor(r, variant), name = r.name + '-' + variant + '-' + repeat;
    const mp4 = path.join(out, name + '.mp4');
    const result = await run(name, [...args, '-movflags', '+faststart', mp4]);
    await save(path.join(out, name + '-result.json'), {...result, ...structure(args), output: await bound(mp4),
      argumentSource: variant === 'baseline' ? before : 'current builder', rendererAtInvocation: await bound(renderer)});
  }
}
async function profile() {
  for (const r of ranges) {
    const args = await argsFor(r, 'baseline');
    const gi = args.indexOf('-filter_complex') + 1; let index = 0;
    args[gi] = args[gi].replace(/geq=r='r\(X,Y\)':g='g\(X,Y\)':b='b\(X,Y\)':a='[^']*'/g,
      (match: string) => {const n = index++; return `bench@alpha${n}_start=start,${match},bench@alpha${n}_stop=stop`;});
    args[args.indexOf('-loglevel') + 1] = 'info';
    // These are diagnostic timings, excluded from the uninstrumented encode comparison.
    await run(r.name + '-profile-alpha', [...args, '-benchmark', '-benchmark_all', '-movflags', '+faststart', path.join(out, r.name + '-profile-alpha.mp4')]);
    const log = await readFile(path.join(out, r.name + '-profile-alpha.log'), 'utf8');
    const samples: Record<string, number[]> = {};
    for (const m of log.matchAll(/\[bench(?:@[^\s]+)? @ (0x[0-9a-f]+)\] t:([\d.]+)/g)) (samples[m[1]] ??= []).push(+m[2]);
    assert(Object.keys(samples).length === index, 'each measured alpha branch must have a bench observation');
    await save(path.join(out, r.name + '-profile-alpha-summary.json'), {meaning: 'wall intervals across format conversion and geq; diagnostic only, not additive CPU allocation',
      runtimeGroups: Object.entries(samples).map(([id, values]) => ({id, frames: values.length, seconds: values.reduce((a,b) => a+b,0)})),
      totalSeconds: Object.values(samples).flat().reduce((a,b) => a+b,0)});
    await run(r.name + '-profile-base-decode', ['-hide_banner', '-v', 'info', '-i', path.join(out, r.name + '-background.nut'),
      '-an', '-benchmark', '-f', 'null', '-']);
  }
}
async function verify() {
  for (const r of ranges) {
    for (const v of ['baseline', 'candidate']) {
      const args = await argsFor(r, v), map = args.indexOf('-map'), count = r.endFrameExclusive - r.startFrame;
      const prefix = args.slice(0, map), graphIndex = prefix.indexOf('-filter_complex') + 1;
      prefix[graphIndex] += v === 'baseline' ? ';[video]split=2[videoHash][videoLossless]' : ';[video]null[videoHash]';
      await run(r.name + '-' + v + '-precompression', [...prefix,
        '-map', '[videoHash]', '-frames:v', String(count), '-an', '-c:v', 'rawvideo',
        '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', '-',
        ...(v === 'baseline' ? ['-map', '[videoLossless]', '-frames:v', String(count), '-an', '-c:v', 'ffv1',
          '-level', '3', '-pix_fmt', 'yuv420p', path.join(out, r.name + '-preencoder.nut')] : [])]);
      await run(r.name + '-' + v + '-audio', ['-v', 'error', '-i', path.join(out, r.name + '-' + v + '-1.mp4'),
        '-map', '0:a:0', '-c', 'copy', '-f', 'framehash', '-hash', 'sha256', '-']);
    }
    const comparison = {video: false, audio: false, mp4: false};
    for (const [what, key] of [['precompression', 'video'], ['audio', 'audio']]) {
      const a = await readFile(path.join(out, r.name + '-baseline-' + what + '.stdout'));
      const b = await readFile(path.join(out, r.name + '-candidate-' + what + '.stdout'));
      const rows = a.toString().split('\n').filter(line => line && !line.startsWith('#'));
      assert(rows.length > 0, 'empty observations cannot establish equality');
      if (key === 'video') {
        assert.equal(rows.length, r.endFrameExclusive - r.startFrame);
        assert(a.toString().includes('#tb 0: 1/30'));
        for (const [index, line] of rows.entries()) {
          const fields = line.split(',').map(field => field.trim());
          assert.deepEqual(fields.slice(0, 5).map(Number), [0, index, index, 1, 1920 * 1080 * 3 / 2]);
        }
      }
      comparison[key] = a.equals(b);
      await save(path.join(out, r.name + '-' + what + '-comparison.json'), {equal: a.equals(b),
        baseline: await bound(path.join(out, r.name + '-baseline-' + what + '.stdout')),
        candidate: await bound(path.join(out, r.name + '-candidate-' + what + '.stdout'))});
    }
    comparison.mp4 = await hash(path.join(out, r.name + '-baseline-1.mp4')) === await hash(path.join(out, r.name + '-candidate-1.mp4'));
    await save(path.join(out, r.name + '-comparison.json'), comparison);
    assert(comparison.video && comparison.audio, 'STOP: precompression/audio difference; see saved comparison');
  }
  const protectedAfter = await bound(original); const beforeRef = await json(path.join(out, 'protected-original-before.json'));
  assert.deepEqual(protectedAfter, beforeRef); await save(path.join(out, 'protected-original-after.json'), protectedAfter);
  const bindings = await json(path.join(out, 'source-bindings.json'));
  const checked = [];
  for (const ref of [bindings.plan, bindings.preparation, bindings.background, bindings.audio, bindings.tool]) {
    assert.deepEqual(await bound(ref.path), ref); checked.push(ref);
  }
  for (const r of ranges) {
    const manifest = await json(path.join(out, r.name + '-manifest.json'));
    for (const ref of [manifest.input, manifest.audio, ...manifest.pngs]) {
      assert.deepEqual(await bound(ref.path), ref); checked.push(ref);
    }
  }
  await save(path.join(out, 'inputs-after.json'), {status: 'unchanged', checked});
}
async function encodeControl() {
  for (const r of ranges) {
    const output = path.join(out, r.name + '-encode-control.mp4');
    await run(r.name + '-encode-control', ['-hide_banner', '-v', 'error', '-n', '-i', path.join(out, r.name + '-preencoder.nut'),
      '-i', path.join(out, r.name + '-audio.m4a'), '-map', '0:v:0', '-map', '1:a:0',
      '-frames:v', String(r.endFrameExclusive - r.startFrame), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movie_timescale', '30', '-movflags', '+faststart', output]);
    await save(path.join(out, r.name + '-encode-control-output.json'), {output: await bound(output),
      meaning: 'separate measurement: FFV1 decoding of the exact preencoder frames plus original encoder/audio-copy/mux; not isolated codec CPU time'});
  }
}
async function summarize() {
  const observations = [];
  for (const r of ranges) {
    const manifest = await json(path.join(out, r.name + '-manifest.json'));
    const baseline = [], candidate = [];
    for (const n of [1, 2]) {
      baseline.push(await json(path.join(out, `${r.name}-baseline-${n}-result.json`)));
      candidate.push(await json(path.join(out, `${r.name}-candidate-${n}-result.json`)));
    }
    const results = [...baseline, ...candidate];
    assert(results.every(v => v.exit.code === 0 && v.exit.signal === null));
    assert(results.every(v => v.output.sha256 === baseline[0].output.sha256), 'all repeated MP4 bytes must match for this experiment');
    const mean = (values: any[]) => values.reduce((sum, v) => sum + v.wallSeconds, 0) / values.length;
    const beforeMean = mean(baseline), afterMean = mean(candidate);
    const params = await input(r); let oldEvaluations = 0, newEvaluations = 0;
    for (const row of params.overlayRecords) for (let frame = Math.max(row.element.startFrame, r.startFrame);
      frame < Math.min(row.element.endFrameExclusive, r.endFrameExclusive); frame++) {
      const phase = frame - row.element.startFrame; oldEvaluations++;
      if (phase < 3 || phase > row.element.displayFrameCount - 4) newEvaluations++;
    }
    const comparison = await json(path.join(out, r.name + '-comparison.json'));
    assert(comparison.video && comparison.audio && comparison.mp4);
    observations.push({manifest, baseline, candidate, comparison,
      meanWallSeconds: {baseline: beforeMean, candidate: afterMean, saved: beforeMean - afterMean,
        reductionPercent: (beforeMean - afterMean) / beforeMean * 100},
      maximumFfmpegResidentBytes: {baseline: Math.max(...baseline.map(v => v.maximumResidentSetBytes)),
        candidate: Math.max(...candidate.map(v => v.maximumResidentSetBytes))},
      calculatedPixelEquationFrames: {baseline: oldEvaluations, candidate: newEvaluations,
        meaning: 'calculated from exact saved caption clocks and enable condition; not an instrumented execution count'},
      precompression: await json(path.join(out, r.name + '-precompression-comparison.json')),
      audio: await json(path.join(out, r.name + '-audio-comparison.json')),
      encodeControl: await json(path.join(out, r.name + '-encode-control-timing.json')),
      encodeControlOutput: await json(path.join(out, r.name + '-encode-control-output.json'))});
  }
  const report = {schemaVersion: 'caption-composite-localization-measurement-20260927-v001',
    baselineCommit: before, outputDirectory: out, renderer: await bound(renderer),
    order: ['baseline-1', 'candidate-1', 'precompression verification', 'candidate-2', 'baseline-2', 'encode-control'],
    conditions: {encoder: 'libx264', preset: 'fast', crf: 20, pixelFormat: 'yuv420p', fps: 30,
      canvas: [1920, 1080], audio: 'same packet-copy AAC sidecar', operatingSystemCacheControlled: false,
      otherProcessesFullyControlled: false, ownPerformanceRunsSequential: true, fullDraftReencoded: false,
      caveat: 'representative ranges only; no proportional prediction of the 85-minute full composite'},
    sources: await json(path.join(out, 'source-bindings.json')), protectedOriginal: await bound(original),
    unchangedInputs: await json(path.join(out, 'inputs-after.json')), observations};
  assert.equal(report.protectedOriginal.sha256, '11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a');
  await save(path.join(out, 'measurement.json'), report);
  console.log(JSON.stringify(observations.map(v => ({name: v.manifest.name, ...v.meanWallSeconds,
    rss: v.maximumFfmpegResidentBytes, comparison: v.comparison}))));
}
const [mode, variant, repeat] = process.argv.slice(2);
if (mode === 'prepare') await prepare();
else if (mode === 'encode') await encode(variant, repeat);
else if (mode === 'profile') await profile();
else if (mode === 'verify') await verify();
else if (mode === 'encode-control') await encodeControl();
else if (mode === 'summarize') await summarize();
else throw new Error('use prepare | encode baseline|candidate 1|2 | profile | verify | encode-control | summarize');
