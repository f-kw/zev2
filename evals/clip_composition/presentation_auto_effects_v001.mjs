import {createHash} from 'node:crypto';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';

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
});
export const sha256AutoPresentationStateV001 = value => sha256AutoPresentationV001({
  ...value, context: contextIdentity(value.context),
});

// This is only the existing trial yellow used to test plumbing. It is not an
// approved product theme, and selectors cannot provide drawing values.
const rules = freeze({version: 'auto-presentation-rules-v001', role: 'Focus',
  presentation: 'provisional-focus', scope: 'whole-caption', textStyle: {fontColor: '#FFD65A'}});
export const AUTO_PRESENTATION_RULES_REF_V001 = freeze({version: rules.version,
  contentSha256: sha256AutoPresentationV001(rules)});

function checkContext(baselinePlan, context) {
  if (!exact(context, ['baselineRef', 'decisionInputRef', 'renderingRulesRef'])) reject('invalid context');
  const base = context.baselineRef;
  const decision = context.decisionInputRef;
  if (!exact(base, ['path', 'fileSha256', 'canonicalSha256']) || !nonempty(base.path)
    || !digest(base.fileSha256) || !digest(base.canonicalSha256)) reject('invalid baseline reference');
  if (!exact(decision, ['path', 'fileSha256']) || !nonempty(decision.path)
    || !digest(decision.fileSha256)) reject('invalid decision input reference');
  if (!same(context.renderingRulesRef, AUTO_PRESENTATION_RULES_REF_V001)) reject('rendering rules version differs');
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
      captions.push(element.instructionId);
    }
  }
  return captions;
}

function checkFocus(entry, withId = true) {
  const keys = ['role', 'presentation', 'scope'];
  if (withId) keys.push('captionId');
  if (!exact(entry, keys) || entry.role !== rules.role || entry.presentation !== rules.presentation
    || entry.scope !== rules.scope) reject('unknown role, presentation, scope, or drawing field');
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
    checkFocus(effect);
    if (!targets.includes(effect.captionId)) reject('caption ID is outside the judgment target set');
    if (selected.has(effect.captionId)) reject('duplicate or conflicting judgment');
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
    } else checkFocus(entry);
    if (!captions.includes(entry.captionId)) reject('unknown override caption ID');
    if (selected.has(entry.captionId)) reject('duplicate override');
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
    checkFocus(selection, false);
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
  const elements = baselinePlan.elements.map(element => {
    if (effective.get(element.instructionId)?.role !== 'Focus') return element;
    return {...element, visualState: {...element.visualState,
      textStyle: {...element.visualState.textStyle, ...rules.textStyle}}};
  });
  const changed = elements.some((element, index) => element !== baselinePlan.elements[index]);
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
    })),
  }};
}
