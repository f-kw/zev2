import {createHash} from 'node:crypto';

import {
  canonicalJson as canonicalPresentationOutputJsonV001,
} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_A_MEANING_INFORMATION_PACKAGE_SCHEMA_V002,
  canonicalSha256PresentationAJsonV002,
  serializePresentationAFormalJsonV002,
  validatePresentationAMeaningInformationPackageV002,
} from './presentation_a_meaning_information_package_v002.mjs';
import {
  sha256PresentationABytesV002,
} from './presentation_a_source_sequence_v002.mjs';
import {
  getPresentationOutputPageLinePlanTimelineObservationV002,
  validatePresentationOutputResolvedStyleV002,
  validatePresentationOutputCaptionDisplaysV002,
} from './presentation_output_page_line_planner_v002.mjs';
import {
  buildPresentationOutputCommonCoreElementProjectionV001,
} from './presentation_output_render_plan_v001.mjs';

export const PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V002 =
  'presentation-output-render-plan-v002';
export const PRESENTATION_OUTPUT_COMMON_CORE_PLAN_SCHEMA_V002 =
  'presentation-output-common-core-plan-v002';

export const PRESENTATION_OUTPUT_RENDER_VIOLATION_CODES_V002 = Object.freeze([
  'OUTPUT_V002_RENDER_PLAN_INVALID',
  'OUTPUT_V002_RENDER_PROJECTION_MISMATCH',
  'OUTPUT_V002_BASE_MEDIA_INVALID',
  'OUTPUT_V002_PUBLICATION_FAILED',
  'OUTPUT_V002_QC_FAILED',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);
const sha256Canonical = value => createHash('sha256').update(
  canonicalPresentationOutputJsonV001(value),
).digest('hex');

const observeJsonValue = value => ({
  schemaVersion: value.schemaVersion,
  fileSha256: sha256PresentationABytesV002(serializePresentationAFormalJsonV002(value)),
  canonicalSha256: canonicalSha256PresentationAJsonV002(value),
});

const bindingMatchesObservation = (binding, observation) => isJsonBinding(binding)
  && exactKeys(observation, ['schemaVersion', 'fileSha256', 'canonicalSha256'])
  && binding.schemaVersion === observation.schemaVersion
  && binding.fileSha256 === observation.fileSha256
  && binding.canonicalSha256 === observation.canonicalSha256;

const isJsonBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
])
  && FORMAL_ID.test(value.schemaVersion)
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && SHA256.test(value.canonicalSha256);

const isMediaBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256);

const validBaseMediaBinding = value => exactKeys(value, [
  'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
])
  && isMediaBinding(value.baseMedia)
  && isJsonBinding(value.timeline)
  && value.timeline.schemaVersion === 'presentation-base-media-timeline-v002'
  && isJsonBinding(value.generationManifest)
  && value.generationManifest.schemaVersion
    === 'presentation-output-base-media-generation-manifest-v001'
  && isJsonBinding(value.validationReceipt)
  && value.validationReceipt.schemaVersion
    === 'presentation-output-base-media-validation-receipt-v001';

const validMeaningProjection = value => exactKeys(value, [
  'timelineSegmentCount',
  'atomOccurrenceCount',
  'captionCount',
  'titleState',
  'semanticObservationCount',
  'captionTextSequenceCanonicalSha256',
  'atomOccurrenceSpanSequenceCanonicalSha256',
  'timelineCompositionCanonicalSha256',
])
  && nonnegative(value.timelineSegmentCount)
  && nonnegative(value.atomOccurrenceCount)
  && nonnegative(value.captionCount)
  && ['empty', 'provided'].includes(value.titleState)
  && nonnegative(value.semanticObservationCount)
  && SHA256.test(value.captionTextSequenceCanonicalSha256)
  && SHA256.test(value.atomOccurrenceSpanSequenceCanonicalSha256)
  && SHA256.test(value.timelineCompositionCanonicalSha256);

export const derivePresentationOutputMeaningProjectionV002 = meaningPackage => {
  if (!validatePresentationAMeaningInformationPackageV002(meaningPackage)) {
    throw new TypeError('v002 meaning package is invalid');
  }
  return {
    timelineSegmentCount: meaningPackage.timelineComposition.segments.length,
    atomOccurrenceCount: meaningPackage.atomOccurrences.length,
    captionCount: meaningPackage.captions.length,
    titleState: meaningPackage.title.text === '' ? 'empty' : 'provided',
    semanticObservationCount: meaningPackage.semanticObservations.length,
    captionTextSequenceCanonicalSha256: sha256Canonical(
      meaningPackage.captions.map(caption => ({
        captionId: caption.captionId,
        text: caption.text,
        atomOccurrenceIds: caption.atomOccurrenceIds,
      })),
    ),
    atomOccurrenceSpanSequenceCanonicalSha256: sha256Canonical(
      meaningPackage.atomOccurrences.map(occurrence => ({
        atomOccurrenceId: occurrence.atomOccurrenceId,
        sourceAtomId: occurrence.sourceAtomId,
        retainedSpans: occurrence.retainedSpans,
      })),
    ),
    timelineCompositionCanonicalSha256: sha256Canonical(
      meaningPackage.timelineComposition,
    ),
  };
};

const rejected = (code, path = '') => ({
  status: 'rejected',
  violations: [{code, path, relatedIds: []}],
});

const validateRequest = request => exactKeys(request, [
  'requestId', 'meaningInformationPackage', 'baseMediaInput',
])
  && FORMAL_ID.test(request.requestId)
  && isJsonBinding(request.meaningInformationPackage)
  && request.meaningInformationPackage.schemaVersion
    === PRESENTATION_A_MEANING_INFORMATION_PACKAGE_SCHEMA_V002
  && validBaseMediaBinding(request.baseMediaInput);

const DOWNSTREAM_RESULT_OWNERS = Object.freeze({
  'base-media': Object.freeze({
    passed: Object.freeze(['passed']),
    rejected: Object.freeze(['failed', 'rejected']),
    code: 'OUTPUT_V002_BASE_MEDIA_INVALID',
    path: '/baseMedia',
  }),
  publication: Object.freeze({
    passed: Object.freeze(['published']),
    rejected: Object.freeze(['conflict', 'failed', 'rejected']),
    code: 'OUTPUT_V002_PUBLICATION_FAILED',
    path: '/publication',
  }),
  qc: Object.freeze({
    passed: Object.freeze(['passed']),
    rejected: Object.freeze(['failed', 'rejected']),
    code: 'OUTPUT_V002_QC_FAILED',
    path: '/qc',
  }),
});

/**
 * ZEVO下流三段の結果を、それぞれが所有する既存違反codeへ一意に帰属する。
 * 生messageやstderrは受け取らず、fatalは違反へ潰さずそのまま上位へ返す。
 */
export function classifyPresentationOutputDownstreamResultV002({stage, result} = {}) {
  const owner = DOWNSTREAM_RESULT_OWNERS[stage];
  if (owner === undefined || !isObject(result) || typeof result.status !== 'string') {
    return rejected('OUTPUT_V002_RENDER_PLAN_INVALID', '/downstream');
  }
  if (result.status === 'fatal') return {status: 'fatal', violations: []};
  if (owner.passed.includes(result.status)) return {status: 'passed', violations: []};
  if (owner.rejected.includes(result.status)) return rejected(owner.code, owner.path);
  return rejected('OUTPUT_V002_RENDER_PLAN_INVALID', '/downstream');
}

export function validatePresentationOutputRenderPlanV002(plan, context = {}) {
  if (!exactKeys(plan, [
    'schemaVersion', 'planId', 'outputRequestBinding', 'meaningPackageBinding',
    'baseMediaBinding', 'resolvedStyle', 'captionDisplays', 'titleDisplay',
    'meaningProjection',
  ])
    || plan.schemaVersion !== PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V002
    || !FORMAL_ID.test(plan.planId)
    || !isJsonBinding(plan.outputRequestBinding)
    || !isJsonBinding(plan.meaningPackageBinding)
    || plan.meaningPackageBinding.schemaVersion
      !== PRESENTATION_A_MEANING_INFORMATION_PACKAGE_SCHEMA_V002
    || !validBaseMediaBinding(plan.baseMediaBinding)
    || !validatePresentationOutputResolvedStyleV002(plan.resolvedStyle)
    || !dense(plan.captionDisplays)
    || plan.captionDisplays.length < 1
    || !exactKeys(plan.titleDisplay, ['status'])
    || plan.titleDisplay.status !== 'not-requested'
    || !validMeaningProjection(plan.meaningProjection)) {
    return rejected('OUTPUT_V002_RENDER_PLAN_INVALID');
  }
  if (context.requestId !== undefined
    && plan.planId !== `${context.requestId}-render-plan`) {
    return rejected('OUTPUT_V002_RENDER_PLAN_INVALID', '/planId');
  }
  if (context.meaningPackage !== undefined) {
    if (!validatePresentationAMeaningInformationPackageV002(context.meaningPackage)
      || !bindingMatchesObservation(
        plan.meaningPackageBinding,
        observeJsonValue(context.meaningPackage),
      )
      || !validatePresentationOutputCaptionDisplaysV002(
        plan.captionDisplays,
        context.meaningPackage,
        plan.resolvedStyle,
      )
      || !same(
        plan.meaningProjection,
        derivePresentationOutputMeaningProjectionV002(context.meaningPackage),
      )) return rejected('OUTPUT_V002_RENDER_PROJECTION_MISMATCH', '/captionDisplays');
  }
  return {status: 'passed', violations: []};
}

export function buildPresentationOutputRenderPlanV002({
  request,
  outputRequestBinding,
  meaningPackage,
  pageLinePlan,
  resolvedStyle,
} = {}) {
  if (!validateRequest(request)
    || !isJsonBinding(outputRequestBinding)
    || !validatePresentationAMeaningInformationPackageV002(meaningPackage)
    || meaningPackage.title.text !== ''
    || pageLinePlan?.status !== 'planned'
    || !dense(pageLinePlan.captionDisplays)
    || !validatePresentationOutputResolvedStyleV002(resolvedStyle)) {
    return rejected('OUTPUT_V002_RENDER_PLAN_INVALID');
  }
  if (!bindingMatchesObservation(
    request.meaningInformationPackage,
    observeJsonValue(meaningPackage),
  )) {
    return rejected(
      'OUTPUT_V002_RENDER_PROJECTION_MISMATCH',
      '/meaningInformationPackage',
    );
  }
  const timelineObservation =
    getPresentationOutputPageLinePlanTimelineObservationV002(pageLinePlan);
  if (!bindingMatchesObservation(request.baseMediaInput.timeline, timelineObservation)) {
    return rejected('OUTPUT_V002_BASE_MEDIA_INVALID', '/baseMediaInput/timeline');
  }
  const plan = {
    schemaVersion: PRESENTATION_OUTPUT_RENDER_PLAN_SCHEMA_V002,
    planId: `${request.requestId}-render-plan`,
    outputRequestBinding: clone(outputRequestBinding),
    meaningPackageBinding: clone(request.meaningInformationPackage),
    baseMediaBinding: clone(request.baseMediaInput),
    resolvedStyle: clone(resolvedStyle),
    captionDisplays: clone(pageLinePlan.captionDisplays),
    titleDisplay: {status: 'not-requested'},
    meaningProjection: derivePresentationOutputMeaningProjectionV002(meaningPackage),
  };
  const validation = validatePresentationOutputRenderPlanV002(plan, {
    requestId: request.requestId,
    meaningPackage,
  });
  return validation.status === 'passed' ? {status: 'built', plan} : validation;
}

/**
 * v002 page一件を共通描画element一件へ写す。本文は一回だけ保持し、
 * 複数元時刻片とframe来歴は独立した来歴fieldへ移す。
 */
export function buildPresentationOutputCommonCorePlanV002({
  renderPlan,
  meaningPackage,
  layoutContext,
} = {}) {
  const validation = validatePresentationOutputRenderPlanV002(renderPlan, {meaningPackage});
  if (validation.status !== 'passed'
    || !isObject(layoutContext)
    || !isObject(layoutContext.canvas)
    || !isObject(layoutContext.layoutRules)) return validation.status === 'passed'
      ? rejected('OUTPUT_V002_RENDER_PLAN_INVALID', '/layoutContext')
      : validation;
  const elements = [];
  for (const display of renderPlan.captionDisplays) {
    for (const page of display.pages) {
      const targetProvenance = {
        targetRefId: display.semanticCaptionId,
        targetType: 'semantic-caption',
        atomOccurrenceIds: clone(page.atomOccurrenceIds),
        lineAtomOccurrenceIds: page.lines.map(line => clone(line.atomOccurrenceIds)),
      };
      const shared = buildPresentationOutputCommonCoreElementProjectionV001({
        instructionId: page.pageId,
        text: page.text,
        lineTexts: page.lines.map(line => line.text),
        startFrame: page.startFrame,
        endFrameExclusive: page.endFrameExclusive,
        resolvedStyle: renderPlan.resolvedStyle,
        layoutContext,
        targetProvenance,
      });
      if (shared.status !== 'built') {
        return rejected(
          'OUTPUT_V002_RENDER_PROJECTION_MISMATCH',
          `/captionDisplays/${display.ordinal - 1}`,
        );
      }
      elements.push({
        instructionId: shared.projection.instructionId,
        kind: shared.projection.kind,
        text: shared.projection.text,
        indexedLines: shared.projection.indexedLines.map((line, index) => ({
          ...line,
          atomOccurrenceIds: clone(page.lines[index].atomOccurrenceIds),
          logicalWidth: page.lines[index].logicalWidth,
        })),
        retainedSpans: clone(page.retainedSpans),
        sourceSpanEnvelopes: clone(page.sourceSpanEnvelopes),
        frameMappings: clone(page.frameMappings),
        startFrame: shared.projection.startFrame,
        endFrameExclusive: shared.projection.endFrameExclusive,
        displayFrameCount: shared.projection.displayFrameCount,
        requestedPresetId: shared.projection.requestedPresetId,
        appliedPresetId: shared.projection.appliedPresetId,
        presetId: shared.projection.presetId,
        registryVersion: shared.projection.registryVersion,
        presetRegistryVersion: shared.projection.presetRegistryVersion,
        stateId: shared.projection.stateId,
        visualState: shared.projection.visualState,
        transition: shared.projection.transition,
        targetProvenance: shared.projection.targetProvenance,
        materialRefs: shared.projection.materialRefs,
      });
    }
  }
  return {
    status: 'built',
    plan: {
      schemaVersion: PRESENTATION_OUTPUT_COMMON_CORE_PLAN_SCHEMA_V002,
      format: renderPlan.resolvedStyle.format,
      canvas: clone(layoutContext.canvas),
      layoutRules: clone(layoutContext.layoutRules),
      elements,
    },
  };
}
