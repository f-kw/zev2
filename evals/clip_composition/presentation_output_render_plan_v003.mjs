const PRESENTATION_ZEVO_CAPTION_QUALITY_OUTPUT_REQUEST_SCHEMA_V001 =
  'presentation-zevo-caption-quality-v002-output-request-v001';
const PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V003 =
  'presentation-output-render-plan-v003';
const PRESENTATION_OUTPUT_COMMON_CORE_PLAN_SCHEMA_V003 =
  'presentation-output-common-core-plan-v003';

const PRESENTATION_OUTPUT_RENDER_CODES_V003 = Object.freeze([
  'CUE_RENDER_INPUT_INVALID',
  'CUE_RENDER_BINDING_MISMATCH',
  'CUE_RENDER_PROJECTION_INVALID',
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
const nonempty = value => typeof value === 'string' && value.length > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isSafeInteger(value) && value > 0;

const byteBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const formalBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && nonempty(value.schemaVersion) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256) && SHA256.test(value.canonicalSha256);
const validBaseMediaInput = value => exactKeys(value, [
  'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
]) && byteBinding(value.baseMedia)
  && formalBinding(value.timeline)
  && formalBinding(value.generationManifest)
  && formalBinding(value.validationReceipt);
const validStyleInput = value => exactKeys(value, [
  'format', 'screenLayoutId', 'presetBinding', 'captionLayoutPolicy',
  'cropPolicy', 'sceneTransitionPolicy', 'audioPolicy', 'materials',
]) && nonempty(value.format)
  && (value.screenLayoutId === null || nonempty(value.screenLayoutId))
  && isObject(value.presetBinding) && isObject(value.captionLayoutPolicy)
  && isObject(value.cropPolicy) && isObject(value.sceneTransitionPolicy)
  && isObject(value.audioPolicy) && dense(value.materials);

const violation = (code, path, relatedPaths = []) => Object.freeze({
  code, path, relatedPaths: Object.freeze([...new Set(relatedPaths)].sort()),
});
const rejected = (primaryCode, path) => Object.freeze({
  status: 'rejected',
  primaryCode,
  violations: Object.freeze([violation(primaryCode, path)]),
});

const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const decodeFormal = (bytes, validate) => {
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
    return validate(value).status === 'passed'
      ? Object.freeze({status: 'decoded', value})
      : Object.freeze({status: 'rejected', reason: 'schema-invalid'});
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
};

export function validatePresentationZevoCaptionQualityOutputRequestV001(value) {
  const fail = pointer => Object.freeze({
    status: 'rejected', violations: Object.freeze([
      violation('CUE_RENDER_INPUT_INVALID', pointer),
    ]),
  });
  if (!exactKeys(value, [
    'schemaVersion', 'requestId', 'caseId', 'inputCaptionId',
    'sourcePackageBinding', 'selectionBinding', 'selectionReportBinding',
    'meaningPackageBinding', 'baseMediaInput', 'styleInput', 'publication',
  ]) || value.schemaVersion !== PRESENTATION_ZEVO_CAPTION_QUALITY_OUTPUT_REQUEST_SCHEMA_V001
    || !nonempty(value.requestId) || !nonempty(value.caseId)
    || !nonempty(value.inputCaptionId)
    || !formalBinding(value.sourcePackageBinding)
    || !formalBinding(value.selectionBinding)
    || !formalBinding(value.selectionReportBinding)
    || !formalBinding(value.meaningPackageBinding)
    || !validBaseMediaInput(value.baseMediaInput)
    || !validStyleInput(value.styleInput)
    || !exactKeys(value.publication, ['outputId', 'renderOutputRoot'])
    || value.publication.outputId !== `${value.requestId}-output`
    || !WORKSPACE_PATH.test(value.publication.renderOutputRoot)) return fail('/');
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

export const decodePresentationZevoCaptionQualityOutputRequestV001 = bytes =>
  decodeFormal(bytes, validatePresentationZevoCaptionQualityOutputRequestV001);

const validMeaningProjection = value => exactKeys(value, [
  'timelineSegmentCount', 'atomOccurrenceCount', 'captionCount', 'titleState',
  'semanticObservationCount', 'captionTextSequenceCanonicalSha256',
  'atomOccurrenceSpanSequenceCanonicalSha256', 'timelineCompositionCanonicalSha256',
]) && nonnegative(value.timelineSegmentCount)
  && nonnegative(value.atomOccurrenceCount) && nonnegative(value.captionCount)
  && ['empty', 'provided'].includes(value.titleState)
  && nonnegative(value.semanticObservationCount)
  && SHA256.test(value.captionTextSequenceCanonicalSha256)
  && SHA256.test(value.atomOccurrenceSpanSequenceCanonicalSha256)
  && SHA256.test(value.timelineCompositionCanonicalSha256);

export function validatePresentationOutputRenderPlanV003(value) {
  const fail = pointer => Object.freeze({
    status: 'rejected', violations: Object.freeze([
      violation('CUE_RENDER_INPUT_INVALID', pointer),
    ]),
  });
  if (!exactKeys(value, [
    'schemaVersion', 'planId', 'outputRequestBinding', 'sourcePackageBinding',
    'selectionBinding', 'selectionReportBinding', 'meaningPackageBinding',
    'baseMediaBinding', 'resolvedStyle', 'captionDisplays', 'titleDisplay',
    'meaningProjection',
  ]) || value.schemaVersion !== PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V003
    || !nonempty(value.planId) || !formalBinding(value.outputRequestBinding)
    || !formalBinding(value.sourcePackageBinding)
    || !formalBinding(value.selectionBinding)
    || !formalBinding(value.selectionReportBinding)
    || !formalBinding(value.meaningPackageBinding)
    || !validBaseMediaInput(value.baseMediaBinding)
    || !isObject(value.resolvedStyle)
    || !dense(value.captionDisplays) || value.captionDisplays.length !== 1
    || !exactKeys(value.titleDisplay, ['status'])
    || value.titleDisplay.status !== 'not-requested'
    || !validMeaningProjection(value.meaningProjection)) return fail('/');
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

export const decodePresentationOutputRenderPlanV003 = bytes =>
  decodeFormal(bytes, validatePresentationOutputRenderPlanV003);

const dependencyShape = value => exactKeys(value, [
  'deriveMeaningProjection', 'buildCommonCoreElementProjection',
]) && typeof value.deriveMeaningProjection === 'function'
  && typeof value.buildCommonCoreElementProjection === 'function';

export function buildPresentationOutputRenderPlanV003(input) {
  if (!exactKeys(input, [
    'outputRequest', 'outputRequestBinding', 'pageLinePlan', 'sourcePackage',
    'selection', 'selectionReport', 'meaningPackage', 'proofJobId',
    'verifiedDependencies',
  ]) || !formalBinding(input.outputRequestBinding)
    || !nonempty(input.proofJobId)
    || !dependencyShape(input.verifiedDependencies)) {
    return rejected('CUE_RENDER_INPUT_INVALID', '/');
  }
  const {
    outputRequest, outputRequestBinding, pageLinePlan, sourcePackage,
    selection, selectionReport, meaningPackage, proofJobId, verifiedDependencies,
  } = input;
  if (validatePresentationZevoCaptionQualityOutputRequestV001(outputRequest).status !== 'passed'
    || pageLinePlan?.schemaVersion !== 'presentation-output-page-line-plan-v003'
    || sourcePackage?.schemaVersion !== 'presentation-output-caption-cue-source-package-v001'
    || selection?.schemaVersion !== 'presentation-output-caption-cue-selection-v001'
    || selectionReport?.schemaVersion !== 'presentation-output-caption-cue-selection-report-v001') {
    return rejected('CUE_RENDER_INPUT_INVALID', '/');
  }
  if (outputRequest.requestId !== `${proofJobId}-${outputRequest.caseId}-horizontal-request`) {
    return rejected('CUE_RENDER_INPUT_INVALID', '/requestId');
  }
  const contexts = sourcePackage.reconstructionMap?.caseContexts;
  if (!dense(contexts)) return rejected('CUE_RENDER_BINDING_MISMATCH', '/sourcePackage');
  const candidates = contexts.filter(context => context.caseId === outputRequest.caseId
    && context.inputCaptionId === outputRequest.inputCaptionId);
  if (candidates.length !== 1) return rejected('CUE_RENDER_BINDING_MISMATCH', '/caseId');
  const context = candidates[0];
  if (selectionReport.status !== 'passed'
    || !formalBinding(selectionReport.selectionBinding)
    || !same(outputRequest.sourcePackageBinding, selection.sourcePackageBinding)
    || !same(outputRequest.sourcePackageBinding, pageLinePlan.sourcePackageBinding)
    || !same(outputRequest.selectionBinding, selectionReport.selectionBinding)
    || !same(outputRequest.selectionBinding, pageLinePlan.selectionBinding)
    || !same(outputRequest.selectionReportBinding, pageLinePlan.selectionReportBinding)
    || !same(outputRequest.meaningPackageBinding, context.meaningPackageBinding)
    || !same(outputRequest.meaningPackageBinding, pageLinePlan.meaningPackageBinding)
    || !same(outputRequest.baseMediaInput, context.baseMediaInput)
    || !same(outputRequest.styleInput, context.horizontalStyleInput)
    || !same(pageLinePlan.resolvedStyle, context.resolvedStyle)
    || meaningPackage?.schemaVersion !== outputRequest.meaningPackageBinding.schemaVersion) {
    return rejected('CUE_RENDER_BINDING_MISMATCH', '/');
  }
  let meaningProjection;
  try {
    meaningProjection = verifiedDependencies.deriveMeaningProjection(meaningPackage);
  } catch {
    return rejected('CUE_RENDER_PROJECTION_INVALID', '/meaningProjection');
  }
  if (!validMeaningProjection(meaningProjection)) {
    return rejected('CUE_RENDER_PROJECTION_INVALID', '/meaningProjection');
  }
  if (meaningProjection.titleState !== 'empty') {
    return rejected('CUE_RENDER_PROJECTION_INVALID', '/meaningProjection/titleState');
  }
  const renderPlan = Object.freeze({
    schemaVersion: PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V003,
    planId: `${proofJobId}-${outputRequest.caseId}-render-v003`,
    outputRequestBinding: clone(outputRequestBinding),
    sourcePackageBinding: clone(outputRequest.sourcePackageBinding),
    selectionBinding: clone(outputRequest.selectionBinding),
    selectionReportBinding: clone(outputRequest.selectionReportBinding),
    meaningPackageBinding: clone(outputRequest.meaningPackageBinding),
    baseMediaBinding: clone(outputRequest.baseMediaInput),
    resolvedStyle: clone(pageLinePlan.resolvedStyle),
    captionDisplays: clone(pageLinePlan.captionDisplays),
    titleDisplay: Object.freeze({status: 'not-requested'}),
    meaningProjection: clone(meaningProjection),
  });
  if (validatePresentationOutputRenderPlanV003(renderPlan).status !== 'passed') {
    throw new TypeError('render plan construction is invalid');
  }
  return Object.freeze({status: 'passed', value: Object.freeze({renderPlan})});
}

const validLayoutContext = value => isObject(value)
  && isObject(value.canvas) && isObject(value.layoutRules)
  && nonempty(value.presetRegistryVersion)
  && isObject(value.visualState) && isObject(value.transition);

export function buildPresentationOutputCommonCorePlanV003(input) {
  if (!exactKeys(input, ['renderPlan', 'layoutContext', 'verifiedDependencies'])
    || validatePresentationOutputRenderPlanV003(input.renderPlan).status !== 'passed'
    || !validLayoutContext(input.layoutContext)
    || !dependencyShape(input.verifiedDependencies)) {
    return rejected('CUE_RENDER_INPUT_INVALID', '/');
  }
  const {renderPlan, layoutContext, verifiedDependencies} = input;
  const elements = [];
  for (const display of renderPlan.captionDisplays) {
    for (const cue of display.cues) {
      const targetProvenance = {
        targetRefId: display.semanticCaptionId,
        targetType: 'semantic-caption',
        atomOccurrenceIds: clone(cue.atomOccurrenceIds),
        lineAtomOccurrenceIds: cue.lines.map(line => clone(line.atomOccurrenceIds)),
      };
      const shared = verifiedDependencies.buildCommonCoreElementProjection({
        instructionId: cue.cueId,
        text: cue.text,
        lineTexts: cue.lines.map(line => line.text),
        startFrame: cue.startFrame,
        endFrameExclusive: cue.endFrameExclusive,
        resolvedStyle: renderPlan.resolvedStyle,
        layoutContext,
        targetProvenance,
      });
      if (!exactKeys(shared, ['status', 'projection']) || shared.status !== 'built'
        || !isObject(shared.projection)
        || !dense(shared.projection.indexedLines)
        || shared.projection.indexedLines.length !== cue.lines.length) {
        return rejected('CUE_RENDER_PROJECTION_INVALID', `/captionDisplays/${display.ordinal - 1}`);
      }
      elements.push(Object.freeze({
        instructionId: shared.projection.instructionId,
        kind: shared.projection.kind,
        text: shared.projection.text,
        indexedLines: Object.freeze(shared.projection.indexedLines.map((line, index) => Object.freeze({
          ...clone(line),
          atomOccurrenceIds: clone(cue.lines[index].atomOccurrenceIds),
          logicalWidth: cue.lines[index].logicalWidth,
        }))),
        retainedSpans: clone(cue.retainedSpans),
        sourceSpanEnvelopes: clone(cue.sourceSpanEnvelopes),
        frameMappings: clone(cue.frameMappings),
        startFrame: shared.projection.startFrame,
        endFrameExclusive: shared.projection.endFrameExclusive,
        displayFrameCount: shared.projection.displayFrameCount,
        requestedPresetId: shared.projection.requestedPresetId,
        appliedPresetId: shared.projection.appliedPresetId,
        presetId: shared.projection.presetId,
        registryVersion: shared.projection.registryVersion,
        presetRegistryVersion: shared.projection.presetRegistryVersion,
        stateId: shared.projection.stateId,
        visualState: clone(shared.projection.visualState),
        transition: clone(shared.projection.transition),
        targetProvenance: clone(shared.projection.targetProvenance),
        materialRefs: clone(shared.projection.materialRefs),
      }));
    }
  }
  if (elements.length === 0
    || elements.some(element => !nonempty(element.instructionId)
      || element.kind !== 'speech-caption'
      || !nonempty(element.text)
      || !positive(element.displayFrameCount))) {
    return rejected('CUE_RENDER_PROJECTION_INVALID', '/elements');
  }
  return Object.freeze({
    status: 'passed',
    value: Object.freeze({
      commonCorePlan: Object.freeze({
        schemaVersion: PRESENTATION_OUTPUT_COMMON_CORE_PLAN_SCHEMA_V003,
        format: renderPlan.resolvedStyle.format,
        canvas: clone(layoutContext.canvas),
        layoutRules: clone(layoutContext.layoutRules),
        elements: Object.freeze(elements),
      }),
    }),
  });
}
