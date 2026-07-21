import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import test from 'node:test';

import {
  PRESENTATION_ASSEMBLY_DECISION_SAVE_PREFLIGHT_SCHEMA_VERSION,
  PRESENTATION_FIRST_REAL_DATA_GATE_CHECKER_VERSION,
  PRESENTATION_FIRST_REAL_DATA_GATE_VIOLATION_CODES,
  PRESENTATION_INTERNAL_TRIM_HUMAN_REVIEW_RESULT_SCHEMA_VERSION,
  PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION,
  PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION,
  PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION,
  PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
  buildPresentationAssemblyDecisionSavePreflightV001,
  computePresentationRetainedSegmentsV001,
  loadPresentationFirstRealDataArtifactBindingV001,
  loadTrustedPresentationFirstRealDataBindingsV001,
  loadTrustedPresentationFirstRealDataRuntimeV001,
  openPresentationFirstRealDataVerifiedFileV001,
  presentationFirstRealDataCanonicalSha256,
  validatePresentationFirstRealDataArtifactChainV001,
  validatePresentationAssemblyDecisionSavePreflightV001,
  validatePresentationInternalTrimCandidateManifestV001,
  validatePresentationInternalTrimHumanReviewResultV001,
  validatePresentationRealDataBasisEditPlanV001,
  validatePresentationRealDataSourceIdentityV001,
  validatePresentationSourceMediaEquivalenceV001,
  verifyPresentationFirstRealDataFileReferenceV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {
  FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001,
  PRESENTATION_BROWSER_PLAYBACK_MEDIA_URL_V001,
  PRESENTATION_BROWSER_PLAYBACK_OBSERVATION_SCHEMA_VERSION,
  PRESENTATION_BROWSER_PLAYBACK_PAGE_URL_V001,
  PRESENTATION_BROWSER_PLAYBACK_SERVER_CONTRACT_V001,
  PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_CHECK_IDS_V001,
} from './presentation_source_media_equivalence_v001.mjs';

const hash = (character) => (character.codePointAt(0) % 16).toString(16).repeat(64);
const clone = (value) => structuredClone(value);
const ref = (name, character) => ({ path: `testdata/${name}.json`, fileSha256: hash(character) });
const expectedMedia = FIRST_REAL_DATA_MEDIA_EQUIVALENCE_EXPECTED_V001;
const ACTUAL_GATE_DIRECTORY = resolve(
  'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001',
);
const ACTUAL_SUMMARY_PATH = resolve(ACTUAL_GATE_DIRECTORY, 'artifact-build-summary.json');
const ACTUAL_CANDIDATE_MANIFEST_PATH = resolve(ACTUAL_GATE_DIRECTORY, 'candidate-manifest.json');
const executionMediaRef = () => ({
  path: 'evals/clip_composition/research/downloads/first-gate-unseen/DmWu0jVQfTE/native-1080p/execution.mp4',
  fileSha256: expectedMedia.newExecutionMediaSha256,
});
const sttReferences = () => ({
  manifest: {
    path: 'evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/manifest.json',
    fileSha256: expectedMedia.sttManifestSha256,
  },
  transcript: {
    path: 'evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/transcript.json',
    fileSha256: expectedMedia.sttTranscriptSha256,
  },
  wordTimestamps: {
    path: 'evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/word-timestamps.json',
    fileSha256: expectedMedia.sttWordTimestampsSha256,
  },
});

function makeMediaEquivalence() {
  const videoStream = {
    stream: {
      codec: 'h264', profile: 'High', level: 42, width: 1920, height: 1080,
      pixelFormat: 'yuv420p', timeBase: '1/15360', startPts: 0, durationTs: 135383040,
      extradataSize: expectedMedia.videoExtradataSize,
      extradataSha256: expectedMedia.videoExtradataSha256,
    },
    packetClock: {
      packetCount: expectedMedia.videoFrameCount, firstPts: 0, packetEndPts: 135383040,
      canonicalPacketSha256: expectedMedia.videoPacketCanonicalSha256,
    },
    packetPayload: {
      byteCount: expectedMedia.videoPayloadByteCount,
      payloadSha256: expectedMedia.videoPayloadSha256,
    },
  };
  const videoClock = {
    frameRate: '60/1', averageFrameRate: '60/1', timeBase: '1/15360', startPts: 0,
    durationTs: 135383040, declaredFrameCount: expectedMedia.videoFrameCount,
    decodedFrameCount: expectedMedia.videoFrameCount, firstPts: 0,
    lastPts: (expectedMedia.videoFrameCount - 1) * expectedMedia.videoFramePtsStep,
    endMs: expectedMedia.videoEndMs,
    canonicalPtsSha256: expectedMedia.videoFrameClockCanonicalSha256,
  };
  const audioStream = {
    codec: 'opus', sampleRate: 48000, channels: 2, channelLayout: 'stereo',
    timeBase: '1/48000', startPts: 0, durationTs: expectedMedia.audioEndSample,
    initialPadding: expectedMedia.audioInitialPadding,
    extradataSize: expectedMedia.audioExtradataSize,
    extradataSha256: expectedMedia.audioExtradataSha256,
  };
  const audioPacket = {
    packetCount: expectedMedia.audioPacketCount, firstPts: 0,
    packetEndSample: expectedMedia.audioEndSample, skipSamples: 312, discardPadding: 0,
    canonicalPacketSha256: hash('f'),
  };
  const executionMedia = executionMediaRef();
  const stt = sttReferences();
  const artifact = {
    schemaVersion: PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
    equivalenceId: 'dmwu-media-equivalence-v001',
    sourceVideoId: 'DmWu0jVQfTE',
    status: 'passed',
    provenance: {
      channelId: expectedMedia.channelId,
      webpageUrl: expectedMedia.webpageUrl,
      format299: {
        formatId: '299', extension: 'mp4', videoCodec: 'avc1.64002a', audioCodec: 'none',
        width: 1920, height: 1080, framesPerSecond: 60,
      },
      format251: {
        formatId: '251', extension: 'webm', videoCodec: 'none', audioCodec: 'opus',
      },
      acquisitionCommand: expectedMedia.acquisitionCommand,
      muxCommand: expectedMedia.muxCommand,
    },
    artifacts: {
      oldReviewMedia: { path: 'old.mp4', fileSha256: expectedMedia.oldMediaSha256 },
      format299Video: { path: '299.mp4', fileSha256: expectedMedia.format299VideoSha256 },
      newExecutionMedia: executionMedia,
      infoJson: { path: 'info.json', fileSha256: expectedMedia.infoJsonSha256 },
      sttManifest: stt.manifest,
      sttTranscript: stt.transcript,
      sttWordTimestamps: stt.wordTimestamps,
      sttChunk16Flac: { path: 'chunk-0016.flac', fileSha256: expectedMedia.sttChunk16FlacSha256 },
    },
    formalEntry: {
      source: {
        video: {
          width: 1920, height: 1080, frameRate: '60/1', timeBase: '1/60',
          decodedFrameCount: expectedMedia.videoFrameCount, firstPts: 0,
          lastPts: expectedMedia.videoFrameCount - 1, rotation: 0,
        },
        audio: {
          present: true, codec: 'opus', sampleRate: 48000, channels: 2,
          channelLayout: 'stereo', timeBase: '1/48000', firstDecodedPts: 0,
          lastDecodedPts: expectedMedia.audioEndSample - 960,
          presentationClock: {
            authority: 'stream-and-packet-v001', endSample: expectedMedia.audioEndSample,
            streamEndSample: expectedMedia.audioEndSample,
            packetEndSample: expectedMedia.audioEndSample, skipSamples: 312, discardPadding: 0,
          },
        },
      },
      fps: 60, decodedFrameCount: expectedMedia.videoFrameCount,
      logicalFrameCount: Math.ceil(expectedMedia.videoFrameCount / 2),
      audioClock: {
        sampleRate: 48000, channels: 2, channelLayout: 'stereo', spans: [],
        sourceGridSampleCount: expectedMedia.audioEndSample + 312,
        sourceGridMappingEndSample: expectedMedia.audioEndSample,
        decodedTailPaddingSampleCount: 312,
      },
    },
    videoStreamCopy: {
      format299Video: clone(videoStream), newExecutionMedia: clone(videoStream),
    },
    videoClock: { oldReviewMedia: clone(videoClock), newExecutionMedia: clone(videoClock) },
    audioEquivalence: {
      oldStream: clone(audioStream), newStream: clone(audioStream),
      oldPacketClock: clone(audioPacket), newPacketClock: clone(audioPacket),
      oldPacketPayload: { byteCount: 123456, payloadSha256: hash('1') },
      newPacketPayload: { byteCount: 123456, payloadSha256: hash('1') },
      oldDecodedPcm: { byteCount: 234567, payloadSha256: hash('2') },
      newDecodedPcm: { byteCount: 234567, payloadSha256: hash('2') },
    },
    sttTransfer: {
      stt: {
        manifest: {
          fileSha256: expectedMedia.sttManifestSha256, partial: false, fullChunkCount: 74,
          processedChunkCount: 74, chunkCount: 74, chunksContinuous: true,
          chunk16: { index: 16, startMs: 1920000, endMs: 2040000 },
        },
        transcript: {
          fileSha256: expectedMedia.sttTranscriptSha256, partial: false,
          durationMs: expectedMedia.sttDurationMs, segmentCount: expectedMedia.sttSegmentCount,
        },
        wordTimestamps: {
          fileSha256: expectedMedia.sttWordTimestampsSha256,
          wordCount: expectedMedia.sttWordCount,
          declaredWordCount: expectedMedia.sttWordCount,
          wordsValid: true,
          boundaryContexts: clone(expectedMedia.sttBoundaryContexts),
        },
        chunk16Flac: { fileSha256: expectedMedia.sttChunk16FlacSha256 },
      },
      oldChunk16Pcm: { byteCount: 3840000, payloadSha256: expectedMedia.sttChunk16PcmSha256 },
      newChunk16Pcm: { byteCount: 3840000, payloadSha256: expectedMedia.sttChunk16PcmSha256 },
    },
    browserPlayback: {
      schemaVersion: PRESENTATION_BROWSER_PLAYBACK_OBSERVATION_SCHEMA_VERSION,
      status: 'passed', browserName: 'Microsoft Edge', browserVersion: '150.0.0.0',
      userAgent: 'Mozilla/5.0 Edg/150.0.0.0',
      pageUrl: PRESENTATION_BROWSER_PLAYBACK_PAGE_URL_V001,
      mediaUrl: PRESENTATION_BROWSER_PLAYBACK_MEDIA_URL_V001,
      mediaFileSha256: executionMedia.fileSha256, metadataLoaded: true,
      naturalWidth: 1920, naturalHeight: 1080,
      seekTargetMs: expectedMedia.candidateOuterRange.startMs,
      seeked: true, currentTimeAdvanced: true, mediaError: null,
      serverContract: PRESENTATION_BROWSER_PLAYBACK_SERVER_CONTRACT_V001,
    },
    checks: PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_CHECK_IDS_V001.map((checkId) => ({
      checkId, status: 'passed',
    })),
    violations: [],
  };
  return artifact;
}

function makeSourceIdentity() {
  return {
    schemaVersion: PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION,
    sourceIdentityId: 'dmwu-source-v001',
    videoId: 'DmWu0jVQfTE',
    sourceUrl: 'https://www.youtube.com/watch?v=DmWu0jVQfTE',
    sourceProvenance: 'youtube-format-299-video+review-format-251-audio-v001',
    sourceRef: 'DmWu0jVQfTE-native-1080p-execution-v001',
    executionMedia: executionMediaRef(),
    mediaEquivalence: ref('media-equivalence', '1'),
    stt: sttReferences(),
  };
}

function makeBasisPlan() {
  return {
    schemaVersion: PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION,
    basisPlanId: 'dmwu-candidate-13-basis-v001',
    kind: 'edit_plan_json',
    references: {
      sourceIdentity: ref('source-identity', '2'),
      mediaEquivalence: ref('media-equivalence', '1'),
      humanResult: ref('human-result', 'h'),
    },
    candidate: {
      candidateId: 13,
      title: '実家の母ちゃんから届いた謎の仕送り『月刊ムー』',
      outerRange: { startMs: 1920260, endMs: 2008506 },
      qualitativeInternalEdit: {
        kind: 'remove_silence_and_fillers',
        sourceValue: 'remove_silence_and_fillers',
        resolved: false,
      },
    },
  };
}

const makeCharacter = (id, text, startMs, endMs) => ({
  characterId: id,
  text,
  startMs,
  endMs,
});

const makeUtterance = (speechId, startMs, endMs, text, prefix) => ({
  speechId,
  startMs,
  endMs,
  text,
  characters: [makeCharacter(`${prefix}-1`, text, startMs, endMs)],
});

function makeCandidateManifest() {
  const firstBefore = makeUtterance(1, 1920260, 1948058, '母ちゃんから届いた話', 'b1');
  const middle = makeUtterance(2, 1949982, 1977670, '仕送りの中身の話', 'm1');
  const last = makeUtterance(3, 1981394, 2008506, '月刊ムーが入っていた', 'a2');
  return {
    schemaVersion: PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION,
    manifestId: 'dmwu-candidate-13-review-manifest-v001',
    references: {
      mediaEquivalence: ref('media-equivalence', '1'),
      sourceIdentity: ref('source-identity', '2'),
      basisEditPlan: ref('basis-plan', '3'),
      sttManifest: makeSourceIdentity().stt.manifest,
      wordTimestamps: makeSourceIdentity().stt.wordTimestamps,
    },
    candidate: {
      candidateId: 13,
      title: '実家の母ちゃんから届いた謎の仕送り『月刊ムー』',
      outerRange: { startMs: 1920260, endMs: 2008506 },
    },
    presenter: {
      lineage: 'layer1-trim-v001@deterministic-rule',
      role: 'review-position-presenter',
      minimumGapMs: 400,
      automaticCut: false,
      paddingApplied: false,
    },
    reviewItems: [
      {
        reviewItemId: 'gap-001',
        gap: { startMs: 1948058, endMs: 1949982 },
        protectionReasons: ['utterance-group-boundary'],
        fillerCandidateCount: 0,
        beforeUtterance: firstBefore,
        afterUtterance: middle,
      },
      {
        reviewItemId: 'gap-002',
        gap: { startMs: 1977670, endMs: 1981394 },
        protectionReasons: ['speaker-unknown'],
        fillerCandidateCount: 0,
        beforeUtterance: middle,
        afterUtterance: last,
      },
    ],
    workload: {
      independentJudgmentCount: 3,
      requiredExplicitOperationCount: 10,
      initialPositionSearchCount: 0,
      requiredPlaybackRanges: [
        {
          playbackId: 'original', label: '元候補', startMs: 1920260, endMs: 2008506, durationMs: 88246,
        },
        {
          playbackId: 'gap-001-context', label: '間1の前後発話', startMs: 1920260, endMs: 1977670, durationMs: 57410,
        },
        {
          playbackId: 'gap-002-context', label: '間2の前後発話', startMs: 1949982, endMs: 2008506, durationMs: 58524,
        },
      ],
      editedPlaybackDurationRangeMs: { minimumMs: 82598, maximumMs: 88246 },
      totalInitialPlaybackDurationRangeMs: { minimumMs: 286778, maximumMs: 292426 },
    },
  };
}

function makeReviewResult({ answers = ['keep', 'keep'], finalDisposition = 'complete' } = {}) {
  const manifest = makeCandidateManifest();
  const decisions = manifest.reviewItems.map((item, index) => ({
    reviewItemId: item.reviewItemId,
    answer: answers[index],
    modified: false,
    cutRange: answers[index] === 'cut' ? clone(item.gap) : null,
    selection: null,
  }));
  const cuts = decisions.filter((decision) => decision.answer === 'cut').map((decision) => decision.cutRange);
  const payload = {
    references: {
      basisEditPlan: ref('basis-plan', '3'),
      sourceIdentity: ref('source-identity', '2'),
      mediaEquivalence: ref('media-equivalence', '1'),
      sttManifest: manifest.references.sttManifest,
      wordTimestamps: manifest.references.wordTimestamps,
      candidateManifest: ref('candidate-manifest', '4'),
    },
    candidate: { candidateId: 13, outerRange: clone(manifest.candidate.outerRange) },
    decisions,
    retainedSegments: computePresentationRetainedSegmentsV001(manifest.candidate.outerRange, cuts).segments,
    finalDisposition,
    positionSearchCount: 0,
  };
  return {
    schemaVersion: PRESENTATION_INTERNAL_TRIM_HUMAN_REVIEW_RESULT_SCHEMA_VERSION,
    recordId: 'dmwu-candidate-13-human-review-v001',
    payload,
    humanReadableSummary: '候補13の内部の間2件を確認した。',
    payloadSha256: presentationFirstRealDataCanonicalSha256(payload),
  };
}

function makeBindings(reviewResult = makeReviewResult()) {
  const binding = (reference, value) => ({
    ...reference,
    valueCanonicalSha256: presentationFirstRealDataCanonicalSha256(value),
    value,
  });
  return {
    mediaEquivalence: binding(ref('media-equivalence', '1'), makeMediaEquivalence()),
    sourceIdentity: binding(ref('source-identity', '2'), makeSourceIdentity()),
    basisEditPlan: binding(ref('basis-plan', '3'), makeBasisPlan()),
    candidateManifest: binding(ref('candidate-manifest', '4'), makeCandidateManifest()),
    reviewResult: binding(ref('review-result', '5'), reviewResult),
  };
}

const makeTrustedReferences = (bindings) => Object.fromEntries([
  'mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'candidateManifest',
].map((field) => [field, {
  path: bindings[field].path,
  fileSha256: bindings[field].fileSha256,
}]));

const buildSavePreflight = ({preflightId, bindings, trustedReferences}) => (
  buildPresentationAssemblyDecisionSavePreflightV001({
    preflightId,
    bindings,
    trustedReferences: trustedReferences ?? makeTrustedReferences(bindings),
  })
);

const refreshBindingCanonicalHash = (binding) => {
  binding.valueCanonicalSha256 = presentationFirstRealDataCanonicalSha256(binding.value);
};

const selectionFor = (utterance, index) => {
  const character = utterance.characters[index];
  return {
    ...character,
    contextBefore: utterance.characters.slice(0, index).map((item) => item.text).join(''),
    contextAfter: utterance.characters.slice(index + 1).map((item) => item.text).join(''),
  };
};

const makeActualFormalReviewResult = async ({
  answers = ['keep', 'keep'],
  finalDisposition = 'complete',
  firstCutBoundaryChange = 'none',
  positionSearchCountOverride = null,
} = {}) => {
  const summary = JSON.parse(await readFile(ACTUAL_SUMMARY_PATH, 'utf8'));
  const manifest = JSON.parse(await readFile(ACTUAL_CANDIDATE_MANIFEST_PATH, 'utf8'));
  let positionSearchCount = 0;
  const decisions = manifest.reviewItems.map((item, index) => {
    const answer = answers[index];
    if (answer !== 'cut') {
      return {reviewItemId: item.reviewItemId, answer, modified: false, cutRange: null, selection: null};
    }
    if (index === 0 && firstCutBoundaryChange !== 'none') {
      const beforeIndex = firstCutBoundaryChange === 'both'
        ? item.beforeUtterance.characters.length - 2
        : item.beforeUtterance.characters.length - 2;
      const afterIndex = firstCutBoundaryChange === 'both' ? 1 : 0;
      const before = selectionFor(item.beforeUtterance, beforeIndex);
      const after = selectionFor(item.afterUtterance, afterIndex);
      positionSearchCount += 1 + Number(afterIndex !== 0);
      return {
        reviewItemId: item.reviewItemId,
        answer: 'cut',
        modified: true,
        cutRange: {startMs: before.endMs, endMs: after.startMs},
        selection: {
          beforeLastKeptCharacter: before,
          afterFirstKeptCharacter: after,
        },
      };
    }
    return {
      reviewItemId: item.reviewItemId,
      answer: 'cut',
      modified: false,
      cutRange: clone(item.gap),
      selection: null,
    };
  });
  const cuts = decisions.filter((decision) => decision.answer === 'cut').map((decision) => decision.cutRange);
  const payload = {
    references: {
      basisEditPlan: summary.artifactBindings.basisEditPlan,
      sourceIdentity: summary.artifactBindings.sourceIdentity,
      mediaEquivalence: summary.artifactBindings.mediaEquivalence,
      sttManifest: manifest.references.sttManifest,
      wordTimestamps: manifest.references.wordTimestamps,
      candidateManifest: summary.artifactBindings.candidateManifest,
    },
    candidate: {candidateId: manifest.candidate.candidateId, outerRange: clone(manifest.candidate.outerRange)},
    decisions,
    retainedSegments: computePresentationRetainedSegmentsV001(manifest.candidate.outerRange, cuts).segments,
    finalDisposition,
    positionSearchCount: positionSearchCountOverride ?? positionSearchCount,
  };
  return {
    schemaVersion: PRESENTATION_INTERNAL_TRIM_HUMAN_REVIEW_RESULT_SCHEMA_VERSION,
    recordId: 'dmwu-candidate-13-formal-test-v001',
    payload,
    humanReadableSummary: 'candidate 13の正式保存前検査用結果。',
    payloadSha256: presentationFirstRealDataCanonicalSha256(payload),
  };
};

const withActualReviewFile = async (reviewResult, callback) => {
  const directory = await mkdtemp(resolve(ACTUAL_GATE_DIRECTORY, '.formal-preflight-test-'));
  try {
    const filePath = resolve(directory, 'review-result.json');
    await writeFile(filePath, `${JSON.stringify(reviewResult, null, 2)}\n`);
    return await callback(relative(resolve('.'), filePath));
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
};

const codesOf = (report) => new Set(report.violations.map((violation) => violation.code));
const assertPassed = (report) => assert.deepEqual(report.violations, []);
const assertCode = (report, code) => assert(codesOf(report).has(code), `missing ${code}: ${JSON.stringify(report.violations)}`);

test('strict artifact validators pass and the fixed-root formal preflight becomes ready', async () => {
  assertPassed(validatePresentationSourceMediaEquivalenceV001(makeMediaEquivalence()));
  assertPassed(validatePresentationRealDataSourceIdentityV001(makeSourceIdentity()));
  assertPassed(validatePresentationRealDataBasisEditPlanV001(makeBasisPlan()));
  assertPassed(validatePresentationInternalTrimCandidateManifestV001(makeCandidateManifest()));
  assertPassed(validatePresentationInternalTrimHumanReviewResultV001(makeReviewResult()));
  const review = await makeActualFormalReviewResult();
  await withActualReviewFile(review, async (reviewResultPath) => {
    const preflight = await buildPresentationAssemblyDecisionSavePreflightV001({
      preflightId: 'dmwu-candidate-13-save-preflight-v001',
      reviewResultPath,
    });
    assert.equal(preflight.status, 'ready');
    assert.equal(preflight.schemaVersion, PRESENTATION_ASSEMBLY_DECISION_SAVE_PREFLIGHT_SCHEMA_VERSION);
    assertPassed(validatePresentationAssemblyDecisionSavePreflightV001(preflight));
  });
});

test('canonical hashes and fixed-root ready preflight are deterministic', async () => {
  const value = { z: 1, nested: { b: 2, a: 3 }, a: [2, 1] };
  const reordered = { a: [2, 1], nested: { a: 3, b: 2 }, z: 1 };
  assert.equal(presentationFirstRealDataCanonicalSha256(value), presentationFirstRealDataCanonicalSha256(reordered));
  const review = await makeActualFormalReviewResult();
  await withActualReviewFile(review, async (reviewResultPath) => {
    const first = await buildPresentationAssemblyDecisionSavePreflightV001({
      preflightId: 'p', reviewResultPath,
    });
    const second = await buildPresentationAssemblyDecisionSavePreflightV001({
      preflightId: 'p', reviewResultPath,
    });
    assert.deepEqual(first, second);
  });
});

test('artifact loader binds actual bytes and canonical value while rejecting symlink and outside paths', async () => {
  const base = resolve('evals/clip_composition/outputs/presentation');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(resolve(base, '.artifact-binding-test-'));
  try {
    const artifactPath = resolve(directory, 'artifact.json');
    const linkPath = resolve(directory, 'artifact-link.json');
    const actualAncestor = resolve(directory, 'actual-ancestor');
    const ancestorLink = resolve(directory, 'ancestor-link');
    const value = { z: 1, nested: { b: 2, a: 3 } };
    const bytes = `${JSON.stringify(value, null, 2)}\n`;
    await writeFile(artifactPath, bytes);
    await symlink(artifactPath, linkPath);
    await mkdir(actualAncestor);
    await writeFile(resolve(actualAncestor, 'through-ancestor.json'), bytes);
    await symlink(actualAncestor, ancestorLink, 'dir');
    const binding = await loadPresentationFirstRealDataArtifactBindingV001(
      relative(resolve('.'), artifactPath),
    );
    assert.deepEqual(binding.value, value);
    assert.equal(binding.valueCanonicalSha256, presentationFirstRealDataCanonicalSha256(value));
    assert.notEqual(binding.fileSha256, binding.valueCanonicalSha256);
    await assert.rejects(
      loadPresentationFirstRealDataArtifactBindingV001(relative(resolve('.'), linkPath)),
      /non-symlink/u,
    );
    await assert.rejects(
      loadPresentationFirstRealDataArtifactBindingV001(relative(
        resolve('.'),
        resolve(ancestorLink, 'through-ancestor.json'),
      )),
      /every ancestor must be non-symlink/u,
    );
    const rawReference = {
      path: relative(resolve('.'), artifactPath),
      fileSha256: createHash('sha256').update(bytes).digest('hex'),
    };
    assert.deepEqual(
      await verifyPresentationFirstRealDataFileReferenceV001(rawReference),
      rawReference,
    );
    await assert.rejects(
      verifyPresentationFirstRealDataFileReferenceV001({...rawReference, fileSha256: hash('x')}),
      /byte hash mismatch/u,
    );
    await assert.rejects(
      loadPresentationFirstRealDataArtifactBindingV001('../outside.json'),
      /workspace-relative/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('検証済み大容量fileは同一handleを保持しpath差替えを配信前に拒否する', async () => {
  const base = resolve('evals/clip_composition/outputs/presentation');
  const directory = await mkdtemp(resolve(base, '.stable-file-handle-test-'));
  const mediaPath = resolve(directory, 'media.mp4');
  const movedPath = resolve(directory, 'media-original.mp4');
  const originalBytes = Buffer.alloc(1024 * 1024, 7);
  let resource = null;
  try {
    await writeFile(mediaPath, originalBytes);
    resource = await openPresentationFirstRealDataVerifiedFileV001({
      path: relative(resolve('.'), mediaPath),
      fileSha256: createHash('sha256').update(originalBytes).digest('hex'),
    });
    await resource.assertUnchanged();
    await rename(mediaPath, movedPath);
    await writeFile(mediaPath, Buffer.alloc(originalBytes.length, 8));
    await assert.rejects(resource.assertUnchanged(), /changed/u);
  } finally {
    if (resource) await resource.close();
    await rm(directory, {recursive: true, force: true});
  }
});

test('self-consistent fake bindings and fake trust root cannot be injected into the formal entry', async () => {
  const fakeBindings = makeBindings();
  const review = await makeActualFormalReviewResult();
  await withActualReviewFile(review, async (reviewResultPath) => {
    await assert.rejects(
      buildPresentationAssemblyDecisionSavePreflightV001({
        preflightId: 'self-consistent-fake',
        reviewResultPath,
        bindings: fakeBindings,
        trustedReferences: makeTrustedReferences(fakeBindings),
        artifactBuildSummaryPath: 'testdata/fake-summary.json',
      }),
      /only accepted inputs/u,
    );
  });
  await assert.rejects(
    loadTrustedPresentationFirstRealDataBindingsV001({
      summary: {artifactBindings: makeTrustedReferences(fakeBindings)},
      bindings: fakeBindings,
    }),
    /does not accept an alternate summary or bindings/u,
  );
  await assert.rejects(
    loadTrustedPresentationFirstRealDataRuntimeV001({
      executionMedia: {path: 'testdata/fake.mp4', fileSha256: hash('f')},
    }),
    /does not accept alternate files/u,
  );
});

test('18本の参照連鎖を1本ずつ壊すと該当箇所を含むCHAIN_REFERENCE_MISMATCHになる', () => {
  const cases = [
    ['source→media', '$.sourceIdentity.value.mediaEquivalence', (b) => b.sourceIdentity.value.mediaEquivalence],
    ['source→execution media', '$.sourceIdentity.value.executionMedia', (b) => b.sourceIdentity.value.executionMedia],
    ['source→stt manifest', '$.sourceIdentity.value.stt.manifest', (b) => b.sourceIdentity.value.stt.manifest],
    ['source→stt transcript', '$.sourceIdentity.value.stt.transcript', (b) => b.sourceIdentity.value.stt.transcript],
    ['source→word timestamps', '$.sourceIdentity.value.stt.wordTimestamps', (b) => b.sourceIdentity.value.stt.wordTimestamps],
    ['basis→source', '$.basisEditPlan.value.references.sourceIdentity', (b) => b.basisEditPlan.value.references.sourceIdentity],
    ['basis→media', '$.basisEditPlan.value.references.mediaEquivalence', (b) => b.basisEditPlan.value.references.mediaEquivalence],
    ['candidate→media', '$.candidateManifest.value.references.mediaEquivalence', (b) => b.candidateManifest.value.references.mediaEquivalence],
    ['candidate→source', '$.candidateManifest.value.references.sourceIdentity', (b) => b.candidateManifest.value.references.sourceIdentity],
    ['candidate→basis', '$.candidateManifest.value.references.basisEditPlan', (b) => b.candidateManifest.value.references.basisEditPlan],
    ['candidate→stt manifest', '$.candidateManifest.value.references.sttManifest', (b) => b.candidateManifest.value.references.sttManifest],
    ['candidate→word timestamps', '$.candidateManifest.value.references.wordTimestamps', (b) => b.candidateManifest.value.references.wordTimestamps],
    ['review→media', '$.reviewResult.value.payload.references.mediaEquivalence', (b) => b.reviewResult.value.payload.references.mediaEquivalence],
    ['review→source', '$.reviewResult.value.payload.references.sourceIdentity', (b) => b.reviewResult.value.payload.references.sourceIdentity],
    ['review→basis', '$.reviewResult.value.payload.references.basisEditPlan', (b) => b.reviewResult.value.payload.references.basisEditPlan],
    ['review→candidate', '$.reviewResult.value.payload.references.candidateManifest', (b) => b.reviewResult.value.payload.references.candidateManifest],
    ['review→stt manifest', '$.reviewResult.value.payload.references.sttManifest', (b) => b.reviewResult.value.payload.references.sttManifest],
    ['review→word timestamps', '$.reviewResult.value.payload.references.wordTimestamps', (b) => b.reviewResult.value.payload.references.wordTimestamps],
  ];
  assert.equal(validatePresentationFirstRealDataArtifactChainV001(makeBindings()).status, 'passed');
  for (const [label, expectedPath, target] of cases) {
    const bindings = makeBindings();
    target(bindings).fileSha256 = hash('z');
    const report = validatePresentationFirstRealDataArtifactChainV001(bindings);
    assert.equal(report.status, 'failed', label);
    assert(report.violations.every((violation) => violation.code === 'CHAIN_REFERENCE_MISMATCH'), label);
    assert(report.violations.some((violation) => violation.path === expectedPath), label);
  }
});

test('元編集案と確認候補のtitle不一致を候補連鎖不一致として拒否する', () => {
  const bindings = makeBindings();
  bindings.candidateManifest.value.candidate.title = '別の題名';
  const report = validatePresentationFirstRealDataArtifactChainV001(bindings);
  assert.equal(report.status, 'failed');
  assert(report.violations.some((violation) => (
    violation.code === 'CHAIN_CANDIDATE_MISMATCH' && violation.path === '$.candidate'
  )));
});

test('media validator rejects changed media, missing check, missing Edge observation and hollow evidence', () => {
  const mutations = [
    (media) => {
      media.artifacts.newExecutionMedia.fileSha256 = hash('9');
      media.browserPlayback.mediaFileSha256 = hash('9');
    },
    (media) => { media.checks.pop(); },
    (media) => { media.browserPlayback = null; },
    (media) => { media.formalEntry = {}; },
  ];
  for (const mutate of mutations) {
    const media = makeMediaEquivalence();
    mutate(media);
    assert.equal(validatePresentationSourceMediaEquivalenceV001(media).status, 'failed');
  }
});

test('complement handles no cut, one cut, two cuts, all cut and rejects invalid cuts', () => {
  const outer = { startMs: 100, endMs: 500 };
  assert.deepEqual(computePresentationRetainedSegmentsV001(outer, []).segments, [{ startMs: 100, endMs: 500 }]);
  assert.deepEqual(computePresentationRetainedSegmentsV001(outer, [{ startMs: 200, endMs: 300 }]).segments, [
    { startMs: 100, endMs: 200 }, { startMs: 300, endMs: 500 },
  ]);
  assert.deepEqual(computePresentationRetainedSegmentsV001(outer, [
    { startMs: 400, endMs: 450 }, { startMs: 200, endMs: 300 },
  ]).segments, [
    { startMs: 100, endMs: 200 }, { startMs: 300, endMs: 400 }, { startMs: 450, endMs: 500 },
  ]);
  assert.deepEqual(computePresentationRetainedSegmentsV001(outer, [{ startMs: 100, endMs: 500 }]).segments, []);
  assertCode(computePresentationRetainedSegmentsV001({ startMs: 10, endMs: 10 }, []), 'COMPLEMENT_OUTER_RANGE_INVALID');
  assertCode(computePresentationRetainedSegmentsV001(outer, [{ startMs: 50, endMs: 200 }]), 'COMPLEMENT_CUT_RANGE_INVALID');
  assertCode(computePresentationRetainedSegmentsV001(outer, [
    { startMs: 150, endMs: 250 }, { startMs: 200, endMs: 300 },
  ]), 'COMPLEMENT_CUT_OVERLAP');
});

test('unanswered or additional-edit review is structurally retained but formal preflight is blocked', async () => {
  for (const review of [
    await makeActualFormalReviewResult({answers: ['unanswered', 'keep'], finalDisposition: 'unanswered'}),
    await makeActualFormalReviewResult({finalDisposition: 'needs_additional_edit'}),
  ]) {
    assertPassed(validatePresentationInternalTrimHumanReviewResultV001(review));
    await withActualReviewFile(review, async (reviewResultPath) => {
      const preflight = await buildPresentationAssemblyDecisionSavePreflightV001({
        preflightId: 'blocked-preflight',
        reviewResultPath,
      });
      assert.equal(preflight.status, 'blocked');
      assert.deepEqual(
        [...new Set(preflight.blockedReasons.map((reason) => reason.code))],
        ['SAVE_PREFLIGHT_NOT_READY'],
      );
    });
  }
});

test('formal chain counts the actually changed left/right endpoints as 0/1/2', async () => {
  let oneBoundaryReview = null;
  for (const [change, expectedCount] of [['none', 0], ['left', 1], ['both', 2]]) {
    const review = await makeActualFormalReviewResult({
      answers: ['cut', 'keep'], firstCutBoundaryChange: change,
    });
    assert.equal(review.payload.positionSearchCount, expectedCount);
    assertPassed(validatePresentationInternalTrimHumanReviewResultV001(review));
    await withActualReviewFile(review, async (reviewResultPath) => {
      const preflight = await buildPresentationAssemblyDecisionSavePreflightV001({
        preflightId: `${change}-endpoint-change`, reviewResultPath,
      });
      assert.equal(preflight.status, 'ready');
    });
    if (change === 'left') oneBoundaryReview = review;
  }
  const wrongCount = clone(oneBoundaryReview);
  wrongCount.payload.positionSearchCount = 2;
  wrongCount.payloadSha256 = presentationFirstRealDataCanonicalSha256(wrongCount.payload);
  assertPassed(validatePresentationInternalTrimHumanReviewResultV001(wrongCount));
  await withActualReviewFile(wrongCount, async (reviewResultPath) => {
    const preflight = await buildPresentationAssemblyDecisionSavePreflightV001({
      preflightId: 'wrong-endpoint-count', reviewResultPath,
    });
    assert.equal(preflight.status, 'blocked');
    assert(preflight.blockedReasons.some((reason) => (
      reason.code === 'CHAIN_REVIEW_ITEM_MISMATCH'
      && reason.path.endsWith('.positionSearchCount')
    )));
  });

  const falseModifiedReview = await makeActualFormalReviewResult({answers: ['cut', 'keep']});
  const actualManifest = JSON.parse(await readFile(ACTUAL_CANDIDATE_MANIFEST_PATH, 'utf8'));
  const firstItem = actualManifest.reviewItems[0];
  falseModifiedReview.payload.decisions[0] = {
    reviewItemId: firstItem.reviewItemId,
    answer: 'cut',
    modified: true,
    cutRange: clone(firstItem.gap),
    selection: {
      beforeLastKeptCharacter: selectionFor(
        firstItem.beforeUtterance,
        firstItem.beforeUtterance.characters.length - 1,
      ),
      afterFirstKeptCharacter: selectionFor(firstItem.afterUtterance, 0),
    },
  };
  falseModifiedReview.payloadSha256 = presentationFirstRealDataCanonicalSha256(
    falseModifiedReview.payload,
  );
  assertPassed(validatePresentationInternalTrimHumanReviewResultV001(falseModifiedReview));
  await withActualReviewFile(falseModifiedReview, async (reviewResultPath) => {
    const preflight = await buildPresentationAssemblyDecisionSavePreflightV001({
      preflightId: 'false-modified-claim', reviewResultPath,
    });
    assert.equal(preflight.status, 'blocked');
    assert(preflight.blockedReasons.some((reason) => (
      reason.code === 'CHAIN_REVIEW_ITEM_MISMATCH'
      && reason.path.endsWith('.decisions')
    )));
  });
});

test('public artifact validators and fixed-root preflight validator exercise their violation families', async () => {
  const seen = new Set();
  const collect = (report) => report.violations.forEach((violation) => seen.add(violation.code));

  collect(validatePresentationSourceMediaEquivalenceV001(null));
  const mediaUnknown = makeMediaEquivalence(); mediaUnknown.extra = true; collect(validatePresentationSourceMediaEquivalenceV001(mediaUnknown));
  const mediaStatus = makeMediaEquivalence(); mediaStatus.status = 'failed'; collect(validatePresentationSourceMediaEquivalenceV001(mediaStatus));

  collect(validatePresentationRealDataSourceIdentityV001(null));
  const sourceUnknown = makeSourceIdentity(); sourceUnknown.extra = true; collect(validatePresentationRealDataSourceIdentityV001(sourceUnknown));
  const sourceSchema = makeSourceIdentity(); sourceSchema.schemaVersion = 'old'; collect(validatePresentationRealDataSourceIdentityV001(sourceSchema));
  const sourceValue = makeSourceIdentity(); sourceValue.videoId = 'wrong'; collect(validatePresentationRealDataSourceIdentityV001(sourceValue));
  const sourceRef = makeSourceIdentity(); sourceRef.stt.manifest.fileSha256 = 'bad'; collect(validatePresentationRealDataSourceIdentityV001(sourceRef));

  collect(validatePresentationRealDataBasisEditPlanV001(null));
  const basisUnknown = makeBasisPlan(); basisUnknown.extra = true; collect(validatePresentationRealDataBasisEditPlanV001(basisUnknown));
  const basisSchema = makeBasisPlan(); basisSchema.schemaVersion = 'old'; collect(validatePresentationRealDataBasisEditPlanV001(basisSchema));
  const basisValue = makeBasisPlan(); basisValue.kind = 'other'; collect(validatePresentationRealDataBasisEditPlanV001(basisValue));
  const basisRef = makeBasisPlan(); basisRef.references.humanResult.fileSha256 = 'bad'; collect(validatePresentationRealDataBasisEditPlanV001(basisRef));
  const basisCut = makeBasisPlan(); basisCut.cuts = []; collect(validatePresentationRealDataBasisEditPlanV001(basisCut));

  collect(validatePresentationInternalTrimCandidateManifestV001(null));
  const manifestUnknown = makeCandidateManifest(); manifestUnknown.extra = true; collect(validatePresentationInternalTrimCandidateManifestV001(manifestUnknown));
  const manifestSchema = makeCandidateManifest(); manifestSchema.schemaVersion = 'old'; collect(validatePresentationInternalTrimCandidateManifestV001(manifestSchema));
  const manifestRef = makeCandidateManifest(); manifestRef.references.sttManifest.fileSha256 = 'bad'; collect(validatePresentationInternalTrimCandidateManifestV001(manifestRef));
  const manifestPresenter = makeCandidateManifest(); manifestPresenter.presenter.automaticCut = true; collect(validatePresentationInternalTrimCandidateManifestV001(manifestPresenter));
  const manifestItem = makeCandidateManifest(); manifestItem.reviewItems[0].gap.startMs += 1; collect(validatePresentationInternalTrimCandidateManifestV001(manifestItem));
  const manifestOrder = makeCandidateManifest(); manifestOrder.reviewItems.reverse(); collect(validatePresentationInternalTrimCandidateManifestV001(manifestOrder));
  const manifestWorkload = makeCandidateManifest(); manifestWorkload.workload.requiredExplicitOperationCount = 9; collect(validatePresentationInternalTrimCandidateManifestV001(manifestWorkload));

  collect(validatePresentationInternalTrimHumanReviewResultV001(null));
  const reviewUnknown = makeReviewResult(); reviewUnknown.extra = true; collect(validatePresentationInternalTrimHumanReviewResultV001(reviewUnknown));
  const reviewSchema = makeReviewResult(); reviewSchema.schemaVersion = 'old'; collect(validatePresentationInternalTrimHumanReviewResultV001(reviewSchema));
  const reviewRef = makeReviewResult(); reviewRef.payload.references.wordTimestamps.fileSha256 = 'bad'; reviewRef.payloadSha256 = presentationFirstRealDataCanonicalSha256(reviewRef.payload); collect(validatePresentationInternalTrimHumanReviewResultV001(reviewRef));
  const reviewCandidate = makeReviewResult(); reviewCandidate.payload.candidate.candidateId = 0; reviewCandidate.payloadSha256 = presentationFirstRealDataCanonicalSha256(reviewCandidate.payload); collect(validatePresentationInternalTrimHumanReviewResultV001(reviewCandidate));
  const reviewDecision = makeReviewResult(); reviewDecision.payload.decisions[0].answer = 'bad'; reviewDecision.payloadSha256 = presentationFirstRealDataCanonicalSha256(reviewDecision.payload); collect(validatePresentationInternalTrimHumanReviewResultV001(reviewDecision));
  const reviewSelection = makeReviewResult({ answers: ['cut', 'keep'] }); reviewSelection.payload.decisions[0].modified = true; reviewSelection.payloadSha256 = presentationFirstRealDataCanonicalSha256(reviewSelection.payload); collect(validatePresentationInternalTrimHumanReviewResultV001(reviewSelection));
  const reviewCut = makeReviewResult({ answers: ['cut', 'keep'] }); reviewCut.payload.decisions[0].cutRange.endMs = reviewCut.payload.decisions[0].cutRange.startMs; reviewCut.payloadSha256 = presentationFirstRealDataCanonicalSha256(reviewCut.payload); collect(validatePresentationInternalTrimHumanReviewResultV001(reviewCut));
  const reviewSegments = makeReviewResult(); reviewSegments.payload.retainedSegments = []; reviewSegments.payloadSha256 = presentationFirstRealDataCanonicalSha256(reviewSegments.payload); collect(validatePresentationInternalTrimHumanReviewResultV001(reviewSegments));
  const reviewDisposition = makeReviewResult(); reviewDisposition.payload.finalDisposition = 'bad'; reviewDisposition.payloadSha256 = presentationFirstRealDataCanonicalSha256(reviewDisposition.payload); collect(validatePresentationInternalTrimHumanReviewResultV001(reviewDisposition));
  const reviewSummary = makeReviewResult(); reviewSummary.humanReadableSummary = ''; collect(validatePresentationInternalTrimHumanReviewResultV001(reviewSummary));
  const reviewHash = makeReviewResult(); reviewHash.payloadSha256 = hash('0'); collect(validatePresentationInternalTrimHumanReviewResultV001(reviewHash));

  collect(computePresentationRetainedSegmentsV001({ startMs: 1, endMs: 1 }, []));
  collect(computePresentationRetainedSegmentsV001({ startMs: 1, endMs: 10 }, [{ startMs: 0, endMs: 2 }]));
  collect(computePresentationRetainedSegmentsV001(
    { startMs: 1, endMs: 10 },
    [{ startMs: 2, endMs: 6 }, { startMs: 5, endMs: 8 }],
  ));

  const actualReview = await makeActualFormalReviewResult();
  await withActualReviewFile(actualReview, async (reviewResultPath) => {
    const ready = await buildPresentationAssemblyDecisionSavePreflightV001({
      preflightId: 'ready', reviewResultPath,
    });
    collect(validatePresentationAssemblyDecisionSavePreflightV001(null));
    const preflightUnknown = clone(ready); preflightUnknown.extra = true; collect(validatePresentationAssemblyDecisionSavePreflightV001(preflightUnknown));
    const preflightSchema = clone(ready); preflightSchema.schemaVersion = 'old'; collect(validatePresentationAssemblyDecisionSavePreflightV001(preflightSchema));
    const preflightValue = clone(ready); preflightValue.candidateId = 0; collect(validatePresentationAssemblyDecisionSavePreflightV001(preflightValue));
    const preflightRef = clone(ready); preflightRef.references.reviewResult.fileSha256 = 'bad'; collect(validatePresentationAssemblyDecisionSavePreflightV001(preflightRef));
    const preflightChecks = clone(ready); preflightChecks.checks[0].checkId = 'bad'; collect(validatePresentationAssemblyDecisionSavePreflightV001(preflightChecks));
    const preflightStatus = clone(ready); preflightStatus.status = 'blocked'; collect(validatePresentationAssemblyDecisionSavePreflightV001(preflightStatus));
  });
  for (const code of [
    'SOURCE_IDENTITY_SCHEMA_INVALID', 'BASIS_PLAN_CONCRETE_CUT_FORBIDDEN',
    'CANDIDATE_MANIFEST_WORKLOAD_INVALID', 'REVIEW_RESULT_SELECTION_INVALID',
    'COMPLEMENT_CUT_OVERLAP', 'SAVE_PREFLIGHT_NOT_OBJECT',
    'SAVE_PREFLIGHT_UNKNOWN_FIELD', 'SAVE_PREFLIGHT_SCHEMA_INVALID',
    'SAVE_PREFLIGHT_VALUE_INVALID', 'SAVE_PREFLIGHT_REFERENCE_INVALID',
    'SAVE_PREFLIGHT_CHECKS_INVALID', 'SAVE_PREFLIGHT_STATUS_INCONSISTENT',
  ]) assert(seen.has(code), `missing public violation family: ${code}`);
});

test('checker does not expose a formal assembly-decision writer', async () => {
  const module = await import('./presentation_first_real_data_gate_v001.mjs');
  assert.equal(
    Object.keys(module).some((name) => /^(write|save|create)Presentation.*AssemblyDecision/i.test(name)),
    false,
  );
  assert.equal(PRESENTATION_FIRST_REAL_DATA_GATE_CHECKER_VERSION, 'presentation-first-real-data-gate-checker-v001');
});
