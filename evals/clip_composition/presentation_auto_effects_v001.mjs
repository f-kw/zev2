import {createHash} from 'node:crypto';
import {PRESENTATION_CAPTION_MOTION_PRESETS_V001, getPresentationCaptionMotionProgramV001}
  from './presentation_caption_motion_v001.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {PRESENTATION_EFFECT_TRIAL_PRESETS_V001, PRESENTATION_PANEL_PRESET_V001} from './presentation_effects_v001.mjs';
import {PRESENTATION_PULSE_PRESET_V001, resolvePresentationPulseTimingV001} from './presentation_pulse_v001.mjs';
import {validatePresentationPulseEvidenceV001, presentationPulseEvidenceIdentityV001} from './presentation_pulse_evidence_v001.mjs';

const reject = message => { throw new TypeError(`auto presentation: ${message}`); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const clone = value => structuredClone(value);
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const freeze = value => {
  if (object(value) || Array.isArray(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const sha256AutoPresentationV001 = value => createHash('sha256').update(canonicalJson(value)).digest('hex');

// Locations remain provenance. Moving the same bytes does not create a new
// judgment or silently rebind a human edit to different content.
const contextIdentity = context => ({
  baselineRef: {fileSha256: context.baselineRef.fileSha256, canonicalSha256: context.baselineRef.canonicalSha256},
  decisionInputRef: {fileSha256: context.decisionInputRef.fileSha256},
  renderingRulesRef: context.renderingRulesRef,
  pulseTimingEvidence: presentationPulseEvidenceIdentityV001(context.pulseTimingEvidence),
});
export const sha256AutoPresentationStateV001 = value => sha256AutoPresentationV001({
  ...value, context: contextIdentity(value.context),
});

// Color Accent and Scale Accent are adopted. Their saved role tokens remain
// internal identifiers. Panel Accent is provisional. Selectors supply no drawing values.
const rules = freeze({version: 'auto-presentation-rules-v007', role: 'Focus',
  presentation: 'provisional-focus', scopes: ['whole-caption', 'partial-caption'],
  targetMatching: 'exact-text-overlapping-occurrences-one-based',
  targetBoundary: 'unicode-grapheme-cluster',
  canonicalRange: 'unicode-code-point-half-open',
  glyphColorPolicy: {fillPaintedGlyph: 'focus-color', nativeColorGlyph: 'preserve-original-rgba'},
  textStyle: {fontColor: '#FFD65A'},
  // Keep the adopted Scale Accent size and lifetime.
  vocal: {role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption',
    textStyle: {...PRESENTATION_EFFECT_TRIAL_PRESETS_V001.reaction}},
  panel: {role: 'Panel accent', presentation: 'provisional-panel', scope: 'whole-caption',
    ...PRESENTATION_PANEL_PRESET_V001},
  pulse: {role: 'Pulse accent', presentation: 'provisional-pulse', scope: 'whole-caption',
    preset: PRESENTATION_PULSE_PRESET_V001},
  bounce: {role: 'Bounce accent', presentation: 'provisional-bounce', scope: 'whole-caption',
    preset: PRESENTATION_CAPTION_MOTION_PRESETS_V001.bounce},
  shake: {role: 'Shake accent', presentation: 'provisional-shake', scope: 'whole-caption',
    preset: PRESENTATION_CAPTION_MOTION_PRESETS_V001.shake}});
export const AUTO_PRESENTATION_RULES_REF_V007 = freeze({version: rules.version,
  contentSha256: sha256AutoPresentationV001(rules)});
const graphemeSegmenter = new Intl.Segmenter('ja', {granularity: 'grapheme'});

function checkContext(baselinePlan, context) {
  if (!exact(context, ['baselineRef', 'decisionInputRef', 'renderingRulesRef', 'pulseTimingEvidence'])) reject('invalid context');
  validatePresentationPulseEvidenceV001(context.pulseTimingEvidence);
  const base = context.baselineRef;
  const decision = context.decisionInputRef;
  if (!exact(base, ['path', 'fileSha256', 'canonicalSha256']) || !nonempty(base.path)
    || !digest(base.fileSha256) || !digest(base.canonicalSha256)) reject('invalid baseline reference');
  if (!exact(decision, ['path', 'fileSha256']) || !nonempty(decision.path)
    || !digest(decision.fileSha256)) reject('invalid decision input reference');
  if (!same(context.renderingRulesRef, AUTO_PRESENTATION_RULES_REF_V007)) reject('rendering rules version differs');
  if (!object(baselinePlan) || baselinePlan.schemaVersion !== 'presentation-output-common-core-plan-v001'
    || !Array.isArray(baselinePlan.elements)) reject('invalid baseline plan');
  if (sha256AutoPresentationV001(baselinePlan) !== base.canonicalSha256) reject('baseline content differs');
  const ids = new Set();
  const captions = [];
  for (const element of baselinePlan.elements) {
    if (!object(element) || !nonempty(element.instructionId) || ids.has(element.instructionId)) reject('invalid or duplicate plan ID');
    ids.add(element.instructionId);
    if (element.kind === 'speech-caption') {
      if (!object(element.visualState?.textStyle)) reject('caption has no normal text style');
      if (['presentationColorRange', 'presentationPreset', 'presentationPulse', 'presentationMotion'].some(key => Object.hasOwn(element, key))) {
        reject('baseline must be the fixed normal plan, not a resolved presentation');
      }
      captions.push(element.instructionId);
    }
  }
  return captions;
}

function checkFocus(entry, withId = true) {
  const keys = ['role', 'presentation', 'scope'];
  if (withId) keys.push('captionId');
  if (entry?.scope === 'partial-caption') {
    keys.push('targetText');
    if (Object.hasOwn(entry, 'occurrence')) keys.push('occurrence');
  }
  if (!exact(entry, keys) || entry.role !== rules.role || entry.presentation !== rules.presentation
    || !rules.scopes.includes(entry.scope)) reject('unknown role, presentation, scope, or drawing field');
  if (entry.scope === 'partial-caption') {
    if (typeof entry.targetText !== 'string' || entry.targetText.length === 0) reject('partial target text is empty or invalid');
    // Source line breaks have no drawable foreground. Match the renderer's
    // existing character roles without treating ordinary spaces as invisible.
    if (!/[^\r\n]/u.test(entry.targetText)) reject('partial target contains no visible characters');
    if (Object.hasOwn(entry, 'occurrence')
      && (!Number.isSafeInteger(entry.occurrence) || entry.occurrence < 1)) reject('partial occurrence must be a positive integer');
  }
}

function checkSelection(entry, withId = true) {
  if (entry?.role === rules.role) return checkFocus(entry, withId);
  if (entry?.role === rules.pulse.role) {
    if (!exact(entry, ['role', 'presentation', 'scope', 'anchorPeakId', ...(withId ? ['captionId'] : [])])
      || entry.presentation !== rules.pulse.presentation || entry.scope !== rules.pulse.scope
      || !nonempty(entry.anchorPeakId)) reject('Pulse Accent requires one measured peak and no drawing fields');
    return;
  }
  const preset = entry?.role === rules.vocal.role ? rules.vocal
    : entry?.role === rules.panel.role ? rules.panel
    : entry?.role === rules.bounce.role ? rules.bounce : entry?.role === rules.shake.role ? rules.shake : null;
  if (preset === null || !exact(entry, ['role', 'presentation', 'scope', ...(withId ? ['captionId'] : [])])
    || entry.presentation !== preset.presentation || entry.scope !== preset.scope) {
    reject('Scale Accent / Panel Accent / Bounce Accent / Shake Accent requires a finite whole-caption preset without drawing fields');
  }
}

function motionElement(baselinePlan, captionId, selection) {
  const preset = selection.role === rules.bounce.role ? rules.bounce : rules.shake;
  const element = {...baselinePlan.elements.find(row => row.instructionId === captionId),
    presentationMotion: {presentation: preset.presentation, presetVersion: preset.preset.version}};
  getPresentationCaptionMotionProgramV001({element, canvas: baselinePlan.canvas});
  return element;
}
const isMotion = selection => [rules.bounce.role, rules.shake.role].includes(selection?.role);

function pulseProgram(baselinePlan, context, captionId, selection) {
  const evidence = context.pulseTimingEvidence;
  const peak = evidence?.peaks.find(row => row.peakId === selection.anchorPeakId);
  if (!peak) reject('Pulse Accent peak is missing or unknown');
  return resolvePresentationPulseTimingV001({
    element: baselinePlan.elements.find(element => element.instructionId === captionId),
    canvas: baselinePlan.canvas, peakSample: peak.peakSample, sampleRate: evidence.sampleRate,
  });
}

function focusRange(element, selection) {
  const text = element.text;
  if (typeof text !== 'string') reject('Color Accent requires the fixed caption text');
  if (selection.scope === 'whole-caption') {
    return {startCodePoint: 0, endCodePointExclusive: Array.from(text).length};
  }
  const matches = [];
  // Count every literal occurrence, including overlaps. Do not normalize text,
  // skip an invalid first occurrence, or silently choose another grapheme.
  for (let from = 0; from <= text.length;) {
    const found = text.indexOf(selection.targetText, from);
    if (found < 0) break;
    matches.push(found);
    from = found + 1;
  }
  if (matches.length === 0) reject('partial target text was not found');
  if (selection.occurrence === undefined && matches.length !== 1) reject('partial target text is ambiguous without occurrence');
  const occurrence = selection.occurrence ?? 1;
  if (occurrence > matches.length) reject('partial occurrence was not found');
  const start = matches[occurrence - 1];
  const end = start + selection.targetText.length;
  const boundaries = new Set([text.length]);
  for (const segment of graphemeSegmenter.segment(text)) boundaries.add(segment.index);
  if (!boundaries.has(start) || !boundaries.has(end)) reject('partial target cuts a grapheme cluster');
  return {startCodePoint: Array.from(text.slice(0, start)).length,
    endCodePointExclusive: Array.from(text.slice(0, end)).length};
}

function checkProposal(baselinePlan, context, proposal) {
  const captions = checkContext(baselinePlan, context);
  if (!exact(proposal, ['schemaVersion', 'context', 'targetCaptionIds', 'completion', 'effects', 'exceptions'])
    || proposal.schemaVersion !== 'auto-presentation-proposal-v001') reject('invalid proposal');
  checkContext(baselinePlan, proposal.context);
  if (!same(contextIdentity(proposal.context), contextIdentity(context))) reject('proposal reference version differs');
  if (proposal.completion !== 'complete') reject('judgment is incomplete');
  const targets = proposal.targetCaptionIds;
  if (!Array.isArray(targets) || targets.length === 0 || new Set(targets).size !== targets.length
    || [...targets].some(id => !captions.includes(id))) reject('judgment target set is empty, duplicated, or unknown');
  if (!Array.isArray(proposal.effects) || !Array.isArray(proposal.exceptions)) reject('invalid judgment lists');
  const selected = new Set();
  for (const effect of proposal.effects) {
    checkSelection(effect);
    if (!targets.includes(effect.captionId)) reject('caption ID is outside the judgment target set');
    if (selected.has(effect.captionId)) reject('duplicate or conflicting judgment');
    if (effect.role === 'Focus') {
      focusRange(baselinePlan.elements.find(element => element.instructionId === effect.captionId), effect);
    }
    if (effect.role === rules.pulse.role) pulseProgram(baselinePlan, context, effect.captionId, effect);
    if (isMotion(effect)) motionElement(baselinePlan, effect.captionId, effect);
    selected.add(effect.captionId);
  }
  for (const exception of proposal.exceptions) {
    if (!exact(exception, ['captionId', 'status', 'reason'])
      || !['unrepresentable', 'unresolved'].includes(exception.status) || !nonempty(exception.reason)) reject('invalid exception');
    if (!targets.includes(exception.captionId)) reject('caption ID is outside the judgment target set');
    if (selected.has(exception.captionId)) reject('duplicate or conflicting judgment');
    selected.add(exception.captionId);
  }
  return captions;
}

/** The only proposal-to-fixed boundary. Invalid/incomplete input produces no fixed proposal. */
export function fixAutoPresentationProposalV001({baselinePlan, context, proposal}) {
  const captions = checkProposal(baselinePlan, context, proposal);
  const order = (left, right) => captions.indexOf(left.captionId) - captions.indexOf(right.captionId);
  const normalized = {...clone(proposal), targetCaptionIds: captions.filter(id => proposal.targetCaptionIds.includes(id)),
    effects: clone(proposal.effects).sort(order), exceptions: clone(proposal.exceptions).sort(order)};
  return freeze({schemaVersion: 'fixed-auto-presentation-v001',
    proposalSha256: sha256AutoPresentationStateV001(normalized), proposal: normalized});
}

function checkFixed(baselinePlan, context, autoProposal) {
  if (autoProposal === undefined) return;
  if (!exact(autoProposal, ['schemaVersion', 'proposalSha256', 'proposal'])
    || autoProposal.schemaVersion !== 'fixed-auto-presentation-v001' || !digest(autoProposal.proposalSha256)) reject('expected validated fixed proposal');
  checkProposal(baselinePlan, context, autoProposal.proposal);
  if (sha256AutoPresentationStateV001(autoProposal.proposal) !== autoProposal.proposalSha256) reject('fixed proposal content differs');
}

function checkOverrides(baselinePlan, context, autoProposal, overrides) {
  const captions = checkContext(baselinePlan, context);
  checkFixed(baselinePlan, context, autoProposal);
  if (overrides === undefined) return captions;
  if (!exact(overrides, ['schemaVersion', 'context', 'autoProposalSha256', 'entries'])
    || overrides.schemaVersion !== 'auto-presentation-overrides-v001' || !Array.isArray(overrides.entries)) reject('invalid overrides');
  checkContext(baselinePlan, overrides.context);
  if (!same(contextIdentity(overrides.context), contextIdentity(context))
    || overrides.autoProposalSha256 !== (autoProposal?.proposalSha256 ?? null)) reject('override reference version differs');
  const selected = new Set();
  for (const entry of overrides.entries) {
    if (entry?.role === 'Normal') {
      if (!exact(entry, ['captionId', 'role'])) reject('Normal has extra fields');
    } else checkSelection(entry);
    if (!captions.includes(entry.captionId)) reject('unknown override caption ID');
    if (selected.has(entry.captionId)) reject('duplicate override');
    if (entry.role === 'Focus') {
      focusRange(baselinePlan.elements.find(element => element.instructionId === entry.captionId), entry);
    }
    if (entry.role === rules.pulse.role) pulseProgram(baselinePlan, context, entry.captionId, entry);
    if (isMotion(entry)) motionElement(baselinePlan, entry.captionId, entry);
    selected.add(entry.captionId);
  }
  return captions;
}

export function createAutoPresentationOverridesV001({baselinePlan, context, autoProposal}) {
  checkOverrides(baselinePlan, context, autoProposal);
  return freeze({schemaVersion: 'auto-presentation-overrides-v001', context: clone(context),
    autoProposalSha256: autoProposal?.proposalSha256 ?? null, entries: []});
}

/** Reset deletes exactly one override; it does not write Normal or recompute the automatic judgment. */
export function editAutoPresentationOverrideV001({baselinePlan, context, autoProposal, overrides, captionId, selection}) {
  const captions = checkOverrides(baselinePlan, context, autoProposal, overrides);
  if (overrides === undefined) reject('editing requires bound overrides');
  if (!captions.includes(captionId)) reject('unknown override caption ID');
  const entries = clone(overrides.entries).filter(entry => entry.captionId !== captionId);
  if (selection === 'Normal') entries.push({captionId, role: 'Normal'});
  else if (selection !== 'Reset') {
    checkSelection(selection, false);
    if (selection.role === 'Focus') {
      focusRange(baselinePlan.elements.find(element => element.instructionId === captionId), selection);
    }
    if (selection.role === rules.pulse.role) pulseProgram(baselinePlan, context, captionId, selection);
    if (isMotion(selection)) motionElement(baselinePlan, captionId, selection);
    entries.push({captionId, ...clone(selection)});
  }
  entries.sort((left, right) => captions.indexOf(left.captionId) - captions.indexOf(right.captionId));
  return freeze({...clone(overrides), entries});
}

/**
 * Resolve from the fixed normal plan, never from a prior resolved plan.
 * File-backed callers additionally verify baseline and decision bytes in the IO loader.
 * @param {{baselinePlan: object} & import('../../packages/shared/src/auto-presentation.js').AutoPresentationInput} input
 */
export function resolveAutoPresentationV001({baselinePlan, context, autoProposal, overrides}) {
  const captions = checkOverrides(baselinePlan, context, autoProposal, overrides);
  const automatic = new Map((autoProposal?.proposal.effects ?? []).map(entry => [entry.captionId, entry]));
  const processed = new Set(autoProposal?.proposal.targetCaptionIds ?? []);
  const exceptions = new Map((autoProposal?.proposal.exceptions ?? []).map(entry => [entry.captionId, entry]));
  const human = new Map((overrides?.entries ?? []).map(entry => [entry.captionId, entry]));
  const effective = new Map(captions.map(id => [id, human.get(id) ?? automatic.get(id)]));
  const ranges = new Map();
  const elements = baselinePlan.elements.map(element => {
    const selection = effective.get(element.instructionId);
    if (isMotion(selection)) return motionElement(baselinePlan, element.instructionId, selection);
    if (selection?.role === rules.pulse.role) {
      const program = pulseProgram(baselinePlan, context, element.instructionId, selection);
      return {...element, presentationPulse: {presentation: rules.pulse.presentation,
        anchorPeakId: selection.anchorPeakId, anchorFrame: program.anchorFrame}};
    }
    if (selection?.role === rules.panel.role) {
      return {...element, visualState: {...element.visualState,
        textStyle: {...element.visualState.textStyle, ...rules.panel.textStyle},
        background: {...rules.panel.background}}};
    }
    if (selection?.role === 'Vocal accent') {
      return {...element, visualState: {...element.visualState,
        textStyle: {...element.visualState.textStyle, ...rules.vocal.textStyle}}};
    }
    if (selection?.role !== 'Focus') return element;
    const range = focusRange(element, selection);
    ranges.set(element.instructionId, range);
    // Whole Focus is the complete canonical range of the same paint operation.
    // Keep every selected glyph in the range. Native color glyphs retain their
    // original RGBA; an all-color-glyph range can be visually unchanged.
    return {...element, presentationColorRange: {...range, fontColor: rules.textStyle.fontColor}};
  });
  const changed = elements.some((element, index) => element !== baselinePlan.elements[index]);
  const selection = entry => {
    if (entry === undefined) return {role: 'Normal'};
    const {captionId, ...value} = entry;
    return clone(value);
  };
  return {plan: changed ? {...baselinePlan, elements} : baselinePlan, resolution: {
    context: clone(context),
    autoProposalSha256: autoProposal?.proposalSha256 ?? null,
    overridesSha256: overrides === undefined ? null : sha256AutoPresentationStateV001(overrides),
    automaticStatus: autoProposal === undefined ? 'not-processed'
      : processed.size !== captions.length ? 'partially-processed'
      : exceptions.size ? 'complete-with-exceptions' : 'complete',
    exceptions: clone(autoProposal?.proposal.exceptions ?? []),
    captions: captions.map(captionId => ({captionId,
      origin: human.has(captionId) ? 'human' : processed.has(captionId) ? 'automatic' : 'baseline',
      role: effective.get(captionId)?.role ?? 'Normal',
      automaticStatus: !processed.has(captionId) ? 'not-processed' : exceptions.get(captionId)?.status
        ?? (automatic.has(captionId) ? 'selected' : 'normal'),
      automaticSelection: processed.has(captionId) && !exceptions.has(captionId)
        ? selection(automatic.get(captionId)) : null,
      effectiveSelection: selection(effective.get(captionId)),
      hasOverride: human.has(captionId),
      canonicalRange: clone(ranges.get(captionId) ?? null),
    })),
  }};
}
