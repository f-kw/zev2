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
  generationSystem: {
    id: string;
    kind: string;
    intervalGenerator: string;
    promptVersion?: string | null;
    usesPromptVersionForGeneration?: boolean;
    legacyInferred?: boolean;
  };
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
  generationSystemId: string;
  intervalGenerator: string;
  generationSystemKind: string;
  generationSystemLegacyInferred: boolean;
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
  selectedIntervals: string[];
  expectedIntervals: string[];
  cutDiffs: Array<{
    cutIndex: number;
    status: string;
    startDeltaMs?: number;
    endDeltaMs?: number;
    overlapMs?: number;
    overlapSummary?: string;
  }>;
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
    generationSystem: generationSystemFrom(record, resultPath),
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

function generationSystemFrom(record: Record<string, unknown>, resultPath: string): ScoreResult['generationSystem'] {
  const raw = recordFrom(record.generationSystem);
  if (typeof raw.id === 'string' && typeof raw.kind === 'string' && typeof raw.intervalGenerator === 'string') {
    const generationSystem: ScoreResult['generationSystem'] = {
      id: raw.id,
      kind: raw.kind,
      intervalGenerator: raw.intervalGenerator
    };
    const rawPromptVersion = raw.promptVersion;
    if (typeof rawPromptVersion === 'string') {
      generationSystem.promptVersion = rawPromptVersion;
    } else if (rawPromptVersion === null) {
      generationSystem.promptVersion = null;
    }
    if (typeof raw.usesPromptVersionForGeneration === 'boolean') {
      generationSystem.usesPromptVersionForGeneration = raw.usesPromptVersionForGeneration;
    }
    if (typeof raw.legacyInferred === 'boolean') {
      generationSystem.legacyInferred = raw.legacyInferred;
    }
    return generationSystem;
  }

  const promptVersion = typeof record.promptVersion === 'string' ? record.promptVersion : 'unknown';
  const model = typeof record.model === 'string' ? record.model : '';
  const params = recordFrom(record.params);
  const hasExternalInput = typeof record.inputFile === 'string';
  if (model === 'rule-output-smoke' || model === 'rule-based-result-as-external') {
    return {
      id: 'other-rule-output-score',
      kind: 'other',
      intervalGenerator: 'rule-output-json-rescored-as-external-input',
      promptVersion,
      usesPromptVersionForGeneration: false,
      legacyInferred: true
    };
  }
  if (params.llmCall === false || model === 'rule-based-build_clip_composition' || model === 'baseline-rule') {
    return {
      id: 'baseline-rule',
      kind: 'baseline-rule',
      intervalGenerator: 'runner.buildClipComposition',
      promptVersion: null,
      usesPromptVersionForGeneration: false,
      legacyInferred: true
    };
  }
  if (model.includes('gemini') || model === 'external-prompt-output') {
    return {
      id: `llm-${promptVersion.replace(/^clip_composition_prompt_/, '')}`,
      kind: 'llm',
      intervalGenerator: 'web-gemini+prompt',
      promptVersion,
      usesPromptVersionForGeneration: true,
      legacyInferred: true
    };
  }
  return {
    id: 'other-unknown',
    kind: 'other',
    intervalGenerator: hasExternalInput ? `external-json:${resultPath}` : `unknown:${resultPath}`,
    promptVersion,
    usesPromptVersionForGeneration: false,
    legacyInferred: true
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
  const cutDiffs = computedCutDiffs(result);
  const compared = cutDiffs.filter((diff) => diff.status === 'compared');
  const exactMatchCount = compared.filter((diff) => diff.startDeltaMs === 0 && diff.endDeltaMs === 0).length;
  const overlappingCutCount = compared.filter((diff) => (diff.overlapMs ?? 0) > 0).length;
  const missingExpectedCutCount = cutDiffs.filter((diff) => diff.status === 'missing_selected_cut').length;
  const extraSelectedCutCount = cutDiffs.filter((diff) => diff.status === 'extra_selected_cut').length;
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

function computedCutDiffs(result: ScoreResult): NonNullable<ScoreResult['cutDiffs']> {
  if (result.cutDiffs && result.cutDiffs.length > 0) {
    return result.cutDiffs;
  }

  const count = Math.max(result.selectedCuts.length, result.expectedCuts.length);
  const cutDiffs: NonNullable<ScoreResult['cutDiffs']> = [];
  for (let index = 0; index < count; index += 1) {
    const selected = result.selectedCuts[index];
    const expected = result.expectedCuts[index];
    if (selected && expected) {
      const overlapMs = Math.max(
        0,
        Math.min(selected.sourceEndMs, expected.sourceEndMs) - Math.max(selected.sourceStartMs, expected.sourceStartMs)
      );
      cutDiffs.push({
        cutIndex: index,
        status: 'compared',
        startDeltaMs: selected.sourceStartMs - expected.sourceStartMs,
        endDeltaMs: selected.sourceEndMs - expected.sourceEndMs,
        overlapMs,
        overlapSummary: index === 0 ? result.diff.overlapSummary : `区間${index + 1}の重なりは${overlapMs}msです`
      });
      continue;
    }

    if (expected) {
      cutDiffs.push({
        cutIndex: index,
        status: 'missing_selected_cut',
        overlapMs: 0,
        overlapSummary: `期待区間${index + 1}に対応する選択区間がありません`
      });
      continue;
    }

    cutDiffs.push({
      cutIndex: index,
      status: 'extra_selected_cut',
      overlapMs: 0,
      overlapSummary: `選択区間${index + 1}に対応する期待区間がありません`
    });
  }
  return cutDiffs;
}

function intervalText(cut: Cut): string {
  return `${cut.sourceStartMs}-${cut.sourceEndMs}`;
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
  const cutDiffs = computedCutDiffs(result);
  const summary = computedDiffSummary(result);
  return {
    resultPath: path.relative(workspaceRoot(), resultPath),
    runAt: result.runAt,
    fixtureId: result.fixtureId,
    promptVersion: result.promptVersion,
    generationSystemId: result.generationSystem.id,
    intervalGenerator: result.generationSystem.intervalGenerator,
    generationSystemKind: result.generationSystem.kind,
    generationSystemLegacyInferred: result.generationSystem.legacyInferred === true,
    model: result.model,
    params: result.params,
    selectedStartMs: selected.sourceStartMs,
    selectedEndMs: selected.sourceEndMs,
    expectedStartMs: expected.sourceStartMs,
    expectedEndMs: expected.sourceEndMs,
    startDeltaMs: result.diff.startDeltaMs,
    endDeltaMs: result.diff.endDeltaMs,
    overlapSummary: result.diff.overlapSummary,
    selectedCutCount: summary.selectedCutCount,
    expectedCutCount: summary.expectedCutCount,
    exactMatchCount: summary.exactMatchCount,
    overlappingCutCount: summary.overlappingCutCount,
    missingExpectedCutCount: summary.missingExpectedCutCount,
    extraSelectedCutCount: summary.extraSelectedCutCount,
    allExpectedCutsMatchedExactlyByIndex: summary.allExpectedCutsMatchedExactlyByIndex,
    allExpectedCutsHaveOverlapByIndex: summary.allExpectedCutsHaveOverlapByIndex,
    diffSummary: summary.summary,
    selectedIntervals: result.selectedCuts.map(intervalText),
    expectedIntervals: result.expectedCuts.map(intervalText),
    cutDiffs,
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
    || left.generationSystemId.localeCompare(right.generationSystemId)
    || left.runAt.localeCompare(right.runAt)
    || left.resultPath.localeCompare(right.resultPath);
}

function formatMs(value: number): string {
  return value > 0 ? `+${value}ms` : `${value}ms`;
}

function formatIntervals(intervals: string[]): string {
  return intervals.length > 0 ? intervals.join('<br>') : 'なし';
}

function formatCutDiffs(cutDiffs: ComparisonRow['cutDiffs']): string {
  if (cutDiffs.length === 0) {
    return 'なし';
  }

  return cutDiffs.map((diff) => {
    const label = `${diff.cutIndex + 1}:${diff.status}`;
    const start = diff.startDeltaMs === undefined ? '開始 比較不可' : `開始 ${formatMs(diff.startDeltaMs)}`;
    const end = diff.endDeltaMs === undefined ? '終了 比較不可' : `終了 ${formatMs(diff.endDeltaMs)}`;
    const overlap = diff.overlapMs === undefined ? '重なり 比較不可' : `重なり ${diff.overlapMs}ms`;
    return [label, start, end, overlap].join(' / ');
  }).join('<br>');
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
    lines.push('| system | generator | prompt label | model | cuts | exact | overlap | missing | extra | selected intervals | expected intervals | first start delta | first end delta | cut diffs |');
    lines.push('| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |');
    for (const row of fixtureRows.sort(compareRows)) {
      const legacy = row.generationSystemLegacyInferred ? ' (legacy inferred)' : '';
      lines.push(`| ${row.generationSystemId}${legacy} | ${row.intervalGenerator} | ${row.promptVersion} | ${row.model} | ${row.selectedCutCount}/${row.expectedCutCount} | ${row.exactMatchCount} | ${row.overlappingCutCount} | ${row.missingExpectedCutCount} | ${row.extraSelectedCutCount} | ${formatIntervals(row.selectedIntervals)} | ${formatIntervals(row.expectedIntervals)} | ${formatMs(row.startDeltaMs)} | ${formatMs(row.endDeltaMs)} | ${formatCutDiffs(row.cutDiffs)} |`);
    }
    lines.push('');
    lines.push('### 判定メモ');
    lines.push('');
    for (const row of fixtureRows.sort(compareRows)) {
      lines.push(`- ${row.generationSystemId} / ${row.promptVersion}: theme側=${row.themeSidePossibility ?? '未記録'} / composition側=${row.compositionSidePossibility ?? '未記録'}`);
      if (row.diffSummary) {
        lines.push(`- ${row.generationSystemId} / ${row.promptVersion}: ${row.diffSummary}`);
      }
    }
    lines.push('');
  }

  lines.push('## 読み取り');
  lines.push('');
  lines.push('- 差分が0msのrunは、指定された期待区間と一致している。');
  lines.push('- cuts列は、選択区間数/期待区間数を表す。');
  lines.push('- selected intervalsとexpected intervalsは、複数区間expectedの場合に全区間を順番に表示する。');
  lines.push('- cut diffsは、各区間の開始差分、終了差分、重なりを順番に表示する。');
  lines.push('- missingは期待区間に対応する選択区間がない件数、extraは期待区間に対応しない選択区間の件数を表す。');
  lines.push('- 終了差分がマイナスのrunは期待区間より短く、プラスのrunは期待区間より長い。');
  lines.push('- どちらが良いかは、この表だけで自動決定せず、対応するsummaryと境界粒度レポートを見て判断する。');
  lines.push('- system列がbaseline-ruleの場合、区間を生成したのはルール処理であり、prompt labelは比較用ラベルにすぎない。');
  lines.push('- system列がllm-vNNNの場合、区間を生成したのはWeb Geminiと該当プロンプト版である。');
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
