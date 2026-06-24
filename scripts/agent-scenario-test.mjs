#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixedSourceUri = path.join(
  workspaceRoot,
  'runtime',
  'artifacts',
  'draft_w4Lp9IJC6pQl3FsRfFL9t',
  'source-video.mp4'
);
const workflowTypes = [
  'prepare_video',
  'run_stt',
  'propose_clip_themes',
  'build_clip_composition',
  'create_edit_plan',
  'apply_adjustment',
  'render_video'
];

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

function runProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ...(options.env ?? {})
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const timeoutMs = options.timeoutMs ?? 120000;
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
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${result.output}`));
        return;
      }

      resolve(result);
    });
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

async function startBackend(runtimeDir, port) {
  const output = [];
  const child = spawn('node', ['backend/dist/index.js'], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
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
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const health = await requestJson(healthUrl);
      if (health.status === 'ok') {
        return {
          stop: async () => {
            child.kill('SIGTERM');
            await wait(500);
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }
        };
      }
    } catch {
      await wait(250);
    }
  }

  child.kill('SIGTERM');
  throw new Error(`backendが起動しませんでした\n${output.join('')}`);
}

async function runAgent(apiBaseUrl, runtimeDir) {
  await runProcess('node', ['runner/dist/index.js', '--max-steps=7'], {
    env: {
      GEMINI_API_KEY: '',
      GOOGLE_API_KEY: '',
      GOOGLE_CLOUD_PROJECT: '',
      PROJECT_ID: '',
      GCP_PROJECT_ID: '',
      ZEV2_RUNTIME_DIR: runtimeDir,
      ZEV2_API_BASE_URL: apiBaseUrl,
      ZEV2_WORKSPACE_ROOT: workspaceRoot,
      ZEV2_USE_FIXED_AGENT_ARTIFACTS: '1'
    },
    timeoutMs: 180000
  });
}

async function runAgentWithoutFixedDataExpectFailure(apiBaseUrl, runtimeDir) {
  let failed = false;
  try {
    await runProcess('node', ['runner/dist/index.js', '--max-steps=2'], {
      env: {
        GEMINI_API_KEY: '',
        GOOGLE_API_KEY: '',
        GOOGLE_CLOUD_PROJECT: '',
        PROJECT_ID: '',
        GCP_PROJECT_ID: '',
        ZEV2_STT_SERVER_URL: '',
        ZEV_STT_SERVER_URL: '',
        ZEV2_RUNTIME_DIR: runtimeDir,
        ZEV2_API_BASE_URL: apiBaseUrl,
        ZEV2_WORKSPACE_ROOT: workspaceRoot
      },
      timeoutMs: 120000
    });
  } catch {
    failed = true;
  }

  assertScenario(failed, '固定確認フラグなしでSTT接続先がないのにrunnerが成功している');
}

function apiPath(apiBaseUrl, routePath) {
  return `${apiBaseUrl}${routePath}`;
}

async function assertOutputHasAudibleAudio(outputPath) {
  const audioProbe = await runProcess('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'a:0',
    '-show_entries',
    'stream=index',
    '-of',
    'csv=p=0',
    outputPath
  ]);
  assertScenario(audioProbe.output.trim().length > 0, '出力動画に音声トラックがない');

  const volume = await runProcess('ffmpeg', [
    '-hide_banner',
    '-nostats',
    '-i',
    outputPath,
    '-map',
    '0:a:0',
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-'
  ]);
  const sampleCounts = [...volume.output.matchAll(/n_samples:\s*(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
  const sampleCount = sampleCounts.length > 0 ? Math.max(...sampleCounts) : 0;
  const maxVolumeMatch = volume.output.match(/max_volume:\s*([-\d.]+|-\s*inf)\s*dB/i);
  const maxVolume = maxVolumeMatch?.[1]?.replace(/\s+/g, '') ?? '';

  assertScenario(sampleCount > 0, '出力動画の音声サンプルがない');
  assertScenario(maxVolume && maxVolume !== '-inf', '出力動画の音声が無音になっている');
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function artifactPathByUri(runtimeDir, uri) {
  const prefix = '/api/artifacts/';
  assertScenario(uri.startsWith(prefix), `成果物URIが不正です: ${uri}`);
  return path.join(runtimeDir, 'artifacts', ...uri.slice(prefix.length).split('/').map(decodeURIComponent));
}

async function readRequestArtifact(state, runtimeDir, requestDraftId, requestType) {
  const request = agentRequestsForDraft(state, requestDraftId).find((item) => item.type === requestType);
  const fileRef = state.fileRefs.find((item) => item.id === request?.result?.fileRefId);
  assertScenario(fileRef?.uri, `${requestType}: 成果物参照が保存されていない`);
  return readJsonFile(artifactPathByUri(runtimeDir, fileRef.uri));
}

function agentRequestsForDraft(state, requestDraftId) {
  return state.agentRequests
    .filter((request) => request.requestDraftId === requestDraftId)
    .sort((left, right) => workflowTypes.indexOf(left.type) - workflowTypes.indexOf(right.type));
}

async function assertCopiedRestart(apiBaseUrl, sourceDraftId, scope, expectedStartType) {
  const response = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${sourceDraftId}/request-generated-video-changes`), {
    method: 'POST',
    body: JSON.stringify({
      reason: `${scope}のコピー再開テスト`,
      scope
    })
  });
  const copiedDraft = response.draft;
  assertScenario(copiedDraft.id !== sourceDraftId, `${scope}: 編集コピーが新しい依頼になっていない`);

  const sourceRequests = agentRequestsForDraft(response.state, sourceDraftId);
  assertScenario(sourceRequests.length === 7, `${scope}: 元編集の工程数が変わっている`);
  assertScenario(sourceRequests.every((request) => request.status === 'succeeded'), `${scope}: 元編集の成功状態が壊れている`);

  const copiedRequests = agentRequestsForDraft(response.state, copiedDraft.id);
  const expectedStartIndex = workflowTypes.indexOf(expectedStartType);
  assertScenario(copiedRequests.length === 7, `${scope}: コピー後の工程数が7件ではない`);
  assertScenario(expectedStartIndex >= 0, `${scope}: テストの再開工程が不正です`);

  const copiedBeforeRestart = copiedRequests.slice(0, expectedStartIndex);
  const queuedAfterRestart = copiedRequests.slice(expectedStartIndex);
  assertScenario(
    copiedBeforeRestart.every((request) => request.status === 'succeeded'),
    `${scope}: 再開地点より前の工程が完了済みとしてコピーされていない`
  );
  assertScenario(
    queuedAfterRestart.every((request) => request.status === 'queued'),
    `${scope}: 再開地点以降が未作成状態に戻っていない`
  );
  assertScenario(
    queuedAfterRestart[0]?.type === expectedStartType,
    `${scope}: 期待した工程から再開していない`
  );

  return copiedDraft;
}

async function assertGeneratedDraftCompleted(apiBaseUrl, runtimeDir, draftId, label) {
  const state = await requestJson(apiPath(apiBaseUrl, '/state'));
  const finalRequests = agentRequestsForDraft(state, draftId);
  assertScenario(finalRequests.length === 7, `${label}: 実行後の工程数が7件ではない`);
  assertScenario(finalRequests.every((request) => request.status === 'succeeded'), `${label}: 成功していない工程がある`);

  const outputRequest = finalRequests.find((request) => request.type === 'render_video');
  const outputFileRef = state.fileRefs.find((fileRef) => fileRef.id === outputRequest?.result?.fileRefId);
  assertScenario(outputRequest?.result?.outputType === 'OutputVideo', `${label}: 動画生成の成果物種別がOutputVideoではない`);
  assertScenario(outputFileRef?.kind === 'output_video', `${label}: 出力動画のファイル参照が保存されていない`);

  const outputPath = path.join(runtimeDir, 'artifacts', draftId, 'output.mp4');
  const outputBuffer = await readFile(outputPath);
  assertScenario(outputBuffer.length > 0, `${label}: 出力動画ファイルが空です`);
  await assertOutputHasAudibleAudio(outputPath);

  const transcript = await readRequestArtifact(state, runtimeDir, draftId, 'run_stt');
  const themes = await readRequestArtifact(state, runtimeDir, draftId, 'propose_clip_themes');
  const composition = await readRequestArtifact(state, runtimeDir, draftId, 'build_clip_composition');
  const editPlan = await readRequestArtifact(state, runtimeDir, draftId, 'create_edit_plan');
  const expectedThemeId = themes.themes[0]?.id;
  assertScenario(
    transcript.mode === 'zev-sample-stt',
    `${label}: 固定確認の文字起こしが通常STT結果として保存されている`
  );
  assertScenario(
    themes.mode === 'sample-theme-options',
    `${label}: 固定確認のテーマ候補がGemini実行済みとして保存されている`
  );
  assertScenario(expectedThemeId, `${label}: テーマ候補が保存されていない`);
  assertScenario(
    composition.selectedThemeId === expectedThemeId,
    `${label}: 構成案が前工程のテーマ候補を反映していない`
  );
  assertScenario(
    editPlan.selectedThemeId === composition.selectedThemeId,
    `${label}: 編集案が構成案のテーマを反映していない`
  );
  assertScenario(
    editPlan.renderSegments.length === composition.parts.length,
    `${label}: 編集案の動画断片数が構成案と一致していない`
  );
  assertScenario(
    editPlan.mode === 'sample-edit-plan',
    `${label}: Gemini APIを使わない固定確認でGemini実行済みの編集案として保存されている`
  );
}

async function scenarioAutomaticVideoCreation(apiBaseUrl, runtimeDir) {
  const draftInput = {
    purpose: '固定STTデータからショート動画を作成する',
    sourceUri: fixedSourceUri,
    durationLabel: '60秒以内',
    themeCountLabel: '3テーマ',
    geminiModelName: 'gemini-3.5-flash',
    preset: 'shorts_default'
  };
  const created = await requestJson(apiPath(apiBaseUrl, '/request-drafts'), {
    method: 'POST',
    body: JSON.stringify(draftInput)
  });
  const draft = created.draft;

  assertScenario(draft.policy.humanApprovalRequiredBeforeRender === false, '新規依頼が承認なし生成の方針になっていない');
  assertScenario(draft.steps.length === 7, '新規依頼に7工程が入っていない');
  assertScenario(draft.steps.every((step) => step.requiresHumanApproval === false), '承認必須の工程が残っている');
  assertScenario(draft.steps.some((step) => step.type === 'render_video'), '動画生成工程が依頼に入っていない');

  const approved = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${draft.id}/approve`), {
    method: 'POST'
  });
  const queuedRequests = approved.state.agentRequests.filter((request) => request.requestDraftId === draft.id);
  assertScenario(queuedRequests.length === 7, '作成開始後に7工程がキューへ入っていない');
  assertScenario(queuedRequests.some((request) => request.type === 'render_video'), '動画生成工程がキューへ入っていない');

  await runAgent(apiBaseUrl, runtimeDir);

  const state = await requestJson(apiPath(apiBaseUrl, '/state'));
  const finalRequests = state.agentRequests.filter((request) => request.requestDraftId === draft.id);
  assertScenario(finalRequests.length === 7, '実行後の工程数が7件ではない');
  assertScenario(finalRequests.every((request) => request.status === 'succeeded'), '成功していない工程がある');
  assertScenario(state.controlReviewItems.length === 0, '確認待ちが作られている');
  assertScenario(state.decisionLogs.length === 0, '承認判断ログが作られている');

  const outputRequest = finalRequests.find((request) => request.type === 'render_video');
  const outputFileRef = state.fileRefs.find((fileRef) => fileRef.id === outputRequest?.result?.fileRefId);
  assertScenario(outputRequest?.result?.outputType === 'OutputVideo', '動画生成の成果物種別がOutputVideoではない');
  assertScenario(outputFileRef?.kind === 'output_video', '出力動画のファイル参照が保存されていない');

  const outputPath = path.join(runtimeDir, 'artifacts', draft.id, 'output.mp4');
  const outputBuffer = await readFile(outputPath);
  assertScenario(outputBuffer.length > 0, '出力動画ファイルが空です');
  await assertOutputHasAudibleAudio(outputPath);

  const editPlanRestartDraft = await assertCopiedRestart(apiBaseUrl, draft.id, 'edit_plan', 'create_edit_plan');
  await runAgent(apiBaseUrl, runtimeDir);
  await assertGeneratedDraftCompleted(apiBaseUrl, runtimeDir, editPlanRestartDraft.id, '演出作成前からのコピー再開');

  const themeRestartDraft = await assertCopiedRestart(apiBaseUrl, draft.id, 'theme_selection', 'build_clip_composition');
  await runAgent(apiBaseUrl, runtimeDir);
  await assertGeneratedDraftCompleted(apiBaseUrl, runtimeDir, themeRestartDraft.id, 'テーマ選択後からのコピー再開');

  const adjustmentRestartDraft = await assertCopiedRestart(apiBaseUrl, draft.id, 'adjustment', 'apply_adjustment');
  const nextAfterMultipleRestarts = await requestJson(apiPath(apiBaseUrl, '/agent-requests/next'));
  assertScenario(
    nextAfterMultipleRestarts.request?.requestDraftId === adjustmentRestartDraft.id &&
      nextAfterMultipleRestarts.request?.type === 'apply_adjustment',
    '複数の作り直し候補があるとき、最後に作った編集コピーが次の実行対象になっていない'
  );

  const noFixedDraftInput = {
    purpose: '固定データなしではSTT接続が必要になることを確認する',
    sourceUri: fixedSourceUri,
    durationLabel: '60秒以内',
    themeCountLabel: '3テーマ',
    geminiModelName: 'gemini-3.5-flash',
    preset: 'shorts_default'
  };
  const noFixedCreated = await requestJson(apiPath(apiBaseUrl, '/request-drafts'), {
    method: 'POST',
    body: JSON.stringify(noFixedDraftInput)
  });
  await requestJson(apiPath(apiBaseUrl, `/request-drafts/${noFixedCreated.draft.id}/approve`), {
    method: 'POST'
  });
  await runAgentWithoutFixedDataExpectFailure(apiBaseUrl, runtimeDir);
  const noFixedState = await requestJson(apiPath(apiBaseUrl, '/state'));
  const noFixedRequests = agentRequestsForDraft(noFixedState, noFixedCreated.draft.id);
  const noFixedTranscriptRequest = noFixedRequests.find((request) => request.type === 'run_stt');
  assertScenario(
    noFixedTranscriptRequest?.status === 'failed',
    '固定確認フラグなしでSTT接続先がないとき、文字起こし工程が失敗になっていない'
  );
  assertScenario(
    noFixedTranscriptRequest.errorMessage?.includes('ローカルSTTサーバ'),
    '固定確認フラグなしのSTT失敗理由がユーザーに分かる文になっていない'
  );
}

async function main() {
  await runProcess('pnpm', ['--filter', 'backend', 'build'], { timeoutMs: 120000 });
  await runProcess('pnpm', ['--filter', '@zev2/agent-runner', 'build'], { timeoutMs: 120000 });

  const runtimeDir = await mkdtemp(path.join(tmpdir(), 'zev2-agent-scenario-'));
  const port = await freePort();
  const apiBaseUrl = `http://127.0.0.1:${port}/api`;
  const backend = await startBackend(runtimeDir, port);

  try {
    await scenarioAutomaticVideoCreation(apiBaseUrl, runtimeDir);
    console.log(`シナリオテスト成功: ${runtimeDir}`);
  } finally {
    await backend.stop();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
