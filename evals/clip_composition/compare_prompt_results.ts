import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  resultPaths: string[];
  outputId: string;
};

type Cut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason?: string;
  usedSpeechIds?: number[];
};

type ScoreResult = {
  runAt: string;
  fixtureId: string;
  draftId?: string;
  promptVersion: string;
  model: string;
  params: Record<string, unknown>;
  selectedCuts: Cut[];
  expectedCuts: Cut[];
  diff: {
    startDeltaMs: number;
    endDeltaMs: number;
    overlapSummary: string;
  };
  cutDiffs?: Array<{
    cutIndex: number;
    status: string;
    startDeltaMs?: number;
    endDeltaMs?: number;
    overlapMs?: number;
    overlapSummary?: string;
  }>;
  diffSummary?: {
    expectedCutCount?: number;
    selectedCutCount?: number;
    exactMatchCount?: number;
    overlappingCutCount?: number;
    missingExpectedCutCount?: number;
    extraSelectedCutCount?: number;
    allExpectedCutsMatchedExactlyByIndex?: boolean;
    allExpectedCutsHaveOverlapByIndex?: boolean;
    summary?: string;
  };
  themeCoverage?: {
    themeSidePossibility?: string;
    compositionSidePossibility?: string;
    coverageSummary?: string;
  };
};

type ComparisonRow = {
  resultPath: string;
  runAt: string;
  fixtureId: string;
  promptVersion: string;
  model: string;
  params: Record<string, unknown>;
  selectedStartMs: number;
  selectedEndMs: number;
  expectedStartMs: number;
  expectedEndMs: number;
  startDeltaMs: number;
  endDeltaMs: number;
  overlapSummary: string;
  selectedCutCount: number;
  expectedCutCount: number;
  exactMatchCount: number;
  overlappingCutCount: number;
  missingExpectedCutCount: number;
  extraSelectedCutCount: number;
  allExpectedCutsMatchedExactlyByIndex: boolean;
  allExpectedCutsHaveOverlapByIndex: boolean;
  diffSummary?: string;
  selectedReason?: string;
  usedSpeechIds?: number[];
  themeSidePossibility?: string;
  compositionSidePossibility?: string;
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

  const resultText = values.get('results')?.trim();
  if (!resultText) {
    throw new Error('--results にカンマ区切りの result.json パスを指定してください');
  }

  return {
    resultPaths: resultText.split(',').map((item) => resolveWorkspacePath(item.trim())).filter(Boolean),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function validateCut(value: unknown, label: string): Cut {
  const record = recordFrom(value);
  const sourceStartMs = numberFrom(record.sourceStartMs, `${label}.sourceStartMs`);
  const sourceEndMs = numberFrom(record.sourceEndMs, `${label}.sourceEndMs`);
  return {
    sourceStartMs,
    sourceEndMs,
    ...(typeof record.reason === 'string' ? { reason: record.reason } : {}),
    ...(Array.isArray(record.usedSpeechIds)
      ? { usedSpeechIds: record.usedSpeechIds.filter((item): item is number => typeof item === 'number') }
      : {})
  };
}

function validateScoreResult(value: unknown, resultPath: string): ScoreResult {
  const record = recordFrom(value);
  const selectedCuts = arrayFrom(record.selectedCuts, `${resultPath}.selectedCuts`);
  const expectedCuts = arrayFrom(record.expectedCuts, `${resultPath}.expectedCuts`);
  const diff = recordFrom(record.diff);
  return {
    runAt: stringFrom(record.runAt, `${resultPath}.runAt`),
    fixtureId: stringFrom(record.fixtureId, `${resultPath}.fixtureId`),
    ...(typeof record.draftId === 'string' ? { draftId: record.draftId } : {}),
    promptVersion: stringFrom(record.promptVersion, `${resultPath}.promptVersion`),
    model: stringFrom(record.model, `${resultPath}.model`),
    params: recordFrom(record.params),
    selectedCuts: selectedCuts.map((item, index) => validateCut(item, `${resultPath}.selectedCuts[${index}]`)),
    expectedCuts: expectedCuts.map((item, index) => validateCut(item, `${resultPath}.expectedCuts[${index}]`)),
    diff: {
      startDeltaMs: numberFrom(diff.startDeltaMs, `${resultPath}.diff.startDeltaMs`),
      endDeltaMs: numberFrom(diff.endDeltaMs, `${resultPath}.diff.endDeltaMs`),
      overlapSummary: stringFrom(diff.overlapSummary, `${resultPath}.diff.overlapSummary`)
    },
    ...(Array.isArray(record.cutDiffs) ? { cutDiffs: record.cutDiffs.map((item, index) => validateCutDiff(item, `${resultPath}.cutDiffs[${index}]`)) } : {}),
    ...(record.diffSummary && typeof record.diffSummary === 'object' && !Array.isArray(record.diffSummary)
      ? { diffSummary: record.diffSummary as ScoreResult['diffSummary'] }
      : {}),
    themeCoverage: recordFrom(record.themeCoverage)
  };
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayFrom(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} は配列である必要があります`);
  }
  return value;
}

function stringFrom(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} は空でない文字列である必要があります`);
  }
  return value;
}

function numberFrom(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} は数値である必要があります`);
  }
  return value;
}

function optionalNumberFrom(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalBooleanFrom(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function validateCutDiff(value: unknown, label: string): NonNullable<ScoreResult['cutDiffs']>[number] {
  const record = recordFrom(value);
  return {
    cutIndex: numberFrom(record.cutIndex, `${label}.cutIndex`),
    status: stringFrom(record.status, `${label}.status`),
    ...(optionalNumberFrom(record.startDeltaMs) !== undefined ? { startDeltaMs: optionalNumberFrom(record.startDeltaMs) } : {}),
    ...(optionalNumberFrom(record.endDeltaMs) !== undefined ? { endDeltaMs: optionalNumberFrom(record.endDeltaMs) } : {}),
    ...(optionalNumberFrom(record.overlapMs) !== undefined ? { overlapMs: optionalNumberFrom(record.overlapMs) } : {}),
    ...(typeof record.overlapSummary === 'string' ? { overlapSummary: record.overlapSummary } : {})
  };
}

function computedDiffSummary(result: ScoreResult) {
  const compared = result.cutDiffs?.filter((diff) => diff.status === 'compared') ?? [];
  const exactMatchCount = compared.filter((diff) => diff.startDeltaMs === 0 && diff.endDeltaMs === 0).length;
  const overlappingCutCount = compared.filter((diff) => (diff.overlapMs ?? 0) > 0).length;
  const missingExpectedCutCount = result.cutDiffs?.filter((diff) => diff.status === 'missing_selected_cut').length ?? 0;
  const extraSelectedCutCount = result.cutDiffs?.filter((diff) => diff.status === 'extra_selected_cut').length ?? 0;
  const expectedCutCount = result.expectedCuts.length;
  const selectedCutCount = result.selectedCuts.length;
  return {
    expectedCutCount,
    selectedCutCount,
    exactMatchCount,
    overlappingCutCount,
    missingExpectedCutCount,
    extraSelectedCutCount,
    allExpectedCutsMatchedExactlyByIndex: expectedCutCount > 0 && selectedCutCount === expectedCutCount && exactMatchCount === expectedCutCount,
    allExpectedCutsHaveOverlapByIndex: expectedCutCount > 0 && missingExpectedCutCount === 0 && overlappingCutCount >= expectedCutCount,
    summary: `期待区間${expectedCutCount}件に対して選択区間${selectedCutCount}件。完全一致${exactMatchCount}件、重なりあり${overlappingCutCount}件。`
  };
}

function buildRow(resultPath: string, result: ScoreResult): ComparisonRow {
  const selected = result.selectedCuts[0];
  const expected = result.expectedCuts[0];
  if (!selected) {
    throw new Error(`${resultPath} に選択区間がありません`);
  }
  if (!expected) {
    throw new Error(`${resultPath} に期待区間がありません`);
  }
  const fallback = computedDiffSummary(result);
  const summary = result.diffSummary ?? fallback;
  return {
    resultPath: path.relative(workspaceRoot(), resultPath),
    runAt: result.runAt,
    fixtureId: result.fixtureId,
    promptVersion: result.promptVersion,
    model: result.model,
    params: result.params,
    selectedStartMs: selected.sourceStartMs,
    selectedEndMs: selected.sourceEndMs,
    expectedStartMs: expected.sourceStartMs,
    expectedEndMs: expected.sourceEndMs,
    startDeltaMs: result.diff.startDeltaMs,
    endDeltaMs: result.diff.endDeltaMs,
    overlapSummary: result.diff.overlapSummary,
    selectedCutCount: typeof summary.selectedCutCount === 'number' ? summary.selectedCutCount : fallback.selectedCutCount,
    expectedCutCount: typeof summary.expectedCutCount === 'number' ? summary.expectedCutCount : fallback.expectedCutCount,
    exactMatchCount: typeof summary.exactMatchCount === 'number' ? summary.exactMatchCount : fallback.exactMatchCount,
    overlappingCutCount: typeof summary.overlappingCutCount === 'number' ? summary.overlappingCutCount : fallback.overlappingCutCount,
    missingExpectedCutCount: typeof summary.missingExpectedCutCount === 'number' ? summary.missingExpectedCutCount : fallback.missingExpectedCutCount,
    extraSelectedCutCount: typeof summary.extraSelectedCutCount === 'number' ? summary.extraSelectedCutCount : fallback.extraSelectedCutCount,
    allExpectedCutsMatchedExactlyByIndex: optionalBooleanFrom(summary.allExpectedCutsMatchedExactlyByIndex) ?? fallback.allExpectedCutsMatchedExactlyByIndex,
    allExpectedCutsHaveOverlapByIndex: optionalBooleanFrom(summary.allExpectedCutsHaveOverlapByIndex) ?? fallback.allExpectedCutsHaveOverlapByIndex,
    ...(typeof summary.summary === 'string' ? { diffSummary: summary.summary } : {}),
    ...(selected.reason ? { selectedReason: selected.reason } : {}),
    ...(selected.usedSpeechIds ? { usedSpeechIds: selected.usedSpeechIds } : {}),
    ...(result.themeCoverage?.themeSidePossibility ? { themeSidePossibility: result.themeCoverage.themeSidePossibility } : {}),
    ...(result.themeCoverage?.compositionSidePossibility ? { compositionSidePossibility: result.themeCoverage.compositionSidePossibility } : {})
  };
}

function promptNumber(promptVersion: string): number {
  const match = promptVersion.match(/v(\d+)$/);
  return match ? Number.parseInt(match[1] ?? '0', 10) : Number.MAX_SAFE_INTEGER;
}

function compareRows(left: ComparisonRow, right: ComparisonRow): number {
  return left.fixtureId.localeCompare(right.fixtureId)
    || promptNumber(left.promptVersion) - promptNumber(right.promptVersion)
    || left.runAt.localeCompare(right.runAt)
    || left.resultPath.localeCompare(right.resultPath);
}

function formatMs(value: number): string {
  return value > 0 ? `+${value}ms` : `${value}ms`;
}

function buildReport(rows: ComparisonRow[], resultPath: string): string {
  const byFixture = new Map<string, ComparisonRow[]>();
  for (const row of rows) {
    const group = byFixture.get(row.fixtureId) ?? [];
    group.push(row);
    byFixture.set(row.fixtureId, group);
  }

  const lines = [
    '# clip_composition prompt結果比較',
    '',
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    '',
    '## 比較方針',
    '',
    '- 指定された result.json だけを読み、どのrunを比較しているかを固定する。',
    '- 自動の重み付けや合成スコアは作らず、開始差分、終了差分、重なりの説明をそのまま並べる。',
    '- theme側とcomposition側の暫定判定は、各 result.json に記録された文言をそのまま表示する。',
    ''
  ];

  for (const [fixtureId, fixtureRows] of [...byFixture.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`## ${fixtureId}`);
    lines.push('');
    lines.push('| prompt | model | cuts | exact | overlap | missing | extra | selected | expected | start delta | end delta | first overlap |');
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |');
    for (const row of fixtureRows.sort(compareRows)) {
      lines.push(`| ${row.promptVersion} | ${row.model} | ${row.selectedCutCount}/${row.expectedCutCount} | ${row.exactMatchCount} | ${row.overlappingCutCount} | ${row.missingExpectedCutCount} | ${row.extraSelectedCutCount} | ${row.selectedStartMs}-${row.selectedEndMs} | ${row.expectedStartMs}-${row.expectedEndMs} | ${formatMs(row.startDeltaMs)} | ${formatMs(row.endDeltaMs)} | ${row.overlapSummary} |`);
    }
    lines.push('');
    lines.push('### 判定メモ');
    lines.push('');
    for (const row of fixtureRows.sort(compareRows)) {
      lines.push(`- ${row.promptVersion}: theme側=${row.themeSidePossibility ?? '未記録'} / composition側=${row.compositionSidePossibility ?? '未記録'}`);
      if (row.diffSummary) {
        lines.push(`- ${row.promptVersion}: ${row.diffSummary}`);
      }
    }
    lines.push('');
  }

  lines.push('## 読み取り');
  lines.push('');
  lines.push('- 差分が0msのrunは、指定された期待区間と一致している。');
  lines.push('- cuts列は、選択区間数/期待区間数を表す。');
  lines.push('- missingは期待区間に対応する選択区間がない件数、extraは期待区間に対応しない選択区間の件数を表す。');
  lines.push('- 終了差分がマイナスのrunは期待区間より短く、プラスのrunは期待区間より長い。');
  lines.push('- どちらが良いかは、この表だけで自動決定せず、対応するsummaryと境界粒度レポートを見て判断する。');
  lines.push('');

  return lines.join('\n');
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const rows: ComparisonRow[] = [];
  for (const resultPath of options.resultPaths) {
    const result = validateScoreResult(await readJson(resultPath), resultPath);
    rows.push(buildRow(resultPath, result));
  }
  rows.sort(compareRows);

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const resultPath = path.join(outputDir, `prompt-result-comparison-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `prompt-result-comparison-${options.outputId}.md`);
  const payload = {
    kind: 'clip_composition_prompt_result_comparison',
    runAt: new Date().toISOString(),
    rows
  };
  await writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(rows, resultPath), 'utf8');
  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
