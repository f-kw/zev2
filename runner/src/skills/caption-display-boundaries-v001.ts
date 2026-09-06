/**
 * ZEVOの判断入口。判断手段は呼出元が接続する。媒体、正式値、公開先を受け取らない。
 * このファイルのvalidatorは外側のexecutorから呼ぶ。判断結果の採用・昇格はしない。
 */
export const CAPTION_DISPLAY_SKILL_V001 = Object.freeze({
  id: 'caption-display-boundaries',
  version: 'v001',
  owner: 'ZEVO',
  question: '確定済みの字幕本文を、意味が読み取れるどの表示単位・行末で見せるか',
});

export type CaptionDisplayInputV001 = {
  schemaVersion: 'presentation-zevo-caption-selection-input-v001';
  taskDescription: string;
  captions: Array<{
    captionId: string;
    boundaryCandidates: Array<{boundaryId: string; text: string}>;
  }>;
  styleLimits: {
    maxLogicalWidthPerLine: number;
    maxLinesPerCue: number;
    characterWidthRule: string;
  };
};
export type CaptionDisplayAnswerV001 = {
  status: 'complete';
  captions: Array<{
    captionId: string;
    cues: Array<{cueEndBoundaryId: string; lineEndBoundaryIds: string[]}>;
  }>;
} | {status: 'abstained'; reason: string};
export type CaptionDisplayResultV001 = {
  schemaVersion: 'caption-display-skill-result-v001';
  skillId: typeof CAPTION_DISPLAY_SKILL_V001.id;
  skillVersion: typeof CAPTION_DISPLAY_SKILL_V001.version;
  answer: unknown;
};
export type CaptionDisplayJudgeV001 = (input: CaptionDisplayInputV001) => Promise<unknown>;

const object = (value: unknown): value is Record<string, unknown> => value !== null
  && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keys = (value: unknown, expected: string[]): value is Record<string, unknown> =>
  object(value) && Object.keys(value).length === expected.length
  && expected.every(key => Object.hasOwn(value, key));
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const list = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0
  && Object.keys(value).length === value.length
  && Array.from({length: value.length}, (_, i) => Object.hasOwn(value, i)).every(Boolean);
const positive = (value: unknown) => Number.isSafeInteger(value) && (value as number) > 0;
function fail(code: string): never { throw new TypeError(code); }

/** 入力の形とIDの一意性。元ファイル/SHA/本文との対応はexecutorが既存validatorで検査する。 */
export function assertCaptionDisplayInputV001(value: unknown): asserts value is CaptionDisplayInputV001 {
  if (!keys(value, ['schemaVersion', 'taskDescription', 'captions', 'styleLimits'])
    || value.schemaVersion !== 'presentation-zevo-caption-selection-input-v001'
    || !text(value.taskDescription) || !list(value.captions)
    || !keys(value.styleLimits, ['maxLogicalWidthPerLine', 'maxLinesPerCue', 'characterWidthRule'])
    || !positive(value.styleLimits.maxLogicalWidthPerLine)
    || !positive(value.styleLimits.maxLinesPerCue) || !text(value.styleLimits.characterWidthRule)) {
    fail('CAPTION_SKILL_INPUT_INVALID');
  }
  const captionIds = new Set<string>();
  for (const caption of value.captions) {
    if (!keys(caption, ['captionId', 'boundaryCandidates']) || !text(caption.captionId)
      || captionIds.has(caption.captionId) || !list(caption.boundaryCandidates)) {
      fail('CAPTION_SKILL_INPUT_INVALID');
    }
    captionIds.add(caption.captionId);
    const ids = new Set<string>();
    for (const boundary of caption.boundaryCandidates) {
      if (!keys(boundary, ['boundaryId', 'text']) || !text(boundary.boundaryId)
        || !text(boundary.text) || ids.has(boundary.boundaryId)) fail('CAPTION_SKILL_INPUT_INVALID');
      ids.add(boundary.boundaryId);
    }
  }
}

/** 回答の語彙だけを検査する。所属・順序・被覆・物理幅は既存製造側の検査へ渡す。 */
export function assertCaptionDisplayAnswerV001(value: unknown): asserts value is CaptionDisplayAnswerV001 {
  if (keys(value, ['status', 'reason']) && value.status === 'abstained' && text(value.reason)) return;
  if (!keys(value, ['status', 'captions']) || value.status !== 'complete' || !list(value.captions)) {
    fail('CAPTION_SKILL_OUTPUT_INVALID');
  }
  for (const caption of value.captions) {
    if (!keys(caption, ['captionId', 'cues']) || !text(caption.captionId) || !list(caption.cues)) {
      fail('CAPTION_SKILL_OUTPUT_INVALID');
    }
    for (const cue of caption.cues) {
      if (!keys(cue, ['cueEndBoundaryId', 'lineEndBoundaryIds']) || !text(cue.cueEndBoundaryId)
        || !list(cue.lineEndBoundaryIds) || !cue.lineEndBoundaryIds.every(text)) {
        fail('CAPTION_SKILL_OUTPUT_INVALID');
      }
    }
  }
}

export function assertCaptionDisplayResultV001(value: unknown): asserts value is CaptionDisplayResultV001 {
  if (!keys(value, ['schemaVersion', 'skillId', 'skillVersion', 'answer'])
    || value.schemaVersion !== 'caption-display-skill-result-v001'
    || value.skillId !== CAPTION_DISPLAY_SKILL_V001.id
    || value.skillVersion !== CAPTION_DISPLAY_SKILL_V001.version) fail('CAPTION_SKILL_RESULT_INVALID');
  assertCaptionDisplayAnswerV001(value.answer);
}

/** 一つの編集上の問いを実際に呼び出す。返値は検査前で、正式selectionとは別の型。 */
export async function runCaptionDisplayBoundariesV001(
  input: CaptionDisplayInputV001,
  judge: CaptionDisplayJudgeV001,
): Promise<CaptionDisplayResultV001> {
  const answer = await judge(structuredClone(input));
  return {
    schemaVersion: 'caption-display-skill-result-v001',
    skillId: CAPTION_DISPLAY_SKILL_V001.id,
    skillVersion: CAPTION_DISPLAY_SKILL_V001.version,
    answer: structuredClone(answer),
  };
}
