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
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260713-trial-v001');
const manifestPath = path.join(outputRoot, 'manifest.json');
const progressPath = path.join(outputRoot, 'progress.json');
const resultPath = path.join(outputRoot, 'result.json');
const teacherPath = path.join(outputRoot, 'human-adjusted-boundaries.json');
const reportPath = path.join(evalRoot, 'reports', 'human-boundary-trim', 'human-boundary-trim-trial-v001-result-20260713.md');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function nearestRankP90(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(0.9 * sorted.length) - 1];
}

function seconds(ms) {
  return ms == null ? '未計測' : `${(ms / 1000).toFixed(3)}秒`;
}

async function main() {
  if (!existsSync(progressPath)) throw new Error('手直し試験のprogress.jsonがまだない');
  const [manifest, progress] = await Promise.all([readJson(manifestPath), readJson(progressPath)]);
  const records = manifest.tasks.map((task, order) => ({ order: order + 1, task, record: progress.tasks[task.id] })).filter((item) => item.record);
  const calibration = records.filter((item) => item.task.measurementRole === 'calibration-ui-v001-failure');
  const candidatePool = records.filter((item) => item.task.measurementRole === 'candidate-pool-not-scheduled');
  const formal = records.filter((item) => item.task.measurementRole === 'formal');
  const complete = formal.filter((item) => item.record.status === 'complete');
  const unable = formal.filter((item) => item.record.status === 'unable');
  const inProgress = formal.filter((item) => item.record.status === 'in_progress');
  const activeTimes = complete.map((item) => item.record.activeElapsedMs);
  const wallTimes = complete.map((item) => item.record.wallElapsedMs);
  const summary = {
    plannedTaskCount: manifest.formalTaskCount,
    calibrationTaskCount: calibration.length,
    calibrationCompleteCount: calibration.filter((item) => item.record.status === 'complete').length,
    candidatePoolTaskCount: candidatePool.length,
    completeCount: complete.length,
    unableCount: unable.length,
    inProgressCount: inProgress.length,
    notStartedCount: manifest.formalTaskCount - complete.length - unable.length - inProgress.length,
    activeTimeMs: { mean: mean(activeTimes), median: median(activeTimes), p90NearestRank: nearestRankP90(activeTimes) },
    wallTimeMs: { mean: mean(wallTimes), median: median(wallTimes), p90NearestRank: nearestRankP90(wallTimes) },
    operationCounts: Object.fromEntries(['directEntry', 'wordSnap', 'setStart', 'setEnd', 'preview', 'seek', 'step', 'playPause', 'reset'].map((key) => [key, complete.reduce((sum, item) => sum + Number(item.record.operationCounts[key] ?? 0), 0)])),
    streamFinishingThresholdMinutes: 15,
    thresholdStatus: 'fixed-by-human-decision',
    formalGateResult: 'v001-closed-v002-required'
  };
  const teacherData = {
    kind: 'human_adjusted_boundary_training_candidates',
    version: manifest.version,
    generatedAt: new Date().toISOString(),
    reviewer: progress.reviewer,
    automaticallyFrozenAsFixture: false,
    intendedUses: ['future-text-boundary-router', 'boundary-v002-training-candidate'],
    cuts: records.filter((item) => item.record.status === 'complete').map(({ order, task, record }) => ({
      taskOrder: order,
      taskId: task.id,
      fixtureId: task.fixtureId,
      sourceVideoId: task.sourceVideoId,
      candidateIndex: task.candidateIndex,
      measurementRole: task.measurementRole,
      includedInTimeDistribution: task.measurementRole === 'formal',
      theme: { title: task.title, summary: task.summary },
      sourceGenerationSystem: task.generationSystem,
      provisionalStartMs: record.provisionalStartMs,
      provisionalEndMs: record.provisionalEndMs,
      humanStartMs: record.finalStartMs,
      humanEndMs: record.finalEndMs,
      activeElapsedMs: record.activeElapsedMs,
      wallElapsedMs: record.wallElapsedMs,
      operationCounts: record.operationCounts,
      notes: record.notes,
      confirmedAt: record.completedAt
    }))
  };
  const result = {
    kind: 'human_boundary_trim_trial_result',
    generatedAt: new Date().toISOString(),
    trialVersion: manifest.version,
    developmentDataOnly: true,
    generationSystem: 'llm-v012@gemini-web-flash',
    structuralExclusionCount: manifest.structuralExclusionCount,
    summary,
    tasks: records.map(({ order, task, record }) => ({ order, taskId: task.id, fixtureId: task.fixtureId, candidateIndex: task.candidateIndex, measurementRole: task.measurementRole, status: record.status, activeElapsedMs: record.activeElapsedMs, wallElapsedMs: record.wallElapsedMs ?? null, provisionalStartMs: record.provisionalStartMs, provisionalEndMs: record.provisionalEndMs, humanStartMs: record.finalStartMs, humanEndMs: record.finalEndMs, operationCounts: record.operationCounts, notes: record.notes }))
  };
  const report = `# 人間による境界手直し試験 v001 結果\n\n` +
    `- v001正式計測: 中止（全候補処理が目標単位と不一致）\n` +
    `- UI校正: ${summary.calibrationCompleteCount}/${summary.calibrationTaskCount}（時間分布から除外）\n` +
    `- 未実施の候補母集団: ${summary.candidatePoolTaskCount}\n` +
    `- 判断不能: ${summary.unableCount}\n` +
    `- 進行中: ${summary.inProgressCount}\n` +
    `- 未開始: ${summary.notStartedCount}\n\n` +
    `## 操作可能時間\n\n` +
    `- 平均: ${seconds(summary.activeTimeMs.mean)}\n` +
    `- 中央値: ${seconds(summary.activeTimeMs.median)}\n` +
    `- P90（nearest-rank）: ${seconds(summary.activeTimeMs.p90NearestRank)}\n\n` +
    `## 判定\n\n` +
    `v001は、1候補約3分を24候補へ外挿した約72分の比較基準として閉じる。次のv002はcandidate-ranking-v001の上位5候補を確認し、公開する3〜5本を仕上げる1配信合計時間を測る。合格条件は15分以内。\n`;
  await mkdir(path.dirname(reportPath), { recursive: true });
  await Promise.all([
    writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(teacherPath, `${JSON.stringify(teacherData, null, 2)}\n`),
    writeFile(reportPath, report)
  ]);
  console.log(JSON.stringify({ status: 'closed-after-ui-calibration', summary, resultPath: path.relative(root, resultPath), teacherPath: path.relative(root, teacherPath), reportPath: path.relative(root, reportPath) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
