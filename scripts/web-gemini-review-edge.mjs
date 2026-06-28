#!/usr/bin/env node
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWebGeminiReviewPromptText } from '../packages/shared/dist/index.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeDir = process.env.ZEV2_RUNTIME_DIR
  ? path.resolve(process.env.ZEV2_RUNTIME_DIR)
  : path.join(projectRoot, 'runtime');
const statePath = path.join(runtimeDir, 'state.json');
const artifactUrlPrefix = '/api/artifacts/';
const reviewFileName = 'web-gemini-review.json';
const promptFileName = 'web-gemini-review-prompt.md';
const runLogFileName = 'web-gemini-review-run.json';
const externalReviewCommand = 'corepack pnpm run web-gemini:review:execute';

const args = new Set(process.argv.slice(2));
const reviewTextFileArg = readOption('--review-text-file');
const draftIdArg = readOption('--draft-id');
const cdpPort = Number(readOption('--cdp-port') || '9222');
const shouldExecuteWebGemini = args.has('--execute');

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

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = [];
    this.buffer = Buffer.alloc(0);
    this.socket.on('data', (chunk) => this.readFrames(chunk));
    this.socket.on('error', (error) => this.rejectAll(error));
    this.socket.on('close', () => this.rejectAll(new Error('CDP接続が閉じました')));
  }

  static connect(webSocketUrl) {
    const url = new URL(webSocketUrl);
    if (url.protocol !== 'ws:') {
      throw new Error(`対応していないCDP URLです: ${webSocketUrl}`);
    }

    return new Promise((resolve, reject) => {
      const socket = net.connect(Number(url.port || '80'), url.hostname);
      const key = crypto.randomBytes(16).toString('base64');
      let handshakeBuffer = Buffer.alloc(0);

      socket.once('error', reject);
      socket.once('connect', () => {
        socket.write([
          `GET ${url.pathname}${url.search} HTTP/1.1`,
          `Host: ${url.host}`,
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Key: ${key}`,
          'Sec-WebSocket-Version: 13',
          '',
          ''
        ].join('\r\n'));
      });

      const onHandshakeData = (chunk) => {
        handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
        const marker = handshakeBuffer.indexOf('\r\n\r\n');
        if (marker < 0) {
          return;
        }

        socket.off('data', onHandshakeData);
        const headerText = handshakeBuffer.slice(0, marker).toString('utf8');
        if (!headerText.includes(' 101 ')) {
          reject(new Error(`CDP WebSocket接続に失敗しました: ${headerText.split('\r\n')[0]}`));
          socket.destroy();
          return;
        }

        const client = new CdpClient(socket);
        const rest = handshakeBuffer.slice(marker + 4);
        if (rest.length > 0) {
          client.readFrames(rest);
        }
        resolve(client);
      };

      socket.on('data', onHandshakeData);
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.write(encodeWebSocketTextFrame(payload));
    });
  }

  waitForEvent(method, predicate = () => true, timeoutMilliseconds = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.eventWaiters = this.eventWaiters.filter((waiter) => waiter !== waiterRecord);
        reject(new Error(`${method} を待機中にタイムアウトしました`));
      }, timeoutMilliseconds);
      const waiterRecord = {
        method,
        predicate,
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject
      };
      this.eventWaiters.push(waiterRecord);
    });
  }

  close() {
    this.socket.end();
  }

  readFrames(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const second = this.buffer[1];
      let offset = 2;
      let length = second & 0x7f;
      const masked = Boolean(second & 0x80);
      if (length === 126) {
        if (this.buffer.length < offset + 2) {
          return;
        }
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) {
          return;
        }
        length = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      let mask;
      if (masked) {
        if (this.buffer.length < offset + 4) {
          return;
        }
        mask = this.buffer.slice(offset, offset + 4);
        offset += 4;
      }
      if (this.buffer.length < offset + length) {
        return;
      }

      const opcode = this.buffer[0] & 0x0f;
      let payload = this.buffer.slice(offset, offset + length);
      this.buffer = this.buffer.slice(offset + length);
      if (masked && mask) {
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      }
      if (opcode === 8) {
        this.rejectAll(new Error('CDP WebSocketが閉じられました'));
        return;
      }
      if (opcode !== 1) {
        continue;
      }

      this.handleMessage(JSON.parse(payload.toString('utf8')));
    }
  }

  handleMessage(message) {
    if (typeof message.id === 'number') {
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (!message.method) {
      return;
    }

    for (const waiter of [...this.eventWaiters]) {
      if (waiter.method !== message.method || !waiter.predicate(message.params ?? {})) {
        continue;
      }
      this.eventWaiters = this.eventWaiters.filter((item) => item !== waiter);
      waiter.resolve(message.params ?? {});
    }
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
    for (const waiter of this.eventWaiters) {
      waiter.reject(error);
    }
    this.eventWaiters = [];
  }
}

function encodeWebSocketTextFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const mask = crypto.randomBytes(4);
  const headerLength = payload.length < 126 ? 2 : payload.length < 65536 ? 4 : 10;
  const frame = Buffer.alloc(headerLength + 4 + payload.length);
  frame[0] = 0x81;
  if (payload.length < 126) {
    frame[1] = 0x80 | payload.length;
  } else if (payload.length < 65536) {
    frame[1] = 0x80 | 126;
    frame.writeUInt16BE(payload.length, 2);
  } else {
    frame[1] = 0x80 | 127;
    frame.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  mask.copy(frame, headerLength);
  for (let index = 0; index < payload.length; index += 1) {
    frame[headerLength + 4 + index] = payload[index] ^ mask[index % 4];
  }
  return frame;
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

function buildPrompt(draft) {
  return buildWebGeminiReviewPromptText(draft.purpose);
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

async function ensureEdgeDebugging() {
  const version = await fetchCdpJson('/json/version').catch(() => null);
  if (version?.webSocketDebuggerUrl) {
    return { ok: true, alreadyRunning: true };
  }

  await run('osascript', ['-e', 'tell application "Microsoft Edge" to quit']);
  await wait(1200);
  const openResult = await run('open', [
    '-na',
    'Microsoft Edge',
    '--args',
    `--remote-debugging-port=${cdpPort}`,
    `--remote-allow-origins=http://127.0.0.1:${cdpPort}`,
    'https://gemini.google.com/app?hl=ja'
  ]);
  if (!openResult.ok) {
    return { ok: false, error: openResult.stderr || openResult.message };
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const restartedVersion = await fetchCdpJson('/json/version').catch(() => null);
    if (restartedVersion?.webSocketDebuggerUrl) {
      return { ok: true, alreadyRunning: false };
    }
    await wait(500);
  }

  return { ok: false, error: 'EdgeのCDPデバッグポートに接続できません' };
}

async function fetchCdpJson(pathname) {
  const response = await fetch(`http://127.0.0.1:${cdpPort}${pathname}`);
  if (!response.ok) {
    throw new Error(`CDP HTTP ${response.status}: ${pathname}`);
  }
  return response.json();
}

async function getGeminiPageTarget() {
  const targets = await fetchCdpJson('/json/list');
  const geminiTarget = targets.find(
    (target) => target.type === 'page' && String(target.url ?? '').startsWith('https://gemini.google.com/app')
  );
  if (geminiTarget) {
    return geminiTarget;
  }

  const response = await fetch(`http://127.0.0.1:${cdpPort}/json/new?https://gemini.google.com/app%3Fhl%3Dja`, {
    method: 'PUT'
  });
  if (!response.ok) {
    throw new Error(`Web Geminiタブを作れません: HTTP ${response.status}`);
  }
  return response.json();
}

async function evaluateValue(cdp, expression, timeoutMilliseconds = 30000) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMilliseconds
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Web Gemini画面のJavaScript実行に失敗しました');
  }
  return result.result?.value;
}

async function waitForExpression(cdp, expression, label, timeoutMilliseconds = 60000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    const value = await evaluateValue(cdp, expression).catch(() => undefined);
    if (value) {
      return value;
    }
    await wait(500);
  }

  throw new Error(`${label} を確認できません`);
}

async function clickCenter(cdp, rect) {
  const x = rect.x + rect.w / 2;
  const y = rect.y + rect.h / 2;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

function jsFindButtonRect(predicateSource) {
  return `(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find((button) => {
      const text = (button.innerText || '').trim();
      const aria = button.getAttribute('aria-label') || '';
      return (${predicateSource})(text, aria, button);
    });
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, text: (button.innerText || '').trim(), aria: button.getAttribute('aria-label') || '' };
  })()`;
}

async function uploadVideoToGemini(cdp, videoPath) {
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
  const uploadButtonRect = await waitForExpression(
    cdp,
    jsFindButtonRect(`(text, aria) => aria === 'アップロードとツール'`),
    'アップロードボタン'
  );
  await clickCenter(cdp, uploadButtonRect);
  const uploadMenuRect = await waitForExpression(
    cdp,
    jsFindButtonRect(`(text, aria) => text === 'ファイルをアップロード' || aria.startsWith('ファイルをアップロード')`),
    'ファイルアップロードメニュー'
  );
  const fileChooserPromise = cdp.waitForEvent('Page.fileChooserOpened', () => true, 15000);
  await clickCenter(cdp, uploadMenuRect);
  const fileChooser = await fileChooserPromise;
  if (!fileChooser.backendNodeId) {
    throw new Error('ファイル選択対象を取得できません');
  }

  await cdp.send('DOM.setFileInputFiles', {
    files: [videoPath],
    backendNodeId: fileChooser.backendNodeId
  });
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false });

  await waitForExpression(
    cdp,
    `document.body.innerText.includes(${JSON.stringify(path.basename(videoPath))})`,
    '動画アップロード表示',
    120000
  );
}

async function enterPrompt(cdp, promptText) {
  const textboxRect = await waitForExpression(
    cdp,
    `(() => {
      const box = document.querySelector('[role="textbox"][aria-label*="Gemini"]');
      if (!box) return null;
      const rect = box.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    })()`,
    'プロンプト入力欄'
  );
  await clickCenter(cdp, textboxRect);
  await cdp.send('Input.insertText', { text: promptText });
}

async function submitPrompt(cdp) {
  const sendRect = await waitForExpression(
    cdp,
    jsFindButtonRect(`(text, aria) => /送信|submit/i.test(text + ' ' + aria)`),
    '送信ボタン',
    30000
  );
  await clickCenter(cdp, sendRect);
}

function extractReviewFromBodyText(text, promptText) {
  const normalizedText = text.replace(/\r/g, '').trim();
  const promptStart = normalizedText.lastIndexOf(promptText.split('\n')[0]);
  const afterPrompt = promptStart >= 0
    ? normalizedText.slice(promptStart + promptText.length).trim()
    : normalizedText;
  const cleaned = afterPrompt
    .replace(/^Gemini\s*/i, '')
    .replace(/Google アカウント[\s\S]*$/i, '')
    .trim();
  const lines = cleaned
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) =>
      line.trim() &&
      !['Gemini との会話', 'Flash', 'Gemini に相談'].includes(line.trim()) &&
      !line.includes('回答を停止') &&
      !line.includes('この回答を評価')
    );
  return lines.join('\n').trim();
}

async function waitForGeminiReview(cdp, promptText) {
  await waitForExpression(
    cdp,
    `document.body.innerText.length > ${promptText.length + 200}`,
    'Gemini回答開始',
    90000
  );
  await wait(3000);
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = await evaluateValue(cdp, `(() => {
      const bodyText = document.body.innerText;
      const stillRunning = /回答を停止|生成中|考えています|停止/.test(bodyText);
      return { bodyText, stillRunning };
    })()`);
    const reviewText = extractReviewFromBodyText(state.bodyText ?? '', promptText);
    if (reviewText.length > 80 && !state.stillRunning) {
      return reviewText;
    }
    await wait(1000);
  }

  const bodyText = await evaluateValue(cdp, 'document.body.innerText');
  const reviewText = extractReviewFromBodyText(bodyText ?? '', promptText);
  if (reviewText.length > 80) {
    return reviewText;
  }

  throw new Error('Gemini回答を取得できません');
}

async function runWebGeminiReview(target, promptText) {
  const debugging = await ensureEdgeDebugging();
  if (!debugging.ok) {
    throw new Error(debugging.error);
  }

  const targetInfo = await getGeminiPageTarget();
  const cdp = await CdpClient.connect(targetInfo.webSocketDebuggerUrl);
  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    if (!String(targetInfo.url ?? '').startsWith('https://gemini.google.com/app')) {
      await cdp.send('Page.navigate', { url: 'https://gemini.google.com/app?hl=ja' });
    }
    await waitForExpression(cdp, 'location.href.startsWith("https://gemini.google.com/app")', 'Web Gemini URL');
    await waitForExpression(cdp, 'document.body.innerText.includes("Gemini")', 'Web Gemini画面');
    await uploadVideoToGemini(cdp, target.videoPath);
    await enterPrompt(cdp, promptText);
    await submitPrompt(cdp);
    return await waitForGeminiReview(cdp, promptText);
  } finally {
    cdp.close();
  }
}

async function diagnoseCdpControl() {
  const debugging = await ensureEdgeDebugging();
  if (!debugging.ok) {
    return { ok: false, error: debugging.error };
  }

  const targetInfo = await getGeminiPageTarget();
  const cdp = await CdpClient.connect(targetInfo.webSocketDebuggerUrl);
  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    if (!String(targetInfo.url ?? '').startsWith('https://gemini.google.com/app')) {
      await cdp.send('Page.navigate', { url: 'https://gemini.google.com/app?hl=ja' });
    }
    await waitForExpression(cdp, 'location.href.startsWith("https://gemini.google.com/app")', 'Web Gemini URL');
    await waitForExpression(cdp, 'document.body.innerText.includes("Gemini")', 'Web Gemini画面');
    return {
      ok: true,
      alreadyRunning: debugging.alreadyRunning,
      pageTitle: await evaluateValue(cdp, 'document.title'),
      pageUrl: await evaluateValue(cdp, 'location.href')
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    cdp.close();
  }
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
    let review;
    try {
      review = await saveReviewFromText(
        target,
        promptText,
        await readFile(path.resolve(reviewTextFileArg), 'utf8')
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await writeRunLog(target, 'failed', {
        promptPath,
        reviewTextFilePath: path.resolve(reviewTextFileArg),
        blockedReasons: [errorMessage],
        externalUploadRequired: false,
        nextAction: 'Web Geminiレビューの保存に失敗しました。レビュー本文を確認してから再実行してください。'
      });
      throw error;
    }
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

  if (args.has('--cdp-diagnose-only')) {
    const cdpControl = blockedReasons.length ? undefined : await diagnoseCdpControl();
    const cdpBlockedReasons = cdpControl?.ok ? [] : [cdpControl?.error ?? 'CDP診断の前提が不足しています'];
    const status = blockedReasons.length || cdpBlockedReasons.length ? 'blocked' : 'prepared';
    await writeRunLog(target, status, {
      promptPath,
      edgeControl,
      cdpControl,
      blockedReasons: [...blockedReasons, ...cdpBlockedReasons],
      externalUploadRequired: true,
      externalReviewCommand,
      nextAction: status === 'prepared'
        ? 'EdgeのCDP操作でWeb Gemini画面まで確認しました。外部送信はまだ実行していません。'
        : 'EdgeのWeb Gemini操作に必要な前提が不足しています。'
    });
    console.log(JSON.stringify({
      status,
      draftId: target.draft.id,
      outputVideoPath: target.videoPath,
      promptPath,
      edgeControl,
      cdpControl,
      blockedReasons: [...blockedReasons, ...cdpBlockedReasons],
      externalUploadRequired: true,
      externalReviewCommand,
      executeFlag: '--execute'
    }, null, 2));
    if (status === 'blocked') {
      process.exitCode = 1;
    }
    return;
  }

  if (blockedReasons.length || args.has('--diagnose-only') || !shouldExecuteWebGemini) {
    const status = blockedReasons.length ? 'blocked' : 'prepared';
    await writeRunLog(target, status, {
      promptPath,
      edgeControl,
      blockedReasons,
      externalUploadRequired: true,
      externalReviewCommand,
      nextAction: blockedReasons.length
        ? 'EdgeでWeb Geminiへ動画を送る前提が不足しています。Edgeの開発者メニューでApple Events JavaScriptを許可してから再実行してください。'
        : shouldExecuteWebGemini
          ? 'レビュー対象動画と依頼文を確認しました。次はAIエージェントがEdgeのWeb Geminiで動画アップロードと回答取得を実行します。'
          : 'レビュー対象動画と依頼文を確認しました。外部送信はまだ実行していません。実行する場合は --execute を付けてください。'
    });
    console.log(JSON.stringify({
      status,
      draftId: target.draft.id,
      outputVideoPath: target.videoPath,
      promptPath,
      edgeControl,
      blockedReasons,
      externalUploadRequired: true,
      externalReviewCommand,
      executeFlag: '--execute'
    }, null, 2));
    return;
  }

  await writeRunLog(target, 'running', {
    promptPath,
    edgeControl,
    externalReviewCommand,
    nextAction: 'EdgeのWeb Geminiへ動画と依頼文を送り、回答を取得しています。'
  });
  let reviewText;
  let review;
  try {
    reviewText = await runWebGeminiReview(target, promptText);
    review = await saveReviewFromText(target, promptText, reviewText);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await writeRunLog(target, 'failed', {
      promptPath,
      edgeControl,
      blockedReasons: [errorMessage],
      externalUploadRequired: true,
      externalReviewCommand,
      nextAction: 'Web Geminiレビュー実行に失敗しました。停止理由を確認してから再実行してください。'
    });
    throw error;
  }
  await writeRunLog(target, 'saved', {
    promptPath,
    edgeControl,
    reviewPath: path.join(runtimeDir, 'artifacts', target.draft.id, reviewFileName),
    reviewCreatedAt: review.createdAt
  });
  console.log(JSON.stringify({
    status: 'saved',
    draftId: target.draft.id,
    outputVideoPath: target.videoPath,
    promptPath,
    reviewPath: path.join(runtimeDir, 'artifacts', target.draft.id, reviewFileName),
    reviewPreview: review.reviewText.slice(0, 240)
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
