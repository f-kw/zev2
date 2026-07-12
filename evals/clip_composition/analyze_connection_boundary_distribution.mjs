#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const baselinePath = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-main-v001', 'result.json');
const changedPath = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-v002-main-v001', 'result.json');
const outputPath = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-v012-v013-boundary-distribution-v001.json');
const reportPath = path.join(evalRoot, 'reports', 'theme-composition-connection', '20260712-connection-v012-v013-boundary-distribution-v001.md');
const runValuesCsvPath = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-v012-v013-boundary-run-values-v001.csv');
const observationValuesCsvPath = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-v012-v013-boundary-observation-values-v001.csv');
const fixtureExpectedCounts = {
  nOEWCNc77MI_multiblock_material_v001: 13,
  '9dtwF5Exu5w_multiblock_material_v001': 25
};

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const nearestRank = (values, proportion) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * proportion) - 1)];
};
const pct = (value, total) => total ? value / total : null;
const round = (value) => value === null ? null : Math.round(value * 1000) / 1000;
const percent = (value) => value === null ? '-' : `${(value * 100).toFixed(1)}%`;
const ms = (value) => value === null ? '-' : `${Math.round(value)}ms`;
const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const csvLine = (values) => values.map(csvCell).join(',');

function flattenReached(result) {
  return result.runs.flatMap((run) => run.targetAssessments
    .filter((assessment) => run.formatValid && assessment.reached)
    .map((assessment) => ({
      key: `${run.fixtureId}:${run.candidateIndex}:${run.runIndex}:${assessment.expectedIndex}`,
      fixtureId: run.fixtureId,
      candidateIndex: run.candidateIndex,
      runIndex: run.runIndex,
      expectedIndex: assessment.expectedIndex,
      startDeltaMs: assessment.startDeltaMs,
      endDeltaMs: assessment.endDeltaMs,
      startAbsMs: Math.abs(assessment.startDeltaMs),
      endAbsMs: Math.abs(assessment.endDeltaMs),
      totalAbsMs: Math.abs(assessment.startDeltaMs) + Math.abs(assessment.endDeltaMs)
    })));
}

function boundarySummary(values) {
  const signed = values.map((item) => item.delta);
  const absolute = values.map((item) => Math.abs(item.delta));
  return {
    count: values.length,
    signedMeanMs: round(mean(signed)),
    signedMedianMs: nearestRank(signed, 0.5),
    absoluteMeanMs: round(mean(absolute)),
    absoluteMedianMs: nearestRank(absolute, 0.5),
    absoluteP75Ms: nearestRank(absolute, 0.75),
    absoluteP90Ms: nearestRank(absolute, 0.9),
    absoluteMaxMs: absolute.length ? Math.max(...absolute) : null,
    within1000Count: absolute.filter((value) => value <= 1000).length,
    within1000Rate: round(pct(absolute.filter((value) => value <= 1000).length, absolute.length)),
    within3000Count: absolute.filter((value) => value <= 3000).length,
    within3000Rate: round(pct(absolute.filter((value) => value <= 3000).length, absolute.length)),
    within5000Count: absolute.filter((value) => value <= 5000).length,
    within5000Rate: round(pct(absolute.filter((value) => value <= 5000).length, absolute.length))
  };
}

function fourStage(run) {
  if (!run.formatValid) return 'miss';
  const allReached = run.targetAssessments.every((assessment) => assessment.reached);
  if (allReached && run.targetAssessments.every((assessment) => Math.abs(assessment.startDeltaMs) <= 1000 && Math.abs(assessment.endDeltaMs) <= 1000)) return 'match';
  if (allReached && run.targetAssessments.every((assessment) => Math.abs(assessment.startDeltaMs) <= 3000 && Math.abs(assessment.endDeltaMs) <= 3000)) return 'gate-level';
  if (run.targetAssessments.some((assessment) => assessment.reached)) return 'reach';
  return 'miss';
}

function rawValues(result) {
  const runs = result.runs.map((run) => ({
    generationSystem: result.generationSystem,
    fixtureId: run.fixtureId,
    candidateIndex: run.candidateIndex,
    runIndex: run.runIndex,
    formatValid: run.formatValid,
    originalThreeStage: run.stage,
    fourStage: fourStage(run),
    targetCount: run.targetAssessments.length,
    reachedTargetCount: run.targetAssessments.filter((assessment) => assessment.reached).length,
    startDeltasMs: run.targetAssessments.map((assessment) => `${assessment.expectedIndex}:${assessment.reached ? assessment.startDeltaMs : 'unreached'}`),
    endDeltasMs: run.targetAssessments.map((assessment) => `${assessment.expectedIndex}:${assessment.reached ? assessment.endDeltaMs : 'unreached'}`)
  }));
  const observations = result.runs.flatMap((run) => run.targetAssessments.map((assessment) => ({
    generationSystem: result.generationSystem,
    fixtureId: run.fixtureId,
    candidateIndex: run.candidateIndex,
    runIndex: run.runIndex,
    formatValid: run.formatValid,
    originalThreeStage: run.stage,
    fourStage: fourStage(run),
    expectedIndex: assessment.expectedIndex,
    reached: assessment.reached,
    startDeltaMs: assessment.reached ? assessment.startDeltaMs : null,
    endDeltaMs: assessment.reached ? assessment.endDeltaMs : null,
    startAbsoluteDeltaMs: assessment.reached ? Math.abs(assessment.startDeltaMs) : null,
    endAbsoluteDeltaMs: assessment.reached ? Math.abs(assessment.endDeltaMs) : null,
    bothWithin3000: assessment.reached ? Math.abs(assessment.startDeltaMs) <= 3000 && Math.abs(assessment.endDeltaMs) <= 3000 : false,
    bothWithin5000: assessment.reached ? Math.abs(assessment.startDeltaMs) <= 5000 && Math.abs(assessment.endDeltaMs) <= 5000 : false
  })));
  return { runs, observations };
}

function systemSummary(result) {
  const reached = flattenReached(result);
  const starts = reached.map((item) => ({ delta: item.startDeltaMs }));
  const ends = reached.map((item) => ({ delta: item.endDeltaMs }));
  const pooled = [...starts, ...ends];
  const bothWithin3000Count = reached.filter((item) => item.startAbsMs <= 3000 && item.endAbsMs <= 3000).length;
  const bothWithin5000Count = reached.filter((item) => item.startAbsMs <= 5000 && item.endAbsMs <= 5000).length;
  const byFixture = Object.fromEntries(Object.keys(fixtureExpectedCounts).map((fixtureId) => {
    const items = reached.filter((item) => item.fixtureId === fixtureId);
    const boundaryAbsolute = items.flatMap((item) => [item.startAbsMs, item.endAbsMs]);
    const bothWithin = items.filter((item) => item.startAbsMs <= 3000 && item.endAbsMs <= 3000).length;
    return [fixtureId, {
      reachedAssessmentCount: items.length,
      pooledAbsoluteMeanMs: round(mean(boundaryAbsolute)),
      pooledAbsoluteMedianMs: nearestRank(boundaryAbsolute, 0.5),
      pooledWithin3000Count: boundaryAbsolute.filter((value) => value <= 3000).length,
      pooledBoundaryCount: boundaryAbsolute.length,
      bothBoundariesWithin3000Count: bothWithin
    }];
  }));
  return {
    generationSystem: result.generationSystem,
    runCount: result.runs.length,
    validRunCount: result.runs.filter((run) => run.formatValid).length,
    reachedRunCount: result.runs.filter((run) => run.stage === 'reach' || run.stage === 'match').length,
    targetAssessmentCount: result.runs.reduce((sum, run) => sum + run.targetAssessments.length, 0),
    reachedAssessmentCount: reached.length,
    start: boundarySummary(starts),
    end: boundarySummary(ends),
    pooled: boundarySummary(pooled),
    bothBoundariesWithin3000Count: bothWithin3000Count,
    bothBoundariesWithin3000Rate: round(pct(bothWithin3000Count, reached.length)),
    bothBoundariesWithin5000Count: bothWithin5000Count,
    bothBoundariesWithin5000Rate: round(pct(bothWithin5000Count, reached.length)),
    fourStageDistribution: {
      match: result.runs.filter((run) => fourStage(run) === 'match').length,
      gateLevel: result.runs.filter((run) => fourStage(run) === 'gate-level').length,
      reach: result.runs.filter((run) => fourStage(run) === 'reach').length,
      miss: result.runs.filter((run) => fourStage(run) === 'miss').length
    },
    byFixture
  };
}

function pairedComparison(baseline, changed) {
  const baselineMap = new Map(flattenReached(baseline).map((item) => [item.key, item]));
  const changedMap = new Map(flattenReached(changed).map((item) => [item.key, item]));
  const pairs = [...baselineMap.keys()].filter((key) => changedMap.has(key)).map((key) => ({ baseline: baselineMap.get(key), changed: changedMap.get(key) }));
  const compare = (left, right) => left < right ? 'improved' : left > right ? 'worsened' : 'equal';
  const count = (field, value) => pairs.filter((pair) => compare(pair.changed[field], pair.baseline[field]) === value).length;
  const summarizePairs = (items) => ({
    count: items.length,
    improved: items.filter((pair) => pair.changed.totalAbsMs < pair.baseline.totalAbsMs).length,
    equal: items.filter((pair) => pair.changed.totalAbsMs === pair.baseline.totalAbsMs).length,
    worsened: items.filter((pair) => pair.changed.totalAbsMs > pair.baseline.totalAbsMs).length,
    baselinePooledAbsoluteMeanMs: round(mean(items.flatMap((pair) => [pair.baseline.startAbsMs, pair.baseline.endAbsMs]))),
    changedPooledAbsoluteMeanMs: round(mean(items.flatMap((pair) => [pair.changed.startAbsMs, pair.changed.endAbsMs])))
  });
  return {
    commonReachedAssessmentCount: pairs.length,
    startAbsoluteError: { improved: count('startAbsMs', 'improved'), equal: count('startAbsMs', 'equal'), worsened: count('startAbsMs', 'worsened') },
    endAbsoluteError: { improved: count('endAbsMs', 'improved'), equal: count('endAbsMs', 'equal'), worsened: count('endAbsMs', 'worsened') },
    twoBoundaryTotalAbsoluteError: { improved: count('totalAbsMs', 'improved'), equal: count('totalAbsMs', 'equal'), worsened: count('totalAbsMs', 'worsened') },
    baselineTwoBoundaryAbsoluteMeanMs: round(mean(pairs.flatMap((pair) => [pair.baseline.startAbsMs, pair.baseline.endAbsMs]))),
    changedTwoBoundaryAbsoluteMeanMs: round(mean(pairs.flatMap((pair) => [pair.changed.startAbsMs, pair.changed.endAbsMs]))),
    byFixture: Object.fromEntries(Object.keys(fixtureExpectedCounts).map((fixtureId) => [fixtureId, summarizePairs(pairs.filter((pair) => pair.baseline.fixtureId === fixtureId))]))
  };
}

function pipelineRecall(result) {
  const totalExpected = Object.values(fixtureExpectedCounts).reduce((sum, count) => sum + count, 0);
  const upstreamTargets = Object.keys(fixtureExpectedCounts).flatMap((fixtureId) => {
    const indexes = new Set(result.runs.filter((run) => run.fixtureId === fixtureId).flatMap((run) => run.targetExpectedIndexes));
    return [...indexes].map((expectedIndex) => `${fixtureId}:${expectedIndex}`);
  });
  const runs = [1, 2, 3].map((runIndex) => {
    const reached = Object.keys(fixtureExpectedCounts).flatMap((fixtureId) => {
      const indexes = new Set(result.runs.filter((run) => run.fixtureId === fixtureId && run.runIndex === runIndex).flatMap((run) => run.reachedExpectedIndexes));
      return [...indexes].map((expectedIndex) => `${fixtureId}:${expectedIndex}`);
    });
    return {
      runIndex,
      reachedExpectedCount: reached.length,
      allExpectedCount: totalExpected,
      recall: round(reached.length / totalExpected),
      upstreamHitExpectedCount: upstreamTargets.length,
      conditionalRecall: round(reached.length / upstreamTargets.length)
    };
  });
  return { allExpectedCount: totalExpected, upstreamHitExpectedCount: upstreamTargets.length, upstreamHitRecallUpperBound: round(upstreamTargets.length / totalExpected), runs };
}

async function main() {
  const baseline = await readJson(baselinePath);
  const changed = await readJson(changedPath);
  const baselineSummary = systemSummary(baseline);
  const changedSummary = systemSummary(changed);
  const paired = pairedComparison(baseline, changed);
  const pipeline = {
    baseline: pipelineRecall(baseline),
    changed: pipelineRecall(changed)
  };
  const baselineRaw = rawValues(baseline);
  const changedRaw = rawValues(changed);
  const allRunValues = [...baselineRaw.runs, ...changedRaw.runs];
  const allObservationValues = [...baselineRaw.observations, ...changedRaw.observations];
  const runKeys = new Set(allRunValues.map((run) => `${run.generationSystem}:${run.fixtureId}:${run.candidateIndex}:${run.runIndex}`));
  const observationKeys = new Set(allObservationValues.map((item) => `${item.generationSystem}:${item.fixtureId}:${item.candidateIndex}:${item.runIndex}:${item.expectedIndex}`));
  if (allRunValues.length !== 150 || runKeys.size !== 150) throw new Error(`run実数値が150件でない: rows=${allRunValues.length} unique=${runKeys.size}`);
  if (allObservationValues.length !== 168 || observationKeys.size !== 168) throw new Error(`正解別観測が168件でない: rows=${allObservationValues.length} unique=${observationKeys.size}`);
  const conclusion = {
    changedPooledAbsoluteMeanIsLower: changedSummary.pooled.absoluteMeanMs < baselineSummary.pooled.absoluteMeanMs,
    changedStartAbsoluteMeanIsLower: changedSummary.start.absoluteMeanMs < baselineSummary.start.absoluteMeanMs,
    changedEndAbsoluteMeanIsLower: changedSummary.end.absoluteMeanMs < baselineSummary.end.absoluteMeanMs,
    changedPooledAbsoluteMeanWithin3000: changedSummary.pooled.absoluteMeanMs <= 3000,
    connectionDecision: 'return_to_v012_copy_tolerant_contract',
    investmentDirection: 'improve_upstream_theme_evidence_range_quality',
    limitedTwoFixtureRecallTouchesSixtyPercent: pipeline.changed.runs.every((run) => run.recall >= 0.6),
    limitedTwoFixtureBoundaryTouchesThreeSeconds: changedSummary.pooled.absoluteMeanMs <= 3000,
    formalSecondGateDecisionAllowed: false,
    formalDecisionBlocker: '境界±3秒の正式集計単位が未定義で、2素材・上流hit済み候補に条件付けた開発データであり、配信者単位のdev/test分割も未導入'
  };
  const output = {
    kind: 'connection_boundary_distribution_comparison',
    runAt: new Date().toISOString(),
    inputs: { baseline: path.relative(root, baselinePath), changed: path.relative(root, changedPath) },
    rawValueFiles: { runValuesCsv: path.relative(root, runValuesCsvPath), observationValuesCsv: path.relative(root, observationValuesCsvPath) },
    boundaryUnit: 'each reached run × candidate × expected start/end boundary; pooled treats every boundary as one observation',
    absoluteQuantileMethod: 'nearest-rank',
    baseline: baselineSummary,
    changed: changedSummary,
    pairedCommonReached: paired,
    pipelineRecall: pipeline,
    rawRunValues: allRunValues,
    conclusion
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  const runCsv = [
    csvLine(['generationSystem', 'fixtureId', 'candidateIndex', 'runIndex', 'formatValid', 'originalThreeStage', 'fourStage', 'targetCount', 'reachedTargetCount', 'startDeltasMsByExpected', 'endDeltasMsByExpected']),
    ...allRunValues.map((run) => csvLine([run.generationSystem, run.fixtureId, run.candidateIndex, run.runIndex, run.formatValid, run.originalThreeStage, run.fourStage, run.targetCount, run.reachedTargetCount, run.startDeltasMs.join(';'), run.endDeltasMs.join(';')]))
  ];
  await writeFile(runValuesCsvPath, `${runCsv.join('\n')}\n`);
  const observationCsv = [
    csvLine(['generationSystem', 'fixtureId', 'candidateIndex', 'runIndex', 'formatValid', 'originalThreeStage', 'fourStage', 'expectedIndex', 'reached', 'startDeltaMs', 'endDeltaMs', 'startAbsoluteDeltaMs', 'endAbsoluteDeltaMs', 'bothWithin3000', 'bothWithin5000']),
    ...allObservationValues.map((item) => csvLine([item.generationSystem, item.fixtureId, item.candidateIndex, item.runIndex, item.formatValid, item.originalThreeStage, item.fourStage, item.expectedIndex, item.reached, item.startDeltaMs, item.endDeltaMs, item.startAbsoluteDeltaMs, item.endAbsoluteDeltaMs, item.bothWithin3000, item.bothWithin5000]))
  ];
  await writeFile(observationValuesCsvPath, `${observationCsv.join('\n')}\n`);

  const lines = [
    '# connection-v001/v002 境界ずれ分布比較',
    '',
    '- 追加LLM実走なし。保存済み150 runだけを再集計。',
    '- 境界の符号付き平均だけで相殺せず、絶対ずれを主比較する。',
    '- 分位点はnearest-rank。各開始・終了境界を1観測として等しく数える。',
    '- 符号付きずれは負=実績より早い、正=実績より遅い。率と絶対ずれは形式成立かつ正解へ到達した観測を分母にする。',
    `- 全150 runの実数値: \`${path.relative(root, runValuesCsvPath)}\`。複数正解に重なるrunを正解別に展開した全168観測: \`${path.relative(root, observationValuesCsvPath)}\`。`,
    '',
    '## 境界分布',
    '',
    '| 指標 | v012 / connection-v001 | v013 / connection-v002 |',
    '| --- | ---: | ---: |',
    `| 到達した候補×正解 | ${baselineSummary.reachedAssessmentCount} | ${changedSummary.reachedAssessmentCount} |`,
    `| 開始境界 符号付き平均 / 中央値 | ${ms(baselineSummary.start.signedMeanMs)} / ${ms(baselineSummary.start.signedMedianMs)} | ${ms(changedSummary.start.signedMeanMs)} / ${ms(changedSummary.start.signedMedianMs)} |`,
    `| 開始境界 絶対ずれ平均 | ${ms(baselineSummary.start.absoluteMeanMs)} | ${ms(changedSummary.start.absoluteMeanMs)} |`,
    `| 開始境界 ±3秒内 / ±5秒内 | ${baselineSummary.start.within3000Count}/${baselineSummary.start.count} (${percent(baselineSummary.start.within3000Rate)}) / ${baselineSummary.start.within5000Count}/${baselineSummary.start.count} (${percent(baselineSummary.start.within5000Rate)}) | ${changedSummary.start.within3000Count}/${changedSummary.start.count} (${percent(changedSummary.start.within3000Rate)}) / ${changedSummary.start.within5000Count}/${changedSummary.start.count} (${percent(changedSummary.start.within5000Rate)}) |`,
    `| 終了境界 符号付き平均 / 中央値 | ${ms(baselineSummary.end.signedMeanMs)} / ${ms(baselineSummary.end.signedMedianMs)} | ${ms(changedSummary.end.signedMeanMs)} / ${ms(changedSummary.end.signedMedianMs)} |`,
    `| 終了境界 絶対ずれ平均 | ${ms(baselineSummary.end.absoluteMeanMs)} | ${ms(changedSummary.end.absoluteMeanMs)} |`,
    `| 終了境界 ±3秒内 / ±5秒内 | ${baselineSummary.end.within3000Count}/${baselineSummary.end.count} (${percent(baselineSummary.end.within3000Rate)}) / ${baselineSummary.end.within5000Count}/${baselineSummary.end.count} (${percent(baselineSummary.end.within5000Rate)}) | ${changedSummary.end.within3000Count}/${changedSummary.end.count} (${percent(changedSummary.end.within3000Rate)}) / ${changedSummary.end.within5000Count}/${changedSummary.end.count} (${percent(changedSummary.end.within5000Rate)}) |`,
    `| 全境界 絶対ずれ平均 | ${ms(baselineSummary.pooled.absoluteMeanMs)} | ${ms(changedSummary.pooled.absoluteMeanMs)} |`,
    `| 全境界 絶対ずれ中央値 | ${ms(baselineSummary.pooled.absoluteMedianMs)} | ${ms(changedSummary.pooled.absoluteMedianMs)} |`,
    `| 全境界 絶対ずれP75 | ${ms(baselineSummary.pooled.absoluteP75Ms)} | ${ms(changedSummary.pooled.absoluteP75Ms)} |`,
    `| 全境界 絶対ずれP90 | ${ms(baselineSummary.pooled.absoluteP90Ms)} | ${ms(changedSummary.pooled.absoluteP90Ms)} |`,
    `| 全境界が±3秒内 | ${baselineSummary.pooled.within3000Count}/${baselineSummary.pooled.count} (${percent(baselineSummary.pooled.within3000Rate)}) | ${changedSummary.pooled.within3000Count}/${changedSummary.pooled.count} (${percent(changedSummary.pooled.within3000Rate)}) |`,
    `| 全境界が±5秒内 | ${baselineSummary.pooled.within5000Count}/${baselineSummary.pooled.count} (${percent(baselineSummary.pooled.within5000Rate)}) | ${changedSummary.pooled.within5000Count}/${changedSummary.pooled.count} (${percent(changedSummary.pooled.within5000Rate)}) |`,
    `| 両境界とも±3秒内 | ${baselineSummary.bothBoundariesWithin3000Count}/${baselineSummary.reachedAssessmentCount} (${percent(baselineSummary.bothBoundariesWithin3000Rate)}) | ${changedSummary.bothBoundariesWithin3000Count}/${changedSummary.reachedAssessmentCount} (${percent(changedSummary.bothBoundariesWithin3000Rate)}) |`,
    `| 両境界とも±5秒内 | ${baselineSummary.bothBoundariesWithin5000Count}/${baselineSummary.reachedAssessmentCount} (${percent(baselineSummary.bothBoundariesWithin5000Rate)}) | ${changedSummary.bothBoundariesWithin5000Count}/${changedSummary.reachedAssessmentCount} (${percent(changedSummary.bothBoundariesWithin5000Rate)}) |`,
    '',
    '## 四段階の再集計',
    '',
    '- 既存の±1000ms一致基準は変更しない。その下に、対象正解すべてへ到達し両境界が±3000ms以内の「関門水準」を別目盛りとして挿入する。',
    '',
    '| 段階 | v012 / connection-v001 | v013 / connection-v002 |',
    '| --- | ---: | ---: |',
    `| 一致(両境界±1000ms) | ${baselineSummary.fourStageDistribution.match} | ${changedSummary.fourStageDistribution.match} |`,
    `| 関門水準(両境界±3000ms) | ${baselineSummary.fourStageDistribution.gateLevel} | ${changedSummary.fourStageDistribution.gateLevel} |`,
    `| 到達 | ${baselineSummary.fourStageDistribution.reach} | ${changedSummary.fourStageDistribution.reach} |`,
    `| 不達/形式不成立 | ${baselineSummary.fourStageDistribution.miss} | ${changedSummary.fourStageDistribution.miss} |`,
    '',
    '### 素材別',
    '',
    '| 素材 | v012 全境界絶対ずれ平均 | v013 全境界絶対ずれ平均 | v013の対比較 改善/同値/悪化 |',
    '| --- | ---: | ---: | ---: |',
    ...Object.keys(fixtureExpectedCounts).map((fixtureId) => `| ${fixtureId} | ${ms(baselineSummary.byFixture[fixtureId].pooledAbsoluteMeanMs)} | ${ms(changedSummary.byFixture[fixtureId].pooledAbsoluteMeanMs)} | ${paired.byFixture[fixtureId].improved}/${paired.byFixture[fixtureId].equal}/${paired.byFixture[fixtureId].worsened} |`),
    '',
    '## 同じ候補・run・正解だけの対比較',
    '',
    `- 共通到達: ${paired.commonReachedAssessmentCount}件。`,
    `- 2境界の絶対ずれ合計: v013改善 ${paired.twoBoundaryTotalAbsoluteError.improved} / 同値 ${paired.twoBoundaryTotalAbsoluteError.equal} / 悪化 ${paired.twoBoundaryTotalAbsoluteError.worsened}。`,
    `- 共通母集団の全境界絶対ずれ平均: v012 ${ms(paired.baselineTwoBoundaryAbsoluteMeanMs)} / v013 ${ms(paired.changedTwoBoundaryAbsoluteMeanMs)}。`,
    '',
    '## 通し再現率との区別',
    '',
    `- 全正解は2素材合計${pipeline.changed.allExpectedCount}件。上流テーマがhitした正解は${pipeline.changed.upstreamHitExpectedCount}件で、上限は${percent(pipeline.changed.upstreamHitRecallUpperBound)}。`,
    ...pipeline.baseline.runs.map((run) => `- v012 run ${run.runIndex}: 全正解への通し到達 ${run.reachedExpectedCount}/${run.allExpectedCount} (${percent(run.recall)}) / hit済み正解に限る到達 ${run.reachedExpectedCount}/${run.upstreamHitExpectedCount} (${percent(run.conditionalRecall)})。`),
    ...pipeline.changed.runs.map((run) => `- v013 run ${run.runIndex}: 全正解への通し到達 ${run.reachedExpectedCount}/${run.allExpectedCount} (${percent(run.recall)}) / hit済み正解に限る到達 ${run.reachedExpectedCount}/${run.upstreamHitExpectedCount} (${percent(run.conditionalRecall)})。`),
    '',
    '## 判定',
    '',
    `- v013の全境界絶対ずれ平均はv012より${conclusion.changedPooledAbsoluteMeanIsLower ? '小さい' : '小さくない'}。開始と終了を分けると、開始は${conclusion.changedStartAbsoluteMeanIsLower ? '改善' : '非改善'}、終了は${conclusion.changedEndAbsoluteMeanIsLower ? '改善' : '非改善'}。`,
    `- v013の全境界絶対ずれ平均は3秒${conclusion.changedPooledAbsoluteMeanWithin3000 ? '以内' : 'を超える'}。`,
    '- 二択の結論: v013は挙動を変えただけで境界精度を生まなかったため、標準接続契約として棄却する。v012の根拠範囲写しを許容する接続仕様へ戻し、次の投資先を上流のテーマ根拠範囲の質へ移す。',
    '- 第二関門の位置: 限定2素材の通し到達は各runで6割以上だが、全境界絶対ずれ平均はv012 40.3秒・v013 51.8秒で、両境界とも±3秒内は両系統0件。したがって境界側では第二関門の水準にまだ触れていない。',
    '- 第二関門への正式合格判定はまだ行わない。±3秒の正式集計単位が未定義で、今回の数字は2素材・上流hit済み開発データに条件付いており、配信者単位のdev/test分割もないため。',
    '- ただし全正解への通し到達は、保存済み候補をすべて使う各runで上記のとおり算出できる。これは条件付き97%と混同しない。'
  ];
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${lines.join('\n')}\n`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
