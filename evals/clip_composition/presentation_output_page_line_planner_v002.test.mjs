import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  buildPresentationOutputPageLinePlanV002,
  getPresentationOutputPageLinePlanTimelineObservationV002,
  validatePresentationOutputCaptionDisplaysV002,
  validatePresentationOutputResolvedStyleV002,
} from './presentation_output_page_line_planner_v002.mjs';
import {
  PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
  resolvePresentationOutputStyleV001,
} from './presentation_output_style_resolver_v001.ts';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';

const ROOT = process.cwd();
const H = 'a'.repeat(64);
const REGISTRY = 'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
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
  assert.deepEqual(
    [...new Set(events.map(event => event.stage))],
    PLANNER_RESOURCE_EVENT_STAGES_V001,
  );
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
};
const binding = (schemaVersion, name) => ({
  schemaVersion,
  path: `fixtures/${name}.json`,
  fileSha256: H,
  canonicalSha256: H,
});
const artifact = async (schemaVersion, relativePath) => {
  const bytes = await readFile(path.join(ROOT, relativePath));
  const value = JSON.parse(bytes.toString('utf8'));
  return {
    value,
    binding: {
      schemaVersion,
      path: relativePath,
      fileSha256: sha256(bytes),
      canonicalSha256: sha256(Buffer.from(canonicalJson(value), 'utf8')),
    },
  };
};

let stylePromise;
const landscapeStyle = () => {
  stylePromise ??= (async () => {
    const [trust, registry, presetIndex, materialIndex, rendererTrust] = await Promise.all([
      artifact('presentation-registry-trust-v001', `${REGISTRY}/trusted-registry-bindings.json`),
      artifact('presentation-preset-registry-v001', `${REGISTRY}/preset-registry.json`),
      artifact('normal-landscape-preset-registry-v001', `${REGISTRY}/preset-validation-index.json`),
      artifact('presentation-material-registry-empty-v001', `${REGISTRY}/material-validation-index.json`),
      artifact(
        'presentation-renderer-trust-v001',
        'evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json',
      ),
    ]);
    const result = await resolvePresentationOutputStyleV001({
      styleInput: {
        format: 'normal-landscape',
        screenLayoutId: null,
        presetBinding: {
          trustedRegistryBindings: trust.binding,
          presetRegistry: registry.binding,
          presetValidationIndex: presetIndex.binding,
          materialValidationIndex: materialIndex.binding,
          rendererTrust: rendererTrust.binding,
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
        trustedRegistryBindings: trust.value,
        presetRegistry: registry.value,
        presetValidationIndex: presetIndex.value,
        materialValidationIndex: materialIndex.value,
        rendererTrust: rendererTrust.value,
      },
      baseMediaInput: {
        baseMedia: {path: 'fixtures/base.mp4', fileSha256: H},
        timeline: binding('presentation-base-media-timeline-v002', 'timeline'),
        generationManifest: binding(
          'presentation-output-base-media-generation-manifest-v001',
          'manifest',
        ),
        validationReceipt: binding(
          'presentation-output-base-media-validation-receipt-v001',
          'receipt',
        ),
      },
      baseMediaInspection: null,
    });
    assert.equal(result.status, 'resolved');
    return {resolvedStyle: result.resolvedStyle, layoutContext: result.layoutContext};
  })();
  return stylePromise.then(value => structuredClone(value));
};

const withWidth = async (width, lines = 2) => {
  const style = await landscapeStyle();
  style.resolvedStyle.maxLogicalWidthPerLine = width;
  style.resolvedStyle.maxLinesPerDisplayPage = lines;
  style.layoutContext.resolvedStyle.maxLogicalWidthPerLine = width;
  style.layoutContext.resolvedStyle.maxLinesPerDisplayPage = lines;
  return style;
};

const timeline = ({secondOutputStart = 12} = {}) => ({
  schemaVersion: 'presentation-base-media-timeline-v002',
  timelineId: 'a-v002-output-timeline',
  sourceProvenance: 'a-v002-planner-fixture',
  sourceRef: 'youtube:fixture',
  sourceFrameClock: {
    inputFrameRate: '30/1',
    logicalFrameRate: '30/1',
    extractionRuleId: 'source-frame-30fps-identity-v001',
    decodedFrameCount: 30,
  },
  baseMedia: {
    artifactId: 'a-v002-base-media',
    path: 'base-media.mp4',
    fileSha256: H,
    frameRate: '30/1',
    expectedFrameCount: secondOutputStart + 12,
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
    outputStartFrame: secondOutputStart,
    outputEndFrame: secondOutputStart + 12,
  }],
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
  packageId: 'a-v002-planner-fixture',
  sourceMedia: [sourceMedia],
  timelineComposition: {
    timelineId: 'a-v002-planner-fixture-timeline',
    segments: [{
      segmentId: 'segment-0001',
      storyOrdinal: 1,
      sourceTimeOrdinal: 1,
      sourceMediaId: sourceMedia.sourceMediaId,
      sourceStartMs: 0,
      sourceEndMs: 400,
    }, {
      segmentId: 'segment-0002',
      storyOrdinal: 2,
      sourceTimeOrdinal: 2,
      sourceMediaId: sourceMedia.sourceMediaId,
      sourceStartMs: 600,
      sourceEndMs: 1000,
    }],
  },
  atomOccurrences: [{
    atomOccurrenceId: 'atom-occurrence-000001',
    ordinal: 1,
    sourceMediaId: sourceMedia.sourceMediaId,
    sourceAtomId: 'source-atom-000001',
    text: 'あ',
    sourceAtomInterval: {sourceStartMs: 200, sourceEndMs: 800},
    retainedSpans: [
      {timelineSegmentId: 'segment-0001', sourceStartMs: 200, sourceEndMs: 400},
      {timelineSegmentId: 'segment-0002', sourceStartMs: 600, sourceEndMs: 800},
    ],
  }, {
    atomOccurrenceId: 'atom-occurrence-000002',
    ordinal: 2,
    sourceMediaId: sourceMedia.sourceMediaId,
    sourceAtomId: 'source-atom-000002',
    text: 'い',
    sourceAtomInterval: {sourceStartMs: 800, sourceEndMs: 1000},
    retainedSpans: [
      {timelineSegmentId: 'segment-0002', sourceStartMs: 800, sourceEndMs: 1000},
    ],
  }],
  captions: [{
    captionId: 'caption-000001',
    ordinal: 1,
    text: 'あい',
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

const plan = async ({
  pkg = meaningPackage(), style, media = timeline(), resourceObserver,
} = {}) =>
  buildPresentationOutputPageLinePlanV002({
    meaningPackage: pkg,
    styleResolution: style ?? await landscapeStyle(),
    baseMediaTimeline: media,
    resourceObserver,
  });

test('OPLV2001: 一つの意味atomを一度だけ保持して複数spanを写す', async () => {
  const result = await plan();
  assert.equal(result.status, 'planned', JSON.stringify(result));
  assert.deepEqual(result.captionDisplays[0].pages[0].atomOccurrenceIds, [
    'atom-occurrence-000001', 'atom-occurrence-000002',
  ]);
  assert.equal(result.captionDisplays[0].pages[0].text, 'あい');
  const observation = getPresentationOutputPageLinePlanTimelineObservationV002(result);
  assert.deepEqual(Object.keys(observation), [
    'schemaVersion', 'fileSha256', 'canonicalSha256',
  ]);
  assert.equal(observation.schemaVersion, 'presentation-base-media-timeline-v002');
  assert.match(observation.fileSha256, /^[0-9a-f]{64}$/u);
  assert.equal(Object.hasOwn(result, 'baseMediaTimelineObservation'), false);
});

test('OPLV2002: 幅内の短い本文は不要な改行を入れない', async () => {
  const result = await plan();
  assert.equal(result.captionDisplays[0].pages.length, 1);
  assert.deepEqual(result.captionDisplays[0].pages[0].lines.map(line => line.text), ['あい']);
});

test('OPLV2003: pageとlineはoccurrence境界だけで切る', async () => {
  const result = await plan({style: await withWidth(2, 1)});
  assert.equal(result.status, 'planned');
  assert.deepEqual(result.captionDisplays[0].pages.map(page => page.atomOccurrenceIds), [
    ['atom-occurrence-000001'], ['atom-occurrence-000002'],
  ]);
});

test('OPLV2004: 全lineは入力幅上限以下である', async () => {
  const result = await plan({style: await withWidth(2, 2)});
  assert.ok(result.captionDisplays[0].pages.flatMap(page => page.lines)
    .every(line => line.logicalWidth <= 2));
});

test('OPLV2005: safe area外の物理候補はlayout拒否になる', async () => {
  const style = await landscapeStyle();
  style.layoutContext.canvas.safeAreaPx = {top: 540, right: 960, bottom: 540, left: 960};
  const result = await plan({style});
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'OUTPUT_V002_LAYOUT_UNRESOLVED');
});

test('OPLV2006: pageとlineの連結は意味本文を全量一回だけ保持する', async () => {
  const pkg = meaningPackage();
  const result = await plan({pkg, style: await withWidth(2, 1)});
  assert.equal(result.captionDisplays[0].pages.map(page => page.text).join(''), 'あい');
  assert.equal(validatePresentationOutputCaptionDisplaysV002(
    result.captionDisplays,
    pkg,
    (await withWidth(2, 1)).resolvedStyle,
  ), true);
});

test('OPLV2007: segment別包絡とframe来歴を分けて連続表示へ投影する', async () => {
  const result = await plan();
  const page = result.captionDisplays[0].pages[0];
  assert.deepEqual(page.sourceSpanEnvelopes, [
    {timelineSegmentId: 'segment-0001', sourceStartMs: 200, sourceEndMs: 400},
    {timelineSegmentId: 'segment-0002', sourceStartMs: 600, sourceEndMs: 1000},
  ]);
  assert.equal(page.frameMappings[0].endFrameExclusive, page.frameMappings[1].startFrame);
  assert.deepEqual(
    {startFrame: page.startFrame, endFrameExclusive: page.endFrameExclusive},
    {startFrame: 6, endFrameExclusive: 24},
  );
});

test('OPLV2008: 同一入力二回のplanはbyte一致する', async () => {
  const style = await landscapeStyle();
  const first = await plan({style});
  const resourceEvents = [];
  const second = await plan({
    style,
    resourceObserver(event) {
      resourceEvents.push(structuredClone(event));
      return {ignored: true};
    },
  });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assertPlannerResourceEventsV001(resourceEvents);
  const completed = resourceEvents.at(-1);
  assert.equal(completed.stage, 'planner-completed');
  assert.equal(completed.processedAtomCount, meaningPackage().atomOccurrences.length);
  assert.ok(completed.generatedStateCount > 0);
  assert.ok(completed.maximumRetainedStateCount > 0);
  assert.ok(completed.elapsedMs >= 0);
});

test('OPLV2009: v001意味packageは暗黙変換せず拒否する', async () => {
  const result = await plan({pkg: {schemaVersion: 'zev-meaning-information-package-v001'}});
  assert.equal(result.code, 'OUTPUT_V002_PLANNER_INPUT_INVALID');
  const diagnostic = {
    ...(await landscapeStyle()).resolvedStyle,
    format: 'vertical-short-1080x1920',
    screenLayoutId: null,
    presetId: 'diagnostic-full-frame-contain-v001',
    cropMode: 'diagnostic-contain',
    maxLogicalWidthPerLine: 14,
  };
  assert.equal(validatePresentationOutputResolvedStyleV002(diagnostic), true);
  assert.equal(validatePresentationOutputResolvedStyleV002({
    ...diagnostic,
    presetId: 'different-preset-v001',
  }), false);
  assert.equal(validatePresentationOutputResolvedStyleV002({
    ...diagnostic,
    cropMode: 'bound-decision',
  }), false);
  assert.equal(validatePresentationOutputResolvedStyleV002({
    ...diagnostic,
    presetRegistryBinding: binding('presentation-preset-registry-v001', 'registry'),
  }), false);
  assert.equal(validatePresentationOutputResolvedStyleV002({
    ...diagnostic,
    screenLayoutId: 'speaker_only',
    cropMode: 'bound-decision',
  }), false);
});

test('OPLV2010: occurrenceのspan順不正は入力拒否になる', async () => {
  const pkg = meaningPackage();
  pkg.atomOccurrences[0].retainedSpans.reverse();
  const result = await plan({pkg});
  assert.equal(result.code, 'OUTPUT_V002_PLANNER_INPUT_INVALID');
  const textMismatch = meaningPackage();
  textMismatch.captions[0].text = 'う';
  const textResult = await plan({pkg: textMismatch});
  assert.equal(textResult.status, 'rejected');
  assert.equal(textResult.code, 'OUTPUT_V002_TEXT_COVERAGE_MISMATCH');
});

test('OPLV2011: 不正なbase timelineはspan未写像として拒否する', async () => {
  const result = await plan({media: timeline({secondOutputStart: 13})});
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'OUTPUT_V002_SPAN_UNMAPPED');
});

test('OPLV2012: 一atomも幅内に収まらない場合はlayout拒否する', async () => {
  const result = await plan({style: await withWidth(1, 1)});
  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'OUTPUT_V002_LAYOUT_UNRESOLVED');
});
