import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  promptVersion: string;
  inputFile: string;
  model: string;
  params: Record<string, unknown>;
};

type FixtureMetadata = {
  fixtureId: string;
  draftId: string;
  transcriptPath: string;
  themesPath: string;
  selectedThemeId: string;
};

type TranscriptArtifact = {
  kind: 'transcript_json';
  segments: Array<{
    id: number;
    startMs: number;
    endMs: number;
    text: string;
  }>;
  speechUnitGroups: number[][];
};

type ThemeArtifact = {
  kind: 'theme_json';
  themes: Array<{
    id: string;
    title: string;
    relatedSpeechIds: number[];
  }>;
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
  [key: string]: unknown;
};

type ExcludedRange = {
  id: string;
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
  [key: string]: unknown;
};

type ExpectedFile = {
  draftId: string;
  fixtureId?: string;
  expectedCuts: ExpectedCut[];
  excludedRanges: ExcludedRange[];
};

type SelectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
  usedSpeechIds?: number[];
  [key: string]: unknown;
};

type CandidateOutput = {
  selectedCuts: SelectedCut[];
  [key: string]: unknown;
};

type CutDiff = {
  startDeltaMs: number;
  endDeltaMs: number;
  overlapSummary: string;
};

type CutPairDiff = {
  cutIndex: number;
  status: 'compared' | 'missing_selected_cut' | 'extra_selected_cut';
  selectedCut?: SelectedCut;
  expectedCut?: ExpectedCut;
  startDeltaMs?: number;
  endDeltaMs?: number;
  overlapMs: number;
  overlapSummary: string;
};

type ExcludedSelectedCut = {
  selectedCutIndex: number;
  selectedCut: SelectedCut;
  excludedRange: ExcludedRange;
  overlapMs: number;
  scoringTreatment: 'excluded_from_scoring';
  reason: string;
};

type TimestampPlausibilityIssue = {
  selectedCutIndex: number;
  boundary: 'sourceStartMs' | 'sourceEndMs';
  valueMs: number;
  nearestTranscriptBoundaryMs: number;
  distanceFromNearestBoundaryMs: number;
  allowedDistanceMs: number;
  status: 'suspectedFabricatedTimestamp';
  reason: string;
};

type TimestampPlausibility = {
  boundaryMarginMs: number;
  transcriptBoundaryCount: number;
  suspectedFabricatedTimestamp: boolean;
  issues: TimestampPlausibilityIssue[];
};

type DiffSummary = {
  expectedCutCount: number;
  selectedCutCount: number;
  comparedCutCount: number;
  exactMatchCount: number;
  overlappingCutCount: number;
  missingExpectedCutCount: number;
  extraSelectedCutCount: number;
  allExpectedCutsMatchedExactlyByIndex: boolean;
  allExpectedCutsHaveOverlapByIndex: boolean;
  summary: string;
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

  const fixtureId = values.get('fixture')?.trim();
  if (!fixtureId) {
    throw new Error('--fixture を指定してください');
  }

  const rawPromptVersion = values.get('promptVersion')?.trim();
  if (!rawPromptVersion) {
    throw new Error('--promptVersion を指定してください');
  }

  const inputFile = values.get('input')?.trim();
  if (!inputFile) {
    throw new Error('--input で採点するLLM出力JSONを指定してください');
  }

  return {
    fixtureId: sanitizePathPart(fixtureId),
    promptVersion: normalizePromptVersion(rawPromptVersion),
    inputFile: path.resolve(inputFile),
    model: values.get('model')?.trim() || 'external-prompt-output',
    params: parseParams(values.get('params'))
  };
}

function normalizePromptVersion(value: string): string {
  return value.startsWith('clip_composition_prompt_')
    ? value
    : `clip_composition_prompt_${value}`;
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function parseParams(value: string | undefined): Record<string, unknown> {
  if (!value?.trim()) {
    return {
      temperature: 'unknown',
      source: 'external'
    };
  }

  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('--params はJSONオブジェクトで指定してください');
  }
  return parsed as Record<string, unknown>;
}

function llmGenerationSystem(promptVersion: string, model: string, inputFile: string): Record<string, unknown> {
  const suffix = promptVersion.replace(/^clip_composition_prompt_/, '');
  return {
    id: `llm-${suffix}`,
    kind: 'llm',
    intervalGenerator: 'web-gemini+prompt',
    promptVersion,
    usesPromptVersionForGeneration: true,
    model,
    sourceOutput: inputFile
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
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

function validateFixture(value: unknown): FixtureMetadata {
  const record = requireRecord(value, 'fixture');
  return {
    fixtureId: requireString(record.fixtureId, 'fixture ID'),
    draftId: requireString(record.draftId, '下書きID'),
    transcriptPath: requireString(record.transcriptPath, '文字起こしファイルパス'),
    themesPath: requireString(record.themesPath, 'テーマ候補ファイルパス'),
    selectedThemeId: requireString(record.selectedThemeId, '選択済みテーマID')
  };
}

function validateTranscript(value: unknown): TranscriptArtifact {
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

function validateThemes(value: unknown, selectedThemeId: string): ThemeArtifact {
  const record = requireRecord(value, 'テーマ候補');
  if (record.kind !== 'theme_json') {
    throw new Error('テーマ候補の種類が theme_json ではありません');
  }
  if (!Array.isArray(record.themes) || record.themes.length === 0) {
    throw new Error('テーマ候補がありません');
  }
  if (!record.themes.some((item) => requireRecord(item, 'テーマ候補').id === selectedThemeId)) {
    throw new Error(`選択済みテーマがありません: ${selectedThemeId}`);
  }
  return value as ThemeArtifact;
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
      const extraFields = Object.fromEntries(
        Object.entries(cut).filter(([key]) => !['sourceStartMs', 'sourceEndMs', 'reason'].includes(key))
      );
      return {
        sourceStartMs: requireNumber(cut.sourceStartMs, `期待区間 ${index + 1} の開始位置`),
        sourceEndMs: requireNumber(cut.sourceEndMs, `期待区間 ${index + 1} の終了位置`),
        reason: requireString(cut.reason, `期待区間 ${index + 1} の理由`),
        ...extraFields
      };
    }),
    excludedRanges: validateExplicitExcludedRanges(record.excludedRanges)
  };
}

function validateExplicitExcludedRanges(value: unknown): ExcludedRange[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error('期待値ファイルの除外区間は配列である必要があります');
  }
  return value.map((item, index) => {
    const range = requireRecord(item, `除外区間 ${index + 1}`);
    const sourceStartMs = requireNumber(range.sourceStartMs, `除外区間 ${index + 1} の開始位置`);
    const sourceEndMs = requireNumber(range.sourceEndMs, `除外区間 ${index + 1} の終了位置`);
    if (sourceEndMs <= sourceStartMs) {
      throw new Error(`除外区間 ${index + 1} は終了位置が開始位置より後である必要があります`);
    }
    const extraFields = Object.fromEntries(
      Object.entries(range).filter(([key]) => !['id', 'sourceStartMs', 'sourceEndMs', 'reason'].includes(key))
    );
    return {
      id: typeof range.id === 'string' && range.id.trim() ? range.id : `excluded_range_${index + 1}`,
      sourceStartMs,
      sourceEndMs,
      reason: typeof range.reason === 'string' && range.reason.trim()
        ? range.reason
        : '期待値ファイルで採点対象外として指定された区間',
      ...extraFields
    };
  });
}

function normalizeUsedSpeechIds(value: unknown, label: string): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label}は配列である必要があります`);
  }

  const ids: number[] = [];
  value.forEach((item, index) => {
    const itemLabel = `${label}[${index}]`;
    if (typeof item === 'number') {
      if (!Number.isInteger(item)) {
        throw new Error(`${itemLabel}は整数の発話IDである必要があります`);
      }
      ids.push(item);
      return;
    }

    if (typeof item !== 'string') {
      throw new Error(`${itemLabel}は整数または "12-47" 形式の文字列である必要があります`);
    }

    const match = item.match(/^(\d+)-(\d+)$/);
    if (!match) {
      throw new Error(`${itemLabel}は "12-47" 形式の範囲文字列である必要があります`);
    }
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) {
      throw new Error(`${itemLabel}は開始IDが終了ID以下の安全な整数範囲である必要があります`);
    }
    for (let id = start; id <= end; id += 1) {
      ids.push(id);
    }
  });

  return ids;
}

function validateCandidateOutput(value: unknown): CandidateOutput {
  const record = requireRecord(value, 'LLM出力');
  const selectedCuts = record.selectedCuts;
  if (!Array.isArray(selectedCuts) || selectedCuts.length === 0) {
    throw new Error('LLM出力には selectedCuts が必要です');
  }
  return {
    ...record,
    selectedCuts: selectedCuts.map((item, index) => {
      const cut = requireRecord(item, `選択区間 ${index + 1}`);
      const sourceStartMs = requireNumber(cut.sourceStartMs, `選択区間 ${index + 1} の開始位置`);
      const sourceEndMs = requireNumber(cut.sourceEndMs, `選択区間 ${index + 1} の終了位置`);
      if (sourceEndMs <= sourceStartMs) {
        throw new Error(`選択区間 ${index + 1} は終了位置が開始位置より後である必要があります`);
      }
      const extraFields = Object.fromEntries(
        Object.entries(cut).filter(([key]) => !['sourceStartMs', 'sourceEndMs', 'reason', 'usedSpeechIds'].includes(key))
      );
      return {
        sourceStartMs,
        sourceEndMs,
        reason: requireString(cut.reason, `選択区間 ${index + 1} の理由`),
        ...(cut.usedSpeechIds !== undefined
          ? { usedSpeechIds: normalizeUsedSpeechIds(cut.usedSpeechIds, `選択区間 ${index + 1} の usedSpeechIds`) }
          : {}),
        ...extraFields
      };
    })
  };
}

function overlapMs(left: ExpectedCut | SelectedCut, right: ExpectedCut | SelectedCut): number {
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs));
}

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function sourceRangeKey(range: Pick<ExcludedRange, 'sourceStartMs' | 'sourceEndMs'>): string {
  return `${range.sourceStartMs}-${range.sourceEndMs}`;
}

function hasUnresolvedExclusionAtBoundary(cut: ExpectedCut, side: 'leading' | 'trailing'): boolean {
  const boundaryStatus = optionalRecord(cut.boundaryStatus);
  const statusRecord = optionalRecord(boundaryStatus?.[side]);
  return statusRecord?.status === 'adjacent_to_unresolved_exclusion';
}

function unresolvedRangeIds(cut: ExpectedCut): string[] {
  const policy = optionalRecord(cut.partialFixturePolicy);
  const ids = policy?.unresolvedRangeIds;
  return Array.isArray(ids) ? ids.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function inferExcludedRangesFromExpectedCuts(expectedCuts: ExpectedCut[]): ExcludedRange[] {
  const inferred: ExcludedRange[] = [];
  for (let index = 0; index < expectedCuts.length - 1; index += 1) {
    const current = expectedCuts[index];
    const next = expectedCuts[index + 1];
    if (!current || !next || current.sourceEndMs >= next.sourceStartMs) {
      continue;
    }

    const touchesUnresolvedBoundary = hasUnresolvedExclusionAtBoundary(current, 'trailing')
      || hasUnresolvedExclusionAtBoundary(next, 'leading');
    if (!touchesUnresolvedBoundary) {
      continue;
    }

    const ids = [...unresolvedRangeIds(current), ...unresolvedRangeIds(next)];
    const id = ids[0] ?? `unresolved_gap_after_expected_cut_${index + 1}`;
    inferred.push({
      id,
      sourceStartMs: current.sourceEndMs,
      sourceEndMs: next.sourceStartMs,
      reason: `期待区間${index + 1}と${index + 2}の間で未解決除外として記録されたsource側の区間`,
      inferredFromExpectedBoundary: true,
      beforeExpectedCutIndex: index,
      afterExpectedCutIndex: index + 1
    });
  }
  return inferred;
}

function expectedExcludedRanges(expectedFile: ExpectedFile): ExcludedRange[] {
  const byRange = new Map<string, ExcludedRange>();
  for (const range of expectedFile.excludedRanges) {
    byRange.set(sourceRangeKey(range), range);
  }
  for (const range of inferExcludedRangesFromExpectedCuts(expectedFile.expectedCuts)) {
    if (!byRange.has(sourceRangeKey(range))) {
      byRange.set(sourceRangeKey(range), range);
    }
  }
  return [...byRange.values()].sort((left, right) => left.sourceStartMs - right.sourceStartMs);
}

function splitSelectedCutsForScoring(
  selectedCuts: SelectedCut[],
  expectedCuts: ExpectedCut[],
  excludedRanges: ExcludedRange[]
): { scoredSelectedCuts: SelectedCut[]; excludedSelectedCuts: ExcludedSelectedCut[] } {
  if (excludedRanges.length === 0) {
    return {
      scoredSelectedCuts: selectedCuts,
      excludedSelectedCuts: []
    };
  }

  const scoredSelectedCuts: SelectedCut[] = [];
  const excludedSelectedCuts: ExcludedSelectedCut[] = [];
  for (const [index, selectedCut] of selectedCuts.entries()) {
    const expectedOverlap = expectedCuts.some((expectedCut) => overlapMs(selectedCut, expectedCut) > 0);
    const excludedOverlaps = excludedRanges
      .map((excludedRange) => ({
        excludedRange,
        overlapMs: overlapMs(selectedCut, excludedRange)
      }))
      .filter((item) => item.overlapMs > 0);

    if (!expectedOverlap && excludedOverlaps.length > 0) {
      const largestOverlap = excludedOverlaps.sort((left, right) => right.overlapMs - left.overlapMs)[0];
      if (!largestOverlap) {
        scoredSelectedCuts.push(selectedCut);
        continue;
      }
      excludedSelectedCuts.push({
        selectedCutIndex: index,
        selectedCut,
        excludedRange: largestOverlap.excludedRange,
        overlapMs: largestOverlap.overlapMs,
        scoringTreatment: 'excluded_from_scoring',
        reason: '期待区間とは重ならず、未解決除外区間と重なるため採点対象外にする'
      });
      continue;
    }

    scoredSelectedCuts.push(selectedCut);
  }

  return {
    scoredSelectedCuts,
    excludedSelectedCuts
  };
}

function buildTimestampPlausibility(transcript: TranscriptArtifact, selectedCuts: SelectedCut[]): TimestampPlausibility {
  const boundaryMarginMs = 5000;
  const transcriptBoundaries = transcript.segments
    .flatMap((segment) => [segment.startMs, segment.endMs])
    .filter((value) => Number.isFinite(value));
  if (transcriptBoundaries.length === 0) {
    return {
      boundaryMarginMs,
      transcriptBoundaryCount: 0,
      suspectedFabricatedTimestamp: false,
      issues: []
    };
  }
  const firstTranscriptBoundary = transcriptBoundaries[0];
  const issues: TimestampPlausibilityIssue[] = [];
  for (const [selectedCutIndex, selectedCut] of selectedCuts.entries()) {
    for (const boundary of ['sourceStartMs', 'sourceEndMs'] as const) {
      const valueMs = selectedCut[boundary];
      const nearestTranscriptBoundaryMs = transcriptBoundaries.reduce((nearest, candidate) => {
        return Math.abs(candidate - valueMs) < Math.abs(nearest - valueMs) ? candidate : nearest;
      }, firstTranscriptBoundary);
      const distanceFromNearestBoundaryMs = Math.abs(nearestTranscriptBoundaryMs - valueMs);
      if (distanceFromNearestBoundaryMs <= boundaryMarginMs) {
        continue;
      }
      issues.push({
        selectedCutIndex,
        boundary,
        valueMs,
        nearestTranscriptBoundaryMs,
        distanceFromNearestBoundaryMs,
        allowedDistanceMs: boundaryMarginMs,
        status: 'suspectedFabricatedTimestamp',
        reason: '選択区間の境界が、入力文字起こしに含まれる発話境界から5000msを超えて離れている'
      });
    }
  }
  return {
    boundaryMarginMs,
    transcriptBoundaryCount: transcriptBoundaries.length,
    suspectedFabricatedTimestamp: issues.length > 0,
    issues
  };
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
      overlapSummary = 'LLMが選んだ区間が期待区間を含んでいます';
    } else if (expectedCut.sourceStartMs <= selectedCut.sourceStartMs && expectedCut.sourceEndMs >= selectedCut.sourceEndMs) {
      overlapSummary = '期待区間の中にLLMが選んだ区間が入っています';
    } else {
      overlapSummary = `一部重なっています。重なりは${overlap}ms、LLM選択は${selectedDuration}ms、期待区間は${expectedDuration}msです`;
    }
  }
  return {
    startDeltaMs,
    endDeltaMs,
    overlapSummary
  };
}

function buildCutDiffs(selectedCuts: SelectedCut[], expectedCuts: ExpectedCut[]): CutPairDiff[] {
  const diffs: CutPairDiff[] = [];
  const selectedCutsWithAnyExpectedOverlap = new Set<number>();

  for (let index = 0; index < expectedCuts.length; index += 1) {
    const expectedCut = expectedCuts[index];
    const selectedCut = findBestOverlappingSelectedCut(selectedCuts, expectedCut);
    if (selectedCut) {
      selectedCutsWithAnyExpectedOverlap.add(selectedCut.index);
      const diff = buildDiff(selectedCut.cut, expectedCut);
      diffs.push({
        cutIndex: index,
        status: 'compared',
        selectedCut: selectedCut.cut,
        expectedCut,
        startDeltaMs: diff.startDeltaMs,
        endDeltaMs: diff.endDeltaMs,
        overlapMs: overlapMs(selectedCut.cut, expectedCut),
        overlapSummary: diff.overlapSummary
      });
      continue;
    }

    diffs.push({
      cutIndex: index,
      status: 'missing_selected_cut',
      expectedCut,
      overlapMs: 0,
      overlapSummary: `期待区間${index + 1}に重なる選択区間がありません`
    });
  }

  for (let index = 0; index < selectedCuts.length; index += 1) {
    const selectedCut = selectedCuts[index];
    if (!selectedCutsWithAnyExpectedOverlap.has(index) && selectedCut) {
      diffs.push({
        cutIndex: expectedCuts.length + index,
        status: 'extra_selected_cut',
        selectedCut,
        overlapMs: 0,
        overlapSummary: `選択区間${index + 1}に重なる期待区間がありません`
      });
    }
  }
  return diffs;
}

function findBestOverlappingSelectedCut(
  selectedCuts: SelectedCut[],
  expectedCut: ExpectedCut
): { index: number; cut: SelectedCut } | undefined {
  const candidates = selectedCuts
    .map((cut, index) => ({
      index,
      cut,
      overlap: overlapMs(cut, expectedCut),
      startDistance: Math.abs(cut.sourceStartMs - expectedCut.sourceStartMs),
      endDistance: Math.abs(cut.sourceEndMs - expectedCut.sourceEndMs)
    }))
    .filter((candidate) => candidate.overlap > 0);

  if (candidates.length === 0) {
    return undefined;
  }

  candidates.sort((left, right) =>
    right.overlap - left.overlap
    || left.startDistance - right.startDistance
    || left.endDistance - right.endDistance
    || left.index - right.index
  );
  const best = candidates[0];
  return best ? { index: best.index, cut: best.cut } : undefined;
}

function buildDiffSummary(cutDiffs: CutPairDiff[], selectedCuts: SelectedCut[], expectedCuts: ExpectedCut[]): DiffSummary {
  const compared = cutDiffs.filter((diff) => diff.status === 'compared');
  const exactMatchCount = compared.filter((diff) => diff.startDeltaMs === 0 && diff.endDeltaMs === 0).length;
  const overlappingCutCount = compared.filter((diff) => diff.overlapMs > 0).length;
  const missingExpectedCutCount = cutDiffs.filter((diff) => diff.status === 'missing_selected_cut').length;
  const extraSelectedCutCount = cutDiffs.filter((diff) => diff.status === 'extra_selected_cut').length;
  const allExpectedCutsMatchedExactlyByIndex = expectedCuts.length > 0
    && selectedCuts.length === expectedCuts.length
    && exactMatchCount === expectedCuts.length;
  const allExpectedCutsHaveOverlapByIndex = expectedCuts.length > 0
    && missingExpectedCutCount === 0
    && compared.slice(0, expectedCuts.length).every((diff) => diff.overlapMs > 0);
  return {
    expectedCutCount: expectedCuts.length,
    selectedCutCount: selectedCuts.length,
    comparedCutCount: compared.length,
    exactMatchCount,
    overlappingCutCount,
    missingExpectedCutCount,
    extraSelectedCutCount,
    allExpectedCutsMatchedExactlyByIndex,
    allExpectedCutsHaveOverlapByIndex,
    summary: [
      `期待区間${expectedCuts.length}件に対して選択区間${selectedCuts.length}件。`,
      `完全一致${exactMatchCount}件、重なりあり${overlappingCutCount}件。`,
      `未選択の期待区間${missingExpectedCutCount}件、余分な選択区間${extraSelectedCutCount}件。`
    ].join(' ')
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
  const themeRange = { sourceStartMs: candidateStartMs, sourceEndMs: candidateEndMs, reason: '' };
  const expectedInsideTheme = expectedCuts.every(
    (expected) => expected.sourceStartMs >= candidateStartMs && expected.sourceEndMs <= candidateEndMs
  );
  const expectedOverlap = expectedCuts.some((expected) => overlapMs(expected, themeRange) > 0);
  const selectedMatchesExpected = selectedCuts.length === expectedCuts.length
    && expectedCuts.every((expected, index) => {
      const selected = selectedCuts[index];
      return selected
        ? selected.sourceStartMs === expected.sourceStartMs && selected.sourceEndMs === expected.sourceEndMs
        : false;
    });

  if (expectedInsideTheme && selectedMatchesExpected) {
    return {
      selectedThemeId,
      candidateStartMs,
      candidateEndMs,
      coverageSummary: '期待区間はすべて選択済みテーマの候補範囲に入り、LLMが選んだ区間も同じ順番で一致しています',
      themeSidePossibility: 'theme側で正解区間が候補に入っていない可能性は低い',
      compositionSidePossibility: 'composition側の候補選択差分はありません'
    };
  }
  if (expectedInsideTheme) {
    return {
      selectedThemeId,
      candidateStartMs,
      candidateEndMs,
      coverageSummary: '期待区間はすべて選択済みテーマの候補範囲に入っています',
      themeSidePossibility: 'theme側で正解区間が候補に入っていない可能性は低い',
      compositionSidePossibility: 'composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります'
    };
  }
  if (expectedOverlap) {
    return {
      selectedThemeId,
      candidateStartMs,
      candidateEndMs,
      coverageSummary: '期待区間の少なくとも1件は選択済みテーマの候補範囲と一部だけ重なっています',
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
  generationSystem: Record<string, unknown>;
  model: string;
  params: Record<string, unknown>;
  inputFile: string;
  selectedCuts: SelectedCut[];
  scoredSelectedCuts: SelectedCut[];
  excludedSelectedCuts: ExcludedSelectedCut[];
  expectedCuts: ExpectedCut[];
  excludedRanges: ExcludedRange[];
  diff: CutDiff;
  cutDiffs: CutPairDiff[];
  diffSummary: DiffSummary;
  themeCoverage: ThemeCoverage;
  timestampPlausibility: TimestampPlausibility;
  candidateExtractionStatus?: unknown;
  resultPath: string;
}): string {
  const selectedLines = input.selectedCuts.length > 0
    ? input.selectedCuts.map((cut, index) => `- ${index + 1}: ${cut.sourceStartMs}ms - ${cut.sourceEndMs}ms: ${cut.reason}`)
    : ['- なし'];
  const expectedLines = input.expectedCuts.length > 0
    ? input.expectedCuts.map((cut, index) => `- ${index + 1}: ${cut.sourceStartMs}ms - ${cut.sourceEndMs}ms: ${cut.reason}`)
    : ['- なし'];
  const scoredSelectedLines = input.scoredSelectedCuts.length > 0
    ? input.scoredSelectedCuts.map((cut, index) => `- ${index + 1}: ${cut.sourceStartMs}ms - ${cut.sourceEndMs}ms: ${cut.reason}`)
    : ['- なし'];
  const excludedSelectedLines = input.excludedSelectedCuts.length > 0
    ? input.excludedSelectedCuts.map((item) => `- 元の選択${item.selectedCutIndex + 1}: ${item.selectedCut.sourceStartMs}ms - ${item.selectedCut.sourceEndMs}ms / 除外区間 ${item.excludedRange.sourceStartMs}ms - ${item.excludedRange.sourceEndMs}ms / 重なり ${item.overlapMs}ms / ${item.reason}`)
    : ['- なし'];
  const excludedRangeLines = input.excludedRanges.length > 0
    ? input.excludedRanges.map((range, index) => `- ${index + 1}: ${range.sourceStartMs}ms - ${range.sourceEndMs}ms: ${range.reason}`)
    : ['- なし'];
  const timestampIssueLines = input.timestampPlausibility.issues.length > 0
    ? input.timestampPlausibility.issues.map((issue) => `- 選択${issue.selectedCutIndex + 1} ${issue.boundary}: ${issue.valueMs}ms / 最寄り発話境界 ${issue.nearestTranscriptBoundaryMs}ms / 差 ${issue.distanceFromNearestBoundaryMs}ms / ${issue.status}`)
    : ['- なし'];
  const diffLines = input.cutDiffs.length > 0
    ? input.cutDiffs.map((diff) => [
      `- ${diff.cutIndex + 1}: ${diff.overlapSummary}`,
      diff.startDeltaMs !== undefined ? `開始 ${formatMs(diff.startDeltaMs)}` : '開始 比較不可',
      diff.endDeltaMs !== undefined ? `終了 ${formatMs(diff.endDeltaMs)}` : '終了 比較不可',
      `重なり ${diff.overlapMs}ms`
    ].join(' / '))
    : ['- なし'];
  return [
    '# clip_composition LLM出力採点サマリー',
    '',
    `- 入力fixture: ${input.fixture.fixtureId}`,
    `- 生成系統: ${String(input.generationSystem.id ?? 'unknown')}`,
    `- 使用プロンプト版数: ${input.promptVersion}`,
    `- 使用モデル名: ${input.model}`,
    `- 使用パラメータ: ${JSON.stringify(input.params)}`,
    `- LLM出力JSON: ${input.inputFile}`,
    `- LLM出力の抽出状態: ${input.candidateExtractionStatus === undefined ? 'full_json' : JSON.stringify(input.candidateExtractionStatus)}`,
    `- 評価結果JSON: ${input.resultPath}`,
    '',
    '## LLMが選んだ区間',
    '',
    ...selectedLines,
    '',
    '## 期待区間',
    '',
    ...expectedLines,
    '',
    '## 採点対象の選択区間',
    '',
    ...scoredSelectedLines,
    '',
    '## 採点対象外にした選択区間',
    '',
    ...excludedSelectedLines,
    '',
    '## 採点対象外の期待側区間',
    '',
    ...excludedRangeLines,
    '',
    '## 時刻の数値妥当性',
    '',
    `- 作られた疑いのある時刻: ${input.timestampPlausibility.suspectedFabricatedTimestamp ? 'あり' : 'なし'}`,
    `- 許容範囲: 発話境界から${input.timestampPlausibility.boundaryMarginMs}ms以内`,
    ...timestampIssueLines,
    '',
    '## 差分',
    '',
    `- 開始位置のずれ: ${formatMs(input.diff.startDeltaMs)}`,
    `- 終了位置のずれ: ${formatMs(input.diff.endDeltaMs)}`,
    `- 重なり: ${input.diff.overlapSummary}`,
    `- 全体: ${input.diffSummary.summary}`,
    '',
    '## 区間別差分',
    '',
    ...diffLines,
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
  const options = parseOptions(process.argv.slice(2));
  if (!existsSync(options.inputFile)) {
    throw new Error(`LLM出力JSONが見つかりません: ${options.inputFile}`);
  }

  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  const fixture = validateFixture(await readJson(path.join(fixtureDir, 'fixture.json')));
  const transcript = validateTranscript(await readJson(path.join(fixtureDir, fixture.transcriptPath)));
  const themes = validateThemes(await readJson(path.join(fixtureDir, fixture.themesPath)), fixture.selectedThemeId);
  const expectedFile = validateExpectedFile(await readJson(path.join(evalRoot, 'expected', `${options.fixtureId}.json`)));
  const candidateOutput = validateCandidateOutput(await readJson(options.inputFile));
  if (expectedFile.draftId !== fixture.draftId) {
    throw new Error('fixtureの下書きIDと期待値の下書きIDが一致しません');
  }

  const excludedRanges = expectedExcludedRanges(expectedFile);
  const { scoredSelectedCuts, excludedSelectedCuts } = splitSelectedCutsForScoring(
    candidateOutput.selectedCuts,
    expectedFile.expectedCuts,
    excludedRanges
  );
  const timestampPlausibility = buildTimestampPlausibility(transcript, candidateOutput.selectedCuts);
  const firstSelected = scoredSelectedCuts[0];
  const firstExpected = expectedFile.expectedCuts[0];
  const diff = buildDiff(firstSelected, firstExpected);
  const cutDiffs = buildCutDiffs(scoredSelectedCuts, expectedFile.expectedCuts);
  const diffSummary = buildDiffSummary(cutDiffs, scoredSelectedCuts, expectedFile.expectedCuts);
  const themeCoverage = candidateCoverage(
    transcript,
    themes,
    fixture.selectedThemeId,
    expectedFile.expectedCuts,
    scoredSelectedCuts
  );
  const runAt = tokyoTimestamp(new Date());
  const runId = runIdFromTimestamp(runAt);
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
    generationSystem: llmGenerationSystem(options.promptVersion, options.model, options.inputFile),
    model: options.model,
    params: options.params,
    evaluationMode: 'external_prompt_output',
    inputFile: options.inputFile,
    ...(candidateOutput.extractionStatus !== undefined ? { inputExtractionStatus: candidateOutput.extractionStatus } : {}),
    selectedCuts: candidateOutput.selectedCuts,
    scoredSelectedCuts,
    excludedSelectedCuts,
    expectedCuts: expectedFile.expectedCuts,
    excludedRanges,
    timestampPlausibility,
    diff,
    cutDiffs,
    diffSummary,
    themeCoverage,
    sourceFiles: {
      fixture: path.relative(evalRoot, fixtureDir),
      expected: path.join('expected', `${options.fixtureId}.json`)
    }
  };
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(summaryPath, buildSummaryMarkdown({
    fixture,
    promptVersion: options.promptVersion,
    generationSystem: llmGenerationSystem(options.promptVersion, options.model, options.inputFile),
    model: options.model,
    params: options.params,
    inputFile: options.inputFile,
    selectedCuts: candidateOutput.selectedCuts,
    scoredSelectedCuts,
    excludedSelectedCuts,
    expectedCuts: expectedFile.expectedCuts,
    excludedRanges,
    diff,
    cutDiffs,
    diffSummary,
    themeCoverage,
    timestampPlausibility,
    candidateExtractionStatus: candidateOutput.extractionStatus,
    resultPath
  }), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`summary: ${summaryPath}`);
  console.log(`start delta: ${diff.startDeltaMs}ms`);
  console.log(`end delta: ${diff.endDeltaMs}ms`);
  console.log(diffSummary.summary);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
