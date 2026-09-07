/** ZEVGの一つの問い。候補採否、時刻、字幕表示、製造権限を持たない。 */
export const CANDIDATE_INTERNAL_RETENTION_SKILL_V001 = Object.freeze({
  id: 'candidate-internal-retention', version: 'v001', owner: 'ZEVG',
  question: '採用済み候補の中で、意味と見どころを保つために何を残し、何を削れるか',
});
export const RETENTION_ROLES_V001 = Object.freeze({
  keep: ['lead-in', 'development', 'payoff', 'reaction'],
  drop: ['duplicate', 'digression', 'dispensable'],
});
export type InternalRetentionInputV001 = {
  schemaVersion: 'candidate-internal-retention-input-v001';
  taskDescription: string;
  candidates: Array<{
    candidateId: string; title: string; highlightReason: string;
    utterances: Array<{utteranceId: string; atoms: Array<{sourceSegmentId: number; text: string}>}>;
  }>;
};
export type InternalRetentionAnswerV001 = {status: 'abstained'; reason: string} | {
  status: 'complete';
  candidates: Array<{
    candidateId: string; meaningPreserved: string;
    blocks: Array<{
      action: 'keep' | 'drop'; startSourceSegmentId: number; endSourceSegmentId: number;
      roles: string[]; reason: string;
    }>;
  }>;
};
export type InternalRetentionResultV001 = {
  schemaVersion: 'candidate-internal-retention-result-v001';
  skillId: 'candidate-internal-retention'; skillVersion: 'v001'; answer: unknown;
};
const object = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object'
  && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: unknown, names: string[]): v is Record<string, any> => object(v)
  && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const id = (v: unknown): v is string => text(v) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(v);
const positive = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
const list = (v: unknown): v is any[] => Array.isArray(v) && v.length > 0
  && Object.keys(v).length === v.length && Array.from({length: v.length}, (_, i) => Object.hasOwn(v, i)).every(Boolean);
function fail(code: string): never {throw new TypeError(code);}

/** 閉じた入力語彙。音響時刻、候補尺、切断可能位置は渡せない。 */
export function assertInternalRetentionInputV001(v: unknown): asserts v is InternalRetentionInputV001 {
  if (!keys(v, ['schemaVersion', 'taskDescription', 'candidates'])
    || v.schemaVersion !== 'candidate-internal-retention-input-v001'
    || !text(v.taskDescription) || !list(v.candidates)) fail('INTERNAL_RETENTION_INPUT_INVALID');
  const candidates = new Set<string>(), utterances = new Set<string>(), atoms = new Set<number>();
  for (const c of v.candidates) {
    if (!keys(c, ['candidateId', 'title', 'highlightReason', 'utterances']) || !id(c.candidateId)
      || candidates.has(c.candidateId) || !text(c.title) || !text(c.highlightReason) || !list(c.utterances)) fail('INTERNAL_RETENTION_INPUT_INVALID');
    candidates.add(c.candidateId);
    for (const u of c.utterances) {
      if (!keys(u, ['utteranceId', 'atoms']) || !id(u.utteranceId) || utterances.has(u.utteranceId)
        || !list(u.atoms)) fail('INTERNAL_RETENTION_INPUT_INVALID');
      utterances.add(u.utteranceId);
      for (const a of u.atoms) {
        if (!keys(a, ['sourceSegmentId', 'text']) || !positive(a.sourceSegmentId)
          || atoms.has(a.sourceSegmentId) || !text(a.text)) fail('INTERNAL_RETENTION_INPUT_INVALID');
        atoms.add(a.sourceSegmentId);
      }
    }
  }
}
export function assertInternalRetentionAnswerV001(v: unknown): asserts v is InternalRetentionAnswerV001 {
  if (keys(v, ['status', 'reason']) && v.status === 'abstained' && text(v.reason)) return;
  if (!keys(v, ['status', 'candidates']) || v.status !== 'complete' || !list(v.candidates)) fail('INTERNAL_RETENTION_ANSWER_INVALID');
  for (const c of v.candidates) {
    if (!keys(c, ['candidateId', 'meaningPreserved', 'blocks']) || !id(c.candidateId)
      || !text(c.meaningPreserved) || !list(c.blocks)) fail('INTERNAL_RETENTION_ANSWER_INVALID');
    for (const b of c.blocks) {
      if (!keys(b, ['action', 'startSourceSegmentId', 'endSourceSegmentId', 'roles', 'reason'])
        || !['keep', 'drop'].includes(b.action) || !positive(b.startSourceSegmentId)
        || !positive(b.endSourceSegmentId) || !list(b.roles)
        || !b.roles.every((r: unknown) => typeof r === 'string' && RETENTION_ROLES_V001[b.action as 'keep' | 'drop'].includes(r))
        || new Set(b.roles).size !== b.roles.length || !text(b.reason)) fail('INTERNAL_RETENTION_ANSWER_INVALID');
    }
  }
}
export function assertInternalRetentionResultV001(v: unknown): asserts v is InternalRetentionResultV001 {
  if (!keys(v, ['schemaVersion', 'skillId', 'skillVersion', 'answer'])
    || v.schemaVersion !== 'candidate-internal-retention-result-v001'
    || v.skillId !== CANDIDATE_INTERNAL_RETENTION_SKILL_V001.id
    || v.skillVersion !== CANDIDATE_INTERNAL_RETENTION_SKILL_V001.version) fail('INTERNAL_RETENTION_RESULT_INVALID');
  assertInternalRetentionAnswerV001(v.answer);
}
export async function runInternalRetentionV001(input: InternalRetentionInputV001,
  judge: (input: InternalRetentionInputV001) => Promise<unknown>): Promise<InternalRetentionResultV001> {
  const answer = await judge(structuredClone(input));
  return {schemaVersion: 'candidate-internal-retention-result-v001',
    skillId: CANDIDATE_INTERNAL_RETENTION_SKILL_V001.id,
    skillVersion: CANDIDATE_INTERNAL_RETENTION_SKILL_V001.version, answer: structuredClone(answer)};
}
