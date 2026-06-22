#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const missingGeminiEnv = {
  GEMINI_API_KEY: '',
  GOOGLE_API_KEY: '',
  GOOGLE_CLOUD_PROJECT: '',
  PROJECT_ID: '',
  GCP_PROJECT_ID: '',
  ZEV2_STT_SERVER_URL: '',
  ZEV_STT_SERVER_URL: ''
};

function assertScenario(condition, message) {
  if (!condition) {
    throw new Error(`シナリオ失敗: ${message}`);
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('空きポートを取得できません'));
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${url} failed: ${response.status} ${text}`);
  }

  return body;
}

function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120000;
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ...options.env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const output = [];
  let settled = false;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`${command} ${args.join(' ')} timed out\n${output.join('')}`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));
    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      const result = { code, output: output.join('') };
      if (code !== 0 && !options.allowFailure) {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${result.output}`));
        return;
      }

      resolve(result);
    });
  });
}

async function startBackend(runtimeDir, port) {
  const output = [];
  const child = spawn('pnpm', ['--filter', 'backend', 'dev'], {
    cwd: workspaceRoot,
    detached: true,
    env: {
      ...process.env,
      ...missingGeminiEnv,
      PORT: String(port),
      ZEV2_RUNTIME_DIR: runtimeDir,
      ZEV2_API_BASE_URL: `http://127.0.0.1:${port}/api`,
      ZEV2_WORKSPACE_ROOT: workspaceRoot,
      ZEV2_DISABLE_AUTO_RUNNER: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));

  const healthUrl = `http://127.0.0.1:${port}/api/health`;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      const health = await requestJson(healthUrl);
      if (health.status === 'ok') {
        return {
          child,
          output,
          stop: async () => {
            try {
              process.kill(-child.pid, 'SIGTERM');
            } catch {
              child.kill('SIGTERM');
            }
            await wait(800);
            if (!child.killed) {
              try {
                process.kill(-child.pid, 'SIGKILL');
              } catch {
                child.kill('SIGKILL');
              }
            }
          }
        };
      }
    } catch {
      await wait(250);
    }
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  throw new Error(`backendが起動しませんでした\n${output.join('')}`);
}

async function runAgent(apiBaseUrl, runtimeDir, maxSteps, allowFailure = false) {
  return runProcess(
    'pnpm',
    ['--filter', '@zev2/agent-runner', 'dry-run:no-build', '--', `--max-steps=${maxSteps}`],
    {
      env: {
        ...missingGeminiEnv,
        ZEV2_RUNTIME_DIR: runtimeDir,
        ZEV2_API_BASE_URL: apiBaseUrl,
        ZEV2_WORKSPACE_ROOT: workspaceRoot
      },
      allowFailure,
      timeoutMs: 120000
    }
  );
}

function apiPath(apiBaseUrl, routePath) {
  return `${apiBaseUrl}${routePath}`;
}

function artifactUrl(apiBaseUrl, fileRefUri) {
  return `${apiBaseUrl.replace(/\/api$/, '')}${fileRefUri}`;
}

async function requestJsonWithStatus(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: text ? JSON.parse(text) : {}
  };
}

function agentRequestsForDraft(state, draftId) {
  return state.agentRequests.filter((request) => request.requestDraftId === draftId);
}

function latestAgentRequest(state, draftId, type) {
  return [...state.agentRequests]
    .reverse()
    .find((request) => request.requestDraftId === draftId && request.type === type);
}

function latestSucceededAgentRequestInState(state, draftId, type) {
  return [...state.agentRequests]
    .reverse()
    .find((request) =>
      request.requestDraftId === draftId &&
      request.type === type &&
      request.status === 'succeeded'
    );
}

function controlReviewsForDraft(state, draftId, kind) {
  return state.controlReviewItems.filter((review) => review.requestDraftId === draftId && review.kind === kind);
}

function latestControlReviewInState(state, draftId, kind) {
  return [...state.controlReviewItems]
    .reverse()
    .find((review) => review.requestDraftId === draftId && review.kind === kind);
}

function fileRefForRequest(state, request) {
  return state.fileRefs.find((fileRef) => fileRef.id === request?.result?.fileRefId);
}

async function artifactJsonForRequest(apiBaseUrl, state, request) {
  const fileRef = fileRefForRequest(state, request);
  assertScenario(fileRef, `${request?.type ?? 'AI工程'} の成果物参照がない`);
  return requestJson(artifactUrl(apiBaseUrl, fileRef.uri));
}

async function approveThemeReview(apiBaseUrl, review, selectedOptionId, reason = 'シナリオテストでテーマを選ぶ') {
  return requestJson(apiPath(apiBaseUrl, `/control-reviews/${review.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({ reason, selectedOptionId })
  });
}

async function createSampleThemeReview(apiBaseUrl, runtimeDir, purpose) {
  const draft = await createDraft(apiBaseUrl, 'zev-sample://speech-id-timing', purpose);
  await requestJson(apiPath(apiBaseUrl, `/request-drafts/${draft.id}/approve`), { method: 'POST' });
  await runAgent(apiBaseUrl, runtimeDir, 3, true);

  const state = await pollState(
    apiBaseUrl,
    (item) => item.controlReviewItems.some((review) =>
      review.requestDraftId === draft.id &&
      review.kind === 'theme_selection' &&
      review.status === 'review_required'
    ),
    'サンプルのテーマ選択レビュー'
  );
  const themeReview = latestControlReviewInState(state, draft.id, 'theme_selection');
  assertScenario(themeReview?.status === 'review_required', 'テーマ選択レビューが確認待ちになっていない');
  return { draft, themeReview, state };
}

async function createSampleRenderReviewByRunner(apiBaseUrl, runtimeDir, purpose, selectedOptionIndex = 0) {
  const { draft, themeReview, state: themeState } = await createSampleThemeReview(apiBaseUrl, runtimeDir, purpose);
  const selectedOption = themeReview.options[selectedOptionIndex] ?? themeReview.options[0];
  assertScenario(selectedOption, 'テーマ選択に使う候補がない');
  await approveThemeReview(apiBaseUrl, themeReview, selectedOption.id);
  await runAgent(apiBaseUrl, runtimeDir, 3, true);

  const state = await pollState(
    apiBaseUrl,
    (item) => item.controlReviewItems.some((review) =>
      review.requestDraftId === draft.id &&
      review.kind === 'render_readiness' &&
      review.status === 'review_required'
    ),
    'サンプルの動画生成前確認'
  );
  const renderReview = latestControlReviewInState(state, draft.id, 'render_readiness');
  assertScenario(renderReview?.status === 'review_required', '動画生成前確認が確認待ちになっていない');
  return { draft, themeReview, selectedOption, themeState, renderReview, state };
}

async function completeRenderRequestAsScenario(apiBaseUrl, runtimeDir, draft, renderRequest) {
  await requestJson(apiPath(apiBaseUrl, `/agent-requests/${renderRequest.id}/claim`), { method: 'POST' });
  const artifactDir = path.join(runtimeDir, 'artifacts', draft.id);
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, 'output.mp4'), 'scenario output video\n');
  return requestJson(apiPath(apiBaseUrl, `/agent-requests/${renderRequest.id}/complete`), {
    method: 'POST',
    body: JSON.stringify({
      meaning: 'シナリオテスト用の確認動画',
      fileRef: {
        uri: `/api/artifacts/${draft.id}/output.mp4`,
        mimeType: 'video/mp4',
        access: 'internal'
      }
    })
  });
}

async function approveRenderReviewAndCompleteVideo(apiBaseUrl, runtimeDir, draft, renderReview, reason) {
  const approval = await requestJson(apiPath(apiBaseUrl, `/control-reviews/${renderReview.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
  const renderRequest = latestAgentRequest(approval.state, draft.id, 'render_video');
  assertScenario(renderRequest?.status === 'queued', '生成前確認を承認した後に動画生成工程が作られていない');
  assertScenario(renderRequest.dependsOnAgentRequestId === renderReview.agentRequestId, '動画生成工程が承認した生成前確認に紐づいていない');

  const completed = await completeRenderRequestAsScenario(apiBaseUrl, runtimeDir, draft, renderRequest);
  const outputVideoRequest = latestSucceededAgentRequestInState(completed.state, draft.id, 'render_video');
  const outputFileRef = fileRefForRequest(completed.state, outputVideoRequest);
  assertScenario(outputVideoRequest?.result?.outputType === 'OutputVideo', '確認用動画の成果物種別が生成動画になっていない');
  assertScenario(outputFileRef?.kind === 'output_video', '確認用動画のファイル参照種別が正しくない');
  return completed.state;
}

async function createSampleGeneratedVideo(apiBaseUrl, runtimeDir, purpose) {
  const { draft, renderReview } = await createSampleRenderReviewByRunner(apiBaseUrl, runtimeDir, purpose);
  const state = await approveRenderReviewAndCompleteVideo(
    apiBaseUrl,
    runtimeDir,
    draft,
    renderReview,
    '確認用動画を作る'
  );
  const outputVideoRequest = latestSucceededAgentRequestInState(state, draft.id, 'render_video');
  assertScenario(outputVideoRequest?.result?.fileRefId, '生成動画の成果物参照が保存されていない');
  return { draft, renderReview, renderRequest: outputVideoRequest, state };
}

async function createDraft(apiBaseUrl, sourceUri, purpose) {
  const result = await requestJson(apiPath(apiBaseUrl, '/request-drafts'), {
    method: 'POST',
    body: JSON.stringify({
      purpose,
      sourceUri,
      durationLabel: '60秒以内',
      themeCountLabel: '3テーマ',
      geminiModelName: 'gemini-3.5-flash',
      preset: 'shorts_default'
    })
  });

  return result.draft;
}

async function scenarioDraftApprovalGate(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-01: 依頼下書きは承認されるまでAI工程を開始しない');
  const draft = await createDraft(
    apiBaseUrl,
    'zev-sample://speech-id-timing',
    '依頼下書き承認ゲートを確認する'
  );
  let state = await requestJson(apiPath(apiBaseUrl, '/state'));
  assertScenario(agentRequestsForDraft(state, draft.id).length === 0, '承認前にAI工程が作られている');

  const approved = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${draft.id}/approve`), { method: 'POST' });
  state = approved.state;
  const approvedDraft = state.requestDrafts.find((item) => item.id === draft.id);
  const requests = agentRequestsForDraft(state, draft.id);
  const requestTypes = requests.map((request) => request.type);
  assertScenario(approvedDraft?.status === 'approved', '下書きが承認済みになっていない');
  assertScenario(requests.length === 6, '動画生成以外のAI工程が承認後にキュー化されていない');
  assertScenario(!requestTypes.includes('render_video'), '動画生成が生成前確認前に作られている');
  assertScenario(latestAgentRequest(state, draft.id, 'prepare_video')?.status === 'queued', '動画取り込みが待機状態ではない');
  assertScenario(
    requests.every((request) => request.input.settings.geminiModelName === 'gemini-3.5-flash'),
    'Geminiモデル設定がAI工程へ渡っていない'
  );

  const secondApproval = await requestJsonWithStatus(apiPath(apiBaseUrl, `/request-drafts/${draft.id}/approve`), {
    method: 'POST'
  });
  assertScenario(secondApproval.status === 409, '同じ下書きの二重承認が拒否されていない');

  await runAgent(apiBaseUrl, runtimeDir, 3, true);
  await pollState(
    apiBaseUrl,
    (item) => latestControlReviewInState(item, draft.id, 'theme_selection')?.status === 'review_required',
    '依頼下書き承認ゲート確認後のテーマ選択レビュー'
  );
}

async function pollState(apiBaseUrl, predicate, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let latestState;
  while (Date.now() < deadline) {
    latestState = await requestJson(apiPath(apiBaseUrl, '/state'));
    if (predicate(latestState)) {
      return latestState;
    }
    await wait(300);
  }

  throw new Error(`${label} を確認できませんでした\n${summarizeState(latestState)}`);
}

function summarizeState(state) {
  if (!state) {
    return '状態を取得できませんでした';
  }

  const requests = state.agentRequests
    .slice(-12)
    .map((request) => [
      request.requestDraftId,
      request.type,
      request.status,
      request.errorMessage ? `error=${request.errorMessage}` : ''
    ].filter(Boolean).join(' / '));
  const reviews = state.controlReviewItems
    .slice(-12)
    .map((review) => [
      review.requestDraftId,
      review.kind,
      review.status,
      review.options?.length ? `options=${review.options.length}` : ''
    ].filter(Boolean).join(' / '));

  return [
    `下書き数: ${state.requestDrafts.length}`,
    '直近のAI工程:',
    ...requests,
    '直近の人間確認:',
    ...reviews
  ].join('\n');
}

async function scenarioSampleFlowAndThemeGate(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-02/03: サンプル正常系が動画生成前確認まで到達し、テーマ選択前は構成案へ進まない');
  const { draft, themeReview, state } = await createSampleThemeReview(
    apiBaseUrl,
    runtimeDir,
    'サンプル正常系とテーマ選択ゲートを確認する'
  );
  const themeRequest = state.agentRequests.find((request) =>
    request.requestDraftId === draft.id &&
    request.type === 'propose_clip_themes' &&
    request.status === 'succeeded'
  );
  assertScenario(themeRequest?.result?.fileRefId, 'サンプルテーマ候補の成果物参照がない');
  const fileRef = state.fileRefs.find((item) => item.id === themeRequest.result.fileRefId);
  assertScenario(fileRef, 'サンプルテーマ候補のファイル参照がない');
  const themes = await requestJson(artifactUrl(apiBaseUrl, fileRef.uri));
  assertScenario(themes.mode === 'sample-theme-options', 'サンプル以外のテーマ候補モードになっている');
  assertScenario(themes.themes.length === 3, 'サンプルテーマ候補が3件ではない');
  assertScenario(!JSON.stringify(themes).includes('ぶんぶん'), 'サンプルテーマ候補にノイズ文字列が混入している');
  assertScenario(
    !state.agentRequests.some((request) =>
      request.requestDraftId === draft.id &&
      request.type === 'build_clip_composition' &&
      ['running', 'succeeded'].includes(request.status)
    ),
    'テーマ選択前に複数箇所構成が実行されている'
  );

  const selectedOption = themeReview.options[1] ?? themeReview.options[0];
  await approveThemeReview(apiBaseUrl, themeReview, selectedOption.id);
  const nextAfterThemeApproval = await requestJson(apiPath(apiBaseUrl, '/agent-requests/next'));
  assertScenario(
    nextAfterThemeApproval.request?.requestDraftId === draft.id &&
    nextAfterThemeApproval.request?.type === 'build_clip_composition',
    'テーマ選択後に複数箇所構成が次のAI工程になっていない'
  );

  await runAgent(apiBaseUrl, runtimeDir, 3, true);
  const renderReadyState = await pollState(
    apiBaseUrl,
    (item) => latestControlReviewInState(item, draft.id, 'render_readiness')?.status === 'review_required',
    'サンプル正常系の動画生成前確認'
  );
  const compositionRequest = latestSucceededAgentRequestInState(renderReadyState, draft.id, 'build_clip_composition');
  const editPlanRequest = latestSucceededAgentRequestInState(renderReadyState, draft.id, 'create_edit_plan');
  const patchRequest = latestSucceededAgentRequestInState(renderReadyState, draft.id, 'apply_adjustment');
  const composition = await artifactJsonForRequest(apiBaseUrl, renderReadyState, compositionRequest);
  const editPlan = await artifactJsonForRequest(apiBaseUrl, renderReadyState, editPlanRequest);
  assertScenario(composition.selectedThemeId === selectedOption.id, '選んだテーマIDで構成案が作られていない');
  assertScenario(editPlan.mode === 'sample-edit-plan', 'サンプル以外の演出案モードになっている');
  assertScenario(patchRequest?.result?.fileRefId, '動画生成前確認に使う微調整成果物が保存されていない');
}

function agentRequestTemplate(draft, type, label, id, dependsOnAgentRequestId, status = 'queued') {
  return {
    id,
    requestDraftId: draft.id,
    type,
    label,
    target: { sourceUri: draft.source.uri },
    input: {
      purpose: draft.purpose,
      settings: draft.settings
    },
    constraints: draft.settings,
    policy: draft.policy,
    ...(dependsOnAgentRequestId ? { dependsOnAgentRequestId } : {}),
    status,
    fileRefIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function seedRealTranscriptReadyForTheme(apiBaseUrl, runtimeDir) {
  const draft = await createDraft(
    apiBaseUrl,
    '/private/tmp/zev2-scenario-real-video.mp4',
    '実動画の文字起こしからテーマ候補を作る'
  );
  const statePath = path.join(runtimeDir, 'state.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  const stateDraft = state.requestDrafts.find((item) => item.id === draft.id);
  stateDraft.status = 'approved';
  stateDraft.updatedAt = new Date().toISOString();

  const artifactDir = path.join(runtimeDir, 'artifacts', draft.id);
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, 'source-video.json'), JSON.stringify({
    kind: 'source_video',
    mode: 'local-source-reference',
    sourceUri: draft.source.uri,
    purpose: draft.purpose,
    registeredAt: new Date().toISOString()
  }, null, 2));
  await writeFile(path.join(artifactDir, 'transcript.json'), JSON.stringify({
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: draft.source.uri,
    notes: ['シナリオテスト用の実動画相当文字起こしです。'],
    generatedAt: new Date().toISOString(),
    language: 'ja',
    durationSec: 12,
    segmentCount: 3,
    segments: [
      { id: 1, startMs: 0, endMs: 3000, text: '今日は大型企画の裏側を話します。' },
      { id: 2, startMs: 3000, endMs: 7000, text: 'スタジオで初対面の人が多くてかなり緊張しました。' },
      { id: 3, startMs: 7000, endMs: 12000, text: 'でも最後はみんなで盛り上がって良い企画になりました。' }
    ],
    speechUnitGroups: [[1, 2, 3]]
  }, null, 2));

  const prepare = agentRequestTemplate(draft, 'prepare_video', '動画取り込み', `agent_${draft.id}_prepare`, undefined, 'succeeded');
  const stt = agentRequestTemplate(draft, 'run_stt', 'STT', `agent_${draft.id}_stt`, prepare.id, 'succeeded');
  const theme = agentRequestTemplate(draft, 'propose_clip_themes', 'テーマ候補作成', `agent_${draft.id}_theme`, stt.id);
  const composition = agentRequestTemplate(draft, 'build_clip_composition', '複数箇所構成', `agent_${draft.id}_composition`, theme.id);
  const edit = agentRequestTemplate(draft, 'create_edit_plan', '演出作成', `agent_${draft.id}_edit`, composition.id);
  const patch = agentRequestTemplate(draft, 'apply_adjustment', '微調整', `agent_${draft.id}_patch`, edit.id);

  const sourceFileRef = {
    id: `fileref_${draft.id}_source`,
    kind: 'source_video',
    uri: `/api/artifacts/${draft.id}/source-video.json`,
    mimeType: 'application/json',
    access: 'internal',
    ownerId: `prepare_${draft.id}`,
    createdAt: new Date().toISOString()
  };
  const transcriptFileRef = {
    id: `fileref_${draft.id}_transcript`,
    kind: 'transcript_json',
    uri: `/api/artifacts/${draft.id}/transcript.json`,
    mimeType: 'application/json',
    access: 'internal',
    ownerId: `transcript_${draft.id}`,
    createdAt: new Date().toISOString()
  };

  prepare.fileRefIds = [sourceFileRef.id];
  prepare.result = {
    outputId: sourceFileRef.ownerId,
    outputType: 'Video',
    fileRefId: sourceFileRef.id,
    meaning: 'シナリオテスト用の動画参照'
  };
  stt.fileRefIds = [transcriptFileRef.id];
  stt.result = {
    outputId: transcriptFileRef.ownerId,
    outputType: 'Transcript',
    fileRefId: transcriptFileRef.id,
    meaning: 'シナリオテスト用の文字起こし'
  };

  state.agentRequests.push(prepare, stt, theme, composition, edit, patch);
  state.fileRefs.push(sourceFileRef, transcriptFileRef);
  state.outputs.push(
    { id: sourceFileRef.ownerId, type: 'Video', meaning: 'シナリオテスト用の動画参照', fileRefId: sourceFileRef.id },
    { id: transcriptFileRef.ownerId, type: 'Transcript', meaning: 'シナリオテスト用の文字起こし', fileRefId: transcriptFileRef.id }
  );
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  return { draft, themeRequestId: theme.id };
}

async function seedRealCompositionReadyForEdit(apiBaseUrl, runtimeDir) {
  const draft = await createDraft(
    apiBaseUrl,
    '/private/tmp/zev2-scenario-real-video-without-file.mp4',
    '実動画の構成案から演出作成の失敗を確認する'
  );
  const statePath = path.join(runtimeDir, 'state.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  const stateDraft = state.requestDrafts.find((item) => item.id === draft.id);
  stateDraft.status = 'approved';
  stateDraft.updatedAt = new Date().toISOString();

  const artifactDir = path.join(runtimeDir, 'artifacts', draft.id);
  await mkdir(artifactDir, { recursive: true });
  const transcript = {
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: draft.source.uri,
    notes: ['シナリオテスト用の実動画相当文字起こしです。'],
    generatedAt: new Date().toISOString(),
    language: 'ja',
    durationSec: 12,
    segmentCount: 3,
    segments: [
      { id: 1, startMs: 0, endMs: 3000, text: '今日は大型企画の裏側を話します。' },
      { id: 2, startMs: 3000, endMs: 7000, text: 'スタジオで初対面の人が多くてかなり緊張しました。' },
      { id: 3, startMs: 7000, endMs: 12000, text: 'でも最後はみんなで盛り上がって良い企画になりました。' }
    ],
    speechUnitGroups: [[1, 2], [3]]
  };
  const themes = {
    kind: 'theme_json',
    mode: 'gemini-api-theme-options',
    generatedAt: new Date().toISOString(),
    sourceUri: draft.source.uri,
    themes: [
      {
        id: 'theme_real_1',
        title: '大型企画の裏側',
        summary: '初対面の緊張から最後に盛り上がった企画の裏側を切り抜く',
        representativeText: '今日は大型企画の裏側を話します。',
        representativeSpeechIds: [1],
        relatedSpeechIds: [1, 2, 3],
        whyItCanBeClipped: '企画の裏話として成立するため',
        compositionNote: '緊張から盛り上がりまでをつなぐ',
        evidenceRefs: [{ kind: 'time_range', refId: 'speech_1', meaning: '代表発話 1' }]
      }
    ]
  };
  const composition = {
    kind: 'composition_json',
    mode: 'transcript-multi-part-composition',
    generatedAt: new Date().toISOString(),
    sourceUri: draft.source.uri,
    selectedThemeId: 'theme_real_1',
    title: '大型企画の裏側',
    themeSummary: '初対面の緊張から最後に盛り上がった企画の裏側を切り抜く',
    sourceStartMs: 0,
    sourceEndMs: 12000,
    parts: [
      {
        id: 'part_1',
        sourceStartMs: 0,
        sourceEndMs: 7000,
        role: '導入',
        transcriptText: '今日は大型企画の裏側を話します。スタジオで初対面の人が多くてかなり緊張しました。',
        speechIds: [1, 2],
        speechUnits: [
          { id: 1, sourceStartMs: 0, sourceEndMs: 3000, text: '今日は大型企画の裏側を話します。' },
          { id: 2, sourceStartMs: 3000, sourceEndMs: 7000, text: 'スタジオで初対面の人が多くてかなり緊張しました。' }
        ],
        connectionNote: '企画の入口と緊張を見せる'
      },
      {
        id: 'part_2',
        sourceStartMs: 7000,
        sourceEndMs: 12000,
        role: '結論',
        transcriptText: 'でも最後はみんなで盛り上がって良い企画になりました。',
        speechIds: [3],
        speechUnits: [
          { id: 3, sourceStartMs: 7000, sourceEndMs: 12000, text: 'でも最後はみんなで盛り上がって良い企画になりました。' }
        ],
        connectionNote: '最後の盛り上がりで落とす'
      }
    ],
    assemblyPlan: '緊張から盛り上がりまでをつなぐ'
  };
  await writeFile(path.join(artifactDir, 'transcript.json'), JSON.stringify(transcript, null, 2));
  await writeFile(path.join(artifactDir, 'themes.json'), JSON.stringify(themes, null, 2));
  await writeFile(path.join(artifactDir, 'composition.json'), JSON.stringify(composition, null, 2));

  const prepare = agentRequestTemplate(draft, 'prepare_video', '動画取り込み', `agent_${draft.id}_prepare`, undefined, 'succeeded');
  const stt = agentRequestTemplate(draft, 'run_stt', 'STT', `agent_${draft.id}_stt`, prepare.id, 'succeeded');
  const theme = agentRequestTemplate(draft, 'propose_clip_themes', 'テーマ候補作成', `agent_${draft.id}_theme`, stt.id, 'succeeded');
  const compositionRequest = agentRequestTemplate(draft, 'build_clip_composition', '複数箇所構成', `agent_${draft.id}_composition`, theme.id, 'succeeded');
  const edit = agentRequestTemplate(draft, 'create_edit_plan', '演出作成', `agent_${draft.id}_edit`, compositionRequest.id);
  const patch = agentRequestTemplate(draft, 'apply_adjustment', '微調整', `agent_${draft.id}_patch`, edit.id);
  const transcriptFileRef = {
    id: `fileref_${draft.id}_transcript`,
    kind: 'transcript_json',
    uri: `/api/artifacts/${draft.id}/transcript.json`,
    mimeType: 'application/json',
    access: 'internal',
    ownerId: `transcript_${draft.id}`,
    createdAt: new Date().toISOString()
  };
  const themeFileRef = {
    id: `fileref_${draft.id}_theme`,
    kind: 'theme_json',
    uri: `/api/artifacts/${draft.id}/themes.json`,
    mimeType: 'application/json',
    access: 'internal',
    ownerId: `theme_${draft.id}`,
    createdAt: new Date().toISOString()
  };
  const compositionFileRef = {
    id: `fileref_${draft.id}_composition`,
    kind: 'composition_json',
    uri: `/api/artifacts/${draft.id}/composition.json`,
    mimeType: 'application/json',
    access: 'internal',
    ownerId: `composition_${draft.id}`,
    createdAt: new Date().toISOString()
  };

  stt.fileRefIds = [transcriptFileRef.id];
  stt.result = { outputId: transcriptFileRef.ownerId, outputType: 'Transcript', fileRefId: transcriptFileRef.id, meaning: 'シナリオ用文字起こし' };
  theme.fileRefIds = [themeFileRef.id];
  theme.result = { outputId: themeFileRef.ownerId, outputType: 'ThemeCandidates', fileRefId: themeFileRef.id, meaning: 'シナリオ用テーマ候補' };
  compositionRequest.fileRefIds = [compositionFileRef.id];
  compositionRequest.result = { outputId: compositionFileRef.ownerId, outputType: 'ClipComposition', fileRefId: compositionFileRef.id, meaning: 'シナリオ用構成案' };

  state.agentRequests.push(prepare, stt, theme, compositionRequest, edit, patch);
  state.fileRefs.push(transcriptFileRef, themeFileRef, compositionFileRef);
  state.outputs.push(
    { id: transcriptFileRef.ownerId, type: 'Transcript', meaning: 'シナリオ用文字起こし', fileRefId: transcriptFileRef.id },
    { id: themeFileRef.ownerId, type: 'ThemeCandidates', meaning: 'シナリオ用テーマ候補', fileRefId: themeFileRef.id },
    { id: compositionFileRef.ownerId, type: 'ClipComposition', meaning: 'シナリオ用構成案', fileRefId: compositionFileRef.id }
  );
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  return { draft, editRequestId: edit.id };
}

async function scenarioMissingGeminiFails(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-04: 実動画のテーマ候補作成はGemini APIなしで成功扱いにしない');
  const { draft, themeRequestId } = await seedRealTranscriptReadyForTheme(apiBaseUrl, runtimeDir);
  await runAgent(apiBaseUrl, runtimeDir, 1, true);
  const state = await requestJson(apiPath(apiBaseUrl, '/state'));
  const failedTheme = state.agentRequests.find((request) => request.id === themeRequestId);
  assertScenario(failedTheme?.status === 'failed', 'Gemini未接続のテーマ候補作成が失敗していない');
  assertScenario(
    failedTheme.errorMessage?.includes('Gemini APIの接続情報'),
    'Gemini未接続の失敗理由が保存されていない'
  );
  assertScenario(
    !state.controlReviewItems.some((review) => review.requestDraftId === draft.id && review.kind === 'theme_selection'),
    '失敗したテーマ候補作成から人間確認が作られている'
  );
  assertScenario(
    !state.fileRefs.some((fileRef) => fileRef.kind === 'theme_json' && fileRef.uri.includes(draft.id)),
    '失敗したテーマ候補作成からテーマ候補成果物が保存されている'
  );
  assertScenario(
    !state.agentRequests.some((request) =>
      request.requestDraftId === draft.id &&
      request.type === 'build_clip_composition' &&
      ['running', 'succeeded'].includes(request.status)
    ),
    'テーマ候補作成失敗後に複数箇所構成が実行されている'
  );

  return { draft, failedTheme };
}

async function scenarioRealEditPlanRequiresGeminiOrVideo(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-05: 実動画の演出作成はGemini APIまたは動画断片なしで失敗する');
  const { draft, editRequestId } = await seedRealCompositionReadyForEdit(apiBaseUrl, runtimeDir);
  await runAgent(apiBaseUrl, runtimeDir, 1, true);
  const state = await requestJson(apiPath(apiBaseUrl, '/state'));
  const editRequest = state.agentRequests.find((request) => request.id === editRequestId);
  assertScenario(editRequest?.status === 'failed', '実動画の演出作成が失敗していない');
  assertScenario(
    editRequest.errorMessage?.includes('動画ファイル') || editRequest.errorMessage?.includes('Gemini API'),
    '実動画の演出作成失敗理由が動画断片またはGemini API不足になっていない'
  );
  assertScenario(
    !state.fileRefs.some((fileRef) => fileRef.kind === 'edit_plan_json' && fileRef.uri.includes(draft.id)),
    '失敗した演出作成から演出案成果物が保存されている'
  );
  assertScenario(
    !state.agentRequests.some((request) =>
      request.requestDraftId === draft.id &&
      request.type === 'apply_adjustment' &&
      ['running', 'succeeded'].includes(request.status)
    ),
    '演出作成失敗後に微調整が実行されている'
  );
  assertScenario(
    !state.controlReviewItems.some((review) => review.requestDraftId === draft.id && review.kind === 'render_readiness'),
    '演出作成失敗後に動画生成前確認が作られている'
  );
}

async function scenarioRetryFailedAgentRequest(apiBaseUrl, runtimeDir, draft, failedTheme) {
  console.log('UC-P0-09: 失敗したAI工程を再実行できる');
  await requestJson(apiPath(apiBaseUrl, `/agent-requests/${failedTheme.id}/retry`), { method: 'POST' });
  const state = await pollState(
    apiBaseUrl,
    (item) => item.agentRequests.filter((request) =>
      request.requestDraftId === draft.id &&
      request.type === 'propose_clip_themes'
    ).length >= 2,
    '再実行されたテーマ候補作成'
  );
  const themeRequests = state.agentRequests.filter((request) =>
    request.requestDraftId === draft.id &&
    request.type === 'propose_clip_themes'
  );
  const oldRequest = themeRequests.find((request) => request.id === failedTheme.id);
  const latestRequest = themeRequests[themeRequests.length - 1];
  assertScenario(oldRequest?.status === 'superseded', '古い失敗工程が作り直し対象になっていない');
  assertScenario(latestRequest.id !== failedTheme.id, '再実行で新しいAI工程が作られていない');
  assertScenario(
    ['queued', 'running', 'failed'].includes(latestRequest.status),
    `再実行後の工程状態が不正: ${latestRequest.status}`
  );

  await runAgent(apiBaseUrl, runtimeDir, 1, true);
  const afterRunState = await requestJson(apiPath(apiBaseUrl, '/state'));
  const afterRunLatestRequest = afterRunState.agentRequests.find((request) => request.id === latestRequest.id);
  assertScenario(afterRunLatestRequest?.status === 'failed', '再実行したAI工程が失敗状態まで進んでいない');
  assertScenario(
    afterRunLatestRequest.errorMessage?.includes('Gemini APIの接続情報'),
    '再実行後の失敗理由が保存されていない'
  );
}

async function createSampleRenderReview(apiBaseUrl, runtimeDir, purpose) {
  const draft = await createDraft(apiBaseUrl, 'zev-sample://speech-id-timing', purpose);
  const statePath = path.join(runtimeDir, 'state.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  const stateDraft = state.requestDrafts.find((item) => item.id === draft.id);
  stateDraft.status = 'approved';
  stateDraft.updatedAt = new Date().toISOString();

  const fixture = JSON.parse(await readFile(path.join(workspaceRoot, 'runner', 'fixtures', 'zev-stt-sample.json'), 'utf8'));
  const segmentText = (ids) => fixture.segments
    .filter((segment) => ids.includes(segment.id))
    .map((segment) => segment.text)
    .join('');
  const themes = fixture.themeSeeds.map((seed) => ({
    id: seed.id,
    title: seed.title,
    summary: seed.summary,
    representativeText: segmentText(seed.representativeSpeechIds),
    representativeSpeechIds: seed.representativeSpeechIds,
    relatedSpeechIds: seed.relatedSpeechIds,
    whyItCanBeClipped: seed.reason,
    compositionNote: seed.compositionNote,
    evidenceRefs: seed.representativeSpeechIds.map((speechId) => ({
      kind: 'time_range',
      refId: `speech_${speechId}`,
      meaning: `代表発話 ${speechId}`
    }))
  }));
  const artifactDir = path.join(runtimeDir, 'artifacts', draft.id);
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, 'transcript.json'), JSON.stringify({
    kind: 'transcript_json',
    mode: 'zev-sample-stt',
    sourceUri: draft.source.uri,
    notes: ['シナリオテスト用のサンプル文字起こしです。'],
    generatedAt: new Date().toISOString(),
    language: 'ja-JP',
    durationSec: fixture.durationSec,
    segmentCount: fixture.segments.length,
    segments: fixture.segments,
    speechUnitGroups: fixture.speechUnitGroups,
    themeSeeds: fixture.themeSeeds
  }, null, 2));
  await writeFile(path.join(artifactDir, 'themes.json'), JSON.stringify({
    kind: 'theme_json',
    mode: 'sample-theme-options',
    generatedAt: new Date().toISOString(),
    sourceUri: draft.source.uri,
    themes
  }, null, 2));
  await writeFile(path.join(artifactDir, 'adjustment-patch.json'), JSON.stringify({
    kind: 'patch_json',
    mode: 'scenario-render-readiness',
    generatedAt: new Date().toISOString(),
    editPlanUri: `/api/artifacts/${draft.id}/edit-plan.json`,
    changes: [],
    renderReady: true
  }, null, 2));

  const prepare = agentRequestTemplate(draft, 'prepare_video', '動画取り込み', `agent_${draft.id}_prepare`, undefined, 'succeeded');
  const stt = agentRequestTemplate(draft, 'run_stt', 'STT', `agent_${draft.id}_stt`, prepare.id, 'succeeded');
  const theme = agentRequestTemplate(draft, 'propose_clip_themes', 'テーマ候補作成', `agent_${draft.id}_theme`, stt.id, 'succeeded');
  const composition = agentRequestTemplate(draft, 'build_clip_composition', '複数箇所構成', `agent_${draft.id}_composition`, theme.id, 'succeeded');
  const edit = agentRequestTemplate(draft, 'create_edit_plan', '演出作成', `agent_${draft.id}_edit`, composition.id, 'succeeded');
  const patch = agentRequestTemplate(draft, 'apply_adjustment', '微調整', `agent_${draft.id}_patch`, edit.id, 'succeeded');
  const transcriptFileRef = {
    id: `fileref_${draft.id}_transcript`,
    kind: 'transcript_json',
    uri: `/api/artifacts/${draft.id}/transcript.json`,
    mimeType: 'application/json',
    access: 'internal',
    ownerId: `transcript_${draft.id}`,
    createdAt: new Date().toISOString()
  };
  const themeFileRef = {
    id: `fileref_${draft.id}_theme`,
    kind: 'theme_json',
    uri: `/api/artifacts/${draft.id}/themes.json`,
    mimeType: 'application/json',
    access: 'internal',
    ownerId: `theme_${draft.id}`,
    createdAt: new Date().toISOString()
  };
  const patchFileRef = {
    id: `fileref_${draft.id}_patch`,
    kind: 'patch_json',
    uri: `/api/artifacts/${draft.id}/adjustment-patch.json`,
    mimeType: 'application/json',
    access: 'internal',
    ownerId: `patch_${draft.id}`,
    createdAt: new Date().toISOString()
  };

  stt.fileRefIds = [transcriptFileRef.id];
  stt.result = { outputId: transcriptFileRef.ownerId, outputType: 'Transcript', fileRefId: transcriptFileRef.id, meaning: 'シナリオ用文字起こし' };
  theme.fileRefIds = [themeFileRef.id];
  theme.result = { outputId: themeFileRef.ownerId, outputType: 'ThemeCandidates', fileRefId: themeFileRef.id, meaning: 'シナリオ用テーマ候補' };
  patch.fileRefIds = [patchFileRef.id];
  patch.result = { outputId: patchFileRef.ownerId, outputType: 'Patch', fileRefId: patchFileRef.id, meaning: 'シナリオ用生成前確認' };

  const themeReviewId = `review_${draft.id}_theme`;
  const selectedThemeId = themes[0].id;
  const themeHumanActionId = `human_${draft.id}_theme`;
  const renderReview = {
    id: `review_${draft.id}_render`,
    requestDraftId: draft.id,
    agentRequestId: patch.id,
    kind: 'render_readiness',
    status: 'review_required',
    title: '動画生成前の確認',
    summary: '微調整 の結果を確認して、動画生成へ進めるか判断します',
    reason: 'シナリオテスト用に生成前確認まで到達済みの状態を作る',
    evidenceRefs: [],
    options: [],
    proposedNextState: 'review_required',
    humanQuestion: 'この複数箇所の構成と演出案で動画生成へ進めてよいか',
    decisionLogId: `decision_${draft.id}_render`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.agentRequests.push(prepare, stt, theme, composition, edit, patch);
  state.fileRefs.push(transcriptFileRef, themeFileRef, patchFileRef);
  state.outputs.push(
    { id: transcriptFileRef.ownerId, type: 'Transcript', meaning: 'シナリオ用文字起こし', fileRefId: transcriptFileRef.id },
    { id: themeFileRef.ownerId, type: 'ThemeCandidates', meaning: 'シナリオ用テーマ候補', fileRefId: themeFileRef.id },
    { id: patchFileRef.ownerId, type: 'Patch', meaning: 'シナリオ用生成前確認', fileRefId: patchFileRef.id }
  );
  state.controlReviewItems.push(
    {
      id: themeReviewId,
      requestDraftId: draft.id,
      agentRequestId: theme.id,
      kind: 'theme_selection',
      status: 'approved',
      title: 'テーマ選択',
      summary: 'テーマ候補作成 の結果を確認して、切り抜きたいテーマを選びます',
      reason: 'シナリオテストでテーマを選択済みにする',
      evidenceRefs: [],
      options: themes.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        evidenceRefs: item.evidenceRefs
      })),
      proposedNextState: 'review_required',
      humanQuestion: 'どのテーマで切り抜きを作るか選んでください',
      decisionLogId: `decision_${draft.id}_theme`,
      createdAt: new Date(Date.now() - 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 900).toISOString(),
      resolvedByActionId: themeHumanActionId
    },
    renderReview
  );
  state.humanReviewActions.push({
    id: themeHumanActionId,
    reviewItemId: themeReviewId,
    requestDraftId: draft.id,
    action: 'approve',
    reason: 'シナリオテストでテーマを選ぶ',
    selectedOptionId: selectedThemeId,
    createdAt: new Date(Date.now() - 900).toISOString()
  });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  assertScenario(renderReview, '生成前確認レビューがない');

  return { draft, renderReview, state };
}

function requestCount(state, draftId, type) {
  return state.agentRequests.filter((request) => request.requestDraftId === draftId && request.type === type).length;
}

async function scenarioRenderApprovalCreatesVideo(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-06/10: 動画生成前確認の承認で動画生成へ進み、生成動画成果物を保存する');
  const { draft, renderReview, state: beforeState } = await createSampleRenderReviewByRunner(
    apiBaseUrl,
    runtimeDir,
    '動画生成前確認の承認と生成動画成果物を確認する'
  );
  assertScenario(requestCount(beforeState, draft.id, 'render_video') === 0, '生成前確認承認前に動画生成AI工程が作られている');

  const approval = await requestJson(apiPath(apiBaseUrl, `/control-reviews/${renderReview.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({ reason: 'この編集案で確認用動画を作る' })
  });
  const renderRequest = latestAgentRequest(approval.state, draft.id, 'render_video');
  assertScenario(renderRequest?.status === 'queued', '生成前確認承認後に動画生成AI工程が待機状態で作られていない');
  assertScenario(renderRequest.dependsOnAgentRequestId === renderReview.agentRequestId, '動画生成AI工程が生成前確認の元工程に依存していない');

  const oldApproval = await requestJsonWithStatus(apiPath(apiBaseUrl, `/control-reviews/${renderReview.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({ reason: '二重承認を試す' })
  });
  assertScenario(oldApproval.status === 409, '承認済み生成前確認の二重承認が拒否されていない');

  const completed = await completeRenderRequestAsScenario(apiBaseUrl, runtimeDir, draft, renderRequest);
  const completedRender = latestSucceededAgentRequestInState(completed.state, draft.id, 'render_video');
  const outputFileRef = fileRefForRequest(completed.state, completedRender);
  assertScenario(completedRender?.result?.outputType === 'OutputVideo', '動画生成の成果物種別が生成動画になっていない');
  assertScenario(outputFileRef?.kind === 'output_video', '生成動画のファイル参照種別が正しくない');
  assertScenario(
    completed.state.outputs.some((output) => output.type === 'OutputVideo' && output.fileRefId === outputFileRef.id),
    '生成動画の出力情報が保存されていない'
  );
}

async function scenarioRenderReadinessEditRerun(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-07: 生成前確認から構成と演出を作り直せる');
  const { draft, renderReview, state: beforeState } = await createSampleRenderReview(
    apiBaseUrl,
    runtimeDir,
    '生成前確認から構成と演出を作り直す'
  );
  const beforeBuildCount = requestCount(beforeState, draft.id, 'build_clip_composition');
  const beforeEditCount = requestCount(beforeState, draft.id, 'create_edit_plan');
  const beforePatchCount = requestCount(beforeState, draft.id, 'apply_adjustment');
  const beforeRenderReviewCount = beforeState.controlReviewItems.filter((review) =>
    review.requestDraftId === draft.id &&
    review.kind === 'render_readiness'
  ).length;

  await requestJson(apiPath(apiBaseUrl, `/control-reviews/${renderReview.id}/request-changes`), {
    method: 'POST',
    body: JSON.stringify({
      reason: '完成イメージを変えるため構成と演出を作り直す',
      scope: 'edit_plan'
    })
  });
  await runAgent(apiBaseUrl, runtimeDir, 3, true);
  const state = await pollState(
    apiBaseUrl,
    (item) => item.controlReviewItems.filter((review) =>
      review.requestDraftId === draft.id &&
      review.kind === 'render_readiness'
    ).length > beforeRenderReviewCount,
    '構成と演出を作り直した後の生成前確認'
  );

  const originalReview = state.controlReviewItems.find((review) => review.id === renderReview.id);
  const latestRenderReview = latestControlReviewInState(state, draft.id, 'render_readiness');
  assertScenario(originalReview?.status === 'changes_requested', '元の生成前確認が修正依頼済みになっていない');
  assertScenario(latestRenderReview?.id !== renderReview.id, '新しい生成前確認が作られていない');
  assertScenario(latestRenderReview?.agentRequestId !== renderReview.agentRequestId, '新しい生成前確認が古い微調整工程を参照している');
  assertScenario(requestCount(state, draft.id, 'build_clip_composition') > beforeBuildCount, '複数箇所構成が作り直されていない');
  assertScenario(requestCount(state, draft.id, 'create_edit_plan') > beforeEditCount, '演出作成が作り直されていない');
  assertScenario(requestCount(state, draft.id, 'apply_adjustment') > beforePatchCount, '微調整が作り直されていない');
  const oldApproval = await requestJsonWithStatus(apiPath(apiBaseUrl, `/control-reviews/${renderReview.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({ reason: '古い生成前確認を承認する' })
  });
  assertScenario(oldApproval.status === 409, '修正依頼済みの古い生成前確認が承認できている');
}

async function scenarioRenderReadinessThemeReselect(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-08: 生成前確認から既存テーマ候補へ戻り、別テーマで再作成できる');
  const { draft, renderReview, state: beforeState } = await createSampleRenderReview(
    apiBaseUrl,
    runtimeDir,
    '生成前確認から既存テーマ候補を選び直す'
  );
  const beforeThemeRequestCount = requestCount(beforeState, draft.id, 'propose_clip_themes');
  const beforeThemeReviewCount = beforeState.controlReviewItems.filter((review) =>
    review.requestDraftId === draft.id &&
    review.kind === 'theme_selection'
  ).length;
  const beforeBuildCount = requestCount(beforeState, draft.id, 'build_clip_composition');
  const beforeRenderReviewCount = controlReviewsForDraft(beforeState, draft.id, 'render_readiness').length;

  await requestJson(apiPath(apiBaseUrl, `/control-reviews/${renderReview.id}/request-changes`), {
    method: 'POST',
    body: JSON.stringify({
      reason: '今のテーマではなく別テーマで確認したい',
      scope: 'theme_reselect'
    })
  });
  await runAgent(apiBaseUrl, runtimeDir, 1, true);
  const state = await pollState(
    apiBaseUrl,
    (item) => item.controlReviewItems.filter((review) =>
      review.requestDraftId === draft.id &&
      review.kind === 'theme_selection'
    ).length > beforeThemeReviewCount,
    '既存テーマ候補の再選択レビュー'
  );
  const themeReviews = state.controlReviewItems.filter((review) =>
    review.requestDraftId === draft.id &&
    review.kind === 'theme_selection'
  );
  const latestThemeReview = themeReviews.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const originalRenderReview = state.controlReviewItems.find((review) => review.id === renderReview.id);

  assertScenario(originalRenderReview?.status === 'changes_requested', '元の生成前確認が修正依頼済みになっていない');
  assertScenario(latestThemeReview.status === 'review_required', 'テーマ再選択レビューが確認待ちになっていない');
  assertScenario(latestThemeReview.options.length > 0, 'テーマ再選択レビューに既存テーマ候補がない');
  assertScenario(
    requestCount(state, draft.id, 'propose_clip_themes') === beforeThemeRequestCount,
    'テーマ再選択でテーマ候補作成を再実行している'
  );
  assertScenario(
    state.agentRequests.some((request) =>
      request.requestDraftId === draft.id &&
      request.type === 'build_clip_composition' &&
      ['queued', 'waiting'].includes(request.status)
    ),
    'テーマ再選択後の構成案作成がテーマ選択待ちで残っていない'
  );

  const originalSelectedAction = state.humanReviewActions.find((action) =>
    action.reviewItemId === beforeState.controlReviewItems.find((review) =>
      review.requestDraftId === draft.id &&
      review.kind === 'theme_selection' &&
      review.status === 'approved'
    )?.id
  );
  const nextThemeOption =
    latestThemeReview.options.find((option) => option.id !== originalSelectedAction?.selectedOptionId) ??
    latestThemeReview.options[0];
  await approveThemeReview(apiBaseUrl, latestThemeReview, nextThemeOption.id, '別テーマで作り直す');
  await runAgent(apiBaseUrl, runtimeDir, 3, true);
  const rebuiltState = await pollState(
    apiBaseUrl,
    (item) => controlReviewsForDraft(item, draft.id, 'render_readiness').length > beforeRenderReviewCount,
    'テーマ再選択後の動画生成前確認'
  );
  const latestRenderReview = latestControlReviewInState(rebuiltState, draft.id, 'render_readiness');
  const newCompositionRequest = latestSucceededAgentRequestInState(rebuiltState, draft.id, 'build_clip_composition');
  const newComposition = await artifactJsonForRequest(apiBaseUrl, rebuiltState, newCompositionRequest);
  assertScenario(requestCount(rebuiltState, draft.id, 'build_clip_composition') > beforeBuildCount, '別テーマ選択後に構成案が作り直されていない');
  assertScenario(newComposition.selectedThemeId === nextThemeOption.id, '別テーマ選択後の構成案に選び直したテーマIDが反映されていない');
  assertScenario(latestRenderReview?.status === 'review_required', 'テーマ再選択後の生成前確認が確認待ちになっていない');
  const completedState = await approveRenderReviewAndCompleteVideo(
    apiBaseUrl,
    runtimeDir,
    draft,
    latestRenderReview,
    'テーマ再選択後の編集案で確認用動画を作る'
  );
  const completedRender = latestSucceededAgentRequestInState(completedState, draft.id, 'render_video');
  assertScenario(completedRender?.dependsOnAgentRequestId === latestRenderReview.agentRequestId, 'テーマ再選択後の動画生成が新しい生成前確認に紐づいていない');
  const oldApproval = await requestJsonWithStatus(apiPath(apiBaseUrl, `/control-reviews/${renderReview.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({ reason: '古い生成前確認を承認する' })
  });
  assertScenario(oldApproval.status === 409, 'テーマ再選択後に古い生成前確認が承認できている');
}

async function scenarioGeneratedVideoEditRerun(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-11: 生成後レビューから構成と演出を作り直せる');
  const { draft, state: beforeState } = await createSampleGeneratedVideo(
    apiBaseUrl,
    runtimeDir,
    '生成後レビューから構成と演出を作り直す'
  );
  const beforeBuildCount = requestCount(beforeState, draft.id, 'build_clip_composition');
  const beforeEditCount = requestCount(beforeState, draft.id, 'create_edit_plan');
  const beforePatchCount = requestCount(beforeState, draft.id, 'apply_adjustment');
  const beforeRenderReviewCount = controlReviewsForDraft(beforeState, draft.id, 'render_readiness').length;

  await requestJson(apiPath(apiBaseUrl, `/request-drafts/${draft.id}/request-generated-video-changes`), {
    method: 'POST',
    body: JSON.stringify({
      reason: '生成後に見たら構成と演出を変えたくなった',
      scope: 'edit_plan'
    })
  });
  await runAgent(apiBaseUrl, runtimeDir, 3, true);
  const state = await pollState(
    apiBaseUrl,
    (item) => controlReviewsForDraft(item, draft.id, 'render_readiness').length > beforeRenderReviewCount,
    '生成後レビューから構成と演出を作り直した後の生成前確認'
  );
  assertScenario(requestCount(state, draft.id, 'build_clip_composition') > beforeBuildCount, '生成後レビューから複数箇所構成が作り直されていない');
  assertScenario(requestCount(state, draft.id, 'create_edit_plan') > beforeEditCount, '生成後レビューから演出作成が作り直されていない');
  assertScenario(requestCount(state, draft.id, 'apply_adjustment') > beforePatchCount, '生成後レビューから微調整が作り直されていない');
  assertScenario(latestControlReviewInState(state, draft.id, 'render_readiness')?.status === 'review_required', '生成後レビューから作り直した生成前確認が確認待ちになっていない');
}

async function scenarioGeneratedVideoThemeReselect(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-12: 生成後レビューから既存テーマ候補へ戻り、別テーマで再作成できる');
  const { draft, state: beforeState } = await createSampleGeneratedVideo(
    apiBaseUrl,
    runtimeDir,
    '生成後レビューからテーマを選び直す'
  );
  const beforeThemeRequestCount = requestCount(beforeState, draft.id, 'propose_clip_themes');
  const beforeThemeReviewCount = controlReviewsForDraft(beforeState, draft.id, 'theme_selection').length;
  const beforeRenderReviewCount = controlReviewsForDraft(beforeState, draft.id, 'render_readiness').length;

  await requestJson(apiPath(apiBaseUrl, `/request-drafts/${draft.id}/request-generated-video-changes`), {
    method: 'POST',
    body: JSON.stringify({
      reason: '生成後に見たらテーマから変えたくなった',
      scope: 'theme_selection'
    })
  });
  const reselectState = await pollState(
    apiBaseUrl,
    (item) => controlReviewsForDraft(item, draft.id, 'theme_selection').length > beforeThemeReviewCount,
    '生成後レビューから戻ったテーマ選択レビュー'
  );
  const latestThemeReview = latestControlReviewInState(reselectState, draft.id, 'theme_selection');
  assertScenario(latestThemeReview?.status === 'review_required', '生成後レビューから戻ったテーマ選択が確認待ちになっていない');
  assertScenario(
    requestCount(reselectState, draft.id, 'propose_clip_themes') === beforeThemeRequestCount,
    '生成後レビューからテーマを選び直すときにテーマ候補作成を再実行している'
  );

  const previousThemeAction = reselectState.humanReviewActions.find((action) =>
    action.requestDraftId === draft.id &&
    action.selectedOptionId
  );
  const nextThemeOption =
    latestThemeReview.options.find((option) => option.id !== previousThemeAction?.selectedOptionId) ??
    latestThemeReview.options[0];
  await approveThemeReview(apiBaseUrl, latestThemeReview, nextThemeOption.id, '生成後レビューから別テーマで作り直す');
  await runAgent(apiBaseUrl, runtimeDir, 3, true);
  const rebuiltState = await pollState(
    apiBaseUrl,
    (item) => controlReviewsForDraft(item, draft.id, 'render_readiness').length > beforeRenderReviewCount,
    '生成後レビューからテーマ再選択した後の生成前確認'
  );
  const latestRenderReview = latestControlReviewInState(rebuiltState, draft.id, 'render_readiness');
  const compositionRequest = latestSucceededAgentRequestInState(rebuiltState, draft.id, 'build_clip_composition');
  const composition = await artifactJsonForRequest(apiBaseUrl, rebuiltState, compositionRequest);
  assertScenario(composition.selectedThemeId === nextThemeOption.id, '生成後レビューから選び直したテーマIDで構成案が作られていない');
  assertScenario(latestRenderReview?.status === 'review_required', '生成後レビューからテーマ再選択した後の生成前確認が確認待ちになっていない');
  const completedState = await approveRenderReviewAndCompleteVideo(
    apiBaseUrl,
    runtimeDir,
    draft,
    latestRenderReview,
    '生成後レビューからテーマ再選択した編集案で確認用動画を作る'
  );
  const completedRender = latestSucceededAgentRequestInState(completedState, draft.id, 'render_video');
  assertScenario(completedRender?.dependsOnAgentRequestId === latestRenderReview.agentRequestId, '生成後レビューからテーマ再選択した動画生成が新しい生成前確認に紐づいていない');
}

async function scenarioThemeReselectActualRenderCompletes(apiBaseUrl, runtimeDir) {
  console.log('UC-P0-13: テーマ再選択後の実ランナー動画生成が完了する');
  const { draft, renderReview, state: beforeState } = await createSampleRenderReviewByRunner(
    apiBaseUrl,
    runtimeDir,
    'テーマ再選択後に実ランナーで確認用動画を作る'
  );
  const beforeThemeReviewCount = controlReviewsForDraft(beforeState, draft.id, 'theme_selection').length;
  const beforeRenderReviewCount = controlReviewsForDraft(beforeState, draft.id, 'render_readiness').length;

  await requestJson(apiPath(apiBaseUrl, `/control-reviews/${renderReview.id}/request-changes`), {
    method: 'POST',
    body: JSON.stringify({
      reason: '実ランナーで別テーマの確認用動画まで作れるか見る',
      scope: 'theme_reselect'
    })
  });

  const themeState = await pollState(
    apiBaseUrl,
    (item) => controlReviewsForDraft(item, draft.id, 'theme_selection').length > beforeThemeReviewCount,
    '実ランナー動画生成前のテーマ再選択レビュー'
  );
  const themeReview = latestControlReviewInState(themeState, draft.id, 'theme_selection');
  assertScenario(themeReview?.status === 'review_required', '実ランナー確認用のテーマ再選択が確認待ちになっていない');

  const nextThemeOption = themeReview.options[1] ?? themeReview.options[0];
  await approveThemeReview(apiBaseUrl, themeReview, nextThemeOption.id, '実ランナーで別テーマを作る');
  await runAgent(apiBaseUrl, runtimeDir, 3, true);

  const renderReadyState = await pollState(
    apiBaseUrl,
    (item) => controlReviewsForDraft(item, draft.id, 'render_readiness').length > beforeRenderReviewCount,
    '実ランナー動画生成前の新しい生成前確認'
  );
  const latestRenderReview = latestControlReviewInState(renderReadyState, draft.id, 'render_readiness');
  assertScenario(latestRenderReview?.status === 'review_required', '実ランナー動画生成前の生成前確認が確認待ちになっていない');

  const approval = await requestJson(apiPath(apiBaseUrl, `/control-reviews/${latestRenderReview.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({ reason: '実ランナーで確認用動画を作る' })
  });
  const renderRequest = latestAgentRequest(approval.state, draft.id, 'render_video');
  assertScenario(renderRequest?.status === 'queued', '実ランナー用の動画生成工程が作られていない');
  assertScenario(renderRequest.dependsOnAgentRequestId === latestRenderReview.agentRequestId, '実ランナー動画生成が新しい生成前確認に紐づいていない');

  await runAgent(apiBaseUrl, runtimeDir, 1, false);
  const renderedState = await pollState(
    apiBaseUrl,
    (item) => latestSucceededAgentRequestInState(item, draft.id, 'render_video')?.result?.outputType === 'OutputVideo',
    '実ランナーによる確認用動画の保存'
  );
  const completedRender = latestSucceededAgentRequestInState(renderedState, draft.id, 'render_video');
  const outputFileRef = fileRefForRequest(renderedState, completedRender);
  assertScenario(outputFileRef?.kind === 'output_video', '実ランナーが確認用動画のファイル参照を保存していない');
  assertScenario(
    await readFile(path.join(runtimeDir, 'artifacts', draft.id, 'output.mp4')).then((buffer) => buffer.length > 0),
    '実ランナーが確認用動画ファイルを書き出していない'
  );
}

async function main() {
  const runtimeDir = await mkdtemp(path.join(tmpdir(), 'zev2-agent-scenario-'));
  const port = await freePort();
  const apiBaseUrl = `http://127.0.0.1:${port}/api`;
  const backend = await startBackend(runtimeDir, port);

  try {
    await scenarioDraftApprovalGate(apiBaseUrl, runtimeDir);
    await scenarioSampleFlowAndThemeGate(apiBaseUrl, runtimeDir);
    const { draft, failedTheme } = await scenarioMissingGeminiFails(apiBaseUrl, runtimeDir);
    await scenarioRetryFailedAgentRequest(apiBaseUrl, runtimeDir, draft, failedTheme);
    await scenarioRealEditPlanRequiresGeminiOrVideo(apiBaseUrl, runtimeDir);
    await scenarioRenderApprovalCreatesVideo(apiBaseUrl, runtimeDir);
    await scenarioRenderReadinessEditRerun(apiBaseUrl, runtimeDir);
    await scenarioRenderReadinessThemeReselect(apiBaseUrl, runtimeDir);
    await scenarioGeneratedVideoEditRerun(apiBaseUrl, runtimeDir);
    await scenarioGeneratedVideoThemeReselect(apiBaseUrl, runtimeDir);
    await scenarioThemeReselectActualRenderCompletes(apiBaseUrl, runtimeDir);
    console.log(`シナリオテスト成功: ${runtimeDir}`);
  } finally {
    await backend.stop();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
