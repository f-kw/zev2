#!/usr/bin/env node
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つかりません');
    }
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const eq = item.indexOf('=');
    if (eq >= 0) {
      values.set(item.slice(2, eq), item.slice(eq + 1));
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

  return {
    cdpPort: Number(values.get('cdpPort') ?? 9222),
    inputSet: values.get('inputSet') ?? 'JgybCXMwzZM_source_only_redo_v001',
    generationSystem: values.get('generationSystem') ?? 'theme-llm-v001',
    outputId: values.get('outputId') ?? '20260709-redo-source-bisect-v001',
    cleanupId: values.get('cleanupId') ?? 'gemini-ui-cleanup-20260709-v001',
    dryRun: values.has('dryRun'),
    closeTabs: values.has('closeTabs')
  };
}

function tokyoTimestamp(date) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}+09:00`;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.socket.on('data', (chunk) => this.readFrames(chunk));
    this.socket.on('error', (error) => this.rejectAll(error));
    this.socket.on('close', () => this.rejectAll(new Error('CDP接続が閉じました')));
  }

  static connect(webSocketUrl) {
    const url = new URL(webSocketUrl);
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
          socket.destroy();
          reject(new Error(`CDP WebSocket接続に失敗しました: ${headerText.split('\r\n')[0]}`));
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
    if (typeof message.id !== 'number') {
      return;
    }
    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
      return;
    }
    pending.resolve(message.result);
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
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

async function evaluateValue(cdp, expression, timeoutMs = 30000) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Web Gemini画面のJavaScript実行に失敗しました');
  }
  return result.result?.value;
}

function requestCdp(cdpPort, pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port: cdpPort, path: pathname }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode ?? 0,
          text: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    request.on('error', reject);
  });
}

async function fetchCdpJson(cdpPort, pathname) {
  const response = await requestCdp(cdpPort, pathname);
  if (!response.ok) {
    throw new Error(`CDP HTTP ${response.status}: ${pathname}`);
  }
  return JSON.parse(response.text);
}

async function closeCdpTarget(cdpPort, targetId) {
  const response = await requestCdp(cdpPort, `/json/close/${encodeURIComponent(targetId)}`);
  return {
    targetId,
    ok: response.ok,
    status: response.status,
    text: response.text
  };
}

const pageStateExpression = `(() => {
  const buttons = Array.from(document.querySelectorAll('button')).map((button, index) => {
    const text = (button.innerText || '').trim();
    const aria = button.getAttribute('aria-label') || '';
    const label = [text, aria].filter(Boolean).join(' ');
    const rect = button.getBoundingClientRect();
    return {
      index,
      label,
      visible: rect.width > 0 && rect.height > 0,
      stopLike: /回答を停止|生成を停止|Stop response|Stop generating/.test(label)
    };
  });
  const textboxes = Array.from(document.querySelectorAll('[contenteditable="true"], textarea')).map((box) => {
    const text = box.value || box.innerText || box.textContent || '';
    return { textLength: text.length };
  });
  const bodyText = document.body.innerText || '';
  return {
    title: document.title,
    pageUrl: location.href,
    bodyTextLength: bodyText.length,
    stopLikeButtons: buttons.filter((button) => button.stopLike),
    visibleStopLikeButtons: buttons.filter((button) => button.stopLike && button.visible),
    hasGeneratingText: /回答を停止|生成中|考えています|Stop response|Stop generating/.test(bodyText),
    textboxes
  };
})()`;

const clickStopExpression = `(() => {
  const clicked = [];
  const buttons = Array.from(document.querySelectorAll('button'));
  for (let index = 0; index < buttons.length; index += 1) {
    const button = buttons[index];
    const text = (button.innerText || '').trim();
    const aria = button.getAttribute('aria-label') || '';
    const label = [text, aria].filter(Boolean).join(' ');
    const rect = button.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    if (!visible || !/回答を停止|生成を停止|Stop response|Stop generating/.test(label)) {
      continue;
    }
    button.click();
    clicked.push({ index, label });
  }
  return clicked;
})()`;

function writeMarkdown(result) {
  const lines = [
    `# Web Gemini UI cleanup ${result.cleanupId}`,
    '',
    '## 結論',
    '',
    result.clickedTotal > 0
      ? `Geminiタブ上の生成停止ボタンを ${result.clickedTotal} 件クリックした。`
      : 'Geminiタブ上にクリック可能な生成停止ボタンは見つからなかった。',
    '',
    'この処理はWeb Gemini UIの後片付けだけを行う。途中切れ回答を採点・人間確認・fixture化には使わない。',
    '',
    '## 対象',
    '',
    `- 入力セット: ${result.inputSet}`,
    `- 生成系統: ${result.generationSystem}`,
    `- 実走ID: ${result.outputId}`,
    `- 実行時刻: ${result.runAt}`,
    `- dry run: ${result.dryRun ? 'yes' : 'no'}`,
    `- close tabs: ${result.closeTabs ? 'yes' : 'no'}`,
    `- closed tabs: ${result.closedTabs.length}`,
    '',
    '## タブ別結果',
    '',
    '| tab | stop候補before | click | stop候補after | 生成中表示after | url |',
    '| --- | ---: | ---: | ---: | --- | --- |'
  ];
  for (const tab of result.tabs) {
    lines.push(`| ${tab.targetId ?? ''} | ${tab.before?.visibleStopLikeButtons?.length ?? 0} | ${tab.clicked?.length ?? 0} | ${tab.after?.visibleStopLikeButtons?.length ?? 0} | ${tab.after?.hasGeneratingText ? 'yes' : 'no'} | ${tab.url ?? ''} |`);
  }
  lines.push(
    '',
    '## 制約確認',
    '',
    '- fixture / expected は作成していない。',
    '- 本体側には触れていない。',
    '- runtime へ書き込んでいない。'
  );
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const root = workspaceRoot();
  const outputDir = path.join(
    root,
    'evals',
    'clip_composition',
    'outputs',
    'theme-generation',
    options.inputSet,
    options.generationSystem,
    options.outputId
  );
  const reportDir = path.join(
    root,
    'evals',
    'clip_composition',
    'reports',
    'theme-generation',
    options.inputSet,
    options.generationSystem,
    options.outputId
  );

  const targets = await fetchCdpJson(options.cdpPort, '/json/list');
  const geminiTargets = targets.filter((target) =>
    target.type === 'page' && String(target.url ?? '').startsWith('https://gemini.google.com/app')
  );
  const tabs = [];
  let clickedTotal = 0;

  for (const target of geminiTargets) {
    const tab = {
      targetId: target.id,
      title: target.title,
      url: target.url
    };
    tabs.push(tab);
    if (!target.webSocketDebuggerUrl) {
      tab.error = 'webSocketDebuggerUrl missing';
      continue;
    }
    const cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
    try {
      tab.before = await evaluateValue(cdp, pageStateExpression);
      tab.clicked = options.dryRun ? [] : await evaluateValue(cdp, clickStopExpression);
      clickedTotal += tab.clicked.length;
      await wait(options.dryRun ? 0 : 2000);
      tab.after = await evaluateValue(cdp, pageStateExpression);
    } catch (error) {
      tab.error = error instanceof Error ? error.message : String(error);
    } finally {
      cdp.close();
    }
  }

  const closedTabs = [];
  if (options.closeTabs && !options.dryRun) {
    for (const target of geminiTargets) {
      if (!target.id) {
        continue;
      }
      closedTabs.push(await closeCdpTarget(options.cdpPort, target.id));
    }
  }

  const result = {
    runAt: tokyoTimestamp(new Date()),
    cleanupId: options.cleanupId,
    inputSet: options.inputSet,
    generationSystem: options.generationSystem,
    outputId: options.outputId,
    dryRun: options.dryRun,
    closeTabs: options.closeTabs,
    geminiTabCount: geminiTargets.length,
    clickedTotal,
    closedTabs,
    tabs
  };

  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(outputDir, `${options.cleanupId}.json`), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(path.join(reportDir, `${options.cleanupId}.md`), writeMarkdown(result));
  console.log(JSON.stringify({
    cleanupId: options.cleanupId,
    geminiTabCount: result.geminiTabCount,
    clickedTotal: result.clickedTotal,
    closedTabCount: result.closedTabs.length,
    output: path.join(outputDir, `${options.cleanupId}.json`),
    report: path.join(reportDir, `${options.cleanupId}.md`)
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
