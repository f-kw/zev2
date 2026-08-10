import {createHash} from 'node:crypto';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {
  inspectFrameCountWithToolV001,
  runPresentationRendererChildProcessV001,
} from './render_presentation_v002.mjs';
import {
  inspectRenderedMediaWithToolsV001,
} from './presentation_renderer_qc_v002.mjs';
import {
  serializePresentationCaptionReport,
} from './presentation_caption_contract_v002.mjs';

export const PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001 =
  'diagnostic-full-frame-contain-v001';
export const PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_SCHEMA_V001 =
  'presentation-a-v002-vertical-caption-diagnostic-v001';
export const PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_REGISTRY_SCHEMA_V001 =
  'presentation-a-v002-vertical-caption-diagnostic-registry-v001';
export const PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001 =
  '字幕跨ぎ診断専用。正式preset、crop品質、公開品質を主張しない。';
export const PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_PATH_V001 =
  'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json';
export const PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_ID_V001 =
  'vertical-short-speaker-only-readable-pop-v001';

const SHA256 = /^[0-9a-f]{64}$/u;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;

export function buildPresentationAV002VerticalContainFilterV001({
  sourceWidth,
  sourceHeight,
  canvas,
}) {
  if (
    !positive(sourceWidth)
    || !positive(sourceHeight)
    || !exactKeys(canvas, ['width', 'height', 'fps', 'safeAreaPx'])
    || !positive(canvas.width)
    || !positive(canvas.height)
    || canvas.fps !== 30
  ) {
    throw new TypeError('vertical diagnostic source dimensions are invalid');
  }
  return {
    status: 'built',
    diagnosticId: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
    source: {width: sourceWidth, height: sourceHeight},
    output: {width: canvas.width, height: canvas.height, fps: canvas.fps},
    sourcePixelPolicy: 'contain-all-source-pixels-without-crop',
    filter:
      `scale=${canvas.width}:${canvas.height}:force_original_aspect_ratio=decrease:flags=lanczos,`
      + `pad=${canvas.width}:${canvas.height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`,
  };
}

export function buildPresentationAV002VerticalCaptionDiagnosticStyleV001({
  presetRegistry,
  presetRegistryBinding,
}) {
  if (
    !isObject(presetRegistry)
    || presetRegistry.schemaVersion !== 'presentation-preset-registry-v002'
    || presetRegistry.registryVersion !== 'vertical-short-preset-registry-v001'
    || presetRegistry.format !== 'vertical-short-1080x1920'
    || !exactKeys(presetRegistryBinding, ['path', 'fileSha256'])
    || presetRegistryBinding.path !== PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_PATH_V001
    || !SHA256.test(presetRegistryBinding.fileSha256)
  ) throw new TypeError('vertical diagnostic source preset binding is invalid');
  const serialized = Buffer.from(serializePresentationCaptionReport(presetRegistry), 'utf8');
  if (createHash('sha256').update(serialized).digest('hex') !== presetRegistryBinding.fileSha256) {
    throw new TypeError('vertical diagnostic source preset bytes do not match their binding');
  }
  const sourcePreset = presetRegistry.presets?.find(entry => (
    isObject(entry)
    && entry.presetId === PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_ID_V001
    && entry.screenLayoutId === 'speaker_only'
  ));
  const sourcePolicy = sourcePreset?.kindPolicies?.find(entry => (
    isObject(entry) && entry.kind === 'speech-caption'
  ));
  const sourceVisualState = sourcePreset?.visualStates?.find(entry => (
    isObject(entry) && entry.stateId === sourcePolicy?.stateId
  ));
  if (
    !isObject(sourcePreset)
    || !isObject(sourcePolicy)
    || !isObject(sourceVisualState)
    || !isObject(sourceVisualState.layout)
    || !positive(sourceVisualState.layout.maxSupportedLogicalWidthPerLine)
    || !positive(sourceVisualState.layout.maxLines)
    || !isObject(presetRegistry.canvas)
    || !isObject(presetRegistry.canvas.safeAreaPx)
  ) throw new TypeError('vertical diagnostic source preset projection is unresolved');
  const visualState = structuredClone(sourceVisualState);
  const fontAssetId = visualState.textStyle?.fontAssetId;
  const fontAsset = presetRegistry.fontAssets?.find(entry => (
    isObject(entry) && entry.fontAssetId === fontAssetId
  ));
  if (!isObject(fontAsset)) throw new TypeError('vertical diagnostic font asset is unresolved');
  const canvas = structuredClone(presetRegistry.canvas);
  const safeAreaPx = structuredClone(canvas.safeAreaPx);
  const transition = presetRegistry.transitions?.find(entry => (
    isObject(entry) && entry.transitionId === visualState.transitionId
  ));
  if (!isObject(transition)) throw new TypeError('vertical diagnostic transition is unresolved');
  const layoutRules = {
    maxLogicalWidthPerLine: visualState.layout.maxSupportedLogicalWidthPerLine,
    maxLinesPerMeaningGroup: visualState.layout.maxLines,
    characterWidthRule: visualState.layout.characterWidthRule,
  };
  const resolvedStyle = {
    format: 'vertical-short-1080x1920',
    screenLayoutId: null,
    presetId: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
    visualStateId: visualState.stateId,
    maxLogicalWidthPerLine: layoutRules.maxLogicalWidthPerLine,
    maxLinesPerDisplayPage: layoutRules.maxLinesPerMeaningGroup,
    characterWidthRule: layoutRules.characterWidthRule,
    cropMode: 'diagnostic-contain',
    sceneTransitionMode: 'straight-cut-only',
    audioMode: 'preserve-source-only',
  };
  // This in-memory alias lets the existing vertical text model inspect the
  // diagnostic without registering it in the formal on-disk registry.  Its
  // speaker_only value describes the reused renderer geometry only; the public
  // diagnostic contract remains screen-layout neutral and full-frame contain.
  const rendererPreset = {
    ...structuredClone(sourcePreset),
    presetId: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
  };
  const rendererPresetRegistry = {
    ...structuredClone(presetRegistry),
    presets: [rendererPreset],
  };
  return {
    schemaVersion: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_SCHEMA_V001,
    diagnosticId: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
    limitation: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
    sourcePresetBinding: structuredClone(presetRegistryBinding),
    canvas: {width: canvas.width, height: canvas.height, fps: canvas.fps},
    safeAreaPx,
    layoutRules,
    presetRegistry: {
      schemaVersion: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_REGISTRY_SCHEMA_V001,
      registryVersion: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
      format: 'vertical-caption-diagnostic-1080x1920',
      sourcePresetBinding: structuredClone(presetRegistryBinding),
      canvas,
      fontAssets: [structuredClone(fontAsset)],
      transitions: structuredClone(presetRegistry.transitions),
      presets: [{
        presetId: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
        screenLayoutId: null,
        kindPolicies: [structuredClone(sourcePolicy)],
        visualStates: [structuredClone(visualState)],
      }],
    },
    resolvedStyle,
    layoutContext: {
      format: 'vertical-short-1080x1920',
      resolvedStyle,
      presetRegistry: rendererPresetRegistry,
      presetRegistryBinding: structuredClone(presetRegistryBinding),
      presetRegistryVersion: presetRegistry.registryVersion,
      preset: rendererPreset,
      policy: structuredClone(sourcePolicy),
      visualState,
      transition: structuredClone(transition),
      canvas,
      layoutRules,
      overlayAdapter: null,
    },
  };
}

export function validatePresentationAV002VerticalCaptionDiagnosticStyleV001(value) {
  if (!exactKeys(value, [
    'schemaVersion',
    'diagnosticId',
    'limitation',
    'sourcePresetBinding',
    'canvas',
    'safeAreaPx',
    'layoutRules',
    'presetRegistry',
    'resolvedStyle',
    'layoutContext',
  ])) return false;
  if (
    value.schemaVersion !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_SCHEMA_V001
    || value.diagnosticId !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001
    || value.limitation !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001
    || !exactKeys(value.sourcePresetBinding, ['path', 'fileSha256'])
    || value.sourcePresetBinding.path !== PRESENTATION_A_V002_VERTICAL_SOURCE_PRESET_PATH_V001
    || !SHA256.test(value.sourcePresetBinding.fileSha256)
    || !exactKeys(value.canvas, ['width', 'height', 'fps'])
    || value.canvas.width !== 1080
    || value.canvas.height !== 1920
    || value.canvas.fps !== 30
    || !exactKeys(value.safeAreaPx, ['top', 'right', 'bottom', 'left'])
    || !exactKeys(value.layoutRules, [
      'maxLogicalWidthPerLine', 'maxLinesPerMeaningGroup', 'characterWidthRule',
    ])
    || !positive(value.layoutRules.maxLogicalWidthPerLine)
    || !positive(value.layoutRules.maxLinesPerMeaningGroup)
    || typeof value.layoutRules.characterWidthRule !== 'string'
    || value.layoutRules.characterWidthRule.length === 0
    || value.presetRegistry?.schemaVersion
      !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_REGISTRY_SCHEMA_V001
    || value.presetRegistry?.registryVersion
      !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001
    || value.presetRegistry?.format !== 'vertical-caption-diagnostic-1080x1920'
    || !exactKeys(value.presetRegistry?.sourcePresetBinding, ['path', 'fileSha256'])
    || JSON.stringify(value.presetRegistry.sourcePresetBinding)
      !== JSON.stringify(value.sourcePresetBinding)
    || !dense(value.presetRegistry?.presets)
    || value.presetRegistry.presets.length !== 1
    || value.presetRegistry.presets[0].presetId
      !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001
    || value.presetRegistry.presets[0].screenLayoutId !== null
    || !exactKeys(value.resolvedStyle, [
      'format', 'screenLayoutId', 'presetId', 'visualStateId',
      'maxLogicalWidthPerLine', 'maxLinesPerDisplayPage', 'characterWidthRule',
      'cropMode', 'sceneTransitionMode', 'audioMode',
    ])
    || value.resolvedStyle.format !== 'vertical-short-1080x1920'
    || value.resolvedStyle.screenLayoutId !== null
    || value.resolvedStyle.presetId !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001
    || value.resolvedStyle.cropMode !== 'diagnostic-contain'
    || !exactKeys(value.layoutContext, [
      'format', 'resolvedStyle', 'presetRegistry', 'presetRegistryBinding',
      'presetRegistryVersion', 'preset', 'policy', 'visualState', 'transition',
      'canvas', 'layoutRules', 'overlayAdapter',
    ])
    || JSON.stringify(value.layoutContext.resolvedStyle) !== JSON.stringify(value.resolvedStyle)
    || value.layoutContext.presetRegistry?.schemaVersion !== 'presentation-preset-registry-v002'
    || value.layoutContext.presetRegistry?.registryVersion
      !== 'vertical-short-preset-registry-v001'
    || value.layoutContext.preset?.presetId
      !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001
    || value.layoutContext.preset?.screenLayoutId !== 'speaker_only'
    || value.layoutContext.overlayAdapter !== null
  ) return false;
  return true;
}

export function validatePresentationAV002VerticalDiagnosticPlanV001({plan, style}) {
  if (!validatePresentationAV002VerticalCaptionDiagnosticStyleV001(style)) {
    return {status: 'rejected', reason: 'diagnostic-style-invalid'};
  }
  if (
    !isObject(plan)
    || !exactKeys(plan.canvas, ['width', 'height', 'fps'])
    || plan.canvas.width !== style.canvas.width
    || plan.canvas.height !== style.canvas.height
    || plan.canvas.fps !== style.canvas.fps
    || !isObject(plan.layoutRules)
    || plan.layoutRules.maxLogicalWidthPerLine !== style.layoutRules.maxLogicalWidthPerLine
    || plan.layoutRules.maxLinesPerMeaningGroup !== style.layoutRules.maxLinesPerMeaningGroup
    || !dense(plan.elements)
    || plan.elements.length === 0
  ) return {status: 'rejected', reason: 'diagnostic-plan-invalid'};
  for (const element of plan.elements) {
    if (
      !isObject(element)
      || element.appliedPresetId !== PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001
      || element.stateId !== style.resolvedStyle.visualStateId
      || typeof element.text !== 'string'
      || element.text.length === 0
      || !dense(element.indexedLines)
      || element.indexedLines.length < 1
      || element.indexedLines.length > 2
      || element.indexedLines.map(line => line.renderedText).join('') !== element.text
      || !Number.isSafeInteger(element.startFrame)
      || element.startFrame < 0
      || !positive(element.displayFrameCount)
    ) return {status: 'rejected', reason: 'diagnostic-element-invalid'};
  }
  return {
    status: 'passed',
    diagnosticId: style.diagnosticId,
    elementCount: plan.elements.length,
    text: plan.elements.map(element => element.text).join(''),
  };
}

export function validatePresentationAV002VerticalContainOutputV001({source, output, canvas}) {
  if (
    !isObject(source)
    || !isObject(output)
    || !positive(source.width)
    || !positive(source.height)
    || source.fps !== 30
    || !positive(source.frameCount)
    || typeof source.audioPacketPayloadSha256 !== 'string'
    || !SHA256.test(source.audioPacketPayloadSha256)
    || !exactKeys(canvas, ['width', 'height', 'fps'])
    || output.width !== canvas.width
    || output.height !== canvas.height
    || output.fps !== canvas.fps
    || output.frameCount !== source.frameCount
    || output.audioPacketPayloadSha256 !== source.audioPacketPayloadSha256
  ) return {status: 'rejected'};
  return {
    status: 'passed',
    sourcePixelPolicy: 'contain-all-source-pixels-without-crop',
    frameCount: source.frameCount,
    audioPacketPayloadSha256: source.audioPacketPayloadSha256,
  };
}

export async function createPresentationAV002VerticalDiagnosticBaseMediaV001({
  baseMediaPath,
  runtimeProfile,
  diagnosticStyle,
}) {
  const ffmpegPath = runtimeProfile?.ffmpeg?.path;
  const ffprobePath = runtimeProfile?.ffprobe?.path;
  if (
    typeof baseMediaPath !== 'string'
    || baseMediaPath.length === 0
    || typeof ffmpegPath !== 'string'
    || ffmpegPath.length === 0
    || typeof ffprobePath !== 'string'
    || ffprobePath.length === 0
    || !validatePresentationAV002VerticalCaptionDiagnosticStyleV001(diagnosticStyle)
  ) throw new TypeError('vertical diagnostic runtime input is invalid');
  const sourceMedia = await inspectRenderedMediaWithToolsV001(baseMediaPath, {
    ffmpegPath,
    ffprobePath,
  });
  const sourceFrameCount = await inspectFrameCountWithToolV001(baseMediaPath, ffprobePath);
  if (
    !sourceMedia.video
    || sourceMedia.video.fps !== 30
    || !sourceMedia.audio
    || !positive(sourceFrameCount)
  ) throw new TypeError('vertical diagnostic source is not a 30fps AV file');
  const filter = buildPresentationAV002VerticalContainFilterV001({
    sourceWidth: sourceMedia.video.width,
    sourceHeight: sourceMedia.video.height,
    canvas: {...diagnosticStyle.canvas, safeAreaPx: diagnosticStyle.safeAreaPx},
  });
  const workDirectory = await mkdtemp(
    path.join(tmpdir(), 'zev2-presentation-a-v002-vertical-diagnostic-'),
  );
  const outputPath = path.join(workDirectory, 'diagnostic-base-media-v001.mp4');
  try {
    await runPresentationRendererChildProcessV001(ffmpegPath, [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      baseMediaPath,
      '-vf',
      filter.filter,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-frames:v',
      String(sourceFrameCount),
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      outputPath,
    ], {fatalInnerStage: 'overlay-render'});
    const outputMedia = await inspectRenderedMediaWithToolsV001(outputPath, {
      ffmpegPath,
      ffprobePath,
    });
    const outputFrameCount = await inspectFrameCountWithToolV001(outputPath, ffprobePath);
    const validation = validatePresentationAV002VerticalContainOutputV001({
      source: {
        width: sourceMedia.video.width,
        height: sourceMedia.video.height,
        fps: sourceMedia.video.fps,
        frameCount: sourceFrameCount,
        audioPacketPayloadSha256: sourceMedia.audio.packetPayloadSha256,
      },
      output: {
        width: outputMedia.video?.width ?? 0,
        height: outputMedia.video?.height ?? 0,
        fps: outputMedia.video?.fps ?? 0,
        frameCount: outputFrameCount,
        audioPacketPayloadSha256: outputMedia.audio?.packetPayloadSha256 ?? '',
      },
      canvas: diagnosticStyle.canvas,
    });
    if (validation.status !== 'passed') {
      await rm(workDirectory, {recursive: true, force: true});
      return {status: 'rejected', validation};
    }
    return {
      status: 'passed',
      diagnosticId: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_ID_V001,
      limitation: PRESENTATION_A_V002_VERTICAL_CAPTION_DIAGNOSTIC_LIMITATION_V001,
      workDirectory,
      outputPath,
      sourceMedia,
      outputMedia,
      frameCount: sourceFrameCount,
      filter: filter.filter,
    };
  } catch (error) {
    await rm(workDirectory, {recursive: true, force: true});
    throw error;
  }
}
