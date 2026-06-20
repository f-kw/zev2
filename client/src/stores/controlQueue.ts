import { defineStore } from 'pinia';
import {
  createInitialState,
  findReadyAgentRequest,
  isAgentRequestReady,
  type HumanReviewActionType,
  type RequestDraftInput,
  type WorkflowStep,
  type Zev2State
} from '@zev2/shared';
import {
  approveDraft,
  createDraft,
  fetchState,
  fetchWorkflow,
  submitHumanReviewAction
} from '../api';

interface ControlQueueStoreState {
  workflowSteps: WorkflowStep[];
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
      this.loading = true;
      try {
        const [{ steps }, state] = await Promise.all([fetchWorkflow(), fetchState()]);
        this.workflowSteps = steps;
        this.state = state;
        this.errorMessage = '';
      } finally {
        this.loading = false;
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
      this.activePurpose = this.state.requestDrafts.find((draft) => draft.id === id)?.purpose ?? '';
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
          this.message = '確認できます';
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
    async submitControlReview(id: string, action: HumanReviewActionType, reason: string, selectedOptionId?: string) {
      this.loading = true;
      this.errorMessage = '';
      const reviewItem = this.state.controlReviewItems.find((item) => item.id === id);
      if (reviewItem) {
        this.activeDraftId = reviewItem.requestDraftId;
        this.activePurpose = this.state.requestDrafts.find((draft) => draft.id === reviewItem.requestDraftId)?.purpose ?? '';
      }
      this.message = action === 'reject'
        ? '確認結果を保存しています'
        : action === 'request_changes'
          ? '修正依頼を保存して作り直しています'
          : '確認結果を保存して続きを実行しています';
      try {
        this.state = await submitHumanReviewAction(id, action, reason, selectedOptionId);
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
    }
  }
});
