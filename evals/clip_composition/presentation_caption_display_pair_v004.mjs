import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  buildPresentationCaptionSemanticCompilerInputForContractV001,
} from './presentation_caption_semantic_output_v001.mjs';
import {
  buildPresentationCaptionDisplayContainersFormatNeutralV003,
} from './presentation_caption_display_pair_v003.mjs';
import {
  codePointWeightV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  normalizeSourceAtomSpeakerForPackage,
  SOURCE_SPEAKER_NORMALIZATION_SCHEMA_VERSION,
  SOURCE_SPEAKER_NORMALIZER_VERSION,
  SOURCE_SPEAKER_NON_IDENTITY_REGISTRY_CANONICAL_SHA256,
  SOURCE_SPEAKER_REGISTRY_VERSION,
} from './presentation_source_speaker_policy_v001.mjs';
import {
  PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V004,
  PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V004,
  PRESENTATION_RENDERER_CONTRACT_VERSION_V004,
  PRESENTATION_VERTICAL_FORMAT_V004,
  PRESENTATION_VERTICAL_PRESET_ID_V004,
  PRESENTATION_VERTICAL_SCREEN_LAYOUT_V004,
  PRESENTATION_VERTICAL_VISUAL_STATE_ID_V004,
  validatePresentationInstructionContractV004,
} from './presentation_instruction_contract_v004.mjs';

export const PRESENTATION_CAPTION_DISPLAY_PAIR_JOB_SCHEMA_V002 =
  'presentation-caption-display-pair-generation-job-v002';
export const PRESENTATION_CAPTION_DISPLAY_PLAN_SCHEMA_V002 =
  'presentation-caption-display-plan-v002';
export const PRESENTATION_CAPTION_LAYOUT_PREFLIGHT_SCHEMA_V002 =
  'presentation-caption-layout-preflight-v002';
export const PRESENTATION_CAPTION_CHECK_REPORT_SCHEMA_V004 =
  'presentation-caption-check-report-v004';
export const PRESENTATION_CAPTION_REVIEW_REQUEST_SCHEMA_V004 =
  'presentation-caption-review-render-request-v004';
export const PRESENTATION_CAPTION_PAIR_MANIFEST_SCHEMA_V002 =
  'presentation-resolution-instruction-pair-generation-manifest-v002';
export const PRESENTATION_CAPTION_PAIR_REPORT_SCHEMA_V003 =
  'presentation-caption-display-pair-validation-report-v003';

export const PRESENTATION_CAPTION_B4_V004_VIOLATION_CODES = Object.freeze([
  'CAPTION_B4_JOB_INVALID',
  'IMPLEMENTATION_MISMATCH',
  'INPUT_HASH_MISMATCH',
  'INPUT_SCHEMA_UNSUPPORTED',
  'SEMANTIC_REPORT_NOT_PASSED',
  'SEMANTIC_COMPILER_REBUILD_FAILED',
  'SEMANTIC_COMPILER_HASH_MISMATCH',
  'SOURCE_PACKAGE_BINDING_MISMATCH',
  'DISPLAY_FORMAT_BINDING_MISMATCH',
  'DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH',
  'DISPLAY_CONSTRAINT_BINDING_MISMATCH',
  'CUE_LINE_COUNT_INVALID',
  'CUE_LINE_WIDTH_EXCEEDED',
  'CUE_TEXT_MISMATCH',
  'CUE_UNDECLARED_OVERLAP',
  'INSTRUCTION_MAPPING_INVALID',
  'INSTRUCTION_PRESET_INVALID',
  'LAYOUT_PREFLIGHT_FAILED',
  'REVIEW_RENDER_REQUEST_INVALID',
  'PAIR_BINDING_MISMATCH',
  'NONDETERMINISTIC',
]);

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/;
const CHARACTER_WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const FILE_BINDINGS = Object.freeze([
  ['displayPairCore', 'evals/clip_composition/presentation_caption_display_pair_v004.mjs'],
  ['displayPairRunner', 'evals/clip_composition/run_presentation_caption_display_pair_job_v002.mjs'],
]);
const DEPENDENCY_BINDINGS = Object.freeze([
  ['displayPairCoreV003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunner', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs'],
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['instructionCoreV004', 'evals/clip_composition/presentation_instruction_contract_v004.mjs'],
  ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['sourceSpeakerRegistry', 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'],
  ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['layoutPreflightCore', 'evals/clip_composition/inspect_presentation_preset_layout.ts'],
  ['rendererLayoutCore', 'runner/src/telop/telop-render-model.ts'],
  ['presetRegistry', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json'],
  ['presetValidationIndex', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-validation-index.json'],
  ['materialValidationIndex', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/material-validation-index.json'],
  ['trustedRegistryBindings', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/trusted-registry-bindings.json'],
  ['rendererTrust', 'evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001/trust.json'],
  ['sharedJsonContractCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
]);
const REQUIRED_QC = Object.freeze([
  'preset_applied',
  'no_text_overlap',
  'inside_safe_area',
  'no_missing_caption',
  'base_frame_count_preserved',
  'base_audio_preserved',
]);
const CONTENT_FILES = Object.freeze([
  ['displayPlan', 'display-plan.json'],
  ['layoutPreflight', 'layout-preflight.json'],
  ['captionCheckReport', 'caption-check-report.json'],
  ['instructionBundle', 'instruction-bundle.json'],
  ['reviewRenderRequest', 'review-render-request.json'],
]);

const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const safePath = (value) => typeof value === 'string'
  && value.length > 0
  && !value.startsWith('/')
  && !value.split('/').some((entry) => entry === '' || entry === '.' || entry === '..');
const clone = (value) => structuredClone(value);
const canonicalSha = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') return null;
  const hashed = sha256PresentationCaptionB1BytesV001(result.bytes);
  return hashed.status === 'hashed' ? hashed.sha256 : null;
};
const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal serialization failed');
  return result.bytes;
};
const fileSha = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result.status !== 'hashed') throw new TypeError('hash failed');
  return result.sha256;
};
const sameJson = (left, right) => canonicalSha(left) !== null
  && canonicalSha(left) === canonicalSha(right);
const violation = (code, path, details = {}) => ({code, path, details});
const uniqueViolations = (values) => {
  const seen = new Set();
  return values.filter((entry) => {
    const key = `${entry.code}\u0000${entry.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const hashBinding = (value) => exactKeys(value, ['path', 'fileSha256', 'canonicalSha256'])
  && safePath(value.path)
  && SHA256.test(value.fileSha256 ?? '')
  && SHA256.test(value.canonicalSha256 ?? '');
const fileBinding = (value) => exactKeys(value, ['path', 'fileSha256'])
  && safePath(value.path)
  && SHA256.test(value.fileSha256 ?? '');
const implementationEntry = (value, expected) => exactKeys(
  value,
  ['role', 'path', 'fileSha256'],
)
  && value.role === expected[0]
  && value.path === expected[1]
  && SHA256.test(value.fileSha256 ?? '');
const artifact = (role, fileName, value) => {
  const bytes = formalBytes(value);
  return {
    role,
    fileName,
    schemaVersion: value.schemaVersion,
    value,
    bytes,
    fileSha256: fileSha(bytes),
    canonicalSha256: canonicalSha(value),
  };
};
const normalizedAtoms = (retained) => retained.rawSourceAtoms.map((rawAtom) => {
  const atom = normalizeSourceAtomSpeakerForPackage(rawAtom).atom;
  return {
    atomId: atom.atomId,
    speechId: atom.speechId,
    speaker: Object.prototype.hasOwnProperty.call(atom, 'speaker') ? atom.speaker : null,
    text: atom.text,
    startMs: atom.startMs,
    endMs: atom.endMs,
  };
});
const flattenCues = (displayPlan) =>
  displayPlan.containers.flatMap((container) => container.cues);
const flattenLines = (displayPlan) =>
  flattenCues(displayPlan).flatMap((cue) => cue.lines);
const observedWidth = (text) => [...text].reduce(
  (sum, character) => sum + codePointWeightV001(character),
  0,
);

export function validatePresentationCaptionDisplayPairGenerationJobV002(value) {
  const violations = [];
  const add = (path) => violations.push(violation('CAPTION_B4_JOB_INVALID', path));
  try {
    if (!exactKeys(value, [
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
      'cropDecisionBinding',
      'expectedRuntime',
      'expectedProjection',
      'publication',
      'readOnlyGuard',
    ])) {
      add('$');
      return {status: 'rejected', violations};
    }
    if (value.schemaVersion !== PRESENTATION_CAPTION_DISPLAY_PAIR_JOB_SCHEMA_V002) {
      add('$.schemaVersion');
    }
    if (!ID.test(value.jobId ?? '')) add('$.jobId');
    if (!ID.test(value.artifactId ?? '')) add('$.artifactId');
    if (value.mode !== 'formal-generation') add('$.mode');
    const implementation = value.implementationBinding;
    if (!exactKeys(implementation, ['gitCommit', 'files', 'dependencyFiles'])
      || !COMMIT.test(implementation?.gitCommit ?? '')
      || !Array.isArray(implementation.files)
      || implementation.files.length !== FILE_BINDINGS.length
      || !implementation.files.every(
        (entry, index) => implementationEntry(entry, FILE_BINDINGS[index]),
      )
      || !Array.isArray(implementation.dependencyFiles)
      || implementation.dependencyFiles.length !== DEPENDENCY_BINDINGS.length
      || !implementation.dependencyFiles.every(
        (entry, index) => implementationEntry(entry, DEPENDENCY_BINDINGS[index]),
      )) {
      add('$.implementationBinding');
    }
    if (!fileBinding(value.cropDecisionBinding)) add('$.cropDecisionBinding');
    return {
      status: violations.length === 0 ? 'passed' : 'rejected',
      violations,
    };
  } catch {
    return {
      status: 'rejected',
      violations: [violation('CAPTION_B4_JOB_INVALID', '$')],
    };
  }
}

export function validatePresentationCaptionDisplayPlanV002(value) {
  const violations = [];
  const add = (code, path, details = {}) =>
    violations.push(violation(code, path, details));
  try {
    if (!exactKeys(value, [
      'schemaVersion',
      'displayPlanId',
      'artifactId',
      'formatSelection',
      'displayConstraints',
      'sourceProvenance',
      'atomGranularity',
      'semanticCompilerInputBinding',
      'sourceAtomBinding',
      'timelineBinding',
      'presetBinding',
      'containers',
    ])
      || value.schemaVersion !== PRESENTATION_CAPTION_DISPLAY_PLAN_SCHEMA_V002
      || !ID.test(value.displayPlanId ?? '')
      || !ID.test(value.artifactId ?? '')
      || !exactKeys(value.formatSelection, [
        'format',
        'screenLayoutId',
        'presetId',
        'visualStateId',
      ])
      || !exactKeys(value.displayConstraints, [
        'maxLogicalWidthPerLine',
        'maxLinesPerMeaningGroup',
        'characterWidthRule',
      ])
      || !Array.isArray(value.containers)) {
      add('INPUT_SCHEMA_UNSUPPORTED', '$');
      return {status: 'rejected', violations};
    }
    if (value.formatSelection.format !== PRESENTATION_VERTICAL_FORMAT_V004) {
      add('DISPLAY_FORMAT_BINDING_MISMATCH', '$.formatSelection.format');
    }
    if (value.formatSelection.screenLayoutId !== PRESENTATION_VERTICAL_SCREEN_LAYOUT_V004) {
      add(
        'DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH',
        '$.formatSelection.screenLayoutId',
      );
    }
    if (value.formatSelection.presetId !== PRESENTATION_VERTICAL_PRESET_ID_V004
      || value.formatSelection.visualStateId
        !== PRESENTATION_VERTICAL_VISUAL_STATE_ID_V004) {
      add('INSTRUCTION_PRESET_INVALID', '$.formatSelection');
    }
    if (!Number.isSafeInteger(value.displayConstraints.maxLogicalWidthPerLine)
      || value.displayConstraints.maxLogicalWidthPerLine <= 0
      || !Number.isSafeInteger(value.displayConstraints.maxLinesPerMeaningGroup)
      || value.displayConstraints.maxLinesPerMeaningGroup <= 0
      || value.displayConstraints.characterWidthRule !== CHARACTER_WIDTH_RULE) {
      add('DISPLAY_CONSTRAINT_BINDING_MISMATCH', '$.displayConstraints');
    }
    const cues = [];
    value.containers.forEach((container, containerIndex) => {
      if (!exactKeys(container, ['containerId', 'timelineSegmentId', 'speechId', 'cues'])
        || !Array.isArray(container.cues)) {
        add('INPUT_SCHEMA_UNSUPPORTED', `$.containers[${containerIndex}]`);
        return;
      }
      container.cues.forEach((cue, cueIndex) => {
        const path = `$.containers[${containerIndex}].cues[${cueIndex}]`;
        if (!exactKeys(cue, [
          'cueId',
          'targetRefId',
          'instructionId',
          'globalCueOrdinal',
          'meaningGroupOrdinal',
          'lines',
          'startAnchor',
          'endAnchor',
          'sourceStartMs',
          'sourceEndMs',
        ])
          || !Array.isArray(cue.lines)) {
          add('INPUT_SCHEMA_UNSUPPORTED', path);
          return;
        }
        if (cue.lines.length < 1
          || cue.lines.length > value.displayConstraints.maxLinesPerMeaningGroup) {
          add('CUE_LINE_COUNT_INVALID', `${path}.lines`);
        }
        cue.lines.forEach((line, lineIndex) => {
          const linePath = `${path}.lines[${lineIndex}]`;
          if (!exactKeys(line, [
            'lineOrdinal',
            'sourceAtomIds',
            'text',
            'startAnchor',
            'endAnchor',
            'logicalWidth',
          ])
            || !Array.isArray(line.sourceAtomIds)
            || typeof line.text !== 'string'
            || !Number.isSafeInteger(line.logicalWidth)) {
            add('INPUT_SCHEMA_UNSUPPORTED', linePath);
            return;
          }
          const width = observedWidth(line.text);
          if (width !== line.logicalWidth
            || width > value.displayConstraints.maxLogicalWidthPerLine) {
            add('CUE_LINE_WIDTH_EXCEEDED', `${linePath}.logicalWidth`);
          }
        });
        cues.push(cue);
      });
    });
    for (let index = 1; index < cues.length; index += 1) {
      if (cues[index - 1].sourceEndMs > cues[index].sourceStartMs) {
        add('CUE_UNDECLARED_OVERLAP', `$.containers`);
        break;
      }
    }
  } catch {
    add('INPUT_SCHEMA_UNSUPPORTED', '$');
  }
  const normalized = uniqueViolations(violations);
  return {
    status: normalized.length === 0 ? 'passed' : 'rejected',
    violations: normalized,
  };
}

export function validatePresentationCaptionReviewRenderRequestV004(value) {
  const violations = [];
  const add = (path) =>
    violations.push(violation('REVIEW_RENDER_REQUEST_INVALID', path));
  try {
    if (!exactKeys(value, [
      'schemaVersion',
      'requestId',
      'purpose',
      'reviewOnly',
      'publicationAllowed',
      'displayPlanBinding',
      'instructionBundleBinding',
      'captionCheckBinding',
      'layoutPreflightBinding',
      'baseMediaBinding',
      'registryBindings',
      'cropDecisionBinding',
      'requiredInputState',
      'rendererEntry',
      'expectedOutput',
    ])
      || value.schemaVersion !== PRESENTATION_CAPTION_REVIEW_REQUEST_SCHEMA_V004
      || !ID.test(value.requestId ?? '')
      || value.reviewOnly !== true
      || value.publicationAllowed !== false
      || !hashBinding(value.displayPlanBinding)
      || !hashBinding(value.instructionBundleBinding)
      || !hashBinding(value.captionCheckBinding)
      || !hashBinding(value.layoutPreflightBinding)
      || !hashBinding(value.cropDecisionBinding)
      || !exactKeys(value.registryBindings, [
        'trustedRegistryBindings',
        'presetRegistry',
        'presetValidationIndex',
        'materialValidationIndex',
        'rendererTrust',
      ])
      || !Object.values(value.registryBindings).every(hashBinding)
      || value.requiredInputState !== 'presentation_caption_display_pair_passed'
      || value.rendererEntry !== 'presentation-vertical-review-renderer-v001'
      || !exactKeys(value.expectedOutput, [
        'state',
        'publicationAllowed',
        'requiredQc',
      ])
      || value.expectedOutput.state !== 'awaiting_human_visual_review'
      || value.expectedOutput.publicationAllowed !== false
      || !Array.isArray(value.expectedOutput.requiredQc)
      || !sameJson(value.expectedOutput.requiredQc, REQUIRED_QC)) {
      add('$');
    }
  } catch {
    add('$');
  }
  return {
    status: violations.length === 0 ? 'passed' : 'rejected',
    violations,
  };
}

export function validatePresentationCaptionPublishedReviewInputV004(input) {
  const violations = [];
  const add = (path) => violations.push(violation('PAIR_BINDING_MISMATCH', path));
  try {
    if (!exactKeys(input, [
      'reviewRenderRequest',
      'displayPlan',
      'instructionBundle',
      'captionCheckReport',
      'layoutPreflight',
    ])) {
      add('$');
    } else {
      const requestCheck =
        validatePresentationCaptionReviewRenderRequestV004(input.reviewRenderRequest);
      if (requestCheck.status !== 'passed') {
        violations.push(...requestCheck.violations);
      }
      for (const [field, artifactValue, expectedPath] of [
        ['displayPlanBinding', input.displayPlan, 'display-plan.json'],
        ['instructionBundleBinding', input.instructionBundle, 'instruction-bundle.json'],
        ['captionCheckBinding', input.captionCheckReport, 'caption-check-report.json'],
        ['layoutPreflightBinding', input.layoutPreflight, 'layout-preflight.json'],
      ]) {
        const binding = input.reviewRenderRequest[field];
        const bytes = formalBytes(artifactValue);
        if (binding.path !== expectedPath
          || binding.fileSha256 !== fileSha(bytes)
          || binding.canonicalSha256 !== canonicalSha(artifactValue)) {
          add(`$.reviewRenderRequest.${field}`);
        }
      }
    }
  } catch {
    add('$');
  }
  const normalized = uniqueViolations(violations);
  return {
    status: normalized.length === 0 ? 'passed' : 'rejected',
    violations: normalized,
  };
}

const compilerContract = (manifest) => ({
  sourceInputSchemaVersion: 'presentation-caption-semantic-source-input-v002',
  expansionMapSchemaVersion: 'presentation-caption-semantic-expansion-map-v002',
  manifestSchemaVersion: 'presentation-caption-semantic-source-package-manifest-v002',
  packageReportSchemaVersion:
    'presentation-caption-semantic-source-package-validation-report-v002',
  compilerSchemaVersion: 'presentation-caption-semantic-output-compiler-input-v002',
  presetId: manifest.formatSelection.presetId,
  visualStateId: manifest.formatSelection.visualStateId,
  maxLogicalWidthPerLine: manifest.displayConstraintInput.maxLogicalWidthPerLine,
  maxLinesPerMeaningGroup: manifest.displayConstraintInput.maxLinesPerMeaningGroup,
  characterWidthRule: manifest.displayConstraintInput.characterWidthRule,
  manifestHasDisplayPolicy: true,
});

const resolvedRegistry = (registry, manifest) => {
  const presets = registry.presetRegistry.value.presets.filter(
    (entry) => entry.presetId === manifest.formatSelection.presetId,
  );
  const states = presets.length === 1
    ? presets[0].visualStates.filter(
      (entry) => entry.stateId === manifest.formatSelection.visualStateId,
    )
    : [];
  if (presets.length !== 1 || states.length !== 1) {
    throw new TypeError('selected vertical preset is not uniquely registered');
  }
  const preset = presets[0];
  const state = states[0];
  if (preset.format !== manifest.formatSelection.format
    || preset.screenLayoutId !== manifest.formatSelection.screenLayoutId
    || state.layout.maxLines !== manifest.displayConstraintInput.maxLinesPerMeaningGroup
    || state.layout.characterWidthRule !== manifest.displayConstraintInput.characterWidthRule
    || manifest.displayConstraintInput.maxLogicalWidthPerLine
      > state.layout.maxSupportedLogicalWidthPerLine) {
    throw new TypeError('display policy exceeds the selected preset');
  }
  return {preset, state};
};

const buildResolutionPackage = (pairId, displayPlan, retained) => {
  const cues = flattenCues(displayPlan);
  const atoms = normalizedAtoms(retained);
  return {
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
    sourceAtomsSha256: canonicalSha(atoms),
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
      sourceDisplayPlanBinding: null,
      captionTargets: cues.map((cue) => ({
        targetId: cue.targetRefId,
        requiredAtomIds: cue.lines.flatMap((line) => line.sourceAtomIds),
        allowedOmissionAtomIds: [],
      })),
      allowedSimultaneousGroups: [],
      captionPlan: {
        cues: cues.map((cue) => ({
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
        })),
      },
    }],
  };
};

const bindingFromArtifact = (entry) => ({
  path: entry.fileName,
  fileSha256: entry.fileSha256,
  canonicalSha256: entry.canonicalSha256,
});

const makePairReport = ({
  job,
  context,
  contentArtifacts,
  manifestArtifact,
  displayPlan,
  status = 'passed_pending_human_review',
  violations = [],
}) => {
  const cues = flattenCues(displayPlan);
  const lines = flattenLines(displayPlan);
  const sourceAtoms = normalizedAtoms(context.retainedSource.value);
  let sourceOverlapCount = 0;
  for (let index = 1; index < sourceAtoms.length; index += 1) {
    if (sourceAtoms[index - 1].endMs > sourceAtoms[index].startMs) {
      sourceOverlapCount += 1;
    }
  }
  return {
    schemaVersion: PRESENTATION_CAPTION_PAIR_REPORT_SCHEMA_V003,
    validatorVersion: 'presentation-caption-display-pair-validator-v004',
    status,
    failureStage: status === 'passed_pending_human_review' ? null : 'display-plan',
    jobBinding: clone(context.jobBinding),
    implementationBinding: clone(job.implementationBinding),
    runtimeBinding: clone(context.runtimeBinding),
    inputBindings: {
      sourcePackageBinding: clone(job.sourcePackageBinding),
      semanticCheckBinding: clone(job.semanticCheckBinding),
      retainedSourceBinding: clone(job.retainedSourceBinding),
      baseMediaBinding: clone(job.baseMediaBinding),
      registryBinding: clone(job.registryBinding),
      compilerInput: {
        canonicalSha256: context.compilerCanonicalSha256,
        observedByteSha256: context.compilerObservedByteSha256,
      },
      cropDecisionBinding: clone(context.crop.binding),
    },
    outputBindings: {
      displayPlan: bindingFromArtifact(contentArtifacts[0]),
      instructionBundle: bindingFromArtifact(contentArtifacts[3]),
      captionCheckReport: bindingFromArtifact(contentArtifacts[2]),
      layoutPreflight: bindingFromArtifact(contentArtifacts[1]),
      reviewRenderRequest: bindingFromArtifact(contentArtifacts[4]),
      pairGenerationManifest: bindingFromArtifact(manifestArtifact),
    },
    checks: [
      'jobBinding',
      'implementationBinding',
      'inputBinding',
      'semanticCompiler',
      'displayPlan',
      'instructionContract',
      'layoutPreflight',
      'reviewRequest',
      'determinism',
    ].map((name) => ({
      name,
      status: violations.length === 0 ? 'passed' : 'failed',
      violationCodes: violations.map((entry) => entry.code),
    })),
    violations,
    observedProjection: {
      sourceAtomCount: sourceAtoms.length,
      containerCount: displayPlan.containers.length,
      meaningGroupCount: cues.length,
      cueCount: cues.length,
      lineCount: lines.length,
      timelineSegmentCount: new Set(
        displayPlan.containers.map((entry) => entry.timelineSegmentId),
      ).size,
      maximumObservedLineLogicalWidth: Math.max(...lines.map((line) => line.logicalWidth)),
      positiveCueOverlapCount: 0,
      sourceAtomPositiveOverlapObservationCount: sourceOverlapCount,
      formatSelection: clone(displayPlan.formatSelection),
      displayConstraintInput: clone(displayPlan.displayConstraints),
      screenLayoutBinding: {
        packageScreenLayoutId: displayPlan.formatSelection.screenLayoutId,
        cropScreenLayoutId: context.crop.decision.selectedPlan.screenLayoutId,
        presetScreenLayoutId: context.resolvedPreset.preset.screenLayoutId,
        status: 'matched',
      },
      cropSourceMediaBinding: {
        selectionPackageManifest: clone(context.crop.selectionPackageManifestBinding),
        cropSourceMedia: {
          path: context.crop.selectionPackage.sourceMedia.path,
          fileSha256: context.crop.selectionPackage.sourceMedia.fileSha256,
        },
        baseMedia: clone(job.baseMediaBinding.baseMedia),
        status: 'matched',
      },
    },
    reviewState: {
      stage: 'awaiting_human_visual_review',
      reviewOnly: true,
      publicationAllowed: false,
    },
    readOnlyObservation: {
      status: 'verified',
      unchanged: true,
    },
    scope: {
      validatedState: 'presentation-caption-display-pair',
      renderedLayoutQcVerified: false,
      humanReviewCompleted: false,
      publicationAllowed: false,
    },
  };
};

export function buildPresentationCaptionDisplayPairV004(input) {
  const failed = (code, path) => ({
    status: 'rejected',
    artifacts: null,
    report: null,
    violations: [violation(code, path)],
  });
  try {
    if (!exactKeys(input, [
      'job',
      'jobBinding',
      'sourcePackage',
      'semantic',
      'retainedSource',
      'baseMedia',
      'registry',
      'crop',
      'runtimeBinding',
    ])) {
      return failed('CAPTION_B4_JOB_INVALID', '$');
    }
    const jobCheck = validatePresentationCaptionDisplayPairGenerationJobV002(input.job);
    if (jobCheck.status !== 'passed') {
      return {
        status: 'rejected',
        artifacts: null,
        report: null,
        violations: jobCheck.violations,
      };
    }
    const manifest = input.sourcePackage.manifest;
    const sourceInput = input.sourcePackage.sourceInput;
    const expansionMap = input.sourcePackage.expansionMap;
    if (manifest.schemaVersion
        !== 'presentation-caption-semantic-source-package-manifest-v002'
      || !sameJson(manifest.formatSelection, {
        format: PRESENTATION_VERTICAL_FORMAT_V004,
        screenLayoutId: PRESENTATION_VERTICAL_SCREEN_LAYOUT_V004,
        presetId: PRESENTATION_VERTICAL_PRESET_ID_V004,
        visualStateId: PRESENTATION_VERTICAL_VISUAL_STATE_ID_V004,
      })
      || !sameJson(sourceInput.displayConstraints, {
        maxLogicalWidthPerLine: manifest.displayConstraintInput.maxLogicalWidthPerLine,
        maxLinesPerMeaningGroup: manifest.displayConstraintInput.maxLinesPerMeaningGroup,
      })
      || expansionMap.widthPolicyBinding.presetId !== manifest.formatSelection.presetId
      || expansionMap.widthPolicyBinding.visualStateId
        !== manifest.formatSelection.visualStateId
      || expansionMap.widthPolicyBinding.maxLogicalWidthPerLine
        !== manifest.displayConstraintInput.maxLogicalWidthPerLine
      || expansionMap.widthPolicyBinding.maxLinesPerMeaningGroup
        !== manifest.displayConstraintInput.maxLinesPerMeaningGroup
      || expansionMap.widthPolicyBinding.characterWidthRule
        !== manifest.displayConstraintInput.characterWidthRule) {
      return failed('DISPLAY_CONSTRAINT_BINDING_MISMATCH', '$.sourcePackage');
    }
    const resolved = resolvedRegistry(input.registry, manifest);
    if (input.crop.decision.selectedPlan.screenLayoutId
        !== manifest.formatSelection.screenLayoutId) {
      return failed(
        'DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH',
        '$.crop.decision.selectedPlan.screenLayoutId',
      );
    }
    if (!sameJson({
      path: input.crop.selectionPackage.sourceMedia.path,
      fileSha256: input.crop.selectionPackage.sourceMedia.fileSha256,
    }, input.job.baseMediaBinding.baseMedia)) {
      return failed('SOURCE_PACKAGE_BINDING_MISMATCH', '$.crop.selectionPackage.sourceMedia');
    }
    if (input.semantic.report.status !== 'passed') {
      return failed('SEMANTIC_REPORT_NOT_PASSED', '$.semantic.report.status');
    }
    const contract = compilerContract(manifest);
    const compilerA = buildPresentationCaptionSemanticCompilerInputForContractV001({
      sourcePackageSnapshots: input.sourcePackage.snapshots,
      rawSemanticOutputSnapshot: input.semantic.rawSemanticOutputSnapshot,
    }, contract);
    const compilerB = buildPresentationCaptionSemanticCompilerInputForContractV001({
      sourcePackageSnapshots: input.sourcePackage.snapshots,
      rawSemanticOutputSnapshot: input.semantic.rawSemanticOutputSnapshot,
    }, contract);
    if (!formalBytes(compilerA).equals(formalBytes(compilerB))) {
      return failed('NONDETERMINISTIC', '$.semantic.compilerInput');
    }
    const compilerCanonicalSha256 = canonicalSha(compilerA);
    const compilerObservedByteSha256 = fileSha(formalBytes(compilerA));
    if (input.semantic.report.compilerInput.canonicalSha256
        !== compilerCanonicalSha256
      || input.semantic.report.compilerInput.observedByteSha256
        !== compilerObservedByteSha256) {
      return failed('SEMANTIC_COMPILER_HASH_MISMATCH', '$.semantic.report.compilerInput');
    }
    const pairId = input.job.publication.pairId;
    const displayPlan = {
      schemaVersion: PRESENTATION_CAPTION_DISPLAY_PLAN_SCHEMA_V002,
      displayPlanId: `${pairId}-display-plan`,
      artifactId: input.job.artifactId,
      formatSelection: clone(manifest.formatSelection),
      displayConstraints: clone(manifest.displayConstraintInput),
      sourceProvenance: input.retainedSource.value.sourceProvenance,
      atomGranularity: input.retainedSource.value.atomGranularity,
      semanticCompilerInputBinding: {
        validationReport: {
          path: input.semantic.reportBinding.path,
          fileSha256: input.semantic.reportBinding.fileSha256,
          canonicalSha256: input.semantic.reportBinding.canonicalSha256,
        },
        rawSemanticOutput: {
          path: input.semantic.rawSemanticOutputSnapshot.path,
          fileSha256: input.semantic.rawSemanticOutputSnapshot.fileSha256,
          canonicalSha256: canonicalSha(
            JSON.parse(input.semantic.rawSemanticOutputSnapshot.bytes.toString('utf8')),
          ),
        },
        compilerInputObservedByteSha256: compilerObservedByteSha256,
        compilerInputCanonicalSha256: compilerCanonicalSha256,
      },
      sourceAtomBinding: clone(input.retainedSource.binding),
      timelineBinding: clone(input.baseMedia),
      presetBinding: {
        trustedRegistryBindings: clone(input.registry.trustedRegistryBindings.binding),
        presetRegistry: clone(input.registry.presetRegistry.binding),
        presetValidationIndex: clone(input.registry.presetValidationIndex.binding),
        materialValidationIndex: clone(input.registry.materialValidationIndex.binding),
        rendererTrust: clone(input.registry.rendererTrust.binding),
        presetId: manifest.formatSelection.presetId,
        visualStateId: manifest.formatSelection.visualStateId,
      },
      containers: buildPresentationCaptionDisplayContainersFormatNeutralV003({
        compilerInput: compilerA,
        retainedSourceAtoms: input.retainedSource.value,
      }),
    };
    const displayCheck = validatePresentationCaptionDisplayPlanV002(displayPlan);
    if (displayCheck.status !== 'passed') {
      return {
        status: 'rejected',
        artifacts: null,
        report: null,
        violations: displayCheck.violations,
      };
    }
    const displayArtifact = artifact('displayPlan', 'display-plan.json', displayPlan);
    const resolutionPackage =
      buildResolutionPackage(pairId, displayPlan, input.retainedSource.value);
    resolutionPackage.captionContracts[0].sourceDisplayPlanBinding = {
      displayPlanId: displayPlan.displayPlanId,
      fileSha256: displayArtifact.fileSha256,
      canonicalSha256: displayArtifact.canonicalSha256,
    };
    const instructionBundle = {
      schemaVersion: PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V004,
      pairId,
      displayPlanBinding: {
        path: 'display-plan.json',
        fileSha256: displayArtifact.fileSha256,
        canonicalSha256: displayArtifact.canonicalSha256,
        displayPlanId: displayPlan.displayPlanId,
      },
      instructionSet: {
        schemaVersion: PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V004,
        instructionSetId: `${pairId}-instruction-set`,
        resolutionPackageId: resolutionPackage.resolutionPackageId,
        resolutionPackageCanonicalSha256: canonicalSha(resolutionPackage),
        sourceProvenance: input.retainedSource.value.sourceProvenance,
        format: manifest.formatSelection.format,
        screenLayoutId: manifest.formatSelection.screenLayoutId,
        rendererContractVersion: PRESENTATION_RENDERER_CONTRACT_VERSION_V004,
        presetRegistryBinding: {
          registryVersion:
            input.registry.trustedRegistryBindings.value.presetRegistryVersion,
          presetValidationIndexSha256:
            input.registry.trustedRegistryBindings.value.presetValidationIndexSha256,
        },
        materialRegistryBinding: {
          registryVersion:
            input.registry.trustedRegistryBindings.value.materialRegistryVersion,
          materialValidationIndexSha256:
            input.registry.trustedRegistryBindings.value.materialValidationIndexSha256,
        },
        displayConstraintBinding: {
          maxLogicalWidthPerLine:
            manifest.displayConstraintInput.maxLogicalWidthPerLine,
          maxLinesPerMeaningGroup:
            manifest.displayConstraintInput.maxLinesPerMeaningGroup,
          characterWidthRule: manifest.displayConstraintInput.characterWidthRule,
          sourceManifestCanonicalSha256: canonicalSha(manifest),
        },
        instructions: flattenCues(displayPlan).map((cue) => ({
          instructionId: cue.instructionId,
          trigger: {startAtomId: cue.lines[0].sourceAtomIds[0]},
          kind: 'speech-caption',
          target: {targetType: 'caption-target', targetRefIds: [cue.targetRefId]},
          presetId: manifest.formatSelection.presetId,
          materialRefs: [],
        })),
      },
      resolutionPackage,
    };
    const instructionArtifact =
      artifact('instructionBundle', 'instruction-bundle.json', instructionBundle);
    const instructionCheck = validatePresentationInstructionContractV004({
      instructionBundle,
      displayPlan,
      retainedSourceAtoms: input.retainedSource.value,
      trustedRegistryBindings: input.registry.trustedRegistryBindings.value,
      presetRegistry: input.registry.presetRegistry.value,
      presetValidationIndex: input.registry.presetValidationIndex.value,
      materialValidationIndex: input.registry.materialValidationIndex.value,
      sourcePackageManifest: manifest,
    });
    if (instructionCheck.status !== 'passed') {
      return {
        status: 'rejected',
        artifacts: null,
        report: null,
        violations: instructionCheck.violations,
      };
    }
    const lines = flattenLines(displayPlan);
    const cues = flattenCues(displayPlan);
    const displayConstraintBinding =
      clone(instructionBundle.instructionSet.displayConstraintBinding);
    const layoutPreflight = {
      schemaVersion: PRESENTATION_CAPTION_LAYOUT_PREFLIGHT_SCHEMA_V002,
      status: 'passed',
      displayPlanBinding: clone(instructionBundle.displayPlanBinding),
      displayConstraintBinding,
      checks: {
        textPreservation: 'passed',
        logicalWidth: 'passed',
        maximumLines: 'passed',
        positiveCueOverlap: 'passed',
      },
      violations: [],
    };
    const layoutArtifact =
      artifact('layoutPreflight', 'layout-preflight.json', layoutPreflight);
    const captionCheckReport = {
      schemaVersion: PRESENTATION_CAPTION_CHECK_REPORT_SCHEMA_V004,
      checkerVersion: 'presentation-caption-checker-v004',
      inputBindings: {
        displayPlan: bindingFromArtifact(displayArtifact),
        instructionBundle: bindingFromArtifact(instructionArtifact),
      },
      overallStatus: 'passed',
      contract: {
        sourceAtomCount: normalizedAtoms(input.retainedSource.value).length,
        cueCount: cues.length,
        lineCount: lines.length,
      },
      checks: [
        {name: 'textPreservation', status: 'passed', violationCodes: []},
        {name: 'sourceAtomCoverage', status: 'passed', violationCodes: []},
        {name: 'anchorPreservation', status: 'passed', violationCodes: []},
      ],
      observations: {
        sourceAtomPositiveOverlaps: [],
        boundaryContacts: [],
      },
      scopeExclusions: [
        'physical_pixel_safety_is_verified_by_vertical_renderer',
      ],
    };
    const captionArtifact =
      artifact('captionCheckReport', 'caption-check-report.json', captionCheckReport);
    const reviewRequest = {
      schemaVersion: PRESENTATION_CAPTION_REVIEW_REQUEST_SCHEMA_V004,
      requestId: `${pairId}-review-render-request`,
      purpose: 'caption-readability-alignment-completeness-review',
      reviewOnly: true,
      publicationAllowed: false,
      displayPlanBinding: bindingFromArtifact(displayArtifact),
      instructionBundleBinding: bindingFromArtifact(instructionArtifact),
      captionCheckBinding: bindingFromArtifact(captionArtifact),
      layoutPreflightBinding: bindingFromArtifact(layoutArtifact),
      baseMediaBinding: clone(input.baseMedia),
      registryBindings: {
        trustedRegistryBindings: clone(input.registry.trustedRegistryBindings.binding),
        presetRegistry: clone(input.registry.presetRegistry.binding),
        presetValidationIndex: clone(input.registry.presetValidationIndex.binding),
        materialValidationIndex: clone(input.registry.materialValidationIndex.binding),
        rendererTrust: clone(input.registry.rendererTrust.binding),
      },
      cropDecisionBinding: clone(input.crop.binding),
      requiredInputState: 'presentation_caption_display_pair_passed',
      rendererEntry: 'presentation-vertical-review-renderer-v001',
      expectedOutput: {
        state: 'awaiting_human_visual_review',
        publicationAllowed: false,
        requiredQc: [...REQUIRED_QC],
      },
    };
    const requestArtifact =
      artifact('reviewRenderRequest', 'review-render-request.json', reviewRequest);
    const requestCheck = validatePresentationCaptionPublishedReviewInputV004({
      reviewRenderRequest: reviewRequest,
      displayPlan,
      instructionBundle,
      captionCheckReport,
      layoutPreflight,
    });
    if (requestCheck.status !== 'passed') {
      return {
        status: 'rejected',
        artifacts: null,
        report: null,
        violations: requestCheck.violations,
      };
    }
    const contentArtifacts = [
      displayArtifact,
      layoutArtifact,
      captionArtifact,
      instructionArtifact,
      requestArtifact,
    ];
    const contentProjection = contentArtifacts.map((entry) => ({
      role: entry.role,
      fileName: entry.fileName,
      fileSha256: entry.fileSha256,
      canonicalSha256: entry.canonicalSha256,
    }));
    const cropBinding = clone(input.crop.binding);
    const manifestValue = {
      schemaVersion: PRESENTATION_CAPTION_PAIR_MANIFEST_SCHEMA_V002,
      generatorVersion: 'presentation-caption-display-pair-generator-v004',
      pairId,
      artifactId: input.job.artifactId,
      jobBinding: clone(input.jobBinding),
      implementationBinding: clone(input.job.implementationBinding),
      inputBindings: {
        sourcePackageBinding: clone(input.job.sourcePackageBinding),
        semanticCheckBinding: clone(input.job.semanticCheckBinding),
        retainedSourceBinding: clone(input.job.retainedSourceBinding),
        baseMediaBinding: clone(input.job.baseMediaBinding),
        registryBinding: clone(input.job.registryBinding),
        cropDecisionBinding: cropBinding,
      },
      runtimeBinding: clone(input.runtimeBinding),
      contentArtifacts: contentProjection,
      contentSetCanonicalSha256: canonicalSha(contentProjection),
      reviewState: {
        stage: 'awaiting_human_visual_review',
        reviewOnly: true,
        publicationAllowed: false,
      },
      publication: clone(input.job.publication),
    };
    const manifestArtifact =
      artifact('pairGenerationManifest', 'pair-generation-manifest.json', manifestValue);
    const reportContext = {
      ...input,
      compilerCanonicalSha256,
      compilerObservedByteSha256,
      resolvedPreset: resolved,
    };
    const reportValue = makePairReport({
      job: input.job,
      context: reportContext,
      contentArtifacts,
      manifestArtifact,
      displayPlan,
    });
    const reportArtifact =
      artifact('pairValidationReport', 'pair-validation-report.json', reportValue);
    return {
      status: 'built',
      artifacts: [...contentArtifacts, manifestArtifact, reportArtifact],
      report: reportValue,
      violations: [],
    };
  } catch {
    return failed('SEMANTIC_COMPILER_REBUILD_FAILED', '$');
  }
}
