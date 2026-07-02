import {
  buildWebGeminiExternalReviewCommand,
  hasText,
  recordValue,
  trimText,
  type WebGeminiReviewRunLog,
  type WebGeminiRunStatusUpdateStatus,
  WEB_GEMINI_RUN_STATUS_UPDATE_STATUSES
} from '@zev2/shared';
import { webGeminiReviewPromptPath } from './artifacts.js';

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
