import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, {after, before} from 'node:test';

import {
  inspectPresentationBaseMediaSourceV002,
  validatePresentationBaseMediaSegmentPlanV002,
} from './presentation_base_media_build_v003.mjs';
import {
  frameBoundaryWithVideoOffsetV001,
  sourceEndFrameBoundaryWithVideoOffsetV001,
  videoPresentationOffsetMsV001,
} from './presentation_base_media_timeline_v004.mjs';

let runtimeRoot;

before(async () => {
  runtimeRoot = await mkdtemp(path.join(os.tmpdir(), 'presentation-base-media-clock-v001-'));
});

after(async () => {
  await rm(runtimeRoot, {recursive: true, force: true});
});

const run = (command, args) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {env: {...process.env, TMPDIR: '/private/tmp'}});
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => resolve({
    code,
    stdout: Buffer.concat(stdout).toString('utf8'),
    stderr: Buffer.concat(stderr).toString('utf8'),
  }));
});

const createClockFixture = async ({name, videoOffsetSeconds = 0, audioInputs = 1}) => {
  const output = path.join(runtimeRoot, `${name}.mp4`);
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...(videoOffsetSeconds === 0 ? [] : ['-itsoffset', String(videoOffsetSeconds)]),
    '-f', 'lavfi', '-i', 'color=c=red:s=1920x1080:r=60:d=0.2',
  ];
  for (let index = 0; index < audioInputs; index += 1) {
    args.push(
      '-f', 'lavfi', '-i',
      `sine=frequency=${880 + index * 220}:sample_rate=48000:duration=0.2`,
    );
  }
  args.push('-map', '0:v:0');
  for (let index = 0; index < audioInputs; index += 1) args.push('-map', `${index + 1}:a:0`);
  args.push(
    '-c:v', 'libx264', '-bf', '0', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', '48000', '-ac', '1',
    '-video_track_timescale', '90000', '-avoid_negative_ts', 'disabled',
    '-map_metadata', '-1', output,
  );
  const result = await run('ffmpeg', args);
  assert.equal(result.code, 0, result.stderr);
  assert.ok((await readFile(output)).length > 0);
  return output;
};

test('0msと16msの実測video clockを整数tickから決定する', () => {
  assert.equal(videoPresentationOffsetMsV001({
    firstPts: 0,
    timeBase: '1/90000',
    containerStartTimeMs: 0,
  }), 0);
  assert.equal(videoPresentationOffsetMsV001({
    firstPts: 1440,
    timeBase: '1/90000',
    containerStartTimeMs: 0,
  }), 16);
  assert.equal(videoPresentationOffsetMsV001({
    firstPts: -1,
    timeBase: '1/90000',
    containerStartTimeMs: 0,
  }), null);
  assert.equal(videoPresentationOffsetMsV001({
    firstPts: 1,
    timeBase: '1/90000',
    containerStartTimeMs: 0,
  }), null);
});

test('frame mappingはcontainer時刻からvideo offsetだけを差し引く', () => {
  assert.equal(frameBoundaryWithVideoOffsetV001(255324, 0), 7660);
  assert.equal(frameBoundaryWithVideoOffsetV001(255324, 16), 7659);
  assert.equal(sourceEndFrameBoundaryWithVideoOffsetV001(255324, {
    inputFrameRate: '60/1',
    decodedFrameCount: 400000,
    videoPresentationOffsetMs: 16,
  }), 7659);
});

test('offset=0msの既存型sourceを受理する', async () => {
  const source = await createClockFixture({name: 'offset-0'});
  const inspection = await inspectPresentationBaseMediaSourceV002(source);
  assert.equal(inspection.source.video.firstPts, 0);
  assert.equal(inspection.source.video.presentationOffsetMs, 0);
  assert.equal(inspection.source.video.timeBase, '1/90000');
  const validation = validatePresentationBaseMediaSegmentPlanV002(
    [{sourceStartMs: 0, sourceEndMs: 100}],
    {
      fps: inspection.fps,
      decodedFrameCount: inspection.decodedFrameCount,
      logicalFrameCount: inspection.logicalFrameCount,
      presentationOffsetMs: inspection.videoClock.presentationOffsetMs,
    },
    inspection.audioClock,
  );
  assert.equal(validation.status, 'passed');
  assert.equal(validation.mappings[0].sourceStartFrame30, 0);
  assert.equal(validation.mappings[0].audioSamples.sourceStart, 0);
});

test('offset=16msを元PTSのまま受理しvideo/audio対応へ反映する', async () => {
  const source = await createClockFixture({name: 'offset-16', videoOffsetSeconds: 0.016});
  const inspection = await inspectPresentationBaseMediaSourceV002(source);
  assert.deepEqual(
    {
      firstPts: inspection.source.video.firstPts,
      timeBase: inspection.source.video.timeBase,
      ptsStep: inspection.source.video.ptsStep,
      containerStartTimeMs: inspection.source.video.containerStartTimeMs,
      presentationOffsetMs: inspection.source.video.presentationOffsetMs,
    },
    {
      firstPts: 1440,
      timeBase: '1/90000',
      ptsStep: 1500,
      containerStartTimeMs: 0,
      presentationOffsetMs: 16,
    },
  );
  const validation = validatePresentationBaseMediaSegmentPlanV002(
    [{sourceStartMs: 100, sourceEndMs: 150}],
    {
      fps: inspection.fps,
      decodedFrameCount: inspection.decodedFrameCount,
      logicalFrameCount: inspection.logicalFrameCount,
      presentationOffsetMs: inspection.videoClock.presentationOffsetMs,
    },
    inspection.audioClock,
  );
  assert.equal(validation.status, 'passed');
  assert.equal(validation.mappings[0].sourceStartFrame30, 3);
  assert.equal(validation.mappings[0].audioSamples.sourceStart, 5568);
  assert.equal(validation.mappings[0].audioSamples.sourceStart / 48000, 0.116);
});

test('stream構成変更をfail-closedで拒否する', async () => {
  const source = await createClockFixture({name: 'two-audio-streams', audioInputs: 2});
  await assert.rejects(
    inspectPresentationBaseMediaSourceV002(source),
    /BASE_MEDIA_FORMAT_UNSUPPORTED/,
  );
});
