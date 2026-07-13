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
  const complete = records.filter((item) => item.record.status === 'complete');
  const unable = records.filter((item) => item.record.status === 'unable');
  const inProgress = records.filter((item) => item.record.status === 'in_progress');
  const activeTimes = complete.map((item) => item.record.activeElapsedMs);
  const wallTimes = complete.map((item) => item.record.wallElapsedMs);
  const summary = {
    plannedTaskCount: manifest.taskCount,
    completeCount: complete.length,
    unableCount: unable.length,
    inProgressCount: inProgress.length,
    notStartedCount: manifest.taskCount - complete.length - unable.length - inProgress.length,
    activeTimeMs: { mean: mean(activeTimes), median: median(activeTimes), p90NearestRank: nearestRankP90(activeTimes) },
    wallTimeMs: { mean: mean(wallTimes), median: median(wallTimes), p90NearestRank: nearestRankP90(wallTimes) },
    operationCounts: Object.fromEntries(['setStart', 'setEnd', 'preview', 'seek', 'step', 'playPause', 'reset'].map((key) => [key, complete.reduce((sum, item) => sum + Number(item.record.operationCounts[key] ?? 0), 0)])),
    thresholdNMinutes: null,
    thresholdStatus: 'human-decision-required-after-distribution-review',
    formalGateResult: 'not_evaluated'
  };
  const teacherData = {
    kind: 'human_adjusted_boundary_training_candidates',
    version: manifest.version,
    generatedAt: new Date().toISOString(),
    reviewer: progress.reviewer,
    automaticallyFrozenAsFixture: false,
    intendedUses: ['future-text-boundary-router', 'boundary-v002-training-candidate'],
    cuts: complete.map(({ order, task, record }) => ({
      taskOrder: order,
      taskId: task.id,
      fixtureId: task.fixtureId,
      sourceVideoId: task.sourceVideoId,
      candidateIndex: task.candidateIndex,
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
    tasks: records.map(({ order, task, record }) => ({ order, taskId: task.id, fixtureId: task.fixtureId, candidateIndex: task.candidateIndex, status: record.status, activeElapsedMs: record.activeElapsedMs, wallElapsedMs: record.wallElapsedMs ?? null, provisionalStartMs: record.provisionalStartMs, provisionalEndMs: record.provisionalEndMs, humanStartMs: record.finalStartMs, humanEndMs: record.finalEndMs, operationCounts: record.operationCounts, notes: record.notes }))
  };
  const report = `# 人間による境界手直し試験 v001 結果\n\n` +
    `- 完了: ${summary.completeCount}/${summary.plannedTaskCount}\n` +
    `- 判断不能: ${summary.unableCount}\n` +
    `- 進行中: ${summary.inProgressCount}\n` +
    `- 未開始: ${summary.notStartedCount}\n\n` +
    `## 操作可能時間\n\n` +
    `- 平均: ${seconds(summary.activeTimeMs.mean)}\n` +
    `- 中央値: ${seconds(summary.activeTimeMs.median)}\n` +
    `- P90（nearest-rank）: ${seconds(summary.activeTimeMs.p90NearestRank)}\n\n` +
    `## 判定\n\n` +
    `Nは自動設定しない。24件完了後、分布・操作量・体感を人間が確認して決定する。これは開発2素材の第一関門向け試験であり、第二関門の正式判定ではない。\n`;
  await mkdir(path.dirname(reportPath), { recursive: true });
  await Promise.all([
    writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(teacherPath, `${JSON.stringify(teacherData, null, 2)}\n`),
    writeFile(reportPath, report)
  ]);
  console.log(JSON.stringify({ status: complete.length === manifest.taskCount ? 'complete' : 'incomplete', summary, resultPath: path.relative(root, resultPath), teacherPath: path.relative(root, teacherPath), reportPath: path.relative(root, reportPath) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
