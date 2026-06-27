import { defineStore } from 'pinia';
import {
  createInitialState,
  findById,
  findReadyAgentRequest,
  isAgentRequestReady,
  type HumanReviewActionType,
  type RequestDraftInput,
  type RuntimeConfig,
  type WorkflowStep,
  type Zev2State
} from '@zev2/shared';
import {
  approveDraft,
  createDraft,
  fetchRuntimeConfig,
  fetchState,
  fetchWorkflow,
  requestGeneratedVideoChanges,
  retryAgentRequest,
  submitHumanReviewAction
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

function hasAgentRequestsForDraft(state: Zev2State, requestDraftId: string): boolean {
  return state.agentRequests.some((request) => request.requestDraftId === requestDraftId);
}

async function keepPhaseVisible(startedAt: number, minimumMilliseconds: number): Promise<void> {
  const remainingMilliseconds = minimumMilliseconds - (Date.now() - startedAt);

  if (remainingMilliseconds > 0) {
    await wait(remainingMilliseconds);
  }
}

function formatApiError(error: unknown): string {
  const response = (error as {
    response?: {
      data?: {
        error?: string;
        errors?: string[];
      };
    };
  }).response;

  if (response?.data?.errors?.length) {
    return response.data.errors.join(' / ');
  }

  if (response?.data?.error) {
    return response.data.error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '処理の呼び出しに失敗しました';
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
    runNumber: 0
  }),
  actions: {
    async refresh() {
      try {
        const [{ steps }, runtimeConfig, state] = await Promise.all([
          fetchWorkflow(),
          fetchRuntimeConfig(),
          fetchState()
        ]);
        if (this.loading) {
          return;
        }

        this.workflowSteps = steps;
        this.runtimeConfig = runtimeConfig;
        this.state = state;
        this.errorMessage = '';
        this.syncRunPhaseFromState();
      } catch (error) {
        if (!this.loading) {
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

      if (hasAgentRequestsForDraft(this.state, activeDraftId)) {
        this.runPhase = 'completed';
        this.message = '';
      }
    },
    async createRequestDraft(input: RequestDraftInput) {
      this.loading = true;
      this.errorMessage = '';
      this.activeDraftId = '';
      this.activePurpose = input.purpose;
      this.runPhase = 'saving';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      this.message = '依頼を保存しています';
      try {
        const { draft } = await createDraft(input);
        this.activeDraftId = draft.id;
        this.lastChangedAt = new Date().toISOString();
        this.runPhase = 'handing_off';
        this.message = '作成を始めています';
        this.state = await approveDraft(draft.id);
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
    async approveRequestDraft(id: string) {
      this.loading = true;
      this.errorMessage = '';
      this.activeDraftId = id;
      this.activePurpose = findById(this.state.requestDrafts, id)?.purpose ?? '';
      this.runPhase = 'handing_off';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      this.message = '作成を始めています';
      try {
        this.state = await approveDraft(id);
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
          this.runPhase = 'completed';
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
      this.loading = true;
      this.errorMessage = '';
      const reviewItem = findById(this.state.controlReviewItems, id);
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
        this.state = await submitHumanReviewAction(id, action, reason, selectedOptionId, scope);
        if (action === 'request_changes' && this.state.requestDrafts[0]) {
          this.activeDraftId = this.state.requestDrafts[0].id;
          this.activePurpose = this.state.requestDrafts[0].purpose;
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
      this.loading = true;
      this.errorMessage = '';
      const draft = findById(this.state.requestDrafts, id);
      this.activeDraftId = id;
      this.activePurpose = draft?.purpose ?? '';
      this.runPhase = 'running';
      this.runNumber += 1;
      this.lastChangedAt = new Date().toISOString();
      this.message = scope === 'theme_selection'
        ? '内容を選び直せる状態に戻しています'
        : scope === 'adjustment'
          ? '微調整から作り直しています'
          : '演出を作り直しています';
      try {
        const result = await requestGeneratedVideoChanges(id, reason, scope);
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
    async retryAgentRequest(id: string) {
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
        const result = await retryAgentRequest(id);
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
    }
  }
});
