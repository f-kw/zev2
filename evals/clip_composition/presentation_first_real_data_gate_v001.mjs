import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalJson } from './presentation_caption_contract_v002.mjs';
import {
  PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
  PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_VIOLATION_CODES,
  validatePresentationSourceMediaEquivalenceV001,
} from './presentation_source_media_equivalence_v001.mjs';

export {
  PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_SCHEMA_VERSION,
  validatePresentationSourceMediaEquivalenceV001,
};
export const PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION =
  'presentation-real-data-source-identity-v001';
export const PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION =
  'presentation-real-data-basis-edit-plan-v001';
export const PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION =
  'presentation-internal-trim-review-candidate-manifest-v001';
export const PRESENTATION_INTERNAL_TRIM_HUMAN_REVIEW_RESULT_SCHEMA_VERSION =
  'presentation-internal-trim-human-review-result-v001';
export const PRESENTATION_ASSEMBLY_DECISION_SAVE_PREFLIGHT_SCHEMA_VERSION =
  'presentation-assembly-decision-save-preflight-v001';
export const PRESENTATION_FIRST_REAL_DATA_GATE_CHECKER_VERSION =
  'presentation-first-real-data-gate-checker-v001';

export const PRESENTATION_FIRST_REAL_DATA_GATE_VIOLATION_CODES = Object.freeze([
  'SOURCE_IDENTITY_NOT_OBJECT',
  'SOURCE_IDENTITY_UNKNOWN_FIELD',
  'SOURCE_IDENTITY_SCHEMA_INVALID',
  'SOURCE_IDENTITY_VALUE_INVALID',
  'SOURCE_IDENTITY_REFERENCE_INVALID',
  'BASIS_PLAN_NOT_OBJECT',
  'BASIS_PLAN_UNKNOWN_FIELD',
  'BASIS_PLAN_SCHEMA_INVALID',
  'BASIS_PLAN_VALUE_INVALID',
  'BASIS_PLAN_REFERENCE_INVALID',
  'BASIS_PLAN_CONCRETE_CUT_FORBIDDEN',
  'CANDIDATE_MANIFEST_NOT_OBJECT',
  'CANDIDATE_MANIFEST_UNKNOWN_FIELD',
  'CANDIDATE_MANIFEST_SCHEMA_INVALID',
  'CANDIDATE_MANIFEST_REFERENCE_INVALID',
  'CANDIDATE_MANIFEST_PRESENTER_INVALID',
  'CANDIDATE_MANIFEST_REVIEW_ITEM_INVALID',
  'CANDIDATE_MANIFEST_REVIEW_ITEM_ORDER_INVALID',
  'CANDIDATE_MANIFEST_WORKLOAD_INVALID',
  'REVIEW_RESULT_NOT_OBJECT',
  'REVIEW_RESULT_UNKNOWN_FIELD',
  'REVIEW_RESULT_SCHEMA_INVALID',
  'REVIEW_RESULT_REFERENCE_INVALID',
  'REVIEW_RESULT_CANDIDATE_INVALID',
  'REVIEW_RESULT_DECISION_INVALID',
  'REVIEW_RESULT_SELECTION_INVALID',
  'REVIEW_RESULT_CUT_RANGE_INVALID',
  'REVIEW_RESULT_RETAINED_SEGMENTS_INVALID',
  'REVIEW_RESULT_FINAL_DISPOSITION_INVALID',
  'REVIEW_RESULT_SUMMARY_INVALID',
  'REVIEW_RESULT_PAYLOAD_HASH_MISMATCH',
  'COMPLEMENT_OUTER_RANGE_INVALID',
  'COMPLEMENT_CUT_RANGE_INVALID',
  'COMPLEMENT_CUT_OVERLAP',
  'ARTIFACT_BINDING_INVALID',
  'TRUSTED_REFERENCE_INVALID',
  'TRUSTED_REFERENCE_MISMATCH',
  'CHAIN_REFERENCE_MISMATCH',
  'CHAIN_CANDIDATE_MISMATCH',
  'CHAIN_REVIEW_ITEM_MISMATCH',
  'SAVE_PREFLIGHT_NOT_OBJECT',
  'SAVE_PREFLIGHT_UNKNOWN_FIELD',
  'SAVE_PREFLIGHT_SCHEMA_INVALID',
  'SAVE_PREFLIGHT_VALUE_INVALID',
  'SAVE_PREFLIGHT_REFERENCE_INVALID',
  'SAVE_PREFLIGHT_CHECKS_INVALID',
  'SAVE_PREFLIGHT_STATUS_INCONSISTENT',
  'SAVE_PREFLIGHT_NOT_READY',
]);

const PREFLIGHT_ALLOWED_VIOLATION_CODES = new Set([
  ...PRESENTATION_SOURCE_MEDIA_EQUIVALENCE_VIOLATION_CODES,
  ...PRESENTATION_FIRST_REAL_DATA_GATE_VIOLATION_CODES,
]);

const CODE_ORDER = new Map(
  PRESENTATION_FIRST_REAL_DATA_GATE_VIOLATION_CODES.map((code, index) => [code, index]),
);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const HTTP_URL_PATTERN = /^https:\/\/[^\s]+$/;
const FIRST_REAL_DATA_VIDEO_ID = 'DmWu0jVQfTE';
const FIRST_REAL_DATA_SOURCE_URL = 'https://www.youtube.com/watch?v=DmWu0jVQfTE';
const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001 = Object.freeze({
  path: 'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/artifact-build-summary.json',
  fileSha256: '20f8d63fc421d7ab439e5c633b862a3d52f52c0305994b979080d2fb837f8199',
});
const PRESENTATION_FIRST_REAL_DATA_ARTIFACT_BUILD_SUMMARY_SCHEMA_VERSION =
  'presentation-first-real-data-artifact-build-summary-v001';
const TRUSTED_ARTIFACT_FIELDS = Object.freeze([
  'mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'candidateManifest',
]);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isString = (value) => typeof value === 'string';
const isNonEmptyString = (value) => isString(value) && value.length > 0;
const isInteger = (value) => Number.isInteger(value) && Number.isFinite(value);
const isNonNegativeInteger = (value) => isInteger(value) && value >= 0;
const isPositiveInteger = (value) => isInteger(value) && value > 0;
const isSha256 = (value) => isString(value) && SHA256_PATTERN.test(value);
const isBoolean = (value) => typeof value === 'boolean';

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

export const presentationFirstRealDataCanonicalSha256 = (value) => createHash('sha256')
  .update(canonicalJson(value))
  .digest('hex');

const exactFields = (value, expected) => (
  isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
);

const unknownFields = (value, expected) => (
  isObject(value) ? Object.keys(value).filter((key) => !expected.includes(key)).sort() : []
);

const issue = (code, path, relatedIds = [], details = undefined) => {
  const value = {
    code,
    path,
    relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  };
  if (details !== undefined) value.details = canonicalize(details);
  return value;
};

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

const validationReport = (targetSchemaVersion, input, violations) => ({
  schemaVersion: 'presentation-first-real-data-contract-validation-v001',
  checkerVersion: PRESENTATION_FIRST_REAL_DATA_GATE_CHECKER_VERSION,
  targetSchemaVersion,
  status: violations.length === 0 ? 'passed' : 'failed',
  inputCanonicalSha256: presentationFirstRealDataCanonicalSha256(input),
  violations: sortIssues(violations),
});

const addUnknownIssues = (value, expected, code, path, add) => {
  unknownFields(value, expected).forEach((field) => add(code, `${path}.${field}`));
};

const validRelativePath = (value) => (
  isNonEmptyString(value)
  && !value.startsWith('/')
  && !value.split('/').includes('..')
);

const isWithinWorkspace = (absolutePath) => {
  const fromRoot = relative(WORKSPACE_ROOT, absolutePath);
  return fromRoot !== '' && fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`) && !fromRoot.startsWith(sep);
};

const sameFileIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino;
const sameFileSnapshot = (left, right) => (
  sameFileIdentity(left, right)
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs
);

const resolvePresentationFirstRealDataWorkspaceFileV001 = async (relativePath) => {
  if (!validRelativePath(relativePath)) throw new TypeError('workspace-relative artifact path is required');
  const absolutePath = resolve(WORKSPACE_ROOT, relativePath);
  if (!isWithinWorkspace(absolutePath)) throw new TypeError('artifact path must stay inside workspace');
  const pathFromRoot = relative(WORKSPACE_ROOT, absolutePath);
  const components = pathFromRoot.split(sep).filter(Boolean);
  let currentPath = WORKSPACE_ROOT;
  const rootStat = await lstat(currentPath, {bigint: true});
  if (rootStat.isSymbolicLink()) {
    throw new TypeError('artifact path and every ancestor must be non-symlink');
  }
  let pathStat = rootStat;
  for (const component of components) {
    currentPath = resolve(currentPath, component);
    const componentStat = await lstat(currentPath, {bigint: true});
    if (componentStat.isSymbolicLink()) {
      throw new TypeError('artifact path and every ancestor must be non-symlink');
    }
    pathStat = componentStat;
  }
  if (!pathStat.isFile()) throw new TypeError('artifact path must be a regular non-symlink file');
  const resolvedPath = await realpath(absolutePath);
  if (!isWithinWorkspace(resolvedPath)) throw new TypeError('artifact real path must stay inside workspace');
  return {absolutePath, resolvedPath, pathStat};
};

const readStablePresentationFirstRealDataFileV001 = async (
  relativePath,
  {collectBytes = false, expectedSha256 = null, keepOpen = false} = {},
) => {
  const beforePath = await resolvePresentationFirstRealDataWorkspaceFileV001(relativePath);
  const noFollowFlag = fsConstants.O_NOFOLLOW;
  if (!Number.isInteger(noFollowFlag)) throw new TypeError('O_NOFOLLOW is unavailable');
  let fileHandle = null;
  try {
    fileHandle = await open(
      beforePath.absolutePath,
      fsConstants.O_RDONLY | noFollowFlag,
    );
    const handleBefore = await fileHandle.stat({bigint: true});
    if (!handleBefore.isFile() || !sameFileIdentity(beforePath.pathStat, handleBefore)) {
      throw new TypeError('opened file identity does not match the verified path');
    }
    const hash = createHash('sha256');
    const chunks = collectBytes ? [] : null;
    for await (const chunk of fileHandle.createReadStream({start: 0, autoClose: false})) {
      hash.update(chunk);
      if (chunks) chunks.push(chunk);
    }
    const handleAfter = await fileHandle.stat({bigint: true});
    const afterPath = await resolvePresentationFirstRealDataWorkspaceFileV001(relativePath);
    if (
      beforePath.resolvedPath !== afterPath.resolvedPath
      || !sameFileSnapshot(handleBefore, handleAfter)
      || !sameFileIdentity(handleAfter, afterPath.pathStat)
    ) throw new TypeError('file changed or path identity changed during verified read');
    const actualSha256 = hash.digest('hex');
    if (expectedSha256 !== null && actualSha256 !== expectedSha256) {
      throw new TypeError(`trusted file byte hash mismatch: ${relativePath}`);
    }
    const result = {
      path: relativePath,
      fileSha256: actualSha256,
      size: Number(handleAfter.size),
      snapshot: handleAfter,
    };
    if (chunks) result.bytes = Buffer.concat(chunks);
    if (keepOpen) {
      const retainedHandle = fileHandle;
      let retainedHandleClosed = false;
      result.fileHandle = retainedHandle;
      result.assertUnchanged = async () => {
        if (retainedHandleClosed) throw new TypeError('verified open file is already closed');
        const currentHandle = await retainedHandle.stat({bigint: true});
        const currentPath = await resolvePresentationFirstRealDataWorkspaceFileV001(relativePath);
        if (
          !sameFileSnapshot(handleAfter, currentHandle)
          || currentPath.resolvedPath !== afterPath.resolvedPath
          || !sameFileIdentity(currentHandle, currentPath.pathStat)
        ) throw new TypeError('verified open file or its path changed');
      };
      result.close = async () => {
        if (retainedHandleClosed) return;
        retainedHandleClosed = true;
        await retainedHandle.close();
      };
      fileHandle = null;
    }
    return result;
  } finally {
    if (fileHandle) await fileHandle.close();
  }
};

/**
 * JSON artifactを実ファイルから読み、byte hashとcanonical value hashを同時に束縛する。
 * preflightへ手書きのvalueだけを渡す経路は、正式な実データ入口ではない。
 */
export async function loadPresentationFirstRealDataArtifactBindingV001(relativePath) {
  const {bytes, fileSha256} = await readStablePresentationFirstRealDataFileV001(
    relativePath,
    {collectBytes: true},
  );
  const value = JSON.parse(bytes.toString('utf8'));
  if (!isObject(value)) throw new TypeError('artifact JSON root must be an object');
  return {
    path: relativePath,
    fileSha256,
    valueCanonicalSha256: presentationFirstRealDataCanonicalSha256(value),
    value,
  };
}

/**
 * JSON以外の実行媒体を含む参照も、workspace内の非symlink実体byteへ束縛する。
 * 大容量動画は全byteをメモリへ載せずstream hashで検査する。
 */
export async function verifyPresentationFirstRealDataFileReferenceV001(reference) {
  if (
    !exactFields(reference, ['path', 'fileSha256'])
    || !validRelativePath(reference.path)
    || !isSha256(reference.fileSha256)
  ) throw new TypeError('path and fileSha256 are required for file verification');
  const verified = await readStablePresentationFirstRealDataFileV001(reference.path, {
    expectedSha256: reference.fileSha256,
  });
  return {path: verified.path, fileSha256: verified.fileSha256};
}

export async function readPresentationFirstRealDataVerifiedFileBytesV001(reference) {
  if (
    !exactFields(reference, ['path', 'fileSha256'])
    || !validRelativePath(reference.path)
    || !isSha256(reference.fileSha256)
  ) throw new TypeError('path and fileSha256 are required for file verification');
  const verified = await readStablePresentationFirstRealDataFileV001(reference.path, {
    collectBytes: true,
    expectedSha256: reference.fileSha256,
  });
  return {path: verified.path, fileSha256: verified.fileSha256, bytes: verified.bytes};
}

export async function openPresentationFirstRealDataVerifiedFileV001(reference) {
  if (
    !exactFields(reference, ['path', 'fileSha256'])
    || !validRelativePath(reference.path)
    || !isSha256(reference.fileSha256)
  ) throw new TypeError('path and fileSha256 are required for file verification');
  return readStablePresentationFirstRealDataFileV001(reference.path, {
    expectedSha256: reference.fileSha256,
    keepOpen: true,
  });
}

const inspectArtifactReference = (value, path, code, add) => {
  addUnknownIssues(value, ['path', 'fileSha256'], code, path, add);
  if (!exactFields(value, ['path', 'fileSha256']) || !validRelativePath(value.path) || !isSha256(value.fileSha256)) {
    add(code, path);
    return false;
  }
  return true;
};

const sameReference = (left, right) => (
  isObject(left)
  && isObject(right)
  && left.path === right.path
  && left.fileSha256 === right.fileSha256
);

const inspectRange = (value, path, code, add) => {
  addUnknownIssues(value, ['startMs', 'endMs'], code, path, add);
  const valid = exactFields(value, ['startMs', 'endMs'])
    && isNonNegativeInteger(value.startMs)
    && isPositiveInteger(value.endMs)
    && value.startMs < value.endMs;
  if (!valid) add(code, path);
  return valid;
};

const inspectSourceCharacter = (value, path, code, add) => {
  addUnknownIssues(value, ['characterId', 'text', 'startMs', 'endMs'], code, path, add);
  const valid = exactFields(value, ['characterId', 'text', 'startMs', 'endMs'])
    && isNonEmptyString(value.characterId)
    && isNonEmptyString(value.text)
    && isNonNegativeInteger(value.startMs)
    && isNonNegativeInteger(value.endMs)
    && value.startMs <= value.endMs;
  if (!valid) add(code, path, [value?.characterId]);
  return valid;
};

const inspectUtterance = (value, path, code, add) => {
  const fields = ['speechId', 'startMs', 'endMs', 'text', 'characters'];
  addUnknownIssues(value, fields, code, path, add);
  let valid = exactFields(value, fields)
    && isInteger(value.speechId)
    && isNonEmptyString(value.text)
    && isNonNegativeInteger(value.startMs)
    && isPositiveInteger(value.endMs)
    && value.startMs < value.endMs;
  const characters = Array.isArray(value?.characters) ? value.characters : [];
  if (!Array.isArray(value?.characters) || characters.length === 0) valid = false;
  const characterIds = new Set();
  let previous = null;
  characters.forEach((character, index) => {
    const characterPath = `${path}.characters[${index}]`;
    if (!inspectSourceCharacter(character, characterPath, code, add)) valid = false;
    if (isNonEmptyString(character?.characterId)) {
      if (characterIds.has(character.characterId)) {
        valid = false;
        add(code, `${characterPath}.characterId`, [character.characterId]);
      }
      characterIds.add(character.characterId);
    }
    if (
      previous
      && isNonNegativeInteger(previous.startMs)
      && isNonNegativeInteger(character?.startMs)
      && character.startMs < previous.startMs
    ) {
      valid = false;
      add(code, characterPath, [character?.characterId], { reason: 'character-time-order' });
    }
    if (
      isNonNegativeInteger(character?.startMs)
      && isNonNegativeInteger(character?.endMs)
      && (character.startMs < value.startMs || character.endMs > value.endMs)
    ) {
      valid = false;
      add(code, characterPath, [character?.characterId], { reason: 'character-outside-utterance' });
    }
    previous = character;
  });
  if (characters.map((character) => character?.text ?? '').join('') !== value.text) {
    valid = false;
    add(code, `${path}.characters`, [], { reason: 'character-text-does-not-reconstruct-utterance' });
  }
  if (!valid) add(code, path);
  return valid;
};

const inspectReferenceSet = (value, fields, path, code, add) => {
  addUnknownIssues(value, fields, code, path, add);
  let valid = exactFields(value, fields);
  fields.forEach((field) => {
    if (!inspectArtifactReference(value?.[field], `${path}.${field}`, code, add)) valid = false;
  });
  if (!valid) add(code, path);
  return valid;
};

const emitValidation = (targetSchemaVersion, input, inspect) => {
  const violations = [];
  const add = (code, path, relatedIds = [], details) => {
    violations.push(issue(code, path, relatedIds, details));
  };
  inspect(input, add);
  return validationReport(targetSchemaVersion, input, violations);
};

export function validatePresentationRealDataSourceIdentityV001(input) {
  return emitValidation(PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION, input, (rootInput, add) => {
    if (!isObject(rootInput)) add('SOURCE_IDENTITY_NOT_OBJECT', '$');
    const root = isObject(rootInput) ? rootInput : {};
    const rootFields = [
      'schemaVersion', 'sourceIdentityId', 'videoId', 'sourceUrl', 'sourceProvenance', 'sourceRef',
      'executionMedia', 'mediaEquivalence', 'stt',
    ];
    addUnknownIssues(rootInput, rootFields, 'SOURCE_IDENTITY_UNKNOWN_FIELD', '$', add);
    if (!exactFields(rootInput, rootFields)) add('SOURCE_IDENTITY_SCHEMA_INVALID', '$');
    if (root.schemaVersion !== PRESENTATION_REAL_DATA_SOURCE_IDENTITY_SCHEMA_VERSION) {
      add('SOURCE_IDENTITY_SCHEMA_INVALID', '$.schemaVersion');
    }
    if (
      !isNonEmptyString(root.sourceIdentityId)
      || root.videoId !== FIRST_REAL_DATA_VIDEO_ID
      || root.sourceUrl !== FIRST_REAL_DATA_SOURCE_URL
      || !isNonEmptyString(root.sourceProvenance)
      || !isNonEmptyString(root.sourceRef)
      || !HTTP_URL_PATTERN.test(root.sourceUrl ?? '')
    ) add('SOURCE_IDENTITY_VALUE_INVALID', '$');
    for (const field of ['executionMedia', 'mediaEquivalence']) {
      inspectArtifactReference(root[field], `$.${field}`, 'SOURCE_IDENTITY_REFERENCE_INVALID', add);
    }
    inspectReferenceSet(
      root.stt,
      ['manifest', 'transcript', 'wordTimestamps'],
      '$.stt',
      'SOURCE_IDENTITY_REFERENCE_INVALID',
      add,
    );
  });
}

export function validatePresentationRealDataBasisEditPlanV001(input) {
  return emitValidation(PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION, input, (rootInput, add) => {
    if (!isObject(rootInput)) add('BASIS_PLAN_NOT_OBJECT', '$');
    const root = isObject(rootInput) ? rootInput : {};
    const rootFields = ['schemaVersion', 'basisPlanId', 'kind', 'references', 'candidate'];
    addUnknownIssues(rootInput, rootFields, 'BASIS_PLAN_UNKNOWN_FIELD', '$', add);
    if (!exactFields(rootInput, rootFields)) add('BASIS_PLAN_SCHEMA_INVALID', '$');
    if (root.schemaVersion !== PRESENTATION_REAL_DATA_BASIS_EDIT_PLAN_SCHEMA_VERSION) {
      add('BASIS_PLAN_SCHEMA_INVALID', '$.schemaVersion');
    }
    if (!isNonEmptyString(root.basisPlanId) || root.kind !== 'edit_plan_json') {
      add('BASIS_PLAN_VALUE_INVALID', '$');
    }
    inspectReferenceSet(
      root.references,
      ['sourceIdentity', 'mediaEquivalence', 'humanResult'],
      '$.references',
      'BASIS_PLAN_REFERENCE_INVALID',
      add,
    );
    const candidate = isObject(root.candidate) ? root.candidate : {};
    const candidateFields = ['candidateId', 'title', 'outerRange', 'qualitativeInternalEdit'];
    addUnknownIssues(root.candidate, candidateFields, 'BASIS_PLAN_UNKNOWN_FIELD', '$.candidate', add);
    const edit = isObject(candidate.qualitativeInternalEdit) ? candidate.qualitativeInternalEdit : {};
    const editFields = ['kind', 'sourceValue', 'resolved'];
    addUnknownIssues(candidate.qualitativeInternalEdit, editFields, 'BASIS_PLAN_UNKNOWN_FIELD', '$.candidate.qualitativeInternalEdit', add);
    const valid = exactFields(root.candidate, candidateFields)
      && isPositiveInteger(candidate.candidateId)
      && isNonEmptyString(candidate.title)
      && inspectRange(candidate.outerRange, '$.candidate.outerRange', 'BASIS_PLAN_VALUE_INVALID', add)
      && exactFields(candidate.qualitativeInternalEdit, editFields)
      && edit.kind === 'remove_silence_and_fillers'
      && edit.sourceValue === 'remove_silence_and_fillers'
      && edit.resolved === false;
    if (!valid) add('BASIS_PLAN_VALUE_INVALID', '$.candidate');
    if (Object.prototype.hasOwnProperty.call(root, 'cuts') || Object.prototype.hasOwnProperty.call(candidate, 'cuts')) {
      add('BASIS_PLAN_CONCRETE_CUT_FORBIDDEN', '$');
    }
  });
}

export function validatePresentationInternalTrimCandidateManifestV001(input) {
  return emitValidation(
    PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION,
    input,
    (rootInput, add) => {
      if (!isObject(rootInput)) add('CANDIDATE_MANIFEST_NOT_OBJECT', '$');
      const root = isObject(rootInput) ? rootInput : {};
      const rootFields = ['schemaVersion', 'manifestId', 'references', 'candidate', 'presenter', 'reviewItems', 'workload'];
      addUnknownIssues(rootInput, rootFields, 'CANDIDATE_MANIFEST_UNKNOWN_FIELD', '$', add);
      if (!exactFields(rootInput, rootFields)) add('CANDIDATE_MANIFEST_SCHEMA_INVALID', '$');
      if (
        root.schemaVersion !== PRESENTATION_INTERNAL_TRIM_REVIEW_CANDIDATE_MANIFEST_SCHEMA_VERSION
        || !isNonEmptyString(root.manifestId)
      ) add('CANDIDATE_MANIFEST_SCHEMA_INVALID', '$.schemaVersion');
      inspectReferenceSet(
        root.references,
        ['mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'sttManifest', 'wordTimestamps'],
        '$.references',
        'CANDIDATE_MANIFEST_REFERENCE_INVALID',
        add,
      );
      const candidate = isObject(root.candidate) ? root.candidate : {};
      const candidateFields = ['candidateId', 'title', 'outerRange'];
      addUnknownIssues(root.candidate, candidateFields, 'CANDIDATE_MANIFEST_UNKNOWN_FIELD', '$.candidate', add);
      if (
        !exactFields(root.candidate, candidateFields)
        || !isPositiveInteger(candidate.candidateId)
        || !isNonEmptyString(candidate.title)
        || !inspectRange(candidate.outerRange, '$.candidate.outerRange', 'CANDIDATE_MANIFEST_SCHEMA_INVALID', add)
      ) add('CANDIDATE_MANIFEST_SCHEMA_INVALID', '$.candidate');
      const presenter = isObject(root.presenter) ? root.presenter : {};
      const presenterFields = ['lineage', 'role', 'minimumGapMs', 'automaticCut', 'paddingApplied'];
      addUnknownIssues(root.presenter, presenterFields, 'CANDIDATE_MANIFEST_UNKNOWN_FIELD', '$.presenter', add);
      if (
        !exactFields(root.presenter, presenterFields)
        || presenter.lineage !== 'layer1-trim-v001@deterministic-rule'
        || presenter.role !== 'review-position-presenter'
        || presenter.minimumGapMs !== 400
        || presenter.automaticCut !== false
        || presenter.paddingApplied !== false
      ) add('CANDIDATE_MANIFEST_PRESENTER_INVALID', '$.presenter');

      const reviewItems = Array.isArray(root.reviewItems) ? root.reviewItems : [];
      if (!Array.isArray(root.reviewItems) || reviewItems.length === 0) {
        add('CANDIDATE_MANIFEST_REVIEW_ITEM_INVALID', '$.reviewItems');
      }
      const itemIds = new Set();
      let previousGap = null;
      reviewItems.forEach((itemValue, index) => {
        const path = `$.reviewItems[${index}]`;
        const item = isObject(itemValue) ? itemValue : {};
        const fields = ['reviewItemId', 'gap', 'protectionReasons', 'fillerCandidateCount', 'beforeUtterance', 'afterUtterance'];
        addUnknownIssues(itemValue, fields, 'CANDIDATE_MANIFEST_UNKNOWN_FIELD', path, add);
        let valid = exactFields(itemValue, fields)
          && isNonEmptyString(item.reviewItemId)
          && !itemIds.has(item.reviewItemId)
          && inspectRange(item.gap, `${path}.gap`, 'CANDIDATE_MANIFEST_REVIEW_ITEM_INVALID', add)
          && Array.isArray(item.protectionReasons)
          && item.protectionReasons.length > 0
          && item.protectionReasons.every(isNonEmptyString)
          && item.fillerCandidateCount === 0
          && inspectUtterance(item.beforeUtterance, `${path}.beforeUtterance`, 'CANDIDATE_MANIFEST_REVIEW_ITEM_INVALID', add)
          && inspectUtterance(item.afterUtterance, `${path}.afterUtterance`, 'CANDIDATE_MANIFEST_REVIEW_ITEM_INVALID', add);
        if (isNonEmptyString(item.reviewItemId)) itemIds.add(item.reviewItemId);
        if (
          item.gap?.startMs !== item.beforeUtterance?.endMs
          || item.gap?.endMs !== item.afterUtterance?.startMs
          || item.gap?.endMs - item.gap?.startMs < 400
          || item.beforeUtterance?.startMs < candidate.outerRange?.startMs
          || item.afterUtterance?.endMs > candidate.outerRange?.endMs
        ) valid = false;
        if (!valid) add('CANDIDATE_MANIFEST_REVIEW_ITEM_INVALID', path, [item.reviewItemId]);
        if (previousGap && item.gap?.startMs < previousGap.endMs) {
          add('CANDIDATE_MANIFEST_REVIEW_ITEM_ORDER_INVALID', `${path}.gap`, [item.reviewItemId]);
        }
        previousGap = item.gap;
      });

      const workload = isObject(root.workload) ? root.workload : {};
      const workloadFields = [
        'independentJudgmentCount', 'requiredExplicitOperationCount', 'initialPositionSearchCount',
        'requiredPlaybackRanges', 'editedPlaybackDurationRangeMs', 'totalInitialPlaybackDurationRangeMs',
      ];
      addUnknownIssues(root.workload, workloadFields, 'CANDIDATE_MANIFEST_UNKNOWN_FIELD', '$.workload', add);
      let workloadValid = exactFields(root.workload, workloadFields)
        && workload.independentJudgmentCount === reviewItems.length + 1
        && workload.requiredExplicitOperationCount === reviewItems.length * 3 + 4
        && workload.initialPositionSearchCount === 0;
      const playbackRanges = Array.isArray(workload.requiredPlaybackRanges)
        ? workload.requiredPlaybackRanges : [];
      if (playbackRanges.length !== reviewItems.length + 1) workloadValid = false;
      let fixedPlaybackDuration = 0;
      const playbackIds = new Set();
      playbackRanges.forEach((range, index) => {
        const path = `$.workload.requiredPlaybackRanges[${index}]`;
        const fields = ['playbackId', 'label', 'startMs', 'endMs', 'durationMs'];
        addUnknownIssues(range, fields, 'CANDIDATE_MANIFEST_UNKNOWN_FIELD', path, add);
        if (
          !exactFields(range, fields)
          || !isNonEmptyString(range.playbackId)
          || playbackIds.has(range.playbackId)
          || !isNonEmptyString(range.label)
          || !isNonNegativeInteger(range.startMs)
          || !isPositiveInteger(range.endMs)
          || range.startMs >= range.endMs
          || range.durationMs !== range.endMs - range.startMs
        ) workloadValid = false;
        if (isNonEmptyString(range.playbackId)) playbackIds.add(range.playbackId);
        const expectedRange = index === 0
          ? {
            playbackId: 'original',
            startMs: candidate.outerRange?.startMs,
            endMs: candidate.outerRange?.endMs,
          }
          : {
            playbackId: `${reviewItems[index - 1]?.reviewItemId}-context`,
            startMs: reviewItems[index - 1]?.beforeUtterance?.startMs,
            endMs: reviewItems[index - 1]?.afterUtterance?.endMs,
          };
        if (
          range.playbackId !== expectedRange.playbackId
          || range.startMs !== expectedRange.startMs
          || range.endMs !== expectedRange.endMs
        ) workloadValid = false;
        fixedPlaybackDuration += isNonNegativeInteger(range.durationMs) ? range.durationMs : 0;
      });
      const durationRangeFields = ['minimumMs', 'maximumMs'];
      for (const field of ['editedPlaybackDurationRangeMs', 'totalInitialPlaybackDurationRangeMs']) {
        const range = workload[field];
        addUnknownIssues(range, durationRangeFields, 'CANDIDATE_MANIFEST_UNKNOWN_FIELD', `$.workload.${field}`, add);
        if (
          !exactFields(range, durationRangeFields)
          || !isNonNegativeInteger(range.minimumMs)
          || !isNonNegativeInteger(range.maximumMs)
          || range.minimumMs > range.maximumMs
        ) workloadValid = false;
      }
      const outerDuration = candidate.outerRange?.endMs - candidate.outerRange?.startMs;
      const totalGapDuration = reviewItems.reduce(
        (sum, item) => sum + Math.max(0, (item.gap?.endMs ?? 0) - (item.gap?.startMs ?? 0)),
        0,
      );
      if (
        workload.editedPlaybackDurationRangeMs?.minimumMs !== outerDuration - totalGapDuration
        || workload.editedPlaybackDurationRangeMs?.maximumMs !== outerDuration
        || workload.totalInitialPlaybackDurationRangeMs?.minimumMs
          !== fixedPlaybackDuration + (workload.editedPlaybackDurationRangeMs?.minimumMs ?? -1)
        || workload.totalInitialPlaybackDurationRangeMs?.maximumMs
          !== fixedPlaybackDuration + (workload.editedPlaybackDurationRangeMs?.maximumMs ?? -1)
      ) workloadValid = false;
      if (!workloadValid) add('CANDIDATE_MANIFEST_WORKLOAD_INVALID', '$.workload');
    },
  );
}

export function computePresentationRetainedSegmentsV001(outerRange, cuts) {
  const violations = [];
  const add = (code, path, relatedIds = [], details) => violations.push(issue(code, path, relatedIds, details));
  const validOuter = inspectRange(outerRange, '$.outerRange', 'COMPLEMENT_OUTER_RANGE_INVALID', add);
  const cutValues = Array.isArray(cuts) ? cuts : [];
  if (!Array.isArray(cuts)) add('COMPLEMENT_CUT_RANGE_INVALID', '$.cuts');
  const normalized = [];
  cutValues.forEach((cutValue, index) => {
    const path = `$.cuts[${index}]`;
    const cut = isObject(cutValue) ? cutValue : {};
    if (
      !inspectRange(cutValue, path, 'COMPLEMENT_CUT_RANGE_INVALID', add)
      || !validOuter
      || cut.startMs < outerRange.startMs
      || cut.endMs > outerRange.endMs
    ) {
      add('COMPLEMENT_CUT_RANGE_INVALID', path);
      return;
    }
    normalized.push({ startMs: cut.startMs, endMs: cut.endMs, index });
  });
  normalized.sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs || left.index - right.index);
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].startMs < normalized[index - 1].endMs) {
      add('COMPLEMENT_CUT_OVERLAP', `$.cuts[${normalized[index].index}]`);
    }
  }
  if (violations.length > 0) {
    return {
      status: 'failed',
      segments: [],
      violations: sortIssues(violations),
      canonicalSha256: presentationFirstRealDataCanonicalSha256([]),
    };
  }
  const segments = [];
  let cursor = outerRange.startMs;
  normalized.forEach((cut) => {
    if (cursor < cut.startMs) segments.push({ startMs: cursor, endMs: cut.startMs });
    cursor = cut.endMs;
  });
  if (cursor < outerRange.endMs) segments.push({ startMs: cursor, endMs: outerRange.endMs });
  return {
    status: 'passed',
    segments,
    violations: [],
    canonicalSha256: presentationFirstRealDataCanonicalSha256(segments),
  };
}

const inspectSelectionBoundary = (value, path, code, add) => {
  const fields = ['characterId', 'text', 'startMs', 'endMs', 'contextBefore', 'contextAfter'];
  addUnknownIssues(value, fields, 'REVIEW_RESULT_UNKNOWN_FIELD', path, add);
  const valid = exactFields(value, fields)
    && isNonEmptyString(value.characterId)
    && isNonEmptyString(value.text)
    && isNonNegativeInteger(value.startMs)
    && isNonNegativeInteger(value.endMs)
    && value.startMs <= value.endMs
    && isString(value.contextBefore)
    && isString(value.contextAfter);
  if (!valid) add(code, path, [value?.characterId]);
  return valid;
};

export function validatePresentationInternalTrimHumanReviewResultV001(input) {
  return emitValidation(
    PRESENTATION_INTERNAL_TRIM_HUMAN_REVIEW_RESULT_SCHEMA_VERSION,
    input,
    (rootInput, add) => {
      if (!isObject(rootInput)) add('REVIEW_RESULT_NOT_OBJECT', '$');
      const root = isObject(rootInput) ? rootInput : {};
      const rootFields = ['schemaVersion', 'recordId', 'payload', 'humanReadableSummary', 'payloadSha256'];
      addUnknownIssues(rootInput, rootFields, 'REVIEW_RESULT_UNKNOWN_FIELD', '$', add);
      if (!exactFields(rootInput, rootFields)) add('REVIEW_RESULT_SCHEMA_INVALID', '$');
      if (
        root.schemaVersion !== PRESENTATION_INTERNAL_TRIM_HUMAN_REVIEW_RESULT_SCHEMA_VERSION
        || !isNonEmptyString(root.recordId)
      ) add('REVIEW_RESULT_SCHEMA_INVALID', '$.schemaVersion');
      const payload = isObject(root.payload) ? root.payload : {};
      const payloadFields = ['references', 'candidate', 'decisions', 'retainedSegments', 'finalDisposition', 'positionSearchCount'];
      addUnknownIssues(root.payload, payloadFields, 'REVIEW_RESULT_UNKNOWN_FIELD', '$.payload', add);
      if (!exactFields(root.payload, payloadFields)) add('REVIEW_RESULT_SCHEMA_INVALID', '$.payload');
      inspectReferenceSet(
        payload.references,
        ['basisEditPlan', 'sourceIdentity', 'mediaEquivalence', 'sttManifest', 'wordTimestamps', 'candidateManifest'],
        '$.payload.references',
        'REVIEW_RESULT_REFERENCE_INVALID',
        add,
      );
      const candidate = isObject(payload.candidate) ? payload.candidate : {};
      const candidateFields = ['candidateId', 'outerRange'];
      addUnknownIssues(payload.candidate, candidateFields, 'REVIEW_RESULT_UNKNOWN_FIELD', '$.payload.candidate', add);
      if (
        !exactFields(payload.candidate, candidateFields)
        || !isPositiveInteger(candidate.candidateId)
        || !inspectRange(candidate.outerRange, '$.payload.candidate.outerRange', 'REVIEW_RESULT_CANDIDATE_INVALID', add)
      ) add('REVIEW_RESULT_CANDIDATE_INVALID', '$.payload.candidate');

      const decisions = Array.isArray(payload.decisions) ? payload.decisions : [];
      if (!Array.isArray(payload.decisions) || decisions.length === 0) {
        add('REVIEW_RESULT_DECISION_INVALID', '$.payload.decisions');
      }
      const decisionIds = new Set();
      const cuts = [];
      decisions.forEach((decisionValue, index) => {
        const path = `$.payload.decisions[${index}]`;
        const decision = isObject(decisionValue) ? decisionValue : {};
        const fields = ['reviewItemId', 'answer', 'modified', 'cutRange', 'selection'];
        addUnknownIssues(decisionValue, fields, 'REVIEW_RESULT_UNKNOWN_FIELD', path, add);
        let valid = exactFields(decisionValue, fields)
          && isNonEmptyString(decision.reviewItemId)
          && !decisionIds.has(decision.reviewItemId)
          && ['unanswered', 'cut', 'keep'].includes(decision.answer)
          && isBoolean(decision.modified);
        if (isNonEmptyString(decision.reviewItemId)) decisionIds.add(decision.reviewItemId);
        if (decision.answer === 'cut') {
          if (!inspectRange(decision.cutRange, `${path}.cutRange`, 'REVIEW_RESULT_CUT_RANGE_INVALID', add)) valid = false;
          else {
            cuts.push(decision.cutRange);
            if (
              decision.cutRange.startMs < candidate.outerRange?.startMs
              || decision.cutRange.endMs > candidate.outerRange?.endMs
            ) {
              valid = false;
              add('REVIEW_RESULT_CUT_RANGE_INVALID', `${path}.cutRange`, [decision.reviewItemId]);
            }
          }
          if (decision.modified) {
            const selection = isObject(decision.selection) ? decision.selection : {};
            const selectionFields = ['beforeLastKeptCharacter', 'afterFirstKeptCharacter'];
            addUnknownIssues(decision.selection, selectionFields, 'REVIEW_RESULT_UNKNOWN_FIELD', `${path}.selection`, add);
            if (
              !exactFields(decision.selection, selectionFields)
              || !inspectSelectionBoundary(selection.beforeLastKeptCharacter, `${path}.selection.beforeLastKeptCharacter`, 'REVIEW_RESULT_SELECTION_INVALID', add)
              || !inspectSelectionBoundary(selection.afterFirstKeptCharacter, `${path}.selection.afterFirstKeptCharacter`, 'REVIEW_RESULT_SELECTION_INVALID', add)
              || decision.cutRange?.startMs !== selection.beforeLastKeptCharacter?.endMs
              || decision.cutRange?.endMs !== selection.afterFirstKeptCharacter?.startMs
              || selection.beforeLastKeptCharacter?.endMs >= selection.afterFirstKeptCharacter?.startMs
            ) {
              valid = false;
              add('REVIEW_RESULT_SELECTION_INVALID', `${path}.selection`);
            }
          } else if (decision.selection !== null) {
            valid = false;
            add('REVIEW_RESULT_SELECTION_INVALID', `${path}.selection`);
          }
        } else if (decision.cutRange !== null || decision.selection !== null || decision.modified !== false) {
          valid = false;
          add('REVIEW_RESULT_DECISION_INVALID', path, [decision.reviewItemId]);
        }
        if (!valid) add('REVIEW_RESULT_DECISION_INVALID', path, [decision.reviewItemId]);
      });
      if (
        !isNonNegativeInteger(payload.positionSearchCount)
        || payload.positionSearchCount > decisions.length * 2
      ) {
        add('REVIEW_RESULT_DECISION_INVALID', '$.payload.positionSearchCount');
      }
      const orderedCuts = cuts
        .map((cut, index) => ({ ...cut, index }))
        .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
      for (let index = 1; index < orderedCuts.length; index += 1) {
        if (orderedCuts[index].startMs < orderedCuts[index - 1].endMs) {
          add('REVIEW_RESULT_CUT_RANGE_INVALID', '$.payload.decisions', [], { reason: 'positive-cut-overlap' });
        }
      }
      const complement = computePresentationRetainedSegmentsV001(candidate.outerRange, cuts);
      const retainedSegments = payload.retainedSegments;
      if (
        complement.status !== 'passed'
        || !Array.isArray(retainedSegments)
        || retainedSegments.length === 0
        || canonicalJson(retainedSegments) !== canonicalJson(complement.segments)
      ) add('REVIEW_RESULT_RETAINED_SEGMENTS_INVALID', '$.payload.retainedSegments');
      if (!['unanswered', 'complete', 'needs_additional_edit'].includes(payload.finalDisposition)) {
        add('REVIEW_RESULT_FINAL_DISPOSITION_INVALID', '$.payload.finalDisposition');
      }
      if (!isNonEmptyString(root.humanReadableSummary)) {
        add('REVIEW_RESULT_SUMMARY_INVALID', '$.humanReadableSummary');
      }
      if (!isSha256(root.payloadSha256) || root.payloadSha256 !== presentationFirstRealDataCanonicalSha256(root.payload)) {
        add('REVIEW_RESULT_PAYLOAD_HASH_MISMATCH', '$.payloadSha256');
      }
    },
  );
}

const inspectBinding = (binding, path, add) => {
  const fields = ['path', 'fileSha256', 'valueCanonicalSha256', 'value'];
  addUnknownIssues(binding, fields, 'ARTIFACT_BINDING_INVALID', path, add);
  if (
    !exactFields(binding, fields)
    || !validRelativePath(binding.path)
    || !isSha256(binding.fileSha256)
    || !isSha256(binding.valueCanonicalSha256)
    || !isObject(binding.value)
    || binding.valueCanonicalSha256 !== presentationFirstRealDataCanonicalSha256(binding.value)
  ) {
    add('ARTIFACT_BINDING_INVALID', path);
    return false;
  }
  return true;
};

const bindingReference = (binding) => ({ path: binding.path, fileSha256: binding.fileSha256 });

const inspectTrustedArtifactChain = (bindings, add) => {
  const media = bindings.mediaEquivalence?.value ?? {};
  const source = bindings.sourceIdentity?.value ?? {};
  const basis = bindings.basisEditPlan?.value ?? {};
  const manifest = bindings.candidateManifest?.value ?? {};
  const expected = {
    mediaEquivalence: bindingReference(bindings.mediaEquivalence ?? {}),
    sourceIdentity: bindingReference(bindings.sourceIdentity ?? {}),
    basisEditPlan: bindingReference(bindings.basisEditPlan ?? {}),
  };
  const pairs = [
    [source.mediaEquivalence, expected.mediaEquivalence, '$.sourceIdentity.value.mediaEquivalence'],
    [source.executionMedia, media.artifacts?.newExecutionMedia, '$.sourceIdentity.value.executionMedia'],
    [source.stt?.manifest, media.artifacts?.sttManifest, '$.sourceIdentity.value.stt.manifest'],
    [source.stt?.transcript, media.artifacts?.sttTranscript, '$.sourceIdentity.value.stt.transcript'],
    [source.stt?.wordTimestamps, media.artifacts?.sttWordTimestamps, '$.sourceIdentity.value.stt.wordTimestamps'],
    [basis.references?.sourceIdentity, expected.sourceIdentity, '$.basisEditPlan.value.references.sourceIdentity'],
    [basis.references?.mediaEquivalence, expected.mediaEquivalence, '$.basisEditPlan.value.references.mediaEquivalence'],
    [manifest.references?.mediaEquivalence, expected.mediaEquivalence, '$.candidateManifest.value.references.mediaEquivalence'],
    [manifest.references?.sourceIdentity, expected.sourceIdentity, '$.candidateManifest.value.references.sourceIdentity'],
    [manifest.references?.basisEditPlan, expected.basisEditPlan, '$.candidateManifest.value.references.basisEditPlan'],
    [manifest.references?.sttManifest, source.stt?.manifest, '$.candidateManifest.value.references.sttManifest'],
    [manifest.references?.wordTimestamps, source.stt?.wordTimestamps, '$.candidateManifest.value.references.wordTimestamps'],
  ];
  pairs.forEach(([actual, expectedValue, path]) => {
    if (!sameReference(actual, expectedValue)) add('CHAIN_REFERENCE_MISMATCH', path);
  });
  if (source.videoId !== media.sourceVideoId) {
    add('CHAIN_REFERENCE_MISMATCH', '$.sourceIdentity.value.videoId');
  }
  if (source.sourceUrl !== media.provenance?.webpageUrl) {
    add('CHAIN_REFERENCE_MISMATCH', '$.sourceIdentity.value.sourceUrl');
  }
  if (
    basis.candidate?.candidateId !== manifest.candidate?.candidateId
    || canonicalJson(basis.candidate?.outerRange) !== canonicalJson(manifest.candidate?.outerRange)
    || basis.candidate?.title !== manifest.candidate?.title
  ) add('CHAIN_CANDIDATE_MISMATCH', '$.candidate');
};

const inspectChain = (bindings, add) => {
  inspectTrustedArtifactChain(bindings, add);
  const source = bindings.sourceIdentity?.value ?? {};
  const basis = bindings.basisEditPlan?.value ?? {};
  const manifest = bindings.candidateManifest?.value ?? {};
  const review = bindings.reviewResult?.value ?? {};
  const expected = {
    mediaEquivalence: bindingReference(bindings.mediaEquivalence ?? {}),
    sourceIdentity: bindingReference(bindings.sourceIdentity ?? {}),
    basisEditPlan: bindingReference(bindings.basisEditPlan ?? {}),
    candidateManifest: bindingReference(bindings.candidateManifest ?? {}),
  };
  const reviewPairs = [
    [review.payload?.references?.mediaEquivalence, expected.mediaEquivalence, '$.reviewResult.value.payload.references.mediaEquivalence'],
    [review.payload?.references?.sourceIdentity, expected.sourceIdentity, '$.reviewResult.value.payload.references.sourceIdentity'],
    [review.payload?.references?.basisEditPlan, expected.basisEditPlan, '$.reviewResult.value.payload.references.basisEditPlan'],
    [review.payload?.references?.candidateManifest, expected.candidateManifest, '$.reviewResult.value.payload.references.candidateManifest'],
    [review.payload?.references?.sttManifest, source.stt?.manifest, '$.reviewResult.value.payload.references.sttManifest'],
    [review.payload?.references?.wordTimestamps, source.stt?.wordTimestamps, '$.reviewResult.value.payload.references.wordTimestamps'],
  ];
  reviewPairs.forEach(([actual, expectedValue, path]) => {
    if (!sameReference(actual, expectedValue)) add('CHAIN_REFERENCE_MISMATCH', path);
  });
  if (
    basis.candidate?.candidateId !== review.payload?.candidate?.candidateId
    || canonicalJson(basis.candidate?.outerRange) !== canonicalJson(review.payload?.candidate?.outerRange)
  ) add('CHAIN_CANDIDATE_MISMATCH', '$.candidate');
  const manifestItemById = new Map((manifest.reviewItems ?? []).map((item) => [item.reviewItemId, item]));
  const reviewIds = new Set();
  let expectedPositionSearchCount = 0;
  for (const decision of review.payload?.decisions ?? []) {
    const item = manifestItemById.get(decision.reviewItemId);
    reviewIds.add(decision.reviewItemId);
    if (!item) {
      add('CHAIN_REVIEW_ITEM_MISMATCH', '$.reviewResult.value.payload.decisions', [decision.reviewItemId]);
      continue;
    }
    if (decision.answer === 'cut') {
      const beforeCharacters = item.beforeUtterance?.characters ?? [];
      const afterCharacters = item.afterUtterance?.characters ?? [];
      const machineLeftCharacter = beforeCharacters.at(-1);
      const machineRightCharacter = afterCharacters[0];
      if (decision.modified === false) {
        if (canonicalJson(decision.cutRange) !== canonicalJson(item.gap)) {
          add('CHAIN_REVIEW_ITEM_MISMATCH', '$.reviewResult.value.payload.decisions', [decision.reviewItemId]);
        }
      } else {
        const beforeIndex = beforeCharacters.findIndex(
          (character) => character.characterId === decision.selection?.beforeLastKeptCharacter?.characterId,
        );
        const afterIndex = afterCharacters.findIndex(
          (character) => character.characterId === decision.selection?.afterFirstKeptCharacter?.characterId,
        );
        const beforeCharacter = beforeCharacters[beforeIndex];
        const afterCharacter = afterCharacters[afterIndex];
        const beforeSelection = decision.selection?.beforeLastKeptCharacter;
        const afterSelection = decision.selection?.afterFirstKeptCharacter;
        const actuallyModified = (
          beforeSelection?.characterId !== machineLeftCharacter?.characterId
          || afterSelection?.characterId !== machineRightCharacter?.characterId
        );
        if (decision.modified !== actuallyModified) {
          add('CHAIN_REVIEW_ITEM_MISMATCH', '$.reviewResult.value.payload.decisions', [decision.reviewItemId]);
        }
        if (beforeSelection?.characterId !== machineLeftCharacter?.characterId) {
          expectedPositionSearchCount += 1;
        }
        if (afterSelection?.characterId !== machineRightCharacter?.characterId) {
          expectedPositionSearchCount += 1;
        }
        if (
          beforeIndex < 0
          || afterIndex < 0
          || canonicalJson({
            characterId: beforeSelection?.characterId,
            text: beforeSelection?.text,
            startMs: beforeSelection?.startMs,
            endMs: beforeSelection?.endMs,
          }) !== canonicalJson(beforeCharacter)
          || canonicalJson({
            characterId: afterSelection?.characterId,
            text: afterSelection?.text,
            startMs: afterSelection?.startMs,
            endMs: afterSelection?.endMs,
          }) !== canonicalJson(afterCharacter)
          || beforeSelection?.contextBefore
            !== beforeCharacters.slice(0, beforeIndex).map((character) => character.text).join('')
          || beforeSelection?.contextAfter
            !== beforeCharacters.slice(beforeIndex + 1).map((character) => character.text).join('')
          || afterSelection?.contextBefore
            !== afterCharacters.slice(0, afterIndex).map((character) => character.text).join('')
          || afterSelection?.contextAfter
            !== afterCharacters.slice(afterIndex + 1).map((character) => character.text).join('')
        ) add('CHAIN_REVIEW_ITEM_MISMATCH', '$.reviewResult.value.payload.decisions', [decision.reviewItemId]);
      }
    }
  }
  if (
    reviewIds.size !== manifestItemById.size
    || [...manifestItemById.keys()].some((id) => !reviewIds.has(id))
  ) add('CHAIN_REVIEW_ITEM_MISMATCH', '$.reviewResult.value.payload.decisions');
  if (review.payload?.positionSearchCount !== expectedPositionSearchCount) {
    add('CHAIN_REVIEW_ITEM_MISMATCH', '$.reviewResult.value.payload.positionSearchCount');
  }
};

/**
 * 18本の参照連鎖を、workspace I/Oや正式入口への注入口を増やさず合成検査する。
 */
export function validatePresentationFirstRealDataArtifactChainV001(bindings) {
  const violations = [];
  inspectChain(isObject(bindings) ? bindings : {}, (code, path, relatedIds = [], details) => {
    violations.push(issue(code, path, relatedIds, details));
  });
  return validationReport('presentation-first-real-data-artifact-chain-v001', bindings, violations);
}

const buildPresentationAssemblyDecisionSavePreflightFromBindingsV001 = ({
  preflightId,
  bindings,
  trustedReferences,
}) => {
  const collected = [];
  const add = (code, path, relatedIds = [], details) => collected.push(issue(code, path, relatedIds, details));
  const bindingFields = ['mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'candidateManifest', 'reviewResult'];
  const trustedReferenceFields = ['mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'candidateManifest'];
  if (!isObject(bindings)) add('ARTIFACT_BINDING_INVALID', '$.bindings');
  addUnknownIssues(bindings, bindingFields, 'ARTIFACT_BINDING_INVALID', '$.bindings', add);
  if (!exactFields(bindings, bindingFields)) add('ARTIFACT_BINDING_INVALID', '$.bindings');
  bindingFields.forEach((field) => inspectBinding(bindings?.[field], `$.bindings.${field}`, add));
  inspectReferenceSet(
    trustedReferences,
    trustedReferenceFields,
    '$.trustedReferences',
    'TRUSTED_REFERENCE_INVALID',
    add,
  );
  trustedReferenceFields.forEach((field) => {
    if (!sameReference(trustedReferences?.[field], bindingReference(bindings?.[field] ?? {}))) {
      add('TRUSTED_REFERENCE_MISMATCH', `$.trustedReferences.${field}`);
    }
  });

  const mediaContractReport = validatePresentationSourceMediaEquivalenceV001(
    bindings?.mediaEquivalence?.value,
  );
  const mediaArtifactViolations = Array.isArray(bindings?.mediaEquivalence?.value?.violations)
    ? bindings.mediaEquivalence.value.violations
    : [];
  const mediaReady = mediaContractReport.status === 'passed'
    && bindings?.mediaEquivalence?.value?.status === 'passed'
    && bindings?.mediaEquivalence?.value?.checks?.every((check) => check.status === 'passed')
    && mediaArtifactViolations.length === 0;
  const reports = {
    mediaEquivalence: {
      status: mediaReady ? 'passed' : 'failed',
      violations: [
        ...mediaContractReport.violations,
        ...mediaArtifactViolations,
        ...(mediaReady ? [] : [{
          code: 'SAVE_PREFLIGHT_NOT_READY',
          path: '$.bindings.mediaEquivalence.value.status',
        }]),
      ],
    },
    sourceIdentity: validatePresentationRealDataSourceIdentityV001(bindings?.sourceIdentity?.value),
    basisEditPlan: validatePresentationRealDataBasisEditPlanV001(bindings?.basisEditPlan?.value),
    candidateManifest: validatePresentationInternalTrimCandidateManifestV001(bindings?.candidateManifest?.value),
    reviewResult: validatePresentationInternalTrimHumanReviewResultV001(bindings?.reviewResult?.value),
  };
  Object.values(reports).forEach((report) => report.violations.forEach((violation) => {
    collected.push(issue(
      violation.code,
      violation.path,
      violation.relatedIds ?? [],
      violation.details ?? undefined,
    ));
  }));
  if (bindingFields.every((field) => isObject(bindings?.[field]?.value))) inspectChain(bindings, add);

  const reviewPayload = bindings?.reviewResult?.value?.payload;
  const decisions = Array.isArray(reviewPayload?.decisions) ? reviewPayload.decisions : [];
  const hasUnanswered = decisions.some((decision) => decision.answer === 'unanswered');
  if (hasUnanswered) add('SAVE_PREFLIGHT_NOT_READY', '$.bindings.reviewResult.value.payload.decisions');
  if (reviewPayload?.finalDisposition !== 'complete') {
    add('SAVE_PREFLIGHT_NOT_READY', '$.bindings.reviewResult.value.payload.finalDisposition');
  }
  if (!isNonEmptyString(preflightId)) add('SAVE_PREFLIGHT_VALUE_INVALID', '$.preflightId');

  const blockedReasons = sortIssues(collected).map(({ code, path }) => ({ code, path }));
  const status = blockedReasons.length === 0 ? 'ready' : 'blocked';
  const references = Object.fromEntries(bindingFields.map((field) => [
    field,
    bindingReference(bindings?.[field] ?? {}),
  ]));
  const trustedReferenceRoot = Object.fromEntries(trustedReferenceFields.map((field) => [
    field,
    isObject(trustedReferences?.[field]) ? structuredClone(trustedReferences[field]) : null,
  ]));
  const checks = [
    ...Object.entries(reports).map(([checkId, report]) => ({
      checkId,
      status: report.status,
      violationCodes: [...new Set(report.violations.map((violation) => violation.code))].sort(),
    })),
    {
      checkId: 'artifact-chain',
      status: collected.some((violation) => violation.code.startsWith('CHAIN_')) ? 'failed' : 'passed',
      violationCodes: [...new Set(collected.filter((violation) => violation.code.startsWith('CHAIN_')).map((violation) => violation.code))].sort(),
    },
    {
      checkId: 'trusted-reference-root',
      status: collected.some((violation) => violation.code.startsWith('TRUSTED_REFERENCE_'))
        ? 'failed' : 'passed',
      violationCodes: [...new Set(collected
        .filter((violation) => violation.code.startsWith('TRUSTED_REFERENCE_'))
        .map((violation) => violation.code))].sort(),
    },
    {
      checkId: 'review-completeness',
      status: hasUnanswered || reviewPayload?.finalDisposition !== 'complete' ? 'failed' : 'passed',
      violationCodes: hasUnanswered || reviewPayload?.finalDisposition !== 'complete'
        ? ['SAVE_PREFLIGHT_NOT_READY'] : [],
    },
  ];
  return {
    schemaVersion: PRESENTATION_ASSEMBLY_DECISION_SAVE_PREFLIGHT_SCHEMA_VERSION,
    preflightId,
    checkerVersion: PRESENTATION_FIRST_REAL_DATA_GATE_CHECKER_VERSION,
    status,
    references,
    trustedReferences: trustedReferenceRoot,
    candidateId: reviewPayload?.candidate?.candidateId ?? null,
    reviewPayloadSha256: isObject(reviewPayload)
      ? presentationFirstRealDataCanonicalSha256(reviewPayload) : null,
    checks,
    blockedReasons,
  };
};

export const loadTrustedPresentationFirstRealDataBindingsV001 = async (...args) => {
  if (args.length !== 0) {
    throw new TypeError('trusted artifact loader does not accept an alternate summary or bindings');
  }
  const summaryBinding = await loadPresentationFirstRealDataArtifactBindingV001(
    PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001.path,
  );
  if (
    summaryBinding.fileSha256
    !== PRESENTATION_FIRST_REAL_DATA_TRUSTED_ARTIFACT_BUILD_SUMMARY_V001.fileSha256
  ) {
    throw new TypeError('trusted artifact-build-summary byte hash mismatch');
  }
  const summary = summaryBinding.value;
  const summaryFields = [
    'schemaVersion', 'status', 'artifactBindings', 'workload',
    'candidateManifestCanonicalSha256',
  ];
  if (
    !exactFields(summary, summaryFields)
    || summary.schemaVersion !== PRESENTATION_FIRST_REAL_DATA_ARTIFACT_BUILD_SUMMARY_SCHEMA_VERSION
    || summary.status !== 'passed'
    || !exactFields(summary.artifactBindings, TRUSTED_ARTIFACT_FIELDS)
    || !isObject(summary.workload)
    || !isSha256(summary.candidateManifestCanonicalSha256)
  ) {
    throw new TypeError('trusted artifact-build-summary schema mismatch');
  }
  for (const field of TRUSTED_ARTIFACT_FIELDS) {
    const violations = [];
    inspectArtifactReference(
      summary.artifactBindings[field],
      `$.artifactBindings.${field}`,
      'TRUSTED_REFERENCE_INVALID',
      (code, path) => violations.push({code, path}),
    );
    if (violations.length > 0) {
      throw new TypeError(`trusted artifact-build-summary reference invalid: ${field}`);
    }
  }
  const loadedEntries = await Promise.all(TRUSTED_ARTIFACT_FIELDS.map(async (field) => {
    const binding = await loadPresentationFirstRealDataArtifactBindingV001(
      summary.artifactBindings[field].path,
    );
    if (binding.fileSha256 !== summary.artifactBindings[field].fileSha256) {
      throw new TypeError(`trusted artifact byte hash mismatch: ${field}`);
    }
    return [field, binding];
  }));
  const bindings = Object.fromEntries(loadedEntries);
  if (
    bindings.candidateManifest.valueCanonicalSha256
      !== summary.candidateManifestCanonicalSha256
    || canonicalJson(bindings.candidateManifest.value.workload) !== canonicalJson(summary.workload)
  ) {
    throw new TypeError('trusted candidate manifest summary mismatch');
  }
  const reports = [
    validatePresentationSourceMediaEquivalenceV001(bindings.mediaEquivalence.value),
    validatePresentationRealDataSourceIdentityV001(bindings.sourceIdentity.value),
    validatePresentationRealDataBasisEditPlanV001(bindings.basisEditPlan.value),
    validatePresentationInternalTrimCandidateManifestV001(bindings.candidateManifest.value),
  ];
  if (reports.some((report) => report.status !== 'passed')) {
    throw new TypeError('trusted artifact canonical content failed schema validation');
  }
  const chainViolations = [];
  inspectTrustedArtifactChain(bindings, (code, path, relatedIds = [], details) => {
    chainViolations.push(issue(code, path, relatedIds, details));
  });
  if (chainViolations.length > 0) {
    throw new TypeError(`trusted artifact chain mismatch: ${canonicalJson(sortIssues(chainViolations))}`);
  }
  return {summaryBinding, summary, bindings};
};

/**
 * 人間へ見せる時・配信する時・保存前の三地点で共用する固定runtime入力。
 * 固定4資料だけでなく、実行媒体とSTT三資料の現在の実byteも毎回読み直す。
 */
export const loadTrustedPresentationFirstRealDataRuntimeV001 = async (...args) => {
  if (args.length !== 0) {
    throw new TypeError('trusted runtime loader does not accept alternate files');
  }
  const trusted = await loadTrustedPresentationFirstRealDataBindingsV001();
  const media = trusted.bindings.mediaEquivalence.value;
  const source = trusted.bindings.sourceIdentity.value;
  const sourceFiles = {
    executionMedia: await verifyPresentationFirstRealDataFileReferenceV001(source.executionMedia),
    sttManifest: await verifyPresentationFirstRealDataFileReferenceV001(source.stt.manifest),
    sttTranscript: await verifyPresentationFirstRealDataFileReferenceV001(source.stt.transcript),
    sttWordTimestamps: await verifyPresentationFirstRealDataFileReferenceV001(
      source.stt.wordTimestamps,
    ),
  };
  const expected = {
    executionMedia: media.artifacts?.newExecutionMedia,
    sttManifest: media.artifacts?.sttManifest,
    sttTranscript: media.artifacts?.sttTranscript,
    sttWordTimestamps: media.artifacts?.sttWordTimestamps,
  };
  for (const field of Object.keys(sourceFiles)) {
    if (!sameReference(sourceFiles[field], expected[field])) {
      throw new TypeError(`trusted runtime source mismatch: ${field}`);
    }
  }
  return {...trusted, sourceFiles};
};

/**
 * 正式保存前検査は固定済みsummaryを信頼根として実byteを読み直す。
 * 呼出側がartifact bindingやtrusted referenceを注入する経路は持たない。
 */
export async function buildPresentationAssemblyDecisionSavePreflightV001(input) {
  if (!exactFields(input, ['preflightId', 'reviewResultPath'])) {
    throw new TypeError('preflightId and reviewResultPath are the only accepted inputs');
  }
  if (!isNonEmptyString(input.preflightId) || !validRelativePath(input.reviewResultPath)) {
    throw new TypeError('preflightId and workspace-relative reviewResultPath are required');
  }
  const {summary, bindings: trustedBindings} =
    await loadTrustedPresentationFirstRealDataRuntimeV001();
  const reviewResult = await loadPresentationFirstRealDataArtifactBindingV001(
    input.reviewResultPath,
  );
  const trustedReferences = Object.fromEntries(TRUSTED_ARTIFACT_FIELDS.map((field) => [
    field,
    structuredClone(summary.artifactBindings[field]),
  ]));
  return buildPresentationAssemblyDecisionSavePreflightFromBindingsV001({
    preflightId: input.preflightId,
    bindings: {...trustedBindings, reviewResult},
    trustedReferences,
  });
}

export function validatePresentationAssemblyDecisionSavePreflightV001(input) {
  return emitValidation(
    PRESENTATION_ASSEMBLY_DECISION_SAVE_PREFLIGHT_SCHEMA_VERSION,
    input,
    (rootInput, add) => {
      if (!isObject(rootInput)) add('SAVE_PREFLIGHT_NOT_OBJECT', '$');
      const root = isObject(rootInput) ? rootInput : {};
      const fields = [
        'schemaVersion', 'preflightId', 'checkerVersion', 'status', 'references',
        'trustedReferences', 'candidateId', 'reviewPayloadSha256', 'checks', 'blockedReasons',
      ];
      addUnknownIssues(rootInput, fields, 'SAVE_PREFLIGHT_UNKNOWN_FIELD', '$', add);
      if (!exactFields(rootInput, fields)) add('SAVE_PREFLIGHT_SCHEMA_INVALID', '$');
      if (root.schemaVersion !== PRESENTATION_ASSEMBLY_DECISION_SAVE_PREFLIGHT_SCHEMA_VERSION) {
        add('SAVE_PREFLIGHT_SCHEMA_INVALID', '$.schemaVersion');
      }
      if (
        !isNonEmptyString(root.preflightId)
        || root.checkerVersion !== PRESENTATION_FIRST_REAL_DATA_GATE_CHECKER_VERSION
        || !['ready', 'blocked'].includes(root.status)
        || !isPositiveInteger(root.candidateId)
        || !isSha256(root.reviewPayloadSha256)
      ) add('SAVE_PREFLIGHT_VALUE_INVALID', '$');
      inspectReferenceSet(
        root.references,
        ['mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'candidateManifest', 'reviewResult'],
        '$.references',
        'SAVE_PREFLIGHT_REFERENCE_INVALID',
        add,
      );
      inspectReferenceSet(
        root.trustedReferences,
        ['mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'candidateManifest'],
        '$.trustedReferences',
        'SAVE_PREFLIGHT_REFERENCE_INVALID',
        add,
      );
      for (const field of ['mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'candidateManifest']) {
        if (!sameReference(root.trustedReferences?.[field], root.references?.[field])) {
          add('SAVE_PREFLIGHT_REFERENCE_INVALID', `$.trustedReferences.${field}`);
        }
      }
      const checkIds = [
        'mediaEquivalence', 'sourceIdentity', 'basisEditPlan', 'candidateManifest', 'reviewResult',
        'artifact-chain', 'trusted-reference-root', 'review-completeness',
      ];
      let checksValid = Array.isArray(root.checks) && root.checks.length === checkIds.length;
      (Array.isArray(root.checks) ? root.checks : []).forEach((check, index) => {
        const path = `$.checks[${index}]`;
        const checkFields = ['checkId', 'status', 'violationCodes'];
        addUnknownIssues(check, checkFields, 'SAVE_PREFLIGHT_UNKNOWN_FIELD', path, add);
        if (
          !exactFields(check, checkFields)
          || check.checkId !== checkIds[index]
          || !['passed', 'failed'].includes(check.status)
          || !Array.isArray(check.violationCodes)
          || !check.violationCodes.every((code) => PREFLIGHT_ALLOWED_VIOLATION_CODES.has(code))
          || (check.status === 'passed' && check.violationCodes.length !== 0)
          || (check.status === 'failed' && check.violationCodes.length === 0)
        ) checksValid = false;
      });
      if (!checksValid) add('SAVE_PREFLIGHT_CHECKS_INVALID', '$.checks');
      const reasons = Array.isArray(root.blockedReasons) ? root.blockedReasons : [];
      let reasonsValid = Array.isArray(root.blockedReasons);
      reasons.forEach((reason, index) => {
        const path = `$.blockedReasons[${index}]`;
        addUnknownIssues(reason, ['code', 'path'], 'SAVE_PREFLIGHT_UNKNOWN_FIELD', path, add);
        if (
          !exactFields(reason, ['code', 'path'])
          || !PREFLIGHT_ALLOWED_VIOLATION_CODES.has(reason.code)
          || !isNonEmptyString(reason.path)
        ) reasonsValid = false;
      });
      if (!reasonsValid) add('SAVE_PREFLIGHT_VALUE_INVALID', '$.blockedReasons');
      const anyFailed = (root.checks ?? []).some((check) => check.status === 'failed');
      if (
        (root.status === 'ready' && (anyFailed || reasons.length !== 0))
        || (root.status === 'blocked' && !anyFailed && reasons.length === 0)
      ) add('SAVE_PREFLIGHT_STATUS_INCONSISTENT', '$.status');
    },
  );
}
