import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_SOURCE_OWNED_VIOLATION_CODES_V001,
  PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_JOB_SCHEMA_V001,
  PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001,
  PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001,
  buildPresentationMeaningBoundarySourcePackageV001,
  inspectPresentationMeaningBoundarySourceInputsBeforePublicationV001,
  inspectPresentationMeaningBoundarySourcePackageV001,
  runPresentationMeaningBoundarySourcePackageJobV001,
  validatePresentationMeaningBoundarySourcePackageV001,
} from './presentation_meaning_boundary_source_package_v001.mjs';
import {
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(HERE, '../..');
const SOURCE_PACKAGE_CLI_PATH = path.join(
  REPOSITORY_ROOT,
  'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
);
const H = character => character.repeat(64);
const clone = value => structuredClone(value);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const formalBytes = value => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const canonicalSha256 = value => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return sha256(result.bytes);
};
const jsonBinding = (schemaVersion, bindingPath, value) => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: sha256(formalBytes(value)),
  canonicalSha256: canonicalSha256(value),
});
const mediaBinding = (bindingPath, character = 'a') => ({
  path: bindingPath,
  fileSha256: H(character),
});

const CONTRACT_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-meaning-information-package-contract-design-20260803-v001.md',
    fileSha256: 'a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de',
    role: 'meaning-package-contract',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md',
    fileSha256: 'c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de',
    role: 'output-side-contract',
  }),
]);

const IMPLEMENTATION_SPECS = Object.freeze([
  Object.freeze({
    role: 'meaning-source-package',
    path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
  }),
  Object.freeze({
    role: 'gate-a-core',
    path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
  }),
  Object.freeze({
    role: 'gate-a-preflight',
    path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
  }),
  Object.freeze({
    role: 'strict-json',
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
  }),
]);

const CHECK_NAMES = Object.freeze([
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

const makeEvidenceRuntime = () => ({
  nodeBinarySha256: H('1'),
  nodeVersion: 'v20.19.6',
  icuVersion: '75.1',
  resolvedLocale: 'ja',
  resolvedGranularity: 'word',
  diagnostics: {
    resolvedNodePath: '/fixture/node',
    platform: 'darwin',
    arch: 'arm64',
    v8Version: '11.3',
    unicodeVersion: '15.1',
    cldrVersion: '45.0',
  },
});

const makeReportRuntime = evidenceRuntime => ({
  diagnostics: {
    arch: evidenceRuntime.diagnostics.arch,
    cldrVersion: evidenceRuntime.diagnostics.cldrVersion,
    platform: evidenceRuntime.diagnostics.platform,
    resolvedNodePath: evidenceRuntime.diagnostics.resolvedNodePath,
    unicodeVersion: evidenceRuntime.diagnostics.unicodeVersion,
    v8Version: evidenceRuntime.diagnostics.v8Version,
  },
  icuVersion: evidenceRuntime.icuVersion,
  nodeBinarySha256: evidenceRuntime.nodeBinarySha256,
  nodeVersion: evidenceRuntime.nodeVersion,
  resolvedGranularity: evidenceRuntime.resolvedGranularity,
  resolvedLocale: evidenceRuntime.resolvedLocale,
});

const makeSegmentationPolicy = () => ({
  policyVersion: 'presentation-segmenter-boundary-policy-v001',
  engine: 'Intl.Segmenter',
  locale: 'ja',
  granularity: 'word',
  indexUnit: 'utf16-code-unit',
  containerRule: 'maximal-contiguous-run-by-timeline-segment-and-speech-v001',
  candidateIdRule: 'source-order-six-digit-v001',
  unicodeNormalization: 'none',
});

const makeSource = (sourceIndex, segmentSpecs) => {
  const sourceMediaId = `source-media-${String(sourceIndex).padStart(6, '0')}`;
  const videoId = `${String(sourceIndex).repeat(11)}`;
  const sourceRef = `youtube:${videoId}`;
  const rawSourceAtoms = [];
  const selectionSegments = [];
  const evidenceCandidates = [];
  let atomOrdinal = 0;
  let candidateOrdinal = 0;
  let sourceContainerOrdinal = 0;

  for (const segmentSpec of segmentSpecs) {
    const atomIds = [];
    let previousSpeechId = null;
    let currentContainerId = null;
    for (const atomSpec of segmentSpec.atoms) {
      atomOrdinal += 1;
      candidateOrdinal += 1;
      const atomId = `source-${sourceIndex}-atom-${String(atomOrdinal).padStart(3, '0')}`;
      if (atomSpec.speechId !== previousSpeechId) {
        sourceContainerOrdinal += 1;
        currentContainerId =
          `segmenter-container-${String(sourceContainerOrdinal).padStart(6, '0')}`;
        previousSpeechId = atomSpec.speechId;
      }
      const atom = {
        atomId,
        speechId: atomSpec.speechId,
        speaker: atomSpec.speaker ?? `speaker-${sourceIndex}`,
        text: atomSpec.text,
        startMs: atomSpec.startMs,
        endMs: atomSpec.endMs,
        sourceRef,
      };
      rawSourceAtoms.push(atom);
      atomIds.push(atomId);
      evidenceCandidates.push({
        boundaryCandidateId:
          `segmenter-boundary-${String(candidateOrdinal).padStart(6, '0')}`,
        containerId: currentContainerId,
        timelineSegmentId: segmentSpec.sourceTimelineSegmentId,
        speechId: atomSpec.speechId,
        sourceAtomIds: [atomId],
        text: atomSpec.text,
        startAnchor: {atomId, edge: 'start'},
        endAnchor: {atomId, edge: 'end'},
        segmenterIndexUtf16: 0,
        segmenterLengthUtf16: atomSpec.text.length,
        isWordLike: true,
        sourceAtomCount: 1,
      });
    }
    selectionSegments.push({
      timelineSegmentId: segmentSpec.sourceTimelineSegmentId,
      sourceStartMs: segmentSpec.sourceStartMs,
      sourceEndMs: segmentSpec.sourceEndMs,
      outputStartFrame: 0,
      outputEndFrame: 30,
      atomIds,
      atomIdsCanonicalSha256: canonicalSha256(atomIds),
      atomCount: atomIds.length,
    });
  }

  const retained = {
    schemaVersion: 'presentation-retained-source-atoms-v001',
    artifactId: `retained-source-${sourceIndex}-v001`,
    extractorVersion: 'presentation-retained-source-atoms-extractor-v001',
    sourceRef,
    sourceProvenance: `inline-source-${sourceIndex}`,
    atomGranularity: 'character-timestamp',
    selection: {segments: selectionSegments},
    rawSourceAtomsCanonicalSha256: canonicalSha256(rawSourceAtoms),
    rawSourceAtoms,
  };
  const generationManifest = {
    schemaVersion: 'presentation-retained-source-atoms-generation-manifest-v001',
    sourceRef,
  };
  const validationReport = {
    schemaVersion: 'presentation-retained-source-atoms-validation-report-v001',
    status: 'passed',
  };
  const basePath = `fixtures/meaning-boundary/source-${sourceIndex}`;
  const retainedBindings = {
    sourceAtoms: jsonBinding(
      retained.schemaVersion,
      `${basePath}/source-atoms.json`,
      retained,
    ),
    generationManifest: jsonBinding(
      generationManifest.schemaVersion,
      `${basePath}/generation-manifest.json`,
      generationManifest,
    ),
    validationReport: jsonBinding(
      validationReport.schemaVersion,
      `${basePath}/validation-report.json`,
      validationReport,
    ),
  };
  const sourceMedia = {
    sourceMediaId,
    ordinal: sourceIndex,
    sourceRef,
    mediaBinding: mediaBinding(`${basePath}/source.mp4`, String(sourceIndex)),
    sourceIdentityBinding: {
      schemaVersion: 'presentation-real-data-source-identity-v001',
      path: `${basePath}/source-identity.json`,
      fileSha256: H('b'),
      canonicalSha256: H('c'),
    },
    retainedSourceAtomsBinding: retainedBindings,
  };
  const evidenceRuntime = makeEvidenceRuntime();
  const evidence = {
    schemaVersion: 'presentation-segmenter-boundary-evidence-v001',
    artifactId: `segmenter-evidence-${sourceIndex}-v001`,
    generatorVersion: 'presentation-segmenter-boundary-evidence-generator-v001',
    sourceBinding: {
      sourceArtifactId: retained.artifactId,
      sourceArtifactPath: retainedBindings.sourceAtoms.path,
      sourceArtifactFileSha256: retainedBindings.sourceAtoms.fileSha256,
      sourceArtifactCanonicalSha256: retainedBindings.sourceAtoms.canonicalSha256,
      sourceRef,
      sourceProvenance: retained.sourceProvenance,
      atomGranularity: retained.atomGranularity,
      rawSourceAtomsCanonicalSha256: retained.rawSourceAtomsCanonicalSha256,
    },
    runtimeBinding: evidenceRuntime,
    segmentationPolicy: makeSegmentationPolicy(),
    boundaryCandidates: evidenceCandidates,
    boundaryCandidatesCanonicalSha256: canonicalSha256(evidenceCandidates),
    sourceAtomMembershipCanonicalSha256: canonicalSha256(
      evidenceCandidates.map(({boundaryCandidateId, sourceAtomIds}) => ({
        boundaryCandidateId,
        sourceAtomIds,
      })),
    ),
  };
  const observedProjection = {sourcePositiveOverlapCount: 0};
  const preflightReport = {
    schemaVersion: 'presentation-segmenter-boundary-preflight-report-v001',
    status: 'passed',
    failureStage: null,
    inputs: [
      {fileSha256: retainedBindings.sourceAtoms.fileSha256, path: retainedBindings.sourceAtoms.path, role: 'sourceAtoms'},
      {fileSha256: retainedBindings.generationManifest.fileSha256, path: retainedBindings.generationManifest.path, role: 'sourceGenerationManifest'},
      {fileSha256: retainedBindings.validationReport.fileSha256, path: retainedBindings.validationReport.path, role: 'sourceValidationReport'},
    ],
    evidence: {
      artifactId: evidence.artifactId,
      boundaryCandidatesCanonicalSha256: evidence.boundaryCandidatesCanonicalSha256,
      canonicalSha256: canonicalSha256(evidence),
      sourceAtomMembershipCanonicalSha256: evidence.sourceAtomMembershipCanonicalSha256,
    },
    runtimeBinding: makeReportRuntime(evidenceRuntime),
    checkReport: {
      artifactId: evidence.artifactId,
      checks: CHECK_NAMES.map(name => ({name, status: 'passed', violationCodes: []})),
      observedProjection,
      schemaVersion: 'presentation-segmenter-boundary-check-report-v001',
      status: 'passed',
      violations: [],
    },
    observedProjection,
  };
  const evidenceBinding = jsonBinding(
    evidence.schemaVersion,
    `${basePath}/boundary-evidence.json`,
    evidence,
  );
  const preflightReportBinding = jsonBinding(
    preflightReport.schemaVersion,
    `${basePath}/boundary-preflight-report.json`,
    preflightReport,
  );
  return {
    sourceMediaId,
    sourceMedia,
    retained,
    generationManifest,
    validationReport,
    evidence,
    preflightReport,
    evidenceBinding,
    preflightReportBinding,
  };
};

const refreshSource = source => {
  const bindings = source.sourceMedia.retainedSourceAtomsBinding;
  bindings.sourceAtoms = jsonBinding(
    source.retained.schemaVersion,
    bindings.sourceAtoms.path,
    source.retained,
  );
  bindings.generationManifest = jsonBinding(
    source.generationManifest.schemaVersion,
    bindings.generationManifest.path,
    source.generationManifest,
  );
  bindings.validationReport = jsonBinding(
    source.validationReport.schemaVersion,
    bindings.validationReport.path,
    source.validationReport,
  );
  source.evidence.sourceBinding = {
    sourceArtifactId: source.retained.artifactId,
    sourceArtifactPath: bindings.sourceAtoms.path,
    sourceArtifactFileSha256: bindings.sourceAtoms.fileSha256,
    sourceArtifactCanonicalSha256: bindings.sourceAtoms.canonicalSha256,
    sourceRef: source.retained.sourceRef,
    sourceProvenance: source.retained.sourceProvenance,
    atomGranularity: source.retained.atomGranularity,
    rawSourceAtomsCanonicalSha256: source.retained.rawSourceAtomsCanonicalSha256,
  };
  source.evidence.boundaryCandidatesCanonicalSha256 =
    canonicalSha256(source.evidence.boundaryCandidates);
  source.evidence.sourceAtomMembershipCanonicalSha256 = canonicalSha256(
    source.evidence.boundaryCandidates.map(({boundaryCandidateId, sourceAtomIds}) => ({
      boundaryCandidateId,
      sourceAtomIds,
    })),
  );
  source.preflightReport.inputs = [
    {fileSha256: bindings.sourceAtoms.fileSha256, path: bindings.sourceAtoms.path, role: 'sourceAtoms'},
    {fileSha256: bindings.generationManifest.fileSha256, path: bindings.generationManifest.path, role: 'sourceGenerationManifest'},
    {fileSha256: bindings.validationReport.fileSha256, path: bindings.validationReport.path, role: 'sourceValidationReport'},
  ];
  source.preflightReport.evidence = {
    artifactId: source.evidence.artifactId,
    boundaryCandidatesCanonicalSha256: source.evidence.boundaryCandidatesCanonicalSha256,
    canonicalSha256: canonicalSha256(source.evidence),
    sourceAtomMembershipCanonicalSha256:
      source.evidence.sourceAtomMembershipCanonicalSha256,
  };
  source.evidenceBinding = jsonBinding(
    source.evidence.schemaVersion,
    source.evidenceBinding.path,
    source.evidence,
  );
  source.preflightReportBinding = jsonBinding(
    source.preflightReport.schemaVersion,
    source.preflightReportBinding.path,
    source.preflightReport,
  );
};

const makeTimelineDecision = (sources, segmentRefs) => {
  const sourceMedia = sources.map(source => source.sourceMedia);
  const segments = segmentRefs.map((entry, index) => ({
    segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
    ordinal: index + 1,
    sourceMediaId: sources[entry.sourceIndex - 1].sourceMediaId,
    sourceStartMs: entry.sourceStartMs,
    sourceEndMs: entry.sourceEndMs,
  }));
  return {
    schemaVersion: 'zev-timeline-composition-decision-v001',
    decisionId: 'inline-meaning-timeline-v001',
    sourceMedia,
    segments,
    decisionProvenance: {
      inputDecisionBinding: {
        schemaVersion: 'zev-timeline-composition-decision-job-v001',
        path: 'fixtures/meaning-boundary/timeline-job.json',
        fileSha256: H('d'),
        canonicalSha256: H('e'),
      },
      recordedBy: 'human',
      recordedAt: '2026-08-03T00:00:00Z',
    },
  };
};

const makeImplementationBindings = (hashes = IMPLEMENTATION_SPECS.map((_, index) =>
  H(String(index + 1)))) => IMPLEMENTATION_SPECS.map((spec, index) => ({
  path: spec.path,
  fileSha256: hashes[index],
  role: spec.role,
}));

const makeJob = ({sources, timelineDecision, jobId = 'inline-meaning-boundary-job-v001', implementationBindings}) => {
  const timelineBinding = jsonBinding(
    timelineDecision.schemaVersion,
    'fixtures/meaning-boundary/timeline-decision.json',
    timelineDecision,
  );
  return {
    schemaVersion: PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_JOB_SCHEMA_V001,
    jobId,
    packageId: `${jobId}-package`,
    timelineCompositionDecisionBinding: timelineBinding,
    segmenterSourceBindings: sources.map(source => ({
      sourceMediaId: source.sourceMediaId,
      preflightReportBinding: source.preflightReportBinding,
      evidenceBinding: source.evidenceBinding,
    })),
    outputPath:
      `evals/clip_composition/outputs/presentation/meaning-boundary-source-packages/${jobId}/meaning-boundary-source-package.json`,
    implementationBindings: implementationBindings ?? makeImplementationBindings(),
    approvedContractBindings: clone(CONTRACT_BINDINGS),
  };
};

const makeBuildInputs = ({sources, segmentRefs, jobId}) => {
  const timelineDecision = makeTimelineDecision(sources, segmentRefs);
  assert.equal(validatePresentationTimelineCompositionDecisionV001(timelineDecision), true);
  const job = makeJob({sources, timelineDecision, jobId});
  const jobBinding = jsonBinding(
    job.schemaVersion,
    `fixtures/meaning-boundary/${job.jobId}.json`,
    job,
  );
  return {
    job,
    jobBinding,
    timelineDecision,
    segmenterSources: sources.map(source => ({
      sourceMediaId: source.sourceMediaId,
      preflightReportBinding: source.preflightReportBinding,
      evidenceBinding: source.evidenceBinding,
      preflightReport: source.preflightReport,
      evidence: source.evidence,
      retainedSourceAtoms: source.retained,
    })),
  };
};

const defaultSource = () => makeSource(1, [{
  sourceTimelineSegmentId: 'source-segment-alpha',
  sourceStartMs: 100,
  sourceEndMs: 300,
  atoms: [
    {text: 'あ', speechId: 1, startMs: 100, endMs: 180},
    {text: 'い', speechId: 2, startMs: 200, endMs: 280},
  ],
}]);

const buildDefaultPackage = () => {
  const source = defaultSource();
  const inputs = makeBuildInputs({
    sources: [source],
    segmentRefs: [{sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300}],
    jobId: 'inline-default-boundary-job-v001',
  });
  return {source, inputs, packageValue: buildPresentationMeaningBoundarySourcePackageV001(inputs)};
};

const containsDisplayKey = value => {
  const forbidden = new Set([
    'lines', 'lineOrdinal', 'displayPage', 'logicalWidth', 'maxLogicalWidthPerLine',
    'maxLinesPerPage', 'characterWidthRule', 'format', 'screenLayoutId', 'presetId',
    'visualStateId', 'crop', 'cropDecision', 'viewports', 'fontSizePx', 'fontFamily',
    'safeAreaPx', 'position', 'transition', 'audioPolicy',
  ]);
  if (Array.isArray(value)) return value.some(containsDisplayKey);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    forbidden.has(key) || containsDisplayKey(child));
};

const writeJsonAt = async (workspaceRoot, bindingPath, value) => {
  const absolute = path.join(workspaceRoot, bindingPath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, formalBytes(value));
};

const listWorkspaceFiles = async (root, relativeRoot = '') => {
  const absoluteRoot = path.join(root, relativeRoot);
  const entries = await readdir(absoluteRoot, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const relativeEntry = relativeRoot === ''
      ? entry.name
      : `${relativeRoot}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await listWorkspaceFiles(root, relativeEntry));
    } else {
      files.push(relativeEntry);
    }
  }
  return files.sort();
};

const makeRunnerWorkspace = async ({
  sources,
  segmentRefs,
  jobId,
  mutateJob = () => {},
}) => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'zev-mbs-v001-'));
  const implementationHashes = [];
  for (const spec of IMPLEMENTATION_SPECS) {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, spec.path));
    implementationHashes.push(sha256(bytes));
    const target = path.join(workspaceRoot, spec.path);
    await mkdir(path.dirname(target), {recursive: true});
    await writeFile(target, bytes);
  }
  for (const binding of CONTRACT_BINDINGS) {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, binding.path));
    assert.equal(sha256(bytes), binding.fileSha256);
    const target = path.join(workspaceRoot, binding.path);
    await mkdir(path.dirname(target), {recursive: true});
    await writeFile(target, bytes);
  }
  const timelineDecision = makeTimelineDecision(sources, segmentRefs);
  const job = makeJob({
    sources,
    timelineDecision,
    jobId,
    implementationBindings: makeImplementationBindings(implementationHashes),
  });
  mutateJob(job);
  await writeJsonAt(
    workspaceRoot,
    job.timelineCompositionDecisionBinding.path,
    timelineDecision,
  );
  for (const source of sources) {
    await writeJsonAt(
      workspaceRoot,
      source.sourceMedia.retainedSourceAtomsBinding.sourceAtoms.path,
      source.retained,
    );
    await writeJsonAt(
      workspaceRoot,
      source.sourceMedia.retainedSourceAtomsBinding.generationManifest.path,
      source.generationManifest,
    );
    await writeJsonAt(
      workspaceRoot,
      source.sourceMedia.retainedSourceAtomsBinding.validationReport.path,
      source.validationReport,
    );
    await writeJsonAt(workspaceRoot, source.preflightReportBinding.path, source.preflightReport);
    await writeJsonAt(workspaceRoot, source.evidenceBinding.path, source.evidence);
    const siblingTrap = path.join(
      workspaceRoot,
      path.dirname(source.evidenceBinding.path),
      'unbound-sibling-must-not-be-read.json',
    );
    await writeFile(siblingTrap, '{not-json');
  }
  const jobPath =
    `evals/clip_composition/outputs/presentation/meaning-boundary-jobs/${jobId}/source-package-job.json`;
  await writeJsonAt(workspaceRoot, jobPath, job);
  return {
    workspaceRoot,
    jobPath,
    job,
    timelineDecision,
    cleanup: () => rm(workspaceRoot, {recursive: true, force: true}),
  };
};

const assertSingleViolation = (result, code, pointer, observedCodes) => {
  assert.equal(result.status, 'rejected');
  assert.deepEqual(result.violations, [{code, path: pointer, relatedIds: []}]);
  observedCodes.add(code);
};

test('MBS001: 単一sourceの二発話containerを直接bindingからB3へ変換する', async () => {
  const {packageValue} = buildDefaultPackage();
  assert.equal(validatePresentationMeaningBoundarySourcePackageV001(packageValue), true);
  assert.equal(packageValue.schemaVersion,
    PRESENTATION_MEANING_BOUNDARY_SOURCE_PACKAGE_SCHEMA_V001);
  assert.equal(packageValue.containers.length, 2);
  assert.equal(packageValue.candidateOccurrenceMap.length, 2);
  for (const row of packageValue.candidateOccurrenceMap) {
    assert.deepEqual(Object.keys(row), [
      'boundaryCandidateId',
      'timelineSegmentId',
      'sourceMediaId',
      'sourceGateAContainerId',
      'sourceGateABoundaryCandidateId',
      'atomRefs',
    ]);
  }

  const source = defaultSource();
  const workspace = await makeRunnerWorkspace({
    sources: [source],
    segmentRefs: [{sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300}],
    jobId: 'mbs001-cli-passed-v001',
  });
  try {
    const beforeImport = await listWorkspaceFiles(workspace.workspaceRoot);
    const importResult = spawnSync(process.execPath, [
      '--input-type=module',
      '--eval',
      `await import(${JSON.stringify(new URL(`file://${SOURCE_PACKAGE_CLI_PATH}`).href)})`,
    ], {cwd: workspace.workspaceRoot, encoding: null});
    assert.equal(importResult.status, 0);
    assert.equal(importResult.stdout.length, 0);
    assert.equal(importResult.stderr.length, 0);
    assert.deepEqual(await listWorkspaceFiles(workspace.workspaceRoot), beforeImport);

    const cli = spawnSync(process.execPath, [SOURCE_PACKAGE_CLI_PATH, workspace.jobPath], {
      cwd: workspace.workspaceRoot,
      encoding: null,
    });
    assert.equal(cli.status, 0);
    assert.equal(cli.stderr.length, 0);
    const decoded = JSON.parse(cli.stdout.toString('utf8'));
    assert.equal(validatePresentationMeaningBoundarySourcePackageV001(decoded), true);
    assert.equal(formalBytes(decoded).equals(cli.stdout), true);
  } finally {
    await workspace.cleanup();
  }
});

test('MBS002: 複数sourceをjob順に直接安定読取しtimeline初出順で全体再採番する', async () => {
  const source1 = makeSource(1, [{
    sourceTimelineSegmentId: 'source-one-segment',
    sourceStartMs: 100,
    sourceEndMs: 200,
    atoms: [{text: '甲', speechId: 1, startMs: 110, endMs: 180}],
  }]);
  const source2 = makeSource(2, [{
    sourceTimelineSegmentId: 'source-two-segment',
    sourceStartMs: 300,
    sourceEndMs: 400,
    atoms: [{text: '乙', speechId: 2, startMs: 310, endMs: 380}],
  }]);
  const workspace = await makeRunnerWorkspace({
    sources: [source1, source2],
    segmentRefs: [
      {sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 200},
      {sourceIndex: 2, sourceStartMs: 300, sourceEndMs: 400},
    ],
    jobId: 'mbs002-direct-read-v001',
  });
  try {
    const result = await runPresentationMeaningBoundarySourcePackageJobV001(workspace);
    assert.equal(result.status, 'passed');
    assert.deepEqual(
      result.sourcePackage.runtimeBinding.segmenterSources.map(({sourceMediaId}) => sourceMediaId),
      ['source-media-000001', 'source-media-000002'],
    );
    assert.deepEqual(
      result.sourcePackage.containers.map(({containerId}) => containerId),
      ['segmenter-container-000001', 'segmenter-container-000002'],
    );
    assert.deepEqual(
      result.sourcePackage.candidateOccurrenceMap.map(({boundaryCandidateId}) =>
        boundaryCandidateId),
      ['segmenter-boundary-000001', 'segmenter-boundary-000002'],
    );
  } finally {
    await workspace.cleanup();
  }
});

test('MBS003: 同一source区間を別timeline occurrenceとして保持する', () => {
  const source = defaultSource();
  const inputs = makeBuildInputs({
    sources: [source],
    segmentRefs: [
      {sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300},
      {sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300},
    ],
    jobId: 'mbs003-reused-occurrence-v001',
  });
  const value = buildPresentationMeaningBoundarySourcePackageV001(inputs);
  assert.equal(validatePresentationMeaningBoundarySourcePackageV001(value), true);
  assert.deepEqual(
    [...new Set(value.candidateOccurrenceMap.map(({timelineSegmentId}) => timelineSegmentId))],
    ['segment-0001', 'segment-0002'],
  );
  assert.equal(value.candidateOccurrenceMap[0].sourceGateABoundaryCandidateId,
    value.candidateOccurrenceMap[2].sourceGateABoundaryCandidateId);
  assert.notDeepEqual(value.candidateOccurrenceMap[0].atomRefs,
    value.candidateOccurrenceMap[2].atomRefs);
});

test('MBS004: source時刻が非単調なtimelineでも束縛済みevidenceを再計算しない', () => {
  const source = makeSource(1, [
    {
      sourceTimelineSegmentId: 'earlier-source-segment',
      sourceStartMs: 100,
      sourceEndMs: 200,
      atoms: [{text: '前', speechId: 1, startMs: 110, endMs: 180}],
    },
    {
      sourceTimelineSegmentId: 'later-source-segment',
      sourceStartMs: 300,
      sourceEndMs: 400,
      atoms: [{text: '後', speechId: 2, startMs: 310, endMs: 380}],
    },
  ]);
  const evidenceBefore = formalBytes(source.evidence);
  const inputs = makeBuildInputs({
    sources: [source],
    segmentRefs: [
      {sourceIndex: 1, sourceStartMs: 300, sourceEndMs: 400},
      {sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 200},
    ],
    jobId: 'mbs004-nonmonotonic-timeline-v001',
  });
  const value = buildPresentationMeaningBoundarySourcePackageV001(inputs);
  assert.deepEqual(value.containers.map(container => container.boundaryCandidates[0].text),
    ['後', '前']);
  assert.equal(formalBytes(source.evidence).equals(evidenceBefore), true);
});

const observedViolationCodes = new Set();

test('MBS005: MEANING_BOUNDARY_JOB_INVALIDをproduction runnerで発火する', async () => {
  const result = await runPresentationMeaningBoundarySourcePackageJobV001({
    workspaceRoot: os.tmpdir(),
    jobPath: 'not-a-formal-job-path.json',
  });
  assertSingleViolation(result, 'MEANING_BOUNDARY_JOB_INVALID', '/job', observedViolationCodes);
  const cli = spawnSync(process.execPath, [SOURCE_PACKAGE_CLI_PATH], {encoding: null});
  assert.equal(cli.status, 2);
  assert.deepEqual(cli.stdout, Buffer.from('{"status":"fatal","violations":[]}\n'));
  assert.equal(cli.stderr.length, 0);
});

test('MBS006: MEANING_BOUNDARY_INPUT_BINDING_MISMATCHをproduction runnerで発火する', async () => {
  const source = defaultSource();
  const workspace = await makeRunnerWorkspace({
    sources: [source],
    segmentRefs: [{sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300}],
    jobId: 'mbs006-input-binding-v001',
    mutateJob: job => { job.implementationBindings[0].fileSha256 = H('f'); },
  });
  try {
    const result = await runPresentationMeaningBoundarySourcePackageJobV001(workspace);
    assertSingleViolation(
      result,
      'MEANING_BOUNDARY_INPUT_BINDING_MISMATCH',
      '/job',
      observedViolationCodes,
    );
    const cli = spawnSync(process.execPath, [SOURCE_PACKAGE_CLI_PATH, workspace.jobPath], {
      cwd: workspace.workspaceRoot,
      encoding: null,
    });
    assert.equal(cli.status, 1);
    assert.equal(cli.stderr.length, 0);
    assert.deepEqual(cli.stdout, formalBytes({
      status: 'rejected',
      violations: [{
        code: 'MEANING_BOUNDARY_INPUT_BINDING_MISMATCH',
        path: '/job',
        relatedIds: [],
      }],
    }));
  } finally {
    await workspace.cleanup();
  }

  const rereadWorkspace = await makeRunnerWorkspace({
    sources: [defaultSource()],
    segmentRefs: [{sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300}],
    jobId: 'mbs006-prepublication-reread-v001',
  });
  try {
    const originalJobBytes = await readFile(
      path.join(rereadWorkspace.workspaceRoot, rereadWorkspace.jobPath),
    );
    const tracked = [{
      path: rereadWorkspace.jobPath,
      fileSha256: sha256(originalJobBytes),
      pointer: '/job',
    }];
    assert.deepEqual(
      await inspectPresentationMeaningBoundarySourceInputsBeforePublicationV001({
        workspaceRoot: rereadWorkspace.workspaceRoot,
        tracked,
      }),
      {status: 'passed'},
    );
    await writeFile(
      path.join(rereadWorkspace.workspaceRoot, rereadWorkspace.jobPath),
      Buffer.from('replaced-before-publication\n', 'utf8'),
    );
    assert.deepEqual(
      await inspectPresentationMeaningBoundarySourceInputsBeforePublicationV001({
        workspaceRoot: rereadWorkspace.workspaceRoot,
        tracked,
      }),
      {status: 'rejected', changed: tracked[0]},
    );
    await rm(path.join(rereadWorkspace.workspaceRoot, rereadWorkspace.jobPath));
    assert.deepEqual(
      await inspectPresentationMeaningBoundarySourceInputsBeforePublicationV001({
        workspaceRoot: rereadWorkspace.workspaceRoot,
        tracked,
      }),
      {status: 'rejected', changed: tracked[0]},
    );
  } finally {
    await rereadWorkspace.cleanup();
  }
});

test('MBS007: MEANING_BOUNDARY_RUNTIME_BINDING_MISMATCHをproduction runnerで発火する', async () => {
  const source = defaultSource();
  source.preflightReport.runtimeBinding.nodeVersion = 'v20.19.6-different';
  source.preflightReportBinding = jsonBinding(
    source.preflightReport.schemaVersion,
    source.preflightReportBinding.path,
    source.preflightReport,
  );
  const workspace = await makeRunnerWorkspace({
    sources: [source],
    segmentRefs: [{sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300}],
    jobId: 'mbs007-runtime-binding-v001',
  });
  try {
    const result = await runPresentationMeaningBoundarySourcePackageJobV001(workspace);
    assertSingleViolation(
      result,
      'MEANING_BOUNDARY_RUNTIME_BINDING_MISMATCH',
      '/runtimeBinding',
      observedViolationCodes,
    );
  } finally {
    await workspace.cleanup();
  }
});

test('MBS008: MEANING_BOUNDARY_SOURCE_PACKAGE_INVALIDをproduction inspectorで発火する', () => {
  const result = inspectPresentationMeaningBoundarySourcePackageV001({});
  assertSingleViolation(
    result,
    'MEANING_BOUNDARY_SOURCE_PACKAGE_INVALID',
    '/sourcePackage',
    observedViolationCodes,
  );
});

test('MBS009: MEANING_BOUNDARY_CONTAINER_ID_COLLISIONをproduction inspectorで発火する', () => {
  const {packageValue} = buildDefaultPackage();
  packageValue.containers[1].containerId = packageValue.containers[0].containerId;
  const result = inspectPresentationMeaningBoundarySourcePackageV001(packageValue);
  assertSingleViolation(
    result,
    'MEANING_BOUNDARY_CONTAINER_ID_COLLISION',
    '/containers',
    observedViolationCodes,
  );
});

test('MBS010: MEANING_BOUNDARY_CANDIDATE_ID_COLLISIONをproduction inspectorで発火する', () => {
  const {packageValue} = buildDefaultPackage();
  packageValue.containers[1].boundaryCandidates[0].boundaryCandidateId =
    packageValue.containers[0].boundaryCandidates[0].boundaryCandidateId;
  const result = inspectPresentationMeaningBoundarySourcePackageV001(packageValue);
  assertSingleViolation(
    result,
    'MEANING_BOUNDARY_CANDIDATE_ID_COLLISION',
    '/containers',
    observedViolationCodes,
  );
});

test('MBS011: MEANING_BOUNDARY_OCCURRENCE_MAPPING_MISMATCHをproduction runnerで発火する', async () => {
  const source = defaultSource();
  source.retained.selection.segments[0].atomIds.pop();
  source.retained.selection.segments[0].atomCount =
    source.retained.selection.segments[0].atomIds.length;
  source.retained.selection.segments[0].atomIdsCanonicalSha256 =
    canonicalSha256(source.retained.selection.segments[0].atomIds);
  refreshSource(source);
  const workspace = await makeRunnerWorkspace({
    sources: [source],
    segmentRefs: [{sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300}],
    jobId: 'mbs011-occurrence-mapping-v001',
  });
  try {
    const result = await runPresentationMeaningBoundarySourcePackageJobV001(workspace);
    assertSingleViolation(
      result,
      'MEANING_BOUNDARY_OCCURRENCE_MAPPING_MISMATCH',
      '/containers',
      observedViolationCodes,
    );
  } finally {
    await workspace.cleanup();
  }
});

test('MBS012: B3から表示keyと表示指示が0件である', () => {
  const {packageValue} = buildDefaultPackage();
  assert.equal(containsDisplayKey(packageValue), false);
  assert.equal(packageValue.taskDescription, PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001);
  assert.equal(/幅|行数|preset|crop|logicalWidth/u.test(packageValue.taskDescription), false);
});

test('MBS013: 同一入力からB3 formal byteを決定的に再構成する', () => {
  const source = defaultSource();
  const inputs = makeBuildInputs({
    sources: [source],
    segmentRefs: [{sourceIndex: 1, sourceStartMs: 100, sourceEndMs: 300}],
    jobId: 'mbs013-determinism-v001',
  });
  const first = buildPresentationMeaningBoundarySourcePackageV001(inputs);
  const second = buildPresentationMeaningBoundarySourcePackageV001(clone(inputs));
  assert.equal(formalBytes(first).equals(formalBytes(second)), true);
  assert.equal(canonicalSha256(first), canonicalSha256(second));
  assert.deepEqual(
    [...observedViolationCodes],
    [...PRESENTATION_MEANING_BOUNDARY_SOURCE_OWNED_VIOLATION_CODES_V001],
  );
});
