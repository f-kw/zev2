import {
  buildPresentationOutputCaptionCueProjectionSetV001,
  buildPresentationOutputCaptionCueSourceClosureV001,
} from './presentation_output_caption_cue_selection_v001.mjs';

const PRESENTATION_OUTPUT_PAGE_LINE_PLAN_SCHEMA_V003 =
  'presentation-output-page-line-plan-v003';

const PRESENTATION_OUTPUT_PAGE_LINE_PLANNER_CODES_V003 = Object.freeze([
  'CUE_PLANNER_INPUT_INVALID',
  'CUE_PLANNER_BINDING_MISMATCH',
  'CUE_RECONSTRUCTION_FAILED',
  'CUE_SELECTED_EDGE_NOT_FOUND',
  'CUE_PLANNER_PHYSICAL_INVALID',
  'CUE_PLANNER_TIMELINE_INVALID',
  'CUE_PLANNER_OVERLAP_INVALID',
]);

const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && value.every((_, index) => Object.hasOwn(value, index));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const nonempty = value => typeof value === 'string' && value.length > 0;

const formalBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && nonempty(value.schemaVersion) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256) && SHA256.test(value.canonicalSha256);

const violation = (code, path, relatedPaths = []) => Object.freeze({
  code,
  path,
  relatedPaths: Object.freeze([...new Set(relatedPaths)].sort()),
});

const rejected = (primaryCode, path, relatedPaths = []) => Object.freeze({
  status: 'rejected',
  primaryCode,
  violations: Object.freeze([violation(primaryCode, path, relatedPaths)]),
});

const validRetainedSpan = value => exactKeys(value, [
  'timelineSegmentId', 'sourceStartMs', 'sourceEndMs',
]) && nonempty(value.timelineSegmentId)
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const validFrameMapping = value => exactKeys(value, [
  'timelineSegmentId', 'sourceStartMs', 'sourceEndMs',
  'sourceStartFrame30', 'sourceEndFrame30', 'startFrame',
  'endFrameExclusive', 'displayFrameCount',
]) && nonempty(value.timelineSegmentId)
  && nonnegative(value.sourceStartMs) && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs
  && nonnegative(value.sourceStartFrame30) && positive(value.sourceEndFrame30)
  && value.sourceStartFrame30 < value.sourceEndFrame30
  && nonnegative(value.startFrame) && positive(value.endFrameExclusive)
  && value.startFrame < value.endFrameExclusive
  && value.displayFrameCount === value.endFrameExclusive - value.startFrame;

const validResolvedStyle = value => exactKeys(value, [
  'format', 'screenLayoutId', 'presetId', 'visualStateId',
  'maxLogicalWidthPerLine', 'maxLinesPerDisplayPage', 'characterWidthRule',
  'cropMode', 'sceneTransitionMode', 'audioMode',
]) && nonempty(value.format)
  && (value.screenLayoutId === null || nonempty(value.screenLayoutId))
  && nonempty(value.presetId) && nonempty(value.visualStateId)
  && positive(value.maxLogicalWidthPerLine)
  && [1, 2].includes(value.maxLinesPerDisplayPage)
  && nonempty(value.characterWidthRule)
  && nonempty(value.cropMode)
  && nonempty(value.sceneTransitionMode)
  && nonempty(value.audioMode);

const validLine = value => exactKeys(value, [
  'lineId', 'lineOrdinal', 'atomOccurrenceIds', 'text', 'logicalWidth',
]) && nonempty(value.lineId) && positive(value.lineOrdinal)
  && dense(value.atomOccurrenceIds) && value.atomOccurrenceIds.length > 0
  && value.atomOccurrenceIds.every(nonempty)
  && nonempty(value.text) && positive(value.logicalWidth);

const validCue = value => exactKeys(value, [
  'cueId', 'cueOrdinal', 'cueEndBoundaryId', 'lineEndBoundaryIds',
  'atomOccurrenceIds', 'text', 'retainedSpans', 'sourceSpanEnvelopes',
  'frameMappings', 'startFrame', 'endFrameExclusive', 'displayFrameCount', 'lines',
]) && nonempty(value.cueId) && positive(value.cueOrdinal)
  && nonempty(value.cueEndBoundaryId)
  && dense(value.lineEndBoundaryIds) && value.lineEndBoundaryIds.length >= 1
  && value.lineEndBoundaryIds.length <= 2 && value.lineEndBoundaryIds.every(nonempty)
  && dense(value.atomOccurrenceIds) && value.atomOccurrenceIds.length > 0
  && value.atomOccurrenceIds.every(nonempty) && nonempty(value.text)
  && dense(value.retainedSpans) && value.retainedSpans.length > 0
  && value.retainedSpans.every(validRetainedSpan)
  && dense(value.sourceSpanEnvelopes) && value.sourceSpanEnvelopes.length > 0
  && value.sourceSpanEnvelopes.every(validRetainedSpan)
  && dense(value.frameMappings) && value.frameMappings.length > 0
  && value.frameMappings.every(validFrameMapping)
  && nonnegative(value.startFrame) && positive(value.endFrameExclusive)
  && value.startFrame < value.endFrameExclusive
  && value.displayFrameCount === value.endFrameExclusive - value.startFrame
  && dense(value.lines) && value.lines.length === value.lineEndBoundaryIds.length
  && value.lines.every(validLine);

const validDisplay = value => exactKeys(value, [
  'displayCaptionId', 'inputCaptionId', 'semanticCaptionId', 'ordinal', 'cues',
]) && nonempty(value.displayCaptionId)
  && nonempty(value.inputCaptionId) && nonempty(value.semanticCaptionId)
  && positive(value.ordinal) && dense(value.cues) && value.cues.length > 0
  && value.cues.every(validCue);

export function validatePresentationOutputPageLinePlanV003(value) {
  const fail = pointer => Object.freeze({
    status: 'rejected',
    violations: Object.freeze([violation('CUE_PLANNER_INPUT_INVALID', pointer)]),
  });
  if (!exactKeys(value, [
    'schemaVersion', 'planId', 'sourcePackageBinding', 'selectionBinding',
    'selectionReportBinding', 'meaningPackageBinding', 'resolvedStyle',
    'captionDisplays',
  ]) || value.schemaVersion !== PRESENTATION_OUTPUT_PAGE_LINE_PLAN_SCHEMA_V003
    || !nonempty(value.planId)
    || !formalBinding(value.sourcePackageBinding)
    || !formalBinding(value.selectionBinding)
    || !formalBinding(value.selectionReportBinding)
    || !formalBinding(value.meaningPackageBinding)
    || !validResolvedStyle(value.resolvedStyle)
    || !dense(value.captionDisplays) || value.captionDisplays.length !== 1
    || !value.captionDisplays.every(validDisplay)) return fail('/');
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

export function decodePresentationOutputPageLinePlanV003(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  try {
    const text = bytes.toString('utf8');
    if (!text.startsWith('{') || !text.endsWith('}\n')
      || Buffer.byteLength(text, 'utf8') !== bytes.length) {
      return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
    }
    const value = JSON.parse(text);
    if (!formalBytes(value).equals(bytes)) {
      return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
    }
    return validatePresentationOutputPageLinePlanV003(value).status === 'passed'
      ? Object.freeze({status: 'decoded', value})
      : Object.freeze({status: 'rejected', reason: 'schema-invalid'});
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
}

const DEPENDENCY_KEYS = Object.freeze([
  'resolveStyle', 'validateResolvedStyle', 'buildPhysicalPageGraph',
  'mapPiecewiseTimeline', 'canonicalSha256MeaningJson',
  'canonicalSha256FiniteJson', 'serializeFiniteJson', 'hashBytes',
]);

const mapProjectionFailure = failure => {
  const mapping = {
    'meaning-case-binding': 'CUE_PLANNER_BINDING_MISMATCH',
    'style-base-case-binding': 'CUE_PLANNER_BINDING_MISMATCH',
    'reconstruction-invalid': 'CUE_RECONSTRUCTION_FAILED',
    'selected-edge-not-found': 'CUE_SELECTED_EDGE_NOT_FOUND',
    'style-resolution': 'CUE_PLANNER_PHYSICAL_INVALID',
    'physical-invalid': 'CUE_PLANNER_PHYSICAL_INVALID',
    'timeline-invalid': 'CUE_PLANNER_TIMELINE_INVALID',
    'overlap-invalid': 'CUE_PLANNER_OVERLAP_INVALID',
  };
  const code = mapping[failure?.failedProjectionClass];
  if (code === undefined || !isObject(failure.failureDetail)
    || typeof failure.failureDetail.violationPath !== 'string') return null;
  return rejected(code, failure.failureDetail.violationPath);
};

const projectionMismatch = (actual, expected, basePath) => {
  if (!isObject(actual) || !isObject(expected)) return basePath;
  if (Object.keys(actual).length !== Object.keys(expected).length) return basePath;
  const keys = Object.keys(expected);
  for (const key of keys) if (!same(actual[key], expected[key])) return `${basePath}/${key}`;
  return null;
};

export async function buildPresentationOutputPageLinePlanV003(input) {
  if (!exactKeys(input, [
    'sourcePackage', 'selection', 'selectionReport', 'selectionReportBinding',
    'caseInputResult', 'caseId', 'proofJobId', 'projectionDependencies',
  ]) || !nonempty(input.caseId) || !nonempty(input.proofJobId)
    || !formalBinding(input.selectionReportBinding)
    || !exactKeys(input.projectionDependencies, DEPENDENCY_KEYS)
    || !DEPENDENCY_KEYS.every(key => typeof input.projectionDependencies[key] === 'function')) {
    return rejected('CUE_PLANNER_INPUT_INVALID', '/');
  }
  const {
    sourcePackage, selection, selectionReport, selectionReportBinding,
    caseInputResult, caseId, proofJobId, projectionDependencies,
  } = input;
  if (sourcePackage?.schemaVersion !== 'presentation-output-caption-cue-source-package-v001'
    || selection?.schemaVersion !== 'presentation-output-caption-cue-selection-v001'
    || selectionReport?.schemaVersion !== 'presentation-output-caption-cue-selection-report-v001'
    || selectionReport.status !== 'passed'
    || !formalBinding(selection.sourcePackageBinding)
    || !formalBinding(selectionReport.selectionBinding)
    || !same(selectionReport.sourcePackageBinding, selection.sourcePackageBinding)
    || !same(selectionReport.selectionBinding.schemaVersion,
      'presentation-output-caption-cue-selection-v001')
    || !same(selectionReport.selectionProjection?.captionCount,
      sourcePackage.reconstructionMap?.caseContexts?.length)
    || !dense(selectionReport.captionProjection)) {
    return rejected('CUE_PLANNER_BINDING_MISMATCH', '/selectionReport');
  }
  if (!isObject(caseInputResult) || caseInputResult.status !== 'passed'
    || !dense(caseInputResult.validatedMeaningCases)
    || !dense(caseInputResult.caseInputs)) {
    return rejected('CUE_PLANNER_INPUT_INVALID', '/caseInputResult');
  }
  let sourceClosureResult;
  try {
    sourceClosureResult = buildPresentationOutputCaptionCueSourceClosureV001({
      sourcePackage,
      selection,
      validatedMeaningCases: caseInputResult.validatedMeaningCases,
    });
  } catch (cause) {
    throw cause;
  }
  if (sourceClosureResult?.status !== 'passed') {
    if (sourceClosureResult?.status !== 'rejected') throw new TypeError('source closure result is invalid');
    return rejected(
      sourceClosureResult.failedProjectionClass === 'meaning-case-binding'
        ? 'CUE_PLANNER_BINDING_MISMATCH' : 'CUE_RECONSTRUCTION_FAILED',
      sourceClosureResult.failureDetail?.violationPath ?? '/reconstructionMap',
    );
  }
  let projectionSet;
  try {
    projectionSet = await buildPresentationOutputCaptionCueProjectionSetV001({
      sourcePackage,
      selection,
      caseInputResult,
      sourceClosureResult,
      projectionDependencies,
    });
  } catch (cause) {
    throw cause;
  }
  if (projectionSet?.status !== 'passed') {
    if (projectionSet?.status === 'input-fatal') throw projectionSet;
    const mapped = mapProjectionFailure(projectionSet);
    if (mapped !== null) return mapped;
    throw new TypeError('projection set result is invalid');
  }
  const selectionMismatch = projectionMismatch(
    projectionSet.value.selectionProjection,
    selectionReport.selectionProjection,
    '/selectionProjection',
  );
  if (selectionMismatch !== null) {
    return rejected('CUE_PLANNER_BINDING_MISMATCH', selectionMismatch);
  }
  if (!same(projectionSet.value.captionProjection, selectionReport.captionProjection)) {
    const actual = projectionSet.value.captionProjection;
    const expected = selectionReport.captionProjection;
    const index = Math.min(actual.length, expected.length);
    const first = actual.length === expected.length
      ? actual.findIndex((item, itemIndex) => !same(item, expected[itemIndex]))
      : index;
    return rejected('CUE_PLANNER_BINDING_MISMATCH', `/captionProjection/${first}`);
  }
  const contexts = sourcePackage.reconstructionMap.caseContexts;
  const caseIndex = contexts.findIndex(context => context.caseId === caseId);
  if (caseIndex < 0 || contexts.filter(context => context.caseId === caseId).length !== 1) {
    return rejected('CUE_PLANNER_BINDING_MISMATCH', '/caseId');
  }
  const context = contexts[caseIndex];
  const caseInput = caseInputResult.caseInputs[caseIndex];
  const renderSupport = projectionSet.value.renderSupports[caseIndex];
  const display = projectionSet.value.captionDisplays.find(
    item => item.inputCaptionId === context.inputCaptionId,
  );
  if (!isObject(caseInput) || !isObject(renderSupport) || !isObject(display)
    || caseInput.caseId !== context.caseId
    || caseInput.inputCaptionId !== context.inputCaptionId
    || renderSupport.caseId !== context.caseId
    || renderSupport.inputCaptionId !== context.inputCaptionId
    || !same(caseInput.meaningPackageBinding, context.meaningPackageBinding)) {
    return rejected('CUE_PLANNER_BINDING_MISMATCH', `/reconstructionMap/caseContexts/${caseIndex}`);
  }
  const pageLinePlan = Object.freeze({
    schemaVersion: PRESENTATION_OUTPUT_PAGE_LINE_PLAN_SCHEMA_V003,
    planId: `${proofJobId}-${caseId}-page-line-v003`,
    sourcePackageBinding: clone(selection.sourcePackageBinding),
    selectionBinding: clone(selectionReport.selectionBinding),
    selectionReportBinding: clone(selectionReportBinding),
    meaningPackageBinding: clone(caseInput.meaningPackageBinding),
    resolvedStyle: clone(renderSupport.resolvedStyle),
    captionDisplays: Object.freeze([clone(display)]),
  });
  if (validatePresentationOutputPageLinePlanV003(pageLinePlan).status !== 'passed') {
    throw new TypeError('page line plan construction is invalid');
  }
  return Object.freeze({
    status: 'passed',
    value: Object.freeze({pageLinePlan, renderSupport: clone(renderSupport)}),
  });
}
