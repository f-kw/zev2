import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';

import {
  runPresentationCaptionSemanticOutputCheckCliV002,
  runPresentationCaptionSemanticOutputCheckV002,
  validatePresentationCaptionSemanticOutputCheckJobV002,
} from './run_presentation_caption_semantic_output_check_v002.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const HASH = '0'.repeat(64);
const JOB_PATH =
  'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/'
  + 'vertical-semantic-v002.json';
const PACKAGE_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
  + 'vertical-semantic-v002';
const RAW_PATH =
  'evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/'
  + 'vertical-semantic-v002.json';
const PACKAGE_FILES = [
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
];
const CHECK_NAMES = [
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
];
const direct = [
  ['packageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunner', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs'],
];
const dependencies = [
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
];
const clone = (value) => structuredClone(value);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const bytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const canonicalSha = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return hash(result.bytes);
};
const pathBinding = (path, value) => ({
  path,
  fileSha256: hash(bytes(value)),
  canonicalSha256: canonicalSha(value),
});

const makeFixture = ({text = 'あいうえおかき', lineEnds = null} = {}) => {
  const logicalWidth = [...text].reduce(
    (sum, character) => sum + (character.codePointAt(0) <= 0xff ? 1 : 2),
    0,
  );
  const candidateId = 'segmenter-boundary-000001';
  const containerId = 'segmenter-container-000001';
  const evidence = {
    schemaVersion: 'presentation-segmenter-boundary-evidence-v001',
    artifactId: 'vertical-semantic-v002',
    generatorVersion: 'presentation-segmenter-boundary-evidence-generator-v001',
    sourceBinding: {
      sourceArtifactId: 'retained-source-v001',
      sourceArtifactPath: 'synthetic/source-atoms.json',
      sourceArtifactFileSha256: HASH,
      sourceArtifactCanonicalSha256: HASH,
      sourceRef: 'synthetic-source',
      sourceProvenance: 'synthetic-source-v001',
      atomGranularity: 'character-timestamp',
      rawSourceAtomsCanonicalSha256: HASH,
    },
    runtimeBinding: {
      nodeBinarySha256: HASH,
      nodeVersion: 'v20.0.0',
      icuVersion: '77.1',
      resolvedLocale: 'ja',
      resolvedGranularity: 'word',
      diagnostics: {
        resolvedNodePath: '/synthetic/node',
        platform: 'darwin',
        arch: 'arm64',
        v8Version: 'synthetic',
        unicodeVersion: 'synthetic',
        cldrVersion: 'synthetic',
      },
    },
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
    boundaryCandidates: [{
      boundaryCandidateId: candidateId,
      containerId,
      timelineSegmentId: 'segment-0001',
      speechId: 1,
      sourceAtomIds: ['atom-1'],
      text,
      startAnchor: {atomId: 'atom-1', edge: 'start'},
      endAnchor: {atomId: 'atom-1', edge: 'end'},
      segmenterIndexUtf16: 0,
      segmenterLengthUtf16: text.length,
      isWordLike: true,
      sourceAtomCount: 1,
    }],
    boundaryCandidatesCanonicalSha256: HASH,
    sourceAtomMembershipCanonicalSha256: HASH,
  };
  const sourceInput = {
    schemaVersion: 'presentation-caption-semantic-source-input-v002',
    taskDescription:
      '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、本文を変更せず、各行のlogicalWidth合計がmaxLogicalWidthPerLine以下になる意味の読める短い行へ分ける。連続する1行または2行を1つのmeaningGroupとしてまとめ、行末はboundaryCandidateIdで示す。',
    displayConstraints: {
      maxLogicalWidthPerLine: 14,
      maxLinesPerMeaningGroup: 2,
    },
    containers: [{
      containerId,
      text,
      boundaryCandidates: [{boundaryCandidateId: candidateId, text, logicalWidth}],
    }],
  };
  const expansion = {
    schemaVersion: 'presentation-caption-semantic-expansion-map-v002',
    artifactId: 'vertical-semantic-v002',
    sourceBindings: {
      sourceAtoms: {
        path: 'synthetic/source-atoms.json',
        fileSha256: HASH,
        canonicalSha256: HASH,
      },
      boundaryEvidence: {
        fileName: PACKAGE_FILES[0],
        fileSha256: HASH,
        canonicalSha256: HASH,
        boundaryCandidatesCanonicalSha256: HASH,
        sourceAtomMembershipCanonicalSha256: HASH,
      },
    },
    widthPolicyBinding: {
      presetRegistry: {path: 'registry/preset.json', fileSha256: HASH, canonicalSha256: HASH},
      presetValidationIndex: {path: 'registry/preset-index.json', fileSha256: HASH, canonicalSha256: HASH},
      materialValidationIndex: {path: 'registry/material-index.json', fileSha256: HASH, canonicalSha256: HASH},
      registryBinding: {path: 'registry/trusted.json', fileSha256: HASH, canonicalSha256: HASH},
      rendererTrust: {path: 'registry/renderer-trust.json', fileSha256: HASH, canonicalSha256: HASH},
      rendererTrustImplementation: {
        path: 'evals/clip_composition/presentation_renderer_plan_v002.mjs',
        fileSha256: HASH,
      },
      textLayoutImplementation: {
        path: 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs',
        fileSha256: HASH,
      },
      presetId: 'vertical-short-speaker-only-readable-pop-v001',
      visualStateId: 'caption-core-vertical-speaker-only-v001',
      maxLogicalWidthPerLine: 14,
      maxLinesPerMeaningGroup: 2,
      characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
    },
    modelInputBinding: {
      fileName: PACKAGE_FILES[2],
      fileSha256: HASH,
      canonicalSha256: HASH,
    },
    containers: [{
      containerId,
      timelineSegmentId: 'segment-0001',
      speechId: 1,
      candidates: [{
        boundaryCandidateId: candidateId,
        sourceAtomIds: ['atom-1'],
        startAnchor: {atomId: 'atom-1', edge: 'start'},
        endAnchor: {atomId: 'atom-1', edge: 'end'},
        logicalWidth,
      }],
    }],
  };
  const contentArtifacts = PACKAGE_FILES.slice(0, 5).map((fileName, index) => ({
    role: [
      'boundaryEvidence',
      'embeddedGateAReport',
      'semanticSourceInput',
      'deterministicExpansionMap',
      'sourceOnlyLeakageReport',
    ][index],
    fileName,
    fileSha256: HASH,
    canonicalSha256: HASH,
  }));
  const manifest = {
    schemaVersion: 'presentation-caption-semantic-source-package-manifest-v002',
    packageId: 'vertical-semantic-package-v002',
    artifactId: 'vertical-semantic-v002',
    formalOutputPath: PACKAGE_ROOT,
    packageJobBinding: {path: 'synthetic/package-job.json', fileSha256: HASH},
    sourceGateBinding: {},
    implementationBinding: {
      files: direct.map(([role, path]) => ({role, path, fileSha256: HASH})),
      dependencyFiles: dependencies.map(
        ([role, path]) => ({role, path, fileSha256: HASH}),
      ),
    },
    runtimeBinding: {},
    externalInputBindings: [],
    formatSelection: {
      format: 'vertical-short-1080x1920',
      screenLayoutId: 'speaker_only',
      presetId: 'vertical-short-speaker-only-readable-pop-v001',
      visualStateId: 'caption-core-vertical-speaker-only-v001',
    },
    displayConstraintInput: {
      maxLogicalWidthPerLine: 14,
      maxLinesPerMeaningGroup: 2,
      characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
    },
    contentArtifacts,
    contentSetCanonicalSha256: HASH,
    validationReportDeclaration: {
      fileName: PACKAGE_FILES[6],
      schemaVersion:
        'presentation-caption-semantic-source-package-validation-report-v002',
      selfHashPolicy: 'report-is-not-hashed-by-manifest-v001',
    },
  };
  const packageReport = {
    schemaVersion:
      'presentation-caption-semantic-source-package-validation-report-v002',
    status: 'passed',
    failureStage: null,
    jobBinding: {path: 'synthetic/package-job.json', fileSha256: HASH},
    package: {
      packageId: manifest.packageId,
      artifactId: manifest.artifactId,
      formalOutputPath: manifest.formalOutputPath,
    },
    manifestBinding: {
      fileName: PACKAGE_FILES[5],
      fileSha256: HASH,
      canonicalSha256: HASH,
    },
    checks: CHECK_NAMES.map((name) => ({
      name,
      status: 'passed',
      violationCodes: [],
    })),
    violations: [],
    validatedContentArtifacts: contentArtifacts,
    observedProjection: {
      sourceAtomCount: 1,
      containerCount: 1,
      boundaryCandidateCount: 1,
      containers: [{containerId, sourceAtomCount: 1, boundaryCandidateCount: 1}],
      maximumObservedCandidateLogicalWidth: logicalWidth,
      formatSelection: clone(manifest.formatSelection),
      displayConstraintInput: clone(manifest.displayConstraintInput),
    },
    scope: {},
  };
  const packageValues = [
    evidence,
    {schemaVersion: 'synthetic-embedded-v001'},
    sourceInput,
    expansion,
    {schemaVersion: 'presentation-caption-source-only-leakage-report-v001'},
    manifest,
    packageReport,
  ];
  const packageBytes = packageValues.map(bytes);
  const raw = {
    status: 'complete',
    containers: [{
      containerId,
      meaningGroups: [{
        lineEndBoundaryCandidateIds: lineEnds ?? [candidateId],
      }],
    }],
  };
  const rawBytes = bytes(raw);
  const implementationBytes = new Map(
    [...direct, ...dependencies].map(([, path]) => [path, Buffer.from(path)]),
  );
  const job = {
    schemaVersion: 'presentation-caption-semantic-output-check-job-v002',
    jobId: 'vertical-semantic-v002',
    artifactId: 'vertical-semantic-v002',
    mode: 'read-only-check',
    implementationBinding: {
      gitCommit: '1'.repeat(40),
      files: direct.map(([role, path]) => ({
        role,
        path,
        fileSha256: hash(implementationBytes.get(path)),
      })),
      dependencyFiles: dependencies.map(([role, path]) => ({
        role,
        path,
        fileSha256: hash(implementationBytes.get(path)),
      })),
    },
    sourcePackageBinding: {
      rootPath: PACKAGE_ROOT,
      manifest: pathBinding(`${PACKAGE_ROOT}/${PACKAGE_FILES[5]}`, manifest),
      validationReport:
        pathBinding(`${PACKAGE_ROOT}/${PACKAGE_FILES[6]}`, packageReport),
    },
    semanticOutputBinding: {path: RAW_PATH, fileSha256: hash(rawBytes)},
    expectedRuntime: {},
    expectedProjection: {},
    readOnlyGuard: {expectedBeforeCanonicalSha256: HASH},
  };
  const state = {
    job,
    packageValues,
    packageBytes,
    raw,
    rawBytes,
  };
  state.readFile = async (absolute) => {
    for (const [path, value] of implementationBytes) {
      if (absolute.endsWith(path)) return Buffer.from(value);
    }
    const packageIndex = PACKAGE_FILES.findIndex(
      (fileName) => absolute.endsWith(`${PACKAGE_ROOT}/${fileName}`),
    );
    if (packageIndex >= 0) return Buffer.from(state.packageBytes[packageIndex]);
    if (absolute.endsWith(RAW_PATH)) return Buffer.from(state.rawBytes);
    throw new Error(`unexpected read: ${absolute}`);
  };
  return state;
};

const run = (fixture) => runPresentationCaptionSemanticOutputCheckV002(
  JOB_PATH,
  {
    jobBytes: bytes(fixture.job),
    readFile: fixture.readFile,
  },
);

test('W01: B1 v002は幅14の正常回答と固定7 implementation bindingを受理する', async () => {
  const fixture = makeFixture();
  assert.equal(
    validatePresentationCaptionSemanticOutputCheckJobV002(fixture.job).status,
    'passed',
  );
  const result = await run(fixture);
  assert.equal(result.exitCode, 0);
  assert.equal(result.value.status, 'passed');
  assert.equal(
    result.value.compilerInput.status,
    'generated',
  );
});

test('W02: 同じjobで論理幅15の行を既存幅超過違反へ帰属する', async () => {
  const result = await run(makeFixture({text: 'あいうえおかきa'}));
  assert.equal(result.exitCode, 1);
  assert.equal(result.value.status, 'rejected');
  assert.equal(
    result.value.violations.some(
      (entry) => entry.code === 'SEMANTIC_LINE_WIDTH_EXCEEDED',
    ),
    true,
  );
});

test('W03: manifestと意味入力の幅不一致を拒否する', async () => {
  const fixture = makeFixture();
  fixture.packageValues[2].displayConstraints.maxLogicalWidthPerLine = 13;
  fixture.packageBytes[2] = bytes(fixture.packageValues[2]);
  const result = await run(fixture);
  assert.equal(result.exitCode, 1);
});

test('W04: 意味入力と展開写像の幅不一致を拒否する', async () => {
  const fixture = makeFixture();
  fixture.packageValues[3].widthPolicyBinding.maxLogicalWidthPerLine = 13;
  fixture.packageBytes[3] = bytes(fixture.packageValues[3]);
  const result = await run(fixture);
  assert.equal(result.exitCode, 1);
});

test('W05: manifestと台帳bindingのpreset不一致を拒否する', async () => {
  const fixture = makeFixture();
  fixture.packageValues[3].widthPolicyBinding.presetId = 'wrong-preset';
  fixture.packageBytes[3] = bytes(fixture.packageValues[3]);
  const result = await run(fixture);
  assert.equal(result.exitCode, 1);
});

test('W06: manifestと台帳bindingのstate不一致を拒否する', async () => {
  const fixture = makeFixture();
  fixture.packageValues[3].widthPolicyBinding.visualStateId = 'wrong-state';
  fixture.packageBytes[3] = bytes(fixture.packageValues[3]);
  const result = await run(fixture);
  assert.equal(result.exitCode, 1);
});

test('W07: 1まとまり2行を受理する', async () => {
  const fixture = makeFixture();
  const source = fixture.packageValues[2];
  const map = fixture.packageValues[3];
  const evidence = fixture.packageValues[0];
  const first = clone(source.containers[0].boundaryCandidates[0]);
  first.boundaryCandidateId = 'segmenter-boundary-000001';
  first.text = 'あ';
  first.logicalWidth = 2;
  const second = clone(first);
  second.boundaryCandidateId = 'segmenter-boundary-000002';
  second.text = 'い';
  source.containers[0].text = 'あい';
  source.containers[0].boundaryCandidates = [first, second];
  const mappedFirst = clone(map.containers[0].candidates[0]);
  mappedFirst.boundaryCandidateId = first.boundaryCandidateId;
  mappedFirst.logicalWidth = 2;
  const mappedSecond = clone(mappedFirst);
  mappedSecond.boundaryCandidateId = second.boundaryCandidateId;
  map.containers[0].candidates = [mappedFirst, mappedSecond];
  const evidenceFirst = clone(evidence.boundaryCandidates[0]);
  evidenceFirst.boundaryCandidateId = first.boundaryCandidateId;
  evidenceFirst.text = first.text;
  const evidenceSecond = clone(evidenceFirst);
  evidenceSecond.boundaryCandidateId = second.boundaryCandidateId;
  evidenceSecond.text = second.text;
  evidence.boundaryCandidates = [evidenceFirst, evidenceSecond];
  fixture.raw.containers[0].meaningGroups[0].lineEndBoundaryCandidateIds = [
    first.boundaryCandidateId,
    second.boundaryCandidateId,
  ];
  fixture.rawBytes = bytes(fixture.raw);
  fixture.job.semanticOutputBinding.fileSha256 = hash(fixture.rawBytes);
  fixture.packageBytes[0] = bytes(evidence);
  fixture.packageBytes[2] = bytes(source);
  fixture.packageBytes[3] = bytes(map);
  const result = await run(fixture);
  assert.equal(result.exitCode, 0);
  assert.equal(result.value.observedProjection.lineCount, 2);
});

test('W08: 3行拒否とrunnerのexit 0・1・2 stdout契約を固定する', async () => {
  const rejected = await run(makeFixture({
    lineEnds: [
      'segmenter-boundary-000001',
      'segmenter-boundary-000001',
      'segmenter-boundary-000001',
    ],
  }));
  assert.equal(rejected.exitCode, 1);
  const passed = await run(makeFixture());
  assert.equal(passed.exitCode, 0);
  const writes = [];
  const usage = await runPresentationCaptionSemanticOutputCheckCliV002(
    [],
    {stdout: {write: (value) => writes.push(Buffer.from(value))}},
  );
  assert.equal(usage, 2);
  assert.equal(writes.length, 1);
  assert.equal(JSON.parse(writes[0]).status, 'fatal');
});
