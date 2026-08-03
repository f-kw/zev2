import {createHash} from 'node:crypto';
import path from 'node:path';

import {
  canonicalJson as canonicalPresentationOutputFiniteJsonV001,
  serializePresentationCaptionReport,
} from './presentation_caption_contract_v002.mjs';
import {
  validatePresentationMeaningAtomRefV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  codePointWeightV001,
  indexExplicitLinesV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  derivePresentationOutputMeaningProjectionV001,
} from './presentation_output_contract_v001.mjs';
import {
  validatePresentationOutputCaptionDisplaysV001,
} from './presentation_output_page_line_planner_v001.mjs';
import {
  PRESENTATION_RENDERER_QC_VIOLATION_CODES,
} from './presentation_renderer_qc_v002.mjs';

export {derivePresentationOutputMeaningProjectionV001};

export const PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V001 =
  'presentation-output-render-plan-v001';
export const PRESENTATION_OUTPUT_RENDER_APPLICATION_RESULTS_SCHEMA_V001 =
  'presentation-output-render-application-results-v001';
export const PRESENTATION_OUTPUT_RENDER_QC_SCHEMA_V001 =
  'presentation-output-render-qc-v001';
export const PRESENTATION_OUTPUT_RENDER_MANIFEST_SCHEMA_V001 =
  'presentation-output-render-manifest-v001';
export const PRESENTATION_OUTPUT_RENDER_FAILURE_REPORT_SCHEMA_V001 =
  'presentation-output-render-failure-report-v001';

export const PRESENTATION_OUTPUT_RENDER_DIAGNOSTIC_CODES_V001 = Object.freeze([
  'OUTPUT_RENDER_CORE_CONTRACT_FAILED',
  'OUTPUT_RENDER_CORE_PROCESS_FAILED',
  'OUTPUT_RENDER_STAGED_ARTIFACT_INVALID',
  'OUTPUT_RENDER_PUBLICATION_FAILED',
]);

export const PRESENTATION_OUTPUT_RENDER_FAILURE_STAGES_V001 = Object.freeze([
  'output-reservation',
  'work-directory',
  'layout-preflight',
  'overlay-determinism',
  'overlay-preflight',
  'post-render-qc',
  'overlay-render',
  'publish',
  'staged-artifact-validation',
  'publication',
  'execution',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/u;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && Object.keys(value).every((key, index) => key === String(index));
const nonempty = value => typeof value === 'string' && value.length > 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const exactKeys = (value, keys) => (
  isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index])
);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const compareUtf8 = (left, right) => Buffer.compare(
  Buffer.from(left, 'utf8'),
  Buffer.from(right, 'utf8'),
);
const sortedUniqueStrings = values => dense(values)
  && values.every(value => typeof value === 'string')
  && new Set(values).size === values.length
  && values.every((value, index) => index === 0
    || compareUtf8(values[index - 1], value) < 0);
const canonicalSha256OutputJson = value => createHash('sha256').update(
  canonicalPresentationOutputFiniteJsonV001(value),
).digest('hex');
const outputIdFromDerivedId = (value, suffix) => {
  if (!FORMAL_ID.test(value) || !value.endsWith(suffix)) return null;
  const outputId = value.slice(0, -suffix.length);
  return FORMAL_ID.test(outputId) && `${outputId}${suffix}` === value ? outputId : null;
};

const hasLoneSurrogate = value => {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
};

const isFiniteJsonValue = value => {
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return !hasLoneSurrogate(value);
  if (typeof value === 'number') {
    return Number.isFinite(value)
      && !Object.is(value, -0)
      && (!Number.isInteger(value) || Number.isSafeInteger(value));
  }
  if (Array.isArray(value)) return dense(value) && value.every(isFiniteJsonValue);
  return isObject(value)
    && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).every(key => !hasLoneSurrogate(key))
    && Object.values(value).every(isFiniteJsonValue);
};

const isJsonBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && nonempty(value.schemaVersion) && WORKSPACE_PATH.test(value.path ?? '')
  && SHA256.test(value.fileSha256) && SHA256.test(value.canonicalSha256);
const isMediaBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path ?? '') && SHA256.test(value.fileSha256);
const isImplementationBinding = value => exactKeys(value, ['path', 'fileSha256', 'role'])
  && WORKSPACE_PATH.test(value.path ?? '')
  && SHA256.test(value.fileSha256) && FORMAL_ID.test(value.role);

const isResolvedStyle = value => exactKeys(value, [
  'format', 'screenLayoutId', 'presetId', 'visualStateId',
  'maxLogicalWidthPerLine', 'maxLinesPerDisplayPage', 'characterWidthRule',
  'cropMode', 'sceneTransitionMode', 'audioMode',
])
  && ['normal-landscape', 'vertical-short-1080x1920'].includes(value.format)
  && (value.format === 'normal-landscape'
    ? value.screenLayoutId === null && value.cropMode === 'identity'
    : FORMAL_ID.test(value.screenLayoutId) && value.cropMode === 'bound-decision')
  && FORMAL_ID.test(value.presetId)
  && FORMAL_ID.test(value.visualStateId)
  && positive(value.maxLogicalWidthPerLine)
  && positive(value.maxLinesPerDisplayPage)
  && value.maxLinesPerDisplayPage <= 99
  && value.characterWidthRule === 'U+0000..U+00FF=1; other Unicode code point=2'
  && value.sceneTransitionMode === 'straight-cut-only'
  && value.audioMode === 'preserve-source-only';

const isRendererQc = value => exactKeys(value, [
  'schemaVersion', 'status', 'instructionCount', 'checks', 'instructionEvidence',
  'mediaEvidence', 'violations',
])
  && [
    'presentation-render-qc-v002',
    'presentation-review-render-qc-v003',
    'presentation-vertical-review-renderer-qc-v001',
  ].includes(value.schemaVersion)
  && value.status === 'passed'
  && positive(value.instructionCount)
  && exactKeys(value.checks, [
    'instructionApplication', 'layoutAndVisibility', 'media',
  ])
  && Object.values(value.checks).every(check => exactKeys(check, ['status'])
    && check.status === 'passed')
  && dense(value.instructionEvidence)
  && value.instructionEvidence.length === value.instructionCount
  && value.instructionEvidence.every(isFiniteJsonValue)
  && exactKeys(value.mediaEvidence, ['observed', 'expectedAudio', 'expectedFrameCount'])
  && isFiniteJsonValue(value.mediaEvidence.observed)
  && isFiniteJsonValue(value.mediaEvidence.expectedAudio)
  && (value.mediaEvidence.expectedFrameCount === null
    || nonnegative(value.mediaEvidence.expectedFrameCount))
  && dense(value.violations)
  && value.violations.length === 0;

const finalElementMatchesPage = (
  element,
  page,
  resolvedStyle,
  overlaySha256,
  presetRegistryVersion = undefined,
) => (
  isObject(element)
  && element.instructionId === page.pageId
  && element.kind === 'speech-caption'
  && element.text === page.text
  && dense(element.indexedLines)
  && element.indexedLines.length === page.lines.length
  && element.indexedLines.every((line, index) => line.lineIndex === index
    && line.renderedText === page.lines[index].text
    && same(line.atomRefs, page.lines[index].atomRefs)
    && line.logicalWidth === page.lines[index].logicalWidth)
  && element.sourceStartMs === page.sourceStartMs
  && element.sourceEndMs === page.sourceEndMs
  && element.startFrame === page.startFrame
  && element.endFrameExclusive === page.endFrameExclusive
  && element.displayFrameCount === page.displayFrameCount
  && element.requestedPresetId === resolvedStyle.presetId
  && element.appliedPresetId === resolvedStyle.presetId
  && element.presetId === resolvedStyle.presetId
  && element.stateId === resolvedStyle.visualStateId
  && element.timelineSegmentId === page.timelineSegmentId
  && element.overlaySha256 === overlaySha256
  && (presetRegistryVersion === undefined
    || (element.registryVersion === presetRegistryVersion
      && element.presetRegistryVersion === presetRegistryVersion))
);

const logicalWidth = (text, characterWidthRule) => [...text].reduce(
  (total, codePoint) => total + codePointWeightV001(codePoint, characterWidthRule),
  0,
);

const isLine = (line, captionOrdinal, pageOrdinal, lineIndex, resolvedStyle) => (
  exactKeys(line, ['lineId', 'lineOrdinal', 'atomRefs', 'text', 'logicalWidth'])
  && line.lineId === `display-line-${String(captionOrdinal).padStart(6, '0')}-${String(pageOrdinal).padStart(3, '0')}-${String(lineIndex + 1).padStart(2, '0')}`
  && line.lineOrdinal === lineIndex + 1
  && dense(line.atomRefs) && line.atomRefs.length > 0
  && line.atomRefs.every(validatePresentationMeaningAtomRefV001)
  && nonempty(line.text)
  && positive(line.logicalWidth)
  && line.logicalWidth === logicalWidth(line.text, resolvedStyle.characterWidthRule)
  && line.logicalWidth <= resolvedStyle.maxLogicalWidthPerLine
);

const isPage = (page, captionOrdinal, pageIndex, resolvedStyle) => (
  exactKeys(page, [
    'pageId', 'pageOrdinal', 'atomRefs', 'text', 'sourceStartMs', 'sourceEndMs',
    'timelineSegmentId', 'sourceStartFrame30', 'sourceEndFrame30', 'startFrame',
    'endFrameExclusive', 'displayFrameCount', 'lines',
  ])
  && page.pageId === `display-page-${String(captionOrdinal).padStart(6, '0')}-${String(pageIndex + 1).padStart(3, '0')}`
  && page.pageOrdinal === pageIndex + 1
  && dense(page.atomRefs) && page.atomRefs.length > 0
  && page.atomRefs.every(validatePresentationMeaningAtomRefV001)
  && nonempty(page.text)
  && nonnegative(page.sourceStartMs) && positive(page.sourceEndMs)
  && page.sourceStartMs < page.sourceEndMs
  && FORMAL_ID.test(page.timelineSegmentId)
  && nonnegative(page.sourceStartFrame30) && positive(page.sourceEndFrame30)
  && page.sourceStartFrame30 < page.sourceEndFrame30
  && nonnegative(page.startFrame) && positive(page.endFrameExclusive)
  && page.startFrame < page.endFrameExclusive
  && page.displayFrameCount === page.endFrameExclusive - page.startFrame
  && dense(page.lines) && page.lines.length > 0
  && page.lines.length <= resolvedStyle.maxLinesPerDisplayPage
  && page.lines.every((line, index) => isLine(
    line,
    captionOrdinal,
    pageIndex + 1,
    index,
    resolvedStyle,
  ))
  && page.lines.flatMap(line => line.atomRefs).length === page.atomRefs.length
  && same(page.lines.flatMap(line => line.atomRefs), page.atomRefs)
  && page.lines.map(line => line.text).join('') === page.text
);

const isCaptionDisplay = (display, index, resolvedStyle) => (
  exactKeys(display, ['displayCaptionId', 'semanticCaptionId', 'ordinal', 'pages'])
  && display.displayCaptionId === `display-caption-${String(index + 1).padStart(6, '0')}`
  && FORMAL_ID.test(display.semanticCaptionId)
  && display.ordinal === index + 1
  && dense(display.pages) && display.pages.length > 0 && display.pages.length <= 999
  && display.pages.every((page, pageIndex) => isPage(
    page,
    index + 1,
    pageIndex,
    resolvedStyle,
  ))
);

export function validatePresentationOutputRenderPlanV001(plan, context = {}) {
  if (!exactKeys(plan, [
    'schemaVersion', 'planId', 'outputRequestBinding', 'meaningPackageBinding',
    'baseMediaBinding', 'resolvedStyle', 'captionDisplays', 'titleDisplay',
    'meaningProjection',
  ])
    || plan.schemaVersion !== PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V001
    || !FORMAL_ID.test(plan.planId)
    || !isJsonBinding(plan.outputRequestBinding)
    || plan.outputRequestBinding.schemaVersion !== 'presentation-output-request-v001'
    || !isJsonBinding(plan.meaningPackageBinding)
    || plan.meaningPackageBinding.schemaVersion !== 'zev-meaning-information-package-v001'
    || !exactKeys(plan.baseMediaBinding, [
      'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
    ])
    || !isMediaBinding(plan.baseMediaBinding.baseMedia)
    || !isJsonBinding(plan.baseMediaBinding.timeline)
    || plan.baseMediaBinding.timeline.schemaVersion !== 'presentation-base-media-timeline-v002'
    || !isJsonBinding(plan.baseMediaBinding.generationManifest)
    || plan.baseMediaBinding.generationManifest.schemaVersion
      !== 'presentation-output-base-media-generation-manifest-v001'
    || !isJsonBinding(plan.baseMediaBinding.validationReceipt)
    || plan.baseMediaBinding.validationReceipt.schemaVersion
      !== 'presentation-output-base-media-validation-receipt-v001'
    || !isResolvedStyle(plan.resolvedStyle)
    || !dense(plan.captionDisplays)
    || !plan.captionDisplays.every((display, index) => isCaptionDisplay(
      display,
      index,
      plan.resolvedStyle,
    ))
    || !exactKeys(plan.titleDisplay, ['status'])
    || plan.titleDisplay.status !== 'not-requested'
    || !exactKeys(plan.meaningProjection, [
      'timelineSegmentCount', 'captionCount', 'titleState', 'semanticObservationCount',
      'captionTextSequenceCanonicalSha256', 'captionTimingSequenceCanonicalSha256',
      'timelineCompositionCanonicalSha256',
    ])
    || !nonnegative(plan.meaningProjection.timelineSegmentCount)
    || !nonnegative(plan.meaningProjection.captionCount)
    || !['empty', 'provided'].includes(plan.meaningProjection.titleState)
    || !nonnegative(plan.meaningProjection.semanticObservationCount)
    || !SHA256.test(plan.meaningProjection.captionTextSequenceCanonicalSha256)
    || !SHA256.test(plan.meaningProjection.captionTimingSequenceCanonicalSha256)
    || !SHA256.test(plan.meaningProjection.timelineCompositionCanonicalSha256)) {
    return {status: 'rejected', violations: [{
      code: 'COMMON_RENDER_PLAN_INVALID', path: '', relatedIds: [],
    }]};
  }
  if (context.requestId && plan.planId !== `${context.requestId}-render-plan`) {
    return {status: 'rejected', violations: [{
      code: 'COMMON_RENDER_PLAN_INVALID', path: '/planId', relatedIds: [],
    }]};
  }
  if (context.meaningPackage
    && !validatePresentationOutputCaptionDisplaysV001(
      plan.captionDisplays,
      context.meaningPackage,
      plan.resolvedStyle,
    )) {
    return {status: 'rejected', violations: [{
      code: 'MEANING_PROJECTION_CHANGED', path: '/captionDisplays', relatedIds: [],
    }]};
  }
  for (let index = 0; index < plan.captionDisplays.length; index += 1) {
    const display = plan.captionDisplays[index];
    const caption = context.meaningPackage?.captions?.[index];
    if (caption && (
      display.semanticCaptionId !== caption.captionId
      || display.pages.flatMap(page => page.atomRefs).length !== caption.atomRefs.length
      || !same(display.pages.flatMap(page => page.atomRefs), caption.atomRefs)
      || display.pages.map(page => page.text).join('') !== caption.text
    )) {
      return {status: 'rejected', violations: [{
        code: 'MEANING_PROJECTION_CHANGED', path: `/captionDisplays/${index}`,
        relatedIds: [caption.captionId],
      }]};
    }
  }
  if (context.meaningPackage
    && !same(plan.meaningProjection,
      derivePresentationOutputMeaningProjectionV001(context.meaningPackage))) {
    return {status: 'rejected', violations: [{
      code: 'MEANING_PROJECTION_CHANGED', path: '/meaningProjection', relatedIds: [],
    }]};
  }
  return {status: 'passed', violations: []};
}

export function buildPresentationOutputRenderPlanV001({
  request,
  outputRequestBinding,
  meaningPackage,
  pageLinePlan,
  resolvedStyle,
}) {
  if (meaningPackage.title?.text !== '') {
    return {status: 'rejected', violations: [{
      code: 'TITLE_STYLE_UNAVAILABLE', path: '/title', relatedIds: [],
    }]};
  }
  if (pageLinePlan?.status !== 'planned' || !dense(pageLinePlan.captionDisplays)) {
    return {status: 'rejected', violations: [{
      code: 'COMMON_RENDER_PLAN_INVALID', path: '/captionDisplays', relatedIds: [],
    }]};
  }
  const plan = {
    schemaVersion: PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V001,
    planId: `${request.requestId}-render-plan`,
    outputRequestBinding,
    meaningPackageBinding: structuredClone(request.meaningInformationPackage),
    baseMediaBinding: structuredClone(request.baseMediaInput),
    resolvedStyle: structuredClone(resolvedStyle),
    captionDisplays: structuredClone(pageLinePlan.captionDisplays),
    titleDisplay: {status: 'not-requested'},
    meaningProjection: derivePresentationOutputMeaningProjectionV001(meaningPackage),
  };
  const validation = validatePresentationOutputRenderPlanV001(plan, {
    requestId: request.requestId,
    meaningPackage,
  });
  return validation.status === 'passed'
    ? {status: 'built', plan}
    : validation;
}

/** Native page一件を共通描画core element一件へ直接写す。旧B4 objectは作らない。 */
export function buildPresentationOutputCommonCorePlanV001({renderPlan, layoutContext}) {
  const validation = validatePresentationOutputRenderPlanV001(renderPlan);
  if (validation.status !== 'passed') return validation;
  const elements = [];
  for (const display of renderPlan.captionDisplays) {
    for (const page of display.pages) {
      const explicit = indexExplicitLinesV001(page.lines.map(line => line.text));
      if (explicit.status !== 'passed' || explicit.sourceText !== page.text) {
        return {status: 'rejected', violations: [{
          code: 'COMMON_RENDER_PLAN_INVALID', path: `/captionDisplays/${display.ordinal - 1}`,
          relatedIds: [page.pageId],
        }]};
      }
      const indexedLines = explicit.indexedLines.map((line, index) => ({
        ...line,
        atomRefs: structuredClone(page.lines[index].atomRefs),
        logicalWidth: page.lines[index].logicalWidth,
      }));
      elements.push({
        instructionId: page.pageId,
        kind: 'speech-caption',
        text: page.text,
        indexedLines,
        sourceStartMs: page.sourceStartMs,
        sourceEndMs: page.sourceEndMs,
        startFrame: page.startFrame,
        endFrameExclusive: page.endFrameExclusive,
        displayFrameCount: page.displayFrameCount,
        requestedPresetId: renderPlan.resolvedStyle.presetId,
        appliedPresetId: renderPlan.resolvedStyle.presetId,
        presetId: renderPlan.resolvedStyle.presetId,
        registryVersion: layoutContext.presetRegistryVersion,
        presetRegistryVersion: layoutContext.presetRegistryVersion,
        stateId: renderPlan.resolvedStyle.visualStateId,
        visualState: structuredClone(layoutContext.visualState),
        transition: structuredClone(layoutContext.transition),
        timelineSegmentId: page.timelineSegmentId,
        targetProvenance: {
          targetRefId: display.semanticCaptionId,
          targetType: 'semantic-caption',
          sourceAtomIds: page.atomRefs.map(ref => ref.atomId),
          lineAtomIds: page.lines.map(line => line.atomRefs.map(ref => ref.atomId)),
        },
        materialRefs: [],
      });
    }
  }
  return {
    status: 'built',
    plan: {
      schemaVersion: 'presentation-output-common-core-plan-v001',
      format: renderPlan.resolvedStyle.format,
      canvas: structuredClone(layoutContext.canvas),
      layoutRules: structuredClone(layoutContext.layoutRules),
      elements,
    },
  };
}

export function buildPresentationOutputRenderApplicationResultsV001({
  outputId,
  outputRequestBinding,
  renderPlanBinding,
  presetRegistryBinding,
  renderPlan,
  overlayRecords,
  presetRegistryVersion,
  overlaysDirectory,
}) {
  const pages = renderPlan.captionDisplays.flatMap(display => display.pages);
  if (!dense(overlayRecords) || overlayRecords.length !== pages.length) {
    throw new TypeError('overlay records do not match native display pages');
  }
  if (!nonempty(presetRegistryVersion)) {
    throw new TypeError('preset registry version is required');
  }
  if (!WORKSPACE_PATH.test(overlaysDirectory)) {
    throw new TypeError('overlay output directory is unsafe');
  }
  const finalElements = [];
  const applicationResults = {
    schemaVersion: PRESENTATION_OUTPUT_RENDER_APPLICATION_RESULTS_SCHEMA_V001,
    applicationId: `${outputId}-application-results`,
    outputRequestBinding,
    renderPlanBinding,
    presetRegistryBinding: structuredClone(presetRegistryBinding),
    results: overlayRecords.map((record, index) => {
      const page = pages[index];
      if (record.element?.instructionId !== page.pageId || !SHA256.test(record.pngSha256)) {
        throw new TypeError('overlay record differs from native display page');
      }
      const expectedFinalElement = {
        ...record.element,
        overlaySha256: record.pngSha256,
      };
      if (!isFiniteJsonValue(record.props)
        || !isObject(record.finalElement)
        || !isFiniteJsonValue(record.finalElement)
        || !same(record.finalElement, expectedFinalElement)
        || !finalElementMatchesPage(
          record.finalElement,
          page,
          renderPlan.resolvedStyle,
          record.pngSha256,
          presetRegistryVersion,
        )) {
        throw new TypeError('final overlay element is required and must match native display page');
      }
      finalElements.push(record.finalElement);
      return {
        pageId: page.pageId,
        status: 'rendered',
        appliedPresetId: renderPlan.resolvedStyle.presetId,
        appliedPresetRegistryVersion: presetRegistryVersion,
        visualStateId: renderPlan.resolvedStyle.visualStateId,
        appliedOverlayPropsCanonicalSha256:
          canonicalSha256OutputJson(record.props),
        overlay: {
          path: path.posix.join(overlaysDirectory, path.basename(record.pngPath)),
          fileSha256: record.pngSha256,
        },
        finalPlanElementCanonicalSha256:
          canonicalSha256OutputJson(record.finalElement),
        sourceFrameInterval: {
          startFrame: page.startFrame,
          endFrameExclusive: page.endFrameExclusive,
          displayFrameCount: page.displayFrameCount,
        },
      };
    }),
  };
  if (validatePresentationOutputRenderApplicationResultsV001(applicationResults, {
    outputId,
    renderPlan,
    finalElements,
    presetRegistryVersion,
  }).status !== 'passed') {
    throw new TypeError('render application results postcondition failed');
  }
  return applicationResults;
}

export function validatePresentationOutputRenderApplicationResultsV001(value, context = {}) {
  const derivedOutputId = outputIdFromDerivedId(value?.applicationId, '-application-results');
  const valid = exactKeys(value, [
    'schemaVersion', 'applicationId', 'outputRequestBinding', 'renderPlanBinding',
    'presetRegistryBinding', 'results',
  ])
    && value.schemaVersion === PRESENTATION_OUTPUT_RENDER_APPLICATION_RESULTS_SCHEMA_V001
    && derivedOutputId !== null
    && isJsonBinding(value.outputRequestBinding)
    && isJsonBinding(value.renderPlanBinding)
    && isJsonBinding(value.presetRegistryBinding)
    && dense(value.results)
    && value.results.length > 0
    && value.results.every(result => exactKeys(result, [
      'pageId', 'status', 'appliedPresetId', 'appliedPresetRegistryVersion',
      'visualStateId', 'appliedOverlayPropsCanonicalSha256', 'overlay',
      'finalPlanElementCanonicalSha256', 'sourceFrameInterval',
    ])
      && FORMAL_ID.test(result.pageId)
      && result.status === 'rendered'
      && FORMAL_ID.test(result.appliedPresetId)
      && nonempty(result.appliedPresetRegistryVersion)
      && FORMAL_ID.test(result.visualStateId)
      && SHA256.test(result.appliedOverlayPropsCanonicalSha256)
      && isMediaBinding(result.overlay)
      && SHA256.test(result.finalPlanElementCanonicalSha256)
      && exactKeys(result.sourceFrameInterval, [
        'startFrame', 'endFrameExclusive', 'displayFrameCount',
      ])
      && nonnegative(result.sourceFrameInterval.startFrame)
      && positive(result.sourceFrameInterval.endFrameExclusive)
      && result.sourceFrameInterval.displayFrameCount
        === result.sourceFrameInterval.endFrameExclusive
          - result.sourceFrameInterval.startFrame);
  if (!valid) return {status: 'rejected'};
  if (context.outputId !== undefined
    && (!FORMAL_ID.test(context.outputId) || context.outputId !== derivedOutputId)) {
    return {status: 'rejected'};
  }
  if (context.renderPlan !== undefined) {
    if (validatePresentationOutputRenderPlanV001(context.renderPlan).status !== 'passed') {
      return {status: 'rejected'};
    }
    const pages = context.renderPlan.captionDisplays.flatMap(display => display.pages);
    if (pages.length !== value.results.length) return {status: 'rejected'};
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const result = value.results[index];
      if (result.pageId !== page.pageId
        || result.appliedPresetId !== context.renderPlan.resolvedStyle.presetId
        || result.visualStateId !== context.renderPlan.resolvedStyle.visualStateId
        || !same(result.sourceFrameInterval, {
          startFrame: page.startFrame,
          endFrameExclusive: page.endFrameExclusive,
          displayFrameCount: page.displayFrameCount,
        })) return {status: 'rejected'};
    }
  }
  if (context.presetRegistryVersion !== undefined
    && (!nonempty(context.presetRegistryVersion)
      || value.results.some(result => result.appliedPresetRegistryVersion
        !== context.presetRegistryVersion))) return {status: 'rejected'};
  if (context.finalElements !== undefined) {
    if (!context.renderPlan || !dense(context.finalElements)
      || context.finalElements.length !== value.results.length) return {status: 'rejected'};
    const pages = context.renderPlan.captionDisplays.flatMap(display => display.pages);
    for (let index = 0; index < context.finalElements.length; index += 1) {
      const element = context.finalElements[index];
      const result = value.results[index];
      if (!isFiniteJsonValue(element) || !finalElementMatchesPage(
        element,
        pages[index],
        context.renderPlan.resolvedStyle,
        result.overlay.fileSha256,
        context.presetRegistryVersion,
      ) || canonicalSha256OutputJson(element)
        !== result.finalPlanElementCanonicalSha256) return {status: 'rejected'};
    }
  }
  return {status: 'passed'};
}

export function buildPresentationOutputRenderQcV001({
  outputId,
  renderPlanBinding,
  applicationResultsBinding,
  videoBinding,
  outputMedia,
  sampleCount,
  rendererQc,
}) {
  if (!positive(sampleCount)
    || !SHA256.test(outputMedia?.audio?.packetPayloadSha256)
    || !isRendererQc(rendererQc)) {
    throw new TypeError('renderer QC input is invalid');
  }
  const qc = {
    schemaVersion: PRESENTATION_OUTPUT_RENDER_QC_SCHEMA_V001,
    receiptId: `${outputId}-qc`,
    status: 'passed',
    renderPlanBinding,
    applicationResultsBinding,
    outputMedia: {
      video: videoBinding,
      width: outputMedia.video.width,
      height: outputMedia.video.height,
      frameCount: outputMedia.video.frameCount,
      sampleCount,
      audioPacketPayloadSha256: outputMedia.audio.packetPayloadSha256,
    },
    rendererQc,
  };
  if (validatePresentationOutputRenderQcV001(qc, {outputId}).status !== 'passed') {
    throw new TypeError('render QC postcondition failed');
  }
  return qc;
}

export function validatePresentationOutputRenderQcV001(value, context = {}) {
  const derivedOutputId = outputIdFromDerivedId(value?.receiptId, '-qc');
  const valid = exactKeys(value, [
    'schemaVersion', 'receiptId', 'status', 'renderPlanBinding',
    'applicationResultsBinding', 'outputMedia', 'rendererQc',
  ])
    && value.schemaVersion === PRESENTATION_OUTPUT_RENDER_QC_SCHEMA_V001
    && derivedOutputId !== null
    && value.status === 'passed'
    && isJsonBinding(value.renderPlanBinding)
    && isJsonBinding(value.applicationResultsBinding)
    && exactKeys(value.outputMedia, [
      'video', 'width', 'height', 'frameCount', 'sampleCount',
      'audioPacketPayloadSha256',
    ])
    && isMediaBinding(value.outputMedia.video)
    && positive(value.outputMedia.width) && positive(value.outputMedia.height)
    && positive(value.outputMedia.frameCount) && positive(value.outputMedia.sampleCount)
    && SHA256.test(value.outputMedia.audioPacketPayloadSha256)
    && isRendererQc(value.rendererQc);
  if (!valid) return {status: 'rejected'};
  if (context.outputId !== undefined
    && (!FORMAL_ID.test(context.outputId) || context.outputId !== derivedOutputId)) {
    return {status: 'rejected'};
  }
  if (context.rendererQc !== undefined && !same(value.rendererQc, context.rendererQc)) {
    return {status: 'rejected'};
  }
  return {status: 'passed'};
}

export function buildPresentationOutputRenderManifestV001({
  outputId,
  formalOutputJobBinding,
  outputRequestBinding,
  acceptanceReportBinding,
  renderPlanBinding,
  meaningPackageBinding,
  baseMediaBinding,
  resolvedStyle,
  applicationResultsBinding,
  qcBinding,
  runtimeProfile,
  implementationBindings,
}) {
  const manifest = {
    schemaVersion: PRESENTATION_OUTPUT_RENDER_MANIFEST_SCHEMA_V001,
    manifestId: `${outputId}-render-manifest`,
    status: 'passed',
    formalOutputJobBinding,
    outputRequestBinding,
    acceptanceReportBinding,
    renderPlanBinding,
    meaningPackageBinding: structuredClone(meaningPackageBinding),
    baseMediaBinding: structuredClone(baseMediaBinding),
    resolvedStyle,
    applicationResultsBinding,
    qcBinding,
    runtimeProfile,
    implementationBindings,
  };
  if (validatePresentationOutputRenderManifestV001(manifest, {
    outputId,
    formalJob: {runtimeProfile, implementationBindings},
  }).status !== 'passed') {
    throw new TypeError('render manifest postcondition failed');
  }
  return manifest;
}

export function validatePresentationOutputRenderManifestV001(value, context = {}) {
  const derivedOutputId = outputIdFromDerivedId(value?.manifestId, '-render-manifest');
  const valid = exactKeys(value, [
    'schemaVersion', 'manifestId', 'status', 'formalOutputJobBinding',
    'outputRequestBinding', 'acceptanceReportBinding', 'renderPlanBinding',
    'meaningPackageBinding', 'baseMediaBinding', 'resolvedStyle',
    'applicationResultsBinding', 'qcBinding', 'runtimeProfile',
    'implementationBindings',
  ])
    && value.schemaVersion === PRESENTATION_OUTPUT_RENDER_MANIFEST_SCHEMA_V001
    && derivedOutputId !== null && value.status === 'passed'
    && isJsonBinding(value.formalOutputJobBinding)
    && isJsonBinding(value.outputRequestBinding)
    && isJsonBinding(value.acceptanceReportBinding)
    && isJsonBinding(value.renderPlanBinding)
    && isJsonBinding(value.meaningPackageBinding)
    && exactKeys(value.baseMediaBinding, [
      'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
    ])
    && isMediaBinding(value.baseMediaBinding.baseMedia)
    && isJsonBinding(value.baseMediaBinding.timeline)
    && value.baseMediaBinding.timeline.schemaVersion === 'presentation-base-media-timeline-v002'
    && isJsonBinding(value.baseMediaBinding.generationManifest)
    && value.baseMediaBinding.generationManifest.schemaVersion
      === 'presentation-output-base-media-generation-manifest-v001'
    && isJsonBinding(value.baseMediaBinding.validationReceipt)
    && value.baseMediaBinding.validationReceipt.schemaVersion
      === 'presentation-output-base-media-validation-receipt-v001'
    && isResolvedStyle(value.resolvedStyle)
    && isJsonBinding(value.applicationResultsBinding)
    && isJsonBinding(value.qcBinding)
    && isObject(value.runtimeProfile)
    && dense(value.implementationBindings)
    && value.implementationBindings.every(isImplementationBinding);
  if (!valid) return {status: 'rejected'};
  if (context.outputId !== undefined
    && (!FORMAL_ID.test(context.outputId) || context.outputId !== derivedOutputId)) {
    return {status: 'rejected'};
  }
  if (context.formalJob !== undefined
    && (!isObject(context.formalJob)
      || !same(value.runtimeProfile, context.formalJob.runtimeProfile)
      || !same(value.implementationBindings, context.formalJob.implementationBindings))) {
    return {status: 'rejected'};
  }
  return {status: 'passed'};
}

export function buildPresentationOutputRenderFailureReportV001({
  outputId,
  formalJobFileSha256,
  status,
  stage,
  formalOutputJobBinding,
  outputRequestBinding,
  acceptanceReportBinding,
  renderPlanBinding,
  failureObservation,
  retainedSafetyArtifacts = [],
}) {
  return {
    schemaVersion: PRESENTATION_OUTPUT_RENDER_FAILURE_REPORT_SCHEMA_V001,
    failureId: `${outputId}-render-failure-${formalJobFileSha256.slice(0, 32)}`,
    status,
    stage,
    formalOutputJobBinding,
    outputRequestBinding,
    acceptanceReportBinding,
    renderPlanBinding,
    failureObservation,
    retainedSafetyArtifacts,
  };
}

const escapeJsonPointerSegment = value => value.replaceAll('~', '~0').replaceAll('/', '~1');

/**
 * 既存common rendererが返す限定JSONPathを正式reportのRFC 6901 pointerへ写す。
 * 対応外の構文を推測で変換せずnullにする。
 */
export function projectPresentationOutputRendererViolationPathV001(value) {
  if (typeof value !== 'string' || !value.startsWith('$')) return null;
  if (value === '$') return '';
  const segments = [];
  let offset = 1;
  let first = true;
  while (offset < value.length) {
    const rest = value.slice(offset);
    const property = first
      ? /^(?:\.)?([A-Za-z_][A-Za-z0-9_-]*)/u.exec(rest)
      : /^\.([A-Za-z_][A-Za-z0-9_-]*)/u.exec(rest);
    if (property !== null) {
      segments.push(property[1]);
      offset += property[0].length;
      first = false;
      continue;
    }
    const bracket = /^\[(?:([0-9]+)|([A-Za-z_][A-Za-z0-9_-]*=[A-Za-z0-9._:-]+))\]/u
      .exec(rest);
    if (bracket !== null) {
      segments.push(bracket[1] ?? bracket[2]);
      offset += bracket[0].length;
      first = false;
      continue;
    }
    return null;
  }
  const pointer = `/${segments.map(escapeJsonPointerSegment).join('/')}`;
  return JSON_POINTER.test(pointer) ? pointer : null;
}

/**
 * common rendererの生違反を正式report用exact 3 keyへ一度だけ投影する。
 */
export function projectPresentationOutputRendererViolationsV001({
  violations,
  rendererCodes,
}) {
  if (!dense(rendererCodes)
    || rendererCodes.some(code => typeof code !== 'string')
    || new Set(rendererCodes).size !== rendererCodes.length
    || !dense(violations)) return {status: 'rejected', violations: []};
  const order = new Map(rendererCodes.map((code, index) => [code, index]));
  const pathlessQcCodes = new Set(PRESENTATION_RENDERER_QC_VIOLATION_CODES);
  const projected = [];
  for (const violation of violations) {
    if (!isObject(violation)) return {status: 'rejected', violations: []};
    const keys = Object.keys(violation);
    const pathful = (keys.length === 3 || keys.length === 4)
      && keys[0] === 'code'
      && keys[1] === 'path'
      && keys[2] === 'relatedIds'
      && (keys.length === 3 || keys[3] === 'details');
    const pathlessQc = (keys.length === 2 || keys.length === 3)
      && keys[0] === 'code'
      && keys[1] === 'relatedIds'
      && (keys.length === 2 || keys[2] === 'details')
      && pathlessQcCodes.has(violation.code);
    if ((!pathful && !pathlessQc)
      || !order.has(violation.code)
      || !dense(violation.relatedIds)
      || violation.relatedIds.some(id => typeof id !== 'string')) {
      return {status: 'rejected', violations: []};
    }
    const pointer = pathlessQc
      ? ''
      : projectPresentationOutputRendererViolationPathV001(violation.path);
    if (pointer === null) return {status: 'rejected', violations: []};
    const relatedIds = [...new Set(violation.relatedIds)].sort(compareUtf8);
    projected.push({code: violation.code, path: pointer, relatedIds});
  }
  projected.sort((left, right) => (
    order.get(left.code) - order.get(right.code)
    || compareUtf8(left.path, right.path)
    || compareUtf8(left.relatedIds.join('\u0000'), right.relatedIds.join('\u0000'))
  ));
  const codePaths = projected.map(item => `${item.code}\u0000${item.path}`);
  if (new Set(codePaths).size !== codePaths.length) {
    return {status: 'rejected', violations: []};
  }
  return {status: 'passed', violations: projected};
}

export function validatePresentationOutputRenderFailureReportV001(value, context = {}) {
  if (!exactKeys(context, [
    'rendererCodes', 'outputId', 'formalJobFileSha256',
    'formalOutputJobBinding', 'outputRequestBinding',
    'acceptanceReportBinding', 'renderPlanBinding', 'retainedSafetyArtifacts',
  ])
    || !dense(context.rendererCodes)
    || context.rendererCodes.some(code => typeof code !== 'string')
    || new Set(context.rendererCodes).size !== context.rendererCodes.length
    || !FORMAL_ID.test(context.outputId)
    || !SHA256.test(context.formalJobFileSha256)
    || !isJsonBinding(context.formalOutputJobBinding)
    || !isJsonBinding(context.outputRequestBinding)
    || !isJsonBinding(context.acceptanceReportBinding)
    || !isJsonBinding(context.renderPlanBinding)
    || !dense(context.retainedSafetyArtifacts)) return {status: 'rejected'};
  const rendererCodes = context.rendererCodes;
  const knownRendererCodes = new Set(rendererCodes);
  let valid = exactKeys(value, [
    'schemaVersion', 'failureId', 'status', 'stage', 'formalOutputJobBinding',
    'outputRequestBinding', 'acceptanceReportBinding', 'renderPlanBinding',
    'failureObservation', 'retainedSafetyArtifacts',
  ])
    && value.schemaVersion === PRESENTATION_OUTPUT_RENDER_FAILURE_REPORT_SCHEMA_V001
    && value.failureId
      === `${context.outputId}-render-failure-${context.formalJobFileSha256.slice(0, 32)}`
    && ['rejected', 'fatal'].includes(value.status)
    && PRESENTATION_OUTPUT_RENDER_FAILURE_STAGES_V001.includes(value.stage)
    && isJsonBinding(value.formalOutputJobBinding)
    && isJsonBinding(value.outputRequestBinding)
    && isJsonBinding(value.acceptanceReportBinding)
    && isJsonBinding(value.renderPlanBinding)
    && exactKeys(value.failureObservation, [
      'source', 'coreStage', 'violations', 'diagnosticCode',
    ])
    && ['common-draw-core', 'output-artifact-validator', 'atomic-publication']
      .includes(value.failureObservation.source)
    && (value.failureObservation.coreStage === null
      || PRESENTATION_OUTPUT_RENDER_FAILURE_STAGES_V001
        .includes(value.failureObservation.coreStage))
    && dense(value.failureObservation.violations)
    && value.failureObservation.violations.every(violation => (
      exactKeys(violation, ['code', 'path', 'relatedIds'])
      && knownRendererCodes.has(violation.code)
      && typeof violation.path === 'string' && JSON_POINTER.test(violation.path)
      && sortedUniqueStrings(violation.relatedIds)
    ))
    && PRESENTATION_OUTPUT_RENDER_DIAGNOSTIC_CODES_V001
      .includes(value.failureObservation.diagnosticCode)
    && dense(value.retainedSafetyArtifacts)
    && value.retainedSafetyArtifacts.every(item => exactKeys(item, ['code', 'path'])
      && [
        'RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY',
        'RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY',
      ].includes(item.code)
      && typeof item.path === 'string' && WORKSPACE_PATH.test(item.path));
  if (!valid) return {status: 'rejected'};
  if (!same(value.formalOutputJobBinding, context.formalOutputJobBinding)
    || !same(value.outputRequestBinding, context.outputRequestBinding)
    || !same(value.acceptanceReportBinding, context.acceptanceReportBinding)
    || !same(value.renderPlanBinding, context.renderPlanBinding)
    || !same(value.retainedSafetyArtifacts, context.retainedSafetyArtifacts)) {
    return {status: 'rejected'};
  }
  const safetyOrder = new Map([
    ['RENDER_OUTPUT_LOCK_RETAINED_FOR_SAFETY', 0],
    ['RENDER_OUTPUT_WORK_RETAINED_FOR_SAFETY', 1],
  ]);
  if (new Set(value.retainedSafetyArtifacts.map(item => `${item.code}\u0000${item.path}`)).size
      !== value.retainedSafetyArtifacts.length
    || value.retainedSafetyArtifacts.some((item, index) => index > 0
      && safetyOrder.get(value.retainedSafetyArtifacts[index - 1].code)
        >= safetyOrder.get(item.code))) return {status: 'rejected'};
  const observation = value.failureObservation;
  const expected = observation.source === 'common-draw-core'
    ? (value.status === 'rejected'
      ? {
        diagnosticCode: 'OUTPUT_RENDER_CORE_CONTRACT_FAILED',
        stage: observation.coreStage,
        requiresViolations: true,
      }
      : {
        diagnosticCode: 'OUTPUT_RENDER_CORE_PROCESS_FAILED',
        stage: observation.coreStage,
        requiresViolations: false,
      })
    : observation.source === 'output-artifact-validator'
      ? {
        diagnosticCode: 'OUTPUT_RENDER_STAGED_ARTIFACT_INVALID',
        stage: 'staged-artifact-validation',
        requiresViolations: false,
      }
      : {
        diagnosticCode: 'OUTPUT_RENDER_PUBLICATION_FAILED',
        stage: 'publication',
        requiresViolations: false,
      };
  valid = value.stage === expected.stage
    && observation.diagnosticCode === expected.diagnosticCode
    && (observation.source === 'common-draw-core'
      ? observation.coreStage !== null
      : observation.coreStage === null)
    && (expected.requiresViolations
      ? observation.violations.length > 0
      : observation.violations.length === 0)
    && (expected.requiresViolations ? value.status === 'rejected' : value.status === 'fatal')
    && new Set(observation.violations.map(item => `${item.code}\u0000${item.path}`)).size
      === observation.violations.length
    && observation.violations.every((violation, index) => {
      if (index === 0) return true;
      const previous = observation.violations[index - 1];
      const codeDifference = rendererCodes.indexOf(previous.code)
        - rendererCodes.indexOf(violation.code);
      return codeDifference < 0 || (codeDifference === 0
        && (compareUtf8(previous.path, violation.path) < 0
          || (previous.path === violation.path
            && compareUtf8(
              previous.relatedIds.join('\u0000'),
              violation.relatedIds.join('\u0000'),
            ) < 0)));
    });
  return {status: valid ? 'passed' : 'rejected'};
}

export const serializePresentationOutputRenderJsonV001 = value => {
  if (!isFiniteJsonValue(value)) throw new TypeError('output formal JSON value is invalid');
  return serializePresentationCaptionReport(value);
};
