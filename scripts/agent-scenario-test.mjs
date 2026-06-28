#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
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
const fixedEditPlanFixturePath = path.join(workspaceRoot, 'runner', 'fixtures', 'fixed-edit-plans.json');
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

async function expectRequestJsonFailure(url, init = {}) {
  try {
    await requestJson(url, init);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  throw new Error(`${init.method ?? 'GET'} ${url} が失敗すべき場面で成功している`);
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
  const review = latestReview(state, draftId, undefined, 'review_required');
  assertScenario(review, `${draftId}: 承認すべき確認工程が見つからない`);

  const selectedOptionId = review.kind === 'theme_selection'
    ? review.options[0]?.id
    : undefined;
  assertScenario(
    review.kind !== 'theme_selection' || selectedOptionId,
    `${draftId}: テーマ選択で選べるテーマがない`
  );
  if (review.kind === 'theme_selection') {
    assertScenario(
      review.options.every((option) => !option.summary.includes('代表発話:')),
      `${draftId}: テーマ選択に代表発話が表示されている`
    );
    assertScenario(
      review.options.every((option) => option.summary.includes('判断材料:')),
      `${draftId}: テーマ選択に判断材料が表示されていない`
    );
  }

  const approved = await requestJson(apiPath(apiBaseUrl, `/control-reviews/${review.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({
      reason: `${review.title}をシナリオテストで承認する`,
      ...(selectedOptionId ? { selectedOptionId } : {})
    })
  });

  return approved.state;
}

function latestReview(state, draftId, kind, status) {
  return state.controlReviewItems
    .filter((item) =>
      item.requestDraftId === draftId &&
      (!kind || item.kind === kind) &&
      (!status || item.status === status)
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

async function createApprovedScenarioDraft(apiBaseUrl, purpose) {
  const created = await requestJson(apiPath(apiBaseUrl, '/request-drafts'), {
    method: 'POST',
    body: JSON.stringify({
      purpose,
      sourceUri: fixedSourceUri,
      durationLabel: '60秒以内',
      themeCountLabel: '3候補',
      geminiModelName: 'gemini-3.5-flash',
      preset: 'shorts_default'
    })
  });

  await requestJson(apiPath(apiBaseUrl, `/request-drafts/${created.draft.id}/approve`), {
    method: 'POST'
  });

  return created.draft;
}

async function runDraftUntilReview(apiBaseUrl, runtimeDir, draftId, expectedKind) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await runAgent(apiBaseUrl, runtimeDir);
    const state = await requestJson(apiPath(apiBaseUrl, '/state'));
    const expectedReview = latestReview(state, draftId, expectedKind, 'review_required');
    if (expectedReview) {
      return { state, review: expectedReview };
    }

    const nextReview = latestReview(state, draftId, undefined, 'review_required');
    if (nextReview) {
      await approveRequiredReview(apiBaseUrl, draftId);
      continue;
    }
  }

  throw new Error(`${draftId}: ${expectedKind} の確認工程まで到達しない`);
}

async function runAgentApprovingReviews(apiBaseUrl, runtimeDir, draftId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await runAgent(apiBaseUrl, runtimeDir);
    const state = await requestJson(apiPath(apiBaseUrl, '/state'));
    const requests = agentRequestsForDraft(state, draftId);
    const renderSucceeded = requests.some((request) => request.type === 'render_video' && request.status === 'succeeded');
    if (renderSucceeded) {
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
  assertScenario(runtimeConfig.contentDiscovery?.mode === 'fixed', 'テーマ作成が固定データ確認になっていない');
  assertScenario(runtimeConfig.editPlan?.mode === 'fixed', '演出作成が固定データ確認になっていない');
  assertScenario(runtimeConfig.adjustment?.mode === 'fixed', '微調整が固定処理として明示されていない');
  assertScenario(runtimeConfig.videoOutput?.encoder === 'libx264', '確認用動画の標準エンコーダーがlibx264になっていない');
  assertScenario(Array.isArray(runtimeConfig.videoOutput?.extraArgs), '確認用動画の追加ffmpeg引数が配列として渡っていない');
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

async function assertOutputVideoUsesEncoder(outputPath, encoderName) {
  const probe = await runProcess('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream_tags=encoder',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    outputPath
  ]);

  assertScenario(
    probe.output.includes(encoderName),
    `確認用動画が設定したエンコーダーで作られていない: ${probe.output.trim()}`
  );
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
  const request = agentRequestsForDraft(state, requestDraftId)
    .filter((item) => item.type === requestType && item.status === 'succeeded')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
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

function expandFixedTelopSpeechIds(telop) {
  if (Array.isArray(telop.sourceSpeechIds)) {
    return uniqueSpeechIds(telop.sourceSpeechIds);
  }

  if (Array.isArray(telop.sourceSpeechIdRange) && telop.sourceSpeechIdRange.length === 2) {
    const [start, end] = telop.sourceSpeechIdRange;
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  return [];
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

async function assertRenderedTelopsStayWithinLineCheckpoint(runtimeDir, draftId, label) {
  const renderPlan = await readJsonFile(path.join(runtimeDir, 'artifacts', draftId, 'render-plan.json'));
  assertScenario(
    Array.isArray(renderPlan.telopOverlayImages) && renderPlan.telopOverlayImages.length > 0,
    `${label}: テロップ画像の生成計画が保存されていない`
  );

  for (const [index, telop] of renderPlan.telopOverlayImages.entries()) {
    assertScenario(
      Number.isInteger(telop.lineCount) && telop.lineCount > 0,
      `${label}: テロップ${index + 1}の表示行数が保存されていない`
    );
    assertScenario(
      Number.isInteger(telop.maxLines) && telop.maxLines > 0,
      `${label}: テロップ${index + 1}の行数チェック上限が保存されていない`
    );
    assertScenario(
      telop.lineCount <= telop.maxLines,
      `${label}: テロップ${index + 1}が${telop.lineCount}行で、上限${telop.maxLines}行を超えている`
    );
  }
}

async function assertFixedEditPlanUsesFixtureValues(editPlan, label) {
  const fixture = await readJsonFile(fixedEditPlanFixturePath);
  const fixedTheme = fixture.themes?.[editPlan.selectedThemeId];
  assertScenario(fixedTheme, `${label}: 固定演出案に選択テーマの固定値がない`);
  assertScenario(
    editPlan.title === fixedTheme.title,
    `${label}: 編集案タイトルが固定演出案の値ではない`
  );
  assertScenario(
    editPlan.hookText === fixedTheme.hookText,
    `${label}: 冒頭文が固定演出案の値ではない`
  );
  assertScenario(
    editPlan.renderSegments.length === fixedTheme.renderSegments.length,
    `${label}: 動画断片の表示枠が固定演出案の件数と一致していない`
  );
  for (const [index, fixedSegment] of fixedTheme.renderSegments.entries()) {
    const segment = editPlan.renderSegments[index];
    assertScenario(
      segment.caption === fixedSegment.caption,
      `${label}: 動画断片${index + 1}の短文が固定演出案の値ではない`
    );
    assertScenario(
      segment.screenLayout?.selectedCandidateId === fixedSegment.selectedCandidateId,
      `${label}: 動画断片${index + 1}の表示候補が固定演出案の値ではない`
    );
  }

  assertScenario(
    editPlan.telopPlan.length === fixedTheme.telopPlan.length,
    `${label}: テロップ案が固定演出案の件数と一致していない`
  );
  for (const [index, fixedTelop] of fixedTheme.telopPlan.entries()) {
    const telop = editPlan.telopPlan[index];
    assertScenario(
      telop.text === fixedTelop.text,
      `${label}: テロップ${index + 1}の表示文が固定演出案の値ではない`
    );
    assertScenario(
      sameSpeechIds(telop.sourceSpeechIds, expandFixedTelopSpeechIds(fixedTelop)),
      `${label}: テロップ${index + 1}の発話IDが固定演出案の値ではない`
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

function assertMaterialReviewText(review, label) {
  assertScenario(
    review.title === '切り口と編集元場面の確認',
    `${label}: 編集元場面確認の見出しが人間向けではない`
  );
  assertScenario(
    review.humanQuestion === 'この切り口と編集元場面で進めますか',
    `${label}: 編集元場面確認の質問文が人間向けではない`
  );
  for (const option of review.options) {
    assertScenario(
      /^編集元場面 \d+$/.test(option.title),
      `${label}: 編集元場面確認の候補名が構成ラベルのまま表示されている`
    );
    assertScenario(
      !['導入', '展開', '結論'].includes(option.title),
      `${label}: AI内部向けの構成ラベルが候補名に出ている`
    );
  }
}

async function assertCopiedRestart(apiBaseUrl, runtimeDir, sourceDraftId, scope, expectedStartType) {
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
  for (const request of copiedBeforeRestart) {
    const fileRef = response.state.fileRefs.find((item) => item.id === request.result?.fileRefId);
    if (!fileRef) {
      continue;
    }

    assertScenario(
      fileRef.uri.startsWith(`/api/artifacts/${copiedDraft.id}/`),
      `${scope}: コピー済み工程の成果物参照が新しい編集コピーの配下にない`
    );
    await readFile(artifactPathByUri(runtimeDir, fileRef.uri));
  }
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
  await assertOutputVideoUsesEncoder(outputPath, 'libx264');
  await assertWorkflowStepManifests(runtimeDir, draftId, label, expectedManifestTypes);
  await assertRenderedTelopsStayWithinLineCheckpoint(runtimeDir, draftId, label);

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
    `${label}: 固定確認のテーマが外部AI実行済みとして保存されている`
  );
  assertScenario(expectedThemeId, `${label}: テーマが保存されていない`);
  assertScenario(
    composition.selectedThemeId === expectedThemeId,
    `${label}: 切り口と編集元場面が前工程のテーマを反映していない`
  );
  assertScenario(
    editPlan.selectedThemeId === composition.selectedThemeId,
    `${label}: 編集案が切り口と編集元場面の選択テーマを反映していない`
  );
  assertScenario(
    editPlan.renderSegments.length === composition.parts.length,
    `${label}: 編集案の動画断片数が編集元場面と一致していない`
  );
  await assertFixedEditPlanUsesFixtureValues(editPlan, label);
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

async function assertMaterialReselectFromMaterialConfirmation(apiBaseUrl, runtimeDir) {
  const draft = await createApprovedScenarioDraft(apiBaseUrl, '編集元場面確認から探し直す');
  const { review } = await runDraftUntilReview(apiBaseUrl, runtimeDir, draft.id, 'material_confirmation');
  assertMaterialReviewText(review, '編集元場面探し直し前');

  const response = await requestJson(apiPath(apiBaseUrl, `/control-reviews/${review.id}/request-changes`), {
    method: 'POST',
    body: JSON.stringify({
      scope: 'material_reselect'
    })
  });

  const copiedDraft = response.state.requestDrafts.find((item) =>
    item.id !== draft.id &&
    item.purpose.includes('同じテーマで切り口と編集元場面を探し直す')
  );
  assertScenario(copiedDraft, 'コメントなしの編集元場面探し直しで編集コピーが作られていない');

  const copiedRequests = agentRequestsForDraft(response.state, copiedDraft.id);
  const expectedStartIndex = workflowTypes.indexOf('build_clip_composition');
  assertScenario(copiedRequests.length === 7, '編集元場面探し直し後の編集コピーに7工程がない');
  assertScenario(
    copiedRequests.slice(0, expectedStartIndex).every((request) => request.status === 'succeeded'),
    '編集元場面探し直しで切り口作成より前の工程が完了済みとしてコピーされていない'
  );
  assertScenario(
    copiedRequests.slice(expectedStartIndex).every((request) => request.status === 'queued'),
    '編集元場面探し直しで切り口作成以降が未作成状態に戻っていない'
  );

  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, copiedDraft.id);
  const completedState = await requestJson(apiPath(apiBaseUrl, '/state'));
  const composition = await readRequestArtifact(completedState, runtimeDir, copiedDraft.id, 'build_clip_composition');
  assertScenario(
    !composition.assemblyPlan.includes('編集元場面の探し直し指示:'),
    'コメントなしの編集元場面探し直しで、標準理由が編集元場面指示として混ざっている'
  );
}

async function assertContentReselectFromMaterialConfirmation(apiBaseUrl, runtimeDir) {
  const draft = await createApprovedScenarioDraft(apiBaseUrl, '編集元場面確認からテーマを選び直す');
  const { review } = await runDraftUntilReview(apiBaseUrl, runtimeDir, draft.id, 'material_confirmation');
  assertMaterialReviewText(review, 'テーマ選び直し前');

  const response = await requestJson(apiPath(apiBaseUrl, `/control-reviews/${review.id}/request-changes`), {
    method: 'POST',
    body: JSON.stringify({
      scope: 'theme_reselect'
    })
  });
  const themeReview = latestReview(response.state, draft.id, 'theme_selection', 'review_required');
  assertScenario(themeReview, '編集元場面確認からテーマ選択へ戻れていない');
  assertScenario(themeReview.options.length >= 2, 'テーマ選び直しで複数候補を選べない');

  const selectedOptionId = themeReview.options[1].id;
  await requestJson(apiPath(apiBaseUrl, `/control-reviews/${themeReview.id}/approve`), {
    method: 'POST',
    body: JSON.stringify({
      reason: 'テーマ選び直し後の候補を選択する',
      selectedOptionId
    })
  });

  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, draft.id);
  const completedState = await requestJson(apiPath(apiBaseUrl, '/state'));
  const composition = await readRequestArtifact(completedState, runtimeDir, draft.id, 'build_clip_composition');
  assertScenario(
    composition.selectedThemeId === selectedOptionId,
    'テーマ選び直し後に選んだテーマが切り口と編集元場面へ反映されていない'
  );
}

async function assertThemeOptionRegenerateFromThemeSelection(apiBaseUrl, runtimeDir) {
  const draft = await createApprovedScenarioDraft(apiBaseUrl, 'テーマ選択画面からテーマを作り直す');
  const { review } = await runDraftUntilReview(apiBaseUrl, runtimeDir, draft.id, 'theme_selection');

  const response = await requestJson(apiPath(apiBaseUrl, `/control-reviews/${review.id}/request-changes`), {
    method: 'POST',
    body: JSON.stringify({
      scope: 'theme_options_regenerate'
    })
  });

  const copiedDraft = response.state.requestDrafts.find((item) =>
    item.id !== draft.id &&
    item.purpose.includes('テーマを作り直す')
  );
  assertScenario(copiedDraft, 'テーマ選択画面からテーマ作り直しの編集コピーが作られていない');

  const copiedRequests = agentRequestsForDraft(response.state, copiedDraft.id);
  const expectedStartIndex = workflowTypes.indexOf('propose_clip_themes');
  assertScenario(copiedRequests.length === 7, 'テーマ作り直し後の編集コピーに7工程がない');
  assertScenario(
    copiedRequests.slice(0, expectedStartIndex).every((request) => request.status === 'succeeded'),
    'テーマ作り直しでテーマ作成より前の工程が完了済みとしてコピーされていない'
  );
  assertScenario(
    copiedRequests.slice(expectedStartIndex).every((request) => request.status === 'queued'),
    'テーマ作り直しでテーマ作成以降が未作成状態に戻っていない'
  );

  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, copiedDraft.id);
  await assertGeneratedDraftCompleted(
    apiBaseUrl,
    runtimeDir,
    copiedDraft.id,
    'テーマ選択画面からのテーマ作り直し',
    workflowTypes.slice(workflowTypes.indexOf('propose_clip_themes'))
  );
}

async function assertWebGeminiReviewFeedbackLoop(apiBaseUrl, runtimeDir, sourceDraftId) {
  const state = await requestJson(apiPath(apiBaseUrl, '/state'));
  const outputRequest = agentRequestsForDraft(state, sourceDraftId).find((request) => request.type === 'render_video');
  const outputFileRef = state.fileRefs.find((fileRef) => fileRef.id === outputRequest?.result?.fileRefId);
  assertScenario(outputFileRef?.uri, 'Web Geminiレビュー実行ログ用の完成動画参照が見つからない');
  const runLogPath = path.join(runtimeDir, 'artifacts', sourceDraftId, 'web-gemini-review-run.json');
  await writeFile(runLogPath, `${JSON.stringify({
    draftId: sourceDraftId,
    status: 'unknown',
    createdAt: new Date().toISOString()
  }, null, 2)}\n`, 'utf8');
  const brokenRunLogError = await expectRequestJsonFailure(
    apiPath(apiBaseUrl, `/request-drafts/${sourceDraftId}/web-gemini-review`)
  );
  assertScenario(
    brokenRunLogError.includes('Web Geminiレビュー実行ログの保存内容が壊れています'),
    '壊れたWeb Geminiレビュー実行ログが成功扱いになっている'
  );

  await writeFile(runLogPath, `${JSON.stringify({
    draftId: sourceDraftId,
    status: 'failed',
    createdAt: new Date().toISOString(),
    outputVideoUri: outputFileRef.uri,
    outputVideoPath: artifactPathByUri(runtimeDir, outputFileRef.uri),
    promptPath: path.join(runtimeDir, 'artifacts', sourceDraftId, 'web-gemini-review-prompt.md'),
    blockedReasons: ['Gemini回答を取得できません'],
    externalUploadRequired: true,
    nextAction: 'Web Geminiレビュー実行に失敗しました。停止理由を確認してから再実行してください。'
  }, null, 2)}\n`, 'utf8');
  const failedRunLog = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${sourceDraftId}/web-gemini-review`));
  assertScenario(failedRunLog.runLog?.status === 'failed', 'Web Geminiレビュー実行失敗ログが失敗として読めない');
  assertScenario(
    failedRunLog.runLog.blockedReasons.includes('Gemini回答を取得できません'),
    'Web Geminiレビュー実行失敗理由がログから読めない'
  );

  await writeFile(runLogPath, `${JSON.stringify({
    draftId: sourceDraftId,
    status: 'prepared',
    createdAt: new Date().toISOString(),
    outputVideoUri: outputFileRef.uri,
    outputVideoPath: artifactPathByUri(runtimeDir, outputFileRef.uri),
    promptPath: path.join(runtimeDir, 'artifacts', sourceDraftId, 'web-gemini-review-prompt.md'),
    blockedReasons: [],
    externalUploadRequired: true,
    nextAction: 'レビュー対象動画と依頼文を確認しました。外部送信はまだ実行していません。'
  }, null, 2)}\n`, 'utf8');

  const beforeReview = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${sourceDraftId}/web-gemini-review`));
  assertScenario(beforeReview.review === null, 'Web Geminiレビュー保存前にレビューがある扱いになっている');
  assertScenario(beforeReview.outputVideoUri, 'Web Geminiレビュー対象の完成動画参照が返っていない');
  assertScenario(beforeReview.runLog?.status === 'prepared', 'Web Geminiレビュー準備ログが取得できない');
  assertScenario(beforeReview.runLog.externalUploadRequired === true, '外部送信が必要なレビューであることがログから分からない');

  const instructionText = [
    '変えること: 冒頭のテロップを話し出しと同時に出す',
    '理由: 最初の一言より遅れて表示されると、見せ場の意味が伝わりにくい',
    '対象箇所の説明: 1つ目の動画断片で話者が声を出し始める場面'
  ].join('\n');
  const saved = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${sourceDraftId}/web-gemini-review`), {
    method: 'POST',
    body: JSON.stringify({
      promptText: '演出だけをレビューする',
      reviewText: `${instructionText}\n\n補足: 顔には重ねず、ゲーム画面側へ寄せる。`,
      instructionText
    })
  });
  assertScenario(
    saved.review?.instructionText === instructionText,
    'Web Geminiレビューの改善指示が保存時に変わっている'
  );

  const fetched = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${sourceDraftId}/web-gemini-review`));
  assertScenario(fetched.review?.status === 'ready', '保存したWeb Geminiレビューが取得できない');
  assertScenario(
    fetched.review.instructionText === instructionText,
    '取得したWeb Geminiレビューの改善指示が保存内容と一致しない'
  );

  const applied = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${sourceDraftId}/apply-web-gemini-review`), {
    method: 'POST',
    body: JSON.stringify({
      instructionText
    })
  });
  const copiedDraft = applied.draft;
  assertScenario(copiedDraft.id !== sourceDraftId, 'Web Geminiレビュー反映で編集コピーが作られていない');
  assertScenario(
    copiedDraft.purpose.includes('Web Geminiの演出レビューを反映して、演出作成前から作り直す'),
    'Web Geminiレビュー反映の目的が編集コピーに残っていない'
  );
  assertScenario(
    copiedDraft.purpose.includes(instructionText),
    'Web Geminiレビューの改善指示が編集コピーに残っていない'
  );

  const copiedRequests = agentRequestsForDraft(applied.state, copiedDraft.id);
  const expectedStartIndex = workflowTypes.indexOf('create_edit_plan');
  assertScenario(copiedRequests.length === 7, 'Web Geminiレビュー反映後の編集コピーに7工程がない');
  assertScenario(
    copiedRequests.slice(0, expectedStartIndex).every((request) => request.status === 'succeeded'),
    'Web Geminiレビュー反映で演出作成より前の工程が完了済みとしてコピーされていない'
  );
  assertScenario(
    copiedRequests.slice(expectedStartIndex).every((request) => request.status === 'queued'),
    'Web Geminiレビュー反映で演出作成以降が未作成状態に戻っていない'
  );
  assertScenario(
    copiedRequests[expectedStartIndex]?.type === 'create_edit_plan',
    'Web Geminiレビュー反映が演出作成前から再開していない'
  );

  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, copiedDraft.id);
  await assertGeneratedDraftCompleted(
    apiBaseUrl,
    runtimeDir,
    copiedDraft.id,
    'Web Geminiレビュー反映からのコピー再開',
    workflowTypes.slice(workflowTypes.indexOf('create_edit_plan'))
  );
}

async function assertResumeAndCancelControls(apiBaseUrl) {
  const draft = await createApprovedScenarioDraft(apiBaseUrl, '待機中AI作業の再開と中止を確認する');
  const next = await requestJson(apiPath(apiBaseUrl, '/agent-requests/next'));
  assertScenario(
    next.request?.requestDraftId === draft.id && next.request?.type === 'prepare_video',
    '待機中AI作業の再開前に、次に実行できる工程が取れない'
  );

  const resumed = await requestJson(apiPath(apiBaseUrl, '/agent-requests/resume'), {
    method: 'POST'
  });
  assertScenario(
    resumed.request?.requestDraftId === draft.id && resumed.request?.type === 'prepare_video',
    '待機中AI作業の再開APIが、再開対象の工程を返していない'
  );

  const cancelled = await requestJson(apiPath(apiBaseUrl, `/request-drafts/${draft.id}/cancel-agent-work`), {
    method: 'POST'
  });
  const cancelledRequests = agentRequestsForDraft(cancelled.state, draft.id);
  assertScenario(cancelledRequests.length === 7, '中止後に工程数が変わっている');
  assertScenario(
    cancelledRequests.every((request) => request.status === 'cancelled'),
    '中止後に待機中AI作業が中止状態になっていない'
  );
  assertScenario(
    cancelledRequests.every((request) => request.errorMessage === '人間がAI作業を中止しました'),
    '中止理由が人間に分かる文として保存されていない'
  );

  const ignoredFailure = await requestJson(apiPath(apiBaseUrl, `/agent-requests/${cancelledRequests[0].id}/fail`), {
    method: 'POST',
    body: JSON.stringify({
      message: '中止後に古いrunnerから失敗が返った'
    })
  });
  const stillCancelledAfterFailure = agentRequestsForDraft(ignoredFailure.state, draft.id)[0];
  assertScenario(
    stillCancelledAfterFailure.status === 'cancelled',
    '中止済み工程が古い失敗報告で失敗状態に戻っている'
  );

  const ignoredCompletion = await requestJson(apiPath(apiBaseUrl, `/agent-requests/${cancelledRequests[1].id}/complete`), {
    method: 'POST',
    body: JSON.stringify({
      meaning: '中止後に古いrunnerから完了が返った'
    })
  });
  const stillCancelledAfterCompletion = agentRequestsForDraft(ignoredCompletion.state, draft.id)[1];
  assertScenario(
    stillCancelledAfterCompletion.status === 'cancelled',
    '中止済み工程が古い完了報告で成功状態に戻っている'
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
  await assertOutputVideoUsesEncoder(outputPath, 'libx264');
  await assertWorkflowStepManifests(runtimeDir, draft.id, '初回生成');
  await assertRenderedTelopsStayWithinLineCheckpoint(runtimeDir, draft.id, '初回生成');
  const editPlan = await readRequestArtifact(state, runtimeDir, draft.id, 'create_edit_plan');
  await assertFixedEditPlanUsesFixtureValues(editPlan, '初回生成');
  assertTelopsDoNotCoverWholeSegments(editPlan, '初回生成');
  assertFixedEditPlanUsesPreparedScreenLayout(editPlan, '初回生成');

  await assertWebGeminiReviewFeedbackLoop(apiBaseUrl, runtimeDir, draft.id);

  const editPlanRestartDraft = await assertCopiedRestart(apiBaseUrl, runtimeDir, draft.id, 'edit_plan', 'create_edit_plan');
  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, editPlanRestartDraft.id);
  await assertGeneratedDraftCompleted(
    apiBaseUrl,
    runtimeDir,
    editPlanRestartDraft.id,
    '演出作成前からのコピー再開',
    workflowTypes.slice(workflowTypes.indexOf('create_edit_plan'))
  );

  const themeRestartDraft = await assertCopiedRestart(apiBaseUrl, runtimeDir, draft.id, 'theme_selection', 'build_clip_composition');
  await runAgentApprovingReviews(apiBaseUrl, runtimeDir, themeRestartDraft.id);
  await assertGeneratedDraftCompleted(
    apiBaseUrl,
    runtimeDir,
    themeRestartDraft.id,
    'テーマ選択後からのコピー再開',
    workflowTypes.slice(workflowTypes.indexOf('build_clip_composition'))
  );

  const adjustmentRestartDraft = await assertCopiedRestart(apiBaseUrl, runtimeDir, draft.id, 'adjustment', 'apply_adjustment');
  const nextAfterMultipleRestarts = await requestJson(apiPath(apiBaseUrl, '/agent-requests/next'));
  assertScenario(
    nextAfterMultipleRestarts.request?.requestDraftId === adjustmentRestartDraft.id &&
      nextAfterMultipleRestarts.request?.type === 'apply_adjustment',
    '複数の作り直し候補があるとき、最後に作った編集コピーが次の実行対象になっていない'
  );

  await assertMaterialReselectFromMaterialConfirmation(apiBaseUrl, runtimeDir);
  await assertContentReselectFromMaterialConfirmation(apiBaseUrl, runtimeDir);
  await assertThemeOptionRegenerateFromThemeSelection(apiBaseUrl, runtimeDir);
  await assertResumeAndCancelControls(apiBaseUrl);

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
