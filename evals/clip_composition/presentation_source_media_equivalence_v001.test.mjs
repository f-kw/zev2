import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm, symlink, writeFile} from 'node:fs/promises';
import {relative, resolve} from 'node:path';
import test from 'node:test';

import {
  FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001,
  PRESENTATION_BROWSER_PLAYBACK_MEDIA_URL_V001,
  PRESENTATION_BROWSER_PLAYBACK_OBSERVATION_SCHEMA_VERSION,
  PRESENTATION_BROWSER_PLAYBACK_PAGE_URL_V001,
  PRESENTATION_BROWSER_PLAYBACK_SERVER_CONTRACT_V001,
  PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_CHECK_IDS_V001,
  PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
  finalizePresentationSourceMediaEquivalenceBrowserPlaybackV001,
  makePresentationSourceMediaFileRefV001,
  validatePresentationBrowserPlaybackObservationV001,
  validatePresentationSourceMediaEquivalenceV001,
} from './presentation_source_media_equivalence_v001.mjs';

const expected = FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001;
const hash = (value) => String(value).repeat(64).slice(0, 64);
const ref = (name, fileSha256) => ({path: name, fileSha256});

const validBrowserObservation = (
  mediaFileSha256 = expected.newExecutionMediaSha256,
) => ({
  schemaVersion: PRESENTATION_BROWSER_PLAYBACK_OBSERVATION_SCHEMA_VERSION,
  status: 'passed',
  browserName: 'Microsoft Edge',
  browserVersion: '140.0.3485.54',
  userAgent: 'Mozilla/5.0 Edg/140.0.3485.54',
  pageUrl: PRESENTATION_BROWSER_PLAYBACK_PAGE_URL_V001,
  mediaUrl: PRESENTATION_BROWSER_PLAYBACK_MEDIA_URL_V001,
  mediaFileSha256,
  metadataLoaded: true,
  naturalWidth: 1920,
  naturalHeight: 1080,
  seekTargetMs: expected.candidateOuterRange.startMs,
  seeked: true,
  currentTimeAdvanced: true,
  mediaError: null,
  serverContract: PRESENTATION_BROWSER_PLAYBACK_SERVER_CONTRACT_V001,
});

const videoStreamEvidence = () => ({
  stream: {
    codec: 'h264', profile: 'High', level: 42, width: 1920, height: 1080,
    pixelFormat: 'yuv420p', timeBase: '1/15360', startPts: 0, durationTs: 135383040,
    extradataSize: expected.videoExtradataSize,
    extradataSha256: expected.videoExtradataSha256,
  },
  packetClock: {
    packetCount: expected.videoFrameCount, firstPts: 0, packetEndPts: 135383040,
    canonicalPacketSha256: expected.videoPacketCanonicalSha256,
  },
  packetPayload: {
    byteCount: expected.videoPayloadByteCount,
    payloadSha256: expected.videoPayloadSha256,
  },
});

const videoClockEvidence = () => ({
  frameRate: '60/1', averageFrameRate: '60/1', timeBase: '1/15360', startPts: 0,
  durationTs: 135383040, declaredFrameCount: expected.videoFrameCount,
  decodedFrameCount: expected.videoFrameCount, firstPts: 0,
  lastPts: (expected.videoFrameCount - 1) * expected.videoFramePtsStep,
  endMs: expected.videoEndMs,
  canonicalPtsSha256: expected.videoFrameClockCanonicalSha256,
});

const audioStreamEvidence = () => ({
  codec: 'opus', sampleRate: 48000, channels: 2, channelLayout: 'stereo',
  timeBase: '1/48000', startPts: expected.audioStartSample,
  durationTs: expected.audioEndSample, initialPadding: 312, extradataSize: 19,
  extradataSha256: expected.audioExtradataSha256,
});

const audioPacketEvidence = () => ({
  packetCount: expected.audioPacketCount, firstPts: expected.audioStartSample,
  packetEndSample: expected.audioEndSample, skipSamples: 312, discardPadding: 0,
  canonicalPacketSha256: hash('f'),
});

const formalEntryEvidence = () => ({
  source: {
    video: {
      width: 1920, height: 1080, frameRate: '60/1', timeBase: '1/60',
      decodedFrameCount: expected.videoFrameCount, firstPts: 0,
      lastPts: expected.videoFrameCount - 1, rotation: 0,
    },
    audio: {
      present: true, codec: 'opus', sampleRate: 48000, channels: 2,
      channelLayout: 'stereo', timeBase: '1/48000', firstDecodedPts: 0,
      lastDecodedPts: expected.audioEndSample - 960,
      presentationClock: {
        authority: 'stream-and-packet-v001', endSample: expected.audioEndSample,
        streamEndSample: expected.audioEndSample, packetEndSample: expected.audioEndSample,
        skipSamples: 312, discardPadding: 0,
      },
    },
  },
  fps: 60,
  decodedFrameCount: expected.videoFrameCount,
  logicalFrameCount: Math.ceil(expected.videoFrameCount / 2),
  audioClock: {
    sampleRate: 48000, channels: 2, channelLayout: 'stereo', spans: [],
    sourceGridSampleCount: expected.audioEndSample + 312,
    sourceGridMappingEndSample: expected.audioEndSample,
    decodedTailPaddingSampleCount: 312,
  },
});

const sttEvidence = () => ({
  stt: {
    manifest: {
      fileSha256: expected.sttManifestSha256, partial: false, fullChunkCount: 74,
      processedChunkCount: 74, chunkCount: 74, chunksContinuous: true,
      chunk16: {index: 16, startMs: 1920000, endMs: 2040000},
    },
    transcript: {
      fileSha256: expected.sttTranscriptSha256, partial: false,
      durationMs: expected.sttDurationMs, segmentCount: expected.sttSegmentCount,
    },
    wordTimestamps: {
      fileSha256: expected.sttWordTimestampsSha256, wordCount: expected.sttWordCount,
      declaredWordCount: expected.sttWordCount, wordsValid: true,
      boundaryContexts: structuredClone(expected.sttBoundaryContexts),
    },
    chunk16Flac: {fileSha256: expected.sttChunk16FlacSha256},
  },
  oldChunk16Pcm: {byteCount: 3840000, payloadSha256: expected.sttChunk16PcmSha256},
  newChunk16Pcm: {byteCount: 3840000, payloadSha256: expected.sttChunk16PcmSha256},
});

export const makeValidPresentationSourceMediaEquivalenceForTest = ({browser = true} = {}) => {
  const videoStream = videoStreamEvidence();
  const videoClock = videoClockEvidence();
  const audioStream = audioStreamEvidence();
  const audioPacket = audioPacketEvidence();
  const mediaHash = expected.newExecutionMediaSha256;
  const artifact = {
    schemaVersion: PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
    equivalenceId: 'equivalence-001',
    sourceVideoId: expected.sourceVideoId,
    status: browser ? 'passed' : 'failed',
    provenance: {
      channelId: expected.channelId,
      webpageUrl: expected.webpageUrl,
      format299: {
        formatId: '299', extension: 'mp4', videoCodec: 'avc1.64002a', audioCodec: 'none',
        width: 1920, height: 1080, framesPerSecond: 60,
      },
      format251: {
        formatId: '251', extension: 'webm', videoCodec: 'none', audioCodec: 'opus',
      },
      acquisitionCommand: expected.acquisitionCommand,
      muxCommand: expected.muxCommand,
    },
    artifacts: {
      oldReviewMedia: ref('old.mp4', expected.oldMediaSha256),
      format299Video: ref('299.mp4', expected.format299VideoSha256),
      newExecutionMedia: ref('new.mp4', mediaHash),
      infoJson: ref('info.json', expected.infoJsonSha256),
      sttManifest: ref('manifest.json', expected.sttManifestSha256),
      sttTranscript: ref('transcript.json', expected.sttTranscriptSha256),
      sttWordTimestamps: ref('word-timestamps.json', expected.sttWordTimestampsSha256),
      sttChunk16Flac: ref('chunk-0016.flac', expected.sttChunk16FlacSha256),
    },
    formalEntry: formalEntryEvidence(),
    videoStreamCopy: {
      format299Video: structuredClone(videoStream),
      newExecutionMedia: structuredClone(videoStream),
    },
    videoClock: {
      oldReviewMedia: structuredClone(videoClock),
      newExecutionMedia: structuredClone(videoClock),
    },
    audioEquivalence: {
      oldStream: structuredClone(audioStream), newStream: structuredClone(audioStream),
      oldPacketClock: structuredClone(audioPacket), newPacketClock: structuredClone(audioPacket),
      oldPacketPayload: {byteCount: 234567890, payloadSha256: hash('1')},
      newPacketPayload: {byteCount: 234567890, payloadSha256: hash('1')},
      oldDecodedPcm: {byteCount: 345678901, payloadSha256: hash('2')},
      newDecodedPcm: {byteCount: 345678901, payloadSha256: hash('2')},
    },
    sttTransfer: sttEvidence(),
    browserPlayback: browser ? validBrowserObservation(mediaHash) : null,
    checks: PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_CHECK_IDS_V001.map((checkId) => ({
      checkId,
      status: browser || checkId !== 'browser-playback' ? 'passed' : 'failed',
    })),
    violations: browser ? [] : [{
      code: 'MEDIA_EQUIVALENCE_BROWSER_OBSERVATION_INVALID',
      path: '$.checks.browser-playback',
      details: null,
    }],
  };
  return artifact;
};

test('初回実データ媒体の固定値を保持する', () => {
  assert.equal(expected.videoFrameCount, 528840);
  assert.equal(expected.audioPacketCount, 440701);
  assert.deepEqual(expected.reviewGaps, [
    {startMs: 1948058, endMs: 1949982},
    {startMs: 1977670, endMs: 1981394},
  ]);
});

test('内部証拠・全必須check・Edge観測が揃った媒体対応証明だけを受理する', () => {
  assert.deepEqual(
    validatePresentationSourceMediaEquivalenceV001(
      makeValidPresentationSourceMediaEquivalenceForTest(),
    ),
    {status: 'passed', violations: []},
  );
});

test('未知fieldとhash不正を拒否する', () => {
  const artifact = makeValidPresentationSourceMediaEquivalenceForTest();
  artifact.unregistered = true;
  artifact.artifacts.newExecutionMedia.fileSha256 = 'not-a-hash';
  const result = validatePresentationSourceMediaEquivalenceV001(artifact);
  assert.equal(result.status, 'failed');
  assert.equal(result.violations.some((item) => item.path === '$'), true);
  assert.equal(result.violations.some((item) => item.path === '$.artifacts'), true);
});

test('check欠落・空details・映像stream-copy不一致をpassedへ偽装できない', () => {
  const missing = makeValidPresentationSourceMediaEquivalenceForTest();
  missing.checks.pop();
  assert.equal(validatePresentationSourceMediaEquivalenceV001(missing).status, 'failed');

  const hollow = makeValidPresentationSourceMediaEquivalenceForTest();
  hollow.formalEntry = {};
  assert.equal(validatePresentationSourceMediaEquivalenceV001(hollow).status, 'failed');

  const remuxed = makeValidPresentationSourceMediaEquivalenceForTest();
  remuxed.videoStreamCopy.newExecutionMedia.packetPayload.payloadSha256 = hash('9');
  assert.equal(validatePresentationSourceMediaEquivalenceV001(remuxed).status, 'failed');

  const falseClock = makeValidPresentationSourceMediaEquivalenceForTest();
  for (const clock of Object.values(falseClock.videoClock)) {
    clock.durationTs = 1;
    clock.lastPts = 0;
  }
  assert.equal(validatePresentationSourceMediaEquivalenceV001(falseClock).status, 'failed');

  const falseStream = makeValidPresentationSourceMediaEquivalenceForTest();
  for (const evidence of Object.values(falseStream.videoStreamCopy)) {
    evidence.stream.level = 41;
    evidence.packetClock.canonicalPacketSha256 = hash('9');
  }
  assert.equal(validatePresentationSourceMediaEquivalenceV001(falseStream).status, 'failed');
});

test('Edge以外・固定URL以外・観測欠落をブラウザ実観測として受理しない', () => {
  const good = validBrowserObservation();
  assert.equal(validatePresentationBrowserPlaybackObservationV001(good), true);
  for (const mutate of [
    (value) => { value.browserName = 'Google Chrome'; },
    (value) => { value.userAgent = 'Mozilla/5.0 Chrome/140.0'; },
    (value) => { value.browserVersion = '140.0.3485.55'; },
    (value) => { value.pageUrl = 'http://127.0.0.1:4318/other.html'; },
    (value) => { value.mediaUrl = 'http://127.0.0.1:4318/other-media'; },
    (value) => { value.mediaFileSha256 = hash('9'); },
    (value) => { value.serverContract = 'other-server'; },
    (value) => { value.mediaError = {code: 4}; },
    (value) => { value.currentTimeAdvanced = false; },
    (value) => { delete value.browserVersion; },
  ]) {
    const observation = structuredClone(good);
    mutate(observation);
    assert.equal(validatePresentationBrowserPlaybackObservationV001(observation), false);
  }
});

test('実ブラウザ観測をartifact本体へ保存して全体合格へ更新する', () => {
  const artifact = makeValidPresentationSourceMediaEquivalenceForTest({browser: false});
  assert.deepEqual(validatePresentationSourceMediaEquivalenceV001(artifact), {
    status: 'passed',
    violations: [],
  });
  const observation = validBrowserObservation(artifact.artifacts.newExecutionMedia.fileSha256);
  const finalized = finalizePresentationSourceMediaEquivalenceBrowserPlaybackV001(
    artifact,
    observation,
  );
  assert.equal(finalized.artifact.status, 'passed');
  assert.deepEqual(finalized.artifact.browserPlayback, observation);
  assert.equal(finalized.artifact.violations.length, 0);
  assert.equal(finalized.artifact.checks.every((check) => check.status === 'passed'), true);
  assert.match(finalized.artifactSha256, /^[0-9a-f]{64}$/u);
});

test('絶対path入力をworkspace相対参照へ正規化しworkspace外とsymlinkを拒否する', async () => {
  const base = resolve('evals/clip_composition/outputs/presentation');
  await mkdir(base, {recursive: true});
  const directory = await mkdtemp(resolve(base, '.media-ref-test-'));
  try {
    const mediaPath = resolve(directory, 'media.bin');
    const linkPath = resolve(directory, 'media-link.bin');
    await writeFile(mediaPath, Buffer.from('media-evidence'));
    await symlink(mediaPath, linkPath);
    const artifactRef = await makePresentationSourceMediaFileRefV001(mediaPath);
    assert.equal(artifactRef.path, relative(resolve('.'), mediaPath));
    assert.match(artifactRef.fileSha256, /^[0-9a-f]{64}$/u);
    await assert.rejects(
      makePresentationSourceMediaFileRefV001(linkPath),
      /non-symlink/u,
    );
    await assert.rejects(
      makePresentationSourceMediaFileRefV001('/private/tmp/outside-media.bin'),
      /inside workspace/u,
    );
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
