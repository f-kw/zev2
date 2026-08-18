import {constants as fsConstants} from 'node:fs';
import {link, lstat, open, readFile, realpath, unlink} from 'node:fs/promises';
import path from 'node:path';

import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001,
  validatePresentationInstructionArtifactV001,
} from './presentation_instruction_artifact_v001.mjs';
import {
  PRESENTATION_SEMANTIC_LINE_END_PROJECTION_SCHEMA_V001,
  validatePresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';

export const PRESENTATION_INSTRUCTION_RENDERER_JOB_SCHEMA_V001 =
  'presentation-instruction-renderer-job-v001';
export const PRESENTATION_RENDERER_ADMISSION_RECEIPT_SCHEMA_V001 =
  'presentation-renderer-admission-receipt-v001';

export const PRESENTATION_RENDERER_ADMISSION_CODES_V001 = Object.freeze([
  'RENDER_ADMISSION_INPUT_INVALID',
  'RENDER_ADMISSION_BINDING_MISMATCH',
  'RENDER_ADMISSION_MEDIA_INVALID',
  'RENDER_ADMISSION_CANVAS_FORMAT_INVALID',
  'RENDER_ADMISSION_STYLE_INVALID',
  'RENDER_ADMISSION_MATERIAL_INVALID',
  'RENDER_ADMISSION_FONT_INVALID',
  'RENDER_ADMISSION_TRUST_INVALID',
  'RENDER_ADMISSION_IMPLEMENTATION_INVALID',
  'RENDER_ADMISSION_EXECUTION_INPUT_INVALID',
  'RENDER_ADMISSION_PUBLICATION_FAILED',
  'DIRECT_RENDER_PATH_FORBIDDEN',
]);

export const PRESENTATION_RENDERER_ADMISSION_CHECKS_V001 = Object.freeze([
  'instruction-artifact',
  'cue-end-projection',
  'semantic-line-end-projection',
  'crop-applied-base-media',
  'canvas-format',
  'style-profile-registry',
  'material-registry',
  'font-ledger',
  'renderer-trust',
  'renderer-implementation',
  'renderer-execution-inputs',
]);

export const PRESENTATION_RENDERER_EXECUTION_POINTERS_V001 = Object.freeze([
  '/executionInputs/format',
  '/executionInputs/canvas',
  '/executionInputs/screenLayoutId',
  '/executionInputs/visualStateId',
  '/executionInputs/cropPolicy',
  '/executionInputs/sceneTransitionPolicy',
  '/executionInputs/audioPolicy',
  '/executionInputs/lineLayoutRules',
]);
export const PRESENTATION_RENDERER_RUNTIME_ROLES_V001 = Object.freeze([
  'ffmpeg', 'ffprobe', 'imageMagick', 'remotion', 'tsx', 'chromium',
]);

const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const isObject = value => value !== null && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).length === value.length
  && value.every((_, index) => Object.hasOwn(value, index));
const nonempty = value => typeof value === 'string' && value.length > 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = value => structuredClone(value);
const formalBytes = value => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return result.bytes;
};

const formalBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && FORMAL_ID.test(value.schemaVersion)
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && SHA256.test(value.canonicalSha256);
const byteBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const roleBinding = value => exactKeys(value, ['role', 'path', 'fileSha256'])
  && FORMAL_ID.test(value.role) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256);
const inspectedMedia = value => exactKeys(value, [
  'path', 'fileSha256', 'width', 'height', 'fps', 'frameCount', 'audioStreamCount',
]) && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && positive(value.width)
  && positive(value.height)
  && positive(value.fps)
  && positive(value.frameCount)
  && Number.isSafeInteger(value.audioStreamCount)
  && value.audioStreamCount > 0;
const inspectedFile = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const runtimeBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && path.isAbsolute(value.path) && SHA256.test(value.fileSha256);
const runtimeBindingSet = value => isObject(value)
  && same(Object.keys(value), PRESENTATION_RENDERER_RUNTIME_ROLES_V001)
  && PRESENTATION_RENDERER_RUNTIME_ROLES_V001.every(role => runtimeBinding(value[role]));
const trustedFontAsset = value => exactKeys(value, [
  'fontAssetId', 'path', 'fileSha256',
]) && FORMAL_ID.test(value.fontAssetId)
  && WORKSPACE_PATH.test(value.path) && SHA256.test(value.fileSha256);
const fontLedgerBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
  'jsonPointer', 'valueCanonicalSha256',
]) && FORMAL_ID.test(value.schemaVersion)
  && WORKSPACE_PATH.test(value.path)
  && SHA256.test(value.fileSha256)
  && SHA256.test(value.canonicalSha256)
  && value.jsonPointer === '/fontAssets'
  && SHA256.test(value.valueCanonicalSha256);
const ownerValueBinding = value => exactKeys(value, [
  'ownerJobBinding', 'jsonPointer', 'valueCanonicalSha256',
]) && formalBinding(value.ownerJobBinding)
  && /^\/executionInputs(?:\/|$)/u.test(value.jsonPointer)
  && SHA256.test(value.valueCanonicalSha256);

const violation = (code, pointer, relatedIds = []) => Object.freeze({
  code,
  path: pointer,
  relatedIds: Object.freeze([...new Set(relatedIds)].sort()),
});
const rejected = (code, pointer, relatedIds = []) => Object.freeze({
  status: 'rejected',
  primaryCode: code,
  violations: Object.freeze([violation(code, pointer, relatedIds)]),
});

const canonicalHash = value => {
  const canonical = canonicalizePresentationCaptionB1JsonV001(value);
  if (canonical.status !== 'canonicalized') throw new TypeError('canonical JSON serialization failed');
  const hashed = sha256PresentationCaptionB1BytesV001(canonical.bytes);
  if (hashed.status !== 'hashed') throw new TypeError('SHA-256 calculation failed');
  return hashed.sha256;
};

const valueAtPointer = (value, pointer) => pointer.split('/').slice(1).reduce(
  (current, key) => current?.[key],
  value,
);

export function validatePresentationInstructionRendererJobV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'jobId', 'attemptId', 'instructionArtifactBinding',
    'lineEndProjectionBinding',
    'cropAppliedBaseMedia', 'executionInputs', 'registryBindings',
    'runtimeBindings', 'rendererImplementationBindings',
    'approvedContractBindings', 'publication',
  ]) || value.schemaVersion !== PRESENTATION_INSTRUCTION_RENDERER_JOB_SCHEMA_V001
    || !FORMAL_ID.test(value.jobId)
    || !FORMAL_ID.test(value.attemptId)
    || !formalBinding(value.instructionArtifactBinding)
    || value.instructionArtifactBinding.schemaVersion
      !== PRESENTATION_INSTRUCTION_ARTIFACT_SCHEMA_V001
    || !(value.lineEndProjectionBinding === null
      || (formalBinding(value.lineEndProjectionBinding)
        && value.lineEndProjectionBinding.schemaVersion
          === PRESENTATION_SEMANTIC_LINE_END_PROJECTION_SCHEMA_V001))
    || !exactKeys(value.cropAppliedBaseMedia, [
      'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
    ])
    || !byteBinding(value.cropAppliedBaseMedia.baseMedia)
    || !formalBinding(value.cropAppliedBaseMedia.timeline)
    || !formalBinding(value.cropAppliedBaseMedia.generationManifest)
    || !formalBinding(value.cropAppliedBaseMedia.validationReceipt)
    || !exactKeys(value.executionInputs, [
      'format', 'canvas', 'screenLayoutId', 'visualStateId', 'cropPolicy',
      'sceneTransitionPolicy', 'audioPolicy', 'lineLayoutRules',
    ])
    || !nonempty(value.executionInputs.format)
    || !exactKeys(value.executionInputs.canvas, ['width', 'height', 'fps'])
    || !positive(value.executionInputs.canvas.width)
    || !positive(value.executionInputs.canvas.height)
    || !positive(value.executionInputs.canvas.fps)
    || !(value.executionInputs.screenLayoutId === null
      || FORMAL_ID.test(value.executionInputs.screenLayoutId))
    || !FORMAL_ID.test(value.executionInputs.visualStateId)
    || !exactKeys(value.executionInputs.cropPolicy, ['mode'])
    || value.executionInputs.cropPolicy.mode !== 'already-applied'
    || !exactKeys(value.executionInputs.sceneTransitionPolicy, ['mode'])
    || value.executionInputs.sceneTransitionPolicy.mode !== 'straight-cut'
    || !exactKeys(value.executionInputs.audioPolicy, ['mode'])
    || value.executionInputs.audioPolicy.mode !== 'preserve-source'
    || !exactKeys(value.executionInputs.lineLayoutRules, ['speech-caption', 'title'])
    || value.executionInputs.lineLayoutRules['speech-caption']
      !== 'semantic-line-end-projection-v001'
    || value.executionInputs.lineLayoutRules.title !== 'greedy-code-point-v001'
    || !exactKeys(value.registryBindings, [
      'styleProfileRegistry', 'materialRegistry', 'fontLedger', 'rendererTrust',
    ])
    || !formalBinding(value.registryBindings.styleProfileRegistry)
    || !formalBinding(value.registryBindings.materialRegistry)
    || !fontLedgerBinding(value.registryBindings.fontLedger)
    || !formalBinding(value.registryBindings.rendererTrust)
    || !runtimeBindingSet(value.runtimeBindings)
    || value.registryBindings.fontLedger.path !== value.registryBindings.rendererTrust.path
    || value.registryBindings.fontLedger.fileSha256
      !== value.registryBindings.rendererTrust.fileSha256
    || value.registryBindings.fontLedger.canonicalSha256
      !== value.registryBindings.rendererTrust.canonicalSha256
    || !dense(value.rendererImplementationBindings)
    || value.rendererImplementationBindings.length < 1
    || !value.rendererImplementationBindings.every(roleBinding)
    || new Set(value.rendererImplementationBindings.map(row => row.role)).size
      !== value.rendererImplementationBindings.length
    || !dense(value.approvedContractBindings)
    || value.approvedContractBindings.length < 1
    || !value.approvedContractBindings.every(roleBinding)
    || new Set(value.approvedContractBindings.map(row => row.role)).size
      !== value.approvedContractBindings.length
    || !exactKeys(value.publication, [
      'admissionReceiptPath', 'lineLayoutPath', 'renderOutputRoot',
    ])
    || !WORKSPACE_PATH.test(value.publication.admissionReceiptPath)
    || !WORKSPACE_PATH.test(value.publication.lineLayoutPath)
    || !WORKSPACE_PATH.test(value.publication.renderOutputRoot)
    || new Set(Object.values(value.publication)).size !== 3) {
    return rejected('RENDER_ADMISSION_INPUT_INVALID', '/');
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

export const serializePresentationInstructionRendererJobV001 = value => {
  const validation = validatePresentationInstructionRendererJobV001(value);
  if (validation.status !== 'passed') throw new TypeError('instruction renderer job is invalid');
  return formalBytes(value);
};

export function decodePresentationInstructionRendererJobV001(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    if (!formalBytes(value).equals(bytes)
      || validatePresentationInstructionRendererJobV001(value).status !== 'passed') {
      return Object.freeze({status: 'rejected', reason: 'schema-invalid'});
    }
    return Object.freeze({status: 'decoded', value});
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
}

const findProfile = (registry, profileId) => {
  const rows = dense(registry?.presets)
    ? registry.presets
    : dense(registry?.profiles) ? registry.profiles : [];
  return rows.filter(row => row?.presetId === profileId || row?.profileId === profileId);
};

const findVisualState = (profile, visualStateId) => {
  const rows = isObject(profile?.visualState)
    ? [profile.visualState]
    : dense(profile?.visualStates) ? profile.visualStates : [];
  return rows.filter(row => row?.stateId === visualStateId);
};

export function inspectPresentationRendererAdmissionV001({
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
}) {
  const jobValidation = validatePresentationInstructionRendererJobV001(job);
  if (jobValidation.status !== 'passed') return jobValidation;
  if (validatePresentationInstructionArtifactV001(instructionArtifact, {
    meaningPackage,
    timeline: instructionArtifact.artifactKind === 'caption' ? timeline : null,
    cueEndProjection: instructionArtifact.artifactKind === 'caption' ? cueEndProjection : null,
  }).status !== 'passed') {
    return rejected('RENDER_ADMISSION_BINDING_MISMATCH', '/instructionArtifactBinding');
  }
  if (instructionArtifact.artifactKind === 'caption') {
    if (cueEndProjection?.schemaVersion !== 'presentation-cue-end-projection-v001'
      || job.lineEndProjectionBinding === null
      || lineEndProjection?.schemaVersion
        !== PRESENTATION_SEMANTIC_LINE_END_PROJECTION_SCHEMA_V001
      || !same(lineEndProjection.cueEndProjectionBinding,
        instructionArtifact.sourceBindings.cueEndProjection)
      || validatePresentationSemanticLineEndProjectionV001(
        lineEndProjection,
        {sourcePackage: lineEndSourcePackage, cueEndProjection},
      ).status !== 'passed'
      || timeline?.schemaVersion !== job.cropAppliedBaseMedia.timeline.schemaVersion
      || !same(instructionArtifact.sourceBindings.timeline, job.cropAppliedBaseMedia.timeline)) {
      return rejected('RENDER_ADMISSION_BINDING_MISMATCH', '/cropAppliedBaseMedia/timeline');
    }
  } else if (job.lineEndProjectionBinding !== null
    || lineEndProjection !== null
    || lineEndSourcePackage !== null) {
    return rejected('RENDER_ADMISSION_BINDING_MISMATCH', '/lineEndProjectionBinding');
  }
  if (!byteBinding(job.cropAppliedBaseMedia.baseMedia)
    || !formalBinding(job.cropAppliedBaseMedia.generationManifest)
    || !formalBinding(job.cropAppliedBaseMedia.validationReceipt)
    || !inspectedMedia(mediaInspection)
    || !same(job.cropAppliedBaseMedia.baseMedia, {
      path: mediaInspection.path,
      fileSha256: mediaInspection.fileSha256,
    })
    || instructionArtifact.instructions.some(
      row => row.outputTime.endFrameExclusive > mediaInspection.frameCount,
    )) {
    return rejected('RENDER_ADMISSION_MEDIA_INVALID', '/cropAppliedBaseMedia');
  }
  const profiles = findProfile(styleProfileRegistry, instructionArtifact.styleProfileId);
  const selectedProfile = profiles.length === 1 ? profiles[0] : null;
  const selectedVisualStates = selectedProfile === null
    ? []
    : findVisualState(selectedProfile, job.executionInputs.visualStateId);
  const registryCanvas = isObject(styleProfileRegistry?.canvas)
    ? styleProfileRegistry.canvas
    : selectedProfile?.canvas;
  const registryFormat = nonempty(styleProfileRegistry?.format)
    ? styleProfileRegistry.format
    : selectedProfile?.format;
  if (job.executionInputs.canvas.width !== mediaInspection.width
    || job.executionInputs.canvas.height !== mediaInspection.height
    || job.executionInputs.canvas.fps !== mediaInspection.fps
    || !same(registryCanvas, {
      width: job.executionInputs.canvas.width,
      height: job.executionInputs.canvas.height,
      fps: job.executionInputs.canvas.fps,
      ...(isObject(registryCanvas?.safeAreaPx)
        ? {safeAreaPx: registryCanvas.safeAreaPx}
        : {}),
    })
    || registryFormat !== job.executionInputs.format) {
    return rejected('RENDER_ADMISSION_CANVAS_FORMAT_INVALID', '/executionInputs');
  }
  if (selectedProfile === null || selectedProfile.format !== job.executionInputs.format
    || selectedVisualStates.length !== 1) {
    return rejected('RENDER_ADMISSION_STYLE_INVALID', '/registryBindings/styleProfileRegistry');
  }
  const materialIds = new Set(
    (materialRegistry?.materials ?? materialRegistry?.entries ?? []).map(
      row => row.materialId ?? row.id,
    ),
  );
  const usedMaterials = instructionArtifact.instructions.flatMap(row => row.materialRefs);
  if (usedMaterials.some(id => !materialIds.has(id))) {
    return rejected('RENDER_ADMISSION_MATERIAL_INVALID', '/registryBindings/materialRegistry');
  }
  if (!isObject(rendererTrust)
    || !dense(rendererTrust.fontAssets)
    || !dense(fontAssetInspections)
    || !rendererTrust.fontAssets.every(trustedFontAsset)
    || !fontAssetInspections.every(inspectedFile)
    || !same(rendererTrust.fontAssets.map(({path: assetPath, fileSha256}) => ({
      path: assetPath,
      fileSha256,
    })), fontAssetInspections)
    || canonicalHash(rendererTrust.fontAssets)
      !== job.registryBindings.fontLedger.valueCanonicalSha256) {
    return rejected('RENDER_ADMISSION_FONT_INVALID', '/registryBindings/fontLedger');
  }
  if (rendererTrust.schemaVersion !== job.registryBindings.rendererTrust.schemaVersion
    || !isObject(rendererTrust.layoutRules)
    || !isObject(rendererTrust.toolVersions)
    || Object.keys(rendererTrust.toolVersions).length === 0
    || !dense(rendererTrust.rendererDependencies)
    || !dense(rendererDependencyInspections)
    || !rendererTrust.rendererDependencies.every(inspectedFile)
    || !rendererDependencyInspections.every(inspectedFile)
    || !same(rendererTrust.rendererDependencies, rendererDependencyInspections)
    || (instructionArtifact.artifactKind === 'caption' && (
      rendererTrust.presetRegistry?.path
        !== job.registryBindings.styleProfileRegistry.path
      || rendererTrust.presetRegistry?.fileSha256
        !== job.registryBindings.styleProfileRegistry.fileSha256
      || rendererTrust.presetRegistry?.canonicalSha256
        !== job.registryBindings.styleProfileRegistry.canonicalSha256
    ))) {
    return rejected('RENDER_ADMISSION_TRUST_INVALID', '/registryBindings/rendererTrust');
  }
  if (!same(job.rendererImplementationBindings, observedImplementationBindings)) {
    return rejected('RENDER_ADMISSION_IMPLEMENTATION_INVALID', '/rendererImplementationBindings');
  }
  if (!runtimeBindingSet(observedRuntimeBindings)
    || !same(job.runtimeBindings, observedRuntimeBindings)) {
    return rejected('RENDER_ADMISSION_IMPLEMENTATION_INVALID', '/runtimeBindings');
  }
  if (outputPathsUnused !== true) {
    return rejected('RENDER_ADMISSION_EXECUTION_INPUT_INVALID', '/publication');
  }
  return Object.freeze({
    status: 'accepted',
    profile: selectedProfile,
    checks: Object.freeze(PRESENTATION_RENDERER_ADMISSION_CHECKS_V001.map(checkId => Object.freeze({
      checkId,
      status: 'passed',
    }))),
  });
}

export function buildPresentationRendererAdmissionReceiptV001({
  job,
  rendererJobBinding,
  instructionArtifact,
  checks,
}) {
  if (validatePresentationInstructionRendererJobV001(job).status !== 'passed'
    || !formalBinding(rendererJobBinding)
    || rendererJobBinding.schemaVersion !== PRESENTATION_INSTRUCTION_RENDERER_JOB_SCHEMA_V001
    || !same(checks, PRESENTATION_RENDERER_ADMISSION_CHECKS_V001.map(checkId => ({
      checkId,
      status: 'passed',
    })))) {
    return rejected('RENDER_ADMISSION_INPUT_INVALID', '/');
  }
  const executionInputBindings = PRESENTATION_RENDERER_EXECUTION_POINTERS_V001.map(
    jsonPointer => Object.freeze({
      ownerJobBinding: clone(rendererJobBinding),
      jsonPointer,
      valueCanonicalSha256: canonicalHash(valueAtPointer(job, jsonPointer)),
    }),
  );
  const receipt = Object.freeze({
    schemaVersion: PRESENTATION_RENDERER_ADMISSION_RECEIPT_SCHEMA_V001,
    receiptId: `${job.jobId}-admission-receipt-v001`,
    status: 'accepted',
    rendererJobBinding: clone(rendererJobBinding),
    instructionArtifactBinding: clone(job.instructionArtifactBinding),
    lineEndProjectionBinding: clone(job.lineEndProjectionBinding),
    instructionSourceBindings: Object.freeze({
      meaningInformationPackage: clone(
        instructionArtifact.sourceBindings.meaningInformationPackage,
      ),
      timeline: clone(instructionArtifact.sourceBindings.timeline),
      cueEndProjection: clone(instructionArtifact.sourceBindings.cueEndProjection),
    }),
    cropAppliedBaseMediaBinding: clone(job.cropAppliedBaseMedia),
    canvasFormatBinding: Object.freeze({
      ownerJobBinding: clone(rendererJobBinding),
      jsonPointer: '/executionInputs',
      valueCanonicalSha256: canonicalHash(job.executionInputs),
    }),
    styleProfileRegistryBinding: clone(job.registryBindings.styleProfileRegistry),
    visualStateId: job.executionInputs.visualStateId,
    materialRegistryBinding: clone(job.registryBindings.materialRegistry),
    fontLedgerBinding: clone(job.registryBindings.fontLedger),
    rendererTrustBinding: clone(job.registryBindings.rendererTrust),
    runtimeBindings: Object.freeze(clone(job.runtimeBindings)),
    rendererImplementationBindings: Object.freeze(clone(job.rendererImplementationBindings)),
    executionInputBindings: Object.freeze(executionInputBindings),
    checks: Object.freeze(clone(checks)),
  });
  const validation = validatePresentationRendererAdmissionReceiptV001(receipt, {job});
  return validation.status === 'passed'
    ? Object.freeze({status: 'built', receipt})
    : validation;
}

export function validatePresentationRendererAdmissionReceiptV001(
  value,
  {job = null} = {},
) {
  if (!exactKeys(value, [
    'schemaVersion', 'receiptId', 'status', 'rendererJobBinding',
    'instructionArtifactBinding', 'lineEndProjectionBinding', 'instructionSourceBindings',
    'cropAppliedBaseMediaBinding', 'canvasFormatBinding',
    'styleProfileRegistryBinding', 'visualStateId',
    'materialRegistryBinding', 'fontLedgerBinding',
    'rendererTrustBinding', 'runtimeBindings', 'rendererImplementationBindings',
    'executionInputBindings', 'checks',
  ]) || value.schemaVersion !== PRESENTATION_RENDERER_ADMISSION_RECEIPT_SCHEMA_V001
    || !FORMAL_ID.test(value.receiptId)
    || value.status !== 'accepted'
    || !formalBinding(value.rendererJobBinding)
    || !formalBinding(value.instructionArtifactBinding)
    || !(value.lineEndProjectionBinding === null
      || (formalBinding(value.lineEndProjectionBinding)
        && value.lineEndProjectionBinding.schemaVersion
          === PRESENTATION_SEMANTIC_LINE_END_PROJECTION_SCHEMA_V001))
    || !exactKeys(value.instructionSourceBindings, [
      'meaningInformationPackage', 'timeline', 'cueEndProjection',
    ])
    || !formalBinding(value.instructionSourceBindings.meaningInformationPackage)
    || !(value.instructionSourceBindings.timeline === null
      || formalBinding(value.instructionSourceBindings.timeline))
    || !(value.instructionSourceBindings.cueEndProjection === null
      || formalBinding(value.instructionSourceBindings.cueEndProjection))
    || !exactKeys(value.cropAppliedBaseMediaBinding, [
      'baseMedia', 'timeline', 'generationManifest', 'validationReceipt',
    ])
    || !byteBinding(value.cropAppliedBaseMediaBinding.baseMedia)
    || !formalBinding(value.cropAppliedBaseMediaBinding.timeline)
    || !formalBinding(value.cropAppliedBaseMediaBinding.generationManifest)
    || !formalBinding(value.cropAppliedBaseMediaBinding.validationReceipt)
    || !ownerValueBinding(value.canvasFormatBinding)
    || !formalBinding(value.styleProfileRegistryBinding)
    || !FORMAL_ID.test(value.visualStateId)
    || !formalBinding(value.materialRegistryBinding)
    || !fontLedgerBinding(value.fontLedgerBinding)
    || !formalBinding(value.rendererTrustBinding)
    || !runtimeBindingSet(value.runtimeBindings)
    || !dense(value.rendererImplementationBindings)
    || !value.rendererImplementationBindings.every(roleBinding)
    || !dense(value.executionInputBindings)
    || value.executionInputBindings.length !== PRESENTATION_RENDERER_EXECUTION_POINTERS_V001.length
    || !value.executionInputBindings.every(ownerValueBinding)
    || !same(value.executionInputBindings.map(row => row.jsonPointer),
      PRESENTATION_RENDERER_EXECUTION_POINTERS_V001)
    || !dense(value.checks)
    || !same(value.checks, PRESENTATION_RENDERER_ADMISSION_CHECKS_V001.map(checkId => ({
      checkId,
      status: 'passed',
    })))) {
    return rejected('RENDER_ADMISSION_INPUT_INVALID', '/');
  }
  if (job !== null) {
    if (validatePresentationInstructionRendererJobV001(job).status !== 'passed'
      || value.receiptId !== `${job.jobId}-admission-receipt-v001`
      || !same(value.instructionArtifactBinding, job.instructionArtifactBinding)
      || !same(value.lineEndProjectionBinding, job.lineEndProjectionBinding)
      || !same(value.cropAppliedBaseMediaBinding, job.cropAppliedBaseMedia)
      || !same(value.styleProfileRegistryBinding, job.registryBindings.styleProfileRegistry)
      || value.visualStateId !== job.executionInputs.visualStateId
      || !same(value.materialRegistryBinding, job.registryBindings.materialRegistry)
      || !same(value.fontLedgerBinding, job.registryBindings.fontLedger)
      || !same(value.rendererTrustBinding, job.registryBindings.rendererTrust)
      || !same(value.runtimeBindings, job.runtimeBindings)
      || !same(value.rendererImplementationBindings, job.rendererImplementationBindings)
      || value.canvasFormatBinding.valueCanonicalSha256 !== canonicalHash(job.executionInputs)
      || value.executionInputBindings.some(row => row.valueCanonicalSha256
        !== canonicalHash(valueAtPointer(job, row.jsonPointer)))) {
      return rejected('RENDER_ADMISSION_BINDING_MISMATCH', '/');
    }
  }
  return Object.freeze({status: 'passed', violations: Object.freeze([])});
}

export const serializePresentationRendererAdmissionReceiptV001 = value => {
  const validation = validatePresentationRendererAdmissionReceiptV001(value);
  if (validation.status !== 'passed') throw new TypeError('renderer admission receipt is invalid');
  return formalBytes(value);
};

export function decodePresentationRendererAdmissionReceiptV001(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    if (!formalBytes(value).equals(bytes)
      || validatePresentationRendererAdmissionReceiptV001(value).status !== 'passed') {
      return Object.freeze({status: 'rejected', reason: 'schema-invalid'});
    }
    return Object.freeze({status: 'decoded', value});
  } catch {
    return Object.freeze({status: 'rejected', reason: 'json-byte-invalid'});
  }
}

export async function publishPresentationRendererAdmissionReceiptNoReplaceV001({
  workspaceRoot,
  stagingPath,
  outputPath,
  receipt,
}) {
  if (typeof workspaceRoot !== 'string'
    || !WORKSPACE_PATH.test(stagingPath)
    || !WORKSPACE_PATH.test(outputPath)
    || stagingPath === outputPath
    || validatePresentationRendererAdmissionReceiptV001(receipt).status !== 'passed') {
    return rejected('RENDER_ADMISSION_PUBLICATION_FAILED', '/publication/admissionReceiptPath');
  }
  const root = path.resolve(workspaceRoot);
  const stagingAbsolute = path.resolve(root, stagingPath);
  const outputAbsolute = path.resolve(root, outputPath);
  let handle = null;
  let linked = false;
  try {
    if (await realpath(root) !== root
      || path.dirname(stagingAbsolute) !== path.dirname(outputAbsolute)
      || await realpath(path.dirname(outputAbsolute)) !== path.dirname(outputAbsolute)) {
      throw new Error('publication-topology-invalid');
    }
    const bytes = serializePresentationRendererAdmissionReceiptV001(receipt);
    handle = await open(stagingAbsolute, fsConstants.O_CREAT | fsConstants.O_EXCL
      | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o444);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    const staged = await lstat(stagingAbsolute);
    if (!staged.isFile() || staged.isSymbolicLink()) throw new Error('staging-invalid');
    await link(stagingAbsolute, outputAbsolute);
    linked = true;
    const published = await lstat(outputAbsolute);
    const [first, second] = await Promise.all([
      readFile(outputAbsolute),
      readFile(outputAbsolute),
    ]);
    if (!published.isFile() || published.isSymbolicLink()
      || !first.equals(bytes) || !second.equals(bytes)
      || decodePresentationRendererAdmissionReceiptV001(first).status !== 'decoded') {
      throw new Error('published-receipt-invalid');
    }
    await unlink(stagingAbsolute);
    return Object.freeze({
      status: 'published',
      outputPath,
      fileSha256: sha256PresentationCaptionB1BytesV001(first).sha256,
    });
  } catch {
    if (handle !== null) {
      try { await handle.close(); } catch {}
    }
    if (!linked) {
      try { await unlink(stagingAbsolute); } catch {}
    }
    return rejected('RENDER_ADMISSION_PUBLICATION_FAILED', '/publication/admissionReceiptPath');
  }
}
