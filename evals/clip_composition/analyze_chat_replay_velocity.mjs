#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
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
    expectedPath: resolveInsideEval(required(values, 'expected')),
    sourceDurationMs,
    sourceVideoId: required(values, 'source-video-id'),
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

function relative(filePath) {
  return path.relative(root, filePath);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function overlapMs(left, right) {
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs));
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
    baselineCommentsPerMinute,
    fullMinuteCommentCount,
    partialFinalMinuteCommentCount: bins.at(-1)?.isFullMinute ? 0 : bins.at(-1)?.commentCount ?? 0,
    beforeStreamCount,
    afterStreamCount
  };
}

function expectedFacts(expectedCuts, bins) {
  return expectedCuts.map((cut, index) => {
    const overlappingMinutes = bins
      .filter((bin) => overlapMs(cut, bin) > 0)
      .map((bin) => ({
        minuteIndex: bin.minuteIndex,
        sourceStartMs: bin.sourceStartMs,
        sourceEndMs: bin.sourceEndMs,
        commentCount: bin.commentCount,
        relativeToStreamBaseline: bin.relativeToStreamBaseline,
        velocityRank: bin.velocityRank ?? null,
        overlapMs: overlapMs(cut, bin)
      }));
    const rankable = overlappingMinutes.filter((minute) => minute.velocityRank !== null);
    const best = [...rankable].sort((left, right) => left.velocityRank - right.velocityRank)[0] ?? null;
    return {
      expectedIndex: index + 1,
      label: cut.label ?? `expected ${index + 1}`,
      sourceVideoId: cut.sourceVideoId,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      overlappingMinutes,
      bestVelocityRank: best?.velocityRank ?? null,
      bestMinuteIndex: best?.minuteIndex ?? null,
      bestRelativeToStreamBaseline: best?.relativeToStreamBaseline ?? null
    };
  });
}

function topNSimulation(facts, ranked) {
  return [50, 100, 150].map((selectionCount) => {
    const cutoff = ranked[selectionCount - 1];
    if (!cutoff) {
      return {
        selectionCount,
        selectionAvailable: false,
        availableFullMinuteCount: ranked.length,
        includedExpectedCount: null,
        totalExpectedCount: facts.length,
        includedExpectedIndexes: [],
        excludedExpectedIndexes: [],
        cutoffRelativeToStreamBaseline: null,
        cutoffCommentCount: null,
        completeMinutesTiedAtCutoffCount: null
      };
    }
    const selected = new Set(ranked.slice(0, selectionCount).map((bin) => bin.minuteIndex));
    const included = facts.filter((fact) => fact.overlappingMinutes.some((minute) => selected.has(minute.minuteIndex)));
    const tiedAtCutoff = ranked.filter((bin) => bin.commentCount === cutoff.commentCount).length;
    return {
      selectionCount,
      selectionAvailable: true,
      availableFullMinuteCount: ranked.length,
      includedExpectedCount: included.length,
      totalExpectedCount: facts.length,
      includedExpectedIndexes: included.map((fact) => fact.expectedIndex),
      excludedExpectedIndexes: facts.filter((fact) => !included.includes(fact)).map((fact) => fact.expectedIndex),
      cutoffRelativeToStreamBaseline: cutoff.relativeToStreamBaseline,
      cutoffCommentCount: cutoff.commentCount,
      completeMinutesTiedAtCutoffCount: tiedAtCutoff
    };
  });
}

function reportMarkdown(result) {
  const expectedRows = result.expectedFacts.map((fact) => (
    `| ${fact.expectedIndex} | ${fact.label} | ${formatTime(fact.sourceStartMs)}–${formatTime(fact.sourceEndMs)} | ${fact.bestVelocityRank ?? '—'} | ${fact.bestMinuteIndex ?? '—'} | ${fact.bestRelativeToStreamBaseline === null ? '—' : fixed(fact.bestRelativeToStreamBaseline)} |`
  ));
  const simulationRows = result.simulations.map((entry) => entry.selectionAvailable
    ? `| ${entry.selectionCount} | ${entry.includedExpectedCount}/${entry.totalExpectedCount} | ${entry.includedExpectedIndexes.join(', ') || 'なし'} | ${entry.excludedExpectedIndexes.join(', ') || 'なし'} | ${fixed(entry.cutoffRelativeToStreamBaseline)} | ${entry.completeMinutesTiedAtCutoffCount} |`
    : `| ${entry.selectionCount} | 算出不能 | — | — | — | 完全な1分区間が${entry.availableFullMinuteCount}件のみ |`
  );
  const minuteRows = result.minuteSeries.map((bin) => (
    `| ${bin.minuteIndex} | ${formatTime(bin.sourceStartMs)}–${formatTime(bin.sourceEndMs)} | ${bin.commentCount} | ${fixed(bin.commentRatePerMinute)} | ${fixed(bin.relativeToStreamBaseline)} | ${bin.velocityRank ?? '対象外'} | ${bin.isFullMinute ? '1分' : `${fixed(bin.durationMs / 1000, 3)}秒`} |`
  ));
  return `# ${result.sourceVideoId} チャット流速入力可視性

## 結論

- チャットリプレイは取得できた。JSON Lines ${result.acquisition.lineCount}行を全件読め、JSON解析失敗は${result.acquisition.parseErrorCount}件。
- 配信内の完全な1分区間は${result.baseline.fullMinuteCount}件。各区間を配信内平均との比で順位付けし、絶対件数による足切りはしていない。
- 上位50・100・150分で、凍結済みexpectedが入力内になる件数を機械計算した。ここでは閾値の採否を自動判断しない。
- これは採点実走前の入力可視性シミュレーションであり、theme-llm-v002は実行していない。

## 数え方

- 1コメントとして数えるもの: 通常コメント、有料コメント、有料ステッカー、メンバー加入、メンバーギフト購入・受取。
- 数えないもの: YouTubeの案内表示、削除後の空箱、その他のシステム操作。
- ベースライン: 配信内に完全に収まる1分区間すべての平均コメント数を1.0とする。
- 上位N: ベースライン比の降順。同値の場合は配信時刻が早い区間を先にする。
- 正解が入力内: 正解区間と選抜された1分区間が1ms以上重なる場合。
- 最後の${fixed(result.baseline.partialFinalMinuteDurationMs / 1000, 3)}秒は時系列へ記録するが、1分区間ではないため上位Nから除外する。

## 取得物の完全性

| 項目 | 値 |
| --- | --- |
| 元配信 | ${result.sourceVideoId} |
| 配信長 | ${result.sourceDurationMs}ms (${formatTime(result.sourceDurationMs)}) |
| raw取得物 | \`${result.acquisition.filePath}\` |
| rawサイズ | ${result.acquisition.fileBytes} bytes |
| SHA-256 | \`${result.acquisition.sha256}\` |
| JSON Lines | ${result.acquisition.lineCount} |
| JSON解析失敗 | ${result.acquisition.parseErrorCount} |
| replay時刻範囲 | ${result.acquisition.minOffsetMs}–${result.acquisition.maxOffsetMs}ms |
| 配信長より後として集計除外 | ${result.baseline.afterStreamCount}件 |
| 配信開始前として集計除外 | ${result.baseline.beforeStreamCount}件 |

raw取得物には投稿者名と本文が含まれるため、リポジトリの正本にはせず、集計値・ハッシュ・取得条件だけを記録する。今回の取得は評価環境の探索実験に限り、本体の正式D4チャットやfixture凍結根拠にはしない。

## 正解${result.expectedCount}件と流速順位

「最良順位」は、その正解と重なる1分区間のうち流速順位が最も高いもの。

| 正解 | 素材ブロック | 元配信区間 | 最良順位 | 1分区間番号 | ベースライン比 |
| ---: | --- | --- | ---: | ---: | ---: |
${expectedRows.join('\n')}

## 上位Nを入力にした場合

| 上位N | 入力内expected | 入力内expected番号 | 入力外expected番号 | N番目のベースライン比 | 境界と同数の1分区間数 |
| ---: | ---: | --- | --- | ---: | ---: |
${simulationRows.join('\n')}

## 1分毎コメント数の時系列

絶対件数は取得結果の観察値として記録する。入力選抜にはベースライン比と順位のみを使う。

| 1分区間番号 | 時刻 | コメント数 | 1分換算 | ベースライン比 | 流速順位 | 区間長 |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
${minuteRows.join('\n')}
`;
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

async function main() {
  const expected = JSON.parse(await readFile(options.expectedPath, 'utf8'));
  const cuts = expected.expectedCuts.filter((cut) => (
    cut.usableForCompositionPromptEval !== false && cut.sourceVideoId === options.sourceVideoId
  ));
  assert(cuts.length > 0, '採点対象のexpectedCutsがありません');
  const { events, integrity } = await readChatReplay();
  assert(integrity.parseErrorCount === 0, 'チャットリプレイにJSON解析失敗があります');
  assert(integrity.maxOffsetMs >= Math.max(...cuts.map((cut) => cut.sourceEndMs)), 'チャットリプレイが最後のexpectedまで届いていません');
  const series = buildMinuteSeries(events);
  const facts = expectedFacts(cuts, series.bins);
  const simulations = topNSimulation(facts, series.ranked);
  const finalBin = series.bins.at(-1);
  const result = {
    schemaVersion: 1,
    analysisId: options.outputId,
    generatedAt: new Date().toISOString(),
    analysisType: 'chat-replay-relative-velocity-input-visibility-simulation',
    sourceVideoId: options.sourceVideoId,
    sourceDurationMs: options.sourceDurationMs,
    expectedFixtureId: expected.fixtureId,
    expectedPath: relative(options.expectedPath),
    expectedCount: cuts.length,
    acquisition: integrity,
    countingPolicy: {
      countedRenderers: [...COUNTED_RENDERERS],
      excludedObservedRenderers: Object.keys(integrity.rendererCounts).filter((name) => !COUNTED_RENDERERS.has(name)),
      privateChatTextOrAuthorPersistedInAnalysis: false
    },
    useScope: {
      evaluationResearchOnly: true,
      treatedAsFormalD4Chat: false,
      usedForFixtureFreeze: false,
      note: '取得したチャット本文や投稿者名はモデル入力・採点・fixture凍結へ使わず、相対流速の机上検証だけに使う。'
    },
    baseline: {
      definition: '配信内に完全に収まる1分区間すべての平均コメント数を1.0とする',
      absoluteThresholdUsedForSelection: false,
      fullMinuteCount: series.fullMinuteCount,
      fullMinuteCommentCount: series.fullMinuteCommentCount,
      baselineCommentsPerMinute: series.baselineCommentsPerMinute,
      partialFinalMinuteDurationMs: finalBin.isFullMinute ? 0 : finalBin.durationMs,
      partialFinalMinuteCommentCount: series.partialFinalMinuteCommentCount,
      beforeStreamCount: series.beforeStreamCount,
      afterStreamCount: series.afterStreamCount,
      rankTieBreak: '同じベースライン比なら配信時刻が早い1分区間を先にする'
    },
    simulations,
    expectedFacts: facts,
    minuteSeries: series.bins
  };

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
    simulations,
    baselineCommentsPerMinute: series.baselineCommentsPerMinute
  }, null, 2));
}

await main();
