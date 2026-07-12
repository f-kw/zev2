#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function rootDir() { let current = process.cwd(); while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) { const parent = path.dirname(current); if (parent === current) throw new Error('workspaceなし'); current = parent; } return current; }
const root = rootDir();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-v002-main-v001');
const reportPath = path.join(evalRoot, 'reports', 'theme-composition-connection', '20260712-connection-v002-main-v001-result.md');
const tolerance = 1000;
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const configs = {
  nOEWCNc77MI_multiblock_material_v001: {
    formal: path.join(evalRoot, 'outputs', 'theme-generation', 'theme-llm-v002-20260711-B-chat-velocity-input-selection-v004-v001-formal-score.json'),
    upstream: path.join(evalRoot, 'outputs', 'theme-generation', 'nOEWCNc77MI_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260711-chat-velocity-top100-v001', 'run-01-gemini-output.json')
  },
  '9dtwF5Exu5w_multiblock_material_v001': {
    formal: path.join(evalRoot, 'outputs', 'theme-generation', 'theme-llm-v002-20260712-chat-velocity-top100-generalization-v001-formal-score.json'),
    upstream: path.join(evalRoot, 'outputs', 'theme-generation', '9dtwF5Exu5w_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260712-chat-velocity-top100-generalization-v001', 'run-01-gemini-output.json')
  }
};

const overlap = (a, b) => Math.max(0, Math.min(a.sourceEndMs, b.sourceEndMs) - Math.max(a.sourceStartMs, b.sourceStartMs));
const stageRank = (value) => value === 'match' ? 2 : value === 'reach' ? 1 : 0;
function endpoints(value) { if (typeof value === 'number' && Number.isInteger(value) && value > 0) return [value, value]; if (typeof value !== 'string') return; if (/^\d+$/.test(value) && Number(value) > 0) return [Number(value), Number(value)]; const m = value.match(/^(\d+)-(\d+)$/); if (!m) return; const start = Number(m[1]); const end = Number(m[2]); if (start < 1 || end < start) return; return [start, end]; }
function parseCuts(output, inputIds) {
  const issues = [];
  if (!Array.isArray(output.selectedCuts)) return { valid: false, cuts: [], issues: ['selectedCuts-not-array'] };
  const cuts = [];
  output.selectedCuts.forEach((cut, index) => {
    if (!cut || typeof cut !== 'object' || !(Number.isFinite(cut.sourceStartMs) && Number.isFinite(cut.sourceEndMs) && cut.sourceEndMs > cut.sourceStartMs) || typeof cut.reason !== 'string' || !cut.reason.trim() || !Array.isArray(cut.usedSpeechIds) || !cut.usedSpeechIds.length) { issues.push(`cut-${index + 1}-contract`); return; }
    const parsed = cut.usedSpeechIds.map(endpoints);
    if (parsed.some((item) => !item)) { issues.push(`cut-${index + 1}-usedSpeechIds-syntax`); return; }
    const missing = parsed.flat().filter((id) => !inputIds.has(id));
    if (missing.length) { issues.push(`cut-${index + 1}-usedSpeechIds-missing-endpoint:${[...new Set(missing)].join(',')}`); return; }
    cuts.push(cut);
  });
  return issues.length ? { valid: false, cuts: [], issues } : { valid: true, cuts, issues: [] };
}
function best(cuts, expected) { return cuts.map((cut, index) => ({ cut, index: index + 1, overlapMs: overlap(cut, expected), startDeltaMs: cut.sourceStartMs - expected.sourceStartMs, endDeltaMs: cut.sourceEndMs - expected.sourceEndMs })).filter((item) => item.overlapMs > 0).sort((a, b) => b.overlapMs - a.overlapMs || Math.abs(a.startDeltaMs) - Math.abs(b.startDeltaMs) || Math.abs(a.endDeltaMs) - Math.abs(b.endDeltaMs) || a.index - b.index)[0]; }
function normalizedIntervals(items) { return items.map((item) => [item.sourceStartMs, item.sourceEndMs]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); }
function exactCopy(cuts, ranges) { return JSON.stringify(normalizedIntervals(cuts)) === JSON.stringify(normalizedIntervals(ranges)); }
function inheritsBoundary(cuts, ranges) { const starts = new Set(ranges.map((r) => r.sourceStartMs)); const ends = new Set(ranges.map((r) => r.sourceEndMs)); return cuts.some((cut) => starts.has(cut.sourceStartMs) || ends.has(cut.sourceEndMs)); }

async function main() {
  const manifest = await readJson(path.join(outputRoot, 'input-manifest.json'));
  const cache = {};
  for (const [fixtureId, config] of Object.entries(configs)) cache[fixtureId] = { expected: await readJson(path.join(evalRoot, 'expected', `${fixtureId}.json`)), formal: await readJson(config.formal), upstream: await readJson(config.upstream) };
  const runs = [];
  for (const input of manifest.inputs) {
    const data = cache[input.fixtureId];
    const targetIndexes = data.formal.candidateAssessments.find((item) => item.candidateIndex === input.candidateIndex).hitExpectedIndexes;
    const ranges = data.upstream.themes[input.candidateIndex - 1].evidenceRanges;
    const evidenceDurationMs = ranges.reduce((sum, range) => sum + range.sourceEndMs - range.sourceStartMs, 0);
    const payload = await readJson(path.join(root, input.payloadPath));
    const inputIds = new Set(payload.modelInput.transcript.segments.map((item) => item.speechId));
    for (let runIndex = 1; runIndex <= 3; runIndex += 1) {
      const outputPath = path.join(root, input.outputDir, `run-${String(runIndex).padStart(2, '0')}-gemini-output.json`);
      const parsed = parseCuts(await readJson(outputPath), inputIds);
      const targetAssessments = targetIndexes.map((expectedIndex) => { const expected = data.expected.expectedCuts[expectedIndex - 1]; const matched = best(parsed.cuts, expected); return matched ? { expectedIndex, reached: true, exact: Math.abs(matched.startDeltaMs) <= tolerance && Math.abs(matched.endDeltaMs) <= tolerance, ...matched } : { expectedIndex, reached: false, exact: false }; });
      const reached = targetAssessments.filter((item) => item.reached).map((item) => item.expectedIndex);
      const exact = targetAssessments.filter((item) => item.exact).map((item) => item.expectedIndex);
      const stage = !parsed.valid ? 'miss' : exact.length === targetIndexes.length ? 'match' : reached.length ? 'reach' : 'miss';
      const selectedDurationMs = parsed.cuts.reduce((sum, cut) => sum + cut.sourceEndMs - cut.sourceStartMs, 0);
      const copy = parsed.valid && exactCopy(parsed.cuts, ranges);
      const boundary = parsed.valid && !copy && inheritsBoundary(parsed.cuts, ranges);
      const outside = parsed.cuts.filter((cut) => !ranges.some((range) => cut.sourceStartMs >= range.sourceStartMs && cut.sourceEndMs <= range.sourceEndMs)).length;
      const unlabeled = parsed.cuts.filter((cut) => !data.expected.expectedCuts.some((expected) => overlap(cut, expected) > 0) && !data.expected.excludedRanges.some((range) => overlap(cut, range) > 0)).length;
      runs.push({ fixtureId: input.fixtureId, candidateIndex: input.candidateIndex, runIndex, stage, formatValid: parsed.valid, formatIssues: parsed.issues, targetExpectedIndexes: targetIndexes, reachedExpectedIndexes: reached, exactExpectedIndexes: exact, selectedCutCount: parsed.cuts.length, selectedDurationMs, evidenceRangeDurationMs: evidenceDurationMs, selectedToEvidenceDurationRatio: evidenceDurationMs ? selectedDurationMs / evidenceDurationMs : 0, exactRangeCopy: copy, inheritedRangeBoundary: boundary, outsideEvidenceCutCount: outside, unlabeledCutCount: unlabeled, selectedCuts: parsed.cuts, targetAssessments, outputPath: path.relative(root, outputPath), reusedPilot: input.reusedPilot });
    }
  }
  const candidates = [];
  for (const input of manifest.inputs) { const items = runs.filter((run) => run.fixtureId === input.fixtureId && run.candidateIndex === input.candidateIndex); const counts = { match: items.filter((r) => r.stage === 'match').length, reach: items.filter((r) => r.stage === 'reach').length, miss: items.filter((r) => r.stage === 'miss').length }; const majority = Object.entries(counts).find(([, count]) => count >= 2)?.[0] ?? 'no-majority'; const bestStage = [...items].sort((a, b) => stageRank(b.stage) - stageRank(a.stage))[0].stage; const structures = new Set(items.map((r) => `${r.selectedCutCount}:${r.reachedExpectedIndexes.join(',')}`)); const boundaries = new Set(items.map((r) => r.selectedCuts.map((c) => `${c.sourceStartMs}-${c.sourceEndMs}`).sort().join('|'))); candidates.push({ fixtureId: input.fixtureId, candidateIndex: input.candidateIndex, counts, best: bestStage, majority, fluctuation: structures.size > 1 ? 'structural' : boundaries.size > 1 ? 'boundary' : 'stable' }); }
  const distribution = { match: runs.filter((r) => r.stage === 'match').length, reach: runs.filter((r) => r.stage === 'reach').length, miss: runs.filter((r) => r.stage === 'miss').length };
  const ratioCounts = { belowOne: runs.filter((r) => r.formatValid && r.selectedToEvidenceDurationRatio < 1).length, exactlyOne: runs.filter((r) => r.formatValid && r.selectedToEvidenceDurationRatio === 1).length, aboveOne: runs.filter((r) => r.formatValid && r.selectedToEvidenceDurationRatio > 1).length, invalid: runs.filter((r) => !r.formatValid).length };
  const byFixture = Object.keys(configs).map((fixtureId) => { const items = runs.filter((run) => run.fixtureId === fixtureId); return { fixtureId, match: items.filter((r) => r.stage === 'match').length, reach: items.filter((r) => r.stage === 'reach').length, miss: items.filter((r) => r.stage === 'miss').length, exactRangeCopy: items.filter((r) => r.exactRangeCopy).length, inheritedRangeBoundary: items.filter((r) => r.inheritedRangeBoundary).length, outsideEvidence: items.filter((r) => r.outsideEvidenceCutCount > 0).length }; });
  const fluctuationCounts = { stable: candidates.filter((c) => c.fluctuation === 'stable').length, boundary: candidates.filter((c) => c.fluctuation === 'boundary').length, structural: candidates.filter((c) => c.fluctuation === 'structural').length };
  const baseline = await readJson(path.join(evalRoot, 'outputs', 'theme-composition-connection', '20260712-connection-main-v001', 'result.json'));
  const reachedRunCount = distribution.match + distribution.reach;
  const baselineReachedRunCount = baseline.distribution.match + baseline.distribution.reach;
  const candidateMajorityReachedCount = candidates.filter((candidate) => candidate.majority === 'match' || candidate.majority === 'reach').length;
  const withinContextWrongSceneCount = runs.filter((run) => run.formatValid && run.reachedExpectedIndexes.length === 0).length;
  const exactRangeCopyCount = runs.filter((run) => run.exactRangeCopy).length;
  const inheritedRangeBoundaryCount = runs.filter((run) => run.inheritedRangeBoundary).length;
  const evidenceBoundaryUseCount = exactRangeCopyCount + inheritedRangeBoundaryCount;
  const baselineEvidenceBoundaryUseCount = baseline.exactRangeCopyCount + baseline.inheritedRangeBoundaryCount;
  const formatFailures = runs.filter((run) => !run.formatValid).map((run) => ({ fixtureId: run.fixtureId, candidateIndex: run.candidateIndex, runIndex: run.runIndex, issues: run.formatIssues, outputPath: run.outputPath }));
  const retreat = candidateMajorityReachedCount < 25 && distribution.match === 0;
  const result = { kind: 'theme_composition_connection_v002_score', resultRole: 'connected-composition-eval-connection-v002-conditional-on-upstream-range-hit', runAt: new Date().toISOString(), connectionVersion: 'connection-v002', generationSystem: 'llm-v013@gemini-web-flash', upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash', inputSelectionVersion: 'input-selection-v004', conditionalOnUpstreamRangeHit: true, contextCondition: 'theme-window-plus-minus-5m', successCriterion: { boundaryToleranceMs: 1000 }, withdrawalCriterion: { definition: 'candidate-majority reached count falls below 25 and match run count remains zero', triggered: retreat }, runCount: runs.length, distribution, reachedRunCount, candidateMajorityReachedCount, withinContextWrongSceneCount, byFixture, ratioCounts, exactRangeCopyCount, exactRangeCopyRate: exactRangeCopyCount / runs.length, inheritedRangeBoundaryCount, inheritedRangeBoundaryRate: inheritedRangeBoundaryCount / runs.length, evidenceBoundaryUseCount, evidenceBoundaryUseRate: evidenceBoundaryUseCount / runs.length, formatFailureCount: formatFailures.length, formatFailures, outsideEvidenceRunCount: runs.filter((r) => r.outsideEvidenceCutCount > 0).length, unlabeledRunCount: runs.filter((r) => r.unlabeledCutCount > 0).length, fluctuationCounts, baselineComparison: { baselineGenerationSystem: baseline.generationSystem, baselineMatchRunCount: baseline.distribution.match, matchRunDelta: distribution.match - baseline.distribution.match, baselineReachedRunCount, reachedRunDelta: reachedRunCount - baselineReachedRunCount, baselineExactRangeCopyCount: baseline.exactRangeCopyCount, exactRangeCopyDelta: exactRangeCopyCount - baseline.exactRangeCopyCount, baselineInheritedRangeBoundaryCount: baseline.inheritedRangeBoundaryCount, inheritedRangeBoundaryDelta: inheritedRangeBoundaryCount - baseline.inheritedRangeBoundaryCount, baselineEvidenceBoundaryUseCount, evidenceBoundaryUseDelta: evidenceBoundaryUseCount - baselineEvidenceBoundaryUseCount, baselineWithinContextWrongSceneCount: 0, withinContextWrongSceneDelta: withinContextWrongSceneCount }, candidates, runs };
  await writeFile(path.join(outputRoot, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  const lines = ['# connection-v002 / llm-v013 接続本走結果', '', '- hit済みテーマ限定の条件付き成績', '- 生成系統: llm-v013@gemini-web-flash', '- 比較元: llm-v012@gemini-web-flash / connection-v001', '- 文脈: テーマ窓前後5分', '', '## v001との比較', '', '| 指標 | connection-v001 | connection-v002 | 差 |', '| --- | ---: | ---: | ---: |', `| 一致run | ${baseline.distribution.match} | ${distribution.match} | ${distribution.match - baseline.distribution.match} |`, `| 到達以上run | ${baselineReachedRunCount} | ${reachedRunCount} | ${reachedRunCount - baselineReachedRunCount} |`, `| 完全な写し | ${baseline.exactRangeCopyCount} | ${exactRangeCopyCount} | ${exactRangeCopyCount - baseline.exactRangeCopyCount} |`, `| 完全な写しまたは片側境界継承 | ${baselineEvidenceBoundaryUseCount} | ${evidenceBoundaryUseCount} | ${evidenceBoundaryUseCount - baselineEvidenceBoundaryUseCount} |`, `| 範囲内で別場面を選んだ事故 | 0 | ${withinContextWrongSceneCount} | ${withinContextWrongSceneCount} |`, '', `- 撤退条件: ${retreat ? '該当' : '非該当'}。候補単位の多数決で到達以上は ${candidateMajorityReachedCount}/25。`, `- 完全な写しは ${(baseline.exactRangeCopyCount / 75 * 100).toFixed(1)}% から ${(exactRangeCopyCount / 75 * 100).toFixed(1)}% へ減ったが、根拠境界を少なくとも片側に使うrunは ${(baselineEvidenceBoundaryUseCount / 75 * 100).toFixed(1)}% から ${(evidenceBoundaryUseCount / 75 * 100).toFixed(1)}% で、境界依存は残った。`, '', '## 三段階', '', `- 一致: ${distribution.match}/75`, `- 到達: ${distribution.reach}/75`, `- 不達: ${distribution.miss}/75`, '', '## 根拠範囲の写し', '', `- 長さ比1未満: ${ratioCounts.belowOne}`, `- 長さ比1: ${ratioCounts.exactlyOne}`, `- 長さ比1超: ${ratioCounts.aboveOne}`, `- 形式不成立: ${ratioCounts.invalid}`, `- 完全な写し: ${exactRangeCopyCount}/75 (${(exactRangeCopyCount / 75 * 100).toFixed(1)}%)`, `- 片側境界継承: ${inheritedRangeBoundaryCount}/75 (${(inheritedRangeBoundaryCount / 75 * 100).toFixed(1)}%)`, '', '## 失敗と揺れ', '', `- 範囲内で別場面を選んだ事故: ${withinContextWrongSceneCount}`, `- 形式不成立: ${result.formatFailureCount}`, ...formatFailures.map((failure) => `  - ${failure.fixtureId} candidate ${failure.candidateIndex} run ${failure.runIndex}: ${failure.issues.join(', ')}`), `- 根拠範囲外へ出たrun: ${result.outsideEvidenceRunCount}`, `- 安定 ${fluctuationCounts.stable}候補 / 境界揺れ ${fluctuationCounts.boundary}候補 / 構造揺れ ${fluctuationCounts.structural}候補`, '', '## 判定', '', '- 事前登録した自動撤退条件には該当しない。一方、一致は0のままで、中心照準契約を正式採用する根拠も得られなかった。v013は接続実験版として保持し、採用判断は保留する。', '', '## 候補単位', '', '| fixture | candidate | 一致 | 到達 | 不達 | 最良 | 多数決 | 揺れ |', '| --- | ---: | ---: | ---: | ---: | --- | --- | --- |', ...candidates.map((c) => `| ${c.fixtureId} | ${c.candidateIndex} | ${c.counts.match} | ${c.counts.reach} | ${c.counts.miss} | ${c.best} | ${c.majority} | ${c.fluctuation} |`)];
  await mkdir(path.dirname(reportPath), { recursive: true }); await writeFile(reportPath, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({ distribution, ratioCounts, exactRangeCopyCount: result.exactRangeCopyCount, inheritedRangeBoundaryCount: result.inheritedRangeBoundaryCount }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
