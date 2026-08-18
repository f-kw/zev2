#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {lstat, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  decodePresentationCueEndProjectionV001,
  decodePresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {
  decodePresentationInstructionArtifactV001,
} from './presentation_instruction_artifact_v001.mjs';
import {
  buildPresentationRendererAdmissionReceiptV001,
  decodePresentationInstructionRendererJobV001,
  inspectPresentationRendererAdmissionV001,
  publishPresentationRendererAdmissionReceiptNoReplaceV001,
  validatePresentationRendererAdmissionReceiptV001,
} from './presentation_renderer_admission_receipt_v001.mjs';
import {
  buildPresentationRendererLineLayoutV001,
  decodePresentationRendererLineLayoutV001,
  serializePresentationRendererLineLayoutV001,
} from './presentation_renderer_line_layout_rule_v001.mjs';
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

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

const sha256 = value => createHash('sha256').update(value).digest('hex');
const canonicalSha256 = value => sha256(canonicalJson(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);

export const PRESENTATION_INSTRUCTION_RENDERER_IMPLEMENTATION_ROLE_PATHS_V001 = Object.freeze([
  ['instruction-renderer-runner-v001',
    'evals/clip_composition/run_presentation_instruction_renderer_job_v001.ts'],
  ['instruction-artifact-v001',
    'evals/clip_composition/presentation_instruction_artifact_v001.mjs'],
  ['renderer-admission-v001',
    'evals/clip_composition/presentation_renderer_admission_receipt_v001.mjs'],
  ['renderer-line-layout-v001',
    'evals/clip_composition/presentation_renderer_line_layout_rule_v001.mjs'],
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

export const PRESENTATION_INSTRUCTION_RENDERER_CONTRACT_ROLE_PATHS_V001 = Object.freeze([
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
) => {
  const observed = await stableFileBytes(workspaceAbsolute(workspaceRoot, binding.path));
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

const observeByteBinding = async (workspaceRoot, binding) => {
  const observed = await stableFileBytes(workspaceAbsolute(workspaceRoot, binding.path));
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

const outputUnused = async (workspaceRoot, job) => {
  for (const relativePath of Object.values(job.publication)) {
    try {
      await lstat(workspaceAbsolute(workspaceRoot, relativePath));
      return false;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return true;
};

const publishLineLayout = async ({workspaceRoot, outputPath, layout}) => {
  const absolute = workspaceAbsolute(workspaceRoot, outputPath);
  const bytes = serializePresentationRendererLineLayoutV001(layout);
  await writeFile(absolute, bytes, {flag: 'wx', mode: 0o444});
  const reread = await stableFileBytes(absolute);
  const decoded = decodePresentationRendererLineLayoutV001(reread.bytes);
  if (!reread.bytes.equals(bytes) || decoded.status !== 'decoded' || !same(decoded.value, layout)) {
    throw new Error('line-layout-publication-mismatch');
  }
  return Object.freeze({path: outputPath, fileSha256: reread.fileSha256});
};

export async function executePresentationInstructionRendererJobV001({
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
}) {
  const admission = inspectPresentationRendererAdmissionV001({
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
  const receiptBuilt = buildPresentationRendererAdmissionReceiptV001({
    job,
    rendererJobBinding,
    instructionArtifact,
    checks: admission.checks,
  });
  if (receiptBuilt.status !== 'built') return {exitCode: 1, result: receiptBuilt};
  const receiptStagingPath = `${path.posix.dirname(job.publication.admissionReceiptPath)}`
    + `/.${path.posix.basename(job.publication.admissionReceiptPath)}.${job.attemptId}.staging`;
  const publishReceipt = capabilities.publishReceipt
    ?? publishPresentationRendererAdmissionReceiptNoReplaceV001;
  const receiptPublication = await publishReceipt({
    workspaceRoot,
    stagingPath: receiptStagingPath,
    outputPath: job.publication.admissionReceiptPath,
    receipt: receiptBuilt.receipt,
  });
  if (receiptPublication.status !== 'published') {
    return {exitCode: 1, result: receiptPublication};
  }
  if (validatePresentationRendererAdmissionReceiptV001(receiptBuilt.receipt, {job}).status
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
  const layoutBuilt = buildPresentationRendererLineLayoutV001({
    layoutId: `${job.jobId}-line-layout-v001`,
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
    ? buildPresentationRendererOverlayAdapterV001({
      remotionPath: receiptBuilt.receipt.runtimeBindings.remotion.path,
      chromiumPath: receiptBuilt.receipt.runtimeBindings.chromium.path,
      processObserver,
    })
    : undefined;
  const draw = await executeDraw({
    outputDirectory: workspaceAbsolute(workspaceRoot, job.publication.renderOutputRoot),
    plan: common.plan,
    presetRegistry: styleProfileRegistry,
    baseMediaPath: workspaceAbsolute(workspaceRoot, job.cropAppliedBaseMedia.baseMedia.path),
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
    processObserver,
  });
  if (draw.exitCode !== 0 || draw.finalQc?.status !== 'passed') {
    return {exitCode: draw.exitCode === 1 ? 1 : 2, result: draw};
  }
  const publication = await (capabilities.commitDraw ?? commitValidatedPresentationArtifactsV002)({
    stagingDirectory: draw.stagingDirectory,
    outputDirectory: draw.outputDirectory,
    reservation: draw.reservation,
  });
  return {
    exitCode: 0,
    result: Object.freeze({
      status: 'completed',
      rendererJobBinding: clone(rendererJobBinding),
      receipt: receiptBuilt.receipt,
      receiptPublication,
      lineLayout: layoutBuilt.layout,
      lineLayoutPublication,
      commonCorePlan: common.plan,
      qc: draw.finalQc,
      publication,
    }),
  };
}

export async function runPresentationInstructionRendererJobFileV001(
  jobPath,
  {workspaceRoot = DEFAULT_WORKSPACE_ROOT} = {},
) {
  const root = await realpath(workspaceRoot);
  const relativeJobPath = path.isAbsolute(jobPath) ? path.relative(root, jobPath) : jobPath;
  const jobObserved = await stableFileBytes(workspaceAbsolute(root, relativeJobPath));
  const decodedJob = decodePresentationInstructionRendererJobV001(jobObserved.bytes);
  if (decodedJob.status !== 'decoded') {
    return {exitCode: 1, result: failure('RENDER_ADMISSION_INPUT_INVALID', 'job-read')};
  }
  const job = decodedJob.value;
  const rendererJobBinding = {
    schemaVersion: job.schemaVersion,
    path: relativeJobPath,
    fileSha256: jobObserved.fileSha256,
    canonicalSha256: canonicalSha256(job),
  };
  const instruction = await observeJsonBinding(
    root,
    job.instructionArtifactBinding,
    decodePresentationInstructionArtifactV001,
  );
  const meaning = await observeJsonBinding(
    root,
    instruction.value.sourceBindings.meaningInformationPackage,
  );
  const timeline = instruction.value.sourceBindings.timeline === null
    ? await observeJsonBinding(root, job.cropAppliedBaseMedia.timeline)
    : await observeJsonBinding(root, instruction.value.sourceBindings.timeline);
  const projection = instruction.value.sourceBindings.cueEndProjection === null
    ? null
    : await observeJsonBinding(
      root,
      instruction.value.sourceBindings.cueEndProjection,
      decodePresentationCueEndProjectionV001,
    );
  const lineEndProjection = job.lineEndProjectionBinding === null
    ? null
    : await observeJsonBinding(
      root,
      job.lineEndProjectionBinding,
      decodePresentationSemanticLineEndProjectionV001,
    );
  const lineEndSourcePackage = lineEndProjection === null
    ? null
    : await observeJsonBinding(root, lineEndProjection.value.sourcePackageBinding);
  const [style, material, trust] = await Promise.all([
    observeJsonBinding(root, job.registryBindings.styleProfileRegistry),
    observeJsonBinding(root, job.registryBindings.materialRegistry, null, 'registryVersion'),
    observeJsonBinding(root, job.registryBindings.rendererTrust),
  ]);
  await Promise.all([
    observeByteBinding(root, job.cropAppliedBaseMedia.baseMedia),
    observeJsonBinding(root, job.cropAppliedBaseMedia.generationManifest),
    observeJsonBinding(root, job.cropAppliedBaseMedia.validationReceipt),
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
  const processObserver = createPresentationRendererProcessObserverV001({
    observationDirectory: path.join(
      path.dirname(jobObserved.resolvedPath),
      'process-observations',
      job.attemptId,
    ),
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
    workspaceAbsolute(root, job.cropAppliedBaseMedia.baseMedia.path),
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
  return executePresentationInstructionRendererJobV001({
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
    outputPathsUnused: await outputUnused(root, job),
    processObserver,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void runPresentationInstructionRendererJobFileV001(process.argv[2] ?? '').then(result => {
    process.stdout.write(`${JSON.stringify(result.result)}\n`);
    process.exitCode = result.exitCode;
  });
}
