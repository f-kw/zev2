import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  ClipCompositionArtifact,
  ThemeArtifact,
  TranscriptArtifact
} from '../../runner/src/workflow-artifacts.js';
import type { buildClipComposition as buildClipCompositionType } from '../../runner/src/steps/composition.js';

type EvalOptions = {
  fixtureId: string;
  promptVersion: string;
  runs: number;
  model: string;
};

type FixtureMetadata = {
  fixtureId: string;
  draftId: string;
  transcriptPath: string;
  themesPath: string;
  selectedThemeId: string;
  sourceUri?: string;
  copiedFrom?: string;
  notes?: string[];
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
};

type ExpectedFile = {
  draftId: string;
  fixtureId?: string;
  expectedCuts: ExpectedCut[];
};

type SelectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
};

type CutDiff = {
  startDeltaMs: number;
  endDeltaMs: number;
  overlapSummary: string;
};

type RunResult = {
  runIndex: number;
  selectedCuts: SelectedCut[];
  diff: CutDiff;
};

type ThemeCoverage = {
  selectedThemeId: string;
  candidateStartMs: number;
  candidateEndMs: number;
  coverageSummary: string;
  themeSidePossibility: string;
  compositionSidePossibility: string;
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

function parseOptions(argv: string[]): EvalOptions {
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

  const fixtureId = values.get('fixture')?.trim();
  if (!fixtureId) {
    throw new Error('fixtureを指定してください: --fixture draft_w4Lp9IJC6pQl3FsRfFL9t');
  }

  const rawPromptVersion = values.get('promptVersion')?.trim();
  if (!rawPromptVersion) {
    throw new Error('プロンプト版数を指定してください: --promptVersion v001');
  }

  const parsedRuns = Number.parseInt(values.get('runs') ?? '1', 10);
  if (!Number.isInteger(parsedRuns) || parsedRuns < 1) {
    throw new Error('--runs は1以上の整数で指定してください');
  }

  return {
    fixtureId,
    promptVersion: normalizePromptVersion(rawPromptVersion),
    runs: parsedRuns,
    model: values.get('model')?.trim() || 'rule-based-build_clip_composition'
  };
}

function normalizePromptVersion(value: string): string {
  return value.startsWith('clip_composition_prompt_')
    ? value
    : `clip_composition_prompt_${value}`;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}はJSONオブジェクトである必要があります`);
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}は空でない文字列である必要があります`);
  }

  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label}は数値である必要があります`);
  }

  return value;
}

function validateFixtureMetadata(value: unknown): FixtureMetadata {
  const record = requireRecord(value, 'fixtureのメタデータ');
  return {
    fixtureId: requireString(record.fixtureId, 'fixture ID'),
    draftId: requireString(record.draftId, '下書きID'),
    transcriptPath: requireString(record.transcriptPath, '文字起こしファイルパス'),
    themesPath: requireString(record.themesPath, 'テーマ候補ファイルパス'),
    selectedThemeId: requireString(record.selectedThemeId, '選択済みテーマID'),
    ...(typeof record.sourceUri === 'string' ? { sourceUri: record.sourceUri } : {}),
    ...(typeof record.copiedFrom === 'string' ? { copiedFrom: record.copiedFrom } : {}),
    ...(Array.isArray(record.notes) ? { notes: record.notes.filter((item): item is string => typeof item === 'string') } : {})
  };
}

function validateExpectedFile(value: unknown): ExpectedFile {
  const record = requireRecord(value, '期待値ファイル');
  const expectedCuts = record.expectedCuts;
  if (!Array.isArray(expectedCuts) || expectedCuts.length === 0) {
    throw new Error('期待値ファイルには少なくとも1件の期待区間が必要です');
  }

  return {
    draftId: requireString(record.draftId, '期待値の下書きID'),
    ...(typeof record.fixtureId === 'string' ? { fixtureId: record.fixtureId } : {}),
    expectedCuts: expectedCuts.map((item, index) => {
      const cut = requireRecord(item, `期待区間 ${index + 1}`);
      const sourceStartMs = requireNumber(cut.sourceStartMs, `期待区間 ${index + 1} の開始位置`);
      const sourceEndMs = requireNumber(cut.sourceEndMs, `期待区間 ${index + 1} の終了位置`);
      if (sourceEndMs <= sourceStartMs) {
        throw new Error(`期待区間 ${index + 1} は終了位置が開始位置より後である必要があります`);
      }

      return {
        sourceStartMs,
        sourceEndMs,
        reason: requireString(cut.reason, `期待区間 ${index + 1} の理由`)
      };
    })
  };
}

function validateTranscriptArtifact(value: unknown): TranscriptArtifact {
  const record = requireRecord(value, '文字起こし');
  if (record.kind !== 'transcript_json') {
    throw new Error('文字起こしの種類が transcript_json ではありません');
  }

  if (!Array.isArray(record.segments) || record.segments.length === 0) {
    throw new Error('文字起こしに発話がありません');
  }

  if (!Array.isArray(record.speechUnitGroups)) {
    throw new Error('文字起こしに発話まとまりがありません');
  }

  return value as TranscriptArtifact;
}

function validateThemeArtifact(value: unknown, selectedThemeId: string): ThemeArtifact {
  const record = requireRecord(value, 'テーマ候補');
  if (record.kind !== 'theme_json') {
    throw new Error('テーマ候補の種類が theme_json ではありません');
  }

  if (!Array.isArray(record.themes) || record.themes.length === 0) {
    throw new Error('テーマ候補がありません');
  }

  const selectedTheme = record.themes
    .map((item) => requireRecord(item, 'テーマ候補'))
    .find((theme) => theme.id === selectedThemeId);
  if (!selectedTheme) {
    throw new Error(`選択済みテーマがfixtureのテーマ候補にありません: ${selectedThemeId}`);
  }

  return value as ThemeArtifact;
}

function selectedCutsFromComposition(composition: ClipCompositionArtifact): SelectedCut[] {
  return [{
    sourceStartMs: composition.sourceStartMs,
    sourceEndMs: composition.sourceEndMs,
    reason: [
      `選ばれたテーマ「${composition.title}」について、関連する発話まとまりを${composition.parts.length}個の編集元場面としてつないだ。`,
      composition.assemblyPlan
    ].join(' ')
  }];
}

function overlapMs(left: ExpectedCut | SelectedCut, right: ExpectedCut | SelectedCut): number {
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs));
}

function buildDiff(selectedCut: SelectedCut | undefined, expectedCut: ExpectedCut | undefined): CutDiff {
  if (!selectedCut || !expectedCut) {
    return {
      startDeltaMs: 0,
      endDeltaMs: 0,
      overlapSummary: '比較対象の区間が不足しています'
    };
  }

  const startDeltaMs = selectedCut.sourceStartMs - expectedCut.sourceStartMs;
  const endDeltaMs = selectedCut.sourceEndMs - expectedCut.sourceEndMs;
  const overlap = overlapMs(selectedCut, expectedCut);
  const selectedDuration = selectedCut.sourceEndMs - selectedCut.sourceStartMs;
  const expectedDuration = expectedCut.sourceEndMs - expectedCut.sourceStartMs;

  let overlapSummary = '重なりがありません';
  if (overlap > 0) {
    if (startDeltaMs === 0 && endDeltaMs === 0) {
      overlapSummary = '期待区間と完全に一致しています';
    } else if (selectedCut.sourceStartMs <= expectedCut.sourceStartMs && selectedCut.sourceEndMs >= expectedCut.sourceEndMs) {
      overlapSummary = 'AIが選んだ区間が期待区間を含んでいます';
    } else if (expectedCut.sourceStartMs <= selectedCut.sourceStartMs && expectedCut.sourceEndMs >= selectedCut.sourceEndMs) {
      overlapSummary = '期待区間の中にAIが選んだ区間が入っています';
    } else {
      overlapSummary = `一部重なっています。重なりは${overlap}ms、AI選択は${selectedDuration}ms、期待区間は${expectedDuration}msです`;
    }
  }

  return {
    startDeltaMs,
    endDeltaMs,
    overlapSummary
  };
}

function candidateCoverage(
  transcript: TranscriptArtifact,
  themes: ThemeArtifact,
  selectedThemeId: string,
  expectedCuts: ExpectedCut[],
  selectedCuts: SelectedCut[]
): ThemeCoverage {
  const selectedTheme = themes.themes.find((theme) => theme.id === selectedThemeId);
  if (!selectedTheme) {
    throw new Error(`選択済みテーマが見つかりません: ${selectedThemeId}`);
  }

  const relatedIds = new Set(selectedTheme.relatedSpeechIds);
  const groupedSpeechIds = transcript.speechUnitGroups.length > 0
    ? transcript.speechUnitGroups
    : selectedTheme.relatedSpeechIds.map((speechId) => [speechId]);
  const relatedGroups = groupedSpeechIds.filter((group) => group.some((speechId) => relatedIds.has(speechId)));
  const groups = relatedGroups.length > 0 ? relatedGroups : [selectedTheme.relatedSpeechIds];
  const candidateIds = new Set(groups.flat());
  const candidateSegments = transcript.segments.filter((segment) => candidateIds.has(segment.id));
  if (candidateSegments.length === 0) {
    throw new Error('選択済みテーマに対応する発話範囲を確認できません');
  }

  const candidateStartMs = Math.min(...candidateSegments.map((segment) => segment.startMs));
  const candidateEndMs = Math.max(...candidateSegments.map((segment) => segment.endMs));
  const expected = expectedCuts[0];
  const selected = selectedCuts[0];
  const expectedInsideTheme = expected.sourceStartMs >= candidateStartMs && expected.sourceEndMs <= candidateEndMs;
  const expectedOverlap = overlapMs(expected, { sourceStartMs: candidateStartMs, sourceEndMs: candidateEndMs, reason: '' });
  const selectedMatchesExpected = selected
    ? selected.sourceStartMs === expected.sourceStartMs && selected.sourceEndMs === expected.sourceEndMs
    : false;

  if (expectedInsideTheme && selectedMatchesExpected) {
    return {
      selectedThemeId,
      candidateStartMs,
      candidateEndMs,
      coverageSummary: '期待区間は選択済みテーマの候補範囲に入り、AIが選んだ区間も一致しています',
      themeSidePossibility: 'theme側で正解区間が候補に入っていない可能性は低い',
      compositionSidePossibility: 'composition側の候補選択差分はありません'
    };
  }

  if (expectedInsideTheme) {
    return {
      selectedThemeId,
      candidateStartMs,
      candidateEndMs,
      coverageSummary: '期待区間は選択済みテーマの候補範囲に入っています',
      themeSidePossibility: 'theme側で正解区間が候補に入っていない可能性は低い',
      compositionSidePossibility: 'composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります'
    };
  }

  if (expectedOverlap > 0) {
    return {
      selectedThemeId,
      candidateStartMs,
      candidateEndMs,
      coverageSummary: '期待区間は選択済みテーマの候補範囲と一部だけ重なっています',
      themeSidePossibility: 'theme側の候補範囲が不足している可能性があります',
      compositionSidePossibility: '候補範囲が不足しているため、composition側だけの失敗とは切り分けきれません'
    };
  }

  return {
    selectedThemeId,
    candidateStartMs,
    candidateEndMs,
    coverageSummary: '期待区間は選択済みテーマの候補範囲と重なっていません',
    themeSidePossibility: 'theme側で正解区間が候補に入っていない可能性があります',
    compositionSidePossibility: 'composition側は候補外の区間を選べないため、まずtheme側の入力を確認する必要があります'
  };
}

function buildStability(runs: RunResult[]) {
  const starts = runs.flatMap((run) => run.selectedCuts.map((cut) => cut.sourceStartMs));
  const ends = runs.flatMap((run) => run.selectedCuts.map((cut) => cut.sourceEndMs));
  const intervalKeys = new Set(runs.map((run) => JSON.stringify(run.selectedCuts.map((cut) => ({
    sourceStartMs: cut.sourceStartMs,
    sourceEndMs: cut.sourceEndMs
  })))));
  const reasons = new Set(runs.flatMap((run) => run.selectedCuts.map((cut) => cut.reason)));

  return {
    allRunsSelectedSameCuts: intervalKeys.size === 1,
    startJitterMs: starts.length > 0 ? Math.max(...starts) - Math.min(...starts) : 0,
    endJitterMs: ends.length > 0 ? Math.max(...ends) - Math.min(...ends) : 0,
    reasonVariantCount: reasons.size,
    reasonVariationSummary: reasons.size === 1
      ? '判断理由は全実行で同じです'
      : `判断理由が${reasons.size}種類に分かれました`
  };
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

function runIdFromTimestamp(runAt: string): string {
  return runAt.replace(/[-:]/g, '').replace('T', '-').replace('+0900', '');
}

function formatMs(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}ms`;
}

function buildSummaryMarkdown(input: {
  fixture: FixtureMetadata;
  promptVersion: string;
  model: string;
  params: Record<string, unknown>;
  selectedCuts: SelectedCut[];
  expectedCuts: ExpectedCut[];
  diff: CutDiff;
  stability: ReturnType<typeof buildStability>;
  themeCoverage: ThemeCoverage;
  resultPath: string;
}): string {
  const selected = input.selectedCuts[0];
  const expected = input.expectedCuts[0];
  return [
    '# clip_composition 評価サマリー',
    '',
    `- 入力fixture: ${input.fixture.fixtureId}`,
    `- 使用プロンプト版数: ${input.promptVersion}`,
    `- 使用モデル名: ${input.model}`,
    `- 使用パラメータ: ${JSON.stringify(input.params)}`,
    `- 評価結果JSON: ${input.resultPath}`,
    '',
    '## AIが選んだ区間',
    '',
    selected
      ? `- ${selected.sourceStartMs}ms - ${selected.sourceEndMs}ms: ${selected.reason}`
      : '- なし',
    '',
    '## 期待区間',
    '',
    expected
      ? `- ${expected.sourceStartMs}ms - ${expected.sourceEndMs}ms: ${expected.reason}`
      : '- なし',
    '',
    '## 差分',
    '',
    `- 開始位置のずれ: ${formatMs(input.diff.startDeltaMs)}`,
    `- 終了位置のずれ: ${formatMs(input.diff.endDeltaMs)}`,
    `- 重なり: ${input.diff.overlapSummary}`,
    '',
    '## 揺れ幅',
    '',
    `- 全実行で同じ区間を選んだか: ${input.stability.allRunsSelectedSameCuts ? 'はい' : 'いいえ'}`,
    `- 開始位置の揺れ幅: ${input.stability.startJitterMs}ms`,
    `- 終了位置の揺れ幅: ${input.stability.endJitterMs}ms`,
    `- 判断理由の揺れ: ${input.stability.reasonVariationSummary}`,
    '',
    '## 良くなった点',
    '',
    '- 初期版のため、前回プロンプトとの差分は未判定です。',
    '',
    '## 悪くなった点',
    '',
    '- 初期版のため、前回プロンプトとの差分は未判定です。',
    '',
    '## 人間が見るべき差分',
    '',
    `- ${input.diff.overlapSummary}`,
    '- 期待区間の理由が暫定なので、人間が妥当な開始位置と終了位置を精査する必要があります。',
    '',
    '## 暫定判定',
    '',
    `- theme側: ${input.themeCoverage.themeSidePossibility}`,
    `- composition側: ${input.themeCoverage.compositionSidePossibility}`,
    `- 候補範囲: ${input.themeCoverage.candidateStartMs}ms - ${input.themeCoverage.candidateEndMs}ms`,
    `- 判定理由: ${input.themeCoverage.coverageSummary}`,
    ''
  ].join('\n');
}

async function main() {
  const { buildClipComposition } = await import('../../runner/src/steps/composition.js') as {
    buildClipComposition: typeof buildClipCompositionType;
  };
  const options = parseOptions(process.argv.slice(2));
  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  const fixture = validateFixtureMetadata(
    await readJsonFile(path.join(fixtureDir, 'fixture.json'))
  );
  const transcript = validateTranscriptArtifact(
    await readJsonFile(path.join(fixtureDir, fixture.transcriptPath))
  );
  const themes = validateThemeArtifact(
    await readJsonFile(path.join(fixtureDir, fixture.themesPath)),
    fixture.selectedThemeId
  );
  const expectedFile = validateExpectedFile(
    await readJsonFile(path.join(evalRoot, 'expected', `${options.fixtureId}.json`))
  );

  if (expectedFile.draftId !== fixture.draftId) {
    throw new Error('fixtureの下書きIDと期待値の下書きIDが一致しません');
  }

  const params = {
    temperature: 0,
    llmCall: false,
    selection: '固定済みテーマIDに対応する発話まとまりから最終区間を作る'
  };
  const runAt = tokyoTimestamp(new Date());
  const runId = runIdFromTimestamp(runAt);
  const runResults: RunResult[] = [];

  for (let runIndex = 1; runIndex <= options.runs; runIndex += 1) {
    const composition = buildClipComposition(themes, transcript, fixture.selectedThemeId);
    const selectedCuts = selectedCutsFromComposition(composition);
    runResults.push({
      runIndex,
      selectedCuts,
      diff: buildDiff(selectedCuts[0], expectedFile.expectedCuts[0])
    });
  }

  const firstRun = runResults[0];
  if (!firstRun) {
    throw new Error('評価実行結果がありません');
  }

  const stability = buildStability(runResults);
  const themeCoverage = candidateCoverage(
    transcript,
    themes,
    fixture.selectedThemeId,
    expectedFile.expectedCuts,
    firstRun.selectedCuts
  );
  const outputDir = path.join(evalRoot, 'outputs', fixture.fixtureId, options.promptVersion, runId);
  const reportDir = path.join(evalRoot, 'reports', fixture.fixtureId, options.promptVersion, runId);
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const resultPath = path.join(outputDir, 'result.json');
  const summaryPath = path.join(reportDir, 'summary.md');
  const result = {
    runAt,
    draftId: fixture.draftId,
    fixtureId: fixture.fixtureId,
    promptVersion: options.promptVersion,
    model: options.model,
    params,
    selectedCuts: firstRun.selectedCuts,
    expectedCuts: expectedFile.expectedCuts,
    diff: firstRun.diff,
    runs: runResults,
    stability,
    themeCoverage,
    sourceFiles: {
      fixture: path.relative(evalRoot, fixtureDir),
      transcript: path.join(path.relative(evalRoot, fixtureDir), fixture.transcriptPath),
      themes: path.join(path.relative(evalRoot, fixtureDir), fixture.themesPath),
      expected: path.join('expected', `${options.fixtureId}.json`)
    }
  };

  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(summaryPath, buildSummaryMarkdown({
    fixture,
    promptVersion: options.promptVersion,
    model: options.model,
    params,
    selectedCuts: firstRun.selectedCuts,
    expectedCuts: expectedFile.expectedCuts,
    diff: firstRun.diff,
    stability,
    themeCoverage,
    resultPath
  }), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`summary: ${summaryPath}`);
  console.log(`runs: ${options.runs}`);
  console.log(`same cuts: ${stability.allRunsSelectedSameCuts ? 'yes' : 'no'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
