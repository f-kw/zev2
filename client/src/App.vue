<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type {
  AgentRequest,
  AgentRequestType,
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
const selectedProcessTab = ref<ProcessTabKey | ''>('');
const showRequestForm = ref(false);
const showDetailData = ref(false);
const reviewReasons = reactive<Record<string, string>>({});
const artifactPreviews = reactive<Record<string, string>>({});
const expandedArtifacts = reactive<Record<string, boolean>>({});

type ProcessTabKey = 'request' | 'candidates' | 'edit' | 'video' | 'notes';
type ProcessStatus = 'pending' | 'running' | 'review' | 'ready' | 'done' | 'blocked';

interface ArtifactRow {
  operation: AgentRequest;
  fileRef: FileRef;
  outputType: string;
}

interface ProcessTab {
  key: ProcessTabKey;
  label: string;
  question: string;
  helper: string;
  status: ProcessStatus;
  statusLabel: string;
  icon: string;
}

interface ArtifactGuideItem {
  label: string;
  meaning: string;
}

interface CandidateReviewSummary {
  id: string;
  title: string;
  rangeLabel: string;
  hookText: string;
  transcriptText: string;
  reason: string;
  visualCheck: string;
  riskLabel: string;
  nextActionLabel: string;
  evidenceLabel: string;
  roleLabel: string;
}

interface EditPlanSummary {
  selectedCandidateId: string;
  title: string;
  rangeLabel: string;
  hookText: string;
  telopTexts: string[];
  changes: string[];
  renderReadyLabel: string;
}

interface ReviewChoice {
  action: HumanReviewActionType;
  label: string;
  title: string;
  body: string;
  color: string;
  icon: string;
}

interface FixSummaryCard {
  label: string;
  title: string;
  body: string;
}

const draftInput = reactive<RequestDraftInput>({
  purpose: 'この配信からショート候補を作って、切り抜き理由とテロップ案まで出す',
  sourceUri: '',
  durationLabel: '60秒以内',
  candidateCountLabel: '3候補',
  preset: 'shorts_default',
  includeRender: true
});

const draftStatusLabel = {
  draft: '開始前',
  approved: '作成中',
  rejected: '却下'
} satisfies Record<RequestDraftStatus, string>;

const operationStatusLabel = {
  queued: '準備中',
  running: '作成中',
  waiting: '前の段階待ち',
  succeeded: '確認できます',
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

const processOperationTypes: Record<ProcessTabKey, AgentRequestType[]> = {
  request: ['prepare_video'],
  candidates: ['run_stt', 'find_candidates', 'gemini_candidate_review'],
  edit: ['create_edit_plan', 'apply_adjustment'],
  video: ['render_video'],
  notes: []
};

const operationUserLabel = {
  prepare_video: '対象動画',
  run_stt: '話した内容',
  find_candidates: '候補区間',
  gemini_candidate_review: '映像確認メモ',
  create_edit_plan: '編集案',
  apply_adjustment: '生成前の確認',
  render_video: '生成動画'
} satisfies Record<AgentRequestType, string>;

const operationUserMeaning = {
  prepare_video: 'この実行で使う動画を確認するための情報です',
  run_stt: '動画内で話している内容を、候補探しに使える形にしたものです',
  find_candidates: 'ショートに使えそうな区間と、選んだ理由です',
  gemini_candidate_review: '候補区間を映像面から見るための確認メモです',
  create_edit_plan: 'どの区間を使い、どんな流れで動画にするかの案です',
  apply_adjustment: '動画を作る前に確定した変更点と確認結果です',
  render_video: '確認用に生成された動画です'
} satisfies Record<AgentRequestType, string>;

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
const candidateControlReview = computed(() =>
  selectedControlReviews.value.find((item) => item.kind === 'candidate_generation')
);
const renderControlReview = computed(() =>
  selectedControlReviews.value.find((item) => item.kind === 'render_readiness')
);
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

  if (failedOperations.value.length > 0) {
    return { label: '確認が必要', color: 'error' };
  }

  if (pendingControlReviews.value.length > 0) {
    return { label: '判断待ち', color: 'warning' };
  }

  if (runningOperations.value.length > 0 || waitingOperations.value.length > 0) {
    return { label: '作成中', color: 'primary' };
  }

  if (selectedOperations.value.length > 0 && selectedOperations.value.every((request) => request.status === 'succeeded')) {
    return { label: '確認できます', color: 'success' };
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
  const artifactRows: ArtifactRow[] = [];

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
const requestFormVisible = computed(() => showRequestForm.value || !activeDraft.value);
const sourceVideoArtifact = computed(() => artifactForTypes(['prepare_video'])[0]);
const candidateArtifacts = computed(() => artifactForTypes(processOperationTypes.candidates));
const editArtifacts = computed(() => artifactForTypes(processOperationTypes.edit));
const videoArtifacts = computed(() => artifactForTypes(processOperationTypes.video));
const outputVideoArtifact = computed(() =>
  selectedArtifacts.value.find((artifact) => artifact.operation.type === 'render_video')
);
const hasOutputVideo = computed(() => Boolean(outputVideoArtifact.value));
const recommendedProcessTab = computed<ProcessTabKey>(() => {
  if (!activeDraft.value) {
    return 'request';
  }

  if (failedOperations.value.length > 0) {
    return 'notes';
  }

  const pendingCandidateReview = candidateControlReview.value?.status === 'review_required';
  if (pendingCandidateReview) {
    return 'candidates';
  }

  const pendingRenderReview = renderControlReview.value?.status === 'review_required';
  if (pendingRenderReview) {
    return 'edit';
  }

  if (hasOutputVideo.value) {
    return 'video';
  }

  if (editArtifacts.value.length > 0) {
    return 'edit';
  }

  if (candidateArtifacts.value.length > 0) {
    return 'candidates';
  }

  return 'request';
});
const activeProcessTab = computed<ProcessTabKey>({
  get() {
    return selectedProcessTab.value || recommendedProcessTab.value;
  },
  set(value) {
    selectedProcessTab.value = value;
  }
});
const processTabs = computed<ProcessTab[]>(() => [
  {
    key: 'request',
    label: '依頼',
    question: activeDraft.value ? 'この内容でショート作成を進めています' : 'この内容でショート作成を始めますか',
    helper: activeDraft.value
      ? '対象動画と作りたい内容を確認できます。新しい依頼の作成はタブの外から始めます。'
      : '作りたい内容と対象動画を入れて、確認用の作成を始めます。',
    status: activeDraft.value ? 'done' : store.runPhase === 'saving' ? 'running' : 'pending',
    statusLabel: activeDraft.value ? '入力済み' : '未作成',
    icon: 'mdi-file-document-outline'
  },
  {
    key: 'candidates',
    label: '候補確認',
    question: 'この候補を動画生成前確認へ進めてよいですか',
    helper: '候補区間、選んだ理由、話した内容を見て、動画にする前の確認へ進める価値があるかを見ます。',
    status: processStatusFor('candidates', candidateControlReview.value),
    statusLabel:
      processStatusFor('candidates', candidateControlReview.value) === 'done'
        ? '候補を承認済み'
        : processStatusLabel(processStatusFor('candidates', candidateControlReview.value)),
    icon: 'mdi-clipboard-search-outline'
  },
  {
    key: 'edit',
    label: '動画生成前確認',
    question: 'この編集案で確認用動画を作ってよいですか',
    helper: '使う区間、冒頭の見せ方、テロップ案を見て、動画を作る前に止めるべき点がないかを見ます。',
    status: processStatusFor('edit', renderControlReview.value),
    statusLabel:
      processStatusFor('edit', renderControlReview.value) === 'done'
        ? '生成前確認済み'
        : processStatusLabel(processStatusFor('edit', renderControlReview.value)),
    icon: 'mdi-content-cut'
  },
  {
    key: 'video',
    label: '生成動画確認',
    question: '生成された確認用動画を見て、次に直す点は何ですか',
    helper: '確認用動画を見て、候補、編集案、テロップ、切り出し範囲のどこを直すかを話せる状態にします。',
    status: hasOutputVideo.value ? 'ready' : runningOperations.value.some((request) => request.type === 'render_video') ? 'running' : 'pending',
    statusLabel: hasOutputVideo.value ? '生成結果を確認できます' : '未生成',
    icon: 'mdi-play-box-outline'
  },
  {
    key: 'notes',
    label: '修正点整理',
    question: '次に直すべき点は何ですか',
    helper: '承認、修正依頼、却下、失敗を見返して、次の実装または再実行で直す論点を整理します。',
    status: activeDraft.value ? 'ready' : 'pending',
    statusLabel: activeDraft.value ? '修正点を整理できます' : '未作成',
    icon: 'mdi-format-list-checks'
  }
]);
const activeProcess = computed(() =>
  processTabs.value.find((tab) => tab.key === activeProcessTab.value) ?? processTabs.value[0]
);
const currentWorkflowProcess = computed(() =>
  processTabs.value.find((tab) => tab.key === recommendedProcessTab.value) ?? processTabs.value[0]
);
const workflowPositionText = computed(() => {
  if (currentWorkflowProcess.value.key === activeProcess.value.key) {
    return `現在の工程: ${currentWorkflowProcess.value.label}`;
  }

  return `現在の工程: ${currentWorkflowProcess.value.label} / 表示中: ${activeProcess.value.label}`;
});
const activeReview = computed(() => {
  if (activeProcessTab.value === 'candidates') {
    return candidateControlReview.value;
  }

  if (activeProcessTab.value === 'edit') {
    return renderControlReview.value;
  }

  return undefined;
});
const activeArtifacts = computed(() => {
  if (activeProcessTab.value === 'request') {
    return artifactForTypes(processOperationTypes.request);
  }

  if (activeProcessTab.value === 'candidates') {
    return candidateArtifacts.value;
  }

  if (activeProcessTab.value === 'edit') {
    return editArtifacts.value;
  }

  if (activeProcessTab.value === 'video') {
    return [];
  }

  return selectedArtifacts.value;
});
const candidateArtifactJson = computed(() => artifactJsonFor('find_candidates'));
const candidateReviewArtifactJson = computed(() => artifactJsonFor('gemini_candidate_review'));
const editPlanArtifactJson = computed(() => artifactJsonFor('create_edit_plan'));
const patchArtifactJson = computed(() => artifactJsonFor('apply_adjustment'));
const candidateSummaries = computed<CandidateReviewSummary[]>(() => {
  const candidates = arrayField(candidateArtifactJson.value, 'candidates');
  const reviewedCandidates = arrayField(candidateReviewArtifactJson.value, 'reviewedCandidates');

  return candidates.map((candidate, index) => {
    const candidateRecord = recordValue(candidate);
    const id = stringField(candidateRecord, 'id') || `candidate_${index + 1}`;
    const review = reviewedCandidates
      .map((item) => recordValue(item))
      .find((item) => stringField(item, 'candidateId') === id);
    const evidenceRefs = arrayField(candidateRecord, 'evidenceRefs');

    return {
      id,
      title: stringField(candidateRecord, 'title') || `候補 ${index + 1}`,
      rangeLabel: formatRange(numberField(candidateRecord, 'sourceStartMs'), numberField(candidateRecord, 'sourceEndMs')),
      hookText: stringField(candidateRecord, 'hookText') || '冒頭で見せる言葉は未取得です',
      transcriptText: stringField(candidateRecord, 'transcriptText') || '候補区間の発話は未取得です',
      reason: candidateReasonForDisplay(candidateRecord),
      visualCheck: review
        ? visualCheckForDisplay(stringField(review, 'visualCheck'))
        : '映像確認メモはまだありません',
      riskLabel: riskLabel(stringField(review, 'risk')),
      nextActionLabel: nextActionLabel(stringField(review, 'nextAction')),
      evidenceLabel: evidenceRefs.length > 0 ? `${evidenceRefs.length}件の発話根拠` : '根拠参照は未取得です',
      roleLabel: candidateRoleLabel(index)
    };
  });
});
const primaryCandidateSummary = computed(() => candidateSummaries.value[0]);
const editPlanSummary = computed<EditPlanSummary | undefined>(() => {
  const editPlan = editPlanArtifactJson.value;
  if (!editPlan) {
    return undefined;
  }

  const telopTexts = arrayField(editPlan, 'telopPlan')
    .map((item) => stringField(recordValue(item), 'text'))
    .filter((text) => text.length > 0);
  const changes = arrayField(patchArtifactJson.value, 'changes')
    .map((item) => {
      const record = recordValue(item);
      const action = stringField(record, 'action');
      const reason = stringField(record, 'reason');
      return [action, reason].filter(Boolean).join('。');
    })
    .filter((text) => text.length > 0);
  const renderReady = booleanField(patchArtifactJson.value, 'renderReady');

  return {
    selectedCandidateId: stringField(editPlan, 'selectedCandidateId') || '採用候補は未取得です',
    title: stringField(editPlan, 'title') || '編集案タイトルは未取得です',
    rangeLabel: formatRange(numberField(editPlan, 'sourceStartMs'), numberField(editPlan, 'sourceEndMs')),
    hookText: stringField(editPlan, 'hookText') || '冒頭で見せる言葉は未取得です',
    telopTexts,
    changes,
    renderReadyLabel: renderReady === true ? '確認用動画を作れる状態です' : '動画生成前に確認が必要です'
  };
});
const reviewChoiceCards = computed<ReviewChoice[]>(() => {
  const review = activeReview.value;
  if (!review) {
    return [];
  }

  if (review.kind === 'candidate_generation') {
    return [
      {
        action: 'approve',
        label: 'この候補で進める',
        title: '動画生成前確認へ進める',
        body: '候補区間、選んだ理由、映像で確認することを見て、動画にする前の確認へ進める価値があると判断する場合。',
        color: 'primary',
        icon: 'mdi-check'
      },
      {
        action: 'request_changes',
        label: '候補を直したい',
        title: '候補を作り直す',
        body: '候補区間、冒頭の見せ方、根拠になった発話に直したい点がある場合。',
        color: 'warning',
        icon: 'mdi-pencil'
      },
      {
        action: 'reject',
        label: 'この候補は使わない',
        title: 'この実行を止める',
        body: '対象動画や候補の方向性が違い、このまま進めても確認材料にならない場合。',
        color: 'error',
        icon: 'mdi-close'
      }
    ];
  }

  return [
    {
      action: 'approve',
      label: 'この編集案で作る',
      title: '確認用動画を作る',
      body: '採用候補、使う区間、テロップ案を見て、動画にして確認する価値がある場合。',
      color: 'primary',
      icon: 'mdi-check'
    },
    {
      action: 'request_changes',
      label: '編集案を直したい',
      title: '動画生成前に戻す',
      body: '使う区間、テロップ、構成、変更内容を動画生成前に直したい場合。',
      color: 'warning',
      icon: 'mdi-pencil'
    },
    {
      action: 'reject',
      label: '動画作成は止める',
      title: 'この実行を止める',
      body: 'この編集案では確認用動画を作っても判断材料にならない場合。',
      color: 'error',
      icon: 'mdi-close'
    }
  ];
});
const activeHumanAction = computed(() => actionForReview(activeReview.value));
const fixSummaryCards = computed<FixSummaryCard[]>(() => [
  {
    label: '候補',
    title: primaryCandidateSummary.value?.title ?? '候補の判断材料がまだありません',
    body: primaryCandidateSummary.value
      ? `見る点: ${primaryCandidateSummary.value.hookText} / ${primaryCandidateSummary.value.riskLabel}`
      : '候補区間、候補理由、映像確認メモができると整理できます。'
  },
  {
    label: '編集案',
    title: editPlanSummary.value?.title ?? '編集案の判断材料がまだありません',
    body: editPlanSummary.value
      ? `${editPlanSummary.value.rangeLabel} を使う案です。${editPlanSummary.value.renderReadyLabel}`
      : '採用候補、使う区間、テロップ案ができると整理できます。'
  },
  {
    label: '生成動画',
    title: outputVideoArtifact.value ? '確認用動画があります' : '確認用動画はまだありません',
    body: outputVideoArtifact.value
      ? '動画を見て、候補選び、切り出し、テロップ、見やすさのどこを直すか決めます。'
      : '動画生成前確認で承認すると、生成動画確認で見られるようになります。'
  },
  {
    label: '画面',
    title: '次の修正対象をここで分けます',
    body: '候補を作り直すのか、編集案を直すのか、動画生成を直すのか、UIを直すのかを分けて話す場所です。'
  }
]);

function artifactForTypes(types: AgentRequestType[]): ArtifactRow[] {
  return selectedArtifacts.value.filter((artifact) => types.includes(artifact.operation.type));
}

function artifactJsonFor(type: AgentRequestType): Record<string, unknown> | undefined {
  const artifact = selectedArtifacts.value.find((item) => item.operation.type === type);
  if (!artifact) {
    return undefined;
  }

  const raw = artifactPreviews[artifact.fileRef.id];
  if (!raw) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return recordValue(parsed);
  } catch {
    return undefined;
  }
}

function recordValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function arrayField(record: Record<string, unknown> | undefined, key: string): unknown[] {
  const value = record?.[key];
  return Array.isArray(value) ? value : [];
}

function stringField(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === 'string' ? value : '';
}

function numberField(record: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === 'number' ? value : undefined;
}

function booleanField(record: Record<string, unknown> | undefined, key: string): boolean | undefined {
  const value = record?.[key];
  return typeof value === 'boolean' ? value : undefined;
}

function candidateRoleLabel(index: number): string {
  if (index === 0 && activeHumanAction.value?.action === 'approve') {
    return 'AI推奨 / 前回承認済み';
  }

  if (index === 0) {
    return 'AI推奨';
  }

  return '比較候補';
}

function candidateReasonForDisplay(candidate: Record<string, unknown>): string {
  const rawReason = stringField(candidate, 'reason');
  const title = stringField(candidate, 'title');
  const hookText = stringField(candidate, 'hookText');
  const topic = title || hookText;

  const isTechnicalReason =
    rawReason.includes('STT') ||
    rawReason.includes('JSON') ||
    rawReason.includes('ZEV') ||
    rawReason.includes('発話まとめ') ||
    rawReason.includes('発話まとまり') ||
    rawReason.includes('話者切替') ||
    rawReason.includes('文末');

  if (rawReason && !isTechnicalReason) {
    return rawReason;
  }

  if (topic) {
    return `${topic} という内容がまとまっており、候補として比較しやすいため。`;
  }

  return 'この区間だけで意味が伝わるかを人間が確認しやすい候補として残しています。';
}

function visualCheckForDisplay(rawValue: string): string {
  if (rawValue && !rawValue.includes('仮Gemini') && !rawValue.includes('確認対象にした')) {
    return rawValue;
  }

  return '前後のつながり、この区間だけで意味が伝わるか、字幕にしたとき読みづらくないか、始まりと終わりが自然かを確認します。';
}

function formatRange(startMs?: number, endMs?: number): string {
  if (typeof startMs !== 'number' || typeof endMs !== 'number') {
    return '時間範囲は未取得です';
  }

  return `${formatSeconds(startMs)} - ${formatSeconds(endMs)}`;
}

function formatSeconds(valueMs: number): string {
  return `${(valueMs / 1000).toFixed(1)}秒`;
}

function riskLabel(value: string): string {
  if (value === 'low') {
    return '映像面の懸念は小さい';
  }

  if (value === 'medium') {
    return '映像面は人間確認が必要';
  }

  if (value === 'high') {
    return '映像面の懸念が大きい';
  }

  return '映像面の懸念は未評価';
}

function nextActionLabel(value: string): string {
  if (value === 'use_for_edit_plan') {
    return '編集案へ使う候補';
  }

  if (value === 'needs_manual_check') {
    return '人間が追加確認する候補';
  }

  return '次の扱いは未確定';
}

function processStatusFor(key: ProcessTabKey, review?: ControlReviewItem): ProcessStatus {
  if (review?.status === 'review_required') {
    return 'review';
  }

  if (review?.status === 'approved') {
    return 'done';
  }

  if (review && ['rejected', 'changes_requested'].includes(review.status)) {
    return 'blocked';
  }

  const operationTypes = processOperationTypes[key];
  const operations = selectedOperations.value.filter((request) => operationTypes.includes(request.type));
  if (operations.some((request) => request.status === 'failed')) {
    return 'blocked';
  }

  if (operations.some((request) => ['queued', 'waiting', 'running'].includes(request.status))) {
    return 'running';
  }

  if (operations.length > 0 && operations.every((request) => request.status === 'succeeded')) {
    return 'ready';
  }

  return 'pending';
}

function processStatusLabel(status: ProcessStatus): string {
  if (status === 'done') {
    return '確認済み';
  }

  if (status === 'ready') {
    return '確認できます';
  }

  if (status === 'review') {
    return '判断待ち';
  }

  if (status === 'running') {
    return '作成中';
  }

  if (status === 'blocked') {
    return '止まっています';
  }

  return 'まだ';
}

function processStatusColor(status: ProcessStatus): string {
  if (status === 'done' || status === 'ready') {
    return 'success';
  }

  if (status === 'review') {
    return 'warning';
  }

  if (status === 'running') {
    return 'primary';
  }

  if (status === 'blocked') {
    return 'error';
  }

  return 'blue-grey';
}

function processStatusIcon(status: ProcessStatus): string {
  if (status === 'done' || status === 'ready') {
    return 'mdi-check';
  }

  if (status === 'review') {
    return 'mdi-account-check-outline';
  }

  if (status === 'running') {
    return 'mdi-play';
  }

  if (status === 'blocked') {
    return 'mdi-alert';
  }

  return 'mdi-circle-outline';
}

function decisionForReview(review: ControlReviewItem | undefined) {
  if (!review) {
    return undefined;
  }

  return store.state.decisionLogs.find((item) => item.id === review.decisionLogId);
}

function actionForReview(review: ControlReviewItem | undefined) {
  if (!review?.resolvedByActionId) {
    return undefined;
  }

  return store.state.humanReviewActions.find((item) => item.id === review.resolvedByActionId);
}

function humanActionMeaning(action: ReturnType<typeof actionForReview>): string {
  if (!action) {
    return 'まだ人間の判断は保存されていません';
  }

  const reason = action.reason && action.reason !== '承認として記録' ? `理由: ${action.reason}` : '';

  if (action.action === 'approve') {
    return reason || 'あなたが承認を選びました。';
  }

  if (action.action === 'request_changes') {
    return reason || 'あなたが修正依頼を選びました。';
  }

  return reason || 'あなたが却下を選びました。';
}

function reviewPrimaryQuestion(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return 'この候補を動画生成前確認へ進めてよいですか';
  }

  return 'この編集案で確認用動画を作ってよいですか';
}

function reviewApproveLabel(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return 'この候補で進める';
  }

  return 'この編集案で作る';
}

function reviewAfterApprove(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return '承認すると、候補をもとに映像確認と編集案作成へ進みます。';
  }

  return '承認すると、この編集案を使って確認用動画を作ります。';
}

function reviewProposalText(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return primaryCandidateSummary.value
      ? `${primaryCandidateSummary.value.title} を動画生成前確認へ進める提案です`
      : '候補を動画生成前確認へ進める提案です';
  }

  return editPlanSummary.value
    ? `${editPlanSummary.value.title} で確認用動画を作る提案です`
    : 'この編集案で確認用動画を作る前に確認する提案です';
}

function reviewProposalReason(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return primaryCandidateSummary.value
      ? `${primaryCandidateSummary.value.reason} 候補区間の前後、単体で意味が伝わるか、映像で確認することを見て判断します。`
      : '候補区間、選んだ理由、映像で確認することを見て判断します。';
  }

  return editPlanSummary.value
    ? '採用候補、使う範囲、テロップ案を見て、確認用動画を作る前に止めるべき点がないか判断します。'
    : '編集案と動画生成前の変更点を見て判断します。';
}

function humanDecisionSummary(review: ControlReviewItem): string {
  const action = actionForReview(review);
  if (!action) {
    return 'まだ人間の判断は保存されていません。';
  }

  if (review.kind === 'candidate_generation' && action.action === 'approve') {
    return `AIの提案「${reviewProposalText(review)}」を承認済みです。この判断により、次の工程「動画生成前確認」へ進みました。`;
  }

  if (review.kind === 'render_readiness' && action.action === 'approve') {
    return `AIの提案「${reviewProposalText(review)}」を承認済みです。この判断により、確認用動画の生成へ進みました。`;
  }

  return humanActionMeaning(action);
}

function nextProcessLabelForReview(review: ControlReviewItem): string {
  return review.kind === 'candidate_generation' ? '動画生成前確認を見る' : '生成動画確認を見る';
}

function nextProcessKeyForReview(review: ControlReviewItem): ProcessTabKey {
  return review.kind === 'candidate_generation' ? 'edit' : 'video';
}

function reviewReasonText(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return '候補区間と選んだ理由が確認材料として保存されています。';
  }

  return '編集案と動画生成前の変更点が確認材料として保存されています。';
}

function reviewApproveMeaning(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return '候補区間と選んだ理由を見て、次の確認に進める価値がある状態です。';
  }

  return '使う区間とテロップ案を見て、動画にして確認する価値がある状態です。';
}

function reviewChangeMeaning(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return '候補区間、候補理由、対象動画に直したい点がある状態です。';
  }

  return '使う区間、テロップ案、構成を動画生成前に直したい状態です。';
}

function reviewRejectMeaning(review: ControlReviewItem): string {
  if (review.kind === 'candidate_generation') {
    return '対象動画や候補の方向性が違い、この実行を続けても確認材料にならない状態です。';
  }

  return 'この編集案では確認用動画を作っても判断材料にならない状態です。';
}

function artifactTitle(artifact: ArtifactRow): string {
  return operationUserLabel[artifact.operation.type];
}

function artifactMeaning(artifact: ArtifactRow): string {
  return operationUserMeaning[artifact.operation.type];
}

function artifactGuide(artifact: ArtifactRow): ArtifactGuideItem[] {
  const guides = {
    prepare_video: [
      { label: 'sourceUri', meaning: '今回使う動画の場所です。' },
      { label: 'purpose', meaning: 'この動画で作りたいものです。' }
    ],
    run_stt: [
      { label: 'segments', meaning: '話している内容を時間つきで分けたものです。候補探しの材料です。' },
      { label: 'startMs / endMs', meaning: '発話が始まる位置と終わる位置です。' },
      { label: 'speechUnitGroups', meaning: '話題のまとまりとして扱う発話の組み合わせです。' }
    ],
    find_candidates: [
      { label: 'candidates', meaning: 'ショート候補の一覧です。' },
      { label: 'sourceStartMs / sourceEndMs', meaning: '元動画から切り出す候補区間です。' },
      { label: 'hookText', meaning: '冒頭で視聴者に見せたい言葉です。' },
      { label: 'reason', meaning: 'なぜ候補にしたかの説明です。' },
      { label: 'evidenceRefs', meaning: '候補理由の根拠になった発話や区間です。' }
    ],
    gemini_candidate_review: [
      { label: 'reviewedCandidates', meaning: '候補を映像面から確認するためのメモです。' },
      { label: 'visualCheck', meaning: '映像として確認したい観点です。' },
      { label: 'captionHint', meaning: '字幕や冒頭文に使いやすい言葉です。' },
      { label: 'nextAction', meaning: '編集案へ進めるか、追加確認が必要かの提案です。' }
    ],
    create_edit_plan: [
      { label: 'selectedCandidateId', meaning: '編集案に採用した候補です。' },
      { label: 'sourceStartMs / sourceEndMs', meaning: '動画に使う元動画の範囲です。' },
      { label: 'renderSegments', meaning: '動画生成に渡す区間と役割です。' },
      { label: 'telopPlan', meaning: '表示するテロップ案です。' }
    ],
    apply_adjustment: [
      { label: 'changes', meaning: '動画生成前に確定した変更点です。' },
      { label: 'reason', meaning: 'なぜその変更を入れるかです。' },
      { label: 'renderReady', meaning: '動画生成へ進める状態かどうかです。' }
    ],
    render_video: [
      { label: 'output.mp4', meaning: '確認用に生成された動画です。' }
    ]
  } satisfies Record<AgentRequestType, ArtifactGuideItem[]>;

  return guides[artifact.operation.type];
}

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
  showRequestForm.value = false;
  await store.createRequestDraft({ ...draftInput });
}

function startNewRequest() {
  currentView.value = 'main';
  showSuccessfulSteps.value = false;
  showRequestForm.value = true;
}

function closeRequestForm() {
  showRequestForm.value = false;
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
  selectedProcessTab.value = '';
  showRequestForm.value = false;
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

function showNextProcessForReview(review: ControlReviewItem) {
  activeProcessTab.value = nextProcessKeyForReview(review);
}

async function toggleArtifactPreview(fileRef: FileRef) {
  if (!fileRef.mimeType.includes('json')) {
    return;
  }

  if (expandedArtifacts[fileRef.id]) {
    expandedArtifacts[fileRef.id] = false;
    return;
  }

  await ensureArtifactPreview(fileRef);

  expandedArtifacts[fileRef.id] = true;
}

async function ensureArtifactPreview(fileRef: FileRef) {
  if (!fileRef.mimeType.includes('json') || artifactPreviews[fileRef.id]) {
    return;
  }

  artifactPreviews[fileRef.id] = await fetchArtifactText(fileRef.uri);
}

watch(
  selectedArtifacts,
  (artifacts) => {
    for (const artifact of artifacts) {
      void ensureArtifactPreview(artifact.fileRef);
    }
  },
  { immediate: true }
);

watch(activeProcessTab, () => {
  showDetailData.value = false;
});

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
            <h1>ショート作成の確認</h1>
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

        <section v-else class="process-workspace">
          <v-sheet v-if="requestFormVisible" class="panel request-start-panel" rounded border>
            <div class="request-start-heading">
              <div>
                <span>{{ activeDraft ? '別の動画で始める' : '最初に作る内容' }}</span>
                <strong>新しい依頼の内容</strong>
                <p>
                  {{ activeDraft ? '新しい依頼画面に切り替わっています。前回の結果へ戻ることもできます。' : '対象動画と作りたい内容を入れて、確認用の作成を始めます。' }}
                </p>
              </div>
            </div>

            <v-form class="request-form" @submit.prevent="submitDraft">
              <v-textarea
                v-model="draftInput.purpose"
                label="作りたいショート"
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
                  label="動画の長さ"
                  density="compact"
                />
                <v-select
                  v-model="draftInput.candidateCountLabel"
                  :items="['3候補', '5候補', '1候補']"
                  label="見たい候補数"
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
                label="重視する見方"
                density="compact"
              />
              <v-switch
                v-model="draftInput.includeRender"
                color="primary"
                label="確認用動画まで作る"
                hide-details
              />
              <div class="review-button-row">
                <v-btn color="primary" prepend-icon="mdi-send" type="submit" :loading="store.loading">
                  この内容で作成を始める
                </v-btn>
                <v-btn v-if="activeDraft" variant="text" @click="closeRequestForm">
                  前回の結果に戻る
                </v-btn>
              </div>
            </v-form>
          </v-sheet>
          <v-sheet v-else class="request-utility-panel" rounded border>
            <div>
              <span>別の動画で始める</span>
              <p>新しい依頼画面に切り替わります。</p>
            </div>
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-plus"
              @click="startNewRequest"
            >
              新しい依頼を作る
            </v-btn>
          </v-sheet>

          <template v-if="!requestFormVisible">
            <v-sheet class="panel overview-panel" rounded border>
              <div class="overview-heading">
                <div>
                  <p class="eyebrow">全体の流れ</p>
                  <h2>{{ workflowPositionText }}</h2>
                  <p>全体の流れから、完了済みの段階も見返せます。</p>
                </div>
                <div class="overview-actions">
                  <v-chip size="small" :color="visibleDraftStatus.color" variant="tonal">
                    {{ visibleDraftStatus.label }}
                  </v-chip>
                  <span v-if="store.lastChangedAt">最終更新 {{ formatTime(store.lastChangedAt) }}</span>
                </div>
              </div>

              <div class="process-flow" :style="{ '--step-count': String(processTabs.length) }">
                <button
                  v-for="tab in processTabs"
                  :key="tab.key"
                  type="button"
                  class="process-flow-step"
                  :class="[`is-${tab.status}`, { 'is-active': activeProcessTab === tab.key }]"
                  @click="activeProcessTab = tab.key"
                >
                  <span class="process-flow-dot">
                    <v-icon size="16">{{ processStatusIcon(tab.status) }}</v-icon>
                  </span>
                  <strong>{{ tab.label }}</strong>
                  <small>{{ tab.statusLabel }}</small>
                </button>
              </div>
            </v-sheet>

            <v-sheet class="panel process-panel" rounded border>

            <section class="process-content">
              <div class="question-card">
                <span>主な問い</span>
                <strong>{{ activeProcess.question }}</strong>
                <p>{{ activeProcess.helper }}</p>
              </div>

              <div v-if="activeProcessTab === 'request'" class="tab-section">
                <div v-if="activeDraft" class="summary-grid">
                  <article>
                    <span>作りたいもの</span>
                    <strong>{{ activeDraft.purpose }}</strong>
                    <p>{{ visibleSourceStatus }}</p>
                  </article>
                  <article>
                    <span>指定</span>
                    <strong>{{ activeDraft.settings.durationLabel }} / {{ activeDraft.settings.candidateCountLabel }}</strong>
                    <p>方針: {{ activeDraft.settings.preset }}</p>
                  </article>
                </div>
                <div v-else class="empty">まだ依頼はありません。</div>

                <div v-if="activeDraft?.status === 'draft' && store.runPhase === 'idle'" class="request-form-actions">
                  <v-btn
                    color="primary"
                    prepend-icon="mdi-check"
                    :loading="store.loading"
                    @click="approveLatestDraft"
                  >
                    この内容で作成を始める
                  </v-btn>
                </div>
              </div>

              <div v-else-if="activeProcessTab === 'candidates' || activeProcessTab === 'edit'" class="tab-section">
                <div v-if="activeReview" class="review-panel">
                  <div class="ai-review-card">
                    <span>AIの提案</span>
                    <strong>{{ reviewProposalText(activeReview) }}</strong>
                    <p>{{ reviewProposalReason(activeReview) }}</p>
                  </div>

                  <div v-if="activeHumanAction" class="human-decision-card">
                    <span>あなたの前回判断</span>
                    <strong>{{ controlReviewStatusLabel[activeReview.status] }}</strong>
                    <p>{{ humanDecisionSummary(activeReview) }}</p>
                  </div>

                  <div
                    v-if="activeReview.kind === 'candidate_generation' && candidateSummaries.length > 0"
                    class="candidate-review-list"
                  >
                    <article v-for="candidate in candidateSummaries" :key="candidate.id" class="candidate-review-card">
                      <div class="candidate-review-heading">
                        <span>{{ candidate.rangeLabel }}</span>
                        <strong>{{ candidate.title }}</strong>
                        <v-chip size="small" color="primary" variant="tonal">{{ candidate.roleLabel }}</v-chip>
                      </div>
                      <p><strong>見どころ:</strong> {{ candidate.hookText }}</p>
                      <p><strong>候補にした理由:</strong> {{ candidate.reason }}</p>
                      <p><strong>映像で確認すること:</strong> {{ candidate.visualCheck }}</p>
                      <div class="material-tags">
                        <v-chip size="small" color="primary" variant="tonal">{{ candidate.nextActionLabel }}</v-chip>
                        <v-chip size="small" color="warning" variant="tonal">{{ candidate.riskLabel }}</v-chip>
                        <v-chip size="small" color="blue-grey" variant="tonal">{{ candidate.evidenceLabel }}</v-chip>
                      </div>
                      <details class="candidate-transcript">
                        <summary>候補区間の発話を見る</summary>
                        <p>{{ candidate.transcriptText }}</p>
                      </details>
                    </article>
                  </div>
                  <div v-else-if="activeReview.kind === 'candidate_generation'" class="collapsed-note">
                    候補の詳細を読み込んでいます。候補区間、理由、映像確認メモがここに表示されます。
                  </div>

                  <div v-else-if="editPlanSummary" class="edit-plan-review">
                    <article>
                      <span>採用候補</span>
                      <strong>{{ editPlanSummary.selectedCandidateId }}</strong>
                      <p>{{ editPlanSummary.title }}</p>
                    </article>
                    <article>
                      <span>使う範囲</span>
                      <strong>{{ editPlanSummary.rangeLabel }}</strong>
                      <p>{{ editPlanSummary.hookText }}</p>
                    </article>
                    <article>
                      <span>テロップ案</span>
                      <strong>{{ editPlanSummary.telopTexts.length }}件</strong>
                      <p>{{ editPlanSummary.telopTexts.join(' / ') || 'テロップ案は未取得です' }}</p>
                    </article>
                    <article>
                      <span>動画生成前の状態</span>
                      <strong>{{ editPlanSummary.renderReadyLabel }}</strong>
                      <p>{{ editPlanSummary.changes.join(' / ') || reviewReasonText(activeReview) }}</p>
                    </article>
                  </div>
                  <div v-else class="collapsed-note">
                    編集案の詳細を読み込んでいます。採用候補、使う範囲、テロップ案がここに表示されます。
                  </div>

                  <div v-if="activeReview.status === 'review_required'" class="review-choice-grid">
                    <article v-for="choice in reviewChoiceCards" :key="choice.action">
                      <span>{{ choice.title }}</span>
                      <strong>{{ choice.label }}</strong>
                      <p>{{ choice.body }}</p>
                    </article>
                  </div>
                  <div v-else class="review-complete-card">
                    <span>次に見ること</span>
                    <strong>この判断は保存済みです</strong>
                    <p>{{ humanDecisionSummary(activeReview) }}</p>
                    <v-btn
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-arrow-right"
                      @click="showNextProcessForReview(activeReview)"
                    >
                      {{ nextProcessLabelForReview(activeReview) }}
                    </v-btn>
                  </div>

                  <div v-if="activeReview.status === 'review_required'" class="review-actions">
                    <v-textarea
                      v-model="reviewReasons[activeReview.id]"
                      label="判断理由や直したい点"
                      rows="2"
                      auto-grow
                      density="compact"
                      hide-details
                    />
                    <div class="review-button-row">
                      <v-btn
                        v-for="choice in reviewChoiceCards"
                        :key="choice.action"
                        :color="choice.color"
                        variant="tonal"
                        :prepend-icon="choice.icon"
                        :loading="store.loading"
                        @click="submitControlReview(activeReview, choice.action)"
                      >
                        {{ choice.label }}
                      </v-btn>
                    </div>
                  </div>
                </div>
                <div v-else class="collapsed-note">
                  この段階の確認材料はまだ作成中、または未作成です。
                </div>
              </div>

              <div v-else-if="activeProcessTab === 'video'" class="tab-section">
                <div v-if="outputVideoArtifact" class="video-focus">
                  <video
                    class="artifact-video large"
                    controls
                    :src="outputVideoArtifact.fileRef.uri"
                  />
                  <div>
                    <span>見ること</span>
                    <strong>この動画を確認して、次に直す点を決めます</strong>
                    <p>候補の選び方、切り出し範囲、テロップ、動画の見やすさを分けて確認します。</p>
                  </div>
                </div>
                <div v-else class="collapsed-note">
                  まだ確認用動画はありません。動画生成前確認で動画作成を承認すると、ここに表示されます。
                </div>
              </div>

              <div v-else-if="activeProcessTab === 'notes'" class="tab-section">
                <div class="fix-summary-grid">
                  <article v-for="card in fixSummaryCards" :key="card.label">
                    <span>{{ card.label }}</span>
                    <strong>{{ card.title }}</strong>
                    <p>{{ card.body }}</p>
                  </article>
                </div>
                <div v-if="failedOperations.length > 0" class="collapsed-note">
                  {{ failedOperations[0].label }} で止まっています。失敗内容を確認してください。
                </div>
                <div v-if="selectedControlReviews.length > 0" class="review-history">
                  <article v-for="review in selectedControlReviews" :key="review.id">
                    <span>{{ actionForReview(review) ? 'あなたの判断' : 'AIからの確認依頼' }}</span>
                    <strong>{{ controlReviewStatusLabel[review.status] }}</strong>
                    <p>{{ reviewPrimaryQuestion(review) }} / {{ humanActionMeaning(actionForReview(review)) }}</p>
                  </article>
                </div>
              </div>

              <div v-if="activeArtifacts.length > 0" class="artifact-panel">
                <div class="artifact-heading">
                  <div>
                    <span>補助情報</span>
                    <strong>{{ activeArtifacts.length }}件</strong>
                    <p>通常は上の要約だけで判断できます。必要な場合だけ、内部データを確認してください。</p>
                  </div>
                  <v-btn
                    size="small"
                    variant="tonal"
                    :prepend-icon="showDetailData ? 'mdi-eye-off-outline' : 'mdi-file-eye-outline'"
                    @click="showDetailData = !showDetailData"
                  >
                    {{ showDetailData ? '補助情報を閉じる' : '補助情報を見る' }}
                  </v-btn>
                </div>
                <template v-if="showDetailData">
                  <article v-for="artifact in activeArtifacts" :key="artifact.fileRef.id" class="artifact-card">
                    <div class="artifact-card-heading">
                      <div>
                        <strong>{{ artifactTitle(artifact) }}</strong>
                        <p>{{ artifactMeaning(artifact) }}</p>
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
                        :prepend-icon="expandedArtifacts[artifact.fileRef.id] ? 'mdi-eye-off-outline' : 'mdi-file-eye-outline'"
                        @click="toggleArtifactPreview(artifact.fileRef)"
                      >
                        {{ expandedArtifacts[artifact.fileRef.id] ? '閉じる' : '中身を見る' }}
                      </v-btn>
                      <div v-if="expandedArtifacts[artifact.fileRef.id]" class="json-reader">
                        <div class="json-guide">
                          <span>項目の読み方</span>
                          <dl>
                            <div v-for="item in artifactGuide(artifact)" :key="item.label">
                              <dt>{{ item.label }}</dt>
                              <dd>{{ item.meaning }}</dd>
                            </div>
                          </dl>
                        </div>
                        <pre>{{ artifactPreviews[artifact.fileRef.id] }}</pre>
                      </div>
                    </div>
                  </article>
                </template>
              </div>
            </section>
          </v-sheet>
          </template>
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

.process-workspace {
  display: grid;
  gap: 10px;
}

.overview-panel,
.request-start-panel,
.process-panel,
.tab-section {
  display: grid;
  gap: 12px;
}

.overview-heading {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.overview-heading p {
  color: #465666;
  margin-top: 4px;
}

.overview-actions {
  display: grid;
  gap: 6px;
  justify-items: end;
}

.overview-actions span {
  color: #607080;
  font-size: 12px;
  font-weight: 700;
}

.request-start-heading {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.request-start-heading span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.request-start-heading strong {
  display: block;
  font-size: 16px;
}

.request-start-heading p {
  color: #465666;
  margin-top: 4px;
}

.request-utility-panel {
  align-items: center;
  background: #ffffff;
  border: 1px solid #dce4ec;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 10px 12px;
}

.request-utility-panel span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.request-utility-panel p {
  color: #465666;
  margin-top: 2px;
}

.process-flow {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(var(--step-count), minmax(0, 1fr));
}

.process-flow-step {
  align-items: center;
  background: #f6f8fa;
  border: 1px solid #dce4ec;
  border-radius: 8px;
  color: #34495e;
  cursor: pointer;
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 10px 8px;
  text-align: center;
}

.process-flow-step:hover,
.process-flow-step.is-active {
  border-color: #2f7ed8;
  box-shadow: inset 0 0 0 1px #2f7ed8;
}

.process-flow-step strong,
.process-flow-step small {
  overflow-wrap: anywhere;
}

.process-flow-step strong {
  font-size: 13px;
}

.process-flow-step small {
  color: #607080;
  font-size: 11px;
  font-weight: 700;
}

.process-flow-dot {
  align-items: center;
  background: #eef2f5;
  border: 2px solid #cad6df;
  border-radius: 50%;
  display: grid;
  height: 28px;
  justify-self: center;
  width: 28px;
}

.process-flow-step.is-ready .process-flow-dot,
.process-flow-step.is-done .process-flow-dot {
  background: #e7f5ed;
  border-color: #32a66a;
  color: #1f7a4d;
}

.process-flow-step.is-review .process-flow-dot {
  background: #fff7e6;
  border-color: #d89120;
  color: #9a5b00;
}

.process-flow-step.is-running .process-flow-dot {
  background: #e8f2ff;
  border-color: #2f7ed8;
  color: #1d5fa8;
}

.process-flow-step.is-blocked .process-flow-dot {
  background: #fff0ef;
  border-color: #d92d20;
  color: #b42318;
}

.process-tabs {
  border-bottom: 1px solid #e2e8ef;
}

.process-content {
  display: grid;
  gap: 12px;
  padding-top: 2px;
}

.question-card {
  background: #eef6ff;
  border: 1px solid #cfe0ef;
  border-radius: 8px;
  display: grid;
  gap: 5px;
  padding: 12px;
}

.question-card span,
.summary-grid span,
.review-main-question span,
.decision-grid span,
.ai-review-card span,
.human-decision-card span,
.review-complete-card span,
.candidate-review-heading span,
.edit-plan-review span,
.review-choice-grid span,
.fix-summary-grid span,
.judgement-guide span,
.json-guide span,
.review-history span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.question-card strong,
.summary-grid strong,
.review-main-question strong,
.decision-grid strong,
.ai-review-card strong,
.human-decision-card strong,
.review-complete-card strong,
.candidate-review-card strong,
.edit-plan-review strong,
.review-choice-grid strong,
.fix-summary-grid strong,
.review-history strong {
  display: block;
  font-size: 17px;
}

.question-card p,
.summary-grid p,
.review-main-question p,
.decision-grid p,
.ai-review-card p,
.human-decision-card p,
.review-complete-card p,
.candidate-review-card p,
.edit-plan-review p,
.review-choice-grid p,
.fix-summary-grid p,
.judgement-guide p,
.review-history p {
  color: #465666;
  margin: 0;
  overflow-wrap: anywhere;
}

.summary-grid,
.decision-grid,
.edit-plan-review,
.review-choice-grid,
.fix-summary-grid,
.judgement-guide {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.judgement-guide {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-grid article,
.decision-grid article,
.edit-plan-review article,
.review-choice-grid article,
.fix-summary-grid article,
.judgement-guide article,
.review-history article {
  background: #f4f6f8;
  border-radius: 8px;
  display: grid;
  gap: 4px;
  padding: 10px;
}

.request-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.review-panel {
  display: grid;
  gap: 12px;
}

.review-main-question {
  background: #fff7e6;
  border: 1px solid #f0d49a;
  border-radius: 8px;
  display: grid;
  gap: 5px;
  padding: 12px;
}

.ai-review-card,
.human-decision-card,
.review-complete-card {
  border-radius: 8px;
  display: grid;
  gap: 5px;
  padding: 12px;
}

.ai-review-card {
  background: #eef6ff;
  border: 1px solid #cfe0ef;
}

.human-decision-card {
  background: #eef8ef;
  border: 1px solid #bfe2c6;
}

.review-complete-card {
  align-items: start;
  background: #f4f6f8;
  border: 1px solid #dce4ec;
}

.review-complete-card .v-btn {
  justify-self: start;
  margin-top: 4px;
}

.candidate-review-list {
  display: grid;
  gap: 10px;
}

.candidate-review-card {
  background: #ffffff;
  border: 1px solid #dce4ec;
  border-radius: 8px;
  display: grid;
  gap: 8px;
  padding: 12px;
}

.candidate-review-heading {
  align-items: start;
  display: grid;
  gap: 3px;
  justify-items: start;
}

.material-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.candidate-transcript {
  background: #f4f6f8;
  border-radius: 8px;
  color: #465666;
  padding: 8px 10px;
}

.candidate-transcript summary {
  color: #17212b;
  cursor: pointer;
  font-weight: 700;
}

.candidate-transcript p {
  margin-top: 6px;
}

.review-choice-grid article {
  border: 1px solid #dce4ec;
}

.video-focus {
  align-items: start;
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(180px, 300px) minmax(0, 1fr);
}

.video-focus span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.video-focus strong {
  display: block;
  font-size: 18px;
  margin-top: 3px;
}

.video-focus p {
  color: #465666;
  margin-top: 6px;
}

.review-history {
  display: grid;
  gap: 8px;
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

.json-reader {
  align-items: start;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(220px, 0.42fr) minmax(0, 1fr);
}

.json-guide {
  background: #f4f6f8;
  border-radius: 8px;
  display: grid;
  gap: 8px;
  padding: 10px;
}

.json-guide dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.json-guide div {
  display: grid;
  gap: 2px;
}

.json-guide dt {
  color: #17212b;
  font-size: 12px;
  font-weight: 800;
}

.json-guide dd {
  color: #465666;
  font-size: 13px;
  margin: 0;
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
  .form-grid,
  .overview-heading,
  .request-utility-panel,
  .summary-grid,
  .decision-grid,
  .edit-plan-review,
  .review-choice-grid,
  .fix-summary-grid,
  .judgement-guide,
  .video-focus,
  .json-reader {
    grid-template-columns: 1fr;
  }

  .process-flow {
    grid-template-columns: 1fr;
  }

  .overview-actions {
    justify-items: start;
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
