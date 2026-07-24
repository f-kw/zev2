import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {
  lstat,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve, sep} from 'node:path';
import process from 'node:process';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import * as packageCore from './presentation_caption_semantic_source_package_v001.mjs';
import * as semanticCore from './presentation_caption_semantic_output_v001.mjs';
import * as semanticRunner from './run_presentation_caption_semantic_output_check_v001.mjs';

const PACKAGE_FILES = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);
const PACKAGE_CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'gateAContext',
  'evidenceBuild',
  'evidenceDeterminism',
  'embeddedReportBuild',
  'gateAReport',
  'packageBuild',
  'packageShape',
  'modelInput',
  'expansionMap',
  'sourceOnlyLeakage',
  'determinism',
]);
const SEMANTIC_CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'packageShape',
  'semanticOutput',
  'compilerBuild',
  'compilerInput',
  'deterministicExpansion',
  'determinism',
  'readOnlyCheck',
  'jobStability',
]);
const ALL_VIOLATION_CODES =
  packageCore.PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001;
const SEMANTIC_OWNED_CODES = Object.freeze(ALL_VIOLATION_CODES.slice(23, 47));
const PACKAGE_OWNED_CODE_PARTITION = Object.freeze([
  ...ALL_VIOLATION_CODES.slice(0, 23),
  ...ALL_VIOLATION_CODES.slice(47),
]);
const SEMANTIC_CHECK_BY_CODE = Object.freeze({
  CAPTION_B1_JOB_INVALID: ['jobBinding'],
  JOB_FILE_MISMATCH: ['jobStability'],
  IMPLEMENTATION_MISMATCH: ['implementationBinding'],
  INPUT_PATH_UNSAFE: ['inputBinding'],
  INPUT_HASH_MISMATCH: ['inputBinding'],
  RUNTIME_MISMATCH: ['runtimeBinding'],
  PACKAGE_FILE_SET_INVALID: ['packageShape'],
  PACKAGE_SCHEMA_INVALID: ['packageShape'],
  PACKAGE_STRICT_JSON_INVALID: ['packageShape'],
  PACKAGE_BINDING_MISMATCH: ['packageShape'],
  PACKAGE_HASH_MISMATCH: ['packageShape'],
  SEMANTIC_OUTPUT_BYTES_INVALID: ['semanticOutput'],
  SEMANTIC_OUTPUT_SCHEMA_INVALID: ['semanticOutput'],
  SEMANTIC_OUTPUT_FORBIDDEN_FIELD: ['semanticOutput'],
  SEMANTIC_CONTAINER_SET_INVALID: ['semanticOutput'],
  SEMANTIC_CONTAINER_ORDER_INVALID: ['semanticOutput'],
  SEMANTIC_GROUP_INVALID: ['semanticOutput'],
  SEMANTIC_LINE_COUNT_INVALID: ['semanticOutput'],
  SEMANTIC_BOUNDARY_ID_UNKNOWN: ['semanticOutput'],
  SEMANTIC_BOUNDARY_ID_CROSS_CONTAINER: ['semanticOutput'],
  SEMANTIC_BOUNDARY_ID_DUPLICATE: ['semanticOutput'],
  SEMANTIC_BOUNDARY_ORDER_INVALID: ['semanticOutput'],
  SEMANTIC_CONTAINER_END_MISSING: ['semanticOutput'],
  SEMANTIC_LINE_WIDTH_EXCEEDED: ['semanticOutput'],
  EXPANSION_CANDIDATE_MISSING: ['deterministicExpansion'],
  EXPANSION_CANDIDATE_DUPLICATED: ['deterministicExpansion'],
  EXPANSION_CANDIDATE_ORDER_REVERSED: ['deterministicExpansion'],
  EXPANSION_SOURCE_ATOM_MISSING: ['deterministicExpansion'],
  EXPANSION_SOURCE_ATOM_DUPLICATED: ['deterministicExpansion'],
  EXPANSION_SOURCE_ATOM_ORDER_REVERSED: ['deterministicExpansion'],
  EXPANSION_CONTAINER_CROSSED: ['deterministicExpansion'],
  EXPANSION_TEXT_MISMATCH: ['deterministicExpansion'],
  EXPANSION_ANCHOR_MISMATCH: ['deterministicExpansion'],
  COMPILER_INPUT_SCHEMA_INVALID: ['compilerInput'],
  COMPILER_INPUT_BINDING_MISMATCH: ['compilerInput'],
  BUILD_FAILED: ['compilerBuild'],
  NONDETERMINISTIC: ['determinism'],
  READ_ONLY_CONTRACT_VIOLATED: ['readOnlyCheck'],
});
const observedSemanticCodeChecks = new Set();
const LEAKAGE_CHECK_NAMES = Object.freeze([
  'schemaAllowlist',
  'taskDescriptionBinding',
  'sourceProjection',
  'widthPolicyBinding',
  'forbiddenProvenanceAbsence',
]);
const TASK_DESCRIPTION =
  '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、本文を変更せず、各行のlogicalWidth合計がmaxLogicalWidthPerLine以下になる意味の読める短い行へ分ける。連続する1行または2行を1つのmeaningGroupとしてまとめ、行末はboundaryCandidateIdで示す。';
const ROOT = '/workspace';
const WORKSPACE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ZERO_HASH = '0'.repeat(64);
const JOB_PATH =
  'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/synthetic-v001.json';
const PACKAGE_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/synthetic-v001';
const RAW_PATH =
  'evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/synthetic-v001.json';
const DIRECT = Object.freeze([
  ['packageCore',
    'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['semanticCore',
    'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunner',
    'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs'],
]);
const DEPENDENCIES = Object.freeze([
  ['textLayoutImplementation',
    'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore',
    'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore',
    'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner',
    'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
]);
const IMPLEMENTATION_SOURCES = Object.freeze({
  packageCore: [
    "import {createHash} from 'node:crypto';",
    "import {} from './presentation_renderer_text_layout_v001.mjs';",
    "import {} from './presentation_segmenter_boundary_evidence_v001.mjs';",
    "import {} from './run_presentation_segmenter_boundary_preflight_v001.mjs';",
    'export {createHash};',
    '',
  ].join('\n'),
  semanticCore: [
    "import {} from './presentation_caption_semantic_source_package_v001.mjs';",
    'export {};',
    '',
  ].join('\n'),
  semanticRunner: [
    "import {} from 'node:crypto';",
    "import {} from 'node:fs';",
    "import {} from 'node:fs/promises';",
    "import {} from 'node:path';",
    "import {} from 'node:url';",
    "import process from 'node:process';",
    "import {} from './presentation_caption_semantic_source_package_v001.mjs';",
    "import {} from './presentation_caption_semantic_output_v001.mjs';",
    'export {process};',
    '',
  ].join('\n'),
  textLayoutImplementation: 'export const layout = 1;\n',
  gateACore: [
    "import {} from 'node:crypto';",
    "import {} from 'node:path';",
    "import {} from 'node:url';",
    "import {} from './presentation_retained_source_atoms_v001.mjs';",
    'export {};',
    '',
  ].join('\n'),
  gateARetainedSourceAtomsCore: [
    "import {} from 'node:crypto';",
    'export {};',
    '',
  ].join('\n'),
  gateARunner: [
    "import {} from 'node:crypto';",
    "import {} from 'node:fs';",
    "import {} from 'node:fs/promises';",
    "import {} from 'node:path';",
    "import {} from 'node:url';",
    "import {} from './presentation_segmenter_boundary_evidence_v001.mjs';",
    'export {};',
    '',
  ].join('\n'),
});

const clone = (value) => {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
  }
  return value;
};
const serialized = (value) => {
  const result = packageCore.serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const canonicalBytes = (value) => {
  const result = packageCore.canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return result.bytes;
};
const sha = (bytes) => {
  const result = packageCore.sha256PresentationCaptionB1BytesV001(bytes);
  assert.equal(result.status, 'hashed');
  return result.sha256;
};
const canonicalSha = (value) => sha(canonicalBytes(value));
const stat = (bytes, overrides = {}) => ({
  kind: 'regular-file',
  dev: '1',
  ino: '1',
  size: String(bytes.length),
  mtimeNs: '1',
  nlink: '1',
  ...overrides,
});
const snapshot = (path, bytes, overrides = {}) => {
  const stats = stat(bytes, overrides.stat);
  return {
    path,
    bytes: Buffer.from(bytes),
    fileSha256: sha(bytes),
    pathLstatBeforeOpen: {...stats},
    fdStatAfterOpen: {...stats},
    fdStatAfterRead: {...stats},
    pathResolutionObservation: {
      workspaceRootRealPath: ROOT,
      lexicalWorkspaceRelativePath: path,
      targetRealPath: `${ROOT}/${path}`,
      ancestors: [],
    },
  };
};
const observation = (role, path, bytes, overrides = {}) => ({
  role,
  path,
  status: 'read',
  snapshot: snapshot(path, bytes, overrides),
});
const artifactBytes = (value, embedded = false) => embedded
  ? Buffer.concat([canonicalBytes(value), Buffer.from('\n', 'utf8')])
  : serialized(value);
const artifactRecord = (fileName, value, embedded = false) => {
  const bytes = artifactBytes(value, embedded);
  return {
    fileName,
    value,
    bytes,
    fileSha256: sha(bytes),
    canonicalSha256: canonicalSha(value),
  };
};
const anchor = (atomId, edge) => ({atomId, edge});
const runtime = (
  nodeBytes = Buffer.from('synthetic-node', 'utf8'),
  overrides = {},
) => {
  const stats = stat(nodeBytes);
  const base = {
    nodeBinaryInput: {
      role: 'nodeBinary',
      status: 'read',
      snapshot: {
        path: '/usr/bin/node',
        bytes: Buffer.from(nodeBytes),
        fileSha256: sha(nodeBytes),
        pathLstatBeforeOpen: {...stats},
        fdStatAfterOpen: {...stats},
        fdStatAfterRead: {...stats},
        externalPathResolutionObservation: {
          inputAbsolutePath: '/usr/bin/node',
          targetRealPath: '/usr/bin/node',
          ancestors: [],
        },
      },
    },
    nodeVersion: 'v20.0.0',
    icuVersion: '75.1',
    resolvedLocale: 'ja',
    resolvedGranularity: 'word',
    diagnostics: {
      resolvedNodePath: '/usr/bin/node',
      platform: 'synthetic',
      arch: 'synthetic',
      v8Version: 'synthetic',
      unicodeVersion: 'synthetic',
      cldrVersion: 'synthetic',
    },
  };
  return {
    ...base,
    ...overrides,
    diagnostics: {
      ...base.diagnostics,
      ...(overrides.diagnostics ?? {}),
    },
  };
};
const runtimeBinding = (value) => ({
  nodeBinarySha256: value.nodeBinaryInput.snapshot.fileSha256,
  nodeVersion: value.nodeVersion,
  icuVersion: value.icuVersion,
  resolvedLocale: value.resolvedLocale,
  resolvedGranularity: value.resolvedGranularity,
  diagnostics: {
    nodeExecutableFileName: 'node',
    platform: value.diagnostics.platform,
    arch: value.diagnostics.arch,
    v8Version: value.diagnostics.v8Version,
    unicodeVersion: value.diagnostics.unicodeVersion,
    cldrVersion: value.diagnostics.cldrVersion,
  },
});
const gateRuntimeBinding = (value) => ({
  nodeBinarySha256: value.nodeBinaryInput.snapshot.fileSha256,
  nodeVersion: value.nodeVersion,
  icuVersion: value.icuVersion,
  resolvedLocale: value.resolvedLocale,
  resolvedGranularity: value.resolvedGranularity,
  diagnostics: {
    resolvedNodePath: value.diagnostics.resolvedNodePath,
    platform: value.diagnostics.platform,
    arch: value.diagnostics.arch,
    v8Version: value.diagnostics.v8Version,
    unicodeVersion: value.diagnostics.unicodeVersion,
    cldrVersion: value.diagnostics.cldrVersion,
  },
});

const makePackage = (runtimeValue, semanticBindings) => {
  const candidates = [
    {
      boundaryCandidateId: 'segmenter-boundary-000001',
      containerId: 'segmenter-container-000001',
      timelineSegmentId: 'timeline-segment-000001',
      speechId: 1,
      sourceAtomIds: ['atom-000001', 'atom-000002'],
      text: 'aaaaaaaaaaaaaaaaaaaa',
      startAnchor: anchor('atom-000001', 'start'),
      endAnchor: anchor('atom-000002', 'end'),
      segmenterIndexUtf16: 0,
      segmenterLengthUtf16: 20,
      isWordLike: true,
      sourceAtomCount: 2,
    },
    {
      boundaryCandidateId: 'segmenter-boundary-000002',
      containerId: 'segmenter-container-000001',
      timelineSegmentId: 'timeline-segment-000001',
      speechId: 1,
      sourceAtomIds: ['atom-000003'],
      text: 'bbbbbbbbbbbbbbbbbbbb',
      startAnchor: anchor('atom-000003', 'start'),
      endAnchor: anchor('atom-000003', 'end'),
      segmenterIndexUtf16: 20,
      segmenterLengthUtf16: 20,
      isWordLike: true,
      sourceAtomCount: 1,
    },
    {
      boundaryCandidateId: 'segmenter-boundary-000003',
      containerId: 'segmenter-container-000002',
      timelineSegmentId: 'timeline-segment-000002',
      speechId: 2,
      sourceAtomIds: ['atom-000004'],
      text: '猫',
      startAnchor: anchor('atom-000004', 'start'),
      endAnchor: anchor('atom-000004', 'end'),
      segmenterIndexUtf16: 0,
      segmenterLengthUtf16: 1,
      isWordLike: true,
      sourceAtomCount: 1,
    },
  ];
  const membership = candidates.map((candidate) => ({
    boundaryCandidateId: candidate.boundaryCandidateId,
    sourceAtomIds: [...candidate.sourceAtomIds],
  }));
  const evidence = {
    schemaVersion: 'presentation-segmenter-boundary-evidence-v001',
    artifactId: 'synthetic-artifact-v001',
    generatorVersion: 'presentation-segmenter-boundary-evidence-generator-v001',
    sourceBinding: {
      sourceArtifactId: 'synthetic-source-v001',
      sourceArtifactPath: 'evals/clip_composition/testdata/synthetic-source.json',
      sourceArtifactFileSha256: '1'.repeat(64),
      sourceArtifactCanonicalSha256: '2'.repeat(64),
      sourceRef: 'synthetic',
      sourceProvenance: 'synthetic-test',
      atomGranularity: 'character-timestamp',
      rawSourceAtomsCanonicalSha256: '3'.repeat(64),
    },
    runtimeBinding: gateRuntimeBinding(runtimeValue),
    segmentationPolicy: {
      policyVersion: 'presentation-segmenter-boundary-policy-v001',
      engine: 'Intl.Segmenter',
      locale: 'ja',
      granularity: 'word',
      indexUnit: 'utf16-code-unit',
      containerRule: 'maximal-contiguous-run-by-timeline-segment-and-speech-v001',
      candidateIdRule: 'source-order-six-digit-v001',
      unicodeNormalization: 'none',
    },
    boundaryCandidates: candidates,
    boundaryCandidatesCanonicalSha256: canonicalSha(candidates),
    sourceAtomMembershipCanonicalSha256: canonicalSha(membership),
  };
  const gateAProjection = {
    sourceAtomCount: 4,
    containerCount: 2,
    boundaryCandidateCount: 3,
    wordLikeCandidateCount: 3,
    nonWordLikeCandidateCount: 0,
    timelineSegments: [
      {
        timelineSegmentId: 'timeline-segment-000001',
        sourceAtomCount: 3,
        boundaryCandidateCount: 2,
      },
      {
        timelineSegmentId: 'timeline-segment-000002',
        sourceAtomCount: 1,
        boundaryCandidateCount: 1,
      },
    ],
    containers: [
      {
        containerId: 'segmenter-container-000001',
        timelineSegmentId: 'timeline-segment-000001',
        speechId: 1,
        sourceAtomCount: 3,
        boundaryCandidateCount: 2,
      },
      {
        containerId: 'segmenter-container-000002',
        timelineSegmentId: 'timeline-segment-000002',
        speechId: 2,
        sourceAtomCount: 1,
        boundaryCandidateCount: 1,
      },
    ],
    mixedRawSpeakerCandidateCount: 0,
    rawSpeakerExactSetQueryResults: [{
      values: [null],
      boundaryCandidateCount: 3,
    }],
    sourcePositiveOverlapCount: 0,
    membership: {
      missingCount: 0,
      duplicatedCount: 0,
      orderReversedCount: 0,
      crossSegmentCount: 0,
      crossSpeechCount: 0,
    },
  };
  const embedded = {
    schemaVersion: 'presentation-segmenter-boundary-preflight-report-v001',
    status: 'passed',
    failureStage: null,
    job: {
      jobId: 'synthetic-gate-a-job-v001',
      path: 'evals/clip_composition/testdata/gate-a-job.json',
      fileSha256: '1'.repeat(64),
    },
    inputs: [
      {
        role: 'sourceAtoms',
        path: evidence.sourceBinding.sourceArtifactPath,
        fileSha256: evidence.sourceBinding.sourceArtifactFileSha256,
      },
      {
        role: 'sourceGenerationManifest',
        path: 'evals/clip_composition/testdata/source-manifest.json',
        fileSha256: '4'.repeat(64),
      },
      {
        role: 'sourceValidationReport',
        path: 'evals/clip_composition/testdata/source-report.json',
        fileSha256: '6'.repeat(64),
      },
    ],
    runtimeBinding: gateRuntimeBinding(runtimeValue),
    observedProjection: clone(gateAProjection),
    evidence: {
      artifactId: evidence.artifactId,
      canonicalSha256: canonicalSha(evidence),
      boundaryCandidatesCanonicalSha256: evidence.boundaryCandidatesCanonicalSha256,
      sourceAtomMembershipCanonicalSha256: evidence.sourceAtomMembershipCanonicalSha256,
    },
    readOnlyGuard: {
      formalOutputPath:
        'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/synthetic-v001',
      watchedAncestorPath: 'evals/clip_composition/outputs/presentation',
      before: {
        formalPathState: 'absent',
        entryCount: 0,
        entriesCanonicalSha256: ZERO_HASH,
      },
      after: {
        formalPathState: 'absent',
        entryCount: 0,
        entriesCanonicalSha256: ZERO_HASH,
      },
    },
    checkReport: {
      schemaVersion: 'presentation-segmenter-boundary-check-report-v001',
      status: 'passed',
      artifactId: evidence.artifactId,
      checks: [
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
      ].map((name) => ({
        name,
        status: 'passed',
        violationCodes: [],
      })),
      observedProjection: clone(gateAProjection),
      violations: [],
    },
  };
  const sourceInput = {
    schemaVersion: 'presentation-caption-semantic-source-input-v001',
    taskDescription: TASK_DESCRIPTION,
    displayConstraints: {
      maxLogicalWidthPerLine: 36,
      maxLinesPerMeaningGroup: 2,
    },
    containers: [
      {
        containerId: 'segmenter-container-000001',
        text: candidates[0].text + candidates[1].text,
        boundaryCandidates: [
          {
            boundaryCandidateId: candidates[0].boundaryCandidateId,
            text: candidates[0].text,
            logicalWidth: 20,
          },
          {
            boundaryCandidateId: candidates[1].boundaryCandidateId,
            text: candidates[1].text,
            logicalWidth: 20,
          },
        ],
      },
      {
        containerId: 'segmenter-container-000002',
        text: candidates[2].text,
        boundaryCandidates: [{
          boundaryCandidateId: candidates[2].boundaryCandidateId,
          text: candidates[2].text,
          logicalWidth: 2,
        }],
      },
    ],
  };
  const evidenceArtifact = artifactRecord(PACKAGE_FILES[0], evidence);
  const embeddedArtifact = artifactRecord(PACKAGE_FILES[1], embedded, true);
  const sourceInputArtifact = artifactRecord(PACKAGE_FILES[2], sourceInput);
  const expansionMap = {
    schemaVersion: 'presentation-caption-semantic-expansion-map-v001',
    artifactId: evidence.artifactId,
    sourceBindings: {
      sourceAtoms: {
        path: evidence.sourceBinding.sourceArtifactPath,
        fileSha256: evidence.sourceBinding.sourceArtifactFileSha256,
        canonicalSha256: evidence.sourceBinding.sourceArtifactCanonicalSha256,
      },
      boundaryEvidence: {
        fileName: PACKAGE_FILES[0],
        fileSha256: evidenceArtifact.fileSha256,
        canonicalSha256: evidenceArtifact.canonicalSha256,
        boundaryCandidatesCanonicalSha256: evidence.boundaryCandidatesCanonicalSha256,
        sourceAtomMembershipCanonicalSha256: evidence.sourceAtomMembershipCanonicalSha256,
      },
    },
    widthPolicyBinding: {
      presetRegistry: {
        path: 'evals/clip_composition/testdata/preset-registry.json',
        fileSha256: '4'.repeat(64),
        canonicalSha256: '5'.repeat(64),
      },
      presetValidationIndex: {
        path: 'evals/clip_composition/testdata/preset-validation-index.json',
        fileSha256: '6'.repeat(64),
        canonicalSha256: '7'.repeat(64),
      },
      materialValidationIndex: {
        path: 'evals/clip_composition/testdata/material-validation-index.json',
        fileSha256: '8'.repeat(64),
        canonicalSha256: '9'.repeat(64),
      },
      registryBinding: {
        path: 'evals/clip_composition/testdata/registry-binding.json',
        fileSha256: 'a'.repeat(64),
        canonicalSha256: 'b'.repeat(64),
      },
      rendererTrust: {
        path: 'evals/clip_composition/testdata/renderer-trust.json',
        fileSha256: 'c'.repeat(64),
        canonicalSha256: 'd'.repeat(64),
      },
      rendererTrustImplementation: {
        path: 'evals/clip_composition/presentation_renderer_trust_v001.mjs',
        fileSha256: 'e'.repeat(64),
      },
      textLayoutImplementation: {
        path: DEPENDENCIES[0][1],
        fileSha256: semanticBindings.dependencyFiles[0].fileSha256,
      },
      presetId: 'normal-landscape-readable-pop-v001',
      visualStateId: 'caption-core-v001',
      maxLogicalWidthPerLine: 36,
      maxLinesPerMeaningGroup: 2,
      characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
    },
    modelInputBinding: {
      fileName: PACKAGE_FILES[2],
      fileSha256: sourceInputArtifact.fileSha256,
      canonicalSha256: sourceInputArtifact.canonicalSha256,
    },
    containers: [
      {
        containerId: 'segmenter-container-000001',
        timelineSegmentId: 'timeline-segment-000001',
        speechId: 1,
        candidates: candidates.slice(0, 2).map((candidate) => ({
          boundaryCandidateId: candidate.boundaryCandidateId,
          sourceAtomIds: [...candidate.sourceAtomIds],
          startAnchor: clone(candidate.startAnchor),
          endAnchor: clone(candidate.endAnchor),
          logicalWidth: 20,
        })),
      },
      {
        containerId: 'segmenter-container-000002',
        timelineSegmentId: 'timeline-segment-000002',
        speechId: 2,
        candidates: [{
          boundaryCandidateId: candidates[2].boundaryCandidateId,
          sourceAtomIds: [...candidates[2].sourceAtomIds],
          startAnchor: clone(candidates[2].startAnchor),
          endAnchor: clone(candidates[2].endAnchor),
          logicalWidth: 2,
        }],
      },
    ],
  };
  const expansionArtifact = artifactRecord(PACKAGE_FILES[3], expansionMap);
  const leakage = {
    schemaVersion: 'presentation-caption-source-only-leakage-report-v001',
    status: 'passed',
    failureStage: null,
    modelInputBinding: {
      packageFileName: PACKAGE_FILES[2],
      fileSha256: sourceInputArtifact.fileSha256,
      canonicalSha256: sourceInputArtifact.canonicalSha256,
    },
    sourceBindings: {
      sourceAtomsCanonicalSha256: expansionMap.sourceBindings.sourceAtoms.canonicalSha256,
      boundaryEvidenceCanonicalSha256: evidenceArtifact.canonicalSha256,
      expansionMapCanonicalSha256: expansionArtifact.canonicalSha256,
      presetRegistryCanonicalSha256:
        expansionMap.widthPolicyBinding.presetRegistry.canonicalSha256,
      presetValidationIndexCanonicalSha256:
        expansionMap.widthPolicyBinding.presetValidationIndex.canonicalSha256,
      materialValidationIndexCanonicalSha256:
        expansionMap.widthPolicyBinding.materialValidationIndex.canonicalSha256,
      registryBindingCanonicalSha256:
        expansionMap.widthPolicyBinding.registryBinding.canonicalSha256,
      rendererTrustCanonicalSha256:
        expansionMap.widthPolicyBinding.rendererTrust.canonicalSha256,
      rendererTrustImplementationFileSha256:
        expansionMap.widthPolicyBinding.rendererTrustImplementation.fileSha256,
      textLayoutImplementationFileSha256:
        expansionMap.widthPolicyBinding.textLayoutImplementation.fileSha256,
    },
    checks: LEAKAGE_CHECK_NAMES.map((name) => ({
      name,
      status: 'passed',
      violationCodes: [],
    })),
    violations: [],
  };
  const leakageArtifact = artifactRecord(PACKAGE_FILES[4], leakage);
  const contentArtifacts = [
    evidenceArtifact,
    embeddedArtifact,
    sourceInputArtifact,
    expansionArtifact,
    leakageArtifact,
  ];
  const manifest = {
    schemaVersion: 'presentation-caption-semantic-source-package-manifest-v001',
    packageId: 'synthetic-package-v001',
    artifactId: evidence.artifactId,
    formalOutputPath: PACKAGE_ROOT,
    packageJobBinding: {
      path: 'evals/clip_composition/testdata/package-job.json',
      fileSha256: 'f'.repeat(64),
    },
    sourceGateBinding: {
      gateAJob: {
        path: 'evals/clip_composition/testdata/gate-a-job.json',
        fileSha256: '1'.repeat(64),
      },
      gateACompletionReport: {
        path: 'evals/clip_composition/testdata/gate-a-report.json',
        fileSha256: '2'.repeat(64),
      },
      expectedEvidenceHashes: {
        boundaryCandidatesCanonicalSha256: evidence.boundaryCandidatesCanonicalSha256,
        sourceAtomMembershipCanonicalSha256: evidence.sourceAtomMembershipCanonicalSha256,
        evidenceCanonicalSha256: evidenceArtifact.canonicalSha256,
      },
      gateAImplementationFiles: semanticBindings.dependencyFiles.slice(1).map((entry) => ({
        role: entry.role,
        path: entry.path,
        fileSha256: entry.fileSha256,
      })),
      embeddedReport: {
        fileName: PACKAGE_FILES[1],
        fileSha256: embeddedArtifact.fileSha256,
        canonicalSha256: embeddedArtifact.canonicalSha256,
      },
    },
    implementationBinding: {
      files: [
        {
          role: 'packageCore',
          path: DIRECT[0][1],
          fileSha256: semanticBindings.files[0].fileSha256,
        },
        {
          role: 'packageRunner',
          path: 'evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs',
          fileSha256: '3'.repeat(64),
        },
        {
          role: 'rendererTrustImplementation',
          path: expansionMap.widthPolicyBinding.rendererTrustImplementation.path,
          fileSha256: expansionMap.widthPolicyBinding.rendererTrustImplementation.fileSha256,
        },
      ],
      dependencyFiles: [],
    },
    runtimeBinding: runtimeBinding(runtimeValue),
    externalInputBindings: [
      ['sourceAtoms', evidence.sourceBinding.sourceArtifactPath,
        evidence.sourceBinding.sourceArtifactFileSha256,
        evidence.sourceBinding.sourceArtifactCanonicalSha256],
      ['sourceGenerationManifest', 'evals/clip_composition/testdata/source-manifest.json',
        '4'.repeat(64), '5'.repeat(64)],
      ['sourceValidationReport', 'evals/clip_composition/testdata/source-report.json',
        '6'.repeat(64), '7'.repeat(64)],
      ['presetRegistry', expansionMap.widthPolicyBinding.presetRegistry.path,
        expansionMap.widthPolicyBinding.presetRegistry.fileSha256,
        expansionMap.widthPolicyBinding.presetRegistry.canonicalSha256],
      ['presetValidationIndex', expansionMap.widthPolicyBinding.presetValidationIndex.path,
        expansionMap.widthPolicyBinding.presetValidationIndex.fileSha256,
        expansionMap.widthPolicyBinding.presetValidationIndex.canonicalSha256],
      ['materialValidationIndex', expansionMap.widthPolicyBinding.materialValidationIndex.path,
        expansionMap.widthPolicyBinding.materialValidationIndex.fileSha256,
        expansionMap.widthPolicyBinding.materialValidationIndex.canonicalSha256],
      ['registryBinding', expansionMap.widthPolicyBinding.registryBinding.path,
        expansionMap.widthPolicyBinding.registryBinding.fileSha256,
        expansionMap.widthPolicyBinding.registryBinding.canonicalSha256],
      ['rendererTrust', expansionMap.widthPolicyBinding.rendererTrust.path,
        expansionMap.widthPolicyBinding.rendererTrust.fileSha256,
        expansionMap.widthPolicyBinding.rendererTrust.canonicalSha256],
      ['textLayoutImplementation', DEPENDENCIES[0][1],
        semanticBindings.dependencyFiles[0].fileSha256, null],
    ].map(([role, path, fileSha256, canonicalSha256]) => ({
      role,
      path,
      fileSha256,
      canonicalSha256,
    })),
    contentArtifacts: contentArtifacts.map((artifact, index) => ({
      role: [
        'boundaryEvidence',
        'embeddedGateAReport',
        'semanticSourceInput',
        'deterministicExpansionMap',
        'sourceOnlyLeakageReport',
      ][index],
      fileName: artifact.fileName,
      fileSha256: artifact.fileSha256,
      canonicalSha256: artifact.canonicalSha256,
    })),
    validationReportDeclaration: {
      fileName: PACKAGE_FILES[6],
      schemaVersion: 'presentation-caption-semantic-source-package-validation-report-v001',
      selfHashPolicy: 'report-is-not-hashed-by-manifest-v001',
    },
    contentSetCanonicalSha256: null,
  };
  manifest.contentSetCanonicalSha256 = canonicalSha(manifest.contentArtifacts);
  const manifestArtifact = artifactRecord(PACKAGE_FILES[5], manifest);
  const report = {
    schemaVersion: 'presentation-caption-semantic-source-package-validation-report-v001',
    status: 'passed',
    failureStage: null,
    jobBinding: {
      path: manifest.packageJobBinding.path,
      fileSha256: manifest.packageJobBinding.fileSha256,
    },
    package: {
      packageId: manifest.packageId,
      artifactId: manifest.artifactId,
      formalOutputPath: manifest.formalOutputPath,
    },
    manifestBinding: {
      fileName: PACKAGE_FILES[5],
      fileSha256: manifestArtifact.fileSha256,
      canonicalSha256: manifestArtifact.canonicalSha256,
    },
    checks: PACKAGE_CHECK_NAMES.map((name) => ({
      name,
      status: 'passed',
      violationCodes: [],
    })),
    violations: [],
    validatedContentArtifacts: clone(manifest.contentArtifacts),
    observedProjection: {
      sourceAtomCount: 4,
      containerCount: 2,
      boundaryCandidateCount: 3,
      containers: [
        {
          containerId: 'segmenter-container-000001',
          sourceAtomCount: 3,
          boundaryCandidateCount: 2,
        },
        {
          containerId: 'segmenter-container-000002',
          sourceAtomCount: 1,
          boundaryCandidateCount: 1,
        },
      ],
      maximumObservedCandidateLogicalWidth: 20,
    },
    scope: {
      validatedState: 'source-package-only',
      postPublishValidationRequired: true,
      semanticQualityVerified: false,
      naturalBreakQualityVerified: false,
      nonCooperativePublicationRaceProtected: false,
    },
  };
  return [
    ...contentArtifacts,
    manifestArtifact,
    artifactRecord(PACKAGE_FILES[6], report),
  ];
};

const makeFixture = ({
  abstained = false,
  runtimeValue: suppliedRuntime = null,
  implementationSources = IMPLEMENTATION_SOURCES,
} = {}) => {
  const runtimeValue = suppliedRuntime ?? runtime();
  const implementationInputs = [...DIRECT, ...DEPENDENCIES].map(([role, path]) => {
    const source = implementationSources[role];
    const bytes = Buffer.isBuffer(source)
      ? Buffer.from(source)
      : Buffer.from(source, 'utf8');
    return observation(role, path, bytes);
  });
  const semanticBindings = {
    gitCommit: 'a'.repeat(40),
    files: implementationInputs.slice(0, 3).map((entry) => ({
      role: entry.role,
      path: entry.path,
      fileSha256: entry.snapshot.fileSha256,
    })),
    dependencyFiles: implementationInputs.slice(3).map((entry) => ({
      role: entry.role,
      path: entry.path,
      fileSha256: entry.snapshot.fileSha256,
    })),
  };
  const packageArtifacts = makePackage(runtimeValue, semanticBindings);
  const rawValue = abstained
    ? {status: 'abstained'}
    : {
      status: 'complete',
      containers: [
        {
          containerId: 'segmenter-container-000001',
          meaningGroups: [{
            lineEndBoundaryCandidateIds: [
              'segmenter-boundary-000001',
              'segmenter-boundary-000002',
            ],
          }],
        },
        {
          containerId: 'segmenter-container-000002',
          meaningGroups: [{
            lineEndBoundaryCandidateIds: ['segmenter-boundary-000003'],
          }],
        },
      ],
    };
  const rawBytes = serialized(rawValue);
  const beforeEntries = [];
  const job = {
    schemaVersion: 'presentation-caption-semantic-output-check-job-v001',
    jobId: 'synthetic-semantic-job-v001',
    artifactId: 'synthetic-artifact-v001',
    mode: 'read-only-check',
    implementationBinding: semanticBindings,
    sourcePackageBinding: {
      rootPath: PACKAGE_ROOT,
      manifest: {
        path: `${PACKAGE_ROOT}/${PACKAGE_FILES[5]}`,
        fileSha256: packageArtifacts[5].fileSha256,
        canonicalSha256: packageArtifacts[5].canonicalSha256,
      },
      validationReport: {
        path: `${PACKAGE_ROOT}/${PACKAGE_FILES[6]}`,
        fileSha256: packageArtifacts[6].fileSha256,
        canonicalSha256: packageArtifacts[6].canonicalSha256,
      },
    },
    semanticOutputBinding: {
      path: RAW_PATH,
      fileSha256: sha(rawBytes),
    },
    expectedRuntime: {
      nodeBinarySha256: runtimeValue.nodeBinaryInput.snapshot.fileSha256,
      nodeVersion: runtimeValue.nodeVersion,
      icuVersion: runtimeValue.icuVersion,
      resolvedLocale: runtimeValue.resolvedLocale,
      resolvedGranularity: runtimeValue.resolvedGranularity,
    },
    expectedProjection: {
      sourceAtomCount: 4,
      containerCount: 2,
      boundaryCandidateCount: 3,
    },
    readOnlyGuard: {
      watchedRoot: 'evals/clip_composition/outputs/presentation',
      excludedPaths: [JOB_PATH],
      expectedBeforeCanonicalSha256: canonicalSha(beforeEntries),
    },
  };
  const jobBytes = serialized(job);
  const jobSnapshot = snapshot(JOB_PATH, jobBytes);
  const artifactReads = packageArtifacts.map((artifact) => ({
    fileName: artifact.fileName,
    status: 'read',
    snapshot: snapshot(`${PACKAGE_ROOT}/${artifact.fileName}`, artifact.bytes),
    observedKind: 'regular-file',
    failurePoint: null,
  }));
  const rawInput = observation('rawSemanticOutput', RAW_PATH, rawBytes);
  const compilerContext = {
    sourcePackageSnapshots: artifactReads.map((entry) => entry.snapshot),
    rawSemanticOutputSnapshot: rawInput.snapshot,
  };
  const compilerValue = abstained
    ? null
    : semanticCore.buildPresentationCaptionSemanticCompilerInputV001(compilerContext);
  const compilerPass = compilerValue === null
    ? null
    : (() => {
      const bytes = serialized(compilerValue);
      return {
        value: compilerValue,
        bytes,
        fileSha256: sha(bytes),
        canonicalSha256: canonicalSha(compilerValue),
        inputByteCopies: [],
      };
    })();
  const sourcePackageObservation = {
    directoryEntries: PACKAGE_FILES
      .map((name) => ({name, kind: 'file'}))
      .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)),
    artifactReads,
  };
  const initialInputs = [
    ...implementationInputs.map((entry) => ({role: entry.role, observation: entry})),
    ...artifactReads.map((entry) => ({
      role: `sourcePackage.${entry.fileName}`,
      observation: {
        role: `sourcePackage.${entry.fileName}`,
        path: entry.snapshot.path,
        status: 'read',
        snapshot: entry.snapshot,
      },
    })),
    {role: 'rawSemanticOutput', observation: rawInput},
    {role: 'nodeBinary', observation: runtimeValue.nodeBinaryInput},
  ];
  return {
    contextPhase: 'final-report',
    job: {
      value: job,
      initialSnapshot: jobSnapshot,
      preReportInput: {
        role: 'job',
        path: JOB_PATH,
        status: 'read',
        snapshot: jobSnapshot,
      },
    },
    implementationInputs,
    sourcePackageObservation,
    rawSemanticOutputInput: rawInput,
    runtimeObservation: runtimeValue,
    compilerBuildPasses: abstained ? [] : [clone(compilerPass), clone(compilerPass)],
    buildFailure: null,
    readOnlyProcessObservation: {
      mode: 'observed',
      beforeEntries,
      afterEntries: clone(beforeEntries),
      inputReread: {
        status: 'completed',
        initialInputs,
        finalInputs: clone(initialInputs),
      },
      attemptedWriteCalls: [],
    },
  };
};

const refreshJobSnapshots = (context) => {
  const bytes = serialized(context.job.value);
  context.job.initialSnapshot = snapshot(JOB_PATH, bytes);
  context.job.preReportInput = {
    role: 'job',
    path: JOB_PATH,
    status: 'read',
    snapshot: snapshot(JOB_PATH, bytes),
  };
};
const replaceRaw = (context, valueOrBytes) => {
  const bytes = Buffer.isBuffer(valueOrBytes) ? valueOrBytes : serialized(valueOrBytes);
  context.job.value.semanticOutputBinding.fileSha256 = sha(bytes);
  context.rawSemanticOutputInput = observation('rawSemanticOutput', RAW_PATH, bytes);
  const reread = context.readOnlyProcessObservation.inputReread;
  for (const entries of [reread.initialInputs, reread.finalInputs]) {
    const raw = entries.find((entry) => entry.role === 'rawSemanticOutput');
    raw.observation = clone(context.rawSemanticOutputInput);
  }
  refreshJobSnapshots(context);
};
const replaceImplementationSource = (context, role, sourceText) => {
  const index = context.implementationInputs.findIndex((entry) => entry.role === role);
  assert.equal(index >= 0, true, role);
  const original = context.implementationInputs[index];
  const sourceBytes = Buffer.isBuffer(sourceText)
    ? Buffer.from(sourceText)
    : Buffer.from(sourceText, 'utf8');
  const replacement = observation(
    role,
    original.path,
    sourceBytes,
  );
  context.implementationInputs[index] = replacement;
  const bindings = index < 3
    ? context.job.value.implementationBinding.files
    : context.job.value.implementationBinding.dependencyFiles;
  const bindingIndex = index < 3 ? index : index - 3;
  bindings[bindingIndex].fileSha256 = replacement.snapshot.fileSha256;
  const reread = context.readOnlyProcessObservation.inputReread;
  for (const entries of [reread.initialInputs, reread.finalInputs]) {
    const matched = entries.find((entry) => entry.role === role);
    matched.observation = clone(replacement);
  }
  refreshJobSnapshots(context);
};
const replacePackageArtifact = (context, index, value) => {
  const entry = context.sourcePackageObservation.artifactReads[index];
  const bytes = artifactBytes(value, index === 1);
  entry.snapshot = snapshot(entry.snapshot.path, bytes);
};
const replaceCompilerPasses = (context, mutate, {secondOnly = false} = {}) => {
  const indexes = secondOnly ? [1] : [0, 1];
  for (const index of indexes) {
    const value = clone(context.compilerBuildPasses[index].value);
    mutate(value, index);
    const bytes = serialized(value);
    context.compilerBuildPasses[index] = {
      value,
      bytes,
      fileSha256: sha(bytes),
      canonicalSha256: canonicalSha(value),
      inputByteCopies: [],
    };
  }
};
const checked = (context) => {
  const result = semanticCore.checkPresentationCaptionSemanticOutputV001(context);
  assert.equal(result.status, 'checked');
  return result;
};
const assertViolation = (context, code, checkName) => {
  const result = checked(context);
  assert.equal(result.violations.some((entry) => entry.code === code), true, code);
  const owner = result.checks.find((entry) => entry.name === checkName);
  assert.equal(owner.violationCodes.includes(code), true, `${code} -> ${checkName}`);
  assert.equal(
    result.checks.filter((entry) => entry.violationCodes.includes(code)).length,
    1,
    `${code} has one owner`,
  );
  observedSemanticCodeChecks.add(`${code}\u0000${checkName}`);
};

const expectedReport = (context) => {
  const result = checked(context);
  const failed = result.checks.find((entry) => entry.status === 'failed');
  const raw = packageCore.decodePresentationCaptionB1StrictJsonV001(
    context.rawSemanticOutputInput.snapshot.bytes,
  );
  const status = failed
    ? 'failed'
    : raw.status === 'decoded' && raw.value.status === 'abstained'
      ? 'abstained'
      : 'passed';
  const artifacts = context.sourcePackageObservation.artifactReads;
  const manifest = packageCore.decodePresentationCaptionB1StrictJsonV001(
    artifacts[5].snapshot.bytes,
  );
  const packageReport = packageCore.decodePresentationCaptionB1StrictJsonV001(
    artifacts[6].snapshot.bytes,
  );
  const compiler = status === 'passed' ? context.compilerBuildPasses[0] : null;
  const lines = compiler
    ? compiler.value.containers.flatMap((container) =>
      container.meaningGroups.flatMap((group) => group.lines))
    : [];
  const beforeHash = canonicalSha(context.readOnlyProcessObservation.beforeEntries);
  const afterHash = canonicalSha(context.readOnlyProcessObservation.afterEntries);
  const readOnlyCheck = result.checks.find((entry) => entry.name === 'readOnlyCheck');
  return {
    schemaVersion: 'presentation-caption-semantic-output-validation-report-v001',
    status,
    failureStage: failed?.name ?? null,
    jobBinding: {
      path: context.job.initialSnapshot.path,
      fileSha256: context.job.initialSnapshot.fileSha256,
    },
    implementationBinding: clone(context.job.value.implementationBinding),
    runtimeBinding: runtimeBinding(context.runtimeObservation),
    inputBindings: {
      sourcePackageManifest: {
        path: context.job.value.sourcePackageBinding.manifest.path,
        fileSha256: artifacts[5].snapshot.fileSha256,
        canonicalSha256: canonicalSha(manifest.value),
      },
      sourcePackageValidationReport: {
        path: context.job.value.sourcePackageBinding.validationReport.path,
        fileSha256: artifacts[6].snapshot.fileSha256,
        canonicalSha256: canonicalSha(packageReport.value),
      },
      rawSemanticOutput: {
        path: context.job.value.semanticOutputBinding.path,
        observationStatus: context.rawSemanticOutputInput.status,
        fileSha256: context.rawSemanticOutputInput.snapshot.fileSha256,
        canonicalSha256: raw.status === 'decoded' ? canonicalSha(raw.value) : null,
      },
    },
    checks: clone(result.checks),
    violations: clone(result.violations),
    observedProjection: status === 'passed'
      ? {
        containerCount: compiler.value.containers.length,
        meaningGroupCount: compiler.value.containers.reduce(
          (sum, container) => sum + container.meaningGroups.length,
          0,
        ),
        lineCount: lines.length,
        boundaryCandidateCount: lines.reduce(
          (sum, line) => sum + line.boundaryCandidateIds.length,
          0,
        ),
        sourceAtomCount: lines.reduce((sum, line) => sum + line.sourceAtomIds.length, 0),
        maximumObservedLineLogicalWidth: Math.max(
          ...lines.map((line) => line.logicalWidth),
        ),
      }
      : {
        containerCount: null,
        meaningGroupCount: null,
        lineCount: null,
        boundaryCandidateCount: null,
        sourceAtomCount: null,
        maximumObservedLineLogicalWidth: null,
      },
    compilerInput: status === 'passed'
      ? {
        status: 'generated',
        canonicalSha256: compiler.canonicalSha256,
        observedByteSha256: compiler.fileSha256,
      }
      : {
        status: 'not_generated',
        canonicalSha256: null,
        observedByteSha256: null,
      },
    readOnlyObservation: {
      status: 'verified',
      beforeCanonicalSha256: beforeHash,
      afterCanonicalSha256: afterHash,
      unchanged: readOnlyCheck.status === 'passed',
    },
    scope: {
      validatedState: 'semantic-boundary-selection-only',
      semanticQualityVerified: false,
      naturalBreakQualityVerified: false,
      renderReadabilityVerified: false,
    },
  };
};

const actualImplementationSources = () => Object.fromEntries(
  [...DIRECT, ...DEPENDENCIES].map(([role, path]) => [
    role,
    readFileSync(resolve(WORKSPACE_ROOT, path)),
  ]),
);

const actualRuntime = () => {
  const nodePath = realpathSync(process.execPath);
  const segmenter = new Intl.Segmenter('ja', {granularity: 'word'});
  const resolved = segmenter.resolvedOptions();
  return runtime(readFileSync(nodePath), {
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: resolved.locale,
    resolvedGranularity: resolved.granularity,
    diagnostics: {
      resolvedNodePath: nodePath,
      platform: process.platform,
      arch: process.arch,
      v8Version: process.versions.v8,
      unicodeVersion: process.versions.unicode,
      cldrVersion: process.versions.cldr,
    },
  });
};

const writeWorkspaceFile = (root, repositoryPath, bytes) => {
  const target = resolve(root, ...repositoryPath.split('/'));
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, bytes);
};

const scanMonitoredTree = (root, repositoryRoot, excludedPath) => {
  const entries = [];
  const visit = (absolutePath) => {
    const repositoryPath = relative(root, absolutePath).split(sep).join('/');
    if (repositoryPath === excludedPath) return;
    const stats = lstatSync(absolutePath);
    if (stats.isDirectory()) {
      entries.push({path: repositoryPath, kind: 'directory', contentSha256: null});
      for (const child of readdirSync(absolutePath, {withFileTypes: true})
        .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
        visit(resolve(absolutePath, child.name));
      }
      return;
    }
    if (stats.isSymbolicLink()) {
      entries.push({
        path: repositoryPath,
        kind: 'symlink',
        contentSha256: sha(Buffer.from(readlinkSync(absolutePath), 'utf8')),
      });
      return;
    }
    assert.equal(stats.isFile(), true, repositoryPath);
    entries.push({
      path: repositoryPath,
      kind: 'file',
      contentSha256: sha(readFileSync(absolutePath)),
    });
  };
  visit(resolve(root, ...repositoryRoot.split('/')));
  return entries.sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
};

const materializeRunnerWorkspace = ({abstained = false, invalidRaw = null} = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'zev-caption-b1-semantic-'));
  const implementationSources = actualImplementationSources();
  const context = makeFixture({
    abstained,
    runtimeValue: actualRuntime(),
    implementationSources,
  });
  if (invalidRaw !== null) {
    replaceRaw(context, invalidRaw);
    context.compilerBuildPasses = [];
    context.buildFailure = null;
  }
  for (const [role, path] of [...DIRECT, ...DEPENDENCIES]) {
    writeWorkspaceFile(root, path, implementationSources[role]);
  }
  for (const artifact of context.sourcePackageObservation.artifactReads) {
    writeWorkspaceFile(root, artifact.snapshot.path, artifact.snapshot.bytes);
  }
  writeWorkspaceFile(
    root,
    context.rawSemanticOutputInput.snapshot.path,
    context.rawSemanticOutputInput.snapshot.bytes,
  );
  mkdirSync(resolve(root, dirname(JOB_PATH)), {recursive: true});
  const watched = scanMonitoredTree(
    root,
    context.job.value.readOnlyGuard.watchedRoot,
    JOB_PATH,
  );
  context.job.value.readOnlyGuard.expectedBeforeCanonicalSha256 = canonicalSha(watched);
  writeWorkspaceFile(root, JOB_PATH, serialized(context.job.value));
  return {root, context};
};

const createMappedFilesystemAdapter = (
  fixtureRoot,
  readBuffers = [],
  {
    chunkMode = 'stream',
    chunkObservations = [],
  } = {},
) => {
  assert.equal(['stream', 'one', 'multi', 'uneven'].includes(chunkMode), true);
  const mappedPath = (inputPath) => {
    const suffix = relative(WORKSPACE_ROOT, inputPath);
    return suffix !== '..' && !suffix.startsWith(`..${sep}`)
      ? resolve(fixtureRoot, suffix)
      : inputPath;
  };
  return Object.freeze({
    openReadOnly: async (inputPath) => {
      const handle = await open(mappedPath(inputPath), 'r');
      let readCalled = false;
      return Object.freeze({
        statBigInt: () => handle.stat({bigint: true}),
        readChunksV001: () => {
          if (readCalled) {
            throw new TypeError('mapped readChunksV001 may only be called once');
          }
          readCalled = true;
          let iteratorCreated = false;
          return Object.freeze({
            [Symbol.asyncIterator]() {
              if (iteratorCreated) {
                throw new TypeError(
                  'mapped chunk AsyncIterable may only be iterated once',
                );
              }
              iteratorCreated = true;
              return (async function* mappedChunks() {
                const observed = [];
                for await (const chunk of handle.createReadStream({
                  start: 0,
                  autoClose: false,
                })) {
                  const owned = Buffer.from(chunk);
                  observed.push(owned);
                  if (chunkMode === 'stream') yield owned;
                }
                const completeBytes = Buffer.concat(observed);
                if (chunkMode !== 'stream' && completeBytes.length > 0) {
                  const chunks = chunkMode === 'one'
                    ? [completeBytes]
                    : chunkMode === 'multi'
                      ? [
                        completeBytes.subarray(0, Math.max(1, completeBytes.length >> 1)),
                        completeBytes.subarray(Math.max(1, completeBytes.length >> 1)),
                      ].filter((chunk) => chunk.length > 0)
                      : [
                        completeBytes.subarray(0, Math.min(1, completeBytes.length)),
                        completeBytes.subarray(1, Math.min(4, completeBytes.length)),
                        completeBytes.subarray(4, Math.min(11, completeBytes.length)),
                        completeBytes.subarray(Math.min(11, completeBytes.length)),
                      ].filter((chunk) => chunk.length > 0);
                  for (const chunk of chunks) yield Buffer.from(chunk);
                  chunkObservations.push({
                    inputPath,
                    byteCount: completeBytes.length,
                    fileSha256: sha(completeBytes),
                    chunkCount: chunks.length,
                  });
                } else {
                  chunkObservations.push({
                    inputPath,
                    byteCount: completeBytes.length,
                    fileSha256: sha(completeBytes),
                    chunkCount: chunkMode === 'stream' ? observed.length : 0,
                  });
                }
                readBuffers.push(completeBytes);
              })();
            },
          });
        },
        close: () => handle.close(),
      });
    },
    lstatBigInt: (inputPath) => lstat(mappedPath(inputPath), {bigint: true}),
    realpath: async (inputPath) => {
      const mapped = mappedPath(inputPath);
      if (mapped !== inputPath) {
        await realpath(mapped);
        return inputPath;
      }
      return realpath(inputPath);
    },
    readdirWithTypes: async (inputPath) => (await readdir(
      mappedPath(inputPath),
      {withFileTypes: true},
    )).map((entry) => ({
      name: entry.name,
      kind: entry.isFile()
        ? 'file'
        : entry.isDirectory()
          ? 'directory'
          : entry.isSymbolicLink()
            ? 'symlink'
            : 'other',
    })).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
    readlink: (inputPath) => readlink(mappedPath(inputPath)),
  });
};

const withSemanticSyntheticReadFault = (
  baseAdapter,
  {
    kind,
    matches = () => true,
  },
) => {
  let matched = false;
  return Object.freeze({
    ...baseAdapter,
    openReadOnly: async (inputPath) => {
      if (matched || !matches(inputPath)) {
        return await baseAdapter.openReadOnly(inputPath);
      }
      matched = true;
      if (kind === 'open') throw new TypeError('synthetic semantic open failure');
      const baseHandle = await baseAdapter.openReadOnly(inputPath);
      let readCalled = false;
      let readCompleted = false;
      let closed = false;
      return Object.freeze({
        statBigInt: async () => {
          assert.equal(closed, false);
          const value = await baseHandle.statBigInt();
          if (kind === 'post-read-stat-error' && readCompleted) {
            throw new TypeError('synthetic semantic post-read fstat failure');
          }
          return kind === 'post-read-stat' && readCompleted
            ? Object.freeze({
              dev: value.dev,
              ino: value.ino + 1n,
              size: value.size,
              mtimeNs: value.mtimeNs,
              nlink: value.nlink,
              isFile: () => value.isFile(),
              isDirectory: () => value.isDirectory(),
              isSymbolicLink: () => value.isSymbolicLink(),
            })
            : value;
        },
        readChunksV001: () => {
          assert.equal(closed, false);
          if (readCalled) {
            throw new TypeError('synthetic semantic readChunksV001 may only be called once');
          }
          readCalled = true;
          if (kind === 'return-buffer') return Buffer.from('invalid', 'utf8');
          if (kind === 'return-array') return [];
          if (kind === 'return-promise') return Promise.resolve([]);
          let iteratorCreated = false;
          return Object.freeze({
            [Symbol.asyncIterator]() {
              if (iteratorCreated) {
                throw new TypeError(
                  'synthetic semantic AsyncIterable may only be iterated once',
                );
              }
              iteratorCreated = true;
              return (async function* semanticFaultChunks() {
                if (kind === 'read-throw') {
                  throw new TypeError('synthetic semantic chunk read failure');
                }
                let pending = null;
                for await (const sourceChunk of baseHandle.readChunksV001()) {
                  if (kind === 'non-buffer') {
                    yield 'not-a-buffer';
                    readCompleted = true;
                    return;
                  }
                  if (kind === 'empty-chunk') {
                    yield Buffer.alloc(0);
                    readCompleted = true;
                    return;
                  }
                  if (kind === 'short') {
                    if (pending !== null) yield pending;
                    pending = Buffer.from(sourceChunk);
                  } else {
                    yield sourceChunk;
                  }
                }
                if (kind === 'short') {
                  if (pending !== null && pending.length > 1) {
                    yield pending.subarray(0, pending.length - 1);
                  }
                } else if (kind === 'over') {
                  yield Buffer.from('x', 'utf8');
                }
                readCompleted = true;
              })();
            },
          });
        },
        close: async () => {
          assert.equal(closed, false);
          closed = true;
          await baseHandle.close();
          if (kind === 'close') {
            throw new TypeError('synthetic semantic close failure');
          }
        },
      });
    },
  });
};

const collectBufferLeaves = (value, output = []) => {
  if (Buffer.isBuffer(value)) {
    output.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry) => collectBufferLeaves(entry, output));
  } else if (value !== null && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectBufferLeaves(entry, output));
  }
  return output;
};

const snapshotWorkspaceFileHashes = (root) => {
  const hashes = new Map();
  const visit = (absolutePath) => {
    const stats = lstatSync(absolutePath);
    if (stats.isDirectory()) {
      readdirSync(absolutePath, {withFileTypes: true})
        .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
        .forEach((entry) => visit(resolve(absolutePath, entry.name)));
    } else if (stats.isFile()) {
      hashes.set(relative(root, absolutePath).split(sep).join('/'), sha(readFileSync(absolutePath)));
    }
  };
  visit(root);
  return hashes;
};

test('semantic coreとrunnerは承認済みpublic exportだけを持つ', () => {
  assert.deepEqual(Object.keys(semanticCore).sort(), [
    'buildPresentationCaptionSemanticCompilerInputV001',
    'checkPresentationCaptionSemanticOutputV001',
    'validatePresentationCaptionSemanticOutputCheckJobV001',
    'validatePresentationCaptionSemanticOutputValidationReportV001',
  ].sort());
  assert.deepEqual(Object.keys(semanticRunner).sort(), [
    'createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001',
    'runPresentationCaptionSemanticOutputCheckCliV001',
    'runPresentationCaptionSemanticOutputCheckV001',
  ].sort());
});

test('公開validator/checkerはthrowing getter・Proxyを外へ漏らさない', () => {
  const job = clone(makeFixture().job.value);
  Object.defineProperty(job, 'schemaVersion', {
    enumerable: true,
    get() {
      throw new TypeError('synthetic getter failure');
    },
  });
  assert.deepEqual(
    semanticCore.validatePresentationCaptionSemanticOutputCheckJobV001(job),
    {status: 'invalid', paths: ['$']},
  );

  const throwingProxy = new Proxy({}, {
    ownKeys() {
      throw new TypeError('synthetic proxy failure');
    },
  });
  assert.deepEqual(
    semanticCore.checkPresentationCaptionSemanticOutputV001(throwingProxy),
    {status: 'context-invalid'},
  );
  assert.deepEqual(
    semanticCore.validatePresentationCaptionSemanticOutputValidationReportV001(
      throwingProxy,
    ),
    {valid: false},
  );
});

test('production runnerは第二引数なし/nullをrejectせずuntrusted exit 2へ閉じる', async () => {
  assert.deepEqual(
    await semanticRunner.runPresentationCaptionSemanticOutputCheckV001(JOB_PATH),
    {
      kind: 'untrusted',
      exitCode: 2,
      diagnostic: 'CAPTION_B1_SEMANTIC_CLI_JOB_CONTEXT_UNAVAILABLE',
    },
  );
  assert.deepEqual(
    await semanticRunner.runPresentationCaptionSemanticOutputCheckV001(JOB_PATH, null),
    {
      kind: 'untrusted',
      exitCode: 2,
      diagnostic: 'CAPTION_B1_SEMANTIC_CLI_JOB_CONTEXT_UNAVAILABLE',
    },
  );
});

test('export済みrunnerは合成filesystemとbuilderでcompleteを二pass検査しtrusted reportへ通す', async () => {
  const fixture = materializeRunnerWorkspace();
  try {
    const before = snapshotWorkspaceFileHashes(fixture.root);
    const readBuffers = [];
    const builderContexts = [];
    const result = await semanticRunner.runPresentationCaptionSemanticOutputCheckV001(
      JOB_PATH,
      {
        filesystemAdapter: createMappedFilesystemAdapter(fixture.root, readBuffers),
        builderAdapter: Object.freeze({
          buildCompilerInput: (context) => {
            builderContexts.push(context);
            return semanticCore.buildPresentationCaptionSemanticCompilerInputV001(context);
          },
        }),
      },
    );
    assert.equal(result.kind, 'trusted-report');
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.status, 'passed');
    assert.equal(builderContexts.length, 2);
    const [firstBuffers, secondBuffers] = builderContexts.map((context) =>
      collectBufferLeaves(context));
    assert.equal(firstBuffers.length > 0, true);
    assert.equal(firstBuffers.length, secondBuffers.length);
    firstBuffers.forEach((bytes, index) => {
      assert.notEqual(bytes, secondBuffers[index], `pass copy ${index}`);
      assert.equal(readBuffers.includes(bytes), false, `pass 1 original ${index}`);
      assert.equal(readBuffers.includes(secondBuffers[index]), false, `pass 2 original ${index}`);
      assert.equal(bytes.equals(secondBuffers[index]), true, `pass bytes ${index}`);
    });
    assert.deepEqual(snapshotWorkspaceFileHashes(fixture.root), before);
  } finally {
    rmSync(fixture.root, {recursive: true, force: true});
  }
});

for (const [name, options, expectedStatus] of [
  ['abstained', {abstained: true}, 'abstained'],
  ['invalid', {invalidRaw: {status: 'invalid'}}, 'failed'],
]) {
  test(`production runner本体は${name}回答でbuilderを呼ばずpartial compilerを作らない`, async () => {
    const fixture = materializeRunnerWorkspace(options);
    try {
      let builderCalls = 0;
      const result = await semanticRunner.runPresentationCaptionSemanticOutputCheckV001(
        JOB_PATH,
        {
          filesystemAdapter: createMappedFilesystemAdapter(fixture.root),
          builderAdapter: Object.freeze({
            buildCompilerInput: () => {
              builderCalls += 1;
              throw new TypeError('builder must not run');
            },
          }),
        },
      );
      assert.equal(result.kind, 'trusted-report');
      assert.equal(result.exitCode, 1);
      assert.equal(result.report.status, expectedStatus);
      assert.equal(builderCalls, 0);
      assert.deepEqual(result.report.compilerInput, {
        status: 'not_generated',
        canonicalSha256: null,
        observedByteSha256: null,
      });
      if (name === 'invalid') {
        assert.deepEqual(
          result.report.checks.slice(6, 10).map((entry) => entry.status),
          Array(4).fill('not_run_with_upstream_failure'),
        );
      }
    } finally {
      rmSync(fixture.root, {recursive: true, force: true});
    }
  });
}

for (const passOrdinal of [1, 2]) {
  for (const kind of ['thrown', 'invalid-return', 'input-mutated']) {
    test(`compiler pass ${passOrdinal} ${kind}はrunner本体で停止し元入力を変えない`, async () => {
      const fixture = materializeRunnerWorkspace();
      try {
        const before = snapshotWorkspaceFileHashes(fixture.root);
        const readBuffers = [];
        const builderContexts = [];
        const builderAdapter = Object.freeze({
          buildCompilerInput: (context) => {
            builderContexts.push(context);
            if (builderContexts.length === passOrdinal) {
              if (kind === 'thrown') throw new TypeError('synthetic builder failure');
              if (kind === 'invalid-return') return undefined;
              const buffers = collectBufferLeaves(context);
              assert.equal(buffers.length > 0, true);
              buffers[0][0] ^= 0xff;
              return undefined;
            }
            return semanticCore.buildPresentationCaptionSemanticCompilerInputV001(context);
          },
        });
        const result = await semanticRunner.runPresentationCaptionSemanticOutputCheckV001(
          JOB_PATH,
          {
            filesystemAdapter: createMappedFilesystemAdapter(fixture.root, readBuffers),
            builderAdapter,
          },
        );
        assert.equal(result.kind, 'trusted-report');
        assert.equal(result.exitCode, 1);
        assert.equal(result.report.status, 'failed');
        assert.equal(result.report.failureStage, 'compilerBuild');
        assert.equal(
          result.report.violations.some((entry) => entry.code === 'BUILD_FAILED'),
          true,
        );
        assert.equal(builderContexts.length, passOrdinal);
        const builderBufferSets = builderContexts.map((context) => collectBufferLeaves(context));
        builderBufferSets.flat().forEach((bytes) => {
          assert.equal(readBuffers.includes(bytes), false);
        });
        if (passOrdinal === 2) {
          assert.equal(builderBufferSets[0].length, builderBufferSets[1].length);
          builderBufferSets[0].forEach((bytes, index) => {
            assert.notEqual(bytes, builderBufferSets[1][index], `copy ${index}`);
          });
        }
        assert.deepEqual(
          result.report.checks.slice(7, 10).map((entry) => entry.status),
          Array(3).fill('not_run_with_upstream_failure'),
        );
        assert.deepEqual(snapshotWorkspaceFileHashes(fixture.root), before);
      } finally {
        rmSync(fixture.root, {recursive: true, force: true});
      }
    });
  }
}

test('runnerのcompiler失敗配列はpass 1とpass 2で固定形を分ける', async () => {
  const source = await readFile(
    new URL('./run_presentation_caption_semantic_output_check_v001.mjs', import.meta.url),
    'utf8',
  );
  assert.match(
    source,
    /if \(!first\.success\) \{\s*compilerBuildPasses = \[null, null\];\s*buildFailure = \{\s*stage: 'compiler',\s*passOrdinal: 1,/u,
  );
  assert.match(
    source,
    /if \(!second\.success\) \{\s*compilerBuildPasses = \[first\.pass, null\];\s*buildFailure = \{\s*stage: 'compiler',\s*passOrdinal: 2,/u,
  );
  assert.match(
    source,
    /kind: finalized\.some\(\(entry\) => !entry\.unchanged\) \? 'input-mutated' : 'thrown'/u,
  );
  assert.match(
    source,
    /if \(finalized\.some\(\(entry\) => !entry\.unchanged\)\) \{\s*return \{success: false, kind: 'input-mutated'/u,
  );
  assert.match(
    source,
    /if \(!bytes \|\| !canonical\) \{\s*return \{success: false, kind: 'invalid-return'/u,
  );
});

test('完全形は12検査を通り、決定的compilerへ全候補・全atomを一度ずつ戻す', () => {
  const context = makeFixture();
  const result = checked(context);
  assert.deepEqual(result.violations, []);
  assert.deepEqual(
    result.checks.map((entry) => [entry.name, entry.status]),
    SEMANTIC_CHECK_NAMES.map((name) => [name, 'passed']),
  );
  const compiler = context.compilerBuildPasses[0].value;
  assert.deepEqual(
    compiler.containers.flatMap((container) =>
      container.meaningGroups.flatMap((group) =>
        group.lines.flatMap((line) => line.boundaryCandidateIds))),
    [
      'segmenter-boundary-000001',
      'segmenter-boundary-000002',
      'segmenter-boundary-000003',
    ],
  );
  assert.deepEqual(
    compiler.containers.flatMap((container) =>
      container.meaningGroups.flatMap((group) =>
        group.lines.flatMap((line) => line.sourceAtomIds))),
    ['atom-000001', 'atom-000002', 'atom-000003', 'atom-000004'],
  );
});

test('abstainedは有効でありcompiler四検査だけが適用なしになる', () => {
  const result = checked(makeFixture({abstained: true}));
  assert.deepEqual(result.violations, []);
  assert.deepEqual(
    result.checks.slice(6, 10).map((entry) => entry.status),
    Array(4).fill('not_applicable_by_abstention'),
  );
  assert.equal(result.checks[10].status, 'passed');
  assert.equal(result.checks[11].status, 'passed');
});

test('中間phaseは先頭6検査だけを評価する', () => {
  const context = makeFixture();
  context.contextPhase = 'semantic-output-gate';
  context.compilerBuildPasses = [];
  context.buildFailure = null;
  context.job.preReportInput = null;
  context.readOnlyProcessObservation = {mode: 'not-attempted'};
  const result = checked(context);
  assert.deepEqual(
    result.checks.slice(6).map((entry) => entry.status),
    Array(6).fill('not_evaluated_in_phase'),
  );
});

for (const [name, code, checkName, mutate] of [
  ['job schema', 'CAPTION_B1_JOB_INVALID', 'jobBinding', (context) => {
    context.job.value.mode = 'invalid';
  }],
  ['job stability', 'JOB_FILE_MISMATCH', 'jobStability', (context) => {
    context.job.preReportInput.snapshot.fileSha256 = 'f'.repeat(64);
  }],
  ['implementation hash', 'IMPLEMENTATION_MISMATCH', 'implementationBinding', (context) => {
    context.implementationInputs[0].snapshot.fileSha256 = 'f'.repeat(64);
  }],
  ['raw path safety', 'INPUT_PATH_UNSAFE', 'inputBinding', (context) => {
    context.rawSemanticOutputInput.status = 'observed-unsafe';
    context.rawSemanticOutputInput.snapshot = null;
  }],
  ['raw hash', 'INPUT_HASH_MISMATCH', 'inputBinding', (context) => {
    context.job.value.semanticOutputBinding.fileSha256 = 'f'.repeat(64);
  }],
  ['runtime', 'RUNTIME_MISMATCH', 'runtimeBinding', (context) => {
    context.runtimeObservation.nodeVersion = 'different';
  }],
  ['package file set', 'PACKAGE_FILE_SET_INVALID', 'packageShape', (context) => {
    context.sourcePackageObservation.directoryEntries.pop();
  }],
  ['package schema', 'PACKAGE_SCHEMA_INVALID', 'packageShape', (context) => {
    const read = context.sourcePackageObservation.artifactReads[2];
    const value = packageCore.decodePresentationCaptionB1StrictJsonV001(
      read.snapshot.bytes,
    ).value;
    value.schemaVersion = 'wrong';
    read.snapshot = snapshot(read.snapshot.path, serialized(value));
  }],
  ['package strict JSON', 'PACKAGE_STRICT_JSON_INVALID', 'packageShape', (context) => {
    const read = context.sourcePackageObservation.artifactReads[2];
    read.snapshot = snapshot(read.snapshot.path, Buffer.from('not-json', 'utf8'));
  }],
  ['package UTF-8 BOM', 'PACKAGE_STRICT_JSON_INVALID', 'packageShape', (context) => {
    const read = context.sourcePackageObservation.artifactReads[2];
    read.snapshot = snapshot(
      read.snapshot.path,
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), read.snapshot.bytes]),
    );
  }],
  ['package binding', 'PACKAGE_BINDING_MISMATCH', 'packageShape', (context) => {
    const read = context.sourcePackageObservation.artifactReads[3];
    const value = packageCore.decodePresentationCaptionB1StrictJsonV001(
      read.snapshot.bytes,
    ).value;
    value.artifactId = 'different';
    read.snapshot = snapshot(read.snapshot.path, serialized(value));
  }],
  ['package hash', 'PACKAGE_HASH_MISMATCH', 'packageShape', (context) => {
    context.job.value.sourcePackageBinding.manifest.fileSha256 = 'f'.repeat(64);
  }],
]) {
  test(`${name}違反は担当検査一つへだけ帰属する`, () => {
    const context = makeFixture();
    mutate(context);
    assertViolation(context, code, checkName);
  });
}

for (const [name, injectedSource] of [
  [
    'renderer trust参照fileの実行import',
    "import './presentation_renderer_trust_v001.mjs';\n",
  ],
  [
    '許可外local import',
    "import './unapproved-semantic-dependency.mjs';\n",
  ],
  [
    'dynamic import',
    "void import('./presentation_caption_semantic_source_package_v001.mjs');\n",
  ],
  [
    'CommonJS require',
    "require('node:fs');\n",
  ],
  [
    'builtin allowlist外import',
    "import 'node:fs';\n",
  ],
  [
    'module-load時file読取',
    "filesystemAdapter.openReadOnly('/tmp/forbidden');\n",
  ],
]) {
  test(`implementation import graphは${name}を拒否する`, () => {
    const context = makeFixture();
    const original = context.implementationInputs
      .find((entry) => entry.role === 'semanticCore')
      .snapshot.bytes.toString('utf8');
    replaceImplementationSource(context, 'semanticCore', `${original}${injectedSource}`);
    assertViolation(context, 'IMPLEMENTATION_MISMATCH', 'implementationBinding');
  });
}

test('module-load file I/O検査は文字列・comment・関数・arrow内のcallを実行扱いしない', () => {
  const context = makeFixture();
  const original = context.implementationInputs
    .find((entry) => entry.role === 'semanticCore')
    .snapshot.bytes.toString('utf8');
  replaceImplementationSource(
    context,
    'semanticCore',
    `${original}`
      + "const quotedExample = \"readFileSync('/tmp/not-executed')\";\n"
      + "const templateExample = `writeFileSync('/tmp/not-executed', 'x')`;\n"
      + "// filesystemAdapter.openReadOnly('/tmp/not-executed');\n"
      + "/* writeFileSync('/tmp/not-executed', 'x'); */\n"
      + "function deferredFunction() { return readFileSync('/tmp/not-executed'); }\n"
      + "const deferredBlockArrow = () => {\n"
      + "  return filesystemAdapter.openReadOnly('/tmp/not-executed');\n"
      + "};\n"
      + "const deferredConciseArrow = async (pathValue) =>\n"
      + "  (await filesystemAdapter.readdirWithTypes(pathValue)).length;\n"
      + "const deferredMethod = {\n"
      + "  openReadOnly() { return readFileSync('/tmp/not-executed'); },\n"
      + "};\n",
  );
  const result = checked(context);
  assert.equal(
    result.violations.some((entry) => entry.code === 'IMPLEMENTATION_MISMATCH'),
    false,
  );
});

test('module-load file I/O検査はtemplate式内で直接実行されるcallを拒否する', () => {
  const context = makeFixture();
  const original = context.implementationInputs
    .find((entry) => entry.role === 'semanticCore')
    .snapshot.bytes.toString('utf8');
  replaceImplementationSource(
    context,
    'semanticCore',
    `${original}` + "const executed = `${readFileSync('/tmp/forbidden')}`;\n",
  );
  assertViolation(context, 'IMPLEMENTATION_MISMATCH', 'implementationBinding');
});

test('module-load file I/O検査はobject初期化で直接実行されるcallを拒否する', () => {
  const context = makeFixture();
  const original = context.implementationInputs
    .find((entry) => entry.role === 'semanticCore')
    .snapshot.bytes.toString('utf8');
  replaceImplementationSource(
    context,
    'semanticCore',
    `${original}const executed = {bytes: readFileSync('/tmp/forbidden')};\n`,
  );
  assertViolation(context, 'IMPLEMENTATION_MISMATCH', 'implementationBinding');
});

for (const [label, suffix] of [
  [
    'concise arrow IIFE',
    "const executed = (() => readFileSync('/tmp/forbidden'))();\n",
  ],
  [
    'block arrow IIFE',
    "const executed = (() => { return readFileSync('/tmp/forbidden'); })();\n",
  ],
  [
    'function IIFE',
    "const executed = (function () { return readFileSync('/tmp/forbidden'); })();\n",
  ],
]) {
  test(`module-load file I/O検査は${label}内で直接実行されるcallを拒否する`, () => {
    const context = makeFixture();
    const original = context.implementationInputs
      .find((entry) => entry.role === 'semanticCore')
      .snapshot.bytes.toString('utf8');
    replaceImplementationSource(context, 'semanticCore', `${original}${suffix}`);
    assertViolation(context, 'IMPLEMENTATION_MISMATCH', 'implementationBinding');
  });
}

const checkSemanticImportGraphSuffix = (suffix) => {
  const context = makeFixture();
  const original = context.implementationInputs
    .find((entry) => entry.role === 'semanticCore')
    .snapshot.bytes.toString('utf8');
  replaceImplementationSource(context, 'semanticCore', `${original}\n${suffix}\n`);
  return checked(context);
};

const checkSemanticImportGraphBytes = (role, sourceBytes) => {
  const context = makeFixture();
  replaceImplementationSource(context, role, sourceBytes);
  return checked(context);
};

const makeR1HashbangScannerCases = (bodyBytes) => {
  const body = Buffer.from(bodyBytes);
  const prefixed = (prefix) => Buffer.concat([Buffer.from(prefix, 'utf8'), body]);
  const accepted = [
    ['LF終端', prefixed('#!/usr/bin/env node\n')],
    ['CRLF終端', prefixed('#!/usr/bin/env node\r\n')],
    ['空payload', prefixed('#!\n')],
    ['payload許可下端tab', prefixed('#!\t\n')],
    ['payload許可上端0x7E', prefixed('#!~\n')],
    ['hashbang後の空行', prefixed('#!/usr/bin/env node\n\n')],
    [
      'payload内の禁止語形',
      prefixed('#! import( require( readFileSync(\n'),
    ],
    [
      '文字列・comment・template・regex内のhashbang',
      Buffer.concat([
        body,
        Buffer.from([
          '',
          "const scannerHashbangString = '#!';",
          '/* #! */',
          'const scannerHashbangTemplate = `#!`;',
          'const scannerHashbangRegex = /#!/u;',
          '',
        ].join('\n'), 'utf8'),
      ]),
    ],
  ];
  const rejected = [
    ['BOM後', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), prefixed('#!/usr/bin/env node\n')])],
    ['先行space', prefixed(' #!/usr/bin/env node\n')],
    ['先行tab', prefixed('\t#!/usr/bin/env node\n')],
    ['先行改行', prefixed('\n#!/usr/bin/env node\n')],
    ['分離hashbang', prefixed('# !/usr/bin/env node\n')],
    ['逆順hashbang', prefixed('!#/usr/bin/env node\n')],
    [
      'JavaScript token後',
      Buffer.concat([
        Buffer.from('const scannerBeforeHashbang = 1;\n#!/usr/bin/env node\n', 'utf8'),
        body,
      ]),
    ],
    ['二行目のhashbang', prefixed('#!/usr/bin/env node\n#!/usr/bin/env node\n')],
    ['裸CR終端', prefixed('#!/usr/bin/env node\r')],
    ['U+2028終端', prefixed('#!/usr/bin/env node\u2028')],
    ['U+2029終端', prefixed('#!/usr/bin/env node\u2029')],
    ['行終端なしEOF', Buffer.from('#!/usr/bin/env node', 'utf8')],
    [
      'payload内NUL',
      Buffer.concat([
        Buffer.from('#!/usr/bin/', 'utf8'),
        Buffer.from([0x00]),
        Buffer.from('env node\n', 'utf8'),
        body,
      ]),
    ],
    ['payload内非ASCII', prefixed('#!/usr/bin/env ノード\n')],
    [
      'payload内未許可制御文字',
      Buffer.concat([
        Buffer.from('#!/usr/bin/', 'utf8'),
        Buffer.from([0x01]),
        Buffer.from('env node\n', 'utf8'),
        body,
      ]),
    ],
    [
      'payload許可範囲直前0x1F',
      Buffer.concat([
        Buffer.from('#!/usr/bin/', 'utf8'),
        Buffer.from([0x1f]),
        Buffer.from('env node\n', 'utf8'),
        body,
      ]),
    ],
    [
      'payload許可範囲直後0x7F',
      Buffer.concat([
        Buffer.from('#!/usr/bin/', 'utf8'),
        Buffer.from([0x7f]),
        Buffer.from('env node\n', 'utf8'),
        body,
      ]),
    ],
  ];
  return {accepted, rejected};
};

const R1_SCANNER_ACCEPTED_SOURCES = Object.freeze([
  [
    '通常member・optional member後の除算',
    [
      'const scannerR1Member = value.property / divisor;',
      'const scannerR1OptionalProperty = value?.property / divisor;',
      'const scannerR1OptionalBracket = value?.[field] / divisor;',
    ].join('\n'),
  ],
  [
    'spread三形とspread直後のregex',
    [
      'const scannerR1SpreadCall = resolve(root, ...parts);',
      'const scannerR1SpreadObject = ({...entry});',
      'const scannerR1SpreadArray = [...entries];',
      'const scannerR1SpreadRegex = consume(.../import\\(/g);',
    ].join('\n'),
  ],
  [
    'regex・comment・string・template raw内の禁止語',
    [
      'const scannerR1Regex = /import\\s*\\(|require\\s*\\(|readFileSync\\(/gu;',
      "const scannerR1String = \"import('x') require('x') readFileSync('x')\";",
      "const scannerR1Template = `import('x') require('x') ${value}`;",
      "// import('x'); require('x'); readFileSync('x');",
      "/* import('x'); require('x'); readFileSync('x'); */",
      'const scannerR1CommentThenRegex = /* comment */ /require\\(/u.test(value);',
      "const scannerR1TemplateRegex = `${/import\\(/u.test(value)}`;",
    ].join('\n'),
  ],
  [
    '固定済み数値五形',
    'const scannerR1Numbers = [0, 57, 0.04, 1n, 0xff, 0o600];',
  ],
  [
    '制御条件内とstatement開始のregex',
    [
      'if (/require\\(/u.test(value)) consume(value);',
      'if (condition) /import\\(/u.test(value);',
    ].join('\n'),
  ],
]);

for (const [label, suffix] of R1_SCANNER_ACCEPTED_SOURCES) {
  test(`semantic R1 scannerは${label}を受理する`, () => {
    const result = checkSemanticImportGraphSuffix(suffix);
    assert.equal(
      result.violations.some((entry) => entry.code === 'IMPLEMENTATION_MISMATCH'),
      false,
    );
  });
}

const R1_SCANNER_REJECTED_SOURCES = Object.freeze([
  ['通常member経由file I/O', "const scannerR1Invalid = value.readFileSync('/tmp/x');"],
  ['optional member経由file I/O', "const scannerR1Invalid = value?.readFileSync('/tmp/x');"],
  ['spread内file I/O', "const scannerR1Invalid = consume(...readFileSync('/tmp/x'));"],
  ['dynamic import', "const scannerR1Invalid = import('./x.mjs');"],
  [
    '関数内dynamic import',
    "function scannerR1Deferred() { return import('./x.mjs'); }",
  ],
  ['spread内dynamic import', "const scannerR1Invalid = consume(...import('./x.mjs'));"],
  ['template式内dynamic import', "const scannerR1Invalid = `${import('./x.mjs')}`;"],
  ['property名のdynamic import', 'const scannerR1Invalid = object.import();'],
  ['CommonJS require', "const scannerR1Invalid = require('node:fs');"],
  ['arrow内CommonJS require', "const scannerR1Deferred = () => require('node:fs');"],
  ['spread内CommonJS require', "const scannerR1Invalid = consume(...require('node:fs'));"],
  ['template式内CommonJS require', "const scannerR1Invalid = `${require('node:fs')}`;"],
  ['optional property名のrequire', 'const scannerR1Invalid = object?.require();'],
  ['member待機中のslash', 'const scannerR1Invalid = value./pattern/;'],
  ['二個のdot', 'const scannerR1Invalid = value..name;'],
  ['四個のdot', 'const scannerR1Invalid = value....name;'],
  ['未完のdot', 'const scannerR1Invalid = value.;'],
  ['未完のoptional dot', 'const scannerR1Invalid = value?.;'],
  ['未完のspread', 'const scannerR1Invalid = (...);'],
  ['先頭dot小数', 'const scannerR1Invalid = .5;'],
  ['末尾dot数値', 'const scannerR1Invalid = 1.;'],
  ['二個dot数値member', 'const scannerR1Invalid = 1..name;'],
  ['指数表記', 'const scannerR1Invalid = 1e2;'],
  ['二進数表記', 'const scannerR1Invalid = 0b10;'],
  ['separator付き数値', 'const scannerR1Invalid = 1_000;'],
  ['optional call', 'const scannerR1Invalid = value?.();'],
  ['optional private name', 'const scannerR1Invalid = value?.#name;'],
  ['optional tagged template', 'const scannerR1Invalid = value?.tag`x`;'],
  ['return直後spread', 'function scannerR1Deferred() { return ...value; }'],
  ['二項演算子直後spread', 'const scannerR1Invalid = left + ...right;'],
  ['未閉鎖regex', 'const scannerR1Invalid = /unterminated;'],
  ['未閉鎖regex class', 'const scannerR1Invalid = /[abc/;'],
  ['括弧不一致', 'const scannerR1Invalid = ([value);'],
  ['閉じbrace直後slash', 'const scannerR1Invalid = {} / divisor;'],
]);

for (const [label, suffix] of R1_SCANNER_REJECTED_SOURCES) {
  test(`semantic R1 scannerは${label}を拒否する`, () => {
    const result = checkSemanticImportGraphSuffix(suffix);
    assert.equal(
      result.violations.some((entry) => entry.code === 'IMPLEMENTATION_MISMATCH'),
      true,
    );
  });
}

test('embedded Gate A reportは全domain schemaと固定配列順を再検査する', () => {
  const context = makeFixture();
  const entry = context.sourcePackageObservation.artifactReads[1];
  const value = packageCore.decodePresentationCaptionB1StrictJsonV001(
    entry.snapshot.bytes,
  ).value;
  value.checkReport.checks.reverse();
  replacePackageArtifact(context, 1, value);
  assertViolation(context, 'PACKAGE_SCHEMA_INVALID', 'packageShape');
});

test('embedded Gate A reportは正本のcanonical field順以外を拒否する', () => {
  const context = makeFixture();
  const entry = context.sourcePackageObservation.artifactReads[1];
  const value = packageCore.decodePresentationCaptionB1StrictJsonV001(
    entry.snapshot.bytes,
  ).value;
  const reordered = {
    status: value.status,
    ...Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'status')),
  };
  entry.snapshot = snapshot(
    entry.snapshot.path,
    Buffer.from(`${JSON.stringify(reordered)}\n`, 'utf8'),
  );
  const result = checked(context);
  assert.equal(
    result.violations.some((violation) => violation.code === 'PACKAGE_SCHEMA_INVALID'),
    true,
  );
  assert.equal(
    result.violations.some((violation) => violation.code === 'PACKAGE_STRICT_JSON_INVALID'),
    true,
  );
});

test('embedded Gate A report内部の相互対応不一致はschemaでなくbindingへ分離する', () => {
  const context = makeFixture();
  const entry = context.sourcePackageObservation.artifactReads[1];
  const value = packageCore.decodePresentationCaptionB1StrictJsonV001(
    entry.snapshot.bytes,
  ).value;
  value.checkReport.observedProjection.sourceAtomCount += 1;
  replacePackageArtifact(context, 1, value);
  const result = checked(context);
  assert.equal(
    result.violations.some((violation) => violation.code === 'PACKAGE_SCHEMA_INVALID'),
    false,
  );
  assert.equal(
    result.violations.some((violation) => violation.code === 'PACKAGE_BINDING_MISMATCH'),
    true,
  );
});

test('embedded Gate A report内部の証拠hash不一致はPACKAGE_HASH_MISMATCHへ分離する', () => {
  const context = makeFixture();
  const entry = context.sourcePackageObservation.artifactReads[1];
  const value = packageCore.decodePresentationCaptionB1StrictJsonV001(
    entry.snapshot.bytes,
  ).value;
  value.evidence.canonicalSha256 = 'f'.repeat(64);
  replacePackageArtifact(context, 1, value);
  const result = checked(context);
  assert.equal(
    result.violations.some((violation) => violation.code === 'PACKAGE_SCHEMA_INVALID'),
    false,
  );
  assert.equal(
    result.violations.some((violation) => violation.code === 'PACKAGE_HASH_MISMATCH'),
    true,
  );
});

for (const [name, mutate] of [
  ['container別source atom数', (projection) => {
    projection.containers[0].sourceAtomCount += 1;
  }],
  ['container別boundary候補数', (projection) => {
    projection.containers[1].boundaryCandidateCount += 1;
  }],
  ['候補の最大論理幅', (projection) => {
    projection.maximumObservedCandidateLogicalWidth += 1;
  }],
]) {
  test(`package reportの${name}はpackage内容から再導出して照合する`, () => {
    const context = makeFixture();
    const entry = context.sourcePackageObservation.artifactReads[6];
    const value = packageCore.decodePresentationCaptionB1StrictJsonV001(
      entry.snapshot.bytes,
    ).value;
    mutate(value.observedProjection);
    replacePackageArtifact(context, 6, value);
    const result = checked(context);
    assert.equal(
      result.violations.some((violation) => violation.code === 'PACKAGE_SCHEMA_INVALID'),
      false,
    );
    assert.equal(
      result.violations.some((violation) => violation.code === 'PACKAGE_BINDING_MISMATCH'),
      true,
    );
  });
}

for (const [name, artifactIndex, mutate] of [
  ['report jobとmanifest package job', 6, (value) => {
    value.jobBinding.fileSha256 = '0'.repeat(64);
  }],
  ['evidence artifactとmanifest/job artifact', 0, (value) => {
    value.artifactId = 'other-artifact-v001';
  }],
  ['evidence sourceとexpansion source', 0, (value) => {
    value.sourceBinding.sourceArtifactPath =
      'evals/clip_composition/testdata/other-source.json';
  }],
  ['embedded Gate A jobとmanifest Gate A job', 1, (value) => {
    value.job.path = 'evals/clip_composition/testdata/other-gate-a-job.json';
  }],
  ['manifest runtimeとevidence runtime', 5, (value) => {
    value.runtimeBinding.nodeVersion = 'v99.0.0';
  }],
  ['manifest package coreとsemantic job package core', 5, (value) => {
    value.implementationBinding.files[0].fileSha256 = '0'.repeat(64);
  }],
  ['manifest外部入力とwidth policy', 5, (value) => {
    value.externalInputBindings[3].canonicalSha256 = '0'.repeat(64);
  }],
  ['text layoutとsemantic dependency', 3, (value) => {
    value.widthPolicyBinding.textLayoutImplementation.fileSha256 = '0'.repeat(64);
  }],
  ['leakage width由来とexpansion width由来', 4, (value) => {
    value.sourceBindings.presetRegistryCanonicalSha256 = '0'.repeat(64);
  }],
]) {
  test(`package内自己整合: ${name}の不一致をbinding違反にする`, () => {
    const context = makeFixture();
    const entry = context.sourcePackageObservation.artifactReads[artifactIndex];
    const value = packageCore.decodePresentationCaptionB1StrictJsonV001(
      entry.snapshot.bytes,
    ).value;
    mutate(value);
    replacePackageArtifact(context, artifactIndex, value);
    const result = checked(context);
    assert.equal(
      result.violations.some((violation) => violation.code === 'PACKAGE_BINDING_MISMATCH'),
      true,
    );
  });
}

for (const [name, code, mutateRaw] of [
  ['bytes', 'SEMANTIC_OUTPUT_BYTES_INVALID', () => Buffer.from('```json\\n{}\\n```')],
  ['UTF-8 BOM bytes', 'SEMANTIC_OUTPUT_BYTES_INVALID', (value) =>
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), serialized(value)])],
  ['schema', 'SEMANTIC_OUTPUT_SCHEMA_INVALID', () => ({status: 'wrong'})],
  ['forbidden field', 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD', (value) => {
    value.reason = 'forbidden';
    return value;
  }],
  ['container set', 'SEMANTIC_CONTAINER_SET_INVALID', (value) => {
    value.containers.pop();
    return value;
  }],
  ['container order', 'SEMANTIC_CONTAINER_ORDER_INVALID', (value) => {
    value.containers.reverse();
    return value;
  }],
  ['group', 'SEMANTIC_GROUP_INVALID', (value) => {
    value.containers[0].meaningGroups = [];
    return value;
  }],
  ['line count', 'SEMANTIC_LINE_COUNT_INVALID', (value) => {
    value.containers[0].meaningGroups[0].lineEndBoundaryCandidateIds = [];
    return value;
  }],
  ['unknown boundary', 'SEMANTIC_BOUNDARY_ID_UNKNOWN', (value) => {
    value.containers[0].meaningGroups[0].lineEndBoundaryCandidateIds[0] =
      'segmenter-boundary-999999';
    return value;
  }],
  ['cross-container boundary', 'SEMANTIC_BOUNDARY_ID_CROSS_CONTAINER', (value) => {
    value.containers[0].meaningGroups[0].lineEndBoundaryCandidateIds[0] =
      'segmenter-boundary-000003';
    return value;
  }],
  ['duplicate boundary', 'SEMANTIC_BOUNDARY_ID_DUPLICATE', (value) => {
    value.containers[0].meaningGroups = [
      {lineEndBoundaryCandidateIds: ['segmenter-boundary-000001']},
      {
        lineEndBoundaryCandidateIds: [
          'segmenter-boundary-000001',
          'segmenter-boundary-000002',
        ],
      },
    ];
    return value;
  }],
  ['boundary order', 'SEMANTIC_BOUNDARY_ORDER_INVALID', (value) => {
    value.containers[0].meaningGroups[0].lineEndBoundaryCandidateIds = [
      'segmenter-boundary-000002',
      'segmenter-boundary-000001',
    ];
    return value;
  }],
  ['container end', 'SEMANTIC_CONTAINER_END_MISSING', (value) => {
    value.containers[0].meaningGroups[0].lineEndBoundaryCandidateIds = [
      'segmenter-boundary-000001',
    ];
    return value;
  }],
  ['line width', 'SEMANTIC_LINE_WIDTH_EXCEEDED', (value) => {
    value.containers[0].meaningGroups[0].lineEndBoundaryCandidateIds = [
      'segmenter-boundary-000002',
    ];
    return value;
  }],
]) {
  test(`${name}の意味出力違反を機械検出する`, () => {
    const context = makeFixture();
    const original = packageCore.decodePresentationCaptionB1StrictJsonV001(
      context.rawSemanticOutputInput.snapshot.bytes,
    ).value;
    replaceRaw(context, mutateRaw(clone(original)));
    assertViolation(context, code, 'semanticOutput');
  });
}

test('container ID重複は集合違反として独立検出する', () => {
  const context = makeFixture();
  const raw = packageCore.decodePresentationCaptionB1StrictJsonV001(
    context.rawSemanticOutputInput.snapshot.bytes,
  ).value;
  raw.containers[1].containerId = raw.containers[0].containerId;
  replaceRaw(context, raw);
  assertViolation(context, 'SEMANTIC_CONTAINER_SET_INVALID', 'semanticOutput');
});

for (const [name, lineEndBoundaryCandidateIds] of [
  ['0行', []],
  ['3行', [
    'segmenter-boundary-000001',
    'segmenter-boundary-000002',
    'segmenter-boundary-000002',
  ]],
]) {
  test(`${name}のmeaning groupを行数違反として検出する`, () => {
    const context = makeFixture();
    const raw = packageCore.decodePresentationCaptionB1StrictJsonV001(
      context.rawSemanticOutputInput.snapshot.bytes,
    ).value;
    raw.containers[0].meaningGroups[0].lineEndBoundaryCandidateIds =
      lineEndBoundaryCandidateIds;
    replaceRaw(context, raw);
    assertViolation(context, 'SEMANTIC_LINE_COUNT_INVALID', 'semanticOutput');
  });
}

for (const [field, value] of [
  ['text', '本文を返してはならない'],
  ['startMs', 1234],
  ['reason', '理由を返してはならない'],
  ['score', 0],
  ['id', 'free-form-id'],
]) {
  test(`意味出力の禁止field ${field}を個別に拒否する`, () => {
    const context = makeFixture();
    const raw = packageCore.decodePresentationCaptionB1StrictJsonV001(
      context.rawSemanticOutputInput.snapshot.bytes,
    ).value;
    raw[field] = value;
    replaceRaw(context, raw);
    assertViolation(context, 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD', 'semanticOutput');
  });
}

for (const [name, raw] of [
  ['complete missing containers', {status: 'complete'}],
  ['complete extra field', {status: 'complete', containers: [], reason: 'extra'}],
  ['abstained missing status', {}],
  ['abstained extra containers', {status: 'abstained', containers: []}],
]) {
  test(`complete/abstainedのexact union: ${name}を拒否する`, () => {
    const context = makeFixture();
    replaceRaw(context, raw);
    context.compilerBuildPasses = [];
    context.buildFailure = null;
    const result = checked(context);
    assert.equal(
      result.violations.some((entry) =>
        ['SEMANTIC_OUTPUT_SCHEMA_INVALID', 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD']
          .includes(entry.code)),
      true,
    );
    assert.deepEqual(context.compilerBuildPasses, []);
    assert.equal(context.buildFailure, null);
    assert.deepEqual(
      result.checks.slice(6, 10).map((entry) => entry.status),
      Array(4).fill('not_run_with_upstream_failure'),
    );
  });
}

test('invalid意味回答ではcompilerの部分成果を一切受け取らない', () => {
  const context = makeFixture();
  replaceRaw(context, {status: 'invalid'});
  context.compilerBuildPasses = [];
  context.buildFailure = null;
  const result = checked(context);
  assert.deepEqual(context.compilerBuildPasses, []);
  assert.equal(context.buildFailure, null);
  assert.deepEqual(
    result.checks.slice(6, 10).map((entry) => entry.status),
    Array(4).fill('not_run_with_upstream_failure'),
  );
});

test('container順序だけの入替えは順序違反だけを発火し候補所有者違反を併発しない', () => {
  const context = makeFixture();
  const raw = packageCore.decodePresentationCaptionB1StrictJsonV001(
    context.rawSemanticOutputInput.snapshot.bytes,
  ).value;
  raw.containers.reverse();
  replaceRaw(context, raw);
  const result = checked(context);
  const semanticCodes = result.violations
    .map((entry) => entry.code)
    .filter((code) => code.startsWith('SEMANTIC_'));
  assert.deepEqual(semanticCodes, ['SEMANTIC_CONTAINER_ORDER_INVALID']);
});

test('unknown fieldと独立したroot/container/group scaffold違反を併発する', () => {
  const rootContext = makeFixture();
  replaceRaw(rootContext, {status: 'complete', reason: 'forbidden'});
  const rootResult = checked(rootContext);
  assert.equal(
    rootResult.violations.some((entry) => entry.code === 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD'),
    true,
  );
  assert.equal(
    rootResult.violations.some((entry) => entry.code === 'SEMANTIC_OUTPUT_SCHEMA_INVALID'),
    true,
  );

  const containerContext = makeFixture();
  const containerRaw = packageCore.decodePresentationCaptionB1StrictJsonV001(
    containerContext.rawSemanticOutputInput.snapshot.bytes,
  ).value;
  containerRaw.containers[0] = {
    containerId: 'segmenter-container-000001',
    reason: 'forbidden',
  };
  replaceRaw(containerContext, containerRaw);
  const containerResult = checked(containerContext);
  assert.equal(
    containerResult.violations.some((entry) => entry.code === 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD'),
    true,
  );
  assert.equal(
    containerResult.violations.some((entry) => entry.code === 'SEMANTIC_OUTPUT_SCHEMA_INVALID'),
    true,
  );

  const groupContext = makeFixture();
  const groupRaw = packageCore.decodePresentationCaptionB1StrictJsonV001(
    groupContext.rawSemanticOutputInput.snapshot.bytes,
  ).value;
  groupRaw.containers[0].meaningGroups[0] = {reason: 'forbidden'};
  replaceRaw(groupContext, groupRaw);
  const groupResult = checked(groupContext);
  assert.equal(
    groupResult.violations.some((entry) => entry.code === 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD'),
    true,
  );
  assert.equal(
    groupResult.violations.some((entry) => entry.code === 'SEMANTIC_GROUP_INVALID'),
    true,
  );
});

test('unknown field単独はschema/group違反を重ねない', () => {
  const context = makeFixture();
  const raw = packageCore.decodePresentationCaptionB1StrictJsonV001(
    context.rawSemanticOutputInput.snapshot.bytes,
  ).value;
  raw.containers[0].meaningGroups[0].reason = 'forbidden';
  replaceRaw(context, raw);
  const result = checked(context);
  assert.equal(
    result.violations.some((entry) => entry.code === 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD'),
    true,
  );
  assert.equal(
    result.violations.some((entry) => entry.code === 'SEMANTIC_OUTPUT_SCHEMA_INVALID'),
    false,
  );
  assert.equal(
    result.violations.some((entry) => entry.code === 'SEMANTIC_GROUP_INVALID'),
    false,
  );
});

for (const [name, code, mutate] of [
  ['candidate missing', 'EXPANSION_CANDIDATE_MISSING', (value) => {
    const group = value.containers[0].meaningGroups[0];
    group.lines = [group.lines[1]];
    group.lines[0].lineOrdinal = 1;
  }],
  ['candidate duplicate', 'EXPANSION_CANDIDATE_DUPLICATED', (value) => {
    const [first, second] = value.containers[0].meaningGroups[0].lines;
    second.boundaryCandidateIds = [
      first.boundaryCandidateIds[0],
      ...second.boundaryCandidateIds,
    ];
    second.startBoundaryCandidateId = first.startBoundaryCandidateId;
    second.sourceAtomIds = [...first.sourceAtomIds, ...second.sourceAtomIds];
    second.text = first.text + second.text;
    second.startAnchor = clone(first.startAnchor);
    second.logicalWidth += first.logicalWidth;
  }],
  ['candidate order', 'EXPANSION_CANDIDATE_ORDER_REVERSED', (value) => {
    const lines = value.containers[0].meaningGroups[0].lines;
    lines.reverse();
    lines.forEach((line, index) => {
      line.lineOrdinal = index + 1;
    });
  }],
  ['atom missing', 'EXPANSION_SOURCE_ATOM_MISSING', (value) => {
    value.containers[0].meaningGroups[0].lines[0].sourceAtomIds.pop();
  }],
  ['atom duplicate', 'EXPANSION_SOURCE_ATOM_DUPLICATED', (value) => {
    value.containers[0].meaningGroups[0].lines[0].sourceAtomIds.push('atom-000001');
  }],
  ['atom order', 'EXPANSION_SOURCE_ATOM_ORDER_REVERSED', (value) => {
    value.containers[0].meaningGroups[0].lines[0].sourceAtomIds.reverse();
  }],
  ['container cross', 'EXPANSION_CONTAINER_CROSSED', (value) => {
    value.containers[0].meaningGroups[0].lines[0].boundaryCandidateIds[0] =
      'segmenter-boundary-000003';
  }],
  ['text', 'EXPANSION_TEXT_MISMATCH', (value) => {
    value.containers[0].meaningGroups[0].lines[0].text = 'different';
  }],
  ['anchor', 'EXPANSION_ANCHOR_MISMATCH', (value) => {
    value.containers[0].meaningGroups[0].lines[0].startAnchor.atomId = 'atom-000002';
  }],
]) {
  test(`${name}の展開違反は全line走査から検出される`, () => {
    const context = makeFixture();
    replaceCompilerPasses(context, mutate);
    assertViolation(context, code, 'deterministicExpansion');
  });
}

test('compiler schema違反を展開検査へ推測せず拒否する', () => {
  const context = makeFixture();
  replaceCompilerPasses(context, (value) => {
    delete value.containers[0].meaningGroups[0].lines[0].text;
  });
  assertViolation(context, 'COMPILER_INPUT_SCHEMA_INVALID', 'compilerInput');
  const result = checked(context);
  assert.equal(
    result.checks.find((entry) => entry.name === 'deterministicExpansion').status,
    'not_run_with_upstream_failure',
  );
});

test('compiler binding違反を検出する', () => {
  const context = makeFixture();
  replaceCompilerPasses(context, (value) => {
    value.semanticOutputBinding.fileSha256 = 'f'.repeat(64);
  });
  assertViolation(context, 'COMPILER_INPUT_BINDING_MISMATCH', 'compilerInput');
});

test('compiler build失敗をvalid abstainedと混同しない', () => {
  const context = makeFixture();
  context.compilerBuildPasses = [null, null];
  context.buildFailure = {
    stage: 'compiler',
    passOrdinal: 1,
    kind: 'thrown',
    inputByteCopies: [],
  };
  assertViolation(context, 'BUILD_FAILED', 'compilerBuild');
});

test('二passのbyte差を非決定性として検出する', () => {
  const context = makeFixture();
  replaceCompilerPasses(context, (value) => {
    value.containers[0].meaningGroups[0].lines[0].text = 'alternate';
  }, {secondOnly: true});
  assertViolation(context, 'NONDETERMINISTIC', 'determinism');
});

test('監視投影・再読取・書込観測を一つのread-only契約として検査する', () => {
  const context = makeFixture();
  context.readOnlyProcessObservation.afterEntries.push({
    path: 'evals/clip_composition/outputs/presentation/unexpected',
    kind: 'file',
    contentSha256: ZERO_HASH,
  });
  assertViolation(context, 'READ_ONLY_CONTRACT_VIOLATED', 'readOnlyCheck');
});

test('semantic validation report validatorは全root fieldを生contextから再導出する', () => {
  const context = makeFixture();
  const report = expectedReport(context);
  const reportBytes = serialized(report);
  assert.deepEqual(
    semanticCore.validatePresentationCaptionSemanticOutputValidationReportV001({
      report,
      reportBytes,
      expectedExitCode: 0,
      checkerContext: context,
    }),
    {valid: true},
  );
  for (const key of Object.keys(report)) {
    const changed = clone(report);
    if (key === 'status') changed.status = 'failed';
    else if (key === 'failureStage') changed.failureStage = 'jobBinding';
    else if (typeof changed[key] === 'string') changed[key] = `${changed[key]}-tampered`;
    else if (typeof changed[key] === 'object' && changed[key] !== null) {
      changed[key] = Array.isArray(changed[key])
        ? [...changed[key], null]
        : {...changed[key], tampered: true};
    } else {
      changed[key] = 'tampered';
    }
    const bytes = serialized(changed);
    assert.deepEqual(
      semanticCore.validatePresentationCaptionSemanticOutputValidationReportV001({
        report: changed,
        reportBytes: bytes,
        expectedExitCode: 0,
        checkerContext: context,
      }),
      {valid: false},
      key,
    );
  }
});

test('abstained reportはexit 1かつ投影・compiler hashを載せない', () => {
  const context = makeFixture({abstained: true});
  const report = expectedReport(context);
  assert.equal(report.status, 'abstained');
  assert.deepEqual(Object.values(report.observedProjection), Array(6).fill(null));
  assert.deepEqual(report.compilerInput, {
    status: 'not_generated',
    canonicalSha256: null,
    observedByteSha256: null,
  });
  assert.deepEqual(
    semanticCore.validatePresentationCaptionSemanticOutputValidationReportV001({
      report,
      reportBytes: serialized(report),
      expectedExitCode: 1,
      checkerContext: context,
    }),
    {valid: true},
  );
});

test('production filesystem adapterは読み取り専用5入口だけを公開する', () => {
  const adapter =
    semanticRunner.createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001();
  assert.equal(Object.isFrozen(adapter), true);
  assert.deepEqual(Object.keys(adapter), [
    'openReadOnly',
    'lstatBigInt',
    'realpath',
    'readdirWithTypes',
    'readlink',
  ]);
});

test('semantic production読取handleは固定3入口・同期one-use・AsyncIterableで同一内容を返す', async () => {
  const adapter =
    semanticRunner.createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001();
  const absolutePath = resolve(
    WORKSPACE_ROOT,
    'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs',
  );
  const expectedBytes = readFileSync(absolutePath);
  const handle = await adapter.openReadOnly(absolutePath);
  assert.equal(Object.isFrozen(handle), true);
  assert.deepEqual(Object.keys(handle), [
    'statBigInt',
    'readChunksV001',
    'close',
  ]);
  const before = await handle.statBigInt();
  const chunks = handle.readChunksV001();
  assert.equal(Buffer.isBuffer(chunks), false);
  assert.equal(Array.isArray(chunks), false);
  assert.equal(typeof chunks.then, 'undefined');
  assert.equal(typeof chunks[Symbol.asyncIterator], 'function');
  assert.throws(
    () => handle.readChunksV001(),
    /readChunksV001 may only be called once/u,
  );
  const iterator = chunks[Symbol.asyncIterator]();
  assert.throws(
    () => chunks[Symbol.asyncIterator](),
    /chunk AsyncIterable may only be iterated once/u,
  );
  const observed = [];
  for (;;) {
    const item = await iterator.next();
    if (item.done) break;
    observed.push(Buffer.from(item.value));
  }
  const after = await handle.statBigInt();
  await handle.close();
  assert.equal(Buffer.concat(observed).equals(expectedBytes), true);
  assert.equal(before.size, BigInt(expectedBytes.length));
  assert.equal(after.size, before.size);
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
});

test('R3:semanticは空fileを0 chunkで受けone・multi・unevenでも同じhash/countとreportになる', async () => {
  const fixture = materializeRunnerWorkspace();
  try {
    const emptyRepositoryPath =
      `${fixture.context.job.value.readOnlyGuard.watchedRoot}/`
      + 'semantic-r3-empty-v001.bin';
    writeFileSync(resolve(fixture.root, emptyRepositoryPath), Buffer.alloc(0));
    const watched = scanMonitoredTree(
      fixture.root,
      fixture.context.job.value.readOnlyGuard.watchedRoot,
      JOB_PATH,
    );
    fixture.context.job.value.readOnlyGuard.expectedBeforeCanonicalSha256 =
      canonicalSha(watched);
    writeWorkspaceFile(
      fixture.root,
      JOB_PATH,
      serialized(fixture.context.job.value),
    );

    const rows = [];
    for (const chunkMode of ['one', 'multi', 'uneven']) {
      const chunkObservations = [];
      const result = await semanticRunner.runPresentationCaptionSemanticOutputCheckV001(
        JOB_PATH,
        {
          filesystemAdapter: createMappedFilesystemAdapter(
            fixture.root,
            [],
            {chunkMode, chunkObservations},
          ),
          builderAdapter: Object.freeze({
            buildCompilerInput:
              semanticCore.buildPresentationCaptionSemanticCompilerInputV001,
          }),
        },
      );
      assert.equal(result.kind, 'trusted-report', chunkMode);
      assert.equal(result.exitCode, 0, chunkMode);
      rows.push({
        chunkMode,
        reportBytes: result.reportBytes,
        observations: chunkObservations,
      });
      const emptyObservations = chunkObservations.filter(
        (entry) => entry.inputPath === resolve(WORKSPACE_ROOT, emptyRepositoryPath),
      );
      assert.equal(emptyObservations.length > 0, true, chunkMode);
      assert.equal(
        emptyObservations.every((entry) =>
          entry.byteCount === 0
          && entry.fileSha256 === sha(Buffer.alloc(0))
          && entry.chunkCount === 0),
        true,
        chunkMode,
      );
    }
    assert.equal(rows[0].reportBytes.equals(rows[1].reportBytes), true);
    assert.equal(rows[0].reportBytes.equals(rows[2].reportBytes), true);
    const projection = (row) => row.observations.map((entry) => ({
      inputPath: entry.inputPath,
      byteCount: entry.byteCount,
      fileSha256: entry.fileSha256,
    }));
    assert.deepEqual(projection(rows[0]), projection(rows[1]));
    assert.deepEqual(projection(rows[0]), projection(rows[2]));
    assert.equal(
      rows[0].observations.every((entry) =>
        entry.chunkCount === (entry.byteCount === 0 ? 0 : 1)),
      true,
    );
    assert.equal(rows[1].observations.some((entry) => entry.chunkCount > 1), true);
    assert.equal(rows[2].observations.some((entry) => entry.chunkCount > 1), true);
  } finally {
    rmSync(fixture.root, {recursive: true, force: true});
  }
});

test('R3:semantic chunk transport不正はexit 2かつpartial reportなしへ閉じる', async () => {
  for (const kind of [
    'open',
    'return-buffer',
    'return-array',
    'return-promise',
    'non-buffer',
    'empty-chunk',
    'read-throw',
    'post-read-stat-error',
    'short',
    'over',
    'close',
  ]) {
    const fixture = materializeRunnerWorkspace();
    try {
      const base = createMappedFilesystemAdapter(fixture.root);
      const filesystemAdapter = withSemanticSyntheticReadFault(base, {
        kind,
        matches: (inputPath) =>
          inputPath === resolve(WORKSPACE_ROOT, RAW_PATH),
      });
      const result = await semanticRunner.runPresentationCaptionSemanticOutputCheckV001(
        JOB_PATH,
        {
          filesystemAdapter,
          builderAdapter: Object.freeze({
            buildCompilerInput:
              semanticCore.buildPresentationCaptionSemanticCompilerInputV001,
          }),
        },
      );
      assert.deepEqual(result, {
        kind: 'untrusted',
        exitCode: 2,
        diagnostic: 'CAPTION_B1_SEMANTIC_CLI_INTERNAL_REPORT_INVALID',
      }, kind);
      assert.equal(Object.hasOwn(result, 'report'), false, kind);
      assert.equal(Object.hasOwn(result, 'reportBytes'), false, kind);
    } finally {
      rmSync(fixture.root, {recursive: true, force: true});
    }
  }
});

test('CLIは位置引数不成立を固定diagnosticとexit 2で返す', async () => {
  const stdout = [];
  const stderr = [];
  const streams = Object.freeze({
    stdout: Object.freeze({write: (value) => stdout.push(value)}),
    stderr: Object.freeze({write: (value) => stderr.push(value)}),
  });
  const exitCode =
    await semanticRunner.runPresentationCaptionSemanticOutputCheckCliV001([], streams);
  assert.equal(exitCode, 2);
  assert.deepEqual(stdout, []);
  assert.deepEqual(stderr, ['CAPTION_B1_SEMANTIC_CLI_USAGE_INVALID\n']);
});

test('CLIはstream write例外もrejectせずexit 2へ閉じる', async () => {
  const streams = Object.freeze({
    stdout: Object.freeze({
      write() {
        throw new TypeError('synthetic stdout failure');
      },
    }),
    stderr: Object.freeze({
      write() {
        throw new TypeError('synthetic stderr failure');
      },
    }),
  });
  assert.equal(
    await semanticRunner.runPresentationCaptionSemanticOutputCheckCliV001([], streams),
    2,
  );
});

test('production CLI実processはtrusted 0/1とusage 2をstdout/stderrへ排他的に出す', () => {
  for (const [name, options, expectedExit, expectedStatus, outputSide] of [
    ['complete', {}, 0, 'passed', 'stdout'],
    ['abstained', {abstained: true}, 1, 'abstained', 'stderr'],
  ]) {
    const fixture = materializeRunnerWorkspace(options);
    try {
      const runnerPath = resolve(fixture.root, DIRECT[2][1]);
      const result = spawnSync(process.execPath, [runnerPath, JOB_PATH], {
        cwd: fixture.root,
        encoding: null,
      });
      assert.equal(result.status, expectedExit, name);
      const selected = outputSide === 'stdout' ? result.stdout : result.stderr;
      const other = outputSide === 'stdout' ? result.stderr : result.stdout;
      assert.equal(Buffer.isBuffer(selected), true);
      assert.equal(selected.length > 0, true);
      assert.equal(other.length, 0);
      const decoded = packageCore.decodePresentationCaptionB1StrictJsonV001(selected);
      assert.equal(decoded.status, 'decoded');
      assert.equal(decoded.value.status, expectedStatus);
    } finally {
      rmSync(fixture.root, {recursive: true, force: true});
    }
  }

  const fixture = materializeRunnerWorkspace();
  try {
    const runnerPath = resolve(fixture.root, DIRECT[2][1]);
    const usage = spawnSync(process.execPath, [runnerPath], {
      cwd: fixture.root,
      encoding: 'utf8',
    });
    assert.equal(usage.status, 2);
    assert.equal(usage.stdout, '');
    assert.equal(usage.stderr, 'CAPTION_B1_SEMANTIC_CLI_USAGE_INVALID\n');
  } finally {
    rmSync(fixture.root, {recursive: true, force: true});
  }
});

test('production CLIにadapter・root・期待値の注入口がなくrunnerは同じcoreを呼ぶ', async () => {
  const source = await readFile(
    new URL('./run_presentation_caption_semantic_output_check_v001.mjs', import.meta.url),
    'utf8',
  );
  assert.match(
    source,
    /runPresentationCaptionSemanticOutputCheckV001\(argv\[0\],\s*\{\s*filesystemAdapter:\s*createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001\(\),\s*builderAdapter:\s*productionBuilderAdapter\(\),?\s*\}\)/u,
  );
  assert.match(
    source,
    /buildCompilerInput:\s*buildPresentationCaptionSemanticCompilerInputV001/u,
  );
  assert.match(source, /checkPresentationCaptionSemanticOutputV001\(initialContext\)/u);
  assert.match(source, /checkPresentationCaptionSemanticOutputV001\(finalContext\)/u);
  assert.match(
    source,
    /validatePresentationCaptionSemanticOutputValidationReportV001\(\{/u,
  );
  assert.doesNotMatch(source, /process\.env/u);
});

test('semantic coreはstrict JSON・formal・canonical・hash・57 code列をpackage coreだけから使う', async () => {
  const source = await readFile(
    new URL('./presentation_caption_semantic_output_v001.mjs', import.meta.url),
    'utf8',
  );
  assert.match(
    source,
    /from '\.\/presentation_caption_semantic_source_package_v001\.mjs';/u,
  );
  assert.doesNotMatch(source, /const PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001/u);
  assert.doesNotMatch(source, /export const PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001/u);
  assert.equal((source.match(/\bJSON\.parse\s*\(/gu) ?? []).length, 1);
  assert.match(source, /const cloneJson = \(value\) => JSON\.parse\(JSON\.stringify\(value\)\)/u);
  const runnerSource = await readFile(
    new URL('./run_presentation_caption_semantic_output_check_v001.mjs', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(runnerSource, /\bJSON\.parse\s*\(/u);
});

test('B1実行import graphは実8 fileのstatic builtin集合とlocal辺へ完全一致する', async () => {
  const expected = new Map([
    ['presentation_caption_semantic_source_package_v001.mjs', [
      'node:crypto',
      './presentation_renderer_text_layout_v001.mjs',
      './presentation_segmenter_boundary_evidence_v001.mjs',
      './run_presentation_segmenter_boundary_preflight_v001.mjs',
    ]],
    ['run_presentation_caption_semantic_source_package_job_v001.mjs', [
      'node:crypto',
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:process',
      'node:url',
      './presentation_caption_semantic_source_package_v001.mjs',
      './presentation_segmenter_boundary_evidence_v001.mjs',
    ]],
    ['presentation_caption_semantic_output_v001.mjs', [
      './presentation_caption_semantic_source_package_v001.mjs',
    ]],
    ['run_presentation_caption_semantic_output_check_v001.mjs', [
      'node:crypto',
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:url',
      'node:process',
      './presentation_caption_semantic_source_package_v001.mjs',
      './presentation_caption_semantic_output_v001.mjs',
    ]],
    ['presentation_renderer_text_layout_v001.mjs', []],
    ['presentation_segmenter_boundary_evidence_v001.mjs', [
      'node:crypto',
      'node:path',
      'node:url',
      './presentation_retained_source_atoms_v001.mjs',
    ]],
    ['presentation_retained_source_atoms_v001.mjs', ['node:crypto']],
    ['run_presentation_segmenter_boundary_preflight_v001.mjs', [
      'node:crypto',
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:url',
      './presentation_segmenter_boundary_evidence_v001.mjs',
    ]],
  ]);
  for (const [fileName, expectedSpecifiers] of expected) {
    const source = await readFile(new URL(`./${fileName}`, import.meta.url), 'utf8');
    const pattern =
      /(?:^|\n)\s*import(?:\s+[\s\S]*?\s+from\s+|\s*)['"]([^'"]+)['"]\s*;?/gu;
    const actual = [];
    let match;
    while ((match = pattern.exec(source)) !== null) actual.push(match[1]);
    assert.deepEqual([...actual].sort(), [...expectedSpecifiers].sort(), fileName);
    assert.equal(new Set(actual).size, actual.length, `${fileName}: duplicate import`);
    assert.doesNotMatch(source, /^await\b/mu, `${fileName}: top-level await`);
    assert.equal(
      actual.includes('./presentation_renderer_trust_v001.mjs')
        || actual.includes('./presentation_renderer_plan_v002.mjs'),
      false,
      `${fileName}: renderer trust execution import`,
    );
  }
});

test('packageとsemanticのR1 scanner正本・実経路・限定hashbang表は同期する', async () => {
  const begin = '// EXECUTABLE_JAVASCRIPT_SCANNER_GRAMMAR_V001_BEGIN';
  const end = '// EXECUTABLE_JAVASCRIPT_SCANNER_GRAMMAR_V001_END';
  const scannerBlock = (source, label) => {
    const startIndex = source.indexOf(begin);
    const endIndex = source.indexOf(end);
    assert.equal(startIndex >= 0, true, `${label}: begin marker`);
    assert.equal(endIndex > startIndex, true, `${label}: end marker`);
    assert.equal(source.indexOf(begin, startIndex + begin.length), -1, `${label}: one begin`);
    assert.equal(source.indexOf(end, endIndex + end.length), -1, `${label}: one end`);
    return source.slice(startIndex, endIndex + end.length);
  };
  const packageSource = await readFile(
    new URL('./presentation_caption_semantic_source_package_v001.mjs', import.meta.url),
    'utf8',
  );
  const semanticSource = await readFile(
    new URL('./presentation_caption_semantic_output_v001.mjs', import.meta.url),
    'utf8',
  );
  assert.equal(
    scannerBlock(packageSource, 'package'),
    scannerBlock(semanticSource, 'semantic'),
  );
  for (const [label, source] of [
    ['package', packageSource],
    ['semantic', semanticSource],
  ]) {
    assert.match(
      source,
      /const importSpecifiers = \(bytes\) => \{\s*const scan = executableJavaScriptTokensFromBytesV001\(bytes\);\s*const \{source\} = scan;/u,
      `${label}: production import graph uses Buffer scanner entry`,
    );
  }

  const textLayoutBytes = actualImplementationSources().textLayoutImplementation;
  const scannerProbeBody = Buffer.concat([
    Buffer.from('// hashbang scanner probe\n', 'utf8'),
    textLayoutBytes,
  ]);
  const {accepted, rejected} = makeR1HashbangScannerCases(scannerProbeBody);
  const acceptedByLabel = new Map(accepted);
  const rejectedByLabel = new Map(rejected);
  const hashbangStem = Buffer.from('#!/usr/bin/env node', 'utf8');
  const byteShapeFailures = [];
  const recordByteShape = (label, condition) => {
    if (!condition) byteShapeFailures.push(label);
  };
  recordByteShape('合成本文の先頭はLFでない', textLayoutBytes[0] !== 0x0a);
  recordByteShape(
    'LF終端',
    acceptedByLabel.get('LF終端')
      .subarray(hashbangStem.length, hashbangStem.length + 1)
      .equals(Buffer.from([0x0a]))
      && acceptedByLabel.get('LF終端')[hashbangStem.length + 1]
        === scannerProbeBody[0],
  );
  recordByteShape(
    'CRLF終端',
    acceptedByLabel.get('CRLF終端')
      .subarray(hashbangStem.length, hashbangStem.length + 2)
      .equals(Buffer.from([0x0d, 0x0a]))
      && acceptedByLabel.get('CRLF終端')[hashbangStem.length + 2]
        === scannerProbeBody[0],
  );
  recordByteShape(
    '裸CR終端',
    rejectedByLabel.get('裸CR終端')
      .subarray(hashbangStem.length, hashbangStem.length + 1)
      .equals(Buffer.from([0x0d]))
      && rejectedByLabel.get('裸CR終端')[hashbangStem.length + 1] !== 0x0a
      && rejectedByLabel.get('裸CR終端')[hashbangStem.length + 1]
        === scannerProbeBody[0],
  );
  recordByteShape(
    'U+2028終端',
    rejectedByLabel.get('U+2028終端')
      .subarray(hashbangStem.length, hashbangStem.length + 3)
      .equals(Buffer.from([0xe2, 0x80, 0xa8])),
  );
  recordByteShape(
    'U+2029終端',
    rejectedByLabel.get('U+2029終端')
      .subarray(hashbangStem.length, hashbangStem.length + 3)
      .equals(Buffer.from([0xe2, 0x80, 0xa9])),
  );
  recordByteShape(
    '行終端なしEOF',
    rejectedByLabel.get('行終端なしEOF').equals(hashbangStem),
  );
  recordByteShape(
    'hashbang後の空行',
    acceptedByLabel.get('hashbang後の空行')
      .subarray(hashbangStem.length, hashbangStem.length + 2)
      .equals(Buffer.from([0x0a, 0x0a]))
      && acceptedByLabel.get('hashbang後の空行')[hashbangStem.length + 2]
        === scannerProbeBody[0],
  );
  accepted.unshift(['hashbangなし', Buffer.from(textLayoutBytes)]);
  const acceptedFailures = accepted.map(([label, sourceBytes]) => {
    try {
      const result = checkSemanticImportGraphBytes(
        'textLayoutImplementation',
        sourceBytes,
      );
      return result.violations.some(
        (entry) => entry.code === 'IMPLEMENTATION_MISMATCH',
      )
        ? label
        : null;
    } catch (error) {
      return `${label}: ${error.name}: ${error.message}`;
    }
  }).filter((entry) => entry !== null);
  const rejectedFailures = rejected.map(([label, sourceBytes]) => {
    try {
      const result = checkSemanticImportGraphBytes(
        'textLayoutImplementation',
        sourceBytes,
      );
      return result.violations.some(
        (entry) => entry.code === 'IMPLEMENTATION_MISMATCH',
      )
        ? null
        : label;
    } catch (error) {
      return `${label}: ${error.name}: ${error.message}`;
    }
  }).filter((entry) => entry !== null);
  assert.deepEqual(acceptedFailures, []);
  assert.deepEqual(rejectedFailures, []);
  assert.deepEqual(byteShapeFailures, []);
});

test('productionのmodule-load file I/O検査を実際のsemantic実装7 fileへ適用する', () => {
  const context = makeFixture({implementationSources: actualImplementationSources()});
  const result = checked(context);
  assert.equal(
    result.violations.some((entry) => entry.code === 'IMPLEMENTATION_MISMATCH'),
    false,
  );
});

test('semantic checkerの共有担当を含むcode×check観測集合と57 code partitionは完全一致する', () => {
  const expectedSemanticPairs = new Set(
    Object.entries(SEMANTIC_CHECK_BY_CODE).flatMap(([code, checkNames]) =>
      checkNames.map((checkName) => `${code}\u0000${checkName}`)),
  );
  assert.deepEqual(
    [...observedSemanticCodeChecks].sort(),
    [...expectedSemanticPairs].sort(),
  );
  assert.deepEqual(
    [...new Set([...PACKAGE_OWNED_CODE_PARTITION, ...SEMANTIC_OWNED_CODES])].sort(),
    [...ALL_VIOLATION_CODES].sort(),
  );
  assert.equal(
    PACKAGE_OWNED_CODE_PARTITION.some((code) => SEMANTIC_OWNED_CODES.includes(code)),
    false,
  );
});
