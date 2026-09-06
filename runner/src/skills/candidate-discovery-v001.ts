/** 既存の候補探索の問いを、時刻と採用権限を持たないID提案として包む。 */
export const CANDIDATE_DISCOVERY_SKILL_V001 = Object.freeze({
  id: 'candidate-discovery', version: 'v001', owner: 'ZEVG',
  question: '与えられた素材・確定発話列の中から、制作要求に合う候補はどれか',
  judgmentBasis: 'evals/clip_composition/prompts/theme_generation_prompt_v002.md',
});

export type CandidateDiscoveryInputV001 = {
  schemaVersion: 'candidate-discovery-skill-input-v001';
  productionRequest: string;
  editorialCriteria: string[];
  sourceId: string;
  utterances: Array<{utteranceId: string; text: string}>;
};
export type CandidateDiscoveryAnswerV001 = {status: 'abstained'} | {
  status: 'complete';
  candidates: Array<{
    sourceId: string;
    title: string;
    reason: string;
    evidenceUtteranceIds: string[];
    contextStartUtteranceId: string;
    contextEndUtteranceId: string;
  }>;
};
export type CandidateDiscoveryResultV001 = {
  schemaVersion: 'candidate-discovery-skill-result-v001';
  skillId: 'candidate-discovery'; skillVersion: 'v001'; answer: unknown;
};
const object = (v: unknown): v is Record<string, unknown> => v !== null
  && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: unknown, expected: string[]): v is Record<string, unknown> => object(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const id = (v: unknown): v is string => text(v) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(v);
const dense = (v: unknown): v is unknown[] => Array.isArray(v) && v.length > 0
  && Object.keys(v).length === v.length
  && Array.from({length: v.length}, (_, i) => Object.hasOwn(v, i)).every(Boolean);
function fail(code: string): never {throw new TypeError(code);}

export function assertCandidateDiscoveryInputV001(v: unknown): asserts v is CandidateDiscoveryInputV001 {
  if (!keys(v, ['schemaVersion', 'productionRequest', 'editorialCriteria', 'sourceId', 'utterances'])
    || v.schemaVersion !== 'candidate-discovery-skill-input-v001' || !text(v.productionRequest)
    || !id(v.sourceId) || !dense(v.editorialCriteria) || !v.editorialCriteria.every(text)
    || !dense(v.utterances)) fail('CANDIDATE_SKILL_INPUT_INVALID');
  const seen = new Set<string>();
  for (const row of v.utterances) {
    if (!keys(row, ['utteranceId', 'text']) || !id(row.utteranceId) || !text(row.text)
      || seen.has(row.utteranceId)) fail('CANDIDATE_SKILL_INPUT_INVALID');
    seen.add(row.utteranceId);
  }
}
export function assertCandidateDiscoveryAnswerV001(v: unknown): asserts v is CandidateDiscoveryAnswerV001 {
  if (keys(v, ['status']) && v.status === 'abstained') return;
  if (!keys(v, ['status', 'candidates']) || v.status !== 'complete' || !dense(v.candidates)) {
    fail('CANDIDATE_SKILL_OUTPUT_INVALID');
  }
  for (const row of v.candidates) {
    if (!keys(row, ['sourceId', 'title', 'reason', 'evidenceUtteranceIds',
      'contextStartUtteranceId', 'contextEndUtteranceId'])
      || !id(row.sourceId) || !text(row.title) || !text(row.reason)
      || !dense(row.evidenceUtteranceIds) || !row.evidenceUtteranceIds.every(id)
      || !id(row.contextStartUtteranceId) || !id(row.contextEndUtteranceId)) {
      fail('CANDIDATE_SKILL_OUTPUT_INVALID');
    }
  }
}
export function assertCandidateDiscoveryResultV001(v: unknown): asserts v is CandidateDiscoveryResultV001 {
  if (!keys(v, ['schemaVersion', 'skillId', 'skillVersion', 'answer'])
    || v.schemaVersion !== 'candidate-discovery-skill-result-v001'
    || v.skillId !== CANDIDATE_DISCOVERY_SKILL_V001.id
    || v.skillVersion !== CANDIDATE_DISCOVERY_SKILL_V001.version) fail('CANDIDATE_SKILL_RESULT_INVALID');
  assertCandidateDiscoveryAnswerV001(v.answer);
}

/** 採否・正式区間・最終順・描画を決定しない。検査は外側のexecutorが行う。 */
export async function runCandidateDiscoveryV001(input: CandidateDiscoveryInputV001,
  judge: (input: CandidateDiscoveryInputV001) => Promise<unknown>): Promise<CandidateDiscoveryResultV001> {
  const answer = await judge(structuredClone(input));
  return {schemaVersion: 'candidate-discovery-skill-result-v001',
    skillId: CANDIDATE_DISCOVERY_SKILL_V001.id, skillVersion: CANDIDATE_DISCOVERY_SKILL_V001.version,
    answer: structuredClone(answer)};
}
