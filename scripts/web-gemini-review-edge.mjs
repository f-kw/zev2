#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeDir = process.env.ZEV2_RUNTIME_DIR
  ? path.resolve(process.env.ZEV2_RUNTIME_DIR)
  : path.join(projectRoot, 'runtime');
const statePath = path.join(runtimeDir, 'state.json');
const artifactUrlPrefix = '/api/artifacts/';
const reviewFileName = 'web-gemini-review.json';
const promptFileName = 'web-gemini-review-prompt.md';
const runLogFileName = 'web-gemini-review-run.json';

const args = new Set(process.argv.slice(2));
const reviewTextFileArg = readOption('--review-text-file');
const draftIdArg = readOption('--draft-id');

function readOption(name) {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

function run(command, commandArgs) {
  return new Promise((resolve) => {
    execFile(command, commandArgs, { timeout: 15000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        message: error instanceof Error ? error.message : ''
      });
    });
  });
}

function artifactPathFromUri(uri) {
  if (!uri.startsWith(artifactUrlPrefix)) {
    throw new Error(`成果物URIをファイルに変換できません: ${uri}`);
  }

  const relative = uri
    .slice(artifactUrlPrefix.length)
    .split('/')
    .map(decodeURIComponent);
  return path.join(runtimeDir, 'artifacts', ...relative);
}

function readablePurpose(purpose) {
  const purposeLine = String(purpose ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('やり直し理由:') && !line.startsWith('素材選び直し指示:'));
  return purposeLine || 'ショート動画を作成する';
}

function buildPrompt(draft) {
  return [
    'この動画をレビューしてください。対象は演出だけです。',
    '',
    `動画の目的: ${readablePurpose(draft.purpose)}`,
    '',
    'レビュー対象:',
    '- テロップの読みやすさ、表示タイミング、消えるタイミング',
    '- 顔、ゲーム画面、テロップが重ならない画面構成',
    '- 複数シーンのつなぎ、テンポ、初見で意味が伝わるか',
    '- ショート動画として見せ場が伝わるか',
    '',
    'レビュー対象外:',
    '- テーマ選択、編集元場面の選択',
    '- 元動画、文字起こし、音声品質、エンコード、投稿可否、バグ調査',
    '',
    '出力は、演出作成へ渡せる改善指示として箇条書きにしてください。',
    '各項目は「変えること」「理由」「対象箇所の説明」が分かるようにしてください。'
  ].join('\n');
}

async function loadState() {
  return JSON.parse(await readFile(statePath, 'utf8'));
}

function findLatestRenderedVideo(state) {
  const fileRefsById = new Map(state.fileRefs.map((fileRef) => [fileRef.id, fileRef]));
  const draftsById = new Map(state.requestDrafts.map((draft) => [draft.id, draft]));
  const candidates = state.agentRequests
    .filter((request) => request.type === 'render_video' && request.status === 'succeeded' && request.result?.fileRefId)
    .map((request) => {
      const fileRef = fileRefsById.get(request.result.fileRefId);
      const draft = draftsById.get(request.requestDraftId);
      if (!fileRef || !draft) {
        return undefined;
      }

      const videoPath = artifactPathFromUri(fileRef.uri);
      return {
        draft,
        request,
        fileRef,
        videoPath,
        updatedAt: request.updatedAt
      };
    })
    .filter(Boolean)
    .filter((candidate) => (!draftIdArg || candidate.draft.id === draftIdArg) && existsSync(candidate.videoPath))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return candidates[0];
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeRunLog(target, status, details) {
  await writeJson(path.join(runtimeDir, 'artifacts', target.draft.id, runLogFileName), {
    draftId: target.draft.id,
    status,
    createdAt: new Date().toISOString(),
    outputVideoUri: target.fileRef.uri,
    outputVideoPath: target.videoPath,
    ...details
  });
}

async function saveReviewFromText(target, promptText, reviewText) {
  const normalizedReviewText = reviewText.trim().replace(/\n{3,}/g, '\n\n');
  if (!normalizedReviewText) {
    throw new Error('保存するWeb Geminiレビューが空です');
  }

  const review = {
    draftId: target.draft.id,
    source: 'edge-web-gemini',
    status: 'ready',
    createdAt: new Date().toISOString(),
    outputVideoUri: target.fileRef.uri,
    promptText,
    reviewText: normalizedReviewText,
    instructionText: normalizedReviewText
  };
  await writeJson(path.join(runtimeDir, 'artifacts', target.draft.id, reviewFileName), review);
  return review;
}

async function diagnoseEdgeControl() {
  const urlResult = await run('osascript', [
    '-e',
    'tell application "Microsoft Edge" to get URL of active tab of front window'
  ]);
  const javascriptResult = await run('osascript', [
    '-e',
    'tell application "Microsoft Edge" to execute active tab of front window javascript "document.title"'
  ]);

  return {
    canReadActiveTabUrl: urlResult.ok,
    activeTabUrl: urlResult.stdout,
    canRunAppleEventsJavascript: javascriptResult.ok,
    appleEventsJavascriptError: javascriptResult.ok ? '' : javascriptResult.stderr || javascriptResult.message
  };
}

async function openGeminiInEdge() {
  return run('open', ['-a', 'Microsoft Edge', 'https://gemini.google.com/app?hl=ja']);
}

async function main() {
  const state = await loadState();
  const target = findLatestRenderedVideo(state);
  if (!target) {
    throw new Error(draftIdArg
      ? `指定された下書きに完成動画がありません: ${draftIdArg}`
      : '完成動画が見つかりません');
  }

  const promptText = buildPrompt(target.draft);
  const promptPath = path.join(runtimeDir, 'artifacts', target.draft.id, promptFileName);
  await mkdir(path.dirname(promptPath), { recursive: true });
  await writeFile(promptPath, `${promptText}\n`, 'utf8');

  if (reviewTextFileArg) {
    const review = await saveReviewFromText(
      target,
      promptText,
      await readFile(path.resolve(reviewTextFileArg), 'utf8')
    );
    await writeRunLog(target, 'saved', {
      promptPath,
      reviewPath: path.join(runtimeDir, 'artifacts', target.draft.id, reviewFileName),
      reviewCreatedAt: review.createdAt
    });
    console.log(JSON.stringify({ status: 'saved', draftId: target.draft.id, promptPath }, null, 2));
    return;
  }

  const openResult = await openGeminiInEdge();
  const edgeControl = await diagnoseEdgeControl();
  const blockedReasons = [];
  if (!openResult.ok) {
    blockedReasons.push(`EdgeでWeb Geminiを開けません: ${openResult.stderr || openResult.message}`);
  }
  if (!edgeControl.canRunAppleEventsJavascript) {
    blockedReasons.push('Edgeの「Apple EventsからのJavaScriptを許可」が無効です');
  }

  if (blockedReasons.length || args.has('--diagnose-only')) {
    const status = blockedReasons.length ? 'blocked' : 'prepared';
    await writeRunLog(target, status, {
      promptPath,
      edgeControl,
      blockedReasons,
      nextAction: blockedReasons.length
        ? 'EdgeでWeb Geminiへ動画を送る前提が不足しています。Edgeの開発者メニューでApple Events JavaScriptを許可してから再実行してください。'
        : 'レビュー対象動画と依頼文を確認しました。次はAIエージェントがEdgeのWeb Geminiで動画アップロードと回答取得を実行します。'
    });
    console.log(JSON.stringify({
      status,
      draftId: target.draft.id,
      outputVideoPath: target.videoPath,
      promptPath,
      edgeControl,
      blockedReasons
    }, null, 2));
    return;
  }

  await writeRunLog(target, 'prepared', {
    promptPath,
    edgeControl,
    nextAction: 'レビュー対象動画と依頼文を確認しました。次はAIエージェントがEdgeのWeb Geminiで動画アップロードと回答取得を実行します。'
  });
  console.log(JSON.stringify({
    status: 'prepared',
    draftId: target.draft.id,
    outputVideoPath: target.videoPath,
    promptPath
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
