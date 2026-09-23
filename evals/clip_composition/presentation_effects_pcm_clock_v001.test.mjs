import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {buildConnectionExpressionTimelineFiltersV001} from './connection_expression_v001.mjs';

const execute = promisify(execFile), ffmpeg = '/opt/homebrew/bin/ffmpeg', ffprobe = '/opt/homebrew/bin/ffprobe';
const canvas = {width: 64, height: 48, fps: 30};
const sampleRate = 44100, channels = 2, sampleBytes = channels * 4, samplesPerFrame = sampleRate / canvas.fps;
const frameBytes = canvas.width * canvas.height * 3 / 2;
const run = async (command, args) => (await execute(command, args, {encoding: 'buffer', maxBuffer: 16 * 1024 * 1024})).stdout;
const mediaArguments = ['-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough',
  '-c:a', 'pcm_f32le', '-ar', String(sampleRate), '-ac', String(channels), '-f', 'nut'];

test('separate connection streams retain every PCM sample and YUV frame with rounded input packet timestamps', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-pcm-concat-clock-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const sourceFrames = 462, insertionFrames = 12;
  const pcm = Buffer.alloc(sourceFrames * samplesPerFrame * sampleBytes);
  for (let sample = 0; sample < sourceFrames * samplesPerFrame; sample++) {
    pcm.writeFloatLE(((sample % 251) + 1) / 256, sample * sampleBytes);
    pcm.writeFloatLE(-((sample % 241) + 1) / 256, sample * sampleBytes + 4);
  }
  const pcmPath = path.join(directory, 'source.f32le'), sourcePath = path.join(directory, 'source.nut');
  await writeFile(pcmPath, pcm);
  // This input reproduces the actual failed file: 1024-sample packets with a
  // seconds-based timestamp expression that rounds some packet PTS down by one.
  await run(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-f', 'lavfi', '-i', 'testsrc2=s=64x48:r=30',
    '-f', 'f32le', '-ar', String(sampleRate), '-ac', String(channels), '-i', pcmPath,
    '-filter_complex', `[0:v]trim=end_frame=${sourceFrames},setpts=N/(30*TB)[v];`
      + '[1:a]asetnsamples=n=1024:p=0,asetpts=N/SR/TB[a]',
    '-map', '[v]', '-map', '[a]', ...mediaArguments, sourcePath]);
  const packetInfo = JSON.parse((await run(ffprobe, ['-v', 'error', '-i', sourcePath, '-select_streams', 'a',
    '-show_packets', '-show_entries', 'packet=pts,duration,size', '-of', 'json'])).toString());
  let cumulativeSamples = 0, inputTimestampRoundingObserved = false;
  for (const packet of packetInfo.packets) {
    if (packet.pts === cumulativeSamples - 1) inputTimestampRoundingObserved = true;
    cumulativeSamples += Number(packet.size) / sampleBytes;
  }
  assert.equal(cumulativeSamples, sourceFrames * samplesPerFrame);
  assert.equal(inputTimestampRoundingObserved, true, 'the regression input must retain the actual timestamp defect');
  const sourceYuv = await run(ffmpeg, ['-v', 'error', '-nostdin', '-i', sourcePath, '-map', '0:v:0',
    '-an', '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', 'pipe:1']);
  assert.equal(sourceYuv.length, sourceFrames * frameBytes);
  const sourcePcm = await run(ffmpeg, ['-v', 'error', '-nostdin', '-i', sourcePath, '-map', '0:a:0',
    '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le', 'pipe:1']);
  assert.equal(sourcePcm.equals(pcm), true, 'input timestamps must not change the known source samples');
  const black = Buffer.alloc(insertionFrames * frameBytes, 128);
  for (let frame = 0; frame < insertionFrames; frame++)
    black.fill(16, frame * frameBytes, frame * frameBytes + canvas.width * canvas.height);
  for (const boundary of [1, 2, 339, 340, 341]) {
    const spans = [
      {kind: 'base', baseStartFrame: 0, baseEndFrame: boundary, startFrame: 0, endFrameExclusive: boundary},
      {kind: 'black', beforeSegmentId: 'before', afterSegmentId: 'after', startFrame: boundary,
        endFrameExclusive: boundary + insertionFrames},
      {kind: 'base', baseStartFrame: boundary, baseEndFrame: sourceFrames, startFrame: boundary + insertionFrames,
        endFrameExclusive: sourceFrames + insertionFrames},
    ];
    const graph = buildConnectionExpressionTimelineFiltersV001({presentationTimeline: {spans}, canvas,
      audio: {sampleRate, channelLayout: 'stereo'}, softWindows: []});
    const outputPath = path.join(directory, 'insert-at-' + boundary + '.nut');
    await run(ffmpeg, ['-v', 'error', '-nostdin', '-n', '-filter_complex_threads', '1', '-i', sourcePath,
      '-filter_complex', graph.join(';'), '-map', '[timelineVideo]', '-map', '[timelineAudio]', ...mediaArguments, outputPath]);
    const expectedPcm = Buffer.concat([pcm.subarray(0, boundary * samplesPerFrame * sampleBytes),
      Buffer.alloc(insertionFrames * samplesPerFrame * sampleBytes), pcm.subarray(boundary * samplesPerFrame * sampleBytes)]);
    const actualPcm = await run(ffmpeg, ['-v', 'error', '-nostdin', '-i', outputPath, '-map', '0:a:0',
      '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le', 'pipe:1']);
    assert.equal(actualPcm.length, expectedPcm.length, 'sample count at boundary ' + boundary);
    assert.equal(actualPcm.equals(expectedPcm), true, 'all PCM bytes at boundary ' + boundary);
    const expectedYuv = Buffer.concat([sourceYuv.subarray(0, boundary * frameBytes), black, sourceYuv.subarray(boundary * frameBytes)]);
    const actualYuv = await run(ffmpeg, ['-v', 'error', '-nostdin', '-i', outputPath, '-map', '0:v:0',
      '-an', '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', 'pipe:1']);
    assert.equal(actualYuv.length, expectedYuv.length, 'frame count at boundary ' + boundary);
    assert.equal(actualYuv.equals(expectedYuv), true, 'all retained and inserted YUV frames at boundary ' + boundary);
    const outputPackets = JSON.parse((await run(ffprobe, ['-v', 'error', '-i', outputPath, '-select_streams', 'a',
      '-show_packets', '-show_entries', 'packet=pts,duration,size', '-of', 'json'])).toString()).packets;
    let nextSample = 0;
    for (const packet of outputPackets) {
      assert.equal(packet.pts, nextSample, 'integer sample timestamp at boundary ' + boundary);
      nextSample += Number(packet.size) / sampleBytes;
    }
    assert.equal(nextSample, (sourceFrames + insertionFrames) * samplesPerFrame);
  }
});
