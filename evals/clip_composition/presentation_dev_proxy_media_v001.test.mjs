import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, writeFile, stat, rm, mkdir, realpath} from 'node:fs/promises';
import path from 'node:path';
import {ensurePresentationDevProxyMediaV001, readPresentationDevProxyMediaV001,
  validatePresentationDevProxySourceClockV001} from './presentation_dev_proxy_media_v001.mjs';

const run = promisify(execFile);
const ffmpegPath = '/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg';
const ffprobePath = '/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(order(value));
const order = value => Array.isArray(value) ? value.map(order) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, order(value[key])])) : value;
const ref = async file => ({path: file, bytes: (await stat(file)).size, fileSha256: hash(await readFile(file))});
const clock = (fps, frames, kind = 'projected-background') => ({
  schemaVersion: 'presentation-dev-proxy-source-clock-v001', kind, inputFps: fps, inputFrameCount: frames,
  logicalStartFrame: 0, logicalEndFrameExclusive: Math.ceil(frames / (fps / 30)),
  sourceClockSha256: hash('small-fixture-clock'), projectionSha256: kind === 'projected-background' ? hash('small-projection') : null,
  audio: {sampleRate: 44100, channels: 2},
});
async function fixture(t, {fps = 30, frames = 6, pcm = false, parity = false} = {}) {
  const root = await mkdtemp(path.join(await realpath('/private/tmp'), 'zev-dev-proxy-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const source = path.join(root, pcm ? 'source.nut' : 'source.mp4');
  await run(ffmpegPath, ['-hide_banner', '-v', 'error', '-n', '-f', 'lavfi', '-i',
    parity ? `nullsrc=size=1920x1080:rate=${fps}:duration=${frames / fps},geq=lum='if(mod(N,2),235,16)':cb=128:cr=128`
      : `testsrc2=size=1920x1080:rate=${fps}:duration=${frames / fps}`, '-f', 'lavfi', '-i',
    `sine=frequency=440:sample_rate=44100:duration=${frames / fps + 0.03}`,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', pcm ? 'ffv1' : 'libx264',
    ...(pcm ? [] : ['-preset', 'ultrafast', '-crf', '20']), '-pix_fmt', 'yuv420p',
    '-ac', '2', '-c:a', pcm ? 'pcm_f32le' : 'aac', source]);
  return {root, input: {sourceRef: await ref(source), profileId: 'dev-proxy-540p-v001',
    outputDirectory: path.join(root, 'proxy'), ffmpegPath, ffprobePath,
    sourceClock: clock(fps, frames, fps === 60 ? 'original-source' : 'projected-background')}};
}

test('30fps AAC: one immutable 540p proxy, packet/clock verification and independent-process reuse', async t => {
  const {input} = await fixture(t);
  const made = await ensurePresentationDevProxyMediaV001(input);
  assert.equal(made.reused, false); assert.equal(made.encoderInvocations, 1);
  assert.equal(made.manifest.container, 'mp4'); assert.equal(made.manifest.video.output.frameCount, 6);
  assert.deepEqual(made.manifest.audio.source, made.manifest.audio.output);
  assert.equal(made.manifest.finalPixelQc, 'not-run-dev-only');
  const prior = await stat(made.mediaRef.path);
  const again = await ensurePresentationDevProxyMediaV001(input);
  assert.equal(again.reused, true); assert.equal(again.encoderInvocations, 0);
  assert.deepEqual(again.manifestRef, made.manifestRef);
  const modulePath = new URL('./presentation_dev_proxy_media_v001.mjs', import.meta.url).href;
  const result = await run(process.execPath, ['--input-type=module', '-e',
    `import {readPresentationDevProxyMediaV001 as read} from ${JSON.stringify(modulePath)}; const result=await read(JSON.parse(process.argv[1])); console.log(JSON.stringify({reused:result.reused,encoderInvocations:result.encoderInvocations,mediaRef:result.mediaRef}));`,
    JSON.stringify({...input, manifestPath: made.manifestRef.path, expectedManifestRef: made.manifestRef})]);
  assert.deepEqual(JSON.parse(result.stdout), {reused: true, encoderInvocations: 0, mediaRef: made.mediaRef});
  assert.equal((await stat(made.mediaRef.path)).mtimeMs, prior.mtimeMs);
  assert.deepEqual(await ref(input.sourceRef.path), input.sourceRef);
});

test('odd 60fps source: global-even extraction and PCM packet copy in NUT', async t => {
  const {input} = await fixture(t, {fps: 60, frames: 7, pcm: true, parity: true});
  const made = await ensurePresentationDevProxyMediaV001(input);
  assert.equal(made.manifest.container, 'nut');
  assert.equal(made.manifest.video.source.frameCount, 7); assert.equal(made.manifest.video.output.frameCount, 4);
  assert.equal(made.manifest.video.extractionRule, 'source-frame-60fps-global-even-v001');
  assert.deepEqual(made.manifest.audio.source, made.manifest.audio.output);
  assert.equal(made.manifest.audio.output.codec, 'pcm_f32le');
  // Synthetic even frames are black and odd frames white. Check actual output
  // bytes, including the last even frame of the seven-frame source.
  const decoded = await run(ffmpegPath, ['-v', 'error', '-i', made.mediaRef.path, '-map', '0:v:0',
    '-pix_fmt', 'yuv420p', '-f', 'rawvideo', 'pipe:1'], {encoding: 'buffer', maxBuffer: 4 * 1024 * 1024});
  const pixels = 960 * 540, frameBytes = pixels * 3 / 2;
  assert.equal(decoded.stdout.length, frameBytes * 4);
  for (let frame = 0; frame < 4; frame++) {
    assert(decoded.stdout.subarray(frame * frameBytes, frame * frameBytes + pixels).every(value => value === 16));
    assert(decoded.stdout.subarray(frame * frameBytes + pixels, (frame + 1) * frameBytes).every(value => value === 128));
  }
  assert.equal((await readPresentationDevProxyMediaV001({...input, manifestPath: made.manifestRef.path})).encoderInvocations, 0);
});

test('different clocks, source, profile, manifest or media cannot reuse or silently regenerate', async t => {
  const {input} = await fixture(t); const made = await ensurePresentationDevProxyMediaV001(input);
  const media = await readFile(made.mediaRef.path), manifest = await readFile(made.manifestRef.path);
  await assert.rejects(ensurePresentationDevProxyMediaV001({...input, profileId: 'dev-proxy-270p-v001'}));
  await assert.rejects(ensurePresentationDevProxyMediaV001({...input, sourceClock: {...input.sourceClock, projectionSha256: hash('other-projection')}}), /saved source clock differs/);
  await assert.rejects(ensurePresentationDevProxyMediaV001({...input, sourceRef: {...input.sourceRef, fileSha256: hash('wrong-source')}}), /source bytes differ/);
  await writeFile(made.manifestRef.path, manifest.toString().replace('packet-copy', 'transcoded'));
  await assert.rejects(ensurePresentationDevProxyMediaV001(input), /manifest changed/);
  await writeFile(made.manifestRef.path, manifest);
  const changed = Buffer.from(media); changed[changed.length - 1] ^= 1; await writeFile(made.mediaRef.path, changed);
  await assert.rejects(ensurePresentationDevProxyMediaV001(input), /output bytes changed/);
  assert.deepEqual(await readFile(made.mediaRef.path), changed, 'corruption must not trigger overwrite');
  assert.deepEqual(await ref(input.sourceRef.path), input.sourceRef);
});

test('unfinished directory and invalid source frame clock remain incomplete', async t => {
  const {root, input} = await fixture(t);
  await mkdir(input.outputDirectory); await writeFile(path.join(input.outputDirectory, 'keep.txt'), 'unfinished');
  await assert.rejects(ensurePresentationDevProxyMediaV001(input), /no completed valid manifest/);
  assert.equal(await readFile(path.join(input.outputDirectory, 'keep.txt'), 'utf8'), 'unfinished');
  const wrong = {...input, outputDirectory: path.join(root, 'wrong-clock'), sourceClock: clock(30, 7)};
  await assert.rejects(ensurePresentationDevProxyMediaV001(wrong), /decoded frame count differs/);
  const failure = JSON.parse(await readFile(path.join(wrong.outputDirectory, 'proxy-failure.json'), 'utf8'));
  assert.equal(failure.status, 'incomplete');
  await assert.rejects(ensurePresentationDevProxyMediaV001(wrong), /no completed valid manifest/);
});

test('source clock is finite, explicit and distinguishes original and projected clocks', () => {
  assert.deepEqual(validatePresentationDevProxySourceClockV001(clock(60, 7, 'original-source')), clock(60, 7, 'original-source'));
  for (const changed of [{...clock(30, 6), inputFps: 24}, {...clock(30, 6), projectionSha256: null},
    {...clock(30, 6), logicalEndFrameExclusive: 7}, {...clock(60, 7, 'original-source'), logicalStartFrame: 1, logicalEndFrameExclusive: 5},
    {...clock(30, 6), opaque: true}]) assert.throws(() => validatePresentationDevProxySourceClockV001(changed));
});

test('recomputed manifest cannot change observation commands or packet identity', async t => {
  const {input} = await fixture(t); const made = await ensurePresentationDevProxyMediaV001(input);
  const original = await readFile(made.manifestRef.path);
  const saveChanged = async change => {
    const modified = JSON.parse(original); change(modified);
    const {manifestSha256, ...body} = modified; modified.manifestSha256 = hash(canonical(body));
    await writeFile(made.manifestRef.path, JSON.stringify(modified, null, 2) + '\n');
  };
  await saveChanged(m => {m.processes[1].args.splice(0, 2, '-v', 'quiet'); m.processes[1].argumentsCanonicalSha256 = hash(canonical(m.processes[1].args));});
  await assert.rejects(ensurePresentationDevProxyMediaV001(input), /observation command changed/);
  await saveChanged(m => {m.audio.output.packetClockAndPayloadSha256 = hash('changed');});
  await assert.rejects(ensurePresentationDevProxyMediaV001(input), /packet clocks or bytes differ/);
  await saveChanged(m => {m.video.output.frameCount++;});
  await assert.rejects(ensurePresentationDevProxyMediaV001(input));
  await saveChanged(m => {m.processes[3].code = 1;});
  await assert.rejects(ensurePresentationDevProxyMediaV001(input));
  await writeFile(made.manifestRef.path, original);
  assert.equal((await ensurePresentationDevProxyMediaV001(input)).reused, true);
});

test('actual source change, different tool and externally bound manifest SHA are rejected', async t => {
  const {input} = await fixture(t); const made = await ensurePresentationDevProxyMediaV001(input);
  await assert.rejects(ensurePresentationDevProxyMediaV001({...input, ffmpegPath: ffprobePath}), /implementation\/tool changed/);
  await assert.rejects(readPresentationDevProxyMediaV001({...input, manifestPath: made.manifestRef.path,
    expectedManifestRef: {...made.manifestRef, fileSha256: hash('other-manifest')}}), /manifest SHA differs/);
  const source = await readFile(input.sourceRef.path), changed = Buffer.from(source); changed[changed.length - 1] ^= 1;
  await writeFile(input.sourceRef.path, changed);
  await assert.rejects(ensurePresentationDevProxyMediaV001(input), /source bytes differ/);
  assert.deepEqual(await ref(made.mediaRef.path), made.mediaRef, 'source corruption must not regenerate proxy');
});
