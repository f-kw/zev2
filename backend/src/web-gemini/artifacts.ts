import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type FileRef,
  type WebGeminiReviewArtifact,
  type WebGeminiReviewRunLog,
  type WebGeminiRevisionBriefArtifact
} from '@zev2/shared';
import { artifactRoot } from '../artifacts/artifact-path.js';
import { resolveRuntimeDir } from '../config/runtime-dir.js';

const runtimeDir = resolveRuntimeDir();
const webGeminiReviewFileName = 'web-gemini-review.json';
const webGeminiReviewRunLogFileName = 'web-gemini-review-run.json';
const webGeminiReviewPromptFileName = 'web-gemini-review-prompt.md';
const webGeminiRevisionBriefFileName = 'web-gemini-revision-brief.json';

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
