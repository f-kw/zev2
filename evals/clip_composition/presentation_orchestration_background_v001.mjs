/** Build and independently check subtitle-free connection backgrounds. No AI selection. */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {buildConnectionExpressionTimelineFiltersV001} from './connection_expression_v001.mjs';
import {assertProjectionMatchesStateV001} from './presentation_orchestration_projection_v001.mjs';
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
function mediaClock(observed, projection, canvas, {lossless = false} = {}) {
  const videos = observed.streams.filter(stream => stream.codec_type === 'video');
  const audios = observed.streams.filter(stream => stream.codec_type === 'audio');
  require(videos.length === 1 && audios.length === 1, 'exactly one video and one audio stream required');
  const video = videos[0], audio = audios[0];
  require(video.width === canvas.width && video.height === canvas.height && video.pix_fmt === 'yuv420p'
    && video.color_range !== 'pc', 'limited-range 8-bit yuv420p canvas required');
  require(video.r_frame_rate === '30/1' && video.avg_frame_rate === '30/1', '30fps source clock required');
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
  async function read(count, allowShort = false) {
    const result = Buffer.allocUnsafe(count); let written = 0;
    while (written < count) {
      if (!pending.length && !ended) {
        const next = await iterator.next();
        ended = Boolean(next.done); pending = next.done ? Buffer.alloc(0) : next.value;
      }
      if (ended && !pending.length) break;
      const take = Math.min(count - written, pending.length);
      pending.copy(result, written, 0, take); pending = pending.subarray(take); written += take;
    }
    require(allowShort || written === count, `decoded stream ended early: expected ${count} bytes, got ${written}`);
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
