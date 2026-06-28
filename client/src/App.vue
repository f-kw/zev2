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
const initialPurpose = 'ショート動画を作成する';
let refreshTimer: number | undefined;

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

const canResumeAgentWork = computed(() =>
  Boolean(waitingAgentRequest.value && !runningRequest.value && !store.loading)
);

const canCancelAgentWork = computed(() =>
  Boolean(currentDraft.value && (runningRequest.value || waitingAgentRequest.value) && !store.loading)
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

const visibleStatusMessage = computed(() =>
  store.errorMessage ? '' : statusDetailText.value
);

const operationLockNotice = computed(() =>
  agentOperationLocked.value ? 'この工程はキャンセルできません' : ''
);

const progressText = computed(() => {
  if (visibleRequests.value.length === 0) {
    return '';
  }

  const completedCount = visibleRequests.value.filter((request) => request.status === 'succeeded').length;
  return `${completedCount}/${visibleRequests.value.length} 工程完了`;
});

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
});

onBeforeUnmount(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
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
</script>

<template>
  <main class="app-shell">
    <section class="agent-status-bar" aria-live="polite">
      <div class="status-main">
        <div>
          <p class="eyebrow">AIエージェント</p>
          <h2>{{ statusText }}</h2>
        </div>
        <p v-if="visibleStatusMessage" class="status-message">{{ visibleStatusMessage }}</p>
        <p v-if="store.errorMessage" class="error-message">{{ store.errorMessage }}</p>
        <p v-if="operationLockNotice" class="lock-message">{{ operationLockNotice }}</p>
      </div>

      <div class="status-controls">
        <span v-if="progressText" class="progress-pill">{{ progressText }}</span>
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

      <ol v-if="visibleRequests.length" class="step-list">
        <li
          v-for="request in visibleRequests"
          :key="request.id"
          :class="['step-item', `step-${request.status}`]"
        >
          <span>{{ request.label }}</span>
          <strong>{{ statusLabel(request) }}</strong>
        </li>
      </ol>
    </section>

    <section v-if="showRequestPage" class="request-page">
      <div class="request-header">
        <div>
          <p class="eyebrow">zev2</p>
          <h1>ショート動画を作成</h1>
        </div>
        <button
          v-if="currentDraft"
          type="button"
          class="secondary-button"
          @click="closeRequestPage"
        >
          作業へ戻る
        </button>
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
      <div>
        <p class="eyebrow">{{ activeReviewItem.title }}</p>
        <h2>{{ activeReviewItem.humanQuestion }}</h2>
      </div>
      <p class="review-summary">{{ activeReviewItem.summary }}</p>

      <div v-if="activeReviewItem.options.length" class="review-options">
        <label
          v-for="option in activeReviewItem.options"
          :key="option.id"
          :class="['review-option', { selectable: isContentSelectionReview(activeReviewItem) }]"
        >
          <input
            v-if="isContentSelectionReview(activeReviewItem)"
            v-model="selectedReviewOptionId"
            type="radio"
            name="content-option"
            :value="option.id"
          />
          <span>
            <strong>{{ option.title }}</strong>
            <small>{{ option.summary }}</small>
          </span>
        </label>
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

    <div
      v-if="pendingReviewChange && pendingReviewItem"
      class="dialog-overlay"
      role="dialog"
      aria-modal="true"
    >
      <form class="change-dialog" @submit.prevent="confirmReviewChange">
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

    <section v-else-if="outputVideoUri" class="video-panel">
      <div>
        <p class="eyebrow">生成結果</p>
        <h2>完成動画</h2>
      </div>
      <video controls playsinline :src="outputVideoUri" />

      <div class="redo-actions">
        <button
          type="button"
          :disabled="!canRedoVideo"
          @click="redoVideo('theme_selection')"
        >
          {{ activeRedoScope === 'theme_selection' ? '作り直し中' : 'テーマ選択前から作り直す' }}
        </button>
        <button
          type="button"
          :disabled="!canRedoVideo"
          @click="redoVideo('edit_plan')"
        >
          {{ activeRedoScope === 'edit_plan' ? '作り直し中' : '演出作成前から作り直す' }}
        </button>
      </div>
    </section>

    <section v-else class="work-wait-panel">
      <div>
        <p class="eyebrow">作業中</p>
        <h2>{{ statusText }}</h2>
      </div>
      <p>
        {{ statusDetailText }}
      </p>
      <p v-if="operationLockNotice" class="lock-message">{{ operationLockNotice }}</p>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  height: 100dvh;
  min-height: 0;
  background: #f5f7f9;
  color: #17202a;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  overflow: hidden;
  box-sizing: border-box;
}

.agent-status-bar,
.request-page,
.review-panel,
.video-panel,
.work-wait-panel {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.agent-status-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px 14px;
  align-items: start;
  background: #ffffff;
  border: 1px solid #cbd8e2;
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 2px 8px rgba(23, 32, 42, 0.05);
}

.status-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  min-width: 0;
}

.status-main > div {
  min-width: 180px;
}

.status-main h2 {
  font-size: 18px;
}

.status-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.request-page,
.review-panel,
.video-panel,
.work-wait-panel {
  min-height: 0;
  height: 100%;
  background: #ffffff;
  border: 1px solid #d8e0e7;
  border-radius: 8px;
  padding: 16px;
}

.request-page {
  display: grid;
  align-content: start;
  gap: 14px;
  overflow: auto;
}

.request-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #607080;
  font-size: 12px;
  font-weight: 700;
}

h1,
h2 {
  margin: 0;
  line-height: 1.2;
}

h1 {
  font-size: 24px;
}

h2 {
  font-size: 19px;
}

.request-form {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  max-width: 760px;
}

.runtime-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.runtime-summary-item {
  display: grid;
  gap: 4px;
  border: 1px solid #cbd8e2;
  border-radius: 8px;
  background: #f7fafc;
  padding: 9px;
  min-width: 0;
}

.runtime-summary-item + .runtime-summary-item {
  border-top: 1px solid #cbd8e2;
}

.runtime-summary-item h2 {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runtime-summary p {
  display: none;
  margin: 0;
  color: #34495e;
  font-size: 14px;
  line-height: 1.5;
}

label {
  display: grid;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  resize: none;
  min-height: 78px;
  border: 1px solid #c7d2dc;
  border-radius: 8px;
  padding: 12px;
  color: #17202a;
  font: inherit;
}

button {
  width: fit-content;
  border: 0;
  border-radius: 8px;
  background: #1264a3;
  color: #ffffff;
  padding: 10px 14px;
  font-weight: 800;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

textarea:disabled {
  background: #eef2f6;
  color: #607080;
  cursor: not-allowed;
}

.progress-pill {
  border-radius: 999px;
  background: #e8eef4;
  color: #34495e;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.error-message {
  margin: 0;
  border-left: 4px solid #b42318;
  background: #fff2f1;
  padding: 10px;
  color: #8a1f17;
  font-size: 13px;
  font-weight: 700;
}

.status-message {
  flex: 1 1 260px;
  margin: 0;
  border-left: 4px solid #1264a3;
  background: #edf6ff;
  padding: 10px;
  color: #173a5e;
  font-size: 13px;
  font-weight: 800;
}

.lock-message {
  flex: 0 1 auto;
  margin: 0;
  border-left: 4px solid #8a6d1d;
  background: #fff8dd;
  padding: 10px;
  color: #634f13;
  font-size: 13px;
  font-weight: 800;
}

.review-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  gap: 12px;
  overflow: hidden;
}

.review-summary {
  margin: 0;
  color: #34495e;
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.review-options {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.review-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #d8e0e7;
  border-radius: 8px;
  background: #f8fafc;
  padding: 12px;
  font-weight: 400;
  min-width: 0;
}

.review-option.selectable {
  cursor: pointer;
}

.review-option input {
  margin-top: 4px;
}

.review-option span {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.review-option strong {
  color: #17202a;
  font-size: 16px;
  line-height: 1.4;
  white-space: normal;
}

.review-option small {
  color: #243241;
  display: block;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-line;
}

.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(23, 32, 42, 0.42);
  padding: 18px;
}

.change-dialog {
  width: min(520px, 100%);
  display: grid;
  gap: 14px;
  border: 1px solid #cbd8e2;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 18px 44px rgba(23, 32, 42, 0.22);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.secondary-button {
  background: #e8eef4;
  color: #17202a;
}

.danger-button {
  background: #b42318;
  color: #ffffff;
}

.step-list {
  list-style: none;
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
}

.step-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  border: 1px solid #d8e0e7;
  border-radius: 6px;
  padding: 6px 8px;
  background: #ffffff;
}

.step-item span {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-item strong {
  font-size: 11px;
  color: #526171;
  white-space: nowrap;
}

.step-succeeded {
  border-color: #b9dbc8;
  background: #f3fbf6;
}

.step-running {
  border-color: #9fc5e8;
  background: #eef7ff;
}

.step-queued,
.step-waiting {
  border-color: #d8e0e7;
  background: #f8fafc;
}

.step-failed {
  border-color: #f1b4ad;
  background: #fff4f3;
}

.step-cancelled {
  border-color: #e0c27a;
  background: #fff9e8;
}

.video-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  overflow: hidden;
}

.work-wait-panel {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  text-align: center;
}

.work-wait-panel p {
  max-width: 520px;
  margin: 0;
  color: #34495e;
  line-height: 1.6;
}

.redo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

video {
  width: auto;
  max-width: 100%;
  height: 100%;
  min-height: 0;
  justify-self: center;
  object-fit: contain;
  background: #000000;
  border-radius: 8px;
}

@media (max-width: 900px) {
  .app-shell {
    height: auto;
    min-height: 100dvh;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: auto;
    padding: 18px;
  }

  .agent-status-bar,
  .request-page,
  .review-panel,
  .video-panel,
  .work-wait-panel {
    height: auto;
    min-height: 0;
  }

  .agent-status-bar,
  .status-main,
  .status-controls,
  .step-item {
    align-items: stretch;
    flex-direction: column;
  }

  .agent-status-bar {
    display: flex;
  }

  .status-controls {
    display: grid;
  }

  .step-list {
    grid-template-columns: 1fr;
  }

  button {
    width: 100%;
  }

  .redo-actions {
    display: grid;
  }

  .review-actions {
    display: grid;
  }

  .dialog-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  video {
    width: min(420px, 100%);
    height: auto;
    max-height: 70dvh;
  }
}
</style>
