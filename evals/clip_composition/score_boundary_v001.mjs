#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function rootDir() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceなし');
    current = parent;
  }
  return current;
}

const root = rootDir();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs', 'theme-composition-boundary', '20260713-boundary-v001-main-v001');
const baselinePath = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-main-v001', 'result.json');
const reportPath = path.join(evalRoot, 'reports', 'theme-composition-connection', '20260713-boundary-v001-main-v001-result.md');
const expectedPaths = {
  nOEWCNc77MI_multiblock_material_v001: path.join(evalRoot, 'expected', 'nOEWCNc77MI_multiblock_material_v001.json'),
  '9dtwF5Exu5w_multiblock_material_v001': path.join(evalRoot, 'expected', '9dtwF5Exu5w_multiblock_material_v001.json')
};

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const keyOf = (fixtureId, candidateIndex, runIndex, expectedIndex) => `${fixtureId}:${candidateIndex}:${runIndex}:${expectedIndex}`;
const runKeyOf = (fixtureId, candidateIndex, runIndex) => `${fixtureId}:${candidateIndex}:${runIndex}`;
const overlap = (cut, expected) => Math.max(0, Math.min(cut.sourceEndMs, expected.sourceEndMs) - Math.max(cut.sourceStartMs, expected.sourceStartMs));
const pct = (count, total) => total ? `${(count / total * 100).toFixed(1)}%` : 'n/a';
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const percentile = (values, ratio) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)];
};

function best(cuts, expected) {
  return cuts.map((cut, index) => ({
    cut,
    index: index + 1,
    overlapMs: overlap(cut, expected),
    startDeltaMs: cut.sourceStartMs - expected.sourceStartMs,
    endDeltaMs: cut.sourceEndMs - expected.sourceEndMs
  })).filter((item) => item.overlapMs > 0).sort((a, b) => b.overlapMs - a.overlapMs || Math.abs(a.startDeltaMs) - Math.abs(b.startDeltaMs) || Math.abs(a.endDeltaMs) - Math.abs(b.endDeltaMs) || a.index - b.index)[0];
}

function pointMap(words) {
  const points = new Map();
  for (const word of words) {
    points.set(`${word.id}:start`, word.s);
    points.set(`${word.id}:end`, word.e);
  }
  return points;
}

function summarize(observations, method) {
  const valid = observations.filter((item) => item[method]?.status === 'reached');
  const starts = valid.map((item) => Math.abs(item[method].startDeltaMs));
  const ends = valid.map((item) => Math.abs(item[method].endDeltaMs));
  const pooled = [...starts, ...ends];
  const both3000 = valid.filter((item) => Math.abs(item[method].startDeltaMs) <= 3000 && Math.abs(item[method].endDeltaMs) <= 3000).length;
  const both5000 = valid.filter((item) => Math.abs(item[method].startDeltaMs) <= 5000 && Math.abs(item[method].endDeltaMs) <= 5000).length;
  return {
    populationCount: observations.length,
    reachedCount: valid.length,
    lostOrInvalidCount: observations.length - valid.length,
    startAbsoluteMeanMs: mean(starts),
    startAbsoluteMedianMs: median(starts),
    endAbsoluteMeanMs: mean(ends),
    endAbsoluteMedianMs: median(ends),
    pooledAbsoluteMeanMs: mean(pooled),
    pooledAbsoluteMedianMs: median(pooled),
    pooledAbsoluteP75Ms: percentile(pooled, 0.75),
    pooledAbsoluteP90Ms: percentile(pooled, 0.90),
    bothWithin3000Count: both3000,
    bothWithin3000Rate: observations.length ? both3000 / observations.length : null,
    bothWithin5000Count: both5000,
    bothWithin5000Rate: observations.length ? both5000 / observations.length : null
  };
}

function stageFor(cuts, targetExpectedIndexes, expectedCuts, formatValid = true) {
  if (!formatValid) return { stage: 'miss', assessments: [] };
  const assessments = targetExpectedIndexes.map((expectedIndex) => {
    const found = best(cuts, expectedCuts[expectedIndex - 1]);
    return found ? { expectedIndex, reached: true, startDeltaMs: found.startDeltaMs, endDeltaMs: found.endDeltaMs } : { expectedIndex, reached: false };
  });
  const allReached = assessments.length > 0 && assessments.every((item) => item.reached);
  const all1000 = allReached && assessments.every((item) => Math.abs(item.startDeltaMs) <= 1000 && Math.abs(item.endDeltaMs) <= 1000);
  const all3000 = allReached && assessments.every((item) => Math.abs(item.startDeltaMs) <= 3000 && Math.abs(item.endDeltaMs) <= 3000);
  return { stage: all1000 ? 'match' : all3000 ? 'gate' : assessments.some((item) => item.reached) ? 'reach' : 'miss', assessments };
}

function compare(observations) {
  const result = { improved: 0, equal: 0, worse: 0, lostOrInvalid: 0 };
  for (const item of observations) {
    if (item.boundary.status !== 'reached') {
      result.lostOrInvalid += 1;
      continue;
    }
    const before = Math.abs(item.v012.startDeltaMs) + Math.abs(item.v012.endDeltaMs);
    const after = Math.abs(item.boundary.startDeltaMs) + Math.abs(item.boundary.endDeltaMs);
    if (after < before) result.improved += 1;
    else if (after === before) result.equal += 1;
    else result.worse += 1;
  }
  return result;
}

function failureType(issues) {
  if (issues.some((item) => item === 'web-generation-incomplete-or-runner-failure')) return 'web-generation-incomplete';
  if (issues.some((item) => item.startsWith('missing-start-point') || item.startsWith('missing-end-point'))) return 'nonexistent-boundary-id';
  if (issues.some((item) => item.startsWith('boundary-order'))) return 'boundary-order';
  if (issues.some((item) => item.includes('outside-window'))) return 'outside-window';
  if (issues.some((item) => item.includes('cut-index') || item.includes('refinement-count'))) return 'cut-contract';
  if (issues.some((item) => item.includes('reason'))) return 'missing-reason';
  return 'other-format';
}

async function main() {
  const [baseline, manifest, cohorts] = await Promise.all([
    readJson(baselinePath),
    readJson(path.join(outputRoot, 'input-manifest.json')),
    readJson(path.join(outputRoot, 'scoring-cohorts.json'))
  ]);
  if (manifest.plannedGeminiCallCount !== 71 || cohorts.primaryVisibleCount !== 61 || cohorts.fullReachedPopulationCount !== 79 || cohorts.structuralExcludedReachedCount !== 8) throw new Error('事前登録cohort不一致');

  const expectedByFixture = {};
  for (const [fixtureId, file] of Object.entries(expectedPaths)) expectedByFixture[fixtureId] = (await readJson(file)).expectedCuts;
  const baselineRuns = new Map(baseline.runs.map((run) => [runKeyOf(run.fixtureId, run.candidateIndex, run.runIndex), run]));
  const outputRuns = new Map();
  const formatFailures = [];

  for (const input of manifest.inputs) {
    const file = path.join(root, input.outputPath);
    if (!existsSync(file)) throw new Error(`未実走: ${input.outputPath}`);
    const [output, payload] = await Promise.all([readJson(file), readJson(path.join(root, input.payloadPath))]);
    const validation = output.boundaryContractValidation;
    if (!validation?.passed) {
      const issues = validation?.issues ?? ['missing-boundary-contract-validation'];
      formatFailures.push({ fixtureId: input.fixtureId, candidateIndex: input.candidateIndex, runIndex: input.runIndex, type: failureType(issues), issues, outputPath: input.outputPath });
      outputRuns.set(runKeyOf(input.fixtureId, input.candidateIndex, input.runIndex), { status: 'format-invalid', cuts: [], issues });
      continue;
    }
    const points = pointMap(payload.modelInput.localContext.words);
    const byIndex = new Map(output.refinements.map((item) => [item.provisionalCutIndex, item]));
    const cuts = payload.modelInput.provisionalCuts.map((cut, index) => {
      const refinement = byIndex.get(index + 1);
      return {
        sourceStartMs: points.get(refinement.startBoundaryPointId),
        sourceEndMs: points.get(refinement.endBoundaryPointId),
        startBoundaryPointId: refinement.startBoundaryPointId,
        endBoundaryPointId: refinement.endBoundaryPointId,
        startReason: refinement.startReason,
        endReason: refinement.endReason,
        provisionalSourceStartMs: cut.sourceStartMs,
        provisionalSourceEndMs: cut.sourceEndMs
      };
    });
    outputRuns.set(runKeyOf(input.fixtureId, input.candidateIndex, input.runIndex), { status: 'valid', cuts, issues: [] });
  }

  const observations = cohorts.fullReachedPopulation.map((cohort) => {
    const key = keyOf(cohort.fixtureId, cohort.candidateIndex, cohort.runIndex, cohort.expectedIndex);
    const baselineRun = baselineRuns.get(runKeyOf(cohort.fixtureId, cohort.candidateIndex, cohort.runIndex));
    const baselineAssessment = baselineRun.targetAssessments.find((item) => item.expectedIndex === cohort.expectedIndex);
    const common = {
      key,
      fixtureId: cohort.fixtureId,
      candidateIndex: cohort.candidateIndex,
      runIndex: cohort.runIndex,
      expectedIndex: cohort.expectedIndex,
      inputVisible90s: cohort.inputVisible90s,
      structuralExcluded: cohort.structuralExcluded,
      v012: { status: 'reached', startDeltaMs: baselineAssessment.startDeltaMs, endDeltaMs: baselineAssessment.endDeltaMs, cut: baselineAssessment.cut }
    };
    if (cohort.structuralExcluded) return { ...common, boundary: { status: 'structural-excluded' } };
    const run = outputRuns.get(runKeyOf(cohort.fixtureId, cohort.candidateIndex, cohort.runIndex));
    if (!run || run.status !== 'valid') return { ...common, boundary: { status: 'format-invalid', issues: run?.issues ?? ['missing-output'] } };
    const expected = expectedByFixture[cohort.fixtureId][cohort.expectedIndex - 1];
    const assessment = best(run.cuts, expected);
    if (!assessment) return { ...common, boundary: { status: 'not-reached' } };
    return { ...common, boundary: { status: 'reached', startDeltaMs: assessment.startDeltaMs, endDeltaMs: assessment.endDeltaMs, cut: assessment.cut, selectedCutIndex: assessment.index, overlapMs: assessment.overlapMs } };
  });

  const primaryKeys = new Set(cohorts.primaryVisible.map((item) => item.key));
  const primary = observations.filter((item) => primaryKeys.has(item.key));
  const assessable = observations.filter((item) => !item.structuralExcluded);
  if (primary.length !== 61 || observations.length !== 79 || assessable.length !== 71) throw new Error('採点母集団不一致');

  const mainTable = { cohort: 'true-boundaries-visible-in-both-90s-windows', conclusionBasis: true, v012: summarize(primary, 'v012'), boundaryV001: summarize(primary, 'boundary'), comparison: compare(primary) };
  const secondaryTable = {
    cohort: 'all-v012-reached-observations',
    conclusionBasis: false,
    fullPopulationCount: observations.length,
    structuralExcludedCount: observations.filter((item) => item.structuralExcluded).length,
    assessedCount: assessable.length,
    visibleAssessedCount: assessable.filter((item) => item.inputVisible90s).length,
    invisibleAssessedCount: assessable.filter((item) => !item.inputVisible90s).length,
    v012OnAssessed: summarize(assessable, 'v012'),
    boundaryV001OnAssessed: summarize(assessable, 'boundary'),
    comparisonOnAssessed: compare(assessable)
  };

  const successfulExpected = new Set(observations.filter((item) => !item.structuralExcluded && item.boundary.status === 'reached' && Math.abs(item.boundary.startDeltaMs) <= 3000 && Math.abs(item.boundary.endDeltaMs) <= 3000).map((item) => `${item.fixtureId}:${item.expectedIndex}`));
  const upperBoundComparison = {
    compressedSpeechBothWithin3000UpperBoundCount: 16,
    totalExpectedCount: 38,
    wordBoundaryBestObservedBothWithin3000Count: successfulExpected.size,
    exceededCompressedSpeechUpperBound: successfulExpected.size > 16,
    note: 'best observed across non-structurally-excluded candidates/runs; main conclusion still uses the pre-registered 61 observations'
  };

  const failureCounts = {};
  for (const failure of formatFailures) failureCounts[failure.type] = (failureCounts[failure.type] ?? 0) + 1;

  const runStages = baseline.runs.filter((run) => !(run.fixtureId === manifest.structuralExcludedCandidate.fixtureId && run.candidateIndex === manifest.structuralExcludedCandidate.candidateIndex)).map((run) => {
    const expectedCuts = expectedByFixture[run.fixtureId];
    const output = outputRuns.get(runKeyOf(run.fixtureId, run.candidateIndex, run.runIndex));
    const refined = stageFor(output?.cuts ?? [], run.targetExpectedIndexes, expectedCuts, output?.status === 'valid');
    const original = stageFor(run.selectedCuts, run.targetExpectedIndexes, expectedCuts, run.formatValid);
    return { fixtureId: run.fixtureId, candidateIndex: run.candidateIndex, runIndex: run.runIndex, v012Stage: original.stage, boundaryStage: refined.stage, boundaryAssessments: refined.assessments, outputStatus: output?.status ?? 'v012-not-runnable' };
  });
  if (runStages.length !== 72) throw new Error(`成否対象run数不一致: ${runStages.length}`);
  const stageNames = ['match', 'gate', 'reach', 'miss'];
  const runStageDistribution = Object.fromEntries(stageNames.map((stage) => [stage, runStages.filter((item) => item.boundaryStage === stage).length]));
  const baselineRunStageDistribution = Object.fromEntries(stageNames.map((stage) => [stage, runStages.filter((item) => item.v012Stage === stage).length]));
  const candidateKeys = [...new Set(runStages.map((item) => `${item.fixtureId}:${item.candidateIndex}`))];
  const candidateMajority = candidateKeys.map((key) => {
    const items = runStages.filter((item) => `${item.fixtureId}:${item.candidateIndex}` === key);
    return {
      key,
      v012ReachedMajority: items.filter((item) => item.v012Stage !== 'miss').length >= 2,
      boundaryReachedMajority: items.filter((item) => item.boundaryStage !== 'miss').length >= 2,
      boundaryStages: Object.fromEntries(stageNames.map((stage) => [stage, items.filter((item) => item.boundaryStage === stage).length]))
    };
  });
  const candidateMajoritySummary = {
    candidateCount: candidateMajority.length,
    v012ReachedMajorityCount: candidateMajority.filter((item) => item.v012ReachedMajority).length,
    boundaryReachedMajorityCount: candidateMajority.filter((item) => item.boundaryReachedMajority).length,
    candidates: candidateMajority
  };
  const result = {
    kind: 'boundary_v001_score',
    resultRole: 'word-boundary-refinement-eval-conditional-on-upstream-theme-hit-and-v012-reach',
    runAt: new Date().toISOString(),
    generationSystem: 'boundary-v001@gemini-web-flash',
    upstreamGenerationSystems: ['theme-llm-v002@gemini-web-flash', 'llm-v012@gemini-web-flash'],
    contextRadiusMs: 90000,
    plannedCallCount: 71,
    completedOutputCount: manifest.inputs.length,
    preRegisteredConclusionBasis: 'primary-visible-61',
    structuralExclusion: manifest.structuralExcludedCandidate,
    mainTable,
    secondaryTable,
    formatFailureCount: formatFailures.length,
    formatFailureTypeCounts: failureCounts,
    formatFailures,
    upperBoundComparison,
    fourStage: { definitions: { match: 'all target expected cuts reached and both boundaries within ±1000ms', gate: 'all target expected cuts reached and both boundaries within ±3000ms', reach: 'at least one target expected cut overlaps', miss: 'no target overlap or invalid output' }, v012: baselineRunStageDistribution, boundaryV001: runStageDistribution },
    candidateMajoritySummary,
    runStages,
    observations
  };
  await writeFile(path.join(outputRoot, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);

  const mainBefore = mainTable.v012;
  const mainAfter = mainTable.boundaryV001;
  const secondaryBefore = secondaryTable.v012OnAssessed;
  const secondaryAfter = secondaryTable.boundaryV001OnAssessed;
  const lines = [
    '# boundary-v001 本走結果', '',
    '- 生成系統: boundary-v001@gemini-web-flash',
    '- 条件付き評価: theme hit済みかつv012到達済みの観測',
    '- 入力: v012仮区間と各境界前後90秒の元配信STT・単語境界ID',
    '- 結論は事前登録どおり、真の両境界が入力内に見える61観測を基準にする。', '',
    '## 主表: 真の両境界が入力内に見える61観測', '',
    '| 指標 | v012写し | boundary-v001 |', '| --- | ---: | ---: |',
    `| 到達 | ${mainBefore.reachedCount}/61 | ${mainAfter.reachedCount}/61 |`,
    `| 両境界±3秒 | ${mainBefore.bothWithin3000Count}/61 (${pct(mainBefore.bothWithin3000Count, 61)}) | ${mainAfter.bothWithin3000Count}/61 (${pct(mainAfter.bothWithin3000Count, 61)}) |`,
    `| 両境界±5秒 | ${mainBefore.bothWithin5000Count}/61 (${pct(mainBefore.bothWithin5000Count, 61)}) | ${mainAfter.bothWithin5000Count}/61 (${pct(mainAfter.bothWithin5000Count, 61)}) |`,
    `| 境界絶対ずれ平均 | ${mainBefore.pooledAbsoluteMeanMs?.toFixed(1) ?? 'n/a'}ms | ${mainAfter.pooledAbsoluteMeanMs?.toFixed(1) ?? 'n/a'}ms |`,
    `| 境界絶対ずれ中央値 | ${mainBefore.pooledAbsoluteMedianMs?.toFixed(1) ?? 'n/a'}ms | ${mainAfter.pooledAbsoluteMedianMs?.toFixed(1) ?? 'n/a'}ms |`, '',
    `- boundary-v001境界絶対ずれ P75 ${mainAfter.pooledAbsoluteP75Ms?.toFixed(1) ?? 'n/a'}ms / P90 ${mainAfter.pooledAbsoluteP90Ms?.toFixed(1) ?? 'n/a'}ms`,
    `- 改善 ${mainTable.comparison.improved} / 同値 ${mainTable.comparison.equal} / 悪化 ${mainTable.comparison.worse} / 形式不成立または不達 ${mainTable.comparison.lostOrInvalid}`, '',
    '## 従表: v012が到達した全79観測', '',
    '- 全79観測のうち、候補16の8観測は2点選択では4正解へ分割できないため構造的対象外。失敗に数えない。',
    `- 採点対象71観測: 入力内61 / 入力外10。`,
    '| 指標 | v012写し | boundary-v001 |', '| --- | ---: | ---: |',
    `| 到達 | ${secondaryBefore.reachedCount}/71 | ${secondaryAfter.reachedCount}/71 |`,
    `| 両境界±3秒 | ${secondaryBefore.bothWithin3000Count}/71 (${pct(secondaryBefore.bothWithin3000Count, 71)}) | ${secondaryAfter.bothWithin3000Count}/71 (${pct(secondaryAfter.bothWithin3000Count, 71)}) |`,
    `| 両境界±5秒 | ${secondaryBefore.bothWithin5000Count}/71 (${pct(secondaryBefore.bothWithin5000Count, 71)}) | ${secondaryAfter.bothWithin5000Count}/71 (${pct(secondaryAfter.bothWithin5000Count, 71)}) |`, '',
    '## 四段階と候補単位', '',
    '| 段階 | v012 | boundary-v001 |', '| --- | ---: | ---: |',
    ...stageNames.map((stage) => `| ${stage} | ${baselineRunStageDistribution[stage]}/72 | ${runStageDistribution[stage]}/72 |`), '',
    `- 候補単位で2/3 run以上が到達: v012 ${candidateMajoritySummary.v012ReachedMajorityCount}/24 / boundary-v001 ${candidateMajoritySummary.boundaryReachedMajorityCount}/24`, '',
    '## 形式検査', '',
    `- 形式不成立: ${formatFailures.length}/71`,
    ...Object.entries(failureCounts).map(([type, count]) => `- ${type}: ${count}`),
    '- 各出力には選択した境界ID、その単語、前後2語、理由文を保存した。', '',
    '## 発話単位上界との比較', '',
    `- 発話境界だけを正しく選ぶ理論上界: 両境界±3秒 ${upperBoundComparison.compressedSpeechBothWithin3000UpperBoundCount}/38`,
    `- 単語境界方式の実測（候補・runの最良観測）: 両境界±3秒 ${upperBoundComparison.wordBoundaryBestObservedBothWithin3000Count}/38`,
    `- 発話単位上界を超えたか: ${upperBoundComparison.exceededCompressedSpeechUpperBound ? 'はい' : 'いいえ'}`, '',
    '## 構造上の別課題', '',
    '- 9dtwF5Exu5wの候補16は、1仮区間が4正解に重なるためboundary-v001の対象外。将来の「区間分割」課題として扱う。', ''
  ];
  await writeFile(reportPath, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({ mainTable, secondaryTable, formatFailureCount: formatFailures.length, upperBoundComparison, reportPath: path.relative(root, reportPath) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
