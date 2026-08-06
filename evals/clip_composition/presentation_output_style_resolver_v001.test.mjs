import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
  resolvePresentationOutputStyleV001,
} from './presentation_output_style_resolver_v001.ts';
import {
  resolvePresentationLandscapePresetProjectionV001,
} from './presentation_renderer_plan_v002.mjs';
import {
  PRESENTATION_OUTPUT_CROP_APPLICATION_CHECKS_V001,
  PRESENTATION_OUTPUT_CROP_APPLICATION_FAILURE_ROOT_V001,
  PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001,
  PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_ROOT_V001,
  PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_SCHEMA_V001,
  PRESENTATION_OUTPUT_CROP_APPLICATION_ROOT_V001,
  buildPresentationOutputCropApplicationV001,
  canonicalSha256PresentationOutputFiniteJsonV001,
  derivePresentationOutputCropSelectionProjectionV001,
  serializePresentationOutputCropApplicationFormalJsonV001,
  validatePresentationOutputCropApplicationV001,
} from './presentation_output_crop_application_v001.mjs';
import {
  PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001,
} from './presentation_meaning_output_run_input_record_v001.mjs';
import {
  runPresentationOutputCropApplicationJobV001,
} from './run_presentation_output_crop_application_job_v001.mjs';

const ROOT = process.cwd();
const REGISTRY_ROOT = 'evals/clip_composition/registries/presentation';
const CROP_ROOT = 'evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006';
const REVIEWED_BASE_ROOT =
  'evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001';
const ASSEMBLY_DECISION_PATH =
  'evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json';
const VERTICAL_RUNTIME_JOB_PATH =
  'evals/clip_composition/outputs/presentation/vertical-review-render-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003.json';
const CROP_APPLICATION_CORE_PATH =
  'evals/clip_composition/presentation_output_crop_application_v001.mjs';
const CROP_APPLICATION_RUNNER_PATH =
  'evals/clip_composition/run_presentation_output_crop_application_job_v001.mjs';
const H = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalSha256 = value => sha256(Buffer.from(canonicalJson(value), 'utf8'));

const readJson = async relativePath => JSON.parse(
  await readFile(path.join(ROOT, relativePath), 'utf8'),
);

const readArtifact = async relativePath => {
  const absolutePath = path.join(ROOT, relativePath);
  const bytes = await readFile(absolutePath);
  return {
    path: relativePath,
    absolutePath,
    bytes,
    value: JSON.parse(bytes.toString('utf8')),
  };
};

const writeArtifact = async artifact => {
  await mkdir(path.dirname(artifact.absolutePath), {recursive: true});
  await writeFile(artifact.absolutePath, artifact.bytes, {flag: 'wx'});
};

const binding = schemaVersion => ({schemaVersion, path: 'fixture.json', fileSha256: H, canonicalSha256: H});
const baseMediaInput = baseMedia => ({
  baseMedia,
  timeline: binding('presentation-base-media-timeline-v002'),
  generationManifest: binding('presentation-output-base-media-generation-manifest-v001'),
  validationReceipt: binding('presentation-output-base-media-validation-receipt-v001'),
});
const artifactBinding = (schemaVersion, artifact) => ({
  schemaVersion,
  path: artifact.path,
  fileSha256: sha256(artifact.bytes),
  canonicalSha256: canonicalSha256(artifact.value),
});

const formalArtifact = (relativePath, value) => {
  const bytes = serializePresentationOutputCropApplicationFormalJsonV001(value);
  return {
    path: relativePath,
    absolutePath: path.join(ROOT, relativePath),
    bytes,
    value,
  };
};

const formalArtifactBinding = (schemaVersion, artifact) => ({
  schemaVersion,
  path: artifact.path,
  fileSha256: sha256(artifact.bytes),
  canonicalSha256: canonicalSha256PresentationOutputFiniteJsonV001(artifact.value),
});

const syntheticJsonBinding = (schemaVersion, relativePath, seed = H) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: seed,
  canonicalSha256: seed === H ? B : H,
});

const mediaInspection = () => ({
  width: 1920,
  height: 1080,
  frameRate: '30/1',
  frameCount: 1547,
});

const buildCropApplicationFixture = async ({
  token = 'style-resolver-direct-v001',
  targetBaseMediaPath = `fixtures/${token}-target-base-media.mp4`,
} = {}) => {
  const [cropDecisionArtifact, cropSelectionPackageManifest, reviewedTimeline,
    reviewedGenerationManifest, reviewedValidationReport, assemblyDecision,
    runtimeJob, coreSource, runnerSource] = await Promise.all([
    readArtifact(`${CROP_ROOT}/crop-decision-v006.json`),
    readArtifact(`${CROP_ROOT}/selection-package-manifest-v006.json`),
    readArtifact(`${REVIEWED_BASE_ROOT}/timeline.json`),
    readArtifact(`${REVIEWED_BASE_ROOT}/generation-manifest.json`),
    readArtifact(`${REVIEWED_BASE_ROOT}/validation-report.json`),
    readArtifact(ASSEMBLY_DECISION_PATH),
    readJson(VERTICAL_RUNTIME_JOB_PATH),
    readFile(path.join(ROOT, CROP_APPLICATION_CORE_PATH)),
    readFile(path.join(ROOT, CROP_APPLICATION_RUNNER_PATH)),
  ]);
  const reviewedBaseMedia = {
    path: cropSelectionPackageManifest.value.sourceMedia.path,
    fileSha256: cropSelectionPackageManifest.value.sourceMedia.fileSha256,
  };
  const targetTimelineValue = structuredClone(reviewedTimeline.value);
  targetTimelineValue.timelineId = `${token}-timeline`;
  targetTimelineValue.baseMedia.artifactId = `${token}-base-media`;
  targetTimelineValue.baseMedia.fileSha256 = reviewedBaseMedia.fileSha256;
  const targetTimelineArtifact = formalArtifact(
    `evals/clip_composition/testdata/${token}/target-timeline.json`,
    targetTimelineValue,
  );
  const targetBuildJobBinding = syntheticJsonBinding(
    'presentation-output-base-media-build-job-v001',
    `evals/clip_composition/testdata/${token}/base-media-job.json`,
  );
  const targetManifestValue = {
    schemaVersion: 'presentation-output-base-media-generation-manifest-v001',
    manifestId: `${token}-generation-manifest`,
    jobBinding: targetBuildJobBinding,
    meaningPackageBinding: syntheticJsonBinding(
      'zev-meaning-information-package-v001',
      `evals/clip_composition/testdata/${token}/meaning-information-package.json`,
      B,
    ),
    sourceMediaBindings: [{
      path: reviewedGenerationManifest.value.source.path,
      fileSha256: reviewedGenerationManifest.value.source.fileSha256,
    }],
    baseMedia: {
      path: targetBaseMediaPath,
      fileSha256: reviewedBaseMedia.fileSha256,
    },
    timeline: formalArtifactBinding(
      'presentation-base-media-timeline-v002', targetTimelineArtifact,
    ),
    semanticProjection: {
      sourceMediaCount: 1,
      segmentCount: 1,
      sourceMediaBindingsCanonicalSha256: H,
      timelineCompositionCanonicalSha256: B,
    },
    mediaBuildProjection: {
      frameCount: 1547,
      sampleCount: 2475200,
      audioPacketPayloadSha256: reviewedGenerationManifest.value.audio.encoded
        .packetPayloadSha256,
    },
  };
  const targetManifestArtifact = formalArtifact(
    `evals/clip_composition/testdata/${token}/target-generation-manifest.json`,
    targetManifestValue,
  );
  const targetReceiptValue = {
    schemaVersion: 'presentation-output-base-media-validation-receipt-v001',
    receiptId: `${token}-validation-receipt`,
    status: 'passed',
    jobBinding: structuredClone(targetBuildJobBinding),
    manifestBinding: formalArtifactBinding(
      'presentation-output-base-media-generation-manifest-v001',
      targetManifestArtifact,
    ),
    checks: {
      meaningBinding: 'passed',
      timelineMapping: 'passed',
      videoFrameCount: 'passed',
      audioSampleGrid: 'passed',
      publicationHashGraph: 'passed',
    },
    mediaProjection: {
      frameCount: 1547,
      sampleCount: 2475200,
      audioPacketPayloadSha256: reviewedGenerationManifest.value.audio.encoded
        .packetPayloadSha256,
      baseMediaFileSha256: reviewedBaseMedia.fileSha256,
      timelineFileSha256: sha256(targetTimelineArtifact.bytes),
    },
  };
  const targetReceiptArtifact = formalArtifact(
    `evals/clip_composition/testdata/${token}/target-validation-receipt.json`,
    targetReceiptValue,
  );
  const runInputValue = {
    schemaVersion: PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001,
    recordId: `${token}-run-input`,
    sourceAndInterval: {
      sourceRef: 'youtube:qdczJpv8RCc',
      candidateId: 59,
      assemblyDecision: artifactBinding(
        'presentation-base-media-assembly-decision-v001', assemblyDecision,
      ),
      sourceStartMs: 5941162,
      sourceEndMs: 5992736,
    },
    horizontalStyle: {
      format: 'normal-landscape',
      presetId: 'normal-landscape-readable-pop-v001',
      maxLogicalWidthPerLine: 36,
      crop: {mode: 'identity'},
    },
    verticalStyle: {
      format: 'vertical-short-1080x1920',
      screenLayoutId: 'speaker_only',
      presetId: 'vertical-short-speaker-only-readable-pop-v001',
      maxLogicalWidthPerLine: 14,
      cropDecision: artifactBinding(
        'vertical-preset-type-crop-decision-v006', cropDecisionArtifact,
      ),
      selectionPackageManifest: artifactBinding(
        'vertical-preset-type-crop-selection-package-v006',
        cropSelectionPackageManifest,
      ),
    },
    spendingLimit: {currency: 'USD', maximumNanoUsd: 500000000},
    title: {text: '', inputMode: 'none'},
  };
  const runInputArtifact = formalArtifact(
    `evals/clip_composition/testdata/${token}/run-input-record.json`,
    runInputValue,
  );
  const runtimeProfile = {
    ffmpeg: {
      path: runtimeJob.runtimeProfile.ffmpeg.path,
      version: runtimeJob.runtimeProfile.ffmpeg.version.split(/\r?\n/u)[0],
      fileSha256: runtimeJob.runtimeProfile.ffmpeg.fileSha256,
    },
    ffprobe: {
      path: runtimeJob.runtimeProfile.ffprobe.path,
      version: runtimeJob.runtimeProfile.ffprobe.version.split(/\r?\n/u)[0],
      fileSha256: runtimeJob.runtimeProfile.ffprobe.fileSha256,
    },
  };
  const jobId = `${token}-job`;
  const jobPath = `${PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_ROOT_V001}/${jobId}.json`;
  const job = {
    schemaVersion: PRESENTATION_OUTPUT_CROP_APPLICATION_JOB_SCHEMA_V001,
    jobId,
    applicationId: `${jobId}-application`,
    action: 'apply-reviewed-crop',
    runInputRecordBinding: formalArtifactBinding(
      PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001, runInputArtifact,
    ),
    reviewedCrop: {
      decision: artifactBinding(
        'vertical-preset-type-crop-decision-v006', cropDecisionArtifact,
      ),
      selectionPackageManifest: artifactBinding(
        'vertical-preset-type-crop-selection-package-v006',
        cropSelectionPackageManifest,
      ),
      reviewedBaseMedia: {
        baseMedia: reviewedBaseMedia,
        timeline: artifactBinding(
          'presentation-base-media-timeline-v002', reviewedTimeline,
        ),
        generationManifest: artifactBinding(
          'presentation-base-media-generation-manifest-v002',
          reviewedGenerationManifest,
        ),
        validationReport: artifactBinding(
          'presentation-base-media-validation-report-v001', reviewedValidationReport,
        ),
      },
    },
    targetBaseMedia: {
      baseMedia: {
        path: targetBaseMediaPath,
        fileSha256: reviewedBaseMedia.fileSha256,
      },
      timeline: formalArtifactBinding(
        'presentation-base-media-timeline-v002', targetTimelineArtifact,
      ),
      generationManifest: formalArtifactBinding(
        'presentation-output-base-media-generation-manifest-v001',
        targetManifestArtifact,
      ),
      validationReceipt: formalArtifactBinding(
        'presentation-output-base-media-validation-receipt-v001',
        targetReceiptArtifact,
      ),
    },
    runtimeProfile,
    outputPath: `${PRESENTATION_OUTPUT_CROP_APPLICATION_ROOT_V001}/`
      + `${jobId}-application/crop-application.json`,
    implementationBindings: [
      {
        path: PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001[0].path,
        fileSha256: sha256(coreSource),
        role: PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001[0].role,
      },
      {
        path: PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001[1].path,
        fileSha256: sha256(runnerSource),
        role: PRESENTATION_OUTPUT_CROP_APPLICATION_IMPLEMENTATION_BINDINGS_V001[1].role,
      },
    ],
    executionPolicy: {
      oneShot: true,
      allowOverwrite: false,
      allowCropRecalculation: false,
    },
  };
  const jobArtifact = formalArtifact(jobPath, job);
  return {
    job,
    jobArtifact,
    runInputValue,
    runInputArtifact,
    cropDecisionArtifact,
    cropSelectionPackageManifest,
    reviewedTimeline,
    reviewedGenerationManifest,
    reviewedValidationReport,
    targetTimelineArtifact,
    targetManifestArtifact,
    targetReceiptArtifact,
    reviewedMediaInspection: mediaInspection(),
    targetMediaInspection: mediaInspection(),
  };
};

const cropApplicationBuildArguments = fixture => ({
  job: fixture.job,
  jobPath: fixture.jobArtifact.path,
  jobBytes: fixture.jobArtifact.bytes,
  runInputRecord: fixture.runInputValue,
  cropDecision: fixture.cropDecisionArtifact.value,
  selectionPackageManifest: fixture.cropSelectionPackageManifest.value,
  reviewedTimeline: fixture.reviewedTimeline.value,
  reviewedGenerationManifest: fixture.reviewedGenerationManifest.value,
  reviewedValidationReport: fixture.reviewedValidationReport.value,
  targetTimeline: fixture.targetTimelineArtifact.value,
  targetGenerationManifest: fixture.targetManifestArtifact.value,
  targetValidationReceipt: fixture.targetReceiptArtifact.value,
  reviewedMediaInspection: fixture.reviewedMediaInspection,
  targetMediaInspection: fixture.targetMediaInspection,
});

const cropApplicationFixture = ({
  cropDecisionArtifact,
  cropSelectionPackageManifest,
  targetBaseMedia,
}) => {
  const reviewedBaseMedia = {
    baseMedia: {
      path: cropSelectionPackageManifest.value.sourceMedia.path,
      fileSha256: cropSelectionPackageManifest.value.sourceMedia.fileSha256,
    },
    timeline: binding('presentation-base-media-timeline-v002'),
    generationManifest: binding('presentation-base-media-generation-manifest-v002'),
    validationReport: binding('presentation-base-media-validation-report-v001'),
  };
  const application = {
    schemaVersion: 'presentation-output-crop-application-v001',
    applicationId: 'style-resolver-crop-application-v001',
    status: 'passed',
    jobBinding: binding('presentation-output-crop-application-job-v001'),
    runInputRecordBinding: binding('presentation-meaning-output-run-input-record-v001'),
    reviewedCrop: {
      decision: artifactBinding(
        'vertical-preset-type-crop-decision-v006', cropDecisionArtifact,
      ),
      selectionPackageManifest: artifactBinding(
        'vertical-preset-type-crop-selection-package-v006',
        cropSelectionPackageManifest,
      ),
      reviewedBaseMedia,
    },
    targetBaseMedia,
    sourceEquivalence: {
      guarantee: 'same-source-and-timeline-only',
      sourceRef: 'youtube:fixture0001',
      sourceMedia: reviewedBaseMedia.baseMedia,
      sourceFrameClock: {
        inputFrameRate: '30/1',
        logicalFrameRate: '30/1',
        extractionRuleId: 'fixture-frame-clock-v001',
        decodedFrameCount: 1547,
      },
      segments: [{
        sourceStartMs: 0,
        sourceEndMs: 51567,
        sourceStartFrame30: 0,
        sourceEndFrame30: 1547,
        outputStartFrame: 0,
        outputEndFrame: 1547,
      }],
      outputGeometry: {width: 1920, height: 1080, frameRate: '30/1', frameCount: 1547},
      baseMediaByteRelation: 'different',
    },
    selectionProjection: derivePresentationOutputCropSelectionProjectionV001(
      cropDecisionArtifact.value,
    ),
    checks: Object.fromEntries(
      PRESENTATION_OUTPUT_CROP_APPLICATION_CHECKS_V001.map(name => [name, 'passed']),
    ),
  };
  const bytes = serializePresentationOutputCropApplicationFormalJsonV001(application);
  return {
    path: 'fixtures/style-resolver-crop-application-v001.json',
    absolutePath: path.join(ROOT, 'fixtures/style-resolver-crop-application-v001.json'),
    bytes,
    value: application,
  };
};

const loadLandscape = async () => {
  const directory = `${REGISTRY_ROOT}/normal-landscape-preset-registry-v001`;
  const [trustedRegistryBindings, presetRegistry, presetValidationIndex,
    materialValidationIndex, rendererTrust] = await Promise.all([
    readArtifact(`${directory}/trusted-registry-bindings.json`),
    readArtifact(`${directory}/preset-registry.json`),
    readArtifact(`${directory}/preset-validation-index.json`),
    readArtifact(`${directory}/material-validation-index.json`),
    readArtifact(`${REGISTRY_ROOT}/presentation-renderer-trust-v001/trust.json`),
  ]);
  return {
    artifacts: {
      trustedRegistryBindings: trustedRegistryBindings.value,
      presetRegistry: presetRegistry.value,
      presetValidationIndex: presetValidationIndex.value,
      materialValidationIndex: materialValidationIndex.value,
      rendererTrust: rendererTrust.value,
    },
    styleInput: {
      format: 'normal-landscape',
      screenLayoutId: null,
      presetBinding: {
        trustedRegistryBindings: artifactBinding(
          'presentation-registry-trust-v001', trustedRegistryBindings,
        ),
        presetRegistry: artifactBinding('presentation-preset-registry-v001', presetRegistry),
        presetValidationIndex: artifactBinding(
          'normal-landscape-preset-registry-v001', presetValidationIndex,
        ),
        materialValidationIndex: artifactBinding(
          'presentation-material-registry-empty-v001', materialValidationIndex,
        ),
        rendererTrust: artifactBinding('presentation-renderer-trust-v001', rendererTrust),
        presetId: 'normal-landscape-readable-pop-v001',
      },
      captionLayoutPolicy: {
        maxLogicalWidthPerLine: 36,
        maxLinesPerDisplayPage: 2,
        characterWidthRule: PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
        pageBreakPolicy: 'split-at-source-atom-boundary-or-reject',
      },
      cropPolicy: {mode: 'identity'},
      sceneTransitionPolicy: {mode: 'straight-cut-only'},
      audioPolicy: {mode: 'preserve-source-only'},
      materials: [],
    },
  };
};

const loadVertical = async () => {
  const directory = `${REGISTRY_ROOT}/vertical-short-preset-registry-v001`;
  const cropDecisionArtifact = await readArtifact(`${CROP_ROOT}/crop-decision-v006.json`);
  const cropSelectionPackageManifest = await readArtifact(
    `${CROP_ROOT}/selection-package-manifest-v006.json`,
  );
  const targetBaseMedia = baseMediaInput({
    path: 'fixtures/style-resolver-target-base-media.mp4',
    fileSha256: H,
  });
  const cropApplicationArtifact = cropApplicationFixture({
    cropDecisionArtifact,
    cropSelectionPackageManifest,
    targetBaseMedia,
  });
  return {
    artifacts: {
      trustedRegistryBindings: await readJson(`${directory}/trusted-registry-bindings.json`),
      presetRegistry: await readJson(`${directory}/preset-registry.json`),
      presetValidationIndex: await readJson(`${directory}/preset-validation-index.json`),
      materialValidationIndex: await readJson(`${directory}/material-validation-index.json`),
      rendererTrust: await readJson(`${REGISTRY_ROOT}/presentation-vertical-renderer-trust-v001/trust.json`),
      cropApplicationArtifact,
      cropDecisionArtifact,
      cropSelectionPackageManifest,
    },
    baseMediaInput: targetBaseMedia,
    styleInput: {
      format: 'vertical-short-1080x1920',
      screenLayoutId: 'speaker_only',
      presetBinding: {
        trustedRegistryBindings: binding('presentation-registry-trust-v002'),
        presetRegistry: binding('presentation-preset-registry-v002'),
        presetValidationIndex: binding('vertical-short-preset-registry-v001'),
        materialValidationIndex: binding('presentation-material-registry-empty-v001'),
        rendererTrust: binding('presentation-vertical-renderer-trust-v001'),
        presetId: 'vertical-short-speaker-only-readable-pop-v001',
      },
      captionLayoutPolicy: {
        maxLogicalWidthPerLine: 14,
        maxLinesPerDisplayPage: 2,
        characterWidthRule: PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
        pageBreakPolicy: 'split-at-source-atom-boundary-or-reject',
      },
      cropPolicy: {
        mode: 'bound-decision',
        scope: 'all-segments',
        application: artifactBinding(
          'presentation-output-crop-application-v001', cropApplicationArtifact,
        ),
      },
      sceneTransitionPolicy: {mode: 'straight-cut-only'},
      audioPolicy: {mode: 'preserve-source-only'},
      materials: [],
    },
  };
};

const resolveLandscape = async () => {
  const fixture = await loadLandscape();
  return resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaInput: baseMediaInput({path: 'fixtures/base-media.mp4', fileSha256: H}),
    baseMediaInspection: null,
  });
};

const resolveVertical = async () => {
  const fixture = await loadVertical();
  return resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
};

test('OSR001: 横型presetを既存registryから一意に解決する', async () => {
  const result = await resolveLandscape();
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolvedStyle.presetId, 'normal-landscape-readable-pop-v001');
  assert.equal(result.resolvedStyle.format, 'normal-landscape');

  const tampered = await loadLandscape();
  tampered.artifacts.presetValidationIndex.presets[0].presetId = 'foreign-preset-v001';
  const rejected = await resolvePresentationOutputStyleV001({
    ...tampered,
    baseMediaInput: baseMediaInput({path: 'fixtures/base-media.mp4', fileSha256: H}),
    baseMediaInspection: null,
  });
  assert.equal(rejected.status, 'rejected');
  assert.deepEqual(rejected.violations.map(item => item.code), ['STYLE_BINDING_MISMATCH']);

  const selfDeclaredCopy = await loadLandscape();
  selfDeclaredCopy.styleInput.presetBinding.presetValidationIndex.path =
    'fixtures/self-declared-preset-validation-index.json';
  const copiedIndexResult = await resolvePresentationOutputStyleV001({
    ...selfDeclaredCopy,
    baseMediaInput: baseMediaInput({path: 'fixtures/base-media.mp4', fileSha256: H}),
    baseMediaInspection: null,
  });
  assert.equal(copiedIndexResult.status, 'rejected');
  assert.deepEqual(
    copiedIndexResult.violations.map(item => item.code),
    ['STYLE_BINDING_MISMATCH'],
  );
});

test('OSR002: 縦型speaker_only presetを既存registryから一意に解決する', async () => {
  const result = await resolveVertical();
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolvedStyle.presetId, 'vertical-short-speaker-only-readable-pop-v001');
  assert.equal(result.resolvedStyle.screenLayoutId, 'speaker_only');
});

test('OSR003: 横型screenLayoutIdはnullかつcropはidentityである', async () => {
  const result = await resolveLandscape();
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolvedStyle.screenLayoutId, null);
  assert.deepEqual(result.cropContext, {mode: 'identity'});
});

test('OSR004: 未登録の縦型layoutをfallbackせず拒否する', async () => {
  const fixture = await loadVertical();
  fixture.styleInput.screenLayoutId = 'screen_speaker';
  const result = await resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
  assert.equal(result.status, 'rejected');
  assert.deepEqual(result.violations.map(item => item.code), ['PRESET_CAPABILITY_MISMATCH']);
});

test('OSR005: 横縦の幅能力は同じfieldに明示され暗黙定数へ戻らない', async () => {
  const [landscape, vertical] = await Promise.all([resolveLandscape(), resolveVertical()]);
  assert.equal(landscape.status, 'resolved');
  assert.equal(vertical.status, 'resolved');
  assert.equal(landscape.resolvedStyle.maxLogicalWidthPerLine, 36);
  assert.equal(vertical.resolvedStyle.maxLogicalWidthPerLine, 14);
  assert.deepEqual(Object.keys(landscape.resolvedStyle), Object.keys(vertical.resolvedStyle));
});

test('OSR006: crop applicationは認定原本と対象base mediaを別々に束縛する', async () => {
  const fixture = await loadVertical();
  fixture.baseMediaInput.baseMedia.fileSha256 = 'b'.repeat(64);
  const result = await resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
  assert.equal(result.status, 'rejected');
  assert.deepEqual(result.violations.map(item => item.code), ['CROP_BINDING_MISMATCH']);

  const pathMismatch = await loadVertical();
  pathMismatch.styleInput.cropPolicy.application.path =
    `${CROP_ROOT}/byte-identical-copy.json`;
  const pathResult = await resolvePresentationOutputStyleV001({
    ...pathMismatch,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
  assert.equal(pathResult.status, 'rejected');
  assert.deepEqual(pathResult.violations.map(item => item.code), ['CROP_BINDING_MISMATCH']);

  const legacyDirectCrop = await loadVertical();
  legacyDirectCrop.styleInput.cropPolicy = {
    mode: 'bound-decision',
    scope: 'all-segments',
    decision: artifactBinding(
      'vertical-preset-type-crop-decision-v006',
      legacyDirectCrop.artifacts.cropDecisionArtifact,
    ),
    selectionPackageManifest: artifactBinding(
      'vertical-preset-type-crop-selection-package-v006',
      legacyDirectCrop.artifacts.cropSelectionPackageManifest,
    ),
  };
  const legacyResult = await resolvePresentationOutputStyleV001({
    ...legacyDirectCrop,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
  assert.equal(legacyResult.status, 'rejected');

  const trustMismatch = await loadVertical();
  const trustResult = await resolvePresentationOutputStyleV001({
    ...trustMismatch,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
    runtimeProfile: {},
    implementationBindings: [],
  });
  assert.equal(trustResult.status, 'rejected');
  assert.deepEqual(trustResult.violations.map(item => item.code), ['STYLE_BINDING_MISMATCH']);
  assert.equal(trustResult.violations[0].path, '/styleInput/presetBinding/rendererTrust');
});

test('OSR007: 横型preset projectionは既存共通入口のbyte列と同一である', async () => {
  const fixture = await loadLandscape();
  const result = await resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaInput: baseMediaInput({path: 'fixtures/base-media.mp4', fileSha256: H}),
    baseMediaInspection: null,
  });
  const projection = resolvePresentationLandscapePresetProjectionV001(
    fixture.artifacts.presetRegistry,
    fixture.styleInput.presetBinding.presetId,
    'speech-caption',
  );
  assert.equal(result.status, 'resolved');
  assert.equal(JSON.stringify({
    preset: result.layoutContext.preset,
    policy: result.layoutContext.policy,
    visualState: result.layoutContext.visualState,
    transition: result.layoutContext.transition,
  }), JSON.stringify(projection));
});

test('OSR008: 縦型cropは既存共通入口だけを呼び第二計算を持たない', async () => {
  const source = await readFile(
    path.join(ROOT, 'evals/clip_composition/presentation_output_style_resolver_v001.ts'),
    'utf8',
  );
  assert.match(source, /validatePresentationOutputCropApplicationV001\s*\(/u);
  assert.match(source, /buildPresentationVerticalCropFilterV001\s*\(/u);
  assert.doesNotMatch(source, /validatePresentationVerticalCropSourceBindingV001\s*\(/u);
  assert.doesNotMatch(source, /buildLayoutVideoFilter/u);
  const result = await resolveVertical();
  assert.equal(result.status, 'resolved');
  assert.equal(result.cropContext.mode, 'bound-decision');
  assert.equal(result.cropContext.screenLayoutId, 'speaker_only');
});

test('OSR009: crop適用coreはv006認定値を同一source・timeline・geometryへだけ適用する', async () => {
  const fixture = await buildCropApplicationFixture();
  const freshArguments = () => {
    const original = cropApplicationBuildArguments(fixture);
    return {
      ...structuredClone(original),
      jobBytes: Buffer.from(original.jobBytes),
    };
  };
  const built = await buildPresentationOutputCropApplicationV001(freshArguments());
  assert.equal(built.status, 'passed');
  assert.equal(built.sourceEquivalence.sourceRef, 'youtube:qdczJpv8RCc');
  assert.deepEqual(
    built.sourceEquivalence.segments,
    fixture.reviewedTimeline.value.segments.map(segment => ({
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      sourceStartFrame30: segment.sourceStartFrame30,
      sourceEndFrame30: segment.sourceEndFrame30,
      outputStartFrame: segment.outputStartFrame,
      outputEndFrame: segment.outputEndFrame,
    })),
  );
  assert.deepEqual(built.sourceEquivalence.outputGeometry, mediaInspection());
  assert.deepEqual(
    built.selectionProjection,
    derivePresentationOutputCropSelectionProjectionV001(fixture.cropDecisionArtifact.value),
  );

  const reviewedSourceMismatch = freshArguments();
  reviewedSourceMismatch.selectionPackageManifest.sourceMedia.fileSha256 = C;
  await assert.rejects(
    () => buildPresentationOutputCropApplicationV001(reviewedSourceMismatch),
    error => error?.violationCode === 'CROP_APPLICATION_REVIEWED_BINDING_MISMATCH',
  );

  const sourceMismatch = freshArguments();
  sourceMismatch.targetGenerationManifest.sourceMediaBindings[0].fileSha256 = C;
  await assert.rejects(
    () => buildPresentationOutputCropApplicationV001(sourceMismatch),
    error => error?.violationCode === 'CROP_APPLICATION_SOURCE_IDENTITY_MISMATCH',
  );

  const timelineMismatch = freshArguments();
  timelineMismatch.targetTimeline.segments[0].sourceEndFrame30 -= 1;
  await assert.rejects(
    () => buildPresentationOutputCropApplicationV001(timelineMismatch),
    error => error?.violationCode === 'CROP_APPLICATION_TIMELINE_MISMATCH',
  );

  const geometryMismatch = freshArguments();
  geometryMismatch.targetMediaInspection.width = 1280;
  await assert.rejects(
    () => buildPresentationOutputCropApplicationV001(geometryMismatch),
    error => error?.violationCode === 'CROP_APPLICATION_MEDIA_GEOMETRY_MISMATCH',
  );

  const selectionCases = [
    projection => { projection.screenLayoutId = 'screen_speaker'; },
    projection => { projection.selectedCandidateId = 'speaker_only_face'; },
    projection => { projection.viewports.speaker[0] += 0.0001; },
  ];
  for (const mutate of selectionCases) {
    const changed = structuredClone(built);
    mutate(changed.selectionProjection);
    changed.selectionProjection.canonicalSha256 =
      canonicalSha256PresentationOutputFiniteJsonV001({
        screenLayoutId: changed.selectionProjection.screenLayoutId,
        selectedCandidateId: changed.selectionProjection.selectedCandidateId,
        viewports: changed.selectionProjection.viewports,
      });
    const result = validatePresentationOutputCropApplicationV001({
      application: changed,
      cropDecision: fixture.cropDecisionArtifact.value,
      selectionPackageManifest: fixture.cropSelectionPackageManifest.value,
      targetBaseMedia: fixture.job.targetBaseMedia,
      screenLayoutId: fixture.runInputValue.verticalStyle.screenLayoutId,
    });
    assert.equal(result.status, 'rejected');
    assert.deepEqual(
      result.violations.map(item => item.code),
      ['CROP_APPLICATION_SELECTION_PROJECTION_MISMATCH'],
    );
  }
});

test('OSR010: crop適用runnerは実v006原本から一度だけ公開し既存先を置換しない', async () => {
  const fixtureParent = path.join(ROOT, 'evals/clip_composition/testdata');
  await mkdir(fixtureParent, {recursive: true});
  const fixtureAbsoluteRoot = await mkdtemp(path.join(
    fixtureParent,
    'crop-application-runner-',
  ));
  const token = path.basename(fixtureAbsoluteRoot);
  const fixtureRoot = `evals/clip_composition/testdata/${token}`;
  const targetBaseMediaPath = `${fixtureRoot}/target-base-media.mp4`;
  const outputRoot = `${PRESENTATION_OUTPUT_CROP_APPLICATION_ROOT_V001}/`
    + `${token}-job-application`;
  const failureRoot = `${PRESENTATION_OUTPUT_CROP_APPLICATION_FAILURE_ROOT_V001}/`
    + `${token}-job`;
  let fixture;
  try {
    fixture = await buildCropApplicationFixture({token, targetBaseMediaPath});
    await Promise.all([
      writeArtifact(fixture.runInputArtifact),
      writeArtifact(fixture.targetTimelineArtifact),
      writeArtifact(fixture.targetManifestArtifact),
      writeArtifact(fixture.targetReceiptArtifact),
    ]);
    await copyFile(
      path.join(ROOT, REVIEWED_BASE_ROOT, 'base-media.mp4'),
      path.join(ROOT, targetBaseMediaPath),
    );
    await writeArtifact(fixture.jobArtifact);

    const first = await runPresentationOutputCropApplicationJobV001({
      workspaceRoot: ROOT,
      jobPath: fixture.jobArtifact.path,
      executedAt: '2026-08-03T00:00:00Z',
    });
    assert.equal(first.status, 'passed');
    assert.equal(first.exitCode, 0);
    assert.equal(first.outputPath, fixture.job.outputPath);
    assert.deepEqual(
      await readFile(path.join(ROOT, first.outputPath)),
      first.bytes,
    );

    const second = await runPresentationOutputCropApplicationJobV001({
      workspaceRoot: ROOT,
      jobPath: fixture.jobArtifact.path,
      executedAt: '2026-08-03T00:00:01Z',
    });
    assert.equal(second.status, 'rejected');
    assert.equal(second.exitCode, 1);
    assert.deepEqual(
      second.failureReport.violations.map(item => item.code),
      ['CROP_APPLICATION_PUBLICATION_TARGET_INVALID'],
    );
    assert.deepEqual(
      await readFile(path.join(ROOT, first.outputPath)),
      first.bytes,
    );
  } finally {
    await Promise.all([
      rm(fixtureAbsoluteRoot, {recursive: true, force: true}),
      rm(path.join(ROOT, outputRoot), {recursive: true, force: true}),
      rm(path.join(ROOT, failureRoot), {recursive: true, force: true}),
      fixture === undefined
        ? Promise.resolve()
        : rm(path.join(ROOT, fixture.jobArtifact.path), {force: true}),
    ]);
  }
});
