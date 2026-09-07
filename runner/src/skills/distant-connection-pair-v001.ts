/** 既存候補群の前半と後半を結ぶ意味判断。採用・時刻・字幕の判断権限を持たない。 */
export const DISTANT_CONNECTION_PAIR_SKILL_V001 = Object.freeze({
  id: 'distant-connection-pair', version: 'v001', owner: 'ZEVG',
  question: 'どの前半とどの後半を接続すると、前振りと回収が視聴者に理解できるか',
});
export type DistantConnectionPairInputV001 = {
  schemaVersion: 'distant-connection-pair-skill-input-v001';
  productionRequest: string; sourceId: string; editorialCriteria: string[];
  parts: Array<{partId: string; candidateId: string; role: 'first' | 'second';
    utterances: Array<{utteranceId: string; text: string}>; priorObservation: string}>;
  historicalCalibration: Array<{candidateId: string; finding: string}>;
};
export type DistantConnectionPairAnswerV001 = {status: 'abstained'} | {
  status: 'complete'; sourceId: string; firstPartId: string; secondPartId: string;
  reason: string; firstEvidenceUtteranceIds: string[]; secondEvidenceUtteranceIds: string[];
};
const keys = (v: any, expected: string[]) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const text = (v: any) => typeof v === 'string' && v.trim().length > 0;
const id = (v: any) => text(v) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(v);
const list = (v: any) => Array.isArray(v) && v.length > 0 && Object.keys(v).length === v.length;
const ids = (v: any) => list(v) && v.every(id) && new Set(v).size === v.length;
const fail = (code: string): never => {throw new TypeError(code);};
export function assertDistantConnectionPairInputV001(v: any): asserts v is DistantConnectionPairInputV001 {
  if (!keys(v, ['schemaVersion', 'productionRequest', 'sourceId', 'editorialCriteria', 'parts', 'historicalCalibration'])
    || v.schemaVersion !== 'distant-connection-pair-skill-input-v001' || !text(v.productionRequest)
    || !id(v.sourceId) || !list(v.editorialCriteria) || !v.editorialCriteria.every(text)
    || !list(v.parts) || !Array.isArray(v.historicalCalibration)) fail('PAIR_INPUT_INVALID');
  const seen = new Set<string>();
  for (const p of v.parts) {
    if (!keys(p, ['partId', 'candidateId', 'role', 'utterances', 'priorObservation'])
      || !id(p.partId) || seen.has(p.partId) || !id(p.candidateId) || !['first', 'second'].includes(p.role)
      || !list(p.utterances) || typeof p.priorObservation !== 'string') fail('PAIR_INPUT_INVALID');
    seen.add(p.partId);
    const us = new Set<string>();
    for (const u of p.utterances) {
      if (!keys(u, ['utteranceId', 'text']) || !id(u.utteranceId) || !text(u.text)
        || us.has(u.utteranceId)) fail('PAIR_INPUT_INVALID');
      us.add(u.utteranceId);
    }
  }
  for (const r of v.historicalCalibration) if (!keys(r, ['candidateId', 'finding'])
    || !id(r.candidateId) || !text(r.finding)) fail('PAIR_INPUT_INVALID');
}
export function assertDistantConnectionPairAnswerV001(v: any): asserts v is DistantConnectionPairAnswerV001 {
  if (keys(v, ['status']) && v.status === 'abstained') return;
  if (!keys(v, ['status', 'sourceId', 'firstPartId', 'secondPartId', 'reason',
    'firstEvidenceUtteranceIds', 'secondEvidenceUtteranceIds']) || v.status !== 'complete'
    || !id(v.sourceId) || !id(v.firstPartId) || !id(v.secondPartId) || !text(v.reason)
    || !ids(v.firstEvidenceUtteranceIds) || !ids(v.secondEvidenceUtteranceIds)) fail('PAIR_ANSWER_INVALID');
}
export function assertDistantConnectionPairResultV001(v: any) {
  if (!keys(v, ['schemaVersion', 'skillId', 'skillVersion', 'answer'])
    || v.schemaVersion !== 'distant-connection-pair-skill-result-v001'
    || v.skillId !== DISTANT_CONNECTION_PAIR_SKILL_V001.id
    || v.skillVersion !== DISTANT_CONNECTION_PAIR_SKILL_V001.version) fail('PAIR_RESULT_INVALID');
  assertDistantConnectionPairAnswerV001(v.answer);
}
export async function runDistantConnectionPairV001(input: DistantConnectionPairInputV001,
  judge: (input: DistantConnectionPairInputV001) => Promise<unknown>) {
  assertDistantConnectionPairInputV001(input);
  const answer = await judge(structuredClone(input));
  return {schemaVersion: 'distant-connection-pair-skill-result-v001',
    skillId: DISTANT_CONNECTION_PAIR_SKILL_V001.id, skillVersion: DISTANT_CONNECTION_PAIR_SKILL_V001.version,
    answer: structuredClone(answer)};
}
