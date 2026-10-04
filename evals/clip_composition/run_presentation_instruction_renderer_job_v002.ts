#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {lstat, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import type {AutoPresentationInput} from '../../packages/shared/src/auto-presentation.js';
import {loadAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';
import {
  decodePresentationCueEndProjectionV001,
  decodePresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {
  decodePresentationInstructionArtifactV002,
} from './presentation_instruction_artifact_v002.mjs';
import {
  buildPresentationRendererAdmissionReceiptV002,
  decodePresentationInstructionRendererJobV002,
  inspectPresentationRendererAdmissionV002,
  publishPresentationRendererAdmissionReceiptNoReplaceV002,
  validatePresentationRendererAdmissionReceiptV002,
} from './presentation_renderer_admission_receipt_v002.mjs';
import {
  buildPresentationRendererLineLayoutV002,
  decodePresentationRendererLineLayoutV002,
  serializePresentationRendererLineLayoutV002,
} from './presentation_renderer_line_layout_rule_v002.mjs';
import {
  indexExplicitLinesV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  evaluatePresentationRendererQcWithProfileV001,
  inspectRenderedMediaWithToolsV001,
} from './presentation_renderer_qc_v002.mjs';
import {
  buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002,
  executeValidatedPresentationDrawAndQcV001,
} from './render_presentation_v002.mjs';
import {
  createPresentationRendererProcessObserverV001,
} from './presentation_renderer_process_observation_v001.mjs';
import {
  resolveApprovedDigestVerificationPolicyV001,
  assertQualifiedDigestRepresentativeCompletionV001,
} from './digest_representative_completion_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

const sha256 = value => createHash('sha256').update(value).digest('hex');
const canonicalSha256 = value => sha256(canonicalJson(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);

/** Only the one-plan adapter can mint this opaque storage authority. */
export type DigestRendererStorageContextV001 = Readonly<{
  approvedJob?: unknown;
  outputRoot: string;
  storageRoot: string;
  generatedRoot: string;
  tempDirectory: string;
  resolve: (logicalPath: string) => string;
  assertCurrent: () => Promise<void>;
  composeMedia: (input: Record<string, unknown>) => Promise<unknown>;
}>;

const qualifyStorageContext = async (storageContext: DigestRendererStorageContextV001 | undefined) => {
  if (storageContext === undefined) return;
  const {assertQualifiedDigestStorageContextV001} = await import(
    pathToFileURL(path.resolve(MODULE_DIRECTORY, '../../runner/src/digest-formal-handoff-v001.ts')).href
  );
  await assertQualifiedDigestStorageContextV001(storageContext);
};

/** Result projection only. This function never grants permission to publish media. */
export function projectPresentationInstructionRendererCompletionV002(draw) {
  if (draw?.exitCode !== 0) return null;
  if (draw.verification !== undefined) {
    const verification = draw.verification;
    if (!isObject(verification)
      || draw.finalQc !== verification
      || verification.schemaVersion !== 'digest-representative-completion-v001'
      || !['passed-representative', 'confirmation-pending'].includes(verification.status)
      || verification.complete !== (verification.status === 'passed-representative')
      || draw.verificationMode !== 'representative-plus-rules-v001'
      || draw.counterfactualQcExecuted !== false) return null;
    return Object.freeze({status: verification.complete ? 'completed' : 'confirmation-pending',
      complete: verification.complete, representative: true, qc: verification,
      verification});
  }
  return draw.finalQc?.status === 'passed'
    ? Object.freeze({status: 'completed', complete: true, representative: false, qc: draw.finalQc})
    : null;
}

/** Publication gate: a representative-shaped JSON alone is never sufficient. */
export async function qualifyPresentationInstructionRendererCompletionV002(draw,
  storageContext?: DigestRendererStorageContextV001) {
  const completion = projectPresentationInstructionRendererCompletionV002(draw);
  if (completion === null) return null;
  await qualifyStorageContext(storageContext);
  const policy = storageContext === undefined ? null
    : await resolveApprovedDigestVerificationPolicyV001(storageContext);
  if (policy === null) return completion.representative ? null : completion;
  if (!completion.representative || draw.verificationMode !== policy.mode) return null;
  await assertQualifiedDigestRepresentativeCompletionV001(
    completion.verification, storageContext, draw.workVideo,
  );
  return completion;
}

export const PRESENTATION_INSTRUCTION_RENDERER_IMPLEMENTATION_ROLE_PATHS_V002 = Object.freeze([
  ['instruction-renderer-runner-v002',
    'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts'],
  ['instruction-artifact-v002',
    'evals/clip_composition/presentation_instruction_artifact_v002.mjs'],
  ['renderer-admission-v002',
    'evals/clip_composition/presentation_renderer_admission_receipt_v002.mjs'],
  ['base-media-timeline-mapper-v004',
    'evals/clip_composition/presentation_base_media_timeline_v004.mjs'],
  ['renderer-line-layout-v002',
    'evals/clip_composition/presentation_renderer_line_layout_rule_v002.mjs'],
  ['renderer-text-layout-v001',
    'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['renderer-qc-v002',
    'evals/clip_composition/presentation_renderer_qc_v002.mjs'],
  ['renderer-core-v002',
    'evals/clip_composition/render_presentation_v002.mjs'],
  ['renderer-process-observation-v001',
    'evals/clip_composition/presentation_renderer_process_observation_v001.mjs'],
  ['renderer-overlay-v001',
    'evals/clip_composition/presentation_renderer_entry_v001.tsx'],
  ['renderer-layout-inspector-v001',
    'evals/clip_composition/inspect_presentation_render_layout_v001.ts'],
  ['renderer-atomic-publisher-v001',
    'evals/clip_composition/presentation_atomic_directory_publish_v001.mjs'],
].map(row => Object.freeze(row)));

export const PRESENTATION_INSTRUCTION_RENDERER_CONTRACT_ROLE_PATHS_V002 = Object.freeze([
  ['rendering-decoupling-contract-design-v001',
    'evals/clip_composition/reports/presentation/'
      + 'presentation-rendering-decoupling-contract-design-20260817-v001.md'],
  ['rendering-decoupling-contract-addendum-v001',
    'evals/clip_composition/reports/presentation/'
      + 'presentation-rendering-decoupling-contract-design-addendum-20260817-v001.md'],
  ['rendering-decoupling-contract-addendum-v002',
    'evals/clip_composition/reports/presentation/'
      + 'presentation-rendering-decoupling-contract-design-addendum-20260817-v002.md'],
  ['rendering-decoupling-contract-addendum-v003',
    'evals/clip_composition/reports/presentation/'
      + 'presentation-rendering-decoupling-contract-design-addendum-20260818-v003.md'],
  ['rendering-decoupling-contract-addendum-v004',
    'evals/clip_composition/reports/presentation/'
      + 'presentation-rendering-decoupling-contract-design-addendum-20260818-v004.md'],
].map(row => Object.freeze(row)));

const failure = (primaryCode, stage, pathValue = '/') => Object.freeze({
  status: 'rejected',
  primaryCode,
  stage,
  violations: Object.freeze([Object.freeze({
    code: primaryCode,
    path: pathValue,
    relatedIds: Object.freeze([]),
  })]),
});

const workspaceAbsolute = (workspaceRoot, relativePath) => {
  if (!WORKSPACE_PATH.test(relativePath)) throw new Error('workspace-path-invalid');
  const absolute = path.resolve(workspaceRoot, relativePath);
  if (!absolute.startsWith(`${workspaceRoot}${path.sep}`)) throw new Error('workspace-path-invalid');
  return absolute;
};

const referencedAbsolute = (workspaceRoot, relativePath, storageContext = undefined as
  DigestRendererStorageContextV001 | undefined) => storageContext === undefined
  ? workspaceAbsolute(workspaceRoot, relativePath) : storageContext.resolve(relativePath);

const generatedAbsolute = (workspaceRoot, logicalPath, storageContext = undefined as
  DigestRendererStorageContextV001 | undefined) => {
  if (storageContext !== undefined && !(logicalPath === storageContext.outputRoot
    || logicalPath.startsWith(`${storageContext.outputRoot}/`))) {
    throw new Error('digest-generated-prefix-mismatch');
  }
  return referencedAbsolute(workspaceRoot, logicalPath, storageContext);
};

const stableFileBytes = async filePath => {
  const firstResolved = await realpath(filePath);
  const before = await lstat(firstResolved, {bigint: true});
  if (!before.isFile()) throw new Error('stable-file-not-regular');
  const first = await readFile(firstResolved);
  const second = await readFile(firstResolved);
  const after = await lstat(firstResolved, {bigint: true});
  const secondResolved = await realpath(filePath);
  if (!first.equals(second)
    || firstResolved !== secondResolved
    || before.dev !== after.dev
    || before.ino !== after.ino
    || before.size !== after.size
    || before.mtimeNs !== after.mtimeNs) {
    throw new Error('stable-file-changed');
  }
  return Object.freeze({bytes: first, fileSha256: sha256(first), resolvedPath: firstResolved});
};

const observeJsonBinding = async (
  workspaceRoot,
  binding,
  decoder = null,
  schemaField = 'schemaVersion',
  storageContext = undefined as DigestRendererStorageContextV001 | undefined,
) => {
  const observed = await stableFileBytes(referencedAbsolute(workspaceRoot, binding.path, storageContext));
  if (observed.fileSha256 !== binding.fileSha256) throw new Error('json-file-binding-mismatch');
  const decoded = decoder === null
    ? (() => {
      const value = JSON.parse(observed.bytes.toString('utf8'));
      return {status: 'decoded', value};
    })()
    : decoder(observed.bytes);
  if (decoded.status !== 'decoded'
    || decoded.value?.[schemaField] !== binding.schemaVersion
    || canonicalSha256(decoded.value) !== binding.canonicalSha256) {
    throw new Error('json-canonical-binding-mismatch');
  }
  return Object.freeze({...observed, value: decoded.value});
};

const observeByteBinding = async (workspaceRoot, binding, storageContext = undefined as
  DigestRendererStorageContextV001 | undefined) => {
  const observed = await stableFileBytes(referencedAbsolute(workspaceRoot, binding.path, storageContext));
  if (observed.fileSha256 !== binding.fileSha256) throw new Error('byte-binding-mismatch');
  return observed;
};

export async function observePresentationRendererRuntimeBindingsV001(runtimeBindings) {
  const observed = {};
  for (const [role, binding] of Object.entries(runtimeBindings ?? {})) {
    if (!path.isAbsolute(binding?.path) || !SHA256.test(binding?.fileSha256 ?? '')) {
      throw new Error('runtime-binding-invalid');
    }
    const file = await stableFileBytes(binding.path);
    if (file.fileSha256 !== binding.fileSha256) throw new Error('runtime-binding-mismatch');
    observed[role] = {path: binding.path, fileSha256: file.fileSha256};
  }
  if (!same(observed, runtimeBindings)) throw new Error('runtime-binding-set-mismatch');
  return Object.freeze(clone(observed));
}

const profileCandidates = (registry, styleProfileId) => {
  if (Array.isArray(registry?.presets)) {
    return registry.presets.filter(row => row?.presetId === styleProfileId);
  }
  if (Array.isArray(registry?.profiles)) {
    return registry.profiles.filter(row => row?.profileId === styleProfileId);
  }
  return [];
};

/**
 * 注文書が持つprofile IDだけで表示状態が一件に閉じるかを判定する。
 * caption presetに複数状態がある場合は先頭/defaultを選ばず停止する。
 */
export function resolvePresentationRendererAppearanceV001({
  instructionArtifact,
  styleProfileRegistry,
  visualStateId,
}) {
  const candidates = profileCandidates(styleProfileRegistry, instructionArtifact?.styleProfileId);
  if (candidates.length !== 1) return failure('RENDER_ADMISSION_STYLE_INVALID', 'appearance');
  const profile = candidates[0];
  const visualStates = isObject(profile.visualState)
    ? [profile.visualState]
    : Array.isArray(profile.visualStates) ? profile.visualStates : [];
  const matched = visualStates.filter(row => row?.stateId === visualStateId);
  return matched.length === 1
    ? Object.freeze({status: 'resolved', profile, visualState: matched[0]})
    : failure('RENDER_ADMISSION_STYLE_INVALID', 'appearance', '/executionInputs/visualStateId');
}

export function buildPresentationInstructionCommonCorePlanV001({
  job,
  visualStateId,
  instructionArtifact,
  lineLayout,
  styleProfileRegistry,
  rendererTrust,
}) {
  const appearance = resolvePresentationRendererAppearanceV001({
    instructionArtifact,
    styleProfileRegistry,
    visualStateId,
  });
  if (appearance.status !== 'resolved') return appearance;
  const {profile, visualState} = appearance;
  const registryVersion = styleProfileRegistry.registryVersion ?? styleProfileRegistry.registryId;
  const registryCanvas = styleProfileRegistry.canvas ?? profile.canvas;
  const safeAreaPx = registryCanvas.safeAreaPx ?? profile.safeArea;
  const canvas = {...job.executionInputs.canvas, ...(safeAreaPx ? {safeAreaPx: clone(safeAreaPx)} : {})};
  const transition = (styleProfileRegistry.transitions ?? []).find(
    row => row.transitionId === visualState.transitionId,
  ) ?? null;
  const layoutByInstruction = new Map(lineLayout.entries.map(row => [row.instructionId, row]));
  const elements = [];
  for (const instruction of instructionArtifact.instructions) {
    const layout = layoutByInstruction.get(instruction.instructionId);
    const indexed = indexExplicitLinesV001(layout?.lines.map(row => row.text) ?? []);
    if (indexed.status !== 'passed' || indexed.sourceText !== instruction.content.text) {
      return failure('LINE_LAYOUT_ORACLE_MISMATCH', 'common-plan', '/lineLayout');
    }
    elements.push({
      instructionId: instruction.instructionId,
      kind: instruction.semanticKind === 'title' ? 'title-cover' : 'speech-caption',
      text: instruction.content.text,
      indexedLines: indexed.indexedLines.map((line, index) => ({
        ...line,
        sourceUnitIds: clone(layout.lines[index].sourceUnitIds),
        logicalWidth: layout.lines[index].logicalWidth,
      })),
      sourceStartMs: null,
      sourceEndMs: null,
      startFrame: instruction.outputTime.startFrame,
      endFrameExclusive: instruction.outputTime.endFrameExclusive,
      displayFrameCount: instruction.outputTime.endFrameExclusive - instruction.outputTime.startFrame,
      requestedProfileId: instructionArtifact.styleProfileId,
      appliedProfileId: instructionArtifact.styleProfileId,
      requestedPresetId: instructionArtifact.styleProfileId,
      appliedPresetId: instructionArtifact.styleProfileId,
      presetId: instructionArtifact.styleProfileId,
      registryVersion,
      presetRegistryVersion: registryVersion,
      stateId: visualState.stateId,
      visualState: clone(visualState),
      transition: clone(transition),
      timelineSegmentId: null,
      targetProvenance: {
        targetRefId: instruction.targetProvenance.targetRefId,
        targetType: instruction.targetProvenance.targetType,
        sourceAtomIds: clone(instruction.targetProvenance.atomOccurrenceIds),
      },
      materialRefs: clone(instruction.materialRefs),
    });
  }
  return Object.freeze({
    status: 'built',
    plan: Object.freeze({
      schemaVersion: 'presentation-output-common-core-plan-v001',
      format: job.executionInputs.format,
      canvas: Object.freeze(canvas),
      layoutRules: clone(rendererTrust.layoutRules),
      elements: Object.freeze(elements),
    }),
    profile,
  });
}

const outputUnused = async (workspaceRoot, job, storageContext = undefined as
  DigestRendererStorageContextV001 | undefined) => {
  for (const relativePath of Object.values(job.publication)) {
    try {
      await lstat(generatedAbsolute(workspaceRoot, relativePath, storageContext));
      return false;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return true;
};

const publishLineLayout = async ({workspaceRoot, outputPath, layout,
  storageContext = undefined as DigestRendererStorageContextV001 | undefined}) => {
  await qualifyStorageContext(storageContext);
  const absolute = generatedAbsolute(workspaceRoot, outputPath, storageContext);
  const bytes = serializePresentationRendererLineLayoutV002(layout);
  await writeFile(absolute, bytes, {flag: 'wx', mode: 0o444});
  const reread = await stableFileBytes(absolute);
  await qualifyStorageContext(storageContext);
  const decoded = decodePresentationRendererLineLayoutV002(reread.bytes);
  if (!reread.bytes.equals(bytes) || decoded.status !== 'decoded' || !same(decoded.value, layout)) {
    throw new Error('line-layout-publication-mismatch');
  }
  return Object.freeze({path: outputPath, fileSha256: reread.fileSha256});
};

export async function executePresentationInstructionRendererJobV002({
  workspaceRoot,
  job,
  rendererJobBinding,
  instructionArtifact,
  cueEndProjection,
  lineEndProjection,
  lineEndSourcePackage,
  meaningPackage,
  timeline,
  styleProfileRegistry,
  materialRegistry,
  rendererTrust,
  mediaInspection,
  renderMediaInspection,
  fontAssetInspections,
  rendererDependencyInspections,
  observedRuntimeBindings,
  observedImplementationBindings,
  outputPathsUnused,
  processObserver = null,
  capabilities = {},
  serializePngAndFilters = false,
  autoPresentation = undefined as AutoPresentationInput | undefined,
  suppliedOverlayAdapter = undefined as ReturnType<typeof buildPresentationRendererOverlayAdapterV001> | undefined,
  storageContext = undefined as DigestRendererStorageContextV001 | undefined,
}) {
  await qualifyStorageContext(storageContext);
  if (storageContext !== undefined && (Object.keys(capabilities).length !== 0
    || suppliedOverlayAdapter !== undefined || autoPresentation !== undefined)) {
    throw new TypeError('Digest storage requires the bound Normal file renderer');
  }
  if (storageContext !== undefined) {
    for (const outputPath of Object.values(job.publication ?? {})) {
      generatedAbsolute(workspaceRoot, outputPath, storageContext);
    }
  }
  const admission = inspectPresentationRendererAdmissionV002({
    job,
    instructionArtifact,
    cueEndProjection,
    lineEndProjection,
    lineEndSourcePackage,
    meaningPackage,
    timeline,
    styleProfileRegistry,
    materialRegistry,
    rendererTrust,
    mediaInspection,
    fontAssetInspections,
    rendererDependencyInspections,
    observedRuntimeBindings,
    observedImplementationBindings,
    outputPathsUnused,
  });
  if (admission.status !== 'accepted') return {exitCode: 1, result: admission};
  const receiptBuilt = buildPresentationRendererAdmissionReceiptV002({
    job,
    rendererJobBinding,
    instructionArtifact,
    checks: admission.checks,
  });
  if (receiptBuilt.status !== 'built') return {exitCode: 1, result: receiptBuilt};
  const receiptStagingPath = `${path.posix.dirname(job.publication.admissionReceiptPath)}`
    + `/.${path.posix.basename(job.publication.admissionReceiptPath)}.${job.attemptId}.staging`;
  const publishReceipt = capabilities.publishReceipt
    ?? publishPresentationRendererAdmissionReceiptNoReplaceV002;
  const receiptPublication = await publishReceipt({
    workspaceRoot: storageContext?.storageRoot ?? workspaceRoot,
    stagingPath: receiptStagingPath,
    outputPath: job.publication.admissionReceiptPath,
    receipt: receiptBuilt.receipt,
  });
  await qualifyStorageContext(storageContext);
  if (receiptPublication.status !== 'published') {
    return {exitCode: 1, result: receiptPublication};
  }
  if (validatePresentationRendererAdmissionReceiptV002(receiptBuilt.receipt, {job}).status
    !== 'passed') {
    return {exitCode: 1, result: failure('RENDER_ADMISSION_BINDING_MISMATCH', 'receipt')};
  }

  if (job.executionInputs.visualStateId !== receiptBuilt.receipt.visualStateId) {
    return {exitCode: 1, result: failure(
      'RENDER_ADMISSION_BINDING_MISMATCH',
      'receipt',
      '/visualStateId',
    )};
  }

  const appearance = resolvePresentationRendererAppearanceV001({
    instructionArtifact,
    styleProfileRegistry,
    visualStateId: receiptBuilt.receipt.visualStateId,
  });
  if (appearance.status !== 'resolved') return {exitCode: 1, result: appearance};
  const maxLogicalWidth = appearance.profile.maxLogicalWidth
    ?? appearance.visualState.layout?.maxCharsPerLine;
  const maxLines = appearance.profile.maxLines ?? appearance.visualState.layout?.maxLines;
  const layoutBuilt = buildPresentationRendererLineLayoutV002({
    layoutId: `${job.jobId}-line-layout-v002`,
    instructionArtifactBinding: job.instructionArtifactBinding,
    instructionArtifact,
    meaningPackage,
    lineEndProjection,
    lineEndSourcePackage,
    maxLogicalWidth,
    maxLines,
    characterWidthRule: rendererTrust.layoutRules.characterWidthRule,
    lineLayoutRules: job.executionInputs.lineLayoutRules,
  });
  if (layoutBuilt.status !== 'built') return {exitCode: 1, result: layoutBuilt};
  const lineLayoutPublication = await (capabilities.publishLineLayout ?? publishLineLayout)({
    workspaceRoot,
    outputPath: job.publication.lineLayoutPath,
    layout: layoutBuilt.layout,
    ...(storageContext === undefined ? {} : {storageContext}),
  });
  const common = buildPresentationInstructionCommonCorePlanV001({
    job,
    visualStateId: receiptBuilt.receipt.visualStateId,
    instructionArtifact,
    lineLayout: layoutBuilt.layout,
    styleProfileRegistry,
    rendererTrust,
  });
  if (common.status !== 'built') return {exitCode: 1, result: common};
  const executeDraw = capabilities.executeDraw ?? executeValidatedPresentationDrawAndQcV001;
  const overlayAdapter = capabilities.executeDraw === undefined
    ? suppliedOverlayAdapter ?? buildPresentationRendererOverlayAdapterV001({
      remotionPath: receiptBuilt.receipt.runtimeBindings.remotion.path,
      chromiumPath: receiptBuilt.receipt.runtimeBindings.chromium.path,
      processObserver,
    })
    : undefined;
  const draw = await executeDraw({
    outputDirectory: generatedAbsolute(workspaceRoot, job.publication.renderOutputRoot, storageContext),
    plan: common.plan,
    presetRegistry: styleProfileRegistry,
    baseMediaPath: referencedAbsolute(workspaceRoot, job.cropAppliedBaseMedia.baseMedia.path, storageContext),
    baseMediaInspection: {media: renderMediaInspection},
    expectedFrameCount: mediaInspection.frameCount,
    evaluateQc: input => evaluatePresentationRendererQcWithProfileV001(input, {
      schemaVersion: 'presentation-render-qc-v002',
      planFile: 'presentation-render-plan-v002.json',
    }),
    toolPaths: {
      ffmpegPath: job.runtimeBindings.ffmpeg.path,
      ffprobePath: job.runtimeBindings.ffprobe.path,
      imageMagickPath: job.runtimeBindings.imageMagick.path,
      tsxPath: job.runtimeBindings.tsx.path,
      layoutInspectorPath: workspaceAbsolute(
        workspaceRoot,
        'evals/clip_composition/inspect_presentation_render_layout_v001.ts',
      ),
    },
    ...(overlayAdapter === undefined ? {} : {overlayAdapter}),
    ...(serializePngAndFilters ? {serializePngAndFilters: true} : {}),
    ...(autoPresentation === undefined ? {} : {autoPresentation}),
    counterfactualQcMethod: autoPresentation === undefined ? 'encoded-omission-v2' : 'exact-replay-native-v1',
    processObserver,
    ...(storageContext === undefined ? {} : {storageContext}),
  });
  const completion = await qualifyPresentationInstructionRendererCompletionV002(draw, storageContext);
  if (completion === null) {
    return {exitCode: draw.exitCode === 1 ? 1 : 2, result: draw};
  }
  const committed = await (capabilities.commitDraw ?? commitValidatedPresentationArtifactsV002)({
    stagingDirectory: draw.stagingDirectory,
    outputDirectory: draw.outputDirectory,
    reservation: draw.reservation,
  });
  let publication = committed;
  if (completion.representative) {
    if (committed.status !== 'published'
      || committed.outputDirectory !== draw.outputDirectory) {
      throw new TypeError('Representative media publication did not preserve the owned output');
    }
    const completedMediaPath = path.join(committed.outputDirectory, 'presentation-rendered-v002.mp4');
    await assertQualifiedDigestRepresentativeCompletionV001(
      completion.verification, storageContext, completedMediaPath,
    );
    publication = {...committed, video: {path: completedMediaPath,
      fileSha256: completion.verification.bindings.completedMedia.fileSha256}};
  }
  return {
    exitCode: 0,
    result: Object.freeze({
      status: completion.status,
      rendererJobBinding: clone(rendererJobBinding),
      receipt: receiptBuilt.receipt,
      receiptPublication,
      lineLayout: layoutBuilt.layout,
      lineLayoutPublication,
      commonCorePlan: common.plan,
      ...(autoPresentation === undefined ? {} : {
        effectivePlan: draw.resolvedPlan,
        autoPresentationResolution: draw.autoPresentationResolution,
        autoPresentationInputs: draw.autoPresentationInputs,
      }),
      qc: draw.finalQc,
      ...(completion.representative ? {complete: completion.complete,
        verification: completion.verification, verificationMode: draw.verificationMode,
        counterfactualQcExecuted: false} : {}),
      publication,
    }),
  };
}

export async function runPresentationInstructionRendererJobFileV002(
  jobPath,
  {workspaceRoot = DEFAULT_WORKSPACE_ROOT, serializePngAndFilters = false,
    overlayAdapter, autoPresentationFiles, storageContext}: {workspaceRoot?: string; serializePngAndFilters?: boolean;
      autoPresentationFiles?: {baselinePath: string; decisionInputPath: string;
        autoProposalPath?: string; overridesPath?: string};
      overlayAdapter?: ReturnType<typeof buildPresentationRendererOverlayAdapterV001>;
      storageContext?: DigestRendererStorageContextV001} = {},
) {
  await qualifyStorageContext(storageContext);
  if (storageContext !== undefined && (overlayAdapter !== undefined || autoPresentationFiles !== undefined)) {
    throw new TypeError('Digest storage requires the bound Normal file renderer');
  }
  const root = await realpath(workspaceRoot);
  const relativeJobPath = path.isAbsolute(jobPath)
    ? path.relative(storageContext?.storageRoot ?? root, jobPath) : jobPath;
  const jobObserved = await stableFileBytes(generatedAbsolute(root, relativeJobPath, storageContext));
  const decodedJob = decodePresentationInstructionRendererJobV002(jobObserved.bytes);
  if (decodedJob.status !== 'decoded') {
    return {exitCode: 1, result: failure('RENDER_ADMISSION_INPUT_INVALID', 'job-read')};
  }
  const job = decodedJob.value;
  let autoPresentation: AutoPresentationInput | undefined;
  let autoPresentationSourceFiles;
  if (autoPresentationFiles !== undefined) {
    if (!isObject(autoPresentationFiles) || Object.keys(autoPresentationFiles).some(
      key => !['baselinePath', 'decisionInputPath', 'autoProposalPath', 'overridesPath'].includes(key),
    )) {
      throw new TypeError('automatic presentation file inputs are invalid');
    }
    const inputPath = (value: string) => {
      if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError('automatic presentation file path is required');
      }
      return path.resolve(root, value);
    };
    const loaded = await loadAutoPresentationV001({
      baselinePath: inputPath(autoPresentationFiles.baselinePath),
      decisionInputPath: inputPath(autoPresentationFiles.decisionInputPath),
      ...(autoPresentationFiles.autoProposalPath === undefined ? {} : {
        autoProposalPath: inputPath(autoPresentationFiles.autoProposalPath),
      }),
      ...(autoPresentationFiles.overridesPath === undefined ? {} : {
        overridesPath: inputPath(autoPresentationFiles.overridesPath),
      }),
    });
    autoPresentation = loaded.autoPresentation;
    const sourceFile = async (filePath: string | undefined, loadedValue) => {
      if (filePath === undefined) return null;
      const absolutePath = inputPath(filePath);
      const observed = await stableFileBytes(absolutePath);
      if (canonicalSha256(JSON.parse(observed.bytes.toString('utf8')))
        !== canonicalSha256(loadedValue)) {
        throw new Error('automatic presentation source changed after validation');
      }
      return Object.freeze({path: absolutePath, fileSha256: observed.fileSha256});
    };
    autoPresentationSourceFiles = Object.freeze({
      autoProposal: await sourceFile(autoPresentationFiles.autoProposalPath, autoPresentation.autoProposal),
      overrides: await sourceFile(autoPresentationFiles.overridesPath, autoPresentation.overrides),
    });
  }
  const rendererJobBinding = {
    schemaVersion: job.schemaVersion,
    path: relativeJobPath,
    fileSha256: jobObserved.fileSha256,
    canonicalSha256: canonicalSha256(job),
  };
  const instruction = await observeJsonBinding(
    root,
    job.instructionArtifactBinding,
    decodePresentationInstructionArtifactV002,
    'schemaVersion', storageContext,
  );
  const meaning = await observeJsonBinding(
    root,
    instruction.value.sourceBindings.meaningInformationPackage,
    null, 'schemaVersion', storageContext,
  );
  const timeline = instruction.value.sourceBindings.timeline === null
    ? await observeJsonBinding(root, job.cropAppliedBaseMedia.timeline, null, 'schemaVersion', storageContext)
    : await observeJsonBinding(root, instruction.value.sourceBindings.timeline, null, 'schemaVersion', storageContext);
  const projection = instruction.value.sourceBindings.cueEndProjection === null
    ? null
    : await observeJsonBinding(
      root,
      instruction.value.sourceBindings.cueEndProjection,
      decodePresentationCueEndProjectionV001,
      'schemaVersion', storageContext,
    );
  const lineEndProjection = job.lineEndProjectionBinding === null
    ? null
    : await observeJsonBinding(
      root,
      job.lineEndProjectionBinding,
      decodePresentationSemanticLineEndProjectionV001,
      'schemaVersion', storageContext,
    );
  const lineEndSourcePackage = lineEndProjection === null
    ? null
    : await observeJsonBinding(root, lineEndProjection.value.sourcePackageBinding, null, 'schemaVersion', storageContext);
  const [style, material, trust] = await Promise.all([
    observeJsonBinding(root, job.registryBindings.styleProfileRegistry, null, 'schemaVersion', storageContext),
    observeJsonBinding(root, job.registryBindings.materialRegistry, null, 'registryVersion'),
    observeJsonBinding(root, job.registryBindings.rendererTrust, null, 'schemaVersion', storageContext),
  ]);
  await Promise.all([
    observeByteBinding(root, job.cropAppliedBaseMedia.baseMedia, storageContext),
    observeJsonBinding(root, job.cropAppliedBaseMedia.generationManifest, null, 'schemaVersion', storageContext),
    observeJsonBinding(root, job.cropAppliedBaseMedia.validationReceipt, null, 'schemaVersion', storageContext),
    ...job.approvedContractBindings.map(row => observeByteBinding(root, row)),
  ]);
  const observedImplementationBindings = await Promise.all(
    job.rendererImplementationBindings.map(async row => {
      const file = await observeByteBinding(root, row);
      return {role: row.role, path: row.path, fileSha256: file.fileSha256};
    }),
  );
  const observedRuntimeBindings = await observePresentationRendererRuntimeBindingsV001(
    job.runtimeBindings,
  );
  const originalProcessObserver = createPresentationRendererProcessObserverV001({
    observationDirectory: path.join(
      path.dirname(jobObserved.resolvedPath),
      'process-observations',
      job.attemptId,
    ),
  });
  const processObserver = storageContext === undefined ? originalProcessObserver : Object.freeze({
    ...originalProcessObserver,
    run: async (command, args, options = {} as {env?: NodeJS.ProcessEnv; cwd?: string}) => {
      await qualifyStorageContext(storageContext);
      // tsx uses TMPDIR in its Unix socket name. Keep the same owned directory
      // while avoiding a volume/plan dependent absolute socket name.
      const normalLayoutCli = storageContext.approvedJob !== undefined && command === job.runtimeBindings.tsx.path;
      const cliTemp = normalLayoutCli ? path.relative(storageContext.generatedRoot, storageContext.tempDirectory) : storageContext.tempDirectory;
      if (normalLayoutCli && cliTemp !== 'temp') throw new Error('approved-layout-temp-mismatch');
      const result = await originalProcessObserver.run(normalLayoutCli ? process.execPath : command,
        normalLayoutCli ? [command, ...args] : args, {
        ...options,
        ...(normalLayoutCli ? {cwd: storageContext.generatedRoot} : {}),
        env: {...process.env, ...options.env, TMPDIR: cliTemp,
          TMP: cliTemp, TEMP: cliTemp,
          MAGICK_TEMPORARY_PATH: storageContext.tempDirectory},
      });
      await qualifyStorageContext(storageContext);
      return result;
    },
  });
  const fontAssetInspections = await Promise.all(trust.value.fontAssets.map(async row => ({
    path: row.path,
    fileSha256: (await observeByteBinding(root, row)).fileSha256,
  })));
  const rendererDependencyInspections = await Promise.all(
    trust.value.rendererDependencies.map(async row => ({
      path: row.path,
      fileSha256: (await observeByteBinding(root, row)).fileSha256,
    })),
  );
  const media = await inspectRenderedMediaWithToolsV001(
    referencedAbsolute(root, job.cropAppliedBaseMedia.baseMedia.path, storageContext),
    {
      ffmpegPath: job.runtimeBindings.ffmpeg.path,
      ffprobePath: job.runtimeBindings.ffprobe.path,
      processObserver,
      observationLabelPrefix: 'input-media-inspection',
    },
  );
  const mediaInspection = {
    path: job.cropAppliedBaseMedia.baseMedia.path,
    fileSha256: job.cropAppliedBaseMedia.baseMedia.fileSha256,
    width: media.video.width,
    height: media.video.height,
    fps: media.video.fps,
    frameCount: media.video.frameCount,
    audioStreamCount: media.audio ? 1 : 0,
  };
  const outcome = await executePresentationInstructionRendererJobV002({
    workspaceRoot: root,
    job,
    rendererJobBinding,
    instructionArtifact: instruction.value,
    cueEndProjection: projection?.value ?? null,
    lineEndProjection: lineEndProjection?.value ?? null,
    lineEndSourcePackage: lineEndSourcePackage?.value ?? null,
    meaningPackage: meaning.value,
    timeline: timeline.value,
    styleProfileRegistry: style.value,
    materialRegistry: material.value,
    rendererTrust: trust.value,
    mediaInspection,
    renderMediaInspection: media,
    fontAssetInspections,
    rendererDependencyInspections,
    observedRuntimeBindings,
    observedImplementationBindings,
    outputPathsUnused: await outputUnused(root, job, storageContext),
    processObserver,
    serializePngAndFilters,
    autoPresentation,
    suppliedOverlayAdapter: overlayAdapter,
    storageContext,
  });
  if (autoPresentation !== undefined && outcome.exitCode === 0) {
    return {...outcome, result: Object.freeze({...outcome.result, autoPresentationSourceFiles})};
  }
  return outcome;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void runPresentationInstructionRendererJobFileV002(process.argv[2] ?? '').then(result => {
    process.stdout.write(`${JSON.stringify(result.result)}\n`);
    process.exitCode = result.exitCode;
  });
}
