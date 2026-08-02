#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  canonicalJsonV001,
  serializeJsonFileV001,
  sha256BytesV001,
  sha256CanonicalV001,
} from './presentation_retained_source_atoms_v001.mjs';

export const VERTICAL_PRESET_FINALIZER_SCHEMA_VERSION =
  'presentation-vertical-preset-finalization-job-v001';
export const VERTICAL_PRESET_FINALIZATION_REPORT_SCHEMA_VERSION =
  'presentation-vertical-preset-finalization-report-v001';
export const VERTICAL_PRESET_FINALIZER_FATAL_SCHEMA_VERSION =
  'presentation-formal-runner-fatal-v001';
export const VERTICAL_PRESET_FINALIZER_RUNNER_ID =
  'presentation-vertical-preset-finalizer-v001';
export const VERTICAL_PRESET_FINALIZER_FATAL_CODE =
  'VERTICAL_PRESET_FINALIZER_FATAL';
export const VERTICAL_PRESET_REGISTRY_SCHEMA_VERSION =
  'presentation-preset-registry-v002';
export const VERTICAL_PRESET_REGISTRY_VERSION =
  'vertical-short-preset-registry-v001';
export const VERTICAL_RENDERER_TRUST_VERSION =
  'presentation-vertical-renderer-trust-v001';
export const VERTICAL_SCREEN_LAYOUT_VOCABULARY_VERSION =
  'shorts-screen-layout-v001';
export const VERTICAL_FORMAT = 'vertical-short-1080x1920';
export const VERTICAL_PRESET_ID =
  'vertical-short-speaker-only-readable-pop-v001';
export const VERTICAL_VISUAL_STATE_ID =
  'caption-core-vertical-speaker-only-v001';
export const EMPTY_MATERIAL_REGISTRY_VERSION =
  'presentation-material-registry-empty-v001';

export const VERTICAL_SCREEN_LAYOUT_VOCABULARY = Object.freeze([
  'speaker_only',
  'screen_speaker',
  'speaker_pair',
]);

export const VERTICAL_PRESET_VIOLATION_CODES = Object.freeze([
  'VERTICAL_PRESET_REGISTRY_INVALID',
  'VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID',
  'VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED',
  'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
  'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
  'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
]);

const REPORT_VIOLATION_CODES = Object.freeze(
  VERTICAL_PRESET_VIOLATION_CODES.filter(
    (code) => code !== 'VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED',
  ),
);

export const VERTICAL_COMPONENT_PROVENANCE = Object.freeze([
  Object.freeze({
    role: 'vertical-renderer',
    path: 'evals/clip_composition/render_presentation_vertical_review_v001.ts',
  }),
  Object.freeze({
    role: 'renderer-qc',
    path: 'evals/clip_composition/presentation_renderer_qc_v002.mjs',
  }),
  Object.freeze({
    role: 'renderer-core',
    path: 'evals/clip_composition/render_presentation_v002.mjs',
  }),
  Object.freeze({
    role: 'remotion-root',
    path: 'runner/src/remotion/Root.tsx',
  }),
  Object.freeze({
    role: 'telop-text',
    path: 'runner/src/remotion/components/TelopText.tsx',
  }),
  Object.freeze({
    role: 'remotion-entry',
    path: 'runner/src/remotion/index.ts',
  }),
  Object.freeze({
    role: 'telop-renderer',
    path: 'runner/src/remotion/renderer/TelopRenderer.tsx',
  }),
  Object.freeze({
    role: 'telop-css',
    path: 'runner/src/remotion/styles/telop.css',
  }),
  Object.freeze({
    role: 'telop-font',
    path: 'runner/src/remotion/utils/telop-font.ts',
  }),
  Object.freeze({
    role: 'screen-layout',
    path: 'runner/src/screen-layout.ts',
  }),
  Object.freeze({
    role: 'telop-glow',
    path: 'runner/src/shared/telop-glow.ts',
  }),
  Object.freeze({
    role: 'telop-remotion',
    path: 'runner/src/telop-remotion.ts',
  }),
  Object.freeze({
    role: 'telop-line-break',
    path: 'runner/src/telop/telop-line-break.ts',
  }),
  Object.freeze({
    role: 'telop-render-model',
    path: 'runner/src/telop/telop-render-model.ts',
  }),
  Object.freeze({
    role: 'text-metrics',
    path: 'runner/src/telop/text-metrics.ts',
  }),
]);

const VERTICAL_PIXEL_RUNTIME_ROOTS = Object.freeze([
  'runner/src/remotion/Root.tsx',
  'runner/src/remotion/components/TelopText.tsx',
  'runner/src/remotion/index.ts',
  'runner/src/remotion/renderer/TelopRenderer.tsx',
  'runner/src/remotion/utils/telop-font.ts',
  'runner/src/shared/telop-glow.ts',
  'runner/src/telop/telop-line-break.ts',
  'runner/src/telop/telop-render-model.ts',
  'runner/src/telop/text-metrics.ts',
]);

export const VERTICAL_PREVIEW_ROOT =
  'evals/clip_composition/outputs/presentation/vertical-preset-previews/' +
  'qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate';
export const VERTICAL_PREVIEW_MANIFEST_PATH =
  `${VERTICAL_PREVIEW_ROOT}/preview-v008/preview-manifest.json`;
export const VERTICAL_PREVIEW_MANIFEST_FILE_SHA256 =
  'ecef15111403e6091d7df03c30d4542e84e1f549d142f882f0725a849f09c634';
export const VERTICAL_PREVIEW_PREFLIGHT_PATH =
  `${VERTICAL_PREVIEW_ROOT}/preview-v008/preflight.json`;
export const VERTICAL_PREVIEW_PREFLIGHT_FILE_SHA256 =
  '9f97665bf0010bdd3967a0b942b41f5bb09d320275aa7edc091d044f93305f1a';
export const VERTICAL_APPROVED_MEDIA_PATH =
  `${VERTICAL_PREVIEW_ROOT}/preview-v008/vertical-fullwidth-caption-review-v008.mp4`;
export const VERTICAL_APPROVED_MEDIA_FILE_SHA256 =
  '24a632ff99acadf97c2a18762420a7db4ecbc4b4b374b9bcae3d0d41bd3fe650';
export const VERTICAL_APPROVED_PREVIEW_ID =
  'qdczJpv8RCc-candidate-59-vertical-fullwidth-caption-preview-v008';

export const VERTICAL_FONT = Object.freeze({
  fontAssetId: 'line-seed-jp-extra-bold-v001',
  fileName: 'LINESeedJP_A_OTF_Eb.otf',
  path: 'runner/public/font/LINESeedJP_A_OTF_Eb.otf',
  sha256: '4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfb',
  licensePath: 'runner/public/font/OFL_LINESeedJP.txt',
  licenseFileSha256:
    '8aa3e80c0d02c9f999756a5bb21258700edea4c727dab6169f6460245c4b6f0a',
});

export const VERTICAL_PREVIEW_COMPONENTS = Object.freeze([
  Object.freeze({
    role: 'preview-manifest',
    path: VERTICAL_PREVIEW_MANIFEST_PATH,
    fileSha256: VERTICAL_PREVIEW_MANIFEST_FILE_SHA256,
  }),
  Object.freeze({
    role: 'preview-media',
    path: VERTICAL_APPROVED_MEDIA_PATH,
    fileSha256: VERTICAL_APPROVED_MEDIA_FILE_SHA256,
  }),
  Object.freeze({
    role: 'preview-preflight',
    path: VERTICAL_PREVIEW_PREFLIGHT_PATH,
    fileSha256: VERTICAL_PREVIEW_PREFLIGHT_FILE_SHA256,
  }),
  Object.freeze({
    role: 'preview-qa-frame',
    path: `${VERTICAL_PREVIEW_ROOT}/preview-v008/qa-frame-middle.png`,
    fileSha256:
      '5e94fe1081ffe46e6676be1b5664d7e4ea868be9ddeee17e39ee0462a8d55e8c',
  }),
  Object.freeze({
    role: 'caption-overlay-01',
    path: `${VERTICAL_PREVIEW_ROOT}/preview-v008/overlays/caption-01-caption-cue-000003.png`,
    fileSha256:
      '129524f3c7f511238fd0f837223d48a98515f379fc3c3bc78c68b7a08d07b9ce',
  }),
  Object.freeze({
    role: 'caption-overlay-02',
    path: `${VERTICAL_PREVIEW_ROOT}/preview-v008/overlays/caption-02-caption-cue-000006.png`,
    fileSha256:
      '323c33457d40301c0f9e4c840b41111e6ab3cee64c2869f734dbabb5606f2c2c',
  }),
  Object.freeze({
    role: 'caption-overlay-03',
    path: `${VERTICAL_PREVIEW_ROOT}/preview-v008/overlays/caption-03-caption-cue-000014.png`,
    fileSha256:
      'd5fc8b473f1a1bb2a60fe2b994aa78572b93080751183897ae9de9e712df37b8',
  }),
  Object.freeze({
    role: 'width-probe-133',
    path: `${VERTICAL_PREVIEW_ROOT}/preview-v008/overlays/qa-width-search-133px.png`,
    fileSha256:
      '49bc6c82e9d6ecdb2ab814f6c8d5fdb402e6888774f8f948c228455bc4bc0b7d',
  }),
  Object.freeze({
    role: 'width-probe-134',
    path: `${VERTICAL_PREVIEW_ROOT}/preview-v008/overlays/qa-width-search-134px.png`,
    fileSha256:
      '129524f3c7f511238fd0f837223d48a98515f379fc3c3bc78c68b7a08d07b9ce',
  }),
  Object.freeze({
    role: 'width-probe-135',
    path: `${VERTICAL_PREVIEW_ROOT}/preview-v008/overlays/qa-width-search-135px.png`,
    fileSha256:
      '5fb3eb268275ff62015b0ddd5f3da4d14b76e3a92ea5608aef0b2749bc367048',
  }),
]);

export const VERTICAL_PIXEL_PROBES = Object.freeze([
  Object.freeze({
    probeId: 'caption-overlay-01',
    sourceKind: 'scene',
    sourceIndex: 0,
    sourceIdentity: 'fullwidth-caption-01',
    lines: Object.freeze(['これやばいよね']),
    glowSeed: 'vertical-fullwidth-caption-cue-000003',
    fontSizeOverridePx: null,
    approvedPath: VERTICAL_PREVIEW_COMPONENTS[4].path,
    approvedFileSha256: VERTICAL_PREVIEW_COMPONENTS[4].fileSha256,
    approvedRgbaSha256:
      'fcd8db69627cd8b491948c81e249bc04f81512e86a2df7e9c7e1b75e74071094',
  }),
  Object.freeze({
    probeId: 'caption-overlay-02',
    sourceKind: 'scene',
    sourceIndex: 1,
    sourceIdentity: 'fullwidth-caption-02',
    lines: Object.freeze(['やり始めるから', 'あっちこっちで']),
    glowSeed: 'vertical-fullwidth-caption-cue-000006',
    fontSizeOverridePx: null,
    approvedPath: VERTICAL_PREVIEW_COMPONENTS[5].path,
    approvedFileSha256: VERTICAL_PREVIEW_COMPONENTS[5].fileSha256,
    approvedRgbaSha256:
      'e24e74a2299a795b994e83190952bddcda9c73031f9e222cd20a2e02e171289f',
  }),
  Object.freeze({
    probeId: 'caption-overlay-03',
    sourceKind: 'scene',
    sourceIndex: 2,
    sourceIdentity: 'fullwidth-caption-03',
    lines: Object.freeze(['困ったもんです']),
    glowSeed: 'vertical-fullwidth-caption-cue-000014',
    fontSizeOverridePx: null,
    approvedPath: VERTICAL_PREVIEW_COMPONENTS[6].path,
    approvedFileSha256: VERTICAL_PREVIEW_COMPONENTS[6].fileSha256,
    approvedRgbaSha256:
      'fad3841e7bd4550220f9e74e44c0f7923da1d385cece14f9be422615a1ff8bae',
  }),
  Object.freeze({
    probeId: 'width-probe-134',
    sourceKind: 'rendered-pixel-search',
    sourceIndex: 1,
    sourceIdentity: 'font-size-134',
    lines: Object.freeze(['これやばいよね']),
    glowSeed: 'vertical-fullwidth-probe-134',
    fontSizeOverridePx: null,
    approvedPath: VERTICAL_PREVIEW_COMPONENTS[8].path,
    approvedFileSha256: VERTICAL_PREVIEW_COMPONENTS[8].fileSha256,
    approvedRgbaSha256:
      'fcd8db69627cd8b491948c81e249bc04f81512e86a2df7e9c7e1b75e74071094',
  }),
  Object.freeze({
    probeId: 'width-probe-135',
    sourceKind: 'rendered-pixel-search',
    sourceIndex: 2,
    sourceIdentity: 'font-size-135',
    lines: Object.freeze(['これやばいよね']),
    glowSeed: 'vertical-fullwidth-probe-135',
    fontSizeOverridePx: 135,
    approvedPath: VERTICAL_PREVIEW_COMPONENTS[9].path,
    approvedFileSha256: VERTICAL_PREVIEW_COMPONENTS[9].fileSha256,
    approvedRgbaSha256:
      'b81ba768a1c03efca49fd64833a3dfd62f4e7c1c5cd98e85d1354d3fcb36c6d9',
  }),
]);

const SHA_PATTERN = /^[0-9a-f]{64}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SEMVER_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const CHARACTER_WIDTH_RULE =
  'U+0000..U+00FF=1; other Unicode code point=2';
const FINALIZER_PATH =
  'evals/clip_composition/finalize_presentation_vertical_speaker_only_preset_v001.mjs';
const CANONICAL_CORE_PATH =
  'evals/clip_composition/presentation_retained_source_atoms_v001.mjs';
const FINALIZATION_JOB_ROOT =
  'evals/clip_composition/outputs/presentation/vertical-preset-finalization-jobs';
const REGISTRY_ROOT =
  'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001';
const TRUST_ROOT =
  'evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001';
const REPORT_PATH = `${REGISTRY_ROOT}/preset-finalization-report.json`;

const PRESET_REGISTRY_PATH = `${REGISTRY_ROOT}/preset-registry.json`;
const PRESET_VALIDATION_INDEX_PATH =
  `${REGISTRY_ROOT}/preset-validation-index.json`;
const MATERIAL_VALIDATION_INDEX_PATH =
  `${REGISTRY_ROOT}/material-validation-index.json`;
const TRUSTED_REGISTRY_BINDINGS_PATH =
  `${REGISTRY_ROOT}/trusted-registry-bindings.json`;
const RENDERER_TRUST_PATH = `${TRUST_ROOT}/trust.json`;

const exactKeys = (value, expected) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  JSON.stringify(Object.keys(value)) === JSON.stringify(expected);
const sameCanonical = (left, right) =>
  canonicalJsonV001(left) === canonicalJsonV001(right);
const sameOrderedJson = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const clone = (value) => structuredClone(value);

class VerticalPresetContractError extends Error {
  constructor(code, relatedPaths, message) {
    super(message);
    this.name = 'VerticalPresetContractError';
    this.code = code;
    this.relatedPaths = [...new Set(relatedPaths)].sort();
  }
}

const fail = (code, relatedPaths, message) => {
  throw new VerticalPresetContractError(code, relatedPaths, message);
};

const requireCondition = (condition, code, relatedPaths, message) => {
  if (!condition) fail(code, relatedPaths, message);
};

const requireSha = (value, code, relatedPath) => {
  requireCondition(
    typeof value === 'string' && SHA_PATTERN.test(value),
    code,
    [relatedPath],
    `${relatedPath} must be a lowercase SHA-256`,
  );
};

const fileRecord = (value) => ({
  path: value.path,
  fileSha256: value.fileSha256,
});

const resolveRelativeImportToAllowedPath = (
  importerPath,
  specifier,
  allowedPaths,
) => {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(importerPath), specifier),
  );
  const matches = allowedPaths.filter((candidate) => {
    if (candidate === base) return true;
    const extensionless = candidate.replace(/\.(?:[cm]?[jt]sx?|css)$/u, '');
    if (extensionless === base) return true;
    return extensionless.endsWith('/index') &&
      extensionless.slice(0, -'/index'.length) === base;
  });
  return matches.length === 1 ? matches[0] : null;
};

export function verifyVerticalRendererImportGraphV001(sourceByPath) {
  const allowedPaths = VERTICAL_COMPONENT_PROVENANCE.map((entry) => entry.path);
  const runtimeEdges = [];
  for (const importerPath of VERTICAL_PIXEL_RUNTIME_ROOTS) {
    const source = sourceByPath[importerPath];
    requireCondition(
      typeof source === 'string',
      'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
      [importerPath],
      `renderer import source is missing: ${importerPath}`,
    );
    requireCondition(
      !/\b(?:require\s*\(|import\s*\()\s*['"][.]{1,2}\//u.test(source),
      'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
      [importerPath],
      `dynamic local import is forbidden: ${importerPath}`,
    );
    const statements = [
      ...source.matchAll(
        /^\s*import\s+(type\s+)?([^;\n]*?)(?:\s+from\s+)?['"]([^'"]+)['"]\s*;?/gmu,
      ),
      ...source.matchAll(
        /^\s*export\s+(type\s+)?[^;\n]*?\s+from\s+['"]([^'"]+)['"]\s*;?/gmu,
      ),
    ];
    for (const match of statements) {
      const isExport = match[0].trimStart().startsWith('export');
      const typeOnly = match[1] === 'type ';
      const clause = isExport ? match[0] : match[2];
      const specifier = isExport ? match[2] : match[3];
      if (
        typeOnly ||
        (!isExport &&
          /^\s*\{\s*type\s+[^,{}]+\s*\}\s*$/u.test(clause ?? ''))
      ) {
        continue;
      }
      if (!specifier.startsWith('.')) continue;
      const resolved = resolveRelativeImportToAllowedPath(
        importerPath,
        specifier,
        allowedPaths,
      );
      requireCondition(
        resolved !== null,
        'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
        [importerPath],
        `relative runtime import is outside the approved graph: ${specifier}`,
      );
      runtimeEdges.push({
        importerPath,
        specifier,
        resolvedPath: resolved,
      });
    }
  }
  requireCondition(
    runtimeEdges.some(
      (edge) =>
        edge.importerPath ===
          'runner/src/remotion/renderer/TelopRenderer.tsx' &&
        edge.resolvedPath === 'runner/src/remotion/styles/telop.css',
    ),
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    [
      'runner/src/remotion/renderer/TelopRenderer.tsx',
      'runner/src/remotion/styles/telop.css',
    ],
    'TelopRenderer must retain its approved CSS runtime import',
  );
  return runtimeEdges;
}

export function buildVerticalPresetRegistryV002(componentBindings) {
  requireCondition(
    Array.isArray(componentBindings) &&
      componentBindings.length === VERTICAL_COMPONENT_PROVENANCE.length,
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    VERTICAL_COMPONENT_PROVENANCE.map((entry) => entry.path),
    'component binding count mismatch',
  );
  const provenance = VERTICAL_COMPONENT_PROVENANCE.map((expected, index) => {
    const actual = componentBindings[index];
    requireCondition(
      exactKeys(actual, ['role', 'path', 'fileSha256']) &&
        actual.role === expected.role &&
        actual.path === expected.path,
      'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
      [expected.path],
      `component binding ${expected.role} mismatch`,
    );
    requireSha(
      actual.fileSha256,
      'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
      expected.path,
    );
    return {
      role: expected.role,
      path: expected.path,
      fileSha256: actual.fileSha256,
    };
  });

  return {
    schemaVersion: VERTICAL_PRESET_REGISTRY_SCHEMA_VERSION,
    registryVersion: VERTICAL_PRESET_REGISTRY_VERSION,
    format: VERTICAL_FORMAT,
    screenLayoutVocabularyVersion: VERTICAL_SCREEN_LAYOUT_VOCABULARY_VERSION,
    screenLayoutVocabulary: [...VERTICAL_SCREEN_LAYOUT_VOCABULARY],
    canvas: {
      width: 1080,
      height: 1920,
      fps: 30,
      safeAreaPx: {
        top: 38,
        right: 43,
        bottom: 38,
        left: 43,
      },
    },
    fontAssets: [
      {
        fontAssetId: VERTICAL_FONT.fontAssetId,
        fileName: VERTICAL_FONT.fileName,
        path: VERTICAL_FONT.path,
        sha256: VERTICAL_FONT.sha256,
        licensePath: VERTICAL_FONT.licensePath,
      },
    ],
    componentProvenance: provenance,
    transitions: [
      {
        transitionId: 'quick-fade-4f-v001',
        entry: {
          type: 'alpha-fade',
          frames: 4,
        },
        exit: {
          type: 'alpha-fade',
          frames: 4,
        },
      },
    ],
    endPolicies: [
      {
        endPolicyId: 'resolved-target-final-atom-v001',
        rule:
          '解決済み対象に含まれる最後のsource atomのendMsで表示を終了する',
        inventedDuration: false,
      },
    ],
    presets: [
      {
        presetId: VERTICAL_PRESET_ID,
        format: VERTICAL_FORMAT,
        screenLayoutId: 'speaker_only',
        styleFamily: 'readable-pop',
        visualStates: [
          {
            stateId: VERTICAL_VISUAL_STATE_ID,
            textStyle: {
              fontAssetId: VERTICAL_FONT.fontAssetId,
              fontSizePx: 134,
              fontColor: '#FFFDF8',
              borderColor: '#111827',
              borderWidthPx: 11,
              lineSpacingPercent: 150,
              glowColor: '#000000',
              glowWidthPx: 17,
              glowOpacityPercent: 82,
            },
            position: {
              preset: 'bottom-center',
              alignment: 'center',
              offsetXPercent: 0,
              offsetYPercent: -6,
            },
            background: null,
            layout: {
              maxSupportedLogicalWidthPerLine: 14,
              maxLines: 2,
              singleLine: false,
              characterWidthRule: CHARACTER_WIDTH_RULE,
            },
            transitionId: 'quick-fade-4f-v001',
          },
        ],
        kindPolicies: [
          {
            kind: 'speech-caption',
            stateId: VERTICAL_VISUAL_STATE_ID,
            endResponsibility: 'target-anchor',
            allowedMaterialRoles: [],
            requiredMaterialRoles: [],
          },
        ],
      },
    ],
  };
}

export function deriveVerticalPresetValidationIndexV001(registry) {
  validateVerticalPresetRegistryV002(registry);
  return {
    registryVersion: registry.registryVersion,
    registeredScreenLayoutIds: [
      ...new Set(registry.presets.map((preset) => preset.screenLayoutId)),
    ].sort(),
    presets: registry.presets.map((preset) => ({
      presetId: preset.presetId,
      format: preset.format,
      screenLayoutId: preset.screenLayoutId,
      kindPolicies: preset.kindPolicies.map((policy) => ({
        kind: policy.kind,
        endResponsibility: policy.endResponsibility,
        allowedMaterialRoles: [...policy.allowedMaterialRoles],
        requiredMaterialRoles: [...policy.requiredMaterialRoles],
      })),
    })),
  };
}

export const buildVerticalMaterialValidationIndexV001 = () => ({
  registryVersion: EMPTY_MATERIAL_REGISTRY_VERSION,
  materials: [],
});

export function buildVerticalTrustedRegistryBindingsV002(
  presetValidationIndex,
  materialValidationIndex,
) {
  return {
    schemaVersion: 'presentation-registry-trust-v002',
    presetRegistryVersion: VERTICAL_PRESET_REGISTRY_VERSION,
    presetValidationIndexSha256:
      sha256CanonicalV001(presetValidationIndex),
    materialRegistryVersion: EMPTY_MATERIAL_REGISTRY_VERSION,
    materialValidationIndexSha256:
      sha256CanonicalV001(materialValidationIndex),
    screenLayoutVocabularyVersion: VERTICAL_SCREEN_LAYOUT_VOCABULARY_VERSION,
  };
}

export function resolveVerticalPresetV001(registry, screenLayoutId) {
  validateVerticalPresetRegistryV002(registry);
  requireCondition(
    VERTICAL_SCREEN_LAYOUT_VOCABULARY.includes(screenLayoutId),
    'VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID',
    ['screenLayoutVocabulary'],
    `screen layout ${String(screenLayoutId)} is not in the approved vocabulary`,
  );
  const preset = registry.presets.find(
    (entry) => entry.screenLayoutId === screenLayoutId,
  );
  requireCondition(
    preset !== undefined,
    'VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED',
    ['presets'],
    `screen layout ${screenLayoutId} is allowed but has no registered preset`,
  );
  return clone(preset);
}

export function validateVerticalPresetRegistryV002(registry) {
  const expectedComponents = registry?.componentProvenance;
  requireCondition(
    Array.isArray(expectedComponents),
    'VERTICAL_PRESET_REGISTRY_INVALID',
    [PRESET_REGISTRY_PATH],
    'component provenance must be an array',
  );
  const reconstructed = buildVerticalPresetRegistryV002(expectedComponents);
  const registryWithoutVocabulary = clone(registry);
  const expectedWithoutVocabulary = clone(reconstructed);
  delete registryWithoutVocabulary.screenLayoutVocabulary;
  delete expectedWithoutVocabulary.screenLayoutVocabulary;
  requireCondition(
    sameOrderedJson(registryWithoutVocabulary, expectedWithoutVocabulary),
    'VERTICAL_PRESET_REGISTRY_INVALID',
    [PRESET_REGISTRY_PATH],
    'vertical preset registry does not match the approved exact schema and values',
  );
  requireCondition(
    JSON.stringify(registry.screenLayoutVocabulary) ===
      JSON.stringify(VERTICAL_SCREEN_LAYOUT_VOCABULARY),
    'VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID',
    [PRESET_REGISTRY_PATH],
    'screen layout vocabulary must contain the approved three IDs in order',
  );
  return true;
}

const presetProjectionFromRegistry = (registry) => {
  const preset = registry.presets[0];
  const state = preset.visualStates[0];
  const transition = registry.transitions.find(
    (entry) => entry.transitionId === state.transitionId,
  );
  return {
    presetId: preset.presetId,
    stateId: state.stateId,
    format: preset.format,
    screenLayoutId: preset.screenLayoutId,
    canvas: clone(registry.canvas),
    textStyle: clone(state.textStyle),
    position: clone(state.position),
    layout: clone(state.layout),
    transition: clone(transition),
  };
};

export function buildVerticalPixelProbeInputsV001({
  registry,
  preflightCanonicalSha256,
  runtimeProfile,
}) {
  validateVerticalPresetRegistryV002(registry);
  requireSha(
    preflightCanonicalSha256,
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    VERTICAL_PREVIEW_PREFLIGHT_PATH,
  );
  const runtimeSubset = Object.fromEntries(
    ['node', 'tsx', 'remotion', 'browser'].map((role) => [
      role,
      clone(runtimeProfile[role]),
    ]),
  );
  return VERTICAL_PIXEL_PROBES.map((probe) => ({
    schemaVersion:
      'presentation-vertical-preset-pixel-equivalence-probe-input-v001',
    probeId: probe.probeId,
    sourceBinding: {
      preflightPath: VERTICAL_PREVIEW_PREFLIGHT_PATH,
      preflightFileSha256: VERTICAL_PREVIEW_PREFLIGHT_FILE_SHA256,
      preflightCanonicalSha256,
      sourceKind: probe.sourceKind,
      sourceIndex: probe.sourceIndex,
      sourceIdentity: probe.sourceIdentity,
      approvedPath: probe.approvedPath,
      approvedFileSha256: probe.approvedFileSha256,
    },
    presetProjection: presetProjectionFromRegistry(registry),
    lines: [...probe.lines],
    glowSeed: probe.glowSeed,
    fontSizeOverridePx: probe.fontSizeOverridePx,
    runtimeProfile: runtimeSubset,
  }));
}

export function validateVerticalPreviewBindingsV001({
  previewManifest,
  previewManifestFileSha256,
  previewPreflight,
  previewPreflightFileSha256,
}) {
  requireCondition(
    previewManifestFileSha256 === VERTICAL_PREVIEW_MANIFEST_FILE_SHA256,
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    [VERTICAL_PREVIEW_MANIFEST_PATH],
    'preview manifest file SHA mismatch',
  );
  requireCondition(
    previewPreflightFileSha256 === VERTICAL_PREVIEW_PREFLIGHT_FILE_SHA256,
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    [VERTICAL_PREVIEW_PREFLIGHT_PATH],
    'preview preflight file SHA mismatch',
  );
  const manifestArtifacts = previewManifest?.artifacts;
  requireCondition(
    Array.isArray(manifestArtifacts) && manifestArtifacts.length === 10,
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    [VERTICAL_PREVIEW_MANIFEST_PATH],
    'preview manifest must contain exactly ten artifacts',
  );
  const expectedManifestArtifacts = VERTICAL_PREVIEW_COMPONENTS.slice(1);
  const expectedIncludingReview = [
    fileRecord(VERTICAL_PREVIEW_COMPONENTS[1]),
    {
      path: `${VERTICAL_PREVIEW_ROOT}/preview-v008/review.html`,
      fileSha256:
        '963d77311978c01d44a6ec32f0fcaeb983f1f8d3f9c9f3fc845367de0596968d',
    },
    ...expectedManifestArtifacts.slice(1).map(fileRecord),
  ];
  requireCondition(
    sameCanonical(manifestArtifacts, expectedIncludingReview),
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    [VERTICAL_PREVIEW_MANIFEST_PATH],
    'preview manifest artifacts do not match the approved ten artifacts',
  );
  requireCondition(
    previewManifest.previewMedia === VERTICAL_APPROVED_MEDIA_PATH &&
      previewManifest.preflight === VERTICAL_PREVIEW_PREFLIGHT_PATH &&
      previewPreflight?.status === 'passed' &&
      previewPreflight?.formatInput?.maxLogicalWidthPerLine === 14 &&
      previewPreflight?.formatInput?.maxLines === 2 &&
      previewPreflight?.crop?.screenLayoutId === 'speaker_only' &&
      previewPreflight?.typography?.selectedFontSizePx === 134 &&
      previewPreflight?.typography?.selectedBorderWidthPx === 11 &&
      previewPreflight?.typography?.selectedGlowWidthPx === 17,
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    [VERTICAL_PREVIEW_MANIFEST_PATH, VERTICAL_PREVIEW_PREFLIGHT_PATH],
    'approved preview values mismatch',
  );
  for (const [index, probe] of VERTICAL_PIXEL_PROBES.entries()) {
    if (probe.sourceKind === 'scene') {
      const scene = previewPreflight.scenes?.[probe.sourceIndex];
      requireCondition(
        scene?.sceneId === probe.sourceIdentity &&
          JSON.stringify(scene.lines?.map((line) => line.text)) ===
            JSON.stringify(probe.lines) &&
          scene.overlayPath === probe.approvedPath &&
          scene.overlayFileSha256 === probe.approvedFileSha256,
        'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
        [VERTICAL_PREVIEW_PREFLIGHT_PATH, probe.approvedPath],
        `scene source mismatch for probe ${probe.probeId}`,
      );
    } else {
      const search = previewPreflight.typography?.renderedPixelSearch?.[
        probe.sourceIndex
      ];
      requireCondition(
        search?.fontSizePx === (probe.fontSizeOverridePx ?? 134) &&
          search?.imagePath === probe.approvedPath &&
          search?.imageFileSha256 === probe.approvedFileSha256,
        'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
        [VERTICAL_PREVIEW_PREFLIGHT_PATH, probe.approvedPath],
        `width search source mismatch for probe ${probe.probeId}`,
      );
    }
    requireCondition(
      VERTICAL_PREVIEW_COMPONENTS.some(
        (entry) =>
          entry.path === probe.approvedPath &&
          entry.fileSha256 === probe.approvedFileSha256,
      ),
      'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
      [probe.approvedPath],
      `probe ${index + 1} does not bind a manifest artifact`,
    );
  }
  return true;
}

export function decodeToolVersionStdoutV001(stdoutBytes) {
  const bytes = Buffer.from(stdoutBytes);
  if (bytes.length < 2 || bytes.at(-1) !== 0x0a) {
    throw new Error('tool version stdout must end in exactly one LF');
  }
  if (bytes.at(-2) === 0x0a) {
    throw new Error('tool version stdout may not end in multiple LF bytes');
  }
  const end = bytes.at(-2) === 0x0d ? bytes.length - 2 : bytes.length - 1;
  const body = bytes.subarray(0, end);
  if (body.length === 0 || body.includes(0)) {
    throw new Error('tool version stdout is empty or contains NUL');
  }
  return new TextDecoder('utf-8', {fatal: true}).decode(body);
}

export function decodeRemotionHelpVersionV001(stdoutBytes) {
  const helpBody = decodeToolVersionStdoutV001(stdoutBytes);
  const firstLine = helpBody.split('\n', 1)[0];
  const match = /^@remotion\/cli ([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)$/.exec(
    firstLine,
  );
  if (!match || !SEMVER_PATTERN.test(match[1])) {
    throw new Error('Remotion help first line is not @remotion/cli <semver>');
  }
  return match[1];
}

export const verticalToolCommandV001 = (role, runtimeProfile) => {
  const tool = runtimeProfile[role];
  if (role === 'tsx') {
    return {
      command: runtimeProfile.node.path,
      args: [tool.path, '--version'],
      decoder: decodeToolVersionStdoutV001,
    };
  }
  if (role === 'remotion') {
    return {
      command: runtimeProfile.node.path,
      args: [tool.path, '--help'],
      decoder: decodeRemotionHelpVersionV001,
    };
  }
  return {
    command: tool.path,
    args: role === 'node' || role === 'browser' ? ['--version'] : ['-version'],
    decoder: decodeToolVersionStdoutV001,
  };
};

export function verifyVerticalRuntimeProfileObservationV001(
  runtimeProfile,
  observations,
) {
  const roles = [
    'node',
    'tsx',
    'remotion',
    'browser',
    'ffmpeg',
    'ffprobe',
    'imageMagick',
  ];
  requireCondition(
    exactKeys(runtimeProfile, roles),
    'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
    roles,
    'runtime profile keys mismatch',
  );
  for (const role of roles) {
    const tool = runtimeProfile[role];
    requireCondition(
      exactKeys(tool, ['path', 'version', 'fileSha256']) &&
        typeof tool.path === 'string' &&
        tool.path.length > 0 &&
        typeof tool.version === 'string',
      'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
      [role],
      `runtime binding ${role} shape mismatch`,
    );
    requireSha(
      tool.fileSha256,
      'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
      tool.path,
    );
    const observation = observations[role];
    requireCondition(
      observation?.exitCode === 0 &&
        Buffer.from(observation.stderr ?? []).length === 0,
      'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
      [tool.path],
      `runtime command ${role} did not exit cleanly`,
    );
    let observedVersion;
    try {
      observedVersion = verticalToolCommandV001(
        role,
        runtimeProfile,
      ).decoder(observation.stdout);
    } catch {
      fail(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        [tool.path],
        `runtime command ${role} stdout is invalid`,
      );
    }
    requireCondition(
      observedVersion === tool.version &&
        observation.fileSha256 === tool.fileSha256,
      'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
      [tool.path],
      `runtime binding ${role} does not match the observed binary`,
    );
  }
  return true;
}

export function decodeRgbaWithFixedImageMagickV001({
  imageMagickPath,
  inputPngPath,
  spawn = spawnSync,
  expectedWidth = 1080,
  expectedHeight = 1920,
}) {
  const result = spawn(
    imageMagickPath,
    [
      inputPngPath,
      '-alpha',
      'on',
      '-colorspace',
      'sRGB',
      '-depth',
      '8',
      '-define',
      'quantum:format=unsigned',
      'RGBA:-',
    ],
    {encoding: null, maxBuffer: expectedWidth * expectedHeight * 4 + 1024},
  );
  if (
    result.status !== 0 ||
    Buffer.from(result.stderr ?? []).length !== 0 ||
    !Buffer.isBuffer(result.stdout) ||
    result.stdout.length !== expectedWidth * expectedHeight * 4
  ) {
    throw new Error('ImageMagick RGBA decoder contract failed');
  }
  return result.stdout;
}

export async function regenerateVerticalPixelProbesV001({
  workspaceRoot,
  registry,
  runtimeProfile,
  preflightCanonicalSha256,
  checkpoint = async () => {},
  spawn = spawnSync,
}) {
  const inputs = buildVerticalPixelProbeInputsV001({
    registry,
    preflightCanonicalSha256,
    runtimeProfile,
  });
  const workRoot = await mkdtemp(
    path.join(os.tmpdir(), 'vertical-preset-pixel-equivalence-'),
  );
  const result = {};
  try {
    const nodePath = path.isAbsolute(runtimeProfile.node.path)
      ? runtimeProfile.node.path
      : resolveRepoPath(workspaceRoot, runtimeProfile.node.path);
    const tsxPath = path.isAbsolute(runtimeProfile.tsx.path)
      ? runtimeProfile.tsx.path
      : resolveRepoPath(workspaceRoot, runtimeProfile.tsx.path);
    const adapterPath = resolveRepoPath(
      workspaceRoot,
      VERTICAL_COMPONENT_PROVENANCE[0].path,
    );
    const imageMagickPath = path.isAbsolute(runtimeProfile.imageMagick.path)
      ? runtimeProfile.imageMagick.path
      : resolveRepoPath(workspaceRoot, runtimeProfile.imageMagick.path);

    for (const input of inputs) {
      await checkpoint(input.probeId);
      const probeDirectory = path.join(workRoot, input.probeId);
      await mkdir(probeDirectory, {recursive: false});
      const inputPath = path.join(probeDirectory, 'probe-input.json');
      const outputPath = path.join(probeDirectory, 'probe-output.png');
      await writeFile(inputPath, serializeJsonFileV001(input), {flag: 'wx'});
      const render = spawn(
        nodePath,
        [
          tsxPath,
          adapterPath,
          '--mode',
          'pixel-equivalence-probe',
          '--input',
          inputPath,
          '--output',
          outputPath,
        ],
        {encoding: null, maxBuffer: 8 * 1024 * 1024},
      );
      if (
        render.status !== 0 ||
        Buffer.from(render.stderr ?? []).length !== 0
      ) {
        throw new Error(`pixel probe render failed: ${input.probeId}`);
      }
      const outputStat = await lstat(outputPath);
      if (!outputStat.isFile() || outputStat.isSymbolicLink()) {
        throw new Error(`pixel probe did not create a regular PNG: ${input.probeId}`);
      }
      const approvedPath = resolveRepoPath(
        workspaceRoot,
        input.sourceBinding.approvedPath,
      );
      const approvedBytes = await stableRead(approvedPath);
      if (
        sha256BytesV001(approvedBytes) !==
        input.sourceBinding.approvedFileSha256
      ) {
        throw new Error(`approved probe PNG changed: ${input.probeId}`);
      }
      const approvedRgba = decodeRgbaWithFixedImageMagickV001({
        imageMagickPath,
        inputPngPath: approvedPath,
        spawn,
      });
      const regeneratedRgba = decodeRgbaWithFixedImageMagickV001({
        imageMagickPath,
        inputPngPath: outputPath,
        spawn,
      });
      const approvedRgbaSha256 = sha256BytesV001(approvedRgba);
      const regeneratedRgbaSha256 = sha256BytesV001(regeneratedRgba);
      if (
        approvedRgbaSha256 !==
          VERTICAL_PIXEL_PROBES.find(
            (probe) => probe.probeId === input.probeId,
          ).approvedRgbaSha256 ||
        regeneratedRgbaSha256 !== approvedRgbaSha256
      ) {
        fail(
          'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
          [input.sourceBinding.approvedPath],
          `pixel probe RGBA mismatch: ${input.probeId}`,
        );
      }
      result[input.probeId] = regeneratedRgbaSha256;
    }
    return result;
  } finally {
    await rm(workRoot, {recursive: true, force: true});
  }
}

export function verifyPixelEquivalenceV001(regeneratedRgbaSha256ById) {
  return VERTICAL_PIXEL_PROBES.map((probe) => {
    const regenerated = regeneratedRgbaSha256ById[probe.probeId];
    requireCondition(
      regenerated === probe.approvedRgbaSha256,
      'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
      [probe.approvedPath],
      `RGBA pixels do not match for ${probe.probeId}`,
    );
    return {
      probeId: probe.probeId,
      approvedPath: probe.approvedPath,
      approvedFileSha256: probe.approvedFileSha256,
      approvedRgbaSha256: probe.approvedRgbaSha256,
      regeneratedRgbaSha256: regenerated,
      status: 'passed',
    };
  });
}

export function buildVerticalRendererTrustV001({
  registry,
  registryFileSha256,
  trustedRegistryBindings,
  trustedRegistryBindingsFileSha256,
  previewComponents = VERTICAL_PREVIEW_COMPONENTS,
  pixelEquivalence,
  runtimeProfile,
}) {
  validateVerticalPresetRegistryV002(registry);
  requireSha(
    registryFileSha256,
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    PRESET_REGISTRY_PATH,
  );
  requireSha(
    trustedRegistryBindingsFileSha256,
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    TRUSTED_REGISTRY_BINDINGS_PATH,
  );
  requireCondition(
    JSON.stringify(previewComponents) ===
      JSON.stringify(VERTICAL_PREVIEW_COMPONENTS),
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    [PRESET_REGISTRY_PATH, VERTICAL_PREVIEW_MANIFEST_PATH],
    'renderer trust preview component provenance mismatch',
  );
  requireCondition(
    Array.isArray(pixelEquivalence) &&
      pixelEquivalence.length === VERTICAL_PIXEL_PROBES.length &&
      pixelEquivalence.every((entry, index) => {
        const probe = VERTICAL_PIXEL_PROBES[index];
        return (
          exactKeys(entry, [
            'probeId',
            'approvedPath',
            'approvedFileSha256',
            'approvedRgbaSha256',
            'regeneratedRgbaSha256',
            'status',
          ]) &&
          entry.probeId === probe.probeId &&
          entry.approvedPath === probe.approvedPath &&
          entry.approvedFileSha256 === probe.approvedFileSha256 &&
          entry.approvedRgbaSha256 === probe.approvedRgbaSha256 &&
          entry.regeneratedRgbaSha256 === probe.approvedRgbaSha256 &&
          entry.status === 'passed'
        );
      }),
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    VERTICAL_PIXEL_PROBES.map((probe) => probe.approvedPath),
    'renderer trust pixel equivalence mismatch',
  );
  return {
    schemaVersion: VERTICAL_RENDERER_TRUST_VERSION,
    trustVersion: VERTICAL_RENDERER_TRUST_VERSION,
    rendererContractVersion: 'zev-renderer-boundary-v004-review',
    presetRegistry: {
      registryVersion: VERTICAL_PRESET_REGISTRY_VERSION,
      path: PRESET_REGISTRY_PATH,
      fileSha256: registryFileSha256,
      canonicalSha256: sha256CanonicalV001(registry),
    },
    registryBinding: {
      schemaVersion: 'presentation-registry-trust-v002',
      path: TRUSTED_REGISTRY_BINDINGS_PATH,
      fileSha256: trustedRegistryBindingsFileSha256,
      canonicalSha256: sha256CanonicalV001(trustedRegistryBindings),
    },
    approvedPreview: {
      previewId: VERTICAL_APPROVED_PREVIEW_ID,
      manifestPath: VERTICAL_PREVIEW_MANIFEST_PATH,
      manifestFileSha256: VERTICAL_PREVIEW_MANIFEST_FILE_SHA256,
      mediaPath: VERTICAL_APPROVED_MEDIA_PATH,
      mediaFileSha256: VERTICAL_APPROVED_MEDIA_FILE_SHA256,
      componentProvenance: previewComponents.map(clone),
      pixelEquivalence: pixelEquivalence.map(clone),
    },
    rendererDependencies: registry.componentProvenance.map(clone),
    fontAssets: [
      {
        fontAssetId: VERTICAL_FONT.fontAssetId,
        path: VERTICAL_FONT.path,
        fileSha256: VERTICAL_FONT.sha256,
        licensePath: VERTICAL_FONT.licensePath,
        licenseFileSha256: VERTICAL_FONT.licenseFileSha256,
      },
    ],
    layoutRules: {
      layoutRuleVersion: 'vertical-short-speaker-only-layout-v001',
      maxSupportedLogicalWidthPerLine: 14,
      maxLines: 2,
      characterWidthRule: CHARACTER_WIDTH_RULE,
      canvas: {
        width: 1080,
        height: 1920,
        fps: 30,
      },
      safeAreaPx: {
        top: 38,
        right: 43,
        bottom: 38,
        left: 43,
      },
      humanReapprovalRule:
        'any-layout-value-change-requires-new-preview-and-kawafmm-approval',
    },
    toolVersions: clone(runtimeProfile),
  };
}

export function validateVerticalRendererTrustV001({
  trust,
  registry,
  trustedRegistryBindings,
}) {
  const reconstructed = buildVerticalRendererTrustV001({
    registry,
    registryFileSha256: trust?.presetRegistry?.fileSha256,
    trustedRegistryBindings,
    trustedRegistryBindingsFileSha256:
      trust?.registryBinding?.fileSha256,
    previewComponents: trust?.approvedPreview?.componentProvenance,
    pixelEquivalence: trust?.approvedPreview?.pixelEquivalence,
    runtimeProfile: trust?.toolVersions,
  });
  requireCondition(
    sameOrderedJson(trust, reconstructed),
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    [RENDERER_TRUST_PATH],
    'renderer trust does not match the approved construction',
  );
  return true;
}

export function buildVerticalFormalArtifactsV001({
  componentBindings,
  runtimeProfile,
  regeneratedRgbaSha256ById,
}) {
  const presetRegistry = buildVerticalPresetRegistryV002(componentBindings);
  const presetValidationIndex =
    deriveVerticalPresetValidationIndexV001(presetRegistry);
  const materialValidationIndex =
    buildVerticalMaterialValidationIndexV001();
  const trustedRegistryBindings =
    buildVerticalTrustedRegistryBindingsV002(
      presetValidationIndex,
      materialValidationIndex,
    );
  const presetRegistryBytes = serializeJsonFileV001(presetRegistry);
  const trustedRegistryBindingsBytes =
    serializeJsonFileV001(trustedRegistryBindings);
  const pixelEquivalence = verifyPixelEquivalenceV001(
    regeneratedRgbaSha256ById,
  );
  const rendererTrust = buildVerticalRendererTrustV001({
    registry: presetRegistry,
    registryFileSha256: sha256BytesV001(presetRegistryBytes),
    trustedRegistryBindings,
    trustedRegistryBindingsFileSha256:
      sha256BytesV001(trustedRegistryBindingsBytes),
    pixelEquivalence,
    runtimeProfile,
  });
  return {
    presetRegistry,
    presetValidationIndex,
    materialValidationIndex,
    trustedRegistryBindings,
    rendererTrust,
  };
}

export function buildVerticalFinalizationReportV001({
  status,
  jobBinding,
  implementationBinding,
  runtimeProfile,
  violations,
  outputBindings,
}) {
  return {
    schemaVersion: VERTICAL_PRESET_FINALIZATION_REPORT_SCHEMA_VERSION,
    status,
    jobBinding: clone(jobBinding),
    implementationBinding: clone(implementationBinding),
    runtimeProfile: clone(runtimeProfile),
    violations: violations.map((entry) => ({
      code: entry.code,
      relatedPaths: [...new Set(entry.relatedPaths)].sort(),
    })),
    outputBindings: outputBindings === null ? null : clone(outputBindings),
  };
}

export const buildVerticalFinalizerFatalV001 = () => ({
  schemaVersion: VERTICAL_PRESET_FINALIZER_FATAL_SCHEMA_VERSION,
  runnerId: VERTICAL_PRESET_FINALIZER_RUNNER_ID,
  status: 'fatal',
  diagnosticCode: VERTICAL_PRESET_FINALIZER_FATAL_CODE,
});

const outputBinding = (repoPath, value) => {
  const bytes = serializeJsonFileV001(value);
  return {
    path: repoPath,
    fileSha256: sha256BytesV001(bytes),
    canonicalSha256: sha256CanonicalV001(value),
  };
};

export function buildVerticalOutputBindingsV001(artifacts) {
  return {
    presetRegistry: outputBinding(
      PRESET_REGISTRY_PATH,
      artifacts.presetRegistry,
    ),
    presetValidationIndex: outputBinding(
      PRESET_VALIDATION_INDEX_PATH,
      artifacts.presetValidationIndex,
    ),
    materialValidationIndex: outputBinding(
      MATERIAL_VALIDATION_INDEX_PATH,
      artifacts.materialValidationIndex,
    ),
    trustedRegistryBindings: outputBinding(
      TRUSTED_REGISTRY_BINDINGS_PATH,
      artifacts.trustedRegistryBindings,
    ),
    rendererTrust: outputBinding(
      RENDERER_TRUST_PATH,
      artifacts.rendererTrust,
    ),
  };
}

const stableRead = async (filePath) => {
  const before = await stat(filePath);
  const bytes = await readFile(filePath);
  const after = await stat(filePath);
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error(`file changed during read: ${filePath}`);
  }
  return bytes;
};

const strictJsonFile = (bytes) => {
  const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  const value = JSON.parse(text);
  if (!serializeJsonFileV001(value).equals(bytes)) {
    throw new Error('JSON file is not the fixed pretty serialization');
  }
  return value;
};

export async function verifyVerticalPublishedRootsV001({workspaceRoot}) {
  const [registryRootStat, trustRootStat] = await Promise.all([
    lstat(resolveRepoPath(workspaceRoot, REGISTRY_ROOT)),
    lstat(resolveRepoPath(workspaceRoot, TRUST_ROOT)),
  ]);
  if (
    !registryRootStat.isDirectory() ||
    registryRootStat.isSymbolicLink() ||
    !trustRootStat.isDirectory() ||
    trustRootStat.isSymbolicLink()
  ) {
    throw new Error('vertical preset publication roots are not regular directories');
  }

  const reportBytes = await stableRead(
    resolveRepoPath(workspaceRoot, REPORT_PATH),
  );
  const report = strictJsonFile(reportBytes);
  if (
    !exactKeys(report, [
      'schemaVersion',
      'status',
      'jobBinding',
      'implementationBinding',
      'runtimeProfile',
      'violations',
      'outputBindings',
    ]) ||
    report.schemaVersion !==
      VERTICAL_PRESET_FINALIZATION_REPORT_SCHEMA_VERSION ||
    report.status !== 'passed' ||
    !Array.isArray(report.violations) ||
    report.violations.length !== 0 ||
    !exactKeys(report.outputBindings, [
      'presetRegistry',
      'presetValidationIndex',
      'materialValidationIndex',
      'trustedRegistryBindings',
      'rendererTrust',
    ])
  ) {
    throw new Error('vertical preset commit record is missing or invalid');
  }

  const expectedPaths = {
    presetRegistry: PRESET_REGISTRY_PATH,
    presetValidationIndex: PRESET_VALIDATION_INDEX_PATH,
    materialValidationIndex: MATERIAL_VALIDATION_INDEX_PATH,
    trustedRegistryBindings: TRUSTED_REGISTRY_BINDINGS_PATH,
    rendererTrust: RENDERER_TRUST_PATH,
  };
  const values = {};
  for (const [role, expectedPath] of Object.entries(expectedPaths)) {
    const binding = report.outputBindings[role];
    if (
      !exactKeys(binding, ['path', 'fileSha256', 'canonicalSha256']) ||
      binding.path !== expectedPath
    ) {
      throw new Error(`vertical preset output binding mismatch: ${role}`);
    }
    const bytes = await stableRead(resolveRepoPath(workspaceRoot, expectedPath));
    const value = strictJsonFile(bytes);
    if (
      sha256BytesV001(bytes) !== binding.fileSha256 ||
      sha256CanonicalV001(value) !== binding.canonicalSha256
    ) {
      throw new Error(`vertical preset output changed after publication: ${role}`);
    }
    values[role] = value;
  }

  validateVerticalPresetRegistryV002(values.presetRegistry);
  if (
    !sameOrderedJson(
      values.presetValidationIndex,
      deriveVerticalPresetValidationIndexV001(values.presetRegistry),
    ) ||
    !sameOrderedJson(
      values.materialValidationIndex,
      buildVerticalMaterialValidationIndexV001(),
    ) ||
    !sameOrderedJson(
      values.trustedRegistryBindings,
      buildVerticalTrustedRegistryBindingsV002(
        values.presetValidationIndex,
        values.materialValidationIndex,
      ),
    )
  ) {
    throw new Error('vertical preset derived registry outputs are inconsistent');
  }
  validateVerticalRendererTrustV001({
    trust: values.rendererTrust,
    registry: values.presetRegistry,
    trustedRegistryBindings: values.trustedRegistryBindings,
  });
  return {report, reportBytes};
}

const resolveRepoPath = (workspaceRoot, repoPath) => {
  if (
    typeof repoPath !== 'string' ||
    repoPath.startsWith('/') ||
    repoPath.includes('\\') ||
    repoPath.includes('\0') ||
    repoPath.split('/').some((segment) => ['', '.', '..'].includes(segment))
  ) {
    throw new Error(`unsafe repository path: ${String(repoPath)}`);
  }
  return path.join(workspaceRoot, ...repoPath.split('/'));
};

const readBoundJson = async (workspaceRoot, binding) => {
  const absolute = resolveRepoPath(workspaceRoot, binding.path);
  const bytes = await stableRead(absolute);
  if (sha256BytesV001(bytes) !== binding.fileSha256) {
    throw new Error(`file SHA mismatch: ${binding.path}`);
  }
  const value = strictJsonFile(bytes);
  if (
    'canonicalSha256' in binding &&
    sha256CanonicalV001(value) !== binding.canonicalSha256
  ) {
    throw new Error(`canonical SHA mismatch: ${binding.path}`);
  }
  return {absolute, bytes, value};
};

const readBoundJsonForContract = async (
  workspaceRoot,
  binding,
  code,
) => {
  try {
    return await readBoundJson(workspaceRoot, binding);
  } catch {
    fail(
      code,
      [typeof binding?.path === 'string' ? binding.path : 'input-binding'],
      'bound JSON input is unavailable or does not match its binding',
    );
  }
};

const readBoundBytesForContract = async (
  workspaceRoot,
  binding,
  code,
) => {
  try {
    const bytes = await stableRead(
      resolveRepoPath(workspaceRoot, binding.path),
    );
    requireCondition(
      sha256BytesV001(bytes) === binding.fileSha256,
      code,
      [binding.path],
      `bound file SHA mismatch: ${binding.path}`,
    );
    return bytes;
  } catch (error) {
    if (error instanceof VerticalPresetContractError) throw error;
    fail(
      code,
      [typeof binding?.path === 'string' ? binding.path : 'input-binding'],
      'bound file is unavailable',
    );
  }
};

const observeRuntimeProfile = async (workspaceRoot, runtimeProfile) => {
  const observations = {};
  for (const role of Object.keys(runtimeProfile)) {
    const tool = runtimeProfile[role];
    const absoluteTool = path.isAbsolute(tool.path)
      ? tool.path
      : resolveRepoPath(workspaceRoot, tool.path);
    const toolBytes = await stableRead(absoluteTool);
    const commandProfile = clone(runtimeProfile);
    commandProfile[role].path = absoluteTool;
    if (role === 'tsx' || role === 'remotion') {
      commandProfile.node.path = path.isAbsolute(runtimeProfile.node.path)
        ? runtimeProfile.node.path
        : resolveRepoPath(workspaceRoot, runtimeProfile.node.path);
    }
    const invocation = verticalToolCommandV001(role, commandProfile);
    const result = spawnSync(invocation.command, invocation.args, {
      encoding: null,
      maxBuffer: 8 * 1024 * 1024,
    });
    observations[role] = {
      exitCode: result.status,
      stdout: result.stdout ?? Buffer.alloc(0),
      stderr: result.stderr ?? Buffer.alloc(0),
      fileSha256: sha256BytesV001(toolBytes),
    };
  }
  return observations;
};

const validateJob = (job, jobPath) => {
  requireCondition(
    exactKeys(job, [
      'schemaVersion',
      'jobId',
      'implementationBinding',
      'inputBindings',
      'runtimeProfile',
      'publication',
    ]) &&
      job.schemaVersion === VERTICAL_PRESET_FINALIZER_SCHEMA_VERSION &&
      SAFE_ID_PATTERN.test(job.jobId),
    'VERTICAL_PRESET_REGISTRY_INVALID',
    ['job'],
    'finalization job shape mismatch',
  );
  requireCondition(
    jobPath === `${FINALIZATION_JOB_ROOT}/${job.jobId}.json`,
    'VERTICAL_PRESET_REGISTRY_INVALID',
    [typeof jobPath === 'string' ? jobPath : 'job'],
    'finalization job path must be derived from jobId',
  );
  requireSha(
    job.implementationBinding.entry.fileSha256,
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    FINALIZER_PATH,
  );
  requireSha(
    job.implementationBinding.localImportClosure[0].fileSha256,
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    CANONICAL_CORE_PATH,
  );
  requireCondition(
    exactKeys(job.implementationBinding, ['entry', 'localImportClosure']) &&
      exactKeys(job.implementationBinding.entry, ['path', 'fileSha256']) &&
      job.implementationBinding.entry.path === FINALIZER_PATH &&
      Array.isArray(job.implementationBinding.localImportClosure) &&
      job.implementationBinding.localImportClosure.length === 1 &&
      sameCanonical(job.implementationBinding.localImportClosure[0], {
        role: 'canonical-json-core',
        path: CANONICAL_CORE_PATH,
        fileSha256:
          job.implementationBinding.localImportClosure[0]?.fileSha256,
      }),
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    [FINALIZER_PATH, CANONICAL_CORE_PATH],
    'implementation binding mismatch',
  );
  requireCondition(
    sameCanonical(job.publication, {
      presetRegistryRoot: REGISTRY_ROOT,
      rendererTrustRoot: TRUST_ROOT,
      finalizationReportPath: REPORT_PATH,
    }),
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
    [REGISTRY_ROOT, TRUST_ROOT, REPORT_PATH],
    'publication roots mismatch',
  );
  return true;
};

const validateFinalizationInputBindings = (inputBindings) => {
  const inputKeys = [
    'previewManifest',
    'previewPreflight',
    'approvedMedia',
    'font',
    'fontLicense',
  ];
  requireCondition(
    exactKeys(inputBindings, inputKeys) &&
      exactKeys(inputBindings.previewManifest, [
        'path',
        'fileSha256',
        'canonicalSha256',
      ]) &&
      exactKeys(inputBindings.previewPreflight, [
        'path',
        'fileSha256',
        'canonicalSha256',
      ]) &&
      exactKeys(inputBindings.approvedMedia, ['path', 'fileSha256']) &&
      exactKeys(inputBindings.font, ['path', 'fileSha256']) &&
      exactKeys(inputBindings.fontLicense, ['path', 'fileSha256']),
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    inputKeys,
    'input binding shape mismatch',
  );
  const expectedBindings = {
    previewManifest: {
      path: VERTICAL_PREVIEW_MANIFEST_PATH,
      fileSha256: VERTICAL_PREVIEW_MANIFEST_FILE_SHA256,
    },
    previewPreflight: {
      path: VERTICAL_PREVIEW_PREFLIGHT_PATH,
      fileSha256: VERTICAL_PREVIEW_PREFLIGHT_FILE_SHA256,
    },
    approvedMedia: {
      path: VERTICAL_APPROVED_MEDIA_PATH,
      fileSha256: VERTICAL_APPROVED_MEDIA_FILE_SHA256,
    },
    font: {
      path: VERTICAL_FONT.path,
      fileSha256: VERTICAL_FONT.sha256,
    },
    fontLicense: {
      path: VERTICAL_FONT.licensePath,
      fileSha256: VERTICAL_FONT.licenseFileSha256,
    },
  };
  for (const role of inputKeys) {
    const actual = inputBindings[role];
    const expected = expectedBindings[role];
    requireCondition(
      actual.path === expected.path &&
        actual.fileSha256 === expected.fileSha256,
      'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
      [expected.path],
      `approved input path or fixed SHA mismatch for ${role}`,
    );
    requireSha(
      actual.fileSha256,
      'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
      expected.path,
    );
    if ('canonicalSha256' in actual) {
      requireSha(
        actual.canonicalSha256,
        'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
        expected.path,
      );
    }
  }
  return true;
};

export async function finalizeVerticalSpeakerOnlyPresetV001({
  workspaceRoot,
  jobPath,
  regeneratedRgbaSha256ById = null,
  publish = true,
}) {
  const jobAbsolute = resolveRepoPath(workspaceRoot, jobPath);
  const jobBytes = await stableRead(jobAbsolute);
  const job = strictJsonFile(jobBytes);
  validateJob(job, jobPath);
  const jobBinding = {
    path: jobPath,
    fileSha256: sha256BytesV001(jobBytes),
    canonicalSha256: sha256CanonicalV001(job),
  };
  try {
    const implementationEntries = [
      job.implementationBinding.entry,
      ...job.implementationBinding.localImportClosure,
    ];
    for (const binding of implementationEntries) {
      await readBoundBytesForContract(
        workspaceRoot,
        binding,
        'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
      );
    }
    validateFinalizationInputBindings(job.inputBindings);
    const previewManifestRecord = await readBoundJsonForContract(
      workspaceRoot,
      job.inputBindings.previewManifest,
      'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    );
    const previewPreflightRecord = await readBoundJsonForContract(
      workspaceRoot,
      job.inputBindings.previewPreflight,
      'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    );
    for (const role of ['approvedMedia', 'font', 'fontLicense']) {
      await readBoundBytesForContract(
        workspaceRoot,
        job.inputBindings[role],
        'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
      );
    }
    validateVerticalPreviewBindingsV001({
      previewManifest: previewManifestRecord.value,
      previewManifestFileSha256:
        previewManifestRecord.value &&
        sha256BytesV001(previewManifestRecord.bytes),
      previewPreflight: previewPreflightRecord.value,
      previewPreflightFileSha256:
        sha256BytesV001(previewPreflightRecord.bytes),
    });
    let observations;
    try {
      observations = await observeRuntimeProfile(
        workspaceRoot,
        job.runtimeProfile,
      );
    } catch {
      fail(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        Object.values(job.runtimeProfile ?? {})
          .map((binding) => binding?.path)
          .filter((value) => typeof value === 'string'),
        'runtime profile could not be observed',
      );
    }
    verifyVerticalRuntimeProfileObservationV001(
      job.runtimeProfile,
      observations,
    );
    const componentBindings = [];
    const rendererSourceByPath = {};
    for (const entry of VERTICAL_COMPONENT_PROVENANCE) {
      let bytes;
      try {
        bytes = await stableRead(
          resolveRepoPath(workspaceRoot, entry.path),
        );
      } catch {
        fail(
          'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
          [entry.path],
          `renderer dependency is unavailable: ${entry.path}`,
        );
      }
      componentBindings.push({
        role: entry.role,
        path: entry.path,
        fileSha256: sha256BytesV001(bytes),
      });
      if (VERTICAL_PIXEL_RUNTIME_ROOTS.includes(entry.path)) {
        rendererSourceByPath[entry.path] =
          new TextDecoder('utf-8', {fatal: true}).decode(bytes);
      }
    }
    verifyVerticalRendererImportGraphV001(rendererSourceByPath);
    const checkpoint = async () => {
      const currentJobBytes = await stableRead(jobAbsolute);
      if (!currentJobBytes.equals(jobBytes)) {
        throw new Error('finalization job changed during execution');
      }
      for (const binding of implementationEntries) {
        const bytes = await stableRead(
          resolveRepoPath(workspaceRoot, binding.path),
        );
        if (sha256BytesV001(bytes) !== binding.fileSha256) {
          throw new Error(
            `implementation changed during execution: ${binding.path}`,
          );
        }
      }
      const currentObservations = await observeRuntimeProfile(
        workspaceRoot,
        job.runtimeProfile,
      );
      verifyVerticalRuntimeProfileObservationV001(
        job.runtimeProfile,
        currentObservations,
      );
    };
    const effectiveProbeHashes =
      regeneratedRgbaSha256ById ??
      (await regenerateVerticalPixelProbesV001({
        workspaceRoot,
        registry: buildVerticalPresetRegistryV002(componentBindings),
        runtimeProfile: job.runtimeProfile,
        preflightCanonicalSha256:
          previewPreflightRecord.value &&
          sha256CanonicalV001(previewPreflightRecord.value),
        checkpoint,
      }));
    const artifacts = buildVerticalFormalArtifactsV001({
      componentBindings,
      runtimeProfile: job.runtimeProfile,
      regeneratedRgbaSha256ById: effectiveProbeHashes,
    });
    const outputBindings = buildVerticalOutputBindingsV001(artifacts);
    const report = buildVerticalFinalizationReportV001({
      status: 'passed',
      jobBinding,
      implementationBinding: job.implementationBinding,
      runtimeProfile: job.runtimeProfile,
      violations: [],
      outputBindings,
    });
    if (publish) {
      await checkpoint();
      await publishVerticalArtifactsV001({
        workspaceRoot,
        artifacts,
        report,
      });
    }
    return {exitCode: 0, report};
  } catch (error) {
    if (!(error instanceof VerticalPresetContractError)) throw error;
    const report = buildVerticalFinalizationReportV001({
      status: 'rejected',
      jobBinding,
      implementationBinding: job.implementationBinding,
      runtimeProfile: job.runtimeProfile,
      violations: [
        {
          code: REPORT_VIOLATION_CODES.includes(error.code)
            ? error.code
            : 'VERTICAL_PRESET_REGISTRY_INVALID',
          relatedPaths:
            error.relatedPaths.length > 0 ? error.relatedPaths : ['job'],
        },
      ],
      outputBindings: null,
    });
    return {exitCode: 1, report};
  }
}

const fsyncFile = async (filePath) => {
  const handle = await open(filePath, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
};

const writeDurableJson = async (filePath, value) => {
  const bytes = serializeJsonFileV001(value);
  await writeFile(filePath, bytes, {flag: 'wx'});
  await fsyncFile(filePath);
};

export async function publishVerticalArtifactsV001({
  workspaceRoot,
  artifacts,
  report,
}) {
  const registryAbsolute = resolveRepoPath(workspaceRoot, REGISTRY_ROOT);
  const trustAbsolute = resolveRepoPath(workspaceRoot, TRUST_ROOT);
  for (const target of [registryAbsolute, trustAbsolute]) {
    try {
      await lstat(target);
      throw new Error(`formal publication target already exists: ${target}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(path.dirname(registryAbsolute), {recursive: true});
  await mkdir(path.dirname(trustAbsolute), {recursive: true});
  const registryWork = await mkdtemp(
    path.join(path.dirname(registryAbsolute), '.vertical-registry-work-'),
  );
  const trustWork = await mkdtemp(
    path.join(path.dirname(trustAbsolute), '.vertical-trust-work-'),
  );
  let trustCommitted = false;
  try {
    await writeDurableJson(
      path.join(registryWork, 'preset-registry.json'),
      artifacts.presetRegistry,
    );
    await writeDurableJson(
      path.join(registryWork, 'preset-validation-index.json'),
      artifacts.presetValidationIndex,
    );
    await writeDurableJson(
      path.join(registryWork, 'material-validation-index.json'),
      artifacts.materialValidationIndex,
    );
    await writeDurableJson(
      path.join(registryWork, 'trusted-registry-bindings.json'),
      artifacts.trustedRegistryBindings,
    );
    await writeDurableJson(
      path.join(trustWork, 'trust.json'),
      artifacts.rendererTrust,
    );
    await writeDurableJson(
      path.join(registryWork, 'preset-finalization-report.json'),
      report,
    );
    await rename(trustWork, trustAbsolute);
    trustCommitted = true;
    await rename(registryWork, registryAbsolute);
  } catch (error) {
    if (!trustCommitted) {
      await Promise.allSettled([
        rm(registryWork, {recursive: true, force: true}),
        rm(trustWork, {recursive: true, force: true}),
      ]);
    }
    throw error;
  }
}

const directInvocation = () =>
  process.argv[1] &&
  path.basename(process.argv[1]) ===
    'finalize_presentation_vertical_speaker_only_preset_v001.mjs';

if (directInvocation()) {
  const workspaceRoot = process.cwd();
  const jobPath = process.argv[2];
  if (!jobPath) {
    process.stdout.write(
      serializeJsonFileV001(buildVerticalFinalizerFatalV001()),
    );
    process.exitCode = 2;
  } else {
    finalizeVerticalSpeakerOnlyPresetV001({
      workspaceRoot,
      jobPath,
      publish: true,
    })
      .then(({exitCode, report}) => {
        process.stdout.write(serializeJsonFileV001(report));
        process.exitCode = exitCode;
      })
      .catch(() => {
        process.stdout.write(
          serializeJsonFileV001(buildVerticalFinalizerFatalV001()),
        );
        process.exitCode = 2;
      });
  }
}
