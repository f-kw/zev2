/** Five-second MP4 resolution/capacity experiment, separate from the dev
 * overlay pipeline and final pixel QC. Never overwrites the protected 7A MP4. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectOrchestrationEncodedAudioV001}
  from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const parentDirectory = path.join(root, 'runtime/artifacts/development-proxy-20260929-v001');
const outputDirectory = path.join(parentDirectory, 'mp4-capacity-fixture');
const jobPath = path.join(parentDirectory, 'job.json');
const exec = promisify(execFile);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const processes = [];
async function bind(file) {
  const before = await lstat(file); assert(before.isFile() && !before.isSymbolicLink());
  const sha = createHash('sha256'); for await (const part of createReadStream(file)) sha.update(part);
  const after = await lstat(file);
  for (const key of ['ino', 'size', 'mtimeMs']) assert.equal(after[key], before[key], 'file changed during hashing');
  return {path: file, bytes: before.size, fileSha256: sha.digest('hex')};
}
async function allocation(file) {
  const value = await lstat(file);
  return {logicalBytes: value.size, allocatedBytes: value.blocks * 512,
    allocationMethod: 'POSIX st_blocks multiplied by 512; allocated file blocks, not physical I/O'};
}
async function run(label, command, args) {
  const startedAt = new Date().toISOString(), started = performance.now();
  try {
    const result = await exec(command, args, {encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
    processes.push({label, command, args, code: 0, startedAt, endedAt: new Date().toISOString(),
      wallSeconds: (performance.now() - started) / 1000,
      stdoutSha256: digest(result.stdout), stderrSha256: digest(result.stderr)});
    return result.stdout;
  } catch (error) {
    processes.push({label, command, args, code: error.code, signal: error.signal ?? null, startedAt,
      endedAt: new Date().toISOString(), wallSeconds: (performance.now() - started) / 1000,
      message: error.message});
    throw error;
  }
}
const save = (name, value) => writeFile(path.join(outputDirectory, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});

async function inspectOutput(file, expected, tools) {
  const observation = JSON.parse(await run('output-frame-clock', tools.ffprobePath,
    ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_frames',
      '-show_entries', 'stream=width,height,time_base,avg_frame_rate,duration_ts,codec_name,pix_fmt:frame=best_effort_timestamp',
      '-of', 'json', file]));
  assert.equal(observation.streams.length, 1);
  const stream = observation.streams[0];
  assert.equal(stream.codec_name, 'h264'); assert.equal(stream.pix_fmt, 'yuv420p');
  assert.equal(stream.width, expected.width); assert.equal(stream.height, expected.height);
  assert.equal(stream.avg_frame_rate, '30/1'); assert.equal(observation.frames.length, expected.frameCount);
  const [n, d] = stream.time_base.split('/').map(BigInt);
  observation.frames.forEach((frame, index) =>
    assert.equal(BigInt(frame.best_effort_timestamp) * n * 30n, BigInt(index) * d));
  assert.equal(BigInt(stream.duration_ts) * n * 30n, BigInt(expected.frameCount) * d);
  const audio = await inspectOrchestrationEncodedAudioV001({audioPath: file,
    logicalSampleCount: expected.logicalSampleCount, sampleRate: expected.sampleRate, ...tools});
  return {mediaRef: await bind(file), capacity: await allocation(file),
    video: {status: 'passed', width: stream.width, height: stream.height, frameCount: observation.frames.length,
      fps: 30, durationSeconds: expected.frameCount / 30, timeBase: stream.time_base,
      firstPts: observation.frames[0].best_effort_timestamp, lastPts: observation.frames.at(-1).best_effort_timestamp,
      rule: 'every decoded PTS equals frame index / 30; exact duration'}, audio};
}

async function main() {
  const startedAt = new Date().toISOString(), started = performance.now();
  const job = JSON.parse(await readFile(jobPath, 'utf8'));
  assert.equal(job.schemaVersion, 'development-proxy-representative-job-v001');
  const sourceRef = job.preservedCandidateVideoRef;
  assert.deepEqual(await bind(sourceRef.path), sourceRef, 'protected source differs from saved job');
  const range = {startFrame: 7347, endFrameExclusive: 7497, fps: 30, frameCount: 150};
  const approvedRange = job.ranges.find(item => item.name === 'normal-motion');
  assert(approvedRange && range.startFrame >= approvedRange.startFrame
    && range.endFrameExclusive <= approvedRange.endFrameExclusive);
  const tools = {ffmpegPath: job.mediaInput.ffmpegPath, ffprobePath: job.mediaInput.ffprobePath};
  for (const executable of Object.values(tools)) assert.equal(await realpath(executable), executable);
  const bindings = {script: await bind(fileURLToPath(import.meta.url)), job: await bind(jobPath),
    ffmpeg: await bind(tools.ffmpegPath), ffprobe: await bind(tools.ffprobePath)};
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root, outputDirectory});
  await mkdir(outputDirectory);
  try {
    const metadata = JSON.parse(await run('source-stream-metadata-only', tools.ffprobePath,
      ['-v', 'error', '-show_streams', '-of', 'json', sourceRef.path]));
    const video = metadata.streams.filter(item => item.codec_type === 'video');
    const audio = metadata.streams.filter(item => item.codec_type === 'audio');
    assert.equal(video.length, 1); assert.equal(audio.length, 1);
    assert.equal(video[0].width, 1920); assert.equal(video[0].height, 1080);
    assert.equal(video[0].avg_frame_rate, '30/1'); assert.equal(video[0].start_pts, 0);
    assert.equal(audio[0].codec_name, 'aac'); assert.equal(audio[0].channels, 2);
    const sampleRate = Number(audio[0].sample_rate);
    assert([44100, 48000].includes(sampleRate)); assert.equal(sampleRate % 30, 0);
    const logicalSampleCount = range.frameCount * (sampleRate / 30);
    const startSeconds = range.startFrame / 30, durationSeconds = range.frameCount / 30;
    const commonAudio = path.join(outputDirectory, 'common-audio.m4a');
    // Accurate input seeking decodes only the interval plus its preceding GOP,
    // not all earlier video. The common AAC is encoded once, then copied twice.
    await run('common-five-second-audio', tools.ffmpegPath,
      ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-ss', String(startSeconds), '-t', String(durationSeconds),
        '-i', sourceRef.path, '-map', '0:a:0', '-vn', '-af',
        `atrim=end_sample=${logicalSampleCount},asettb=expr=1/${sampleRate},asetpts=N`,
        '-c:a', 'aac', '-b:a', '192k', '-ar', String(sampleRate), '-ac', '2', commonAudio]);
    const sharedAudio = await inspectOrchestrationEncodedAudioV001({audioPath: commonAudio,
      logicalSampleCount, sampleRate, ...tools});
    const outputs = [];
    for (const dimensions of [{width: 1920, height: 1080}, {width: 960, height: 540}]) {
      const file = path.join(outputDirectory, `capacity-${dimensions.height}p.mp4`);
      const filter = `trim=end_frame=${range.frameCount},setpts=PTS-STARTPTS`
        + (dimensions.height === 540 ? ',scale=960:540' : '');
      await run(`encode-${dimensions.height}p`, tools.ffmpegPath,
        ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-ss', String(startSeconds), '-t', String(durationSeconds),
          '-i', sourceRef.path, '-i', commonAudio, '-map', '0:v:0', '-map', '1:a:0', '-vf', filter,
          '-r', '30', '-t', String(durationSeconds), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
          '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movie_timescale', '30', '-movflags', '+faststart', file]);
      const result = await inspectOutput(file, {...dimensions, frameCount: range.frameCount, logicalSampleCount, sampleRate}, tools);
      for (const field of ['packetPayloadSha256', 'logicalDecodedPayloadSha256', 'logicalDecodedSampleCount', 'sampleRate'])
        assert.deepEqual(result.audio[field], sharedAudio[field], `output audio differs: ${field}`);
      outputs.push(result);
    }
    assert.deepEqual(await bind(sourceRef.path), sourceRef, 'protected source changed during experiment');
    assert.deepEqual(await bind(jobPath), bindings.job, 'saved job changed during experiment');
    for (const [name, executable] of [['ffmpeg', tools.ffmpegPath], ['ffprobe', tools.ffprobePath]])
      assert.deepEqual(await bind(executable), bindings[name], 'tool changed during experiment');
    const result = {schemaVersion: 'development-proxy-mp4-capacity-experiment-v001', status: 'passed',
      purpose: 'five-second resolution/capacity experiment; separate from native proxy pipeline and final quality',
      startedAt, endedAt: new Date().toISOString(), wallSeconds: (performance.now() - started) / 1000,
      sourceRef, sourceUnchanged: true, bindings, range,
      decodingScope: 'accurate input seek at 244.9 seconds; five-second interval plus preceding codec GOP; no full-video decode',
      encoding: {videoCodec: 'libx264', preset: 'fast', crf: 20, pixelFormat: 'yuv420p', fps: 30,
        audio: 'one local AAC 192k encode from selected interval; identical packet copy into both MP4 outputs', movieTimescale: 30},
      commonAudio: {mediaRef: await bind(commonAudio), capacity: await allocation(commonAudio), verification: sharedAudio},
      outputs, comparison: {logicalBytesSaved: outputs[0].capacity.logicalBytes - outputs[1].capacity.logicalBytes,
        logicalBytesReductionPercent: 100 * (1 - outputs[1].capacity.logicalBytes / outputs[0].capacity.logicalBytes),
        audioPacketsAndDecodedLogicalIntervalEqual: true, frameCountAndClockEqual: true,
        noExtrapolation: 'measured MP4 file bytes for these five seconds only; not proportional to pixel area or full movie'},
      finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated', processes};
    await save('result.json', result);
    console.log(JSON.stringify({status: result.status, result: path.join(outputDirectory, 'result.json'),
      wallSeconds: result.wallSeconds, outputs: outputs.map(item => ({...item.capacity, mediaRef: item.mediaRef})),
      comparison: result.comparison}));
  } catch (error) {
    await save('failure.json', {status: 'incomplete', startedAt, endedAt: new Date().toISOString(),
      sourceRef, bindings, range, error: error.message, stack: error.stack, processes});
    throw error;
  }
}
await main();
