import {createHash} from 'node:crypto';

/**
 * Pure research fixture for eleven saved connection decisions.
 * No AI, media, clocks, captions, production paths, or renderer integration.
 * Auto and human decisions must identify themselves as simulated research data.
 * Baseline effective rows have reason:null; other rows retain a nonempty reason.
 * Whole-record references belong to the envelope. A row references only its
 * selected entry, so editing another override does not change that row's bytes.
 */
export const SCHEMAS = Object.freeze({
  catalogue: 'connection-catalogue-research-v001',
  baseline: 'connection-normal-baseline-research-v001',
  autoDraft: 'connection-auto-draft-research-v001',
  overrides: 'connection-human-overrides-research-v001',
  effective: 'connection-effective-research-v001',
});

const ROLES = new Set(['normal-cut', 'separator']);
const MODES = new Set(['normal-only', 'auto']);

function reject(message) {
  const error = new Error(`connection research: ${message}`);
  error.code = 'CONNECTION_RESEARCH_INVALID';
  throw error;
}

function requireCondition(condition, message) {
  if (!condition) reject(message);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function exact(value, keys, label) {
  requireCondition(plainObject(value), `${label} must be a plain object`);
  const own = Reflect.ownKeys(value);
  requireCondition(own.length === keys.length && keys.every(key => own.includes(key)),
    `${label} has missing or unknown fields`);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    requireCondition(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable,
      `${label}.${key} must be an enumerable data field`);
  }
}

function text(value, label) {
  requireCondition(typeof value === 'string' && value.trim().length > 0,
    `${label} must be a nonempty string`);
}

function shaText(value, label) {
  requireCondition(typeof value === 'string' && value.length === 64 && /^[a-f0-9]+$/.test(value),
    `${label} must be a lowercase SHA-256`);
}

// Research JSON canonicalization: recursively sorted object keys, unchanged
// array order, and standard JSON primitive serialization. Not a new contract.
function canonicalCopy(value, active, label) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    requireCondition(Number.isFinite(value), `${label} must contain finite JSON numbers`);
    return value;
  }
  requireCondition(typeof value === 'object', `${label} contains a non-JSON value`);
  requireCondition(!active.has(value), `${label} contains a cycle`);
  active.add(value);
  let result;
  if (Array.isArray(value)) {
    const keys = Reflect.ownKeys(value);
    requireCondition(keys.length === value.length + 1 && keys.includes('length'),
      `${label} must be a dense array without additional fields`);
    result = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      requireCondition(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable,
        `${label}[${index}] must be an enumerable JSON value`);
      result.push(canonicalCopy(descriptor.value, active, `${label}[${index}]`));
    }
  } else {
    requireCondition(plainObject(value), `${label} must contain only plain JSON objects`);
    const keys = Reflect.ownKeys(value);
    requireCondition(keys.every(key => typeof key === 'string'), `${label} contains a symbol key`);
    result = {};
    for (const key of keys.sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      requireCondition(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable,
        `${label}.${key} must be an enumerable data field`);
      Object.defineProperty(result, key, {
        value: canonicalCopy(descriptor.value, active, `${label}.${key}`),
        enumerable: true, writable: true, configurable: true,
      });
    }
  }
  active.delete(value);
  return result;
}

export function canonicalResearchJson(value) {
  return JSON.stringify(canonicalCopy(value, new Set(), 'research JSON'));
}

function canonicalSha(value) {
  return createHash('sha256').update(canonicalResearchJson(value)).digest('hex');
}

function freezeDeep(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

export function sealResearchRecord(data) {
  requireCondition(plainObject(data), 'record data must be a plain object');
  const copy = canonicalCopy(data, new Set(), 'record data');
  return freezeDeep({data: copy, sha256: canonicalSha(copy)});
}

function sealed(record, schemaVersion, label) {
  exact(record, ['data', 'sha256'], label);
  requireCondition(plainObject(record.data), `${label}.data must be a plain object`);
  shaText(record.sha256, `${label}.sha256`);
  // Validate JSON before reading data fields, including accessor rejection.
  const measuredSha = canonicalSha(record.data);
  requireCondition(measuredSha === record.sha256, `${label} canonical SHA differs`);
  requireCondition(record.data.schemaVersion === schemaVersion, `${label} schema version differs`);
  return record.data;
}

function digestReference(value, label) {
  exact(value, ['version', 'completionId', 'sha256'], label);
  text(value.version, `${label}.version`);
  text(value.completionId, `${label}.completionId`);
  shaText(value.sha256, `${label}.sha256`);
}

function sameDigest(value, trustedDigestRef, label) {
  digestReference(value, label);
  requireCondition(canonicalResearchJson(value) === canonicalResearchJson(trustedDigestRef),
    `${label} differs from the trusted Digest reference`);
}

function reference(record) {
  return {schemaVersion: record.data.schemaVersion, sha256: record.sha256};
}

function boundReference(value, record, label) {
  exact(value, ['schemaVersion', 'sha256'], label);
  shaText(value.sha256, `${label}.sha256`);
  requireCondition(value.schemaVersion === record.data.schemaVersion
    && value.sha256 === record.sha256, `${label} version or SHA differs`);
}

function catalogueInput(trustedDigestRef, catalogue) {
  digestReference(trustedDigestRef, 'trustedDigestRef');
  const data = sealed(catalogue, SCHEMAS.catalogue, 'catalogue');
  exact(data, ['schemaVersion', 'digestRef', 'connections'], 'catalogue.data');
  sameDigest(data.digestRef, trustedDigestRef, 'catalogue.digestRef');
  requireCondition(Array.isArray(data.connections) && data.connections.length === 11,
    'catalogue must contain exactly eleven research boundaries');
  const ids = new Set();
  const segmentIds = new Set();
  let previous;
  for (const [index, boundary] of data.connections.entries()) {
    const label = `catalogue.connections[${index}]`;
    exact(boundary, ['connectionId', 'beforeSegmentId', 'afterSegmentId', 'canonicalBoundaryFrame'], label);
    for (const key of ['connectionId', 'beforeSegmentId', 'afterSegmentId']) text(boundary[key], `${label}.${key}`);
    requireCondition(!ids.has(boundary.connectionId), `${label} duplicates a connection ID`);
    ids.add(boundary.connectionId);
    requireCondition(Number.isSafeInteger(boundary.canonicalBoundaryFrame) && boundary.canonicalBoundaryFrame > 0,
      `${label} must have a positive integer canonical boundary`);
    requireCondition(boundary.beforeSegmentId !== boundary.afterSegmentId,
      `${label} must connect different retained segments`);
    if (previous) {
      requireCondition(previous.afterSegmentId === boundary.beforeSegmentId,
        `${label} does not continue the adjacent segment chain`);
      requireCondition(previous.canonicalBoundaryFrame < boundary.canonicalBoundaryFrame,
        `${label} is not in canonical boundary order`);
    } else {
      segmentIds.add(boundary.beforeSegmentId);
    }
    requireCondition(!segmentIds.has(boundary.afterSegmentId), `${label} repeats a retained segment ID`);
    segmentIds.add(boundary.afterSegmentId);
    previous = boundary;
  }
  return data;
}

function researchAuthor(data, label) {
  requireCondition(data.createdBy === 'research-fixture', `${label} must identify the research fixture author`);
}

function commonBindings(data, context, label) {
  sameDigest(data.digestRef, context.trustedDigestRef, `${label}.digestRef`);
  boundReference(data.catalogueRef, context.catalogue, `${label}.catalogueRef`);
}

function choiceEntries(entries, catalogue, {complete, baseline = false, label}) {
  requireCondition(Array.isArray(entries), `${label} must be an array`);
  requireCondition(!complete || entries.length === catalogue.connections.length,
    `${label} must cover every catalogue boundary`);
  const positions = new Map(catalogue.connections.map((boundary, index) => [boundary.connectionId, index]));
  let previous = -1;
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    const itemLabel = `${label}[${index}]`;
    exact(entry, baseline ? ['connectionId', 'role'] : ['connectionId', 'role', 'reason'], itemLabel);
    text(entry.connectionId, `${itemLabel}.connectionId`);
    requireCondition(positions.has(entry.connectionId), `${itemLabel} refers to an unknown connection`);
    requireCondition(!seen.has(entry.connectionId), `${itemLabel} duplicates a connection`);
    seen.add(entry.connectionId);
    const position = positions.get(entry.connectionId);
    requireCondition(position > previous, `${label} must be stored in canonical catalogue order`);
    previous = position;
    requireCondition(ROLES.has(entry.role), `${itemLabel} has an unknown role`);
    if (baseline) requireCondition(entry.role === 'normal-cut', `${itemLabel} changes the fixed Normal baseline`);
    else text(entry.reason, `${itemLabel}.reason`);
  }
}

function validateContext(context) {
  exact(context, ['trustedDigestRef', 'catalogue', 'baseline', 'mode', 'autoDraft', 'overrides'], 'context');
  const catalogue = catalogueInput(context.trustedDigestRef, context.catalogue);
  const baseline = sealed(context.baseline, SCHEMAS.baseline, 'baseline');
  exact(baseline, ['schemaVersion', 'createdBy', 'digestRef', 'catalogueRef', 'entries'], 'baseline.data');
  researchAuthor(baseline, 'baseline');
  commonBindings(baseline, context, 'baseline');
  choiceEntries(baseline.entries, catalogue, {complete: true, baseline: true, label: 'baseline.entries'});
  requireCondition(MODES.has(context.mode), 'context has an unknown selection mode');

  let autoDraft = null;
  if (context.mode === 'normal-only') {
    requireCondition(context.autoDraft === null, 'normal-only mode must explicitly have no auto draft');
  } else {
    requireCondition(context.autoDraft !== null && context.autoDraft !== undefined,
      'auto mode requires the saved auto draft, even when every connection has an override');
    autoDraft = sealed(context.autoDraft, SCHEMAS.autoDraft, 'autoDraft');
    exact(autoDraft, ['schemaVersion', 'createdBy', 'origin', 'digestRef', 'catalogueRef', 'baselineRef', 'entries'],
      'autoDraft.data');
    researchAuthor(autoDraft, 'autoDraft');
    requireCondition(autoDraft.origin === 'simulated-auto', 'autoDraft must identify simulated auto decisions');
    commonBindings(autoDraft, context, 'autoDraft');
    boundReference(autoDraft.baselineRef, context.baseline, 'autoDraft.baselineRef');
    choiceEntries(autoDraft.entries, catalogue, {complete: true, label: 'autoDraft.entries'});
  }

  const overrides = sealed(context.overrides, SCHEMAS.overrides, 'overrides');
  exact(overrides, ['schemaVersion', 'createdBy', 'origin', 'digestRef', 'catalogueRef', 'baselineRef', 'selectionBase', 'entries'],
    'overrides.data');
  researchAuthor(overrides, 'overrides');
  requireCondition(overrides.origin === 'simulated-human', 'overrides must identify simulated human decisions');
  commonBindings(overrides, context, 'overrides');
  boundReference(overrides.baselineRef, context.baseline, 'overrides.baselineRef');
  exact(overrides.selectionBase, ['mode', 'autoDraftRef'], 'overrides.selectionBase');
  requireCondition(overrides.selectionBase.mode === context.mode, 'overrides selection mode is stale');
  if (context.mode === 'normal-only') {
    requireCondition(overrides.selectionBase.autoDraftRef === null, 'Normal-only overrides must have no auto draft reference');
  } else {
    boundReference(overrides.selectionBase.autoDraftRef, context.autoDraft, 'overrides.selectionBase.autoDraftRef');
  }
  choiceEntries(overrides.entries, catalogue, {complete: false, label: 'overrides.entries'});
  return {catalogue, baseline, autoDraft, overrides};
}

export function createResearchBaseline(input) {
  exact(input, ['trustedDigestRef', 'catalogue'], 'baseline input');
  const catalogue = catalogueInput(input.trustedDigestRef, input.catalogue);
  return sealResearchRecord({
    schemaVersion: SCHEMAS.baseline, createdBy: 'research-fixture',
    digestRef: input.trustedDigestRef, catalogueRef: reference(input.catalogue),
    entries: catalogue.connections.map(boundary => ({connectionId: boundary.connectionId, role: 'normal-cut'})),
  });
}

export function setResearchOverride(context, choice) {
  const {catalogue, overrides} = validateContext(context);
  exact(choice, ['connectionId', 'role', 'reason'], 'override choice');
  choiceEntries([choice], catalogue, {complete: false, label: 'override choice'});
  const selected = new Map(overrides.entries.map(entry => [entry.connectionId, entry]));
  selected.set(choice.connectionId, choice);
  const entries = catalogue.connections.flatMap(boundary => selected.has(boundary.connectionId)
    ? [selected.get(boundary.connectionId)] : []);
  return sealResearchRecord({...overrides, entries});
}

export function resetResearchOverride(context, connectionId) {
  const {catalogue, overrides} = validateContext(context);
  text(connectionId, 'reset connection ID');
  requireCondition(catalogue.connections.some(boundary => boundary.connectionId === connectionId),
    'reset refers to an unknown connection');
  return sealResearchRecord({...overrides, entries: overrides.entries.filter(entry => entry.connectionId !== connectionId)});
}

export function resolveResearchConnections(context) {
  const {catalogue, baseline, autoDraft, overrides} = validateContext(context);
  const baselineEntries = new Map(baseline.entries.map(entry => [entry.connectionId, entry]));
  const autoEntries = new Map((autoDraft?.entries ?? []).map(entry => [entry.connectionId, entry]));
  const humanEntries = new Map(overrides.entries.map(entry => [entry.connectionId, entry]));
  const entries = catalogue.connections.map(boundary => {
    const id = boundary.connectionId;
    const human = humanEntries.get(id);
    const auto = autoEntries.get(id);
    const selected = human ?? auto ?? baselineEntries.get(id);
    const selectedFrom = human ? 'human-override' : auto ? 'auto' : 'baseline';
    const schemaVersion = human ? SCHEMAS.overrides : auto ? SCHEMAS.autoDraft : SCHEMAS.baseline;
    return {connectionId: id, role: selected.role, selectedFrom,
      reason: selectedFrom === 'baseline' ? null : selected.reason,
      selectionRef: {schemaVersion, entrySha256: canonicalSha(selected)}};
  });
  return sealResearchRecord({
    schemaVersion: SCHEMAS.effective, createdBy: 'research-fixture',
    digestRef: context.trustedDigestRef, catalogueRef: reference(context.catalogue),
    baselineRef: reference(context.baseline), mode: context.mode,
    autoDraftRef: context.mode === 'auto' ? reference(context.autoDraft) : null,
    overridesRef: reference(context.overrides), entries,
  });
}
