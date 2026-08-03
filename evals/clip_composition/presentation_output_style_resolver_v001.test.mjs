import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_OUTPUT_CHARACTER_WIDTH_RULE_V001,
  resolvePresentationOutputStyleV001,
} from './presentation_output_style_resolver_v001.ts';
import {
  resolvePresentationLandscapePresetProjectionV001,
} from './presentation_renderer_plan_v002.mjs';

const ROOT = process.cwd();
const REGISTRY_ROOT = 'evals/clip_composition/registries/presentation';
const CROP_ROOT = 'evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006';
const H = 'a'.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalSha256 = value => sha256(Buffer.from(canonicalJson(value), 'utf8'));

const readJson = async relativePath => JSON.parse(
  await readFile(path.join(ROOT, relativePath), 'utf8'),
);

const readArtifact = async relativePath => {
  const absolutePath = path.join(ROOT, relativePath);
  const bytes = await readFile(absolutePath);
  return {
    path: relativePath,
    absolutePath,
    bytes,
    value: JSON.parse(bytes.toString('utf8')),
  };
};

const binding = schemaVersion => ({schemaVersion, path: 'fixture.json', fileSha256: H, canonicalSha256: H});
const artifactBinding = (schemaVersion, artifact) => ({
  schemaVersion,
  path: artifact.path,
  fileSha256: sha256(artifact.bytes),
  canonicalSha256: canonicalSha256(artifact.value),
});

const loadLandscape = async () => {
  const directory = `${REGISTRY_ROOT}/normal-landscape-preset-registry-v001`;
  const [trustedRegistryBindings, presetRegistry, presetValidationIndex,
    materialValidationIndex, rendererTrust] = await Promise.all([
    readArtifact(`${directory}/trusted-registry-bindings.json`),
    readArtifact(`${directory}/preset-registry.json`),
    readArtifact(`${directory}/preset-validation-index.json`),
    readArtifact(`${directory}/material-validation-index.json`),
    readArtifact(`${REGISTRY_ROOT}/presentation-renderer-trust-v001/trust.json`),
  ]);
  return {
    artifacts: {
      trustedRegistryBindings: trustedRegistryBindings.value,
      presetRegistry: presetRegistry.value,
      presetValidationIndex: presetValidationIndex.value,
      materialValidationIndex: materialValidationIndex.value,
      rendererTrust: rendererTrust.value,
    },
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
  };
};

const loadVertical = async () => {
  const directory = `${REGISTRY_ROOT}/vertical-short-preset-registry-v001`;
  const cropDecisionArtifact = await readArtifact(`${CROP_ROOT}/crop-decision-v006.json`);
  const cropSelectionPackageManifest = await readArtifact(
    `${CROP_ROOT}/selection-package-manifest-v006.json`,
  );
  const selection = cropSelectionPackageManifest.value;
  const decisionSha = sha256(cropDecisionArtifact.bytes);
  return {
    artifacts: {
      trustedRegistryBindings: await readJson(`${directory}/trusted-registry-bindings.json`),
      presetRegistry: await readJson(`${directory}/preset-registry.json`),
      presetValidationIndex: await readJson(`${directory}/preset-validation-index.json`),
      materialValidationIndex: await readJson(`${directory}/material-validation-index.json`),
      rendererTrust: await readJson(`${REGISTRY_ROOT}/presentation-vertical-renderer-trust-v001/trust.json`),
      cropDecisionArtifact,
      cropSelectionPackageManifest,
    },
    baseMediaBinding: {
      path: selection.sourceMedia.path,
      fileSha256: selection.sourceMedia.fileSha256,
    },
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
        decision: {
          schemaVersion: 'vertical-preset-type-crop-decision-v006',
          path: cropDecisionArtifact.path,
          fileSha256: decisionSha,
          canonicalSha256: H,
        },
        selectionPackageManifest: {
          schemaVersion: 'vertical-preset-type-crop-selection-package-v006',
          path: cropSelectionPackageManifest.path,
          fileSha256: sha256(cropSelectionPackageManifest.bytes),
          canonicalSha256: H,
        },
      },
      sceneTransitionPolicy: {mode: 'straight-cut-only'},
      audioPolicy: {mode: 'preserve-source-only'},
      materials: [],
    },
  };
};

const resolveLandscape = async () => {
  const fixture = await loadLandscape();
  return resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaBinding: {path: 'fixtures/base-media.mp4', fileSha256: H},
    baseMediaInspection: null,
  });
};

const resolveVertical = async () => {
  const fixture = await loadVertical();
  return resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
};

test('OSR001: 横型presetを既存registryから一意に解決する', async () => {
  const result = await resolveLandscape();
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolvedStyle.presetId, 'normal-landscape-readable-pop-v001');
  assert.equal(result.resolvedStyle.format, 'normal-landscape');

  const tampered = await loadLandscape();
  tampered.artifacts.presetValidationIndex.presets[0].presetId = 'foreign-preset-v001';
  const rejected = await resolvePresentationOutputStyleV001({
    ...tampered,
    baseMediaBinding: {path: 'fixtures/base-media.mp4', fileSha256: H},
    baseMediaInspection: null,
  });
  assert.equal(rejected.status, 'rejected');
  assert.deepEqual(rejected.violations.map(item => item.code), ['STYLE_BINDING_MISMATCH']);

  const selfDeclaredCopy = await loadLandscape();
  selfDeclaredCopy.styleInput.presetBinding.presetValidationIndex.path =
    'fixtures/self-declared-preset-validation-index.json';
  const copiedIndexResult = await resolvePresentationOutputStyleV001({
    ...selfDeclaredCopy,
    baseMediaBinding: {path: 'fixtures/base-media.mp4', fileSha256: H},
    baseMediaInspection: null,
  });
  assert.equal(copiedIndexResult.status, 'rejected');
  assert.deepEqual(
    copiedIndexResult.violations.map(item => item.code),
    ['STYLE_BINDING_MISMATCH'],
  );
});

test('OSR002: 縦型speaker_only presetを既存registryから一意に解決する', async () => {
  const result = await resolveVertical();
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolvedStyle.presetId, 'vertical-short-speaker-only-readable-pop-v001');
  assert.equal(result.resolvedStyle.screenLayoutId, 'speaker_only');
});

test('OSR003: 横型screenLayoutIdはnullかつcropはidentityである', async () => {
  const result = await resolveLandscape();
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolvedStyle.screenLayoutId, null);
  assert.deepEqual(result.cropContext, {mode: 'identity'});
});

test('OSR004: 未登録の縦型layoutをfallbackせず拒否する', async () => {
  const fixture = await loadVertical();
  fixture.styleInput.screenLayoutId = 'screen_speaker';
  const result = await resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
  assert.equal(result.status, 'rejected');
  assert.deepEqual(result.violations.map(item => item.code), ['PRESET_CAPABILITY_MISMATCH']);
});

test('OSR005: 横縦の幅能力は同じfieldに明示され暗黙定数へ戻らない', async () => {
  const [landscape, vertical] = await Promise.all([resolveLandscape(), resolveVertical()]);
  assert.equal(landscape.status, 'resolved');
  assert.equal(vertical.status, 'resolved');
  assert.equal(landscape.resolvedStyle.maxLogicalWidthPerLine, 36);
  assert.equal(vertical.resolvedStyle.maxLogicalWidthPerLine, 14);
  assert.deepEqual(Object.keys(landscape.resolvedStyle), Object.keys(vertical.resolvedStyle));
});

test('OSR006: crop decisionはレビュー時base mediaのpathとSHAへ束縛される', async () => {
  const fixture = await loadVertical();
  fixture.baseMediaBinding = {...fixture.baseMediaBinding, fileSha256: 'b'.repeat(64)};
  const result = await resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
  assert.equal(result.status, 'rejected');
  assert.deepEqual(result.violations.map(item => item.code), ['CROP_BINDING_MISMATCH']);

  const pathMismatch = await loadVertical();
  pathMismatch.styleInput.cropPolicy.selectionPackageManifest.path =
    `${CROP_ROOT}/byte-identical-copy.json`;
  const pathResult = await resolvePresentationOutputStyleV001({
    ...pathMismatch,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
  });
  assert.equal(pathResult.status, 'rejected');
  assert.deepEqual(pathResult.violations.map(item => item.code), ['CROP_BINDING_MISMATCH']);

  const trustMismatch = await loadVertical();
  const trustResult = await resolvePresentationOutputStyleV001({
    ...trustMismatch,
    baseMediaInspection: {width: 1920, height: 1080, frameCount: 1547, fps: 30},
    runtimeProfile: {},
    implementationBindings: [],
  });
  assert.equal(trustResult.status, 'rejected');
  assert.deepEqual(trustResult.violations.map(item => item.code), ['STYLE_BINDING_MISMATCH']);
  assert.equal(trustResult.violations[0].path, '/styleInput/presetBinding/rendererTrust');
});

test('OSR007: 横型preset projectionは既存共通入口のbyte列と同一である', async () => {
  const fixture = await loadLandscape();
  const result = await resolvePresentationOutputStyleV001({
    ...fixture,
    baseMediaBinding: {path: 'fixtures/base-media.mp4', fileSha256: H},
    baseMediaInspection: null,
  });
  const projection = resolvePresentationLandscapePresetProjectionV001(
    fixture.artifacts.presetRegistry,
    fixture.styleInput.presetBinding.presetId,
    'speech-caption',
  );
  assert.equal(result.status, 'resolved');
  assert.equal(JSON.stringify({
    preset: result.layoutContext.preset,
    policy: result.layoutContext.policy,
    visualState: result.layoutContext.visualState,
    transition: result.layoutContext.transition,
  }), JSON.stringify(projection));
});

test('OSR008: 縦型cropは既存共通入口だけを呼び第二計算を持たない', async () => {
  const source = await readFile(
    path.join(ROOT, 'evals/clip_composition/presentation_output_style_resolver_v001.ts'),
    'utf8',
  );
  assert.match(source, /buildPresentationVerticalCropFilterV001\s*\(/u);
  assert.match(source, /validatePresentationVerticalCropSourceBindingV001\s*\(/u);
  assert.doesNotMatch(source, /buildLayoutVideoFilter/u);
  const result = await resolveVertical();
  assert.equal(result.status, 'resolved');
  assert.equal(result.cropContext.mode, 'bound-decision');
  assert.equal(result.cropContext.screenLayoutId, 'speaker_only');
});
