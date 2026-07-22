import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES,
  PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001,
  PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES,
  buildPresentationSegmenterBoundaryEvidenceV001,
  checkPresentationSegmenterBoundaryPreflightV001,
} from './presentation_segmenter_boundary_evidence_v001.mjs';
import {
  canonicalJsonV001,
  PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES,
  PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES,
  PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES,
  PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL,
  serializeJsonFileV001,
  sha256BytesV001,
  sha256CanonicalV001,
} from './presentation_retained_source_atoms_v001.mjs';
import {
  createPresentationSegmenterBoundaryProductionFilesystemAdapterV001,
  runPresentationSegmenterBoundaryPreflightCliV001,
  runPresentationSegmenterBoundaryPreflightV001,
  validatePresentationSegmenterBoundaryPreflightReportV001,
} from './run_presentation_segmenter_boundary_preflight_v001.mjs';

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(TEST_DIRECTORY, '../..');
const toWorkspacePath = (absolutePath) => path.relative(WORKSPACE_ROOT, absolutePath)
  .split(path.sep)
  .join('/');

const EXPECTED_CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'sourceContract',
  'segmentation',
  'coverage',
  'expectedProjection',
  'determinism',
  'readOnlyPreflight',
]);

const EXPECTED_VIOLATION_CODES = Object.freeze([
  'SEGMENTER_BOUNDARY_JOB_INVALID',
  'SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH',
  'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH',
  'SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE',
  'SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH',
  'SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED',
  'SEGMENTER_BOUNDARY_SOURCE_VALIDATION_NOT_PASSED',
  'SEGMENTER_BOUNDARY_SOURCE_BINDING_MISMATCH',
  'SEGMENTER_BOUNDARY_RUNTIME_MISMATCH',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_TIME_REVERSED',
  'SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID',
  'SEGMENTER_BOUNDARY_SPEECH_MEMBERSHIP_INVALID',
  'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID',
  'SEGMENTER_BOUNDARY_EVIDENCE_BINDING_MISMATCH',
  'SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID',
  'SEGMENTER_BOUNDARY_SPLITS_SOURCE_ATOM',
  'SEGMENTER_BOUNDARY_CANDIDATE_EMPTY',
  'SEGMENTER_BOUNDARY_CONTAINER_ID_INVALID',
  'SEGMENTER_BOUNDARY_CANDIDATE_ID_INVALID',
  'SEGMENTER_BOUNDARY_CANDIDATE_ID_DUPLICATE',
  'SEGMENTER_BOUNDARY_CANDIDATE_NONCONTIGUOUS',
  'SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SEGMENT',
  'SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SPEECH',
  'SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH',
  'SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_MISSING',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATED',
  'SEGMENTER_BOUNDARY_SOURCE_ATOM_ORDER_REVERSED',
  'SEGMENTER_BOUNDARY_EXPECTED_PROJECTION_MISMATCH',
  'SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH',
  'SEGMENTER_BOUNDARY_NONDETERMINISTIC',
  'SEGMENTER_BOUNDARY_READ_ONLY_CONTRACT_VIOLATED',
  'SEGMENTER_BOUNDARY_BUILD_FAILED',
]);

const EXPECTED_CHECK_BY_CODE = Object.freeze(Object.fromEntries([
  ['jobBinding', EXPECTED_VIOLATION_CODES.slice(0, 2)],
  ['implementationBinding', EXPECTED_VIOLATION_CODES.slice(2, 3)],
  ['inputBinding', EXPECTED_VIOLATION_CODES.slice(3, 8)],
  ['runtimeBinding', EXPECTED_VIOLATION_CODES.slice(8, 9)],
  ['sourceContract', EXPECTED_VIOLATION_CODES.slice(9, 14)],
  ['segmentation', [
    ...EXPECTED_VIOLATION_CODES.slice(14, 27),
    EXPECTED_VIOLATION_CODES[31],
    EXPECTED_VIOLATION_CODES[34],
  ]],
  ['coverage', EXPECTED_VIOLATION_CODES.slice(27, 30)],
  ['expectedProjection', EXPECTED_VIOLATION_CODES.slice(30, 31)],
  ['determinism', EXPECTED_VIOLATION_CODES.slice(32, 33)],
  ['readOnlyPreflight', EXPECTED_VIOLATION_CODES.slice(33, 34)],
].flatMap(([check, codes]) => codes.map((code) => [code, check]))));

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const clone = (value) => structuredClone(value);
const serializeEvidence = (value) => `${JSON.stringify(value, null, 2)}\n`;

const makeRuntimeBinding = () => ({
  nodeBinarySha256: '1'.repeat(64),
  nodeVersion: process.version,
  icuVersion: process.versions.icu,
  resolvedLocale: 'ja',
  resolvedGranularity: 'word',
  diagnostics: {
    resolvedNodePath: process.execPath,
    platform: process.platform,
    arch: process.arch,
    v8Version: process.versions.v8,
    unicodeVersion: process.versions.unicode,
    cldrVersion: process.versions.cldr,
  },
});

const makeActualRuntimeBinding = async () => {
  const nodeBytes = await readFile(process.execPath);
  const resolved = new Intl.Segmenter('ja', {granularity: 'word'}).resolvedOptions();
  return {
    nodeBinarySha256: sha256(nodeBytes),
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: resolved.locale,
    resolvedGranularity: resolved.granularity,
    diagnostics: {
      resolvedNodePath: process.execPath,
      platform: process.platform,
      arch: process.arch,
      v8Version: process.versions.v8,
      unicodeVersion: process.versions.unicode,
      cldrVersion: process.versions.cldr,
    },
  };
};

const makeOpaqueIdSourceArtifact = () => {
  const rawSourceAtoms = [
    {
      atomId: 'alpha',
      speechId: 41,
      speaker: 'speaker-a',
      text: '大',
      startMs: 100,
      endMs: 150,
      sourceRef: 'synthetic:opaque-id-order',
    },
    {
      atomId: 'punctuation-id',
      speechId: 41,
      speaker: 'speaker-b',
      text: '型',
      startMs: 140,
      endMs: 200,
      sourceRef: 'synthetic:opaque-id-order',
    },
    {
      atomId: 'emoji-id',
      speechId: 42,
      speaker: null,
      text: '😀',
      startMs: 210,
      endMs: 250,
      sourceRef: 'synthetic:opaque-id-order',
    },
    {
      atomId: 'combining-id',
      speechId: 41,
      text: 'é',
      startMs: 260,
      endMs: 320,
      sourceRef: 'synthetic:opaque-id-order',
    },
  ];
  const atomIds = rawSourceAtoms.map(({atomId}) => atomId);
  return {
    schemaVersion: 'presentation-retained-source-atoms-v001',
    artifactId: 'synthetic-opaque-id-source-v001',
    extractorVersion: 'presentation-retained-source-atoms-extractor-v001',
    sourceRef: 'synthetic:opaque-id-order',
    sourceProvenance: 'synthetic-test-only',
    atomGranularity: 'character-timestamp',
    atomProvenance: {
      sttManifest: {path: 'synthetic/stt.json', fileSha256: '2'.repeat(64)},
      transcript: {path: 'synthetic/transcript.json', fileSha256: '3'.repeat(64)},
      wordTimestamps: {path: 'synthetic/words.json', fileSha256: '4'.repeat(64)},
      candidateManifest: {path: 'synthetic/candidate.json', fileSha256: '5'.repeat(64)},
    },
    selection: {
      policyVersion: 'presentation-retained-source-atom-selection-v001',
      candidateId: 807,
      assemblyDecisionId: 'synthetic-assembly-v001',
      assemblyDecisionPayloadSha256: '6'.repeat(64),
      formalizationId: 'synthetic-formalization-v001',
      timelineId: 'synthetic-timeline-v001',
      timelineFileSha256: '7'.repeat(64),
      baseMediaArtifactId: 'synthetic-base-media-v001',
      baseMediaFileSha256: '8'.repeat(64),
      intervalSemantics: 'half-open',
      segments: [{
        timelineSegmentId: 'opaque-segment',
        sourceStartMs: 100,
        sourceEndMs: 320,
        outputStartFrame: 0,
        outputEndFrame: 132,
        atomIds,
        atomIdsCanonicalSha256: sha256CanonicalV001(atomIds),
        atomCount: atomIds.length,
      }],
    },
    rawSourceAtomsCanonicalSha256: sha256CanonicalV001(rawSourceAtoms),
    rawSourceAtoms,
  };
};

const makeSourceSnapshot = (sourceArtifact) => ({
  path: 'evals/clip_composition/outputs/presentation/retained-source-atoms/synthetic/source-atoms.json',
  fileSha256: sha256BytesV001(serializeJsonFileV001(sourceArtifact)),
});

const DIRECT_INPUT_SCHEMAS = Object.freeze({
  sourceIdentity: 'presentation-real-data-source-identity-v001',
  candidateManifest: 'presentation-internal-trim-review-candidate-manifest-v001',
  assemblyDecision: 'presentation-base-media-assembly-decision-v001',
  formalizationReceipt: 'presentation-first-real-data-assembly-formalization-receipt-v001',
  timeline: 'presentation-base-media-timeline-v002',
  baseMediaGenerationManifest: 'presentation-base-media-generation-manifest-v002',
  baseMediaValidationReport: 'presentation-base-media-validation-report-v001',
});

const EXPANDED_INPUT_SCHEMAS = Object.freeze({
  sttManifest: 'clip_composition_local_stt_chunked_manifest',
  transcript: 'transcript_json',
  wordTimestamps: 'clip_composition_word_timestamps',
  mediaEquivalence: 'presentation-source-media-equivalence-v001',
  trustedArtifactSummary: 'presentation-first-real-data-artifact-build-summary-v001',
  basisEditPlan: 'presentation-real-data-basis-edit-plan-v001',
  baseMedia: null,
});

const makeReference = (role, schemaVersion) => ({
  role,
  path: `synthetic/upstream/${role}.json`,
  fileSha256: sha256(`synthetic:${role}`),
  schemaVersion,
});

const makeRetainedSourceChecks = () => Object.fromEntries(
  PRESENTATION_RETAINED_SOURCE_ATOMS_CHECK_NAMES.map((name) => [
    name,
    {status: 'passed', violationCodes: []},
  ]),
);

const makePublishedSourceBundle = () => {
  const sourceRef = 'synthetic:checker-contract';
  const rawSourceAtoms = [
    {atomId: 'word-101', speechId: 1, speaker: 'speaker-a', text: '大', startMs: 100, endMs: 160, sourceRef},
    {atomId: 'word-102', speechId: 1, speaker: 'speaker-b', text: '型', startMs: 150, endMs: 210, sourceRef},
    {atomId: 'word-103', speechId: 2, speaker: null, text: '、', startMs: 220, endMs: 240, sourceRef},
    {atomId: 'word-104', speechId: 1, speaker: 'speaker-a', text: '犬', startMs: 240, endMs: 320, sourceRef},
    {atomId: 'word-105', speechId: 3, text: ' ', startMs: 400, endMs: 410, sourceRef},
    {atomId: 'word-106', speechId: 4, speaker: 'speaker-a', text: '😀', startMs: 420, endMs: 480, sourceRef},
    {atomId: 'word-107', speechId: 5, speaker: 'speaker-a', text: 'é', startMs: 490, endMs: 550, sourceRef},
  ];
  const segmentOneIds = rawSourceAtoms.slice(0, 4).map(({atomId}) => atomId);
  const segmentTwoIds = rawSourceAtoms.slice(4).map(({atomId}) => atomId);
  const sourceAtoms = {
    schemaVersion: 'presentation-retained-source-atoms-v001',
    artifactId: 'synthetic-retained-source-atoms-v001',
    extractorVersion: 'presentation-retained-source-atoms-extractor-v001',
    sourceRef,
    sourceProvenance: 'synthetic-published-bundle-v001',
    atomGranularity: 'character-timestamp',
    atomProvenance: {
      sttManifest: {path: 'synthetic/stt-manifest.json', fileSha256: '1'.repeat(64)},
      transcript: {path: 'synthetic/transcript.json', fileSha256: '2'.repeat(64)},
      wordTimestamps: {path: 'synthetic/word-timestamps.json', fileSha256: '3'.repeat(64)},
      candidateManifest: {path: 'synthetic/candidate-manifest.json', fileSha256: '4'.repeat(64)},
    },
    selection: {
      policyVersion: 'presentation-retained-source-atom-selection-v001',
      candidateId: 908,
      assemblyDecisionId: 'synthetic-assembly-decision-v001',
      assemblyDecisionPayloadSha256: '5'.repeat(64),
      formalizationId: 'synthetic-formalization-v001',
      timelineId: 'synthetic-timeline-v001',
      timelineFileSha256: '6'.repeat(64),
      baseMediaArtifactId: 'synthetic-base-media-v001',
      baseMediaFileSha256: '7'.repeat(64),
      intervalSemantics: 'half-open',
      segments: [
        {
          timelineSegmentId: 'synthetic-segment-alpha',
          sourceStartMs: 100,
          sourceEndMs: 320,
          outputStartFrame: 0,
          outputEndFrame: 220,
          atomIds: segmentOneIds,
          atomIdsCanonicalSha256: sha256CanonicalV001(segmentOneIds),
          atomCount: segmentOneIds.length,
        },
        {
          timelineSegmentId: 'synthetic-segment-beta',
          sourceStartMs: 400,
          sourceEndMs: 550,
          outputStartFrame: 220,
          outputEndFrame: 370,
          atomIds: segmentTwoIds,
          atomIdsCanonicalSha256: sha256CanonicalV001(segmentTwoIds),
          atomCount: segmentTwoIds.length,
        },
      ],
    },
    rawSourceAtomsCanonicalSha256: sha256CanonicalV001(rawSourceAtoms),
    rawSourceAtoms,
  };

  const directInputs = PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES.map(
    (role) => makeReference(role, DIRECT_INPUT_SCHEMAS[role]),
  );
  const expandedInputs = PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES.map(
    (role) => makeReference(role, EXPANDED_INPUT_SCHEMAS[role]),
  );
  const sourceBytes = serializeJsonFileV001(sourceAtoms);
  const generationManifest = {
    schemaVersion: 'presentation-retained-source-atoms-generation-manifest-v001',
    generatorVersion: 'presentation-retained-source-atoms-extractor-v001',
    job: {
      jobId: 'synthetic-retained-source-job-v001',
      path: 'synthetic/job.json',
      fileSha256: '8'.repeat(64),
    },
    implementation: {
      approvedGitCommit: '9'.repeat(40),
      files: [
        {
          role: 'core',
          path: 'synthetic/core.mjs',
          expectedFileSha256: 'a'.repeat(64),
          actualFileSha256: 'a'.repeat(64),
        },
        {
          role: 'runner',
          path: 'synthetic/runner.mjs',
          expectedFileSha256: 'b'.repeat(64),
          actualFileSha256: 'b'.repeat(64),
        },
      ],
      runtime: {
        resolvedNodePath: process.execPath,
        nodeFileSha256: 'c'.repeat(64),
        nodeVersion: process.version,
        bindingRole: 'diagnostic-not-pass-fail',
      },
    },
    directInputs,
    expandedInputs,
    source: {
      sourceRef,
      sourceProvenance: sourceAtoms.sourceProvenance,
      atomGranularity: 'character-timestamp',
    },
    selection: {
      policyVersion: 'presentation-retained-source-atom-selection-v001',
      candidateId: sourceAtoms.selection.candidateId,
      assemblyDecisionId: sourceAtoms.selection.assemblyDecisionId,
      assemblyDecisionPayloadSha256: sourceAtoms.selection.assemblyDecisionPayloadSha256,
      timelineId: sourceAtoms.selection.timelineId,
      intervalSemantics: 'half-open',
      segments: sourceAtoms.selection.segments.map((segment) => ({
        timelineSegmentId: segment.timelineSegmentId,
        sourceStartMs: segment.sourceStartMs,
        sourceEndMs: segment.sourceEndMs,
        atomCount: segment.atomCount,
        firstAtomId: segment.atomIds[0],
        lastAtomId: segment.atomIds.at(-1),
        atomIdsCanonicalSha256: segment.atomIdsCanonicalSha256,
      })),
    },
    observations: {
      counts: {
        sttAtomCount: rawSourceAtoms.length,
        candidateOuterRangeAtomCount: rawSourceAtoms.length,
        retainedAtomCount: rawSourceAtoms.length,
        excludedByAssemblyCount: 0,
        boundaryPartialOverlapCount: 0,
      },
      speechGroups: [
        {speechId: 1, atomCount: 3, firstAtomId: 'word-101', lastAtomId: 'word-104'},
        {speechId: 2, atomCount: 1, firstAtomId: 'word-103', lastAtomId: 'word-103'},
        {speechId: 3, atomCount: 1, firstAtomId: 'word-105', lastAtomId: 'word-105'},
        {speechId: 4, atomCount: 1, firstAtomId: 'word-106', lastAtomId: 'word-106'},
        {speechId: 5, atomCount: 1, firstAtomId: 'word-107', lastAtomId: 'word-107'},
      ],
      sourceAtomPositiveOverlaps: [{
        leftAtomId: 'word-101',
        rightAtomId: 'word-102',
        overlapStartMs: 150,
        overlapEndMs: 160,
      }],
    },
    output: {
      artifactId: sourceAtoms.artifactId,
      path: 'source-atoms.json',
      fileSha256: sha256BytesV001(sourceBytes),
      canonicalSha256: sha256CanonicalV001(sourceAtoms),
      rawSourceAtomsCanonicalSha256: sourceAtoms.rawSourceAtomsCanonicalSha256,
    },
  };
  const manifestBytes = serializeJsonFileV001(generationManifest);
  const validationReport = {
    schemaVersion: 'presentation-retained-source-atoms-validation-report-v001',
    artifactId: sourceAtoms.artifactId,
    status: 'passed',
    violations: [],
    job: {
      path: generationManifest.job.path,
      fileSha256: generationManifest.job.fileSha256,
    },
    inputs: [...directInputs, ...expandedInputs].map(({role, path: inputPath, fileSha256}) => ({
      role,
      path: inputPath,
      fileSha256,
    })),
    outputs: {
      sourceAtoms: {
        artifactId: sourceAtoms.artifactId,
        path: 'source-atoms.json',
        fileSha256: sha256BytesV001(sourceBytes),
        canonicalSha256: sha256CanonicalV001(sourceAtoms),
      },
      generationManifest: {
        path: 'generation-manifest.json',
        fileSha256: sha256BytesV001(manifestBytes),
        canonicalSha256: sha256CanonicalV001(generationManifest),
      },
    },
    checks: makeRetainedSourceChecks(),
  };
  return {sourceAtoms, generationManifest, validationReport};
};

const countPositiveOverlaps = (atoms) => {
  let count = 0;
  for (let leftIndex = 0; leftIndex < atoms.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < atoms.length; rightIndex += 1) {
      const left = atoms[leftIndex];
      const right = atoms[rightIndex];
      if (Math.max(left.startMs, right.startMs) < Math.min(left.endMs, right.endMs)) count += 1;
    }
  }
  return count;
};

const exactSpeakerSetKey = (values) => [...values]
  .sort((left, right) => {
    const leftValue = canonicalJsonV001(left);
    const rightValue = canonicalJsonV001(right);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  })
  .map((value) => canonicalJsonV001(value))
  .join('\u0000');

const makeExpectedProjection = (sourceArtifact, evidence, queryValues = [
  ['speaker-a', 'speaker-b'],
  [null],
]) => {
  const atomById = new Map(sourceArtifact.rawSourceAtoms.map((atom) => [atom.atomId, atom]));
  const segmentByAtomId = new Map();
  for (const segment of sourceArtifact.selection.segments) {
    segment.atomIds.forEach((atomId) => segmentByAtomId.set(atomId, segment.timelineSegmentId));
  }
  const candidateSpeakerSets = evidence.boundaryCandidates.map((candidate) => {
    const values = [];
    for (const atomId of candidate.sourceAtomIds) {
      const atom = atomById.get(atomId);
      const value = Object.prototype.hasOwnProperty.call(atom, 'speaker') ? atom.speaker : null;
      if (!values.some((entry) => Object.is(entry, value))) values.push(value);
    }
    return values;
  });
  const containers = [];
  for (const candidate of evidence.boundaryCandidates) {
    let container = containers.find(({containerId}) => containerId === candidate.containerId);
    if (!container) {
      container = {
        containerId: candidate.containerId,
        timelineSegmentId: candidate.timelineSegmentId,
        speechId: candidate.speechId,
        sourceAtomIds: [],
        boundaryCandidateCount: 0,
      };
      containers.push(container);
    }
    container.boundaryCandidateCount += 1;
    for (const atomId of candidate.sourceAtomIds) {
      if (!container.sourceAtomIds.includes(atomId)) container.sourceAtomIds.push(atomId);
    }
  }
  return {
    sourceAtomCount: sourceArtifact.rawSourceAtoms.length,
    containerCount: containers.length,
    boundaryCandidateCount: evidence.boundaryCandidates.length,
    wordLikeCandidateCount: evidence.boundaryCandidates.filter(({isWordLike}) => isWordLike).length,
    nonWordLikeCandidateCount: evidence.boundaryCandidates.filter(({isWordLike}) => !isWordLike).length,
    timelineSegments: sourceArtifact.selection.segments.map((segment) => ({
      timelineSegmentId: segment.timelineSegmentId,
      sourceAtomCount: segment.atomIds.length,
      boundaryCandidateCount: evidence.boundaryCandidates.filter((candidate) =>
        candidate.timelineSegmentId === segment.timelineSegmentId).length,
    })),
    containers: containers.map(({sourceAtomIds, ...container}) => ({
      ...container,
      sourceAtomCount: sourceAtomIds.length,
    })),
    mixedRawSpeakerCandidateCount: candidateSpeakerSets.filter((values) => values.length >= 2).length,
    rawSpeakerExactSetQueryResults: queryValues.map((values) => ({
      values,
      boundaryCandidateCount: candidateSpeakerSets.filter((candidateValues) =>
        exactSpeakerSetKey(candidateValues) === exactSpeakerSetKey(values)).length,
    })),
    sourcePositiveOverlapCount: countPositiveOverlaps(sourceArtifact.rawSourceAtoms),
    membership: {
      missingCount: 0,
      duplicatedCount: 0,
      orderReversedCount: 0,
      crossSegmentCount: evidence.boundaryCandidates.filter((candidate) =>
        new Set(candidate.sourceAtomIds.map((atomId) => segmentByAtomId.get(atomId))).size > 1).length,
      crossSpeechCount: evidence.boundaryCandidates.filter((candidate) =>
        new Set(candidate.sourceAtomIds.map((atomId) => atomById.get(atomId).speechId)).size > 1).length,
    },
  };
};

const makeValidCheckerContext = () => {
  const bundle = makePublishedSourceBundle();
  const runtimeBinding = makeRuntimeBinding();
  const inputDirectory =
    'evals/clip_composition/outputs/presentation/retained-source-atoms/synthetic-checker-v001';
  const inputRecords = [
    {role: 'sourceAtoms', basename: 'source-atoms.json', document: bundle.sourceAtoms},
    {
      role: 'sourceGenerationManifest',
      basename: 'generation-manifest.json',
      document: bundle.generationManifest,
    },
    {
      role: 'sourceValidationReport',
      basename: 'validation-report.json',
      document: bundle.validationReport,
    },
  ].map((entry) => {
    const fileSha256 = sha256BytesV001(serializeJsonFileV001(entry.document));
    return {
      ...entry,
      path: `${inputDirectory}/${entry.basename}`,
      fileSha256,
    };
  });
  const artifactId = 'synthetic-segmenter-boundary-v001';
  const sourceArtifactSnapshot = {
    path: inputRecords[0].path,
    fileSha256: inputRecords[0].fileSha256,
  };
  const firstEvidence = buildPresentationSegmenterBoundaryEvidenceV001({
    artifactId,
    sourceArtifact: bundle.sourceAtoms,
    sourceArtifactSnapshot,
    runtimeBinding,
  });
  const secondEvidence = buildPresentationSegmenterBoundaryEvidenceV001({
    artifactId,
    sourceArtifact: clone(bundle.sourceAtoms),
    sourceArtifactSnapshot: clone(sourceArtifactSnapshot),
    runtimeBinding: clone(runtimeBinding),
  });
  const implementationFiles = [
    {
      role: 'core',
      path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
      fileSha256: 'a'.repeat(64),
      loadedModuleUrl: PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001.core,
    },
    {
      role: 'retainedSourceAtomsCore',
      path: 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs',
      fileSha256: 'b'.repeat(64),
      loadedModuleUrl: PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001.retainedSourceAtomsCore,
    },
    {
      role: 'runner',
      path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
      fileSha256: 'c'.repeat(64),
      loadedModuleUrl: new URL(
        './run_presentation_segmenter_boundary_preflight_v001.mjs',
        import.meta.url,
      ).href,
    },
  ];
  const expectedProjection = makeExpectedProjection(bundle.sourceAtoms, firstEvidence);
  const jobValue = {
    schemaVersion: 'presentation-segmenter-boundary-preflight-job-v001',
    jobId: 'synthetic-segmenter-boundary-job-v001',
    artifactId,
    mode: 'read-only-preflight',
    implementationBinding: {
      gitCommit: 'd'.repeat(40),
      files: implementationFiles.map(({role, path: implementationPath, fileSha256}) => ({
        role,
        path: implementationPath,
        fileSha256,
      })),
    },
    inputs: inputRecords.map(({role, path: inputPath, fileSha256}) => ({
      role,
      path: inputPath,
      fileSha256,
    })),
    expectedSourceBinding: {
      sourceArtifactCanonicalSha256: sha256CanonicalV001(bundle.sourceAtoms),
      rawSourceAtomsCanonicalSha256: bundle.sourceAtoms.rawSourceAtomsCanonicalSha256,
    },
    expectedRuntime: {
      nodeBinarySha256: runtimeBinding.nodeBinarySha256,
      nodeVersion: runtimeBinding.nodeVersion,
      icuVersion: runtimeBinding.icuVersion,
      resolvedLocale: runtimeBinding.resolvedLocale,
      resolvedGranularity: runtimeBinding.resolvedGranularity,
    },
    expectedProjection,
    readOnlyGuard: {
      formalOutputPath:
        `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/${artifactId}`,
      expectedState: 'absent',
    },
  };
  const jobHash = sha256BytesV001(serializeJsonFileV001(jobValue));
  const entryHash = sha256CanonicalV001([]);
  return {
    jobValue,
    jobSnapshot: {
      path:
        'evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/synthetic/job.json',
      firstFileSha256: jobHash,
      secondFileSha256: jobHash,
      issues: [],
    },
    observedImplementationBinding: {
      files: implementationFiles.map(({fileSha256, ...file}) => ({
        ...file,
        firstFileSha256: fileSha256,
        secondFileSha256: fileSha256,
        issues: [],
      })),
    },
    inputSnapshots: inputRecords.map(({basename: _basename, fileSha256, ...entry}) => ({
      role: entry.role,
      path: entry.path,
      firstFileSha256: fileSha256,
      secondFileSha256: fileSha256,
      document: entry.document,
      issues: [],
    })),
    runtimeBinding,
    evidencePasses: [firstEvidence, secondEvidence],
    buildFailure: null,
    readOnlyGuard: {
      formalOutputPath: jobValue.readOnlyGuard.formalOutputPath,
      watchedAncestorPath:
        'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence',
      before: {
        formalPathState: 'absent',
        entryCount: 0,
        entriesCanonicalSha256: entryHash,
      },
      after: {
        formalPathState: 'absent',
        entryCount: 0,
        entriesCanonicalSha256: entryHash,
      },
    },
    productionMode: false,
  };
};

const collectCodes = (report) => report.violations.map(({code}) => code);
const checkByName = (report, name) => report.checks.find((entry) => entry.name === name);

const rehashEvidence = (evidence) => {
  evidence.boundaryCandidatesCanonicalSha256 = sha256CanonicalV001(evidence.boundaryCandidates);
  evidence.sourceAtomMembershipCanonicalSha256 = sha256CanonicalV001(
    evidence.boundaryCandidates
      .filter((candidate) => candidate !== null && typeof candidate === 'object'
        && typeof candidate.boundaryCandidateId === 'string'
        && Array.isArray(candidate.sourceAtomIds))
      .map(({boundaryCandidateId, sourceAtomIds}) => ({boundaryCandidateId, sourceAtomIds})),
  );
};

const mutateBothEvidencePasses = (context, mutation, {rehash = true} = {}) => {
  context.evidencePasses.forEach((evidence, passIndex) => {
    mutation(evidence, passIndex);
    if (rehash) rehashEvidence(evidence);
  });
};

const refreshPublishedBindings = (context) => {
  const source = context.inputSnapshots[0].document;
  const manifest = context.inputSnapshots[1].document;
  const report = context.inputSnapshots[2].document;
  source.rawSourceAtomsCanonicalSha256 = sha256CanonicalV001(source.rawSourceAtoms);
  for (const segment of source.selection.segments) {
    segment.atomCount = segment.atomIds.length;
    segment.atomIdsCanonicalSha256 = sha256CanonicalV001(segment.atomIds);
  }
  manifest.source = {
    sourceRef: source.sourceRef,
    sourceProvenance: source.sourceProvenance,
    atomGranularity: source.atomGranularity,
  };
  manifest.selection = {
    policyVersion: 'presentation-retained-source-atom-selection-v001',
    candidateId: source.selection.candidateId,
    assemblyDecisionId: source.selection.assemblyDecisionId,
    assemblyDecisionPayloadSha256: source.selection.assemblyDecisionPayloadSha256,
    timelineId: source.selection.timelineId,
    intervalSemantics: 'half-open',
    segments: source.selection.segments.map((segment) => ({
      timelineSegmentId: segment.timelineSegmentId,
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      atomCount: segment.atomCount,
      firstAtomId: segment.atomIds[0] ?? null,
      lastAtomId: segment.atomIds.at(-1) ?? null,
      atomIdsCanonicalSha256: segment.atomIdsCanonicalSha256,
    })),
  };
  manifest.observations.counts.retainedAtomCount = source.rawSourceAtoms.length;
  const sourceBytes = serializeJsonFileV001(source);
  manifest.output = {
    artifactId: source.artifactId,
    path: 'source-atoms.json',
    fileSha256: sha256BytesV001(sourceBytes),
    canonicalSha256: sha256CanonicalV001(source),
    rawSourceAtomsCanonicalSha256: source.rawSourceAtomsCanonicalSha256,
  };
  const manifestBytes = serializeJsonFileV001(manifest);
  report.artifactId = source.artifactId;
  report.outputs.sourceAtoms = {
    artifactId: source.artifactId,
    path: 'source-atoms.json',
    fileSha256: sha256BytesV001(sourceBytes),
    canonicalSha256: sha256CanonicalV001(source),
  };
  report.outputs.generationManifest = {
    path: 'generation-manifest.json',
    fileSha256: sha256BytesV001(manifestBytes),
    canonicalSha256: sha256CanonicalV001(manifest),
  };

  const documents = [source, manifest, report];
  documents.forEach((document, index) => {
    const fileSha256 = sha256BytesV001(serializeJsonFileV001(document));
    context.inputSnapshots[index].firstFileSha256 = fileSha256;
    context.inputSnapshots[index].secondFileSha256 = fileSha256;
    context.jobValue.inputs[index].fileSha256 = fileSha256;
  });
  context.jobValue.expectedSourceBinding = {
    sourceArtifactCanonicalSha256: sha256CanonicalV001(source),
    rawSourceAtomsCanonicalSha256: source.rawSourceAtomsCanonicalSha256,
  };
  const jobHash = sha256BytesV001(serializeJsonFileV001(context.jobValue));
  context.jobSnapshot.firstFileSha256 = jobHash;
  context.jobSnapshot.secondFileSha256 = jobHash;
};

const refreshEvidenceBinding = (context) => {
  const source = context.inputSnapshots[0].document;
  const snapshot = context.inputSnapshots[0];
  for (const evidence of context.evidencePasses) {
    if (evidence === null) continue;
    evidence.sourceBinding = {
      sourceArtifactId: source.artifactId,
      sourceArtifactPath: snapshot.path,
      sourceArtifactFileSha256: snapshot.firstFileSha256,
      sourceArtifactCanonicalSha256: sha256CanonicalV001(source),
      sourceRef: source.sourceRef,
      sourceProvenance: source.sourceProvenance,
      atomGranularity: source.atomGranularity,
      rawSourceAtomsCanonicalSha256: source.rawSourceAtomsCanonicalSha256,
    };
    evidence.runtimeBinding = clone(context.runtimeBinding);
    rehashEvidence(evidence);
  }
};

const compareUtf16 = (left, right) => left < right ? -1 : left > right ? 1 : 0;

const assertCheckReportInvariants = (report) => {
  assert.deepEqual(Object.keys(report), [
    'schemaVersion', 'status', 'artifactId', 'checks', 'observedProjection', 'violations',
  ]);
  assert.deepEqual(report.checks.map(({name}) => name), EXPECTED_CHECK_NAMES);
  for (const check of report.checks) {
    assert.deepEqual(Object.keys(check), ['name', 'status', 'violationCodes']);
    assert.equal(new Set(check.violationCodes).size, check.violationCodes.length);
    const expected = EXPECTED_VIOLATION_CODES.filter((code) =>
      EXPECTED_CHECK_BY_CODE[code] === check.name
      && report.violations.some((violation) => violation.code === code));
    assert.deepEqual(check.violationCodes, expected);
  }
  for (const violation of report.violations) {
    assert.deepEqual(Object.keys(violation), ['code', 'path', 'details']);
    assert.equal(EXPECTED_VIOLATION_CODES.includes(violation.code), true);
    assert.equal(typeof violation.path, 'string');
    assert.equal(violation.path.startsWith('$'), true);
    assert.deepEqual(violation.details, {});
  }
  const sorted = [...report.violations].sort((left, right) => {
    const codeOrder = EXPECTED_VIOLATION_CODES.indexOf(left.code)
      - EXPECTED_VIOLATION_CODES.indexOf(right.code);
    return codeOrder || compareUtf16(left.path, right.path);
  });
  assert.deepEqual(report.violations, sorted);
  assert.equal(
    report.status === 'passed',
    report.checks.every(({status}) => status === 'passed'),
  );
};

const assertTargetCode = (targetCode, context, observedCodes) => {
  const report = checkPresentationSegmenterBoundaryPreflightV001(context);
  assertCheckReportInvariants(report);
  const codes = collectCodes(report);
  assert.equal(codes.includes(targetCode), true, `${targetCode} was not emitted`);
  codes.forEach((code) => observedCodes.add(code));
  return report;
};

const pathExists = async (absolutePath) => {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

const makeRunnerFixture = async () => {
  const retainedRoot = path.join(
    WORKSPACE_ROOT,
    'evals/clip_composition/outputs/presentation/retained-source-atoms',
  );
  const jobRoot = path.join(
    WORKSPACE_ROOT,
    'evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs',
  );
  await mkdir(retainedRoot, {recursive: true});
  await mkdir(jobRoot, {recursive: true});
  const inputDirectory = await mkdtemp(path.join(retainedRoot, '.synthetic-gate-a-'));
  const jobDirectory = await mkdtemp(path.join(jobRoot, '.synthetic-gate-a-'));
  const artifactSuffix = path.basename(inputDirectory).replace(/[^A-Za-z0-9._-]/gu, '-');
  const artifactId = `synthetic-gate-a-${process.pid}-${artifactSuffix}`;
  const bundle = makePublishedSourceBundle();
  const documents = [bundle.sourceAtoms, bundle.generationManifest, bundle.validationReport];
  const basenames = ['source-atoms.json', 'generation-manifest.json', 'validation-report.json'];
  const roles = ['sourceAtoms', 'sourceGenerationManifest', 'sourceValidationReport'];
  const inputs = [];
  for (let index = 0; index < documents.length; index += 1) {
    const absolutePath = path.join(inputDirectory, basenames[index]);
    const bytes = serializeJsonFileV001(documents[index]);
    await writeFile(absolutePath, bytes);
    inputs.push({
      role: roles[index],
      path: toWorkspacePath(absolutePath),
      fileSha256: sha256BytesV001(bytes),
    });
  }

  const runtimeBinding = await makeActualRuntimeBinding();
  const evidence = buildPresentationSegmenterBoundaryEvidenceV001({
    artifactId,
    sourceArtifact: bundle.sourceAtoms,
    sourceArtifactSnapshot: {path: inputs[0].path, fileSha256: inputs[0].fileSha256},
    runtimeBinding,
  });
  const implementationPaths = [
    'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
    'evals/clip_composition/presentation_retained_source_atoms_v001.mjs',
    'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
  ];
  const implementationRoles = ['core', 'retainedSourceAtomsCore', 'runner'];
  const implementationFiles = [];
  for (let index = 0; index < implementationPaths.length; index += 1) {
    const bytes = await readFile(path.join(WORKSPACE_ROOT, implementationPaths[index]));
    implementationFiles.push({
      role: implementationRoles[index],
      path: implementationPaths[index],
      fileSha256: sha256BytesV001(bytes),
    });
  }
  const jobValue = {
    schemaVersion: 'presentation-segmenter-boundary-preflight-job-v001',
    jobId: `synthetic-gate-a-job-${artifactSuffix}`,
    artifactId,
    mode: 'read-only-preflight',
    implementationBinding: {gitCommit: 'e'.repeat(40), files: implementationFiles},
    inputs,
    expectedSourceBinding: {
      sourceArtifactCanonicalSha256: sha256CanonicalV001(bundle.sourceAtoms),
      rawSourceAtomsCanonicalSha256: bundle.sourceAtoms.rawSourceAtomsCanonicalSha256,
    },
    expectedRuntime: {
      nodeBinarySha256: runtimeBinding.nodeBinarySha256,
      nodeVersion: runtimeBinding.nodeVersion,
      icuVersion: runtimeBinding.icuVersion,
      resolvedLocale: runtimeBinding.resolvedLocale,
      resolvedGranularity: runtimeBinding.resolvedGranularity,
    },
    expectedProjection: makeExpectedProjection(bundle.sourceAtoms, evidence),
    readOnlyGuard: {
      formalOutputPath:
        `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/${artifactId}`,
      expectedState: 'absent',
    },
  };
  const jobPath = path.join(jobDirectory, 'job.json');
  const jobBytes = serializeJsonFileV001(jobValue);
  await writeFile(jobPath, jobBytes);
  const jobRepositoryPath = toWorkspacePath(jobPath);
  const formalOutputAbsolutePath = path.join(
    WORKSPACE_ROOT,
    jobValue.readOnlyGuard.formalOutputPath,
  );
  return {
    artifactId,
    inputDirectory,
    jobDirectory,
    jobPath,
    jobRepositoryPath,
    jobValue,
    formalOutputAbsolutePath,
    cleanup: async () => {
      await rm(inputDirectory, {recursive: true, force: true});
      await rm(jobDirectory, {recursive: true, force: true});
      await rm(formalOutputAbsolutePath, {recursive: true, force: true});
    },
  };
};

test('exports use the approved fixed order and remain immutable', () => {
  assert.deepEqual(PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES, EXPECTED_CHECK_NAMES);
  assert.deepEqual(PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES, EXPECTED_VIOLATION_CODES);
  assert.equal(Object.isFrozen(PRESENTATION_SEGMENTER_BOUNDARY_CHECK_NAMES), true);
  assert.equal(Object.isFrozen(PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES), true);
  assert.equal(Object.isFrozen(PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001), true);
  assert.deepEqual(Object.keys(PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001), [
    'core',
    'retainedSourceAtomsCore',
  ]);
  assert.equal(PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001.core, new URL(
    './presentation_segmenter_boundary_evidence_v001.mjs',
    import.meta.url,
  ).href);
  assert.equal(
    PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001.retainedSourceAtomsCore,
    PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL,
  );
});

test('generator treats atom IDs as opaque and uses raw array order', () => {
  const sourceArtifact = makeOpaqueIdSourceArtifact();
  const runtimeBinding = makeRuntimeBinding();
  const evidence = buildPresentationSegmenterBoundaryEvidenceV001({
    artifactId: 'synthetic-opaque-boundary-evidence-v001',
    sourceArtifact,
    sourceArtifactSnapshot: makeSourceSnapshot(sourceArtifact),
    runtimeBinding,
  });

  const flattenedIds = evidence.boundaryCandidates.flatMap(({sourceAtomIds}) => sourceAtomIds);
  assert.deepEqual(flattenedIds, sourceArtifact.rawSourceAtoms.map(({atomId}) => atomId));
  assert.equal(evidence.boundaryCandidates[0].containerId, 'segmenter-container-000001');
  assert.equal(evidence.boundaryCandidates.at(-1).boundaryCandidateId.startsWith(
    'segmenter-boundary-',
  ), true);
  assert.deepEqual(evidence.runtimeBinding, runtimeBinding);
  assert.equal(evidence.boundaryCandidatesCanonicalSha256, sha256CanonicalV001(
    evidence.boundaryCandidates,
  ));
  assert.equal(evidence.sourceAtomMembershipCanonicalSha256, sha256CanonicalV001(
    evidence.boundaryCandidates.map(({boundaryCandidateId, sourceAtomIds}) => ({
      boundaryCandidateId,
      sourceAtomIds,
    })),
  ));

  const containerIds = evidence.boundaryCandidates.map(({containerId}) => containerId);
  const firstContainer = containerIds[0];
  const lastContainer = containerIds.at(-1);
  assert.notEqual(firstContainer, lastContainer, 'non-contiguous repeated segment/speech runs must not merge');
  assert.equal(evidence.boundaryCandidates.some(({text}) => text.includes('😀')), true);
  assert.equal(evidence.boundaryCandidates.some(({text}) => text.includes('é')), true);
  assert.equal(evidence.boundaryCandidates.some(({isWordLike}) => isWordLike === false), true);
});

test('generator output is byte deterministic for the same semantic input', () => {
  const sourceArtifact = makeOpaqueIdSourceArtifact();
  const sourceArtifactSnapshot = makeSourceSnapshot(sourceArtifact);
  const runtimeBinding = makeRuntimeBinding();
  const input = {
    artifactId: 'synthetic-determinism-v001',
    sourceArtifact,
    sourceArtifactSnapshot,
    runtimeBinding,
  };
  const first = buildPresentationSegmenterBoundaryEvidenceV001(clone(input));
  const second = buildPresentationSegmenterBoundaryEvidenceV001(clone(input));
  assert.equal(serializeEvidence(first), serializeEvidence(second));
});

test('generator emits the exact evidence, policy, candidate, anchor, and hash schemas', () => {
  const sourceArtifact = makeOpaqueIdSourceArtifact();
  const evidence = buildPresentationSegmenterBoundaryEvidenceV001({
    artifactId: 'synthetic-exact-schema-v001',
    sourceArtifact,
    sourceArtifactSnapshot: makeSourceSnapshot(sourceArtifact),
    runtimeBinding: makeRuntimeBinding(),
  });
  assert.deepEqual(Object.keys(evidence), [
    'schemaVersion',
    'artifactId',
    'generatorVersion',
    'sourceBinding',
    'runtimeBinding',
    'segmentationPolicy',
    'boundaryCandidates',
    'boundaryCandidatesCanonicalSha256',
    'sourceAtomMembershipCanonicalSha256',
  ]);
  assert.deepEqual(Object.keys(evidence.sourceBinding), [
    'sourceArtifactId',
    'sourceArtifactPath',
    'sourceArtifactFileSha256',
    'sourceArtifactCanonicalSha256',
    'sourceRef',
    'sourceProvenance',
    'atomGranularity',
    'rawSourceAtomsCanonicalSha256',
  ]);
  assert.deepEqual(evidence.segmentationPolicy, {
    policyVersion: 'presentation-segmenter-boundary-policy-v001',
    engine: 'Intl.Segmenter',
    locale: 'ja',
    granularity: 'word',
    indexUnit: 'utf16-code-unit',
    containerRule: 'maximal-contiguous-run-by-timeline-segment-and-speech-v001',
    candidateIdRule: 'source-order-six-digit-v001',
    unicodeNormalization: 'none',
  });
  const flattenedAtomIds = [];
  evidence.boundaryCandidates.forEach((candidate, index) => {
    assert.deepEqual(Object.keys(candidate), [
      'boundaryCandidateId',
      'containerId',
      'timelineSegmentId',
      'speechId',
      'sourceAtomIds',
      'text',
      'startAnchor',
      'endAnchor',
      'segmenterIndexUtf16',
      'segmenterLengthUtf16',
      'isWordLike',
      'sourceAtomCount',
    ]);
    assert.equal(candidate.boundaryCandidateId,
      `segmenter-boundary-${String(index + 1).padStart(6, '0')}`);
    assert.deepEqual(candidate.startAnchor, {
      atomId: candidate.sourceAtomIds[0],
      edge: 'start',
    });
    assert.deepEqual(candidate.endAnchor, {
      atomId: candidate.sourceAtomIds.at(-1),
      edge: 'end',
    });
    assert.equal(candidate.sourceAtomCount, candidate.sourceAtomIds.length);
    assert.equal(Object.prototype.hasOwnProperty.call(candidate, 'speaker'), false);
    flattenedAtomIds.push(...candidate.sourceAtomIds);
  });
  assert.deepEqual(flattenedAtomIds, sourceArtifact.rawSourceAtoms.map(({atomId}) => atomId));
});

test('checker accepts the generic full-contract fixture and returns the exact report shape', () => {
  const context = makeValidCheckerContext();
  const report = checkPresentationSegmenterBoundaryPreflightV001(context);
  assert.deepEqual(Object.keys(report), [
    'schemaVersion',
    'status',
    'artifactId',
    'checks',
    'observedProjection',
    'violations',
  ]);
  assert.equal(report.schemaVersion, 'presentation-segmenter-boundary-check-report-v001');
  assert.equal(report.status, 'passed');
  assert.equal(report.artifactId, context.jobValue.artifactId);
  assert.deepEqual(report.checks.map(({name}) => name), EXPECTED_CHECK_NAMES);
  assert.equal(report.checks.every(({status, violationCodes}) =>
    status === 'passed' && violationCodes.length === 0), true);
  assert.deepEqual(report.observedProjection, context.jobValue.expectedProjection);
  assert.equal(report.observedProjection.sourcePositiveOverlapCount, 1);
  assert.equal(
    context.inputSnapshots[0].document.rawSourceAtoms[2].endMs,
    context.inputSnapshots[0].document.rawSourceAtoms[3].startMs,
    'boundary contact must exist in the fixture without increasing positive overlap count',
  );
  assert.deepEqual(report.violations, []);
  assertCheckReportInvariants(report);
});

test('checker rejects malformed internal context as an internal error, not a contract code', () => {
  for (const mutate of [
    (context) => { delete context.productionMode; },
    (context) => { context.unknown = true; },
    (context) => { context.productionMode = 'false'; },
    (context) => { context.evidencePasses = null; },
  ]) {
    const context = makeValidCheckerContext();
    mutate(context);
    assert.throws(
      () => checkPresentationSegmenterBoundaryPreflightV001(context),
      (error) => error?.name === 'SegmenterBoundaryInternalContextError',
    );
  }
});

test('all 35 fixed violation codes are reachable through the approved checker entrance', () => {
  const observedCodes = new Set();
  const run = (targetCode, mutate) => {
    const context = makeValidCheckerContext();
    mutate(context);
    return assertTargetCode(targetCode, context, observedCodes);
  };

  run('SEGMENTER_BOUNDARY_JOB_INVALID', (context) => {
    context.jobValue.unknown = true;
  });
  run('SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH', (context) => {
    context.jobSnapshot.secondFileSha256 = 'e'.repeat(64);
    context.jobSnapshot.issues = ['hash_changed'];
  });
  run('SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH', (context) => {
    const snapshot = context.observedImplementationBinding.files[0];
    snapshot.secondFileSha256 = 'e'.repeat(64);
    snapshot.issues = ['hash_changed'];
  });
  run('SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE', (context) => {
    const snapshot = context.inputSnapshots[0];
    snapshot.firstFileSha256 = null;
    snapshot.secondFileSha256 = null;
    snapshot.document = null;
    snapshot.issues = ['path_unsafe'];
  });
  run('SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH', (context) => {
    const snapshot = context.inputSnapshots[0];
    snapshot.secondFileSha256 = null;
    snapshot.issues = ['second_read_failed'];
  });
  run('SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED', (context) => {
    const snapshot = context.inputSnapshots[0];
    snapshot.document = null;
    snapshot.issues = ['json_parse_failed'];
  });
  run('SEGMENTER_BOUNDARY_SOURCE_VALIDATION_NOT_PASSED', (context) => {
    context.inputSnapshots[2].document.status = 'failed';
    refreshPublishedBindings(context);
  });
  run('SEGMENTER_BOUNDARY_SOURCE_BINDING_MISMATCH', (context) => {
    context.jobValue.expectedSourceBinding.rawSourceAtomsCanonicalSha256 = 'f'.repeat(64);
  });
  run('SEGMENTER_BOUNDARY_RUNTIME_MISMATCH', (context) => {
    context.jobValue.expectedRuntime.nodeVersion = `${process.version}-different`;
  });
  run('SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID', (context) => {
    context.inputSnapshots[0].document.rawSourceAtoms[0].speaker = '';
    refreshPublishedBindings(context);
  });
  run('SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE', (context) => {
    context.inputSnapshots[0].document.rawSourceAtoms[1].atomId =
      context.inputSnapshots[0].document.rawSourceAtoms[0].atomId;
    refreshPublishedBindings(context);
  });
  run('SEGMENTER_BOUNDARY_SOURCE_ATOM_TIME_REVERSED', (context) => {
    context.inputSnapshots[0].document.rawSourceAtoms[2].startMs = 145;
    refreshPublishedBindings(context);
  });
  run('SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID', (context) => {
    context.inputSnapshots[0].document.selection.segments[1].atomIds.pop();
    refreshPublishedBindings(context);
  });
  run('SEGMENTER_BOUNDARY_SPEECH_MEMBERSHIP_INVALID', (context) => {
    context.inputSnapshots[0].document.rawSourceAtoms[0].speechId = '1';
    refreshPublishedBindings(context);
  });
  run('SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID', (context) => {
    mutateBothEvidencePasses(context, (evidence) => { evidence.unknown = true; });
  });
  run('SEGMENTER_BOUNDARY_EVIDENCE_BINDING_MISMATCH', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.artifactId = 'different-artifact-v001';
    });
  });
  run('SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.boundaryCandidates[0].isWordLike =
        !evidence.boundaryCandidates[0].isWordLike;
    });
  });
  run('SEGMENTER_BOUNDARY_SPLITS_SOURCE_ATOM', (context) => {
    context.inputSnapshots[0].document.rawSourceAtoms[0].text = '猫、';
    refreshPublishedBindings(context);
    refreshEvidenceBinding(context);
  });
  run('SEGMENTER_BOUNDARY_CANDIDATE_EMPTY', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      const candidate = evidence.boundaryCandidates[0];
      candidate.sourceAtomIds = [];
      candidate.text = '';
      candidate.segmenterLengthUtf16 = 0;
      candidate.sourceAtomCount = 0;
    });
  });
  run('SEGMENTER_BOUNDARY_CONTAINER_ID_INVALID', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.boundaryCandidates[0].containerId = 'container-without-approved-prefix';
    });
  });
  run('SEGMENTER_BOUNDARY_CANDIDATE_ID_INVALID', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.boundaryCandidates[0].boundaryCandidateId = 'candidate-no-ordinal';
    });
  });
  run('SEGMENTER_BOUNDARY_CANDIDATE_ID_DUPLICATE', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.boundaryCandidates[1].boundaryCandidateId =
        evidence.boundaryCandidates[0].boundaryCandidateId;
    });
  });
  run('SEGMENTER_BOUNDARY_CANDIDATE_NONCONTIGUOUS', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      const candidate = evidence.boundaryCandidates[0];
      candidate.sourceAtomIds = ['word-101', 'word-103'];
      candidate.sourceAtomCount = 2;
      candidate.text = '大、';
      candidate.startAnchor = {atomId: 'word-101', edge: 'start'};
      candidate.endAnchor = {atomId: 'word-103', edge: 'end'};
    });
  });
  run('SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SEGMENT', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      const candidate = evidence.boundaryCandidates[0];
      candidate.sourceAtomIds = ['word-104', 'word-105'];
      candidate.sourceAtomCount = 2;
      candidate.text = '犬 ';
      candidate.startAnchor = {atomId: 'word-104', edge: 'start'};
      candidate.endAnchor = {atomId: 'word-105', edge: 'end'};
    });
  });
  run('SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SPEECH', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      const candidate = evidence.boundaryCandidates[0];
      candidate.sourceAtomIds = ['word-102', 'word-103'];
      candidate.sourceAtomCount = 2;
      candidate.text = '型、';
      candidate.startAnchor = {atomId: 'word-102', edge: 'start'};
      candidate.endAnchor = {atomId: 'word-103', edge: 'end'};
    });
  });
  run('SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.boundaryCandidates[0].text = 'different-text';
    });
  });
  run('SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.boundaryCandidates[0].startAnchor = {atomId: 'word-107', edge: 'start'};
    });
  });
  run('SEGMENTER_BOUNDARY_SOURCE_ATOM_MISSING', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.boundaryCandidates.pop();
    });
  });
  run('SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATED', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      const candidate = evidence.boundaryCandidates[1];
      candidate.sourceAtomIds.unshift(
        evidence.boundaryCandidates[0].sourceAtomIds[0],
      );
      candidate.sourceAtomCount = candidate.sourceAtomIds.length;
      candidate.text = '大'.concat(candidate.text);
      candidate.startAnchor = {atomId: candidate.sourceAtomIds[0], edge: 'start'};
    });
  });
  run('SEGMENTER_BOUNDARY_SOURCE_ATOM_ORDER_REVERSED', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      [evidence.boundaryCandidates[0], evidence.boundaryCandidates[1]] = [
        evidence.boundaryCandidates[1],
        evidence.boundaryCandidates[0],
      ];
    });
  });
  run('SEGMENTER_BOUNDARY_EXPECTED_PROJECTION_MISMATCH', (context) => {
    context.jobValue.expectedProjection.sourcePositiveOverlapCount += 1;
  });
  run('SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH', (context) => {
    mutateBothEvidencePasses(context, (evidence) => {
      evidence.boundaryCandidatesCanonicalSha256 = '0'.repeat(64);
    }, {rehash: false});
  });
  run('SEGMENTER_BOUNDARY_NONDETERMINISTIC', (context) => {
    context.evidencePasses[1] = Object.fromEntries(
      Object.entries(context.evidencePasses[1]).reverse(),
    );
  });
  run('SEGMENTER_BOUNDARY_READ_ONLY_CONTRACT_VIOLATED', (context) => {
    context.readOnlyGuard.after.entryCount += 1;
  });
  const buildFailureReport = run('SEGMENTER_BOUNDARY_BUILD_FAILED', (context) => {
    context.evidencePasses = [null, null];
    context.buildFailure = {pass: 1, kind: 'segmenter_exception'};
  });
  assert.equal(checkByName(buildFailureReport, 'determinism').status,
    'not_run_with_upstream_failure');

  assert.deepEqual(
    [...observedCodes].sort(),
    [...PRESENTATION_SEGMENTER_BOUNDARY_VIOLATION_CODES].sort(),
    'exported code set and observed code set must be identical',
  );
});

test('check dependency graph runs independent checks and suppresses only true dependents', () => {
  const jobFailure = makeValidCheckerContext();
  jobFailure.jobValue.unknown = true;
  const jobReport = checkPresentationSegmenterBoundaryPreflightV001(jobFailure);
  assert.equal(checkByName(jobReport, 'jobBinding').status, 'failed');
  for (const name of EXPECTED_CHECK_NAMES.slice(1)) {
    assert.equal(checkByName(jobReport, name).status, 'not_run_with_upstream_failure');
  }

  const implementationFailure = makeValidCheckerContext();
  implementationFailure.observedImplementationBinding.files[0].issues = ['module_path_mismatch'];
  const implementationReport = checkPresentationSegmenterBoundaryPreflightV001(
    implementationFailure,
  );
  assert.equal(checkByName(implementationReport, 'implementationBinding').status, 'failed');
  assert.equal(checkByName(implementationReport, 'inputBinding').status, 'passed');
  assert.equal(checkByName(implementationReport, 'runtimeBinding').status, 'passed');
  assert.equal(checkByName(implementationReport, 'sourceContract').status, 'passed');
  assert.equal(checkByName(implementationReport, 'segmentation').status,
    'not_run_with_upstream_failure');
  assert.equal(checkByName(implementationReport, 'coverage').status, 'passed');
  assert.equal(checkByName(implementationReport, 'expectedProjection').status,
    'not_run_with_upstream_failure');
  assert.equal(checkByName(implementationReport, 'determinism').status,
    'not_run_with_upstream_failure');
  assert.equal(checkByName(implementationReport, 'readOnlyPreflight').status, 'passed');

  const runtimeFailure = makeValidCheckerContext();
  runtimeFailure.jobValue.expectedRuntime.nodeVersion = 'v0.synthetic';
  const runtimeReport = checkPresentationSegmenterBoundaryPreflightV001(runtimeFailure);
  assert.equal(checkByName(runtimeReport, 'runtimeBinding').status, 'failed');
  assert.equal(checkByName(runtimeReport, 'sourceContract').status, 'passed');
  assert.equal(checkByName(runtimeReport, 'segmentation').status,
    'not_run_with_upstream_failure');
  assert.equal(checkByName(runtimeReport, 'coverage').status, 'passed');
  assert.equal(checkByName(runtimeReport, 'readOnlyPreflight').status, 'passed');

  const segmentationFailure = makeValidCheckerContext();
  mutateBothEvidencePasses(segmentationFailure, (evidence) => {
    evidence.unknown = true;
  });
  const segmentationReport = checkPresentationSegmenterBoundaryPreflightV001(
    segmentationFailure,
  );
  assert.equal(checkByName(segmentationReport, 'segmentation').status, 'failed');
  assert.equal(checkByName(segmentationReport, 'coverage').status, 'passed');
  assert.equal(checkByName(segmentationReport, 'expectedProjection').status,
    'not_run_with_upstream_failure');
  assert.equal(checkByName(segmentationReport, 'determinism').status, 'passed');
  assert.equal(checkByName(segmentationReport, 'readOnlyPreflight').status, 'passed');

  const unreadableMembership = makeValidCheckerContext();
  unreadableMembership.evidencePasses[0].boundaryCandidates[0].sourceAtomIds = null;
  unreadableMembership.evidencePasses[1].boundaryCandidates[0].sourceAtomIds = null;
  const unreadableReport = checkPresentationSegmenterBoundaryPreflightV001(
    unreadableMembership,
  );
  assert.equal(checkByName(unreadableReport, 'segmentation').status, 'failed');
  assert.equal(checkByName(unreadableReport, 'coverage').status,
    'not_run_with_upstream_failure');

  const projectionFailure = makeValidCheckerContext();
  projectionFailure.jobValue.expectedProjection.boundaryCandidateCount += 1;
  const projectionReport = checkPresentationSegmenterBoundaryPreflightV001(projectionFailure);
  assert.equal(checkByName(projectionReport, 'expectedProjection').status, 'failed');
  assert.equal(checkByName(projectionReport, 'determinism').status, 'passed');
  assert.equal(checkByName(projectionReport, 'readOnlyPreflight').status, 'passed');

  for (const report of [
    jobReport,
    implementationReport,
    runtimeReport,
    segmentationReport,
    unreadableReport,
    projectionReport,
  ]) assertCheckReportInvariants(report);
});

test('build-result union accepts only the three registered forms and fixes invalid paths', () => {
  const first = makeValidCheckerContext();
  const evidence = clone(first.evidencePasses[0]);
  const legalCases = [
    {passes: [clone(evidence), clone(evidence)], failure: null, buildFailed: false},
    {
      passes: [null, null],
      failure: {pass: 1, kind: 'segmenter_exception'},
      buildFailed: true,
    },
    {
      passes: [clone(evidence), null],
      failure: {pass: 2, kind: 'unexpected_exception'},
      buildFailed: true,
    },
  ];
  for (const {passes, failure, buildFailed} of legalCases) {
    const context = makeValidCheckerContext();
    context.evidencePasses = passes;
    context.buildFailure = failure;
    const report = checkPresentationSegmenterBoundaryPreflightV001(context);
    assert.equal(collectCodes(report).includes('SEGMENTER_BOUNDARY_BUILD_FAILED'), buildFailed);
    assert.equal(collectCodes(report).includes('SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID'), false);
    assertCheckReportInvariants(report);
  }

  const invalidCases = [
    {passes: [clone(evidence)], failure: null, path: '$.evidencePasses'},
    {passes: [null, clone(evidence)], failure: null, path: '$.evidencePasses'},
    {passes: [clone(evidence), clone(evidence)], failure: {pass: 1}, path: '$.buildFailure'},
    {
      passes: [null, null],
      failure: {pass: 1, kind: 'not-registered'},
      path: '$.buildFailure.kind',
    },
    {
      passes: [null, null],
      failure: {pass: 3, kind: 'segmenter_exception'},
      path: '$.buildFailure.pass',
    },
    {passes: [null, null], failure: null, path: '$.buildFailure'},
    {passes: [clone(evidence), null], failure: null, path: '$.buildFailure'},
    {
      passes: [clone(evidence), clone(evidence)],
      failure: {pass: 1, kind: 'segmenter_exception'},
      path: '$.buildFailure',
    },
    {
      passes: [clone(evidence), null],
      failure: {pass: 1, kind: 'segmenter_exception'},
      path: '$.buildFailure.pass',
    },
    {
      passes: [null, null],
      failure: {pass: 2, kind: 'segmenter_exception'},
      path: '$.buildFailure.pass',
    },
  ];
  for (const invalid of invalidCases) {
    const context = makeValidCheckerContext();
    context.evidencePasses = invalid.passes;
    context.buildFailure = invalid.failure;
    const report = checkPresentationSegmenterBoundaryPreflightV001(context);
    assert.equal(collectCodes(report).includes('SEGMENTER_BOUNDARY_BUILD_FAILED'), false);
    const violation = report.violations.find(({code}) =>
      code === 'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID');
    assert.equal(violation?.path, invalid.path);
    assertCheckReportInvariants(report);
  }
});

test('coverage is checked from readable membership even when segmentation is invalid', () => {
  const cases = [
    {
      code: 'SEGMENTER_BOUNDARY_SOURCE_ATOM_MISSING',
      mutate(evidence) { evidence.boundaryCandidates.pop(); },
    },
    {
      code: 'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATED',
      mutate(evidence) {
        const duplicateId = evidence.boundaryCandidates[0].sourceAtomIds[0];
        const target = evidence.boundaryCandidates[1];
        target.sourceAtomIds.unshift(duplicateId);
        target.sourceAtomCount = target.sourceAtomIds.length;
        target.text = '大'.concat(target.text);
        target.startAnchor = {atomId: duplicateId, edge: 'start'};
      },
    },
    {
      code: 'SEGMENTER_BOUNDARY_SOURCE_ATOM_ORDER_REVERSED',
      mutate(evidence) {
        [evidence.boundaryCandidates[0], evidence.boundaryCandidates[1]] = [
          evidence.boundaryCandidates[1], evidence.boundaryCandidates[0],
        ];
      },
    },
  ];
  for (const entry of cases) {
    const context = makeValidCheckerContext();
    mutateBothEvidencePasses(context, entry.mutate);
    const report = checkPresentationSegmenterBoundaryPreflightV001(context);
    assert.equal(collectCodes(report).includes(entry.code), true);
    assert.equal(checkByName(report, 'segmentation').status, 'failed');
    assert.equal(checkByName(report, 'coverage').status, 'failed');
    assertCheckReportInvariants(report);
  }
});

test('determinism compares formal bytes independently of evidence validity', () => {
  const orderOnly = makeValidCheckerContext();
  orderOnly.evidencePasses[1] = Object.fromEntries(
    Object.entries(orderOnly.evidencePasses[1]).reverse(),
  );
  const orderReport = checkPresentationSegmenterBoundaryPreflightV001(orderOnly);
  assert.deepEqual(collectCodes(orderReport), ['SEGMENTER_BOUNDARY_NONDETERMINISTIC']);

  const invalidSecond = makeValidCheckerContext();
  invalidSecond.evidencePasses[1].unknown = true;
  const invalidReport = checkPresentationSegmenterBoundaryPreflightV001(invalidSecond);
  assert.equal(collectCodes(invalidReport).includes(
    'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID'), true);
  assert.equal(collectCodes(invalidReport).includes('SEGMENTER_BOUNDARY_NONDETERMINISTIC'), true);

  const missingSecond = makeValidCheckerContext();
  missingSecond.evidencePasses[1] = null;
  missingSecond.buildFailure = {pass: 2, kind: 'segmenter_exception'};
  const missingReport = checkPresentationSegmenterBoundaryPreflightV001(missingSecond);
  assert.equal(collectCodes(missingReport).includes('SEGMENTER_BOUNDARY_BUILD_FAILED'), true);
  assert.equal(checkByName(missingReport, 'determinism').status,
    'not_run_with_upstream_failure');

  [orderReport, invalidReport, missingReport].forEach(assertCheckReportInvariants);
});

test('specific violation ownership suppresses only the generic alias for the same defect', () => {
  const duplicate = makeValidCheckerContext();
  duplicate.inputSnapshots[0].document.rawSourceAtoms[1].atomId = 'word-101';
  refreshPublishedBindings(duplicate);
  const duplicateReport = checkPresentationSegmenterBoundaryPreflightV001(duplicate);
  assert.equal(collectCodes(duplicateReport).includes(
    'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE'), true);
  assert.equal(collectCodes(duplicateReport).includes(
    'SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID'), false);

  const duplicateAndEmpty = makeValidCheckerContext();
  duplicateAndEmpty.inputSnapshots[0].document.rawSourceAtoms[1].atomId = 'word-101';
  duplicateAndEmpty.inputSnapshots[0].document.rawSourceAtoms[1].text = '';
  refreshPublishedBindings(duplicateAndEmpty);
  const duplicateAndEmptyReport = checkPresentationSegmenterBoundaryPreflightV001(
    duplicateAndEmpty,
  );
  assert.equal(collectCodes(duplicateAndEmptyReport).includes(
    'SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE'), true);
  assert.equal(collectCodes(duplicateAndEmptyReport).includes(
    'SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID'), true);

  const duplicateCandidate = makeValidCheckerContext();
  mutateBothEvidencePasses(duplicateCandidate, (evidence) => {
    evidence.boundaryCandidates[1].boundaryCandidateId =
      evidence.boundaryCandidates[0].boundaryCandidateId;
  });
  const duplicateCandidateReport = checkPresentationSegmenterBoundaryPreflightV001(
    duplicateCandidate,
  );
  assert.equal(collectCodes(duplicateCandidateReport).includes(
    'SEGMENTER_BOUNDARY_CANDIDATE_ID_DUPLICATE'), true);
  const duplicatePath = '$.evidencePasses[0].boundaryCandidates[1].boundaryCandidateId';
  assert.equal(duplicateCandidateReport.violations.some(({code, path: violationPath}) =>
    code === 'SEGMENTER_BOUNDARY_CANDIDATE_ID_INVALID'
      && violationPath === duplicatePath), false);

  const textMismatch = makeValidCheckerContext();
  mutateBothEvidencePasses(textMismatch, (evidence) => {
    evidence.boundaryCandidates[0].text = 'source-text-does-not-match';
  });
  const textReport = checkPresentationSegmenterBoundaryPreflightV001(textMismatch);
  assert.equal(collectCodes(textReport).includes(
    'SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH'), true);
  assert.equal(collectCodes(textReport).includes(
    'SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH'), false);

  const textMismatchWithoutRehash = makeValidCheckerContext();
  mutateBothEvidencePasses(textMismatchWithoutRehash, (evidence) => {
    evidence.boundaryCandidates[0].text = 'changed-without-updating-saved-hash';
  }, {rehash: false});
  const independentHashReport = checkPresentationSegmenterBoundaryPreflightV001(
    textMismatchWithoutRehash,
  );
  assert.equal(collectCodes(independentHashReport).includes(
    'SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH'), true);
  assert.equal(collectCodes(independentHashReport).includes(
    'SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH'), true);

  const anchorUnknownField = makeValidCheckerContext();
  mutateBothEvidencePasses(anchorUnknownField, (evidence) => {
    evidence.boundaryCandidates[0].startAnchor.extra = true;
  });
  const anchorReport = checkPresentationSegmenterBoundaryPreflightV001(anchorUnknownField);
  assert.equal(collectCodes(anchorReport).includes(
    'SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH'), true);
  assert.equal(collectCodes(anchorReport).includes(
    'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID'), false);

  [
    duplicateReport,
    duplicateAndEmptyReport,
    duplicateCandidateReport,
    textReport,
    independentHashReport,
    anchorReport,
  ].forEach(assertCheckReportInvariants);
});

test('snapshot issue vocabularies, order, null states, and violation paths are deterministic', () => {
  const jobSecondRead = makeValidCheckerContext();
  jobSecondRead.jobSnapshot.secondFileSha256 = null;
  jobSecondRead.jobSnapshot.issues = ['second_read_failed'];
  const jobReport = checkPresentationSegmenterBoundaryPreflightV001(jobSecondRead);
  assert.deepEqual(jobReport.violations.filter(({code}) =>
    code === 'SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH'), [{
    code: 'SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH',
    path: '$.jobSnapshot',
    details: {},
  }]);

  const parseAndHash = makeValidCheckerContext();
  const input = parseAndHash.inputSnapshots[1];
  input.document = null;
  input.secondFileSha256 = 'f'.repeat(64);
  input.issues = ['json_parse_failed', 'hash_changed'];
  const inputReport = checkPresentationSegmenterBoundaryPreflightV001(parseAndHash);
  assert.equal(collectCodes(inputReport).includes(
    'SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED'), true);
  assert.equal(collectCodes(inputReport).includes(
    'SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH'), true);

  const moduleUnavailable = makeValidCheckerContext();
  const implementation = moduleUnavailable.observedImplementationBinding.files[2];
  implementation.loadedModuleUrl = null;
  implementation.issues = ['module_url_unavailable'];
  const implementationReport = checkPresentationSegmenterBoundaryPreflightV001(
    moduleUnavailable,
  );
  assert.deepEqual(implementationReport.violations.filter(({code}) =>
    code === 'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH'), [{
    code: 'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH',
    path: '$.observedImplementationBinding.files[2]',
    details: {},
  }]);

  const multipleAnchors = makeValidCheckerContext();
  mutateBothEvidencePasses(multipleAnchors, (evidence) => {
    evidence.boundaryCandidates[0].startAnchor.atomId = 'wrong-start';
    evidence.boundaryCandidates[0].endAnchor.atomId = 'wrong-end';
  });
  const anchorReport = checkPresentationSegmenterBoundaryPreflightV001(multipleAnchors);
  const anchorPaths = anchorReport.violations
    .filter(({code}) => code === 'SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH')
    .map(({path: violationPath}) => violationPath);
  assert.deepEqual(anchorPaths, [...anchorPaths].sort(compareUtf16));
  assert.equal(new Set(anchorPaths).size, anchorPaths.length);

  [jobReport, inputReport, implementationReport, anchorReport]
    .forEach(assertCheckReportInvariants);
});

test('evidence exact schemas reject unknown, missing, type, and count-shape defects', () => {
  const mutations = [
    (evidence) => { evidence.unknown = true; },
    (evidence) => { delete evidence.sourceBinding; },
    (evidence) => { evidence.runtimeBinding.diagnostics.unknown = true; },
    (evidence) => { evidence.boundaryCandidates = 'not-an-array'; },
    (evidence) => { evidence.boundaryCandidates[0].unknown = true; },
    (evidence) => { evidence.boundaryCandidates[0].sourceAtomCount += 1; },
    (evidence) => { evidence.boundaryCandidates[0].startAnchor = 'not-an-object'; },
  ];
  for (const mutation of mutations) {
    const context = makeValidCheckerContext();
    context.evidencePasses.forEach((evidence) => mutation(evidence));
    const report = checkPresentationSegmenterBoundaryPreflightV001(context);
    assert.equal(collectCodes(report).includes(
      'SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID'), true);
    assertCheckReportInvariants(report);
  }
});

test('runtime pass-fail fields are fixed while diagnostics remain provenance only', () => {
  const passFailMutations = [
    (runtime) => { runtime.nodeBinarySha256 = '0'.repeat(64); },
    (runtime) => { runtime.nodeVersion = 'v0.synthetic'; },
    (runtime) => { runtime.icuVersion = '0.synthetic'; },
    (runtime) => { runtime.resolvedLocale = 'en'; },
    (runtime) => { runtime.resolvedGranularity = 'sentence'; },
  ];
  for (const mutate of passFailMutations) {
    const context = makeValidCheckerContext();
    mutate(context.runtimeBinding);
    const report = checkPresentationSegmenterBoundaryPreflightV001(context);
    assert.equal(collectCodes(report).includes('SEGMENTER_BOUNDARY_RUNTIME_MISMATCH'), true);
  }

  const diagnosticsOnly = makeValidCheckerContext();
  diagnosticsOnly.runtimeBinding.diagnostics.resolvedNodePath = '/synthetic/same-byte-node';
  diagnosticsOnly.evidencePasses.forEach((evidence) => {
    evidence.runtimeBinding.diagnostics.resolvedNodePath = '/synthetic/same-byte-node';
  });
  const diagnosticsReport = checkPresentationSegmenterBoundaryPreflightV001(diagnosticsOnly);
  assert.equal(diagnosticsReport.status, 'passed');
});

test('production filesystem adapter exposes only the approved read operations', () => {
  const adapter = createPresentationSegmenterBoundaryProductionFilesystemAdapterV001();
  assert.equal(Object.isFrozen(adapter), true);
  assert.deepEqual(Object.keys(adapter).sort(), ['lstat', 'openReadOnly', 'readdir', 'realpath']);
});

test('read-only runner and actual CLI cover success, contract failure, usage failure, and injection refusal', async () => {
  const fixture = await makeRunnerFixture();
  try {
    const calls = [];
    const production = createPresentationSegmenterBoundaryProductionFilesystemAdapterV001();
    const spy = Object.freeze(Object.fromEntries(
      ['openReadOnly', 'lstat', 'realpath', 'readdir'].map((name) => [
        name,
        async (...args) => {
          calls.push({name, args});
          return production[name](...args);
        },
      ]),
    ));
    assert.deepEqual(Object.keys(spy).sort(), ['lstat', 'openReadOnly', 'readdir', 'realpath']);
    const directResult = await runPresentationSegmenterBoundaryPreflightV001(
      fixture.jobRepositoryPath,
      {filesystemAdapter: spy},
    );
    assert.equal(directResult.exitCode, 0);
    assert.equal(directResult.stderr, '');
    assert.equal(directResult.stdout.endsWith('\n'), true);
    assert.equal(calls.length > 0, true);
    assert.deepEqual(
      [...new Set(calls.map(({name}) => name))].sort(),
      ['lstat', 'openReadOnly', 'readdir', 'realpath'],
    );
    const openedPaths = calls
      .filter(({name}) => name === 'openReadOnly')
      .map(({args}) => args[0]);
    const nodeRealPath = await production.realpath(process.execPath);
    for (const expectedTwice of [
      fixture.jobPath,
      ...fixture.jobValue.inputs.map((input) => path.join(WORKSPACE_ROOT, input.path)),
      ...fixture.jobValue.implementationBinding.files.map((file) =>
        path.join(WORKSPACE_ROOT, file.path)),
      nodeRealPath,
    ]) {
      assert.equal(
        openedPaths.filter((openedPath) => openedPath === expectedTwice).length >= 2,
        true,
        `${expectedTwice} must be observed in both stable-read passes`,
      );
    }
    assert.equal(await pathExists(fixture.formalOutputAbsolutePath), false);

    const adapterWithWriteSurface = Object.freeze({
      ...production,
      writeFile: async () => {},
    });
    const rejectedAdapterResult = await runPresentationSegmenterBoundaryPreflightV001(
      fixture.jobRepositoryPath,
      {filesystemAdapter: adapterWithWriteSurface},
    );
    assert.deepEqual(rejectedAdapterResult, {
      exitCode: 2,
      stdout: '',
      stderr: 'SEGMENTER_BOUNDARY_CLI_INTERNAL_REPORT_INVALID\n',
    });

    const runnerPath = path.join(
      TEST_DIRECTORY,
      'run_presentation_segmenter_boundary_preflight_v001.mjs',
    );
    const success = spawnSync(process.execPath, [runnerPath, fixture.jobRepositoryPath], {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf8',
      input: 'ignored-stdin-must-not-be-an-injection-channel',
    });
    assert.equal(success.status, 0);
    assert.equal(success.stderr, '');
    const successReport = JSON.parse(success.stdout);
    assert.equal(success.stdout, `${canonicalJsonV001(successReport)}\n`);
    assert.equal(successReport.status, 'passed');
    assert.equal(success.stdout, directResult.stdout, 'preflight report bytes must be deterministic');

    const differentCwd = spawnSync(process.execPath, [runnerPath, fixture.jobRepositoryPath], {
      cwd: fixture.jobDirectory,
      encoding: 'utf8',
    });
    assert.equal(differentCwd.status, 0);
    assert.equal(differentCwd.stdout, success.stdout, 'cwd must not replace the fixed workspace root');
    assert.equal(differentCwd.stderr, '');

    const failedJob = clone(fixture.jobValue);
    failedJob.jobId = `${failedJob.jobId}-expected-projection-failure`;
    failedJob.expectedProjection.sourceAtomCount += 1;
    const failedJobPath = path.join(fixture.jobDirectory, 'failed-job.json');
    await writeFile(failedJobPath, serializeJsonFileV001(failedJob));
    const failure = spawnSync(process.execPath, [runnerPath, toWorkspacePath(failedJobPath)], {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf8',
    });
    assert.equal(failure.status, 1);
    assert.equal(failure.stdout, '');
    const failureReport = JSON.parse(failure.stderr);
    assert.equal(failure.stderr, `${canonicalJsonV001(failureReport)}\n`);
    assert.equal(failureReport.status, 'failed');
    assert.equal(failureReport.failureStage, 'expectedProjection');

    const invalidJob = {...clone(fixture.jobValue), unknown: true};
    const invalidJobPath = path.join(fixture.jobDirectory, 'invalid-job.json');
    await writeFile(invalidJobPath, serializeJsonFileV001(invalidJob));
    const invalidJobResult = spawnSync(
      process.execPath,
      [runnerPath, toWorkspacePath(invalidJobPath)],
      {cwd: WORKSPACE_ROOT, encoding: 'utf8'},
    );
    assert.equal(invalidJobResult.status, 1);
    assert.equal(invalidJobResult.stdout, '');
    const invalidJobReport = JSON.parse(invalidJobResult.stderr);
    assert.equal(invalidJobReport.failureStage, 'jobBinding');
    assert.equal(invalidJobReport.job.jobId, fixture.jobValue.jobId);
    assert.equal(invalidJobReport.inputs, null);
    assert.equal(invalidJobReport.runtimeBinding, null);
    assert.equal(invalidJobReport.observedProjection, null);
    assert.equal(invalidJobReport.evidence, null);
    assert.equal(invalidJobReport.readOnlyGuard, null);

    const implementationFailureJob = clone(fixture.jobValue);
    implementationFailureJob.jobId = `${implementationFailureJob.jobId}-implementation-failure`;
    implementationFailureJob.implementationBinding.files[0].fileSha256 = '0'.repeat(64);
    const implementationFailurePath = path.join(
      fixture.jobDirectory,
      'implementation-failure-job.json',
    );
    await writeFile(
      implementationFailurePath,
      serializeJsonFileV001(implementationFailureJob),
    );
    const implementationFailureResult = spawnSync(
      process.execPath,
      [runnerPath, toWorkspacePath(implementationFailurePath)],
      {cwd: WORKSPACE_ROOT, encoding: 'utf8'},
    );
    assert.equal(implementationFailureResult.status, 1);
    const implementationFailureReport = JSON.parse(implementationFailureResult.stderr);
    assert.equal(implementationFailureReport.failureStage, 'implementationBinding');
    assert.notEqual(implementationFailureReport.inputs, null);
    assert.notEqual(implementationFailureReport.runtimeBinding, null);
    assert.equal(implementationFailureReport.observedProjection, null);
    assert.equal(implementationFailureReport.evidence, null);
    assert.notEqual(implementationFailureReport.readOnlyGuard, null);

    const usageCases = [
      [],
      [fixture.jobRepositoryPath, 'second-argument-is-forbidden'],
    ];
    for (const args of usageCases) {
      const result = spawnSync(process.execPath, [runnerPath, ...args], {
        cwd: WORKSPACE_ROOT,
        encoding: 'utf8',
      });
      assert.equal(result.status, 2);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'SEGMENTER_BOUNDARY_CLI_USAGE_ERROR\n');
    }

    const symbolicJobPath = path.join(fixture.jobDirectory, 'symbolic-job.json');
    await symlink(fixture.jobPath, symbolicJobPath);
    const directoryJobPath = path.join(fixture.jobDirectory, 'directory-job.json');
    await mkdir(directoryJobPath);
    for (const rejectedPath of [
      fixture.jobPath,
      '../outside.json',
      'evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs',
      'evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/not-json.txt',
      toWorkspacePath(symbolicJobPath),
      toWorkspacePath(directoryJobPath),
    ]) {
      const result = spawnSync(process.execPath, [runnerPath, rejectedPath], {
        cwd: WORKSPACE_ROOT,
        encoding: 'utf8',
      });
      assert.equal(result.status, 2);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'SEGMENTER_BOUNDARY_CLI_JOB_CONTEXT_UNAVAILABLE\n');
    }

    const stdoutChunks = [];
    const stderrChunks = [];
    const cliExit = await runPresentationSegmenterBoundaryPreflightCliV001(
      [fixture.jobRepositoryPath],
      {
        stdout: {write: (value) => stdoutChunks.push(value)},
        stderr: {write: (value) => stderrChunks.push(value)},
      },
    );
    assert.equal(cliExit, 0);
    assert.equal(stdoutChunks.length, 1);
    assert.equal(stderrChunks.length, 0);
    assert.equal(await pathExists(fixture.formalOutputAbsolutePath), false);
  } finally {
    await fixture.cleanup();
  }
});

test('the exported report validator rejects each independently corrupted cross-field binding', async () => {
  const fixture = await makeRunnerFixture();
  try {
    const result = await runPresentationSegmenterBoundaryPreflightV001(fixture.jobRepositoryPath);
    assert.equal(result.exitCode, 0);
    const report = JSON.parse(result.stdout);
    const jobBytes = await readFile(fixture.jobPath);
    const inputSnapshots = [];
    for (const input of fixture.jobValue.inputs) {
      const bytes = await readFile(path.join(WORKSPACE_ROOT, input.path));
      inputSnapshots.push({
        role: input.role,
        path: input.path,
        firstFileSha256: sha256BytesV001(bytes),
        secondFileSha256: sha256BytesV001(bytes),
        document: JSON.parse(bytes.toString('utf8')),
        issues: [],
      });
    }
    const runtimeBinding = clone(report.runtimeBinding);
    const sourceSnapshot = {
      path: inputSnapshots[0].path,
      fileSha256: inputSnapshots[0].firstFileSha256,
    };
    const firstEvidence = buildPresentationSegmenterBoundaryEvidenceV001({
      artifactId: fixture.jobValue.artifactId,
      sourceArtifact: inputSnapshots[0].document,
      sourceArtifactSnapshot: sourceSnapshot,
      runtimeBinding,
    });
    const validatorInput = {
      report,
      expectedExitCode: 0,
      jobValue: fixture.jobValue,
      jobSnapshot: {
        path: fixture.jobRepositoryPath,
        firstFileSha256: sha256BytesV001(jobBytes),
        secondFileSha256: sha256BytesV001(jobBytes),
        issues: [],
      },
      inputSnapshots,
      runtimeBinding,
      evidencePasses: [firstEvidence, clone(firstEvidence)],
      readOnlyGuard: report.readOnlyGuard,
    };
    assert.equal(validatePresentationSegmenterBoundaryPreflightReportV001(validatorInput), true);

    const corruptions = [
      (input) => { input.report.status = 'failed'; },
      (input) => { input.report.checkReport.status = 'failed'; },
      (input) => { input.report.failureStage = 'segmentation'; },
      (input) => { input.report.job.fileSha256 = '0'.repeat(64); },
      (input) => { input.report.inputs[0].fileSha256 = '0'.repeat(64); },
      (input) => { input.jobSnapshot.firstFileSha256 = '0'.repeat(64); },
      (input) => { input.jobSnapshot.secondFileSha256 = '0'.repeat(64); },
      (input) => {
        input.jobSnapshot.secondFileSha256 = '0'.repeat(64);
        input.jobSnapshot.issues = ['hash_changed'];
      },
      (input) => { input.inputSnapshots[0].firstFileSha256 = '0'.repeat(64); },
      (input) => { input.inputSnapshots[0].secondFileSha256 = '0'.repeat(64); },
      (input) => {
        input.inputSnapshots[0].secondFileSha256 = '0'.repeat(64);
        input.inputSnapshots[0].issues = ['hash_changed'];
      },
      (input) => { input.evidencePasses[1].artifactId = 'changed-pass-two'; },
      (input) => { input.report.observedProjection.unknown = true; },
      (input) => { input.report.checkReport.observedProjection.sourceAtomCount = 'invalid'; },
      (input) => {
        input.report.observedProjection = {};
        input.report.checkReport.observedProjection = {};
      },
      (input) => {
        input.report.observedProjection.unknown = true;
        input.report.checkReport.observedProjection.unknown = true;
      },
    ];
    for (const corrupt of corruptions) {
      const input = clone(validatorInput);
      corrupt(input);
      assert.equal(validatePresentationSegmenterBoundaryPreflightReportV001(input), false);
    }

    for (const invalidOuter of [
      null,
      {},
      {...validatorInput, unknown: true},
      {...validatorInput, report: null},
    ]) {
      assert.doesNotThrow(() =>
        validatePresentationSegmenterBoundaryPreflightReportV001(invalidOuter));
      assert.equal(
        validatePresentationSegmenterBoundaryPreflightReportV001(invalidOuter),
        false,
      );
    }

    const implementationFailureJob = clone(fixture.jobValue);
    implementationFailureJob.jobId = `${implementationFailureJob.jobId}-validator-failure`;
    implementationFailureJob.implementationBinding.files[0].fileSha256 = '0'.repeat(64);
    const implementationFailurePath = path.join(
      fixture.jobDirectory,
      'validator-implementation-failure.json',
    );
    const implementationFailureBytes = serializeJsonFileV001(implementationFailureJob);
    await writeFile(implementationFailurePath, implementationFailureBytes);
    const implementationFailureRepositoryPath = toWorkspacePath(implementationFailurePath);
    const failureResult = await runPresentationSegmenterBoundaryPreflightV001(
      implementationFailureRepositoryPath,
    );
    assert.equal(failureResult.exitCode, 1);
    const failureReport = JSON.parse(failureResult.stderr);
    const failureValidatorInput = {
      ...validatorInput,
      report: failureReport,
      expectedExitCode: 1,
      jobValue: implementationFailureJob,
      jobSnapshot: {
        path: implementationFailureRepositoryPath,
        firstFileSha256: sha256BytesV001(implementationFailureBytes),
        secondFileSha256: sha256BytesV001(implementationFailureBytes),
        issues: [],
      },
      readOnlyGuard: failureReport.readOnlyGuard,
    };
    assert.equal(
      validatePresentationSegmenterBoundaryPreflightReportV001(failureValidatorInput),
      true,
    );
    const invalidObservedProjection = clone(failureValidatorInput);
    invalidObservedProjection.report.observedProjection = clone(report.observedProjection);
    invalidObservedProjection.report.checkReport.observedProjection = clone(
      report.observedProjection,
    );
    assert.equal(
      validatePresentationSegmenterBoundaryPreflightReportV001(invalidObservedProjection),
      false,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('stable reads detect replacement during and after reads for job, every input, and every implementation file', async () => {
  const fixture = await makeRunnerFixture();
  try {
    const production = createPresentationSegmenterBoundaryProductionFilesystemAdapterV001();
    const makeOpenHookAdapter = (targetAbsolutePath, behavior) => {
      let targetOpenCount = 0;
      return Object.freeze({
        openReadOnly: async (absolutePath) => {
          if (absolutePath !== targetAbsolutePath) return production.openReadOnly(absolutePath);
          targetOpenCount += 1;
          return behavior({absolutePath, count: targetOpenCount, production});
        },
        lstat: (...args) => production.lstat(...args),
        realpath: (...args) => production.realpath(...args),
        readdir: (...args) => production.readdir(...args),
      });
    };
    const changedBytesOnSecondOpen = async ({absolutePath, count, production: adapter}) => {
      const handle = await adapter.openReadOnly(absolutePath);
      if (count !== 2) return handle;
      return {
        stat: (...args) => handle.stat(...args),
        readFile: async () => Buffer.concat([await handle.readFile(), Buffer.from(' ')]),
        close: () => handle.close(),
      };
    };

    const targets = [
      {
        path: fixture.jobPath,
        code: 'SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH',
      },
      ...fixture.jobValue.inputs.map((input) => ({
        path: path.join(WORKSPACE_ROOT, input.path),
        code: 'SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH',
      })),
      ...fixture.jobValue.implementationBinding.files.map((file) => ({
        path: path.join(WORKSPACE_ROOT, file.path),
        code: 'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH',
      })),
    ];
    for (const target of targets) {
      const adapter = makeOpenHookAdapter(target.path, changedBytesOnSecondOpen);
      const result = await runPresentationSegmenterBoundaryPreflightV001(
        fixture.jobRepositoryPath,
        {filesystemAdapter: adapter},
      );
      assert.equal(result.exitCode, 1);
      const report = JSON.parse(result.stderr);
      assert.equal(collectCodes(report.checkReport).includes(target.code), true);
    }

    const sourceAbsolutePath = path.join(WORKSPACE_ROOT, fixture.jobValue.inputs[0].path);
    const changedDuringRead = makeOpenHookAdapter(
      sourceAbsolutePath,
      async ({absolutePath, count, production: adapter}) => {
        const handle = await adapter.openReadOnly(absolutePath);
        if (count !== 1) return handle;
        let statCount = 0;
        return {
          stat: async (...args) => {
            const stats = await handle.stat(...args);
            statCount += 1;
            if (statCount === 1) return stats;
            return {
              dev: stats.dev,
              ino: stats.ino,
              size: stats.size,
              mtimeNs: stats.mtimeNs + 1n,
              isFile: () => stats.isFile(),
            };
          },
          readFile: (...args) => handle.readFile(...args),
          close: () => handle.close(),
        };
      },
    );
    const duringResult = await runPresentationSegmenterBoundaryPreflightV001(
      fixture.jobRepositoryPath,
      {filesystemAdapter: changedDuringRead},
    );
    assert.equal(duringResult.exitCode, 1);
    assert.equal(
      collectCodes(JSON.parse(duringResult.stderr).checkReport)
        .includes('SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH'),
      true,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('runner rejects symbolic-link and non-regular observations for every input and implementation file', async () => {
  const fixture = await makeRunnerFixture();
  try {
    const production = createPresentationSegmenterBoundaryProductionFilesystemAdapterV001();
    const makeLstatAdapter = (targetAbsolutePath, kind) => Object.freeze({
      openReadOnly: (...args) => production.openReadOnly(...args),
      lstat: async (absolutePath) => {
        const stats = await production.lstat(absolutePath);
        if (absolutePath !== targetAbsolutePath) return stats;
        if (kind === 'symbolic-link') {
          return {
            isDirectory: () => false,
            isSymbolicLink: () => true,
            isFile: () => false,
          };
        }
        return {
          isDirectory: () => false,
          isSymbolicLink: () => false,
          isFile: () => false,
        };
      },
      realpath: (...args) => production.realpath(...args),
      readdir: (...args) => production.readdir(...args),
    });
    const targets = [
      ...fixture.jobValue.inputs.map((input) => ({
        absolutePath: path.join(WORKSPACE_ROOT, input.path),
        expectedCode: 'SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE',
      })),
      ...fixture.jobValue.implementationBinding.files.map((file) => ({
        absolutePath: path.join(WORKSPACE_ROOT, file.path),
        expectedCode: 'SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH',
      })),
    ];
    for (const {absolutePath, expectedCode} of targets) {
      for (const kind of ['symbolic-link', 'non-regular']) {
        const result = await runPresentationSegmenterBoundaryPreflightV001(
          fixture.jobRepositoryPath,
          {filesystemAdapter: makeLstatAdapter(absolutePath, kind)},
        );
        assert.equal(result.exitCode, 1);
        assert.equal(
          collectCodes(JSON.parse(result.stderr).checkReport).includes(expectedCode),
          true,
        );
        assert.equal(await pathExists(fixture.formalOutputAbsolutePath), false);
      }
    }
  } finally {
    await fixture.cleanup();
  }
});

test('core and runner keep the read-only static import boundary', async () => {
  const corePath = path.join(TEST_DIRECTORY, 'presentation_segmenter_boundary_evidence_v001.mjs');
  const runnerPath = path.join(
    TEST_DIRECTORY,
    'run_presentation_segmenter_boundary_preflight_v001.mjs',
  );
  const [coreSource, runnerSource] = await Promise.all([
    readFile(corePath, 'utf8'),
    readFile(runnerPath, 'utf8'),
  ]);

  assert.doesNotMatch(coreSource, /node:(?:fs|fs\/promises|child_process)/u);
  assert.doesNotMatch(coreSource, /\b(?:import\s*\(|createRequire\s*\()/u);
  assert.match(
    coreSource,
    /from ['"]\.\/presentation_retained_source_atoms_v001\.mjs['"]/u,
  );
  assert.equal(
    [...coreSource.matchAll(/from ['"]\.\//gu)].length,
    1,
    'core may import exactly the retained-source-atoms core inside the workspace',
  );

  assert.match(
    runnerSource,
    /import\s*\{\s*constants\s*,?\s*\}\s*from\s*['"]node:fs['"]/u,
  );
  assert.match(
    runnerSource,
    /import\s*\{[^}]*\bopen\b[^}]*\blstat\b[^}]*\brealpath\b[^}]*\breaddir\b[^}]*\}\s*from\s*['"]node:fs\/promises['"]/su,
  );
  assert.doesNotMatch(
    runnerSource,
    /\b(?:writeFile|appendFile|rename|mkdir|rm|unlink|copyFile|truncate|createWriteStream)\b/u,
  );
  assert.doesNotMatch(runnerSource, /node:child_process|\bcreateRequire\s*\(|\bimport\s*\(/u);
  assert.doesNotMatch(
    runnerSource,
    /process\.env|\b(?:report|checker|filesystemAdapter|expectedProjection)\s*=\s*JSON\.parse/u,
    'environment variables must not become a production injection channel',
  );
  assert.match(
    runnerSource,
    /from ['"]\.\/presentation_segmenter_boundary_evidence_v001\.mjs['"]/u,
  );
  assert.doesNotMatch(
    runnerSource,
    /from ['"]\.\/presentation_retained_source_atoms_v001\.mjs['"]/u,
  );
  assert.equal(
    [...runnerSource.matchAll(/from ['"]\.\//gu)].length,
    1,
    'runner may import exactly one workspace module',
  );
  for (const method of ['open', 'lstat', 'realpath', 'readdir']) {
    const directCalls = [...runnerSource.matchAll(new RegExp(`(?<!\\.)\\b${method}\\s*\\(`, 'gu'))];
    assert.equal(directCalls.length, 1, `${method} must be called directly only by the factory`);
  }
  assert.match(
    runnerSource,
    /open\(\s*pathValue,\s*constants\.O_RDONLY\s*\|\s*constants\.O_NOFOLLOW\s*,?\s*\)/su,
  );
  assert.match(
    runnerSource,
    /export function validatePresentationSegmenterBoundaryPreflightReportV001\s*\(/u,
  );
  assert.equal(
    [...runnerSource.matchAll(/validatePresentationSegmenterBoundaryPreflightReportV001\s*\(/gu)]
      .length >= 2,
    true,
    'production runner must call the same exported report validator exercised by tests',
  );
});
