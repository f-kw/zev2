import {createHash} from 'node:crypto';
import path from 'node:path';

import {
  PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001,
  evaluatePresentationRendererLayoutRulesV001,
  evaluatePresentationRendererTrustRootV001,
  evaluatePresentationRendererTrustedArtifactV001,
  resolvePresentationLandscapePresetProjectionV001,
} from './presentation_renderer_plan_v002.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  buildPresentationVerticalCropFilterV001,
  buildPresentationVerticalOverlayAdapterV001,
  inspectPresentationVerticalTextLayoutV001,
  resolvePresentationVerticalPresetProjectionV001,
  validatePresentationVerticalCropDecisionV001,
  validatePresentationVerticalCropSourceBindingV001,
  validatePresentationVerticalRendererTrustV001,
} from './render_presentation_vertical_review_v001.ts';
import {inspectPresentationPresetLayoutV001} from './inspect_presentation_preset_layout.ts';

export const PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001 =
  'U+0000..U+00FF=1; other Unicode code point=2';

export const PRESENTATION_OUTPUT_FORMATS_V001 = Object.freeze([
  'normal-landscape',
  'vertical-short-1080x1920',
] as const);

export const PRESENTATION_OUTPUT_SCREEN_LAYOUT_VOCABULARY_V001 = Object.freeze([
  'speaker_only',
  'screen_speaker',
  'speaker_pair',
] as const);

type JsonObject = Record<string, any>;

const isObject = (value: unknown): value is JsonObject => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);
const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0
);
const isPositiveSafeInteger = (value: unknown): value is number => (
  Number.isSafeInteger(value) && Number(value) > 0
);
const exactKeys = (value: unknown, keys: readonly string[]) => (
  isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index])
);
const sameJson = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const canonicalSha256 = (value: unknown) => createHash('sha256')
  .update(canonicalJson(value))
  .digest('hex');

const makeViolation = (code: string, pointer: string, relatedIds: string[] = []) => ({
  code,
  path: pointer,
  relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
});

const FORMAT_SCHEMAS = Object.freeze({
  'normal-landscape': Object.freeze({
    trustedRegistryBindings: 'presentation-registry-trust-v001',
    presetRegistry: 'presentation-preset-registry-v001',
    presetValidationIndex: 'normal-landscape-preset-registry-v001',
    materialValidationIndex: 'presentation-material-registry-empty-v001',
    rendererTrust: 'presentation-renderer-trust-v001',
  }),
  'vertical-short-1080x1920': Object.freeze({
    trustedRegistryBindings: 'presentation-registry-trust-v002',
    presetRegistry: 'presentation-preset-registry-v002',
    presetValidationIndex: 'vertical-short-preset-registry-v001',
    materialValidationIndex: 'presentation-material-registry-empty-v001',
    rendererTrust: 'presentation-vertical-renderer-trust-v001',
  }),
});

const LANDSCAPE_RENDERER_TRUST_PATH_V001 =
  'evals/clip_composition/registries/presentation/'
  + 'presentation-renderer-trust-v001/trust.json';

export type PresentationOutputResolvedStyleV001 = {
  format: 'normal-landscape' | 'vertical-short-1080x1920';
  screenLayoutId: null | 'speaker_only' | 'screen_speaker' | 'speaker_pair';
  presetId: string;
  visualStateId: string;
  maxLogicalWidthPerLine: number;
  maxLinesPerDisplayPage: number;
  characterWidthRule: typeof PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001;
  cropMode: 'identity' | 'bound-decision';
  sceneTransitionMode: 'straight-cut-only';
  audioMode: 'preserve-source-only';
};

export type PresentationOutputStyleArtifactsV001 = {
  trustedRegistryBindings: JsonObject;
  presetRegistry: JsonObject;
  presetValidationIndex: JsonObject;
  materialValidationIndex: JsonObject;
  rendererTrust: JsonObject;
  cropDecisionArtifact?: {
    path: string;
    absolutePath: string;
    bytes: Buffer;
    value: JsonObject;
  };
  cropSelectionPackageManifest?: {
    path: string;
    absolutePath: string;
    bytes: Buffer;
    value: JsonObject;
  };
};

const bindingSchemaMatches = (
  binding: unknown,
  artifact: unknown,
  expected: string,
  registryVersion: boolean,
) => (
  isObject(binding)
  && isObject(artifact)
  && binding.schemaVersion === expected
  && (registryVersion
    ? artifact.registryVersion === expected
    : artifact.schemaVersion === expected)
);

const resolveCaptionPolicy = (preset: JsonObject) => {
  if (!Array.isArray(preset.kindPolicies)) return null;
  const policies = preset.kindPolicies.filter(
    (entry: unknown) => isObject(entry) && entry.kind === 'speech-caption',
  );
  return policies.length === 1 ? policies[0] : null;
};

/**
 * 横型のrequest自身が宣言したSHAを信頼根にしない。既存rendererの固定trust判定と
 * artifact判定を共用し、固定trustが束縛したregistry／indexだけを受理する。
 */
const validateLandscapeTrustArtifacts = (
  presetBinding: JsonObject,
  artifacts: PresentationOutputStyleArtifactsV001,
) => {
  const trust = artifacts.rendererTrust;
  const trustRoot = evaluatePresentationRendererTrustRootV001({
    trust,
    actualCanonicalSha256: canonicalSha256(trust),
  });
  if (trustRoot.status !== 'passed') return false;

  const registryDirectory = path.posix.dirname(trust.registryBinding?.path ?? '');
  const fixedPaths = {
    trustedRegistryBindings: trust.registryBinding?.path,
    presetRegistry: trust.presetRegistry?.path,
    presetValidationIndex: path.posix.join(registryDirectory, 'preset-validation-index.json'),
    materialValidationIndex: path.posix.join(registryDirectory, 'material-validation-index.json'),
    rendererTrust: LANDSCAPE_RENDERER_TRUST_PATH_V001,
  };
  if (Object.entries(fixedPaths).some(([role, expectedPath]) => (
    !isNonEmptyString(expectedPath)
    || presetBinding[role]?.path !== expectedPath
  ))) return false;

  const presetRegistry = evaluatePresentationRendererTrustedArtifactV001({
    artifactType: 'preset-registry',
    expected: trust.presetRegistry,
    observed: {
      fileSha256: presetBinding.presetRegistry.fileSha256,
      canonicalSha256: canonicalSha256(artifacts.presetRegistry),
    },
    path: '$.presetRegistry',
  });
  const registryBinding = evaluatePresentationRendererTrustedArtifactV001({
    artifactType: 'registry-binding',
    expected: trust.registryBinding,
    observed: {
      fileSha256: presetBinding.trustedRegistryBindings.fileSha256,
      canonicalSha256: canonicalSha256(artifacts.trustedRegistryBindings),
    },
    path: '$.registryBinding',
  });
  if (presetRegistry.status !== 'passed' || registryBinding.status !== 'passed') return false;

  const trusted = artifacts.trustedRegistryBindings;
  if (!exactKeys(trusted, [
    'schemaVersion',
    'presetRegistryVersion',
    'presetValidationIndexSha256',
    'materialRegistryVersion',
    'materialValidationIndexSha256',
  ])
    || trusted.schemaVersion !== 'presentation-registry-trust-v001'
    || trusted.presetRegistryVersion !== artifacts.presetRegistry.registryVersion
    || trusted.presetRegistryVersion !== artifacts.presetValidationIndex.registryVersion
    || trusted.materialRegistryVersion !== artifacts.materialValidationIndex.registryVersion
    || trusted.presetValidationIndexSha256
      !== canonicalSha256(artifacts.presetValidationIndex)
    || trusted.materialValidationIndexSha256
      !== canonicalSha256(artifacts.materialValidationIndex)) return false;

  return evaluatePresentationRendererLayoutRulesV001(
    trust.layoutRules,
    PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001,
  ).status === 'passed';
};

const resolveCropSelectionManifestPath = (
  decisionPath: string,
  manifestPath: string,
) => path.posix.dirname(manifestPath) === '.'
  ? path.posix.normalize(path.posix.join(path.posix.dirname(decisionPath), manifestPath))
  : path.posix.normalize(manifestPath);

/**
 * 新しいforward-only出力経路のstyleを一意に解決する。
 * `resolvedStyle`は親契約§7.2のexact 10 keyそのものであり、O04/O06/O07が
 * 同じobjectを共用する。renderContextは描画coreへ渡す既存台帳実体の保持だけを担う。
 */
export async function resolvePresentationOutputStyleV001({
  styleInput,
  artifacts,
  baseMediaBinding,
  baseMediaInspection,
  runtimeProfile,
  implementationBindings,
}: {
  styleInput: unknown;
  artifacts: PresentationOutputStyleArtifactsV001;
  baseMediaBinding: {path: string; fileSha256: string};
  baseMediaInspection: {
    width: number;
    height: number;
    frameCount: number;
    fps: number;
  } | null;
  runtimeProfile?: unknown;
  implementationBindings?: unknown;
}): Promise<{
  status: 'resolved';
  resolvedStyle: PresentationOutputResolvedStyleV001;
  layoutContext: JsonObject;
  cropContext: JsonObject;
} | {
  status: 'rejected';
  violations: Array<{code: string; path: string; relatedIds: string[]}>;
  resolvedStyle?: PresentationOutputResolvedStyleV001;
  layoutContext?: JsonObject;
  cropContext?: null;
}> {
  const violations: Array<{code: string; path: string; relatedIds: string[]}> = [];
  const reject = (code: string, pointer: string, ids: string[] = []) => {
    violations.push(makeViolation(code, pointer, ids));
  };
  if (!exactKeys(styleInput, [
    'format',
    'screenLayoutId',
    'presetBinding',
    'captionLayoutPolicy',
    'cropPolicy',
    'sceneTransitionPolicy',
    'audioPolicy',
    'materials',
  ])) {
    return {status: 'rejected', violations: [makeViolation('STYLE_BINDING_MISMATCH', '/styleInput')]};
  }
  const format = styleInput.format;
  if (!(format in FORMAT_SCHEMAS)) {
    return {status: 'rejected', violations: [makeViolation('STYLE_BINDING_MISMATCH', '/styleInput/format')]};
  }
  const schemaSet = FORMAT_SCHEMAS[format as keyof typeof FORMAT_SCHEMAS];
  if (!exactKeys(styleInput.presetBinding, [
    'trustedRegistryBindings',
    'presetRegistry',
    'presetValidationIndex',
    'materialValidationIndex',
    'rendererTrust',
    'presetId',
  ])) reject('STYLE_BINDING_MISMATCH', '/styleInput/presetBinding');

  const presetBinding = isObject(styleInput.presetBinding) ? styleInput.presetBinding : {};
  for (const [role, expected] of Object.entries(schemaSet)) {
    const registryVersion = role === 'presetValidationIndex' || role === 'materialValidationIndex';
    if (!bindingSchemaMatches(presetBinding[role], artifacts?.[role as keyof PresentationOutputStyleArtifactsV001], expected, registryVersion)) {
      reject('STYLE_BINDING_MISMATCH', `/styleInput/presetBinding/${role}`);
    }
  }
  if (!isNonEmptyString(presetBinding.presetId)) {
    reject('PRESET_CAPABILITY_MISMATCH', '/styleInput/presetBinding/presetId');
  }
  if (!exactKeys(styleInput.captionLayoutPolicy, [
    'maxLogicalWidthPerLine',
    'maxLinesPerDisplayPage',
    'characterWidthRule',
    'pageBreakPolicy',
  ])) reject('STYLE_BINDING_MISMATCH', '/styleInput/captionLayoutPolicy');
  const captionPolicy = isObject(styleInput.captionLayoutPolicy)
    ? styleInput.captionLayoutPolicy
    : {};
  if (
    !isPositiveSafeInteger(captionPolicy.maxLogicalWidthPerLine)
    || !isPositiveSafeInteger(captionPolicy.maxLinesPerDisplayPage)
    || captionPolicy.maxLinesPerDisplayPage > 99
    || captionPolicy.characterWidthRule !== PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001
    || captionPolicy.pageBreakPolicy !== 'split-at-source-atom-boundary-or-reject'
  ) reject('PRESET_CAPABILITY_MISMATCH', '/styleInput/captionLayoutPolicy');
  if (!sameJson(styleInput.sceneTransitionPolicy, {mode: 'straight-cut-only'})) {
    reject('STYLE_BINDING_MISMATCH', '/styleInput/sceneTransitionPolicy');
  }
  if (!sameJson(styleInput.audioPolicy, {mode: 'preserve-source-only'})) {
    reject('STYLE_BINDING_MISMATCH', '/styleInput/audioPolicy');
  }
  if (!Array.isArray(styleInput.materials) || styleInput.materials.length !== 0) {
    reject('STYLE_BINDING_MISMATCH', '/styleInput/materials');
  }
  if (violations.length > 0) return {status: 'rejected', violations};

  let preset: JsonObject;
  let policy: JsonObject;
  let visualState: JsonObject;
  let transition: JsonObject;
  let canvas: JsonObject;
  let layoutRules: JsonObject;
  let overlayAdapter: unknown = null;
  let cropResolution: JsonObject = {mode: 'identity'};
  let failureCode = 'PRESET_CAPABILITY_MISMATCH';
  let failurePath = '/styleInput/presetBinding';

  try {
    if (format === 'normal-landscape') {
      if (styleInput.screenLayoutId !== null || !sameJson(styleInput.cropPolicy, {mode: 'identity'})) {
        throw new TypeError('landscape style requires null layout and identity crop');
      }
      failureCode = 'STYLE_BINDING_MISMATCH';
      failurePath = '/styleInput/presetBinding';
      if (!validateLandscapeTrustArtifacts(presetBinding, artifacts)) {
        throw new TypeError('landscape trust or registry index is invalid');
      }
      failureCode = 'PRESET_CAPABILITY_MISMATCH';
      failurePath = '/styleInput/presetBinding/presetId';
      const projection = resolvePresentationLandscapePresetProjectionV001(
        artifacts.presetRegistry,
        presetBinding.presetId,
        'speech-caption',
      );
      if (!projection) throw new TypeError('landscape caption preset is unresolved');
      ({preset, policy, visualState, transition} = projection);
      if (resolveCaptionPolicy(preset) !== policy) {
        throw new TypeError('landscape caption policy is not unique');
      }
      canvas = structuredClone(artifacts.presetRegistry.canvas);
      layoutRules = structuredClone(artifacts.rendererTrust.layoutRules);
      if (
        !isObject(visualState.layout)
        || !isPositiveSafeInteger(visualState.layout.maxCharsPerLine)
        || !isPositiveSafeInteger(visualState.layout.maxLines)
        || captionPolicy.maxLogicalWidthPerLine > visualState.layout.maxCharsPerLine
        || captionPolicy.maxLinesPerDisplayPage > visualState.layout.maxLines
        || artifacts.rendererTrust.layoutRules?.characterWidthRule
          !== captionPolicy.characterWidthRule
      ) throw new TypeError('landscape preset cannot satisfy caption policy');
    } else {
      if (
        !PRESENTATION_OUTPUT_SCREEN_LAYOUT_VOCABULARY_V001.includes(styleInput.screenLayoutId)
        || styleInput.screenLayoutId !== 'speaker_only'
        || !exactKeys(styleInput.cropPolicy, [
          'mode', 'scope', 'decision', 'selectionPackageManifest',
        ])
        || styleInput.cropPolicy.mode !== 'bound-decision'
        || styleInput.cropPolicy.scope !== 'all-segments'
      ) throw new TypeError('vertical layout or crop is not registered');
      const registeredPreset = artifacts.presetRegistry.presets?.find(
        (entry: unknown) => isObject(entry) && entry.presetId === presetBinding.presetId,
      );
      policy = resolveCaptionPolicy(registeredPreset) as JsonObject;
      if (!registeredPreset || !policy) throw new TypeError('vertical caption policy is unresolved');
      const projection = resolvePresentationVerticalPresetProjectionV001(
        artifacts.presetRegistry,
        presetBinding.presetId,
        policy.stateId,
      );
      preset = registeredPreset;
      visualState = projection.visualState;
      transition = artifacts.presetRegistry.transitions?.find(
        (entry: unknown) => isObject(entry)
          && entry.transitionId === visualState.transitionId,
      );
      canvas = structuredClone(projection.canvas);
      layoutRules = {
        maxLogicalWidthPerLine: styleInput.captionLayoutPolicy.maxLogicalWidthPerLine,
        maxLinesPerMeaningGroup: styleInput.captionLayoutPolicy.maxLinesPerDisplayPage,
        characterWidthRule: styleInput.captionLayoutPolicy.characterWidthRule,
      };
      if (
        preset.screenLayoutId !== styleInput.screenLayoutId
        || !isObject(transition)
        || captionPolicy.maxLogicalWidthPerLine
          > visualState.layout.maxSupportedLogicalWidthPerLine
        || captionPolicy.maxLinesPerDisplayPage > visualState.layout.maxLines
        || visualState.layout.characterWidthRule !== captionPolicy.characterWidthRule
      ) throw new TypeError('vertical preset cannot satisfy caption policy');

      failureCode = 'CROP_BINDING_MISMATCH';
      failurePath = '/styleInput/cropPolicy';
      if (baseMediaInspection === null) {
        throw new TypeError('vertical crop inspection is unavailable');
      }
      const decisionArtifact = artifacts.cropDecisionArtifact;
      const selectionArtifact = artifacts.cropSelectionPackageManifest;
      if (!decisionArtifact || !isObject(decisionArtifact.value)
        || !selectionArtifact || !isObject(selectionArtifact.value)) {
        throw new TypeError('vertical crop decision artifact is missing');
      }
      const selectionProvenance = decisionArtifact.value.provenance?.selectionPackageManifest;
      if (
        !sameJson(styleInput.cropPolicy.decision, {
          schemaVersion: 'vertical-preset-type-crop-decision-v006',
          path: decisionArtifact.path,
          fileSha256: styleInput.cropPolicy.decision.fileSha256,
          canonicalSha256: styleInput.cropPolicy.decision.canonicalSha256,
        })
        || styleInput.cropPolicy.selectionPackageManifest.schemaVersion
          !== 'vertical-preset-type-crop-selection-package-v006'
        || styleInput.cropPolicy.selectionPackageManifest.path !== selectionArtifact.path
        || !isObject(selectionProvenance)
        || !isNonEmptyString(selectionProvenance.path)
        || selectionProvenance.fileSha256
          !== styleInput.cropPolicy.selectionPackageManifest.fileSha256
        || resolveCropSelectionManifestPath(
          decisionArtifact.path,
          selectionProvenance.path,
        ) !== styleInput.cropPolicy.selectionPackageManifest.path
      ) throw new TypeError('vertical crop binding schema is invalid');
      const decisionReport = validatePresentationVerticalCropDecisionV001(decisionArtifact.value);
      if (decisionReport.status !== 'passed') throw new TypeError('vertical crop decision is invalid');
      const sourceReport = await validatePresentationVerticalCropSourceBindingV001({
        cropDecisionArtifact: decisionArtifact as any,
        baseMediaBinding,
      });
      if (sourceReport.status !== 'passed') throw new TypeError('vertical crop source differs');
      if (decisionArtifact.value.selectedPlan?.screenLayoutId !== styleInput.screenLayoutId) {
        throw new TypeError('vertical crop layout differs');
      }
      const filterReport = await buildPresentationVerticalCropFilterV001({
        cropDecision: decisionArtifact.value,
        sourceWidth: baseMediaInspection.width,
        sourceHeight: baseMediaInspection.height,
        frameCount: baseMediaInspection.frameCount,
        fps: baseMediaInspection.fps,
      });
      if (filterReport.status !== 'passed') throw new TypeError('vertical crop filter failed');
      cropResolution = {
        mode: 'bound-decision',
        screenLayoutId: filterReport.screenLayoutId,
        filter: filterReport.filter,
        filterCanonicalSha256: filterReport.filterCanonicalSha256,
        selectionPackageManifestBinding: {
          path: selectionArtifact.path,
          fileSha256: selectionProvenance.fileSha256,
        },
      };
      failureCode = 'STYLE_BINDING_MISMATCH';
      failurePath = '/styleInput/presetBinding/rendererTrust';
      if (runtimeProfile !== undefined && implementationBindings !== undefined) {
        const trustReport = await validatePresentationVerticalRendererTrustV001({
          trust: artifacts.rendererTrust,
          presetRegistry: artifacts.presetRegistry,
          runtimeProfile,
          implementationBindings,
        });
        if (trustReport.status !== 'passed') {
          throw new TypeError('vertical renderer trust is invalid');
        }
      }
      if (runtimeProfile !== undefined) {
        overlayAdapter = buildPresentationVerticalOverlayAdapterV001(
          artifacts.presetRegistry,
          {
            nodePath: ((runtimeProfile as JsonObject).node as JsonObject).path,
            remotionCliPath: ((runtimeProfile as JsonObject).remotion as JsonObject).path,
            browserExecutablePath: ((runtimeProfile as JsonObject).browser as JsonObject).path,
          },
        );
      }
    }
  } catch {
    if (
      failureCode === 'CROP_BINDING_MISMATCH'
      && isObject(preset)
      && isObject(policy)
      && isObject(visualState)
      && isObject(transition)
      && isObject(canvas)
      && isObject(layoutRules)
    ) {
      const resolvedStyle: PresentationOutputResolvedStyleV001 = {
        format,
        screenLayoutId: styleInput.screenLayoutId,
        presetId: preset.presetId,
        visualStateId: visualState.stateId,
        maxLogicalWidthPerLine: styleInput.captionLayoutPolicy.maxLogicalWidthPerLine,
        maxLinesPerDisplayPage: styleInput.captionLayoutPolicy.maxLinesPerDisplayPage,
        characterWidthRule: styleInput.captionLayoutPolicy.characterWidthRule,
        cropMode: styleInput.cropPolicy.mode,
        sceneTransitionMode: styleInput.sceneTransitionPolicy.mode,
        audioMode: styleInput.audioPolicy.mode,
      };
      return {
        status: 'rejected',
        violations: [makeViolation(failureCode, failurePath, [presetBinding.presetId])],
        resolvedStyle,
        layoutContext: {
          format,
          resolvedStyle,
          presetRegistry: artifacts.presetRegistry,
          presetRegistryBinding: styleInput.presetBinding.presetRegistry,
          presetRegistryVersion: artifacts.presetRegistry.registryVersion,
          preset,
          policy,
          visualState,
          transition,
          canvas,
          layoutRules,
          overlayAdapter,
        },
        cropContext: null,
      };
    }
    return {
      status: 'rejected',
      violations: [makeViolation(
        failureCode,
        failurePath,
        [presetBinding.presetId],
      )],
    };
  }

  const resolvedStyle: PresentationOutputResolvedStyleV001 = {
    format,
    screenLayoutId: styleInput.screenLayoutId,
    presetId: preset.presetId,
    visualStateId: visualState.stateId,
    maxLogicalWidthPerLine: styleInput.captionLayoutPolicy.maxLogicalWidthPerLine,
    maxLinesPerDisplayPage: styleInput.captionLayoutPolicy.maxLinesPerDisplayPage,
    characterWidthRule: styleInput.captionLayoutPolicy.characterWidthRule,
    cropMode: styleInput.cropPolicy.mode,
    sceneTransitionMode: styleInput.sceneTransitionPolicy.mode,
    audioMode: styleInput.audioPolicy.mode,
  };
  return {
    status: 'resolved',
    resolvedStyle,
    layoutContext: {
      format,
      resolvedStyle,
      presetRegistry: artifacts.presetRegistry,
      presetRegistryBinding: styleInput.presetBinding.presetRegistry,
      presetRegistryVersion: artifacts.presetRegistry.registryVersion,
      preset,
      policy,
      visualState,
      transition,
      canvas,
      layoutRules,
      overlayAdapter,
    },
    cropContext: cropResolution,
  };
}

/**
 * O04が使用する唯一の物理page検査入口。横縦を明示dispatchし、両formatで
 * 既存の実配置計算を呼ぶ。job/testから別のlayout関数を注入しない。
 */
export async function inspectPresentationOutputDisplayPageV001({
  layoutContext,
  indexedLines,
  pageId,
}: {
  layoutContext: JsonObject;
  indexedLines: Array<{
    lineIndex: number;
    renderedText: string;
    atomRefs?: unknown[];
    logicalWidth?: number;
  }>;
  pageId: string;
}) {
  if (
    !isObject(layoutContext)
    || !Array.isArray(indexedLines)
    || indexedLines.length < 1
    || !isNonEmptyString(pageId)
    || indexedLines.some((line, index) => (
      !isObject(line)
      || line.lineIndex !== index
      || !isNonEmptyString(line.renderedText)
    ))
  ) {
    return {status: 'rejected' as const, violations: [
      makeViolation('DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE', '/indexedLines'),
    ]};
  }
  const text = indexedLines.map((line) => line.renderedText).join('');
  const explicitLayoutText = indexedLines.map((line) => line.renderedText).join('\n');
  const instructionId = pageId;
  try {
    if (layoutContext.format === 'normal-landscape') {
      const font = layoutContext.presetRegistry.fontAssets.find(
        (entry: unknown) => isObject(entry)
          && entry.fontAssetId === layoutContext.visualState.textStyle.fontAssetId,
      );
      if (!isObject(font)) throw new TypeError('landscape font is unresolved');
      const visualState = layoutContext.visualState;
      const result = inspectPresentationPresetLayoutV001({
        canvas: layoutContext.canvas,
        items: [{
          layerId: instructionId,
          stateId: visualState.stateId,
          // Layout inspection alone receives explicit LF boundaries. The formal meaning text
          // remains the byte-concatenated `text`, while the existing layout model is prevented
          // from silently choosing a different line boundary.
          text: explicitLayoutText,
          maxLines: visualState.layout.maxLines,
          props: {
            style: {
              fontFamily: font.fileName,
              fontSize: visualState.textStyle.fontSizePx,
              fontColor: visualState.textStyle.fontColor,
              borderColor: visualState.textStyle.borderColor,
              borderWidth: visualState.textStyle.borderWidthPx,
              lineSpacing: visualState.textStyle.lineSpacingPercent,
              glowColor: visualState.textStyle.glowColor,
              glowColorMode: 'fixed',
              glowWidth: visualState.textStyle.glowWidthPx,
              glowOpacity: visualState.textStyle.glowOpacityPercent,
            },
            position: {
              preset: visualState.position.preset,
              alignment: visualState.position.alignment,
              offsetX: visualState.position.offsetXPercent,
              offsetY: visualState.position.offsetYPercent,
            },
            maxCharsPerLine: layoutContext.resolvedStyle?.maxLogicalWidthPerLine
              ?? visualState.layout.maxCharsPerLine,
            singleLine: indexedLines.length === 1,
            width: layoutContext.canvas.width,
            height: layoutContext.canvas.height,
            glowSeedHint: instructionId,
          },
        }],
      });
      const item = result.items?.[0];
      const explicitLinesPreserved = item?.resolvedText === explicitLayoutText
        && item?.lineCount === indexedLines.length;
      return result.status === 'passed' && explicitLinesPreserved
        ? {status: 'passed' as const, violations: [], inspection: result}
        : {status: 'rejected' as const, violations: result.violations.length > 0
          ? result.violations
          : [makeViolation('DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE', '/indexedLines')]};
    }
    if (layoutContext.format === 'vertical-short-1080x1920') {
      const element = {
        instructionId,
        text,
        indexedLines: indexedLines.map((line) => ({
          lineIndex: line.lineIndex,
          renderedText: line.renderedText,
        })),
        appliedPresetId: layoutContext.preset.presetId,
        stateId: layoutContext.visualState.stateId,
        visualState: layoutContext.visualState,
      };
      const plan = {
        canvas: layoutContext.canvas,
        layoutRules: {
          maxLogicalWidthPerLine: layoutContext.layoutRules.maxLogicalWidthPerLine,
          maxLinesPerMeaningGroup: layoutContext.visualState.layout.maxLines,
        },
        elements: [element],
      };
      const result = await inspectPresentationVerticalTextLayoutV001({
        plan,
        presetRegistry: layoutContext.presetRegistry,
      });
      return result.status === 'passed'
        ? {status: 'passed' as const, violations: [], inspection: result}
        : {status: 'rejected' as const, violations: result.violations};
    }
  } catch (error) {
    // Resource exhaustion is not a physical-layout rejection.  The planner owns the
    // conversion of RangeError into OUTPUT_PLANNER_RESOURCE_EXHAUSTED, so preserve it.
    if (error instanceof RangeError) throw error;
    // The public ownership remains DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE; renderer-specific
    // diagnostics are memory-only and are not promoted to the acceptance code set.
  }
  return {status: 'rejected' as const, violations: [
    makeViolation('DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE', '/indexedLines'),
  ]};
}
