import {
  canonicalizePresentationCaptionB1JsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_INSTRUCTION_V003_OWNED_B4_VIOLATION_CODES,
  validatePresentationInstructionContractFormatNeutralV003,
} from './presentation_instruction_contract_v003.mjs';

export const PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V004 =
  'presentation-instruction-bundle-v004';
export const PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V004 =
  'zev-presentation-instruction-v004';
export const PRESENTATION_RENDERER_CONTRACT_VERSION_V004 =
  'zev-renderer-boundary-v004-review';
export const PRESENTATION_VERTICAL_FORMAT_V004 = 'vertical-short-1080x1920';
export const PRESENTATION_VERTICAL_SCREEN_LAYOUT_V004 = 'speaker_only';
export const PRESENTATION_VERTICAL_PRESET_ID_V004 =
  'vertical-short-speaker-only-readable-pop-v001';
export const PRESENTATION_VERTICAL_VISUAL_STATE_ID_V004 =
  'caption-core-vertical-speaker-only-v001';

export const PRESENTATION_INSTRUCTION_V004_OWNED_B4_VIOLATION_CODES = Object.freeze([
  ...PRESENTATION_INSTRUCTION_V003_OWNED_B4_VIOLATION_CODES,
  'DISPLAY_FORMAT_BINDING_MISMATCH',
  'DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH',
  'DISPLAY_CONSTRAINT_BINDING_MISMATCH',
]);

const SHA256 = /^[0-9a-f]{64}$/;
const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const canonicalSha = (value) => {
  const canonical = canonicalizePresentationCaptionB1JsonV001(value);
  if (canonical?.status !== 'canonicalized') return null;
  const result = sha256PresentationCaptionB1BytesV001(canonical.bytes);
  return result?.status === 'hashed' ? result.sha256 : null;
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

const VERTICAL_PROFILE = Object.freeze({
  bundleSchemaVersion: PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V004,
  instructionSchemaVersion: PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V004,
  bundleKeys: Object.freeze([
    'schemaVersion',
    'pairId',
    'displayPlanBinding',
    'instructionSet',
    'resolutionPackage',
  ]),
  instructionSetKeys: Object.freeze([
    'schemaVersion',
    'instructionSetId',
    'resolutionPackageId',
    'resolutionPackageCanonicalSha256',
    'sourceProvenance',
    'format',
    'screenLayoutId',
    'rendererContractVersion',
    'presetRegistryBinding',
    'materialRegistryBinding',
    'displayConstraintBinding',
    'instructions',
  ]),
  format: PRESENTATION_VERTICAL_FORMAT_V004,
  screenLayoutId: PRESENTATION_VERTICAL_SCREEN_LAYOUT_V004,
  rendererContractVersion: PRESENTATION_RENDERER_CONTRACT_VERSION_V004,
  presetId: PRESENTATION_VERTICAL_PRESET_ID_V004,
  presetRegistryVersion: 'vertical-short-preset-registry-v001',
  captionValidationMode: 'shared-mapping-only',
});

const validHashBinding = (value, withDisplayPlanId = false) => exactKeys(
  value,
  withDisplayPlanId
    ? ['path', 'fileSha256', 'canonicalSha256', 'displayPlanId']
    : ['path', 'fileSha256', 'canonicalSha256'],
)
  && typeof value.path === 'string'
  && value.path.length > 0
  && SHA256.test(value.fileSha256 ?? '')
  && SHA256.test(value.canonicalSha256 ?? '')
  && (!withDisplayPlanId
    || (typeof value.displayPlanId === 'string' && value.displayPlanId.length > 0));

export function validatePresentationInstructionContractV004(input) {
  const violations = [];
  const add = (code, path, details = {}) =>
    violations.push(violation(code, path, details));
  try {
    if (!exactKeys(input, [
      'instructionBundle',
      'displayPlan',
      'retainedSourceAtoms',
      'trustedRegistryBindings',
      'presetRegistry',
      'presetValidationIndex',
      'materialValidationIndex',
      'sourcePackageManifest',
    ])) {
      add('INSTRUCTION_MAPPING_INVALID', '$');
      return {status: 'rejected', violations, captionValidation: null};
    }
    const {instructionBundle, displayPlan, sourcePackageManifest} = input;
    const instructionSet = instructionBundle?.instructionSet;
    if (!exactKeys(instructionBundle, VERTICAL_PROFILE.bundleKeys)
      || instructionBundle.schemaVersion
        !== PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V004
      || !validHashBinding(instructionBundle.displayPlanBinding, true)
      || !exactKeys(instructionSet, VERTICAL_PROFILE.instructionSetKeys)
      || instructionSet.schemaVersion !== PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V004
      || instructionSet.format !== PRESENTATION_VERTICAL_FORMAT_V004
      || instructionSet.screenLayoutId !== PRESENTATION_VERTICAL_SCREEN_LAYOUT_V004
      || instructionSet.rendererContractVersion
        !== PRESENTATION_RENDERER_CONTRACT_VERSION_V004
      || !exactKeys(instructionSet.displayConstraintBinding, [
        'maxLogicalWidthPerLine',
        'maxLinesPerMeaningGroup',
        'characterWidthRule',
        'sourceManifestCanonicalSha256',
      ])) {
      add('INSTRUCTION_MAPPING_INVALID', '$.instructionBundle');
    }
    if (!exactKeys(displayPlan, [
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
      || displayPlan.schemaVersion !== 'presentation-caption-display-plan-v002') {
      add('INSTRUCTION_MAPPING_INVALID', '$.displayPlan');
    }
    if (violations.length > 0) {
      return {status: 'rejected', violations: uniqueViolations(violations), captionValidation: null};
    }
    if (displayPlan.formatSelection.format !== PRESENTATION_VERTICAL_FORMAT_V004
      || instructionSet.format !== displayPlan.formatSelection.format) {
      add('DISPLAY_FORMAT_BINDING_MISMATCH', '$.instructionBundle.instructionSet.format');
    }
    if (displayPlan.formatSelection.screenLayoutId
        !== PRESENTATION_VERTICAL_SCREEN_LAYOUT_V004
      || instructionSet.screenLayoutId
        !== displayPlan.formatSelection.screenLayoutId) {
      add(
        'DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH',
        '$.instructionBundle.instructionSet.screenLayoutId',
      );
    }
    if (displayPlan.formatSelection.presetId !== PRESENTATION_VERTICAL_PRESET_ID_V004
      || displayPlan.formatSelection.visualStateId
        !== PRESENTATION_VERTICAL_VISUAL_STATE_ID_V004) {
      add('INSTRUCTION_PRESET_INVALID', '$.displayPlan.formatSelection');
    }
    const expectedConstraintBinding = {
      maxLogicalWidthPerLine: displayPlan.displayConstraints.maxLogicalWidthPerLine,
      maxLinesPerMeaningGroup: displayPlan.displayConstraints.maxLinesPerMeaningGroup,
      characterWidthRule: displayPlan.displayConstraints.characterWidthRule,
      sourceManifestCanonicalSha256: canonicalSha(sourcePackageManifest),
    };
    if (!sameJson(instructionSet.displayConstraintBinding, expectedConstraintBinding)
      || !sameJson(displayPlan.formatSelection, sourcePackageManifest?.formatSelection)
      || !sameJson(
        displayPlan.displayConstraints,
        sourcePackageManifest?.displayConstraintInput,
      )) {
      add(
        'DISPLAY_CONSTRAINT_BINDING_MISMATCH',
        '$.instructionBundle.instructionSet.displayConstraintBinding',
      );
    }
    if (instructionBundle.displayPlanBinding.displayPlanId !== displayPlan.displayPlanId
      || instructionBundle.displayPlanBinding.canonicalSha256 !== canonicalSha(displayPlan)) {
      add('INSTRUCTION_MAPPING_INVALID', '$.instructionBundle.displayPlanBinding');
    }
    const shared = validatePresentationInstructionContractFormatNeutralV003({
      instructionBundle,
      displayPlan,
      retainedSourceAtoms: input.retainedSourceAtoms,
      trustedRegistryBindings: input.trustedRegistryBindings,
      presetRegistry: input.presetRegistry,
      presetValidationIndex: input.presetValidationIndex,
      materialValidationIndex: input.materialValidationIndex,
    }, VERTICAL_PROFILE);
    violations.push(...shared.violations);
    const normalized = uniqueViolations(violations);
    return {
      status: normalized.length === 0 && shared.status !== 'failed'
        ? 'passed'
        : 'rejected',
      violations: normalized,
      captionValidation: shared.captionValidation,
    };
  } catch {
    add('INSTRUCTION_MAPPING_INVALID', '$');
    return {
      status: 'rejected',
      violations: uniqueViolations(violations),
      captionValidation: null,
    };
  }
}
