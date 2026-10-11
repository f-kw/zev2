<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  DEFAULT_GEMINI_MODEL,
  findById,
  readablePurposeForWebGeminiReview,
  uriWithRef,
  type AgentRequest,
  type ControlReviewItem,
  type FinalReviewAction,
  type FinalReviewActionType,
  type FileRef,
  type RequestDraftInput
} from '@zev2/shared';
import {
  activityFilterOptions,
  activityLogItemFromEvent,
  fallbackActivityLogItem,
  filterActivityLogItems,
  type ActivityFilter,
  type ActivityLogItem
} from './activity-log';
import {
  fetchRequestDraftActivity,
  fetchHumanAuthStatus,
  fetchWebGeminiReview,
  formatApiError,
  loginHumanUi,
  logoutHumanUi,
  prepareWebGeminiReview,
  type RequestDraftActivityEvent,
  type RequestDraftActivitySummary,
  type WebGeminiReviewArtifact,
  type WebGeminiReviewRunLog,
  type WebGeminiRevisionBriefArtifact
} from './api';
import { useControlQueueStore } from './stores/controlQueue';
import { GUIDE_STEPS, currentOutput, draftIdentity, draftStartBlockers, executionBlockers, guideStep, resumeBlockers, reviewBlockers, previewStatusLabel, initialCandidateId, creationCheckLabels } from './guided-workflow';

type AppPage = 'workspace' | 'request';
type RedoScope = 'theme_selection' | 'edit_plan';
type ReviewChangeScope =
  | 'edit_plan'
  | 'theme_reselect'
  | 'theme_options_regenerate'
  | 'material_reselect';
type ArtifactReferenceItem = {
  id: string;
  stepCode: string;
  stepName: string;
  statusText: string;
  kindText: string;
  uri: string;
  meaning: string;
  createdAtText: string;
};

const store = useControlQueueStore();
const humanAuthLoading = ref(true);
const humanAuthRequired = ref(false);
const humanAuthAuthenticated = ref(false);
const humanAuthTokenInput = ref('');
const humanAuthError = ref('');
const submitting = ref(false);
const activeRedoScope = ref<RedoScope | ''>('');
const activeReviewAction = ref('');
const resumingAgentWork = ref(false);
const cancellingAgentWork = ref(false);
const selectedReviewOptionId = ref('');
const candidateWasAdopted = ref(false);
const activePage = ref<AppPage>('workspace');
const requestDefaultsApplied = ref(false);
const confirmedDraftIdentity = ref('');
const candidatesOpen = ref(false);
const browsingOptionId = ref('');
const browsingReviewIdentity = ref('');
const outputChangeOpen = ref(false);
const outputChangeReason = ref('');
const outputChangeScope = ref<RedoScope>('edit_plan');
const outputChangeIdentity = ref('');
const outputMediaError = ref('');
const pendingReviewChange = ref<{ reviewId: string; scope?: ReviewChangeScope } | null>(null);
const changeReasonInput = ref('');
const webGeminiReview = ref<WebGeminiReviewArtifact | null>(null);
const webGeminiRevisionBrief = ref<WebGeminiRevisionBriefArtifact | null>(null);
const webGeminiRunLog = ref<WebGeminiReviewRunLog | null>(null);
const webGeminiPreparedPromptText = ref('');
const webGeminiPromptOpen = ref(false);
const webGeminiRevisionBriefInput = ref('');
const webGeminiReviewMessage = ref('');
const webGeminiReviewLoading = ref(false);
const loadedWebGeminiReviewCreatedAt = ref('');
const activeWebGeminiAction = ref<'refresh_review' | 'prepare_review' | 'apply_review' | ''>('');
const activeFinalReviewAction = ref<FinalReviewActionType | ''>('');
const requestActivityEvents = ref<RequestDraftActivityEvent[]>([]);
const requestActivitySummary = ref<RequestDraftActivitySummary | null>(null);
const requestActivityLoading = ref(false);
const requestActivityError = ref('');
const activityDialogOpen = ref(false);
const activityFilter = ref<ActivityFilter>('all');
const activitySearchInput = ref('');
const initialPurpose = 'ショート動画を作成する';
let refreshTimer: number | undefined;
let webGeminiRefreshTimer: number | undefined;
let requestActivityLoadNumber = 0;

const requestInput = reactive<RequestDraftInput>({
  productionType: 'clip',
  purpose: initialPurpose,
  sourceUri: '',
  durationLabel: '60秒以内',
  themeCountLabel: '3候補',
  geminiModelName: DEFAULT_GEMINI_MODEL,
  preset: 'shorts_default'
});

const humanAuthReady = computed(() =>
  !humanAuthLoading.value && (!humanAuthRequired.value || humanAuthAuthenticated.value)
);

const runtimeSummaries = computed(() => {
  if (!store.runtimeConfig) {
    return [
      {
        label: '実行設定',
        title: '設定確認中',
        description: '設定ファイルを読んでいます'
      }
    ];
  }

  return [
    {
      label: '文字起こし',
      title: store.runtimeConfig.stt.mode === 'fixed' ? '固定データ確認' : '実STT',
      description: store.runtimeConfig.stt.mode === 'fixed'
        ? 'STTサーバーには送らず、固定済みの文字起こしを使います'
        : `動画音声をローカルSTTへ送ります: ${store.runtimeConfig.stt.localServerUrl}`
    },
    {
      label: 'テーマ作成',
      title: store.runtimeConfig.contentDiscovery.mode === 'fixed' ? '固定テーマ' : '文字起こし整理',
      description: store.runtimeConfig.contentDiscovery.mode === 'fixed'
        ? '固定済みのテーマを表示します'
        : '文字起こしからテーマを整理します'
    },
    {
      label: '演出作成',
      title: store.runtimeConfig.editPlan.mode === 'fixed' ? '固定演出' : 'Gemini API',
      description: store.runtimeConfig.editPlan.mode === 'fixed'
        ? '固定の演出案と表示枠を使います'
        : '動画断片をGemini APIへ送り、演出案と表示枠を作ります'
    },
    {
      label: '微調整',
      title: '固定処理',
      description: '演出案をそのまま動画生成へ渡します'
    },
    {
      label: '動画生成',
      title: store.runtimeConfig.videoOutput.encoder,
      description: store.runtimeConfig.videoOutput.extraArgs.length > 0
        ? `追加設定: ${store.runtimeConfig.videoOutput.extraArgs.join(' ')}`
        : '確認しやすい重さで完成動画を作ります'
    },
    {
      label: '成果物保存',
      title: store.runtimeConfig.artifactDelivery.mode === 'upload' ? 'API保存' : 'ローカル保存',
      description: store.runtimeConfig.artifactDelivery.mode === 'upload'
        ? 'runnerが作った成果物をbackendへアップロードします'
        : 'runnerが同じ作業フォルダへ成果物を直接保存します'
    }
  ];
});

const currentDraft = computed(() => {
  if (store.activeDraftId) {
    return findById(store.state.requestDrafts, store.activeDraftId);
  }

  return store.state.requestDrafts[0];
});

const showRequestPage = computed(() => activePage.value === 'request' || !currentDraft.value);

const activeReviewItem = computed<ControlReviewItem | undefined>(() => {
  const draft = currentDraft.value;
  if (!draft) {
    return undefined;
  }

  return [...store.state.controlReviewItems]
    .filter((item) => item.requestDraftId === draft.id && item.status === 'review_required')
    .reverse()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
});

const pendingReviewItem = computed(() => {
  const pending = pendingReviewChange.value;
  if (!pending) {
    return undefined;
  }

  return findById(store.state.controlReviewItems, pending.reviewId);
});

const currentRequests = computed(() => {
  const draft = currentDraft.value;
  if (!draft) {
    return [];
  }

  return store.state.agentRequests.filter(
    (request) => request.requestDraftId === draft.id && request.status !== 'superseded'
  );
});

const visibleRequests = computed(() =>
  [...currentRequests.value].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
);

const failedRequest = computed(() =>
  visibleRequests.value.find((request) => request.status === 'failed')
);

const cancelledRequest = computed(() =>
  visibleRequests.value.find((request) => request.status === 'cancelled')
);

const runningRequest = computed(() =>
  visibleRequests.value.find((request) => request.status === 'running')
);

const nextWaitingRequest = computed(() =>
  visibleRequests.value.find((request) => request.status === 'queued' || request.status === 'waiting')
);

const waitingAgentRequest = computed(() =>
  activeReviewItem.value ? undefined : nextWaitingRequest.value
);

const agentOperationLocked = computed(() =>
  Boolean(store.loading || runningRequest.value || waitingAgentRequest.value)
);

const requestCreationLocked = computed(() =>
  Boolean(store.loading || submitting.value || !store.runtimeConfig)
);

const renderRequest = computed(() =>
  [...visibleRequests.value].reverse().find(
    (request) => request.type === 'render_video' && request.status === 'succeeded'
  )
);

const outputVideoFileRef = computed(() => currentDraft.value ? currentOutput(store.state, currentDraft.value.id) : undefined);

const outputVideoUri = computed(() => {
  const fileRef = outputVideoFileRef.value;
  return fileRef?.uri ? uriWithRef(fileRef.uri, fileRef.id) : '';
});

const canRedoVideo = computed(() =>
  Boolean(currentDraft.value && outputVideoUri.value && !hasFinalCompleteForCurrentOutput.value && !agentOperationLocked.value)
);

const outputVideoReferenceText = computed(() => {
  if (!outputVideoUri.value) {
    return '';
  }

  return new URL(outputVideoUri.value, window.location.origin).toString();
});

const finalReviewActionsForCurrentOutput = computed<FinalReviewAction[]>(() => {
  const draft = currentDraft.value;
  const fileRef = outputVideoFileRef.value;
  if (!draft || !fileRef) {
    return [];
  }

  return store.state.finalReviewActions
    .filter((action) => action.requestDraftId === draft.id && action.outputVideoUri === fileRef.uri && action.createdAt >= fileRef.createdAt)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
});

const currentFinalReviewAction = computed(() =>
  finalReviewActionsForCurrentOutput.value[0]
);

const hasPublishReadyForCurrentOutput = computed(() =>
  finalReviewActionsForCurrentOutput.value.some((action) => action.action === 'publish_ready')
);

const hasFinalCompleteForCurrentOutput = computed(() =>
  finalReviewActionsForCurrentOutput.value.some((action) => action.action === 'final_complete')
);

const finalReviewStatusTitle = computed(() => {
  if (hasFinalCompleteForCurrentOutput.value) {
    return 'この動画で作業完了';
  }

  if (hasPublishReadyForCurrentOutput.value) {
    return '投稿候補として保存済み';
  }

  return 'ユーザーの最終判断待ち';
});

const finalReviewStatusDetail = computed(() => {
  if (currentFinalReviewAction.value) {
    return currentFinalReviewAction.value.reason;
  }

  return '動画を確認して、投稿候補として保存するか、この動画で作業完了にするか、作り直すかを選びます';
});

const canApplyWebGeminiReview = computed(() =>
  Boolean(
    currentDraft.value &&
      outputVideoUri.value &&
      webGeminiRunLog.value?.outputVideoUri === outputVideoFileRef.value?.uri &&
      webGeminiReview.value &&
      webGeminiRevisionBriefInput.value.trim() &&
      webGeminiRunLog.value?.status !== 'applied' &&
      !hasFinalCompleteForCurrentOutput.value &&
      !agentOperationLocked.value &&
      activeWebGeminiAction.value !== 'apply_review'
  )
);

const webGeminiPrepareButtonLabel = computed(() => {
  if (activeWebGeminiAction.value === 'prepare_review') {
    return '依頼中';
  }

  return webGeminiReview.value ? 'Geminiレビューを取り直す' : 'Geminiで演出レビューを依頼';
});

const webGeminiApplyButtonLabel = computed(() => {
  if (webGeminiRunLog.value?.status === 'applied') {
    return '反映済み';
  }

  return activeWebGeminiAction.value === 'apply_review' ? '再生成中' : 'この方針で再生成';
});

const webGeminiRunStatusTitle = computed(() => {
  const runLog = webGeminiRunLog.value;
  if (!runLog) {
    return webGeminiReviewMessage.value || 'Geminiレビュー未依頼';
  }

  if (runLog.status === 'blocked') {
    return 'Geminiレビューを開始できません';
  }

  if (runLog.status === 'prepared') {
    return 'Geminiレビューを依頼済み';
  }

  if (runLog.status === 'running') {
    return 'Geminiレビュー取得中';
  }

  if (runLog.status === 'failed') {
    return 'Geminiレビューに失敗';
  }

  if (runLog.status === 'applied') {
    return '再生成方針反映済み';
  }

  return webGeminiReview.value ? 'レビュー保存済み' : 'レビュー保存確認が必要';
});

const webGeminiRunStatusDetail = computed(() => {
  const runLog = webGeminiRunLog.value;
  if (runLog?.status === 'prepared') {
    return 'AIがGeminiに動画を送り、演出の改善点を取得します';
  }

  if (runLog?.status === 'running') {
    return 'AIがEdgeでGeminiを開き、動画レビューを取得しています';
  }

  if (runLog?.status === 'saved' && webGeminiReview.value) {
    return 'Geminiレビューが届きました。採用する変更だけ残して再生成できます';
  }

  if ((runLog?.status === 'blocked' || runLog?.status === 'failed') && runLog.nextAction) {
    return runLog.nextAction;
  }

  if (webGeminiReviewMessage.value) {
    return '保存済みレビューをまだ読めていません';
  }

  if (runLog?.status === 'saved') {
    return '保存ログはありますが、レビュー本文を読めていません';
  }

  return 'AIエージェント実行後に表示します';
});

const webGeminiBlockedReasons = computed(() =>
  webGeminiRunLog.value?.blockedReasons ?? []
);

function asReadableRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

const webGeminiExecutionNotes = computed(() => {
  const runLog = webGeminiRunLog.value;
  if (!runLog || webGeminiReview.value) {
    return [];
  }

  const notes: string[] = [];
  if (runLog.externalUploadRequired) {
    notes.push('AIがGeminiへ送る作業を担当します');
  }

  const edgeControl = asReadableRecord(runLog.edgeControl);
  if (edgeControl?.canRunAppleEventsJavascript === true) {
    notes.push('Edgeのページ操作は確認済みです');
  } else if (edgeControl?.canRunAppleEventsJavascript === false) {
    notes.push('Edgeのページ操作が許可されていません');
  }

  const cdpControl = asReadableRecord(runLog.cdpControl);
  if (cdpControl?.ok === true) {
    notes.push('Gemini画面の自動操作前提は確認済みです');
  } else if (typeof cdpControl?.error === 'string' && cdpControl.error.trim()) {
    notes.push(`Gemini画面の自動操作前提を確認できません: ${cdpControl.error.trim()}`);
  }

  return notes;
});

const canInspectWebGeminiPrompt = computed(() =>
  Boolean(!webGeminiReview.value && webGeminiPreparedPromptText.value.trim())
);

const webGeminiSavedReviewTitle = computed(() =>
  webGeminiReview.value && webGeminiRunLog.value?.status === 'applied' ? '再生成方針反映済み' : webGeminiReview.value ? 'レビュー保存済み' : ''
);

const webGeminiAppliedDraft = computed(() => {
  const appliedDraftId = webGeminiRunLog.value?.appliedDraftId;
  return appliedDraftId ? findById(store.state.requestDrafts, appliedDraftId) : undefined;
});

const webGeminiAppliedDraftText = computed(() => {
  const runLog = webGeminiRunLog.value;
  if (runLog?.status !== 'applied') {
    return '';
  }

  if (webGeminiAppliedDraft.value) {
    return `${formatDisplayDateTime(webGeminiAppliedDraft.value.createdAt)}作成の編集コピーへ反映済みです`;
  }

  if (runLog.appliedAt) {
    return `${formatDisplayDateTime(runLog.appliedAt)}に新しい編集コピーへ反映済みです`;
  }

  return '新しい編集コピーへ反映済みです';
});

const webGeminiSavedReviewDetail = computed(() => {
  if (!webGeminiReview.value) {
    return '';
  }

  if (webGeminiRunLog.value?.status === 'applied') {
    return `このレビューは${webGeminiAppliedDraftText.value}。取り直す場合はレビューを取り直してください。`;
  }

  return 'Geminiレビューを材料として、今回採用する再生成方針をユーザーが決めます。';
});

const webGeminiSavedReviewMeta = computed(() => {
  const review = webGeminiReview.value;
  if (!review) {
    return '';
  }

  const sourceText = webGeminiRunLog.value?.externalUploadRequired
    ? 'EdgeのWeb Geminiで取得'
    : '保存済みレビューを取り込み';
  return `現在の完成動画 / ${sourceText} / 保存日時: ${formatDisplayDateTime(review.createdAt)}`;
});

const canResumeAgentWork = computed(() =>
  Boolean(waitingAgentRequest.value && !failedRequest.value && !runningRequest.value && !store.loading && !resumeNotices.value.length)
);
const resumeNotices = computed(() => currentDraft.value && waitingAgentRequest.value && !failedRequest.value
  ? resumeBlockers(store.state, currentDraft.value.id) : []);

const canCancelAgentWork = computed(() =>
  Boolean(currentDraft.value && (runningRequest.value || waitingAgentRequest.value) && !store.loading)
);

const agentLedActive = computed(() =>
  Boolean(submitting.value || store.loading || runningRequest.value)
);

const statusText = computed(() => {
  if (failedRequest.value) {
    return `${failedRequest.value.label}で停止`;
  }

  if (store.loading && store.message) {
    return store.message;
  }

  if (activeReviewItem.value) {
    return `${activeReviewItem.value.title}で確認が必要`;
  }

  if (runningRequest.value) {
    return `${runningRequest.value.label}を実行中`;
  }

  if (waitingAgentRequest.value) {
    return `${waitingAgentRequest.value.label}を待機中`;
  }

  if (cancelledRequest.value) {
    return 'この依頼の作業を中止しました';
  }

  if (outputVideoUri.value) {
    return '動画生成完了';
  }

  if (currentDraft.value?.productionType === 'digest' && currentRequests.value.length && currentRequests.value.every(r => r.status === 'succeeded')) return '計画検証まで完了・動画未作成';
  if (currentDraft.value?.status === 'rejected') return 'この下書きは却下されています';
  if (currentDraft.value) {
    return currentDraft.value.status === 'draft' ? '下書きの確認待ち' : '次の工程の接続待ち';
  }

  return '新規依頼を入力してください';
});

const statusDetailText = computed(() => {
  if (store.loading && store.message) {
    return '処理が終わるまで操作できません';
  }

  if (activeReviewItem.value) {
    return '下の確認画面で判断してください';
  }

  if (failedRequest.value) {
    return failedRequest.value.errorMessage ?? '停止した工程を確認してください';
  }

  if (runningRequest.value) {
    return `${runningRequest.value.label}を実行しています。完了まで操作できません`;
  }

  if (waitingAgentRequest.value) {
    return `${waitingAgentRequest.value.label}の開始を待っています。完了まで操作できません`;
  }

  if (cancelledRequest.value) {
    return cancelledRequest.value.errorMessage ?? 'ユーザーがAI作業を中止しました';
  }

  if (outputVideoUri.value) {
    return outputMediaError.value || '保存済みの確認用動画です。再生して内容を確認してください';
  }

  if (currentDraft.value?.productionType === 'digest') return '内容確認・作成前確認・動画作成への通常接続が未完成です。計画の検証を完成動画として扱いません';
  if (currentDraft.value) {
    return '保存した内容と実行条件を確認してください';
  }

  return '作成する動画を入力してください';
});

const operationLockNotice = computed(() =>
  agentOperationLocked.value && !canCancelAgentWork.value ? 'この工程はキャンセルできません' : ''
);

const progressText = computed(() => {
  if (visibleRequests.value.length === 0) {
    return '';
  }

  const completedCount = visibleRequests.value.filter((request) => request.status === 'succeeded').length;
  return `${completedCount}/${visibleRequests.value.length} 工程完了`;
});

const progressPercent = computed(() => {
  const totalCount = visibleRequests.value.length;
  if (totalCount === 0) {
    return 0;
  }

  const completedCount = visibleRequests.value.filter((request) => request.status === 'succeeded').length;
  return Math.round((completedCount / totalCount) * 100);
});

const activitySummaryTitle = computed(() =>
  requestActivitySummary.value?.title || statusText.value
);

const activitySummaryDetail = computed(() =>
  requestActivitySummary.value?.detail || statusDetailText.value
);

const activitySummaryNextAction = computed(() =>
  requestActivitySummary.value?.nextAction || activitySummaryDetail.value
);

const hudStatusText = computed(() =>
  showRequestPage.value ? '新規依頼を入力' : activitySummaryTitle.value
);

const hudStatusEyebrowText = computed(() => {
  if (showRequestPage.value) {
    return 'New Request';
  }

  if (outputVideoUri.value) {
    return 'AI処理完了';
  }

  return 'Process Active';
});

const hudStatusDetailText = computed(() =>
  showRequestPage.value ? '素材と作りたい動画を入力して、まず下書きを保存します' : activitySummaryDetail.value
);

const hudVisibleStatusMessage = computed(() =>
  store.errorMessage ? '' : hudStatusDetailText.value
);

const hudHintText = computed(() =>
  showRequestPage.value ? '下書きでは処理を開始しません。確認後に開始します' : activitySummaryNextAction.value
);

const hudProgressText = computed(() =>
  showRequestPage.value ? 'NEW REQUEST' : progressText.value
);

const hudProgressPercent = computed(() =>
  showRequestPage.value ? 0 : progressPercent.value
);

const hudProgressBarStyle = computed(() => ({
  width: `${hudProgressPercent.value}%`
}));

const activeMode = computed(() => {
  if (showRequestPage.value) {
    return 'new';
  }

  if (activeReviewItem.value) {
    return 'review';
  }

  if (outputVideoUri.value) {
    return 'output';
  }

  return 'wait';
});

const sessionSourceText = computed(() =>
  currentDraft.value?.source.uri ?? store.runtimeConfig?.source.defaultUri ?? '未設定'
);

const sessionModelText = computed(() =>
  currentDraft.value?.settings.geminiModelName ?? requestInput.geminiModelName
);

const sessionStageText = computed(() =>
  showRequestPage.value ? 'NEW REQUEST' : progressText.value || (currentDraft.value ? '0/7 工程完了' : '未開始')
);

const artifactReferenceItems = computed<ArtifactReferenceItem[]>(() =>
  visibleRequests.value.flatMap((request, requestIndex) => {
    const result = request.result;
    if (!result?.fileRefId) {
      return [];
    }

    const fileRef = findById(store.state.fileRefs, result.fileRefId);
    if (!fileRef) {
      return [];
    }

    const output = store.state.outputs.find((item) => item.fileRefId === fileRef.id);
    return [{
      id: `${request.id}:${fileRef.id}`,
      stepCode: formatStepCode(requestIndex),
      stepName: request.label,
      statusText: agentRequestStatusText(request.status),
      kindText: fileRefKindText(fileRef.kind),
      uri: fileRef.uri,
      meaning: output?.meaning ?? result.meaning,
      createdAtText: formatActivityTime(fileRef.createdAt)
    }];
  })
);

const activityDialogTitle = computed(() =>
  currentDraft.value ? readablePurposeForWebGeminiReview(currentDraft.value.purpose) : '現在の下書き'
);

const webGeminiActivityRefreshKey = computed(() => {
  const runLog = webGeminiRunLog.value;
  if (!runLog) {
    return webGeminiReviewMessage.value;
  }

  return [
    runLog.status,
    runLog.createdAt,
    runLog.outputVideoUri,
    runLog.reviewCreatedAt ?? '',
    runLog.revisionBriefCreatedAt ?? '',
    runLog.appliedAt ?? '',
    runLog.nextAction ?? '',
    runLog.blockedReasons.join('/')
  ].join('|');
});

const requestActivityRefreshKey = computed(() => {
  const draft = currentDraft.value;
  if (!draft) {
    return '';
  }

  const requestPart = store.state.agentRequests
    .filter((request) => request.requestDraftId === draft.id)
    .map((request) => `${request.id}:${request.status}:${request.updatedAt}`)
    .join('|');
  const reviewPart = store.state.controlReviewItems
    .filter((review) => review.requestDraftId === draft.id)
    .map((review) => `${review.id}:${review.status}:${review.updatedAt}`)
    .join('|');
  const actionPart = store.state.humanReviewActions
    .filter((action) => action.requestDraftId === draft.id)
    .map((action) => `${action.id}:${action.action}:${action.createdAt}`)
    .join('|');
  const finalReviewPart = store.state.finalReviewActions
    .filter((action) => action.requestDraftId === draft.id)
    .map((action) => `${action.id}:${action.action}:${action.outputVideoUri}:${action.createdAt}`)
    .join('|');
  const decisionPart = store.state.decisionLogs
    .filter((decision) => decision.requestDraftId === draft.id)
    .map((decision) => `${decision.id}:${decision.createdAt}`)
    .join('|');

  return [draft.id, draft.status, draft.updatedAt, requestPart, reviewPart, actionPart, finalReviewPart, decisionPart]
    .join('::');
});

const systemLogItems = computed<ActivityLogItem[]>(() => {
  if (showRequestPage.value) {
    return [fallbackActivityLogItem('新規依頼の入力待ち')];
  }

  if (requestActivityError.value) {
    return [fallbackActivityLogItem(requestActivityError.value)];
  }

  if (requestActivityLoading.value && requestActivityEvents.value.length === 0) {
    return [fallbackActivityLogItem('作業履歴を確認中')];
  }

  const events = [...requestActivityEvents.value].slice(-5).reverse();
  if (events.length === 0) {
    return [fallbackActivityLogItem('作業履歴はまだありません')];
  }

  return events.map((event) => activityLogItemFromEvent(event, formatActivityTime(event.occurredAt)));
});

const fullActivityLogItems = computed<ActivityLogItem[]>(() => {
  if (requestActivityError.value) {
    return [fallbackActivityLogItem(requestActivityError.value)];
  }

  if (requestActivityLoading.value && requestActivityEvents.value.length === 0) {
    return [fallbackActivityLogItem('作業履歴を確認中')];
  }

  if (requestActivityEvents.value.length === 0) {
    return [fallbackActivityLogItem('作業履歴はまだありません')];
  }

  return requestActivityEvents.value.map((event) =>
    activityLogItemFromEvent(event, formatDisplayDateTime(event.occurredAt))
  );
});

const visibleFullActivityLogItems = computed(() => {
  const filteredItems = filterActivityLogItems(fullActivityLogItems.value, activityFilter.value);
  const query = activitySearchInput.value.trim().toLowerCase();
  if (!query) {
    return filteredItems;
  }

  const searchedItems = filteredItems.filter((item) => (
    [item.timeText, item.actorText, item.title, item.detail].join('\n').toLowerCase().includes(query)
  ));
  return searchedItems.length > 0 ? searchedItems : [fallbackActivityLogItem('一致する作業履歴はありません')];
});

function formatActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatStepCode(index: number): string {
  const labels = ['INGEST', 'STT', 'THEME', 'CUT', 'FX', 'TUNE', 'RENDER'];
  return labels[index] ?? String(index + 1);
}

function stepMark(request: AgentRequest, index: number): string {
  if (request.status === 'succeeded') {
    return '✓';
  }

  if (request.status === 'running') {
    return '▶';
  }

  if (request.status === 'failed') {
    return '!';
  }

  if (request.status === 'cancelled') {
    return '×';
  }

  return String(index + 1);
}

function agentRequestStatusText(status: AgentRequest['status']): string {
  const textByStatus: Record<AgentRequest['status'], string> = {
    queued: '未作成',
    running: '作成中',
    waiting: '待機中',
    succeeded: '作成済み',
    failed: '失敗',
    cancelled: '中止',
    superseded: '作り直し済み'
  };
  return textByStatus[status];
}

function fileRefKindText(kind: FileRef['kind']): string {
  const textByKind: Record<FileRef['kind'], string> = {
    source_video: '入力動画',
    transcript_json: '文字起こし',
    theme_json: 'テーマ候補',
    composition_json: '編集元場面',
    edit_plan_json: '演出案',
    patch_json: '微調整結果',
    output_video: '完成動画',
    digest_plan_json: 'Digest計画',
    digest_execution_input_json: 'Digest入力検証'
  };
  return textByKind[kind];
}

function formatOptionIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}

async function createVideo() {
  const runtimeConfig = store.runtimeConfig;
  if (!runtimeConfig || store.loading || submitting.value) {
    return;
  }

  submitting.value = true;
  try {
    await store.createRequestDraft({ ...requestInput });
    if (store.activeDraftId) activePage.value = 'workspace';
  } finally {
    submitting.value = false;
  }
}

function openRequestPage() {
  activePage.value = 'request';
  closeCandidates();
  closeReviewChangeDialog();
  outputChangeOpen.value = false;
}

function closeRequestPage() {
  activePage.value = 'workspace';
}

function isContentSelectionReview(review: ControlReviewItem): boolean {
  return review.kind === 'theme_selection';
}

function isMaterialConfirmationReview(review: ControlReviewItem): boolean {
  return review.kind === 'material_confirmation';
}

function approveReviewLabel(review: ControlReviewItem): string {
  if (isContentSelectionReview(review)) {
    return selectedReviewOptionId.value === review.options[0]?.id ? 'この案で進める' : 'この採用案で進める';
  }

  if (isMaterialConfirmationReview(review)) {
    return 'この構成で進める';
  }

  return '確認して動画を作成';
}

function defaultReviewReason(
  review: ControlReviewItem,
  action: string,
  scope?: ReviewChangeScope,
  reasonText = ''
): string {
  const inputReason = reasonText.trim();
  if (inputReason) {
    return inputReason;
  }

  if (action === 'request_changes') {
    if (review.kind === 'theme_selection' || scope === 'theme_options_regenerate') {
      return 'テーマを作り直す';
    }

    if (review.kind === 'material_confirmation' && scope === 'theme_reselect') {
      return 'テーマを選び直す';
    }

    if (review.kind === 'material_confirmation') {
      return '同じテーマで切り口と編集元場面を探し直す';
    }

    if (scope === 'theme_reselect') {
      return 'テーマを選び直す';
    }

    return '演出作成前から作り直す';
  }

  return '確認済みとして進める';
}

function reviewChangePromptMessage(review: ControlReviewItem, scope?: ReviewChangeScope): string {
  if (review.kind === 'theme_selection' || scope === 'theme_options_regenerate') {
    return '必要なら作り直したいテーマの希望を入力してください';
  }

  if (review.kind === 'material_confirmation' && scope === 'theme_reselect') {
    return '必要ならテーマを選び直す理由を入力してください';
  }

  if (review.kind === 'material_confirmation') {
    return '必要なら切り口や編集元場面の希望を入力してください';
  }

  if (review.kind === 'render_readiness' && scope === 'theme_reselect') {
    return '必要ならテーマを選び直す理由を入力してください';
  }

  return '作り直したい点があれば入力してください';
}

function reviewChangeDialogTitle(review: ControlReviewItem, scope?: ReviewChangeScope): string {
  if (review.kind === 'theme_selection' || scope === 'theme_options_regenerate') {
    return 'テーマを作り直す';
  }

  if (review.kind === 'material_confirmation' && scope === 'theme_reselect') {
    return 'テーマを選び直す';
  }

  if (review.kind === 'material_confirmation') {
    return '切り口と編集元場面を探し直す';
  }

  if (review.kind === 'render_readiness' && scope === 'theme_reselect') {
    return 'テーマを選び直す';
  }

  return '演出を作り直す';
}

function skipsChangeDialog(scope?: ReviewChangeScope): boolean {
  return scope === 'theme_reselect';
}

function openReviewChangeDialog(review: ControlReviewItem, scope?: ReviewChangeScope) {
  if (agentOperationLocked.value) {
    return;
  }

  pendingReviewChange.value = { reviewId: review.id, scope };
  changeReasonInput.value = '';
}

function closeReviewChangeDialog() {
  pendingReviewChange.value = null;
  changeReasonInput.value = '';
}

async function sendReviewAction(
  review: ControlReviewItem,
  action: 'approve' | 'request_changes',
  reason: string,
  scope?: ReviewChangeScope
) {
  if (agentOperationLocked.value || !currentDraft.value || review.requestDraftId !== currentDraft.value.id
    || review.id !== activeReviewItem.value?.id || (action === 'approve' && activeReviewBlockers.value.length)) return;

  activeReviewAction.value = scope ? `${action}:${scope}` : action;
  try {
    await store.submitControlReview(
      review.id,
      action,
      reason,
      isContentSelectionReview(review) ? selectedReviewOptionId.value : undefined,
      scope
    );
  } finally {
    activeReviewAction.value = '';
  }
}

async function confirmReviewChange() {
  const pending = pendingReviewChange.value;
  const review = pendingReviewItem.value;
  if (!pending || !review || review.id !== activeReviewItem.value?.id || agentOperationLocked.value) {
    return;
  }

  const reason = defaultReviewReason(review, 'request_changes', pending.scope, changeReasonInput.value);
  closeReviewChangeDialog();
  await sendReviewAction(review, 'request_changes', reason, pending.scope);
}

async function submitActiveReview(action: 'approve' | 'request_changes', scope?: ReviewChangeScope) {
  const review = activeReviewItem.value;
  if (!review || agentOperationLocked.value) {
    return;
  }

  if (action === 'request_changes') {
    if (skipsChangeDialog(scope)) {
      await sendReviewAction(review, action, defaultReviewReason(review, action, scope), scope);
      return;
    }

    openReviewChangeDialog(review, scope);
    return;
  }

  await sendReviewAction(review, action, defaultReviewReason(review, action, scope), scope);
}

async function redoVideo(scope: RedoScope, reasonInput = '') {
  const draft = currentDraft.value;
  if (!draft || agentOperationLocked.value || hasFinalCompleteForCurrentOutput.value) {
    return;
  }

  activeRedoScope.value = scope;
  const reasonByScope: Record<RedoScope, string> = {
    theme_selection: 'テーマ選択前から作り直す',
    edit_plan: '演出作成前から作り直す'
  };

  try {
    await store.requestGeneratedVideoChanges(draft.id, reasonInput.trim() || reasonByScope[scope], scope);
  } finally {
    activeRedoScope.value = '';
  }
}

function normalizeWebGeminiReviewText(text: string): string {
  return text.trim().replace(/\n{3,}/g, '\n\n');
}

function formatDisplayDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

async function refreshRequestActivity() {
  const draft = currentDraft.value;
  requestActivityLoadNumber += 1;
  const loadNumber = requestActivityLoadNumber;

  if (!humanAuthReady.value || !draft || showRequestPage.value) {
    requestActivityEvents.value = [];
    requestActivitySummary.value = null;
    requestActivityError.value = '';
    requestActivityLoading.value = false;
    return;
  }

  requestActivityLoading.value = true;
  requestActivityError.value = '';
  try {
    const result = await fetchRequestDraftActivity(draft.id);
    if (loadNumber !== requestActivityLoadNumber) {
      return;
    }

    requestActivityEvents.value = result.events;
    requestActivitySummary.value = result.summary;
  } catch (error) {
    if (loadNumber !== requestActivityLoadNumber) {
      return;
    }

    requestActivityEvents.value = [];
    requestActivitySummary.value = null;
    requestActivityError.value = formatApiError(error);
  } finally {
    if (loadNumber === requestActivityLoadNumber) {
      requestActivityLoading.value = false;
    }
  }
}

function openActivityDialog() {
  if (!currentDraft.value || showRequestPage.value) {
    return;
  }

  activityDialogOpen.value = true;
  activityFilter.value = 'all';
  activitySearchInput.value = '';
  void refreshRequestActivity();
}

function closeActivityDialog() {
  activityDialogOpen.value = false;
  activitySearchInput.value = '';
}

function setActivityFilter(filter: ActivityFilter) {
  activityFilter.value = filter;
}

async function refreshWebGeminiReview() {
  const draft = currentDraft.value;
  if (webGeminiReviewLoading.value) {
    return;
  }

  if (!humanAuthReady.value || !draft || !outputVideoUri.value) {
    webGeminiReview.value = null;
    webGeminiRevisionBrief.value = null;
    webGeminiRunLog.value = null;
    webGeminiPreparedPromptText.value = '';
    webGeminiPromptOpen.value = false;
    webGeminiRevisionBriefInput.value = '';
    webGeminiReviewMessage.value = '';
    loadedWebGeminiReviewCreatedAt.value = '';
    return;
  }

  webGeminiReviewLoading.value = true;
  webGeminiReviewMessage.value = '';
  const outputIdentity = outputVideoUri.value;
  try {
    const result = await fetchWebGeminiReview(draft.id);
    if (currentDraft.value?.id !== draft.id || outputVideoUri.value !== outputIdentity) return;
    if (webGeminiPreparedPromptText.value !== result.preparedPromptText) {
      webGeminiPromptOpen.value = false;
    }
    webGeminiReview.value = result.review;
    webGeminiRevisionBrief.value = result.revisionBrief;
    webGeminiRunLog.value = result.runLog;
    webGeminiPreparedPromptText.value = result.preparedPromptText;
    if (!result.review) {
      webGeminiRevisionBriefInput.value = '';
      loadedWebGeminiReviewCreatedAt.value = '';
      webGeminiReviewMessage.value = result.runLog ? 'AIにGeminiレビューを依頼済みです' : 'Geminiレビュー未依頼';
      return;
    }

    if (result.revisionBrief) {
      webGeminiRevisionBriefInput.value = result.revisionBrief.briefText;
      loadedWebGeminiReviewCreatedAt.value = result.review.createdAt;
    } else if (loadedWebGeminiReviewCreatedAt.value !== result.review.createdAt) {
      webGeminiRevisionBriefInput.value = result.review.instructionText;
      loadedWebGeminiReviewCreatedAt.value = result.review.createdAt;
    }
  } catch (error) {
    if (currentDraft.value?.id !== draft.id || outputVideoUri.value !== outputIdentity) return;
    webGeminiReview.value = null;
    webGeminiRevisionBrief.value = null;
    webGeminiRunLog.value = null;
    webGeminiPreparedPromptText.value = '';
    webGeminiPromptOpen.value = false;
    webGeminiReviewMessage.value = formatApiError(error);
  } finally {
    webGeminiReviewLoading.value = false;
  }
}

async function reloadWebGeminiReview() {
  activeWebGeminiAction.value = 'refresh_review';
  try {
    await refreshWebGeminiReview();
  } finally {
    activeWebGeminiAction.value = '';
  }
}

async function prepareCurrentWebGeminiReview() {
  const draft = currentDraft.value;
  if (
    !draft ||
    !outputVideoUri.value ||
    hasFinalCompleteForCurrentOutput.value ||
    agentOperationLocked.value ||
    webGeminiReviewLoading.value
  ) {
    return;
  }

  activeWebGeminiAction.value = 'prepare_review';
  webGeminiReviewLoading.value = true;
  webGeminiReviewMessage.value = '';
  try {
    const result = await prepareWebGeminiReview(draft.id);
    webGeminiReview.value = null;
    webGeminiRevisionBrief.value = null;
    webGeminiRunLog.value = result.runLog;
    webGeminiPreparedPromptText.value = result.promptText;
    webGeminiPromptOpen.value = false;
    webGeminiRevisionBriefInput.value = '';
    loadedWebGeminiReviewCreatedAt.value = '';
    webGeminiReviewMessage.value = 'AIにGeminiレビューを依頼しました';
  } catch (error) {
    webGeminiReview.value = null;
    webGeminiRevisionBrief.value = null;
    webGeminiRunLog.value = null;
    webGeminiPreparedPromptText.value = '';
    webGeminiPromptOpen.value = false;
    webGeminiReviewMessage.value = formatApiError(error);
  } finally {
    webGeminiReviewLoading.value = false;
    activeWebGeminiAction.value = '';
  }
}

async function applyWebGeminiReviewChanges() {
  const draft = currentDraft.value;
  const revisionBriefText = normalizeWebGeminiReviewText(webGeminiRevisionBriefInput.value);
  if (
    !canApplyWebGeminiReview.value || !draft ||
    !webGeminiReview.value ||
    !revisionBriefText ||
    hasFinalCompleteForCurrentOutput.value ||
    agentOperationLocked.value
  ) {
    return;
  }

  activeWebGeminiAction.value = 'apply_review';
  try {
    await store.applyWebGeminiReview(draft.id, revisionBriefText);
    webGeminiReview.value = null;
    webGeminiRevisionBrief.value = null;
    webGeminiRunLog.value = null;
    webGeminiPreparedPromptText.value = '';
    webGeminiPromptOpen.value = false;
    webGeminiRevisionBriefInput.value = '';
    loadedWebGeminiReviewCreatedAt.value = '';
    webGeminiReviewMessage.value = '';
  } finally {
    activeWebGeminiAction.value = '';
  }
}

async function submitOutputFinalReview(action: FinalReviewActionType) {
  const draft = currentDraft.value;
  if (!draft || !outputVideoUri.value || agentOperationLocked.value || activeFinalReviewAction.value) {
    return;
  }

  if (action === 'publish_ready' && hasPublishReadyForCurrentOutput.value) {
    return;
  }

  if (hasFinalCompleteForCurrentOutput.value) {
    return;
  }

  activeFinalReviewAction.value = action;
  try {
    await store.submitFinalReview(draft.id, action);
    await refreshRequestActivity();
  } finally {
    activeFinalReviewAction.value = '';
  }
}

function startRefreshTimers() {
  if (refreshTimer === undefined) {
    refreshTimer = window.setInterval(() => {
      if (humanAuthReady.value) {
        void store.refresh();
      }
    }, 2000);
  }

  if (webGeminiRefreshTimer === undefined) {
    webGeminiRefreshTimer = window.setInterval(() => {
      if (
        !humanAuthReady.value ||
        !outputVideoUri.value ||
        activeWebGeminiAction.value ||
        agentOperationLocked.value
      ) {
        return;
      }

      void refreshWebGeminiReview();
    }, 5000);
  }
}

function stopRefreshTimers() {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
  if (webGeminiRefreshTimer !== undefined) {
    window.clearInterval(webGeminiRefreshTimer);
    webGeminiRefreshTimer = undefined;
  }
}

async function initializeAfterHumanAuth() {
  await store.refresh();
  startRefreshTimers();
}

async function refreshHumanAuthStatus() {
  humanAuthLoading.value = true;
  humanAuthError.value = '';
  try {
    const status = await fetchHumanAuthStatus();
    humanAuthRequired.value = status.required;
    humanAuthAuthenticated.value = status.authenticated;
    if (!status.required || status.authenticated) {
      await initializeAfterHumanAuth();
    } else {
      stopRefreshTimers();
    }
  } catch (error) {
    humanAuthRequired.value = true;
    humanAuthAuthenticated.value = false;
    humanAuthError.value = formatApiError(error);
    stopRefreshTimers();
  } finally {
    humanAuthLoading.value = false;
  }
}

async function submitHumanLogin() {
  humanAuthLoading.value = true;
  humanAuthError.value = '';
  try {
    const status = await loginHumanUi(humanAuthTokenInput.value);
    humanAuthRequired.value = status.required;
    humanAuthAuthenticated.value = status.authenticated;
    humanAuthTokenInput.value = '';
    await initializeAfterHumanAuth();
  } catch (error) {
    humanAuthAuthenticated.value = false;
    humanAuthError.value = formatApiError(error);
  } finally {
    humanAuthLoading.value = false;
  }
}

async function logoutHuman() {
  humanAuthLoading.value = true;
  humanAuthError.value = '';
  try {
    const status = await logoutHumanUi();
    humanAuthRequired.value = status.required;
    humanAuthAuthenticated.value = status.authenticated;
    stopRefreshTimers();
    store.$reset();
  } catch (error) {
    humanAuthError.value = formatApiError(error);
  } finally {
    humanAuthLoading.value = false;
  }
}

async function resumeAgentWork() {
  if (!canResumeAgentWork.value) {
    return;
  }

  resumingAgentWork.value = true;
  try {
    await store.resumeAgentWork();
  } finally {
    resumingAgentWork.value = false;
  }
}

async function cancelAgentWork() {
  const draft = currentDraft.value;
  if (!draft || !canCancelAgentWork.value) {
    return;
  }

  cancellingAgentWork.value = true;
  try {
    await store.cancelDraftAgentWork(draft.id);
  } finally {
    cancellingAgentWork.value = false;
  }
}

onMounted(() => {
  void refreshHumanAuthStatus();
});

onBeforeUnmount(() => {
  stopRefreshTimers();
});

watch(
  () => store.runtimeConfig,
  (runtimeConfig) => {
    if (
      !runtimeConfig ||
      requestDefaultsApplied.value ||
      requestInput.sourceUri ||
      requestInput.purpose !== initialPurpose
    ) {
      return;
    }

    requestInput.purpose = runtimeConfig.source.defaultPurpose;
    requestInput.sourceUri = runtimeConfig.source.defaultUri;
    requestInput.geminiModelName = DEFAULT_GEMINI_MODEL;
    requestDefaultsApplied.value = true;
  }
);

watch(
  () => JSON.stringify(activeReviewItem.value),
  () => {
    const review = activeReviewItem.value;
    closeCandidates();
    closeReviewChangeDialog();
    candidateWasAdopted.value=false;
    selectedReviewOptionId.value = review?.kind === 'theme_selection'
      ? review.options[0]?.id ?? ''
      : '';
  }
);

watch(
  () => [
    showRequestPage.value ? 'request' : 'workspace',
    requestActivityRefreshKey.value,
    webGeminiActivityRefreshKey.value
  ].join(':'),
  () => {
    void refreshRequestActivity();
  },
  { immediate: true }
);

watch(
  () => `${showRequestPage.value ? 'request' : 'workspace'}:${currentDraft.value?.id ?? ''}`,
  () => {
    activityDialogOpen.value = false;
  }
);

watch(
  () => [currentDraft.value?.id ?? '', outputVideoUri.value],
  () => {
    webGeminiReview.value = null;
    webGeminiRevisionBrief.value = null;
    webGeminiRunLog.value = null;
    webGeminiRevisionBriefInput.value = '';
    webGeminiPreparedPromptText.value = '';
    loadedWebGeminiReviewCreatedAt.value = '';
    void refreshWebGeminiReview();
  },
  { immediate: true }
);
const activeReviewBlockers = computed(() => currentDraft.value && activeReviewItem.value
  ? Array.from(new Set([...reviewBlockers(store.state, currentDraft.value, activeReviewItem.value, store.reviewMaterials),
    ...(store.reviewMaterials?.review?.id === activeReviewItem.value.id && store.reviewMaterials.draftIdentity === draftIdentity(currentDraft.value)
      ? store.reviewMaterials.blockers : ['表示する登録資料を取得・照合中です。']), ...executionBlockers(store.runtimeConfig)])) : []);
const startBlockers = computed(() => currentDraft.value ? draftStartBlockers(currentDraft.value, store.runtimeConfig) : []);
const currentGuideStep = computed(() => guideStep(currentDraft.value, activeReviewItem.value, Boolean(outputVideoUri.value), showRequestPage.value,
  failedRequest.value?.type || runningRequest.value?.type || nextWaitingRequest.value?.type || cancelledRequest.value?.type || visibleRequests.value[visibleRequests.value.length - 1]?.type, store.reviewMaterials));
const adoptedOption = computed(() => activeReviewItem.value?.options.find(o => o.id === selectedReviewOptionId.value));
const displayedOptions = computed(() => activeReviewItem.value?.kind === 'theme_selection'
  ? adoptedOption.value ? [adoptedOption.value] : [] : activeReviewItem.value?.options ?? []);
const savedCandidateReview = computed(() => {
  if (!currentDraft.value) return;
  return store.state.controlReviewItems.filter(r => r.requestDraftId === currentDraft.value?.id && r.kind === 'theme_selection')
    .reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
});
const candidateOptions = computed(() => currentDraft.value?.productionType === 'digest'
  ? store.reviewMaterials?.digestPreparation?.status === 'verified' ? store.reviewMaterials.candidates : []
  : savedCandidateReview.value?.options ?? []);
const browsingOption = computed(() => candidateOptions.value.find(o => o.id === browsingOptionId.value));
const browsingSavedCandidate = computed(() => store.reviewMaterials?.candidates.find(c => c.id === browsingOptionId.value));
const candidateIdentity = computed(() => currentDraft.value
  ? draftIdentity(currentDraft.value) + ':' + JSON.stringify(savedCandidateReview.value) + ':' + (store.reviewMaterials?.fingerprint ?? '') : '');
const canAdoptCandidate = computed(() => Boolean(browsingOption.value && savedCandidateReview.value?.id === activeReviewItem.value?.id
  && activeReviewItem.value?.kind === 'theme_selection' && !activeReviewBlockers.value.length
  && browsingReviewIdentity.value === candidateIdentity.value && !agentOperationLocked.value));
const executionNotices = computed(() => [...executionBlockers(store.runtimeConfig), ...resumeNotices.value]);
const displayedVersion = computed(() => !showRequestPage.value && currentDraft.value ? `保存版 ${formatDisplayDateTime(currentDraft.value.createdAt)} · ${currentDraft.value.id.slice(-6)}` : '新しい依頼');
const canStartDraft = computed(() => Boolean(currentDraft.value && !startBlockers.value.length && !store.loading
  && confirmedDraftIdentity.value === draftIdentity(currentDraft.value)));

function confirmDraftConditions(event: Event) {
  confirmedDraftIdentity.value = (event.target as HTMLInputElement).checked && currentDraft.value ? draftIdentity(currentDraft.value) : '';
}
async function approveSavedDraft() {
  if (!currentDraft.value || !canStartDraft.value) return;
  await store.approveRequestDraft(currentDraft.value.id, confirmedDraftIdentity.value);
  confirmedDraftIdentity.value = '';
}
function editSavedDraft() {
  const draft = currentDraft.value;
  if (!draft || store.loading) return;
  Object.assign(requestInput, { productionType: draft.productionType, purpose: draft.purpose, sourceUri: draft.source.uri, ...draft.settings });
  confirmedDraftIdentity.value = '';
  openRequestPage();
}
function openCandidates() {
  if (!candidateOptions.value.length) return;
  browsingOptionId.value = selectedReviewOptionId.value || candidateOptions.value[0]?.id || '';
  browsingReviewIdentity.value = candidateIdentity.value;
  candidatesOpen.value = true;
}
function closeCandidates() { candidatesOpen.value = false; browsingOptionId.value = ''; browsingReviewIdentity.value = ''; }
function adoptCandidate() {
  if (!canAdoptCandidate.value) return;
  selectedReviewOptionId.value = browsingOptionId.value;
  candidateWasAdopted.value=true;
  closeCandidates();
}
function showOutputChanges(scope: RedoScope) {
  if (!canRedoVideo.value) return;
  outputChangeScope.value = scope;
  outputChangeIdentity.value = `${currentDraft.value?.id}:${outputVideoFileRef.value?.id}`;
  outputChangeOpen.value = true;
}
async function confirmOutputChanges() {
  if (!canRedoVideo.value || outputChangeIdentity.value !== `${currentDraft.value?.id}:${outputVideoFileRef.value?.id}`) return;
  outputChangeOpen.value = false;
  await redoVideo(outputChangeScope.value, outputChangeReason.value);
}
watch(candidateIdentity, () => { closeCandidates(); });
watch(() => store.reviewMaterials, materials => {
  const review=activeReviewItem.value;
  if (!candidateWasAdopted.value && review?.kind==='theme_selection' && materials?.draftIdentity===draftIdentity(currentDraft.value!)) {
    selectedReviewOptionId.value=initialCandidateId(review,materials);
  }
});
watch(() => currentDraft.value && draftIdentity(currentDraft.value), () => {
  confirmedDraftIdentity.value = '';
  outputChangeOpen.value = false;
  outputChangeReason.value = '';
});
watch(() => JSON.stringify(store.runtimeConfig), () => { confirmedDraftIdentity.value = ''; });
watch(() => JSON.stringify([showRequestPage.value, currentDraft.value, activeReviewItem.value, savedCandidateReview.value, currentRequests.value,
  currentRequests.value.map(r=>findById(store.state.fileRefs,r.result?.fileRefId)), store.runtimeConfig]), () => {
  void store.refreshUiReviewMaterials(!showRequestPage.value && currentDraft.value ? currentDraft.value.id : '');
});
watch(outputVideoUri, () => { outputMediaError.value = ''; outputChangeOpen.value = false; });
function dismissDialog() { closeCandidates(); closeReviewChangeDialog(); closeActivityDialog(); outputChangeOpen.value = false; }
const dialogIsOpen = computed(() => candidatesOpen.value || outputChangeOpen.value || activityDialogOpen.value || Boolean(pendingReviewChange.value));
let dialogTrigger: HTMLElement | null = null;
watch(dialogIsOpen, async open => {
  if (open) {
    dialogTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    document.querySelector<HTMLElement>('[role="dialog"] button, [role="dialog"] textarea')?.focus();
  } else { await nextTick(); dialogTrigger?.focus(); dialogTrigger = null; }
});
function trapDialogFocus(event: KeyboardEvent) {
  if (!dialogIsOpen.value || event.key !== 'Tab') return;
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  const elements = [...dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, a[href]') ?? []];
  const first = elements[0], last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
</script>

<template>
  <main :class="['app-shell', { 'request-mode': showRequestPage }]" @keydown.esc="dismissDialog" @keydown.tab="trapDialogFocus">
    <section class="sys-bar" aria-label="制作の案内" :inert="dialogIsOpen">
      <div class="sys-brand"><strong>ZEV</strong><span>{{ showRequestPage ? '新しい動画を作る' : currentDraft?.purpose }}</span></div>
      <span class="version-pill">{{ displayedVersion }}</span>
      <div class="sys-actions">
        <button v-if="currentDraft && !showRequestPage" type="button" class="secondary-button" @click="openActivityDialog">履歴</button>
        <button
          v-if="canResumeAgentWork"
          type="button"
          class="secondary-button"
          :disabled="resumingAgentWork"
          @click="resumeAgentWork"
        >
          {{ resumingAgentWork ? '再開中' : '待機中の作業を再開' }}
        </button>
        <button
          v-if="canCancelAgentWork"
          type="button"
          class="danger-button"
          :disabled="cancellingAgentWork"
          @click="cancelAgentWork"
        >
          {{ cancellingAgentWork ? '中止中' : '作業を中止' }}
        </button>
        <button
          v-if="!showRequestPage"
          type="button"
          class="secondary-button"
          :disabled="submitting"
          @click="openRequestPage"
        >
          新しく作る
        </button>
        <button
          v-if="showRequestPage && currentDraft"
          type="button"
          class="secondary-button"
          @click="closeRequestPage"
        >
          作業へ戻る
        </button>
        <button
          v-if="humanAuthRequired && humanAuthAuthenticated"
          type="button"
          class="secondary-button"
          :disabled="humanAuthLoading"
          @click="logoutHuman"
        >
          ログアウト
        </button>
      </div>
    </section>

    <section v-if="humanAuthReady" class="agent-status-bar" aria-live="polite" :inert="dialogIsOpen">
      <div class="status-main">
        <div>
          <p class="eyebrow">{{ currentGuideStep + 1 }} / 6</p>
          <h2 class="glitch-title">{{ hudStatusText }}</h2>
        </div>
        <p v-if="hudVisibleStatusMessage" class="status-message">{{ hudVisibleStatusMessage }}</p>
        <p v-if="store.errorMessage" class="error-message">{{ store.errorMessage }}</p>
        <p v-if="!showRequestPage && operationLockNotice" class="lock-message">{{ operationLockNotice }}</p>
      </div>

      <ol class="guide-steps" aria-label="動画制作の順番">
        <li v-for="(step, index) in GUIDE_STEPS" :key="step" :class="{ active: index === currentGuideStep, passed: index < currentGuideStep }" :aria-current="index === currentGuideStep ? 'step' : undefined"><span>{{ index + 1 }}</span> {{ step }}</li>
      </ol>
    </section>

    <section v-else class="auth-panel" aria-label="ユーザーUI認証">
      <div class="panel-corner" aria-hidden="true"></div>
      <div>
        <p class="eyebrow">Human Auth</p>
        <h1>{{ humanAuthLoading ? '認証確認中' : 'ユーザーUIログイン' }}</h1>
      </div>
      <form v-if="humanAuthRequired" class="auth-form" @submit.prevent="submitHumanLogin">
        <label>
          認証トークン
          <input
            v-model="humanAuthTokenInput"
            type="password"
            autocomplete="current-password"
            :disabled="humanAuthLoading"
          />
        </label>
        <p v-if="humanAuthError" class="error-message">{{ humanAuthError }}</p>
        <button type="submit" :disabled="humanAuthLoading || !humanAuthTokenInput.trim()">
          {{ humanAuthLoading ? '確認中' : 'ログイン' }}
        </button>
      </form>
      <div v-else class="empty-review-state">
        <strong>認証設定なし</strong>
        <span>作業画面を読み込んでいます</span>
      </div>
    </section>

    <div v-if="humanAuthReady" class="workspace-grid" :inert="dialogIsOpen">
      <section class="stage">
        <section v-if="showRequestPage" class="request-page">
          <div class="panel-corner" aria-hidden="true"></div>
          <div class="request-header">
            <div>
              <p class="eyebrow">動画の依頼</p>
              <h1>新しい動画を作る</h1>
            </div>
          </div>

          <form class="request-form" @submit.prevent="createVideo">
            <div class="request-columns">
              <div class="request-fields">
                <label>使う素材<input v-model="requestInput.sourceUri" placeholder="登録済み素材の参照を指定" :disabled="requestCreationLocked" required /></label>
                <small>素材の新規取得・アップロードは未接続です。保存済み素材の参照を指定します。</small>
                <label>作る動画<select v-model="requestInput.productionType" :disabled="requestCreationLocked"><option value="clip">ショート動画</option><option value="digest">ダイジェスト</option></select></label>
                <label>どんな動画にしたい？<textarea v-model="requestInput.purpose" rows="4" placeholder="見せたい内容をひとことで" :disabled="requestCreationLocked" required /></label>
                <label>目標の長さ<input v-model="requestInput.durationLabel" :disabled="requestCreationLocked" required /></label>
                <details class="request-details"><summary>詳しい条件</summary>
                  <label>候補数<input v-model="requestInput.themeCountLabel" :disabled="requestCreationLocked" required /></label>
                  <label>実行モデル<input v-model="requestInput.geminiModelName" :disabled="requestCreationLocked" required /></label>
                  <label>制作設定<input v-model="requestInput.preset" :disabled="requestCreationLocked" required /></label>
                  <p>画面の選択だけでは、制作設定の内容を変更しません。</p>
                </details>
              </div>
              <aside class="start-summary">
                <h2>始める前の確認</h2>
                <dl><dt>素材</dt><dd>{{ requestInput.sourceUri || '未指定' }}</dd><dt>作る動画</dt><dd>{{ requestInput.purpose }}</dd><dt>目標の長さ</dt><dd>{{ requestInput.durationLabel }}</dd></dl>
                <p>下書きを保存した後、素材と送信・実行条件を確認します。保存だけではAI処理も動画作成も始めません。</p>
                <p v-if="requestInput.productionType === 'digest'" class="connection-notice">ダイジェストは内容確認から動画作成までの通常経路が未接続です。下書き保存まで利用できます。</p>
                <button type="submit" :disabled="requestCreationLocked || !requestInput.purpose.trim() || !requestInput.sourceUri.trim()">{{ submitting ? '保存中' : '下書きを見る' }}</button>
              </aside>
            </div>
          </form>
        </section>

        <section v-else-if="currentDraft?.status === 'draft'" class="review-panel">
          <h2>下書きを確認</h2><p>保存済みです。内容を確認してから開始します。</p>
          <dl class="draft-summary"><dt>依頼</dt><dd>{{ currentDraft.purpose }}</dd><dt>素材</dt><dd>{{ currentDraft.source.uri }}</dd><dt>作る動画</dt><dd>{{ currentDraft.productionType === 'digest' ? 'ダイジェスト' : 'ショート動画' }} / {{ currentDraft.settings.durationLabel }}</dd></dl>
          <details><summary>送信・実行の条件</summary><div class="runtime-summary"><div v-for="summary in runtimeSummaries" :key="summary.label" class="runtime-summary-item"><strong>{{ summary.label }} · {{ summary.title }}</strong><p>{{ summary.description }}</p></div></div><p>設定モデル：{{ currentDraft.settings.geminiModelName }}</p><p>元素材を保持し、動画作成前には別の確認を行います。</p></details>
          <ul v-if="startBlockers.length" class="connection-notice"><li v-for="reason in startBlockers" :key="reason">{{ reason }}</li></ul>
          <label class="confirmation-check"><input type="checkbox" :checked="!!confirmedDraftIdentity" :disabled="store.loading || !!startBlockers.length" @change="confirmDraftConditions" />この保存版の素材・内容・送信と実行の条件を確認しました</label>
          <div class="review-actions"><button type="button" class="secondary-button" :disabled="store.loading" @click="editSavedDraft">戻って修正</button><button type="button" :disabled="!canStartDraft" @click="approveSavedDraft">確認して開始</button></div>
        </section>

        <section v-else-if="activeReviewItem" class="review-panel">
          <div class="panel-corner" aria-hidden="true"></div>
          <div>
            <p class="eyebrow">{{ activeReviewItem.title }}</p>
            <h2>{{ activeReviewItem.humanQuestion }}</h2>
          </div>
          <p class="review-summary">{{ activeReviewItem.summary }}</p>

          <p v-if="activeReviewItem.kind === 'theme_selection'" class="adoption-note">{{ store.reviewMaterials?.recommendation?.candidateId === selectedReviewOptionId ? '保存済みの推奨案' : selectedReviewOptionId === activeReviewItem.options[0]?.id && !store.reviewMaterials?.recommendation ? '保存済みの先頭案（推奨の指定は未提供）' : '今回の採用案（次へ進むと保存）' }}</p>
          <p v-if="activeReviewItem.kind === 'theme_selection' && store.reviewMaterials?.recommendation">推薦の根拠：{{ store.reviewMaterials.recommendation.reason }}</p>
          <div v-if="displayedOptions.length" class="review-options">
            <article v-for="(option, optionIndex) in displayedOptions" :key="option.id" class="review-option">
              <span class="option-number">{{ optionIndex + 1 }}</span><span class="review-option-text"><strong>{{ option.title }}</strong><small>{{ option.summary }}</small></span>
            </article>
          </div>
          <div v-else-if="!store.reviewMaterials?.segments.length" class="incomplete-panel">
            <p class="eyebrow">作りかけ</p>
            <h3>この確認画面の詳細表示はまだ未接続です</h3>
            <p v-if="activeReviewItem.kind === 'render_readiness'">
              演出案ファイルは作成済みですが、この画面には動画断片、表示枠、テロップ、発話IDの一覧をまだ表示できていません。
            </p>
            <p v-else>
              この確認に必要な選択肢がありません。空白で埋めず、未完成の状態として表示しています。
            </p>
          </div>

          <section v-if="store.reviewMaterials?.segments.length" aria-label="登録済みの作成前資料">
            <h3>保存済みの構成と字幕</h3>
            <ol><li v-for="(segment,index) in store.reviewMaterials.segments" :key="index">
              <strong>{{ index + 1 }} · {{ (segment.startMs / 1000).toFixed(2) }}〜{{ (segment.endMs / 1000).toFixed(2) }}秒</strong>
              <p>{{ segment.caption }}</p><p>{{ segment.displaySummary }}</p><small>発話 {{ segment.speechIds.join('、') }}</small>
            </li></ol>
            <details><summary>保存資料との対応</summary><ul><li v-for="binding in store.reviewMaterials.bindings" :key="binding.fileRefId">{{ binding.fileRefId }} · {{ binding.sha256 }}</li></ul></details>
          </section>
          <div v-if="activeReviewItem.kind === 'theme_selection'" class="preview-placeholder"><strong>保存済みプレビューの有無は他の候補から確認できます</strong><p>推薦とプレビューの状態は登録情報がある場合だけ表示します。候補を見るだけでは動画を作りません。</p></div>
          <section v-if="store.reviewMaterials?.creationChecks" aria-label="作成前と完成後の確認">
            <p>作成前の入力検査：{{ store.reviewMaterials.creationChecks.inputValidation === 'verified' ? '登録資料との一致を確認' : '未完了' }}</p>
            <p>{{ creationCheckLabels(store.reviewMaterials.creationChecks).audio }}</p><p>{{ creationCheckLabels(store.reviewMaterials.creationChecks).source }}</p><p>{{ creationCheckLabels(store.reviewMaterials.creationChecks).completion }}</p>
          </section>
          <ul v-if="activeReviewBlockers.length" class="connection-notice"><li v-for="reason in activeReviewBlockers" :key="reason">{{ reason }}</li></ul>
          <div class="review-actions">
            <button type="button" class="secondary-button" :disabled="store.loading" @click="store.refreshUiReviewMaterials(currentDraft!.id)">資料を再読み込み</button>
            <button v-if="savedCandidateReview?.options.length" type="button" class="secondary-button" @click="openCandidates">他の候補を見る</button>
            <button
              type="button"
              :disabled="agentOperationLocked || !!activeReviewBlockers.length || (isContentSelectionReview(activeReviewItem) && !selectedReviewOptionId)"
              @click="submitActiveReview('approve')"
            >
              {{ activeReviewAction === 'approve' ? '処理中' : approveReviewLabel(activeReviewItem) }}
            </button>
            <button
              v-if="isContentSelectionReview(activeReviewItem)"
              type="button"
              class="secondary-button"
              :disabled="agentOperationLocked"
              @click="submitActiveReview('request_changes', 'theme_options_regenerate')"
            >
              {{ activeReviewAction === 'request_changes:theme_options_regenerate' ? '処理中' : 'テーマを作り直す' }}
            </button>
            <button
              v-if="isMaterialConfirmationReview(activeReviewItem)"
              type="button"
              class="secondary-button"
              :disabled="agentOperationLocked"
              @click="submitActiveReview('request_changes', 'material_reselect')"
            >
              {{ activeReviewAction === 'request_changes:material_reselect' ? '処理中' : '切り口と編集元場面を探し直す' }}
            </button>
            <button
              v-if="isMaterialConfirmationReview(activeReviewItem)"
              type="button"
              class="secondary-button"
              :disabled="agentOperationLocked"
              @click="submitActiveReview('request_changes', 'theme_reselect')"
            >
              {{ activeReviewAction === 'request_changes:theme_reselect' ? '処理中' : 'テーマを選び直す' }}
            </button>
            <button
              v-if="activeReviewItem.kind === 'render_readiness'"
              type="button"
              class="secondary-button"
              :disabled="agentOperationLocked"
              @click="submitActiveReview('request_changes', 'edit_plan')"
            >
              {{ activeReviewAction === 'request_changes:edit_plan' ? '処理中' : '演出作成前から作り直す' }}
            </button>
            <button
              v-if="activeReviewItem.kind === 'render_readiness'"
              type="button"
              class="secondary-button"
              :disabled="agentOperationLocked"
              @click="submitActiveReview('request_changes', 'theme_reselect')"
            >
              {{ activeReviewAction === 'request_changes:theme_reselect' ? '処理中' : 'テーマを選び直す' }}
            </button>
          </div>
        </section>

        <section v-else-if="currentDraft?.productionType === 'digest' && !outputVideoUri && store.reviewMaterials?.digestPreparation" class="review-panel" aria-label="Digest作成前の保存資料">
          <p class="eyebrow">保存済みの準備情報</p><h2>作成前の資料を確認</h2>
          <p>{{ store.reviewMaterials.digestPreparation.message }}</p>
          <section v-if="store.reviewMaterials.segments.length"><h3>保存済みの構成と本文</h3>
            <ol><li v-for="(segment,index) in store.reviewMaterials.segments" :key="index"><strong>{{ index + 1 }} · {{ (segment.startMs / 1000).toFixed(2) }}〜{{ (segment.endMs / 1000).toFixed(2) }}秒</strong><p>{{ segment.caption }}</p><p>{{ segment.displaySummary }}</p></li></ol>
          </section>
          <p>作成前の入力検査：{{ store.reviewMaterials.creationChecks?.inputValidation === 'verified' ? '現在の登録資料との一致を確認' : '未完了' }}</p>
          <p>{{ creationCheckLabels(store.reviewMaterials.creationChecks).audio }}</p><p>{{ creationCheckLabels(store.reviewMaterials.creationChecks).source }}</p><p>{{ creationCheckLabels(store.reviewMaterials.creationChecks).completion }}</p>
          <ul class="connection-notice"><li v-for="reason in store.reviewMaterials.blockers" :key="reason">{{ reason }}</li></ul>
          <div class="review-actions"><button type="button" class="secondary-button" :disabled="store.loading" @click="store.refreshUiReviewMaterials(currentDraft!.id)">資料を再読み込み</button><button v-if="candidateOptions.length" type="button" class="secondary-button" @click="openCandidates">他の候補を見る</button></div>
        </section>

        <section v-else-if="outputVideoUri" class="video-panel">
          <div class="panel-corner" aria-hidden="true"></div>
          <div>
            <p class="eyebrow">{{ displayedVersion }}</p>
            <h2>動画ができました</h2>
          </div>

          <div class="video-review-layout">
            <div class="video-preview">
              <video :key="outputVideoFileRef?.id" controls playsinline preload="metadata" :src="outputVideoUri" @error="outputMediaError = '保存済み動画を読み込めません。参照と配信状態の確認が必要です'" />
              <p v-if="outputMediaError" class="error-message">{{ outputMediaError }}</p>
              <a class="download-link" :href="outputVideoUri" download>動画を保存</a>
              <p class="video-reference">{{ outputVideoReferenceText }}</p>
            </div>

            <div class="output-change-panel"><label>直したいところ<textarea v-model="outputChangeReason" rows="4" placeholder="直したい内容を入力" :disabled="!canRedoVideo" /></label><label>作り直す範囲<select v-model="outputChangeScope" :disabled="!canRedoVideo"><option value="edit_plan">演出から作り直す（場面と順番を保持）</option><option value="theme_selection">内容の選択から見直す</option></select></label><button type="button" class="secondary-button" :disabled="!canRedoVideo || !outputChangeReason.trim()" @click="showOutputChanges(outputChangeScope)">作り直す範囲を確認</button><p>修正は新しい編集コピーへ保存し、元の動画は保持します。</p></div>
            <details class="optional-review"><summary>追加の演出レビュー</summary><section class="web-gemini-review" aria-label="Web Gemini演出レビュー">
              <div class="web-gemini-header">
                <div>
                  <p class="eyebrow">Web Gemini Review</p>
                  <h3>演出レビュー</h3>
                </div>
                <div class="web-gemini-header-actions">
                  <button
                    type="button"
                    class="secondary-button"
                    :disabled="agentOperationLocked || hasFinalCompleteForCurrentOutput || webGeminiReviewLoading || activeWebGeminiAction === 'prepare_review'"
                    @click="prepareCurrentWebGeminiReview"
                  >
                    {{ webGeminiPrepareButtonLabel }}
                  </button>
                  <button
                    type="button"
                    class="secondary-button"
                    :disabled="webGeminiReviewLoading || activeWebGeminiAction === 'refresh_review'"
                    @click="reloadWebGeminiReview"
                  >
                    {{ activeWebGeminiAction === 'refresh_review' ? '確認中' : '再読み込み' }}
                  </button>
                  <button
                    v-if="webGeminiReview"
                    type="button"
                    class="secondary-button"
                    :disabled="!canApplyWebGeminiReview"
                    @click="applyWebGeminiReviewChanges"
                  >
                    {{ webGeminiApplyButtonLabel }}
                  </button>
                </div>
              </div>

              <div v-if="webGeminiReviewLoading" class="empty-review-state">
                <strong>レビュー確認中</strong>
                <span>保存済みレビューを読んでいます</span>
              </div>

              <div v-else-if="webGeminiReview" class="web-gemini-result">
                <div class="web-gemini-status-card">
                  <strong>{{ webGeminiSavedReviewTitle }}</strong>
                  <span>{{ webGeminiSavedReviewDetail }}</span>
                  <small>{{ webGeminiSavedReviewMeta }}</small>
                </div>

                <details class="web-gemini-review-detail">
                  <summary>Geminiレビューを表示</summary>
                  <textarea
                    readonly
                    rows="4"
                    :value="webGeminiReview.reviewText"
                    aria-label="Geminiレビュー"
                  />
                </details>

                <label>
                  今回の再生成方針
                  <textarea
                    v-model="webGeminiRevisionBriefInput"
                    rows="4"
                    placeholder="Geminiレビューを読んで、今回採用する変更だけ残す"
                    :disabled="agentOperationLocked"
                  />
                </label>

              </div>

              <div v-else class="empty-review-state">
                <strong>{{ webGeminiRunStatusTitle }}</strong>
                <span>{{ webGeminiRunStatusDetail }}</span>
                <ul v-if="webGeminiBlockedReasons.length" class="review-reason-list">
                  <li
                    v-for="reason in webGeminiBlockedReasons"
                    :key="reason"
                  >
                    {{ reason }}
                  </li>
                </ul>
                <ul v-if="webGeminiExecutionNotes.length" class="web-gemini-execution-notes">
                  <li
                    v-for="note in webGeminiExecutionNotes"
                    :key="note"
                  >
                    {{ note }}
                  </li>
                </ul>
                <div v-if="canInspectWebGeminiPrompt" class="web-gemini-prompt">
                  <button
                    type="button"
                    class="inline-text-button"
                    @click="webGeminiPromptOpen = !webGeminiPromptOpen"
                  >
                    {{ webGeminiPromptOpen ? '依頼文を閉じる' : 'Geminiへ渡す依頼文を確認' }}
                  </button>
                  <pre v-if="webGeminiPromptOpen">{{ webGeminiPreparedPromptText }}</pre>
                </div>
              </div>
            </section></details>
          </div>

          <section class="final-review-panel" aria-label="完成動画のユーザー判断">
            <div>
              <p class="eyebrow">User Gate</p>
              <h3>{{ finalReviewStatusTitle }}</h3>
              <p>{{ finalReviewStatusDetail }}</p>
            </div>
            <div class="final-review-actions">
              <button
                type="button"
                :disabled="agentOperationLocked || hasPublishReadyForCurrentOutput || hasFinalCompleteForCurrentOutput || activeFinalReviewAction !== ''"
                @click="submitOutputFinalReview('publish_ready')"
              >
                {{ activeFinalReviewAction === 'publish_ready' ? '保存中' : '投稿候補として保存' }}
              </button>
              <button
                type="button"
                :disabled="agentOperationLocked || hasFinalCompleteForCurrentOutput || activeFinalReviewAction !== ''"
                @click="submitOutputFinalReview('final_complete')"
              >
                {{ activeFinalReviewAction === 'final_complete' ? '記録中' : 'この動画で作業完了' }}
              </button>
            </div>
          </section>

          <div class="redo-actions">
            <button
              type="button"
              class="secondary-button"
              :disabled="!canRedoVideo"
              @click="showOutputChanges('theme_selection')"
            >
              {{ activeRedoScope === 'theme_selection' ? '作り直し中' : 'テーマ選択前から作り直す' }}
            </button>
            <button
              type="button"
              class="secondary-button"
              :disabled="!canRedoVideo"
              @click="showOutputChanges('edit_plan')"
            >
              {{ activeRedoScope === 'edit_plan' ? '作り直し中' : '演出作成前から作り直す' }}
            </button>
          </div>
        </section>

        <section v-else class="work-wait-panel">
          <div class="panel-corner" aria-hidden="true"></div>

          <div>
            <p class="eyebrow">{{ runningRequest ? '実行中' : '現在の状態' }}</p>
            <h2>{{ statusText }}</h2>
          </div>
          <p>
            {{ statusDetailText }}
          </p>
          <p v-if="operationLockNotice" class="lock-message">{{ operationLockNotice }}</p>
          <ul v-if="executionNotices.length" class="connection-notice"><li v-for="reason in executionNotices" :key="reason">{{ reason }}</li></ul>
          <button v-if="failedRequest" type="button" :disabled="store.loading" @click="store.retryAgentRequest(failedRequest.id)">失敗した工程を再試行</button>
          <p v-if="cancelledRequest">中止した保存版は保持しています。新しい依頼を作るか、履歴を確認できます。</p>
        </section>
      </section>

      <details class="side-hud" aria-label="実行情報"><summary>制作情報と保存記録</summary>
        <section class="hud-card">
          <p class="eyebrow">保存版の情報</p>
          <dl>
            <div><dt>依頼ID</dt><dd>{{ currentDraft?.id || '未保存' }}</dd></div>
            <div><dt>保存版</dt><dd>{{ displayedVersion }}</dd></div>
            <div>
              <dt>素材</dt>
              <dd>{{ sessionSourceText }}</dd>
            </div>
            <div>
              <dt>設定モデル</dt>
              <dd>{{ sessionModelText }}</dd>
            </div>
            <div>
              <dt>工程</dt>
              <dd>{{ sessionStageText }}</dd>
            </div>
          </dl>
        </section>

        <section class="hud-card artifact-hud-card" aria-label="成果物参照">
          <details class="artifact-details">
            <summary>
              <span class="eyebrow">成果物参照</span>
              <span>{{ artifactReferenceItems.length }}件</span>
            </summary>
            <ol v-if="artifactReferenceItems.length" class="artifact-reference-list">
              <li
                v-for="item in artifactReferenceItems"
                :key="item.id"
              >
                <span class="artifact-step">{{ item.stepCode }}</span>
                <span>
                  <strong>{{ item.stepName }}</strong>
                  <small>{{ item.kindText }} / {{ item.statusText }} / {{ item.createdAtText }}</small>
                  <em>{{ item.meaning }}</em>
                  <code>{{ item.uri }}</code>
                </span>
              </li>
            </ol>
            <p v-else class="artifact-empty">AI工程が成果物参照を保存するとここに表示します</p>
          </details>
        </section>

        <section class="hud-card">
          <div class="hud-card-title-row">
            <p class="eyebrow">作業ログ</p>
            <button
              type="button"
              class="inline-text-button"
              :disabled="showRequestPage || !currentDraft"
              @click="openActivityDialog"
            >
              全履歴
            </button>
          </div>
          <ol class="system-log">
            <li
              v-for="item in systemLogItems"
              :key="item.id"
              :class="item.className"
            >
              <time>{{ item.timeText }}</time>
              <span>
                <strong>{{ item.title }}</strong>
                <small v-if="item.detail">{{ item.detail }}</small>
              </span>
            </li>
          </ol>
        </section>

        <section class="hud-card hint-card">
          <p class="eyebrow">Hint</p>
          <p>{{ hudHintText }}</p>
        </section>
      </details>
    </div>

    <div v-if="humanAuthReady && candidatesOpen" class="dialog-overlay" @click.self="closeCandidates">
      <section class="change-dialog candidate-dialog" role="dialog" aria-modal="true" aria-labelledby="candidate-title" tabindex="-1">
        <div class="dialog-heading"><h2 id="candidate-title">保存済みのシーン候補</h2><button type="button" class="secondary-button" @click="closeCandidates">閉じる ×</button></div>
        <p>保存済みの題名・短い要約・発話区間を表示。閲覧では追加のAI処理も動画作成も行いません。</p><p>保存済みの発話区間と、登録情報のある推薦・プレビュー状態を表示します。情報がない場合は不明です。</p>
        <div class="candidate-columns"><div class="candidate-list"><button v-for="option in candidateOptions" :key="option.id" type="button" class="candidate-row secondary-button" :class="{ selected: browsingOptionId === option.id }" :aria-pressed="browsingOptionId === option.id" @click="browsingOptionId = option.id"><strong>{{ option.title }}</strong><small>{{ option.summary }}</small><span>{{ previewStatusLabel(store.reviewMaterials?.candidates.find(c => c.id === option.id)) }}</span></button></div>
          <div v-if="browsingOption"><h3>閲覧中 {{ browsingOption.title }}</h3><p>まだ採用案は変わっていません。</p><section v-if="browsingSavedCandidate"><p v-for="speech in browsingSavedCandidate.speeches" :key="speech.id">{{ (speech.startMs / 1000).toFixed(2) }}〜{{ (speech.endMs / 1000).toFixed(2) }}秒 · {{ speech.text }}</p><video v-if="browsingSavedCandidate.preview" :key="browsingSavedCandidate.preview.id" controls preload="none" :src="uriWithRef(browsingSavedCandidate.preview.uri, browsingSavedCandidate.preview.id)" /><p>{{ previewStatusLabel(browsingSavedCandidate) }}</p><p v-if="browsingSavedCandidate.previewStatus?.requestId">登録作業：{{ browsingSavedCandidate.previewStatus.requestId }}</p></section><p v-else>登録資料を照合できていません。</p><p v-if="!canAdoptCandidate">この段階では閲覧のみです。採用変更は内容選択の確認に戻って行います。</p><button type="button" :disabled="!canAdoptCandidate" @click="adoptCandidate">採用案に反映する</button><small>内容確認で次へ進むと、この選択を保存します。</small></div>
        </div>
      </section>
    </div>
    <div v-if="humanAuthReady && outputChangeOpen" class="dialog-overlay" @click.self="outputChangeOpen = false">
      <section class="change-dialog" role="dialog" aria-modal="true" aria-labelledby="output-change-title"><h2 id="output-change-title">作り直す範囲を確認</h2><p>{{ outputChangeScope === 'edit_plan' ? '場面と順番を保持し、演出から新しい編集コピーを作ります。' : '保存済みの候補から内容を選び直します。その後、場面と演出の確認へ戻ります。' }}</p><p>{{ outputChangeReason }}</p><p>元の保存版は保持します。動画作成前の確認をもう一度行います。</p><div class="dialog-actions"><button type="button" class="secondary-button" @click="outputChangeOpen = false">取消</button><button type="button" :disabled="!canRedoVideo" @click="confirmOutputChanges">確認して作り直す</button></div></section>
    </div>
    <div
      v-if="humanAuthReady && !showRequestPage && pendingReviewChange && pendingReviewItem"
      class="dialog-overlay"
      role="dialog"
      aria-modal="true"
    >
      <form class="change-dialog" @submit.prevent="confirmReviewChange">
        <div class="panel-corner" aria-hidden="true"></div>
        <div>
          <p class="eyebrow">作り直し</p>
          <h2>{{ reviewChangeDialogTitle(pendingReviewItem, pendingReviewChange.scope) }}</h2>
        </div>
        <label>
          {{ reviewChangePromptMessage(pendingReviewItem, pendingReviewChange.scope) }}
          <textarea
            v-model="changeReasonInput"
            rows="4"
            placeholder="必要な場合だけ入力"
            :disabled="agentOperationLocked"
          />
        </label>
        <div class="dialog-actions">
          <button type="button" class="secondary-button" :disabled="agentOperationLocked" @click="closeReviewChangeDialog">
            キャンセル
          </button>
          <button type="submit" :disabled="agentOperationLocked">
            {{ activeReviewAction.startsWith('request_changes') ? '処理中' : '作り直す' }}
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="humanAuthReady && !showRequestPage && activityDialogOpen"
      class="dialog-overlay"
      role="dialog"
      aria-modal="true"
    >
      <section class="change-dialog activity-dialog" aria-label="作業履歴">
        <div class="panel-corner" aria-hidden="true"></div>
        <div>
          <p class="eyebrow">作業履歴</p>
          <h2>{{ activityDialogTitle }}</h2>
        </div>
        <div v-if="requestActivitySummary" class="activity-current-state">
          <span>現在</span>
          <strong>{{ activitySummaryTitle }}</strong>
          <small>{{ activitySummaryDetail }}</small>
          <em>{{ activitySummaryNextAction }}</em>
        </div>
        <div class="activity-filter" aria-label="作業履歴の絞り込み">
          <button
            v-for="option in activityFilterOptions"
            :key="option.value"
            type="button"
            :class="['filter-button', { active: activityFilter === option.value }]"
            @click="setActivityFilter(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <label class="activity-search">
          履歴検索
          <input
            v-model="activitySearchInput"
            type="search"
            placeholder="工程名、理由、成果物参照など"
          />
        </label>
        <ol class="system-log activity-dialog-log">
          <li
            v-for="item in visibleFullActivityLogItems"
            :key="item.id"
            :class="item.className"
          >
            <time>{{ item.timeText }}</time>
            <span>
              <span class="activity-entry-head">
                <strong>{{ item.title }}</strong>
                <em v-if="item.actorText">{{ item.actorText }}</em>
              </span>
              <small v-if="item.detail">{{ item.detail }}</small>
            </span>
          </li>
        </ol>
        <div class="dialog-actions">
          <button type="button" class="secondary-button" @click="closeActivityDialog">
            閉じる
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
:global(html), :global(body), :global(#app) { min-height: 100%; margin: 0; background: #f4f7f6; color-scheme: light; }
.app-shell { --yellow: #176b62; --cyan: #176b62; --red: #ad3d35; --text: #202c2a; --text-dim: #596b68; --line: #cfddda; color: var(--text); font-family: system-ui, -apple-system, sans-serif; max-width: 1260px; margin: auto; padding: 28px; }
button, input, textarea, select { font: inherit; }
button, .download-link { border: 1px solid #176b62; border-radius: 8px; padding: 12px 20px; background: #176b62; color: white; font-weight: 650; cursor: pointer; text-decoration: none; }
button:hover:not(:disabled), .download-link:hover { background: #12574f; }
button:disabled { opacity: .48; cursor: not-allowed; }
button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid #e2b23c; outline-offset: 3px; }
.secondary-button, .inline-text-button { background: white; border-color: #c6d6d2; color: #25443e; }
.secondary-button:hover:not(:disabled), .inline-text-button:hover:not(:disabled) { background: #eaf3f0; }
.danger-button { background: white; color: #a3372f; border-color: #d5b8b4; }
.sys-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 20px; padding: 20px 24px; background: #f0f6f4; border: 1px solid var(--line); border-radius: 12px 12px 0 0; }
.sys-brand { display: flex; gap: 24px; align-items: center; flex: 1; min-width: 200px; }
.sys-brand strong { font-size: 27px; color: #176b62; }
.sys-brand span { font-weight: 600; max-width: 310px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.version-pill { color: #176b62; background: #e2eeea; padding: 8px 12px; border-radius: 20px; font-size: 13px; }
.sys-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.sys-actions button { font-size: 13px; padding: 9px 12px; }
.agent-status-bar { background: white; border: 1px solid var(--line); border-top: 0; padding: 22px 24px; }
.status-main { display: flex; align-items: center; flex-wrap: wrap; gap: 18px; }
.status-main h2 { font-size: 19px; margin: 0; }
.status-message { color: #596b68; flex: 1; }
.eyebrow { color: #596b68; font-size: 12px; margin: 0 0 8px; }
.guide-steps { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; list-style: none; padding: 0; margin: 20px 0 0; }
.guide-steps li { background: #f1f4f3; padding: 14px 10px; border: 1px solid transparent; border-radius: 7px; color: #62736e; font-size: 14px; }
.guide-steps .active { background: #e4efea; border-color: #b7d3c6; color: #176b62; font-weight: 700; }
.guide-steps .passed span { color: #176b62; }
.workspace-grid { background: white; border: 1px solid var(--line); border-top: 0; border-radius: 0 0 12px 12px; padding: 28px; }
.stage, .request-page, .review-panel, .video-panel, .work-wait-panel { min-width: 0; }
h1 { font-size: 27px; } h2 { font-size: 24px; } h3 { font-size: 18px; }
h1, h2, h3 { margin: 0 0 16px; line-height: 1.5; }
p, li, dd { line-height: 1.65; } p { margin: 10px 0; }
label { display: grid; gap: 9px; font-weight: 600; }
input:not([type=checkbox]):not([type=radio]), textarea, select { width: 100%; min-width: 0; padding: 12px 14px; border: 1px solid #c6d6d2; border-radius: 7px; background: white; color: #202c2a; }
textarea { resize: vertical; line-height: 1.7; }
small { color: #596b68; line-height: 1.6; font-weight: 400; }
.request-header { margin-bottom: 24px; }
.request-columns { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; }
.request-fields { display: grid; gap: 18px; }
.start-summary { display: flex; flex-direction: column; gap: 12px; border: 1px solid #d0e0d8; border-radius: 9px; padding: 24px; background: #f2f7f4; }
.start-summary button { margin-top: auto; }
dt { color: #62736e; font-weight: 600; margin: 12px 0 6px; }
dd { margin: 0; overflow-wrap: anywhere; }
summary { cursor: pointer; color: #35584e; padding: 10px 0; }
.request-details label { margin: 16px 0; }
.runtime-summary { display: grid; gap: 14px; margin: 16px 0; }
.runtime-summary-item { padding: 14px; background: #f5f8f7; border-radius: 7px; }
.draft-summary { padding: 20px; background: #f3f7f5; border-radius: 8px; }
.confirmation-check { display: flex; align-items: center; gap: 12px; margin: 20px 0; line-height: 1.6; }
.confirmation-check input { width: 20px; height: 20px; flex: 0 0 auto; }
.connection-notice { padding: 16px 22px; border: 1px solid #e2d3b0; border-radius: 8px; background: #fffbf1; color: #745924; }
.review-summary { color: #596b68; }
.adoption-note { color: #176b62; font-weight: 650; }
.review-options { display: grid; gap: 14px; margin: 20px 0; }
.review-option { display: flex; gap: 18px; align-items: flex-start; padding: 22px; border: 1px solid #cee0d6; background: #f4f8f5; border-radius: 8px; }
.option-number { background: #e0eee5; color: #176b62; padding: 7px 13px; border-radius: 25px; }
.review-option-text { display: grid; gap: 8px; }
.review-option-text small, .candidate-row small { white-space: pre-line; }
.preview-placeholder { padding: 28px; border: 1px solid #d7e0e3; border-radius: 9px; background: #f0f4f5; color: #657278; margin: 18px 0; }
.preview-placeholder strong { font-size: 20px; }
.review-actions, .dialog-actions, .final-review-actions, .redo-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.review-actions { justify-content: flex-end; }
.incomplete-panel, .empty-review-state { display: grid; gap: 10px; padding: 20px; background: #f3f6f5; border-radius: 8px; }
.video-review-layout { display: grid; grid-template-columns: 1.35fr 1fr; gap: 26px; }
.video-preview video { width: 100%; max-height: 490px; background: #131c1a; border-radius: 9px; }
.video-reference { font-size: 12px; overflow-wrap: anywhere; color: #62736e; }
.download-link { display: inline-block; margin: 8px 0; }
.output-change-panel { display: grid; align-content: start; gap: 18px; }
.optional-review { grid-column: 1 / -1; }
.web-gemini-review { padding: 20px; border: 1px solid var(--line); border-radius: 8px; }
.web-gemini-header-actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
.web-gemini-result, .web-gemini-status-card { display: grid; gap: 14px; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
.final-review-panel { border-top: 1px solid var(--line); padding-top: 24px; margin-top: 28px; }
.side-hud { margin-top: 24px; border-top: 1px solid var(--line); padding-top: 10px; }
.hud-card { padding: 18px 0; border-bottom: 1px solid var(--line); }
.hud-card dl { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 0; }
.hud-card-title-row { display: flex; justify-content: space-between; }
.artifact-reference-list, .system-log, .activity-log { display: grid; gap: 16px; list-style: none; padding: 0; }
.artifact-reference-list li, .system-log li, .activity-log li { display: flex; gap: 12px; }
.artifact-reference-list span, .system-log span, .activity-log span { display: grid; gap: 5px; }
code { overflow-wrap: anywhere; color: #596b68; font-size: 12px; }
.artifact-step, time { color: #596b68; font-size: 12px; }
.error-message { color: #aa302c; white-space: pre-wrap; }
.lock-message { color: #745924; }
.dialog-overlay { position: fixed; z-index: 20; inset: 0; background: #163a3266; display: grid; align-items: center; justify-items: center; padding: 24px; }
.change-dialog { width: min(700px, 100%); max-height: 88vh; overflow: auto; background: white; border: 1px solid #c6d6d2; border-radius: 12px; padding: 28px; box-shadow: 0 20px 70px #163a3230; }
.candidate-dialog { width: min(1040px, 100%); }
.dialog-heading { display: flex; gap: 24px; justify-content: space-between; align-items: start; }
.candidate-columns { display: grid; grid-template-columns: 1fr 1.2fr; gap: 32px; margin-top: 24px; }
.candidate-list { display: grid; gap: 16px; align-content: start; }
.candidate-row { display: grid; gap: 12px; text-align: left; padding: 20px; }
.candidate-row.selected { background: #e8f3ed; border-color: #82b49b; }
.candidate-row span { font-size: 12px; border-radius: 20px; padding: 5px 12px; background: #e4ebe8; width: fit-content; }
.candidate-columns > div:last-child { border-left: 1px solid var(--line); padding-left: 28px; }
.candidate-columns small { display: block; margin-top: 12px; }
.activity-search { margin: 20px 0; }
.activity-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.auth-panel { margin: 40px auto; max-width: 560px; padding: 28px; background: white; border: 1px solid var(--line); border-radius: 9px; }
.auth-form { display: grid; gap: 20px; }
@media (max-width: 850px) {
 .app-shell { padding: 12px; } .sys-bar { gap: 12px; padding: 18px; } .workspace-grid { padding: 20px; }
 .guide-steps { grid-template-columns: repeat(3, 1fr); }
 .request-columns, .video-review-layout, .candidate-columns { grid-template-columns: 1fr; }
 .candidate-columns > div:last-child { padding: 20px 0 0; border-left: 0; border-top: 1px solid var(--line); }
 .change-dialog { padding: 20px; } .sys-brand { width: 100%; } .hud-card dl { grid-template-columns: 1fr; }
}
</style>
