import {createHash} from 'node:crypto';

import {
  canonicalJson,
  serializePresentationCaptionReport,
} from './presentation_caption_contract_v002.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002,
  PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002,
  buildPresentationANormalizedHumanApprovalV002,
  validatePresentationANormalizedHumanApprovalV002,
} from './presentation_a_source_sequence_v002.mjs';

export const PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001 =
  'presentation-a-v002-layer1-v3-proof-input-v001';
export const PRESENTATION_A_V002_LAYER1_V3_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V001 =
  'presentation-a-v002-layer1-v3-source-atom-transcript-v001';
export const PRESENTATION_A_V002_LAYER1_V3_HUMAN_APPROVAL_SCHEMA_V001 =
  PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002;
export const PRESENTATION_A_V002_LAYER1_V3_LEGACY_HUMAN_RESULT_SCHEMA_V001 =
  PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002;
export const PRESENTATION_A_V002_LAYER1_V3_PROPOSAL_SCHEMA_V001 =
  'presentation-a-v002-layer1-v3-proposal-v001';

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SOURCE_REF = /^youtube:[A-Za-z0-9_-]{11}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const serializeFormal = value => {
  try {
    return Buffer.from(serializePresentationCaptionReport(value), 'utf8');
  } catch {
    throw new TypeError('formal JSON serialization failed');
  }
};

const canonicalBytes = value => {
  try {
    return Buffer.from(canonicalJson(value), 'utf8');
  } catch {
    throw new TypeError('canonical JSON serialization failed');
  }
};

const serializeStrictFormal = value => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') {
    throw new TypeError('strict formal JSON serialization failed');
  }
  return result.bytes;
};

const canonicalizeStrict = value => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') {
    throw new TypeError('strict canonical JSON serialization failed');
  }
  return result.bytes;
};

export const sha256PresentationAV002Layer1V3BytesV001 = bytes =>
  createHash('sha256').update(bytes).digest('hex');

export const canonicalSha256PresentationAV002Layer1V3JsonV001 = value =>
  sha256PresentationAV002Layer1V3BytesV001(canonicalBytes(value));

export const serializePresentationAV002Layer1V3FormalJsonV001 = value =>
  serializeFormal(value);

export const validatePresentationAV002Layer1V3MediaBindingV001 = value =>
  exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256);

export const validatePresentationAV002Layer1V3JsonBindingV001 = value =>
  exactKeys(value, ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256'])
  && typeof value.schemaVersion === 'string'
  && value.schemaVersion.length > 0
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && SHA256.test(value.canonicalSha256);

export function validatePresentationAV002Layer1V3NormalizedTranscriptV001(value) {
  if (!exactKeys(value, [
    'schemaVersion',
    'transcriptId',
    'sourceRef',
    'sourceTranscriptByteBinding',
    'atoms',
  ])) return false;
  if (
    value.schemaVersion !== PRESENTATION_A_V002_LAYER1_V3_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V001
    || !FORMAL_ID.test(value.transcriptId)
    || !SOURCE_REF.test(value.sourceRef)
    || !validatePresentationAV002Layer1V3MediaBindingV001(
      value.sourceTranscriptByteBinding,
    )
    || !dense(value.atoms)
    || value.atoms.length !== 1890
  ) return false;
  return value.atoms.every((atom, index) => exactKeys(atom, [
    'sourceAtomId', 'ordinal', 'text', 'sourceStartMs', 'sourceEndMs',
  ])
    && atom.sourceAtomId === `source-atom-${String(index + 1).padStart(6, '0')}`
    && atom.ordinal === index + 1
    && typeof atom.text === 'string'
    && atom.text.length > 0
    && !/[\r\n]/u.test(atom.text)
    && nonnegative(atom.sourceStartMs)
    && positive(atom.sourceEndMs)
    && atom.sourceStartMs < atom.sourceEndMs
    && (index === 0 || value.atoms[index - 1].sourceStartMs <= atom.sourceStartMs));
}

const validateSourceMedia = value => exactKeys(value, [
  'sourceMediaId',
  'ordinal',
  'sourceRef',
  'mediaBinding',
  'sourceIdentityBinding',
  'sourceAtomTranscriptBinding',
])
  && value.sourceMediaId === 'source-media-000001'
  && value.ordinal === 1
  && SOURCE_REF.test(value.sourceRef)
  && validatePresentationAV002Layer1V3MediaBindingV001(value.mediaBinding)
  && validatePresentationAV002Layer1V3JsonBindingV001(value.sourceIdentityBinding)
  && validatePresentationAV002Layer1V3JsonBindingV001(value.sourceAtomTranscriptBinding)
  && value.sourceAtomTranscriptBinding.schemaVersion
    === PRESENTATION_A_V002_LAYER1_V3_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V001;

const validateOuterRange = (value, sourceMediaId) => exactKeys(value, [
  'sourceMediaId', 'sourceStartMs', 'sourceEndMs',
])
  && value.sourceMediaId === sourceMediaId
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const validateSourceAtom = (value, index, outerRange) => exactKeys(value, [
  'sourceAtomId', 'ordinal', 'text', 'sourceStartMs', 'sourceEndMs',
])
  && FORMAL_ID.test(value.sourceAtomId)
  && value.ordinal === index + 1
  && typeof value.text === 'string'
  && value.text.length > 0
  && !/[\r\n]/u.test(value.text)
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs
  && value.sourceStartMs >= outerRange.sourceStartMs
  && value.sourceEndMs <= outerRange.sourceEndMs;

const validateCaption = (value, sourceAtoms) => exactKeys(value, [
  'captionId', 'ordinal', 'text', 'sourceAtomIds',
])
  && FORMAL_ID.test(value.captionId)
  && value.ordinal === 1
  && typeof value.text === 'string'
  && value.text.length > 0
  && !/[\r\n]/u.test(value.text)
  && dense(value.sourceAtomIds)
  && same(value.sourceAtomIds, sourceAtoms.map(atom => atom.sourceAtomId))
  && value.text === sourceAtoms.map(atom => atom.text).join('');

export function validatePresentationAV002Layer1V3ProofInputV001(value) {
  if (!exactKeys(value, [
    'schemaVersion',
    'proofInputId',
    'sourceMedia',
    'outerRange',
    'caption',
    'sourceAtoms',
    'humanApprovalBinding',
  ])) return false;
  if (
    value.schemaVersion !== PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001
    || !FORMAL_ID.test(value.proofInputId)
    || !validateSourceMedia(value.sourceMedia)
    || !validateOuterRange(value.outerRange, value.sourceMedia.sourceMediaId)
    || !dense(value.sourceAtoms)
    || value.sourceAtoms.length === 0
    || new Set(value.sourceAtoms.map(atom => atom.sourceAtomId)).size !== value.sourceAtoms.length
    || !value.sourceAtoms.every((atom, index) => (
      validateSourceAtom(atom, index, value.outerRange)
      && (index === 0 || value.sourceAtoms[index - 1].sourceEndMs <= atom.sourceStartMs)
    ))
    || !validateCaption(value.caption, value.sourceAtoms)
    || !validatePresentationAV002Layer1V3JsonBindingV001(value.humanApprovalBinding)
    || value.humanApprovalBinding.schemaVersion
      !== PRESENTATION_A_V002_LAYER1_V3_HUMAN_APPROVAL_SCHEMA_V001
  ) return false;
  return true;
}

const validateLegacyPackage = value => isObject(value)
  && value.kind === 'layer1_v003_conservative_long_gap_pair_review_input'
  && value.version === 'layer1-v003-long-gap-pair-review-v001'
  && isObject(value.humanReview)
  && value.humanReview.itemCount === 3
  && dense(value.humanReview.selections)
  && value.humanReview.selections.length === 3;

const validateHumanResult = value => isObject(value)
  && value.kind === 'layer1_v003_conservative_long_gap_pair_review_result'
  && value.version === 'layer1-v003-long-gap-pair-review-result-v001'
  && value.reviewedBy === 'kawafmm'
  && dense(value.results)
  && value.results.length === 3
  && value.summary?.same === 3
  && value.summary?.seamIssuesReported === 0;

const validateSourceIdentity = value => isObject(value)
  && value.schemaVersion === 'presentation-material-source-identity-v001'
  && typeof value.videoId === 'string'
  && value.sourceRef === `youtube:${value.videoId}`
  && validatePresentationAV002Layer1V3MediaBindingV001(value.executionMedia);

const validateTranscript = value => isObject(value)
  && dense(value.segments)
  && positive(value.segmentCount)
  && value.segmentCount === value.segments.length;

const requiredBinding = (bindings, key, schemaVersion) => {
  const binding = bindings?.[key];
  if (!validatePresentationAV002Layer1V3JsonBindingV001(binding)) {
    throw new TypeError(`invalid ${key} binding`);
  }
  if (binding.schemaVersion !== schemaVersion) {
    throw new TypeError(`unexpected ${key} schema version`);
  }
  return structuredClone(binding);
};

const requireBoundValue = (value, binding, label) => {
  const formalSha = sha256PresentationAV002Layer1V3BytesV001(serializeFormal(value));
  const canonicalSha = canonicalSha256PresentationAV002Layer1V3JsonV001(value);
  if (formalSha !== binding.fileSha256 || canonicalSha !== binding.canonicalSha256) {
    throw new TypeError(`${label} bytes do not match their binding`);
  }
};

const safeProofId = candidateId => `layer1-v3-${candidateId.replace(/[^A-Za-z0-9._-]/gu, '-')}`;

const buildProofItem = ({
  selection,
  result,
  sourceIdentity,
  transcript,
  normalizedTranscript,
  bindings,
}) => {
  if (!isObject(selection) || !isObject(result) || selection.candidateId !== result.candidateId) {
    throw new TypeError('legacy proposal and human result are not one-to-one');
  }
  if (result.decision !== '差はない' || result.seamIssueReported !== false) {
    throw new TypeError('legacy proposal is not human-approved for removal');
  }
  if (
    !isObject(selection.outerRange)
    || selection.outerRange.sourceVideoId !== sourceIdentity.videoId
    || !nonnegative(selection.outerRange.startMs)
    || !positive(selection.outerRange.endMs)
    || selection.outerRange.startMs >= selection.outerRange.endMs
    || !dense(selection.cutDirectives)
    || selection.cutDirectives.length !== 1
  ) throw new TypeError('legacy proposal range is invalid');
  const cut = selection.cutDirectives[0];
  if (
    !isObject(cut)
    || !nonnegative(cut.startMs)
    || !positive(cut.endMs)
    || cut.startMs >= cut.endMs
    || cut.startMs <= selection.outerRange.startMs
    || cut.endMs >= selection.outerRange.endMs
  ) throw new TypeError('legacy removal interval is invalid');

  const selectedSegments = transcript.segments.flatMap((segment, index) => (
    isObject(segment)
    && segment.sourceVideoId === sourceIdentity.videoId
    && segment.startMs >= selection.outerRange.startMs
    && segment.endMs <= selection.outerRange.endMs
      ? [{segment, normalizedAtom: normalizedTranscript.atoms[index]}]
      : []
  ));
  if (selectedSegments.length === 0) throw new TypeError('legacy proposal has no source atoms');
  const text = selectedSegments.map(({segment}) => segment.text).join('');
  if (text !== selection.context?.text) {
    throw new TypeError('legacy proposal text does not match current source atoms');
  }
  if (
    selectedSegments[0].segment.startMs !== selection.outerRange.startMs
    || selectedSegments.at(-1).segment.endMs !== selection.outerRange.endMs
  ) throw new TypeError('source atoms do not close the legacy outer range');

  const sourceAtoms = selectedSegments.map(({segment, normalizedAtom}, index) => ({
    sourceAtomId: normalizedAtom.sourceAtomId,
    ordinal: index + 1,
    text: segment.text,
    sourceStartMs: segment.startMs,
    sourceEndMs: segment.endMs,
  }));
  const proofInput = {
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001,
    proofInputId: safeProofId(selection.candidateId),
    sourceMedia: {
      sourceMediaId: 'source-media-000001',
      ordinal: 1,
      sourceRef: sourceIdentity.sourceRef,
      mediaBinding: structuredClone(sourceIdentity.executionMedia),
      sourceIdentityBinding: structuredClone(bindings.sourceIdentity),
      sourceAtomTranscriptBinding: structuredClone(bindings.normalizedTranscript),
    },
    outerRange: {
      sourceMediaId: 'source-media-000001',
      sourceStartMs: selection.outerRange.startMs,
      sourceEndMs: selection.outerRange.endMs,
    },
    caption: {
      captionId: `${safeProofId(selection.candidateId)}-caption-000001`,
      ordinal: 1,
      text,
      sourceAtomIds: sourceAtoms.map(atom => atom.sourceAtomId),
    },
    sourceAtoms,
    humanApprovalBinding: structuredClone(bindings.humanResult),
  };
  if (!validatePresentationAV002Layer1V3ProofInputV001(proofInput)) {
    throw new TypeError('built proof input is invalid');
  }
  return Object.freeze({
    candidateId: selection.candidateId,
    proofInput: Object.freeze(proofInput),
    removalDecision: Object.freeze({
      decisionId: `${safeProofId(selection.candidateId)}-removal-000001`,
      verdict: 'remove',
      evidenceBinding: structuredClone(bindings.humanResult),
      sourceMediaId: 'source-media-000001',
      sourceStartMs: cut.startMs,
      sourceEndMs: cut.endMs,
    }),
  });
};

export function buildPresentationAV002Layer1V3FixturesV001({
  legacyPackage,
  humanResult,
  sourceIdentity,
  sourceAtomTranscript,
  sourceAtomTranscriptBytes,
  normalizedTranscriptPath,
  normalizedHumanApprovalPath,
  bindings,
}) {
  if (!validateLegacyPackage(legacyPackage)) throw new TypeError('legacy proposal is invalid');
  if (!validateHumanResult(humanResult)) throw new TypeError('human result is invalid');
  if (!validateSourceIdentity(sourceIdentity)) throw new TypeError('source identity is invalid');
  if (!validateTranscript(sourceAtomTranscript)) throw new TypeError('source atom transcript is invalid');

  if (
    !Buffer.isBuffer(sourceAtomTranscriptBytes)
    || !WORKSPACE_PATH.test(normalizedTranscriptPath)
    || !WORKSPACE_PATH.test(normalizedHumanApprovalPath)
    || normalizedTranscriptPath === bindings?.sourceTranscriptByteBinding?.path
    || normalizedHumanApprovalPath === bindings?.humanResult?.path
    || normalizedHumanApprovalPath === bindings?.legacyPackage?.path
    || normalizedHumanApprovalPath === normalizedTranscriptPath
  ) throw new TypeError('normalized transcript publication input is invalid');
  const sourceTranscriptByteBinding = structuredClone(bindings?.sourceTranscriptByteBinding);
  if (!validatePresentationAV002Layer1V3MediaBindingV001(sourceTranscriptByteBinding)) {
    throw new TypeError('invalid source transcript byte binding');
  }
  if (
    sha256PresentationAV002Layer1V3BytesV001(sourceAtomTranscriptBytes)
      !== sourceTranscriptByteBinding.fileSha256
  ) throw new TypeError('source atom transcript bytes do not match their binding');

  const normalizedTranscript = {
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V001,
    transcriptId: `layer1-v3-${sourceIdentity.videoId}-source-atoms-v001`,
    sourceRef: sourceIdentity.sourceRef,
    sourceTranscriptByteBinding,
    atoms: sourceAtomTranscript.segments.map((segment, index) => ({
      sourceAtomId: `source-atom-${String(index + 1).padStart(6, '0')}`,
      ordinal: index + 1,
      text: segment.text,
      sourceStartMs: segment.startMs,
      sourceEndMs: segment.endMs,
    })),
  };
  if (!validatePresentationAV002Layer1V3NormalizedTranscriptV001(normalizedTranscript)) {
    throw new TypeError('normalized source atom transcript is invalid');
  }
  const normalizedTranscriptBytes = serializeStrictFormal(normalizedTranscript);
  const normalizedTranscriptBinding = {
    schemaVersion: normalizedTranscript.schemaVersion,
    path: normalizedTranscriptPath,
    fileSha256: sha256PresentationAV002Layer1V3BytesV001(normalizedTranscriptBytes),
    canonicalSha256: sha256PresentationAV002Layer1V3BytesV001(
      canonicalizeStrict(normalizedTranscript),
    ),
  };

  const legacyPackageBinding = requiredBinding(
      bindings,
      'legacyPackage',
      PRESENTATION_A_V002_LAYER1_V3_PROPOSAL_SCHEMA_V001,
    );
  const legacyHumanResultBinding = requiredBinding(
      bindings,
      'humanResult',
      PRESENTATION_A_V002_LAYER1_V3_LEGACY_HUMAN_RESULT_SCHEMA_V001,
    );
  requireBoundValue(legacyPackage, legacyPackageBinding, 'legacy proposal');
  requireBoundValue(humanResult, legacyHumanResultBinding, 'legacy human result');
  const normalizedHumanApproval = buildPresentationANormalizedHumanApprovalV002({
    legacyProposal: legacyPackage,
    legacyHumanResult: humanResult,
    sourceProposalBinding: legacyPackageBinding,
    sourceHumanResultBinding: legacyHumanResultBinding,
  });
  if (!validatePresentationANormalizedHumanApprovalV002(normalizedHumanApproval)) {
    throw new TypeError('normalized human approval is invalid');
  }
  const normalizedHumanApprovalBytes = serializeStrictFormal(normalizedHumanApproval);
  const normalizedHumanApprovalBinding = {
    schemaVersion: normalizedHumanApproval.schemaVersion,
    path: normalizedHumanApprovalPath,
    fileSha256: sha256PresentationAV002Layer1V3BytesV001(normalizedHumanApprovalBytes),
    canonicalSha256: sha256PresentationAV002Layer1V3BytesV001(
      canonicalizeStrict(normalizedHumanApproval),
    ),
  };

  const normalizedBindings = {
    legacyPackage: legacyPackageBinding,
    legacyHumanResult: legacyHumanResultBinding,
    humanResult: normalizedHumanApprovalBinding,
    sourceIdentity: requiredBinding(
      bindings,
      'sourceIdentity',
      sourceIdentity.schemaVersion,
    ),
    normalizedTranscript: normalizedTranscriptBinding,
  };
  requireBoundValue(sourceIdentity, normalizedBindings.sourceIdentity, 'source identity');

  const resultByCandidate = new Map(humanResult.results.map(result => [result.candidateId, result]));
  if (resultByCandidate.size !== 3) throw new TypeError('human result candidate IDs are not unique');
  const fixtures = legacyPackage.humanReview.selections.map(selection => {
    const result = resultByCandidate.get(selection.candidateId);
    if (!result) throw new TypeError('legacy proposal has no matching human result');
    resultByCandidate.delete(selection.candidateId);
    return buildProofItem({
      selection,
      result,
      sourceIdentity,
      transcript: sourceAtomTranscript,
      normalizedTranscript,
      bindings: normalizedBindings,
    });
  });
  if (resultByCandidate.size !== 0) throw new TypeError('human result has an unmatched candidate');
  return Object.freeze({
    status: 'built',
    legacyProposalBinding: normalizedBindings.legacyPackage,
    legacyHumanResultBinding: normalizedBindings.legacyHumanResult,
    normalizedHumanApproval,
    normalizedHumanApprovalBytes,
    normalizedHumanApprovalBinding,
    sourceTranscriptByteBinding,
    normalizedTranscript,
    normalizedTranscriptBytes,
    normalizedTranscriptBinding,
    fixtures: Object.freeze(fixtures),
  });
}

export function inspectPresentationAV002Candidate59FeasibilityV001(value) {
  const observations = value?.candidate59Evidence?.observations;
  if (!dense(observations) || observations.length !== 6) {
    return {status: 'rejected', observationCount: 0, retainedAtomCount: 0};
  }
  const removals = observations.map(observation => ({
    startMs: observation.startMs,
    endMs: observation.endMs,
  })).sort((left, right) => left.startMs - right.startMs);
  if (removals.some((entry, index) => (
    !nonnegative(entry.startMs)
    || !positive(entry.endMs)
    || entry.startMs >= entry.endMs
    || (index > 0 && removals[index - 1].endMs > entry.startMs)
  ))) return {status: 'rejected', observationCount: observations.length, retainedAtomCount: 0};

  const atomMap = new Map();
  for (const observation of observations) {
    if (
      observation.durationMs !== observation.endMs - observation.startMs
      || observation.contractRelation !== 'partial-source-atom-intersection'
      || !dense(observation.overlappingAtoms)
      || observation.overlappingAtoms.length === 0
    ) return {status: 'rejected', observationCount: observations.length, retainedAtomCount: 0};
    for (const atom of observation.overlappingAtoms) atomMap.set(atom.atomId, atom);
  }
  let retainedAtomCount = 0;
  for (const atom of atomMap.values()) {
    const covered = removals
      .filter(removal => removal.startMs < atom.endMs && atom.startMs < removal.endMs)
      .reduce((sum, removal) => (
        sum + Math.max(0, Math.min(atom.endMs, removal.endMs) - Math.max(atom.startMs, removal.startMs))
      ), 0);
    if (covered >= atom.endMs - atom.startMs) {
      return {status: 'rejected', observationCount: observations.length, retainedAtomCount};
    }
    retainedAtomCount += 1;
  }
  return {status: 'passed', observationCount: 6, retainedAtomCount};
}
