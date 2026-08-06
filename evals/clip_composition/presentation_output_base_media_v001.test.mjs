import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, readdir, rm, rmdir, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001,
  PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
  buildPresentationMeaningInformationPackageV001,
  canonicalSha256PresentationMeaningInformationJsonV001,
  derivePresentationMeaningCaptionProjectionV001,
  derivePresentationMeaningSelectionProjectionV001,
  serializePresentationMeaningInformationFormalJsonV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES,
  PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES,
  buildPresentationRetainedSourceAtomsBundleFromNormalizedV001,
  sha256CanonicalV001 as canonicalSha256RetainedSourceAtomsV001,
} from './presentation_retained_source_atoms_v001.mjs';
import {
  hashAbsoluteStableStreaming,
  validatePresentationSourceIdentityV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  inspectPresentationBaseMediaSourceV001,
  inspectPresentationBaseMediaToolBinaryDiagnosticsV001,
} from './presentation_base_media_build_v001.mjs';
import {
  PRESENTATION_OUTPUT_BASE_MEDIA_ARTIFACT_NAMES_V001,
  PRESENTATION_OUTPUT_BASE_MEDIA_VIOLATION_CODES_V001,
  buildPresentationOutputBaseMediaFailureReportV001,
  buildPresentationOutputBaseMediaSuccessDocumentsV001,
  canonicalSha256PresentationOutputBaseMediaJsonV001,
  createPresentationOutputBaseMediaObservationsV001,
  presentationOutputBaseMediaStageForCodeV001,
  resolvePresentationOutputBaseMediaExecutionFailureV001,
  inspectPresentationOutputBaseMediaCapabilityObservationV001,
  serializePresentationOutputBaseMediaFormalJsonV001,
  sha256PresentationOutputBaseMediaBytesV001,
  validatePresentationOutputBaseMediaBuildJobV001,
  validatePresentationOutputBaseMediaCapabilityV001,
  validatePresentationOutputBaseMediaFailureReportV001,
  validatePresentationOutputBaseMediaGenerationManifestV001,
  validatePresentationOutputBaseMediaSuccessBundleV001,
  validatePresentationOutputBaseMediaValidationReceiptV001,
} from './presentation_output_base_media_v001.mjs';
import {
  observePresentationOutputBaseMediaFinalIntegrityV001,
  observePresentationOutputBaseMediaStagedMediaHashV001,
  observePresentationOutputBaseMediaValidationIoV001,
  runPresentationOutputBaseMediaJobCliV001,
  runPresentationOutputBaseMediaJobV001,
} from './run_presentation_output_base_media_job_v001.mjs';

const H = 'a'.repeat(64);
const PACKET_HASH = 'b'.repeat(64);
const EXECUTED_AT = '2026-08-03T00:00:00Z';
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUNNER_SOURCE_PATH =
  'evals/clip_composition/run_presentation_output_base_media_job_v001.mjs';
const OUTPUT_PRESENTATION_ROOT = 'evals/clip_composition/outputs/presentation';
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
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

const jsonBinding = (schemaVersion, bindingPath) => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: H,
  canonicalSha256: H,
});

const formalBytes = value => Buffer.from(
  serializePresentationMeaningInformationFormalJsonV001(value),
  'utf8',
);

const formalJsonBinding = (schemaVersion, bindingPath, value, bytes = formalBytes(value)) => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: sha256(bytes),
  canonicalSha256: canonicalSha256PresentationMeaningInformationJsonV001(value),
});

const retainedJsonBinding = (bindingPath, value, bytes) => ({
  schemaVersion: value.schemaVersion,
  path: bindingPath,
  fileSha256: sha256(bytes),
  canonicalSha256: canonicalSha256RetainedSourceAtomsV001(value),
});

const writeFixture = async (workspaceRoot, relativePath, bytes) => {
  const absolute = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolute), {recursive: true});
  await writeFile(absolute, bytes, {flag: 'wx'});
  return absolute;
};

const makeRetainedBundle = ({sourceRef, mediaFileSha256}) => {
  const rawSourceAtoms = [
    {
      atomId: 'word-1',
      speechId: 1,
      speaker: 'speaker-1',
      text: '字',
      startMs: 0,
      endMs: 500,
      sourceRef,
    },
    {
      atomId: 'word-2',
      speechId: 1,
      speaker: 'speaker-1',
      text: '幕',
      startMs: 500,
      endMs: 1000,
      sourceRef,
    },
  ];
  const segment = {
    timelineSegmentId: 'segment-0001',
    sourceStartMs: 0,
    sourceEndMs: 1000,
    outputStartFrame: 0,
    outputEndFrame: 30,
  };
  const supportBinding = name => ({
    path: `fixtures/obm-production/${name}.json`,
    fileSha256: H,
  });
  const implementationFiles = [
    {role: 'core', path: 'fixtures/obm-production/retained-core.mjs', fileSha256: H},
    {role: 'runner', path: 'fixtures/obm-production/retained-runner.mjs', fileSha256: H},
  ];
  const manifestRecord = role => ({
    role,
    path: `fixtures/obm-production/${role}.json`,
    fileSha256: H,
    schemaVersion: `obm-production-${role}-v001`,
  });
  const built = buildPresentationRetainedSourceAtomsBundleFromNormalizedV001({
    artifact: {
      artifactId: 'obm-production-retained-source-v001',
      candidateId: 1,
      declaredAtomGranularity: 'character-timestamp',
      sourceRef,
      sourceProvenance: 'output base-media production runner synthetic media',
      atomProvenance: {
        sttManifest: supportBinding('stt-manifest'),
        transcript: supportBinding('transcript'),
        wordTimestamps: supportBinding('word-timestamps'),
        candidateManifest: supportBinding('candidate-manifest'),
      },
    },
    selection: {
      candidateOuterRange: {startMs: 0, endMs: 1000},
      segments: [segment],
      sttAtoms: rawSourceAtoms.map((atom, sourceIndex) => ({...atom, sourceIndex})),
      speechGroups: [{
        speechId: 1,
        startMs: 0,
        endMs: 1000,
        text: rawSourceAtoms.map(atom => atom.text).join(''),
        characters: rawSourceAtoms.map(atom => ({
          characterId: atom.atomId,
          text: atom.text,
          startMs: atom.startMs,
          endMs: atom.endMs,
        })),
      }],
      expectedProjection: {
        sourceAtomCount: rawSourceAtoms.length,
        rawSourceAtomsCanonicalSha256: canonicalSha256RetainedSourceAtomsV001(rawSourceAtoms),
        segments: [{
          timelineSegmentId: segment.timelineSegmentId,
          atomCount: rawSourceAtoms.length,
          atomIdsCanonicalSha256: canonicalSha256RetainedSourceAtomsV001(
            rawSourceAtoms.map(atom => atom.atomId),
          ),
        }],
        speechGroups: [{speechId: 1, atomCount: rawSourceAtoms.length}],
      },
      assemblyDecisionId: 'obm-production-assembly-decision-v001',
      assemblyDecisionPayloadSha256: H,
      formalizationId: 'obm-production-formalization-v001',
      timelineId: 'obm-production-retained-timeline-v001',
      timelineFileSha256: H,
      baseMediaArtifactId: 'obm-production-source-media-v001',
      baseMediaFileSha256: mediaFileSha256,
    },
    generation: {
      job: {
        jobId: 'obm-production-retained-job-v001',
        path: 'fixtures/obm-production/retained-job.json',
        fileSha256: H,
      },
      implementationBinding: {
        gitCommit: '0'.repeat(40),
        files: implementationFiles,
      },
      implementation: {
        files: implementationFiles.map(item => ({
          role: item.role,
          path: item.path,
          actualFileSha256: item.fileSha256,
        })),
        runtime: {
          resolvedNodePath: process.execPath,
          nodeFileSha256: H,
          nodeVersion: process.version,
        },
      },
      directInputs: PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES
        .map(manifestRecord),
      expandedInputs: PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES
        .map(manifestRecord),
      sttAtomCount: rawSourceAtoms.length,
    },
  });
  assert.equal(built.status, 'passed');
  return built;
};

const prepareProductionRunnerFixture = async () => {
  const presentationAbsoluteRoot = path.join(REPOSITORY_ROOT, OUTPUT_PRESENTATION_ROOT);
  await mkdir(presentationAbsoluteRoot, {recursive: true});
  const fixtureAbsoluteRoot = await mkdtemp(path.join(
    presentationAbsoluteRoot,
    `.obm-production-${process.pid}-`,
  ));
  const fixtureRoot = path.relative(REPOSITORY_ROOT, fixtureAbsoluteRoot).split(path.sep).join('/');
  const token = path.basename(fixtureAbsoluteRoot).replaceAll(/[^A-Za-z0-9._-]/gu, '-');
  const requestId = `obm-${token}`;
  const meaningJobId = `${requestId}-meaning`;
  const packageId = `${meaningJobId}-meaning-information`;
  const packagePath = `${OUTPUT_PRESENTATION_ROOT}/meaning-information-packages/`
    + `${packageId}/meaning-information-package.json`;
  const baseMediaJobId = `${packageId}-output-base-media`;
  const jobPath = `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-jobs/`
    + `${baseMediaJobId}.json`;
  const outputRoot = `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media/${packageId}`;
  const failureRoot = `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-failures/`
    + `${baseMediaJobId}`;
  const cleanupPaths = [
    fixtureRoot,
    path.posix.dirname(packagePath),
    jobPath,
    outputRoot,
    failureRoot,
  ];

  try {
    const toolEnvironment = await inspectPresentationBaseMediaToolBinaryDiagnosticsV001();
    const sourcePath = `${fixtureRoot}/source/source.mp4`;
    const sourceAbsolute = path.join(REPOSITORY_ROOT, sourcePath);
    await mkdir(path.dirname(sourceAbsolute), {recursive: true});
    execFileSync(toolEnvironment.ffmpeg.resolvedPath, [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'color=c=0x202030:s=1920x1080:r=30:d=1',
      '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
      '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-movflags', '+faststart',
      '-y', sourceAbsolute,
    ], {stdio: 'pipe'});
    const sourceBytes = await readFile(sourceAbsolute);
    const mediaBinding = {path: sourcePath, fileSha256: sha256(sourceBytes)};
    const sourceRef = 'youtube:AAAAAAAAAAA';
    const retained = makeRetainedBundle({sourceRef, mediaFileSha256: mediaBinding.fileSha256});
    const retainedBindings = {};
    for (const [role, name, value, bytes] of [
      ['sourceAtoms', 'source-atoms.json', retained.sourceAtoms,
        retained.serialized.sourceAtomsBytes],
      ['generationManifest', 'generation-manifest.json', retained.generationManifest,
        retained.serialized.generationManifestBytes],
      ['validationReport', 'validation-report.json', retained.validationReport,
        retained.serialized.validationReportBytes],
    ]) {
      const relativePath = `${fixtureRoot}/retained/${name}`;
      await writeFixture(REPOSITORY_ROOT, relativePath, bytes);
      retainedBindings[role] = retainedJsonBinding(relativePath, value, bytes);
    }

    const support = Object.fromEntries(
      ['media-equivalence', 'stt-manifest', 'transcript', 'word-timestamps']
        .map(name => [name, {path: `${fixtureRoot}/source/${name}.json`, fileSha256: H}]),
    );
    const sourceIdentity = {
      schemaVersion: 'presentation-real-data-source-identity-v001',
      sourceIdentityId: `${requestId}-source-identity`,
      videoId: 'AAAAAAAAAAA',
      sourceUrl: 'https://www.youtube.com/watch?v=AAAAAAAAAAA',
      sourceProvenance: 'output base-media production runner synthetic media',
      sourceRef,
      executionMedia: mediaBinding,
      mediaEquivalence: support['media-equivalence'],
      stt: {
        manifest: support['stt-manifest'],
        transcript: support.transcript,
        wordTimestamps: support['word-timestamps'],
      },
    };
    assert.equal(validatePresentationSourceIdentityV001(sourceIdentity), true);
    const sourceIdentityPath = `${fixtureRoot}/source/source-identity.json`;
    const sourceIdentityBytes = formalBytes(sourceIdentity);
    await writeFixture(REPOSITORY_ROOT, sourceIdentityPath, sourceIdentityBytes);
    const sourceIdentityBinding = formalJsonBinding(
      sourceIdentity.schemaVersion,
      sourceIdentityPath,
      sourceIdentity,
      sourceIdentityBytes,
    );
    const sourceMedia = {
      sourceMediaId: 'source-media-000001',
      ordinal: 1,
      sourceRef,
      mediaBinding,
      sourceIdentityBinding,
      retainedSourceAtomsBinding: retainedBindings,
    };
    const timelineDecision = {
      schemaVersion: 'zev-timeline-composition-decision-v001',
      decisionId: `${requestId}-timeline-decision`,
      sourceMedia: [sourceMedia],
      segments: [{
        segmentId: 'segment-0001',
        ordinal: 1,
        sourceMediaId: sourceMedia.sourceMediaId,
        sourceStartMs: 0,
        sourceEndMs: 1000,
      }],
      decisionProvenance: {
        inputDecisionBinding: jsonBinding(
          'zev-timeline-composition-decision-job-v001',
          `${fixtureRoot}/timeline-decision-job.json`,
        ),
        recordedBy: 'human',
        recordedAt: EXECUTED_AT,
      },
    };
    const timelinePath = `${fixtureRoot}/timeline-decision.json`;
    const timelineBytes = formalBytes(timelineDecision);
    await writeFixture(REPOSITORY_ROOT, timelinePath, timelineBytes);
    const timelineBinding = formalJsonBinding(
      timelineDecision.schemaVersion,
      timelinePath,
      timelineDecision,
      timelineBytes,
    );

    const atoms = retained.sourceAtoms.rawSourceAtoms;
    const atomRefs = atoms.map(atom => ({
      timelineSegmentId: 'segment-0001',
      sourceMediaId: sourceMedia.sourceMediaId,
      atomId: atom.atomId,
    }));
    const boundaryCandidates = atoms.map((atom, index) => ({
      boundaryCandidateId: `segmenter-boundary-${String(index + 1).padStart(6, '0')}`,
      ordinal: index + 1,
      atomRefs: [atomRefs[index]],
      text: atom.text,
      startAnchor: {atomRef: atomRefs[index], edge: 'start'},
      endAnchor: {atomRef: atomRefs[index], edge: 'end'},
      sourceStartMs: atom.startMs,
      sourceEndMs: atom.endMs,
      isWordLike: true,
    }));
    const sourcePackage = {
      schemaVersion: 'presentation-meaning-boundary-source-package-v001',
      packageId: `${requestId}-meaning-source-package`,
      timelineCompositionDecisionBinding: timelineBinding,
      runtimeBinding: {
        segmenterSources: [{
          sourceMediaId: sourceMedia.sourceMediaId,
          preflightReportBinding: jsonBinding(
            'presentation-segmenter-boundary-preflight-report-v001',
            `${fixtureRoot}/segmenter-preflight.json`,
          ),
          evidenceBinding: jsonBinding(
            'presentation-segmenter-boundary-evidence-v001',
            `${fixtureRoot}/segmenter-evidence.json`,
          ),
          runtimeProjection: {
            nodeBinarySha256: H,
            nodeVersion: process.version,
            icuVersion: process.versions.icu,
            resolvedLocale: 'ja',
            resolvedGranularity: 'word',
          },
        }],
        strictJsonImplementationBinding: {
          path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
          fileSha256: H,
          role: 'strict-json',
        },
      },
      containers: [{
        containerId: 'segmenter-container-000001',
        ordinal: 1,
        sourceMediaId: sourceMedia.sourceMediaId,
        timelineSegmentId: 'segment-0001',
        boundaryCandidates,
      }],
      candidateOccurrenceMap: boundaryCandidates.map(candidate => ({
        boundaryCandidateId: candidate.boundaryCandidateId,
        timelineSegmentId: 'segment-0001',
        sourceMediaId: sourceMedia.sourceMediaId,
        sourceGateAContainerId: 'segmenter-container-000001',
        sourceGateABoundaryCandidateId: candidate.boundaryCandidateId,
        atomRefs: candidate.atomRefs,
      })),
      taskDescription: BOUNDARY_TASK,
      provenance: {
        sourcePackageJobBinding: jsonBinding(
          'presentation-meaning-boundary-source-package-job-v001',
          `${fixtureRoot}/meaning-source-package-job.json`,
        ),
        timelineCompositionDecisionBinding: timelineBinding,
        implementationBindings: [
          ['presentation_meaning_boundary_source_package_v001.mjs', 'meaning-source-package'],
          ['presentation_segmenter_boundary_evidence_v001.mjs', 'gate-a-core'],
          ['run_presentation_segmenter_boundary_preflight_v001.mjs', 'gate-a-preflight'],
          ['presentation_caption_semantic_source_package_v001.mjs', 'strict-json'],
        ].map(([name, role]) => ({
          path: `evals/clip_composition/${name}`,
          fileSha256: H,
          role,
        })),
      },
    };
    const sourcePackagePath = `${fixtureRoot}/meaning-source-package.json`;
    const sourcePackageBytes = formalBytes(sourcePackage);
    await writeFixture(REPOSITORY_ROOT, sourcePackagePath, sourcePackageBytes);
    const sourcePackageBinding = formalJsonBinding(
      sourcePackage.schemaVersion,
      sourcePackagePath,
      sourcePackage,
      sourcePackageBytes,
    );
    const response = {
      status: 'complete',
      containers: [{
        containerId: 'segmenter-container-000001',
        meaningGroups: [{
          meaningGroupEndBoundaryCandidateId: boundaryCandidates.at(-1).boundaryCandidateId,
        }],
      }],
    };
    const semanticSelection = {
      schemaVersion: 'presentation-meaning-boundary-selection-v001',
      selectionId: 'presentation-meaning-boundary-selection-0123456789abcdef0123456789abcdef',
      sourcePackageBinding,
      b6ManifestBinding: jsonBinding(
        'presentation-meaning-boundary-b6-manifest-v001',
        `${fixtureRoot}/b6-manifest.json`,
      ),
      providerEnvelopeBinding: jsonBinding(
        'presentation-meaning-boundary-provider-response-envelope-v001',
        `${fixtureRoot}/provider-envelope.json`,
      ),
      response,
    };
    const selectionPath = `${fixtureRoot}/semantic-selection.json`;
    const selectionBytes = formalBytes(semanticSelection);
    await writeFixture(REPOSITORY_ROOT, selectionPath, selectionBytes);
    const semanticSelectionBinding = formalJsonBinding(
      semanticSelection.schemaVersion,
      selectionPath,
      semanticSelection,
      selectionBytes,
    );
    const caption = {
      captionId: 'caption-000001',
      ordinal: 1,
      timelineSegmentId: 'segment-0001',
      text: atoms.map(atom => atom.text).join(''),
      atomRefs,
      startAnchor: {atomRef: atomRefs[0], edge: 'start'},
      endAnchor: {atomRef: atomRefs.at(-1), edge: 'end'},
      sourceStartMs: 0,
      sourceEndMs: 1000,
    };
    const semanticValidation = {
      schemaVersion: 'presentation-caption-meaning-boundary-validation-report-v001',
      reportId:
        'presentation-meaning-boundary-validation-report-0123456789abcdef0123456789abcdef',
      status: 'passed',
      sourcePackageBinding,
      rawResponseBinding: {path: `${fixtureRoot}/raw-response.json`, fileSha256: H},
      selectionBinding: semanticSelectionBinding,
      checks: B1_CHECK_NAMES.map(name => ({name, status: 'passed', violationCodes: []})),
      violations: [],
      selectionProjection: derivePresentationMeaningSelectionProjectionV001(response),
      captionProjection: derivePresentationMeaningCaptionProjectionV001([caption]),
      implementationBindings: [
        ['presentation_meaning_boundary_selection_v001.mjs', 'meaning-selection'],
        ['presentation_meaning_boundary_source_package_v001.mjs', 'meaning-source-package'],
        ['presentation_caption_semantic_source_package_v001.mjs', 'strict-json-codec'],
      ].map(([name, role]) => ({
        path: `evals/clip_composition/${name}`,
        fileSha256: H,
        role,
      })),
    };
    const semanticValidationPath = `${fixtureRoot}/semantic-validation.json`;
    const semanticValidationBytes = formalBytes(semanticValidation);
    await writeFixture(REPOSITORY_ROOT, semanticValidationPath, semanticValidationBytes);
    const semanticValidationBinding = formalJsonBinding(
      semanticValidation.schemaVersion,
      semanticValidationPath,
      semanticValidation,
      semanticValidationBytes,
    );
    const meaningJob = {
      schemaVersion: PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
      jobId: meaningJobId,
      packageId,
      title: {text: '', inputMode: 'none'},
      timelineCompositionDecisionBinding: timelineBinding,
      semanticSelectionValidationBinding: semanticValidationBinding,
      semanticSelectionBinding,
      outputPath: packagePath,
      implementationBindings: PRESENTATION_MEANING_INFORMATION_PACKAGE_IMPLEMENTATION_ROLES_V001
        .map(({path: implementationPath, role}, index) => ({
          path: implementationPath,
          fileSha256: String(index + 1).repeat(64).slice(0, 64),
          role,
        })),
      approvedContractBindings: structuredClone(
        PRESENTATION_MEANING_INFORMATION_PACKAGE_CONTRACT_BINDINGS_V001,
      ),
    };
    const meaningJobPath = `${fixtureRoot}/meaning-package-job.json`;
    const meaningJobBytes = formalBytes(meaningJob);
    await writeFixture(REPOSITORY_ROOT, meaningJobPath, meaningJobBytes);
    const meaningJobBinding = formalJsonBinding(
      meaningJob.schemaVersion,
      meaningJobPath,
      meaningJob,
      meaningJobBytes,
    );
    const built = buildPresentationMeaningInformationPackageV001({
      job: meaningJob,
      jobBinding: meaningJobBinding,
      timelineDecision,
      sourcePackage,
      semanticValidation,
      semanticSelection,
      retainedSources: [{
        sourceMediaId: sourceMedia.sourceMediaId,
        sourceAtoms: retained.sourceAtoms,
        generationManifest: retained.generationManifest,
        validationReport: retained.validationReport,
      }],
    });
    assert.equal(built.status, 'passed');
    const packageBytes = formalBytes(built.package);
    await writeFixture(REPOSITORY_ROOT, packagePath, packageBytes);
    const packageBinding = formalJsonBinding(
      built.package.schemaVersion,
      packagePath,
      built.package,
      packageBytes,
    );
    const job = {
      schemaVersion: 'presentation-output-base-media-build-job-v001',
      jobId: baseMediaJobId,
      mode: 'formal-generation',
      meaningPackageBinding: packageBinding,
      outputRoot,
      expectedTimelineCompositionCanonicalSha256:
        canonicalSha256PresentationOutputBaseMediaJsonV001(
          built.package.timelineComposition,
        ),
    };
    const jobBytes = serializePresentationOutputBaseMediaFormalJsonV001(job);
    await writeFixture(REPOSITORY_ROOT, jobPath, jobBytes);
    return {
      workspaceRoot: REPOSITORY_ROOT,
      cleanupPaths,
      job,
      jobPath,
      jobBytes,
      packageValue: built.package,
      packageBytes,
      sourceIdentity,
      sourceAbsolute,
      outputRoot,
    };
  } catch (error) {
    for (const relativePath of cleanupPaths.reverse()) {
      await rm(path.join(REPOSITORY_ROOT, relativePath), {recursive: true, force: true});
    }
    throw error;
  }
};

const cleanupProductionRunnerFixture = async fixture => {
  for (const relativePath of [...fixture.cleanupPaths].reverse()) {
    await rm(path.join(REPOSITORY_ROOT, relativePath), {recursive: true, force: true});
  }
  for (const relativePath of [
    `${OUTPUT_PRESENTATION_ROOT}/meaning-information-packages`,
    `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-jobs`,
    `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media`,
    `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-failures`,
  ]) {
    try { await rmdir(path.join(REPOSITORY_ROOT, relativePath)); } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY'].includes(error?.code)) throw error;
    }
  }
};

const captureBaseMediaCli = async argv => {
  const stdout = [];
  const stderr = [];
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  process.stdout.write = chunk => { stdout.push(Buffer.from(chunk)); return true; };
  process.stderr.write = chunk => { stderr.push(Buffer.from(chunk)); return true; };
  try {
    return {
      exitCode: await runPresentationOutputBaseMediaJobCliV001(argv),
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
};

const rootNamesOrEmpty = async relativePath => {
  try { return (await readdir(path.join(REPOSITORY_ROOT, relativePath))).sort(); } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
};

const makeSuccessFixture = () => {
  const atomRef = {
    timelineSegmentId: 'segment-0001',
    sourceMediaId: 'source-media-000001',
    atomId: 'obm-source-atom-000001',
  };
  const source = {
    sourceMediaId: 'source-media-000001',
    ordinal: 1,
    sourceRef: 'youtube:11111111111',
    mediaBinding: {path: 'fixtures/obm-source.mp4', fileSha256: H},
    sourceIdentityBinding: jsonBinding(
      'presentation-real-data-source-identity-v001',
      'fixtures/obm-source-identity.json',
    ),
    retainedSourceAtomsBinding: {
      sourceAtoms: jsonBinding(
        'presentation-retained-source-atoms-v001',
        'fixtures/obm-source-atoms.json',
      ),
      generationManifest: jsonBinding(
        'presentation-retained-source-atoms-generation-manifest-v001',
        'fixtures/obm-source-atoms-generation-manifest.json',
      ),
      validationReport: jsonBinding(
        'presentation-retained-source-atoms-validation-report-v001',
        'fixtures/obm-source-atoms-validation-report.json',
      ),
    },
  };
  const segment = {
    segmentId: 'segment-0001',
    ordinal: 1,
    sourceMediaId: source.sourceMediaId,
    sourceStartMs: 0,
    sourceEndMs: 1000,
  };
  const packageValue = {
    schemaVersion: 'zev-meaning-information-package-v001',
    packageId: 'obm-success-v001',
    sourceMedia: [source],
    timelineComposition: {
      timelineId: 'obm-success-v001-timeline',
      segments: [segment],
    },
    captions: [{
      captionId: 'caption-000001',
      ordinal: 1,
      timelineSegmentId: segment.segmentId,
      text: '甲',
      atomRefs: [atomRef],
      startAnchor: {atomRef, edge: 'start'},
      endAnchor: {atomRef, edge: 'end'},
      sourceStartMs: 0,
      sourceEndMs: 1000,
    }],
    title: {text: 'OBM fixture', inputMode: 'human'},
    semanticObservations: [],
    provenance: {
      formalJobBinding: jsonBinding(
        'zev-meaning-information-package-job-v001',
        'fixtures/obm-meaning-package-job.json',
      ),
      timelineCompositionBinding: jsonBinding(
        'zev-timeline-composition-decision-v001',
        'fixtures/obm-timeline-composition.json',
      ),
      semanticSelectionValidationBinding: jsonBinding(
        'presentation-caption-meaning-boundary-validation-report-v001',
        'fixtures/obm-semantic-validation.json',
      ),
    },
  };
  const packageBytes = serializePresentationOutputBaseMediaFormalJsonV001(packageValue);
  const jobPath = 'evals/clip_composition/outputs/presentation/'
    + 'meaning-output-base-media-jobs/obm-success-v001-output-base-media.json';
  const outputRoot = 'evals/clip_composition/outputs/presentation/'
    + 'meaning-output-base-media/obm-success-v001';
  const job = {
    schemaVersion: 'presentation-output-base-media-build-job-v001',
    jobId: 'obm-success-v001-output-base-media',
    mode: 'formal-generation',
    meaningPackageBinding: {
      schemaVersion: packageValue.schemaVersion,
      path: 'evals/clip_composition/outputs/presentation/'
        + 'meaning-information-packages/obm-success-v001/meaning-information-package.json',
      fileSha256: sha256PresentationOutputBaseMediaBytesV001(packageBytes),
      canonicalSha256: canonicalSha256PresentationOutputBaseMediaJsonV001(packageValue),
    },
    outputRoot,
    expectedTimelineCompositionCanonicalSha256:
      canonicalSha256PresentationOutputBaseMediaJsonV001(packageValue.timelineComposition),
  };
  const jobBytes = serializePresentationOutputBaseMediaFormalJsonV001(job);
  const sourceIdentity = {sourceProvenance: 'obm-source-provenance-v001'};
  const sourceInspection = {fps: 30, decodedFrameCount: 300, audioClock: {}};
  const mappings = [{
    segmentId: segment.segmentId,
    sourceStartMs: 0,
    sourceEndMs: 1000,
    sourceStartFrame30: 0,
    sourceEndFrame30: 30,
    outputStartFrame: 0,
    outputEndFrame: 30,
    audioSamples: {},
  }];
  const baseMediaBytes = Buffer.from('obm-success-base-media-v001', 'utf8');
  const outputInspection = {
    frameCount: 30,
    audio: {
      present: true,
      presentationDurationSamples: 48000,
      packetPayloadSha256: PACKET_HASH,
    },
  };
  const documents = buildPresentationOutputBaseMediaSuccessDocumentsV001({
    job,
    jobPath,
    jobBytes,
    packageValue,
    sourceIdentity,
    sourceInspection,
    mappings,
    baseMediaFileSha256: sha256PresentationOutputBaseMediaBytesV001(baseMediaBytes),
    frameCount: outputInspection.frameCount,
    sampleCount: outputInspection.audio.presentationDurationSamples,
    audioPacketPayloadSha256: outputInspection.audio.packetPayloadSha256,
  });
  return {
    job,
    jobPath,
    jobBytes,
    packageValue,
    packageBytes,
    sourceIdentity,
    sourceInspection,
    outputInspection,
    baseMediaBytes,
    documents,
  };
};

const validateSuccessFixture = fixture => validatePresentationOutputBaseMediaSuccessBundleV001({
  job: fixture.job,
  jobPath: fixture.jobPath,
  jobBytes: fixture.jobBytes,
  packageValue: fixture.packageValue,
  packageBytes: fixture.packageBytes,
  sourceIdentity: fixture.sourceIdentity,
  sourceInspection: fixture.sourceInspection,
  outputInspection: fixture.outputInspection,
  baseMediaBytes: fixture.baseMediaBytes,
  timelineBytes: fixture.documents.timelineBytes,
  timeline: fixture.documents.timeline,
  manifestBytes: fixture.documents.manifestBytes,
  manifest: fixture.documents.manifest,
  receiptBytes: fixture.documents.receiptBytes,
  receipt: fixture.documents.receipt,
});

const FAILURE_CASES = Object.freeze([
  ['OUTPUT_BASE_MEDIA_JOB_INVALID', 'job-validation', '', 'rejected'],
  ['OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH', 'meaning-package-read', '/meaningPackageBinding', 'rejected'],
  ['OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID', 'meaning-package-validation', '/meaningPackageBinding', 'rejected'],
  ['OUTPUT_BASE_MEDIA_CAPABILITY_UNSUPPORTED', 'timeline-mapping', '/timelineComposition', 'rejected'],
  ['OUTPUT_BASE_MEDIA_SOURCE_INSPECTION_FAILED', 'source-inspection', '/sourceMedia/0/mediaBinding', 'fatal'],
  ['OUTPUT_BASE_MEDIA_FRAME_MAPPING_INVALID', 'timeline-mapping', '/timelineComposition/segments', 'rejected'],
  ['OUTPUT_BASE_MEDIA_VIDEO_BUILD_FAILED', 'video-build', '/timelineComposition/segments', 'fatal'],
  ['OUTPUT_BASE_MEDIA_AUDIO_GRID_FAILED', 'audio-grid', '/sourceMedia/0/mediaBinding', 'fatal'],
  ['OUTPUT_BASE_MEDIA_AUDIO_BUILD_FAILED', 'audio-build', '/sourceMedia/0/mediaBinding', 'fatal'],
  ['OUTPUT_BASE_MEDIA_MUX_FAILED', 'mux', '/outputRoot', 'fatal'],
  ['OUTPUT_BASE_MEDIA_OUTPUT_INSPECTION_FAILED', 'media-inspection', '/outputRoot/base-media.mp4', 'fatal'],
  ['OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH', 'validation', '/outputRoot', 'rejected'],
  ['OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID', 'job-validation', '/outputRoot', 'rejected'],
  ['OUTPUT_BASE_MEDIA_PUBLICATION_FAILED', 'publication', '/outputRoot', 'fatal'],
]);

const makeFailureReport = ([code, stage]) => {
  const jobValue = {schemaVersion: 'obm-failure-fixture-v001'};
  const jobBytes = serializePresentationOutputBaseMediaFormalJsonV001(jobValue);
  return buildPresentationOutputBaseMediaFailureReportV001({
    jobPath: 'evals/clip_composition/outputs/presentation/'
      + 'meaning-output-base-media-jobs/obm-failure-fixture-v001.json',
    jobBytes,
    jobValue,
    meaningPackageBinding: code === 'OUTPUT_BASE_MEDIA_JOB_INVALID'
      ? null
      : jsonBinding(
        'zev-meaning-information-package-v001',
        'fixtures/obm-meaning-information-package.json',
      ),
    code,
    stage,
    observations: createPresentationOutputBaseMediaObservationsV001({
      'job-file-sha256': sha256PresentationOutputBaseMediaBytesV001(jobBytes),
    }),
    environment: {
      nodePath: null,
      nodeFileSha256: null,
      ffmpegPath: null,
      ffmpegFileSha256: null,
      ffprobePath: null,
      ffprobeFileSha256: null,
      executedAt: EXECUTED_AT,
    },
  });
};

const RUNNER_FAILURE_CODES = new Set([
  'OUTPUT_BASE_MEDIA_JOB_INVALID',
  'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH',
  'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID',
  'OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID',
  'OUTPUT_BASE_MEDIA_PUBLICATION_FAILED',
]);

const EXECUTION_EVENT_BY_CODE = new Map([
  ['OUTPUT_BASE_MEDIA_SOURCE_INSPECTION_FAILED', ['source-inspection-failed', {}]],
  ['OUTPUT_BASE_MEDIA_FRAME_MAPPING_INVALID', ['frame-mapping-invalid', {}]],
  ['OUTPUT_BASE_MEDIA_VIDEO_BUILD_FAILED', ['video-build-failed', {}]],
  ['OUTPUT_BASE_MEDIA_AUDIO_GRID_FAILED', [
    'audio-build-error',
    {errorPath: '$audio.sourceGrid'},
  ]],
  ['OUTPUT_BASE_MEDIA_AUDIO_BUILD_FAILED', [
    'audio-build-error',
    {errorPath: '$audio.encode'},
  ]],
  ['OUTPUT_BASE_MEDIA_MUX_FAILED', ['mux-failed', {}]],
  ['OUTPUT_BASE_MEDIA_OUTPUT_INSPECTION_FAILED', ['output-inspection-failed', {}]],
]);

const runEarlyBaseMediaFailureV001 = async code => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'obm-runner-v001-'));
  const fixture = makeSuccessFixture();
  const packageId = `obm-${code.toLowerCase().replaceAll('_', '-')}-v001`;
  const jobId = `${packageId}-output-base-media`;
  const jobPath = `evals/clip_composition/outputs/presentation/`
    + `meaning-output-base-media-jobs/${jobId}.json`;
  const job = structuredClone(fixture.job);
  job.jobId = jobId;
  job.outputRoot = `evals/clip_composition/outputs/presentation/meaning-output-base-media/${packageId}`;
  job.meaningPackageBinding.path =
    `evals/clip_composition/outputs/presentation/meaning-information-packages/`
    + `${packageId}/meaning-information-package.json`;
  let packageBytes = serializePresentationOutputBaseMediaFormalJsonV001({
    schemaVersion: 'zev-meaning-information-package-v001',
  });
  job.meaningPackageBinding.fileSha256 =
    code === 'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH'
      ? H
      : sha256PresentationOutputBaseMediaBytesV001(packageBytes);
  job.meaningPackageBinding.canonicalSha256 =
    canonicalSha256PresentationOutputBaseMediaJsonV001({
      schemaVersion: 'zev-meaning-information-package-v001',
    });
  const absoluteJobPath = path.join(workspaceRoot, jobPath);
  await mkdir(path.dirname(absoluteJobPath), {recursive: true});
  try {
    if (code === 'OUTPUT_BASE_MEDIA_JOB_INVALID') {
      const oldJob = {
        schemaVersion: 'presentation-base-media-build-job-v002',
        jobId,
      };
      await writeFile(absoluteJobPath, serializePresentationOutputBaseMediaFormalJsonV001(oldJob));
    } else {
      await writeFile(absoluteJobPath, serializePresentationOutputBaseMediaFormalJsonV001(job));
    }
    if ([
      'OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCH',
      'OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALID',
    ].includes(code)) {
      const packagePath = path.join(workspaceRoot, job.meaningPackageBinding.path);
      await mkdir(path.dirname(packagePath), {recursive: true});
      await writeFile(packagePath, packageBytes);
    }
    if (code === 'OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALID') {
      await mkdir(path.join(workspaceRoot, job.outputRoot), {recursive: true});
    }
    if (code === 'OUTPUT_BASE_MEDIA_PUBLICATION_FAILED') {
      const rootAsFile = path.join(
        workspaceRoot,
        'evals/clip_composition/outputs/presentation/meaning-output-base-media',
      );
      await mkdir(path.dirname(rootAsFile), {recursive: true});
      await writeFile(rootAsFile, 'not-a-directory');
    }
    return await runPresentationOutputBaseMediaJobV001({
      workspaceRoot,
      jobPath,
      executedAt: EXECUTED_AT,
    });
  } finally {
    await rm(workspaceRoot, {recursive: true, force: true});
  }
};

const observedCodes = [];
const exerciseFailureCase = async index => {
  const [code, stage, violationPath, status] = FAILURE_CASES[index];
  assert.equal(presentationOutputBaseMediaStageForCodeV001(code), stage);
  let report;
  let evidence;
  if (RUNNER_FAILURE_CODES.has(code)) {
    const result = await runEarlyBaseMediaFailureV001(code);
    assert.equal(result.exitCode, status === 'fatal' ? 2 : 1);
    assert.notEqual(result.failureReport, null);
    report = result.failureReport;
    evidence = 'production-runner';
  } else if (code === 'OUTPUT_BASE_MEDIA_CAPABILITY_UNSUPPORTED') {
    const fixture = makeSuccessFixture();
    const ownership = inspectPresentationOutputBaseMediaCapabilityObservationV001({
      capabilitySupported: validatePresentationOutputBaseMediaCapabilityV001(
        fixture.packageValue,
        {...fixture.sourceInspection, fps: 24},
      ),
    });
    assert.deepEqual(ownership, {
      status: 'rejected',
      stage,
      violations: [{code, path: violationPath, relatedIds: []}],
    });
    report = makeFailureReport(FAILURE_CASES[index]);
    evidence = 'production-shared-capability-observation';
  } else if (code === 'OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCH') {
    const fixture = makeSuccessFixture();
    fixture.documents.manifest.mediaBuildProjection.frameCount += 1;
    fixture.documents.manifestBytes = serializePresentationOutputBaseMediaFormalJsonV001(
      fixture.documents.manifest,
    );
    const validation = validateSuccessFixture(fixture);
    assert.deepEqual(validation.violations, [{code, path: violationPath, relatedIds: []}]);
    report = makeFailureReport(FAILURE_CASES[index]);
    evidence = 'production-success-bundle-validator';
  } else {
    assert.equal(EXECUTION_EVENT_BY_CODE.has(code), true);
    const [event, detail] = EXECUTION_EVENT_BY_CODE.get(code);
    const ownership = resolvePresentationOutputBaseMediaExecutionFailureV001(event, detail);
    assert.deepEqual(ownership, {code, stage, path: violationPath, status});
    report = makeFailureReport([ownership.code, ownership.stage]);
    evidence = 'production-shared-owner-report';
  }
  assert.equal(report.status, status);
  assert.equal(report.stage, stage);
  assert.deepEqual(report.violations, [{code, path: violationPath, relatedIds: []}]);
  assert.equal(validatePresentationOutputBaseMediaFailureReportV001(report), true);
  observedCodes.push(code);
  return evidence;
};

test('OBM001: 正常な単一sourceをproduction runnerで実生成し成功4成果物を検査する', async () => {
  const monitoredRoots = [
    `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-jobs`,
    `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media`,
    `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-failures`,
  ];
  const beforeModuleLoad = await Promise.all(monitoredRoots.map(rootNamesOrEmpty));
  await import(`./run_presentation_output_base_media_job_v001.mjs?obm001=${Date.now()}`);
  const afterModuleLoad = await Promise.all(monitoredRoots.map(rootNamesOrEmpty));
  assert.deepEqual(afterModuleLoad, beforeModuleLoad);

  const fixture = await prepareProductionRunnerFixture();
  try {
    assert.equal(
      await hashAbsoluteStableStreaming(fixture.sourceAbsolute),
      fixture.sourceIdentity.executionMedia.fileSha256,
    );
    const runnerSource = await readFile(path.join(REPOSITORY_ROOT, RUNNER_SOURCE_PATH), 'utf8');
    assert.match(runnerSource, /hashAbsoluteStableStreaming,/u);
    assert.doesNotMatch(runnerSource, /const hashFileHandle\s*=/u);
    const cli = await captureBaseMediaCli([fixture.jobPath]);
    assert.equal(cli.exitCode, 0);
    assert.equal(cli.stderr.length, 0);
    const outputAbsolute = path.join(REPOSITORY_ROOT, fixture.outputRoot);
    const artifactNames = (await readdir(outputAbsolute)).sort();
    assert.deepEqual(
      artifactNames,
      [...PRESENTATION_OUTPUT_BASE_MEDIA_ARTIFACT_NAMES_V001].sort(),
    );
    const artifacts = Object.fromEntries(await Promise.all(
      PRESENTATION_OUTPUT_BASE_MEDIA_ARTIFACT_NAMES_V001.map(async name => [
        name,
        await readFile(path.join(outputAbsolute, name)),
      ]),
    ));
    assert.deepEqual(cli.stdout, artifacts['validation-receipt.json']);
    const timeline = JSON.parse(artifacts['timeline.json'].toString('utf8'));
    const manifest = JSON.parse(artifacts['generation-manifest.json'].toString('utf8'));
    const receipt = JSON.parse(artifacts['validation-receipt.json'].toString('utf8'));
    assert.equal(validatePresentationOutputBaseMediaGenerationManifestV001(manifest), true);
    assert.equal(validatePresentationOutputBaseMediaValidationReceiptV001(receipt), true);
    const sourceInspection = await inspectPresentationBaseMediaSourceV001(
      fixture.sourceAbsolute,
    );
    assert.equal(validatePresentationOutputBaseMediaCapabilityV001(
      fixture.packageValue,
      sourceInspection,
    ), true);
    assert.deepEqual(validatePresentationOutputBaseMediaSuccessBundleV001({
      job: fixture.job,
      jobPath: fixture.jobPath,
      jobBytes: fixture.jobBytes,
      packageValue: fixture.packageValue,
      packageBytes: fixture.packageBytes,
      sourceIdentity: fixture.sourceIdentity,
      sourceInspection,
      outputInspection: {
        frameCount: manifest.mediaBuildProjection.frameCount,
        audio: {
          present: true,
          presentationDurationSamples: manifest.mediaBuildProjection.sampleCount,
          packetPayloadSha256: manifest.mediaBuildProjection.audioPacketPayloadSha256,
        },
      },
      baseMediaBytes: artifacts['base-media.mp4'],
      timelineBytes: artifacts['timeline.json'],
      timeline,
      manifestBytes: artifacts['generation-manifest.json'],
      manifest,
      receiptBytes: artifacts['validation-receipt.json'],
      receipt,
    }), {status: 'passed', violations: []});
    await assert.rejects(
      stat(path.join(REPOSITORY_ROOT, fixture.cleanupPaths.at(-1))),
      {code: 'ENOENT'},
    );
  } finally {
    await cleanupProductionRunnerFixture(fixture);
  }
});

test('OBM002: OUTPUT_BASE_MEDIA_JOB_INVALIDをproduction runnerで固定stageとpathに発火する', async () => {
  assert.equal(await exerciseFailureCase(0), 'production-runner');
  const fatalCli = await captureBaseMediaCli([]);
  assert.deepEqual(fatalCli, {
    exitCode: 2,
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0),
  });
  const cliJobId = `obm-cli-invalid-${process.pid}-v001`;
  const cliJobPath = `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-jobs/`
    + `${cliJobId}.json`;
  const cliJobBytes = Buffer.from('{}\n', 'utf8');
  const cliFailureJobRoot = `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-failures/`
    + cliJobId;
  try {
    await writeFixture(REPOSITORY_ROOT, cliJobPath, cliJobBytes);
    const rejectedCli = await captureBaseMediaCli([cliJobPath]);
    assert.equal(rejectedCli.exitCode, 1);
    assert.equal(rejectedCli.stderr.length, 0);
    assert.equal(
      validatePresentationOutputBaseMediaFailureReportV001(
        JSON.parse(rejectedCli.stdout.toString('utf8')),
      ),
      true,
    );
  } finally {
    await rm(path.join(REPOSITORY_ROOT, cliJobPath), {force: true});
    await rm(path.join(REPOSITORY_ROOT, cliFailureJobRoot), {recursive: true, force: true});
    for (const relativePath of [
      `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-jobs`,
      `${OUTPUT_PRESENTATION_ROOT}/meaning-output-base-media-failures`,
    ]) {
      try { await rmdir(path.join(REPOSITORY_ROOT, relativePath)); } catch (error) {
        if (!['ENOENT', 'ENOTEMPTY'].includes(error?.code)) throw error;
      }
    }
  }
  const fixture = makeSuccessFixture();
  const packageId = 'p'.repeat(91);
  const jobId = `${packageId}-output-base-media`;
  const derivedIdOverflow = {
    ...fixture.job,
    jobId,
    meaningPackageBinding: {
      ...fixture.job.meaningPackageBinding,
      path: `evals/clip_composition/outputs/presentation/meaning-information-packages/`
        + `${packageId}/meaning-information-package.json`,
    },
    outputRoot:
      `evals/clip_composition/outputs/presentation/meaning-output-base-media/${packageId}`,
  };
  assert.equal(jobId.length, 109);
  assert.equal(`${jobId}-generation-manifest`.length, 129);
  assert.deepEqual(validatePresentationOutputBaseMediaBuildJobV001(derivedIdOverflow), {
    status: 'rejected',
    violations: [{
      code: 'OUTPUT_BASE_MEDIA_JOB_INVALID',
      path: '',
      relatedIds: [],
    }],
  });
});

test('OBM003: OUTPUT_BASE_MEDIA_INPUT_BINDING_MISMATCHをproduction runnerで固定stageとpathに発火する', async () => {
  assert.equal(await exerciseFailureCase(1), 'production-runner');
});

test('OBM004: OUTPUT_BASE_MEDIA_MEANING_PACKAGE_INVALIDをproduction runnerで固定stageとpathに発火する', async () => {
  assert.equal(await exerciseFailureCase(2), 'production-runner');
});

test('OBM005: OUTPUT_BASE_MEDIA_CAPABILITY_UNSUPPORTEDをproduction validatorと所有枝で立証する', async () => {
  assert.equal(await exerciseFailureCase(3), 'production-shared-capability-observation');
});

test('OBM006: OUTPUT_BASE_MEDIA_SOURCE_INSPECTION_FAILEDを共有所有入口からreportへ発火する', async () => {
  assert.equal(await exerciseFailureCase(4), 'production-shared-owner-report');
});

test('OBM007: OUTPUT_BASE_MEDIA_FRAME_MAPPING_INVALIDを共有所有入口からreportへ発火する', async () => {
  assert.equal(await exerciseFailureCase(5), 'production-shared-owner-report');
});

test('OBM008: OUTPUT_BASE_MEDIA_VIDEO_BUILD_FAILEDを共有所有入口からreportへ発火する', async () => {
  assert.equal(await exerciseFailureCase(6), 'production-shared-owner-report');
});

test('OBM009: OUTPUT_BASE_MEDIA_AUDIO_GRID_FAILEDを共有所有入口からreportへ発火する', async () => {
  assert.equal(await exerciseFailureCase(7), 'production-shared-owner-report');
});

test('OBM010: OUTPUT_BASE_MEDIA_AUDIO_BUILD_FAILEDを共有所有入口からreportへ発火する', async () => {
  assert.equal(await exerciseFailureCase(8), 'production-shared-owner-report');
});

test('OBM011: OUTPUT_BASE_MEDIA_MUX_FAILEDを共有所有入口からreportへ発火する', async () => {
  assert.equal(await exerciseFailureCase(9), 'production-shared-owner-report');
});

test('OBM012: OUTPUT_BASE_MEDIA_OUTPUT_INSPECTION_FAILEDを共有所有入口からreportへ発火する', async () => {
  assert.equal(await exerciseFailureCase(10), 'production-shared-owner-report');
});

test('OBM013: OUTPUT_BASE_MEDIA_HASH_GRAPH_MISMATCHをproduction validatorで発火する', async () => {
  assert.equal(await exerciseFailureCase(11), 'production-success-bundle-validator');
  const ioFailure = await observePresentationOutputBaseMediaValidationIoV001(async () => {
    throw Object.assign(new Error('injected validation staging I/O failure'), {code: 'EIO'});
  });
  assert.deepEqual(ioFailure, {
    status: 'fatal',
    stage: 'validation',
    violations: [],
  });
  const finalIntegrityIoFailure = await observePresentationOutputBaseMediaFinalIntegrityV001(
    async () => {
      throw Object.assign(new Error('injected final integrity I/O failure'), {code: 'EIO'});
    },
  );
  assert.deepEqual(finalIntegrityIoFailure, ioFailure);
  const stagedMediaHashIoFailure = await observePresentationOutputBaseMediaStagedMediaHashV001(
    async () => {
      throw Object.assign(new Error('injected staged media hash I/O failure'), {code: 'EIO'});
    },
  );
  assert.deepEqual(stagedMediaHashIoFailure, ioFailure);
});

test('OBM014: OUTPUT_BASE_MEDIA_PUBLICATION_TARGET_INVALIDをproduction runnerで発火する', async () => {
  assert.equal(await exerciseFailureCase(12), 'production-runner');
});

test('OBM015: OUTPUT_BASE_MEDIA_PUBLICATION_FAILEDをproduction runnerで発火する', async () => {
  assert.equal(await exerciseFailureCase(13), 'production-runner');
});

test('OBM016: 失敗attemptは成功rootを作らず固定failure pathへ一件だけ公開する', async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'obm016-'));
  const jobId = 'obm016-invalid-job-v001';
  const jobPath = `evals/clip_composition/outputs/presentation/meaning-output-base-media-jobs/${jobId}.json`;
  const jobBytes = Buffer.from('{}\n', 'utf8');
  const absoluteJobPath = path.join(workspaceRoot, jobPath);
  await mkdir(path.dirname(absoluteJobPath), {recursive: true});
  await writeFile(absoluteJobPath, jobBytes, {flag: 'wx'});
  try {
    const result = await runPresentationOutputBaseMediaJobV001({
      workspaceRoot,
      jobPath,
      executedAt: EXECUTED_AT,
    });
    assert.equal(result.status, 'rejected');
    assert.equal(result.exitCode, 1);
    const failureRoot = path.join(
      workspaceRoot,
      'evals/clip_composition/outputs/presentation/meaning-output-base-media-failures',
      jobId,
      sha256PresentationOutputBaseMediaBytesV001(jobBytes),
    );
    assert.deepEqual(await readdir(failureRoot), ['failure-report.json']);
    assert.deepEqual(await readFile(path.join(failureRoot, 'failure-report.json')), result.bytes);
    await assert.rejects(
      stat(path.join(
        workspaceRoot,
        'evals/clip_composition/outputs/presentation/meaning-output-base-media',
      )),
      {code: 'ENOENT'},
    );
  } finally {
    await rm(workspaceRoot, {recursive: true, force: true});
  }
});

test('OBM017: 同一入力のtimeline・manifest・receipt byteが一致する', () => {
  const first = makeSuccessFixture().documents;
  const second = makeSuccessFixture().documents;
  assert.deepEqual(first.timelineBytes, second.timelineBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
  assert.deepEqual(first.receiptBytes, second.receiptBytes);
});

test('OBM018: failure exact型・14 code所有・未観測値null規則を一括検査する', () => {
  const expectedRootKeys = [
    'schemaVersion', 'failureId', 'status', 'stage', 'jobFileObservation',
    'meaningPackageBinding', 'violations', 'observations', 'retainedPaths', 'environment',
  ];
  for (const failureCase of FAILURE_CASES) {
    const [code, stage, violationPath, status] = failureCase;
    const report = makeFailureReport(failureCase);
    assert.deepEqual(Object.keys(report), expectedRootKeys);
    assert.equal(report.status, status);
    assert.equal(report.stage, stage);
    assert.deepEqual(report.violations, [{code, path: violationPath, relatedIds: []}]);
    assert.equal(report.observations[0].status, 'observed');
    for (const observation of report.observations.slice(1)) {
      assert.equal(observation.status, 'unavailable');
      assert.equal(observation.value, null);
    }
  }
  const invalidNullRule = structuredClone(makeFailureReport(FAILURE_CASES[0]));
  invalidNullRule.observations[1].value = 0;
  assert.equal(validatePresentationOutputBaseMediaFailureReportV001(invalidNullRule), false);
  const invalidExtraKey = structuredClone(makeFailureReport(FAILURE_CASES[0]));
  invalidExtraKey.diagnostic = 'not-formal';
  assert.equal(validatePresentationOutputBaseMediaFailureReportV001(invalidExtraKey), false);
});

test('OBM019: base media 14 code export集合と全テスト観測集合が完全一致する', () => {
  assert.deepEqual(observedCodes, [...PRESENTATION_OUTPUT_BASE_MEDIA_VIOLATION_CODES_V001]);
});
