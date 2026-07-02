export const WEB_GEMINI_REVIEW_RUN_STATUSES = [
  'prepared',
  'blocked',
  'running',
  'saved',
  'failed',
  'applied'
] as const;

export type WebGeminiReviewRunStatus = (typeof WEB_GEMINI_REVIEW_RUN_STATUSES)[number];

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
