import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001,
} from './presentation_renderer_plan_v002.mjs';
import {
  ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001,
  ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001,
  ZEVO_TITLE_IMPLEMENTATION_ROLES_V001,
  ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001,
  ZEVO_TITLE_OUTPUT_MANIFEST_SCHEMA_V001,
  ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001,
  ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001,
  ZEVO_TITLE_STYLE_REGISTRY_SCHEMA_V001,
  buildZevoTitleCommonCorePlanV001,
  buildZevoTitleDisplayPlanV001,
  buildZevoTitleOutputManifestV001,
  buildZevoTitleOutputQcV001,
  buildZevoTitleRendererEvidenceV001,
  canonicalSha256ZevoTitleJsonV001,
  serializeZevoTitleFormalJsonV001,
  validateZevoTitleDisplayPlanV001,
  validateZevoTitleMeaningReplacementV001,
  validateZevoTitleOutputJobV001,
  validateZevoTitleOutputManifestV001,
  validateZevoTitleOutputQcV001,
  validateZevoTitleRendererEvidenceV001,
  validateZevoTitleStyleRegistryV001,
} from './presentation_output_title_compositor_v001.mjs';

const SHA = Object.freeze({
  a: 'a'.repeat(64), b: 'b'.repeat(64), c: 'c'.repeat(64),
  d: 'd'.repeat(64), e: 'e'.repeat(64), f: 'f'.repeat(64),
  zero: '0'.repeat(64), one: '1'.repeat(64), two: '2'.repeat(64),
  three: '3'.repeat(64), four: '4'.repeat(64), five: '5'.repeat(64),
});

const jsonBinding = (schemaVersion, stem, fileSha256 = SHA.a) => ({
  schemaVersion,
  path: `evals/clip_composition/testdata/title/${stem}.json`,
  fileSha256,
  canonicalSha256: canonicalSha256ZevoTitleJsonV001({stem}),
});

const mediaBinding = (stem, fileSha256 = SHA.b) => ({
  path: `evals/clip_composition/testdata/title/${stem}.mp4`,
  fileSha256,
});

const sourceOutput = () => ({
  manifest: jsonBinding('presentation-output-render-manifest-v001', 'source-manifest'),
  renderPlan: jsonBinding('presentation-output-render-plan-v001', 'source-plan'),
  qc: jsonBinding('presentation-output-render-qc-v001', 'source-qc'),
  video: mediaBinding('source-video', SHA.c),
});

const runtimeBinding = (role, index) => ({
  path: `/opt/zevo/${role}`,
  version: `${role}-v1`,
  fileSha256: String(index).repeat(64),
});

const runtimeProfile = () => ({
  node: runtimeBinding('node', 1),
  tsx: runtimeBinding('tsx', 2),
  remotion: runtimeBinding('remotion', 3),
  browser: runtimeBinding('browser', 4),
  ffmpeg: runtimeBinding('ffmpeg', 5),
  ffprobe: runtimeBinding('ffprobe', 6),
  imageMagick: runtimeBinding('imageMagick', 7),
});

const implementationBindings = () => ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001.map(
  ({role, path}) => ({
    path,
    fileSha256: SHA.d,
    role,
  }),
);

const meaningJsonBinding = (schemaVersion, stem, sha = SHA.a) => ({
  schemaVersion,
  path: `evals/clip_composition/testdata/title/${stem}.json`,
  fileSha256: sha,
  canonicalSha256: canonicalSha256ZevoTitleJsonV001({stem, schemaVersion}),
});

const makeMeaningPackage = ({
  packageId = 'candidate-59-source-meaning',
  title = {text: '', inputMode: 'none'},
  provenanceSeed = 'source',
} = {}) => {
  const ref = {
    timelineSegmentId: 'segment-0001',
    sourceMediaId: 'source-media-000001',
    atomId: 'atom-0001',
  };
  return {
    schemaVersion: 'zev-meaning-information-package-v001',
    packageId,
    sourceMedia: [{
      sourceMediaId: 'source-media-000001',
      ordinal: 1,
      sourceRef: 'youtube:qdczJpv8RCc',
      mediaBinding: mediaBinding('base-media', SHA.f),
      sourceIdentityBinding: meaningJsonBinding(
        'presentation-real-data-source-identity-v001',
        'source-identity',
      ),
      retainedSourceAtomsBinding: {
        sourceAtoms: meaningJsonBinding(
          'presentation-retained-source-atoms-v001',
          'source-atoms',
        ),
        generationManifest: meaningJsonBinding(
          'presentation-retained-source-atoms-generation-manifest-v001',
          'source-atoms-manifest',
        ),
        validationReport: meaningJsonBinding(
          'presentation-retained-source-atoms-validation-report-v001',
          'source-atoms-validation',
        ),
      },
    }],
    timelineComposition: {
      timelineId: `${packageId}-timeline`,
      segments: [{
        segmentId: 'segment-0001',
        ordinal: 1,
        sourceMediaId: 'source-media-000001',
        sourceStartMs: 5941162,
        sourceEndMs: 5992736,
      }],
    },
    captions: [{
      captionId: 'caption-000001',
      ordinal: 1,
      timelineSegmentId: 'segment-0001',
      text: '全部やりかけ',
      atomRefs: [ref],
      startAnchor: {atomRef: ref, edge: 'start'},
      endAnchor: {atomRef: ref, edge: 'end'},
      sourceStartMs: 5941162,
      sourceEndMs: 5992736,
    }],
    title,
    semanticObservations: [],
    provenance: {
      formalJobBinding: meaningJsonBinding(
        'zev-meaning-information-package-job-v001',
        `${provenanceSeed}-meaning-job`,
      ),
      timelineCompositionBinding: meaningJsonBinding(
        'zev-timeline-composition-decision-v001',
        `${provenanceSeed}-timeline-decision`,
      ),
      semanticSelectionValidationBinding: meaningJsonBinding(
        'presentation-caption-meaning-boundary-validation-report-v001',
        `${provenanceSeed}-semantic-validation`,
      ),
    },
  };
};

const visualState = (stateId, fontSizePx, maxCharsPerLine, maxLines) => ({
  stateId,
  textStyle: {
    fontAssetId: 'line-seed-jp-extra-bold-v001',
    fontSizePx,
    fontColor: '#FFFDF8',
    borderColor: '#111827',
    borderWidthPx: 8,
    lineSpacingPercent: 150,
    glowColor: '#000000',
    glowWidthPx: 12,
    glowOpacityPercent: 82,
  },
  position: {
    preset: 'top-center',
    alignment: 'center',
    offsetXPercent: 0,
    offsetYPercent: 0,
  },
  background: null,
  layout: {maxCharsPerLine, maxLines, singleLine: false},
  transitionId: 'quick-fade-4f-v001',
});

const makeRegistry = () => ({
  schemaVersion: ZEVO_TITLE_STYLE_REGISTRY_SCHEMA_V001,
  registryId: 'zevo-title-style-registry-v001',
  fontAssets: [{
    fontAssetId: 'line-seed-jp-extra-bold-v001',
    fileName: 'LINESeedJP_A_OTF_Eb.otf',
    path: 'runner/public/font/LINESeedJP_A_OTF_Eb.otf',
    fileSha256: SHA.one,
    licensePath: 'runner/public/font/OFL_LINESeedJP.txt',
  }],
  layoutRules: structuredClone(PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001),
  profiles: [{
    profileId: 'title-landscape-v001',
    format: 'normal-landscape',
    canvas: {width: 1920, height: 1080, fps: 30},
    safeArea: {top: 40, right: 80, bottom: 40, left: 80},
    displayFrameRange: {startFrame: 0, endFrameExclusive: 90},
    maxLogicalWidth: 8,
    maxLines: 2,
    visualState: visualState('title-landscape-state-v001', 96, 8, 2),
  }, {
    profileId: 'title-vertical-v001',
    format: 'vertical-short-1080x1920',
    canvas: {width: 1080, height: 1920, fps: 30},
    safeArea: {top: 38, right: 43, bottom: 38, left: 43},
    displayFrameRange: {startFrame: 0, endFrameExclusive: 75},
    maxLogicalWidth: 6,
    maxLines: 2,
    visualState: visualState('title-vertical-state-v001', 134, 6, 2),
  }],
});

const makeJob = ({profileId = 'title-landscape-v001'} = {}) => {
  const outputId = profileId.includes('vertical')
    ? 'candidate-59-title-vertical-v001'
    : 'candidate-59-title-landscape-v001';
  return {
    schemaVersion: ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001,
    jobId: `${outputId}-job`,
    outputId,
    titleMeaningPackageBinding: jsonBinding(
      'zev-meaning-information-package-v001',
      'title-meaning-package',
    ),
    sourceOutput: sourceOutput(),
    styleRegistryBinding: jsonBinding(
      ZEVO_TITLE_STYLE_REGISTRY_SCHEMA_V001,
      'title-style-registry',
    ),
    profileId,
    publication: {
      outputRoot: `evals/clip_composition/outputs/presentation/title/${outputId}`,
    },
    runtimeProfile: runtimeProfile(),
    implementationBindings: implementationBindings(),
  };
};

const jobBindingFor = job => ({
  schemaVersion: ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001,
  path: `evals/clip_composition/jobs/presentation/title/${job.jobId}.json`,
  fileSha256: canonicalSha256ZevoTitleJsonV001(job),
  canonicalSha256: canonicalSha256ZevoTitleJsonV001(job),
});

const buildFixture = (profileId = 'title-landscape-v001') => {
  const registry = makeRegistry();
  const job = makeJob({profileId});
  const sourceMeaningPackage = makeMeaningPackage();
  const titleMeaningPackage = makeMeaningPackage({
    packageId: 'candidate-59-titled-meaning',
    title: {text: '全部やりかけ', inputMode: 'human'},
    provenanceSeed: 'titled',
  });
  const jobBinding = jobBindingFor(job);
  const result = buildZevoTitleDisplayPlanV001({
    job, jobBinding, registry, sourceMeaningPackage, titleMeaningPackage,
  });
  assert.equal(result.status, 'built');
  return {
    registry, job, sourceMeaningPackage, titleMeaningPackage, jobBinding,
    plan: result.plan,
  };
};

const planBindingFor = plan => ({
  schemaVersion: ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001,
  path: `evals/clip_composition/outputs/presentation/title/${plan.planId}.json`,
  fileSha256: canonicalSha256ZevoTitleJsonV001(plan),
  canonicalSha256: canonicalSha256ZevoTitleJsonV001(plan),
});

const applicationResultFor = (fixture) => ({
  instructionId: fixture.plan.titleDisplay.displayId,
  status: 'rendered',
  requestedPresetId: fixture.plan.profileId,
  appliedPresetId: fixture.plan.profileId,
  appliedPresetRegistryVersion: fixture.registry.registryId,
  stateId: fixture.registry.profiles.find(
    profile => profile.profileId === fixture.plan.profileId,
  ).visualState.stateId,
  appliedOverlayPropsCanonicalSha256: SHA.two,
  overlayFile: 'overlays/title.png',
  overlaySha256: SHA.three,
  finalPlanElementReference: {
    planFile: 'presentation-render-plan-v002.json',
    instructionId: fixture.plan.titleDisplay.displayId,
    canonicalSha256: SHA.four,
  },
});

const rendererQcFor = fixture => ({
  schemaVersion: 'presentation-render-qc-v002',
  status: 'passed',
  instructionCount: 1,
  checks: {
    instructionApplication: {status: 'passed'},
    layoutAndVisibility: {status: 'passed'},
    media: {status: 'passed'},
  },
  instructionEvidence: [{instructionId: fixture.plan.titleDisplay.displayId}],
  mediaEvidence: {observed: {}, expectedAudio: {}, expectedFrameCount: 1547},
  violations: [],
});

const buildEvidenceFixture = (fixture) => {
  const planBinding = planBindingFor(fixture.plan);
  const result = buildZevoTitleRendererEvidenceV001({
    plan: fixture.plan,
    planBinding,
    applicationResults: [applicationResultFor(fixture)],
    rendererQc: rendererQcFor(fixture),
  });
  assert.equal(result.status, 'built');
  const rendererEvidenceBinding = {
    schemaVersion: ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001,
    path: `evals/clip_composition/outputs/presentation/title/${fixture.job.outputId}/renderer-evidence.json`,
    fileSha256: canonicalSha256ZevoTitleJsonV001(result.evidence),
    canonicalSha256: canonicalSha256ZevoTitleJsonV001(result.evidence),
  };
  return {planBinding, rendererEvidence: result.evidence, rendererEvidenceBinding};
};

test('ZTC001 registry accepts exact landscape and vertical profiles', () => {
  assert.equal(validateZevoTitleStyleRegistryV001(makeRegistry()), true);
});

test('ZTC002 registry rejects an unknown root key', () => {
  const value = {...makeRegistry(), unknown: true};
  assert.equal(validateZevoTitleStyleRegistryV001(value), false);
});

test('ZTC003 profile rejects a crop key', () => {
  const value = makeRegistry();
  value.profiles[0].crop = {mode: 'identity'};
  assert.equal(validateZevoTitleStyleRegistryV001(value), false);
});

test('ZTC004 profile rejects a viewport key', () => {
  const value = makeRegistry();
  value.profiles[1].viewport = {left: 0, top: 0, width: 1080, height: 1920};
  assert.equal(validateZevoTitleStyleRegistryV001(value), false);
});

test('ZTC005 registry rejects duplicate profile IDs', () => {
  const value = makeRegistry();
  value.profiles[1].profileId = value.profiles[0].profileId;
  assert.equal(validateZevoTitleStyleRegistryV001(value), false);
});

test('ZTC006 registry rejects an unbound font', () => {
  const value = makeRegistry();
  value.profiles[0].visualState.textStyle.fontAssetId = 'missing-font-v001';
  assert.equal(validateZevoTitleStyleRegistryV001(value), false);
});

test('ZTC007 landscape profile rejects a portrait canvas', () => {
  const value = makeRegistry();
  value.profiles[0].canvas = {width: 1080, height: 1920, fps: 30};
  assert.equal(validateZevoTitleStyleRegistryV001(value), false);
});

test('ZTC008 vertical profile rejects a landscape canvas', () => {
  const value = makeRegistry();
  value.profiles[1].canvas = {width: 1920, height: 1080, fps: 30};
  assert.equal(validateZevoTitleStyleRegistryV001(value), false);
});

test('ZTC009 exact title job passes with a human-title package', () => {
  const registry = makeRegistry();
  const job = makeJob();
  const titleMeaningPackage = makeMeaningPackage({
    title: {text: '全部やりかけ', inputMode: 'human'},
  });
  assert.equal(validateZevoTitleOutputJobV001(job, {registry, titleMeaningPackage}), true);
});

test('ZTC010 title job rejects an unknown key', () => {
  const value = {...makeJob(), allowLegacy: true};
  assert.equal(validateZevoTitleOutputJobV001(value), false);
});

test('ZTC011 title job rejects an empty implementation set', () => {
  const value = makeJob();
  value.implementationBindings = [];
  assert.equal(validateZevoTitleOutputJobV001(value), false);
});

test('ZTC012 title job context rejects an empty title', () => {
  assert.equal(validateZevoTitleOutputJobV001(makeJob(), {
    registry: makeRegistry(),
    titleMeaningPackage: makeMeaningPackage(),
  }), false);
});

test('ZTC013 replacement permits package ID, timeline ID, and provenance changes', () => {
  const source = makeMeaningPackage();
  const titled = makeMeaningPackage({
    packageId: 'candidate-59-new-package',
    title: {text: '全部やりかけ', inputMode: 'human'},
    provenanceSeed: 'new',
  });
  assert.equal(validateZevoTitleMeaningReplacementV001(source, titled).status, 'passed');
});

test('ZTC014 replacement rejects an empty target title', () => {
  assert.equal(validateZevoTitleMeaningReplacementV001(
    makeMeaningPackage(), makeMeaningPackage({packageId: 'candidate-59-new-package'}),
  ).status, 'rejected');
});

test('ZTC015 replacement rejects a source that already has a title', () => {
  const source = makeMeaningPackage({title: {text: '旧タイトル', inputMode: 'human'}});
  const titled = makeMeaningPackage({
    packageId: 'candidate-59-new-package',
    title: {text: '全部やりかけ', inputMode: 'human'},
  });
  assert.equal(validateZevoTitleMeaningReplacementV001(source, titled).status, 'rejected');
});

test('ZTC016 replacement rejects a source-media meaning change', () => {
  const source = makeMeaningPackage();
  const titled = makeMeaningPackage({
    packageId: 'candidate-59-new-package',
    title: {text: '全部やりかけ', inputMode: 'human'},
  });
  titled.sourceMedia[0].sourceRef = 'youtube:DmWu0jVQfTE';
  assert.equal(validateZevoTitleMeaningReplacementV001(source, titled).status, 'rejected');
});

test('ZTC017 replacement rejects a timeline segment change', () => {
  const source = makeMeaningPackage();
  const titled = makeMeaningPackage({
    packageId: 'candidate-59-new-package',
    title: {text: '全部やりかけ', inputMode: 'human'},
  });
  titled.timelineComposition.segments[0].sourceEndMs += 1;
  assert.equal(validateZevoTitleMeaningReplacementV001(source, titled).status, 'rejected');
});

test('ZTC018 replacement rejects a caption change', () => {
  const source = makeMeaningPackage();
  const titled = makeMeaningPackage({
    packageId: 'candidate-59-new-package',
    title: {text: '全部やりかけ', inputMode: 'human'},
  });
  titled.captions[0].text = '別本文';
  assert.equal(validateZevoTitleMeaningReplacementV001(source, titled).status, 'rejected');
});

test('ZTC019 replacement rejects semantic observation leakage', () => {
  const source = makeMeaningPackage();
  const titled = makeMeaningPackage({
    packageId: 'candidate-59-new-package',
    title: {text: '全部やりかけ', inputMode: 'human'},
  });
  titled.semanticObservations.push({kind: 'G4'});
  assert.equal(validateZevoTitleMeaningReplacementV001(source, titled).status, 'rejected');
});

test('ZTC020 plan mechanically wraps a long title without text loss', () => {
  const fixture = buildFixture();
  assert.equal(fixture.plan.titleDisplay.indexedLines.length, 2);
  assert.equal(
    fixture.plan.titleDisplay.indexedLines.map(line => line.renderedText).join(''),
    '全部やりかけ',
  );
});

test('ZTC021 short title remains one line', () => {
  const registry = makeRegistry();
  const job = makeJob();
  const source = makeMeaningPackage();
  const titled = makeMeaningPackage({
    packageId: 'candidate-59-short-title',
    title: {text: '全部', inputMode: 'human'},
    provenanceSeed: 'short',
  });
  const result = buildZevoTitleDisplayPlanV001({
    job, jobBinding: jobBindingFor(job), registry,
    sourceMeaningPackage: source, titleMeaningPackage: titled,
  });
  assert.equal(result.status, 'built');
  assert.equal(result.plan.titleDisplay.indexedLines.length, 1);
});

test('ZTC022 plan rejects a max-lines overflow', () => {
  const registry = makeRegistry();
  registry.profiles[0].maxLogicalWidth = 2;
  registry.profiles[0].maxLines = 1;
  registry.profiles[0].visualState.layout = {
    maxCharsPerLine: 2, maxLines: 1, singleLine: false,
  };
  const job = makeJob();
  const result = buildZevoTitleDisplayPlanV001({
    job, jobBinding: jobBindingFor(job), registry,
    sourceMeaningPackage: makeMeaningPackage(),
    titleMeaningPackage: makeMeaningPackage({
      packageId: 'candidate-59-long-title',
      title: {text: '全部やりかけ', inputMode: 'human'},
      provenanceSeed: 'long',
    }),
  });
  assert.equal(result.status, 'rejected');
});

test('ZTC023 plan records requested and applied profile identically', () => {
  const fixture = buildFixture();
  assert.equal(fixture.plan.titleDisplay.requestedProfileId, fixture.plan.profileId);
  assert.equal(fixture.plan.titleDisplay.appliedProfileId, fixture.plan.profileId);
});

test('ZTC024 plan uses the profile start and end frames', () => {
  const fixture = buildFixture();
  assert.deepEqual(fixture.plan.displayFrameRange, {startFrame: 0, endFrameExclusive: 90});
  assert.equal(fixture.plan.titleDisplay.displayFrameCount, 90);
});

test('ZTC025 plan rejects an unknown key', () => {
  const fixture = buildFixture();
  const value = {...fixture.plan, legacyTitle: true};
  assert.equal(validateZevoTitleDisplayPlanV001(value), false);
});

test('ZTC026 plan rejects a crop key', () => {
  const fixture = buildFixture();
  const value = {...fixture.plan, crop: {mode: 'identity'}};
  assert.equal(validateZevoTitleDisplayPlanV001(value), false);
});

test('ZTC027 common core contains exactly one title-cover element', () => {
  const fixture = buildFixture();
  const result = buildZevoTitleCommonCorePlanV001(fixture);
  assert.equal(result.status, 'built');
  assert.equal(result.plan.elements.length, 1);
  assert.equal(result.plan.elements[0].kind, 'title-cover');
});

test('ZTC028 common core preserves title text, line indices, and frame interval', () => {
  const fixture = buildFixture();
  const element = buildZevoTitleCommonCorePlanV001(fixture).plan.elements[0];
  assert.equal(element.text, '全部やりかけ');
  assert.deepEqual(element.indexedLines, fixture.plan.titleDisplay.indexedLines);
  assert.equal(element.startFrame, 0);
  assert.equal(element.endFrameExclusive, 90);
});

test('ZTC029 common core uses final canvas coordinates and no crop fields', () => {
  const fixture = buildFixture();
  const result = buildZevoTitleCommonCorePlanV001(fixture).plan;
  assert.deepEqual(result.canvas.safeAreaPx, fixture.plan.safeArea);
  assert.equal(JSON.stringify(result).includes('viewport'), false);
  assert.equal(JSON.stringify(result).includes('crop'), false);
});

test('ZTC030 vertical format builds through the same common contract', () => {
  const fixture = buildFixture('title-vertical-v001');
  const result = buildZevoTitleCommonCorePlanV001(fixture);
  assert.equal(result.status, 'built');
  assert.equal(result.plan.format, 'vertical-short-1080x1920');
  assert.deepEqual(result.plan.canvas, {
    width: 1080, height: 1920, fps: 30,
    safeAreaPx: {top: 38, right: 43, bottom: 38, left: 43},
  });
});

test('ZTC031 renderer evidence accepts one applied title and passed renderer QC', () => {
  const fixture = buildFixture();
  const evidence = buildEvidenceFixture(fixture).rendererEvidence;
  assert.equal(validateZevoTitleRendererEvidenceV001(evidence, {plan: fixture.plan}), true);
});

test('ZTC032 renderer evidence rejects a second title application', () => {
  const fixture = buildFixture();
  const {planBinding} = buildEvidenceFixture(fixture);
  const result = buildZevoTitleRendererEvidenceV001({
    plan: fixture.plan,
    planBinding,
    applicationResults: [applicationResultFor(fixture), applicationResultFor(fixture)],
    rendererQc: rendererQcFor(fixture),
  });
  assert.equal(result.status, 'rejected');
});

test('ZTC033 QC passes all six checks from bound renderer evidence', () => {
  const fixture = buildFixture();
  const evidence = buildEvidenceFixture(fixture);
  const outputVideo = mediaBinding('title-output-video', SHA.five);
  const result = buildZevoTitleOutputQcV001({
    job: fixture.job,
    jobBinding: fixture.jobBinding,
    plan: fixture.plan,
    planBinding: evidence.planBinding,
    rendererEvidenceBinding: evidence.rendererEvidenceBinding,
    rendererEvidence: evidence.rendererEvidence,
    outputVideo,
    sourceMedia: {
      frameCount: 1547,
      audioPacketPayloadSha256: SHA.zero,
    },
    outputMedia: {
      frameCount: 1547,
      audioPacketPayloadSha256: SHA.zero,
    },
  });
  assert.equal(result.status, 'built');
  assert.deepEqual(Object.values(result.qc.checks), Array(6).fill('passed'));
});

test('ZTC034 QC rejects a frame-count change', () => {
  const fixture = buildFixture();
  const evidence = buildEvidenceFixture(fixture);
  const result = buildZevoTitleOutputQcV001({
    job: fixture.job, jobBinding: fixture.jobBinding,
    plan: fixture.plan, planBinding: evidence.planBinding,
    rendererEvidenceBinding: evidence.rendererEvidenceBinding,
    rendererEvidence: evidence.rendererEvidence,
    outputVideo: mediaBinding('title-output-video', SHA.five),
    sourceMedia: {frameCount: 1547, audioPacketPayloadSha256: SHA.zero},
    outputMedia: {frameCount: 1546, audioPacketPayloadSha256: SHA.zero},
  });
  assert.equal(result.status, 'rejected');
});

test('ZTC035 QC rejects an audio-payload change', () => {
  const fixture = buildFixture();
  const evidence = buildEvidenceFixture(fixture);
  const result = buildZevoTitleOutputQcV001({
    job: fixture.job, jobBinding: fixture.jobBinding,
    plan: fixture.plan, planBinding: evidence.planBinding,
    rendererEvidenceBinding: evidence.rendererEvidenceBinding,
    rendererEvidence: evidence.rendererEvidence,
    outputVideo: mediaBinding('title-output-video', SHA.five),
    sourceMedia: {frameCount: 1547, audioPacketPayloadSha256: SHA.zero},
    outputMedia: {frameCount: 1547, audioPacketPayloadSha256: SHA.one},
  });
  assert.equal(result.status, 'rejected');
});

test('ZTC036 QC rejects an unknown key', () => {
  const fixture = buildFixture();
  const evidence = buildEvidenceFixture(fixture);
  const base = {
    schemaVersion: ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001,
    qcId: `${fixture.job.outputId}-title-qc`,
    status: 'passed',
    jobBinding: fixture.jobBinding,
    planBinding: evidence.planBinding,
    rendererEvidenceBinding: evidence.rendererEvidenceBinding,
    outputVideo: mediaBinding('title-output-video', SHA.five),
    checks: {
      sourceBinding: 'passed', titleTextIntegrity: 'passed',
      titleApplication: 'passed', titleLayoutAndVisibility: 'passed',
      mediaFramePreservation: 'passed', audioPreservation: 'passed',
    },
    evidence: {
      sourceVideoFileSha256: SHA.c, outputVideoFileSha256: SHA.five,
      titleTextCanonicalSha256: canonicalSha256ZevoTitleJsonV001('全部やりかけ'),
      titleDisplayCount: 1, sourceFrameCount: 1547, outputFrameCount: 1547,
      sourceAudioPacketPayloadSha256: SHA.zero,
      outputAudioPacketPayloadSha256: SHA.zero,
    },
    unknown: true,
  };
  assert.equal(validateZevoTitleOutputQcV001(base), false);
});

test('ZTC037 manifest exactly binds job, plan, renderer evidence, QC, and video', () => {
  const fixture = buildFixture();
  const evidence = buildEvidenceFixture(fixture);
  const qcResult = buildZevoTitleOutputQcV001({
    job: fixture.job, jobBinding: fixture.jobBinding,
    plan: fixture.plan, planBinding: evidence.planBinding,
    rendererEvidenceBinding: evidence.rendererEvidenceBinding,
    rendererEvidence: evidence.rendererEvidence,
    outputVideo: mediaBinding('title-output-video', SHA.five),
    sourceMedia: {frameCount: 1547, audioPacketPayloadSha256: SHA.zero},
    outputMedia: {frameCount: 1547, audioPacketPayloadSha256: SHA.zero},
  });
  assert.equal(qcResult.status, 'built');
  const qcBinding = jsonBinding(
    ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001,
    'title-output-qc',
    canonicalSha256ZevoTitleJsonV001(qcResult.qc),
  );
  const result = buildZevoTitleOutputManifestV001({
    job: fixture.job, jobBinding: fixture.jobBinding,
    planBinding: evidence.planBinding,
    rendererEvidenceBinding: evidence.rendererEvidenceBinding,
    qcBinding, qc: qcResult.qc,
  });
  assert.equal(result.status, 'built');
  assert.equal(validateZevoTitleOutputManifestV001(result.manifest, {
    job: fixture.job, qc: qcResult.qc,
  }), true);
});

test('ZTC038 manifest rejects an unknown key', () => {
  const fixture = buildFixture();
  const value = {
    schemaVersion: ZEVO_TITLE_OUTPUT_MANIFEST_SCHEMA_V001,
    manifestId: `${fixture.job.outputId}-title-manifest`,
    status: 'passed',
    jobBinding: fixture.jobBinding,
    titleMeaningPackageBinding: fixture.job.titleMeaningPackageBinding,
    sourceOutput: fixture.job.sourceOutput,
    styleRegistryBinding: fixture.job.styleRegistryBinding,
    profileId: fixture.job.profileId,
    planBinding: planBindingFor(fixture.plan),
    rendererEvidenceBinding: jsonBinding(
      ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001, 'renderer-evidence',
    ),
    qcBinding: jsonBinding(ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001, 'qc'),
    video: mediaBinding('video'),
    runtimeProfile: fixture.job.runtimeProfile,
    implementationBindings: fixture.job.implementationBindings,
    legacy: true,
  };
  assert.equal(validateZevoTitleOutputManifestV001(value), false);
});

test('ZTC039 ZEVO v1 render plan is not accepted as a title plan', () => {
  assert.equal(validateZevoTitleDisplayPlanV001({
    schemaVersion: 'presentation-output-render-plan-v001',
  }), false);
});

test('ZTC040 formal serializer is deterministic, two-space, and LF terminated', () => {
  const value = {schemaVersion: 'fixture-v001', nested: {value: 1}};
  const first = serializeZevoTitleFormalJsonV001(value);
  const second = serializeZevoTitleFormalJsonV001(value);
  assert.equal(first.equals(second), true);
  assert.equal(first.toString('utf8'), '{\n  "schemaVersion": "fixture-v001",\n  "nested": {\n    "value": 1\n  }\n}\n');
});

test('ZTC041 common core revalidates indexed title text before rendering', () => {
  const fixture = buildFixture();
  fixture.plan.titleDisplay.indexedLines[0].renderedText = '改変';
  fixture.plan.titleDisplay.indexedLines[0].text = '改変';
  assert.equal(buildZevoTitleCommonCorePlanV001(fixture).status, 'rejected');
});

test('ZTC042 manifest context rejects a renderer-evidence binding swap', () => {
  const fixture = buildFixture();
  const evidence = buildEvidenceFixture(fixture);
  const outputVideo = mediaBinding('title-output-video', SHA.five);
  const qcResult = buildZevoTitleOutputQcV001({
    job: fixture.job, jobBinding: fixture.jobBinding,
    plan: fixture.plan, planBinding: evidence.planBinding,
    rendererEvidenceBinding: evidence.rendererEvidenceBinding,
    rendererEvidence: evidence.rendererEvidence,
    outputVideo,
    sourceMedia: {frameCount: 1547, audioPacketPayloadSha256: SHA.zero},
    outputMedia: {frameCount: 1547, audioPacketPayloadSha256: SHA.zero},
  });
  assert.equal(qcResult.status, 'built');
  const value = {
    schemaVersion: ZEVO_TITLE_OUTPUT_MANIFEST_SCHEMA_V001,
    manifestId: `${fixture.job.outputId}-title-manifest`,
    status: 'passed',
    jobBinding: fixture.jobBinding,
    titleMeaningPackageBinding: fixture.job.titleMeaningPackageBinding,
    sourceOutput: fixture.job.sourceOutput,
    styleRegistryBinding: fixture.job.styleRegistryBinding,
    profileId: fixture.job.profileId,
    planBinding: evidence.planBinding,
    rendererEvidenceBinding: {
      ...evidence.rendererEvidenceBinding,
      fileSha256: SHA.a,
    },
    qcBinding: jsonBinding(ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001, 'title-output-qc'),
    video: outputVideo,
    runtimeProfile: fixture.job.runtimeProfile,
    implementationBindings: fixture.job.implementationBindings,
  };
  assert.equal(validateZevoTitleOutputManifestV001(value, {
    job: fixture.job,
    qc: qcResult.qc,
  }), false);
});

test('ZTC043 title job rejects a role bound to the wrong implementation path', () => {
  const job = makeJob();
  job.implementationBindings[0].path =
    'evals/clip_composition/presentation_caption_contract_v001.mjs';
  assert.equal(validateZevoTitleOutputJobV001(job), false);
});

test('ZTC044 title job rejects the correct implementation set in a different order', () => {
  const job = makeJob();
  [job.implementationBindings[0], job.implementationBindings[1]] =
    [job.implementationBindings[1], job.implementationBindings[0]];
  assert.equal(validateZevoTitleOutputJobV001(job), false);
  assert.equal(ZEVO_TITLE_IMPLEMENTATION_ROLES_V001.length, 56);
});
