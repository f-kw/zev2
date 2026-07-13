#!/usr/bin/env node
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

type CliOptions = {
  promptPath: string;
  outputPath: string;
  model: string;
  params: Record<string, unknown>;
  cdpPort: number;
  timeoutMs: number;
  diagnoseOnly: boolean;
  extractExisting: boolean;
  rejectPartialExtraction: boolean;
  closeTabAfterRun: boolean;
};

type BrowserTarget = {
  id?: string;
  type?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
};

type SelectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
  usedSpeechIds?: number[];
  [key: string]: unknown;
};

type ThemeCandidate = {
  themeId?: string;
  title: string;
  summary?: string;
  whyItCanBeClipped?: string;
  sourceVideoId?: string;
  sourceStartMs?: number;
  sourceEndMs?: number;
  evidenceRanges?: Array<{
    sourceVideoId?: string;
    sourceStartMs: number;
    sourceEndMs: number;
    supportingSpeechIds?: Array<number | string>;
  }>;
  supportingSpeechIds?: Array<number | string>;
  representativeQuote?: string;
  riskNotes?: string[];
  [key: string]: unknown;
};

type BoundaryRefinement = {
  provisionalCutIndex: number;
  startBoundaryPointId: string;
  endBoundaryPointId: string;
  startReason: string;
  endReason: string;
  [key: string]: unknown;
};

type RankedCandidate = {
  rank: number;
  candidateId: number;
  reason: string;
  [key: string]: unknown;
};

type CallbackFinding = {
  targetId: string;
  causeSpeechIds: Array<number | string>;
  sceneDescription: string;
  causalLink: string;
  missingContextSupplied: string;
  [key: string]: unknown;
};

type CallbackDecision = {
  targetId: string;
  decision: 'actual_separate_cause' | 'supporting_context_only' | 'same_scene_recap' | 'unrelated' | 'insufficient';
  primaryFindingId: string | null;
  alternativeFindingIds: string[];
  reason: string;
  [key: string]: unknown;
};

type PromptOutput = {
  selectedCuts?: SelectedCut[];
  themes?: ThemeCandidate[];
  refinements?: BoundaryRefinement[];
  rankedCandidates?: RankedCandidate[];
  callbackFindings?: CallbackFinding[];
  callbackDecisions?: CallbackDecision[];
  [key: string]: unknown;
};

type GeminiExtractionFailureDiagnostic = {
  message: string;
  pageUrl: string;
  stillRunning: boolean;
  rawResponseText: string;
  bodyTextEnd: string;
};

type PendingCall = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');
const responseStabilityMs = 3000;

function workspaceRoot(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つからないため評価環境の位置を確認できません');
    }
    current = parent;
  }
}

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }

    const inlineValueIndex = item.indexOf('=');
    if (inlineValueIndex >= 0) {
      values.set(item.slice(2, inlineValueIndex), item.slice(inlineValueIndex + 1));
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }
    values.set(key, next);
    index += 1;
  }

  const diagnoseOnly = values.has('diagnoseOnly');
  const extractExisting = values.has('extractExisting');
  const rejectPartialExtraction = values.has('rejectPartialExtraction');
  const closeTabAfterRun = values.has('closeTabAfterRun');
  const promptPath = values.get('prompt')?.trim();
  if (!promptPath && !diagnoseOnly && !extractExisting) {
    throw new Error('--prompt でWeb Geminiに送るプロンプトファイルを指定してください');
  }

  const outputPath = values.get('output')?.trim();
  if (!outputPath && !diagnoseOnly) {
    throw new Error('--output でGemini返答の保存先JSONを指定してください');
  }

  const rawParams = values.get('params')?.trim();
  const params = rawParams
    ? parseParams(rawParams)
    : {
      temperature: 'web-default',
      source: 'gemini-web',
      manualRun: false,
      runner: 'edge-cdp-text-prompt'
    };

  return {
    promptPath: promptPath ? path.resolve(promptPath) : '',
    outputPath: outputPath ? assertOutputPath(path.resolve(outputPath)) : '',
    model: values.get('model')?.trim() || 'gemini-web-flash',
    params,
    cdpPort: Number(values.get('cdpPort') || '9222'),
    timeoutMs: Number(values.get('timeoutMs') || '240000'),
    diagnoseOnly,
    extractExisting,
    rejectPartialExtraction,
    closeTabAfterRun
  };
}

function parseParams(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('--params はJSONオブジェクトで指定してください');
  }
  return parsed as Record<string, unknown>;
}

function assertOutputPath(outputPath: string): string {
  const outputRoot = path.join(evalRoot, 'outputs');
  if (outputPath !== outputRoot && !outputPath.startsWith(`${outputRoot}${path.sep}`)) {
    throw new Error(`Gemini返答の保存先はeval outputs配下に限定します: ${outputPath}`);
  }
  return outputPath;
}

function tokyoTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}+09:00`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class CdpClient {
  private readonly socket: net.Socket;
  private nextId = 1;
  private readonly pending = new Map<number, PendingCall>();
  private buffer = Buffer.alloc(0);

  private constructor(socket: net.Socket) {
    this.socket = socket;
    this.socket.on('data', (chunk) => this.readFrames(chunk));
    this.socket.on('error', (error) => this.rejectAll(error));
    this.socket.on('close', () => this.rejectAll(new Error('CDP接続が閉じました')));
  }

  static connect(webSocketUrl: string): Promise<CdpClient> {
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

      const onHandshakeData = (chunk: Buffer) => {
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

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject
      });
      this.socket.write(encodeWebSocketTextFrame(payload));
    });
  }

  close(): void {
    this.socket.end();
  }

  private readFrames(chunk: Buffer): void {
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

      let mask: Buffer | undefined;
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

  private handleMessage(message: Record<string, unknown>): void {
    if (typeof message.id !== 'number') {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }
    this.pending.delete(message.id);
    if (message.error) {
      const error = message.error as { message?: string };
      pending.reject(new Error(error.message ?? JSON.stringify(message.error)));
    } else {
      pending.resolve(message.result);
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function encodeWebSocketTextFrame(text: string): Buffer {
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

async function fetchCdpJson<T>(cdpPort: number, pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`http://127.0.0.1:${cdpPort}${pathname}`, init);
  if (!response.ok) {
    throw new Error(`CDP HTTP ${response.status}: ${pathname}`);
  }
  return response.json() as Promise<T>;
}

async function closeCdpTarget(cdpPort: number, targetId: string | undefined): Promise<void> {
  if (!targetId) {
    return;
  }
  await fetch(`http://127.0.0.1:${cdpPort}/json/close/${encodeURIComponent(targetId)}`).catch(() => null);
}

async function getGeminiTarget(cdpPort: number): Promise<BrowserTarget> {
  const createResponse = await fetch(
    `http://127.0.0.1:${cdpPort}/json/new?https://gemini.google.com/app%3Fhl%3Dja`,
    { method: 'PUT' }
  ).catch(() => null);
  if (createResponse?.ok) {
    return createResponse.json() as Promise<BrowserTarget>;
  }

  const targets = await fetchCdpJson<BrowserTarget[]>(cdpPort, '/json/list');
  const target = targets.find((item) =>
    item.type === 'page' && String(item.url ?? '').startsWith('https://gemini.google.com/app')
  );
  if (!target) {
    throw new Error('Web Geminiタブを取得できません');
  }
  return target;
}

async function getExistingGeminiTargets(cdpPort: number): Promise<BrowserTarget[]> {
  const targets = await fetchCdpJson<BrowserTarget[]>(cdpPort, '/json/list');
  return targets.filter((item) =>
    item.type === 'page' && String(item.url ?? '').startsWith('https://gemini.google.com/app')
  );
}

async function evaluateValue<T>(cdp: CdpClient, expression: string, timeoutMs = 30000): Promise<T> {
  const result = await cdp.send<{ result?: { value?: T }; exceptionDetails?: { text?: string } }>('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Web Gemini画面のJavaScript実行に失敗しました');
  }
  return result.result?.value as T;
}

async function waitForExpression<T>(
  cdp: CdpClient,
  expression: string,
  label: string,
  timeoutMs = 60000
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await evaluateValue<T | undefined>(cdp, expression).catch(() => undefined);
    if (value) {
      return value;
    }
    await wait(500);
  }
  throw new Error(`${label} を確認できません`);
}

async function clickCenter(cdp: CdpClient, rect: { x: number; y: number; w: number; h: number }): Promise<void> {
  const x = rect.x + rect.w / 2;
  const y = rect.y + rect.h / 2;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function clearPromptInput(cdp: CdpClient): Promise<void> {
  await evaluateValue(cdp, `(() => {
    const boxes = Array.from(document.querySelectorAll('[role="textbox"], textarea, [contenteditable="true"]'));
    const visibleBoxes = boxes.filter((box) => {
      const rect = box.getBoundingClientRect();
      return rect.width > 50 && rect.height > 20;
    });
    const box = visibleBoxes[visibleBoxes.length - 1];
    if (!box) return false;
    box.focus();
    if ('value' in box) {
      box.value = '';
    } else {
      box.textContent = '';
    }
    box.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
    return true;
  })()`);
}

async function enterPrompt(cdp: CdpClient, promptText: string): Promise<void> {
  const textboxRect = await waitForExpression<{ x: number; y: number; w: number; h: number }>(
    cdp,
    `(() => {
      const boxes = Array.from(document.querySelectorAll('[role="textbox"], textarea, [contenteditable="true"]'));
      const visibleBoxes = boxes.filter((box) => {
        const rect = box.getBoundingClientRect();
        return rect.width > 50 && rect.height > 20;
      });
      const box = visibleBoxes[visibleBoxes.length - 1];
      if (!box) return null;
      const rect = box.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    })()`,
    'プロンプト入力欄'
  );
  await clickCenter(cdp, textboxRect);
  await cdp.send('Input.insertText', { text: promptText });
}

async function clickSendPromptButton(cdp: CdpClient): Promise<void> {
  await waitForExpression(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll('button')).find((candidate) => {
        const text = (candidate.innerText || '').trim();
        const aria = candidate.getAttribute('aria-label') || '';
        const icon = candidate.querySelector('mat-icon, [data-mat-icon-name]');
        const iconText = (icon?.innerText || icon?.getAttribute('data-mat-icon-name') || '').trim();
        return /プロンプトを送信|送信|submit|send|send$/i.test(text + ' ' + aria + ' ' + iconText) && !candidate.disabled;
      });
      if (!button) return false;
      button.click();
      return true;
    })()`,
    '送信ボタン',
    30000
  );
}

async function diagnoseGeminiPages(options: CliOptions): Promise<void> {
  const targets = await getExistingGeminiTargets(options.cdpPort);
  if (targets.length === 0) {
    throw new Error('診断対象のWeb Geminiタブがありません');
  }

  const reports: unknown[] = [];
  for (const target of targets) {
    if (!target.webSocketDebuggerUrl) {
      continue;
    }
    const cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
    try {
      await cdp.send('Runtime.enable');
      const state = await evaluateValue(cdp, `(() => {
        const textboxes = Array.from(document.querySelectorAll('[role="textbox"], textarea, [contenteditable="true"]')).map((box) => {
          const rect = box.getBoundingClientRect();
          const text = ('value' in box ? box.value : box.innerText || box.textContent || '');
          return {
            tag: box.tagName,
            role: box.getAttribute('role') || '',
            aria: box.getAttribute('aria-label') || '',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            textLength: String(text).length,
            textStart: String(text).slice(0, 160),
            textEnd: String(text).slice(-160)
          };
        });
        const buttons = Array.from(document.querySelectorAll('button')).slice(-40).map((button) => {
          const icon = button.querySelector('mat-icon, [data-mat-icon-name]');
          const rect = button.getBoundingClientRect();
          return {
            text: (button.innerText || '').trim().slice(0, 80),
            aria: button.getAttribute('aria-label') || '',
            disabled: button.disabled,
            iconText: (icon?.innerText || icon?.getAttribute('data-mat-icon-name') || '').trim(),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        });
        const bodyText = document.body.innerText || '';
        return {
          title: document.title,
          url: location.href,
          bodyLength: bodyText.length,
          bodyStart: bodyText.slice(0, 1200),
          bodyEnd: bodyText.slice(-2400),
          textboxes,
          buttons
        };
      })()`);
      reports.push(state);
    } finally {
      cdp.close();
    }
  }

  console.log(JSON.stringify(reports, null, 2));
}

async function acceptVisibleNotice(cdp: CdpClient): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const clicked = await evaluateValue<boolean>(cdp, `(() => {
      const button = Array.from(document.querySelectorAll('button')).find((candidate) => {
        const text = (candidate.innerText || '').trim();
        return ['同意する', 'OK', '続行'].includes(text) && !candidate.disabled;
      });
      if (!button) return false;
      button.click();
      return true;
    })()`).catch(() => false);
    if (clicked) {
      await wait(1000);
      return;
    }
    await wait(500);
  }
}

function normalizeText(text: string): string {
  return text.replace(/\r/g, '').trim();
}

function truncateTrailingPromptEcho(answerText: string, promptText: string): string {
  const markers = [
    normalizeText(promptText).split('\n')[0],
    '# clip_composition_prompt_',
    '## 入力JSON'
  ].filter((marker): marker is string => Boolean(marker && marker.trim()));

  let truncated = answerText;
  for (const marker of markers) {
    const index = truncated.indexOf(marker);
    if (index > 0) {
      truncated = truncated.slice(0, index);
    }
  }
  return truncated.trim();
}

function extractAnswerText(bodyText: string, promptText: string): string {
  const normalizedBody = normalizeText(bodyText);
  const answerMarker = 'Gemini の回答';
  const answerStart = normalizedBody.lastIndexOf(answerMarker);
  if (answerStart >= 0) {
    return truncateTrailingPromptEcho(normalizedBody.slice(answerStart + answerMarker.length), promptText);
  }

  const promptHead = normalizeText(promptText).split('\n')[0] ?? '';
  const promptStart = promptHead ? normalizedBody.lastIndexOf(promptHead) : -1;
  if (promptStart >= 0) {
    return truncateTrailingPromptEcho(normalizedBody.slice(promptStart + normalizeText(promptText).length), promptText);
  }

  return truncateTrailingPromptEcho(normalizedBody, promptText);
}

type ExtractOptions = {
  prefer: 'first' | 'last';
  allowPartial: boolean;
};

function extractPromptOutput(text: string, options: ExtractOptions = { prefer: 'last', allowPartial: false }): PromptOutput | undefined {
  const fenceOutput = extractFromCodeFences(text, options.prefer);
  if (fenceOutput) {
    return fenceOutput;
  }
  const balancedOutput = extractFromBalancedObjects(text, options.prefer);
  if (balancedOutput) {
    return balancedOutput;
  }
  return options.allowPartial
    ? (extractPartialSelectedCuts(text) ?? extractPartialThemes(text))
    : undefined;
}

function ordered<T>(items: T[], prefer: 'first' | 'last'): T[] {
  return prefer === 'first' ? items : [...items].reverse();
}

function extractFromCodeFences(text: string, prefer: 'first' | 'last'): PromptOutput | undefined {
  const matches = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of ordered(matches, prefer)) {
    const parsed = safeParsePromptOutput(match[1]?.trim() ?? '');
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

function extractFromBalancedObjects(text: string, prefer: 'first' | 'last'): PromptOutput | undefined {
  const starts: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '{') {
      starts.push(index);
    }
  }

  for (const start of ordered(starts, prefer)) {
    const end = findJsonObjectEnd(text, start);
    if (end < 0) {
      continue;
    }
    const parsed = safeParsePromptOutput(text.slice(start, end + 1));
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

function extractPartialSelectedCuts(text: string): PromptOutput | undefined {
  if (!text.includes('"selectedCuts"')) {
    return undefined;
  }

  const selectedCuts: SelectedCut[] = [];
  const cutPattern = /"sourceStartMs"\s*:\s*(\d+)[\s\S]{0,500}?"sourceEndMs"\s*:\s*(\d+)([\s\S]{0,900}?)(?=\n\s*\}\s*,|\n\s*\}\s*\]|\n\s*\{\s*"sourceStartMs"|$)/g;
  for (const match of text.matchAll(cutPattern)) {
    const sourceStartMs = Number(match[1]);
    const sourceEndMs = Number(match[2]);
    if (!Number.isFinite(sourceStartMs) || !Number.isFinite(sourceEndMs) || sourceEndMs <= sourceStartMs) {
      continue;
    }

    const reason = extractReasonFromCutText(match[3] ?? '')
      ?? 'Gemini回答が途中で切れたため、理由文字列は完全には取得できなかった。sourceStartMs/sourceEndMsは回答本文に出ていた値を採点用に保持した。';
    selectedCuts.push({
      sourceStartMs,
      sourceEndMs,
      reason
    });
  }

  if (selectedCuts.length === 0) {
    return undefined;
  }

  return {
    selectedCuts,
    extractionStatus: {
      status: 'partial_selectedCuts_extracted_from_answer_text',
      reason: 'Gemini回答JSONが完結していないため、回答本文に出ていた区間だけを採点候補として抽出した。',
      extractedCutCount: selectedCuts.length
    }
  };
}

function extractPartialThemes(text: string): PromptOutput | undefined {
  if (!text.includes('"themes"')) {
    return undefined;
  }

  const themes: ThemeCandidate[] = [];
  const themePattern = /"sourceStartMs"\s*:\s*(\d+)[\s\S]{0,900}?"sourceEndMs"\s*:\s*(\d+)([\s\S]{0,1400}?)(?=\n\s*\}\s*,|\n\s*\}\s*\]|\n\s*\{\s*"themeId"|$)/g;
  for (const match of text.matchAll(themePattern)) {
    const sourceStartMs = Number(match[1]);
    const sourceEndMs = Number(match[2]);
    if (!Number.isFinite(sourceStartMs) || !Number.isFinite(sourceEndMs) || sourceEndMs <= sourceStartMs) {
      continue;
    }
    const body = match[3] ?? '';
    themes.push({
      themeId: extractStringField(body, 'themeId') ?? `partial_theme_${themes.length + 1}`,
      title: extractStringField(body, 'title') ?? 'Gemini回答が途中で切れたため、タイトルは完全には取得できなかった。',
      summary: extractStringField(body, 'summary'),
      whyItCanBeClipped: extractStringField(body, 'whyItCanBeClipped'),
      sourceVideoId: extractStringField(body, 'sourceVideoId'),
      sourceStartMs,
      sourceEndMs,
      representativeQuote: extractStringField(body, 'representativeQuote')
    });
  }

  if (themes.length === 0) {
    return undefined;
  }

  return {
    themes,
    extractionStatus: {
      status: 'partial_themes_extracted_from_answer_text',
      reason: 'Gemini回答JSONが完結していないため、回答本文に出ていたテーマ候補だけを採点候補として抽出した。',
      extractedThemeCount: themes.length
    }
  };
}

function extractStringField(text: string, fieldName: string): string | undefined {
  const marker = text.match(new RegExp(`"${fieldName}"\\s*:\\s*"`));
  if (!marker || marker.index === undefined) {
    return undefined;
  }
  const start = marker.index + marker[0].length;
  let escaped = false;
  let value = '';
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      return value;
    }
    value += char;
  }
  return value.trim() ? `${value.trim()} [回答途中切れ]` : undefined;
}

function extractReasonFromCutText(text: string): string | undefined {
  const marker = text.match(/"reason"\s*:\s*"/);
  if (!marker || marker.index === undefined) {
    return undefined;
  }
  const start = marker.index + marker[0].length;
  let escaped = false;
  let reason = '';
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      reason += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      return reason;
    }
    reason += char;
  }
  return reason.trim() ? `${reason.trim()} [回答途中切れ]` : undefined;
}

function findJsonObjectEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function safeParsePromptOutput(text: string): PromptOutput | undefined {
  try {
    return parsePromptOutput(text);
  } catch {
    return undefined;
  }
}

function parsePromptOutput(text: string): PromptOutput | undefined {
  const parsed = tryJsonParse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.selectedCuts)
    && !Array.isArray(record.themes)
    && !Array.isArray(record.refinements)
    && !Array.isArray(record.rankedCandidates)
    && !Array.isArray(record.callbackFindings)
    && !Array.isArray(record.callbackDecisions)) {
    return undefined;
  }

  const selectedCuts = Array.isArray(record.selectedCuts)
    ? record.selectedCuts.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return undefined;
      }
      const cut = item as Record<string, unknown>;
      if (typeof cut.sourceStartMs !== 'number' || typeof cut.sourceEndMs !== 'number' || typeof cut.reason !== 'string') {
        return undefined;
      }
      return cut as SelectedCut;
    }).filter((item): item is SelectedCut => Boolean(item))
    : undefined;
  const themes = Array.isArray(record.themes)
    ? record.themes.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return undefined;
      }
      const theme = item as Record<string, unknown>;
      const evidenceRanges = Array.isArray(theme.evidenceRanges)
        ? theme.evidenceRanges.filter((range) => (
          range
          && typeof range === 'object'
          && !Array.isArray(range)
          && typeof (range as Record<string, unknown>).sourceStartMs === 'number'
          && typeof (range as Record<string, unknown>).sourceEndMs === 'number'
          && Number((range as Record<string, unknown>).sourceEndMs) > Number((range as Record<string, unknown>).sourceStartMs)
        ))
        : [];
      const hasTopLevelRange = typeof theme.sourceStartMs === 'number'
        && typeof theme.sourceEndMs === 'number'
        && theme.sourceEndMs > theme.sourceStartMs;
      if (typeof theme.title !== 'string' || (!hasTopLevelRange && evidenceRanges.length === 0)) {
        return undefined;
      }
      return theme as ThemeCandidate;
    }).filter((item): item is ThemeCandidate => Boolean(item))
    : undefined;
  const refinements = Array.isArray(record.refinements)
    ? record.refinements.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return undefined;
      }
      const refinement = item as Record<string, unknown>;
      if (typeof refinement.provisionalCutIndex !== 'number'
        || !Number.isInteger(refinement.provisionalCutIndex)
        || typeof refinement.startBoundaryPointId !== 'string'
        || typeof refinement.endBoundaryPointId !== 'string'
        || typeof refinement.startReason !== 'string'
        || typeof refinement.endReason !== 'string') {
        return undefined;
      }
      return refinement as BoundaryRefinement;
    }).filter((item): item is BoundaryRefinement => Boolean(item))
    : undefined;
  const rankedCandidates = Array.isArray(record.rankedCandidates)
    ? record.rankedCandidates.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return undefined;
      }
      const ranked = item as Record<string, unknown>;
      if (typeof ranked.rank !== 'number'
        || !Number.isInteger(ranked.rank)
        || typeof ranked.candidateId !== 'number'
        || !Number.isInteger(ranked.candidateId)
        || typeof ranked.reason !== 'string') {
        return undefined;
      }
      return ranked as RankedCandidate;
    }).filter((item): item is RankedCandidate => Boolean(item))
    : undefined;
  const callbackFindings = Array.isArray(record.callbackFindings)
    ? record.callbackFindings.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return undefined;
      }
      const finding = item as Record<string, unknown>;
      if (typeof finding.targetId !== 'string'
        || !finding.targetId.trim()
        || !Array.isArray(finding.causeSpeechIds)
        || finding.causeSpeechIds.length === 0
        || !finding.causeSpeechIds.every((value) => (
          (typeof value === 'number' && Number.isInteger(value) && value > 0)
          || (typeof value === 'string' && value.trim().length > 0)
        ))
        || typeof finding.sceneDescription !== 'string'
        || !finding.sceneDescription.trim()
        || typeof finding.causalLink !== 'string'
        || !finding.causalLink.trim()
        || typeof finding.missingContextSupplied !== 'string'
        || !finding.missingContextSupplied.trim()) {
        return undefined;
      }
      return finding as CallbackFinding;
    }).filter((item): item is CallbackFinding => Boolean(item))
    : undefined;
  const allowedCallbackDecisions = new Set([
    'actual_separate_cause',
    'supporting_context_only',
    'same_scene_recap',
    'unrelated',
    'insufficient'
  ]);
  const callbackDecisions = Array.isArray(record.callbackDecisions)
    ? record.callbackDecisions.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return undefined;
      }
      const decision = item as Record<string, unknown>;
      if (typeof decision.targetId !== 'string'
        || !decision.targetId.trim()
        || typeof decision.decision !== 'string'
        || !allowedCallbackDecisions.has(decision.decision)
        || !(decision.primaryFindingId === null || typeof decision.primaryFindingId === 'string')
        || !Array.isArray(decision.alternativeFindingIds)
        || !decision.alternativeFindingIds.every((value) => typeof value === 'string')
        || typeof decision.reason !== 'string'
        || !decision.reason.trim()) {
        return undefined;
      }
      return decision as CallbackDecision;
    }).filter((item): item is CallbackDecision => Boolean(item))
    : undefined;
  const isValidEmptyThemes = Array.isArray(record.themes)
    && record.themes.length === 0;
  const containsOnlyInvalidThemes = Array.isArray(record.themes)
    && record.themes.length > 0
    && themes?.length === 0;
  const containsOnlyInvalidSelectedCuts = Array.isArray(record.selectedCuts)
    && record.selectedCuts.length > 0
    && selectedCuts?.length === 0;
  const containsOnlyInvalidRefinements = Array.isArray(record.refinements)
    && record.refinements.length > 0
    && refinements?.length === 0;
  const containsOnlyInvalidRankedCandidates = Array.isArray(record.rankedCandidates)
    && record.rankedCandidates.length > 0
    && rankedCandidates?.length === 0;
  const containsOnlyInvalidCallbackFindings = Array.isArray(record.callbackFindings)
    && record.callbackFindings.length > 0
    && callbackFindings?.length === 0;
  const containsOnlyInvalidCallbackDecisions = Array.isArray(record.callbackDecisions)
    && record.callbackDecisions.length > 0
    && callbackDecisions?.length === 0;
  const isValidEmptyCallbackFindings = Array.isArray(record.callbackFindings)
    && record.callbackFindings.length === 0;
  const isValidEmptyCallbackDecisions = Array.isArray(record.callbackDecisions)
    && record.callbackDecisions.length === 0;
  if (containsOnlyInvalidThemes
    || containsOnlyInvalidSelectedCuts
    || containsOnlyInvalidRefinements
    || containsOnlyInvalidRankedCandidates
    || containsOnlyInvalidCallbackFindings
    || containsOnlyInvalidCallbackDecisions) {
    return undefined;
  }
  if ((!selectedCuts || selectedCuts.length === 0)
    && (!themes || themes.length === 0)
    && (!refinements || refinements.length === 0)
    && (!rankedCandidates || rankedCandidates.length === 0)
    && (!callbackFindings || callbackFindings.length === 0)
    && (!callbackDecisions || callbackDecisions.length === 0)
    && !isValidEmptyThemes
    && !isValidEmptyCallbackFindings
    && !isValidEmptyCallbackDecisions) {
    return undefined;
  }

  return {
    ...record,
    ...(selectedCuts ? { selectedCuts } : {}),
    ...(themes ? { themes } : {}),
    ...(refinements ? { refinements } : {}),
    ...(rankedCandidates ? { rankedCandidates } : {}),
    ...(callbackFindings ? { callbackFindings } : {}),
    ...(callbackDecisions ? { callbackDecisions } : {})
  };
}

function tryJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function canonicalOutput(output: PromptOutput | undefined): string {
  if (!output) {
    return '';
  }
  if (output.selectedCuts) {
    return JSON.stringify(output.selectedCuts.map((cut) => ({
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      reason: cut.reason,
      usedSpeechIds: cut.usedSpeechIds
    })));
  }
  if (output.refinements) {
    return JSON.stringify(output.refinements.map((refinement) => ({
      provisionalCutIndex: refinement.provisionalCutIndex,
      startBoundaryPointId: refinement.startBoundaryPointId,
      endBoundaryPointId: refinement.endBoundaryPointId,
      startReason: refinement.startReason,
      endReason: refinement.endReason
    })));
  }
  if (output.rankedCandidates) {
    return JSON.stringify(output.rankedCandidates.map((ranked) => ({
      rank: ranked.rank,
      candidateId: ranked.candidateId,
      reason: ranked.reason
    })));
  }
  if (output.callbackFindings) {
    return JSON.stringify(output.callbackFindings.map((finding) => ({
      targetId: finding.targetId,
      causeSpeechIds: finding.causeSpeechIds,
      sceneDescription: finding.sceneDescription,
      causalLink: finding.causalLink,
      missingContextSupplied: finding.missingContextSupplied
    })));
  }
  if (output.callbackDecisions) {
    return JSON.stringify(output.callbackDecisions.map((decision) => ({
      targetId: decision.targetId,
      decision: decision.decision,
      primaryFindingId: decision.primaryFindingId,
      alternativeFindingIds: decision.alternativeFindingIds,
      reason: decision.reason
    })));
  }
  return JSON.stringify((output.themes ?? []).map((theme) => ({
    themeId: theme.themeId,
    title: theme.title,
    sourceVideoId: theme.sourceVideoId,
    sourceStartMs: theme.sourceStartMs,
    sourceEndMs: theme.sourceEndMs,
    evidenceRanges: theme.evidenceRanges,
    supportingSpeechIds: theme.supportingSpeechIds
  })));
}

function containsPromptOutputMarker(text: string): boolean {
  return text.includes('"selectedCuts"')
    || text.includes('"themes"')
    || text.includes('"refinements"')
    || text.includes('"rankedCandidates"')
    || text.includes('"callbackFindings"')
    || text.includes('"callbackDecisions"');
}

function isPartialExtraction(output: PromptOutput | undefined): boolean {
  const status = output && typeof output.extractionStatus === 'object' && output.extractionStatus
    ? String((output.extractionStatus as { status?: unknown }).status ?? '')
    : '';
  return status.includes('partial');
}

async function waitForGeminiOutput(
  cdp: CdpClient,
  promptText: string,
  previousCanonical: string,
  timeoutMs: number,
  rejectPartialExtraction: boolean
): Promise<{ output: PromptOutput; rawResponseText: string; pageUrl: string }> {
  const deadline = Date.now() + timeoutMs;
  let stableCanonical = '';
  let stableSince = 0;
  let latestRawText = '';
  let latestOutput: PromptOutput | undefined;
  let latestPageUrl = '';
  let latestStillRunning = false;
  let latestBodyTextEnd = '';

  while (Date.now() < deadline) {
    const state = await evaluateValue<{ bodyText: string; stillRunning: boolean; pageUrl: string }>(cdp, `(() => {
      const bodyText = document.body.innerText || '';
      const stillRunning = Array.from(document.querySelectorAll('button')).some((button) => {
        const text = (button.innerText || '').trim();
        const aria = button.getAttribute('aria-label') || '';
        return /回答を停止|生成中|考えています/.test(text + ' ' + aria);
      });
      return { bodyText, stillRunning, pageUrl: location.href };
    })()`);
    const answerText = extractAnswerText(state.bodyText ?? '', promptText);
    latestRawText = answerText;
    latestPageUrl = state.pageUrl;
    latestStillRunning = state.stillRunning;
    latestBodyTextEnd = String(state.bodyText ?? '').slice(-8000);
    const answerOutput = extractPromptOutput(answerText, { prefer: 'first', allowPartial: !rejectPartialExtraction });
    const output = answerOutput ?? (
      containsPromptOutputMarker(answerText)
        ? undefined
        : extractPromptOutput(state.bodyText ?? '', { prefer: 'last', allowPartial: false })
    );
    if (output && isPartialExtraction(output) && rejectPartialExtraction) {
      throw new Error('Gemini回答JSONが完結していないため、途中切れ抽出を保存せず失敗扱いにしました');
    }
    const currentCanonical = canonicalOutput(output);
    if (output && currentCanonical && currentCanonical !== previousCanonical) {
      latestRawText = answerText;
      latestOutput = output;
    }
    if (output && currentCanonical && currentCanonical !== previousCanonical && !state.stillRunning) {
      if (currentCanonical !== stableCanonical) {
        stableCanonical = currentCanonical;
        stableSince = Date.now();
      } else if (Date.now() - stableSince >= responseStabilityMs) {
        return {
          output,
          rawResponseText: latestRawText,
          pageUrl: state.pageUrl
        };
      }
    } else {
      stableCanonical = '';
      stableSince = 0;
    }
    await wait(1000);
  }

  if (latestOutput && !rejectPartialExtraction) {
    return {
      output: latestOutput,
      rawResponseText: latestRawText,
      pageUrl: await evaluateValue<string>(cdp, 'location.href').catch(() => '')
    };
  }

  const error = new Error('Gemini返答から対応する評価JSONを取得できません') as Error & {
    geminiDiagnostic?: GeminiExtractionFailureDiagnostic;
  };
  error.geminiDiagnostic = {
    message: error.message,
    pageUrl: latestPageUrl,
    stillRunning: latestStillRunning,
    rawResponseText: latestRawText,
    bodyTextEnd: latestBodyTextEnd
  };
  throw error;
}

async function writeGeminiOutput(
  options: CliOptions,
  output: PromptOutput,
  rawResponseText: string,
  pageUrl: string
): Promise<void> {
  const runAt = tokyoTimestamp(new Date());
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify({
    ...output,
    runAt,
    model: options.model,
    params: options.params,
    promptFile: options.promptPath ? path.relative(evalRoot, options.promptPath) : undefined,
    pageUrl,
    rawResponseText
  }, null, 2)}\n`, 'utf8');
  console.log(`gemini output: ${options.outputPath}`);
  if (output.selectedCuts?.[0]) {
    console.log(`selected cut: ${output.selectedCuts[0].sourceStartMs}-${output.selectedCuts[0].sourceEndMs}`);
  } else if (output.refinements) {
    console.log(`refinements: ${output.refinements.length}`);
  } else if (output.rankedCandidates) {
    console.log(`ranked candidates: ${output.rankedCandidates.length}`);
  } else if (output.callbackFindings) {
    console.log(`callback findings: ${output.callbackFindings.length}`);
  } else if (output.callbackDecisions) {
    console.log(`callback decisions: ${output.callbackDecisions.length}`);
  } else {
    console.log(`themes: ${output.themes?.length ?? 0}`);
  }
}

async function writeGeminiFailureDiagnostic(options: CliOptions, error: unknown): Promise<void> {
  const diagnostic = error instanceof Error && 'geminiDiagnostic' in error
    ? (error as Error & { geminiDiagnostic?: GeminiExtractionFailureDiagnostic }).geminiDiagnostic
    : undefined;
  if (!diagnostic) {
    return;
  }
  const diagnosticPath = `${options.outputPath}.failure.json`;
  await mkdir(path.dirname(diagnosticPath), { recursive: true });
  await writeFile(diagnosticPath, `${JSON.stringify({
    runAt: tokyoTimestamp(new Date()),
    status: 'not_usable_for_scoring_or_human_review',
    reason: 'Web Geminiの返答から完全な評価JSONを取得できなかったため、診断用に画面本文だけを保存した。',
    model: options.model,
    params: options.params,
    promptFile: options.promptPath ? path.relative(evalRoot, options.promptPath) : undefined,
    diagnostic
  }, null, 2)}\n`, 'utf8');
  console.log(`gemini failure diagnostic: ${diagnosticPath}`);
}

async function extractExistingGeminiOutput(options: CliOptions): Promise<void> {
  const targets = await getExistingGeminiTargets(options.cdpPort);
  for (const target of targets) {
    if (!target.webSocketDebuggerUrl) {
      continue;
    }
    const cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
    try {
      await cdp.send('Runtime.enable');
      const state = await evaluateValue<{ bodyText: string; pageUrl: string }>(cdp, `(() => ({
        bodyText: document.body.innerText || '',
        pageUrl: location.href
      }))()`);
      const answerText = extractAnswerText(state.bodyText ?? '', '');
      const answerOutput = extractPromptOutput(answerText, { prefer: 'first', allowPartial: !options.rejectPartialExtraction });
      const output = answerOutput ?? (
        containsPromptOutputMarker(answerText)
          ? undefined
          : extractPromptOutput(state.bodyText ?? '', { prefer: 'last', allowPartial: false })
      );
      if (!output) {
        continue;
      }
      if (isPartialExtraction(output) && options.rejectPartialExtraction) {
        throw new Error('既存のWeb Geminiタブの回答JSONが途中切れのため、保存せず失敗扱いにしました');
      }
      await writeGeminiOutput(options, output, answerText, state.pageUrl);
      return;
    } finally {
      cdp.close();
    }
  }
  throw new Error('既存のWeb Geminiタブから対応する評価JSONを取得できません');
}

async function runWebGeminiPrompt(options: CliOptions): Promise<void> {
  if (options.diagnoseOnly) {
    await diagnoseGeminiPages(options);
    return;
  }
  if (options.extractExisting) {
    await extractExistingGeminiOutput(options);
    return;
  }

  if (!existsSync(options.promptPath)) {
    throw new Error(`プロンプトファイルが見つかりません: ${options.promptPath}`);
  }

  const promptText = await readFile(options.promptPath, 'utf8');
  const target = await getGeminiTarget(options.cdpPort);
  if (!target.webSocketDebuggerUrl) {
    throw new Error('Web GeminiタブのCDP接続先がありません');
  }

  const cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    await waitForExpression(cdp, 'location.href.startsWith("https://gemini.google.com/app")', 'Web Gemini URL');
    await waitForExpression(cdp, 'document.body.innerText.includes("Gemini")', 'Web Gemini画面');
    await acceptVisibleNotice(cdp);
    await clearPromptInput(cdp);
    await enterPrompt(cdp, promptText);
    const previousOutput = extractPromptOutput(await evaluateValue<string>(cdp, 'document.body.innerText'));
    const previousCanonical = canonicalOutput(previousOutput);
    await clickSendPromptButton(cdp);
    const { output, rawResponseText, pageUrl } = await waitForGeminiOutput(
      cdp,
      promptText,
      previousCanonical,
      options.timeoutMs,
      options.rejectPartialExtraction
    ).catch(async (error: unknown) => {
      await writeGeminiFailureDiagnostic(options, error);
      throw error;
    });
    await writeGeminiOutput(options, output, rawResponseText, pageUrl);
  } finally {
    cdp.close();
    if (options.closeTabAfterRun) {
      await closeCdpTarget(options.cdpPort, target.id);
    }
  }
}

runWebGeminiPrompt(parseOptions(process.argv.slice(2))).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
