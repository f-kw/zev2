/** Semantic presentation judgment only; the existing renderer owns all drawing values. */
export type PresentationFocusSelectionInputV001 = {
  schemaVersion: 'presentation-focus-selection-input-v001'; digestId: string; productionPurpose: string | null;
  captions: Array<{captionId: string; text: string; contextId: string | null}>;
  contexts: Array<{contextId: string; description: string}>;
  observations: Array<{observationId: string; kind: 'semantic' | 'audio' | 'video'; captionIds: string[]; description: string}>;
};
type Decision = {captionId: string; role: 'Normal' | 'Focus' | 'Vocal accent' | null;
  decision: 'normal' | 'selected' | 'unrepresentable' | 'unresolved'; reason: string; evidenceCaptionIds: string[];
  additionalObservation: null | {kind: 'audio' | 'video'; question: string};
  selection?: {scope: 'whole-caption'} | {scope: 'partial-caption'; targetText: string; occurrence?: number}};
export type PresentationFocusSelectionAnswerV001 = {status: 'abstained'; reason: string}
  | {status: 'complete'; summary: string; decisions: Decision[]};
export type PresentationFocusSelectionResultV001 = {schemaVersion: 'presentation-focus-selection-result-v001';
  skillId: 'presentation-focus-selection'; skillVersion: 'v001'; answer: unknown};
const object = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: unknown, names: string[]): v is Record<string, any> => object(v)
  && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const id = (v: unknown): v is string => text(v) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(v);
const list = (v: unknown): v is any[] => Array.isArray(v) && Object.keys(v).length === v.length
  && Array.from({length: v.length}, (_, i) => Object.hasOwn(v, i)).every(Boolean);
const ids = (v: unknown): v is string[] => list(v) && v.every(id) && new Set(v).size === v.length;
function fail(message: string): never {throw new TypeError(message);}

export function assertPresentationFocusSelectionInputV001(v: unknown): asserts v is PresentationFocusSelectionInputV001 {
  if (!keys(v, ['schemaVersion', 'digestId', 'productionPurpose', 'captions', 'contexts', 'observations'])
    || v.schemaVersion !== 'presentation-focus-selection-input-v001' || !id(v.digestId)
    || !(v.productionPurpose === null || text(v.productionPurpose)) || !list(v.captions) || !v.captions.length
    || !list(v.contexts) || !list(v.observations)) fail('FOCUS_INPUT_INVALID');
  const contexts = new Set<string>(), captions = new Set<string>(), observations = new Set<string>();
  for (const c of v.contexts) {
    if (!keys(c, ['contextId', 'description']) || !id(c.contextId) || !text(c.description) || contexts.has(c.contextId))
      fail('FOCUS_CONTEXT_INVALID');
    contexts.add(c.contextId);
  }
  for (const c of v.captions) {
    if (!keys(c, ['captionId', 'text', 'contextId']) || !id(c.captionId) || !text(c.text) || captions.has(c.captionId)
      || !(c.contextId === null || contexts.has(c.contextId))) fail('FOCUS_CAPTION_INVALID');
    captions.add(c.captionId);
  }
  for (const o of v.observations) {
    if (!keys(o, ['observationId', 'kind', 'captionIds', 'description']) || !id(o.observationId)
      || observations.has(o.observationId) || !['semantic', 'audio', 'video'].includes(o.kind)
      || !ids(o.captionIds) || o.captionIds.some((c: string) => !captions.has(c)) || !text(o.description))
      fail('FOCUS_OBSERVATION_INVALID');
    observations.add(o.observationId);
  }
}

export function assertPresentationFocusSelectionAnswerV001(v: unknown): asserts v is PresentationFocusSelectionAnswerV001 {
  if (keys(v, ['status', 'reason']) && v.status === 'abstained' && text(v.reason)) return;
  if (!keys(v, ['status', 'summary', 'decisions']) || v.status !== 'complete' || !text(v.summary)
    || !list(v.decisions) || !v.decisions.length) fail('FOCUS_ANSWER_INVALID');
  for (const d of v.decisions) {
    const names = ['captionId', 'role', 'decision', 'reason', 'evidenceCaptionIds', 'additionalObservation'];
    if (d?.decision === 'selected') names.push('selection');
    if (!keys(d, names) || !id(d.captionId) || !text(d.reason) || !ids(d.evidenceCaptionIds)
      || !d.evidenceCaptionIds.length) fail('FOCUS_DECISION_INVALID');
    if (!(d.additionalObservation === null || (keys(d.additionalObservation, ['kind', 'question'])
      && ['audio', 'video'].includes(d.additionalObservation.kind) && text(d.additionalObservation.question))))
      fail('FOCUS_ADDITIONAL_OBSERVATION_INVALID');
    if (d.decision === 'normal') {
      if (d.role !== 'Normal' || d.additionalObservation !== null) fail('FOCUS_NORMAL_INVALID');
    } else if (d.decision === 'selected') {
      if (d.role !== 'Focus' || d.additionalObservation !== null) fail('FOCUS_SELECTED_ROLE_INVALID');
      const s = d.selection;
      if (keys(s, ['scope']) && s.scope === 'whole-caption') continue;
      if (!object(s) || !keys(s, ['scope', 'targetText', ...(Object.hasOwn(s, 'occurrence') ? ['occurrence'] : [])])
        || s.scope !== 'partial-caption' || typeof s.targetText !== 'string' || !s.targetText.length
        || !/[^\r\n]/u.test(s.targetText)
        || (Object.hasOwn(s, 'occurrence') && (!Number.isSafeInteger(s.occurrence) || s.occurrence < 1)))
        fail('FOCUS_SELECTION_INVALID');
    } else if (d.decision === 'unrepresentable' || d.decision === 'unresolved') {
      if (!(d.role === null || ['Focus', 'Vocal accent'].includes(d.role))) fail('FOCUS_EXCEPTION_ROLE_INVALID');
      if (d.decision === 'unrepresentable' && d.additionalObservation !== null) fail('FOCUS_EXCEPTION_OBSERVATION_INVALID');
    } else fail('FOCUS_DECISION_INVALID');
  }
}

export function assertPresentationFocusSelectionCoverageV001(input: unknown, answer: unknown) {
  assertPresentationFocusSelectionInputV001(input); assertPresentationFocusSelectionAnswerV001(answer);
  if (answer.status === 'abstained') fail('FOCUS_JUDGMENT_ABSTAINED');
  if (answer.decisions.length !== input.captions.length || answer.decisions.some((d, i) => d.captionId !== input.captions[i].captionId))
    fail('FOCUS_COVERAGE_CHANGED');
  const ids = new Set(input.captions.map(c => c.captionId));
  if (answer.decisions.some(d => d.evidenceCaptionIds.some(id => !ids.has(id)))) fail('FOCUS_EVIDENCE_UNKNOWN');
}

export function assertPresentationFocusSelectionResultV001(v: unknown): asserts v is PresentationFocusSelectionResultV001 & {
  answer: PresentationFocusSelectionAnswerV001} {
  if (!keys(v, ['schemaVersion', 'skillId', 'skillVersion', 'answer'])
    || v.schemaVersion !== 'presentation-focus-selection-result-v001' || v.skillId !== 'presentation-focus-selection'
    || v.skillVersion !== 'v001') fail('FOCUS_RESULT_INVALID');
  assertPresentationFocusSelectionAnswerV001(v.answer);
}

export async function runPresentationFocusSelectionV001(input: PresentationFocusSelectionInputV001,
  judge: (input: PresentationFocusSelectionInputV001) => Promise<unknown>): Promise<PresentationFocusSelectionResultV001> {
  assertPresentationFocusSelectionInputV001(input);
  const answer = await judge(structuredClone(input));
  return {schemaVersion: 'presentation-focus-selection-result-v001', skillId: 'presentation-focus-selection',
    skillVersion: 'v001', answer: structuredClone(answer)};
}
