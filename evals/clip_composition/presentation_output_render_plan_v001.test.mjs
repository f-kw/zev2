import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {mkdir, readdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  canonicalJson as canonicalPresentationOutputFiniteJsonV001,
} from './presentation_caption_contract_v002.mjs';
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
  validatePresentationSourceIdentityV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001,
  PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001,
} from './presentation_output_contract_v001.mjs';
import {
  buildPresentationOutputBaseMediaSuccessDocumentsV001,
  canonicalSha256PresentationOutputBaseMediaJsonV001,
  serializePresentationOutputBaseMediaFormalJsonV001,
} from './presentation_output_base_media_v001.mjs';
import {
  inspectPresentationBaseMediaSourceV001,
} from './presentation_base_media_build_v001.mjs';
import {
  PRESENTATION_OUTPUT_CROP_APPLICATION_CHECKS_V001,
  derivePresentationOutputCropSelectionProjectionV001,
  serializePresentationOutputCropApplicationFormalJsonV001,
} from './presentation_output_crop_application_v001.mjs';
import presentationOutputStyleResolverV001 from './presentation_output_style_resolver_v001.ts';
import {
  PRESENTATION_OUTPUT_RENDER_DIAGNOSTIC_CODES_V001,
  buildPresentationOutputCommonCorePlanV001,
  buildPresentationOutputRenderApplicationResultsV001,
  buildPresentationOutputRenderFailureReportV001,
  buildPresentationOutputRenderManifestV001,
  buildPresentationOutputRenderPlanV001,
  buildPresentationOutputRenderQcV001,
  projectPresentationOutputRendererViolationsV001,
  serializePresentationOutputRenderJsonV001,
  validatePresentationOutputRenderApplicationResultsV001,
  validatePresentationOutputRenderFailureReportV001,
  validatePresentationOutputRenderManifestV001,
  validatePresentationOutputRenderPlanV001,
  validatePresentationOutputRenderQcV001,
} from './presentation_output_render_plan_v001.mjs';
import presentationOutputJobV001 from './run_presentation_output_job_v001.ts';
import {
  PRESENTATION_RENDERER_VIOLATION_CODES,
  inspectFrameCountWithToolV001,
} from './render_presentation_v002.mjs';
import {
  inspectRenderedMediaWithToolsV001,
} from './presentation_renderer_qc_v002.mjs';

const {
  PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
} = presentationOutputStyleResolverV001;
const {
  OUTPUT_DRAW_ARTIFACT_NAMES_V001,
  inspectPresentationOutputCoreFailureObservationV001,
  runPresentationOutputJobCliV001,
  runPresentationOutputJobV001,
  validatePresentationOutputStagedArtifactsV001,
} = presentationOutputJobV001;

const ROOT = process.cwd();
const START_COMMIT = 'c2a172aa5d0d5e5ed2759b25a33d886886c89f8f';
const RUN_INPUT_CROP_INITIAL_HEAD = 'cf7b2af9c77d71ad78644e7ec8f754804036fcf8';
const RUN_INPUT_CROP_IMPLEMENTATION_BASELINE_COMMIT =
  'a1fd43d890fe12bb2c6db432b4d9cdfd828d4a8f';
const H = 'a'.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const outputCanonicalSha256 = value => sha256(Buffer.from(
  canonicalPresentationOutputFiniteJsonV001(value),
  'utf8',
));
const renderFormalBytes = value => Buffer.from(
  serializePresentationOutputRenderJsonV001(value),
  'utf8',
);
const binding = (schemaVersion, name = 'fixture') => ({
  schemaVersion,
  path: `fixtures/${name}.json`,
  fileSha256: H,
  canonicalSha256: H,
});

const mediaBinding = (name = 'base-media.mp4') => ({path: `fixtures/${name}`, fileSha256: H});
const failureValidationContext = ({
  outputId,
  formalJobFileSha256 = H,
  formalOutputJobBinding,
  outputRequestBinding,
  acceptanceReportBinding,
  renderPlanBinding,
  retainedSafetyArtifacts = [],
}) => ({
  rendererCodes: PRESENTATION_RENDERER_VIOLATION_CODES,
  outputId,
  formalJobFileSha256,
  formalOutputJobBinding,
  outputRequestBinding,
  acceptanceReportBinding,
  renderPlanBinding,
  retainedSafetyArtifacts,
});
const atomRef = id => ({
  timelineSegmentId: 'segment-0001',
  sourceMediaId: 'source-0001',
  atomId: id,
});

const style = format => format === 'normal-landscape'
  ? {
    format,
    screenLayoutId: null,
    presetId: 'normal-landscape-readable-pop-v001',
    visualStateId: 'caption-default-v001',
    maxLogicalWidthPerLine: 36,
    maxLinesPerDisplayPage: 2,
    characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
    cropMode: 'identity',
    sceneTransitionMode: 'straight-cut-only',
    audioMode: 'preserve-source-only',
  }
  : {
    format,
    screenLayoutId: 'speaker_only',
    presetId: 'vertical-short-speaker-only-readable-pop-v001',
    visualStateId: 'caption-core-vertical-speaker-only-v001',
    maxLogicalWidthPerLine: 14,
    maxLinesPerDisplayPage: 2,
    characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
    cropMode: 'bound-decision',
    sceneTransitionMode: 'straight-cut-only',
    audioMode: 'preserve-source-only',
  };

const meaningPackage = ({title = '', text = '字幕'} = {}) => {
  const refs = [...text].map((_, index) => atomRef(`atom-${String(index + 1).padStart(6, '0')}`));
  return {
    schemaVersion: 'zev-meaning-information-package-v001',
    packageId: 'meaning-package-fixture-v001',
    title: {text: title},
    timelineComposition: {
      segments: [{timelineSegmentId: 'segment-0001', sourceMediaId: 'source-0001'}],
    },
    captions: [{
      captionId: 'caption-000001',
      ordinal: 1,
      timelineSegmentId: 'segment-0001',
      text,
      atomRefs: refs,
      startAnchor: {atomRef: structuredClone(refs[0]), edge: 'start'},
      endAnchor: {atomRef: structuredClone(refs.at(-1)), edge: 'end'},
      sourceStartMs: 1000,
      sourceEndMs: 2000,
    }],
    semanticObservations: [],
  };
};

const request = format => ({
  schemaVersion: 'presentation-output-request-v001',
  requestId: `render-plan-${format}-fixture-v001`,
  mode: 'formal-generation',
  meaningInformationPackage: binding('zev-meaning-information-package-v001', 'meaning'),
  baseMediaInput: {
    baseMedia: mediaBinding(),
    timeline: binding('presentation-base-media-timeline-v002', 'timeline'),
    generationManifest: binding(
      'presentation-output-base-media-generation-manifest-v001',
      'generation-manifest',
    ),
    validationReceipt: binding(
      'presentation-output-base-media-validation-receipt-v001',
      'validation-receipt',
    ),
  },
  styleInput: {},
  publication: {
    outputId: `render-plan-${format}-output-v001`,
    controlRoot: `fixtures/control-${format}`,
    renderOutputRoot: `fixtures/render-${format}`,
  },
});

const pageLinePlan = text => {
  const refs = [...text].map((_, index) => atomRef(`atom-${String(index + 1).padStart(6, '0')}`));
  return {
    status: 'planned',
    captionDisplays: [{
      displayCaptionId: 'display-caption-000001',
      semanticCaptionId: 'caption-000001',
      ordinal: 1,
      pages: [{
        pageId: 'display-page-000001-001',
        pageOrdinal: 1,
        atomRefs: refs,
        text,
        sourceStartMs: 1000,
        sourceEndMs: 2000,
        timelineSegmentId: 'segment-0001',
        sourceStartFrame30: 30,
        sourceEndFrame30: 60,
        startFrame: 0,
        endFrameExclusive: 30,
        displayFrameCount: 30,
        lines: [{
          lineId: 'display-line-000001-001-01',
          lineOrdinal: 1,
          atomRefs: refs,
          text,
          logicalWidth: [...text].length * 2,
        }],
      }],
    }],
  };
};

const layoutContext = format => ({
  presetRegistryVersion: format === 'normal-landscape'
    ? 'normal-landscape-preset-registry-v001'
    : 'vertical-short-preset-registry-v001',
  canvas: format === 'normal-landscape'
    ? {width: 1920, height: 1080, safeAreaPx: {top: 54, right: 96, bottom: 54, left: 96}}
    : {width: 1080, height: 1920, safeAreaPx: {top: 96, right: 54, bottom: 96, left: 54}},
  layoutRules: {
    maxLogicalWidthPerLine: format === 'normal-landscape' ? 36 : 14,
    maxLinesPerMeaningGroup: 2,
    characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
  },
  visualState: {stateId: style(format).visualStateId},
  transition: {transitionId: 'quick-fade-4f-v001'},
});

const rendererQc = instructionCount => ({
  schemaVersion: 'presentation-render-qc-v002',
  status: 'passed',
  instructionCount,
  checks: {
    instructionApplication: {status: 'passed'},
    layoutAndVisibility: {status: 'passed'},
    media: {status: 'passed'},
  },
  instructionEvidence: Array.from({length: instructionCount}, (_, index) => ({
    instructionId: `display-page-${String(index + 1).padStart(6, '0')}-001`,
    alphaMax: 0.5,
  })),
  mediaEvidence: {
    observed: {durationMs: 1000.5},
    expectedAudio: null,
    expectedFrameCount: 30,
  },
  violations: [],
});

const buildPlan = ({
  format = 'normal-landscape', title = '', text = '字幕', packageValue = null,
} = {}) => {
  const effectivePackage = packageValue ?? meaningPackage({title, text});
  const requestValue = request(format);
  const result = buildPresentationOutputRenderPlanV001({
    request: requestValue,
    outputRequestBinding: binding('presentation-output-request-v001', 'request'),
    meaningPackage: effectivePackage,
    pageLinePlan: pageLinePlan(text),
    resolvedStyle: style(format),
  });
  return {packageValue: effectivePackage, requestValue, result};
};

const applicationBundle = format => {
  const built = buildPlan({format});
  assert.equal(built.result.status, 'built');
  const core = buildPresentationOutputCommonCorePlanV001({
    renderPlan: built.result.plan,
    layoutContext: layoutContext(format),
  });
  assert.equal(core.status, 'built');
  const outputRequestBinding = binding('presentation-output-request-v001', 'request');
  const renderPlanBinding = binding('presentation-output-render-plan-v001', 'render-plan');
  const presetRegistryBinding = binding('presentation-preset-registry-v001', 'preset-registry');
  const finalElements = core.plan.elements.map(element => ({...element, overlaySha256: H}));
  const application = buildPresentationOutputRenderApplicationResultsV001({
    outputId: built.requestValue.publication.outputId,
    outputRequestBinding,
    renderPlanBinding,
    presetRegistryBinding,
    renderPlan: built.result.plan,
    overlayRecords: core.plan.elements.map((element, index) => ({
      element,
      finalElement: finalElements[index],
      props: {index, text: element.text},
      pngPath: `work/${index}.png`,
      pngSha256: H,
    })),
    presetRegistryVersion: layoutContext(format).presetRegistryVersion,
    overlaysDirectory: `${built.requestValue.publication.renderOutputRoot}/overlays`,
  });
  const applicationBinding = binding(
    'presentation-output-render-application-results-v001',
    'application-results',
  );
  const qc = buildPresentationOutputRenderQcV001({
    outputId: built.requestValue.publication.outputId,
    renderPlanBinding,
    applicationResultsBinding: applicationBinding,
    videoBinding: mediaBinding('presentation-output-rendered-v001.mp4'),
    outputMedia: {
      video: {width: format === 'normal-landscape' ? 1920 : 1080, height: format === 'normal-landscape' ? 1080 : 1920, frameCount: 30},
      audio: {packetPayloadSha256: H},
    },
    sampleCount: 48000,
    rendererQc: rendererQc(core.plan.elements.length),
  });
  const manifest = buildPresentationOutputRenderManifestV001({
    outputId: built.requestValue.publication.outputId,
    formalOutputJobBinding: binding('presentation-output-formal-job-v001', 'formal-job'),
    outputRequestBinding,
    acceptanceReportBinding: binding('presentation-output-acceptance-report-v001', 'acceptance'),
    renderPlanBinding,
    meaningPackageBinding: built.requestValue.meaningInformationPackage,
    baseMediaBinding: built.requestValue.baseMediaInput,
    resolvedStyle: built.result.plan.resolvedStyle,
    applicationResultsBinding: applicationBinding,
    qcBinding: binding('presentation-output-render-qc-v001', 'qc'),
    runtimeProfile: {},
    implementationBindings: [],
  });
  return {built, core, finalElements, application, qc, manifest};
};

const FORMAL_E2E_ROOT =
  'evals/clip_composition/outputs/presentation/meaning-output-e2e-fixtures';
const FORMAL_E2E_RUNTIME_PROFILE_PATH =
  'evals/clip_composition/outputs/presentation/vertical-review-render-jobs/'
  + 'qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003.json';
const FORMAL_E2E_REGISTRY_ROOT = 'evals/clip_composition/registries/presentation';
const FORMAL_E2E_CROP_ROOT =
  'evals/clip_composition/outputs/presentation/vertical-preset-previews/'
  + 'qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006';
const FORMAL_E2E_BOUNDARY_TASK =
  '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、発話の意味が自然に完結するまとまりの終端をmeaningGroupEndBoundaryCandidateIdで選んでください。最後のまとまりはcontainer最後の候補で終えてください。本文、候補ID、時刻、順序を変更しないでください。';
const FORMAL_E2E_B1_CHECK_NAMES = Object.freeze([
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
let formalE2eOrdinal = 0;

const formalBytes = value => Buffer.from(
  serializePresentationMeaningInformationFormalJsonV001(value),
);
const formalJsonBinding = (schemaVersion, relativePath, value, bytes = formalBytes(value)) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: sha256(bytes),
  canonicalSha256: canonicalSha256PresentationMeaningInformationJsonV001(value),
});
const outputJsonBinding = (schemaVersion, relativePath, value, bytes) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: sha256(bytes),
  canonicalSha256: outputCanonicalSha256(value),
});
const writeFormalFixture = async (relativePath, value, bytes = formalBytes(value)) => {
  const absolutePath = path.join(ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), {recursive: true});
  await writeFile(absolutePath, bytes);
  return {absolutePath, bytes};
};
const readOutputArtifact = async (relativePath, schemaVersion = null) => {
  const absolutePath = path.join(ROOT, relativePath);
  const bytes = await readFile(absolutePath);
  const value = JSON.parse(bytes.toString('utf8'));
  return {
    path: relativePath,
    absolutePath,
    bytes,
    value,
    binding: outputJsonBinding(schemaVersion ?? value.schemaVersion, relativePath, value, bytes),
  };
};

const buildFormalE2eRetainedBundle = ({
  sourceRef,
  baseMediaFileSha256,
  atomTexts = ['字', '幕'],
}) => {
  assert.equal(atomTexts.length, 2);
  const rawSourceAtoms = atomTexts.map((text, index) => ({
    atomId: `word-${index + 1}`,
    speechId: 1,
    speaker: 'speaker-1',
    text,
    startMs: index * 500,
    endMs: (index + 1) * 500,
    sourceRef,
  }));
  const sttAtoms = rawSourceAtoms.map((atom, sourceIndex) => ({...atom, sourceIndex}));
  const segment = {
    timelineSegmentId: 'segment-0001',
    sourceStartMs: 0,
    sourceEndMs: 1000,
    outputStartFrame: 0,
    outputEndFrame: 30,
  };
  const shaReference = name => ({path: `fixtures/formal-e2e/${name}.json`, fileSha256: H});
  const implementationFiles = [
    {role: 'core', path: 'fixtures/formal-e2e/retained-core.mjs', fileSha256: H},
    {role: 'runner', path: 'fixtures/formal-e2e/retained-runner.mjs', fileSha256: H},
  ];
  const manifestRecord = role => ({
    role,
    path: `fixtures/formal-e2e/${role}.json`,
    fileSha256: H,
    schemaVersion: `formal-e2e-${role}-v001`,
  });
  const built = buildPresentationRetainedSourceAtomsBundleFromNormalizedV001({
    artifact: {
      artifactId: 'formal-e2e-retained-source-v001',
      candidateId: 1,
      declaredAtomGranularity: 'character-timestamp',
      sourceRef,
      sourceProvenance: 'formal output runner synthetic media',
      atomProvenance: {
        sttManifest: shaReference('stt-manifest'),
        transcript: shaReference('transcript'),
        wordTimestamps: shaReference('word-timestamps'),
        candidateManifest: shaReference('candidate-manifest'),
      },
    },
    selection: {
      candidateOuterRange: {startMs: 0, endMs: 1000},
      segments: [segment],
      sttAtoms,
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
      assemblyDecisionId: 'formal-e2e-assembly-decision-v001',
      assemblyDecisionPayloadSha256: H,
      formalizationId: 'formal-e2e-formalization-v001',
      timelineId: 'formal-e2e-retained-timeline-v001',
      timelineFileSha256: H,
      baseMediaArtifactId: 'formal-e2e-base-media-v001',
      baseMediaFileSha256,
    },
    generation: {
      job: {
        jobId: 'formal-e2e-retained-job-v001',
        path: 'fixtures/formal-e2e/retained-job.json',
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
      directInputs: PRESENTATION_RETAINED_SOURCE_ATOMS_DIRECT_INPUT_ROLES.map(manifestRecord),
      expandedInputs: PRESENTATION_RETAINED_SOURCE_ATOMS_EXPANDED_INPUT_ROLES.map(manifestRecord),
      sttAtomCount: rawSourceAtoms.length,
    },
  });
  assert.equal(built.status, 'passed');
  return built;
};

const buildFormalE2eMeaningPackage = async ({
  requestId,
  packagePath,
  mediaBindingValue,
  atomTexts = ['字', '幕'],
  titleText = '',
}) => {
  const fixtureRoot = `${FORMAL_E2E_ROOT}/${requestId}`;
  const sourceRef = 'youtube:AAAAAAAAAAA';
  const retained = buildFormalE2eRetainedBundle({
    sourceRef,
    baseMediaFileSha256: mediaBindingValue.fileSha256,
    atomTexts,
  });
  const retainedRoot = `${fixtureRoot}/retained`;
  const retainedBindings = {};
  for (const [role, name, value, bytes] of [
    ['sourceAtoms', 'source-atoms.json', retained.sourceAtoms, retained.serialized.sourceAtomsBytes],
    ['generationManifest', 'generation-manifest.json', retained.generationManifest,
      retained.serialized.generationManifestBytes],
    ['validationReport', 'validation-report.json', retained.validationReport,
      retained.serialized.validationReportBytes],
  ]) {
    const relativePath = `${retainedRoot}/${name}`;
    await writeFormalFixture(relativePath, value, bytes);
    retainedBindings[role] = formalJsonBinding(value.schemaVersion, relativePath, value, bytes);
  }

  const support = {};
  for (const name of ['media-equivalence', 'stt-manifest', 'transcript', 'word-timestamps']) {
    const relativePath = `${fixtureRoot}/source/${name}.json`;
    const bytes = Buffer.from(`formal-e2e-${name}-v001\n`, 'utf8');
    await mkdir(path.dirname(path.join(ROOT, relativePath)), {recursive: true});
    await writeFile(path.join(ROOT, relativePath), bytes);
    support[name] = {path: relativePath, fileSha256: sha256(bytes)};
  }
  const sourceIdentity = {
    schemaVersion: 'presentation-real-data-source-identity-v001',
    sourceIdentityId: `${requestId}-source-identity`,
    videoId: 'AAAAAAAAAAA',
    sourceUrl: 'https://www.youtube.com/watch?v=AAAAAAAAAAA',
    sourceProvenance: 'formal output runner synthetic media',
    sourceRef,
    executionMedia: mediaBindingValue,
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
  await writeFormalFixture(sourceIdentityPath, sourceIdentity, sourceIdentityBytes);
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
    mediaBinding: mediaBindingValue,
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
      inputDecisionBinding: formalJsonBinding(
        'zev-timeline-composition-decision-job-v001',
        `${fixtureRoot}/timeline-decision-job.json`,
        {schemaVersion: 'zev-timeline-composition-decision-job-v001'},
      ),
      recordedBy: 'human',
      recordedAt: '2026-08-03T00:00:00Z',
    },
  };
  const timelinePath = `${fixtureRoot}/timeline-decision.json`;
  const timelineBytes = formalBytes(timelineDecision);
  await writeFormalFixture(timelinePath, timelineDecision, timelineBytes);
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
  const boundaryCandidates = atoms.map((atom, index) => {
    const ref = atomRefs[index];
    return {
      boundaryCandidateId: `segmenter-boundary-${String(index + 1).padStart(6, '0')}`,
      ordinal: index + 1,
      atomRefs: [ref],
      text: atom.text,
      startAnchor: {atomRef: ref, edge: 'start'},
      endAnchor: {atomRef: ref, edge: 'end'},
      sourceStartMs: atom.startMs,
      sourceEndMs: atom.endMs,
      isWordLike: true,
    };
  });
  const sourcePackage = {
    schemaVersion: 'presentation-meaning-boundary-source-package-v001',
    packageId: `${requestId}-meaning-source-package`,
    timelineCompositionDecisionBinding: timelineBinding,
    runtimeBinding: {
      segmenterSources: [{
        sourceMediaId: sourceMedia.sourceMediaId,
        preflightReportBinding: formalJsonBinding(
          'presentation-segmenter-boundary-preflight-report-v001',
          `${fixtureRoot}/segmenter-preflight.json`,
          {schemaVersion: 'presentation-segmenter-boundary-preflight-report-v001'},
        ),
        evidenceBinding: formalJsonBinding(
          'presentation-segmenter-boundary-evidence-v001',
          `${fixtureRoot}/segmenter-evidence.json`,
          {schemaVersion: 'presentation-segmenter-boundary-evidence-v001'},
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
    taskDescription: FORMAL_E2E_BOUNDARY_TASK,
    provenance: {
      sourcePackageJobBinding: formalJsonBinding(
        'presentation-meaning-boundary-source-package-job-v001',
        `${fixtureRoot}/meaning-source-package-job.json`,
        {schemaVersion: 'presentation-meaning-boundary-source-package-job-v001'},
      ),
      timelineCompositionDecisionBinding: timelineBinding,
      implementationBindings: [
        {
          path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
          fileSha256: H,
          role: 'meaning-source-package',
        },
        {
          path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
          fileSha256: H,
          role: 'gate-a-core',
        },
        {
          path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
          fileSha256: H,
          role: 'gate-a-preflight',
        },
        {
          path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
          fileSha256: H,
          role: 'strict-json',
        },
      ],
    },
  };
  const sourcePackagePath = `${fixtureRoot}/meaning-source-package.json`;
  const sourcePackageBytes = formalBytes(sourcePackage);
  await writeFormalFixture(sourcePackagePath, sourcePackage, sourcePackageBytes);
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
    b6ManifestBinding: formalJsonBinding(
      'presentation-meaning-boundary-b6-manifest-v001',
      `${fixtureRoot}/b6-manifest.json`,
      {schemaVersion: 'presentation-meaning-boundary-b6-manifest-v001'},
    ),
    providerEnvelopeBinding: formalJsonBinding(
      'presentation-meaning-boundary-provider-response-envelope-v001',
      `${fixtureRoot}/provider-envelope.json`,
      {schemaVersion: 'presentation-meaning-boundary-provider-response-envelope-v001'},
    ),
    response,
  };
  const selectionPath = `${fixtureRoot}/semantic-selection.json`;
  const selectionBytes = formalBytes(semanticSelection);
  await writeFormalFixture(selectionPath, semanticSelection, selectionBytes);
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
    sourceStartMs: atoms[0].startMs,
    sourceEndMs: atoms.at(-1).endMs,
  };
  const semanticValidation = {
    schemaVersion: 'presentation-caption-meaning-boundary-validation-report-v001',
    reportId: 'presentation-meaning-boundary-validation-report-0123456789abcdef0123456789abcdef',
    status: 'passed',
    sourcePackageBinding,
    rawResponseBinding: {path: `${fixtureRoot}/raw-response.json`, fileSha256: H},
    selectionBinding: semanticSelectionBinding,
    checks: FORMAL_E2E_B1_CHECK_NAMES.map(name => ({
      name,
      status: 'passed',
      violationCodes: [],
    })),
    violations: [],
    selectionProjection: derivePresentationMeaningSelectionProjectionV001(response),
    captionProjection: derivePresentationMeaningCaptionProjectionV001([caption]),
    implementationBindings: [
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
        fileSha256: H,
        role: 'meaning-selection',
      },
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
        fileSha256: H,
        role: 'meaning-source-package',
      },
      {
        path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
        fileSha256: H,
        role: 'strict-json-codec',
      },
    ],
  };
  const semanticValidationPath = `${fixtureRoot}/semantic-validation.json`;
  const semanticValidationBytes = formalBytes(semanticValidation);
  await writeFormalFixture(
    semanticValidationPath,
    semanticValidation,
    semanticValidationBytes,
  );
  const semanticValidationBinding = formalJsonBinding(
    semanticValidation.schemaVersion,
    semanticValidationPath,
    semanticValidation,
    semanticValidationBytes,
  );
  const meaningJobId = `${requestId}-meaning`;
  const meaningJob = {
    schemaVersion: PRESENTATION_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V001,
    jobId: meaningJobId,
    packageId: `${meaningJobId}-meaning-information`,
    title: {text: titleText, inputMode: titleText === '' ? 'none' : 'human'},
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
  await writeFormalFixture(meaningJobPath, meaningJob, meaningJobBytes);
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
  await writeFormalFixture(packagePath, built.package, packageBytes);
  return {
    packageValue: built.package,
    packageBytes,
    packageBinding: formalJsonBinding(
      built.package.schemaVersion,
      packagePath,
      built.package,
      packageBytes,
    ),
    sourceIdentity,
  };
};

const formalE2eStyleInput = async ({
  format,
  baseMediaInput,
  baseMediaInspection,
  fixtureRoot,
  reviewedBaseMediaBinding,
  sourceRef,
}) => {
  const registryName = format === 'normal-landscape'
    ? 'normal-landscape-preset-registry-v001'
    : 'vertical-short-preset-registry-v001';
  const registryRoot = `${FORMAL_E2E_REGISTRY_ROOT}/${registryName}`;
  const artifacts = await Promise.all([
    readOutputArtifact(`${registryRoot}/trusted-registry-bindings.json`),
    readOutputArtifact(`${registryRoot}/preset-registry.json`),
    readOutputArtifact(
      `${registryRoot}/preset-validation-index.json`,
      registryName,
    ),
    readOutputArtifact(
      `${registryRoot}/material-validation-index.json`,
      'presentation-material-registry-empty-v001',
    ),
    readOutputArtifact(
      `${FORMAL_E2E_REGISTRY_ROOT}/${format === 'normal-landscape'
        ? 'presentation-renderer-trust-v001'
        : 'presentation-vertical-renderer-trust-v001'}/trust.json`,
    ),
  ]);
  const [trusted, preset, presetIndex, materialIndex, rendererTrust] = artifacts;
  const presetBinding = {
    trustedRegistryBindings: trusted.binding,
    presetRegistry: preset.binding,
    presetValidationIndex: presetIndex.binding,
    materialValidationIndex: materialIndex.binding,
    rendererTrust: rendererTrust.binding,
    presetId: format === 'normal-landscape'
      ? 'normal-landscape-readable-pop-v001'
      : 'vertical-short-speaker-only-readable-pop-v001',
  };
  let cropPolicy = {mode: 'identity'};
  if (format === 'vertical-short-1080x1920') {
    const sourceSelection = await readOutputArtifact(
      `${FORMAL_E2E_CROP_ROOT}/selection-package-manifest-v006.json`,
    );
    const selection = structuredClone(sourceSelection.value);
    selection.sourceMedia = {
      path: reviewedBaseMediaBinding.path,
      fileSha256: reviewedBaseMediaBinding.fileSha256,
      previewSecond: 0.5,
    };
    const selectionPath = `${fixtureRoot}/reviewed-crop/selection-package-manifest-v006.json`;
    const selectionBytes = Buffer.from(`${JSON.stringify(selection, null, 2)}\n`, 'utf8');
    await writeFormalFixture(selectionPath, selection, selectionBytes);
    const sourceDecision = await readOutputArtifact(
      `${FORMAL_E2E_CROP_ROOT}/crop-decision-v006.json`,
    );
    const decision = structuredClone(sourceDecision.value);
    decision.provenance.selectionPackageManifest = {
      path: 'selection-package-manifest-v006.json',
      fileSha256: sha256(selectionBytes),
    };
    const decisionPath = `${fixtureRoot}/reviewed-crop/crop-decision-v006.json`;
    const decisionBytes = Buffer.from(`${JSON.stringify(decision, null, 2)}\n`, 'utf8');
    await writeFormalFixture(decisionPath, decision, decisionBytes);
    const selectionArtifact = {
      path: selectionPath,
      value: selection,
      bytes: selectionBytes,
      binding: outputJsonBinding(
        selection.schemaVersion, selectionPath, selection, selectionBytes,
      ),
    };
    const decisionArtifact = {
      path: decisionPath,
      value: decision,
      bytes: decisionBytes,
      binding: outputJsonBinding(
        decision.schemaVersion, decisionPath, decision, decisionBytes,
      ),
    };
    const reviewedBaseMedia = {
      baseMedia: reviewedBaseMediaBinding,
      timeline: binding('presentation-base-media-timeline-v002', 'reviewed-timeline'),
      generationManifest: binding(
        'presentation-base-media-generation-manifest-v002',
        'reviewed-generation-manifest',
      ),
      validationReport: binding(
        'presentation-base-media-validation-report-v001',
        'reviewed-validation-report',
      ),
    };
    const application = {
      schemaVersion: 'presentation-output-crop-application-v001',
      applicationId: `${path.posix.basename(path.posix.dirname(baseMediaInput.baseMedia.path))}-crop`,
      status: 'passed',
      jobBinding: binding('presentation-output-crop-application-job-v001', 'crop-job'),
      runInputRecordBinding: binding(
        'presentation-meaning-output-run-input-record-v001', 'run-input-record',
      ),
      reviewedCrop: {
        decision: decisionArtifact.binding,
        selectionPackageManifest: selectionArtifact.binding,
        reviewedBaseMedia,
      },
      targetBaseMedia: structuredClone(baseMediaInput),
      sourceEquivalence: {
        guarantee: 'same-source-and-timeline-only',
        sourceRef,
        sourceMedia: reviewedBaseMedia.baseMedia,
        sourceFrameClock: {
          inputFrameRate: '30/1', logicalFrameRate: '30/1',
          extractionRuleId: 'formal-output-fixture-clock-v001',
          decodedFrameCount: baseMediaInspection.frameCount,
        },
        segments: [{
          sourceStartMs: 0, sourceEndMs: 1000,
          sourceStartFrame30: 0, sourceEndFrame30: baseMediaInspection.frameCount,
          outputStartFrame: 0, outputEndFrame: baseMediaInspection.frameCount,
        }],
        outputGeometry: {
          width: baseMediaInspection.width,
          height: baseMediaInspection.height,
          frameRate: '30/1',
          frameCount: baseMediaInspection.frameCount,
        },
        baseMediaByteRelation: reviewedBaseMediaBinding.fileSha256
          === baseMediaInput.baseMedia.fileSha256 ? 'same' : 'different',
      },
      selectionProjection: derivePresentationOutputCropSelectionProjectionV001(
        decisionArtifact.value,
      ),
      checks: Object.fromEntries(
        PRESENTATION_OUTPUT_CROP_APPLICATION_CHECKS_V001.map(name => [name, 'passed']),
      ),
    };
    const applicationPath = `${path.posix.dirname(baseMediaInput.baseMedia.path)}`
      + '/crop/crop-application-v001.json';
    const applicationBytes = serializePresentationOutputCropApplicationFormalJsonV001(
      application,
    );
    await writeFormalFixture(applicationPath, application, applicationBytes);
    cropPolicy = {
      mode: 'bound-decision',
      scope: 'all-segments',
      application: outputJsonBinding(
        application.schemaVersion,
        applicationPath,
        application,
        applicationBytes,
      ),
    };
  }
  return {
    format,
    screenLayoutId: format === 'normal-landscape' ? null : 'speaker_only',
    presetBinding,
    captionLayoutPolicy: {
      maxLogicalWidthPerLine: format === 'normal-landscape' ? 36 : 14,
      maxLinesPerDisplayPage: 2,
      characterWidthRule: PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
      pageBreakPolicy: 'split-at-source-atom-boundary-or-reject',
    },
    cropPolicy,
    sceneTransitionPolicy: {mode: 'straight-cut-only'},
    audioPolicy: {mode: 'preserve-source-only'},
    materials: [],
  };
};

const captureFormalOutputCli = async jobPath => {
  const stdoutChunks = [];
  const stderrChunks = [];
  const stdout = chunk => {
    stdoutChunks.push(Buffer.from(chunk));
  };
  const stderr = chunk => {
    stderrChunks.push(Buffer.from(chunk));
  };
  const exitCode = await runPresentationOutputJobCliV001(
    [jobPath],
    {stdout, stderr},
  );
  return {
    exitCode,
    stdout: Buffer.concat(stdoutChunks),
    stderr: Buffer.concat(stderrChunks),
  };
};

const readDirectoryNamesOrEmpty = async relativePath => {
  try {
    return (await readdir(path.join(ROOT, relativePath))).sort();
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
};

const removeFormalRendererSafetyArtifacts = async renderRoot => {
  const absoluteOutput = path.join(ROOT, renderRoot);
  const parent = path.dirname(absoluteOutput);
  const basename = path.basename(absoluteOutput);
  const lockName = `.${basename}.presentation-renderer-v002.lock`;
  const workPrefix = `.${basename}.presentation-renderer-v002-work-`;
  let names;
  try {
    names = await readdir(parent);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  await Promise.all(names
    .filter(name => name === lockName || name.startsWith(workPrefix))
    .map(name => rm(path.join(parent, name), {recursive: true, force: true})));
};

const installFormalWorkInterference = ({renderRoot, mode}) => {
  if (mode === null) return null;
  const outputAbsolute = path.join(ROOT, renderRoot);
  const parentAbsolute = path.dirname(outputAbsolute);
  const workPrefix = `.${path.basename(outputAbsolute)}.presentation-renderer-v002-work-`;
  const observation = {triggerCount: 0, error: null, triggerMarker: null};
  const handled = new Set();
  const apply = () => {
    for (const name of readdirSync(parentAbsolute)) {
      if (!name.startsWith(workPrefix) || handled.has(name)) continue;
      const workAbsolute = path.join(parentAbsolute, name);
      const waitsForRenderedVideo = mode === 'extra-staging-file'
        || mode === 'publication-target';
      if (waitsForRenderedVideo) {
        let renderedVideo;
        try {
          renderedVideo = statSync(path.join(
            workAbsolute,
            'publish',
            OUTPUT_DRAW_ARTIFACT_NAMES_V001.video,
          ));
        } catch (error) {
          if (error?.code === 'ENOENT') continue;
          throw error;
        }
        if (!renderedVideo.isFile() || renderedVideo.size === 0) continue;
      }
      handled.add(name);
      if (mode === 'overlay-output-directory') {
        const firstPageId = 'display-page-000001-001';
        const baseName = `01-${sha256(Buffer.from(firstPageId)).slice(0, 12)}.png`;
        mkdirSync(path.join(workAbsolute, 'publish', 'overlays', baseName), {recursive: true});
      } else if (mode === 'extra-staging-file') {
        const extra = path.join(workAbsolute, 'publish', 'unexpected-test-only.txt');
        mkdirSync(path.dirname(extra), {recursive: true});
        writeFileSync(extra, 'test-only staging mismatch\n', {flag: 'wx'});
      } else if (mode === 'publication-target') {
        mkdirSync(outputAbsolute);
      } else {
        throw new TypeError(`unknown formal interference mode: ${mode}`);
      }
      observation.triggerMarker = waitsForRenderedVideo
        ? 'nonempty-work-video'
        : 'work-directory';
      observation.triggerCount += 1;
    }
  };
  return {
    observation,
    waitForTriggerOrCompletion: async operation => {
      let settled = false;
      const tracked = Promise.resolve(operation).finally(() => { settled = true; });
      while (!settled && observation.triggerCount === 0 && observation.error === null) {
        try { apply(); } catch (error) { observation.error = error; }
        if (settled || observation.triggerCount > 0 || observation.error !== null) break;
        await new Promise(resolve => setImmediate(resolve));
      }
      return await tracked;
    },
    close: () => {},
  };
};

const runFormalOutputE2e = async (format, {
  atomTexts = ['字', '幕'],
  titleText = '',
  useCli = false,
  interferenceMode = null,
  runtimeProfileTransform = null,
} = {}) => {
  formalE2eOrdinal += 1;
  const label = format === 'normal-landscape' ? 'landscape' : 'vertical';
  const requestId = `oee-${label}-${process.pid}-${formalE2eOrdinal}`;
  const outputId = `${requestId}-output`;
  const meaningJobId = `${requestId}-meaning`;
  const packageId = `${meaningJobId}-meaning-information`;
  const packagePath = `evals/clip_composition/outputs/presentation/meaning-information-packages/${packageId}/meaning-information-package.json`;
  const baseJobId = `${packageId}-output-base-media`;
  const baseJobPath = `evals/clip_composition/outputs/presentation/meaning-output-base-media-jobs/${baseJobId}.json`;
  const baseOutputRoot = `evals/clip_composition/outputs/presentation/meaning-output-base-media/${packageId}`;
  const baseMediaPath = `${baseOutputRoot}/base-media.mp4`;
  const jobPath = `evals/clip_composition/outputs/presentation/meaning-output-jobs/${requestId}/formal-output-job.json`;
  const requestPath = path.posix.join(path.posix.dirname(jobPath), 'output-request.json');
  const controlRoot = `evals/clip_composition/outputs/presentation/meaning-output-control/${requestId}`;
  const renderRoot = `evals/clip_composition/outputs/presentation/meaning-output-renders/${outputId}`;
  const failureRoot = `evals/clip_composition/outputs/presentation/meaning-output-render-failures/${outputId}`;
  const fixtureRoot = `${FORMAL_E2E_ROOT}/${requestId}`;
  const cleanupPaths = [
    fixtureRoot,
    path.posix.dirname(packagePath),
    baseOutputRoot,
    path.posix.dirname(jobPath),
    controlRoot,
    renderRoot,
    failureRoot,
    baseJobPath,
  ];
  let interference = null;
  try {
    const runtimeSource = JSON.parse(await readFile(
      path.join(ROOT, FORMAL_E2E_RUNTIME_PROFILE_PATH),
      'utf8',
    ));
    const runtimeProfile = structuredClone(runtimeSource.runtimeProfile);
    if (runtimeProfileTransform !== null) runtimeProfileTransform(runtimeProfile);
    const baseMediaAbsolute = path.join(ROOT, baseMediaPath);
    await mkdir(path.dirname(baseMediaAbsolute), {recursive: true});
    execFileSync(runtimeProfile.ffmpeg.path, [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'color=c=0x202030:s=1920x1080:r=30:d=1',
      '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
      '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-movflags', '+faststart',
      '-y', baseMediaAbsolute,
    ], {stdio: 'ignore'});
    const baseMediaBytes = await readFile(baseMediaAbsolute);
    const baseMediaBinding = {path: baseMediaPath, fileSha256: sha256(baseMediaBytes)};
    const reviewedBaseMediaPath = `${fixtureRoot}/reviewed-base-media.mp4`;
    await writeFormalFixture(reviewedBaseMediaPath, null, baseMediaBytes);
    const reviewedBaseMediaBinding = {
      path: reviewedBaseMediaPath,
      fileSha256: baseMediaBinding.fileSha256,
    };
    const meaning = await buildFormalE2eMeaningPackage({
      requestId,
      packagePath,
      mediaBindingValue: baseMediaBinding,
      atomTexts,
      titleText,
    });
    const mediaInspection = await inspectRenderedMediaWithToolsV001(baseMediaAbsolute, {
      ffprobePath: runtimeProfile.ffprobe.path,
      ffmpegPath: runtimeProfile.ffmpeg.path,
    });
    const baseMediaSourceInspection = await inspectPresentationBaseMediaSourceV001(
      baseMediaAbsolute,
    );
    const decodedFrameCount = await inspectFrameCountWithToolV001(
      baseMediaAbsolute,
      runtimeProfile.ffprobe.path,
    );
    assert.equal(decodedFrameCount, 30);
    assert.equal(mediaInspection.video.fps, 30);
    assert.ok(mediaInspection.audio);
    assert.equal(baseMediaSourceInspection.source.audio.present, true);
    const presentationDurationSamples =
      baseMediaSourceInspection.source.audio.presentationClock.endSample;
    assert.ok(Number.isSafeInteger(presentationDurationSamples));
    assert.ok(presentationDurationSamples > 0);

    const baseJob = {
      schemaVersion: 'presentation-output-base-media-build-job-v001',
      jobId: baseJobId,
      mode: 'formal-generation',
      meaningPackageBinding: meaning.packageBinding,
      outputRoot: baseOutputRoot,
      expectedTimelineCompositionCanonicalSha256:
        canonicalSha256PresentationOutputBaseMediaJsonV001(
          meaning.packageValue.timelineComposition,
        ),
    };
    const baseJobBytes = serializePresentationOutputBaseMediaFormalJsonV001(baseJob);
    const documents = buildPresentationOutputBaseMediaSuccessDocumentsV001({
      job: baseJob,
      jobPath: baseJobPath,
      jobBytes: baseJobBytes,
      packageValue: meaning.packageValue,
      sourceIdentity: meaning.sourceIdentity,
      sourceInspection: {fps: 30, decodedFrameCount, audioClock: {}},
      mappings: [{
        segmentId: 'segment-0001',
        sourceStartMs: 0,
        sourceEndMs: 1000,
        sourceStartFrame30: 0,
        sourceEndFrame30: 30,
        outputStartFrame: 0,
        outputEndFrame: 30,
        audioSamples: {},
      }],
      baseMediaFileSha256: baseMediaBinding.fileSha256,
      frameCount: 30,
      sampleCount: presentationDurationSamples,
      audioPacketPayloadSha256: mediaInspection.audio.packetPayloadSha256,
    });
    assert.equal(
      documents.manifest.mediaBuildProjection.sampleCount,
      presentationDurationSamples,
    );
    assert.equal(
      documents.receipt.mediaProjection.sampleCount,
      documents.manifest.mediaBuildProjection.sampleCount,
    );
    await Promise.all([
      writeFormalFixture(baseJobPath, baseJob, baseJobBytes),
      writeFormalFixture(`${baseOutputRoot}/timeline.json`, documents.timeline, documents.timelineBytes),
      writeFormalFixture(
        `${baseOutputRoot}/generation-manifest.json`,
        documents.manifest,
        documents.manifestBytes,
      ),
      writeFormalFixture(
        `${baseOutputRoot}/validation-receipt.json`,
        documents.receipt,
        documents.receiptBytes,
      ),
    ]);
    const baseMediaInput = {
      baseMedia: baseMediaBinding,
      timeline: formalJsonBinding(
        documents.timeline.schemaVersion,
        `${baseOutputRoot}/timeline.json`,
        documents.timeline,
        documents.timelineBytes,
      ),
      generationManifest: formalJsonBinding(
        documents.manifest.schemaVersion,
        `${baseOutputRoot}/generation-manifest.json`,
        documents.manifest,
        documents.manifestBytes,
      ),
      validationReceipt: formalJsonBinding(
        documents.receipt.schemaVersion,
        `${baseOutputRoot}/validation-receipt.json`,
        documents.receipt,
        documents.receiptBytes,
      ),
    };
    const requestValue = {
      schemaVersion: 'presentation-output-request-v001',
      requestId,
      mode: 'formal-generation',
      meaningInformationPackage: meaning.packageBinding,
      baseMediaInput,
      styleInput: await formalE2eStyleInput({
        format,
        baseMediaInput,
        baseMediaInspection: {
          width: mediaInspection.video.width,
          height: mediaInspection.video.height,
          frameCount: decodedFrameCount,
        },
        fixtureRoot,
        reviewedBaseMediaBinding,
        sourceRef: meaning.sourceIdentity.sourceRef,
      }),
      publication: {outputId, controlRoot, renderOutputRoot: renderRoot},
    };
    const requestBytes = formalBytes(requestValue);
    await writeFormalFixture(requestPath, requestValue, requestBytes);
    const implementationBindings = await Promise.all(
      PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001.map(
        async ({path: implementationPath, role}) => ({
          path: implementationPath,
          fileSha256: sha256(await readFile(path.join(ROOT, implementationPath))),
          role,
        }),
      ),
    );
    const formalJob = {
      schemaVersion: 'presentation-output-formal-job-v001',
      jobId: `${requestId}-formal-output`,
      requestBinding: formalJsonBinding(
        requestValue.schemaVersion,
        requestPath,
        requestValue,
        requestBytes,
      ),
      runtimeProfile,
      implementationBindings,
      approvedContractBindings: structuredClone(
        PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001,
      ),
      controlOutputRoot: controlRoot,
      renderOutputRoot: renderRoot,
      expectedOutputId: outputId,
      executionPolicy: {oneShot: true, allowRetry: false, allowLegacyArtifacts: false},
    };
    const formalJobBytes = formalBytes(formalJob);
    await writeFormalFixture(jobPath, formalJob, formalJobBytes);
    await mkdir(path.dirname(path.join(ROOT, renderRoot)), {recursive: true});
    interference = installFormalWorkInterference({renderRoot, mode: interferenceMode});
    const cliOperation = useCli ? captureFormalOutputCli(jobPath) : null;
    const cli = useCli
      ? interference
        ? await interference.waitForTriggerOrCompletion(cliOperation)
        : await cliOperation
      : null;
    const observed = useCli
      ? {
        exitCode: cli.exitCode,
        status: cli.exitCode === 0 ? 'passed' : cli.exitCode === 1 ? 'rejected' : 'fatal',
        bytes: cli.stdout,
        stderrBytes: cli.stderr,
      }
      : await runPresentationOutputJobV001({workspaceRoot: ROOT, jobPath});
    if (interference?.observation.error) throw interference.observation.error;
    const [controlNames, renderNames] = await Promise.all([
      readDirectoryNamesOrEmpty(controlRoot),
      readDirectoryNamesOrEmpty(renderRoot),
    ]);
    const failureReportPath = `${failureRoot}/${sha256(formalJobBytes)}/failure-report.json`;
    let failureReport = null;
    try {
      failureReport = JSON.parse(await readFile(path.join(ROOT, failureReportPath), 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const snapshot = {
      observed,
      request: requestValue,
      controlNames,
      renderNames,
      failureReport,
      failureReportPath,
      cli,
      interferenceObservation: interference?.observation ?? null,
    };
    if (controlNames.includes('output-acceptance-report.json')) {
      snapshot.acceptance = JSON.parse(await readFile(
        path.join(ROOT, controlRoot, 'output-acceptance-report.json'),
        'utf8',
      ));
    }
    if (controlNames.includes('render-plan.json')) {
      snapshot.plan = JSON.parse(await readFile(
        path.join(ROOT, controlRoot, 'render-plan.json'),
        'utf8',
      ));
    }
    if (observed.status === 'passed') {
      const [acceptance, plan, application, qc, manifest, names, videoFrameCount] = await Promise.all([
        readFile(path.join(ROOT, controlRoot, 'output-acceptance-report.json'), 'utf8')
          .then(JSON.parse),
        readFile(path.join(ROOT, controlRoot, 'render-plan.json'), 'utf8').then(JSON.parse),
        readFile(
          path.join(ROOT, renderRoot, OUTPUT_DRAW_ARTIFACT_NAMES_V001.applicationResults),
          'utf8',
        ).then(JSON.parse),
        readFile(path.join(ROOT, renderRoot, OUTPUT_DRAW_ARTIFACT_NAMES_V001.qc), 'utf8')
          .then(JSON.parse),
        readFile(path.join(ROOT, renderRoot, OUTPUT_DRAW_ARTIFACT_NAMES_V001.manifest), 'utf8')
          .then(JSON.parse),
        readdir(path.join(ROOT, renderRoot)),
        inspectFrameCountWithToolV001(
          path.join(ROOT, renderRoot, OUTPUT_DRAW_ARTIFACT_NAMES_V001.video),
          runtimeProfile.ffprobe.path,
        ),
      ]);
      const overlayBindingChecks = await Promise.all(application.results.map(async item => (
        sha256(await readFile(path.join(ROOT, item.overlay.path))) === item.overlay.fileSha256
      )));
      Object.assign(snapshot, {
        acceptance,
        plan,
        application,
        qc,
        manifest,
        names: names.sort(),
        videoFrameCount,
        overlayBindingChecks,
      });
    }
    return snapshot;
  } finally {
    interference?.close();
    await removeFormalRendererSafetyArtifacts(renderRoot);
    await Promise.all(cleanupPaths.map(relativePath => rm(
      path.join(ROOT, relativePath),
      {recursive: true, force: true},
    )));
  }
};

test('ORP001: native render planはexact 9 keyである', () => {
  const {result} = buildPlan();
  assert.equal(result.status, 'built');
  assert.deepEqual(Object.keys(result.plan), [
    'schemaVersion', 'planId', 'outputRequestBinding', 'meaningPackageBinding',
    'baseMediaBinding', 'resolvedStyle', 'captionDisplays', 'titleDisplay',
    'meaningProjection',
  ]);
  assert.equal(validatePresentationOutputRenderPlanV001(result.plan).status, 'passed');
});

test('ORP002: native page一件をcommon core element一件へ写す', () => {
  const bundle = applicationBundle('normal-landscape');
  assert.equal(bundle.core.plan.elements.length, 1);
  assert.equal(bundle.core.plan.elements[0].instructionId,
    bundle.built.result.plan.captionDisplays[0].pages[0].pageId);
  assert.throws(() => buildPresentationOutputRenderApplicationResultsV001({
    outputId: bundle.built.requestValue.publication.outputId,
    outputRequestBinding: binding('presentation-output-request-v001', 'request'),
    renderPlanBinding: binding('presentation-output-render-plan-v001', 'render-plan'),
    presetRegistryBinding: binding('presentation-preset-registry-v001', 'preset-registry'),
    renderPlan: bundle.built.result.plan,
    overlayRecords: [{
      element: bundle.core.plan.elements[0],
      props: {text: bundle.core.plan.elements[0].text},
      pngPath: 'work/missing-final-element.png',
      pngSha256: H,
    }],
    presetRegistryVersion: layoutContext('normal-landscape').presetRegistryVersion,
    overlaysDirectory: `${bundle.built.requestValue.publication.renderOutputRoot}/overlays`,
  }), /final overlay element is required/u);
  for (const overlaysDirectory of ['/absolute/overlays', 'fixtures/../outside']) {
    assert.throws(() => buildPresentationOutputRenderApplicationResultsV001({
      outputId: bundle.built.requestValue.publication.outputId,
      outputRequestBinding: binding('presentation-output-request-v001', 'request'),
      renderPlanBinding: binding('presentation-output-render-plan-v001', 'render-plan'),
      presetRegistryBinding: binding('presentation-preset-registry-v001', 'preset-registry'),
      renderPlan: bundle.built.result.plan,
      overlayRecords: bundle.core.plan.elements.map((element, index) => ({
        element,
        finalElement: bundle.finalElements[index],
        props: {index, text: element.text},
        pngPath: `work/${index}.png`,
        pngSha256: H,
      })),
      presetRegistryVersion: layoutContext('normal-landscape').presetRegistryVersion,
      overlaysDirectory,
    }), /overlay output directory is unsafe/u);
  }
});

test('ORP003: meaning projection 7 fieldは意味packageから不変導出される', () => {
  const {packageValue, result} = buildPlan();
  assert.equal(result.status, 'built');
  assert.deepEqual(Object.keys(result.plan.meaningProjection), [
    'timelineSegmentCount', 'captionCount', 'titleState', 'semanticObservationCount',
    'captionTextSequenceCanonicalSha256', 'captionTimingSequenceCanonicalSha256',
    'timelineCompositionCanonicalSha256',
  ]);
  assert.deepEqual(result.plan.meaningProjection, {
    timelineSegmentCount: packageValue.timelineComposition.segments.length,
    captionCount: packageValue.captions.length,
    titleState: packageValue.title.text === '' ? 'empty' : 'provided',
    semanticObservationCount: packageValue.semanticObservations.length,
    captionTextSequenceCanonicalSha256: canonicalSha256PresentationMeaningInformationJsonV001(
      packageValue.captions.map(caption => ({captionId: caption.captionId, text: caption.text})),
    ),
    captionTimingSequenceCanonicalSha256: canonicalSha256PresentationMeaningInformationJsonV001(
      packageValue.captions.map(caption => ({
        captionId: caption.captionId,
        startAnchor: caption.startAnchor,
        endAnchor: caption.endAnchor,
        sourceStartMs: caption.sourceStartMs,
        sourceEndMs: caption.sourceEndMs,
      })),
    ),
    timelineCompositionCanonicalSha256:
      canonicalSha256PresentationMeaningInformationJsonV001(packageValue.timelineComposition),
  });
});

test('ORP004: base mediaの4 bindingをrequestからそのまま保持する', () => {
  const {requestValue, result} = buildPlan();
  assert.equal(result.status, 'built');
  assert.deepEqual(result.plan.baseMediaBinding, requestValue.baseMediaInput);
  assert.deepEqual(Object.keys(result.plan.baseMediaBinding), [
    'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
  ]);
});

test('ORP005: title空はnot-requestedとなる', () => {
  const {result} = buildPlan({title: ''});
  assert.equal(result.status, 'built');
  assert.deepEqual(result.plan.titleDisplay, {status: 'not-requested'});
});

test('ORP006: title非空はv001で拒否する', () => {
  const {result} = buildPlan({title: '題名'});
  assert.equal(result.status, 'rejected');
  assert.deepEqual(result.violations.map(item => item.code), ['TITLE_STYLE_UNAVAILABLE']);
});

test('ORP007: instruction/resolution/旧B4 artifactを一件も生成しない', () => {
  const bundle = applicationBundle('normal-landscape');
  const actualArtifacts = [
    bundle.built.result.plan,
    bundle.application,
    bundle.qc,
    bundle.manifest,
  ];
  const serialized = actualArtifacts.map(value => JSON.stringify(value)).join('\n');
  assert.doesNotMatch(serialized,
    /instruction-bundle|resolution-package|presentation-caption-display-plan-v00/u);
  assert.deepEqual(
    Object.entries(OUTPUT_DRAW_ARTIFACT_NAMES_V001)
      .filter(([key]) => key !== 'plan')
      .map(([, name]) => name),
    [
      'presentation-output-rendered-v001.mp4',
      'overlays',
      'presentation-output-render-application-results-v001.json',
      'presentation-output-render-qc-v001.json',
      'presentation-output-render-manifest-v001.json',
    ],
  );
  assert.equal(
    Object.hasOwn(bundle.built.result.plan, 'instructionBundle'),
    false,
  );
  assert.equal(
    Object.hasOwn(bundle.built.result.plan, 'resolutionPackage'),
    false,
  );
});

test('ORP008: common coreは新native planのpage値を実際に受ける', () => {
  const bundle = applicationBundle('vertical-short-1080x1920');
  const page = bundle.built.result.plan.captionDisplays[0].pages[0];
  const element = bundle.core.plan.elements[0];
  assert.equal(element.text, page.text);
  assert.equal(element.startFrame, page.startFrame);
  assert.deepEqual(element.indexedLines.map(line => line.renderedText),
    page.lines.map(line => line.text));
});

test('OEE001: 合成横型を意味packageからapplication/QC/manifestまで一気通貫する', async () => {
  const result = await runFormalOutputE2e('normal-landscape', {useCli: true});
  assert.equal(result.observed.status, 'passed');
  assert.equal(result.observed.exitCode, 0);
  assert.equal(result.acceptance.status, 'accepted-for-render');
  assert.equal(result.plan.resolvedStyle.format, 'normal-landscape');
  assert.equal(result.plan.resolvedStyle.cropMode, 'identity');
  assert.equal(result.qc.status, 'passed');
  const hasFiniteDecimal = value => value !== null && typeof value === 'object'
    ? Object.values(value).some(hasFiniteDecimal)
    : typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value);
  const decimalAcceptanceProbe = applicationBundle('normal-landscape').qc;
  assert.equal(decimalAcceptanceProbe.rendererQc.instructionEvidence[0].alphaMax, 0.5);
  assert.equal(decimalAcceptanceProbe.rendererQc.mediaEvidence.observed.durationMs, 1000.5);
  assert.equal(hasFiniteDecimal(decimalAcceptanceProbe), true);
  assert.ok(result.application.results.every(item =>
    item.overlay.path.startsWith(`${result.request.publication.renderOutputRoot}/overlays/`)));
  assert.ok(result.overlayBindingChecks.every(Boolean));
  assert.equal(result.qc.outputMedia.frameCount, 30);
  assert.equal(result.videoFrameCount, 30);
  assert.equal(
    result.manifest.manifestId,
    `${result.request.publication.outputId}-render-manifest`,
  );
  assert.deepEqual(result.names, [
    'overlays',
    'presentation-output-render-application-results-v001.json',
    'presentation-output-render-manifest-v001.json',
    'presentation-output-render-qc-v001.json',
    'presentation-output-rendered-v001.mp4',
  ]);
  assert.deepEqual(result.cli.stdout, renderFormalBytes(result.manifest));
  const cliSafety = JSON.parse(result.cli.stderr.toString('utf8'));
  assert.deepEqual(cliSafety.map(item => item.code), [
    'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY',
    'RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY',
  ]);
  assert.deepEqual(result.cli.stderr, renderFormalBytes(cliSafety));
});

test('OEE002: 合成縦型をcrop前提の意味packageからQCまで一気通貫する', async () => {
  const result = await runFormalOutputE2e('vertical-short-1080x1920');
  assert.equal(result.observed.status, 'passed');
  assert.equal(result.observed.exitCode, 0);
  assert.equal(result.acceptance.status, 'accepted-for-render');
  assert.equal(result.plan.resolvedStyle.format, 'vertical-short-1080x1920');
  assert.equal(result.plan.resolvedStyle.cropMode, 'bound-decision');
  assert.equal(result.plan.resolvedStyle.screenLayoutId, 'speaker_only');
  assert.equal(result.qc.status, 'passed');
  assert.ok(result.application.results.every(item =>
    item.overlay.path.startsWith(`${result.request.publication.renderOutputRoot}/overlays/`)));
  assert.ok(result.overlayBindingChecks.every(Boolean));
  assert.equal(result.qc.outputMedia.width, 1080);
  assert.equal(result.qc.outputMedia.height, 1920);
  assert.equal(result.qc.outputMedia.frameCount, 30);
  assert.equal(result.videoFrameCount, 30);
  assert.equal(
    result.manifest.manifestId,
    `${result.request.publication.outputId}-render-manifest`,
  );
});

test('OEE003: 横縦の出力形式差で意味package byteを変えない', () => {
  const packageValue = meaningPackage();
  const before = Buffer.from(JSON.stringify(packageValue));
  const landscape = buildPlan({format: 'normal-landscape', packageValue});
  const vertical = buildPlan({format: 'vertical-short-1080x1920', packageValue});
  assert.equal(landscape.result.status, 'built');
  assert.equal(vertical.result.status, 'built');
  assert.deepEqual(Buffer.from(JSON.stringify(packageValue)), before);
});

test('OEE004: rejected時はcontrol 2件・render 0件でfallbackしない', async () => {
  const result = await runFormalOutputE2e('normal-landscape', {
    titleText: '未対応タイトル',
    useCli: true,
  });
  assert.equal(result.observed.exitCode, 1);
  assert.equal(result.acceptance.status, 'rejected');
  assert.deepEqual(result.acceptance.violations, [{
    code: 'TITLE_STYLE_UNAVAILABLE', path: '/title', relatedIds: [],
  }]);
  assert.deepEqual(result.controlNames, [
    'output-acceptance-report.json',
    'output-request.json',
  ]);
  assert.deepEqual(result.renderNames, []);
  assert.equal(result.failureReport, null);
  assert.deepEqual(result.cli.stdout, renderFormalBytes(result.acceptance));
  assert.equal(result.cli.stderr.length, 0);
  assert.doesNotMatch(result.cli.stdout.toString('utf8'),
    /instruction-bundle|resolution-package|presentation-caption-display-plan-v00/u);
});

test('OEE005: core契約/QC失敗はrejected failure exact 10 keyへ帰属する', async () => {
  const result = await runFormalOutputE2e('normal-landscape', {
    atomTexts: [' ', ' '],
    useCli: true,
  });
  assert.equal(result.observed.exitCode, 1);
  assert.equal(result.acceptance.status, 'accepted-for-render');
  assert.deepEqual(result.controlNames, [
    'output-acceptance-report.json', 'output-request.json', 'render-plan.json',
  ]);
  assert.deepEqual(result.renderNames, []);
  const report = result.failureReport;
  assert.equal(Object.keys(report).length, 10);
  assert.equal(report.status, 'rejected');
  assert.equal(report.failureObservation.source, 'common-draw-core');
  assert.equal(report.stage, report.failureObservation.coreStage);
  assert.ok(report.failureObservation.violations.length > 0);
  assert.deepEqual(report.retainedSafetyArtifacts.map(item => item.code), [
    'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY',
    'RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY',
  ]);
  assert.deepEqual(result.cli.stdout, renderFormalBytes(report));
  assert.deepEqual(result.cli.stderr, renderFormalBytes(report.retainedSafetyArtifacts));
});

test('OEE006: tool/I/O fatalはviolations空・exit 2相当へ帰属する', async () => {
  const result = await runFormalOutputE2e('normal-landscape', {
    useCli: true,
    interferenceMode: 'overlay-output-directory',
  });
  assert.equal(result.interferenceObservation.triggerCount, 1);
  assert.equal(result.interferenceObservation.triggerMarker, 'work-directory');
  assert.equal(result.observed.exitCode, 2);
  assert.equal(result.acceptance.status, 'accepted-for-render');
  assert.deepEqual(result.controlNames, [
    'output-acceptance-report.json', 'output-request.json', 'render-plan.json',
  ]);
  assert.deepEqual(result.renderNames, []);
  const report = result.failureReport;
  assert.equal(Object.keys(report).length, 10);
  assert.equal(report.status, 'fatal');
  assert.equal(report.failureObservation.source, 'common-draw-core');
  assert.equal(report.failureObservation.diagnosticCode, 'OUTPUT_RENDER_CORE_PROCESS_FAILED');
  assert.deepEqual(report.failureObservation.violations, []);
  assert.deepEqual(report.retainedSafetyArtifacts.map(item => item.code), [
    'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY',
    'RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY',
  ]);
  assert.deepEqual(result.cli.stdout, renderFormalBytes(report));
  assert.deepEqual(result.cli.stderr, renderFormalBytes(report.retainedSafetyArtifacts));
});

test('OEE007: staging exact検査不合格は旧publisherを呼ばず専用fatalにする', async () => {
  const result = await runFormalOutputE2e('normal-landscape', {
    useCli: true,
    interferenceMode: 'extra-staging-file',
  });
  assert.equal(result.interferenceObservation.triggerCount, 1);
  assert.equal(result.interferenceObservation.triggerMarker, 'nonempty-work-video');
  assert.equal(result.observed.exitCode, 2);
  assert.deepEqual(result.renderNames, []);
  assert.equal(result.failureReport.status, 'fatal');
  assert.equal(result.failureReport.stage, 'staged-artifact-validation');
  assert.deepEqual(result.failureReport.failureObservation, {
    source: 'output-artifact-validator',
    coreStage: null,
    violations: [],
    diagnosticCode: 'OUTPUT_RENDER_STAGED_ARTIFACT_INVALID',
  });
  assert.deepEqual(result.cli.stdout, renderFormalBytes(result.failureReport));
  assert.deepEqual(
    result.cli.stderr,
    renderFormalBytes(result.failureReport.retainedSafetyArtifacts),
  );
  const source = await readFile(
    path.join(ROOT, 'evals/clip_composition/run_presentation_output_job_v001.ts'),
    'utf8',
  );
  assert.doesNotMatch(source, /\bpublishPresentationArtifactsV002\s*\(/u);
  assert.doesNotMatch(source, /\bvalidateStagedSuccessArtifactsV002\s*\(/u);
});

test('OEE008: staging合格後だけ既存commit入口を一度呼ぶ', async () => {
  const result = await runFormalOutputE2e('normal-landscape', {
    useCli: true,
    interferenceMode: 'publication-target',
  });
  assert.equal(result.interferenceObservation.triggerCount, 1);
  assert.equal(result.interferenceObservation.triggerMarker, 'nonempty-work-video');
  assert.equal(result.observed.exitCode, 2);
  assert.deepEqual(result.renderNames, []);
  assert.equal(result.failureReport.status, 'fatal');
  assert.equal(result.failureReport.stage, 'publication');
  assert.deepEqual(result.failureReport.failureObservation, {
    source: 'atomic-publication',
    coreStage: null,
    violations: [],
    diagnosticCode: 'OUTPUT_RENDER_PUBLICATION_FAILED',
  });
  assert.deepEqual(result.cli.stdout, renderFormalBytes(result.failureReport));
  assert.deepEqual(
    result.cli.stderr,
    renderFormalBytes(result.failureReport.retainedSafetyArtifacts),
  );
});

test('OEE009: coreのRENDER_OUTPUT違反はstage publishをpublicationへ読み替えない', () => {
  const code = PRESENTATION_RENDERER_VIOLATION_CODES.find(item => item.startsWith('RENDER_OUTPUT_'));
  assert.ok(code);
  const observation = inspectPresentationOutputCoreFailureObservationV001({
    exitCode: 1,
    failure: {
      stage: 'publish',
      violations: [{code, path: '$render', relatedIds: [], details: {fixture: true}}],
    },
  });
  assert.deepEqual(observation, {
    status: 'rejected',
    stage: 'publish',
    failureObservation: {
      source: 'common-draw-core',
      coreStage: 'publish',
      violations: [{code, path: '/render', relatedIds: []}],
      diagnosticCode: 'OUTPUT_RENDER_CORE_CONTRACT_FAILED',
    },
  });
  const formalOutputJobBinding = binding('presentation-output-formal-job-v001', 'job');
  const outputRequestBinding = binding('presentation-output-request-v001', 'request');
  const acceptanceReportBinding = binding(
    'presentation-output-acceptance-report-v001', 'acceptance',
  );
  const renderPlanBinding = binding('presentation-output-render-plan-v001', 'plan');
  const report = buildPresentationOutputRenderFailureReportV001({
    outputId: 'output-e2e-009',
    formalJobFileSha256: H,
    ...observation,
    formalOutputJobBinding,
    outputRequestBinding,
    acceptanceReportBinding,
    renderPlanBinding,
  });
  const context = failureValidationContext({
    outputId: 'output-e2e-009', formalOutputJobBinding, outputRequestBinding,
    acceptanceReportBinding, renderPlanBinding,
  });
  assert.equal(report.stage, 'publish');
  assert.equal(validatePresentationOutputRenderFailureReportV001(report, context).status, 'passed');

  const pathlessQc = inspectPresentationOutputCoreFailureObservationV001({
    exitCode: 1,
    failure: {
      stage: 'overlay-preflight',
      violations: [{
        code: 'INSTRUCTION_RENDER_MISSING',
        relatedIds: ['display-page-000001-001'],
        details: {fixture: true},
      }],
    },
  });
  assert.deepEqual(pathlessQc.failureObservation.violations, [{
    code: 'INSTRUCTION_RENDER_MISSING',
    path: '',
    relatedIds: ['display-page-000001-001'],
  }]);
  const unknownPathless = projectPresentationOutputRendererViolationsV001({
    rendererCodes: PRESENTATION_RENDERER_VIOLATION_CODES,
    violations: [{
      code: 'RENDER_OUTPUT_PUBLISH_FAILED',
      relatedIds: [],
    }],
  });
  assert.equal(unknownPathless.status, 'rejected');
  const duplicatePathlessQc = projectPresentationOutputRendererViolationsV001({
    rendererCodes: PRESENTATION_RENDERER_VIOLATION_CODES,
    violations: [
      {code: 'INSTRUCTION_RENDER_MISSING', relatedIds: ['display-page-000001-001']},
      {code: 'INSTRUCTION_RENDER_MISSING', relatedIds: ['display-page-000001-002']},
    ],
  });
  assert.equal(duplicatePathlessQc.status, 'rejected');
});

const parentContracts = [
  ['evals/clip_composition/reports/presentation/presentation-meaning-information-package-contract-design-20260803-v001.md', 'a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de'],
  ['evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md', 'c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de'],
];

const startFiles = [
  ['evals/clip_composition/presentation_retained_source_atoms_v001.mjs', 'f28178327ddc0cc64f11527d850c71bfb5043b4e13f59f6da7997fd8f6d6cad0'],
  ['evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs', 'dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a'],
  ['evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs', 'e83157cfe72197940193c9bd07a4f8c9be4b1716617dc55bf90e1e8c4f33812e'],
  ['evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs', 'ac3dcbbc671af6f56dcceeea6a41c8ae9cbf9fc4ba28a8a00bbc5d6faff45bcd'],
  ['evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs', '9ab3cc2426d00f35b904c9016b1252a632569ab0ea32074a9266c090420cc503'],
  ['evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs', '636a733d1036158e7269022ca3ae6105c51ae595907874c6a6b1d53e8f3cff1d'],
  ['evals/clip_composition/presentation_base_media_timeline_v002.mjs', 'a1f72079f0e970cb5c6a67817427aa5909f2453ad0d04e81150cfd29c5b41ab2'],
  ['evals/clip_composition/presentation_base_media_build_v001.mjs', '5e76f31c71f6a3d95fc9d0a3980174b326a2d1e630c8800fdfaee57efa7d5287'],
  ['evals/clip_composition/presentation_renderer_text_layout_v001.mjs', '066a62adaa7fa3f8b8eda92c82e9a85940e43f372af976edc4b327ef4cf9ce5e'],
  ['evals/clip_composition/render_presentation_v002.mjs', 'd02d603f3fc04f9ab58ce889644f5e63bf17d7ec5cb19019e09110c6167a720b'],
  ['evals/clip_composition/presentation_renderer_qc_v002.mjs', '73ede4f3556f80afac98b8e0e3c4b81019f718b4644d2b3f8cb1ac037989f0d3'],
  ['evals/clip_composition/render_presentation_vertical_review_v001.ts', 'e12117c04f7bbfe6a67459fc815dd609809ec02fa8792d548e183f58b8ececdd'],
  ['runner/src/screen-layout.ts', '63db69fa9a9280e26443dfffa0160de3715d0e434c313b423cb347f3f6452896'],
];

const implementationPaths = [
  'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs',
  'evals/clip_composition/presentation_meaning_information_package_v001.mjs',
  'evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs',
  'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
  'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs',
  'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
  'evals/clip_composition/presentation_meaning_information_package_v001.test.mjs',
  'evals/clip_composition/presentation_meaning_boundary_source_package_v001.test.mjs',
  'evals/clip_composition/presentation_meaning_boundary_b5_b6_v001.test.mjs',
  'evals/clip_composition/presentation_meaning_boundary_selection_v001.test.mjs',
  'evals/clip_composition/presentation_meaning_output_run_input_record_v001.mjs',
  'evals/clip_composition/run_presentation_meaning_output_run_input_record_v001.mjs',
  'evals/clip_composition/presentation_meaning_output_run_input_record_v001.test.mjs',
  'evals/clip_composition/presentation_output_base_media_v001.mjs',
  'evals/clip_composition/run_presentation_output_base_media_job_v001.mjs',
  'evals/clip_composition/presentation_output_crop_application_v001.mjs',
  'evals/clip_composition/run_presentation_output_crop_application_job_v001.mjs',
  'evals/clip_composition/presentation_output_contract_v001.mjs',
  'evals/clip_composition/presentation_output_page_line_planner_v001.mjs',
  'evals/clip_composition/presentation_output_style_resolver_v001.ts',
  'evals/clip_composition/presentation_output_render_plan_v001.mjs',
  'evals/clip_composition/run_presentation_output_job_v001.ts',
  'evals/clip_composition/presentation_output_base_media_v001.test.mjs',
  'evals/clip_composition/presentation_output_contract_v001.test.mjs',
  'evals/clip_composition/presentation_output_timeline_mapping_v001.test.mjs',
  'evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs',
  'evals/clip_composition/presentation_output_style_resolver_v001.test.mjs',
  'evals/clip_composition/presentation_output_render_plan_v001.test.mjs',
  'evals/clip_composition/presentation_renderer_plan_v002.mjs',
  'evals/clip_composition/inspect_presentation_preset_layout.ts',
  'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs',
  'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs',
];

const git = args => execFileSync('git', args, {cwd: ROOT});
const showAtStart = relativePath => git(['show', `${START_COMMIT}:${relativePath}`]);

test('OPF001: 親契約2文書のSHAが承認値と一致する', async () => {
  for (const [relativePath, expected] of parentContracts) {
    assert.equal(sha256(await readFile(path.join(ROOT, relativePath))), expected);
  }
});

test('OPF002: §4の13正本は開始commit一致かつ非変更11件は現物不変である', async () => {
  assert.equal(startFiles.length, 13);
  assert.equal(new Set(startFiles.map(([relativePath]) => relativePath)).size, 13);
  for (const [relativePath, expected] of startFiles) {
    assert.equal(sha256(showAtStart(relativePath)), expected);
    if (!relativePath.endsWith('presentation_caption_api_cost_guard_v001.mjs')
      && !relativePath.endsWith('run_presentation_caption_gate_b6_v001.mjs')) {
      assert.equal(sha256(await readFile(path.join(ROOT, relativePath))), expected);
    }
  }
});

test('OPF003: X01〜X04は開始SHAと許可された共通入口を持つ', async () => {
  const rows = [
    ['evals/clip_composition/presentation_renderer_plan_v002.mjs', 'bedb4d9e66622372d9a564b26006dbb7b6cc689db86fd353ad8b7187ca3079de', '3a77c7feb7005fa06d7e45a6364f76ab4bc40a8622370568cf557d5090f08b79', '58b782e1e60f644b82beb5086efc99a26d9fbca2bee330771dc8628b6538f17e', 'resolvePresentationLandscapePresetProjectionV001'],
    ['evals/clip_composition/inspect_presentation_preset_layout.ts', '5b0ee2280ee2db3252b6b1a232ca5b59c7bd096502a520fec8a69d6685040442', '416a81b54b18be6a6ccdd5906d3a3730bd0455edfe4be7002c9c6c4ccf2f8843', '57579bf1d012389df2559a783a9c7f6d03fee71c14f0deebda22861483ac1b37', 'inspectPresentationPresetLayoutV001'],
    ['evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs', '9ab3cc2426d00f35b904c9016b1252a632569ab0ea32074a9266c090420cc503', '29ac0e7e4d54400d8063bd35caab5272a64474b3c00a306d49b33aa0092db57b', '0eb4888fbeee0a310baabc09e1073ec71137cf882d1015d111047281efe70991', 'derivePresentationApiPreSendCostV001'],
    ['evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs', '636a733d1036158e7269022ca3ae6105c51ae595907874c6a6b1d53e8f3cff1d', 'ecad17891d63038647e2be0634b5844d2d117c38ea6e07ccef470d2887e56204', '9662a74c2d5549e24c2077e2bfc0f0aa9b0cb2bd7f259ca97f854697a4ced064', 'inspectPresentationCaptionGateB6ProviderResponseV001'],
  ];
  for (const [relativePath, startSha, currentSha, allowedPatchSha, exportName] of rows) {
    assert.equal(sha256(showAtStart(relativePath)), startSha);
    const current = await readFile(path.join(ROOT, relativePath), 'utf8');
    assert.match(current, new RegExp(`export (?:const|function) ${exportName}`, 'u'));
    assert.equal(sha256(Buffer.from(current)), currentSha);
    assert.equal(sha256(git([
      'diff', '--no-ext-diff', '--unified=3', START_COMMIT, '--', relativePath,
    ])), allowedPatchSha);
  }
});

test('OPF004: 実装path集合はexact 32件で33件目を持たない', async () => {
  assert.equal(implementationPaths.length, 32);
  assert.equal(new Set(implementationPaths).size, 32);
  for (const relativePath of implementationPaths) {
    assert.equal((await stat(path.join(ROOT, relativePath))).isFile(), true);
  }
  const isBoundaryImplementationPath = relativePath => (
    /^(?:evals\/clip_composition\/)(?:presentation_(?:timeline_composition_decision|meaning_information_package|meaning_boundary|meaning_output_|output_)|run_presentation_(?:meaning|output)|presentation_renderer_plan_v002\.mjs$|inspect_presentation_preset_layout\.ts$|presentation_caption_api_cost_guard_v001\.mjs$|run_presentation_caption_gate_b6_v001\.mjs$)/u
      .test(relativePath)
  );
  const trackedChanges = git([
    'diff', '--name-only', START_COMMIT, '--', 'evals/clip_composition',
  ]).toString('utf8').trim().split('\n').filter(isBoundaryImplementationPath);
  const untrackedBoundaryFiles = git([
    'ls-files', '--others', '--exclude-standard', '--', 'evals/clip_composition',
  ]).toString('utf8').trim().split('\n').filter(isBoundaryImplementationPath);
  assert.deepEqual(
    [...new Set([...trackedChanges, ...untrackedBoundaryFiles])].sort(),
    [...implementationPaths].sort(),
  );
});

test('OPF005: 参照exportが実在しproductionとtestが同入口を使う', async () => {
  const [contractModule, plannerModule, styleNamespace, renderModule, runnerNamespace] = await Promise.all([
    import('./presentation_output_contract_v001.mjs'),
    import('./presentation_output_page_line_planner_v001.mjs'),
    import('./presentation_output_style_resolver_v001.ts'),
    import('./presentation_output_render_plan_v001.mjs'),
    import('./run_presentation_output_job_v001.ts'),
  ]);
  const styleModule = styleNamespace.default ?? styleNamespace;
  const runnerModule = runnerNamespace.default ?? runnerNamespace;
  const references = [
    [contractModule, ['evaluatePresentationOutputAcceptanceChecksV001',
      'inspectPresentationOutputRequestV001', 'validatePresentationOutputFormalJobV001',
      'validatePresentationOutputRequestV001', 'derivePresentationOutputMeaningProjectionV001']],
    [plannerModule, ['buildPresentationOutputPageLinePlanV001',
      'validatePresentationOutputCaptionDisplaysV001']],
    [styleModule, ['resolvePresentationOutputStyleV001',
      'inspectPresentationOutputDisplayPageV001']],
    [renderModule, ['buildPresentationOutputCommonCorePlanV001',
      'buildPresentationOutputRenderApplicationResultsV001',
      'buildPresentationOutputRenderFailureReportV001',
      'buildPresentationOutputRenderManifestV001', 'buildPresentationOutputRenderPlanV001',
      'buildPresentationOutputRenderQcV001',
      'validatePresentationOutputRenderApplicationResultsV001',
      'validatePresentationOutputRenderFailureReportV001',
      'validatePresentationOutputRenderManifestV001',
      'validatePresentationOutputRenderPlanV001', 'validatePresentationOutputRenderQcV001']],
    [runnerModule, ['inspectPresentationOutputCoreFailureObservationV001',
      'runPresentationOutputJobV001', 'runPresentationOutputJobCliV001',
      'validatePresentationOutputStagedArtifactsV001']],
  ];
  for (const [module, names] of references) {
    for (const name of names) assert.equal(typeof module[name], 'function', name);
  }
  const runnerSource = await readFile(path.join(
    ROOT,
    'evals/clip_composition/run_presentation_output_job_v001.ts',
  ), 'utf8');
  const namedRelativeImports = [...runnerSource.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"];?/gu,
  )];
  assert.ok(namedRelativeImports.length > 0);
  for (const match of namedRelativeImports) {
    const importedNamespace = await import(new URL(match[2], import.meta.url));
    const importedModule = importedNamespace.default ?? importedNamespace;
    const importedNames = match[1].split(',').map(item => item.trim()).filter(Boolean)
      .map(item => item.split(/\s+as\s+/u)[0]);
    for (const name of importedNames) {
      assert.ok(Object.hasOwn(importedModule, name), `${match[2]}:${name}`);
    }
  }
  assert.equal(renderModule.buildPresentationOutputRenderPlanV001,
    buildPresentationOutputRenderPlanV001);
  assert.equal(renderModule.validatePresentationOutputRenderPlanV001,
    validatePresentationOutputRenderPlanV001);
  assert.equal(runnerModule.validatePresentationOutputStagedArtifactsV001,
    validatePresentationOutputStagedArtifactsV001);
  assert.equal(runnerModule.runPresentationOutputJobV001, runPresentationOutputJobV001);
});

const stableRoots = [
  ['stable/first-clip-complete-20260727', 'evals/clip_composition/outputs/presentation/review-renders/DmWu0jVQfTE-candidate-13-caption-b6-v004-v002'],
  ['stable/second-clip-generality-20260728', 'evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001'],
  ['stable/vertical-first-clip-20260802', 'evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result'],
];

const verifyStableRoot = async (tag, root) => {
  const lines = git(['ls-tree', '-r', tag, '--', root]).toString('utf8').trim().split('\n').filter(Boolean);
  const expected = new Map(lines.map(line => {
    const match = /^(\d+) blob ([0-9a-f]{40})\t(.+)$/u.exec(line);
    assert.ok(match);
    return [match[3], {mode: match[1], oid: match[2]}];
  }));
  const walk = async directory => {
    const found = [];
    for (const entry of await readdir(path.join(ROOT, directory), {withFileTypes: true})) {
      const relative = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) found.push(...await walk(relative));
      else found.push(relative);
    }
    return found;
  };
  const actualPaths = (await walk(root)).sort();
  assert.deepEqual(actualPaths, [...expected.keys()].sort());
  for (const relativePath of actualPaths) {
    const oid = git(['hash-object', '--', relativePath]).toString('utf8').trim();
    assert.equal(oid, expected.get(relativePath).oid);
  }
};

test('OPF006: candidate 13横型stable treeは不変である', async () => {
  await verifyStableRoot(...stableRoots[0]);
});

test('OPF007: candidate 59横型stable treeは不変である', async () => {
  await verifyStableRoot(...stableRoots[1]);
});

test('OPF008: candidate 59縦型stable treeは不変である', async () => {
  await verifyStableRoot(...stableRoots[2]);
});

test('OPF009: 旧schema converter/fallback/併産を新経路に持たない', async () => {
  const outputProductionPaths = implementationPaths.filter(relativePath => (
    !relativePath.endsWith('.test.mjs')
    && /\/(?:presentation_output_|run_presentation_output_)/u.test(relativePath)
  ));
  const sources = await Promise.all(outputProductionPaths.map(
    relativePath => readFile(path.join(ROOT, relativePath), 'utf8'),
  ));
  const code = sources.join('\n');
  assert.doesNotMatch(code, /\bpublishPresentationArtifactsV002\s*\(/u);
  assert.doesNotMatch(code, /\bvalidateStagedSuccessArtifactsV002\s*\(/u);
  assert.doesNotMatch(code,
    /instruction-bundle|resolution-package|presentation-caption-display-plan-v00/iu);
  assert.doesNotMatch(code, /(?:convert|fallback).*(?:caption-display|instruction|resolution)/iu);
  assert.doesNotMatch(code, /cropPolicy\.(?:decision|selectionPackageManifest)\b/u);
  assert.match(code, /cropPolicy\.application\b/u);
  assert.match(code, /inspectPresentationOutputCropApplicationEnvelopeV001\s*\(/u);
  assert.match(code, /validatePresentationOutputCropApplicationV001\s*\(/u);
});

test('OPF010: 新規検査はAPI通信0件・secret保存0件である', async () => {
  const testPaths = implementationPaths.filter(item => item.endsWith('.test.mjs'));
  const sources = await Promise.all(testPaths.map(
    item => readFile(path.join(ROOT, item), 'utf8'),
  ));
  const forbiddenFragments = [
    "from 'node:" + "http'", "from 'node:" + "https'", "from 'node:" + "net'",
    "from 'node:" + "tls'", 'globalThis.' + 'fetch', 'process.env.' + 'GEMINI_API_KEY',
  ];
  for (const source of sources) {
    for (const fragment of forbiddenFragments) assert.equal(source.includes(fragment), false);
    assert.doesNotMatch(source, new RegExp('(?:^|[^.A-Za-z0-9_$])' + 'fetch' + '\\s*\\(', 'mu'));
  }
});

test('OPF011: O07はO03と既存validatorを出力作成前に実行する', async () => {
  const source = await readFile(path.join(ROOT, 'evals/clip_composition/run_presentation_output_job_v001.ts'), 'utf8');
  const runnerStart = source.indexOf('export async function runPresentationOutputJobV001({');
  const runnerEnd = source.indexOf('export async function runPresentationOutputJobCliV001(');
  assert.ok(runnerStart >= 0 && runnerEnd > runnerStart);
  const runner = source.slice(runnerStart, runnerEnd);
  const acceptance = runner.indexOf('evaluatePresentationOutputAcceptanceChecksV001({');
  const existingValidator = runner.indexOf('validatePresentationOutputMeaningPackageV001(');
  const sourceIdentityValidator = runner.indexOf(
    'validatePresentationSourceIdentityV001(identity.value)',
  );
  const sourceRefMatch = runner.indexOf(
    'identity.value.sourceRef !== sources[0].sourceRef',
  );
  const executionMediaMatch = runner.indexOf(
    '!same(identity.value.executionMedia, sources[0].mediaBinding)',
  );
  const render = runner.indexOf('executeValidatedPresentationDrawAndQcV001({');
  assert.equal((runner.match(/evaluatePresentationOutputAcceptanceChecksV001\s*\(\{/gu) ?? []).length, 1);
  assert.equal((runner.match(/executeValidatedPresentationDrawAndQcV001\s*\(\{/gu) ?? []).length, 1);
  assert.ok(acceptance > 0 && existingValidator > 0 && sourceIdentityValidator > 0
    && sourceRefMatch > sourceIdentityValidator
    && executionMediaMatch > sourceRefMatch
    && render > acceptance && render > existingValidator
    && render > executionMediaMatch);
  const identity = {
    schemaVersion: 'presentation-real-data-source-identity-v001',
    sourceIdentityId: 'output-source-identity-fixture-v001',
    videoId: 'AAAAAAAAAAA',
    sourceUrl: 'https://www.youtube.com/watch?v=AAAAAAAAAAA',
    sourceProvenance: 'output source identity fixture',
    sourceRef: 'youtube:AAAAAAAAAAA',
    executionMedia: mediaBinding('source-a.mp4'),
    mediaEquivalence: mediaBinding('source-a-media-equivalence.json'),
    stt: {
      manifest: mediaBinding('source-a-stt-manifest.json'),
      transcript: mediaBinding('source-a-transcript.json'),
      wordTimestamps: mediaBinding('source-a-word-timestamps.json'),
    },
  };
  const differentIdentity = {
    ...structuredClone(identity),
    sourceIdentityId: 'output-source-identity-foreign-v001',
    videoId: 'BBBBBBBBBBB',
    sourceUrl: 'https://www.youtube.com/watch?v=BBBBBBBBBBB',
    sourceRef: 'youtube:BBBBBBBBBBB',
    executionMedia: mediaBinding('source-b.mp4'),
  };
  assert.equal(validatePresentationSourceIdentityV001(identity), true);
  assert.equal(validatePresentationSourceIdentityV001(differentIdentity), true);
  assert.notEqual(differentIdentity.sourceRef, identity.sourceRef);
  assert.notDeepEqual(differentIdentity.executionMedia, identity.executionMedia);
  const observed = await runPresentationOutputJobV001({
    workspaceRoot: ROOT,
    jobPath: 'outside-formal-job-root.json',
  });
  assert.deepEqual(observed, {
    status: 'fatal',
    exitCode: 2,
    report: null,
    bytes: null,
    stderr: {
      schemaVersion: 'presentation-output-runner-diagnostic-v001',
      status: 'fatal',
      stage: 'job-validation',
      diagnosticCode: 'OUTPUT_FORMAL_JOB_INVALID',
    },
  });
});

test('OPF012: 固定Node+TSX loaderでO05/O07実exportを使い追加loaderを持たない', async () => {
  const nodePath = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
  const loaderPath = '/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs';
  const packagePath = '/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/package.json';
  assert.equal(sha256(await readFile(nodePath)), 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c');
  assert.equal(sha256(await readFile(loaderPath)), 'f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f');
  assert.equal(sha256(await readFile(packagePath)), 'e84b6af2fe6ddf9cae613ee92b41d1c67627dcbc14fe3b7e490d0b545b8e9dbe');
  assert.equal(PRESENTATION_OUTPUT_RENDER_DIAGNOSTIC_CODES_V001.length, 4);
  assert.equal(typeof validatePresentationOutputStagedArtifactsV001, 'function');
  assert.equal(process.execPath, nodePath);
  assert.equal(process.env.NODE_OPTIONS, undefined);
  const loaderArguments = process.execArgv.flatMap((value, index, values) => (
    value === '--import' ? [values[index + 1]] : []
  ));
  assert.deepEqual(loaderArguments, [loaderPath]);
  assert.equal(process.execArgv.includes('--loader'), false);
  assert.equal(process.execArgv.includes('--require'), false);
  assert.equal(path.resolve(process.argv[1]), path.join(
    ROOT,
    'evals/clip_composition/presentation_output_render_plan_v001.test.mjs',
  ));
  const rejectedRuntime = await runFormalOutputE2e('normal-landscape', {
    useCli: true,
    runtimeProfileTransform: runtimeProfile => {
      runtimeProfile.ffmpeg.version = `${runtimeProfile.ffmpeg.version}-untrusted`;
    },
  });
  assert.equal(rejectedRuntime.observed.exitCode, 2);
  assert.deepEqual(rejectedRuntime.controlNames, []);
  assert.deepEqual(rejectedRuntime.renderNames, []);
  assert.equal(rejectedRuntime.cli.stdout.length, 0);
  assert.deepEqual(JSON.parse(rejectedRuntime.cli.stderr.toString('utf8')), {
    schemaVersion: 'presentation-output-runner-diagnostic-v001',
    status: 'fatal',
    stage: 'job-validation',
    diagnosticCode: 'OUTPUT_FORMAL_JOB_INVALID',
  });
});

test('OPF013: 実行入力・crop適用の承認済み親設計SHAが一致する', async () => {
  const relativePath =
    'evals/clip_composition/reports/presentation/'
    + 'presentation-meaning-output-run-input-and-crop-application-contract-design-20260803-v001.md';
  assert.equal(
    sha256(await readFile(path.join(ROOT, relativePath))),
    '05ed3b6df0d5b05204df9ddb2dc0f78295d66f77ed125fa9c921037cb91cabc1',
  );
});

test('OPF014: 既存3本のstable tagは承認済みcommitを指す', () => {
  const expectedTagCommits = [
    ['stable/first-clip-complete-20260727', 'cfa7811c917892fccd39edf9c85aa6e3af2dde97'],
    ['stable/second-clip-generality-20260728', '09ce3c980e9607b6265b1062e05f3ef171f3c72c'],
    ['stable/vertical-first-clip-20260802', 'c2a172aa5d0d5e5ed2759b25a33d886886c89f8f'],
  ];
  for (const [tag, expectedCommit] of expectedTagCommits) {
    assert.equal(
      git(['rev-parse', '--verify', `${tag}^{commit}`]).toString('utf8').trim(),
      expectedCommit,
    );
  }
});

test('OPF015: v006原本とpresentation台帳の完全treeは初期HEADから不変である', async () => {
  const protectedRoots = [
    [FORMAL_E2E_CROP_ROOT, '28fe27051d632a09dfac162687d54aaf4e3b9de4'],
    [FORMAL_E2E_REGISTRY_ROOT, 'b4a7c9b97bb20ced26b086180150bb1490f7098f'],
  ];
  for (const [root, expectedTreeOid] of protectedRoots) {
    const treeLine = git([
      'ls-tree', RUN_INPUT_CROP_INITIAL_HEAD, '--', root,
    ]).toString('utf8').trim();
    const match = /^040000 tree ([0-9a-f]{40})\t(.+)$/u.exec(treeLine);
    assert.ok(match, root);
    assert.equal(match[1], expectedTreeOid, root);
    assert.equal(match[2], root, root);
    await verifyStableRoot(RUN_INPUT_CROP_INITIAL_HEAD, root);
  }
});

test('OPF016: 実装baselineからの差分は承認済み15 pathだけである', async () => {
  const approvedRunInputCropImplementationPaths = [
    'evals/clip_composition/presentation_meaning_output_run_input_record_v001.mjs',
    'evals/clip_composition/run_presentation_meaning_output_run_input_record_v001.mjs',
    'evals/clip_composition/presentation_meaning_output_run_input_record_v001.test.mjs',
    'evals/clip_composition/presentation_output_crop_application_v001.mjs',
    'evals/clip_composition/run_presentation_output_crop_application_job_v001.mjs',
    'evals/clip_composition/presentation_output_contract_v001.mjs',
    'evals/clip_composition/presentation_output_style_resolver_v001.ts',
    'evals/clip_composition/run_presentation_output_job_v001.ts',
    'evals/clip_composition/presentation_output_contract_v001.test.mjs',
    'evals/clip_composition/presentation_output_style_resolver_v001.test.mjs',
    'evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs',
    'evals/clip_composition/presentation_output_render_plan_v001.test.mjs',
  ];
  const approvedLargeMediaReadImplementationPaths = [
    'evals/clip_composition/run_presentation_output_base_media_job_v001.mjs',
    'evals/clip_composition/presentation_output_base_media_v001.test.mjs',
  ];
  const approvedPageLineWrapPolicyImplementationPaths = [
    'evals/clip_composition/presentation_output_page_line_planner_v001.mjs',
  ];
  const approvedImplementationPaths = [
    ...approvedRunInputCropImplementationPaths,
    ...approvedLargeMediaReadImplementationPaths,
    ...approvedPageLineWrapPolicyImplementationPaths,
  ];
  const newImplementationPaths = new Set(
    approvedRunInputCropImplementationPaths.slice(0, 5),
  );
  const isRunInputCropImplementationPath = relativePath => (
    /^evals\/clip_composition\/(?:presentation_(?:meaning_output_|output_)|run_presentation_(?:meaning_output_|output_)).*\.(?:mjs|ts)$/u
      .test(relativePath)
  );
  const tracked = git([
    'diff', '--name-only', RUN_INPUT_CROP_IMPLEMENTATION_BASELINE_COMMIT,
    '--', 'evals/clip_composition',
  ]).toString('utf8').trim().split('\n').filter(isRunInputCropImplementationPath);
  const untracked = git([
    'ls-files', '--others', '--exclude-standard', '--', 'evals/clip_composition',
  ]).toString('utf8').trim().split('\n').filter(isRunInputCropImplementationPath);

  assert.equal(approvedRunInputCropImplementationPaths.length, 12);
  assert.equal(approvedLargeMediaReadImplementationPaths.length, 2);
  assert.equal(approvedPageLineWrapPolicyImplementationPaths.length, 1);
  assert.equal(approvedImplementationPaths.length, 15);
  assert.equal(new Set(approvedImplementationPaths).size, 15);
  assert.deepEqual(
    [...new Set([...tracked, ...untracked])].sort(),
    [...approvedImplementationPaths].sort(),
  );
  for (const relativePath of approvedImplementationPaths) {
    assert.equal((await stat(path.join(ROOT, relativePath))).isFile(), true, relativePath);
    const baselineEntry = git([
      'ls-tree', RUN_INPUT_CROP_IMPLEMENTATION_BASELINE_COMMIT, '--', relativePath,
    ]).toString('utf8').trim();
    assert.equal(baselineEntry.length === 0, newImplementationPaths.has(relativePath), relativePath);
  }
});
