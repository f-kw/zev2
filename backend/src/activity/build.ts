import {
  type AgentOperationLog,
  type AgentOperationLogEventType,
  type AgentRequest,
  type DecisionLog,
  type DecisionLogType,
  type FileRef,
  type FinalReviewActionType,
  type HumanReviewActionType,
  type RequestDraft,
  type RequestDraftActivityEvent,
  type RequestDraftActivitySearchResult,
  type RequestDraftActivitySummary,
  type WebGeminiReviewRunLog,
  type WebGeminiReviewRunStatus,
  type WebGeminiReviewState,
  type Zev2State
} from '@zev2/shared';
import {
  ensureWebGeminiReviewMatchesOutputVideo,
  ensureWebGeminiRevisionBriefMatchesReview,
  ensureWebGeminiRunLogMatchesOutputVideo
} from '../web-gemini/artifacts.js';
import { webGeminiReviewStateForDraft } from '../web-gemini/state.js';
import { compactActivityText, reviewActionLabel } from '../domain/support.js';
import {
  currentAgentRequestsForDraft,
  latestFinalReviewActionForOutput,
  latestOpenControlReview,
  latestOutputVideoFileRef
} from '../domain/state-selectors.js';

export function buildRequestDraftActivitySummary(
  state: Zev2State,
  draft: RequestDraft
): RequestDraftActivitySummary {
  if (draft.status === 'draft') {
    return {
      status: 'draft',
      title: '作成開始前',
      detail: '実行前下書きはまだ開始されていません',
      nextAction: '依頼内容を確認して動画作成を開始します',
      requestDraftId: draft.id
    };
  }

  if (draft.status === 'rejected') {
    return {
      status: 'rejected',
      title: '下書きを却下済み',
      detail: 'この下書きではAI作業を進めません',
      nextAction: '別の依頼を作成します',
      requestDraftId: draft.id
    };
  }

  const requests = currentAgentRequestsForDraft(state, draft.id);
  const failedRequest = requests.find((request) => request.status === 'failed');
  if (failedRequest) {
    return {
      status: 'failed',
      title: `${failedRequest.label}で停止`,
      detail: compactActivityText(failedRequest.errorMessage, '停止した工程を確認してください'),
      nextAction: '停止理由を確認して、再実行するか作り直します',
      requestDraftId: draft.id,
      agentRequestId: failedRequest.id
    };
  }

  const reviewItem = latestOpenControlReview(state, draft.id);
  if (reviewItem) {
    return {
      status: 'review_required',
      title: `${reviewItem.title}で確認が必要`,
      detail: compactActivityText(reviewItem.humanQuestion || reviewItem.summary, '人間の確認が必要です'),
      nextAction: '内容を確認して、承認または作り直しを選びます',
      requestDraftId: draft.id,
      agentRequestId: reviewItem.agentRequestId,
      reviewItemId: reviewItem.id
    };
  }

  const runningRequest = requests.find((request) => request.status === 'running');
  if (runningRequest) {
    return {
      status: 'running',
      title: `${runningRequest.label}を実行中`,
      detail: runningRequest.claimOwnerId
        ? `AIエージェントが工程を処理しています。取得者: ${runningRequest.claimOwnerId}`
        : 'AIエージェントが工程を処理しています',
      nextAction: '完了まで待つか、必要なら作業を中止します',
      requestDraftId: draft.id,
      agentRequestId: runningRequest.id
    };
  }

  const waitingRequest = requests.find((request) => request.status === 'queued' || request.status === 'waiting');
  if (waitingRequest) {
    return {
      status: 'waiting',
      title: `${waitingRequest.label}を待機中`,
      detail: waitingRequest.status === 'waiting'
        ? compactActivityText(waitingRequest.errorMessage, '前工程の完了を待っています')
        : compactActivityText(waitingRequest.errorMessage, 'AIエージェントの実行待ちです'),
      nextAction: '止まっている場合はAI作業を再開します',
      requestDraftId: draft.id,
      agentRequestId: waitingRequest.id
    };
  }

  const cancelledRequest = [...requests].reverse().find((request) => request.status === 'cancelled');
  if (cancelledRequest) {
    return {
      status: 'cancelled',
      title: `${cancelledRequest.label}で中止`,
      detail: compactActivityText(cancelledRequest.errorMessage, 'AI作業を中止しました'),
      nextAction: '再開する場合は、作り直しで新しい編集コピーを作ります',
      requestDraftId: draft.id,
      agentRequestId: cancelledRequest.id
    };
  }

  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  if (outputVideo) {
    return {
      status: 'completed',
      title: '動画生成完了',
      detail: '確認用動画を再生できます',
      nextAction: '動画を確認して、必要ならWeb Geminiレビューまたは作り直しを選びます',
      requestDraftId: draft.id,
      outputVideoUri: outputVideo.uri
    };
  }

  return {
    status: 'approved',
    title: 'AI作業を開始できます',
    detail: requests.length > 0 ? '工程キューは作成済みです' : '工程キューはまだ作成されていません',
    nextAction: 'AI作業を開始します',
    requestDraftId: draft.id
  };
}

export const agentRequestStatusTitleSuffixByStatus: Record<AgentRequest['status'], string> = {
  queued: 'をキューに追加',
  waiting: 'は前工程待ち',
  running: 'を実行中',
  succeeded: 'が完了',
  failed: 'で停止',
  cancelled: 'を中止',
  superseded: 'を作り直しで置換'
};

export function agentRequestStatusTitle(request: AgentRequest): string {
  return `${request.label}${agentRequestStatusTitleSuffixByStatus[request.status]}`;
}

export function agentRequestStatusDetail(request: AgentRequest): string {
  if (request.status === 'failed') {
    return compactActivityText(request.errorMessage, '失敗理由を確認してください');
  }

  if (request.status === 'waiting') {
    return compactActivityText(request.errorMessage, '前工程の完了を待っています');
  }

  if (request.status === 'succeeded') {
    return compactActivityText(request.result?.meaning, 'AIエージェントが工程完了を報告しました');
  }

  if (request.status === 'cancelled') {
    return '人間の操作または作り直しにより中止しました';
  }

  if (request.status === 'superseded') {
    return '新しい編集コピーで作り直すため、この工程は使いません';
  }

  if (request.status === 'running') {
    return request.claimOwnerId
      ? `AIエージェントがこの工程を取得しました。取得者: ${request.claimOwnerId}`
      : 'AIエージェントがこの工程を取得しました';
  }

  return compactActivityText(request.errorMessage, 'AIエージェントが実行する工程として登録しました');
}

export const agentOperationLogTitleByEventType: Record<AgentOperationLogEventType, string> = {
  draft_created: '実行前下書き保存を記録',
  draft_approved: '依頼承認を記録',
  draft_rejected: '依頼却下を記録',
  agent_request_created: 'AI作業作成を記録',
  agent_request_next_returned: '次のAI作業返却を記録',
  agent_request_claimed: 'AI作業取得を記録',
  agent_request_completed: 'AI作業完了を記録',
  agent_request_failed: 'AI作業失敗を記録',
  agent_request_claim_recovered: 'AI作業復旧を記録'
};

export function agentOperationLogTitle(log: AgentOperationLog): string {
  return agentOperationLogTitleByEventType[log.eventType];
}

export function agentOperationLogDetail(log: AgentOperationLog): string {
  const parts = [log.detail];
  if (log.ownerId) {
    parts.push(`取得者: ${log.ownerId}`);
  }
  if (log.errorMessage) {
    parts.push(`理由: ${log.errorMessage}`);
  }
  if (log.fileRefId) {
    parts.push(`成果物参照: ${log.fileRefId}`);
  }

  return compactActivityText(parts.join(' / '), 'AI操作の監査イベントを記録しました');
}

export const draftStatusTitleByStatus: Record<RequestDraft['status'], string> = {
  draft: '実行前下書きは未承認',
  approved: 'AIエージェントへ承認',
  rejected: '実行前下書きを却下'
};

export function draftStatusTitle(status: RequestDraft['status']): string {
  return draftStatusTitleByStatus[status];
}

export function humanReviewActionTitle(action: HumanReviewActionType): string {
  return `人間が${reviewActionLabel(action)}`;
}

export const finalReviewActionTitleByType: Record<FinalReviewActionType, string> = {
  publish_ready: '人間が投稿可能として確認',
  final_complete: '人間が最終完了として確認'
};

export function finalReviewActionTitle(action: FinalReviewActionType): string {
  return finalReviewActionTitleByType[action];
}

export const defaultFinalReviewReasonByType: Record<FinalReviewActionType, string> = {
  publish_ready: '完成動画を確認し、投稿可能な成果物として記録しました',
  final_complete: '完成動画を確認し、この編集を最終完了として記録しました'
};

export function defaultFinalReviewReason(action: FinalReviewActionType): string {
  return defaultFinalReviewReasonByType[action];
}

export const decisionTypeLabelByType: Record<DecisionLogType, string> = {
  theme_selection: 'テーマ選択',
  material_confirmation: '切り口と編集元場面',
  render_readiness: '動画生成前確認'
};

export function decisionTypeLabel(type: DecisionLogType): string {
  return decisionTypeLabelByType[type];
}

export function proposedNextStateLabel(state: string): string {
  if (state === 'review_required') {
    return '人間確認待ち';
  }

  return state.trim() || '次の状態を確認してください';
}

export function decisionActivityTitle(decision: DecisionLog): string {
  return `${decisionTypeLabel(decision.decisionType)}: ${decision.decision}`;
}

export function decisionActivityDetail(decision: DecisionLog): string {
  const parts = [
    `理由: ${decision.reason}`,
    `次: ${proposedNextStateLabel(decision.proposedNextState)}`
  ];
  if (decision.humanQuestion) {
    parts.push(`確認: ${decision.humanQuestion}`);
  }
  if (decision.evidenceRefs.length > 0 || decision.artifactRefs.length > 0) {
    parts.push('根拠: 参照あり');
  }

  return compactActivityText(parts.join(' / '), 'AIエージェントが判断を記録しました');
}

export const webGeminiReviewRunTitleByStatus: Record<WebGeminiReviewRunStatus, string> = {
  prepared: 'Web Geminiレビュー準備が完了',
  running: 'Web Geminiレビューを実行中',
  saved: 'Web Geminiレビューを保存',
  failed: 'Web Geminiレビュー実行に失敗',
  blocked: 'Web Geminiレビュー実行を停止',
  applied: 'Web Gemini再生成方針を再作成へ反映'
};

export function webGeminiReviewRunTitle(status: WebGeminiReviewRunStatus): string {
  return webGeminiReviewRunTitleByStatus[status];
}

export function webGeminiReviewRunDetail(runLog: WebGeminiReviewRunLog): string {
  if (runLog.status === 'failed' || runLog.status === 'blocked') {
    return compactActivityText(runLog.blockedReasons.join(' / ') || runLog.nextAction, '停止理由を確認してください');
  }

  if (runLog.status === 'saved') {
    return compactActivityText(runLog.nextAction, '外部レビュー結果を保存しました');
  }

  if (runLog.status === 'applied') {
    return compactActivityText(runLog.nextAction, '再生成方針を反映して新しい編集コピーを作りました');
  }

  if (runLog.status === 'running') {
    return compactActivityText(runLog.nextAction, 'AIエージェントがEdgeで外部レビューを実行しています');
  }

  return compactActivityText(runLog.nextAction, 'レビュー対象動画と依頼文を確認済みです');
}

export function webGeminiReviewOccurredAt(runLog: WebGeminiReviewRunLog): string {
  if (runLog.status === 'applied' && runLog.appliedAt) {
    return runLog.appliedAt;
  }

  if (runLog.status === 'saved' && runLog.reviewCreatedAt) {
    return runLog.reviewCreatedAt;
  }

  return runLog.createdAt;
}

export function buildWebGeminiReviewActivity(
  draft: RequestDraft,
  runLog: WebGeminiReviewRunLog
): RequestDraftActivityEvent {
  return {
    id: `web-gemini-review:${draft.id}:${runLog.status}`,
    kind: 'web_gemini_review_status',
    occurredAt: webGeminiReviewOccurredAt(runLog),
    actor: runLog.status === 'prepared' ? 'backend' : 'agent',
    title: webGeminiReviewRunTitle(runLog.status),
    detail: webGeminiReviewRunDetail(runLog),
    requestDraftId: draft.id
  };
}

export function buildWebGeminiReviewActivityError(
  draft: RequestDraft,
  error: string,
  title = 'Web Geminiレビュー実行ログを確認できません'
): RequestDraftActivityEvent {
  return {
    id: `web-gemini-review:${draft.id}:error`,
    kind: 'web_gemini_review_status',
    occurredAt: draft.updatedAt,
    actor: 'system',
    title,
    detail: compactActivityText(error, '実行ログの保存内容を確認してください'),
    requestDraftId: draft.id
  };
}

export function buildWebGeminiReviewActivitySummary(
  baseSummary: RequestDraftActivitySummary,
  draft: RequestDraft,
  outputVideo: FileRef | undefined,
  entry: WebGeminiReviewState | undefined
): RequestDraftActivitySummary {
  if (baseSummary.status !== 'completed') {
    return baseSummary;
  }

  const review = entry?.review ?? null;
  const revisionBrief = entry?.revisionBrief ?? null;
  const runLog = entry?.runLog ?? null;
  const base = {
    requestDraftId: draft.id,
    ...(outputVideo ? { outputVideoUri: outputVideo.uri } : {})
  };

  if (review) {
    const mismatch = ensureWebGeminiReviewMatchesOutputVideo(review, outputVideo);
    if (mismatch) {
      return {
        ...base,
        status: 'failed',
        title: 'Web Geminiレビュー本文を確認できません',
        detail: compactActivityText(mismatch.error, '現在の完成動画とレビュー本文の対応を確認してください'),
        nextAction: '現在の完成動画でレビューを取り直します'
      };
    }
  }

  if (revisionBrief) {
    const mismatch = ensureWebGeminiRevisionBriefMatchesReview(revisionBrief, review, outputVideo);
    if (mismatch) {
      return {
        ...base,
        status: 'failed',
        title: 'Web Gemini再生成方針を確認できません',
        detail: compactActivityText(mismatch.error, '現在の完成動画、レビュー本文、再生成方針の対応を確認してください'),
        nextAction: '現在の完成動画でレビューを取り直します'
      };
    }
  }

  if (runLog) {
    const mismatch = ensureWebGeminiRunLogMatchesOutputVideo(runLog, outputVideo);
    if (mismatch) {
      return {
        ...base,
        status: 'failed',
        title: 'Web Geminiレビュー実行ログを確認できません',
        detail: compactActivityText(mismatch.error, '現在の完成動画とレビュー実行ログの対応を確認してください'),
        nextAction: '現在の完成動画でレビューを取り直します'
      };
    }

    if (runLog.status === 'running') {
      return {
        ...base,
        status: 'running',
        title: 'Web Geminiレビューを実行中',
        detail: webGeminiReviewRunDetail(runLog),
        nextAction: 'レビュー取得が完了するまで待ちます'
      };
    }

    if (runLog.status === 'failed' || runLog.status === 'blocked') {
      return {
        ...base,
        status: 'failed',
        title: webGeminiReviewRunTitle(runLog.status),
        detail: webGeminiReviewRunDetail(runLog),
        nextAction: '停止理由を確認して、Web Geminiレビューを再実行します'
      };
    }

    if (runLog.status === 'prepared') {
      return {
        ...base,
        status: 'completed',
        title: 'Web Geminiレビュー準備済み',
        detail: webGeminiReviewRunDetail(runLog),
        nextAction: 'EdgeでWeb Geminiレビューを実行します'
      };
    }

    if (runLog.status === 'saved') {
      return {
        ...base,
        status: 'completed',
        title: 'Web Geminiレビュー保存済み',
        detail: webGeminiReviewRunDetail(runLog),
        nextAction: '再生成方針を確認し、必要なら演出作成前から作り直します'
      };
    }

    return {
      ...base,
      status: 'completed',
      title: 'Web Gemini再生成方針反映済み',
      detail: webGeminiReviewRunDetail(runLog),
      nextAction: '作成された編集コピーの演出作成を確認します'
    };
  }

  return baseSummary;
}

export function buildFinalReviewActivitySummary(
  baseSummary: RequestDraftActivitySummary,
  state: Zev2State,
  draft: RequestDraft,
  outputVideo: FileRef | undefined
): RequestDraftActivitySummary {
  if (!outputVideo) {
    return baseSummary;
  }

  const finalReviewAction = latestFinalReviewActionForOutput(state, draft.id, outputVideo);
  if (!finalReviewAction) {
    return baseSummary;
  }

  if (finalReviewAction.action === 'publish_ready') {
    return {
      status: 'completed',
      title: '投稿可能として確認済み',
      detail: compactActivityText(finalReviewAction.reason, '人間が完成動画を投稿可能として確認しました'),
      nextAction: '投稿処理または最終完了の判断を行います',
      requestDraftId: draft.id,
      outputVideoUri: outputVideo.uri
    };
  }

  return {
    status: 'completed',
    title: '最終完了',
    detail: compactActivityText(finalReviewAction.reason, '人間が完成動画を最終完了として確認しました'),
    nextAction: 'この完成動画を最終成果として扱います',
    requestDraftId: draft.id,
    outputVideoUri: outputVideo.uri
  };
}

export function buildRequestDraftActivity(state: Zev2State, draft: RequestDraft): RequestDraftActivityEvent[] {
  const events: RequestDraftActivityEvent[] = [
    {
      id: `draft:${draft.id}:created`,
      kind: 'draft_created',
      occurredAt: draft.createdAt,
      actor: 'user',
      title: '実行前下書きを作成',
      detail: compactActivityText(draft.purpose, '依頼内容を保存しました'),
      requestDraftId: draft.id
    }
  ];

  if (draft.status !== 'draft') {
    events.push({
      id: `draft:${draft.id}:status:${draft.status}`,
      kind: 'draft_status',
      occurredAt: draft.updatedAt,
      actor: 'user',
      title: draftStatusTitle(draft.status),
      detail: '下書きの状態を更新しました',
      requestDraftId: draft.id
    });
  }

  for (const request of state.agentRequests.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `agent:${request.id}:created`,
      kind: 'agent_request_created',
      occurredAt: request.createdAt,
      actor: 'backend',
      title: `${request.label}をキューに追加`,
      detail: 'AIエージェントが実行する工程として登録しました',
      requestDraftId: draft.id,
      agentRequestId: request.id
    });

    if (request.updatedAt !== request.createdAt || request.status !== 'queued') {
      events.push({
        id: `agent:${request.id}:status:${request.status}`,
        kind: 'agent_request_status',
        occurredAt: request.updatedAt,
        actor: request.status === 'succeeded' || request.status === 'failed' ? 'agent' : 'backend',
        title: agentRequestStatusTitle(request),
        detail: agentRequestStatusDetail(request),
        requestDraftId: draft.id,
        agentRequestId: request.id,
        ...(request.result?.fileRefId ? { fileRefId: request.result.fileRefId } : {}),
        ...(request.result?.outputId ? { outputId: request.result.outputId } : {})
      });
    }
  }

  for (const log of state.agentOperationLogs.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `agent-operation:${log.id}`,
      kind: 'agent_operation_log',
      occurredAt: log.createdAt,
      actor: log.actor,
      title: agentOperationLogTitle(log),
      detail: agentOperationLogDetail(log),
      requestDraftId: draft.id,
      ...(log.agentRequestId ? { agentRequestId: log.agentRequestId } : {}),
      ...(log.fileRefId ? { fileRefId: log.fileRefId } : {}),
      ...(log.outputId ? { outputId: log.outputId } : {})
    });
  }

  for (const decision of state.decisionLogs.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `decision:${decision.id}`,
      kind: 'agent_decision',
      occurredAt: decision.createdAt,
      actor: decision.actor,
      title: decisionActivityTitle(decision),
      detail: decisionActivityDetail(decision),
      requestDraftId: draft.id,
      agentRequestId: decision.agentRequestId,
      decisionLogId: decision.id
    });
  }

  for (const review of state.controlReviewItems.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `review:${review.id}:required`,
      kind: 'human_review_required',
      occurredAt: review.createdAt,
      actor: 'agent',
      title: `${review.title}の確認待ち`,
      detail: compactActivityText(review.reason || review.summary, '人間の確認が必要です'),
      requestDraftId: draft.id,
      agentRequestId: review.agentRequestId,
      reviewItemId: review.id
    });
  }

  for (const action of state.humanReviewActions.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `human-review:${action.id}`,
      kind: 'human_review_action',
      occurredAt: action.createdAt,
      actor: 'user',
      title: humanReviewActionTitle(action.action),
      detail: compactActivityText(action.reason, '人間の判断を保存しました'),
      requestDraftId: draft.id,
      reviewItemId: action.reviewItemId,
      humanReviewActionId: action.id
    });
  }

  for (const action of state.finalReviewActions.filter((item) => item.requestDraftId === draft.id)) {
    events.push({
      id: `final-review:${action.id}`,
      kind: 'final_review_action',
      occurredAt: action.createdAt,
      actor: 'user',
      title: finalReviewActionTitle(action.action),
      detail: compactActivityText(action.reason, '完成動画に対する人間の最終判断を保存しました'),
      requestDraftId: draft.id,
      finalReviewActionId: action.id
    });
  }

  return events.sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)
  ));
}

export function buildRequestDraftActivityWithExternalEvents(
  state: Zev2State,
  draft: RequestDraft
): RequestDraftActivityEvent[] {
  const events = buildRequestDraftActivity(state, draft);
  const entry = webGeminiReviewStateForDraft(state, draft.id);
  const review = entry?.review ?? null;
  const outputVideo = latestOutputVideoFileRef(state, draft.id);
  const reviewMismatch = ensureWebGeminiReviewMatchesOutputVideo(review, outputVideo);
  if (reviewMismatch) {
    events.push(buildWebGeminiReviewActivityError(
      draft,
      reviewMismatch.error,
      'Web Geminiレビュー本文を確認できません'
    ));
  }

  const revisionBriefMismatch = ensureWebGeminiRevisionBriefMatchesReview(
    entry?.revisionBrief ?? null,
    review,
    outputVideo
  );
  if (revisionBriefMismatch) {
    events.push(buildWebGeminiReviewActivityError(
      draft,
      revisionBriefMismatch.error,
      'Web Gemini再生成方針を確認できません'
    ));
  }

  const runLog = entry?.runLog ?? null;
  if (runLog) {
    const mismatch = ensureWebGeminiRunLogMatchesOutputVideo(runLog, outputVideo);
    events.push(
      mismatch
        ? buildWebGeminiReviewActivityError(draft, mismatch.error)
        : buildWebGeminiReviewActivity(draft, runLog)
    );
  }

  return events.sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)
  ));
}

export function activitySearchParam(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function activitySearchText(event: RequestDraftActivitySearchResult): string {
  return [
    event.id,
    event.kind,
    event.actor,
    event.title,
    event.detail,
    event.requestDraftId,
    event.agentRequestId ?? '',
    event.reviewItemId ?? '',
    event.decisionLogId ?? '',
    event.humanReviewActionId ?? '',
    event.finalReviewActionId ?? '',
    event.fileRefId ?? '',
    event.outputId ?? '',
    event.draftPurpose,
    event.draftStatus
  ].join('\n').toLowerCase();
}

export function filterActivitySearchResults(
  results: RequestDraftActivitySearchResult[],
  input: { query: string; actor: string; kind: string; requestDraftId: string; limitText: string }
): RequestDraftActivitySearchResult[] {
  const query = input.query.toLowerCase();
  const filtered = results.filter((event) => {
    if (input.requestDraftId && event.requestDraftId !== input.requestDraftId) {
      return false;
    }

    if (input.actor && event.actor !== input.actor) {
      return false;
    }

    if (input.kind && event.kind !== input.kind) {
      return false;
    }

    return !query || activitySearchText(event).includes(query);
  });
  const sorted = filtered.sort((left, right) => (
    right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id)
  ));
  const limit = Number(input.limitText);
  return Number.isInteger(limit) && limit > 0 ? sorted.slice(0, limit) : sorted;
}
