import {
  canonicalizePresentationCaptionB1JsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  normalizeSourceAtomSpeakerForPackage,
} from './presentation_source_speaker_policy_v001.mjs';
import {
  validatePresentationCaptionContractV003,
} from './presentation_caption_contract_v003.mjs';

export const PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V003 =
  'presentation-instruction-bundle-v003';
export const PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V003 =
  'zev-presentation-instruction-v003';
export const PRESENTATION_RESOLUTION_PACKAGE_SCHEMA_VERSION_V003 =
  'presentation-resolution-package-v003';
export const PRESENTATION_RENDERER_CONTRACT_VERSION_V003 =
  'zev-renderer-boundary-v003-review';
export const PRESENTATION_INSTRUCTION_V003_OWNED_B4_VIOLATION_CODES = Object.freeze([
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
]);

const CODE_INDEX = new Map(
  PRESENTATION_INSTRUCTION_V003_OWNED_B4_VIOLATION_CODES
    .map((code, index) => [code, index]),
);
const ID6 = /^[0-9]{6}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const isString = (value) => typeof value === 'string' && value.length > 0;
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const sameArray = (left, right) => Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((value, index) => value === right[index]);
const canonicalSha = (value) => {
  const canonical = canonicalizePresentationCaptionB1JsonV001(value);
  if (canonical?.status !== 'canonicalized') return null;
  const hash = sha256PresentationCaptionB1BytesV001(canonical.bytes);
  return hash?.status === 'hashed' ? hash.sha256 : null;
};
const makeViolation = (code, path, details = {}) => ({ code, path, details });
const uniqueSorted = (violations) => {
  const seen = new Set();
  return violations
    .filter((violation) => {
      const key = `${violation.code}\u0000${violation.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (
      (CODE_INDEX.get(left.code) ?? 999) - (CODE_INDEX.get(right.code) ?? 999)
      || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    ));
};
const ordinalOf = (value, prefix) => (
  typeof value === 'string' && value.startsWith(prefix) && ID6.test(value.slice(prefix.length))
    ? value.slice(prefix.length)
    : null
);

const normalizedRetainedAtoms = (retainedSourceAtoms) => {
  if (!isObject(retainedSourceAtoms)
    || retainedSourceAtoms.atomGranularity !== 'character-timestamp'
    || !Array.isArray(retainedSourceAtoms.rawSourceAtoms)
    || !isString(retainedSourceAtoms.sourceProvenance)
    || !isObject(retainedSourceAtoms.atomProvenance)) return null;
  try {
    return retainedSourceAtoms.rawSourceAtoms.map((rawAtom) => {
      const normalized = normalizeSourceAtomSpeakerForPackage(rawAtom).atom;
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
  } catch {
    return null;
  }
};

const displayCues = (displayPlan) => (
  Array.isArray(displayPlan?.containers)
    ? displayPlan.containers.flatMap((container) => (
      Array.isArray(container?.cues) ? container.cues : []
    ))
    : []
);

export function validatePresentationInstructionContractV003(input) {
  const violations = [];
  const add = (code, path, details = {}) => violations.push(makeViolation(code, path, details));
  const failed = () => ({
    status: 'failed',
    violations: uniqueSorted(violations),
    captionValidation: null,
  });
  if (!exactKeys(input, [
    'instructionBundle',
    'displayPlan',
    'retainedSourceAtoms',
    'trustedRegistryBindings',
    'presetRegistry',
    'presetValidationIndex',
    'materialValidationIndex',
  ])) {
    add('INSTRUCTION_MAPPING_INVALID', '$.instructionBundle');
    return { status: 'failed', violations: uniqueSorted(violations), captionValidation: null };
  }

  const {
    instructionBundle,
    displayPlan,
    retainedSourceAtoms,
    trustedRegistryBindings,
    presetRegistry,
    presetValidationIndex,
    materialValidationIndex,
  } = input;
  const bundleShape = exactKeys(instructionBundle, [
    'schemaVersion',
    'pairId',
    'displayPlanBinding',
    'instructionSet',
    'resolutionPackage',
  ]);
  const instructionSet = instructionBundle?.instructionSet;
  const instructionSetShape = exactKeys(instructionSet, [
    'schemaVersion',
    'instructionSetId',
    'format',
    'rendererContractVersion',
    'sourceProvenance',
    'resolutionPackageId',
    'resolutionPackageCanonicalSha256',
    'presetRegistryBinding',
    'materialRegistryBinding',
    'instructions',
  ]);
  if (!bundleShape
    || instructionBundle.schemaVersion !== PRESENTATION_INSTRUCTION_BUNDLE_SCHEMA_VERSION_V003
    || !instructionSetShape
    || instructionSet.schemaVersion !== PRESENTATION_INSTRUCTION_SCHEMA_VERSION_V003
    || instructionSet.format !== 'normal-landscape'
    || instructionSet.rendererContractVersion !== PRESENTATION_RENDERER_CONTRACT_VERSION_V003
    || !Array.isArray(instructionSet.instructions)) {
    add('INSTRUCTION_MAPPING_INVALID', '$.instructionBundle');
  }

  const resolution = instructionBundle?.resolutionPackage;
  const resolutionShape = exactKeys(resolution, [
    'schemaVersion',
    'resolutionPackageId',
    'sourceProvenance',
    'atomGranularity',
    'sourceSpeakerNormalization',
    'sourceAtomsSha256',
    'sourceAtoms',
    'targets',
    'captionContracts',
  ]);
  if (!resolutionShape
    || resolution.schemaVersion !== PRESENTATION_RESOLUTION_PACKAGE_SCHEMA_VERSION_V003
    || resolution.atomGranularity !== 'character-timestamp'
    || !Array.isArray(resolution.sourceAtoms)
    || !Array.isArray(resolution.targets)
    || !Array.isArray(resolution.captionContracts)
    || resolution.captionContracts.length !== 1) {
    add('TARGET_MAPPING_INVALID', '$.resolutionPackage');
  }
  if (violations.length > 0) return failed();

  const retainedAtoms = normalizedRetainedAtoms(retainedSourceAtoms);
  if (!retainedAtoms
    || !sameArray(
      resolution?.sourceAtoms?.map((atom) => JSON.stringify(atom)),
      retainedAtoms?.map((atom) => JSON.stringify(atom)),
    )
    || resolution?.sourceAtomsSha256 !== canonicalSha(retainedAtoms)
    || resolution?.sourceProvenance !== retainedSourceAtoms?.sourceProvenance) {
    add('TARGET_MAPPING_INVALID', '$.resolutionPackage.sourceAtoms');
  }
  if (violations.length > 0) return failed();

  const cues = displayCues(displayPlan);
  const targets = Array.isArray(resolution?.targets) ? resolution.targets : [];
  const captionContract = resolution?.captionContracts?.[0];
  const captionTargets = Array.isArray(captionContract?.captionTargets)
    ? captionContract.captionTargets
    : [];
  const captionCues = Array.isArray(captionContract?.captionPlan?.cues)
    ? captionContract.captionPlan.cues
    : [];
  const instructions = Array.isArray(instructionSet?.instructions)
    ? instructionSet.instructions
    : [];
  const atomIndex = new Map(
    (resolution?.sourceAtoms ?? []).map((atom, index) => [atom.atomId, index]),
  );

  targets.forEach((target, index) => {
    const ordinal = ordinalOf(target?.targetRefId, 'caption-target-');
    if (!exactKeys(target, ['targetRefId', 'targetType', 'captionContractRefId', 'cueId'])
      || ordinal === null
      || target.targetType !== 'caption-target'
      || target.captionContractRefId !== 'caption-contract-v003') {
      add('TARGET_ID_INVALID', `$.resolutionPackage.targets[${index}].targetRefId`);
    }
  });
  if (violations.length > 0) return failed();

  targets.forEach((target, index) => {
    const ordinal = ordinalOf(target.targetRefId, 'caption-target-');
    const cue = cues[index];
    if (!cue
      || target.cueId !== cue.cueId
      || ordinalOf(cue.cueId, 'caption-cue-') !== ordinal
      || ordinalOf(cue.targetRefId, 'caption-target-') !== ordinal) {
      add('TARGET_MAPPING_INVALID', `$.resolutionPackage.targets[${index}]`);
    }
  });
  if (targets.length !== cues.length || targets.length !== captionTargets.length) {
    add('TARGET_MAPPING_INVALID', '$.resolutionPackage.targets');
  }
  if (violations.length > 0) return failed();

  captionTargets.forEach((target, index) => {
    const path = `$.resolutionPackage.captionContracts[0].captionTargets[${index}]`;
    const actual = target?.requiredAtomIds;
    if (!Array.isArray(actual) || actual.length === 0) {
      add('TARGET_ATOM_MISSING', `${path}.requiredAtomIds`);
    }
  });
  if (violations.length > 0) return failed();

  captionTargets.forEach((target, index) => {
    const path = `$.resolutionPackage.captionContracts[0].captionTargets[${index}]`;
    const actual = target.requiredAtomIds;
    const duplicateIndex = actual.findIndex((atomId, atomIndexValue) =>
      actual.indexOf(atomId) !== atomIndexValue);
    if (duplicateIndex >= 0) {
      add('TARGET_ATOM_DUPLICATED', `${path}.requiredAtomIds[${duplicateIndex}]`);
    }
  });
  if (violations.length > 0) return failed();

  captionTargets.forEach((target, index) => {
    const path = `$.resolutionPackage.captionContracts[0].captionTargets[${index}]`;
    const actual = target.requiredAtomIds;
    const positions = actual.map((atomId) => atomIndex.get(atomId));
    if (positions.some((position, positionIndex) =>
      positionIndex > 0 && position < positions[positionIndex - 1])) {
      add('TARGET_ATOM_ORDER_REVERSED', `${path}.requiredAtomIds`);
    }
  });
  if (violations.length > 0) return failed();

  captionTargets.forEach((target, index) => {
    const cue = cues[index];
    const path = `$.resolutionPackage.captionContracts[0].captionTargets[${index}]`;
    const actual = target.requiredAtomIds;
    const expected = cue?.lines?.flatMap((line) => line.sourceAtomIds ?? []) ?? [];
    if (!sameArray(actual, expected)) {
      add('TARGET_ATOM_MISSING', `${path}.requiredAtomIds`);
    }
  });
  if (violations.length > 0) return failed();

  captionTargets.forEach((target, index) => {
    const path = `$.resolutionPackage.captionContracts[0].captionTargets[${index}]`;
    if (!Array.isArray(target?.allowedOmissionAtomIds)
      || target.allowedOmissionAtomIds.length > 0) {
      add('TARGET_OMISSION_NOT_EMPTY', `${path}.allowedOmissionAtomIds`);
    }
  });
  if (violations.length > 0) return failed();

  instructions.forEach((instruction, index) => {
    const ordinal = ordinalOf(instruction?.instructionId, 'caption-instruction-');
    if (ordinal === null) {
      add('INSTRUCTION_ID_INVALID', `$.instructionBundle.instructionSet.instructions[${index}].instructionId`);
    }
  });
  if (violations.length > 0) return failed();

  instructions.forEach((instruction, index) => {
    const ordinal = ordinalOf(instruction.instructionId, 'caption-instruction-');
    const target = targets[index];
    const cue = cues[index];
    if (!exactKeys(instruction, ['instructionId', 'trigger', 'kind', 'target', 'presetId', 'materialRefs'])
      || !target
      || !cue
      || instruction.target?.targetType !== 'caption-target'
      || !sameArray(instruction.target?.targetRefIds, [target.targetRefId])
      || ordinalOf(target.targetRefId, 'caption-target-') !== ordinal
      || ordinalOf(cue.cueId, 'caption-cue-') !== ordinal) {
      add('INSTRUCTION_MAPPING_INVALID', `$.instructionBundle.instructionSet.instructions[${index}]`);
    }
  });
  if (instructions.length !== targets.length || instructions.length !== captionCues.length) {
    add('INSTRUCTION_MAPPING_INVALID', '$.instructionBundle.instructionSet.instructions');
  }
  if (violations.length > 0) return failed();

  instructions.forEach((instruction, index) => {
    if (instruction.kind !== 'speech-caption') {
      add('INSTRUCTION_KIND_INVALID', `$.instructionBundle.instructionSet.instructions[${index}].kind`);
    }
  });
  if (violations.length > 0) return failed();

  instructions.forEach((instruction, index) => {
    const trustedPreset = trustedRegistryBindings?.presetRegistryVersion;
    const indexPreset = presetValidationIndex?.registryVersion;
    if (instruction.presetId !== 'normal-landscape-readable-pop-v001'
      || trustedPreset !== 'normal-landscape-preset-registry-v001'
      || indexPreset !== trustedPreset
      || presetRegistry?.registryVersion !== trustedPreset) {
      add('INSTRUCTION_PRESET_INVALID', `$.instructionBundle.instructionSet.instructions[${index}].presetId`);
    }
  });
  if (violations.length > 0) return failed();

  instructions.forEach((instruction, index) => {
    if (!Array.isArray(instruction.materialRefs) || instruction.materialRefs.length !== 0
      || materialValidationIndex?.registryVersion
        !== trustedRegistryBindings?.materialRegistryVersion) {
      add('INSTRUCTION_MATERIAL_NOT_EMPTY', `$.instructionBundle.instructionSet.instructions[${index}].materialRefs`);
    }
  });
  if (violations.length > 0) return failed();

  instructions.forEach((instruction, index) => {
    const cue = cues[index];
    const firstAtomId = cue?.lines?.[0]?.sourceAtomIds?.[0];
    if (!exactKeys(instruction.trigger, ['startAtomId'])
      || instruction.trigger.startAtomId !== firstAtomId) {
      add('INSTRUCTION_TRIGGER_MISMATCH', `$.instructionBundle.instructionSet.instructions[${index}].trigger.startAtomId`);
    }
  });
  if (violations.length > 0) return failed();

  let captionValidation = null;
  if (resolutionShape && captionContract && isObject(displayPlan)) {
    captionValidation = validatePresentationCaptionContractV003({
      format: instructionSet?.format,
      source: {
        atomGranularity: resolution.atomGranularity,
        atomProvenance: retainedSourceAtoms?.atomProvenance,
        atoms: resolution.sourceAtoms,
      },
      captionContract,
      expectedDisplayPlanBinding: {
        displayPlanId: displayPlan.displayPlanId,
        fileSha256: instructionBundle?.displayPlanBinding?.fileSha256,
        canonicalSha256: instructionBundle?.displayPlanBinding?.canonicalSha256,
      },
    });
  }
  const sorted = uniqueSorted(violations);
  const status = sorted.length > 0 || captionValidation?.status === 'failed'
    ? 'failed'
    : captionValidation?.status ?? 'failed';
  return { status, violations: sorted, captionValidation };
}
