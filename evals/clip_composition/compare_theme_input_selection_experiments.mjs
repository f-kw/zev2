#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function parseOptions(argv) {
  const planIndex = argv.indexOf('--plan');
  const planValue = planIndex >= 0 ? argv[planIndex + 1]?.trim() : '';
  if (!planValue || planValue.startsWith('--')) throw new Error('--plan の値を指定してください');
  const planPath = path.isAbsolute(planValue) ? planValue : path.join(root, planValue);
  assertInsideEval(planPath);
  return { planPath };
}

function assertInsideEval(filePath) {
  if (path.relative(evalRoot, filePath).startsWith('..')) {
    throw new Error('入力は evals/clip_composition 配下を指定してください');
  }
}

function resolveInsideEval(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  assertInsideEval(resolved);
  return resolved;
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validRanges(output) {
  return (output.themes ?? []).flatMap((theme, candidateOffset) => (
    (theme.evidenceRanges ?? []).flatMap((range, rangeOffset) => {
      if (typeof range.sourceVideoId !== 'string'
        || !Number.isFinite(range.sourceStartMs)
        || !Number.isFinite(range.sourceEndMs)
        || range.sourceEndMs <= range.sourceStartMs) return [];
      return [{
        candidateIndex: candidateOffset + 1,
        rangeIndex: rangeOffset + 1,
        sourceVideoId: range.sourceVideoId,
        sourceStartMs: range.sourceStartMs,
        sourceEndMs: range.sourceEndMs
      }];
    })
  ));
}

function unionCoverageMs(ranges) {
  const bySource = new Map();
  for (const range of ranges) {
    const items = bySource.get(range.sourceVideoId) ?? [];
    items.push(range);
    bySource.set(range.sourceVideoId, items);
  }
  let total = 0;
  const perSource = [];
  for (const [sourceVideoId, sourceRanges] of bySource.entries()) {
    const sorted = [...sourceRanges].sort((left, right) => (
      left.sourceStartMs - right.sourceStartMs || left.sourceEndMs - right.sourceEndMs
    ));
    const merged = [];
    for (const range of sorted) {
      const previous = merged.at(-1);
      if (!previous || range.sourceStartMs > previous.sourceEndMs) {
        merged.push({ sourceStartMs: range.sourceStartMs, sourceEndMs: range.sourceEndMs });
      } else {
        previous.sourceEndMs = Math.max(previous.sourceEndMs, range.sourceEndMs);
      }
    }
    const coveredMs = merged.reduce((sum, range) => sum + range.sourceEndMs - range.sourceStartMs, 0);
    total += coveredMs;
    perSource.push({ sourceVideoId, coveredMs, mergedRangeCount: merged.length });
  }
  return { total, perSource };
}

function metrics(entry, bundlePath, payload, output, score, sourceDurationMs) {
  const ranges = validRanges(output);
  const union = unionCoverageMs(ranges);
  const candidateCount = (output.themes ?? []).length;
  const summary = score.summary ?? {};
  for (const field of ['inputVisible', 'inputNotVisible', 'allExpected']) {
    assert(Number.isInteger(summary[field]?.expectedCount), `${entry.label} の${field} expected数がありません`);
    assert(Number.isInteger(summary[field]?.hitCount), `${entry.label} の${field} hit数がありません`);
  }
  const failureCounts = summary.candidateClassificationCounts ?? {};
  for (const field of ['rangeHit', 'overbroadRange', 'offTopic', 'noEvidence']) {
    assert(Number.isInteger(failureCounts[field]), `${entry.label} の${field}件数がありません`);
  }
  return {
    label: entry.label,
    role: score.resultRole,
    generationSystem: score.generationSystem,
    promptVersion: payload.promptVersion,
    modelParams: output.params,
    mergeRule: output.windowingResult?.merge,
    inputSetId: payload.inputSetId,
    inputSelectionVersion: score.input?.inputSelectionVersion,
    bundlePath: path.relative(root, bundlePath),
    windowCount: output.windowingResult?.windowCount ?? 1,
    candidateCount,
    evidenceRangeCount: ranges.length,
    inputVisibleExpectedCount: summary.inputVisible.expectedCount,
    inputVisibleHitCount: summary.inputVisible.hitCount,
    inputNotVisibleExpectedCount: summary.inputNotVisible.expectedCount,
    inputNotVisibleHitCount: summary.inputNotVisible.hitCount,
    allExpectedCount: summary.allExpected.expectedCount,
    allExpectedHitCount: summary.allExpected.hitCount,
    candidateClassificationCounts: failureCounts,
    unionCandidateCoverageMs: union.total,
    unionCandidateCoverageRatio: union.total / sourceDurationMs,
    sourceDurationMs,
    inputVisibleHitPerCandidate: candidateCount === 0 ? 0 : summary.inputVisible.hitCount / candidateCount,
    allExpectedHitPerCandidate: candidateCount === 0 ? 0 : summary.allExpected.hitCount / candidateCount,
    perSourceCoverage: union.perSource
  };
}

function display(value, digits = 6) {
  return Number(value).toFixed(digits);
}

function reportMarkdown(result) {
  const columns = result.results.map((item) => item.label);
  const lines = [
    '# B素材 input-selection-v002 / v003 / v004 効率比較',
    '',
    '- 生成系統、プロンプト、実モデル、機械統合規則、採点器は同じ。入力選定だけを比較する。',
    '- 根拠範囲カバー率は、候補同士の時間重複を二重計上せず、元配信時間軸上の和集合を配信長で割った値。',
    '- 候補あたりhitは、hitした正解件数を候補総数で割った生比率。重み付けや合成点は使わない。',
    '- input-selection-v004のN=100は、B素材1本の正解13件を参照して選んだ閾値であり、汎化未検証。',
    '',
    `| 指標 | ${columns.join(' | ')} |`,
    `| --- | ${columns.map(() => '---:').join(' | ')} |`
  ];
  const row = (label, getter) => lines.push(`| ${label} | ${result.results.map(getter).join(' | ')} |`);
  row('結果の扱い', (item) => item.role);
  row('窓数', (item) => item.windowCount);
  row('候補総数', (item) => item.candidateCount);
  row('根拠範囲数', (item) => item.evidenceRangeCount);
  row('入力内expected', (item) => item.inputVisibleExpectedCount);
  row('入力内hit', (item) => item.inputVisibleHitCount);
  row('入力外expected', (item) => item.inputNotVisibleExpectedCount);
  row('入力外hit', (item) => item.inputNotVisibleHitCount);
  row('全13 expected hit', (item) => item.allExpectedHitCount);
  row('根拠範囲の配信カバー率', (item) => display(item.unionCandidateCoverageRatio));
  row('入力内hit / 候補数', (item) => display(item.inputVisibleHitPerCandidate));
  row('全expected hit / 候補数', (item) => display(item.allExpectedHitPerCandidate));
  row('範囲hit候補', (item) => item.candidateClassificationCounts.rangeHit);
  row('過広範囲候補', (item) => item.candidateClassificationCounts.overbroadRange);
  row('別話題候補', (item) => item.candidateClassificationCounts.offTopic);
  row('根拠なし候補', (item) => item.candidateClassificationCounts.noEvidence);
  lines.push('', '## 読み方', '');
  lines.push('- v002は正式な主結果だが正解13件中1件だけが入力内、v003は入力選定損失ゼロの上界測定、v004はチャット流速上位100分による正式な主結果。役割を混ぜて集計しない。');
  lines.push('- v004で唯一入力外のexpected 10 / block 13はモデル失敗に数えない。入力内12件のモデル評価と、全13件を見た入力選定込みの値を分けて読む。');
  lines.push('- v004はB素材上で理論上限12/13に到達した。ただしN=100自体をこのB素材の正解を見て選んでいるため、別素材への再現性はまだ示していない。');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const plan = await readJson(options.planPath);
  assert(Array.isArray(plan.entries) && plan.entries.length >= 2, '比較対象を2件以上指定してください');
  const sourceTranscriptPath = resolveInsideEval(plan.sourceTranscript);
  const sourceTranscript = await readJson(sourceTranscriptPath);
  const sourceDurationMs = Math.round(Number(sourceTranscript.durationSec) * 1000);
  assert(Number.isFinite(sourceDurationMs) && sourceDurationMs > 0, '元配信長を確定できません');

  const results = await Promise.all(plan.entries.map(async (entry) => {
    assert(typeof entry.label === 'string' && entry.label.trim(), '比較ラベルがありません');
    const bundlePath = resolveInsideEval(entry.bundle);
    const scorePath = resolveInsideEval(entry.score);
    const [payload, output, score] = await Promise.all([
      readJson(path.join(bundlePath, 'prompt-input.json')),
      readJson(path.join(bundlePath, 'run-01-gemini-output.json')),
      readJson(scorePath)
    ]);
    return metrics(entry, bundlePath, payload, output, score, sourceDurationMs);
  }));

  const generationSystems = new Set(results.map((item) => item.generationSystem));
  const promptVersions = new Set(results.map((item) => item.promptVersion));
  const modelParams = new Set(results.map((item) => JSON.stringify(item.modelParams)));
  const mergeRules = new Set(results.map((item) => item.mergeRule));
  assert(generationSystems.size === 1, '生成系統または実モデルが一致しません');
  assert(promptVersions.size === 1, 'プロンプト版が一致しません');
  assert(modelParams.size === 1, 'モデル実行条件が一致しません');
  assert(mergeRules.size === 1, '窓の機械統合規則が一致しません');

  const outputId = sanitize(plan.outputId);
  const result = {
    kind: 'clip_composition_theme_input_selection_experiment_comparison',
    runAt: new Date().toISOString(),
    outputId,
    sourceDurationMs,
    controlledVariables: {
      generationSystem: results[0].generationSystem,
      promptVersion: results[0].promptVersion,
      modelParams: results[0].modelParams,
      evidenceMergeRule: results[0].mergeRule,
      scorer: 'score_theme_generation_formal.ts'
    },
    coverageDefinition: 'candidate evidence range union on source timeline / source duration',
    hitEfficiencyDefinition: 'hit expected count / candidate count',
    thresholdCaveat: plan.thresholdCaveat,
    results
  };
  const outputPath = path.join(evalRoot, 'outputs', 'theme-input-selection-comparison', `${outputId}.json`);
  const reportPath = path.join(evalRoot, 'reports', 'theme-input-selection-comparison', `${outputId}.md`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown(result), 'utf8');
  console.log(`output: ${path.relative(root, outputPath)}`);
  console.log(`report: ${path.relative(root, reportPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
