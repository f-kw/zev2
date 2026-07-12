import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  bundlePath: string;
  generationSystem: string;
  inputSelectionVersion: string;
  resultRole: 'formal-primary' | 'reference' | 'upper-bound';
  outputId: string;
};

type TimeRange = {
  sourceVideoId: string;
  sourceStartMs: number;
  sourceEndMs: number;
};

type ExpectedCut = TimeRange & {
  label?: string;
  usableForCompositionPromptEval?: boolean;
  materialBlock?: { blockIndex?: number };
};

type ExcludedRange = TimeRange & {
  id?: string;
  reason?: string;
  scoringTreatment?: string;
};

type ExpectedFile = {
  fixtureId: string;
  expectedCuts: ExpectedCut[];
  excludedRanges?: ExcludedRange[];
};

type PromptSegment = TimeRange & {
  speechId: number;
  text: string;
};

type Payload = {
  inputSetId: string;
  generationSystem: string;
  promptVersion: string;
  modelInput: {
    sources?: Array<{
      sourceVideoId: string;
      segments: PromptSegment[];
    }>;
  };
};

type EvidenceRange = Partial<TimeRange> & {
  supportingSpeechIds?: Array<number | string>;
};

type ThemeCandidate = {
  themeId?: string;
  title?: string;
  reason?: string;
  evidenceRanges?: EvidenceRange[];
};

type GeminiOutput = {
  model?: string;
  themes?: ThemeCandidate[];
  windowingResult?: Record<string, unknown>;
};

type LeakageInspection = {
  results?: Array<{ status?: string }>;
};

type ValidEvidenceRange = TimeRange & {
  rangeIndex: number;
};

type ExpectedAssessment = ExpectedCut & {
  expectedIndex: number;
  label: string;
  inputVisibility: 'input-visible' | 'input-not-visible';
  overlappingInputSpeechIds: number[];
  hit: boolean;
  hitCandidateIndexes: number[];
};

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');

function workspaceRoot(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const inlineIndex = item.indexOf('=');
    if (inlineIndex >= 0) {
      values.set(item.slice(2, inlineIndex), item.slice(inlineIndex + 1));
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) throw new Error(`${item} の値を指定してください`);
    values.set(item.slice(2), next);
    index += 1;
  }
  const fixtureId = required(values, 'fixture');
  const bundle = required(values, 'bundle');
  const generationSystem = required(values, 'generationSystem');
  const inputSelectionVersion = required(values, 'inputSelectionVersion');
  const resultRole = required(values, 'resultRole');
  const outputId = required(values, 'outputId');
  if (!/^input-selection-v\d{3}$/.test(inputSelectionVersion)) {
    throw new Error('--inputSelectionVersion は input-selection-vNNN 形式で指定してください');
  }
  if (resultRole !== 'formal-primary' && resultRole !== 'reference' && resultRole !== 'upper-bound') {
    throw new Error('--resultRole は formal-primary、reference、upper-bound のいずれかを指定してください');
  }
  const bundlePath = path.resolve(root, bundle);
  if (path.relative(evalRoot, bundlePath).startsWith('..')) {
    throw new Error('--bundle は evals/clip_composition 配下を指定してください');
  }
  return {
    fixtureId: sanitize(fixtureId),
    bundlePath,
    generationSystem,
    inputSelectionVersion,
    resultRole,
    outputId: sanitize(outputId)
  };
}

function required(values: Map<string, string>, key: string): string {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return value;
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function resultRoleLabel(role: CliOptions['resultRole']): string {
  if (role === 'formal-primary') return '正式な主結果';
  if (role === 'reference') return '正式な主結果とは統合しない参考結果';
  return '入力選定損失ゼロの上限測定（最終入力設計ではない）';
}

function resultPolicy(role: CliOptions['resultRole']): string {
  if (role === 'formal-primary') {
    return '正式な主結果として単独採点し、参考結果とは統合しない。';
  }
  if (role === 'reference') {
    return '参考結果として単独記録し、正式な主結果とは統合しない。';
  }
  return '全発話を入力して入力選定損失をゼロにした上限測定。最終入力設計としては採用しない。';
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function overlapMs(left: TimeRange, right: TimeRange): number {
  if (left.sourceVideoId !== right.sourceVideoId) return 0;
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs));
}

function validEvidenceRanges(candidate: ThemeCandidate): ValidEvidenceRange[] {
  if (!Array.isArray(candidate.evidenceRanges)) return [];
  return candidate.evidenceRanges.flatMap((range, offset) => {
    if (typeof range.sourceVideoId !== 'string'
      || typeof range.sourceStartMs !== 'number'
      || typeof range.sourceEndMs !== 'number'
      || range.sourceEndMs <= range.sourceStartMs) {
      return [];
    }
    return [{
      sourceVideoId: range.sourceVideoId,
      sourceStartMs: range.sourceStartMs,
      sourceEndMs: range.sourceEndMs,
      rangeIndex: offset + 1
    }];
  });
}

function reportMarkdown(result: ReturnType<typeof buildResult>): string {
  const lines = [
    `# ${result.generationSystem} 正式範囲hit採点`,
    '',
    `- fixture: ${result.fixtureId}`,
    `- 入力: ${result.input.inputSetId}`,
    `- 入力選定版: ${result.input.inputSelectionVersion}`,
    `- 結果の扱い: ${resultRoleLabel(result.resultRole)}`,
    `- 候補: ${result.summary.candidateCount}件 / 根拠範囲: ${result.summary.validEvidenceRangeCount}件`,
    `- 採点対象外: 人間が除外した${result.excludedRanges.count}区間`,
    '',
    '## 結果',
    '',
    '| 見方 | hit | 正解数 | 意味 |',
    '| --- | ---: | ---: | --- |',
    `| 入力内expected | ${result.summary.inputVisible.hitCount} | ${result.summary.inputVisible.expectedCount} | モデルが入力文字として見られた正解だけの正式判定 |`,
    `| 入力外expected | ${result.summary.inputNotVisible.hitCount} | ${result.summary.inputNotVisible.expectedCount} | 原理的に入力から見えなかった正解。モデル失敗には数えない |`,
    `| 全expected | ${result.summary.allExpected.hitCount} | ${result.summary.allExpected.expectedCount} | ${result.summary.allExpected.expectedCount}件全体を見た参考値 |`,
    '',
    '## 候補の失敗タイプ',
    '',
    '| 分類 | 件数 | この採点での意味 |',
    '| --- | ---: | --- |',
    `| 過広範囲 | ${result.summary.candidateClassificationCounts.overbroadRange} | accepted expectedを丸ごと内包する、または複数expectedにまたがる根拠範囲。範囲hitには含むが品質上の失敗として分ける |`,
    `| 別話題 | ${result.summary.candidateClassificationCounts.offTopic} | 有効な根拠範囲はあるがaccepted expectedと時間上まったく重ならない。意味内容の人間判定ではなく、機械上の範囲外という意味 |`,
    `| 根拠なし | ${result.summary.candidateClassificationCounts.noEvidence} | 有効な根拠範囲を1件も記録していない |`,
    '',
    '## expected別',
    '',
    '| expected | 元block | 入力 | hit | 入力で重なった発話 |',
    '| ---: | ---: | --- | --- | --- |'
  ];
  for (const expected of result.expectedAssessments) {
    lines.push(`| ${expected.expectedIndex} | ${expected.materialBlock?.blockIndex ?? '-'} | ${expected.inputVisibility} | ${expected.hit ? 'hit' : 'miss'} | ${expected.overlappingInputSpeechIds.join(', ') || '-'} |`);
  }
  lines.push('', '## 候補別', '');
  lines.push('| candidate | title | 分類 | 根拠範囲数 | hit expected | 除外区間との重なり |');
  lines.push('| ---: | --- | --- | ---: | --- | --- |');
  for (const candidate of result.candidateAssessments) {
    lines.push(`| ${candidate.candidateIndex} | ${candidate.title.replace(/\|/g, '/')} | ${candidate.classification} | ${candidate.validEvidenceRangeCount} | ${candidate.hitExpectedIndexes.join(', ') || '-'} | ${candidate.overlappedExcludedRangeIds.join(', ') || '-'} |`);
  }
  lines.push(
    '',
    '## 判定規則',
    '',
    '- 入力内expected: 保存済みprompt-inputの発話区間がexpectedと1ms以上重なるもの。',
    '- 範囲hit: 候補の有効な根拠範囲がaccepted expectedと1ms以上重なるもの。',
    '- 過広範囲: 根拠範囲がexpectedの開始より前から終了より後まで厳密に内包する、または1根拠範囲が複数expectedに重なるもの。秒数や比率の独自係数は使わない。',
    `- 除外${result.excludedRanges.count}区間との重なりは監査欄にだけ残し、hitにも分母にも含めない。`,
    ''
  );
  return lines.join('\n');
}

function buildResult(input: {
  options: CliOptions;
  payload: Payload;
  output: GeminiOutput;
  expectedFile: ExpectedFile;
  leakageInspection: LeakageInspection;
}) {
  const { options, payload, output, expectedFile, leakageInspection } = input;
  const model = output.model?.trim();
  if (!model) throw new Error('Gemini出力に実モデル名 model がありません');
  if (payload.generationSystem !== options.generationSystem) {
    throw new Error(`入力の生成系統が指定と一致しません: ${payload.generationSystem} / ${options.generationSystem}`);
  }
  if (expectedFile.fixtureId !== options.fixtureId) {
    throw new Error(`expectedのfixtureIdが指定と一致しません: ${expectedFile.fixtureId} / ${options.fixtureId}`);
  }
  const leakageResults = leakageInspection.results ?? [];
  if (leakageResults.length === 0 || leakageResults.some((result) => result.status !== 'pass')) {
    throw new Error('source-only入力のリーク検査が全件passではありません');
  }

  const expectedCuts = expectedFile.expectedCuts.filter((cut) => cut.usableForCompositionPromptEval !== false);
  const excludedRanges = expectedFile.excludedRanges ?? [];
  const promptSegments = (payload.modelInput.sources ?? []).flatMap((source) => source.segments ?? []);
  const themes = output.themes ?? [];
  const rangesByCandidate = themes.map(validEvidenceRanges);

  const expectedAssessments: ExpectedAssessment[] = expectedCuts.map((expected, offset) => {
    const overlappingInputSpeechIds = promptSegments
      .filter((segment) => overlapMs(segment, expected) > 0)
      .map((segment) => segment.speechId);
    const hitCandidateIndexes = rangesByCandidate.flatMap((ranges, candidateOffset) => (
      ranges.some((range) => overlapMs(range, expected) > 0) ? [candidateOffset + 1] : []
    ));
    return {
      ...expected,
      expectedIndex: offset + 1,
      label: expected.label ?? `expected ${offset + 1}`,
      inputVisibility: overlappingInputSpeechIds.length > 0 ? 'input-visible' : 'input-not-visible',
      overlappingInputSpeechIds,
      hit: hitCandidateIndexes.length > 0,
      hitCandidateIndexes
    };
  });

  const candidateAssessments = themes.map((candidate, candidateOffset) => {
    const ranges = rangesByCandidate[candidateOffset];
    const hitExpectedIndexes = expectedAssessments
      .filter((expected) => ranges.some((range) => overlapMs(range, expected) > 0))
      .map((expected) => expected.expectedIndex);
    const rangeDetails = ranges.map((range) => {
      const overlappedExpected = expectedAssessments.filter((expected) => overlapMs(range, expected) > 0);
      const strictlyContainedExpected = overlappedExpected.filter((expected) => (
        range.sourceStartMs < expected.sourceStartMs && range.sourceEndMs > expected.sourceEndMs
      ));
      return {
        ...range,
        hitExpectedIndexes: overlappedExpected.map((expected) => expected.expectedIndex),
        strictlyContainedExpectedIndexes: strictlyContainedExpected.map((expected) => expected.expectedIndex)
      };
    });
    const overbroad = rangeDetails.some((range) => (
      range.strictlyContainedExpectedIndexes.length > 0 || range.hitExpectedIndexes.length > 1
    ));
    const overlappedExcludedRangeIds = excludedRanges.flatMap((excluded, excludedOffset) => (
      ranges.some((range) => overlapMs(range, excluded) > 0)
        ? [excluded.id ?? `excluded ${excludedOffset + 1}`]
        : []
    ));
    const classification = ranges.length === 0
      ? 'no-evidence'
      : overbroad
        ? 'overbroad-range'
        : hitExpectedIndexes.length > 0
          ? 'range-hit'
          : 'off-topic';
    return {
      candidateIndex: candidateOffset + 1,
      themeId: candidate.themeId,
      title: candidate.title?.trim() || '(titleなし)',
      classification,
      validEvidenceRangeCount: ranges.length,
      hitExpectedIndexes,
      hitInputVisibleExpectedIndexes: hitExpectedIndexes.filter((expectedIndex) => (
        expectedAssessments[expectedIndex - 1].inputVisibility === 'input-visible'
      )),
      overlappedExcludedRangeIds,
      ranges: rangeDetails
    };
  });

  const inputVisible = expectedAssessments.filter((expected) => expected.inputVisibility === 'input-visible');
  const inputNotVisible = expectedAssessments.filter((expected) => expected.inputVisibility === 'input-not-visible');
  const countHits = (items: ExpectedAssessment[]) => items.filter((item) => item.hit).length;
  return {
    kind: 'clip_composition_theme_generation_formal_score',
    runAt: new Date().toISOString(),
    fixtureId: options.fixtureId,
    resultRole: options.resultRole,
    generationSystem: `${options.generationSystem}@${model}`,
    generationSystemBase: options.generationSystem,
    model,
    outputId: options.outputId,
    input: {
      inputSetId: payload.inputSetId,
      inputSelectionVersion: options.inputSelectionVersion,
      promptVersion: payload.promptVersion,
      bundlePath: path.relative(root, options.bundlePath),
      leakageInspectionStatus: 'pass',
      policy: resultPolicy(options.resultRole)
    },
    summary: {
      candidateCount: themes.length,
      validEvidenceRangeCount: rangesByCandidate.reduce((sum, ranges) => sum + ranges.length, 0),
      inputVisible: { expectedCount: inputVisible.length, hitCount: countHits(inputVisible) },
      inputNotVisible: { expectedCount: inputNotVisible.length, hitCount: countHits(inputNotVisible) },
      allExpected: { expectedCount: expectedAssessments.length, hitCount: countHits(expectedAssessments) },
      candidateClassificationCounts: {
        rangeHit: candidateAssessments.filter((item) => item.classification === 'range-hit').length,
        overbroadRange: candidateAssessments.filter((item) => item.classification === 'overbroad-range').length,
        offTopic: candidateAssessments.filter((item) => item.classification === 'off-topic').length,
        noEvidence: candidateAssessments.filter((item) => item.classification === 'no-evidence').length
      }
    },
    expectedAssessments,
    candidateAssessments,
    excludedRanges: {
      count: excludedRanges.length,
      scoringTreatment: 'audit-only; excluded from hit counts and all denominators',
      ranges: excludedRanges
    },
    windowingResult: output.windowingResult
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (existsSync(path.join(options.bundlePath, 'run-02-gemini-output.json'))) {
    throw new Error('正式主結果へ複数runを暗黙統合できません。採点bundleを1 runに分けてください');
  }
  const [payload, output, expectedFile, leakageInspection] = await Promise.all([
    readJson<Payload>(path.join(options.bundlePath, 'prompt-input.json')),
    readJson<GeminiOutput>(path.join(options.bundlePath, 'run-01-gemini-output.json')),
    readJson<ExpectedFile>(path.join(evalRoot, 'expected', `${options.fixtureId}.json`)),
    readJson<LeakageInspection>(path.join(options.bundlePath, 'leakage-inspection.json'))
  ]);
  const result = buildResult({ options, payload, output, expectedFile, leakageInspection });
  const baseName = `${options.generationSystem}-${options.outputId}-formal-score`;
  const outputPath = path.join(evalRoot, 'outputs', 'theme-generation', `${baseName}.json`);
  const reportPath = path.join(evalRoot, 'reports', 'theme-generation', `${baseName}.md`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown(result), 'utf8');
  console.log(`generation system: ${result.generationSystem}`);
  console.log(`formal input-visible hit: ${result.summary.inputVisible.hitCount}/${result.summary.inputVisible.expectedCount}`);
  console.log(`input-not-visible expected: ${result.summary.inputNotVisible.expectedCount}`);
  console.log(`all expected hit: ${result.summary.allExpected.hitCount}/${result.summary.allExpected.expectedCount}`);
  console.log(`candidate failures: overbroad=${result.summary.candidateClassificationCounts.overbroadRange}, off-topic=${result.summary.candidateClassificationCounts.offTopic}, no-evidence=${result.summary.candidateClassificationCounts.noEvidence}`);
  console.log(`output: ${path.relative(root, outputPath)}`);
  console.log(`report: ${path.relative(root, reportPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
