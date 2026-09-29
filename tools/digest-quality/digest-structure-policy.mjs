/** Finite Digest structure decisions over saved source fragments. No discovery,
 * semantic classifier, STT, renderer, or mutable automatic proposal lives here. */
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson, canonicalSha256} from './clock.mjs';
import {validatePresentationBaseMediaSegmentPlanV002}
  from '../../evals/clip_composition/presentation_base_media_build_v003.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AUTO = 'digest-structure-auto-plan-v001', OVERRIDES = 'digest-structure-overrides-v001';
const STATE = 'digest-structure-saved-state-v001', RESOLUTION = 'digest-structure-resolution-v001';
const ORIGIN = 'codex-explicit-saved-source-context-review';
const ROLES = ['intro', 'main', 'closure', 'exclude-goods', 'exclude-superchat', 'related-side-topic'];
export const DIGEST_STRUCTURE_ROLES_V001 = Object.freeze([...ROLES]);
const inputs = new WeakMap(), clone = structuredClone;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const text = value => typeof value === 'string' && value.trim().length > 0;
const id = value => text(value) || integer(value);
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const require = (ok, message) => {if (!ok) throw new TypeError('DIGEST_STRUCTURE_INVALID: ' + message);};
const exact = (value, keys, name) => require(object(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)), name + ' fields differ');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
function ref(value, name) {
  require(object(value) && Object.keys(value).every(key => ['path', 'fileSha256', 'bytes'].includes(key))
    && text(value.path) && /^[a-f0-9]{64}$/.test(value.fileSha256 ?? '')
    && (!Object.hasOwn(value, 'bytes') || integer(value.bytes)), name + ' reference differs');
  return clone(value);
}
function sameFile(a, b) {
  return a && b && path.resolve(root, a.path) === path.resolve(root, b.path) && a.fileSha256 === b.fileSha256;
}
function boundJson(bytes, reference, name) {
  require(typeof bytes === 'string' || Buffer.isBuffer(bytes) || bytes instanceof Uint8Array, name + ' original bytes required');
  const value = Buffer.from(bytes);
  require(hash(value) === reference.fileSha256
    && (reference.bytes === undefined || reference.bytes === value.length), name + ' byte reference differs');
  try {return JSON.parse(value.toString('utf8'));}
  catch {throw new TypeError('DIGEST_STRUCTURE_INVALID: ' + name + ' JSON differs');}
}
function data(autoPlan) {
  const result = inputs.get(autoPlan);
  require(result, 'automatic plan must be created or restored from bound original input bytes');
  return result;
}
const defaultInclude = role => !role.startsWith('exclude-');
function mappings(segments, sourceClock, audioClock) {
  require(segments.length > 0, 'no adopted segments');
  const checked = validatePresentationBaseMediaSegmentPlanV002(segments.map(({sourceStartMs, sourceEndMs}) =>
    ({sourceStartMs, sourceEndMs})), sourceClock, audioClock);
  require(checked.status === 'passed', 'source order/range/frame/audio mapping differs: ' + JSON.stringify(checked.violations));
  // Preserve the production mapper's generated timeline IDs and frame/sample
  // coordinates. Stable structure IDs are associated outside those mappings.
  return clone(checked.mappings);
}
function defaultRoles(segments) {
  for (const role of ['intro', 'closure']) require(segments.filter(row => row.role === role).length <= 1,
    'only one optional ' + role + ' candidate is supported');
  require(segments.some(row => row.role === 'main'), 'at least one saved main segment is required');
}
function adoptedRoles(segments) {
  require(!segments.some((row, i) => row.role === 'intro' && i !== 0), 'included intro must be the first segment');
  require(!segments.some((row, i) => row.role === 'closure' && i !== segments.length - 1),
    'included closure must be the final segment; explicitly disable it before restoring a later excluded segment');
}
function sourceRows(ids, byId, name) {
  require(Array.isArray(ids) && ids.length > 0 && new Set(ids).size === ids.length && ids.every(id), name + ' IDs differ');
  const rows = ids.map(value => {const row = byId.get(value); require(row, name + ' references a missing source fragment'); return row;});
  rows.forEach((row, i) => require(!i || row.ordinal > rows[i - 1].ordinal, name + ' fragment order differs'));
  return rows;
}

/** Caller supplies the already inspected source clock. Media bytes are not read
 * here: the production I/O boundary must verify sourceRef before manufacturing.
 * Transcript and original edit-plan bytes are checked at this pure boundary. */
export function createDigestStructureAutoPlanV001({sourceRef, transcriptRef, transcriptBytes,
  priorEditPlanRef, priorEditPlanBytes, theme, segments, sourceClock, audioClock = null}) {
  sourceRef = ref(sourceRef, 'source'); transcriptRef = ref(transcriptRef, 'transcript');
  priorEditPlanRef = ref(priorEditPlanRef, 'prior edit plan');
  const transcript = boundJson(transcriptBytes, transcriptRef, 'transcript');
  const prior = boundJson(priorEditPlanBytes, priorEditPlanRef, 'prior edit plan');
  require(text(theme), 'explicit Digest theme is required');
  require(sameFile(sourceRef, prior.sourceVideoBinding), 'prior edit plan refers to a different source');
  require(text(transcript.sourceUri) && path.resolve(root, transcript.sourceUri) === path.resolve(root, sourceRef.path),
    'transcript source URI differs');
  require(Array.isArray(transcript.segments) && transcript.segments.length > 0, 'saved transcript fragments missing');
  const byId = new Map();
  transcript.segments.forEach((row, ordinal) => {
    require(id(row?.id) && !byId.has(row.id) && typeof row.text === 'string' && row.text.length > 0
      && integer(row.startMs) && integer(row.endMs) && row.startMs <= row.endMs, 'invalid saved transcript fragment');
    byId.set(row.id, {...row, ordinal});
  });
  require(Array.isArray(prior.segments) && prior.segments.length > 0, 'prior retained segments missing');
  const oldById = new Map();
  prior.segments.forEach(row => {
    require(text(row.segmentId) && !oldById.has(row.segmentId) && text(row.candidateId), 'prior segment identity differs');
    oldById.set(row.segmentId, row);
  });
  require(Array.isArray(segments) && segments.length > 0, 'ordered structure segments missing');
  const seen = new Set();
  for (const segment of segments) {
    exact(segment, ['segmentId', 'candidateId', 'role', 'sourceStartMs', 'sourceEndMs', 'sourceSegmentIds', 'reason', 'evidence'], 'structure segment');
    require(text(segment.segmentId) && !seen.has(segment.segmentId) && ROLES.includes(segment.role)
      && (segment.candidateId === null || text(segment.candidateId)) && text(segment.reason)
      && integer(segment.sourceStartMs) && integer(segment.sourceEndMs) && segment.sourceStartMs < segment.sourceEndMs,
    'duplicate identity, unknown role, missing reason or invalid range');
    seen.add(segment.segmentId);
    const rows = sourceRows(segment.sourceSegmentIds, byId, 'retained segment');
    rows.forEach((row, i) => require((!i || row.ordinal === rows[i - 1].ordinal + 1)
      && row.startMs >= segment.sourceStartMs && row.endMs <= segment.sourceEndMs,
    'retained segment omits an interior fragment or changes its source envelope'));
    require(rows[0].startMs === segment.sourceStartMs && rows.at(-1).endMs === segment.sourceEndMs,
      'segment boundaries differ from exact first/last fragment clock');
    exact(segment.evidence, ['sourceSegmentIds', 'excerpt'], 'source-context evidence');
    const evidenceRows = sourceRows(segment.evidence.sourceSegmentIds, byId, 'source-context evidence');
    require(evidenceRows.some(row => segment.sourceSegmentIds.includes(row.id))
      && segment.evidence.excerpt === evidenceRows.map(row => row.text).join(''), 'source-context excerpt differs');
    const old = oldById.get(segment.segmentId);
    if (old) {
      require(segment.candidateId === old.candidateId
        && segment.sourceStartMs === old.sourceStartMs && segment.sourceEndMs === old.sourceEndMs
        && same(segment.sourceSegmentIds, old.sourceSegmentIds), 'saved candidate internal content or interval changed');
      require(!['intro', 'closure'].includes(segment.role), 'saved main candidate may only remain main/related or be excluded');
    } else require(segment.candidateId === null && ['intro', 'closure'].includes(segment.role),
      'new source segments are limited to optional intro/closure');
  }
  require([...oldById.keys()].every(key => seen.has(key)), 'every prior candidate must be retained or explicitly excluded');
  defaultRoles(segments);
  // Validate the whole catalog, including excluded candidates, so an override
  // cannot expose an unsorted, overlapping or invalid hidden source interval.
  mappings(segments, sourceClock, audioClock);
  const included = segments.filter(row => defaultInclude(row.role)); adoptedRoles(included);
  mappings(included, sourceClock, audioClock);
  const body = {schemaVersion: AUTO, judgmentOrigin: ORIGIN, sourceRef, transcriptRef, priorEditPlanRef,
    theme, sourceClock: clone(sourceClock), audioClock: clone(audioClock), segments: clone(segments),
    priorSegmentOrder: prior.segments.map(row => row.segmentId),
    defaultSelection: segments.map(row => ({segmentId: row.segmentId, include: defaultInclude(row.role)}))};
  const autoPlan = freeze({...body, autoPlanSha256: canonicalSha256(body)});
  inputs.set(autoPlan, {prior: clone(prior)});
  return autoPlan;
}

function checkedOverrides(autoPlan, overrides) {
  data(autoPlan);
  exact(overrides, ['schemaVersion', 'autoPlanSha256', 'entries', 'overridesSha256'], 'overrides');
  const {overridesSha256, ...body} = overrides;
  require(overrides.schemaVersion === OVERRIDES && overrides.autoPlanSha256 === autoPlan.autoPlanSha256
    && overridesSha256 === canonicalSha256(body) && Array.isArray(overrides.entries), 'override version/plan/hash differs');
  let previous = -1;
  for (const row of overrides.entries) {
    exact(row, ['segmentId', 'include'], 'override entry');
    const ordinal = autoPlan.segments.findIndex(segment => segment.segmentId === row.segmentId);
    require(ordinal > previous && typeof row.include === 'boolean', 'override target/order/boolean differs');
    previous = ordinal;
    const segment = autoPlan.segments[ordinal];
    require(['intro', 'closure', 'exclude-goods', 'exclude-superchat'].includes(segment.role), 'main or related content cannot be overridden');
    require(row.include !== defaultInclude(segment.role), 'redundant default override is not saved');
  }
  return overrides;
}
function overrides(autoPlan, entries) {
  const body = {schemaVersion: OVERRIDES, autoPlanSha256: autoPlan.autoPlanSha256, entries: clone(entries)};
  return freeze({...body, overridesSha256: canonicalSha256(body)});
}
export function createDigestStructureOverridesV001({autoPlan}) {data(autoPlan); return overrides(autoPlan, []);}

export function resolveDigestStructureV001({autoPlan, overrides: savedOverrides}) {
  const {prior} = data(autoPlan); checkedOverrides(autoPlan, savedOverrides);
  const choices = new Map(savedOverrides.entries.map(row => [row.segmentId, row.include]));
  const selectedSegments = autoPlan.segments.filter(row => choices.get(row.segmentId) ?? defaultInclude(row.role));
  adoptedRoles(selectedSegments);
  const baseMappings = mappings(selectedSegments, autoPlan.sourceClock, autoPlan.audioClock);
  const oldMappings = mappings(prior.segments, autoPlan.sourceClock, autoPlan.audioClock);
  const oldOrder = autoPlan.priorSegmentOrder, newOrder = selectedSegments.map(row => row.segmentId);
  const orderMapping = autoPlan.segments.map(segment => {
    const before = oldOrder.indexOf(segment.segmentId), after = newOrder.indexOf(segment.segmentId);
    return {segmentId: segment.segmentId, candidateId: segment.candidateId,
      priorOrdinal: before < 0 ? null : before + 1, outputOrdinal: after < 0 ? null : after + 1,
      timelineSegmentId: after < 0 ? null : baseMappings[after].segmentId,
      oldBaseRange: before < 0 ? null : {startFrame: oldMappings[before].outputStartFrame, endFrameExclusive: oldMappings[before].outputEndFrame},
      newBaseRange: after < 0 ? null : {startFrame: baseMappings[after].outputStartFrame, endFrameExclusive: baseMappings[after].outputEndFrame},
      baseShiftFrames: before < 0 || after < 0 ? null : baseMappings[after].outputStartFrame - oldMappings[before].outputStartFrame};
  });
  const body = {schemaVersion: RESOLUTION, autoPlanSha256: autoPlan.autoPlanSha256,
    overridesSha256: savedOverrides.overridesSha256, selectedSegments: clone(selectedSegments), baseMappings,
    effectiveSelection: autoPlan.segments.map(row => ({segmentId: row.segmentId,
      include: choices.get(row.segmentId) ?? defaultInclude(row.role), origin: choices.has(row.segmentId) ? 'override' : 'saved-auto'})),
    diff: {added: newOrder.filter(key => !oldOrder.includes(key)), removed: oldOrder.filter(key => !newOrder.includes(key)),
      orderMapping, relativeOrderChanged: !same(oldOrder.filter(key => newOrder.includes(key)), newOrder.filter(key => oldOrder.includes(key)))},
    frameCount: baseMappings.at(-1).outputEndFrame, fps: 30,
    clockMeaning: 'base content before connection insertions; recompute the normal presentation projection afterwards',
    humanQuality: 'not-evaluated'};
  return freeze({...body, resolutionSha256: canonicalSha256(body)});
}

export function editDigestStructureOverrideV001({autoPlan, overrides: savedOverrides, segmentId, include}) {
  checkedOverrides(autoPlan, savedOverrides);
  require(typeof include === 'boolean', 'include must be an explicit boolean');
  const segment = autoPlan.segments.find(row => row.segmentId === segmentId);
  require(segment && ['intro', 'closure', 'exclude-goods', 'exclude-superchat'].includes(segment.role), 'unknown target or main/related override');
  require(!segment.role.startsWith('exclude-') || include === true, 'excluded segments allow only inclusion override; use Reset to restore exclusion');
  const byId = new Map(savedOverrides.entries.map(row => [row.segmentId, row]));
  if (include === defaultInclude(segment.role)) byId.delete(segmentId); else byId.set(segmentId, {segmentId, include});
  const next = overrides(autoPlan, autoPlan.segments.flatMap(row => byId.has(row.segmentId) ? [byId.get(row.segmentId)] : []));
  resolveDigestStructureV001({autoPlan, overrides: next}); return next;
}
export function resetDigestStructureOverrideV001({autoPlan, overrides: savedOverrides, segmentId}) {
  checkedOverrides(autoPlan, savedOverrides);
  require(autoPlan.segments.some(row => row.segmentId === segmentId
    && ['intro', 'closure', 'exclude-goods', 'exclude-superchat'].includes(row.role)), 'unknown reset target or main/related override');
  const next = overrides(autoPlan, savedOverrides.entries.filter(row => row.segmentId !== segmentId));
  resolveDigestStructureV001({autoPlan, overrides: next}); return next;
}
export function exportDigestStructureStateV001({autoPlan, overrides: savedOverrides}) {
  const resolution = resolveDigestStructureV001({autoPlan, overrides: savedOverrides});
  const body = {schemaVersion: STATE, autoPlan: clone(autoPlan), overrides: clone(savedOverrides),
    expectedResolutionSha256: resolution.resolutionSha256};
  return freeze({...body, stateSha256: canonicalSha256(body)});
}
export function restoreDigestStructureStateV001({saved, transcriptBytes, priorEditPlanBytes}) {
  exact(saved, ['schemaVersion', 'autoPlan', 'overrides', 'expectedResolutionSha256', 'stateSha256'], 'saved structure');
  const {stateSha256, ...stateBody} = saved;
  require(saved.schemaVersion === STATE && canonicalSha256(stateBody) === stateSha256, 'saved state version/hash differs');
  const a = saved.autoPlan;
  exact(a, ['schemaVersion', 'judgmentOrigin', 'sourceRef', 'transcriptRef', 'priorEditPlanRef', 'theme', 'sourceClock', 'audioClock',
    'segments', 'priorSegmentOrder', 'defaultSelection', 'autoPlanSha256'], 'saved automatic plan');
  const {sourceRef, transcriptRef, priorEditPlanRef, theme, sourceClock, audioClock, segments} = a;
  const autoPlan = createDigestStructureAutoPlanV001({sourceRef, transcriptRef, priorEditPlanRef, theme,
    sourceClock, audioClock, segments, transcriptBytes, priorEditPlanBytes});
  require(same(autoPlan, a), 'saved automatic plan differs from bound original inputs');
  const restoredOverrides = freeze(clone(saved.overrides));
  const resolution = resolveDigestStructureV001({autoPlan, overrides: restoredOverrides});
  require(resolution.resolutionSha256 === saved.expectedResolutionSha256, 'saved resolution differs');
  return freeze({autoPlan, overrides: restoredOverrides, resolution});
}
