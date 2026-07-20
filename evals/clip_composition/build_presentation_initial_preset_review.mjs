#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalJson } from './presentation_caption_contract.mjs';
import {
  PRESENTATION_REGISTRY_TRUST_SCHEMA_VERSION,
  validatePresentationInstructionContract,
} from './presentation_instruction_contract.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..', '..');

export const CANDIDATE_REGISTRY_PATH = path.join(
  scriptDir,
  'candidates',
  'presentation',
  'normal-landscape-readable-pop-v001.json',
);
export const PREVIEW_PLAN_PATH = path.join(
  scriptDir,
  'candidates',
  'presentation',
  'normal-landscape-readable-pop-preview-plan-v001.json',
);
export const OUTPUT_ROOT = path.join(
  scriptDir,
  'outputs',
  'presentation',
  'initial-preset-registry-candidate-20260720-v001',
);

const REMOTION_BIN = path.join(workspaceRoot, 'runner', 'node_modules', '.bin', 'remotion');
const REMOTION_ENTRY = path.join(workspaceRoot, 'runner', 'src', 'remotion', 'index.ts');
const REMOTION_PUBLIC = path.join(workspaceRoot, 'runner', 'public');
const CHROME_BIN = path.join(
  workspaceRoot,
  'runner',
  'node_modules',
  '.remotion',
  'chrome-headless-shell',
  'mac-arm64',
  'chrome-headless-shell-mac-arm64',
  'chrome-headless-shell',
);
const TSX_BIN = path.join(workspaceRoot, 'runner', 'node_modules', '.bin', 'tsx');
const LAYOUT_INSPECTOR = path.join(scriptDir, 'inspect_presentation_preset_layout.ts');

export const EXPECTED_KINDS = Object.freeze([
  'speech-caption',
  'emphasis-important-statement',
  'emphasis-mistake-realization',
  'emphasis-discovery',
  'emphasis-strong-emotion',
  'information-comment',
  'information-narration',
  'information-lyrics',
  'speaker-identification',
  'reference-supplement',
]);

const OUTPUT_FILES = Object.freeze({
  candidateRegistry: 'candidate-preset-registry.json',
  presetValidationIndex: 'candidate-preset-validation-index.json',
  materialValidationIndex: 'candidate-empty-material-validation-index.json',
  previewManifest: 'preview-manifest.json',
  previewMedia: 'media/normal-landscape-readable-pop-preview-v001.mp4',
  reviewHtml: 'review.html',
  resultTemplate: 'result-template.md',
});

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const sha256Canonical = (value) => sha256(canonicalJson(value));
const fileSha256 = async (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});
const repoPath = (filePath) => path.relative(workspaceRoot, filePath);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isFiniteInteger = (value) => Number.isInteger(value) && Number.isFinite(value);

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));
  child.on('error', reject);
  child.on('close', (code) => {
    const allowedExitCodes = options.allowedExitCodes ?? [0];
    const result = {
      code,
      stdout: stdout.join(''),
      stderr: stderr.join(''),
      combined: `${stdout.join('')}${stderr.join('')}`,
    };
    if (allowedExitCodes.includes(code)) resolve(result);
    else reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${result.combined}`));
  });
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertExactStringArray = (actual, expected, label) => {
  assert(Array.isArray(actual), `${label} must be an array`);
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} does not match the fixed order`);
};

export const validateCandidateRegistry = (registry) => {
  assert(isObject(registry), 'candidate registry must be an object');
  assert(registry.schemaVersion === 'presentation-preset-registry-v001', 'candidate registry schema mismatch');
  assert(isNonEmptyString(registry.registryVersion), 'candidate registry version is missing');
  assert(registry.format === 'normal-landscape', 'candidate registry format mismatch');
  assert(registry.canvas?.width === 1920 && registry.canvas?.height === 1080, 'candidate canvas must be 1920x1080');
  assert(registry.canvas?.fps === 30, 'candidate preview must use 30fps');
  assert(Array.isArray(registry.fontAssets) && registry.fontAssets.length >= 1, 'candidate font assets are missing');
  assert(Array.isArray(registry.transitions) && registry.transitions.length >= 1, 'candidate transitions are missing');
  assert(Array.isArray(registry.endPolicies) && registry.endPolicies.length === 1, 'candidate end policy must stay singular');
  assert(Array.isArray(registry.presets) && registry.presets.length === 1, 'initial registry must contain one preset');

  const preset = registry.presets[0];
  assert(isNonEmptyString(preset.presetId), 'candidate presetId is missing');
  assert(preset.format === registry.format, 'candidate preset format mismatch');
  assert(Array.isArray(preset.visualStates) && preset.visualStates.length === 10, 'candidate must define ten visual states');
  assert(Array.isArray(preset.kindPolicies), 'candidate kind policies are missing');
  assertExactStringArray(preset.kindPolicies.map((policy) => policy.kind), EXPECTED_KINDS, 'candidate kinds');

  const fontIds = new Set(registry.fontAssets.map((font) => font.fontAssetId));
  const transitionIds = new Set(registry.transitions.map((transition) => transition.transitionId));
  const endPolicyIds = new Set(registry.endPolicies.map((policy) => policy.endPolicyId));
  const stateIds = new Set();
  for (const state of preset.visualStates) {
    assert(isNonEmptyString(state.stateId) && !stateIds.has(state.stateId), `visual state id is invalid: ${state.stateId}`);
    stateIds.add(state.stateId);
    assert(fontIds.has(state.textStyle?.fontAssetId), `${state.stateId}: unknown font asset`);
    assert(transitionIds.has(state.transitionId), `${state.stateId}: unknown transition`);
    assert(isFiniteInteger(state.textStyle?.fontSizePx) && state.textStyle.fontSizePx > 0, `${state.stateId}: font size invalid`);
    assert(isFiniteInteger(state.layout?.maxCharsPerLine) && state.layout.maxCharsPerLine > 0, `${state.stateId}: max chars invalid`);
    assert([1, 2].includes(state.layout?.maxLines), `${state.stateId}: max lines invalid`);
  }

  for (const [index, policy] of preset.kindPolicies.entries()) {
    assert(stateIds.has(policy.stateId), `${policy.kind}: unknown state id`);
    assert(Array.isArray(policy.allowedMaterialRoles), `${policy.kind}: allowed material roles missing`);
    assert(Array.isArray(policy.requiredMaterialRoles), `${policy.kind}: required material roles missing`);
    if (index === 0) {
      assert(policy.endResponsibility === 'target-anchor', 'caption end responsibility must be target-anchor');
      assert(!Object.hasOwn(policy, 'endPolicyId'), 'caption must not have a preset end policy');
    } else {
      assert(policy.endResponsibility === 'preset-policy', `${policy.kind}: end responsibility mismatch`);
      assert(endPolicyIds.has(policy.endPolicyId), `${policy.kind}: end policy is unknown`);
    }
    if (policy.kind === 'reference-supplement') {
      assertExactStringArray(
        policy.allowedMaterialRoles,
        ['reference-image', 'reference-video'],
        'reference supplement allowed roles',
      );
      assert(policy.requiredMaterialRoles.length === 0, 'reference OR contract must not be encoded as AND roles');
    } else {
      assert(policy.allowedMaterialRoles.length === 0, `${policy.kind}: initial external materials are forbidden`);
      assert(policy.requiredMaterialRoles.length === 0, `${policy.kind}: initial required materials are forbidden`);
    }
  }
  return registry;
};

export const validatePreviewPlan = (plan, registry) => {
  assert(isObject(plan), 'preview plan must be an object');
  assert(plan.schemaVersion === 'presentation-preset-preview-plan-v001', 'preview plan schema mismatch');
  assert(plan.format === registry.format, 'preview plan format mismatch');
  assert(plan.presetId === registry.presets[0].presetId, 'preview plan preset mismatch');
  assert(Array.isArray(plan.sourceSelection?.segments) && plan.sourceSelection.segments.length === 2, 'preview sources must stay fixed at two');
  assert(Array.isArray(plan.scenes) && plan.scenes.length === 10, 'preview must contain ten scenes');
  assertExactStringArray(plan.scenes.map((scene) => scene.kind), EXPECTED_KINDS, 'preview scene kinds');

  let previousEndMs = 0;
  for (const scene of plan.scenes) {
    assert(scene.startMs === previousEndMs, `${scene.sceneId}: scenes must be contiguous`);
    assert(isFiniteInteger(scene.endMs) && scene.endMs > scene.startMs, `${scene.sceneId}: invalid scene range`);
    assert(Array.isArray(scene.layers) && scene.layers.length >= 1, `${scene.sceneId}: layers missing`);
    for (const layer of scene.layers) {
      assert(isNonEmptyString(layer.text), `${scene.sceneId}/${layer.layerId}: text is empty`);
      assert(layer.startMs >= scene.startMs && layer.endMs <= scene.endMs && layer.startMs < layer.endMs,
        `${scene.sceneId}/${layer.layerId}: layer is outside scene`);
    }
    if (scene.kind === 'reference-supplement') {
      assert(scene.previewOnlySyntheticMaterial === true, 'G7 preview must declare synthetic preview-only material');
    } else {
      assert(!Object.hasOwn(scene, 'previewOnlySyntheticMaterial'), `${scene.sceneId}: synthetic material flag is G7-only`);
    }
    previousEndMs = scene.endMs;
  }
  const sourceDurationMs = plan.sourceSelection.segments.reduce(
    (sum, segment) => sum + (segment.endMs - segment.startMs),
    0,
  );
  assert(sourceDurationMs === previousEndMs, 'source segment duration must exactly equal preview duration');
  return plan;
};

export const derivePresetValidationIndex = (registry) => ({
  registryVersion: registry.registryVersion,
  presets: registry.presets.map((preset) => ({
    presetId: preset.presetId,
    format: preset.format,
    kindPolicies: preset.kindPolicies.map((policy) => {
      const projected = {
        kind: policy.kind,
        endResponsibility: policy.endResponsibility,
      };
      if (Object.hasOwn(policy, 'endPolicyId')) projected.endPolicyId = policy.endPolicyId;
      projected.allowedMaterialRoles = [...policy.allowedMaterialRoles];
      projected.requiredMaterialRoles = [...policy.requiredMaterialRoles];
      return projected;
    }),
  })),
});

export const deriveEmptyMaterialValidationIndex = () => ({
  registryVersion: 'presentation-material-registry-empty-v001',
  materials: [],
});

export const buildEphemeralTrust = (presetValidationIndex, materialValidationIndex) => ({
  schemaVersion: PRESENTATION_REGISTRY_TRUST_SCHEMA_VERSION,
  presetRegistryVersion: presetValidationIndex.registryVersion,
  presetValidationIndexSha256: sha256Canonical(presetValidationIndex),
  materialRegistryVersion: materialValidationIndex.registryVersion,
  materialValidationIndexSha256: sha256Canonical(materialValidationIndex),
});

const buildEmptyInstructionBundle = (presetValidationIndex, materialValidationIndex) => {
  const sourceAtoms = [];
  const resolutionPackage = {
    schemaVersion: 'presentation-resolution-package-v001',
    resolutionPackageId: 'candidate-preflight-empty-resolution-v001',
    sourceProvenance: 'candidate-preflight-empty-source-v001',
    atomGranularity: 'word-timestamp',
    sourceAtomsSha256: sha256Canonical(sourceAtoms),
    sourceAtoms,
    targets: [],
    captionContracts: [],
  };
  return {
    schemaVersion: 'presentation-instruction-check-v001',
    instructionSet: {
      schemaVersion: 'zev-presentation-instruction-v001',
      instructionSetId: 'candidate-preflight-empty-instructions-v001',
      format: 'normal-landscape',
      rendererContractVersion: 'zev-renderer-boundary-v001',
      sourceProvenance: resolutionPackage.sourceProvenance,
      resolutionPackageId: resolutionPackage.resolutionPackageId,
      resolutionPackageSha256: sha256Canonical(resolutionPackage),
      presetRegistryVersion: presetValidationIndex.registryVersion,
      materialRegistryVersion: materialValidationIndex.registryVersion,
      instructions: [],
    },
    resolutionPackage,
    presetValidationIndex,
    materialValidationIndex,
  };
};

export const checkCandidateIndexCompatibility = (
  presetValidationIndex,
  materialValidationIndex,
) => {
  const ephemeralTrust = buildEphemeralTrust(presetValidationIndex, materialValidationIndex);
  const bundle = buildEmptyInstructionBundle(presetValidationIndex, materialValidationIndex);
  const report = validatePresentationInstructionContract(bundle, ephemeralTrust);
  assert(report.overallStatus === 'passed', 'candidate validation indices do not pass the existing contract');
  return {
    status: report.overallStatus,
    checkerVersion: report.checkerVersion,
    inputSha256: report.inputSha256,
    trustUsedForPreflightOnly: true,
    formalTrustBindingWritten: false,
  };
};

const fontById = (registry) => new Map(registry.fontAssets.map((font) => [font.fontAssetId, font]));
const stateById = (preset) => new Map(preset.visualStates.map((state) => [state.stateId, state]));
const policyByKind = (preset) => new Map(preset.kindPolicies.map((policy) => [policy.kind, policy]));
const transitionById = (registry) => new Map(registry.transitions.map((transition) => [transition.transitionId, transition]));

const renderPropsFor = ({ registry, preset, policy, state, layer }) => {
  const font = fontById(registry).get(state.textStyle.fontAssetId);
  assert(font, `${state.stateId}: font asset is missing`);
  return {
    text: layer.text,
    style: {
      fontFamily: font.fileName,
      fontSize: state.textStyle.fontSizePx,
      fontColor: state.textStyle.fontColor,
      borderColor: state.textStyle.borderColor,
      borderWidth: state.textStyle.borderWidthPx,
      lineSpacing: state.textStyle.lineSpacingPercent,
      glowColor: state.textStyle.glowColor,
      glowColorMode: 'fixed',
      glowWidth: state.textStyle.glowWidthPx,
      glowOpacity: state.textStyle.glowOpacityPercent,
    },
    position: {
      preset: state.position.preset,
      alignment: state.position.alignment,
      offsetX: state.position.offsetXPercent,
      offsetY: state.position.offsetYPercent,
    },
    ...(state.background ? {
      background: {
        color: state.background.color,
        borderRadius: state.background.borderRadiusPx,
        paddingX: state.background.paddingXPx,
        paddingY: state.background.paddingYPx,
      },
    } : {}),
    maxCharsPerLine: state.layout.maxCharsPerLine,
    singleLine: state.layout.singleLine,
    width: registry.canvas.width,
    height: registry.canvas.height,
    glowSeedHint: `${preset.presetId}/${policy.kind}/${state.stateId}`,
  };
};

const renderStill = async (props, outputPath) => {
  const result = await run(REMOTION_BIN, [
    'still',
    REMOTION_ENTRY,
    'TelopStill',
    outputPath,
    '--props',
    JSON.stringify(props),
    '--image-format',
    'png',
    '--public-dir',
    REMOTION_PUBLIC,
    '--browser-executable',
    CHROME_BIN,
    '--log',
    'error',
  ], { cwd: path.join(workspaceRoot, 'runner') });
  if (result.combined.includes('Telop layout font load failed')) {
    throw new Error(`managed font load failed while rendering ${outputPath}`);
  }
};

const inspectAlphaBounds = async (imagePath, canvas, safeAreaPx) => {
  const maximaResult = await run('magick', [
    imagePath,
    '-alpha', 'extract',
    '-format', '%[fx:maxima]',
    'info:',
  ]);
  const alphaMax = Number(maximaResult.stdout.trim());
  assert(Number.isFinite(alphaMax) && alphaMax > 0, `${imagePath}: transparent overlay is empty`);
  const boundsResult = await run('magick', [
    imagePath,
    '-channel', 'A',
    '-trim',
    '-format', '%w %h %X %Y',
    'info:',
  ]);
  const match = boundsResult.stdout.trim().match(/^(\d+) (\d+) ([+-]\d+) ([+-]\d+)$/);
  assert(match, `${imagePath}: alpha bounds could not be parsed: ${boundsResult.stdout.trim()}`);
  const [, width, height, x, y] = match.map(Number);
  const bounds = { x, y, width, height, right: x + width, bottom: y + height };
  assert(bounds.x >= safeAreaPx.left, `${imagePath}: content crosses left safe area`);
  assert(bounds.y >= safeAreaPx.top, `${imagePath}: content crosses top safe area`);
  assert(bounds.right <= canvas.width - safeAreaPx.right, `${imagePath}: content crosses right safe area`);
  assert(bounds.bottom <= canvas.height - safeAreaPx.bottom, `${imagePath}: content crosses bottom safe area`);
  return { alphaMax, bounds };
};

const inspectMedia = async (filePath, expected) => {
  const result = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,width,height,codec_name',
    '-of', 'json',
    filePath,
  ]);
  const data = JSON.parse(result.stdout);
  const video = data.streams?.find((stream) => stream.codec_type === 'video');
  const audio = data.streams?.find((stream) => stream.codec_type === 'audio');
  const durationMs = Math.round(Number(data.format?.duration) * 1000);
  const frameMs = 1000 / expected.fps;
  assert(video?.width === expected.width && video?.height === expected.height, `${filePath}: media size mismatch`);
  assert(audio, `${filePath}: audio stream is missing`);
  assert(
    Math.abs(durationMs - expected.durationMs) <= frameMs,
    `${filePath}: duration differs by more than one frame (actual=${durationMs}ms expected=${expected.durationMs}ms frame=${frameMs}ms)`,
  );
  return {
    durationMs,
    width: video.width,
    height: video.height,
    videoCodec: video.codec_name,
    audioCodec: audio.codec_name,
    hasVideo: true,
    hasAudio: true,
    sha256: await fileSha256(filePath),
  };
};

const renderBaseMedia = async ({ plan, registry, outputPath }) => {
  const args = ['-hide_banner', '-loglevel', 'error', '-y'];
  for (const segment of plan.sourceSelection.segments) {
    args.push(
      '-ss', (segment.startMs / 1000).toFixed(3),
      '-t', ((segment.endMs - segment.startMs) / 1000).toFixed(3),
      '-i', path.join(workspaceRoot, segment.path),
    );
  }
  const filterParts = [];
  plan.sourceSelection.segments.forEach((segment, index) => {
    const durationSec = (segment.endMs - segment.startMs) / 1000;
    filterParts.push(
      `[${index}:v]scale=${registry.canvas.width}:${registry.canvas.height}:force_original_aspect_ratio=decrease,`
      + `pad=${registry.canvas.width}:${registry.canvas.height}:(ow-iw)/2:(oh-ih)/2:black,`
      + `fps=${registry.canvas.fps},setsar=1,setpts=PTS-STARTPTS[v${index}]`,
    );
    filterParts.push(
      `[${index}:a]aresample=async=1:first_pts=0,atrim=duration=${durationSec.toFixed(3)},asetpts=PTS-STARTPTS[a${index}]`,
    );
  });
  const concatInputs = plan.sourceSelection.segments.map((_, index) => `[v${index}][a${index}]`).join('');
  filterParts.push(`${concatInputs}concat=n=${plan.sourceSelection.segments.length}:v=1:a=1[outv][outa]`);
  args.push(
    '-filter_complex', filterParts.join(';'),
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    outputPath,
  );
  await run('ffmpeg', args);
};

const renderPreviewMedia = async ({ basePath, layers, registry, outputPath }) => {
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', basePath];
  for (const layer of layers) args.push('-loop', '1', '-framerate', String(registry.canvas.fps), '-i', layer.imagePath);
  const filters = [];
  let previous = '0:v';
  layers.forEach((layer, index) => {
    const inputIndex = index + 1;
    const startSec = layer.startMs / 1000;
    const endSec = layer.endMs / 1000;
    const fadeSec = layer.transition.entry.frames / registry.canvas.fps;
    const fadeOutStartSec = endSec - (layer.transition.exit.frames / registry.canvas.fps);
    filters.push(
      `[${inputIndex}:v]format=rgba,`
      + `fade=t=in:st=${startSec.toFixed(3)}:d=${fadeSec.toFixed(3)}:alpha=1,`
      + `fade=t=out:st=${fadeOutStartSec.toFixed(3)}:d=${(layer.transition.exit.frames / registry.canvas.fps).toFixed(3)}:alpha=1[ol${index}]`,
    );
    const output = `v${index + 1}`;
    filters.push(
      `[${previous}][ol${index}]overlay=0:0:eof_action=pass:shortest=0:`
      + `enable='between(t,${startSec.toFixed(3)},${endSec.toFixed(3)})'[${output}]`,
    );
    previous = output;
  });
  filters.push(`[${previous}]format=yuv420p[outv]`);
  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[outv]',
    '-map', '0:a?',
    '-t', (layers.at(-1).previewDurationMs / 1000).toFixed(3),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    outputPath,
  );
  await run('ffmpeg', args);
};

const extractFrame = async (inputPath, timeMs, outputPath) => {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', (timeMs / 1000).toFixed(3),
    '-i', inputPath,
    '-frames:v', '1',
    outputPath,
  ]);
};

const imageDifferencePixels = async (leftPath, rightPath) => {
  const result = await run('magick', [
    'compare',
    '-metric', 'AE',
    leftPath,
    rightPath,
    'null:',
  ], { allowedExitCodes: [0, 1] });
  const value = Number(result.stderr.trim().split(/\s+/)[0]);
  assert(Number.isFinite(value), `image difference could not be parsed: ${result.stderr}`);
  return value;
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatClock = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining].map((value) => String(value).padStart(2, '0')).join(':');
};

export const buildReviewHtml = ({ manifest, manifestSha256 }) => {
  const publicManifest = {
    presetId: manifest.preset.presetId,
    presetRegistryVersion: manifest.preset.registryVersion,
    materialRegistryVersion: manifest.materialIndex.registryVersion,
    manifestSha256,
    mediaPath: manifest.media.publicPath,
    scenes: manifest.scenes.map((scene) => ({
      sceneId: scene.sceneId,
      humanLabel: scene.humanLabel,
      kind: scene.kind,
      startMs: scene.startMs,
      endMs: scene.endMs,
    })),
  };
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>初期プリセット台帳v001 人間確認</title>
<style>
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;background:#0b1019;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;padding:0 0 92px;background:#0b1019}header{padding:16px 20px;background:#141d2c;border-bottom:1px solid #30405a}h1{font-size:21px;margin:0 0 8px}.lead{line-height:1.55;margin:5px 0;color:#d5deeb}.warning{color:#ffd99a}.wrap{max-width:1180px;margin:0 auto;padding:14px 18px}.viewer{background:#111927;border:1px solid #2e3c52;border-radius:14px;padding:12px;position:sticky;top:0;z-index:2}.viewer video{display:block;width:100%;max-height:45dvh;object-fit:contain;background:#000;border-radius:9px}.playback{margin:9px 0 0;color:#aebbd0}.chapters{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.chapters button,.utility button,.answer,.dock button,.result button{border:0;border-radius:9px;padding:9px 12px;font-weight:700;background:#26364f;color:#fff;cursor:pointer}.chapters button{font-size:12px;text-align:left}.chapters button.active{background:#2f7f64}.utility{display:flex;gap:8px;margin-top:10px}.questions{display:grid;gap:12px;margin-top:14px}.question{background:#141d2c;border:1px solid #30405a;border-radius:13px;padding:14px}.question h2{font-size:17px;margin:0 0 8px}.question p{color:#cbd5e4;line-height:1.5;margin:5px 0}.criteria{display:grid;gap:7px;margin:10px 0}.criterion{background:#0e1623;border-radius:8px;padding:9px 11px}.answers{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.answer.active{background:#2f8f63}.answer.needs.active{background:#a94a55}.status{color:#9fb0c8;font-size:13px}.result{max-width:900px;margin:16px auto;background:#141d2c;border:1px solid #30405a;border-radius:14px;padding:16px}.result textarea{width:100%;height:310px;background:#080d15;color:#fff;border:1px solid #40516d;border-radius:10px;padding:12px}.result-actions{display:flex;gap:8px;margin-top:10px}.dock{position:fixed;left:0;right:0;bottom:0;z-index:5;background:#141d2c;border-top:1px solid #30405a;padding:11px 16px;display:flex;justify-content:center;align-items:center;gap:10px}.dock .primary{background:#2f7f64}.dock .final{background:#6654b8}.dock span{color:#cbd5e4}@media(max-width:760px){body{padding-bottom:138px}.viewer{position:static}.viewer video{max-height:35dvh}.dock{flex-wrap:wrap}.chapters button{flex:1 1 46%}.answer{flex:1}.wrap{padding:10px}.question{padding:12px}}
</style></head><body>
<header><h1>初期プリセット台帳v001 人間確認</h1><p class="lead"><strong>目的:</strong> 通常横長動画の最初の固定プリセットを、実際の描画を見て認定します。</p><p class="lead"><strong>見ること:</strong> 文字が読みやすいか、素の基本テロップへ戻っていないか、種類ごとの最低限の変化があるか。続いて終了・素材・空素材運用を確認します。</p><p class="lead"><strong>見なくてよいこと:</strong> 発火点の意味判断、教師動画との勝負、正式レンダラーの品質。<span class="warning">最後の補足カードはpreview専用で、正式素材ではありません。</span></p></header>
<main class="wrap" id="main"><section class="viewer"><video id="preview" controls preload="metadata" src="${escapeHtml(manifest.media.publicPath)}"></video><div class="playback" id="playback">全体を再生できます。チャプターを押すと、その区間だけ再生して末尾で止まります。</div><div class="utility"><button id="playAll">全体を最初から再生</button><button id="pause">停止</button></div><div class="chapters">${manifest.scenes.map((scene, index) => `<button data-scene="${index}">${String(index + 1).padStart(2, '0')} ${escapeHtml(scene.humanLabel)}<br>${formatClock(scene.startMs)}–${formatClock(scene.endMs)}</button>`).join('')}</div></section>
<section class="questions">
<article class="question" data-question="q1"><h2>Q1 見た目を候補として採用できますか？</h2><p>次の3点を確認します。まとめて満たす場合は一括ボタンだけで回答できます。</p><div class="criteria"><label class="criterion"><input type="checkbox" data-criterion="plain_not_reused"> 敗北した素の基本テロップを再利用していない</label><label class="criterion"><input type="checkbox" data-criterion="readable"> 実際の日本語が読みやすい</label><label class="criterion"><input type="checkbox" data-criterion="minimum_variation"> 種類に応じた最低限の変化があり、単調ではない</label></div><div class="answers"><button id="q1All">3条件すべて満たす</button><button class="answer" data-question-id="q1" data-answer="approved">承認</button><button class="answer needs" data-question-id="q1" data-answer="needs_revision">修正が必要</button></div></article>
<article class="question" data-question="q2"><h2>Q2 表示の終わり方を承認しますか？</h2><p>通常発話は発話計画の終端。他の9種類は対象になった最後の発話要素で終了し、独自の秒数を足しません。</p><div class="answers"><button class="answer" data-question-id="q2" data-answer="approved">承認</button><button class="answer needs" data-question-id="q2" data-answer="needs_revision">修正が必要</button></div></article>
<article class="question" data-question="q3"><h2>Q3 素材の使い方を承認しますか？</h2><p>コメントと話者名札は初期版では文字だけ。補足素材だけ画像または動画を必須とし、素材を暗黙補完しません。</p><div class="answers"><button class="answer" data-question-id="q3" data-answer="approved">承認</button><button class="answer needs" data-question-id="q3" data-answer="needs_revision">修正が必要</button></div></article>
<article class="question" data-question="q4"><h2>Q4 空素材indexで開始してよいですか？</h2><p>素材登録は0件で開始します。補足素材の方針は残しますが、実素材を認定するまで補足指示は生成・描画しません。</p><div class="answers"><button class="answer" data-question-id="q4" data-answer="approved">承認</button><button class="answer needs" data-question-id="q4" data-answer="needs_revision">修正が必要</button></div></article>
<article class="question" data-question="q5"><h2>Q5 最終承認</h2><p>previewとQ1〜Q4を一組として、初期プリセット台帳v001へ昇格してよいですか？ Q5の最終承認だけは別です。一括承認では入力されません。</p><div class="answers"><button class="answer" data-question-id="q5" data-answer="approved">最終承認する</button><button class="answer needs" data-question-id="q5" data-answer="needs_revision">修正が必要</button></div></article>
</section></main>
<section class="result" id="result" hidden><h2>回答結果</h2><p>内容を確認し、コピーしてチャットへ貼ってください。戻れば何度でも修正できます。</p><textarea id="resultText" readonly></textarea><div class="result-actions"><button id="back">回答へ戻る</button><button id="copy">結果をコピー</button></div></section>
<div class="dock" id="dock"><button class="primary" id="approveQ1Q4">Q1〜Q4をすべて承認</button><button class="final" id="showResult">結果を確認</button><span id="answerCount">0 / 5回答</span></div>
<script>
const DATA=${JSON.stringify(publicManifest)};const answers={q1:null,q2:null,q3:null,q4:null,q5:null};const criteria={plain_not_reused:false,readable:false,minimum_variation:false};const video=document.getElementById('preview');let stopAt=null;let activeScene=null;
function setPlayback(text){document.getElementById('playback').textContent=text}function stopLimitedPlayback(){stopAt=null;activeScene=null;document.querySelectorAll('[data-scene]').forEach(button=>button.classList.remove('active'))}video.addEventListener('timeupdate',()=>{if(stopAt!==null&&video.currentTime>=stopAt){video.pause();video.currentTime=stopAt;setPlayback('指定区間の末尾で停止しました');stopLimitedPlayback()}});video.addEventListener('ended',stopLimitedPlayback);
document.getElementById('playAll').onclick=()=>{stopLimitedPlayback();video.currentTime=0;setPlayback('全体を再生中');video.play()};document.getElementById('pause').onclick=()=>{video.pause();setPlayback('停止しました')};document.querySelectorAll('[data-scene]').forEach(button=>button.onclick=()=>{const scene=DATA.scenes[Number(button.dataset.scene)];stopLimitedPlayback();activeScene=scene.sceneId;stopAt=scene.endMs/1000;button.classList.add('active');video.currentTime=scene.startMs/1000;setPlayback(scene.humanLabel+'：'+formatClock(scene.startMs)+'〜'+formatClock(scene.endMs)+'を再生');video.play()});
function formatClock(ms){const total=Math.floor(ms/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;return [h,m,s].map(value=>String(value).padStart(2,'0')).join(':')}function renderAnswers(){document.querySelectorAll('.answer').forEach(button=>button.classList.toggle('active',answers[button.dataset.questionId]===button.dataset.answer));document.querySelectorAll('[data-criterion]').forEach(box=>box.checked=criteria[box.dataset.criterion]);document.getElementById('answerCount').textContent=Object.values(answers).filter(Boolean).length+' / 5回答'}function setAnswer(question,answer){answers[question]=answer;renderAnswers()}document.querySelectorAll('.answer').forEach(button=>button.onclick=()=>setAnswer(button.dataset.questionId,button.dataset.answer));document.querySelectorAll('[data-criterion]').forEach(box=>box.onchange=()=>{criteria[box.dataset.criterion]=box.checked;if(!box.checked&&answers.q1==='approved')answers.q1='needs_revision';renderAnswers()});document.getElementById('q1All').onclick=()=>{Object.keys(criteria).forEach(key=>criteria[key]=true);answers.q1='approved';renderAnswers()};document.getElementById('approveQ1Q4').onclick=()=>{Object.keys(criteria).forEach(key=>criteria[key]=true);for(const key of ['q1','q2','q3','q4'])answers[key]='approved';renderAnswers()};
function answerLabel(value){return value==='approved'?'承認':value==='needs_revision'?'修正が必要':'未回答'}function resultText(){return ['初期プリセット台帳v001 人間確認結果','確認者: kawafmm','時間計測: なし','候補プリセット: '+DATA.presetId,'preview manifest SHA-256: '+DATA.manifestSha256,'','Q1: '+answerLabel(answers.q1)+' / 素の基本テロップ不使用='+(criteria.plain_not_reused?'はい':'いいえ')+' / 可読性='+(criteria.readable?'はい':'いいえ')+' / 最低限の変化='+(criteria.minimum_variation?'はい':'いいえ'),'Q2: '+answerLabel(answers.q2),'Q3: '+answerLabel(answers.q3),'Q4: '+answerLabel(answers.q4),'Q5: '+answerLabel(answers.q5),'','注記: G7のカードは認定preview専用で、正式素材・実指示・信頼bindingには含まれない。'].join('\\n')}const main=document.getElementById('main'),dock=document.getElementById('dock'),result=document.getElementById('result');document.getElementById('showResult').onclick=()=>{video.pause();document.getElementById('resultText').value=resultText();main.hidden=true;dock.hidden=true;result.hidden=false};document.getElementById('back').onclick=()=>{result.hidden=true;main.hidden=false;dock.hidden=false;renderAnswers()};document.getElementById('copy').onclick=async()=>{const area=document.getElementById('resultText');try{await navigator.clipboard.writeText(area.value);document.getElementById('copy').textContent='コピーしました'}catch{area.focus();area.select()}};renderAnswers();
</script></body></html>`;
};

export const validateReviewHtml = (html, manifest) => {
  const scriptStart = html.indexOf('<script>');
  const scriptEnd = html.indexOf('</script>', scriptStart);
  assert(scriptStart >= 0 && scriptEnd > scriptStart, 'review script is missing');
  new Function(html.slice(scriptStart + '<script>'.length, scriptEnd));
  assert((html.match(/<video /g) ?? []).length === 1, 'review UI must contain exactly one video');
  assert((html.match(/data-question="q[1-5]"/g) ?? []).length === 5, 'review UI must contain five question cards');
  assert((html.match(/data-scene=/g) ?? []).length === manifest.scenes.length, 'chapter count mismatch');
  assert(html.includes("for(const key of ['q1','q2','q3','q4'])"), 'Q1-Q4 bulk approval is missing');
  assert(!html.includes("['q1','q2','q3','q4','q5']"), 'bulk approval must not answer Q5');
  assert(html.includes('object-fit:contain') && html.includes('max-height:45dvh'), 'viewport-safe video CSS missing');
  for (const forbidden of ['localStorage', 'fetch(', 'elapsed', 'timeMeasurement']) {
    assert(!html.includes(forbidden), `review UI contains forbidden feature: ${forbidden}`);
  }
};

const environmentManifest = async () => {
  const remotionPackage = await readJson(path.join(workspaceRoot, 'runner', 'node_modules', 'remotion', 'package.json'));
  const browserVersion = (await readFile(
    path.join(workspaceRoot, 'runner', 'node_modules', '.remotion', 'chrome-headless-shell', 'VERSION'),
    'utf8',
  )).trim();
  const ffmpegVersion = (await run('ffmpeg', ['-version'])).stdout.split('\n')[0];
  const ffprobeVersion = (await run('ffprobe', ['-version'])).stdout.split('\n')[0];
  return {
    nodeVersion: process.version,
    nodeArch: process.arch,
    remotionVersion: remotionPackage.version,
    browserExecutable: repoPath(CHROME_BIN),
    browserVersion,
    ffmpegVersion,
    ffprobeVersion,
    networkDownloadUsed: false,
  };
};

const main = async () => {
  const registry = validateCandidateRegistry(await readJson(CANDIDATE_REGISTRY_PATH));
  const plan = validatePreviewPlan(await readJson(PREVIEW_PLAN_PATH), registry);
  const preset = registry.presets[0];
  const presetValidationIndex = derivePresetValidationIndex(registry);
  const materialValidationIndex = deriveEmptyMaterialValidationIndex();
  const indexCompatibility = checkCandidateIndexCompatibility(presetValidationIndex, materialValidationIndex);

  await Promise.all(
    [REMOTION_BIN, REMOTION_ENTRY, REMOTION_PUBLIC, CHROME_BIN, TSX_BIN, LAYOUT_INSPECTOR]
      .map((requiredPath) => access(requiredPath)),
  );
  for (const font of registry.fontAssets) {
    const fontPath = path.join(workspaceRoot, font.path);
    await access(fontPath);
    await access(path.join(workspaceRoot, font.licensePath));
    assert(await fileSha256(fontPath) === font.sha256, `${font.fontAssetId}: font hash mismatch`);
  }
  for (const segment of plan.sourceSelection.segments) await access(path.join(workspaceRoot, segment.path));

  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  const overlayDir = path.join(OUTPUT_ROOT, 'overlays');
  const frameDir = path.join(OUTPUT_ROOT, 'frames');
  const mediaDir = path.join(OUTPUT_ROOT, 'media');
  const workDir = path.join(OUTPUT_ROOT, '.work');
  await Promise.all([OUTPUT_ROOT, overlayDir, frameDir, mediaDir, workDir].map((directory) => mkdir(directory, { recursive: true })));

  await writeJson(path.join(OUTPUT_ROOT, OUTPUT_FILES.candidateRegistry), registry);
  await writeJson(path.join(OUTPUT_ROOT, OUTPUT_FILES.presetValidationIndex), presetValidationIndex);
  await writeJson(path.join(OUTPUT_ROOT, OUTPUT_FILES.materialValidationIndex), materialValidationIndex);

  const states = stateById(preset);
  const policies = policyByKind(preset);
  const transitions = transitionById(registry);
  const layerRecords = [];
  for (const scene of plan.scenes) {
    const policy = policies.get(scene.kind);
    const state = states.get(policy.stateId);
    const transition = transitions.get(state.transitionId);
    for (const layer of scene.layers) {
      const props = renderPropsFor({ registry, preset, policy, state, layer });
      const imagePath = path.join(overlayDir, `${scene.sceneId}-${layer.layerId}.png`);
      layerRecords.push({
        sceneId: scene.sceneId,
        kind: scene.kind,
        layerId: layer.layerId,
        stateId: state.stateId,
        startMs: layer.startMs,
        endMs: layer.endMs,
        text: layer.text,
        props,
        transition,
        imagePath,
        previewDurationMs: plan.scenes.at(-1).endMs,
      });
    }
  }

  const layoutInputPath = path.join(workDir, 'layout-input.json');
  const layoutOutputPath = path.join(OUTPUT_ROOT, 'layout-preflight.json');
  await writeJson(layoutInputPath, {
    canvas: registry.canvas,
    items: layerRecords.map((record) => ({
      layerId: record.layerId,
      stateId: record.stateId,
      text: record.text,
      maxLines: states.get(policies.get(record.kind).stateId).layout.maxLines,
      props: record.props,
    })),
  });
  await run(TSX_BIN, [LAYOUT_INSPECTOR, layoutInputPath, layoutOutputPath], {
    env: { TMPDIR: '/private/tmp' },
  });
  const layoutPreflight = await readJson(layoutOutputPath);
  assert(layoutPreflight.status === 'passed', 'render-model layout preflight failed');

  for (const record of layerRecords) {
    await renderStill(record.props, record.imagePath);
    record.pngSha256 = await fileSha256(record.imagePath);
    record.alphaInspection = await inspectAlphaBounds(record.imagePath, registry.canvas, registry.canvas.safeAreaPx);
  }

  const representative = layerRecords[0];
  const repeatPath = path.join(workDir, 'representative-repeat.png');
  await renderStill(representative.props, repeatPath);
  const deterministicStill = {
    layerId: representative.layerId,
    firstSha256: representative.pngSha256,
    secondSha256: await fileSha256(repeatPath),
  };
  assert(deterministicStill.firstSha256 === deterministicStill.secondSha256, 'representative still is not deterministic');

  const fontFallbackChecks = [];
  for (const font of registry.fontAssets) {
    const record = layerRecords.find((candidate) => candidate.props.style.fontFamily === font.fileName);
    assert(record, `${font.fontAssetId}: no preview layer uses the font`);
    const fallbackPath = path.join(workDir, `fallback-${font.fontAssetId}.png`);
    await renderStill({
      ...record.props,
      style: { ...record.props.style, fontFamily: '__preview_fallback_sans__' },
    }, fallbackPath);
    const fallbackSha = await fileSha256(fallbackPath);
    assert(fallbackSha !== record.pngSha256, `${font.fontAssetId}: managed font output equals fallback output`);
    fontFallbackChecks.push({
      fontAssetId: font.fontAssetId,
      managedFontSha256: record.pngSha256,
      fallbackControlSha256: fallbackSha,
      outputsDiffer: true,
    });
  }

  const basePath = path.join(workDir, 'source-only-base.mp4');
  await renderBaseMedia({ plan, registry, outputPath: basePath });
  const previewPath = path.join(OUTPUT_ROOT, OUTPUT_FILES.previewMedia);
  await renderPreviewMedia({ basePath, layers: layerRecords, registry, outputPath: previewPath });
  const mediaInspection = await inspectMedia(previewPath, {
    width: registry.canvas.width,
    height: registry.canvas.height,
    fps: registry.canvas.fps,
    durationMs: plan.scenes.at(-1).endMs,
  });

  const sceneFrameChecks = [];
  for (const scene of plan.scenes) {
    const visibleLayer = scene.layers[0];
    const midpointMs = Math.round((visibleLayer.startMs + visibleLayer.endMs) / 2);
    const finalFrame = path.join(frameDir, `${scene.sceneId}.png`);
    const baseFrame = path.join(workDir, `${scene.sceneId}-base.png`);
    await extractFrame(previewPath, midpointMs, finalFrame);
    await extractFrame(basePath, midpointMs, baseFrame);
    const changedPixels = await imageDifferencePixels(finalFrame, baseFrame);
    assert(changedPixels > 0, `${scene.sceneId}: preview overlay was not visible at the representative frame`);
    sceneFrameChecks.push({
      sceneId: scene.sceneId,
      midpointMs,
      framePath: repoPath(finalFrame),
      frameSha256: await fileSha256(finalFrame),
      changedPixelsAgainstSourceOnly: changedPixels,
      overlayVisible: true,
    });
  }

  const sourceManifest = [];
  for (const segment of plan.sourceSelection.segments) {
    const sourcePath = path.join(workspaceRoot, segment.path);
    sourceManifest.push({
      ...segment,
      sha256: await fileSha256(sourcePath),
    });
  }
  const componentManifest = [];
  for (const componentPath of registry.componentProvenance) {
    componentManifest.push({
      path: componentPath,
      sha256: await fileSha256(path.join(workspaceRoot, componentPath)),
    });
  }

  const manifest = {
    schemaVersion: 'presentation-preset-preview-manifest-v001',
    previewId: plan.previewId,
    generatedOn: '2026-07-20',
    purpose: '初期プリセット台帳の人間認定媒体。正式レンダラー、正式指示書、解決パッケージ、信頼bindingの実装・合格を意味しない。',
    llmUsed: false,
    modelRun: null,
    preset: {
      presetId: preset.presetId,
      registryVersion: registry.registryVersion,
      candidateRegistryPath: OUTPUT_FILES.candidateRegistry,
      candidateRegistrySha256: sha256Canonical(registry),
      presetValidationIndexPath: OUTPUT_FILES.presetValidationIndex,
      presetValidationIndexSha256: sha256Canonical(presetValidationIndex),
      defeatedProfileReused: false,
      defeatedProfileIds: ['default-conservative-v001', 'boxed_readable', 'zev_glow'],
    },
    materialIndex: {
      registryVersion: materialValidationIndex.registryVersion,
      path: OUTPUT_FILES.materialValidationIndex,
      sha256: sha256Canonical(materialValidationIndex),
      materialCount: 0,
      g7RealInstructionPermitted: false,
      g7PreviewUsesSyntheticCardOnly: true,
    },
    formalTrustBindingWritten: false,
    preflightOnlyTrustBindingPersisted: false,
    sourceSelection: {
      ...plan.sourceSelection,
      segments: sourceManifest,
    },
    componentProvenance: componentManifest,
    fontAssets: registry.fontAssets,
    environment: await environmentManifest(),
    indexCompatibility,
    layoutPreflight: {
      path: repoPath(layoutOutputPath),
      status: layoutPreflight.status,
      violationCount: layoutPreflight.violations.length,
      twoLinePositiveIntersectionCount: layoutPreflight.violations.filter(
        (violation) => violation.code === 'LINE_BOX_POSITIVE_INTERSECTION',
      ).length,
    },
    fontFallbackChecks,
    deterministicStill,
    scenes: plan.scenes.map((scene) => ({
      ...scene,
      stateId: policies.get(scene.kind).stateId,
      endResponsibility: policies.get(scene.kind).endResponsibility,
      ...(policies.get(scene.kind).endPolicyId ? { endPolicyId: policies.get(scene.kind).endPolicyId } : {}),
      layers: scene.layers.map((layer) => {
        const record = layerRecords.find((candidate) => candidate.sceneId === scene.sceneId && candidate.layerId === layer.layerId);
        return {
          ...layer,
          renderProps: record.props,
          overlayPath: repoPath(record.imagePath),
          overlaySha256: record.pngSha256,
          alphaInspection: record.alphaInspection,
        };
      }),
      representativeFrame: sceneFrameChecks.find((entry) => entry.sceneId === scene.sceneId),
    })),
    media: {
      publicPath: OUTPUT_FILES.previewMedia,
      filePath: repoPath(previewPath),
      ...mediaInspection,
    },
    preflight: {
      status: 'passed',
      externalDownloadUsed: false,
      allTenKindsRendered: new Set(plan.scenes.map((scene) => scene.kind)).size === 10,
      allRepresentativeFramesDifferFromSource: sceneFrameChecks.every((check) => check.overlayVisible),
      allOverlaysInsideSafeArea: layerRecords.every((record) => record.alphaInspection.bounds),
      managedFontsDifferFromFallback: fontFallbackChecks.every((check) => check.outputsDiffer),
      representativeStillByteDeterministic: deterministicStill.firstSha256 === deterministicStill.secondSha256,
      existingRendererAcceptanceClaimed: false,
    },
    humanWork: {
      requiredJudgements: 5,
      sessions: 1,
      timeMeasurement: false,
      exactTimeEntry: false,
      freeTextRequired: false,
    },
  };
  assert(manifest.preflight.allTenKindsRendered, 'not all ten kinds were rendered');
  await writeJson(path.join(OUTPUT_ROOT, OUTPUT_FILES.previewManifest), manifest);
  const manifestSha256 = await fileSha256(path.join(OUTPUT_ROOT, OUTPUT_FILES.previewManifest));
  const reviewHtml = buildReviewHtml({ manifest, manifestSha256 });
  validateReviewHtml(reviewHtml, manifest);
  await writeFile(path.join(OUTPUT_ROOT, OUTPUT_FILES.reviewHtml), reviewHtml);
  await writeFile(path.join(OUTPUT_ROOT, OUTPUT_FILES.resultTemplate), [
    '# 初期プリセット台帳v001 人間確認結果',
    '',
    '確認者: kawafmm',
    '時間計測: なし',
    `候補プリセット: ${preset.presetId}`,
    `preview manifest SHA-256: ${manifestSha256}`,
    '',
    '- Q1: 承認 / 修正が必要',
    '- Q2: 承認 / 修正が必要',
    '- Q3: 承認 / 修正が必要',
    '- Q4: 承認 / 修正が必要',
    '- Q5: 承認 / 修正が必要',
    '',
    '注記: G7のカードは認定preview専用で、正式素材・実指示・信頼bindingには含まれない。',
    '',
  ].join('\n'));
  await rm(workDir, { recursive: true, force: true });

  process.stdout.write(`${JSON.stringify({
    status: 'ready-for-human-review',
    outputRoot: repoPath(OUTPUT_ROOT),
    reviewHtml: repoPath(path.join(OUTPUT_ROOT, OUTPUT_FILES.reviewHtml)),
    previewMedia: repoPath(previewPath),
    presetId: preset.presetId,
    humanJudgements: 5,
    sessions: 1,
    timeMeasurement: false,
    formalTrustBindingWritten: false,
  }, null, 2)}\n`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
