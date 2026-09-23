/** Local lossless R2 head assembly. The saved 16 ms video offset and 44.1 kHz audio are distinct clocks. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ffmpeg = '/opt/homebrew/bin/ffmpeg', ffprobe = '/opt/homebrew/bin/ffprobe';
export const saveR2Json = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
export async function bindR2File(file) {
  assert(path.isAbsolute(file)); const stat = await lstat(file); assert(stat.isFile() && !stat.isSymbolicLink());
  const hash = createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk);
  return {path: file, bytes: stat.size, fileSha256: hash.digest('hex')};
}
async function check(ref) {assert.equal((await bindR2File(ref.path)).fileSha256, ref.fileSha256, 'bound R2 input changed');}
async function command(executable, args, directory, label) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {stdio: ['ignore', 'pipe', 'pipe']}); let stdout = '', stderr = '';
    child.stdout.on('data', chunk => {stdout += chunk;}); child.stderr.on('data', chunk => {stderr += chunk;});
    child.once('error', reject); child.once('close', (code, signal) => resolve({code, signal, stdout, stderr}));
  });
  await saveR2Json(path.join(directory, label + '.json'), {executable, args, ...result});
  assert.equal(result.code, 0, result.stderr); assert.equal(result.signal, null); return result.stdout;
}
async function payload(argsList) {
  const hash = createHash('sha256'); let bytes = 0;
  for (const args of argsList) await new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, {stdio: ['ignore', 'pipe', 'pipe']}); let stderr = '';
    child.stdout.on('data', chunk => {bytes += chunk.length; hash.update(chunk);});
    child.stderr.on('data', chunk => {stderr += chunk;}); child.once('error', reject);
    child.once('close', code => {if (code === 0) resolve(); else reject(new Error(stderr));});
  });
  return {bytes, sha256: hash.digest('hex')};
}
const decodeVideo = file => ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0', '-an',
  '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'];
const decodeAudio = file => ['-v', 'error', '-nostdin', '-i', file, '-map', '0:a:0', '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le', '-'];

export async function buildR2OpeningBackgroundV001({extension, sourceRef, sourceInspectionRef, originalBaseRef,
  originalCompletedRef, oldEndFrame, outputDirectory}) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  assert(Number.isSafeInteger(oldEndFrame) && oldEndFrame > 0 && oldEndFrame <= extension.oldCompletedFrameCount);
  for (const ref of [sourceRef, sourceInspectionRef, originalBaseRef, originalCompletedRef]) await check(ref);
  const inspection = JSON.parse(await readFile(sourceInspectionRef.path, 'utf8')), m = inspection.media;
  assert.equal(inspection.sourceVideoBinding.fileSha256, sourceRef.fileSha256);
  assert.equal(m.fps, 60); assert.equal(m.audioClock.sampleRate, 44100); assert.equal(m.audioClock.channels, 2);
  assert.equal(m.audioClock.spans.length, 0, 'this local extraction must not cross missing source audio');
  assert.equal(m.audioClock.decodedTailPaddingSampleCount, 0);
  assert.equal(extension.sourceAudioRange.sampleRate, 44100); assert.equal(extension.sourceAudioRange.channels, 2);
  const canvas = {width: m.source.video.width, height: m.source.video.height, fps: 30};
  const fps = 30, sampleRate = 44100, samplesPerFrame = sampleRate / fps;
  const added = extension.addedFrameCount, expectedFrames = oldEndFrame + added;
  await mkdir(outputDirectory);
  const selected = extension.sourcePtsRange, ticks = Number(selected.timeBase.split('/')[1]);
  const seek = Math.max(0, Math.floor(selected.startPts / ticks) - 1);
  const duration = Math.ceil(selected.endPtsExclusive / ticks) - seek + 1;
  const prefixVideo = path.join(outputDirectory, 'prefix-video.nut'), bodyVideo = path.join(outputDirectory, 'body-video.nut');
  const select = `select='gte(pts,${selected.startPts})*lt(pts,${selected.endPtsExclusive})*not(mod(pts-${m.source.video.firstPts},${m.source.video.ptsStep * 2}))'`;
  const sourceFrames = JSON.parse(await command(ffprobe, ['-v', 'error', '-select_streams', 'v:0',
    '-read_intervals', seek + '%' + (seek + duration), '-show_frames', '-show_entries', 'frame=pts', '-of', 'json', sourceRef.path],
  outputDirectory, 'prefix-source-pts'));
  assert.deepEqual(sourceFrames.frames.map(row => row.pts).filter(pts => selected.startPts <= pts && pts < selected.endPtsExclusive),
    Array.from({length: added * 2}, (_, i) => selected.startPts + i * m.source.video.ptsStep));
  await command(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-copyts', '-ss', String(seek), '-t', String(duration), '-i', sourceRef.path,
    '-map', '0:v:0', '-an', '-vf', select + ',setpts=N/(30*TB),fps=30,setpts=N/(30*TB)', '-frames:v', String(added),
    '-fps_mode', 'passthrough', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-f', 'nut', prefixVideo],
  outputDirectory, 'prefix-video-command');
  await command(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-i', originalBaseRef.path, '-map', '0:v:0', '-an',
    '-vf', `trim=end_frame=${oldEndFrame},setpts=N/(30*TB)`, '-frames:v', String(oldEndFrame),
    '-fps_mode', 'passthrough', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-f', 'nut', bodyVideo],
  outputDirectory, 'body-video-command');
  const prefixPcm = path.join(outputDirectory, 'prefix.f32le'), bodyPcm = path.join(outputDirectory, 'body.f32le');
  const interval = extension.sourceAudioRange;
  await command(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-copyts', '-ss', String(seek), '-t', String(duration), '-i', sourceRef.path,
    '-map', '0:a:0', '-vn', '-af', `atrim=start_pts=${interval.startSample}:end_pts=${interval.endSampleExclusive},asetpts=PTS-STARTPTS`,
    '-c:a', 'pcm_f32le', '-f', 'f32le', prefixPcm], outputDirectory, 'prefix-pcm-command');
  const bodyAudioArgs = ['-v', 'error', '-nostdin', '-i', originalBaseRef.path, '-map', '0:a:0', '-vn',
    '-af', `atrim=end_sample=${oldEndFrame * samplesPerFrame},asetpts=PTS-STARTPTS`, '-c:a', 'pcm_f32le', '-f', 'f32le'];
  await command(ffmpeg, [...bodyAudioArgs, '-n', bodyPcm], outputDirectory, 'body-pcm-command');
  const [prefixBytes, bodyBytes] = await Promise.all([readFile(prefixPcm), readFile(bodyPcm)]);
  assert.equal(prefixBytes.length, interval.sampleCount * 8); assert.equal(bodyBytes.length, oldEndFrame * samplesPerFrame * 8);
  const pcmPath = path.join(outputDirectory, 'joined.f32le'), joinedPath = path.join(outputDirectory, 'joined.nut');
  await writeFile(pcmPath, Buffer.concat([prefixBytes, bodyBytes]), {flag: 'wx'});
  await command(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-filter_complex_threads', '1', '-i', prefixVideo, '-i', bodyVideo,
    '-f', 'f32le', '-ar', String(sampleRate), '-ac', '2', '-i', pcmPath,
    '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0,setpts=N/(30*TB)[v]', '-map', '[v]', '-map', '2:a:0',
    '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-c:a', 'copy', '-f', 'nut', joinedPath],
  outputDirectory, 'join-command');
  const sourceVideoArgs = ['-v', 'error', '-nostdin', '-copyts', '-ss', String(Math.max(0, seek - 1)), '-i', sourceRef.path,
    '-map', '0:v:0', '-an', '-vf', select, '-frames:v', String(added), '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'];
  const oldVideoArgs = ['-v', 'error', '-nostdin', '-i', originalBaseRef.path, '-map', '0:v:0', '-an',
    '-frames:v', String(oldEndFrame), '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'];
  // The independent audio reference decodes from source zero, then trims absolute PTS.
  const sourceAudioArgs = ['-v', 'error', '-nostdin', '-copyts', '-t', String(Math.ceil(interval.endSampleExclusive / sampleRate) + 1),
    '-i', sourceRef.path, '-map', '0:a:0', '-vn', '-af', `atrim=start_pts=${interval.startSample}:end_pts=${interval.endSampleExclusive}`,
    '-c:a', 'pcm_f32le', '-f', 'f32le', '-'];
  const [expectedVideo, actualVideo, expectedAudio, actualAudio] = await Promise.all([
    payload([sourceVideoArgs, oldVideoArgs]), payload([decodeVideo(joinedPath)]),
    payload([sourceAudioArgs, [...bodyAudioArgs, '-']]), payload([decodeAudio(joinedPath)]),
  ]);
  assert.deepEqual(actualVideo, expectedVideo, 'every added source frame and unchanged old-body frame must match');
  assert.deepEqual(actualAudio, expectedAudio, 'every source-prefix and old-body audio sample must match');
  assert.equal(actualVideo.bytes, expectedFrames * canvas.width * canvas.height * 3 / 2);
  assert.equal(actualAudio.bytes, expectedFrames * samplesPerFrame * 8);
  const completedPcm = path.join(outputDirectory, 'old-completed-head.f32le');
  await command(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-i', originalCompletedRef.path, '-map', '0:a:0', '-vn',
    '-af', `atrim=end_sample=${oldEndFrame * samplesPerFrame}`, '-c:a', 'pcm_f32le', '-f', 'f32le', completedPcm],
  outputDirectory, 'old-completed-head-command');
  const completedBytes = await readFile(completedPcm);
  assert.equal(completedBytes.length, oldEndFrame * samplesPerFrame * 8);
  const metrics = bytes => {
    let squared = 0, peak = 0, zero = 0;
    for (let i = 0; i < bytes.length; i += 4) {const value = bytes.readFloatLE(i);
      squared += value * value; peak = Math.max(peak, Math.abs(value)); if (value === 0) zero++;}
    return {sampleFrames: bytes.length / 8, channels: 2, rootMeanSquare: Math.sqrt(squared / (bytes.length / 4)),
      peakAbsolute: peak, exactZeroChannelSamples: zero, semanticListening: false};
  };
  const proof = {status: 'passed', expectedFrameCount: expectedFrames, canvas, extension,
    sourceRef, sourceInspectionRef, originalBaseRef, originalCompletedRef,
    joinedRef: await bindR2File(joinedPath), pcmRef: await bindR2File(pcmPath),
    pieces: [{kind: 'source-prefix', oldDigestRange: null, range: {startFrame: 0, endFrameExclusive: added},
      videoRef: await bindR2File(prefixVideo), audioRef: await bindR2File(prefixPcm)},
    {kind: 'old-body', oldDigestRange: {startFrame: 0, endFrameExclusive: oldEndFrame},
      range: {startFrame: added, endFrameExclusive: expectedFrames}, videoRef: await bindR2File(bodyVideo), audioRef: await bindR2File(bodyPcm)}],
    video: {expected: expectedVideo, actual: actualVideo, sourceVideoArgs, oldVideoArgs},
    audio: {sampleRate, channels: 2, sampleCount: expectedFrames * samplesPerFrame,
      expected: expectedAudio, actual: actualAudio, sourceAudioArgs, oldAudioArgs: [...bodyAudioArgs, '-']},
    completedHead: {ref: await bindR2File(completedPcm), metrics: metrics(completedBytes)},
    addedAudio: {metrics: metrics(prefixBytes)},
    scope: 'source PTS and every normalized YUV420p/float32 PCM byte; no new semantic video analysis or listening'};
  for (const ref of [sourceRef, sourceInspectionRef, originalBaseRef, originalCompletedRef]) await check(ref);
  await saveR2Json(path.join(outputDirectory, 'proof.json'), proof);
  return {...proof, proofRef: await bindR2File(path.join(outputDirectory, 'proof.json'))};
}
