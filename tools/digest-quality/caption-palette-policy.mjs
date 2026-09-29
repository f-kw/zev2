/** Finite, explicitly selected candidate colors over immutable saved captions.
 * This module never discovers targets, modifies segmentation or chooses colors. */
import {canonicalJson, canonicalSha256} from './clock.mjs';
import {materializeFiniteAutoPresentationCaptionV001}
  from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';

const clone = structuredClone;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const require = (value, message) => {if (!value) throw new TypeError('CAPTION_PALETTE_INVALID: ' + message);};
const exact = (value, keys, name) => require(object(value) && Object.keys(value).length === keys.length
  && keys.every(key => own(value, key)), name + ' fields');
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const freeze = value => {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;};
const seal = (body, key) => freeze({...clone(body), [key]: canonicalSha256(body)});
const VERSION = 'caption-palette-candidate-v001';
export const CAPTION_PALETTE_V001 = freeze({version: VERSION, colors: [
  {paletteId: 'yellow', name: 'Yellow (existing ZEV accent)', fontColor: '#FFD65A'},
  {paletteId: 'light-sky-blue', name: 'LightSkyBlue', fontColor: '#87CEFA'},
], humanQuality: 'not-evaluated', productionDefaultChanged: false});

/** Missing field alone means legacy Yellow. null/undefined/empty/unknown are
 * present but invalid, and caller-supplied RGB is never part of the contract. */
export function resolveCaptionPaletteIdV001(value) {
  exact(value, own(value ?? {}, 'paletteId') ? ['paletteId'] : [], 'palette selector');
  const paletteId = own(value, 'paletteId') ? value.paletteId : 'yellow';
  require(CAPTION_PALETTE_V001.colors.some(row => row.paletteId === paletteId), 'unknown palette ID');
  return paletteId;
}
export function materializeCaptionPaletteColorV001({element, canvas, selection}) {
  require(object(selection) && selection.role === 'Focus', 'only an existing Color choice can have a palette');
  const paletteId = resolveCaptionPaletteIdV001(own(selection, 'paletteId') ? {paletteId: selection.paletteId} : {});
  const legacy = clone(selection); delete legacy.paletteId;
  // This old validator retains exact substring/occurrence/grapheme semantics.
  const rendered = materializeFiniteAutoPresentationCaptionV001({element, canvas, selection: legacy});
  return {...rendered, presentationColorRange: {...rendered.presentationColorRange,
    fontColor: CAPTION_PALETTE_V001.colors.find(row => row.paletteId === paletteId).fontColor}};
}

function sourceData(source) {
  exact(source, ['sourceViewSha256', 'resolvedPlan', 'projectedNormalPlan', 'effectiveSelections'], 'source');
  require(sha(source.sourceViewSha256), 'source view hash required');
  const {resolvedPlan: resolved, projectedNormalPlan: normal, effectiveSelections: selections} = source;
  require(Array.isArray(normal?.elements) && normal.elements.length > 0 && Array.isArray(resolved?.elements)
    && Array.isArray(selections), 'source plans and selections required');
  require(same({...normal, elements: null}, {...resolved, elements: null}), 'normal/resolved plan envelope differs');
  const ids = normal.elements.map(row => row.instructionId);
  require(ids.every(nonempty) && new Set(ids).size === ids.length
    && same(ids, resolved.elements.map(row => row.instructionId))
    && same(ids, selections.map(row => row.captionId)), 'caption coverage/order differs');
  const targets = [];
  for (const [index, selected] of selections.entries()) {
    const element = resolved.elements[index], baseline = normal.elements[index];
    require(object(selected.selection), 'saved selection missing');
    require(!own(baseline, 'presentationColorRange'), 'true normal plan required');
    if (selected.selection.role !== 'Focus') {
      require(!own(element, 'presentationColorRange'), 'non-Color carries a Color range');
      // Existing Panel palette IDs belong to their own saved contract.
      require(!own(selected.selection, 'paletteId') || selected.selection.role === 'Panel accent', 'non-Color carries a Color palette');
      continue;
    }
    const expected = materializeCaptionPaletteColorV001({element: baseline, canvas: normal.canvas, selection: selected.selection});
    require(same(expected, element), 'saved Color text/range/clock/style does not match its exact selection');
    const {fontColor, ...range} = element.presentationColorRange;
    targets.push({captionId: element.instructionId, selection: clone(selected.selection), range,
      sourceCaptionSha256: canonicalSha256(element), normalCaptionSha256: canonicalSha256(baseline)});
  }
  return {targets, binding: {sourceViewSha256: source.sourceViewSha256,
    resolvedPlanSha256: canonicalSha256(resolved), projectedNormalPlanSha256: canonicalSha256(normal),
    effectiveSelectionsSha256: canonicalSha256(selections)}};
}

export function createCaptionPaletteAutoV001({source, choices}) {
  const data = sourceData(source);
  require(Array.isArray(choices) && same(choices.map(row => row?.captionId), data.targets.map(row => row.captionId)),
    'fixed automatic choices must cover all and only existing Color targets in source order');
  for (const row of choices) {
    exact(row, ['captionId', 'paletteId', 'reason'], 'automatic Color choice');
    resolveCaptionPaletteIdV001({paletteId: row.paletteId}); require(nonempty(row.reason), 'explicit contextual reason required');
  }
  return seal({schemaVersion: 'caption-palette-auto-v001', paletteVersion: VERSION,
    sourceBinding: data.binding, targets: data.targets, choices,
    judgmentOrigin: 'explicit-fixed-contextual-palette-choice', humanQuality: 'not-evaluated',
    productionDefaultChanged: false}, 'autoSha256');
}
function automaticData(source, automatic) {
  exact(automatic, ['schemaVersion', 'paletteVersion', 'sourceBinding', 'targets', 'choices', 'judgmentOrigin',
    'humanQuality', 'productionDefaultChanged', 'autoSha256'], 'automatic palette');
  const expected = createCaptionPaletteAutoV001({source, choices: automatic.choices});
  require(same(expected, automatic), 'automatic palette/source/range/hash differs');
  return sourceData(source);
}
function overridesFor(automatic, entries) {
  return seal({schemaVersion: 'caption-palette-overrides-v001', paletteVersion: VERSION,
    autoSha256: automatic.autoSha256, entries}, 'overridesSha256');
}
function checked(source, automatic, overrides) {
  const data = automaticData(source, automatic);
  exact(overrides, ['schemaVersion', 'paletteVersion', 'autoSha256', 'entries', 'overridesSha256'], 'palette overrides');
  require(Array.isArray(overrides.entries) && same(overridesFor(automatic, overrides.entries), overrides), 'override hash/automatic binding differs');
  let previous = -1;
  for (const row of overrides.entries) {
    exact(row, ['captionId', 'selection'], 'palette override');
    const index = data.targets.findIndex(target => target.captionId === row.captionId);
    require(index > previous, 'unknown, duplicate or out-of-order Color override'); previous = index;
    if (row.selection !== 'Normal') {
      exact(row.selection, ['paletteId'], 'override color'); resolveCaptionPaletteIdV001(row.selection);
    }
  }
  return data;
}
export function createCaptionPaletteOverridesV001({source, automatic}) {
  automaticData(source, automatic); return overridesFor(automatic, []);
}
export function editCaptionPaletteOverrideV001({source, automatic, overrides, captionId, selection}) {
  const {targets} = checked(source, automatic, overrides);
  require(targets.some(row => row.captionId === captionId), 'only an existing Color target may be edited');
  const entries = clone(overrides.entries).filter(row => row.captionId !== captionId);
  if (selection !== 'Reset') {
    if (selection !== 'Normal') {exact(selection, ['paletteId'], 'override color'); resolveCaptionPaletteIdV001(selection);}
    entries.push({captionId, selection: clone(selection)});
  }
  entries.sort((a, b) => targets.findIndex(row => row.captionId === a.captionId) - targets.findIndex(row => row.captionId === b.captionId));
  return overridesFor(automatic, entries);
}
export function resolveCaptionPaletteV001({source, automatic, overrides}) {
  const {targets} = checked(source, automatic, overrides);
  const choices = new Map(automatic.choices.map(row => [row.captionId, row]));
  const edited = new Map(overrides.entries.map(row => [row.captionId, row.selection]));
  const effectiveSelections = clone(source.effectiveSelections), colorBindings = [];
  const elements = source.resolvedPlan.elements.map((element, index) => {
    const original = choices.get(element.instructionId); if (!original) return clone(element);
    const target = targets.find(row => row.captionId === element.instructionId), change = edited.get(element.instructionId);
    const normal = source.projectedNormalPlan.elements[index], active = change !== 'Normal';
    const paletteId = active ? (change?.paletteId ?? original.paletteId) : null;
    const selection = active ? {...clone(target.selection), paletteId} : {role: 'Normal'};
    effectiveSelections[index] = {...effectiveSelections[index], selection,
      origin: edited.has(element.instructionId) ? 'human' : 'automatic', hasOverride: edited.has(element.instructionId)};
    const rendered = active ? materializeCaptionPaletteColorV001({element: clone(normal), canvas: source.resolvedPlan.canvas, selection}) : clone(normal);
    colorBindings.push({...clone(target), automaticPaletteId: original.paletteId, effectivePaletteId: paletteId,
      active, hasOverride: edited.has(element.instructionId)});
    return rendered;
  });
  return seal({schemaVersion: 'caption-palette-resolution-v001', paletteVersion: VERSION,
    sourceViewSha256: source.sourceViewSha256, autoSha256: automatic.autoSha256, overridesSha256: overrides.overridesSha256,
    plan: {...clone(source.resolvedPlan), elements}, effectiveSelections, colorBindings,
    humanQuality: 'not-evaluated', productionDefaultChanged: false}, 'resolutionSha256');
}
export function exportCaptionPaletteStateV001({source, automatic, overrides}) {
  const resolved = resolveCaptionPaletteV001({source, automatic, overrides});
  return seal({schemaVersion: 'caption-palette-state-v001', paletteVersion: VERSION, automatic, overrides,
    expectedResolutionSha256: resolved.resolutionSha256}, 'stateSha256');
}
export function restoreCaptionPaletteStateV001({source, saved}) {
  exact(saved, ['schemaVersion', 'paletteVersion', 'automatic', 'overrides', 'expectedResolutionSha256', 'stateSha256'], 'saved palette state');
  const expected = exportCaptionPaletteStateV001({source, automatic: saved.automatic, overrides: saved.overrides});
  require(same(expected, saved), 'saved palette state/hash differs');
  return {automatic: freeze(clone(saved.automatic)), overrides: freeze(clone(saved.overrides)),
    resolution: resolveCaptionPaletteV001({source, automatic: saved.automatic, overrides: saved.overrides})};
}
