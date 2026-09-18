import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, realpath, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildPresentationPulseStateElementsV001} from './presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001} from './presentation_caption_motion_v001.mjs';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';

export const PRESENTATION_EXACT_REPLAY_QC_SCHEMA_V001 = 'presentation-exact-replay-qc-v001';
const MODULE_FILE = fileURLToPath(import.meta.url);
const WORKSPACE = path.resolve(path.dirname(MODULE_FILE), '../..');
const HASH = /^[a-f0-9]{64}$/u;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalDigest = value => digest(canonicalJson(value));
const positive = value => Number.isSafeInteger(value) && value > 0;
const reject = message => {throw new TypeError('exact replay QC: ' + message);};
const requireValue = (condition, message) => {if (!condition) reject(message);};

const VIDEO_PROBE_FIELDS = 'stream=index,codec_type,codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames,time_base,start_pts,duration_ts,sample_aspect_ratio,display_aspect_ratio,color_range,color_space,color_transfer,color_primaries,chroma_location,field_order:stream_side_data';
const videoProbeArguments = file => ['-v', 'error', '-select_streams', 'v', '-show_streams',
  '-show_entries', VIDEO_PROBE_FIELDS, '-of', 'json', file];
const frameHashArguments = file => ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', file,
  '-map', '0:v:0', '-an', '-sn', '-dn', '-vf', 'format=yuv420p', '-fps_mode', 'passthrough',
  '-c:v', 'rawvideo', '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', 'pipe:1'];
const audioPacketArguments = file => ['-v', 'error', '-select_streams', 'a', '-show_streams', '-show_packets',
  '-show_data_hash', 'sha256', '-show_entries',
  'stream=index,codec_type,codec_name,sample_rate,channels,channel_layout,time_base,start_pts,duration_ts:packet=stream_index,pts,dts,duration,size,data_hash',
  '-of', 'json', file];

function aspectRatio(value, field) {
  if (value === undefined) return null;
  if (value === 'N/A') return value;
  requireValue(typeof value === 'string' && /^\d+[:/][1-9]\d*$/u.test(value), field + ' is not an exact aspect ratio');
  return rational(value.replace(':', '/'), field);
}

function displayMetadata(stream) {
  const result = {sampleAspectRatio: aspectRatio(stream.sample_aspect_ratio, 'sample aspect ratio'),
    displayAspectRatio: aspectRatio(stream.display_aspect_ratio, 'display aspect ratio')};
  for (const [field, key] of [['color_range', 'colorRange'], ['color_space', 'colorSpace'],
    ['color_transfer', 'colorTransfer'], ['color_primaries', 'colorPrimaries'],
    ['chroma_location', 'chromaLocation'], ['field_order', 'fieldOrder']]) {
    requireValue(stream[field] === undefined || (typeof stream[field] === 'string' && stream[field].length > 0),
      'invalid display metadata: ' + field);
    result[key] = stream[field] ?? null;
  }
  requireValue(stream.side_data_list === undefined || (Array.isArray(stream.side_data_list)
    && stream.side_data_list.every(object)), 'invalid video display side data');
  result.sideData = stream.side_data_list === undefined ? null : structuredClone(stream.side_data_list);
  return result;
}

function integerText(value, field) {
  requireValue((typeof value === 'number' && Number.isSafeInteger(value))
    || (typeof value === 'string' && /^-?\d+$/u.test(value)), field + ' is not an exact integer');
  return BigInt(value).toString();
}

function rational(value, field) {
  requireValue(typeof value === 'string' && /^-?\d+\/[1-9]\d*$/u.test(value), field + ' is not rational');
  let [numerator, denominator] = value.split('/').map(BigInt);
  let a = numerator < 0n ? -numerator : numerator, b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];
  numerator /= a; denominator /= a;
  return numerator.toString() + '/' + denominator.toString();
}

function timestamp(value, timeBase, field) {
  const ticks = BigInt(integerText(value, field));
  const [numerator, denominator] = rational(timeBase, field + ' time base').split('/').map(BigInt);
  return rational((ticks * numerator).toString() + '/' + denominator.toString(), field);
}

function frameDigest(frames) {
  return canonicalDigest(frames.map(({index, bytes, sha256}) => ({index, bytes, sha256})));
}

function timingDigest(rows) {
  return canonicalDigest(rows.map(({index, streamIndex, pts, dts, duration}) => ({
    index, ...(streamIndex === undefined ? {} : {streamIndex}), pts, dts, duration,
  })));
}

/** The muxer emits checksums, never raw decoded frames, to the measuring process. */
export function parsePresentationExactVideoFrameHashV001({text, width, height}) {
  requireValue(typeof text === 'string' && positive(width) && positive(height)
    && width % 2 === 0 && height % 2 === 0, 'invalid fixed yuv420p frame profile');
  const lines = text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  requireValue(lines.filter(line => /^#hash:/u.test(line)).length === 1
    && lines.some(line => /^#hash:\s*SHA256$/u.test(line)), 'frame hash must use SHA-256');
  requireValue(lines.some(line => /^#media_type\s+0:\s*video$/u.test(line))
    && lines.some(line => /^#codec_id\s+0:\s*rawvideo$/u.test(line)), 'frame hash must describe one raw video stream');
  const dimensions = lines.filter(line => /^#dimensions\s/u.test(line));
  requireValue(dimensions.length === 1 && dimensions[0].match(/^#dimensions\s+0:\s*(\d+)x(\d+)$/u)
    && Number(dimensions[0].match(/(\d+)x(\d+)$/u)[1]) === width
    && Number(dimensions[0].match(/(\d+)x(\d+)$/u)[2]) === height, 'decoded dimensions differ');
  const aspectRows = lines.filter(line => /^#sar\s/u.test(line));
  requireValue(aspectRows.length === 1, 'decoded sample aspect ratio is missing or duplicated');
  const aspectMatch = aspectRows[0].match(/^#sar\s+0:\s*(\d+\/[1-9]\d*)$/u);
  requireValue(aspectMatch, 'decoded sample aspect ratio is invalid');
  const sampleAspectRatio = rational(aspectMatch[1], 'decoded sample aspect ratio');
  const timeBases = lines.filter(line => /^#tb\s/u.test(line));
  requireValue(timeBases.length === 1, 'frame hash time base is missing or duplicated');
  const match = timeBases[0].match(/^#tb\s+0:\s*(\d+\/\d+)$/u);
  requireValue(match, 'frame hash time base is invalid');
  const timeBase = rational(match[1], 'decoded time base');
  requireValue(BigInt(timeBase.split('/')[0]) > 0n, 'decoded time base must be positive');
  const bytesPerFrame = width * height * 3 / 2;
  requireValue(Number.isSafeInteger(bytesPerFrame), 'decoded byte count exceeds the exact integer range');
  const frames = lines.filter(line => !line.startsWith('#')).map((line, index) => {
    const columns = line.split(',').map(part => part.trim());
    requireValue(columns.length === 6 && columns[0] === '0' && HASH.test(columns[5]), 'invalid decoded frame hash row');
    const bytes = Number(integerText(columns[4], 'decoded byte count'));
    requireValue(bytes === bytesPerFrame, 'decoded frame is not the complete fixed yuv420p canvas');
    const duration = timestamp(columns[3], timeBase, 'decoded duration');
    requireValue(!duration.startsWith('-'), 'decoded duration must not be negative');
    return {index, bytes, sha256: columns[5], pts: timestamp(columns[2], timeBase, 'decoded PTS'),
      dts: timestamp(columns[1], timeBase, 'decoded DTS'), duration};
  });
  requireValue(frames.length > 0, 'decoded video contains no frames');
  return {pixelFormat: 'yuv420p', width, height, timeBase, sampleAspectRatio, frameCount: frames.length, frames,
    frameSequenceSha256: frameDigest(frames), timingSequenceSha256: timingDigest(frames)};
}

export function parsePresentationExactAudioPacketsV001(value) {
  requireValue(object(value) && Array.isArray(value.streams) && Array.isArray(value.packets), 'audio packet probe is incomplete');
  const streams = value.streams.map(stream => {
    requireValue(stream.codec_type === 'audio' && Number.isSafeInteger(stream.index) && stream.index >= 0
      && typeof stream.codec_name === 'string' && stream.codec_name.length > 0
      && positive(Number(stream.sample_rate)) && positive(stream.channels), 'audio stream metadata is invalid');
    const timeBase = rational(stream.time_base, 'audio time base');
    requireValue(BigInt(timeBase.split('/')[0]) > 0n, 'audio time base must be positive');
    return {streamIndex: stream.index, codecName: stream.codec_name, sampleRate: Number(stream.sample_rate),
      channels: stream.channels, channelLayout: stream.channel_layout ?? null, timeBase,
      start: timestamp(stream.start_pts, timeBase, 'audio start'),
      duration: timestamp(stream.duration_ts, timeBase, 'audio duration')};
  });
  requireValue(new Set(streams.map(row => row.streamIndex)).size === streams.length, 'audio stream identity is duplicated');
  const packets = value.packets.map((packet, index) => {
    const stream = streams.find(row => row.streamIndex === packet.stream_index);
    requireValue(stream && typeof packet.data_hash === 'string'
      && /^SHA256:[a-f0-9]{64}$/u.test(packet.data_hash), 'audio packet payload hash is missing');
    const bytes = Number(integerText(packet.size, 'audio packet size'));
    requireValue(positive(bytes), 'audio packet size must be a positive exact integer');
    const duration = timestamp(packet.duration, stream.timeBase, 'audio packet duration');
    requireValue(!duration.startsWith('-'), 'audio packet duration must not be negative');
    return {index, streamIndex: stream.streamIndex, bytes, sha256: packet.data_hash.slice(7),
      pts: timestamp(packet.pts, stream.timeBase, 'audio PTS'),
      dts: timestamp(packet.dts, stream.timeBase, 'audio DTS'), duration};
  });
  requireValue(streams.length === 0 ? packets.length === 0
    : streams.every(stream => packets.some(packet => packet.streamIndex === stream.streamIndex)),
  'audio packet coverage differs from its streams');
  return {streams, packetCount: packets.length, packets,
    packetPayloadSequenceSha256: canonicalDigest(packets.map(({index, streamIndex, bytes, sha256}) => ({index, streamIndex, bytes, sha256}))),
    timingSequenceSha256: timingDigest(packets)};
}

function parseVideoProbe(value) {
  requireValue(object(value) && Array.isArray(value.streams) && value.streams.length === 1, 'exact replay requires one video stream');
  const stream = value.streams[0];
  const frameCount = Number(integerText(stream.nb_frames, 'declared video frame count'));
  requireValue(stream.codec_type === 'video' && stream.codec_name === 'h264' && stream.pix_fmt === 'yuv420p'
    && positive(stream.width) && positive(stream.height) && positive(frameCount), 'video is outside the existing H.264/yuv420p profile');
  const timeBase = rational(stream.time_base, 'video time base');
  requireValue(BigInt(timeBase.split('/')[0]) > 0n, 'video time base must be positive');
  return {codecName: stream.codec_name, pixelFormat: stream.pix_fmt, width: stream.width, height: stream.height,
    fps: rational(stream.r_frame_rate, 'video frame rate'),
    averageFps: rational(stream.avg_frame_rate, 'average video frame rate'), frameCount, timeBase,
    start: timestamp(stream.start_pts, timeBase, 'video start'),
    duration: timestamp(stream.duration_ts, timeBase, 'video duration'), display: displayMetadata(stream)};
}

function parseEncodeProgress(text) {
  const blocks = []; let current = {};
  for (const line of text.split(/\r?\n/u).filter(Boolean)) {
    const separator = line.indexOf('='); requireValue(separator > 0, 'invalid encoder progress output');
    const key = line.slice(0, separator), value = line.slice(separator + 1).trim(); current[key] = value;
    if (key === 'progress') {blocks.push(current); current = {};}
  }
  requireValue(Object.keys(current).length === 0 && blocks.length > 0 && blocks.at(-1).progress === 'end', 'encoder did not report completion');
  const counts = blocks.map(block => Number(integerText(block.frame, 'encoded frame count')));
  requireValue(counts.every((count, index) => Number.isSafeInteger(count) && count >= 0
    && (index === 0 || count >= counts[index - 1])), 'encoder progress frame count is not monotonic');
  return {completed: true, encodedFrames: counts.at(-1), observations: blocks.length};
}

function physicalElements(element, canvas) {
  return Object.hasOwn(element, 'presentationPulse')
    ? buildPresentationPulseStateElementsV001({element, canvas})
    : Object.hasOwn(element, 'presentationMotion')
      ? buildPresentationCaptionMotionStateElementsV001({element, canvas}) : [{state: 'static', element}];
}

function checkPlan(plan, expectedFrameCount) {
  requireValue(object(plan) && positive(expectedFrameCount) && object(plan.canvas)
    && positive(plan.canvas.width) && positive(plan.canvas.height) && positive(plan.canvas.fps)
    && plan.canvas.width % 2 === 0 && plan.canvas.height % 2 === 0
    && Array.isArray(plan.elements) && plan.elements.length > 0, 'fixed plan or complete frame count is invalid');
  const ids = new Set();
  for (const element of plan.elements) {
    requireValue(typeof element?.instructionId === 'string' && element.instructionId.length > 0
      && !ids.has(element.instructionId) && Number.isSafeInteger(element.startFrame) && element.startFrame >= 0
      && positive(element.endFrameExclusive) && element.endFrameExclusive <= expectedFrameCount
      && positive(element.displayFrameCount) && element.endFrameExclusive - element.startFrame === element.displayFrameCount,
    'fixed caption coverage or order is invalid');
    ids.add(element.instructionId);
  }
}

function boundRecords(plan, records) {
  requireValue(Array.isArray(records) && records.length === plan.elements.length, 'all logical overlay records are required');
  return records.map((record, index) => {
    const element = plan.elements[index]; requireValue(same(record?.element, element), 'logical overlay and fixed plan differ');
    const wanted = physicalElements(element, plan.canvas);
    const pulse = Object.hasOwn(element, 'presentationPulse');
    const motion = Object.hasOwn(element, 'presentationMotion');
    const actual = pulse ? record.pulseStates : motion ? record.motionStates : [record];
    requireValue(Array.isArray(actual) && actual.length === wanted.length
      && (pulse || !Object.hasOwn(record, 'pulseStates'))
      && (motion || !Object.hasOwn(record, 'motionStates')), 'physical overlay coverage differs');
    const states = wanted.map((state, stateIndex) => {
      const row = actual[stateIndex];
      requireValue(same(row?.element, state.element) && (state.state === 'static' || row.state === state.state)
        && typeof row.pngPath === 'string' && path.isAbsolute(row.pngPath) && HASH.test(row.pngSha256),
      'a physical PNG is missing or bound to another state');
      if (row.inspection?.overlaySha256 !== undefined) requireValue(row.inspection.overlaySha256 === row.pngSha256,
        'physical PNG inspection hash differs');
      return {state: state.state, elementCanonicalSha256: canonicalDigest(state.element),
        pngPath: row.pngPath, pngSha256: row.pngSha256, inputRole: 'overlay:' + index + ':' + state.state};
    });
    requireValue(record.pngPath === states[0].pngPath && record.pngSha256 === states[0].pngSha256,
      'logical overlay does not retain its first physical PNG');
    return {instructionId: element.instructionId, elementCanonicalSha256: canonicalDigest(element), states};
  });
}

function recordsFromBindings(plan, bindings) {
  requireValue(Array.isArray(bindings) && bindings.length === plan.elements.length, 'saved overlay bindings are incomplete');
  return plan.elements.map((element, index) => {
    const group = bindings[index], expected = physicalElements(element, plan.canvas);
    requireValue(group?.instructionId === element.instructionId
      && group.elementCanonicalSha256 === canonicalDigest(element)
      && Array.isArray(group.states) && group.states.length === expected.length, 'saved logical overlay binding differs');
    const states = expected.map((state, stateIndex) => {
      const row = group.states[stateIndex];
      requireValue(row?.state === state.state && row.elementCanonicalSha256 === canonicalDigest(state.element)
        && row.inputRole === 'overlay:' + index + ':' + state.state
        && typeof row.pngPath === 'string' && path.isAbsolute(row.pngPath) && HASH.test(row.pngSha256),
      'saved physical overlay binding differs');
      return {element: state.element, state: state.state, pngPath: row.pngPath, pngSha256: row.pngSha256};
    });
    return {...states[0], element,
      ...(Object.hasOwn(element, 'presentationPulse') ? {pulseStates: states} : {}),
      ...(Object.hasOwn(element, 'presentationMotion') ? {motionStates: states} : {})};
  });
}

const appendOutputArguments = (compositeArguments, replayPath) => [
  ...compositeArguments, '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', replayPath,
];

function checkVideoObservation(video, plan, expectedFrameCount) {
  requireValue(video?.codecName === 'h264' && video.pixelFormat === 'yuv420p'
    && video.width === plan.canvas.width && video.height === plan.canvas.height
    && video.frameCount === expectedFrameCount && video.fps === plan.canvas.fps + '/1'
    && video.averageFps === plan.canvas.fps + '/1', 'video metadata differs from the fixed canvas or complete frame count');
  rational(video.timeBase, 'saved video time base'); rational(video.start, 'saved video start'); rational(video.duration, 'saved video duration');
}

function checkDecodedObservation(value, plan, expectedFrameCount) {
  requireValue(value?.pixelFormat === 'yuv420p' && value.width === plan.canvas.width && value.height === plan.canvas.height
    && value.frameCount === expectedFrameCount && Array.isArray(value.frames) && value.frames.length === expectedFrameCount,
  'all decoded frames are required');
  for (const [index, frame] of value.frames.entries()) {
    requireValue(frame.index === index && frame.bytes === plan.canvas.width * plan.canvas.height * 3 / 2
      && HASH.test(frame.sha256), 'decoded frame identity or payload size differs');
    rational(frame.pts, 'saved frame PTS'); rational(frame.dts, 'saved frame DTS'); rational(frame.duration, 'saved frame duration');
  }
  requireValue(value.frameSequenceSha256 === frameDigest(value.frames)
    && value.timingSequenceSha256 === timingDigest(value.frames), 'decoded sequence digest does not match every saved frame');
}

function checkAudioObservation(value) {
  requireValue(object(value) && Array.isArray(value.streams) && Array.isArray(value.packets)
    && value.packetCount === value.packets.length, 'audio sequence coverage is invalid');
  const ids = new Set();
  for (const stream of value.streams) {
    requireValue(Number.isSafeInteger(stream.streamIndex) && stream.streamIndex >= 0 && !ids.has(stream.streamIndex)
      && typeof stream.codecName === 'string' && stream.codecName.length > 0
      && positive(stream.sampleRate) && positive(stream.channels), 'saved audio stream is invalid');
    rational(stream.timeBase, 'saved audio time base'); rational(stream.start, 'saved audio start');
    rational(stream.duration, 'saved audio duration'); ids.add(stream.streamIndex);
  }
  for (const [index, packet] of value.packets.entries()) {
    requireValue(packet.index === index && ids.has(packet.streamIndex) && positive(packet.bytes) && HASH.test(packet.sha256),
      'saved audio packet identity or payload is invalid');
    rational(packet.pts, 'saved audio PTS'); rational(packet.dts, 'saved audio DTS'); rational(packet.duration, 'saved audio duration');
  }
  requireValue(ids.size === 0 ? value.packets.length === 0
    : [...ids].every(id => value.packets.some(packet => packet.streamIndex === id)), 'saved audio stream has no packets');
  requireValue(value.packetPayloadSequenceSha256 === canonicalDigest(value.packets.map(({index, streamIndex, bytes, sha256}) => ({index, streamIndex, bytes, sha256})))
    && value.timingSequenceSha256 === timingDigest(value.packets), 'audio packet sequence digest differs');
}

function expectedProcessCommands(evidence, inputByRole) {
  const ffmpeg = inputByRole.get('tool:ffmpeg').path, ffprobe = inputByRole.get('tool:ffprobe').path;
  const entries = [
    {purpose: 'version-ffmpeg', command: ffmpeg, args: ['-version'], file: 'ffmpeg-version.txt'},
    {purpose: 'version-ffprobe', command: ffprobe, args: ['-version'], file: 'ffprobe-version.txt'},
    {purpose: 'encode', command: ffmpeg, args: evidence.encodeArguments, file: 'encode-progress.txt'},
    ...['completed', 'replay'].map(side => ({purpose: 'video-probe-' + side, command: ffprobe,
      args: videoProbeArguments(evidence[side].path), file: side + '-video-probe.json'})),
  ];
  if (!evidence.mp4BytesIdentical) for (const side of ['completed', 'replay']) {
    entries.push({purpose: 'framehash-' + side, command: ffmpeg,
      args: frameHashArguments(evidence[side].path), file: side + '.framehash'});
    entries.push({purpose: 'audio-packets-' + side, command: ffprobe,
      args: audioPacketArguments(evidence[side].path), file: side + '-audio-packets.json'});
  }
  return entries;
}

function validateRawExecutionEvidence(evidence, inputByRole, plan) {
  const expected = expectedProcessCommands(evidence, inputByRole);
  requireValue(Array.isArray(evidence.processes) && evidence.processes.length === expected.length,
    'the complete exact replay process sequence is required');
  requireValue(object(evidence.rawObservations)
    && same(Object.keys(evidence.rawObservations).sort(), expected.map(row => row.purpose).sort()),
  'the complete original process output is required');
  const artifacts = new Map();
  for (const artifact of evidence.generatedArtifacts) {
    requireValue(typeof artifact.path === 'string' && path.isAbsolute(artifact.path)
      && typeof artifact.realPath === 'string' && path.isAbsolute(artifact.realPath)
      && Number.isSafeInteger(artifact.bytes) && artifact.bytes >= 0 && HASH.test(artifact.fileSha256)
      && !artifacts.has(artifact.path), 'generated artifact binding is incomplete or duplicated');
    artifacts.set(artifact.path, artifact);
  }
  requireValue(artifacts.size === expected.length + 3, 'exact replay artifact coverage differs');
  const directory = path.dirname(evidence.replay.path);
  const requireArtifact = (file, text) => {
    const target = path.join(directory, file), artifact = artifacts.get(target);
    const bytes = Buffer.from(text, 'utf8');
    requireValue(artifact?.fileSha256 === digest(bytes) && artifact.bytes === bytes.length,
      'saved process output does not match its rechecked artifact: ' + file);
    return target;
  };
  const fixedInput = {plan, recordBindings: evidence.recordBindings, compositorInput: evidence.compositorInput};
  requireArtifact('fixed-input.json', JSON.stringify(fixedInput, null, 2) + '\n');
  requireArtifact('encode-arguments.json', JSON.stringify({
    compositorArguments: evidence.compositorArguments, encodeArguments: evidence.encodeArguments,
    observationOnlyArguments: ['-progress', 'pipe:1', '-nostats'],
    unchangedProductionSuffix: ['-movflags', '+faststart'],
  }, null, 2) + '\n');
  for (const [index, wanted] of expected.entries()) {
    const process = evidence.processes[index], raw = evidence.rawObservations[wanted.purpose];
    requireValue(process?.purpose === wanted.purpose && process.command === wanted.command
      && same(process.args, wanted.args) && process.argumentsCanonicalSha256 === canonicalDigest(wanted.args)
      && process.code === 0 && process.signal === null && !process.failed,
    'a required exact replay command did not complete: ' + wanted.purpose);
    requireValue(typeof raw?.stdoutUtf8 === 'string' && typeof raw.stderrUtf8 === 'string'
      && process.stdoutSha256 === digest(Buffer.from(raw.stdoutUtf8, 'utf8'))
      && process.stderrSha256 === digest(Buffer.from(raw.stderrUtf8, 'utf8')),
    'original process output differs from its command record: ' + wanted.purpose);
    requireValue(raw.artifactPath === requireArtifact(wanted.file, raw.stdoutUtf8),
      'process output points to another artifact: ' + wanted.purpose);
  }
  for (const name of ['ffmpeg', 'ffprobe']) requireValue(
    typeof evidence.executableVersions?.[name] === 'string' && evidence.executableVersions[name].length > 0
    && evidence.executableVersions[name] === evidence.rawObservations['version-' + name].stdoutUtf8,
  'executable version evidence differs');
  const stdout = purpose => evidence.rawObservations[purpose].stdoutUtf8;
  requireValue(same(evidence.encodeProgress, parseEncodeProgress(stdout('encode'))),
    'saved encode progress differs from the original process output');
  for (const side of ['completed', 'replay']) {
    const video = parseVideoProbe(JSON.parse(stdout('video-probe-' + side)));
    requireValue(same(evidence.video?.[side], video), 'saved video metadata differs from its original probe');
    if (!evidence.mp4BytesIdentical) {
      const frames = parsePresentationExactVideoFrameHashV001({text: stdout('framehash-' + side),
        width: plan.canvas.width, height: plan.canvas.height});
      requireValue(same(evidence.decodedVideo?.[side], frames), 'saved decoded frames differ from original framehash output');
      const audio = parsePresentationExactAudioPacketsV001(JSON.parse(stdout('audio-packets-' + side)));
      requireValue(same(evidence.audioPackets?.[side], audio), 'saved audio packets differ from their original probe');
      const declaredAspect = video.display.sampleAspectRatio;
      // FFmpeg represents unspecified SAR as 0/1 in framehash. Keep the probe's
      // null or N/A declaration intact; never substitute an assumed square pixel.
      const expectedAspect = declaredAspect === null || declaredAspect === 'N/A' ? '0/1' : declaredAspect;
      requireValue(frames.sampleAspectRatio === expectedAspect, 'decoded SAR differs from its video stream declaration');
    }
  }
}

/** Pure evidence validation reconstructs the original compositor input and both exact comparison routes. */
export function validatePresentationExactReplayQcEvidenceV001({plan, evidence, expectedFrameCount = evidence?.expectedFrameCount, mediaInspection, currentCompletedMediaRef}) {
  try {
    checkPlan(plan, expectedFrameCount);
    requireValue(typeof currentCompletedMediaRef?.path === 'string' && path.isAbsolute(currentCompletedMediaRef.path)
      && HASH.test(currentCompletedMediaRef.fileSha256)
      && currentCompletedMediaRef.path === evidence?.completed?.path
      && currentCompletedMediaRef.fileSha256 === evidence?.completed?.fileSha256,
    'current completed media identity does not match the exact replay evidence');
    requireValue(evidence?.schemaVersion === PRESENTATION_EXACT_REPLAY_QC_SCHEMA_V001
      && evidence.expectedFrameCount === expectedFrameCount && evidence.planCanonicalSha256 === canonicalDigest(plan),
    'exact replay evidence does not bind the fixed plan');
    const records = recordsFromBindings(plan, evidence.recordBindings);
    const input = evidence.compositorInput;
    requireValue(input?.planCanonicalSha256 === canonicalDigest(plan)
      && input.recordBindingsCanonicalSha256 === canonicalDigest(evidence.recordBindings)
      && typeof input.baseMediaPath === 'string' && path.isAbsolute(input.baseMediaPath)
      && input.expectedFrameCount === expectedFrameCount && typeof input.serializePngAndFilters === 'boolean',
    'saved compositor input differs');
    const expectedArguments = buildPresentationCompositeArgumentsV001({baseMediaPath: input.baseMediaPath, plan,
      overlayRecords: records, expectedFrameCount, serializePngAndFilters: input.serializePngAndFilters,
      presentationTimeline: input.presentationTimeline, timelineAudio: input.timelineAudio,
      audioMediaPath: input.audioMediaPath ?? null});
    requireValue(same(evidence.compositorArguments, expectedArguments)
      && evidence.compositorArgumentsCanonicalSha256 === canonicalDigest(expectedArguments)
      && same(evidence.encodeArguments, appendOutputArguments(expectedArguments, evidence.replay.path))
      && evidence.encodeArgumentsCanonicalSha256 === canonicalDigest(evidence.encodeArguments),
    'replay did not retain the existing compositor and encoder arguments');
    const manifest = evidence.inputManifest;
    requireValue(object(manifest) && Array.isArray(manifest.refs) && manifest.refs.length > 0
      && manifest.refsCanonicalSha256 === canonicalDigest(manifest.refs), 'input manifest is invalid');
    const roles = new Set();
    for (const ref of manifest.refs) {
      requireValue(typeof ref.role === 'string' && !roles.has(ref.role) && typeof ref.path === 'string' && path.isAbsolute(ref.path)
        && typeof ref.realPath === 'string' && path.isAbsolute(ref.realPath) && HASH.test(ref.fileSha256)
        && Number.isSafeInteger(ref.bytes) && ref.bytes >= 0, 'input file binding is invalid'); roles.add(ref.role);
    }
    for (const role of ['base-media', 'completed-media', 'tool:ffmpeg', 'tool:ffprobe', 'runtime:node',
      'source:evals/clip_composition/render_presentation_v002.mjs',
      'source:evals/clip_composition/presentation_exact_replay_qc_v001.mjs']) {
      requireValue(roles.has(role), 'required input binding is missing: ' + role);
    }
    const inputByRole = new Map(manifest.refs.map(ref => [ref.role, ref]));
    if (input.audioMediaPath != null) requireValue(inputByRole.get('audio-media')?.path === input.audioMediaPath,
      'separate audio file is absent from verified inputs');
    requireValue(inputByRole.get('base-media').path === input.baseMediaPath
      && same(inputByRole.get('completed-media'), evidence.completed), 'compared media differs from the fixed inputs');
    for (const group of evidence.recordBindings) for (const state of group.states) {
      const ref = inputByRole.get(state.inputRole);
      requireValue(ref?.path === state.pngPath && ref.fileSha256 === state.pngSha256, 'physical PNG was not verified as an input');
    }
    for (const stage of ['before', 'after']) requireValue(same(manifest[stage], manifest.refs), 'input bindings changed or were not rechecked');
    requireValue(Array.isArray(evidence.generatedArtifacts) && evidence.generatedArtifacts.length > 0
      && same(evidence.verifiedGeneratedArtifacts, evidence.generatedArtifacts), 'generated evidence was not rechecked');
    for (const artifact of evidence.generatedArtifacts) requireValue(typeof artifact.path === 'string' && path.isAbsolute(artifact.path)
      && HASH.test(artifact.fileSha256), 'generated artifact binding is invalid');
    requireValue(evidence.generatedArtifacts.some(ref => same(ref, evidence.replay))
      && evidence.replay.path !== evidence.completed.path && evidence.replay.realPath !== evidence.completed.realPath,
    'replay must be an independently saved QC artifact');
    requireValue(evidence.encodeProgress?.completed === true && evidence.encodeProgress.encodedFrames === expectedFrameCount,
      'encoder did not emit the complete fixed frame count');
    checkVideoObservation(evidence.video.completed, plan, expectedFrameCount);
    checkVideoObservation(evidence.video.replay, plan, expectedFrameCount);
    requireValue(same(evidence.video.completed, evidence.video.replay), 'video metadata or integer timing differs');
    if (mediaInspection !== undefined) {
      const observed = mediaInspection?.video;
      requireValue(observed?.codecName === 'h264' && observed.width === plan.canvas.width
        && observed.height === plan.canvas.height && observed.fps === plan.canvas.fps
        && observed.frameCount === expectedFrameCount, 'final media inspection differs from the exact replay');
    }
    const bytesEqual = evidence.completed.fileSha256 === evidence.replay.fileSha256
      && evidence.completed.bytes === evidence.replay.bytes;
    requireValue(evidence.mp4BytesIdentical === bytesEqual, 'saved MP4 equality differs from its actual hashes');
    validateRawExecutionEvidence(evidence, inputByRole, plan);
    if (bytesEqual) {
      requireValue(evidence.comparisonMethod === 'mp4-byte-identical'
        && evidence.decodedVideo === null && evidence.audioPackets === null,
      'byte equality must not invent decoded-frame or packet observations');
    } else {
      requireValue(evidence.comparisonMethod === 'all-decoded-yuv420p-frames-and-audio-packets', 'nonidentical MP4 requires full exact comparison');
      for (const side of ['completed', 'replay']) {
        checkDecodedObservation(evidence.decodedVideo?.[side], plan, expectedFrameCount);
        checkAudioObservation(evidence.audioPackets?.[side]);
      }
      requireValue(evidence.decodedVideo.completed.frameSequenceSha256 === evidence.decodedVideo.replay.frameSequenceSha256
        && evidence.decodedVideo.completed.timingSequenceSha256 === evidence.decodedVideo.replay.timingSequenceSha256,
      'complete decoded video frame sequence or exact timestamps differ');
      requireValue(same(evidence.audioPackets.completed, evidence.audioPackets.replay), 'audio packet payload sequence or exact timestamps differ');
    }
    return {status: 'passed', violations: []};
  } catch (error) {
    return {status: 'failed', violations: [{code: 'EXACT_REPLAY_QC_INVALID', reason: error.message}]};
  }
}

async function fileBinding(file, role) {
  requireValue(typeof file === 'string' && path.isAbsolute(file), 'an absolute file path is required');
  const resolved = await realpath(file), metadata = await stat(resolved);
  requireValue(metadata.isFile(), 'an input is not a regular file');
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(resolved)) {hash.update(chunk); bytes += chunk.length;}
  return {...(role === undefined ? {} : {role}), path: file, realPath: resolved, bytes, fileSha256: hash.digest('hex')};
}

async function sourceBindings() {
  const visited = new Set(), result = [];
  const walk = async file => {
    file = path.resolve(file); if (visited.has(file)) return; visited.add(file);
    requireValue(file.startsWith(WORKSPACE + path.sep), 'renderer source escaped the existing workspace');
    const text = await readFile(file, 'utf8');
    result.push(await fileBinding(file, 'source:' + path.relative(WORKSPACE, file)));
    for (const match of text.replace(/\/\*[\s\S]*?\*\//gu, '').matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/gu)) {
      const dependency = path.resolve(path.dirname(file), match[2]);
      requireValue(/\.(?:mjs|js|json)$/u.test(dependency), 'unsupported compositor source dependency');
      await walk(dependency);
    }
    for (const match of text.matchAll(/new\s+URL\(\s*(['"])(\.[^'"]+\.json)\1\s*,\s*import\.meta\.url\s*,?\s*\)/gu)) {
      await walk(path.resolve(path.dirname(file), match[2]));
    }
  };
  await walk(MODULE_FILE); return result;
}

function spawnObserved(command, args) {
  return new Promise((resolve, rejectPromise) => {
    const stdout = [], stderr = [];
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout.on('data', chunk => stdout.push(chunk)); child.stderr.on('data', chunk => stderr.push(chunk));
    child.once('error', rejectPromise);
    child.once('close', (code, signal) => resolve({code, signal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)}));
  });
}

/** QC-only: one complete replay, no PNG drawing and no replacement of the completed media. */
export async function inspectPresentationExactReplayQcV001({
  plan, records, baseMediaPath, completedMediaPath, expectedFrameCount, scratchDirectory,
  ffmpegPath, ffprobePath, serializePngAndFilters, presentationTimeline = null, timelineAudio = null,
  processObserver = null, sourceRefs = [], audioMediaPath = null,
}) {
  const started = performance.now(), processes = [], generatedArtifacts = [], rawObservations = {};
  const originals = {plan, records, presentationTimeline, timelineAudio, sourceRefs};
  const originalDigest = canonicalDigest(originals);
  plan = structuredClone(plan); records = structuredClone(records);
  presentationTimeline = structuredClone(presentationTimeline); timelineAudio = structuredClone(timelineAudio);
  sourceRefs = structuredClone(sourceRefs);
  let evidence;
  const timings = {encodeWallClockMs: null, exactComparisonWallClockMs: null};
  const performanceRecord = () => ({wallClockMs: performance.now() - started, ...timings,
    childProcessCount: processes.length,
    childProcessesByPurpose: Object.fromEntries([...new Set(processes.map(row => row.purpose))]
      .map(purpose => [purpose, processes.filter(row => row.purpose === purpose).length])),
    encodedFrames: evidence?.encodeProgress?.encodedFrames ?? null,
    decodedFrames: evidence?.decodedVideo ? {completed: evidence.decodedVideo.completed.frameCount,
      replay: evidence.decodedVideo.replay.frameCount} : null,
    comparedFrames: evidence?.decodedVideo?.completed.frameCount ?? null,
    comparedAudioPackets: evidence?.audioPackets?.completed.packetCount ?? null,
    observationScope: 'One actual full-video encode. Decoded frame counts are observed framehash rows only; byte equality does not fabricate decoded or compared frame counts.'});
  const run = async (command, args, purpose) => {
    const tick = performance.now(), argsHash = canonicalDigest(args);
    const observation = {purpose, command, args: [...args], argumentsCanonicalSha256: argsHash}; processes.push(observation);
    try {
      const result = processObserver === null ? await spawnObserved(command, args)
        : await processObserver.run(command, [...args], {allowedExitCodes: [0], observationLabel: 'exact-replay-' + purpose});
      requireValue(result.code === 0 && (result.signal === null || result.signal === undefined)
        && Buffer.isBuffer(result.stdout) && Buffer.isBuffer(result.stderr), 'child process did not complete successfully');
      Object.assign(observation, {code: result.code, signal: result.signal ?? null, wallClockMs: performance.now() - tick,
        stdoutSha256: digest(result.stdout), stderrSha256: digest(result.stderr)});
      return result;
    } catch (error) {
      Object.assign(observation, {failed: true, wallClockMs: performance.now() - tick, reason: error.message}); throw error;
    }
  };
  try {
    checkPlan(plan, expectedFrameCount);
    requireValue(typeof serializePngAndFilters === 'boolean' && Array.isArray(sourceRefs), 'explicit compositor settings and source references are required');
    requireValue(processObserver === null || typeof processObserver?.run === 'function', 'invalid process observer');
    const recordBindings = boundRecords(plan, records);
    const refs = [await fileBinding(baseMediaPath, 'base-media'), await fileBinding(completedMediaPath, 'completed-media'),
      await fileBinding(ffmpegPath, 'tool:ffmpeg'), await fileBinding(ffprobePath, 'tool:ffprobe'),
      await fileBinding(process.execPath, 'runtime:node'), ...await sourceBindings()];
    if (audioMediaPath !== null) refs.push(await fileBinding(audioMediaPath, 'audio-media'));
    for (const group of recordBindings) for (const state of group.states) {
      const ref = await fileBinding(state.pngPath, state.inputRole);
      requireValue(ref.fileSha256 === state.pngSha256, 'a production PNG differs from its fixed hash'); refs.push(ref);
    }
    for (const ref of sourceRefs) {
      requireValue(typeof ref.role === 'string' && ref.role.length > 0 && HASH.test(ref.fileSha256), 'invalid extra source reference');
      const actual = await fileBinding(ref.path, 'extra:' + ref.role);
      requireValue(actual.fileSha256 === ref.fileSha256, 'extra source reference changed'); refs.push(actual);
    }
    requireValue(new Set(refs.map(ref => ref.role)).size === refs.length, 'duplicate input reference roles');
    requireValue(typeof scratchDirectory === 'string' && path.isAbsolute(scratchDirectory), 'absolute exclusive scratch directory required');
    await mkdir(scratchDirectory);
    const save = async (name, bytes) => {
      const file = path.join(scratchDirectory, name); await writeFile(file, bytes, {flag: 'wx'});
      const ref = await fileBinding(file); generatedArtifacts.push(ref); return ref;
    };
    const replayPath = path.join(scratchDirectory, 'replay.mp4');
    const saveObserved = async (name, result, purpose) => {
      const stdoutUtf8 = result.stdout.toString('utf8'), stderrUtf8 = result.stderr.toString('utf8');
      requireValue(Buffer.from(stdoutUtf8, 'utf8').equals(result.stdout)
        && Buffer.from(stderrUtf8, 'utf8').equals(result.stderr), 'process output must be losslessly saved as UTF-8');
      const artifact = await save(name, result.stdout);
      rawObservations[purpose] = {artifactPath: artifact.path, stdoutUtf8, stderrUtf8};
      return artifact;
    };
    const compositorInput = {baseMediaPath, planCanonicalSha256: canonicalDigest(plan),
      recordBindingsCanonicalSha256: canonicalDigest(recordBindings), expectedFrameCount,
      serializePngAndFilters, presentationTimeline, timelineAudio,
      ...(audioMediaPath === null ? {} : {audioMediaPath})};
    const compositorArguments = buildPresentationCompositeArgumentsV001({baseMediaPath, plan,
      overlayRecords: records, expectedFrameCount, serializePngAndFilters, presentationTimeline, timelineAudio, audioMediaPath});
    const encodeArguments = appendOutputArguments(compositorArguments, replayPath);
    await save('fixed-input.json', JSON.stringify({plan, recordBindings, compositorInput}, null, 2) + '\n');
    await save('encode-arguments.json', JSON.stringify({compositorArguments, encodeArguments,
      observationOnlyArguments: ['-progress', 'pipe:1', '-nostats'],
      unchangedProductionSuffix: ['-movflags', '+faststart']}, null, 2) + '\n');
    const versions = {};
    for (const [name, executable] of [['ffmpeg', ffmpegPath], ['ffprobe', ffprobePath]]) {
      const result = await run(executable, ['-version'], 'version-' + name);
      versions[name] = result.stdout.toString('utf8'); await saveObserved(name + '-version.txt', result, 'version-' + name);
    }
    const encodeStarted = performance.now();
    const encoded = await run(ffmpegPath, encodeArguments, 'encode');
    timings.encodeWallClockMs = performance.now() - encodeStarted;
    await saveObserved('encode-progress.txt', encoded, 'encode');
    const encodeProgress = parseEncodeProgress(encoded.stdout.toString('utf8'));
    const replay = await fileBinding(replayPath); generatedArtifacts.push(replay);
    const completed = refs.find(ref => ref.role === 'completed-media');
    const comparisonStarted = performance.now(), video = {};
    for (const [side, file] of [['completed', completedMediaPath], ['replay', replayPath]]) {
      const result = await run(ffprobePath, videoProbeArguments(file), 'video-probe-' + side);
      await saveObserved(side + '-video-probe.json', result, 'video-probe-' + side);
      video[side] = parseVideoProbe(JSON.parse(result.stdout.toString('utf8')));
    }
    const mp4BytesIdentical = completed.fileSha256 === replay.fileSha256 && completed.bytes === replay.bytes;
    let decodedVideo = null, audioPackets = null;
    if (!mp4BytesIdentical) {
      decodedVideo = {}; audioPackets = {};
      for (const [side, file] of [['completed', completedMediaPath], ['replay', replayPath]]) {
        const frames = await run(ffmpegPath, frameHashArguments(file), 'framehash-' + side);
        await saveObserved(side + '.framehash', frames, 'framehash-' + side);
        decodedVideo[side] = parsePresentationExactVideoFrameHashV001({text: frames.stdout.toString('utf8'),
          width: plan.canvas.width, height: plan.canvas.height});
        const audio = await run(ffprobePath, audioPacketArguments(file), 'audio-packets-' + side);
        await saveObserved(side + '-audio-packets.json', audio, 'audio-packets-' + side);
        audioPackets[side] = parsePresentationExactAudioPacketsV001(JSON.parse(audio.stdout.toString('utf8')));
      }
    }
    timings.exactComparisonWallClockMs = performance.now() - comparisonStarted;
    evidence = {schemaVersion: PRESENTATION_EXACT_REPLAY_QC_SCHEMA_V001, expectedFrameCount,
      planCanonicalSha256: canonicalDigest(plan), recordBindings, compositorInput, compositorArguments, encodeArguments,
      compositorArgumentsCanonicalSha256: canonicalDigest(compositorArguments),
      encodeArgumentsCanonicalSha256: canonicalDigest(encodeArguments),
      inputManifest: {refs, refsCanonicalSha256: canonicalDigest(refs), before: structuredClone(refs), after: []},
      completed, replay, encodeProgress, video, mp4BytesIdentical,
      comparisonMethod: mp4BytesIdentical ? 'mp4-byte-identical' : 'all-decoded-yuv420p-frames-and-audio-packets',
      decodedVideo, audioPackets, generatedArtifacts, verifiedGeneratedArtifacts: [], processes, rawObservations, executableVersions: versions};
    for (const ref of refs) {
      const actual = await fileBinding(ref.path, ref.role);
      requireValue(same(actual, ref), 'fixed input changed during exact replay: ' + ref.role);
      evidence.inputManifest.after.push(actual);
    }
    for (const ref of generatedArtifacts) {
      const actual = await fileBinding(ref.path);
      requireValue(same(actual, ref), 'generated replay evidence changed before completion');
      evidence.verifiedGeneratedArtifacts.push(actual);
    }
    requireValue(canonicalDigest(originals) === originalDigest, 'caller inputs changed during exact replay');
    const currentCompletedMediaRef = evidence.inputManifest.after.find(ref => ref.role === 'completed-media');
    const validated = validatePresentationExactReplayQcEvidenceV001({plan, evidence, expectedFrameCount, currentCompletedMediaRef});
    return {...validated, evidence, performance: performanceRecord()};
  } catch (error) {
    error.exactReplayQcFailure = {evidence: evidence ?? null, processes, generatedArtifacts, performance: performanceRecord()};
    throw error;
  }
}
