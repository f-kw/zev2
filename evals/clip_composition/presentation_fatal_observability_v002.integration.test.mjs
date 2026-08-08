import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  PRESENTATION_FATAL_INNER_CODES_V002,
  buildPresentationFatalObservationV002,
  serializePresentationFatalObservationV002,
  validatePresentationFatalObservationV002,
} from './presentation_fatal_observation_v002.mjs';
import {
  PRESENTATION_TIMELINE_COMPOSITION_DECISION_VIOLATION_CODES_V001,
  inspectPresentationTimelineInputsBeforePublicationV001,
  runPresentationTimelineCompositionDecisionCliV001,
  runPresentationTimelineCompositionDecisionV001,
  validatePresentationTimelineCompositionDecisionJobV001,
  writePresentationTimelineCompositionDecisionCliResultV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
  canonicalSha256PresentationMeaningInformationJsonV001,
  derivePresentationMeaningCaptionProjectionV001,
  derivePresentationMeaningSelectionProjectionV001,
  validatePresentationMeaningInformationPackageJobV001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001,
  PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001,
  PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001,
  PRESENTATION_OUTPUT_FORMAL_JOB_SCHEMA_V001,
  PRESENTATION_OUTPUT_REQUEST_SCHEMA_V001,
  validatePresentationOutputFormalJobV001,
} from './presentation_output_contract_v001.mjs';
import {
  derivePresentationCaptionEmbeddedGateAReportContextV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  runPresentationCaptionSemanticOutputCheckCliV002,
  runPresentationCaptionSemanticOutputCheckV002,
  validatePresentationCaptionSemanticOutputCheckJobV002,
  writePresentationCaptionSemanticOutputCheckCliResultV002,
} from './run_presentation_caption_semantic_output_check_v002.mjs';
import {
  buildPresentationMeaningBoundaryValidationReportV001,
  inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001,
  makePresentationMeaningBoundaryFatalCliResultV001,
  evaluatePresentationMeaningBoundarySelectionV001,
  runPresentationMeaningBoundarySelectionJobV001,
  runPresentationMeaningBoundarySelectionCliV001,
  validatePresentationMeaningBoundaryValidationReportV001,
  validatePresentationMeaningBoundaryValidationJobV001,
  writePresentationMeaningBoundarySelectionCliResultV001,
} from './presentation_meaning_boundary_selection_v001.mjs';
import {
  publishPresentationMeaningInformationFailureReportFileV002,
  publishPresentationMeaningInformationFailureV002,
  runPresentationMeaningInformationPackageJobV001,
  runPresentationMeaningInformationPackageJobCliV001,
  writePresentationMeaningInformationPackageCliResultV001,
} from './run_presentation_meaning_information_package_job_v001.mjs';
import {
  inspectPresentationOutputRenderFailureTargetV002,
  PRESENTATION_OUTPUT_RUNNER_OUTER_CODES_V001,
  publishPresentationOutputRenderFailureV002,
  runPresentationOutputJobV001,
  runPresentationOutputJobCliV001,
  writePresentationOutputJobCliResultV001,
} from './run_presentation_output_job_v001.ts';
import {
  runPresentationRendererChildProcessV001,
} from './render_presentation_v002.mjs';
import {
  evaluatePresentationRendererQcV002,
} from './presentation_renderer_qc_v002.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(HERE, '../..');
const H = 'a'.repeat(64);
const binding = (name = 'fixture') => ({
  path: `fixtures/${name}.json`,
  fileSha256: H,
});
const observation = (innerStage, innerCode, targetFile = null) =>
  buildPresentationFatalObservationV002({innerStage, targetFile, innerCode});
const assertValid = value => assert.equal(validatePresentationFatalObservationV002(value), true);
const git = args => execFileSync('git', args, {cwd: REPOSITORY_ROOT});
const sourcePath = fileName => path.join(HERE, fileName);
const readSource = fileName => readFile(sourcePath(fileName), 'utf8');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const jsonBinding = (name, schemaVersion = 'fixture-v001') => Object.freeze({
  schemaVersion,
  path: `fixtures/${name}.json`,
  fileSha256: H,
  canonicalSha256: H,
});

const withTemporaryWorkspace = async callback => {
  const logicalRoot = await mkdtemp(path.join(tmpdir(), 'fatal-observability-v002-'));
  const workspaceRoot = await realpath(logicalRoot);
  try {
    return await callback(workspaceRoot);
  } finally {
    await rm(logicalRoot, {recursive: true, force: true});
  }
};

const captureWriter = () => {
  const chunks = [];
  const write = chunk => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  };
  return Object.freeze({
    stream: Object.freeze({write}),
    write,
    bytes: () => Buffer.concat(chunks),
  });
};

const snapshotFileTree = async absoluteRoot => {
  const rows = [];
  const visit = async (absoluteDirectory, relativeDirectory = '') => {
    const entries = await readdir(absoluteDirectory, {withFileTypes: true});
    for (const entry of entries.sort((left, right) => Buffer.compare(
      Buffer.from(left.name, 'utf8'),
      Buffer.from(right.name, 'utf8'),
    ))) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) {
        rows.push(Object.freeze({path: relativePath, type: 'directory'}));
        await visit(absolutePath, relativePath);
      } else {
        rows.push(Object.freeze({
          path: relativePath,
          type: 'file',
          bytes: await readFile(absolutePath),
        }));
      }
    }
  };
  await visit(absoluteRoot);
  return rows;
};

const readJson = async relativePath => JSON.parse(
  await readFile(path.join(REPOSITORY_ROOT, relativePath), 'utf8'),
);

const writeWorkspaceBytes = async (workspaceRoot, relativePath, bytes) => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), {recursive: true});
  await writeFile(absolutePath, bytes);
};

const writeWorkspaceJson = (workspaceRoot, relativePath, value) => (
  writeWorkspaceBytes(workspaceRoot, relativePath, formalBytes(value))
);

const formalJsonBinding = (schemaVersion, bindingPath, value) => Object.freeze({
  schemaVersion,
  path: bindingPath,
  fileSha256: sha256(formalBytes(value)),
  canonicalSha256: canonicalSha256PresentationMeaningInformationJsonV001(value),
});

const captureRendererChildFailure = async ({
  innerStage,
  command = process.execPath,
  args,
  script,
}) => {
  try {
    await runPresentationRendererChildProcessV001(
      command,
      args ?? ['-e', script],
      {
        fatalInnerStage: innerStage,
      },
    );
  } catch (error) {
    return error;
  }
  assert.fail('renderer child process must fail');
};

const assertClosedChildFailure = (error, {innerStage, innerCode, rawMarkers = []}) => {
  assert.deepEqual(error?.presentationFatalProcessEvidence, {innerStage, innerCode});
  assert.equal(Object.prototype.propertyIsEnumerable.call(
    error,
    'presentationFatalProcessEvidence',
  ), false);
  for (const key of ['processResult', 'stdout', 'stderr', 'cause']) {
    assert.equal(Object.hasOwn(error, key), false);
  }
  const retained = `${String(error)}\n${JSON.stringify(error)}`;
  for (const marker of rawMarkers) assert.equal(retained.includes(marker), false);
};

const makeTimelinePassedFixtureV002 = async (
  workspaceRoot,
  {sourceScenario = 'passed'} = {},
) => {
  const retainedRoot = 'evals/clip_composition/outputs/presentation/retained-source-atoms/'
    + 'qdczJpv8RCc-candidate-59-v001';
  const retainedValues = {};
  const retainedSourceAtomsBinding = {};
  for (const [name, fileName] of [
    ['sourceAtoms', 'source-atoms.json'],
    ['generationManifest', 'generation-manifest.json'],
    ['validationReport', 'validation-report.json'],
  ]) {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, retainedRoot, fileName));
    const value = JSON.parse(bytes.toString('utf8'));
    const relativePath = `fixtures/fovb003/${fileName}`;
    retainedValues[name] = value;
    retainedSourceAtomsBinding[name] = {
      schemaVersion: value.schemaVersion,
      path: relativePath,
      fileSha256: sha256(bytes),
      canonicalSha256: canonicalSha256PresentationMeaningInformationJsonV001(value),
    };
    await writeWorkspaceBytes(workspaceRoot, relativePath, bytes);
  }
  const sourceRef = retainedValues.sourceAtoms.sourceRef;
  const retainedSegment = retainedValues.sourceAtoms.selection.segments[0];
  const mediaBytes = Buffer.from('fovb003-streaming-source-media\n', 'utf8');
  const mediaBinding = {
    path: 'fixtures/fovb003/source.mp4',
    fileSha256: sourceScenario === 'source-media-sha'
      ? 'f'.repeat(64)
      : sha256(mediaBytes),
  };
  await writeWorkspaceBytes(workspaceRoot, mediaBinding.path, mediaBytes);

  const supportBindings = {};
  for (const name of ['media-equivalence', 'stt-manifest', 'transcript', 'word-timestamps']) {
    const bytes = Buffer.from(`fovb003-${name}\n`, 'utf8');
    const binding = {
      path: `fixtures/fovb003/${name}.json`,
      fileSha256: sha256(bytes),
    };
    supportBindings[name] = binding;
    await writeWorkspaceBytes(workspaceRoot, binding.path, bytes);
  }

  const videoId = sourceRef.slice('youtube:'.length);
  const sourceIdentity = {
    schemaVersion: 'presentation-real-data-source-identity-v001',
    sourceIdentityId: 'fovb003-source-identity-v001',
    videoId,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    sourceProvenance: 'fatal observability v002 timeline fixture',
    sourceRef,
    executionMedia: mediaBinding,
    mediaEquivalence: supportBindings['media-equivalence'],
    stt: {
      manifest: supportBindings['stt-manifest'],
      transcript: supportBindings.transcript,
      wordTimestamps: supportBindings['word-timestamps'],
    },
  };
  const sourceIdentityBytes = sourceScenario === 'source-identity-invalid-json'
    ? Buffer.from('{"sourceIdentity":}\n', 'utf8')
    : formalBytes(sourceIdentity);
  const sourceIdentityBinding = {
    schemaVersion: sourceIdentity.schemaVersion,
    path: 'fixtures/fovb003/source-identity.json',
    fileSha256: sourceScenario === 'source-identity-file-sha'
      ? 'e'.repeat(64)
      : sha256(sourceIdentityBytes),
    canonicalSha256: sourceScenario === 'source-identity-canonical-sha'
      ? 'd'.repeat(64)
      : canonicalSha256PresentationMeaningInformationJsonV001(sourceIdentity),
  };
  await writeWorkspaceBytes(workspaceRoot, sourceIdentityBinding.path, sourceIdentityBytes);

  const implementationBindings = [];
  for (const [role, relativePath] of [
    ['timeline-decision', 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'],
    ['strict-json', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
    ['fatal-observation', 'evals/clip_composition/presentation_fatal_observation_v002.mjs'],
  ]) {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, relativePath));
    await writeWorkspaceBytes(workspaceRoot, relativePath, bytes);
    implementationBindings.push({path: relativePath, fileSha256: sha256(bytes), role});
  }
  const approvedContractBindings = [
    {
      path: 'evals/clip_composition/reports/presentation/'
        + 'presentation-meaning-information-package-contract-design-20260803-v001.md',
      fileSha256: 'a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de',
      role: 'meaning-package-contract',
    },
    {
      path: 'evals/clip_composition/reports/presentation/'
        + 'presentation-output-side-acceptance-contract-design-20260803-v001.md',
      fileSha256: 'c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de',
      role: 'output-side-contract',
    },
  ];
  for (const binding of approvedContractBindings) {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, binding.path));
    assert.equal(sha256(bytes), binding.fileSha256);
    await writeWorkspaceBytes(workspaceRoot, binding.path, bytes);
  }

  const jobId = 'fovb003-timeline-v001';
  const job = {
    schemaVersion: 'zev-timeline-composition-decision-job-v001',
    jobId,
    decisionId: `${jobId}-decision`,
    sourceMedia: [{
      sourceMediaId: 'source-media-000001',
      ordinal: 1,
      sourceRef,
      mediaBinding,
      sourceIdentityBinding,
      retainedSourceAtomsBinding,
    }],
    segments: [{
      segmentId: 'segment-0001',
      ordinal: 1,
      sourceMediaId: 'source-media-000001',
      sourceStartMs: retainedSegment.sourceStartMs,
      sourceEndMs: retainedSegment.sourceEndMs,
    }],
    recordedBy: 'human',
    recordedAt: '2026-08-07T00:00:00Z',
    outputPath: 'evals/clip_composition/outputs/presentation/meaning-timeline-decisions/'
      + `${jobId}/timeline-composition-decision.json`,
    implementationBindings,
    approvedContractBindings,
  };
  const jobPath = 'evals/clip_composition/outputs/presentation/'
    + `meaning-timeline-decision-jobs/${jobId}.json`;
  await writeWorkspaceBytes(workspaceRoot, jobPath, formalBytes(job));
  return {
    job,
    jobPath,
    outputPath: job.outputPath,
    retainedValues,
    sourceIdentity,
  };
};

const FOV_BOUNDARY_TASK =
  '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、発話の意味が自然に完結するまとまりの終端をmeaningGroupEndBoundaryCandidateIdで選んでください。最後のまとまりはcontainer最後の候補で終えてください。本文、候補ID、時刻、順序を変更しないでください。';
const FOV_B1_SUFFIX = '0123456789abcdef0123456789abcdef';
const FOV_B1_CHECK_NAMES = Object.freeze([
  'sourcePackageBinding',
  'responseEnvelope',
  'responseSchema',
  'containerBijection',
  'candidateResolution',
  'endMonotonicity',
  'containerFinalEnd',
  'candidateCoverage',
  'atomOccurrenceCoverage',
  'captionProjection',
]);

const makeMeaningSourcePackageFixtureV002 = ({
  timelineDecision,
  timelineBinding,
  retainedValues,
}) => {
  let candidateOrdinal = 0;
  const atomById = new Map(retainedValues.sourceAtoms.rawSourceAtoms.map(atom => [
    atom.atomId,
    atom,
  ]));
  const containers = timelineDecision.segments.map((segment, containerIndex) => {
    const boundaryCandidates = retainedValues.sourceAtoms.rawSourceAtoms.map(
      (atom, atomIndex) => {
        candidateOrdinal += 1;
        const atomRef = {
          timelineSegmentId: segment.segmentId,
          sourceMediaId: segment.sourceMediaId,
          atomId: atom.atomId,
        };
        return {
          boundaryCandidateId:
            `segmenter-boundary-${String(candidateOrdinal).padStart(6, '0')}`,
          ordinal: atomIndex + 1,
          atomRefs: [atomRef],
          text: atom.text,
          startAnchor: {atomRef, edge: 'start'},
          endAnchor: {atomRef, edge: 'end'},
          sourceStartMs: atom.startMs,
          sourceEndMs: atom.endMs,
          isWordLike: true,
        };
      },
    );
    return {
      containerId: `segmenter-container-${String(containerIndex + 1).padStart(6, '0')}`,
      ordinal: containerIndex + 1,
      sourceMediaId: segment.sourceMediaId,
      timelineSegmentId: segment.segmentId,
      boundaryCandidates,
    };
  });
  const candidateOccurrenceMap = containers.flatMap(container => (
    container.boundaryCandidates.map(candidate => ({
      boundaryCandidateId: candidate.boundaryCandidateId,
      timelineSegmentId: container.timelineSegmentId,
      sourceMediaId: container.sourceMediaId,
      sourceGateAContainerId: 'segmenter-container-000001',
      sourceGateABoundaryCandidateId: candidate.boundaryCandidateId,
      atomRefs: candidate.atomRefs,
    }))
  ));
  const sourcePackage = {
    schemaVersion: 'presentation-meaning-boundary-source-package-v001',
    packageId: 'fovf005-source-package-v001',
    timelineCompositionDecisionBinding: timelineBinding,
    runtimeBinding: {
      segmenterSources: [{
        sourceMediaId: timelineDecision.sourceMedia[0].sourceMediaId,
        preflightReportBinding: {
          schemaVersion: 'presentation-segmenter-boundary-preflight-report-v001',
          path: 'fixtures/fovf005/preflight.json',
          fileSha256: '5'.repeat(64),
          canonicalSha256: '6'.repeat(64),
        },
        evidenceBinding: {
          schemaVersion: 'presentation-segmenter-boundary-evidence-v001',
          path: 'fixtures/fovf005/evidence.json',
          fileSha256: '7'.repeat(64),
          canonicalSha256: '8'.repeat(64),
        },
        runtimeProjection: {
          nodeBinarySha256: '9'.repeat(64),
          nodeVersion: 'v20.19.6',
          icuVersion: '75.1',
          resolvedLocale: 'ja',
          resolvedGranularity: 'word',
        },
      }],
      strictJsonImplementationBinding: {
        path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
        fileSha256: '4'.repeat(64),
        role: 'strict-json',
      },
    },
    containers,
    candidateOccurrenceMap,
    taskDescription: FOV_BOUNDARY_TASK,
    provenance: {
      sourcePackageJobBinding: {
        schemaVersion: 'presentation-meaning-boundary-source-package-job-v001',
        path: 'fixtures/fovf005/source-package-job.json',
        fileSha256: 'e'.repeat(64),
        canonicalSha256: 'f'.repeat(64),
      },
      timelineCompositionDecisionBinding: timelineBinding,
      implementationBindings: [
        {
          path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
          fileSha256: '1'.repeat(64),
          role: 'meaning-source-package',
        },
        {
          path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
          fileSha256: '2'.repeat(64),
          role: 'gate-a-core',
        },
        {
          path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
          fileSha256: '3'.repeat(64),
          role: 'gate-a-preflight',
        },
        {
          path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
          fileSha256: '4'.repeat(64),
          role: 'strict-json',
        },
      ],
    },
  };
  const captions = containers.map((container, index) => {
    const atomRefs = container.boundaryCandidates.flatMap(candidate => candidate.atomRefs);
    const atoms = atomRefs.map(ref => atomById.get(ref.atomId));
    return {
      captionId: `caption-${String(index + 1).padStart(6, '0')}`,
      ordinal: index + 1,
      timelineSegmentId: container.timelineSegmentId,
      text: atoms.map(atom => atom.text).join(''),
      atomRefs,
      startAnchor: {atomRef: atomRefs[0], edge: 'start'},
      endAnchor: {atomRef: atomRefs.at(-1), edge: 'end'},
      sourceStartMs: atoms[0].startMs,
      sourceEndMs: atoms.at(-1).endMs,
    };
  });
  return {sourcePackage, captions};
};

const makeMeaningPackagePassedFixtureV002 = async workspaceRoot => {
  const timelineFixture = await makeTimelinePassedFixtureV002(workspaceRoot);
  const timelineResult = await runPresentationTimelineCompositionDecisionV001({
    workspaceRoot,
    jobPath: timelineFixture.jobPath,
  });
  assert.equal(timelineResult.status, 'passed');
  const timelineBinding = formalJsonBinding(
    timelineResult.decision.schemaVersion,
    timelineFixture.outputPath,
    timelineResult.decision,
  );
  const {sourcePackage, captions} = makeMeaningSourcePackageFixtureV002({
    timelineDecision: timelineResult.decision,
    timelineBinding,
    retainedValues: timelineFixture.retainedValues,
  });
  const fixtureRoot = 'fixtures/fovf005';
  const sourcePackageBinding = formalJsonBinding(
    sourcePackage.schemaVersion,
    `${fixtureRoot}/source-package.json`,
    sourcePackage,
  );
  const response = {
    status: 'complete',
    containers: sourcePackage.containers.map(container => ({
      containerId: container.containerId,
      meaningGroups: [{
        meaningGroupEndBoundaryCandidateId:
          container.boundaryCandidates.at(-1).boundaryCandidateId,
      }],
    })),
  };
  const semanticSelection = {
    schemaVersion: 'presentation-meaning-boundary-selection-v001',
    selectionId: `presentation-meaning-boundary-selection-${FOV_B1_SUFFIX}`,
    sourcePackageBinding,
    b6ManifestBinding: {
      schemaVersion: 'presentation-meaning-boundary-b6-manifest-v001',
      path: `${fixtureRoot}/b6-manifest.json`,
      fileSha256: 'a'.repeat(64),
      canonicalSha256: 'b'.repeat(64),
    },
    providerEnvelopeBinding: {
      schemaVersion: 'presentation-meaning-boundary-provider-response-envelope-v001',
      path: `${fixtureRoot}/provider-envelope.json`,
      fileSha256: 'c'.repeat(64),
      canonicalSha256: 'd'.repeat(64),
    },
    response,
  };
  const semanticSelectionBinding = formalJsonBinding(
    semanticSelection.schemaVersion,
    `${fixtureRoot}/semantic-selection.json`,
    semanticSelection,
  );
  const semanticValidation = {
    schemaVersion: 'presentation-caption-meaning-boundary-validation-report-v001',
    reportId: `presentation-meaning-boundary-validation-report-${FOV_B1_SUFFIX}`,
    status: 'passed',
    sourcePackageBinding,
    rawResponseBinding: {path: `${fixtureRoot}/raw-response.json`, fileSha256: 'e'.repeat(64)},
    selectionBinding: semanticSelectionBinding,
    checks: FOV_B1_CHECK_NAMES.map(name => ({
      name,
      status: 'passed',
      violationCodes: [],
    })),
    violations: [],
    selectionProjection: derivePresentationMeaningSelectionProjectionV001(response),
    captionProjection: derivePresentationMeaningCaptionProjectionV001(captions),
    implementationBindings: [
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
        fileSha256: '1'.repeat(64),
        role: 'meaning-selection',
      },
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
        fileSha256: '2'.repeat(64),
        role: 'meaning-source-package',
      },
      {
        path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
        fileSha256: '3'.repeat(64),
        role: 'strict-json-codec',
      },
      {
        path: 'evals/clip_composition/presentation_fatal_observation_v002.mjs',
        fileSha256: '4'.repeat(64),
        role: 'fatal-observation',
      },
    ],
  };
  const semanticValidationBinding = formalJsonBinding(
    semanticValidation.schemaVersion,
    `${fixtureRoot}/semantic-validation.json`,
    semanticValidation,
  );
  const jobId = 'fovf005-meaning-package-v001';
  const implementationBindings = [];
  for (const {path: implementationPath, role} of
    PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001) {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, implementationPath));
    await writeWorkspaceBytes(workspaceRoot, implementationPath, bytes);
    implementationBindings.push({
      path: implementationPath,
      fileSha256: sha256(bytes),
      role,
    });
  }
  for (const contractBinding of PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001) {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, contractBinding.path));
    assert.equal(sha256(bytes), contractBinding.fileSha256);
    await writeWorkspaceBytes(workspaceRoot, contractBinding.path, bytes);
  }
  const job = {
    schemaVersion: PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
    jobId,
    packageId: `${jobId}-meaning-information`,
    title: {text: '', inputMode: 'none'},
    timelineCompositionDecisionBinding: timelineBinding,
    semanticSelectionValidationBinding: semanticValidationBinding,
    semanticSelectionBinding,
    outputPath: 'evals/clip_composition/outputs/presentation/meaning-information-packages/'
      + `${jobId}-meaning-information/meaning-information-package.json`,
    implementationBindings,
    approvedContractBindings: structuredClone(
      PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001,
    ),
  };
  const jobPath = 'evals/clip_composition/outputs/presentation/meaning-information-jobs/'
    + `${jobId}.json`;
  await writeWorkspaceJson(workspaceRoot, sourcePackageBinding.path, sourcePackage);
  await writeWorkspaceJson(workspaceRoot, semanticSelectionBinding.path, semanticSelection);
  await writeWorkspaceJson(workspaceRoot, semanticValidationBinding.path, semanticValidation);
  await writeWorkspaceJson(workspaceRoot, jobPath, job);
  return {job, jobPath, timelineFixture};
};

const TIMELINE_REJECTION_SCENARIOS = Object.freeze([
  Object.freeze({
    sourceScenario: 'source-identity-file-sha',
    violationCode: 'SOURCE_IDENTITY_INVALID',
  }),
  Object.freeze({
    sourceScenario: 'source-identity-invalid-json',
    violationCode: 'SOURCE_IDENTITY_INVALID',
  }),
  Object.freeze({
    sourceScenario: 'source-identity-canonical-sha',
    violationCode: 'SOURCE_IDENTITY_INVALID',
  }),
  Object.freeze({
    sourceScenario: 'source-media-sha',
    violationCode: 'SOURCE_MEDIA_BINDING_MISMATCH',
  }),
]);

const runTimelineRejectionScenarioV002 = async ({sourceScenario, violationCode}) => (
  withTemporaryWorkspace(async workspaceRoot => {
    const fixture = await makeTimelinePassedFixtureV002(workspaceRoot, {sourceScenario});
    const result = await runPresentationTimelineCompositionDecisionV001({
      workspaceRoot,
      jobPath: fixture.jobPath,
    });
    assert.equal(result.status, 'rejected');
    assert.deepEqual(result.violations, [{
      code: violationCode,
      path: '/timelineDecision/sourceMedia',
      relatedIds: [],
    }]);
    const stdout = captureWriter();
    const exitCode = writePresentationTimelineCompositionDecisionCliResultV001(
      result,
      stdout.write,
    );
    assert.equal(exitCode, 1);
    assert.deepEqual(JSON.parse(stdout.bytes().toString('utf8')), {
      status: 'rejected',
      violations: [{
        code: violationCode,
        path: '/timelineDecision/sourceMedia',
        relatedIds: [],
      }],
    });
    assert.equal(Object.hasOwn(result, 'fatalObservation'), false);
    return Object.freeze({sourceScenario, violationCode, exitCode});
  })
);

const copyRepositoryBindingToWorkspaceV002 = async (workspaceRoot, bindingValue) => {
  const bytes = await readFile(path.join(REPOSITORY_ROOT, bindingValue.path));
  if (typeof bindingValue.fileSha256 === 'string') {
    assert.equal(sha256(bytes), bindingValue.fileSha256);
  }
  await writeWorkspaceBytes(workspaceRoot, bindingValue.path, bytes);
  return bytes;
};

const runMeaningBoundaryRejectedScenarioV002 = async () => (
  withTemporaryWorkspace(async workspaceRoot => {
    const job = await refreshFormalJob(
      'evals/clip_composition/outputs/presentation/meaning-boundary-validation-jobs/'
        + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-b1-v002.json',
    );
    job.implementationBindings = await ensureFatalBinding(
      job.implementationBindings,
      'meaning-boundary',
    );
    job.jobId = 'fov-meaning-boundary-rejected-v001';
    job.attemptId = 'attempt-0001';
    job.outputRoot = 'evals/clip_composition/outputs/presentation/meaning-boundary-validations/'
      + `${job.jobId}/${job.attemptId}`;
    const invalidB6Manifest = {
      schemaVersion: 'presentation-meaning-boundary-b6-manifest-v001',
    };
    job.b6ManifestBinding = formalJsonBinding(
      invalidB6Manifest.schemaVersion,
      'fixtures/fov-meaning-boundary-rejected-b6-manifest.json',
      invalidB6Manifest,
    );
    assert.equal(validatePresentationMeaningBoundaryValidationJobV001(job), true);
    const jobPath = 'evals/clip_composition/outputs/presentation/'
      + `meaning-boundary-validation-jobs/${job.jobId}.json`;
    for (const bindingValue of [
      ...job.implementationBindings,
      ...job.approvedContractBindings,
      job.sourcePackageBinding,
      job.providerEnvelopeBinding,
    ]) {
      await copyRepositoryBindingToWorkspaceV002(workspaceRoot, bindingValue);
    }
    await writeWorkspaceJson(workspaceRoot, job.b6ManifestBinding.path, invalidB6Manifest);
    await writeWorkspaceJson(workspaceRoot, jobPath, job);
    const result = await runPresentationMeaningBoundarySelectionJobV001({
      workspaceRoot,
      jobPath,
    });
    assert.equal(result.status, 'rejected');
    assert.deepEqual(result.evaluation.violations, [{
      code: 'MEANING_BOUNDARY_RESPONSE_INVALID',
      path: '/providerEnvelopeBinding',
      relatedIds: [],
    }]);
    assert.deepEqual(result.report.violations, result.evaluation.violations);
    assert.equal(Object.hasOwn(result, 'fatalObservation'), false);
    const stdout = captureWriter();
    const exitCode = writePresentationMeaningBoundarySelectionCliResultV001(
      result,
      stdout.write,
    );
    assert.equal(exitCode, 1);
    assert.deepEqual(stdout.bytes(), formalBytes(result.report));
    return Object.freeze({
      status: result.status,
      exitCode,
      code: result.report.violations[0].code,
      path: result.report.violations[0].path,
    });
  })
);

const runMeaningPackageRejectedScenarioV002 = async () => (
  withTemporaryWorkspace(async workspaceRoot => {
    const fixture = await makeMeaningPackagePassedFixtureV002(workspaceRoot);
    const rejectedJob = structuredClone(fixture.job);
    rejectedJob.title = {text: 'invalid-title', inputMode: 'none'};
    assert.equal(validatePresentationMeaningInformationPackageJobV001(rejectedJob), false);
    await writeWorkspaceJson(workspaceRoot, fixture.jobPath, rejectedJob);
    const result = await runPresentationMeaningInformationPackageJobV001({
      workspaceRoot,
      jobPath: fixture.jobPath,
      executedAt: '2026-08-07T00:00:00Z',
    });
    assert.equal(result.status, 'rejected');
    assert.equal(result.exitCode, 1);
    assert.deepEqual(result.failureReport.violations, [{
      code: 'MEANING_JOB_INVALID',
      path: '/job',
      relatedIds: [],
    }]);
    assert.equal(result.failureReport.fatalObservation, null);
    const stdout = captureWriter();
    assert.equal(writePresentationMeaningInformationPackageCliResultV001(
      result,
      stdout.write,
    ), 1);
    assert.deepEqual(stdout.bytes(), result.bytes);
    assert.deepEqual(JSON.parse(stdout.bytes().toString('utf8')), result.failureReport);
    return Object.freeze({
      status: result.status,
      exitCode: result.exitCode,
      code: result.failureReport.violations[0].code,
      path: result.failureReport.violations[0].path,
    });
  })
);

const OUTPUT_RUNTIME_PROFILE_REPORT_PATH_V002 =
  'evals/clip_composition/registries/presentation/'
  + 'vertical-short-preset-registry-v001/preset-finalization-report.json';
const OUTPUT_RUNTIME_TRUST_PATH_V002 =
  'evals/clip_composition/registries/presentation/'
  + 'presentation-vertical-renderer-trust-v001/trust.json';

const runOutputRejectedScenarioV002 = async () => (
  withTemporaryWorkspace(async workspaceRoot => {
    const requestId = 'fov-output-rejected-v001';
    const outputId = `${requestId}-output`;
    const controlOutputRoot = 'evals/clip_composition/outputs/presentation/'
      + `meaning-output-control/${requestId}`;
    const renderOutputRoot = 'evals/clip_composition/outputs/presentation/'
      + `meaning-output-renders/${outputId}`;
    const request = {
      schemaVersion: PRESENTATION_OUTPUT_REQUEST_SCHEMA_V001,
      requestId,
      publication: {outputId, controlRoot: controlOutputRoot, renderOutputRoot},
    };
    const requestPath = 'evals/clip_composition/outputs/presentation/'
      + `meaning-output-jobs/${requestId}/output-request.json`;
    const requestBinding = formalJsonBinding(
      PRESENTATION_OUTPUT_REQUEST_SCHEMA_V001,
      requestPath,
      request,
    );
    const implementationBindings = [];
    for (const {path: implementationPath, role} of
      PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, implementationPath));
      await writeWorkspaceBytes(workspaceRoot, implementationPath, bytes);
      implementationBindings.push({
        path: implementationPath,
        fileSha256: sha256(bytes),
        role,
      });
    }
    for (const contractBinding of PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001) {
      await copyRepositoryBindingToWorkspaceV002(workspaceRoot, contractBinding);
    }
    const runtimeProfileReport = await readJson(OUTPUT_RUNTIME_PROFILE_REPORT_PATH_V002);
    for (const profilePath of [
      OUTPUT_RUNTIME_PROFILE_REPORT_PATH_V002,
      OUTPUT_RUNTIME_TRUST_PATH_V002,
    ]) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, profilePath));
      await writeWorkspaceBytes(workspaceRoot, profilePath, bytes);
    }
    const job = {
      schemaVersion: PRESENTATION_OUTPUT_FORMAL_JOB_SCHEMA_V001,
      jobId: `${requestId}-formal-output`,
      requestBinding,
      runtimeProfile: structuredClone(runtimeProfileReport.runtimeProfile),
      implementationBindings,
      approvedContractBindings: structuredClone(
        PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001,
      ),
      controlOutputRoot,
      renderOutputRoot,
      expectedOutputId: outputId,
      executionPolicy: {
        oneShot: true,
        allowRetry: false,
        allowLegacyArtifacts: false,
      },
    };
    assert.equal(validatePresentationOutputFormalJobV001(job), true);
    const jobPath = `${path.posix.dirname(requestPath)}/formal-output-job.json`;
    await writeWorkspaceJson(workspaceRoot, requestPath, request);
    await writeWorkspaceJson(workspaceRoot, jobPath, job);
    const result = await runPresentationOutputJobV001({workspaceRoot, jobPath});
    assert.equal(result.status, 'rejected');
    assert.equal(result.exitCode, 1);
    assert.deepEqual(result.report.violations, [{
      code: 'OUTPUT_REQUEST_INVALID',
      path: '',
      relatedIds: [],
    }]);
    assert.deepEqual(result.bytes, formalBytes(result.report));
    assert.equal(Object.hasOwn(result, 'fatalObservation'), false);
    const stdout = captureWriter();
    const stderr = captureWriter();
    assert.equal(writePresentationOutputJobCliResultV001(result, {
      stdout: stdout.write,
      stderr: stderr.write,
    }), 1);
    assert.deepEqual(stdout.bytes(), result.bytes);
    assert.equal(stderr.bytes().length, 0);
    const publishedControlRoot = path.join(workspaceRoot, controlOutputRoot);
    assert.deepEqual((await readdir(publishedControlRoot)).sort(), [
      'output-acceptance-report.json',
      'output-request.json',
    ]);
    assert.deepEqual(
      await readFile(path.join(publishedControlRoot, 'output-acceptance-report.json')),
      result.bytes,
    );
    return Object.freeze({
      status: result.status,
      exitCode: result.exitCode,
      code: result.report.violations[0].code,
      path: result.report.violations[0].path,
    });
  })
);

const refreshBindings = async bindings => Promise.all(bindings.map(async item => ({
  ...item,
  fileSha256: sha256(await readFile(path.join(REPOSITORY_ROOT, item.path))),
})));

const refreshFormalJob = async relativePath => {
  const value = structuredClone(await readJson(relativePath));
  if (Array.isArray(value.implementationBindings)) {
    value.implementationBindings = await refreshBindings(value.implementationBindings);
  }
  if (value.implementationBinding) {
    value.implementationBinding.files = await refreshBindings(
      value.implementationBinding.files,
    );
    value.implementationBinding.dependencyFiles = await refreshBindings(
      value.implementationBinding.dependencyFiles,
    );
  }
  return value;
};

const FATAL_OBSERVATION_IMPLEMENTATION_BINDING = Object.freeze({
  path: 'evals/clip_composition/presentation_fatal_observation_v002.mjs',
  fileSha256: H,
  role: 'fatal-observation',
});
const FATAL_OBSERVATION_LEGACY_B1_BINDING = Object.freeze({
  role: 'fatal-observation',
  path: 'evals/clip_composition/presentation_fatal_observation_v002.mjs',
  fileSha256: H,
});
const FATAL_OBSERVATION_FIXTURE_BINDING_PROFILE_BY_BOUNDARY = Object.freeze({
  timeline: 'implementation-binding',
  'legacy-b1': 'legacy-b1-binding',
  'meaning-boundary': 'implementation-binding',
  'meaning-package': 'implementation-binding',
  output: 'implementation-binding',
});
const fatalObservationFixtureBindingForBoundary = boundary => {
  const profile = FATAL_OBSERVATION_FIXTURE_BINDING_PROFILE_BY_BOUNDARY[boundary];
  if (profile === 'legacy-b1-binding') return FATAL_OBSERVATION_LEGACY_B1_BINDING;
  if (profile === 'implementation-binding') return FATAL_OBSERVATION_IMPLEMENTATION_BINDING;
  throw new TypeError('fatal-observation-fixture-boundary-invalid');
};
const ensureFatalBinding = async (bindings, boundary) => {
  const fatalBinding = fatalObservationFixtureBindingForBoundary(boundary);
  return refreshBindings([
    ...bindings.filter(item => item.role !== fatalBinding.role),
    fatalBinding,
  ]);
};

const makeMeaningFailureInput = ({workspaceRoot, pathJobId}) => {
  const jobBytes = Buffer.from('{"fixture":"fatal-observability-v002"}\n', 'utf8');
  return Object.freeze({
    workspaceRoot,
    pathJobId,
    jobPath: 'evals/clip_composition/outputs/presentation/meaning-information-jobs/'
      + `${pathJobId}.json`,
    jobBytes,
    jobValue: null,
    status: 'fatal',
    stage: 'input-read',
    fatalObservation: observation('unknown', 'UNCLASSIFIED'),
    violations: [],
    executedAt: '2026-08-07T00:00:00Z',
  });
};

const makeOutputFailureInput = ({workspaceRoot, outputId, formalJobFileSha256 = H}) => ({
  workspaceRoot,
  request: {publication: {outputId}},
  job: {},
  formalJobFileSha256,
  formalOutputJobBinding: jsonBinding(`${outputId}-job`),
  controlRequestBinding: jsonBinding(`${outputId}-request`),
  acceptanceReportBinding: jsonBinding(`${outputId}-acceptance`),
  renderPlanBinding: jsonBinding(`${outputId}-plan`),
  observation: {
    status: 'fatal',
    stage: 'overlay-render',
    failureObservation: {
      source: 'common-draw-core',
      coreStage: 'overlay-render',
      violations: [],
      diagnosticCode: 'OUTPUT_RENDER_CORE_PROCESS_FAILED',
    },
    fatalObservation: observation('overlay-render', 'CHILD_PROCESS_EXIT_NONZERO'),
  },
  safetyArtifacts: [],
});

const BANNED_KEYS = Object.freeze([
  'message',
  'stack',
  'stdout',
  'stderr',
  'text',
  'apiKey',
]);

test('FOVI001: TSX権限拒否は生messageなしの閉じた観測になる', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const deniedExecutable = path.join(workspaceRoot, 'tsx-v001');
    await writeFile(deniedExecutable, Buffer.from('#!/bin/sh\nexit 0\n', 'utf8'));
    await chmod(deniedExecutable, 0o000);
    const error = await captureRendererChildFailure({
      command: deniedExecutable,
      args: [],
      innerStage: 'runner-bootstrap',
    });
    assertClosedChildFailure(error, {
      innerStage: 'runner-bootstrap',
      innerCode: 'OS_PERMISSION_DENIED',
    });
  });
  const value = observation('runner-bootstrap', 'OS_PERMISSION_DENIED');
  assertValid(value);
  const bytes = serializePresentationFatalObservationV002(value).toString('utf8');
  for (const key of BANNED_KEYS) assert.equal(bytes.includes(`"${key}"`), false);
});

test('FOVI002: 配置小数token拒否はlayout段階として別attemptへ写せる', async () => {
  const stdoutMarker = 'FOVI002_RAW_LAYOUT_STDOUT';
  const stderrMarker = 'FOVI002_RAW_LAYOUT_STDERR';
  const error = await captureRendererChildFailure({
    innerStage: 'layout-preflight',
    script: `process.stdout.write(${JSON.stringify(stdoutMarker)});`
      + `process.stderr.write(${JSON.stringify(stderrMarker)});process.exit(1);`,
  });
  assertClosedChildFailure(error, {
    innerStage: 'layout-preflight',
    innerCode: 'CHILD_PROCESS_EXIT_NONZERO',
    rawMarkers: [stdoutMarker, stderrMarker],
  });
  const value = observation('layout-preflight', 'NUMERIC_TOKEN_INVALID');
  assertValid(value);
  assert.equal(value.innerStage, 'layout-preflight');
});

test('FOVI003: Gate A拒否はfatal専用語彙へ混入しない', () => {
  const gateAContext = derivePresentationCaptionEmbeddedGateAReportContextV001({});
  assert.deepEqual(gateAContext, {status: 'context-invalid'});
  assert.equal(Object.hasOwn(gateAContext, 'fatalObservation'), false);
  assert.equal(PRESENTATION_FATAL_INNER_CODES_V002.includes('GATE_A_CONTEXT_INVALID'), false);
});

test('FOVI004: byte列型喪失はmemory対象を捏造せずnullで写す', async () => {
  const error = await captureRendererChildFailure({
    innerStage: 'semantic-rebuild',
    script: 'process.exit(1);',
  });
  assertClosedChildFailure(error, {
    innerStage: 'semantic-rebuild',
    innerCode: 'CHILD_PROCESS_EXIT_NONZERO',
  });
  const value = observation('semantic-rebuild', 'FORMAL_JSON_VALUE_INVALID');
  assertValid(value);
  assert.equal(value.targetFile, null);
});

test('FOVI005: SHA参照不一致は一意な受理済みbindingだけを対象にする', async () => {
  const error = await captureRendererChildFailure({
    innerStage: 'semantic-rebuild',
    script: 'process.kill(process.pid, "SIGTERM");',
  });
  assertClosedChildFailure(error, {
    innerStage: 'semantic-rebuild',
    innerCode: 'CHILD_PROCESS_SIGNALLED',
  });
  const value = observation(
    'semantic-rebuild',
    'BINDING_REFERENCE_MISMATCH',
    binding('semantic-input'),
  );
  assertValid(value);
  assert.deepEqual(value.targetFile, binding('semantic-input'));
});

test('FOVI006: export欠落はcrop検査段階の安全な観測へ写せる', async () => {
  const error = await captureRendererChildFailure({
    innerStage: 'crop-frame-inspection',
    script: 'process.exit(1);',
  });
  assertClosedChildFailure(error, {
    innerStage: 'crop-frame-inspection',
    innerCode: 'CHILD_PROCESS_EXIT_NONZERO',
  });
  const value = observation('crop-frame-inspection', 'REQUIRED_EXPORT_MISSING');
  assertValid(value);
  assert.equal(value.innerCode, 'REQUIRED_EXPORT_MISSING');
});

test('FOVI007: 描画指示欠落はQC失敗のままfatal専用語彙へ混入しない', () => {
  const qc = evaluatePresentationRendererQcV002({
    plan: {elements: [{instructionId: 'instruction-000001'}]},
    applicationResults: [],
    overlayInspections: [],
    mediaInspection: {
      video: {width: 1920, height: 1080, fps: 30, frameCount: 1},
      audio: null,
      durationMs: 34,
    },
    expectedAudio: {present: false},
    expectedFrameCount: 1,
    canvas: {
      width: 1920,
      height: 1080,
      fps: 30,
      safeAreaPx: {left: 0, top: 0, right: 0, bottom: 0},
    },
  });
  assert.equal(qc.status, 'failed');
  assert.deepEqual([...new Set(qc.violations.map(item => item.code))], [
    'INSTRUCTION_RENDER_MISSING',
  ]);
  assert.equal(qc.violations.length > 0, true);
  assert.equal(qc.violations.every(item => item.code === 'INSTRUCTION_RENDER_MISSING'), true);
  assert.equal(Object.hasOwn(qc, 'fatalObservation'), false);
  assert.equal(PRESENTATION_FATAL_INNER_CODES_V002.includes('INSTRUCTION_RENDER_MISSING'), false);
});

test('FOVI008: timelineと意味packageの大容量読取は別reportで保持できる', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const fixture = await makeTimelinePassedFixtureV002(workspaceRoot);
    const mediaPath = path.join(workspaceRoot, fixture.sourceIdentity.executionMedia.path);
    await chmod(mediaPath, 0o000);
    const result = await runPresentationTimelineCompositionDecisionV001({
      workspaceRoot,
      jobPath: fixture.jobPath,
    });
    assert.equal(result.status, 'fatal');
    assert.deepEqual(result.fatalObservation, observation(
      'source-media-read',
      'OS_PERMISSION_DENIED',
      fixture.sourceIdentity.executionMedia,
    ));
  });
  await withTemporaryWorkspace(async workspaceRoot => {
    const fixture = await makeMeaningPackagePassedFixtureV002(workspaceRoot);
    const mediaBinding = fixture.timelineFixture.sourceIdentity.executionMedia;
    await chmod(path.join(workspaceRoot, mediaBinding.path), 0o000);
    const result = await runPresentationMeaningInformationPackageJobV001({
      workspaceRoot,
      jobPath: fixture.jobPath,
      executedAt: '2026-08-07T00:00:00Z',
    });
    assert.equal(result.status, 'fatal');
    assert.deepEqual(result.failureReport?.fatalObservation, observation(
      'source-media-read',
      'OS_PERMISSION_DENIED',
      mediaBinding,
    ));
  });
  const timeline = observation(
    'source-media-read',
    'ERR_FS_FILE_TOO_LARGE',
    binding('timeline-source-media'),
  );
  const meaning = observation(
    'source-media-read',
    'ERR_FS_FILE_TOO_LARGE',
    binding('meaning-source-media'),
  );
  assertValid(timeline);
  assertValid(meaning);
  assert.notDeepEqual(timeline.targetFile, meaning.targetFile);
});

test('FOVI009: child signalからOS権限原因を推測しない', async () => {
  const stdoutMarker = 'FOVI009_RAW_QC_STDOUT';
  const stderrMarker = 'FOVI009_RAW_QC_STDERR';
  const error = await captureRendererChildFailure({
    innerStage: 'post-render-qc',
    script: `process.stdout.write(${JSON.stringify(stdoutMarker)});`
      + `process.stderr.write(${JSON.stringify(stderrMarker)});`
      + 'process.kill(process.pid, "SIGTERM");',
  });
  assertClosedChildFailure(error, {
    innerStage: 'post-render-qc',
    innerCode: 'CHILD_PROCESS_SIGNALLED',
    rawMarkers: [stdoutMarker, stderrMarker],
  });
  const value = observation('post-render-qc', 'CHILD_PROCESS_SIGNALLED');
  assertValid(value);
  assert.equal(value.innerCode, 'CHILD_PROCESS_SIGNALLED');
  assert.equal(serializePresentationFatalObservationV002(value).includes('EPERM'), false);
});

test('FOVB001: timeline context前fatalはv002 envelopeを持つ', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    await assert.rejects(
      runPresentationTimelineCompositionDecisionV001({
        workspaceRoot,
        jobPath: 'evals/clip_composition/outputs/presentation/'
          + 'meaning-timeline-decision-jobs/fovb001.json',
      }),
      error => error?.fatalObservation?.schemaVersion
        === 'presentation-fatal-observation-v002',
    );
  });
  const stdout = captureWriter();
  const exitCode = await runPresentationTimelineCompositionDecisionCliV001([], {
    stdout: stdout.stream,
  });
  assert.equal(exitCode, 2);
  const value = JSON.parse(stdout.bytes().toString('utf8'));
  assert.equal(value.schemaVersion, 'zev-timeline-composition-failure-v002');
  assertValid(value.fatalObservation);
});

test('FOVB002: timeline context後fatalも共通fatalObservationを使用する', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const fixture = await makeTimelinePassedFixtureV002(workspaceRoot);
    assert.equal(validatePresentationTimelineCompositionDecisionJobV001(fixture.job), true);
    const result = await inspectPresentationTimelineInputsBeforePublicationV001({
      workspaceRoot,
      tracked: [{
        path: 'fixtures/fovb002.json',
        fileSha256: H,
        code: 'MEANING_JOB_BINDING_MISMATCH',
        pointer: '/job',
        sourceField: 'tracked-input',
      }],
    });
    assert.equal(result.status, 'fatal');
    assert.deepEqual(result.fatalObservation, observation('unknown', 'UNCLASSIFIED'));
    const stdout = captureWriter();
    const exitCode = writePresentationTimelineCompositionDecisionCliResultV001(
      result,
      stdout.write,
    );
    const value = JSON.parse(stdout.bytes().toString('utf8'));
    assert.equal(exitCode, 2);
    assert.equal(value.schemaVersion, 'zev-timeline-composition-failure-v002');
    assertValid(value.fatalObservation);
  });
});

test('FOVB003: timelineはF01を末尾束縛しfatal専用rootを新設しない', async () => {
  const job = await refreshFormalJob(
    'evals/clip_composition/outputs/presentation/meaning-timeline-decision-jobs/'
      + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-timeline-v002.json',
  );
  job.implementationBindings = await ensureFatalBinding(job.implementationBindings, 'timeline');
  assert.equal(validatePresentationTimelineCompositionDecisionJobV001(job), true);
  assert.deepEqual(FATAL_OBSERVATION_FIXTURE_BINDING_PROFILE_BY_BOUNDARY, {
    timeline: 'implementation-binding',
    'legacy-b1': 'legacy-b1-binding',
    'meaning-boundary': 'implementation-binding',
    'meaning-package': 'implementation-binding',
    output: 'implementation-binding',
  });
  assert.deepEqual(job.implementationBindings.at(-1), {
    ...FATAL_OBSERVATION_IMPLEMENTATION_BINDING,
    fileSha256: sha256(await readFile(path.join(
      REPOSITORY_ROOT,
      FATAL_OBSERVATION_IMPLEMENTATION_BINDING.path,
    ))),
  });
  const mixedTimelineJob = structuredClone(job);
  mixedTimelineJob.implementationBindings = await ensureFatalBinding(
    mixedTimelineJob.implementationBindings,
    'legacy-b1',
  );
  assert.equal(validatePresentationTimelineCompositionDecisionJobV001(mixedTimelineJob), false);
  await withTemporaryWorkspace(async workspaceRoot => {
    const fixture = await makeTimelinePassedFixtureV002(workspaceRoot);
    const before = await snapshotFileTree(workspaceRoot);
    const result = await runPresentationTimelineCompositionDecisionV001({
      workspaceRoot,
      jobPath: fixture.jobPath,
    });
    assert.equal(result.status, 'passed');
    const stdout = captureWriter();
    assert.equal(writePresentationTimelineCompositionDecisionCliResultV001(
      result,
      stdout.write,
    ), 0);
    assert.deepEqual(stdout.bytes(), result.bytes);
    assert.deepEqual(
      await readFile(path.join(workspaceRoot, fixture.outputPath)),
      result.bytes,
    );
    const after = await snapshotFileTree(workspaceRoot);
    const beforePaths = new Set(before.map(row => row.path));
    assert.deepEqual(after.filter(row => beforePaths.has(row.path)), before);
    const outputDirectory = path.posix.dirname(fixture.outputPath);
    assert.deepEqual(after.filter(row => !beforePaths.has(row.path)), [
      {
        path: path.posix.dirname(outputDirectory),
        type: 'directory',
      },
      {path: outputDirectory, type: 'directory'},
      {path: fixture.outputPath, type: 'file', bytes: result.bytes},
    ]);
  });
  await withTemporaryWorkspace(async workspaceRoot => {
    await mkdir(path.join(workspaceRoot, 'fixtures'), {recursive: true});
    const bytes = Buffer.from('timeline-observed\n', 'utf8');
    await writeFile(path.join(workspaceRoot, 'fixtures/fovb003.txt'), bytes);
    const tracked = [{
      path: 'fixtures/fovb003.txt',
      fileSha256: sha256(bytes),
      code: 'MEANING_JOB_BINDING_MISMATCH',
      pointer: '/job',
      sourceField: 'tracked-input',
    }];
    assert.equal((await inspectPresentationTimelineInputsBeforePublicationV001({
      workspaceRoot,
      tracked,
    })).status, 'passed');
    assert.equal((await inspectPresentationTimelineInputsBeforePublicationV001({
      workspaceRoot,
      tracked: [{...tracked[0], fileSha256: H}],
    })).status, 'rejected');
    assert.deepEqual((await readdir(workspaceRoot)).sort(), ['fixtures']);
  });
  await withTemporaryWorkspace(async workspaceRoot => {
    const jobPath = 'evals/clip_composition/outputs/presentation/'
      + 'meaning-timeline-decision-jobs/fovb003-invalid.json';
    await mkdir(path.dirname(path.join(workspaceRoot, jobPath)), {recursive: true});
    await writeFile(path.join(workspaceRoot, jobPath), Buffer.from('{}\n', 'utf8'));
    const result = await runPresentationTimelineCompositionDecisionV001({
      workspaceRoot,
      jobPath,
    });
    assert.equal(result.status, 'rejected');
    const stdout = captureWriter();
    const exitCode = writePresentationTimelineCompositionDecisionCliResultV001(
      result,
      stdout.write,
    );
    assert.equal(exitCode, 1);
    assert.equal(JSON.parse(stdout.bytes().toString('utf8')).status, 'rejected');
  });
  const rejectionResults = [];
  for (const scenario of TIMELINE_REJECTION_SCENARIOS) {
    rejectionResults.push(await runTimelineRejectionScenarioV002(scenario));
  }
  assert.deepEqual(rejectionResults, TIMELINE_REJECTION_SCENARIOS.map(scenario => ({
    ...scenario,
    exitCode: 1,
  })));
});

test('FOVB004: 旧B1 context前fatalはformal runner v002を使う', async () => {
  const stdout = captureWriter();
  const exitCode = await runPresentationCaptionSemanticOutputCheckCliV002([], {
    stdout: stdout.stream,
  });
  const value = JSON.parse(stdout.bytes().toString('utf8'));
  assert.equal(exitCode, 2);
  assert.equal(value.schemaVersion, 'presentation-formal-runner-fatal-v002');
  assertValid(value.fatalObservation);
  assert.equal(value.fatalObservation.targetFile, null);
});

test('FOVB005: 旧B1 context後fatalにもfatalObservationがある', async () => {
  const job = await refreshFormalJob(
    'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/'
      + 'qdczJpv8RCc-candidate-59-vertical-caption-b6-v002.json',
  );
  job.implementationBinding.dependencyFiles = await ensureFatalBinding(
    job.implementationBinding.dependencyFiles,
    'legacy-b1',
  );
  const denied = Object.assign(new Error('not retained'), {code: 'EACCES'});
  const result = await runPresentationCaptionSemanticOutputCheckV002(
    'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/'
      + 'fovb005.json',
    {
      repositoryRoot: REPOSITORY_ROOT,
      jobBytes: formalBytes(job),
      readFile: async () => { throw denied; },
    },
  );
  assert.equal(result.exitCode, 2);
  assert.equal(result.value.diagnosticCode, 'CAPTION_B1_V002_RUNNER_FATAL');
  assertValid(result.value.fatalObservation);
  assert.deepEqual(result.value.fatalObservation.targetFile, {
    path: job.implementationBinding.files[0].path,
    fileSha256: job.implementationBinding.files[0].fileSha256,
  });
  const stdout = captureWriter();
  assert.equal(writePresentationCaptionSemanticOutputCheckCliResultV002(
    result,
    stdout.write,
  ), 2);
  assert.deepEqual(JSON.parse(stdout.bytes().toString('utf8')), result.value);
});

test('FOVB006: 旧B1 fixtureだけがF01 dependencyを追加し既存statusを保つ', async () => {
  const jobPath = 'evals/clip_composition/outputs/presentation/'
    + 'caption-semantic-output-check-jobs/fovb006.json';
  const job = await refreshFormalJob(
    'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/'
      + 'qdczJpv8RCc-candidate-59-vertical-caption-b6-v002.json',
  );
  job.implementationBinding.dependencyFiles = await ensureFatalBinding(
    job.implementationBinding.dependencyFiles,
    'legacy-b1',
  );
  assert.equal(validatePresentationCaptionSemanticOutputCheckJobV002(job).status, 'passed');
  const mixedLegacyB1Job = structuredClone(job);
  mixedLegacyB1Job.implementationBinding.dependencyFiles = await ensureFatalBinding(
    mixedLegacyB1Job.implementationBinding.dependencyFiles,
    'timeline',
  );
  assert.equal(
    validatePresentationCaptionSemanticOutputCheckJobV002(mixedLegacyB1Job).status,
    'rejected',
  );
  const passed = await runPresentationCaptionSemanticOutputCheckV002(jobPath, {
    repositoryRoot: REPOSITORY_ROOT,
    jobBytes: formalBytes(job),
  });
  assert.equal(passed.exitCode, 0);
  assert.equal(passed.value.status, 'passed');
  assert.deepEqual(passed.value.violations, []);
  const passedStdout = captureWriter();
  assert.equal(writePresentationCaptionSemanticOutputCheckCliResultV002(
    passed,
    passedStdout.write,
  ), 0);
  assert.deepEqual(passedStdout.bytes(), formalBytes(passed.value));

  const rejectedJob = {...job, mode: 'write'};
  const rejected = await runPresentationCaptionSemanticOutputCheckV002(jobPath, {
    repositoryRoot: REPOSITORY_ROOT,
    jobBytes: formalBytes(rejectedJob),
  });
  assert.equal(rejected.exitCode, 1);
  assert.equal(rejected.value.status, 'rejected');
  assert.deepEqual(rejected.value.violations, [{
    code: 'CAPTION_B1_JOB_INVALID',
    path: '$.mode',
    details: {},
  }]);
  const rejectedStdout = captureWriter();
  assert.equal(writePresentationCaptionSemanticOutputCheckCliResultV002(
    rejected,
    rejectedStdout.write,
  ), 1);
  assert.deepEqual(rejectedStdout.bytes(), formalBytes(rejected.value));

  const abstainedBytes = Buffer.from('{"status":"abstained"}\n', 'utf8');
  const abstainedJob = structuredClone(job);
  abstainedJob.semanticOutputBinding.fileSha256 = sha256(abstainedBytes);
  const abstained = await runPresentationCaptionSemanticOutputCheckV002(jobPath, {
    repositoryRoot: REPOSITORY_ROOT,
    jobBytes: formalBytes(abstainedJob),
    readFile: async absolutePath => path.resolve(absolutePath)
      === path.join(REPOSITORY_ROOT, abstainedJob.semanticOutputBinding.path)
      ? abstainedBytes
      : readFile(absolutePath),
  });
  assert.equal(abstained.exitCode, 1);
  assert.equal(abstained.value.status, 'abstained');
  assert.deepEqual(abstained.value.violations, []);
  const abstainedStdout = captureWriter();
  assert.equal(writePresentationCaptionSemanticOutputCheckCliResultV002(
    abstained,
    abstainedStdout.write,
  ), 1);
  assert.deepEqual(abstainedStdout.bytes(), formalBytes(abstained.value));
});

test('FOVB007: 意味終端context前fatalはrunner fatal v002を使う', async () => {
  const stdout = captureWriter();
  const exitCode = await runPresentationMeaningBoundarySelectionCliV001([], {
    stdout: stdout.stream,
  });
  const value = JSON.parse(stdout.bytes().toString('utf8'));
  assert.equal(exitCode, 2);
  assert.equal(value.schemaVersion, 'presentation-caption-meaning-boundary-runner-fatal-v002');
  assertValid(value.fatalObservation);
});

test('FOVB008: 意味終端context後fatalにfatalObservationがある', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const job = await refreshFormalJob(
      'evals/clip_composition/outputs/presentation/meaning-boundary-validation-jobs/'
        + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-b1-v002.json',
    );
    job.implementationBindings = await ensureFatalBinding(
      job.implementationBindings,
      'meaning-boundary',
    );
    assert.equal(validatePresentationMeaningBoundaryValidationJobV001(job), true);
    const jobPath = 'fixtures/fovb008.json';
    const jobBytes = formalBytes(job);
    await writeWorkspaceBytes(workspaceRoot, jobPath, jobBytes);
    const input = {
      workspaceRoot,
      jobPath,
      jobBytes,
      jobBindings: [],
      inputObservations: [],
      graphSnapshots: [],
    };
    assert.equal((await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
      input,
    )).status, 'passed');
    await writeFile(path.join(workspaceRoot, jobPath), Buffer.from('{}\n'));
    const changed = await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
      input,
    );
    assert.equal(changed.status, 'fatal');
    assertValid(changed.fatalObservation);
    assert.deepEqual(changed.fatalObservation.targetFile, {
      path: jobPath,
      fileSha256: sha256(jobBytes),
    });
    const fatal = makePresentationMeaningBoundaryFatalCliResultV001(
      changed.fatalObservation,
    );
    const stdout = captureWriter();
    assert.equal(writePresentationMeaningBoundarySelectionCliResultV001(
      fatal,
      stdout.write,
    ), 2);
    const value = JSON.parse(stdout.bytes().toString('utf8'));
    assert.equal(value.schemaVersion, 'presentation-caption-meaning-boundary-runner-fatal-v002');
    assertValid(value.fatalObservation);

    await writeWorkspaceBytes(workspaceRoot, jobPath, jobBytes);
    const implementationBinding = job.implementationBindings[0];
    const implementationBytes = await readFile(path.join(
      REPOSITORY_ROOT,
      implementationBinding.path,
    ));
    assert.equal(sha256(implementationBytes), implementationBinding.fileSha256);
    await writeWorkspaceBytes(workspaceRoot, implementationBinding.path, implementationBytes);
    const verifiedBindingInput = {
      ...input,
      jobBindings: [implementationBinding],
    };
    assert.equal((await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
      verifiedBindingInput,
    )).status, 'passed');
    await writeWorkspaceBytes(
      workspaceRoot,
      implementationBinding.path,
      Buffer.from('fovb008-implementation-changed\n', 'utf8'),
    );
    const verifiedBindingChange =
      await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
        verifiedBindingInput,
      );
    assert.equal(verifiedBindingChange.status, 'fatal');
    assert.deepEqual(
      verifiedBindingChange.fatalObservation.targetFile,
      {
        path: implementationBinding.path,
        fileSha256: implementationBinding.fileSha256,
      },
    );

    const spoofedBytes = Buffer.from('fovb008-spoofed-source\n', 'utf8');
    const spoofedBinding = {
      path: 'fixtures/fovb008-spoofed-source.json',
      fileSha256: sha256(spoofedBytes),
    };
    await writeWorkspaceBytes(workspaceRoot, spoofedBinding.path, spoofedBytes);
    const spoofedSourceFieldInput = {
      ...input,
      jobBindings: [{
        ...spoofedBinding,
        sourceField: 'job.implementationBindings[*]',
      }],
    };
    assert.equal((await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
      spoofedSourceFieldInput,
    )).status, 'passed');
    await writeWorkspaceBytes(
      workspaceRoot,
      spoofedBinding.path,
      Buffer.from('fovb008-source-changed\n', 'utf8'),
    );
    const spoofedChange =
      await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
        spoofedSourceFieldInput,
      );
    assert.equal(spoofedChange.status, 'fatal');
    assert.equal(spoofedChange.fatalObservation.targetFile, null);
  });
});

test('FOVB009: 意味終端はF01を末尾束縛し通常validation schemaを維持する', async () => {
  const job = await refreshFormalJob(
    'evals/clip_composition/outputs/presentation/meaning-boundary-validation-jobs/'
      + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-b1-v002.json',
  );
  job.implementationBindings = await ensureFatalBinding(
    job.implementationBindings,
    'meaning-boundary',
  );
  assert.equal(validatePresentationMeaningBoundaryValidationJobV001(job), true);
  const mixedMeaningBoundaryJob = structuredClone(job);
  mixedMeaningBoundaryJob.implementationBindings = await ensureFatalBinding(
    mixedMeaningBoundaryJob.implementationBindings,
    'legacy-b1',
  );
  assert.equal(
    validatePresentationMeaningBoundaryValidationJobV001(mixedMeaningBoundaryJob),
    false,
  );
  assert.equal(job.implementationBindings.at(-1).role, 'fatal-observation');
  const sourcePackage = await readJson(job.sourcePackageBinding.path);
  const b6Manifest = await readJson(job.b6ManifestBinding.path);
  const providerEnvelope = await readJson(job.providerEnvelopeBinding.path);
  const b5Manifest = await readJson(b6Manifest.b5ManifestBinding.path);
  const evaluationInput = {
    job,
    jobFileSha256: sha256(formalBytes(job)),
    sourcePackage,
    b5Manifest,
    b6Manifest,
    providerEnvelope,
  };
  const passed = evaluatePresentationMeaningBoundarySelectionV001({
    ...evaluationInput,
    provenanceArtifactsVerified: true,
  });
  assert.equal(passed.status, 'passed');
  assert.deepEqual(passed.violations, []);
  const passedReport = buildPresentationMeaningBoundaryValidationReportV001({
    job,
    jobFileSha256: evaluationInput.jobFileSha256,
    evaluation: passed,
    selectionPath: `${job.outputRoot}/meaning-boundary-selection.json`,
    rawResponseBinding: providerEnvelope.rawResponseBinding,
  });
  assert.equal(validatePresentationMeaningBoundaryValidationReportV001(passedReport), true);
  const passedStdout = captureWriter();
  assert.equal(writePresentationMeaningBoundarySelectionCliResultV001({
    status: passed.status,
    report: passedReport,
  }, passedStdout.write), 0);
  assert.deepEqual(passedStdout.bytes(), formalBytes(passedReport));

  const rejected = evaluatePresentationMeaningBoundarySelectionV001({
    ...evaluationInput,
    provenanceArtifactsVerified: false,
  });
  assert.equal(rejected.status, 'rejected');
  assert.deepEqual(rejected.violations, [{
    code: 'MEANING_BOUNDARY_RESPONSE_INVALID',
    path: '/providerEnvelopeBinding',
    relatedIds: [],
  }]);
  const rejectedReport = buildPresentationMeaningBoundaryValidationReportV001({
    job,
    jobFileSha256: evaluationInput.jobFileSha256,
    evaluation: rejected,
    selectionPath: `${job.outputRoot}/meaning-boundary-selection.json`,
    rawResponseBinding: providerEnvelope.rawResponseBinding,
  });
  assert.equal(validatePresentationMeaningBoundaryValidationReportV001(rejectedReport), true);
  const rejectedStdout = captureWriter();
  assert.equal(writePresentationMeaningBoundarySelectionCliResultV001({
    status: rejected.status,
    report: rejectedReport,
  }, rejectedStdout.write), 1);
  assert.deepEqual(rejectedStdout.bytes(), formalBytes(rejectedReport));
  assert.deepEqual(await runMeaningBoundaryRejectedScenarioV002(), {
    status: 'rejected',
    exitCode: 1,
    code: 'MEANING_BOUNDARY_RESPONSE_INVALID',
    path: '/providerEnvelopeBinding',
  });
  await withTemporaryWorkspace(async workspaceRoot => {
    const jobPath = 'fixtures/fovb009.json';
    const jobBytes = formalBytes(job);
    await mkdir(path.join(workspaceRoot, 'fixtures'), {recursive: true});
    await writeFile(path.join(workspaceRoot, jobPath), jobBytes);
    const input = {
      workspaceRoot,
      jobPath,
      jobBytes,
      jobBindings: [],
      inputObservations: [],
      graphSnapshots: [],
    };
    assert.equal((await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
      input,
    )).status, 'passed');
    await writeFile(path.join(workspaceRoot, jobPath), Buffer.from('{}\n'));
    const changed = await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
      input,
    );
    assert.equal(changed.status, 'fatal');
    assert.equal(changed.fatalObservation.innerCode, 'FILE_CHANGED_DURING_READ');
    assert.deepEqual((await readdir(workspaceRoot)).sort(), ['fixtures']);
  });
});

test('FOVB010: 意味package context前fatalはstdout用formal runner v002を作る', async () => {
  const failureRoot = path.join(
    REPOSITORY_ROOT,
    'evals/clip_composition/outputs/presentation/meaning-information-failures',
  );
  const before = await snapshotFileTree(failureRoot);
  const writer = captureWriter();
  const exitCode = await runPresentationMeaningInformationPackageJobCliV001([], {
    stdout: writer.stream,
  });
  assert.equal(exitCode, 2);
  assert.equal(JSON.parse(writer.bytes().toString('utf8')).diagnosticCode,
    'MEANING_INFORMATION_RUNNER_FATAL');
  assert.deepEqual(await snapshotFileTree(failureRoot), before);
});

test('FOVB011: 意味package context後はF01束縛とdurable v002を持つ', async () => {
  const job = await refreshFormalJob(
    'evals/clip_composition/outputs/presentation/meaning-information-jobs/'
      + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002.json',
  );
  job.implementationBindings = await ensureFatalBinding(
    job.implementationBindings,
    'meaning-package',
  );
  assert.equal(validatePresentationMeaningInformationPackageJobV001(job), true);
  const mixedMeaningPackageJob = structuredClone(job);
  mixedMeaningPackageJob.implementationBindings = await ensureFatalBinding(
    mixedMeaningPackageJob.implementationBindings,
    'legacy-b1',
  );
  assert.equal(
    validatePresentationMeaningInformationPackageJobV001(mixedMeaningPackageJob),
    false,
  );
  await withTemporaryWorkspace(async workspaceRoot => {
    const input = makeMeaningFailureInput({workspaceRoot, pathJobId: 'fovb011'});
    const result = await publishPresentationMeaningInformationFailureV002(input);
    assert.equal(result.status, 'fatal');
    assert.notEqual(result.failureReport, null);
    const stdout = captureWriter();
    assert.equal(
      writePresentationMeaningInformationPackageCliResultV001(result, stdout.write),
      2,
    );
    const relative = 'evals/clip_composition/outputs/presentation/'
      + `meaning-information-failures/${input.pathJobId}/${sha256(input.jobBytes)}/`
      + 'failure-report.json';
    assert.deepEqual(await readFile(path.join(workspaceRoot, relative)), result.bytes);
    assert.deepEqual(stdout.bytes(), result.bytes);
    const value = JSON.parse(result.bytes.toString('utf8'));
    assert.equal(value.schemaVersion, 'zev-meaning-information-failure-report-v002');
    assert.equal(value.status, 'fatal');
    assert.deepEqual(await readdir(path.dirname(path.join(workspaceRoot, relative))), [
      'failure-report.json',
    ]);
  });
});

test('FOVB012: 意味package同一job SHAの二回目はtarget不正へ分離される', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const input = makeMeaningFailureInput({workspaceRoot, pathJobId: 'fovb012'});
    assert.notEqual((await publishPresentationMeaningInformationFailureV002(input)).failureReport,
      null);
    const before = await snapshotFileTree(workspaceRoot);
    const second = await publishPresentationMeaningInformationFailureV002(input);
    assert.equal(second.failureReport, null);
    assert.equal(JSON.parse(second.bytes.toString('utf8')).fatalObservation.innerCode,
      'REPORT_TARGET_INVALID');
    const stdout = captureWriter();
    assert.equal(writePresentationMeaningInformationPackageCliResultV001(
      second,
      stdout.write,
    ), 2);
    assert.deepEqual(stdout.bytes(), second.bytes);
    assert.deepEqual(await snapshotFileTree(workspaceRoot), before);
  });
});

test('FOVB013: 意味packageの実公開失敗はreport公開失敗へ分離される', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const directoryPath = 'outputs/fovb013';
    const outputAbsolute = path.join(workspaceRoot, directoryPath);
    const racingBytes = {
      async *[Symbol.asyncIterator]() {
        await mkdir(outputAbsolute, {recursive: false});
        yield Buffer.from('{}\n', 'utf8');
      },
    };
    const result = await publishPresentationMeaningInformationFailureReportFileV002({
      workspaceRoot,
      directoryPath,
      fileName: 'failure-report.json',
      bytes: racingBytes,
    });
    assert.equal(result.status, 'fatal');
    assert.equal(result.fatalObservation.innerCode, 'REPORT_PUBLICATION_FAILED');
    assert.deepEqual(await readdir(outputAbsolute), []);
  });
});

test('FOVB014: 出力context前fatalはstderr用diagnostic v002を作る', async () => {
  const stdout = captureWriter();
  const stderr = captureWriter();
  const exitCode = await runPresentationOutputJobCliV001([], {
    stdout: stdout.write,
    stderr: stderr.write,
  });
  const value = JSON.parse(stderr.bytes().toString('utf8'));
  assert.equal(exitCode, 2);
  assert.equal(stdout.bytes().length, 0);
  assert.equal(value.schemaVersion, 'presentation-output-runner-diagnostic-v002');
  assertValid(value.fatalObservation);
});

test('FOVB015: 出力context後はF01束縛とdurable v002を持つ', async () => {
  const job = await refreshFormalJob(
    'evals/clip_composition/outputs/presentation/meaning-output-jobs/'
      + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/'
      + 'formal-output-job.json',
  );
  job.implementationBindings = await ensureFatalBinding(job.implementationBindings, 'output');
  assert.equal(validatePresentationOutputFormalJobV001(job), true);
  const mixedOutputJob = structuredClone(job);
  mixedOutputJob.implementationBindings = await ensureFatalBinding(
    mixedOutputJob.implementationBindings,
    'legacy-b1',
  );
  assert.equal(validatePresentationOutputFormalJobV001(mixedOutputJob), false);
  await withTemporaryWorkspace(async workspaceRoot => {
    const input = makeOutputFailureInput({workspaceRoot, outputId: 'fovb015'});
    const target = await inspectPresentationOutputRenderFailureTargetV002({
      workspaceRoot,
      outputId: input.request.publication.outputId,
      formalJobFileSha256: input.formalJobFileSha256,
    });
    assert.equal(target.status, 'passed');
    const result = await publishPresentationOutputRenderFailureV002(input);
    assert.equal(result.status, 'fatal');
    const stdout = captureWriter();
    const stderr = captureWriter();
    assert.equal(writePresentationOutputJobCliResultV001(result, {
      stdout: stdout.write,
      stderr: stderr.write,
    }), 2);
    assert.deepEqual(
      await readFile(path.join(workspaceRoot, result.failureRoot, 'failure-report.json')),
      result.bytes,
    );
    assert.deepEqual(stdout.bytes(), result.bytes);
    assert.equal(stderr.bytes().length, 0);
    const value = JSON.parse(result.bytes.toString('utf8'));
    assert.equal(value.schemaVersion, 'presentation-output-render-failure-report-v002');
    assert.equal(value.status, 'fatal');
    assert.deepEqual(await readdir(path.join(workspaceRoot, result.failureRoot)), [
      'failure-report.json',
    ]);
  });
});

test('FOVB016: 出力同一job SHAの二回目はtarget不正へ分離される', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const input = makeOutputFailureInput({workspaceRoot, outputId: 'fovb016'});
    const first = await publishPresentationOutputRenderFailureV002(input);
    assert.notEqual(first.failureRoot, null);
    const before = await snapshotFileTree(workspaceRoot);
    const second = await inspectPresentationOutputRenderFailureTargetV002({
      workspaceRoot,
      outputId: input.request.publication.outputId,
      formalJobFileSha256: input.formalJobFileSha256,
    });
    assert.equal(second.status, 'fatal');
    assert.equal(second.stderr.diagnosticCode, 'OUTPUT_RENDER_FAILURE_TARGET_INVALID');
    assert.equal(second.stderr.fatalObservation.innerCode, 'REPORT_TARGET_INVALID');
    const stdout = captureWriter();
    const stderr = captureWriter();
    assert.equal(writePresentationOutputJobCliResultV001(second, {
      stdout: stdout.write,
      stderr: stderr.write,
    }), 2);
    assert.equal(stdout.bytes().length, 0);
    assert.deepEqual(stderr.bytes(), formalBytes(second.stderr));
    assert.deepEqual(await snapshotFileTree(workspaceRoot), before);
  });
});

test('FOVB017: 出力の実公開失敗はreport公開失敗へ分離される', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const input = makeOutputFailureInput({workspaceRoot, outputId: 'fovb017'});
    const target = await inspectPresentationOutputRenderFailureTargetV002({
      workspaceRoot,
      outputId: input.request.publication.outputId,
      formalJobFileSha256: input.formalJobFileSha256,
    });
    assert.equal(target.status, 'passed');
    await mkdir(path.join(workspaceRoot, target.failureRoot), {recursive: true});
    const result = await publishPresentationOutputRenderFailureV002(input);
    assert.equal(result.status, 'fatal');
    assert.equal(result.failureRoot, null);
    assert.equal(result.stderr.diagnosticCode, 'OUTPUT_RENDER_PUBLICATION_FAILED');
    assert.equal(result.stderr.fatalObservation.innerCode, 'REPORT_PUBLICATION_FAILED');
  });
});

test('FOVB018: 出力runnerの外側13 codeは安全記録streamと共存する', async () => {
  const expectedCodes = [
    'OUTPUT_ACCEPTANCE_EXECUTION_FAILED',
    'OUTPUT_ACCEPTANCE_INPUT_CHANGED',
    'OUTPUT_ACCEPTANCE_PUBLICATION_FAILED',
    'OUTPUT_ACCEPTANCE_REPORT_BUILD_FAILED',
    'OUTPUT_FORMAL_JOB_INVALID',
    'OUTPUT_PLANNER_RESOURCE_EXHAUSTED',
    'OUTPUT_RENDER_CORE_CONTRACT_FAILED',
    'OUTPUT_RENDER_CORE_PROCESS_FAILED',
    'OUTPUT_RENDER_FAILURE_REPORT_INVALID',
    'OUTPUT_RENDER_FAILURE_TARGET_INVALID',
    'OUTPUT_RENDER_PUBLICATION_FAILED',
    'OUTPUT_RENDER_SAFETY_ARTIFACT_INVALID',
    'OUTPUT_RENDER_STAGED_ARTIFACT_INVALID',
  ];
  assert.deepEqual(PRESENTATION_OUTPUT_RUNNER_OUTER_CODES_V001, expectedCodes);
  assert.equal(new Set(PRESENTATION_OUTPUT_RUNNER_OUTER_CODES_V001).size, 13);
  const stderr = captureWriter();
  const stdout = captureWriter();
  await runPresentationOutputJobCliV001([], {stdout: stdout.write, stderr: stderr.write});
  const contextBefore = JSON.parse(stderr.bytes().toString('utf8'));
  assert.equal(contextBefore.diagnosticCode, 'OUTPUT_FORMAL_JOB_INVALID');
  assert.equal(PRESENTATION_OUTPUT_RUNNER_OUTER_CODES_V001.includes(
    contextBefore.diagnosticCode,
  ), true);
  assert.equal(stdout.bytes().length, 0);
  const encoded = stderr.bytes().toString('utf8');
  for (const key of BANNED_KEYS) assert.equal(encoded.includes(`"${key}"`), false);

  await withTemporaryWorkspace(async workspaceRoot => {
    const retainedSafetyArtifacts = [{
      code: 'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY',
      path: 'work/fovb018/output.lock',
    }];
    const input = {
      ...makeOutputFailureInput({workspaceRoot, outputId: 'fovb018'}),
      safetyArtifacts: retainedSafetyArtifacts,
    };
    const result = await publishPresentationOutputRenderFailureV002(input);
    assert.equal(result.status, 'fatal');
    const durableBytes = await readFile(path.join(
      workspaceRoot,
      result.failureRoot,
      'failure-report.json',
    ));
    const durableStdout = captureWriter();
    const safetyStderr = captureWriter();
    assert.equal(writePresentationOutputJobCliResultV001(result, {
      stdout: durableStdout.write,
      stderr: safetyStderr.write,
    }), 2);
    assert.deepEqual(durableStdout.bytes(), durableBytes);
    assert.deepEqual(safetyStderr.bytes(), formalBytes(retainedSafetyArtifacts));
  });
});

test('FOVF001: v001 fatalObservationはv002入口で拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002({
    ...observation('unknown', 'UNCLASSIFIED'),
    schemaVersion: 'presentation-fatal-observation-v001',
  }), false);
});

test('FOVF002: v001からv002へのconverterをproductionへ作らない', async () => {
  const sources = await Promise.all([
    'presentation_timeline_composition_decision_v001.mjs',
    'run_presentation_caption_semantic_output_check_v002.mjs',
    'presentation_meaning_boundary_selection_v001.mjs',
    'run_presentation_meaning_information_package_job_v001.mjs',
    'run_presentation_output_job_v001.ts',
  ].map(readSource));
  for (const source of sources) assert.doesNotMatch(source, /convert\w*Fatal\w*V00[12]/u);
});

test('FOVF003: fatal v002にfallbackを作らない', async () => {
  const sources = await Promise.all([
    'presentation_fatal_observation_v002.mjs',
    'run_presentation_meaning_information_package_job_v001.mjs',
    'run_presentation_output_job_v001.ts',
  ].map(readSource));
  for (const source of sources) assert.doesNotMatch(source, /fatal(?:Observation)?Fallback/u);
});

test('FOVF004: v001/v002のunion受理・併産を作らない', async () => {
  const source = await readSource('presentation_fatal_observation_v002.mjs');
  assert.doesNotMatch(source, /presentation-fatal-observation-v001/u);
  assert.equal(validatePresentationFatalObservationV002(observation('unknown', 'UNCLASSIFIED')), true);
});

test('FOVF005: 意味packageの正常formal経路は公開byteとCLI byteを一致させる', async () => {
  await withTemporaryWorkspace(async workspaceRoot => {
    const fixture = await makeMeaningPackagePassedFixtureV002(workspaceRoot);
    assert.equal(validatePresentationMeaningInformationPackageJobV001(fixture.job), true);
    const before = await snapshotFileTree(workspaceRoot);
    const result = await runPresentationMeaningInformationPackageJobV001({
      workspaceRoot,
      jobPath: fixture.jobPath,
      executedAt: '2026-08-07T00:00:00Z',
    });
    assert.equal(result.status, 'passed');
    assert.equal(result.exitCode, 0);
    assert.equal(Object.hasOwn(result, 'failureReport'), false);
    const stdout = captureWriter();
    assert.equal(writePresentationMeaningInformationPackageCliResultV001(
      result,
      stdout.write,
    ), 0);
    assert.deepEqual(stdout.bytes(), result.bytes);
    assert.deepEqual(
      await readFile(path.join(workspaceRoot, fixture.job.outputPath)),
      result.bytes,
    );
    const after = await snapshotFileTree(workspaceRoot);
    const beforePaths = new Set(before.map(row => row.path));
    assert.deepEqual(after.filter(row => beforePaths.has(row.path)), before);
    assert.equal(after.some(row => row.path.includes('/meaning-information-failures/')), false);
    assert.deepEqual(after.filter(row => !beforePaths.has(row.path)), [
      {
        path: 'evals/clip_composition/outputs/presentation/meaning-information-packages',
        type: 'directory',
      },
      {
        path: path.posix.dirname(fixture.job.outputPath),
        type: 'directory',
      },
      {path: fixture.job.outputPath, type: 'file', bytes: result.bytes},
    ]);
  });
});

test('FOVF006: 検査済み拒否のstatusと終了code契約をfatalへ統合しない', async () => {
  const rejectionResults = [];
  for (const scenario of TIMELINE_REJECTION_SCENARIOS) {
    rejectionResults.push(await runTimelineRejectionScenarioV002(scenario));
  }
  assert.deepEqual(rejectionResults, TIMELINE_REJECTION_SCENARIOS.map(scenario => ({
    ...scenario,
    exitCode: 1,
  })));
  assert.deepEqual(await runMeaningBoundaryRejectedScenarioV002(), {
    status: 'rejected',
    exitCode: 1,
    code: 'MEANING_BOUNDARY_RESPONSE_INVALID',
    path: '/providerEnvelopeBinding',
  });
  assert.deepEqual(await runMeaningPackageRejectedScenarioV002(), {
    status: 'rejected',
    exitCode: 1,
    code: 'MEANING_JOB_INVALID',
    path: '/job',
  });
  assert.deepEqual(await runOutputRejectedScenarioV002(), {
    status: 'rejected',
    exitCode: 1,
    code: 'OUTPUT_REQUEST_INVALID',
    path: '',
  });
});

test('FOVF007: 既存違反code集合へ14 inner codeを混入しない', () => {
  assert.equal(PRESENTATION_TIMELINE_COMPOSITION_DECISION_VIOLATION_CODES_V001.length, 9);
  assert.equal(PRESENTATION_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V001.length, 30);
  assert.equal(PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001.length, 19);
  for (const innerCode of PRESENTATION_FATAL_INNER_CODES_V002) {
    assert.equal(PRESENTATION_TIMELINE_COMPOSITION_DECISION_VIOLATION_CODES_V001.includes(innerCode), false);
    assert.equal(PRESENTATION_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V001.includes(innerCode), false);
    assert.equal(PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001.includes(innerCode), false);
  }
});

test('FOVF008: 正式fatal byteに生文字列・secretを混入できない', async () => {
  const boundaryBytes = [];
  const timelineStdout = captureWriter();
  assert.equal(await runPresentationTimelineCompositionDecisionCliV001([], {
    stdout: timelineStdout.stream,
  }), 2);
  boundaryBytes.push(timelineStdout.bytes());

  const legacyB1Stdout = captureWriter();
  assert.equal(await runPresentationCaptionSemanticOutputCheckCliV002([], {
    stdout: legacyB1Stdout.stream,
  }), 2);
  boundaryBytes.push(legacyB1Stdout.bytes());

  const meaningBoundaryStdout = captureWriter();
  assert.equal(await runPresentationMeaningBoundarySelectionCliV001([], {
    stdout: meaningBoundaryStdout.stream,
  }), 2);
  boundaryBytes.push(meaningBoundaryStdout.bytes());

  const meaningPackageStdout = captureWriter();
  assert.equal(await runPresentationMeaningInformationPackageJobCliV001([], {
    stdout: meaningPackageStdout.stream,
  }), 2);
  boundaryBytes.push(meaningPackageStdout.bytes());

  const outputStdout = captureWriter();
  const outputStderr = captureWriter();
  assert.equal(await runPresentationOutputJobCliV001([], {
    stdout: outputStdout.write,
    stderr: outputStderr.write,
  }), 2);
  assert.equal(outputStdout.bytes().length, 0);
  boundaryBytes.push(outputStderr.bytes());

  const rawMarkers = ['FOVF008_RAW_STDOUT', 'FOVF008_RAW_STDERR'];
  const childError = await captureRendererChildFailure({
    innerStage: 'overlay-render',
    script: `process.stdout.write(${JSON.stringify(rawMarkers[0])});`
      + `process.stderr.write(${JSON.stringify(rawMarkers[1])});process.exit(1);`,
  });
  assertClosedChildFailure(childError, {
    innerStage: 'overlay-render',
    innerCode: 'CHILD_PROCESS_EXIT_NONZERO',
    rawMarkers,
  });

  assert.equal(boundaryBytes.length, 5);
  for (const bytes of boundaryBytes) {
    const value = JSON.parse(bytes.toString('utf8'));
    assert.equal(value.status, 'fatal');
    assertValid(value.fatalObservation);
    const encoded = bytes.toString('utf8');
    for (const key of BANNED_KEYS) assert.equal(encoded.includes(`"${key}"`), false);
    for (const marker of rawMarkers) assert.equal(encoded.includes(marker), false);
  }
});

const STABLE_ROOTS = Object.freeze([
  Object.freeze({
    id: 'FOVT001',
    tag: 'stable/first-clip-complete-20260727',
    root: 'evals/clip_composition/outputs/presentation/review-renders/'
      + 'DmWu0jVQfTE-candidate-13-caption-b6-v004-v002',
    treeOid: '27affa2cff1e099d263f5a00ed9c4558be1300bd',
    fileCount: 25,
  }),
  Object.freeze({
    id: 'FOVT002',
    tag: 'stable/second-clip-generality-20260728',
    root: 'evals/clip_composition/outputs/presentation/review-renders/'
      + 'qdczJpv8RCc-candidate-59-caption-local-reselection-v001',
    treeOid: '454fcf002ac90b0d6ce72f63f55476ed9f8ffc72',
    fileCount: 21,
  }),
  Object.freeze({
    id: 'FOVT003',
    tag: 'stable/vertical-first-clip-20260802',
    root: 'evals/clip_composition/outputs/presentation/vertical-review-renders/'
      + 'qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result',
    treeOid: '53076722863d2c36d470cc4ce9503739406ec03a',
    fileCount: 35,
  }),
  Object.freeze({
    id: 'FOVT004',
    tag: 'stable/meaning-output-first-real-run-20260806',
    root: 'evals/clip_composition/outputs/presentation/meaning-output-renders/'
      + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output',
    treeOid: 'ce2f5807db5ff63b83e1200bcec9f40796210327',
    fileCount: 35,
  }),
  Object.freeze({
    id: 'FOVT005',
    tag: 'stable/meaning-output-first-real-run-20260806',
    root: 'evals/clip_composition/outputs/presentation/meaning-output-renders/'
      + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002-output',
    treeOid: '5e65c51ad30a65f43b087a71b50f6172162b2c49',
    fileCount: 42,
  }),
]);

const walkFiles = async relativeRoot => {
  const found = [];
  const visit = async relativeDirectory => {
    for (const entry of await readdir(path.join(REPOSITORY_ROOT, relativeDirectory), {
      withFileTypes: true,
    })) {
      const relative = path.posix.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) await visit(relative);
      else found.push(relative);
    }
  };
  await visit(relativeRoot);
  return found.sort();
};

async function verifyStableRoot(expectedRoot) {
  const treeLine = git(['ls-tree', expectedRoot.tag, '--', expectedRoot.root])
    .toString('utf8').trim();
  const treeMatch = /^040000 tree ([0-9a-f]{40})\t(.+)$/u.exec(treeLine);
  assert.ok(treeMatch, expectedRoot.id);
  assert.equal(treeMatch[1], expectedRoot.treeOid, expectedRoot.id);
  assert.equal(treeMatch[2], expectedRoot.root, expectedRoot.id);

  const rows = git(['ls-tree', '-r', expectedRoot.tag, '--', expectedRoot.root])
    .toString('utf8').trim().split('\n').filter(Boolean);
  const expectedFiles = new Map(rows.map(row => {
    const match = /^(\d+) blob ([0-9a-f]{40})\t(.+)$/u.exec(row);
    assert.ok(match, row);
    return [match[3], match[2]];
  }));
  assert.equal(expectedFiles.size, expectedRoot.fileCount, expectedRoot.id);

  const actualFiles = await walkFiles(expectedRoot.root);
  assert.deepEqual(actualFiles, [...expectedFiles.keys()].sort(), expectedRoot.id);
  for (const relativePath of actualFiles) {
    const oid = git(['hash-object', '--', relativePath]).toString('utf8').trim();
    assert.equal(oid, expectedFiles.get(relativePath), relativePath);
  }
}

for (const stableRoot of STABLE_ROOTS) {
  test(`${stableRoot.id}: 正式成果物treeは正本tagと完全一致する`, async () => {
    await verifyStableRoot(stableRoot);
  });
}
