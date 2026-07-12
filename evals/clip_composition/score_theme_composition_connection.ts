import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type JsonRecord = Record<string, unknown>;
type Stage = 'match' | 'reach' | 'miss';

type Interval = {
  sourceStartMs: number;
  sourceEndMs: number;
  [key: string]: unknown;
};

type SelectedCut = Interval & {
  reason: string;
  usedSpeechIds: Array<number | string>;
};

type RunAssessment = {
  candidateIndex: number;
  contextCondition: string;
  runIndex: number;
  stage: Stage;
  formatValid: boolean;
  failureTypes: string[];
  selectedCutCount: number;
  selectedDurationMs: number;
  evidenceRangeDurationMs: number;
  selectedToEvidenceDurationRatio: number;
  reachedExpectedIndexes: number[];
  targetExpectedIndexes: number[];
  exactExpectedIndexes: number[];
  unmatchedTargetExpectedIndexes: number[];
  unlabeledSelectedCutIndexes: number[];
  excludedOnlySelectedCutIndexes: number[];
  outsideEvidenceSelectedCutIndexes: number[];
  selectedCuts: SelectedCut[];
  targetAssessments: JsonRecord[];
  outputPath: string;
};

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const fixtureId = 'nOEWCNc77MI_multiblock_material_v001';
const expectedPath = path.join(evalRoot, 'expected', `${fixtureId}.json`);
const upstreamOutputPath = path.join(
  evalRoot,
  'outputs',
  'theme-generation',
  'nOEWCNc77MI_chat_velocity_top100_input_selection_v004',
  'theme-llm-v002',
  '20260711-chat-velocity-top100-v001',
  'run-01-gemini-output.json'
);
const formalScorePath = path.join(
  evalRoot,
  'outputs',
  'theme-generation',
  'theme-llm-v002-20260711-B-chat-velocity-input-selection-v004-v001-formal-score.json'
);
const boundaryToleranceMs = 1000;

function workspaceRoot(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error(`--${name} が不正です`);
  return value;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function overlapMs(left: Interval, right: Interval): number {
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs));
}

function fullyInsideAny(cut: Interval, ranges: Interval[]): boolean {
  return ranges.some((range) => cut.sourceStartMs >= range.sourceStartMs && cut.sourceEndMs <= range.sourceEndMs);
}

function validateUsedSpeechId(value: unknown): boolean {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0;
  if (typeof value !== 'string') return false;
  if (/^\d+$/.test(value)) return Number(value) > 0;
  const match = value.match(/^(\d+)-(\d+)$/);
  return Boolean(match && Number(match[1]) > 0 && Number(match[2]) >= Number(match[1]));
}

function parseSelectedCuts(output: JsonRecord): { valid: true; cuts: SelectedCut[] } | { valid: false; cuts: []; issues: string[] } {
  if (!Array.isArray(output.selectedCuts)) {
    return { valid: false, cuts: [], issues: ['selectedCutsが配列ではない'] };
  }
  const cuts: SelectedCut[] = [];
  const issues: string[] = [];
  for (let index = 0; index < output.selectedCuts.length; index += 1) {
    const value = output.selectedCuts[index];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      issues.push(`selectedCuts[${index}]がオブジェクトではない`);
      continue;
    }
    const cut = value as JsonRecord;
    const start = cut.sourceStartMs;
    const end = cut.sourceEndMs;
    const reason = cut.reason;
    const usedSpeechIds = cut.usedSpeechIds;
    if (typeof start !== 'number' || !Number.isFinite(start)
      || typeof end !== 'number' || !Number.isFinite(end) || end <= start) {
      issues.push(`selectedCuts[${index}]の区間が不正`);
    }
    if (typeof reason !== 'string' || !reason.trim()) issues.push(`selectedCuts[${index}]のreasonが空`);
    if (!Array.isArray(usedSpeechIds) || usedSpeechIds.length === 0 || !usedSpeechIds.every(validateUsedSpeechId)) {
      issues.push(`selectedCuts[${index}]のusedSpeechIdsが不正`);
    }
    if (typeof start === 'number' && typeof end === 'number' && end > start
      && typeof reason === 'string' && reason.trim()
      && Array.isArray(usedSpeechIds) && usedSpeechIds.length > 0 && usedSpeechIds.every(validateUsedSpeechId)) {
      cuts.push({ sourceStartMs: start, sourceEndMs: end, reason, usedSpeechIds: usedSpeechIds as Array<number | string> });
    }
  }
  if (issues.length > 0) return { valid: false, cuts: [], issues };
  return { valid: true, cuts };
}

function bestCutForExpected(cuts: SelectedCut[], expected: Interval) {
  return cuts
    .map((cut, index) => ({
      cut,
      cutIndex: index + 1,
      overlapMs: overlapMs(cut, expected),
      startDeltaMs: cut.sourceStartMs - expected.sourceStartMs,
      endDeltaMs: cut.sourceEndMs - expected.sourceEndMs
    }))
    .filter((item) => item.overlapMs > 0)
    .sort((left, right) =>
      right.overlapMs - left.overlapMs
      || Math.abs(left.startDeltaMs) - Math.abs(right.startDeltaMs)
      || Math.abs(left.endDeltaMs) - Math.abs(right.endDeltaMs)
      || left.cutIndex - right.cutIndex
    )[0];
}

function stageRank(stage: Stage): number {
  return stage === 'match' ? 2 : stage === 'reach' ? 1 : 0;
}

function aggregateCandidateRuns(runs: RunAssessment[]) {
  const counts: Record<Stage, number> = { match: 0, reach: 0, miss: 0 };
  for (const run of runs) counts[run.stage] += 1;
  const best = [...runs].sort((left, right) => stageRank(right.stage) - stageRank(left.stage))[0]?.stage ?? 'miss';
  const majorityEntry = (Object.entries(counts) as Array<[Stage, number]>).find(([, count]) => count >= 2);
  const majority = majorityEntry?.[0] ?? 'no-majority';
  const structureSignatures = runs.map((run) => `${run.selectedCutCount}:${run.reachedExpectedIndexes.join(',')}`);
  const uniqueStructure = new Set(structureSignatures);
  const boundarySignatures = runs.map((run) => run.selectedCuts
    .map((cut) => `${cut.sourceStartMs}-${cut.sourceEndMs}`)
    .sort()
    .join('|'));
  const fluctuation = uniqueStructure.size > 1
    ? 'structural'
    : new Set(boundarySignatures).size > 1
      ? 'boundary'
      : 'stable';
  return { counts, best, majority, fluctuation, structureSignatures, boundarySignatures };
}

function stageLabel(value: string): string {
  if (value === 'match') return '一致';
  if (value === 'reach') return '到達';
  if (value === 'miss') return '不達';
  return '多数決不成立';
}

function reportMarkdown(result: JsonRecord): string {
  const candidateConditions = result.candidateConditions as JsonRecord[];
  const runs = result.runs as RunAssessment[];
  const conditionStats = ['theme-window-only', 'theme-window-plus-minus-5m'].map((condition) => {
    const conditionRuns = runs.filter((run) => run.contextCondition === condition);
    return {
      condition,
      match: conditionRuns.filter((run) => run.stage === 'match').length,
      reach: conditionRuns.filter((run) => run.stage === 'reach').length,
      miss: conditionRuns.filter((run) => run.stage === 'miss').length,
      formatFailure: conditionRuns.filter((run) => run.failureTypes.includes('output-format')).length,
      outsideAudit: conditionRuns.filter((run) => run.failureTypes.includes('outside-theme-range-audit')).length
    };
  });
  const lines = [
    '# theme-llm-v002 → llm-v012 文脈パイロット結果',
    '',
    '- 評価の種類: hit済みテーマ限定の条件付き接続評価',
    '- 生成系統: llm-v012@gemini-web-flash',
    '- 上流系統: theme-llm-v002@gemini-web-flash',
    '- 成功基準: 一致=対象expected全件へ到達し両境界±1000ms以内、到達=少なくとも1件と重なる、不達=重なり0または形式不成立',
    '- 未ラベル選択は即減点しない',
    '',
    '## 条件別の三段階分布',
    '',
    '| 文脈 | 一致 | 到達 | 不達 | 出力形式 | 根拠範囲外へ出た監査 |',
    '| --- | ---: | ---: | ---: | ---: | ---: |'
  ];
  for (const item of conditionStats) {
    lines.push(`| ${item.condition} | ${item.match} | ${item.reach} | ${item.miss} | ${item.formatFailure} | ${item.outsideAudit} |`);
  }
  lines.push(
    '',
    '## 候補×条件の3 run集計',
    '',
    '| 候補 | 文脈 | 一致 | 到達 | 不達 | 最良 | 多数決 | 揺れ | 選択/根拠 長さ比 |',
    '| ---: | --- | ---: | ---: | ---: | --- | --- | --- | --- |'
  );
  for (const item of candidateConditions) {
    const counts = item.counts as Record<Stage, number>;
    const ratios = item.selectedToEvidenceDurationRatios as number[];
    lines.push(`| ${item.candidateIndex} | ${item.contextCondition} | ${counts.match} | ${counts.reach} | ${counts.miss} | ${stageLabel(String(item.best))} | ${stageLabel(String(item.majority))} | ${item.fluctuation} | ${ratios.map((ratio) => ratio.toFixed(4)).join(' / ')} |`);
  }
  const broad = candidateConditions.filter((item) => item.candidateIndex === 53);
  lines.push('', '## 広い根拠範囲を絞れたか', '');
  for (const item of broad) {
    const ratios = item.selectedToEvidenceDurationRatios as number[];
    lines.push(`- ${item.contextCondition}: 根拠88.988秒に対する選択長の比は ${ratios.map((ratio) => ratio.toFixed(4)).join(' / ')}。`);
  }
  lines.push('- 比が1未満なら根拠範囲より短く絞った、1なら全範囲、0は採点可能な区間を得られなかったことを表す。');
  lines.push('', '## run別', '', '| 候補 | 文脈 | run | 判定 | 到達expected | 一致expected | 選択数 | 失敗型 |', '| ---: | --- | ---: | --- | --- | --- | ---: | --- |');
  for (const run of runs) {
    lines.push(`| ${run.candidateIndex} | ${run.contextCondition} | ${run.runIndex} | ${stageLabel(run.stage)} | ${run.reachedExpectedIndexes.join(', ') || '-'} | ${run.exactExpectedIndexes.join(', ') || '-'} | ${run.selectedCutCount} | ${run.failureTypes.join(', ') || '-'} |`);
  }
  lines.push('', '## 条件差', '');
  const comparison = result.contextComparison as JsonRecord;
  lines.push(`- 事前登録規則による本走候補: ${comparison.recommendedContextCondition}`);
  lines.push(`- 決定理由: ${comparison.reason}`);
  lines.push('- 2条件とも候補単位の多数決と最良は3候補すべて「到達」で、「一致」は0候補だった。選択差は、テーマ窓のみで1件の出力形式不成立が構造揺れとして残り、拡張条件では不達が0件だった点。');
  lines.push('- 拡張条件は境界精度を改善したとは読まない。候補3では終端が長くなる揺れ、候補53では根拠全体を使うrunと61.34%まで絞るrunの境界揺れがあった。');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const outputId = option('outputId', '20260712-context-pilot-v001');
  const outputRoot = path.join(evalRoot, 'outputs', 'theme-composition-connection', outputId);
  const manifest = await readJson<JsonRecord>(path.join(outputRoot, 'input-manifest.json'));
  if (manifest.status !== 'ready_for_execution' || manifest.runsPerInput !== 3) throw new Error('入力manifestが不正です');
  const expectedFile = await readJson<{ expectedCuts: Interval[]; excludedRanges: Interval[] }>(expectedPath);
  const upstream = await readJson<{ themes: Array<{ evidenceRanges: Interval[] }> }>(upstreamOutputPath);
  const formal = await readJson<{ candidateAssessments: Array<{ candidateIndex: number; hitExpectedIndexes: number[] }> }>(formalScorePath);
  const assessments: RunAssessment[] = [];

  for (const input of manifest.inputs as JsonRecord[]) {
    const candidateIndex = Number(input.candidateIndex);
    const condition = String(input.contextCondition);
    const targetExpectedIndexes = formal.candidateAssessments.find((item) => item.candidateIndex === candidateIndex)?.hitExpectedIndexes ?? [];
    if (targetExpectedIndexes.length === 0) throw new Error(`候補${candidateIndex}は上流hit候補ではありません`);
    const evidenceRanges = upstream.themes[candidateIndex - 1]?.evidenceRanges;
    if (!evidenceRanges?.length) throw new Error(`候補${candidateIndex}に根拠範囲がありません`);
    const evidenceRangeDurationMs = evidenceRanges.reduce((sum, range) => sum + range.sourceEndMs - range.sourceStartMs, 0);
    const conditionDir = path.dirname(path.join(root, String(input.promptPath)));

    for (let runIndex = 1; runIndex <= 3; runIndex += 1) {
      const outputPath = path.join(conditionDir, `run-${String(runIndex).padStart(2, '0')}-gemini-output.json`);
      let output: JsonRecord = {};
      let formatValid = false;
      let cuts: SelectedCut[] = [];
      let formatIssues: string[] = [];
      if (existsSync(outputPath)) {
        output = await readJson<JsonRecord>(outputPath);
        const parsed = parseSelectedCuts(output);
        formatValid = parsed.valid;
        cuts = parsed.cuts;
        if ('issues' in parsed) formatIssues = parsed.issues;
      } else {
        formatIssues = ['出力ファイルなし'];
      }

      const targetAssessments: JsonRecord[] = [];
      const reachedExpectedIndexes: number[] = [];
      const exactExpectedIndexes: number[] = [];
      for (const expectedIndex of targetExpectedIndexes) {
        const expected = expectedFile.expectedCuts[expectedIndex - 1];
        if (!expected) throw new Error(`expected ${expectedIndex}がありません`);
        const best = bestCutForExpected(cuts, expected);
        if (!best) {
          targetAssessments.push({ expectedIndex, status: 'not_reached' });
          continue;
        }
        reachedExpectedIndexes.push(expectedIndex);
        const exact = Math.abs(best.startDeltaMs) <= boundaryToleranceMs
          && Math.abs(best.endDeltaMs) <= boundaryToleranceMs;
        if (exact) exactExpectedIndexes.push(expectedIndex);
        targetAssessments.push({
          expectedIndex,
          status: exact ? 'match_within_1000ms' : 'reached',
          selectedCutIndex: best.cutIndex,
          overlapMs: best.overlapMs,
          startDeltaMs: best.startDeltaMs,
          endDeltaMs: best.endDeltaMs
        });
      }

      const outsideEvidenceSelectedCutIndexes = cuts
        .map((cut, index) => ({ cut, index: index + 1 }))
        .filter(({ cut }) => !fullyInsideAny(cut, evidenceRanges))
        .map(({ index }) => index);
      const selectedCutOverlaps = cuts.map((cut, index) => ({
        index: index + 1,
        expected: expectedFile.expectedCuts.some((expected) => overlapMs(cut, expected) > 0),
        excluded: expectedFile.excludedRanges.some((excluded) => overlapMs(cut, excluded) > 0)
      }));
      const unlabeledSelectedCutIndexes = selectedCutOverlaps.filter((item) => !item.expected && !item.excluded).map((item) => item.index);
      const excludedOnlySelectedCutIndexes = selectedCutOverlaps.filter((item) => !item.expected && item.excluded).map((item) => item.index);

      const allTargetsExact = targetExpectedIndexes.length > 0
        && exactExpectedIndexes.length === targetExpectedIndexes.length;
      const stage: Stage = !formatValid
        ? 'miss'
        : allTargetsExact
          ? 'match'
          : reachedExpectedIndexes.length > 0
            ? 'reach'
            : 'miss';
      const failureTypes: string[] = [];
      if (!formatValid) failureTypes.push('output-format');
      if (formatValid && reachedExpectedIndexes.length === 0) {
        failureTypes.push(outsideEvidenceSelectedCutIndexes.length > 0 ? 'outside-theme-range' : 'inside-theme-range-miss');
      } else if (outsideEvidenceSelectedCutIndexes.length > 0) {
        failureTypes.push('outside-theme-range-audit');
      }
      if (formatIssues.length > 0) failureTypes.push(...formatIssues.map((issue) => `format:${issue}`));
      const selectedDurationMs = cuts.reduce((sum, cut) => sum + cut.sourceEndMs - cut.sourceStartMs, 0);
      assessments.push({
        candidateIndex,
        contextCondition: condition,
        runIndex,
        stage,
        formatValid,
        failureTypes,
        selectedCutCount: cuts.length,
        selectedDurationMs,
        evidenceRangeDurationMs,
        selectedToEvidenceDurationRatio: evidenceRangeDurationMs > 0 ? selectedDurationMs / evidenceRangeDurationMs : 0,
        reachedExpectedIndexes,
        targetExpectedIndexes,
        exactExpectedIndexes,
        unmatchedTargetExpectedIndexes: targetExpectedIndexes.filter((index) => !reachedExpectedIndexes.includes(index)),
        unlabeledSelectedCutIndexes,
        excludedOnlySelectedCutIndexes,
        outsideEvidenceSelectedCutIndexes,
        selectedCuts: cuts,
        targetAssessments,
        outputPath: path.relative(root, outputPath)
      });
    }
  }

  const grouped = new Map<string, RunAssessment[]>();
  for (const assessment of assessments) {
    const key = `${assessment.candidateIndex}:${assessment.contextCondition}`;
    grouped.set(key, [...(grouped.get(key) ?? []), assessment]);
  }
  const candidateConditions = [...grouped.entries()].map(([key, runs]) => {
    const [candidateIndex, contextCondition] = key.split(':');
    return {
      candidateIndex: Number(candidateIndex),
      contextCondition,
      ...aggregateCandidateRuns(runs),
      selectedToEvidenceDurationRatios: runs.map((run) => run.selectedToEvidenceDurationRatio),
      failureTypes: [...new Set(runs.flatMap((run) => run.failureTypes))]
    };
  }).sort((left, right) => left.candidateIndex - right.candidateIndex || left.contextCondition.localeCompare(right.contextCondition));

  const conditions = ['theme-window-only', 'theme-window-plus-minus-5m'];
  const conditionStats = conditions.map((condition) => {
    const items = candidateConditions.filter((item) => item.contextCondition === condition);
    return {
      condition,
      majorityMatch: items.filter((item) => item.majority === 'match').length,
      majorityReach: items.filter((item) => item.majority === 'reach').length,
      bestMatch: items.filter((item) => item.best === 'match').length,
      bestReach: items.filter((item) => item.best === 'reach').length,
      structuralFluctuation: items.filter((item) => item.fluctuation === 'structural').length
    };
  });
  const sortedConditions = [...conditionStats].sort((left, right) =>
    right.majorityMatch - left.majorityMatch
    || right.majorityReach - left.majorityReach
    || right.bestMatch - left.bestMatch
    || right.bestReach - left.bestReach
    || left.structuralFluctuation - right.structuralFluctuation
    || (left.condition === 'theme-window-only' ? -1 : 1)
  );
  const winner = sortedConditions[0];
  const runnerUp = sortedConditions[1];
  const sameBeforeFallback = winner.majorityMatch === runnerUp.majorityMatch
    && winner.majorityReach === runnerUp.majorityReach
    && winner.bestMatch === runnerUp.bestMatch
    && winner.bestReach === runnerUp.bestReach
    && winner.structuralFluctuation === runnerUp.structuralFluctuation;
  const reason = sameBeforeFallback
    ? '事前登録した5観点が同数のため、追加文脈の効果なしとしてテーマ窓のみを選ぶ。'
    : `事前登録順で比較し、多数決一致 ${winner.majorityMatch}、多数決到達 ${winner.majorityReach}、最良一致 ${winner.bestMatch}、最良到達 ${winner.bestReach}、構造揺れ ${winner.structuralFluctuation} だったため。`;

  const stageDistribution = assessments.reduce((counts, item) => {
    counts[item.stage] += 1;
    return counts;
  }, { match: 0, reach: 0, miss: 0 });
  const result = {
    kind: 'theme_composition_connection_score',
    resultRole: 'connected-composition-eval-pilot-conditional-on-upstream-range-hit',
    runAt: new Date().toISOString(),
    outputId,
    fixtureId,
    generationSystem: 'llm-v012@gemini-web-flash',
    upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash',
    inputSelectionVersion: 'input-selection-v004',
    conditionalOnUpstreamRangeHit: true,
    successCriterion: {
      boundaryToleranceMs,
      match: 'all target expected intervals reached and both boundaries within ±1000ms',
      reach: 'at least one target expected interval has overlap, but match condition is not met',
      miss: 'no target expected overlap or invalid output format',
      candidateAggregation: 'best of 3 and majority of 3; one vote each is no-majority'
    },
    runCount: assessments.length,
    stageDistribution,
    runs: assessments,
    candidateConditions,
    conditionStats,
    contextComparison: {
      recommendedContextCondition: winner.condition,
      reason,
      rule: 'majority match, majority reach, best match, best reach, fewer structural fluctuations, then theme-window-only'
    }
  };
  const resultPath = path.join(outputRoot, 'pilot-score.json');
  const reportPath = path.join(evalRoot, 'reports', 'theme-composition-connection', `${outputId}-result.md`);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, `${reportMarkdown(result as unknown as JsonRecord)}\n`, 'utf8');
  console.log(JSON.stringify({ resultPath, reportPath, stageDistribution, contextComparison: result.contextComparison }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
