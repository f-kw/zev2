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
      ZEV2_STT_RUNTIME_MODE: 'fixed',
      ZEV2_CONTENT_DISCOVERY_MODE: 'fixed',
      ZEV2_EDIT_PLAN_MODE: 'fixed'
    },
    timeoutMs: 180000
  });
}

async function approveRequiredReview(apiBaseUrl, draftId) {
  const state = await requestJson(apiPath(apiBaseUrl, '/state'));
  const review = state.controlReviewItems
    .filter((item) => item.requestDraftId === draftId && item.status === 'review_required')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  assertScenario(review, `${draftId}: 承認すべき確認工程が見つからない`);

  const selectedOptionId = review.kind === 'theme_selection'
    ? review.options[0]?.id
    : undefined;
  assertScenario(
    review.kind !== 'theme_selection' || selectedOptionId,
    `${draftId}: 内容選択の選択肢がない`
  );

  const approved = await requestJson(apiPath(apiBaseUrl, `/control-reviews/${review.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({
      reason: `${review.title}をシナリオテストで承認する`,
      ...(selectedOptionId ? { selectedOptionId } : {})
    })
  });

  return approved.state;
}

async function runAgentApprovingReviews(apiBaseUrl, runtimeDir, draftId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await runAgent(apiBaseUrl, runtimeDir);
    const state = await requestJson(apiPath(apiBaseUrl, '/state'));
    const requests = agentRequestsForDraft(state, draftId);
    const renderRequest = requests.find((request) => request.type === 'render_video');
    if (renderRequest?.status === 'succeeded') {
      return state;
    }

    await approveRequiredReview(apiBaseUrl, draftId);
  }

  throw new Error(`${draftId}: 確認工程を承認しても動画生成まで到達しない`);
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

async function assertRuntimeConfig(apiBaseUrl) {
  const runtimeConfig = await requestJson(apiPath(apiBaseUrl, '/runtime-config'));
  assertScenario(runtimeConfig.stt?.mode === 'fixed', '現在の設定が固定データ確認になっていない');
  assertScenario(runtimeConfig.contentDiscovery?.mode === 'fixed', '内容候補整理が固定データ確認になっていない');
  assertScenario(runtimeConfig.editPlan?.mode === 'fixed', '演出作成が固定データ確認になっていない');
  assertScenario(runtimeConfig.adjustment?.mode === 'fixed', '微調整が固定処理として明示されていない');
  assertScenario(
    runtimeConfig.source?.defaultUri === 'runtime/artifacts/draft_w4Lp9IJC6pQl3FsRfFL9t/source-video.mp4',
    '設定ファイルの入力動画参照がUIへ渡せる形になっていない'
  );
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

function uniqueSpeechIds(speechIds) {
  return [...new Set(speechIds)];
}

function sameSpeechIds(leftSpeechIds, rightSpeechIds) {
  const left = uniqueSpeechIds(leftSpeechIds);
  const right = uniqueSpeechIds(rightSpeechIds);
  return left.length === right.length && left.every((speechId, index) => speechId === right[index]);
}

function assertTelopsDoNotCoverWholeSegments(editPlan, label) {
  for (const [telopIndex, telop] of editPlan.telopPlan.entries()) {
    const coversWholeSegment = editPlan.renderSegments.some((segment) => (
      sameSpeechIds(telop.sourceSpeechIds, segment.speechIds)
    ));
    assertScenario(
      !coversWholeSegment,
      `${label}: テロップ${telopIndex + 1}が動画断片全体を1枚で表示している`
    );
  }
}

function assertFixedEditPlanUsesPreparedScreenLayout(editPlan, label) {
  for (const [segmentIndex, segment] of editPlan.renderSegments.entries()) {
    assertScenario(
      segment.screenLayout?.screenLayoutId === 'screen_speaker',
      `${label}: 動画断片${segmentIndex + 1}が固定確認用の画面と話者の表示枠を使っていない`
    );
    assertScenario(
      segment.screenLayout?.selectedCandidateId !== 'speaker_only_full',
      `${label}: 動画断片${segmentIndex + 1}が元動画全体を縦長へ中央cropする表示枠に戻っている`
    );
    assertScenario(
      Array.isArray(segment.screenLayout?.viewports?.screen) && Array.isArray(segment.screenLayout?.viewports?.speaker),
      `${label}: 動画断片${segmentIndex + 1}に画面枠と話者枠の切り出し範囲が保存されていない`
    );
  }
}

async function assertWorkflowStepManifests(runtimeDir, draftId, label, expectedRequestTypes = workflowTypes) {
  const artifactDir = path.join(runtimeDir, 'artifacts', draftId);
  const expectedInputs = {
    prepare_video: [],
    run_stt: ['prepare_video'],
    propose_clip_themes: ['run_stt'],
    build_clip_composition: ['run_stt', 'propose_clip_themes'],
    create_edit_plan: ['build_clip_composition', 'prepare_video'],
    apply_adjustment: ['create_edit_plan'],
    render_video: ['create_edit_plan', 'prepare_video']
  };
  const expectedOutputs = {
    prepare_video: 'source_video',
    run_stt: 'transcript_json',
    propose_clip_themes: 'theme_json',
    build_clip_composition: 'composition_json',
    create_edit_plan: 'edit_plan_json',
    apply_adjustment: 'patch_json',
    render_video: 'output_video'
  };

  for (const requestType of expectedRequestTypes) {
    const manifest = await readJsonFile(path.join(artifactDir, `${requestType}-manifest.json`));
    assertScenario(manifest.kind === 'workflow_step_manifest', `${label}: ${requestType} のmanifest種別が不正です`);
    assertScenario(manifest.requestDraftId === draftId, `${label}: ${requestType} のmanifestが別の編集コピーを指している`);
    assertScenario(manifest.stepType === requestType, `${label}: ${requestType} のmanifest工程が不正です`);
    assertScenario(Array.isArray(manifest.inputs), `${label}: ${requestType} のmanifest入力が配列ではない`);
    assertScenario(Array.isArray(manifest.outputs), `${label}: ${requestType} のmanifest出力が配列ではない`);
    const inputTypes = manifest.inputs.map((input) => input.dependencyType).sort();
    assertScenario(
      JSON.stringify(inputTypes) === JSON.stringify([...expectedInputs[requestType]].sort()),
      `${label}: ${requestType} のmanifest入力工程が想定と違う`
    );
    assertScenario(
      manifest.outputs.some((output) => output.kind === expectedOutputs[requestType] && output.uri),
      `${label}: ${requestType} のmanifest出力が保存されていない`
    );
  }
}

function agentRequestsForDraft(state, requestDraftId) {
  return state.agentRequests
    .filter((request) => request.requestDraftId === requestDraftId)
    .sort((left, right) => workflowTypes.indexOf(left.type) - workflowTypes.indexOf(right.type));
}

function assertApprovedReviewKinds(state, requestDraftId, kinds, label) {
  for (const kind of kinds) {
    const review = state.controlReviewItems
      .filter((item) => item.requestDraftId === requestDraftId && item.kind === kind)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    assertScenario(review?.status === 'approved', `${label}: ${kind} の人間確認が承認済みになっていない`);
  }
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

async function assertGeneratedDraftCompleted(apiBaseUrl, runtimeDir, draftId, label, expectedManifestTypes = workflowTypes) {
  const state = await requestJson(apiPath(apiBaseUrl, '/state'));
  const finalRequests = agentRequestsForDraft(state, draftId);
  assertScenario(finalRequests.length === 7, `${label}: 実行後の工程数が7件ではない`);
  assertScenario(finalRequests.every((request) => request.status === 'succeeded'), `${label}: 成功していない工程がある`);
  assertApprovedReviewKinds(state, draftId, ['theme_selection', 'material_confirmation', 'render_readiness'], label);

  const outputRequest = finalRequests.find((request) => request.type === 'render_video');
  const outputFileRef = state.fileRefs.find((fileRef) => fileRef.id === outputRequest?.result?.fileRefId);
  assertScenario(outputRequest?.result?.outputType === 'OutputVideo', `${label}: 動画生成の成果物種別がOutputVideoではない`);
  assertScenario(outputFileRef?.kind === 'output_video', `${label}: 出力動画のファイル参照が保存されていない`);

  const outputPath = path.join(runtimeDir, 'artifacts', draftId, 'output.mp4');
  const outputBuffer = await readFile(outputPath);
  assertScenario(outputBuffer.length > 0, `${label}: 出力動画ファイルが空です`);
  await assertOutputHasAudibleAudio(outputPath);
  await assertWorkflowStepManifests(runtimeDir, draftId, label, expectedManifestTypes);

  const transcript = await readRequestArtifact(state, runtimeDir, draftId, 'run_stt');
  const themes = await readRequestArtifact(state, runtimeDir, draftId, 'propose_clip_themes');
  const composition = await readRequestArtifact(state, runtimeDir, draftId, 'build_clip_composition');
  const editPlan = await readRequestArtifact(state, runtimeDir, draftId, 'create_edit_plan');
  const adjustment = await readRequestArtifact(state, runtimeDir, draftId, 'apply_adjustment');
  const expectedThemeId = themes.themes[0]?.id;
  assertScenario(
    transcript.mode === 'zev-sample-stt',
    `${label}: 固定確認の文字起こしが通常STT結果として保存されている`
  );
  assertScenario(
    themes.mode === 'sample-theme-options',
    `${label}: 固定確認の内容候補が外部AI実行済みとして保存されている`
  );
  assertScenario(expectedThemeId, `${label}: 内容候補が保存されていない`);
  assertScenario(
    composition.selectedThemeId === expectedThemeId,
    `${label}: 使用素材構成案が前工程の内容候補を反映していない`
  );
  assertScenario(
    editPlan.selectedThemeId === composition.selectedThemeId,
    `${label}: 編集案が使用素材構成案の選択内容を反映していない`
  );
  assertScenario(
    editPlan.renderSegments.length === composition.parts.length,
    `${label}: 編集案の動画断片数が使用素材構成案と一致していない`
  );
  assertTelopsDoNotCoverWholeSegments(editPlan, label);
  assertFixedEditPlanUsesPreparedScreenLayout(editPlan, label);
  assertScenario(
    editPlan.mode === 'sample-edit-plan',
    `${label}: Gemini APIを使わない固定確認でGemini実行済みの編集案として保存されている`
  );
  assertScenario(
    adjustment.mode === 'fixed-adjustment',
    `${label}: 微調整が固定処理として保存されていない`
  );
}

async function scenarioAutomaticVideoCreation(apiBaseUrl, runtimeDir) {
  const draftInput = {
    purpose: '固定STTデータからショート動画を作成する',
    sourceUri: fixedSourceUri,
    durationLabel: '60秒以内',
    themeCountLabel: '3候補',
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

  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, draft.id);

  const state = await requestJson(apiPath(apiBaseUrl, '/state'));
  const finalRequests = state.agentRequests.filter((request) => request.requestDraftId === draft.id);
  assertScenario(finalRequests.length === 7, '実行後の工程数が7件ではない');
  assertScenario(finalRequests.every((request) => request.status === 'succeeded'), '成功していない工程がある');
  assertApprovedReviewKinds(state, draft.id, ['theme_selection', 'material_confirmation', 'render_readiness'], '初回生成');

  const outputRequest = finalRequests.find((request) => request.type === 'render_video');
  const outputFileRef = state.fileRefs.find((fileRef) => fileRef.id === outputRequest?.result?.fileRefId);
  assertScenario(outputRequest?.result?.outputType === 'OutputVideo', '動画生成の成果物種別がOutputVideoではない');
  assertScenario(outputFileRef?.kind === 'output_video', '出力動画のファイル参照が保存されていない');

  const outputPath = path.join(runtimeDir, 'artifacts', draft.id, 'output.mp4');
  const outputBuffer = await readFile(outputPath);
  assertScenario(outputBuffer.length > 0, '出力動画ファイルが空です');
  await assertOutputHasAudibleAudio(outputPath);
  await assertWorkflowStepManifests(runtimeDir, draft.id, '初回生成');
  const editPlan = await readRequestArtifact(state, runtimeDir, draft.id, 'create_edit_plan');
  assertTelopsDoNotCoverWholeSegments(editPlan, '初回生成');
  assertFixedEditPlanUsesPreparedScreenLayout(editPlan, '初回生成');

  const editPlanRestartDraft = await assertCopiedRestart(apiBaseUrl, draft.id, 'edit_plan', 'create_edit_plan');
  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, editPlanRestartDraft.id);
  await assertGeneratedDraftCompleted(
    apiBaseUrl,
    runtimeDir,
    editPlanRestartDraft.id,
    '演出作成前からのコピー再開',
    workflowTypes.slice(workflowTypes.indexOf('create_edit_plan'))
  );

  const themeRestartDraft = await assertCopiedRestart(apiBaseUrl, draft.id, 'theme_selection', 'build_clip_composition');
  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, themeRestartDraft.id);
  await assertGeneratedDraftCompleted(
    apiBaseUrl,
    runtimeDir,
    themeRestartDraft.id,
    '内容選択後からのコピー再開',
    workflowTypes.slice(workflowTypes.indexOf('build_clip_composition'))
  );

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
    themeCountLabel: '3候補',
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
    await assertRuntimeConfig(apiBaseUrl);
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
