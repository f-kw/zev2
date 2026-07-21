import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION,
  PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE,
  PRESENTATION_BASE_MEDIA_TIMELINE_CHECKER_VERSION,
  PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION,
  PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
  PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES,
  frameBoundaryV001,
  sourceEndFrameBoundaryV002,
  mapPresentationSourceIntervalV002,
  validatePresentationBaseMediaTimelineV002,
} from './presentation_base_media_timeline_v002.mjs';

const hash = (character) => character.repeat(64);

const clone = (value) => structuredClone(value);

function makeFixture({ inputFrameRate = '60/1', audio = false } = {}) {
  const inputFrameCount = inputFrameRate === '60/1' ? 480 : 240;
  const timeline = {
    schemaVersion: PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION,
    timelineId: 'timeline-v002-fixture',
    sourceProvenance: 'source-provenance-fixture',
    sourceRef: 'source-ref-fixture',
    sourceFrameClock: {
      inputFrameRate,
      logicalFrameRate: '30/1',
      extractionRuleId: inputFrameRate === '60/1'
        ? 'source-frame-60fps-global-even-v001'
        : 'source-frame-30fps-identity-v001',
      decodedFrameCount: inputFrameCount,
    },
    baseMedia: {
      artifactId: 'base-media-fixture',
      path: 'base-media.mp4',
      fileSha256: hash('a'),
      frameRate: '30/1',
      expectedFrameCount: 150,
    },
    segments: [
      {
        segmentId: 'segment-0001',
        sourceStartMs: 1001,
        sourceEndMs: 4001,
        sourceStartFrame30: 30,
        sourceEndFrame30: 120,
        outputStartFrame: 0,
        outputEndFrame: 90,
      },
      {
        segmentId: 'segment-0002',
        sourceStartMs: 6001,
        sourceEndMs: 8000,
        sourceStartFrame30: 180,
        sourceEndFrame30: 240,
        outputStartFrame: 90,
        outputEndFrame: 150,
      },
    ],
  };

  const sourceAudio = audio
    ? {
      present: true,
      codec: 'aac',
      sampleRate: 48000,
      channels: 2,
      channelLayout: 'stereo',
      timeBase: '1/48000',
      firstDecodedPts: 0,
      lastDecodedPts: 383999,
      presentationClock: {
        authority: 'stream-and-packet-v001',
        endSample: 384000,
        streamEndSample: 384000,
        packetEndSample: 384000,
        skipSamples: 1024,
        discardPadding: 0,
      },
    }
    : { present: false };
  const manifestAudio = audio
    ? {
      present: true,
      sampleRate: 48000,
      channels: 2,
      channelLayout: 'stereo',
      channelOrder: ['FL', 'FR'],
      canonicalPcmFormat: { sampleFormat: 'f32le', packing: 'interleaved' },
      insertedSilenceSpans: [],
      sourceGrid: {
        sampleCount: 384000,
        byteCount: 3072000,
        payloadSha256: hash('b'),
        decodedSampleCount: 384000,
        decodedTailPaddingSampleCount: 0,
      },
      encodeInput: {
        sampleCount: 240000,
        byteCount: 1920000,
        payloadSha256: hash('c'),
      },
      encoded: {
        codec: 'aac',
        bitRate: '192k',
        movieTimeScale: 30,
        timeBase: '1/48000',
        startPts: 0,
        durationTs: 240000,
        containerDurationSamples: 240000,
        presentationDurationSamples: 240000,
        videoPresentationDurationSamples: 240000,
        trailingVideoOnlySampleCount: 0,
        tailPolicy: 'frame-aligned-v001',
        rawDecodedSampleCount: 240640,
        effectiveDecodedSampleCount: 240000,
        effectiveDecodedPayloadSha256: hash('d'),
        packetPayloadSha256: hash('e'),
        skipSamples: 1024,
        discardPadding: 0,
        encoderDelay: 1024,
      },
    }
    : { present: false };

  const videoFilterGraph = inputFrameRate === '60/1'
    ? "[0:v]select='not(mod(n\\,2))',setpts=N/(30*TB)[outv]"
    : '[0:v]setpts=N/(30*TB)[outv]';
  const videoOutput = '<TEMP_VIDEO>';
  const execution = {
    commands: [
      {
        stage: 'video-build',
        tool: 'ffmpeg',
        arguments: [
          '-hide_banner', '-loglevel', 'error', '-y', '-i', '<SOURCE_MEDIA>',
          '-filter_complex', videoFilterGraph, '-map', '[outv]', '-an',
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart', '-movie_timescale', '30', '-map_metadata', '-1', videoOutput,
        ],
        filterGraph: videoFilterGraph,
      },
      ...(audio ? [
        {
          stage: 'audio-grid',
          tool: 'ffmpeg',
          arguments: [
            '-hide_banner', '-loglevel', 'error', '-y', '-i', '<SOURCE_MEDIA>',
            '-map', '0:a:0', '-af', 'aresample=first_pts=0:min_hard_comp=0:max_soft_comp=0',
            '-ar', '48000', '-ac', '2', '-c:a', 'pcm_f32le', '-f', 'f32le', '<SOURCE_GRID>',
          ],
          filterGraph: null,
        },
        {
          stage: 'audio-mux',
          tool: 'ffmpeg',
          arguments: [
            '-hide_banner', '-loglevel', 'error', '-y', '-i', '<TEMP_VIDEO>',
            '-f', 'f32le', '-ar', '48000', '-ac', '2', '-channel_layout', 'stereo',
            '-i', '<ENCODE_PCM>', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
            '-channel_layout', 'stereo', '-movie_timescale', '30', '-movflags', '+faststart',
            '-map_metadata', '-1', '<BASE_MEDIA>',
          ],
          filterGraph: null,
        },
      ] : []),
    ],
    trustedSourceFiles: PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES.map((file) => ({...file})),
  };

  const manifest = {
    schemaVersion: PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION,
    buildId: 'build-fixture',
    job: {
      jobId: 'job-fixture',
      schemaVersion: 'presentation-base-media-build-job-v001',
      fileSha256: hash('1'),
    },
    source: {
      sourceProvenance: timeline.sourceProvenance,
      sourceRef: timeline.sourceRef,
      sourceUri: 'fixture://source.mp4',
      path: 'testdata/source.mp4',
      fileSha256: hash('2'),
      video: {
        width: 1920,
        height: 1080,
        frameRate: inputFrameRate,
        timeBase: inputFrameRate === '60/1' ? '1/60' : '1/30',
        decodedFrameCount: inputFrameCount,
        firstPts: 0,
        lastPts: inputFrameCount - 1,
        rotation: 0,
      },
      audio: sourceAudio,
    },
    assemblyDecision: {
      decisionId: 'decision-fixture',
      fileSha256: hash('3'),
      payloadSha256: hash('4'),
      approvalRecordId: 'approval-fixture',
    },
    basisEditPlan: {
      kind: 'edit_plan_json',
      path: 'testdata/edit-plan.json',
      fileSha256: hash('5'),
    },
    segments: timeline.segments.map((segment) => ({
      ...segment,
      audioSamples: audio
        ? {
          sourceStart: segment.sourceStartFrame30 * 1600,
          sourceEnd: segment.sourceEndFrame30 * 1600,
          outputStart: segment.outputStartFrame * 1600,
          outputEnd: segment.outputEndFrame * 1600,
        }
        : null,
    })),
    audio: manifestAudio,
    execution,
    tools: {
      expected: {...PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE},
      observed: {...PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE},
    },
    versions: {
      generatorVersion: 'presentation-base-media-builder-v001',
      timelineCheckerVersion: PRESENTATION_BASE_MEDIA_TIMELINE_CHECKER_VERSION,
    },
    git: { head: '6'.repeat(40), dirty: true },
    implementationFiles: [
      { path: 'evals/clip_composition/presentation_base_media_build_v001.mjs', fileSha256: hash('7') },
      { path: 'evals/clip_composition/presentation_base_media_timeline_v002.mjs', fileSha256: hash('8') },
    ],
    outputs: {
      baseMedia: {
        artifactId: timeline.baseMedia.artifactId,
        path: timeline.baseMedia.path,
        fileSha256: timeline.baseMedia.fileSha256,
        frameRate: '30/1',
        frameCount: timeline.baseMedia.expectedFrameCount,
        audioPacketPayloadSha256: audio ? hash('e') : null,
      },
      timeline: {
        timelineId: timeline.timelineId,
        schemaVersion: PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION,
        path: 'timeline.json',
        fileSha256: hash('9'),
      },
    },
    excludedLegacyFields: ['screenLayout', 'telopPlan'],
  };
  return {
    timeline,
    manifest,
    observed: {
      fileSha256: timeline.baseMedia.fileSha256,
      frameCount: timeline.baseMedia.expectedFrameCount,
      timelineFileSha256: manifest.outputs.timeline.fileSha256,
    },
  };
}

const assertHasCode = (result, code) => {
  assert.equal(result.status, 'failed');
  assert.ok(result.violations.some((violation) => violation.code === code), code);
};

test('60fpsの偶数frame抽出契約と実mediaのhash・frame数を合格にする', () => {
  const { timeline, manifest, observed } = makeFixture();
  const result = validatePresentationBaseMediaTimelineV002(timeline, manifest, observed);
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.timeline, timeline);
  assert.notEqual(result.timeline, timeline);
  assert.equal(frameBoundaryV001(1001), 30);
});

test('60fps・181frameのデコード終端だけを最後のglobal-even frame後ろへ写す', () => {
  const fixture = makeFixture();
  fixture.timeline.sourceFrameClock.decodedFrameCount = 181;
  fixture.timeline.baseMedia.expectedFrameCount = 1;
  fixture.timeline.segments = [{
    segmentId: 'segment-0001',
    sourceStartMs: 3000,
    sourceEndMs: 3016,
    sourceStartFrame30: 90,
    sourceEndFrame30: 91,
    outputStartFrame: 0,
    outputEndFrame: 1,
  }];
  fixture.manifest.source.video.decodedFrameCount = 181;
  fixture.manifest.source.video.lastPts = 180;
  fixture.manifest.segments = [{...fixture.timeline.segments[0], audioSamples: null}];
  fixture.manifest.outputs.baseMedia.frameCount = 1;
  fixture.observed.frameCount = 1;

  assert.equal(sourceEndFrameBoundaryV002(3015, fixture.timeline.sourceFrameClock), 90);
  assert.equal(sourceEndFrameBoundaryV002(3016, fixture.timeline.sourceFrameClock), 91);
  const validation = validatePresentationBaseMediaTimelineV002(
    fixture.timeline,
    fixture.manifest,
    fixture.observed,
  );
  assert.equal(validation.status, 'passed', JSON.stringify(validation.violations));
  assert.deepEqual(mapPresentationSourceIntervalV002(fixture.timeline, 3000, 3016).mapping, {
    timelineSegmentId: 'segment-0001',
    sourceStartMs: 3000,
    sourceEndMs: 3016,
    sourceStartFrame30: 90,
    sourceEndFrame30: 91,
    startFrame: 0,
    endFrameExclusive: 1,
    displayFrameCount: 1,
  });

  const beyond = clone(fixture.timeline);
  beyond.segments[0].sourceEndMs = 3017;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(beyond, fixture.manifest, fixture.observed),
    'TIMELINE_SOURCE_FRAME_MAPPING_INVALID',
  );
});

test('30fps identityと音声ありmanifestの厳密形を合格にする', () => {
  const { timeline, manifest, observed } = makeFixture({ inputFrameRate: '30/1', audio: true });
  const result = validatePresentationBaseMediaTimelineV002(timeline, manifest, observed);
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.violations, []);
});

test('内部時刻をmsへ戻さずsource frame差でoutput frameへ写す', () => {
  const { timeline } = makeFixture();
  const result = mapPresentationSourceIntervalV002(timeline, 1101, 3901);
  assert.deepEqual(result, {
    status: 'passed',
    violations: [],
    mapping: {
      timelineSegmentId: 'segment-0001',
      sourceStartMs: 1101,
      sourceEndMs: 3901,
      sourceStartFrame30: 33,
      sourceEndFrame30: 117,
      startFrame: 3,
      endFrameExclusive: 87,
      displayFrameCount: 84,
    },
  });
});

test('v001・未知field・欠落fieldを近似受理しない', () => {
  const fixture = makeFixture();
  const oldTimeline = clone(fixture.timeline);
  oldTimeline.schemaVersion = 'presentation-base-media-timeline-v001';
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(oldTimeline, fixture.manifest, fixture.observed),
    'BASE_MEDIA_TIMELINE_INVALID',
  );
  assertHasCode(
    mapPresentationSourceIntervalV002(oldTimeline, 1101, 3901),
    'BASE_MEDIA_TIMELINE_INVALID',
  );

  const unknownTimeline = clone(fixture.timeline);
  unknownTimeline.outputStartMs = 0;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(unknownTimeline, fixture.manifest, fixture.observed),
    'BASE_MEDIA_TIMELINE_INVALID',
  );

  const unknownManifest = clone(fixture.manifest);
  unknownManifest.source.video.durationMs = 8001;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, unknownManifest, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );

  const missingTimeline = clone(fixture.timeline);
  delete missingTimeline.baseMedia.path;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(missingTimeline, fixture.manifest, fixture.observed),
    'BASE_MEDIA_TIMELINE_INVALID',
  );

  const missingManifest = clone(fixture.manifest);
  delete missingManifest.outputs.timeline.path;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, missingManifest, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );
});

test('実行記録の未知・欠落・stage・tool・引数path・filter・信頼sourceを厳密に拒否する', () => {
  const fixture = makeFixture({audio: true});
  const assertManifestPath = (manifest, path) => {
    const result = validatePresentationBaseMediaTimelineV002(
      fixture.timeline,
      manifest,
      fixture.observed,
    );
    assertHasCode(result, 'BASE_MEDIA_GENERATION_MANIFEST_INVALID');
    assert.ok(result.violations.some((violation) => violation.path === path), path);
  };

  const unknown = clone(fixture.manifest);
  unknown.execution.extra = true;
  assertManifestPath(unknown, '$generationManifest.execution');

  const missing = clone(fixture.manifest);
  delete missing.execution;
  assertManifestPath(missing, '$generationManifest.execution');

  const stage = clone(fixture.manifest);
  stage.execution.commands[1].stage = 'audio-decode';
  assertManifestPath(stage, '$generationManifest.execution.commands[1].stage');

  const tool = clone(fixture.manifest);
  tool.execution.commands[0].tool = 'other-ffmpeg';
  assertManifestPath(tool, '$generationManifest.execution.commands[0].tool');

  const pathArgument = clone(fixture.manifest);
  pathArgument.execution.commands[2].arguments[5] = '/private/tmp/video-only.mp4';
  assertManifestPath(pathArgument, '$generationManifest.execution.commands[2].arguments');

  const emptyArgument = clone(fixture.manifest);
  emptyArgument.execution.commands[1].arguments[0] = '';
  assertManifestPath(emptyArgument, '$generationManifest.execution.commands[1].arguments');

  const filterGraph = clone(fixture.manifest);
  filterGraph.execution.commands[0].filterGraph = null;
  assertManifestPath(filterGraph, '$generationManifest.execution.commands[0].filterGraph');

  const unexpectedFilterGraph = clone(fixture.manifest);
  unexpectedFilterGraph.execution.commands[1].filterGraph = 'aresample=first_pts=0';
  assertManifestPath(unexpectedFilterGraph, '$generationManifest.execution.commands[1].filterGraph');

  const trustedRole = clone(fixture.manifest);
  trustedRole.execution.trustedSourceFiles[0].role = 'renderer-v002-encode-source';
  assertManifestPath(trustedRole, '$generationManifest.execution.trustedSourceFiles[0].role');

  const trustedPath = clone(fixture.manifest);
  trustedPath.execution.trustedSourceFiles[1].path = 'evals/clip_composition/other-preview.mjs';
  assertManifestPath(trustedPath, '$generationManifest.execution.trustedSourceFiles[1].path');

  const trustedHash = clone(fixture.manifest);
  trustedHash.execution.trustedSourceFiles[2].fileSha256 = hash('f');
  assertManifestPath(trustedHash, '$generationManifest.execution.trustedSourceFiles[2].fileSha256');
});

test('frame clock・frame導出・区間順・連続性・速度を個別に拒否する', () => {
  const fixture = makeFixture();

  const clock = clone(fixture.timeline);
  clock.sourceFrameClock.extractionRuleId = 'source-frame-30fps-identity-v001';
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(clock, fixture.manifest, fixture.observed),
    'TIMELINE_SOURCE_CLOCK_MISMATCH',
  );

  const decodedFrameClock = clone(fixture.timeline);
  decodedFrameClock.sourceFrameClock.decodedFrameCount = 481;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(decodedFrameClock, fixture.manifest, fixture.observed),
    'TIMELINE_SOURCE_CLOCK_MISMATCH',
  );

  const frame = clone(fixture.timeline);
  frame.segments[0].sourceStartFrame30 = 31;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(frame, fixture.manifest, fixture.observed),
    'TIMELINE_SOURCE_FRAME_MAPPING_INVALID',
  );

  const overlap = clone(fixture.timeline);
  overlap.segments[1].sourceStartMs = 3901;
  overlap.segments[1].sourceStartFrame30 = 117;
  overlap.segments[1].outputEndFrame = 153;
  overlap.baseMedia.expectedFrameCount = 153;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(overlap, fixture.manifest, fixture.observed),
    'TIMELINE_SEGMENT_SOURCE_OVERLAP',
  );

  const gap = clone(fixture.timeline);
  gap.segments[1].outputStartFrame = 91;
  gap.segments[1].outputEndFrame = 151;
  gap.baseMedia.expectedFrameCount = 151;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(gap, fixture.manifest, fixture.observed),
    'TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS',
  );

  const speed = clone(fixture.timeline);
  speed.segments[0].outputEndFrame = 89;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(speed, fixture.manifest, fixture.observed),
    'TIMELINE_SPEED_CHANGE_UNSUPPORTED',
  );
});

test('生成manifestとtimelineのsource・区間・成果物を相互照合する', () => {
  const fixture = makeFixture();

  const source = clone(fixture.manifest);
  source.source.sourceRef = 'different-source-ref';
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, source, fixture.observed),
    'TIMELINE_SOURCE_REF_MISMATCH',
  );

  const clock = clone(fixture.manifest);
  clock.source.video.frameRate = '30/1';
  clock.source.video.timeBase = '1/30';
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, clock, fixture.observed),
    'TIMELINE_SOURCE_CLOCK_MISMATCH',
  );

  const segment = clone(fixture.manifest);
  segment.segments[1].sourceEndMs = 7999;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, segment, fixture.observed),
    'TIMELINE_SEGMENT_MANIFEST_MISMATCH',
  );

  const mediaHash = clone(fixture.manifest);
  mediaHash.outputs.baseMedia.fileSha256 = hash('f');
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, mediaHash, fixture.observed),
    'BASE_MEDIA_HASH_MISMATCH',
  );

  const mediaFrames = clone(fixture.manifest);
  mediaFrames.outputs.baseMedia.frameCount = 149;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, mediaFrames, fixture.observed),
    'BASE_MEDIA_FRAME_COUNT_MISMATCH',
  );

  const timelineHash = clone(fixture.observed);
  timelineHash.timelineFileSha256 = hash('f');
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, fixture.manifest, timelineHash),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );
});

test('source論理frame上限をmanifestのdecoded frame数へ束縛する', () => {
  const fixture = makeFixture();
  const timeline = clone(fixture.timeline);
  const manifest = clone(fixture.manifest);
  timeline.segments[1].sourceEndMs = 10001;
  timeline.segments[1].sourceEndFrame30 = 300;
  timeline.segments[1].outputEndFrame = 210;
  timeline.baseMedia.expectedFrameCount = 210;
  manifest.segments[1].sourceEndMs = 10001;
  manifest.segments[1].sourceEndFrame30 = 300;
  manifest.segments[1].outputEndFrame = 210;
  manifest.outputs.baseMedia.frameCount = 210;
  const observed = {...fixture.observed, frameCount: 210};
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(timeline, manifest, observed),
    'TIMELINE_SOURCE_FRAME_MAPPING_INVALID',
  );
});

test('音声sample列をframe数・byte数・channel構成・開始PTSへ束縛する', () => {
  const fixture = makeFixture({audio: true});

  const channel = clone(fixture.manifest);
  channel.source.audio.channelLayout = 'mono';
  channel.audio.channelLayout = 'mono';
  channel.audio.channelOrder = ['FC'];
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, channel, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );

  const byteCount = clone(fixture.manifest);
  byteCount.audio.encodeInput.byteCount = 1;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, byteCount, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );

  const sampleCount = clone(fixture.manifest);
  sampleCount.audio.encodeInput.sampleCount = 1;
  sampleCount.audio.encodeInput.byteCount = 8;
  sampleCount.audio.encoded.durationTs = 1;
  sampleCount.audio.encoded.presentationDurationSamples = 1;
  sampleCount.audio.encoded.effectiveDecodedSampleCount = 1;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, sampleCount, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );

  const sourceGrid = clone(fixture.manifest);
  sourceGrid.audio.sourceGrid.sampleCount = 100;
  sourceGrid.audio.sourceGrid.byteCount = 800;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, sourceGrid, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );

  const startPts = clone(fixture.manifest);
  startPts.audio.encoded.startPts = 1;
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, startPts, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );
});

test('固定tool・実装2file・固定成果物名を厳密に検査する', () => {
  const fixture = makeFixture();

  const tools = clone(fixture.manifest);
  tools.tools.observed.nodeVersion = 'v20.19.5';
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, tools, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );

  const implementationFiles = clone(fixture.manifest);
  implementationFiles.implementationFiles = [implementationFiles.implementationFiles[0]];
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, implementationFiles, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );

  const paths = clone(fixture.manifest);
  const timeline = clone(fixture.timeline);
  timeline.baseMedia.path = 'renamed.mp4';
  paths.outputs.baseMedia.path = 'renamed.mp4';
  paths.outputs.timeline.path = 'renamed.json';
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(timeline, paths, fixture.observed),
    'BASE_MEDIA_TIMELINE_INVALID',
  );
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(timeline, paths, fixture.observed),
    'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  );
});

test('観測した基礎映像の入力形・hash・frame数を個別に拒否する', () => {
  const fixture = makeFixture();
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, fixture.manifest),
    'BASE_MEDIA_OBSERVATION_INVALID',
  );
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, fixture.manifest, {
      fileSha256: fixture.observed.fileSha256,
      frameCount: fixture.observed.frameCount,
    }),
    'BASE_MEDIA_OBSERVATION_INVALID',
  );
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, fixture.manifest, { durationMs: 5000 }),
    'BASE_MEDIA_OBSERVATION_INVALID',
  );
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, fixture.manifest, {
      fileSha256: hash('f'),
      frameCount: 150,
      timelineFileSha256: fixture.observed.timelineFileSha256,
    }),
    'BASE_MEDIA_HASH_MISMATCH',
  );
  assertHasCode(
    validatePresentationBaseMediaTimelineV002(fixture.timeline, fixture.manifest, {
      fileSha256: hash('a'),
      frameCount: 149,
      timelineFileSha256: fixture.observed.timelineFileSha256,
    }),
    'BASE_MEDIA_FRAME_COUNT_MISMATCH',
  );
});

test('source区間の未対応・複数segment跨ぎ・曖昧・0frameを区別する', () => {
  const { timeline } = makeFixture();
  assertHasCode(
    mapPresentationSourceIntervalV002(timeline, 4500, 5000),
    'INSTRUCTION_SOURCE_INTERVAL_UNMAPPED',
  );
  assertHasCode(
    mapPresentationSourceIntervalV002(timeline, 3500, 6500),
    'INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED',
  );
  assertHasCode(
    mapPresentationSourceIntervalV002(timeline, 1100, 1101),
    'INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME',
  );

  const ambiguous = clone(timeline);
  ambiguous.segments[1] = {
    segmentId: 'segment-0002',
    sourceStartMs: 1001,
    sourceEndMs: 3001,
    sourceStartFrame30: 30,
    sourceEndFrame30: 90,
    outputStartFrame: 90,
    outputEndFrame: 150,
  };
  assertHasCode(
    mapPresentationSourceIntervalV002(ambiguous, 1501, 2501),
    'INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS',
  );
});

test('違反順と同一入力のreportを決定的にする', () => {
  const fixture = makeFixture();
  const timeline = clone(fixture.timeline);
  timeline.sourceFrameClock.extractionRuleId = 'invalid';
  timeline.segments[0].sourceStartFrame30 = 31;
  timeline.segments[1].outputStartFrame = 92;
  const manifest = clone(fixture.manifest);
  manifest.source.sourceRef = 'wrong-ref';
  manifest.outputs.baseMedia.fileSha256 = hash('f');

  const first = validatePresentationBaseMediaTimelineV002(timeline, manifest, {
    fileSha256: hash('e'),
    frameCount: 149,
    timelineFileSha256: hash('f'),
  });
  const second = validatePresentationBaseMediaTimelineV002(timeline, manifest, {
    fileSha256: hash('e'),
    frameCount: 149,
    timelineFileSha256: hash('f'),
  });
  assert.deepEqual(first, second);
  const indexes = first.violations.map((violation) => (
    PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES.indexOf(violation.code)
  ));
  assert.deepEqual(indexes, [...indexes].sort((left, right) => left - right));
});

test('exportした全固有違反コードを意図入力で発火できる', () => {
  const fixture = makeFixture();
  const observed = new Set();
  const collect = (result) => result.violations.forEach((violation) => observed.add(violation.code));

  const malformedTimeline = clone(fixture.timeline);
  malformedTimeline.schemaVersion = 'presentation-base-media-timeline-v001';
  malformedTimeline.sourceFrameClock.extractionRuleId = 'invalid';
  malformedTimeline.segments[0].sourceStartFrame30 = 31;
  malformedTimeline.segments[1].sourceStartMs = 3901;
  malformedTimeline.segments[1].sourceStartFrame30 = 117;
  malformedTimeline.segments[1].outputStartFrame = 92;
  malformedTimeline.segments[1].outputEndFrame = 153;
  malformedTimeline.baseMedia.expectedFrameCount = 152;
  const malformedManifest = clone(fixture.manifest);
  malformedManifest.extra = true;
  malformedManifest.source.sourceRef = 'wrong-ref';
  malformedManifest.outputs.baseMedia.fileSha256 = hash('f');
  malformedManifest.outputs.baseMedia.frameCount = 149;
  malformedManifest.segments[0].sourceEndMs = 3999;
  collect(validatePresentationBaseMediaTimelineV002(
    malformedTimeline,
    malformedManifest,
    { fileSha256: 'invalid', frameCount: 0, timelineFileSha256: 'invalid', extra: true },
  ));

  const speed = clone(fixture.timeline);
  speed.segments[0].outputEndFrame = 89;
  collect(validatePresentationBaseMediaTimelineV002(speed, fixture.manifest, fixture.observed));
  collect(mapPresentationSourceIntervalV002(fixture.timeline, 4500, 5000));
  collect(mapPresentationSourceIntervalV002(fixture.timeline, 3500, 6500));
  collect(mapPresentationSourceIntervalV002(fixture.timeline, 1100, 1101));
  const ambiguous = clone(fixture.timeline);
  ambiguous.segments[1] = {
    segmentId: 'segment-0002',
    sourceStartMs: 1001,
    sourceEndMs: 3001,
    sourceStartFrame30: 30,
    sourceEndFrame30: 90,
    outputStartFrame: 90,
    outputEndFrame: 150,
  };
  collect(mapPresentationSourceIntervalV002(ambiguous, 1501, 2501));

  assert.deepEqual([...observed].sort(), [...PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES].sort());
});
