import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRESENTATION_OUTPUT_COMMON_CORE_PLAN_SCHEMA_V002,
  PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V002,
  buildPresentationOutputCommonCorePlanV002,
  buildPresentationOutputRenderPlanV002,
  classifyPresentationOutputDownstreamResultV002,
  derivePresentationOutputMeaningProjectionV002,
  validatePresentationOutputRenderPlanV002,
} from './presentation_output_render_plan_v002.mjs';
import {
  bindPresentationOutputPageLinePlanTimelineV002,
} from './presentation_output_page_line_planner_v002.mjs';
import {
  canonicalSha256PresentationAJsonV002,
  serializePresentationAFormalJsonV002,
  sha256PresentationABytesV002,
} from './presentation_a_source_sequence_v002.mjs';

const H = 'a'.repeat(64);
const binding = (schemaVersion, name) => ({
  schemaVersion,
  path: `fixtures/${name}.json`,
  fileSha256: H,
  canonicalSha256: H,
});
const actualBinding = (schemaVersion, name, value) => ({
  schemaVersion,
  path: `fixtures/${name}.json`,
  fileSha256: sha256PresentationABytesV002(serializePresentationAFormalJsonV002(value)),
  canonicalSha256: canonicalSha256PresentationAJsonV002(value),
});
const sourceMedia = {
  sourceMediaId: 'source-media-000001',
  ordinal: 1,
  sourceRef: 'youtube:qdczJpv8RCc',
  mediaBinding: {path: 'fixtures/source.mp4', fileSha256: H},
  sourceIdentityBinding: binding(
    'presentation-material-source-identity-v001',
    'source-identity',
  ),
  sourceAtomTranscriptBinding: binding(
    'presentation-a-v002-layer1-v3-source-atom-transcript-v001',
    'source-atoms',
  ),
};
const meaningPackage = () => ({
  schemaVersion: 'zev-meaning-information-package-v002',
  packageId: 'a-v002-render-fixture',
  sourceMedia: [sourceMedia],
  timelineComposition: {
    timelineId: 'a-v002-render-fixture-timeline',
    segments: [{
      segmentId: 'segment-0001', storyOrdinal: 1, sourceTimeOrdinal: 1,
      sourceMediaId: sourceMedia.sourceMediaId, sourceStartMs: 0, sourceEndMs: 400,
    }, {
      segmentId: 'segment-0002', storyOrdinal: 2, sourceTimeOrdinal: 2,
      sourceMediaId: sourceMedia.sourceMediaId, sourceStartMs: 600, sourceEndMs: 1000,
    }],
  },
  atomOccurrences: [{
    atomOccurrenceId: 'atom-occurrence-000001', ordinal: 1,
    sourceMediaId: sourceMedia.sourceMediaId, sourceAtomId: 'source-atom-000001',
    text: 'あ', sourceAtomInterval: {sourceStartMs: 200, sourceEndMs: 800},
    retainedSpans: [
      {timelineSegmentId: 'segment-0001', sourceStartMs: 200, sourceEndMs: 400},
      {timelineSegmentId: 'segment-0002', sourceStartMs: 600, sourceEndMs: 800},
    ],
  }, {
    atomOccurrenceId: 'atom-occurrence-000002', ordinal: 2,
    sourceMediaId: sourceMedia.sourceMediaId, sourceAtomId: 'source-atom-000002',
    text: 'い', sourceAtomInterval: {sourceStartMs: 800, sourceEndMs: 1000},
    retainedSpans: [
      {timelineSegmentId: 'segment-0002', sourceStartMs: 800, sourceEndMs: 1000},
    ],
  }],
  captions: [{
    captionId: 'caption-000001', ordinal: 1, text: 'あい',
    atomOccurrenceIds: ['atom-occurrence-000001', 'atom-occurrence-000002'],
  }],
  title: {text: '', inputMode: 'none'},
  semanticObservations: [],
  provenance: {
    formalJobBinding: binding('presentation-a-meaning-information-package-job-v002', 'job'),
    parentSemanticInputBinding: binding(
      'presentation-a-v002-layer1-v3-proof-input-v001',
      'parent',
    ),
    adoptedSourceSequenceBinding: binding(
      'presentation-adopted-source-sequence-v002',
      'sequence',
    ),
  },
});

const frameMappings = [{
  timelineSegmentId: 'segment-0001', sourceStartMs: 200, sourceEndMs: 400,
  sourceStartFrame30: 6, sourceEndFrame30: 12,
  startFrame: 6, endFrameExclusive: 12, displayFrameCount: 6,
}, {
  timelineSegmentId: 'segment-0002', sourceStartMs: 600, sourceEndMs: 1000,
  sourceStartFrame30: 18, sourceEndFrame30: 30,
  startFrame: 12, endFrameExclusive: 24, displayFrameCount: 12,
}];

const captionDisplays = () => [{
  displayCaptionId: 'display-caption-000001',
  semanticCaptionId: 'caption-000001',
  ordinal: 1,
  pages: [{
    pageId: 'display-page-000001-001',
    pageOrdinal: 1,
    atomOccurrenceIds: ['atom-occurrence-000001', 'atom-occurrence-000002'],
    text: 'あい',
    retainedSpans: [
      {timelineSegmentId: 'segment-0001', sourceStartMs: 200, sourceEndMs: 400},
      {timelineSegmentId: 'segment-0002', sourceStartMs: 600, sourceEndMs: 800},
      {timelineSegmentId: 'segment-0002', sourceStartMs: 800, sourceEndMs: 1000},
    ],
    sourceSpanEnvelopes: [
      {timelineSegmentId: 'segment-0001', sourceStartMs: 200, sourceEndMs: 400},
      {timelineSegmentId: 'segment-0002', sourceStartMs: 600, sourceEndMs: 1000},
    ],
    frameMappings,
    startFrame: 6,
    endFrameExclusive: 24,
    displayFrameCount: 18,
    lines: [{
      lineId: 'display-line-000001-001-01',
      lineOrdinal: 1,
      atomOccurrenceIds: ['atom-occurrence-000001', 'atom-occurrence-000002'],
      text: 'あい',
      logicalWidth: 4,
    }],
  }],
}];

const style = ({vertical = false, diagnostic = false} = {}) => ({
  format: vertical || diagnostic ? 'vertical-short-1080x1920' : 'normal-landscape',
  screenLayoutId: vertical ? 'speaker_only' : null,
  presetId: diagnostic
    ? 'diagnostic-full-frame-contain-v001'
    : vertical
      ? 'vertical-short-speaker-only-readable-pop-v001'
      : 'normal-landscape-readable-pop-v001',
  visualStateId: 'fixture-state-v001',
  maxLogicalWidthPerLine: vertical || diagnostic ? 14 : 36,
  maxLinesPerDisplayPage: 2,
  characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
  cropMode: diagnostic ? 'diagnostic-contain' : vertical ? 'bound-decision' : 'identity',
  sceneTransitionMode: 'straight-cut-only',
  audioMode: 'preserve-source-only',
});

const baseMediaTimeline = () => ({
  schemaVersion: 'presentation-base-media-timeline-v002',
  timelineId: 'a-v002-render-output-timeline',
  sourceProvenance: 'a-v002-render-fixture',
  sourceRef: 'youtube:fixture',
  sourceFrameClock: {
    inputFrameRate: '30/1',
    logicalFrameRate: '30/1',
    extractionRuleId: 'source-frame-30fps-identity-v001',
    decodedFrameCount: 30,
  },
  baseMedia: {
    artifactId: 'a-v002-render-base-media',
    path: 'fixtures/base-media.mp4',
    fileSha256: H,
    frameRate: '30/1',
    expectedFrameCount: 24,
  },
  segments: [{
    segmentId: 'segment-0001',
    sourceStartMs: 0,
    sourceEndMs: 400,
    sourceStartFrame30: 0,
    sourceEndFrame30: 12,
    outputStartFrame: 0,
    outputEndFrame: 12,
  }, {
    segmentId: 'segment-0002',
    sourceStartMs: 600,
    sourceEndMs: 1000,
    sourceStartFrame30: 18,
    sourceEndFrame30: 30,
    outputStartFrame: 12,
    outputEndFrame: 24,
  }],
});

const baseMedia = media => ({
  baseMedia: {path: 'fixtures/base-media.mp4', fileSha256: H},
  timeline: actualBinding('presentation-base-media-timeline-v002', 'timeline', media),
  generationManifest: binding(
    'presentation-output-base-media-generation-manifest-v001',
    'manifest',
  ),
  validationReceipt: binding(
    'presentation-output-base-media-validation-receipt-v001',
    'receipt',
  ),
});

const request = (pkg = meaningPackage(), media = baseMediaTimeline()) => ({
  requestId: 'a-v002-proof-output-001',
  meaningInformationPackage: actualBinding(
    'zev-meaning-information-package-v002',
    'meaning-package',
    pkg,
  ),
  baseMediaInput: baseMedia(media),
});

const build = ({
  pkg = meaningPackage(),
  resolvedStyle = style(),
  displays = captionDisplays(),
  media = baseMediaTimeline(),
  requestValue = null,
} = {}) => buildPresentationOutputRenderPlanV002({
    request: requestValue ?? request(pkg, media),
    outputRequestBinding: binding('presentation-a-v002-proof-output-request-v001', 'request'),
    meaningPackage: pkg,
    pageLinePlan: bindPresentationOutputPageLinePlanTimelineV002({
      pageLinePlan: {status: 'planned', captionDisplays: displays},
      baseMediaTimeline: media,
    }),
    resolvedStyle,
  });

const layoutContext = ({vertical = false} = {}) => ({
  presetRegistryVersion: 'fixture-registry-v001',
  visualState: {
    stateId: 'fixture-state-v001',
    textStyle: {fontAssetId: 'fixture-font', fontSizePx: 100},
    position: {preset: 'lower-third', alignment: 'center'},
  },
  transition: {mode: 'straight-cut-only'},
  canvas: {
    width: vertical ? 1080 : 1920,
    height: vertical ? 1920 : 1080,
    fps: 30,
    safeAreaPx: {top: 0, right: 0, bottom: 0, left: 0},
  },
  layoutRules: {maxLogicalWidthPerLine: vertical ? 14 : 36, maxLinesPerMeaningGroup: 2},
});

test('ORPV2001: v002 native render planはexact 9 keyである', () => {
  const result = build();
  assert.equal(result.status, 'built');
  assert.equal(result.plan.schemaVersion, PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V002);
  assert.deepEqual(Object.keys(result.plan), [
    'schemaVersion', 'planId', 'outputRequestBinding', 'meaningPackageBinding',
    'baseMediaBinding', 'resolvedStyle', 'captionDisplays', 'titleDisplay',
    'meaningProjection',
  ]);
});

test('ORPV2002: 一つのpage本文を一つの共通描画elementへ渡す', () => {
  const pkg = meaningPackage();
  const result = build({pkg});
  const core = buildPresentationOutputCommonCorePlanV002({
    renderPlan: result.plan,
    meaningPackage: pkg,
    layoutContext: layoutContext(),
  });
  assert.equal(core.status, 'built');
  assert.equal(core.plan.schemaVersion, PRESENTATION_OUTPUT_COMMON_CORE_PLAN_SCHEMA_V002);
  assert.equal(core.plan.elements.length, 1);
  assert.equal(core.plan.elements[0].text, 'あい');
});

test('ORPV2003: 複数元時刻片・包絡・frame写像を別来歴として保持する', () => {
  const pkg = meaningPackage();
  const result = build({pkg});
  const core = buildPresentationOutputCommonCorePlanV002({
    renderPlan: result.plan,
    meaningPackage: pkg,
    layoutContext: layoutContext(),
  });
  const element = core.plan.elements[0];
  assert.equal(element.retainedSpans.length, 3);
  assert.equal(element.sourceSpanEnvelopes.length, 2);
  assert.equal(element.frameMappings.length, 2);
  assert.equal(Object.hasOwn(element, 'sourceStartMs'), false);
  assert.equal(Object.hasOwn(element, 'timelineSegmentId'), false);
});

test('ORPV2004: 意味projectionは本文・span列・timelineを別hashで束縛する', () => {
  const pkg = meaningPackage();
  const projection = derivePresentationOutputMeaningProjectionV002(pkg);
  assert.deepEqual(Object.keys(projection), [
    'timelineSegmentCount', 'atomOccurrenceCount', 'captionCount', 'titleState',
    'semanticObservationCount', 'captionTextSequenceCanonicalSha256',
    'atomOccurrenceSpanSequenceCanonicalSha256', 'timelineCompositionCanonicalSha256',
  ]);
  assert.equal(projection.atomOccurrenceCount, 2);
  assert.ok(Object.values(projection).filter(value => typeof value === 'string')
    .filter(value => /^[0-9a-f]{64}$/u.test(value)).length === 3);
  const wrongRequest = request(pkg, baseMediaTimeline());
  wrongRequest.meaningInformationPackage.fileSha256 = H;
  const mismatch = build({pkg, requestValue: wrongRequest});
  assert.equal(mismatch.status, 'rejected');
  assert.equal(mismatch.violations[0].code, 'OUTPUT_V002_RENDER_PROJECTION_MISMATCH');
});

test('ORPV2005: 横縦style差は同じ意味package byteを変更しない', () => {
  const pkg = meaningPackage();
  const before = JSON.stringify(pkg);
  const landscape = build({pkg, resolvedStyle: style()});
  const vertical = build({pkg, resolvedStyle: style({diagnostic: true})});
  assert.equal(landscape.status, 'built');
  assert.equal(vertical.status, 'built');
  const verticalCore = buildPresentationOutputCommonCorePlanV002({
    renderPlan: vertical.plan,
    meaningPackage: pkg,
    layoutContext: layoutContext({vertical: true}),
  });
  assert.equal(verticalCore.status, 'built');
  assert.equal(verticalCore.plan.elements.length, 1);
  assert.deepEqual(verticalCore.plan.elements[0], {
    instructionId: vertical.plan.captionDisplays[0].pages[0].pageId,
    kind: 'speech-caption',
    text: 'あい',
    indexedLines: [{
      lineIndex: 0,
      characters: [{
        sourceIndex: 0,
        character: 'あ',
        codePoint: 'あ'.codePointAt(0),
        role: 'visible',
      }, {
        sourceIndex: 1,
        character: 'い',
        codePoint: 'い'.codePointAt(0),
        role: 'visible',
      }],
      renderedText: 'あい',
      text: 'あい',
      codePointIndices: [0, 1],
      atomOccurrenceIds: ['atom-occurrence-000001', 'atom-occurrence-000002'],
      logicalWidth: 4,
    }],
    retainedSpans: captionDisplays()[0].pages[0].retainedSpans,
    sourceSpanEnvelopes: captionDisplays()[0].pages[0].sourceSpanEnvelopes,
    frameMappings,
    startFrame: 6,
    endFrameExclusive: 24,
    displayFrameCount: 18,
    requestedPresetId: 'diagnostic-full-frame-contain-v001',
    appliedPresetId: 'diagnostic-full-frame-contain-v001',
    presetId: 'diagnostic-full-frame-contain-v001',
    registryVersion: 'fixture-registry-v001',
    presetRegistryVersion: 'fixture-registry-v001',
    stateId: 'fixture-state-v001',
    visualState: layoutContext({vertical: true}).visualState,
    transition: layoutContext({vertical: true}).transition,
    targetProvenance: {
      targetRefId: 'caption-000001',
      targetType: 'semantic-caption',
      atomOccurrenceIds: ['atom-occurrence-000001', 'atom-occurrence-000002'],
      lineAtomOccurrenceIds: [[
        'atom-occurrence-000001', 'atom-occurrence-000002',
      ]],
    },
    materialRefs: [],
  });
  assert.equal(JSON.stringify(pkg), before);
  assert.deepEqual(landscape.plan.meaningProjection, vertical.plan.meaningProjection);
  assert.equal(build({
    pkg,
    resolvedStyle: {...style({diagnostic: true}), presetId: 'wrong-diagnostic-v001'},
  }).status, 'rejected');
  assert.equal(build({
    pkg,
    resolvedStyle: {...style({diagnostic: true}), cropMode: 'bound-decision'},
  }).status, 'rejected');
});

test('ORPV2006: v001 packageを暗黙変換せず拒否する', () => {
  const result = build({pkg: {schemaVersion: 'zev-meaning-information-package-v001'}});
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'OUTPUT_V002_RENDER_PLAN_INVALID');
  const baseMediaFailure = classifyPresentationOutputDownstreamResultV002({
    stage: 'base-media',
    result: {status: 'failed'},
  });
  assert.equal(baseMediaFailure.status, 'rejected');
  assert.equal(baseMediaFailure.violations[0].code, 'OUTPUT_V002_BASE_MEDIA_INVALID');
  assert.deepEqual(classifyPresentationOutputDownstreamResultV002({
    stage: 'base-media',
    result: {status: 'passed'},
  }), {status: 'passed', violations: []});
});

test('ORPV2007: base mediaの4 bindingをbyte変更せず保持する', () => {
  const media = baseMediaTimeline();
  const result = build({media});
  assert.deepEqual(result.plan.baseMediaBinding, baseMedia(media));
  const wrongRequest = request(meaningPackage(), media);
  wrongRequest.baseMediaInput.timeline.fileSha256 = H;
  const mismatch = build({media, requestValue: wrongRequest});
  assert.equal(mismatch.status, 'rejected');
  assert.equal(mismatch.violations[0].code, 'OUTPUT_V002_BASE_MEDIA_INVALID');
  const publicationFailure = classifyPresentationOutputDownstreamResultV002({
    stage: 'publication',
    result: {status: 'failed'},
  });
  assert.equal(publicationFailure.status, 'rejected');
  assert.equal(publicationFailure.violations[0].code, 'OUTPUT_V002_PUBLICATION_FAILED');
  assert.deepEqual(classifyPresentationOutputDownstreamResultV002({
    stage: 'publication',
    result: {status: 'fatal'},
  }), {status: 'fatal', violations: []});
});

test('ORPV2008: page本文改変をrender projection不一致として拒否する', () => {
  const pkg = meaningPackage();
  const result = build({pkg});
  result.plan.captionDisplays[0].pages[0].text = '改変';
  const validation = validatePresentationOutputRenderPlanV002(result.plan, {
    requestId: request().requestId,
    meaningPackage: pkg,
  });
  assert.equal(validation.status, 'rejected');
  assert.equal(validation.violations[0].code, 'OUTPUT_V002_RENDER_PROJECTION_MISMATCH');
  const qcFailure = classifyPresentationOutputDownstreamResultV002({
    stage: 'qc',
    result: {status: 'failed'},
  });
  assert.equal(qcFailure.status, 'rejected');
  assert.equal(qcFailure.violations[0].code, 'OUTPUT_V002_QC_FAILED');
  assert.deepEqual(classifyPresentationOutputDownstreamResultV002({
    stage: 'qc',
    result: {status: 'passed'},
  }), {status: 'passed', violations: []});
});
