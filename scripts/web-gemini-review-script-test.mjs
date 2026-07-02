#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(workspaceRoot, 'scripts', 'web-gemini-review-edge.mjs');

function assertTest(condition, message) {
  if (!condition) {
    throw new Error(`Web Geminiレビュースクリプトテスト失敗: ${message}`);
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function startBackend(runtimeDir, port) {
  const output = [];
  const child = spawn('node', ['backend/dist/index.js'], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port),
      ZEV2_RUNTIME_DIR: runtimeDir,
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
      const response = await fetch(healthUrl);
      if (response.ok) {
        return { child, output };
      }
    } catch {
      // backend起動待ち
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  child.kill();
  throw new Error(`backendを起動できません:\n${output.join('')}`);
}

function runScript(runtimeDir, apiBaseUrl, args) {
  const output = [];
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ZEV2_RUNTIME_DIR: runtimeDir,
      ZEV2_API_BASE_URL: apiBaseUrl
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return new Promise((resolve) => {
    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));
    child.on('close', (code) => {
      resolve({ code, output: output.join('') });
    });
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeMinimalMp4(filePath) {
  await writeFile(
    filePath,
    Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
  );
}

function fixtureDraft(id, purpose) {
  return {
    id,
    status: 'approved',
    purpose,
    source: { kind: 'video_source', uri: `runtime/artifacts/${id}/source-video.mp4` },
    settings: {
      durationLabel: '60秒以内',
      themeCountLabel: '3候補',
      geminiModelName: 'gemini-3.5-flash',
      preset: 'shorts_default'
    },
    policy: { humanApprovalRequiredBeforeRender: false },
    steps: [],
    createdAt: '2026-06-29T00:00:00.000Z',
    updatedAt: '2026-06-29T00:00:00.000Z'
  };
}

function fixtureRenderRequest(id, draftId, fileRefId, updatedAt) {
  return {
    id,
    requestDraftId: draftId,
    type: 'render_video',
    label: '動画生成',
    target: { sourceUri: `runtime/artifacts/${draftId}/source-video.mp4` },
    input: { purpose: '確認用', settings: {} },
    constraints: {},
    policy: { humanApprovalRequiredBeforeRender: false },
    status: 'succeeded',
    fileRefIds: [fileRefId],
    result: { fileRefId, meaning: '確認用動画' },
    createdAt: '2026-06-29T00:00:00.000Z',
    updatedAt
  };
}

function fixtureOutputVideoFileRef(id, draftId) {
  return {
    id,
    kind: 'output_video',
    uri: `/api/artifacts/${draftId}/output.mp4`,
    mimeType: 'video/mp4',
    access: 'internal',
    ownerId: `output_${id}`,
    artifactFileName: 'output.mp4',
    byteSize: 12,
    sha256: '0'.repeat(64),
    createdAt: '2026-06-29T00:00:00.000Z'
  };
}

async function writeRuntimeFixture(runtimeDir) {
  const artifactsDir = path.join(runtimeDir, 'artifacts');
  await mkdir(path.join(artifactsDir, 'draft_success'), { recursive: true });
  await mkdir(path.join(artifactsDir, 'draft_empty'), { recursive: true });
  await mkdir(path.join(artifactsDir, 'draft_invalid_video'), { recursive: true });
  await writeFile(path.join(runtimeDir, 'state.json'), JSON.stringify({
    requestDrafts: [
      fixtureDraft('draft_success', '成功ログ確認用ショート\nやり直し理由: 前回レビューの改善指示'),
      fixtureDraft('draft_empty', '失敗ログ確認用ショート'),
      fixtureDraft('draft_invalid_video', '壊れた動画確認用ショート')
    ],
    agentRequests: [
      fixtureRenderRequest('agent_success', 'draft_success', 'file_success', '2026-06-29T00:00:02.000Z'),
      fixtureRenderRequest('agent_empty', 'draft_empty', 'file_empty', '2026-06-29T00:00:01.000Z'),
      fixtureRenderRequest('agent_invalid', 'draft_invalid_video', 'file_invalid_video', '2026-06-29T00:00:03.000Z')
    ],
    fileRefs: [
      fixtureOutputVideoFileRef('file_success', 'draft_success'),
      fixtureOutputVideoFileRef('file_empty', 'draft_empty'),
      fixtureOutputVideoFileRef('file_invalid_video', 'draft_invalid_video')
    ],
    outputs: [],
    agentOperationLogs: [],
    decisionLogs: [],
    controlReviewItems: [],
    humanReviewActions: [],
    finalReviewActions: []
  }, null, 2));

  await writeMinimalMp4(path.join(artifactsDir, 'draft_success', 'output.mp4'));
  await writeMinimalMp4(path.join(artifactsDir, 'draft_empty', 'output.mp4'));
  await writeFile(path.join(artifactsDir, 'draft_invalid_video', 'output.mp4'), 'dummy broken video');
  await writeFile(
    path.join(runtimeDir, 'review-success.txt'),
    [
      '変えること: 冒頭テロップを発話開始に合わせる',
      '理由: 最初の一言と文字のタイミングがずれると意味が取りづらい',
      '対象箇所の説明: 1つ目の動画断片'
    ].join('\n')
  );
  await writeFile(path.join(runtimeDir, 'review-empty.txt'), '   \n');
}

async function assertSaveSuccess(runtimeDir, apiBaseUrl) {
  const result = await runScript(runtimeDir, apiBaseUrl, [
    '--draft-id=draft_success',
    `--review-text-file=${path.join(runtimeDir, 'review-success.txt')}`
  ]);
  assertTest(result.code === 0, `レビュー保存が失敗した: ${result.output}`);

  const review = await readJson(path.join(runtimeDir, 'artifacts', 'draft_success', 'web-gemini-review.json'));
  assertTest(review.status === 'ready', '保存済みレビューがreadyではない');
  assertTest(review.draftId === 'draft_success', '保存済みレビューが別の下書きを指している');
  assertTest(review.reviewText.includes('冒頭テロップを発話開始に合わせる'), 'レビュー本文が保存されていない');
  assertTest(review.instructionText === review.reviewText, '改善指示がレビュー本文と一致していない');

  const runLog = await readJson(path.join(runtimeDir, 'artifacts', 'draft_success', 'web-gemini-review-run.json'));
  assertTest(runLog.status === 'saved', 'レビュー保存ログがsavedではない');
  assertTest(runLog.reviewPath.endsWith('web-gemini-review.json'), 'レビュー保存先がログに残っていない');
  assertTest(runLog.externalUploadRequired === false, '保存済み本文の取り込みが外部送信扱いになっている');
  assertTest(Array.isArray(runLog.blockedReasons) && runLog.blockedReasons.length === 0, '成功ログに停止理由が残っている');
  assertTest(
    runLog.nextAction.includes('保存済みのWeb Geminiレビュー本文を取り込みました'),
    '保存済み本文を取り込んだことが成功ログから読めない'
  );

  const promptText = await readFile(path.join(runtimeDir, 'artifacts', 'draft_success', 'web-gemini-review-prompt.md'), 'utf8');
  assertTest(
    promptText.includes('動画の目的: 成功ログ確認用ショート'),
    'Web Geminiレビュー依頼文が人間向けの目的を使っていない'
  );
  assertTest(
    promptText.includes('編集で変更できること:') &&
      promptText.includes('テロップの文言、区切り、読みやすさ') &&
      promptText.includes('編集で変更しないこと:') &&
      promptText.includes('BGM追加、別素材追加、複雑なエフェクト') &&
      promptText.includes('文字を小さくして重なりを避ける提案は禁止') &&
      promptText.includes('根拠のない倍率、固定文字数、数値係数の提案は避けてください'),
    'Web Geminiレビュー依頼文に演出作成で変更できる範囲が入っていない'
  );
  assertTest(!promptText.includes('やり直し理由:'), 'Web Geminiレビュー依頼文にやり直し理由が混ざっている');
}

async function assertSaveFailure(runtimeDir, apiBaseUrl) {
  const result = await runScript(runtimeDir, apiBaseUrl, [
    '--draft-id=draft_empty',
    `--review-text-file=${path.join(runtimeDir, 'review-empty.txt')}`
  ]);
  assertTest(result.code !== 0, '空レビュー本文が成功扱いになっている');
  assertTest(result.output.includes('保存するWeb Geminiレビューが空です'), '空レビューの失敗理由が出力されていない');
  assertTest(
    !(await exists(path.join(runtimeDir, 'artifacts', 'draft_empty', 'web-gemini-review.json'))),
    '空レビューでレビュー本体が保存されている'
  );

  const runLog = await readJson(path.join(runtimeDir, 'artifacts', 'draft_empty', 'web-gemini-review-run.json'));
  assertTest(runLog.status === 'failed', '空レビューの実行ログがfailedではない');
  assertTest(runLog.externalUploadRequired === false, 'ファイル保存失敗が外部送信必須扱いになっている');
  assertTest(
    runLog.blockedReasons.includes('保存するWeb Geminiレビューが空です'),
    '空レビューの停止理由がログに残っていない'
  );
}

async function assertInvalidVideoBlocked(runtimeDir, apiBaseUrl) {
  const result = await runScript(runtimeDir, apiBaseUrl, [
    '--draft-id=draft_invalid_video',
    `--review-text-file=${path.join(runtimeDir, 'review-success.txt')}`
  ]);
  assertTest(result.code !== 0, '壊れた完成動画がWeb Geminiレビュー対象として成功扱いになっている');
  assertTest(
    result.output.includes('Web Geminiレビュー対象の完成動画はMP4として読めません'),
    '壊れた完成動画の失敗理由が出力されていない'
  );
  assertTest(
    !(await exists(path.join(runtimeDir, 'artifacts', 'draft_invalid_video', 'web-gemini-review.json'))),
    '壊れた完成動画でレビュー本体が保存されている'
  );

  const runLog = await readJson(path.join(runtimeDir, 'artifacts', 'draft_invalid_video', 'web-gemini-review-run.json'));
  assertTest(runLog.status === 'blocked', '壊れた完成動画の実行ログがblockedではない');
  assertTest(
    runLog.blockedReasons.includes('Web Geminiレビュー対象の完成動画はMP4として読めません'),
    '壊れた完成動画の停止理由がログに残っていない'
  );
}

async function main() {
  const runtimeDir = await mkdtemp(path.join(tmpdir(), 'zev2-web-gemini-script-'));
  await writeRuntimeFixture(runtimeDir);
  const port = await getFreePort();
  const backend = await startBackend(runtimeDir, port);
  const apiBaseUrl = `http://127.0.0.1:${port}/api`;
  try {
    await assertSaveSuccess(runtimeDir, apiBaseUrl);
    await assertSaveFailure(runtimeDir, apiBaseUrl);
    await assertInvalidVideoBlocked(runtimeDir, apiBaseUrl);
  } finally {
    backend.child.kill();
  }
  console.log(`Web Geminiレビュースクリプトテスト成功: ${runtimeDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
