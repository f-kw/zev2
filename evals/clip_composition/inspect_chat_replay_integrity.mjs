#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${item} の値を指定してください`);
    values.set(item.slice(2), value);
    index += 1;
  }
  const sourceDurationMs = Number(required(values, 'source-duration-ms'));
  if (!Number.isFinite(sourceDurationMs) || sourceDurationMs <= 0) {
    throw new Error('--source-duration-ms は正の数で指定してください');
  }
  return {
    chatPath: resolveInsideEval(required(values, 'chat')),
    sourceVideoId: required(values, 'source-video-id'),
    sourceDurationMs,
    outputId: sanitize(required(values, 'output-id'))
  };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return value;
}

function resolveInsideEval(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  if (path.relative(evalRoot, resolved).startsWith('..')) {
    throw new Error('入出力は evals/clip_composition 配下を指定してください');
  }
  return resolved;
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function inspect() {
  const hash = createHash('sha256');
  const input = createReadStream(options.chatPath);
  input.on('data', (chunk) => hash.update(chunk));
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let lineCount = 0;
  let parseErrorCount = 0;
  let minOffsetMs = Number.POSITIVE_INFINITY;
  let maxOffsetMs = Number.NEGATIVE_INFINITY;
  const rendererCounts = {};

  for await (const line of lines) {
    lineCount += 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      parseErrorCount += 1;
      continue;
    }
    const replay = record.replayChatItemAction;
    if (!replay) continue;
    const offsetMs = Number(replay.videoOffsetTimeMsec);
    if (Number.isFinite(offsetMs)) {
      minOffsetMs = Math.min(minOffsetMs, offsetMs);
      maxOffsetMs = Math.max(maxOffsetMs, offsetMs);
    }
    for (const action of replay.actions ?? []) {
      const item = action.addChatItemAction?.item;
      if (!item) continue;
      for (const renderer of Object.keys(item)) {
        rendererCounts[renderer] = (rendererCounts[renderer] ?? 0) + 1;
      }
    }
  }

  const fullMinuteCount = Math.floor(options.sourceDurationMs / 60_000);
  return {
    kind: 'clip_composition_chat_replay_integrity',
    inspectedAt: new Date().toISOString(),
    sourceVideoId: options.sourceVideoId,
    sourceDurationMs: options.sourceDurationMs,
    acquisition: {
      filePath: path.relative(root, options.chatPath),
      fileBytes: (await stat(options.chatPath)).size,
      sha256: hash.digest('hex'),
      lineCount,
      parseErrorCount,
      minOffsetMs,
      maxOffsetMs,
      rendererCounts
    },
    preregisteredSelectionCounts: {
      formalTopN: 100,
      durationRatioReference: Math.floor(options.sourceDurationMs * 100 / 11_824_121),
      topPercentReference: Math.floor(fullMinuteCount * 100 / 197),
      targetFullMinuteCount: fullMinuteCount,
      note: '配信長だけからexpected作成前に確定。入力可視性と流速値は計算していない。'
    },
    safeguards: {
      chatTextOrAuthorPersisted: false,
      perMinuteVelocityComputed: false,
      expectedRead: false,
      llmExecuted: false
    }
  };
}

function report(result) {
  return `# チャットリプレイ取得完全性確認

- 元配信: ${result.sourceVideoId}
- 配信長: ${result.sourceDurationMs}ms
- JSON Lines: ${result.acquisition.lineCount}
- JSON解析失敗: ${result.acquisition.parseErrorCount}
- replay時刻範囲: ${result.acquisition.minOffsetMs}–${result.acquisition.maxOffsetMs}ms
- rawサイズ: ${result.acquisition.fileBytes} bytes
- SHA-256: \`${result.acquisition.sha256}\`

## expected作成前に確定した選択数

| 扱い | 選択する1分区間数 |
| --- | ---: |
| 正式N=100 | ${result.preregisteredSelectionCounts.formalTopN} |
| 配信長比の参考 | ${result.preregisteredSelectionCounts.durationRatioReference} |
| 上位割合の参考 | ${result.preregisteredSelectionCounts.topPercentReference} |

対象配信はB素材と配信長が近いため、3方式の選択数はすべて100になった。参考値の計算規則は維持するが、この素材では正式入力と同じ1分区間集合になる。

この確認ではチャット本文・投稿者名を保存せず、1分ごとの流速、expectedとの重なり、LLM出力を計算していない。rawはローカル研究作業物として保持し、fixture凍結根拠や本体の正式チャットには使わない。
`;
}

const result = await inspect();
if (result.acquisition.parseErrorCount !== 0) throw new Error('チャットrawにJSON解析失敗があります');
if (result.acquisition.maxOffsetMs < options.sourceDurationMs) throw new Error('チャットrawが配信末尾まで届いていません');
const outputDir = path.join(evalRoot, 'outputs', 'theme-input-selection-generalization');
const reportDir = path.join(evalRoot, 'reports', 'theme-input-selection-generalization');
await Promise.all([mkdir(outputDir, { recursive: true }), mkdir(reportDir, { recursive: true })]);
const outputPath = path.join(outputDir, `${options.outputId}.json`);
const reportPath = path.join(reportDir, `${options.outputId}.md`);
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(reportPath, report(result))
]);
console.log(`output: ${path.relative(root, outputPath)}`);
console.log(`report: ${path.relative(root, reportPath)}`);
