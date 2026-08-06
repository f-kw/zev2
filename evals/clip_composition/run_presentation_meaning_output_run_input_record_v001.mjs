import {createHash} from 'node:crypto';
import {readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  PRESENTATION_MEANING_OUTPUT_RUN_INPUT_FAILURE_REPORT_SCHEMA_V001,
  PRESENTATION_MEANING_OUTPUT_RUN_INPUT_PUBLICATION_JOB_SCHEMA_V001,
  PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001,
  PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V001,
  PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V002,
  buildPresentationMeaningOutputStageAdmissionReceiptV001,
  buildPresentationMeaningOutputStageAdmissionReceiptV002,
  canonicalSha256PresentationMeaningOutputRunInputJsonV001,
  serializePresentationMeaningOutputRunInputFormalJsonV001,
  validatePresentationMeaningOutputRunInputPublicationJobV001,
  validatePresentationMeaningOutputRunInputPublicationJobEnvelopeV001,
  validatePresentationMeaningOutputRunInputRecordV001,
  validatePresentationMeaningOutputStageAdmissionJobV001,
  validatePresentationMeaningOutputStageAdmissionJobV002,
  validatePresentationMeaningOutputStageAdmissionReceiptV001,
  validatePresentationMeaningOutputStageAdmissionReceiptV002,
} from './presentation_meaning_output_run_input_record_v001.mjs';
import {
  canonicalSha256PresentationOutputFiniteJsonV001,
  decodePresentationOutputFiniteJsonV001,
  derivePresentationOutputCropSelectionProjectionV001,
  validatePresentationOutputCropApplicationJobV001,
} from './presentation_output_crop_application_v001.mjs';
import {
  validatePresentationBaseMediaAssemblyDecisionV001,
} from './presentation_base_media_build_v001.mjs';
import {
  createPresentationMeaningOwnedStagingRootV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  readPresentationMeaningWorkspaceFileStableV001,
} from './presentation_timeline_composition_decision_v001.mjs';

const FAILURE_ROOT =
  'evals/clip_composition/outputs/presentation/meaning-output-run-input-failures';
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const exactKeys = (value, keys) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const jsonBinding = (schemaVersion, relativePath, bytes, value) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: hash(bytes),
  canonicalSha256: canonicalSha256PresentationOutputFiniteJsonV001(value),
});
const bindingWithoutRole = binding => ({
  schemaVersion: binding.schemaVersion,
  path: binding.path,
  fileSha256: binding.fileSha256,
  canonicalSha256: binding.canonicalSha256,
});

const decodeFormal = bytes => {
  const decoded = decodePresentationOutputFiniteJsonV001(bytes);
  return decoded.status === 'decoded' ? decoded.value : null;
};

const stableRead = (workspaceRoot, relativePath) =>
  readPresentationMeaningWorkspaceFileStableV001({workspaceRoot, relativePath});

const observeJson = async (workspaceRoot, binding) => {
  const bytes = await stableRead(workspaceRoot, binding.path);
  const value = decodeFormal(bytes);
  if (value === null) return {status: 'invalid', binding, bytes, value: null};
  const actual = jsonBinding(value.schemaVersion, binding.path, bytes, value);
  return same(actual, binding)
    ? {status: 'passed', binding, bytes, value}
    : {status: 'mismatch', binding, bytes, value, actual};
};

const observeUpstream = async (workspaceRoot, binding) => {
  const bytes = await stableRead(workspaceRoot, binding.path);
  if (hash(bytes) !== binding.fileSha256) {
    return {status: 'mismatch', role: binding.role, binding, bytes, value: null};
  }
  if (binding.schemaVersion === null) {
    return {status: 'passed', role: binding.role, binding, bytes, value: bytes};
  }
  const value = decodeFormal(bytes);
  if (value === null
    || value.schemaVersion !== binding.schemaVersion
    || canonicalSha256PresentationOutputFiniteJsonV001(value)
      !== binding.canonicalSha256) {
    return {status: 'mismatch', role: binding.role, binding, bytes, value};
  }
  return {status: 'passed', role: binding.role, binding, bytes, value};
};

const rereadUnchanged = async (workspaceRoot, observations) => {
  for (const observation of observations) {
    const current = await stableRead(workspaceRoot, observation.path);
    if (!current.equals(observation.bytes)) return false;
  }
  return true;
};

const verifyImplementationBindings = async (workspaceRoot, bindings) => {
  const observations = [];
  for (const binding of bindings) {
    const bytes = await stableRead(workspaceRoot, binding.path);
    if (hash(bytes) !== binding.fileSha256) return {status: 'mismatch', observations};
    observations.push({path: binding.path, bytes});
  }
  return {status: 'passed', observations};
};

const publishOneFileRoot = async ({workspaceRoot, outputRoot, fileName, bytes}) => {
  const claim = await createPresentationMeaningOwnedStagingRootV001({
    workspaceRoot,
    relativeOutputRoot: outputRoot,
  });
  await writeFile(path.join(claim.stagingAbsolute, fileName), bytes, {flag: 'wx', mode: 0o600});
  return publishPresentationMeaningOwnedStagingRootNoReplaceV001({
    claim,
    expectedRelativeFiles: [fileName],
  });
};

const buildFailureReport = ({jobPath, jobBytes, jobValue, status, stage, code, executedAt}) => {
  const fileSha256 = hash(jobBytes);
  let canonicalSha256 = null;
  if (jobValue !== null) {
    try { canonicalSha256 = canonicalSha256PresentationOutputFiniteJsonV001(jobValue); } catch {}
  }
  return {
    schemaVersion: PRESENTATION_MEANING_OUTPUT_RUN_INPUT_FAILURE_REPORT_SCHEMA_V001,
    failureId: `meaning-output-run-input-failure-${fileSha256.slice(0, 32)}`,
    status,
    stage,
    jobFileObservation: {
      path: jobPath,
      fileSha256,
      canonicalSha256,
    },
    violations: code === null ? [] : [{code, path: '/job', relatedIds: []}],
    retainedPaths: [],
    environment: {
      nodePath: process.execPath,
      nodeFileSha256: null,
      nodeVersion: process.version,
      executedAt,
    },
  };
};

const failure = async ({
  workspaceRoot,
  jobPath,
  jobBytes,
  jobValue,
  status = 'rejected',
  stage,
  code,
  executedAt,
}) => {
  const report = buildFailureReport({
    jobPath, jobBytes, jobValue, status, stage, code, executedAt,
  });
  try {
    const nodePath = await realpath(process.execPath);
    report.environment.nodePath = nodePath;
    report.environment.nodeFileSha256 = hash(await readFile(nodePath));
    const bytes = serializePresentationMeaningOutputRunInputFormalJsonV001(report);
    const outputRoot = `${FAILURE_ROOT}/${report.failureId}`;
    const published = await publishOneFileRoot({
      workspaceRoot,
      outputRoot,
      fileName: 'failure-report.json',
      bytes,
    });
    if (published.status !== 'published') return {status: 'fatal', exitCode: 2};
    return {status, exitCode: status === 'rejected' ? 1 : 2, bytes, report, outputRoot};
  } catch {
    return {status: 'fatal', exitCode: 2};
  }
};

const publicationReferenceObservations = async (workspaceRoot, record) => {
  const assembly = await observeJson(workspaceRoot, record.sourceAndInterval.assemblyDecision);
  const cropDecision = await observeJson(workspaceRoot, record.verticalStyle.cropDecision);
  const selection = await observeJson(
    workspaceRoot,
    record.verticalStyle.selectionPackageManifest,
  );
  let cropProjection = null;
  try { cropProjection = derivePresentationOutputCropSelectionProjectionV001(cropDecision.value); } catch {}
  if (assembly.status !== 'passed'
    || cropDecision.status !== 'passed'
    || selection.status !== 'passed'
    || validatePresentationBaseMediaAssemblyDecisionV001(assembly.value).status !== 'passed'
    || assembly.value.payload.segments.length !== 1
    || assembly.value.payload.sourceArtifact.sourceRef !== record.sourceAndInterval.sourceRef
    || assembly.value.payload.segments[0].sourceStartMs !== record.sourceAndInterval.sourceStartMs
    || assembly.value.payload.segments[0].sourceEndMs !== record.sourceAndInterval.sourceEndMs
    || cropProjection === null
    || cropDecision.value.selectedPlan.screenLayoutId !== record.verticalStyle.screenLayoutId
    || selection.value.schemaVersion
      !== record.verticalStyle.selectionPackageManifest.schemaVersion) {
    return {status: 'mismatch', observations: [assembly, cropDecision, selection]};
  }
  return {status: 'passed', observations: [assembly, cropDecision, selection]};
};

const runPublication = async ({
  workspaceRoot,
  jobPath,
  jobBytes,
  job,
  jobObservation,
  executedAt,
}) => {
  if (!validatePresentationMeaningOutputRunInputRecordV001(job.record)) return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-validation',
    code: 'RUN_INPUT_RECORD_INVALID', executedAt,
  });
  const implementation = await verifyImplementationBindings(
    workspaceRoot,
    job.implementationBindings,
  );
  if (implementation.status !== 'passed') return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'job-validation',
    code: 'RUN_INPUT_PUBLICATION_JOB_INVALID', executedAt,
  });
  const references = await publicationReferenceObservations(workspaceRoot, job.record);
  if (references.status !== 'passed') return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-validation',
    code: 'RUN_INPUT_REFERENCE_MISMATCH', executedAt,
  });
  const bytes = serializePresentationMeaningOutputRunInputFormalJsonV001(job.record);
  const tracked = [
    jobObservation,
    ...implementation.observations,
    ...references.observations.map(item => ({path: item.binding.path, bytes: item.bytes})),
  ];
  if (!await rereadUnchanged(workspaceRoot, tracked)) return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-read',
    code: 'RUN_INPUT_REFERENCE_MISMATCH', executedAt,
  });
  try {
    const published = await publishOneFileRoot({
      workspaceRoot,
      outputRoot: job.outputRoot,
      fileName: 'run-input-record.json',
      bytes,
    });
    if (published.status !== 'published') return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'publication',
      code: 'RUN_INPUT_PUBLICATION_TARGET_INVALID', executedAt,
    });
  } catch (error) {
    if (error?.message === 'publication-target-exists') return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'publication',
      code: 'RUN_INPUT_PUBLICATION_TARGET_INVALID', executedAt,
    });
    return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, status: 'fatal', stage: 'publication',
      code: 'RUN_INPUT_PUBLICATION_FAILED', executedAt,
    });
  }
  return {
    status: 'passed',
    exitCode: 0,
    bytes,
    artifact: job.record,
    outputPath: `${job.outputRoot}/run-input-record.json`,
  };
};

const targetValidatorFor = stage => stage === 'crop-application'
  ? validatePresentationOutputCropApplicationJobV001
  : null;

const runAdmission = async ({
  workspaceRoot,
  jobPath,
  jobBytes,
  job,
  jobObservation,
  executedAt,
}) => {
  const isV2 = job.schemaVersion
    === PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V002;
  const implementation = await verifyImplementationBindings(
    workspaceRoot,
    job.implementationBindings,
  );
  if (implementation.status !== 'passed') return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'job-validation',
    code: 'STAGE_ADMISSION_JOB_INVALID', executedAt,
  });
  let recordObservation;
  let targetObservation;
  let upstreamObservations;
  try {
    [recordObservation, targetObservation] = await Promise.all([
      observeJson(workspaceRoot, job.runInputRecordBinding),
      observeJson(workspaceRoot, job.targetJobBinding),
    ]);
    upstreamObservations = [];
    for (const binding of job.upstreamBindings) {
      upstreamObservations.push(await observeUpstream(workspaceRoot, binding));
    }
  } catch {
    return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-read',
      code: 'STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH', executedAt,
    });
  }
  if (recordObservation.status !== 'passed'
    || !validatePresentationMeaningOutputRunInputRecordV001(recordObservation.value)) {
    return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-validation',
      code: 'STAGE_ADMISSION_RECORD_BINDING_MISMATCH', executedAt,
    });
  }
  if (targetObservation.status !== 'passed') return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-validation',
    code: 'STAGE_ADMISSION_TARGET_JOB_BINDING_MISMATCH', executedAt,
  });
  if (upstreamObservations.some(item => item.status !== 'passed')) return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-validation',
    code: 'STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH', executedAt,
  });

  let supersededReceiptObservation = null;
  if (isV2 && job.attempt.attemptOrdinal > 1) {
    try {
      supersededReceiptObservation = await observeJson(
        workspaceRoot,
        job.attempt.supersedesReceipt,
      );
    } catch {
      return failure({
        workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-read',
        code: 'STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH', executedAt,
      });
    }
    const previousReceipt = supersededReceiptObservation.value;
    if (supersededReceiptObservation.status !== 'passed'
      || !validatePresentationMeaningOutputStageAdmissionReceiptV002(previousReceipt)
      || previousReceipt.stage !== job.stage
      || !same(previousReceipt.runInputRecordBinding, job.runInputRecordBinding)
      || previousReceipt.attempt.attemptOrdinal !== job.attempt.attemptOrdinal - 1) {
      return failure({
        workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-validation',
        code: 'STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH', executedAt,
      });
    }
  }

  const referenceArtifacts = {};
  const extraObservations = [];
  try {
    if (job.stage === 'timeline-decision') {
      const assembly = await observeJson(
        workspaceRoot,
        recordObservation.value.sourceAndInterval.assemblyDecision,
      );
      if (assembly.status !== 'passed') throw new Error('assembly-binding-mismatch');
      referenceArtifacts.assemblyDecision = assembly.value;
      referenceArtifacts.assemblyDecisionBinding = assembly.binding;
      extraObservations.push(assembly);
    } else if (job.stage === 'b1-validation') {
      const b6Manifest = upstreamObservations.find(item => item.role === 'b6-manifest')?.value;
      const b5 = await observeJson(workspaceRoot, b6Manifest.b5ManifestBinding);
      if (b5.status !== 'passed') throw new Error('b5-binding-mismatch');
      referenceArtifacts.b5Manifest = b5.value;
      referenceArtifacts.b5ManifestBinding = b5.binding;
      extraObservations.push(b5);
    } else if (job.stage === 'crop-application') {
      const reviewedCrop = upstreamObservations
        .find(item => item.role === 'reviewed-crop-decision');
      derivePresentationOutputCropSelectionProjectionV001(reviewedCrop.value);
      const cropDecision = await observeJson(
        workspaceRoot,
        recordObservation.value.verticalStyle.cropDecision,
      );
      if (cropDecision.status !== 'passed') throw new Error('crop-decision-mismatch');
      referenceArtifacts.cropDecision = cropDecision.value;
      extraObservations.push(cropDecision);
    }
  } catch {
    return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-validation',
      code: 'STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH', executedAt,
    });
  }

  let receipt;
  try {
    const buildReceipt = isV2
      ? buildPresentationMeaningOutputStageAdmissionReceiptV002
      : buildPresentationMeaningOutputStageAdmissionReceiptV001;
    receipt = buildReceipt({
      record: recordObservation.value,
      admissionJob: job,
      targetJob: targetObservation.value,
      upstreamArtifacts: upstreamObservations.map(item => ({
        role: item.role,
        binding: item.binding,
        value: item.value,
      })),
      referenceArtifacts,
      targetJobValidator: targetValidatorFor(job.stage),
    });
  } catch {
    return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'projection',
      code: 'STAGE_ADMISSION_PROJECTION_MISMATCH', executedAt,
    });
  }
  const validateReceipt = isV2
    ? validatePresentationMeaningOutputStageAdmissionReceiptV002
    : validatePresentationMeaningOutputStageAdmissionReceiptV001;
  if (!validateReceipt(receipt)) {
    return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'projection',
      code: 'STAGE_ADMISSION_PROJECTION_MISMATCH', executedAt,
    });
  }
  const tracked = [
    jobObservation,
    ...implementation.observations,
    {path: recordObservation.binding.path, bytes: recordObservation.bytes},
    {path: targetObservation.binding.path, bytes: targetObservation.bytes},
    ...upstreamObservations.map(item => ({path: item.binding.path, bytes: item.bytes})),
    ...extraObservations.map(item => ({path: item.binding.path, bytes: item.bytes})),
    ...(supersededReceiptObservation === null ? [] : [{
      path: supersededReceiptObservation.binding.path,
      bytes: supersededReceiptObservation.bytes,
    }]),
  ];
  if (!await rereadUnchanged(workspaceRoot, tracked)) return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'input-read',
    code: 'STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH', executedAt,
  });
  const bytes = serializePresentationMeaningOutputRunInputFormalJsonV001(receipt);
  try {
    const published = await publishOneFileRoot({
      workspaceRoot,
      outputRoot: job.outputRoot,
      fileName: 'stage-admission-receipt.json',
      bytes,
    });
    if (published.status !== 'published') throw new Error('target-exists');
  } catch {
    return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, status: 'fatal', stage: 'publication',
      code: 'STAGE_ADMISSION_PUBLICATION_FAILED', executedAt,
    });
  }
  return {
    status: 'passed',
    exitCode: 0,
    bytes,
    artifact: receipt,
    outputPath: `${job.outputRoot}/stage-admission-receipt.json`,
  };
};

export async function runPresentationMeaningOutputRunInputJobV001({
  workspaceRoot,
  jobPath,
  executedAt = new Date().toISOString(),
}) {
  if (typeof workspaceRoot !== 'string'
    || typeof jobPath !== 'string'
    || !WORKSPACE_PATH.test(jobPath)) return {status: 'fatal', exitCode: 2};
  let jobBytes;
  try { jobBytes = await stableRead(workspaceRoot, jobPath); } catch {
    return {status: 'fatal', exitCode: 2};
  }
  const job = decodeFormal(jobBytes);
  if (job === null) return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: null, stage: 'job-validation',
    code: 'RUN_INPUT_PUBLICATION_JOB_INVALID', executedAt,
  });
  const jobObservation = {path: jobPath, bytes: jobBytes};
  if (job.schemaVersion === PRESENTATION_MEANING_OUTPUT_RUN_INPUT_PUBLICATION_JOB_SCHEMA_V001) {
    if (!validatePresentationMeaningOutputRunInputPublicationJobEnvelopeV001(job)) return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'job-validation',
      code: 'RUN_INPUT_PUBLICATION_JOB_INVALID', executedAt,
    });
    return runPublication({
      workspaceRoot, jobPath, jobBytes, job, jobObservation, executedAt,
    });
  }
  if (job.schemaVersion === PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V001) {
    if (!validatePresentationMeaningOutputStageAdmissionJobV001(job)) return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'job-validation',
      code: 'STAGE_ADMISSION_JOB_INVALID', executedAt,
    });
    return runAdmission({
      workspaceRoot, jobPath, jobBytes, job, jobObservation, executedAt,
    });
  }
  if (job.schemaVersion === PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V002) {
    if (!validatePresentationMeaningOutputStageAdmissionJobV002(job)) return failure({
      workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'job-validation',
      code: 'STAGE_ADMISSION_JOB_INVALID', executedAt,
    });
    return runAdmission({
      workspaceRoot, jobPath, jobBytes, job, jobObservation, executedAt,
    });
  }
  return failure({
    workspaceRoot, jobPath, jobBytes, jobValue: job, stage: 'job-validation',
    code: 'RUN_INPUT_PUBLICATION_JOB_INVALID', executedAt,
  });
}

export async function runPresentationMeaningOutputRunInputCliV001(
  argv = process.argv.slice(2),
) {
  if (!Array.isArray(argv) || argv.length !== 1) return 2;
  let result;
  try {
    result = await runPresentationMeaningOutputRunInputJobV001({
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
  void runPresentationMeaningOutputRunInputCliV001().then(exitCode => {
    process.exitCode = exitCode;
  });
}
