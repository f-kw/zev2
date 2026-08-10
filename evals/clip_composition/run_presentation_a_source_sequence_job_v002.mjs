import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002,
  PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002,
  PRESENTATION_A_PROPOSAL_SCHEMA_V002,
  PRESENTATION_A_SOURCE_SEQUENCE_FILE_NAME_V002,
  PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
  buildPresentationASourceSequenceV002,
  buildPresentationANormalizedHumanApprovalV002,
  canonicalSha256PresentationAJsonV002,
  decodePresentationAStrictJsonV002,
  makePresentationASourceSequenceViolationV002,
  serializePresentationAFormalJsonV002,
  sha256PresentationABytesV002,
  validatePresentationANormalizedSourceAtomTranscriptV002,
  validatePresentationANormalizedHumanApprovalV002,
  validatePresentationANormalizedApprovalParentSourceV002,
  validatePresentationALegacyProposalParentSourceV002,
  validatePresentationAParentAtomsAgainstTranscriptV002,
  validatePresentationAParentSemanticInputV002,
  validatePresentationASourceSequenceFormalBytesV002,
  validatePresentationASourceSequenceJobV002,
} from './presentation_a_source_sequence_v002.mjs';
import {
  createPresentationMeaningOwnedStagingRootV001,
  observePresentationMeaningWorkspaceFileStableStreamingV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  readPresentationMeaningWorkspaceFileStableV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {buildPresentationFatalObservationV002} from './presentation_fatal_observation_v002.mjs';

export const PRESENTATION_A_SOURCE_SEQUENCE_RUNNER_RESULT_SCHEMA_V002 =
  'presentation-a-source-sequence-runner-result-v002';

const passed = outputBinding => Object.freeze({
  schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_RUNNER_RESULT_SCHEMA_V002,
  runnerId: PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
  status: 'passed',
  outputBinding,
});
const rejected = violation => Object.freeze({
  schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_RUNNER_RESULT_SCHEMA_V002,
  runnerId: PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
  status: 'rejected',
  violations: Object.freeze([violation]),
});
const fatal = (innerStage = 'unknown', innerCode = 'UNCLASSIFIED') => Object.freeze({
  schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_RUNNER_RESULT_SCHEMA_V002,
  runnerId: PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
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
  const observedValue = await observePresentationMeaningWorkspaceFileStableStreamingV001({
    workspaceRoot,
    relativePath: binding.path,
  });
  const observed = Object.freeze({path: binding.path, fileSha256: observedValue.fileSha256});
  return Object.freeze({
    status: observed.fileSha256 === binding.fileSha256 ? 'passed' : 'binding-mismatch',
    observed,
  });
};

const snapshotEntry = observation => observation.observed;
const sameSnapshot = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const observeSourceInputs = async ({workspaceRoot, job, parent}) => {
  const observations = [];
  for (const binding of job.implementationBindings) {
    const observation = await observeImplementation({workspaceRoot, binding});
    if (observation.status !== 'passed') return Object.freeze({status: 'binding-mismatch'});
    observations.push(snapshotEntry(observation));
  }
  const parentObservation = await readBoundJson({
    workspaceRoot,
    binding: job.parentSemanticInputBinding,
  });
  if (parentObservation.status !== 'passed'
    || !validatePresentationAParentSemanticInputV002(parentObservation.value)
    || JSON.stringify(parentObservation.value) !== JSON.stringify(parent)) {
    return Object.freeze({status: 'binding-mismatch'});
  }
  observations.push(snapshotEntry(parentObservation));
  const transcriptObservation = await readBoundJson({
    workspaceRoot,
    binding: parent.sourceMedia.sourceAtomTranscriptBinding,
  });
  if (transcriptObservation.status !== 'passed'
    || !validatePresentationANormalizedSourceAtomTranscriptV002(transcriptObservation.value)
    || !validatePresentationAParentAtomsAgainstTranscriptV002(parent, transcriptObservation.value)) {
    return Object.freeze({status: 'binding-mismatch'});
  }
  observations.push(snapshotEntry(transcriptObservation));
  const sourceIdentityObservation = await readBoundJson({
    workspaceRoot,
    binding: parent.sourceMedia.sourceIdentityBinding,
  });
  if (sourceIdentityObservation.status !== 'passed') {
    return Object.freeze({status: 'binding-mismatch'});
  }
  observations.push(snapshotEntry(sourceIdentityObservation));
  const approvalObservation = await readBoundJson({
    workspaceRoot,
    binding: parent.humanApprovalBinding,
  });
  if (approvalObservation.status !== 'passed'
    || approvalObservation.value.schemaVersion !== PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002
    || !validatePresentationANormalizedHumanApprovalV002(approvalObservation.value)) {
    return Object.freeze({status: 'binding-mismatch'});
  }
  observations.push(snapshotEntry(approvalObservation));
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
  observations.push(
    snapshotEntry(proposalObservation),
    snapshotEntry(humanResultObservation),
  );
  for (const binding of [
    parent.sourceMedia.mediaBinding,
    transcriptObservation.value.sourceTranscriptByteBinding,
  ]) {
    const observation = await observeStreaming({workspaceRoot, binding});
    if (observation.status !== 'passed') return Object.freeze({status: 'binding-mismatch'});
    observations.push(snapshotEntry(observation));
  }
  return Object.freeze({
    status: 'passed',
    snapshot: Object.freeze(observations),
    humanApproval: approvalObservation.value,
  });
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
  await writeFile(path.join(claim.stagingAbsolute, PRESENTATION_A_SOURCE_SEQUENCE_FILE_NAME_V002),
    bytes, {flag: 'wx'});
  return publishPresentationMeaningOwnedStagingRootNoReplaceV001({
    claim,
    expectedRelativeFiles: [PRESENTATION_A_SOURCE_SEQUENCE_FILE_NAME_V002],
  });
};

export async function runPresentationASourceSequenceJobV002({
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
      || !validatePresentationASourceSequenceJobV002(decoded.value)) {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationASourceSequenceViolationV002('A_SOURCE_SEQUENCE_JOB_INVALID', '/job'),
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
  let startObservation;
  try {
    parentObservation = await readBoundJson({
      workspaceRoot,
      binding: job.parentSemanticInputBinding,
    });
    if (parentObservation.status !== 'passed') {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationASourceSequenceViolationV002(
          'A_SOURCE_SEQUENCE_BINDING_MISMATCH', '/job',
        ),
      )});
    }
    startObservation = await observeSourceInputs({
      workspaceRoot,
      job,
      parent: parentObservation.value,
    });
    if (startObservation.status !== 'passed') {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationASourceSequenceViolationV002(
          'A_SOURCE_SEQUENCE_BINDING_MISMATCH', '/job',
        ),
      )});
    }
  } catch {
    return Object.freeze({exitCode: 2, result: fatal()});
  }
  const built = buildPresentationASourceSequenceV002({
    job,
    jobBinding,
    parentSemanticInput: parentObservation.value,
    humanApproval: startObservation.humanApproval,
  });
  if (built.status !== 'passed') {
    return Object.freeze({exitCode: 1, result: rejected(built.violations[0])});
  }
  const outputBytes = serializePresentationAFormalJsonV002(built.sequence);
  if (validatePresentationASourceSequenceFormalBytesV002(outputBytes, {
    job,
    jobBinding,
    parentSemanticInput: parentObservation.value,
  }).status !== 'passed') {
    return Object.freeze({exitCode: 1, result: rejected(
      makePresentationASourceSequenceViolationV002('A_ADOPTED_SEQUENCE_INVALID', '/sequence'),
    )});
  }
  try {
    if (beforePrepublicationObservation !== null) {
      if (typeof beforePrepublicationObservation !== 'function') {
        return Object.freeze({exitCode: 2, result: fatal()});
      }
      await beforePrepublicationObservation();
    }
    const prepublicationJobBytes = await readPresentationMeaningWorkspaceFileStableV001({
      workspaceRoot,
      relativePath: jobPath,
    });
    const prepublication = await observeSourceInputs({
      workspaceRoot,
      job,
      parent: parentObservation.value,
    });
    if (!Buffer.from(prepublicationJobBytes).equals(jobBytes)
      || prepublication.status !== 'passed'
      || !sameSnapshot(startObservation.snapshot, prepublication.snapshot)) {
      return Object.freeze({exitCode: 1, result: rejected(
        makePresentationASourceSequenceViolationV002(
          'A_SOURCE_SEQUENCE_BINDING_MISMATCH', '/job',
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
        makePresentationASourceSequenceViolationV002(
          'A_SOURCE_SEQUENCE_PUBLICATION_FAILED', '/job/outputDirectory',
        ),
      )});
    }
  } catch {
    return Object.freeze({exitCode: 2, result: fatal('publication', 'PUBLICATION_FAILED')});
  }
  return Object.freeze({
    exitCode: 0,
    result: passed(Object.freeze({
      schemaVersion: built.sequence.schemaVersion,
      path: `${job.outputDirectory}/${PRESENTATION_A_SOURCE_SEQUENCE_FILE_NAME_V002}`,
      fileSha256: sha256PresentationABytesV002(outputBytes),
      canonicalSha256: canonicalSha256PresentationAJsonV002(built.sequence),
    })),
  });
}

export async function mainPresentationASourceSequenceJobV002(argv = process.argv.slice(2)) {
  const execution = argv.length === 1
    ? await runPresentationASourceSequenceJobV002({jobPath: argv[0]})
    : Object.freeze({exitCode: 2, result: fatal()});
  process.stdout.write(serializePresentationAFormalJsonV002(execution.result));
  return execution.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await mainPresentationASourceSequenceJobV002();
}
