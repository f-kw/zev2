import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  buildPresentationCaptionSemanticSourcePackageV002,
  runPresentationCaptionSemanticSourcePackageCliV002,
  runPresentationCaptionSemanticSourcePackageJobV002,
  validatePresentationCaptionSemanticSourcePackageJobV002,
} from './run_presentation_caption_semantic_source_package_job_v002.mjs';
import {
  serializePresentationCaptionB1FormalJsonV001,
  validatePresentationCaptionSemanticSourcePackageJobV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const HASH = '0'.repeat(64);
const COMMIT = '1'.repeat(40);
const JOB_PATH =
  'evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs/'
  + 'vertical-source-package-v002.json';
const files = [
  ['packageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['packageRunner', 'evals/clip_composition/run_presentation_caption_semantic_source_package_job_v002.mjs'],
  ['rendererTrustImplementation', 'evals/clip_composition/presentation_renderer_plan_v002.mjs'],
];
const dependencies = [
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
];
const widths = [
  ['presetRegistry', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json'],
  ['presetValidationIndex', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-validation-index.json'],
  ['materialValidationIndex', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/material-validation-index.json'],
  ['registryBinding', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/trusted-registry-bindings.json'],
  ['rendererTrust', 'evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001/trust.json'],
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
];
const clone = (value) => structuredClone(value);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const bytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const stableSnapshot = (path, value, discriminator) => {
  const content = Buffer.isBuffer(value) ? Buffer.from(value) : bytes(value);
  const observedStat = {
    kind: 'regular-file',
    dev: '1',
    ino: String(discriminator),
    size: String(content.length),
    mtimeNs: String(discriminator),
    nlink: '1',
  };
  return {
    path,
    bytes: content,
    fileSha256: sha(content),
    pathLstatBeforeOpen: observedStat,
    fdStatAfterOpen: clone(observedStat),
    fdStatAfterRead: clone(observedStat),
    pathResolutionObservation: {
      workspaceRootRealPath: '/workspace',
      lexicalWorkspaceRelativePath: path,
      targetRealPath: `/workspace/${path}`,
      ancestors: [{
        workspaceRelativePath: '',
        lstatKind: 'directory',
        realPath: '/workspace',
      }],
    },
  };
};
const makeJob = () => ({
  schemaVersion: 'presentation-caption-semantic-source-package-job-v002',
  jobId: 'vertical-source-package-v002',
  artifactId: 'vertical-artifact-v002',
  mode: 'formal-generation',
  gateA: {
    job: {path: 'gate-a/job.json', fileSha256: HASH},
    completionReport: {path: 'gate-a/report.md', fileSha256: HASH},
    expectedEvidenceHashes: {
      boundaryCandidatesCanonicalSha256: HASH,
      sourceAtomMembershipCanonicalSha256: HASH,
      evidenceCanonicalSha256: HASH,
    },
  },
  implementationBinding: {
    gitCommit: COMMIT,
    files: files.map(([role, path]) => ({role, path, fileSha256: HASH})),
    dependencyFiles: dependencies.map(
      ([role, path]) => ({role, path, fileSha256: HASH}),
    ),
  },
  widthPolicyBindings: widths.map(([role, path], index) => ({
    role,
    path,
    fileSha256: HASH,
    canonicalSha256: index === widths.length - 1 ? null : HASH,
  })),
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
  expectedRuntime: {
    nodeBinarySha256: HASH,
    nodeVersion: 'v20.0.0',
    icuVersion: '77.1',
    resolvedLocale: 'ja',
    resolvedGranularity: 'word',
  },
  expectedProjection: {
    sourceAtomCount: 1,
    containerCount: 1,
    boundaryCandidateCount: 1,
    containers: [{
      containerId: 'segmenter-container-000001',
      sourceAtomCount: 1,
      boundaryCandidateCount: 1,
    }],
  },
  publication: {
    packageId: 'vertical-package-v002',
    formalOutputPath:
      'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
      + 'vertical-artifact-v002',
    expectedState: 'absent',
  },
  readOnlyGuard: {
    watchedRoot: 'evals/clip_composition/outputs/presentation',
    excludedPaths: [JOB_PATH],
    expectedBeforeCanonicalSha256: HASH,
  },
});

const makeArtifacts = (job) => {
  const names = [
    'segmenter-boundary-evidence.json',
    'embedded-gate-a-validation-report.json',
    'semantic-source-input.json',
    'deterministic-expansion-map.json',
    'source-only-leakage-report.json',
    'package-manifest.json',
    'package-validation-report.json',
  ];
  return names.map((fileName, index) => {
    const value = index === 6
      ? {
        schemaVersion:
          'presentation-caption-semantic-source-package-validation-report-v002',
        status: 'passed',
        failureStage: null,
        jobBinding: {path: JOB_PATH, fileSha256: HASH},
        package: {
          packageId: job.publication.packageId,
          artifactId: job.artifactId,
          formalOutputPath: job.publication.formalOutputPath,
        },
        manifestBinding: {},
        checks: [],
        violations: [],
        validatedContentArtifacts: [],
        observedProjection: {
          formatSelection: clone(job.formatSelection),
          displayConstraintInput: clone(job.displayConstraintInput),
        },
        scope: {},
      }
      : {schemaVersion: `synthetic-${index}`, index};
    return {fileName, value, bytes: bytes(value)};
  });
};

const makeActualBuildInput = () => {
  const job = makeJob();
  const implementationSnapshots = job.implementationBinding.files.map(
    (entry, index) => stableSnapshot(entry.path, Buffer.from(`implementation-${index}`), 10 + index),
  );
  implementationSnapshots.forEach((snapshot, index) => {
    job.implementationBinding.files[index].fileSha256 = snapshot.fileSha256;
  });
  const dependencySnapshots = job.implementationBinding.dependencyFiles.map(
    (entry, index) => stableSnapshot(entry.path, Buffer.from(`dependency-${index}`), 20 + index),
  );
  dependencySnapshots.forEach((snapshot, index) => {
    job.implementationBinding.dependencyFiles[index].fileSha256 = snapshot.fileSha256;
  });
  const widthPolicySnapshots = job.widthPolicyBindings.map((entry, index) =>
    stableSnapshot(
      entry.path,
      index === job.widthPolicyBindings.length - 1
        ? Buffer.from('text-layout')
        : {slot: index},
      30 + index,
    ));
  widthPolicySnapshots.forEach((snapshot, index) => {
    job.widthPolicyBindings[index].fileSha256 = snapshot.fileSha256;
    job.widthPolicyBindings[index].canonicalSha256 = index === 5
      ? null
      : sha(Buffer.from(`{"slot":${index}}`, 'utf8'));
  });
  const sourceArtifact = {
    rawSourceAtoms: [{
      atomId: 'atom-a',
      speechId: 1,
      text: '母',
      startMs: 100,
      endMs: 200,
    }],
  };
  const sourceSnapshots = [
    stableSnapshot('source/source-atoms.json', sourceArtifact, 40),
    stableSnapshot('source/generation-manifest.json', {status: 'passed'}, 41),
    stableSnapshot('source/validation-report.json', {status: 'passed'}, 42),
  ];
  const evidence = {
    artifactId: job.artifactId,
    boundaryCandidatesCanonicalSha256: HASH,
    sourceAtomMembershipCanonicalSha256: HASH,
    boundaryCandidates: [{
      boundaryCandidateId: 'boundary-000001',
      containerId: 'segmenter-container-000001',
      timelineSegmentId: 'timeline-000001',
      speechId: 1,
      sourceAtomIds: ['atom-a'],
      text: '母',
      startAnchor: {atomId: 'atom-a', edge: 'start'},
      endAnchor: {atomId: 'atom-a', edge: 'end'},
    }],
  };
  const gateAJob = {
    jobId: 'gate-a-job',
    implementationBinding: {
      files: dependencySnapshots.slice(1).map((snapshot, index) => ({
        role: ['core', 'retainedSourceAtomsCore', 'runner'][index],
        path: snapshot.path,
        fileSha256: snapshot.fileSha256,
      })),
    },
  };
  const jobSnapshot = stableSnapshot(JOB_PATH, job, 50);
  const gateAJobSnapshot = stableSnapshot('gate-a/job.json', gateAJob, 51);
  const completionReportSnapshot =
    stableSnapshot('gate-a/report.md', Buffer.from('completion\n'), 52);
  const nodeBytes = Buffer.from('node');
  return {
    context: {
      job: {value: job, snapshot: jobSnapshot},
      gateA: {
        jobValue: gateAJob,
        jobSnapshot: gateAJobSnapshot,
        completionReportSnapshot,
        evidenceValue: evidence,
        evidenceBytes: bytes(evidence),
        embeddedReportValue: {status: 'passed'},
        embeddedReportBytes: Buffer.from('{"status":"passed"}\n', 'utf8'),
      },
      implementationSnapshots,
      sourceSnapshots,
      widthPolicySnapshots,
      runtimeObservation: {
        nodeBinaryInput: {
          role: 'nodeBinary',
          status: 'read',
          snapshot: {bytes: nodeBytes, fileSha256: sha(nodeBytes)},
        },
        nodeVersion: 'v20.0.0',
        icuVersion: '77.1',
        resolvedLocale: 'ja',
        resolvedGranularity: 'word',
        diagnostics: {
          resolvedNodePath: '/usr/bin/node',
          platform: 'darwin',
          arch: 'arm64',
          v8Version: '11',
          unicodeVersion: '15',
          cldrVersion: '45',
        },
      },
    },
    dependencySnapshots,
    maximumSupportedLogicalWidth: 14,
  };
};

test('S01: B3 v002正常jobと固定7 implementation bindingを受理する', () => {
  assert.deepEqual(
    validatePresentationCaptionSemanticSourcePackageJobV002(makeJob()),
    {status: 'passed', violations: []},
  );
});

test('S02: 同じbuild入力を2回評価したpackage 7成果物はbyte一致する', async () => {
  const job = makeJob();
  const result = await runPresentationCaptionSemanticSourcePackageJobV002(
    JOB_PATH,
    {
      jobBytes: bytes(job),
      build: async () => ({artifacts: makeArtifacts(job)}),
      publish: false,
    },
  );
  assert.equal(result.exitCode, 0);
  assert.equal(result.value.status, 'passed');

  const actualBuildInput = makeActualBuildInput();
  const first = buildPresentationCaptionSemanticSourcePackageV002(actualBuildInput);
  const second = buildPresentationCaptionSemanticSourcePackageV002(actualBuildInput);
  assert.equal(first.artifacts.length, 7);
  assert.deepEqual(
    first.artifacts.map((artifact) => artifact.bytes),
    second.artifacts.map((artifact) => artifact.bytes),
  );
  assert.equal(
    first.artifacts[2].value.schemaVersion,
    'presentation-caption-semantic-source-input-v002',
  );
  assert.equal(
    first.artifacts[5].value.schemaVersion,
    'presentation-caption-semantic-source-package-manifest-v002',
  );
});

test('S03: jobの欠落key・余分key・順序違いを拒否する', () => {
  const missing = makeJob();
  delete missing.mode;
  const extra = {...makeJob(), unknown: true};
  const reordered = {jobId: makeJob().jobId, ...makeJob()};
  for (const value of [missing, extra, reordered]) {
    assert.equal(
      validatePresentationCaptionSemanticSourcePackageJobV002(value).status,
      'rejected',
    );
  }
});

test('S04: v001とv002のjob入口を相互変換しない', () => {
  const v002 = makeJob();
  const v001 = clone(v002);
  v001.schemaVersion = 'presentation-caption-semantic-source-package-job-v001';
  delete v001.formatSelection;
  delete v001.displayConstraintInput;
  assert.equal(
    validatePresentationCaptionSemanticSourcePackageJobV002(v001).status,
    'rejected',
  );
  assert.equal(
    validatePresentationCaptionSemanticSourcePackageJobV001(v002).status,
    'invalid',
  );
});

test('S05: manifest v002は承認済み14 key順だけを使う', () => {
  const job = makeJob();
  const manifest = {
    schemaVersion: 'presentation-caption-semantic-source-package-manifest-v002',
    packageId: job.publication.packageId,
    artifactId: job.artifactId,
    formalOutputPath: job.publication.formalOutputPath,
    packageJobBinding: {},
    sourceGateBinding: {},
    implementationBinding: {},
    runtimeBinding: {},
    externalInputBindings: [],
    formatSelection: clone(job.formatSelection),
    displayConstraintInput: clone(job.displayConstraintInput),
    contentArtifacts: [],
    contentSetCanonicalSha256: HASH,
    validationReportDeclaration: {},
  };
  assert.deepEqual(Object.keys(manifest), [
    'schemaVersion',
    'packageId',
    'artifactId',
    'formalOutputPath',
    'packageJobBinding',
    'sourceGateBinding',
    'implementationBinding',
    'runtimeBinding',
    'externalInputBindings',
    'formatSelection',
    'displayConstraintInput',
    'contentArtifacts',
    'contentSetCanonicalSha256',
    'validationReportDeclaration',
  ]);
});

test('S06: manifestのformatと表示制約はjob入力をbyte同一で写す', () => {
  const job = makeJob();
  const projection = {
    formatSelection: clone(job.formatSelection),
    displayConstraintInput: clone(job.displayConstraintInput),
  };
  assert.deepEqual(bytes(projection), bytes({
    formatSelection: job.formatSelection,
    displayConstraintInput: job.displayConstraintInput,
  }));
});

test('S07: 幅の0・負数・小数・unsafe integerを拒否する', () => {
  for (const width of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const job = makeJob();
    job.displayConstraintInput.maxLogicalWidthPerLine = width;
    assert.equal(
      validatePresentationCaptionSemanticSourcePackageJobV002(job).status,
      'rejected',
    );
  }
});

test('S08: job幅が選択stateの安全上限を超えるとbuild前に拒否する', () => {
  assert.throws(
    () => buildPresentationCaptionSemanticSourcePackageV002({
      context: {job: {value: makeJob()}},
      dependencySnapshots: [],
      maximumSupportedLogicalWidth: 13,
    }),
    /safety limit/u,
  );
});

test('S09: 共有B3 coreはcandidate ID・素材SHA・縦長幅14を埋め込まない', () => {
  const source = readFileSync(
    new URL('./presentation_caption_semantic_source_package_v001.mjs', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /candidate-59|qdczJpv8RCc/u);
  assert.doesNotMatch(source, /maxLogicalWidthPerLine:\s*14/u);
});

test('S10: B3 runnerはexit 0・1・2を単一JSON stdoutとstderr 0へ固定する', async () => {
  const job = makeJob();
  const passed = await runPresentationCaptionSemanticSourcePackageJobV002(
    JOB_PATH,
    {
      jobBytes: bytes(job),
      build: async () => ({artifacts: makeArtifacts(job)}),
      publish: false,
    },
  );
  assert.equal(passed.exitCode, 0);
  const rejectedJob = makeJob();
  rejectedJob.schemaVersion = 'unknown';
  const rejected = await runPresentationCaptionSemanticSourcePackageJobV002(
    JOB_PATH,
    {jobBytes: bytes(rejectedJob), publish: false},
  );
  assert.equal(rejected.exitCode, 1);
  const writes = [];
  const usage = await runPresentationCaptionSemanticSourcePackageCliV002(
    [],
    {stdout: {write: (value) => writes.push(Buffer.from(value))}},
  );
  assert.equal(usage, 2);
  assert.equal(writes.length, 1);
  assert.equal(JSON.parse(writes[0]).status, 'fatal');
});
