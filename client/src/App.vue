<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type {
  AgentRequest,
  AgentRequestStatus,
  ControlReviewItem,
  ControlReviewStatus,
  FileRef,
  HumanReviewActionType,
  RequestDraftInput,
  RequestDraftStatus
} from '@zev2/shared';
import { fetchArtifactText } from './api';
import { useControlQueueStore } from './stores/controlQueue';

const store = useControlQueueStore();
const selectedHistoryDraftId = ref('');
const currentView = ref<'main' | 'history'>('main');
const showSuccessfulSteps = ref(false);
const reviewReasons = reactive<Record<string, string>>({});
const artifactPreviews = reactive<Record<string, string>>({});

const draftInput = reactive<RequestDraftInput>({
  purpose: 'この配信からショート候補を作って、切り抜き理由とテロップ案まで出す',
  sourceUri: '',
  durationLabel: '60秒以内',
  candidateCountLabel: '3候補',
  preset: 'shorts_default',
  includeRender: true
});

const draftStatusLabel = {
  draft: '承認待ち',
  approved: 'API実行対象',
  rejected: '却下'
} satisfies Record<RequestDraftStatus, string>;

const operationStatusLabel = {
  queued: 'API取得待ち',
  running: '実行中',
  waiting: '前工程待ち',
  succeeded: '完了',
  failed: '失敗'
} satisfies Record<AgentRequestStatus, string>;

const operationStatusColor = {
  queued: 'info',
  running: 'primary',
  waiting: 'info',
  succeeded: 'success',
  failed: 'error'
} satisfies Record<AgentRequestStatus, string>;

const controlReviewStatusLabel = {
  review_required: '確認待ち',
  approved: '承認済み',
  rejected: '却下',
  changes_requested: '修正依頼'
} satisfies Record<ControlReviewStatus, string>;

const controlReviewStatusColor = {
  review_required: 'warning',
  approved: 'success',
  rejected: 'error',
  changes_requested: 'warning'
} satisfies Record<ControlReviewStatus, string>;

const pendingDrafts = computed(() =>
  store.state.requestDrafts.filter((draft) => draft.status === 'draft')
);
const transientRunActive = computed(() =>
  ['saving', 'handing_off', 'running', 'review_required'].includes(store.runPhase)
);
const focusedDraftId = computed(() => {
  if (transientRunActive.value && store.activeDraftId) {
    return store.activeDraftId;
  }

  return selectedHistoryDraftId.value || store.activeDraftId || pendingDrafts.value[0]?.id || store.state.requestDrafts[0]?.id;
});
const latestDraft = computed(() => store.state.requestDrafts.find((draft) => draft.id === focusedDraftId.value));
const selectedOperations = computed(() => {
  const draft = latestDraft.value;
  if (!draft) {
    return [];
  }

  return store.state.agentRequests.filter((request) => request.requestDraftId === draft.id);
});
const runningOperations = computed(() => selectedOperations.value.filter((request) => request.status === 'running'));
const waitingOperations = computed(() =>
  selectedOperations.value.filter((request) => ['queued', 'waiting'].includes(request.status))
);
const failedOperations = computed(() => selectedOperations.value.filter((request) => request.status === 'failed'));
const completedOperations = computed(() =>
  selectedOperations.value.filter((request) => request.status === 'succeeded')
);
const selectedControlReviews = computed(() => {
  const draft = latestDraft.value;
  if (!draft) {
    return [];
  }

  return store.state.controlReviewItems
    .filter((item) => item.requestDraftId === draft.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
});
const pendingControlReviews = computed(() =>
  selectedControlReviews.value.filter((item) => item.status === 'review_required')
);
const currentControlReview = computed(() => pendingControlReviews.value[0] ?? selectedControlReviews.value[0]);
const currentOperation = computed<AgentRequest | undefined>(
  () =>
    runningOperations.value[0] ??
    waitingOperations.value[0] ??
    failedOperations.value[0] ??
    completedOperations.value[completedOperations.value.length - 1]
);
const operationCardTitle = computed(() => {
  if (!currentOperation.value) {
    return 'API対象';
  }

  if (currentOperation.value.status === 'failed') {
    return '確認が必要な工程';
  }

  if (currentOperation.value.status === 'running') {
    return '実行中の工程';
  }

  return '次のAPI対象';
});
const activeDraft = computed(() => latestDraft.value);
const creatingNewRun = computed(() => store.runPhase === 'saving' && !store.activeDraftId);
const visiblePurpose = computed(() => {
  if (creatingNewRun.value) {
    return store.activePurpose;
  }

  return activeDraft.value?.purpose ?? store.activePurpose;
});
const focusedDraftLabel = computed(() => (selectedHistoryDraftId.value ? '選択中の実行' : '今回の依頼'));
const visibleSourceStatus = computed(() => {
  const sourceValue = creatingNewRun.value ? draftInput.sourceUri : activeDraft.value?.source.uri;
  return sourceValue?.trim() ? '対象動画は入力済み' : '対象動画未指定';
});
const visibleDraftStatus = computed(() => {
  if (store.runPhase === 'saving') {
    return { label: '保存中', color: 'primary' };
  }

  if (store.runPhase === 'handing_off') {
    return { label: 'AIへ渡し中', color: 'primary' };
  }

  if (store.runPhase === 'running') {
    return { label: 'AI実行中', color: 'primary' };
  }

  if (store.runPhase === 'review_required' || pendingControlReviews.value.length > 0) {
    return { label: '人間確認待ち', color: 'warning' };
  }

  if (store.runPhase === 'completed') {
    return { label: '実行完了', color: 'success' };
  }

  if (store.runPhase === 'error') {
    return { label: '確認が必要', color: 'error' };
  }

  if (!activeDraft.value) {
    return { label: '未作成', color: 'blue-grey' };
  }

  return {
    label: draftStatusLabel[activeDraft.value.status],
    color: activeDraft.value.status === 'draft' ? 'warning' : 'success'
  };
});
const runHistory = computed(() =>
  store.state.requestDrafts.map((draft) => {
    const operations = store.state.agentRequests.filter((request) => request.requestDraftId === draft.id);
    const reviews = store.state.controlReviewItems.filter((item) => item.requestDraftId === draft.id);
    const pendingReviews = reviews.filter((item) => item.status === 'review_required').length;
    const stoppedReviews = reviews.filter((item) => ['rejected', 'changes_requested'].includes(item.status)).length;
    const completed = operations.filter((request) => request.status === 'succeeded').length;
    const failed = operations.filter((request) => request.status === 'failed').length;
    const active = operations.filter((request) => ['queued', 'waiting', 'running'].includes(request.status)).length;
    const artifacts = operations.reduce((total, request) => total + request.fileRefIds.length, 0);
    const operationUpdatedTimes = operations.map((request) => request.updatedAt).sort();
    const updatedAt = operationUpdatedTimes[operationUpdatedTimes.length - 1] ?? draft.updatedAt;
    let statusLabel = '承認待ち';
    let color = 'warning';
    let summary = 'まだAIエージェントへ渡していません';

    if (failed > 0) {
      statusLabel = '失敗';
      color = 'error';
      summary = `${failed}件の工程で確認が必要です`;
    } else if (pendingReviews > 0) {
      statusLabel = '人間確認待ち';
      color = 'warning';
      summary = `${pendingReviews}件の判断が承認待ちです`;
    } else if (stoppedReviews > 0) {
      statusLabel = '人間判断済み';
      color = 'warning';
      summary = '却下または修正依頼で後続工程を止めています';
    } else if (active > 0) {
      statusLabel = '実行中';
      color = 'primary';
      summary = `${completed} / ${operations.length} 工程まで完了`;
    } else if (operations.length > 0) {
      statusLabel = '完了';
      color = 'success';
      summary = `${completed}工程完了、成果物 ${artifacts}件`;
    }

    return {
      id: draft.id,
      purpose: draft.purpose,
      updatedAt,
      statusLabel,
      color,
      summary
    };
  })
);

const stage = computed(() => {
  if (store.runPhase === 'saving') {
    return { text: '依頼保存中', color: 'primary' };
  }

  if (store.runPhase === 'handing_off') {
    return { text: 'AIへ渡し中', color: 'primary' };
  }

  if (store.runPhase === 'running') {
    return { text: 'AI実行中', color: 'primary' };
  }

  if (store.runPhase === 'review_required' || pendingControlReviews.value.length > 0) {
    return { text: '人間確認待ち', color: 'warning' };
  }

  if (store.runPhase === 'completed' && selectedOperations.value.length > 0) {
    return { text: `${selectedOperations.value.length}工程完了`, color: 'success' };
  }

  if (store.runPhase === 'error') {
    return { text: '入力確認', color: 'error' };
  }

  if (failedOperations.value.length > 0) {
    return { text: '失敗確認', color: 'error' };
  }

  if (runningOperations.value.length > 0) {
    return { text: 'API実行中', color: 'primary' };
  }

  if (waitingOperations.value.length > 0) {
    return { text: 'API取得待ち', color: 'info' };
  }

  if (selectedOperations.value.length > 0) {
    return { text: `${selectedOperations.value.length}工程完了`, color: 'success' };
  }

  if (activeDraft.value?.status === 'approved') {
    return { text: 'API準備中', color: 'info' };
  }

  if (pendingDrafts.value.length > 0) {
    return { text: '承認待ち', color: 'warning' };
  }

  return { text: '新規依頼', color: 'blue-grey' };
});

const operationProgressPercent = computed(() => {
  if (store.runPhase === 'saving') {
    return 8;
  }

  if (store.runPhase === 'handing_off') {
    return 18;
  }

  if (store.runPhase === 'running' && selectedOperations.value.length === 0) {
    return 28;
  }

  if (selectedOperations.value.length === 0) {
    return 0;
  }

  return Math.round((completedOperations.value.length / selectedOperations.value.length) * 100);
});

const executionSummary = computed(() => {
  if (store.runPhase === 'saving') {
    return {
      title: 'AIエージェント: まだ開始前',
      detail: '依頼を保存しています'
    };
  }

  if (store.runPhase === 'handing_off') {
    return {
      title: 'AIエージェント: 受け取り中',
      detail: '承認済み依頼から作業キューを作っています'
    };
  }

  if (store.runPhase === 'running') {
    return {
      title: 'AIエージェント: 実行中',
      detail: currentOperation.value ? `${currentOperation.value.label} を処理しています` : '作業キューを確認しています'
    };
  }

  if (store.runPhase === 'review_required' || pendingControlReviews.value.length > 0) {
    return {
      title: 'AIエージェント: 人間確認待ち',
      detail: currentControlReview.value?.summary ?? 'AI判断の確認が必要です'
    };
  }

  if (store.runPhase === 'completed' && selectedOperations.value.length > 0) {
    return {
      title: 'AIエージェント: 待機中',
      detail: '仮実装は動画生成まで到達しました。成果物から生成動画を確認できます'
    };
  }

  if (store.runPhase === 'error') {
    return {
      title: 'AIエージェント: 停止',
      detail: store.errorMessage || '依頼をAIエージェントへ渡せませんでした'
    };
  }

  if (!activeDraft.value) {
    return {
      title: 'AIエージェント: 未開始',
      detail: '依頼はまだ渡されていません'
    };
  }

  if (activeDraft.value.status === 'draft') {
    return {
      title: 'AIエージェント: 未開始',
      detail: '承認後に作業キューを作ります'
    };
  }

  if (failedOperations.value.length > 0) {
    return {
      title: 'AIエージェント: 停止',
      detail: `${failedOperations.value[0].label} で止まっています`
    };
  }

  if (runningOperations.value.length > 0) {
    return {
      title: 'AIエージェント: 実行中',
      detail: `${runningOperations.value[0].label} を実行中です`
    };
  }

  if (waitingOperations.value.length > 0) {
    return {
      title: 'AIエージェント: 待機中',
      detail: pendingControlReviews.value.length > 0
        ? '人間確認が終わるまで次の工程を開始しません'
        : `${waitingOperations.value[0].label} の開始待ちです`
    };
  }

  if (selectedOperations.value.length > 0) {
    return {
      title: 'AIエージェント: 待機中',
      detail: '仮実装は動画生成まで到達しました。成果物から生成動画を確認できます'
    };
  }

  return {
    title: 'AIエージェント: 準備中',
    detail: '作業キューの作成待ちです'
  };
});

const actionSummary = computed(() => {
  if (!activeDraft.value) {
    return {
      title: '次の操作',
      detail: '依頼内容と対象動画を入力して、AIエージェントへ渡します'
    };
  }

  if (activeDraft.value.status === 'draft') {
    return {
      title: '次の操作',
      detail: '内容を確認して「依頼をAIに渡す」を押します'
    };
  }

  if (failedOperations.value.length > 0) {
    return {
      title: '確認が必要',
      detail: `${failedOperations.value[0].label} で止まっています`
    };
  }

  if (pendingControlReviews.value.length > 0) {
    return {
      title: '確認が必要',
      detail: currentControlReview.value?.humanQuestion ?? 'AI判断を確認してください'
    };
  }

  if (runningOperations.value.length > 0) {
    return {
      title: '今動いている工程',
      detail: runningOperations.value[0].label
    };
  }

  if (waitingOperations.value.length > 0) {
    return {
      title: '次に動く工程',
      detail: waitingOperations.value[0].label
    };
  }

  if (selectedOperations.value.length > 0) {
    return {
      title: '次の操作',
      detail: '仮実装は最後まで通りました。成果物を見ながら次の差し替え箇所を確認できます'
    };
  }

  return {
    title: '次の操作',
    detail: 'AIエージェント用の作業作成を待っています'
  };
});

const stepRows = computed(() =>
  (activeDraft.value?.steps ?? store.workflowSteps).map((step) => {
    const operation = selectedOperations.value.find((request) => request.type === step.type);
    return {
      key: step.type,
      label: step.label,
      status: operation?.status,
      statusLabel: operation ? operationStatusLabel[operation.status] : '未投入',
      color: operation ? operationStatusColor[operation.status] : 'blue-grey',
      meaning: operation?.result?.meaning ?? '承認後にAIエージェントがAPIで処理します'
    };
  })
);
const successfulStepCount = computed(() => stepRows.value.filter((row) => row.status === 'succeeded').length);
const hiddenSuccessfulStepCount = computed(() => showSuccessfulSteps.value ? 0 : successfulStepCount.value);
const visibleStepRows = computed(() =>
  stepRows.value.filter((row) => {
    if (row.status === 'succeeded') {
      return showSuccessfulSteps.value;
    }

    return row.status === 'queued' || row.status === 'waiting' || row.status === 'running' || row.status === 'failed';
  })
);
const controlReviewDecision = computed(() => {
  const review = currentControlReview.value;
  if (!review) {
    return undefined;
  }

  return store.state.decisionLogs.find((item) => item.id === review.decisionLogId);
});
const controlReviewAction = computed(() => {
  const review = currentControlReview.value;
  if (!review?.resolvedByActionId) {
    return undefined;
  }

  return store.state.humanReviewActions.find((item) => item.id === review.resolvedByActionId);
});
const selectedArtifacts = computed(() => {
  const artifactRows: Array<{
    operation: AgentRequest;
    fileRef: FileRef;
    outputType: string;
  }> = [];

  for (const operation of selectedOperations.value) {
    const fileRefId = operation.result?.fileRefId;
    if (!fileRefId) {
      continue;
    }

    const fileRef = store.state.fileRefs.find((item) => item.id === fileRefId);
    if (!fileRef) {
      continue;
    }

    artifactRows.push({
      operation,
      fileRef,
      outputType: operation.result?.outputType ?? fileRef.kind
    });
  }

  return artifactRows;
});

function flowIcon(status?: AgentRequestStatus): string {
  if (status === 'succeeded') {
    return 'mdi-check';
  }

  if (status === 'running') {
    return 'mdi-play';
  }

  if (status === 'failed') {
    return 'mdi-alert';
  }

  if (status === 'queued' || status === 'waiting') {
    return 'mdi-clock-outline';
  }

  return 'mdi-circle-outline';
}

function formatTime(value: string): string {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

async function submitDraft() {
  selectedHistoryDraftId.value = '';
  currentView.value = 'main';
  showSuccessfulSteps.value = false;
  await store.createRequestDraft({ ...draftInput });
}

async function approveLatestDraft() {
  if (!activeDraft.value || activeDraft.value.status !== 'draft') {
    return;
  }

  showSuccessfulSteps.value = false;
  await store.approveRequestDraft(activeDraft.value.id);
}

function selectHistoryDraft(id: string) {
  selectedHistoryDraftId.value = id;
  currentView.value = 'main';
  showSuccessfulSteps.value = false;
}

function openHistory() {
  currentView.value = 'history';
}

function closeHistory() {
  currentView.value = 'main';
}

async function submitControlReview(review: ControlReviewItem, action: HumanReviewActionType) {
  const reason = reviewReasons[review.id] ?? '';
  await store.submitControlReview(review.id, action, reason);
  reviewReasons[review.id] = '';
}

async function loadArtifactPreview(fileRef: FileRef) {
  if (!fileRef.mimeType.includes('json')) {
    return;
  }

  artifactPreviews[fileRef.id] = await fetchArtifactText(fileRef.uri);
}

onMounted(() => {
  store.refresh();
});
</script>

<template>
  <v-app>
    <v-main class="app-main">
      <v-container class="workspace" fluid>
        <header class="topbar">
          <div>
            <p class="eyebrow">zev2</p>
            <h1>AIエージェントに依頼</h1>
          </div>
          <div class="top-actions">
            <v-btn v-if="currentView === 'main'" prepend-icon="mdi-history" variant="text" @click="openHistory">
              実行履歴を見る
            </v-btn>
            <v-btn prepend-icon="mdi-refresh" :loading="store.loading" @click="store.refresh">
              更新
            </v-btn>
          </div>
        </header>

        <v-alert v-if="store.message" type="success" density="compact" variant="tonal" class="message">
          {{ store.message }}
        </v-alert>
        <v-alert v-if="store.errorMessage" type="error" density="compact" variant="tonal" class="message">
          {{ store.errorMessage }}
        </v-alert>

        <section v-if="currentView === 'history'" class="history-view">
          <div class="history-header">
            <div>
              <h2>実行履歴</h2>
            </div>
            <v-btn prepend-icon="mdi-arrow-left" variant="text" @click="closeHistory">
              メインへ戻る
            </v-btn>
          </div>

          <div class="history-list">
            <article v-for="item in runHistory" :key="item.id" class="history-item">
              <div>
                <div class="history-item-title">
                  <strong>{{ item.purpose }}</strong>
                  <v-chip size="small" :color="item.color" variant="tonal">
                    {{ item.statusLabel }}
                  </v-chip>
                </div>
                <p>{{ item.summary }}</p>
                <span>{{ formatTime(item.updatedAt) }}</span>
              </div>
              <v-btn color="primary" variant="tonal" @click="selectHistoryDraft(item.id)">
                この結果を見る
              </v-btn>
            </article>
          </div>
        </section>

        <section v-else class="workspace-grid">
          <v-sheet class="panel status-panel" rounded border>
            <div class="agent-card">
              <div class="agent-summary">
                <div class="agent-icon">
                  <v-icon size="21">mdi-robot-outline</v-icon>
                </div>
                <div>
                  <strong>{{ executionSummary.title }}</strong>
                  <p>{{ executionSummary.detail }}</p>
                  <div class="status-meta">
                    <v-chip size="small" color="blue-grey" variant="tonal">仮実装: ZEV参照</v-chip>
                    <span v-if="store.lastChangedAt">最終更新 {{ formatTime(store.lastChangedAt) }}</span>
                  </div>
                </div>
              </div>
              <div class="agent-progress" :style="{ '--progress': `${operationProgressPercent}%` }">
                <div />
              </div>
            </div>

            <div v-if="visiblePurpose" class="request-card">
              <div>
                <span>{{ focusedDraftLabel }}</span>
                <strong>{{ visiblePurpose }}</strong>
                <p>{{ visibleSourceStatus }}</p>
              </div>
              <div class="request-actions">
                <v-chip size="small" :color="visibleDraftStatus.color">
                  {{ visibleDraftStatus.label }}
                </v-chip>
                <v-btn
                  v-if="activeDraft?.status === 'draft' && store.runPhase === 'idle'"
                  color="primary"
                  prepend-icon="mdi-check"
                  :loading="store.loading"
                  @click="approveLatestDraft"
                >
                  承認してAPIへ渡す
                </v-btn>
              </div>
            </div>

            <div v-else class="empty">依頼はまだありません</div>

            <div class="action-summary">
              <span>{{ actionSummary.title }}</span>
              <strong>{{ actionSummary.detail }}</strong>
            </div>

            <div v-if="currentControlReview" class="control-review-panel">
              <div class="control-review-heading">
                <div>
                  <span>人間確認</span>
                  <strong>{{ currentControlReview.title }}</strong>
                </div>
                <v-chip
                  size="small"
                  :color="controlReviewStatusColor[currentControlReview.status]"
                  variant="tonal"
                >
                  {{ controlReviewStatusLabel[currentControlReview.status] }}
                </v-chip>
              </div>
              <p>{{ currentControlReview.summary }}</p>
              <dl class="control-review-details">
                <div>
                  <dt>AIの判断</dt>
                  <dd>{{ controlReviewDecision?.decision ?? currentControlReview.summary }}</dd>
                </div>
                <div>
                  <dt>理由</dt>
                  <dd>{{ currentControlReview.reason }}</dd>
                </div>
                <div>
                  <dt>次に起きる処理</dt>
                  <dd>{{ currentControlReview.proposedNextState }}</dd>
                </div>
                <div v-if="currentControlReview.evidenceRefs.length > 0">
                  <dt>根拠</dt>
                  <dd>
                    <span
                      v-for="evidence in currentControlReview.evidenceRefs"
                      :key="`${evidence.kind}-${evidence.refId}`"
                    >
                      {{ evidence.meaning }}
                    </span>
                  </dd>
                </div>
                <div v-if="controlReviewAction">
                  <dt>人間の判断</dt>
                  <dd>{{ controlReviewAction.reason }}</dd>
                </div>
              </dl>
              <div v-if="currentControlReview.status === 'review_required'" class="review-actions">
                <v-textarea
                  v-model="reviewReasons[currentControlReview.id]"
                  label="理由"
                  rows="2"
                  auto-grow
                  density="compact"
                  hide-details
                />
                <div class="review-button-row">
                  <v-btn
                    color="primary"
                    prepend-icon="mdi-check"
                    :loading="store.loading"
                    @click="submitControlReview(currentControlReview, 'approve')"
                  >
                    承認して続行
                  </v-btn>
                  <v-btn
                    color="warning"
                    variant="tonal"
                    prepend-icon="mdi-pencil"
                    :loading="store.loading"
                    @click="submitControlReview(currentControlReview, 'request_changes')"
                  >
                    修正依頼
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="tonal"
                    prepend-icon="mdi-close"
                    :loading="store.loading"
                    @click="submitControlReview(currentControlReview, 'reject')"
                  >
                    却下
                  </v-btn>
                </div>
              </div>
            </div>

            <div class="flow-panel">
              <div class="flow-heading">
                <div>
                  <span>処理の流れ</span>
                  <strong v-if="hiddenSuccessfulStepCount > 0">
                    成功済み{{ hiddenSuccessfulStepCount }}件は詳細を閉じています
                  </strong>
                </div>
                <v-btn
                  v-if="successfulStepCount > 0"
                  size="small"
                  variant="text"
                  @click="showSuccessfulSteps = !showSuccessfulSteps"
                >
                  {{ showSuccessfulSteps ? '成功済みを隠す' : `成功済み${successfulStepCount}件を見る` }}
                </v-btn>
              </div>
              <div class="flow-rail" :style="{ '--step-count': String(stepRows.length || 1) }">
                <div
                  v-for="row in stepRows"
                  :key="row.key"
                  class="flow-step"
                  :class="`is-${row.status ?? 'pending'}`"
                >
                  <div class="flow-dot">
                    <v-icon size="16">{{ flowIcon(row.status) }}</v-icon>
                  </div>
                  <span>{{ row.label }}</span>
                </div>
              </div>
            </div>

            <div v-if="visibleStepRows.length > 0" class="step-list">
              <span>{{ showSuccessfulSteps ? '工程の詳細' : '確認が必要な工程' }}</span>
              <article v-for="row in visibleStepRows" :key="row.key">
                <div>
                  <strong>{{ row.label }}</strong>
                  <p>{{ row.meaning }}</p>
                </div>
                <v-chip size="small" :color="row.color" variant="tonal">
                  {{ row.statusLabel }}
                </v-chip>
              </article>
            </div>
            <div v-else-if="selectedOperations.length === 0" class="collapsed-note">
              承認前のため、工程の詳細はまだありません。
            </div>

            <div v-if="selectedArtifacts.length > 0" class="artifact-panel">
              <div class="artifact-heading">
                <span>成果物</span>
                <strong>{{ selectedArtifacts.length }}件</strong>
              </div>
              <article v-for="artifact in selectedArtifacts" :key="artifact.fileRef.id" class="artifact-card">
                <div class="artifact-card-heading">
                  <div>
                    <strong>{{ artifact.operation.label }}</strong>
                    <p>{{ artifact.operation.result?.meaning }}</p>
                  </div>
                  <v-chip size="small" color="blue-grey" variant="tonal">
                    {{ artifact.outputType }}
                  </v-chip>
                </div>
                <a :href="artifact.fileRef.uri" target="_blank" rel="noreferrer">
                  {{ artifact.fileRef.uri }}
                </a>
                <video
                  v-if="artifact.fileRef.mimeType.startsWith('video/')"
                  class="artifact-video"
                  controls
                  :src="artifact.fileRef.uri"
                />
                <div v-else-if="artifact.fileRef.mimeType.includes('json')" class="artifact-preview">
                  <v-btn
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-file-eye-outline"
                    @click="loadArtifactPreview(artifact.fileRef)"
                  >
                    中身を見る
                  </v-btn>
                  <pre v-if="artifactPreviews[artifact.fileRef.id]">{{ artifactPreviews[artifact.fileRef.id] }}</pre>
                </div>
              </article>
            </div>

            <div v-if="currentOperation && currentOperation.status !== 'succeeded'" class="operation-card">
              <span>{{ operationCardTitle }}</span>
              <strong>{{ currentOperation.label }}</strong>
              <p>{{ operationStatusLabel[currentOperation.status] }}</p>
            </div>
          </v-sheet>

          <v-sheet class="panel request-panel" rounded border>
            <div class="panel-heading">
              <h2>依頼</h2>
            </div>

            <v-form class="request-form" @submit.prevent="submitDraft">
              <v-textarea
                v-model="draftInput.purpose"
                label="依頼内容"
                rows="3"
                auto-grow
                density="compact"
              />
              <v-text-field
                v-model="draftInput.sourceUri"
                label="対象動画"
                placeholder="https://... または /path/to/video.mp4"
                density="compact"
              />
              <div class="form-grid">
                <v-select
                  v-model="draftInput.durationLabel"
                  :items="['60秒以内', '45秒以内', '30秒以内']"
                  label="尺"
                  density="compact"
                />
                <v-select
                  v-model="draftInput.candidateCountLabel"
                  :items="['3候補', '5候補', '1候補']"
                  label="候補"
                  density="compact"
                />
              </div>
              <v-select
                v-model="draftInput.preset"
                :items="[
                  { title: 'ショート向け', value: 'shorts_default' },
                  { title: '字幕重視', value: 'caption_first' },
                  { title: '安全確認', value: 'safe_review' }
                ]"
                label="方針"
                density="compact"
              />
              <v-switch
                v-model="draftInput.includeRender"
                color="primary"
                label="動画生成まで含める"
                hide-details
              />
              <v-btn block color="primary" prepend-icon="mdi-send" type="submit" :loading="store.loading">
                依頼をAIに渡す
              </v-btn>
            </v-form>
          </v-sheet>
        </section>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-main {
  background: #f5f7f9;
  color: #17212b;
  min-height: 100vh;
}

.workspace {
  max-width: 1180px;
  padding: 14px 16px 32px;
}

.topbar,
.top-actions,
.history-view,
.history-list,
.workspace-grid,
.form-grid,
.request-actions,
.status-meta {
  display: grid;
  gap: 10px;
}

.topbar {
  align-items: center;
  grid-template-columns: minmax(0, 1fr) auto;
  margin-bottom: 10px;
}

.top-actions {
  grid-auto-flow: column;
  justify-content: end;
}

.history-view {
  gap: 10px;
}

.history-header,
.history-item,
.history-item-title {
  align-items: center;
  display: grid;
  gap: 10px;
}

.history-header {
  grid-template-columns: minmax(0, 1fr) auto;
}

.history-header span,
.history-item span {
  color: #607080;
  font-size: 13px;
  font-weight: 700;
}

.history-list {
  gap: 8px;
}

.history-item {
  background: #ffffff;
  border: 1px solid #dce4ec;
  border-radius: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 10px 12px;
}

.history-item-title {
  grid-template-columns: minmax(0, 1fr) auto;
}

.history-item p {
  color: #465666;
  margin-top: 6px;
}

.eyebrow,
.panel-heading span,
.status-meta span,
.request-card span,
.action-summary span,
.operation-card span,
.step-list span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 22px;
  font-weight: 780;
}

h2 {
  font-size: 17px;
}

.message {
  margin-bottom: 10px;
}

.workspace-grid {
  align-items: start;
  grid-template-columns: minmax(360px, 1fr) minmax(320px, 380px);
}

.panel {
  background: #ffffff;
  border-color: #dce4ec;
  padding: 12px;
}

.panel-heading {
  margin-bottom: 10px;
}

.request-form {
  display: grid;
  gap: 8px;
}

.form-grid {
  grid-template-columns: 1fr 1fr;
}

.status-panel {
  display: grid;
  gap: 10px;
}

.flow-panel {
  border-top: 1px solid #e2e8ef;
  padding-top: 10px;
}

.flow-heading {
  align-items: start;
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
  margin-bottom: 8px;
}

.flow-heading span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.flow-rail {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(var(--step-count), minmax(0, 1fr));
  overflow: hidden;
  padding-bottom: 2px;
}

.flow-step {
  align-items: center;
  color: #607080;
  display: grid;
  gap: 5px;
  justify-items: center;
  min-width: 0;
  position: relative;
  text-align: center;
}

.flow-step::before {
  background: #d8e1e9;
  content: "";
  height: 2px;
  left: calc(-50% - 4px);
  position: absolute;
  top: 13px;
  width: calc(100% + 8px);
  z-index: 0;
}

.flow-step:first-child::before {
  display: none;
}

.flow-dot {
  align-items: center;
  background: #eef2f5;
  border: 2px solid #cad6df;
  border-radius: 50%;
  display: grid;
  height: 26px;
  justify-items: center;
  position: relative;
  width: 26px;
  z-index: 1;
}

.flow-step span {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.flow-step.is-succeeded {
  color: #1f7a4d;
}

.flow-step.is-succeeded .flow-dot {
  background: #e7f5ed;
  border-color: #32a66a;
}

.flow-step.is-running {
  color: #1d5fa8;
}

.flow-step.is-running .flow-dot {
  background: #e8f2ff;
  border-color: #2f7ed8;
}

.flow-step.is-failed {
  color: #b42318;
}

.flow-step.is-failed .flow-dot {
  background: #fff0ef;
  border-color: #d92d20;
}

.flow-step.is-queued .flow-dot,
.flow-step.is-waiting .flow-dot {
  background: #fff7e6;
  border-color: #d89120;
}

.agent-card {
  background: #eef6ff;
  border-radius: 8px;
  display: grid;
  gap: 10px;
  padding: 12px;
  overflow: hidden;
}

.agent-summary {
  align-items: start;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
}

.agent-icon {
  align-items: center;
  background: #ffffff;
  border: 1px solid #cfe0ef;
  border-radius: 50%;
  color: #1d5fa8;
  display: grid;
  height: 36px;
  justify-items: center;
  width: 36px;
}

.agent-card strong {
  display: block;
  font-size: 18px;
}

.agent-card p {
  color: #34495e;
  margin-top: 4px;
}

.agent-progress {
  background: #dce8f1;
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
  width: 100%;
}

.agent-progress div {
  background: #45a66b;
  border-radius: inherit;
  height: 100%;
  transition: width 160ms ease;
  width: var(--progress);
}

.status-meta {
  align-items: center;
  grid-auto-flow: column;
  justify-content: start;
  margin: 8px 0;
}

.request-card,
.action-summary,
.control-review-panel,
.artifact-panel,
.operation-card,
.step-list {
  border-top: 1px solid #e2e8ef;
  padding-top: 10px;
}

.request-card strong,
.operation-card strong,
.step-list strong {
  display: block;
  margin-top: 3px;
}

.request-card p,
.operation-card p,
.step-list p {
  color: #465666;
  margin-top: 3px;
  overflow-wrap: anywhere;
}

.step-list article {
  align-items: start;
  border-top: 1px solid #edf1f5;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 8px 0;
}

.step-list article:first-of-type {
  border-top: 0;
}

.request-actions {
  grid-auto-flow: row;
  justify-items: start;
  margin-top: 8px;
}

.action-summary {
  background: #f4f6f8;
  border-radius: 8px;
  padding: 10px;
}

.action-summary strong {
  display: block;
  margin-top: 4px;
}

.control-review-panel {
  display: grid;
  gap: 10px;
}

.control-review-heading {
  align-items: start;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.control-review-heading span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.control-review-heading strong {
  display: block;
  margin-top: 3px;
}

.control-review-panel p,
.control-review-details {
  color: #465666;
}

.control-review-details {
  display: grid;
  gap: 8px;
  margin: 0;
}

.control-review-details div {
  background: #f4f6f8;
  border-radius: 8px;
  display: grid;
  gap: 3px;
  padding: 8px;
}

.control-review-details dt {
  color: #607080;
  font-size: 12px;
  font-weight: 700;
}

.control-review-details dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.control-review-details dd span {
  display: block;
}

.review-actions {
  display: grid;
  gap: 8px;
}

.review-button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.artifact-panel {
  display: grid;
  gap: 8px;
}

.artifact-heading,
.artifact-card-heading {
  align-items: start;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.artifact-heading span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.artifact-card {
  border-top: 1px solid #edf1f5;
  display: grid;
  gap: 8px;
  padding-top: 8px;
}

.artifact-card:first-of-type {
  border-top: 0;
}

.artifact-card p,
.artifact-card a {
  color: #465666;
  margin-top: 3px;
  overflow-wrap: anywhere;
}

.artifact-card a {
  font-size: 12px;
}

.artifact-preview {
  display: grid;
  gap: 8px;
}

.artifact-preview pre {
  background: #101820;
  border-radius: 8px;
  color: #f8fafc;
  font-size: 12px;
  line-height: 1.5;
  max-height: 260px;
  overflow: auto;
  padding: 10px;
  white-space: pre-wrap;
}

.artifact-video {
  aspect-ratio: 9 / 16;
  background: #101820;
  border-radius: 8px;
  max-height: 420px;
  width: min(100%, 260px);
}

.empty {
  color: #607080;
  font-size: 14px;
}

.collapsed-note {
  background: #f4f6f8;
  border-radius: 8px;
  color: #465666;
  font-size: 14px;
  padding: 12px;
}

@media (max-width: 700px) {
  .topbar,
  .history-header,
  .history-item,
  .history-item-title,
  .workspace-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .top-actions {
    grid-auto-flow: row;
    justify-content: stretch;
  }

  .flow-heading {
    grid-template-columns: 1fr;
  }

  .agent-summary {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .top-actions :deep(.v-btn),
  .top-actions :deep(.v-chip) {
    justify-content: center;
    width: 100%;
  }

  h1 {
    font-size: 21px;
  }
}
</style>
