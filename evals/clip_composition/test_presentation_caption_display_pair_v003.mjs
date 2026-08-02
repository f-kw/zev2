import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {dirname, relative, resolve, sep} from 'node:path';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';

import * as b4Core from './presentation_caption_display_pair_v003.mjs';
import * as displayPairRunner
  from './run_presentation_caption_display_pair_job_v001.mjs';
import * as captionV003 from './presentation_caption_contract_v003.mjs';
import * as instructionV003 from './presentation_instruction_contract_v003.mjs';
import {
  buildPresentationCaptionSemanticCompilerInputV001,
} from './presentation_caption_semantic_output_v001.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RUNNER_PATH =
  'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs';
const PREFLIGHT_RUNNER_PATH =
  'evals/clip_composition/run_presentation_caption_display_pair_static_preflight_v001.mjs';
const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs';
const OUTPUT_PARENT =
  'evals/clip_composition/outputs/presentation/caption-display-pairs';
const TESTDATA_ROOT =
  'evals/clip_composition/testdata/presentation-caption-display-pair-v003';
const SOURCE_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
  + 'DmWu0jVQfTE-candidate-13-v001';
const RETAINED_ROOT =
  'evals/clip_composition/outputs/presentation/retained-source-atoms/'
  + 'DmWu0jVQfTE-candidate-13-v001';
const BASE_ROOT =
  'evals/clip_composition/outputs/presentation/base-media/'
  + 'DmWu0jVQfTE-candidate-13-v002';
const REGISTRY_ROOT =
  'evals/clip_composition/registries/presentation/'
  + 'normal-landscape-preset-registry-v001';
const HASH = '0'.repeat(64);

const clone = (value) => structuredClone(value);
const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const canonicalBytes = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return result.bytes;
};
const shaBytes = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  assert.equal(result.status, 'hashed');
  return result.sha256;
};
const canonicalSha = (value) => shaBytes(canonicalBytes(value));
const repositoryAbsolute = (pathValue) => resolve(WORKSPACE_ROOT, pathValue);
const jsonValue = (pathValue) => JSON.parse(readFileSync(repositoryAbsolute(pathValue), 'utf8'));
const binding = (pathValue, canonical = true) => {
  const bytes = readFileSync(repositoryAbsolute(pathValue));
  const base = {path: pathValue, fileSha256: shaBytes(bytes)};
  return canonical ? {...base, canonicalSha256: canonicalSha(JSON.parse(bytes))} : base;
};
const snapshot = (pathValue, value) => {
  const bytes = Buffer.isBuffer(value) ? Buffer.from(value) : formalBytes(value);
  const stat = {
    dev: '1',
    ino: '1',
    mode: '33188',
    nlink: '1',
    size: String(bytes.length),
    mtimeNs: '1',
    ctimeNs: '1',
  };
  return {
    path: pathValue,
    bytes,
    fileSha256: shaBytes(bytes),
    statBefore: stat,
    statAfter: stat,
  };
};

const atomProvenance = () => Object.fromEntries(
  ['sttManifest', 'transcript', 'wordTimestamps', 'candidateManifest'].map((role) => [
    role,
    {path: `synthetic/${role}.json`, fileSha256: HASH},
  ]),
);

const makeAtoms = () => [
  {atomId: 'atom-a', speechId: 1, speaker: 'SPEAKER_A', text: '母', startMs: 100, endMs: 200},
  {atomId: 'atom-b', speechId: 1, speaker: 'SPEAKER_A', text: '船', startMs: 200, endMs: 300},
  {atomId: 'atom-c', speechId: 2, speaker: 'SPEAKER_B', text: '月', startMs: 300, endMs: 400},
  {atomId: 'atom-d', speechId: 2, speaker: 'SPEAKER_B', text: '刊', startMs: 400, endMs: 500},
];

const makeCompiler = () => ({
  schemaVersion: 'presentation-caption-semantic-compiler-input-v001',
  artifactId: 'synthetic-artifact',
  sourcePackageBinding: {},
  semanticOutputBinding: {},
  containers: [{
    containerId: 'container-alpha',
    timelineSegmentId: 'segment-alpha',
    speechId: 1,
    meaningGroups: [
      {
        meaningGroupOrdinal: 1,
        lines: [{
          lineOrdinal: 1,
          sourceAtomIds: ['atom-a', 'atom-b'],
          text: '母船',
          startAnchor: {atomId: 'atom-a', edge: 'start'},
          endAnchor: {atomId: 'atom-b', edge: 'end'},
          logicalWidth: 4,
        }],
      },
      {
        meaningGroupOrdinal: 2,
        lines: [{
          lineOrdinal: 1,
          sourceAtomIds: ['atom-c', 'atom-d'],
          text: '月刊',
          startAnchor: {atomId: 'atom-c', edge: 'start'},
          endAnchor: {atomId: 'atom-d', edge: 'end'},
          logicalWidth: 4,
        }],
      },
    ],
  }],
});

const makeDisplayPlan = () => ({
  schemaVersion: 'presentation-caption-display-plan-v001',
  displayPlanId: 'synthetic-pair-display-plan',
  artifactId: 'synthetic-artifact',
  sourceProvenance: 'synthetic-source-v001',
  atomGranularity: 'character-timestamp',
  semanticCompilerInputBinding: {},
  sourceAtomBinding: {},
  timelineBinding: {},
  presetBinding: {},
  containers: [{
    containerId: 'container-alpha',
    timelineSegmentId: 'segment-alpha',
    speechId: 1,
    cues: [
      {
        cueId: 'caption-cue-000001',
        targetRefId: 'caption-target-000001',
        instructionId: 'caption-instruction-000001',
        globalCueOrdinal: 1,
        meaningGroupOrdinal: 1,
        lines: [{
          lineOrdinal: 1,
          sourceAtomIds: ['atom-a', 'atom-b'],
          text: '母船',
          startAnchor: {atomId: 'atom-a', edge: 'start'},
          endAnchor: {atomId: 'atom-b', edge: 'end'},
          logicalWidth: 4,
        }],
        startAnchor: {atomId: 'atom-a', edge: 'start'},
        endAnchor: {atomId: 'atom-b', edge: 'end'},
        sourceStartMs: 100,
        sourceEndMs: 300,
      },
      {
        cueId: 'caption-cue-000002',
        targetRefId: 'caption-target-000002',
        instructionId: 'caption-instruction-000002',
        globalCueOrdinal: 2,
        meaningGroupOrdinal: 2,
        lines: [{
          lineOrdinal: 1,
          sourceAtomIds: ['atom-c', 'atom-d'],
          text: '月刊',
          startAnchor: {atomId: 'atom-c', edge: 'start'},
          endAnchor: {atomId: 'atom-d', edge: 'end'},
          logicalWidth: 4,
        }],
        startAnchor: {atomId: 'atom-c', edge: 'start'},
        endAnchor: {atomId: 'atom-d', edge: 'end'},
        sourceStartMs: 300,
        sourceEndMs: 500,
      },
    ],
  }],
});

const makeRetained = () => ({
  schemaVersion: 'presentation-retained-source-atoms-v001',
  artifactId: 'synthetic-artifact',
  extractorVersion: 'synthetic',
  sourceRef: 'synthetic:source',
  sourceProvenance: 'synthetic-source-v001',
  atomGranularity: 'character-timestamp',
  atomProvenance: atomProvenance(),
  selection: {},
  rawSourceAtomsCanonicalSha256: canonicalSha(makeAtoms()),
  rawSourceAtoms: makeAtoms().map((atom) => ({...atom, sourceRef: 'synthetic:source'})),
});

const makeInstructionInput = () => {
  const displayPlan = makeDisplayPlan();
  const retainedSourceAtoms = makeRetained();
  const atoms = makeAtoms();
  const displayBinding = {
    displayPlanId: displayPlan.displayPlanId,
    fileSha256: HASH,
    canonicalSha256: HASH,
  };
  const captionTargets = [
    {targetId: 'caption-target-000001', requiredAtomIds: ['atom-a', 'atom-b'], allowedOmissionAtomIds: []},
    {targetId: 'caption-target-000002', requiredAtomIds: ['atom-c', 'atom-d'], allowedOmissionAtomIds: []},
  ];
  const captionCues = displayPlan.containers[0].cues.map((cue) => ({
    cueId: cue.cueId,
    targetId: cue.targetRefId,
    lines: cue.lines.map((line) => ({
      atomIds: [...line.sourceAtomIds],
      renderedText: line.text,
    })),
    startAnchor: clone(cue.startAnchor),
    endAnchor: clone(cue.endAnchor),
    startMs: cue.sourceStartMs,
    endMs: cue.sourceEndMs,
  }));
  const resolutionPackage = {
    schemaVersion: instructionV003.PRESENTATION_RESOLUTION_PACKAGE_SCHEMA_VERSION_V003,
    resolutionPackageId: 'synthetic-pair-resolution-package',
    sourceProvenance: retainedSourceAtoms.sourceProvenance,
    atomGranularity: 'character-timestamp',
    sourceSpeakerNormalization: {},
    sourceAtomsSha256: canonicalSha(atoms),
    sourceAtoms: atoms,
    targets: [
      {
        targetRefId: 'caption-target-000001',
        targetType: 'caption-target',
        captionContractRefId: 'caption-contract-v003',
        cueId: 'caption-cue-000001',
      },
      {
        targetRefId: 'caption-target-000002',
        targetType: 'caption-target',
        captionContractRefId: 'caption-contract-v003',
        cueId: 'caption-cue-000002',
      },
    ],
    captionContracts: [{
      captionContractRefId: 'caption-contract-v003',
      captionSchemaVersion: captionV003.PRESENTATION_CAPTION_SCHEMA_VERSION_V003,
      sourceDisplayPlanBinding: displayBinding,
      captionTargets,
      allowedSimultaneousGroups: [],
      captionPlan: {cues: captionCues},
    }],
  };
  const trustedRegistryBindings = {
    presetRegistryVersion: 'normal-landscape-preset-registry-v001',
    materialRegistryVersion: 'normal-landscape-material-registry-v001',
  };
  const instructionBundle = {
    schemaVersion: instructionV003.PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V003,
    pairId: 'synthetic-pair',
    displayPlanBinding: {...displayBinding, path: 'display-plan.json'},
    instructionSet: {
      schemaVersion: instructionV003.PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V003,
      instructionSetId: 'synthetic-pair-instruction-set',
      format: 'normal-landscape',
      rendererContractVersion:
        instructionV003.PRESENTATION_RENDERER_CONTRACT_VERSION_V003,
      sourceProvenance: retainedSourceAtoms.sourceProvenance,
      resolutionPackageId: resolutionPackage.resolutionPackageId,
      resolutionPackageCanonicalSha256: canonicalSha(resolutionPackage),
      presetRegistryBinding: {},
      materialRegistryBinding: {},
      instructions: [
        {
          instructionId: 'caption-instruction-000001',
          trigger: {startAtomId: 'atom-a'},
          kind: 'speech-caption',
          target: {targetType: 'caption-target', targetRefIds: ['caption-target-000001']},
          presetId: 'normal-landscape-readable-pop-v001',
          materialRefs: [],
        },
        {
          instructionId: 'caption-instruction-000002',
          trigger: {startAtomId: 'atom-c'},
          kind: 'speech-caption',
          target: {targetType: 'caption-target', targetRefIds: ['caption-target-000002']},
          presetId: 'normal-landscape-readable-pop-v001',
          materialRefs: [],
        },
      ],
    },
    resolutionPackage,
  };
  return {
    instructionBundle,
    displayPlan,
    retainedSourceAtoms,
    trustedRegistryBindings,
    presetRegistry: {registryVersion: trustedRegistryBindings.presetRegistryVersion},
    presetValidationIndex: {registryVersion: trustedRegistryBindings.presetRegistryVersion},
    materialValidationIndex: {registryVersion: trustedRegistryBindings.materialRegistryVersion},
  };
};

const makeJob = () => {
  const impl = (role, path) => ({role, path, fileSha256: HASH});
  const jsonRef = (path) => ({
    path,
    fileSha256: HASH,
    canonicalSha256: HASH,
  });
  const binaryRef = (path) => ({path, fileSha256: HASH});
  return {
    schemaVersion: 'presentation-caption-display-pair-generation-job-v001',
    jobId: 'synthetic-b4-job',
    artifactId: 'synthetic-artifact',
    mode: 'formal-generation',
    implementationBinding: {
      gitCommit: 'a'.repeat(40),
      files: [
        impl(
          'displayPairCore',
          'evals/clip_composition/presentation_caption_display_pair_v003.mjs',
        ),
        impl(
          'displayPairRunner',
          'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs',
        ),
      ],
      dependencyFiles: [
        ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
        ['semanticRunner', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs'],
        ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
        ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
        ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
        ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
        ['layoutPreflightCore', 'evals/clip_composition/inspect_presentation_preset_layout.ts'],
        ['rendererLayoutCore', 'runner/src/telop/telop-render-model.ts'],
        ['presetRegistry', `${REGISTRY_ROOT}/preset-registry.json`],
        ['presetValidationIndex', `${REGISTRY_ROOT}/preset-validation-index.json`],
        ['materialValidationIndex', `${REGISTRY_ROOT}/material-validation-index.json`],
        ['trustedRegistryBindings', `${REGISTRY_ROOT}/trusted-registry-bindings.json`],
        ['sharedJsonContractCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
      ].map(([role, path]) => impl(role, path)),
    },
    sourcePackageBinding: {
      rootPath: 'synthetic/source-package',
      manifest: jsonRef('synthetic/source-package/package-manifest.json'),
      validationReport: jsonRef('synthetic/source-package/package-validation-report.json'),
    },
    semanticCheckBinding: {
      job: jsonRef('synthetic/semantic/job.json'),
      rawSemanticOutput: jsonRef('synthetic/semantic/raw-output.json'),
      validationReport: jsonRef('synthetic/semantic/validation-report.json'),
      expectedCompilerInputObservedByteSha256: HASH,
      expectedCompilerInputCanonicalSha256: HASH,
    },
    retainedSourceBinding: {
      rootPath: 'synthetic/retained-source',
      generationManifest: jsonRef('synthetic/retained-source/generation-manifest.json'),
      sourceAtoms: jsonRef('synthetic/retained-source/source-atoms.json'),
      validationReport: jsonRef('synthetic/retained-source/validation-report.json'),
    },
    baseMediaBinding: {
      rootPath: 'synthetic/base-media',
      generationManifest: jsonRef('synthetic/base-media/generation-manifest.json'),
      timeline: jsonRef('synthetic/base-media/timeline.json'),
      validationReport: jsonRef('synthetic/base-media/validation-report.json'),
      baseMedia: binaryRef('synthetic/base-media/base-media.mp4'),
    },
    registryBinding: {
      rootPath: 'synthetic/registry',
      trustedRegistryBindings: jsonRef('synthetic/registry/trusted-registry-bindings.json'),
      presetRegistry: jsonRef('synthetic/registry/preset-registry.json'),
      presetValidationIndex: jsonRef('synthetic/registry/preset-validation-index.json'),
      materialValidationIndex: jsonRef('synthetic/registry/material-validation-index.json'),
    },
    expectedRuntime: {
      resolvedNodePath: '/synthetic/node',
      nodeBinarySha256: HASH,
      nodeVersion: 'v20.0.0',
      icuVersion: '75.1',
      resolvedLocale: 'ja',
      resolvedGranularity: 'word',
      layoutExecutionBinding: {},
    },
    expectedProjection: {
      sourceAtomCount: 4,
      containerCount: 1,
      boundaryCandidateCount: 4,
      meaningGroupCount: 2,
      cueCount: 2,
      lineCount: 2,
      timelineSegmentCount: 1,
      compilerInputObservedByteSha256: HASH,
      compilerInputCanonicalSha256: HASH,
    },
    publication: {
      pairId: 'synthetic-b4-pair',
      formalOutputPath:
        'evals/clip_composition/outputs/presentation/caption-display-pairs/synthetic-b4-pair',
      lockPath:
        'evals/clip_composition/outputs/presentation/caption-display-pairs/synthetic-b4-pair.lock',
      workPath:
        'evals/clip_composition/outputs/presentation/caption-display-pairs/synthetic-b4-pair.work',
    },
    readOnlyGuard: {
      watchedRoot: 'synthetic/watched',
      excludedPaths: ['synthetic/job.json'],
      allowedWritePaths: [
        'synthetic/formal',
        'synthetic/formal.lock',
        'synthetic/formal.work',
      ],
      expectedBeforeCanonicalSha256: HASH,
    },
  };
};

const makeReviewState = () => ({
  stage: 'review_input_ready',
  reviewOnly: true,
  publicationAllowed: false,
  segmenterBoundaryEvidence: 'passed',
  semanticStructure: 'passed',
  naturalBoundary: 'pending_human_review',
  semanticReadability: 'pending_human_review',
  layoutPreflight: 'passed',
  renderedLayoutQc: 'pending_render_qc',
  humanAssessment: 'not_requested',
});

const makeContext = () => {
  const instructionInput = makeInstructionInput();
  const captionValidation =
    instructionV003.validatePresentationInstructionContractV003(instructionInput);
  assert.notEqual(captionValidation.status, 'failed');
  const grammar = captionValidation.captionValidation.grammarReport;
  return {
    contextPhase: 'report-finalization',
    jobObservation: {
      path: 'synthetic/job.json',
      fileSha256: HASH,
      value: makeJob(),
      prePublicationMatches: true,
      preReportMatches: true,
    },
    implementationObservations: [{matches: true}],
    inputObservations: [{
      pathSafe: true,
      fileSetValid: true,
      hashMatches: true,
      schemaSupported: true,
    }],
    runtimeObservation: {
      value: makeJob().expectedRuntime,
      matches: true,
      mismatchPath: '$.runtime.nodeVersion',
    },
    semanticObservation: {
      reportPassed: true,
      compilerInputAvailable: true,
      bindingsMatch: true,
      compilerRebuildFailed: false,
      compilerHashesMatch: true,
      compilerObservedByteSha256: HASH,
      compilerCanonicalSha256: HASH,
      expectedContainerCount: 1,
      compilerInput: makeCompiler(),
    },
    sourceObservation: {
      bindingMatches: true,
      atoms: makeAtoms(),
      positiveOverlapCount: 0,
    },
    timelineObservation: {
      bindingMatches: true,
      validationPassed: true,
      mappingPassed: true,
      nestedViolationCodes: [],
      segmentCount: 1,
      mappingByCue: {
        'caption-cue-000001': {segmentCount: 1},
        'caption-cue-000002': {segmentCount: 1},
      },
      positiveCueOverlapCount: 0,
    },
    buildObservation: {
      status: 'built',
      failureStage: null,
      displayPlan: instructionInput.displayPlan,
      instructionInput,
      captionCheckReport: {
        overallStatus: grammar.overallStatus,
        contract: clone(grammar.contract),
        checks: clone(grammar.checks),
      },
      layoutPreflight: {status: 'passed'},
      reviewState: makeReviewState(),
      reviewRenderRequestValid: true,
      pairBindingsMatch: true,
      deterministic: true,
    },
    publicationObservation: {
      readOnlyUnchanged: true,
      readOnlyObservation: {
        status: 'passed',
        beforeCanonicalSha256: HASH,
        afterCanonicalSha256: HASH,
        unchanged: true,
      },
      initialPathsClear: true,
      lockAvailable: true,
      stagingValid: true,
      inputUnchanged: true,
      preRenameValid: true,
      ioSucceeded: true,
      publishedPairValid: true,
    },
  };
};

const resultOf = (mutate) => {
  const context = makeContext();
  mutate(context);
  return b4Core.checkPresentationCaptionDisplayPairV003(context);
};
const assertSingle = (result, code, path) => {
  assert.equal(result.status, 'checked');
  assert.equal(result.violations.length, 1);
  assert.deepEqual(
    {
      code: result.violations[0].code,
      path: result.violations[0].path,
    },
    {code, path},
  );
};

const probes = [
  ['T001', 'CAPTION_B4_JOB_INVALID', '$.job.value', (x) => { x.jobObservation.value.extra = true; }],
  ['T002', 'JOB_FILE_MISMATCH', '$.job.prePublication', (x) => { x.jobObservation.prePublicationMatches = false; }],
  ['T003', 'IMPLEMENTATION_MISMATCH', '$.implementationBindings[0].fileSha256', (x) => { x.implementationObservations[0].matches = false; }],
  ['T004', 'INPUT_PATH_UNSAFE', '$.inputBindings[0].path', (x) => { x.inputObservations[0].pathSafe = false; }],
  ['T005', 'INPUT_FILE_SET_INVALID', '$.inputBindings[0].directoryEntries', (x) => { x.inputObservations[0].fileSetValid = false; }],
  ['T006', 'INPUT_HASH_MISMATCH', '$.inputBindings[0].fileSha256', (x) => { x.inputObservations[0].hashMatches = false; }],
  ['T007', 'INPUT_SCHEMA_UNSUPPORTED', '$.inputBindings[0].decodedValue', (x) => { x.inputObservations[0].schemaSupported = false; }],
  ['T008', 'RUNTIME_MISMATCH', '$.runtime.nodeVersion', (x) => { x.runtimeObservation.matches = false; }],
  ['T009', 'SEMANTIC_REPORT_NOT_PASSED', '$.semantic.validationReport.status', (x) => { x.semanticObservation.reportPassed = false; }],
  ['T010', 'SEMANTIC_COMPILER_INPUT_NOT_AVAILABLE', '$.semantic.compilerInput', (x) => { x.semanticObservation.compilerInputAvailable = false; }],
  ['T011', 'SEMANTIC_BINDING_MISMATCH', '$.semantic.bindings.rawSemanticOutput', (x) => { x.semanticObservation.bindingsMatch = false; }],
  ['T012', 'SEMANTIC_COMPILER_REBUILD_FAILED', '$.semantic.builds.compiler', (x) => { x.semanticObservation.compilerRebuildFailed = true; }],
  ['T013', 'SEMANTIC_COMPILER_HASH_MISMATCH', '$.semantic.compilerInputHash.canonicalSha256', (x) => { x.semanticObservation.compilerHashesMatch = false; }],
  ['T014', 'COMPILER_INPUT_SCHEMA_INVALID', '$.semantic.compilerInput.schemaVersion', (x) => { x.semanticObservation.compilerInput.schemaVersion = 'v000'; }],
  ['T015', 'COMPILER_CONTAINER_SET_INVALID', '$.semantic.compilerInput.containers', (x) => { x.semanticObservation.compilerInput.containers = []; }],
  ['T016', 'COMPILER_MEANING_GROUP_INVALID', '$.semantic.compilerInput.containers[0].meaningGroups[1]', (x) => { x.semanticObservation.compilerInput.containers[0].meaningGroups[1].meaningGroupOrdinal = 1; }],
  ['T017', 'COMPILER_LINE_INVALID', '$.semantic.compilerInput.containers[0].meaningGroups[0].lines[0]', (x) => { x.semanticObservation.compilerInput.containers[0].meaningGroups[0].lines[0].lineOrdinal = 0; }],
  ['T018', 'COMPILER_ATOM_COVERAGE_INVALID', '$.semantic.compilerInput.containers', (x) => { x.semanticObservation.compilerInput.containers[0].meaningGroups[0].lines[0].sourceAtomIds.pop(); }],
  ['T019', 'COMPILER_TEXT_MISMATCH', '$.semantic.compilerInput.containers[0].meaningGroups[0].lines[0].text', (x) => { x.semanticObservation.compilerInput.containers[0].meaningGroups[0].lines[0].text = '不一致'; }],
  ['T020', 'COMPILER_ANCHOR_MISMATCH', '$.semantic.compilerInput.containers[0].meaningGroups[0].lines[0].endAnchor', (x) => { x.semanticObservation.compilerInput.containers[0].meaningGroups[0].lines[0].endAnchor.atomId = 'atom-a'; }],
  ['T021', 'SOURCE_PACKAGE_BINDING_MISMATCH', '$.sourceAtoms.binding.rawSourceAtomsCanonicalSha256', (x) => { x.sourceObservation.bindingMatches = false; }],
  ['T022', 'SOURCE_ATOM_SCHEMA_INVALID', '$.sourceAtoms.atoms[0]', (x) => { x.sourceObservation.atoms[0].extra = true; }],
  ['T023', 'SOURCE_ATOM_ID_DUPLICATE', '$.sourceAtoms.atoms[1].atomId', (x) => { x.sourceObservation.atoms[1].atomId = 'atom-a'; }],
  ['T024', 'SOURCE_ATOM_TIME_INVALID', '$.sourceAtoms.atoms[0].endMs', (x) => { x.sourceObservation.atoms[0].endMs = 100; }],
  ['T025', 'SOURCE_ATOM_SPEAKER_INVALID', '$.sourceAtoms.atoms[0].speaker', (x) => { x.sourceObservation.atoms[0].speaker = {}; }],
  ['T026', 'SOURCE_ATOM_COVERAGE_INVALID', '$.sourceAtoms.coverage', (x) => { x.sourceObservation.atoms.push({atomId: 'atom-e', speechId: 2, speaker: null, text: '誌', startMs: 500, endMs: 600}); }],
  ['T027', 'SOURCE_ATOM_ORDER_INVALID', '$.sourceAtoms.atoms[1].atomId', (x) => { [x.sourceObservation.atoms[0], x.sourceObservation.atoms[1]] = [x.sourceObservation.atoms[1], x.sourceObservation.atoms[0]]; }],
  ['T028', 'TIMELINE_BINDING_MISMATCH', '$.timeline.binding.timelineId', (x) => { x.timelineObservation.bindingMatches = false; }],
  ['T029', 'TIMELINE_SEGMENT_INVALID', '$.timeline.validation', (x) => { x.timelineObservation.validationPassed = false; }],
  ['T030', 'TIMELINE_MAPPING_FAILED', '$.timeline.mappings[0]', (x) => { x.timelineObservation.mappingPassed = false; }],
  ['T031', 'CUE_ID_INVALID', '$.displayPlan.containers[0].cues[0].cueId', (x) => { x.buildObservation.displayPlan.containers[0].cues[0].cueId = 'caption-cue-00001'; }],
  ['T032', 'CUE_MAPPING_INVALID', '$.displayPlan.containers[0].cues[0]', (x) => { x.buildObservation.displayPlan.containers[0].cues[0].instructionId = 'caption-instruction-000002'; }],
  ['T033', 'CUE_LINE_COUNT_INVALID', '$.displayPlan.containers[0].cues[0].lines', (x) => { x.buildObservation.displayPlan.containers[0].cues[0].lines = []; }],
  ['T034', 'CUE_LINE_WIDTH_EXCEEDED', '$.displayPlan.containers[0].cues[0].lines[0].logicalWidth', (x) => { x.buildObservation.displayPlan.containers[0].cues[0].lines[0].logicalWidth = 37; }],
  ['T035', 'CUE_TEXT_MISMATCH', '$.displayPlan.containers[0].cues[0].lines[0].text', (x) => { x.buildObservation.displayPlan.containers[0].cues[0].lines[0].text = '不一致'; }],
  ['T036', 'CUE_ANCHOR_MISMATCH', '$.displayPlan.containers[0].cues[0].endAnchor', (x) => { x.buildObservation.displayPlan.containers[0].cues[0].endAnchor.atomId = 'atom-a'; }],
  ['T037', 'CUE_SOURCE_TIME_INVALID', '$.displayPlan.containers[0].cues[0].sourceEndMs', (x) => { x.buildObservation.displayPlan.containers[0].cues[0].sourceEndMs = 299; }],
  ['T038', 'CUE_TIMELINE_SEGMENT_CROSSED', '$.displayPlan.containers[0].cues[0].sourceEndMs', (x) => { x.timelineObservation.mappingByCue['caption-cue-000001'].segmentCount = 2; }],
  ['T039', 'CUE_ORDER_REVERSED', '$.displayPlan.containers[0].cues[1].sourceStartMs', (x) => { x.buildObservation.displayPlan.containers[0].cues[1].sourceStartMs = 99; }],
  ['T040', 'CUE_UNDECLARED_OVERLAP', '$.displayPlan.containers[0].cues[1].sourceStartMs', (x) => { x.buildObservation.displayPlan.containers[0].cues[1].sourceStartMs = 299; }],
  ['T041', 'TARGET_ID_INVALID', '$.resolutionPackage.targets[0].targetRefId', (x) => { x.buildObservation.instructionInput.instructionBundle.resolutionPackage.targets[0].targetRefId = 'caption-target-00001'; }],
  ['T042', 'TARGET_MAPPING_INVALID', '$.resolutionPackage.targets[0]', (x) => { x.buildObservation.instructionInput.instructionBundle.resolutionPackage.targets[0].cueId = 'caption-cue-000002'; }],
  ['T043', 'TARGET_ATOM_MISSING', '$.resolutionPackage.captionContracts[0].captionTargets[0].requiredAtomIds', (x) => { x.buildObservation.instructionInput.instructionBundle.resolutionPackage.captionContracts[0].captionTargets[0].requiredAtomIds.pop(); }],
  ['T044', 'TARGET_ATOM_DUPLICATED', '$.resolutionPackage.captionContracts[0].captionTargets[0].requiredAtomIds[1]', (x) => { x.buildObservation.instructionInput.instructionBundle.resolutionPackage.captionContracts[0].captionTargets[0].requiredAtomIds[1] = 'atom-a'; }],
  ['T045', 'TARGET_ATOM_ORDER_REVERSED', '$.resolutionPackage.captionContracts[0].captionTargets[0].requiredAtomIds', (x) => { x.buildObservation.instructionInput.instructionBundle.resolutionPackage.captionContracts[0].captionTargets[0].requiredAtomIds.reverse(); }],
  ['T046', 'TARGET_OMISSION_NOT_EMPTY', '$.resolutionPackage.captionContracts[0].captionTargets[0].allowedOmissionAtomIds', (x) => { x.buildObservation.instructionInput.instructionBundle.resolutionPackage.captionContracts[0].captionTargets[0].allowedOmissionAtomIds.push('atom-a'); }],
  ['T047', 'INSTRUCTION_ID_INVALID', '$.instructionBundle.instructionSet.instructions[0].instructionId', (x) => { x.buildObservation.instructionInput.instructionBundle.instructionSet.instructions[0].instructionId = 'caption-instruction-00001'; }],
  ['T048', 'INSTRUCTION_MAPPING_INVALID', '$.instructionBundle.instructionSet.instructions[0]', (x) => { x.buildObservation.instructionInput.instructionBundle.instructionSet.instructions[0].target.targetRefIds[0] = 'caption-target-000002'; }],
  ['T049', 'INSTRUCTION_KIND_INVALID', '$.instructionBundle.instructionSet.instructions[0].kind', (x) => { x.buildObservation.instructionInput.instructionBundle.instructionSet.instructions[0].kind = 'information-comment'; }],
  ['T050', 'INSTRUCTION_PRESET_INVALID', '$.instructionBundle.instructionSet.instructions[0].presetId', (x) => { x.buildObservation.instructionInput.instructionBundle.instructionSet.instructions[0].presetId = 'unknown'; }],
  ['T051', 'INSTRUCTION_MATERIAL_NOT_EMPTY', '$.instructionBundle.instructionSet.instructions[0].materialRefs', (x) => { x.buildObservation.instructionInput.instructionBundle.instructionSet.instructions[0].materialRefs.push('material'); }],
  ['T052', 'INSTRUCTION_TRIGGER_MISMATCH', '$.instructionBundle.instructionSet.instructions[0].trigger.startAtomId', (x) => { x.buildObservation.instructionInput.instructionBundle.instructionSet.instructions[0].trigger.startAtomId = 'atom-b'; }],
  ['T053', 'CAPTION_CONTRACT_SCHEMA_INVALID', '$.resolutionPackage.captionContracts[0].captionSchemaVersion', (x) => { x.buildObservation.instructionInput.instructionBundle.resolutionPackage.captionContracts[0].captionSchemaVersion = 'presentation-caption-check-v002'; }],
  ['T054', 'G1_G3_CHECK_FAILED', '$.captionCheckReport.checks.G1', (x) => { x.buildObservation.captionCheckReport.checks.G1.status = 'failed'; }],
  ['T055', 'G2_DECLARED_LIMIT_MISSING', '$.captionCheckReport.checks.G2.unverified', (x) => { x.buildObservation.captionCheckReport.checks.G2.unverified.pop(); }],
  ['T056', 'LAYOUT_PREFLIGHT_FAILED', '$.layoutPreflight.checks[3]', (x) => { x.buildObservation.layoutPreflight.status = 'failed'; }],
  ['T057', 'REVIEW_STATE_INVALID', '$.reviewState.publicationAllowed', (x) => { x.buildObservation.reviewState.publicationAllowed = true; }],
  ['T058', 'REVIEW_RENDER_REQUEST_INVALID', '$.reviewRenderRequest.requiredInputState', (x) => { x.buildObservation.reviewRenderRequestValid = false; }],
  ['T059', 'PAIR_BINDING_MISMATCH', '$.pairManifest.contentArtifacts[0].fileSha256', (x) => { x.buildObservation.pairBindingsMatch = false; }],
  ['T060', 'BUILD_FAILED', '$.builds.buildFailure', (x) => { x.buildObservation.status = 'failed'; x.buildObservation.failureStage = 'display-plan-build'; }],
  ['T061', 'NONDETERMINISTIC', '$.builds.determinism.reviewRenderRequest', (x) => { x.buildObservation.deterministic = false; }],
  ['T062', 'READ_ONLY_CONTRACT_VIOLATED', '$.readOnly.changedEntries[0]', (x) => { x.publicationObservation.readOnlyUnchanged = false; }],
  ['T063', 'OUTPUT_ROOT_ALREADY_EXISTS', '$.publication.initialPaths.formalRoot', (x) => { x.publicationObservation.initialPathsClear = false; }],
  ['T064', 'PUBLICATION_LOCK_UNAVAILABLE', '$.publication.lock', (x) => { x.publicationObservation.lockAvailable = false; }],
  ['T065', 'PUBLICATION_STAGING_INVALID', '$.publication.staging.directoryEntries', (x) => { x.publicationObservation.stagingValid = false; }],
  ['T066', 'PUBLICATION_INPUT_CHANGED', '$.publication.inputRecheck[0]', (x) => { x.publicationObservation.inputUnchanged = false; }],
  ['T067', 'PUBLICATION_FAILED', '$.publication.staging.failurePoint', (x) => { x.publicationObservation.ioSucceeded = false; }],
  ['T068', 'PUBLISHED_PAIR_INVALID', '$.publishedPair.files[0]', (x) => { x.publicationObservation.publishedPairValid = false; }],
  ['T069', 'PUBLICATION_PRE_RENAME_INVALID', '$.publication.preRename.formalRoot', (x) => { x.publicationObservation.preRenameValid = false; }],
];

const expectedViolationOwners = [
  'jobBinding',
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'inputBinding',
  'inputBinding',
  'inputBinding',
  'runtimeBinding',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'timeline',
  'timeline',
  'timeline',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'resolutionPackage',
  'resolutionPackage',
  'resolutionPackage',
  'resolutionPackage',
  'resolutionPackage',
  'resolutionPackage',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'captionG1G3',
  'captionG1G3',
  'layoutPreflight',
  'reviewState',
  'reviewRenderRequest',
  'reviewRenderRequest',
  'displayPlan',
  'determinism',
  'readOnlyCheck',
  'publication',
  'publication',
  'publication',
  'publication',
  'publication',
  'publication',
  'publication',
];

for (const [probeIndex, [id, code, path, mutate]] of probes.entries()) {
  test(`${id}: ${code}を単独帰属する`, () => {
    const result = resultOf(mutate);
    assertSingle(result, code, path);
    assert.deepEqual(
      result.checks.filter((entry) => entry.status === 'failed').map((entry) => entry.name),
      [expectedViolationOwners[probeIndex]],
    );
    if (id === 'T060') {
      const stages = [
        ['semantic-compiler-rebuild', 'semanticSeam'],
        ['display-plan-build', 'displayPlan'],
        ['resolution-package-build', 'resolutionPackage'],
        ['instruction-bundle-build', 'instructionBundle'],
        ['caption-check-build', 'captionG1G3'],
        ['layout-inspection', 'layoutPreflight'],
        ['review-request-build', 'reviewRenderRequest'],
        ['pair-manifest-build', 'reviewRenderRequest'],
        ['pair-report-build', 'reviewRenderRequest'],
      ];
      stages.forEach(([stage, owner]) => {
        const checkerContext = makeContext();
        checkerContext.buildObservation.status = 'failed';
        checkerContext.buildObservation.failureStage = stage;
        const checked = b4Core.checkPresentationCaptionDisplayPairV003(checkerContext);
        assert.deepEqual(
          checked.checks.filter((entry) => entry.status === 'failed')
            .map((entry) => entry.name),
          [owner],
        );
        const report = b4Core.buildPresentationCaptionDisplayPairValidationReportV002({
          jobPath: checkerContext.jobObservation.path,
          jobFileSha256: checkerContext.jobObservation.fileSha256,
          job: checkerContext.jobObservation.value,
          runtime: checkerContext.runtimeObservation.value,
          checked,
          compilerObservation: {
            observedByteSha256:
              checkerContext.semanticObservation.compilerObservedByteSha256,
            canonicalSha256:
              checkerContext.semanticObservation.compilerCanonicalSha256,
          },
          contentArtifacts: null,
          manifestArtifact: null,
        });
        assert.notEqual(report, null);
        assert.ok(Object.values(report.outputBindings).every((entry) => entry === null));
        assert.equal(
          b4Core.validatePresentationCaptionDisplayPairValidationReportV002({
            report,
            checkerContext,
            artifactBytes: [],
            manifestBytes: null,
          }).valid,
          true,
        );
      });
    }
    if (id === 'T053') {
      const valid = makeInstructionInput();
      const contract = valid.instructionBundle.resolutionPackage.captionContracts[0];
      const makeInput = () => ({
        format: 'normal-landscape',
        source: {
          atomGranularity: 'character-timestamp',
          atomProvenance: atomProvenance(),
          atoms: makeAtoms(),
        },
        captionContract: clone(contract),
        expectedDisplayPlanBinding: clone(contract.sourceDisplayPlanBinding),
      });
      const cases = [
        ['input-not-object', () => null],
        ['unknown-field', () => { const x = makeInput(); x.extra = true; return x; }],
        ['schema-version-unsupported', () => { const x = makeInput(); x.captionContract.captionSchemaVersion = 'v002'; return x; }],
        ['format-unsupported', () => { const x = makeInput(); x.format = 'vertical'; return x; }],
        ['display-plan-binding-invalid', () => { const x = makeInput(); x.captionContract.sourceDisplayPlanBinding.fileSha256 = '1'.repeat(64); return x; }],
        ['source-invalid', () => { const x = makeInput(); x.source.atomGranularity = 'unknown'; return x; }],
        ['target-invalid', () => { const x = makeInput(); x.captionContract.captionTargets[0].requiredAtomIds = []; return x; }],
        ['omission-not-empty', () => { const x = makeInput(); x.captionContract.captionTargets[0].allowedOmissionAtomIds = ['atom-a']; return x; }],
        ['simultaneous-group-not-empty', () => { const x = makeInput(); x.captionContract.allowedSimultaneousGroups = [{}]; return x; }],
        ['caption-plan-invalid', () => { const x = makeInput(); x.captionContract.captionPlan.cues = null; return x; }],
        ['cue-invalid', () => { const x = makeInput(); x.captionContract.captionPlan.cues[0].endMs = x.captionContract.captionPlan.cues[0].startMs; return x; }],
        ['line-invalid', () => { const x = makeInput(); x.captionContract.captionPlan.cues[0].lines[0].atomIds = []; return x; }],
        ['anchor-invalid', () => { const x = makeInput(); x.captionContract.captionPlan.cues[0].endAnchor.edge = 'middle'; return x; }],
      ];
      assert.deepEqual(
        cases.map(([reason, build]) => {
          const report = captionV003.validatePresentationCaptionContractV003(build());
          assert.equal(report.schemaViolations.length, 1);
          return report.schemaViolations[0].details.reason;
        }),
        cases.map(([reason]) => reason),
      );
    }
  });
}

test('T070: job不成立時は後続16 checkを抑制する', () => {
  const result = resultOf((x) => { x.jobObservation.value.extra = true; });
  assert.equal(result.checks[0].status, 'failed');
  assert.ok(result.checks.slice(1).every((entry) =>
    entry.status === 'not_run_with_upstream_failure'));
});

test('T071: semantic report失敗後はsource以降を抑制する', () => {
  const result = resultOf((x) => { x.semanticObservation.reportPassed = false; });
  assert.equal(result.checks[4].status, 'failed');
  assert.ok(result.checks.slice(5).every((entry) =>
    entry.status === 'not_run_with_upstream_failure'));
});

test('T072: compiler schema不成立後はsource以降を抑制する', () => {
  const result = resultOf((x) => { x.semanticObservation.compilerInput.schemaVersion = 'bad'; });
  assert.equal(result.checks[4].status, 'failed');
  assert.ok(result.checks.slice(5).every((entry) =>
    entry.status === 'not_run_with_upstream_failure'));
});

test('T073: source schema不成立後はtimeline以降を抑制する', () => {
  const result = resultOf((x) => { x.sourceObservation.atoms[0].extra = true; });
  assert.equal(result.checks[5].status, 'failed');
  assert.ok(result.checks.slice(6).every((entry) =>
    entry.status === 'not_run_with_upstream_failure'));
});

test('T074: display plan不成立後はresolution以降を抑制する', () => {
  const result = resultOf((x) => { x.buildObservation.displayPlan.containers[0].cues[0].lines = []; });
  assert.equal(result.checks[7].status, 'failed');
  assert.ok(result.checks.slice(8).every((entry) =>
    entry.status === 'not_run_with_upstream_failure'));
});

test('T075: cue境界接触は正の重なりにしない', () => {
  const result = resultOf(() => {});
  assert.equal(result.violations.some((entry) => entry.code === 'CUE_UNDECLARED_OVERLAP'), false);
});

test('T076: source atomの正重なりは入力拒否にしない', () => {
  const result = resultOf((x) => {
    x.sourceObservation.atoms[1].startMs = 150;
    x.sourceObservation.positiveOverlapCount = 1;
    x.semanticObservation.compilerInput.containers[0].meaningGroups[0].lines[0].text = '母船';
  });
  assert.equal(result.violations.some((entry) => entry.code === 'SOURCE_ATOM_TIME_INVALID'), false);
});

test('T077: character粒度のG2限界は宣言付き合格である', () => {
  const input = makeInstructionInput();
  const result = instructionV003.validatePresentationInstructionContractV003(input);
  assert.equal(result.status, 'passed_with_declared_limit');
  assert.deepEqual(result.captionValidation.grammarReport.checks.G2.unverified, [
    'linguistic_word_boundary',
    'semantic_chunk_readability',
    'on_screen_readability',
  ]);
});

test('T078: v002形式をv003へ変換せず拒否しB4はv002入口を参照しない', () => {
  const invalidCaption = captionV003.validatePresentationCaptionContractV003({
    schemaVersion: 'presentation-caption-check-v002',
  });
  assert.equal(invalidCaption.status, 'failed');
  const coreSource = readFileSync(
    repositoryAbsolute('evals/clip_composition/presentation_caption_display_pair_v003.mjs'),
    'utf8',
  );
  assert.equal(coreSource.includes('validatePresentationCaptionContract('), false);
  assert.equal(coreSource.includes('presentation_instruction_contract_v002'), false);
});

test('T079: 公開失敗4種は相互に別codeへ帰属する', () => {
  const cases = [
    ['PUBLICATION_INPUT_CHANGED', (x) => { x.publicationObservation.inputUnchanged = false; }],
    ['PUBLICATION_FAILED', (x) => { x.publicationObservation.ioSucceeded = false; }],
    ['PUBLICATION_PRE_RENAME_INVALID', (x) => { x.publicationObservation.preRenameValid = false; }],
    ['PUBLISHED_PAIR_INVALID', (x) => { x.publicationObservation.publishedPairValid = false; }],
  ];
  assert.deepEqual(
    cases.map(([, mutate]) => resultOf(mutate).violations[0].code),
    cases.map(([code]) => code),
  );
});

let actualBuilderFixturePromise = null;
const ZERO_FRAME_BOUNDARY_IDS = [
  'segmenter-boundary-000073',
  'segmenter-boundary-000074',
  'segmenter-boundary-000075',
];

const makeSyntheticSemanticRawValue = (
  semanticSource,
  {independentZeroFrameCue = false} = {},
) => ({
  status: 'complete',
  containers: semanticSource.containers.map((container) => {
    const meaningGroups = [];
    for (let index = 0; index < container.boundaryCandidates.length; index += 1) {
      const candidate = container.boundaryCandidates[index];
      if (!independentZeroFrameCue
        && candidate.boundaryCandidateId === ZERO_FRAME_BOUNDARY_IDS[0]) {
        assert.deepEqual(
          container.boundaryCandidates
            .slice(index, index + ZERO_FRAME_BOUNDARY_IDS.length)
            .map((entry) => entry.boundaryCandidateId),
          ZERO_FRAME_BOUNDARY_IDS,
        );
        meaningGroups.push({
          lineEndBoundaryCandidateIds: [ZERO_FRAME_BOUNDARY_IDS.at(-1)],
        });
        index += ZERO_FRAME_BOUNDARY_IDS.length - 1;
      } else {
        meaningGroups.push({
          lineEndBoundaryCandidateIds: [candidate.boundaryCandidateId],
        });
      }
    }
    return {containerId: container.containerId, meaningGroups};
  }),
});

const actualBuilderFixture = async () => {
  if (actualBuilderFixturePromise) return actualBuilderFixturePromise;
  actualBuilderFixturePromise = (async () => {
    const packageNames = [
      'segmenter-boundary-evidence.json',
      'embedded-gate-a-validation-report.json',
      'semantic-source-input.json',
      'deterministic-expansion-map.json',
      'source-only-leakage-report.json',
      'package-manifest.json',
      'package-validation-report.json',
    ];
    const sourcePackageInputs = packageNames.map((name, index) => {
      const path = `${SOURCE_ROOT}/${name}`;
      const value = jsonValue(path);
      return {role: [
        'boundaryEvidence',
        'embeddedGateAReport',
        'semanticSourceInput',
        'deterministicExpansionMap',
        'sourceOnlyLeakageReport',
        'packageManifest',
        'packageValidationReport',
      ][index], path, snapshot: snapshot(path, value)};
    });
    const semanticSource = jsonValue(`${SOURCE_ROOT}/semantic-source-input.json`);
    const rawValue = makeSyntheticSemanticRawValue(semanticSource);
    const rawPath = `${TESTDATA_ROOT}/synthetic-semantic-output.json`;
    const rawSnapshot = snapshot(rawPath, rawValue);
    const compiler = buildPresentationCaptionSemanticCompilerInputV001({
      sourcePackageSnapshots: sourcePackageInputs.map((entry) => entry.snapshot),
      rawSemanticOutputSnapshot: rawSnapshot,
    });
    const reportValue = {
      status: 'passed',
      compilerInput: {
        status: 'generated',
        canonicalSha256: canonicalSha(compiler),
        observedByteSha256: shaBytes(formalBytes(compiler)),
      },
    };
    const semanticCheckInputs = [
      {role: 'job', path: `${TESTDATA_ROOT}/synthetic-semantic-job.json`, snapshot: snapshot(`${TESTDATA_ROOT}/synthetic-semantic-job.json`, {schemaVersion: 'synthetic-job-v001'})},
      {role: 'rawSemanticOutput', path: rawPath, snapshot: rawSnapshot},
      {role: 'validationReport', path: `${TESTDATA_ROOT}/synthetic-semantic-report.json`, snapshot: snapshot(`${TESTDATA_ROOT}/synthetic-semantic-report.json`, reportValue)},
    ];
    const readJsonGroup = (root, rows) => rows.map(([role, name]) => {
      const path = `${root}/${name}`;
      return {role, path, snapshot: snapshot(path, jsonValue(path))};
    });
    const retainedSourceInputs = readJsonGroup(RETAINED_ROOT, [
      ['generationManifest', 'generation-manifest.json'],
      ['sourceAtoms', 'source-atoms.json'],
      ['validationReport', 'validation-report.json'],
    ]);
    const baseMediaInputs = readJsonGroup(BASE_ROOT, [
      ['generationManifest', 'generation-manifest.json'],
      ['timeline', 'timeline.json'],
      ['validationReport', 'validation-report.json'],
    ]);
    const basePath = `${BASE_ROOT}/base-media.mp4`;
    baseMediaInputs.push({
      role: 'baseMedia',
      path: basePath,
      snapshot: snapshot(basePath, readFileSync(repositoryAbsolute(basePath))),
    });
    const registryInputs = readJsonGroup(REGISTRY_ROOT, [
      ['trustedRegistryBindings', 'trusted-registry-bindings.json'],
      ['presetRegistry', 'preset-registry.json'],
      ['presetValidationIndex', 'preset-validation-index.json'],
      ['materialValidationIndex', 'material-validation-index.json'],
    ]);
    const job = makeJob();
    job.publication = {
      pairId: 'synthetic-b4-pair',
      formalOutputPath: `${OUTPUT_PARENT}/synthetic-b4-pair`,
      lockPath: `${OUTPUT_PARENT}/synthetic-b4-pair.lock`,
      workPath: `${OUTPUT_PARENT}/synthetic-b4-pair.work`,
    };
    const builtContext = {
      job,
      jobSnapshot: snapshot(`${JOB_ROOT}/synthetic-b4-job.json`, job),
      implementationInputs: [],
      sourcePackageInputs,
      semanticCheckInputs,
      retainedSourceInputs,
      baseMediaInputs,
      registryInputs,
      runtimeObservation: job.expectedRuntime,
      layoutInspection: {status: 'passed', items: [], violations: []},
    };
    return {builtContext, compiler, rawValue, reportValue};
  })();
  return actualBuilderFixturePromise;
};

test('T080: valid pair buildは固定5 content artifactを作る', async () => {
  const {builtContext} = await actualBuilderFixture();
  const result = b4Core.buildPresentationCaptionDisplayPairV003(builtContext);
  assert.equal(result.status, 'built');
  assert.deepEqual(result.artifacts.map((entry) => entry.role), [
    'displayPlan',
    'instructionBundle',
    'captionCheckReport',
    'layoutPreflight',
    'reviewRenderRequest',
  ]);
});

test('T081: pure builderは同一入力からbyte一致する', async () => {
  const {builtContext} = await actualBuilderFixture();
  const first = b4Core.buildPresentationCaptionDisplayPairV003(builtContext);
  const second = b4Core.buildPresentationCaptionDisplayPairV003(builtContext);
  assert.equal(first.status, 'built');
  assert.equal(second.status, 'built');
  assert.deepEqual(
    first.artifacts.map((entry) => entry.fileSha256),
    second.artifacts.map((entry) => entry.fileSha256),
  );
});

const packageTreeSha = (rootPath) => {
  const rows = [];
  const visit = (absoluteRoot, relativeRoot = '') => {
    for (const entry of readdirSync(absoluteRoot, {withFileTypes: true})
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
      const relativePath = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
      const absolute = resolve(absoluteRoot, entry.name);
      if (entry.isDirectory()) visit(absolute, relativePath);
      else if (entry.isFile()) {
        const bytes = readFileSync(absolute);
        rows.push({relativePath, sizeBytes: bytes.length, fileSha256: shaBytes(bytes)});
      } else throw new TypeError('unexpected package entry');
    }
  };
  visit(rootPath);
  return canonicalSha(rows);
};

const observeRuntime = () => {
  const resolvedNodePath = realpathSync(process.execPath);
  const segmenter = new Intl.Segmenter('ja', {granularity: 'word'}).resolvedOptions();
  const tsxEntryLogicalPath = 'runner/node_modules/tsx/dist/cli.mjs';
  const tsxEntryRealPath = realpathSync(repositoryAbsolute(tsxEntryLogicalPath));
  const tsxRoot = resolve(dirname(tsxEntryRealPath), '..');
  const tsxPackage = JSON.parse(readFileSync(resolve(tsxRoot, 'package.json'), 'utf8'));
  const requireFromTsx = createRequire(tsxEntryRealPath);
  const esbuildEntryRealPath = realpathSync(requireFromTsx.resolve('esbuild/lib/main.js'));
  const esbuildRoot = resolve(dirname(esbuildEntryRealPath), '..');
  const esbuildPackage = JSON.parse(readFileSync(resolve(esbuildRoot, 'package.json'), 'utf8'));
  const requireFromEsbuild = createRequire(esbuildEntryRealPath);
  const esbuildBinaryRealPath = realpathSync(
    requireFromEsbuild.resolve(`@esbuild/${process.platform}-${process.arch}/bin/esbuild`),
  );
  return {
    resolvedNodePath,
    nodeBinarySha256: shaBytes(readFileSync(resolvedNodePath)),
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: segmenter.locale,
    resolvedGranularity: segmenter.granularity,
    layoutExecutionBinding: {
      tsxEntryLogicalPath,
      tsxEntryRealPath,
      tsxEntryFileSha256: shaBytes(readFileSync(tsxEntryRealPath)),
      tsxPackageVersion: tsxPackage.version,
      tsxPackageTreeCanonicalSha256: packageTreeSha(tsxRoot),
      esbuildEntryRealPath,
      esbuildEntryFileSha256: shaBytes(readFileSync(esbuildEntryRealPath)),
      esbuildPackageVersion: esbuildPackage.version,
      esbuildPackageTreeCanonicalSha256: packageTreeSha(esbuildRoot),
      esbuildBinaryRealPath,
      esbuildBinaryFileSha256: shaBytes(readFileSync(esbuildBinaryRealPath)),
    },
  };
};

const independentlyObservedProjection = (rootPath, ignoredPaths) => {
  const ignored = new Set(ignoredPaths);
  const rows = [];
  const fileHash = (absolute) => {
    const descriptor = openSync(absolute, 'r');
    try {
      const hash = createHash('sha256');
      const chunk = Buffer.allocUnsafe(1024 * 1024);
      let position = 0;
      while (true) {
        const bytesRead = readSync(descriptor, chunk, 0, chunk.length, position);
        if (bytesRead === 0) break;
        hash.update(chunk.subarray(0, bytesRead));
        position += bytesRead;
      }
      return hash.digest('hex');
    } finally {
      closeSync(descriptor);
    }
  };
  const visit = (absolute) => {
    const pathValue = relative(WORKSPACE_ROOT, absolute).split(sep).join('/');
    if (ignored.has(pathValue)) return;
    const stats = lstatSync(absolute, {bigint: true});
    if (stats.isDirectory()) {
      rows.push({path: pathValue, kind: 'directory', contentSha256: null});
      readdirSync(absolute, {withFileTypes: true})
        .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
        .forEach((entry) => visit(resolve(absolute, entry.name)));
    } else if (stats.isSymbolicLink()) {
      rows.push({
        path: pathValue,
        kind: 'symlink',
        contentSha256: shaBytes(Buffer.from(readlinkSync(absolute), 'utf8')),
      });
    } else if (stats.isFile()) {
      rows.push({path: pathValue, kind: 'file', contentSha256: fileHash(absolute)});
    } else {
      throw new TypeError('unsupported monitored node');
    }
  };
  visit(repositoryAbsolute(rootPath));
  return canonicalSha(rows);
};

const implementationBinding = (runnerPath) => {
  const file = (role, path) => ({role, path, fileSha256: shaBytes(readFileSync(repositoryAbsolute(path)))});
  return {
    gitCommit: 'a'.repeat(40),
    files: [
      file('displayPairCore', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'),
      file('displayPairRunner', runnerPath),
    ],
    dependencyFiles: [
      ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
      ['semanticRunner', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs'],
      ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
      ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
      ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
      ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
      ['layoutPreflightCore', 'evals/clip_composition/inspect_presentation_preset_layout.ts'],
      ['rendererLayoutCore', 'runner/src/telop/telop-render-model.ts'],
      ['presetRegistry', `${REGISTRY_ROOT}/preset-registry.json`],
      ['presetValidationIndex', `${REGISTRY_ROOT}/preset-validation-index.json`],
      ['materialValidationIndex', `${REGISTRY_ROOT}/material-validation-index.json`],
      ['trustedRegistryBindings', `${REGISTRY_ROOT}/trusted-registry-bindings.json`],
      ['sharedJsonContractCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
    ].map(([role, path]) => file(role, path)),
  };
};

const makeFormalJobFixture = async (
  suffix,
  {independentZeroFrameCue = false} = {},
) => {
  const {builtContext} = await actualBuilderFixture();
  const semanticSource = jsonValue(`${SOURCE_ROOT}/semantic-source-input.json`);
  const rawValue = makeSyntheticSemanticRawValue(
    semanticSource,
    {independentZeroFrameCue},
  );
  mkdirSync(repositoryAbsolute(TESTDATA_ROOT), {recursive: true});
  mkdirSync(repositoryAbsolute(JOB_ROOT), {recursive: true});
  mkdirSync(repositoryAbsolute(OUTPUT_PARENT), {recursive: true});
  const semanticJobPath = `${TESTDATA_ROOT}/formal-${suffix}-semantic-job.json`;
  const semanticRawPath = `${TESTDATA_ROOT}/formal-${suffix}-semantic-output.json`;
  const semanticReportPath = `${TESTDATA_ROOT}/formal-${suffix}-semantic-report.json`;
  const semanticJob = {schemaVersion: 'synthetic-semantic-job-v001'};
  writeFileSync(repositoryAbsolute(semanticJobPath), formalBytes(semanticJob));
  writeFileSync(repositoryAbsolute(semanticRawPath), formalBytes(rawValue));
  const formalRawSnapshot = snapshot(
    semanticRawPath,
    readFileSync(repositoryAbsolute(semanticRawPath)),
  );
  const formalCompiler = buildPresentationCaptionSemanticCompilerInputV001({
    sourcePackageSnapshots: builtContext.sourcePackageInputs.map((entry) => entry.snapshot),
    rawSemanticOutputSnapshot: formalRawSnapshot,
  });
  assert.equal(formalCompiler.semanticOutputBinding.path, semanticRawPath);
  assert.equal(
    formalCompiler.semanticOutputBinding.fileSha256,
    shaBytes(readFileSync(repositoryAbsolute(semanticRawPath))),
  );
  assert.equal(
    formalCompiler.semanticOutputBinding.canonicalSha256,
    canonicalSha(rawValue),
  );
  const formalMeaningGroupCount = formalCompiler.containers.reduce(
    (sum, container) => sum + container.meaningGroups.length,
    0,
  );
  const formalLineCount = formalCompiler.containers.reduce(
    (sum, container) => sum + container.meaningGroups.reduce(
      (groupSum, group) => groupSum + group.lines.length,
      0,
    ),
    0,
  );
  assert.equal(formalMeaningGroupCount, independentZeroFrameCue ? 205 : 203);
  assert.equal(formalLineCount, independentZeroFrameCue ? 205 : 203);
  const formalReportValue = {
    status: 'passed',
    compilerInput: {
      status: 'generated',
      canonicalSha256: canonicalSha(formalCompiler),
      observedByteSha256: shaBytes(formalBytes(formalCompiler)),
    },
  };
  writeFileSync(repositoryAbsolute(semanticReportPath), formalBytes(formalReportValue));
  const pairId = `synthetic-b4-cli-${suffix}`;
  const jobId = `synthetic-b4-cli-${suffix}`;
  const jobPath = `${JOB_ROOT}/${jobId}.json`;
  const formalOutputPath = `${OUTPUT_PARENT}/${pairId}`;
  const lockPath = `${formalOutputPath}.lock`;
  const workPath = `${formalOutputPath}.work`;
  rmSync(repositoryAbsolute(formalOutputPath), {recursive: true, force: true});
  rmSync(repositoryAbsolute(lockPath), {force: true});
  rmSync(repositoryAbsolute(workPath), {recursive: true, force: true});
  const independentlyExpectedBeforeCanonicalSha256 = independentlyObservedProjection(
    TESTDATA_ROOT,
    [jobPath, formalOutputPath, lockPath, workPath],
  );
  const manifest = binding(`${SOURCE_ROOT}/package-manifest.json`);
  const packageReport = binding(`${SOURCE_ROOT}/package-validation-report.json`);
  const retainedManifest = binding(`${RETAINED_ROOT}/generation-manifest.json`);
  const retainedAtoms = binding(`${RETAINED_ROOT}/source-atoms.json`);
  const retainedReport = binding(`${RETAINED_ROOT}/validation-report.json`);
  const baseManifest = binding(`${BASE_ROOT}/generation-manifest.json`);
  const timeline = binding(`${BASE_ROOT}/timeline.json`);
  const baseReport = binding(`${BASE_ROOT}/validation-report.json`);
  const baseMedia = binding(`${BASE_ROOT}/base-media.mp4`, false);
  const readOnlyGuard =
    displayPairRunner.inspectPresentationCaptionDisplayPairReadOnlyProjectionV001({
      watchedRoot: TESTDATA_ROOT,
      jobPath,
      allowedWritePaths: [formalOutputPath, lockPath, workPath],
    });
  assert.equal(readOnlyGuard.kind, 'trusted-projection');
  assert.equal(
    readOnlyGuard.expectedBeforeCanonicalSha256,
    independentlyExpectedBeforeCanonicalSha256,
  );
  const job = {
    schemaVersion: 'presentation-caption-display-pair-generation-job-v001',
    jobId,
    artifactId: 'synthetic-artifact',
    mode: 'formal-generation',
    implementationBinding: implementationBinding(RUNNER_PATH),
    sourcePackageBinding: {rootPath: SOURCE_ROOT, manifest, validationReport: packageReport},
    semanticCheckBinding: {
      job: binding(semanticJobPath),
      rawSemanticOutput: binding(semanticRawPath),
      validationReport: binding(semanticReportPath),
      expectedCompilerInputObservedByteSha256: shaBytes(formalBytes(formalCompiler)),
      expectedCompilerInputCanonicalSha256: canonicalSha(formalCompiler),
    },
    retainedSourceBinding: {
      rootPath: RETAINED_ROOT,
      generationManifest: retainedManifest,
      sourceAtoms: retainedAtoms,
      validationReport: retainedReport,
    },
    baseMediaBinding: {
      rootPath: BASE_ROOT,
      generationManifest: baseManifest,
      timeline,
      validationReport: baseReport,
      baseMedia,
    },
    registryBinding: {
      rootPath: REGISTRY_ROOT,
      trustedRegistryBindings: binding(`${REGISTRY_ROOT}/trusted-registry-bindings.json`),
      presetRegistry: binding(`${REGISTRY_ROOT}/preset-registry.json`),
      presetValidationIndex: binding(`${REGISTRY_ROOT}/preset-validation-index.json`),
      materialValidationIndex: binding(`${REGISTRY_ROOT}/material-validation-index.json`),
    },
    expectedRuntime: observeRuntime(),
    expectedProjection: {
      sourceAtomCount: 354,
      containerCount: 3,
      boundaryCandidateCount: 205,
      meaningGroupCount: formalMeaningGroupCount,
      cueCount: formalMeaningGroupCount,
      lineCount: formalLineCount,
      timelineSegmentCount: 2,
      compilerInputObservedByteSha256: shaBytes(formalBytes(formalCompiler)),
      compilerInputCanonicalSha256: canonicalSha(formalCompiler),
    },
    publication: {pairId, formalOutputPath, lockPath, workPath},
    readOnlyGuard: {
      watchedRoot: readOnlyGuard.watchedRoot,
      excludedPaths: [...readOnlyGuard.excludedPaths],
      allowedWritePaths: [...readOnlyGuard.allowedWritePaths],
      expectedBeforeCanonicalSha256: readOnlyGuard.expectedBeforeCanonicalSha256,
    },
  };
  writeFileSync(repositoryAbsolute(jobPath), formalBytes(job));
  const cleanup = () => {
    rmSync(repositoryAbsolute(formalOutputPath), {recursive: true, force: true});
    rmSync(repositoryAbsolute(lockPath), {force: true});
    rmSync(repositoryAbsolute(workPath), {recursive: true, force: true});
    rmSync(repositoryAbsolute(jobPath), {force: true});
    rmSync(repositoryAbsolute(semanticJobPath), {force: true});
    rmSync(repositoryAbsolute(semanticRawPath), {force: true});
    rmSync(repositoryAbsolute(semanticReportPath), {force: true});
  };
  return {job, jobPath, formalOutputPath, lockPath, workPath, cleanup};
};

test('T082: formal CLI successはexit 0・stdout一件・stderr 0 byteである', async () => {
  const fixture = await makeFormalJobFixture('success');
  try {
    const result = spawnSync(process.execPath, [repositoryAbsolute(RUNNER_PATH), fixture.jobPath], {
      cwd: WORKSPACE_ROOT,
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr.length, 0);
    const output = JSON.parse(result.stdout.toString('utf8'));
    assert.equal(
      output.schemaVersion,
      'presentation-caption-display-pair-validation-report-v002',
    );
    assert.equal(output.status, 'passed_pending_human_review');
    assert.ok(Object.values(output.outputBindings).every((entry) => entry !== null));
    assert.equal(existsSync(repositoryAbsolute(fixture.formalOutputPath)), true);
  } finally {
    fixture.cleanup();
  }
});

test('T083: formal CLI contract failureはexit 1・trusted report・stderr 0 byteである', async () => {
  const fixture = await makeFormalJobFixture('contract-failure');
  try {
    mkdirSync(repositoryAbsolute(fixture.formalOutputPath));
    const result = spawnSync(process.execPath, [repositoryAbsolute(RUNNER_PATH), fixture.jobPath], {
      cwd: WORKSPACE_ROOT,
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr.length, 0);
    const output = JSON.parse(result.stdout.toString('utf8'));
    assert.equal(
      output.schemaVersion,
      'presentation-caption-display-pair-validation-report-v002',
    );
    assert.equal(output.status, 'failed');
    assert.equal(output.violations[0].code, 'OUTPUT_ROOT_ALREADY_EXISTS');
    assert.ok(Object.values(output.outputBindings).every((entry) => entry !== null));
  } finally {
    fixture.cleanup();
  }
});

test('T084: formal CLI usage不成立はexit 2・fatal JSON・stderr 0 byteである', () => {
  const result = spawnSync(process.execPath, [repositoryAbsolute(RUNNER_PATH)], {
    cwd: WORKSPACE_ROOT,
    encoding: null,
  });
  assert.equal(result.status, 2);
  assert.equal(result.stderr.length, 0);
  assert.deepEqual(JSON.parse(result.stdout.toString('utf8')), {
    schemaVersion: 'presentation-caption-display-pair-cli-fatal-v001',
    diagnostic: 'CAPTION_B4_FORMAL_CLI_JOB_CONTEXT_UNAVAILABLE',
  });
});

test('T085: production runnerは承認済みpure入口を直接使いfixture注入口を持たない', () => {
  const runner = readFileSync(repositoryAbsolute(RUNNER_PATH), 'utf8');
  assert.match(runner, /buildPresentationCaptionDisplayPairV003/u);
  assert.match(runner, /buildPresentationCaptionDisplayPairValidationReportV002/u);
  assert.match(runner, /checkPresentationCaptionDisplayPairV003/u);
  assert.match(runner, /validatePresentationCaptionDisplayPairValidationReportV002/u);
  assert.equal(runner.includes('validatePresentationCaptionDisplayPairValidationReportV001'), false);
  assert.equal(/fixture|alternateCore|process\.env/u.test(runner), false);
  assert.equal(
    typeof displayPairRunner.inspectPresentationCaptionDisplayPairReadOnlyProjectionV001,
    'function',
  );
  assert.match(runner, /if \(isDirectExecution\) main\(\);/u);
  assert.deepEqual(Object.keys(b4Core).sort(), [
    'PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001',
    'buildPresentationCaptionDisplayPairStaticPreflightReportV001',
    'buildPresentationCaptionDisplayPairValidationReportV002',
    'buildPresentationCaptionDisplayPairV003',
    'buildPresentationCaptionDisplayContainersFormatNeutralV003',
    'checkPresentationCaptionDisplayPairV003',
    'validatePresentationCaptionDisplayPairGenerationJobV001',
    'validatePresentationCaptionDisplayPairStaticPreflightJobV001',
    'validatePresentationCaptionDisplayPairValidationReportV002',
  ].sort());
  assert.equal(
    b4Core.PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001.length,
    69,
  );
  assert.deepEqual(
    probes.map(([, code]) => code),
    b4Core.PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001,
  );
});

test('B4監視投影入口はformal jobに使えないIDと既存symlinkをtrustedにしない', () => {
  const invalidId =
    displayPairRunner.inspectPresentationCaptionDisplayPairReadOnlyProjectionV001({
      watchedRoot: TESTDATA_ROOT,
      jobPath: `${JOB_ROOT}/invalid-id-projection.json`,
      allowedWritePaths: [
        `${OUTPUT_PARENT}/ bad`,
        `${OUTPUT_PARENT}/ bad.lock`,
        `${OUTPUT_PARENT}/ bad.work`,
      ],
    });
  assert.equal(invalidId.kind, 'untrusted');

  const pairId = 'dangling-link-projection';
  const formalOutputPath = `${OUTPUT_PARENT}/${pairId}`;
  const lockPath = `${formalOutputPath}.lock`;
  const workPath = `${formalOutputPath}.work`;
  mkdirSync(repositoryAbsolute(OUTPUT_PARENT), {recursive: true});
  rmSync(repositoryAbsolute(formalOutputPath), {force: true});
  symlinkSync('missing-target', repositoryAbsolute(formalOutputPath));
  try {
    const danglingLink =
      displayPairRunner.inspectPresentationCaptionDisplayPairReadOnlyProjectionV001({
        watchedRoot: TESTDATA_ROOT,
        jobPath: `${JOB_ROOT}/dangling-link-projection.json`,
        allowedWritePaths: [formalOutputPath, lockPath, workPath],
      });
    assert.equal(danglingLink.kind, 'untrusted');
  } finally {
    rmSync(repositoryAbsolute(formalOutputPath), {force: true});
  }
});

test('B4 runnerのimport保護は呼出元argv pathが非実在でも例外にしない', () => {
  const runnerUrl = pathToFileURL(repositoryAbsolute(RUNNER_PATH)).href;
  const result = spawnSync(process.execPath, [
    '--input-type=module',
    '--eval',
    `process.argv[1] = '/missing/b4-import-caller.mjs'; await import(${JSON.stringify(runnerUrl)});`,
  ], {
    cwd: WORKSPACE_ROOT,
    encoding: null,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.length, 0);
  assert.equal(result.stderr.length, 0);
});

test('T086: 13件目の共有JSON契約実体は欠落・別path・不正hashを拒否する', () => {
  const valid = makeJob();
  assert.deepEqual(
    b4Core.validatePresentationCaptionDisplayPairGenerationJobV001(valid),
    {valid: true},
  );
  assert.deepEqual(
    valid.implementationBinding.dependencyFiles.at(-1),
    {
      role: 'sharedJsonContractCore',
      path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
      fileSha256: HASH,
    },
  );

  const missing = clone(valid);
  missing.implementationBinding.dependencyFiles.pop();
  assert.deepEqual(
    b4Core.validatePresentationCaptionDisplayPairGenerationJobV001(missing),
    {valid: false},
  );

  const wrongPath = clone(valid);
  wrongPath.implementationBinding.dependencyFiles.at(-1).path =
    'evals/clip_composition/presentation_caption_semantic_output_v001.mjs';
  assert.deepEqual(
    b4Core.validatePresentationCaptionDisplayPairGenerationJobV001(wrongPath),
    {valid: false},
  );

  const invalidHash = clone(valid);
  invalidHash.implementationBinding.dependencyFiles.at(-1).fileSha256 = 'f'.repeat(63);
  assert.deepEqual(
    b4Core.validatePresentationCaptionDisplayPairGenerationJobV001(invalidHash),
    {valid: false},
  );
});

test('T087: layout出力は専用入口を直接使い整数入口・独自parse・profile注入を使わない', () => {
  const runner = readFileSync(repositoryAbsolute(RUNNER_PATH), 'utf8');
  assert.match(
    runner,
    /decodePresentationCaptionB4LayoutInspectionJsonV001\(readFileSync\(outputPath\)\)/u,
  );
  assert.equal(
    /decodePresentationCaptionB1StrictJsonV001\(readFileSync\(outputPath\)\)/u
      .test(runner),
    false,
  );
  assert.equal(/JSON\.parse\(readFileSync\(outputPath\)/u.test(runner), false);
  assert.equal(/allowDecimals|numberProfile|layoutNumberProfile/u.test(runner), false);
});

test('T088: 0 frame拒否は内側理由を欠落なく上位報告する', async () => {
  const fixture = await makeFormalJobFixture(
    'timeline-zero-frame',
    {independentZeroFrameCue: true},
  );
  try {
    const result = spawnSync(process.execPath, [repositoryAbsolute(RUNNER_PATH), fixture.jobPath], {
      cwd: WORKSPACE_ROOT,
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr.length, 0);
    const output = JSON.parse(result.stdout.toString('utf8'));
    assert.equal(
      output.schemaVersion,
      'presentation-caption-display-pair-validation-report-v002',
    );
    assert.equal(output.status, 'failed');
    assert.equal(output.violations[0].code, 'TIMELINE_MAPPING_FAILED');
    assert.deepEqual(
      output.violations[0].details.nestedViolationCodes,
      ['INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME'],
    );
    assert.equal(existsSync(repositoryAbsolute(fixture.formalOutputPath)), false);
    assert.equal(existsSync(repositoryAbsolute(fixture.lockPath)), false);
    assert.equal(existsSync(repositoryAbsolute(fixture.workPath)), false);
  } finally {
    fixture.cleanup();
  }
});

test('H04: 横長表示のcue計算は形式中立の共通入口へ36文字契約を渡しても同一になる', () => {
  const compilerInput = makeCompiler();
  const retainedSourceAtoms = makeRetained();
  const calculated =
    b4Core.buildPresentationCaptionDisplayContainersFormatNeutralV003({
      compilerInput,
      retainedSourceAtoms,
    });

  assert.deepEqual(calculated, makeDisplayPlan().containers);
  assert.deepEqual(
    calculated[0].cues.map((cue) => ({
      cueId: cue.cueId,
      text: cue.lines.map((line) => line.text).join(''),
      sourceStartMs: cue.sourceStartMs,
      sourceEndMs: cue.sourceEndMs,
    })),
    [
      {
        cueId: 'caption-cue-000001',
        text: '母船',
        sourceStartMs: 100,
        sourceEndMs: 300,
      },
      {
        cueId: 'caption-cue-000002',
        text: '月刊',
        sourceStartMs: 300,
        sourceEndMs: 500,
      },
    ],
  );
});
