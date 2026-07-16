#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

const MINUTE_MS = 60_000;
const COUNTED_RENDERERS = new Set([
  'liveChatTextMessageRenderer',
  'liveChatPaidMessageRenderer',
  'liveChatPaidStickerRenderer',
  'liveChatMembershipItemRenderer',
  'liveChatSponsorshipsGiftPurchaseAnnouncementRenderer',
  'liveChatSponsorshipsGiftRedemptionAnnouncementRenderer'
]);

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
    sourceDurationMs,
    sourceVideoId: required(values, 'source-video-id'),
    outputId: required(values, 'output-id').replace(/[^a-zA-Z0-9_-]/g, '_')
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

function relative(filePath) {
  return path.relative(root, filePath);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function fixed(value, digits = 4) {
  return Number(value).toFixed(digits);
}

async function readChatReplay() {
  const hash = createHash('sha256');
  const input = createReadStream(options.chatPath);
  input.on('data', (chunk) => hash.update(chunk));
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  const events = [];
  const rendererCounts = {};
  let lineCount = 0;
  let parseErrorCount = 0;
  let minOffsetMs = Number.POSITIVE_INFINITY;
  let maxOffsetMs = Number.NEGATIVE_INFINITY;

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
        if (COUNTED_RENDERERS.has(renderer) && Number.isFinite(offsetMs)) {
          events.push({ offsetMs, renderer });
        }
      }
    }
  }

  return {
    events,
    integrity: {
      filePath: relative(options.chatPath),
      fileBytes: (await stat(options.chatPath)).size,
      sha256: hash.digest('hex'),
      lineCount,
      parseErrorCount,
      minOffsetMs,
      maxOffsetMs,
      rendererCounts
    }
  };
}

function buildMinuteSeries(events) {
  const minuteCount = Math.ceil(options.sourceDurationMs / MINUTE_MS);
  const fullMinuteCount = Math.floor(options.sourceDurationMs / MINUTE_MS);
  const bins = Array.from({ length: minuteCount }, (_, minuteIndex) => ({
    minuteIndex,
    sourceStartMs: minuteIndex * MINUTE_MS,
    sourceEndMs: Math.min((minuteIndex + 1) * MINUTE_MS, options.sourceDurationMs),
    durationMs: Math.min((minuteIndex + 1) * MINUTE_MS, options.sourceDurationMs) - minuteIndex * MINUTE_MS,
    commentCount: 0,
    rendererCounts: {},
    isFullMinute: minuteIndex < fullMinuteCount
  }));
  let beforeStreamCount = 0;
  let afterStreamCount = 0;
  for (const event of events) {
    if (event.offsetMs < 0) {
      beforeStreamCount += 1;
      continue;
    }
    if (event.offsetMs >= options.sourceDurationMs) {
      afterStreamCount += 1;
      continue;
    }
    const bin = bins[Math.floor(event.offsetMs / MINUTE_MS)];
    bin.commentCount += 1;
    bin.rendererCounts[event.renderer] = (bin.rendererCounts[event.renderer] ?? 0) + 1;
  }
  const fullBins = bins.filter((bin) => bin.isFullMinute);
  const fullMinuteCommentCount = fullBins.reduce((sum, bin) => sum + bin.commentCount, 0);
  const baselineCommentsPerMinute = fullMinuteCommentCount / fullBins.length;
  assert(baselineCommentsPerMinute > 0, '完全な1分区間のコメントが0件です');
  for (const bin of bins) {
    bin.commentRatePerMinute = bin.commentCount / (bin.durationMs / MINUTE_MS);
    bin.relativeToStreamBaseline = bin.commentRatePerMinute / baselineCommentsPerMinute;
  }
  const ranked = [...fullBins].sort((left, right) => (
    right.relativeToStreamBaseline - left.relativeToStreamBaseline
    || left.sourceStartMs - right.sourceStartMs
  ));
  ranked.forEach((bin, index) => { bin.velocityRank = index + 1; });
  return {
    bins,
    ranked,
    fullMinuteCount,
    fullMinuteCommentCount,
    baselineCommentsPerMinute,
    beforeStreamCount,
    afterStreamCount
  };
}

function csvText(result) {
  const lines = ['minuteIndex,sourceStartMs,sourceEndMs,durationMs,commentCount,commentRatePerMinute,relativeToStreamBaseline,velocityRank,isFullMinute'];
  for (const bin of result.minuteSeries) {
    lines.push([
      bin.minuteIndex,
      bin.sourceStartMs,
      bin.sourceEndMs,
      bin.durationMs,
      bin.commentCount,
      bin.commentRatePerMinute,
      bin.relativeToStreamBaseline,
      bin.velocityRank ?? '',
      bin.isFullMinute
    ].join(','));
  }
  return `${lines.join('\n')}\n`;
}

function reportMarkdown(result) {
  const topRows = result.top100.map((bin) => (
    `| ${bin.velocityRank} | ${formatTime(bin.sourceStartMs)}–${formatTime(bin.sourceEndMs)} | ${bin.commentCount} | ${fixed(bin.relativeToStreamBaseline)} |`
  ));
  return `# ${result.sourceVideoId} 初見試験用チャット流速集計

## 結論

- 教師切り抜き、expected、照合結果を使わず、元配信チャットだけで完全な1分区間を順位付けした。
- 配信内平均コメント数を1.0とする相対順位を使用し、絶対件数の足切りはしていない。
- 完全な1分区間は${result.baseline.fullMinuteCount}件。固定条件どおり上位100分を次のテーマ生成入力候補とする。
- JSON Lines ${result.acquisition.lineCount}行を全件読み、JSON解析失敗は${result.acquisition.parseErrorCount}件。

## 入力の独立性

- expected使用: なし
- 切り抜き使用: なし
- チャット本文・投稿者の保存: なし
- 順位決定: 相対流速の降順。同値は配信時刻が早い区間を先にする。

## 取得物の完全性

| 項目 | 値 |
| --- | --- |
| 元配信 | ${result.sourceVideoId} |
| 配信長 | ${result.sourceDurationMs}ms (${formatTime(result.sourceDurationMs)}) |
| raw取得物 | \`${result.acquisition.filePath}\` |
| rawサイズ | ${result.acquisition.fileBytes} bytes |
| SHA-256 | \`${result.acquisition.sha256}\` |
| JSON解析失敗 | ${result.acquisition.parseErrorCount} |
| replay時刻範囲 | ${result.acquisition.minOffsetMs}–${result.acquisition.maxOffsetMs}ms |
| 配信開始前として集計除外 | ${result.baseline.beforeStreamCount}件 |
| 配信終了後として集計除外 | ${result.baseline.afterStreamCount}件 |
| 完全な1分区間の平均コメント数 | ${fixed(result.baseline.baselineCommentsPerMinute)} |

raw取得物には投稿者名と本文が含まれるため、リポジトリの正本にはせず、集計値・ハッシュ・取得条件だけを記録する。

## 上位100分

| 順位 | 配信時刻 | コメント数 | 配信内平均比 |
| ---: | --- | ---: | ---: |
${topRows.join('\n')}
`;
}

async function main() {
  const { events, integrity } = await readChatReplay();
  assert(integrity.parseErrorCount === 0, 'チャットリプレイにJSON解析失敗があります');
  assert(integrity.maxOffsetMs >= options.sourceDurationMs, 'チャットリプレイが配信終了まで届いていません');
  const series = buildMinuteSeries(events);
  assert(series.ranked.length >= 100, '完全な1分区間が100件未満です');
  const result = {
    schemaVersion: 1,
    analysisId: options.outputId,
    generatedAt: new Date().toISOString(),
    analysisType: 'source-only-chat-replay-relative-velocity-ranking',
    sourceVideoId: options.sourceVideoId,
    sourceDurationMs: options.sourceDurationMs,
    acquisition: integrity,
    countingPolicy: {
      countedRenderers: [...COUNTED_RENDERERS],
      excludedObservedRenderers: Object.keys(integrity.rendererCounts).filter((name) => !COUNTED_RENDERERS.has(name)),
      chatTextOrAuthorPersistedInAnalysis: false
    },
    sourceOnlyGuard: {
      expectedUsed: false,
      clipUsed: false,
      alignmentUsed: false,
      chatTextIncluded: false,
      chatAuthorIncluded: false
    },
    baseline: {
      definition: '配信内に完全に収まる1分区間すべての平均コメント数を1.0とする',
      absoluteThresholdUsedForSelection: false,
      fullMinuteCount: series.fullMinuteCount,
      fullMinuteCommentCount: series.fullMinuteCommentCount,
      baselineCommentsPerMinute: series.baselineCommentsPerMinute,
      beforeStreamCount: series.beforeStreamCount,
      afterStreamCount: series.afterStreamCount,
      rankTieBreak: '同じベースライン比なら配信時刻が早い1分区間を先にする'
    },
    top100: series.ranked.slice(0, 100),
    minuteSeries: series.bins
  };

  const serialized = JSON.stringify(result);
  assert(!serialized.includes('expectedCuts'), '集計結果へexpectedが混入しました');
  assert(!serialized.includes('clipUrl'), '集計結果へ切り抜き情報が混入しました');
  const outputDir = path.join(evalRoot, 'outputs', 'chat-velocity-analysis');
  const reportDir = path.join(evalRoot, 'reports', 'chat-velocity-analysis');
  await Promise.all([mkdir(outputDir, { recursive: true }), mkdir(reportDir, { recursive: true })]);
  const jsonPath = path.join(outputDir, `${options.outputId}.json`);
  const csvPath = path.join(outputDir, `${options.outputId}-per-minute.csv`);
  const reportPath = path.join(reportDir, `${options.outputId}.md`);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(csvPath, csvText(result)),
    writeFile(reportPath, reportMarkdown(result))
  ]);
  console.log(JSON.stringify({
    output: relative(jsonPath),
    timeSeries: relative(csvPath),
    report: relative(reportPath),
    fullMinuteCount: result.baseline.fullMinuteCount,
    baselineCommentsPerMinute: result.baseline.baselineCommentsPerMinute,
    top100CutoffRelativeToBaseline: result.top100.at(-1).relativeToStreamBaseline
  }, null, 2));
}

await main();
