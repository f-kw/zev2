/** One explicitly requested, immutable development proxy. No registry/default mutation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {assertPresentationDevProxyProfileV001} from './presentation_dev_proxy_profile_v001.mjs';

export const PRESENTATION_DEV_PROXY_MEDIA_SCHEMA_V001 = 'presentation-dev-proxy-media-v001';
export const PRESENTATION_DEV_PROXY_SOURCE_CLOCK_SCHEMA_V001 = 'presentation-dev-proxy-source-clock-v001';
const HASH = /^[a-f0-9]{64}$/u;
const ownFile = fileURLToPath(import.meta.url);
const profileFile = fileURLToPath(new URL('./presentation_dev_proxy_profile_v001.mjs', import.meta.url));
const canonical = value => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, sort(value[k])]));
  return value;
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => sha(canonical(value));
const exact = (value, keys, message) => {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), message);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), message);
};
const integer = n => Number.isSafeInteger(n) && n >= 0;
const same = (a, b, message) => assert.equal(canonical(a), canonical(b), message);

async function noSymlinkParents(file) {
  assert(path.isAbsolute(file), 'absolute proxy path required');
  let current = path.parse(file).root;
  for (const part of file.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const s = await lstat(current);
    assert(!s.isSymbolicLink(), 'proxy paths must not contain symlinks');
  }
}
async function bind(file) {
  await noSymlinkParents(file);
  const before = await lstat(file); assert(before.isFile(), 'proxy input must be a regular file');
  const h = createHash('sha256'); for await (const chunk of createReadStream(file)) h.update(chunk);
  const after = await lstat(file);
  assert.equal(before.size, after.size); assert.equal(before.mtimeMs, after.mtimeMs, 'file changed while hashing');
  return {path: file, bytes: after.size, fileSha256: h.digest('hex')};
}
function checkedRef(ref) {
  exact(ref, ['path', 'bytes', 'fileSha256'], 'immutable source reference required');
  assert(path.isAbsolute(ref.path) && integer(ref.bytes) && ref.bytes > 0 && HASH.test(ref.fileSha256), 'invalid source reference');
}
export function validatePresentationDevProxySourceClockV001(clock) {
  exact(clock, ['schemaVersion', 'kind', 'inputFps', 'inputFrameCount', 'logicalStartFrame',
    'logicalEndFrameExclusive', 'sourceClockSha256', 'projectionSha256', 'audio'], 'explicit source clock required');
  assert.equal(clock.schemaVersion, PRESENTATION_DEV_PROXY_SOURCE_CLOCK_SCHEMA_V001);
  assert(['original-source', 'projected-background'].includes(clock.kind), 'unknown source clock kind');
  assert([30, 60].includes(clock.inputFps) && integer(clock.inputFrameCount) && clock.inputFrameCount > 0, 'invalid source frame clock');
  assert(integer(clock.logicalStartFrame) && integer(clock.logicalEndFrameExclusive), 'invalid logical source range');
  assert.equal(clock.logicalEndFrameExclusive - clock.logicalStartFrame,
    Math.ceil(clock.inputFrameCount / (clock.inputFps / 30)), 'proxy frame range differs from source extraction');
  assert(HASH.test(clock.sourceClockSha256), 'source clock must be SHA-bound');
  if (clock.kind === 'original-source') {
    assert.equal(clock.logicalStartFrame, 0, 'whole original source clock must start at zero');
    assert.equal(clock.projectionSha256, null, 'original source is not a projected Digest');
  } else {
    assert.equal(clock.inputFps, 30, 'projected backgrounds already use the 30fps clock');
    assert(HASH.test(clock.projectionSha256), 'projected background requires its projection SHA');
  }
  exact(clock.audio, ['sampleRate', 'channels'], 'explicit source audio clock required');
  assert([44100, 48000].includes(clock.audio.sampleRate) && clock.audio.channels === 2, 'only saved stereo audio clocks supported');
  return structuredClone(clock);
}

async function execute(executable, args, {line} = {}) {
  const startedAt = new Date().toISOString(), start = performance.now();
  const child = spawn(executable, args, {stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = '', stderr = '', spawnError = null;
  const outHash = createHash('sha256'), errHash = createHash('sha256');
  child.stdout.on('data', bytes => {outHash.update(bytes); if (!line) {stdout += bytes.toString('utf8'); if (stdout.length > 4 * 1024 * 1024) child.kill();}});
  child.stderr.on('data', bytes => {errHash.update(bytes); stderr = (stderr + bytes.toString('utf8')).slice(-65536);});
  const exited = new Promise(resolve => {
    child.once('error', error => {spawnError = error;});
    child.once('close', (code, signal) => resolve({code, signal}));
  });
  let lineError = null;
  if (line) try {for await (const value of createInterface({input: child.stdout, crlfDelay: Infinity})) if (value) line(value);}
  catch (error) {lineError = error; child.kill();}
  const exit = await exited;
  if (spawnError) throw spawnError;
  if (lineError) throw lineError;
  assert.equal(exit.code, 0, 'proxy child failed: ' + stderr);
  assert.equal(exit.signal, null, 'proxy child interrupted');
  return {stdout, process: {command: executable, args, argumentsCanonicalSha256: digest(args), ...exit,
    stdoutSha256: outHash.digest('hex'), stderrSha256: errHash.digest('hex'), startedAt,
    endedAt: new Date().toISOString(), wallMilliseconds: performance.now() - start}};
}
async function toolsAndCode(ffmpegPath, ffprobePath) {
  assert(path.isAbsolute(ffmpegPath) && path.isAbsolute(ffprobePath), 'explicit absolute tool paths required');
  return {ffmpeg: await bind(await realpath(ffmpegPath)), ffprobe: await bind(await realpath(ffprobePath)),
    implementation: await bind(ownFile), profileImplementation: await bind(profileFile)};
}
async function streams(file, ffprobe, processes) {
  const r = await execute(ffprobe, streamArguments(file));
  processes.push(r.process); const observed = JSON.parse(r.stdout);
  assert.equal(observed.streams.length, 2, 'exactly one video and one audio stream required');
  const video = observed.streams.find(s => s.codec_type === 'video'), audio = observed.streams.find(s => s.codec_type === 'audio');
  assert(video && audio, 'video and audio required');
  return {video, audio};
}
function checkStreams(observed, clock, output) {
  const {video, audio} = observed;
  assert.equal(video.width, output ? 960 : 1920); assert.equal(video.height, output ? 540 : 1080);
  assert.equal(video.r_frame_rate, (output ? 30 : clock.inputFps) + '/1', 'video frame rate differs');
  assert.equal(Number(video.start_time), 0, 'video presentation offset unsupported');
  assert.equal(Number(audio.sample_rate), clock.audio.sampleRate); assert.equal(audio.channels, clock.audio.channels);
  assert(['aac', 'pcm_f32le'].includes(audio.codec_name), 'only AAC or float PCM copy supported');
  if (output) {assert.equal(video.codec_name, 'h264'); assert.equal(video.pix_fmt, 'yuv420p');}
  assert(!video.tags?.rotate && !(video.side_data_list ?? []).some(s => s.rotation), 'rotated sources unsupported');
}
async function videoClock(file, stream, expectedCount, fps, ffprobe, processes) {
  const [numerator, denominator] = stream.time_base.split('/').map(BigInt);
  assert(numerator > 0n && denominator > 0n, 'invalid video timebase');
  let count = 0, firstPts = null, lastPts = null;
  const r = await execute(ffprobe, videoArguments(file), {line(value) {
    assert(/^pts=-?\d+\|?$/u.test(value), 'unexpected decoded video timestamp');
    const pts = BigInt(value.match(/-?\d+/u)[0]);
    assert.equal(pts * numerator * BigInt(fps), BigInt(count) * denominator, 'video PTS must retain the exact frame grid');
    firstPts ??= String(pts); lastPts = String(pts); count++;
  }});
  processes.push(r.process); assert.equal(count, expectedCount, 'decoded frame count differs');
  return {status: 'passed', fps, frameCount: count, timeBase: stream.time_base, firstPts, lastPts,
    rule: 'every-decoded-PTS-equals-frame-index-over-fps'};
}
async function audioPackets(file, stream, ffprobe, processes) {
  const packetHash = createHash('sha256'), payloadHash = createHash('sha256');
  let count = 0, payloadCount = 0, firstPts = null, endPts = null, payloadBytes = 0;
  const r = await execute(ffprobe, audioArguments(file), {line(value) {
    const pairs = Object.fromEntries(value.split('|').filter(Boolean).map(part => {const i = part.indexOf('='); return [part.slice(0, i), part.slice(i + 1)];}));
    // ffprobe emits a data_hash continuation line when a packet has side data.
    if (!Object.hasOwn(pairs, 'pts')) {
      assert(Object.keys(pairs).length === 1 && /^SHA256:[a-f0-9]{64}$/u.test(pairs.data_hash ?? ''), 'unexpected audio packet continuation');
      packetHash.update(value + '\n'); payloadHash.update(pairs.data_hash + '\n'); payloadCount++; return;
    }
    assert(/^-?\d+$/u.test(pairs.pts) && /^-?\d+$/u.test(pairs.dts) && /^\d+$/u.test(pairs.duration) && /^\d+$/u.test(pairs.size), 'audio packet clock missing');
    if (pairs.data_hash) {assert(/^SHA256:[a-f0-9]{64}$/u.test(pairs.data_hash));payloadHash.update(pairs.data_hash + '\n'); payloadCount++;}
    packetHash.update(value + '\n'); firstPts ??= pairs.pts;
    endPts = String(BigInt(pairs.pts) + BigInt(pairs.duration)); payloadBytes += Number(pairs.size); count++;
  }});
  processes.push(r.process); assert(count > 0, 'audio packets absent');
  assert.equal(payloadCount, count, 'every audio packet requires its actual payload SHA');
  return {codec: stream.codec_name, sampleRate: Number(stream.sample_rate), channels: stream.channels,
    timeBase: stream.time_base, startTime: stream.start_time, packetCount: count, firstPts,
    endPtsExclusive: endPts, packetPayloadBytes: payloadBytes,
    packetClockAndPayloadSha256: packetHash.digest('hex'), packetPayloadHashesSha256: payloadHash.digest('hex')};
}
const streamArguments = file => ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file];
const videoArguments = file => ['-v', 'error', '-select_streams', 'v:0', '-show_frames',
  '-show_entries', 'frame=pts:frame_side_data=', '-of', 'compact=p=0:nk=0', file];
const audioArguments = file => ['-v', 'error', '-select_streams', 'a:0', '-show_packets',
  '-show_entries', 'packet=pts,dts,duration,size,data_hash:packet_side_data=side_data_type,skip_samples,discard_padding,skip_reason,discard_reason',
  '-show_data_hash', 'sha256', '-of', 'compact=p=0:nk=0', file];
function encodeArguments({sourceRef, sourceClock, mediaPath, container}) {
  const extraction = sourceClock.inputFps === 60 ? "select='not(mod(n\\,2))',setpts=N/(30*TB)," : '';
  return ['-hide_banner', '-v', 'error', '-n', '-i', sourceRef.path, '-map', '0:v:0', '-map', '0:a:0',
    '-vf', extraction + 'scale=960:540:flags=bicubic,fps=30,setpts=N/(30*TB)',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    // NUT shifts both clocks to avoid negative DTS from B-frame reordering.
    // Disable that reordering only for the finite PCM/NUT proxy variant.
    ...(container === 'nut' ? ['-bf', '0'] : []), '-c:a', 'copy',
    '-map_metadata', '-1', ...(container === 'mp4' ? ['-movflags', '+faststart', '-movie_timescale', '30'] : []),
    '-f', container, mediaPath];
}
async function context(input) {
  const profile = assertPresentationDevProxyProfileV001(input.profileId);
  checkedRef(input.sourceRef); const sourceClock = validatePresentationDevProxySourceClockV001(input.sourceClock);
  same(await bind(input.sourceRef.path), input.sourceRef, 'source bytes differ');
  const bindings = await toolsAndCode(input.ffmpegPath, input.ffprobePath);
  return {profile, sourceClock, bindings};
}
function validateSaved(manifest, input, ctx, directory) {
  const {manifestSha256, ...body} = manifest;
  assert.equal(manifestSha256, digest(body), 'proxy manifest changed');
  assert.equal(body.schemaVersion, PRESENTATION_DEV_PROXY_MEDIA_SCHEMA_V001); assert.equal(body.status, 'passed');
  same(body.sourceRef, input.sourceRef, 'saved proxy source differs'); same(body.sourceClock, ctx.sourceClock, 'saved source clock differs');
  same(body.profile, ctx.profile, 'saved proxy profile differs'); same(body.bindings, ctx.bindings, 'proxy implementation/tool changed');
  assert.equal(body.key, digest({sourceSha256: input.sourceRef.fileSha256, profileId: input.profileId}), 'proxy source/profile key differs');
  assert(['mp4', 'nut'].includes(body.container));
  assert.equal(body.mediaRef.path, path.join(directory, 'proxy.' + body.container)); checkedRef(body.mediaRef);
  assert.notEqual(body.mediaRef.path, input.sourceRef.path, 'proxy must not overwrite source');
  assert.equal(body.container, body.audio.source.codec === 'aac' ? 'mp4' : 'nut');
  assert(['aac', 'pcm_f32le'].includes(body.audio.source.codec));
  assert.equal(body.audio.status, 'passed'); assert.equal(body.audio.mode, 'packet-copy');
  same(body.audio.source, body.audio.output, 'saved audio packet clocks or bytes differ');
  assert(body.audio.source.packetCount > 0 && HASH.test(body.audio.source.packetClockAndPayloadSha256)
    && HASH.test(body.audio.source.packetPayloadHashesSha256), 'invalid audio copy proof');
  assert.equal(body.audio.source.sampleRate, ctx.sourceClock.audio.sampleRate); assert.equal(body.audio.source.channels, 2);
  for (const [kind, fps, count] of [['source', ctx.sourceClock.inputFps, ctx.sourceClock.inputFrameCount],
    ['output', 30, ctx.sourceClock.logicalEndFrameExclusive - ctx.sourceClock.logicalStartFrame]]) {
    const clock = body.video[kind]; assert.equal(clock.status, 'passed'); assert.equal(clock.frameCount, count);
    assert.equal(clock.fps, fps); assert.equal(clock.firstPts, '0');
    const [n, d] = clock.timeBase.split('/').map(BigInt);
    assert.equal(BigInt(clock.lastPts) * n * BigInt(fps), BigInt(count - 1) * d);
    assert.equal(clock.rule, 'every-decoded-PTS-equals-frame-index-over-fps');
  }
  same(body.video.outputCanvas, ctx.profile.outputCanvas, 'proxy canvas changed');
  assert.equal(body.video.extractionRule, ctx.sourceClock.inputFps === 60 ? 'source-frame-60fps-global-even-v001' : 'source-frame-30fps-identity-v001');
  const encode = body.processes.filter(p => p.purpose === 'encode'); assert.equal(encode.length, 1);
  const args = encodeArguments({sourceRef: input.sourceRef, sourceClock: ctx.sourceClock, mediaPath: body.mediaRef.path, container: body.container});
  same(encode[0].args, args, 'proxy command differs'); assert.equal(encode[0].command, ctx.bindings.ffmpeg.path);
  assert.equal(body.processes.length, 7, 'proxy execution evidence incomplete');
  const expectedArgs = [streamArguments(input.sourceRef.path), videoArguments(input.sourceRef.path), audioArguments(input.sourceRef.path),
    args, streamArguments(body.mediaRef.path), videoArguments(body.mediaRef.path), audioArguments(body.mediaRef.path)];
  for (const [i, p] of body.processes.entries()) {
    assert.equal(p.code, 0); assert.equal(p.signal, null); assert.equal(p.argumentsCanonicalSha256, digest(p.args));
    assert(HASH.test(p.stdoutSha256) && HASH.test(p.stderrSha256));
    assert.equal(p.command, i === 3 ? ctx.bindings.ffmpeg.path : ctx.bindings.ffprobe.path);
    same(p.args, expectedArgs[i], 'proxy observation command changed');
    assert(Number.isFinite(p.wallMilliseconds) && p.wallMilliseconds >= 0);
  }
  assert.equal(body.finalPixelQc, 'not-run-dev-only'); assert.equal(body.humanQuality, 'not-evaluated');
}

export async function readPresentationDevProxyMediaV001(input) {
  assert(path.isAbsolute(input.manifestPath), 'absolute proxy manifest required');
  assert.equal(path.basename(input.manifestPath), 'proxy-manifest.json');
  const directory = path.dirname(input.manifestPath);
  if (input.outputDirectory !== undefined) assert.equal(input.outputDirectory, directory);
  const ctx = await context(input), manifestRef = await bind(input.manifestPath);
  if (input.expectedManifestRef) same(manifestRef, input.expectedManifestRef, 'proxy manifest SHA differs');
  const manifest = JSON.parse(await readFile(input.manifestPath, 'utf8'));
  validateSaved(manifest, input, ctx, directory);
  same(await bind(manifest.mediaRef.path), manifest.mediaRef, 'proxy output bytes changed');
  same(await bind(input.manifestPath), manifestRef, 'proxy manifest changed during reuse');
  return {manifest, manifestRef, mediaRef: manifest.mediaRef, reused: true, encoderInvocations: 0};
}

export async function ensurePresentationDevProxyMediaV001(input) {
  assert(path.isAbsolute(input.outputDirectory), 'absolute unused proxy directory required');
  const manifestPath = path.join(input.outputDirectory, 'proxy-manifest.json');
  try {await lstat(input.outputDirectory); return await readPresentationDevProxyMediaV001({...input, manifestPath});}
  catch (error) {
    // Only an absent directory permits generation; incomplete/damaged entries
    // remain untouched, even when the missing file raised ENOENT above.
    if (error.code !== 'ENOENT') throw error;
    try {await lstat(input.outputDirectory); throw Error('existing proxy directory has no completed valid manifest');}
    catch (absent) {if (absent.code !== 'ENOENT') throw absent;}
  }
  const ctx = await context(input); await noSymlinkParents(path.dirname(input.outputDirectory));
  assert(!input.sourceRef.path.startsWith(input.outputDirectory + path.sep), 'source cannot be inside new proxy directory');
  await mkdir(input.outputDirectory);
  const startedAt = new Date().toISOString(), started = performance.now(), processes = [];
  const save = (name, value) => writeFile(path.join(input.outputDirectory, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  try {
    await save('proxy-started.json', {startedAt, sourceRef: input.sourceRef, sourceClock: ctx.sourceClock, profile: ctx.profile, bindings: ctx.bindings});
    const observedSource = await streams(input.sourceRef.path, ctx.bindings.ffprobe.path, processes);
    checkStreams(observedSource, ctx.sourceClock, false);
    const sourceVideo = await videoClock(input.sourceRef.path, observedSource.video, ctx.sourceClock.inputFrameCount, ctx.sourceClock.inputFps, ctx.bindings.ffprobe.path, processes);
    const sourceAudio = await audioPackets(input.sourceRef.path, observedSource.audio, ctx.bindings.ffprobe.path, processes);
    const container = sourceAudio.codec === 'aac' ? 'mp4' : 'nut', mediaPath = path.join(input.outputDirectory, 'proxy.' + container);
    const encoded = await execute(ctx.bindings.ffmpeg.path, encodeArguments({sourceRef: input.sourceRef, sourceClock: ctx.sourceClock, mediaPath, container}));
    processes.push({...encoded.process, purpose: 'encode'});
    const observedOutput = await streams(mediaPath, ctx.bindings.ffprobe.path, processes);
    checkStreams(observedOutput, ctx.sourceClock, true);
    const outputVideo = await videoClock(mediaPath, observedOutput.video, ctx.sourceClock.logicalEndFrameExclusive - ctx.sourceClock.logicalStartFrame, 30, ctx.bindings.ffprobe.path, processes);
    const outputAudio = await audioPackets(mediaPath, observedOutput.audio, ctx.bindings.ffprobe.path, processes);
    same(sourceAudio, outputAudio, 'copied audio packet clocks or payload changed');
    same(await bind(input.sourceRef.path), input.sourceRef, 'source changed during proxy creation');
    same(await toolsAndCode(input.ffmpegPath, input.ffprobePath), ctx.bindings, 'implementation/tool changed during proxy creation');
    const mediaRef = await bind(mediaPath);
    const body = {schemaVersion: PRESENTATION_DEV_PROXY_MEDIA_SCHEMA_V001, status: 'passed',
      key: digest({sourceSha256: input.sourceRef.fileSha256, profileId: input.profileId}),
      profile: ctx.profile, sourceRef: input.sourceRef, sourceClock: ctx.sourceClock, bindings: ctx.bindings,
      container, mediaRef, video: {source: sourceVideo, output: outputVideo, outputCanvas: ctx.profile.outputCanvas,
        extractionRule: ctx.sourceClock.inputFps === 60 ? 'source-frame-60fps-global-even-v001' : 'source-frame-30fps-identity-v001'},
      audio: {status: 'passed', mode: 'packet-copy', source: sourceAudio, output: outputAudio}, processes,
      startedAt, endedAt: new Date().toISOString(), wallMilliseconds: performance.now() - started,
      finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated'};
    const manifest = {...body, manifestSha256: digest(body)};
    validateSaved(manifest, input, ctx, input.outputDirectory);
    await save('proxy-manifest.json', manifest);
    return {manifest, manifestRef: await bind(manifestPath), mediaRef, reused: false, encoderInvocations: 1};
  } catch (error) {
    await save('proxy-failure.json', {status: 'incomplete', startedAt, endedAt: new Date().toISOString(),
      message: error.message, processes}).catch(() => {});
    throw error;
  }
}
