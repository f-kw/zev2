import { defineStore } from 'pinia';
import { currentOutput, draftIdentity, draftStartBlockers, executionBlockers, resumeBlockers, reviewBlockers } from '../guided-workflow';
import {
  createInitialState,
  findById,
  findReadyAgentRequest,
  runtimeConfirmationIdentity,
  executionScopeForDraft,
  isAgentRequestReady,
  type FinalReviewActionType,
  type HumanReviewActionType,
  type RequestDraftInput,
  type RuntimeConfig,
  type WorkflowStep,
  type Zev2State
} from '@zev2/shared';
import type { UiReviewMaterials, UiDigestCompositionDataView, UiDigestRetentionPreparationSummary } from '@zev2/shared';
import {
  applyWebGeminiReview as applyWebGeminiReviewRequest,
  approveDraft,
  cancelDraftAgentWork,
  createDraft,
  fetchRuntimeConfig,
  fetchState,
  fetchWorkflow,
  fetchUiReviewMaterials,
  formatApiError,
  requestGeneratedVideoChanges,
  resumeAgentWork,
  retryAgentRequest,
  submitFinalReview as submitFinalReviewRequest,
  submitHumanReviewAction,
  saveDigestSceneAddition,
  saveDigestCompositionData,
  fetchDigestCompositionData,
  prepareDigestRetentionInputs,
  fetchDigestRetentionInputs
} from '../api';

interface ControlQueueStoreState {
  workflowSteps: WorkflowStep[];
  runtimeConfig: RuntimeConfig | null;
  state: Zev2State;
  loading: boolean;
  message: string;
  errorMessage: string;
  lastChangedAt: string;
  activeDraftId: string;
  activePurpose: string;
  runPhase: 'idle' | 'saving' | 'handing_off' | 'running' | 'review_required' | 'completed' | 'error';
  runNumber: number;
  stateReadNumber: number;
  uiMaterialReadNumber: number;
  reviewMaterials: UiReviewMaterials | null;
  digestRetentionOperation: 'idle' | 'preparing' | 'reading';
  digestRetentionRequest: { requestDraftId: string; draftIdentity: string; fingerprint: string; requestHash: string;
    summary: UiDigestRetentionPreparationSummary | null } | null;
  digestRetentionIssue: { requestDraftId: string; draftIdentity: string; fingerprint: string; message: string } | null;
}

function retentionContext(s: ControlQueueStoreState) {
  const draft = findById(s.state.requestDrafts, s.activeDraftId), materials = s.reviewMaterials;
  if (!draft || draft.productionType !== 'digest' || draft.status !== 'approved' || !materials
    || materials.requestDraftId !== draft.id || materials.draftIdentity !== draftIdentity(draft)
    || materials.digestPreparation?.status !== 'verified' || materials.digestComposition?.status !== 'revision_requested'
    || !materials.digestComposition.addedCandidateIds.length || !materials.digestComposition.editRequestIds.length) return;
  return { draft, materials, composition: materials.digestComposition };
}
function retainedRequest(s: ControlQueueStoreState) {
  const c = retentionContext(s), saved = s.digestRetentionRequest;
  return c && saved?.requestDraftId === c.draft.id && saved.draftIdentity === c.materials.draftIdentity
    && saved.fingerprint === c.materials.fingerprint ? saved : undefined;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function checkedComposition(c: NonNullable<ReturnType<typeof retentionContext>>, result: UiDigestCompositionDataView) {
  const hash = result?.requestHash, value = result?.composition;
  if (result?.status !== 'composition-data-only' || result.requestDraftId !== c.draft.id || !/^[0-9a-f]{64}$/u.test(hash)
    || result.snapshotBinding?.fileSha256 !== hash || !/^[0-9a-f]{64}$/u.test(result.compositionBinding?.fileSha256)
    || result.snapshotBinding.path !== `artifacts/${c.draft.id}/ui-composition-${hash}--snapshot.json`
    || result.compositionBinding.path !== `artifacts/${c.draft.id}/ui-composition-${hash}--composition.json`
    || !equal(result.representedEditRequestIds, c.composition.editRequestIds)
    || value?.status !== 'composition-data-only' || value.schemaVersion !== 'ui-digest-human-composition-data-v001'
    || value.requestDraftId !== c.draft.id || value.draftIdentity !== c.materials.draftIdentity || value.requestHash !== hash
    || !equal(value.snapshotBinding, result.snapshotBinding) || !equal(value.representedEditRequestIds, c.composition.editRequestIds)
    || !equal(value.beforeCandidateIds, c.composition.currentCandidateIds) || !equal(value.requestedCandidateIds, c.composition.requestedCandidateIds)
    || !equal(value.originalAiSelectionBinding, c.composition.basis.selectionAdoptionBinding)
    || !equal(value.scenes?.map(scene => scene.candidateId), c.composition.requestedCandidateIds))
    throw new Error('保存構成が現在の依頼・追加した場面と一致しません。資料を再読み込みしてください。');
  return hash;
}
function checkedRetention(c: NonNullable<ReturnType<typeof retentionContext>>, hash: string, result: UiDigestRetentionPreparationSummary) {
  const expected = c.composition.addedCandidateIds.map(id => ({ candidateId: id,
    title: c.materials.candidates.find(v => v.id === id)?.title, answerStatus: 'unanswered' }));
  if (result?.status !== 'awaiting-retention-answers' || result.requestDraftId !== c.draft.id || result.requestHash !== hash
    || !/^[0-9a-f]{64}$/u.test(result.preparationHash) || !equal(result.pendingCandidates, expected)
    || !equal(result.admission, { retentionIntegration: 'not-prepared', captionPreparation: 'not-prepared', executionPermission: 'not-approved', humanQuality: 'pending' }))
    throw new Error('確認要求が現在の追加場面・保存版と一致しません。資料を再読み込みしてください。');
  return result;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function hasRunnableAgentRequests(state: Zev2State): boolean {
  return Boolean(
    findReadyAgentRequest(state) ||
      state.agentRequests.some((request) => request.status === 'running')
  );
}

function hasRunnableAgentRequestsForDraft(state: Zev2State, requestDraftId: string): boolean {
  return state.agentRequests.some(
    (request) =>
      request.requestDraftId === requestDraftId &&
      (isAgentRequestReady(state, request) || request.status === 'running')
  );
}

function hasHumanReviewRequiredForDraft(state: Zev2State, requestDraftId: string): boolean {
  return state.controlReviewItems.some(
    (item) => item.requestDraftId === requestDraftId && item.status === 'review_required'
  );
}

function failedAgentRequestForDraft(state: Zev2State, requestDraftId: string) {
  return state.agentRequests.find(
    (request) => request.requestDraftId === requestDraftId && request.status === 'failed'
  );
}

function cancelledAgentRequestForDraft(state: Zev2State, requestDraftId: string) {
  return [...state.agentRequests].reverse().find(
    (request) => request.requestDraftId === requestDraftId && request.status === 'cancelled'
  );
}

async function keepPhaseVisible(startedAt: number, minimumMilliseconds: number): Promise<void> {
  const remainingMilliseconds = minimumMilliseconds - (Date.now() - startedAt);

  if (remainingMilliseconds > 0) {
    await wait(remainingMilliseconds);
  }
}

export const useControlQueueStore = defineStore('controlQueue', {
  state: (): ControlQueueStoreState => ({
    workflowSteps: [],
    runtimeConfig: null,
    state: createInitialState(),
    loading: false,
    message: '',
    errorMessage: '',
    lastChangedAt: '',
    activeDraftId: '',
    activePurpose: '',
    runPhase: 'idle',
    stateReadNumber: 0,
    uiMaterialReadNumber: 0,
    reviewMaterials: null,
    digestRetentionOperation: 'idle',
    digestRetentionRequest: null,
    digestRetentionIssue: null,
    runNumber: 0
  }),
  getters: {
    canPrepareDigestRetention: state => Boolean(retentionContext(state)),
    canReadDigestRetention: state => Boolean(retainedRequest(state)),
    displayedDigestRetention: state => retainedRequest(state)?.summary ?? null,
    displayedDigestRetentionIssue: state => {
      const c = retentionContext(state), issue = state.digestRetentionIssue;
      return c && issue?.requestDraftId === c.draft.id && issue.draftIdentity === c.materials.draftIdentity
        && issue.fingerprint === c.materials.fingerprint ? issue.message : '';
    }
  },
  actions: {
    async prepareDigestConfirmation(fingerprint: string) {
      if (this.loading) return false;
      const c = retentionContext(this);
      if (!c || c.materials.fingerprint !== fingerprint) { this.errorMessage = '現在の追加場面と資料を再読み込みしてください。';return false; }
      const number = ++this.uiMaterialReadNumber, stillCurrent = () => {
        const now = retentionContext(this);
        return number === this.uiMaterialReadNumber && now?.draft.id === c.draft.id && now.materials.draftIdentity === c.materials.draftIdentity
          && now.materials.fingerprint === fingerprint;
      };
      this.loading = true;this.digestRetentionOperation = 'preparing';this.digestRetentionRequest = null;this.errorMessage = '';
      this.digestRetentionIssue = null;
      this.message = '追加した場面の確認要求を準備しています。AI処理・課金・動画作成は始まりません。';
      try {
        const result = await saveDigestCompositionData(c.draft.id, { draftIdentity: c.materials.draftIdentity, fingerprint });
        if (!stillCurrent()) return false;
        const hash = checkedComposition(c, result);
        this.digestRetentionRequest = { requestDraftId: c.draft.id, draftIdentity: c.materials.draftIdentity, fingerprint, requestHash: hash, summary: null };
        const summary = await prepareDigestRetentionInputs(c.draft.id, { draftIdentity: c.materials.draftIdentity, fingerprint, requestHash: hash });
        if (!stillCurrent()) return false;
        this.digestRetentionRequest.summary = checkedRetention(c, hash, summary);
        this.message = '確認要求を保存しました。追加した場面の確認は未回答です。AI処理・課金・動画作成は始まりません。';return true;
      } catch (e) { if (stillCurrent()) {
        this.message = '';
        this.digestRetentionIssue = { requestDraftId: c.draft.id, draftIdentity: c.materials.draftIdentity, fingerprint, message: formatApiError(e) };
      }return false; }
      finally { this.loading = false;this.digestRetentionOperation = 'idle'; }
    },
    async rereadDigestConfirmation() {
      if (this.loading) return false;
      const c = retentionContext(this), saved = retainedRequest(this);
      if (!c || !saved) { this.errorMessage = '現在の画面で確認要求を準備し、保存版を確認してください。';return false; }
      const number = ++this.uiMaterialReadNumber, stillCurrent = () => {
        const now = retentionContext(this);
        return number === this.uiMaterialReadNumber && now?.draft.id === c.draft.id && now.materials.draftIdentity === saved.draftIdentity
          && now.materials.fingerprint === saved.fingerprint;
      };
      this.loading = true;this.digestRetentionOperation = 'reading';saved.summary = null;this.errorMessage = '';
      this.digestRetentionIssue = null;
      this.message = '保存した確認要求を読み直しています。AI処理・課金・動画作成は始まりません。';
      try {
        const composition = await fetchDigestCompositionData(c.draft.id, saved.requestHash);
        if (!stillCurrent()) return false;
        if (checkedComposition(c, composition) !== saved.requestHash) throw new Error('保存した構成の版が変更されています。');
        const summary = await fetchDigestRetentionInputs(c.draft.id, saved.requestHash);
        if (!stillCurrent()) return false;
        saved.summary = checkedRetention(c, saved.requestHash, summary);
        this.message = '保存版との一致を確認しました。追加した場面の確認は未回答です。';return true;
      } catch (e) { if (stillCurrent()) {
        this.message = '';
        this.digestRetentionIssue = { requestDraftId: c.draft.id, draftIdentity: saved.draftIdentity, fingerprint: saved.fingerprint, message: formatApiError(e) };
      }return false; }
      finally { this.loading = false;this.digestRetentionOperation = 'idle'; }
    },
    async requestDigestSceneAddition(candidateId: string, fingerprint: string) {
      if (this.loading) return false;
      const draft = findById(this.state.requestDrafts, this.activeDraftId), materials = this.reviewMaterials;
      if (!draft || draft.productionType !== 'digest' || draft.status !== 'approved' || !materials
        || materials.requestDraftId !== draft.id || materials.draftIdentity !== draftIdentity(draft)
        || materials.fingerprint !== fingerprint || materials.digestPreparation?.status !== 'verified'
        || !materials.digestComposition || materials.digestComposition.status === 'source_changed'
        || !materials.candidates.some(c => c.id === candidateId)) {
        this.errorMessage = '現在の構成と保存候補を再読み込みしてください';return false;
      }
      if (materials.digestComposition.requestedCandidateIds.includes(candidateId)) return false;
      const readNumber = ++this.uiMaterialReadNumber;
      this.loading = true;this.errorMessage = '';this.message = '場面追加の編集要求を保存しています';
      try {
        const result = await saveDigestSceneAddition(draft.id, { draftIdentity: materials.draftIdentity, fingerprint, candidateId });
        if (this.activeDraftId !== draft.id || draftIdentity(findById(this.state.requestDrafts, draft.id)!) !== materials.draftIdentity
          || readNumber !== this.uiMaterialReadNumber) return false;
        if (result.materials.requestDraftId !== draft.id || result.materials.draftIdentity !== materials.draftIdentity) throw new Error('保存応答の依頼が一致しません');
        this.reviewMaterials = result.materials;
        this.runPhase = 'review_required';this.message = '場面追加の編集要求を保存しました。変更後の正式準備は未接続です。';
        this.lastChangedAt = new Date().toISOString();return true;
      } catch (e) {
        if (this.activeDraftId === draft.id) { this.errorMessage = formatApiError(e);this.message = ''; }
        return false;
      } finally { this.loading = false; }
    },
    async refreshUiReviewMaterials(id: string) {
      const number = ++this.uiMaterialReadNumber;
      this.reviewMaterials = null;
      const draft = findById(this.state.requestDrafts,id);
      if (!draft) return;
      const identity = draftIdentity(draft);
      try {
        const material = await fetchUiReviewMaterials(id);
        const current = findById(this.state.requestDrafts,this.activeDraftId);
        if (number === this.uiMaterialReadNumber && current?.id === id && draftIdentity(current) === identity
          && material.draftIdentity === identity) this.reviewMaterials = material;
      } catch (e) { if (number === this.uiMaterialReadNumber) this.errorMessage = formatApiError(e); }
    },
    async refresh() {
      const readNumber = ++this.stateReadNumber;
      try {
        const [{ steps }, runtimeConfig, state] = await Promise.all([
          fetchWorkflow(),
          fetchRuntimeConfig(),
          fetchState()
        ]);
        if (this.loading || readNumber !== this.stateReadNumber) {
          return;
        }

        this.workflowSteps = steps;
        this.runtimeConfig = runtimeConfig;
        this.state = state;
        if (!this.activeDraftId && state.requestDrafts[0]) {
          this.activeDraftId = state.requestDrafts[0].id;
          this.activePurpose = state.requestDrafts[0].purpose;
        }
        this.errorMessage = '';
        this.syncRunPhaseFromState();
      } catch (error) {
        if (!this.loading && readNumber === this.stateReadNumber) {
          this.errorMessage = formatApiError(error);
        }
      }
    },
    syncRunPhaseFromState() {
      const activeDraftId = this.activeDraftId;
      if (!activeDraftId) {
        if (hasRunnableAgentRequests(this.state)) {
          this.runPhase = 'running';
          this.message = '作成中です';
        }
        return;
      }

      const failedRequest = failedAgentRequestForDraft(this.state, activeDraftId);
      if (failedRequest) {
        this.runPhase = 'error';
        this.message = `${failedRequest.label}で止まっています`;
        return;
      }

      if (hasHumanReviewRequiredForDraft(this.state, activeDraftId)) {
        this.runPhase = 'review_required';
        this.message = '確認が必要です';
        return;
      }

      if (hasRunnableAgentRequestsForDraft(this.state, activeDraftId)) {
        this.runPhase = 'running';
        this.message = '作成中です';
        return;
      }

      const draft = findById(this.state.requestDrafts, activeDraftId);
      if (draft?.status === 'draft') { this.runPhase = 'idle'; return; }

      const cancelledRequest = cancelledAgentRequestForDraft(this.state, activeDraftId);
      if (cancelledRequest) {
        this.runPhase = 'idle';
        this.message = 'この依頼の作業を中止しました';
        return;
      }

      if (currentOutput(this.state, activeDraftId)) {
        this.runPhase = 'completed';
        this.message = '';
      }
    },
    async createRequestDraft(input: RequestDraftInput) {
      if (this.loading) return;
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      this.activeDraftId = '';
      this.activePurpose = input.purpose;
      this.runPhase = 'saving';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      this.message = '依頼を保存しています';
      try {
        const { draft, state } = await createDraft(input);
        this.state = state;
        this.activeDraftId = draft.id;
        this.lastChangedAt = new Date().toISOString();
        this.runPhase = 'idle';
        this.message = '下書きを保存しました。内容と実行条件を確認してから開始してください';
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    },
    async approveRequestDraft(id: string, expectedIdentity: string) {
      if (this.loading) return;
      const draft = findById(this.state.requestDrafts, id);
      if (!draft || draftIdentity(draft) !== expectedIdentity) {
        this.errorMessage = '下書きが変更されました。もう一度確認してください';
        return;
      }
      const blockers = draftStartBlockers(draft, this.runtimeConfig);
      if (blockers.length) { this.errorMessage = blockers.join(' '); return; }
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      this.activeDraftId = id;
      this.activePurpose = findById(this.state.requestDrafts, id)?.purpose ?? '';
      this.runPhase = 'handing_off';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      this.message = '作成を始めています';
      try {
        this.state = await approveDraft(id, {draftIdentity:expectedIdentity,runtimeIdentity:runtimeConfirmationIdentity(this.runtimeConfig!)});
        this.lastChangedAt = new Date().toISOString();
        this.runPhase = 'running';
        await this.refreshUntilAgentSettled(Date.now());
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    },
    async refreshUntilAgentSettled(startedAt = Date.now()) {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const activeDraftId = this.activeDraftId;
        const failedRequest = activeDraftId
          ? failedAgentRequestForDraft(this.state, activeDraftId)
          : this.state.agentRequests.find((request) => request.status === 'failed');

        if (failedRequest) {
          await keepPhaseVisible(startedAt, 700);
          this.message = `${failedRequest.label}で止まっています`;
          this.runPhase = 'error';
          this.lastChangedAt = new Date().toISOString();
          return;
        }

        if (!activeDraftId && hasRunnableAgentRequests(this.state)) {
          this.message = '作成中です';
          this.runPhase = 'running';
          await wait(300);
          this.state = await fetchState();
          this.lastChangedAt = new Date().toISOString();
          continue;
        }

        if (activeDraftId && hasHumanReviewRequiredForDraft(this.state, activeDraftId)) {
          await keepPhaseVisible(startedAt, 700);
          this.message = '確認が必要です';
          this.runPhase = 'review_required';
          this.lastChangedAt = new Date().toISOString();
          return;
        }

        const hasRunnableRequest = activeDraftId
          ? hasRunnableAgentRequestsForDraft(this.state, activeDraftId)
          : hasRunnableAgentRequests(this.state);

        if (!hasRunnableRequest) {
          await keepPhaseVisible(startedAt, 700);
          this.message = '';
          this.runPhase = activeDraftId && currentOutput(this.state, activeDraftId) ? 'completed' : 'idle';
          this.lastChangedAt = new Date().toISOString();
          return;
        }

        this.message = '作成中です';
        this.runPhase = 'running';
        await wait(300);
        this.state = await fetchState();
        this.lastChangedAt = new Date().toISOString();
      }

      this.message = '作成中です';
      this.runPhase = 'running';
    },
    async submitControlReview(
      id: string,
      action: HumanReviewActionType,
      reason: string,
      selectedOptionId?: string,
      scope?: 'edit_plan' | 'theme_reselect' | 'theme_options_regenerate' | 'material_reselect' | 'adjustment'
    ) {
      if (this.loading) return;
      const reviewItem = findById(this.state.controlReviewItems, id);
      const reviewedDraft = reviewItem && findById(this.state.requestDrafts, reviewItem.requestDraftId);
      if (!reviewItem || !reviewedDraft || reviewedDraft.id !== this.activeDraftId || reviewItem.status !== 'review_required') return;
      const materials = this.reviewMaterials;
      if (!materials || materials.review?.id !== reviewItem.id || materials.requestDraftId !== reviewedDraft.id
        || materials.draftIdentity !== draftIdentity(reviewedDraft)) { this.errorMessage = '表示した確認資料を再取得してください'; return; }
      if (action === 'approve') {
        const blockers = Array.from(new Set([...reviewBlockers(this.state, reviewedDraft, reviewItem, materials), ...materials.blockers, ...executionBlockers(this.runtimeConfig)]));
        if (reviewItem.kind === 'theme_selection' && !reviewItem.options.some(o => o.id === selectedOptionId)) blockers.push('採用する候補を確認してください');
        if (blockers.length) { this.errorMessage = blockers.join(' '); return; }
      }
      if (action === 'request_changes' && executionBlockers(this.runtimeConfig).length) {
        this.errorMessage = executionBlockers(this.runtimeConfig).join(' '); return;
      }
      const previousDraftIds = new Set(this.state.requestDrafts.map(d => d.id));
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      if (reviewItem) {
        this.activeDraftId = reviewItem.requestDraftId;
        this.activePurpose = findById(this.state.requestDrafts, reviewItem.requestDraftId)?.purpose ?? '';
      }
      this.message = action === 'reject'
        ? '確認結果を保存しています'
        : action === 'request_changes'
          ? '修正依頼を保存して作り直しています'
          : '確認結果を保存して続きを実行しています';
      try {
        this.state = await submitHumanReviewAction(id, action, reason, selectedOptionId, scope,
          {requestDraftId:reviewedDraft.id,reviewId:id,fingerprint:materials.fingerprint});
        if (action === 'request_changes') {
          const newDraft = this.state.requestDrafts.find(d => !previousDraftIds.has(d.id) && d.source.uri === reviewedDraft.source.uri);
          if (newDraft) { this.activeDraftId = newDraft.id; this.activePurpose = newDraft.purpose; }
        }
        this.lastChangedAt = new Date().toISOString();

        if (action === 'approve' || action === 'request_changes') {
          this.runPhase = 'running';
          await this.refreshUntilAgentSettled(Date.now());
          return;
        }

        this.runPhase = 'review_required';
        this.message = '却下として保存しました';
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    },
    async requestGeneratedVideoChanges(
      id: string,
      reason: string,
      scope: 'edit_plan' | 'theme_selection' | 'adjustment'
    ) {
      if (this.loading) return;
      if (id !== this.activeDraftId || !currentOutput(this.state, id) || !reason.trim()) return;
      if (executionBlockers(this.runtimeConfig).length) { this.errorMessage = executionBlockers(this.runtimeConfig).join(' '); return; }
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      const draft = findById(this.state.requestDrafts, id);
      this.activeDraftId = id;
      this.activePurpose = draft?.purpose ?? '';
      this.runPhase = 'running';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      this.message = scope === 'theme_selection'
        ? 'テーマを選び直せる状態に戻しています'
        : scope === 'adjustment'
          ? '微調整から作り直しています'
          : '演出を作り直しています';
      try {
        const result = await requestGeneratedVideoChanges(id, reason, scope, runtimeConfirmationIdentity(this.runtimeConfig!),
          {fileRefId:currentOutput(this.state,id)!.id,sha256:currentOutput(this.state,id)!.sha256});
        this.activeDraftId = result.draft.id;
        this.activePurpose = result.draft.purpose;
        this.state = result.state;
        this.lastChangedAt = new Date().toISOString();
        await this.refreshUntilAgentSettled(Date.now());
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    },
    async applyWebGeminiReview(id: string, revisionBriefText: string) {
      if (this.loading) return;
      if (executionBlockers(this.runtimeConfig).length) { this.errorMessage = executionBlockers(this.runtimeConfig).join(' '); return; }
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      const draft = findById(this.state.requestDrafts, id);
      this.activeDraftId = id;
      this.activePurpose = draft?.purpose ?? '';
      this.runPhase = 'running';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      this.message = '再生成方針を反映して演出を作り直しています';
      try {
        const result = await applyWebGeminiReviewRequest(id, revisionBriefText, runtimeConfirmationIdentity(this.runtimeConfig!));
        this.activeDraftId = result.draft.id;
        this.activePurpose = result.draft.purpose;
        this.state = result.state;
        this.lastChangedAt = new Date().toISOString();
        await this.refreshUntilAgentSettled(Date.now());
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    },
    async submitFinalReview(id: string, action: FinalReviewActionType) {
      if (this.loading || this.activeDraftId !== id || !currentOutput(this.state, id)) return;
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      const draft = findById(this.state.requestDrafts, id);
      this.activeDraftId = id;
      this.activePurpose = draft?.purpose ?? '';
      this.message = action === 'publish_ready'
        ? '投稿可能として記録しています'
        : '最終完了として記録しています';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      try {
        const output = currentOutput(this.state,id)!;
        const result = await submitFinalReviewRequest(id, action, {fileRefId:output.id,sha256:output.sha256});
        this.state = result.state;
        this.message = action === 'publish_ready'
          ? '投稿可能として記録しました'
          : '最終完了として記録しました';
        this.runPhase = 'completed';
        this.lastChangedAt = new Date().toISOString();
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    },
    async retryAgentRequest(id: string) {
      if (this.loading) return;
      const failed = findById(this.state.agentRequests, id);
      if (!failed || failed.requestDraftId !== this.activeDraftId || failed.status !== 'failed') return;
      if (executionBlockers(this.runtimeConfig).length) { this.errorMessage = executionBlockers(this.runtimeConfig).join(' '); return; }
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      const failedRequest = findById(this.state.agentRequests, id);
      if (failedRequest) {
        const draft = findById(this.state.requestDrafts, failedRequest.requestDraftId);
        this.activeDraftId = failedRequest.requestDraftId;
        this.activePurpose = draft?.purpose ?? '';
        this.message = `${failedRequest.label}を再実行しています`;
      } else {
        this.message = '失敗した工程を再実行しています';
      }
      this.runPhase = 'running';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      try {
        const result = await retryAgentRequest(id, runtimeConfirmationIdentity(this.runtimeConfig!));
        this.activeDraftId = result.draft.id;
        this.activePurpose = result.draft.purpose;
        this.state = result.state;
        this.lastChangedAt = new Date().toISOString();
        await this.refreshUntilAgentSettled(Date.now());
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    },
    async resumeAgentWork() {
      if (this.loading) return;
      const blockers = resumeBlockers(this.state, this.activeDraftId);
      if (blockers.length) { this.errorMessage = blockers.join(' '); return; }
      if (executionBlockers(this.runtimeConfig).length) { this.errorMessage = executionBlockers(this.runtimeConfig).join(' '); return; }
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      this.message = '待機中のAI作業を再開しています';
      this.runPhase = 'running';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      try {
        this.state = await resumeAgentWork(executionScopeForDraft(findById(this.state.requestDrafts,this.activeDraftId)!,runtimeConfirmationIdentity(this.runtimeConfig!)));
        this.lastChangedAt = new Date().toISOString();
        await this.refreshUntilAgentSettled(Date.now());
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    },
    async cancelDraftAgentWork(id: string) {
      if (this.loading || id !== this.activeDraftId || !findById(this.state.requestDrafts, id)) return;
      this.stateReadNumber += 1;
      this.loading = true;
      this.errorMessage = '';
      const draft = findById(this.state.requestDrafts, id);
      this.activeDraftId = id;
      this.activePurpose = draft?.purpose ?? '';
      this.message = 'AI作業を中止しています';
      this.runPhase = 'running';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      try {
        const result = await cancelDraftAgentWork(id);
        this.activeDraftId = result.draft.id;
        this.activePurpose = result.draft.purpose;
        this.state = result.state;
        this.message = 'AI作業を中止しました';
        this.runPhase = 'idle';
        this.lastChangedAt = new Date().toISOString();
      } catch (error) {
        this.errorMessage = formatApiError(error);
        this.message = '';
        this.runPhase = 'error';
        this.lastChangedAt = new Date().toISOString();
      } finally {
        this.loading = false;
      }
    }
  }
});
