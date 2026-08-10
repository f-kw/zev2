import {createHash} from 'node:crypto';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

export const PRESENTATION_A_SOURCE_SEQUENCE_SCHEMA_V002 =
  'presentation-adopted-source-sequence-v002';
export const PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002 =
  'presentation-a-source-sequence-job-v002';
export const PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002 =
  'presentation-a-v002-layer1-v3-proof-input-v001';
export const PRESENTATION_A_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V002 =
  'presentation-a-v002-layer1-v3-source-atom-transcript-v001';
export const PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002 =
  'presentation-a-v002-layer1-v3-human-approval-v001';
export const PRESENTATION_A_PROPOSAL_SCHEMA_V002 =
  'presentation-a-v002-layer1-v3-proposal-v001';
export const PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002 =
  'presentation-a-v002-layer1-v3-legacy-human-result-v001';

export const PRESENTATION_A_SOURCE_SEQUENCE_VIOLATION_CODES_V002 = Object.freeze([
  'A_SOURCE_SEQUENCE_JOB_INVALID',
  'A_PARENT_SEMANTIC_INPUT_INVALID',
  'A_REMOVAL_DECISION_INVALID',
  'A_REMOVAL_DECISION_NOT_APPROVED',
  'A_REMOVAL_DECISION_OUTSIDE_RANGE',
  'A_REMOVAL_DECISION_OVERLAP',
  'A_ADOPTED_SEQUENCE_EMPTY',
  'A_ADOPTED_SEQUENCE_INVALID',
  'A_SOURCE_SEQUENCE_BINDING_MISMATCH',
  'A_SOURCE_SEQUENCE_PUBLICATION_FAILED',
]);

export const PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002 = Object.freeze([
  Object.freeze({
    role: 'source-sequence',
    path: 'evals/clip_composition/presentation_a_source_sequence_v002.mjs',
  }),
  Object.freeze({
    role: 'source-sequence-runner',
    path: 'evals/clip_composition/run_presentation_a_source_sequence_job_v002.mjs',
  }),
  Object.freeze({
    role: 'strict-json',
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
  }),
  Object.freeze({
    role: 'fatal-observation',
    path: 'evals/clip_composition/presentation_fatal_observation_v002.mjs',
  }),
]);

export const PRESENTATION_A_SOURCE_SEQUENCE_OUTPUT_ROOT_V002 =
  'evals/clip_composition/outputs/presentation/a-v002/source-sequences';
export const PRESENTATION_A_SOURCE_SEQUENCE_FILE_NAME_V002 =
  'presentation-adopted-source-sequence-v002.json';

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const LEGACY_CANDIDATE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SOURCE_REF = /^youtube:[A-Za-z0-9_-]{11}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;

const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export const sha256PresentationABytesV002 = bytes =>
  createHash('sha256').update(bytes).digest('hex');

export function serializePresentationAFormalJsonV002(value) {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return result.bytes;
}

export function canonicalizePresentationAJsonV002(value) {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') throw new TypeError('canonical JSON serialization failed');
  return result.bytes;
}

export const canonicalSha256PresentationAJsonV002 = value =>
  sha256PresentationABytesV002(canonicalizePresentationAJsonV002(value));

export function decodePresentationAStrictJsonV002(bytes) {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  return result.status === 'decoded'
    ? Object.freeze({status: 'decoded', value: result.value})
    : Object.freeze({status: 'rejected'});
}

export const validatePresentationAJsonBindingV002 = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && typeof value.schemaVersion === 'string' && value.schemaVersion.length > 0
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && SHA256.test(value.canonicalSha256);

export const validatePresentationAMediaBindingV002 = value => exactKeys(value, [
  'path', 'fileSha256',
]) && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);

export const validatePresentationAImplementationBindingV002 = value => exactKeys(value, [
  'path', 'fileSha256', 'role',
]) && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256)
  && typeof value.role === 'string' && value.role.length > 0;

const safeProofId = candidateId =>
  `layer1-v3-${candidateId.replace(/[^A-Za-z0-9._-]/gu, '-')}`;

const validateNormalizedApprovalDecision = value => exactKeys(value, [
  'decisionId', 'candidateId', 'verdict', 'seamIssueReported', 'sourceMediaId',
  'sourceStartMs', 'sourceEndMs',
]) && FORMAL_ID.test(value.decisionId)
  && LEGACY_CANDIDATE_ID.test(value.candidateId)
  && value.decisionId === `${safeProofId(value.candidateId)}-removal-000001`
  && value.verdict === 'remove' && value.seamIssueReported === false
  && FORMAL_ID.test(value.sourceMediaId)
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

export function validatePresentationANormalizedHumanApprovalV002(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'approvalId', 'reviewedBy', 'sourceProposalBinding',
    'sourceHumanResultBinding', 'decisions',
  ]) || value.schemaVersion !== PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002
    || !FORMAL_ID.test(value.approvalId) || value.reviewedBy !== 'kawafmm'
    || !validatePresentationAJsonBindingV002(value.sourceProposalBinding)
    || value.sourceProposalBinding.schemaVersion !== PRESENTATION_A_PROPOSAL_SCHEMA_V002
    || !validatePresentationAJsonBindingV002(value.sourceHumanResultBinding)
    || value.sourceHumanResultBinding.schemaVersion
      !== PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002
    || !dense(value.decisions) || value.decisions.length !== 3
    || !value.decisions.every(validateNormalizedApprovalDecision)
    || new Set(value.decisions.map(decision => decision.decisionId)).size !== 3
    || new Set(value.decisions.map(decision => decision.candidateId)).size !== 3) return false;
  return value.decisions.every((decision, index) => index === 0
    || decision.sourceStartMs >= value.decisions[index - 1].sourceEndMs);
}

const videoIdFromSourceRef = sourceRef => SOURCE_REF.test(sourceRef)
  ? sourceRef.slice('youtube:'.length)
  : null;

export function validatePresentationANormalizedApprovalParentSourceV002({
  humanApproval,
  parentSemanticInput,
}) {
  if (!validatePresentationANormalizedHumanApprovalV002(humanApproval)
    || !validatePresentationAParentSemanticInputV002(parentSemanticInput)) return false;
  const videoId = videoIdFromSourceRef(parentSemanticInput.sourceMedia.sourceRef);
  return videoId !== null
    && humanApproval.approvalId === `layer1-v3-${videoId}-human-approval-v001`
    && humanApproval.decisions.every(decision =>
      decision.sourceMediaId === parentSemanticInput.sourceMedia.sourceMediaId);
}

const validateLegacyProposal = value => isObject(value)
  && value.kind === 'layer1_v003_conservative_long_gap_pair_review_input'
  && value.version === 'layer1-v003-long-gap-pair-review-v001'
  && isObject(value.humanReview)
  && value.humanReview.itemCount === 3
  && dense(value.humanReview.selections)
  && value.humanReview.selections.length === 3;

const validateLegacyHumanResult = value => isObject(value)
  && value.kind === 'layer1_v003_conservative_long_gap_pair_review_result'
  && value.version === 'layer1-v003-long-gap-pair-review-result-v001'
  && value.reviewedBy === 'kawafmm'
  && dense(value.results) && value.results.length === 3
  && value.summary?.same === 3 && value.summary?.seamIssuesReported === 0;

export function validatePresentationALegacyProposalParentSourceV002({
  legacyProposal,
  parentSemanticInput,
}) {
  if (!validateLegacyProposal(legacyProposal)
    || !validatePresentationAParentSemanticInputV002(parentSemanticInput)) return false;
  const videoId = videoIdFromSourceRef(parentSemanticInput.sourceMedia.sourceRef);
  return videoId !== null && legacyProposal.humanReview.selections.every(selection =>
    selection.outerRange?.sourceVideoId === videoId
    && selection.sourcePath === parentSemanticInput.sourceMedia.mediaBinding.path);
}

export function buildPresentationANormalizedHumanApprovalV002({
  legacyProposal,
  legacyHumanResult,
  sourceProposalBinding,
  sourceHumanResultBinding,
}) {
  if (!validateLegacyProposal(legacyProposal)
    || !validateLegacyHumanResult(legacyHumanResult)
    || !validatePresentationAJsonBindingV002(sourceProposalBinding)
    || sourceProposalBinding.schemaVersion !== PRESENTATION_A_PROPOSAL_SCHEMA_V002
    || !validatePresentationAJsonBindingV002(sourceHumanResultBinding)
    || sourceHumanResultBinding.schemaVersion
      !== PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002) {
    throw new TypeError('legacy human approval sources are invalid');
  }
  const resultByCandidate = new Map(
    legacyHumanResult.results.map(result => [result?.candidateId, result]),
  );
  if (resultByCandidate.size !== 3) throw new TypeError('legacy human results are ambiguous');
  const decisions = legacyProposal.humanReview.selections.map(selection => {
    const result = resultByCandidate.get(selection?.candidateId);
    const cut = selection?.cutDirectives?.[0];
    if (!isObject(selection) || !LEGACY_CANDIDATE_ID.test(selection.candidateId)
      || !isObject(selection.outerRange)
      || typeof selection.outerRange.sourceVideoId !== 'string'
      || !dense(selection.cutDirectives) || selection.cutDirectives.length !== 1
      || !isObject(cut) || !nonnegative(cut.startMs) || !positive(cut.endMs)
      || cut.startMs >= cut.endMs
      || cut.startMs <= selection.outerRange.startMs
      || cut.endMs >= selection.outerRange.endMs
      || !isObject(result) || result.decision !== '差はない'
      || result.seamIssueReported !== false) {
      throw new TypeError('legacy human approval decision is invalid');
    }
    resultByCandidate.delete(selection.candidateId);
    return {
      decisionId: `${safeProofId(selection.candidateId)}-removal-000001`,
      candidateId: selection.candidateId,
      verdict: 'remove',
      seamIssueReported: false,
      sourceMediaId: 'source-media-000001',
      sourceStartMs: cut.startMs,
      sourceEndMs: cut.endMs,
    };
  });
  if (resultByCandidate.size !== 0) throw new TypeError('legacy human result is unmatched');
  const videoIds = new Set(legacyProposal.humanReview.selections
    .map(selection => selection.outerRange.sourceVideoId));
  if (videoIds.size !== 1) throw new TypeError('legacy approval source media is ambiguous');
  const approval = {
    schemaVersion: PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002,
    approvalId: `layer1-v3-${[...videoIds][0]}-human-approval-v001`,
    reviewedBy: 'kawafmm',
    sourceProposalBinding: structuredClone(sourceProposalBinding),
    sourceHumanResultBinding: structuredClone(sourceHumanResultBinding),
    decisions,
  };
  if (!validatePresentationANormalizedHumanApprovalV002(approval)) {
    throw new TypeError('normalized human approval is invalid');
  }
  return Object.freeze(approval);
}

export function validatePresentationARemovalDecisionsAgainstApprovalV002({
  job,
  parentSemanticInput,
  humanApproval,
}) {
  if (!validatePresentationANormalizedApprovalParentSourceV002({
    humanApproval,
    parentSemanticInput,
  })
    || !validatePresentationAJsonBindingV002(parentSemanticInput?.humanApprovalBinding)
    || !dense(job?.removalDecisions) || job.removalDecisions.length < 1) return false;
  const expectedPrefix = `${parentSemanticInput.proofInputId}-removal-`;
  const applicable = humanApproval.decisions.filter(decision =>
    decision.decisionId.startsWith(expectedPrefix));
  if (applicable.length !== job.removalDecisions.length) return false;
  return job.removalDecisions.every((decision, index) => same(decision, {
    decisionId: applicable[index].decisionId,
    verdict: applicable[index].verdict,
    evidenceBinding: parentSemanticInput.humanApprovalBinding,
    sourceMediaId: applicable[index].sourceMediaId,
    sourceStartMs: applicable[index].sourceStartMs,
    sourceEndMs: applicable[index].sourceEndMs,
  }));
}

const validateImplementationBindings = (value, roles) => dense(value)
  && value.length === roles.length
  && value.every((binding, index) => validatePresentationAImplementationBindingV002(binding)
    && binding.role === roles[index].role && binding.path === roles[index].path);

export const makePresentationASourceSequenceViolationV002 = (code, pointer) => {
  if (!PRESENTATION_A_SOURCE_SEQUENCE_VIOLATION_CODES_V002.includes(code)) {
    throw new TypeError(`unknown A source-sequence violation code: ${code}`);
  }
  return Object.freeze({code, path: pointer, relatedIds: Object.freeze([])});
};

const rejected = (code, pointer) => Object.freeze({
  status: 'rejected',
  violations: Object.freeze([makePresentationASourceSequenceViolationV002(code, pointer)]),
});

export const validatePresentationASourceMediaV002 = (value, {jobShape = false} = {}) => {
  const keys = jobShape
    ? ['sourceMediaId', 'sourceRef', 'mediaBinding', 'sourceAtomBinding']
    : [
      'sourceMediaId', 'ordinal', 'sourceRef', 'mediaBinding',
      'sourceIdentityBinding', 'sourceAtomTranscriptBinding',
    ];
  if (!exactKeys(value, keys) || !FORMAL_ID.test(value.sourceMediaId)
    || !SOURCE_REF.test(value.sourceRef) || !validatePresentationAMediaBindingV002(value.mediaBinding)) {
    return false;
  }
  if (jobShape) {
    return validatePresentationAJsonBindingV002(value.sourceAtomBinding)
      && value.sourceAtomBinding.schemaVersion === PRESENTATION_A_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V002;
  }
  return value.ordinal === 1
    && validatePresentationAJsonBindingV002(value.sourceIdentityBinding)
    && value.sourceIdentityBinding.schemaVersion === 'presentation-material-source-identity-v001'
    && validatePresentationAJsonBindingV002(value.sourceAtomTranscriptBinding)
    && value.sourceAtomTranscriptBinding.schemaVersion
      === PRESENTATION_A_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V002;
};

const validateRange = (value, sourceMediaId) => exactKeys(value, [
  'sourceMediaId', 'sourceStartMs', 'sourceEndMs',
]) && value.sourceMediaId === sourceMediaId
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const validateCaption = value => exactKeys(value, [
  'captionId', 'ordinal', 'text', 'sourceAtomIds',
]) && FORMAL_ID.test(value.captionId) && value.ordinal === 1
  && typeof value.text === 'string' && value.text.length > 0 && !/[\r\n]/u.test(value.text)
  && dense(value.sourceAtomIds) && value.sourceAtomIds.length > 0
  && value.sourceAtomIds.every(id => typeof id === 'string' && id.length > 0)
  && new Set(value.sourceAtomIds).size === value.sourceAtomIds.length;

const validateSourceAtom = (value, index, outerRange) => exactKeys(value, [
  'sourceAtomId', 'ordinal', 'text', 'sourceStartMs', 'sourceEndMs',
]) && typeof value.sourceAtomId === 'string' && value.sourceAtomId.length > 0
  && value.ordinal === index + 1
  && typeof value.text === 'string' && value.text.length > 0 && !/[\r\n]/u.test(value.text)
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs
  && value.sourceStartMs >= outerRange.sourceStartMs
  && value.sourceEndMs <= outerRange.sourceEndMs;

const validateNormalizedSourceAtom = (value, index) => exactKeys(value, [
  'sourceAtomId', 'ordinal', 'text', 'sourceStartMs', 'sourceEndMs',
]) && typeof value.sourceAtomId === 'string' && value.sourceAtomId.length > 0
  && value.ordinal === index + 1
  && typeof value.text === 'string' && value.text.length > 0 && !/[\r\n]/u.test(value.text)
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

export function validatePresentationANormalizedSourceAtomTranscriptV002(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'transcriptId', 'sourceRef', 'sourceTranscriptByteBinding', 'atoms',
  ]) || value.schemaVersion !== PRESENTATION_A_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V002
    || !FORMAL_ID.test(value.transcriptId) || !SOURCE_REF.test(value.sourceRef)
    || !validatePresentationAMediaBindingV002(value.sourceTranscriptByteBinding)
    || !dense(value.atoms) || value.atoms.length < 1
    || !value.atoms.every(validateNormalizedSourceAtom)
    || new Set(value.atoms.map(atom => atom.sourceAtomId)).size !== value.atoms.length) {
    return false;
  }
  for (let index = 1; index < value.atoms.length; index += 1) {
    const prior = value.atoms[index - 1];
    const current = value.atoms[index];
    if (current.sourceStartMs < prior.sourceStartMs
      || (current.sourceStartMs === prior.sourceStartMs
        && current.sourceEndMs < prior.sourceEndMs)) return false;
  }
  return true;
}

export function validatePresentationAParentAtomsAgainstTranscriptV002(parent, transcript) {
  if (!validatePresentationAParentSemanticInputV002(parent)
    || !validatePresentationANormalizedSourceAtomTranscriptV002(transcript)
    || parent.sourceMedia.sourceRef !== transcript.sourceRef) return false;
  const atomById = new Map(transcript.atoms.map(atom => [atom.sourceAtomId, atom]));
  return parent.sourceAtoms.every(atom => {
    const sourceAtom = atomById.get(atom.sourceAtomId);
    return sourceAtom !== undefined
      && sourceAtom.text === atom.text
      && sourceAtom.sourceStartMs === atom.sourceStartMs
      && sourceAtom.sourceEndMs === atom.sourceEndMs;
  });
}

export function validatePresentationAParentSemanticInputV002(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'proofInputId', 'sourceMedia', 'outerRange', 'caption',
    'sourceAtoms', 'humanApprovalBinding',
  ]) || value.schemaVersion !== PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002
    || !FORMAL_ID.test(value.proofInputId)
    || !validatePresentationASourceMediaV002(value.sourceMedia)
    || !validateRange(value.outerRange, value.sourceMedia.sourceMediaId)
    || !validateCaption(value.caption)
    || !dense(value.sourceAtoms) || value.sourceAtoms.length < 1
    || !value.sourceAtoms.every((atom, index) => validateSourceAtom(atom, index, value.outerRange))
    || new Set(value.sourceAtoms.map(atom => atom.sourceAtomId)).size !== value.sourceAtoms.length
    || !validatePresentationAJsonBindingV002(value.humanApprovalBinding)
    || value.humanApprovalBinding.schemaVersion !== PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002) {
    return false;
  }
  for (let index = 1; index < value.sourceAtoms.length; index += 1) {
    const prior = value.sourceAtoms[index - 1];
    const current = value.sourceAtoms[index];
    if (current.sourceStartMs < prior.sourceStartMs
      || (current.sourceStartMs === prior.sourceStartMs
        && current.sourceEndMs < prior.sourceEndMs)) return false;
  }
  return same(value.caption.sourceAtomIds, value.sourceAtoms.map(atom => atom.sourceAtomId))
    && value.caption.text === value.sourceAtoms.map(atom => atom.text).join('');
}

const validateRemovalDecisionEnvelope = value => exactKeys(value, [
  'decisionId', 'verdict', 'evidenceBinding', 'sourceMediaId',
  'sourceStartMs', 'sourceEndMs',
]) && FORMAL_ID.test(value.decisionId)
  && typeof value.verdict === 'string'
  && validatePresentationAJsonBindingV002(value.evidenceBinding)
  && FORMAL_ID.test(value.sourceMediaId)
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

export function validatePresentationASourceSequenceJobV002(job) {
  return exactKeys(job, [
    'schemaVersion', 'jobId', 'sequenceId', 'parentSemanticInputBinding',
    'sourceMedia', 'outerRange', 'removalDecisions', 'outputDirectory',
    'implementationBindings',
  ]) && job.schemaVersion === PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002
    && FORMAL_ID.test(job.jobId) && FORMAL_ID.test(job.sequenceId)
    && validatePresentationAJsonBindingV002(job.parentSemanticInputBinding)
    && job.parentSemanticInputBinding.schemaVersion
      === PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002
    && validatePresentationASourceMediaV002(job.sourceMedia, {jobShape: true})
    && validateRange(job.outerRange, job.sourceMedia.sourceMediaId)
    && dense(job.removalDecisions)
    && job.removalDecisions.every(validateRemovalDecisionEnvelope)
    && job.outputDirectory
      === `${PRESENTATION_A_SOURCE_SEQUENCE_OUTPUT_ROOT_V002}/${job.sequenceId}`
    && validateImplementationBindings(
      job.implementationBindings,
      PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002,
    );
}

const validateSegment = (value, index, sourceMediaId) => exactKeys(value, [
  'segmentId', 'storyOrdinal', 'sourceTimeOrdinal', 'sourceMediaId',
  'sourceStartMs', 'sourceEndMs',
]) && value.segmentId === `segment-${String(index + 1).padStart(4, '0')}`
  && value.storyOrdinal === index + 1 && value.sourceTimeOrdinal === index + 1
  && value.sourceMediaId === sourceMediaId
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

export function validatePresentationASourceSequenceV002(value, context = {}) {
  if (!exactKeys(value, [
    'schemaVersion', 'sequenceId', 'parentSemanticInputBinding', 'segments',
    'removalDecisionBindings', 'provenance',
  ]) || value.schemaVersion !== PRESENTATION_A_SOURCE_SEQUENCE_SCHEMA_V002
    || !FORMAL_ID.test(value.sequenceId)
    || !validatePresentationAJsonBindingV002(value.parentSemanticInputBinding)
    || value.parentSemanticInputBinding.schemaVersion
      !== PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002
    || !dense(value.segments) || value.segments.length < 1
    || !dense(value.removalDecisionBindings)
    || !value.removalDecisionBindings.every(validateRemovalDecisionEnvelope)
    || !exactKeys(value.provenance, ['formalJobBinding'])
    || !validatePresentationAJsonBindingV002(value.provenance.formalJobBinding)
    || value.provenance.formalJobBinding.schemaVersion
      !== PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002) return false;
  const sourceMediaId = value.segments[0]?.sourceMediaId;
  if (!FORMAL_ID.test(sourceMediaId)
    || !value.segments.every((segment, index) => validateSegment(segment, index, sourceMediaId))) {
    return false;
  }
  for (let index = 1; index < value.segments.length; index += 1) {
    if (value.segments[index].sourceStartMs < value.segments[index - 1].sourceEndMs) return false;
  }
  if (context.job) {
    if (!validatePresentationASourceSequenceJobV002(context.job)
      || value.sequenceId !== context.job.sequenceId
      || !same(value.parentSemanticInputBinding, context.job.parentSemanticInputBinding)
      || !same(value.removalDecisionBindings, context.job.removalDecisions)
      || !same(value.provenance.formalJobBinding, context.jobBinding)) return false;
    const expectedSegments = complementSegments({
      outerRange: context.job.outerRange,
      removals: context.job.removalDecisions,
    }).map((range, index) => ({
      segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
      storyOrdinal: index + 1,
      sourceTimeOrdinal: index + 1,
      sourceMediaId: context.job.sourceMedia.sourceMediaId,
      sourceStartMs: range.sourceStartMs,
      sourceEndMs: range.sourceEndMs,
    }));
    if (!same(value.segments, expectedSegments)) return false;
  }
  if (context.parentSemanticInput
    && (!validatePresentationAParentSemanticInputV002(context.parentSemanticInput)
      || sourceMediaId !== context.parentSemanticInput.sourceMedia.sourceMediaId)) return false;
  return true;
}

const complementSegments = ({outerRange, removals}) => {
  const segments = [];
  let cursor = outerRange.sourceStartMs;
  for (const removal of removals) {
    if (cursor < removal.sourceStartMs) {
      segments.push({sourceStartMs: cursor, sourceEndMs: removal.sourceStartMs});
    }
    cursor = removal.sourceEndMs;
  }
  if (cursor < outerRange.sourceEndMs) {
    segments.push({sourceStartMs: cursor, sourceEndMs: outerRange.sourceEndMs});
  }
  return segments;
};

export function buildPresentationASourceSequenceV002({
  job,
  jobBinding,
  parentSemanticInput,
  humanApproval,
}) {
  if (!validatePresentationASourceSequenceJobV002(job)) {
    return rejected('A_SOURCE_SEQUENCE_JOB_INVALID', '/job');
  }
  if (!validatePresentationAJsonBindingV002(jobBinding)
    || jobBinding.schemaVersion !== PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002) {
    return rejected('A_SOURCE_SEQUENCE_BINDING_MISMATCH', '/job');
  }
  if (!validatePresentationAParentSemanticInputV002(parentSemanticInput)) {
    return rejected('A_PARENT_SEMANTIC_INPUT_INVALID', '/parentSemanticInput');
  }
  if (!same(job.parentSemanticInputBinding, {
    schemaVersion: parentSemanticInput.schemaVersion,
    path: job.parentSemanticInputBinding.path,
    fileSha256: job.parentSemanticInputBinding.fileSha256,
    canonicalSha256: job.parentSemanticInputBinding.canonicalSha256,
  }) || !same(job.sourceMedia, {
    sourceMediaId: parentSemanticInput.sourceMedia.sourceMediaId,
    sourceRef: parentSemanticInput.sourceMedia.sourceRef,
    mediaBinding: parentSemanticInput.sourceMedia.mediaBinding,
    sourceAtomBinding: parentSemanticInput.sourceMedia.sourceAtomTranscriptBinding,
  }) || !same(job.outerRange, parentSemanticInput.outerRange)) {
    return rejected('A_SOURCE_SEQUENCE_BINDING_MISMATCH', '/job');
  }
  const removals = [];
  const decisionIds = new Set();
  for (const decision of job.removalDecisions) {
    if (!validateRemovalDecisionEnvelope(decision) || decisionIds.has(decision.decisionId)) {
      return rejected('A_REMOVAL_DECISION_INVALID', '/job/removalDecisions');
    }
    decisionIds.add(decision.decisionId);
    if (decision.verdict !== 'remove'
      || !same(decision.evidenceBinding, parentSemanticInput.humanApprovalBinding)) {
      return rejected('A_REMOVAL_DECISION_NOT_APPROVED', '/job/removalDecisions');
    }
    if (decision.sourceMediaId !== job.outerRange.sourceMediaId
      || decision.sourceStartMs < job.outerRange.sourceStartMs
      || decision.sourceEndMs > job.outerRange.sourceEndMs) {
      return rejected('A_REMOVAL_DECISION_OUTSIDE_RANGE', '/job/removalDecisions');
    }
    removals.push(decision);
  }
  for (let index = 1; index < removals.length; index += 1) {
    if (removals[index].sourceStartMs < removals[index - 1].sourceStartMs) {
      return rejected('A_ADOPTED_SEQUENCE_INVALID', '/job/removalDecisions');
    }
    if (removals[index].sourceStartMs < removals[index - 1].sourceEndMs) {
      return rejected('A_REMOVAL_DECISION_OVERLAP', '/job/removalDecisions');
    }
  }
  const ranges = complementSegments({outerRange: job.outerRange, removals});
  if (ranges.length === 0) return rejected('A_ADOPTED_SEQUENCE_EMPTY', '/segments');
  if (job.removalDecisions.length > 0
    && !validatePresentationARemovalDecisionsAgainstApprovalV002({
      job,
      parentSemanticInput,
      humanApproval,
    })) return rejected('A_REMOVAL_DECISION_NOT_APPROVED', '/job/removalDecisions');
  const sequence = {
    schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_SCHEMA_V002,
    sequenceId: job.sequenceId,
    parentSemanticInputBinding: structuredClone(job.parentSemanticInputBinding),
    segments: ranges.map((range, index) => ({
      segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
      storyOrdinal: index + 1,
      sourceTimeOrdinal: index + 1,
      sourceMediaId: job.sourceMedia.sourceMediaId,
      sourceStartMs: range.sourceStartMs,
      sourceEndMs: range.sourceEndMs,
    })),
    removalDecisionBindings: structuredClone(job.removalDecisions),
    provenance: {formalJobBinding: structuredClone(jobBinding)},
  };
  if (!validatePresentationASourceSequenceV002(sequence, {
    job,
    jobBinding,
    parentSemanticInput,
  })) return rejected('A_ADOPTED_SEQUENCE_INVALID', '/segments');
  return Object.freeze({status: 'passed', violations: Object.freeze([]), sequence});
}

export function validatePresentationASourceSequenceFormalBytesV002(bytes, context = {}) {
  const decoded = decodePresentationAStrictJsonV002(bytes);
  if (decoded.status !== 'decoded'
    || decoded.value.schemaVersion !== PRESENTATION_A_SOURCE_SEQUENCE_SCHEMA_V002) {
    return rejected('A_ADOPTED_SEQUENCE_INVALID', '/sequence');
  }
  let expected;
  try { expected = serializePresentationAFormalJsonV002(decoded.value); } catch {
    return rejected('A_ADOPTED_SEQUENCE_INVALID', '/sequence');
  }
  return Buffer.from(bytes).equals(expected)
    && validatePresentationASourceSequenceV002(decoded.value, context)
    ? Object.freeze({status: 'passed', violations: Object.freeze([]), value: decoded.value})
    : rejected('A_ADOPTED_SEQUENCE_INVALID', '/sequence');
}
