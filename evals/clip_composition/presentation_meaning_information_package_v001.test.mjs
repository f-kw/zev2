import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V001,
  buildPresentationMeaningInformationPackageV001,
  canonicalSha256PresentationMeaningInformationJsonV001,
  derivePresentationExpectedAtomOccurrencesV001,
  derivePresentationMeaningCaptionProjectionV001,
  derivePresentationMeaningSelectionProjectionV001,
  serializePresentationMeaningInformationFormalJsonV001,
  validatePresentationMeaningInformationPackageAdmissionEnvelopeV001,
  validatePresentationMeaningInformationPackageFormalBytesV001,
  validatePresentationMeaningInformationPackageV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  buildPresentationMeaningInformationFailureReportV001,
  inspectPresentationMeaningTrackedInputsBeforePublicationV001,
  inspectPresentationMeaningPackageDeterminismV001,
  inspectPresentationMeaningPublicationExceptionV001,
  inspectPresentationMeaningPublicationTargetV001,
  observePresentationMeaningInformationNodeEnvironmentV001,
  runPresentationMeaningInformationPackageJobV001,
  validatePresentationMeaningInformationFailureReportV001,
} from './run_presentation_meaning_information_package_job_v001.mjs';
import {
  PRESENTATION_TIMELINE_COMPOSITION_DECISION_VIOLATION_CODES_V001,
  createPresentationMeaningOwnedStagingRootV001,
  ensurePresentationMeaningSafePublicationParentV001,
  inspectPresentationTimelineInputsBeforePublicationV001,
  observePresentationMeaningWorkspaceFileStableStreamingV001,
  publishPresentationMeaningOwnedStagingRootNoReplaceV001,
  runPresentationTimelineCompositionDecisionV001,
  validatePresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';

const H = character => character.repeat(64);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(HERE, '../..');
const MEANING_PACKAGE_CLI_PATH = path.join(
  REPOSITORY_ROOT,
  'evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs',
);
const clone = value => structuredClone(value);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const formalBytes = value => serializePresentationMeaningInformationFormalJsonV001(value);
const jsonBinding = (schemaVersion, bindingPath, value) => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: sha256(formalBytes(value)),
  canonicalSha256: canonicalSha256PresentationMeaningInformationJsonV001(value),
});
const occurrenceKey = ref =>
  `${ref.timelineSegmentId}\u0000${ref.sourceMediaId}\u0000${ref.atomId}`;

const writeFixtureBytes = async (workspaceRoot, relativePath, bytes) => {
  const absolute = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, bytes);
};

const writeFixtureJson = (workspaceRoot, relativePath, value) =>
  writeFixtureBytes(workspaceRoot, relativePath, formalBytes(value));

const TIMELINE_CORE_PATH =
  'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs';
const TIMELINE_STRICT_JSON_PATH =
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';
const TIMELINE_CONTRACT_BINDINGS = Object.freeze([
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

const runTimelineSourceObservationScenario = async ({
  scenario,
}) => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), `zev-timeline-${scenario}-`));
  try {
    const retainedValues = {};
    const retainedSourceAtomsBinding = {};
    for (const [name, fileName] of [
      ['sourceAtoms', 'source-atoms.json'],
      ['generationManifest', 'generation-manifest.json'],
      ['validationReport', 'validation-report.json'],
    ]) {
      const bytes = await readFile(path.join(
        REPOSITORY_ROOT,
        'evals/clip_composition/outputs/presentation/retained-source-atoms/'
          + `qdczJpv8RCc-candidate-59-v001/${fileName}`,
      ));
      const value = JSON.parse(bytes.toString('utf8'));
      const relativePath = `fixtures/meaning-package/timeline-runner/${fileName}`;
      retainedValues[name] = value;
      retainedSourceAtomsBinding[name] = jsonBinding(
        value.schemaVersion,
        relativePath,
        value,
      );
      await writeFixtureBytes(workspaceRoot, relativePath, bytes);
    }
    const sourceRef = retainedValues.sourceAtoms.sourceRef;
    const retainedSegment = retainedValues.sourceAtoms.selection.segments[0];
    const sourceMediaId = 'source-media-000001';
    const mediaBytes = Buffer.alloc((2 * 1024 * 1024) + 31, 0x62);
    mediaBytes.write('timeline-runner-source-media\n', 0, 'utf8');
    const mediaBinding = {
      path: 'fixtures/meaning-package/timeline-runner/source.mp4',
      fileSha256: scenario === 'media-mismatch'
        ? sha256(Buffer.from('different-media', 'utf8'))
        : sha256(mediaBytes),
    };
    if (scenario !== 'media-missing') {
      await writeFixtureBytes(workspaceRoot, mediaBinding.path, mediaBytes);
    }
    const supportBindings = {};
    for (const name of ['media-equivalence', 'stt-manifest', 'transcript', 'word-timestamps']) {
      const bytes = Buffer.from(`timeline-runner-${name}\n`, 'utf8');
      const binding = {
        path: `fixtures/meaning-package/timeline-runner/${name}.json`,
        fileSha256: sha256(bytes),
      };
      supportBindings[name] = binding;
      await writeFixtureBytes(workspaceRoot, binding.path, bytes);
    }
    const videoId = sourceRef.slice('youtube:'.length);
    const sourceIdentity = scenario === 'identity-invalid'
      ? {schemaVersion: 'presentation-real-data-source-identity-v001'}
      : {
        schemaVersion: 'presentation-real-data-source-identity-v001',
        sourceIdentityId: `timeline-${scenario}-source-identity-v001`,
        videoId,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        sourceProvenance: 'timeline streaming source observation fixture',
        sourceRef,
        executionMedia: mediaBinding,
        mediaEquivalence: supportBindings['media-equivalence'],
        stt: {
          manifest: supportBindings['stt-manifest'],
          transcript: supportBindings.transcript,
          wordTimestamps: supportBindings['word-timestamps'],
        },
      };
    const sourceIdentityBinding = jsonBinding(
      'presentation-real-data-source-identity-v001',
      'fixtures/meaning-package/timeline-runner/source-identity.json',
      sourceIdentity,
    );
    await writeFixtureJson(workspaceRoot, sourceIdentityBinding.path, sourceIdentity);
    const implementationBindings = [];
    for (const [role, relativePath] of [
      ['timeline-decision', TIMELINE_CORE_PATH],
      ['strict-json', TIMELINE_STRICT_JSON_PATH],
    ]) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, relativePath));
      await writeFixtureBytes(workspaceRoot, relativePath, bytes);
      implementationBindings.push({path: relativePath, fileSha256: sha256(bytes), role});
    }
    for (const binding of TIMELINE_CONTRACT_BINDINGS) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, binding.path));
      assert.equal(sha256(bytes), binding.fileSha256);
      await writeFixtureBytes(workspaceRoot, binding.path, bytes);
    }
    const jobId = `timeline-${scenario}-v001`;
    const job = {
      schemaVersion: 'zev-timeline-composition-decision-job-v001',
      jobId,
      decisionId: `${jobId}-decision`,
      sourceMedia: [{
        sourceMediaId,
        ordinal: 1,
        sourceRef,
        mediaBinding,
        sourceIdentityBinding,
        retainedSourceAtomsBinding,
      }],
      segments: [{
        segmentId: 'segment-0001',
        ordinal: 1,
        sourceMediaId,
        sourceStartMs: retainedSegment.sourceStartMs,
        sourceEndMs: retainedSegment.sourceEndMs,
      }],
      recordedBy: 'human',
      recordedAt: '2026-08-03T00:00:00Z',
      outputPath: `evals/clip_composition/outputs/presentation/meaning-timeline-decisions/`
        + `${jobId}/timeline-composition-decision.json`,
      implementationBindings,
      approvedContractBindings: TIMELINE_CONTRACT_BINDINGS,
    };
    const jobPath = `evals/clip_composition/outputs/presentation/`
      + `meaning-timeline-decision-jobs/${jobId}.json`;
    await writeFixtureJson(workspaceRoot, jobPath, job);
    return await runPresentationTimelineCompositionDecisionV001({workspaceRoot, jobPath});
  } finally {
    await rm(workspaceRoot, {recursive: true, force: true});
  }
};

const B1_SUFFIX = '0123456789abcdef0123456789abcdef';
const BOUNDARY_TASK =
  '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、発話の意味が自然に完結するまとまりの終端をmeaningGroupEndBoundaryCandidateIdで選んでください。最後のまとまりはcontainer最後の候補で終えてください。本文、候補ID、時刻、順序を変更しないでください。';
const B1_CHECK_NAMES = Object.freeze([
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

const makeSource = (sourceIndex, {sourceStartMs, sourceEndMs, atoms}) => {
  const sourceMediaId = `source-media-${String(sourceIndex).padStart(6, '0')}`;
  const videoId = String(sourceIndex).repeat(11);
  const sourceRef = `youtube:${videoId}`;
  const rawSourceAtoms = atoms.map((atom, index) => ({
    atomId: `mip-source-${sourceIndex}-atom-${String(index + 1).padStart(3, '0')}`,
    speechId: atom.speechId,
    speaker: `speaker-${sourceIndex}`,
    text: atom.text,
    startMs: atom.startMs,
    endMs: atom.endMs,
    sourceRef,
  }));
  const atomIds = rawSourceAtoms.map(({atomId}) => atomId);
  const sourceAtoms = {
    schemaVersion: 'presentation-retained-source-atoms-v001',
    artifactId: `mip-retained-source-${sourceIndex}-v001`,
    extractorVersion: 'presentation-retained-source-atoms-extractor-v001',
    sourceRef,
    sourceProvenance: `mip-inline-source-${sourceIndex}`,
    atomGranularity: 'character-timestamp',
    selection: {
      segments: [{
        timelineSegmentId: `mip-source-selection-${sourceIndex}`,
        sourceStartMs,
        sourceEndMs,
        atomIds,
      }],
    },
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
  const basePath = `fixtures/meaning-package/source-${sourceIndex}`;
  const retainedSourceAtomsBinding = {
    sourceAtoms: jsonBinding(
      sourceAtoms.schemaVersion,
      `${basePath}/source-atoms.json`,
      sourceAtoms,
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
  return {
    sourceMediaId,
    sourceRef,
    sourceStartMs,
    sourceEndMs,
    sourceAtoms,
    generationManifest,
    validationReport,
    sourceMedia: {
      sourceMediaId,
      ordinal: sourceIndex,
      sourceRef,
      mediaBinding: {path: `${basePath}/source.mp4`, fileSha256: H(String(sourceIndex))},
      sourceIdentityBinding: {
        schemaVersion: 'presentation-real-data-source-identity-v001',
        path: `${basePath}/source-identity.json`,
        fileSha256: H('a'),
        canonicalSha256: H('b'),
      },
      retainedSourceAtomsBinding,
    },
  };
};

const makeTimelineDecision = sources => {
  const timelineSources = sources.length === 1
    ? [sources[0]]
    : [sources[0], sources[1], sources[0]];
  return {
    schemaVersion: 'zev-timeline-composition-decision-v001',
    decisionId: 'mip-two-source-reuse-timeline-v001',
    sourceMedia: sources.map(source => source.sourceMedia),
    segments: timelineSources.map((source, index) => ({
      segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
      ordinal: index + 1,
      sourceMediaId: source.sourceMediaId,
      sourceStartMs: source.sourceStartMs,
      sourceEndMs: source.sourceEndMs,
    })),
    decisionProvenance: {
      inputDecisionBinding: {
        schemaVersion: 'zev-timeline-composition-decision-job-v001',
        path: 'fixtures/meaning-package/timeline-job.json',
        fileSha256: H('c'),
        canonicalSha256: H('d'),
      },
      recordedBy: 'human',
      recordedAt: '2026-08-03T00:00:00Z',
    },
  };
};

const makeMeaningSourcePackage = ({sources, timelineDecision, timelineBinding}) => {
  let candidateOrdinal = 0;
  const containers = [];
  const candidateOccurrenceMap = [];
  const sourceById = new Map(sources.map(source => [source.sourceMediaId, source]));
  for (const [containerIndex, segment] of timelineDecision.segments.entries()) {
    const source = sourceById.get(segment.sourceMediaId);
    const boundaryCandidates = source.sourceAtoms.rawSourceAtoms.map((atom, atomIndex) => {
      candidateOrdinal += 1;
      const atomRef = {
        timelineSegmentId: segment.segmentId,
        sourceMediaId: segment.sourceMediaId,
        atomId: atom.atomId,
      };
      const candidate = {
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
      candidateOccurrenceMap.push({
        boundaryCandidateId: candidate.boundaryCandidateId,
        timelineSegmentId: segment.segmentId,
        sourceMediaId: segment.sourceMediaId,
        sourceGateAContainerId:
          `segmenter-container-${String(source.sourceMedia.ordinal).padStart(6, '0')}`,
        sourceGateABoundaryCandidateId:
          `segmenter-boundary-${String(atomIndex + 1).padStart(6, '0')}`,
        atomRefs: [atomRef],
      });
      return candidate;
    });
    containers.push({
      containerId: `segmenter-container-${String(containerIndex + 1).padStart(6, '0')}`,
      ordinal: containerIndex + 1,
      sourceMediaId: segment.sourceMediaId,
      timelineSegmentId: segment.segmentId,
      boundaryCandidates,
    });
  }
  const implementationBindings = [
    {
      path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
      fileSha256: H('1'),
      role: 'meaning-source-package',
    },
    {
      path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
      fileSha256: H('2'),
      role: 'gate-a-core',
    },
    {
      path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
      fileSha256: H('3'),
      role: 'gate-a-preflight',
    },
    {
      path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
      fileSha256: H('4'),
      role: 'strict-json',
    },
  ];
  return {
    schemaVersion: 'presentation-meaning-boundary-source-package-v001',
    packageId: 'mip-source-package-v001',
    timelineCompositionDecisionBinding: timelineBinding,
    runtimeBinding: {
      segmenterSources: sources.map((source, index) => ({
        sourceMediaId: source.sourceMediaId,
        preflightReportBinding: {
          schemaVersion: 'presentation-segmenter-boundary-preflight-report-v001',
          path: `fixtures/meaning-package/source-${index + 1}/preflight.json`,
          fileSha256: H('5'),
          canonicalSha256: H('6'),
        },
        evidenceBinding: {
          schemaVersion: 'presentation-segmenter-boundary-evidence-v001',
          path: `fixtures/meaning-package/source-${index + 1}/evidence.json`,
          fileSha256: H('7'),
          canonicalSha256: H('8'),
        },
        runtimeProjection: {
          nodeBinarySha256: H('9'),
          nodeVersion: 'v20.19.6',
          icuVersion: '75.1',
          resolvedLocale: 'ja',
          resolvedGranularity: 'word',
        },
      })),
      strictJsonImplementationBinding: implementationBindings[3],
    },
    containers,
    candidateOccurrenceMap,
    taskDescription: BOUNDARY_TASK,
    provenance: {
      sourcePackageJobBinding: {
        schemaVersion: 'presentation-meaning-boundary-source-package-job-v001',
        path: 'fixtures/meaning-package/source-package-job.json',
        fileSha256: H('e'),
        canonicalSha256: H('f'),
      },
      timelineCompositionDecisionBinding: timelineBinding,
      implementationBindings,
    },
  };
};

const makeCaptionProjectionInput = ({sourcePackage, sources}) => {
  const atomById = new Map(sources.flatMap(source =>
    source.sourceAtoms.rawSourceAtoms.map(atom => [atom.atomId, atom])));
  return sourcePackage.containers.map((container, index) => {
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
};

const makeFixture = () => {
  const sources = [
    makeSource(1, {
      sourceStartMs: 100,
      sourceEndMs: 300,
      atoms: [
        {text: '甲', speechId: 1, startMs: 110, endMs: 170},
        {text: '乙', speechId: 1, startMs: 180, endMs: 260},
      ],
    }),
    makeSource(2, {
      sourceStartMs: 500,
      sourceEndMs: 650,
      atoms: [{text: '丙', speechId: 2, startMs: 520, endMs: 620}],
    }),
  ];
  const timelineDecision = makeTimelineDecision(sources);
  assert.equal(validatePresentationTimelineCompositionDecisionV001(timelineDecision), true);
  const timelineBinding = jsonBinding(
    timelineDecision.schemaVersion,
    'fixtures/meaning-package/timeline-decision.json',
    timelineDecision,
  );
  const sourcePackage = makeMeaningSourcePackage({sources, timelineDecision, timelineBinding});
  const sourcePackageBinding = jsonBinding(
    sourcePackage.schemaVersion,
    'fixtures/meaning-package/source-package.json',
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
    selectionId: `presentation-meaning-boundary-selection-${B1_SUFFIX}`,
    sourcePackageBinding,
    b6ManifestBinding: {
      schemaVersion: 'presentation-meaning-boundary-b6-manifest-v001',
      path: 'fixtures/meaning-package/b6-manifest.json',
      fileSha256: H('a'),
      canonicalSha256: H('b'),
    },
    providerEnvelopeBinding: {
      schemaVersion: 'presentation-meaning-boundary-provider-response-envelope-v001',
      path: 'fixtures/meaning-package/provider-envelope.json',
      fileSha256: H('c'),
      canonicalSha256: H('d'),
    },
    response,
  };
  const semanticSelectionBinding = jsonBinding(
    semanticSelection.schemaVersion,
    'fixtures/meaning-package/semantic-selection.json',
    semanticSelection,
  );
  const captions = makeCaptionProjectionInput({sourcePackage, sources});
  const semanticValidation = {
    schemaVersion: 'presentation-caption-meaning-boundary-validation-report-v001',
    reportId: `presentation-meaning-boundary-validation-report-${B1_SUFFIX}`,
    status: 'passed',
    sourcePackageBinding,
    rawResponseBinding: {
      path: 'fixtures/meaning-package/raw-response.json',
      fileSha256: H('e'),
    },
    selectionBinding: semanticSelectionBinding,
    checks: B1_CHECK_NAMES.map(name => ({name, status: 'passed', violationCodes: []})),
    violations: [],
    selectionProjection: derivePresentationMeaningSelectionProjectionV001(response),
    captionProjection: derivePresentationMeaningCaptionProjectionV001(captions),
    implementationBindings: [
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
        fileSha256: H('1'),
        role: 'meaning-selection',
      },
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
        fileSha256: H('2'),
        role: 'meaning-source-package',
      },
      {
        path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
        fileSha256: H('3'),
        role: 'strict-json-codec',
      },
    ],
  };
  const semanticValidationBinding = jsonBinding(
    semanticValidation.schemaVersion,
    'fixtures/meaning-package/semantic-validation.json',
    semanticValidation,
  );
  const jobId = 'mip-inline-job-v001';
  const job = {
    schemaVersion: PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
    jobId,
    packageId: `${jobId}-meaning-information`,
    title: {text: '', inputMode: 'none'},
    timelineCompositionDecisionBinding: timelineBinding,
    semanticSelectionValidationBinding: semanticValidationBinding,
    semanticSelectionBinding,
    outputPath:
      `evals/clip_composition/outputs/presentation/meaning-information-packages/${jobId}-meaning-information/meaning-information-package.json`,
    implementationBindings:
      PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001.map(
        ({path: implementationPath, role}, index) => ({
          path: implementationPath,
          fileSha256: H(String(index + 4)),
          role,
        }),
      ),
    approvedContractBindings:
      clone(PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001),
  };
  const jobBinding = jsonBinding(
    job.schemaVersion,
    'evals/clip_composition/outputs/presentation/meaning-information-jobs/mip-inline-job-v001.json',
    job,
  );
  const retainedSources = sources.map(source => ({
    sourceMediaId: source.sourceMediaId,
    sourceAtoms: source.sourceAtoms,
    generationManifest: source.generationManifest,
    validationReport: source.validationReport,
  }));
  const buildInputs = {
    job,
    jobBinding,
    timelineDecision,
    sourcePackage,
    semanticValidation,
    semanticSelection,
    retainedSources,
  };
  const built = buildPresentationMeaningInformationPackageV001(buildInputs);
  assert.equal(built.status, 'passed');
  return {
    ...buildInputs,
    built,
    sources,
    captions,
    validationContext: {
      job,
      jobBinding,
      timelineDecision,
      expectedAtomOccurrences: built.expectedAtomOccurrences,
      occurrenceAtoms: built.occurrenceAtoms,
    },
  };
};

const EARLY_RUNNER_CODES = new Set([
  'SOURCE_IDENTITY_INVALID',
  'SOURCE_MEDIA_BINDING_MISMATCH',
  'RETAINED_ATOMS_BINDING_MISMATCH',
]);

const runEarlyMeaningFailureV001 = async (fixture, code) => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'zev-mip-runner-v001-'));
  const job = clone(fixture.job);
  const suffix = code.toLowerCase().replaceAll('_', '-');
  job.jobId = `mip-${suffix}-v001`;
  job.packageId = `${job.jobId}-meaning-information`;
  job.outputPath =
    `evals/clip_composition/outputs/presentation/meaning-information-packages/`
    + `${job.packageId}/meaning-information-package.json`;
  try {
    for (const binding of job.implementationBindings) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, binding.path));
      binding.fileSha256 = sha256(bytes);
      await writeFixtureBytes(workspaceRoot, binding.path, bytes);
    }
    for (const binding of job.approvedContractBindings) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, binding.path));
      assert.equal(sha256(bytes), binding.fileSha256);
      await writeFixtureBytes(workspaceRoot, binding.path, bytes);
    }

    const timelineDecision = clone(fixture.timelineDecision);
    const source = timelineDecision.sourceMedia[0];
    const mediaBytes = Buffer.from('mip-runner-source-media-v001', 'utf8');
    source.mediaBinding = {
      path: 'fixtures/meaning-package/runner/source.mp4',
      fileSha256: sha256(mediaBytes),
    };
    await writeFixtureBytes(workspaceRoot, source.mediaBinding.path, mediaBytes);
    const supportBindings = {};
    for (const name of ['media-equivalence', 'stt-manifest', 'transcript', 'word-timestamps']) {
      const bytes = Buffer.from(`mip-runner-${name}-v001`, 'utf8');
      const binding = {
        path: `fixtures/meaning-package/runner/${name}.json`,
        fileSha256: sha256(bytes),
      };
      supportBindings[name] = binding;
      await writeFixtureBytes(workspaceRoot, binding.path, bytes);
    }
    const videoId = source.sourceRef.slice('youtube:'.length);
    const sourceIdentity = code === 'SOURCE_IDENTITY_INVALID'
      ? {schemaVersion: 'presentation-real-data-source-identity-v001'}
      : {
        schemaVersion: 'presentation-real-data-source-identity-v001',
        sourceIdentityId: 'mip-runner-source-identity-v001',
        videoId,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        sourceProvenance: 'mip-runner-fixture-v001',
        sourceRef: source.sourceRef,
        executionMedia: code === 'SOURCE_MEDIA_BINDING_MISMATCH'
          ? supportBindings['media-equivalence']
          : source.mediaBinding,
        mediaEquivalence: supportBindings['media-equivalence'],
        stt: {
          manifest: supportBindings['stt-manifest'],
          transcript: supportBindings.transcript,
          wordTimestamps: supportBindings['word-timestamps'],
        },
      };
    source.sourceIdentityBinding = jsonBinding(
      'presentation-real-data-source-identity-v001',
      'fixtures/meaning-package/runner/source-identity.json',
      sourceIdentity,
    );
    await writeFixtureJson(
      workspaceRoot,
      source.sourceIdentityBinding.path,
      sourceIdentity,
    );
    if (code === 'RETAINED_ATOMS_BINDING_MISMATCH') {
      await writeFixtureBytes(
        workspaceRoot,
        source.retainedSourceAtomsBinding.sourceAtoms.path,
        Buffer.from('{"schemaVersion":"presentation-retained-source-atoms-v001"}\n', 'utf8'),
      );
    }
    job.timelineCompositionDecisionBinding = jsonBinding(
      timelineDecision.schemaVersion,
      'fixtures/meaning-package/runner/timeline-decision.json',
      timelineDecision,
    );
    await writeFixtureJson(
      workspaceRoot,
      job.timelineCompositionDecisionBinding.path,
      timelineDecision,
    );
    const jobPath =
      `evals/clip_composition/outputs/presentation/meaning-information-jobs/${job.jobId}.json`;
    await writeFixtureJson(workspaceRoot, jobPath, job);
    return await runPresentationMeaningInformationPackageJobV001({
      workspaceRoot,
      jobPath,
      executedAt: '2026-08-03T00:00:00Z',
    });
  } finally {
    await rm(workspaceRoot, {recursive: true, force: true});
  }
};

const CLI_RETAINED_ROOT =
  'evals/clip_composition/outputs/presentation/retained-source-atoms/'
  + 'qdczJpv8RCc-candidate-59-v001';

const listWorkspaceFiles = async (root, relativeRoot = '') => {
  const entries = await readdir(path.join(root, relativeRoot), {withFileTypes: true});
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

const makeMeaningPackageCliWorkspace = async ({corruptJobBinding = false} = {}) => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'zev-mip-cli-v001-'));
  try {
    const retainedPaths = {
      sourceAtoms: `${CLI_RETAINED_ROOT}/source-atoms.json`,
      generationManifest: `${CLI_RETAINED_ROOT}/generation-manifest.json`,
      validationReport: `${CLI_RETAINED_ROOT}/validation-report.json`,
    };
    const retainedBytes = {};
    const retainedValues = {};
    for (const [name, sourcePath] of Object.entries(retainedPaths)) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, sourcePath));
      retainedBytes[name] = bytes;
      retainedValues[name] = JSON.parse(bytes.toString('utf8'));
    }

    const fixtureRoot = 'fixtures/meaning-package/cli';
    const retainedSourceAtomsBinding = {
      sourceAtoms: jsonBinding(
        retainedValues.sourceAtoms.schemaVersion,
        `${fixtureRoot}/source-atoms.json`,
        retainedValues.sourceAtoms,
      ),
      generationManifest: jsonBinding(
        retainedValues.generationManifest.schemaVersion,
        `${fixtureRoot}/generation-manifest.json`,
        retainedValues.generationManifest,
      ),
      validationReport: jsonBinding(
        retainedValues.validationReport.schemaVersion,
        `${fixtureRoot}/validation-report.json`,
        retainedValues.validationReport,
      ),
    };
    const mediaBytes = Buffer.from('meaning-package-cli-media-v001', 'utf8');
    const media = {path: `${fixtureRoot}/source.mp4`, fileSha256: sha256(mediaBytes)};
    const support = Object.fromEntries(
      ['media-equivalence', 'stt-manifest', 'transcript', 'word-timestamps'].map(name => {
        const bytes = Buffer.from(`meaning-package-cli-${name}-v001`, 'utf8');
        return [name, {
          bytes,
          binding: {path: `${fixtureRoot}/${name}.json`, fileSha256: sha256(bytes)},
        }];
      }),
    );
    const sourceIdentity = {
      schemaVersion: 'presentation-real-data-source-identity-v001',
      sourceIdentityId: 'meaning-package-cli-source-identity-v001',
      videoId: 'qdczJpv8RCc',
      sourceUrl: 'https://www.youtube.com/watch?v=qdczJpv8RCc',
      sourceProvenance: 'meaning-package-cli-fixture-v001',
      sourceRef: retainedValues.sourceAtoms.sourceRef,
      executionMedia: media,
      mediaEquivalence: support['media-equivalence'].binding,
      stt: {
        manifest: support['stt-manifest'].binding,
        transcript: support.transcript.binding,
        wordTimestamps: support['word-timestamps'].binding,
      },
    };
    const sourceIdentityBinding = jsonBinding(
      sourceIdentity.schemaVersion,
      `${fixtureRoot}/source-identity.json`,
      sourceIdentity,
    );
    const retainedSegment = retainedValues.sourceAtoms.selection.segments[0];
    const source = {
      sourceMediaId: 'source-media-000001',
      sourceRef: retainedValues.sourceAtoms.sourceRef,
      sourceStartMs: retainedSegment.sourceStartMs,
      sourceEndMs: retainedSegment.sourceEndMs,
      sourceAtoms: retainedValues.sourceAtoms,
      generationManifest: retainedValues.generationManifest,
      validationReport: retainedValues.validationReport,
      sourceMedia: {
        sourceMediaId: 'source-media-000001',
        ordinal: 1,
        sourceRef: retainedValues.sourceAtoms.sourceRef,
        mediaBinding: media,
        sourceIdentityBinding,
        retainedSourceAtomsBinding,
      },
    };
    const sources = [source];
    const timelineDecision = makeTimelineDecision(sources);
    const timelineBinding = jsonBinding(
      timelineDecision.schemaVersion,
      `${fixtureRoot}/timeline-decision.json`,
      timelineDecision,
    );
    const sourcePackage = makeMeaningSourcePackage({
      sources,
      timelineDecision,
      timelineBinding,
    });
    const sourcePackageBinding = jsonBinding(
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
      selectionId: `presentation-meaning-boundary-selection-${B1_SUFFIX}`,
      sourcePackageBinding,
      b6ManifestBinding: {
        schemaVersion: 'presentation-meaning-boundary-b6-manifest-v001',
        path: `${fixtureRoot}/b6-manifest.json`,
        fileSha256: H('a'),
        canonicalSha256: H('b'),
      },
      providerEnvelopeBinding: {
        schemaVersion: 'presentation-meaning-boundary-provider-response-envelope-v001',
        path: `${fixtureRoot}/provider-envelope.json`,
        fileSha256: H('c'),
        canonicalSha256: H('d'),
      },
      response,
    };
    const semanticSelectionBinding = jsonBinding(
      semanticSelection.schemaVersion,
      `${fixtureRoot}/semantic-selection.json`,
      semanticSelection,
    );
    const captions = makeCaptionProjectionInput({sourcePackage, sources});
    const semanticValidation = {
      schemaVersion: 'presentation-caption-meaning-boundary-validation-report-v001',
      reportId: `presentation-meaning-boundary-validation-report-${B1_SUFFIX}`,
      status: 'passed',
      sourcePackageBinding,
      rawResponseBinding: {path: `${fixtureRoot}/raw-response.json`, fileSha256: H('e')},
      selectionBinding: semanticSelectionBinding,
      checks: B1_CHECK_NAMES.map(name => ({
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
          fileSha256: H('1'),
          role: 'meaning-selection',
        },
        {
          path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
          fileSha256: H('2'),
          role: 'meaning-source-package',
        },
        {
          path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
          fileSha256: H('3'),
          role: 'strict-json-codec',
        },
      ],
    };
    const semanticValidationBinding = jsonBinding(
      semanticValidation.schemaVersion,
      `${fixtureRoot}/semantic-validation.json`,
      semanticValidation,
    );
    const jobId = corruptJobBinding
      ? 'mip-cli-rejected-v001'
      : 'mip-cli-passed-v001';
    const implementationBindings = [];
    for (const {path: implementationPath, role} of
      PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, implementationPath));
      await writeFixtureBytes(workspaceRoot, implementationPath, bytes);
      implementationBindings.push({
        path: implementationPath,
        fileSha256: sha256(bytes),
        role,
      });
    }
    if (corruptJobBinding) implementationBindings[0].fileSha256 = H('f');
    for (const binding of PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, binding.path));
      assert.equal(sha256(bytes), binding.fileSha256);
      await writeFixtureBytes(workspaceRoot, binding.path, bytes);
    }
    const job = {
      schemaVersion: PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
      jobId,
      packageId: `${jobId}-meaning-information`,
      title: {text: '', inputMode: 'none'},
      timelineCompositionDecisionBinding: timelineBinding,
      semanticSelectionValidationBinding: semanticValidationBinding,
      semanticSelectionBinding,
      outputPath:
        `evals/clip_composition/outputs/presentation/meaning-information-packages/`
        + `${jobId}-meaning-information/meaning-information-package.json`,
      implementationBindings,
      approvedContractBindings:
        clone(PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001),
    };
    const jobPath =
      `evals/clip_composition/outputs/presentation/meaning-information-jobs/${jobId}.json`;

    await writeFixtureBytes(workspaceRoot, media.path, mediaBytes);
    for (const {bytes, binding} of Object.values(support)) {
      await writeFixtureBytes(workspaceRoot, binding.path, bytes);
    }
    await writeFixtureJson(workspaceRoot, sourceIdentityBinding.path, sourceIdentity);
    await writeFixtureBytes(
      workspaceRoot,
      retainedSourceAtomsBinding.sourceAtoms.path,
      retainedBytes.sourceAtoms,
    );
    await writeFixtureBytes(
      workspaceRoot,
      retainedSourceAtomsBinding.generationManifest.path,
      retainedBytes.generationManifest,
    );
    await writeFixtureBytes(
      workspaceRoot,
      retainedSourceAtomsBinding.validationReport.path,
      retainedBytes.validationReport,
    );
    await writeFixtureJson(workspaceRoot, timelineBinding.path, timelineDecision);
    await writeFixtureJson(workspaceRoot, sourcePackageBinding.path, sourcePackage);
    await writeFixtureJson(
      workspaceRoot,
      semanticSelectionBinding.path,
      semanticSelection,
    );
    await writeFixtureJson(
      workspaceRoot,
      semanticValidationBinding.path,
      semanticValidation,
    );
    await writeFixtureJson(workspaceRoot, jobPath, job);
    return {
      workspaceRoot,
      jobPath,
      expectedPackage: buildPresentationMeaningInformationPackageV001({
        job,
        jobBinding: jsonBinding(job.schemaVersion, jobPath, job),
        timelineDecision,
        sourcePackage,
        semanticValidation,
        semanticSelection,
        retainedSources: [{
          sourceMediaId: source.sourceMediaId,
          sourceAtoms: retainedValues.sourceAtoms,
          generationManifest: retainedValues.generationManifest,
          validationReport: retainedValues.validationReport,
        }],
      }),
      cleanup: () => rm(workspaceRoot, {recursive: true, force: true}),
    };
  } catch (error) {
    await rm(workspaceRoot, {recursive: true, force: true});
    throw error;
  }
};

test('MIP001: 2 sourceと同一selection再利用を異なるAtomRef occurrenceのままpackage化する', async () => {
  const fixture = makeFixture();
  assert.equal(fixture.built.package.sourceMedia.length, 2);
  assert.equal(fixture.built.package.timelineComposition.segments.length, 3);
  assert.equal(fixture.built.package.captions.length, 3);
  const sourceOneAtom = fixture.sources[0].sourceAtoms.rawSourceAtoms[0].atomId;
  const repeated = fixture.built.expectedAtomOccurrences.filter(ref =>
    ref.sourceMediaId === fixture.sources[0].sourceMediaId && ref.atomId === sourceOneAtom);
  assert.deepEqual(repeated.map(({timelineSegmentId}) => timelineSegmentId), [
    'segment-0001',
    'segment-0003',
  ]);
  assert.equal(new Set(fixture.built.expectedAtomOccurrences.map(occurrenceKey)).size,
    fixture.built.expectedAtomOccurrences.length);
  assert.deepEqual(
    fixture.sourcePackage.timelineCompositionDecisionBinding,
    fixture.job.timelineCompositionDecisionBinding,
  );
  assert.deepEqual(
    fixture.semanticValidation.sourcePackageBinding,
    fixture.semanticSelection.sourcePackageBinding,
  );

  const workspace = await makeMeaningPackageCliWorkspace();
  try {
    assert.equal(workspace.expectedPackage.status, 'passed');
    const filesBeforeImport = await listWorkspaceFiles(workspace.workspaceRoot);
    const imported = spawnSync(process.execPath, [
      '--input-type=module',
      '--eval',
      `await import(${JSON.stringify(pathToFileURL(MEANING_PACKAGE_CLI_PATH).href)})`,
    ], {cwd: workspace.workspaceRoot, encoding: null});
    assert.equal(imported.status, 0);
    assert.equal(imported.stdout.length, 0);
    assert.equal(imported.stderr.length, 0);
    assert.deepEqual(await listWorkspaceFiles(workspace.workspaceRoot), filesBeforeImport);

    const cli = spawnSync(process.execPath, [MEANING_PACKAGE_CLI_PATH, workspace.jobPath], {
      cwd: workspace.workspaceRoot,
      encoding: null,
    });
    assert.equal(cli.status, 0);
    assert.equal(cli.stderr.length, 0);
    assert.deepEqual(cli.stdout, formalBytes(workspace.expectedPackage.package));
  } finally {
    await workspace.cleanup();
  }

  const timelineRereadWorkspace = await mkdtemp(
    path.join(os.tmpdir(), 'zev-timeline-reread-v001-'),
  );
  try {
    const trackedPath = 'tracked/source-media.bin';
    const original = Buffer.alloc((2 * 1024 * 1024) + 17, 0x61);
    original.write('timeline-input-original\n', 0, 'utf8');
    const tracked = [{
      path: trackedPath,
      fileSha256: sha256(original),
      code: 'SOURCE_MEDIA_BINDING_MISMATCH',
      pointer: '/timelineDecision/sourceMedia',
      readMode: 'streaming-sha256',
    }];
    await writeFixtureBytes(timelineRereadWorkspace, trackedPath, original);
    assert.deepEqual(
      await observePresentationMeaningWorkspaceFileStableStreamingV001({
        workspaceRoot: timelineRereadWorkspace,
        relativePath: trackedPath,
      }),
      {fileSha256: sha256(original), byteLength: original.length},
    );
    assert.deepEqual(
      await inspectPresentationTimelineInputsBeforePublicationV001({
        workspaceRoot: timelineRereadWorkspace,
        tracked,
      }),
      {status: 'passed'},
    );
    await writeFixtureBytes(
      timelineRereadWorkspace,
      trackedPath,
      Buffer.from('timeline-input-replaced\n', 'utf8'),
    );
    assert.deepEqual(
      await inspectPresentationTimelineInputsBeforePublicationV001({
        workspaceRoot: timelineRereadWorkspace,
        tracked,
      }),
      {status: 'rejected', changed: tracked[0]},
    );
    await rm(path.join(timelineRereadWorkspace, trackedPath));
    assert.deepEqual(
      await inspectPresentationTimelineInputsBeforePublicationV001({
        workspaceRoot: timelineRereadWorkspace,
        tracked,
      }),
      {status: 'fatal'},
    );
    await writeFixtureBytes(timelineRereadWorkspace, trackedPath, original);
    const symlinkPath = 'tracked/source-media-link.bin';
    await symlink('source-media.bin', path.join(timelineRereadWorkspace, symlinkPath));
    assert.deepEqual(
      await inspectPresentationTimelineInputsBeforePublicationV001({
        workspaceRoot: timelineRereadWorkspace,
        tracked: [{...tracked[0], path: symlinkPath}],
      }),
      {status: 'fatal'},
    );
    const hardlinkPath = path.join(timelineRereadWorkspace, 'tracked/source-media-hardlink.bin');
    await link(path.join(timelineRereadWorkspace, trackedPath), hardlinkPath);
    assert.deepEqual(
      await inspectPresentationTimelineInputsBeforePublicationV001({
        workspaceRoot: timelineRereadWorkspace,
        tracked,
      }),
      {status: 'fatal'},
    );
  } finally {
    await rm(timelineRereadWorkspace, {recursive: true, force: true});
  }

  assert.deepEqual(PRESENTATION_TIMELINE_COMPOSITION_DECISION_VIOLATION_CODES_V001, [
    'MEANING_JOB_INVALID',
    'MEANING_JOB_BINDING_MISMATCH',
    'TIMELINE_DECISION_INVALID',
    'SOURCE_IDENTITY_INVALID',
    'SOURCE_MEDIA_BINDING_MISMATCH',
    'TIMELINE_SEGMENT_SOURCE_UNRESOLVED',
    'TIMELINE_SELECTION_SET_MISMATCH',
    'MEANING_PUBLICATION_TARGET_INVALID',
    'MEANING_PUBLICATION_FAILED',
  ]);
  assert.equal(
    (await runTimelineSourceObservationScenario({scenario: 'passed'})).status,
    'passed',
  );
  assert.deepEqual(
    await runTimelineSourceObservationScenario({scenario: 'media-mismatch'}),
    {
      status: 'rejected',
      violations: [{
        code: 'SOURCE_MEDIA_BINDING_MISMATCH',
        path: '/timelineDecision/sourceMedia',
        relatedIds: [],
      }],
    },
  );
  assert.deepEqual(
    await runTimelineSourceObservationScenario({scenario: 'identity-invalid'}),
    {
      status: 'rejected',
      violations: [{
        code: 'SOURCE_IDENTITY_INVALID',
        path: '/timelineDecision/sourceMedia',
        relatedIds: [],
      }],
    },
  );
  assert.deepEqual(
    await runTimelineSourceObservationScenario({scenario: 'media-missing'}),
    {status: 'fatal', violations: []},
  );
});

const FAILURE_STAGE = Object.freeze({
  MEANING_JOB_INVALID: 'job-validation',
  MEANING_JOB_BINDING_MISMATCH: 'job-validation',
  TIMELINE_DECISION_INVALID: 'input-validation',
  TIMELINE_DECISION_BINDING_MISMATCH: 'input-validation',
  SOURCE_IDENTITY_INVALID: 'input-validation',
  SOURCE_MEDIA_BINDING_MISMATCH: 'input-validation',
  RETAINED_ATOMS_BUNDLE_INVALID: 'input-validation',
  RETAINED_ATOMS_BINDING_MISMATCH: 'input-validation',
  TIMELINE_SEGMENT_SOURCE_UNRESOLVED: 'input-validation',
  TIMELINE_SEGMENT_SELECTION_UNRESOLVED: 'input-validation',
  TIMELINE_SELECTION_SET_MISMATCH: 'input-validation',
  SOURCE_ATOM_UNRESOLVED: 'input-validation',
  SOURCE_ATOM_PARTIAL_INTERSECTION: 'input-validation',
  EXPECTED_ATOM_OCCURRENCE_INVALID: 'input-validation',
  SEMANTIC_VALIDATION_INVALID: 'input-validation',
  SEMANTIC_VALIDATION_BINDING_MISMATCH: 'input-validation',
  CAPTION_COUNT_INVALID: 'input-validation',
  CAPTION_ATOM_COVERAGE_MISMATCH: 'input-validation',
  CAPTION_ATOM_SEQUENCE_MISMATCH: 'input-validation',
  CAPTION_SEGMENT_SPAN_INVALID: 'input-validation',
  CAPTION_TEXT_MISMATCH: 'input-validation',
  CAPTION_ANCHOR_MISMATCH: 'input-validation',
  CAPTION_SOURCE_TIME_MISMATCH: 'input-validation',
  TITLE_INPUT_MISMATCH: 'input-validation',
  SEMANTIC_OBSERVATIONS_NOT_EMPTY: 'input-validation',
  PRESENTATION_KEY_LEAKED: 'input-validation',
  MEANING_PACKAGE_BYTE_INVALID: 'package-build',
  MEANING_PACKAGE_NON_DETERMINISTIC: 'determinism',
  MEANING_PUBLICATION_TARGET_INVALID: 'job-validation',
  MEANING_PUBLICATION_FAILED: 'publication',
});

const FAILURE_CASES = Object.freeze([
  {id: 'MIP002', code: 'MEANING_JOB_INVALID', path: '/job'},
  {id: 'MIP003', code: 'MEANING_JOB_BINDING_MISMATCH', path: '/job'},
  {id: 'MIP004', code: 'TIMELINE_DECISION_INVALID', path: '/timelineDecision'},
  {id: 'MIP005', code: 'TIMELINE_DECISION_BINDING_MISMATCH', path: '/timelineDecision'},
  {id: 'MIP006', code: 'SOURCE_IDENTITY_INVALID', path: '/timelineDecision/sourceMedia'},
  {id: 'MIP007', code: 'SOURCE_MEDIA_BINDING_MISMATCH', path: '/timelineDecision/sourceMedia'},
  {id: 'MIP008', code: 'RETAINED_ATOMS_BUNDLE_INVALID', path: '/retainedSources'},
  {id: 'MIP009', code: 'RETAINED_ATOMS_BINDING_MISMATCH', path: '/retainedSources'},
  {id: 'MIP010', code: 'TIMELINE_SEGMENT_SOURCE_UNRESOLVED', path: '/timelineDecision/segments'},
  {id: 'MIP011', code: 'TIMELINE_SEGMENT_SELECTION_UNRESOLVED', path: '/timelineDecision/segments'},
  {id: 'MIP012', code: 'TIMELINE_SELECTION_SET_MISMATCH', path: '/timelineDecision/segments'},
  {id: 'MIP013', code: 'SOURCE_ATOM_UNRESOLVED', path: '/retainedSources'},
  {id: 'MIP014', code: 'SOURCE_ATOM_PARTIAL_INTERSECTION', path: '/retainedSources'},
  {id: 'MIP015', code: 'EXPECTED_ATOM_OCCURRENCE_INVALID', path: '/expectedAtomOccurrences'},
  {id: 'MIP016', code: 'SEMANTIC_VALIDATION_INVALID', path: '/sourcePackage'},
  {id: 'MIP017', code: 'SEMANTIC_VALIDATION_BINDING_MISMATCH', path: '/semanticValidation/selectionBinding'},
  {id: 'MIP018', code: 'CAPTION_COUNT_INVALID', path: '/candidatePackage/captions'},
  {id: 'MIP019', code: 'CAPTION_ATOM_COVERAGE_MISMATCH', path: '/candidatePackage/captions'},
  {id: 'MIP020', code: 'CAPTION_ATOM_SEQUENCE_MISMATCH', path: '/candidatePackage/captions'},
  {id: 'MIP021', code: 'CAPTION_SEGMENT_SPAN_INVALID', path: '/candidatePackage/captions'},
  {id: 'MIP022', code: 'CAPTION_TEXT_MISMATCH', path: '/candidatePackage/captions'},
  {id: 'MIP023', code: 'CAPTION_ANCHOR_MISMATCH', path: '/candidatePackage/captions'},
  {id: 'MIP024', code: 'CAPTION_SOURCE_TIME_MISMATCH', path: '/candidatePackage/captions'},
  {id: 'MIP025', code: 'TITLE_INPUT_MISMATCH', path: '/candidatePackage/title'},
  {id: 'MIP026', code: 'SEMANTIC_OBSERVATIONS_NOT_EMPTY', path: '/candidatePackage/semanticObservations'},
  {id: 'MIP027', code: 'PRESENTATION_KEY_LEAKED', path: '/candidatePackage'},
  {id: 'MIP028', code: 'MEANING_PACKAGE_BYTE_INVALID', path: '/candidatePackage'},
  {id: 'MIP029', code: 'MEANING_PACKAGE_NON_DETERMINISTIC', path: '/candidatePackage'},
  {id: 'MIP030', code: 'MEANING_PUBLICATION_TARGET_INVALID', path: '/job/outputPath'},
  {id: 'MIP031', code: 'MEANING_PUBLICATION_FAILED', path: '/job/outputPath'},
]);

const actualViolationFor = async (code, fixture) => {
  const build = overrides => buildPresentationMeaningInformationPackageV001({
    job: fixture.job,
    jobBinding: fixture.jobBinding,
    timelineDecision: fixture.timelineDecision,
    sourcePackage: fixture.sourcePackage,
    semanticValidation: fixture.semanticValidation,
    semanticSelection: fixture.semanticSelection,
    retainedSources: fixture.retainedSources,
    ...overrides,
  });
  const validatePackage = (packageValue, context = fixture.validationContext) =>
    validatePresentationMeaningInformationPackageV001(packageValue, context);
  if (code === 'MEANING_JOB_INVALID') {
    const malformed = build({job: {...fixture.job, unknown: true}});
    assert.equal(malformed.status, 'rejected');
    assert.deepEqual(malformed.violations, [{
      code: 'MEANING_JOB_INVALID',
      path: '/job',
      relatedIds: [],
    }]);
    const longJobId = `mip-${'a'.repeat(96)}`;
    const derivedTimelineOverflow = {
      ...fixture.job,
      jobId: longJobId,
      packageId: `${longJobId}-meaning-information`,
    };
    assert.equal(derivedTimelineOverflow.packageId.length, 120);
    assert.equal(`${derivedTimelineOverflow.packageId}-timeline`.length, 129);
    const overflow = build({job: derivedTimelineOverflow});
    assert.equal(overflow.status, 'rejected');
    assert.deepEqual(overflow.violations, malformed.violations);
    return malformed;
  }
  if (code === 'MEANING_JOB_BINDING_MISMATCH') {
    return build({jobBinding: {...fixture.jobBinding, fileSha256: 'invalid'}});
  }
  if (EARLY_RUNNER_CODES.has(code)) {
    const result = await runEarlyMeaningFailureV001(fixture, code);
    assert.equal(result.exitCode, 1);
    assert.notEqual(result.failureReport, null);
    return {
      status: result.status,
      violations: result.failureReport.violations,
      evidence: 'production-runner',
    };
  }
  if (code === 'TIMELINE_DECISION_INVALID') return build({timelineDecision: {}});
  if (code === 'TIMELINE_DECISION_BINDING_MISMATCH') {
    const changedTimeline = clone(fixture.timelineDecision);
    changedTimeline.segments[0].sourceEndMs += 1;
    return validatePackage(clone(fixture.built.package), {
      ...fixture.validationContext,
      timelineDecision: changedTimeline,
    });
  }
  if (code === 'RETAINED_ATOMS_BUNDLE_INVALID') {
    const retainedSources = clone(fixture.retainedSources);
    retainedSources[0].sourceAtoms = null;
    return derivePresentationExpectedAtomOccurrencesV001({
      timelineDecision: fixture.timelineDecision,
      retainedSources,
    });
  }
  if (code === 'TIMELINE_SEGMENT_SOURCE_UNRESOLVED') {
    return derivePresentationExpectedAtomOccurrencesV001({
      timelineDecision: fixture.timelineDecision,
      retainedSources: fixture.retainedSources.slice(0, 1),
    });
  }
  if (code === 'TIMELINE_SEGMENT_SELECTION_UNRESOLVED') {
    const retainedSources = clone(fixture.retainedSources);
    retainedSources[0].sourceAtoms.selection.segments.push(
      clone(retainedSources[0].sourceAtoms.selection.segments[0]),
    );
    return derivePresentationExpectedAtomOccurrencesV001({
      timelineDecision: fixture.timelineDecision,
      retainedSources,
    });
  }
  if (code === 'TIMELINE_SELECTION_SET_MISMATCH') {
    const retainedSources = clone(fixture.retainedSources);
    retainedSources[0].sourceAtoms.selection.segments[0].sourceStartMs += 1;
    return derivePresentationExpectedAtomOccurrencesV001({
      timelineDecision: fixture.timelineDecision,
      retainedSources,
    });
  }
  if (code === 'SOURCE_ATOM_UNRESOLVED') {
    const retainedSources = clone(fixture.retainedSources);
    retainedSources[0].sourceAtoms.rawSourceAtoms[1].atomId =
      retainedSources[0].sourceAtoms.rawSourceAtoms[0].atomId;
    return derivePresentationExpectedAtomOccurrencesV001({
      timelineDecision: fixture.timelineDecision,
      retainedSources,
    });
  }
  if (code === 'SOURCE_ATOM_PARTIAL_INTERSECTION') {
    const retainedSources = clone(fixture.retainedSources);
    retainedSources[0].sourceAtoms.rawSourceAtoms.unshift({
      atomId: 'partial-boundary-atom',
      speechId: 1,
      speaker: 'speaker-1',
      text: '境',
      startMs: 90,
      endMs: 110,
      sourceRef: fixture.sources[0].sourceRef,
    });
    return derivePresentationExpectedAtomOccurrencesV001({
      timelineDecision: fixture.timelineDecision,
      retainedSources,
    });
  }
  if (code === 'EXPECTED_ATOM_OCCURRENCE_INVALID') {
    const retainedSources = [
      clone(fixture.retainedSources[0]),
      clone(fixture.retainedSources[0]),
    ];
    return derivePresentationExpectedAtomOccurrencesV001({
      timelineDecision: fixture.timelineDecision,
      retainedSources,
    });
  }
  if (code === 'SEMANTIC_VALIDATION_INVALID') return build({sourcePackage: {}});
  if (code === 'SEMANTIC_VALIDATION_BINDING_MISMATCH') {
    const semanticSelection = clone(fixture.semanticSelection);
    semanticSelection.selectionId =
      'presentation-meaning-boundary-selection-ffffffffffffffffffffffffffffffff';
    return build({semanticSelection});
  }
  if (code === 'CAPTION_COUNT_INVALID') {
    const value = clone(fixture.built.package);
    value.captions = [];
    return validatePackage(value);
  }
  if (code === 'CAPTION_ATOM_COVERAGE_MISMATCH') {
    const value = clone(fixture.built.package);
    value.captions[0].atomRefs.pop();
    return validatePackage(value);
  }
  if (code === 'CAPTION_ATOM_SEQUENCE_MISMATCH') {
    const value = clone(fixture.built.package);
    value.captions[0].atomRefs.reverse();
    return validatePackage(value);
  }
  if (code === 'CAPTION_SEGMENT_SPAN_INVALID') {
    const value = clone(fixture.built.package);
    const context = clone(fixture.validationContext);
    value.captions[0].atomRefs[1].timelineSegmentId = 'segment-0002';
    context.expectedAtomOccurrences = value.captions.flatMap(caption => caption.atomRefs);
    const originalRecord = fixture.built.occurrenceAtoms.get(
      occurrenceKey(fixture.built.package.captions[0].atomRefs[1]),
    );
    context.occurrenceAtoms.set(occurrenceKey(value.captions[0].atomRefs[1]), originalRecord);
    return validatePackage(value, context);
  }
  if (code === 'CAPTION_TEXT_MISMATCH') {
    const value = clone(fixture.built.package);
    value.captions[0].text = '誤';
    return validatePackage(value);
  }
  if (code === 'CAPTION_ANCHOR_MISMATCH') {
    const value = clone(fixture.built.package);
    value.captions[0].startAnchor.edge = 'end';
    return validatePackage(value);
  }
  if (code === 'CAPTION_SOURCE_TIME_MISMATCH') {
    const value = clone(fixture.built.package);
    value.captions[0].sourceEndMs += 1;
    return validatePackage(value);
  }
  if (code === 'TITLE_INPUT_MISMATCH') {
    const value = clone(fixture.built.package);
    value.title = {text: '別題', inputMode: 'human'};
    return validatePackage(value);
  }
  if (code === 'SEMANTIC_OBSERVATIONS_NOT_EMPTY') {
    const value = clone(fixture.built.package);
    value.semanticObservations = [{}];
    return validatePackage(value);
  }
  if (code === 'PRESENTATION_KEY_LEAKED') {
    const value = clone(fixture.built.package);
    value.format = 'normal-landscape';
    return validatePackage(value);
  }
  if (code === 'MEANING_PACKAGE_BYTE_INVALID') {
    return validatePresentationMeaningInformationPackageFormalBytesV001(
      Buffer.from('{}\n', 'utf8'),
      fixture.validationContext,
    );
  }
  if (code === 'MEANING_PACKAGE_NON_DETERMINISTIC') {
    return inspectPresentationMeaningPackageDeterminismV001(
      Buffer.from('first', 'utf8'),
      Buffer.from('second', 'utf8'),
    );
  }
  if (code === 'MEANING_PUBLICATION_TARGET_INVALID') {
    const workspaceRoot = await mkdtemp(
      path.join(await realpath(os.tmpdir()), 'zev-mip-target-v001-'),
    );
    try {
      await mkdir(path.join(workspaceRoot, 'outside'));
      await symlink(path.join(workspaceRoot, 'outside'), path.join(workspaceRoot, 'linked'));
      await assert.rejects(
        ensurePresentationMeaningSafePublicationParentV001({
          workspaceRoot,
          absoluteParent: path.join(workspaceRoot, 'linked', 'child'),
        }),
        /unsafe-publication-parent/u,
      );
      const publicationClaim = await createPresentationMeaningOwnedStagingRootV001({
        workspaceRoot,
        relativeOutputRoot: 'formal/empty-target-race',
      });
      await writeFixtureBytes(
        workspaceRoot,
        `${publicationClaim.stagingRelative}/formal.json`,
        Buffer.from('{}\n', 'utf8'),
      );
      await mkdir(publicationClaim.outputAbsolute);
      const publication = await publishPresentationMeaningOwnedStagingRootNoReplaceV001({
        claim: publicationClaim,
        expectedRelativeFiles: ['formal.json'],
      });
      assert.equal(publication.status, 'target-exists');
      assert.deepEqual(await readdir(publicationClaim.outputAbsolute), []);
      assert.deepEqual(await readdir(publicationClaim.stagingAbsolute), ['formal.json']);

      const atomicClaim = await createPresentationMeaningOwnedStagingRootV001({
        workspaceRoot,
        relativeOutputRoot: 'formal/atomic-complete-set',
      });
      const completeSet = ['first.json', 'second.json'];
      for (const name of completeSet) {
        await writeFixtureBytes(
          workspaceRoot,
          `${atomicClaim.stagingRelative}/${name}`,
          Buffer.from(`${name}\n`, 'utf8'),
        );
      }
      const observedFinalSets = [];
      let observePublication = true;
      const observer = (async () => {
        while (observePublication) {
          try {
            observedFinalSets.push((await readdir(atomicClaim.outputAbsolute)).sort());
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            observedFinalSets.push(null);
          }
          await new Promise(resolve => setImmediate(resolve));
        }
      })();
      const atomicPublication = await publishPresentationMeaningOwnedStagingRootNoReplaceV001({
        claim: atomicClaim,
        expectedRelativeFiles: completeSet,
      });
      observePublication = false;
      await observer;
      observedFinalSets.push((await readdir(atomicClaim.outputAbsolute)).sort());
      assert.equal(atomicPublication.status, 'published');
      assert.equal(observedFinalSets.some(observed => observed === null), true);
      assert.equal(observedFinalSets.every(observed => observed === null
        || JSON.stringify(observed) === JSON.stringify(completeSet)), true);

      const failedClaim = await createPresentationMeaningOwnedStagingRootV001({
        workspaceRoot,
        relativeOutputRoot: 'formal/post-rename-failure',
      });
      const failedSet = Array.from(
        {length: 64},
        (_, index) => `file-${String(index).padStart(3, '0')}.json`,
      );
      for (const name of failedSet) {
        await writeFixtureBytes(
          workspaceRoot,
          `${failedClaim.stagingRelative}/${name}`,
          Buffer.from(`${name}\n`, 'utf8'),
        );
      }
      const mutateAfterVisibility = (async () => {
        const target = path.join(failedClaim.outputAbsolute, failedSet.at(-1));
        for (let attempt = 0; attempt < 10_000; attempt += 1) {
          try {
            await writeFile(target, Buffer.from('changed-after-rename\n', 'utf8'));
            return;
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            await new Promise(resolve => setImmediate(resolve));
          }
        }
        throw new Error('publication-target-never-became-visible');
      })();
      const failedPublication = publishPresentationMeaningOwnedStagingRootNoReplaceV001({
        claim: failedClaim,
        expectedRelativeFiles: failedSet,
      });
      const [publicationOutcome] = await Promise.allSettled([
        failedPublication,
        mutateAfterVisibility,
      ]);
      assert.equal(publicationOutcome.status, 'rejected');
      await assert.rejects(
        readdir(failedClaim.outputAbsolute),
        error => error.code === 'ENOENT',
      );
    } finally {
      await rm(workspaceRoot, {recursive: true, force: true});
    }
    return inspectPresentationMeaningPublicationTargetV001({
      outputPath: 'fixtures/not-the-formal-target.json',
      packageId: fixture.job.packageId,
    });
  }
  if (code === 'MEANING_PUBLICATION_FAILED') {
    return inspectPresentationMeaningPublicationExceptionV001(
      Object.assign(new Error('fixture publication failure'), {code: 'EIO'}),
    );
  }
  throw new Error(`unhandled fixed meaning information violation code: ${code}`);
};

const observedViolationCodes = [];
for (const entry of FAILURE_CASES) {
  const evidenceLabel = 'production入口で一件だけ発火してexact failure reportへ固定する';
  test(`${entry.id}: ${entry.code}を${evidenceLabel}`, async () => {
    const fixture = makeFixture();
    const result = await actualViolationFor(entry.code, fixture);
    assert.equal(
      result.status,
      entry.code === 'MEANING_PUBLICATION_FAILED' ? 'fatal' : 'rejected',
    );
    assert.deepEqual(result.violations, [{
      code: entry.code,
      path: entry.path,
      relatedIds: [],
    }]);
    const status = entry.code === 'MEANING_PUBLICATION_FAILED' ? 'fatal' : 'rejected';
    const report = buildPresentationMeaningInformationFailureReportV001({
      jobPath: fixture.jobBinding.path,
      jobBytes: formalBytes(fixture.job),
      jobValue: fixture.job,
      status,
      stage: FAILURE_STAGE[entry.code],
      violations: result.violations,
      environment: {
        nodePath: '/fixture/node',
        nodeFileSha256: H('0'),
        nodeVersion: 'v20.19.6',
        executedAt: '2026-08-03T00:00:00Z',
      },
    });
    assert.equal(validatePresentationMeaningInformationFailureReportV001(report), true);
    assert.deepEqual(report.violations, [
      {code: entry.code, path: entry.path, relatedIds: []},
    ]);
    if (entry.id === 'MIP002') {
      const fatalCli = spawnSync(process.execPath, [MEANING_PACKAGE_CLI_PATH], {
        encoding: null,
      });
      assert.equal(fatalCli.status, 2);
      assert.equal(fatalCli.stdout.length, 0);
      assert.equal(fatalCli.stderr.length, 0);
      const missingNodeWorkspace = await mkdtemp(
        path.join(os.tmpdir(), 'zev-mip-missing-node-v001-'),
      );
      try {
        await assert.rejects(
          observePresentationMeaningInformationNodeEnvironmentV001({
            executedAt: '2026-08-03T00:00:00Z',
            nodeExecutablePath: path.join(missingNodeWorkspace, 'missing-node'),
            nodeVersion: 'v20.19.6',
          }),
        );
      } finally {
        await rm(missingNodeWorkspace, {recursive: true, force: true});
      }
      assert.throws(() => buildPresentationMeaningInformationFailureReportV001({
        jobPath: fixture.jobBinding.path,
        jobBytes: formalBytes(fixture.job),
        jobValue: fixture.job,
        status: 'fatal',
        stage: 'input-read',
        violations: [],
        environment: {
          nodePath: null,
          nodeFileSha256: null,
          nodeVersion: null,
          executedAt: '2026-08-03T00:00:00Z',
        },
      }), /failure-report-invalid/u);
    }
    if (entry.id === 'MIP003') {
      const cliWorkspace = await makeMeaningPackageCliWorkspace({
        corruptJobBinding: true,
      });
      try {
        const rejectedCli = spawnSync(
          process.execPath,
          [MEANING_PACKAGE_CLI_PATH, cliWorkspace.jobPath],
          {cwd: cliWorkspace.workspaceRoot, encoding: null},
        );
        assert.equal(rejectedCli.status, 1);
        assert.equal(rejectedCli.stderr.length, 0);
        const rejectedReport = JSON.parse(rejectedCli.stdout.toString('utf8'));
        assert.equal(validatePresentationMeaningInformationFailureReportV001(
          rejectedReport,
        ), true);
        assert.deepEqual(rejectedReport.violations, [{
          code: 'MEANING_JOB_BINDING_MISMATCH',
          path: '/job',
          relatedIds: [],
        }]);
        assert.deepEqual(rejectedCli.stdout, formalBytes(rejectedReport));
      } finally {
        await cliWorkspace.cleanup();
      }

      const rereadWorkspace = await mkdtemp(path.join(os.tmpdir(), 'zev-mip-reread-v001-'));
      try {
        const trackedPath = 'tracked/input.json';
        const original = Buffer.alloc((2 * 1024 * 1024) + 19, 0x63);
        original.write('meaning-package-reread-original\n', 0, 'utf8');
        const tracked = [{
          path: trackedPath,
          fileSha256: sha256(original),
          code: 'MEANING_JOB_BINDING_MISMATCH',
          pointer: '/job',
          readMode: 'streaming-sha256',
        }];
        await writeFixtureBytes(rereadWorkspace, trackedPath, original);
        assert.deepEqual(
          await inspectPresentationMeaningTrackedInputsBeforePublicationV001({
            workspaceRoot: rereadWorkspace,
            tracked,
          }),
          {status: 'passed'},
        );
        await writeFixtureBytes(
          rereadWorkspace,
          trackedPath,
          Buffer.from('replacement\n', 'utf8'),
        );
        assert.deepEqual(
          await inspectPresentationMeaningTrackedInputsBeforePublicationV001({
            workspaceRoot: rereadWorkspace,
            tracked,
          }),
          {status: 'rejected', changed: tracked[0]},
        );
        await rm(path.join(rereadWorkspace, trackedPath));
        assert.deepEqual(
          await inspectPresentationMeaningTrackedInputsBeforePublicationV001({
            workspaceRoot: rereadWorkspace,
            tracked,
          }),
          {status: 'fatal', stage: 'input-read'},
        );
      } finally {
        await rm(rereadWorkspace, {recursive: true, force: true});
      }
    }
    observedViolationCodes.push(entry.code);
  });
}

test('MIP032: 同一入力2回のpackage formal byteが一致する', () => {
  const fixture = makeFixture();
  const first = buildPresentationMeaningInformationPackageV001({
    job: fixture.job,
    jobBinding: fixture.jobBinding,
    timelineDecision: fixture.timelineDecision,
    sourcePackage: fixture.sourcePackage,
    semanticValidation: fixture.semanticValidation,
    semanticSelection: fixture.semanticSelection,
    retainedSources: fixture.retainedSources,
  });
  const second = buildPresentationMeaningInformationPackageV001(clone({
    job: fixture.job,
    jobBinding: fixture.jobBinding,
    timelineDecision: fixture.timelineDecision,
    sourcePackage: fixture.sourcePackage,
    semanticValidation: fixture.semanticValidation,
    semanticSelection: fixture.semanticSelection,
    retainedSources: fixture.retainedSources,
  }));
  assert.equal(first.status, 'passed');
  assert.equal(second.status, 'passed');
  assert.equal(formalBytes(first.package).equals(formalBytes(second.package)), true);
});

test('MIP033: package code export集合と全テスト観測集合が完全一致する', () => {
  assert.deepEqual(
    observedViolationCodes,
    [...PRESENTATION_MEANING_INFORMATION_PACKAGE_VIOLATION_CODES_V001],
  );
});

test('MIP034: 工程入場envelopeは文脈なしで受理しfull検査は明示contextを要求する', () => {
  const fixture = makeFixture();
  assert.deepEqual(
    validatePresentationMeaningInformationPackageAdmissionEnvelopeV001(
      fixture.built.package,
    ),
    {status: 'passed', violations: []},
  );
  assert.deepEqual(
    validatePresentationMeaningInformationPackageV001(fixture.built.package),
    {
      status: 'rejected',
      violations: [{
        code: 'EXPECTED_ATOM_OCCURRENCE_INVALID',
        path: '/expectedAtomOccurrences',
        relatedIds: [],
      }],
    },
  );
  assert.deepEqual(
    validatePresentationMeaningInformationPackageV001(
      fixture.built.package,
      fixture.validationContext,
    ),
    {status: 'passed', violations: []},
  );
});
