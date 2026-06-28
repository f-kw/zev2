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

async function writeMinimalMp4(filePath) {
  await writeFile(
    filePath,
    Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
  );
}

async function writeRuntimeFixture(runtimeDir) {
  const artifactsDir = path.join(runtimeDir, 'artifacts');
  await mkdir(path.join(artifactsDir, 'draft_success'), { recursive: true });
  await mkdir(path.join(artifactsDir, 'draft_empty'), { recursive: true });
  await mkdir(path.join(artifactsDir, 'draft_invalid_video'), { recursive: true });
  await writeFile(path.join(runtimeDir, 'state.json'), JSON.stringify({
    fileRefs: [
      { id: 'file_success', kind: 'output_video', uri: '/api/artifacts/draft_success/output.mp4', mimeType: 'video/mp4' },
      { id: 'file_empty', kind: 'output_video', uri: '/api/artifacts/draft_empty/output.mp4', mimeType: 'video/mp4' },
      {
        id: 'file_invalid_video',
        kind: 'output_video',
        uri: '/api/artifacts/draft_invalid_video/output.mp4',
        mimeType: 'video/mp4'
      }
    ],
    requestDrafts: [
      { id: 'draft_success', purpose: '成功ログ確認用ショート\nやり直し理由: 前回レビューの改善指示' },
      { id: 'draft_empty', purpose: '失敗ログ確認用ショート' },
      { id: 'draft_invalid_video', purpose: '壊れた動画確認用ショート' }
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
      },
      {
        type: 'render_video',
        status: 'succeeded',
        requestDraftId: 'draft_invalid_video',
        result: { fileRefId: 'file_invalid_video' },
        updatedAt: '2026-06-29T00:00:03.000Z'
      }
    ]
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

async function assertInvalidVideoBlocked(runtimeDir) {
  const result = await runScript(runtimeDir, [
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
  await assertSaveSuccess(runtimeDir);
  await assertSaveFailure(runtimeDir);
  await assertInvalidVideoBlocked(runtimeDir);
  console.log(`Web Geminiレビュースクリプトテスト成功: ${runtimeDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
