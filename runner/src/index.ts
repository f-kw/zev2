import {
  type AgentCompletionInput,
  type AgentRequest,
  getDryRunMeaningForRequest,
  getFileRefKindForRequest,
  getMimeTypeForFileRefKind,
  type Zev2State
} from '@zev2/shared';

interface NextResponse {
  request: AgentRequest | null;
}

interface StateResponse {
  state: Zev2State;
}

interface RunnerOptions {
  apiBaseUrl: string;
  maxSteps: number;
}

const defaultApiBaseUrl = process.env.ZEV2_API_BASE_URL ?? 'http://localhost:8080/api';

function parseOptions(): RunnerOptions {
  const options: RunnerOptions = {
    apiBaseUrl: defaultApiBaseUrl,
    maxSteps: 50
  };

  for (const argument of process.argv.slice(2)) {
    if (argument.startsWith('--api=')) {
      options.apiBaseUrl = argument.slice('--api='.length).replace(/\/$/, '');
    }

    if (argument.startsWith('--max-steps=')) {
      const parsed = Number(argument.slice('--max-steps='.length));
      if (Number.isInteger(parsed) && parsed > 0) {
        options.maxSteps = parsed;
      }
    }
  }

  return options;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${runnerOptions.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `API request failed: ${response.status}`);
  }

  return body;
}

function buildDryRunCompletion(request: AgentRequest): AgentCompletionInput {
  const kind = getFileRefKindForRequest(request.type);
  const safeDraftId = encodeURIComponent(request.requestDraftId);
  const safeRequestId = encodeURIComponent(request.id);
  const completion: AgentCompletionInput = {
    meaning: getDryRunMeaningForRequest(request.type),
    fileRef: {
      uri: `zev2://dry-run/${safeDraftId}/${safeRequestId}/${kind}`,
      mimeType: getMimeTypeForFileRefKind(kind),
      access: 'internal'
    }
  };

  if (request.type === 'find_candidates') {
    completion.decision = {
      decisionType: 'candidate_selection',
      decision: '候補探索結果を人間確認へ進める',
      reason: 'dry-runでは候補参照を作成した段階で、人間が映像確認へ進めるか判断できる状態になるため',
      evidenceRefs: [
        {
          refId: request.id,
          kind: 'agent_request',
          meaning: '候補探索工程のAI作業'
        }
      ],
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'この候補探索結果を映像確認へ進めてよいか',
      ruleIds: ['control-plane:candidate-review-required']
    };
  }

  if (request.type === 'apply_adjustment') {
    completion.decision = {
      decisionType: 'render_readiness',
      decision: '動画生成前に人間確認へ進める',
      reason: '動画生成は初回依頼承認とは別の重要操作であり、生成前に編集案と修正反映を人間が確認する必要があるため',
      evidenceRefs: [
        {
          refId: request.id,
          kind: 'agent_request',
          meaning: '動画生成前の微調整工程'
        }
      ],
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'この編集案で動画生成へ進めてよいか',
      ruleIds: ['control-plane:render-approval-required']
    };
  }

  return completion;
}

async function claimRequest(request: AgentRequest): Promise<void> {
  await requestJson<StateResponse>(`/agent-requests/${request.id}/claim`, {
    method: 'POST'
  });
}

async function completeRequest(request: AgentRequest): Promise<void> {
  await requestJson<StateResponse>(`/agent-requests/${request.id}/complete`, {
    method: 'POST',
    body: JSON.stringify(buildDryRunCompletion(request))
  });
}

async function failRequest(request: AgentRequest, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'dry-run runnerで不明な失敗が発生しました';

  await requestJson<StateResponse>(`/agent-requests/${request.id}/fail`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

async function runDryRunLoop(): Promise<void> {
  for (let index = 0; index < runnerOptions.maxSteps; index += 1) {
    const { request } = await requestJson<NextResponse>('/agent-requests/next');

    if (!request) {
      console.log('実行できるAI作業はありません。dry-run runnerを終了します。');
      return;
    }

    console.log(`dry-run開始: ${request.label} (${request.type})`);

    try {
      await claimRequest(request);
      await completeRequest(request);
      console.log(`dry-run完了: ${request.label}`);
    } catch (error) {
      await failRequest(request, error);
      throw error;
    }
  }

  throw new Error(`最大処理件数 ${runnerOptions.maxSteps} 件に到達したため停止しました`);
}

const runnerOptions = parseOptions();
await runDryRunLoop();
