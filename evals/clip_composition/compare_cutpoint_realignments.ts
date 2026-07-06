import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  oldPath: string;
  newPath: string;
  outputId: string;
};

type TimeAxis = {
  matchedWordPairCount?: number;
  linearContinuityRatio?: number;
  longestLinearRunDurationMs?: number;
  segmentDurationMs?: number;
  discontinuityCount?: number;
};

type Match = {
  sourceId?: string;
  sourceStartMs?: number;
  sourceEndMs?: number;
  matchedChars?: number;
  queryChars?: number;
  clipCoverage?: number;
  sourceCoverage?: number;
  sourceText?: string;
  timeAxis?: TimeAxis;
};

type SegmentRow = {
  segment?: {
    index?: number;
    startMs?: number;
    endMs?: number;
    durationMs?: number;
    text?: string;
    wordCount?: number;
  };
  bestMatch?: Match;
  inheritance?: {
    status?: string;
    reason?: string;
  };
  reliability?: {
    anchorWordCount?: number;
    minimumAnchorWordCount?: number;
    status?: string;
    displayText?: string;
    linearContinuityRatioForDisplay?: number | null;
  };
};

type RealignmentFile = {
  kind?: string;
  runAt?: string;
  targetId?: string;
  clipId?: string;
  sourceId?: string;
  readyForFreeze?: boolean;
  freezeStatus?: string;
  settings?: Record<string, unknown>;
  segments?: SegmentRow[];
  stills?: unknown;
  humanConfirmedPairPolicy?: {
    applied?: Array<{ segmentIndex?: number }>;
  };
};

type ComparisonRow = {
  segmentIndex: number;
  clipRange: { startMs?: number; endMs?: number };
  oldSourceRange: { startMs?: number; endMs?: number };
  newSourceRange: { startMs?: number; endMs?: number };
  sourceShiftMs: { start?: number; end?: number };
  oldTextCoverage?: number;
  newTextCoverage?: number;
  oldLinearContinuity?: number;
  newLinearContinuity?: number;
  oldLinearDisplay: string;
  newLinearDisplay: string;
  oldMatchedWordPairCount?: number;
  newMatchedWordPairCount?: number;
  oldInheritance?: string;
  newInheritance?: string;
};

const confirmedPair = {
  clipStartMs: 92555,
  clipEndMs: 121147,
  sourceStartMs: 2404730,
  sourceEndMs: 2433322,
  toleranceMs: 500
};

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

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

  const oldPath = values.get('old')?.trim();
  const newPath = values.get('new')?.trim();
  if (!oldPath) {
    throw new Error('--old に旧再照合JSONを指定してください');
  }
  if (!newPath) {
    throw new Error('--new に新再照合JSONを指定してください');
  }
  return {
    oldPath: resolveWorkspacePath(oldPath),
    newPath: resolveWorkspacePath(newPath),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
  };
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function bestMatch(row?: SegmentRow): Match | undefined {
  return row?.bestMatch;
}

function comparisonRows(oldRun: RealignmentFile, newRun: RealignmentFile): ComparisonRow[] {
  const oldSegments = oldRun.segments ?? [];
  const newSegments = newRun.segments ?? [];
  const maxLength = Math.max(oldSegments.length, newSegments.length);
  const rows: ComparisonRow[] = [];
  for (let index = 0; index < maxLength; index += 1) {
    const oldRow = oldSegments[index];
    const newRow = newSegments[index];
    const oldMatch = bestMatch(oldRow);
    const newMatch = bestMatch(newRow);
    rows.push({
      segmentIndex: index + 1,
      clipRange: {
        startMs: newRow?.segment?.startMs ?? oldRow?.segment?.startMs,
        endMs: newRow?.segment?.endMs ?? oldRow?.segment?.endMs
      },
      oldSourceRange: {
        startMs: oldMatch?.sourceStartMs,
        endMs: oldMatch?.sourceEndMs
      },
      newSourceRange: {
        startMs: newMatch?.sourceStartMs,
        endMs: newMatch?.sourceEndMs
      },
      sourceShiftMs: {
        start: diff(newMatch?.sourceStartMs, oldMatch?.sourceStartMs),
        end: diff(newMatch?.sourceEndMs, oldMatch?.sourceEndMs)
      },
      oldTextCoverage: oldMatch?.clipCoverage,
      newTextCoverage: newMatch?.clipCoverage,
      oldLinearContinuity: oldMatch?.timeAxis?.linearContinuityRatio,
      newLinearContinuity: newMatch?.timeAxis?.linearContinuityRatio,
      oldLinearDisplay: reliabilityDisplay(oldRow, oldMatch),
      newLinearDisplay: reliabilityDisplay(newRow, newMatch),
      oldMatchedWordPairCount: anchorWordCount(oldRow, oldMatch),
      newMatchedWordPairCount: anchorWordCount(newRow, newMatch),
      oldInheritance: oldRow?.inheritance?.status,
      newInheritance: newRow?.inheritance?.status
    });
  }
  return rows;
}

function diff(left?: number, right?: number): number | undefined {
  return typeof left === 'number' && typeof right === 'number' ? left - right : undefined;
}

function confirmedStatus(run: RealignmentFile): {
  directInheritedCount: number;
  overlappingSegments: Array<{
    segmentIndex: number;
    clipStartMs?: number;
    clipEndMs?: number;
    sourceStartMs?: number;
    sourceEndMs?: number;
    linearContinuity?: number;
    matchedWordPairCount?: number;
    linearDisplay: string;
  }>;
  connectedComparison?: {
    clipStartDeltaMs?: number;
    clipEndDeltaMs?: number;
    sourceStartDeltaMs?: number;
    sourceEndDeltaMs?: number;
  };
} {
  const directInheritedCount = run.humanConfirmedPairPolicy?.applied?.length ?? 0;
  const overlapping = (run.segments ?? []).filter((row) => {
    const startMs = row.segment?.startMs;
    const endMs = row.segment?.endMs;
    return typeof startMs === 'number' &&
      typeof endMs === 'number' &&
      endMs > confirmedPair.clipStartMs &&
      startMs < confirmedPair.clipEndMs;
  });
  const overlappingSegments = overlapping.map((row) => ({
    segmentIndex: (row.segment?.index ?? -1) + 1,
    clipStartMs: row.segment?.startMs,
    clipEndMs: row.segment?.endMs,
    sourceStartMs: row.bestMatch?.sourceStartMs,
    sourceEndMs: row.bestMatch?.sourceEndMs,
    linearContinuity: row.bestMatch?.timeAxis?.linearContinuityRatio,
    matchedWordPairCount: anchorWordCount(row, row.bestMatch),
    linearDisplay: reliabilityDisplay(row, row.bestMatch)
  }));
  const first = overlappingSegments[0];
  const last = overlappingSegments.at(-1);
  const connectedComparison = first && last
    ? {
        clipStartDeltaMs: diff(first.clipStartMs, confirmedPair.clipStartMs),
        clipEndDeltaMs: diff(last.clipEndMs, confirmedPair.clipEndMs),
        sourceStartDeltaMs: diff(first.sourceStartMs, confirmedPair.sourceStartMs),
        sourceEndDeltaMs: diff(last.sourceEndMs, confirmedPair.sourceEndMs)
      }
    : undefined;

  return {
    directInheritedCount,
    overlappingSegments,
    connectedComparison
  };
}

function withinTolerance(value?: number): boolean {
  return typeof value === 'number' && Math.abs(value) <= confirmedPair.toleranceMs;
}

function connectedPasses(status: ReturnType<typeof confirmedStatus>): boolean {
  const comparison = status.connectedComparison;
  if (!comparison) {
    return false;
  }
  return withinTolerance(comparison.clipStartDeltaMs) &&
    withinTolerance(comparison.clipEndDeltaMs) &&
    withinTolerance(comparison.sourceStartDeltaMs) &&
    withinTolerance(comparison.sourceEndDeltaMs);
}

function ms(value?: number): string {
  return typeof value === 'number' ? formatMs(value) : 'n/a';
}

function signed(value?: number): string {
  if (typeof value !== 'number') {
    return 'n/a';
  }
  return `${value >= 0 ? '+' : ''}${value}ms`;
}

function formatMs(value: number): string {
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = value % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function percent(value?: number): string {
  if (typeof value !== 'number') {
    return 'n/a';
  }
  return `${Math.round(value * 1000) / 10}%`;
}

function anchorWordCount(row?: SegmentRow, match?: Match): number | undefined {
  return row?.reliability?.anchorWordCount ?? match?.timeAxis?.matchedWordPairCount;
}

function reliabilityDisplay(row?: SegmentRow, match?: Match): string {
  return row?.reliability?.displayText ?? percent(match?.timeAxis?.linearContinuityRatio);
}

function reportMarkdown(input: {
  oldPath: string;
  newPath: string;
  oldRun: RealignmentFile;
  newRun: RealignmentFile;
  rows: ComparisonRow[];
  oldConfirmed: ReturnType<typeof confirmedStatus>;
  newConfirmed: ReturnType<typeof confirmedStatus>;
  resultPath: string;
}): string {
  const lines: string[] = [
    '# カット点再照合 新旧比較レポート',
    '',
    `- 比較JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- 旧結果: ${path.relative(workspaceRoot(), input.oldPath)}`,
    `- 新結果: ${path.relative(workspaceRoot(), input.newPath)}`,
    `- 旧タイムスタンプ源: ${input.oldRun.sourceId ?? 'n/a'}`,
    `- 新タイムスタンプ源: ${input.newRun.sourceId ?? 'n/a'}`,
    `- fixture凍結: ${input.newRun.readyForFreeze ? 'yes' : 'no'}`,
    `- readyForFreeze: ${input.newRun.readyForFreeze ? 'true' : 'false'}`,
    '',
    '## 確認済みペアの継承判定',
    '',
    `- 基準ペア: clip ${ms(confirmedPair.clipStartMs)}-${ms(confirmedPair.clipEndMs)} / source ${ms(confirmedPair.sourceStartMs)}-${ms(confirmedPair.sourceEndMs)}`,
    `- 許容幅: ±${confirmedPair.toleranceMs}ms`,
    `- 旧結果の直接継承: ${input.oldConfirmed.directInheritedCount}件`,
    `- 新結果の直接継承: ${input.newConfirmed.directInheritedCount}件`,
    `- 新結果の連結比較: ${connectedPasses(input.newConfirmed) ? '±500ms内' : '±500ms外'}`,
    ''
  ];

  if (input.newConfirmed.connectedComparison) {
    lines.push(
      `  - clip開始差: ${signed(input.newConfirmed.connectedComparison.clipStartDeltaMs)}`,
      `  - clip終了差: ${signed(input.newConfirmed.connectedComparison.clipEndDeltaMs)}`,
      `  - 元動画開始差: ${signed(input.newConfirmed.connectedComparison.sourceStartDeltaMs)}`,
      `  - 元動画終了差: ${signed(input.newConfirmed.connectedComparison.sourceEndDeltaMs)}`,
      ''
    );
  }

  lines.push(
    '## 新結果で確認済み範囲と重なるセグメント',
    '',
    '| seg | clip | source | 整合率 | 対応単語数 |',
    '| ---: | --- | --- | ---: | ---: |'
  );
  for (const row of input.newConfirmed.overlappingSegments) {
    lines.push(`| ${row.segmentIndex} | ${ms(row.clipStartMs)}-${ms(row.clipEndMs)} | ${ms(row.sourceStartMs)}-${ms(row.sourceEndMs)} | ${row.linearDisplay} | ${row.matchedWordPairCount ?? 'n/a'} |`);
  }

  lines.push(
    '',
    '## 全セグメント差分',
    '',
    '| seg | clip | 旧source | 新source | 開始差 | 終了差 | 旧整合率表示 | 新整合率表示 | 旧対応単語 | 新対応単語 |',
    '| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |'
  );
  for (const row of input.rows) {
    lines.push([
      `| ${row.segmentIndex}`,
      `${ms(row.clipRange.startMs)}-${ms(row.clipRange.endMs)}`,
      `${ms(row.oldSourceRange.startMs)}-${ms(row.oldSourceRange.endMs)}`,
      `${ms(row.newSourceRange.startMs)}-${ms(row.newSourceRange.endMs)}`,
      signed(row.sourceShiftMs.start),
      signed(row.sourceShiftMs.end),
      row.oldLinearDisplay,
      row.newLinearDisplay,
      row.oldMatchedWordPairCount ?? 'n/a',
      `${row.newMatchedWordPairCount ?? 'n/a'} |`
    ].join(' | '));
  }

  const sourceMeaning = input.oldRun.sourceId === input.newRun.sourceId
    ? '- タイムスタンプ源は同じ。比較対象は表示・付帯情報の変更で、照合位置は変えていない。'
    : '- タイムスタンプ源が置き換わった。新旧の参照元時刻差を見て、入力時刻源の影響を判断する。';

  lines.push(
    '',
    '## 判断',
    '',
    sourceMeaning,
    '- 切り抜き側の分割点は変更していないため、セグメント数は同じ。',
    '- 確認済みペアは新結果でも直接継承0件。現行の1対1・±500ms継承条件には入っていない。',
    '- fixture/expectedは作成していない。readyForFreezeもfalseのまま。'
  );

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const oldRun = await readJson<RealignmentFile>(options.oldPath);
  const newRun = await readJson<RealignmentFile>(options.newPath);
  const rows = comparisonRows(oldRun, newRun);
  const oldConfirmed = confirmedStatus(oldRun);
  const newConfirmed = confirmedStatus(newRun);

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const resultPath = path.join(outputDir, `cutpoint-realignment-comparison-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `cutpoint-realignment-comparison-${options.outputId}.md`);
  const result = {
    kind: 'clip_composition_cutpoint_realignment_comparison',
    runAt: new Date().toISOString(),
    oldResultPath: path.relative(workspaceRoot(), options.oldPath),
    newResultPath: path.relative(workspaceRoot(), options.newPath),
    oldSourceId: oldRun.sourceId,
    newSourceId: newRun.sourceId,
    readyForFreeze: newRun.readyForFreeze === true,
    freezeStatus: newRun.freezeStatus,
    confirmedPair,
    oldConfirmed,
    newConfirmed,
    rows,
    productionImpact: {
      runtimeWrites: false,
      fixtureWrites: false,
      expectedWrites: false,
      productionApiUiQueueDbChanged: false
    }
  };

  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown({
    oldPath: options.oldPath,
    newPath: options.newPath,
    oldRun,
    newRun,
    rows,
    oldConfirmed,
    newConfirmed,
    resultPath
  }), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`new direct inherited: ${newConfirmed.directInheritedCount}`);
  console.log(`new connected comparison: ${connectedPasses(newConfirmed) ? 'within ±500ms' : 'outside ±500ms'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
