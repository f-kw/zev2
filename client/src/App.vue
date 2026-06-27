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

type RedoScope = 'theme_selection' | 'edit_plan' | 'adjustment';
type ReviewChangeScope = 'edit_plan' | 'theme_reselect' | 'material_reselect' | 'adjustment';

const store = useControlQueueStore();
const submitting = ref(false);
const activeRedoScope = ref<RedoScope | ''>('');
const activeReviewAction = ref('');
const selectedReviewOptionId = ref('');
const requestDefaultsApplied = ref(false);
const pendingReviewChange = ref<{ reviewId: string; scope?: ReviewChangeScope } | null>(null);
const changeReasonInput = ref('');
const changeReasonError = ref('');
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
      label: '内容候補整理',
      title: store.runtimeConfig.contentDiscovery.mode === 'fixed' ? '固定候補' : '文字起こし整理',
      description: store.runtimeConfig.contentDiscovery.mode === 'fixed'
        ? '固定済みの内容候補を使います'
        : '文字起こしから内容候補を整理します'
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

const runningRequest = computed(() =>
  visibleRequests.value.find((request) => request.status === 'running')
);

const nextWaitingRequest = computed(() =>
  visibleRequests.value.find((request) => request.status === 'queued' || request.status === 'waiting')
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
  Boolean(currentDraft.value && outputVideoUri.value && !store.loading && !runningRequest.value && !nextWaitingRequest.value)
);

const statusText = computed(() => {
  if (failedRequest.value) {
    return `${failedRequest.value.label}で停止`;
  }

  if (runningRequest.value) {
    return `${runningRequest.value.label}を実行中`;
  }

  if (nextWaitingRequest.value) {
    return `${nextWaitingRequest.value.label}を待機中`;
  }

  if (outputVideoUri.value) {
    return '動画生成完了';
  }

  if (currentDraft.value) {
    return '作成開始前';
  }

  return '新規依頼を入力してください';
});

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

  return '待機中';
}

async function createVideo() {
  const runtimeConfig = store.runtimeConfig;
  if (!runtimeConfig) {
    return;
  }

  submitting.value = true;
  requestInput.sourceUri = runtimeConfig.source.defaultUri;
  try {
    await store.createRequestDraft({ ...requestInput });
  } finally {
    submitting.value = false;
  }
}

function isContentSelectionReview(review: ControlReviewItem): boolean {
  return review.kind === 'theme_selection';
}

function isMaterialConfirmationReview(review: ControlReviewItem): boolean {
  return review.kind === 'material_confirmation';
}

function approveReviewLabel(review: ControlReviewItem): string {
  if (isContentSelectionReview(review)) {
    return 'この内容で素材を探す';
  }

  if (isMaterialConfirmationReview(review)) {
    return 'この場面で演出へ進む';
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
    if (review.kind === 'theme_selection') {
      return '内容候補を作り直す';
    }

    if (review.kind === 'material_confirmation' && scope === 'theme_reselect') {
      return '内容を選び直す';
    }

    if (review.kind === 'material_confirmation') {
      return '同じ内容で使う場面を選び直す';
    }

    if (scope === 'theme_reselect') {
      return '内容を選び直す';
    }

    if (scope === 'adjustment') {
      return '微調整から作り直す';
    }

    return '演出作成前から作り直す';
  }

  return '確認済みとして進める';
}

function reviewChangePromptMessage(review: ControlReviewItem, scope?: ReviewChangeScope): string {
  if (review.kind === 'material_confirmation' && scope === 'theme_reselect') {
    return '内容を選び直す指示があれば入力してください';
  }

  if (review.kind === 'material_confirmation') {
    return 'どんな場面に選び直したいか入力してください';
  }

  if (review.kind === 'render_readiness' && scope === 'theme_reselect') {
    return '内容を選び直す指示があれば入力してください';
  }

  if (review.kind === 'render_readiness' && scope === 'adjustment') {
    return '微調整で直したい点があれば入力してください';
  }

  return '作り直したい内容があれば入力してください';
}

function reviewChangeDialogTitle(review: ControlReviewItem, scope?: ReviewChangeScope): string {
  if (review.kind === 'material_confirmation' && scope === 'theme_reselect') {
    return '内容を選び直す';
  }

  if (review.kind === 'material_confirmation') {
    return '使う場面を選び直す';
  }

  if (review.kind === 'render_readiness' && scope === 'theme_reselect') {
    return '内容を選び直す';
  }

  if (review.kind === 'render_readiness' && scope === 'adjustment') {
    return '微調整から作り直す';
  }

  return '演出を作り直す';
}

function requiresChangeReason(review: ControlReviewItem, scope?: ReviewChangeScope): boolean {
  return review.kind === 'material_confirmation' && scope !== 'theme_reselect';
}

function openReviewChangeDialog(review: ControlReviewItem, scope?: ReviewChangeScope) {
  pendingReviewChange.value = { reviewId: review.id, scope };
  changeReasonInput.value = '';
  changeReasonError.value = '';
}

function closeReviewChangeDialog() {
  pendingReviewChange.value = null;
  changeReasonInput.value = '';
  changeReasonError.value = '';
}

async function sendReviewAction(
  review: ControlReviewItem,
  action: 'approve' | 'request_changes',
  reason: string,
  scope?: ReviewChangeScope
) {
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
  if (!pending || !review) {
    return;
  }

  if (requiresChangeReason(review, pending.scope) && !changeReasonInput.value.trim()) {
    changeReasonError.value = '使う場面を選び直す指示を入力してください';
    return;
  }

  const reason = defaultReviewReason(review, 'request_changes', pending.scope, changeReasonInput.value);
  closeReviewChangeDialog();
  await sendReviewAction(review, 'request_changes', reason, pending.scope);
}

async function submitActiveReview(action: 'approve' | 'request_changes', scope?: ReviewChangeScope) {
  const review = activeReviewItem.value;
  if (!review) {
    return;
  }

  if (action === 'request_changes') {
    openReviewChangeDialog(review, scope);
    return;
  }

  await sendReviewAction(review, action, defaultReviewReason(review, action, scope), scope);
}

async function redoVideo(scope: RedoScope) {
  const draft = currentDraft.value;
  if (!draft) {
    return;
  }

  activeRedoScope.value = scope;
  const reasonByScope: Record<RedoScope, string> = {
    theme_selection: '内容選択前から作り直す',
    edit_plan: '演出作成前から作り直す',
    adjustment: '微調整前から作り直す'
  };

  try {
    await store.requestGeneratedVideoChanges(draft.id, reasonByScope[scope], scope);
  } finally {
    activeRedoScope.value = '';
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
    <section class="request-panel">
      <div>
        <p class="eyebrow">zev2</p>
        <h1>ショート動画を自動作成</h1>
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
          作りたい内容
          <textarea
            v-model="requestInput.purpose"
            rows="4"
            placeholder="例: 面白い会話を短いショート動画にする"
          />
        </label>

        <button type="submit" :disabled="submitting || !store.runtimeConfig">
          {{ submitting ? '作成中' : '動画を作成' }}
        </button>
      </form>
    </section>

    <section class="status-panel" aria-live="polite">
      <div class="status-header">
        <div>
          <p class="eyebrow">現在の状態</p>
          <h2>{{ statusText }}</h2>
        </div>
        <span v-if="progressText" class="progress-pill">{{ progressText }}</span>
      </div>

      <p v-if="store.message" class="status-message">{{ store.message }}</p>
      <p v-if="store.errorMessage" class="error-message">{{ store.errorMessage }}</p>

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

    <section v-if="activeReviewItem" class="review-panel">
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
          :disabled="store.loading || (isContentSelectionReview(activeReviewItem) && !selectedReviewOptionId)"
          @click="submitActiveReview('approve')"
        >
          {{ activeReviewAction === 'approve' ? '処理中' : approveReviewLabel(activeReviewItem) }}
        </button>
        <button
          v-if="isMaterialConfirmationReview(activeReviewItem)"
          type="button"
          class="secondary-button"
          :disabled="store.loading"
          @click="submitActiveReview('request_changes', 'material_reselect')"
        >
          {{ activeReviewAction === 'request_changes:material_reselect' ? '処理中' : '使う場面を選び直す' }}
        </button>
        <button
          v-if="isMaterialConfirmationReview(activeReviewItem)"
          type="button"
          class="secondary-button"
          :disabled="store.loading"
          @click="submitActiveReview('request_changes', 'theme_reselect')"
        >
          {{ activeReviewAction === 'request_changes:theme_reselect' ? '処理中' : '内容を選び直す' }}
        </button>
        <button
          v-if="activeReviewItem.kind === 'render_readiness'"
          type="button"
          class="secondary-button"
          :disabled="store.loading"
          @click="submitActiveReview('request_changes', 'edit_plan')"
        >
          {{ activeReviewAction === 'request_changes:edit_plan' ? '処理中' : '演出作成前から作り直す' }}
        </button>
        <button
          v-if="activeReviewItem.kind === 'render_readiness'"
          type="button"
          class="secondary-button"
          :disabled="store.loading"
          @click="submitActiveReview('request_changes', 'theme_reselect')"
        >
          {{ activeReviewAction === 'request_changes:theme_reselect' ? '処理中' : '内容を選び直す' }}
        </button>
        <button
          v-if="activeReviewItem.kind === 'render_readiness'"
          type="button"
          class="secondary-button"
          :disabled="store.loading"
          @click="submitActiveReview('request_changes', 'adjustment')"
        >
          {{ activeReviewAction === 'request_changes:adjustment' ? '処理中' : '微調整前から作り直す' }}
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
            :placeholder="requiresChangeReason(pendingReviewItem, pendingReviewChange.scope) ? '例: ゲーム画面が分かる場面を優先する' : '必要な場合だけ入力'"
          />
        </label>
        <p v-if="changeReasonError" class="error-message">{{ changeReasonError }}</p>
        <div class="dialog-actions">
          <button type="button" class="secondary-button" @click="closeReviewChangeDialog">
            キャンセル
          </button>
          <button type="submit" :disabled="store.loading">
            {{ activeReviewAction.startsWith('request_changes') ? '処理中' : '作り直す' }}
          </button>
        </div>
      </form>
    </div>

    <section v-if="!activeReviewItem && outputVideoUri" class="video-panel">
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
          {{ activeRedoScope === 'theme_selection' ? '作り直し中' : '内容選択前から作り直す' }}
        </button>
        <button
          type="button"
          :disabled="!canRedoVideo"
          @click="redoVideo('edit_plan')"
        >
          {{ activeRedoScope === 'edit_plan' ? '作り直し中' : '演出作成前から作り直す' }}
        </button>
        <button
          type="button"
          :disabled="!canRedoVideo"
          @click="redoVideo('adjustment')"
        >
          {{ activeRedoScope === 'adjustment' ? '作り直し中' : '微調整前から作り直す' }}
        </button>
      </div>
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
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  overflow: hidden;
  box-sizing: border-box;
}

.request-panel,
.status-panel,
.review-panel,
.video-panel {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.request-panel,
.status-panel {
  grid-column: 1;
}

.request-panel {
  grid-row: 1;
}

.status-panel {
  grid-row: 2;
  min-height: 0;
  overflow: hidden;
}

.review-panel,
.video-panel {
  grid-column: 2;
  grid-row: 1 / span 2;
  min-height: 0;
  height: 100%;
  background: #ffffff;
  border: 1px solid #d8e0e7;
  border-radius: 8px;
  padding: 16px;
}

.request-panel,
.status-panel {
  background: #ffffff;
  border: 1px solid #d8e0e7;
  border-radius: 8px;
  padding: 16px;
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
  cursor: wait;
  opacity: 0.65;
}

.status-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
}

.status-header h2 {
  font-size: 17px;
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
  margin: 10px 0 0;
  border-left: 4px solid #b42318;
  background: #fff2f1;
  padding: 10px;
  color: #8a1f17;
  font-size: 13px;
  font-weight: 700;
}

.status-message {
  margin: 10px 0 0;
  border-left: 4px solid #1264a3;
  background: #edf6ff;
  padding: 10px;
  color: #173a5e;
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  min-height: 0;
  overflow: hidden;
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
  overflow: hidden;
  color: #17202a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-option small {
  color: #526171;
  display: -webkit-box;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-line;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
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

.step-list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin: 12px 0 0;
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
  padding: 7px 8px;
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

.step-failed {
  border-color: #f1b4ad;
  background: #fff4f3;
}

.video-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  overflow: hidden;
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
    grid-template-columns: 1fr;
    grid-template-rows: auto auto minmax(0, 1fr);
    overflow: auto;
    padding: 18px;
  }

  .request-panel,
  .status-panel,
  .review-panel,
  .video-panel {
    grid-column: 1;
    grid-row: auto;
  }

  .status-header,
  .step-item {
    align-items: stretch;
    flex-direction: column;
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
  }

  video {
    width: min(420px, 100%);
    height: auto;
    max-height: 70dvh;
  }
}
</style>
