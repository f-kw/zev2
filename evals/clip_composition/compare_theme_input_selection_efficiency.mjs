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
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${item} の値を指定してください`);
    values.set(item.slice(2), value);
    index += 1;
  }
  return {
    baselineLabel: required(values, 'baselineLabel'),
    baselineBundle: resolve(required(values, 'baselineBundle')),
    baselineScore: resolve(required(values, 'baselineScore')),
    comparisonLabel: required(values, 'comparisonLabel'),
    comparisonBundle: resolve(required(values, 'comparisonBundle')),
    comparisonScore: resolve(required(values, 'comparisonScore')),
    sourceTranscript: resolve(required(values, 'sourceTranscript')),
    outputId: sanitize(required(values, 'outputId'))
  };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return value;
}

function resolve(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  if (path.relative(evalRoot, resolved).startsWith('..')) {
    throw new Error('入力は evals/clip_composition 配下を指定してください');
  }
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
        merged.push({
          sourceStartMs: range.sourceStartMs,
          sourceEndMs: range.sourceEndMs
        });
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

function metrics(label, bundlePath, payload, output, score, sourceDurationMs) {
  const ranges = validRanges(output);
  const union = unionCoverageMs(ranges);
  const rawCoverageMs = ranges.reduce((sum, range) => sum + range.sourceEndMs - range.sourceStartMs, 0);
  const candidateCount = (output.themes ?? []).length;
  const allExpectedHitCount = score.summary?.allExpected?.hitCount;
  const inputVisibleHitCount = score.summary?.inputVisible?.hitCount;
  assert(Number.isInteger(allExpectedHitCount), `${label} のallExpected hitがありません`);
  assert(Number.isInteger(inputVisibleHitCount), `${label} のinputVisible hitがありません`);
  return {
    label,
    generationSystem: score.generationSystem,
    inputSetId: payload.inputSetId,
    bundlePath: path.relative(root, bundlePath),
    windowCount: output.windowingResult?.windowCount ?? 1,
    candidateCount,
    evidenceRangeCount: ranges.length,
    inputVisibleExpectedCount: score.summary.inputVisible.expectedCount,
    inputVisibleHitCount,
    allExpectedCount: score.summary.allExpected.expectedCount,
    allExpectedHitCount,
    rawCandidateCoverageMs: rawCoverageMs,
    unionCandidateCoverageMs: union.total,
    unionCandidateCoverageRatio: union.total / sourceDurationMs,
    sourceDurationMs,
    inputVisibleHitPerCandidate: candidateCount === 0 ? 0 : inputVisibleHitCount / candidateCount,
    allExpectedHitPerCandidate: candidateCount === 0 ? 0 : allExpectedHitCount / candidateCount,
    coveragePerCandidateMs: candidateCount === 0 ? 0 : union.total / candidateCount,
    perSourceCoverage: union.perSource
  };
}

function reportMarkdown(result) {
  const lines = [
    '# input-selection-v003 上界測定効率比較',
    '',
    '- 比較対象の生成系統・プロンプト・モデルは同じ。入力選定だけが異なる。',
    '- 総カバー時間は、全候補の有効な根拠範囲を元配信時刻上で和集合にし、候補同士の重複を二重計上しない。',
    '- 候補数あたりhit効率は、hitしたexpected件数を候補総数で割った生比率。重み付けはしない。',
    '',
    '| 指標 | v002 発話量上位50 | v003 全文上界 |',
    '| --- | ---: | ---: |'
  ];
  const [baseline, comparison] = result.results;
  const row = (label, left, right) => lines.push(`| ${label} | ${left} | ${right} |`);
  row('窓数', baseline.windowCount, comparison.windowCount);
  row('候補総数', baseline.candidateCount, comparison.candidateCount);
  row('根拠範囲数', baseline.evidenceRangeCount, comparison.evidenceRangeCount);
  row('入力内expected', baseline.inputVisibleExpectedCount, comparison.inputVisibleExpectedCount);
  row('入力内hit', baseline.inputVisibleHitCount, comparison.inputVisibleHitCount);
  row('全13 expected hit', baseline.allExpectedHitCount, comparison.allExpectedHitCount);
  row('候補の総カバー時間', `${baseline.unionCandidateCoverageMs}ms`, `${comparison.unionCandidateCoverageMs}ms`);
  row('総カバー時間 / 配信長', baseline.unionCandidateCoverageRatio.toFixed(6), comparison.unionCandidateCoverageRatio.toFixed(6));
  row('入力内hit / 候補数', baseline.inputVisibleHitPerCandidate.toFixed(6), comparison.inputVisibleHitPerCandidate.toFixed(6));
  row('全expected hit / 候補数', baseline.allExpectedHitPerCandidate.toFixed(6), comparison.allExpectedHitPerCandidate.toFixed(6));
  row('カバー時間 / 候補数', `${baseline.coveragePerCandidateMs.toFixed(3)}ms`, `${comparison.coveragePerCandidateMs.toFixed(3)}ms`);
  lines.push('', '## 解釈上の制約', '');
  lines.push('- v002は正解13件中1件だけが入力内、v003は13件すべてが入力内。入力内hit率と全expected hitは分けて読む。');
  lines.push('- v003は入力選定損失ゼロの上界であり、実運用の入力設計や費用効率をそのまま採用する試験ではない。');
  lines.push('- 候補総数の増加は窓数増加の結果。意味的に同じ候補の統合は行わず、既存の機械統合規則だけを適用する。');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const sourceTranscript = await readJson(options.sourceTranscript);
  const sourceDurationMs = Math.round(Number(sourceTranscript.durationSec) * 1000);
  assert(Number.isFinite(sourceDurationMs) && sourceDurationMs > 0, '元配信長を確定できません');
  const load = async (label, bundlePath, scorePath) => {
    const [payload, output, score] = await Promise.all([
      readJson(path.join(bundlePath, 'prompt-input.json')),
      readJson(path.join(bundlePath, 'run-01-gemini-output.json')),
      readJson(scorePath)
    ]);
    return metrics(label, bundlePath, payload, output, score, sourceDurationMs);
  };
  const results = await Promise.all([
    load(options.baselineLabel, options.baselineBundle, options.baselineScore),
    load(options.comparisonLabel, options.comparisonBundle, options.comparisonScore)
  ]);
  assert(results[0].generationSystem === results[1].generationSystem, '生成系統または実モデルが一致しません');
  const result = {
    kind: 'clip_composition_theme_input_selection_efficiency_comparison',
    runAt: new Date().toISOString(),
    outputId: options.outputId,
    sourceDurationMs,
    coverageDefinition: 'candidate evidence range union on source timeline',
    hitEfficiencyDefinition: 'hit expected count / candidate count',
    results
  };
  const outputPath = path.join(evalRoot, 'outputs', 'theme-input-selection-comparison', `${options.outputId}.json`);
  const reportPath = path.join(evalRoot, 'reports', 'theme-input-selection-comparison', `${options.outputId}.md`);
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
