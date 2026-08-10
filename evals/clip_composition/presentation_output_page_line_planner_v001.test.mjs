import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_OUTPUT_PLANNER_MAX_PAGES_PER_CAPTION_V001,
  PRESENTATION_OUTPUT_PLANNER_RESOURCE_DIAGNOSTIC_V001,
  PresentationOutputPlannerResourceExhaustedV001,
  buildPresentationOutputPageLinePlanV001,
  selectPresentationOutputPagePathV001,
  validatePresentationOutputCaptionDisplaysV001,
} from './presentation_output_page_line_planner_v001.mjs';
import {
  derivePresentationExpectedAtomOccurrencesV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  serializePresentationAFormalJsonV002,
} from './presentation_a_source_sequence_v002.mjs';
import {
  PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
  inspectPresentationOutputDisplayPageV001,
  resolvePresentationOutputStyleV001,
} from './presentation_output_style_resolver_v001.ts';
import {indexExplicitLinesV001} from './presentation_renderer_text_layout_v001.mjs';
import {
  PRESENTATION_OUTPUT_CROP_APPLICATION_CHECKS_V001,
  derivePresentationOutputCropSelectionProjectionV001,
  serializePresentationOutputCropApplicationFormalJsonV001,
} from './presentation_output_crop_application_v001.mjs';

const ROOT = process.cwd();
const REGISTRY_ROOT = 'evals/clip_composition/registries/presentation';
const CROP_ROOT = 'evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006';
const H = 'a'.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalSha256 = value => sha256(Buffer.from(canonicalJson(value), 'utf8'));
const binding = schemaVersion => ({schemaVersion, path: 'fixture.json', fileSha256: H, canonicalSha256: H});
const baseMediaInput = baseMedia => ({
  baseMedia,
  timeline: binding('presentation-base-media-timeline-v002'),
  generationManifest: binding('presentation-output-base-media-generation-manifest-v001'),
  validationReceipt: binding('presentation-output-base-media-validation-receipt-v001'),
});

const readJson = async relativePath => JSON.parse(
  await readFile(path.join(ROOT, relativePath), 'utf8'),
);

const readArtifact = async relativePath => {
  const absolutePath = path.join(ROOT, relativePath);
  const bytes = await readFile(absolutePath);
  return {path: relativePath, absolutePath, bytes, value: JSON.parse(bytes.toString('utf8'))};
};
const artifactBinding = (schemaVersion, artifact) => ({
  schemaVersion,
  path: artifact.path,
  fileSha256: sha256(artifact.bytes),
  canonicalSha256: canonicalSha256(artifact.value),
});

const PLANNER_RESOURCE_EVENT_KEYS_V001 = Object.freeze([
  'schemaVersion',
  'stage',
  'processedAtomCount',
  'generatedPhysicalEdgeCount',
  'acceptedPhysicalEdgeCount',
  'processedTimelineEdgeCount',
  'mappedTimelineEdgeCount',
  'rejectedTimelineEdgeCount',
  'generatedStateCount',
  'insertedStateCount',
  'replacedEquivalentStateCount',
  'prunedDominatedStateCount',
  'retainedStateCount',
  'maximumRetainedStateCount',
  'elapsedMs',
]);
const PLANNER_RESOURCE_EVENT_STAGES_V001 = Object.freeze([
  'physical-graph',
  'timeline-mapping',
  'path-selection',
  'planner-completed',
]);
const assertPlannerResourceEventsV001 = events => {
  assert.ok(events.length >= PLANNER_RESOURCE_EVENT_STAGES_V001.length);
  for (const event of events) {
    assert.deepEqual(Object.keys(event), PLANNER_RESOURCE_EVENT_KEYS_V001);
    assert.equal(event.schemaVersion, 'presentation-output-planner-resource-event-v001');
    assert.ok(PLANNER_RESOURCE_EVENT_STAGES_V001.includes(event.stage));
    for (const key of PLANNER_RESOURCE_EVENT_KEYS_V001.slice(2)) {
      assert.ok(event[key] === null
        || (Number.isSafeInteger(event[key]) && event[key] >= 0), `${event.stage}:${key}`);
    }
    assert.doesNotMatch(JSON.stringify(event), /(?:caption|atom-|display-|\.json|\/)/u);
  }
  assert.deepEqual(
    [...new Set(events.map(event => event.stage))],
    PLANNER_RESOURCE_EVENT_STAGES_V001,
  );
};

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
    applicationId: 'page-line-planner-crop-application-v001',
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
        inputFrameRate: '30/1', logicalFrameRate: '30/1',
        extractionRuleId: 'fixture-frame-clock-v001', decodedFrameCount: 1547,
      },
      segments: [{
        sourceStartMs: 0, sourceEndMs: 51567,
        sourceStartFrame30: 0, sourceEndFrame30: 1547,
        outputStartFrame: 0, outputEndFrame: 1547,
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
    path: 'fixtures/page-line-planner-crop-application-v001.json',
    absolutePath: path.join(ROOT, 'fixtures/page-line-planner-crop-application-v001.json'),
    bytes,
    value: application,
  };
};

const landscapeStyle = async () => {
  const directory = `${REGISTRY_ROOT}/normal-landscape-preset-registry-v001`;
  const [trustedRegistryBindings, presetRegistry, presetValidationIndex,
    materialValidationIndex, rendererTrust] = await Promise.all([
    readArtifact(`${directory}/trusted-registry-bindings.json`),
    readArtifact(`${directory}/preset-registry.json`),
    readArtifact(`${directory}/preset-validation-index.json`),
    readArtifact(`${directory}/material-validation-index.json`),
    readArtifact(`${REGISTRY_ROOT}/presentation-renderer-trust-v001/trust.json`),
  ]);
  const result = await resolvePresentationOutputStyleV001({
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
    artifacts: {
      trustedRegistryBindings: trustedRegistryBindings.value,
      presetRegistry: presetRegistry.value,
      presetValidationIndex: presetValidationIndex.value,
      materialValidationIndex: materialValidationIndex.value,
      rendererTrust: rendererTrust.value,
    },
    baseMediaInput: baseMediaInput({path: 'fixtures/base-media.mp4', fileSha256: H}),
    baseMediaInspection: null,
  });
  assert.equal(result.status, 'resolved');
  return {resolvedStyle: result.resolvedStyle, layoutContext: result.layoutContext};
};

const verticalStyle = async () => {
  const directory = `${REGISTRY_ROOT}/vertical-short-preset-registry-v001`;
  const cropDecisionArtifact = await readArtifact(`${CROP_ROOT}/crop-decision-v006.json`);
  const cropSelectionPackageManifest = await readArtifact(
    `${CROP_ROOT}/selection-package-manifest-v006.json`,
  );
  const targetBaseMedia = baseMediaInput({
    path: 'fixtures/page-line-planner-target-base-media.mp4',
    fileSha256: H,
  });
  const cropApplicationArtifact = cropApplicationFixture({
    cropDecisionArtifact,
    cropSelectionPackageManifest,
    targetBaseMedia,
  });
  const result = await resolvePresentationOutputStyleV001({
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
          'presentation-output-crop-application-v001',
          cropApplicationArtifact,
        ),
      },
      sceneTransitionPolicy: {mode: 'straight-cut-only'},
      audioPolicy: {mode: 'preserve-source-only'},
      materials: [],
    },
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
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
  assert.equal(result.status, 'resolved');
  return {resolvedStyle: result.resolvedStyle, layoutContext: result.layoutContext};
};

const withPolicy = (style, maxLogicalWidthPerLine, maxLinesPerDisplayPage = 2) => {
  const result = structuredClone(style);
  result.resolvedStyle.maxLogicalWidthPerLine = maxLogicalWidthPerLine;
  result.resolvedStyle.maxLinesPerDisplayPage = maxLinesPerDisplayPage;
  result.layoutContext.resolvedStyle.maxLogicalWidthPerLine = maxLogicalWidthPerLine;
  result.layoutContext.resolvedStyle.maxLinesPerDisplayPage = maxLinesPerDisplayPage;
  if (result.layoutContext.layoutRules) {
    result.layoutContext.layoutRules.maxLogicalWidthPerLine = maxLogicalWidthPerLine;
    result.layoutContext.layoutRules.maxLinesPerMeaningGroup = maxLinesPerDisplayPage;
  }
  return result;
};

const timeline = ({durationMs = 120000} = {}) => {
  const frames = Math.round(durationMs * 30 / 1000);
  return {
    schemaVersion: 'presentation-base-media-timeline-v002',
    timelineId: 'output-planner-timeline-v001',
    sourceProvenance: 'output-planner-fixture',
    sourceRef: 'output-planner-source-v001',
    sourceFrameClock: {
      inputFrameRate: '30/1',
      logicalFrameRate: '30/1',
      extractionRuleId: 'source-frame-30fps-identity-v001',
      decodedFrameCount: frames,
    },
    baseMedia: {
      artifactId: 'output-planner-base-media-v001',
      path: 'base-media.mp4',
      fileSha256: H,
      frameRate: '30/1',
      expectedFrameCount: frames,
    },
    segments: [{
      segmentId: 'segment-0001',
      sourceStartMs: 0,
      sourceEndMs: durationMs,
      sourceStartFrame30: 0,
      sourceEndFrame30: frames,
      outputStartFrame: 0,
      outputEndFrame: frames,
    }],
  };
};

const fixture = ({captionTexts = [['あ', 'い', 'う']], startMs = 1000, stepMs = 100} = {}) => {
  const captions = [];
  const occurrenceAtoms = [];
  let ordinal = 0;
  let cursor = startMs;
  for (const [captionIndex, texts] of captionTexts.entries()) {
    const refs = [];
    const firstStart = cursor;
    for (const text of texts) {
      ordinal += 1;
      const atomRef = {
        timelineSegmentId: 'segment-0001',
        sourceMediaId: 'source-0001',
        atomId: `atom-${String(ordinal).padStart(6, '0')}`,
      };
      refs.push(atomRef);
      occurrenceAtoms.push({atomRef, text, startMs: cursor, endMs: cursor + stepMs});
      cursor += stepMs;
    }
    captions.push({
      captionId: `caption-${String(captionIndex + 1).padStart(6, '0')}`,
      ordinal: captionIndex + 1,
      timelineSegmentId: 'segment-0001',
      text: texts.join(''),
      atomRefs: refs,
      startAnchor: {atomRef: structuredClone(refs[0]), edge: 'start'},
      endAnchor: {atomRef: structuredClone(refs.at(-1)), edge: 'end'},
      sourceStartMs: firstStart,
      sourceEndMs: cursor,
    });
  }
  return {
    meaningPackage: {schemaVersion: 'zev-meaning-information-package-v001', captions},
    occurrenceAtoms,
  };
};

const plan = async ({captionTexts, startMs, stepMs, style, mediaTimeline} = {}) => {
  const input = fixture({captionTexts, startMs, stepMs});
  return {
    input,
    result: await buildPresentationOutputPageLinePlanV001({
      ...input,
      styleResolution: style ?? await landscapeStyle(),
      baseMediaTimeline: mediaTimeline ?? timeline(),
    }),
  };
};

const assertPhysicalEdgeGeometry = async (styleResolution, edge, pageId) => {
  const indexed = indexExplicitLinesV001(edge.lines.map(line => line.text));
  assert.equal(indexed.status, 'passed');
  const result = await inspectPresentationOutputDisplayPageV001({
    layoutContext: styleResolution.layoutContext,
    indexedLines: indexed.indexedLines,
    pageId,
  });
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.violations, []);
  assert.equal(result.inspection.items.length, 1);
  const rectangles = result.inspection.items[0].lineRects;
  assert.equal(rectangles.length, edge.lines.length);
  const {canvas} = styleResolution.layoutContext;
  const safe = canvas.safeAreaPx;
  for (const rectangle of rectangles) {
    assert.deepEqual(Object.keys(rectangle), ['left', 'top', 'right', 'bottom']);
    assert.ok(Object.values(rectangle).every(Number.isFinite));
    assert.ok(rectangle.left < rectangle.right);
    assert.ok(rectangle.top < rectangle.bottom);
    assert.ok(rectangle.left >= safe.left);
    assert.ok(rectangle.top >= safe.top);
    assert.ok(rectangle.right <= canvas.width - safe.right);
    assert.ok(rectangle.bottom <= canvas.height - safe.bottom);
  }
  for (let leftIndex = 0; leftIndex < rectangles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < rectangles.length; rightIndex += 1) {
      const left = rectangles[leftIndex];
      const right = rectangles[rightIndex];
      const overlapWidth = Math.min(left.right, right.right) - Math.max(left.left, right.left);
      const overlapHeight = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
      assert.equal(overlapWidth > 0 && overlapHeight > 0, false);
    }
  }
};

const enumerateCompletePaths = ({edges, finalBoundary}) => {
  const edgesByStart = new Map();
  for (const edge of edges) {
    const bucket = edgesByStart.get(edge.startBoundaryOrdinal) ?? [];
    bucket.push(edge);
    edgesByStart.set(edge.startBoundaryOrdinal, bucket);
  }
  const paths = [];
  const visit = (boundary, pathEdges) => {
    if (boundary === finalBoundary) {
      paths.push(pathEdges);
      return;
    }
    for (const edge of edgesByStart.get(boundary) ?? []) {
      visit(edge.endBoundaryOrdinal, [...pathEdges, edge]);
    }
  };
  visit(0, []);
  return paths;
};

const pathSelectionTuple = pathEdges => {
  const widths = pathEdges.flatMap(edge => edge.lines.map(line => line.logicalWidth));
  return [
    pathEdges.length,
    pathEdges.reduce((count, edge) => count + edge.lines.length, 0),
    Math.max(...widths),
    Math.max(...widths) - Math.min(...widths),
    pathEdges.map(edge => edge.endBoundaryOrdinal),
    pathEdges.flatMap(edge => edge.lineEndBoundaryOrdinals),
  ];
};

const displaySelectionTuple = display => {
  let boundary = 0;
  const widths = [];
  const pageEnds = [];
  const lineEnds = [];
  for (const page of display.pages) {
    for (const line of page.lines) {
      boundary += line.atomRefs.length;
      widths.push(line.logicalWidth);
      lineEnds.push(boundary);
    }
    pageEnds.push(boundary);
  }
  return [
    display.pages.length,
    display.pages.reduce((count, page) => count + page.lines.length, 0),
    Math.max(...widths),
    Math.max(...widths) - Math.min(...widths),
    pageEnds,
    lineEnds,
  ];
};

const semanticDisplayProjection = display => ({
  semanticCaptionId: display.semanticCaptionId,
  ordinal: display.ordinal,
  text: display.pages.map(page => page.text).join(''),
  atomRefs: display.pages.flatMap(page => page.atomRefs),
  sourceStartMs: display.pages[0].sourceStartMs,
  sourceEndMs: display.pages.at(-1).sourceEndMs,
});

test('OPL001: 複数atomでも幅上限内なら一行に保つ', async () => {
  const style = withPolicy(await landscapeStyle(), 4, 2);
  const {input, result} = await plan({captionTexts: [['a', 'b', 'c', 'd']], style});
  assert.equal(result.status, 'planned');
  const completePaths = enumerateCompletePaths({
    edges: result.timelineEdges[0].edges,
    finalBoundary: 4,
  });
  assert.ok(completePaths.some(path => path.some(edge => edge.lines.length === 2)));
  const page = result.captionDisplays[0].pages[0];
  assert.equal(page.lines.length, 1);
  assert.equal(page.lines[0].text, 'abcd');
  assert.equal(page.lines[0].logicalWidth, 4);
  assert.equal(validatePresentationOutputCaptionDisplaysV001(
    result.captionDisplays, input.meaningPackage, style.resolvedStyle,
  ), true);
});

test('OPL002: 二行pageは明示した二境界を一pageに保持する', async () => {
  const style = withPolicy(await landscapeStyle(), 4, 2);
  const {result} = await plan({captionTexts: [['あ', 'い', 'う', 'え']], style});
  assert.equal(result.status, 'planned');
  assert.equal(result.captionDisplays[0].pages.length, 1);
  assert.deepEqual(result.captionDisplays[0].pages[0].lines.map(line => line.text), ['あい', 'うえ']);
});

test('OPL003: AtomRef境界nodeは全量・順序・uniqueを保つ', async () => {
  const {input, result} = await plan({captionTexts: [['あ', 'b', 'う']]});
  assert.equal(result.status, 'planned');
  const refs = result.captionDisplays[0].pages.flatMap(page => page.atomRefs);
  assert.deepEqual(refs, input.occurrenceAtoms.map(item => item.atomRef));
  assert.equal(new Set(refs.map(item => item.atomId)).size, refs.length);
});

test('OPL004: 幅超過line候補は物理edgeへ入らない', async () => {
  const style = withPolicy(await landscapeStyle(), 4, 2);
  const {result} = await plan({captionTexts: [['あ', 'い', 'う']], style});
  assert.equal(result.status, 'planned');
  assert.ok(result.physicalEdges[0].edges.every(edge =>
    edge.lines.every(line => line.logicalWidth <= 4)));
});

test('OPL005: 横型の物理edgeはsafe areaと非交差を通過したものだけである', async () => {
  const style = await landscapeStyle();
  const {result} = await plan({captionTexts: [['短', 'い', '字', '幕']], style});
  assert.equal(result.status, 'planned');
  assert.ok(result.physicalEdges[0].edges.length > 0);
  for (const [index, edge] of result.physicalEdges[0].edges.entries()) {
    await assertPhysicalEdgeGeometry(style, edge, `opl005-${index}`);
  }
  const blockedStyle = structuredClone(style);
  blockedStyle.layoutContext.canvas.safeAreaPx = {
    top: 540, right: 960, bottom: 540, left: 960,
  };
  const blocked = await plan({captionTexts: [['短', 'い', '字', '幕']], style: blockedStyle});
  assert.equal(blocked.result.status, 'rejected');
  assert.equal(blocked.result.code, 'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE');
});

test('OPL006: 縦型の物理edgeはline矩形・safe area・非交差を通過する', async () => {
  const style = await verticalStyle();
  const {result} = await plan({captionTexts: [['短', 'い', '縦', '字', '幕']], style});
  assert.equal(result.status, 'planned');
  assert.ok(result.physicalEdges[0].edges.length > 0);
  for (const [index, edge] of result.physicalEdges[0].edges.entries()) {
    await assertPhysicalEdgeGeometry(style, edge, `opl006-${index}`);
  }
  const blockedStyle = structuredClone(style);
  blockedStyle.layoutContext.canvas.safeAreaPx = {
    top: 960, right: 540, bottom: 960, left: 540,
  };
  const blocked = await plan({captionTexts: [['短', 'い', '縦', '字', '幕']], style: blockedStyle});
  assert.equal(blocked.result.status, 'rejected');
  assert.equal(blocked.result.code, 'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE');
});

test('OPL007: 0-frame区間は物理edgeに残りtimeline edgeだけから除外される', async () => {
  const style = withPolicy(await landscapeStyle(), 36, 1);
  const {result} = await plan({captionTexts: [['a']], startMs: 1100, stepMs: 1, style});
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE');
  assert.equal(result.physicalEdges[0].edges.length, 1);
  assert.equal(result.timelineEdges[0].edges.length, 0);
});

test('OPL008: 物理pathが無い場合はlayout違反が所有する', async () => {
  const style = withPolicy(await landscapeStyle(), 1, 1);
  const {result} = await plan({captionTexts: [['あ']], style});
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE');
});

test('OPL009: 物理path成立後にtimeline pathが無い場合はtimeline違反が所有する', async () => {
  const style = withPolicy(await landscapeStyle(), 4, 2);
  const {result} = await plan({captionTexts: [['あ', 'い']], startMs: 1100, stepMs: 1, style});
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE');
});

test('OPL010: 選択はpage数最少を第一目的にする', async () => {
  const style = withPolicy(await landscapeStyle(), 4, 2);
  const {result} = await plan({captionTexts: [['あ', 'い', 'う', 'え']], style});
  assert.equal(result.status, 'planned');
  assert.equal(result.captionDisplays[0].pages.length, 1);
});

test('OPL011: 同じpage数なら総行数を減らし不要な改行を入れない', async () => {
  const style = withPolicy(await landscapeStyle(), 4, 2);
  const {result} = await plan({captionTexts: [['あ', 'い', 'う', 'え', 'お']], style});
  assert.equal(result.status, 'planned');
  assert.equal(result.captionDisplays[0].pages.length, 2);
  assert.equal(
    result.captionDisplays[0].pages.reduce((count, page) => count + page.lines.length, 0),
    3,
  );
  assert.equal(result.captionDisplays[0].pages.filter(page => page.lines.length === 1).length, 1);
});

test('OPL012: page数と行数が同じなら最大行幅を最小化する', async () => {
  const style = withPolicy(await landscapeStyle(), 3, 2);
  const {result} = await plan({captionTexts: [['a', 'b', 'cc']], style});
  assert.equal(result.status, 'planned');
  const paths = enumerateCompletePaths({
    edges: result.timelineEdges[0].edges,
    finalBoundary: 3,
  });
  const selected = displaySelectionTuple(result.captionDisplays[0]);
  const competitor = [1, 2, 3, 2, [3], [1, 3]];
  assert.deepEqual(selected, [1, 2, 2, 0, [3], [2, 3]]);
  assert.ok(paths.some(path => JSON.stringify(pathSelectionTuple(path))
    === JSON.stringify(competitor)));
  assert.ok(competitor[2] > selected[2]);
  assert.ok(competitor[5][0] < selected[5][0]);
});

test('OPL013: 最大幅が同じなら行幅rangeを最小化する', async () => {
  const style = withPolicy(await landscapeStyle(), 3, 2);
  const {result} = await plan({captionTexts: [['a', 'b', 'c', 'd', 'e', 'f', 'g']], style});
  assert.equal(result.status, 'planned');
  const paths = enumerateCompletePaths({
    edges: result.timelineEdges[0].edges,
    finalBoundary: 7,
  });
  const selected = displaySelectionTuple(result.captionDisplays[0]);
  const competitor = [2, 3, 3, 2, [1, 7], [1, 4, 7]];
  assert.deepEqual(selected, [2, 3, 3, 1, [2, 7], [2, 4, 7]]);
  assert.ok(paths.some(path => JSON.stringify(pathSelectionTuple(path))
    === JSON.stringify(competitor)));
  assert.equal(competitor[2], selected[2]);
  assert.ok(competitor[3] > selected[3]);
  assert.ok(competitor[4][0] < selected[4][0]);
});

test('OPL014: tuple同値ならpage境界・行境界を辞書順で決める', async () => {
  const style = withPolicy(await landscapeStyle(), 2, 2);
  const pageBoundary = await plan({captionTexts: [['a', 'bb', 'c']], style});
  assert.equal(pageBoundary.result.status, 'planned');
  const pageBoundaryPaths = enumerateCompletePaths({
    edges: pageBoundary.result.timelineEdges[0].edges,
    finalBoundary: 3,
  });
  const selectedPageBoundary = displaySelectionTuple(pageBoundary.result.captionDisplays[0]);
  const laterPageBoundary = [2, 3, 2, 1, [2, 3], [1, 2, 3]];
  assert.deepEqual(selectedPageBoundary, [2, 3, 2, 1, [1, 3], [1, 2, 3]]);
  assert.ok(pageBoundaryPaths.some(path => JSON.stringify(pathSelectionTuple(path))
    === JSON.stringify(laterPageBoundary)));
  assert.deepEqual(laterPageBoundary.slice(0, 4), selectedPageBoundary.slice(0, 4));
  assert.ok(laterPageBoundary[4][0] > selectedPageBoundary[4][0]);

  const lineBoundary = await plan({captionTexts: [['a', 'b', 'c']], style});
  assert.equal(lineBoundary.result.status, 'planned');
  const lineBoundaryPaths = enumerateCompletePaths({
    edges: lineBoundary.result.timelineEdges[0].edges,
    finalBoundary: 3,
  });
  const selectedLineBoundary = displaySelectionTuple(lineBoundary.result.captionDisplays[0]);
  const laterLineBoundary = [1, 2, 2, 1, [3], [2, 3]];
  assert.deepEqual(selectedLineBoundary, [1, 2, 2, 1, [3], [1, 3]]);
  assert.ok(lineBoundaryPaths.some(path => JSON.stringify(pathSelectionTuple(path))
    === JSON.stringify(laterLineBoundary)));
  assert.deepEqual(laterLineBoundary.slice(0, 5), selectedLineBoundary.slice(0, 5));
  assert.ok(laterLineBoundary[5][0] > selectedLineBoundary[5][0]);
});

test('OPL015: pageとlineを連結すると意味本文・AtomRefが完全一致する', async () => {
  const {input, result} = await plan({captionTexts: [['意味', 'を', '保つ']]});
  assert.equal(result.status, 'planned');
  const pages = result.captionDisplays[0].pages;
  assert.equal(pages.map(page => page.text).join(''), input.meaningPackage.captions[0].text);
  assert.deepEqual(pages.flatMap(page => page.atomRefs), input.meaningPackage.captions[0].atomRefs);
});

test('OPL016: page時刻はAtomRefの先頭startと末尾endだけから導く', async () => {
  const {input, result} = await plan({captionTexts: [['a', 'b', 'c']], startMs: 1234, stepMs: 101});
  assert.equal(result.status, 'planned');
  const page = result.captionDisplays[0].pages[0];
  assert.equal(page.sourceStartMs, input.occurrenceAtoms[0].startMs);
  assert.equal(page.sourceEndMs, input.occurrenceAtoms.at(-1).endMs);
});

test('OPL017: 同一入力二回でedge・predecessor・plan byteが一致する', async () => {
  const style = withPolicy(await landscapeStyle(), 4, 2);
  const first = await plan({captionTexts: [['a', 'bb', 'c', 'dd']], style});
  const second = await plan({captionTexts: [['a', 'bb', 'c', 'dd']], style});
  assert.equal(JSON.stringify(first.result), JSON.stringify(second.result));
});

test('OPL018: 横型と縦型の差は表示page/lineだけに閉じる', async () => {
  const input = fixture({captionTexts: [[
    'あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く',
    'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た',
  ]]});
  const before = Buffer.from(JSON.stringify(input));
  const horizontal = await buildPresentationOutputPageLinePlanV001({
    ...input, styleResolution: await landscapeStyle(), baseMediaTimeline: timeline(),
  });
  const vertical = await buildPresentationOutputPageLinePlanV001({
    ...input, styleResolution: await verticalStyle(), baseMediaTimeline: timeline(),
  });
  assert.equal(horizontal.status, 'planned');
  assert.equal(vertical.status, 'planned');
  assert.deepEqual(Buffer.from(JSON.stringify(input)), before);
  assert.deepEqual(
    semanticDisplayProjection(horizontal.captionDisplays[0]),
    semanticDisplayProjection(vertical.captionDisplays[0]),
  );
  assert.deepEqual(
    semanticDisplayProjection(horizontal.captionDisplays[0]),
    {
      semanticCaptionId: input.meaningPackage.captions[0].captionId,
      ordinal: input.meaningPackage.captions[0].ordinal,
      text: input.meaningPackage.captions[0].text,
      atomRefs: input.meaningPackage.captions[0].atomRefs,
      sourceStartMs: input.meaningPackage.captions[0].sourceStartMs,
      sourceEndMs: input.meaningPackage.captions[0].sourceEndMs,
    },
  );
  assert.notDeepEqual(horizontal.captionDisplays, vertical.captionDisplays);
});

test('OPL019: style差を通しても意味package byteは変化しない', async () => {
  const input = fixture({captionTexts: [['同', 'じ', '意', '味']]});
  const bytes = Buffer.from(`${JSON.stringify(input.meaningPackage)}\n`);
  await buildPresentationOutputPageLinePlanV001({
    ...input, styleResolution: await landscapeStyle(), baseMediaTimeline: timeline(),
  });
  await buildPresentationOutputPageLinePlanV001({
    ...input, styleResolution: await verticalStyle(), baseMediaTimeline: timeline(),
  });
  assert.deepEqual(Buffer.from(`${JSON.stringify(input.meaningPackage)}\n`), bytes);
});

test('OPL020: planner acceptedは日本語の読みやすさ合格を報告しない', async () => {
  const {result} = await plan({captionTexts: [['読', 'み', 'や', 'す', 'さ']]});
  assert.equal(result.status, 'planned');
  assert.equal('readability' in result, false);
  assert.equal(JSON.stringify(result).includes('readable'), false);
});

test('OPL021: planner結果に旧B4 artifactを含めない', async () => {
  const {result} = await plan({captionTexts: [['新', '経', '路']]});
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /presentation-caption-display-plan|instruction-bundle|resolution-package/u);
});

test('OPL022: L=1/2とも有限で任意cutoffを持たずresource fatalを専用化する', async () => {
  const atomCount = 3;
  for (const maxLines of [1, 2]) {
    const plannerEvents = [];
    const style = withPolicy(await landscapeStyle(), 4, maxLines);
    const input = fixture({captionTexts: [['a', 'b', 'c']]});
    const result = await buildPresentationOutputPageLinePlanV001({
      ...input,
      styleResolution: style,
      baseMediaTimeline: timeline(),
      resourceObserver(event) {
        plannerEvents.push(structuredClone(event));
        return {ignored: true};
      },
    });
    const lineEdgeBound = atomCount * (atomCount + 1) / 2;
    const pageEdgeBound = atomCount * (atomCount + 1) * (2 * atomCount + 1) / 6;
    assert.equal(result.status, 'planned');
    assert.equal(result.physicalEdges[0].edges.length, maxLines === 1 ? 6 : 10);
    assert.equal(result.timelineEdges[0].edges.length, result.physicalEdges[0].edges.length);
    assert.ok(result.physicalEdges[0].edges.length
      <= (maxLines === 1 ? lineEdgeBound : pageEdgeBound));
    assert.ok(result.selectedPredecessors[0].states.length <= atomCount);
    const finiteStateSpaceUpperBound = BigInt(atomCount + 1)
      * BigInt(PRESENTATION_OUTPUT_PLANNER_MAX_PAGES_PER_CAPTION_V001 + 1) ** 2n
      * BigInt(style.resolvedStyle.maxLogicalWidthPerLine + 1) ** 2n
      * BigInt(result.timelineEdges[0].edges.length + 1);
    assert.ok(finiteStateSpaceUpperBound > 0n);
    assertPlannerResourceEventsV001(plannerEvents);
  }

  const edge = ({fixtureId, start, end, widths, lineEnds, startFrame, endFrame}) => ({
    fixtureId,
    startBoundaryOrdinal: start,
    endBoundaryOrdinal: end,
    lineEndBoundaryOrdinals: lineEnds,
    lines: widths.map(logicalWidth => ({logicalWidth})),
    frameRange: {startFrame, endFrameExclusive: endFrame},
  });
  const frameRangeOf = item => item.frameRange;
  const dominationEvents = [];
  const dominated = selectPresentationOutputPagePathV001({
    edges: [
      edge({
        fixtureId: 'earlier-frame', start: 0, end: 1, widths: [4], lineEnds: [1],
        startFrame: 0, endFrame: 5,
      }),
      edge({
        fixtureId: 'later-frame', start: 0, end: 1, widths: [4], lineEnds: [1],
        startFrame: 0, endFrame: 6,
      }),
      edge({
        fixtureId: 'tail', start: 1, end: 2, widths: [4], lineEnds: [2],
        startFrame: 5, endFrame: 10,
      }),
    ],
    finalBoundary: 2,
    frameRangeOf,
    resourceObserver: event => dominationEvents.push(structuredClone(event)),
  });
  assert.equal(dominated.selectedEdges[0].fixtureId, 'earlier-frame');
  assert.ok(dominationEvents.some(event => event.stage === 'path-selection'
    && event.prunedDominatedStateCount > 0));

  const incomparableWidthEvents = [];
  const incomparableWidths = selectPresentationOutputPagePathV001({
    edges: [
      edge({
        fixtureId: 'smaller-maximum', start: 0, end: 2, widths: [2, 10], lineEnds: [1, 2],
        startFrame: 0, endFrame: 5,
      }),
      edge({
        fixtureId: 'better-future-range', start: 0, end: 2, widths: [8, 11], lineEnds: [1, 2],
        startFrame: 0, endFrame: 5,
      }),
      edge({
        fixtureId: 'future-width', start: 2, end: 3, widths: [12], lineEnds: [3],
        startFrame: 5, endFrame: 10,
      }),
    ],
    finalBoundary: 3,
    frameRangeOf,
    resourceObserver: event => incomparableWidthEvents.push(structuredClone(event)),
  });
  assert.equal(incomparableWidths.selectedEdges[0].fixtureId, 'better-future-range');
  assert.equal(incomparableWidthEvents[0].processedAtomCount, 1);
  assert.equal(incomparableWidthEvents[0].prunedDominatedStateCount, 0);

  const incomparableFrames = selectPresentationOutputPagePathV001({
    edges: [
      edge({
        fixtureId: 'later-but-narrower', start: 0, end: 1, widths: [4], lineEnds: [1],
        startFrame: 0, endFrame: 7,
      }),
      edge({
        fixtureId: 'earlier-but-wider', start: 0, end: 1, widths: [5], lineEnds: [1],
        startFrame: 0, endFrame: 5,
      }),
      edge({
        fixtureId: 'frame-sensitive-tail', start: 1, end: 2, widths: [10], lineEnds: [2],
        startFrame: 5, endFrame: 10,
      }),
    ],
    finalBoundary: 2,
    frameRangeOf,
  });
  assert.equal(incomparableFrames.selectedEdges[0].fixtureId, 'earlier-but-wider');

  const error = new PresentationOutputPlannerResourceExhaustedV001(new RangeError('fixture'));
  assert.equal(error.diagnosticCode, PRESENTATION_OUTPUT_PLANNER_RESOURCE_DIAGNOSTIC_V001);
  assert.equal(PRESENTATION_OUTPUT_PLANNER_MAX_PAGES_PER_CAPTION_V001, 999);
  const resourceInput = fixture({captionTexts: [['a']]});
  const resourceStyle = await landscapeStyle();
  Object.defineProperty(resourceStyle.layoutContext, 'format', {
    configurable: true,
    enumerable: true,
    get() { throw new RangeError('fixture resource exhaustion'); },
  });
  await assert.rejects(
    buildPresentationOutputPageLinePlanV001({
      ...resourceInput,
      styleResolution: resourceStyle,
      baseMediaTimeline: timeline(),
    }),
    observed => observed instanceof PresentationOutputPlannerResourceExhaustedV001
      && observed.diagnosticCode === PRESENTATION_OUTPUT_PLANNER_RESOURCE_DIAGNOSTIC_V001,
  );
  const [plannerSource, runnerSource] = await Promise.all([
    readFile(path.join(ROOT, 'evals/clip_composition/presentation_output_page_line_planner_v001.mjs'), 'utf8'),
    readFile(path.join(ROOT, 'evals/clip_composition/run_presentation_output_job_v001.ts'), 'utf8'),
  ]);
  assert.match(plannerSource, /prunedDominatedStateCount/u);
  assert.doesNotMatch(plannerSource, /(?:beamWidth|maxStates|maxEdges|arbitraryCutoff)/u);
  assert.match(runnerSource, /fatalDiagnostic\('caption-display-layout', 'OUTPUT_PLANNER_RESOURCE_EXHAUSTED'\)/u);
});

test('OPL023: atom重複は一pageで保持し隣接pageまたはcaptionのframe重複だけを拒否する', async () => {
  const onePage = fixture({captionTexts: [['a', 'b']], startMs: 1000, stepMs: 100});
  onePage.occurrenceAtoms[0].endMs = 1150;
  onePage.meaningPackage.captions[0].sourceEndMs = 1200;
  const planned = await buildPresentationOutputPageLinePlanV001({
    ...onePage, styleResolution: await landscapeStyle(), baseMediaTimeline: timeline(),
  });
  assert.equal(planned.status, 'planned');
  assert.equal(planned.captionDisplays[0].pages.length, 1);
  assert.equal(planned.captionDisplays[0].pages[0].sourceStartMs, 1000);
  assert.equal(planned.captionDisplays[0].pages[0].sourceEndMs, 1200);

  const input = fixture({captionTexts: [['a'], ['b']], startMs: 1000, stepMs: 100});
  input.occurrenceAtoms[1].startMs = 1050;
  input.occurrenceAtoms[1].endMs = 1150;
  input.meaningPackage.captions[1].sourceStartMs = 1050;
  input.meaningPackage.captions[1].sourceEndMs = 1150;
  const result = await buildPresentationOutputPageLinePlanV001({
    ...input, styleResolution: await landscapeStyle(), baseMediaTimeline: timeline(),
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE');
});

test('OPL024: 999 pageを上限として1000 pageをtimeline不成立にする', async () => {
  const style = withPolicy(await landscapeStyle(), 1, 1);
  const texts999 = Array.from({length: 999}, () => 'a');
  const accepted = await plan({captionTexts: [texts999], startMs: 1000, stepMs: 34, style});
  assert.equal(accepted.result.status, 'planned');
  assert.equal(accepted.result.captionDisplays[0].pages.length, 999);
  const rejected = await plan({captionTexts: [[...texts999, 'a']], startMs: 1000, stepMs: 34, style});
  assert.equal(rejected.result.status, 'rejected');
  assert.equal(rejected.result.code, 'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE');
});

const fixtures = {
  candidate13: 'evals/clip_composition/outputs/presentation/caption-display-pairs/DmWu0jVQfTE-candidate-13-caption-b6-v004/display-plan.json',
  candidate13Atoms: 'evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/source-atoms.json',
  candidate13Timeline: 'evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/timeline.json',
  candidate59: 'evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json',
  candidate59Atoms: 'evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/source-atoms.json',
  candidate59Timeline: 'evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/timeline.json',
  candidate59Vertical: 'evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002/display-plan.json',
  alternatives: 'evals/clip_composition/outputs/presentation/diagnostics/qdczJpv8RCc-candidate-59-b4-layout-v001/split-alternatives.json',
  formalMeaningPackage: 'evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002-meaning-information/meaning-information-package.json',
  formalTimelineDecision: 'evals/clip_composition/outputs/presentation/meaning-timeline-decisions/qdczJpv8RCc-candidate-59-meaning-output-first-run-timeline-v002/timeline-composition-decision.json',
  formalRetainedAtoms: 'evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/source-atoms.json',
  formalRetainedManifest: 'evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/generation-manifest.json',
  formalRetainedReport: 'evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001/validation-report.json',
  formalBaseTimeline: 'evals/clip_composition/outputs/presentation/meaning-output-base-media/qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002-meaning-information/timeline.json',
  formalLandscapeRenderPlan: 'evals/clip_composition/outputs/presentation/meaning-output-control/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/render-plan.json',
  formalVerticalRenderPlan: 'evals/clip_composition/outputs/presentation/meaning-output-control/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002/render-plan.json',
};

const loadFormalPlannerInput = async () => {
  const [meaningPackage, timelineDecision, sourceAtoms, generationManifest,
    validationReport, baseMediaTimeline] = await Promise.all([
    readJson(fixtures.formalMeaningPackage),
    readJson(fixtures.formalTimelineDecision),
    readJson(fixtures.formalRetainedAtoms),
    readJson(fixtures.formalRetainedManifest),
    readJson(fixtures.formalRetainedReport),
    readJson(fixtures.formalBaseTimeline),
  ]);
  const derived = derivePresentationExpectedAtomOccurrencesV001({
    timelineDecision,
    retainedSources: [{
      sourceMediaId: meaningPackage.sourceMedia[0].sourceMediaId,
      sourceAtoms,
      generationManifest,
      validationReport,
    }],
  });
  assert.equal(derived.status, 'passed', JSON.stringify(derived));
  const atoms = [...derived.occurrenceAtoms.values()];
  assert.equal(atoms.length, derived.expectedAtomOccurrences.length);
  const atomByRef = new Map(derived.expectedAtomOccurrences.map(
    (atomRef, index) => [canonicalJson(atomRef), atoms[index]],
  ));
  const occurrenceAtoms = meaningPackage.captions.flatMap(caption => caption.atomRefs.map(
    atomRef => {
      const atom = atomByRef.get(canonicalJson(atomRef));
      assert.ok(atom, canonicalJson(atomRef));
      return {
        atomRef: structuredClone(atomRef),
        text: atom.text,
        startMs: atom.startMs,
        endMs: atom.endMs,
      };
    },
  ));
  return {meaningPackage, occurrenceAtoms, baseMediaTimeline};
};

const projectLegacyDisplayFixture = (value, retainedSourceAtoms) => {
  const captions = [];
  const occurrenceAtoms = [];
  const atomById = new Map(retainedSourceAtoms.rawSourceAtoms.map(atom => [atom.atomId, atom]));
  const cues = value.containers.flatMap(container => container.cues);
  cues.forEach((cue, captionIndex) => {
    const sourceAtomIds = cue.lines.flatMap(line => line.sourceAtomIds);
    const sourceAtoms = sourceAtomIds.map(atomId => atomById.get(atomId));
    assert.ok(sourceAtoms.every(Boolean));
    const text = sourceAtoms.map(atom => atom.text).join('');
    assert.equal(text, cue.lines.map(line => line.text).join(''));
    assert.equal(sourceAtoms[0].startMs, cue.sourceStartMs);
    assert.equal(sourceAtoms.at(-1).endMs, cue.sourceEndMs);
    const refs = sourceAtomIds.map(atomId => ({
      timelineSegmentId: 'segment-0001',
      sourceMediaId: 'source-0001',
      atomId,
    }));
    refs.forEach((ref, atomIndex) => {
      const atom = sourceAtoms[atomIndex];
      occurrenceAtoms.push({
        atomRef: structuredClone(ref),
        text: atom.text,
        startMs: atom.startMs,
        endMs: atom.endMs,
      });
    });
    captions.push({
      captionId: `caption-${String(captionIndex + 1).padStart(6, '0')}`,
      ordinal: captionIndex + 1,
      timelineSegmentId: 'segment-0001',
      text,
      atomRefs: refs,
      startAnchor: {atomRef: structuredClone(refs[0]), edge: 'start'},
      endAnchor: {atomRef: structuredClone(refs.at(-1)), edge: 'end'},
      sourceStartMs: cue.sourceStartMs,
      sourceEndMs: cue.sourceEndMs,
    });
  });
  return {
    meaningPackage: {schemaVersion: 'zev-meaning-information-package-v001', captions},
    occurrenceAtoms,
  };
};

const planSavedDisplayFixture = async (
  value,
  retainedSourceAtoms,
  baseMediaTimeline,
  styleResolution,
) => {
  const input = projectLegacyDisplayFixture(value, retainedSourceAtoms);
  return buildPresentationOutputPageLinePlanV001({
    ...input,
    styleResolution,
    baseMediaTimeline,
  });
};

const planSavedSplitAlternative = async ({alternative, cue, retainedSourceAtoms}) => {
  const atomById = new Map(retainedSourceAtoms.rawSourceAtoms.map(atom => [atom.atomId, atom]));
  const sourceAtomIds = cue.lines.flatMap(line => line.sourceAtomIds);
  const sourceAtoms = sourceAtomIds.map(atomId => atomById.get(atomId));
  assert.ok(sourceAtoms.every(Boolean));
  assert.equal(sourceAtoms.map(atom => atom.text).join(''), alternative.textLines.join(''));
  let cursor = 0;
  const occurrenceAtoms = alternative.textLines.map((text, index) => {
    const lineAtoms = [];
    let observed = '';
    while (cursor < sourceAtoms.length && observed !== text) {
      const atom = sourceAtoms[cursor];
      lineAtoms.push(atom);
      observed += atom.text;
      cursor += 1;
    }
    assert.equal(observed, text);
    return {
      atomRef: {
        timelineSegmentId: 'segment-0001',
        sourceMediaId: 'source-0001',
        atomId: `saved-${alternative.lineEndBoundaryCandidateIds[index]}`,
      },
      text,
      startMs: lineAtoms[0].startMs,
      endMs: lineAtoms.at(-1).endMs,
    };
  });
  assert.equal(cursor, sourceAtoms.length);
  const refs = occurrenceAtoms.map(item => item.atomRef);
  return buildPresentationOutputPageLinePlanV001({
    meaningPackage: {
      schemaVersion: 'zev-meaning-information-package-v001',
      captions: [{
        captionId: 'caption-000001',
        ordinal: 1,
        timelineSegmentId: 'segment-0001',
        text: alternative.textLines.join(''),
        atomRefs: refs,
        startAnchor: {atomRef: structuredClone(refs[0]), edge: 'start'},
        endAnchor: {atomRef: structuredClone(refs.at(-1)), edge: 'end'},
        sourceStartMs: occurrenceAtoms[0].startMs,
        sourceEndMs: occurrenceAtoms.at(-1).endMs,
      }],
    },
    occurrenceAtoms,
    styleResolution: await landscapeStyle(),
    baseMediaTimeline: await readJson(fixtures.candidate59Timeline),
  });
};

test('OPL025: candidate 13保存caption/style fixtureは決定的である', async () => {
  const [bytes, atomBytes, timelineBytes] = await Promise.all([
    readFile(path.join(ROOT, fixtures.candidate13)),
    readFile(path.join(ROOT, fixtures.candidate13Atoms)),
    readFile(path.join(ROOT, fixtures.candidate13Timeline)),
  ]);
  assert.equal(sha256(bytes), 'c8fda888be8a10eb4f76ce5c21b9379b4e3b49d8e307f6007ebabc394a866207');
  assert.equal(sha256(atomBytes), '8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3');
  assert.equal(sha256(timelineBytes), '802f570dd4f8ea90ef63b0b9afb9a026abf0b18e43e51f2aab51bd62c2180fec');
  const value = JSON.parse(bytes.toString('utf8'));
  const retainedSourceAtoms = JSON.parse(atomBytes.toString('utf8'));
  const baseMediaTimeline = JSON.parse(timelineBytes.toString('utf8'));
  assert.equal(value.presetBinding.presetId, 'normal-landscape-readable-pop-v001');
  const styleResolution = await landscapeStyle();
  const first = await planSavedDisplayFixture(
    value, retainedSourceAtoms, baseMediaTimeline, styleResolution,
  );
  const second = await planSavedDisplayFixture(
    value, retainedSourceAtoms, baseMediaTimeline, styleResolution,
  );
  assert.equal(first.status, 'planned');
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('OPL026: candidate 59横型の既知20/36を拒否し30/26を受理する', async () => {
  const bytes = await readFile(path.join(ROOT, fixtures.alternatives));
  assert.equal(sha256(bytes), 'f76c669131b2649cee5cada9b645ae257fea0bcb7d925b2075d6f8d9e745e69b');
  const value = JSON.parse(bytes.toString('utf8'));
  const observed = new Map(value.alternatives.map(item => [item.logicalWidths.join('/'), item.status]));
  assert.equal(observed.get('20/36'), 'failed');
  assert.equal(observed.get('30/26'), 'passed');
  const [planBytes, atomBytes, timelineBytes] = await Promise.all([
    readFile(path.join(ROOT, fixtures.candidate59)),
    readFile(path.join(ROOT, fixtures.candidate59Atoms)),
    readFile(path.join(ROOT, fixtures.candidate59Timeline)),
  ]);
  assert.equal(sha256(planBytes), '48f9a7324b6207f87b35d52b9d09f722f1e382f90ff0b0604a75666861608921');
  assert.equal(sha256(atomBytes), '9fe657ace14e61d5af417897a67f56ba2e6e188d4346edde8320049643955996');
  assert.equal(sha256(timelineBytes), 'dbebfe08882aabf66f4c7b13f4489f3bd7348e7bd499ec783250827ccddafcb2');
  const retainedSourceAtoms = JSON.parse(atomBytes.toString('utf8'));
  const savedPlan = JSON.parse(planBytes.toString('utf8'));
  const cue = savedPlan.containers.flatMap(container => container.cues)
    .find(item => item.cueId === 'caption-cue-000013');
  assert.ok(cue);
  const rejectedAlternative = value.alternatives.find(item => item.logicalWidths.join('/') === '20/36');
  const acceptedAlternative = value.alternatives.find(item => item.logicalWidths.join('/') === '30/26');
  const rejected = await planSavedSplitAlternative({
    alternative: rejectedAlternative, cue, retainedSourceAtoms,
  });
  const accepted = await planSavedSplitAlternative({
    alternative: acceptedAlternative, cue, retainedSourceAtoms,
  });
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.code, 'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE');
  assert.equal(accepted.status, 'planned');
  assert.deepEqual(
    accepted.captionDisplays[0].pages[0].lines.map(line => line.logicalWidth),
    [30, 26],
  );
  const planned = await planSavedDisplayFixture(
    savedPlan,
    retainedSourceAtoms,
    JSON.parse(timelineBytes.toString('utf8')),
    await landscapeStyle(),
  );
  assert.equal(planned.status, 'planned');
});

test('OPL027: candidate 59縦型の認定caption/style fixtureは決定的である', async () => {
  const [bytes, atomBytes, timelineBytes] = await Promise.all([
    readFile(path.join(ROOT, fixtures.candidate59Vertical)),
    readFile(path.join(ROOT, fixtures.candidate59Atoms)),
    readFile(path.join(ROOT, fixtures.candidate59Timeline)),
  ]);
  assert.equal(sha256(bytes), '05feabbbbc75407239b96f9f341ca9b5130a7f8ac30d6e944d68352a462fe678');
  assert.equal(sha256(atomBytes), '9fe657ace14e61d5af417897a67f56ba2e6e188d4346edde8320049643955996');
  assert.equal(sha256(timelineBytes), 'dbebfe08882aabf66f4c7b13f4489f3bd7348e7bd499ec783250827ccddafcb2');
  const value = JSON.parse(bytes.toString('utf8'));
  const retainedSourceAtoms = JSON.parse(atomBytes.toString('utf8'));
  const baseMediaTimeline = JSON.parse(timelineBytes.toString('utf8'));
  assert.equal(value.formatSelection.format, 'vertical-short-1080x1920');
  assert.equal(value.displayConstraints.maxLogicalWidthPerLine, 14);
  const styleResolution = await verticalStyle();
  const first = await planSavedDisplayFixture(
    value, retainedSourceAtoms, baseMediaTimeline, styleResolution,
  );
  const second = await planSavedDisplayFixture(
    value, retainedSourceAtoms, baseMediaTimeline, styleResolution,
  );
  assert.equal(first.status, 'planned');
  let physicallyRequiredShortWrapCount = 0;
  for (const display of first.captionDisplays) {
    const physical = first.physicalEdges.find(
      entry => entry.semanticCaptionId === display.semanticCaptionId,
    );
    assert.ok(physical);
    for (const page of display.pages) {
      if (page.lines.length !== 2
        || page.lines.reduce((sum, line) => sum + line.logicalWidth, 0) > 14) continue;
      physicallyRequiredShortWrapCount += 1;
      const pageAtomRefs = JSON.stringify(page.atomRefs);
      const sameSpanOneLineEdges = physical.edges.filter(edge => (
        edge.lines.length === 1
        && JSON.stringify(edge.lines[0].atomRefs) === pageAtomRefs
      ));
      assert.equal(sameSpanOneLineEdges.length, 0, page.pageId);
    }
  }
  assert.ok(physicallyRequiredShortWrapCount > 0);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('OPL028: 共有入口抽出後もv001 planner結果byteは固定値と一致する', async () => {
  const style = withPolicy(await landscapeStyle(), 4, 2);
  const {result} = await plan({captionTexts: [['a', 'b', 'c', 'd']], style});
  assert.equal(result.status, 'planned');
  assert.equal(
    sha256(Buffer.from(canonicalJson(result), 'utf8')),
    '51854eae88f66b136d627244ee58df60a78a92bc6429d9829738a6c5dd316955',
  );

  const formalInput = await loadFormalPlannerInput();
  const oracles = [
    {
      name: 'landscape',
      renderPlanPath: fixtures.formalLandscapeRenderPlan,
      renderPlanSha256: '17a2c8a499bc8a7c49a8bdcf4993fa6e0e7618c6d64a6650c6ffda3755f44988',
      styleResolution: await landscapeStyle(),
    },
    {
      name: 'vertical',
      renderPlanPath: fixtures.formalVerticalRenderPlan,
      renderPlanSha256: '282389a256088fd374bd49453ee0c7c75f7e0a1828a157c99e99818a1a4778ad',
      styleResolution: await verticalStyle(),
    },
  ];
  for (const oracle of oracles) {
    const renderPlanArtifact = await readArtifact(oracle.renderPlanPath);
    assert.equal(sha256(renderPlanArtifact.bytes), oracle.renderPlanSha256, oracle.name);
    const rebuilt = await buildPresentationOutputPageLinePlanV001({
      ...formalInput,
      styleResolution: oracle.styleResolution,
    });
    assert.equal(rebuilt.status, 'planned', oracle.name);
    assert.deepEqual(
      serializePresentationAFormalJsonV002(rebuilt.captionDisplays),
      serializePresentationAFormalJsonV002(renderPlanArtifact.value.captionDisplays),
      oracle.name,
    );
  }
});

test('OPL029: v001/v002は物理候補とpath選択の同一入口を使う', async () => {
  const [v001, v002] = await Promise.all([
    readFile(path.join(ROOT, 'evals/clip_composition/presentation_output_page_line_planner_v001.mjs'), 'utf8'),
    readFile(path.join(ROOT, 'evals/clip_composition/presentation_output_page_line_planner_v002.mjs'), 'utf8'),
  ]);
  for (const source of [v001, v002]) {
    assert.match(source, /buildPresentationOutputPhysicalPageGraphV001\(/u);
    assert.match(source, /selectPresentationOutputPagePathV001\(/u);
  }
  assert.doesNotMatch(v002, /const buildLineCandidates\s*=/u);
  assert.doesNotMatch(v002, /const selectTimelinePath\s*=/u);
});
