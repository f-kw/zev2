#!/usr/bin/env node
/**
 * Research-only physical audit of the existing 12-frame black prototype.
 * No transition is selected here. The caller supplies technical clock cases.
 *
 * node connection_physical_fixture_v001.mjs --manifest /absolute/input.json --output /absolute/new-directory
 * Manifest: {ffmpegPath, ffprobePath, encodeReviewMp4?: boolean, selectedCases: [{
 *   connectionId, losslessPath, frameCount, boundaryFrame, originalStartFrame,
 *   canonicalMediaPath, canonicalTimelinePath, canonicalPlanPath, canonicalSha256
 * }]}
 * Each lossless excerpt contains the canonical burned-in captions and has
 * FFV1/yuv420p video at 30fps and pcm_f32le stereo audio at 48000Hz.
 * canonicalSha256 binds canonicalMediaPath. Other input hashes are measured.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {appendFile, lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildPresentationTimelineFiltersV001,
  PRESENTATION_BLACK_FRAME_COUNT_V001,
  resolvePresentationEffectsV001,
} from './presentation_effects_v001.mjs';

const FPS = 30;
const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const SAMPLES_PER_FRAME = SAMPLE_RATE / FPS;
const SAMPLE_BYTES = 4;
const BLACK_FRAMES = PRESENTATION_BLACK_FRAME_COUNT_V001;
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value, name, min = 0) => assert(Number.isSafeInteger(value) && value >= min, `${name}: invalid integer`);
const exactKeys = (value, required, optional = []) => {
  assert(plainObject(value), 'expected an object');
  for (const key of required) assert(Object.hasOwn(value, key), `missing ${key}`);
  for (const key of Object.keys(value)) assert([...required, ...optional].includes(key), `unknown field ${key}`);
};
const absolute = (value, name) => {
  assert(typeof value === 'string' && path.isAbsolute(value), `${name}: absolute path required`);
  assert(!value.split(path.sep).some(part => /archive|退避/i.test(part)), `${name}: archive paths are outside this study`);
  return value;
};
const fileHash = async file => {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
};
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, json(value), {flag: 'wx'});
const fileBinding = async (file, name) => {
  absolute(file, name);
  const resolvedPath = await realpath(file);
  absolute(resolvedPath, name);
  const stat = await lstat(resolvedPath);
  assert(stat.isFile(), `${name}: regular file required`);
  return {path: file, resolvedPath, bytes: stat.size, sha256: await fileHash(resolvedPath)};
};

function parseArgs(argv) {
  assert.equal(argv.length, 4, 'use --manifest /absolute/file.json --output /absolute/new-directory');
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert(['--manifest', '--output'].includes(argv[index]), `unknown option ${argv[index]}`);
    assert(!Object.hasOwn(values, argv[index]), `duplicate option ${argv[index]}`);
    values[argv[index]] = absolute(argv[index + 1], argv[index]);
  }
  assert(values['--manifest'] && values['--output'], 'both options are required');
  return {manifestPath: values['--manifest'], output: values['--output']};
}

function validateTimeline(timeline, plan) {
  assert.equal(timeline.schemaVersion, 'presentation-base-media-timeline-v003');
  assert.equal(timeline.baseMedia.frameRate, '30/1');
  assert.equal(timeline.sourceFrameClock.logicalFrameRate, '30/1');
  assert.equal(timeline.sourceFrameClock.inputFrameRate, '60/1');
  assert.equal(timeline.sourceFrameClock.extractionRuleId, 'source-frame-60fps-global-even-v001');
  assert(typeof timeline.sourceRef === 'string' && timeline.sourceRef.length > 0);
  assert.equal(plan.canvas.fps, FPS);
  integer(plan.canvas.width, 'canvas width', 2);
  integer(plan.canvas.height, 'canvas height', 2);
  assert.equal(plan.canvas.width % 2, 0);
  assert.equal(plan.canvas.height % 2, 0);
  assert(Array.isArray(timeline.segments) && timeline.segments.length > 1);
  const ids = new Set();
  let previousEnd = 0;
  for (const segment of timeline.segments) {
    assert(typeof segment.segmentId === 'string' && !ids.has(segment.segmentId));
    ids.add(segment.segmentId);
    for (const key of ['sourceStartFrame30', 'sourceEndFrame30', 'outputStartFrame', 'outputEndFrame']) integer(segment[key], key);
    assert.equal(segment.outputStartFrame, previousEnd);
    assert(segment.outputEndFrame > segment.outputStartFrame);
    assert.equal(segment.sourceEndFrame30 - segment.sourceStartFrame30, segment.outputEndFrame - segment.outputStartFrame);
    previousEnd = segment.outputEndFrame;
  }
  assert.equal(previousEnd, timeline.baseMedia.expectedFrameCount);
  const captionIds = new Set();
  for (const element of plan.elements) {
    assert(typeof element.instructionId === 'string' && !captionIds.has(element.instructionId));
    captionIds.add(element.instructionId);
    integer(element.startFrame, 'caption start');
    integer(element.endFrameExclusive, 'caption end', 1);
    assert(element.endFrameExclusive > element.startFrame && element.endFrameExclusive <= previousEnd);
    assert.equal(element.displayFrameCount, element.endFrameExclusive - element.startFrame);
  }
}

function inspectCaptionClock({plan, timeline, item, beforeSegment, afterSegment}) {
  const original = JSON.stringify(plan);
  const connection = {beforeSegmentId: beforeSegment.segmentId, afterSegmentId: afterSegment.segmentId};
  const input = {plan, baseTimeline: timeline, expectedFrameCount: timeline.baseMedia.expectedFrameCount};
  // This old mixed resolver is used only to test the existing prototype's clock.
  // Its saved object is not the new production connection contract.
  const baseline = resolvePresentationEffectsV001(input);
  const black = resolvePresentationEffectsV001({...input, effects: {connections: [{...connection, transition: 'black'}]}});
  const reset = resolvePresentationEffectsV001({...input, effects: {connections: [{...connection, transition: 'normal-cut'}]}});
  assert.equal(baseline.plan, plan);
  assert.equal(reset.plan, plan);
  assert.equal(baseline.presentationTimeline, null);
  assert.equal(reset.presentationTimeline, null);
  assert.equal(reset.expectedFrameCount, input.expectedFrameCount);
  assert.equal(black.expectedFrameCount, input.expectedFrameCount + BLACK_FRAMES);
  const boundary = item.originalStartFrame + item.boundaryFrame;
  const windowEnd = item.originalStartFrame + item.frameCount;
  const checks = plan.elements.map((element, index) => {
    const changed = black.plan.elements[index];
    const shift = element.startFrame >= boundary ? BLACK_FRAMES : 0;
    assert(!(element.startFrame < boundary && element.endFrameExclusive > boundary), 'caption crosses the selected boundary');
    assert.deepEqual(changed, {...element, startFrame: element.startFrame + shift, endFrameExclusive: element.endFrameExclusive + shift});
    assert.deepEqual(reset.plan.elements[index], element);
    const intersectsExcerpt = element.endFrameExclusive > item.originalStartFrame && element.startFrame < windowEnd;
    return {captionId: element.instructionId, contentAndOtherPropertiesUnchanged: true,
      canonicalStartFrame: element.startFrame, canonicalEndFrameExclusive: element.endFrameExclusive,
      blackCanonicalStartFrame: changed.startFrame, blackCanonicalEndFrameExclusive: changed.endFrameExclusive,
      displayFrameCount: element.displayFrameCount, resetRestored: true,
      excerpt: !intersectsExcerpt ? null : {
        startFrame: Math.max(element.startFrame, item.originalStartFrame) - item.originalStartFrame,
        endFrameExclusive: Math.min(element.endFrameExclusive, windowEnd) - item.originalStartFrame,
        blackStartFrame: Math.max(element.startFrame, item.originalStartFrame) - item.originalStartFrame + shift,
        blackEndFrameExclusive: Math.min(element.endFrameExclusive, windowEnd) - item.originalStartFrame + shift,
        clippedAtWindowStart: element.startFrame < item.originalStartFrame,
        clippedAtWindowEnd: element.endFrameExclusive > windowEnd,
      }};
  });
  assert.equal(JSON.stringify(plan), original, 'canonical plan mutated');
  return {scope: 'Full canonical plan timing is checked without changing caption display lengths. Excerpt-edge clipping is observation scope only. Burned-in caption pixels are checked by complete frame hashes.',
    canonicalCaptionCount: checks.length, excerptCaptionCount: checks.filter(check => check.excerpt).length,
    fullPlanUnchangedAfterResolution: true, resetFromOriginalInput: true, checks};
}

function sourceFrameMap(timeline, canonicalFrame) {
  const segment = timeline.segments.find(value => value.outputStartFrame <= canonicalFrame && value.outputEndFrame > canonicalFrame);
  assert(segment, `unmapped canonical frame ${canonicalFrame}`);
  const logicalSourceFrame30 = segment.sourceStartFrame30 + canonicalFrame - segment.outputStartFrame;
  return {canonicalFrame, segmentId: segment.segmentId, sourceRef: timeline.sourceRef,
    logicalSourceFrame30, decodedSourceFrame60: logicalSourceFrame30 * 2};
}

function sourceMapping(timeline, item, spans) {
  const reference = Array.from({length: item.frameCount}, (_, index) => sourceFrameMap(timeline, item.originalStartFrame + index));
  const frames = [];
  for (const span of spans) {
    for (let displayFrame = span.startFrame; displayFrame < span.endFrameExclusive; displayFrame++) {
      const baseFrame = span.kind === 'base' ? span.baseStartFrame + displayFrame - span.startFrame : null;
      frames.push({displayFrame, excerptBaseFrame: baseFrame,
        source: baseFrame === null ? null : sourceFrameMap(timeline, item.originalStartFrame + baseFrame)});
    }
  }
  assert.deepEqual(frames.filter(frame => frame.source !== null).map(frame => frame.source), reference);
  assert.deepEqual(frames.map(frame => frame.displayFrame), Array.from({length: frames.length}, (_, index) => index));
  return {rule: 'excerpt frame -> canonical Digest frame -> canonical segment -> logical 30fps source frame -> globally even decoded 60fps source frame',
    scope: 'Correspondence to the canonical Digest timeline. This does not compare pixels with the original media before captions were burned in.',
    sourceClock: timeline.sourceFrameClock, retainedFrameCount: reference.length,
    sourceOrderAndMultiplicityPreserved: true, frames};
}

function ticksAtFrame(frame, stream, name) {
  integer(frame, `${name} frame`);
  const parts = stream.time_base.split('/');
  assert.equal(parts.length, 2, `${name}: invalid stream timebase`);
  const [num, den] = parts.map(BigInt);
  assert(num > 0n && den > 0n, `${name}: nonpositive stream timebase`);
  const numerator = BigInt(frame) * den;
  const divisor = BigInt(FPS) * num;
  assert.equal(numerator % divisor, 0n, `${name}: frame boundary is not an integer stream PTS`);
  return (numerator / divisor).toString();
}

function parseFrameHash(text, expectedFrames, width, height) {
  assert(/^#tb 0: 1\/30$/m.test(text), 'framehash timebase is not 1/30');
  const rows = text.split('\n').filter(line => line.trim() && !line.startsWith('#')).map(line => {
    const fields = line.split(',').map(value => value.trim());
    assert.equal(fields.length, 6, 'unexpected framehash row');
    return {stream: Number(fields[0]), dts: Number(fields[1]), pts: Number(fields[2]),
      duration: Number(fields[3]), bytes: Number(fields[4]), sha256: fields[5]};
  });
  assert.equal(rows.length, expectedFrames, 'decoded video frame count mismatch');
  for (const [index, row] of rows.entries()) {
    assert.equal(row.stream, 0); assert.equal(row.dts, index); assert.equal(row.pts, index);
    assert.equal(row.duration, 1); assert.equal(row.bytes, width * height * 3 / 2);
    assert(/^[a-f0-9]{64}$/.test(row.sha256));
  }
  return rows;
}

function waveformAt(pcm, seamSamplePerChannel) {
  const total = pcm.length / (CHANNELS * SAMPLE_BYTES);
  assert(seamSamplePerChannel > 0 && seamSamplePerChannel < total);
  const sample = (index, channel) => pcm.readFloatLE((index * CHANNELS + channel) * SAMPLE_BYTES);
  const window = (start, end, channel) => {
    let peakAbsolute = 0, maximumAdjacentDelta = 0;
    for (let index = start; index < end; index++) {
      const value = sample(index, channel);
      assert(Number.isFinite(value), 'nonfinite PCM sample');
      peakAbsolute = Math.max(peakAbsolute, Math.abs(value));
      if (index > start) maximumAdjacentDelta = Math.max(maximumAdjacentDelta, Math.abs(value - sample(index - 1, channel)));
    }
    return {startSamplePerChannel: start, endSamplePerChannelExclusive: end, peakAbsolute, maximumAdjacentDelta};
  };
  return {seamSamplePerChannel, observationWindowFramesEachSide: 1,
    audibleClickVerdict: 'not-assessed; numerical differences do not establish audibility',
    channels: Array.from({length: CHANNELS}, (_, channel) => {
      const left = sample(seamSamplePerChannel - 1, channel), right = sample(seamSamplePerChannel, channel);
      return {channel, leftEndpoint: left, rightEndpoint: right, signedEndpointDelta: right - left,
        absoluteEndpointDelta: Math.abs(right - left),
        before: window(Math.max(0, seamSamplePerChannel - SAMPLES_PER_FRAME), seamSamplePerChannel, channel),
        after: window(seamSamplePerChannel, Math.min(total, seamSamplePerChannel + SAMPLES_PER_FRAME), channel)};
    })};
}

function pcmPacketClock(probe, packets, expectedSamples) {
  const stream = probe.streams.find(value => value.codec_type === 'audio');
  const [num, den] = stream.time_base.split('/').map(BigInt);
  const asSamples = value => {
    const numerator = BigInt(value) * num * BigInt(SAMPLE_RATE);
    assert.equal(numerator % den, 0n, 'audio packet clock is not on the sample grid');
    return Number(numerator / den);
  };
  let end = 0;
  for (const packet of packets.packets) {
    assert.equal(asSamples(packet.pts), end, 'audio packet gap or overlap');
    const duration = asSamples(packet.duration);
    assert(duration > 0, 'audio packet has no positive duration');
    end += duration;
  }
  assert.equal(end, expectedSamples, 'audio packet sample clock differs from decoded samples');
  return {packetCount: packets.packets.length, firstSample: 0, endSampleExclusive: end, gapOrOverlap: false};
}

function decodedVideoClock(probe, frames, expectedFrames) {
  const stream = probe.streams.find(value => value.codec_type === 'video');
  const [num, den] = stream.time_base.split('/').map(BigInt);
  assert.equal(frames.frames.length, expectedFrames);
  for (const [index, frame] of frames.frames.entries()) {
    assert.equal(BigInt(frame.pts) * num * BigInt(FPS), BigInt(index) * den,
      'decoded video PTS differs from exact frame grid');
    const duration = frame.duration ?? frame.pkt_duration;
    assert(duration !== undefined, 'decoded video frame duration is missing');
    assert.equal(BigInt(duration) * num * BigInt(FPS), den, 'decoded frame duration differs from one frame');
  }
  return {frameCount: expectedFrames, timeBase: stream.time_base, firstFrame: 0,
    endFrameExclusive: expectedFrames, gapOrOverlap: false, measuredBeforeTimestampRescaling: true};
}

export async function runConnectionPhysicalFixtureV001({manifestPath, output}) {
  absolute(manifestPath, 'manifest'); absolute(output, 'output');
  const manifest = await readJson(manifestPath);
  exactKeys(manifest, ['ffmpegPath', 'ffprobePath', 'selectedCases'], ['encodeReviewMp4']);
  if (manifest.encodeReviewMp4 !== undefined) assert.equal(typeof manifest.encodeReviewMp4, 'boolean');
  assert(Array.isArray(manifest.selectedCases) && manifest.selectedCases.length >= 2 && manifest.selectedCases.length <= 4,
    'the study requires two to four caller-selected technical boundaries');
  assert.equal(BLACK_FRAMES, 12, 'prototype changed; re-review the fixture');
  const bindings = new Map();
  const bind = async (file, name) => {
    if (!bindings.has(file)) bindings.set(file, await fileBinding(file, name));
    return bindings.get(file);
  };
  await bind(manifestPath, 'manifest');
  const ffmpeg = await bind(manifest.ffmpegPath, 'ffmpeg');
  const ffprobe = await bind(manifest.ffprobePath, 'ffprobe');
  await bind(fileURLToPath(import.meta.url), 'fixture runner');
  await bind(fileURLToPath(new URL('./presentation_effects_v001.mjs', import.meta.url)), 'prototype');
  const ids = new Set();
  const cases = [];
  for (const item of manifest.selectedCases) {
    exactKeys(item, ['connectionId', 'losslessPath', 'frameCount', 'boundaryFrame', 'originalStartFrame',
      'canonicalMediaPath', 'canonicalTimelinePath', 'canonicalPlanPath', 'canonicalSha256']);
    assert(typeof item.connectionId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.connectionId));
    assert(!ids.has(item.connectionId), 'duplicate connection ID'); ids.add(item.connectionId);
    integer(item.frameCount, 'frame count', 2); integer(item.boundaryFrame, 'boundary frame', 1);
    integer(item.originalStartFrame, 'original start'); assert(item.boundaryFrame < item.frameCount);
    assert(/^[a-f0-9]{64}$/.test(item.canonicalSha256));
    await bind(item.losslessPath, 'lossless excerpt');
    const canonical = await bind(item.canonicalMediaPath, 'canonical media');
    assert.equal(canonical.sha256, item.canonicalSha256, 'canonical media SHA mismatch');
    await bind(item.canonicalTimelinePath, 'canonical timeline');
    await bind(item.canonicalPlanPath, 'canonical plan');
    const timeline = await readJson(item.canonicalTimelinePath), plan = await readJson(item.canonicalPlanPath);
    validateTimeline(timeline, plan);
    assert(item.originalStartFrame + item.frameCount <= timeline.baseMedia.expectedFrameCount);
    const beforeIndex = timeline.segments.findIndex(segment => segment.outputEndFrame === item.originalStartFrame + item.boundaryFrame);
    assert(beforeIndex >= 0 && beforeIndex + 1 < timeline.segments.length, 'boundary is not a canonical connection');
    const beforeSegment = timeline.segments[beforeIndex], afterSegment = timeline.segments[beforeIndex + 1];
    assert(item.originalStartFrame >= beforeSegment.outputStartFrame, 'excerpt begins before the adjacent preceding segment');
    assert(item.originalStartFrame + item.frameCount <= afterSegment.outputEndFrame, 'excerpt ends after the adjacent following segment');
    const captionClock = inspectCaptionClock({plan, timeline, item, beforeSegment, afterSegment});
    cases.push({item, timeline, plan, beforeSegment, afterSegment, captionClock});
  }
  // mkdir without recursive acquisition rejects any existing output directory.
  absolute(await realpath(path.dirname(output)), 'output parent');
  await mkdir(output);
  const commandLog = path.join(output, 'commands.jsonl');
  await writeFile(commandLog, '', {flag: 'wx'});
  let commandNumber = 0;
  const run = async (command, args) => {
    const number = ++commandNumber;
    await appendFile(commandLog, JSON.stringify({number, event: 'start', command, args}) + '\n');
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
      const stdout = [], stderr = [];
      child.stdout.on('data', data => stdout.push(data)); child.stderr.on('data', data => stderr.push(data));
      child.once('error', reject);
      child.once('close', (code, signal) => {
        const errorText = Buffer.concat(stderr).toString('utf8');
        appendFile(commandLog, JSON.stringify({number, event: 'complete', code, signal, stderr: errorText}) + '\n')
          .then(() => code === 0 && !signal ? resolve(Buffer.concat(stdout))
            : reject(new Error(`command ${number} failed: ${errorText}`)), reject);
      });
    });
  };
  const ff = args => run(ffmpeg.resolvedPath, ['-hide_banner', '-loglevel', 'error', '-n', ...args]);
  const probeMedia = async file => JSON.parse((await run(ffprobe.resolvedPath,
    ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file])).toString('utf8'));
  const probePackets = async file => JSON.parse((await run(ffprobe.resolvedPath,
    ['-v', 'error', '-select_streams', 'a:0', '-show_packets', '-show_entries',
      'packet=pts,dts,duration,pts_time,duration_time,side_data_list', '-of', 'json', file])).toString('utf8'));
  const probeVideoFrames = async file => JSON.parse((await run(ffprobe.resolvedPath,
    ['-v', 'error', '-select_streams', 'v:0', '-show_frames', '-show_entries',
      'frame=pts,duration,pkt_duration', '-of', 'json', file])).toString('utf8'));
  const decodePcm = file => ff(['-i', file, '-map', '0:a:0', '-vn', '-c:a', 'pcm_f32le', '-f', 'f32le', '-']);
  const canonicalProbes = new Map();
  const verifyCanonicalWindow = async ({item, plan, timeline, directory, sourceHashes, sourcePcm}) => {
    if (!canonicalProbes.has(item.canonicalMediaPath)) {
      canonicalProbes.set(item.canonicalMediaPath, JSON.parse((await run(ffprobe.resolvedPath,
        ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', item.canonicalMediaPath])).toString('utf8')));
    }
    const probe = canonicalProbes.get(item.canonicalMediaPath);
    await save(path.join(directory, 'canonical-media-probe.json'), probe);
    const video = probe.streams.find(stream => stream.codec_type === 'video');
    const audio = probe.streams.find(stream => stream.codec_type === 'audio');
    assert(video && audio, 'canonical media requires video and audio');
    assert.equal(video.r_frame_rate, '30/1'); assert.equal(video.pix_fmt, 'yuv420p');
    assert.equal(video.width, plan.canvas.width); assert.equal(video.height, plan.canvas.height);
    assert.equal(Number(video.start_pts), 0); assert.equal(Number(video.start_time), 0);
    assert.equal(Number(audio.start_pts), 0); assert.equal(Number(audio.start_time), 0);
    assert.equal(Number(audio.sample_rate), SAMPLE_RATE); assert.equal(audio.channels, CHANNELS);
    assert.equal(Number(video.nb_frames), timeline.baseMedia.expectedFrameCount);
    const endFrame = item.originalStartFrame + item.frameCount;
    const window = {canonicalSha256: item.canonicalSha256, canonicalMediaPath: item.canonicalMediaPath,
      startFrame: item.originalStartFrame, endFrameExclusive: endFrame, frameCount: item.frameCount,
      videoTimeBase: video.time_base, videoStartPts: ticksAtFrame(item.originalStartFrame, video, 'video'),
      videoEndPtsExclusive: ticksAtFrame(endFrame, video, 'video'),
      audioTimeBase: audio.time_base, audioStartPts: ticksAtFrame(item.originalStartFrame, audio, 'audio'),
      audioEndPtsExclusive: ticksAtFrame(endFrame, audio, 'audio'),
      audioStartSamplePerChannel: item.originalStartFrame * SAMPLES_PER_FRAME,
      audioEndSamplePerChannelExclusive: endFrame * SAMPLES_PER_FRAME,
      // Match the established extractor's one-second decoder preroll. The
      // coarse seek never defines a cut; the exact integer stream PTS do.
      seekSeconds: Math.max(0, (item.originalStartFrame - FPS) / FPS), copyInputTimestamps: true};
    await save(path.join(directory, 'canonical-expected-window.json'), window);
    const input = ['-copyts', '-ss', String(window.seekSeconds), '-i', item.canonicalMediaPath];
    const canonicalHashText = (await ff([...input, '-map', '0:v:0', '-an',
      '-vf', `trim=start_pts=${window.videoStartPts}:end_pts=${window.videoEndPtsExclusive},setpts=PTS-STARTPTS`,
      '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-f', 'framehash', '-hash', 'sha256', '-'])).toString('utf8');
    await writeFile(path.join(directory, 'canonical-window.framehash'), canonicalHashText, {flag: 'wx'});
    const canonicalHashes = parseFrameHash(canonicalHashText, item.frameCount, video.width, video.height);
    const canonicalPcm = await ff([...input, '-map', '0:a:0', '-vn',
      '-af', `atrim=start_pts=${window.audioStartPts}:end_pts=${window.audioEndPtsExclusive},asetpts=PTS-STARTPTS`,
      '-c:a', 'pcm_f32le', '-f', 'f32le', '-']);
    const canonicalSequence = canonicalHashes.map(row => row.sha256);
    const excerptSequence = sourceHashes.map(row => row.sha256);
    const frameSequenceEqual = canonicalSequence.every((value, index) => value === excerptSequence[index])
      && canonicalSequence.length === excerptSequence.length;
    const pcmEqual = canonicalPcm.equals(sourcePcm);
    const expectedPcmBytes = item.frameCount * SAMPLES_PER_FRAME * CHANNELS * SAMPLE_BYTES;
    const result = {status: frameSequenceEqual && pcmEqual && canonicalPcm.length === expectedPcmBytes ? 'passed' : 'failed',
      scope: 'Direct decode of the canonical media at measured integer stream PTS, compared with every excerpt frame and every float32 PCM sample.',
      canonicalMediaSha256: item.canonicalSha256, excerptSha256: bindings.get(item.losslessPath).sha256,
      canonicalStartFrame: item.originalStartFrame, canonicalEndFrameExclusive: endFrame,
      canonicalFrameSequenceSha256: hash(canonicalSequence.join('\n')),
      excerptFrameSequenceSha256: hash(excerptSequence.join('\n')), completeFrameSequenceEqual: frameSequenceEqual,
      canonicalDecodedPcmSha256: hash(canonicalPcm), excerptDecodedPcmSha256: hash(sourcePcm),
      completeFloat32PcmByteEqual: pcmEqual, canonicalDecodedPcmBytes: canonicalPcm.length,
      excerptDecodedPcmBytes: sourcePcm.length, expectedDecodedPcmBytes: expectedPcmBytes};
    await save(path.join(directory, 'canonical-window-verification.json'), result);
    assert.equal(result.status, 'passed', 'excerpt is not the specified canonical frame/audio window');
    return result;
  };
  const results = [];
  try {
    await save(path.join(output, 'input-bindings.json'), [...bindings.values()]);
    await save(path.join(output, 'manifest-copy.json'), manifest);
    for (const {item, timeline, plan, beforeSegment, afterSegment, captionClock} of cases) {
      console.log(`${item.connectionId}: inspect immutable excerpt`);
      const directory = path.join(output, item.connectionId); await mkdir(directory);
      await save(path.join(directory, 'caption-clock.json'), captionClock);
      const sourceProbe = await probeMedia(item.losslessPath);
      const video = sourceProbe.streams.find(value => value.codec_type === 'video');
      const audio = sourceProbe.streams.find(value => value.codec_type === 'audio');
      assert.equal(sourceProbe.streams.length, 2); assert(video && audio);
      assert.equal(video.codec_name, 'ffv1'); assert.equal(video.pix_fmt, 'yuv420p');
      assert.equal(video.r_frame_rate, '30/1'); assert.equal(Number(video.nb_read_frames), item.frameCount);
      assert.equal(video.width, plan.canvas.width); assert.equal(video.height, plan.canvas.height);
      assert.equal(audio.codec_name, 'pcm_f32le'); assert.equal(Number(audio.sample_rate), SAMPLE_RATE);
      assert.equal(audio.channels, CHANNELS);
      assert.equal(Number(video.start_time), 0); assert.equal(Number(audio.start_time), 0);
      const sourceHashText = (await ff(['-i', item.losslessPath, '-map', '0:v:0', '-an', '-pix_fmt', 'yuv420p',
        '-fps_mode', 'passthrough', '-f', 'framehash', '-hash', 'sha256', '-'])).toString('utf8');
      await writeFile(path.join(directory, 'source.framehash'), sourceHashText, {flag: 'wx'});
      const sourceHashes = parseFrameHash(sourceHashText, item.frameCount, video.width, video.height);
      const sourcePcm = await decodePcm(item.losslessPath);
      const expectedSamples = item.frameCount * SAMPLES_PER_FRAME;
      assert.equal(sourcePcm.length, expectedSamples * CHANNELS * SAMPLE_BYTES);
      for (let offset = 0; offset < sourcePcm.length; offset += SAMPLE_BYTES) assert(Number.isFinite(sourcePcm.readFloatLE(offset)));
      const sourcePackets = await probePackets(item.losslessPath);
      const sourceAudioClock = pcmPacketClock(sourceProbe, sourcePackets, expectedSamples);
      const sourceVideoFrames = await probeVideoFrames(item.losslessPath);
      const sourceVideoClock = decodedVideoClock(sourceProbe, sourceVideoFrames, item.frameCount);
      await save(path.join(directory, 'source-media.json'), {probe: sourceProbe, audioPackets: sourcePackets,
        audioClock: sourceAudioClock, videoFrames: sourceVideoFrames, videoClock: sourceVideoClock});
      const canonicalWindowVerification = await verifyCanonicalWindow({item, plan, timeline, directory, sourceHashes, sourcePcm});
      const identitySpans = [{kind: 'base', baseStartFrame: 0, baseEndFrame: item.frameCount,
        startFrame: 0, endFrameExclusive: item.frameCount}];
      const blackSpans = [
        {kind: 'base', baseStartFrame: 0, baseEndFrame: item.boundaryFrame, startFrame: 0, endFrameExclusive: item.boundaryFrame},
        {kind: 'black', beforeSegmentId: beforeSegment.segmentId, afterSegmentId: afterSegment.segmentId,
          startFrame: item.boundaryFrame, endFrameExclusive: item.boundaryFrame + BLACK_FRAMES},
        {kind: 'base', baseStartFrame: item.boundaryFrame, baseEndFrame: item.frameCount,
          startFrame: item.boundaryFrame + BLACK_FRAMES, endFrameExclusive: item.frameCount + BLACK_FRAMES},
      ];
      const blackFrameHash = createHash('sha256').update(Buffer.alloc(video.width * video.height, 16))
        .update(Buffer.alloc(video.width * video.height / 2, 128)).digest('hex');
      const insertAtBytes = item.boundaryFrame * SAMPLES_PER_FRAME * CHANNELS * SAMPLE_BYTES;
      const insertedBytes = BLACK_FRAMES * SAMPLES_PER_FRAME * CHANNELS * SAMPLE_BYTES;
      const expectedBlackPcm = Buffer.concat([sourcePcm.subarray(0, insertAtBytes), Buffer.alloc(insertedBytes), sourcePcm.subarray(insertAtBytes)]);
      const variants = [];
      for (const variant of ['baseline', 'black', 'reset']) {
        console.log(`${item.connectionId}: render and verify ${variant}`);
        const isBlack = variant === 'black';
        const frames = item.frameCount + (isBlack ? BLACK_FRAMES : 0);
        const samples = frames * SAMPLES_PER_FRAME;
        const spans = isBlack ? blackSpans : identitySpans;
        const outputPath = path.join(directory, `${variant}.nut`);
        // Every variant starts from the same immutable excerpt. Reset never uses
        // an already shifted file/plan. Identity variants do not use a new DSL.
        const graphArgs = isBlack ? ['-filter_complex', buildPresentationTimelineFiltersV001({
          presentationTimeline: {spans}, canvas: plan.canvas,
          audio: {sampleRate: SAMPLE_RATE, channelLayout: 'stereo'},
        }).join(';'), '-map', '[timelineVideo]', '-map', '[timelineAudio]'] : [
          '-map', '0:v:0', '-map', '0:a:0', '-vf', `trim=end_frame=${item.frameCount},setpts=PTS-STARTPTS`,
          '-af', `atrim=end_sample=${expectedSamples},asetpts=PTS-STARTPTS`,
        ];
        await ff(['-filter_complex_threads', '1', '-i', item.losslessPath, ...graphArgs,
          '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-c:a', 'pcm_f32le', '-f', 'nut', outputPath]);
        const probe = await probeMedia(outputPath);
        const hashText = (await ff(['-i', outputPath, '-map', '0:v:0', '-an', '-pix_fmt', 'yuv420p',
          '-fps_mode', 'passthrough', '-f', 'framehash', '-hash', 'sha256', '-'])).toString('utf8');
        await writeFile(path.join(directory, `${variant}.framehash`), hashText, {flag: 'wx'});
        const hashes = parseFrameHash(hashText, frames, video.width, video.height);
        const expectedHashes = sourceHashes.map(row => row.sha256);
        if (isBlack) expectedHashes.splice(item.boundaryFrame, 0, ...Array(BLACK_FRAMES).fill(blackFrameHash));
        assert.deepEqual(hashes.map(row => row.sha256), expectedHashes, 'retained video frame dropped, duplicated, changed, or reordered');
        const pcm = await decodePcm(outputPath);
        assert.equal(pcm.length, samples * CHANNELS * SAMPLE_BYTES);
        assert(pcm.equals(isBlack ? expectedBlackPcm : sourcePcm), 'decoded PCM differs from exact retained samples and intended insertion');
        const packets = await probePackets(outputPath);
        const audioClock = pcmPacketClock(probe, packets, samples);
        const videoFrames = await probeVideoFrames(outputPath);
        const videoClock = decodedVideoClock(probe, videoFrames, frames);
        await save(path.join(directory, `${variant}-video-frames.json`), videoFrames);
        const sourceMap = sourceMapping(timeline, item, spans);
        assert.equal(sourceMap.frames.filter(frame => frame.source === null).length, isBlack ? BLACK_FRAMES : 0);
        await save(path.join(directory, `${variant}-source-map.json`), sourceMap);
        const seams = isBlack ? [item.boundaryFrame, item.boundaryFrame + BLACK_FRAMES] : [item.boundaryFrame];
        const record = {variant, path: outputPath, sha256: await fileHash(outputPath),
          frameCount: frames, decodedSamplesPerChannel: samples, frameHashSequenceSha256: hash(hashes.map(row => row.sha256).join('\n')),
          decodedPcmSha256: hash(pcm), completeRetainedFrameSequenceEqual: true,
          completeRetainedPcmEqual: true, insertedBlackFrameCount: isBlack ? BLACK_FRAMES : 0,
          insertedZeroSamplesPerChannel: isBlack ? BLACK_FRAMES * SAMPLES_PER_FRAME : 0,
          extraInsertedSilenceSamples: 0, audioClock, videoClock, waveform: seams.map(frame => waveformAt(pcm, frame * SAMPLES_PER_FRAME)),
          probe, audioPackets: packets, reviewMp4: null};
        if (manifest.encodeReviewMp4) {
          const reviewPath = path.join(directory, `${variant}.mp4`);
          // The comparison encoding is exactly the existing shared compositor's
          // H.264/AAC output setting. It has no role in lossless identity checks.
          await ff(['-i', outputPath, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-preset', 'fast',
            '-crf', '20', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-c:a', 'aac', '-movflags', '+faststart', reviewPath]);
          const reviewProbe = await probeMedia(reviewPath), reviewPackets = await probePackets(reviewPath);
          const reviewVideo = reviewProbe.streams.find(value => value.codec_type === 'video');
          const reviewAudio = reviewProbe.streams.find(value => value.codec_type === 'audio');
          assert.equal(Number(reviewVideo.nb_read_frames), frames); assert.equal(reviewVideo.codec_name, 'h264');
          assert.equal(reviewVideo.width, video.width); assert.equal(reviewVideo.height, video.height);
          assert.equal(reviewVideo.r_frame_rate, '30/1'); assert.equal(Number(reviewVideo.start_time), 0);
          assert.equal(reviewAudio.codec_name, 'aac'); assert.equal(Number(reviewAudio.sample_rate), SAMPLE_RATE);
          assert.equal(reviewAudio.channels, CHANNELS); assert.equal(Number(reviewAudio.start_time), 0);
          const reviewPcm = await decodePcm(reviewPath);
          const reviewVideoFrames = await probeVideoFrames(reviewPath);
          const reviewVideoClock = decodedVideoClock(reviewProbe, reviewVideoFrames, frames);
          await save(path.join(directory, `${variant}-review-video-frames.json`), reviewVideoFrames);
          assert.equal(reviewPcm.length % (CHANNELS * SAMPLE_BYTES), 0);
          const decodedSamples = reviewPcm.length / (CHANNELS * SAMPLE_BYTES);
          record.reviewMp4 = {path: reviewPath, sha256: await fileHash(reviewPath),
            sampleIdentityClaim: false, expectedTimelineSamplesPerChannel: samples,
            decodedSamplesPerChannel: decodedSamples, decodedTailDifferenceSamplesPerChannel: decodedSamples - samples,
            decodedTailInterleavedSamplesAfterExpectedEnd: decodedSamples > samples
              ? Array.from({length: (decodedSamples - samples) * CHANNELS}, (_, index) => reviewPcm.readFloatLE((samples * CHANNELS + index) * SAMPLE_BYTES)) : [],
            probe: reviewProbe, audioPackets: reviewPackets, videoClock: reviewVideoClock,
            waveform: seams.map(frame => waveformAt(reviewPcm, frame * SAMPLES_PER_FRAME)),
            audibleClickVerdict: 'requires separate observation of the rendered audio; not inferred from sample deltas'};
        }
        await save(path.join(directory, `${variant}-result.json`), record);
        variants.push(record);
      }
      assert.equal(variants[0].frameHashSequenceSha256, variants[2].frameHashSequenceSha256);
      assert.equal(variants[0].decodedPcmSha256, variants[2].decodedPcmSha256);
      results.push({connectionId: item.connectionId, beforeSegmentId: beforeSegment.segmentId,
        afterSegmentId: afterSegment.segmentId, canonicalBoundaryFrame: item.originalStartFrame + item.boundaryFrame,
        excerpt: item, canonicalCaptionCount: captionClock.canonicalCaptionCount,
        canonicalWindowVerification,
        resetFromOriginalInputRestoredVideoAudioAndCaptionClock: true,
        variants: variants.map(({probe, audioPackets, ...record}) => record)});
    }
    // Detect input or implementation changes during the complete fixture run.
    for (const binding of bindings.values()) {
      assert.equal(await realpath(binding.path), binding.resolvedPath, `input target changed: ${binding.path}`);
      assert.equal(await fileHash(binding.resolvedPath), binding.sha256, `input bytes changed: ${binding.path}`);
    }
    const report = {schemaVersion: 'connection-physical-fixture-research-v001', status: 'passed',
      scope: 'Existing black prototype only. No vocabulary adoption, production connection, human adoption, or renderer/trust change.',
      completePixelAndSampleIdentityScope: 'lossless FFV1/yuv420p and PCM float32 fixtures only',
      captionScope: 'Canonical full-plan clock inspection plus preservation of already burned-in caption pixels; no caption renderer rerun.',
      perceptualScope: 'No claim about naturalness, tempo, or audible clicks. Inspect actual rendered clips separately.',
      inputBindingsUnchanged: true, blackFrames: BLACK_FRAMES, fps: FPS, sampleRate: SAMPLE_RATE, channels: CHANNELS,
      results};
    await save(path.join(output, 'physical-fixture-result.json'), report);
    console.log(`${results.length} technical connections: physical fixture checks passed`);
    return report;
  } catch (error) {
    await save(path.join(output, 'physical-fixture-failure.json'), {
      status: 'failed', message: error.message, completedCases: results.map(result => result.connectionId),
      evidencePreserved: true, automaticRetry: false,
    });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runConnectionPhysicalFixtureV001(parseArgs(process.argv.slice(2)));
}
