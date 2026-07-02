import {
  buildWebGeminiExternalReviewCommand,
  hasText,
  recordValue,
  trimText,
  type WebGeminiReviewRunLog,
  type WebGeminiReviewSavedFrom,
  type WebGeminiRunStatusUpdateStatus,
  WEB_GEMINI_REVIEW_SAVED_FROM_VALUES,
  WEB_GEMINI_RUN_STATUS_UPDATE_STATUSES
} from '@zev2/shared';
import { webGeminiReviewPromptPath } from './artifacts.js';

export const webGeminiReviewSavedNextActionBySavedFrom: Record<WebGeminiReviewSavedFrom, string> = {
  ui: 'Web Geminiレビューを保存しました。必要なら再生成方針を確認して演出作成前から作り直せます。',
  edge: 'EdgeのWeb Geminiで取得したレビューを保存しました。必要なら改善指示を確認して演出作成前から作り直せます。',
  'imported-text': '保存済みのWeb Geminiレビュー本文を取り込みました。必要なら改善指示を確認して演出作成前から作り直せます。'
};

export function parseWebGeminiReviewSavedFrom(value: unknown): WebGeminiReviewSavedFrom | { error: string } {
  if (value === undefined) {
    return 'ui';
  }

  if (WEB_GEMINI_REVIEW_SAVED_FROM_VALUES.includes(value as WebGeminiReviewSavedFrom)) {
    return value as WebGeminiReviewSavedFrom;
  }

  return { error: 'Web Geminiレビューの保存元が不正です' };
}

export type ParsedWebGeminiRunStatusUpdate = {
  status: WebGeminiRunStatusUpdateStatus;
  blockedReasons: string[];
  externalUploadRequired: boolean;
  nextAction?: string;
  edgeControl?: unknown;
  cdpControl?: unknown;
};

export function parseWebGeminiRunStatusUpdateInput(
  value: unknown
): ParsedWebGeminiRunStatusUpdate | { error: string } {
  const body = recordValue(value);
  if (!WEB_GEMINI_RUN_STATUS_UPDATE_STATUSES.includes(body.status as WebGeminiRunStatusUpdateStatus)) {
    return { error: 'Web Geminiレビューの実行状態が不正です' };
  }

  const nextAction = trimText(body.nextAction);
  return {
    status: body.status as WebGeminiRunStatusUpdateStatus,
    blockedReasons: Array.isArray(body.blockedReasons)
      ? body.blockedReasons.filter(hasText).map((reason) => reason.trim())
      : [],
    externalUploadRequired: Boolean(body.externalUploadRequired),
    ...(nextAction ? { nextAction } : {}),
    ...(body.edgeControl ? { edgeControl: body.edgeControl } : {}),
    ...(body.cdpControl ? { cdpControl: body.cdpControl } : {})
  };
}

export function buildWebGeminiRunStatusRunLog(input: {
  draftId: string;
  outputVideoUri: string;
  outputVideoPath: string;
  update: ParsedWebGeminiRunStatusUpdate;
  createdAt: string;
}): WebGeminiReviewRunLog {
  const { update } = input;
  return {
    draftId: input.draftId,
    status: update.status,
    createdAt: input.createdAt,
    outputVideoUri: input.outputVideoUri,
    outputVideoPath: input.outputVideoPath,
    promptPath: webGeminiReviewPromptPath(input.draftId),
    blockedReasons: update.blockedReasons,
    externalUploadRequired: update.externalUploadRequired,
    externalReviewCommand: buildWebGeminiExternalReviewCommand(input.draftId),
    ...(update.nextAction ? { nextAction: update.nextAction } : {}),
    ...(update.edgeControl ? { edgeControl: update.edgeControl } : {}),
    ...(update.cdpControl ? { cdpControl: update.cdpControl } : {})
  };
}
