<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  DEFAULT_GEMINI_MODEL,
  findById,
  uriWithRef,
  type AgentRequest,
  type ControlReviewItem,
  type RequestDraftInput
} from '@zev2/shared';
import {
  fetchWebGeminiReview,
  formatApiError,
  prepareWebGeminiReview,
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

const store = useControlQueueStore();
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
const initialPurpose = 'ショート動画を作成する';
let refreshTimer: number | undefined;
let webGeminiRefreshTimer: number | undefined;

const requestInput = reactive<RequestDraftInput>({
  purpose: initialPurpose,
  sourceUri: '',
  durationLabel: '60秒以内',
  themeCountLabel: '3候補',
  geminiModelName: DEFAULT_GEMINI_MODEL,
  preset: 'shorts_default'
});

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

const outputVideoUri = computed(() => {
  const fileRefId = renderRequest.value?.result?.fileRefId;
  if (!fileRefId) {
    return '';
  }

  const fileRef = findById(store.state.fileRefs, fileRefId);
  return fileRef?.uri ? uriWithRef(fileRef.uri, fileRefId) : '';
});

const canRedoVideo = computed(() =>
  Boolean(currentDraft.value && outputVideoUri.value && !agentOperationLocked.value)
);

const outputVideoReferenceText = computed(() => {
  if (!outputVideoUri.value) {
    return '';
  }

  return new URL(outputVideoUri.value, window.location.origin).toString();
});

const canApplyWebGeminiReview = computed(() =>
  Boolean(
    currentDraft.value &&
      outputVideoUri.value &&
      webGeminiReview.value &&
      webGeminiInstructionInput.value.trim() &&
      !agentOperationLocked.value &&
      activeWebGeminiAction.value !== 'apply_review'
  )
);

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

const canInspectWebGeminiPrompt = computed(() =>
  Boolean(!webGeminiReview.value && webGeminiPreparedPromptText.value.trim())
);

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

const hudStatusText = computed(() =>
  showRequestPage.value ? '新規依頼を入力' : statusText.value
);

const hudStatusDetailText = computed(() =>
  showRequestPage.value ? '作りたいショートを入力して、動画作成を開始できます' : statusDetailText.value
);

const hudVisibleStatusMessage = computed(() =>
  store.errorMessage ? '' : hudStatusDetailText.value
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

const systemLogItems = computed(() => {
  if (showRequestPage.value) {
    return ['新規依頼の入力待ち'];
  }

  const requests = visibleRequests.value.slice(-4);
  if (requests.length === 0) {
    return ['新規依頼の入力待ち'];
  }

  return requests.map((request) => `${request.label}: ${statusLabel(request)}`);
});

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

function formatOptionIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function statusLabel(request: AgentRequest): string {
  if (request.status === 'succeeded') {
    return '完了';
  }

  if (request.status === 'running') {
    return '実行中';
  }

  if (request.status === 'failed') {
    return '停止';
  }

  if (request.status === 'cancelled') {
    return '中止';
  }

  return '待機中';
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
  if (!draft || agentOperationLocked.value) {
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

async function refreshWebGeminiReview() {
  const draft = currentDraft.value;
  if (webGeminiReviewLoading.value) {
    return;
  }

  if (!draft || !outputVideoUri.value) {
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
  if (!draft || !outputVideoUri.value || agentOperationLocked.value || webGeminiReviewLoading.value) {
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
  if (!draft || !webGeminiReview.value || !instruction || agentOperationLocked.value) {
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
  void store.refresh();
  refreshTimer = window.setInterval(() => {
    void store.refresh();
  }, 2000);
  webGeminiRefreshTimer = window.setInterval(() => {
    if (!outputVideoUri.value || activeWebGeminiAction.value || agentOperationLocked.value) {
      return;
    }

    void refreshWebGeminiReview();
  }, 5000);
});

onBeforeUnmount(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
  }
  if (webGeminiRefreshTimer !== undefined) {
    window.clearInterval(webGeminiRefreshTimer);
  }
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
  () => [currentDraft.value?.id ?? '', outputVideoUri.value],
  () => {
    void refreshWebGeminiReview();
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
      </div>
    </section>

    <section class="agent-status-bar" aria-live="polite">
      <div class="status-main">
        <div>
          <p class="eyebrow">Process Active</p>
          <h2 class="glitch-title" :data-t="hudStatusText">{{ hudStatusText }}</h2>
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

    <div class="workspace-grid">
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
                    v-if="!webGeminiReview"
                    type="button"
                    class="secondary-button"
                    :disabled="agentOperationLocked || webGeminiReviewLoading || activeWebGeminiAction === 'prepare_review'"
                    @click="prepareCurrentWebGeminiReview"
                  >
                    {{ activeWebGeminiAction === 'prepare_review' ? '準備中' : 'レビュー準備を更新' }}
                  </button>
                  <button
                    type="button"
                    class="secondary-button"
                    :disabled="webGeminiReviewLoading || activeWebGeminiAction === 'refresh_review'"
                    @click="reloadWebGeminiReview"
                  >
                    {{ activeWebGeminiAction === 'refresh_review' ? '確認中' : '再読み込み' }}
                  </button>
                </div>
              </div>

              <div v-if="webGeminiReviewLoading" class="empty-review-state">
                <strong>レビュー確認中</strong>
                <span>保存済みレビューを読んでいます</span>
              </div>

              <div v-else-if="webGeminiReview" class="web-gemini-result">
                <label>
                  レビュー結果
                  <textarea
                    readonly
                    rows="5"
                    :value="webGeminiReview.reviewText"
                  />
                </label>

                <label>
                  演出作成へ渡す改善指示
                  <textarea
                    v-model="webGeminiInstructionInput"
                    rows="5"
                    placeholder="必要なら削除・書き換え"
                    :disabled="agentOperationLocked"
                  />
                </label>

                <div class="web-gemini-actions final-action">
                  <button
                    type="button"
                    :disabled="!canApplyWebGeminiReview"
                    @click="applyWebGeminiReviewChanges"
                  >
                    {{ activeWebGeminiAction === 'apply_review' ? '再作成中' : 'このレビューで演出から再作成' }}
                  </button>
                </div>
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

        <section class="hud-card">
          <p class="eyebrow">System Log</p>
          <ol class="system-log">
            <li v-for="item in systemLogItems" :key="item">{{ item }}</li>
          </ol>
        </section>

        <section class="hud-card hint-card">
          <p class="eyebrow">Hint</p>
          <p>{{ hudStatusDetailText }}</p>
        </section>
      </aside>
    </div>

    <div
      v-if="!showRequestPage && pendingReviewChange && pendingReviewItem"
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
  position: relative;
  width: fit-content;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.glitch-title::before,
.glitch-title::after {
  content: attr(data-t);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
}

.glitch-title::before {
  color: var(--cyan);
  clip-path: inset(0 0 55% 0);
  animation: glitch 3s infinite steps(2);
}

.glitch-title::after {
  color: var(--red);
  clip-path: inset(55% 0 0 0);
  animation: glitch 2.4s infinite steps(2) reverse;
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

textarea {
  width: 100%;
  min-height: 92px;
  box-sizing: border-box;
  resize: none;
  border: 1px solid var(--line);
  border-radius: 0;
  padding: 12px;
  color: var(--text);
  background: #000;
  font-family: var(--font-jp);
  font-size: 14px;
  line-height: 1.55;
}

textarea:focus {
  outline: 0;
  border-color: var(--yellow);
  box-shadow: inset 0 0 18px rgba(252, 238, 10, 0.06);
}

textarea:disabled {
  color: var(--text-faint);
  cursor: not-allowed;
}

textarea::placeholder {
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
  grid-template-rows: auto minmax(0, 1fr) auto;
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
  min-height: 72px;
  padding: 10px;
  font-size: 12px;
  line-height: 1.45;
}

.web-gemini-result {
  display: grid;
  gap: 9px;
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

.final-action {
  justify-content: flex-end;
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
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
  min-height: 0;
}

.hud-card {
  min-height: 0;
  padding: 13px;
  overflow: hidden;
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
  border-left: 2px solid var(--cyan);
  padding-left: 8px;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.45;
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
