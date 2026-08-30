export const PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION = 'presentation-base-media-timeline-v003';
export const PRESENTATION_BASE_MEDIA_TIMELINE_CHECKER_VERSION = 'presentation-base-media-timeline-checker-v004';
export const PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION = 'presentation-base-media-generation-manifest-v003';

export const PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE = Object.freeze({
  nodeVersion: 'v20.19.6',
  ffmpegVersion: 'ffmpeg version 8.0.1 Copyright (c) 2000-2025 the FFmpeg developers',
  ffprobeVersion: 'ffprobe version 8.0.1 Copyright (c) 2007-2025 the FFmpeg developers',
});

export const PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES = Object.freeze([
  'BASE_MEDIA_TIMELINE_INVALID',
  'BASE_MEDIA_GENERATION_MANIFEST_INVALID',
  'BASE_MEDIA_OBSERVATION_INVALID',
  'BASE_MEDIA_HASH_MISMATCH',
  'BASE_MEDIA_FRAME_COUNT_MISMATCH',
  'TIMELINE_SOURCE_REF_MISMATCH',
  'TIMELINE_SOURCE_CLOCK_MISMATCH',
  'TIMELINE_SOURCE_FRAME_MAPPING_INVALID',
  'TIMELINE_SEGMENT_SOURCE_OVERLAP',
  'TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS',
  'TIMELINE_SPEED_CHANGE_UNSUPPORTED',
  'TIMELINE_SEGMENT_MANIFEST_MISMATCH',
  'INSTRUCTION_SOURCE_INTERVAL_UNMAPPED',
  'INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS',
  'INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED',
  'INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME',
]);

const CODE_ORDER = new Map(
  PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES.map((code, index) => [code, index]),
);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_HEAD_PATTERN = /^[0-9a-f]{40}$/;
const SEGMENT_ID_PATTERN = /^segment-[0-9]{4}$/;
const BASE_MEDIA_FILE_NAME = 'base-media.mp4';
const TIMELINE_FILE_NAME = 'timeline.json';
const IMPLEMENTATION_FILE_PATHS = Object.freeze([
  'evals/clip_composition/presentation_base_media_build_v003.mjs',
  'evals/clip_composition/presentation_base_media_timeline_v004.mjs',
]);
export const PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES = Object.freeze([
  Object.freeze({
    role: 'renderer-v001-encode-source',
    path: 'evals/clip_composition/render_presentation_v001.mjs',
    fileSha256: '13dc1c76ccdca415cb398ba1f3e0cb77e8cac5918f92c3647a273c4a6e4a281d',
  }),
  Object.freeze({
    role: 'preview-builder-aac-source',
    path: 'evals/clip_composition/build_presentation_initial_preset_review.mjs',
    fileSha256: '97cd4c4cfb2369103228c5156297b3b7a8ea2f14746f0ebd58927074f7ca2646',
  }),
  Object.freeze({
    role: 'caption-canonical-json-source',
    path: 'evals/clip_composition/presentation_caption_contract_v002.mjs',
    fileSha256: 'a81d583d877e7e8a5410831f4a18bca18be08c92d28d6349d9a089fb9368086c',
  }),
]);

const EXECUTION_COMMAND_CONTRACTS = Object.freeze({
  'video-build': Object.freeze({
    inputPlaceholders: Object.freeze(['<SOURCE_MEDIA>']),
    outputWithoutAudio: '<TEMP_VIDEO>',
    outputWithAudio: '<TEMP_VIDEO>',
  }),
  'audio-grid': Object.freeze({
    inputPlaceholders: Object.freeze(['<SOURCE_MEDIA>']),
    outputWithAudio: '<SOURCE_GRID>',
  }),
  'audio-mux': Object.freeze({
    inputPlaceholders: Object.freeze(['<TEMP_VIDEO>', '<ENCODE_PCM>']),
    outputWithAudio: '<BASE_MEDIA>',
  }),
});
const EXECUTION_STAGES_WITHOUT_AUDIO = Object.freeze(['video-build']);
const EXECUTION_STAGES_WITH_AUDIO = Object.freeze(['video-build', 'audio-grid', 'audio-mux']);
const EXECUTION_PATH_PLACEHOLDER_PATTERN = /^<[A-Z_]+>$/;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isInteger = (value) => Number.isInteger(value) && Number.isFinite(value);
const isNonNegativeInteger = (value) => isInteger(value) && value >= 0;
const isPositiveInteger = (value) => isInteger(value) && value > 0;
const isSha256 = (value) => typeof value === 'string' && SHA256_PATTERN.test(value);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

const exactFields = (value, expected) => (
  isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
);

const issue = (code, path, relatedIds = [], details = undefined) => {
  const result = {
    code,
    path,
    relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  };
  if (details !== undefined) result.details = canonicalize(details);
  return result;
};

const sortIssues = (issues) => issues.sort((left, right) => {
  const codeDifference = (CODE_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER)
    - (CODE_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
  if (codeDifference !== 0) return codeDifference;
  return [left.path, left.relatedIds.join(','), JSON.stringify(left.details ?? null)]
    .join('\u0000')
    .localeCompare(
      [right.path, right.relatedIds.join(','), JSON.stringify(right.details ?? null)].join('\u0000'),
      'en',
    );
});

const segmentIdForIndex = (index) => `segment-${String(index + 1).padStart(4, '0')}`;

const EXTRACTION_RULE_BY_INPUT_RATE = Object.freeze({
  '30/1': 'source-frame-30fps-identity-v001',
  '60/1': 'source-frame-60fps-global-even-v001',
});

// 設計§5で継承が承認された30fps境界規則。v001実装を正式入口の実行依存にしない。
export const frameBoundaryV001 = (milliseconds) => Math.round(milliseconds * 30 / 1000);

const parseRational = (value) => {
  if (typeof value !== 'string' || !/^-?[0-9]+\/[1-9][0-9]*$/.test(value)) return null;
  const [numerator, denominator] = value.split('/').map(Number);
  return Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator)
    ? {numerator, denominator} : null;
};

export const videoPresentationOffsetMsV001 = ({firstPts, timeBase, containerStartTimeMs}) => {
  const rational = parseRational(timeBase);
  if (!isNonNegativeInteger(firstPts) || !rational || !isNonNegativeInteger(containerStartTimeMs)) {
    return null;
  }
  const numerator = BigInt(firstPts) * BigInt(rational.numerator) * 1000n;
  const denominator = BigInt(rational.denominator);
  if (numerator < 0n || numerator % denominator !== 0n) return null;
  const streamStartMs = numerator / denominator;
  if (streamStartMs > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const offset = Number(streamStartMs) - containerStartTimeMs;
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : null;
};

export const frameBoundaryWithVideoOffsetV001 = (milliseconds, presentationOffsetMs) => (
  Math.round((milliseconds - presentationOffsetMs) * 30 / 1000)
);

const inputFps = (inputFrameRate) => ({'30/1': 30, '60/1': 60})[inputFrameRate] ?? null;

export const logicalSourceFrameCountV002 = (inputFrameRate, decodedFrameCount) => {
  const fps = inputFps(inputFrameRate);
  if (fps === null || !isPositiveInteger(decodedFrameCount)) return null;
  return fps === 60 ? Math.ceil(decodedFrameCount / 2) : decodedFrameCount;
};

export const decodedMediaEndMsV002 = (inputFrameRate, decodedFrameCount) => {
  const fps = inputFps(inputFrameRate);
  if (fps === null || !isPositiveInteger(decodedFrameCount)) return null;
  return Number(BigInt(decodedFrameCount) * 1000n / BigInt(fps));
};

export const decodedMediaEndMsWithVideoOffsetV001 = (
  inputFrameRate,
  decodedFrameCount,
  presentationOffsetMs,
) => {
  if (!isNonNegativeInteger(presentationOffsetMs)) return null;
  const durationMs = decodedMediaEndMsV002(inputFrameRate, decodedFrameCount);
  return durationMs === null ? null : presentationOffsetMs + durationMs;
};

/**
 * 承認入力は整数msしか持たないため、デコード尺が小数msで終わる場合がある。
 * sourceEndMsが`floor(decodedFrameCount * 1000 / inputFps)`と厳密一致する
 * 場合だけ、終端の
 * exclusive frame ordinalを返す。それ以外は既存の30fps境界規則のままとする。
 * これは許容差ではなく、decodedFrameCountに束縛した終端表現である。
 */
export const sourceEndFrameBoundaryV002 = (
  sourceEndMs,
  {inputFrameRate, decodedFrameCount},
) => {
  const fps = inputFps(inputFrameRate);
  const logicalFrameCount = logicalSourceFrameCountV002(inputFrameRate, decodedFrameCount);
  if (fps === null || logicalFrameCount === null || !isNonNegativeInteger(sourceEndMs)) return null;
  const decodedMediaEndMs = decodedMediaEndMsV002(inputFrameRate, decodedFrameCount);
  return sourceEndMs === decodedMediaEndMs
    ? logicalFrameCount
    : frameBoundaryV001(sourceEndMs);
};

export const sourceEndFrameBoundaryWithVideoOffsetV001 = (
  sourceEndMs,
  {inputFrameRate, decodedFrameCount, videoPresentationOffsetMs},
) => {
  const logicalFrameCount = logicalSourceFrameCountV002(inputFrameRate, decodedFrameCount);
  if (logicalFrameCount === null
      || !isNonNegativeInteger(sourceEndMs)
      || !isNonNegativeInteger(videoPresentationOffsetMs)) return null;
  const decodedMediaEndMs = decodedMediaEndMsWithVideoOffsetV001(
    inputFrameRate,
    decodedFrameCount,
    videoPresentationOffsetMs,
  );
  return sourceEndMs === decodedMediaEndMs
    ? logicalFrameCount
    : frameBoundaryWithVideoOffsetV001(sourceEndMs, videoPresentationOffsetMs);
};

function inspectTimeline(timelineInput, add, { semantic = true } = {}) {
  const timeline = isObject(timelineInput) ? timelineInput : {};
  if (!exactFields(
    timelineInput,
    [
      'schemaVersion',
      'timelineId',
      'sourceProvenance',
      'sourceRef',
      'sourceFrameClock',
      'baseMedia',
      'segments',
    ],
  )) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$');
  }
  if (timeline.schemaVersion !== PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.schemaVersion');
  }
  if (!isNonEmptyString(timeline.timelineId)) add('BASE_MEDIA_TIMELINE_INVALID', '$.timelineId');
  if (!isNonEmptyString(timeline.sourceProvenance)) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.sourceProvenance');
  }
  if (!isNonEmptyString(timeline.sourceRef)) add('BASE_MEDIA_TIMELINE_INVALID', '$.sourceRef');

  const sourceFrameClock = isObject(timeline.sourceFrameClock) ? timeline.sourceFrameClock : {};
  if (!exactFields(
    timeline.sourceFrameClock,
    [
      'inputFrameRate', 'logicalFrameRate', 'extractionRuleId', 'decodedFrameCount',
      'containerStartTimeMs', 'videoStreamTimeBase', 'videoFirstPts', 'videoPtsStep',
      'videoPresentationOffsetMs',
    ],
  )) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.sourceFrameClock');
  }
  const expectedExtractionRule = EXTRACTION_RULE_BY_INPUT_RATE[sourceFrameClock.inputFrameRate];
  if (
    expectedExtractionRule === undefined
    || sourceFrameClock.logicalFrameRate !== '30/1'
    || sourceFrameClock.extractionRuleId !== expectedExtractionRule
    || !isPositiveInteger(sourceFrameClock.decodedFrameCount)
    || sourceFrameClock.containerStartTimeMs !== 0
    || !isNonNegativeInteger(sourceFrameClock.videoFirstPts)
    || !isPositiveInteger(sourceFrameClock.videoPtsStep)
    || videoPresentationOffsetMsV001({
      firstPts: sourceFrameClock.videoFirstPts,
      timeBase: sourceFrameClock.videoStreamTimeBase,
      containerStartTimeMs: sourceFrameClock.containerStartTimeMs,
    }) !== sourceFrameClock.videoPresentationOffsetMs
  ) {
    add('TIMELINE_SOURCE_CLOCK_MISMATCH', '$.sourceFrameClock', [], {
      inputFrameRate: sourceFrameClock.inputFrameRate ?? null,
      logicalFrameRate: sourceFrameClock.logicalFrameRate ?? null,
      extractionRuleId: sourceFrameClock.extractionRuleId ?? null,
      decodedFrameCount: sourceFrameClock.decodedFrameCount ?? null,
      containerStartTimeMs: sourceFrameClock.containerStartTimeMs ?? null,
      videoStreamTimeBase: sourceFrameClock.videoStreamTimeBase ?? null,
      videoFirstPts: sourceFrameClock.videoFirstPts ?? null,
      videoPtsStep: sourceFrameClock.videoPtsStep ?? null,
      videoPresentationOffsetMs: sourceFrameClock.videoPresentationOffsetMs ?? null,
      expectedExtractionRule: expectedExtractionRule ?? null,
    });
  }

  const baseMedia = isObject(timeline.baseMedia) ? timeline.baseMedia : {};
  if (!exactFields(
    timeline.baseMedia,
    ['artifactId', 'path', 'fileSha256', 'frameRate', 'expectedFrameCount'],
  )) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia');
  }
  if (!isNonEmptyString(baseMedia.artifactId)) add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.artifactId');
  if (baseMedia.path !== BASE_MEDIA_FILE_NAME) add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.path');
  if (!isSha256(baseMedia.fileSha256)) add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.fileSha256');
  if (baseMedia.frameRate !== '30/1') add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.frameRate');
  if (!isPositiveInteger(baseMedia.expectedFrameCount)) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.expectedFrameCount');
  }

  const segments = Array.isArray(timeline.segments) ? timeline.segments : [];
  if (!Array.isArray(timeline.segments) || segments.length === 0) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.segments');
  }
  const segmentIds = new Set();
  let previous = null;
  segments.forEach((segmentValue, index) => {
    const path = `$.segments[${index}]`;
    const segment = isObject(segmentValue) ? segmentValue : {};
    if (!exactFields(
      segmentValue,
      [
        'segmentId',
        'sourceStartMs',
        'sourceEndMs',
        'sourceStartFrame30',
        'sourceEndFrame30',
        'outputStartFrame',
        'outputEndFrame',
      ],
    )) {
      add('BASE_MEDIA_TIMELINE_INVALID', path);
    }
    const expectedSegmentId = segmentIdForIndex(index);
    if (
      !isNonEmptyString(segment.segmentId)
      || !SEGMENT_ID_PATTERN.test(segment.segmentId)
      || segment.segmentId !== expectedSegmentId
      || segmentIds.has(segment.segmentId)
    ) {
      add('BASE_MEDIA_TIMELINE_INVALID', `${path}.segmentId`, [segment.segmentId], {
        expected: expectedSegmentId,
      });
    } else {
      segmentIds.add(segment.segmentId);
    }

    const values = [
      segment.sourceStartMs,
      segment.sourceEndMs,
      segment.sourceStartFrame30,
      segment.sourceEndFrame30,
      segment.outputStartFrame,
      segment.outputEndFrame,
    ];
    if (!values.every(isNonNegativeInteger)) {
      add('BASE_MEDIA_TIMELINE_INVALID', path, [segment.segmentId]);
      previous = segment;
      return;
    }
    if (
      segment.sourceStartMs >= segment.sourceEndMs
      || segment.sourceStartFrame30 >= segment.sourceEndFrame30
      || segment.outputStartFrame >= segment.outputEndFrame
    ) {
      add('BASE_MEDIA_TIMELINE_INVALID', path, [segment.segmentId]);
    }

    const expectedSourceEndFrame30 = sourceEndFrameBoundaryWithVideoOffsetV001(
      segment.sourceEndMs,
      sourceFrameClock,
    );
    if (
      segment.sourceStartFrame30 !== frameBoundaryWithVideoOffsetV001(
        segment.sourceStartMs,
        sourceFrameClock.videoPresentationOffsetMs,
      )
      || segment.sourceEndFrame30 !== expectedSourceEndFrame30
    ) {
      add('TIMELINE_SOURCE_FRAME_MAPPING_INVALID', path, [segment.segmentId], {
        expectedSourceStartFrame30: frameBoundaryWithVideoOffsetV001(
          segment.sourceStartMs,
          sourceFrameClock.videoPresentationOffsetMs,
        ),
        expectedSourceEndFrame30,
        actualSourceStartFrame30: segment.sourceStartFrame30,
        actualSourceEndFrame30: segment.sourceEndFrame30,
      });
    }
    const fps = inputFps(sourceFrameClock.inputFrameRate);
    if (
      fps !== null
      && isPositiveInteger(sourceFrameClock.decodedFrameCount)
      && BigInt(segment.sourceEndMs - sourceFrameClock.videoPresentationOffsetMs) * BigInt(fps)
        > BigInt(sourceFrameClock.decodedFrameCount) * 1000n
    ) {
      add('TIMELINE_SOURCE_FRAME_MAPPING_INVALID', path, [segment.segmentId], {
        reason: 'source_end_beyond_decoded_media',
        sourceEndMs: segment.sourceEndMs,
        inputFrameRate: sourceFrameClock.inputFrameRate,
        decodedFrameCount: sourceFrameClock.decodedFrameCount,
      });
    }
    if (
      segment.sourceEndFrame30 - segment.sourceStartFrame30
      !== segment.outputEndFrame - segment.outputStartFrame
    ) {
      add('TIMELINE_SPEED_CHANGE_UNSUPPORTED', path, [segment.segmentId]);
    }

    if (semantic) {
      if (index === 0 && segment.outputStartFrame !== 0) {
        add(
          'TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS',
          `${path}.outputStartFrame`,
          [segment.segmentId],
        );
      }
      if (previous && [
        previous.sourceEndMs,
        previous.sourceEndFrame30,
        previous.outputEndFrame,
      ].every(isNonNegativeInteger)) {
        if (segment.outputStartFrame !== previous.outputEndFrame) {
          add(
            'TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS',
            `${path}.outputStartFrame`,
            [previous.segmentId, segment.segmentId],
          );
        }
        if (
          segment.sourceStartMs < previous.sourceEndMs
          || segment.sourceStartFrame30 < previous.sourceEndFrame30
        ) {
          add(
            'TIMELINE_SEGMENT_SOURCE_OVERLAP',
            `${path}.sourceStartMs`,
            [previous.segmentId, segment.segmentId],
          );
        }
      }
    }
    previous = segment;
  });

  const finalOutputEndFrame = segments.length > 0 && isNonNegativeInteger(segments.at(-1)?.outputEndFrame)
    ? segments.at(-1).outputEndFrame
    : null;
  if (
    finalOutputEndFrame !== null
    && isPositiveInteger(baseMedia.expectedFrameCount)
    && baseMedia.expectedFrameCount !== finalOutputEndFrame
  ) {
    add('BASE_MEDIA_FRAME_COUNT_MISMATCH', '$.baseMedia.expectedFrameCount', [], {
      expectedFromTimeline: finalOutputEndFrame,
      timelineValue: baseMedia.expectedFrameCount,
    });
  }
  return { timeline, sourceFrameClock, baseMedia, segments };
}

function inspectGenerationManifest(manifestInput, add) {
  const invalid = (path) => add('BASE_MEDIA_GENERATION_MANIFEST_INVALID', path);
  const manifest = isObject(manifestInput) ? manifestInput : {};
  if (!exactFields(
    manifestInput,
    [
      'schemaVersion',
      'buildId',
      'job',
      'source',
      'assemblyDecision',
      'basisEditPlan',
      'segments',
      'audio',
      'execution',
      'tools',
      'versions',
      'git',
      'implementationFiles',
      'outputs',
      'excludedLegacyFields',
    ],
  )) invalid('$generationManifest');
  if (manifest.schemaVersion !== PRESENTATION_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_VERSION) {
    invalid('$generationManifest.schemaVersion');
  }
  if (!isNonEmptyString(manifest.buildId)) invalid('$generationManifest.buildId');

  const job = isObject(manifest.job) ? manifest.job : {};
  if (!exactFields(manifest.job, ['jobId', 'schemaVersion', 'fileSha256'])) {
    invalid('$generationManifest.job');
  }
  if (!isNonEmptyString(job.jobId)) invalid('$generationManifest.job.jobId');
  if (job.schemaVersion !== 'presentation-base-media-build-job-v001') {
    invalid('$generationManifest.job.schemaVersion');
  }
  if (!isSha256(job.fileSha256)) invalid('$generationManifest.job.fileSha256');

  const source = isObject(manifest.source) ? manifest.source : {};
  if (!exactFields(
    manifest.source,
    [
      'sourceProvenance', 'sourceRef', 'sourceUri', 'path', 'fileSha256',
      'streamConfiguration', 'video', 'audio',
    ],
  )) invalid('$generationManifest.source');
  for (const field of ['sourceProvenance', 'sourceRef', 'sourceUri', 'path']) {
    if (!isNonEmptyString(source[field])) invalid(`$generationManifest.source.${field}`);
  }
  if (!isSha256(source.fileSha256)) invalid('$generationManifest.source.fileSha256');

  const streamConfiguration = isObject(source.streamConfiguration)
    ? source.streamConfiguration : {};
  if (!exactFields(source.streamConfiguration, [
    'videoCount', 'audioCount', 'videoStreamIndex', 'audioStreamIndex',
  ])) invalid('$generationManifest.source.streamConfiguration');
  if (streamConfiguration.videoCount !== 1
      || ![0, 1].includes(streamConfiguration.audioCount)
      || !isNonNegativeInteger(streamConfiguration.videoStreamIndex)
      || (streamConfiguration.audioCount === 0
        ? streamConfiguration.audioStreamIndex !== null
        : !isNonNegativeInteger(streamConfiguration.audioStreamIndex))) {
    invalid('$generationManifest.source.streamConfiguration');
  }

  const video = isObject(source.video) ? source.video : {};
  if (!exactFields(
    source.video,
    [
      'width', 'height', 'frameRate', 'timeBase', 'decodedFrameCount',
      'firstPts', 'lastPts', 'ptsStep', 'containerStartTimeMs',
      'presentationOffsetMs', 'clockAuthority', 'rotation',
    ],
  )) invalid('$generationManifest.source.video');
  if (video.width !== 1920) invalid('$generationManifest.source.video.width');
  if (video.height !== 1080) invalid('$generationManifest.source.video.height');
  if (!Object.hasOwn(EXTRACTION_RULE_BY_INPUT_RATE, video.frameRate)) {
    invalid('$generationManifest.source.video.frameRate');
  }
  const videoTimeBase = parseRational(video.timeBase);
  if (!videoTimeBase) invalid('$generationManifest.source.video.timeBase');
  if (!isPositiveInteger(video.decodedFrameCount)) invalid('$generationManifest.source.video.decodedFrameCount');
  if (!isNonNegativeInteger(video.firstPts)) invalid('$generationManifest.source.video.firstPts');
  if (!isPositiveInteger(video.ptsStep)) invalid('$generationManifest.source.video.ptsStep');
  if (
    !isNonNegativeInteger(video.lastPts)
    || (
      isPositiveInteger(video.decodedFrameCount)
      && isNonNegativeInteger(video.firstPts)
      && isPositiveInteger(video.ptsStep)
      && video.lastPts !== video.firstPts + (video.decodedFrameCount - 1) * video.ptsStep
    )
  ) invalid('$generationManifest.source.video.lastPts');
  if (video.containerStartTimeMs !== 0) invalid('$generationManifest.source.video.containerStartTimeMs');
  if (videoPresentationOffsetMsV001({
    firstPts: video.firstPts,
    timeBase: video.timeBase,
    containerStartTimeMs: video.containerStartTimeMs,
  }) !== video.presentationOffsetMs) invalid('$generationManifest.source.video.presentationOffsetMs');
  if (video.clockAuthority !== 'container-zero-video-stream-offset-v001') {
    invalid('$generationManifest.source.video.clockAuthority');
  }
  if (videoTimeBase && Object.hasOwn(EXTRACTION_RULE_BY_INPUT_RATE, video.frameRate)) {
    const fps = inputFps(video.frameRate);
    const expectedStepNumerator = videoTimeBase.denominator;
    const expectedStepDenominator = videoTimeBase.numerator * fps;
    if (expectedStepDenominator <= 0
        || expectedStepNumerator % expectedStepDenominator !== 0
        || video.ptsStep !== expectedStepNumerator / expectedStepDenominator) {
      invalid('$generationManifest.source.video.ptsStep');
    }
  }
  if (video.rotation !== 0) invalid('$generationManifest.source.video.rotation');

  const sourceAudio = isObject(source.audio) ? source.audio : {};
  if (sourceAudio.present === false) {
    if (!exactFields(source.audio, ['present'])) invalid('$generationManifest.source.audio');
  } else {
    if (!exactFields(
      source.audio,
      [
        'present',
        'codec',
        'sampleRate',
        'channels',
        'channelLayout',
        'timeBase',
        'firstDecodedPts',
        'lastDecodedPts',
        'presentationClock',
      ],
    )) invalid('$generationManifest.source.audio');
    if (sourceAudio.present !== true) invalid('$generationManifest.source.audio.present');
    if (![44100, 48000].includes(sourceAudio.sampleRate)) invalid('$generationManifest.source.audio.sampleRate');
    if (![1, 2].includes(sourceAudio.channels)) invalid('$generationManifest.source.audio.channels');
    if (!['mono', 'stereo'].includes(sourceAudio.channelLayout)) {
      invalid('$generationManifest.source.audio.channelLayout');
    }
    if (
      (sourceAudio.channels === 1 && sourceAudio.channelLayout !== 'mono')
      || (sourceAudio.channels === 2 && sourceAudio.channelLayout !== 'stereo')
    ) invalid('$generationManifest.source.audio.channelLayout');
    if (sourceAudio.timeBase !== `1/${sourceAudio.sampleRate}`) {
      invalid('$generationManifest.source.audio.timeBase');
    }
    if (!isNonEmptyString(sourceAudio.codec)) invalid('$generationManifest.source.audio.codec');
    if (!isNonNegativeInteger(sourceAudio.firstDecodedPts)) {
      invalid('$generationManifest.source.audio.firstDecodedPts');
    }
    if (
      !isNonNegativeInteger(sourceAudio.lastDecodedPts)
      || (
        isNonNegativeInteger(sourceAudio.firstDecodedPts)
        && isNonNegativeInteger(sourceAudio.lastDecodedPts)
        && sourceAudio.lastDecodedPts < sourceAudio.firstDecodedPts
      )
    ) invalid('$generationManifest.source.audio.lastDecodedPts');
    const presentationClock = isObject(sourceAudio.presentationClock)
      ? sourceAudio.presentationClock : {};
    if (!exactFields(
      sourceAudio.presentationClock,
      ['authority', 'endSample', 'streamEndSample', 'packetEndSample', 'skipSamples', 'discardPadding'],
    )) invalid('$generationManifest.source.audio.presentationClock');
    if (presentationClock.authority !== 'stream-and-packet-v001') {
      invalid('$generationManifest.source.audio.presentationClock.authority');
    }
    if (!isPositiveInteger(presentationClock.endSample)) {
      invalid('$generationManifest.source.audio.presentationClock.endSample');
    }
    if (!isNonNegativeInteger(presentationClock.skipSamples)) {
      invalid('$generationManifest.source.audio.presentationClock.skipSamples');
    }
    if (!isNonNegativeInteger(presentationClock.discardPadding)) {
      invalid('$generationManifest.source.audio.presentationClock.discardPadding');
    }
    if (!isPositiveInteger(presentationClock.streamEndSample)
        || !isPositiveInteger(presentationClock.packetEndSample)
        || presentationClock.streamEndSample !== presentationClock.packetEndSample
        || presentationClock.endSample !== presentationClock.packetEndSample) {
      invalid('$generationManifest.source.audio.presentationClock');
    }
  }

  const assemblyDecision = isObject(manifest.assemblyDecision) ? manifest.assemblyDecision : {};
  if (!exactFields(
    manifest.assemblyDecision,
    ['decisionId', 'fileSha256', 'payloadSha256', 'approvalRecordId'],
  )) invalid('$generationManifest.assemblyDecision');
  if (!isNonEmptyString(assemblyDecision.decisionId)) {
    invalid('$generationManifest.assemblyDecision.decisionId');
  }
  if (!isSha256(assemblyDecision.fileSha256)) {
    invalid('$generationManifest.assemblyDecision.fileSha256');
  }
  if (!isSha256(assemblyDecision.payloadSha256)) {
    invalid('$generationManifest.assemblyDecision.payloadSha256');
  }
  if (!isNonEmptyString(assemblyDecision.approvalRecordId)) {
    invalid('$generationManifest.assemblyDecision.approvalRecordId');
  }

  const basisEditPlan = isObject(manifest.basisEditPlan) ? manifest.basisEditPlan : {};
  if (!exactFields(manifest.basisEditPlan, ['kind', 'path', 'fileSha256'])) {
    invalid('$generationManifest.basisEditPlan');
  }
  if (basisEditPlan.kind !== 'edit_plan_json') invalid('$generationManifest.basisEditPlan.kind');
  if (!isNonEmptyString(basisEditPlan.path)) invalid('$generationManifest.basisEditPlan.path');
  if (!isSha256(basisEditPlan.fileSha256)) invalid('$generationManifest.basisEditPlan.fileSha256');

  const segments = Array.isArray(manifest.segments) ? manifest.segments : [];
  const audio = isObject(manifest.audio) ? manifest.audio : {};
  if (!Array.isArray(manifest.segments) || segments.length === 0) {
    invalid('$generationManifest.segments');
  }
  const samplesPerVideoFrame = sourceAudio.present === true
    && isPositiveInteger(sourceAudio.sampleRate)
    && sourceAudio.sampleRate % 30 === 0
    ? sourceAudio.sampleRate / 30
    : null;
  let segmentAudioSampleCount = 0;
  let terminalAudioShortfallSampleCount = 0;
  segments.forEach((segmentValue, index) => {
    const path = `$generationManifest.segments[${index}]`;
    const segment = isObject(segmentValue) ? segmentValue : {};
    if (!exactFields(
      segmentValue,
      [
        'segmentId',
        'sourceStartMs',
        'sourceEndMs',
        'sourceStartFrame30',
        'sourceEndFrame30',
        'outputStartFrame',
        'outputEndFrame',
        'audioSamples',
      ],
    )) invalid(path);
    if (segment.segmentId !== segmentIdForIndex(index)) invalid(`${path}.segmentId`);
    for (const field of [
      'sourceStartMs',
      'sourceEndMs',
      'sourceStartFrame30',
      'sourceEndFrame30',
      'outputStartFrame',
      'outputEndFrame',
    ]) {
      if (!isNonNegativeInteger(segment[field])) invalid(`${path}.${field}`);
    }
    if (sourceAudio.present === false) {
      if (segment.audioSamples !== null) invalid(`${path}.audioSamples`);
    } else {
      const samples = isObject(segment.audioSamples) ? segment.audioSamples : {};
      if (!exactFields(segment.audioSamples, ['sourceStart', 'sourceEnd', 'outputStart', 'outputEnd'])) {
        invalid(`${path}.audioSamples`);
      }
      for (const field of ['sourceStart', 'sourceEnd', 'outputStart', 'outputEnd']) {
        if (!isNonNegativeInteger(samples[field])) invalid(`${path}.audioSamples.${field}`);
      }
      if (samplesPerVideoFrame !== null) {
        const offsetSamples = Math.round(
          video.presentationOffsetMs * sourceAudio.sampleRate / 1000,
        );
        const expectedSourceStart = offsetSamples + segment.sourceStartFrame30 * samplesPerVideoFrame;
        const nominalSourceEnd = offsetSamples + segment.sourceEndFrame30 * samplesPerVideoFrame;
        const expectedOutputStart = segment.outputStartFrame * samplesPerVideoFrame;
        const nominalOutputEnd = segment.outputEndFrame * samplesPerVideoFrame;
        if (samples.sourceStart !== expectedSourceStart) invalid(`${path}.audioSamples.sourceStart`);
        if (samples.outputStart !== expectedOutputStart) invalid(`${path}.audioSamples.outputStart`);
        const copiedSampleCount = samples.sourceEnd - samples.sourceStart;
        const decodedMediaEndMs = decodedMediaEndMsWithVideoOffsetV001(
          video.frameRate,
          video.decodedFrameCount,
          video.presentationOffsetMs,
        );
        const terminalShortfall = index === segments.length - 1
          && segment.sourceEndMs === decodedMediaEndMs
          && isPositiveInteger(audio.sourceGrid?.sampleCount)
          && samples.sourceEnd === audio.sourceGrid.sampleCount
          && samples.sourceEnd > samples.sourceStart
          && samples.sourceEnd < nominalSourceEnd
          && samples.outputEnd === samples.outputStart + copiedSampleCount;
        const frameAligned = samples.sourceEnd === nominalSourceEnd
          && samples.outputEnd === nominalOutputEnd;
        if (!frameAligned && !terminalShortfall) {
          invalid(`${path}.audioSamples.sourceEnd`);
          invalid(`${path}.audioSamples.outputEnd`);
        }
        if (terminalShortfall) {
          terminalAudioShortfallSampleCount = nominalSourceEnd - samples.sourceEnd;
        }
        if (isNonNegativeInteger(copiedSampleCount)) segmentAudioSampleCount += copiedSampleCount;
      }
    }
  });

  if (audio.present === false) {
    if (!exactFields(manifest.audio, ['present'])) invalid('$generationManifest.audio');
  } else {
    if (!exactFields(
      manifest.audio,
      [
        'present',
        'sampleRate',
        'channels',
        'channelLayout',
        'channelOrder',
        'canonicalPcmFormat',
        'insertedSilenceSpans',
        'sourceGrid',
        'encodeInput',
        'encoded',
      ],
    )) invalid('$generationManifest.audio');
    if (audio.present !== true) invalid('$generationManifest.audio.present');
    if (audio.sampleRate !== sourceAudio.sampleRate) invalid('$generationManifest.audio.sampleRate');
    if (audio.channels !== sourceAudio.channels) invalid('$generationManifest.audio.channels');
    if (audio.channelLayout !== sourceAudio.channelLayout) invalid('$generationManifest.audio.channelLayout');
    if (
      (audio.channels === 1 && audio.channelLayout !== 'mono')
      || (audio.channels === 2 && audio.channelLayout !== 'stereo')
    ) invalid('$generationManifest.audio.channelLayout');
    const expectedOrder = audio.channelLayout === 'mono' ? ['FC'] : ['FL', 'FR'];
    if (JSON.stringify(audio.channelOrder) !== JSON.stringify(expectedOrder)) {
      invalid('$generationManifest.audio.channelOrder');
    }
    if (!exactFields(audio.canonicalPcmFormat, ['sampleFormat', 'packing'])) {
      invalid('$generationManifest.audio.canonicalPcmFormat');
    } else if (
      audio.canonicalPcmFormat.sampleFormat !== 'f32le'
      || audio.canonicalPcmFormat.packing !== 'interleaved'
    ) {
      invalid('$generationManifest.audio.canonicalPcmFormat');
    }
    if (!Array.isArray(audio.insertedSilenceSpans)) {
      invalid('$generationManifest.audio.insertedSilenceSpans');
    } else {
      audio.insertedSilenceSpans.forEach((span, index) => {
        const path = `$generationManifest.audio.insertedSilenceSpans[${index}]`;
        if (!exactFields(span, ['startSample', 'endSample'])) invalid(path);
        if (!isNonNegativeInteger(span?.startSample) || !isPositiveInteger(span?.endSample)) invalid(path);
        if (isInteger(span?.startSample) && isInteger(span?.endSample) && span.startSample >= span.endSample) {
          invalid(path);
        }
      });
    }
    for (const [field, value] of [
      ['sourceGrid', audio.sourceGrid],
      ['encodeInput', audio.encodeInput],
    ]) {
      const path = `$generationManifest.audio.${field}`;
      const expectedFields = field === 'sourceGrid'
        ? ['sampleCount', 'byteCount', 'payloadSha256', 'decodedSampleCount', 'decodedTailPaddingSampleCount']
        : ['sampleCount', 'byteCount', 'payloadSha256'];
      if (!exactFields(value, expectedFields)) invalid(path);
      if (!isPositiveInteger(value?.sampleCount)) invalid(`${path}.sampleCount`);
      if (!isPositiveInteger(value?.byteCount)) invalid(`${path}.byteCount`);
      if (!isSha256(value?.payloadSha256)) invalid(`${path}.payloadSha256`);
      if (
        isPositiveInteger(value?.sampleCount)
        && isPositiveInteger(audio.channels)
        && value.byteCount !== value.sampleCount * audio.channels * 4
      ) invalid(`${path}.byteCount`);
    }
    if (!isPositiveInteger(audio.sourceGrid?.decodedSampleCount)) {
      invalid('$generationManifest.audio.sourceGrid.decodedSampleCount');
    }
    if (!isNonNegativeInteger(audio.sourceGrid?.decodedTailPaddingSampleCount)) {
      invalid('$generationManifest.audio.sourceGrid.decodedTailPaddingSampleCount');
    }
    if (
      isPositiveInteger(audio.sourceGrid?.decodedSampleCount)
      && isPositiveInteger(audio.sourceGrid?.sampleCount)
      && isNonNegativeInteger(audio.sourceGrid?.decodedTailPaddingSampleCount)
      && (
        audio.sourceGrid.decodedSampleCount - audio.sourceGrid.sampleCount
          !== audio.sourceGrid.decodedTailPaddingSampleCount
        || audio.sourceGrid.sampleCount !== sourceAudio.presentationClock?.endSample
      )
    ) invalid('$generationManifest.audio.sourceGrid');
    const encoded = isObject(audio.encoded) ? audio.encoded : {};
    if (!exactFields(
      audio.encoded,
      [
        'codec',
        'bitRate',
        'movieTimeScale',
        'timeBase',
        'startPts',
        'durationTs',
        'containerDurationSamples',
        'presentationDurationSamples',
        'videoPresentationDurationSamples',
        'trailingVideoOnlySampleCount',
        'tailPolicy',
        'rawDecodedSampleCount',
        'effectiveDecodedSampleCount',
        'effectiveDecodedPayloadSha256',
        'packetPayloadSha256',
        'skipSamples',
        'discardPadding',
        'encoderDelay',
      ],
    )) invalid('$generationManifest.audio.encoded');
    if (encoded.codec !== 'aac') invalid('$generationManifest.audio.encoded.codec');
    if (encoded.bitRate !== '192k') invalid('$generationManifest.audio.encoded.bitRate');
    if (encoded.movieTimeScale !== 30) invalid('$generationManifest.audio.encoded.movieTimeScale');
    if (encoded.timeBase !== `1/${audio.sampleRate}`) invalid('$generationManifest.audio.encoded.timeBase');
    if (encoded.startPts !== 0) invalid('$generationManifest.audio.encoded.startPts');
    for (const field of [
      'durationTs',
      'containerDurationSamples',
      'presentationDurationSamples',
      'videoPresentationDurationSamples',
      'trailingVideoOnlySampleCount',
      'rawDecodedSampleCount',
      'effectiveDecodedSampleCount',
      'skipSamples',
      'discardPadding',
      'encoderDelay',
    ]) {
      if (!isNonNegativeInteger(encoded[field])) invalid(`$generationManifest.audio.encoded.${field}`);
    }
    if (!isSha256(encoded.effectiveDecodedPayloadSha256)) {
      invalid('$generationManifest.audio.encoded.effectiveDecodedPayloadSha256');
    }
    if (!isSha256(encoded.packetPayloadSha256)) {
      invalid('$generationManifest.audio.encoded.packetPayloadSha256');
    }
    if (
      isNonNegativeInteger(encoded.durationTs)
      && encoded.durationTs !== encoded.containerDurationSamples
    ) invalid('$generationManifest.audio.encoded.durationTs');
    if (
      isPositiveInteger(audio.encodeInput?.sampleCount)
      && isNonNegativeInteger(encoded.presentationDurationSamples)
      && encoded.presentationDurationSamples !== audio.encodeInput.sampleCount
    ) invalid('$generationManifest.audio.encoded.presentationDurationSamples');
    if (
      isPositiveInteger(audio.encodeInput?.sampleCount)
      && isNonNegativeInteger(encoded.effectiveDecodedSampleCount)
      && encoded.effectiveDecodedSampleCount !== audio.encodeInput.sampleCount
    ) invalid('$generationManifest.audio.encoded.effectiveDecodedSampleCount');
    const finalOutputFrame = segments.at(-1)?.outputEndFrame;
    const videoPresentationDurationSamples = samplesPerVideoFrame !== null
      && isPositiveInteger(finalOutputFrame)
      ? finalOutputFrame * samplesPerVideoFrame
      : null;
    if (
      isNonNegativeInteger(encoded.containerDurationSamples)
      && isNonNegativeInteger(encoded.presentationDurationSamples)
      && encoded.containerDurationSamples < encoded.presentationDurationSamples
    ) invalid('$generationManifest.audio.encoded.containerDurationSamples');
    if (
      videoPresentationDurationSamples !== null
      && isNonNegativeInteger(encoded.containerDurationSamples)
      && encoded.containerDurationSamples > videoPresentationDurationSamples
    ) invalid('$generationManifest.audio.encoded.containerDurationSamples');
    if (
      videoPresentationDurationSamples !== null
      && isPositiveInteger(audio.encodeInput?.sampleCount)
      && audio.encodeInput.sampleCount > videoPresentationDurationSamples
    ) invalid('$generationManifest.audio.encodeInput.sampleCount');
    if (
      isPositiveInteger(audio.encodeInput?.sampleCount)
      && audio.encodeInput.sampleCount !== segmentAudioSampleCount
    ) invalid('$generationManifest.audio.encodeInput.sampleCount');
    if (
      videoPresentationDurationSamples !== null
      && encoded.videoPresentationDurationSamples !== videoPresentationDurationSamples
    ) invalid('$generationManifest.audio.encoded.videoPresentationDurationSamples');
    const expectedTrailingVideoOnlySampleCount = videoPresentationDurationSamples !== null
      && isNonNegativeInteger(encoded.presentationDurationSamples)
      ? videoPresentationDurationSamples - encoded.presentationDurationSamples
      : null;
    if (
      expectedTrailingVideoOnlySampleCount === null
      || expectedTrailingVideoOnlySampleCount < 0
      || encoded.trailingVideoOnlySampleCount !== expectedTrailingVideoOnlySampleCount
      || encoded.trailingVideoOnlySampleCount !== terminalAudioShortfallSampleCount
    ) invalid('$generationManifest.audio.encoded.trailingVideoOnlySampleCount');
    const expectedTailPolicy = terminalAudioShortfallSampleCount === 0
      ? 'frame-aligned-v001'
      : 'source-audio-ended-no-padding-v001';
    if (encoded.tailPolicy !== expectedTailPolicy) {
      invalid('$generationManifest.audio.encoded.tailPolicy');
    }
    const maximumSourceSample = segments.reduce((maximum, segment) => (
      isObject(segment.audioSamples) && isNonNegativeInteger(segment.audioSamples.sourceEnd)
        ? Math.max(maximum, segment.audioSamples.sourceEnd)
        : maximum
    ), 0);
    if (
      maximumSourceSample > 0
      && isPositiveInteger(audio.sourceGrid?.sampleCount)
      && audio.sourceGrid.sampleCount < maximumSourceSample
    ) invalid('$generationManifest.audio.sourceGrid.sampleCount');
  }
  if (sourceAudio.present !== audio.present) invalid('$generationManifest.audio.present');

  const execution = isObject(manifest.execution) ? manifest.execution : {};
  if (!exactFields(manifest.execution, ['commands', 'trustedSourceFiles'])) {
    invalid('$generationManifest.execution');
  }
  const expectedStages = audio.present === true
    ? EXECUTION_STAGES_WITH_AUDIO
    : EXECUTION_STAGES_WITHOUT_AUDIO;
  const commands = Array.isArray(execution.commands) ? execution.commands : [];
  if (
    !Array.isArray(execution.commands)
    || commands.length !== expectedStages.length
  ) {
    invalid('$generationManifest.execution.commands');
  }
  commands.forEach((commandValue, index) => {
    const path = `$generationManifest.execution.commands[${index}]`;
    const command = isObject(commandValue) ? commandValue : {};
    if (!exactFields(commandValue, ['stage', 'tool', 'arguments', 'filterGraph'])) invalid(path);
    const expectedStage = expectedStages[index];
    if (command.stage !== expectedStage) invalid(`${path}.stage`);
    if (command.tool !== 'ffmpeg') invalid(`${path}.tool`);

    const argumentsList = Array.isArray(command.arguments) ? command.arguments : [];
    if (
      !Array.isArray(command.arguments)
      || argumentsList.length === 0
      || !argumentsList.every(isNonEmptyString)
    ) invalid(`${path}.arguments`);

    if (expectedStage === 'video-build') {
      if (!isNonEmptyString(command.filterGraph)) invalid(`${path}.filterGraph`);
    } else if (command.filterGraph !== null) {
      invalid(`${path}.filterGraph`);
    }

    const contract = EXECUTION_COMMAND_CONTRACTS[expectedStage];
    if (contract && Array.isArray(command.arguments) && command.arguments.length > 0) {
      const inputPlaceholders = command.arguments.flatMap((argument, argumentIndex) => (
        argument === '-i' && argumentIndex + 1 < command.arguments.length
          ? [command.arguments[argumentIndex + 1]]
          : []
      ));
      const outputPlaceholder = audio.present === true
        ? contract.outputWithAudio
        : contract.outputWithoutAudio;
      const expectedPlaceholders = [...contract.inputPlaceholders, outputPlaceholder];
      const recordedPlaceholders = command.arguments.filter((argument) => (
        EXECUTION_PATH_PLACEHOLDER_PATTERN.test(argument)
      ));
      if (
        JSON.stringify(inputPlaceholders) !== JSON.stringify(contract.inputPlaceholders)
        || command.arguments.at(-1) !== outputPlaceholder
        || JSON.stringify(recordedPlaceholders) !== JSON.stringify(expectedPlaceholders)
      ) invalid(`${path}.arguments`);

      if (expectedStage === 'video-build') {
        const graphFlagIndexes = command.arguments.flatMap((argument, argumentIndex) => (
          argument === '-filter_complex' ? [argumentIndex] : []
        ));
        if (
          graphFlagIndexes.length !== 1
          || command.arguments[graphFlagIndexes[0] + 1] !== command.filterGraph
        ) invalid(`${path}.filterGraph`);
      }
    }
  });

  if (
    !Array.isArray(execution.trustedSourceFiles)
    || execution.trustedSourceFiles.length !== PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES.length
  ) {
    invalid('$generationManifest.execution.trustedSourceFiles');
  } else {
    execution.trustedSourceFiles.forEach((fileValue, index) => {
      const path = `$generationManifest.execution.trustedSourceFiles[${index}]`;
      const file = isObject(fileValue) ? fileValue : {};
      const expected = PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES[index];
      if (!exactFields(fileValue, ['role', 'path', 'fileSha256'])) invalid(path);
      if (file.role !== expected.role) invalid(`${path}.role`);
      if (file.path !== expected.path) invalid(`${path}.path`);
      if (file.fileSha256 !== expected.fileSha256) invalid(`${path}.fileSha256`);
    });
  }

  const tools = isObject(manifest.tools) ? manifest.tools : {};
  if (!exactFields(manifest.tools, ['expected', 'observed', 'binaryDiagnostics'])) {
    invalid('$generationManifest.tools');
  }
  for (const field of ['expected', 'observed']) {
    const profile = tools[field];
    const path = `$generationManifest.tools.${field}`;
    if (!exactFields(profile, ['nodeVersion', 'ffmpegVersion', 'ffprobeVersion'])) invalid(path);
    for (const versionField of ['nodeVersion', 'ffmpegVersion', 'ffprobeVersion']) {
      if (!isNonEmptyString(profile?.[versionField])) invalid(`${path}.${versionField}`);
    }
  }
  for (const field of ['nodeVersion', 'ffmpegVersion', 'ffprobeVersion']) {
    if (
      tools.expected?.[field] !== PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE[field]
      || tools.observed?.[field] !== PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE[field]
    ) invalid(`$generationManifest.tools.${field}`);
  }
  const binaryDiagnostics = isObject(tools.binaryDiagnostics) ? tools.binaryDiagnostics : {};
  if (!exactFields(tools.binaryDiagnostics, ['node', 'ffmpeg', 'ffprobe'])) {
    invalid('$generationManifest.tools.binaryDiagnostics');
  } else {
    for (const tool of ['node', 'ffmpeg', 'ffprobe']) {
      const diagnostic = binaryDiagnostics[tool];
      const diagnosticPath = `$generationManifest.tools.binaryDiagnostics.${tool}`;
      if (!exactFields(diagnostic, ['resolvedPath', 'fileSha256'])) invalid(diagnosticPath);
      if (!isNonEmptyString(diagnostic?.resolvedPath) || !diagnostic.resolvedPath.startsWith('/')) {
        invalid(`${diagnosticPath}.resolvedPath`);
      }
      if (!SHA256_PATTERN.test(diagnostic?.fileSha256 ?? '')) {
        invalid(`${diagnosticPath}.fileSha256`);
      }
    }
  }

  const versions = isObject(manifest.versions) ? manifest.versions : {};
  if (!exactFields(manifest.versions, ['generatorVersion', 'timelineCheckerVersion'])) {
    invalid('$generationManifest.versions');
  }
  if (versions.generatorVersion !== 'presentation-base-media-builder-v003') {
    invalid('$generationManifest.versions.generatorVersion');
  }
  if (versions.timelineCheckerVersion !== PRESENTATION_BASE_MEDIA_TIMELINE_CHECKER_VERSION) {
    invalid('$generationManifest.versions.timelineCheckerVersion');
  }

  const git = isObject(manifest.git) ? manifest.git : {};
  if (!exactFields(manifest.git, ['head', 'dirty'])) invalid('$generationManifest.git');
  if (typeof git.head !== 'string' || !GIT_HEAD_PATTERN.test(git.head)) invalid('$generationManifest.git.head');
  if (typeof git.dirty !== 'boolean') invalid('$generationManifest.git.dirty');

  if (
    !Array.isArray(manifest.implementationFiles)
    || manifest.implementationFiles.length !== IMPLEMENTATION_FILE_PATHS.length
  ) {
    invalid('$generationManifest.implementationFiles');
  } else {
    manifest.implementationFiles.forEach((file, index) => {
      const path = `$generationManifest.implementationFiles[${index}]`;
      if (!exactFields(file, ['path', 'fileSha256'])) invalid(path);
      if (file?.path !== IMPLEMENTATION_FILE_PATHS[index]) invalid(`${path}.path`);
      if (!isSha256(file?.fileSha256)) invalid(`${path}.fileSha256`);
    });
  }

  const outputs = isObject(manifest.outputs) ? manifest.outputs : {};
  if (!exactFields(manifest.outputs, ['baseMedia', 'timeline'])) invalid('$generationManifest.outputs');
  const outputBaseMedia = isObject(outputs.baseMedia) ? outputs.baseMedia : {};
  if (!exactFields(
    outputs.baseMedia,
    ['artifactId', 'path', 'fileSha256', 'frameRate', 'frameCount', 'audioPacketPayloadSha256'],
  )) invalid('$generationManifest.outputs.baseMedia');
  if (!isNonEmptyString(outputBaseMedia.artifactId)) invalid('$generationManifest.outputs.baseMedia.artifactId');
  if (outputBaseMedia.path !== BASE_MEDIA_FILE_NAME) invalid('$generationManifest.outputs.baseMedia.path');
  if (!isSha256(outputBaseMedia.fileSha256)) invalid('$generationManifest.outputs.baseMedia.fileSha256');
  if (outputBaseMedia.frameRate !== '30/1') invalid('$generationManifest.outputs.baseMedia.frameRate');
  if (!isPositiveInteger(outputBaseMedia.frameCount)) invalid('$generationManifest.outputs.baseMedia.frameCount');
  if (audio.present === false) {
    if (outputBaseMedia.audioPacketPayloadSha256 !== null) {
      invalid('$generationManifest.outputs.baseMedia.audioPacketPayloadSha256');
    }
  } else if (!isSha256(outputBaseMedia.audioPacketPayloadSha256)) {
    invalid('$generationManifest.outputs.baseMedia.audioPacketPayloadSha256');
  }
  if (
    audio.present === true
    && isSha256(audio.encoded?.packetPayloadSha256)
    && outputBaseMedia.audioPacketPayloadSha256 !== audio.encoded.packetPayloadSha256
  ) invalid('$generationManifest.outputs.baseMedia.audioPacketPayloadSha256');
  const outputTimeline = isObject(outputs.timeline) ? outputs.timeline : {};
  if (!exactFields(outputs.timeline, ['timelineId', 'schemaVersion', 'path', 'fileSha256'])) {
    invalid('$generationManifest.outputs.timeline');
  }
  if (!isNonEmptyString(outputTimeline.timelineId)) invalid('$generationManifest.outputs.timeline.timelineId');
  if (outputTimeline.schemaVersion !== PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION) {
    invalid('$generationManifest.outputs.timeline.schemaVersion');
  }
  if (outputTimeline.path !== TIMELINE_FILE_NAME) invalid('$generationManifest.outputs.timeline.path');
  if (!isSha256(outputTimeline.fileSha256)) invalid('$generationManifest.outputs.timeline.fileSha256');

  if (
    !Array.isArray(manifest.excludedLegacyFields)
    || JSON.stringify(manifest.excludedLegacyFields) !== JSON.stringify(['screenLayout', 'telopPlan'])
  ) invalid('$generationManifest.excludedLegacyFields');

  return {
    manifest,
    source,
    video,
    segments,
    versions,
    outputBaseMedia,
    outputTimeline,
  };
}

/**
 * 30fps論理source frameと、組み立て済み基礎映像のoutput frameの対応を検査する。
 * `observedBaseMedia` は実ファイルを読んだ側が得た基礎映像hash・frame数と
 * timeline実file hashの3値を、全て揃えて渡す。
 */
export function validatePresentationBaseMediaTimelineV004(
  timelineInput,
  generationManifestInput,
  observedBaseMedia,
) {
  const violations = [];
  const add = (code, path, relatedIds = [], details) => {
    violations.push(issue(code, path, relatedIds, details));
  };
  const timelineParts = inspectTimeline(timelineInput, add);
  const manifestParts = inspectGenerationManifest(generationManifestInput, add);
  const observed = isObject(observedBaseMedia) ? observedBaseMedia : {};

  if (!exactFields(
    observedBaseMedia,
    ['fileSha256', 'frameCount', 'timelineFileSha256'],
  )) {
    add('BASE_MEDIA_OBSERVATION_INVALID', '$observedBaseMedia');
  }
  if (
    observed.fileSha256 !== undefined
    && !isSha256(observed.fileSha256)
  ) {
    add('BASE_MEDIA_OBSERVATION_INVALID', '$observedBaseMedia.fileSha256');
  }
  if (
    observed.frameCount !== undefined
    && !isPositiveInteger(observed.frameCount)
  ) {
    add('BASE_MEDIA_OBSERVATION_INVALID', '$observedBaseMedia.frameCount');
  }
  if (
    observed.timelineFileSha256 !== undefined
    && !isSha256(observed.timelineFileSha256)
  ) {
    add('BASE_MEDIA_OBSERVATION_INVALID', '$observedBaseMedia.timelineFileSha256');
  }

  const { timeline, sourceFrameClock, baseMedia, segments } = timelineParts;
  const {
    source,
    video,
    segments: manifestSegments,
    outputBaseMedia,
    outputTimeline,
  } = manifestParts;

  if (
    isNonEmptyString(timeline.sourceRef)
    && isNonEmptyString(source.sourceRef)
    && timeline.sourceRef !== source.sourceRef
  ) {
    add('TIMELINE_SOURCE_REF_MISMATCH', '$.sourceRef', [timeline.sourceRef, source.sourceRef]);
  }
  if (
    isNonEmptyString(timeline.sourceProvenance)
    && isNonEmptyString(source.sourceProvenance)
    && timeline.sourceProvenance !== source.sourceProvenance
  ) {
    add('TIMELINE_SOURCE_REF_MISMATCH', '$.sourceProvenance', [], {
      timeline: timeline.sourceProvenance,
      generationManifest: source.sourceProvenance,
    });
  }
  if (
    isNonEmptyString(sourceFrameClock.inputFrameRate)
    && isNonEmptyString(video.frameRate)
    && sourceFrameClock.inputFrameRate !== video.frameRate
  ) {
    add('TIMELINE_SOURCE_CLOCK_MISMATCH', '$.sourceFrameClock.inputFrameRate', [], {
      timeline: sourceFrameClock.inputFrameRate,
      generationManifest: video.frameRate,
    });
  }
  if (
    isPositiveInteger(sourceFrameClock.decodedFrameCount)
    && isPositiveInteger(video.decodedFrameCount)
    && sourceFrameClock.decodedFrameCount !== video.decodedFrameCount
  ) {
    add('TIMELINE_SOURCE_CLOCK_MISMATCH', '$.sourceFrameClock.decodedFrameCount', [], {
      timeline: sourceFrameClock.decodedFrameCount,
      generationManifest: video.decodedFrameCount,
    });
  }
  for (const [timelineField, manifestField] of [
    ['containerStartTimeMs', 'containerStartTimeMs'],
    ['videoStreamTimeBase', 'timeBase'],
    ['videoFirstPts', 'firstPts'],
    ['videoPtsStep', 'ptsStep'],
    ['videoPresentationOffsetMs', 'presentationOffsetMs'],
  ]) {
    if (sourceFrameClock[timelineField] !== undefined
        && video[manifestField] !== undefined
        && sourceFrameClock[timelineField] !== video[manifestField]) {
      add('TIMELINE_SOURCE_CLOCK_MISMATCH', `$.sourceFrameClock.${timelineField}`, [], {
        timeline: sourceFrameClock[timelineField],
        generationManifest: video[manifestField],
      });
    }
  }
  const logicalSourceFrameCount = logicalSourceFrameCountV002(
    video.frameRate,
    video.decodedFrameCount,
  );
  if (logicalSourceFrameCount !== null) {
    segments.forEach((segment, index) => {
      if (
        isNonNegativeInteger(segment?.sourceStartFrame30)
        && isNonNegativeInteger(segment?.sourceEndFrame30)
        && (
          segment.sourceStartFrame30 >= logicalSourceFrameCount
          || segment.sourceEndFrame30 > logicalSourceFrameCount
        )
      ) {
        add(
          'TIMELINE_SOURCE_FRAME_MAPPING_INVALID',
          `$.segments[${index}]`,
          [segment.segmentId],
          {
            logicalSourceFrameCount,
            sourceStartFrame30: segment.sourceStartFrame30,
            sourceEndFrame30: segment.sourceEndFrame30,
          },
        );
      }
    });
  }

  const compare = (left, right, code, path, details) => {
    if (left !== undefined && right !== undefined && left !== right) add(code, path, [], details);
  };
  compare(
    baseMedia.artifactId,
    outputBaseMedia.artifactId,
    'TIMELINE_SEGMENT_MANIFEST_MISMATCH',
    '$.baseMedia.artifactId',
    { timeline: baseMedia.artifactId, generationManifest: outputBaseMedia.artifactId },
  );
  compare(
    baseMedia.path,
    outputBaseMedia.path,
    'TIMELINE_SEGMENT_MANIFEST_MISMATCH',
    '$.baseMedia.path',
    { timeline: baseMedia.path, generationManifest: outputBaseMedia.path },
  );
  compare(
    baseMedia.fileSha256,
    outputBaseMedia.fileSha256,
    'BASE_MEDIA_HASH_MISMATCH',
    '$.baseMedia.fileSha256',
    { timeline: baseMedia.fileSha256, generationManifest: outputBaseMedia.fileSha256 },
  );
  compare(
    baseMedia.frameRate,
    outputBaseMedia.frameRate,
    'TIMELINE_SEGMENT_MANIFEST_MISMATCH',
    '$.baseMedia.frameRate',
    { timeline: baseMedia.frameRate, generationManifest: outputBaseMedia.frameRate },
  );
  compare(
    baseMedia.expectedFrameCount,
    outputBaseMedia.frameCount,
    'BASE_MEDIA_FRAME_COUNT_MISMATCH',
    '$.baseMedia.expectedFrameCount',
    { timeline: baseMedia.expectedFrameCount, generationManifest: outputBaseMedia.frameCount },
  );
  compare(
    timeline.timelineId,
    outputTimeline.timelineId,
    'TIMELINE_SEGMENT_MANIFEST_MISMATCH',
    '$.timelineId',
    { timeline: timeline.timelineId, generationManifest: outputTimeline.timelineId },
  );

  if (segments.length !== manifestSegments.length) {
    add('TIMELINE_SEGMENT_MANIFEST_MISMATCH', '$.segments', [], {
      timelineCount: segments.length,
      generationManifestCount: manifestSegments.length,
    });
  }
  const segmentFields = [
    'segmentId',
    'sourceStartMs',
    'sourceEndMs',
    'sourceStartFrame30',
    'sourceEndFrame30',
    'outputStartFrame',
    'outputEndFrame',
  ];
  for (let index = 0; index < Math.min(segments.length, manifestSegments.length); index += 1) {
    const timelineSegment = segments[index];
    const manifestSegment = manifestSegments[index];
    for (const field of segmentFields) {
      if (timelineSegment?.[field] !== manifestSegment?.[field]) {
        add(
          'TIMELINE_SEGMENT_MANIFEST_MISMATCH',
          `$.segments[${index}].${field}`,
          [timelineSegment?.segmentId, manifestSegment?.segmentId],
          { timeline: timelineSegment?.[field] ?? null, generationManifest: manifestSegment?.[field] ?? null },
        );
      }
    }
  }

  if (
    isSha256(observed.fileSha256)
    && observed.fileSha256 !== baseMedia.fileSha256
  ) {
    add('BASE_MEDIA_HASH_MISMATCH', '$observedBaseMedia.fileSha256', [], {
      observed: observed.fileSha256,
      expected: baseMedia.fileSha256,
    });
  }
  if (
    isPositiveInteger(observed.frameCount)
    && observed.frameCount !== baseMedia.expectedFrameCount
  ) {
    add('BASE_MEDIA_FRAME_COUNT_MISMATCH', '$observedBaseMedia.frameCount', [], {
      observed: observed.frameCount,
      expected: baseMedia.expectedFrameCount,
    });
  }
  if (
    isSha256(observed.timelineFileSha256)
    && observed.timelineFileSha256 !== outputTimeline.fileSha256
  ) {
    add('BASE_MEDIA_GENERATION_MANIFEST_INVALID', '$observedBaseMedia.timelineFileSha256', [], {
      observed: observed.timelineFileSha256,
      expected: outputTimeline.fileSha256,
    });
  }

  sortIssues(violations);
  return {
    schemaVersion: 'presentation-base-media-timeline-report-v003',
    checkerVersion: PRESENTATION_BASE_MEDIA_TIMELINE_CHECKER_VERSION,
    status: violations.length === 0 ? 'passed' : 'failed',
    violations,
    timeline: violations.length === 0 ? structuredClone(timeline) : null,
  };
}

/** source側半開区間を、分割せず1 segmentだけでoutput frameへ直接写す。 */
export function mapPresentationSourceIntervalV002(timelineInput, sourceStartMs, sourceEndMs) {
  const violations = [];
  const add = (code, path, relatedIds = [], details) => {
    violations.push(issue(code, path, relatedIds, details));
  };
  const timelineParts = inspectTimeline(timelineInput, add);
  if (violations.some((entry) => entry.code === 'BASE_MEDIA_TIMELINE_INVALID')) {
    sortIssues(violations);
    return { status: 'failed', violations, mapping: null };
  }

  const intervalValid = isNonNegativeInteger(sourceStartMs)
    && isNonNegativeInteger(sourceEndMs)
    && sourceStartMs < sourceEndMs;
  if (!intervalValid) {
    add('INSTRUCTION_SOURCE_INTERVAL_UNMAPPED', '$sourceInterval', [], {
      sourceStartMs,
      sourceEndMs,
    });
  }
  const segments = timelineParts.segments;
  const containing = intervalValid
    ? segments.filter((segment) => (
      isNonNegativeInteger(segment?.sourceStartMs)
      && isNonNegativeInteger(segment?.sourceEndMs)
      && segment.sourceStartMs <= sourceStartMs
      && sourceEndMs <= segment.sourceEndMs
    ))
    : [];

  if (intervalValid && containing.length > 1) {
    add(
      'INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS',
      '$sourceInterval',
      containing.map((segment) => segment.segmentId),
    );
  } else if (intervalValid && containing.length === 0) {
    const overlapping = segments.filter((segment) => (
      isNonNegativeInteger(segment?.sourceStartMs)
      && isNonNegativeInteger(segment?.sourceEndMs)
      && Math.max(sourceStartMs, segment.sourceStartMs) < Math.min(sourceEndMs, segment.sourceEndMs)
    ));
    add(
      overlapping.length > 1
        ? 'INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED'
        : 'INSTRUCTION_SOURCE_INTERVAL_UNMAPPED',
      '$sourceInterval',
      overlapping.map((segment) => segment.segmentId),
    );
  }
  if (violations.length > 0) {
    sortIssues(violations);
    return { status: 'failed', violations, mapping: null };
  }

  const segment = containing[0];
  const sourceStartFrame30 = frameBoundaryWithVideoOffsetV001(
    sourceStartMs,
    timelineParts.sourceFrameClock.videoPresentationOffsetMs,
  );
  const sourceEndFrame30 = sourceEndFrameBoundaryWithVideoOffsetV001(
    sourceEndMs,
    timelineParts.sourceFrameClock,
  );
  if (sourceStartFrame30 >= sourceEndFrame30) {
    add('INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME', '$sourceInterval', [segment.segmentId], {
      sourceStartMs,
      sourceEndMs,
      sourceStartFrame30,
      sourceEndFrame30,
    });
  } else if (
    sourceStartFrame30 < segment.sourceStartFrame30
    || sourceEndFrame30 > segment.sourceEndFrame30
  ) {
    add('INSTRUCTION_SOURCE_INTERVAL_UNMAPPED', '$sourceInterval', [segment.segmentId], {
      sourceStartFrame30,
      sourceEndFrame30,
      segmentSourceStartFrame30: segment.sourceStartFrame30,
      segmentSourceEndFrame30: segment.sourceEndFrame30,
    });
  }
  if (violations.length > 0) {
    sortIssues(violations);
    return { status: 'failed', violations, mapping: null };
  }

  const startFrame = segment.outputStartFrame + (sourceStartFrame30 - segment.sourceStartFrame30);
  const endFrameExclusive = segment.outputStartFrame + (sourceEndFrame30 - segment.sourceStartFrame30);
  return {
    status: 'passed',
    violations: [],
    mapping: {
      timelineSegmentId: segment.segmentId,
      sourceStartMs,
      sourceEndMs,
      sourceStartFrame30,
      sourceEndFrame30,
      startFrame,
      endFrameExclusive,
      displayFrameCount: endFrameExclusive - startFrame,
    },
  };
}
