/**
 * ZEVGの一つの意味判断。確定発話の本文と既存IDだけを判断手段へ渡す。
 * ここにあるshape検査は外側のexecutorから呼ぶ。採用・正式位置への解決は行わない。
 */
export const CAPTION_MEANING_GROUPING_SKILL_V001 = Object.freeze({
  id: 'caption-meaning-grouping',
  version: 'v001',
  owner: 'ZEVG',
  question: '入力された確定発話列を、意味的にどのまとまりへ区切るか',
});

export type CaptionMeaningGroupingInputV001 = {
  schemaVersion: 'caption-meaning-grouping-skill-input-v001';
  taskDescription: string;
  containers: Array<{
    containerId: string;
    boundaryCandidates: Array<{
      boundaryCandidateId: string;
      utteranceIds: string[];
      text: string;
    }>;
  }>;
};

/** 既存の意味境界回答と同じ語彙。本文・絶対時刻・行末・正式採用宣言を持たない。 */
export type CaptionMeaningGroupingAnswerV001 = {
  status: 'complete';
  containers: Array<{
    containerId: string;
    meaningGroups: Array<{meaningGroupEndBoundaryCandidateId: string}>;
  }>;
} | {status: 'abstained'};

export type CaptionMeaningGroupingResultV001 = {
  schemaVersion: 'caption-meaning-grouping-skill-result-v001';
  skillId: typeof CAPTION_MEANING_GROUPING_SKILL_V001.id;
  skillVersion: typeof CAPTION_MEANING_GROUPING_SKILL_V001.version;
  answer: unknown;
};
export type CaptionMeaningGroupingJudgeV001 =
  (input: CaptionMeaningGroupingInputV001) => Promise<unknown>;

const object = (v: unknown): v is Record<string, unknown> => v !== null
  && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: unknown, expected: string[]): v is Record<string, unknown> => object(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const dense = (v: unknown): v is unknown[] => Array.isArray(v) && v.length > 0
  && Object.keys(v).length === v.length
  && Array.from({length: v.length}, (_, i) => Object.hasOwn(v, i)).every(Boolean);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const id = (v: unknown): v is string => text(v) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(v);
function fail(code: string): never { throw new TypeError(code); }

export function assertCaptionMeaningGroupingInputV001(
  value: unknown,
): asserts value is CaptionMeaningGroupingInputV001 {
  if (!keys(value, ['schemaVersion', 'taskDescription', 'containers'])
    || value.schemaVersion !== 'caption-meaning-grouping-skill-input-v001'
    || !text(value.taskDescription) || !dense(value.containers)) fail('MEANING_SKILL_INPUT_INVALID');
  const containers = new Set<string>();
  const candidates = new Set<string>();
  const utterances = new Set<string>();
  for (const container of value.containers) {
    if (!keys(container, ['containerId', 'boundaryCandidates']) || !id(container.containerId)
      || containers.has(container.containerId) || !dense(container.boundaryCandidates)) {
      fail('MEANING_SKILL_INPUT_INVALID');
    }
    containers.add(container.containerId);
    for (const candidate of container.boundaryCandidates) {
      if (!keys(candidate, ['boundaryCandidateId', 'utteranceIds', 'text'])
        || !id(candidate.boundaryCandidateId) || candidates.has(candidate.boundaryCandidateId)
        || !text(candidate.text) || !dense(candidate.utteranceIds)) fail('MEANING_SKILL_INPUT_INVALID');
      candidates.add(candidate.boundaryCandidateId);
      for (const utterance of candidate.utteranceIds) {
        if (!id(utterance) || utterances.has(utterance)) fail('MEANING_SKILL_INPUT_INVALID');
        utterances.add(utterance);
      }
    }
  }
}

export function assertCaptionMeaningGroupingAnswerV001(
  value: unknown,
): asserts value is CaptionMeaningGroupingAnswerV001 {
  if (keys(value, ['status']) && value.status === 'abstained') return;
  if (!keys(value, ['status', 'containers']) || value.status !== 'complete'
    || !dense(value.containers)) fail('MEANING_SKILL_OUTPUT_INVALID');
  for (const container of value.containers) {
    if (!keys(container, ['containerId', 'meaningGroups']) || !id(container.containerId)
      || !dense(container.meaningGroups)) fail('MEANING_SKILL_OUTPUT_INVALID');
    for (const group of container.meaningGroups) {
      if (!keys(group, ['meaningGroupEndBoundaryCandidateId'])
        || !id(group.meaningGroupEndBoundaryCandidateId)) fail('MEANING_SKILL_OUTPUT_INVALID');
    }
  }
}

export function assertCaptionMeaningGroupingResultV001(
  value: unknown,
): asserts value is CaptionMeaningGroupingResultV001 {
  if (!keys(value, ['schemaVersion', 'skillId', 'skillVersion', 'answer'])
    || value.schemaVersion !== 'caption-meaning-grouping-skill-result-v001'
    || value.skillId !== CAPTION_MEANING_GROUPING_SKILL_V001.id
    || value.skillVersion !== CAPTION_MEANING_GROUPING_SKILL_V001.version) {
    fail('MEANING_SKILL_RESULT_INVALID');
  }
  assertCaptionMeaningGroupingAnswerV001(value.answer);
}

/** 回答の採否・検査・正式化をせず、呼出元とは別の入力snapshotから権限なしresultを返す。 */
export async function runCaptionMeaningGroupingV001(
  input: CaptionMeaningGroupingInputV001,
  judge: CaptionMeaningGroupingJudgeV001,
): Promise<CaptionMeaningGroupingResultV001> {
  const answer = await judge(structuredClone(input));
  return {
    schemaVersion: 'caption-meaning-grouping-skill-result-v001',
    skillId: CAPTION_MEANING_GROUPING_SKILL_V001.id,
    skillVersion: CAPTION_MEANING_GROUPING_SKILL_V001.version,
    answer: structuredClone(answer),
  };
}
