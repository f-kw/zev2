export const WEB_GEMINI_REVIEW_RUN_STATUSES = [
  'prepared',
  'blocked',
  'running',
  'saved',
  'failed',
  'applied'
] as const;

export type WebGeminiReviewRunStatus = (typeof WEB_GEMINI_REVIEW_RUN_STATUSES)[number];

// 外部スクリプトがAPI経由で更新できる実行状態。saved はレビュー保存API、applied は反映APIだけが作る
export const WEB_GEMINI_RUN_STATUS_UPDATE_STATUSES = ['prepared', 'running', 'blocked', 'failed'] as const;

export type WebGeminiRunStatusUpdateStatus = (typeof WEB_GEMINI_RUN_STATUS_UPDATE_STATUSES)[number];

export interface WebGeminiRunStatusUpdateInput {
  status: WebGeminiRunStatusUpdateStatus;
  blockedReasons?: string[];
  nextAction?: string;
  externalUploadRequired?: boolean;
  edgeControl?: unknown;
  cdpControl?: unknown;
}

// レビュー保存APIの保存元。ui=人間UI、edge=Edge自動操作で取得、imported-text=保存済み本文の取り込み
export const WEB_GEMINI_REVIEW_SAVED_FROM_VALUES = ['ui', 'edge', 'imported-text'] as const;

export type WebGeminiReviewSavedFrom = (typeof WEB_GEMINI_REVIEW_SAVED_FROM_VALUES)[number];

export interface WebGeminiReviewArtifact {
  draftId: string;
  source: 'edge-web-gemini';
  status: 'ready';
  createdAt: string;
  outputVideoUri: string;
  promptText: string;
  reviewText: string;
  instructionText: string;
}

export interface WebGeminiRevisionBriefArtifact {
  draftId: string;
  source: 'human-approved-web-gemini-review';
  status: 'ready';
  createdAt: string;
  outputVideoUri: string;
  reviewCreatedAt: string;
  briefText: string;
}

export interface WebGeminiReviewRunLog {
  draftId: string;
  status: WebGeminiReviewRunStatus;
  createdAt: string;
  outputVideoUri: string;
  outputVideoPath: string;
  promptPath: string;
  blockedReasons: string[];
  externalUploadRequired: boolean;
  nextAction?: string;
  reviewPath?: string;
  reviewCreatedAt?: string;
  revisionBriefPath?: string;
  revisionBriefCreatedAt?: string;
  appliedDraftId?: string;
  appliedAt?: string;
  externalReviewCommand?: string;
  edgeControl?: unknown;
  cdpControl?: unknown;
}
