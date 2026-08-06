import {createHash} from 'node:crypto';
import path from 'node:path';

import {
  canonicalJson as canonicalPresentationOutputFiniteJsonV001,
  serializePresentationCaptionReport,
} from './presentation_caption_contract_v002.mjs';
import {
  validatePresentationMeaningImplementationBindingV001,
  validatePresentationMeaningJsonBindingV001,
  validatePresentationMeaningMediaBindingV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  validatePresentationBaseMediaTimelineV002,
} from './presentation_base_media_timeline_v002.mjs';
import {
  validatePresentationOutputBaseMediaGenerationManifestV001,
  validatePresentationOutputBaseMediaValidationReceiptV001,
} from './presentation_output_base_media_v001.mjs';
import {
  validatePresentationVerticalCropDecisionV001,
} from './render_presentation_vertical_review_v001.ts';

export const PRESENTATION_OUTPUT_CROP_APPLICATION_SCHEMA_V001 =
  'presentation-output-crop-application-v001';
export const PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_SCHEMA_V001 =
  'presentation-output-crop-application-job-v001';
export const PRESENTATION_OUTPUT_CROP_APPLICATION_FAILURE_REPORT_SCHEMA_V001 =
  'presentation-output-crop-application-failure-report-v001';

export const PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-output-crop-application-jobs';
export const PRESENTATION_OUTPUT_CROP_APPLICATION_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-output-crop-applications';
export const PRESENTATION_OUTPUT_CROP_APPLICATION_FAILURE_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/meaning-output-crop-application-failures';

export const PRESENTATION_OUTPUT_CROP_APPLICATION_VIOLATION_CODES_V001 = Object.freeze([
  'CROP_APPLICATION_JOB_INVALID',
  'CROP_APPLICATION_RUN_INPUT_MISMATCH',
  'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH',
  'CROP_APPLICATION_TARGET_BINDING_MISMATCH',
  'CROP_APPLICATION_SOURCE_IDENTITY_MISMATCH',
  'CROP_APPLICATION_TIMELINE_MISMATCH',
  'CROP_APPLICATION_MEDIA_GEOMETRY_MISMATCH',
  'CROP_APPLICATION_SELECTION_PROJECTION_MISMATCH',
  'CROP_APPLICATION_PUBLICATION_TARGET_INVALID',
  'CROP_APPLICATION_PUBLICATION_FAILED',
]);

export const PRESENTATION_OUTPUT_CROP_APPLICATION_CHECKS_V001 = Object.freeze([
  'runInputBinding',
  'reviewedCropBinding',
  'reviewedBaseMediaHashGraph',
  'targetBaseMediaHashGraph',
  'sourceIdentity',
  'sourceTimeline',
  'mediaGeometry',
  'selectionProjection',
  'outputContractReadiness',
  'publicationHashGraph',
]);

export const PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001 =
  Object.freeze([
    Object.freeze({
      path: 'evals/clip_composition/presentation_output_crop_application_v001.mjs',
      role: 'crop-application-core-v001',
    }),
    Object.freeze({
      path: 'evals/clip_composition/run_presentation_output_crop_application_job_v001.mjs',
      role: 'crop-application-runner-v001',
    }),
  ]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const SCREEN_LAYOUT_IDS = Object.freeze(['speaker_only', 'screen_speaker', 'speaker_pair']);
const JOB_ACTION = 'apply-reviewed-crop';

const CODE_PATH = Object.freeze({
  CROP_APPLICATION_JOB_INVALID: '',
  CROP_APPLICATION_RUN_INPUT_MISMATCH: '/runInputRecordBinding',
  CROP_APPLICATION_REVIEWED_BINDING_MISMATCH: '/reviewedCrop',
  CROP_APPLICATION_TARGET_BINDING_MISMATCH: '/targetBaseMedia',
  CROP_APPLICATION_SOURCE_IDENTITY_MISMATCH: '/sourceEquivalence/sourceMedia',
  CROP_APPLICATION_TIMELINE_MISMATCH: '/sourceEquivalence/segments',
  CROP_APPLICATION_MEDIA_GEOMETRY_MISMATCH: '/sourceEquivalence/outputGeometry',
  CROP_APPLICATION_SELECTION_PROJECTION_MISMATCH: '/selectionProjection',
  CROP_APPLICATION_PUBLICATION_TARGET_INVALID: '/outputPath',
  CROP_APPLICATION_PUBLICATION_FAILED: '/outputPath',
});

const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

let cropBuildDependenciesPromise;
const loadPresentationOutputCropBuildDependenciesV001 = () => {
  cropBuildDependenciesPromise ??= Promise.all([
    import('./presentation_base_media_build_v001.mjs'),
    import('./presentation_meaning_output_run_input_record_v001.mjs'),
  ]).then(([baseMedia, runInput]) => {
    const dependencies = {
      validatePresentationBaseMediaGenerationManifestV002:
        baseMedia.validatePresentationBaseMediaGenerationManifestV002,
      validatePresentationBaseMediaHashGraphV001:
        baseMedia.validatePresentationBaseMediaHashGraphV001,
      validatePresentationBaseMediaValidationReportV001:
        baseMedia.validatePresentationBaseMediaValidationReportV001,
      validatePresentationMeaningOutputRunInputRecordV001:
        runInput.validatePresentationMeaningOutputRunInputRecordV001,
    };
    if (Object.values(dependencies).some(value => typeof value !== 'function')) {
      throw new TypeError('crop application build dependency is unavailable');
    }
    return Object.freeze(dependencies);
  });
  return cropBuildDependenciesPromise;
};

const hasLoneSurrogate = value => {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
};

const finiteJson = value => {
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return !hasLoneSurrogate(value);
  if (typeof value === 'number') {
    return Number.isFinite(value) && !Object.is(value, -0)
      && (!Number.isInteger(value) || Number.isSafeInteger(value));
  }
  if (dense(value)) return value.every(finiteJson);
  return isObject(value)
    && Object.keys(value).every(key => !hasLoneSurrogate(key))
    && Object.values(value).every(finiteJson);
};

export function decodePresentationOutputFiniteJsonV001(bytes) {
  if (!Buffer.isBuffer(bytes)
    || (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) {
    return Object.freeze({status: 'invalid', reason: 'invalid-bytes'});
  }
  try {
    const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) {
      return Object.freeze({status: 'invalid', reason: 'bom'});
    }
    const value = JSON.parse(text);
    if (!finiteJson(value)) {
      return Object.freeze({status: 'invalid', reason: 'non-finite-json'});
    }
    const formal = serializePresentationOutputCropApplicationFormalJsonV001(value);
    return formal.equals(bytes)
      ? Object.freeze({status: 'decoded', value})
      : Object.freeze({status: 'invalid', reason: 'non-formal-bytes'});
  } catch {
    return Object.freeze({status: 'invalid', reason: 'json-invalid'});
  }
}

export function serializePresentationOutputCropApplicationFormalJsonV001(value) {
  if (!finiteJson(value)) throw new TypeError('crop application formal JSON is invalid');
  return Buffer.from(serializePresentationCaptionReport(value), 'utf8');
}

export function canonicalSha256PresentationOutputFiniteJsonV001(value) {
  if (!finiteJson(value)) throw new TypeError('crop application canonical JSON is invalid');
  return sha256(Buffer.from(canonicalPresentationOutputFiniteJsonV001(value), 'utf8'));
}

export const canonicalSha256PresentationOutputCropApplicationJsonV001 =
  canonicalSha256PresentationOutputFiniteJsonV001;
export const sha256PresentationOutputCropApplicationBytesV001 = sha256;

export const makePresentationOutputCropApplicationViolationV001 = (
  code,
  pathValue = CODE_PATH[code],
) => {
  if (!PRESENTATION_OUTPUT_CROP_APPLICATION_VIOLATION_CODES_V001.includes(code)
    || typeof pathValue !== 'string') {
    throw new TypeError('unknown crop application violation');
  }
  return Object.freeze({code, path: pathValue, relatedIds: Object.freeze([])});
};

const report = (code, pathValue = CODE_PATH[code]) => Object.freeze({
  status: 'rejected',
  violations: Object.freeze([
    makePresentationOutputCropApplicationViolationV001(code, pathValue),
  ]),
});

const validJsonBinding = (value, schemaVersion) =>
  validatePresentationMeaningJsonBindingV001(value)
  && value.schemaVersion === schemaVersion;

const validMediaBinding = value => validatePresentationMeaningMediaBindingV001(value);

const validReviewedBaseMediaBindings = value => exactKeys(value, [
  'baseMedia', 'timeline', 'generationManifest', 'validationReport',
])
  && validMediaBinding(value.baseMedia)
  && validJsonBinding(value.timeline, 'presentation-base-media-timeline-v002')
  && validJsonBinding(
    value.generationManifest,
    'presentation-base-media-generation-manifest-v002',
  )
  && validJsonBinding(
    value.validationReport,
    'presentation-base-media-validation-report-v001',
  );

const validReviewedCropBindings = value => exactKeys(value, [
  'decision', 'selectionPackageManifest', 'reviewedBaseMedia',
])
  && validJsonBinding(value.decision, 'vertical-preset-type-crop-decision-v006')
  && validJsonBinding(
    value.selectionPackageManifest,
    'vertical-preset-type-crop-selection-package-v006',
  )
  && validReviewedBaseMediaBindings(value.reviewedBaseMedia);

const validTargetBaseMediaBindings = value => exactKeys(value, [
  'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
])
  && validMediaBinding(value.baseMedia)
  && validJsonBinding(value.timeline, 'presentation-base-media-timeline-v002')
  && validJsonBinding(
    value.generationManifest,
    'presentation-output-base-media-generation-manifest-v001',
  )
  && validJsonBinding(
    value.validationReceipt,
    'presentation-output-base-media-validation-receipt-v001',
  );

const validRuntimeTool = value => exactKeys(value, ['path', 'version', 'fileSha256'])
  && typeof value.path === 'string' && path.isAbsolute(value.path)
  && typeof value.version === 'string' && value.version.length > 0
  && SHA256.test(value.fileSha256 ?? '');

const validRuntimeProfile = value => exactKeys(value, ['ffmpeg', 'ffprobe'])
  && validRuntimeTool(value.ffmpeg) && validRuntimeTool(value.ffprobe);

const validImplementationBindings = value => dense(value)
  && value.length === PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001.length
  && value.every((binding, index) =>
    validatePresentationMeaningImplementationBindingV001(binding)
    && binding.path
      === PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001[index].path
    && binding.role
      === PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001[index].role);

export function validatePresentationOutputCropApplicationJobV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'jobId', 'applicationId', 'action', 'runInputRecordBinding',
    'reviewedCrop', 'targetBaseMedia', 'runtimeProfile', 'outputPath',
    'implementationBindings', 'executionPolicy',
  ])
    || value.schemaVersion !== PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_SCHEMA_V001
    || !FORMAL_ID.test(value.jobId ?? '')
    || value.applicationId !== `${value.jobId}-application`
    || !FORMAL_ID.test(value.applicationId ?? '')
    || value.action !== JOB_ACTION
    || !validJsonBinding(
      value.runInputRecordBinding,
      'presentation-meaning-output-run-input-record-v001',
    )
    || !validReviewedCropBindings(value.reviewedCrop)
    || !validTargetBaseMediaBindings(value.targetBaseMedia)
    || !validRuntimeProfile(value.runtimeProfile)
    || value.outputPath !== `${PRESENTATION_OUTPUT_CROP_APPLICATION_ROOT_V001}`
      + `/${value.applicationId}/crop-application.json`
    || !WORKSPACE_PATH.test(value.outputPath ?? '')
    || !validImplementationBindings(value.implementationBindings)
    || !exactKeys(value.executionPolicy, [
      'oneShot', 'allowOverwrite', 'allowCropRecalculation',
    ])
    || value.executionPolicy.oneShot !== true
    || value.executionPolicy.allowOverwrite !== false
    || value.executionPolicy.allowCropRecalculation !== false) {
    return report('CROP_APPLICATION_JOB_INVALID');
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

const validViewport = value => dense(value) && value.length === 4
  && value.every(item => typeof item === 'number' && Number.isFinite(item))
  && value[0] >= 0 && value[0] < value[2] && value[2] <= 1
  && value[1] >= 0 && value[1] < value[3] && value[3] <= 1;

const validViewports = value => {
  if (!isObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every(key => FORMAL_ID.test(key) && validViewport(value[key]));
};

const selectionProjectionPrefix = projection => ({
  screenLayoutId: projection.screenLayoutId,
  selectedCandidateId: projection.selectedCandidateId,
  viewports: clone(projection.viewports),
});

export function derivePresentationOutputCropSelectionProjectionV001(cropDecision) {
  if (validatePresentationVerticalCropDecisionV001(cropDecision).status !== 'passed') {
    throw new TypeError('reviewed crop decision is invalid');
  }
  const prefix = {
    screenLayoutId: cropDecision.selectedPlan.screenLayoutId,
    selectedCandidateId: cropDecision.selectedPlan.selectedCandidateId,
    viewports: clone(cropDecision.selectedPlan.viewports),
  };
  return Object.freeze({
    ...prefix,
    canonicalSha256: canonicalSha256PresentationOutputFiniteJsonV001(prefix),
  });
}

const validSelectionProjection = value => exactKeys(value, [
  'screenLayoutId', 'selectedCandidateId', 'viewports', 'canonicalSha256',
])
  && SCREEN_LAYOUT_IDS.includes(value.screenLayoutId)
  && FORMAL_ID.test(value.selectedCandidateId ?? '')
  && validViewports(value.viewports)
  && SHA256.test(value.canonicalSha256 ?? '')
  && value.canonicalSha256
    === canonicalSha256PresentationOutputFiniteJsonV001(selectionProjectionPrefix(value));

const validTimelineSegment = value => exactKeys(value, [
  'segmentId', 'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30',
  'sourceEndFrame30', 'outputStartFrame', 'outputEndFrame',
])
  && FORMAL_ID.test(value.segmentId ?? '')
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs
  && nonnegative(value.sourceStartFrame30)
  && positive(value.sourceEndFrame30)
  && value.sourceStartFrame30 < value.sourceEndFrame30
  && nonnegative(value.outputStartFrame)
  && positive(value.outputEndFrame)
  && value.outputStartFrame < value.outputEndFrame;

const validTimeline = value => exactKeys(value, [
  'schemaVersion', 'timelineId', 'sourceProvenance', 'sourceRef',
  'sourceFrameClock', 'baseMedia', 'segments',
])
  && value.schemaVersion === 'presentation-base-media-timeline-v002'
  && FORMAL_ID.test(value.timelineId ?? '')
  && typeof value.sourceProvenance === 'string' && value.sourceProvenance.length > 0
  && typeof value.sourceRef === 'string' && value.sourceRef.length > 0
  && exactKeys(value.sourceFrameClock, [
    'inputFrameRate', 'logicalFrameRate', 'extractionRuleId', 'decodedFrameCount',
  ])
  && typeof value.sourceFrameClock.inputFrameRate === 'string'
  && value.sourceFrameClock.logicalFrameRate === '30/1'
  && typeof value.sourceFrameClock.extractionRuleId === 'string'
  && positive(value.sourceFrameClock.decodedFrameCount)
  && exactKeys(value.baseMedia, [
    'artifactId', 'path', 'fileSha256', 'frameRate', 'expectedFrameCount',
  ])
  && FORMAL_ID.test(value.baseMedia.artifactId ?? '')
  && value.baseMedia.path === 'base-media.mp4'
  && SHA256.test(value.baseMedia.fileSha256 ?? '')
  && value.baseMedia.frameRate === '30/1'
  && positive(value.baseMedia.expectedFrameCount)
  && dense(value.segments) && value.segments.length > 0
  && value.segments.every(validTimelineSegment);

const segmentProjection = segment => ({
  sourceStartMs: segment.sourceStartMs,
  sourceEndMs: segment.sourceEndMs,
  sourceStartFrame30: segment.sourceStartFrame30,
  sourceEndFrame30: segment.sourceEndFrame30,
  outputStartFrame: segment.outputStartFrame,
  outputEndFrame: segment.outputEndFrame,
});

const validSegmentProjection = value => exactKeys(value, [
  'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30',
  'outputStartFrame', 'outputEndFrame',
])
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs
  && nonnegative(value.sourceStartFrame30)
  && positive(value.sourceEndFrame30)
  && value.sourceStartFrame30 < value.sourceEndFrame30
  && nonnegative(value.outputStartFrame)
  && positive(value.outputEndFrame)
  && value.outputStartFrame < value.outputEndFrame;

const validMediaInspection = value => exactKeys(value, [
  'width', 'height', 'frameRate', 'frameCount',
])
  && positive(value.width) && positive(value.height)
  && typeof value.frameRate === 'string' && value.frameRate.length > 0
  && positive(value.frameCount);

const validSourceEquivalence = value => exactKeys(value, [
  'guarantee', 'sourceRef', 'sourceMedia', 'sourceFrameClock', 'segments',
  'outputGeometry', 'baseMediaByteRelation',
])
  && value.guarantee === 'same-source-and-timeline-only'
  && typeof value.sourceRef === 'string' && value.sourceRef.length > 0
  && validMediaBinding(value.sourceMedia)
  && exactKeys(value.sourceFrameClock, [
    'inputFrameRate', 'logicalFrameRate', 'extractionRuleId', 'decodedFrameCount',
  ])
  && typeof value.sourceFrameClock.inputFrameRate === 'string'
  && value.sourceFrameClock.logicalFrameRate === '30/1'
  && typeof value.sourceFrameClock.extractionRuleId === 'string'
  && positive(value.sourceFrameClock.decodedFrameCount)
  && dense(value.segments) && value.segments.length > 0
  && value.segments.every(validSegmentProjection)
  && validMediaInspection(value.outputGeometry)
  && ['same', 'different'].includes(value.baseMediaByteRelation);

const validChecks = value => exactKeys(value, PRESENTATION_OUTPUT_CROP_APPLICATION_CHECKS_V001)
  && Object.values(value).every(status => status === 'passed');

const validApplicationShape = value => exactKeys(value, [
  'schemaVersion', 'applicationId', 'status', 'jobBinding',
  'runInputRecordBinding', 'reviewedCrop', 'targetBaseMedia',
  'sourceEquivalence', 'selectionProjection', 'checks',
])
  && value.schemaVersion === PRESENTATION_OUTPUT_CROP_APPLICATION_SCHEMA_V001
  && FORMAL_ID.test(value.applicationId ?? '')
  && value.status === 'passed'
  && validJsonBinding(
    value.jobBinding,
    PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_SCHEMA_V001,
  )
  && validJsonBinding(
    value.runInputRecordBinding,
    'presentation-meaning-output-run-input-record-v001',
  )
  && validReviewedCropBindings(value.reviewedCrop)
  && validTargetBaseMediaBindings(value.targetBaseMedia)
  && validSourceEquivalence(value.sourceEquivalence)
  && validSelectionProjection(value.selectionProjection)
  && validChecks(value.checks);

export function inspectPresentationOutputCropApplicationEnvelopeV001(application) {
  if (!validApplicationShape(application)) {
    return report('CROP_APPLICATION_REVIEWED_BINDING_MISMATCH', '');
  }
  return Object.freeze({
    status: 'passed',
    decisionBinding: clone(application.reviewedCrop.decision),
    selectionPackageManifestBinding:
      clone(application.reviewedCrop.selectionPackageManifest),
  });
}

const decisionManifestPath = (decisionBinding, relativePath) => {
  if (typeof relativePath !== 'string' || path.posix.isAbsolute(relativePath)) return null;
  const result = path.posix.normalize(path.posix.join(
    path.posix.dirname(decisionBinding.path),
    relativePath,
  ));
  return WORKSPACE_PATH.test(result) ? result : null;
};

const validSelectionManifestForDecision = (
  selectionPackageManifest,
  decision,
  reviewedCrop,
) => exactKeys(selectionPackageManifest, [
  'schemaVersion', 'mode', 'externalApiCallsByThisScript', 'retryCount',
  'classification', 'sourceMedia', 'requestPackage', 'selectionContract',
  'prepareManifest',
])
  && selectionPackageManifest.schemaVersion
    === 'vertical-preset-type-crop-selection-package-v006'
  && exactKeys(selectionPackageManifest.sourceMedia, [
    'path', 'fileSha256', 'previewSecond',
  ])
  && selectionPackageManifest.sourceMedia.path
    === reviewedCrop.reviewedBaseMedia.baseMedia.path
  && selectionPackageManifest.sourceMedia.fileSha256
    === reviewedCrop.reviewedBaseMedia.baseMedia.fileSha256
  && typeof selectionPackageManifest.sourceMedia.previewSecond === 'number'
  && Number.isFinite(selectionPackageManifest.sourceMedia.previewSecond)
  && exactKeys(decision.provenance, [
    'classificationWebObservation', 'selectionWebObservation',
    'selectionPackageManifest', 'canonicalSelector',
  ])
  && exactKeys(decision.provenance.selectionPackageManifest, ['path', 'fileSha256'])
  && decision.provenance.selectionPackageManifest.fileSha256
    === reviewedCrop.selectionPackageManifest.fileSha256
  && decisionManifestPath(
    reviewedCrop.decision,
    decision.provenance.selectionPackageManifest.path,
  ) === reviewedCrop.selectionPackageManifest.path;

export function validatePresentationOutputCropApplicationV001({
  application,
  cropDecision,
  selectionPackageManifest,
  targetBaseMedia,
  screenLayoutId,
}) {
  if (!validApplicationShape(application)) {
    return report('CROP_APPLICATION_REVIEWED_BINDING_MISMATCH', '');
  }
  if (validatePresentationVerticalCropDecisionV001(cropDecision).status !== 'passed'
    || !validSelectionManifestForDecision(
      selectionPackageManifest,
      cropDecision,
      application.reviewedCrop,
    )) {
    return report('CROP_APPLICATION_REVIEWED_BINDING_MISMATCH');
  }
  if (!validTargetBaseMediaBindings(targetBaseMedia)
    || !same(application.targetBaseMedia, targetBaseMedia)) {
    return report('CROP_APPLICATION_TARGET_BINDING_MISMATCH');
  }
  let expectedProjection;
  try {
    expectedProjection = derivePresentationOutputCropSelectionProjectionV001(cropDecision);
  } catch {
    return report('CROP_APPLICATION_SELECTION_PROJECTION_MISMATCH');
  }
  if (!same(application.selectionProjection, expectedProjection)
    || cropDecision.selectedPlan.screenLayoutId !== screenLayoutId) {
    return report('CROP_APPLICATION_SELECTION_PROJECTION_MISMATCH');
  }
  return Object.freeze({
    status: 'passed',
    cropDecision,
    selectionProjection: clone(application.selectionProjection),
    applicationBindingProjection: Object.freeze({
      schemaVersion: application.schemaVersion,
      applicationId: application.applicationId,
      targetBaseMedia: clone(application.targetBaseMedia),
      runInputRecordBinding: clone(application.runInputRecordBinding),
    }),
  });
}

const reviewedBundleValid = ({job, timeline, generationManifest, validationReport,
  mediaInspection, validateGenerationManifest, validateHashGraph,
  validateValidationReport}) => {
  if (!validTimeline(timeline)
    || validateGenerationManifest(generationManifest).status
      !== 'passed'
    || validateValidationReport(validationReport).status
      !== 'passed'
    || !validMediaInspection(mediaInspection)) return false;
  const timelineValidation = validatePresentationBaseMediaTimelineV002(
    timeline,
    generationManifest,
    {
      fileSha256: job.reviewedCrop.reviewedBaseMedia.baseMedia.fileSha256,
      frameCount: mediaInspection.frameCount,
      timelineFileSha256: job.reviewedCrop.reviewedBaseMedia.timeline.fileSha256,
    },
  );
  const graphValidation = validateHashGraph({
    timeline,
    manifest: generationManifest,
    report: validationReport,
    baseMediaFileSha256: job.reviewedCrop.reviewedBaseMedia.baseMedia.fileSha256,
    timelineFileSha256: job.reviewedCrop.reviewedBaseMedia.timeline.fileSha256,
    manifestFileSha256: job.reviewedCrop.reviewedBaseMedia.generationManifest.fileSha256,
  });
  return timelineValidation.status === 'passed' && graphValidation.status === 'passed';
};

const targetBundleValid = ({job, timeline, generationManifest, validationReceipt,
  mediaInspection}) => validTimeline(timeline)
  && validatePresentationOutputBaseMediaGenerationManifestV001(generationManifest)
  && validatePresentationOutputBaseMediaValidationReceiptV001(validationReceipt)
  && validMediaInspection(mediaInspection)
  && timeline.baseMedia.fileSha256 === job.targetBaseMedia.baseMedia.fileSha256
  && same(generationManifest.baseMedia, job.targetBaseMedia.baseMedia)
  && same(generationManifest.timeline, job.targetBaseMedia.timeline)
  && same(validationReceipt.jobBinding, generationManifest.jobBinding)
  && same(validationReceipt.manifestBinding, job.targetBaseMedia.generationManifest)
  && validationReceipt.mediaProjection.baseMediaFileSha256
    === job.targetBaseMedia.baseMedia.fileSha256
  && validationReceipt.mediaProjection.timelineFileSha256
    === job.targetBaseMedia.timeline.fileSha256
  && generationManifest.mediaBuildProjection.frameCount === mediaInspection.frameCount
  && timeline.baseMedia.expectedFrameCount === mediaInspection.frameCount
  && validationReceipt.mediaProjection.frameCount === mediaInspection.frameCount
  && validationReceipt.mediaProjection.sampleCount
    === generationManifest.mediaBuildProjection.sampleCount
  && validationReceipt.mediaProjection.audioPacketPayloadSha256
    === generationManifest.mediaBuildProjection.audioPacketPayloadSha256;

export async function buildPresentationOutputCropApplicationV001({
  job,
  jobPath,
  jobBytes,
  runInputRecord,
  cropDecision,
  selectionPackageManifest,
  reviewedTimeline,
  reviewedGenerationManifest,
  reviewedValidationReport,
  targetTimeline,
  targetGenerationManifest,
  targetValidationReceipt,
  reviewedMediaInspection,
  targetMediaInspection,
}) {
  const {
    validatePresentationBaseMediaGenerationManifestV002,
    validatePresentationBaseMediaHashGraphV001,
    validatePresentationBaseMediaValidationReportV001,
    validatePresentationMeaningOutputRunInputRecordV001,
  } = await loadPresentationOutputCropBuildDependenciesV001();
  if (validatePresentationOutputCropApplicationJobV001(job).status !== 'passed'
    || typeof jobPath !== 'string' || !WORKSPACE_PATH.test(jobPath)
    || !Buffer.isBuffer(jobBytes)
    || !validatePresentationMeaningOutputRunInputRecordV001(runInputRecord)) {
    throw new TypeError('crop application build input is invalid');
  }
  let projection;
  try {
    projection = derivePresentationOutputCropSelectionProjectionV001(cropDecision);
  } catch {
    throw Object.assign(new TypeError('reviewed crop decision is invalid'), {
      violationCode: 'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH',
    });
  }
  if (!same(runInputRecord.verticalStyle.cropDecision, job.reviewedCrop.decision)
    || !same(
      runInputRecord.verticalStyle.selectionPackageManifest,
      job.reviewedCrop.selectionPackageManifest,
    )
    || runInputRecord.verticalStyle.screenLayoutId !== projection.screenLayoutId) {
    throw Object.assign(new TypeError('run input differs from reviewed crop'), {
      violationCode: 'CROP_APPLICATION_RUN_INPUT_MISMATCH',
    });
  }
  if (!validSelectionManifestForDecision(
    selectionPackageManifest,
    cropDecision,
    job.reviewedCrop,
  )) {
    throw Object.assign(new TypeError('reviewed crop binding mismatch'), {
      violationCode: 'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH',
    });
  }
  if (!reviewedBundleValid({
    job,
    timeline: reviewedTimeline,
    generationManifest: reviewedGenerationManifest,
    validationReport: reviewedValidationReport,
    mediaInspection: reviewedMediaInspection,
    validateGenerationManifest: validatePresentationBaseMediaGenerationManifestV002,
    validateHashGraph: validatePresentationBaseMediaHashGraphV001,
    validateValidationReport: validatePresentationBaseMediaValidationReportV001,
  })) {
    throw Object.assign(new TypeError('reviewed base-media bundle mismatch'), {
      violationCode: 'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH',
    });
  }
  if (!targetBundleValid({
    job,
    timeline: targetTimeline,
    generationManifest: targetGenerationManifest,
    validationReceipt: targetValidationReceipt,
    mediaInspection: targetMediaInspection,
  })) {
    throw Object.assign(new TypeError('target base-media bundle mismatch'), {
      violationCode: 'CROP_APPLICATION_TARGET_BINDING_MISMATCH',
    });
  }

  const reviewedSource = {
    path: reviewedGenerationManifest.source.path,
    fileSha256: reviewedGenerationManifest.source.fileSha256,
  };
  const targetSources = targetGenerationManifest.sourceMediaBindings;
  const recordSegment = runInputRecord.sourceAndInterval;
  if (!dense(targetSources) || targetSources.length !== 1
    || !same(reviewedSource, targetSources[0])
    || reviewedTimeline.sourceRef !== targetTimeline.sourceRef
    || reviewedGenerationManifest.source.sourceRef !== targetTimeline.sourceRef
    || targetTimeline.sourceRef !== recordSegment.sourceRef
    || reviewedGenerationManifest.assemblyDecision?.fileSha256
      !== recordSegment.assemblyDecision.fileSha256) {
    throw Object.assign(new TypeError('source identity mismatch'), {
      violationCode: 'CROP_APPLICATION_SOURCE_IDENTITY_MISMATCH',
    });
  }
  const reviewedSegments = reviewedTimeline.segments.map(segmentProjection);
  const targetSegments = targetTimeline.segments.map(segmentProjection);
  if (!same(reviewedTimeline.sourceFrameClock, targetTimeline.sourceFrameClock)
    || !same(reviewedSegments, targetSegments)
    || targetSegments.length !== 1
    || targetSegments[0].sourceStartMs !== recordSegment.sourceStartMs
    || targetSegments[0].sourceEndMs !== recordSegment.sourceEndMs) {
    throw Object.assign(new TypeError('source timeline mismatch'), {
      violationCode: 'CROP_APPLICATION_TIMELINE_MISMATCH',
    });
  }
  const reviewedGeometry = {...reviewedMediaInspection};
  const targetGeometry = {...targetMediaInspection};
  if (!validMediaInspection(reviewedGeometry)
    || !validMediaInspection(targetGeometry)
    || !same(reviewedGeometry, targetGeometry)
    || reviewedGeometry.frameRate !== reviewedTimeline.baseMedia.frameRate
    || targetGeometry.frameRate !== targetTimeline.baseMedia.frameRate
    || reviewedGeometry.frameCount !== reviewedTimeline.baseMedia.expectedFrameCount
    || targetGeometry.frameCount !== targetTimeline.baseMedia.expectedFrameCount) {
    throw Object.assign(new TypeError('base-media geometry mismatch'), {
      violationCode: 'CROP_APPLICATION_MEDIA_GEOMETRY_MISMATCH',
    });
  }

  const application = {
    schemaVersion: PRESENTATION_OUTPUT_CROP_APPLICATION_SCHEMA_V001,
    applicationId: job.applicationId,
    status: 'passed',
    jobBinding: {
      schemaVersion: PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_SCHEMA_V001,
      path: jobPath,
      fileSha256: sha256(jobBytes),
      canonicalSha256: canonicalSha256PresentationOutputFiniteJsonV001(job),
    },
    runInputRecordBinding: clone(job.runInputRecordBinding),
    reviewedCrop: clone(job.reviewedCrop),
    targetBaseMedia: clone(job.targetBaseMedia),
    sourceEquivalence: {
      guarantee: 'same-source-and-timeline-only',
      sourceRef: targetTimeline.sourceRef,
      sourceMedia: reviewedSource,
      sourceFrameClock: clone(targetTimeline.sourceFrameClock),
      segments: targetSegments,
      outputGeometry: targetGeometry,
      baseMediaByteRelation: job.reviewedCrop.reviewedBaseMedia.baseMedia.fileSha256
        === job.targetBaseMedia.baseMedia.fileSha256 ? 'same' : 'different',
    },
    selectionProjection: projection,
    checks: Object.fromEntries(
      PRESENTATION_OUTPUT_CROP_APPLICATION_CHECKS_V001.map(name => [name, 'passed']),
    ),
  };
  const validation = validatePresentationOutputCropApplicationV001({
    application,
    cropDecision,
    selectionPackageManifest,
    targetBaseMedia: job.targetBaseMedia,
    screenLayoutId: runInputRecord.verticalStyle.screenLayoutId,
  });
  if (validation.status !== 'passed') {
    throw Object.assign(new TypeError('crop application result is invalid'), {
      violationCode: validation.violations[0]?.code
        ?? 'CROP_APPLICATION_SELECTION_PROJECTION_MISMATCH',
    });
  }
  return application;
}
