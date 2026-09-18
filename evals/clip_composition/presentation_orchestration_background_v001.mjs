/** Build and independently check subtitle-free connection backgrounds. No AI selection. */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, stat, lstat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {buildConnectionExpressionTimelineFiltersV001} from './connection_expression_v001.mjs';
import {assertProjectionMatchesStateV001} from './presentation_orchestration_projection_v001.mjs';
import {assertOrchestrationDrawingViewV001} from './presentation_orchestration_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const VERSION = 'presentation-orchestration-background-v001';
const FRAME_RATE = 30;
const CHANNELS = 2;
const SAMPLE_BYTES = 4 * CHANNELS;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = () => createHash('sha256');
const copy = value => structuredClone(value);
const fail = message => {throw new TypeError('ORCHESTRATION_BACKGROUND_INVALID: ' + message);};
const require = (condition, message) => {if (!condition) fail(message);};
const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (file, value) => writeFile(file, json(value), {flag: 'wx'});
async function fileHash(file) {
  const result = digest();
  for await (const chunk of createReadStream(file)) result.update(chunk);
  return result.digest('hex');
}
async function fileRef(file) {return {path: file, fileSha256: await fileHash(file), bytes: (await stat(file)).size};}
function requireAbsolute(file, name) {require(typeof file === 'string' && path.isAbsolute(file), name + ' absolute path required');}

/** Commands capture bounded text; raw decoded streams use the streaming reader below. */
async function command(executable, args, {outputDirectory, label} = {}) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {stdout += chunk; if (stdout.length > 32 * 1024 * 1024) child.kill();});
    child.stderr.on('data', chunk => {stderr = (stderr + chunk).slice(-1024 * 1024);});
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({code, signal, stdout, stderr}));
  });
  if (outputDirectory) {
    await save(path.join(outputDirectory, label + '-command.json'), {executable, args,
      exitCode: result.code, signal: result.signal});
    await writeFile(path.join(outputDirectory, label + '.log'), result.stderr, {flag: 'wx'});
  }
  require(result.code === 0, `${label ?? executable} failed: ${result.stderr.slice(-2000)}`);
  return result.stdout;
}
async function probe(ffprobePath, file) {
  return JSON.parse(await command(ffprobePath, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]));
}
function mediaClock(observed, projection, canvas, {lossless = false, singleFrame = false} = {}) {
  const videos = observed.streams.filter(stream => stream.codec_type === 'video');
  const audios = observed.streams.filter(stream => stream.codec_type === 'audio');
  require(videos.length === 1 && audios.length === 1, 'exactly one video and one audio stream required');
  const video = videos[0], audio = audios[0];
  require(video.width === canvas.width && video.height === canvas.height && video.pix_fmt === 'yuv420p'
    && video.color_range !== 'pc', 'limited-range 8-bit yuv420p canvas required');
  require(video.r_frame_rate === '30/1' && (video.avg_frame_rate === '30/1'
    || singleFrame && video.avg_frame_rate === '0/0'), '30fps source clock required');
  require(Number(video.start_time) === 0 && Number(audio.start_time) === 0, 'media presentation must start at zero');
  require(Number(audio.sample_rate) === projection.sourceClock.playbackSampleRate && audio.channels === CHANNELS,
    'audio rate/channels differ from projection');
  if (lossless) require(video.codec_name === 'ffv1' && audio.codec_name === 'pcm_f32le', 'FFV1/float32 PCM verification input required');
  return {video, audio};
}
async function checkedSource({projection, expectedProjectionSha256, sourceMediaPath, ffprobePath}) {
  require(projection?.projectionSha256 === expectedProjectionSha256, 'stale requested projection SHA');
  const source = projection.sourceClock;
  requireAbsolute(sourceMediaPath, 'source media');
  require(sourceMediaPath === source.mediaRef.path, 'source path differs from projection');
  const planBytes = await readFile(source.planRef.path), timelineBytes = await readFile(source.timelineRef.path);
  assertProjectionMatchesStateV001({projection, digestRef: source.digestRef,
    planRef: source.planRef, timelineRef: source.timelineRef, mediaRef: source.mediaRef,
    planBytes, timelineBytes, playbackSampleRate: source.playbackSampleRate,
    observationSampleRate: source.observationSampleRate,
    connections: projection.connections.map(({connectionId, preset, presetVersion}) => ({connectionId, preset, presetVersion}))});
  require(await fileHash(sourceMediaPath) === source.mediaRef.fileSha256, 'source media SHA differs');
  const plan = JSON.parse(planBytes), canvas = {width: plan.canvas.width, height: plan.canvas.height, fps: plan.canvas.fps};
  const observed = await probe(ffprobePath, sourceMediaPath);
  mediaClock(observed, projection, canvas);
  return {canvas, observed, refs: {media: copy(source.mediaRef), plan: copy(source.planRef), timeline: copy(source.timelineRef)}};
}

/** Fixed-size reads keep full-HD comparisons bounded to a few decoded frames. */
function decodedReader(executable, args) {
  const child = spawn(executable, args, {stdio: ['ignore', 'pipe', 'pipe']});
  let stderr = '', pending = Buffer.alloc(0), ended = false;
  child.stderr.on('data', chunk => {stderr = (stderr + chunk.toString('utf8')).slice(-65536);});
  const exit = new Promise(resolve => {
    child.once('error', error => resolve({code: null, error}));
    child.once('close', (code, signal) => resolve({code, signal}));
  });
  const iterator = child.stdout[Symbol.asyncIterator]();
  // Start consuming immediately: Node drains a finished child's unread pipe.
  // A short range may finish before the paired source decoder returns a frame.
  const next = () => iterator.next().catch(error => ({error}));
  let nextChunk = next();
  async function read(count, allowShort = false) {
    const result = Buffer.allocUnsafe(count); let written = 0;
    while (written < count) {
      if (!pending.length && !ended) {
        const chunk = await nextChunk;
        if (chunk.error) throw chunk.error;
        ended = Boolean(chunk.done); pending = chunk.done ? Buffer.alloc(0) : chunk.value;
        if (!ended) nextChunk = next();
      }
      if (ended && !pending.length) break;
      const take = Math.min(count - written, pending.length);
      pending.copy(result, written, 0, take); pending = pending.subarray(take); written += take;
    }
    if (!allowShort && written !== count) {
      const result = await exit;
      fail(`decoded stream ended early: expected ${count} bytes, got ${written}; exit ${result.code}; `
        + (result.error?.message ?? stderr.slice(-1500)));
    }
    return written === count ? result : result.subarray(0, written);
  }
  async function finish() {
    const result = await exit;
    require(result.code === 0, 'decode failed: ' + (result.error?.message ?? stderr.slice(-1500)));
  }
  async function stop() {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    // A rejected frame can leave unread stdout buffered. Destroy our pipe so
    // child close cannot wait forever for an iterator that the check abandoned.
    child.stdout.destroy();
    await exit;
  }
  return {read, finish, stop};
}
const videoDecode = file => ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-an',
  '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'];
const audioDecode = file => ['-v', 'error', '-nostdin', '-i', file, '-map', '0:a:0', '-vn',
  '-c:a', 'pcm_f32le', '-f', 'f32le', '-'];

function blackFrame(width, height) {
  const lumaBytes = width * height, frame = Buffer.alloc(lumaBytes * 3 / 2, 128);
  frame.fill(16, 0, lumaBytes); return frame;
}
function fadeNumerators(projection) {
  const result = new Map();
  for (const window of projection.softWindows) for (let offset = 0; offset < 6; offset++) {
    result.set(window.blackStartFrame - 6 + offset, 5 - offset);
    result.set(window.blackEndFrameExclusive + offset, offset);
  }
  return result;
}
function expectedFade(source, numerator, lumaBytes, black) {
  if (numerator === 5 || numerator === undefined) return source;
  if (numerator === 0) return black;
  const result = Buffer.allocUnsafe(source.length);
  // The Stage-II finite preset defines this five-step, integer-rounded blend.
  // This checker does not call or evaluate the generated FFmpeg filter graph.
  const y = Array.from({length: 256}, (_, value) => Math.floor((value * numerator + 16 * (5 - numerator) + 2) / 5));
  const uv = Array.from({length: 256}, (_, value) => Math.floor((value * numerator + 128 * (5 - numerator) + 2) / 5));
  for (let index = 0; index < lumaBytes; index++) result[index] = y[source[index]];
  for (let index = lumaBytes; index < source.length; index++) result[index] = uv[source[index]];
  return result;
}
function assertBytes(actual, expected, label) {
  if (actual.equals(expected)) return;
  let first = 0; while (first < actual.length && actual[first] === expected[first]) first++;
  fail(`${label}: byte ${first}, expected ${expected[first]}, observed ${actual[first]}`);
}
async function verifyVideo({projection, sourceMediaPath, losslessPath, canvas, ffmpegPath}) {
  const source = decodedReader(ffmpegPath, videoDecode(sourceMediaPath));
  const actual = decodedReader(ffmpegPath, videoDecode(losslessPath));
  const black = blackFrame(canvas.width, canvas.height), frameBytes = black.length;
  const fades = fadeNumerators(projection), sourceHash = digest(), expectedHash = digest(), actualHash = digest();
  let sourceFrames = 0, displayFrames = 0, blackFrames = 0, fadedFrames = 0;
  try {
    for (const span of projection.presentationTimeline.spans) {
      require(span.startFrame === displayFrames, 'display span order differs');
      if (span.kind === 'base') require(span.baseStartFrame === sourceFrames, 'retained source order differs');
      for (let frame = span.startFrame; frame < span.endFrameExclusive; frame++) {
        let expected = black;
        if (span.kind === 'base') {
          const original = await source.read(frameBytes); sourceHash.update(original); sourceFrames++;
          expected = expectedFade(original, fades.get(frame), canvas.width * canvas.height, black);
          if (fades.has(frame)) fadedFrames++;
        } else blackFrames++;
        const observed = await actual.read(frameBytes);
        assertBytes(observed, expected, 'YUV frame ' + frame);
        expectedHash.update(expected); actualHash.update(observed); displayFrames++;
      }
    }
    require((await source.read(1, true)).length === 0, 'unexpected extra original video frame data');
    require((await actual.read(1, true)).length === 0, 'unexpected extra background video frame data');
    await source.finish(); await actual.finish();
    require(sourceFrames === projection.sourceFrameCount && displayFrames === projection.displayFrameCount, 'decoded frame count differs');
    return {status: 'passed', method: 'all decoded yuv420p bytes; independent finite-preset arithmetic',
      sourceFrames, displayFrames, blackFrames, fadedFrames, comparedYuvBytes: displayFrames * frameBytes,
      originalDecodedPayloadSha256: sourceHash.digest('hex'), expectedPayloadSha256: expectedHash.digest('hex'),
      observedPayloadSha256: actualHash.digest('hex'), completeRetainedFrameOrderPreserved: true};
  } finally {await source.stop(); await actual.stop();}
}
async function verifyPcm({projection, sourceMediaPath, losslessPath, ffmpegPath}) {
  const source = decodedReader(ffmpegPath, audioDecode(sourceMediaPath));
  const actual = decodedReader(ffmpegPath, audioDecode(losslessPath));
  const sourceRawHash = digest(), sourceLogicalHash = digest(), expectedHash = digest(), actualHash = digest();
  let sourceBytes = 0, displayBytes = 0, zeroBytes = 0, tailBytes = 0;
  try {
    for (const span of projection.presentationTimeline.spans) {
      let remaining = (span.endFrameExclusive - span.startFrame) * projection.sourceClock.playbackSampleRate / FRAME_RATE * SAMPLE_BYTES;
      while (remaining > 0) {
        const count = Math.min(65536, remaining);
        const expected = span.kind === 'base' ? await source.read(count) : Buffer.alloc(count);
        if (span.kind === 'base') {sourceRawHash.update(expected); sourceLogicalHash.update(expected); sourceBytes += count;}
        else zeroBytes += count;
        const observed = await actual.read(count);
        assertBytes(observed, expected, 'PCM at sample ' + displayBytes / SAMPLE_BYTES);
        expectedHash.update(expected); actualHash.update(observed); displayBytes += count; remaining -= count;
      }
    }
    for (;;) {
      const tail = await source.read(65536, true); if (!tail.length) break;
      tailBytes += tail.length; sourceRawHash.update(tail);
    }
    require(tailBytes % SAMPLE_BYTES === 0, 'partial decoded audio tail sample');
    require((await actual.read(1, true)).length === 0, 'unexpected extra background PCM');
    await source.finish(); await actual.finish();
    require(sourceBytes / SAMPLE_BYTES === projection.sourcePlaybackSampleCount
      && displayBytes / SAMPLE_BYTES === projection.displayPlaybackSampleCount, 'PCM presentation length differs');
    return {status: 'passed', method: 'all float32 interleaved stereo bytes; retained samples unchanged; inserted bytes zero',
      sampleRate: projection.sourceClock.playbackSampleRate, channels: CHANNELS,
      sourceLogicalSampleCount: sourceBytes / SAMPLE_BYTES, sourceRawDecodedSampleCount: (sourceBytes + tailBytes) / SAMPLE_BYTES,
      sourceDecoderTailSampleCount: tailBytes / SAMPLE_BYTES, displaySampleCount: displayBytes / SAMPLE_BYTES,
      insertedZeroSampleCount: zeroBytes / SAMPLE_BYTES, comparedPcmBytes: displayBytes,
      sourceRawDecodedPayloadSha256: sourceRawHash.digest('hex'), sourceLogicalPayloadSha256: sourceLogicalHash.digest('hex'),
      expectedPayloadSha256: expectedHash.digest('hex'), observedPayloadSha256: actualHash.digest('hex')};
  } finally {await source.stop(); await actual.stop();}
}

/** Independently checks any proposed lossless output, including fault-injected files. */
export async function verifyOrchestrationBackgroundV001({projection, expectedProjectionSha256,
  sourceMediaPath, losslessPath, ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe'}) {
  requireAbsolute(losslessPath, 'lossless output');
  const input = await checkedSource({projection, expectedProjectionSha256, sourceMediaPath, ffprobePath});
  const outputProbe = await probe(ffprobePath, losslessPath);
  mediaClock(outputProbe, projection, input.canvas, {lossless: true});
  const video = await verifyVideo({projection, sourceMediaPath, losslessPath, canvas: input.canvas, ffmpegPath});
  const audio = await verifyPcm({projection, sourceMediaPath, losslessPath, ffmpegPath});
  return {schemaVersion: 'presentation-orchestration-background-verification-v001', status: 'passed',
    projectionSha256: projection.projectionSha256, inputBindings: input.refs, outputRef: await fileRef(losslessPath),
    video, audio};
}

async function inspectEncodedAudio({audioPath, logicalSampleCount, sampleRate, ffmpegPath, ffprobePath}) {
  const observed = JSON.parse(await command(ffprobePath, ['-v', 'error', '-select_streams', 'a:0',
    '-show_streams', '-show_packets', '-show_entries', 'stream=codec_name,sample_rate,channels,time_base,start_pts,start_time,duration_ts,duration:packet=pts,dts,duration,side_data_list',
    '-of', 'json', audioPath]));
  require(observed.streams.length === 1 && observed.packets.length > 0, 'encoded AAC stream/packets missing');
  const stream = observed.streams[0], first = observed.packets[0], last = observed.packets.at(-1);
  require(stream.codec_name === 'aac' && Number(stream.sample_rate) === sampleRate && stream.channels === CHANNELS,
    'encoded AAC clock differs');
  require(stream.time_base === '1/' + sampleRate && Number(stream.start_pts) === 0
    && Number(stream.duration_ts) === logicalSampleCount, 'AAC effective presentation clock differs');
  let next = first.pts;
  for (const packet of observed.packets) {require(packet.pts === next && packet.dts === packet.pts, 'AAC packet timeline gap/overlap'); next += packet.duration;}
  require(next === logicalSampleCount, 'AAC last packet does not end at logical presentation sample');
  const skip = (first.side_data_list ?? []).filter(row => row.side_data_type === 'Skip Samples');
  require(skip.length === 1 && first.pts < 0 && skip[0].skip_samples === -first.pts, 'AAC priming/MP4 skip samples were lost');
  const initialDecode = JSON.parse(await command(ffprobePath, ['-v', 'error', '-select_streams', 'a:0',
    '-read_intervals', '%+#2', '-show_frames', '-show_entries', 'frame=pts,best_effort_timestamp,nb_samples',
    '-of', 'json', audioPath]));
  const firstDecodedFrame = initialDecode.frames?.[0];
  require(firstDecodedFrame?.pts === 0 && firstDecodedFrame.nb_samples > 0, 'AAC decoded presentation does not start at sample zero');
  const decoded = decodedReader(ffmpegPath, audioDecode(audioPath));
  const rawHash = digest(), logicalHash = digest(); let rawBytes = 0, logicalBytes = 0;
  try {
    for (;;) {
      const chunk = await decoded.read(65536, true); if (!chunk.length) break;
      rawHash.update(chunk); rawBytes += chunk.length;
      const take = Math.min(chunk.length, logicalSampleCount * SAMPLE_BYTES - logicalBytes);
      if (take > 0) {logicalHash.update(chunk.subarray(0, take)); logicalBytes += take;}
    }
    await decoded.finish();
  } finally {await decoded.stop();}
  require(rawBytes % SAMPLE_BYTES === 0 && logicalBytes === logicalSampleCount * SAMPLE_BYTES,
    'AAC decode is shorter than logical presentation or ends within a sample');
  const packetHash = (await command(ffmpegPath, ['-v', 'error', '-nostdin', '-i', audioPath,
    '-map', '0:a:0', '-c:a', 'copy', '-f', 'hash', '-hash', 'sha256', '-'])).trim();
  require(/^SHA256=[a-f0-9]{64}$/.test(packetHash), 'AAC packet hash output');
  return {status: 'passed', sampleRate, channels: CHANNELS, streamTimeBase: stream.time_base,
    presentationStartSample: Number(stream.start_pts), presentationEndSampleExclusive: Number(stream.duration_ts),
    durationSeconds: logicalSampleCount / sampleRate, firstPacket: first, lastPacket: last,
    packetCount: observed.packets.length, primingSkipSamples: skip[0].skip_samples, firstDecodedFrame,
    packetPayloadSha256: packetHash.slice('SHA256='.length), rawDecodedSampleCount: rawBytes / SAMPLE_BYTES,
    logicalDecodedSampleCount: logicalBytes / SAMPLE_BYTES, decodedTailSampleCount: rawBytes / SAMPLE_BYTES - logicalSampleCount,
    rawDecodedPayloadSha256: rawHash.digest('hex'), logicalDecodedPayloadSha256: logicalHash.digest('hex'),
    logicalDecodedInterval: {startSample: 0, endSampleExclusive: logicalSampleCount},
    transform: 'one native AAC encode of verified background float32 PCM; lossy PCM conversion; MP4 priming preserved; copy audio thereafter'};
}

export {inspectEncodedAudio as inspectOrchestrationEncodedAudioV001};

async function encodeVerifiedAudio({backgroundPath, audioPath, outputDirectory, projection, ffmpegPath, ffprobePath}) {
  const sampleRate = projection.sourceClock.playbackSampleRate;
  // concat uses a microsecond time base. Reconstruct timestamps from the actual
  // PCM sample index so NUT timestamp rounding cannot shorten an AAC packet.
  const filter = `asettb=expr=1/${sampleRate},asetpts=N`;
  await command(ffmpegPath, ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-i', backgroundPath,
    '-map', '0:a:0', '-vn', '-af', filter, '-c:a', 'aac', '-b:a', '192k', '-ar', String(sampleRate), '-ac', '2',
    '-movie_timescale', '30', '-movflags', '+faststart', '-map_metadata', '-1', '-f', 'mp4', audioPath],
  {outputDirectory, label: 'encode-audio-once'});
  const observation = await inspectEncodedAudio({audioPath, logicalSampleCount: projection.displayPlaybackSampleCount,
    sampleRate, ffmpegPath, ffprobePath});
  return {...observation, encodeInputTimestampRule: {filter, sampleIndexOrigin: 0, sampleRate,
    changesPcmSampleValues: false, changesPcmSampleCount: false}};
}

/** Finish only the AAC sidecar after a prior complete, SHA-bound lossless check.
 * A new unused ignored directory is mandatory; earlier files remain untouched. */
export async function finalizeOrchestrationBackgroundAudioV001({repositoryRoot, outputDirectory, projection,
  expectedProjectionSha256, losslessVerificationRef, ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe'}) {
  const outputGuard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot, outputDirectory});
  requireAbsolute(losslessVerificationRef?.path, 'lossless verification');
  const verificationBytes = await readFile(losslessVerificationRef.path);
  require(sha(verificationBytes) === losslessVerificationRef.fileSha256, 'saved lossless verification SHA differs');
  const verification = JSON.parse(verificationBytes);
  const input = await checkedSource({projection, expectedProjectionSha256,
    sourceMediaPath: projection?.sourceClock?.mediaRef?.path, ffprobePath});
  require(verification.schemaVersion === 'presentation-orchestration-background-verification-v001'
    && verification.status === 'passed' && verification.projectionSha256 === projection.projectionSha256,
  'saved lossless verification version/state differs');
  for (const role of ['media', 'plan', 'timeline']) require(verification.inputBindings?.[role]?.path === input.refs[role].path
    && verification.inputBindings[role].fileSha256 === input.refs[role].fileSha256, 'saved lossless source binding differs');
  require(verification.video?.status === 'passed' && verification.audio?.status === 'passed'
    && verification.video.sourceFrames === projection.sourceFrameCount
    && verification.video.displayFrames === projection.displayFrameCount
    && verification.video.completeRetainedFrameOrderPreserved === true
    && verification.audio.sourceLogicalSampleCount === projection.sourcePlaybackSampleCount
    && verification.audio.displaySampleCount === projection.displayPlaybackSampleCount
    && verification.audio.sampleRate === projection.sourceClock.playbackSampleRate
    && verification.audio.channels === CHANNELS
    && verification.video.expectedPayloadSha256 === verification.video.observedPayloadSha256
    && verification.audio.expectedPayloadSha256 === verification.audio.observedPayloadSha256,
  'saved full-media verification is incomplete or inconsistent');
  requireAbsolute(verification.outputRef?.path, 'verified background');
  require(await fileHash(verification.outputRef.path) === verification.outputRef.fileSha256,
    'verified lossless background SHA differs');
  await mkdir(outputDirectory, {recursive: true});
  try {
    await save(path.join(outputDirectory, 'projection.json'), projection);
    const audioPath = path.join(outputDirectory, 'audio.m4a');
    const audio = await encodeVerifiedAudio({backgroundPath: verification.outputRef.path, audioPath, outputDirectory,
      projection, ffmpegPath, ffprobePath});
    const proof = {schemaVersion: VERSION, status: 'passed', projectionSha256: projection.projectionSha256,
      sourceClockSha256: projection.sourceClockSha256, inputBindings: input.refs,
      concreteConnections: copy(projection.connections), outputGuard,
      sourceFrameCount: projection.sourceFrameCount, displayFrameCount: projection.displayFrameCount,
      outputs: {background: copy(verification.outputRef), audio: await fileRef(audioPath)}, verification,
      reusedLosslessVerificationRef: copy(losslessVerificationRef),
      verificationReuse: 'original passed full-frame/full-PCM verification, original source refs and immutable background SHA rechecked; no image generation or full QC rerun',
      encodedAudio: {...audio, encodeInputPcmPayloadSha256: verification.audio.observedPayloadSha256},
      composition: 'connection effects on subtitle-free background; captions afterward; AAC sidecar copied at final mux',
      repair: 'PCM sample-index timestamps eliminate a one-sample AAC packet-end error from rounded NUT timestamps',
      earlierOutputsModified: false};
    const proofPath = path.join(outputDirectory, 'proof.json');
    await save(proofPath, proof);
    return {...proof, proofRef: await fileRef(proofPath)};
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {schemaVersion: VERSION, status: 'failed',
      projectionSha256: projection.projectionSha256, message: String(error.message),
      reusedLosslessVerificationRef: copy(losslessVerificationRef)});
    throw error;
  }
}

export async function buildOrchestrationBackgroundV001({repositoryRoot, outputDirectory, projection,
  expectedProjectionSha256, ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe'}) {
  // No file is created before the shared unused-directory/ignore rule gate.
  const outputGuard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot, outputDirectory});
  const sourceMediaPath = projection?.sourceClock?.mediaRef?.path;
  const input = await checkedSource({projection, expectedProjectionSha256, sourceMediaPath, ffprobePath});
  await mkdir(outputDirectory, {recursive: true});
  const logicalPath = path.join(outputDirectory, 'base-logical.nut');
  const backgroundPath = path.join(outputDirectory, 'background.nut');
  const audioPath = path.join(outputDirectory, 'audio.m4a');
  const proofPath = path.join(outputDirectory, 'proof.json');
  const commands = {outputDirectory};
  const common = ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-filter_complex_threads', '1'];
  try {
    await save(path.join(outputDirectory, 'projection.json'), projection);
    const logicalGraph = `[0:v]trim=end_frame=${projection.sourceFrameCount},setpts=N/(30*TB)[v];`
      + `[0:a]atrim=end_sample=${projection.sourcePlaybackSampleCount},asetpts=N/SR/TB[a]`;
    await command(ffmpegPath, [...common, '-i', sourceMediaPath, '-filter_complex', logicalGraph,
      '-map', '[v]', '-map', '[a]', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p',
      '-fps_mode', 'passthrough', '-c:a', 'pcm_f32le', '-ar', String(projection.sourceClock.playbackSampleRate),
      '-ac', '2', '-f', 'nut', logicalPath], {...commands, label: 'logical-source'});
    const graph = buildConnectionExpressionTimelineFiltersV001({presentationTimeline: projection.presentationTimeline,
      canvas: input.canvas, audio: {sampleRate: projection.sourceClock.playbackSampleRate, channelLayout: 'stereo'},
      softWindows: projection.softWindows});
    const graphPath = path.join(outputDirectory, 'connection-background-filter.txt');
    await writeFile(graphPath, graph.join(';'), {flag: 'wx'});
    await command(ffmpegPath, [...common, '-i', logicalPath, '-filter_complex_script', graphPath,
      '-map', '[timelineVideo]', '-map', '[timelineAudio]', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p',
      '-fps_mode', 'passthrough', '-c:a', 'pcm_f32le', '-ar', String(projection.sourceClock.playbackSampleRate),
      '-ac', '2', '-f', 'nut', backgroundPath], {...commands, label: 'connection-background'});
    const verification = await verifyOrchestrationBackgroundV001({projection, expectedProjectionSha256,
      sourceMediaPath, losslessPath: backgroundPath, ffmpegPath, ffprobePath});
    await save(path.join(outputDirectory, 'lossless-verification.json'), verification);
    const audio = await encodeVerifiedAudio({backgroundPath, audioPath, outputDirectory,
      projection, ffmpegPath, ffprobePath});
    const proof = {schemaVersion: VERSION, status: 'passed', projectionSha256: projection.projectionSha256,
      sourceClockSha256: projection.sourceClockSha256, inputBindings: input.refs,
      concreteConnections: copy(projection.connections), outputGuard,
      sourceFrameCount: projection.sourceFrameCount, displayFrameCount: projection.displayFrameCount,
      logicalSourceTrim: {videoFrameCount: projection.sourceFrameCount, sampleCount: projection.sourcePlaybackSampleCount,
        sourceRawDecodedSampleCount: verification.audio.sourceRawDecodedSampleCount,
        excludedDecoderTailSampleCount: verification.audio.sourceDecoderTailSampleCount},
      outputs: {logicalBase: await fileRef(logicalPath), background: verification.outputRef, audio: await fileRef(audioPath)},
      verification, encodedAudio: {...audio, encodeInputPcmPayloadSha256: verification.audio.observedPayloadSha256},
      composition: 'connection effects on subtitle-free background; captions must be composited afterward; AAC sidecar copied at final mux',
      rejectedContainerProbe: {scope: '64x48, 30fps, one second, 44100Hz synthetic FFV1/PCM; ffmpeg 8.0.1',
        attempted: 'same FFV1 video plus one AAC encode into NUT',
        observed: 'default NUT shifts video start to 0.023226 seconds and omits AAC skip metadata; disabling negative-PTS adjustment rejects AAC packet at -1024',
        decision: 'retain FFV1/PCM NUT and store encoded AAC separately in MP4 to preserve zero video origin and priming'},
      sourceMediaShaUnchanged: await fileHash(sourceMediaPath) === input.refs.media.fileSha256};
    require(proof.sourceMediaShaUnchanged, 'source changed during background generation');
    await save(proofPath, proof);
    return {...proof, proofRef: await fileRef(proofPath)};
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {schemaVersion: VERSION, status: 'failed',
      projectionSha256: projection.projectionSha256, message: String(error.message), inputBindings: input.refs});
    throw error;
  }
}

const RANGE_VERSION = 'presentation-orchestration-background-range-v001';
const rangeRepositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function checkedRange(range, fullFrameCount) {
  require(range && Object.keys(range).sort().join(',') === 'endFrameExclusive,startFrame'
    && Number.isSafeInteger(range.startFrame) && Number.isSafeInteger(range.endFrameExclusive)
    && range.startFrame >= 0 && range.endFrameExclusive > range.startFrame
    && range.endFrameExclusive <= fullFrameCount, 'range must be a nonempty half-open interval of the full display clock');
  return copy(range);
}
function intersectDisplaySpans(projection, range) {
  return projection.presentationTimeline.spans.flatMap(span => {
    const startFrame = Math.max(range.startFrame, span.startFrame);
    const endFrameExclusive = Math.min(range.endFrameExclusive, span.endFrameExclusive);
    if (startFrame >= endFrameExclusive) return [];
    const part = {kind: span.kind, startFrame, endFrameExclusive,
      localStartFrame: startFrame - range.startFrame, localEndFrameExclusive: endFrameExclusive - range.startFrame};
    return [span.kind === 'base' ? {...part,
      sourceStartFrame: span.baseStartFrame + startFrame - span.startFrame,
      sourceEndFrameExclusive: span.baseStartFrame + endFrameExclusive - span.startFrame}
      : {...part, beforeSegmentId: span.beforeSegmentId, afterSegmentId: span.afterSegmentId,
        connectionId: projection.insertedSpans.find(row => row.displayStartFrame === span.startFrame
          && row.displayEndFrameExclusive === span.endFrameExclusive).connectionId}];
  });
}

/** Derive a local rendering interval from an already validated full projection.
 * Full insertions and Soft supports remain intact until the final range trim. */
export function deriveOrchestrationBackgroundRangeV001({projection, range}) {
  const requested = checkedRange(range, projection.displayFrameCount);
  const working = copy(requested);
  let changed;
  do {
    const before = working.startFrame + ':' + working.endFrameExclusive;
    for (const window of projection.softWindows) {
      const start = window.blackStartFrame - 6, end = window.blackEndFrameExclusive + 6;
      if (start < working.endFrameExclusive && end > working.startFrame) {
        working.startFrame = Math.min(working.startFrame, start);
        working.endFrameExclusive = Math.max(working.endFrameExclusive, end);
      }
    }
    for (const span of projection.insertedSpans) {
      if (span.displayStartFrame < working.endFrameExclusive && span.displayEndFrameExclusive > working.startFrame) {
        // One retained frame on each side preserves the existing finite graph
        // contract even when the requested interval lies wholly inside black.
        working.startFrame = Math.min(working.startFrame, span.displayStartFrame - 1);
        working.endFrameExclusive = Math.max(working.endFrameExclusive, span.displayEndFrameExclusive + 1);
      }
    }
    changed = before !== working.startFrame + ':' + working.endFrameExclusive;
  } while (changed);
  checkedRange(working, projection.displayFrameCount);
  const workingParts = intersectDisplaySpans(projection, working);
  require(workingParts[0]?.kind === 'base' && workingParts.at(-1)?.kind === 'base',
    'working range must retain media around every insertion');
  const sourceStartFrame = workingParts[0].sourceStartFrame;
  const sourceEndFrameExclusive = workingParts.at(-1).sourceEndFrameExclusive;
  const spans = workingParts.map(part => part.kind === 'base'
    ? {kind: 'base', baseStartFrame: part.sourceStartFrame - sourceStartFrame,
      baseEndFrame: part.sourceEndFrameExclusive - sourceStartFrame,
      startFrame: part.localStartFrame, endFrameExclusive: part.localEndFrameExclusive}
    : {kind: 'black', beforeSegmentId: part.beforeSegmentId, afterSegmentId: part.afterSegmentId,
      startFrame: part.localStartFrame, endFrameExclusive: part.localEndFrameExclusive});
  const softWindows = projection.softWindows.filter(window => window.blackStartFrame >= working.startFrame
    && window.blackEndFrameExclusive <= working.endFrameExclusive).map(window => ({...copy(window),
    blackStartFrame: window.blackStartFrame - working.startFrame,
    blackEndFrameExclusive: window.blackEndFrameExclusive - working.startFrame}));
  const samplesPerFrame = projection.sourceClock.playbackSampleRate / FRAME_RATE;
  require(Number.isSafeInteger(samplesPerFrame), 'playback samples per frame must be integral');
  return {schemaVersion: RANGE_VERSION, projectionSha256: projection.projectionSha256,
    sourceClockSha256: projection.sourceClockSha256, fullDisplayFrameCount: projection.displayFrameCount,
    range: requested, displayFrameCount: requested.endFrameExclusive - requested.startFrame,
    workingRange: working, workingFrameCount: working.endFrameExclusive - working.startFrame,
    sourceRange: {startFrame: sourceStartFrame, endFrameExclusive: sourceEndFrameExclusive,
      startSample: sourceStartFrame * samplesPerFrame, endSampleExclusive: sourceEndFrameExclusive * samplesPerFrame},
    trimRange: {startFrame: requested.startFrame - working.startFrame,
      endFrameExclusive: requested.endFrameExclusive - working.startFrame,
      startSample: (requested.startFrame - working.startFrame) * samplesPerFrame,
      endSampleExclusive: (requested.endFrameExclusive - working.startFrame) * samplesPerFrame},
    playbackRange: {sampleRate: projection.sourceClock.playbackSampleRate,
      startSample: requested.startFrame * samplesPerFrame, endSampleExclusive: requested.endFrameExclusive * samplesPerFrame,
      localSampleCount: (requested.endFrameExclusive - requested.startFrame) * samplesPerFrame},
    presentationTimeline: {spans}, softWindows, parts: intersectDisplaySpans(projection, requested)};
}

function rangeVideoDecode(file, range) {
  return ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-an', '-vf',
    'trim=start_frame=' + range.startFrame + ':end_frame=' + range.endFrameExclusive + ',setpts=PTS-STARTPTS',
    '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'];
}
function rangeAudioDecode(file, range) {
  return ['-v', 'error', '-nostdin', '-i', file, '-map', '0:a:0', '-vn', '-af',
    'atrim=start_sample=' + range.startSample + ':end_sample=' + range.endSampleExclusive + ',asetpts=PTS-STARTPTS',
    '-c:a', 'pcm_f32le', '-f', 'f32le', '-'];
}
async function verifyRangePixelsAndPcm({projection, recipe, sourceMediaPath, losslessPath, canvas, ffmpegPath, ffprobePath}) {
  mediaClock(await probe(ffprobePath, losslessPath), projection, canvas, {lossless: true, singleFrame: recipe.displayFrameCount === 1});
  const retained = recipe.parts.filter(part => part.kind === 'base');
  const sourceRange = retained.length ? {startFrame: retained[0].sourceStartFrame,
    endFrameExclusive: retained.at(-1).sourceEndFrameExclusive} : null;
  const sourceVideo = sourceRange ? decodedReader(ffmpegPath, rangeVideoDecode(sourceMediaPath, sourceRange)) : null;
  const actualVideo = decodedReader(ffmpegPath, videoDecode(losslessPath));
  const black = blackFrame(canvas.width, canvas.height), fades = fadeNumerators(projection);
  const expectedVideoHash = digest(), observedVideoHash = digest();
  let videoFrameCount = 0, retainedFrameCount = 0, blackFrameCount = 0;
  try {
    for (const part of recipe.parts) for (let frame = part.startFrame; frame < part.endFrameExclusive; frame++) {
      let expected = black;
      if (part.kind === 'base') {
        expected = expectedFade(await sourceVideo.read(black.length), fades.get(frame), canvas.width * canvas.height, black);
        retainedFrameCount++;
      } else blackFrameCount++;
      const actual = await actualVideo.read(black.length).catch(error => {
        fail('range YUV at global frame ' + frame + ': ' + error.message);
      });
      assertBytes(actual, expected, 'range YUV at global frame ' + frame);
      expectedVideoHash.update(expected); observedVideoHash.update(actual); videoFrameCount++;
    }
    if (sourceVideo) {
      require((await sourceVideo.read(1, true)).length === 0, 'range source video contains unexpected extra frames');
      await sourceVideo.finish();
    }
    require((await actualVideo.read(1, true)).length === 0, 'range background has unexpected extra video frames');
    await actualVideo.finish();
  } finally {if (sourceVideo) await sourceVideo.stop(); await actualVideo.stop();}
  const samplesPerFrame = projection.sourceClock.playbackSampleRate / FRAME_RATE;
  const sourceAudio = sourceRange ? decodedReader(ffmpegPath, rangeAudioDecode(sourceMediaPath, {
    startSample: sourceRange.startFrame * samplesPerFrame, endSampleExclusive: sourceRange.endFrameExclusive * samplesPerFrame})) : null;
  const actualAudio = decodedReader(ffmpegPath, audioDecode(losslessPath));
  const expectedAudioHash = digest(), observedAudioHash = digest();
  let audioBytes = 0, insertedZeroSampleCount = 0;
  try {
    for (const part of recipe.parts) {
      let remaining = (part.endFrameExclusive - part.startFrame) * samplesPerFrame * SAMPLE_BYTES;
      if (part.kind === 'black') insertedZeroSampleCount += remaining / SAMPLE_BYTES;
      while (remaining > 0) {
        const count = Math.min(65536, remaining);
        const expected = part.kind === 'base' ? await sourceAudio.read(count) : Buffer.alloc(count);
        const actual = await actualAudio.read(count);
        assertBytes(actual, expected, 'range PCM at local sample ' + audioBytes / SAMPLE_BYTES);
        expectedAudioHash.update(expected); observedAudioHash.update(actual);
        audioBytes += count; remaining -= count;
      }
    }
    if (sourceAudio) {
      require((await sourceAudio.read(1, true)).length === 0, 'range source PCM contains unexpected extra samples');
      await sourceAudio.finish();
    }
    require((await actualAudio.read(1, true)).length === 0, 'range background has unexpected extra PCM samples');
    await actualAudio.finish();
  } finally {if (sourceAudio) await sourceAudio.stop(); await actualAudio.stop();}
  require(videoFrameCount === recipe.displayFrameCount
    && audioBytes / SAMPLE_BYTES === recipe.playbackRange.localSampleCount, 'range frame/sample count differs');
  return {schemaVersion: 'presentation-orchestration-background-range-verification-v001', status: 'passed',
    projectionSha256: projection.projectionSha256, range: copy(recipe.range), outputRef: await fileRef(losslessPath),
    video: {status: 'passed', displayFrames: videoFrameCount, retainedFrameCount, blackFrameCount,
      comparedYuvBytes: videoFrameCount * black.length, expectedPayloadSha256: expectedVideoHash.digest('hex'),
      observedPayloadSha256: observedVideoHash.digest('hex'), softPhaseBasis: 'full display clock'},
    audio: {status: 'passed', sampleRate: projection.sourceClock.playbackSampleRate, channels: CHANNELS,
      displaySampleCount: audioBytes / SAMPLE_BYTES, insertedZeroSampleCount, comparedPcmBytes: audioBytes,
      expectedPayloadSha256: expectedAudioHash.digest('hex'), observedPayloadSha256: observedAudioHash.digest('hex')},
    method: 'every requested YUV byte and float32 PCM byte against original retained media and global finite connection arithmetic'};
}

async function checkedDrawingSources(drawingView, ffprobePath) {
  assertOrchestrationDrawingViewV001(drawingView);
  const projection = drawingView.projection;
  const input = await checkedSource({projection, expectedProjectionSha256: projection.projectionSha256,
    sourceMediaPath: projection.sourceClock.mediaRef.path, ffprobePath});
  const timing = drawingView.sourceRefs.pulseTimingEvidence;
  const extra = [drawingView.sourceRefs.decisionInputRef,
    ...(timing ? [timing.sourceRef, timing.candidatesRef, timing.peaksRef] : [])];
  const unique = new Map([...Object.values(input.refs), ...extra].map(ref => [ref.path, ref]));
  for (const reference of new Map(extra.map(ref => [ref.path, ref])).values())
    require(await fileHash(reference.path) === reference.fileSha256, 'drawing source SHA differs');
  return {...input, allRefs: [...unique.values()].map(copy)};
}

/** Public range checker for saved results and bounded physical fault tests. */
export async function verifyOrchestrationRangeBackgroundV001({drawingView, range, losslessPath,
  ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe'}) {
  const input = await checkedDrawingSources(drawingView, ffprobePath);
  const recipe = deriveOrchestrationBackgroundRangeV001({projection: drawingView.projection, range});
  return verifyRangePixelsAndPcm({projection: drawingView.projection, recipe,
    sourceMediaPath: drawingView.projection.sourceClock.mediaRef.path, losslessPath, canvas: input.canvas, ffmpegPath, ffprobePath});
}

const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function requireMatchingSourceBindings(bindings, expected, label) {
  for (const role of ['media', 'plan', 'timeline']) require(bindings?.[role]?.path === expected[role].path
    && isSha256(bindings[role].fileSha256) && bindings[role].fileSha256 === expected[role].fileSha256,
  label + ' source binding differs');
}
async function requireSavedFile(reference, label) {
  requireAbsolute(reference?.path, label);
  require(isSha256(reference.fileSha256) && Number.isSafeInteger(reference.bytes) && reference.bytes > 0,
    label + ' file SHA/size is missing or invalid');
  const metadata = await lstat(reference.path);
  require(metadata.isFile() && !metadata.isSymbolicLink() && metadata.size === reference.bytes
    && await fileHash(reference.path) === reference.fileSha256, label + ' file binding differs');
}

async function reusableBackground({reuseProofPath, projection, range, input, includeProof = false}) {
  if (!reuseProofPath) return {requested: false, used: false, reason: 'no-saved-background'};
  requireAbsolute(reuseProofPath, 'background proof');
  const metadata = await lstat(reuseProofPath);
  require(metadata.isFile() && !metadata.isSymbolicLink(), 'saved background proof must be a regular file');
  const bytes = await readFile(reuseProofPath), proof = JSON.parse(bytes);
  const result = {requested: true, used: false, proofRef: {path: reuseProofPath, fileSha256: sha(bytes), bytes: bytes.length}};
  require([VERSION, RANGE_VERSION].includes(proof.schemaVersion) && proof.status === 'passed', 'saved background proof is not passed');
  require(isSha256(proof.projectionSha256) && isSha256(proof.sourceClockSha256), 'saved background projection SHA is missing or invalid');
  if (proof.projectionSha256 !== projection.projectionSha256 || proof.sourceClockSha256 !== projection.sourceClockSha256) {
    return {...result, reason: 'different-full-projection'};
  }
  require((proof.fullDisplayFrameCount ?? proof.displayFrameCount) === projection.displayFrameCount,
    'saved background full display length differs');
  requireMatchingSourceBindings(proof.inputBindings, input.refs, 'saved background');
  const coverage = proof.schemaVersion === VERSION ? {startFrame: 0, endFrameExclusive: proof.displayFrameCount}
    : checkedRange(proof.range, projection.displayFrameCount);
  if (coverage.startFrame > range.startFrame || coverage.endFrameExclusive < range.endFrameExclusive)
    return {...result, reason: 'saved-background-does-not-cover-range'};
  const frameCount = coverage.endFrameExclusive - coverage.startFrame;
  const sampleCount = frameCount * projection.sourceClock.playbackSampleRate / FRAME_RATE;
  require(proof.displayFrameCount === frameCount, 'saved background local display length differs');
  const verification = proof.verification;
  const verificationVersion = proof.schemaVersion === VERSION ? 'presentation-orchestration-background-verification-v001'
    : 'presentation-orchestration-background-range-verification-v001';
  require(verification?.schemaVersion === verificationVersion
    && verification.status === 'passed' && verification.projectionSha256 === projection.projectionSha256
    && verification.video?.status === 'passed' && verification.audio?.status === 'passed'
    && verification.video.displayFrames === frameCount
    && verification.audio.displaySampleCount === sampleCount
    && verification.audio.sampleRate === projection.sourceClock.playbackSampleRate
    && verification.audio.channels === CHANNELS
    && verification.video.comparedYuvBytes === frameCount * input.canvas.width * input.canvas.height * 3 / 2
    && verification.audio.comparedPcmBytes === sampleCount * SAMPLE_BYTES
    && isSha256(verification.video.expectedPayloadSha256) && isSha256(verification.video.observedPayloadSha256)
    && isSha256(verification.audio.expectedPayloadSha256) && isSha256(verification.audio.observedPayloadSha256)
    && verification.video.expectedPayloadSha256 === verification.video.observedPayloadSha256
    && verification.audio.expectedPayloadSha256 === verification.audio.observedPayloadSha256,
  'saved background pixel/PCM verification is incomplete');
  if (proof.schemaVersion === RANGE_VERSION) require(isDeepStrictEqual(verification.range, coverage),
    'saved background verification coverage differs');
  if (proof.schemaVersion === VERSION) require(verification.video.sourceFrames === projection.sourceFrameCount
    && verification.video.completeRetainedFrameOrderPreserved === true
    && verification.audio.sourceLogicalSampleCount === projection.sourcePlaybackSampleCount,
  'saved full background retained source counts differ');
  if (Object.hasOwn(verification, 'inputBindings'))
    requireMatchingSourceBindings(verification.inputBindings, input.refs, 'saved background verification');
  const background = proof.outputs?.background;
  await requireSavedFile(background, 'saved background media');
  require(isDeepStrictEqual(background, verification.outputRef), 'saved background verification output binding differs');
  await requireSavedFile(result.proofRef, 'saved background proof');
  return {...result, used: true, reason: 'verified-source-and-full-projection-match', coverage,
    fullCoverage: coverage.startFrame === 0 && coverage.endFrameExclusive === projection.displayFrameCount,
    background: copy(background), ...(includeProof ? {proof: copy(proof)} : {})};
}

/** Admit a saved background and its AAC sidecar without regenerating pixels.
 * The saved full/range pixel and PCM proof is checked against immutable source
 * and media references; AAC packets, priming and decoded samples are re-read. */
export async function inspectSavedOrchestrationBackgroundReuseV001({drawingView, range, reuseProofPath,
  ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe'}) {
  const input = await checkedDrawingSources(drawingView, ffprobePath), projection = drawingView.projection;
  const requested = checkedRange(range, projection.displayFrameCount);
  const reuse = await reusableBackground({reuseProofPath, projection, range: requested, input, includeProof: true});
  if (!reuse.used) {
    if (reuse.proofRef) await requireSavedFile(reuse.proofRef, 'saved background proof');
    return reuse;
  }
  const audio = reuse.proof.outputs?.audio, encoded = reuse.proof.encodedAudio;
  await requireSavedFile(audio, 'saved background AAC');
  require(encoded?.status === 'passed'
    && ['packetPayloadSha256', 'rawDecodedPayloadSha256', 'logicalDecodedPayloadSha256', 'encodeInputPcmPayloadSha256']
      .every(name => isSha256(encoded[name]))
    && encoded.encodeInputPcmPayloadSha256 === reuse.proof.verification.audio.observedPayloadSha256,
  'saved AAC verification is missing or not bound to verified PCM');
  const observation = await inspectEncodedAudio({audioPath: audio.path,
    logicalSampleCount: (reuse.coverage.endFrameExclusive - reuse.coverage.startFrame)
      * projection.sourceClock.playbackSampleRate / FRAME_RATE,
    sampleRate: projection.sourceClock.playbackSampleRate, ffmpegPath, ffprobePath});
  for (const [name, value] of Object.entries(observation)) require(isDeepStrictEqual(encoded[name], value),
    'saved AAC verification differs at ' + name);
  for (const reference of input.allRefs) require(await fileHash(reference.path) === reference.fileSha256,
    'saved background source changed while checking reuse');
  await requireSavedFile(reuse.background, 'saved background media');
  await requireSavedFile(audio, 'saved background AAC');
  await requireSavedFile(reuse.proofRef, 'saved background proof');
  return {...reuse, audio: copy(audio), encodedAudioObservation: observation,
    verificationReuse: 'saved pixel/PCM proof and source/media bindings rechecked; actual AAC clock, priming, packets and decoded payload rechecked'};
}

/** The same full-clock background rules, restricted to a requested display range.
 * This entry accepts saved human overrides through a validated drawing view. */
export async function buildOrchestrationRangeBackgroundV001({drawingView, range, outputDirectory,
  reuseProofPath, ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe'}) {
  const started = performance.now(), timing = {};
  const outputGuard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: rangeRepositoryRoot, outputDirectory});
  const input = await checkedDrawingSources(drawingView, ffprobePath);
  const projection = drawingView.projection;
  const recipe = deriveOrchestrationBackgroundRangeV001({projection, range});
  const reuse = await reusableBackground({reuseProofPath, projection, range: recipe.range, input});
  const implementationBindings = await Promise.all(['presentation_orchestration_background_v001.mjs',
    'presentation_orchestration_projection_v001.mjs', 'connection_expression_v001.mjs', 'presentation_effects_v001.mjs']
    .map(name => fileRef(path.join(rangeRepositoryRoot, 'evals/clip_composition', name))));
  timing.preparationMilliseconds = performance.now() - started;
  await mkdir(outputDirectory, {recursive: true});
  const backgroundPath = path.join(outputDirectory, 'background.nut'), audioPath = path.join(outputDirectory, 'audio.m4a');
  const common = ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-filter_complex_threads', '1'];
  const lossless = ['-map', '[v]', '-map', '[a]', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p',
    '-fps_mode', 'passthrough', '-c:a', 'pcm_f32le', '-ar', String(projection.sourceClock.playbackSampleRate), '-ac', '2', '-f', 'nut'];
  const trimGraph = interval => '[0:v]trim=start_frame=' + interval.startFrame + ':end_frame=' + interval.endFrameExclusive
    + ',setpts=N/(30*TB)[v];[0:a]atrim=start_sample=' + interval.startSample + ':end_sample=' + interval.endSampleExclusive
    + ',asetpts=N/SR/TB[a]';
  try {
    await save(path.join(outputDirectory, 'range.json'), recipe);
    await save(path.join(outputDirectory, 'reuse.json'), reuse);
    const renderStarted = performance.now();
    if (reuse.used) {
      const first = recipe.range.startFrame - reuse.coverage.startFrame, last = recipe.range.endFrameExclusive - reuse.coverage.startFrame;
      const graph = trimGraph({startFrame: first, endFrameExclusive: last,
        startSample: first * projection.sourceClock.playbackSampleRate / FRAME_RATE,
        endSampleExclusive: last * projection.sourceClock.playbackSampleRate / FRAME_RATE});
      await command(ffmpegPath, [...common, '-i', reuse.background.path, '-filter_complex', graph, ...lossless, backgroundPath],
        {outputDirectory, label: 'reuse-background-range'});
    } else {
      const logicalPath = path.join(outputDirectory, 'source-range.nut'), workingPath = path.join(outputDirectory, 'working-background.nut');
      await command(ffmpegPath, [...common, '-i', projection.sourceClock.mediaRef.path,
        '-filter_complex', trimGraph(recipe.sourceRange), ...lossless, logicalPath], {outputDirectory, label: 'source-range'});
      const graph = buildConnectionExpressionTimelineFiltersV001({presentationTimeline: recipe.presentationTimeline,
        canvas: input.canvas, audio: {sampleRate: projection.sourceClock.playbackSampleRate, channelLayout: 'stereo'},
        softWindows: recipe.softWindows});
      const graphPath = path.join(outputDirectory, 'connection-range-filter.txt');
      await writeFile(graphPath, graph.join(';'), {flag: 'wx'});
      await command(ffmpegPath, [...common, '-i', logicalPath, '-filter_complex_script', graphPath,
        ...lossless.map(value => value === '[v]' ? '[timelineVideo]' : value === '[a]' ? '[timelineAudio]' : value), workingPath],
      {outputDirectory, label: 'connection-range'});
      await command(ffmpegPath, [...common, '-i', workingPath, '-filter_complex', trimGraph(recipe.trimRange), ...lossless, backgroundPath],
        {outputDirectory, label: 'requested-range'});
    }
    timing.losslessGenerationMilliseconds = performance.now() - renderStarted;
    const verifyStarted = performance.now();
    const verification = await verifyRangePixelsAndPcm({projection, recipe,
      sourceMediaPath: projection.sourceClock.mediaRef.path, losslessPath: backgroundPath, canvas: input.canvas, ffmpegPath, ffprobePath});
    timing.losslessVerificationMilliseconds = performance.now() - verifyStarted;
    await save(path.join(outputDirectory, 'lossless-verification.json'), verification);
    const audioStarted = performance.now();
    const encodedAudio = await encodeVerifiedAudio({backgroundPath, audioPath, outputDirectory,
      projection: {...projection, displayPlaybackSampleCount: recipe.playbackRange.localSampleCount}, ffmpegPath, ffprobePath});
    timing.audioEncodingMilliseconds = performance.now() - audioStarted;
    for (const ref of [...input.allRefs, ...implementationBindings]) require(await fileHash(ref.path) === ref.fileSha256,
      'a range input or implementation changed while drawing');
    if (reuse.used) {
      require(await fileHash(reuse.background.path) === reuse.background.fileSha256, 'reused background changed while trimming');
      require(await fileHash(reuseProofPath) === reuse.proofRef.fileSha256, 'reused background proof changed while trimming');
    }
    timing.totalMilliseconds = performance.now() - started;
    const proof = {schemaVersion: RANGE_VERSION, status: 'passed', projectionSha256: projection.projectionSha256,
      sourceClockSha256: projection.sourceClockSha256, fullDisplayFrameCount: projection.displayFrameCount,
      displayFrameCount: recipe.displayFrameCount, range: copy(recipe.range), recipe, inputBindings: input.refs,
      sourceBindings: input.allRefs, implementationBindings, outputGuard, reuse, timing,
      outputs: {background: await fileRef(backgroundPath), audio: await fileRef(audioPath)}, verification,
      encodedAudio: {...encodedAudio, encodeInputPcmPayloadSha256: verification.audio.observedPayloadSha256},
      composition: 'full-clock connection effects on the requested subtitle-free range; native captions follow; AAC sidecar copied at final mux',
      fullBackgroundGenerated: !reuse.used && recipe.workingRange.startFrame === 0
        && recipe.workingRange.endFrameExclusive === projection.displayFrameCount,
      fullQcExecuted: recipe.range.startFrame === 0 && recipe.range.endFrameExclusive === projection.displayFrameCount,
      verificationCoverage: {range: copy(recipe.range), fullDisplayFrameCount: projection.displayFrameCount,
        comparedVideoFrames: verification.video.displayFrames, comparedAudioSamples: verification.audio.displaySampleCount}};
    const proofPath = path.join(outputDirectory, 'proof.json'); await save(proofPath, proof);
    return {...proof, proofRef: await fileRef(proofPath)};
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {schemaVersion: RANGE_VERSION, status: 'failed',
      range: recipe.range, projectionSha256: projection.projectionSha256, timing, message: String(error), stack: error?.stack});
    throw error;
  }
}
