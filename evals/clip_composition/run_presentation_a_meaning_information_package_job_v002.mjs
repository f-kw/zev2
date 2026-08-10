import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  PRESENTATION_A_MEANING_INFORMATION_FILE_NAME_V002,
  PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
  buildPresentationAMeaningInformationPackageV002,
  makePresentationAMeaningInformationViolationV002,
  validatePresentationAMeaningInformationPackageFormalBytesV002,
  validatePresentationAMeaningInformationPackageJobV002,
} from './presentation_a_meaning_information_package_v002.mjs';
import {
  canonicalSha256PresentationAJsonV002,
  PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002,
  PRESENTATION_A_PROPOSAL_SCHEMA_V002,
  buildPresentationANormalizedHumanApprovalV002,
  decodePresentationAStrictJsonV002,
  serializePresentationAFormalJsonV002,
  sha256PresentationABytesV002,
  validatePresentationANormalizedSourceAtomTranscriptV002,
  validatePresentationANormalizedHumanApprovalV002,
  validatePresentationANormalizedApprovalParentSourceV002,
  validatePresentationALegacyProposalParentSourceV002,
  validatePresentationAParentAtomsAgainstTranscriptV002,
  validatePresentationAParentSemanticInputV002,
  validatePresentationASourceSequenceV002,
} from './presentation_a_source_sequence_v002.mjs';
import {
  createPresentationMeaningOwnedStagingRootV001,
  observePresentationMeaningWorkspaceFileStableStreamingV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  readPresentationMeaningWorkspaceFileStableV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {buildPresentationFatalObservationV002} from './presentation_fatal_observation_v002.mjs';

export const PRESENTATION_A_MEANING_PACKAGE_RUNNER_RESULT_SCHEMA_V002 =
  'presentation-a-meaning-package-runner-result-v002';

const passed = outputBinding => Object.freeze({
  schemaVersion: PRESENTATION_A_MEANING_PACKAGE_RUNNER_RESULT_SCHEMA_V002,
  runnerId: PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
  status: 'passed',
  outputBinding,
});
const rejected = violation => Object.freeze({
  schemaVersion: PRESENTATION_A_MEANING_PACKAGE_RUNNER_RESULT_SCHEMA_V002,
  runnerId: PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
  status: 'rejected',
  violations: Object.freeze([violation]),
});
const fatal = (innerStage = 'unknown', innerCode = 'UNCLASSIFIED') => Object.freeze({
  schemaVersion: PRESENTATION_A_MEANING_PACKAGE_RUNNER_RESULT_SCHEMA_V002,
  runnerId: PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
  status: 'fatal',
  violations: Object.freeze([]),
  fatalObservation: buildPresentationFatalObservationV002({
    innerStage,
    targetFile: null,
    innerCode,
  }),
});

const formalBytesEqual = (bytes, value) => {
  try { return Buffer.from(bytes).equals(serializePresentationAFormalJsonV002(value)); } catch {
    return false;
  }
};

const readBoundJson = async ({workspaceRoot, binding}) => {
  const bytes = await readPresentationMeaningWorkspaceFileStableV001({
    workspaceRoot,
    relativePath: binding.path,
  });
  const decoded = decodePresentationAStrictJsonV002(bytes);
  if (decoded.status !== 'decoded' || !formalBytesEqual(bytes, decoded.value)) {
    return Object.freeze({status: 'invalid'});
  }
  const observed = Object.freeze({
    path: binding.path,
    fileSha256: sha256PresentationABytesV002(bytes),
    canonicalSha256: canonicalSha256PresentationAJsonV002(decoded.value),
    schemaVersion: decoded.value.schemaVersion,
  });
  return observed.fileSha256 === binding.fileSha256
    && observed.canonicalSha256 === binding.canonicalSha256
    && observed.schemaVersion === binding.schemaVersion
    ? Object.freeze({status: 'passed', bytes, value: decoded.value, observed})
    : Object.freeze({status: 'binding-mismatch', observed});
};

const readLegacyBoundJson = async ({workspaceRoot, binding, schemaVersion}) => {
  if (binding.schemaVersion !== schemaVersion) return Object.freeze({status: 'invalid'});
  const bytes = await readPresentationMeaningWorkspaceFileStableV001({
    workspaceRoot,
    relativePath: binding.path,
  });
  const decoded = decodePresentationAStrictJsonV002(bytes);
  if (decoded.status !== 'decoded' || !formalBytesEqual(bytes, decoded.value)) {
    return Object.freeze({status: 'invalid'});
  }
  const observed = Object.freeze({
    path: binding.path,
    fileSha256: sha256PresentationABytesV002(bytes),
    canonicalSha256: canonicalSha256PresentationAJsonV002(decoded.value),
    schemaVersion,
  });
  return observed.fileSha256 === binding.fileSha256
    && observed.canonicalSha256 === binding.canonicalSha256
    ? Object.freeze({status: 'passed', bytes, value: decoded.value, observed})
    : Object.freeze({status: 'binding-mismatch', observed});
};

const observeImplementation = async ({workspaceRoot, binding}) => {
  const bytes = await readPresentationMeaningWorkspaceFileStableV001({
    workspaceRoot,
    relativePath: binding.path,
  });
  const fileSha256 = sha256PresentationABytesV002(bytes);
  return Object.freeze({
    status: fileSha256 === binding.fileSha256 ? 'passed' : 'binding-mismatch',
    observed: Object.freeze({path: binding.path, fileSha256}),
  });
};

const observeStreaming = async ({workspaceRoot, binding}) => {
  const value = await observePresentationMeaningWorkspaceFileStableStreamingV001({
    workspaceRoot,
    relativePath: binding.path,
  });
  const observed = Object.freeze({path: binding.path, fileSha256: value.fileSha256});
  return Object.freeze({
    status: observed.fileSha256 === binding.fileSha256 ? 'passed' : 'binding-mismatch',
    observed,
  });
};

const observeMeaningInputs = async ({workspaceRoot, job, parent, sequence}) => {
  const observations = [];
  for (const binding of job.implementationBindings) {
    const observation = await observeImplementation({workspaceRoot, binding});
    if (observation.status !== 'passed') return Object.freeze({status: 'binding-mismatch'});
    observations.push(observation.observed);
  }
  const parentObservation = await readBoundJson({
    workspaceRoot,
    binding: job.parentSemanticInputBinding,
  });
  const sequenceObservation = await readBoundJson({
    workspaceRoot,
    binding: job.adoptedSourceSequenceBinding,
  });
  if (parentObservation.status !== 'passed' || sequenceObservation.status !== 'passed'
    || !validatePresentationAParentSemanticInputV002(parentObservation.value)
    || !validatePresentationASourceSequenceV002(sequenceObservation.value)
    || JSON.stringify(parentObservation.value) !== JSON.stringify(parent)
    || JSON.stringify(sequenceObservation.value) !== JSON.stringify(sequence)) {
    return Object.freeze({status: 'binding-mismatch'});
  }
  observations.push(parentObservation.observed, sequenceObservation.observed);
  const transcriptObservation = await readBoundJson({
    workspaceRoot,
    binding: parent.sourceMedia.sourceAtomTranscriptBinding,
  });
  if (transcriptObservation.status !== 'passed'
    || !validatePresentationANormalizedSourceAtomTranscriptV002(transcriptObservation.value)
    || !validatePresentationAParentAtomsAgainstTranscriptV002(parent, transcriptObservation.value)) {
    return Object.freeze({status: 'binding-mismatch'});
  }
  observations.push(transcriptObservation.observed);
  const sourceIdentityObservation = await readBoundJson({
    workspaceRoot,
    binding: parent.sourceMedia.sourceIdentityBinding,
  });
  const approvalObservation = await readBoundJson({
    workspaceRoot,
    binding: parent.humanApprovalBinding,
  });
  if (sourceIdentityObservation.status !== 'passed'
    || approvalObservation.status !== 'passed'
    || !validatePresentationANormalizedHumanApprovalV002(approvalObservation.value)) {
    return Object.freeze({status: 'binding-mismatch'});
  }
  observations.push(sourceIdentityObservation.observed, approvalObservation.observed);
  const proposalObservation = await readLegacyBoundJson({
    workspaceRoot,
    binding: approvalObservation.value.sourceProposalBinding,
    schemaVersion: PRESENTATION_A_PROPOSAL_SCHEMA_V002,
  });
  const humanResultObservation = await readLegacyBoundJson({
    workspaceRoot,
    binding: approvalObservation.value.sourceHumanResultBinding,
    schemaVersion: PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002,
  });
  if (proposalObservation.status !== 'passed' || humanResultObservation.status !== 'passed') {
    return Object.freeze({status: 'binding-mismatch'});
  }
  let reconstructedApproval;
  try {
    reconstructedApproval = buildPresentationANormalizedHumanApprovalV002({
      legacyProposal: proposalObservation.value,
      legacyHumanResult: humanResultObservation.value,
      sourceProposalBinding: approvalObservation.value.sourceProposalBinding,
      sourceHumanResultBinding: approvalObservation.value.sourceHumanResultBinding,
    });
  } catch {
    return Object.freeze({status: 'binding-mismatch'});
  }
  if (JSON.stringify(reconstructedApproval) !== JSON.stringify(approvalObservation.value)
    || !validatePresentationANormalizedApprovalParentSourceV002({
      humanApproval: approvalObservation.value,
      parentSemanticInput: parent,
    })
    || !validatePresentationALegacyProposalParentSourceV002({
      legacyProposal: proposalObservation.value,
      parentSemanticInput: parent,
    })) {
    return Object.freeze({status: 'binding-mismatch'});
  }
  observations.push(proposalObservation.observed, humanResultObservation.observed);
  for (const binding of [
    parent.sourceMedia.mediaBinding,
    transcriptObservation.value.sourceTranscriptByteBinding,
  ]) {
    const observation = await observeStreaming({workspaceRoot, binding});
    if (observation.status !== 'passed') return Object.freeze({status: 'binding-mismatch'});
    observations.push(observation.observed);
  }
  return Object.freeze({status: 'passed', snapshot: Object.freeze(observations)});
};

const publish = async ({workspaceRoot, outputDirectory, bytes}) => {
  let claim;
  try {
    claim = await createPresentationMeaningOwnedStagingRootV001({
      workspaceRoot,
      relativeOutputRoot: outputDirectory,
    });
  } catch (error) {
    if (error?.message === 'publication-target-exists'
      || error?.message === 'publication-staging-exists') {
      return Object.freeze({status: 'target-exists'});
    }
    throw error;
  }
  await writeFile(
    path.join(claim.stagingAbsolute, PRESENTATION_A_MEANING_INFORMATION_FILE_NAME_V002),
    bytes,
    {flag: 'wx'},
  );
  return publishPresentationMeaningOwnedStagingRootNoReplaceV001({
    claim,
    expectedRelativeFiles: [PRESENTATION_A_MEANING_INFORMATION_FILE_NAME_V002],
  });
};

export async function runPresentationAMeaningInformationPackageJobV002({
  workspaceRoot = process.cwd(),
  jobPath,
  beforePrepublicationObservation = null,
}) {
  let jobBytes;
  let job;
  try {
    jobBytes = await readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot,
      relativePath: jobPath,
    });
    const decoded = decodePresentationAStrictJsonV002(jobBytes);
    if (decoded.status !== 'decoded' || !formalBytesEqual(jobBytes, decoded.value)
      || !validatePresentationAMeaningInformationPackageJobV002(decoded.value)) {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationAMeaningInformationViolationV002('A_MEANING_JOB_INVALID', '/job'),
      )});
    }
    job = decoded.value;
  } catch {
    return Object.freeze({exitCode: 2, result: fatal()});
  }
  const jobBinding = Object.freeze({
    schemaVersion: job.schemaVersion,
    path: jobPath,
    fileSha256: sha256PresentationABytesV002(jobBytes),
    canonicalSha256: canonicalSha256PresentationAJsonV002(job),
  });
  let parentObservation;
  let sequenceObservation;
  let startObservation;
  try {
    parentObservation = await readBoundJson({
      workspaceRoot,
      binding: job.parentSemanticInputBinding,
    });
    sequenceObservation = await readBoundJson({
      workspaceRoot,
      binding: job.adoptedSourceSequenceBinding,
    });
    if (parentObservation.status !== 'passed' || sequenceObservation.status !== 'passed') {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationAMeaningInformationViolationV002(
          'A_MEANING_BINDING_MISMATCH', '/job',
        ),
      )});
    }
    startObservation = await observeMeaningInputs({
      workspaceRoot,
      job,
      parent: parentObservation.value,
      sequence: sequenceObservation.value,
    });
    if (startObservation.status !== 'passed') {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationAMeaningInformationViolationV002(
          'A_MEANING_BINDING_MISMATCH', '/job',
        ),
      )});
    }
  } catch {
    return Object.freeze({exitCode: 2, result: fatal()});
  }
  const built = buildPresentationAMeaningInformationPackageV002({
    job,
    jobBinding,
    parentSemanticInput: parentObservation.value,
    adoptedSourceSequence: sequenceObservation.value,
  });
  if (built.status !== 'passed') {
    return Object.freeze({exitCode: 1, result: rejected(built.violations[0])});
  }
  const outputBytes = serializePresentationAFormalJsonV002(built.package);
  if (validatePresentationAMeaningInformationPackageFormalBytesV002(outputBytes, {
    job,
    jobBinding,
    parentSemanticInput: parentObservation.value,
    adoptedSourceSequence: sequenceObservation.value,
  }).status !== 'passed') {
    return Object.freeze({exitCode: 1, result: rejected(
      makePresentationAMeaningInformationViolationV002(
        'A_MEANING_PACKAGE_BYTE_INVALID', '/meaningPackage',
      ),
    )});
  }
  try {
    if (beforePrepublicationObservation !== null) {
      if (typeof beforePrepublicationObservation !== 'function') {
        return Object.freeze({exitCode: 2, result: fatal()});
      }
      await beforePrepublicationObservation();
    }
    const currentJobBytes = await readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot,
      relativePath: jobPath,
    });
    const prepublication = await observeMeaningInputs({
      workspaceRoot,
      job,
      parent: parentObservation.value,
      sequence: sequenceObservation.value,
    });
    if (!Buffer.from(currentJobBytes).equals(jobBytes)
      || prepublication.status !== 'passed'
      || JSON.stringify(prepublication.snapshot) !== JSON.stringify(startObservation.snapshot)) {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationAMeaningInformationViolationV002(
          'A_MEANING_BINDING_MISMATCH', '/job',
        ),
      )});
    }
    const publication = await publish({
      workspaceRoot,
      outputDirectory: job.outputDirectory,
      bytes: outputBytes,
    });
    if (publication.status !== 'published') {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationAMeaningInformationViolationV002(
          'A_MEANING_PUBLICATION_FAILED', '/job/outputDirectory',
        ),
      )});
    }
  } catch {
    return Object.freeze({exitCode: 2, result: fatal('publication', 'PUBLICATION_FAILED')});
  }
  return Object.freeze({
    exitCode: 0,
    result: passed(Object.freeze({
      schemaVersion: built.package.schemaVersion,
      path: `${job.outputDirectory}/${PRESENTATION_A_MEANING_INFORMATION_FILE_NAME_V002}`,
      fileSha256: sha256PresentationABytesV002(outputBytes),
      canonicalSha256: canonicalSha256PresentationAJsonV002(built.package),
    })),
  });
}

export async function mainPresentationAMeaningInformationPackageJobV002(
  argv = process.argv.slice(2),
) {
  const execution = argv.length === 1
    ? await runPresentationAMeaningInformationPackageJobV002({jobPath: argv[0]})
    : Object.freeze({exitCode: 2, result: fatal()});
  process.stdout.write(serializePresentationAFormalJsonV002(execution.result));
  return execution.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await mainPresentationAMeaningInformationPackageJobV002();
}
