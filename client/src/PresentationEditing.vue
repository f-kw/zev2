<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  EditingApiError, editingErrorText, editingReasonText, fetchEditingPlayhead, fetchEditingState, fetchEditingTarget,
  requestEditingJob, retryEditingJob, saveEditingSelection, seekEditingTarget,
  type EditingCaption, type EditingConnection, type EditingJob,
  type EditingPlayhead, type EditingSelection, type EditingState, type EditingTarget, type EditingTargetKind,
} from './presentation-editing-api';

const state = ref<EditingState | null>(null);
const loading = ref(true);
const pageError = ref('');
const notice = ref('');
const listKind = ref<EditingTargetKind>('caption');
const search = ref('');
const presetFilter = ref('');
const statusFilter = ref('');
const changeFilter = ref<'all' | 'changed' | 'unchanged'>('all');
const selected = ref<{ kind: EditingTargetKind; id: string } | null>(null);
const target = ref<EditingTarget | null>(null);
const targetLoading = ref(false);
const targetError = ref('');
const saving = ref(false);
const conflict = ref(false);
const jobStarting = ref(false);
const contextSeconds = ref(2);
const player = ref<HTMLVideoElement | null>(null);
const colorText = ref<HTMLTextAreaElement | null>(null);
const selectedMediaId = ref('');
const playhead = ref<EditingPlayhead | null>(null);
const playheadError = ref('');
const seekNotice = ref('');
const currentSeconds = ref(0);
const pendingTarget = ref<{ kind: EditingTargetKind; id: string } | null>(null);
const draft = reactive({ preset: '', colorScope: 'whole-caption' as 'whole-caption' | 'partial-caption',
  startUtf16: 0, endUtf16: 0, selectedText: '', anchorPeakId: '' });
const pristineDraft = ref('');
let targetSequence = 0;
let stateSequence = 0;
let playheadSequence = 0;
let seekSequence = 0;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let playheadBusy = false;
let nextPlayhead: { mediaId: string; seconds: number } | null = null;
let requestedJobId = '';
let handledJobId = '';
let pendingSeek: number | null = null;
let unmounted = false;

const draftSignature = () => JSON.stringify(draft);
const dirty = computed(() => target.value !== null && draftSignature() !== pristineDraft.value);
const activeMedia = computed(() => state.value?.media.find(media => media.id === selectedMediaId.value) ?? null);
const activeJob = computed(() => state.value?.job ?? null);
const jobRunning = computed(() => activeJob.value?.status === 'running');
const selectedRow = computed(() => {
  if (!state.value || !selected.value) return null;
  return selected.value.kind === 'caption'
    ? state.value.captions.find(row => row.id === selected.value?.id) ?? null
    : state.value.connections.find(row => row.id === selected.value?.id) ?? null;
});
const rowsForFilters = computed(() => listKind.value === 'caption' ? state.value?.captions ?? [] : state.value?.connections ?? []);
const presetFilters = computed(() => [...new Map(rowsForFilters.value.map(row => [row.preset, row.presetLabel])).entries()]);
const statusFilters = computed(() => [...new Map(rowsForFilters.value.map(row => [row.status, row.statusLabel])).entries()]);
function matchesFilters(row: EditingCaption | EditingConnection): boolean {
  const text = 'text' in row ? row.text : row.beforeText + '\n' + row.afterText;
  return (!search.value || text.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()))
    && (!presetFilter.value || row.preset === presetFilter.value)
    && (!statusFilter.value || row.status === statusFilter.value)
    && (changeFilter.value === 'all' || row.hasOverride === (changeFilter.value === 'changed'));
}
const visibleCaptions = computed(() => (state.value?.captions ?? []).filter(matchesFilters));
const visibleConnections = computed(() => (state.value?.connections ?? []).filter(matchesFilters));
const currentCaptions = computed(() => (state.value?.captions ?? []).filter(row => playhead.value?.captionIds.includes(row.id)));
const currentConnections = computed(() => (state.value?.connections ?? []).filter(row => playhead.value?.connectionIds.includes(row.id)));
const nearbyCaptions = computed(() => (state.value?.captions ?? []).filter(row => playhead.value?.nearbyCaptionIds.includes(row.id)
  && !playhead.value.captionIds.includes(row.id)));
const nearbyConnections = computed(() => (state.value?.connections ?? []).filter(row => playhead.value?.nearbyConnectionIds.includes(row.id)
  && !playhead.value.connectionIds.includes(row.id)));
const selectedOption = computed(() => target.value?.options.find(option => option.value === draft.preset));
const disabledOptions = computed(() => target.value?.options.filter(option => !option.enabled) ?? []);
const playableMedia = computed(() => [...state.value?.media ?? []].reverse());
const savedStatus = computed(() => dirty.value ? '画面に未保存の変更があります' : '画面の内容は保存済みです');
const playingStatus = computed(() => {
  const media = activeMedia.value;
  if (!media) return '再生する動画がありません';
  if (media.isCurrent) return media.kind === 'preview' ? 'この周辺だけ、最新の保存状態で確認できます' : '全編に最新の保存状態を反映しています';
  return media.kind === 'preview' ? 'この周辺動画には、その後の保存変更が未反映です' : '保存済みの変更は、再生中の全編には未反映です';
});
const targetContext = computed(() => {
  if (!state.value || !selected.value || selected.value.kind !== 'caption') return null;
  const index = state.value.captions.findIndex(row => row.id === selected.value?.id);
  return { before: state.value.captions[index - 1]?.text, after: state.value.captions[index + 1]?.text };
});

function time(seconds: number): string {
  const value = Math.max(0, seconds);
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + (value % 60).toFixed(2).padStart(5, '0');
}
const frameTime = (frame: number) => time(frame / (state.value?.fps ?? 30));
function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}
function jobLabel(job: EditingJob): string {
  return job.kind === 'preview' ? '周辺の確認動画' : '変更を反映した全編';
}
function stopPolling() {
  if (pollTimer !== undefined) clearTimeout(pollTimer);
  pollTimer = undefined;
}
function schedulePolling() {
  stopPolling();
  if (!unmounted && state.value?.job?.status === 'running') pollTimer = setTimeout(() => void reloadState(false), 2000);
}
async function acceptState(next: EditingState) {
  if (unmounted) return;
  state.value = next;
  if (!next.media.some(media => media.id === selectedMediaId.value)) {
    selectedMediaId.value = [...next.media].reverse().find(media => media.kind === 'full')?.id ?? next.media[0]?.id ?? '';
    playhead.value = null;
  }
  const job = next.job;
  if (job && job.id === requestedJobId && job.id !== handledJobId && job.status !== 'running') {
    handledJobId = job.id;
    if (job.status === 'succeeded') {
      notice.value = jobLabel(job) + 'ができました。';
      if (job.mediaId && next.media.some(media => media.id === job.mediaId)) await selectMedia(job.mediaId);
    }
  }
  schedulePolling();
}
async function reloadState(showLoading = true) {
  if (saving.value || jobStarting.value) { schedulePolling(); return; }
  const sequence = ++stateSequence;
  if (showLoading) loading.value = true;
  try {
    const next = await fetchEditingState();
    if (sequence !== stateSequence || unmounted) return;
    await acceptState(next);
    pageError.value = '';
    if (target.value && !dirty.value && target.value.revision !== state.value?.revision && !targetLoading.value && !saving.value) {
      await loadSelectedTarget();
    }
  } catch (error) {
    if (sequence === stateSequence) {
      pageError.value = editingErrorText(error);
      schedulePolling();
    }
  } finally {
    if (sequence === stateSequence) loading.value = false;
  }
}
function resetForm(detail: EditingTarget) {
  const next = { preset: '', colorScope: 'whole-caption' as 'whole-caption' | 'partial-caption',
    startUtf16: 0, endUtf16: 0, selectedText: '', anchorPeakId: '' };
  const selection = detail.selection;
  if (typeof selection === 'string') {
    next.preset = selection === 'Normal' ? (detail.kind === 'caption' ? 'normal' : 'normal-cut') : selection;
  } else {
    next.preset = selection.preset;
    if (selection.preset === 'color') {
      next.colorScope = selection.scope;
      if (selection.scope === 'partial-caption') {
        next.startUtf16 = selection.startUtf16;
        next.endUtf16 = selection.endUtf16;
        next.selectedText = selection.selectedText;
      }
    } else if (selection.preset === 'pulse') next.anchorPeakId = selection.anchorPeakId;
  }
  if (detail.colorRange && next.colorScope === 'partial-caption') {
    next.startUtf16 = detail.colorRange.startUtf16;
    next.endUtf16 = detail.colorRange.endUtf16;
    next.selectedText = (detail.text ?? '').slice(next.startUtf16, next.endUtf16);
  }
  if (!detail.options.some(option => option.value === next.preset)) {
    throw new Error('現在の表現を操作欄へ読み込めませんでした。保存せずに再読み込みしてください。');
  }
  Object.assign(draft, next);
  pristineDraft.value = draftSignature();
}
async function loadSelectedTarget() {
  const choice = selected.value;
  if (!choice) return;
  const sequence = ++targetSequence;
  targetLoading.value = true;
  targetError.value = '';
  try {
    const detail = await fetchEditingTarget(choice.kind, choice.id);
    if (sequence !== targetSequence || unmounted) return;
    resetForm(detail);
    target.value = detail;
    conflict.value = false;
  } catch (error) {
    if (sequence === targetSequence) targetError.value = editingErrorText(error);
  } finally {
    if (sequence === targetSequence) targetLoading.value = false;
  }
}
async function performTargetSelection(kind: EditingTargetKind, id: string) {
  selected.value = { kind, id };
  target.value = null;
  targetError.value = '';
  seekNotice.value = '';
  await loadSelectedTarget();
  if (target.value) await seekToTarget(kind, id);
}
function chooseTarget(kind: EditingTargetKind, id: string) {
  if (saving.value || targetLoading.value || (selected.value?.kind === kind && selected.value.id === id)) return;
  if (dirty.value) {
    pendingTarget.value = { kind, id };
    return;
  }
  void performTargetSelection(kind, id);
}
async function continueTargetSelection(saveFirst: boolean) {
  const next = pendingTarget.value;
  if (!next) return;
  if (saveFirst && !await saveCurrent()) return;
  pendingTarget.value = null;
  await performTargetSelection(next.kind, next.id);
}
function setListKind(kind: EditingTargetKind) {
  listKind.value = kind;
  presetFilter.value = '';
  statusFilter.value = '';
}
async function seekToTarget(kind: EditingTargetKind, id: string) {
  const media = activeMedia.value;
  if (!media) return;
  const sequence = ++seekSequence;
  try {
    const result = await seekEditingTarget(media.id, kind, id);
    if (sequence !== seekSequence || activeMedia.value?.id !== media.id || unmounted) return;
    if (result.seconds === null) {
      seekNotice.value = result.reason ?? 'この動画の範囲には含まれていません。全編を選ぶと、この対象へ移動できます。';
      return;
    }
    seekNotice.value = '';
    pendingSeek = result.seconds;
    if (player.value && player.value.readyState >= 1) applyPendingSeek();
  } catch (error) {
    if (sequence === seekSequence) seekNotice.value = editingErrorText(error);
  }
}
function applyPendingSeek() {
  if (!player.value || pendingSeek === null) return;
  player.value.pause();
  player.value.currentTime = pendingSeek;
  currentSeconds.value = pendingSeek;
  pendingSeek = null;
  updatePlayhead();
}
async function selectMedia(id: string) {
  if (!state.value?.media.some(media => media.id === id)) return;
  ++seekSequence;
  ++playheadSequence;
  nextPlayhead = null;
  selectedMediaId.value = id;
  playhead.value = null;
  seekNotice.value = '';
  playheadError.value = '';
  currentSeconds.value = 0;
  pendingSeek = 0;
  await nextTick();
  if (player.value?.readyState && player.value.readyState >= 1) applyPendingSeek();
}
function updatePlayhead() {
  const media = activeMedia.value;
  if (!media || !player.value) return;
  const seconds = player.value.currentTime;
  currentSeconds.value = seconds;
  nextPlayhead = { mediaId: media.id, seconds };
  ++playheadSequence;
  if (!playheadBusy) void drainPlayhead();
}
async function drainPlayhead() {
  playheadBusy = true;
  try {
    while (nextPlayhead && !unmounted) {
      const observation = nextPlayhead;
      nextPlayhead = null;
      const sequence = playheadSequence;
      try {
        const result = await fetchEditingPlayhead(observation.mediaId, observation.seconds);
        if (sequence === playheadSequence && observation.mediaId === activeMedia.value?.id) {
          playhead.value = result;
          playheadError.value = '';
        }
      } catch (error) {
        if (sequence === playheadSequence) playheadError.value = editingErrorText(error);
      }
    }
  } finally {
    playheadBusy = false;
  }
}
function onColorSelection() {
  const input = colorText.value;
  const source = target.value?.text;
  if (!input || source === undefined || input.selectionStart === input.selectionEnd) return;
  if (source.replace(/\r\n?/g, '\n') !== input.value) {
    targetError.value = '表示中の原文を確認できません。対象を読み込み直してから範囲を選んでください。';
    return;
  }
  const originalOffset = (displayedOffset: number) => {
    let offset = 0;
    for (let displayed = 0; displayed < displayedOffset; displayed++) {
      offset += source[offset] === '\r' && source[offset + 1] === '\n' ? 2 : 1;
    }
    return offset;
  };
  draft.colorScope = 'partial-caption';
  draft.startUtf16 = originalOffset(input.selectionStart);
  draft.endUtf16 = originalOffset(input.selectionEnd);
  draft.selectedText = source.slice(draft.startUtf16, draft.endUtf16);
}
function currentSelection(): EditingSelection {
  if (!target.value) throw new Error('変更する対象を選んでください。');
  if (!selectedOption.value?.enabled) throw new Error(selectedOption.value?.reason ?? 'この表現は対象へ適用できません。');
  if (target.value.kind === 'connection') {
    if (!['normal-cut', 'black-separator', 'soft-separator'].includes(draft.preset)) throw new Error('接続表現を選んでください。');
    return draft.preset as 'normal-cut' | 'black-separator' | 'soft-separator';
  }
  if (draft.preset === 'color') {
    if (draft.colorScope === 'whole-caption') return { preset: 'color', scope: 'whole-caption' };
    if (draft.endUtf16 <= draft.startUtf16 || !draft.selectedText
      || target.value.text?.slice(draft.startUtf16, draft.endUtf16) !== draft.selectedText) {
      throw new Error('原文の中から、色を付ける連続した範囲を選んでください。');
    }
    return { preset: 'color', scope: 'partial-caption', startUtf16: draft.startUtf16,
      endUtf16: draft.endUtf16, selectedText: draft.selectedText };
  }
  if (draft.preset === 'pulse') {
    if (!target.value.peakOptions.some(peak => peak.id === draft.anchorPeakId)) throw new Error('使用できる音のピークを選んでください。');
    return { preset: 'pulse', anchorPeakId: draft.anchorPeakId };
  }
  if (!['normal', 'scale', 'panel', 'bounce', 'shake'].includes(draft.preset)) throw new Error('字幕表現を選んでください。');
  return { preset: draft.preset as 'normal' | 'scale' | 'panel' | 'bounce' | 'shake' };
}
async function saveCurrent(forced?: 'Normal' | 'Reset'): Promise<boolean> {
  const detail = target.value;
  const current = state.value;
  if (!detail || !current || saving.value || jobStarting.value || targetLoading.value) return false;
  let selection: EditingSelection;
  try { selection = forced ?? currentSelection(); } catch (error) { targetError.value = editingErrorText(error); return false; }
  saving.value = true;
  ++stateSequence;
  loading.value = false;
  targetError.value = '';
  try {
    const next = await saveEditingSelection({ expectedRevision: detail.revision, kind: detail.kind,
      itemId: detail.id, selection }, current.csrfToken);
    await acceptState(next);
    await loadSelectedTarget();
    notice.value = forced === 'Reset' ? 'この一件を保存済みの自動案へ戻しました。'
      : forced === 'Normal' ? 'この一件を通常表示へ固定しました。' : 'この一件の変更を保存しました。';
    conflict.value = false;
    return true;
  } catch (error) {
    targetError.value = editingErrorText(error);
    if (error instanceof EditingApiError && error.status === 409) conflict.value = true;
    return false;
  } finally {
    saving.value = false;
    schedulePolling();
  }
}
async function discardAndReload() {
  if (saving.value || jobStarting.value || targetLoading.value) return;
  ++stateSequence;
  loading.value = false;
  targetLoading.value = true;
  try {
    await acceptState(await fetchEditingState());
    await loadSelectedTarget();
  } catch (error) { targetError.value = editingErrorText(error); }
  finally { targetLoading.value = false; }
}
async function startJob(kind: 'preview' | 'full') {
  const current = state.value;
  if (!current || jobRunning.value || jobStarting.value || saving.value) return;
  if (dirty.value) { targetError.value = '画面の変更を先に保存してください。確認と全編出力は保存済みの状態を使います。'; return; }
  if (kind === 'preview' && !selected.value) { notice.value = '周辺を確認する字幕または接続を選んでください。'; return; }
  if (kind === 'preview' && (!Number.isFinite(contextSeconds.value) || contextSeconds.value < 2)) {
    targetError.value = '前後の文脈は 2 秒以上で指定してください。'; return;
  }
  jobStarting.value = true;
  ++stateSequence;
  loading.value = false;
  pageError.value = '';
  try {
    const job = await requestEditingJob({ expectedRevision: current.revision, kind,
      ...(kind === 'preview' && selected.value ? { target: { kind: selected.value.kind, itemId: selected.value.id },
        contextSeconds: contextSeconds.value } : {}) }, current.csrfToken);
    requestedJobId = job.id;
    await acceptState({ ...(state.value ?? current), job });
    notice.value = jobLabel(job) + 'を準備しています。保存した変更は、その間も編集できます。';
  } catch (error) { pageError.value = editingErrorText(error); return; }
  finally { jobStarting.value = false; }
  await reloadState(false);
}
async function retryJob() {
  const current = state.value;
  const failed = activeJob.value;
  if (!current || !failed || failed.status !== 'failed' || saving.value || jobStarting.value) return;
  jobStarting.value = true;
  ++stateSequence;
  loading.value = false;
  pageError.value = '';
  try {
    const job = await retryEditingJob(failed.id, current.csrfToken);
    requestedJobId = job.id;
    await acceptState({ ...(state.value ?? current), job });
    notice.value = '失敗した処理と同じ保存状態で再試行しています。画面の未保存変更や、その後の保存変更は含みません。';
  } catch (error) { pageError.value = editingErrorText(error); return; }
  finally { jobStarting.value = false; }
  await reloadState(false);
}

onMounted(() => { document.title = '完成動画を後修正 — zev2'; void reloadState(); });
onBeforeUnmount(() => { unmounted = true; stopPolling(); ++stateSequence; ++targetSequence; ++playheadSequence; ++seekSequence; });
</script>

<template>
  <main class="editing-page">
    <header class="page-header">
      <div><p class="eyebrow">ZEV / 完成動画の後修正</p><h1>{{ state?.title || '完成動画を後修正' }}</h1>
        <p class="intro">気になる一件を選び、保存して、周辺から確認できます。</p></div>
      <button type="button" class="secondary" :disabled="loading || saving || jobStarting || targetLoading" @click="reloadState()">{{ loading ? '読込中…' : '保存状態を再読込み' }}</button>
    </header>

    <p v-if="pageError" class="error" role="alert">{{ pageError }}</p>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <p v-if="loading && !state" class="loading" role="status">保存済みの編集状態を読み込んでいます。</p>

    <template v-if="state">
      <section class="state-strip" aria-label="保存と再生の状態">
        <div :class="{ pending: dirty }"><span>画面の変更</span><strong>{{ savedStatus }}</strong></div>
        <div><span>最後の保存</span><strong>{{ dateTime(state.savedAt) || '保存済み' }}</strong></div>
        <div :class="{ pending: activeMedia && !activeMedia.isCurrent }"><span>再生中の動画</span><strong>{{ playingStatus }}</strong></div>
      </section>

      <section v-if="activeJob" class="job-panel" :class="{ failed: activeJob.status === 'failed' }" aria-label="確認と全編出力の状況" aria-live="polite">
        <div><strong>{{ jobLabel(activeJob) }} — {{ activeJob.status === 'running' ? '処理中' : activeJob.status === 'succeeded' ? '完了' : '失敗' }}</strong>
          <p>{{ activeJob.phase }}</p>
          <p v-if="activeJob.revision !== state.revision">処理開始後に変更が保存されています。この処理は開始時の保存状態を使います。</p>
          <p v-if="activeJob.error" class="error">{{ editingReasonText(activeJob.error) }}</p>
          <p v-if="activeJob.status === 'failed'">保存した変更と、最後に成功した動画は保持されています。再試行は失敗した処理と同じ保存状態を使います。</p>
        </div>
        <button v-if="activeJob.status === 'succeeded' && activeJob.mediaId" type="button" class="secondary" @click="selectMedia(activeJob.mediaId)">できた動画を再生</button>
        <button v-if="activeJob.status === 'failed'" type="button" class="secondary" :disabled="saving || jobStarting" @click="retryJob">{{ jobStarting ? '再試行を開始中…' : '失敗時の保存状態で再試行' }}</button>
      </section>

      <div class="workspace">
        <section class="playback panel" aria-label="完成動画と再生位置">
          <div class="section-heading"><h2>動画を見ながら探す</h2><span v-if="activeMedia" class="pill">{{ activeMedia.kind === 'full' ? '全編' : '周辺だけの確認' }}</span></div>
          <label class="field">再生する動画
            <select :value="selectedMediaId" @change="selectMedia(($event.target as HTMLSelectElement).value)">
              <option v-for="media in playableMedia" :key="media.id" :value="media.id">{{ media.label }}{{ media.isCurrent ? ' · 最新の保存状態' : ' · 以前の保存状態' }}</option>
            </select>
          </label>
          <video v-if="activeMedia" :key="activeMedia.id" ref="player" controls playsinline preload="metadata" :src="activeMedia.url"
            aria-label="確認動画" @loadedmetadata="applyPendingSeek(); updatePlayhead()" @timeupdate="updatePlayhead" @seeked="updatePlayhead"
            @error="playheadError = '動画を読み込めませんでした。保存状態を再読み込みして、再生する動画を選び直してください。'" />
          <p v-else class="empty">再生できる動画がまだありません。</p>
          <p v-if="activeMedia" class="playback-description">{{ playingStatus }}<template v-if="activeMedia.kind === 'preview'">。確認範囲 {{ frameTime(activeMedia.range.startFrame) }}–{{ frameTime(activeMedia.range.endFrameExclusive) }}。全編の反映状況とは別です。</template></p>
          <p v-if="seekNotice" class="notice" role="status">{{ seekNotice }}</p>
          <p v-if="playheadError" class="error" role="alert">{{ playheadError }}</p>

          <div class="playhead-targets">
            <h3>再生位置 {{ time(currentSeconds) }} の対象</h3>
            <p v-if="!playhead && activeMedia" class="muted">再生位置に対応する対象を確認しています。</p>
            <p v-else-if="playhead && !currentCaptions.length && !currentConnections.length" class="empty">この位置に字幕・接続の対象はありません。近くの対象を選ぶか、一覧から探せます。</p>
            <button v-for="row in currentCaptions" :key="row.id" type="button" class="target-pill" @click="chooseTarget('caption', row.id)"><span>字幕</span>{{ row.text }}</button>
            <button v-for="row in currentConnections" :key="row.id" type="button" class="target-pill" @click="chooseTarget('connection', row.id)"><span>接続</span>{{ row.beforeText }} → {{ row.afterText }}</button>
            <details v-if="nearbyCaptions.length || nearbyConnections.length" class="nearby"><summary>近くの対象を選ぶ</summary>
              <button v-for="row in nearbyCaptions" :key="row.id" type="button" class="target-pill" @click="chooseTarget('caption', row.id)"><span>{{ frameTime(row.startFrame) }} 字幕</span>{{ row.text }}</button>
              <button v-for="row in nearbyConnections" :key="row.id" type="button" class="target-pill" @click="chooseTarget('connection', row.id)"><span>{{ frameTime(row.boundaryFrame) }} 接続</span>{{ row.beforeText }} → {{ row.afterText }}</button>
            </details>
          </div>
        </section>

        <section class="editor panel" aria-label="選択対象の後修正">
          <div class="section-heading"><h2>この一件を直す</h2><span class="pill trial">演出は技術試用中</span></div>
          <p v-if="!selected" class="empty">動画の再生位置、原文の検索、一覧から字幕または接続を選んでください。</p>
          <p v-if="targetLoading" role="status">対象と使用できる表現を確認しています。</p>
          <p v-if="targetError" class="error" role="alert">{{ targetError }}</p>
          <div v-if="conflict" class="conflict"><p>別の保存が先に行われたため、上書きしていません。画面の未保存入力は残っています。</p>
            <button type="button" class="secondary" @click="discardAndReload">未保存入力を破棄して最新からやり直す</button></div>
          <template v-if="target && selectedRow">
            <div class="selected-context">
              <p class="eyebrow">{{ target.kind === 'caption' ? '字幕' : '接続' }} · {{ 'startFrame' in selectedRow ? frameTime(selectedRow.startFrame) + '–' + frameTime(selectedRow.endFrameExclusive) : frameTime(selectedRow.boundaryFrame) }}</p>
              <template v-if="target.kind === 'caption'"><p v-if="targetContext?.before" class="context-line">前：{{ targetContext.before }}</p><p class="selected-text">{{ target.text }}</p><p v-if="targetContext?.after" class="context-line">後：{{ targetContext.after }}</p></template>
              <template v-else><p class="context-line">前の場面</p><p class="selected-text">{{ target.beforeText }}</p><p class="context-line">次の場面</p><p class="selected-text">{{ target.afterText }}</p></template>
              <div class="pills"><span class="pill">{{ selectedRow.presetLabel }}</span><span class="pill">{{ selectedRow.hasOverride ? '一件変更あり' : '保存済み自動案' }}</span><span class="pill">{{ selectedRow.statusLabel }}</span></div>
            </div>

            <fieldset :disabled="targetLoading || saving || jobStarting"><legend class="sr-only">表現の変更</legend>
              <label class="field">表現
                <select v-model="draft.preset" aria-label="変更する表現"><option v-for="option in target.options" :key="option.value" :value="option.value" :disabled="!option.enabled">{{ option.label }}{{ option.enabled ? '' : '（適用できません）' }}</option></select>
              </label>
              <div v-if="target.kind === 'caption' && draft.preset === 'color'" class="color-settings">
                <div class="radio-row"><label><input v-model="draft.colorScope" type="radio" value="whole-caption" /> 全文に色を付ける</label><label><input v-model="draft.colorScope" type="radio" value="partial-caption" /> 選んだ連続範囲</label></div>
                <label class="field">原文から色を付ける範囲を選択
                  <textarea ref="colorText" :value="target.text" readonly rows="4" aria-label="色を付ける原文の範囲" @select="onColorSelection" @mouseup="onColorSelection" @keyup="onColorSelection" />
                </label>
                <p v-if="draft.colorScope === 'partial-caption' && draft.selectedText" class="range-preview">選択中：<mark>{{ draft.selectedText }}</mark></p>
                <p v-else-if="draft.colorScope === 'partial-caption'" class="muted">文章をドラッグするか、Shift キーと矢印キーで範囲を選んでください。同じ語も選んだ位置で区別します。</p>
              </div>
              <label v-if="target.kind === 'caption' && draft.preset === 'pulse'" class="field">動きに合わせる音のピーク
                <select v-model="draft.anchorPeakId" aria-label="適格な音のピーク"><option value="" disabled>使用できるピークを選んでください</option><option v-for="peak in target.peakOptions" :key="peak.id" :value="peak.id">{{ peak.label }} · {{ time(peak.displaySeconds) }}</option></select>
                <span v-if="!target.peakOptions.length" class="muted">この字幕には使用できるピークがありません。</span>
              </label>
              <details v-if="disabledOptions.length" class="unavailable"><summary>適用できない表現と理由</summary><ul><li v-for="option in disabledOptions" :key="option.value"><strong>{{ option.label }}</strong>：{{ editingReasonText(option.reason || 'この対象では適用条件を満たしません。') }}</li></ul></details>
              <div class="button-row"><button type="button" class="primary" :disabled="!dirty || conflict || !selectedOption?.enabled" @click="saveCurrent()">{{ saving ? '保存中…' : 'この変更を保存' }}</button><button type="button" class="secondary" :disabled="!dirty" @click="discardAndReload">未保存の変更を取り消す</button></div>
              <div class="button-row reset-row"><button type="button" class="secondary" :disabled="conflict" @click="saveCurrent('Normal')">通常表示へ固定</button><button type="button" class="secondary" :disabled="conflict" @click="saveCurrent('Reset')">自動案へ戻す</button></div>
              <p class="muted operation-help">通常表示へ固定すると、この一件の演出を外して保存します。自動案へ戻すと、この一件の変更だけを取り除きます。字幕本文は残ります。</p>
            </fieldset>

            <section class="preview-controls" aria-label="周辺の確認"><h3>保存した一件を周辺で確認</h3>
              <label class="field compact">前後の文脈（秒）<input v-model.number="contextSeconds" type="number" min="2" step="1" aria-label="確認する前後の文脈" /></label>
              <p class="muted">動きや戻りが見える範囲を含めます。前後も見たいときは秒数を増やせます。</p>
              <button type="button" class="primary" :disabled="dirty || jobRunning || jobStarting || saving || targetLoading || conflict" @click="startJob('preview')">{{ jobStarting ? '確認を開始中…' : '保存した状態で周辺を確認' }}</button>
              <p v-if="dirty" class="muted">確認する前に、画面の変更を保存してください。</p>
            </section>
          </template>
        </section>

        <section class="targets panel" aria-label="字幕と接続の一覧">
          <div class="section-heading"><h2>対象を探す</h2><div class="tabs" role="group" aria-label="対象の種類"><button type="button" :class="{ active: listKind === 'caption' }" :aria-pressed="listKind === 'caption'" @click="setListKind('caption')">字幕 {{ state.captions.length }}</button><button type="button" :class="{ active: listKind === 'connection' }" :aria-pressed="listKind === 'connection'" @click="setListKind('connection')">接続 {{ state.connections.length }}</button></div></div>
          <div class="filters"><label class="field search">{{ listKind === 'caption' ? '字幕の原文を検索' : '前後の字幕を検索' }}<input v-model="search" type="search" :placeholder="listKind === 'caption' ? '気になった言葉を入力' : '接続の前後の言葉を入力'" /></label>
            <label class="field">表現<select v-model="presetFilter"><option value="">すべての表現</option><option v-for="[value, label] in presetFilters" :key="value" :value="value">{{ label }}</option></select></label>
            <label class="field">状態<select v-model="statusFilter"><option value="">すべての状態</option><option v-for="[value, label] in statusFilters" :key="value" :value="value">{{ label }}</option></select></label>
            <label class="field">変更の有無<select v-model="changeFilter"><option value="all">すべて</option><option value="changed">変更あり</option><option value="unchanged">変更なし</option></select></label></div>
          <div v-if="listKind === 'caption'" class="target-list"><p v-if="!visibleCaptions.length" class="empty">この条件に一致する字幕はありません。</p>
            <button v-for="row in visibleCaptions" :key="row.id" type="button" class="target-row" :class="{ selected: selected?.kind === 'caption' && selected.id === row.id }" :aria-pressed="selected?.kind === 'caption' && selected.id === row.id" :disabled="saving || targetLoading" @click="chooseTarget('caption', row.id)">
              <span class="row-time">{{ frameTime(row.startFrame) }}–{{ frameTime(row.endFrameExclusive) }}</span><span class="row-text">{{ row.text }}</span><span class="row-meta">{{ row.presetLabel }} · {{ row.hasOverride ? '変更あり' : '自動案' }} · {{ row.statusLabel }}</span>
            </button>
          </div>
          <div v-else class="target-list"><p v-if="!visibleConnections.length" class="empty">この条件に一致する接続はありません。</p>
            <button v-for="row in visibleConnections" :key="row.id" type="button" class="target-row" :class="{ selected: selected?.kind === 'connection' && selected.id === row.id }" :aria-pressed="selected?.kind === 'connection' && selected.id === row.id" :disabled="saving || targetLoading" @click="chooseTarget('connection', row.id)">
              <span class="row-time">{{ frameTime(row.boundaryFrame) }}</span><span class="row-text"><span>{{ row.beforeText }}</span><span class="connection-arrow">↓</span><span>{{ row.afterText }}</span></span><span class="row-meta">{{ row.presetLabel }} · {{ row.hasOverride ? '変更あり' : '自動案' }} · {{ row.statusLabel }}</span>
            </button>
          </div>
        </section>
      </div>

      <section class="full-output panel" aria-label="変更をまとめて全編へ反映"><div><h2>保存した変更を、まとめて全編へ</h2><p>複数の字幕・接続の変更を、いまの保存状態から一度に反映します。処理中に次の変更を保存しても、実行中の出力は開始時の状態を使います。</p><p v-if="dirty" class="muted">画面の未保存変更は含まれません。先に保存してください。</p></div>
        <button type="button" class="primary" :disabled="dirty || jobRunning || jobStarting || saving || conflict" @click="startJob('full')">{{ jobStarting ? '出力を開始中…' : '保存した変更を全編へ反映' }}</button></section>
    </template>

    <div v-if="pendingTarget" class="dialog-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="unsaved-title" class="unsaved-dialog"><h2 id="unsaved-title">この一件に未保存の変更があります</h2><p>対象を移動する前に、画面の変更をどうするか選んでください。</p><div class="button-row"><button type="button" class="primary" :disabled="saving || conflict" @click="continueTargetSelection(true)">保存して対象を移動</button><button type="button" class="secondary" :disabled="saving" @click="continueTargetSelection(false)">未保存の変更を破棄して移動</button><button type="button" class="secondary" :disabled="saving" @click="pendingTarget = null">ここで編集を続ける</button></div><p v-if="targetError" class="error" role="alert">{{ targetError }}</p></section></div>
  </main>
</template>

<style scoped>
.editing-page{--ink:#202b3a;--muted:#647487;--line:#dce4eb;--accent:#185e68;max-width:1520px;margin:0 auto;padding:30px 28px 48px;color:var(--ink);font-family:system-ui,-apple-system,'Noto Sans JP',sans-serif;background:#f5f7f9;min-height:100vh}
.page-header,.section-heading,.full-output,.job-panel{display:flex;justify-content:space-between;align-items:center;gap:20px}.page-header{margin-bottom:24px}.eyebrow{font-size:.73rem;font-weight:700;letter-spacing:.1em;color:var(--accent);margin:0 0 8px}h1{font-size:clamp(1.4rem,2.3vw,2rem);line-height:1.4;margin:0}h2{font-size:1.1rem;margin:0}h3{font-size:.94rem;margin:0 0 12px}p{line-height:1.7;margin:8px 0}.intro,.muted,.context-line{font-size:.86rem;color:var(--muted)}button,input,select,textarea{font:inherit}button{cursor:pointer;border:1px solid transparent;border-radius:8px;padding:10px 14px;font-weight:650;font-size:.85rem;line-height:1.4}button:disabled{cursor:not-allowed;opacity:.5}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #d89537;outline-offset:3px}.primary{background:var(--accent);color:white}.primary:hover:not(:disabled){background:#124952}.secondary{background:#fff;border-color:var(--line);color:var(--ink)}.secondary:hover:not(:disabled){background:#eef4f5}.notice,.error,.loading{padding:12px 16px;border-radius:8px;margin:12px 0;white-space:pre-wrap;overflow-wrap:anywhere}.notice{background:#e5f3ee;color:#245c4c}.error{background:#ffeded;color:#943834}.loading{background:#eef3f6}.state-strip{display:grid;grid-template-columns:1fr .9fr 1.6fr;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;margin-bottom:20px}.state-strip>div{padding:15px 18px;display:flex;flex-direction:column;gap:5px;border-right:1px solid var(--line)}.state-strip>div:last-child{border-right:0}.state-strip span{font-size:.72rem;color:var(--muted)}.state-strip strong{font-size:.85rem;line-height:1.6}.state-strip .pending{background:#fff7e7}.job-panel{padding:16px 20px;border:1px solid #bad6db;border-radius:10px;margin-bottom:20px;background:#edf7f8;font-size:.86rem}.job-panel.failed{background:#fff3ed;border-color:#e5c5b7}.job-panel p{margin:5px 0}.workspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(340px,1fr);gap:20px;align-items:start}.panel{background:#fff;border:1px solid var(--line);border-radius:12px;padding:22px}.playback{grid-column:1}.editor{grid-column:2;grid-row:1 / span 2}.targets{grid-column:1}.section-heading{align-items:flex-start;margin-bottom:18px}.pill{display:inline-flex;align-items:center;border:1px solid var(--line);padding:4px 8px;border-radius:5px;font-size:.69rem;line-height:1.4;background:#f5f8fa}.trial{color:#876029;background:#fff7e9;border-color:#efdeba;white-space:nowrap}.pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.field{display:flex;flex-direction:column;gap:7px;font-size:.79rem;font-weight:650;margin-bottom:15px}.field input,.field select,.field textarea{width:100%;border:1px solid #bdcbd5;border-radius:7px;padding:10px 11px;line-height:1.5;font-size:.86rem;color:var(--ink);background:white}.field textarea{resize:vertical;white-space:pre-wrap;font-size:1rem}.field>span{font-weight:400}.field.compact{max-width:190px}.playback video{display:block;width:100%;aspect-ratio:16/9;background:#101820;border-radius:8px}.playback-description{font-size:.79rem;color:var(--muted);margin-top:12px}.playhead-targets{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}.empty{padding:10px 0;color:var(--muted);font-size:.88rem}.target-pill{display:flex;gap:10px;align-items:flex-start;text-align:left;background:#f1f6f6;color:var(--ink);width:100%;margin:7px 0;font-weight:500;white-space:pre-wrap;overflow-wrap:anywhere}.target-pill span{color:var(--accent);font-size:.7rem;white-space:nowrap;margin-top:2px}.nearby{margin-top:12px}.nearby summary,.unavailable summary{cursor:pointer;font-size:.82rem;color:var(--muted);padding:6px 0}.selected-context{border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:18px}.selected-text{font-size:1.06rem;white-space:pre-wrap;overflow-wrap:anywhere;font-weight:650;line-height:1.65}.context-line{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0}.button-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.reset-row{margin-top:10px}.operation-help{font-size:.76rem;margin-top:12px}.preview-controls{border-top:1px solid var(--line);margin-top:22px;padding-top:20px}.preview-controls .primary{width:100%}fieldset{border:0;padding:0;margin:0;min-width:0}.radio-row{display:flex;gap:12px;flex-wrap:wrap;font-size:.82rem;margin:10px 0 14px}.radio-row label,.checkbox{display:flex;align-items:center;gap:6px}.range-preview{font-size:.87rem;white-space:pre-wrap;overflow-wrap:anywhere}mark{background:#ffe9a6;color:inherit;padding:2px 3px}.unavailable{margin-top:8px}.unavailable ul{padding-left:18px;color:var(--muted);font-size:.79rem;line-height:1.7}.conflict{padding:12px;background:#fff5e3;border-radius:8px;margin-bottom:16px;font-size:.85rem}.tabs{display:flex;gap:4px;border-radius:8px;background:#eef3f6;padding:3px}.tabs button{padding:6px 10px;color:var(--muted);background:transparent}.tabs button.active{color:var(--accent);background:white;box-shadow:0 1px 3px #102f4210}.filters{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}.filters .search{grid-column:1 / -1}.checkbox{font-size:.8rem;grid-column:1 / -1;margin-bottom:14px}.target-list{max-height:580px;overflow:auto;border-top:1px solid var(--line)}.target-row{width:100%;display:grid;grid-template-columns:1fr;gap:5px;text-align:left;border:1px solid transparent;border-bottom-color:var(--line);border-radius:0;background:white;padding:14px 12px;color:var(--ink)}.target-row.selected{background:#edf6f6;border:1px solid #7caeb3;border-radius:7px}.target-row:hover:not(:disabled){background:#f1f6f8}.row-time{font-size:.69rem;color:var(--muted);font-variant-numeric:tabular-nums}.row-text{font-size:.89rem;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}.row-text>span{display:block}.row-meta{font-size:.69rem;font-weight:400;color:var(--muted);line-height:1.5}.connection-arrow{color:var(--muted);font-size:.75rem;padding:2px 0}.full-output{margin-top:22px}.full-output>div{max-width:850px}.full-output p{font-size:.84rem;color:var(--muted);margin-bottom:0}.full-output>button{flex-shrink:0}.dialog-backdrop{position:fixed;inset:0;background:#14233180;display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}.unsaved-dialog{background:#fff;border-radius:14px;padding:28px;max-width:650px;box-shadow:0 20px 70px #0004}.unsaved-dialog>p{font-size:.88rem;color:var(--muted)}.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:980px){.editing-page{padding:20px 16px 36px}.workspace{grid-template-columns:1fr}.playback,.editor,.targets{grid-column:1;grid-row:auto}.editor{order:2}.targets{order:3}.state-strip{grid-template-columns:1fr}.state-strip>div{border-right:0;border-bottom:1px solid var(--line)}.state-strip>div:last-child{border-bottom:0}.full-output{align-items:stretch;flex-direction:column}.page-header{align-items:flex-start}.page-header>button{flex-shrink:0}.panel{padding:18px}}
@media(max-width:580px){.page-header,.section-heading,.job-panel{flex-direction:column;align-items:stretch;gap:12px}.page-header>button{align-self:flex-start}.section-heading .trial{align-self:flex-start}.filters{grid-template-columns:1fr}.filters .search,.checkbox{grid-column:1}.button-row button{flex:1 1 auto}.tabs{align-self:flex-start}.state-strip>div{padding:12px 15px}.unsaved-dialog{padding:20px}}
</style>
