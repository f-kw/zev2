#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {lstat, readFile, realpath} from 'node:fs/promises';
import {dirname, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {inspectPresentationBaseMediaSourceV001} from './presentation_base_media_build_v001.mjs';

export const PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION =
  'presentation-source-media-equivalence-v001';
export const PRESENTATION_BROWSER_PLAYBACK_OBSERVATION_SCHEMA_VERSION =
  'presentation-browser-playback-observation-v001';
export const PRESENTATION_BROWSER_PLAYBACK_PAGE_URL_V001 =
  'http://127.0.0.1:4318/review.html';
export const PRESENTATION_BROWSER_PLAYBACK_MEDIA_URL_V001 =
  'http://127.0.0.1:4318/media';
export const PRESENTATION_BROWSER_PLAYBACK_SERVER_CONTRACT_V001 =
  'read-only-get-head-v001';

export const PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_CHECK_IDS_V001 = Object.freeze([
  'provenance',
  'frozen-file-hashes',
  'formal-entry',
  'format299-video-stream-copy',
  'video-clock',
  'audio-stream',
  'audio-packet-clock',
  'audio-packet-payload',
  'audio-decoded-pcm',
  'stt-transfer',
  'browser-playback',
]);

export const PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_VIOLATION_CODES = Object.freeze([
  'MEDIA_EQUIVALENCE_INPUT_INVALID',
  'MEDIA_EQUIVALENCE_PROVENANCE_MISMATCH',
  'MEDIA_EQUIVALENCE_FILE_HASH_MISMATCH',
  'MEDIA_EQUIVALENCE_FORMAL_ENTRY_FAILED',
  'MEDIA_EQUIVALENCE_VIDEO_STREAM_COPY_MISMATCH',
  'MEDIA_EQUIVALENCE_VIDEO_CLOCK_MISMATCH',
  'MEDIA_EQUIVALENCE_AUDIO_STREAM_MISMATCH',
  'MEDIA_EQUIVALENCE_AUDIO_PACKET_CLOCK_MISMATCH',
  'MEDIA_EQUIVALENCE_AUDIO_PACKET_PAYLOAD_MISMATCH',
  'MEDIA_EQUIVALENCE_AUDIO_PCM_MISMATCH',
  'MEDIA_EQUIVALENCE_STT_TRANSFER_MISMATCH',
  'MEDIA_EQUIVALENCE_BROWSER_OBSERVATION_INVALID',
]);

export const FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001 = Object.freeze({
  sourceVideoId: 'DmWu0jVQfTE',
  channelId: 'UCvzGlP9oQwU--Y0r9id_jnA',
  webpageUrl: 'https://www.youtube.com/watch?v=DmWu0jVQfTE',
  oldMediaSha256: '08306f79df970953da7dff51e8de0e4a7cdea46ca75f793ff7b860b30c1401d7',
  format299VideoSha256: '7e5cc3339930efbc44455902610f3bcca49575676b7e9907809f5e302549b62a',
  newExecutionMediaSha256: 'a2c4548d07eb387f095a198b8f6892121134c46e8c0d5315e4debf3e083234ee',
  infoJsonSha256: '633d2d7f5d3487b9ce0cce6ee3de045e35fb9a6dea66946d4a1bf0a233e92f02',
  sttManifestSha256: 'f7d2c04f8f9e67e27ff5b461236f01d3b68bb4f53ba448c0c4b5387c95a6d03b',
  sttTranscriptSha256: 'c0e006b381d60c2160a4ef59787bd32e47257baf9acc77b8706d74b5c8d3556d',
  sttWordTimestampsSha256: 'ebf0190c9ce0fd96b4e1faa18717f41d73126fc914172474ac791df7f17ad065',
  sttChunk16FlacSha256: 'c29a293c3324b172a6e555c1eca242fe8749f93a190bb3281ea85451d2244054',
  sttChunk16PcmSha256: 'f5389c874cd8921324f9a1847921ac2da8bced99f490c1c629a0ba21780245c7',
  videoFrameCount: 528840,
  videoFrameRate: '60/1',
  videoTimeBase: '1/15360',
  videoFramePtsStep: 256,
  videoEndMs: 8814000,
  videoFrameClockCanonicalSha256: '751901397c4470f11d1306673c7a80f749ec3fa64c6d89c3e4d12febb824e54b',
  videoExtradataSize: 45,
  videoExtradataSha256: 'b865e483b46fa1d7a94c8cd8ed79ff4cae09e3c040a3f39bbc09bb57cd425ffd',
  videoPacketCanonicalSha256: 'fea3492d258d10298cbf9c36f0a37e9dd54ed6239fd523302c4eb49094603f8b',
  videoPayloadByteCount: 979437250,
  videoPayloadSha256: 'a4e96ef53fb35fea6bbcf00ebe4bdfad2b5d559c94e8db6ead67c92c589b37e2',
  audioPacketCount: 440701,
  audioStartSample: 0,
  audioEndSample: 423073008,
  audioInitialPadding: 312,
  audioExtradataSize: 19,
  audioExtradataSha256: '94ba1201d63e61e43c5240d902a95410dfbb0dcc81f0430f57be6840f1a5e47f',
  sttDurationMs: 8814021,
  sttSegmentCount: 25899,
  sttWordCount: 25899,
  chunkIndex: 16,
  chunkStartMs: 1920000,
  chunkEndMs: 2040000,
  candidateOuterRange: Object.freeze({startMs: 1920260, endMs: 2008506}),
  reviewGaps: Object.freeze([
    Object.freeze({startMs: 1948058, endMs: 1949982}),
    Object.freeze({startMs: 1977670, endMs: 1981394}),
  ]),
  sttBoundaryContexts: Object.freeze([
    Object.freeze({boundaryMs: 1920260, beforeWordId: 6931, afterWordId: 6932}),
    Object.freeze({boundaryMs: 2008506, beforeWordId: 7285, afterWordId: 7286}),
    Object.freeze({boundaryMs: 1948058, beforeWordId: 7057, afterWordId: 7058}),
    Object.freeze({boundaryMs: 1949982, beforeWordId: 7057, afterWordId: 7058}),
    Object.freeze({boundaryMs: 1977670, beforeWordId: 7179, afterWordId: 7180}),
    Object.freeze({boundaryMs: 1981394, beforeWordId: 7179, afterWordId: 7180}),
  ]),
  acquisitionCommand:
    "yt-dlp --no-overwrites --newline -f 299 -o 'native-1080p/DmWu0jVQfTE.f299.%(ext)s' https://www.youtube.com/watch?v=DmWu0jVQfTE",
  muxCommand:
    'ffmpeg -i DmWu0jVQfTE.f299.mp4 -i DmWu0jVQfTE.mp4 -map 0:v:0 -map 1:a:0 -c copy -map_metadata -1 -map_chapters -1 -movflags +faststart DmWu0jVQfTE.native-1080p-h264-opus.mp4',
});

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isSha256 = (value) => typeof value === 'string' && SHA256_PATTERN.test(value);
const exactFields = (value, fields) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
const validWorkspaceRelativePath = (value) => isNonEmptyString(value)
  && !value.startsWith('/')
  && !value.split('/').includes('..');

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));

const fileSha256 = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolve(hash.digest('hex')));
});

const runCapture = (command, args) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {env: {...process.env, TMPDIR: '/private/tmp'}});
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    const result = {stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)};
    if (code === 0) resolve(result);
    else reject(new Error(`${command} failed (${code ?? 'unknown'}): ${result.stderr.toString()}`));
  });
});

const runHashStdout = (command, args) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stderr = [];
  let byteCount = 0;
  const child = spawn(command, args, {env: {...process.env, TMPDIR: '/private/tmp'}});
  child.stdout.on('data', (chunk) => {
    hash.update(chunk);
    byteCount += chunk.length;
  });
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) resolve({byteCount, payloadSha256: hash.digest('hex')});
    else reject(new Error(`${command} failed (${code ?? 'unknown'}): ${Buffer.concat(stderr).toString()}`));
  });
});

const runLines = (command, args, onLine) => new Promise((resolve, reject) => {
  const stderr = [];
  let pending = '';
  let callbackError = null;
  const child = spawn(command, args, {env: {...process.env, TMPDIR: '/private/tmp'}});
  const consume = (line) => {
    if (callbackError !== null || line.length === 0) return;
    try {
      onLine(line);
    } catch (error) {
      callbackError = error;
      child.kill('SIGTERM');
    }
  };
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    pending += chunk;
    let newline = pending.indexOf('\n');
    while (newline >= 0) {
      const line = pending.slice(0, newline).replace(/\r$/, '');
      pending = pending.slice(newline + 1);
      consume(line);
      newline = pending.indexOf('\n');
    }
  });
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    if (callbackError !== null) {
      reject(callbackError);
      return;
    }
    if (code !== 0) {
      reject(new Error(`${command} failed (${code ?? 'unknown'}): ${Buffer.concat(stderr).toString()}`));
      return;
    }
    if (pending.length > 0) consume(pending.replace(/\r$/, ''));
    if (callbackError !== null) {
      reject(callbackError);
      return;
    }
    resolve();
  });
});

const ffprobeJson = async (args) => JSON.parse((await runCapture('ffprobe', [
  '-v', 'error',
  ...args,
])).stdout.toString('utf8'));

const parseCompact = (line) => Object.fromEntries(line.split('|').map((part) => {
  const split = part.indexOf('=');
  return split < 0 ? [part, ''] : [part.slice(0, split), part.slice(split + 1)];
}));

const validHashRef = (value) => exactFields(value, ['path', 'fileSha256'])
  && validWorkspaceRelativePath(value.path)
  && isSha256(value.fileSha256);

const provenanceIsExact = (value) => exactFields(value, [
  'channelId', 'webpageUrl', 'format299', 'format251', 'acquisitionCommand', 'muxCommand',
])
  && exactFields(value.format299, [
    'formatId', 'extension', 'videoCodec', 'audioCodec', 'width', 'height',
    'framesPerSecond',
  ])
  && exactFields(value.format251, [
    'formatId', 'extension', 'videoCodec', 'audioCodec',
  ])
  && value.channelId === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.channelId
  && value.webpageUrl === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.webpageUrl
  && value.format299.formatId === '299'
  && value.format299.extension === 'mp4'
  && value.format299.videoCodec === 'avc1.64002a'
  && value.format299.audioCodec === 'none'
  && value.format299.width === 1920
  && value.format299.height === 1080
  && value.format299.framesPerSecond === 60
  && value.format251.formatId === '251'
  && value.format251.extension === 'webm'
  && value.format251.videoCodec === 'none'
  && value.format251.audioCodec === 'opus'
  && value.acquisitionCommand === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.acquisitionCommand
  && value.muxCommand === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.muxCommand;

const formalEntryIsExact = (value) => {
  const rootFields = ['source', 'fps', 'decodedFrameCount', 'logicalFrameCount', 'audioClock'];
  const sourceFields = ['video', 'audio'];
  const videoFields = [
    'width', 'height', 'frameRate', 'timeBase', 'decodedFrameCount', 'firstPts', 'lastPts',
    'rotation',
  ];
  const audioFields = [
    'present', 'codec', 'sampleRate', 'channels', 'channelLayout', 'timeBase',
    'firstDecodedPts', 'lastDecodedPts', 'presentationClock',
  ];
  const presentationClockFields = [
    'authority', 'endSample', 'streamEndSample', 'packetEndSample', 'skipSamples',
    'discardPadding',
  ];
  const audioClockFields = [
    'sampleRate', 'channels', 'channelLayout', 'spans', 'sourceGridSampleCount',
    'sourceGridMappingEndSample', 'decodedTailPaddingSampleCount',
  ];
  if (!exactFields(value, rootFields)
    || !exactFields(value.source, sourceFields)
    || !exactFields(value.source.video, videoFields)
    || !exactFields(value.source.audio, audioFields)
    || !exactFields(value.source.audio.presentationClock, presentationClockFields)
    || !exactFields(value.audioClock, audioClockFields)) return false;
  const presentationClock = value.source.audio.presentationClock;
  const audioClock = value.audioClock;
  const spansValid = Array.isArray(audioClock.spans) && audioClock.spans.every((span, index) => (
    exactFields(span, ['startSample', 'endSample'])
    && Number.isInteger(span.startSample)
    && Number.isInteger(span.endSample)
    && span.startSample >= 0
    && span.startSample < span.endSample
    && (index === 0 || span.startSample >= audioClock.spans[index - 1].endSample)
  ));
  return spansValid
    && value.source.video.width === 1920
    && value.source.video.height === 1080
    && value.source.video.frameRate === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameRate
    && value.source.video.timeBase === '1/60'
    && value.source.video.decodedFrameCount
      === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount
    && value.source.video.firstPts === 0
    && value.source.video.lastPts
      === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount - 1
    && value.source.video.rotation === 0
    && value.fps === 60
    && value.decodedFrameCount === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount
    && value.logicalFrameCount
      === Math.ceil(FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount / 2)
    && value.source.audio.present === true
    && value.source.audio.codec === 'opus'
    && value.source.audio.sampleRate === 48000
    && value.source.audio.channels === 2
    && value.source.audio.channelLayout === 'stereo'
    && value.source.audio.timeBase === '1/48000'
    && Number.isInteger(value.source.audio.firstDecodedPts)
    && Number.isInteger(value.source.audio.lastDecodedPts)
    && value.source.audio.firstDecodedPts <= value.source.audio.lastDecodedPts
    && presentationClock.authority === 'stream-and-packet-v001'
    && presentationClock.endSample
      === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioEndSample
    && presentationClock.streamEndSample === presentationClock.endSample
    && presentationClock.packetEndSample === presentationClock.endSample
    && Number.isInteger(presentationClock.skipSamples)
    && presentationClock.skipSamples >= 0
    && Number.isInteger(presentationClock.discardPadding)
    && presentationClock.discardPadding >= 0
    && value.audioClock.sampleRate === 48000
    && value.audioClock.channels === 2
    && value.audioClock.channelLayout === 'stereo'
    && Number.isInteger(audioClock.sourceGridSampleCount)
    && audioClock.sourceGridSampleCount >= presentationClock.endSample
    && audioClock.sourceGridMappingEndSample === presentationClock.endSample
    && Number.isInteger(audioClock.decodedTailPaddingSampleCount)
    && audioClock.decodedTailPaddingSampleCount
      === audioClock.sourceGridSampleCount - audioClock.sourceGridMappingEndSample
    && audioClock.spans.every((span) => span.endSample <= audioClock.sourceGridSampleCount);
};

const videoClockMatchesExpected = (clock) => exactFields(clock, [
  'frameRate', 'averageFrameRate', 'timeBase', 'startPts', 'durationTs',
  'declaredFrameCount', 'decodedFrameCount', 'firstPts', 'lastPts', 'endMs',
  'canonicalPtsSha256',
])
  && clock.frameRate === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameRate
  && clock.averageFrameRate === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameRate
  && clock.timeBase === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoTimeBase
  && clock.startPts === 0
  && clock.durationTs === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount
    * FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFramePtsStep
  && clock.decodedFrameCount === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount
  && clock.declaredFrameCount === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount
  && clock.firstPts === 0
  && clock.lastPts === (FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount - 1)
    * FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFramePtsStep
  && clock.endMs === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoEndMs
  && clock.canonicalPtsSha256
    === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameClockCanonicalSha256;

const videoStreamCopyIsExact = (value) => {
  if (!exactFields(value, ['format299Video', 'newExecutionMedia'])) return false;
  const sideFields = ['stream', 'packetClock', 'packetPayload'];
  const streamFields = [
    'codec', 'profile', 'level', 'width', 'height', 'pixelFormat', 'timeBase',
    'startPts', 'durationTs', 'extradataSize', 'extradataSha256',
  ];
  const packetFields = ['packetCount', 'firstPts', 'packetEndPts', 'canonicalPacketSha256'];
  const payloadFields = ['byteCount', 'payloadSha256'];
  for (const side of [value.format299Video, value.newExecutionMedia]) {
    if (!exactFields(side, sideFields)
        || !exactFields(side.stream, streamFields)
        || !exactFields(side.packetClock, packetFields)
        || !exactFields(side.packetPayload, payloadFields)
        || side.stream.codec !== 'h264'
        || side.stream.profile !== 'High'
        || side.stream.level !== 42
        || side.stream.width !== 1920
        || side.stream.height !== 1080
        || side.stream.pixelFormat !== 'yuv420p'
        || side.stream.timeBase !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoTimeBase
        || side.stream.startPts !== 0
        || side.stream.durationTs
          !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount
            * FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFramePtsStep
        || side.stream.extradataSize
          !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoExtradataSize
        || side.stream.extradataSha256
          !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoExtradataSha256
        || !Number.isInteger(side.packetClock.packetCount)
        || side.packetClock.packetCount
          !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFrameCount
        || side.packetClock.firstPts !== 0
        || !Number.isInteger(side.packetClock.packetEndPts)
        || side.packetClock.packetEndPts !== side.stream.durationTs
        || side.packetClock.canonicalPacketSha256
          !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoPacketCanonicalSha256
        || side.packetPayload.byteCount
          !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoPayloadByteCount
        || side.packetPayload.payloadSha256
          !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoPayloadSha256) return false;
  }
  return canonicalJson(value.format299Video) === canonicalJson(value.newExecutionMedia);
};

const audioStreamIsExact = (value) => exactFields(value, ['oldStream', 'newStream'])
  && exactFields(value.oldStream, [
    'codec', 'sampleRate', 'channels', 'channelLayout', 'timeBase', 'startPts',
    'durationTs', 'initialPadding', 'extradataSize', 'extradataSha256',
  ])
  && exactFields(value.newStream, [
    'codec', 'sampleRate', 'channels', 'channelLayout', 'timeBase', 'startPts',
    'durationTs', 'initialPadding', 'extradataSize', 'extradataSha256',
  ])
  && canonicalJson(value.oldStream) === canonicalJson(value.newStream)
  && value.oldStream.codec === 'opus'
  && value.oldStream.sampleRate === 48000
  && value.oldStream.channels === 2
  && value.oldStream.channelLayout === 'stereo'
  && value.oldStream.timeBase === '1/48000'
  && value.oldStream.startPts === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioStartSample
  && value.oldStream.durationTs === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioEndSample
  && value.oldStream.initialPadding
    === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioInitialPadding
  && value.oldStream.extradataSize
    === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioExtradataSize
  && value.oldStream.extradataSha256
    === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioExtradataSha256;

const audioPacketClockIsExact = (value) => exactFields(value, ['oldPacketClock', 'newPacketClock'])
  && exactFields(value.oldPacketClock, [
    'packetCount', 'firstPts', 'packetEndSample', 'skipSamples', 'discardPadding',
    'canonicalPacketSha256',
  ])
  && exactFields(value.newPacketClock, [
    'packetCount', 'firstPts', 'packetEndSample', 'skipSamples', 'discardPadding',
    'canonicalPacketSha256',
  ])
  && canonicalJson(value.oldPacketClock) === canonicalJson(value.newPacketClock)
  && value.oldPacketClock.packetCount === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioPacketCount
  && value.oldPacketClock.firstPts === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioStartSample
  && value.oldPacketClock.packetEndSample === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.audioEndSample
  && Number.isInteger(value.oldPacketClock.skipSamples)
  && value.oldPacketClock.skipSamples >= 0
  && Number.isInteger(value.oldPacketClock.discardPadding)
  && value.oldPacketClock.discardPadding >= 0
  && isSha256(value.oldPacketClock.canonicalPacketSha256);

const payloadPairIsExact = (value, oldField, newField) => exactFields(value, [oldField, newField])
  && exactFields(value[oldField], ['byteCount', 'payloadSha256'])
  && Number.isInteger(value[oldField].byteCount)
  && value[oldField].byteCount > 0
  && isSha256(value[oldField].payloadSha256)
  && canonicalJson(value[oldField]) === canonicalJson(value[newField]);

const sttTransferIsExact = (value) => {
  if (!exactFields(value, ['stt', 'oldChunk16Pcm', 'newChunk16Pcm'])) return false;
  const stt = value.stt;
  const expected = FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001;
  return isObject(stt)
    && exactFields(stt, ['manifest', 'transcript', 'wordTimestamps', 'chunk16Flac'])
    && exactFields(stt.manifest, [
      'fileSha256', 'partial', 'fullChunkCount', 'processedChunkCount', 'chunkCount',
      'chunksContinuous', 'chunk16',
    ])
    && exactFields(stt.transcript, ['fileSha256', 'partial', 'durationMs', 'segmentCount'])
    && exactFields(stt.wordTimestamps, [
      'fileSha256', 'wordCount', 'declaredWordCount', 'wordsValid', 'boundaryContexts',
    ])
    && exactFields(stt.chunk16Flac, ['fileSha256'])
    && stt.manifest.fileSha256 === expected.sttManifestSha256
    && stt.manifest.partial === false
    && stt.manifest.fullChunkCount === 74
    && stt.manifest.processedChunkCount === 74
    && stt.manifest.chunkCount === 74
    && stt.manifest.chunksContinuous === true
    && canonicalJson(stt.manifest.chunk16)
      === canonicalJson({index: expected.chunkIndex, startMs: expected.chunkStartMs, endMs: expected.chunkEndMs})
    && stt.transcript.fileSha256 === expected.sttTranscriptSha256
    && stt.transcript.partial === false
    && stt.transcript.durationMs === expected.sttDurationMs
    && stt.transcript.segmentCount === expected.sttSegmentCount
    && stt.wordTimestamps.fileSha256 === expected.sttWordTimestampsSha256
    && stt.wordTimestamps.wordsValid === true
    && stt.wordTimestamps.wordCount === expected.sttWordCount
    && stt.wordTimestamps.declaredWordCount === expected.sttWordCount
    && Array.isArray(stt.wordTimestamps.boundaryContexts)
    && stt.wordTimestamps.boundaryContexts.every((context) => exactFields(
      context,
      ['boundaryMs', 'beforeWordId', 'afterWordId'],
    ))
    && canonicalJson(stt.wordTimestamps.boundaryContexts)
      === canonicalJson(expected.sttBoundaryContexts)
    && stt.chunk16Flac.fileSha256 === expected.sttChunk16FlacSha256
    && exactFields(value.oldChunk16Pcm, ['byteCount', 'payloadSha256'])
    && exactFields(value.newChunk16Pcm, ['byteCount', 'payloadSha256'])
    && Number.isInteger(value.oldChunk16Pcm.byteCount)
    && value.oldChunk16Pcm.byteCount === 3840000
    && value.oldChunk16Pcm.payloadSha256 === expected.sttChunk16PcmSha256
    && canonicalJson(value.oldChunk16Pcm) === canonicalJson(value.newChunk16Pcm);
};

const semanticCheckStatuses = (artifact) => {
  const expected = FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001;
  const provenance = artifact?.provenance;
  const refs = artifact?.artifacts;
  const formal = artifact?.formalEntry;
  const videoClock = artifact?.videoClock;
  const audio = artifact?.audioEquivalence;
  const audioRootExact = exactFields(audio, [
    'oldStream', 'newStream', 'oldPacketClock', 'newPacketClock', 'oldPacketPayload',
    'newPacketPayload', 'oldDecodedPcm', 'newDecodedPcm',
  ]);
  return new Map([
    ['provenance', provenanceIsExact(provenance)],
    ['frozen-file-hashes', isObject(refs)
      && refs.oldReviewMedia?.fileSha256 === expected.oldMediaSha256
      && refs.format299Video?.fileSha256 === expected.format299VideoSha256
      && refs.newExecutionMedia?.fileSha256 === expected.newExecutionMediaSha256
      && refs.infoJson?.fileSha256 === expected.infoJsonSha256
      && refs.sttManifest?.fileSha256 === expected.sttManifestSha256
      && refs.sttTranscript?.fileSha256 === expected.sttTranscriptSha256
      && refs.sttWordTimestamps?.fileSha256 === expected.sttWordTimestampsSha256
      && refs.sttChunk16Flac?.fileSha256 === expected.sttChunk16FlacSha256],
    ['formal-entry', formalEntryIsExact(formal)],
    ['format299-video-stream-copy', videoStreamCopyIsExact(artifact?.videoStreamCopy)],
    ['video-clock', exactFields(videoClock, ['oldReviewMedia', 'newExecutionMedia'])
      && videoClockMatchesExpected(videoClock.oldReviewMedia)
      && videoClockMatchesExpected(videoClock.newExecutionMedia)
      && canonicalJson(videoClock.oldReviewMedia) === canonicalJson(videoClock.newExecutionMedia)],
    ['audio-stream', audioRootExact
      && audioStreamIsExact({oldStream: audio?.oldStream, newStream: audio?.newStream})],
    ['audio-packet-clock', audioRootExact && audioPacketClockIsExact({
      oldPacketClock: audio?.oldPacketClock,
      newPacketClock: audio?.newPacketClock,
    })],
    ['audio-packet-payload', audioRootExact && payloadPairIsExact({
      oldPacketPayload: audio?.oldPacketPayload,
      newPacketPayload: audio?.newPacketPayload,
    }, 'oldPacketPayload', 'newPacketPayload')],
    ['audio-decoded-pcm', audioRootExact && payloadPairIsExact({
      oldDecodedPcm: audio?.oldDecodedPcm,
      newDecodedPcm: audio?.newDecodedPcm,
    }, 'oldDecodedPcm', 'newDecodedPcm')],
    ['stt-transfer', sttTransferIsExact(artifact?.sttTransfer)],
    ['browser-playback', validatePresentationBrowserPlaybackObservationV001(artifact?.browserPlayback)
      && artifact?.browserPlayback?.mediaFileSha256 === refs?.newExecutionMedia?.fileSha256],
  ]);
};

const CHECK_FAILURE_CONTRACT = Object.freeze({
  provenance: 'MEDIA_EQUIVALENCE_PROVENANCE_MISMATCH',
  'frozen-file-hashes': 'MEDIA_EQUIVALENCE_FILE_HASH_MISMATCH',
  'formal-entry': 'MEDIA_EQUIVALENCE_FORMAL_ENTRY_FAILED',
  'format299-video-stream-copy': 'MEDIA_EQUIVALENCE_VIDEO_STREAM_COPY_MISMATCH',
  'video-clock': 'MEDIA_EQUIVALENCE_VIDEO_CLOCK_MISMATCH',
  'audio-stream': 'MEDIA_EQUIVALENCE_AUDIO_STREAM_MISMATCH',
  'audio-packet-clock': 'MEDIA_EQUIVALENCE_AUDIO_PACKET_CLOCK_MISMATCH',
  'audio-packet-payload': 'MEDIA_EQUIVALENCE_AUDIO_PACKET_PAYLOAD_MISMATCH',
  'audio-decoded-pcm': 'MEDIA_EQUIVALENCE_AUDIO_PCM_MISMATCH',
  'stt-transfer': 'MEDIA_EQUIVALENCE_STT_TRANSFER_MISMATCH',
  'browser-playback': 'MEDIA_EQUIVALENCE_BROWSER_OBSERVATION_INVALID',
});

export const validatePresentationSourceMediaEquivalenceV001 = (artifact) => {
  const violations = [];
  const add = (code, path, details = null) => violations.push({code, path, details});
  const rootFields = [
    'schemaVersion', 'equivalenceId', 'sourceVideoId', 'status', 'provenance', 'artifacts',
    'formalEntry', 'videoStreamCopy', 'videoClock', 'audioEquivalence', 'sttTransfer',
    'browserPlayback', 'checks', 'violations',
  ];
  if (!exactFields(artifact, rootFields)) add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$');
  if (artifact?.schemaVersion !== PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION) {
    add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.schemaVersion');
  }
  if (!isNonEmptyString(artifact?.equivalenceId)) add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.equivalenceId');
  if (artifact?.sourceVideoId !== FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.sourceVideoId) {
    add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.sourceVideoId');
  }
  if (!['passed', 'failed'].includes(artifact?.status)) add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.status');
  const artifactFields = [
    'oldReviewMedia', 'format299Video', 'newExecutionMedia', 'infoJson', 'sttManifest',
    'sttTranscript', 'sttWordTimestamps', 'sttChunk16Flac',
  ];
  if (!exactFields(artifact?.artifacts, artifactFields)
      || artifactFields.some((field) => !validHashRef(artifact?.artifacts?.[field]))) {
    add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.artifacts');
  }
  const semantic = semanticCheckStatuses(artifact);
  const checksValid = Array.isArray(artifact?.checks)
    && artifact.checks.length === PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_CHECK_IDS_V001.length
    && artifact.checks.every((check, index) => (
      exactFields(check, ['checkId', 'status'])
      && check.checkId === PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_CHECK_IDS_V001[index]
      && ['passed', 'failed'].includes(check.status)
      && check.status === (semantic.get(check.checkId) ? 'passed' : 'failed')
    ));
  if (!checksValid) add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.checks', {reason: 'required-check-set-or-result-mismatch'});
  const violationsStructurallyValid = Array.isArray(artifact?.violations)
    && artifact.violations.every((violation) => (
    exactFields(violation, ['code', 'path', 'details'])
    && PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_VIOLATION_CODES.includes(violation.code)
    && isNonEmptyString(violation.path)
    ));
  if (!violationsStructurallyValid) add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.violations');
  const expectedFailures = PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_CHECK_IDS_V001
    .filter((checkId) => !semantic.get(checkId))
    .map((checkId) => ({
      code: CHECK_FAILURE_CONTRACT[checkId],
      path: `$.checks.${checkId}`,
    }));
  const recordedFailures = violationsStructurallyValid ? artifact.violations.map((violation) => ({
    code: violation.code,
    path: violation.path,
  })) : [];
  if (canonicalJson(recordedFailures) !== canonicalJson(expectedFailures)) {
    add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.violations', {
      reason: 'failure-evidence-set-mismatch',
    });
  }
  const allSemanticPassed = [...semantic.values()].every(Boolean);
  const expectedStatus = allSemanticPassed ? 'passed' : 'failed';
  if (artifact?.status !== expectedStatus || !checksValid
      || canonicalJson(recordedFailures) !== canonicalJson(expectedFailures)) {
    add('MEDIA_EQUIVALENCE_INPUT_INVALID', '$.status', {
      reason: expectedStatus === 'passed'
        ? 'passed-evidence-status-mismatch'
        : 'failed-evidence-status-mismatch',
    });
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
};

const inspectVideoFrameClock = async (filePath) => {
  const probe = await ffprobeJson([
    '-select_streams', 'v:0',
    '-show_entries', 'stream=r_frame_rate,avg_frame_rate,time_base,start_pts,duration_ts,nb_frames',
    '-of', 'json',
    filePath,
  ]);
  const stream = probe.streams?.[0] ?? {};
  const hash = createHash('sha256');
  let frameCount = 0;
  let firstPts = null;
  let lastPts = null;
  await runLines('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_frames',
    '-show_entries', 'frame=pts,best_effort_timestamp',
    '-of', 'compact=p=0:nk=0',
    filePath,
  ], (line) => {
    const frame = parseCompact(line);
    const pts = Number(frame.pts ?? frame.best_effort_timestamp);
    if (!Number.isInteger(pts)) throw new Error(`video frame ${frameCount}: PTSが整数ではありません`);
    const expectedPts = frameCount * FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.videoFramePtsStep;
    if (pts !== expectedPts) throw new Error(`video frame ${frameCount}: PTS ${pts} != ${expectedPts}`);
    firstPts ??= pts;
    lastPts = pts;
    hash.update(`${frameCount}|${pts}\n`);
    frameCount += 1;
  });
  return {
    frameRate: stream.r_frame_rate ?? null,
    averageFrameRate: stream.avg_frame_rate ?? null,
    timeBase: stream.time_base ?? null,
    startPts: Number(stream.start_pts),
    durationTs: Number(stream.duration_ts),
    declaredFrameCount: Number(stream.nb_frames),
    decodedFrameCount: frameCount,
    firstPts,
    lastPts,
    endMs: frameCount * 1000 / 60,
    canonicalPtsSha256: hash.digest('hex'),
  };
};

const inspectVideoStream = async (filePath) => {
  const probe = await ffprobeJson([
    '-select_streams', 'v:0',
    '-show_entries',
    'stream=codec_name,profile,level,width,height,pix_fmt,time_base,start_pts,duration_ts,extradata,extradata_size',
    '-show_data',
    '-of', 'json',
    filePath,
  ]);
  const stream = probe.streams?.[0] ?? {};
  return {
    codec: stream.codec_name ?? null,
    profile: stream.profile ?? null,
    level: Number(stream.level),
    width: Number(stream.width),
    height: Number(stream.height),
    pixelFormat: stream.pix_fmt ?? null,
    timeBase: stream.time_base ?? null,
    startPts: Number(stream.start_pts),
    durationTs: Number(stream.duration_ts),
    extradataSize: Number(stream.extradata_size),
    extradataSha256: sha256Bytes(stream.extradata ?? ''),
  };
};

const inspectVideoPacketClock = async (filePath) => {
  const hash = createHash('sha256');
  let packetCount = 0;
  let firstPts = null;
  let packetEndPts = null;
  await runLines('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_packets',
    '-show_entries', 'packet=pts,dts,duration,size,flags',
    '-of', 'compact=p=0:nk=0',
    filePath,
  ], (line) => {
    const packet = parseCompact(line);
    const pts = Number(packet.pts);
    const dts = Number(packet.dts);
    const duration = Number(packet.duration);
    const size = Number(packet.size);
    const flags = packet.flags ?? '';
    if (![pts, dts, duration, size].every(Number.isInteger) || duration <= 0 || size <= 0) {
      throw new Error(`video packet ${packetCount}: 時刻またはsizeが不正です`);
    }
    firstPts ??= pts;
    packetEndPts = Math.max(packetEndPts ?? 0, pts + duration);
    hash.update(`${packetCount}|${pts}|${dts}|${duration}|${size}|${flags}\n`);
    packetCount += 1;
  });
  return {
    packetCount,
    firstPts,
    packetEndPts,
    canonicalPacketSha256: hash.digest('hex'),
  };
};

const inspectVideoPayload = (filePath) => runHashStdout('ffmpeg', [
  '-v', 'error',
  '-i', filePath,
  '-map', '0:v:0',
  '-c', 'copy',
  '-f', 'data',
  'pipe:1',
]);

const inspectAudioStream = async (filePath) => {
  const probe = await ffprobeJson([
    '-select_streams', 'a:0',
    '-show_entries',
    'stream=codec_name,sample_rate,channels,channel_layout,time_base,start_pts,duration_ts,initial_padding,extradata,extradata_size',
    '-show_data',
    '-of', 'json',
    filePath,
  ]);
  const stream = probe.streams?.[0] ?? {};
  return {
    codec: stream.codec_name ?? null,
    sampleRate: Number(stream.sample_rate),
    channels: Number(stream.channels),
    channelLayout: stream.channel_layout ?? null,
    timeBase: stream.time_base ?? null,
    startPts: Number(stream.start_pts),
    durationTs: Number(stream.duration_ts),
    initialPadding: Number(stream.initial_padding),
    extradataSize: Number(stream.extradata_size),
    extradataSha256: sha256Bytes(stream.extradata ?? ''),
  };
};

const inspectAudioPacketClock = async (filePath) => {
  const hash = createHash('sha256');
  let packetCount = 0;
  let firstPts = null;
  let packetEndSample = null;
  let skipSamples = 0;
  let discardPadding = 0;
  await runLines('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_packets',
    '-show_entries', 'packet=pts,dts,duration,size,flags,side_data_list',
    '-of', 'compact=p=0:nk=0',
    filePath,
  ], (line) => {
    const packet = parseCompact(line);
    const pts = Number(packet.pts);
    const dts = Number(packet.dts);
    const duration = Number(packet.duration);
    const size = Number(packet.size);
    if (![pts, dts, duration, size].every(Number.isInteger) || duration <= 0 || size <= 0) {
      throw new Error(`audio packet ${packetCount}: 時刻またはsizeが不正です`);
    }
    firstPts ??= pts;
    packetEndSample = Math.max(packetEndSample ?? 0, pts + duration);
    if (packet.skip_samples !== undefined) skipSamples += Number(packet.skip_samples);
    if (packet.discard_padding !== undefined) discardPadding += Number(packet.discard_padding);
    hash.update(`${line}\n`);
    packetCount += 1;
  });
  return {
    packetCount,
    firstPts,
    packetEndSample,
    skipSamples,
    discardPadding,
    canonicalPacketSha256: hash.digest('hex'),
  };
};

const inspectAudioPayload = (filePath) => runHashStdout('ffmpeg', [
  '-v', 'error',
  '-i', filePath,
  '-map', '0:a:0',
  '-c', 'copy',
  '-f', 'data',
  'pipe:1',
]);

const inspectDecodedAudio = (filePath) => runHashStdout('ffmpeg', [
  '-v', 'error',
  '-i', filePath,
  '-map', '0:a:0',
  '-ac', '2',
  '-ar', '48000',
  '-sample_fmt', 'flt',
  '-f', 'f32le',
  'pipe:1',
]);

const inspectChunk16Pcm = (filePath) => runHashStdout('ffmpeg', [
  '-v', 'error',
  '-ss', '1920.000',
  '-i', filePath,
  '-t', '120.000',
  '-vn',
  '-ac', '1',
  '-ar', '16000',
  '-sample_fmt', 's16',
  '-f', 's16le',
  'pipe:1',
]);

const inspectStt = async ({manifestPath, transcriptPath, wordTimestampsPath, chunk16FlacPath}) => {
  const [manifestBytes, transcriptBytes, wordsBytes] = await Promise.all([
    readFile(manifestPath),
    readFile(transcriptPath),
    readFile(wordTimestampsPath),
  ]);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const transcript = JSON.parse(transcriptBytes.toString('utf8'));
  const timestamps = JSON.parse(wordsBytes.toString('utf8'));
  const words = Array.isArray(timestamps.words) ? timestamps.words : [];
  let wordsValid = true;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (!Number.isInteger(word.startMs) || !Number.isInteger(word.endMs)
        || word.startMs < 0 || word.startMs >= word.endMs
        || word.endMs > Math.round(transcript.durationSec * 1000)) {
      wordsValid = false;
      break;
    }
    if (index > 0 && word.startMs < words[index - 1].startMs) {
      wordsValid = false;
      break;
    }
  }
  const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
  const transcriptDurationMs = Math.round(transcript.durationSec * 1000);
  const chunksContinuous = chunks.length === 74 && chunks.every((chunk, index) => (
    chunk.index === index
    && Number.isInteger(chunk.startMs)
    && Number.isInteger(chunk.endMs)
    && chunk.startMs === (index === 0 ? 0 : chunks[index - 1].endMs)
    && chunk.endMs > chunk.startMs
    && (index === chunks.length - 1
      ? chunk.endMs === transcriptDurationMs
      : chunk.endMs - chunk.startMs === 120000)
  ));
  const chunk16 = chunks.find((chunk) => chunk.index === 16) ?? null;
  const reviewBoundaries = [
    FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.candidateOuterRange.startMs,
    FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.candidateOuterRange.endMs,
    ...FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.reviewGaps.flatMap((gap) => [gap.startMs, gap.endMs]),
  ];
  const boundaryContexts = reviewBoundaries.map((boundaryMs) => ({
    boundaryMs,
    beforeWordId: words.filter((word) => word.endMs <= boundaryMs).at(-1)?.segmentId ?? null,
    afterWordId: words.find((word) => word.startMs >= boundaryMs)?.segmentId ?? null,
  }));
  return {
    manifest: {
      fileSha256: sha256Bytes(manifestBytes),
      partial: manifest.partial,
      fullChunkCount: manifest.fullChunkCount,
      processedChunkCount: manifest.processedChunkCount,
      chunkCount: chunks.length,
      chunksContinuous,
      chunk16: chunk16 ? {index: chunk16.index, startMs: chunk16.startMs, endMs: chunk16.endMs} : null,
    },
    transcript: {
      fileSha256: sha256Bytes(transcriptBytes),
      partial: transcript.partial,
      durationMs: transcriptDurationMs,
      segmentCount: transcript.segmentCount,
    },
    wordTimestamps: {
      fileSha256: sha256Bytes(wordsBytes),
      wordCount: words.length,
      declaredWordCount: timestamps.wordCount,
      wordsValid,
      boundaryContexts,
    },
    chunk16Flac: {
      fileSha256: await fileSha256(chunk16FlacPath),
    },
  };
};

export const makePresentationSourceMediaFileRefV001 = async (filePath) => {
  if (!isNonEmptyString(filePath)) throw new TypeError('filePath is required');
  const absolutePath = resolve(WORKSPACE_ROOT, filePath);
  const workspaceRelativePath = relative(WORKSPACE_ROOT, absolutePath);
  if (workspaceRelativePath === '' || workspaceRelativePath === '..'
      || workspaceRelativePath.startsWith(`..${sep}`) || workspaceRelativePath.startsWith(sep)) {
    throw new TypeError('media evidence file must stay inside workspace');
  }
  const fileStat = await lstat(absolutePath);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new TypeError('media evidence file must be a regular non-symlink file');
  }
  const resolvedPath = await realpath(absolutePath);
  const resolvedRelativePath = relative(WORKSPACE_ROOT, resolvedPath);
  if (resolvedRelativePath === '' || resolvedRelativePath === '..'
      || resolvedRelativePath.startsWith(`..${sep}`) || resolvedRelativePath.startsWith(sep)) {
    throw new TypeError('media evidence real path must stay inside workspace');
  }
  return {
    path: workspaceRelativePath.split(sep).join('/'),
    fileSha256: await fileSha256(resolvedPath),
  };
};

const sameCanonical = (left, right) => canonicalJson(left) === canonicalJson(right);

export const validatePresentationBrowserPlaybackObservationV001 = (observation) => {
  const fields = [
    'schemaVersion', 'status', 'browserName', 'browserVersion', 'userAgent', 'pageUrl',
    'mediaUrl', 'mediaFileSha256', 'metadataLoaded', 'naturalWidth', 'naturalHeight',
    'seekTargetMs', 'seeked', 'currentTimeAdvanced', 'mediaError', 'serverContract',
  ];
  const observedEdgeVersion = observation?.userAgent?.match(/\bEdg\/([0-9.]+)/u)?.[1] ?? null;
  return exactFields(observation, fields)
    && observation.schemaVersion === PRESENTATION_BROWSER_PLAYBACK_OBSERVATION_SCHEMA_VERSION
    && observation.status === 'passed'
    && observation.browserName === 'Microsoft Edge'
    && isNonEmptyString(observation.browserVersion)
    && isNonEmptyString(observation.userAgent)
    && observedEdgeVersion === observation.browserVersion
    && observation.pageUrl === PRESENTATION_BROWSER_PLAYBACK_PAGE_URL_V001
    && observation.mediaUrl === PRESENTATION_BROWSER_PLAYBACK_MEDIA_URL_V001
    && observation.mediaFileSha256
      === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.newExecutionMediaSha256
    && observation.metadataLoaded === true
    && observation.naturalWidth === 1920
    && observation.naturalHeight === 1080
    && observation.seekTargetMs
      === FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001.candidateOuterRange.startMs
    && observation.seeked === true
    && observation.currentTimeAdvanced === true
    && observation.mediaError === null
    && observation.serverContract === PRESENTATION_BROWSER_PLAYBACK_SERVER_CONTRACT_V001;
};

export const finalizePresentationSourceMediaEquivalenceBrowserPlaybackV001 = (
  inspectedArtifact,
  browserPlayback,
) => {
  const artifact = structuredClone(inspectedArtifact);
  const browserCheck = artifact.checks?.find((check) => check.checkId === 'browser-playback');
  if (!browserCheck) throw new TypeError('browser-playback check is missing');
  const passed = validatePresentationBrowserPlaybackObservationV001(browserPlayback)
    && browserPlayback.mediaFileSha256 === artifact.artifacts?.newExecutionMedia?.fileSha256;
  artifact.browserPlayback = structuredClone(browserPlayback);
  browserCheck.status = passed ? 'passed' : 'failed';
  artifact.violations = (artifact.violations ?? []).filter((violation) => (
    violation.path !== '$.checks.browser-playback'
  ));
  if (!passed) {
    artifact.violations.push({
      code: 'MEDIA_EQUIVALENCE_BROWSER_OBSERVATION_INVALID',
      path: '$.checks.browser-playback',
      details: browserPlayback,
    });
  }
  artifact.status = artifact.checks.every((check) => check.status === 'passed')
    && artifact.violations.length === 0 ? 'passed' : 'failed';
  const validation = validatePresentationSourceMediaEquivalenceV001(artifact);
  if (validation.status !== 'passed') {
    throw new TypeError(`final media equivalence artifact is invalid: ${JSON.stringify(validation.violations)}`);
  }
  return {artifact, artifactSha256: sha256Canonical(artifact)};
};

/**
 * 旧確認媒体とnative 1080p実行媒体を、許容差なしで実検査する。
 * browserPlaybackは同じ媒体をHTTP経路で再生した後の観測値を別工程から渡す。
 */
export const inspectPresentationSourceMediaEquivalenceV001 = async ({
  equivalenceId,
  oldReviewMediaPath,
  format299VideoPath,
  newExecutionMediaPath,
  infoJsonPath,
  sttManifestPath,
  sttTranscriptPath,
  sttWordTimestampsPath,
  sttChunk16FlacPath,
  acquisitionCommand,
  muxCommand,
  browserPlayback = null,
}) => {
  const requiredStrings = {
    equivalenceId,
    oldReviewMediaPath,
    format299VideoPath,
    newExecutionMediaPath,
    infoJsonPath,
    sttManifestPath,
    sttTranscriptPath,
    sttWordTimestampsPath,
    sttChunk16FlacPath,
    acquisitionCommand,
    muxCommand,
  };
  for (const [field, value] of Object.entries(requiredStrings)) {
    if (!isNonEmptyString(value)) throw new TypeError(`${field} is required`);
  }
  const expected = FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001;
  const [
    oldReviewMedia,
    format299Video,
    newExecutionMedia,
    infoJson,
    sttManifest,
    sttTranscript,
    sttWordTimestamps,
    sttChunk16Flac,
  ] = await Promise.all([
    makePresentationSourceMediaFileRefV001(oldReviewMediaPath),
    makePresentationSourceMediaFileRefV001(format299VideoPath),
    makePresentationSourceMediaFileRefV001(newExecutionMediaPath),
    makePresentationSourceMediaFileRefV001(infoJsonPath),
    makePresentationSourceMediaFileRefV001(sttManifestPath),
    makePresentationSourceMediaFileRefV001(sttTranscriptPath),
    makePresentationSourceMediaFileRefV001(sttWordTimestampsPath),
    makePresentationSourceMediaFileRefV001(sttChunk16FlacPath),
  ]);
  const info = JSON.parse(await readFile(infoJsonPath, 'utf8'));
  const format299 = info.formats?.find((format) => String(format.format_id) === '299') ?? null;
  const format251 = info.formats?.find((format) => String(format.format_id) === '251') ?? null;
  const provenance = {
    channelId: info.channel_id ?? null,
    webpageUrl: info.webpage_url ?? null,
    format299: format299 ? {
      formatId: String(format299.format_id),
      extension: format299.ext,
      videoCodec: format299.vcodec,
      audioCodec: format299.acodec,
      width: format299.width,
      height: format299.height,
      framesPerSecond: format299.fps,
    } : null,
    format251: format251 ? {
      formatId: String(format251.format_id),
      extension: format251.ext,
      videoCodec: format251.vcodec,
      audioCodec: format251.acodec,
    } : null,
    acquisitionCommand,
    muxCommand,
  };

  const [
    oldVideoClock,
    newVideoClock,
    format299VideoStream,
    newVideoStream,
    format299VideoPacketClock,
    newVideoPacketClock,
    format299VideoPayload,
    newVideoPayload,
    oldAudioStream,
    newAudioStream,
  ] = await Promise.all([
    inspectVideoFrameClock(oldReviewMediaPath),
    inspectVideoFrameClock(newExecutionMediaPath),
    inspectVideoStream(format299VideoPath),
    inspectVideoStream(newExecutionMediaPath),
    inspectVideoPacketClock(format299VideoPath),
    inspectVideoPacketClock(newExecutionMediaPath),
    inspectVideoPayload(format299VideoPath),
    inspectVideoPayload(newExecutionMediaPath),
    inspectAudioStream(oldReviewMediaPath),
    inspectAudioStream(newExecutionMediaPath),
  ]);
  const [oldPacketClock, newPacketClock, oldPayload, newPayload, oldPcm, newPcm] = await Promise.all([
    inspectAudioPacketClock(oldReviewMediaPath),
    inspectAudioPacketClock(newExecutionMediaPath),
    inspectAudioPayload(oldReviewMediaPath),
    inspectAudioPayload(newExecutionMediaPath),
    inspectDecodedAudio(oldReviewMediaPath),
    inspectDecodedAudio(newExecutionMediaPath),
  ]);
  const [oldChunk16Pcm, newChunk16Pcm, stt, formalEntry] = await Promise.all([
    inspectChunk16Pcm(oldReviewMediaPath),
    inspectChunk16Pcm(newExecutionMediaPath),
    inspectStt({
      manifestPath: sttManifestPath,
      transcriptPath: sttTranscriptPath,
      wordTimestampsPath: sttWordTimestampsPath,
      chunk16FlacPath: sttChunk16FlacPath,
    }),
    inspectPresentationBaseMediaSourceV001(newExecutionMediaPath),
  ]);

  const checks = [];
  const violations = [];
  const check = (checkId, passed, code, details = null) => {
    checks.push({checkId, status: passed ? 'passed' : 'failed'});
    if (!passed) violations.push({code, path: `$.checks.${checkId}`, details});
  };
  check('provenance', info.id === expected.sourceVideoId && provenanceIsExact(provenance),
  'MEDIA_EQUIVALENCE_PROVENANCE_MISMATCH', provenance);
  check('frozen-file-hashes', oldReviewMedia.fileSha256 === expected.oldMediaSha256
    && format299Video.fileSha256 === expected.format299VideoSha256
    && newExecutionMedia.fileSha256 === expected.newExecutionMediaSha256
    && infoJson.fileSha256 === expected.infoJsonSha256
    && sttManifest.fileSha256 === expected.sttManifestSha256
    && sttTranscript.fileSha256 === expected.sttTranscriptSha256
    && sttWordTimestamps.fileSha256 === expected.sttWordTimestampsSha256
    && sttChunk16Flac.fileSha256 === expected.sttChunk16FlacSha256,
  'MEDIA_EQUIVALENCE_FILE_HASH_MISMATCH');
  check('formal-entry', formalEntryIsExact(formalEntry),
  'MEDIA_EQUIVALENCE_FORMAL_ENTRY_FAILED', formalEntry.source);
  const videoStreamCopy = {
    format299Video: {
      stream: format299VideoStream,
      packetClock: format299VideoPacketClock,
      packetPayload: format299VideoPayload,
    },
    newExecutionMedia: {
      stream: newVideoStream,
      packetClock: newVideoPacketClock,
      packetPayload: newVideoPayload,
    },
  };
  check('format299-video-stream-copy', videoStreamCopyIsExact(videoStreamCopy),
    'MEDIA_EQUIVALENCE_VIDEO_STREAM_COPY_MISMATCH', videoStreamCopy);
  check('video-clock', videoClockMatchesExpected(oldVideoClock)
    && videoClockMatchesExpected(newVideoClock)
    && sameCanonical(oldVideoClock, newVideoClock),
  'MEDIA_EQUIVALENCE_VIDEO_CLOCK_MISMATCH', {oldVideoClock, newVideoClock});
  check('audio-stream', audioStreamIsExact({oldStream: oldAudioStream, newStream: newAudioStream}),
  'MEDIA_EQUIVALENCE_AUDIO_STREAM_MISMATCH', {oldAudioStream, newAudioStream});
  check('audio-packet-clock', audioPacketClockIsExact({
    oldPacketClock,
    newPacketClock,
  }),
  'MEDIA_EQUIVALENCE_AUDIO_PACKET_CLOCK_MISMATCH', {oldPacketClock, newPacketClock});
  check('audio-packet-payload', payloadPairIsExact({
    oldPacketPayload: oldPayload,
    newPacketPayload: newPayload,
  }, 'oldPacketPayload', 'newPacketPayload'),
    'MEDIA_EQUIVALENCE_AUDIO_PACKET_PAYLOAD_MISMATCH', {oldPayload, newPayload});
  check('audio-decoded-pcm', payloadPairIsExact({
    oldDecodedPcm: oldPcm,
    newDecodedPcm: newPcm,
  }, 'oldDecodedPcm', 'newDecodedPcm'),
    'MEDIA_EQUIVALENCE_AUDIO_PCM_MISMATCH', {oldPcm, newPcm});
  const sttValid = stt.manifest.fileSha256 === expected.sttManifestSha256
    && stt.manifest.partial === false
    && stt.manifest.fullChunkCount === 74
    && stt.manifest.processedChunkCount === 74
    && stt.manifest.chunksContinuous === true
    && stt.manifest.chunk16?.index === expected.chunkIndex
    && stt.manifest.chunk16?.startMs === expected.chunkStartMs
    && stt.manifest.chunk16?.endMs === expected.chunkEndMs
    && stt.transcript.fileSha256 === expected.sttTranscriptSha256
    && stt.transcript.partial === false
    && stt.wordTimestamps.fileSha256 === expected.sttWordTimestampsSha256
    && stt.wordTimestamps.wordsValid === true
    && stt.wordTimestamps.boundaryContexts.every((context) => (
      context.beforeWordId !== null && context.afterWordId !== null
    ))
    && stt.chunk16Flac.fileSha256 === expected.sttChunk16FlacSha256
    && oldChunk16Pcm.payloadSha256 === expected.sttChunk16PcmSha256
    && newChunk16Pcm.payloadSha256 === expected.sttChunk16PcmSha256
    && oldChunk16Pcm.byteCount === newChunk16Pcm.byteCount;
  const sttTransfer = {stt, oldChunk16Pcm, newChunk16Pcm};
  check('stt-transfer', sttValid && sttTransferIsExact(sttTransfer),
  'MEDIA_EQUIVALENCE_STT_TRANSFER_MISMATCH', {
    stt,
    oldChunk16Pcm,
    newChunk16Pcm,
  });
  check('browser-playback', validatePresentationBrowserPlaybackObservationV001(browserPlayback)
    && browserPlayback.mediaFileSha256 === newExecutionMedia.fileSha256
    ,
  'MEDIA_EQUIVALENCE_BROWSER_OBSERVATION_INVALID', browserPlayback);
  const status = violations.length === 0 ? 'passed' : 'failed';
  const artifact = {
    schemaVersion: PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
    equivalenceId,
    sourceVideoId: expected.sourceVideoId,
    status,
    provenance,
    artifacts: {
      oldReviewMedia,
      format299Video,
      newExecutionMedia,
      infoJson,
      sttManifest,
      sttTranscript,
      sttWordTimestamps,
      sttChunk16Flac,
    },
    formalEntry,
    videoStreamCopy,
    videoClock: {oldReviewMedia: oldVideoClock, newExecutionMedia: newVideoClock},
    audioEquivalence: {
      oldStream: oldAudioStream,
      newStream: newAudioStream,
      oldPacketClock,
      newPacketClock,
      oldPacketPayload: oldPayload,
      newPacketPayload: newPayload,
      oldDecodedPcm: oldPcm,
      newDecodedPcm: newPcm,
    },
    sttTransfer,
    browserPlayback: browserPlayback === null ? null : structuredClone(browserPlayback),
    checks,
    violations,
  };
  const validation = validatePresentationSourceMediaEquivalenceV001(artifact);
  if (validation.status !== 'passed') {
    throw new Error(`generated media equivalence artifact is invalid: ${JSON.stringify(validation.violations)}`);
  }
  return {artifact, artifactSha256: sha256Canonical(artifact)};
};
