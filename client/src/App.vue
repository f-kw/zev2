<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type {
  AgentRequest,
  AgentRequestType,
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
const selectedProcessTab = ref<ProcessTabKey | ''>('');
const showRequestForm = ref(false);
const showDetailData = ref(false);
const reviewReasons = reactive<Record<string, string>>({});
const selectedReviewOptions = reactive<Record<string, string>>({});
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

interface ThemeReviewSummary {
  id: string;
  title: string;
  summary: string;
  representativeText: string;
  whyItCanBeClipped: string;
  selected: boolean;
}

interface EditPlanSummary {
  selectedThemeId: string;
  selectedThemeTitle: string;
  compositionSummary: string;
  telopTexts: string[];
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
  body?: string;
}

const draftInput = reactive<RequestDraftInput>({
  purpose: 'この配信から切り抜きたいテーマを選び、複数箇所をつないだショート案を作る',
  sourceUri: '',
  durationLabel: '60秒以内',
  themeCountLabel: '3テーマ',
  preset: 'shorts_default'
});

const draftStatusLabel = {
  draft: '開始前',
  approved: '作成中',
  rejected: '却下'
} satisfies Record<RequestDraftStatus, string>;

const controlReviewStatusLabel = {
  review_required: '確認待ち',
  approved: '承認済み',
  rejected: '却下',
  changes_requested: '修正依頼'
} satisfies Record<ControlReviewStatus, string>;

const controlReviewStatusColor = {
  review_required: 'deep-orange-darken-4',
  approved: 'success',
  rejected: 'error',
  changes_requested: 'deep-orange-darken-4'
} satisfies Record<ControlReviewStatus, string>;

const processOrder = {
  request: 0,
  candidates: 1,
  edit: 2,
  video: 3,
  notes: 3
} satisfies Record<ProcessTabKey, number>;

const processOperationTypes: Record<ProcessTabKey, AgentRequestType[]> = {
  request: ['prepare_video'],
  candidates: ['run_stt', 'propose_clip_themes', 'build_clip_composition'],
  edit: ['create_edit_plan', 'apply_adjustment'],
  video: ['render_video'],
  notes: []
};

const operationUserLabel = {
  prepare_video: '対象動画',
  run_stt: '話した内容',
  propose_clip_themes: 'テーマ候補',
  build_clip_composition: '複数箇所の構成案',
  create_edit_plan: '演出案',
  apply_adjustment: '生成前の確認',
  render_video: '生成動画'
} satisfies Record<AgentRequestType, string>;

const operationUserMeaning = {
  prepare_video: 'この実行で使う動画を確認するための情報です',
  run_stt: '話している内容を時間つきで分けたものです',
  propose_clip_themes: '文字起こしから作ったテーマ候補です',
  build_clip_composition: 'テーマに関係する複数の発話箇所をつないだ構成案です',
  create_edit_plan: '複数箇所の構成案をもとにした演出案です',
  apply_adjustment: '動画を作る前に確定した変更点です',
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

  return store.state.agentRequests.filter(
    (request) => request.requestDraftId === draft.id && request.status !== 'superseded'
  );
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
const themeControlReview = computed(() =>
  selectedControlReviews.value.find((item) => item.kind === 'theme_selection')
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
    return { label: '開始中', color: 'primary' };
  }

  if (store.runPhase === 'running') {
    return { label: '作成中', color: 'primary' };
  }

  if (store.runPhase === 'review_required' || pendingControlReviews.value.length > 0) {
    return { label: '確認待ち', color: 'deep-orange-darken-4' };
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
    return { label: '判断待ち', color: 'deep-orange-darken-4' };
  }

  if (runningOperations.value.length > 0 || waitingOperations.value.length > 0) {
    return { label: '作成中', color: 'primary' };
  }

  if (selectedOperations.value.length > 0 && selectedOperations.value.every((request) => request.status === 'succeeded')) {
    return { label: '確認できます', color: 'success' };
  }

  return {
    label: draftStatusLabel[activeDraft.value.status],
    color: activeDraft.value.status === 'draft' ? 'deep-orange-darken-4' : 'success'
  };
});
const runHistory = computed(() =>
  store.state.requestDrafts.map((draft) => {
    const operations = store.state.agentRequests.filter(
      (request) => request.requestDraftId === draft.id && request.status !== 'superseded'
    );
    const reviews = store.state.controlReviewItems.filter((item) => item.requestDraftId === draft.id);
    const pendingReviews = reviews.filter((item) => item.status === 'review_required').length;
    const stoppedReviews = reviews.filter((item) => item.status === 'rejected').length;
    const failed = operations.filter((request) => request.status === 'failed').length;
    const active = operations.filter((request) => ['queued', 'waiting', 'running'].includes(request.status)).length;
    const operationUpdatedTimes = operations.map((request) => request.updatedAt).sort();
    const updatedAt = operationUpdatedTimes[operationUpdatedTimes.length - 1] ?? draft.updatedAt;
    let statusLabel = '承認待ち';
    let color = 'deep-orange-darken-4';
    let summary = 'まだ開始していません';

    if (failed > 0) {
      statusLabel = '失敗';
      color = 'error';
      summary = '確認が必要な箇所があります';
    } else if (pendingReviews > 0) {
      statusLabel = '確認待ち';
      color = 'deep-orange-darken-4';
      summary = '承認待ちの判断があります';
    } else if (active > 0) {
      statusLabel = '実行中';
      color = 'primary';
      summary = '作成中です';
    } else if (stoppedReviews > 0) {
      statusLabel = '確認済み';
      color = 'deep-orange-darken-4';
      summary = '却下により後続工程を止めています';
    } else if (operations.length > 0) {
      statusLabel = '完了';
      color = 'success';
      summary = '作成済みです';
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
  [...selectedArtifacts.value].reverse().find((artifact) => artifact.operation.type === 'render_video')
);
const hasOutputVideo = computed(() => Boolean(outputVideoArtifact.value));
const recommendedProcessTab = computed<ProcessTabKey>(() => {
  if (!activeDraft.value) {
    return 'request';
  }

  if (failedOperations.value.length > 0) {
    return 'video';
  }

  const pendingThemeReview = themeControlReview.value?.status === 'review_required';
  if (pendingThemeReview) {
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
const requiredReviewProcessTab = computed<ProcessTabKey | undefined>(() => {
  if (themeControlReview.value?.status === 'review_required') {
    return 'candidates';
  }

  if (renderControlReview.value?.status === 'review_required') {
    return 'edit';
  }

  return undefined;
});
const activeProcessTab = computed<ProcessTabKey>({
  get() {
    const requiredTab = requiredReviewProcessTab.value;
    const selectedTab = selectedProcessTab.value;

    if (requiredTab && selectedTab && processOrder[selectedTab] > processOrder[requiredTab]) {
      return requiredTab;
    }

    return selectedTab || recommendedProcessTab.value;
  },
  set(value) {
    const requiredTab = requiredReviewProcessTab.value;
    if (requiredTab && processOrder[value] > processOrder[requiredTab]) {
      selectedProcessTab.value = requiredTab;
      return;
    }

    selectedProcessTab.value = value;
  }
});
const processTabs = computed<ProcessTab[]>(() => [
  {
    key: 'request',
    label: '依頼',
    question: activeDraft.value ? 'この内容でショート作成を進めています' : 'この内容でショート作成を始めますか',
    helper: activeDraft.value
      ? '対象動画と作りたい内容です。'
      : '作りたい内容と対象動画を入れて始めます。',
    status: activeDraft.value ? 'done' : store.runPhase === 'saving' ? 'running' : 'pending',
    statusLabel: activeDraft.value ? '入力済み' : '未作成',
    icon: 'mdi-file-document-outline'
  },
  {
    key: 'candidates',
    label: 'テーマ選択',
    question: 'どのテーマで切り抜きを作りますか',
    helper: '文字起こしから切り抜きテーマを選びます。',
    status: processStatusFor('candidates', themeControlReview.value),
    statusLabel:
      processStatusFor('candidates', themeControlReview.value) === 'done'
        ? 'テーマを選択済み'
        : processStatusLabel(processStatusFor('candidates', themeControlReview.value)),
    icon: 'mdi-clipboard-search-outline'
  },
  {
    key: 'edit',
    label: '動画生成前確認',
    question: 'この内容で確認用動画を作ってよいですか',
    helper: 'テーマ、つなぎ方、テロップを確認します。',
    status: processStatusFor('edit', renderControlReview.value),
    statusLabel:
      processStatusFor('edit', renderControlReview.value) === 'done'
        ? '生成前確認済み'
        : processStatusLabel(processStatusFor('edit', renderControlReview.value)),
    icon: 'mdi-content-cut'
  },
  {
    key: 'video',
    label: '生成後レビュー',
    question: '生成された確認用動画を見て、次に直す点は何ですか',
    helper: '動画を見て、直す点があれば記録します。',
    status: hasOutputVideo.value ? 'ready' : runningOperations.value.some((request) => request.type === 'render_video') ? 'running' : 'pending',
    statusLabel: hasOutputVideo.value ? '生成結果を確認できます' : '未生成',
    icon: 'mdi-play-box-outline'
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
const userInstructionSummary = computed(() => ({
  label: 'あなたの指示',
  title: visiblePurpose.value || '依頼内容はまだありません',
  detail: activeDraft.value
    ? `${visibleSourceStatus.value}。指定は ${activeDraft.value.settings.durationLabel} / ${activeDraft.value.settings.themeCountLabel} です。`
    : `${visibleSourceStatus.value}。作りたい内容と対象動画を入力してください。`
}));
const currentStatusSummary = computed(() => {
  if (requestFormVisible.value) {
    return {
      tone: 'idle',
      icon: 'mdi-plus-circle-outline',
      label: '現在状況',
      title: '新しい依頼を入力中です',
      detail: '作りたいショートと対象動画を入力します。'
    };
  }

  if (store.runPhase === 'error' || store.errorMessage || failedOperations.value.length > 0) {
    return {
      tone: 'error',
      icon: 'mdi-alert-circle-outline',
      label: '現在状況',
      title: '処理が止まっています',
      detail: store.errorMessage || `${failedOperations.value[0]?.label ?? '処理'} で確認が必要です。`
    };
  }

  if (store.runPhase === 'saving') {
    return {
      tone: 'running',
      icon: 'mdi-content-save-outline',
      label: '現在状況',
      title: '依頼を保存しています',
      detail: '入力内容を保存しています。'
    };
  }

  if (store.runPhase === 'handing_off') {
    return {
      tone: 'running',
      icon: 'mdi-send-outline',
      label: '現在状況',
      title: '作成を始めています',
      detail: '承認済みの依頼から作業順を作っています。'
    };
  }

  if (pendingControlReviews.value.length > 0 || store.runPhase === 'review_required') {
    return {
      tone: 'review',
      icon: 'mdi-account-check-outline',
      label: '現在状況',
      title: '確認が必要です',
      detail: currentControlReview.value?.humanQuestion ?? '確認する内容があります。'
    };
  }

  if (store.runPhase === 'running' || runningOperations.value.length > 0 || waitingOperations.value.length > 0) {
    const operation = runningOperations.value[0] ?? waitingOperations.value[0] ?? currentOperation.value;
    return {
      tone: 'running',
      icon: 'mdi-progress-clock',
      label: '現在状況',
      title: operation ? `「${operation.label}」を作成しています` : '作成しています',
      detail: '必要な確認が出たらここに表示します。'
    };
  }

  if (outputVideoArtifact.value) {
    return {
      tone: 'ready',
      icon: 'mdi-play-box-outline',
      label: '現在状況',
      title: '確認用動画があります',
      detail: '生成後レビューで動画を確認できます。'
    };
  }

  if (selectedOperations.value.length > 0) {
    return {
      tone: 'ready',
      icon: 'mdi-check-circle-outline',
      label: '現在状況',
      title: '確認する内容があります',
      detail: `「${currentWorkflowProcess.value.label}」を確認してください。`
    };
  }

  if (activeDraft.value?.status === 'draft') {
    return {
      tone: 'review',
      icon: 'mdi-file-check-outline',
      label: '現在状況',
      title: '依頼の作成待ちです',
      detail: '内容を確認して作成を始めると、テーマ候補へ進みます。'
    };
  }

  return {
    tone: 'idle',
    icon: 'mdi-plus-circle-outline',
    label: '現在状況',
    title: '新しい依頼を作れます',
    detail: '作りたいショートと対象動画を入力して開始します。'
  };
});
const activeReview = computed(() => {
  if (activeProcessTab.value === 'candidates') {
      return themeControlReview.value;
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
    return videoArtifacts.value;
  }

  return selectedArtifacts.value;
});

function isProcessLockedByReview(key: ProcessTabKey): boolean {
  const requiredTab = requiredReviewProcessTab.value;
  return Boolean(requiredTab && processOrder[key] > processOrder[requiredTab]);
}
const themeArtifactJson = computed(() => artifactJsonFor('propose_clip_themes'));
const compositionArtifactJson = computed(() => artifactJsonFor('build_clip_composition'));
const editPlanArtifactJson = computed(() => artifactJsonFor('create_edit_plan'));
const themeSummaries = computed<ThemeReviewSummary[]>(() => {
  const themes = arrayField(themeArtifactJson.value, 'themes');
  const selectedThemeId = activeReview.value?.kind === 'theme_selection'
    ? selectedReviewOptionId(activeReview.value)
    : '';

  return themes.map((theme, index) => {
    const themeRecord = recordValue(theme);
    const id = stringField(themeRecord, 'id') || `theme_${index + 1}`;
    const rawTitle = stringField(themeRecord, 'title') || `テーマ ${index + 1}`;
    const summary = stringField(themeRecord, 'summary') || '';
    const representativeText = stringField(themeRecord, 'representativeText') || '';
    const placeholder = isPlaceholderThemeText(rawTitle, summary, representativeText);

    return {
      id,
      title: cleanCandidateTitle(rawTitle, index),
      summary: summary || 'テーマの要約は未取得です',
      representativeText: representativeText || '代表発話は未取得です',
      whyItCanBeClipped: themeReasonForDisplay(themeRecord, placeholder),
      selected: selectedThemeId === id
    };
  });
});
const primaryThemeSummary = computed(() => themeSummaries.value.find((theme) => theme.selected) ?? themeSummaries.value[0]);
const editPlanSummary = computed<EditPlanSummary | undefined>(() => {
  const editPlan = editPlanArtifactJson.value;
  if (!editPlan) {
    return undefined;
  }

  const selectedThemeId = stringField(editPlan, 'selectedThemeId') || '選択テーマは未取得です';
  const selectedTheme = themeSummaries.value.find((theme) => theme.id === selectedThemeId);

  const telopTexts = arrayField(editPlan, 'telopPlan')
    .map((item) => stringField(recordValue(item), 'text'))
    .filter((text) => text.length > 0);

  return {
    selectedThemeId,
    selectedThemeTitle: selectedTheme?.title ?? cleanCandidateTitle(selectedThemeId, 0),
    compositionSummary: stringField(compositionArtifactJson.value, 'assemblyPlan') || '複数箇所のつなぎ方は未取得です',
    telopTexts
  };
});
const reviewChoiceCards = computed<ReviewChoice[]>(() => {
  const review = activeReview.value;
  if (!review) {
    return [];
  }

  if (review.kind === 'theme_selection') {
    return [
      {
        action: 'request_changes',
        label: 'テーマを直したい',
        title: 'テーマ候補を作り直す',
        body: '切り抜きたい内容の候補が違う、代表発話が足りない、別のテーマを見たい場合。',
        color: 'deep-orange-darken-4',
        icon: 'mdi-pencil'
      },
      {
        action: 'reject',
        label: 'この方向では作らない',
        title: 'この実行を止める',
        body: '対象動画やテーマ候補の方向性が違い、このまま進めても確認材料にならない場合。',
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
      body: 'テーマ、つなぎ方、テロップで問題ない場合。',
      color: 'primary',
      icon: 'mdi-check'
    },
    {
      action: 'request_changes',
      label: '編集案を直したい',
      title: '動画生成前に戻す',
      body: 'つなぎ方やテロップを直したい場合。',
      color: 'deep-orange-darken-4',
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
    label: 'テーマ',
    title: primaryThemeSummary.value?.title ?? 'テーマの判断材料がまだありません',
    body: primaryThemeSummary.value
      ? primaryThemeSummary.value.summary
      : 'テーマ候補と代表発話ができると整理できます。'
  },
  {
    label: 'つなぎ方',
    title: editPlanSummary.value?.compositionSummary ?? 'つなぎ方はまだありません'
  },
  {
    label: 'テロップ',
    title: editPlanSummary.value?.telopTexts.join(' / ') || 'テロップはまだありません'
  }
]);

function artifactForTypes(types: AgentRequestType[]): ArtifactRow[] {
  return selectedArtifacts.value.filter((artifact) => types.includes(artifact.operation.type));
}

function artifactJsonFor(type: AgentRequestType): Record<string, unknown> | undefined {
  const artifact = [...selectedArtifacts.value].reverse().find((item) => item.operation.type === type);
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

function cleanCandidateTitle(value: string, index: number): string {
  const trimmed = value.trim();
  const withoutId = trimmed.replace(/^(candidate|theme)[_-]?\d+$/i, '').trim();
  const withoutPrefix = withoutId.replace(/^(候補|テーマ)\s*\d+\s*[:：]\s*/, '').trim();

  if (withoutPrefix) {
    return withoutPrefix;
  }

  return `テーマ ${index + 1}`;
}

function isPlaceholderThemeText(title: string, summary: string, representativeText: string): boolean {
  const joined = [title, summary, representativeText].join(' ');
  return (
    joined.includes('配信素材の状況を確認します') ||
    joined.includes('仮書き起こし')
  );
}

function themeReasonForDisplay(theme: Record<string, unknown>, isPlaceholder: boolean): string {
  const rawReason = stringField(theme, 'whyItCanBeClipped');
  const title = stringField(theme, 'title');
  const summary = stringField(theme, 'summary');
  const topic = title || summary;

  if (isPlaceholder) {
    return '代表発話を見て、切り抜きたい内容か判断してください。';
  }

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
    return `${topic} という内容がまとまっており、切り抜きテーマとして比較しやすいため。`;
  }

  return '文字起こし上で切り抜きたい内容として選べるまとまりがあるため。';
}

function processStatusFor(key: ProcessTabKey, review?: ControlReviewItem): ProcessStatus {
  if (review?.status === 'review_required') {
    return 'review';
  }

  const operationTypes = processOperationTypes[key];
  const operations = selectedOperations.value.filter((request) => operationTypes.includes(request.type));
  if (operations.some((request) => ['queued', 'waiting', 'running'].includes(request.status))) {
    return 'running';
  }

  if (review?.status === 'approved') {
    return 'done';
  }

  if (review && ['rejected', 'changes_requested'].includes(review.status)) {
    return 'blocked';
  }

  if (operations.some((request) => request.status === 'failed')) {
    return 'blocked';
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
    return 'deep-orange-darken-4';
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

function actionForReview(review: ControlReviewItem | undefined) {
  if (!review?.resolvedByActionId) {
    return undefined;
  }

  return store.state.humanReviewActions.find((item) => item.id === review.resolvedByActionId);
}

function humanActionMeaning(action: ReturnType<typeof actionForReview>): string {
  if (!action) {
    return 'まだあなたの判断は保存されていません';
  }

  const reason = action.reason && action.reason !== '承認として記録' ? `理由: ${action.reason}` : '';

  if (action.action === 'approve') {
    return reason || '承認しました。';
  }

  if (action.action === 'request_changes') {
    return reason || '修正依頼を保存しました。';
  }

  return reason || '却下しました。';
}

function reviewPrimaryQuestion(review: ControlReviewItem): string {
  if (review.kind === 'theme_selection') {
    return 'どのテーマで切り抜きを作りますか';
  }

  return 'この内容で確認用動画を作ってよいですか';
}

function humanDecisionSummary(review: ControlReviewItem): string {
  const action = actionForReview(review);
  if (!action) {
    return 'まだ判断は保存されていません。';
  }

  if (review.kind === 'theme_selection' && action.action === 'approve') {
    return '切り抜きテーマを選びました。複数箇所の構成案作成へ進みました。';
  }

  if (review.kind === 'render_readiness' && action.action === 'approve') {
    return '編集案を承認しました。確認用動画の生成へ進みました。';
  }

  return humanActionMeaning(action);
}

function nextProcessLabelForReview(review: ControlReviewItem): string {
  return review.kind === 'theme_selection' ? '動画生成前確認を見る' : '生成後レビューを見る';
}

function nextProcessKeyForReview(review: ControlReviewItem): ProcessTabKey {
  return review.kind === 'theme_selection' ? 'edit' : 'video';
}

function reviewChoiceReasonKey(review: ControlReviewItem, action: HumanReviewActionType): string {
  return `${review.id}:${action}`;
}

function selectedReviewOptionId(review: ControlReviewItem): string {
  return selectedReviewOptions[review.id] || review.options[0]?.id || '';
}

function setSelectedReviewOption(review: ControlReviewItem, optionId: string) {
  selectedReviewOptions[review.id] = optionId;
}

async function selectThemeAndProceed(review: ControlReviewItem, optionId: string) {
  setSelectedReviewOption(review, optionId);
  await submitControlReview(review, 'approve');
}

function setReviewChoiceReason(review: ControlReviewItem, action: HumanReviewActionType, value: string | null) {
  reviewReasons[reviewChoiceReasonKey(review, action)] = value ?? '';
}

function reviewChoiceReasonLabel(action: HumanReviewActionType): string {
  if (action === 'approve') {
    return '進めてよい理由';
  }

  if (action === 'request_changes') {
    return '直したい点';
  }

  return '止める理由';
}

function reviewChoiceReasonHint(action: HumanReviewActionType): string {
  if (action === 'approve') {
    return '気になる点がなければ空欄で進められます。';
  }

  if (action === 'request_changes') {
    return '直したい範囲や理由を書くと、その内容で作り直します。';
  }

  return 'なぜ使わないか、どこで止めるべきかを書くと、この判断と一緒に保存されます。';
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
      { label: 'segments', meaning: '話している内容を時間つきで分けたものです。テーマ探しの材料です。' },
      { label: 'startMs / endMs', meaning: '発話が始まる位置と終わる位置です。' },
      { label: 'speechUnitGroups', meaning: '話題のまとまりとして扱う発話の組み合わせです。' }
    ],
    propose_clip_themes: [
      { label: 'themes', meaning: '文字起こしから作った切り抜きテーマ候補です。' },
      { label: 'summary', meaning: 'そのテーマで何を見せるかの短い説明です。' },
      { label: 'representativeText', meaning: 'テーマを選ぶ根拠になる代表発話です。' },
      { label: 'relatedSpeechIds', meaning: '選択後に構成案へ使う関連発話です。' }
    ],
    build_clip_composition: [
      { label: 'selectedThemeId', meaning: '人間が選んだテーマです。' },
      { label: 'parts', meaning: '切り抜きに使う複数の発話箇所です。' },
      { label: 'connectionNote', meaning: '前後の箇所をどうつなぐかの説明です。' },
      { label: 'assemblyPlan', meaning: '複数箇所を並べる方針です。' }
    ],
    create_edit_plan: [
      { label: 'selectedThemeId', meaning: '演出案の前提になったテーマです。' },
      { label: 'geminiApiInput', meaning: '演出作成時にGemini APIへ渡す複数の動画箇所です。' },
      { label: 'renderSegments', meaning: '動画生成に渡す区間と役割です。' },
      { label: 'telopPlan', meaning: '表示するテロップ案です。' }
    ],
    apply_adjustment: [
      { label: 'changes', meaning: '動画生成前に確定した変更点です。' },
      { label: 'reason', meaning: 'なぜその変更を入れるかです。' }
    ],
    render_video: [
      { label: 'output.mp4', meaning: '確認用に生成された動画です。' }
    ]
  } satisfies Record<AgentRequestType, ArtifactGuideItem[]>;

  return guides[artifact.operation.type];
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
  showRequestForm.value = false;
  await store.createRequestDraft({ ...draftInput });
}

function startNewRequest() {
  currentView.value = 'main';
  selectedHistoryDraftId.value = '';
  selectedProcessTab.value = '';
  showDetailData.value = false;
  showRequestForm.value = true;
}

function closeRequestForm() {
  showRequestForm.value = false;
}

async function approveLatestDraft() {
  if (!activeDraft.value || activeDraft.value.status !== 'draft') {
    return;
  }

  await store.approveRequestDraft(activeDraft.value.id);
}

function selectHistoryDraft(id: string) {
  selectedHistoryDraftId.value = id;
  currentView.value = 'main';
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
  const reasonKey = reviewChoiceReasonKey(review, action);
  const reason = reviewReasons[reasonKey] ?? '';
  const selectedOptionId = action === 'approve' && review.kind === 'theme_selection'
    ? selectedReviewOptionId(review)
    : undefined;
  await store.submitControlReview(review.id, action, reason, selectedOptionId);
  const reviewActions: HumanReviewActionType[] = ['approve', 'request_changes', 'reject'];
  for (const reviewAction of reviewActions) {
    reviewReasons[reviewChoiceReasonKey(review, reviewAction)] = '';
  }
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
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
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
          </div>
          <div class="top-actions">
            <v-btn v-if="currentView === 'main'" prepend-icon="mdi-history" variant="text" @click="openHistory">
              実行履歴を見る
            </v-btn>
          </div>
        </header>

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
          <section class="current-status-panel" :class="`is-${currentStatusSummary.tone}`">
            <div class="current-status-main">
              <div class="current-status-icon">
                <v-icon size="26">{{ currentStatusSummary.icon }}</v-icon>
              </div>
              <div>
                <span>{{ currentStatusSummary.label }}</span>
                <strong>{{ currentStatusSummary.title }}</strong>
                <p>{{ currentStatusSummary.detail }}</p>
              </div>
            </div>
            <div class="current-status-meta">
              <v-chip size="small" :color="visibleDraftStatus.color" variant="flat">
                {{ visibleDraftStatus.label }}
              </v-chip>
              <span v-if="store.lastChangedAt">最終更新 {{ formatTime(store.lastChangedAt) }}</span>
            </div>
          </section>

          <section v-if="!requestFormVisible && activeDraft" class="instruction-summary">
            <span>あなたの指示</span>
            <p>{{ userInstructionSummary.title }}</p>
            <small>{{ userInstructionSummary.detail }}</small>
          </section>

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
                  v-model="draftInput.themeCountLabel"
                  :items="['3テーマ', '5テーマ', '1テーマ']"
                  label="見たいテーマ数"
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
          <div v-else class="request-utility-panel">
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-plus"
              @click="startNewRequest"
            >
              新しい依頼を作る
            </v-btn>
          </div>

          <template v-if="!requestFormVisible">
            <v-sheet class="panel overview-panel" rounded border>
              <div class="overview-heading">
                <div>
                  <p class="eyebrow">全体の流れ</p>
                  <h2>{{ workflowPositionText }}</h2>
                </div>
              </div>

              <div class="process-flow" :style="{ '--step-count': String(processTabs.length) }">
                <button
                  v-for="tab in processTabs"
                  :key="tab.key"
                  type="button"
                  class="process-flow-step"
                  :class="[`is-${tab.status}`, { 'is-active': activeProcessTab === tab.key, 'is-locked': isProcessLockedByReview(tab.key) }]"
                  :disabled="isProcessLockedByReview(tab.key)"
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
                  <span>今決めること</span>
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
                      <strong>{{ activeDraft.settings.durationLabel }} / {{ activeDraft.settings.themeCountLabel }}</strong>
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
                    <div v-if="activeHumanAction" class="human-decision-card">
                      <span>あなたの前回判断</span>
                      <strong>{{ controlReviewStatusLabel[activeReview.status] }}</strong>
                      <p>{{ humanDecisionSummary(activeReview) }}</p>
                    </div>

                    <div
                      v-if="activeReview.kind === 'theme_selection' && themeSummaries.length > 0"
                      class="candidate-review-list"
                    >
                      <article
                        v-for="theme in themeSummaries"
                        :key="theme.id"
                        class="candidate-review-card"
                        :class="{ 'is-selected': theme.selected }"
                      >
                        <div class="candidate-review-heading">
                          <span>テーマ候補</span>
                          <strong>{{ theme.title }}</strong>
                        </div>
                        <p><strong>内容:</strong> {{ theme.summary }}</p>
                        <p><strong>選べる理由:</strong> {{ theme.whyItCanBeClipped }}</p>
                        <details class="candidate-transcript">
                          <summary>代表発話を見る</summary>
                          <p>{{ theme.representativeText }}</p>
                        </details>
                        <v-btn
                          v-if="activeReview.status === 'review_required'"
                          size="small"
                          :color="theme.selected ? 'primary' : 'blue-grey'"
                          variant="tonal"
                          prepend-icon="mdi-check-circle-outline"
                          :loading="store.loading && theme.selected"
                          :disabled="store.loading"
                          @click="selectThemeAndProceed(activeReview, theme.id)"
                        >
                          このテーマで進める
                        </v-btn>
                      </article>
                    </div>
                    <div v-else-if="activeReview.kind === 'theme_selection'" class="collapsed-note">
                      テーマ候補を読み込んでいます。
                    </div>

                    <div v-else-if="editPlanSummary" class="edit-plan-review">
                      <article>
                        <span>テーマ</span>
                        <strong>{{ editPlanSummary.selectedThemeTitle }}</strong>
                      </article>
                      <article>
                        <span>つなぎ方</span>
                        <strong>{{ editPlanSummary.compositionSummary }}</strong>
                      </article>
                      <article>
                        <span>テロップ</span>
                        <strong>{{ editPlanSummary.telopTexts.join(' / ') || 'テロップは未取得です' }}</strong>
                      </article>
                    </div>
                    <div v-else class="collapsed-note">
                      テーマ、つなぎ方、テロップを読み込んでいます。
                    </div>

                    <div v-if="activeReview.status === 'review_required'" class="review-decision-area">
                      <div class="review-choice-grid">
                        <article
                          v-for="choice in reviewChoiceCards"
                          :key="choice.action"
                          class="review-choice-card"
                          :class="`is-${choice.action}`"
                        >
                          <span>{{ choice.title }}</span>
                          <strong>{{ choice.label }}</strong>
                          <p>{{ choice.body }}</p>
                          <div class="choice-reason-field">
                            <v-textarea
                              :model-value="reviewReasons[reviewChoiceReasonKey(activeReview, choice.action)] ?? ''"
                              :label="reviewChoiceReasonLabel(choice.action)"
                              :hint="reviewChoiceReasonHint(choice.action)"
                              persistent-hint
                              rows="2"
                              auto-grow
                              density="compact"
                              @update:model-value="setReviewChoiceReason(activeReview, choice.action, $event)"
                            />
                          </div>
                          <v-btn
                            :color="choice.color"
                            variant="flat"
                            :prepend-icon="choice.icon"
                            :loading="store.loading"
                            @click="submitControlReview(activeReview, choice.action)"
                          >
                            {{ choice.label }}
                          </v-btn>
                        </article>
                      </div>
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
                  </div>
                  <div v-else class="collapsed-note">
                    まだ作成中、または未作成です。
                  </div>
                </div>

                <div v-else-if="activeProcessTab === 'video' || activeProcessTab === 'notes'" class="tab-section">
                  <div v-if="outputVideoArtifact" class="video-focus">
                    <video
                      class="artifact-video large"
                      controls
                      :src="outputVideoArtifact.fileRef.uri"
                    />
                  </div>
                  <div v-else class="collapsed-note">
                    まだ確認用動画はありません。動画生成前確認で動画作成を承認すると、ここに表示されます。
                  </div>

                  <div class="fix-summary-grid">
                    <article v-for="card in fixSummaryCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ card.title }}</strong>
                      <p v-if="card.body">{{ card.body }}</p>
                    </article>
                  </div>
                  <div v-if="failedOperations.length > 0" class="collapsed-note">
                    {{ failedOperations[0].label }} で止まっています。失敗内容を確認してください。
                  </div>
                  <div v-if="selectedControlReviews.length > 0" class="review-history">
                    <article v-for="review in selectedControlReviews" :key="review.id">
                      <span>{{ actionForReview(review) ? 'あなたの判断' : '確認待ち' }}</span>
                      <strong>{{ controlReviewStatusLabel[review.status] }}</strong>
                      <p>{{ actionForReview(review) ? humanDecisionSummary(review) : reviewPrimaryQuestion(review) }}</p>
                    </article>
                  </div>
                </div>

                <div v-if="activeArtifacts.length > 0" class="artifact-panel">
                  <div class="artifact-heading">
                    <div>
                      <span>詳細</span>
                      <strong>補助情報</strong>
                    </div>
                    <v-btn
                      size="small"
                      variant="tonal"
                      :prepend-icon="showDetailData ? 'mdi-eye-off-outline' : 'mdi-file-eye-outline'"
                      @click="showDetailData = !showDetailData"
                    >
                      {{ showDetailData ? '詳細を閉じる' : '詳細を開く' }}
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

.current-status-panel {
  align-items: start;
  background: #ffffff;
  border: 1px solid #cfd8e2;
  border-left: 6px solid #475569;
  border-radius: 8px;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 14px;
}

.current-status-panel.is-running {
  border-left-color: #1d5fa8;
}

.current-status-panel.is-review {
  border-left-color: #9a3412;
}

.current-status-panel.is-ready {
  border-left-color: #1f7a4d;
}

.current-status-panel.is-error {
  border-left-color: #b42318;
}

.current-status-main {
  align-items: start;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr);
}

.current-status-icon {
  align-items: center;
  background: #eef2f5;
  border-radius: 50%;
  color: #34495e;
  display: grid;
  height: 42px;
  justify-items: center;
  width: 42px;
}

.current-status-panel.is-running .current-status-icon {
  background: #e8f2ff;
  color: #1d5fa8;
}

.current-status-panel.is-review .current-status-icon {
  background: #fff4ed;
  color: #7c2d12;
}

.current-status-panel.is-ready .current-status-icon {
  background: #e7f5ed;
  color: #1f7a4d;
}

.current-status-panel.is-error .current-status-icon {
  background: #fff0ef;
  color: #b42318;
}

.current-status-main span,
.instruction-summary span {
  color: #607080;
  display: block;
  font-size: 12px;
  font-weight: 800;
}

.current-status-main strong {
  display: block;
  font-size: 20px;
  line-height: 1.35;
}

.current-status-main p {
  color: #34495e;
  margin-top: 5px;
  overflow-wrap: anywhere;
}

.current-status-meta {
  align-items: end;
  display: grid;
  gap: 6px;
  justify-items: end;
}

.current-status-meta span {
  color: #607080;
  font-size: 12px;
  font-weight: 700;
}

.instruction-summary {
  border-left: 2px solid #cfd8e2;
  display: grid;
  gap: 3px;
  margin-left: 8px;
  padding-left: 14px;
}

.instruction-summary p {
  color: #17212b;
  font-size: 14px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.instruction-summary small {
  color: #607080;
  font-size: 12px;
  overflow-wrap: anywhere;
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
  display: flex;
  justify-content: flex-start;
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

.process-flow-step:disabled {
  cursor: not-allowed;
}

.process-flow-step.is-locked {
  opacity: 0.55;
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
  background: #fff4ed;
  border-color: #c2410c;
  color: #7c2d12;
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

.tab-section,
.artifact-panel {
  border-left: 2px solid #dce4ec;
  margin-left: 12px;
  padding-left: 14px;
}

.question-card {
  background: #ffffff;
  border: 1px solid #b7cfe7;
  border-left: 5px solid #1d5fa8;
  border-radius: 8px;
  display: grid;
  gap: 5px;
  padding: 14px;
}

.question-card span,
.summary-grid span,
.review-main-question span,
.decision-grid span,
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
.fix-summary-grid,
.judgement-guide {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.review-choice-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
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
  background: #fff4ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  display: grid;
  gap: 5px;
  padding: 12px;
}

.human-decision-card,
.review-complete-card {
  border-radius: 8px;
  display: grid;
  gap: 5px;
  padding: 12px;
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

	.candidate-review-card.is-selected {
	  border-color: #2f7ed8;
	  box-shadow: inset 0 0 0 1px #2f7ed8;
	}

.candidate-review-heading {
  align-items: start;
  display: grid;
  gap: 3px;
  justify-items: start;
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

.review-decision-area {
  border-top: 1px solid #dce4ec;
  display: grid;
  gap: 10px;
  padding-top: 12px;
}

.review-choice-card {
  border: 1px solid #dce4ec;
  border-left-width: 4px;
  min-height: 100%;
  padding: 12px;
}

.review-choice-card.is-approve {
  border-left-color: #1d5fa8;
}

.review-choice-card.is-request_changes {
  border-left-color: #9a3412;
}

.review-choice-card.is-reject {
  border-left-color: #b42318;
}

.review-choice-card .v-btn {
  align-self: end;
  justify-self: start;
  margin-top: 4px;
}

.choice-reason-field {
  border-left: 2px solid #dce4ec;
  margin-left: 6px;
  padding-left: 12px;
}

.video-focus {
  align-items: start;
  display: grid;
  grid-template-columns: minmax(180px, 300px);
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
  background: #fff4ed;
  border-color: #c2410c;
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
