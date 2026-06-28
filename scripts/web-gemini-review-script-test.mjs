#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
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

function runScript(runtimeDir, args) {
  const output = [];
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ZEV2_RUNTIME_DIR: runtimeDir
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

async function writeRuntimeFixture(runtimeDir) {
  const artifactsDir = path.join(runtimeDir, 'artifacts');
  await mkdir(path.join(artifactsDir, 'draft_success'), { recursive: true });
  await mkdir(path.join(artifactsDir, 'draft_empty'), { recursive: true });
  await writeFile(path.join(runtimeDir, 'state.json'), JSON.stringify({
    fileRefs: [
      { id: 'file_success', uri: '/api/artifacts/draft_success/output.mp4' },
      { id: 'file_empty', uri: '/api/artifacts/draft_empty/output.mp4' }
    ],
    requestDrafts: [
      { id: 'draft_success', purpose: '成功ログ確認用ショート\nやり直し理由: 前回レビューの改善指示' },
      { id: 'draft_empty', purpose: '失敗ログ確認用ショート' }
    ],
    agentRequests: [
      {
        type: 'render_video',
        status: 'succeeded',
        requestDraftId: 'draft_success',
        result: { fileRefId: 'file_success' },
        updatedAt: '2026-06-29T00:00:02.000Z'
      },
      {
        type: 'render_video',
        status: 'succeeded',
        requestDraftId: 'draft_empty',
        result: { fileRefId: 'file_empty' },
        updatedAt: '2026-06-29T00:00:01.000Z'
      }
    ]
  }, null, 2));

  await writeFile(path.join(artifactsDir, 'draft_success', 'output.mp4'), 'dummy success video');
  await writeFile(path.join(artifactsDir, 'draft_empty', 'output.mp4'), 'dummy empty video');
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

async function assertSaveSuccess(runtimeDir) {
  const result = await runScript(runtimeDir, [
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

  const promptText = await readFile(path.join(runtimeDir, 'artifacts', 'draft_success', 'web-gemini-review-prompt.md'), 'utf8');
  assertTest(
    promptText.includes('動画の目的: 成功ログ確認用ショート'),
    'Web Geminiレビュー依頼文が人間向けの目的を使っていない'
  );
  assertTest(!promptText.includes('やり直し理由:'), 'Web Geminiレビュー依頼文にやり直し理由が混ざっている');
}

async function assertSaveFailure(runtimeDir) {
  const result = await runScript(runtimeDir, [
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

async function main() {
  const runtimeDir = await mkdtemp(path.join(tmpdir(), 'zev2-web-gemini-script-'));
  await writeRuntimeFixture(runtimeDir);
  await assertSaveSuccess(runtimeDir);
  await assertSaveFailure(runtimeDir);
  console.log(`Web Geminiレビュースクリプトテスト成功: ${runtimeDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
