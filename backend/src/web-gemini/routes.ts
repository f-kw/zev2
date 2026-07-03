import express from 'express';
import {
  buildWebGeminiExternalReviewCommand,
  buildWebGeminiReviewPromptText,
  findById,
  hasText,
  unknownErrorMessage,
  type FileRef,
  type RequestDraft,
  type WebGeminiReviewArtifact,
  type WebGeminiReviewRunLog,
  type WebGeminiRevisionBriefArtifact
} from '@zev2/shared';
import { loadState, saveState } from '../store/json-store.js';
import { startDryRunRunner } from '../runner/auto-runner.js';
import { artifactPathByUrl, validateArtifactFileRefForKind } from '../artifacts/validation.js';
import { createId, nowIso } from '../domain/support.js';
import {
  finalCompletedOutputChangeError,
  latestOutputVideoFileRef,
  latestSucceededAgentRequest
} from '../domain/state-selectors.js';
import {
  appendCopiedRestartToState,
  createCopiedEditRestart,
  restartStartTypeForGeneratedVideoChange
} from '../domain/restart.js';
import {
  ensureWebGeminiReviewMatchesOutputVideo,
  ensureWebGeminiRunLogMatchesOutputVideo,
  ensureWebGeminiRevisionBriefMatchesReview,
  removeWebGeminiReviewArtifact,
  removeWebGeminiRevisionBriefArtifact,
  webGeminiReviewPath,
  webGeminiReviewPromptPath,
  webGeminiRevisionBriefPath,
  writeWebGeminiReviewArtifact,
  writeWebGeminiReviewPromptText,
  writeWebGeminiReviewRunLog,
  writeWebGeminiRevisionBriefArtifact
} from './artifacts.js';
import {
  buildWebGeminiRunStatusRunLog,
  parseWebGeminiReviewSavedFrom,
  parseWebGeminiRunStatusUpdateInput,
  webGeminiReviewSavedNextActionBySavedFrom
} from './run-status.js';
import { upsertWebGeminiReviewState, webGeminiReviewStateForDraft } from './state.js';

// control routerの人間認証とstate直列化ミドルウェアの後ろにマウントすること(単体マウント禁止)
const webGeminiReviewRouter: express.Router = express.Router();

export function buildWebGeminiReviewPrompt(draft: RequestDraft): string {
  return buildWebGeminiReviewPromptText(draft.purpose);
}

export function webGeminiReviewRestartReason(
  review: WebGeminiReviewArtifact,
  revisionBrief: WebGeminiRevisionBriefArtifact
): string {
  return [
    'Web Geminiの演出レビューを確認し、人間が確定した方針で演出作成前から作り直す',
    `レビュー対象動画: ${review.outputVideoUri}`,
    `レビュー保存日時: ${review.createdAt}`,
    `再生成方針の確定日時: ${revisionBrief.createdAt}`,
    '',
    '人間が確定した再生成方針:',
    revisionBrief.briefText
  ].join('\n');
}

export async function prepareWebGeminiReviewRun(
  draft: RequestDraft,
  outputVideo: FileRef,
  createdAt: string
): Promise<WebGeminiReviewRunLog> {
  const promptPath = webGeminiReviewPromptPath(draft.id);
  await writeWebGeminiReviewPromptText(draft.id, buildWebGeminiReviewPrompt(draft));

  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'prepared',
    createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath,
    blockedReasons: [],
    externalUploadRequired: true,
    externalReviewCommand: buildWebGeminiExternalReviewCommand(draft.id),
    nextAction: 'レビュー対象動画と依頼文を確認しました。外部送信はまだ実行していません。'
  };
  await writeWebGeminiReviewRunLog(runLog);
  return runLog;
}

export async function writeWebGeminiReviewSaveFailureRunLog(
  draft: RequestDraft,
  outputVideo: FileRef,
  errorMessage: string,
  createdAt: string
): Promise<WebGeminiReviewRunLog> {
  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'failed',
    createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath: webGeminiReviewPromptPath(draft.id),
    blockedReasons: [errorMessage],
    externalUploadRequired: false,
    nextAction: 'Web Geminiレビューの保存に失敗しました。レビュー本文を確認してから再実行してください。'
  };
  await writeWebGeminiReviewRunLog(runLog);
  return runLog;
}

export async function writeWebGeminiReviewAppliedRunLog(
  draft: RequestDraft,
  outputVideo: FileRef,
  review: WebGeminiReviewArtifact,
  revisionBrief: WebGeminiRevisionBriefArtifact,
  appliedDraftId: string,
  createdAt: string
): Promise<WebGeminiReviewRunLog> {
  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'applied',
    createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath: webGeminiReviewPromptPath(draft.id),
    blockedReasons: [],
    externalUploadRequired: false,
    nextAction: 'Web Gemini再生成方針を反映して、新しい編集コピーを作成しました。',
    reviewPath: webGeminiReviewPath(draft.id),
    reviewCreatedAt: review.createdAt,
    revisionBriefPath: webGeminiRevisionBriefPath(draft.id),
    revisionBriefCreatedAt: revisionBrief.createdAt,
    appliedDraftId,
    appliedAt: createdAt
  };
  await writeWebGeminiReviewRunLog(runLog);
  return runLog;
}

export async function validateWebGeminiOutputVideo(
  draft: RequestDraft,
  outputVideo: FileRef | undefined
): Promise<string | undefined> {
  if (!outputVideo) {
    return '生成済み動画がありません';
  }

  if (outputVideo.kind !== 'output_video') {
    return 'Web Geminiレビュー対象が完成動画ではありません';
  }

  const validation = await validateArtifactFileRefForKind(
    draft.id,
    'output_video',
    outputVideo.uri,
    outputVideo.mimeType
  );
  if ('error' in validation) {
    return `Web Geminiレビュー対象の完成動画を確認できません: ${validation.error}`;
  }

  return undefined;
}

webGeminiReviewRouter.post('/request-drafts/:id/web-gemini-review/prepare', async (request, response) => {
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビュー準備を作れません', state });
    return;
  }
  const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
  if (outputVideoError) {
    response.status(409).json({ error: outputVideoError, state });
    return;
  }
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }

  try {
    const createdAt = nowIso();
    const promptText = buildWebGeminiReviewPrompt(draft);
    const runLog = await prepareWebGeminiReviewRun(draft, outputVideo, createdAt);
    await removeWebGeminiReviewArtifact(draft.id);
    await removeWebGeminiRevisionBriefArtifact(draft.id);
    upsertWebGeminiReviewState(state, draft.id, {
      review: null,
      revisionBrief: null,
      runLog,
      promptText
    }, createdAt);
    await saveState(state);
    response.json({
      runLog,
      promptText,
      outputVideoUri: outputVideo.uri
    });
  } catch (error) {
    response.status(500).json({
      error: `Web Geminiレビュー準備を保存できません: ${unknownErrorMessage(error)}`,
      state
    });
  }
});

webGeminiReviewRouter.post('/request-drafts/:id/web-gemini-review/run-status', async (request, response) => {
  const update = parseWebGeminiRunStatusUpdateInput(request.body);
  if ('error' in update) {
    response.status(400).json({ error: update.error });
    return;
  }

  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビュー実行状態を更新できません', state });
    return;
  }
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }

  const entry = webGeminiReviewStateForDraft(state, draft.id);
  if (entry?.runLog?.status === 'applied') {
    response.status(409).json({
      error: 'このWeb Geminiレビューはすでに反映済みです。レビューを取り直す準備をしてから実行状態を更新してください',
      state
    });
    return;
  }
  if (entry?.review) {
    response.status(409).json({
      error: 'このWeb Geminiレビューは保存済みです。取り直す場合はレビュー準備を実行してから実行状態を更新してください',
      state
    });
    return;
  }

  const runLog = buildWebGeminiRunStatusRunLog({
    draftId: draft.id,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    update,
    createdAt: nowIso()
  });
  await writeWebGeminiReviewRunLog(runLog);
  upsertWebGeminiReviewState(state, draft.id, { runLog }, runLog.createdAt);
  await saveState(state);
  response.json({ runLog });
});

webGeminiReviewRouter.get('/request-drafts/:id/web-gemini-review', async (request, response) => {
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (outputVideo) {
    const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
    if (outputVideoError) {
      response.status(409).json({ error: outputVideoError, state });
      return;
    }
  }

  const entry = webGeminiReviewStateForDraft(state, draft.id);
  const review = entry?.review ?? null;
  const revisionBrief = entry?.revisionBrief ?? null;
  const runLog = entry?.runLog ?? null;
  const reviewMismatch = ensureWebGeminiReviewMatchesOutputVideo(review, outputVideo);
  if (reviewMismatch) {
    response.status(409).json({ error: reviewMismatch.error, state });
    return;
  }
  const revisionBriefMismatch = ensureWebGeminiRevisionBriefMatchesReview(revisionBrief, review, outputVideo);
  if (revisionBriefMismatch) {
    response.status(409).json({ error: revisionBriefMismatch.error, state });
    return;
  }
  const runLogMismatch = ensureWebGeminiRunLogMatchesOutputVideo(runLog, outputVideo);
  if (runLogMismatch) {
    response.status(409).json({ error: runLogMismatch.error, state });
    return;
  }

  response.json({
    review,
    revisionBrief,
    runLog,
    preparedPromptText: runLog ? entry?.promptText ?? '' : '',
    outputVideoUri: outputVideo?.uri ?? ''
  });
});

webGeminiReviewRouter.post('/request-drafts/:id/web-gemini-review', async (request, response) => {
  const reviewText = hasText(request.body?.reviewText) ? request.body.reviewText.trim() : '';
  const savedFrom = parseWebGeminiReviewSavedFrom(request.body?.savedFrom);
  if (typeof savedFrom !== 'string') {
    response.status(400).json({ error: savedFrom.error });
    return;
  }
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビューを保存できません', state });
    return;
  }
  const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
  if (outputVideoError) {
    response.status(409).json({ error: outputVideoError, state });
    return;
  }
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }

  if (!reviewText) {
    const errorMessage = 'Web Geminiの演出レビューが空です';
    const runLog = await writeWebGeminiReviewSaveFailureRunLog(draft, outputVideo, errorMessage, nowIso());
    upsertWebGeminiReviewState(state, draft.id, { runLog }, runLog.createdAt);
    await saveState(state);
    response.status(400).json({ error: errorMessage, runLog, state });
    return;
  }

  if (webGeminiReviewStateForDraft(state, draft.id)?.runLog?.status === 'applied') {
    response.status(409).json({
      error: 'このWeb Geminiレビューはすでに反映済みです。レビューを取り直す準備をしてから保存してください',
      state
    });
    return;
  }

  const instructionText = hasText(request.body?.instructionText)
    ? request.body.instructionText.trim()
    : reviewText;
  const promptText = hasText(request.body?.promptText) ? request.body.promptText.trim() : '';
  const review: WebGeminiReviewArtifact = {
    draftId: draft.id,
    source: 'edge-web-gemini',
    status: 'ready',
    createdAt: nowIso(),
    outputVideoUri: outputVideo.uri,
    promptText,
    reviewText,
    instructionText
  };

  await writeWebGeminiReviewArtifact(review);
  await removeWebGeminiRevisionBriefArtifact(draft.id);
  const runLog: WebGeminiReviewRunLog = {
    draftId: draft.id,
    status: 'saved',
    createdAt: review.createdAt,
    outputVideoUri: outputVideo.uri,
    outputVideoPath: artifactPathByUrl(outputVideo.uri),
    promptPath: webGeminiReviewPromptPath(draft.id),
    blockedReasons: [],
    externalUploadRequired: savedFrom === 'edge',
    nextAction: webGeminiReviewSavedNextActionBySavedFrom[savedFrom],
    reviewPath: webGeminiReviewPath(draft.id),
    reviewCreatedAt: review.createdAt
  };
  await writeWebGeminiReviewRunLog(runLog);
  upsertWebGeminiReviewState(state, draft.id, {
    review,
    revisionBrief: null,
    runLog
  }, review.createdAt);
  await saveState(state);

  response.json({
    review,
    revisionBrief: null,
    runLog
  });
});

webGeminiReviewRouter.post('/request-drafts/:id/apply-web-gemini-review', async (request, response) => {
  const revisionBriefText = hasText(request.body?.revisionBriefText) ? request.body.revisionBriefText.trim() : '';
  const state = await loadState();
  const draft = findById(state.requestDrafts, request.params.id);
  if (!draft) {
    response.status(404).json({ error: '実行前下書きが見つかりません', state });
    return;
  }
  if (!latestSucceededAgentRequest(state.agentRequests, draft.id, 'render_video')) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビューから作り直せません', state });
    return;
  }

  const entry = webGeminiReviewStateForDraft(state, draft.id);
  const review = entry?.review ?? null;
  if (!review) {
    response.status(409).json({ error: 'Web Geminiの演出レビューがまだ保存されていません', state });
    return;
  }
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (!outputVideo) {
    response.status(409).json({ error: '生成済み動画がないため、Web Geminiレビューから作り直せません', state });
    return;
  }
  const outputVideoError = await validateWebGeminiOutputVideo(draft, outputVideo);
  if (outputVideoError) {
    response.status(409).json({ error: outputVideoError, state });
    return;
  }
  const finalCompleteError = finalCompletedOutputChangeError(state, draft.id, outputVideo);
  if (finalCompleteError) {
    response.status(409).json({ error: finalCompleteError, state });
    return;
  }
  const reviewMismatch = ensureWebGeminiReviewMatchesOutputVideo(review, outputVideo);
  if (reviewMismatch) {
    response.status(409).json({ error: reviewMismatch.error, state });
    return;
  }
  const runLogMismatch = ensureWebGeminiRunLogMatchesOutputVideo(entry?.runLog ?? null, outputVideo);
  if (runLogMismatch) {
    response.status(409).json({ error: runLogMismatch.error, state });
    return;
  }
  if (entry?.runLog?.status === 'applied') {
    response.status(409).json({
      error: 'このWeb Geminiレビューはすでに反映済みです。もう一度反映する場合はレビューを取り直してください',
      state
    });
    return;
  }

  if (!revisionBriefText) {
    response.status(400).json({ error: '今回の再生成方針が空です', state });
    return;
  }

  const createdAt = nowIso();
  const revisionBrief: WebGeminiRevisionBriefArtifact = {
    draftId: draft.id,
    source: 'human-approved-web-gemini-review',
    status: 'ready',
    createdAt,
    outputVideoUri: outputVideo.uri,
    reviewCreatedAt: review.createdAt,
    briefText: revisionBriefText
  };
  const reason = webGeminiReviewRestartReason(review, revisionBrief);
  const restart = await createCopiedEditRestart(
    state,
    draft.id,
    restartStartTypeForGeneratedVideoChange('edit_plan'),
    reason,
    createdAt
  );
  if ('error' in restart) {
    response.status(409).json({ error: restart.error, state });
    return;
  }

  appendCopiedRestartToState(state, restart);
  await writeWebGeminiRevisionBriefArtifact(revisionBrief);
  const runLog = await writeWebGeminiReviewAppliedRunLog(
    draft,
    outputVideo,
    review,
    revisionBrief,
    restart.draft.id,
    createdAt
  );
  upsertWebGeminiReviewState(state, draft.id, { revisionBrief, runLog }, createdAt);
  await saveState(state);

  startDryRunRunner();

  response.json({
    draft: restart.draft,
    revisionBrief,
    runLog,
    state
  });
});

export default webGeminiReviewRouter;
