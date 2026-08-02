import {
  assertPresentationCaptionB1StrictValueV001,
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  buildPresentationCaptionSemanticCompilerInputV001,
} from './presentation_caption_semantic_output_v001.mjs';
import {
  validatePresentationInstructionContractV003,
} from './presentation_instruction_contract_v003.mjs';
import {
  mapPresentationSourceIntervalV002,
  validatePresentationBaseMediaTimelineV002,
} from './presentation_base_media_timeline_v002.mjs';
import {
  codePointWeightV001,
  indexExplicitLinesV001,
  validateIndexedLinesV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  normalizeSourceAtomSpeakerForPackage,
  SOURCE_SPEAKER_NORMALIZATION_SCHEMA_VERSION,
  SOURCE_SPEAKER_NORMALIZER_VERSION,
  SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256,
  SOURCE_SPEAKER_REGISTRY_VERSION,
} from './presentation_source_speaker_policy_v001.mjs';

export const PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001 = Object.freeze([
  'CAPTION_B4_JOB_INVALID',
  'JOB_FILE_MISMATCH',
  'IMPLEMENTATION_MISMATCH',
  'INPUT_PATH_UNSAFE',
  'INPUT_FILE_SET_INVALID',
  'INPUT_HASH_MISMATCH',
  'INPUT_SCHEMA_UNSUPPORTED',
  'RUNTIME_MISMATCH',
  'SEMANTIC_REPORT_NOT_PASSED',
  'SEMANTIC_COMPILER_INPUT_NOT_AVAILABLE',
  'SEMANTIC_BINDING_MISMATCH',
  'SEMANTIC_COMPILER_REBUILD_FAILED',
  'SEMANTIC_COMPILER_HASH_MISMATCH',
  'COMPILER_INPUT_SCHEMA_INVALID',
  'COMPILER_CONTAINER_SET_INVALID',
  'COMPILER_MEANING_GROUP_INVALID',
  'COMPILER_LINE_INVALID',
  'COMPILER_ATOM_COVERAGE_INVALID',
  'COMPILER_TEXT_MISMATCH',
  'COMPILER_ANCHOR_MISMATCH',
  'SOURCE_PACKAGE_BINDING_MISMATCH',
  'SOURCE_ATOM_SCHEMA_INVALID',
  'SOURCE_ATOM_ID_DUPLICATE',
  'SOURCE_ATOM_TIME_INVALID',
  'SOURCE_ATOM_SPEAKER_INVALID',
  'SOURCE_ATOM_COVERAGE_INVALID',
  'SOURCE_ATOM_ORDER_INVALID',
  'TIMELINE_BINDING_MISMATCH',
  'TIMELINE_SEGMENT_INVALID',
  'TIMELINE_MAPPING_FAILED',
  'CUE_ID_INVALID',
  'CUE_MAPPING_INVALID',
  'CUE_LINE_COUNT_INVALID',
  'CUE_LINE_WIDTH_EXCEEDED',
  'CUE_TEXT_MISMATCH',
  'CUE_ANCHOR_MISMATCH',
  'CUE_SOURCE_TIME_INVALID',
  'CUE_TIMELINE_SEGMENT_CROSSED',
  'CUE_ORDER_REVERSED',
  'CUE_UNDECLARED_OVERLAP',
  'TARGET_ID_INVALID',
  'TARGET_MAPPING_INVALID',
  'TARGET_ATOM_MISSING',
  'TARGET_ATOM_DUPLICATED',
  'TARGET_ATOM_ORDER_REVERSED',
  'TARGET_OMISSION_NOT_EMPTY',
  'INSTRUCTION_ID_INVALID',
  'INSTRUCTION_MAPPING_INVALID',
  'INSTRUCTION_KIND_INVALID',
  'INSTRUCTION_PRESET_INVALID',
  'INSTRUCTION_MATERIAL_NOT_EMPTY',
  'INSTRUCTION_TRIGGER_MISMATCH',
  'CAPTION_CONTRACT_SCHEMA_INVALID',
  'G1_G3_CHECK_FAILED',
  'G2_DECLARED_LIMIT_MISSING',
  'LAYOUT_PREFLIGHT_FAILED',
  'REVIEW_STATE_INVALID',
  'REVIEW_RENDER_REQUEST_INVALID',
  'PAIR_BINDING_MISMATCH',
  'BUILD_FAILED',
  'NONDETERMINISTIC',
  'READ_ONLY_CONTRACT_VIOLATED',
  'OUTPUT_ROOT_ALREADY_EXISTS',
  'PUBLICATION_LOCK_UNAVAILABLE',
  'PUBLICATION_STAGING_INVALID',
  'PUBLICATION_INPUT_CHANGED',
  'PUBLICATION_FAILED',
  'PUBLISHED_PAIR_INVALID',
  'PUBLICATION_PRE_RENAME_INVALID',
]);

const CODE_INDEX = new Map(
  PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001.map((code, index) => [code, index]),
);
const CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'semanticSeam',
  'sourceAtoms',
  'timeline',
  'displayPlan',
  'resolutionPackage',
  'instructionBundle',
  'captionG1G3',
  'layoutPreflight',
  'reviewState',
  'reviewRenderRequest',
  'determinism',
  'readOnlyCheck',
  'publication',
]);
const VIOLATION_OWNER_CHECKS_V001 = Object.freeze([
  'jobBinding',
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'inputBinding',
  'inputBinding',
  'inputBinding',
  'runtimeBinding',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'semanticSeam',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'sourceAtoms',
  'timeline',
  'timeline',
  'timeline',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'displayPlan',
  'resolutionPackage',
  'resolutionPackage',
  'resolutionPackage',
  'resolutionPackage',
  'resolutionPackage',
  'resolutionPackage',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'instructionBundle',
  'captionG1G3',
  'captionG1G3',
  'layoutPreflight',
  'reviewState',
  'reviewRenderRequest',
  'reviewRenderRequest',
  'build-stage-dependent',
  'determinism',
  'readOnlyCheck',
  'publication',
  'publication',
  'publication',
  'publication',
  'publication',
  'publication',
  'publication',
]);
if (VIOLATION_OWNER_CHECKS_V001.length !== PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001.length) {
  throw new TypeError('violation ownership table incomplete');
}
const VIOLATION_OWNER_BY_CODE_V001 = new Map(
  PRESENTATION_CAPTION_B4_VIOLATION_CODES_V001.map(
    (code, index) => [code, VIOLATION_OWNER_CHECKS_V001[index]],
  ),
);
const BUILD_STAGE_OWNER_CHECK_V001 = Object.freeze({
  'semantic-compiler-rebuild': 'semanticSeam',
  'display-plan-build': 'displayPlan',
  'resolution-package-build': 'resolutionPackage',
  'instruction-bundle-build': 'instructionBundle',
  'caption-check-build': 'captionG1G3',
  'layout-inspection': 'layoutPreflight',
  'review-request-build': 'reviewRenderRequest',
  'pair-manifest-build': 'reviewRenderRequest',
  'pair-report-build': 'reviewRenderRequest',
});
const ownerCheckForViolationV001 = (entry) => {
  const owner = VIOLATION_OWNER_BY_CODE_V001.get(entry?.code);
  if (owner === 'build-stage-dependent') {
    return BUILD_STAGE_OWNER_CHECK_V001[entry?.details?.stage] ?? null;
  }
  return CHECK_NAMES.includes(owner) ? owner : null;
};
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ID6 = /^[0-9]{6}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/).+$/;
const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const isString = (value) => typeof value === 'string';
const isNonEmptyString = (value) => isString(value) && value.length > 0;
const isSafeInteger = (value) => Number.isSafeInteger(value);
const isCount = (value) => isSafeInteger(value) && value >= 0;
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const sameArray = (left, right) => Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((value, index) => value === right[index]);
const safePath = (value) => isNonEmptyString(value)
  && SAFE_PATH.test(value)
  && !value.startsWith('./')
  && !value.includes('\0');
const clone = (value) => structuredClone(value);

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  return result?.status === 'serialized' ? result.bytes : null;
};
const canonicalBytes = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  return result?.status === 'canonicalized' ? result.bytes : null;
};
const hashBytes = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  return result?.status === 'hashed' ? result.sha256 : null;
};
const canonicalSha = (value) => {
  const bytes = canonicalBytes(value);
  return bytes ? hashBytes(bytes) : null;
};
const sameJson = (left, right) => {
  const a = canonicalBytes(left);
  const b = canonicalBytes(right);
  return Buffer.isBuffer(a) && Buffer.isBuffer(b) && a.equals(b);
};
const decodeSnapshot = (input) => {
  if (!isObject(input?.snapshot) || !Buffer.isBuffer(input.snapshot.bytes)) return null;
  const result = decodePresentationCaptionB1StrictJsonV001(input.snapshot.bytes);
  return result?.status === 'decoded' ? result.value : null;
};
const bindingFor = (input, value, binary = false) => {
  const base = {
    path: input.path,
    fileSha256: input.snapshot.fileSha256,
  };
  return binary ? base : {...base, canonicalSha256: canonicalSha(value)};
};
const makeArtifact = (role, fileName, schemaVersion, value) => {
  const bytes = formalBytes(value);
  if (!bytes) throw new TypeError('artifact serialization failed');
  return {
    role,
    fileName,
    schemaVersion,
    value,
    bytes,
    fileSha256: hashBytes(bytes),
    canonicalSha256: canonicalSha(value),
  };
};
const byRole = (values) => new Map((values ?? []).map((entry) => [entry.role, entry]));
const flattenCues = (displayPlan) => displayPlan.containers.flatMap((container) => container.cues);
const suffix = (ordinal) => String(ordinal).padStart(6, '0');
const violation = (code, path, details = {}) => ({code, path, details});
const sortViolations = (values) => {
  const seen = new Set();
  return values
    .filter((entry) => {
      const key = `${entry.code}\u0000${entry.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (
      (CODE_INDEX.get(left.code) ?? 999) - (CODE_INDEX.get(right.code) ?? 999)
      || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
      || ((canonicalSha(left.details) ?? '') < (canonicalSha(right.details) ?? '') ? -1 : 1)
    ));
};

const validHashRef = (value, canonical = true) => exactKeys(
  value,
  canonical ? ['path', 'fileSha256', 'canonicalSha256'] : ['path', 'fileSha256'],
) && safePath(value.path)
  && SHA256.test(value.fileSha256)
  && (!canonical || SHA256.test(value.canonicalSha256));
const validImplementationBinding = (value, preflight = false) => (
  exactKeys(value, ['gitCommit', 'files', 'dependencyFiles'])
  && /^[0-9a-f]{40}$/.test(value.gitCommit)
  && Array.isArray(value.files)
  && value.files.length === 2
  && sameArray(
    value.files.map((entry) => entry.role),
    preflight
      ? ['displayPairCore', 'displayPairPreflightRunner']
      : ['displayPairCore', 'displayPairRunner'],
  )
  && Array.isArray(value.dependencyFiles)
  && sameArray(value.dependencyFiles.map((entry) => entry.role), [
    'semanticCore',
    'semanticRunner',
    'captionCoreV003',
    'instructionCoreV003',
    'sourceSpeakerPolicy',
    'timelineV002',
    'layoutPreflightCore',
    'rendererLayoutCore',
    'presetRegistry',
    'presetValidationIndex',
    'materialValidationIndex',
    'trustedRegistryBindings',
    'sharedJsonContractCore',
  ])
  && [...value.files, ...value.dependencyFiles].every((entry) =>
    exactKeys(entry, ['role', 'path', 'fileSha256'])
    && safePath(entry.path)
    && SHA256.test(entry.fileSha256))
  && sameArray(
    value.files.map((entry) => entry.path),
    preflight
      ? [
        'evals/clip_composition/presentation_caption_display_pair_v003.mjs',
        'evals/clip_composition/run_presentation_caption_display_pair_static_preflight_v001.mjs',
      ]
      : [
        'evals/clip_composition/presentation_caption_display_pair_v003.mjs',
        'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs',
      ],
  )
  && sameArray(value.dependencyFiles.map((entry) => entry.path), [
    'evals/clip_composition/presentation_caption_semantic_output_v001.mjs',
    'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs',
    'evals/clip_composition/presentation_caption_contract_v003.mjs',
    'evals/clip_composition/presentation_instruction_contract_v003.mjs',
    'evals/clip_composition/presentation_source_speaker_policy_v001.mjs',
    'evals/clip_composition/presentation_base_media_timeline_v002.mjs',
    'evals/clip_composition/inspect_presentation_preset_layout.ts',
    'runner/src/telop/telop-render-model.ts',
    'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json',
    'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-validation-index.json',
    'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/material-validation-index.json',
    'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/trusted-registry-bindings.json',
    'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
  ])
);
const validExpectedRuntime = (value) => exactKeys(value, [
  'resolvedNodePath',
  'nodeBinarySha256',
  'nodeVersion',
  'icuVersion',
  'resolvedLocale',
  'resolvedGranularity',
  'layoutExecutionBinding',
])
  && isNonEmptyString(value.resolvedNodePath)
  && SHA256.test(value.nodeBinarySha256)
  && ['nodeVersion', 'icuVersion', 'resolvedLocale', 'resolvedGranularity']
    .every((field) => isNonEmptyString(value[field]))
  && isObject(value.layoutExecutionBinding);
const validReadOnlyGuard = (value, preflight = false) => exactKeys(value, [
  'watchedRoot',
  'excludedPaths',
  'allowedWritePaths',
  'expectedBeforeCanonicalSha256',
])
  && safePath(value.watchedRoot)
  && Array.isArray(value.excludedPaths)
  && value.excludedPaths.length === 1
  && value.excludedPaths.every(safePath)
  && Array.isArray(value.allowedWritePaths)
  && value.allowedWritePaths.length === (preflight ? 0 : 3)
  && value.allowedWritePaths.every(safePath)
  && SHA256.test(value.expectedBeforeCanonicalSha256);
const bindingAt = (binding, rootPath, fileName, canonical = true) =>
  validHashRef(binding, canonical) && binding.path === `${rootPath}/${fileName}`;
const validSourcePackageBinding = (value) => exactKeys(value, [
  'rootPath',
  'manifest',
  'validationReport',
])
  && safePath(value.rootPath)
  && bindingAt(value.manifest, value.rootPath, 'package-manifest.json')
  && bindingAt(value.validationReport, value.rootPath, 'package-validation-report.json');
const validSemanticCheckBinding = (value) => exactKeys(value, [
  'job',
  'rawSemanticOutput',
  'validationReport',
  'expectedCompilerInputObservedByteSha256',
  'expectedCompilerInputCanonicalSha256',
])
  && validHashRef(value.job)
  && validHashRef(value.rawSemanticOutput)
  && validHashRef(value.validationReport)
  && SHA256.test(value.expectedCompilerInputObservedByteSha256)
  && SHA256.test(value.expectedCompilerInputCanonicalSha256);
const validRetainedSourceBinding = (value) => exactKeys(value, [
  'rootPath',
  'generationManifest',
  'sourceAtoms',
  'validationReport',
])
  && safePath(value.rootPath)
  && bindingAt(value.generationManifest, value.rootPath, 'generation-manifest.json')
  && bindingAt(value.sourceAtoms, value.rootPath, 'source-atoms.json')
  && bindingAt(value.validationReport, value.rootPath, 'validation-report.json');
const validBaseMediaBinding = (value) => exactKeys(value, [
  'rootPath',
  'generationManifest',
  'timeline',
  'validationReport',
  'baseMedia',
])
  && safePath(value.rootPath)
  && bindingAt(value.generationManifest, value.rootPath, 'generation-manifest.json')
  && bindingAt(value.timeline, value.rootPath, 'timeline.json')
  && bindingAt(value.validationReport, value.rootPath, 'validation-report.json')
  && bindingAt(value.baseMedia, value.rootPath, 'base-media.mp4', false);
const validRegistryBinding = (value) => exactKeys(value, [
  'rootPath',
  'trustedRegistryBindings',
  'presetRegistry',
  'presetValidationIndex',
  'materialValidationIndex',
])
  && safePath(value.rootPath)
  && bindingAt(value.trustedRegistryBindings, value.rootPath, 'trusted-registry-bindings.json')
  && bindingAt(value.presetRegistry, value.rootPath, 'preset-registry.json')
  && bindingAt(value.presetValidationIndex, value.rootPath, 'preset-validation-index.json')
  && bindingAt(value.materialValidationIndex, value.rootPath, 'material-validation-index.json');
const validExpectedProjection = (value) => exactKeys(value, [
  'sourceAtomCount',
  'containerCount',
  'boundaryCandidateCount',
  'meaningGroupCount',
  'cueCount',
  'lineCount',
  'timelineSegmentCount',
  'compilerInputObservedByteSha256',
  'compilerInputCanonicalSha256',
])
  && [
    'sourceAtomCount',
    'containerCount',
    'boundaryCandidateCount',
    'meaningGroupCount',
    'cueCount',
    'lineCount',
    'timelineSegmentCount',
  ].every((field) => isCount(value[field]))
  && SHA256.test(value.compilerInputObservedByteSha256)
  && SHA256.test(value.compilerInputCanonicalSha256);
const validExpectedStaticProjection = (value) => exactKeys(value, [
  'sourceAtomCount',
  'containerCount',
  'boundaryCandidateCount',
  'timelineSegmentCount',
  'sourceAtomPositiveOverlapCount',
  'adjacentBoundaryCandidatePositiveOverlapCount',
])
  && Object.values(value).every(isCount);
const validPublication = (value) => exactKeys(value, [
  'pairId',
  'formalOutputPath',
  'lockPath',
  'workPath',
])
  && ID.test(value.pairId)
  && !['.', '..'].includes(value.pairId)
  && safePath(value.formalOutputPath)
  && value.formalOutputPath
    === `evals/clip_composition/outputs/presentation/caption-display-pairs/${value.pairId}`
  && value.lockPath === `${value.formalOutputPath}.lock`
  && value.workPath === `${value.formalOutputPath}.work`;

const validateJob = (value, preflight) => {
  const rootKeys = preflight
    ? [
      'schemaVersion',
      'jobId',
      'artifactId',
      'mode',
      'implementationBinding',
      'sourcePackageBinding',
      'retainedSourceBinding',
      'baseMediaBinding',
      'registryBinding',
      'expectedRuntime',
      'expectedStaticProjection',
      'readOnlyGuard',
    ]
    : [
      'schemaVersion',
      'jobId',
      'artifactId',
      'mode',
      'implementationBinding',
      'sourcePackageBinding',
      'semanticCheckBinding',
      'retainedSourceBinding',
      'baseMediaBinding',
      'registryBinding',
      'expectedRuntime',
      'expectedProjection',
      'publication',
      'readOnlyGuard',
    ];
  if (!exactKeys(value, rootKeys)
    || value.schemaVersion !== (preflight
      ? 'presentation-caption-display-pair-static-preflight-job-v001'
      : 'presentation-caption-display-pair-generation-job-v001')
    || value.mode !== (preflight ? 'read-only-preflight' : 'formal-generation')
    || !ID.test(value.jobId)
    || ['.', '..'].includes(value.jobId)
    || !ID.test(value.artifactId)
    || ['.', '..'].includes(value.artifactId)
    || !validImplementationBinding(value.implementationBinding, preflight)
    || !validExpectedRuntime(value.expectedRuntime)
    || !validReadOnlyGuard(value.readOnlyGuard, preflight)) return {valid: false};
  if (!validSourcePackageBinding(value.sourcePackageBinding)
    || !validRetainedSourceBinding(value.retainedSourceBinding)
    || !validBaseMediaBinding(value.baseMediaBinding)
    || !validRegistryBinding(value.registryBinding)
    || (preflight
      ? !validExpectedStaticProjection(value.expectedStaticProjection)
      : !validSemanticCheckBinding(value.semanticCheckBinding)
        || !validExpectedProjection(value.expectedProjection)
        || !validPublication(value.publication))) return {valid: false};
  return {valid: true};
};

export function validatePresentationCaptionDisplayPairGenerationJobV001(value) {
  return validateJob(value, false);
}

export function validatePresentationCaptionDisplayPairStaticPreflightJobV001(value) {
  return validateJob(value, true);
}

const normalizedAtoms = (retained) => retained.rawSourceAtoms.map((atom) => {
  const normalized = normalizeSourceAtomSpeakerForPackage(atom).atom;
  return {
    atomId: normalized.atomId,
    speechId: normalized.speechId,
    speaker: Object.prototype.hasOwnProperty.call(normalized, 'speaker')
      ? normalized.speaker
      : null,
    text: normalized.text,
    startMs: normalized.startMs,
    endMs: normalized.endMs,
  };
});

export function buildPresentationCaptionDisplayContainersFormatNeutralV003(input) {
  if (!exactKeys(input, ['compilerInput', 'retainedSourceAtoms'])
    || !Array.isArray(input.compilerInput?.containers)
    || !Array.isArray(input.retainedSourceAtoms?.rawSourceAtoms)) {
    throw new TypeError('invalid format-neutral display calculation input');
  }
  const sourceById = new Map(
    normalizedAtoms(input.retainedSourceAtoms).map((atom) => [atom.atomId, atom]),
  );
  let globalCueOrdinal = 0;
  return input.compilerInput.containers.map((container) => ({
    containerId: container.containerId,
    timelineSegmentId: container.timelineSegmentId,
    speechId: container.speechId,
    cues: container.meaningGroups.map((group) => {
      globalCueOrdinal += 1;
      const id = suffix(globalCueOrdinal);
      const lines = group.lines.map((line) => ({
        lineOrdinal: line.lineOrdinal,
        sourceAtomIds: [...line.sourceAtomIds],
        text: line.text,
        startAnchor: clone(line.startAnchor),
        endAnchor: clone(line.endAnchor),
        logicalWidth: line.logicalWidth,
      }));
      const atoms = lines
        .flatMap((line) => line.sourceAtomIds)
        .map((atomId) => sourceById.get(atomId));
      if (atoms.length === 0 || atoms.some((atom) => atom === undefined)) {
        throw new TypeError('display source atom missing');
      }
      return {
        cueId: `caption-cue-${id}`,
        targetRefId: `caption-target-${id}`,
        instructionId: `caption-instruction-${id}`,
        globalCueOrdinal,
        meaningGroupOrdinal: group.meaningGroupOrdinal,
        lines,
        startAnchor: clone(lines[0].startAnchor),
        endAnchor: clone(lines.at(-1).endAnchor),
        sourceStartMs: atoms[0].startMs,
        sourceEndMs: atoms.at(-1).endMs,
      };
    }),
  }));
}

const buildDisplayPlan = ({
  job,
  compilerInput,
  retained,
  timeline,
  sourcePackage,
  semantic,
  retainedInputs,
  baseInputs,
  registryInputs,
}) => {
  const containers = buildPresentationCaptionDisplayContainersFormatNeutralV003({
    compilerInput,
    retainedSourceAtoms: retained,
  });
  const sourcePackageByRole = byRole(sourcePackage);
  const semanticByRole = byRole(semantic);
  const retainedByRole = byRole(retainedInputs);
  const baseByRole = byRole(baseInputs);
  const registryByRole = byRole(registryInputs);
  return {
    schemaVersion: 'presentation-caption-display-plan-v001',
    displayPlanId: `${job.publication.pairId}-display-plan`,
    artifactId: job.artifactId,
    sourceProvenance: retained.sourceProvenance,
    atomGranularity: retained.atomGranularity,
    semanticCompilerInputBinding: {
      validationReport: bindingFor(
        semanticByRole.get('validationReport'),
        decodeSnapshot(semanticByRole.get('validationReport')),
      ),
      rawSemanticOutput: bindingFor(
        semanticByRole.get('rawSemanticOutput'),
        decodeSnapshot(semanticByRole.get('rawSemanticOutput')),
      ),
      compilerInputObservedByteSha256: hashBytes(formalBytes(compilerInput)),
      compilerInputCanonicalSha256: canonicalSha(compilerInput),
    },
    sourceAtomBinding: {
      generationManifest: bindingFor(
        retainedByRole.get('generationManifest'),
        decodeSnapshot(retainedByRole.get('generationManifest')),
      ),
      sourceAtoms: bindingFor(retainedByRole.get('sourceAtoms'), retained),
      validationReport: bindingFor(
        retainedByRole.get('validationReport'),
        decodeSnapshot(retainedByRole.get('validationReport')),
      ),
      rawSourceAtomsCanonicalSha256: retained.rawSourceAtomsCanonicalSha256,
    },
    timelineBinding: {
      generationManifest: bindingFor(
        baseByRole.get('generationManifest'),
        decodeSnapshot(baseByRole.get('generationManifest')),
      ),
      timeline: bindingFor(baseByRole.get('timeline'), timeline),
      validationReport: bindingFor(
        baseByRole.get('validationReport'),
        decodeSnapshot(baseByRole.get('validationReport')),
      ),
      baseMedia: bindingFor(baseByRole.get('baseMedia'), null, true),
    },
    presetBinding: {
      trustedRegistryBindings: bindingFor(
        registryByRole.get('trustedRegistryBindings'),
        decodeSnapshot(registryByRole.get('trustedRegistryBindings')),
      ),
      presetRegistry: bindingFor(
        registryByRole.get('presetRegistry'),
        decodeSnapshot(registryByRole.get('presetRegistry')),
      ),
      presetValidationIndex: bindingFor(
        registryByRole.get('presetValidationIndex'),
        decodeSnapshot(registryByRole.get('presetValidationIndex')),
      ),
      materialValidationIndex: bindingFor(
        registryByRole.get('materialValidationIndex'),
        decodeSnapshot(registryByRole.get('materialValidationIndex')),
      ),
      presetId: 'normal-landscape-readable-pop-v001',
    },
    containers,
  };
};

const buildInstructionBundle = ({
  job,
  displayPlanArtifact,
  retained,
  registryValues,
}) => {
  const displayPlan = displayPlanArtifact.value;
  const cues = flattenCues(displayPlan);
  const atoms = normalizedAtoms(retained);
  const sourceAtomsSha256 = canonicalSha(atoms);
  const pairId = job.publication.pairId;
  const captionTargets = cues.map((cue) => ({
    targetId: cue.targetRefId,
    requiredAtomIds: cue.lines.flatMap((line) => line.sourceAtomIds),
    allowedOmissionAtomIds: [],
  }));
  const captionCues = cues.map((cue) => ({
    cueId: cue.cueId,
    targetId: cue.targetRefId,
    lines: cue.lines.map((line) => ({
      atomIds: [...line.sourceAtomIds],
      renderedText: line.text,
    })),
    startAnchor: clone(cue.startAnchor),
    endAnchor: clone(cue.endAnchor),
    startMs: cue.sourceStartMs,
    endMs: cue.sourceEndMs,
  }));
  const resolutionPackage = {
    schemaVersion: 'presentation-resolution-package-v003',
    resolutionPackageId: `${pairId}-resolution-package`,
    sourceProvenance: retained.sourceProvenance,
    atomGranularity: retained.atomGranularity,
    sourceSpeakerNormalization: {
      schemaVersion: SOURCE_SPEAKER_NORMALIZATION_SCHEMA_VERSION,
      normalizerVersion: SOURCE_SPEAKER_NORMALIZER_VERSION,
      registryVersion: SOURCE_SPEAKER_REGISTRY_VERSION,
      registryCanonicalSha256: SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256,
      rawSourceAtomsCanonicalSha256: retained.rawSourceAtomsCanonicalSha256,
    },
    sourceAtomsSha256,
    sourceAtoms: atoms,
    targets: cues.map((cue) => ({
      targetRefId: cue.targetRefId,
      targetType: 'caption-target',
      captionContractRefId: 'caption-contract-v003',
      cueId: cue.cueId,
    })),
    captionContracts: [{
      captionContractRefId: 'caption-contract-v003',
      captionSchemaVersion: 'presentation-caption-check-v003',
      sourceDisplayPlanBinding: {
        displayPlanId: displayPlan.displayPlanId,
        fileSha256: displayPlanArtifact.fileSha256,
        canonicalSha256: displayPlanArtifact.canonicalSha256,
      },
      captionTargets,
      allowedSimultaneousGroups: [],
      captionPlan: {cues: captionCues},
    }],
  };
  const resolutionPackageCanonicalSha256 = canonicalSha(resolutionPackage);
  return {
    schemaVersion: 'presentation-instruction-bundle-v003',
    pairId,
    displayPlanBinding: {
      displayPlanId: displayPlan.displayPlanId,
      path: 'display-plan.json',
      fileSha256: displayPlanArtifact.fileSha256,
      canonicalSha256: displayPlanArtifact.canonicalSha256,
    },
    instructionSet: {
      schemaVersion: 'zev-presentation-instruction-v003',
      instructionSetId: `${pairId}-instruction-set`,
      format: 'normal-landscape',
      rendererContractVersion: 'zev-renderer-boundary-v003-review',
      sourceProvenance: retained.sourceProvenance,
      resolutionPackageId: resolutionPackage.resolutionPackageId,
      resolutionPackageCanonicalSha256,
      presetRegistryBinding: {
        registryVersion: registryValues.trustedRegistryBindings.presetRegistryVersion,
        presetValidationIndexSha256:
          registryValues.trustedRegistryBindings.presetValidationIndexSha256,
      },
      materialRegistryBinding: {
        registryVersion: registryValues.trustedRegistryBindings.materialRegistryVersion,
        materialValidationIndexSha256:
          registryValues.trustedRegistryBindings.materialValidationIndexSha256,
      },
      instructions: cues.map((cue) => ({
        instructionId: cue.instructionId,
        trigger: {startAtomId: cue.lines[0].sourceAtomIds[0]},
        kind: 'speech-caption',
        target: {targetType: 'caption-target', targetRefIds: [cue.targetRefId]},
        presetId: 'normal-landscape-readable-pop-v001',
        materialRefs: [],
      })),
    },
    resolutionPackage,
  };
};

const captionCheckReport = (displayPlanArtifact, instructionArtifact, instructionCheck) => {
  const grammar = instructionCheck.captionValidation?.grammarReport;
  if (!grammar) throw new TypeError('caption grammar unavailable');
  const sourceOverlaps = grammar.contract.observations
    .filter((entry) => entry.code === 'SOURCE_ATOM_TIME_OVERLAP_RECORDED')
    .map((entry) => ({
      leftAtomId: entry.relatedIds[0],
      rightAtomId: entry.relatedIds[1],
      overlapMs: entry.details.overlapMs,
    }));
  const cues = flattenCues(displayPlanArtifact.value);
  const boundaryContacts = [];
  for (let index = 1; index < cues.length; index += 1) {
    if (cues[index - 1].sourceEndMs === cues[index].sourceStartMs) {
      boundaryContacts.push({
        leftCueId: cues[index - 1].cueId,
        rightCueId: cues[index].cueId,
        boundaryMs: cues[index].sourceStartMs,
      });
    }
  }
  return {
    schemaVersion: 'presentation-caption-check-report-v003',
    checkerVersion: 'presentation-caption-checker-v003',
    inputBindings: {
      displayPlan: {
        path: 'display-plan.json',
        fileSha256: displayPlanArtifact.fileSha256,
        canonicalSha256: displayPlanArtifact.canonicalSha256,
      },
      instructionBundle: {
        path: 'instruction-bundle.json',
        fileSha256: instructionArtifact.fileSha256,
        canonicalSha256: instructionArtifact.canonicalSha256,
      },
    },
    overallStatus: grammar.overallStatus,
    contract: clone(grammar.contract),
    checks: clone(grammar.checks),
    observations: {sourceAtomPositiveOverlaps: sourceOverlaps, boundaryContacts},
    scopeExclusions: [
      'SOURCE_ATOM_SPEAKER_IDENTITY_CLASSIFICATION_OUTSIDE_REGISTRY_NOT_VERIFIED',
    ],
  };
};

const buildLayoutPreflight = ({
  displayPlanArtifact,
  instructionArtifact,
  registryInputs,
  layoutInspection,
}) => {
  const registryByRole = byRole(registryInputs);
  const registry = decodeSnapshot(registryByRole.get('presetRegistry'));
  const trusted = decodeSnapshot(registryByRole.get('trustedRegistryBindings'));
  const presetIndex = decodeSnapshot(registryByRole.get('presetValidationIndex'));
  const materialIndex = decodeSnapshot(registryByRole.get('materialValidationIndex'));
  const preset = registry.presets.find(
    (entry) => entry.presetId === 'normal-landscape-readable-pop-v001',
  );
  const state = preset.visualStates.find((entry) => entry.stateId === 'caption-core-v001');
  const cues = flattenCues(displayPlanArtifact.value);
  const lines = cues.flatMap((cue) => cue.lines);
  const widths = lines.map((line) =>
    [...line.text].reduce((sum, character) => sum + codePointWeightV001(character), 0));
  const inspectorPassed = layoutInspection?.status === 'passed';
  const checks = [
    {name: 'lineCount', status: cues.every((cue) => cue.lines.length >= 1 && cue.lines.length <= 2) ? 'passed' : 'failed', violationCodes: []},
    {name: 'logicalWidth', status: widths.every((width) => width <= 36) ? 'passed' : 'failed', violationCodes: []},
    {name: 'trustedPreset', status: state ? 'passed' : 'failed', violationCodes: []},
    {name: 'safeArea', status: inspectorPassed ? 'passed' : 'failed', violationCodes: []},
    {name: 'lineIntersection', status: inspectorPassed ? 'passed' : 'failed', violationCodes: []},
    {name: 'materialRegistry', status: materialIndex?.materials?.length === 0 ? 'passed' : 'failed', violationCodes: []},
  ].map((check) => ({
    ...check,
    violationCodes: check.status === 'passed' ? [] : ['LAYOUT_PREFLIGHT_FAILED'],
  }));
  return {
    schemaVersion: 'presentation-caption-layout-preflight-v001',
    inspectorVersion: 'presentation-preset-layout-inspector-v001',
    inputBindings: [
      {role: 'displayPlan', path: 'display-plan.json', fileSha256: displayPlanArtifact.fileSha256, canonicalSha256: displayPlanArtifact.canonicalSha256},
      {role: 'instructionBundle', path: 'instruction-bundle.json', fileSha256: instructionArtifact.fileSha256, canonicalSha256: instructionArtifact.canonicalSha256},
      ...['trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex', 'materialValidationIndex'].map((role) => {
        const input = registryByRole.get(role);
        return {role, ...bindingFor(input, decodeSnapshot(input))};
      }),
    ],
    presetResolution: {
      registryVersion: registry.registryVersion,
      presetId: preset.presetId,
      stateId: state.stateId,
      fontAssetId: state.textStyle.fontAssetId,
      transitionId: state.transitionId,
      endResponsibility: 'target-anchor',
      canvas: clone(registry.canvas),
      safeAreaPx: clone(registry.canvas.safeAreaPx),
      layout: clone(state.layout),
    },
    status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
    checks,
    observedProjection: {
      cueCount: cues.length,
      lineCount: lines.length,
      maximumObservedLineLogicalWidth: Math.max(0, ...widths),
      safeAreaFailureCount: layoutInspection?.violations?.filter(
        (entry) => entry.code === 'LINE_BOX_OUTSIDE_SAFE_AREA',
      ).length ?? 0,
      positiveLineIntersectionCount: layoutInspection?.violations?.filter(
        (entry) => entry.code === 'LINE_BOX_POSITIVE_INTERSECTION',
      ).length ?? 0,
    },
    scopeExclusions: [
      'font_fallback_not_verified_before_render',
      'alpha_bounds_not_verified_before_render',
      'final_overlay_intersection_not_verified_before_render',
      'final_overlay_safe_area_not_verified_before_render',
      'caption_presence_in_video_not_verified_before_render',
      'base_audio_preservation_not_verified_before_render',
    ],
  };
};

const buildReviewRequest = ({
  job,
  displayPlanArtifact,
  instructionArtifact,
  captionArtifact,
  layoutArtifact,
  baseMediaInputs,
  registryInputs,
}) => {
  const base = byRole(baseMediaInputs);
  const registry = byRole(registryInputs);
  return {
    schemaVersion: 'presentation-caption-review-render-request-v003',
    requestId: `${job.publication.pairId}-review-render-request`,
    purpose: 'caption-readability-alignment-completeness-review',
    reviewOnly: true,
    publicationAllowed: false,
    displayPlanBinding: {path: 'display-plan.json', fileSha256: displayPlanArtifact.fileSha256, canonicalSha256: displayPlanArtifact.canonicalSha256},
    instructionBundleBinding: {path: 'instruction-bundle.json', fileSha256: instructionArtifact.fileSha256, canonicalSha256: instructionArtifact.canonicalSha256},
    captionCheckBinding: {path: 'caption-check-report.json', fileSha256: captionArtifact.fileSha256, canonicalSha256: captionArtifact.canonicalSha256},
    layoutPreflightBinding: {path: 'layout-preflight.json', fileSha256: layoutArtifact.fileSha256, canonicalSha256: layoutArtifact.canonicalSha256},
    baseMediaBinding: {
      baseMedia: bindingFor(base.get('baseMedia'), null, true),
      timeline: bindingFor(base.get('timeline'), decodeSnapshot(base.get('timeline'))),
      generationManifest: bindingFor(base.get('generationManifest'), decodeSnapshot(base.get('generationManifest'))),
      validationReport: bindingFor(base.get('validationReport'), decodeSnapshot(base.get('validationReport'))),
    },
    registryBindings: Object.fromEntries(
      ['trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex', 'materialValidationIndex']
        .map((role) => [role, bindingFor(registry.get(role), decodeSnapshot(registry.get(role)))]),
    ),
    requiredInputState: 'review_input_ready',
    rendererEntry: 'presentation-review-renderer-v003',
    expectedOutput: {
      state: 'review_rendered',
      publicationAllowed: false,
      requiredQc: [
        'preset_applied',
        'no_text_overlap',
        'inside_safe_area',
        'no_missing_caption',
        'base_frame_count_preserved',
        'base_audio_preserved',
      ],
    },
  };
};

export function buildPresentationCaptionDisplayPairV003(context) {
  const result = {
    status: 'failed',
    artifacts: null,
    builds: [],
    compilerObservation: null,
    layoutObservation: null,
    failureStage: 'semantic-compiler-rebuild',
  };
  try {
    if (!exactKeys(context, [
      'job',
      'jobSnapshot',
      'implementationInputs',
      'sourcePackageInputs',
      'semanticCheckInputs',
      'retainedSourceInputs',
      'baseMediaInputs',
      'registryInputs',
      'runtimeObservation',
      'layoutInspection',
    ])) return result;
    const semanticByRole = byRole(context.semanticCheckInputs);
    const semanticReport = decodeSnapshot(semanticByRole.get('validationReport'));
    if (semanticReport?.status !== 'passed') return result;
    const compilerContext = {
      sourcePackageSnapshots: context.sourcePackageInputs.map((entry) => entry.snapshot),
      rawSemanticOutputSnapshot: semanticByRole.get('rawSemanticOutput').snapshot,
    };
    const compilerA = buildPresentationCaptionSemanticCompilerInputV001(compilerContext);
    const compilerB = buildPresentationCaptionSemanticCompilerInputV001(compilerContext);
    if (!sameJson(compilerA, compilerB)) return result;
    const compilerObservedByteSha256 = hashBytes(formalBytes(compilerA));
    const compilerCanonicalSha256 = canonicalSha(compilerA);
    if (semanticReport.compilerInput?.observedByteSha256 !== compilerObservedByteSha256
      || semanticReport.compilerInput?.canonicalSha256 !== compilerCanonicalSha256) return result;
    result.compilerObservation = {
      value: compilerA,
      observedByteSha256: compilerObservedByteSha256,
      canonicalSha256: compilerCanonicalSha256,
    };
    const retainedByRole = byRole(context.retainedSourceInputs);
    const retained = decodeSnapshot(retainedByRole.get('sourceAtoms'));
    const baseByRole = byRole(context.baseMediaInputs);
    const timeline = decodeSnapshot(baseByRole.get('timeline'));
    const registryByRole = byRole(context.registryInputs);
    const registryValues = Object.fromEntries(
      [...registryByRole].map(([role, entry]) => [role, decodeSnapshot(entry)]),
    );
    result.failureStage = 'display-plan-build';
    const displayValue = buildDisplayPlan({
      job: context.job,
      compilerInput: compilerA,
      retained,
      timeline,
      sourcePackage: context.sourcePackageInputs,
      semantic: context.semanticCheckInputs,
      retainedInputs: context.retainedSourceInputs,
      baseInputs: context.baseMediaInputs,
      registryInputs: context.registryInputs,
    });
    const displayArtifact = makeArtifact(
      'displayPlan',
      'display-plan.json',
      displayValue.schemaVersion,
      displayValue,
    );
    result.failureStage = 'resolution-package-build';
    const instructionValue = buildInstructionBundle({
      job: context.job,
      displayPlanArtifact: displayArtifact,
      retained,
      registryValues,
    });
    result.failureStage = 'instruction-bundle-build';
    const instructionArtifact = makeArtifact(
      'instructionBundle',
      'instruction-bundle.json',
      instructionValue.schemaVersion,
      instructionValue,
    );
    const instructionCheck = validatePresentationInstructionContractV003({
      instructionBundle: instructionValue,
      displayPlan: displayValue,
      retainedSourceAtoms: retained,
      trustedRegistryBindings: registryValues.trustedRegistryBindings,
      presetRegistry: registryValues.presetRegistry,
      presetValidationIndex: registryValues.presetValidationIndex,
      materialValidationIndex: registryValues.materialValidationIndex,
    });
    if (instructionCheck.status === 'failed') return result;
    result.failureStage = 'caption-check-build';
    const captionValue = captionCheckReport(
      displayArtifact,
      instructionArtifact,
      instructionCheck,
    );
    const captionArtifact = makeArtifact(
      'captionCheckReport',
      'caption-check-report.json',
      captionValue.schemaVersion,
      captionValue,
    );
    result.failureStage = 'layout-inspection';
    const layoutValue = buildLayoutPreflight({
      displayPlanArtifact: displayArtifact,
      instructionArtifact,
      registryInputs: context.registryInputs,
      layoutInspection: context.layoutInspection,
    });
    if (layoutValue.status !== 'passed') return result;
    const layoutArtifact = makeArtifact(
      'layoutPreflight',
      'layout-preflight.json',
      layoutValue.schemaVersion,
      layoutValue,
    );
    result.failureStage = 'review-request-build';
    const requestValue = buildReviewRequest({
      job: context.job,
      displayPlanArtifact: displayArtifact,
      instructionArtifact,
      captionArtifact,
      layoutArtifact,
      baseMediaInputs: context.baseMediaInputs,
      registryInputs: context.registryInputs,
    });
    const requestArtifact = makeArtifact(
      'reviewRenderRequest',
      'review-render-request.json',
      requestValue.schemaVersion,
      requestValue,
    );
    result.status = 'built';
    result.artifacts = [
      displayArtifact,
      instructionArtifact,
      captionArtifact,
      layoutArtifact,
      requestArtifact,
    ];
    result.builds = result.artifacts.map((artifact) => ({
      role: artifact.role,
      status: 'built',
      fileSha256: artifact.fileSha256,
      canonicalSha256: artifact.canonicalSha256,
    }));
    result.layoutObservation = clone(context.layoutInspection);
    result.failureStage = null;
    return result;
  } catch {
    return result;
  }
}

const validReviewState = (value) => sameJson(value, {
  stage: 'review_input_ready',
  reviewOnly: true,
  publicationAllowed: false,
  segmenterBoundaryEvidence: 'passed',
  semanticStructure: 'passed',
  naturalBoundary: 'pending_human_review',
  semanticReadability: 'pending_human_review',
  layoutPreflight: 'passed',
  renderedLayoutQc: 'pending_render_qc',
  humanAssessment: 'not_requested',
});

const addObservationViolations = (context, output) => {
  const add = (code, path, details = {}) => output.push(violation(code, path, details));
  const job = context.jobObservation;
  const formalJob = validatePresentationCaptionDisplayPairGenerationJobV001(job?.value);
  const preflightJob = validatePresentationCaptionDisplayPairStaticPreflightJobV001(job?.value);
  if (!formalJob.valid && !preflightJob.valid) {
    add('CAPTION_B4_JOB_INVALID', '$.job.value');
    return;
  }
  if (job?.prePublicationMatches === false) add('JOB_FILE_MISMATCH', '$.job.prePublication');
  if (job?.preReportMatches === false) add('JOB_FILE_MISMATCH', '$.job.preReport');
  context.implementationObservations?.forEach((entry, index) => {
    if (entry.matches !== true) add('IMPLEMENTATION_MISMATCH', `$.implementationBindings[${index}].fileSha256`);
  });
  context.inputObservations?.forEach((entry, index) => {
    if (entry.pathSafe === false) add('INPUT_PATH_UNSAFE', `$.inputBindings[${index}].path`);
    else if (entry.fileSetValid === false) add('INPUT_FILE_SET_INVALID', `$.inputBindings[${index}].directoryEntries`);
    else if (entry.hashMatches === false) add('INPUT_HASH_MISMATCH', `$.inputBindings[${index}].fileSha256`);
    else if (entry.schemaSupported === false) add('INPUT_SCHEMA_UNSUPPORTED', `$.inputBindings[${index}].decodedValue`);
  });
  if (context.runtimeObservation?.matches !== true) {
    add('RUNTIME_MISMATCH', context.runtimeObservation?.mismatchPath ?? '$.runtime.nodeVersion');
  }
  const semantic = context.semanticObservation;
  if (semantic?.reportPassed === false) add('SEMANTIC_REPORT_NOT_PASSED', '$.semantic.validationReport.status');
  else if (semantic?.compilerInputAvailable === false) add('SEMANTIC_COMPILER_INPUT_NOT_AVAILABLE', '$.semantic.compilerInput');
  else if (semantic?.bindingsMatch === false) add('SEMANTIC_BINDING_MISMATCH', '$.semantic.bindings.rawSemanticOutput');
  else if (semantic?.compilerRebuildFailed === true) add('SEMANTIC_COMPILER_REBUILD_FAILED', '$.semantic.builds.compiler');
  else if (semantic?.compilerHashesMatch === false) add('SEMANTIC_COMPILER_HASH_MISMATCH', '$.semantic.compilerInputHash.canonicalSha256');
  const source = context.sourceObservation;
  const sourceState = source
    ? validateSourceObservation(source, add)
    : {usableForParent: false, atoms: [], atomById: new Map()};
  const compiler = semantic?.compilerInput;
  const semanticPrerequisitesValid = semantic?.reportPassed !== false
    && semantic?.compilerInputAvailable !== false
    && semantic?.bindingsMatch !== false
    && semantic?.compilerRebuildFailed !== true
    && semantic?.compilerHashesMatch !== false;
  const compilerState = compiler && semanticPrerequisitesValid
    ? validateCompilerInput(compiler, semantic, sourceState, add)
    : {usableForSourceComparison: false, atomIds: []};
  if (sourceState.usableForParent && compilerState.usableForSourceComparison) {
    const sourceIds = sourceState.atoms.map((atom) => atom.atomId);
    if (!sameArray(compilerState.atomIds, sourceIds)) {
      const sameMembers = compilerState.atomIds.length === sourceIds.length
        && new Set(compilerState.atomIds).size === compilerState.atomIds.length
        && sourceIds.every((atomId) => compilerState.atomIds.includes(atomId));
      add(
        sameMembers ? 'SOURCE_ATOM_ORDER_INVALID' : 'SOURCE_ATOM_COVERAGE_INVALID',
        sameMembers ? '$.sourceAtoms.atoms[1].atomId' : '$.sourceAtoms.coverage',
      );
    }
  }
  const timeline = context.timelineObservation;
  if (timeline) validateTimelineObservation(timeline, add);
  const built = context.buildObservation;
  if (built?.status === 'failed') {
    add('BUILD_FAILED', '$.builds.buildFailure', {stage: built.failureStage});
  }
  if (built?.displayPlan) validateDisplayPlan(built.displayPlan, compiler, source, timeline, add);
  if (built?.instructionInput) {
    const instructionResult = validatePresentationInstructionContractV003(built.instructionInput);
    instructionResult.violations.forEach((entry) => add(entry.code, entry.path, entry.details));
    instructionResult.captionValidation?.schemaViolations?.forEach(
      (entry) => {
        let path = entry.path;
        if (path === '$') path = '$.resolutionPackage.captionContracts[0]';
        else if (path.startsWith('$.captionContract')) {
          path = path.replace(
            '$.captionContract',
            '$.resolutionPackage.captionContracts[0]',
          );
        } else if (path.startsWith('$.source')) {
          path = path.replace('$.source', '$.resolutionPackage.sourceAtoms');
        } else if (path.startsWith('$.expectedDisplayPlanBinding')) {
          path = path.replace(
            '$.expectedDisplayPlanBinding',
            '$.instructionBundle.displayPlanBinding',
          );
        } else if (path === '$.format') {
          path = '$.instructionBundle.instructionSet.format';
        }
        add(entry.code, path, entry.details);
      },
    );
  }
  const caption = built?.captionCheckReport;
  if (caption) validateCaptionReport(caption, add);
  if (built?.layoutPreflight?.status !== undefined && built.layoutPreflight.status !== 'passed') {
    add('LAYOUT_PREFLIGHT_FAILED', '$.layoutPreflight.checks[3]');
  }
  if (built?.reviewState !== undefined && !validReviewState(built.reviewState)) {
    add(
      'REVIEW_STATE_INVALID',
      built.reviewState?.publicationAllowed !== false
        ? '$.reviewState.publicationAllowed'
        : '$.reviewState',
    );
  }
  if (built?.reviewRenderRequestValid === false) {
    add('REVIEW_RENDER_REQUEST_INVALID', '$.reviewRenderRequest.requiredInputState');
  }
  if (built?.pairBindingsMatch === false) add('PAIR_BINDING_MISMATCH', '$.pairManifest.contentArtifacts[0].fileSha256');
  if (built?.deterministic === false) add('NONDETERMINISTIC', '$.builds.determinism.reviewRenderRequest');
  if (context.publicationObservation?.readOnlyUnchanged === false) {
    add('READ_ONLY_CONTRACT_VIOLATED', '$.readOnly.changedEntries[0]');
  }
  const publication = context.publicationObservation;
  if (publication?.initialPathsClear === false) add('OUTPUT_ROOT_ALREADY_EXISTS', '$.publication.initialPaths.formalRoot');
  else if (publication?.lockAvailable === false) add('PUBLICATION_LOCK_UNAVAILABLE', '$.publication.lock');
  else if (publication?.stagingValid === false) add('PUBLICATION_STAGING_INVALID', '$.publication.staging.directoryEntries');
  else if (publication?.inputUnchanged === false) add('PUBLICATION_INPUT_CHANGED', '$.publication.inputRecheck[0]');
  else if (publication?.preRenameValid === false) add('PUBLICATION_PRE_RENAME_INVALID', '$.publication.preRename.formalRoot');
  else if (publication?.ioSucceeded === false) add('PUBLICATION_FAILED', '$.publication.staging.failurePoint');
  else if (publication?.publishedPairValid === false) add('PUBLISHED_PAIR_INVALID', '$.publishedPair.files[0]');
};

const validateCompilerInput = (compiler, semantic, sourceState, add) => {
  if (!exactKeys(compiler, ['schemaVersion', 'artifactId', 'sourcePackageBinding', 'semanticOutputBinding', 'containers'])
    || compiler.schemaVersion !== 'presentation-caption-semantic-compiler-input-v001') {
    add('COMPILER_INPUT_SCHEMA_INVALID', '$.semantic.compilerInput.schemaVersion');
    return {usableForSourceComparison: false, atomIds: []};
  }
  if (!Array.isArray(compiler.containers)
    || compiler.containers.length === 0
    || (Number.isSafeInteger(semantic?.expectedContainerCount)
      && compiler.containers.length !== semantic.expectedContainerCount)) {
    add('COMPILER_CONTAINER_SET_INVALID', '$.semantic.compilerInput.containers');
    return {usableForSourceComparison: false, atomIds: []};
  }
  const allAtoms = [];
  let structuralFailure = false;
  let representationFailure = false;
  compiler.containers.forEach((container, containerIndex) => {
    if (!isObject(container)
      || !Array.isArray(container.meaningGroups)
      || container.meaningGroups.length === 0) {
      add('COMPILER_CONTAINER_SET_INVALID', `$.semantic.compilerInput.containers[${containerIndex}]`);
      structuralFailure = true;
      return;
    }
    container.meaningGroups.forEach((group, groupIndex) => {
      const groupPath = `$.semantic.compilerInput.containers[${containerIndex}].meaningGroups[${groupIndex}]`;
      if (group.meaningGroupOrdinal !== groupIndex + 1
        || !Array.isArray(group.lines)
        || group.lines.length < 1
        || group.lines.length > 2) {
        add('COMPILER_MEANING_GROUP_INVALID', groupPath);
        structuralFailure = true;
        return;
      }
      group.lines.forEach((line, lineIndex) => {
        const linePath = `${groupPath}.lines[${lineIndex}]`;
        if (line.lineOrdinal !== lineIndex + 1
          || !Array.isArray(line.sourceAtomIds)
          || line.sourceAtomIds.length === 0
          || !isString(line.text)
          || !isObject(line.startAnchor)
          || !isObject(line.endAnchor)
          || !isCount(line.logicalWidth)) {
          add('COMPILER_LINE_INVALID', linePath);
          structuralFailure = true;
          return;
        }
        allAtoms.push(...line.sourceAtomIds);
        if (sourceState.usableForParent) {
          const sourceAtoms = sourceState.atoms;
          const sourceById = sourceState.atomById;
          const idAtoms = line.sourceAtomIds.map((atomId) => sourceById.get(atomId));
          const idValid = idAtoms.every(Boolean)
            && new Set(line.sourceAtomIds).size === line.sourceAtomIds.length;
          const startIndex = sourceAtoms.findIndex(
            (atom) => atom.atomId === line.startAnchor.atomId,
          );
          const endIndex = sourceAtoms.findIndex(
            (atom) => atom.atomId === line.endAnchor.atomId,
          );
          const rangeValid = line.startAnchor.edge === 'start'
            && line.endAnchor.edge === 'end'
            && startIndex >= 0
            && endIndex >= startIndex;
          const rangeAtoms = rangeValid ? sourceAtoms.slice(startIndex, endIndex + 1) : [];
          const idRangeAgree = idValid
            && rangeValid
            && sameArray(line.sourceAtomIds, rangeAtoms.map((atom) => atom.atomId));
          const idTextAgree = idValid
            && line.text === idAtoms.map((atom) => atom.text).join('');
          const rangeTextAgree = rangeValid
            && line.text === rangeAtoms.map((atom) => atom.text).join('');
          const agreementCount = [idRangeAgree, idTextAgree, rangeTextAgree]
            .filter(Boolean).length;
          if (agreementCount === 3) return;
          if (rangeTextAgree && !idRangeAgree) {
            add('COMPILER_ATOM_COVERAGE_INVALID', '$.semantic.compilerInput.containers');
            representationFailure = true;
          } else if (idRangeAgree && !idTextAgree) {
            add('COMPILER_TEXT_MISMATCH', `${linePath}.text`);
          } else if (idTextAgree && !idRangeAgree) {
            add(
              'COMPILER_ANCHOR_MISMATCH',
              line.startAnchor.edge !== 'start'
                || line.startAnchor.atomId !== line.sourceAtomIds[0]
                ? `${linePath}.startAnchor`
                : `${linePath}.endAnchor`,
            );
          } else {
            add('COMPILER_ATOM_COVERAGE_INVALID', '$.semantic.compilerInput.containers');
            add('COMPILER_TEXT_MISMATCH', `${linePath}.text`);
            add('COMPILER_ANCHOR_MISMATCH', `${linePath}.endAnchor`);
            representationFailure = true;
          }
        }
      });
    });
  });
  if (structuralFailure) return {usableForSourceComparison: false, atomIds: []};
  if (new Set(allAtoms).size !== allAtoms.length) {
    add('COMPILER_ATOM_COVERAGE_INVALID', '$.semantic.compilerInput.containers');
    representationFailure = true;
  }
  return {
    usableForSourceComparison: !representationFailure,
    atomIds: allAtoms,
  };
};

const validateSourceObservation = (source, add) => {
  let usableForParent = true;
  if (source.bindingMatches === false) {
    add('SOURCE_PACKAGE_BINDING_MISMATCH', '$.sourceAtoms.binding.rawSourceAtomsCanonicalSha256');
    usableForParent = false;
  }
  const atoms = source.atoms;
  if (!Array.isArray(atoms)) {
    add('SOURCE_ATOM_SCHEMA_INVALID', '$.sourceAtoms.atoms[0]');
    return {usableForParent: false, atoms: [], atomById: new Map()};
  }
  const seen = new Set();
  let priorStart = -Infinity;
  atoms.forEach((atom, index) => {
    const path = `$.sourceAtoms.atoms[${index}]`;
    if (!exactKeys(atom, ['atomId', 'speechId', 'speaker', 'text', 'startMs', 'endMs'])
      || !isNonEmptyString(atom.atomId)
      || !isSafeInteger(atom.speechId)
      || !isString(atom.text)) {
      add('SOURCE_ATOM_SCHEMA_INVALID', path);
      usableForParent = false;
      return;
    }
    if (seen.has(atom.atomId)) {
      add('SOURCE_ATOM_ID_DUPLICATE', `${path}.atomId`);
      usableForParent = false;
    }
    seen.add(atom.atomId);
    if (!isSafeInteger(atom.startMs)
      || !isSafeInteger(atom.endMs)
      || atom.startMs < 0
      || atom.endMs < 0
      || atom.startMs >= atom.endMs) {
      add('SOURCE_ATOM_TIME_INVALID', `${path}.endMs`);
      usableForParent = false;
    }
    if (atom.startMs < priorStart) {
      add('SOURCE_ATOM_ORDER_INVALID', `${path}.atomId`);
      usableForParent = false;
    }
    priorStart = atom.startMs;
    if (!(atom.speaker === null || isNonEmptyString(atom.speaker))) {
      add('SOURCE_ATOM_SPEAKER_INVALID', `${path}.speaker`);
      usableForParent = false;
    }
  });
  return {
    usableForParent,
    atoms,
    atomById: usableForParent
      ? new Map(atoms.map((atom) => [atom.atomId, atom]))
      : new Map(),
  };
};

const validateTimelineObservation = (timeline, add) => {
  if (timeline.bindingMatches === false) add('TIMELINE_BINDING_MISMATCH', '$.timeline.binding.timelineId');
  if (timeline.validationPassed === false) add('TIMELINE_SEGMENT_INVALID', '$.timeline.validation');
  if (timeline.mappingPassed === false) {
    add('TIMELINE_MAPPING_FAILED', '$.timeline.mappings[0]', {
      nestedViolationCodes: timeline.nestedViolationCodes ?? [],
    });
  }
};

const validateDisplayPlan = (displayPlan, compiler, source, timeline, add) => {
  const cues = displayPlan?.containers?.flatMap((container) => container.cues ?? []) ?? [];
  const compilerGroups = compiler?.containers?.flatMap((container) => container.meaningGroups) ?? [];
  const atomById = new Map((source?.atoms ?? []).map((atom) => [atom.atomId, atom]));
  cues.forEach((cue, index) => {
    const ordinal = String(index + 1).padStart(6, '0');
    const path = `$.displayPlan.containers[0].cues[${index}]`;
    if (cue.cueId !== `caption-cue-${ordinal}`) add('CUE_ID_INVALID', `${path}.cueId`);
    if (cue.targetRefId !== `caption-target-${ordinal}`
      || cue.instructionId !== `caption-instruction-${ordinal}`) add('CUE_MAPPING_INVALID', path);
    if (!Array.isArray(cue.lines) || cue.lines.length < 1 || cue.lines.length > 2) {
      add('CUE_LINE_COUNT_INVALID', `${path}.lines`);
      return;
    }
    const group = compilerGroups[index];
    cue.lines.forEach((line, lineIndex) => {
      if (line.logicalWidth > 36) add('CUE_LINE_WIDTH_EXCEEDED', `${path}.lines[${lineIndex}].logicalWidth`);
      if (line.text !== group?.lines?.[lineIndex]?.text) add('CUE_TEXT_MISMATCH', `${path}.lines[${lineIndex}].text`);
    });
    const atomIds = cue.lines.flatMap((line) => line.sourceAtomIds);
    const first = atomById.get(atomIds[0]);
    const last = atomById.get(atomIds.at(-1));
    if (!sameJson(cue.startAnchor, group?.lines?.[0]?.startAnchor)
      || !sameJson(cue.endAnchor, group?.lines?.at(-1)?.endAnchor)) add('CUE_ANCHOR_MISMATCH', `${path}.endAnchor`);
    const crossesTimeline = timeline?.mappingByCue?.[cue.cueId]?.segmentCount > 1;
    const orderReversed = index > 0
      && cue.sourceStartMs < cues[index - 1].sourceStartMs;
    const positiveOverlap = index > 0
      && Math.min(cues[index - 1].sourceEndMs, cue.sourceEndMs)
        - Math.max(cues[index - 1].sourceStartMs, cue.sourceStartMs) > 0;
    if (crossesTimeline) {
      add('CUE_TIMELINE_SEGMENT_CROSSED', `${path}.sourceEndMs`);
    } else if (orderReversed) {
      add('CUE_ORDER_REVERSED', `${path}.sourceStartMs`);
    } else if (positiveOverlap) {
      add('CUE_UNDECLARED_OVERLAP', `${path}.sourceStartMs`);
    } else if (cue.sourceStartMs !== first?.startMs || cue.sourceEndMs !== last?.endMs) {
      add('CUE_SOURCE_TIME_INVALID', `${path}.sourceEndMs`);
    }
  });
};

const validateCaptionReport = (report, add) => {
  for (const key of ['contract', 'G1', 'G2', 'G3']) {
    const value = key === 'contract' ? report.contract : report.checks?.[key];
    if (value?.status === 'failed') {
      add('G1_G3_CHECK_FAILED', key === 'contract'
        ? '$.captionCheckReport.contract'
        : `$.captionCheckReport.checks.${key}`);
    }
  }
  if (!sameArray(report.checks?.G2?.unverified, [
    'linguistic_word_boundary',
    'semantic_chunk_readability',
    'on_screen_readability',
  ])) {
    add('G2_DECLARED_LIMIT_MISSING', '$.captionCheckReport.checks.G2.unverified');
  } else if (report.overallStatus !== 'passed_with_declared_limit') {
    add('G2_DECLARED_LIMIT_MISSING', '$.captionCheckReport.overallStatus');
  }
};

export function checkPresentationCaptionDisplayPairV003(context) {
  if (!exactKeys(context, [
    'contextPhase',
    'jobObservation',
    'implementationObservations',
    'inputObservations',
    'runtimeObservation',
    'semanticObservation',
    'sourceObservation',
    'timelineObservation',
    'buildObservation',
    'publicationObservation',
  ])) return {status: 'untrusted-context'};
  const violations = [];
  addObservationViolations(context, violations);
  const preliminary = sortViolations(violations);
  if (preliminary.some((entry) => ownerCheckForViolationV001(entry) === null)) {
    return {status: 'untrusted-context'};
  }
  const preliminaryFailed = new Set(
    preliminary.map((entry) => ownerCheckForViolationV001(entry)),
  );
  let cutoff = CHECK_NAMES.length;
  if (preliminaryFailed.has('jobBinding')) cutoff = 1;
  else if (['implementationBinding', 'inputBinding', 'runtimeBinding']
    .some((name) => preliminaryFailed.has(name))) cutoff = 4;
  else {
    for (let index = 4; index < CHECK_NAMES.length; index += 1) {
      if (preliminaryFailed.has(CHECK_NAMES[index])) {
        cutoff = index + 1;
        break;
      }
    }
  }
  const sorted = preliminary.filter((entry) => {
    const ownerIndex = CHECK_NAMES.indexOf(ownerCheckForViolationV001(entry));
    return ownerIndex >= 0 && ownerIndex < cutoff;
  });
  const checks = CHECK_NAMES.map((name) => {
    const index = CHECK_NAMES.indexOf(name);
    const own = sorted
      .filter((entry) => ownerCheckForViolationV001(entry) === name)
      .map((entry) => entry.code);
    return {
      name,
      status: index >= cutoff
        ? 'not_run_with_upstream_failure'
        : own.length === 0 ? 'passed' : 'failed',
      violationCodes: [...new Set(own)],
    };
  });
  const build = context.buildObservation;
  const displayCues = build?.displayPlan ? flattenCues(build.displayPlan) : null;
  const observedProjection = displayCues && context.sourceObservation?.atoms
    ? {
      sourceAtomCount: context.sourceObservation.atoms.length,
      containerCount: build.displayPlan.containers.length,
      meaningGroupCount: context.semanticObservation.compilerInput.containers
        .reduce((sum, container) => sum + container.meaningGroups.length, 0),
      cueCount: displayCues.length,
      lineCount: displayCues.reduce((sum, cue) => sum + cue.lines.length, 0),
      timelineSegmentCount: context.timelineObservation.segmentCount,
      maximumObservedLineLogicalWidth: Math.max(
        0,
        ...displayCues.flatMap((cue) => cue.lines.map((line) => line.logicalWidth)),
      ),
      positiveCueOverlapCount: context.timelineObservation.positiveCueOverlapCount ?? 0,
      sourceAtomPositiveOverlapObservationCount:
        context.sourceObservation.positiveOverlapCount ?? 0,
    }
    : Object.fromEntries([
      'sourceAtomCount',
      'containerCount',
      'meaningGroupCount',
      'cueCount',
      'lineCount',
      'timelineSegmentCount',
      'maximumObservedLineLogicalWidth',
      'positiveCueOverlapCount',
      'sourceAtomPositiveOverlapObservationCount',
    ].map((key) => [key, null]));
  return {
    status: 'checked',
    checks,
    violations: sorted,
    observedProjection,
    reviewState: sorted.length === 0 ? clone(build.reviewState) : null,
    readOnlyObservation: clone(context.publicationObservation?.readOnlyObservation ?? {
      status: 'failed',
      beforeCanonicalSha256: null,
      afterCanonicalSha256: null,
      unchanged: null,
    }),
  };
}

const VALIDATION_REPORT_OUTPUTS_V002 = Object.freeze([
  ['displayPlan', 'display-plan.json'],
  ['instructionBundle', 'instruction-bundle.json'],
  ['captionCheckReport', 'caption-check-report.json'],
  ['layoutPreflight', 'layout-preflight.json'],
  ['reviewRenderRequest', 'review-render-request.json'],
  ['pairGenerationManifest', 'pair-generation-manifest.json'],
]);
const VALIDATION_REPORT_SCOPE_V002 = Object.freeze({
  validatedState: 'display-pair-ready-for-review-render',
  semanticQualityVerified: false,
  naturalBreakQualityVerified: false,
  onScreenReadabilityVerified: false,
  renderedLayoutQcVerified: false,
  publicationQualityVerified: false,
});

const reportOutputBindingV002 = (artifact, role, path) => {
  if (!isObject(artifact)
    || artifact.role !== role
    || artifact.fileName !== path
    || !Buffer.isBuffer(artifact.bytes)
    || artifact.fileSha256 !== hashBytes(artifact.bytes)
    || !SHA256.test(artifact.canonicalSha256)) return null;
  return {
    path,
    fileSha256: artifact.fileSha256,
    canonicalSha256: artifact.canonicalSha256,
  };
};

export function buildPresentationCaptionDisplayPairValidationReportV002(input) {
  try {
    if (!exactKeys(input, [
      'jobPath',
      'jobFileSha256',
      'job',
      'runtime',
      'checked',
      'compilerObservation',
      'contentArtifacts',
      'manifestArtifact',
    ])
      || !safePath(input.jobPath)
      || !SHA256.test(input.jobFileSha256)
      || !validatePresentationCaptionDisplayPairGenerationJobV001(input.job).valid
      || !isObject(input.runtime)
      || input.checked?.status !== 'checked'
      || !Array.isArray(input.checked.checks)
      || !Array.isArray(input.checked.violations)) return null;
    const buildFailure = input.checked.violations.find(
      (entry) => entry.code === 'BUILD_FAILED',
    );
    const failedBuild = Boolean(buildFailure);
    const successfulArtifacts = Array.isArray(input.contentArtifacts)
      && input.contentArtifacts.length === 5
      && isObject(input.manifestArtifact);
    if (failedBuild === successfulArtifacts) return null;
    if (failedBuild
      && (!Object.hasOwn(BUILD_STAGE_OWNER_CHECK_V001, buildFailure.details?.stage)
        || input.contentArtifacts !== null
        || input.manifestArtifact !== null)) return null;
    const allArtifacts = successfulArtifacts
      ? [...input.contentArtifacts, input.manifestArtifact]
      : [];
    const outputEntries = VALIDATION_REPORT_OUTPUTS_V002.map(
      ([role, path], index) => [
        role,
        failedBuild ? null : reportOutputBindingV002(allArtifacts[index], role, path),
      ],
    );
    if (!failedBuild && outputEntries.some(([, binding]) => binding === null)) return null;
    const compiler = input.compilerObservation;
    const compilerObservedByteSha256 = compiler?.observedByteSha256 ?? null;
    const compilerCanonicalSha256 = compiler?.canonicalSha256 ?? null;
    if (!(compilerObservedByteSha256 === null || SHA256.test(compilerObservedByteSha256))
      || !(compilerCanonicalSha256 === null || SHA256.test(compilerCanonicalSha256))) {
      return null;
    }
    const firstFailedCheck = input.checked.checks.find((entry) => entry.status === 'failed');
    const status = input.checked.violations.length === 0
      ? 'passed_pending_human_review'
      : 'failed';
    return {
      schemaVersion: 'presentation-caption-display-pair-validation-report-v002',
      validatorVersion: 'presentation-caption-display-pair-validator-v002',
      status,
      failureStage: status === 'passed_pending_human_review'
        ? null
        : buildFailure?.details?.stage ?? firstFailedCheck?.name ?? null,
      jobBinding: {
        path: input.jobPath,
        fileSha256: input.jobFileSha256,
      },
      implementationBinding: clone(input.job.implementationBinding),
      runtimeBinding: clone(input.runtime),
      inputBindings: {
        sourcePackageBinding: clone(input.job.sourcePackageBinding),
        semanticCheckBinding: clone(input.job.semanticCheckBinding),
        retainedSourceBinding: clone(input.job.retainedSourceBinding),
        baseMediaBinding: clone(input.job.baseMediaBinding),
        registryBinding: clone(input.job.registryBinding),
        compilerInput: {
          observedByteSha256: compilerObservedByteSha256,
          canonicalSha256: compilerCanonicalSha256,
        },
      },
      outputBindings: Object.fromEntries(outputEntries),
      checks: clone(input.checked.checks),
      violations: clone(input.checked.violations),
      observedProjection: clone(input.checked.observedProjection),
      reviewState: clone(input.checked.reviewState),
      readOnlyObservation: clone(input.checked.readOnlyObservation),
      scope: clone(VALIDATION_REPORT_SCOPE_V002),
    };
  } catch {
    return null;
  }
}

const artifactFromValidationBytesV002 = (role, fileName, bytes) => {
  if (!Buffer.isBuffer(bytes)) return null;
  const decoded = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (decoded?.status !== 'decoded') return null;
  return {
    role,
    fileName,
    bytes,
    fileSha256: hashBytes(bytes),
    canonicalSha256: canonicalSha(decoded.value),
  };
};

export function validatePresentationCaptionDisplayPairValidationReportV002(input) {
  try {
    if (!exactKeys(input, ['report', 'checkerContext', 'artifactBytes', 'manifestBytes'])
      || !isObject(input.report)
      || !Array.isArray(input.artifactBytes)) return {valid: false};
    const checked = checkPresentationCaptionDisplayPairV003(input.checkerContext);
    if (checked.status !== 'checked') return {valid: false};
    const failedBuild = checked.violations.some((entry) => entry.code === 'BUILD_FAILED');
    if (failedBuild
      ? input.artifactBytes.length !== 0 || input.manifestBytes !== null
      : input.artifactBytes.length !== 5 || !Buffer.isBuffer(input.manifestBytes)) {
      return {valid: false};
    }
    const contentArtifacts = failedBuild
      ? null
      : input.artifactBytes.map((bytes, index) => artifactFromValidationBytesV002(
        VALIDATION_REPORT_OUTPUTS_V002[index][0],
        VALIDATION_REPORT_OUTPUTS_V002[index][1],
        bytes,
      ));
    const manifestArtifact = failedBuild
      ? null
      : artifactFromValidationBytesV002(
        'pairGenerationManifest',
        'pair-generation-manifest.json',
        input.manifestBytes,
      );
    if (!failedBuild
      && (contentArtifacts.some((entry) => entry === null) || manifestArtifact === null)) {
      return {valid: false};
    }
    const expected = buildPresentationCaptionDisplayPairValidationReportV002({
      jobPath: input.checkerContext.jobObservation?.path,
      jobFileSha256: input.checkerContext.jobObservation?.fileSha256,
      job: input.checkerContext.jobObservation?.value,
      runtime: input.checkerContext.runtimeObservation?.value,
      checked,
      compilerObservation: {
        observedByteSha256:
          input.checkerContext.semanticObservation?.compilerObservedByteSha256 ?? null,
        canonicalSha256:
          input.checkerContext.semanticObservation?.compilerCanonicalSha256 ?? null,
      },
      contentArtifacts,
      manifestArtifact,
    });
    return {valid: expected !== null && sameJson(input.report, expected)};
  } catch {
    return {valid: false};
  }
}

const overlapCount = (atoms) => {
  let count = 0;
  for (let left = 0; left < atoms.length; left += 1) {
    for (let right = left + 1; right < atoms.length; right += 1) {
      if (atoms[right].startMs >= atoms[left].endMs) break;
      if (Math.min(atoms[left].endMs, atoms[right].endMs)
        - Math.max(atoms[left].startMs, atoms[right].startMs) > 0) count += 1;
    }
  }
  return count;
};

export function buildPresentationCaptionDisplayPairStaticPreflightReportV001(context) {
  const jobValid = validatePresentationCaptionDisplayPairStaticPreflightJobV001(context?.job).valid;
  const sourcePackage = context?.sourcePackageValues;
  const retained = context?.retainedSourceValue;
  const timeline = context?.timelineValue;
  const boundaryCandidates = sourcePackage?.boundaryEvidence?.boundaryCandidates ?? [];
  const containers = sourcePackage?.semanticSourceInput?.containers ?? [];
  const atoms = retained?.rawSourceAtoms ?? [];
  let adjacentPositive = 0;
  containers.forEach((container) => {
    for (let index = 1; index < container.boundaryCandidates.length; index += 1) {
      const left = container.boundaryCandidates[index - 1];
      const right = container.boundaryCandidates[index];
      if (Math.min(left.endMs, right.endMs) - Math.max(left.startMs, right.startMs) > 0) {
        adjacentPositive += 1;
      }
    }
  });
  const observed = {
    sourceAtomCount: atoms.length,
    containerCount: containers.length,
    boundaryCandidateCount: boundaryCandidates.length,
    timelineSegmentCount: timeline?.segments?.length ?? null,
    sourceAtomPositiveOverlapCount: overlapCount(atoms),
    adjacentBoundaryCandidatePositiveOverlapCount: adjacentPositive,
  };
  const expected = context?.job?.expectedStaticProjection;
  const match = expected && Object.keys(observed)
    .every((key) => observed[key] === expected[key]);
  const baseChecks = [
    ['jobBinding', jobValid],
    ['implementationBinding', context?.implementationValid === true],
    ['sourcePackageBinding', context?.sourcePackageValid === true],
    ['retainedSourceBinding', context?.retainedSourceValid === true],
    ['baseMediaBinding', context?.baseMediaValid === true],
    ['registryBinding', context?.registryValid === true],
    ['runtimeBinding', context?.runtimeValid === true],
    ['sourceAtomProjection', observed.sourceAtomCount === expected?.sourceAtomCount],
    ['containerProjection', observed.containerCount === expected?.containerCount],
    ['boundaryCandidateProjection', observed.boundaryCandidateCount === expected?.boundaryCandidateCount],
    ['timelineProjection', observed.timelineSegmentCount === expected?.timelineSegmentCount],
    ['readOnlyCheck', context?.readOnlyUnchanged === true],
  ];
  const checks = baseChecks.map(([name, passed]) => ({
    name,
    status: passed ? 'passed' : 'failed',
    violationCodes: passed ? [] : [name === 'readOnlyCheck'
      ? 'READ_ONLY_CONTRACT_VIOLATED'
      : name === 'jobBinding'
        ? 'CAPTION_B4_JOB_INVALID'
        : name === 'runtimeBinding'
          ? 'RUNTIME_MISMATCH'
          : 'INPUT_HASH_MISMATCH'],
  }));
  const violations = sortViolations(checks.flatMap((check) =>
    check.violationCodes.map((code) => violation(code, `$.checks.${check.name}`))));
  return {
    schemaVersion: 'presentation-caption-display-pair-static-preflight-report-v001',
    status: match && checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
    jobBinding: clone(context.jobBinding),
    implementationBinding: clone(context.job.implementationBinding),
    runtimeBinding: clone(context.runtimeBinding),
    inputBindings: clone(context.inputBindings),
    checks,
    violations,
    observedStaticProjection: observed,
    deferredUntilB6: [
      'semanticValidationReport',
      'semanticCompilerInput',
      'meaningGroupCount',
      'cueCount',
      'lineCount',
    ],
    readOnlyObservation: clone(context.readOnlyObservation),
  };
}
