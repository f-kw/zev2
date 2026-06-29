<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
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
  createPublishPackage,
  fetchPublishPackage,
  fetchRequestDraftActivity,
  fetchHumanAuthStatus,
  fetchWebGeminiReview,
  formatApiError,
  loginHumanUi,
  logoutHumanUi,
  prepareWebGeminiReview,
  type PublishPackageArtifact,
  type RequestDraftActivityEvent,
  type RequestDraftActivitySummary,
  type WebGeminiReviewArtifact,
  type WebGeminiReviewRunLog
} from './api';
import { useControlQueueStore } from './stores/controlQueue';

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
const activePage = ref<AppPage>('workspace');
const requestDefaultsApplied = ref(false);
const pendingReviewChange = ref<{ reviewId: string; scope?: ReviewChangeScope } | null>(null);
const changeReasonInput = ref('');
const webGeminiReview = ref<WebGeminiReviewArtifact | null>(null);
const webGeminiRunLog = ref<WebGeminiReviewRunLog | null>(null);
const webGeminiPreparedPromptText = ref('');
const webGeminiPromptOpen = ref(false);
const webGeminiInstructionInput = ref('');
const webGeminiReviewMessage = ref('');
const webGeminiReviewLoading = ref(false);
const loadedWebGeminiReviewCreatedAt = ref('');
const activeWebGeminiAction = ref<'refresh_review' | 'prepare_review' | 'apply_review' | ''>('');
const activeFinalReviewAction = ref<FinalReviewActionType | ''>('');
const publishPackage = ref<PublishPackageArtifact | null>(null);
const publishPackageLoading = ref(false);
const publishPackageMessage = ref('');
const activePublishPackageAction = ref<'create_package' | ''>('');
const publishTitleInput = ref('');
const publishDescriptionInput = ref('');
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
  [...visibleRequests.value].reverse().find((request) => request.status === 'cancelled')
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

const outputVideoFileRef = computed(() => {
  const fileRefId = renderRequest.value?.result?.fileRefId;
  if (!fileRefId) {
    return undefined;
  }

  return findById(store.state.fileRefs, fileRefId);
});

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
    .filter((action) => action.requestDraftId === draft.id && action.outputVideoUri === fileRef.uri)
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
    return '最終完了として記録済み';
  }

  if (hasPublishReadyForCurrentOutput.value) {
    return '投稿可能として記録済み';
  }

  return '人間の最終判断は未記録';
});

const finalReviewStatusDetail = computed(() => {
  if (currentFinalReviewAction.value) {
    return currentFinalReviewAction.value.reason;
  }

  return '動画を確認した後、投稿可能または最終完了として記録できます';
});

const canCreatePublishPackage = computed(() =>
  Boolean(
    currentDraft.value &&
      outputVideoUri.value &&
      (hasPublishReadyForCurrentOutput.value || hasFinalCompleteForCurrentOutput.value) &&
      !agentOperationLocked.value &&
      !publishPackageLoading.value &&
      !activePublishPackageAction.value
  )
);

const publishPackageStatusTitle = computed(() => {
  if (publishPackage.value) {
    return '公開用ファイル作成済み';
  }

  if (hasPublishReadyForCurrentOutput.value || hasFinalCompleteForCurrentOutput.value) {
    return '公開用ファイルは未作成';
  }

  return '公開用ファイルは最終判断後に作成';
});

const publishPackageStatusDetail = computed(() => {
  if (publishPackageMessage.value) {
    return publishPackageMessage.value;
  }

  if (publishPackage.value) {
    return '公開用動画、説明メモ、manifestを確認できます';
  }

  if (hasPublishReadyForCurrentOutput.value || hasFinalCompleteForCurrentOutput.value) {
    return '投稿作業へ渡すファイル一式を作成できます';
  }

  return '先に投稿可能または最終完了として記録してください';
});

const defaultPublishTitle = computed(() =>
  currentDraft.value?.purpose.trim() || 'ショート動画'
);

const defaultPublishDescription = computed(() => {
  const outputUri = outputVideoFileRef.value?.uri || outputVideoUri.value;
  return [
    `作成目的: ${defaultPublishTitle.value}`,
    `確認済み動画: ${outputUri}`,
    '必要なら公開前に説明文を人間が調整してください。'
  ].join('\n');
});

const canApplyWebGeminiReview = computed(() =>
  Boolean(
    currentDraft.value &&
      outputVideoUri.value &&
      webGeminiReview.value &&
      webGeminiInstructionInput.value.trim() &&
      webGeminiRunLog.value?.status !== 'applied' &&
      !hasFinalCompleteForCurrentOutput.value &&
      !agentOperationLocked.value &&
      activeWebGeminiAction.value !== 'apply_review'
  )
);

const webGeminiPrepareButtonLabel = computed(() => {
  if (activeWebGeminiAction.value === 'prepare_review') {
    return '準備中';
  }

  return webGeminiReview.value ? 'レビューを取り直す' : 'レビュー準備を更新';
});

const webGeminiApplyButtonLabel = computed(() => {
  if (webGeminiRunLog.value?.status === 'applied') {
    return '反映済み';
  }

  return activeWebGeminiAction.value === 'apply_review' ? '再作成中' : '演出から再作成';
});

const webGeminiRunStatusTitle = computed(() => {
  const runLog = webGeminiRunLog.value;
  if (!runLog) {
    return webGeminiReviewMessage.value || 'レビュー未取得';
  }

  if (runLog.status === 'blocked') {
    return 'レビュー実行前に停止';
  }

  if (runLog.status === 'prepared') {
    return 'レビュー準備済み';
  }

  if (runLog.status === 'running') {
    return 'レビュー実行中';
  }

  if (runLog.status === 'failed') {
    return 'レビュー実行失敗';
  }

  if (runLog.status === 'applied') {
    return 'レビュー反映済み';
  }

  return webGeminiReview.value ? 'レビュー保存済み' : 'レビュー保存確認が必要';
});

const webGeminiRunStatusDetail = computed(() => {
  const runLog = webGeminiRunLog.value;
  if (runLog?.nextAction) {
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
    notes.push('外部送信はまだ実行していません');
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

  if (runLog.externalReviewCommand) {
    notes.push(`外部レビュー実行手順: ${runLog.externalReviewCommand}`);
  }

  return notes;
});

const canInspectWebGeminiPrompt = computed(() =>
  Boolean(!webGeminiReview.value && webGeminiPreparedPromptText.value.trim())
);

const webGeminiSavedReviewTitle = computed(() =>
  webGeminiReview.value && webGeminiRunLog.value?.status === 'applied' ? 'レビュー反映済み' : webGeminiReview.value ? 'レビュー保存済み' : ''
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

  return '改善指示を確認して、必要なら演出作成前から作り直せます。';
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
  Boolean(waitingAgentRequest.value && !runningRequest.value && !store.loading)
);

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
    return `${cancelledRequest.value.label}で中止`;
  }

  if (outputVideoUri.value) {
    return '動画生成完了';
  }

  if (currentDraft.value) {
    return '作成開始前';
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
    return cancelledRequest.value.errorMessage ?? '人間がAI作業を中止しました';
  }

  if (outputVideoUri.value) {
    return '確認用動画を再生できます';
  }

  if (currentDraft.value) {
    return '次の操作を選べます';
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

const hudStatusDetailText = computed(() =>
  showRequestPage.value ? '作りたいショートを入力して、動画作成を開始できます' : activitySummaryDetail.value
);

const hudVisibleStatusMessage = computed(() =>
  store.errorMessage ? '' : hudStatusDetailText.value
);

const hudHintText = computed(() =>
  showRequestPage.value ? '作りたい動画を入力して開始します' : activitySummaryNextAction.value
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
  store.runtimeConfig?.source.defaultUri ?? currentDraft.value?.source.uri ?? '未設定'
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
    output_video: '完成動画'
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
  requestInput.sourceUri = runtimeConfig.source.defaultUri;
  try {
    await store.createRequestDraft({ ...requestInput });
    activePage.value = 'workspace';
  } finally {
    submitting.value = false;
  }
}

function openRequestPage() {
  activePage.value = 'request';
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
    return 'このテーマで切り口を作る';
  }

  if (isMaterialConfirmationReview(review)) {
    return 'この切り口で演出へ進む';
  }

  return '確認用動画を作る';
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
  if (agentOperationLocked.value) {
    return;
  }

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
  if (!pending || !review || agentOperationLocked.value) {
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

async function redoVideo(scope: RedoScope) {
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
    await store.requestGeneratedVideoChanges(draft.id, reasonByScope[scope], scope);
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
    webGeminiRunLog.value = null;
    webGeminiPreparedPromptText.value = '';
    webGeminiPromptOpen.value = false;
    webGeminiInstructionInput.value = '';
    webGeminiReviewMessage.value = '';
    loadedWebGeminiReviewCreatedAt.value = '';
    return;
  }

  webGeminiReviewLoading.value = true;
  webGeminiReviewMessage.value = '';
  try {
    const result = await fetchWebGeminiReview(draft.id);
    if (webGeminiPreparedPromptText.value !== result.preparedPromptText) {
      webGeminiPromptOpen.value = false;
    }
    webGeminiReview.value = result.review;
    webGeminiRunLog.value = result.runLog;
    webGeminiPreparedPromptText.value = result.preparedPromptText;
    if (!result.review) {
      webGeminiInstructionInput.value = '';
      loadedWebGeminiReviewCreatedAt.value = '';
      webGeminiReviewMessage.value = 'レビュー未取得';
      return;
    }

    if (loadedWebGeminiReviewCreatedAt.value !== result.review.createdAt) {
      webGeminiInstructionInput.value = result.review.instructionText;
      loadedWebGeminiReviewCreatedAt.value = result.review.createdAt;
    }
  } catch (error) {
    webGeminiReview.value = null;
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
    webGeminiRunLog.value = result.runLog;
    webGeminiPreparedPromptText.value = result.promptText;
    webGeminiPromptOpen.value = false;
    webGeminiInstructionInput.value = '';
    loadedWebGeminiReviewCreatedAt.value = '';
    webGeminiReviewMessage.value = 'レビュー未取得';
  } catch (error) {
    webGeminiReview.value = null;
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
  const instruction = normalizeWebGeminiReviewText(webGeminiInstructionInput.value);
  if (
    !draft ||
    !webGeminiReview.value ||
    !instruction ||
    hasFinalCompleteForCurrentOutput.value ||
    agentOperationLocked.value
  ) {
    return;
  }

  activeWebGeminiAction.value = 'apply_review';
  try {
    await store.applyWebGeminiReview(draft.id, instruction);
    webGeminiReview.value = null;
    webGeminiRunLog.value = null;
    webGeminiPreparedPromptText.value = '';
    webGeminiPromptOpen.value = false;
    webGeminiInstructionInput.value = '';
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
    await refreshPublishPackage();
  } finally {
    activeFinalReviewAction.value = '';
  }
}

async function refreshPublishPackage() {
  const draft = currentDraft.value;
  if (publishPackageLoading.value) {
    return;
  }

  if (!humanAuthReady.value || !draft || !outputVideoUri.value) {
    publishPackage.value = null;
    publishPackageMessage.value = '';
    return;
  }

  publishPackageLoading.value = true;
  publishPackageMessage.value = '';
  try {
    const result = await fetchPublishPackage(draft.id);
    publishPackage.value = result.publishPackage;
    if (result.publishPackage) {
      publishTitleInput.value = result.publishPackage.title;
      publishDescriptionInput.value = result.publishPackage.description;
    } else {
      publishTitleInput.value = publishTitleInput.value.trim() || defaultPublishTitle.value;
      publishDescriptionInput.value = publishDescriptionInput.value.trim() || defaultPublishDescription.value;
    }
  } catch (error) {
    publishPackage.value = null;
    publishPackageMessage.value = formatApiError(error);
  } finally {
    publishPackageLoading.value = false;
  }
}

async function createCurrentPublishPackage() {
  const draft = currentDraft.value;
  if (!draft || !canCreatePublishPackage.value) {
    return;
  }

  activePublishPackageAction.value = 'create_package';
  publishPackageLoading.value = true;
  publishPackageMessage.value = '';
  try {
    const result = await createPublishPackage(draft.id, {
      title: publishTitleInput.value.trim() || defaultPublishTitle.value,
      description: publishDescriptionInput.value.trim() || defaultPublishDescription.value
    });
    store.state = result.state;
    publishPackage.value = result.publishPackage;
    publishTitleInput.value = result.publishPackage.title;
    publishDescriptionInput.value = result.publishPackage.description;
    publishPackageMessage.value = '公開用ファイルを作成しました';
    await refreshRequestActivity();
  } catch (error) {
    publishPackage.value = null;
    publishPackageMessage.value = formatApiError(error);
  } finally {
    publishPackageLoading.value = false;
    activePublishPackageAction.value = '';
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
  () => activeReviewItem.value?.id,
  () => {
    const review = activeReviewItem.value;
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
    publishPackage.value = null;
    publishPackageMessage.value = '';
    publishTitleInput.value = defaultPublishTitle.value;
    publishDescriptionInput.value = defaultPublishDescription.value;
    void refreshWebGeminiReview();
    void refreshPublishPackage();
  },
  { immediate: true }
);
</script>

<template>
  <main :class="['app-shell', { 'request-mode': showRequestPage }]">
    <span class="shell-corner corner-tl" aria-hidden="true"></span>
    <span class="shell-corner corner-tr" aria-hidden="true"></span>
    <span class="shell-corner corner-bl" aria-hidden="true"></span>
    <span class="shell-corner corner-br" aria-hidden="true"></span>

    <section class="sys-bar" aria-label="システム状態">
      <div class="sys-brand">
        <span :class="['led', { active: agentLedActive }]" aria-hidden="true"></span>
        <span>zev2 // AI AGENT - ONLINE</span>
        <span class="session-code">CTRL HUD</span>
      </div>

      <div class="mode-tabs" aria-label="現在の画面">
        <span :class="['mode-tab', { active: activeMode === 'review' }]">REVIEW</span>
        <span :class="['mode-tab', { active: activeMode === 'new' }]">NEW</span>
        <span :class="['mode-tab', { active: activeMode === 'output' }]">OUTPUT</span>
        <span :class="['mode-tab', { active: activeMode === 'wait' }]">WAIT</span>
      </div>

      <div class="sys-actions">
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
          新規作成
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

    <section v-if="humanAuthReady" class="agent-status-bar" aria-live="polite">
      <div class="status-main">
        <div>
          <p class="eyebrow">Process Active</p>
          <h2 class="glitch-title">{{ hudStatusText }}</h2>
        </div>
        <p v-if="hudVisibleStatusMessage" class="status-message">{{ hudVisibleStatusMessage }}</p>
        <p v-if="store.errorMessage" class="error-message">{{ store.errorMessage }}</p>
        <p v-if="!showRequestPage && operationLockNotice" class="lock-message">{{ operationLockNotice }}</p>
      </div>

      <div class="progress-readout">
        <span v-if="hudProgressText" class="progress-pill">{{ hudProgressText }}</span>
        <strong>{{ hudProgressPercent }}%</strong>
      </div>

      <div class="progress-track" aria-hidden="true">
        <span :style="hudProgressBarStyle"></span>
      </div>

      <ol v-if="!showRequestPage && visibleRequests.length" class="step-list">
        <li
          v-for="(request, requestIndex) in visibleRequests"
          :key="request.id"
          :class="['step-item', `step-${request.status}`]"
        >
          <span class="step-cell">{{ stepMark(request, requestIndex) }}</span>
          <span class="step-name">{{ request.label }}</span>
          <strong>{{ formatStepCode(requestIndex) }}</strong>
        </li>
      </ol>
    </section>

    <section v-else class="auth-panel" aria-label="人間UI認証">
      <div class="panel-corner" aria-hidden="true"></div>
      <div>
        <p class="eyebrow">Human Auth</p>
        <h1>{{ humanAuthLoading ? '認証確認中' : '人間UIログイン' }}</h1>
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

    <div v-if="humanAuthReady" class="workspace-grid">
      <section class="stage">
        <section v-if="showRequestPage" class="request-page">
          <div class="panel-corner" aria-hidden="true"></div>
          <div class="request-header">
            <div>
              <p class="eyebrow">zev2 // create</p>
              <h1>ショート動画を作成</h1>
            </div>
          </div>

          <form class="request-form" @submit.prevent="createVideo">
            <div class="runtime-summary">
              <div
                v-for="summary in runtimeSummaries"
                :key="summary.label"
                class="runtime-summary-item"
              >
                <div>
                  <p class="eyebrow">{{ summary.label }}</p>
                  <h2>{{ summary.title }}</h2>
                </div>
                <p>{{ summary.description }}</p>
              </div>
            </div>

            <label>
              作りたいショート
              <textarea
                v-model="requestInput.purpose"
                rows="4"
                placeholder="例: 面白い会話を短いショート動画にする"
                :disabled="requestCreationLocked"
              />
            </label>

            <button type="submit" :disabled="requestCreationLocked">
              {{ submitting ? '作成中' : '動画を作成' }}
            </button>
          </form>
        </section>

        <section v-else-if="activeReviewItem" class="review-panel">
          <div class="panel-corner" aria-hidden="true"></div>
          <div>
            <p class="eyebrow">{{ activeReviewItem.title }}</p>
            <h2>{{ activeReviewItem.humanQuestion }}</h2>
          </div>
          <p class="review-summary">{{ activeReviewItem.summary }}</p>

          <div v-if="activeReviewItem.options.length" class="review-options">
            <label
              v-for="(option, optionIndex) in activeReviewItem.options"
              :key="option.id"
              :class="[
                'review-option',
                {
                  selectable: isContentSelectionReview(activeReviewItem),
                  selected: isContentSelectionReview(activeReviewItem) && selectedReviewOptionId === option.id
                }
              ]"
            >
              <input
                v-if="isContentSelectionReview(activeReviewItem)"
                v-model="selectedReviewOptionId"
                type="radio"
                name="content-option"
                :value="option.id"
              />
              <span class="review-marker" aria-hidden="true"></span>
              <span class="review-option-text">
                <strong>{{ option.title }}</strong>
                <small>{{ option.summary }}</small>
              </span>
              <span class="option-id">{{ formatOptionIndex(optionIndex) }}</span>
            </label>
          </div>
          <div v-else class="incomplete-panel">
            <p class="eyebrow">作りかけ</p>
            <h3>この確認画面の詳細表示はまだ未接続です</h3>
            <p v-if="activeReviewItem.kind === 'render_readiness'">
              演出案ファイルは作成済みですが、この画面には動画断片、表示枠、テロップ、発話IDの一覧をまだ表示できていません。
            </p>
            <p v-else>
              この確認に必要な選択肢がありません。空白で埋めず、未完成の状態として表示しています。
            </p>
          </div>

          <div class="review-actions">
            <button
              type="button"
              :disabled="agentOperationLocked || (isContentSelectionReview(activeReviewItem) && !selectedReviewOptionId)"
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

        <section v-else-if="outputVideoUri" class="video-panel">
          <div class="panel-corner" aria-hidden="true"></div>
          <div>
            <p class="eyebrow">Render Complete</p>
            <h2>完成動画</h2>
          </div>

          <div class="video-review-layout">
            <div class="video-preview">
              <video controls playsinline :src="outputVideoUri" />
              <p class="video-reference">{{ outputVideoReferenceText }}</p>
            </div>

            <section class="web-gemini-review" aria-label="Web Gemini演出レビュー">
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

                <label>
                  レビュー結果
                  <textarea
                    readonly
                    rows="4"
                    :value="webGeminiReview.reviewText"
                  />
                </label>

                <label>
                  演出作成へ渡す改善指示
                  <textarea
                    v-model="webGeminiInstructionInput"
                    rows="4"
                    placeholder="必要なら削除・書き換え"
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
            </section>
          </div>

          <section class="final-review-panel" aria-label="完成動画の人間判断">
            <div>
              <p class="eyebrow">Human Gate</p>
              <h3>{{ finalReviewStatusTitle }}</h3>
              <p>{{ finalReviewStatusDetail }}</p>
            </div>
            <div class="final-review-actions">
              <button
                type="button"
                class="secondary-button"
                :disabled="agentOperationLocked || hasPublishReadyForCurrentOutput || hasFinalCompleteForCurrentOutput || activeFinalReviewAction !== ''"
                @click="submitOutputFinalReview('publish_ready')"
              >
                {{ activeFinalReviewAction === 'publish_ready' ? '記録中' : '投稿可能として記録' }}
              </button>
              <button
                type="button"
                :disabled="agentOperationLocked || hasFinalCompleteForCurrentOutput || activeFinalReviewAction !== ''"
                @click="submitOutputFinalReview('final_complete')"
              >
                {{ activeFinalReviewAction === 'final_complete' ? '記録中' : '最終完了として記録' }}
              </button>
            </div>
            <div class="publish-package-status" aria-label="公開用ファイル">
              <strong>{{ publishPackageStatusTitle }}</strong>
              <span>{{ publishPackageStatusDetail }}</span>
              <label class="publish-package-input">
                公開タイトル
                <input
                  v-model="publishTitleInput"
                  type="text"
                  :disabled="agentOperationLocked || publishPackageLoading"
                />
              </label>
              <label class="publish-package-input">
                公開説明
                <textarea
                  v-model="publishDescriptionInput"
                  rows="3"
                  :disabled="agentOperationLocked || publishPackageLoading"
                />
              </label>
              <div v-if="publishPackage" class="publish-package-links">
                <a :href="uriWithRef(publishPackage.videoFileUri, publishPackage.createdAt)" target="_blank" rel="noreferrer">動画</a>
                <a :href="uriWithRef(publishPackage.noteUri, publishPackage.createdAt)" target="_blank" rel="noreferrer">説明メモ</a>
                <a :href="uriWithRef(publishPackage.manifestUri, publishPackage.createdAt)" target="_blank" rel="noreferrer">manifest</a>
              </div>
              <button
                type="button"
                class="secondary-button"
                :disabled="!canCreatePublishPackage"
                @click="createCurrentPublishPackage"
              >
                {{ activePublishPackageAction === 'create_package' ? '作成中' : publishPackage ? '公開用ファイルを作り直す' : '公開用ファイルを作る' }}
              </button>
            </div>
          </section>

          <div class="redo-actions">
            <button
              type="button"
              class="secondary-button"
              :disabled="!canRedoVideo"
              @click="redoVideo('theme_selection')"
            >
              {{ activeRedoScope === 'theme_selection' ? '作り直し中' : 'テーマ選択前から作り直す' }}
            </button>
            <button
              type="button"
              class="secondary-button"
              :disabled="!canRedoVideo"
              @click="redoVideo('edit_plan')"
            >
              {{ activeRedoScope === 'edit_plan' ? '作り直し中' : '演出作成前から作り直す' }}
            </button>
          </div>
        </section>

        <section v-else class="work-wait-panel">
          <div class="panel-corner" aria-hidden="true"></div>
          <div class="scanner" aria-hidden="true"></div>
          <div>
            <p class="eyebrow">Processing</p>
            <h2>{{ statusText }}</h2>
          </div>
          <p>
            {{ statusDetailText }}
          </p>
          <p v-if="operationLockNotice" class="lock-message">{{ operationLockNotice }}</p>
        </section>
      </section>

      <aside class="side-hud" aria-label="実行情報">
        <section class="hud-card">
          <p class="eyebrow">Session</p>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>{{ sessionSourceText }}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{{ sessionModelText }}</dd>
            </div>
            <div>
              <dt>Stage</dt>
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
      </aside>
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
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #0a0a0c;
}

:global(body) {
  color-scheme: dark;
}

:global(body::after) {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(0, 0, 0, 0.28) 2px 3px);
  mix-blend-mode: multiply;
  opacity: 0.4;
}

.app-shell {
  --bg: #0a0a0c;
  --yellow: #fcee0a;
  --cyan: #00f0ff;
  --red: #ff003c;
  --pink: #ff4fd8;
  --text: #f2f3e8;
  --text-dim: #9a9d88;
  --text-faint: #5c604d;
  --panel: #101013;
  --panel-2: #15151a;
  --line: rgba(252, 238, 10, 0.24);
  --font-en: Rajdhani, Roboto, 'Noto Sans JP', system-ui, sans-serif;
  --font-jp: 'Noto Sans JP', Roboto, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  position: relative;
  z-index: 1;
  height: 100dvh;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
  overflow: hidden;
  color: var(--text);
  background:
    linear-gradient(135deg, rgba(252, 238, 10, 0.07), transparent 28%),
    repeating-linear-gradient(90deg, rgba(252, 238, 10, 0.035) 0 1px, transparent 1px 72px),
    repeating-linear-gradient(0deg, rgba(0, 240, 255, 0.025) 0 1px, transparent 1px 54px),
    var(--bg);
  font-family: var(--font-jp);
  box-sizing: border-box;
}

.app-shell::before {
  content: '';
  position: absolute;
  inset: 12px;
  z-index: -1;
  border: 1px solid var(--line);
  clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px));
  box-shadow: inset 0 0 52px rgba(252, 238, 10, 0.045);
}

.shell-corner {
  position: absolute;
  z-index: 2;
  width: 30px;
  height: 30px;
  pointer-events: none;
}

.corner-tl {
  top: 12px;
  left: 12px;
  border-top: 2px solid var(--yellow);
  border-left: 2px solid var(--yellow);
}

.corner-tr {
  top: 12px;
  right: 12px;
  border-top: 2px solid var(--yellow);
  border-right: 2px solid var(--yellow);
}

.corner-bl {
  bottom: 12px;
  left: 12px;
  border-bottom: 2px solid var(--yellow);
  border-left: 2px solid var(--yellow);
}

.corner-br {
  right: 12px;
  bottom: 12px;
  border-right: 2px solid var(--yellow);
  border-bottom: 2px solid var(--yellow);
}

.sys-bar,
.agent-status-bar,
.auth-panel,
.request-page,
.review-panel,
.video-panel,
.work-wait-panel,
.hud-card,
.change-dialog {
  position: relative;
  min-width: 0;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(21, 21, 26, 0.98), rgba(13, 13, 16, 0.98));
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
  box-shadow: inset 0 0 34px rgba(252, 238, 10, 0.035);
  box-sizing: border-box;
}

.panel-corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 16px;
  height: 16px;
  background: var(--yellow);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}

.sys-bar {
  display: grid;
  grid-template-columns: minmax(210px, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.sys-brand,
.sys-actions,
.mode-tabs {
  display: flex;
  align-items: center;
  min-width: 0;
}

.sys-brand {
  gap: 9px;
  overflow: hidden;
  text-transform: uppercase;
  white-space: nowrap;
}

.session-code {
  color: var(--text-faint);
}

.led {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: var(--text-faint);
  box-shadow: none;
}

.led.active {
  background: var(--yellow);
  box-shadow: 0 0 12px var(--yellow);
  animation: blink 1.3s steps(1) infinite;
}

.mode-tabs {
  gap: 4px;
}

.mode-tab {
  border: 1px solid rgba(252, 238, 10, 0.2);
  padding: 4px 8px;
  color: var(--text-faint);
  background: rgba(0, 0, 0, 0.35);
  font-family: var(--font-en);
  font-weight: 700;
  letter-spacing: 0.12em;
}

.mode-tab.active {
  border-color: var(--yellow);
  background: var(--yellow);
  color: var(--bg);
  box-shadow: 0 0 14px rgba(252, 238, 10, 0.45);
}

.sys-actions {
  justify-content: flex-end;
  gap: 7px;
}

.agent-status-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 9px 14px;
  padding: 12px 14px;
}

.status-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.status-main > div {
  min-width: 190px;
}

.eyebrow {
  margin: 0 0 7px;
  color: var(--yellow);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
  color: var(--text);
  font-family: var(--font-en);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.12;
}

h1 {
  font-size: 28px;
}

h2 {
  font-size: 21px;
}

.glitch-title {
  width: fit-content;
  max-width: 100%;
  overflow-wrap: anywhere;
  text-shadow: 0 0 16px color-mix(in srgb, var(--cyan) 50%, transparent);
}

.status-message,
.error-message,
.lock-message {
  margin: 0;
  padding: 8px 11px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.45;
}

.status-message {
  flex: 1 1 260px;
  border-left: 3px solid var(--yellow);
  color: #e8e0a4;
  background: rgba(252, 238, 10, 0.06);
}

.error-message {
  border-left: 3px solid var(--red);
  color: #ffb4c4;
  background: rgba(255, 0, 60, 0.11);
}

.lock-message {
  border-left: 3px solid #ffb454;
  color: #ffdaa2;
  background: rgba(255, 180, 84, 0.09);
}

.progress-readout {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 142px;
  color: var(--yellow);
  font-family: var(--font-mono);
}

.progress-readout strong {
  font-size: 25px;
  line-height: 1;
  text-shadow: 0 0 14px rgba(252, 238, 10, 0.5);
}

.progress-pill {
  border: 1px solid rgba(252, 238, 10, 0.28);
  padding: 5px 8px;
  color: var(--text-dim);
  background: #050506;
  font-size: 11px;
  white-space: nowrap;
}

.progress-track {
  grid-column: 1 / -1;
  height: 7px;
  border: 1px solid var(--line);
  background: #000;
}

.progress-track span {
  display: block;
  height: 100%;
  background: var(--yellow);
  box-shadow: 0 0 12px rgba(252, 238, 10, 0.65);
}

.step-list {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  grid-template-areas:
    'cell name'
    'cell code';
  align-items: center;
  gap: 2px 8px;
  min-width: 0;
  border: 1px solid rgba(252, 238, 10, 0.16);
  padding: 6px;
  background: rgba(0, 0, 0, 0.35);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}

.step-cell {
  grid-area: cell;
  display: grid;
  width: 28px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--text-faint);
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 12px;
  clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
}

.step-name {
  grid-area: name;
  overflow: hidden;
  color: var(--text-dim);
  font-size: 11px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-item strong {
  grid-area: code;
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.step-succeeded .step-cell {
  border-color: var(--yellow);
  color: var(--yellow);
  background: rgba(252, 238, 10, 0.08);
}

.step-running .step-cell {
  border-color: var(--yellow);
  background: var(--yellow);
  color: var(--bg);
  box-shadow: 0 0 14px rgba(252, 238, 10, 0.7);
}

.step-running strong,
.step-running .step-name {
  color: var(--yellow);
}

.step-failed .step-cell {
  border-color: var(--red);
  color: var(--red);
}

.step-cancelled .step-cell {
  border-color: #ffb454;
  color: #ffb454;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 244px;
  gap: 10px;
  min-height: 0;
}

.stage {
  min-height: 0;
  overflow: hidden;
}

.auth-panel {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 16px;
  min-height: 0;
  padding: 28px;
}

.auth-panel h1 {
  margin: 0;
  color: var(--text);
  font-family: var(--font-en);
  font-size: 34px;
  line-height: 1;
}

.auth-form {
  display: grid;
  gap: 14px;
  width: min(100%, 420px);
}

.request-page,
.review-panel,
.video-panel,
.work-wait-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 18px 20px;
  overflow: hidden;
}

.request-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.request-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.request-form {
  display: grid;
  gap: 13px;
  max-width: 790px;
}

.runtime-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.runtime-summary-item,
.hud-card dl > div {
  border: 1px solid rgba(252, 238, 10, 0.18);
  background: #000;
  padding: 10px 12px;
}

.runtime-summary-item {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.runtime-summary-item h2 {
  overflow: hidden;
  color: var(--yellow);
  font-family: var(--font-mono);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runtime-summary p {
  margin: 0;
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.5;
}

label {
  display: grid;
  gap: 8px;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

textarea,
input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 0;
  padding: 12px;
  color: var(--text);
  background: #000;
  font-family: var(--font-jp);
  font-size: 14px;
  line-height: 1.55;
}

textarea {
  min-height: 92px;
  resize: none;
}

input {
  min-height: 44px;
}

textarea:focus,
input:focus {
  outline: 0;
  border-color: var(--yellow);
  box-shadow: inset 0 0 18px rgba(252, 238, 10, 0.06);
}

textarea:disabled,
input:disabled {
  color: var(--text-faint);
  cursor: not-allowed;
}

textarea::placeholder,
input::placeholder {
  color: var(--text-faint);
}

button {
  width: fit-content;
  min-height: 38px;
  border: 0;
  padding: 10px 18px;
  color: var(--bg);
  background: var(--yellow);
  box-shadow: 0 0 18px rgba(252, 238, 10, 0.35);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  cursor: pointer;
  font-family: var(--font-en);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;
}

button:hover:not(:disabled) {
  background: #fff84a;
  box-shadow: 0 0 28px rgba(252, 238, 10, 0.65);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.secondary-button {
  border: 1px solid rgba(252, 238, 10, 0.42);
  color: var(--yellow);
  background: transparent;
  box-shadow: none;
}

.secondary-button:hover:not(:disabled) {
  border-color: var(--yellow);
  color: var(--yellow);
  background: rgba(252, 238, 10, 0.1);
}

.inline-text-button {
  display: inline-flex;
  width: fit-content;
  min-height: auto;
  border: 0;
  padding: 0;
  clip-path: none;
  background: transparent;
  box-shadow: none;
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.inline-text-button:hover:not(:disabled) {
  background: transparent;
  box-shadow: none;
  color: var(--yellow);
}

.danger-button {
  border: 1px solid rgba(255, 0, 60, 0.55);
  color: var(--red);
  background: transparent;
  box-shadow: none;
}

.danger-button:hover:not(:disabled) {
  background: rgba(255, 0, 60, 0.12);
}

.review-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
}

.review-summary {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-dim);
  font-size: 13px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.review-options {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 3px;
}

.incomplete-panel {
  display: grid;
  align-content: center;
  min-height: 0;
  border: 1px dashed rgba(252, 238, 10, 0.38);
  padding: 22px;
  background:
    repeating-linear-gradient(45deg, rgba(252, 238, 10, 0.035) 0 10px, transparent 10px 20px),
    rgba(0, 0, 0, 0.42);
}

.incomplete-panel h3 {
  margin: 0;
  color: var(--yellow);
  font-family: var(--font-en);
  font-size: 20px;
  line-height: 1.25;
}

.incomplete-panel p:last-child {
  max-width: 680px;
  margin: 10px 0 0;
  color: var(--text-dim);
  font-size: 13px;
  line-height: 1.7;
}

.review-option {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  min-width: 0;
  border: 1px solid rgba(252, 238, 10, 0.16);
  padding: 13px 15px;
  background: var(--panel-2);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
  color: var(--text);
  font-weight: 400;
  transition: border-color 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
}

.review-option.selectable {
  cursor: pointer;
}

.review-option:hover {
  border-color: rgba(252, 238, 10, 0.5);
  background: #1b1b14;
}

.review-option.selected {
  border-color: var(--yellow);
  background: rgba(252, 238, 10, 0.1);
  box-shadow: inset 0 0 28px rgba(252, 238, 10, 0.06);
}

.review-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.review-marker {
  width: 14px;
  height: 24px;
  border: 1px solid var(--text-faint);
  clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%);
}

.review-option.selected .review-marker {
  border-color: var(--yellow);
  background: var(--yellow);
  box-shadow: 0 0 12px var(--yellow);
}

.review-option-text {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.review-option strong {
  color: var(--text);
  font-family: var(--font-en);
  font-size: 17px;
  line-height: 1.25;
  white-space: normal;
}

.review-option small {
  display: block;
  color: var(--text-dim);
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-line;
}

.option-id {
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 12px;
}

.review-option.selected .option-id {
  color: var(--yellow);
}

.review-actions,
.redo-actions,
.dialog-actions,
.web-gemini-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.video-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 12px;
}

.video-review-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.82fr) minmax(360px, 1fr);
  gap: 12px;
  min-height: 0;
}

.video-preview {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

video {
  width: auto;
  max-width: 100%;
  height: 100%;
  min-height: 0;
  justify-self: center;
  object-fit: contain;
  border: 1px solid var(--line);
  background:
    repeating-linear-gradient(45deg, rgba(252, 238, 10, 0.04) 0 10px, transparent 10px 20px),
    #000;
}

.video-reference {
  margin: 0;
  overflow: hidden;
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-gemini-review {
  display: grid;
  gap: 9px;
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(0, 240, 255, 0.28);
  padding: 12px;
  background:
    linear-gradient(135deg, rgba(0, 240, 255, 0.08), transparent 36%),
    #050506;
}

.web-gemini-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
}

.web-gemini-header h3 {
  margin: 0;
  color: var(--text);
  font-family: var(--font-en);
  font-size: 18px;
  line-height: 1.2;
}

.web-gemini-header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 8px;
}

.web-gemini-review label {
  gap: 6px;
  color: #cfd1bd;
}

.web-gemini-review textarea {
  height: 82px;
  min-height: 0;
  padding: 10px;
  font-size: 12px;
  line-height: 1.45;
}

.web-gemini-result {
  display: grid;
  gap: 9px;
}

.web-gemini-status-card {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(0, 240, 255, 0.24);
  padding: 8px 10px;
  background: rgba(0, 240, 255, 0.06);
}

.web-gemini-status-card strong {
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 12px;
}

.web-gemini-status-card span,
.web-gemini-status-card small {
  color: var(--text-dim);
  font-size: 11px;
  line-height: 1.35;
}

.web-gemini-status-card small {
  font-size: 11px;
}

.empty-review-state {
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 132px;
  border: 1px dashed rgba(255, 242, 0, 0.32);
  padding: 14px;
  background: rgba(255, 242, 0, 0.05);
}

.empty-review-state strong {
  color: var(--yellow);
  font-family: var(--font-mono);
  font-size: 13px;
}

.empty-review-state span {
  color: var(--text-dim);
  font-size: 12px;
}

.web-gemini-execution-notes {
  display: grid;
  gap: 4px;
  margin: 2px 0 0;
  padding-left: 18px;
  color: #dfe2cc;
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.web-gemini-prompt {
  display: grid;
  gap: 8px;
  margin-top: 8px;
  color: var(--text-muted);
}

.web-gemini-prompt pre {
  max-height: 138px;
  margin: 0;
  overflow: auto;
  border: 1px solid rgba(0, 240, 255, 0.2);
  padding: 10px;
  background: rgba(0, 0, 0, 0.32);
  color: #dfe2cc;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.review-reason-list {
  display: grid;
  gap: 4px;
  margin: 4px 0 0;
  padding-left: 18px;
  color: #ff9c9c;
  font-size: 12px;
  line-height: 1.45;
}

.web-gemini-actions {
  align-items: center;
}

.final-review-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(255, 242, 0, 0.26);
  padding: 10px 12px;
  background:
    linear-gradient(90deg, rgba(255, 242, 0, 0.09), transparent 46%),
    rgba(5, 5, 6, 0.88);
}

.final-review-panel h3 {
  margin: 0;
  color: var(--text);
  font-family: var(--font-en);
  font-size: 16px;
  line-height: 1.25;
}

.final-review-panel p {
  margin: 4px 0 0;
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.45;
}

.final-review-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.publish-package-status {
  display: grid;
  min-width: 220px;
  max-width: 340px;
  gap: 6px;
  justify-items: end;
  text-align: right;
}

.publish-package-status strong {
  color: var(--text);
  font-size: 13px;
}

.publish-package-status span {
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.45;
}

.publish-package-input {
  display: grid;
  width: min(340px, 100%);
  gap: 4px;
  color: var(--text-dim);
  font-size: 11px;
  text-align: left;
}

.publish-package-input input,
.publish-package-input textarea {
  width: 100%;
  border: 1px solid rgba(0, 240, 255, 0.22);
  padding: 7px 8px;
  color: var(--text);
  background: rgba(0, 0, 0, 0.28);
  font: inherit;
  line-height: 1.45;
}

.publish-package-input textarea {
  resize: vertical;
}

.publish-package-input input:focus,
.publish-package-input textarea:focus {
  outline: 1px solid rgba(0, 240, 255, 0.58);
  outline-offset: 1px;
}

.publish-package-input input:disabled,
.publish-package-input textarea:disabled {
  opacity: 0.62;
}

.publish-package-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  font-size: 12px;
}

.publish-package-links a {
  color: var(--accent);
  text-decoration: none;
}

.publish-package-links a:hover {
  text-decoration: underline;
}

.work-wait-panel {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 14px;
  text-align: center;
}

.work-wait-panel p {
  max-width: 560px;
  margin: 0;
  color: var(--text-dim);
  line-height: 1.6;
}

.scanner {
  width: 74px;
  height: 74px;
  border: 1px solid var(--line);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.scanner::before {
  content: '';
  display: block;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  margin: 8px;
  border-top: 2px solid var(--yellow);
  animation: spin 1s linear infinite;
}

.side-hud {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 10px;
  min-height: 0;
}

.hud-card {
  min-height: 0;
  padding: 13px;
  overflow: hidden;
}

.hud-card-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}

.hud-card-title-row .eyebrow {
  margin-bottom: 0;
}

.hud-card-title-row span {
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 10px;
}

.artifact-hud-card {
  padding: 0;
  overflow: hidden;
}

.artifact-details {
  padding: 13px;
}

.artifact-details[open] {
  max-height: 214px;
  overflow: auto;
}

.artifact-details summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  list-style: none;
}

.artifact-details summary::-webkit-details-marker {
  display: none;
}

.artifact-details summary::after {
  content: '+';
  color: var(--yellow);
  font-family: var(--font-mono);
  font-size: 12px;
}

.artifact-details[open] summary {
  margin-bottom: 8px;
}

.artifact-details[open] summary::after {
  content: '-';
}

.artifact-details .eyebrow {
  margin-bottom: 0;
}

.artifact-reference-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.artifact-reference-list li {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 8px;
  border-top: 1px solid rgba(255, 242, 0, 0.14);
  padding-top: 8px;
}

.artifact-reference-list li:first-child {
  border-top: 0;
  padding-top: 0;
}

.artifact-step {
  display: inline-grid;
  place-items: center;
  min-height: 24px;
  border: 1px solid rgba(255, 242, 0, 0.34);
  color: var(--yellow);
  font-family: var(--font-mono);
  font-size: 10px;
}

.artifact-reference-list span:last-child {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.artifact-reference-list strong {
  color: var(--text);
  font-size: 12px;
}

.artifact-reference-list small,
.artifact-reference-list em {
  color: var(--text-dim);
  font-size: 10px;
  font-style: normal;
  line-height: 1.35;
}

.artifact-reference-list code {
  overflow-wrap: anywhere;
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.35;
}

.artifact-empty {
  margin: 0;
  color: var(--text-faint);
  font-size: 11px;
  line-height: 1.5;
}

.hud-card dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.hud-card dt {
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hud-card dd {
  overflow: hidden;
  margin: 4px 0 0;
  color: var(--yellow);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-log {
  display: grid;
  gap: 7px;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.system-log li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  border-left: 2px solid var(--cyan);
  padding-left: 8px;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.45;
}

.system-log li.needs-review {
  border-left-color: var(--yellow);
}

.system-log li.user-action {
  border-left-color: var(--pink);
}

.system-log li.agent-action {
  border-left-color: var(--cyan);
}

.system-log time {
  color: var(--text-faint);
  font-size: 10px;
  white-space: nowrap;
}

.system-log span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.system-log strong {
  overflow: hidden;
  color: var(--text);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-log small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-dim);
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hint-card p:last-child {
  margin: 0;
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.55;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.72);
}

.change-dialog {
  width: min(540px, 100%);
  display: grid;
  gap: 14px;
  padding: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 34px rgba(252, 238, 10, 0.14);
  animation: dialogIn 0.16s ease-out;
}

.activity-dialog {
  width: min(760px, 100%);
  max-height: min(720px, calc(100dvh - 36px));
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
}

.activity-dialog h2 {
  display: -webkit-box;
  overflow: hidden;
  font-size: 18px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.activity-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.activity-search {
  display: grid;
  gap: 5px;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
}

.activity-search input {
  width: 100%;
  min-height: 34px;
  border: 1px solid rgba(0, 240, 255, 0.24);
  border-radius: 0;
  padding: 7px 10px;
  color: var(--text);
  background: rgba(0, 0, 0, 0.26);
  font-family: var(--font-jp);
  font-size: 13px;
}

.activity-search input:focus {
  border-color: var(--cyan);
  outline: none;
  box-shadow: 0 0 16px rgba(0, 240, 255, 0.2);
}

.activity-current-state {
  display: grid;
  gap: 4px;
  border-left: 3px solid var(--yellow);
  padding: 2px 0 2px 10px;
}

.activity-current-state span {
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
}

.activity-current-state strong {
  color: var(--text);
  font-size: 14px;
}

.activity-current-state small,
.activity-current-state em {
  overflow-wrap: anywhere;
  color: var(--text-dim);
  font-family: var(--font-jp);
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
}

.activity-current-state em {
  color: var(--yellow);
}

.filter-button {
  min-height: 28px;
  border: 1px solid rgba(0, 240, 255, 0.28);
  padding: 5px 10px;
  clip-path: none;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.22);
  box-shadow: none;
  font-family: var(--font-jp);
  font-size: 11px;
  letter-spacing: 0;
}

.filter-button.active,
.filter-button:hover:not(:disabled) {
  border-color: var(--yellow);
  color: var(--bg);
  background: var(--yellow);
  box-shadow: 0 0 16px rgba(252, 238, 10, 0.28);
}

.activity-dialog-log {
  padding-right: 4px;
}

.activity-dialog-log li {
  grid-template-columns: 132px minmax(0, 1fr);
  padding-top: 4px;
  padding-bottom: 4px;
}

.activity-dialog-log strong {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
}

.activity-entry-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.activity-entry-head em {
  flex: 0 0 auto;
  border: 1px solid rgba(0, 240, 255, 0.26);
  padding: 1px 5px;
  color: var(--cyan);
  font-family: var(--font-jp);
  font-size: 10px;
  font-style: normal;
  line-height: 1.3;
}

.activity-dialog-log small {
  -webkit-line-clamp: 3;
}

.dialog-actions {
  justify-content: flex-end;
}

@keyframes blink {
  50% {
    opacity: 0.28;
  }
}

@keyframes glitch {
  0%,
  92%,
  100% {
    opacity: 0;
    transform: translate(0, 0);
  }

  93% {
    opacity: 0.85;
    transform: translate(-2px, -1px);
  }

  96% {
    opacity: 0.85;
    transform: translate(2px, 1px);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes dialogIn {
  from {
    opacity: 0;
    transform: scale(0.97);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 1000px) {
  .app-shell {
    height: 100dvh;
    grid-template-rows: auto auto minmax(0, 1fr);
    padding: 10px;
  }

  .sys-bar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .mode-tabs {
    display: none;
  }

  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-hud {
    display: none;
  }

  .step-list {
    grid-template-columns: repeat(4, minmax(120px, 1fr));
    overflow: auto;
  }

  .video-review-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .final-review-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .final-review-actions {
    justify-content: flex-start;
  }

  .publish-package-status {
    max-width: none;
    justify-items: start;
    text-align: left;
  }

  .publish-package-links {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .app-shell {
    height: auto;
    min-height: 100dvh;
    overflow: auto;
  }

  :global(html),
  :global(body),
  :global(#app) {
    overflow: auto;
  }

  .sys-bar,
  .agent-status-bar {
    clip-path: none;
  }

  .sys-bar,
  .status-main,
  .sys-actions,
  .progress-readout {
    align-items: stretch;
    flex-direction: column;
  }

  .sys-bar {
    display: flex;
  }

  .agent-status-bar {
    display: grid;
    grid-template-columns: 1fr;
  }

  .request-page,
  .review-panel,
  .video-panel,
  .work-wait-panel {
    height: auto;
    min-height: 420px;
    clip-path: none;
  }

  .runtime-summary,
  .step-list {
    grid-template-columns: 1fr;
  }

  .review-actions,
  .redo-actions,
  .dialog-actions,
  .web-gemini-actions {
    display: grid;
  }

  .web-gemini-review {
    overflow: visible;
  }

  button {
    width: 100%;
  }

  video {
    width: min(420px, 100%);
    height: auto;
    max-height: 70dvh;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation: none !important;
    transition: none !important;
  }
}
</style>
