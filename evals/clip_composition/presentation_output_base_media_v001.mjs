import {createHash} from 'node:crypto';

import {
  canonicalSha256PresentationMeaningInformationJsonV001,
  makePresentationMeaningInformationViolationV001,
  serializePresentationMeaningInformationFormalJsonV001,
  validatePresentationMeaningInformationPackageV001,
  validatePresentationMeaningJsonBindingV001,
  validatePresentationMeaningMediaBindingV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION,
  frameBoundaryV001,
  sourceEndFrameBoundaryV002,
} from './presentation_base_media_timeline_v002.mjs';

export const PRESENTATION_OUTPUT_BASE_MEDIA_BUILD_JOB_SCHEMA_V001 =
  'presentation-output-base-media-build-job-v001';
export const PRESENTATION_OUTPUT_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_V001 =
  'presentation-output-base-media-generation-manifest-v001';
export const PRESENTATION_OUTPUT_BASE_MEDIA_VALIDATION_RECEIPT_SCHEMA_V001 =
  'presentation-output-base-media-validation-receipt-v001';
export const PRESENTATION_OUTPUT_BASE_MEDIA_FAILURE_REPORT_SCHEMA_V001 =
  'presentation-output-base-media-failure-report-v001';

export const PRESENTATION_OUTPUT_BASE_MEDIA_JOB_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-output-base-media-jobs';
export const PRESENTATION_OUTPUT_BASE_MEDIA_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-output-base-media';
export const PRESENTATION_OUTPUT_BASE_MEDIA_FAILURE_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-output-base-media-failures';
export const PRESENTATION_MEANING_INFORMATION_PACKAGE_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-information-packages';

export const PRESENTATION_OUTPUT_BASE_MEDIA_ARTIFACT_NAMES_V001 = Object.freeze([
  'base-media.mp4',
  'timeline.json',
  'generation-manifest.json',
  'validation-receipt.json',
]);

export const PRESENTATION_OUTPUT_BASE_MEDIA_STAGES_V001 = Object.freeze([
  'job-read',
  'job-validation',
  'meaning-package-read',
  'meaning-package-validation',
  'source-inspection',
  'timeline-mapping',
  'video-build',
  'audio-grid',
  'audio-build',
  'mux',
  'media-inspection',
  'validation',
  'publication',
]);

export const PRESENTATION_OUTPUT_BASE_MEDIA_OBSERVATION_NAMES_V001 = Object.freeze([
  'job-file-sha256',
  'meaning-package-file-sha256',
  'source-frame-count',
  'mapped-output-frame-count',
  'built-video-frame-count',
  'built-audio-sample-count',
  'output-file-sha256',
]);

export const PRESENTATION_OUTPUT_BASE_MEDIA_VIOLATION_CODES_V001 = Object.freeze([
  'OUTPUT_BASE_MEDIA_JOB_INVALID',
  'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH',
  'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID',
  'OUTPUT_BASE_MEDIA_CAPABILITY_UNSUPPORTED',
  'OUTPUT_BASE_MEDIA_SOURCE_INSPECTION_FAILED',
  'OUTPUT_BASE_MEDIA_FRAME_MAPPING_INVALID',
  'OUTPUT_BASE_MEDIA_VIDEO_BUILD_FAILED',
  'OUTPUT_BASE_MEDIA_AUDIO_GRID_FAILED',
  'OUTPUT_BASE_MEDIA_AUDIO_BUILD_FAILED',
  'OUTPUT_BASE_MEDIA_MUX_FAILED',
  'OUTPUT_BASE_MEDIA_OUTPUT_INSPECTION_FAILED',
  'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH',
  'OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID',
  'OUTPUT_BASE_MEDIA_PUBLICATION_FAILED',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;
const JOB_SUFFIX = '-output-base-media';

const CODE_STAGE = Object.freeze({
  OUTPUT_BASE_MEDIA_JOB_INVALID: 'job-validation',
  OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH: 'meaning-package-read',
  OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID: 'meaning-package-validation',
  OUTPUT_BASE_MEDIA_CAPABILITY_UNSUPPORTED: 'timeline-mapping',
  OUTPUT_BASE_MEDIA_SOURCE_INSPECTION_FAILED: 'source-inspection',
  OUTPUT_BASE_MEDIA_FRAME_MAPPING_INVALID: 'timeline-mapping',
  OUTPUT_BASE_MEDIA_VIDEO_BUILD_FAILED: 'video-build',
  OUTPUT_BASE_MEDIA_AUDIO_GRID_FAILED: 'audio-grid',
  OUTPUT_BASE_MEDIA_AUDIO_BUILD_FAILED: 'audio-build',
  OUTPUT_BASE_MEDIA_MUX_FAILED: 'mux',
  OUTPUT_BASE_MEDIA_OUTPUT_INSPECTION_FAILED: 'media-inspection',
  OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH: 'validation',
  OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID: 'job-validation',
  OUTPUT_BASE_MEDIA_PUBLICATION_FAILED: 'publication',
});

const CODE_PATH = Object.freeze({
  OUTPUT_BASE_MEDIA_JOB_INVALID: '',
  OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH: '/meaningPackageBinding',
  OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID: '/meaningPackageBinding',
  OUTPUT_BASE_MEDIA_CAPABILITY_UNSUPPORTED: '/timelineComposition',
  OUTPUT_BASE_MEDIA_SOURCE_INSPECTION_FAILED: '/sourceMedia/0/mediaBinding',
  OUTPUT_BASE_MEDIA_FRAME_MAPPING_INVALID: '/timelineComposition/segments',
  OUTPUT_BASE_MEDIA_VIDEO_BUILD_FAILED: '/timelineComposition/segments',
  OUTPUT_BASE_MEDIA_AUDIO_GRID_FAILED: '/sourceMedia/0/mediaBinding',
  OUTPUT_BASE_MEDIA_AUDIO_BUILD_FAILED: '/sourceMedia/0/mediaBinding',
  OUTPUT_BASE_MEDIA_MUX_FAILED: '/outputRoot',
  OUTPUT_BASE_MEDIA_OUTPUT_INSPECTION_FAILED: '/outputRoot/base-media.mp4',
  OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH: '/outputRoot',
  OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID: '/outputRoot',
  OUTPUT_BASE_MEDIA_PUBLICATION_FAILED: '/outputRoot',
});

const EXECUTION_FAILURE_CODE = Object.freeze({
  'source-inspection-failed': 'OUTPUT_BASE_MEDIA_SOURCE_INSPECTION_FAILED',
  'frame-mapping-invalid': 'OUTPUT_BASE_MEDIA_FRAME_MAPPING_INVALID',
  'video-build-failed': 'OUTPUT_BASE_MEDIA_VIDEO_BUILD_FAILED',
  'audio-grid-failed': 'OUTPUT_BASE_MEDIA_AUDIO_GRID_FAILED',
  'audio-build-failed': 'OUTPUT_BASE_MEDIA_AUDIO_BUILD_FAILED',
  'mux-failed': 'OUTPUT_BASE_MEDIA_MUX_FAILED',
  'output-inspection-failed': 'OUTPUT_BASE_MEDIA_OUTPUT_INSPECTION_FAILED',
});

const REJECTED_CODES = new Set([
  'OUTPUT_BASE_MEDIA_JOB_INVALID',
  'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH',
  'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID',
  'OUTPUT_BASE_MEDIA_CAPABILITY_UNSUPPORTED',
  'OUTPUT_BASE_MEDIA_FRAME_MAPPING_INVALID',
  'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH',
  'OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID',
]);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

const derivedPackageId = jobId => typeof jobId === 'string' && jobId.endsWith(JOB_SUFFIX)
  ? jobId.slice(0, -JOB_SUFFIX.length)
  : null;

const expectedPackagePath = packageId =>
  `${PRESENTATION_MEANING_INFORMATION_PACKAGE_ROOT_V001}/${packageId}/meaning-information-package.json`;
const expectedOutputRoot = packageId =>
  `${PRESENTATION_OUTPUT_BASE_MEDIA_ROOT_V001}/${packageId}`;

export const serializePresentationOutputBaseMediaFormalJsonV001 = value =>
  serializePresentationMeaningInformationFormalJsonV001(value);
export const canonicalSha256PresentationOutputBaseMediaJsonV001 = value =>
  canonicalSha256PresentationMeaningInformationJsonV001(value);
export const sha256PresentationOutputBaseMediaBytesV001 = sha256;

export const makePresentationOutputBaseMediaViolationV001 = (code, path = CODE_PATH[code]) => {
  if (!PRESENTATION_OUTPUT_BASE_MEDIA_VIOLATION_CODES_V001.includes(code)
    || typeof path !== 'string') throw new TypeError('unknown output-base-media violation');
  return Object.freeze({code, path, relatedIds: Object.freeze([])});
};

/**
 * 実行段階の失敗を、正式reportが所有するcode/stage/pathへ一意に写す正本。
 * runnerと検査はこの入口を共有し、source文字列の静的探索で所有を代用しない。
 */
export function resolvePresentationOutputBaseMediaExecutionFailureV001(
  event,
  {errorPath = ''} = {},
) {
  let code = EXECUTION_FAILURE_CODE[event] ?? null;
  if (event === 'audio-build-error') {
    code = errorPath.startsWith('$audio.sourceGrid')
      || errorPath.startsWith('$audio.insertedSilence')
      || errorPath.startsWith('$ffmpeg.audioDecode')
      ? 'OUTPUT_BASE_MEDIA_AUDIO_GRID_FAILED'
      : 'OUTPUT_BASE_MEDIA_AUDIO_BUILD_FAILED';
  }
  if (code === null) return null;
  return Object.freeze({
    code,
    stage: CODE_STAGE[code],
    path: CODE_PATH[code],
    status: REJECTED_CODES.has(code) ? 'rejected' : 'fatal',
  });
}

export function validatePresentationOutputBaseMediaBuildJobV001(value) {
  const reject = code => ({
    status: 'rejected',
    violations: [makePresentationOutputBaseMediaViolationV001(code)],
  });
  if (!exactKeys(value, [
    'schemaVersion', 'jobId', 'mode', 'meaningPackageBinding', 'outputRoot',
    'expectedTimelineCompositionCanonicalSha256',
  ])
    || value.schemaVersion !== PRESENTATION_OUTPUT_BASE_MEDIA_BUILD_JOB_SCHEMA_V001
    || !FORMAL_ID.test(value.jobId ?? '')
    || value.mode !== 'formal-generation'
    || !validatePresentationMeaningJsonBindingV001(value.meaningPackageBinding)
    || value.meaningPackageBinding.schemaVersion !== 'zev-meaning-information-package-v001'
    || !WORKSPACE_PATH.test(value.outputRoot ?? '')
    || !SHA256.test(value.expectedTimelineCompositionCanonicalSha256 ?? '')) {
    return reject('OUTPUT_BASE_MEDIA_JOB_INVALID');
  }
  const packageId = derivedPackageId(value.jobId);
  if (!FORMAL_ID.test(packageId ?? '')
    || [
      `${value.jobId}-timeline`,
      `${value.jobId}-base-media`,
      `${value.jobId}-generation-manifest`,
      `${value.jobId}-validation-receipt`,
    ].some(derivedId => !FORMAL_ID.test(derivedId))
    || value.meaningPackageBinding.path !== expectedPackagePath(packageId)) {
    return reject('OUTPUT_BASE_MEDIA_JOB_INVALID');
  }
  if (value.outputRoot !== expectedOutputRoot(packageId)) {
    return reject('OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID');
  }
  return {status: 'passed', violations: [], packageId};
}

export function validatePresentationOutputMeaningPackageV001(value, context = {}) {
  if (!isObject(context)
    || !validatePresentationTimelineCompositionDecisionV001(context.timelineDecision)
    || !dense(context.expectedAtomOccurrences)
    || !(context.occurrenceAtoms instanceof Map)) {
    return {
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'EXPECTED_ATOM_OCCURRENCE_INVALID',
        '/expectedAtomOccurrences',
      )],
    };
  }
  return validatePresentationMeaningInformationPackageV001(value, {
    timelineDecision: context.timelineDecision,
    expectedAtomOccurrences: context.expectedAtomOccurrences,
    occurrenceAtoms: context.occurrenceAtoms,
  });
}

export function validatePresentationOutputBaseMediaCapabilityV001(value, sourceInspection) {
  if (!isObject(value)
    || !Array.isArray(value.sourceMedia) || value.sourceMedia.length !== 1
    || !Array.isArray(value.timelineComposition?.segments)
    || value.timelineComposition.segments.length < 1
    || !isObject(sourceInspection)
    || ![30, 60].includes(sourceInspection.fps)
    || !positive(sourceInspection.decodedFrameCount)
    || !isObject(sourceInspection.audioClock)) return false;
  const sourceId = value.sourceMedia[0].sourceMediaId;
  let previous = null;
  for (const segment of value.timelineComposition.segments) {
    if (segment.sourceMediaId !== sourceId
      || !nonnegative(segment.sourceStartMs)
      || !positive(segment.sourceEndMs)
      || segment.sourceStartMs >= segment.sourceEndMs
      || (previous !== null && segment.sourceStartMs < previous.sourceEndMs)) return false;
    previous = segment;
  }
  return true;
}

/**
 * capabilityの観測事実を、正式reportが所有する違反へ写す唯一の純粋入口。
 * runnerと検査はvalidatorのfalseをそれぞれ独自にcodeへ読み替えない。
 */
export function inspectPresentationOutputBaseMediaCapabilityObservationV001(observation) {
  if (!exactKeys(observation, ['capabilitySupported'])
    || typeof observation.capabilitySupported !== 'boolean') {
    throw new TypeError('output base-media capability observation is invalid');
  }
  if (observation.capabilitySupported) {
    return Object.freeze({status: 'passed', stage: null, violations: Object.freeze([])});
  }
  const code = 'OUTPUT_BASE_MEDIA_CAPABILITY_UNSUPPORTED';
  return Object.freeze({
    status: 'rejected',
    stage: CODE_STAGE[code],
    violations: Object.freeze([makePresentationOutputBaseMediaViolationV001(code)]),
  });
}

export const validatePresentationOutputBaseMediaTimelineV001 = (
  timeline,
  {job, packageValue, sourceIdentity, sourceInspection},
) => {
  if (!exactKeys(timeline, [
    'schemaVersion', 'timelineId', 'sourceProvenance', 'sourceRef',
    'sourceFrameClock', 'baseMedia', 'segments',
  ])
    || timeline.schemaVersion !== PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION
    || timeline.timelineId !== `${job.jobId}-timeline`
    || timeline.sourceProvenance !== sourceIdentity.sourceProvenance
    || timeline.sourceRef !== packageValue.sourceMedia[0].sourceRef
    || !exactKeys(timeline.sourceFrameClock, [
      'inputFrameRate', 'logicalFrameRate', 'extractionRuleId', 'decodedFrameCount',
    ])
    || timeline.sourceFrameClock.inputFrameRate !== `${sourceInspection.fps}/1`
    || timeline.sourceFrameClock.logicalFrameRate !== '30/1'
    || timeline.sourceFrameClock.extractionRuleId !== (sourceInspection.fps === 60
      ? 'source-frame-60fps-global-even-v001'
      : 'source-frame-30fps-identity-v001')
    || timeline.sourceFrameClock.decodedFrameCount !== sourceInspection.decodedFrameCount
    || !exactKeys(timeline.baseMedia, [
      'artifactId', 'path', 'fileSha256', 'frameRate', 'expectedFrameCount',
    ])
    || timeline.baseMedia.artifactId !== `${job.jobId}-base-media`
    || timeline.baseMedia.path !== 'base-media.mp4'
    || !SHA256.test(timeline.baseMedia.fileSha256 ?? '')
    || timeline.baseMedia.frameRate !== '30/1'
    || !positive(timeline.baseMedia.expectedFrameCount)
    || !dense(timeline.segments)
    || timeline.segments.length !== packageValue.timelineComposition.segments.length) return false;

  let outputStartFrame = 0;
  for (const [index, segment] of timeline.segments.entries()) {
    const semantic = packageValue.timelineComposition.segments[index];
    const sourceEnd = sourceEndFrameBoundaryV002(semantic.sourceEndMs, {
      inputFrameRate: `${sourceInspection.fps}/1`,
      decodedFrameCount: sourceInspection.decodedFrameCount,
    });
    const sourceStart = frameBoundaryV001(semantic.sourceStartMs);
    if (!exactKeys(segment, [
      'segmentId', 'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30',
      'sourceEndFrame30', 'outputStartFrame', 'outputEndFrame',
    ])
      || segment.segmentId !== semantic.segmentId
      || segment.sourceStartMs !== semantic.sourceStartMs
      || segment.sourceEndMs !== semantic.sourceEndMs
      || segment.sourceStartFrame30 !== sourceStart
      || segment.sourceEndFrame30 !== sourceEnd
      || segment.outputStartFrame !== outputStartFrame
      || segment.outputEndFrame !== outputStartFrame + sourceEnd - sourceStart) return false;
    outputStartFrame = segment.outputEndFrame;
  }
  return timeline.baseMedia.expectedFrameCount === outputStartFrame;
};

export function buildPresentationOutputBaseMediaTimelineV001({
  job,
  packageValue,
  sourceIdentity,
  sourceInspection,
  mappings,
  baseMediaFileSha256,
}) {
  const timeline = {
    schemaVersion: PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION,
    timelineId: `${job.jobId}-timeline`,
    sourceProvenance: sourceIdentity.sourceProvenance,
    sourceRef: packageValue.sourceMedia[0].sourceRef,
    sourceFrameClock: {
      inputFrameRate: `${sourceInspection.fps}/1`,
      logicalFrameRate: '30/1',
      extractionRuleId: sourceInspection.fps === 60
        ? 'source-frame-60fps-global-even-v001'
        : 'source-frame-30fps-identity-v001',
      decodedFrameCount: sourceInspection.decodedFrameCount,
    },
    baseMedia: {
      artifactId: `${job.jobId}-base-media`,
      path: 'base-media.mp4',
      fileSha256: baseMediaFileSha256,
      frameRate: '30/1',
      expectedFrameCount: mappings.at(-1)?.outputEndFrame ?? 0,
    },
    segments: mappings.map(({audioSamples: _audioSamples, ...mapping}) => mapping),
  };
  if (!validatePresentationOutputBaseMediaTimelineV001(
    timeline,
    {job, packageValue, sourceIdentity, sourceInspection},
  )) {
    throw new TypeError('output base-media timeline invalid');
  }
  return timeline;
}

const validateManifest = value => exactKeys(value, [
  'schemaVersion', 'manifestId', 'jobBinding', 'meaningPackageBinding',
  'sourceMediaBindings', 'baseMedia', 'timeline', 'semanticProjection',
  'mediaBuildProjection',
])
  && value.schemaVersion === PRESENTATION_OUTPUT_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_V001
  && FORMAL_ID.test(value.manifestId ?? '')
  && validatePresentationMeaningJsonBindingV001(value.jobBinding)
  && value.jobBinding.schemaVersion === PRESENTATION_OUTPUT_BASE_MEDIA_BUILD_JOB_SCHEMA_V001
  && validatePresentationMeaningJsonBindingV001(value.meaningPackageBinding)
  && value.meaningPackageBinding.schemaVersion === 'zev-meaning-information-package-v001'
  && dense(value.sourceMediaBindings) && value.sourceMediaBindings.length === 1
  && value.sourceMediaBindings.every(validatePresentationMeaningMediaBindingV001)
  && validatePresentationMeaningMediaBindingV001(value.baseMedia)
  && validatePresentationMeaningJsonBindingV001(value.timeline)
  && value.timeline.schemaVersion === PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION
  && exactKeys(value.semanticProjection, [
    'sourceMediaCount', 'segmentCount', 'sourceMediaBindingsCanonicalSha256',
    'timelineCompositionCanonicalSha256',
  ])
  && positive(value.semanticProjection.sourceMediaCount)
  && positive(value.semanticProjection.segmentCount)
  && SHA256.test(value.semanticProjection.sourceMediaBindingsCanonicalSha256 ?? '')
  && SHA256.test(value.semanticProjection.timelineCompositionCanonicalSha256 ?? '')
  && exactKeys(value.mediaBuildProjection, [
    'frameCount', 'sampleCount', 'audioPacketPayloadSha256',
  ])
  && positive(value.mediaBuildProjection.frameCount)
  && positive(value.mediaBuildProjection.sampleCount)
  && SHA256.test(value.mediaBuildProjection.audioPacketPayloadSha256 ?? '');

const validateReceipt = value => exactKeys(value, [
  'schemaVersion', 'receiptId', 'status', 'jobBinding', 'manifestBinding',
  'checks', 'mediaProjection',
])
  && value.schemaVersion === PRESENTATION_OUTPUT_BASE_MEDIA_VALIDATION_RECEIPT_SCHEMA_V001
  && FORMAL_ID.test(value.receiptId ?? '')
  && value.status === 'passed'
  && validatePresentationMeaningJsonBindingV001(value.jobBinding)
  && value.jobBinding.schemaVersion === PRESENTATION_OUTPUT_BASE_MEDIA_BUILD_JOB_SCHEMA_V001
  && validatePresentationMeaningJsonBindingV001(value.manifestBinding)
  && value.manifestBinding.schemaVersion
    === PRESENTATION_OUTPUT_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_V001
  && exactKeys(value.checks, [
    'meaningBinding', 'timelineMapping', 'videoFrameCount', 'audioSampleGrid',
    'publicationHashGraph',
  ])
  && Object.values(value.checks).every(item => item === 'passed')
  && exactKeys(value.mediaProjection, [
    'frameCount', 'sampleCount', 'audioPacketPayloadSha256',
    'baseMediaFileSha256', 'timelineFileSha256',
  ])
  && positive(value.mediaProjection.frameCount)
  && positive(value.mediaProjection.sampleCount)
  && [
    value.mediaProjection.audioPacketPayloadSha256,
    value.mediaProjection.baseMediaFileSha256,
    value.mediaProjection.timelineFileSha256,
  ].every(item => SHA256.test(item ?? ''));

export const validatePresentationOutputBaseMediaGenerationManifestV001 = validateManifest;
export const validatePresentationOutputBaseMediaValidationReceiptV001 = validateReceipt;

export function buildPresentationOutputBaseMediaSuccessDocumentsV001({
  job,
  jobPath,
  jobBytes,
  packageValue,
  sourceIdentity,
  sourceInspection,
  mappings,
  baseMediaFileSha256,
  frameCount,
  sampleCount,
  audioPacketPayloadSha256,
}) {
  const timeline = buildPresentationOutputBaseMediaTimelineV001({
    job,
    packageValue,
    sourceIdentity,
    sourceInspection,
    mappings,
    baseMediaFileSha256,
  });
  const timelineBytes = serializePresentationOutputBaseMediaFormalJsonV001(timeline);
  const timelineFileSha256 = sha256(timelineBytes);
  const jobBinding = {
    schemaVersion: PRESENTATION_OUTPUT_BASE_MEDIA_BUILD_JOB_SCHEMA_V001,
    path: jobPath,
    fileSha256: sha256(jobBytes),
    canonicalSha256: canonicalSha256PresentationOutputBaseMediaJsonV001(job),
  };
  const timelineBinding = {
    schemaVersion: PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION,
    path: `${job.outputRoot}/timeline.json`,
    fileSha256: timelineFileSha256,
    canonicalSha256: canonicalSha256PresentationOutputBaseMediaJsonV001(timeline),
  };
  const manifest = {
    schemaVersion: PRESENTATION_OUTPUT_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_V001,
    manifestId: `${job.jobId}-generation-manifest`,
    jobBinding,
    meaningPackageBinding: job.meaningPackageBinding,
    sourceMediaBindings: packageValue.sourceMedia.map(source => source.mediaBinding),
    baseMedia: {
      path: `${job.outputRoot}/base-media.mp4`,
      fileSha256: baseMediaFileSha256,
    },
    timeline: timelineBinding,
    semanticProjection: {
      sourceMediaCount: packageValue.sourceMedia.length,
      segmentCount: packageValue.timelineComposition.segments.length,
      sourceMediaBindingsCanonicalSha256:
        canonicalSha256PresentationOutputBaseMediaJsonV001(
          packageValue.sourceMedia.map(source => source.mediaBinding),
        ),
      timelineCompositionCanonicalSha256:
        canonicalSha256PresentationOutputBaseMediaJsonV001(
          packageValue.timelineComposition,
        ),
    },
    mediaBuildProjection: {
      frameCount,
      sampleCount,
      audioPacketPayloadSha256,
    },
  };
  if (!validateManifest(manifest)) throw new TypeError('output base-media manifest invalid');
  const manifestBytes = serializePresentationOutputBaseMediaFormalJsonV001(manifest);
  const manifestBinding = {
    schemaVersion: PRESENTATION_OUTPUT_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_V001,
    path: `${job.outputRoot}/generation-manifest.json`,
    fileSha256: sha256(manifestBytes),
    canonicalSha256: canonicalSha256PresentationOutputBaseMediaJsonV001(manifest),
  };
  const receipt = {
    schemaVersion: PRESENTATION_OUTPUT_BASE_MEDIA_VALIDATION_RECEIPT_SCHEMA_V001,
    receiptId: `${job.jobId}-validation-receipt`,
    status: 'passed',
    jobBinding,
    manifestBinding,
    checks: {
      meaningBinding: 'passed',
      timelineMapping: 'passed',
      videoFrameCount: 'passed',
      audioSampleGrid: 'passed',
      publicationHashGraph: 'passed',
    },
    mediaProjection: {
      frameCount,
      sampleCount,
      audioPacketPayloadSha256,
      baseMediaFileSha256,
      timelineFileSha256,
    },
  };
  if (!validateReceipt(receipt)) throw new TypeError('output base-media receipt invalid');
  const receiptBytes = serializePresentationOutputBaseMediaFormalJsonV001(receipt);
  return {
    timeline,
    timelineBytes,
    manifest,
    manifestBytes,
    receipt,
    receiptBytes,
  };
}

export function validatePresentationOutputBaseMediaSuccessBundleV001({
  job,
  jobPath,
  jobBytes,
  packageValue,
  packageBytes,
  sourceIdentity,
  sourceInspection,
  outputInspection,
  baseMediaBytes,
  timelineBytes,
  timeline,
  manifestBytes,
  manifest,
  receiptBytes,
  receipt,
}) {
  const baseMediaFileSha256 = Buffer.isBuffer(baseMediaBytes)
    ? sha256(baseMediaBytes) : null;
  const timelineFileSha256 = Buffer.isBuffer(timelineBytes)
    ? sha256(timelineBytes) : null;
  const manifestFileSha256 = Buffer.isBuffer(manifestBytes)
    ? sha256(manifestBytes) : null;
  const expectedJobBinding = Buffer.isBuffer(jobBytes) && typeof jobPath === 'string'
    ? {
      schemaVersion: PRESENTATION_OUTPUT_BASE_MEDIA_BUILD_JOB_SCHEMA_V001,
      path: jobPath,
      fileSha256: sha256(jobBytes),
      canonicalSha256: canonicalSha256PresentationOutputBaseMediaJsonV001(job),
    }
    : null;
  const expectedTimelineBinding = timelineFileSha256 === null ? null : {
    schemaVersion: PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION,
    path: `${job.outputRoot}/timeline.json`,
    fileSha256: timelineFileSha256,
    canonicalSha256: canonicalSha256PresentationOutputBaseMediaJsonV001(timeline),
  };
  const expectedManifestBinding = manifestFileSha256 === null ? null : {
    schemaVersion: PRESENTATION_OUTPUT_BASE_MEDIA_GENERATION_MANIFEST_SCHEMA_V001,
    path: `${job.outputRoot}/generation-manifest.json`,
    fileSha256: manifestFileSha256,
    canonicalSha256: canonicalSha256PresentationOutputBaseMediaJsonV001(manifest),
  };
  const expectedMediaBuildProjection = isObject(outputInspection)
    && isObject(outputInspection.audio) && outputInspection.audio.present === true
    ? {
      frameCount: outputInspection.frameCount,
      sampleCount: outputInspection.audio.presentationDurationSamples,
      audioPacketPayloadSha256: outputInspection.audio.packetPayloadSha256,
    }
    : null;
  const expectedSemanticProjection = {
    sourceMediaCount: packageValue.sourceMedia.length,
    segmentCount: packageValue.timelineComposition.segments.length,
    sourceMediaBindingsCanonicalSha256:
      canonicalSha256PresentationOutputBaseMediaJsonV001(
        packageValue.sourceMedia.map(source => source.mediaBinding),
      ),
    timelineCompositionCanonicalSha256:
      canonicalSha256PresentationOutputBaseMediaJsonV001(packageValue.timelineComposition),
  };
  if (!Buffer.isBuffer(jobBytes)
    || !Buffer.isBuffer(packageBytes)
    || !Buffer.isBuffer(baseMediaBytes)
    || !Buffer.isBuffer(timelineBytes)
    || !Buffer.isBuffer(manifestBytes)
    || !Buffer.isBuffer(receiptBytes)
    || expectedJobBinding === null
    || expectedTimelineBinding === null
    || expectedManifestBinding === null
    || expectedMediaBuildProjection === null
    || sha256(packageBytes) !== job.meaningPackageBinding.fileSha256
    || canonicalSha256PresentationOutputBaseMediaJsonV001(packageValue)
      !== job.meaningPackageBinding.canonicalSha256
    || packageValue.schemaVersion !== job.meaningPackageBinding.schemaVersion
    || !packageBytes.equals(serializePresentationOutputBaseMediaFormalJsonV001(packageValue))
    || !validatePresentationOutputBaseMediaTimelineV001(
      timeline,
      {job, packageValue, sourceIdentity, sourceInspection},
    )
    || !validateManifest(manifest)
    || !validateReceipt(receipt)
    || !timelineBytes.equals(serializePresentationOutputBaseMediaFormalJsonV001(timeline))
    || !manifestBytes.equals(serializePresentationOutputBaseMediaFormalJsonV001(manifest))
    || !receiptBytes.equals(serializePresentationOutputBaseMediaFormalJsonV001(receipt))
    || timeline.baseMedia.fileSha256 !== baseMediaFileSha256
    || manifest.manifestId !== `${job.jobId}-generation-manifest`
    || receipt.receiptId !== `${job.jobId}-validation-receipt`
    || !same(manifest.jobBinding, expectedJobBinding)
    || !same(receipt.jobBinding, expectedJobBinding)
    || !same(manifest.meaningPackageBinding, job.meaningPackageBinding)
    || !same(manifest.sourceMediaBindings,
      packageValue.sourceMedia.map(source => source.mediaBinding))
    || !same(manifest.baseMedia, {
      path: `${job.outputRoot}/base-media.mp4`,
      fileSha256: baseMediaFileSha256,
    })
    || !same(manifest.timeline, expectedTimelineBinding)
    || !same(manifest.semanticProjection, expectedSemanticProjection)
    || manifest.semanticProjection.timelineCompositionCanonicalSha256
      !== job.expectedTimelineCompositionCanonicalSha256
    || !same(manifest.mediaBuildProjection, expectedMediaBuildProjection)
    || timeline.baseMedia.expectedFrameCount !== outputInspection.frameCount
    || !same(receipt.manifestBinding, expectedManifestBinding)
    || !same(receipt.mediaProjection, {
      ...expectedMediaBuildProjection,
      baseMediaFileSha256,
      timelineFileSha256,
    })
  ) {
    return {status: 'rejected', violations: [
      makePresentationOutputBaseMediaViolationV001(
        'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH',
      ),
    ]};
  }
  return {status: 'passed', violations: []};
}

const validateObservation = (value, index) => exactKeys(value, ['name', 'status', 'value'])
  && value.name === PRESENTATION_OUTPUT_BASE_MEDIA_OBSERVATION_NAMES_V001[index]
  && ['observed', 'unavailable'].includes(value.status)
  && (value.status === 'unavailable'
    ? value.value === null
    : ([0, 1, 6].includes(index)
      ? SHA256.test(value.value ?? '')
      : nonnegative(value.value)));

export function validatePresentationOutputBaseMediaFailureReportV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'failureId', 'status', 'stage', 'jobFileObservation',
    'meaningPackageBinding', 'violations', 'observations', 'retainedPaths', 'environment',
  ])
    || value.schemaVersion !== PRESENTATION_OUTPUT_BASE_MEDIA_FAILURE_REPORT_SCHEMA_V001
    || !FORMAL_ID.test(value.failureId ?? '')
    || !['rejected', 'fatal'].includes(value.status)
    || !PRESENTATION_OUTPUT_BASE_MEDIA_STAGES_V001.includes(value.stage)
    || !exactKeys(value.jobFileObservation, ['path', 'fileSha256', 'canonicalSha256'])
    || !WORKSPACE_PATH.test(value.jobFileObservation.path ?? '')
    || !SHA256.test(value.jobFileObservation.fileSha256 ?? '')
    || !(value.jobFileObservation.canonicalSha256 === null
      || SHA256.test(value.jobFileObservation.canonicalSha256 ?? ''))
    || !(value.meaningPackageBinding === null
      || (validatePresentationMeaningJsonBindingV001(value.meaningPackageBinding)
        && value.meaningPackageBinding.schemaVersion === 'zev-meaning-information-package-v001'))
    || !dense(value.violations) || value.violations.length > 1
    || !value.violations.every(item => exactKeys(item, ['code', 'path', 'relatedIds'])
      && PRESENTATION_OUTPUT_BASE_MEDIA_VIOLATION_CODES_V001.includes(item.code)
      && item.path === CODE_PATH[item.code]
      && dense(item.relatedIds) && item.relatedIds.length === 0)
    || !dense(value.observations)
    || value.observations.length !== PRESENTATION_OUTPUT_BASE_MEDIA_OBSERVATION_NAMES_V001.length
    || !value.observations.every(validateObservation)
    || !dense(value.retainedPaths) || value.retainedPaths.length !== 0
    || !exactKeys(value.environment, [
      'nodePath', 'nodeFileSha256', 'ffmpegPath', 'ffmpegFileSha256',
      'ffprobePath', 'ffprobeFileSha256', 'executedAt',
    ])
    || !UTC.test(value.environment.executedAt ?? '')) return false;
  for (const name of ['node', 'ffmpeg', 'ffprobe']) {
    const pathValue = value.environment[`${name}Path`];
    const hashValue = value.environment[`${name}FileSha256`];
    if (!((pathValue === null && hashValue === null)
      || (typeof pathValue === 'string' && pathValue.startsWith('/')
        && SHA256.test(hashValue ?? '')))) return false;
  }
  if (value.failureId
    !== `output-base-media-failure-${value.jobFileObservation.fileSha256.slice(0, 32)}`) {
    return false;
  }
  if (value.violations.length === 0) return value.status === 'fatal';
  const [violation] = value.violations;
  return CODE_STAGE[violation.code] === value.stage
    && value.status === (REJECTED_CODES.has(violation.code) ? 'rejected' : 'fatal');
}

export const createPresentationOutputBaseMediaObservationsV001 = initial =>
  PRESENTATION_OUTPUT_BASE_MEDIA_OBSERVATION_NAMES_V001.map(name => ({
    name,
    status: Object.hasOwn(initial ?? {}, name) ? 'observed' : 'unavailable',
    value: Object.hasOwn(initial ?? {}, name) ? initial[name] : null,
  }));

export function buildPresentationOutputBaseMediaFailureReportV001({
  jobPath,
  jobBytes,
  jobValue,
  meaningPackageBinding,
  code = null,
  stage,
  observations,
  environment,
}) {
  const jobFileSha256 = sha256(jobBytes);
  let canonicalSha256 = null;
  if (jobValue !== null) {
    try { canonicalSha256 = canonicalSha256PresentationOutputBaseMediaJsonV001(jobValue); } catch {}
  }
  const report = {
    schemaVersion: PRESENTATION_OUTPUT_BASE_MEDIA_FAILURE_REPORT_SCHEMA_V001,
    failureId: `output-base-media-failure-${jobFileSha256.slice(0, 32)}`,
    status: code === null ? 'fatal' : (REJECTED_CODES.has(code) ? 'rejected' : 'fatal'),
    stage,
    jobFileObservation: {
      path: jobPath,
      fileSha256: jobFileSha256,
      canonicalSha256,
    },
    meaningPackageBinding,
    violations: code === null ? [] : [makePresentationOutputBaseMediaViolationV001(code)],
    observations,
    retainedPaths: [],
    environment,
  };
  if (!validatePresentationOutputBaseMediaFailureReportV001(report)) {
    throw new TypeError('output base-media failure report invalid');
  }
  return report;
}

export const presentationOutputBaseMediaStageForCodeV001 = code => CODE_STAGE[code] ?? null;
export const presentationOutputBaseMediaStatusForCodeV001 = code =>
  REJECTED_CODES.has(code) ? 'rejected' : 'fatal';
