<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  DEFAULT_GEMINI_MODEL,
  findById,
  type AgentRequest,
  type RequestDraftInput
} from '@zev2/shared';
import { useControlQueueStore } from './stores/controlQueue';

type RedoScope = 'theme_selection' | 'edit_plan' | 'adjustment';

const store = useControlQueueStore();
const submitting = ref(false);
const activeRedoScope = ref<RedoScope | ''>('');
const requestDefaultsApplied = ref(false);
const initialPurpose = 'ショート動画を作成する';
let refreshTimer: number | undefined;

const requestInput = reactive<RequestDraftInput>({
  purpose: initialPurpose,
  sourceUri: '',
  durationLabel: '60秒以内',
  themeCountLabel: '3テーマ',
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
      label: 'テーマ探索',
      title: store.runtimeConfig.themeExploration.mode === 'fixed' ? '固定候補' : 'Gemini API',
      description: store.runtimeConfig.themeExploration.mode === 'fixed'
        ? '固定済みのテーマ候補を使います'
        : '文字起こしをGemini APIへ送り、切り抜きテーマ候補を作ります'
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

  return findById(store.state.fileRefs, fileRefId)?.uri ?? '';
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

async function redoVideo(scope: RedoScope) {
  const draft = currentDraft.value;
  if (!draft) {
    return;
  }

  activeRedoScope.value = scope;
  const reasonByScope: Record<RedoScope, string> = {
    theme_selection: 'テーマ決定前から作り直す',
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

    <section v-if="outputVideoUri" class="video-panel">
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
          {{ activeRedoScope === 'theme_selection' ? '作り直し中' : 'テーマ決定前から作り直す' }}
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
  min-height: 100vh;
  background: #f5f7f9;
  color: #17202a;
  display: grid;
  gap: 24px;
  padding: 32px;
}

.request-panel,
.status-panel,
.video-panel {
  width: min(960px, 100%);
  margin: 0 auto;
}

.request-panel,
.status-panel {
  background: #ffffff;
  border: 1px solid #d8e0e7;
  border-radius: 8px;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #607080;
  font-size: 13px;
  font-weight: 700;
}

h1,
h2 {
  margin: 0;
  line-height: 1.2;
}

h1 {
  font-size: 30px;
}

h2 {
  font-size: 22px;
}

.request-form {
  display: grid;
  gap: 18px;
  margin-top: 24px;
}

.runtime-summary {
  display: grid;
  gap: 8px;
  border: 1px solid #cbd8e2;
  border-radius: 8px;
  background: #f7fafc;
  padding: 14px;
}

.runtime-summary-item {
  display: grid;
  gap: 8px;
}

.runtime-summary-item + .runtime-summary-item {
  border-top: 1px solid #d8e0e7;
  padding-top: 12px;
}

.runtime-summary p {
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
  resize: vertical;
  min-height: 112px;
  border: 1px solid #c7d2dc;
  border-radius: 8px;
  padding: 14px;
  color: #17202a;
  font: inherit;
}

button {
  width: fit-content;
  border: 0;
  border-radius: 8px;
  background: #1264a3;
  color: #ffffff;
  padding: 12px 18px;
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
  gap: 16px;
}

.progress-pill {
  border-radius: 999px;
  background: #e8eef4;
  color: #34495e;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.error-message {
  margin: 18px 0 0;
  border-left: 4px solid #b42318;
  background: #fff2f1;
  padding: 12px;
  color: #8a1f17;
  font-weight: 700;
}

.status-message {
  margin: 18px 0 0;
  border-left: 4px solid #1264a3;
  background: #edf6ff;
  padding: 12px;
  color: #173a5e;
  font-weight: 800;
}

.step-list {
  list-style: none;
  display: grid;
  gap: 8px;
  margin: 22px 0 0;
  padding: 0;
}

.step-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #d8e0e7;
  border-radius: 8px;
  padding: 12px 14px;
  background: #ffffff;
}

.step-item strong {
  font-size: 13px;
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
  gap: 16px;
}

.redo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

video {
  width: min(420px, 100%);
  max-height: 78vh;
  background: #000000;
  border-radius: 8px;
}

@media (max-width: 640px) {
  .app-shell {
    padding: 18px;
  }

  .request-panel,
  .status-panel {
    padding: 18px;
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
}
</style>
