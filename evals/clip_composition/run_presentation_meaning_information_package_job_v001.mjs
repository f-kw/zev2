import {createHash} from 'node:crypto';
import {
  lstat,
  open,
  realpath,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  decodePresentationCaptionB1StrictJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  validatePresentationRetainedSourceAtomsPublishedArtifactsV001,
} from './presentation_retained_source_atoms_v001.mjs';
import {
  PRESENTATION_MEANING_INFORMATION_FAILURE_REPORT_SCHEMA_V001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
  buildPresentationMeaningInformationPackageV001,
  canonicalSha256PresentationMeaningInformationJsonV001,
  derivePresentationMeaningCaptionProjectionV001,
  derivePresentationMeaningSelectionProjectionV001,
  makePresentationMeaningInformationViolationV001,
  serializePresentationMeaningInformationFormalJsonV001,
  sha256PresentationMeaningInformationBytesV001,
  validatePresentationMeaningBoundarySourcePackageForMeaningV001,
  validatePresentationMeaningBoundaryValidationReportV001,
  validatePresentationMeaningInformationPackageFormalBytesV001,
  validatePresentationMeaningInformationPackageJobV001,
  validatePresentationMeaningJsonBindingV001,
  validatePresentationMeaningSemanticArtifactLinkV001,
  validatePresentationMeaningSelectionWrapperV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  createPresentationMeaningOwnedStagingRootV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  readPresentationMeaningWorkspaceFileStableV001,
  validatePresentationSourceIdentityV001,
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';

const JOB_ROOT = 'evals/clip_composition/outputs/presentation/meaning-information-jobs';
const PACKAGE_ROOT = 'evals/clip_composition/outputs/presentation/meaning-information-packages';
const FAILURE_ROOT = 'evals/clip_composition/outputs/presentation/meaning-information-failures';
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;

const CODE_STAGE = Object.freeze({
  MEANING_JOB_INVALID: 'job-validation',
  MEANING_JOB_BINDING_MISMATCH: 'job-validation',
  TIMELINE_DECISION_INVALID: 'input-validation',
  TIMELINE_DECISION_BINDING_MISMATCH: 'input-validation',
  SOURCE_IDENTITY_INVALID: 'input-validation',
  SOURCE_MEDIA_BINDING_MISMATCH: 'input-validation',
  RETAINED_ATOMS_BUNDLE_INVALID: 'input-validation',
  RETAINED_ATOMS_BINDING_MISMATCH: 'input-validation',
  TIMELINE_SEGMENT_SOURCE_UNRESOLVED: 'input-validation',
  TIMELINE_SEGMENT_SELECTION_UNRESOLVED: 'input-validation',
  TIMELINE_SELECTION_SET_MISMATCH: 'input-validation',
  SOURCE_ATOM_UNRESOLVED: 'input-validation',
  SOURCE_ATOM_PARTIAL_INTERSECTION: 'input-validation',
  EXPECTED_ATOM_OCCURRENCE_INVALID: 'input-validation',
  SEMANTIC_VALIDATION_INVALID: 'input-validation',
  SEMANTIC_VALIDATION_BINDING_MISMATCH: 'input-validation',
  CAPTION_COUNT_INVALID: 'input-validation',
  CAPTION_ATOM_COVERAGE_MISMATCH: 'input-validation',
  CAPTION_ATOM_SEQUENCE_MISMATCH: 'input-validation',
  CAPTION_SEGMENT_SPAN_INVALID: 'input-validation',
  CAPTION_TEXT_MISMATCH: 'input-validation',
  CAPTION_ANCHOR_MISMATCH: 'input-validation',
  CAPTION_SOURCE_TIME_MISMATCH: 'input-validation',
  TITLE_INPUT_MISMATCH: 'input-validation',
  SEMANTIC_OBSERVATIONS_NOT_EMPTY: 'input-validation',
  PRESENTATION_KEY_LEAKED: 'input-validation',
  MEANING_PACKAGE_BYTE_INVALID: 'package-build',
  MEANING_PACKAGE_NON_DETERMINISTIC: 'determinism',
  MEANING_PUBLICATION_TARGET_INVALID: 'job-validation',
  MEANING_PUBLICATION_FAILED: 'publication',
});

const CODE_PATHS = Object.freeze({
  MEANING_JOB_INVALID: Object.freeze(['/job']),
  MEANING_JOB_BINDING_MISMATCH: Object.freeze(['/job']),
  TIMELINE_DECISION_INVALID: Object.freeze(['/timelineDecision']),
  TIMELINE_DECISION_BINDING_MISMATCH: Object.freeze(['/timelineDecision']),
  SOURCE_IDENTITY_INVALID: Object.freeze(['/timelineDecision/sourceMedia']),
  SOURCE_MEDIA_BINDING_MISMATCH: Object.freeze(['/timelineDecision/sourceMedia']),
  RETAINED_ATOMS_BUNDLE_INVALID: Object.freeze(['/retainedSources']),
  RETAINED_ATOMS_BINDING_MISMATCH: Object.freeze(['/retainedSources']),
  TIMELINE_SEGMENT_SOURCE_UNRESOLVED: Object.freeze(['/timelineDecision/segments']),
  TIMELINE_SEGMENT_SELECTION_UNRESOLVED: Object.freeze(['/timelineDecision/segments']),
  TIMELINE_SELECTION_SET_MISMATCH: Object.freeze(['/timelineDecision/segments']),
  SOURCE_ATOM_UNRESOLVED: Object.freeze(['/retainedSources']),
  SOURCE_ATOM_PARTIAL_INTERSECTION: Object.freeze(['/retainedSources']),
  EXPECTED_ATOM_OCCURRENCE_INVALID: Object.freeze(['/expectedAtomOccurrences']),
  SEMANTIC_VALIDATION_INVALID: Object.freeze([
    '/sourcePackage', '/semanticValidation', '/semanticSelection',
  ]),
  SEMANTIC_VALIDATION_BINDING_MISMATCH: Object.freeze([
    '/semanticValidation/sourcePackageBinding',
    '/semanticValidation/selectionBinding',
    '/semanticSelection/sourcePackageBinding',
    '/sourcePackage/timelineCompositionDecisionBinding',
  ]),
  CAPTION_COUNT_INVALID: Object.freeze(['/candidatePackage/captions']),
  CAPTION_ATOM_COVERAGE_MISMATCH: Object.freeze(['/candidatePackage/captions']),
  CAPTION_ATOM_SEQUENCE_MISMATCH: Object.freeze(['/candidatePackage/captions']),
  CAPTION_SEGMENT_SPAN_INVALID: Object.freeze(['/candidatePackage/captions']),
  CAPTION_TEXT_MISMATCH: Object.freeze(['/candidatePackage/captions']),
  CAPTION_ANCHOR_MISMATCH: Object.freeze(['/candidatePackage/captions']),
  CAPTION_SOURCE_TIME_MISMATCH: Object.freeze(['/candidatePackage/captions']),
  TITLE_INPUT_MISMATCH: Object.freeze(['/candidatePackage/title']),
  SEMANTIC_OBSERVATIONS_NOT_EMPTY: Object.freeze(['/candidatePackage/semanticObservations']),
  PRESENTATION_KEY_LEAKED: Object.freeze(['/candidatePackage']),
  MEANING_PACKAGE_BYTE_INVALID: Object.freeze(['/candidatePackage']),
  MEANING_PACKAGE_NON_DETERMINISTIC: Object.freeze(['/candidatePackage']),
  MEANING_PUBLICATION_TARGET_INVALID: Object.freeze(['/job/outputPath']),
  MEANING_PUBLICATION_FAILED: Object.freeze(['/job/outputPath']),
});

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sameStableFileIdentity = (left, right) => left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs
  && left.nlink === right.nlink;
const isSingleLinkRegularFile = value => value.isFile() && value.nlink === 1n;

const validateMediaBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);

const readStable = (workspaceRoot, relativePath) =>
  readPresentationMeaningWorkspaceFileStableV001({workspaceRoot, relativePath});

const decodeStrict = bytes => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  return result.status === 'decoded' ? result.value : null;
};

const observeJsonBinding = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  const value = decodeStrict(bytes);
  if (hash(bytes) !== binding.fileSha256) return {status: 'binding-mismatch', bytes, value};
  if (value === null) return {status: 'invalid-json', bytes, value: null};
  let canonicalSha256;
  try {
    canonicalSha256 = canonicalSha256PresentationMeaningInformationJsonV001(value);
  } catch {
    return {status: 'invalid-json', bytes, value};
  }
  if (canonicalSha256 !== binding.canonicalSha256
    || value.schemaVersion !== binding.schemaVersion) {
    return {status: 'binding-mismatch', bytes, value, canonicalSha256};
  }
  return {status: 'passed', bytes, value, canonicalSha256};
};

const observeMediaBinding = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  return hash(bytes) === binding.fileSha256
    ? {status: 'passed', bytes}
    : {status: 'binding-mismatch', bytes};
};

export async function observePresentationMeaningInformationNodeEnvironmentV001({
  executedAt,
  nodeExecutablePath = process.execPath,
  nodeVersion = process.version,
}) {
  const nodePath = await realpath(nodeExecutablePath);
  const nodeBytes = await readFileAbsoluteStable(nodePath);
  return {
    nodePath,
    nodeFileSha256: hash(nodeBytes),
    nodeVersion,
    executedAt,
  };
}

export function validatePresentationMeaningInformationFailureReportV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'failureId', 'status', 'stage', 'jobFileObservation',
    'violations', 'retainedPaths', 'environment',
  ])
    || value.schemaVersion !== PRESENTATION_MEANING_INFORMATION_FAILURE_REPORT_SCHEMA_V001
    || !FORMAL_ID.test(value.failureId)
    || !['rejected', 'fatal'].includes(value.status)
    || ![
      'job-read', 'job-validation', 'input-read', 'input-validation',
      'package-build', 'determinism', 'publication',
    ].includes(value.stage)
    || !exactKeys(value.jobFileObservation, ['path', 'fileSha256', 'canonicalSha256'])
    || !WORKSPACE_PATH.test(value.jobFileObservation.path)
    || !SHA256.test(value.jobFileObservation.fileSha256)
    || !(value.jobFileObservation.canonicalSha256 === null
      || SHA256.test(value.jobFileObservation.canonicalSha256))
    || !dense(value.violations) || value.violations.length > 1
    || !value.violations.every(item => exactKeys(item, ['code', 'path', 'relatedIds'])
      && typeof item.code === 'string' && typeof item.path === 'string'
      && dense(item.relatedIds) && item.relatedIds.length === 0)
    || !dense(value.retainedPaths) || value.retainedPaths.length !== 0
    || !exactKeys(value.environment, [
      'nodePath', 'nodeFileSha256', 'nodeVersion', 'executedAt',
    ])
    || !(
      (value.stage === 'job-read'
        && value.environment.nodePath === null
        && value.environment.nodeFileSha256 === null
        && value.environment.nodeVersion === null)
      || (typeof value.environment.nodePath === 'string'
        && path.isAbsolute(value.environment.nodePath)
        && SHA256.test(value.environment.nodeFileSha256)
        && typeof value.environment.nodeVersion === 'string'
        && value.environment.nodeVersion.length > 0)
    )
    || !UTC.test(value.environment.executedAt)) return false;
  if (value.failureId
    !== `meaning-information-failure-${value.jobFileObservation.fileSha256.slice(0, 32)}`) {
    return false;
  }
  if (value.violations.length === 1) {
    const [{code, path: violationPath}] = value.violations;
    if (!Object.hasOwn(CODE_STAGE, code)
      || !CODE_PATHS[code].includes(violationPath)) return false;
    if (CODE_STAGE[code] !== value.stage) return false;
    if (code === 'MEANING_PUBLICATION_FAILED') return value.status === 'fatal';
    return value.status === 'rejected';
  }
  return value.status === 'fatal';
}

export function buildPresentationMeaningInformationFailureReportV001({
  jobPath,
  jobBytes,
  jobValue,
  status,
  stage,
  violations,
  environment,
}) {
  let canonicalSha256 = null;
  if (jobValue !== null) {
    try { canonicalSha256 = canonicalSha256PresentationMeaningInformationJsonV001(jobValue); } catch {}
  }
  const jobFileSha256 = hash(jobBytes);
  const report = {
    schemaVersion: PRESENTATION_MEANING_INFORMATION_FAILURE_REPORT_SCHEMA_V001,
    failureId: `meaning-information-failure-${jobFileSha256.slice(0, 32)}`,
    status,
    stage,
    jobFileObservation: {
      path: jobPath,
      fileSha256: jobFileSha256,
      canonicalSha256,
    },
    violations,
    retainedPaths: [],
    environment,
  };
  if (!validatePresentationMeaningInformationFailureReportV001(report)) {
    throw new Error('failure-report-invalid');
  }
  return report;
}

const publishOneFileRoot = async ({workspaceRoot, directoryPath, fileName, bytes}) => {
  let claim;
  try {
    claim = await createPresentationMeaningOwnedStagingRootV001({
      workspaceRoot,
      relativeOutputRoot: directoryPath,
    });
  } catch (error) {
    if (error.message === 'publication-target-exists') return {status: 'target-exists'};
    throw error;
  }
  await writeFile(path.join(claim.stagingAbsolute, fileName), bytes, {flag: 'wx'});
  return publishPresentationMeaningOwnedStagingRootNoReplaceV001({
    claim,
    expectedRelativeFiles: [fileName],
  });
};

const readFileAbsoluteStable = async absolute => {
  const beforePath = await lstat(absolute, {bigint: true});
  if (!isSingleLinkRegularFile(beforePath) || beforePath.isSymbolicLink()) {
    throw new Error('unsafe-file');
  }
  if (await realpath(absolute) !== absolute) throw new Error('unsafe-file');
  const handle = await open(absolute, 'r');
  let bytes;
  let afterHandle;
  try {
    const beforeHandle = await handle.stat({bigint: true});
    if (!isSingleLinkRegularFile(beforeHandle)
      || !sameStableFileIdentity(beforePath, beforeHandle)) throw new Error('unstable-file');
    bytes = await handle.readFile();
    afterHandle = await handle.stat({bigint: true});
    if (!isSingleLinkRegularFile(afterHandle)
      || !sameStableFileIdentity(beforeHandle, afterHandle)) throw new Error('unstable-file');
  } finally {
    await handle.close();
  }
  const afterPath = await lstat(absolute, {bigint: true});
  if (!isSingleLinkRegularFile(afterPath) || afterPath.isSymbolicLink()
    || !sameStableFileIdentity(afterHandle, afterPath)
    || await realpath(absolute) !== absolute) throw new Error('unstable-file');
  return bytes;
};

const publishFailure = async ({
  workspaceRoot,
  pathJobId,
  jobPath,
  jobBytes,
  jobValue,
  status,
  stage,
  violations,
  executedAt,
}) => {
  try {
    const environment = await observePresentationMeaningInformationNodeEnvironmentV001({
      executedAt,
    });
    const report = buildPresentationMeaningInformationFailureReportV001({
      jobPath,
      jobBytes,
      jobValue,
      status,
      stage,
      violations,
      environment,
    });
    const jobFileSha256 = hash(jobBytes);
    const directoryPath = `${FAILURE_ROOT}/${pathJobId}/${jobFileSha256}`;
    const bytes = serializePresentationMeaningInformationFormalJsonV001(report);
    const published = await publishOneFileRoot({
      workspaceRoot,
      directoryPath,
      fileName: 'failure-report.json',
      bytes,
    });
    if (published.status !== 'published') throw new Error('failure-target-exists');
    return {status, exitCode: status === 'rejected' ? 1 : 2, failureReport: report, bytes};
  } catch {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
};

const codeFailure = async (context, code, pointer) => publishFailure({
  ...context,
  status: code === 'MEANING_PUBLICATION_FAILED' ? 'fatal' : 'rejected',
  stage: CODE_STAGE[code],
  violations: [makePresentationMeaningInformationViolationV001(code, pointer)],
});

export function inspectPresentationMeaningPackageDeterminismV001(firstBytes, secondBytes) {
  if (!Buffer.isBuffer(firstBytes) || !Buffer.isBuffer(secondBytes)) {
    throw new TypeError('determinism inspection bytes are required');
  }
  return firstBytes.equals(secondBytes)
    ? Object.freeze({status: 'passed', violations: []})
    : Object.freeze({
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'MEANING_PACKAGE_NON_DETERMINISTIC',
        '/candidatePackage',
      )],
    });
}

export function inspectPresentationMeaningPublicationTargetV001({outputPath, packageId}) {
  const expectedOutput = `${PACKAGE_ROOT}/${packageId}/meaning-information-package.json`;
  return outputPath === expectedOutput
    ? Object.freeze({status: 'passed', violations: []})
    : Object.freeze({
      status: 'rejected',
      violations: [makePresentationMeaningInformationViolationV001(
        'MEANING_PUBLICATION_TARGET_INVALID',
        '/job/outputPath',
      )],
    });
}

export function inspectPresentationMeaningPublicationExceptionV001(error) {
  return Object.freeze({
    status: 'fatal',
    errorCode: typeof error?.code === 'string' ? error.code : null,
    violations: [makePresentationMeaningInformationViolationV001(
      'MEANING_PUBLICATION_FAILED',
      '/job/outputPath',
    )],
  });
}

const fatalFailure = async (context, stage) => publishFailure({
  ...context,
  status: 'fatal',
  stage,
  violations: [],
});

const trackBinding = (tracked, binding, code, pointer) => {
  tracked.push({
    path: binding.path,
    fileSha256: binding.fileSha256,
    code,
    pointer,
  });
};

export async function inspectPresentationMeaningTrackedInputsBeforePublicationV001({
  workspaceRoot,
  tracked,
}) {
  const deduplicated = new Map();
  for (const item of tracked) {
    if (!deduplicated.has(item.path)) deduplicated.set(item.path, item);
  }
  try {
    for (const item of deduplicated.values()) {
      const bytes = await readStable(workspaceRoot, item.path);
      if (hash(bytes) !== item.fileSha256) {
        return Object.freeze({status: 'rejected', changed: item});
      }
    }
  } catch {
    return Object.freeze({status: 'fatal', stage: 'input-read'});
  }
  return Object.freeze({status: 'passed'});
}

const validateSemanticProjections = ({semanticValidation, semanticSelection, captions}) => {
  let selectionProjection;
  let captionProjection;
  try {
    selectionProjection = derivePresentationMeaningSelectionProjectionV001(
      semanticSelection.response,
    );
    captionProjection = derivePresentationMeaningCaptionProjectionV001(captions);
  } catch {
    return false;
  }
  return same(semanticValidation.selectionProjection, selectionProjection)
    && same(semanticValidation.captionProjection, captionProjection);
};

const validateSourceIdentityAndMedia = async ({workspaceRoot, source, tracked}) => {
  const identity = await observeJsonBinding(workspaceRoot, source.sourceIdentityBinding);
  trackBinding(tracked, source.sourceIdentityBinding, 'SOURCE_IDENTITY_INVALID', '/timelineDecision/sourceMedia');
  if (identity.status !== 'passed'
    || !validatePresentationSourceIdentityV001(identity.value)
    || identity.value.sourceRef !== source.sourceRef) {
    return {code: 'SOURCE_IDENTITY_INVALID', pointer: '/timelineDecision/sourceMedia'};
  }
  if (!same(identity.value.executionMedia, source.mediaBinding)) {
    return {code: 'SOURCE_MEDIA_BINDING_MISMATCH', pointer: '/timelineDecision/sourceMedia'};
  }
  const media = await observeMediaBinding(workspaceRoot, source.mediaBinding);
  trackBinding(tracked, source.mediaBinding, 'SOURCE_MEDIA_BINDING_MISMATCH', '/timelineDecision/sourceMedia');
  if (media.status !== 'passed') {
    return {code: 'SOURCE_MEDIA_BINDING_MISMATCH', pointer: '/timelineDecision/sourceMedia'};
  }
  const identityMedia = [
    ...(identity.value.mediaEquivalence ? [identity.value.mediaEquivalence] : []),
    ...(identity.value.sourceMediaBinding ? [identity.value.sourceMediaBinding] : []),
    identity.value.stt.manifest,
    identity.value.stt.transcript,
    identity.value.stt.wordTimestamps,
  ];
  for (const binding of identityMedia) {
    if (!validateMediaBinding(binding)) {
      return {code: 'SOURCE_IDENTITY_INVALID', pointer: '/timelineDecision/sourceMedia'};
    }
    const observed = await observeMediaBinding(workspaceRoot, binding);
    trackBinding(tracked, binding, 'SOURCE_IDENTITY_INVALID', '/timelineDecision/sourceMedia');
    if (observed.status !== 'passed') {
      return {code: 'SOURCE_IDENTITY_INVALID', pointer: '/timelineDecision/sourceMedia'};
    }
  }
  return null;
};

const readRetainedSource = async ({workspaceRoot, source, tracked}) => {
  const names = ['sourceAtoms', 'generationManifest', 'validationReport'];
  const observed = {};
  for (const name of names) {
    const binding = source.retainedSourceAtomsBinding[name];
    const result = await observeJsonBinding(workspaceRoot, binding);
    trackBinding(tracked, binding, 'RETAINED_ATOMS_BINDING_MISMATCH', '/retainedSources');
    if (result.status === 'binding-mismatch') {
      return {status: 'rejected', code: 'RETAINED_ATOMS_BINDING_MISMATCH'};
    }
    if (result.status !== 'passed') {
      return {status: 'rejected', code: 'RETAINED_ATOMS_BUNDLE_INVALID'};
    }
    observed[name] = result;
  }
  const bundle = {
    sourceAtoms: observed.sourceAtoms.value,
    generationManifest: observed.generationManifest.value,
    validationReport: observed.validationReport.value,
    sourceAtomsBytes: observed.sourceAtoms.bytes,
    generationManifestBytes: observed.generationManifest.bytes,
    validationReportBytes: observed.validationReport.bytes,
  };
  const validation = validatePresentationRetainedSourceAtomsPublishedArtifactsV001(bundle);
  if (validation.status !== 'passed') {
    return {status: 'rejected', code: 'RETAINED_ATOMS_BUNDLE_INVALID'};
  }
  if (bundle.sourceAtoms.sourceRef !== source.sourceRef) {
    return {status: 'rejected', code: 'RETAINED_ATOMS_BUNDLE_INVALID'};
  }
  return {
    status: 'passed',
    retained: {
      sourceMediaId: source.sourceMediaId,
      sourceAtoms: bundle.sourceAtoms,
      generationManifest: bundle.generationManifest,
      validationReport: bundle.validationReport,
    },
  };
};

export async function runPresentationMeaningInformationPackageJobV001({
  workspaceRoot,
  jobPath,
  executedAt = new Date().toISOString(),
}) {
  if (typeof workspaceRoot !== 'string' || typeof jobPath !== 'string' || !UTC.test(executedAt)) {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
  const prefix = `${JOB_ROOT}/`;
  if (!jobPath.startsWith(prefix) || !jobPath.endsWith('.json')
    || jobPath.slice(prefix.length, -5).includes('/')) {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
  const pathJobId = jobPath.slice(prefix.length, -5);
  if (!FORMAL_ID.test(pathJobId)) {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
  let jobBytes;
  try {
    jobBytes = await readStable(workspaceRoot, jobPath);
  } catch {
    return {status: 'fatal', exitCode: 2, failureReport: null, bytes: null};
  }
  const decodedJob = decodeStrict(jobBytes);
  const failureContext = {
    workspaceRoot,
    pathJobId,
    jobPath,
    jobBytes,
    jobValue: decodedJob,
    executedAt,
  };
  if (decodedJob === null
    || !validatePresentationMeaningInformationPackageJobV001(decodedJob)
    || decodedJob.jobId !== pathJobId) {
    return codeFailure(failureContext, 'MEANING_JOB_INVALID', '/job');
  }
  const job = decodedJob;
  const tracked = [{
    path: jobPath,
    fileSha256: hash(jobBytes),
    code: 'MEANING_JOB_BINDING_MISMATCH',
    pointer: '/job',
  }];
  for (const binding of [...job.implementationBindings, ...job.approvedContractBindings]) {
    let bytes;
    try { bytes = await readStable(workspaceRoot, binding.path); } catch {
      return fatalFailure(failureContext, 'input-read');
    }
    trackBinding(tracked, binding, 'MEANING_JOB_BINDING_MISMATCH', '/job');
    if (hash(bytes) !== binding.fileSha256) {
      return codeFailure(failureContext, 'MEANING_JOB_BINDING_MISMATCH', '/job');
    }
  }

  let decisionObserved;
  try {
    decisionObserved = await observeJsonBinding(workspaceRoot, job.timelineCompositionDecisionBinding);
  } catch {
    return fatalFailure(failureContext, 'input-read');
  }
  trackBinding(
    tracked,
    job.timelineCompositionDecisionBinding,
    'TIMELINE_DECISION_BINDING_MISMATCH',
    '/timelineDecision',
  );
  if (decisionObserved.status === 'binding-mismatch') {
    return codeFailure(
      failureContext,
      'TIMELINE_DECISION_BINDING_MISMATCH',
      '/timelineDecision',
    );
  }
  if (decisionObserved.status !== 'passed'
    || !validatePresentationTimelineCompositionDecisionV001(decisionObserved.value)) {
    return codeFailure(failureContext, 'TIMELINE_DECISION_INVALID', '/timelineDecision');
  }
  const timelineDecision = decisionObserved.value;

  const retainedSources = [];
  for (const source of timelineDecision.sourceMedia) {
    let identityFailure;
    try {
      identityFailure = await validateSourceIdentityAndMedia({workspaceRoot, source, tracked});
    } catch {
      return fatalFailure(failureContext, 'input-read');
    }
    if (identityFailure) {
      return codeFailure(failureContext, identityFailure.code, identityFailure.pointer);
    }
    let retained;
    try {
      retained = await readRetainedSource({workspaceRoot, source, tracked});
    } catch {
      return fatalFailure(failureContext, 'input-read');
    }
    if (retained.status !== 'passed') {
      return codeFailure(failureContext, retained.code, '/retainedSources');
    }
    retainedSources.push(retained.retained);
  }

  let semanticValidationObserved;
  try {
    semanticValidationObserved = await observeJsonBinding(
      workspaceRoot,
      job.semanticSelectionValidationBinding,
    );
  } catch {
    return fatalFailure(failureContext, 'input-read');
  }
  trackBinding(
    tracked,
    job.semanticSelectionValidationBinding,
    'MEANING_JOB_BINDING_MISMATCH',
    '/job',
  );
  if (semanticValidationObserved.status !== 'passed') {
    return semanticValidationObserved.status === 'binding-mismatch'
      ? codeFailure(failureContext, 'MEANING_JOB_BINDING_MISMATCH', '/job')
      : codeFailure(failureContext, 'SEMANTIC_VALIDATION_INVALID', '/semanticValidation');
  }
  const semanticValidation = semanticValidationObserved.value;
  if (!validatePresentationMeaningJsonBindingV001(semanticValidation?.sourcePackageBinding)
    || semanticValidation.sourcePackageBinding.schemaVersion
      !== 'presentation-meaning-boundary-source-package-v001') {
    return codeFailure(failureContext, 'SEMANTIC_VALIDATION_INVALID', '/semanticValidation');
  }

  let sourcePackageObserved;
  try {
    sourcePackageObserved = await observeJsonBinding(
      workspaceRoot,
      semanticValidation.sourcePackageBinding,
    );
  } catch {
    return fatalFailure(failureContext, 'input-read');
  }
  trackBinding(
    tracked,
    semanticValidation.sourcePackageBinding,
    'SEMANTIC_VALIDATION_BINDING_MISMATCH',
    '/semanticValidation/sourcePackageBinding',
  );
  const sourcePackage = sourcePackageObserved.value;
  if (!validatePresentationMeaningBoundarySourcePackageForMeaningV001(sourcePackage)) {
    return codeFailure(failureContext, 'SEMANTIC_VALIDATION_INVALID', '/sourcePackage');
  }
  if (!validatePresentationMeaningBoundaryValidationReportV001(semanticValidation)) {
    return codeFailure(failureContext, 'SEMANTIC_VALIDATION_INVALID', '/semanticValidation');
  }

  let semanticSelectionObserved;
  try {
    semanticSelectionObserved = await observeJsonBinding(
      workspaceRoot,
      job.semanticSelectionBinding,
    );
  } catch {
    return fatalFailure(failureContext, 'input-read');
  }
  trackBinding(
    tracked,
    job.semanticSelectionBinding,
    'SEMANTIC_VALIDATION_BINDING_MISMATCH',
    '/semanticValidation/selectionBinding',
  );
  const semanticSelection = semanticSelectionObserved.value;
  if (!validatePresentationMeaningSelectionWrapperV001(semanticSelection)) {
    return codeFailure(failureContext, 'SEMANTIC_VALIDATION_INVALID', '/semanticSelection');
  }

  if (sourcePackageObserved.status !== 'passed') {
    return codeFailure(
      failureContext,
      'SEMANTIC_VALIDATION_BINDING_MISMATCH',
      '/semanticValidation/sourcePackageBinding',
    );
  }
  if (semanticSelectionObserved.status !== 'passed'
    || !same(semanticValidation.selectionBinding, job.semanticSelectionBinding)
    || !validatePresentationMeaningSemanticArtifactLinkV001(
      semanticValidation,
      semanticSelection,
    )) {
    return codeFailure(
      failureContext,
      'SEMANTIC_VALIDATION_BINDING_MISMATCH',
      '/semanticValidation/selectionBinding',
    );
  }
  if (!same(semanticSelection.sourcePackageBinding, semanticValidation.sourcePackageBinding)) {
    return codeFailure(
      failureContext,
      'SEMANTIC_VALIDATION_BINDING_MISMATCH',
      '/semanticSelection/sourcePackageBinding',
    );
  }
  if (!same(sourcePackage.timelineCompositionDecisionBinding,
    job.timelineCompositionDecisionBinding)) {
    return codeFailure(
      failureContext,
      'SEMANTIC_VALIDATION_BINDING_MISMATCH',
      '/sourcePackage/timelineCompositionDecisionBinding',
    );
  }

  const jobBinding = {
    schemaVersion: PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
    path: jobPath,
    fileSha256: hash(jobBytes),
    canonicalSha256: canonicalSha256PresentationMeaningInformationJsonV001(job),
  };
  let firstBuild;
  let secondBuild;
  try {
    firstBuild = buildPresentationMeaningInformationPackageV001({
      job,
      jobBinding,
      timelineDecision,
      sourcePackage,
      semanticValidation,
      semanticSelection,
      retainedSources,
    });
    secondBuild = buildPresentationMeaningInformationPackageV001({
      job,
      jobBinding,
      timelineDecision,
      sourcePackage,
      semanticValidation,
      semanticSelection,
      retainedSources,
    });
  } catch {
    return fatalFailure(failureContext, 'package-build');
  }
  if (firstBuild.status !== 'passed') {
    const [violation] = firstBuild.violations;
    return codeFailure(failureContext, violation.code, violation.path);
  }
  if (secondBuild.status !== 'passed') {
    return fatalFailure(failureContext, 'package-build');
  }
  if (!validateSemanticProjections({
    semanticValidation,
    semanticSelection,
    captions: firstBuild.package.captions,
  })) {
    return codeFailure(failureContext, 'SEMANTIC_VALIDATION_INVALID', '/semanticValidation');
  }
  let firstBytes;
  let secondBytes;
  try {
    firstBytes = serializePresentationMeaningInformationFormalJsonV001(firstBuild.package);
    secondBytes = serializePresentationMeaningInformationFormalJsonV001(secondBuild.package);
  } catch {
    return codeFailure(failureContext, 'MEANING_PACKAGE_BYTE_INVALID', '/candidatePackage');
  }
  const byteValidation = validatePresentationMeaningInformationPackageFormalBytesV001(
    firstBytes,
    {
      job,
      jobBinding,
      timelineDecision,
      expectedAtomOccurrences: firstBuild.expectedAtomOccurrences,
      occurrenceAtoms: firstBuild.occurrenceAtoms,
    },
  );
  if (byteValidation.status !== 'passed') {
    return codeFailure(failureContext, 'MEANING_PACKAGE_BYTE_INVALID', '/candidatePackage');
  }
  if (inspectPresentationMeaningPackageDeterminismV001(
    firstBytes,
    secondBytes,
  ).status !== 'passed') {
    return codeFailure(
      failureContext,
      'MEANING_PACKAGE_NON_DETERMINISTIC',
      '/candidatePackage',
    );
  }

  if (inspectPresentationMeaningPublicationTargetV001({
    outputPath: job.outputPath,
    packageId: job.packageId,
  }).status !== 'passed') {
    return codeFailure(
      failureContext,
      'MEANING_PUBLICATION_TARGET_INVALID',
      '/job/outputPath',
    );
  }
  const reread = await inspectPresentationMeaningTrackedInputsBeforePublicationV001({
    workspaceRoot,
    tracked,
  });
  if (reread.status === 'fatal') return fatalFailure(failureContext, 'input-read');
  if (reread.status === 'rejected') {
    return codeFailure(failureContext, reread.changed.code, reread.changed.pointer);
  }

  try {
    const rootReal = await realpath(workspaceRoot);
    const outputDirectory = path.dirname(path.resolve(rootReal, job.outputPath));
    try {
      await lstat(outputDirectory);
      return codeFailure(
        failureContext,
        'MEANING_PUBLICATION_TARGET_INVALID',
        '/job/outputPath',
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const published = await publishOneFileRoot({
      workspaceRoot,
      directoryPath: path.dirname(job.outputPath),
      fileName: path.basename(job.outputPath),
      bytes: firstBytes,
    });
    if (published.status !== 'published') {
      return codeFailure(
        failureContext,
        'MEANING_PUBLICATION_TARGET_INVALID',
        '/job/outputPath',
      );
    }
  } catch (error) {
    inspectPresentationMeaningPublicationExceptionV001(error);
    return codeFailure(failureContext, 'MEANING_PUBLICATION_FAILED', '/job/outputPath');
  }
  return {
    status: 'passed',
    exitCode: 0,
    package: firstBuild.package,
    bytes: firstBytes,
    outputPath: job.outputPath,
  };
}

export async function runPresentationMeaningInformationPackageJobCliV001(
  argv = process.argv.slice(2),
) {
  if (!Array.isArray(argv) || argv.length !== 1) return 2;
  let result;
  try {
    result = await runPresentationMeaningInformationPackageJobV001({
      workspaceRoot: process.cwd(),
      jobPath: argv[0],
    });
  } catch {
    return 2;
  }
  if (result.bytes) process.stdout.write(result.bytes);
  return result.exitCode;
}

const isDirect = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  void runPresentationMeaningInformationPackageJobCliV001().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
