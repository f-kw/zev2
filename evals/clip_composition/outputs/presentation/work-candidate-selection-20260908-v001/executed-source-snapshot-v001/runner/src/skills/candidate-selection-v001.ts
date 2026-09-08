/** 有効候補間の出力判断。時刻・正式採用・製造の権限を持たない。 */
export const CANDIDATE_SELECTION_SKILL_V001 = Object.freeze({
  id: 'candidate-selection', version: 'v001', owner: 'ZEVG',
  question: 'この候補群の中から、最終動画に残すべき候補はどれか',
});
export type CandidateSelectionInputV001 = {
  schemaVersion: 'candidate-selection-input-v001';
  productionRequest: string; structureConditions: string[]; criteria: string[];
  sourceId: string;
  candidates: Array<{candidateId: string; sourceId: string; title: string;
    utterances: Array<{utteranceId: string; text: string}>}>;
};
export type CandidateSelectionAnswerV001 = {status: 'abstained'; reason: string} | {
  status: 'complete';
  decisions: Array<{
    candidateId: string; sourceId: string; decision: 'adopt' | 'reject';
    basis: 'distinct-highlight' | 'necessary-context' | 'necessary-structure' | 'redundant' | 'weak';
    reason: string; evidenceUtteranceIds: string[];
    comparisons: Array<{candidateId: string; evidenceUtteranceIds: string[]}>;
  }>;
};
export type CandidateSelectionResultV001 = {
  schemaVersion: 'candidate-selection-result-v001';
  skillId: 'candidate-selection'; skillVersion: 'v001'; answer: unknown;
};
const object = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object'
  && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: unknown, names: string[]): v is Record<string, any> => object(v)
  && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const id = (v: unknown): v is string => text(v) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(v);
const list = (v: unknown): v is any[] => Array.isArray(v)
  && Object.keys(v).length === v.length && Array.from({length: v.length}, (_, i) => Object.hasOwn(v, i)).every(Boolean);
const nonempty = (v: unknown): v is any[] => list(v) && v.length > 0;
const ids = (v: unknown): v is string[] => nonempty(v) && v.every(id) && new Set(v).size === v.length;
function fail(s: string): never {throw new TypeError(s);}

/** 閉じた語彙により過去採否、尺、score、製造先を判断入力へ追加できない。 */
export function assertCandidateSelectionInputV001(v: unknown): asserts v is CandidateSelectionInputV001 {
  if (!keys(v, ['schemaVersion', 'productionRequest', 'structureConditions', 'criteria', 'sourceId', 'candidates'])
    || v.schemaVersion !== 'candidate-selection-input-v001' || !text(v.productionRequest) || !id(v.sourceId)
    || !nonempty(v.structureConditions) || !v.structureConditions.every(text)
    || !nonempty(v.criteria) || !v.criteria.every(text) || !nonempty(v.candidates)) fail('SELECTION_INPUT_INVALID');
  const seen = new Set<string>();
  for (const c of v.candidates) {
    if (!keys(c, ['candidateId', 'sourceId', 'title', 'utterances']) || !id(c.candidateId)
      || c.sourceId !== v.sourceId || seen.has(c.candidateId) || !text(c.title) || !nonempty(c.utterances)) fail('SELECTION_INPUT_INVALID');
    seen.add(c.candidateId);
    const utterances = new Set<string>();
    for (const u of c.utterances) {
      if (!keys(u, ['utteranceId', 'text']) || !id(u.utteranceId) || !text(u.text)
        || utterances.has(u.utteranceId)) fail('SELECTION_INPUT_INVALID');
      utterances.add(u.utteranceId);
    }
  }
}
export function assertCandidateSelectionAnswerV001(v: unknown): asserts v is CandidateSelectionAnswerV001 {
  if (keys(v, ['status', 'reason']) && v.status === 'abstained' && text(v.reason)) return;
  if (!keys(v, ['status', 'decisions']) || v.status !== 'complete' || !nonempty(v.decisions)) fail('SELECTION_ANSWER_INVALID');
  for (const d of v.decisions) {
    if (!keys(d, ['candidateId', 'sourceId', 'decision', 'basis', 'reason', 'evidenceUtteranceIds', 'comparisons'])
      || !id(d.candidateId) || !id(d.sourceId) || !['adopt', 'reject'].includes(d.decision)
      || !(d.decision === 'adopt' ? ['distinct-highlight', 'necessary-context', 'necessary-structure'] : ['redundant', 'weak']).includes(d.basis)
      || !text(d.reason) || !ids(d.evidenceUtteranceIds) || !list(d.comparisons)) fail('SELECTION_ANSWER_INVALID');
    for (const c of d.comparisons) {
      if (!keys(c, ['candidateId', 'evidenceUtteranceIds']) || !id(c.candidateId)
        || !ids(c.evidenceUtteranceIds)) fail('SELECTION_ANSWER_INVALID');
    }
  }
}
export function assertCandidateSelectionResultV001(v: unknown): asserts v is CandidateSelectionResultV001 {
  if (!keys(v, ['schemaVersion', 'skillId', 'skillVersion', 'answer'])
    || v.schemaVersion !== 'candidate-selection-result-v001' || v.skillId !== CANDIDATE_SELECTION_SKILL_V001.id
    || v.skillVersion !== CANDIDATE_SELECTION_SKILL_V001.version) fail('SELECTION_RESULT_INVALID');
  assertCandidateSelectionAnswerV001(v.answer);
}
export async function runCandidateSelectionV001(input: CandidateSelectionInputV001,
  judge: (input: CandidateSelectionInputV001) => Promise<unknown>): Promise<CandidateSelectionResultV001> {
  assertCandidateSelectionInputV001(input);
  const answer = await judge(structuredClone(input));
  return {schemaVersion: 'candidate-selection-result-v001', skillId: 'candidate-selection',
    skillVersion: 'v001', answer: structuredClone(answer)};
}
