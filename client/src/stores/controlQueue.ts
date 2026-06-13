import { defineStore } from 'pinia';
import {
  createInitialState,
  findReadyAgentRequest,
  hasHumanReviewRequired,
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

  return 'API呼び出しに失敗しました';
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
        this.message = '承認済み依頼をAIエージェントへ渡しています';
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
      this.message = '依頼をAIエージェントへ渡しています';
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
        if (hasHumanReviewRequired(this.state)) {
          await keepPhaseVisible(startedAt, 700);
          this.message = '人間の確認が必要です';
          this.runPhase = 'review_required';
          this.lastChangedAt = new Date().toISOString();
          return;
        }

        if (!hasRunnableAgentRequests(this.state)) {
          await keepPhaseVisible(startedAt, 700);
          this.message = 'AIエージェントのdry-run実行が完了しました';
          this.runPhase = 'completed';
          this.lastChangedAt = new Date().toISOString();
          return;
        }

        this.message = 'AIエージェントがAPI経由で処理中です';
        this.runPhase = 'running';
        await wait(300);
        this.state = await fetchState();
        this.lastChangedAt = new Date().toISOString();
      }

      this.message = 'AIエージェント実行中です';
      this.runPhase = 'running';
    },
    async submitControlReview(id: string, action: HumanReviewActionType, reason: string) {
      this.loading = true;
      this.errorMessage = '';
      this.message = action === 'approve' ? '確認結果を保存して続きを実行しています' : '確認結果を保存しています';
      try {
        this.state = await submitHumanReviewAction(id, action, reason);
        this.lastChangedAt = new Date().toISOString();

        if (action === 'approve') {
          this.runPhase = 'running';
          await this.refreshUntilAgentSettled(Date.now());
          return;
        }

        this.runPhase = 'review_required';
        this.message = action === 'reject' ? '却下として保存しました' : '修正依頼として保存しました';
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
