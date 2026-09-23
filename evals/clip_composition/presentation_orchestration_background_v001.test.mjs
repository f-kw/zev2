import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile, access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {createOrchestrationProjectionV001} from './presentation_orchestration_projection_v001.mjs';
import {buildConnectionExpressionTimelineFiltersV001} from './connection_expression_v001.mjs';
import {buildOrchestrationBackgroundV001, verifyOrchestrationBackgroundV001,
  finalizeOrchestrationBackgroundAudioV001} from './presentation_orchestration_background_v001.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const data = value => Buffer.from(JSON.stringify(value) + '\n');
const ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe';
const ffmpeg = args => execFileSync(ffmpegPath, ['-v', 'error', '-nostdin', '-n', ...args], {stdio: ['ignore', 'pipe', 'pipe']});
const fixtures = new Map();
async function fixture(sampleRate = 44100) {
  if (!fixtures.has(sampleRate)) fixtures.set(sampleRate, (async () => {
    const root = await mkdtemp('/private/tmp/zev-orchestration-background-test-');
    execFileSync('git', ['init', '-q', root]);
    await writeFile(path.join(root, '.gitignore'), '/generated/\n');
    const source = path.join(root, 'source.mp4');
    // AAC source intentionally includes decoder tail padding. All checks compare
    // the effective presentation PCM, not the original sine before source encoding.
    ffmpeg(['-f', 'lavfi', '-i', 'testsrc2=size=64x48:rate=30:duration=2.4',
      '-f', 'lavfi', '-i', `sine=frequency=997:sample_rate=${sampleRate}:duration=2.4`,
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
      '-c:a', 'aac', '-b:a', '128k', '-ar', String(sampleRate), '-ac', '2', '-movie_timescale', '30', source]);
    const mediaRef = {path: source, fileSha256: hash(await readFile(source))};
    const segments = Array.from({length: 4}, (_, index) => ({segmentId: 'segment-' + (index + 1),
      outputStartFrame: index * 18, outputEndFrame: (index + 1) * 18,
      sourceStartFrame30: 1000 * index, sourceEndFrame30: 1000 * index + 18}));
    const plan = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas: {width: 64, height: 48, fps: 30},
      elements: segments.map((segment, index) => ({instructionId: 'caption-' + (index + 1),
        text: '字幕は背景へ焼かない', startFrame: segment.outputStartFrame, endFrameExclusive: segment.outputEndFrame}))};
    const timeline = {schemaVersion: 'presentation-base-media-timeline-v003',
      baseMedia: {frameRate: '30/1', expectedFrameCount: 72, fileSha256: mediaRef.fileSha256}, segments};
    const planBytes = data(plan), timelineBytes = data(timeline);
    const planRef = {path: path.join(root, 'normal.json'), fileSha256: hash(planBytes)};
    const timelineRef = {path: path.join(root, 'timeline.json'), fileSha256: hash(timelineBytes)};
    await writeFile(planRef.path, planBytes); await writeFile(timelineRef.path, timelineBytes);
    const state = {digestRef: {version: 'synthetic-background-v001', sha256: mediaRef.fileSha256},
      planRef, timelineRef, mediaRef, planBytes, timelineBytes, playbackSampleRate: sampleRate,
      observationSampleRate: 16000, connections: ['normal-cut', 'black-separator', 'soft-separator'].map((preset, index) => ({
        connectionId: 'connection-' + String(index + 1).padStart(2, '0'), preset, presetVersion: 'v001'}))};
    const projection = createOrchestrationProjectionV001(state);
    const outputDirectory = path.join(root, 'generated', 'baseline');
    const input = {repositoryRoot: root, outputDirectory, projection, expectedProjectionSha256: projection.projectionSha256,
      ffmpegPath, ffprobePath};
    const proof = await buildOrchestrationBackgroundV001(input);
    return {root, source, state, projection, input, proof};
  })());
  return fixtures.get(sampleRate);
}
const verifyArgs = f => ({projection: f.projection, expectedProjectionSha256: f.projection.projectionSha256,
  sourceMediaPath: f.source, ffmpegPath, ffprobePath});

test('44.1kHz background verifies every YUV byte, every retained PCM sample and exact inserted zeros', async () => {
  const f = await fixture();
  assert.equal(f.proof.status, 'passed');
  assert.equal(f.proof.sourceFrameCount, 72); assert.equal(f.proof.displayFrameCount, 96);
  assert.equal(f.proof.verification.video.comparedYuvBytes, 96 * 64 * 48 * 3 / 2);
  assert.equal(f.proof.verification.video.blackFrames, 24); assert.equal(f.proof.verification.video.fadedFrames, 12);
  assert.equal(f.proof.verification.video.expectedPayloadSha256, f.proof.verification.video.observedPayloadSha256);
  assert.equal(f.proof.verification.audio.sourceLogicalSampleCount, 72 * 1470);
  assert.equal(f.proof.verification.audio.displaySampleCount, 96 * 1470);
  assert.equal(f.proof.verification.audio.insertedZeroSampleCount, 2 * 17640);
  assert(f.proof.verification.audio.sourceDecoderTailSampleCount > 0);
  assert.equal(f.proof.verification.audio.expectedPayloadSha256, f.proof.verification.audio.observedPayloadSha256);
  assert.equal(f.proof.sourceMediaShaUnchanged, true);
  assert.equal(hash(await readFile(f.proof.proofRef.path)), f.proof.proofRef.fileSha256);
});

test('AAC sidecar has zero presentation origin, exact logical duration and preserved MP4 priming', async () => {
  const f = await fixture(), audio = f.proof.encodedAudio;
  assert.equal(audio.sampleRate, 44100); assert.equal(audio.presentationStartSample, 0);
  assert.equal(audio.presentationEndSampleExclusive, 96 * 1470);
  assert.equal(audio.firstPacket.pts, -audio.primingSkipSamples);
  assert.equal(audio.primingSkipSamples, 1024);
  assert.equal(audio.firstDecodedFrame.pts, 0);
  assert.deepEqual(audio.logicalDecodedInterval, {startSample: 0, endSampleExclusive: 96 * 1470});
  assert.equal(audio.lastPacket.pts + audio.lastPacket.duration, 96 * 1470);
  assert.equal(audio.logicalDecodedSampleCount, 96 * 1470);
  assert(audio.rawDecodedSampleCount >= audio.logicalDecodedSampleCount);
  assert.equal(audio.encodeInputPcmPayloadSha256, f.proof.verification.audio.observedPayloadSha256);
  assert.equal(audio.encodeInputTimestampRule.filter, 'asettb=expr=1/44100,asetpts=N');
  assert.match(f.proof.rejectedContainerProbe.observed, /0\.023226/);
  assert.match(f.proof.outputs.audio.path, /audio\.m4a$/);
});

test('48kHz physical regression retains 19200 zero samples per 12-frame insertion', async () => {
  const f = await fixture(48000);
  assert.equal(f.proof.verification.audio.sourceLogicalSampleCount, 72 * 1600);
  assert.equal(f.proof.verification.audio.displaySampleCount, 96 * 1600);
  assert.equal(f.proof.verification.audio.insertedZeroSampleCount, 2 * 19200);
  assert.equal(f.proof.encodedAudio.presentationEndSampleExclusive, 96 * 1600);
});

test('independent verification rejects an actual one-frame delay of all Soft states', async () => {
  const f = await fixture(), target = path.join(f.root, 'generated', 'fault-delayed-soft.nut');
  const graph = buildConnectionExpressionTimelineFiltersV001({presentationTimeline: f.projection.presentationTimeline,
    canvas: {width: 64, height: 48, fps: 30}, audio: {sampleRate: 44100, channelLayout: 'stereo'}, softWindows: f.projection.softWindows})
    .map(line => line.replace(/eq\(n,(\d+)\)/g, (_, frame) => `eq(n,${Number(frame) + 1})`));
  ffmpeg(['-filter_complex_threads', '1', '-i', f.proof.outputs.logicalBase.path, '-filter_complex', graph.join(';'),
    '-map', '[timelineVideo]', '-map', '[timelineAudio]', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p',
    '-fps_mode', 'passthrough', '-c:a', 'pcm_f32le', '-f', 'nut', target]);
  await assert.rejects(verifyOrchestrationBackgroundV001({...verifyArgs(f), losslessPath: target}), /YUV frame/);
});

test('independent verification rejects altered retained PCM after all video pixels still pass', async () => {
  const f = await fixture(), target = path.join(f.root, 'generated', 'fault-muted-pcm.nut');
  ffmpeg(['-i', f.proof.outputs.background.path, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
    '-af', 'volume=0', '-c:a', 'pcm_f32le', '-f', 'nut', target]);
  await assert.rejects(verifyOrchestrationBackgroundV001({...verifyArgs(f), losslessPath: target}), /PCM at sample/);
});

test('output gate refuses reused or visible directories before writing, and stale projection before mkdir', async () => {
  const f = await fixture();
  await assert.rejects(buildOrchestrationBackgroundV001(f.input), /unused run directory/);
  const visible = path.join(f.root, 'not-ignored-output');
  await assert.rejects(buildOrchestrationBackgroundV001({...f.input, outputDirectory: visible}), /ignore rule/);
  await assert.rejects(access(visible), /ENOENT/);
  const stale = path.join(f.root, 'generated', 'stale');
  await assert.rejects(buildOrchestrationBackgroundV001({...f.input, outputDirectory: stale, expectedProjectionSha256: '0'.repeat(64)}), /stale/);
  await assert.rejects(access(stale), /ENOENT/);
});

test('normal-only path adds no frames, makes no zero samples and still emits separately timed AAC', async () => {
  const f = await fixture(), projection = createOrchestrationProjectionV001({...f.state,
    connections: f.state.connections.map(row => ({...row, preset: 'normal-cut'}))});
  const proof = await buildOrchestrationBackgroundV001({...f.input,
    outputDirectory: path.join(f.root, 'generated', 'normal-only'), projection,
    expectedProjectionSha256: projection.projectionSha256});
  assert.equal(proof.verification.video.displayFrames, 72);
  assert.equal(proof.verification.video.blackFrames, 0); assert.equal(proof.verification.video.fadedFrames, 0);
  assert.equal(proof.verification.video.originalDecodedPayloadSha256, proof.verification.video.observedPayloadSha256);
  assert.equal(proof.verification.audio.insertedZeroSampleCount, 0);
  assert.equal(proof.verification.audio.sourceLogicalPayloadSha256, proof.verification.audio.observedPayloadSha256);
  assert.equal(proof.encodedAudio.presentationEndSampleExclusive, 72 * 1470);
});

test('audio-only finalization rebinds a passed immutable lossless proof and preserves all earlier files', async () => {
  const f = await fixture();
  const verificationPath = path.join(f.input.outputDirectory, 'lossless-verification.json');
  const verificationBytes = await readFile(verificationPath), originalBackground = await readFile(f.proof.outputs.background.path);
  const originalAudio = await readFile(f.proof.outputs.audio.path);
  const args = {...f.input, outputDirectory: path.join(f.root, 'generated', 'audio-only'),
    losslessVerificationRef: {path: verificationPath, fileSha256: hash(verificationBytes)}};
  const completed = await finalizeOrchestrationBackgroundAudioV001(args);
  assert.deepEqual(completed.outputs.background, f.proof.outputs.background);
  assert.equal(completed.encodedAudio.presentationEndSampleExclusive, 96 * 1470);
  assert.equal(completed.encodedAudio.packetPayloadSha256, f.proof.encodedAudio.packetPayloadSha256);
  assert.deepEqual(await readFile(verificationPath), verificationBytes);
  assert.deepEqual(await readFile(f.proof.outputs.background.path), originalBackground);
  assert.deepEqual(await readFile(f.proof.outputs.audio.path), originalAudio);
  await assert.rejects(finalizeOrchestrationBackgroundAudioV001({...args,
    outputDirectory: path.join(f.root, 'generated', 'wrong-verification-sha'),
    losslessVerificationRef: {...args.losslessVerificationRef, fileSha256: '0'.repeat(64)}}), /verification SHA differs/);
});
