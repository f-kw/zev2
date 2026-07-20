import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalJson } from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
  mapPresentationSourceIntervalV001,
  validatePresentationBaseMediaTimelineV001,
} from './presentation_base_media_timeline_v001.mjs';
import {
  PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES,
  indexExplicitLinesV001,
  layoutUnicodeCodePointsV001,
  mapOutputIntervalToFramesV001,
} from './presentation_renderer_text_layout_v001.mjs';

export const PRESENTATION_RENDERER_VERSION = 'presentation-renderer-v001';
export const PRESENTATION_RENDER_PLAN_SCHEMA_VERSION = 'presentation-render-plan-v001';
export const PRESENTATION_RENDERER_TRUST_SCHEMA_VERSION = 'presentation-renderer-trust-v001';
export const PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256 = '9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2';

// 人間認定済みpreviewの見た目を実装がどう解釈するかの閉じた宣言。
// 実描画にはtrustから受け取った値そのものを渡す。この宣言との不一致は、
// renderer版だけを変えて人間再認定を迂回した状態なので描画前に停止する。
export const PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001 = Object.freeze({
  layoutRuleVersion: 'normal-landscape-render-layout-v001',
  fontWeight: 800,
  minimumFontSizePx: 12,
  textSafePaddingRatio: 0.04,
  horizontalSafeMarginRatio: 0.04,
  verticalSafeMarginRatio: 0.02,
  fallbackTextAreaRatio: 0.98,
  lowerThirdAnchorPercent: 67,
  renderScale: 1,
  characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
  borderStrokeWidthRule: '2 * max(0, borderWidthPx)',
  glowStrokeWidthRule: '2 * max(0, glowWidthPx) + 2 * max(0, borderWidthPx)',
  marginRule: 'max(glowStrokeWidth, borderStrokeWidth) / 2',
  safePaddingRule: 'max(2, ceil(fontSizePx * textSafePaddingRatio))',
  placementClampRule: 'clamp full alpha bounds inside canvas safe margins',
  humanReapprovalRule: 'Any numeric or formula change requires a new rendered preview and human approval before a new trust and renderer version may be activated.',
});

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(MODULE_DIRECTORY, '../..');
export const PRESENTATION_RENDERER_TRUST_PATH = resolve(
  MODULE_DIRECTORY,
  'registries/presentation/presentation-renderer-trust-v001/trust.json',
);

export const PRESENTATION_RENDERER_TRUST_VIOLATION_CODES = Object.freeze([
  'RENDERER_TRUST_ROOT_MISMATCH',
  'RENDERER_COMPONENT_HASH_MISMATCH',
  'RENDERER_TOOL_VERSION_MISMATCH',
  'PRESET_REGISTRY_CANONICAL_HASH_MISMATCH',
  'FONT_ASSET_HASH_MISMATCH',
]);

export const PRESENTATION_RENDERER_PLAN_VIOLATION_CODES = Object.freeze([
  'TARGET_RESOLUTION_FAILED',
  'TARGET_TEXT_MUTATED',
  'TARGET_TEXT_INDEX_GAP',
  'TARGET_TEXT_INDEX_DUPLICATED',
  'TARGET_TIMELINE_INVALID',
  'TARGET_DURATION_ZERO_AFTER_FRAME_MAPPING',
  'PERSON_TARGET_REQUIRED',
  'APPLIED_PRESET_MISMATCH',
]);

export const PRESENTATION_RENDERER_CORE_VIOLATION_CODES = Object.freeze([
  ...new Set([
    ...PRESENTATION_RENDERER_TRUST_VIOLATION_CODES,
    ...PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES,
    ...PRESENTATION_RENDERER_PLAN_VIOLATION_CODES,
    ...PRESENTATION_RENDERER_TEXT_LAYOUT_VIOLATION_CODES,
  ]),
]);

const ALL_CODES = PRESENTATION_RENDERER_CORE_VIOLATION_CODES;
const CODE_ORDER = new Map(ALL_CODES.map((code, index) => [code, index]));

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

const makeIssue = (code, path, relatedIds = [], details = undefined) => {
  const result = {
    code,
    path,
    relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  };
  if (details !== undefined) result.details = canonicalize(details);
  return result;
};

const TRUST_ARTIFACT_CODE = Object.freeze({
  'preset-registry': 'PRESET_REGISTRY_CANONICAL_HASH_MISMATCH',
  'registry-binding': 'RENDERER_TRUST_ROOT_MISMATCH',
  'approved-preview': 'RENDERER_COMPONENT_HASH_MISMATCH',
  'renderer-component': 'RENDERER_COMPONENT_HASH_MISMATCH',
  font: 'FONT_ASSET_HASH_MISMATCH',
});

/**
 * 固定loaderが観測したtrust自身の版・hashを純粋判定する。
 * production入口から別trustを指定する機能ではなく、固定信頼根の検証可能化である。
 */
export function evaluatePresentationRendererTrustRootV001({
  trust,
  actualCanonicalSha256,
}) {
  const violations = [];
  if (
    trust?.schemaVersion !== PRESENTATION_RENDERER_TRUST_SCHEMA_VERSION
    || trust?.trustVersion !== PRESENTATION_RENDERER_TRUST_SCHEMA_VERSION
    || actualCanonicalSha256 !== PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256
  ) {
    violations.push(makeIssue('RENDERER_TRUST_ROOT_MISMATCH', '$rendererTrust', [], {
      expectedCanonicalSha256: PRESENTATION_RENDERER_TRUST_CANONICAL_SHA256,
      actualCanonicalSha256,
    }));
  }
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

/** 固定trustに記録されたartifactと、実ファイルから得たhash事実を純粋判定する。 */
export function evaluatePresentationRendererTrustedArtifactV001({
  artifactType,
  expected,
  observed,
  path = '$artifact',
  relatedPath = expected?.path,
}) {
  const code = TRUST_ARTIFACT_CODE[artifactType];
  if (!code) throw new Error(`unsupported renderer trust artifact type: ${artifactType}`);
  const compareCanonical = artifactType === 'preset-registry'
    || artifactType === 'registry-binding'
    || artifactType === 'approved-preview';
  const mismatch = !isObject(expected)
    || !isNonEmptyString(expected.path)
    || !isObject(observed)
    || observed.readError !== undefined
    || expected.fileSha256 !== observed.fileSha256
    || (compareCanonical && expected.canonicalSha256 !== observed.canonicalSha256);
  if (!mismatch) return {status: 'passed', violations: []};
  return {
    status: 'failed',
    violations: [makeIssue(code, path, [relatedPath], {
      expectedFileSha256: expected?.fileSha256,
      actualFileSha256: observed?.fileSha256,
      ...(compareCanonical ? {
        expectedCanonicalSha256: expected?.canonicalSha256,
        actualCanonicalSha256: observed?.canonicalSha256,
      } : {}),
      ...(observed?.readError === undefined ? {} : {readError: observed.readError}),
    })],
  };
}

/** 固定trust記載のtool版と、起動時に実体から読んだ版を純粋判定する。 */
export function evaluatePresentationRendererToolVersionsV001(expectedTools, actualToolVersions) {
  const violations = [];
  if (!isObject(expectedTools) || !isObject(actualToolVersions)) {
    violations.push(makeIssue('RENDERER_TOOL_VERSION_MISMATCH', '$actualToolVersions'));
    return {status: 'failed', violations};
  }
  for (const key of Object.keys(expectedTools).sort()) {
    if (actualToolVersions[key] !== expectedTools[key]) {
      violations.push(makeIssue('RENDERER_TOOL_VERSION_MISMATCH', `$actualToolVersions.${key}`, [key], {
        expected: expectedTools[key],
        actual: actualToolVersions[key] ?? null,
      }));
    }
  }
  for (const key of Object.keys(actualToolVersions).sort()) {
    if (!Object.hasOwn(expectedTools, key)) {
      violations.push(makeIssue('RENDERER_TOOL_VERSION_MISMATCH', `$actualToolVersions.${key}`, [key]));
    }
  }
  sortIssues(violations);
  return {status: violations.length === 0 ? 'passed' : 'failed', violations};
}

/** trustの見た目規則と、このrenderer版が実装すると宣言した規則を完全一致で照合する。 */
export function evaluatePresentationRendererLayoutRulesV001(trustedLayoutRules, implementedLayoutRules) {
  if (
    isObject(trustedLayoutRules)
    && isObject(implementedLayoutRules)
    && canonicalJson(trustedLayoutRules) === canonicalJson(implementedLayoutRules)
  ) {
    return {status: 'passed', violations: []};
  }
  return {
    status: 'failed',
    violations: [makeIssue('RENDERER_COMPONENT_HASH_MISMATCH', '$.layoutRules', [], {
      trustedCanonicalSha256: isObject(trustedLayoutRules) ? sha256Canonical(trustedLayoutRules) : null,
      implementedCanonicalSha256: isObject(implementedLayoutRules) ? sha256Canonical(implementedLayoutRules) : null,
    })],
  };
}

const sortIssues = (issues) => issues.sort((left, right) => {
  const codeDifference = (CODE_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER)
    - (CODE_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
  if (codeDifference !== 0) return codeDifference;
  return [left.path, left.relatedIds.join(','), canonicalJson(left.details ?? null)]
    .join('\u0000')
    .localeCompare(
      [right.path, right.relatedIds.join(','), canonicalJson(right.details ?? null)].join('\u0000'),
      'en',
    );
});

const readJsonAndHashes = async (absolutePath) => {
  const bytes = await readFile(absolutePath);
  const value = JSON.parse(bytes.toString('utf8'));
  return {
    value,
    fileSha256: sha256Bytes(bytes),
    canonicalSha256: sha256Canonical(value),
  };
};

const checkFileHash = async (entry, artifactType, path, violations) => {
  let observed;
  try {
    const bytes = await readFile(resolve(WORKSPACE_ROOT, entry.path));
    observed = {fileSha256: sha256Bytes(bytes)};
  } catch (error) {
    observed = {readError: error instanceof Error ? error.code ?? error.name : String(error)};
  }
  violations.push(...evaluatePresentationRendererTrustedArtifactV001({
    artifactType,
    expected: entry,
    observed,
    path,
    relatedPath: entry?.path,
  }).violations);
};

/**
 * 固定path・コード定数hashからだけ信頼根を開く。引数で別trustを選ぶ経路はない。
 * tool版はjob申告ではなく、呼出側が実体から取得した値を渡す。
 */
export async function loadAndValidatePresentationRendererTrustV001(actualToolVersions) {
  const violations = [];
  let loaded;
  try {
    loaded = await readJsonAndHashes(PRESENTATION_RENDERER_TRUST_PATH);
  } catch (error) {
    violations.push(makeIssue('RENDERER_TRUST_ROOT_MISMATCH', '$rendererTrust', [], {
      readError: error instanceof Error ? error.code ?? error.name : String(error),
    }));
    return {
      schemaVersion: 'presentation-renderer-trust-report-v001',
      status: 'failed',
      violations,
      trust: null,
      trustCanonicalSha256: null,
    };
  }
  violations.push(...evaluatePresentationRendererTrustRootV001({
    trust: loaded.value,
    actualCanonicalSha256: loaded.canonicalSha256,
  }).violations);
  const trust = loaded.value;

  const jsonRoots = ['presetRegistry', 'registryBinding'];
  for (const field of jsonRoots) {
    const entry = trust?.[field];
    if (!isObject(entry) || !isNonEmptyString(entry.path)) {
      violations.push(makeIssue(
        field === 'presetRegistry'
          ? 'PRESET_REGISTRY_CANONICAL_HASH_MISMATCH'
          : 'RENDERER_TRUST_ROOT_MISMATCH',
        `$.${field}`,
      ));
      continue;
    }
    try {
      const actual = await readJsonAndHashes(resolve(WORKSPACE_ROOT, entry.path));
      violations.push(...evaluatePresentationRendererTrustedArtifactV001({
        artifactType: field === 'presetRegistry' ? 'preset-registry' : 'registry-binding',
        expected: entry,
        observed: actual,
        path: `$.${field}`,
      }).violations);
    } catch (error) {
      violations.push(...evaluatePresentationRendererTrustedArtifactV001({
        artifactType: field === 'presetRegistry' ? 'preset-registry' : 'registry-binding',
        expected: entry,
        observed: {readError: error instanceof Error ? error.code ?? error.name : String(error)},
        path: `$.${field}`,
      }).violations);
    }
  }

  if (isObject(trust?.approvedPreview)) {
    let previewManifest = null;
    try {
      const preview = await readJsonAndHashes(resolve(WORKSPACE_ROOT, trust.approvedPreview.path));
      previewManifest = preview.value;
      violations.push(...evaluatePresentationRendererTrustedArtifactV001({
        artifactType: 'approved-preview',
        expected: trust.approvedPreview,
        observed: preview,
        path: '$.approvedPreview',
      }).violations);
    } catch (error) {
      violations.push(...evaluatePresentationRendererTrustedArtifactV001({
        artifactType: 'approved-preview',
        expected: trust.approvedPreview,
        observed: {readError: error instanceof Error ? error.code ?? error.name : String(error)},
        path: '$.approvedPreview',
      }).violations);
    }
    for (const [index, entry] of (trust.approvedPreview.componentProvenance ?? []).entries()) {
      await checkFileHash(
        entry,
        'renderer-component',
        `$.approvedPreview.componentProvenance[${index}]`,
        violations,
      );
      const recorded = previewManifest?.componentProvenance?.find((value) => value?.path === entry.path);
      if (recorded?.sha256 !== entry.fileSha256) {
        violations.push(makeIssue(
          'RENDERER_COMPONENT_HASH_MISMATCH',
          `$.approvedPreview.componentProvenance[${index}]`,
          [entry.path],
        ));
      }
    }
    const previewEnvironment = previewManifest?.environment ?? {};
    const previewToolField = {
      nodeVersion: 'nodeVersion',
      remotionVersion: 'remotionVersion',
      browserVersion: 'browserVersion',
      ffmpegVersion: 'ffmpegVersion',
      ffprobeVersion: 'ffprobeVersion',
    };
    for (const [trustField, previewField] of Object.entries(previewToolField)) {
      if (previewEnvironment[previewField] !== trust.toolVersions?.[trustField]) {
        violations.push(makeIssue('RENDERER_TOOL_VERSION_MISMATCH', `$.approvedPreview.environment.${previewField}`));
      }
    }
  } else {
    violations.push(makeIssue('RENDERER_COMPONENT_HASH_MISMATCH', '$.approvedPreview'));
  }
  for (const [index, entry] of (trust?.rendererDependencies ?? []).entries()) {
    await checkFileHash(
      entry,
      'renderer-component',
      `$.rendererDependencies[${index}]`,
      violations,
    );
  }
  for (const [index, entry] of (trust?.fontAssets ?? []).entries()) {
    await checkFileHash(entry, 'font', `$.fontAssets[${index}]`, violations);
  }

  violations.push(...evaluatePresentationRendererLayoutRulesV001(
    trust?.layoutRules,
    PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001,
  ).violations);

  const expectedTools = isObject(trust?.toolVersions) ? trust.toolVersions : {};
  violations.push(...evaluatePresentationRendererToolVersionsV001(
    expectedTools,
    actualToolVersions,
  ).violations);

  sortIssues(violations);
  return {
    schemaVersion: 'presentation-renderer-trust-report-v001',
    status: violations.length === 0 ? 'passed' : 'failed',
    violations,
    trust: violations.length === 0 ? structuredClone(trust) : null,
    trustCanonicalSha256: loaded.canonicalSha256,
  };
}

export const validatePresentationRendererTrustV001 = loadAndValidatePresentationRendererTrustV001;

const byUniqueId = (values, readId) => {
  const map = new Map();
  const duplicates = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const id = readId(value);
    if (!isNonEmptyString(id)) continue;
    if (map.has(id)) duplicates.add(id);
    else map.set(id, value);
  }
  for (const id of duplicates) map.delete(id);
  return map;
};

const targetProvenance = (target) => {
  const result = {
    targetRefId: target.targetRefId,
    targetType: target.targetType,
    sourceAtomIds: [...(target.sourceAtomIds ?? [])],
  };
  for (const field of [
    'captionContractRefId',
    'cueId',
    'informationItemId',
    'speakerId',
    'referenceSubjectId',
  ]) {
    if (isNonEmptyString(target[field])) result[field] = target[field];
  }
  return result;
};

const copyLayoutViolations = (layoutReport, path, instructionId, add) => {
  for (const entry of layoutReport.violations ?? []) {
    add(entry.code, `${path}${entry.path?.replace(/^\$/, '') ?? ''}`, [instructionId], entry.details);
  }
};

/** 合格済みv002 bundleを、意味を変えない論理描画計画へ解決する。 */
export function buildPresentationRendererPlanV001({
  bundle,
  presetRegistry,
  timeline,
  generationManifest,
  layoutRules,
}) {
  const violations = [];
  const add = (code, path, relatedIds = [], details) => violations.push(makeIssue(code, path, relatedIds, details));
  const layoutRulesReport = evaluatePresentationRendererLayoutRulesV001(
    layoutRules,
    PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001,
  );
  violations.push(...layoutRulesReport.violations);
  const timelineReport = validatePresentationBaseMediaTimelineV001(timeline, generationManifest);
  if (timelineReport.status !== 'passed') {
    add('TARGET_TIMELINE_INVALID', '$.timeline', [], {
      nestedViolationCodes: timelineReport.violations.map((entry) => entry.code),
    });
  }

  const instructionSet = bundle?.instructionSet;
  const resolutionPackage = bundle?.resolutionPackage;
  const atoms = byUniqueId(resolutionPackage?.sourceAtoms, (atom) => atom?.atomId);
  const targets = byUniqueId(resolutionPackage?.targets, (target) => target?.targetRefId);
  const captionContracts = byUniqueId(
    resolutionPackage?.captionContracts,
    (contract) => contract?.captionContractRefId,
  );
  const presets = byUniqueId(presetRegistry?.presets, (preset) => preset?.presetId);
  const transitions = byUniqueId(presetRegistry?.transitions, (transition) => transition?.transitionId);
  const planElements = [];

  for (const [instructionIndex, instruction] of (instructionSet?.instructions ?? []).entries()) {
    const path = `$.instructionSet.instructions[${instructionIndex}]`;
    const instructionId = instruction?.instructionId;
    const triggerAtom = atoms.get(instruction?.trigger?.startAtomId);
    const targetIds = instruction?.target?.targetRefIds;
    const target = Array.isArray(targetIds) && targetIds.length === 1 ? targets.get(targetIds[0]) : null;
    const preset = presets.get(instruction?.presetId);
    const policies = byUniqueId(preset?.kindPolicies, (policy) => policy?.kind);
    const states = byUniqueId(preset?.visualStates, (state) => state?.stateId);
    const policy = policies.get(instruction?.kind);
    const visualState = policy ? states.get(policy.stateId) : null;
    const transition = visualState ? transitions.get(visualState.transitionId) : null;
    if (!triggerAtom || !target || !preset || !policy || !visualState || !transition) {
      add('TARGET_RESOLUTION_FAILED', path, [instructionId, targetIds?.[0], instruction?.presetId]);
      continue;
    }
    if (
      preset.presetId !== instruction.presetId
      || presetRegistry.registryVersion !== instructionSet.presetRegistryVersion
    ) {
      add('APPLIED_PRESET_MISMATCH', path, [instructionId, instruction.presetId]);
      continue;
    }

    let sourceStartMs;
    let sourceEndMs;
    let text;
    let textLayout;
    let provenance = targetProvenance(target);

    if (instruction.kind === 'speech-caption') {
      const captionContract = captionContracts.get(target.captionContractRefId);
      const cues = byUniqueId(captionContract?.captionPlan?.cues, (cue) => cue?.cueId);
      const cue = cues.get(target.cueId);
      if (!cue || !Array.isArray(cue.lines) || cue.lines.length === 0) {
        add('TARGET_RESOLUTION_FAILED', path, [instructionId, target.targetRefId, target.cueId]);
        continue;
      }
      sourceStartMs = cue.startMs;
      sourceEndMs = cue.endMs;
      textLayout = indexExplicitLinesV001(cue.lines.map((line) => line.renderedText));
      text = textLayout.sourceText;
      provenance = {
        ...provenance,
        sourceAtomIds: cue.lines.flatMap((line) => [...line.atomIds]),
        captionTargetId: cue.targetId,
        lineAtomIds: cue.lines.map((line) => [...line.atomIds]),
        startAnchor: structuredClone(cue.startAnchor),
        endAnchor: structuredClone(cue.endAnchor),
      };
      if (cue.lines.length > visualState.layout.maxLines) {
        add('TARGET_RESOLUTION_FAILED', `${path}.target`, [instructionId], {
          actualLines: cue.lines.length,
          maxLines: visualState.layout.maxLines,
        });
      }
    } else {
      const sourceAtomIds = Array.isArray(target.sourceAtomIds) ? target.sourceAtomIds : [];
      const targetAtoms = sourceAtomIds.map((atomId) => atoms.get(atomId));
      if (targetAtoms.length === 0 || targetAtoms.some((atom) => !atom)) {
        add('TARGET_RESOLUTION_FAILED', `${path}.target`, [instructionId, target.targetRefId]);
        continue;
      }
      sourceStartMs = triggerAtom.startMs;
      sourceEndMs = targetAtoms.at(-1).endMs;
      if (instruction.kind === 'speaker-identification') {
        if (!isNonEmptyString(target.speakerId) || !isNonEmptyString(target.speakerDisplayName)) {
          add('PERSON_TARGET_REQUIRED', `${path}.target`, [instructionId, target.targetRefId]);
          continue;
        }
        text = target.speakerDisplayName;
      } else {
        text = targetAtoms.map((atom) => atom.text).join('');
      }
      textLayout = layoutUnicodeCodePointsV001(text, visualState.layout, layoutRules?.characterWidthRule);
    }

    if (textLayout.status !== 'passed') {
      copyLayoutViolations(textLayout, `${path}.text`, instructionId, add);
      continue;
    }
    const mappingReport = mapPresentationSourceIntervalV001(timeline, sourceStartMs, sourceEndMs);
    if (mappingReport.status !== 'passed') {
      add('TARGET_TIMELINE_INVALID', `${path}.target`, [instructionId], {
        nestedViolationCodes: mappingReport.violations.map((entry) => entry.code),
      });
      continue;
    }
    const frameReport = mapOutputIntervalToFramesV001(
      mappingReport.mapping.outputStartMs,
      mappingReport.mapping.outputEndMs,
    );
    if (frameReport.status !== 'passed') {
      copyLayoutViolations(frameReport, `${path}.target`, instructionId, add);
      continue;
    }

    planElements.push({
      instructionId,
      kind: instruction.kind,
      text,
      indexedLines: textLayout.indexedLines,
      sourceStartMs,
      sourceEndMs,
      outputStartMs: mappingReport.mapping.outputStartMs,
      outputEndMs: mappingReport.mapping.outputEndMs,
      startFrame: frameReport.frames.startFrame,
      endFrameExclusive: frameReport.frames.endFrameExclusive,
      displayFrameCount: frameReport.frames.displayFrameCount,
      requestedPresetId: instruction.presetId,
      appliedPresetId: preset.presetId,
      presetId: preset.presetId,
      registryVersion: presetRegistry.registryVersion,
      presetRegistryVersion: presetRegistry.registryVersion,
      stateId: visualState.stateId,
      visualState: structuredClone(visualState),
      transition: structuredClone(transition),
      timelineSegmentId: mappingReport.mapping.timelineSegmentId,
      targetProvenance: provenance,
      materialRefs: [...(instruction.materialRefs ?? [])],
    });
  }

  sortIssues(violations);
  const passed = violations.length === 0 && timelineReport.status === 'passed';
  return {
    schemaVersion: 'presentation-render-plan-build-report-v001',
    rendererVersion: PRESENTATION_RENDERER_VERSION,
    status: passed ? 'passed' : 'failed',
    violations,
    timelineReport,
    plan: passed ? {
      schemaVersion: PRESENTATION_RENDER_PLAN_SCHEMA_VERSION,
      rendererVersion: PRESENTATION_RENDERER_VERSION,
      instructionSetId: instructionSet.instructionSetId,
      resolutionPackageId: resolutionPackage.resolutionPackageId,
      timelineId: timeline.timelineId,
      presetRegistryVersion: presetRegistry.registryVersion,
      format: presetRegistry.format,
      canvas: structuredClone(presetRegistry.canvas),
      layoutRules: structuredClone(layoutRules),
      elements: planElements,
    } : null,
  };
}

export const serializePresentationRendererPlanV001 = (value) => `${JSON.stringify(value, null, 2)}\n`;
