import { createHash } from 'node:crypto';

import {
  canonicalJson,
  validatePresentationCaptionContract,
} from './presentation_caption_contract.mjs';

export const PRESENTATION_INSTRUCTION_CHECK_SCHEMA_VERSION = 'presentation-instruction-check-v001';
export const PRESENTATION_INSTRUCTION_SCHEMA_VERSION = 'zev-presentation-instruction-v001';
export const PRESENTATION_RESOLUTION_PACKAGE_SCHEMA_VERSION = 'presentation-resolution-package-v001';
export const PRESENTATION_REGISTRY_TRUST_SCHEMA_VERSION = 'presentation-registry-trust-v001';
export const PRESENTATION_RENDERER_CONTRACT_VERSION = 'zev-renderer-boundary-v001';
export const PRESENTATION_INSTRUCTION_CHECKER_VERSION = 'presentation-instruction-checker-v001';

const CONTRACT_CODES = Object.freeze([
  'BUNDLE_INPUT_NOT_OBJECT',
  'BUNDLE_SCHEMA_VERSION_UNSUPPORTED',
  'BUNDLE_UNKNOWN_FIELD',
  'TRUST_BINDING_NOT_OBJECT',
  'TRUST_BINDING_SCHEMA_VERSION_UNSUPPORTED',
  'TRUST_BINDING_UNKNOWN_FIELD',
  'TRUST_BINDING_VERSION_INVALID',
  'TRUST_BINDING_HASH_INVALID',
  'TRUST_PRESET_VERSION_MISMATCH',
  'TRUST_PRESET_HASH_MISMATCH',
  'TRUST_MATERIAL_VERSION_MISMATCH',
  'TRUST_MATERIAL_HASH_MISMATCH',
]);

const INSTRUCTION_CODES = Object.freeze([
  'INSTRUCTION_SET_NOT_OBJECT',
  'INSTRUCTION_SET_SCHEMA_VERSION_UNSUPPORTED',
  'INSTRUCTION_SET_UNKNOWN_FIELD',
  'INSTRUCTION_SET_ID_INVALID',
  'INSTRUCTION_SET_FORMAT_UNSUPPORTED',
  'INSTRUCTION_SET_RENDERER_CONTRACT_VERSION_UNSUPPORTED',
  'INSTRUCTION_SET_SOURCE_PROVENANCE_INVALID',
  'INSTRUCTION_SET_RESOLUTION_PACKAGE_ID_INVALID',
  'INSTRUCTION_SET_RESOLUTION_PACKAGE_HASH_INVALID',
  'INSTRUCTION_SET_REGISTRY_VERSION_INVALID',
  'INSTRUCTION_SET_REGISTRY_VERSION_MISMATCH',
  'INSTRUCTION_SET_INSTRUCTIONS_NOT_ARRAY',
  'INSTRUCTION_NOT_OBJECT',
  'INSTRUCTION_UNKNOWN_FIELD',
  'INSTRUCTION_ID_INVALID',
  'INSTRUCTION_DUPLICATE_ID',
  'INSTRUCTION_TRIGGER_INVALID',
  'INSTRUCTION_TRIGGER_UNKNOWN_ATOM',
  'INSTRUCTION_KIND_UNSUPPORTED',
  'INSTRUCTION_TARGET_INVALID',
  'INSTRUCTION_TARGET_CARDINALITY_INVALID',
  'INSTRUCTION_KIND_TARGET_MISMATCH',
  'INSTRUCTION_TARGET_REFERENCE_UNKNOWN',
  'INSTRUCTION_TRIGGER_OUTSIDE_TARGET',
  'INSTRUCTION_PRESET_ID_INVALID',
  'INSTRUCTION_MATERIAL_REFS_INVALID',
  'INSTRUCTION_MATERIAL_REF_INVALID',
  'INSTRUCTION_DUPLICATE_MATERIAL_REF',
  'INSTRUCTION_CAPTION_TRIGGER_MISMATCH',
  'INSTRUCTION_CAPTION_CUE_REUSED',
]);

const RESOLUTION_CODES = Object.freeze([
  'RESOLUTION_PACKAGE_NOT_OBJECT',
  'RESOLUTION_PACKAGE_SCHEMA_VERSION_UNSUPPORTED',
  'RESOLUTION_PACKAGE_UNKNOWN_FIELD',
  'RESOLUTION_PACKAGE_ID_INVALID',
  'RESOLUTION_PACKAGE_ID_MISMATCH',
  'RESOLUTION_PACKAGE_HASH_MISMATCH',
  'RESOLUTION_PACKAGE_SOURCE_PROVENANCE_INVALID',
  'RESOLUTION_PACKAGE_SOURCE_PROVENANCE_MISMATCH',
  'RESOLUTION_PACKAGE_ATOM_GRANULARITY_UNSUPPORTED',
  'RESOLUTION_PACKAGE_SOURCE_ATOMS_NOT_ARRAY',
  'RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_INVALID',
  'RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_MISMATCH',
  'RESOLUTION_PACKAGE_TARGETS_NOT_ARRAY',
  'RESOLUTION_PACKAGE_CAPTION_CONTRACTS_NOT_ARRAY',
  'RESOLUTION_PACKAGE_CAPTION_CONTRACT_COUNT_UNSUPPORTED',
  'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
  'TARGET_ENTRY_INVALID',
  'TARGET_ENTRY_ID_INVALID',
  'TARGET_ENTRY_DUPLICATE_ID',
  'TARGET_ENTRY_TYPE_UNSUPPORTED',
  'TARGET_ENTRY_TYPE_PAYLOAD_INVALID',
  'TARGET_ENTRY_SOURCE_ATOMS_INVALID',
  'TARGET_ENTRY_SOURCE_ATOM_UNKNOWN',
  'TARGET_ENTRY_SOURCE_ORDER_REVERSED',
  'TARGET_WITHOUT_INSTRUCTION',
  'CAPTION_CONTRACT_ENTRY_INVALID',
  'CAPTION_CONTRACT_ID_INVALID',
  'CAPTION_CONTRACT_DUPLICATE_ID',
  'CAPTION_CONTRACT_SCHEMA_VERSION_UNSUPPORTED',
  'CAPTION_CONTRACT_WITHOUT_TARGET',
  'CAPTION_TARGET_CUE_UNKNOWN',
  'CAPTION_TARGET_CUE_AMBIGUOUS',
  'CAPTION_CUE_IN_MULTIPLE_TARGETS',
  'CAPTION_CUE_WITHOUT_INSTRUCTION',
]);

const PRESET_CODES = Object.freeze([
  'PRESET_INDEX_INVALID',
  'PRESET_INDEX_UNKNOWN_FIELD',
  'PRESET_INDEX_VERSION_INVALID',
  'PRESET_ENTRY_INVALID',
  'PRESET_ENTRY_ID_INVALID',
  'PRESET_ENTRY_DUPLICATE_ID',
  'PRESET_ENTRY_FORMAT_UNSUPPORTED',
  'PRESET_KIND_POLICIES_INVALID',
  'PRESET_KIND_POLICY_INVALID',
  'PRESET_KIND_POLICY_DUPLICATE',
  'PRESET_KIND_UNSUPPORTED',
  'PRESET_END_RESPONSIBILITY_INVALID',
  'PRESET_END_POLICY_FORBIDDEN',
  'PRESET_END_POLICY_MISSING',
  'PRESET_MATERIAL_ROLES_INVALID',
  'PRESET_MATERIAL_ROLE_UNSUPPORTED',
  'PRESET_REQUIRED_ROLE_NOT_ALLOWED',
  'INSTRUCTION_PRESET_UNKNOWN',
  'INSTRUCTION_PRESET_KIND_UNSUPPORTED',
]);

const MATERIAL_CODES = Object.freeze([
  'MATERIAL_INDEX_INVALID',
  'MATERIAL_INDEX_UNKNOWN_FIELD',
  'MATERIAL_INDEX_VERSION_INVALID',
  'MATERIAL_ENTRY_INVALID',
  'MATERIAL_ENTRY_ID_INVALID',
  'MATERIAL_ENTRY_DUPLICATE_ID',
  'MATERIAL_ROLE_UNSUPPORTED',
  'MATERIAL_COMPATIBLE_SUBJECTS_INVALID',
  'MATERIAL_SUBJECT_TYPE_UNSUPPORTED',
  'INSTRUCTION_MATERIAL_UNKNOWN',
  'INSTRUCTION_MATERIAL_ROLE_UNSUPPORTED',
  'INSTRUCTION_MATERIAL_TARGET_MISMATCH',
  'INSTRUCTION_REQUIRED_MATERIAL_MISSING',
  'INSTRUCTION_REFERENCE_MATERIAL_MISSING',
]);

export const PRESENTATION_INSTRUCTION_VIOLATION_CODES = Object.freeze([
  ...CONTRACT_CODES,
  ...INSTRUCTION_CODES.slice(0, 12),
  ...RESOLUTION_CODES.slice(0, 16),
  ...RESOLUTION_CODES.slice(16),
  ...INSTRUCTION_CODES.slice(12),
  ...PRESET_CODES,
  ...MATERIAL_CODES,
]);

export const PRESENTATION_INSTRUCTION_SCOPE_EXCLUSIONS = Object.freeze([
  'G4_TO_G7_SEMANTIC_CORRECTNESS_NOT_VERIFIED',
  'PRESET_VISUAL_QUALITY_NOT_VERIFIED',
  'POST_RENDER_QC_NOT_VERIFIED',
  'VISUAL_ONLY_TRIGGER_NOT_SUPPORTED',
  'INSTRUCTION_TEMPORAL_COLLISION_NOT_VERIFIED',
]);

const SUPPORTED_FORMAT = 'normal-landscape';
const SUPPORTED_GRANULARITIES = new Set(['word-timestamp', 'character-timestamp']);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const KINDS = Object.freeze([
  'speech-caption',
  'emphasis-important-statement',
  'emphasis-mistake-realization',
  'emphasis-discovery',
  'emphasis-strong-emotion',
  'information-comment',
  'information-narration',
  'information-lyrics',
  'speaker-identification',
  'reference-supplement',
]);
const KIND_SET = new Set(KINDS);

const TARGET_TYPE_BY_KIND = Object.freeze({
  'speech-caption': 'caption-target',
  'emphasis-important-statement': 'source-atom-range',
  'emphasis-mistake-realization': 'source-atom-range',
  'emphasis-discovery': 'source-atom-range',
  'emphasis-strong-emotion': 'source-atom-range',
  'information-comment': 'information-item',
  'information-narration': 'information-item',
  'information-lyrics': 'information-item',
  'speaker-identification': 'speaker',
  'reference-supplement': 'reference-subject',
});

const ALLOWED_ROLES_BY_KIND = Object.freeze({
  'speech-caption': [],
  'emphasis-important-statement': [],
  'emphasis-mistake-realization': [],
  'emphasis-discovery': [],
  'emphasis-strong-emotion': [],
  'information-comment': ['speaker-icon'],
  'information-narration': [],
  'information-lyrics': [],
  'speaker-identification': ['speaker-icon'],
  'reference-supplement': ['reference-image', 'reference-video'],
});

const MATERIAL_ROLES = new Set(['speaker-icon', 'reference-image', 'reference-video']);
const TARGET_TYPES = new Set([
  'caption-target',
  'source-atom-range',
  'information-item',
  'speaker',
  'reference-subject',
]);

const CODE_GRAMMAR = new Map([
  ...CONTRACT_CODES.map((code) => [code, 'CONTRACT']),
  ...INSTRUCTION_CODES.map((code) => [code, 'INSTRUCTION']),
  ...RESOLUTION_CODES.map((code) => [code, 'RESOLUTION']),
  ...PRESET_CODES.map((code) => [code, 'PRESET']),
  ...MATERIAL_CODES.map((code) => [code, 'MATERIAL']),
]);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isSha256 = (value) => typeof value === 'string' && SHA256_PATTERN.test(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const sha256Canonical = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

const makeIssue = (code, path, relatedIds = [], details = undefined) => {
  const issue = {
    grammar: CODE_GRAMMAR.get(code),
    code,
    path,
    message: '承認済みの演出指示書契約に適合しません。',
    relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  };
  if (details !== undefined) issue.details = canonicalize(details);
  return issue;
};

const issueSortKey = (issue) => [
  issue.grammar,
  issue.code,
  issue.path,
  issue.relatedIds.join(','),
  canonicalJson(issue.details ?? null),
].join('\u0000');

const sortIssues = (issues) => issues.sort((left, right) => (
  issueSortKey(left).localeCompare(issueSortKey(right), 'en')
));

const statusFor = (violations) => (violations.length > 0 ? 'failed' : 'passed');

const countValidIds = (values, readId) => {
  const counts = new Map();
  for (const value of values) {
    const id = readId(value);
    if (isNonEmptyString(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
};

const rejectUnknownFields = (value, allowedFields, code, path, addIssue) => {
  if (!isObject(value)) return;
  const allowed = new Set(allowedFields);
  for (const field of Object.keys(value).sort()) {
    if (!allowed.has(field)) addIssue(code, `${path}.${field}`);
  }
};

const validateUniqueStringArray = (value) => (
  Array.isArray(value)
  && value.every(isNonEmptyString)
  && new Set(value).size === value.length
);

const getTargetSubject = (target) => {
  if (!isObject(target)) return null;
  if (target.targetType === 'speaker' && isNonEmptyString(target.speakerId)) {
    return { subjectType: 'speaker', subjectId: target.speakerId };
  }
  if (target.targetType === 'information-item' && isNonEmptyString(target.speakerId)) {
    return { subjectType: 'speaker', subjectId: target.speakerId };
  }
  if (target.targetType === 'reference-subject' && isNonEmptyString(target.referenceSubjectId)) {
    return { subjectType: 'reference-subject', subjectId: target.referenceSubjectId };
  }
  return null;
};

const subjectKey = (subject) => `${subject.subjectType}\u0000${subject.subjectId}`;

export function validatePresentationInstructionContract(bundleInput, trustedRegistryBindingsInput) {
  const buckets = {
    contract: [],
    instructionEnvelope: [],
    resolutionIntegrity: [],
    presetCompatibility: [],
    materialCompatibility: [],
  };
  const addIssue = (code, path, relatedIds = [], details = undefined) => {
    const issue = makeIssue(code, path, relatedIds, details);
    if (issue.grammar === 'CONTRACT') buckets.contract.push(issue);
    else if (issue.grammar === 'INSTRUCTION') buckets.instructionEnvelope.push(issue);
    else if (issue.grammar === 'RESOLUTION') buckets.resolutionIntegrity.push(issue);
    else if (issue.grammar === 'PRESET') buckets.presetCompatibility.push(issue);
    else if (issue.grammar === 'MATERIAL') buckets.materialCompatibility.push(issue);
    else throw new Error(`Unmapped presentation instruction violation code: ${code}`);
  };

  if (!isObject(bundleInput)) addIssue('BUNDLE_INPUT_NOT_OBJECT', '$');
  const bundle = isObject(bundleInput) ? bundleInput : {};
  rejectUnknownFields(
    bundle,
    ['schemaVersion', 'instructionSet', 'resolutionPackage', 'presetValidationIndex', 'materialValidationIndex'],
    'BUNDLE_UNKNOWN_FIELD',
    '$',
    addIssue,
  );
  if (bundle.schemaVersion !== PRESENTATION_INSTRUCTION_CHECK_SCHEMA_VERSION) {
    addIssue('BUNDLE_SCHEMA_VERSION_UNSUPPORTED', '$.schemaVersion');
  }

  if (!isObject(trustedRegistryBindingsInput)) addIssue('TRUST_BINDING_NOT_OBJECT', '$trustedRegistryBindings');
  const trust = isObject(trustedRegistryBindingsInput) ? trustedRegistryBindingsInput : {};
  rejectUnknownFields(
    trust,
    [
      'schemaVersion',
      'presetRegistryVersion',
      'presetValidationIndexSha256',
      'materialRegistryVersion',
      'materialValidationIndexSha256',
    ],
    'TRUST_BINDING_UNKNOWN_FIELD',
    '$trustedRegistryBindings',
    addIssue,
  );
  if (trust.schemaVersion !== PRESENTATION_REGISTRY_TRUST_SCHEMA_VERSION) {
    addIssue('TRUST_BINDING_SCHEMA_VERSION_UNSUPPORTED', '$trustedRegistryBindings.schemaVersion');
  }
  for (const field of ['presetRegistryVersion', 'materialRegistryVersion']) {
    if (!isNonEmptyString(trust[field])) {
      addIssue('TRUST_BINDING_VERSION_INVALID', `$trustedRegistryBindings.${field}`, [field]);
    }
  }
  for (const field of ['presetValidationIndexSha256', 'materialValidationIndexSha256']) {
    if (!isSha256(trust[field])) {
      addIssue('TRUST_BINDING_HASH_INVALID', `$trustedRegistryBindings.${field}`, [field]);
    }
  }

  const presetIndex = isObject(bundle.presetValidationIndex) ? bundle.presetValidationIndex : {};
  if (!isObject(bundle.presetValidationIndex)) {
    addIssue('PRESET_INDEX_INVALID', '$.presetValidationIndex');
  }
  rejectUnknownFields(
    presetIndex,
    ['registryVersion', 'presets'],
    'PRESET_INDEX_UNKNOWN_FIELD',
    '$.presetValidationIndex',
    addIssue,
  );
  if (!isNonEmptyString(presetIndex.registryVersion)) {
    addIssue('PRESET_INDEX_VERSION_INVALID', '$.presetValidationIndex.registryVersion');
  }
  const presetValues = Array.isArray(presetIndex.presets) ? presetIndex.presets : [];
  if (!Array.isArray(presetIndex.presets)) {
    addIssue('PRESET_INDEX_INVALID', '$.presetValidationIndex.presets');
  }
  const presetIdCounts = countValidIds(presetValues, (value) => value?.presetId);
  const presetById = new Map();
  const presetPoliciesById = new Map();

  presetValues.forEach((presetValue, presetIndexOffset) => {
    const path = `$.presetValidationIndex.presets[${presetIndexOffset}]`;
    if (!isObject(presetValue)) {
      addIssue('PRESET_ENTRY_INVALID', path);
      return;
    }
    rejectUnknownFields(
      presetValue,
      ['presetId', 'format', 'kindPolicies'],
      'PRESET_INDEX_UNKNOWN_FIELD',
      path,
      addIssue,
    );
    const presetId = presetValue.presetId;
    if (!isNonEmptyString(presetId)) addIssue('PRESET_ENTRY_ID_INVALID', `${path}.presetId`);
    if (isNonEmptyString(presetId) && (presetIdCounts.get(presetId) ?? 0) > 1) {
      addIssue('PRESET_ENTRY_DUPLICATE_ID', `${path}.presetId`, [presetId]);
    }
    if (presetValue.format !== SUPPORTED_FORMAT) {
      addIssue('PRESET_ENTRY_FORMAT_UNSUPPORTED', `${path}.format`, [presetId]);
    }
    const policies = Array.isArray(presetValue.kindPolicies) ? presetValue.kindPolicies : [];
    if (!Array.isArray(presetValue.kindPolicies) || policies.length === 0) {
      addIssue('PRESET_KIND_POLICIES_INVALID', `${path}.kindPolicies`, [presetId]);
    }
    const policyKindCounts = countValidIds(policies, (value) => value?.kind);
    const policyByKind = new Map();
    policies.forEach((policyValue, policyOffset) => {
      const policyPath = `${path}.kindPolicies[${policyOffset}]`;
      if (!isObject(policyValue)) {
        addIssue('PRESET_KIND_POLICY_INVALID', policyPath, [presetId]);
        return;
      }
      rejectUnknownFields(
        policyValue,
        ['kind', 'endResponsibility', 'endPolicyId', 'allowedMaterialRoles', 'requiredMaterialRoles'],
        'PRESET_INDEX_UNKNOWN_FIELD',
        policyPath,
        addIssue,
      );
      const kind = policyValue.kind;
      const allowedRoles = policyValue.allowedMaterialRoles;
      const requiredRoles = policyValue.requiredMaterialRoles;
      if (
        !isNonEmptyString(kind)
        || !isNonEmptyString(policyValue.endResponsibility)
        || !Array.isArray(allowedRoles)
        || !Array.isArray(requiredRoles)
      ) {
        addIssue('PRESET_KIND_POLICY_INVALID', policyPath, [presetId, kind]);
      }
      if (isNonEmptyString(kind) && (policyKindCounts.get(kind) ?? 0) > 1) {
        addIssue('PRESET_KIND_POLICY_DUPLICATE', `${policyPath}.kind`, [presetId, kind]);
      }
      if (!KIND_SET.has(kind)) {
        addIssue('PRESET_KIND_UNSUPPORTED', `${policyPath}.kind`, [presetId, kind]);
      }
      if (kind === 'speech-caption') {
        if (policyValue.endResponsibility !== 'target-anchor') {
          addIssue('PRESET_END_RESPONSIBILITY_INVALID', `${policyPath}.endResponsibility`, [presetId, kind]);
        }
        if (hasOwn(policyValue, 'endPolicyId')) {
          addIssue('PRESET_END_POLICY_FORBIDDEN', `${policyPath}.endPolicyId`, [presetId, kind]);
        }
      } else if (KIND_SET.has(kind)) {
        if (policyValue.endResponsibility !== 'preset-policy') {
          addIssue('PRESET_END_RESPONSIBILITY_INVALID', `${policyPath}.endResponsibility`, [presetId, kind]);
        }
        if (!isNonEmptyString(policyValue.endPolicyId)) {
          addIssue('PRESET_END_POLICY_MISSING', `${policyPath}.endPolicyId`, [presetId, kind]);
        }
      }
      const rolesShapeValid = validateUniqueStringArray(allowedRoles) && validateUniqueStringArray(requiredRoles);
      if (!rolesShapeValid) {
        addIssue('PRESET_MATERIAL_ROLES_INVALID', policyPath, [presetId, kind]);
      }
      if (Array.isArray(allowedRoles)) {
        const kindAllowed = new Set(ALLOWED_ROLES_BY_KIND[kind] ?? []);
        allowedRoles.forEach((role, roleOffset) => {
          if (!MATERIAL_ROLES.has(role) || !kindAllowed.has(role)) {
            addIssue(
              'PRESET_MATERIAL_ROLE_UNSUPPORTED',
              `${policyPath}.allowedMaterialRoles[${roleOffset}]`,
              [presetId, kind, role],
            );
          }
        });
      }
      if (Array.isArray(requiredRoles)) {
        const allowedSet = new Set(Array.isArray(allowedRoles) ? allowedRoles : []);
        requiredRoles.forEach((role, roleOffset) => {
          if (!MATERIAL_ROLES.has(role) || !(new Set(ALLOWED_ROLES_BY_KIND[kind] ?? [])).has(role)) {
            addIssue(
              'PRESET_MATERIAL_ROLE_UNSUPPORTED',
              `${policyPath}.requiredMaterialRoles[${roleOffset}]`,
              [presetId, kind, role],
            );
          }
          if (!allowedSet.has(role)) {
            addIssue(
              'PRESET_REQUIRED_ROLE_NOT_ALLOWED',
              `${policyPath}.requiredMaterialRoles[${roleOffset}]`,
              [presetId, kind, role],
            );
          }
        });
      }
      if (isNonEmptyString(kind) && (policyKindCounts.get(kind) ?? 0) === 1) policyByKind.set(kind, policyValue);
    });
    if (isNonEmptyString(presetId) && (presetIdCounts.get(presetId) ?? 0) === 1) {
      presetById.set(presetId, presetValue);
      presetPoliciesById.set(presetId, policyByKind);
    }
  });

  const materialIndex = isObject(bundle.materialValidationIndex) ? bundle.materialValidationIndex : {};
  if (!isObject(bundle.materialValidationIndex)) {
    addIssue('MATERIAL_INDEX_INVALID', '$.materialValidationIndex');
  }
  rejectUnknownFields(
    materialIndex,
    ['registryVersion', 'materials'],
    'MATERIAL_INDEX_UNKNOWN_FIELD',
    '$.materialValidationIndex',
    addIssue,
  );
  if (!isNonEmptyString(materialIndex.registryVersion)) {
    addIssue('MATERIAL_INDEX_VERSION_INVALID', '$.materialValidationIndex.registryVersion');
  }
  const materialValues = Array.isArray(materialIndex.materials) ? materialIndex.materials : [];
  if (!Array.isArray(materialIndex.materials)) {
    addIssue('MATERIAL_INDEX_INVALID', '$.materialValidationIndex.materials');
  }
  const materialIdCounts = countValidIds(materialValues, (value) => value?.materialId);
  const materialById = new Map();
  materialValues.forEach((materialValue, materialOffset) => {
    const path = `$.materialValidationIndex.materials[${materialOffset}]`;
    if (!isObject(materialValue)) {
      addIssue('MATERIAL_ENTRY_INVALID', path);
      return;
    }
    rejectUnknownFields(
      materialValue,
      ['materialId', 'role', 'compatibleSubjects'],
      'MATERIAL_INDEX_UNKNOWN_FIELD',
      path,
      addIssue,
    );
    const materialId = materialValue.materialId;
    if (!isNonEmptyString(materialId)) addIssue('MATERIAL_ENTRY_ID_INVALID', `${path}.materialId`);
    if (isNonEmptyString(materialId) && (materialIdCounts.get(materialId) ?? 0) > 1) {
      addIssue('MATERIAL_ENTRY_DUPLICATE_ID', `${path}.materialId`, [materialId]);
    }
    if (!MATERIAL_ROLES.has(materialValue.role)) {
      addIssue('MATERIAL_ROLE_UNSUPPORTED', `${path}.role`, [materialId, materialValue.role]);
    }
    const compatibleSubjects = Array.isArray(materialValue.compatibleSubjects)
      ? materialValue.compatibleSubjects
      : [];
    if (!Array.isArray(materialValue.compatibleSubjects) || compatibleSubjects.length === 0) {
      addIssue('MATERIAL_COMPATIBLE_SUBJECTS_INVALID', `${path}.compatibleSubjects`, [materialId]);
    }
    const seenSubjects = new Set();
    compatibleSubjects.forEach((subjectValue, subjectOffset) => {
      const subjectPath = `${path}.compatibleSubjects[${subjectOffset}]`;
      if (!isObject(subjectValue)) {
        addIssue('MATERIAL_COMPATIBLE_SUBJECTS_INVALID', subjectPath, [materialId]);
        return;
      }
      rejectUnknownFields(
        subjectValue,
        ['subjectType', 'subjectId'],
        'MATERIAL_INDEX_UNKNOWN_FIELD',
        subjectPath,
        addIssue,
      );
      if (!isNonEmptyString(subjectValue.subjectType) || !isNonEmptyString(subjectValue.subjectId)) {
        addIssue('MATERIAL_COMPATIBLE_SUBJECTS_INVALID', subjectPath, [materialId]);
      } else {
        const key = subjectKey(subjectValue);
        if (seenSubjects.has(key)) addIssue('MATERIAL_COMPATIBLE_SUBJECTS_INVALID', subjectPath, [materialId]);
        seenSubjects.add(key);
      }
      const expectedSubjectType = materialValue.role === 'speaker-icon'
        ? 'speaker'
        : MATERIAL_ROLES.has(materialValue.role)
          ? 'reference-subject'
          : null;
      if (expectedSubjectType === null || subjectValue.subjectType !== expectedSubjectType) {
        addIssue('MATERIAL_SUBJECT_TYPE_UNSUPPORTED', `${subjectPath}.subjectType`, [materialId]);
      }
    });
    if (isNonEmptyString(materialId) && (materialIdCounts.get(materialId) ?? 0) === 1) {
      materialById.set(materialId, materialValue);
    }
  });

  if (isObject(bundle.presetValidationIndex)) {
    const presetIndexHash = sha256Canonical(bundle.presetValidationIndex);
    if (isNonEmptyString(trust.presetRegistryVersion)
      && trust.presetRegistryVersion !== presetIndex.registryVersion) {
      addIssue('TRUST_PRESET_VERSION_MISMATCH', '$trustedRegistryBindings.presetRegistryVersion');
    }
    if (isSha256(trust.presetValidationIndexSha256)
      && trust.presetValidationIndexSha256 !== presetIndexHash) {
      addIssue('TRUST_PRESET_HASH_MISMATCH', '$trustedRegistryBindings.presetValidationIndexSha256');
    }
  }
  if (isObject(bundle.materialValidationIndex)) {
    const materialIndexHash = sha256Canonical(bundle.materialValidationIndex);
    if (isNonEmptyString(trust.materialRegistryVersion)
      && trust.materialRegistryVersion !== materialIndex.registryVersion) {
      addIssue('TRUST_MATERIAL_VERSION_MISMATCH', '$trustedRegistryBindings.materialRegistryVersion');
    }
    if (isSha256(trust.materialValidationIndexSha256)
      && trust.materialValidationIndexSha256 !== materialIndexHash) {
      addIssue('TRUST_MATERIAL_HASH_MISMATCH', '$trustedRegistryBindings.materialValidationIndexSha256');
    }
  }

  const instructionSet = isObject(bundle.instructionSet) ? bundle.instructionSet : {};
  if (!isObject(bundle.instructionSet)) addIssue('INSTRUCTION_SET_NOT_OBJECT', '$.instructionSet');
  rejectUnknownFields(
    instructionSet,
    [
      'schemaVersion',
      'instructionSetId',
      'format',
      'rendererContractVersion',
      'sourceProvenance',
      'resolutionPackageId',
      'resolutionPackageSha256',
      'presetRegistryVersion',
      'materialRegistryVersion',
      'instructions',
    ],
    'INSTRUCTION_SET_UNKNOWN_FIELD',
    '$.instructionSet',
    addIssue,
  );
  if (instructionSet.schemaVersion !== PRESENTATION_INSTRUCTION_SCHEMA_VERSION) {
    addIssue('INSTRUCTION_SET_SCHEMA_VERSION_UNSUPPORTED', '$.instructionSet.schemaVersion');
  }
  if (!isNonEmptyString(instructionSet.instructionSetId)) {
    addIssue('INSTRUCTION_SET_ID_INVALID', '$.instructionSet.instructionSetId');
  }
  if (instructionSet.format !== SUPPORTED_FORMAT) {
    addIssue('INSTRUCTION_SET_FORMAT_UNSUPPORTED', '$.instructionSet.format');
  }
  if (instructionSet.rendererContractVersion !== PRESENTATION_RENDERER_CONTRACT_VERSION) {
    addIssue(
      'INSTRUCTION_SET_RENDERER_CONTRACT_VERSION_UNSUPPORTED',
      '$.instructionSet.rendererContractVersion',
    );
  }
  if (!isNonEmptyString(instructionSet.sourceProvenance)) {
    addIssue('INSTRUCTION_SET_SOURCE_PROVENANCE_INVALID', '$.instructionSet.sourceProvenance');
  }
  if (!isNonEmptyString(instructionSet.resolutionPackageId)) {
    addIssue('INSTRUCTION_SET_RESOLUTION_PACKAGE_ID_INVALID', '$.instructionSet.resolutionPackageId');
  }
  if (!isSha256(instructionSet.resolutionPackageSha256)) {
    addIssue('INSTRUCTION_SET_RESOLUTION_PACKAGE_HASH_INVALID', '$.instructionSet.resolutionPackageSha256');
  }
  for (const field of ['presetRegistryVersion', 'materialRegistryVersion']) {
    if (!isNonEmptyString(instructionSet[field])) {
      addIssue('INSTRUCTION_SET_REGISTRY_VERSION_INVALID', `$.instructionSet.${field}`, [field]);
    }
  }
  const instructionValues = Array.isArray(instructionSet.instructions) ? instructionSet.instructions : [];
  if (!Array.isArray(instructionSet.instructions)) {
    addIssue('INSTRUCTION_SET_INSTRUCTIONS_NOT_ARRAY', '$.instructionSet.instructions');
  }
  const registryVersionComparisons = [
    ['presetRegistryVersion', presetIndex.registryVersion, trust.presetRegistryVersion],
    ['materialRegistryVersion', materialIndex.registryVersion, trust.materialRegistryVersion],
  ];
  for (const [field, indexVersion, trustedVersion] of registryVersionComparisons) {
    if (
      isNonEmptyString(instructionSet[field])
      && (instructionSet[field] !== indexVersion || instructionSet[field] !== trustedVersion)
    ) {
      addIssue('INSTRUCTION_SET_REGISTRY_VERSION_MISMATCH', `$.instructionSet.${field}`, [field]);
    }
  }

  const resolutionPackage = isObject(bundle.resolutionPackage) ? bundle.resolutionPackage : {};
  if (!isObject(bundle.resolutionPackage)) {
    addIssue('RESOLUTION_PACKAGE_NOT_OBJECT', '$.resolutionPackage');
  }
  rejectUnknownFields(
    resolutionPackage,
    [
      'schemaVersion',
      'resolutionPackageId',
      'sourceProvenance',
      'atomGranularity',
      'sourceAtomsSha256',
      'sourceAtoms',
      'targets',
      'captionContracts',
    ],
    'RESOLUTION_PACKAGE_UNKNOWN_FIELD',
    '$.resolutionPackage',
    addIssue,
  );
  if (resolutionPackage.schemaVersion !== PRESENTATION_RESOLUTION_PACKAGE_SCHEMA_VERSION) {
    addIssue('RESOLUTION_PACKAGE_SCHEMA_VERSION_UNSUPPORTED', '$.resolutionPackage.schemaVersion');
  }
  if (!isNonEmptyString(resolutionPackage.resolutionPackageId)) {
    addIssue('RESOLUTION_PACKAGE_ID_INVALID', '$.resolutionPackage.resolutionPackageId');
  }
  if (
    isNonEmptyString(instructionSet.resolutionPackageId)
    && instructionSet.resolutionPackageId !== resolutionPackage.resolutionPackageId
  ) {
    addIssue('RESOLUTION_PACKAGE_ID_MISMATCH', '$.resolutionPackage.resolutionPackageId');
  }
  if (
    isObject(bundle.resolutionPackage)
    && isSha256(instructionSet.resolutionPackageSha256)
    && instructionSet.resolutionPackageSha256 !== sha256Canonical(bundle.resolutionPackage)
  ) {
    addIssue('RESOLUTION_PACKAGE_HASH_MISMATCH', '$.instructionSet.resolutionPackageSha256');
  }
  if (!isNonEmptyString(resolutionPackage.sourceProvenance)) {
    addIssue('RESOLUTION_PACKAGE_SOURCE_PROVENANCE_INVALID', '$.resolutionPackage.sourceProvenance');
  }
  if (
    isNonEmptyString(instructionSet.sourceProvenance)
    && instructionSet.sourceProvenance !== resolutionPackage.sourceProvenance
  ) {
    addIssue('RESOLUTION_PACKAGE_SOURCE_PROVENANCE_MISMATCH', '$.resolutionPackage.sourceProvenance');
  }
  if (!SUPPORTED_GRANULARITIES.has(resolutionPackage.atomGranularity)) {
    addIssue('RESOLUTION_PACKAGE_ATOM_GRANULARITY_UNSUPPORTED', '$.resolutionPackage.atomGranularity');
  }
  const sourceAtoms = Array.isArray(resolutionPackage.sourceAtoms) ? resolutionPackage.sourceAtoms : [];
  if (!Array.isArray(resolutionPackage.sourceAtoms)) {
    addIssue('RESOLUTION_PACKAGE_SOURCE_ATOMS_NOT_ARRAY', '$.resolutionPackage.sourceAtoms');
  }
  if (!isSha256(resolutionPackage.sourceAtomsSha256)) {
    addIssue('RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_INVALID', '$.resolutionPackage.sourceAtomsSha256');
  }
  if (
    Array.isArray(resolutionPackage.sourceAtoms)
    && isSha256(resolutionPackage.sourceAtomsSha256)
    && resolutionPackage.sourceAtomsSha256 !== sha256Canonical(resolutionPackage.sourceAtoms)
  ) {
    addIssue('RESOLUTION_PACKAGE_SOURCE_ATOMS_HASH_MISMATCH', '$.resolutionPackage.sourceAtomsSha256');
  }
  const targetValues = Array.isArray(resolutionPackage.targets) ? resolutionPackage.targets : [];
  if (!Array.isArray(resolutionPackage.targets)) {
    addIssue('RESOLUTION_PACKAGE_TARGETS_NOT_ARRAY', '$.resolutionPackage.targets');
  }
  const captionContractValues = Array.isArray(resolutionPackage.captionContracts)
    ? resolutionPackage.captionContracts
    : [];
  if (!Array.isArray(resolutionPackage.captionContracts)) {
    addIssue('RESOLUTION_PACKAGE_CAPTION_CONTRACTS_NOT_ARRAY', '$.resolutionPackage.captionContracts');
  } else if (captionContractValues.length > 1) {
    addIssue('RESOLUTION_PACKAGE_CAPTION_CONTRACT_COUNT_UNSUPPORTED', '$.resolutionPackage.captionContracts');
  }

  const atomIdCounts = countValidIds(sourceAtoms, (value) => value?.atomId);
  const atomById = new Map();
  const atomIndexById = new Map();
  sourceAtoms.forEach((atomValue, atomOffset) => {
    const path = `$.resolutionPackage.sourceAtoms[${atomOffset}]`;
    if (isObject(atomValue)) {
      rejectUnknownFields(
        atomValue,
        ['atomId', 'speechId', 'speaker', 'text', 'startMs', 'endMs'],
        'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
        path,
        addIssue,
      );
      if (isNonEmptyString(atomValue.atomId) && (atomIdCounts.get(atomValue.atomId) ?? 0) === 1) {
        atomById.set(atomValue.atomId, atomValue);
        atomIndexById.set(atomValue.atomId, atomOffset);
      }
    }
  });

  let sourceContract = null;
  const sourceDelegationConstructible = isObject(bundle.resolutionPackage)
    && Array.isArray(resolutionPackage.sourceAtoms);
  if (sourceDelegationConstructible) {
    const sourceDelegationInput = {
      schemaVersion: 'presentation-caption-check-v001',
      format: SUPPORTED_FORMAT,
      source: {
        atomGranularity: resolutionPackage.atomGranularity,
        atomProvenance: resolutionPackage.sourceProvenance,
        atoms: resolutionPackage.sourceAtoms,
        captionTargets: [],
        allowedSimultaneousGroups: [],
      },
      captionPlan: { cues: [] },
    };
    const delegatedSourceReport = validatePresentationCaptionContract(sourceDelegationInput);
    sourceContract = {
      checkerVersion: delegatedSourceReport.checkerVersion,
      inputSha256: delegatedSourceReport.inputSha256,
      status: delegatedSourceReport.contract.status,
      violations: delegatedSourceReport.contract.violations,
      observations: delegatedSourceReport.contract.observations,
    };
  }

  const captionContractIdCounts = countValidIds(
    captionContractValues,
    (value) => value?.captionContractRefId,
  );
  const captionContractById = new Map();
  const captionCueCountsByContract = new Map();
  const captionCueByContract = new Map();

  const inspectCaptionStructure = (entry, path) => {
    rejectUnknownFields(
      entry,
      ['captionContractRefId', 'captionSchemaVersion', 'captionTargets', 'allowedSimultaneousGroups', 'captionPlan'],
      'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
      path,
      addIssue,
    );
    if (Array.isArray(entry.captionTargets)) {
      entry.captionTargets.forEach((target, index) => {
        const targetPath = `${path}.captionTargets[${index}]`;
        rejectUnknownFields(
          target,
          ['targetId', 'requiredAtomIds', 'allowedOmissionAtomIds'],
          'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
          targetPath,
          addIssue,
        );
      });
    }
    if (Array.isArray(entry.allowedSimultaneousGroups)) {
      entry.allowedSimultaneousGroups.forEach((group, index) => {
        rejectUnknownFields(
          group,
          ['simultaneousGroupId', 'targetIds'],
          'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
          `${path}.allowedSimultaneousGroups[${index}]`,
          addIssue,
        );
      });
    }
    if (isObject(entry.captionPlan)) {
      rejectUnknownFields(
        entry.captionPlan,
        ['cues'],
        'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
        `${path}.captionPlan`,
        addIssue,
      );
      if (Array.isArray(entry.captionPlan.cues)) {
        entry.captionPlan.cues.forEach((cue, cueOffset) => {
          const cuePath = `${path}.captionPlan.cues[${cueOffset}]`;
          rejectUnknownFields(
            cue,
            [
              'cueId',
              'targetId',
              'lines',
              'startAnchor',
              'endAnchor',
              'startMs',
              'endMs',
              'simultaneousGroupId',
            ],
            'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
            cuePath,
            addIssue,
          );
          if (isObject(cue) && Array.isArray(cue.lines)) {
            cue.lines.forEach((line, lineOffset) => {
              rejectUnknownFields(
                line,
                ['atomIds', 'renderedText'],
                'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
                `${cuePath}.lines[${lineOffset}]`,
                addIssue,
              );
            });
          }
          if (isObject(cue)) {
            rejectUnknownFields(
              cue.startAnchor,
              ['atomId', 'edge'],
              'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
              `${cuePath}.startAnchor`,
              addIssue,
            );
            rejectUnknownFields(
              cue.endAnchor,
              ['atomId', 'edge'],
              'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
              `${cuePath}.endAnchor`,
              addIssue,
            );
          }
        });
      }
    }
  };

  captionContractValues.forEach((entryValue, entryOffset) => {
    const path = `$.resolutionPackage.captionContracts[${entryOffset}]`;
    if (!isObject(entryValue)) {
      addIssue('CAPTION_CONTRACT_ENTRY_INVALID', path);
      return;
    }
    inspectCaptionStructure(entryValue, path);
    const contractId = entryValue.captionContractRefId;
    if (!isNonEmptyString(contractId)) addIssue('CAPTION_CONTRACT_ID_INVALID', `${path}.captionContractRefId`);
    if (isNonEmptyString(contractId) && (captionContractIdCounts.get(contractId) ?? 0) > 1) {
      addIssue('CAPTION_CONTRACT_DUPLICATE_ID', `${path}.captionContractRefId`, [contractId]);
    }
    if (entryValue.captionSchemaVersion !== 'presentation-caption-check-v001') {
      addIssue('CAPTION_CONTRACT_SCHEMA_VERSION_UNSUPPORTED', `${path}.captionSchemaVersion`, [contractId]);
    }
    const cues = Array.isArray(entryValue.captionPlan?.cues) ? entryValue.captionPlan.cues : [];
    const cueCounts = countValidIds(cues, (cue) => cue?.cueId);
    const cueMap = new Map();
    cues.forEach((cue) => {
      if (isObject(cue) && isNonEmptyString(cue.cueId) && (cueCounts.get(cue.cueId) ?? 0) === 1) {
        cueMap.set(cue.cueId, cue);
      }
    });
    if (isNonEmptyString(contractId) && (captionContractIdCounts.get(contractId) ?? 0) === 1) {
      captionContractById.set(contractId, entryValue);
      captionCueCountsByContract.set(contractId, cueCounts);
      captionCueByContract.set(contractId, cueMap);
    }
  });

  const targetIdCounts = countValidIds(targetValues, (value) => value?.targetRefId);
  const targetById = new Map();
  const targetPathById = new Map();
  const targetPayloadInvalidIds = new Set();
  const targetSourceAtomIds = new Map();
  const captionTargetConnection = new Map();
  const captionContractTargetCounts = new Map();
  const captionCueTargetIds = new Map();

  targetValues.forEach((targetValue, targetOffset) => {
    const path = `$.resolutionPackage.targets[${targetOffset}]`;
    if (!isObject(targetValue)) {
      addIssue('TARGET_ENTRY_INVALID', path);
      return;
    }
    const targetType = targetValue.targetType;
    const allowedFieldsByType = {
      'caption-target': ['targetRefId', 'targetType', 'captionContractRefId', 'cueId'],
      'source-atom-range': ['targetRefId', 'targetType', 'sourceAtomIds'],
      'information-item': ['targetRefId', 'targetType', 'informationItemId', 'sourceAtomIds', 'speakerId'],
      speaker: ['targetRefId', 'targetType', 'speakerId', 'speakerDisplayName', 'sourceAtomIds'],
      'reference-subject': ['targetRefId', 'targetType', 'referenceSubjectId', 'sourceAtomIds'],
    };
    rejectUnknownFields(
      targetValue,
      allowedFieldsByType[targetType] ?? ['targetRefId', 'targetType'],
      'RESOLUTION_STRUCTURE_UNKNOWN_FIELD',
      path,
      addIssue,
    );
    const targetRefId = targetValue.targetRefId;
    if (!isNonEmptyString(targetRefId)) addIssue('TARGET_ENTRY_ID_INVALID', `${path}.targetRefId`);
    if (isNonEmptyString(targetRefId) && (targetIdCounts.get(targetRefId) ?? 0) > 1) {
      addIssue('TARGET_ENTRY_DUPLICATE_ID', `${path}.targetRefId`, [targetRefId]);
    }
    if (!TARGET_TYPES.has(targetType)) {
      addIssue('TARGET_ENTRY_TYPE_UNSUPPORTED', `${path}.targetType`, [targetRefId]);
    }

    let payloadValid = true;
    if (targetType === 'caption-target') {
      payloadValid = isNonEmptyString(targetValue.captionContractRefId) && isNonEmptyString(targetValue.cueId);
    } else if (targetType === 'information-item') {
      payloadValid = isNonEmptyString(targetValue.informationItemId)
        && (!hasOwn(targetValue, 'speakerId') || isNonEmptyString(targetValue.speakerId));
    } else if (targetType === 'speaker') {
      payloadValid = isNonEmptyString(targetValue.speakerId) && isNonEmptyString(targetValue.speakerDisplayName);
    } else if (targetType === 'reference-subject') {
      payloadValid = isNonEmptyString(targetValue.referenceSubjectId);
    }
    if (TARGET_TYPES.has(targetType) && !payloadValid) {
      addIssue('TARGET_ENTRY_TYPE_PAYLOAD_INVALID', path, [targetRefId, targetType]);
      if (isNonEmptyString(targetRefId)) targetPayloadInvalidIds.add(targetRefId);
    }

    if (targetType !== 'caption-target' && TARGET_TYPES.has(targetType)) {
      const atomIds = targetValue.sourceAtomIds;
      if (!validateUniqueStringArray(atomIds) || atomIds.length === 0) {
        addIssue('TARGET_ENTRY_SOURCE_ATOMS_INVALID', `${path}.sourceAtomIds`, [targetRefId]);
      }
      if (Array.isArray(atomIds)) {
        let priorIndex = null;
        for (let atomOffset = 0; atomOffset < atomIds.length; atomOffset += 1) {
          const atomId = atomIds[atomOffset];
          const atomIndex = atomIndexById.get(atomId);
          if (!isNonEmptyString(atomId) || atomIndex === undefined) {
            addIssue(
              'TARGET_ENTRY_SOURCE_ATOM_UNKNOWN',
              `${path}.sourceAtomIds[${atomOffset}]`,
              [targetRefId, atomId],
            );
          } else {
            if (priorIndex !== null && atomIndex < priorIndex) {
              addIssue('TARGET_ENTRY_SOURCE_ORDER_REVERSED', `${path}.sourceAtomIds`, [targetRefId]);
              break;
            }
            priorIndex = atomIndex;
          }
        }
        if (isNonEmptyString(targetRefId) && (targetIdCounts.get(targetRefId) ?? 0) === 1) {
          targetSourceAtomIds.set(targetRefId, new Set(atomIds.filter((id) => atomById.has(id))));
        }
      }
    }

    if (isNonEmptyString(targetRefId) && (targetIdCounts.get(targetRefId) ?? 0) === 1) {
      targetById.set(targetRefId, targetValue);
      targetPathById.set(targetRefId, path);
    }

    if (targetType === 'caption-target' && payloadValid) {
      const contractId = targetValue.captionContractRefId;
      const cueId = targetValue.cueId;
      const contract = captionContractById.get(contractId);
      const cueCount = captionCueCountsByContract.get(contractId)?.get(cueId) ?? 0;
      if (!contract || cueCount === 0) {
        addIssue('CAPTION_TARGET_CUE_UNKNOWN', path, [targetRefId, contractId, cueId]);
      } else if (cueCount > 1) {
        addIssue('CAPTION_TARGET_CUE_AMBIGUOUS', path, [targetRefId, contractId, cueId]);
      } else {
        const cueKey = `${contractId}\u0000${cueId}`;
        const owners = captionCueTargetIds.get(cueKey) ?? [];
        owners.push(targetRefId);
        captionCueTargetIds.set(cueKey, owners);
        captionTargetConnection.set(targetRefId, { contractId, cueId, cueKey });
        captionContractTargetCounts.set(contractId, (captionContractTargetCounts.get(contractId) ?? 0) + 1);
      }
    }
  });

  for (const [cueKey, ownerIds] of captionCueTargetIds) {
    if (ownerIds.length > 1) {
      const [contractId, cueId] = cueKey.split('\u0000');
      addIssue('CAPTION_CUE_IN_MULTIPLE_TARGETS', '$.resolutionPackage.targets', [contractId, cueId, ...ownerIds]);
      for (const ownerId of ownerIds) captionTargetConnection.delete(ownerId);
    }
  }

  for (const contractId of [...captionContractById.keys()].sort()) {
    if ((captionContractTargetCounts.get(contractId) ?? 0) === 0) {
      addIssue('CAPTION_CONTRACT_WITHOUT_TARGET', '$.resolutionPackage.captionContracts', [contractId]);
    }
  }

  const instructionIdCounts = countValidIds(instructionValues, (value) => value?.instructionId);
  const targetInstructionCounts = new Map();
  const captionCueInstructionIds = new Map();
  const commentTargetIds = new Set();
  const instructionRecords = [];

  instructionValues.forEach((instructionValue, instructionOffset) => {
    const path = `$.instructionSet.instructions[${instructionOffset}]`;
    if (!isObject(instructionValue)) {
      addIssue('INSTRUCTION_NOT_OBJECT', path);
      return;
    }
    rejectUnknownFields(
      instructionValue,
      ['instructionId', 'trigger', 'kind', 'target', 'presetId', 'materialRefs'],
      'INSTRUCTION_UNKNOWN_FIELD',
      path,
      addIssue,
    );
    const instructionId = instructionValue.instructionId;
    const instructionIdIsUnique = isNonEmptyString(instructionId)
      && (instructionIdCounts.get(instructionId) ?? 0) === 1;
    if (!isNonEmptyString(instructionId)) addIssue('INSTRUCTION_ID_INVALID', `${path}.instructionId`);
    if (isNonEmptyString(instructionId) && (instructionIdCounts.get(instructionId) ?? 0) > 1) {
      addIssue('INSTRUCTION_DUPLICATE_ID', `${path}.instructionId`, [instructionId]);
    }

    const trigger = instructionValue.trigger;
    rejectUnknownFields(trigger, ['startAtomId'], 'INSTRUCTION_UNKNOWN_FIELD', `${path}.trigger`, addIssue);
    const triggerValid = isObject(trigger)
      && Object.keys(trigger).length === 1
      && isNonEmptyString(trigger.startAtomId);
    if (!triggerValid) addIssue('INSTRUCTION_TRIGGER_INVALID', `${path}.trigger`, [instructionId]);
    if (isObject(trigger) && isNonEmptyString(trigger.startAtomId) && !atomById.has(trigger.startAtomId)) {
      addIssue('INSTRUCTION_TRIGGER_UNKNOWN_ATOM', `${path}.trigger.startAtomId`, [instructionId, trigger.startAtomId]);
    }

    const kind = instructionValue.kind;
    if (!KIND_SET.has(kind)) addIssue('INSTRUCTION_KIND_UNSUPPORTED', `${path}.kind`, [instructionId, kind]);

    const instructionTarget = instructionValue.target;
    rejectUnknownFields(
      instructionTarget,
      ['targetType', 'targetRefIds'],
      'INSTRUCTION_UNKNOWN_FIELD',
      `${path}.target`,
      addIssue,
    );
    if (!isObject(instructionTarget) || !isNonEmptyString(instructionTarget.targetType)) {
      addIssue('INSTRUCTION_TARGET_INVALID', `${path}.target`, [instructionId]);
    }
    const targetRefIds = isObject(instructionTarget) && Array.isArray(instructionTarget.targetRefIds)
      ? instructionTarget.targetRefIds
      : [];
    if (
      !isObject(instructionTarget)
      || !Array.isArray(instructionTarget.targetRefIds)
      || targetRefIds.length !== 1
      || !isNonEmptyString(targetRefIds[0])
    ) {
      addIssue('INSTRUCTION_TARGET_CARDINALITY_INVALID', `${path}.target.targetRefIds`, [instructionId]);
    }
    const targetRefId = targetRefIds.length === 1 && isNonEmptyString(targetRefIds[0])
      ? targetRefIds[0]
      : null;
    const resolvedTarget = targetRefId === null ? null : targetById.get(targetRefId);
    if (targetRefId !== null && !resolvedTarget) {
      addIssue('INSTRUCTION_TARGET_REFERENCE_UNKNOWN', `${path}.target.targetRefIds[0]`, [instructionId, targetRefId]);
    }
    const expectedTargetType = TARGET_TYPE_BY_KIND[kind];
    if (
      (expectedTargetType && instructionTarget?.targetType !== expectedTargetType)
      || (resolvedTarget && instructionTarget?.targetType !== resolvedTarget.targetType)
    ) {
      addIssue(
        'INSTRUCTION_KIND_TARGET_MISMATCH',
        `${path}.target.targetType`,
        [instructionId, kind, instructionTarget?.targetType, resolvedTarget?.targetType],
      );
    }

    if (resolvedTarget && targetRefId !== null) {
      if (instructionIdIsUnique) {
        targetInstructionCounts.set(targetRefId, (targetInstructionCounts.get(targetRefId) ?? 0) + 1);
      }
      if (
        instructionIdIsUnique
        && kind === 'information-comment'
        && resolvedTarget.targetType === 'information-item'
      ) {
        commentTargetIds.add(targetRefId);
      }
      if (kind === 'speech-caption' && resolvedTarget.targetType === 'caption-target') {
        const connection = captionTargetConnection.get(targetRefId);
        if (connection) {
          const cue = captionCueByContract.get(connection.contractId)?.get(connection.cueId);
          if (
            !cue
            || !isObject(cue.startAnchor)
            || trigger?.startAtomId !== cue.startAnchor.atomId
          ) {
            addIssue(
              'INSTRUCTION_CAPTION_TRIGGER_MISMATCH',
              `${path}.trigger.startAtomId`,
              [instructionId, connection.contractId, connection.cueId],
            );
          }
          if (instructionIdIsUnique) {
            const ids = captionCueInstructionIds.get(connection.cueKey) ?? [];
            ids.push(instructionId);
            captionCueInstructionIds.set(connection.cueKey, ids);
          }
        }
      } else if (
        isObject(trigger)
        && isNonEmptyString(trigger.startAtomId)
        && !targetSourceAtomIds.get(targetRefId)?.has(trigger.startAtomId)
      ) {
        addIssue(
          'INSTRUCTION_TRIGGER_OUTSIDE_TARGET',
          `${path}.trigger.startAtomId`,
          [instructionId, targetRefId, trigger.startAtomId],
        );
      }
    }

    if (!isNonEmptyString(instructionValue.presetId)) {
      addIssue('INSTRUCTION_PRESET_ID_INVALID', `${path}.presetId`, [instructionId]);
    }
    const materialRefs = Array.isArray(instructionValue.materialRefs) ? instructionValue.materialRefs : [];
    if (!Array.isArray(instructionValue.materialRefs)) {
      addIssue('INSTRUCTION_MATERIAL_REFS_INVALID', `${path}.materialRefs`, [instructionId]);
    } else {
      const seen = new Set();
      materialRefs.forEach((materialId, materialOffset) => {
        if (!isNonEmptyString(materialId)) {
          addIssue('INSTRUCTION_MATERIAL_REF_INVALID', `${path}.materialRefs[${materialOffset}]`, [instructionId]);
        } else if (seen.has(materialId)) {
          addIssue(
            'INSTRUCTION_DUPLICATE_MATERIAL_REF',
            `${path}.materialRefs[${materialOffset}]`,
            [instructionId, materialId],
          );
        }
        if (isNonEmptyString(materialId)) seen.add(materialId);
      });
    }

    instructionRecords.push({
      path,
      instructionId,
      kind,
      trigger,
      targetRefId,
      resolvedTarget,
      presetId: instructionValue.presetId,
      materialRefs: [...new Set(materialRefs.filter(isNonEmptyString))].sort(),
    });
  });

  for (const targetRefId of [...commentTargetIds].sort()) {
    const target = targetById.get(targetRefId);
    if (!isNonEmptyString(target?.speakerId) && !targetPayloadInvalidIds.has(targetRefId)) {
      addIssue(
        'TARGET_ENTRY_TYPE_PAYLOAD_INVALID',
        targetPathById.get(targetRefId) ?? '$.resolutionPackage.targets',
        [targetRefId, 'information-item', 'information-comment'],
      );
      targetPayloadInvalidIds.add(targetRefId);
    }
  }

  for (const [cueKey, instructionIds] of captionCueInstructionIds) {
    if (instructionIds.length > 1) {
      const [contractId, cueId] = cueKey.split('\u0000');
      addIssue('INSTRUCTION_CAPTION_CUE_REUSED', '$.instructionSet.instructions', [contractId, cueId, ...instructionIds]);
    }
  }

  for (const [targetRefId] of targetById) {
    if ((targetInstructionCounts.get(targetRefId) ?? 0) === 0) {
      addIssue('TARGET_WITHOUT_INSTRUCTION', '$.resolutionPackage.targets', [targetRefId]);
    }
  }

  for (const [contractId, cueMap] of captionCueByContract) {
    for (const cueId of cueMap.keys()) {
      const cueKey = `${contractId}\u0000${cueId}`;
      if ((captionCueInstructionIds.get(cueKey) ?? []).length === 0) {
        addIssue('CAPTION_CUE_WITHOUT_INSTRUCTION', '$.resolutionPackage.captionContracts', [contractId, cueId]);
      }
    }
  }

  for (const record of instructionRecords) {
    const {
      path,
      instructionId,
      kind,
      resolvedTarget,
      presetId,
      materialRefs,
    } = record;
    const preset = isNonEmptyString(presetId) ? presetById.get(presetId) : null;
    if (isNonEmptyString(presetId) && !preset) {
      addIssue('INSTRUCTION_PRESET_UNKNOWN', `${path}.presetId`, [instructionId, presetId]);
    }
    const policy = preset ? presetPoliciesById.get(presetId)?.get(kind) : null;
    if (preset && KIND_SET.has(kind) && !policy) {
      addIssue('INSTRUCTION_PRESET_KIND_UNSUPPORTED', `${path}.presetId`, [instructionId, presetId, kind]);
    }

    const globallyCompatibleMaterials = [];
    const presetCompatibleMaterials = [];
    for (const materialId of materialRefs) {
      const material = materialById.get(materialId);
      if (!material) {
        addIssue('INSTRUCTION_MATERIAL_UNKNOWN', `${path}.materialRefs`, [instructionId, materialId]);
        continue;
      }
      const kindRoles = new Set(ALLOWED_ROLES_BY_KIND[kind] ?? []);
      const policyRoles = new Set(Array.isArray(policy?.allowedMaterialRoles) ? policy.allowedMaterialRoles : []);
      const globallyAllowedRole = kindRoles.has(material.role);
      const presetAllowedRole = policy !== null && policyRoles.has(material.role);
      if (!kindRoles.has(material.role) || (policy && !policyRoles.has(material.role))) {
        addIssue(
          'INSTRUCTION_MATERIAL_ROLE_UNSUPPORTED',
          `${path}.materialRefs`,
          [instructionId, materialId, material.role],
        );
      }
      const targetSubject = getTargetSubject(resolvedTarget);
      const subjects = Array.isArray(material.compatibleSubjects) ? material.compatibleSubjects : [];
      const subjectMatches = targetSubject !== null && subjects.some((subject) => (
        isObject(subject)
        && subject.subjectType === targetSubject.subjectType
        && subject.subjectId === targetSubject.subjectId
      ));
      if (targetSubject !== null && !subjectMatches) {
        addIssue(
          'INSTRUCTION_MATERIAL_TARGET_MISMATCH',
          `${path}.materialRefs`,
          [instructionId, materialId, resolvedTarget?.targetRefId],
        );
      }
      if (globallyAllowedRole && subjectMatches) {
        globallyCompatibleMaterials.push(material);
        if (presetAllowedRole) presetCompatibleMaterials.push(material);
      }
    }

    const presetPresentRoles = new Set(presetCompatibleMaterials.map((material) => material.role));
    if (policy && Array.isArray(policy.requiredMaterialRoles)) {
      for (const requiredRole of policy.requiredMaterialRoles) {
        if (!presetPresentRoles.has(requiredRole)) {
          addIssue(
            'INSTRUCTION_REQUIRED_MATERIAL_MISSING',
            `${path}.materialRefs`,
            [instructionId, presetId, requiredRole],
          );
        }
      }
    }
    const globallyPresentRoles = new Set(globallyCompatibleMaterials.map((material) => material.role));
    if (
      kind === 'reference-supplement'
      && !globallyPresentRoles.has('reference-image')
      && !globallyPresentRoles.has('reference-video')
    ) {
      addIssue('INSTRUCTION_REFERENCE_MATERIAL_MISSING', `${path}.materialRefs`, [instructionId]);
    }
  }

  const delegatedCaptionContracts = [];
  if (sourceDelegationConstructible && captionContractValues.length <= 1) {
    for (const contractId of [...captionContractById.keys()].sort()) {
      const entry = captionContractById.get(contractId);
      const captionInput = {
        schemaVersion: entry.captionSchemaVersion,
        format: instructionSet.format,
        source: {
          atomGranularity: resolutionPackage.atomGranularity,
          atomProvenance: resolutionPackage.sourceProvenance,
          atoms: resolutionPackage.sourceAtoms,
          captionTargets: entry.captionTargets,
          allowedSimultaneousGroups: entry.allowedSimultaneousGroups,
        },
        captionPlan: entry.captionPlan,
      };
      const report = validatePresentationCaptionContract(captionInput);
      const instructionIds = [];
      const cueIds = [];
      for (const [cueKey, ids] of captionCueInstructionIds) {
        const [cueContractId, cueId] = cueKey.split('\u0000');
        if (cueContractId === contractId) {
          instructionIds.push(...ids.filter(isNonEmptyString));
          cueIds.push(cueId);
        }
      }
      delegatedCaptionContracts.push({
        captionContractRefId: contractId,
        instructionIds: [...new Set(instructionIds)].sort(),
        cueIds: [...new Set(cueIds)].sort(),
        report,
      });
    }
  }

  for (const violations of Object.values(buckets)) sortIssues(violations);
  delegatedCaptionContracts.sort((left, right) => (
    left.captionContractRefId.localeCompare(right.captionContractRefId, 'en')
  ));

  const contract = { status: statusFor(buckets.contract), violations: buckets.contract };
  const checks = {
    instructionEnvelope: {
      status: statusFor(buckets.instructionEnvelope),
      violations: buckets.instructionEnvelope,
    },
    resolutionIntegrity: {
      status: statusFor(buckets.resolutionIntegrity),
      violations: buckets.resolutionIntegrity,
    },
    presetCompatibility: {
      status: statusFor(buckets.presetCompatibility),
      violations: buckets.presetCompatibility,
    },
    materialCompatibility: {
      status: statusFor(buckets.materialCompatibility),
      violations: buckets.materialCompatibility,
    },
  };
  const outerFailed = [contract, ...Object.values(checks)].some((check) => check.status === 'failed');
  const sourceFailed = sourceContract?.status === 'failed';
  const captionStatuses = delegatedCaptionContracts.map((entry) => entry.report.overallStatus);
  const captionFailed = captionStatuses.includes('failed');
  const captionHasDeclaredLimit = captionStatuses.includes('passed_with_declared_limit');
  const overallStatus = outerFailed || sourceFailed || captionFailed
    ? 'failed'
    : captionHasDeclaredLimit
      ? 'passed_with_declared_limit'
      : 'passed';

  return {
    checkerVersion: PRESENTATION_INSTRUCTION_CHECKER_VERSION,
    inputSha256: sha256Canonical({ bundle: bundleInput, trustedRegistryBindings: trustedRegistryBindingsInput }),
    overallStatus,
    contract,
    checks,
    delegatedChecks: {
      sourceContract,
      captionContracts: delegatedCaptionContracts,
    },
    scopeExclusions: [...PRESENTATION_INSTRUCTION_SCOPE_EXCLUSIONS],
  };
}

export const serializePresentationInstructionReport = (report) => `${JSON.stringify(report, null, 2)}\n`;
