import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  hasText,
  unknownErrorMessage,
  type FileRef,
  type WebGeminiReviewArtifact,
  type WebGeminiReviewRunLog,
  type WebGeminiReviewRunStatus,
  type WebGeminiRevisionBriefArtifact,
  WEB_GEMINI_REVIEW_RUN_STATUSES
} from '@zev2/shared';
import { artifactRoot } from '../artifacts/artifact-path.js';
import { resolveRuntimeDir } from '../config/runtime-dir.js';

const runtimeDir = resolveRuntimeDir();
const webGeminiReviewFileName = 'web-gemini-review.json';
const webGeminiReviewRunLogFileName = 'web-gemini-review-run.json';
const webGeminiReviewPromptFileName = 'web-gemini-review-prompt.md';
const webGeminiRevisionBriefFileName = 'web-gemini-revision-brief.json';

export type WebGeminiReviewFileResults = {
  reviewResult: { review: WebGeminiReviewArtifact | null } | { error: string };
  revisionBriefResult: { revisionBrief: WebGeminiRevisionBriefArtifact | null } | { error: string };
  runLogResult: { runLog: WebGeminiReviewRunLog | null } | { error: string };
};

export function webGeminiReviewPath(requestDraftId: string): string {
  return path.join(artifactRoot(runtimeDir), requestDraftId, webGeminiReviewFileName);
}

export function webGeminiReviewRunLogPath(requestDraftId: string): string {
  return path.join(artifactRoot(runtimeDir), requestDraftId, webGeminiReviewRunLogFileName);
}

export function webGeminiReviewPromptPath(requestDraftId: string): string {
  return path.join(artifactRoot(runtimeDir), requestDraftId, webGeminiReviewPromptFileName);
}

export function webGeminiRevisionBriefPath(requestDraftId: string): string {
  return path.join(artifactRoot(runtimeDir), requestDraftId, webGeminiRevisionBriefFileName);
}

function isNotFoundError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}

function parseWebGeminiReviewArtifact(value: unknown): WebGeminiReviewArtifact | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const artifact = value as Partial<WebGeminiReviewArtifact>;
  if (
    artifact.source !== 'edge-web-gemini' ||
    artifact.status !== 'ready' ||
    !hasText(artifact.draftId) ||
    !hasText(artifact.createdAt) ||
    !hasText(artifact.outputVideoUri) ||
    !hasText(artifact.reviewText) ||
    !hasText(artifact.instructionText)
  ) {
    return undefined;
  }

  return {
    draftId: artifact.draftId.trim(),
    source: 'edge-web-gemini',
    status: 'ready',
    createdAt: artifact.createdAt.trim(),
    outputVideoUri: artifact.outputVideoUri.trim(),
    promptText: hasText(artifact.promptText) ? artifact.promptText.trim() : '',
    reviewText: artifact.reviewText.trim(),
    instructionText: artifact.instructionText.trim()
  };
}

function parseWebGeminiReviewRunLog(value: unknown): WebGeminiReviewRunLog | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const log = value as Partial<WebGeminiReviewRunLog>;
  if (
    !hasText(log.draftId) ||
    !hasText(log.createdAt) ||
    !hasText(log.outputVideoUri) ||
    !hasText(log.outputVideoPath) ||
    !hasText(log.promptPath) ||
    !WEB_GEMINI_REVIEW_RUN_STATUSES.includes(log.status as WebGeminiReviewRunStatus)
  ) {
    return undefined;
  }

  return {
    draftId: log.draftId.trim(),
    status: log.status as WebGeminiReviewRunStatus,
    createdAt: log.createdAt.trim(),
    outputVideoUri: log.outputVideoUri.trim(),
    outputVideoPath: log.outputVideoPath.trim(),
    promptPath: log.promptPath.trim(),
    blockedReasons: Array.isArray(log.blockedReasons)
      ? log.blockedReasons.filter(hasText).map((reason) => reason.trim())
      : [],
    externalUploadRequired: Boolean(log.externalUploadRequired),
    ...(hasText(log.nextAction) ? { nextAction: log.nextAction.trim() } : {}),
    ...(hasText(log.reviewPath) ? { reviewPath: log.reviewPath.trim() } : {}),
    ...(hasText(log.reviewCreatedAt) ? { reviewCreatedAt: log.reviewCreatedAt.trim() } : {}),
    ...(hasText(log.revisionBriefPath) ? { revisionBriefPath: log.revisionBriefPath.trim() } : {}),
    ...(hasText(log.revisionBriefCreatedAt) ? { revisionBriefCreatedAt: log.revisionBriefCreatedAt.trim() } : {}),
    ...(hasText(log.appliedDraftId) ? { appliedDraftId: log.appliedDraftId.trim() } : {}),
    ...(hasText(log.appliedAt) ? { appliedAt: log.appliedAt.trim() } : {}),
    ...(hasText(log.externalReviewCommand) ? { externalReviewCommand: log.externalReviewCommand.trim() } : {}),
    ...(log.edgeControl ? { edgeControl: log.edgeControl } : {}),
    ...(log.cdpControl ? { cdpControl: log.cdpControl } : {})
  };
}

function parseWebGeminiRevisionBriefArtifact(value: unknown): WebGeminiRevisionBriefArtifact | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const brief = value as Partial<WebGeminiRevisionBriefArtifact>;
  if (
    brief.source !== 'human-approved-web-gemini-review' ||
    brief.status !== 'ready' ||
    !hasText(brief.draftId) ||
    !hasText(brief.createdAt) ||
    !hasText(brief.outputVideoUri) ||
    !hasText(brief.reviewCreatedAt) ||
    !hasText(brief.briefText)
  ) {
    return undefined;
  }

  return {
    draftId: brief.draftId.trim(),
    source: 'human-approved-web-gemini-review',
    status: 'ready',
    createdAt: brief.createdAt.trim(),
    outputVideoUri: brief.outputVideoUri.trim(),
    reviewCreatedAt: brief.reviewCreatedAt.trim(),
    briefText: brief.briefText.trim()
  };
}

export async function readWebGeminiReviewArtifact(
  requestDraftId: string
): Promise<{ review: WebGeminiReviewArtifact | null } | { error: string }> {
  try {
    const raw = await readFile(webGeminiReviewPath(requestDraftId), 'utf8');
    const parsed = parseWebGeminiReviewArtifact(JSON.parse(raw));
    if (!parsed || parsed.draftId !== requestDraftId) {
      return { error: 'Web Geminiレビューの保存内容が壊れています' };
    }

    return { review: parsed };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { review: null };
    }

    return { error: `Web Geminiレビューを読めません: ${unknownErrorMessage(error)}` };
  }
}

export async function readWebGeminiRevisionBriefArtifact(
  requestDraftId: string
): Promise<{ revisionBrief: WebGeminiRevisionBriefArtifact | null } | { error: string }> {
  try {
    const raw = await readFile(webGeminiRevisionBriefPath(requestDraftId), 'utf8');
    const parsed = parseWebGeminiRevisionBriefArtifact(JSON.parse(raw));
    if (!parsed || parsed.draftId !== requestDraftId) {
      return { error: 'Web Gemini再生成方針の保存内容が壊れています' };
    }

    return { revisionBrief: parsed };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { revisionBrief: null };
    }

    return { error: `Web Gemini再生成方針を読めません: ${unknownErrorMessage(error)}` };
  }
}

export async function readWebGeminiReviewRunLog(
  requestDraftId: string
): Promise<{ runLog: WebGeminiReviewRunLog | null } | { error: string }> {
  try {
    const raw = await readFile(webGeminiReviewRunLogPath(requestDraftId), 'utf8');
    const parsed = parseWebGeminiReviewRunLog(JSON.parse(raw));
    if (!parsed || parsed.draftId !== requestDraftId) {
      return { error: 'Web Geminiレビュー実行ログの保存内容が壊れています' };
    }

    return { runLog: parsed };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { runLog: null };
    }

    return { error: `Web Geminiレビュー実行ログを読めません: ${unknownErrorMessage(error)}` };
  }
}

export async function readWebGeminiReviewPromptText(
  requestDraftId: string
): Promise<{ promptText: string } | { error: string }> {
  try {
    return { promptText: (await readFile(webGeminiReviewPromptPath(requestDraftId), 'utf8')).trim() };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { promptText: '' };
    }

    return { error: `Web Geminiレビュー依頼文を読めません: ${unknownErrorMessage(error)}` };
  }
}

export async function readWebGeminiReviewFiles(requestDraftId: string): Promise<WebGeminiReviewFileResults> {
  return {
    reviewResult: await readWebGeminiReviewArtifact(requestDraftId),
    revisionBriefResult: await readWebGeminiRevisionBriefArtifact(requestDraftId),
    runLogResult: await readWebGeminiReviewRunLog(requestDraftId)
  };
}

export async function writeWebGeminiReviewArtifact(artifact: WebGeminiReviewArtifact): Promise<void> {
  await writeJsonFile(webGeminiReviewPath(artifact.draftId), artifact);
}

export async function writeWebGeminiRevisionBriefArtifact(artifact: WebGeminiRevisionBriefArtifact): Promise<void> {
  await writeJsonFile(webGeminiRevisionBriefPath(artifact.draftId), artifact);
}

export async function writeWebGeminiReviewRunLog(runLog: WebGeminiReviewRunLog): Promise<void> {
  await writeJsonFile(webGeminiReviewRunLogPath(runLog.draftId), runLog);
}

export async function writeWebGeminiReviewPromptText(requestDraftId: string, promptText: string): Promise<void> {
  const promptPath = webGeminiReviewPromptPath(requestDraftId);
  await mkdir(path.dirname(promptPath), { recursive: true });
  await writeFile(promptPath, `${promptText}\n`, 'utf8');
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function removeWebGeminiReviewArtifact(requestDraftId: string): Promise<void> {
  await rm(webGeminiReviewPath(requestDraftId), { force: true });
}

export async function removeWebGeminiRevisionBriefArtifact(requestDraftId: string): Promise<void> {
  await rm(webGeminiRevisionBriefPath(requestDraftId), { force: true });
}

export function ensureWebGeminiReviewMatchesOutputVideo(
  review: WebGeminiReviewArtifact | null,
  outputVideo: FileRef | undefined
): { error: string } | undefined {
  if (!review) {
    return undefined;
  }

  if (!outputVideo) {
    return { error: 'Web Geminiレビューがありますが、現在の完成動画がありません。動画生成後にレビューを取り直してください' };
  }

  if (review.outputVideoUri === outputVideo.uri) {
    return undefined;
  }

  return { error: 'Web Geminiレビューが現在の完成動画と一致しません。現在の動画でレビューを取り直してください' };
}

export function ensureWebGeminiRevisionBriefMatchesReview(
  revisionBrief: WebGeminiRevisionBriefArtifact | null,
  review: WebGeminiReviewArtifact | null,
  outputVideo: FileRef | undefined
): { error: string } | undefined {
  if (!revisionBrief) {
    return undefined;
  }

  if (!outputVideo) {
    return { error: 'Web Gemini再生成方針がありますが、現在の完成動画がありません。動画生成後にレビューを取り直してください' };
  }

  if (revisionBrief.outputVideoUri !== outputVideo.uri) {
    return { error: 'Web Gemini再生成方針が現在の完成動画と一致しません。現在の動画でレビューを取り直してください' };
  }

  if (!review) {
    return { error: 'Web Gemini再生成方針がありますが、対応するレビュー本文がありません。レビューを取り直してください' };
  }

  if (revisionBrief.reviewCreatedAt !== review.createdAt) {
    return { error: 'Web Gemini再生成方針が現在のレビュー本文と一致しません。再生成方針を作り直してください' };
  }

  return undefined;
}

export function ensureWebGeminiRunLogMatchesOutputVideo(
  runLog: WebGeminiReviewRunLog | null,
  outputVideo: FileRef | undefined
): { error: string } | undefined {
  if (!runLog) {
    return undefined;
  }

  if (!outputVideo) {
    return { error: 'Web Geminiレビュー実行ログがありますが、現在の完成動画がありません。動画生成後にレビューを取り直してください' };
  }

  if (runLog.outputVideoUri === outputVideo.uri) {
    return undefined;
  }

  return { error: 'Web Geminiレビュー実行ログが現在の完成動画と一致しません。現在の動画でレビューを取り直してください' };
}
