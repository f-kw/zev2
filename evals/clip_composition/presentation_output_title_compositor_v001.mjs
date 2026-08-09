import {createHash} from 'node:crypto';
import path from 'node:path';

import {
  canonicalJson,
  serializePresentationCaptionReport,
} from './presentation_caption_contract_v002.mjs';
import {
  validatePresentationMeaningInformationPackageAdmissionEnvelopeV001,
  validatePresentationMeaningImplementationBindingV001,
  validatePresentationMeaningJsonBindingV001,
  validatePresentationMeaningMediaBindingV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  derivePresentationOutputMeaningProjectionV001,
} from './presentation_output_contract_v001.mjs';
import {
  PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
  layoutUnicodeCodePointsV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001,
} from './presentation_renderer_plan_v002.mjs';

export const ZEVO_TITLE_STYLE_REGISTRY_SCHEMA_V001 =
  'zevo-title-style-registry-v001';
export const ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001 =
  'zevo-title-output-job-v001';
export const ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001 =
  'zevo-title-display-plan-v001';
export const ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001 =
  'zevo-title-renderer-evidence-v001';
export const ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001 =
  'zevo-title-output-qc-v001';
export const ZEVO_TITLE_OUTPUT_MANIFEST_SCHEMA_V001 =
  'zevo-title-output-manifest-v001';

export const ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001 = Object.freeze([
  ['formal-json-serializer', 'evals/clip_composition/presentation_caption_contract_v002.mjs'],
  ['meaning-package-contract', 'evals/clip_composition/presentation_meaning_information_package_v001.mjs'],
  ['output-contract', 'evals/clip_composition/presentation_output_contract_v001.mjs'],
  ['title-text-layout', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['renderer-plan-contract', 'evals/clip_composition/presentation_renderer_plan_v002.mjs'],
  ['title-compositor', 'evals/clip_composition/presentation_output_title_compositor_v001.mjs'],
  ['stable-workspace-reader', 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'],
  ['finite-json-decoder', 'evals/clip_composition/presentation_output_crop_application_v001.mjs'],
  ['source-output-contract', 'evals/clip_composition/presentation_output_render_plan_v001.mjs'],
  ['renderer-qc', 'evals/clip_composition/presentation_renderer_qc_v002.mjs'],
  ['common-renderer', 'evals/clip_composition/render_presentation_v002.mjs'],
  ['title-output-runner', 'evals/clip_composition/run_presentation_output_title_job_v001.ts'],
  ['instruction-contract', 'evals/clip_composition/presentation_instruction_contract_v002.mjs'],
  ['base-media-timeline', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['fatal-observation', 'evals/clip_composition/presentation_fatal_observation_v002.mjs'],
  ['title-renderer-entry', 'evals/clip_composition/presentation_renderer_entry_v001.tsx'],
  ['title-layout-inspector', 'evals/clip_composition/inspect_presentation_render_layout_v001.ts'],
  ['landscape-layout-inspector', 'evals/clip_composition/inspect_presentation_preset_layout.ts'],
  ['base-media-builder', 'evals/clip_composition/presentation_base_media_build_v001.mjs'],
  ['caption-api-cost-guard', 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs'],
  ['caption-contract-v003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['caption-display-pair-v003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['caption-display-pair-v004', 'evals/clip_composition/presentation_caption_display_pair_v004.mjs'],
  ['caption-semantic-output', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['caption-semantic-source-package', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['instruction-contract-v003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['instruction-contract-v004', 'evals/clip_composition/presentation_instruction_contract_v004.mjs'],
  ['meaning-boundary-selection', 'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs'],
  ['meaning-boundary-source-package', 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs'],
  ['meaning-output-run-input-record', 'evals/clip_composition/presentation_meaning_output_run_input_record_v001.mjs'],
  ['output-base-media', 'evals/clip_composition/presentation_output_base_media_v001.mjs'],
  ['page-line-planner', 'evals/clip_composition/presentation_output_page_line_planner_v001.mjs'],
  ['output-style-resolver', 'evals/clip_composition/presentation_output_style_resolver_v001.ts'],
  ['retained-source-atoms', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['segmenter-boundary-evidence', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['source-speaker-policy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['vertical-review-renderer', 'evals/clip_composition/render_presentation_vertical_review_v001.ts'],
  ['caption-display-pair-job', 'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs'],
  ['caption-gate-b6-runner', 'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs'],
  ['caption-semantic-output-check', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs'],
  ['meaning-boundary-b5-b6-runner', 'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs'],
  ['segmenter-boundary-preflight', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
  ['shared-runtime-activity', 'packages/shared/dist/activity.js'],
  ['shared-runtime-common', 'packages/shared/dist/common.js'],
  ['shared-runtime-index', 'packages/shared/dist/index.js'],
  ['shared-runtime-web-gemini-review', 'packages/shared/dist/web-gemini-review.js'],
  ['telop-text-component', 'runner/src/remotion/components/TelopText.tsx'],
  ['telop-font-utils', 'runner/src/remotion/utils/telop-font.ts'],
  ['screen-layout', 'runner/src/screen-layout.ts'],
  ['telop-glow', 'runner/src/shared/telop-glow.ts'],
  ['telop-remotion', 'runner/src/telop-remotion.ts'],
  ['telop-line-break', 'runner/src/telop/telop-line-break.ts'],
  ['telop-render-model', 'runner/src/telop/telop-render-model.ts'],
  ['telop-text-metrics', 'runner/src/telop/text-metrics.ts'],
  ['shared-package-manifest', 'packages/shared/package.json'],
  [
    'source-speaker-registry-v001',
    'evals/clip_composition/registries/presentation/'
      + 'presentation-source-speaker-non-identity-registry-v001/registry.json',
  ],
].map(([role, path]) => Object.freeze({role, path})));

export const ZEVO_TITLE_IMPLEMENTATION_ROLES_V001 = Object.freeze(
  ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001.map(binding => binding.role),
);

export const ZEVO_TITLE_OUTPUT_QC_CHECKS_V001 = Object.freeze([
  'sourceBinding',
  'titleTextIntegrity',
  'titleApplication',
  'titleLayoutAndVisibility',
  'mediaFramePreservation',
  'audioPreservation',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/u;
const FORMATS = Object.freeze(['normal-landscape', 'vertical-short-1080x1920']);
const POSITION_PRESETS = Object.freeze([
  'center', 'bottom-center', 'top-center', 'lower-third', 'top-right',
  'top-band',
]);
const ALIGNMENTS = Object.freeze(['left', 'center', 'right']);
const RUNTIME_ROLES = Object.freeze([
  'node', 'tsx', 'remotion', 'browser', 'ffmpeg', 'ffprobe', 'imageMagick',
]);

const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && Object.keys(value).every((key, index) => key === String(index));
const nonempty = value => typeof value === 'string' && value.length > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);

const jsonBinding = (value, schemaVersion = null) =>
  validatePresentationMeaningJsonBindingV001(value)
  && (schemaVersion === null || value.schemaVersion === schemaVersion);
const mediaBinding = value => validatePresentationMeaningMediaBindingV001(value);

export const serializeZevoTitleFormalJsonV001 = value => Buffer.from(
  serializePresentationCaptionReport(value),
  'utf8',
);

export const canonicalSha256ZevoTitleJsonV001 = value => createHash('sha256')
  .update(canonicalJson(value))
  .digest('hex');

const validFontAsset = value => exactKeys(value, [
  'fontAssetId', 'fileName', 'path', 'fileSha256', 'licensePath',
])
  && FORMAL_ID.test(value.fontAssetId)
  && nonempty(value.fileName)
  && !/[\\/\0]/u.test(value.fileName)
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && WORKSPACE_PATH.test(value.licensePath);

const validCanvas = value => exactKeys(value, ['width', 'height', 'fps'])
  && positive(value.width)
  && positive(value.height)
  && positive(value.fps);

const validSafeArea = (value, canvas) => exactKeys(value, [
  'top', 'right', 'bottom', 'left',
])
  && Object.values(value).every(nonnegative)
  && value.left + value.right < canvas.width
  && value.top + value.bottom < canvas.height;

const validFrameRange = value => exactKeys(value, [
  'startFrame', 'endFrameExclusive',
])
  && nonnegative(value.startFrame)
  && positive(value.endFrameExclusive)
  && value.startFrame < value.endFrameExclusive;

const validTextStyle = (value, fontIds) => exactKeys(value, [
  'fontAssetId', 'fontSizePx', 'fontColor', 'borderColor', 'borderWidthPx',
  'lineSpacingPercent', 'glowColor', 'glowWidthPx', 'glowOpacityPercent',
])
  && fontIds.has(value.fontAssetId)
  && positive(value.fontSizePx)
  && HEX_COLOR.test(value.fontColor)
  && HEX_COLOR.test(value.borderColor)
  && nonnegative(value.borderWidthPx)
  && positive(value.lineSpacingPercent)
  && HEX_COLOR.test(value.glowColor)
  && nonnegative(value.glowWidthPx)
  && Number.isSafeInteger(value.glowOpacityPercent)
  && value.glowOpacityPercent >= 0
  && value.glowOpacityPercent <= 100;

const validPosition = value => exactKeys(value, [
  'preset', 'alignment', 'offsetXPercent', 'offsetYPercent',
])
  && POSITION_PRESETS.includes(value.preset)
  && ALIGNMENTS.includes(value.alignment)
  && Number.isFinite(value.offsetXPercent)
  && Number.isFinite(value.offsetYPercent);

const validBackground = value => value === null || (exactKeys(value, [
  'color', 'borderRadiusPx', 'paddingXPx', 'paddingYPx',
])
  && nonempty(value.color)
  && nonnegative(value.borderRadiusPx)
  && nonnegative(value.paddingXPx)
  && nonnegative(value.paddingYPx));

const validVisualState = (value, fontIds, profile) => exactKeys(value, [
  'stateId', 'textStyle', 'position', 'background', 'layout', 'transitionId',
])
  && FORMAL_ID.test(value.stateId)
  && validTextStyle(value.textStyle, fontIds)
  && validPosition(value.position)
  && validBackground(value.background)
  && (value.position.preset !== 'top-band' || (
    value.position.alignment === 'center'
    && value.position.offsetXPercent === 0
    && value.position.offsetYPercent === 0
    && value.background !== null
    && value.background.borderRadiusPx === 0
    && positive(value.background.paddingXPx)
    && positive(value.background.paddingYPx)
  ))
  && exactKeys(value.layout, ['maxCharsPerLine', 'maxLines', 'singleLine'])
  && value.layout.maxCharsPerLine === profile.maxLogicalWidth
  && value.layout.maxLines === profile.maxLines
  && value.layout.singleLine === false
  && FORMAL_ID.test(value.transitionId);

const validProfile = (value, fontIds) => exactKeys(value, [
  'profileId', 'format', 'canvas', 'safeArea', 'displayFrameRange',
  'maxLogicalWidth', 'maxLines', 'visualState',
])
  && FORMAL_ID.test(value.profileId)
  && FORMATS.includes(value.format)
  && validCanvas(value.canvas)
  && (value.format === 'normal-landscape'
    ? value.canvas.width > value.canvas.height
    : value.canvas.height > value.canvas.width)
  && validSafeArea(value.safeArea, value.canvas)
  && validFrameRange(value.displayFrameRange)
  && positive(value.maxLogicalWidth)
  && positive(value.maxLines)
  && value.maxLines <= 99
  && validVisualState(value.visualState, fontIds, value);

export function validateZevoTitleStyleRegistryV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'registryId', 'fontAssets', 'layoutRules', 'profiles',
  ])
    || value.schemaVersion !== ZEVO_TITLE_STYLE_REGISTRY_SCHEMA_V001
    || !FORMAL_ID.test(value.registryId)
    || !dense(value.fontAssets)
    || value.fontAssets.length === 0
    || !value.fontAssets.every(validFontAsset)
    || new Set(value.fontAssets.map(entry => entry.fontAssetId)).size
      !== value.fontAssets.length
    || !same(value.layoutRules, PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001)
    || value.layoutRules.characterWidthRule
      !== PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001
    || !dense(value.profiles)
    || value.profiles.length === 0) return false;
  const fontIds = new Set(value.fontAssets.map(entry => entry.fontAssetId));
  return value.profiles.every(profile => validProfile(profile, fontIds))
    && new Set(value.profiles.map(profile => profile.profileId)).size
      === value.profiles.length;
}

const validSourceOutput = value => exactKeys(value, [
  'manifest', 'renderPlan', 'qc', 'video',
])
  && jsonBinding(value.manifest, 'presentation-output-render-manifest-v001')
  && jsonBinding(value.renderPlan, 'presentation-output-render-plan-v001')
  && jsonBinding(value.qc, 'presentation-output-render-qc-v001')
  && mediaBinding(value.video);

const validRuntimeBinding = value => exactKeys(value, [
  'path', 'version', 'fileSha256',
])
  && typeof value.path === 'string'
  && path.isAbsolute(value.path)
  && nonempty(value.version)
  && SHA256.test(value.fileSha256);

const validRuntimeProfile = value => exactKeys(value, RUNTIME_ROLES)
  && RUNTIME_ROLES.every(role => validRuntimeBinding(value[role]));

export function validateZevoTitleOutputJobV001(job, context = {}) {
  if (!exactKeys(job, [
    'schemaVersion', 'jobId', 'outputId', 'titleMeaningPackageBinding',
    'sourceOutput', 'styleRegistryBinding', 'profileId', 'publication',
    'runtimeProfile', 'implementationBindings',
  ])
    || job.schemaVersion !== ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001
    || !FORMAL_ID.test(job.jobId)
    || !FORMAL_ID.test(job.outputId)
    || jsonBinding(job.titleMeaningPackageBinding,
      'zev-meaning-information-package-v001') !== true
    || !validSourceOutput(job.sourceOutput)
    || jsonBinding(job.styleRegistryBinding,
      ZEVO_TITLE_STYLE_REGISTRY_SCHEMA_V001) !== true
    || !FORMAL_ID.test(job.profileId)
    || !exactKeys(job.publication, ['outputRoot'])
    || !WORKSPACE_PATH.test(job.publication.outputRoot)
    || !job.publication.outputRoot.endsWith(`/${job.outputId}`)
    || !validRuntimeProfile(job.runtimeProfile)
    || !dense(job.implementationBindings)
    || job.implementationBindings.length !== ZEVO_TITLE_IMPLEMENTATION_ROLES_V001.length
    || !job.implementationBindings.every(validatePresentationMeaningImplementationBindingV001)
    || new Set(job.implementationBindings.map(item => item.path)).size
      !== job.implementationBindings.length
    || new Set(job.implementationBindings.map(item => item.role)).size
      !== job.implementationBindings.length
    || !same(
      job.implementationBindings.map(({role, path: implementationPath}) => ({
        role,
        path: implementationPath,
      })),
      ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001,
    )) return false;
  if (context.registry !== undefined) {
    if (!validateZevoTitleStyleRegistryV001(context.registry)
      || !context.registry.profiles.some(profile => profile.profileId === job.profileId)) {
      return false;
    }
  }
  if (context.titleMeaningPackage !== undefined) {
    if (validatePresentationMeaningInformationPackageAdmissionEnvelopeV001(
      context.titleMeaningPackage,
    ).status !== 'passed'
      || context.titleMeaningPackage.title?.inputMode !== 'human'
      || !nonempty(context.titleMeaningPackage.title?.text)) return false;
  }
  return true;
}

const meaningIdentityInsensitiveProjection = meaningPackage => {
  const projection = derivePresentationOutputMeaningProjectionV001(meaningPackage);
  return {
    timelineSegmentCount: projection.timelineSegmentCount,
    captionCount: projection.captionCount,
    semanticObservationCount: projection.semanticObservationCount,
    captionTextSequenceCanonicalSha256:
      projection.captionTextSequenceCanonicalSha256,
    captionTimingSequenceCanonicalSha256:
      projection.captionTimingSequenceCanonicalSha256,
    timelineSegmentsCanonicalSha256: canonicalSha256ZevoTitleJsonV001(
      meaningPackage.timelineComposition.segments,
    ),
  };
};

export function validateZevoTitleMeaningReplacementV001(
  sourceMeaningPackage,
  titleMeaningPackage,
) {
  const source = validatePresentationMeaningInformationPackageAdmissionEnvelopeV001(
    sourceMeaningPackage,
  );
  const titled = validatePresentationMeaningInformationPackageAdmissionEnvelopeV001(
    titleMeaningPackage,
  );
  const passed = source.status === 'passed'
    && titled.status === 'passed'
    && same(sourceMeaningPackage.title, {text: '', inputMode: 'none'})
    && titleMeaningPackage.title.inputMode === 'human'
    && nonempty(titleMeaningPackage.title.text)
    && same(sourceMeaningPackage.sourceMedia, titleMeaningPackage.sourceMedia)
    && same(
      sourceMeaningPackage.timelineComposition.segments,
      titleMeaningPackage.timelineComposition.segments,
    )
    && same(sourceMeaningPackage.captions, titleMeaningPackage.captions)
    && same(
      sourceMeaningPackage.semanticObservations,
      titleMeaningPackage.semanticObservations,
    )
    && same(
      meaningIdentityInsensitiveProjection(sourceMeaningPackage),
      meaningIdentityInsensitiveProjection(titleMeaningPackage),
    );
  return passed
    ? {status: 'passed', sourceProjection: derivePresentationOutputMeaningProjectionV001(
      sourceMeaningPackage,
    ), titleProjection: derivePresentationOutputMeaningProjectionV001(
      titleMeaningPackage,
    )}
    : {status: 'rejected'};
}

const validMeaningProjection = value => exactKeys(value, [
  'timelineSegmentCount', 'captionCount', 'titleState', 'semanticObservationCount',
  'captionTextSequenceCanonicalSha256', 'captionTimingSequenceCanonicalSha256',
  'timelineCompositionCanonicalSha256',
])
  && nonnegative(value.timelineSegmentCount)
  && nonnegative(value.captionCount)
  && ['empty', 'provided'].includes(value.titleState)
  && nonnegative(value.semanticObservationCount)
  && SHA256.test(value.captionTextSequenceCanonicalSha256)
  && SHA256.test(value.captionTimingSequenceCanonicalSha256)
  && SHA256.test(value.timelineCompositionCanonicalSha256);

const validIndexedCharacter = value => exactKeys(value, [
  'sourceIndex', 'character', 'codePoint', 'role',
])
  && nonnegative(value.sourceIndex)
  && typeof value.character === 'string'
  && Array.from(value.character).length === 1
  && nonnegative(value.codePoint)
  && value.codePoint === value.character.codePointAt(0)
  && ['visible', 'source-line-break'].includes(value.role);

const validIndexedLine = value => exactKeys(value, [
  'lineIndex', 'characters', 'renderedText', 'text', 'codePointIndices',
])
  && nonnegative(value.lineIndex)
  && dense(value.characters)
  && value.characters.every(validIndexedCharacter)
  && typeof value.renderedText === 'string'
  && value.text === value.renderedText
  && dense(value.codePointIndices)
  && value.codePointIndices.every(nonnegative);

const validTitleDisplay = value => exactKeys(value, [
  'displayId', 'text', 'indexedLines', 'requestedProfileId',
  'appliedProfileId', 'startFrame', 'endFrameExclusive', 'displayFrameCount',
])
  && FORMAL_ID.test(value.displayId)
  && nonempty(value.text)
  && dense(value.indexedLines)
  && value.indexedLines.length > 0
  && value.indexedLines.every((line, index) => validIndexedLine(line)
    && line.lineIndex === index)
  && FORMAL_ID.test(value.requestedProfileId)
  && value.appliedProfileId === value.requestedProfileId
  && nonnegative(value.startFrame)
  && positive(value.endFrameExclusive)
  && value.startFrame < value.endFrameExclusive
  && value.displayFrameCount === value.endFrameExclusive - value.startFrame;

export function validateZevoTitleDisplayPlanV001(plan, context = {}) {
  if (!exactKeys(plan, [
    'schemaVersion', 'planId', 'jobBinding', 'titleMeaningPackageBinding',
    'sourceOutput', 'styleRegistryBinding', 'profileId', 'format', 'canvas',
    'safeArea', 'displayFrameRange', 'titleDisplay', 'sourceMeaningProjection',
    'titleMeaningProjection',
  ])
    || plan.schemaVersion !== ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001
    || !FORMAL_ID.test(plan.planId)
    || !jsonBinding(plan.jobBinding, ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001)
    || !jsonBinding(plan.titleMeaningPackageBinding,
      'zev-meaning-information-package-v001')
    || !validSourceOutput(plan.sourceOutput)
    || !jsonBinding(plan.styleRegistryBinding,
      ZEVO_TITLE_STYLE_REGISTRY_SCHEMA_V001)
    || !FORMAL_ID.test(plan.profileId)
    || !FORMATS.includes(plan.format)
    || !validCanvas(plan.canvas)
    || !validSafeArea(plan.safeArea, plan.canvas)
    || !validFrameRange(plan.displayFrameRange)
    || !validTitleDisplay(plan.titleDisplay)
    || plan.titleDisplay.requestedProfileId !== plan.profileId
    || plan.titleDisplay.startFrame !== plan.displayFrameRange.startFrame
    || plan.titleDisplay.endFrameExclusive
      !== plan.displayFrameRange.endFrameExclusive
    || !validMeaningProjection(plan.sourceMeaningProjection)
    || plan.sourceMeaningProjection.titleState !== 'empty'
    || !validMeaningProjection(plan.titleMeaningProjection)
    || plan.titleMeaningProjection.titleState !== 'provided') return false;
  if (context.job !== undefined) {
    if (!validateZevoTitleOutputJobV001(context.job, {
      registry: context.registry,
      titleMeaningPackage: context.titleMeaningPackage,
    })
      || !same(plan.titleMeaningPackageBinding,
        context.job.titleMeaningPackageBinding)
      || !same(plan.sourceOutput, context.job.sourceOutput)
      || !same(plan.styleRegistryBinding, context.job.styleRegistryBinding)
      || plan.profileId !== context.job.profileId
      || plan.planId !== `${context.job.outputId}-title-plan`) return false;
  }
  if (context.registry !== undefined) {
    if (!validateZevoTitleStyleRegistryV001(context.registry)) return false;
    const profile = context.registry.profiles.find(
      candidate => candidate.profileId === plan.profileId,
    );
    const layout = profile === undefined ? null : layoutUnicodeCodePointsV001(
      plan.titleDisplay.text,
      {maxCharsPerLine: profile.maxLogicalWidth, maxLines: profile.maxLines,
        singleLine: false},
      context.registry.layoutRules.characterWidthRule,
    );
    if (!profile
      || plan.format !== profile.format
      || !same(plan.canvas, profile.canvas)
      || !same(plan.safeArea, profile.safeArea)
      || !same(plan.displayFrameRange, profile.displayFrameRange)
      || layout.status !== 'passed'
      || !same(plan.titleDisplay.indexedLines, layout.indexedLines)) return false;
  }
  if (context.sourceMeaningPackage !== undefined
    || context.titleMeaningPackage !== undefined) {
    const replacement = validateZevoTitleMeaningReplacementV001(
      context.sourceMeaningPackage,
      context.titleMeaningPackage,
    );
    if (replacement.status !== 'passed'
      || plan.titleDisplay.text !== context.titleMeaningPackage.title.text
      || !same(plan.sourceMeaningProjection, replacement.sourceProjection)
      || !same(plan.titleMeaningProjection, replacement.titleProjection)) return false;
    if (context.registry !== undefined) {
      const profile = context.registry.profiles.find(
        candidate => candidate.profileId === plan.profileId,
      );
      const layout = layoutUnicodeCodePointsV001(
        context.titleMeaningPackage.title.text,
        {maxCharsPerLine: profile.maxLogicalWidth, maxLines: profile.maxLines,
          singleLine: false},
        context.registry.layoutRules.characterWidthRule,
      );
      if (layout.status !== 'passed'
        || !same(plan.titleDisplay.indexedLines, layout.indexedLines)) return false;
    }
  }
  return true;
}

export function buildZevoTitleDisplayPlanV001({
  job,
  jobBinding,
  registry,
  sourceMeaningPackage,
  titleMeaningPackage,
}) {
  if (!validateZevoTitleOutputJobV001(job, {registry, titleMeaningPackage})
    || !jsonBinding(jobBinding, ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001)) {
    return {status: 'rejected'};
  }
  const replacement = validateZevoTitleMeaningReplacementV001(
    sourceMeaningPackage,
    titleMeaningPackage,
  );
  if (replacement.status !== 'passed') return replacement;
  const profile = registry.profiles.find(candidate => candidate.profileId === job.profileId);
  const layout = layoutUnicodeCodePointsV001(
    titleMeaningPackage.title.text,
    {maxCharsPerLine: profile.maxLogicalWidth, maxLines: profile.maxLines,
      singleLine: false},
    registry.layoutRules.characterWidthRule,
  );
  if (layout.status !== 'passed') return {status: 'rejected', violations: layout.violations};
  const plan = {
    schemaVersion: ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001,
    planId: `${job.outputId}-title-plan`,
    jobBinding: clone(jobBinding),
    titleMeaningPackageBinding: clone(job.titleMeaningPackageBinding),
    sourceOutput: clone(job.sourceOutput),
    styleRegistryBinding: clone(job.styleRegistryBinding),
    profileId: job.profileId,
    format: profile.format,
    canvas: clone(profile.canvas),
    safeArea: clone(profile.safeArea),
    displayFrameRange: clone(profile.displayFrameRange),
    titleDisplay: {
      displayId: `${job.outputId}-title-display`,
      text: titleMeaningPackage.title.text,
      indexedLines: clone(layout.indexedLines),
      requestedProfileId: profile.profileId,
      appliedProfileId: profile.profileId,
      startFrame: profile.displayFrameRange.startFrame,
      endFrameExclusive: profile.displayFrameRange.endFrameExclusive,
      displayFrameCount: profile.displayFrameRange.endFrameExclusive
        - profile.displayFrameRange.startFrame,
    },
    sourceMeaningProjection: replacement.sourceProjection,
    titleMeaningProjection: replacement.titleProjection,
  };
  return validateZevoTitleDisplayPlanV001(plan, {
    job,
    registry,
    sourceMeaningPackage,
    titleMeaningPackage,
  }) ? {status: 'built', plan} : {status: 'rejected'};
}

export function buildZevoTitleCommonCorePlanV001({plan, registry}) {
  if (!validateZevoTitleDisplayPlanV001(plan, {registry})) {
    return {status: 'rejected'};
  }
  const profile = registry.profiles.find(candidate => candidate.profileId === plan.profileId);
  const display = plan.titleDisplay;
  return {
    status: 'built',
    plan: {
      schemaVersion: 'presentation-output-common-core-plan-v001',
      format: profile.format,
      canvas: {...clone(profile.canvas), safeAreaPx: clone(profile.safeArea)},
      layoutRules: clone(registry.layoutRules),
      elements: [{
        instructionId: display.displayId,
        kind: 'title-cover',
        text: display.text,
        indexedLines: clone(display.indexedLines),
        sourceStartMs: null,
        sourceEndMs: null,
        startFrame: display.startFrame,
        endFrameExclusive: display.endFrameExclusive,
        displayFrameCount: display.displayFrameCount,
        requestedProfileId: profile.profileId,
        appliedProfileId: profile.profileId,
        requestedPresetId: profile.profileId,
        appliedPresetId: profile.profileId,
        presetId: profile.profileId,
        registryVersion: registry.registryId,
        presetRegistryVersion: registry.registryId,
        stateId: profile.visualState.stateId,
        visualState: clone(profile.visualState),
        transition: null,
        timelineSegmentId: null,
        targetProvenance: {
          targetRefId: display.displayId,
          targetType: 'meaning-title',
          sourceAtomIds: [],
        },
        materialRefs: [],
      }],
    },
  };
}

const validApplicationResult = (value, plan) => exactKeys(value, [
  'instructionId', 'status', 'requestedPresetId', 'appliedPresetId',
  'appliedPresetRegistryVersion', 'stateId',
  'appliedOverlayPropsCanonicalSha256', 'overlayFile', 'overlaySha256',
  'finalPlanElementReference',
])
  && value.instructionId === plan.titleDisplay.displayId
  && value.status === 'rendered'
  && value.requestedPresetId === plan.profileId
  && value.appliedPresetId === plan.profileId
  && nonempty(value.appliedPresetRegistryVersion)
  && FORMAL_ID.test(value.stateId)
  && SHA256.test(value.appliedOverlayPropsCanonicalSha256)
  && WORKSPACE_PATH.test(value.overlayFile)
  && SHA256.test(value.overlaySha256)
  && exactKeys(value.finalPlanElementReference, [
    'planFile', 'instructionId', 'canonicalSha256',
  ])
  && nonempty(value.finalPlanElementReference.planFile)
  && value.finalPlanElementReference.instructionId === value.instructionId
  && SHA256.test(value.finalPlanElementReference.canonicalSha256);

const validRendererQc = value => exactKeys(value, [
  'schemaVersion', 'status', 'instructionCount', 'checks',
  'instructionEvidence', 'mediaEvidence', 'violations',
])
  && value.schemaVersion === 'presentation-render-qc-v002'
  && value.status === 'passed'
  && value.instructionCount === 1
  && exactKeys(value.checks, [
    'instructionApplication', 'layoutAndVisibility', 'media',
  ])
  && Object.values(value.checks).every(check => exactKeys(check, ['status'])
    && check.status === 'passed')
  && dense(value.instructionEvidence)
  && value.instructionEvidence.length === 1
  && isObject(value.mediaEvidence)
  && dense(value.violations)
  && value.violations.length === 0;

export function validateZevoTitleRendererEvidenceV001(value, context = {}) {
  if (!exactKeys(value, [
    'schemaVersion', 'evidenceId', 'planBinding', 'applicationResults',
    'rendererQc',
  ])
    || value.schemaVersion !== ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001
    || !FORMAL_ID.test(value.evidenceId)
    || !jsonBinding(value.planBinding, ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001)
    || !dense(value.applicationResults)
    || value.applicationResults.length !== 1
    || !validRendererQc(value.rendererQc)) return false;
  if (context.plan !== undefined) {
    if (!validateZevoTitleDisplayPlanV001(context.plan)
      || value.evidenceId !== `${context.plan.planId}-renderer-evidence`
      || !value.applicationResults.every(result => validApplicationResult(
        result,
        context.plan,
      ))
      || value.rendererQc.instructionEvidence[0]?.instructionId
        !== context.plan.titleDisplay.displayId) return false;
  }
  return true;
}

export function buildZevoTitleRendererEvidenceV001({
  plan,
  planBinding,
  applicationResults,
  rendererQc,
}) {
  if (!validateZevoTitleDisplayPlanV001(plan)
    || !jsonBinding(planBinding, ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001)) {
    return {status: 'rejected'};
  }
  const evidence = {
    schemaVersion: ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001,
    evidenceId: `${plan.planId}-renderer-evidence`,
    planBinding: clone(planBinding),
    applicationResults: clone(applicationResults),
    rendererQc: clone(rendererQc),
  };
  return validateZevoTitleRendererEvidenceV001(evidence, {plan})
    ? {status: 'built', evidence}
    : {status: 'rejected'};
}

const validQcChecks = value => exactKeys(value, ZEVO_TITLE_OUTPUT_QC_CHECKS_V001)
  && ZEVO_TITLE_OUTPUT_QC_CHECKS_V001.every(name => value[name] === 'passed');

const validQcEvidence = value => exactKeys(value, [
  'sourceVideoFileSha256', 'outputVideoFileSha256',
  'titleTextCanonicalSha256', 'titleDisplayCount',
  'sourceFrameCount', 'outputFrameCount',
  'sourceAudioPacketPayloadSha256', 'outputAudioPacketPayloadSha256',
])
  && [value.sourceVideoFileSha256, value.outputVideoFileSha256,
    value.titleTextCanonicalSha256, value.sourceAudioPacketPayloadSha256,
    value.outputAudioPacketPayloadSha256].every(candidate => SHA256.test(candidate))
  && value.titleDisplayCount === 1
  && positive(value.sourceFrameCount)
  && value.outputFrameCount === value.sourceFrameCount
  && value.outputAudioPacketPayloadSha256
    === value.sourceAudioPacketPayloadSha256;

export function validateZevoTitleOutputQcV001(value, context = {}) {
  if (!exactKeys(value, [
    'schemaVersion', 'qcId', 'status', 'jobBinding', 'planBinding',
    'rendererEvidenceBinding', 'outputVideo', 'checks', 'evidence',
  ])
    || value.schemaVersion !== ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001
    || !FORMAL_ID.test(value.qcId)
    || value.status !== 'passed'
    || !jsonBinding(value.jobBinding, ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001)
    || !jsonBinding(value.planBinding, ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001)
    || !jsonBinding(value.rendererEvidenceBinding,
      ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001)
    || !mediaBinding(value.outputVideo)
    || !validQcChecks(value.checks)
    || !validQcEvidence(value.evidence)) return false;
  if (context.outputId !== undefined
    && value.qcId !== `${context.outputId}-title-qc`) return false;
  if (context.job !== undefined
    && value.evidence.sourceVideoFileSha256
      !== context.job.sourceOutput.video.fileSha256) return false;
  if (context.plan !== undefined
    && value.evidence.titleTextCanonicalSha256
      !== canonicalSha256ZevoTitleJsonV001(context.plan.titleDisplay.text)) return false;
  return true;
}

export function buildZevoTitleOutputQcV001({
  job,
  jobBinding,
  plan,
  planBinding,
  rendererEvidenceBinding,
  rendererEvidence,
  outputVideo,
  sourceMedia,
  outputMedia,
}) {
  if (!validateZevoTitleOutputJobV001(job)
    || !validateZevoTitleDisplayPlanV001(plan, {job})
    || !jsonBinding(jobBinding, ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001)
    || !jsonBinding(planBinding, ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001)
    || !jsonBinding(rendererEvidenceBinding,
      ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001)
    || !validateZevoTitleRendererEvidenceV001(rendererEvidence, {plan})
    || !mediaBinding(outputVideo)
    || !positive(sourceMedia?.frameCount)
    || outputMedia?.frameCount !== sourceMedia.frameCount
    || !SHA256.test(sourceMedia?.audioPacketPayloadSha256)
    || outputMedia?.audioPacketPayloadSha256
      !== sourceMedia.audioPacketPayloadSha256) return {status: 'rejected'};
  const qc = {
    schemaVersion: ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001,
    qcId: `${job.outputId}-title-qc`,
    status: 'passed',
    jobBinding: clone(jobBinding),
    planBinding: clone(planBinding),
    rendererEvidenceBinding: clone(rendererEvidenceBinding),
    outputVideo: clone(outputVideo),
    checks: Object.fromEntries(
      ZEVO_TITLE_OUTPUT_QC_CHECKS_V001.map(name => [name, 'passed']),
    ),
    evidence: {
      sourceVideoFileSha256: job.sourceOutput.video.fileSha256,
      outputVideoFileSha256: outputVideo.fileSha256,
      titleTextCanonicalSha256:
        canonicalSha256ZevoTitleJsonV001(plan.titleDisplay.text),
      titleDisplayCount: 1,
      sourceFrameCount: sourceMedia.frameCount,
      outputFrameCount: outputMedia.frameCount,
      sourceAudioPacketPayloadSha256: sourceMedia.audioPacketPayloadSha256,
      outputAudioPacketPayloadSha256: outputMedia.audioPacketPayloadSha256,
    },
  };
  return validateZevoTitleOutputQcV001(qc, {job, plan, outputId: job.outputId})
    ? {status: 'built', qc}
    : {status: 'rejected'};
}

export function validateZevoTitleOutputManifestV001(value, context = {}) {
  if (!exactKeys(value, [
    'schemaVersion', 'manifestId', 'status', 'jobBinding',
    'titleMeaningPackageBinding', 'sourceOutput', 'styleRegistryBinding',
    'profileId', 'planBinding', 'rendererEvidenceBinding', 'qcBinding', 'video',
    'runtimeProfile', 'implementationBindings',
  ])
    || value.schemaVersion !== ZEVO_TITLE_OUTPUT_MANIFEST_SCHEMA_V001
    || !FORMAL_ID.test(value.manifestId)
    || value.status !== 'passed'
    || !jsonBinding(value.jobBinding, ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001)
    || !jsonBinding(value.titleMeaningPackageBinding,
      'zev-meaning-information-package-v001')
    || !validSourceOutput(value.sourceOutput)
    || !jsonBinding(value.styleRegistryBinding,
      ZEVO_TITLE_STYLE_REGISTRY_SCHEMA_V001)
    || !FORMAL_ID.test(value.profileId)
    || !jsonBinding(value.planBinding, ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001)
    || !jsonBinding(value.rendererEvidenceBinding,
      ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001)
    || !jsonBinding(value.qcBinding, ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001)
    || !mediaBinding(value.video)
    || !validRuntimeProfile(value.runtimeProfile)
    || !dense(value.implementationBindings)
    || value.implementationBindings.length === 0
    || !value.implementationBindings.every(
      validatePresentationMeaningImplementationBindingV001,
    )) return false;
  if (context.job !== undefined) {
    if (!validateZevoTitleOutputJobV001(context.job)
      || value.manifestId !== `${context.job.outputId}-title-manifest`
      || !same(value.titleMeaningPackageBinding,
        context.job.titleMeaningPackageBinding)
      || !same(value.sourceOutput, context.job.sourceOutput)
      || !same(value.styleRegistryBinding, context.job.styleRegistryBinding)
      || value.profileId !== context.job.profileId
      || !same(value.runtimeProfile, context.job.runtimeProfile)
      || !same(value.implementationBindings,
        context.job.implementationBindings)) return false;
  }
  if (context.qc !== undefined
    && (!validateZevoTitleOutputQcV001(context.qc)
      || !same(value.jobBinding, context.qc.jobBinding)
      || !same(value.planBinding, context.qc.planBinding)
      || !same(value.rendererEvidenceBinding,
        context.qc.rendererEvidenceBinding)
      || !same(value.video, context.qc.outputVideo))) return false;
  return true;
}

export function buildZevoTitleOutputManifestV001({
  job,
  jobBinding,
  planBinding,
  rendererEvidenceBinding,
  qcBinding,
  qc,
}) {
  if (!validateZevoTitleOutputJobV001(job)
    || !jsonBinding(jobBinding, ZEVO_TITLE_OUTPUT_JOB_SCHEMA_V001)
    || !jsonBinding(planBinding, ZEVO_TITLE_DISPLAY_PLAN_SCHEMA_V001)
    || !jsonBinding(rendererEvidenceBinding,
      ZEVO_TITLE_RENDERER_EVIDENCE_SCHEMA_V001)
    || !jsonBinding(qcBinding, ZEVO_TITLE_OUTPUT_QC_SCHEMA_V001)
    || !validateZevoTitleOutputQcV001(qc, {job, outputId: job.outputId})) {
    return {status: 'rejected'};
  }
  const manifest = {
    schemaVersion: ZEVO_TITLE_OUTPUT_MANIFEST_SCHEMA_V001,
    manifestId: `${job.outputId}-title-manifest`,
    status: 'passed',
    jobBinding: clone(jobBinding),
    titleMeaningPackageBinding: clone(job.titleMeaningPackageBinding),
    sourceOutput: clone(job.sourceOutput),
    styleRegistryBinding: clone(job.styleRegistryBinding),
    profileId: job.profileId,
    planBinding: clone(planBinding),
    rendererEvidenceBinding: clone(rendererEvidenceBinding),
    qcBinding: clone(qcBinding),
    video: clone(qc.outputVideo),
    runtimeProfile: clone(job.runtimeProfile),
    implementationBindings: clone(job.implementationBindings),
  };
  return validateZevoTitleOutputManifestV001(manifest, {job, qc})
    ? {status: 'built', manifest}
    : {status: 'rejected'};
}
